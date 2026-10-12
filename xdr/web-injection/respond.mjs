
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';

const ACTIONS = new Set(['block', 'alert', 'record']);
const DEFAULT_BLOCK_TTL_SECONDS = 300;

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);
const projectRoot = resolve(currentDirectory, '../..');

function isValidDecision(decision) {
    return Boolean(decision)
        && typeof decision === 'object'
        && ACTIONS.has(decision.action)
        && typeof decision.confidence === 'number'
        && Number.isFinite(decision.confidence)
        && decision.confidence >= 0
        && decision.confidence <= 1
        && typeof decision.reason === 'string';
}

function createEvent(alertId, decision, now, ttlSeconds) {
    const event = {
        timestamp: now.toISOString(),
        alertId,
        action: decision.action,
        confidence: decision.confidence,
        reason: decision.reason,
    };

    if (decision.action === 'block') {
        event.response = 'block_candidate';
        event.expiresAt = new Date(
            now.getTime() + ttlSeconds * 1000,
        ).toISOString();
    } else {
        event.response = decision.action === 'alert'
            ? 'alert_only'
            : 'record_only';
    }

    return event;
}

export async function respond({
    alertId,
    decision,
    logPath = resolve(projectRoot, 'xdr/alerts.log'),
    now = new Date(),
    ttlSeconds = DEFAULT_BLOCK_TTL_SECONDS,
}) {
    if (typeof alertId !== 'string' || alertId.trim() === '') {
        throw new TypeError('유효한 원본 경보 ID가 필요합니다.');
    }

    if (!isValidDecision(decision)) {
        throw new TypeError('XDR 판정 결과 형식이 올바르지 않습니다.');
    }

    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError('유효한 기록 시각이 필요합니다.');
    }

    if (
        !Number.isInteger(ttlSeconds)
        || ttlSeconds <= 0
        || ttlSeconds > 86400
    ) {
        throw new RangeError('만료 시간은 1~86400초 범위여야 합니다.');
    }

    const event = createEvent(alertId, decision, now, ttlSeconds);
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, `${JSON.stringify(event)}\n`, 'utf8');

    return event;
}

export async function respondToFixture({
    root = projectRoot,
    logPath = resolve(root, 'xdr/alerts.log'),
} = {}) {
    const fixturePath = resolve(root, 'xdr/fixtures/web-injection.json');
    const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));

    if (
        fixture?.schema !== 'aleph.xdr.fixture.v1'
        || fixture.moduleKey !== 'web-injection'
        || !Array.isArray(fixture.alerts)
    ) {
        throw new Error('웹 주입 시험 경보 형식이 올바르지 않습니다.');
    }

    const counts = { block: 0, alert: 0, record: 0 };

    for (const alert of fixture.alerts) {
        if (typeof alert?.id !== 'string' || alert.id.trim() === '') {
            throw new Error('원본 경보 ID가 없는 경보가 있습니다.');
        }

        const decision = await decide(alert);

        if (!isValidDecision(decision)) {
            throw new Error(`판정 결과 형식 오류: ${alert.id}`);
        }

        // 경보의 정상 계정 활동은 차단 후보로 기록하지 않습니다.
        if (
            decision.action === 'block'
            && alert?.data?.srcuser
            && Number(alert?.rule?.level) <= 3
        ) {
            throw new Error(`정상 계정 활동이 차단 후보로 분류되었습니다: ${alert.id}`);
        }

        await respond({
            alertId: alert.id,
            decision,
            logPath,
            ttlSeconds: DEFAULT_BLOCK_TTL_SECONDS,
        });

        counts[decision.action] += 1;
    }

    return {
        total: fixture.alerts.length,
        counts,
    };
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
    try {
        const result = await respondToFixture();

        console.log(`처리 경보: ${result.total}건`);
        console.log(`차단 후보: ${result.counts.block}건`);
        console.log(`알림: ${result.counts.alert}건`);
        console.log(`기록: ${result.counts.record}건`);
        console.log('실제 ZTNA 차단은 수행하지 않았습니다.');
    } catch {
        console.error('경보 대응 처리에 실패했습니다. 파일 형식과 판정 결과를 확인하세요.');
        process.exitCode = 1;
    }
}

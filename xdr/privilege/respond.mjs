import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { decide } from './decide.mjs';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const fixturePath = path.resolve(
    currentDirectory,
    '../fixtures/privilege.json',
);
const defaultLogPath = path.resolve(
    currentDirectory,
    '../alerts.log',
);
const DENY_TTL_MS = 5 * 60 * 1000;

function sourceIpOf(alert) {
    return typeof alert?.data?.srcip === 'string'
        ? alert.data.srcip
        : null;
}

function accountOf(alert) {
    return typeof alert?.data?.srcuser === 'string'
        ? alert.data.srcuser
        : null;
}

function alertIdOf(alert) {
    return typeof alert?.id === 'string'
        ? alert.id
        : null;
}

function makeDenyRuleCandidate(alert, decision, now) {
    if (
        decision.action !== 'block'
        || decision.confidence < 0.85
    ) {
        return null;
    }

    const sourceAlertId = alertIdOf(alert);
    const sourceIp = sourceIpOf(alert);
    const account = accountOf(alert);

    if (!sourceAlertId || (!sourceIp && !account)) {
        return null;
    }

    return {
        type: 'deny_rule_candidate',
        effect: 'deny',
        sourceAlertId,
        sourceIp,
        account,
        expiresAt: new Date(now.getTime() + DENY_TTL_MS).toISOString(),
        reason: decision.reason,
    };
}

function responseName(decision, denyRuleCandidate) {
    if (denyRuleCandidate) {
        return 'block_candidate';
    }

    if (decision.action === 'alert') {
        return 'alert_only';
    }

    return 'record_only';
}

function makeLogEntry(alert, decision, denyRuleCandidate, now) {
    return {
        timestamp: now.toISOString(),
        alertId: alertIdOf(alert),
        action: decision.action,
        confidence: decision.confidence,
        reason: decision.reason,
        response: responseName(decision, denyRuleCandidate),
        denyRuleCandidate,
    };
}

/**
 * 판단 결과를 대응 후보로 연결하고 한 줄 JSON 로그를 남깁니다.
 * 실제 ZTNA 판정기 규칙 자체는 수정하지 않습니다.
 *
 * @param {object[]} alerts
 * @param {{ logPath?: string, now?: Date }} options
 * @returns {object[]}
 */
export function respondToAlerts(alerts, options = {}) {
    if (!Array.isArray(alerts)) {
        throw new Error('경보 목록이 배열이 아닙니다.');
    }

    const logPath = options.logPath ?? defaultLogPath;
    const now = options.now instanceof Date
        ? options.now
        : new Date();

    if (Number.isNaN(now.getTime())) {
        throw new Error('대응 시각이 올바르지 않습니다.');
    }

    const responses = [];

    for (const alert of alerts) {
        const decision = decide(alert);
        const denyRuleCandidate = makeDenyRuleCandidate(
            alert,
            decision,
            now,
        );
        const response = makeLogEntry(
            alert,
            decision,
            denyRuleCandidate,
            now,
        );

        appendFileSync(
            logPath,
            `${JSON.stringify(response)}\n`,
            'utf8',
        );

        responses.push(response);
    }

    return responses;
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    try {
        const fixture = JSON.parse(
            readFileSync(fixturePath, 'utf8'),
        );

        if (
            fixture.schema !== 'aleph.xdr.fixture.v1'
            || fixture.moduleKey !== 'privilege'
            || !Array.isArray(fixture.alerts)
        ) {
            throw new Error('권한 상승 경보 파일 형식이 올바르지 않습니다.');
        }

        const responses = respondToAlerts(fixture.alerts);
        const denyCount = responses.filter(
            (item) => item.denyRuleCandidate !== null,
        ).length;

        console.log(`대응 완료: ${responses.length}건`);
        console.log(`차단 후보: ${denyCount}건`);
    } catch {
        console.error('권한 상승 경보 대응에 실패했습니다. 입력과 경로를 확인하세요.');
        process.exitCode = 1;
    }
}

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_KEY = 'exfiltration';
const EXPECTED_SCHEMA = 'aleph.xdr.fixture.v1';

function fixturePath() {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    return join(currentDir, '..', 'fixtures', `${MODULE_KEY}.json`);
}

function readFixture() {
    const fixture = JSON.parse(readFileSync(fixturePath(), 'utf8'));

    if (fixture?.schema !== EXPECTED_SCHEMA) {
        throw new Error(`지원하지 않는 fixture schema: ${fixture?.schema ?? '없음'}`);
    }

    if (fixture?.moduleKey !== MODULE_KEY) {
        throw new Error(`fixture moduleKey 불일치: ${fixture?.moduleKey ?? '없음'}`);
    }

    if (!Array.isArray(fixture?.alerts)) {
        throw new Error('fixture alerts 배열이 없습니다.');
    }

    return fixture;
}

function extractAlert(alert) {
    return {
        timestamp: alert?.timestamp ?? null,
        sourceIp: alert?.data?.srcip ?? null,
        account: alert?.data?.srcuser ?? null,
        ruleLevel: Number.isFinite(alert?.rule?.level)
            ? alert.rule.level
            : null,
        description: typeof alert?.rule?.description === 'string'
            ? alert.rule.description
            : null,
    };
}

export function readAlerts() {
    const fixture = readFixture();
    const extracted = fixture.alerts.map(extractAlert);

    if (extracted.length !== fixture.alerts.length) {
        throw new Error(
            `경보 수 불일치: 원본 ${fixture.alerts.length}건 / 추출 ${extracted.length}건`,
        );
    }

    return extracted;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const alerts = readAlerts();

    for (const alert of alerts) {
        process.stdout.write(`${JSON.stringify(alert)}\n`);
    }

    process.stderr.write(`추출 완료: ${alerts.length}건\n`);
}

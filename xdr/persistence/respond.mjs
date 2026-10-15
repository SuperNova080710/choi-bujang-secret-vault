import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { decide } from './decide.mjs';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const fixturePath = path.resolve(
    currentDirectory,
    '../fixtures/persistence.json',
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

function sourceAlertIdOf(alert) {
    return typeof alert?.id === 'string'
        ? alert.id
        : null;
}

function expiresAtFrom(now) {
    return new Date(now.getTime() + DENY_TTL_MS).toISOString();
}

function createDenyRuleCandidate(alert, result, now) {
    const sourceIp = sourceIpOf(alert);
    const sourceAlertId = sourceAlertIdOf(alert);

    if (
        result?.action !== 'block'
        || typeof result?.confidence !== 'number'
        || result.confidence < 0.85
        || !sourceIp
        || !sourceAlertId
    ) {
        return null;
    }

    return {
        type: 'deny_rule_candidate',
        sourceAlertId,
        sourceIp,
        expiresAt: expiresAtFrom(now),
        reason: result.reason,
    };
}

function responseName(action) {
    if (action === 'block') {
        return 'block_candidate';
    }

    if (action === 'alert') {
        return 'alert_only';
    }

    return 'record_only';
}

export function buildResponse(alert, result, now = new Date()) {
    const denyRuleCandidate = createDenyRuleCandidate(
        alert,
        result,
        now,
    );

    return {
        timestamp: now.toISOString(),
        alertId: sourceAlertIdOf(alert),
        action: result.action,
        confidence: result.confidence,
        reason: result.reason,
        response: responseName(result.action),
        denyRuleCandidate,
    };
}

export function appendAlertLog(response, logPath = defaultLogPath) {
    appendFileSync(
        logPath,
        `${JSON.stringify(response)}\n`,
        'utf8',
    );
}

export function respondToAlert(
    alert,
    {
        logPath = defaultLogPath,
        now = new Date(),
    } = {},
) {
    const result = decide(alert);
    const response = buildResponse(alert, result, now);

    appendAlertLog(response, logPath);

    return response;
}

export function respondToAlerts(
    alerts,
    {
        logPath = defaultLogPath,
        now = new Date(),
    } = {},
) {
    if (!Array.isArray(alerts)) {
        throw new Error('경보 목록이 배열이 아닙니다.');
    }

    return alerts.map((alert) => respondToAlert(
        alert,
        {
            logPath,
            now,
        },
    ));
}

function readFixtureAlerts() {
    const fixture = JSON.parse(
        readFileSync(fixturePath, 'utf8'),
    );

    if (
        fixture.schema !== 'aleph.xdr.fixture.v1'
        || fixture.moduleKey !== 'persistence'
        || !Array.isArray(fixture.alerts)
    ) {
        throw new Error('지속성 경보 파일 형식이 올바르지 않습니다.');
    }

    return fixture.alerts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    try {
        const responses = respondToAlerts(readFixtureAlerts());
        const denyRules = responses.filter(
            (item) => item.denyRuleCandidate !== null,
        );

        console.log(`처리 완료: ${responses.length}건`);
        console.log(`차단 후보: ${denyRules.length}건`);
    } catch (error) {
        console.error(error instanceof Error
            ? error.message
            : '지속성 경보 대응에 실패했습니다.');
        process.exitCode = 1;
    }
}

import { appendFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';

const DEFAULT_LOG_PATH = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../alerts.log',
);

const DENY_TTL_MS = 5 * 60 * 1000;

function destinationIpOf(alert) {
    return typeof alert?.data?.dstip === 'string'
        ? alert.data.dstip
        : null;
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

function denyRuleCandidate(alert, result, now) {
    if (
        result.action !== 'block'
        || result.confidence < 0.85
    ) {
        return null;
    }

    const destinationIp = destinationIpOf(alert);

    if (!destinationIp) {
        return null;
    }

    return {
        type: 'deny_rule_candidate',
        effect: 'deny',
        sourceAlertId: alert.id,
        destinationIp,
        expiresAt: new Date(now.getTime() + DENY_TTL_MS).toISOString(),
        reason: result.reason,
    };
}

function logEntry(alert, result, candidate, now) {
    return {
        timestamp: now.toISOString(),
        alertId: alert.id,
        action: result.action,
        confidence: result.confidence,
        reason: result.reason,
        response: responseName(result.action),
        denyRuleCandidate: candidate,
    };
}

function appendLog(logPath, entry) {
    appendFileSync(
        logPath,
        `${JSON.stringify(entry)}\n`,
        'utf8',
    );
}

export function respondToAlert(
    alert,
    {
        logPath = DEFAULT_LOG_PATH,
        now = new Date(),
    } = {},
) {
    const result = decide(alert);
    const candidate = denyRuleCandidate(alert, result, now);
    const entry = logEntry(alert, result, candidate, now);

    appendLog(logPath, entry);

    return entry;
}

export function respondToAlerts(
    alerts,
    {
        logPath = DEFAULT_LOG_PATH,
        now = new Date(),
    } = {},
) {
    if (!Array.isArray(alerts)) {
        throw new TypeError('alerts must be an array');
    }

    return alerts.map((alert) => respondToAlert(
        alert,
        {
            logPath,
            now,
        },
    ));
}

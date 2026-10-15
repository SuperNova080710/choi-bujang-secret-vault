/*
 * 12단계 탈환 작전실의 점검 기록 집계입니다.
 *
 * 실제 API 요청에서 얻은 attackAttempts와
 * 동일 요청에 사용한 alephEvidence requestKey를 결합합니다.
 *
 * 존재하지 않는 결과를 추정하지 않습니다.
 */

const CHECK_META =
    Object.freeze({
        anonymous_api_note_read: {
            stage: 3,
            kind: 'deny',
            area: 'access',
            check: 'denied_http',
        },

        invalid_token_api_note_read: {
            stage: 4,
            kind: 'deny',
            area: 'access',
            check: 'denied_http',
        },

        anonymous_api_note_detail: {
            stage: 3,
            kind: 'deny',
            area: 'access',
            check: 'denied_http',
        },

        anonymous_api_note_update: {
            stage: 3,
            kind: 'deny',
            area: 'access',
            check: 'not_run',
        },

        anonymous_api_note_delete: {
            stage: 3,
            kind: 'deny',
            area: 'access',
            check: 'not_run',
        },

        anonymous_static_note_read: {
            stage: 2,
            kind: 'deny',
            area: 'access',
            check: 'empty_array',
        },

        public_root_available: {
            stage: 1,
            kind: 'allow',
            area: 'app',
            check: 'http_200',
        },

        public_key_direct_rest_read: {
            stage: 5,
            kind: 'deny',
            area: 'access',
            check: 'denied_http',
        },

        registered_device_allowed: {
            stage: 6,
            kind: 'allow',
            area: 'decision',
            check: 'ready',
        },

        unregistered_device_denied: {
            stage: 6,
            kind: 'deny',
            area: 'decision',
            check: 'ready',
        },

        composite_risk_requires_step_up: {
            stage: 7,
            kind: 'deny',
            area: 'decision',
            check: 'ready',
        },

        step_up_verified_allows_retry: {
            stage: 7,
            kind: 'allow',
            area: 'decision',
            check: 'ready',
        },

        note_list_route_denied: {
            stage: 8,
            kind: 'deny',
            area: 'decision',
            check: 'ready',
        },

        unknown_resource_path_denied: {
            stage: 8,
            kind: 'deny',
            area: 'decision',
            check: 'ready',
        },

        student_announcement_update_denied: {
            stage: 8,
            kind: 'deny',
            area: 'decision',
            check: 'ready',
        },

        burst_read_revocation_proposed: {
            stage: 9,
            kind: 'deny',
            area: 'detection',
            check: 'ready',
        },

        restore_without_login: {
            stage: 10,
            kind: 'deny',
            area: 'restore',
            check: 'denied_http',
        },

        device_status_without_login: {
            stage: 11,
            kind: 'deny',
            area: 'device',
            check: 'denied_http',
        },

        device_status_forged_signal: {
            stage: 11,
            kind: 'deny',
            area: 'device',
            check: 'denied_http',
        },

        operations_record_api: {
            stage: 12,
            kind: 'allow',
            area: 'app',
            check: 'http_200',
        },
    });

export const CHECK_IDS =
    Object.freeze(
        Object.keys(
            CHECK_META,
        ),
    );

function httpStatus(
    observed,
) {
    const match =
        /\bHTTP\s+(\d{3})\b/u.exec(
            observed,
        );

    return match
        ? Number(match[1])
        : null;
}

function jsonReady(
    observed,
) {
    const match =
        /\bjsonReady=(true|false)\b/u.exec(
            observed,
        );

    if (!match) {
        return null;
    }

    return match[1]
        === 'true';
}

function jsonArrayLength(
    observed,
) {
    const match =
        /\bjsonArrayLength=(\d+)\b/u.exec(
            observed,
        );

    return match
        ? Number(match[1])
        : null;
}

function matched(
    meta,
    observed,
) {
    if (
        typeof observed
        !== 'string'
    ) {
        return false;
    }

    if (
        observed.startsWith(
            '미실행:',
        )
    ) {
        return false;
    }

    const status =
        httpStatus(
            observed,
        );

    switch (meta.check) {
        case 'denied_http':
            return status === 401
                || status === 403
                || status === 404
                || status === 405;

        case 'empty_array':
            return status === 200
                && jsonArrayLength(
                    observed,
                ) === 0;

        case 'http_200':
            return status === 200;

        case 'ready':
            return status === 200
                && jsonReady(
                    observed,
                ) === true;

        case 'not_run':
            return false;

        default:
            return false;
    }
}

export function countRows(
    rows,
) {
    const list =
        Array.isArray(rows)
            ? rows
            : [];

    const count =
        result =>
            list.filter(
                item =>
                    item?.result
                    === result,
            ).length;

    return {
        total:
            list.length,

        blocked:
            count(
                'blocked',
            ),

        allowed:
            count(
                'allowed',
            ),

        unexpected:
            count(
                'unexpected',
            ),

        notRun:
            count(
                'not_run',
            ),
    };
}

export function buildOpsRows(
    attempts,
    evidenceRecords,
) {
    const list =
        Array.isArray(attempts)
            ? attempts
            : [];

    return list.map(
        attempt => {
            const meta =
                CHECK_META[
                attempt.attackId
                ];

            const evidence =
                evidenceRecords
                    instanceof Map
                    ? evidenceRecords.get(
                        attempt.attackId,
                    )
                    : null;

            if (!meta) {
                return {
                    attackId:
                        String(
                            attempt.attackId,
                        ),

                    stage:
                        null,

                    kind:
                        'deny',

                    area:
                        'unknown',

                    expected:
                        String(
                            attempt.expected,
                        ),

                    observed:
                        String(
                            attempt.observed,
                        ),

                    result:
                        'not_run',

                    requestIds:
                        [],

                    checkedAt:
                        null,
                };
            }

            const observed =
                String(
                    attempt.observed,
                );

            const notRun =
                observed.startsWith(
                    '미실행:',
                );

            let result;

            if (notRun) {
                result =
                    'not_run';
            } else if (
                matched(
                    meta,
                    observed,
                )
            ) {
                result =
                    meta.kind === 'allow'
                        ? 'allowed'
                        : 'blocked';
            } else {
                result =
                    'unexpected';
            }

            return {
                attackId:
                    attempt.attackId,

                stage:
                    meta.stage,

                kind:
                    meta.kind,

                area:
                    meta.area,

                expected:
                    attempt.expected,

                observed,

                result,

                requestIds:
                    evidence?.requestId
                        ? [
                            evidence.requestId,
                        ]
                        : [],

                checkedAt:
                    evidence?.checkedAt
                    ?? null,
            };
        },
    );
}

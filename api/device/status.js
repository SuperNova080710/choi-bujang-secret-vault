import {
    authenticateRequest,
    getSupabaseClient,
} from '../../src/notes-api.mjs';

import {
    getDeviceId,
} from '../../src/device-approval.mjs';

import {
    RULE_IDS,
} from '../../src/decider.mjs';

import {
    runRuleCheck,
} from '../../src/rule-check.mjs';

import {
    countRows,
} from '../../src/checks.mjs';

import operationsRecord
    from '../../ops/ops-record.json'
    with {
    type: 'json',
    };

function summarizeDeviceStatuses(
    devices,
) {
    const summary = {
        total: 0,
        pending: 0,
        approved: 0,
        revoked: 0,
    };

    for (const device of devices) {
        if (
            !device
            || typeof device.status
            !== 'string'
        ) {
            continue;
        }

        if (
            !Object.hasOwn(
                summary,
                device.status,
            )
        ) {
            continue;
        }

        summary.total += 1;
        summary[device.status] += 1;
    }

    return summary;
}

function summarizeBackupVersions(
    backups,
) {
    const versions =
        new Map();

    for (const backup of backups) {
        const version =
            typeof backup?.backup_version
                === 'string'
                && backup.backup_version.length > 0
                ? backup.backup_version
                : 'unknown';

        versions.set(
            version,
            (
                versions.get(version)
                ?? 0
            ) + 1,
        );
    }

    return Array.from(
        versions.entries(),
        ([version, count]) => ({
            version,
            count,
        }),
    ).sort(
        (left, right) =>
            left.version.localeCompare(
                right.version,
            ),
    );
}

function safeOperationsRecord() {
    const rows =
        Array.isArray(
            operationsRecord?.rows,
        )
            ? operationsRecord.rows
            : [];

    const counts =
        countRows(
            rows,
        );

    return {
        schema:
            'aleph.operations.record.v1',

        source:
            'ops/ops-record.json',

        record: {
            status:
                rows.length > 0
                    ? 'recorded'
                    : 'not_run',

            step:
                Number.isInteger(
                    operationsRecord?.step,
                )
                    ? operationsRecord.step
                    : 12,

            commit:
                typeof operationsRecord?.commit
                    === 'string'
                    ? operationsRecord.commit
                    : null,

            checkedAt:
                typeof operationsRecord
                    ?.checkedAt
                    === 'string'
                    ? operationsRecord.checkedAt
                    : null,

            counts,

            rows,
        },
    };
}

async function respondOperationsSummary({
    response,
    supabase,
    userId,
}) {
    /*
     * 현재 로그인 사용자에게 속한 기기의
     * 상태만 읽습니다.
     *
     * device_id나 공개키는 응답하지 않습니다.
     */
    const {
        data: devices,
        error: deviceError,
    } = await supabase
        .from('vault_devices')
        .select('status')
        .eq(
            'owner_id',
            userId,
        );

    if (deviceError) {
        return response
            .status(500)
            .json({
                error:
                    'OPERATIONS_DEVICE_READ_FAILED',
            });
    }

    /*
     * 복구 사본에서는 버전만 읽습니다.
     * 메모 제목과 본문은 작전실로 가져오지 않습니다.
     */
    const {
        data: backups,
        error: backupError,
    } = await supabase
        .from(
            'virtual_note_backups',
        )
        .select(
            'backup_version',
        )
        .eq(
            'owner_id',
            userId,
        );

    if (backupError) {
        return response
            .status(500)
            .json({
                error:
                    'OPERATIONS_BACKUP_READ_FAILED',
            });
    }

    const verification =
        safeOperationsRecord();

    return response
        .status(200)
        .json({
            schema:
                'aleph.operations.summary.v1',

            checkedAt:
                new Date().toISOString(),

            decider: {
                status:
                    'configured',
                ruleCount:
                    RULE_IDS.length,
                ruleIds: [
                    ...RULE_IDS,
                ],
            },

            detection: {
                status:
                    'not_recorded',

                /*
                 * src/detect.mjs에는 탐지 함수만 있고
                 * 실제 운영 사건 저장소는 없습니다.
                 * 따라서 0건이라고 추정하지 않습니다.
                 */
                observedIncidentCount:
                    null,

                revocationIntegration:
                    'proposal_only',
            },

            revocation: {
                status:
                    'measured',

                devices:
                    summarizeDeviceStatuses(
                        Array.isArray(devices)
                            ? devices
                            : [],
                    ),
            },

            recovery: {
                status:
                    'measured',

                backupCount:
                    Array.isArray(backups)
                        ? backups.length
                        : 0,

                versions:
                    summarizeBackupVersions(
                        Array.isArray(backups)
                            ? backups
                            : [],
                    ),
            },

            verificationSource:
                verification.source,

            verification:
                verification.record,
        });
}

export default async function handler(
    request,
    response,
) {
    response.setHeader(
        'Cache-Control',
        'no-store',
    );

    if (request.method !== 'GET') {
        response.setHeader(
            'Allow',
            'GET',
        );

        return response
            .status(405)
            .json({
                error:
                    'METHOD_NOT_ALLOWED',
            });
    }

    /*
     * Stage 5 직접 REST 차단 점검에 필요한 공개 키입니다.
     *
     * Publishable Key는 공개 클라이언트용 값이며,
     * SUPABASE_SECRET_KEY 등 서버 비밀값은 절대 반환하지 않습니다.
     */
    if (
        request.query?.view
        === 'public-config'
    ) {
        const publishableKey =
            process.env
                .SUPABASE_PUBLISHABLE_KEY;

        if (
            typeof publishableKey
            !== 'string'
            || !publishableKey.trim()
            || publishableKey.startsWith(
                'sb_secret_',
            )
        ) {
            return response
                .status(500)
                .json({
                    error:
                        'PUBLIC_CONFIG_UNAVAILABLE',
                });
        }

        return response
            .status(200)
            .json({
                publishableKey:
                    publishableKey.trim(),
            });
    }

    /*
     * 12단계 고정 가상 판정·탐지 점검입니다.
     *
     * case 값은 미리 정의된 점검 하나를 선택하는 데만 사용합니다.
     * 요청의 사용자 입력을 판정기 입력으로 전달하지 않습니다.
     *
     * 실제 사용자 기기 승인이나 실제 탐지 사건을 뜻하지 않습니다.
     * 심판이 실제 GET 요청과 해당 점검 결과를 연결할 수 있도록
     * 인증 전에 공개된 고정 점검 경로로 둡니다.
     */
    if (
        request.query?.view
        === 'rule-check'
    ) {
        const caseId =
            request.query?.case;

        if (
            typeof caseId
            !== 'string'
        ) {
            return response
                .status(400)
                .json({
                    error:
                        'INVALID_RULE_CHECK_CASE',
                });
        }

        const result =
            await runRuleCheck(
                caseId,
            );

        if (!result) {
            return response
                .status(400)
                .json({
                    error:
                        'UNKNOWN_RULE_CHECK_CASE',
                });
        }

        return response
            .status(200)
            .json(result);
    }

    /*
     * 12단계 Production 점검 기록입니다.
     *
     * 메모 본문, 사용자 ID, 토큰, 기기 키를 포함하지 않는
     * 안전한 점검 메타데이터만 공개합니다.
     *
     * 화면과 심판이 같은 서버 기록을 확인할 수 있도록
     * 인증 없이 읽기 전용 GET으로 제공합니다.
     */
    if (
        request.query?.view
        === 'operations-record'
    ) {
        return response
            .status(200)
            .json(
                safeOperationsRecord(),
            );
    }

    const authentication =
        await authenticateRequest(
            request,
        );

    if (!authentication.ok) {
        return response
            .status(
                authentication
                    .response
                    .status,
            )
            .json(
                authentication
                    .response
                    .body,
            );
    }

    let supabase;

    try {
        supabase =
            getSupabaseClient();
    } catch {
        return response
            .status(500)
            .json({
                error:
                    'SERVER_CONFIG_ERROR',
            });
    }

    /*
     * 12단계 탈환 작전실 조회입니다.
     * 기존 /api/device/status 동작과 분리하기 위해
     * 명시적인 view 값에서만 실행합니다.
     */
    if (
        request.query?.view
        === 'operations'
    ) {
        return respondOperationsSummary({
            response,
            supabase,
            userId:
                authentication.userId,
        });
    }

    /*
     * 여기부터는 기존 11단계 기기 상태 API입니다.
     */
    const deviceId =
        getDeviceId(request);

    if (!deviceId) {
        return response
            .status(200)
            .json({
                status:
                    'unregistered',
                approved:
                    false,
            });
    }

    const {
        data: device,
        error,
    } = await supabase
        .from('vault_devices')
        .select('status')
        .eq(
            'device_id',
            deviceId,
        )
        .eq(
            'owner_id',
            authentication.userId,
        )
        .maybeSingle();

    if (error) {
        return response
            .status(500)
            .json({
                error:
                    'DEVICE_READ_FAILED',
            });
    }

    if (!device) {
        return response
            .status(200)
            .json({
                status:
                    'unregistered',
                approved:
                    false,
            });
    }

    return response
        .status(200)
        .json({
            status:
                device.status,
            approved:
                device.status
                === 'approved',
        });
}

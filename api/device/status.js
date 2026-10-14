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
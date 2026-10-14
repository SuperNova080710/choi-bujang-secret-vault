import {
    authenticateRequest,
    getSupabaseClient,
} from '../../src/notes-api.mjs';

import {
    getDeviceId,
} from '../../src/device-approval.mjs';

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
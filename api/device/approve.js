import {
    authenticateRequest,
    getSupabaseClient,
} from '../../src/notes-api.mjs';

import {
    getDeviceId,
    verifyDeviceApproval,
} from '../../src/device-approval.mjs';

export default async function handler(
    request,
    response,
) {
    response.setHeader(
        'Cache-Control',
        'no-store',
    );

    if (request.method !== 'POST') {
        response.setHeader(
            'Allow',
            'POST',
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
            .status(403)
            .json({
                error:
                    'DEVICE_REQUEST_REQUIRED',
            });
    }

    let body;

    try {
        body =
            typeof request.body === 'string'
                ? JSON.parse(
                    request.body,
                )
                : request.body;
    } catch {
        return response
            .status(400)
            .json({
                error:
                    'INVALID_JSON',
            });
    }

    if (
        !body
        || typeof body.signature
        !== 'string'
        || !body.signature
    ) {
        return response
            .status(400)
            .json({
                error:
                    'DEVICE_SIGNATURE_REQUIRED',
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
        error: deviceError,
    } = await supabase
        .from('vault_devices')
        .select([
            'device_id',
            'owner_id',
            'public_key_jwk',
            'status',
            'approval_challenge',
            'challenge_expires_at',
        ].join(','))
        .eq(
            'device_id',
            deviceId,
        )
        .eq(
            'owner_id',
            authentication.userId,
        )
        .maybeSingle();

    if (deviceError) {
        return response
            .status(500)
            .json({
                error:
                    'DEVICE_READ_FAILED',
            });
    }

    if (
        !device
        || device.status
        !== 'pending'
    ) {
        return response
            .status(403)
            .json({
                error:
                    'DEVICE_REQUEST_REQUIRED',
            });
    }

    const expiresAt =
        Date.parse(
            device.challenge_expires_at,
        );

    if (
        !Number.isFinite(
            expiresAt,
        )
        || expiresAt < Date.now()
    ) {
        return response
            .status(403)
            .json({
                error:
                    'DEVICE_CHALLENGE_EXPIRED',
            });
    }

    const verified =
        await verifyDeviceApproval({
            publicKey:
                device.public_key_jwk,
            challenge:
                device.approval_challenge,
            signature:
                body.signature,
        });

    if (!verified) {
        return response
            .status(403)
            .json({
                error:
                    'DEVICE_SIGNATURE_INVALID',
            });
    }

    const {
        data: approved,
        error: approvalError,
    } = await supabase
        .from('vault_devices')
        .update({
            status:
                'approved',
            approval_challenge:
                null,
            challenge_expires_at:
                null,
            approved_at:
                new Date().toISOString(),
        })
        .eq(
            'device_id',
            deviceId,
        )
        .eq(
            'owner_id',
            authentication.userId,
        )
        .eq(
            'status',
            'pending',
        )
        .select('device_id')
        .maybeSingle();

    if (approvalError) {
        return response
            .status(500)
            .json({
                error:
                    'DEVICE_APPROVAL_FAILED',
            });
    }

    if (!approved) {
        return response
            .status(409)
            .json({
                error:
                    'DEVICE_APPROVAL_CHANGED',
            });
    }

    return response
        .status(200)
        .json({
            status:
                'approved',
            approved:
                true,
        });
}
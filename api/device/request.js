import {
    randomUUID,
} from 'node:crypto';

import {
    authenticateRequest,
    getSupabaseClient,
} from '../../src/notes-api.mjs';

import {
    createDeviceChallenge,
    devicePublicKeySha256,
    isDevicePublicKey,
    setDeviceCookie,
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
        || !isDevicePublicKey(
            body.publicKey,
        )
    ) {
        return response
            .status(400)
            .json({
                error:
                    'INVALID_DEVICE_PUBLIC_KEY',
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

    const deviceId =
        randomUUID();

    const challenge =
        createDeviceChallenge();

    let publicKeySha256;

    try {
        publicKeySha256 =
            devicePublicKeySha256(
                body.publicKey,
            );
    } catch {
        return response
            .status(400)
            .json({
                error:
                    'INVALID_DEVICE_PUBLIC_KEY',
            });
    }

    const {
        error,
    } = await supabase
        .from('vault_devices')
        .insert({
            device_id:
                deviceId,
            owner_id:
                authentication.userId,
            public_key_jwk:
                body.publicKey,
            public_key_sha256:
                publicKeySha256,
            status:
                'pending',
            approval_challenge:
                challenge.value,
            challenge_expires_at:
                challenge.expiresAt,
        });

    if (error) {
        return response
            .status(500)
            .json({
                error:
                    'DEVICE_REQUEST_FAILED',
            });
    }

    setDeviceCookie(
        response,
        deviceId,
    );

    return response
        .status(201)
        .json({
            status:
                'pending',
            challenge:
                challenge.value,
            expiresAt:
                challenge.expiresAt,
        });
}
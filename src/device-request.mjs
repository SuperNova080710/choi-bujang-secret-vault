import {
    createHash,
    webcrypto,
} from 'node:crypto';

import {
    getDeviceId,
    isDevicePublicKey,
} from './device-approval.mjs';

const REQUEST_MAX_AGE_MS =
    2 * 60 * 1000;

const NONCE_PATTERN =
    /^[A-Za-z0-9_-]{16,128}$/u;

function isPlainObject(value) {
    return value !== null
        && typeof value === 'object'
        && !Array.isArray(value);
}

function canonicalize(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map(key => [
                    key,
                    canonicalize(value[key]),
                ]),
        );
    }

    return value;
}

function canonicalJson(value) {
    return JSON.stringify(
        canonicalize(value),
    );
}

export function canonicalRequestBody(
    body,
) {
    if (
        body === undefined
        || body === null
    ) {
        return '';
    }

    if (typeof body === 'string') {
        if (body.length === 0) {
            return '';
        }

        try {
            return canonicalJson(
                JSON.parse(body),
            );
        } catch {
            return body;
        }
    }

    return canonicalJson(body);
}

export function requestBodySha256(
    body,
) {
    return createHash('sha256')
        .update(
            canonicalRequestBody(body),
            'utf8',
        )
        .digest('hex');
}

export function deviceRequestPayload({
    method,
    target,
    bodySha256,
    timestamp,
    nonce,
}) {
    if (
        typeof method !== 'string'
        || !method
        || typeof target !== 'string'
        || !target.startsWith('/')
        || typeof bodySha256 !== 'string'
        || !/^[0-9a-f]{64}$/u.test(
            bodySha256,
        )
        || typeof timestamp !== 'string'
        || !timestamp
        || typeof nonce !== 'string'
        || !nonce
    ) {
        throw new TypeError(
            'INVALID_DEVICE_REQUEST_PAYLOAD',
        );
    }

    return [
        'ALEPH_DEVICE_REQUEST_V1',
        method.toUpperCase(),
        target,
        bodySha256,
        timestamp,
        nonce,
    ].join('\n');
}

function canonicalPublicKey(
    publicKey,
) {
    return {
        crv: 'P-256',
        kty: 'EC',
        x: publicKey.x,
        y: publicKey.y,
    };
}

export async function verifyDeviceRequestSignature({
    publicKey,
    method,
    target,
    bodySha256,
    timestamp,
    nonce,
    signature,
}) {
    if (
        !isDevicePublicKey(publicKey)
        || typeof signature !== 'string'
        || !signature
    ) {
        return false;
    }

    let cryptoKey;

    try {
        cryptoKey =
            await webcrypto.subtle.importKey(
                'jwk',
                canonicalPublicKey(
                    publicKey,
                ),
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256',
                },
                false,
                ['verify'],
            );
    } catch {
        return false;
    }

    let signatureBytes;

    try {
        signatureBytes =
            Buffer.from(
                signature,
                'base64url',
            );
    } catch {
        return false;
    }

    let payload;

    try {
        payload =
            deviceRequestPayload({
                method,
                target,
                bodySha256,
                timestamp,
                nonce,
            });
    } catch {
        return false;
    }

    return webcrypto.subtle.verify(
        {
            name: 'ECDSA',
            hash: 'SHA-256',
        },
        cryptoKey,
        signatureBytes,
        new TextEncoder().encode(
            payload,
        ),
    );
}

function requestTarget(request) {
    if (
        typeof request.url !== 'string'
        || !request.url
    ) {
        return null;
    }

    try {
        const url =
            new URL(
                request.url,
                'https://local.invalid',
            );

        return `${url.pathname}${url.search}`;
    } catch {
        return null;
    }
}

function headerValue(
    request,
    name,
) {
    const value =
        request.headers?.[
        name.toLowerCase()
        ];

    return typeof value === 'string'
        ? value
        : null;
}

export async function verifyApprovedDeviceRequest({
    request,
    userId,
    supabase,
}) {
    const deviceId =
        getDeviceId(request);

    if (!deviceId) {
        return {
            ok: false,
            status: 403,
            body: {
                error:
                    'DEVICE_NOT_APPROVED',
            },
        };
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
        ].join(','))
        .eq(
            'device_id',
            deviceId,
        )
        .eq(
            'owner_id',
            userId,
        )
        .maybeSingle();

    if (deviceError) {
        return {
            ok: false,
            status: 500,
            body: {
                error:
                    'DEVICE_READ_FAILED',
            },
        };
    }

    if (
        !device
        || device.status
        !== 'approved'
    ) {
        return {
            ok: false,
            status: 403,
            body: {
                error:
                    'DEVICE_NOT_APPROVED',
            },
        };
    }

    const timestamp =
        headerValue(
            request,
            'x-aleph-device-timestamp',
        );

    const nonce =
        headerValue(
            request,
            'x-aleph-device-nonce',
        );

    const signature =
        headerValue(
            request,
            'x-aleph-device-signature',
        );

    if (
        !timestamp
        || !nonce
        || !signature
    ) {
        return {
            ok: false,
            status: 403,
            body: {
                error:
                    'DEVICE_SIGNATURE_REQUIRED',
            },
        };
    }

    if (!NONCE_PATTERN.test(nonce)) {
        return {
            ok: false,
            status: 403,
            body: {
                error:
                    'DEVICE_NONCE_INVALID',
            },
        };
    }

    const signedAt =
        Date.parse(timestamp);

    if (
        !Number.isFinite(signedAt)
        || Math.abs(
            Date.now() - signedAt,
        ) > REQUEST_MAX_AGE_MS
    ) {
        return {
            ok: false,
            status: 403,
            body: {
                error:
                    'DEVICE_SIGNATURE_EXPIRED',
            },
        };
    }

    const target =
        requestTarget(request);

    if (!target) {
        return {
            ok: false,
            status: 400,
            body: {
                error:
                    'INVALID_REQUEST_TARGET',
            },
        };
    }

    const bodySha256 =
        requestBodySha256(
            request.body,
        );

    const verified =
        await verifyDeviceRequestSignature({
            publicKey:
                device.public_key_jwk,
            method:
                request.method,
            target,
            bodySha256,
            timestamp,
            nonce,
            signature,
        });

    if (!verified) {
        return {
            ok: false,
            status: 403,
            body: {
                error:
                    'DEVICE_SIGNATURE_INVALID',
            },
        };
    }

    /*
     * 서명을 검증한 뒤 nonce를 기록합니다.
     * (device_id, nonce)가 PK이므로 같은 서명의
     * 재전송은 DB에서도 원자적으로 거부됩니다.
     */
    const {
        error: nonceError,
    } = await supabase
        .from(
            'vault_device_request_nonces',
        )
        .insert({
            device_id:
                deviceId,
            nonce,
        });

    if (nonceError) {
        if (
            nonceError.code
            === '23505'
        ) {
            return {
                ok: false,
                status: 409,
                body: {
                    error:
                        'DEVICE_NONCE_REPLAY',
                },
            };
        }

        return {
            ok: false,
            status: 500,
            body: {
                error:
                    'DEVICE_NONCE_STORE_FAILED',
            },
        };
    }

    return {
        ok: true,
        deviceId,
    };
}

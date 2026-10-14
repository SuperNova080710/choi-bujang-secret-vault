import {
    createHash,
    randomBytes,
    webcrypto,
} from 'node:crypto';

import {
    readCookie,
} from './auth-cookie.mjs';

const DEVICE_COOKIE =
    'vault_device_id';

const DEVICE_COOKIE_MAX_AGE =
    60 * 60 * 24 * 30;

const CHALLENGE_TTL_MS =
    5 * 60 * 1000;

function cookieOptions(maxAge) {
    const options = [
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${maxAge}`,
    ];

    if (
        process.env.NODE_ENV === 'production'
    ) {
        options.push('Secure');
    }

    return options.join('; ');
}

function appendSetCookie(
    response,
    cookie,
) {
    const existing =
        response.getHeader('Set-Cookie');

    const cookies =
        Array.isArray(existing)
            ? existing
            : existing
                ? [String(existing)]
                : [];

    response.setHeader(
        'Set-Cookie',
        [
            ...cookies,
            cookie,
        ],
    );
}

export function setDeviceCookie(
    response,
    deviceId,
) {
    appendSetCookie(
        response,
        `${DEVICE_COOKIE}=${encodeURIComponent(deviceId)}; ${cookieOptions(DEVICE_COOKIE_MAX_AGE)}`,
    );
}

export function clearDeviceCookie(
    response,
) {
    appendSetCookie(
        response,
        `${DEVICE_COOKIE}=; ${cookieOptions(0)}`,
    );
}

export function getDeviceId(
    request,
) {
    const value =
        readCookie(
            request,
            DEVICE_COOKIE,
        );

    if (
        typeof value !== 'string'
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
            value,
        )
    ) {
        return null;
    }

    return value;
}

export function isDevicePublicKey(
    value,
) {
    return value
        && typeof value === 'object'
        && !Array.isArray(value)
        && value.kty === 'EC'
        && value.crv === 'P-256'
        && typeof value.x === 'string'
        && value.x.length > 0
        && typeof value.y === 'string'
        && value.y.length > 0
        && value.d === undefined;
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

export function devicePublicKeySha256(
    publicKey,
) {
    if (!isDevicePublicKey(publicKey)) {
        throw new TypeError(
            'INVALID_DEVICE_PUBLIC_KEY',
        );
    }

    return createHash('sha256')
        .update(
            JSON.stringify(
                canonicalPublicKey(
                    publicKey,
                ),
            ),
            'utf8',
        )
        .digest('hex');
}

export function createDeviceChallenge() {
    return {
        value:
            randomBytes(32)
                .toString('base64url'),
        expiresAt:
            new Date(
                Date.now()
                + CHALLENGE_TTL_MS,
            ).toISOString(),
    };
}

export function deviceApprovalPayload(
    challenge,
) {
    if (
        typeof challenge !== 'string'
        || !challenge
    ) {
        throw new TypeError(
            'INVALID_DEVICE_CHALLENGE',
        );
    }

    return [
        'ALEPH_DEVICE_APPROVAL_V1',
        challenge,
    ].join('\n');
}

export async function verifyDeviceApproval({
    publicKey,
    challenge,
    signature,
}) {
    if (
        !isDevicePublicKey(publicKey)
        || typeof signature !== 'string'
        || !signature
    ) {
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

    return webcrypto.subtle.verify(
        {
            name: 'ECDSA',
            hash: 'SHA-256',
        },
        cryptoKey,
        signatureBytes,
        new TextEncoder().encode(
            deviceApprovalPayload(
                challenge,
            ),
        ),
    );
}
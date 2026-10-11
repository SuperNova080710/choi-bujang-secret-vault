const ACCESS_COOKIE = 'vault_access_token';
const REFRESH_COOKIE = 'vault_refresh_token';

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

function cookieOptions(maxAge) {
    const options = [
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${maxAge}`,
    ];

    if (process.env.NODE_ENV === 'production') {
        options.push('Secure');
    }

    return options.join('; ');
}

export function readCookie(request, name) {
    const cookieHeader = request.headers.cookie;

    if (typeof cookieHeader !== 'string') {
        return null;
    }

    for (const item of cookieHeader.split(';')) {
        const separator = item.indexOf('=');

        if (separator < 0) {
            continue;
        }

        const key = item.slice(0, separator).trim();

        if (key !== name) {
            continue;
        }

        try {
            return decodeURIComponent(item.slice(separator + 1).trim());
        } catch {
            return null;
        }
    }

    return null;
}

export function getAccessToken(request) {
    return readCookie(request, ACCESS_COOKIE);
}

export function getRefreshToken(request) {
    return readCookie(request, REFRESH_COOKIE);
}

export function setAuthCookies(response, tokens) {
    if (
        typeof tokens.access_token !== 'string'
        || !tokens.access_token
        || typeof tokens.refresh_token !== 'string'
        || !tokens.refresh_token
    ) {
        throw new Error('INVALID_AUTH_TOKENS');
    }

    const expiresIn = Number.isFinite(tokens.expires_in)
        ? Math.max(1, Math.floor(tokens.expires_in))
        : 3600;

    response.setHeader('Set-Cookie', [
        `${ACCESS_COOKIE}=${encodeURIComponent(tokens.access_token)}; ${cookieOptions(expiresIn)}`,
        `${REFRESH_COOKIE}=${encodeURIComponent(tokens.refresh_token)}; ${cookieOptions(REFRESH_MAX_AGE)}`,
    ]);
}

export function clearAuthCookies(response) {
    response.setHeader('Set-Cookie', [
        `${ACCESS_COOKIE}=; ${cookieOptions(0)}`,
        `${REFRESH_COOKIE}=; ${cookieOptions(0)}`,
    ]);
}

export function isSameOriginRequest(request) {
    const originHeader = request.headers.origin;
    const hostHeader = request.headers['x-forwarded-host']
        ?? request.headers.host;
    const protocolHeader = request.headers['x-forwarded-proto'];

    if (
        typeof originHeader !== 'string'
        || typeof hostHeader !== 'string'
    ) {
        return false;
    }

    const host = hostHeader.split(',')[0].trim();
    const protocol = typeof protocolHeader === 'string'
        ? protocolHeader.split(',')[0].trim()
        : (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')
            ? 'http'
            : 'https');

    try {
        const origin = new URL(originHeader);

        return origin.origin === `${protocol}://${host}`;
    } catch {
        return false;
    }
}

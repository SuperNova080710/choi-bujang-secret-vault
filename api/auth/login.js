import {
    isSameOriginRequest,
    setAuthCookies,
} from '../../src/auth-cookie.mjs';

function getAuthConfig() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
        throw new Error('SERVER_CONFIG_ERROR');
    }

    return {
        supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
        publishableKey,
    };
}

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({
            error: 'METHOD_NOT_ALLOWED',
        });
    }

    if (!isSameOriginRequest(request)) {
        return response.status(403).json({
            error: 'INVALID_ORIGIN',
        });
    }

    const email =
        typeof request.body?.email === 'string'
            ? request.body.email.trim()
            : '';

    const password =
        typeof request.body?.password === 'string'
            ? request.body.password
            : '';

    if (!email || !password) {
        return response.status(400).json({
            error: 'EMAIL_AND_PASSWORD_REQUIRED',
        });
    }

    let config;

    try {
        config = getAuthConfig();
    } catch {
        return response.status(500).json({
            error: 'SERVER_CONFIG_ERROR',
        });
    }

    try {
        const authResponse = await fetch(
            `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: config.publishableKey,
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
                signal: AbortSignal.timeout(10000),
            },
        );

        const authData = await authResponse.json().catch(() => null);

        if (!authResponse.ok) {
            if (
                authResponse.status === 400 ||
                authResponse.status === 401
            ) {
                return response.status(401).json({
                    error: 'LOGIN_FAILED',
                });
            }

            return response.status(502).json({
                error: 'AUTH_PROVIDER_ERROR',
            });
        }

        if (
            typeof authData?.access_token !== 'string' ||
            typeof authData?.refresh_token !== 'string' ||
            typeof authData?.user?.id !== 'string'
        ) {
            return response.status(502).json({
                error: 'INVALID_AUTH_PROVIDER_RESPONSE',
            });
        }

        setAuthCookies(response, {
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
            expires_in: authData.expires_in,
        });

        return response.status(200).json({
            user: {
                id: authData.user.id,
                email: authData.user.email ?? null,
            },
        });
    } catch (error) {
        if (
            error?.name === 'TimeoutError' ||
            error?.name === 'AbortError'
        ) {
            return response.status(504).json({
                error: 'AUTH_PROVIDER_TIMEOUT',
            });
        }

        return response.status(502).json({
            error: 'AUTH_PROVIDER_UNAVAILABLE',
        });
    }
}
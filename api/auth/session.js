import {
    clearAuthCookies,
    getAccessToken,
    getRefreshToken,
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

function getPublicUser(user) {
    if (typeof user?.id !== 'string') {
        return null;
    }

    return {
        id: user.id,
        email: user.email ?? null,
    };
}

async function fetchUser(config, accessToken) {
    return fetch(`${config.supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
            apikey: config.publishableKey,
            Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(10000),
    });
}

async function refreshSession(config, refreshToken) {
    return fetch(
        `${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: config.publishableKey,
            },
            body: JSON.stringify({
                refresh_token: refreshToken,
            }),
            signal: AbortSignal.timeout(10000),
        },
    );
}

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');

    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({
            error: 'METHOD_NOT_ALLOWED',
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

    const accessToken = getAccessToken(request);
    const refreshToken = getRefreshToken(request);

    if (!accessToken && !refreshToken) {
        return response.status(200).json({
            user: null,
        });
    }

    try {
        if (accessToken) {
            const userResponse = await fetchUser(config, accessToken);

            if (userResponse.ok) {
                const userData = await userResponse.json().catch(() => null);
                const user = getPublicUser(userData);

                if (user) {
                    return response.status(200).json({
                        user,
                    });
                }

                return response.status(502).json({
                    error: 'INVALID_AUTH_PROVIDER_RESPONSE',
                });
            }

            if (userResponse.status !== 401) {
                return response.status(502).json({
                    error: 'AUTH_PROVIDER_ERROR',
                });
            }
        }

        if (!refreshToken) {
            clearAuthCookies(response);

            return response.status(200).json({
                user: null,
            });
        }

        const refreshResponse = await refreshSession(
            config,
            refreshToken,
        );

        const refreshData = await refreshResponse
            .json()
            .catch(() => null);

        if (!refreshResponse.ok) {
            if (
                refreshResponse.status === 400 ||
                refreshResponse.status === 401
            ) {
                clearAuthCookies(response);

                return response.status(200).json({
                    user: null,
                });
            }

            return response.status(502).json({
                error: 'AUTH_PROVIDER_ERROR',
            });
        }

        if (
            typeof refreshData?.access_token !== 'string' ||
            typeof refreshData?.refresh_token !== 'string' ||
            typeof refreshData?.user?.id !== 'string'
        ) {
            clearAuthCookies(response);

            return response.status(502).json({
                error: 'INVALID_AUTH_PROVIDER_RESPONSE',
            });
        }

        setAuthCookies(response, {
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expires_in: refreshData.expires_in,
        });

        return response.status(200).json({
            user: getPublicUser(refreshData.user),
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
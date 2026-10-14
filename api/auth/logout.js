import {
    clearAuthCookies,
    getAccessToken,
    isSameOriginRequest,
} from '../../src/auth-cookie.mjs';
import {
    clearDeviceCookie,
} from '../../src/device-approval.mjs';

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
            error: 'ORIGIN_NOT_ALLOWED',
        });
    }

    const accessToken = getAccessToken(request);
    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/u, '');
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    let providerLogoutConfirmed = false;

    try {
        if (accessToken && supabaseUrl && publishableKey) {
            const providerResponse = await fetch(
                `${supabaseUrl}/auth/v1/logout`,
                {
                    method: 'POST',
                    headers: {
                        apikey: publishableKey,
                        Authorization: `Bearer ${accessToken}`,
                    },
                    signal: AbortSignal.timeout(10000),
                },
            );

            providerLogoutConfirmed = providerResponse.ok;
        }
    } catch {
        // 외부 요청 실패 여부와 관계없이 로컬 쿠키는 제거합니다.
    } finally {
        clearAuthCookies(response);
        clearDeviceCookie(response);
    }

    return response.status(200).json({
        success: true,
        providerLogoutConfirmed,
    });
}
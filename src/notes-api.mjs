import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import {
    getAccessToken,
    isSameOriginRequest,
} from './auth-cookie.mjs';
import { createLoginVerifier } from './verify-login.mjs';
import {
    serverResourceId,
} from './resource-id.mjs';

let verifyLoginAuthorization;

function getLoginVerifier() {
    if (!verifyLoginAuthorization) {
        const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

        if (!supabaseSecretKey) {
            throw new Error('SERVER_CONFIG_ERROR');
        }

        verifyLoginAuthorization = createLoginVerifier({
            config,
            supabaseSecretKey,
        });
    }

    return verifyLoginAuthorization;
}

export async function authenticateRequest(request) {
    try {
        const authorization = request.headers.authorization;
        const hasBearerHeader = typeof authorization === 'string'
            && authorization.length > 0;

        let token;

        if (hasBearerHeader) {
            // 기존 심사자 JWT 및 Bearer 토큰 검증 경로를 유지합니다.
            token = authorization;
        } else {
            // 쿠키 인증은 상태를 변경하는 요청에서 Origin을 검증합니다.
            if (
                ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
                && !isSameOriginRequest(request)
            ) {
                return {
                    ok: false,
                    response: {
                        status: 403,
                        body: { error: 'ORIGIN_NOT_ALLOWED' },
                    },
                };
            }

            const accessToken = getAccessToken(request);

            if (!accessToken) {
                return {
                    ok: false,
                    response: {
                        status: 401,
                        body: { error: 'LOGIN_REQUIRED' },
                    },
                };
            }

            token = `Bearer ${accessToken}`;
        }

        const verifyLogin = getLoginVerifier();
        const login = await verifyLogin(token);

        if (!login) {
            return {
                ok: false,
                response: {
                    status: 401,
                    body: { error: 'LOGIN_REQUIRED' },
                },
            };
        }

        return {
            ok: true,
            userId: login.userId,
        };
    } catch {
        return {
            ok: false,
            response: {
                status: 500,
                body: { error: 'SERVER_CONFIG_ERROR' },
            },
        };
    }
}

export function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
        throw new Error('SERVER_CONFIG_ERROR');
    }

    return createClient(supabaseUrl, supabaseSecretKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

export function isUuid(value) {
    return typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function toNoteResponse(note) {
    return {
        id: note.public_id,
        resourceId: serverResourceId('notes', note.public_id),
        title: note.title,
        body: note.content,
    };
}

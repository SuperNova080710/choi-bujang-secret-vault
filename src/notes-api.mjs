import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from './verify-login.mjs';

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
        const verifyLogin = getLoginVerifier();
        const login = await verifyLogin(request.headers.authorization);

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
        title: note.title,
        body: note.content,
    };
}


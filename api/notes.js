import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';

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

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
        return response.status(500).json({ error: 'SERVER_CONFIG_ERROR' });
    }

    let login;
    try {
        const verifyLogin = getLoginVerifier();
        login = await verifyLogin(request.headers.authorization);
    } catch {
        return response.status(500).json({ error: 'SERVER_CONFIG_ERROR' });
    }

    if (!login) {
        return response.status(401).json({ error: 'LOGIN_REQUIRED' });
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const { data, error } = await supabase
        .from('virtual_notes')
        .select('title, content')
        .order('id', { ascending: true });

    if (error) {
        return response.status(500).json({ error: 'NOTES_READ_FAILED' });
    }

    return response.status(200).json({ notes: data });
}

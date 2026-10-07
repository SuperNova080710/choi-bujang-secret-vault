import {
    authenticateRequest,
    getSupabaseClient,
    isUuid,
    toNoteResponse,
} from '../src/notes-api.mjs';

export default async function handler(request, response) {
    if (!['GET', 'POST'].includes(request.method)) {
        response.setHeader('Allow', 'GET, POST');
        return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const authentication = await authenticateRequest(request);

    if (!authentication.ok) {
        return response
            .status(authentication.response.status)
            .json(authentication.response.body);
    }

    let supabase;

    try {
        supabase = getSupabaseClient();
    } catch {
        return response.status(500).json({ error: 'SERVER_CONFIG_ERROR' });
    }

    if (request.method === 'GET') {
        const { data, error } = await supabase
            .from('virtual_notes')
            .select('public_id, title, content, owner_id')
            .or(`owner_id.eq.${authentication.userId},owner_id.is.null`)
            .order('id', { ascending: true });

        if (error) {
            return response.status(500).json({ error: 'NOTES_READ_FAILED' });
        }

        return response.status(200).json({
            notes: data.map(toNoteResponse),
        });
    }

    let body;

    try {
        body = typeof request.body === 'string'
            ? JSON.parse(request.body)
            : request.body;
    } catch {
        return response.status(400).json({ error: 'INVALID_JSON' });
    }

    if (!body || typeof body.title !== 'string' || typeof body.body !== 'string') {
        return response.status(400).json({ error: 'INVALID_NOTE' });
    }

    if (body.id !== undefined && !isUuid(body.id)) {
        return response.status(400).json({ error: 'INVALID_ID' });
    }

    const publicId = body.id ?? crypto.randomUUID();

    const { data, error } = await supabase
        .from('virtual_notes')
        .insert({
            public_id: publicId,
            owner_id: authentication.userId,
            title: body.title,
            content: body.body,
        })
        .select('public_id, title, content')
        .single();

    if (error) {
        if (error.code === '23505') {
            return response.status(409).json({ error: 'NOTE_ID_ALREADY_EXISTS' });
        }

        return response.status(500).json({ error: 'NOTE_CREATE_FAILED' });
    }

    return response.status(201).json({
        id: data.public_id,
        title: data.title,
        body: data.content,
    });
}

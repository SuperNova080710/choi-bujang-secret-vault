import {
    authenticateRequest,
    getSupabaseClient,
    isUuid,
    toNoteResponse,
} from '../../src/notes-api.mjs';

export default async function handler(request, response) {
    const { id } = request.query;

    if (!isUuid(id)) {
        return response.status(400).json({ error: 'INVALID_ID' });
    }

    if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
        response.setHeader('Allow', 'GET, PUT, DELETE');
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
            .select('public_id, title, content')
            .eq('public_id', id)
            .maybeSingle();

        if (error) {
            return response.status(500).json({ error: 'NOTE_READ_FAILED' });
        }

        if (!data) {
            return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
        }

        return response.status(200).json(toNoteResponse(data));
    }

    if (request.method === 'PUT') {
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

        const { data, error } = await supabase
            .from('virtual_notes')
            .update({
                title: body.title,
                content: body.body,
            })
            .eq('public_id', id)
            .select('public_id, title, content')
            .maybeSingle();

        if (error) {
            return response.status(500).json({ error: 'NOTE_UPDATE_FAILED' });
        }

        if (!data) {
            return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
        }

        return response.status(200).json(toNoteResponse(data));
    }

    const { data, error } = await supabase
        .from('virtual_notes')
        .delete()
        .eq('public_id', id)
        .select('public_id')
        .maybeSingle();

    if (error) {
        return response.status(500).json({ error: 'NOTE_DELETE_FAILED' });
    }

    if (!data) {
        return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
    }

    return response.status(204).end();
}


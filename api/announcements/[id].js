import {
    authenticateRequest,
    getSupabaseClient,
    isUuid,
} from '../../src/notes-api.mjs';

export default async function handler(request, response) {
    const { id } = request.query;

    if (!isUuid(id)) {
        return response.status(400).json({ error: 'INVALID_ID' });
    }

    if (request.method !== 'PUT') {
        response.setHeader('Allow', 'PUT');
        return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const authentication = await authenticateRequest(request);

    if (!authentication.ok) {
        return response
            .status(authentication.response.status)
            .json(authentication.response.body);
    }

    let body;

    try {
        body = typeof request.body === 'string'
            ? JSON.parse(request.body)
            : request.body;
    } catch {
        return response.status(400).json({ error: 'INVALID_JSON' });
    }

    if (
        !body
        || Array.isArray(body)
        || Object.keys(body).some(key => !['title', 'body'].includes(key))
        || typeof body.title !== 'string'
        || typeof body.body !== 'string'
    ) {
        return response.status(400).json({ error: 'INVALID_ANNOUNCEMENT' });
    }

    let supabase;

    try {
        supabase = getSupabaseClient();
    } catch {
        return response.status(500).json({ error: 'SERVER_CONFIG_ERROR' });
    }

    // 강사 권한은 요청 본문의 role이나 화면 상태가 아니라
    // 서버에 저장된 실제 로그인 사용자 권한으로만 확인합니다.
    const {
        data: instructor,
        error: instructorError,
    } = await supabase
        .from('vault_instructors')
        .select('user_id')
        .eq('user_id', authentication.userId)
        .maybeSingle();

    if (
        instructorError
        || !instructor
        || instructor.user_id !== authentication.userId
    ) {
        return response.status(403).json({ error: 'ANNOUNCEMENT_FORBIDDEN' });
    }

    const {
        data,
        error,
    } = await supabase
        .from('vault_announcements')
        .update({
            title: body.title,
            content: body.body,
        })
        .eq('id', id)
        .select('id, title, content')
        .maybeSingle();

    if (error) {
        return response.status(500).json({ error: 'ANNOUNCEMENT_UPDATE_FAILED' });
    }

    if (!data) {
        return response.status(404).json({ error: 'ANNOUNCEMENT_NOT_FOUND' });
    }

    return response.status(200).json({
        id: data.id,
        title: data.title,
        body: data.content,
    });
}

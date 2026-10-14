import {
    authenticateRequest,
    getSupabaseClient,
    isUuid,
} from '../../src/notes-api.mjs';

import {
    noteContentSha256,
    verifyNoteBackup,
} from '../../src/note-restore.mjs';

export default async function handler(
    request,
    response,
) {
    if (request.method !== 'POST') {
        response.setHeader(
            'Allow',
            'POST',
        );

        return response
            .status(405)
            .json({
                error: 'METHOD_NOT_ALLOWED',
            });
    }

    const { id } = request.query;

    if (!isUuid(id)) {
        return response
            .status(400)
            .json({
                error: 'INVALID_ID',
            });
    }

    /*
     * 쿼리스트링으로 복원 범위를 넓히지 못하게 합니다.
     * Vercel 동적 라우트의 id 자체는 request.query에 포함되므로
     * id 이외의 값만 금지합니다.
     */
    const extraQueryKeys =
        Object.keys(
            request.query ?? {},
        ).filter(
            key => key !== 'id',
        );

    if (extraQueryKeys.length > 0) {
        return response
            .status(400)
            .json({
                error: 'QUERY_NOT_ALLOWED',
            });
    }

    const authentication =
        await authenticateRequest(
            request,
        );

    if (!authentication.ok) {
        return response
            .status(
                authentication.response.status,
            )
            .json(
                authentication.response.body,
            );
    }

    let supabase;

    try {
        supabase =
            getSupabaseClient();
    } catch {
        return response
            .status(500)
            .json({
                error:
                    'SERVER_CONFIG_ERROR',
            });
    }

    /*
     * 서버 전용 백업 테이블에서
     * URL에 지정된 한 건만 읽습니다.
     */
    const {
        data: backup,
        error: backupError,
    } = await supabase
        .from(
            'virtual_note_backups',
        )
        .select(
            [
                'public_id',
                'owner_id',
                'title',
                'content',
                'content_sha256',
                'backup_version',
            ].join(','),
        )
        .eq(
            'public_id',
            id,
        )
        .maybeSingle();

    if (backupError) {
        return response
            .status(500)
            .json({
                error:
                    'BACKUP_READ_FAILED',
            });
    }

    if (!backup) {
        return response
            .status(404)
            .json({
                error:
                    'BACKUP_NOT_FOUND',
            });
    }

    /*
     * ID, 소유자, 사본 내용 SHA-256을
     * 쓰기 전에 모두 확인합니다.
     */
    const backupVerification =
        verifyNoteBackup({
            backup,
            requestedId: id,
            authenticatedUserId:
                authentication.userId,
        });

    if (!backupVerification.ok) {
        if (
            backupVerification.error
            === 'BACKUP_OWNER_MISMATCH'
        ) {
            return response
                .status(403)
                .json({
                    error:
                        'RESTORE_FORBIDDEN',
                });
        }

        return response
            .status(409)
            .json({
                error:
                    backupVerification.error,
            });
    }

    /*
     * 같은 public_id가 현재 존재한다면
     * 다른 사용자 소유의 자료를 덮어쓰지 않습니다.
     */
    const {
        data: current,
        error: currentError,
    } = await supabase
        .from('virtual_notes')
        .select(
            'public_id, owner_id',
        )
        .eq(
            'public_id',
            id,
        )
        .maybeSingle();

    if (currentError) {
        return response
            .status(500)
            .json({
                error:
                    'NOTE_READ_FAILED',
            });
    }

    if (
        current
        && current.owner_id
        !== authentication.userId
    ) {
        return response
            .status(403)
            .json({
                error:
                    'RESTORE_FORBIDDEN',
            });
    }

    let restored;
    let restoreError;

    if (current) {
        const result =
            await supabase
                .from('virtual_notes')
                .update({
                    title:
                        backup.title,
                    content:
                        backup.content,
                })
                .eq(
                    'public_id',
                    id,
                )
                .eq(
                    'owner_id',
                    authentication.userId,
                )
                .select(
                    [
                        'public_id',
                        'owner_id',
                        'title',
                        'content',
                    ].join(','),
                )
                .maybeSingle();

        restored = result.data;
        restoreError =
            result.error;
    } else {
        const result =
            await supabase
                .from('virtual_notes')
                .insert({
                    public_id:
                        backup.public_id,
                    owner_id:
                        backup.owner_id,
                    title:
                        backup.title,
                    content:
                        backup.content,
                })
                .select(
                    [
                        'public_id',
                        'owner_id',
                        'title',
                        'content',
                    ].join(','),
                )
                .single();

        restored = result.data;
        restoreError =
            result.error;
    }

    if (restoreError) {
        return response
            .status(500)
            .json({
                error:
                    'NOTE_RESTORE_FAILED',
            });
    }

    /*
     * DB에 실제로 기록된 결과도
     * ID·소유자·내용 해시를 다시 확인합니다.
     */
    if (
        !restored
        || restored.public_id
        !== backup.public_id
        || restored.owner_id
        !== backup.owner_id
    ) {
        return response
            .status(500)
            .json({
                error:
                    'RESTORE_VERIFICATION_FAILED',
            });
    }

    const restoredSha256 =
        noteContentSha256(
            restored.content,
        );

    if (
        restoredSha256
        !== backup.content_sha256
    ) {
        return response
            .status(500)
            .json({
                error:
                    'RESTORE_VERIFICATION_FAILED',
            });
    }

    /*
     * 본문 자체는 응답하지 않습니다.
     */
    return response
        .status(200)
        .json({
            restored: true,
            id:
                restored.public_id,
            ownerVerified: true,
            contentSha256:
                restoredSha256,
            backupVersion:
                backup.backup_version,
        });
}
import {
    createHash,
} from 'node:crypto';

export function noteContentSha256(content) {
    if (typeof content !== 'string') {
        throw new TypeError(
            'INVALID_BACKUP_CONTENT',
        );
    }

    return createHash('sha256')
        .update(content, 'utf8')
        .digest('hex');
}

export function verifyNoteBackup({
    backup,
    requestedId,
    authenticatedUserId,
}) {
    if (
        !backup
        || typeof backup !== 'object'
        || Array.isArray(backup)
    ) {
        return {
            ok: false,
            error: 'BACKUP_NOT_FOUND',
        };
    }

    if (
        backup.public_id !== requestedId
    ) {
        return {
            ok: false,
            error: 'BACKUP_ID_MISMATCH',
        };
    }

    if (
        backup.owner_id !== authenticatedUserId
    ) {
        return {
            ok: false,
            error: 'BACKUP_OWNER_MISMATCH',
        };
    }

    if (
        typeof backup.title !== 'string'
        || typeof backup.content !== 'string'
        || typeof backup.content_sha256 !== 'string'
        || typeof backup.backup_version !== 'string'
    ) {
        return {
            ok: false,
            error: 'BACKUP_INVALID',
        };
    }

    const actualContentSha256 =
        noteContentSha256(
            backup.content,
        );

    if (
        actualContentSha256
        !== backup.content_sha256
    ) {
        return {
            ok: false,
            error: 'BACKUP_HASH_MISMATCH',
        };
    }

    return {
        ok: true,
        contentSha256:
            actualContentSha256,
    };
}
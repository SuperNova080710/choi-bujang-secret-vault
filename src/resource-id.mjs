const RESOURCE_FAMILIES = Object.freeze({
    NOTES: 'notes',
    ANNOUNCEMENTS: 'announcements',
});

const RESOURCE_PART_PATTERN = /^[A-Za-z0-9._~-]+$/u;

const RESERVED_RESOURCE_PARTS = new Set([
    'export',
]);

export function isResourcePart(value) {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= 128
        && RESOURCE_PART_PATTERN.test(value)
        && !RESERVED_RESOURCE_PARTS.has(value.toLowerCase());
}

function assertResourcePart(value) {
    if (!isResourcePart(value)) {
        throw new TypeError('유효한 자원 ID가 필요합니다.');
    }

    return value;
}

export function noteResourceId(noteId) {
    return `${RESOURCE_FAMILIES.NOTES}:${assertResourcePart(noteId)}`;
}

export function noteListResourceId() {
    return `${RESOURCE_FAMILIES.NOTES}:list`;
}

export function announcementResourceId(announcementId) {
    return `${RESOURCE_FAMILIES.ANNOUNCEMENTS}:${assertResourcePart(announcementId)}`;
}

export function announcementListResourceId() {
    return `${RESOURCE_FAMILIES.ANNOUNCEMENTS}:list`;
}
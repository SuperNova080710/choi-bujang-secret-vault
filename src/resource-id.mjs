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

/*
 * 실제 API 핸들러가 사용하는 서버 측 자원 식별 진입점입니다.
 *
 * family와 resourcePart는 브라우저가 보낸 resourceId 값을 읽는 것이 아니라
 * 각 서버 라우트가 고정된 family와 검증된 경로 ID를 직접 전달합니다.
 */
export function serverResourceId(family, resourcePart) {
    if (family === RESOURCE_FAMILIES.NOTES) {
        return resourcePart === undefined
            ? noteListResourceId()
            : noteResourceId(resourcePart);
    }

    if (family === RESOURCE_FAMILIES.ANNOUNCEMENTS) {
        return resourcePart === undefined
            ? announcementListResourceId()
            : announcementResourceId(resourcePart);
    }

    throw new TypeError('알 수 없는 자원 구역입니다.');
}
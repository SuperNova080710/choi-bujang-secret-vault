import assert from 'node:assert/strict';
import test from 'node:test';

import {
    announcementResourceId,
    noteListResourceId,
    noteResourceId,
    serverResourceId,
} from '../src/resource-id.mjs';

import {
    toNoteResponse,
} from '../src/notes-api.mjs';

const RESOURCE_UUID =
    '12345678-1234-4123-8123-123456789abc';

test('같은 자료 ID라도 메모와 공지는 다른 자원 ID를 가진다', () => {
    const note = noteResourceId(RESOURCE_UUID);
    const announcement = announcementResourceId(RESOURCE_UUID);

    assert.equal(
        note,
        `notes:${RESOURCE_UUID}`,
    );

    assert.equal(
        announcement,
        `announcements:${RESOURCE_UUID}`,
    );

    assert.notEqual(
        note,
        announcement,
    );
});

test('메모 목록 요청은 별도 목록 자원 ID를 가진다', () => {
    assert.equal(
        serverResourceId('notes'),
        noteListResourceId(),
    );

    assert.equal(
        serverResourceId('notes'),
        'notes:list',
    );
});

test('단건 메모 요청은 서버가 메모 자원 ID를 만든다', () => {
    assert.equal(
        serverResourceId('notes', RESOURCE_UUID),
        `notes:${RESOURCE_UUID}`,
    );
});

test('단건 공지 요청은 서버가 공지 자원 ID를 만든다', () => {
    assert.equal(
        serverResourceId('announcements', RESOURCE_UUID),
        `announcements:${RESOURCE_UUID}`,
    );
});

test('메모 API 응답에는 서버가 계산한 자원 ID가 포함된다', () => {
    const result = toNoteResponse({
        public_id: RESOURCE_UUID,
        title: 'fixture title',
        content: 'fixture body',
    });

    assert.deepEqual(
        result,
        {
            id: RESOURCE_UUID,
            resourceId: `notes:${RESOURCE_UUID}`,
            title: 'fixture title',
            body: 'fixture body',
        },
    );
});

test('클라이언트가 임의의 자원 구역을 선택할 수 없다', () => {
    assert.throws(
        () => serverResourceId('admin', RESOURCE_UUID),
        TypeError,
    );
});
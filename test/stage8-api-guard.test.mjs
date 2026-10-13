import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const noteHandlerUrl =
    new URL('../api/notes/[id].js', import.meta.url);

const noteListHandlerUrl =
    new URL('../api/notes.js', import.meta.url);

const announcementHandlerUrl =
    new URL('../api/announcements/[id].js', import.meta.url);

async function source(url) {
    return readFile(url, 'utf8');
}

test('단건 메모 GET은 인증 사용자의 owner_id로 조회 범위를 제한한다', async () => {
    const code = await source(noteHandlerUrl);

    assert.match(
        code,
        /\.eq\(['"]public_id['"],\s*id\)/u,
    );

    assert.match(
        code,
        /\.eq\(['"]owner_id['"],\s*authentication\.userId\)/u,
    );

    assert.match(
        code,
        /data\.owner_id\s*!==\s*authentication\.userId/u,
    );
});

test('메모 PUT은 수정 전에 저장된 owner_id를 다시 확인한다', async () => {
    const code = await source(noteHandlerUrl);

    assert.match(
        code,
        /existingNote\.owner_id\s*!==\s*authentication\.userId/u,
    );

    assert.match(
        code,
        /\.update\(/u,
    );

    assert.match(
        code,
        /\.eq\(['"]owner_id['"],\s*authentication\.userId\)/u,
    );
});

test('메모 DELETE는 삭제 전에 저장된 owner_id를 다시 확인한다', async () => {
    const code = await source(noteHandlerUrl);

    assert.match(
        code,
        /\.delete\(\)/u,
    );

    assert.match(
        code,
        /existingNote\.owner_id\s*!==\s*authentication\.userId/u,
    );

    assert.match(
        code,
        /\.eq\(['"]owner_id['"],\s*authentication\.userId\)/u,
    );
});

test('메모 목록 API는 로그인 사용자의 owner_id만 조회한다', async () => {
    const code = await source(noteListHandlerUrl);

    assert.match(
        code,
        /\.eq\(['"]owner_id['"],\s*authentication\.userId\)/u,
    );

    assert.match(
        code,
        /note\.owner_id\s*!==\s*authentication\.userId/u,
    );
});

test('새 메모의 owner_id는 인증된 사용자 ID로 서버가 지정한다', async () => {
    const code = await source(noteListHandlerUrl);

    assert.match(
        code,
        /owner_id:\s*authentication\.userId/u,
    );
});

test('강사 공지 수정은 서버의 vault_instructors 권한을 조회한다', async () => {
    const code = await source(announcementHandlerUrl);

    assert.match(
        code,
        /\.from\(['"]vault_instructors['"]\)/u,
    );

    assert.match(
        code,
        /\.eq\(['"]user_id['"],\s*authentication\.userId\)/u,
    );

    assert.match(
        code,
        /instructor\.user_id\s*!==\s*authentication\.userId/u,
    );

    assert.match(
        code,
        /ANNOUNCEMENT_FORBIDDEN/u,
    );
});

test('공지 권한 판정은 요청 body의 role을 사용하지 않는다', async () => {
    const code = await source(announcementHandlerUrl);

    assert.doesNotMatch(
        code,
        /body\.role/u,
    );

    assert.doesNotMatch(
        code,
        /request\.body\.role/u,
    );
});
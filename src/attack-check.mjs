// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (![3, 4].includes(config.step)) {
    throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  }

  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }

  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
    || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }

  const timeout = () => AbortSignal.timeout(10000);
  const apiUrl = new URL('/api/notes', app);

  async function isJsonError(response) {
    if (response.status !== 401 && response.status !== 403) {
      return false;
    }

    try {
      const data = await response.json();
      return typeof data?.error === 'string' && data.error.length > 0;
    } catch {
      return false;
    }
  }

  const results = [];

  const anonymousResponse = await fetch(apiUrl, {
    redirect: 'error',
    signal: timeout(),
  });
  const anonymousRejected = await isJsonError(anonymousResponse);

  results.push({
    attackId: 'anonymous_api_note_read',
    expected: '비로그인 요청으로 /api/notes에서 가상 자료를 조회할 수 없어야 함',
    observed: anonymousRejected
      ? `비로그인 목록 조회가 인증 오류 JSON으로 거부됨 (HTTP ${anonymousResponse.status})`
      : `비로그인 목록 조회가 예상대로 거부되지 않음 (HTTP ${anonymousResponse.status})`,
  });

  const invalidTokenResponse = await fetch(apiUrl, {
    headers: {
      Authorization: 'Bearer invalid-stage4-token',
    },
    redirect: 'error',
    signal: timeout(),
  });
  const invalidTokenRejected = await isJsonError(invalidTokenResponse);

  results.push({
    attackId: 'invalid_token_api_note_read',
    expected: '유효하지 않은 로그인 토큰으로 메모를 조회할 수 없어야 함',
    observed: invalidTokenRejected
      ? `유효하지 않은 토큰이 인증 오류 JSON으로 거부됨 (HTTP ${invalidTokenResponse.status})`
      : `유효하지 않은 토큰이 예상대로 거부되지 않음 (HTTP ${invalidTokenResponse.status})`,
  });

  const noteId = crypto.randomUUID();
  const noteUrl = new URL(`/api/notes/${noteId}`, app);

  const detailResponse = await fetch(noteUrl, {
    redirect: 'error',
    signal: timeout(),
  });
  const detailRejected = await isJsonError(detailResponse);

  results.push({
    attackId: 'anonymous_api_note_detail',
    expected: '비로그인 요청으로 개별 메모 API에 접근할 수 없어야 함',
    observed: detailRejected
      ? `비로그인 개별 조회가 인증 오류 JSON으로 거부됨 (HTTP ${detailResponse.status})`
      : `비로그인 개별 조회가 예상대로 거부되지 않음 (HTTP ${detailResponse.status})`,
  });

  const updateResponse = await fetch(noteUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'unauthorized test',
      body: 'unauthorized test',
    }),
    redirect: 'error',
    signal: timeout(),
  });
  const updateRejected = await isJsonError(updateResponse);

  results.push({
    attackId: 'anonymous_api_note_update',
    expected: '비로그인 요청으로 메모를 수정할 수 없어야 함',
    observed: updateRejected
      ? `비로그인 수정 요청이 인증 오류 JSON으로 거부됨 (HTTP ${updateResponse.status})`
      : `비로그인 수정 요청이 예상대로 거부되지 않음 (HTTP ${updateResponse.status})`,
  });

  const deleteResponse = await fetch(noteUrl, {
    method: 'DELETE',
    redirect: 'error',
    signal: timeout(),
  });
  const deleteRejected = await isJsonError(deleteResponse);

  results.push({
    attackId: 'anonymous_api_note_delete',
    expected: '비로그인 요청으로 메모를 삭제할 수 없어야 함',
    observed: deleteRejected
      ? `비로그인 삭제 요청이 인증 오류 JSON으로 거부됨 (HTTP ${deleteResponse.status})`
      : `비로그인 삭제 요청이 예상대로 거부되지 않음 (HTTP ${deleteResponse.status})`,
  });

  const staticResponse = await fetch(new URL('/data.json', app), {
    redirect: 'error',
    signal: timeout(),
  });

  let staticEmpty = false;
  if (staticResponse.ok) {
    try {
      const data = await staticResponse.json();
      staticEmpty = Array.isArray(data.notes) && data.notes.length === 0;
    } catch {
      // A non-JSON response is a failed check.
    }
  }

  results.push({
    attackId: 'anonymous_static_note_read',
    expected: '공개 정적 /data.json에서는 가상 자료를 조회할 수 없어야 함',
    observed: staticEmpty
      ? '공개 정적 /data.json의 notes가 비어 있음'
      : `공개 정적 /data.json에 가상 자료가 남아 있거나 응답을 확인할 수 없음 (HTTP ${staticResponse.status})`,
  });

  return results;
}

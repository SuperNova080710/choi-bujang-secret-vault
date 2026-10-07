// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (config.step !== 3) {
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

  const apiUrl = new URL('/api/notes', app);

  const anonymousResponse = await fetch(apiUrl, {
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });

  let anonymousRejected = false;

  if (anonymousResponse.status === 401 || anonymousResponse.status === 403) {
    try {
      const data = await anonymousResponse.json();
      anonymousRejected = typeof data?.error === 'string' && data.error.length > 0;
    } catch {
      // A non-JSON response is a failed check.
    }
  }

  const invalidTokenResponse = await fetch(apiUrl, {
    headers: {
      Authorization: 'Bearer invalid-stage3-token',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });

  let invalidTokenRejected = false;

  if (invalidTokenResponse.status === 401 || invalidTokenResponse.status === 403) {
    try {
      const data = await invalidTokenResponse.json();
      invalidTokenRejected = typeof data?.error === 'string' && data.error.length > 0;
    } catch {
      // A non-JSON response is a failed check.
    }
  }

  const staticResponse = await fetch(new URL('/data.json', app), {
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
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

  return [
    {
      attackId: 'anonymous_api_note_read',
      expected: '비로그인 요청으로 /api/notes에서 가상 자료를 조회할 수 없어야 함',
      observed: anonymousRejected
        ? `비로그인 요청이 인증 오류 JSON으로 거부됨 (HTTP ${anonymousResponse.status})`
        : `비로그인 요청이 예상대로 거부되지 않음 (HTTP ${anonymousResponse.status})`,
    },
    {
      attackId: 'invalid_token_api_note_read',
      expected: '유효하지 않은 로그인 토큰으로 /api/notes에서 가상 자료를 조회할 수 없어야 함',
      observed: invalidTokenRejected
        ? `유효하지 않은 토큰 요청이 인증 오류 JSON으로 거부됨 (HTTP ${invalidTokenResponse.status})`
        : `유효하지 않은 토큰 요청이 예상대로 거부되지 않음 (HTTP ${invalidTokenResponse.status})`,
    },
    {
      attackId: 'anonymous_static_note_read',
      expected: '공개 정적 /data.json에서는 가상 자료를 조회할 수 없어야 함',
      observed: staticEmpty
        ? '공개 정적 /data.json의 notes가 비어 있음'
        : `공개 정적 /data.json에 가상 자료가 남아 있음 (HTTP ${staticResponse.status})`,
    },
  ];
}

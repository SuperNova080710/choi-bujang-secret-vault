// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (![3, 4, 5, 6, 7].includes(config.step)) {
    throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  }

  let app;
  let originalApi;

  try {
    app = new URL(config.publicAppUrl);
    originalApi = new URL(config.originalApiUrl);
  } catch {
    throw new Error('배포 주소와 원본 API 주소를 확인해 주세요.');
  }

  if (
    app.protocol !== 'https:' ||
    app.username ||
    app.password ||
    app.search ||
    app.hash ||
    app.pathname !== '/' ||
    app.hostname.endsWith('.example')
  ) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }

  if (
    config.step >= 5 &&
    (
      originalApi.protocol !== 'https:' ||
      originalApi.username ||
      originalApi.password ||
      originalApi.search ||
      originalApi.hash ||
      !originalApi.pathname.endsWith('/rest/v1/virtual_notes')
    )
  ) {
    throw new Error(
      'aleph.config.json의 originalApiUrl이 virtual_notes REST 경로인지 확인해 주세요.',
    );
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

  // 비로그인 목록 조회
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

  // 잘못된 Bearer 토큰으로 목록 조회
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

  // 존재하지 않는 ID를 이용한 비로그인 상세 조회
  const noteId = crypto.randomUUID();
  const noteUrl = new URL(`/api/notes/${noteId}`, app);

  const anonymousDetailResponse = await fetch(noteUrl, {
    redirect: 'error',
    signal: timeout(),
  });

  const anonymousDetailRejected = await isJsonError(anonymousDetailResponse);

  results.push({
    attackId: 'anonymous_api_note_detail',
    expected: '비로그인 요청으로 개별 메모를 조회할 수 없어야 함',
    observed: anonymousDetailRejected
      ? `비로그인 상세 조회가 인증 오류 JSON으로 거부됨 (HTTP ${anonymousDetailResponse.status})`
      : `비로그인 상세 조회가 예상대로 거부되지 않음 (HTTP ${anonymousDetailResponse.status})`,
  });

  // 비로그인 수정 요청
  const anonymousUpdateResponse = await fetch(noteUrl, {
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

  const anonymousUpdateRejected = await isJsonError(anonymousUpdateResponse);

  results.push({
    attackId: 'anonymous_api_note_update',
    expected: '비로그인 요청으로 메모를 수정할 수 없어야 함',
    observed: anonymousUpdateRejected
      ? `비로그인 수정 요청이 인증 오류 JSON으로 거부됨 (HTTP ${anonymousUpdateResponse.status})`
      : `비로그인 수정 요청이 예상대로 거부되지 않음 (HTTP ${anonymousUpdateResponse.status})`,
  });

  // 비로그인 삭제 요청
  const anonymousDeleteResponse = await fetch(noteUrl, {
    method: 'DELETE',
    redirect: 'error',
    signal: timeout(),
  });

  const anonymousDeleteRejected = await isJsonError(anonymousDeleteResponse);

  results.push({
    attackId: 'anonymous_api_note_delete',
    expected: '비로그인 요청으로 메모를 삭제할 수 없어야 함',
    observed: anonymousDeleteRejected
      ? `비로그인 삭제 요청이 인증 오류 JSON으로 거부됨 (HTTP ${anonymousDeleteResponse.status})`
      : `비로그인 삭제 요청이 예상대로 거부되지 않음 (HTTP ${anonymousDeleteResponse.status})`,
  });

  // 공개 정적 자료에 메모가 남아 있는지 확인
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

    if (config.step >= 5) {
    const pageResponse = await fetch(new URL('/', app), {
      redirect: 'error',
      signal: timeout(),
    });

    if (!pageResponse.ok) {
      await pageResponse.body?.cancel();
      throw new Error(
        `공개 페이지 확인 실패: HTTP ${pageResponse.status}`,
      );
    }

    const html = await pageResponse.text();

    const keyAssignmentPresent =
      /\bSUPABASE_PUBLISHABLE_KEY\s*=\s*['"][^'"]+['"]/.test(html);

    const urlAssignmentPresent =
      /\bSUPABASE_URL\s*=\s*['"][^'"]+['"]/.test(html);

    if (keyAssignmentPresent || urlAssignmentPresent) {
      throw new Error(
        '공개 HTML에서 Supabase 키 또는 URL 설정이 발견되었습니다.',
      );
    }

    results.push({
      attackId: 'public_html_no_supabase_key',
      expected: '공개 HTML에 Supabase Publishable Key 할당이 없어야 함',
      observed: '공개 HTML에서 SUPABASE_PUBLISHABLE_KEY 할당을 찾지 못함',
    });

    results.push({
      attackId: 'public_html_no_supabase_url',
      expected: '공개 HTML에 Supabase 프로젝트 URL 설정이 없어야 함',
      observed: '공개 HTML에서 SUPABASE_URL 할당을 찾지 못함',
    });

    // 원본 REST API와 학생 인증 발급자가 같은 프로젝트인지 검증
    let studentIssuer;

    try {
      studentIssuer = new URL(config.identityProvider.issuer);
    } catch {
      throw new Error('identityProvider.issuer URL을 확인해 주세요.');
    }

    if (
      studentIssuer.protocol !== 'https:' ||
      studentIssuer.username ||
      studentIssuer.password ||
      studentIssuer.search ||
      studentIssuer.hash ||
      studentIssuer.pathname.replace(/\/+$/u, '') !== '/auth/v1' ||
      originalApi.origin !== studentIssuer.origin ||
      originalApi.pathname !== '/rest/v1/virtual_notes'
    ) {
      throw new Error(
        'originalApiUrl과 identityProvider.issuer의 Supabase 프로젝트가 일치하지 않습니다.',
      );
    }

    const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (typeof publicKey !== 'string' || !publicKey.trim()) {
      throw new Error(
        '직접 REST 검사 미완료: SUPABASE_PUBLISHABLE_KEY 환경변수가 필요합니다.',
      );
    }

    const restUrl = new URL(originalApi.pathname, originalApi.origin);
    restUrl.searchParams.set('select', 'id');
    restUrl.searchParams.set('limit', '1');

    const directResponse = await fetch(restUrl, {
      headers: {
        apikey: publicKey,
        Authorization: `Bearer ${publicKey}`,
      },
      redirect: 'error',
      signal: timeout(),
    });

    const directApiStatus = directResponse.status;
    await directResponse.body?.cancel();

    if (directApiStatus !== 401 && directApiStatus !== 403) {
      throw new Error(
        `공개 키의 원본 REST 직접 조회 차단을 확인하지 못했습니다 (HTTP ${directApiStatus}).`,
      );
    }

    results.push({
      attackId: 'public_key_direct_rest_read',
      expected: '공개 Publishable Key로 원본 virtual_notes REST API의 직접 조회가 거부되어야 함',
      observed: `원본 REST 직접 조회가 거부됨 (HTTP ${directApiStatus})`,
    });
  }

  // 6단계: 등록된 기기만 허용되는지 판정기 자체를 검사
  if (config.step >= 6) {
    const { decide } = await import('./decider.mjs');

    const registeredRequest = {
      schema: 'aleph.decision.v1',
      requestId: crypto.randomUUID(),
      deviceRegistered: true,
    };

    const registeredDecision = await decide(registeredRequest);

    const registeredAllowed =
      registeredDecision?.schema === 'aleph.decision.v1' &&
      registeredDecision.requestId === registeredRequest.requestId &&
      registeredDecision.decision === 'allow' &&
      registeredDecision.reasonCode === 'approved' &&
      Array.isArray(registeredDecision.ruleIds) &&
      registeredDecision.ruleIds.includes('device_registered');

    results.push({
      attackId: 'registered_device_allowed',
      expected: '등록된 기기의 요청은 allow로 판정되어야 함',
      observed: registeredAllowed
        ? '등록된 기기의 요청이 allow로 판정됨'
        : '등록된 기기의 요청이 예상한 형식과 결과로 판정되지 않음',
    });

    const unregisteredRequest = {
      ...registeredRequest,
      requestId: crypto.randomUUID(),
      deviceRegistered: false,
    };

    const unregisteredDecision = await decide(unregisteredRequest);

    const unregisteredDenied =
      unregisteredDecision?.schema === 'aleph.decision.v1' &&
      unregisteredDecision.requestId === unregisteredRequest.requestId &&
      unregisteredDecision.decision === 'deny' &&
      unregisteredDecision.reasonCode === 'device_not_registered' &&
      Array.isArray(unregisteredDecision.ruleIds) &&
      unregisteredDecision.ruleIds.includes('device_registered');

    results.push({
      attackId: 'unregistered_device_denied',
      expected: '미등록 기기의 요청은 device_not_registered 사유로 거부되어야 함',
      observed: unregisteredDenied
        ? '미등록 기기의 요청이 device_not_registered 사유로 거부됨'
        : '미등록 기기의 요청이 예상한 거부 결과로 판정되지 않음',
    });
  }

  // 7단계: 복합 이상 접속과 재인증 값만으로 우회하는 시도를 가상 점검
  if (config.step >= 7) {
    const { decide } = await import('./decider.mjs');

    const suspiciousRequest = {
      schema: 'aleph.decision.v1',
      requestId: crypto.randomUUID(),
      deviceRegistered: true,
      stepUp: { verified: false, authAgeSeconds: null },
      recentEvents: [
        { kind: 'risk_signal', ageSeconds: 60, count: 20 },
      ],
      signals: {
        source: 'judge_fixture',
        region: 'foreign',
        network: 'unusual',
        hour: 3,
      },
    };

    const suspiciousDecision = await decide(suspiciousRequest);

    const suspiciousRequiresStepUp =
      suspiciousDecision?.schema === 'aleph.decision.v1' &&
      suspiciousDecision.requestId === suspiciousRequest.requestId &&
      suspiciousDecision.decision === 'step_up' &&
      suspiciousDecision.reasonCode === 'step_up_required' &&
      Array.isArray(suspiciousDecision.ruleIds) &&
      suspiciousDecision.ruleIds.includes('step_up_required');

    results.push({
      attackId: 'composite_risk_requires_step_up',
      expected: '이상 시간·낯선 네트워크·최근 대량 조회가 함께 발생하면 step_up이어야 함',
      observed: suspiciousRequiresStepUp
        ? '복합 이상 가상 요청이 step_up으로 판정됨'
        : '복합 이상 가상 요청이 예상한 추가 확인 결과로 판정되지 않음',
    });

    const claimedReverifiedRequest = {
      ...suspiciousRequest,
      requestId: crypto.randomUUID(),
      stepUp: { verified: true, authAgeSeconds: 60 },
    };

    const claimedReverifiedDecision = await decide(claimedReverifiedRequest);

    const stillRequiresStepUp =
      claimedReverifiedDecision?.schema === 'aleph.decision.v1' &&
      claimedReverifiedDecision.requestId === claimedReverifiedRequest.requestId &&
      claimedReverifiedDecision.decision === 'step_up' &&
      claimedReverifiedDecision.reasonCode === 'step_up_required';

    results.push({
      attackId: 'step_up_claim_does_not_bypass',
      expected: '실제 재인증 검증 계약이 없으므로 verified 값만으로 복합 이상 요청을 허용하지 않아야 함',
      observed: stillRequiresStepUp
        ? 'verified 값만 전달한 요청도 step_up으로 유지됨'
        : 'verified 값만 전달한 요청의 판정이 예상과 다름',
    });
  }

  return results;
}

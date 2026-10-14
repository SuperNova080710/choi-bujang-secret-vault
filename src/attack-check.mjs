import { randomUUID } from 'node:crypto';

// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (![3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(config.step)) {
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

  const timeout = () =>
    AbortSignal.timeout(10000);

  const apiUrl =
    new URL('/api/notes', app);

  const evidenceFetch = (
    attackId,
    input,
    init = {},
  ) => fetch(
    input,
    {
      ...init,
      alephEvidence: {
        caseId: attackId,
        requestKey: randomUUID(),
      },
    },
  );

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
  const anonymousResponse =
    await evidenceFetch(
      'anonymous_api_note_read',
      apiUrl,
      {
        redirect: 'error',
        signal: timeout(),
      },
    );

  const anonymousRejected = await isJsonError(anonymousResponse);

  results.push({
    attackId: 'anonymous_api_note_read',
    expected: '비로그인 요청으로 /api/notes에서 가상 자료를 조회할 수 없어야 함',
    observed: anonymousRejected
      ? `비로그인 목록 조회가 인증 오류 JSON으로 거부됨 (HTTP ${anonymousResponse.status})`
      : `비로그인 목록 조회가 예상대로 거부되지 않음 (HTTP ${anonymousResponse.status})`,
  });

  // 잘못된 Bearer 토큰으로 목록 조회
  const invalidTokenResponse =
    await evidenceFetch(
      'invalid_token_api_note_read',
      apiUrl,
      {
        headers: {
          Authorization:
            'Bearer invalid-stage4-token',
        },
        redirect: 'error',
        signal: timeout(),
      },
    );

  const invalidTokenRejected = await isJsonError(invalidTokenResponse);

  results.push({
    attackId: 'invalid_token_api_note_read',
    expected: '유효하지 않은 로그인 토큰으로 메모를 조회할 수 없어야 함',
    observed: invalidTokenRejected
      ? `유효하지 않은 토큰이 인증 오류 JSON으로 거부됨 (HTTP ${invalidTokenResponse.status})`
      : `유효하지 않은 토큰이 예상대로 거부되지 않음 (HTTP ${invalidTokenResponse.status})`,
  });

  // 존재하지 않는 ID를 이용한 비로그인 상세 조회
  const noteId = randomUUID();
  const noteUrl = new URL(`/api/notes/${noteId}`, app);

  const anonymousDetailResponse =
    await evidenceFetch(
      'anonymous_api_note_detail',
      noteUrl,
      {
        redirect: 'error',
        signal: timeout(),
      },
    );

  const anonymousDetailRejected = await isJsonError(anonymousDetailResponse);

  results.push({
    attackId: 'anonymous_api_note_detail',
    expected: '비로그인 요청으로 개별 메모를 조회할 수 없어야 함',
    observed: anonymousDetailRejected
      ? `비로그인 상세 조회가 인증 오류 JSON으로 거부됨 (HTTP ${anonymousDetailResponse.status})`
      : `비로그인 상세 조회가 예상대로 거부되지 않음 (HTTP ${anonymousDetailResponse.status})`,
  });

  // 비로그인 수정 요청
  results.push({
    attackId:
      'anonymous_api_note_update',
    expected:
      '비로그인 요청으로 메모를 수정할 수 없어야 함',
    observed:
      '미실행: 심판 제출 점검 환경에서는 쓰기 요청을 보내지 않음',
  });

  // 비로그인 삭제 요청
  results.push({
    attackId:
      'anonymous_api_note_delete',
    expected:
      '비로그인 요청으로 메모를 삭제할 수 없어야 함',
    observed:
      '미실행: 심판 제출 점검 환경에서는 쓰기 요청을 보내지 않음',
  });

  // 공개 정적 자료에 메모가 남아 있는지 확인
  const staticResponse =
    await evidenceFetch(
      'anonymous_static_note_read',
      new URL('/data.json', app),
      {
        redirect: 'error',
        signal: timeout(),
      },
    );

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
    const keyPageResponse =
      await evidenceFetch(
        'public_html_no_supabase_key',
        new URL('/', app),
        {
          redirect: 'error',
          signal: timeout(),
        },
      );

    if (!keyPageResponse.ok) {
      await keyPageResponse.body?.cancel();

      throw new Error(
        `공개 페이지 확인 실패: HTTP ${keyPageResponse.status}`,
      );
    }

    const keyHtml =
      await keyPageResponse.text();

    const keyAssignmentPresent =
      /\bSUPABASE_PUBLISHABLE_KEY\s*=\s*['"][^'"]+['"]/
        .test(keyHtml);

    results.push({
      attackId:
        'public_html_no_supabase_key',
      expected:
        '공개 HTML에 Supabase Publishable Key 할당이 없어야 함',
      observed:
        keyAssignmentPresent
          ? `HTTP ${keyPageResponse.status} · 공개 키 할당 발견`
          : `HTTP ${keyPageResponse.status}`,
    });

    const urlPageResponse =
      await evidenceFetch(
        'public_html_no_supabase_url',
        new URL('/', app),
        {
          redirect: 'error',
          signal: timeout(),
        },
      );

    if (!urlPageResponse.ok) {
      await urlPageResponse.body?.cancel();

      throw new Error(
        `공개 페이지 확인 실패: HTTP ${urlPageResponse.status}`,
      );
    }

    const urlHtml =
      await urlPageResponse.text();

    const urlAssignmentPresent =
      /\bSUPABASE_URL\s*=\s*['"][^'"]+['"]/
        .test(urlHtml);

    results.push({
      attackId:
        'public_html_no_supabase_url',
      expected:
        '공개 HTML에 Supabase 프로젝트 URL 설정이 없어야 함',
      observed:
        urlAssignmentPresent
          ? `HTTP ${urlPageResponse.status} · 프로젝트 URL 할당 발견`
          : `HTTP ${urlPageResponse.status}`,
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

    const directResponse =
      await evidenceFetch(
        'public_key_direct_rest_read',
        restUrl,
        {
          headers: {
            apikey: publicKey,
            Authorization:
              `Bearer ${publicKey}`,
          },
          redirect: 'error',
          signal: timeout(),
        },
      );

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

  const decisionFixture = {
    schema: 'aleph.decision.v1',
    requestId: randomUUID(),
    classId: 'class_fixture',
    projectId: 'project_fixture',
    subjectId: 'learner_fixture',
    deviceId: 'aaaaaaaaaaaaaaaa',
    service: 'notes',
    method: 'GET',
    path: '/notes/demo',
    route: 'GET /notes/:id',
    queryLength: 0,
    querySha256:
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    at: new Date().toISOString(),
    policyRevision: 1,
    deviceRegistered: true,
    stepUp: {
      verified: false,
      authAgeSeconds: null,
    },
    recentEvents: [],
    signals: {
      source: 'judge_fixture',
      region: 'local',
      network: 'usual',
      hour: 14,
    },
  };

  // 6단계: 등록된 기기만 허용되는지 판정기 자체를 검사
  if (config.step >= 6) {
    const { decide } = await import('./decider.mjs');

    const registeredRequest = {
      ...decisionFixture,
      requestId: randomUUID(),
    };

    const registeredDecision = await decide(registeredRequest);

    const registeredAllowed =
      registeredDecision?.schema === 'aleph.decision.v1'
      && registeredDecision.requestId === registeredRequest.requestId
      && registeredDecision.decision === 'allow'
      && registeredDecision.reasonCode === 'approved'
      && Array.isArray(registeredDecision.ruleIds)
      && (
        config.step >= 8
          ? registeredDecision.ruleIds.includes('resource_zone')
          : registeredDecision.ruleIds.includes('device_registered')
      );

    results.push({
      attackId: 'registered_device_allowed',
      expected: '등록된 기기의 요청은 allow로 판정되어야 함',
      observed: registeredAllowed
        ? '등록된 기기의 요청이 allow로 판정됨'
        : '등록된 기기의 요청이 예상한 형식과 결과로 판정되지 않음',
    });

    const unregisteredRequest = {
      ...registeredRequest,
      requestId: randomUUID(),
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
      ...decisionFixture,
      requestId: randomUUID(),
      stepUp: {
        verified: false,
        authAgeSeconds: null,
      },
      recentEvents: [
        {
          kind: 'risk_signal',
          ageSeconds: 60,
          count: 20,
        },
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
      requestId: randomUUID(),
      stepUp: { verified: true, authAgeSeconds: 60 },
    };

    const reverifiedDecision = await decide(claimedReverifiedRequest);

    const allowedAfterStepUp =
      reverifiedDecision?.schema === 'aleph.decision.v1' &&
      reverifiedDecision.requestId === claimedReverifiedRequest.requestId &&
      reverifiedDecision.decision === 'allow' &&
      reverifiedDecision.reasonCode === 'approved';

    results.push({
      attackId: 'step_up_verified_allows_retry',
      expected: '유효한 추가 확인 뒤 복합 이상 요청을 다시 판정하면 allow여야 함',
      observed: allowedAfterStepUp
        ? '유효한 추가 확인 뒤 요청이 allow로 판정됨'
        : '추가 확인 뒤 요청이 예상한 allow 결과로 판정되지 않음',
    });
  }

  // 8단계: 사용자·기기·메서드·정확한 자원 경로의 구역 판정 검사
  if (config.step >= 8) {
    const { decide } = await import('./decider.mjs');

    const ownNoteRequest = {
      ...decisionFixture,
      requestId: randomUUID(),
    };

    const ownNoteDecision = await decide(ownNoteRequest);
    const ownResourcesAllowed =
      ownNoteDecision?.decision === 'allow'
      && ownNoteDecision.reasonCode === 'approved'
      && Array.isArray(ownNoteDecision.ruleIds)
      && ownNoteDecision.ruleIds.includes('resource_zone');

    results.push({
      attackId: 'own_resource_allowed',
      expected: '본인 메모 단건은 resource_zone 규칙으로 허용되어야 함',
      observed: ownResourcesAllowed
        ? '본인 메모 단건이 allow로 판정됨'
        : '본인 메모 단건이 예상대로 allow로 판정되지 않음',
    });

    const listRouteRequest = {
      ...decisionFixture,
      requestId: randomUUID(),
      path: '/notes',
      route: 'GET /notes',
    };

    const listRouteDecision = await decide(listRouteRequest);

    const listRouteDenied =
      listRouteDecision?.decision === 'deny'
      && listRouteDecision.reasonCode === 'policy_denied'
      && Array.isArray(listRouteDecision.ruleIds)
      && listRouteDecision.ruleIds.includes('resource_zone');

    results.push({
      attackId: 'note_list_route_denied',
      expected: '판정기에서 메모 전체 목록 구역은 허용되지 않아야 함',
      observed: listRouteDenied
        ? '메모 전체 목록 경로가 policy_denied로 거부됨'
        : '메모 전체 목록 경로가 예상대로 거부되지 않음',
    });

    const functionPathRequest = {
      ...decisionFixture,
      requestId: randomUUID(),
      path: '/notes/export',
      route: 'GET /notes/:id',
    };

    const functionPathDecision = await decide(functionPathRequest);

    const functionPathDenied =
      functionPathDecision?.decision === 'deny'
      && functionPathDecision.reasonCode === 'policy_denied'
      && Array.isArray(functionPathDecision.ruleIds)
      && functionPathDecision.ruleIds.includes('resource_zone');

    results.push({
      attackId: 'unknown_resource_path_denied',
      expected: ':id 위치에 export 같은 기능 이름을 넣은 알 수 없는 자원 경로는 거부되어야 함',
      observed: functionPathDenied
        ? '기능 이름을 자원 ID로 사용한 경로가 policy_denied로 거부됨'
        : '알 수 없는 기능 경로가 예상대로 거부되지 않음',
    });

    const studentAnnouncementRequest = {
      ...decisionFixture,
      requestId: randomUUID(),
      service: 'announcements',
      method: 'PUT',
      path: '/announcements/demo',
      route: 'PUT /announcements/:id',
    };

    const studentAnnouncementDecision =
      await decide(studentAnnouncementRequest);

    const studentAnnouncementDenied =
      studentAnnouncementDecision?.decision === 'deny'
      && studentAnnouncementDecision.reasonCode === 'policy_denied'
      && Array.isArray(studentAnnouncementDecision.ruleIds)
      && studentAnnouncementDecision.ruleIds.includes('resource_zone');

    results.push({
      attackId: 'student_announcement_update_denied',
      expected: '강사 권한 연결이 없는 일반 학생의 공지 수정 요청은 거부되어야 함',
      observed: studentAnnouncementDenied
        ? '일반 학생의 공지 수정 요청이 policy_denied로 거부됨'
        : '일반 학생의 공지 수정 요청이 예상대로 거부되지 않음',
    });
  }

  // 9단계: 가명 사용자별 다량 GET 조회 탐지와 회수 제안 자기점검
  if (config.step >= 9) {
    const { detect } = await import('./detect.mjs');

    const start = Date.UTC(2026, 9, 1, 0, 0, 0);

    const detectionReads = (count, subject = 'learner_fixture') =>
      Array.from({ length: count }, (_, index) => ({
        at: new Date(start + index * 2 * 1000).toISOString(),
        method: 'GET',
        identity: { sub: subject },
      }));

    const normalDetection = detect(detectionReads(30));
    const normalObserved =
      normalDetection?.action === 'observe'
      && Object.keys(normalDetection).length === 1;

    results.push({
      attackId: 'normal_read_observed',
      expected: '정상적인 가상 조회는 회수 제안 없이 observe로 유지되어야 함',
      observed: normalObserved
        ? '정상 조회 30건이 observe로 유지됨'
        : '정상 조회가 예상한 observe 결과로 유지되지 않음',
    });

    const boundaryDetection = detect(detectionReads(120));
    const boundaryObserved =
      boundaryDetection?.action === 'observe'
      && Object.keys(boundaryDetection).length === 1;

    results.push({
      attackId: 'burst_read_boundary_observed',
      expected: '10분 안의 GET 조회가 정확히 120건이면 회수 제안 대상이 아니어야 함',
      observed: boundaryObserved
        ? '정확히 120건의 조회가 observe로 유지됨'
        : '정확히 120건의 조회가 예상과 다르게 회수 제안됨',
    });

    const burstDetection = detect(detectionReads(121));
    const burstProposed =
      burstDetection?.action === 'propose_revocation'
      && burstDetection.reasonCode === 'burst_read'
      && burstDetection.subject === 'learner_fixture'
      && Object.keys(burstDetection).sort().join(',')
      === 'action,reasonCode,subject';

    results.push({
      attackId: 'burst_read_revocation_proposed',
      expected: '같은 가명 사용자의 10분 안 GET 조회가 120건을 넘으면 burst_read 회수 제안을 내야 함',
      observed: burstProposed
        ? '121건의 폭주 조회에 burst_read 회수 제안이 생성됨'
        : '121건의 폭주 조회가 예상한 회수 제안 결과를 만들지 못함',
    });
  }

  return results;
}

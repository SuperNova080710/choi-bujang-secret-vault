import { randomUUID } from 'node:crypto';

// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(
  config,
  options = {},
) {
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

  const evidenceRecords =
    options.evidenceRecords
      instanceof Map
      ? options.evidenceRecords
      : null;
  const evidenceFetch =
    (
      attackId,
      input,
      init = {},
    ) => {
      const requestId =
        randomUUID();

      const checkedAt =
        new Date().toISOString();

      if (evidenceRecords) {
        evidenceRecords.set(
          attackId,
          {
            requestId,
            checkedAt,
          },
        );
      }

      return fetch(
        input,
        {
          ...init,
          method: 'GET',

          alephEvidence: {
            caseId:
              attackId,

            requestKey:
              requestId,
          },
        },
      );
    };

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

  results.push({
    attackId: 'anonymous_api_note_read',
    expected: '비로그인 요청으로 /api/notes에서 가상 자료를 조회할 수 없어야 함',
    observed:
      `HTTP ${anonymousResponse.status}`,
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

  results.push({
    attackId: 'invalid_token_api_note_read',
    expected: '유효하지 않은 로그인 토큰으로 메모를 조회할 수 없어야 함',
    observed:
      `HTTP ${invalidTokenResponse.status}`,
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

  results.push({
    attackId: 'anonymous_api_note_detail',
    expected: '비로그인 요청으로 개별 메모를 조회할 수 없어야 함',
    observed:
      `HTTP ${anonymousDetailResponse.status}`,
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

  let staticLength =
    null;

  if (staticResponse.ok) {
    try {
      const data =
        await staticResponse.json();

      if (
        Array.isArray(
          data.notes,
        )
      ) {
        staticLength =
          data.notes.length;
      }
    } catch {
      staticLength =
        null;
    }
  }

  const staticEmpty =
    staticLength === 0;

  if (evidenceRecords) {
    const staticEvidence =
      evidenceRecords.get(
        'anonymous_static_note_read',
      );

    if (staticEvidence) {
      evidenceRecords.set(
        'anonymous_static_note_read',
        {
          ...staticEvidence,
          staticNotesEmpty:
            staticEmpty,
        },
      );
    }
  }

  results.push({
    attackId: 'anonymous_static_note_read',
    expected: '공개 정적 /data.json에서는 가상 자료를 조회할 수 없어야 함',
    observed:
      `HTTP ${staticResponse.status}`,
  });

  if (config.step >= 5) {
    const keyPageResponse =
      await evidenceFetch(
        'public_root_available',
        new URL('/', app),
        {
          redirect: 'error',
          signal: timeout(),
        },
      );

    if (!keyPageResponse.ok) {

      throw new Error(
        `공개 페이지 확인 실패: HTTP ${keyPageResponse.status}`,
      );
    }

    const keyHtml =
      await keyPageResponse.text();

    const keyAssignmentPresent =
      /\bSUPABASE_PUBLISHABLE_KEY\s*=\s*['"][^'"]+['"]/
        .test(keyHtml);

    const urlAssignmentPresent =
      /\bSUPABASE_URL\s*=\s*['"][^'"]+['"]/
        .test(keyHtml);

    if (
      keyAssignmentPresent
      || urlAssignmentPresent
    ) {
      throw new Error(
        '공개 HTML에서 Supabase 키 또는 URL 설정이 발견되었습니다.',
      );
    }

    results.push({
      attackId:
        'public_root_available',
      expected:
        '공개 루트가 HTTP 200으로 열리고 HTML에 Supabase 키 또는 프로젝트 URL 할당이 없어야 함',
      observed:
        `HTTP ${keyPageResponse.status}`,
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

    /*
 * Publishable Key는 로컬 환경변수에서 읽지 않습니다.
 *
 * 배포된 앱의 공개 설정 GET에서 받아
 * 심판의 격리 환경에서도 동일하게 재현되도록 합니다.
 */
    const publicConfigResponse =
      await fetch(
        new URL(
          '/api/device/status?view=public-config',
          app,
        ),
        {
          method:
            'GET',

          headers: {
            accept:
              'application/json',
          },

          redirect:
            'error',

          signal:
            timeout(),
        },
      );

    if (!publicConfigResponse.ok) {

      throw new Error(
        `공개 설정 조회 실패: HTTP ${publicConfigResponse.status}`,
      );
    }

    let publicConfig;

    try {
      publicConfig =
        await publicConfigResponse.json();
    } catch {
      throw new Error(
        '공개 설정 응답이 JSON이 아닙니다.',
      );
    }

    const publicKey =
      publicConfig?.publishableKey;

    if (
      typeof publicKey
      !== 'string'
      || !publicKey.trim()
      || publicKey.startsWith(
        'sb_secret_',
      )
    ) {
      throw new Error(
        '공개 설정에서 유효한 Publishable Key를 확인하지 못했습니다.',
      );
    }

    const restUrl = new URL(
      `${originalApi.pathname}?select=id&limit=1`,
      originalApi.origin,
    );

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

    if (directApiStatus !== 401 && directApiStatus !== 403) {
      throw new Error(
        `공개 키의 원본 REST 직접 조회 차단을 확인하지 못했습니다 (HTTP ${directApiStatus}).`,
      );
    }

    results.push({
      attackId: 'public_key_direct_rest_read',
      expected: '공개 Publishable Key로 원본 virtual_notes REST API의 직접 조회가 거부되어야 함',
      observed:
        `HTTP ${directApiStatus}`,
    });
  }

  /*
 * 6~9단계 판정기·탐지 규칙은
 * 배포된 서버의 고정 가상 점검 GET을 실제로 호출합니다.
 *
 * HTTP 요청은 항상 GET이며,
 * 내부 가상 판정 입력의 method와는 별개입니다.
 *
 * 각 요청은 evidenceFetch를 통해
 * attackId와 요청 ID를 alephEvidence로 연결합니다.
 */
  const virtualRuleChecks = [
    {
      minStep: 6,
      attackId:
        'registered_device_allowed',
      expected:
        '등록된 기기의 요청은 allow로 판정되어야 함',
    },
    {
      minStep: 6,
      attackId:
        'unregistered_device_denied',
      expected:
        '미등록 기기의 요청은 device_not_registered 사유로 거부되어야 함',
    },
    {
      minStep: 7,
      attackId:
        'composite_risk_requires_step_up',
      expected:
        '이상 시간·낯선 네트워크·최근 대량 조회가 함께 발생하면 step_up이어야 함',
    },
    {
      minStep: 7,
      attackId:
        'step_up_verified_allows_retry',
      expected:
        '유효한 추가 확인 뒤 복합 이상 요청을 다시 판정하면 allow여야 함',
    },
    {
      minStep: 8,
      attackId:
        'note_list_route_denied',
      expected:
        '판정기에서 메모 전체 목록 구역은 허용되지 않아야 함',
    },
    {
      minStep: 8,
      attackId:
        'unknown_resource_path_denied',
      expected:
        ':id 위치에 export 같은 기능 이름을 넣은 알 수 없는 자원 경로는 거부되어야 함',
    },
    {
      minStep: 8,
      attackId:
        'student_announcement_update_denied',
      expected:
        '강사 권한 연결이 없는 일반 학생의 공지 수정 요청은 거부되어야 함',
    },
    {
      minStep: 9,
      attackId:
        'burst_read_revocation_proposed',
      expected:
        '같은 가명 사용자의 10분 안 GET 조회가 120건을 넘으면 burst_read 회수 제안을 내야 함',
    },
  ];

  for (
    const check
    of virtualRuleChecks
  ) {
    if (
      config.step
      < check.minStep
    ) {
      continue;
    }

    const checkUrl =
      new URL(
        `/api/device/status?view=rule-check&case=${encodeURIComponent(
          check.attackId,
        )}`,
        app,
      );

    const response =
      await evidenceFetch(
        check.attackId,
        checkUrl,
        {
          redirect:
            'error',

          signal:
            timeout(),
        },
      );

    let data =
      null;

    if (response.ok) {
      try {
        data =
          await response.json();
      } catch {
        data =
          null;
      }
    } else {
    }

    const ready =
      response.status === 200
      && data?.case
      === check.attackId
      && data?.virtual === true
      && data?.ready === true;

    results.push({
      attackId:
        check.attackId,

      expected:
        check.expected,

      observed:
        response.status === 200
          ? (
            `HTTP 200; jsonReady=${ready
              ? 'true'
              : 'false'
            }`
          )
          : `HTTP ${response.status}`,
    });
  }

  /*
 * 10단계:
 * 실제 복원은 POST와 로그인 상태가 필요하므로 실행하지 않습니다.
 * 대신 같은 복원 경로에 GET을 보내
 * 쓰기 동작이 일어나지 않고 Method Not Allowed로 끝나는지 확인합니다.
 */
  const restoreResponse =
    await evidenceFetch(
      'restore_without_login',
      new URL(
        `/api/restore/${noteId}`,
        app,
      ),
      {
        redirect:
          'error',

        signal:
          timeout(),
      },
    );

  results.push({
    attackId:
      'restore_without_login',

    expected:
      '로그인 없는 GET 복구 경로가 복원을 수행하지 않고 거부되어야 함',

    observed:
      `HTTP ${restoreResponse.status}`,
  });

  const deviceStatusResponse =
    await evidenceFetch(
      'device_status_without_login',
      new URL(
        '/api/device/status',
        app,
      ),
      {
        redirect:
          'error',

        signal:
          timeout(),
      },
    );

  results.push({
    attackId:
      'device_status_without_login',

    expected:
      '로그인과 유효한 기기 상태가 없는 요청은 보호된 기기 상태를 확인할 수 없어야 함',

    observed:
      `HTTP ${deviceStatusResponse.status}`,
  });

  const forgedDeviceResponse =
    await evidenceFetch(
      'device_status_forged_signal',
      new URL(
        '/api/device/status',
        app,
      ),
      {
        headers: {
          'X-Aleph-Device-Timestamp':
            new Date().toISOString(),

          'X-Aleph-Device-Nonce':
            '00000000-0000-4000-8000-000000000000',

          'X-Aleph-Device-Signature':
            'invalid',
        },

        redirect:
          'error',

        signal:
          timeout(),
      },
    );

  results.push({
    attackId:
      'device_status_forged_signal',

    expected:
      '위조한 기기 서명 정보만으로 보호된 기기 상태를 확인할 수 없어야 함',

    observed:
      `HTTP ${forgedDeviceResponse.status}`,
  });

  const operationsResponse =
    await evidenceFetch(
      'operations_record_api',
      new URL(
        '/api/device/status?view=operations-record',
        app,
      ),
      {
        redirect:
          'error',

        signal:
          timeout(),
      },
    );

  results.push({
    attackId:
      'operations_record_api',

    expected:
      '작전실 점검 기록 API가 GET 요청에 응답해야 함',

    observed:
      `HTTP ${operationsResponse.status}`,
  });

  return results;
}

> **2026-10-28 최종 기준:** 이 문서는 단계별 이력을 보존합니다. 최신 과제 조건·실제 확인 결과·제출 위치는 [최종 제출·완성 기록](final-week/FINAL_SUBMISSION.md)을 우선합니다.

# 최부장님 프로젝트: 0~22단계 작업 이력

처음 보는 사람이 **무엇을 보호하려고 했고, 단계마다 무엇을 만들었으며, 어디까지 확인했는지** 이해하기 위한 기록입니다. 단계 제목은 작업 내용을 요약한 표현입니다. 공식 안내의 제목을 모두 복원한 목록은 아닙니다.

## 현재 상태와 이 문서를 읽는 방법

- **과제 진행:** 사용자가 22단계까지 전부 통과했다고 보고했습니다. 개별 단계의 최종 점수·접수 시각이 없는 경우 이를 추정하지 않습니다.
- **저장소 기준:** 최종 인수인계 PR [#121](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/121)이 main에 병합된 `4cb4610e91d9c1d4cc13f9e3e505800b3b7c1799`를 대조했습니다. 이 문서 추가 전의 기준입니다.
- **최종 재현 기준:** PR #121의 제출 후보 `b58f29cabbef9d9247c0dc2e93dae2e9e47a7ac3`에 대한 별도 폴더 재현은 [#120](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/120)에 있습니다. 위 main 병합 커밋과 Git tree가 같음을 확인했습니다. 이번 정리는 문서 변경이며 운영 기능을 새로 실행한 기록이 아닙니다.
- **0단계:** 사용자에게 확인했으며 기록이 없습니다. 준비 작업이나 통과 근거를 만들어 채우지 않습니다.
- **운영 범위:** 원문 검토 기준의 과제 통과는 실제 운영 인증이나 v1.0 인증이 아닙니다. 사용자는 이번 정리 시점에 실제 AI 성공 및 본인 PC 최종 재현을 추가 확인하지 않았다고 답했습니다.

| 근거 종류 | 이 문서에서 뜻하는 것 | 뜻하지 않는 것 |
|---|---|---|
| 원문·Git·PR | 파일과 변경 이력에서 구현을 확인 | 배포 환경에서 현재 작동한다는 증명 |
| 모의 테스트·demo | 가상 입력이나 예제 응답으로 동작 확인 | 실제 계정·시스템 연결 성공 |
| AI 작업 환경 실행 | 기록된 환경·커밋에서 명령 또는 HTTP 확인 | 학생 PC 브라우저에서 직접 확인 |
| 사용자 보고·기존 README 기록 | 사용자가 전달했거나 당시 문서에 남긴 판정·관찰 | 이번에 같은 동작을 다시 실행함 |
| 미확인 | 실행하지 않았거나 결과 근거가 부족함 | 실패 확정 또는 안전 보장 |

**실행하려면** [학생 실행 설명서](STUDENT_RUNBOOK.md)를, **새 폴더 재현과 백업·복원은** [최종 인수인계 문서](STUDENT_HANDOVER.md)를 먼저 읽습니다. [README](../README.md)의 이전 단계 내용은 당시의 상태를 보존한 기록입니다. 예를 들어 3단계의 소유권 제한은 4단계에서 보완됐으므로 과거 설명을 최종 동작으로 해석하지 않습니다.

## 전체 흐름

저장소에는 두 실행 대상이 있습니다. **1~12단계는 Vercel·Supabase를 사용하는 자료실**을 단계적으로 보호했습니다. **13~22단계는 `on-client`의 로컬 보안 Agent**에서 제공 시스템의 결과를 정확히 보여 주고, 실행·인수인계 문서를 갖추었습니다.

| 단계 | 해결하려던 문제 | 남긴 결과 |
|---|---|---|
| 0 | 확인할 기록 없음 | 미기록 사실을 명시 |
| 1 | 실습을 시작할 자료실 필요 | 제공 시작 틀·GitHub/Vercel 배포 출발점 |
| 2 | 정적 파일에 가상 자료 공개 | DB 저장·서버 API로 이동 |
| 3 | 누구나 자료 API 사용 | 로그인과 서버의 인증 검증 |
| 4 | 로그인만으로 다른 사람 자료 접근 가능 | 소유권 검사·DB 행 단위 권한 |
| 5 | 앱을 우회한 원본 DB 접근 | 서버 경유·직접 REST 접근 제한 |
| 6 | 미등록 기기도 접근 | 기기 등록 여부 판정 |
| 7 | 등록 기기라도 이상 접속 가능 | 복합 신호에 추가 본인 확인 요구 |
| 8 | 자료 종류마다 권한이 다름 | 자료별 경계·서버 재검사 |
| 9 | 반복적인 대량 조회 식별 필요 | 사용자별 조회 폭주 탐지·회수 제안 |
| 10 | 정책·자료가 훼손되면 복구 필요 | 정책 복구·소유권/해시를 확인하는 자료 복구 |
| 11 | 설치·기기 신뢰를 구분할 필요 | PWA·기기 승인·서명 요청 |
| 12 | 보호 상태가 흩어져 있음 | 운영 대시보드와 실제 관측 기록 |
| 13 | 로컬 Agent의 기본 정보가 필요 | 세 메뉴와 사용자·기기·세션 상태 |
| 14 | 접근 판정의 뜻을 구분해야 함 | 허용·거부·추가 확인·판정 불명 표시 |
| 15 | 사건의 원인과 근거를 찾아야 함 | 기록 정렬·필터·상세 근거 |
| 16 | 기기·세션·장애 상태를 파악해야 함 | 보호 현황·제한된 도움정보 복사 |
| 17 | AI 연결과 실제 응답이 혼동됨 | 연결·승인·오류·설명 요청 상태 |
| 18 | AI 요약을 사실처럼 오해할 수 있음 | 현재 사건 근거와 연결된 참고 설명 |
| 19 | 접수 응답을 조치 성공으로 오해 | 준비·전송·접수·효과 관측 분리 |
| 20 | 미조회나 조회 실패를 안전으로 오해 | 정확 버전·OSV 결과·부분 실패 표시 |
| 21 | 다른 사람이 실행하기 어려움 | 실행 설명서·구성도·장애 안내 |
| 22 | 최종 버전의 재현·인수인계 필요 | 같은 커밋 재현·증거·데이터 보존 계획 |

## 0~5단계: 자료실의 기본 접근 보호

### 0단계 — 기록 없음

사용자에게 확인한 결과 이 단계의 안내·작업 기록이 없습니다. 계정 준비, 프로그램 설치 등 일반적인 준비를 실제 0단계 작업으로 단정하지 않습니다. 이후 별도 기록이 확보되면 근거와 함께 보완할 수 있습니다.

### 1단계 — 제공 자료실에서 출발

- **목적:** 보호가 필요한 가상 자료실을 배포하고 실습의 출발점을 마련합니다.
- **내용:** README는 제공 시작 틀을 GitHub 저장소와 Vercel에 배포하는 절차를 설명합니다. 당시 정적 `data.json`에 공개된 가상 메모가 이후 단계의 보호 대상이었습니다.
- **근거와 범위:** [README](../README.md)의 시작 틀·세 걸음 안내. 제공 템플릿을 학생이 처음부터 개발했다고 기록하지 않으며, 독립적인 학생 작성 1단계 변경 커밋은 이 정리에서 특정하지 않았습니다. 당시 공개 상태는 현재 상태를 뜻하지 않습니다.

### 2단계 — 공개 파일에서 DB와 서버로 이동

- **목적:** 정적 파일을 내려받는 것만으로 메모가 노출되는 구조를 바꿉니다.
- **실제 작업:** 가상 자료를 Supabase `virtual_notes`에 저장하고 `/api/notes`로 조회하게 했습니다. 공개 `data.json`의 메모를 비웠으며 배포 식별·자기 점검·응답 헤더도 정리했습니다.
- **결과와 경계:** 저장 위치와 요청 경로를 바꾼 단계입니다. 로그인 보호는 다음 단계에서 추가했습니다.
- **근거:** [stage-2.sql](../supabase/stage-2.sql), [README](../README.md)의 2단계 기록, PR [#1](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/1)~[#4](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/4).

### 3단계 — 로그인과 서버 인증 검증

- **목적:** 인증된 사용자만 자료를 조회·작성·수정·삭제하게 합니다.
- **실제 작업:** Supabase Auth 로그인과 서버의 JWT 검증을 연결했습니다. 제공된 `verify-login.mjs`를 활용하고, 메모 API와 UUID 공개 식별자를 구성했습니다. 인증이 없거나 유효하지 않으면 `401`로 처리합니다.
- **결과와 경계:** 이 단계의 로그인 검사만으로 소유권까지 보호한 것은 아닙니다. 다른 사람 자료를 구분하는 검사는 4단계에서 추가했습니다. 이후 쿠키 인증 보강도 들어갔으므로 당시 토큰 전달 방식과 최종 구현을 구분합니다.
- **근거:** [notes-api.mjs](../src/notes-api.mjs), [verify-login.mjs](../src/verify-login.mjs), [stage-3.sql](../supabase/stage-3.sql), PR [#5](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/5)~[#11](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/11).

### 4단계 — 내 자료만 접근

- **목적:** 로그인한 사용자라도 다른 사람의 자료를 읽거나 바꾸지 못하게 합니다.
- **실제 작업:** 요청 본문의 사용자 ID를 신뢰하지 않고 서버가 확인한 사용자와 `owner_id`를 비교했습니다. DB에는 행 단위 보안(RLS)을 적용해 소유자 조건을 설정했습니다. 소유자가 없는 자료도 임의 공개하지 않습니다.
- **당시 관찰:** README에 A/B 사용자별 본인 접근과 타인 접근 거부, Preview 환경 설정 오류 및 수정 기록이 있습니다. 현재 시점에 원격 DB를 재검증한 결과는 아닙니다.
- **근거:** [notes-api.mjs](../src/notes-api.mjs), [README](../README.md)의 4단계 기록, PR [#12](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/12).

### 5단계 — 원본 DB 우회 접근 제한

- **목적:** 화면이나 앱 API를 거치지 않고 DB REST 주소로 접근하는 우회를 막습니다.
- **실제 작업:** 자료 요청을 Vercel 서버로 모으고 DB의 `PUBLIC`·`anon`·`authenticated` 직접 권한을 제한했습니다. 서버의 인증·소유권 검사와 DB RLS를 함께 유지했습니다.
- **당시 관찰:** README에는 정상 CRUD, 미인증·타인 접근·직접 REST 요청 거부가 구분돼 있습니다. 이후 별도 보강으로 브라우저 토큰 처리를 줄이고 HttpOnly 쿠키 기반 인증을 적용했습니다.
- **근거:** PR [#13](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/13), 쿠키 인증 보강 [#14](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/14), [README](../README.md).

## 6~12단계: 판정·탐지·복구·운영

### 6단계 — 등록된 기기인지 판정

- **목적:** 로그인 여부와 별개로 기기 등록 조건을 확인합니다.
- **실제 작업:** `decide(request)`에서 계약의 `deviceRegistered`를 검사하고 미등록 기기를 거부하도록 했습니다. 기존 응답 형식과 `device_registered` 규칙 식별자를 유지했습니다.
- **확인 범위:** 가상 요청 테스트와 실제 엔진의 기기 인증을 구분합니다. 학생 판정 함수가 인증서 발급·기기 등록 시스템 자체를 구현한 것은 아닙니다.
- **근거:** [decider.mjs](../src/decider.mjs), [요청 계약](DECIDER_REQUEST.md), PR [#34](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/34).

### 7단계 — 이상 접속에는 추가 확인

- **목적:** 등록 기기라도 평소와 다른 활동이 겹치면 추가 본인 확인을 요구합니다.
- **실제 작업:** 복합 이상 신호에 `step_up`을 반환하고 지역 변화 하나만으로 차단하지 않게 했습니다. 엔진이 전달한 유효한 `stepUp.verified`와 `authAgeSeconds` 조건에 따라 재판정합니다. 특정 테스트 사용자에 의존하던 부분도 수정했습니다.
- **확인 범위:** 정상·미등록·복합 이상·재확인 후 요청을 가상 테스트했습니다. 실제 서비스의 재인증 절차가 연결됐다는 증명은 아닙니다.
- **근거:** [decider.mjs](../src/decider.mjs), [decider-test.mjs](../scripts/decider-test.mjs), PR [#35](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/35)~[#39](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/39).

### 8단계 — 자료 종류별 접근 경계

- **목적:** 개인 메모와 강사 자료처럼 서로 다른 자료에 같은 권한을 적용하지 않습니다.
- **실제 작업:** `my-notes`·`instructor-materials`의 리소스 식별자와 경로를 맞추고, 최종 API에서도 소유권 또는 강사 권한을 재검사했습니다. 판정만 받고 API가 무조건 허용하는 구조를 피했습니다.
- **근거:** [decider.mjs](../src/decider.mjs), [notes-api.mjs](../src/notes-api.mjs), `api/notes`·`api/announcements`, PR [#40](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/40)~[#45](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/45).

### 9단계 — 대량 조회 탐지와 회수 제안

- **목적:** 한 사용자가 짧은 시간에 자료를 과도하게 읽는 패턴을 찾습니다.
- **실제 작업:** 사건을 시간순으로 정리하고 같은 가명 사용자별로 10분 동안의 GET 요청을 셉니다. 120건 초과는 `burst_read` 사유의 `propose_revocation`, 그 이하는 관찰로 구분합니다. 다른 사용자의 횟수를 합치지 않습니다.
- **결과와 경계:** 탐지 결과는 접속 회수 **제안**입니다. 실제 운영 엔진의 회수 실행과 같지 않습니다.
- **근거:** [detect.mjs](../src/detect.mjs), [사건 계약](DETECT_EVENTS.md), PR [#46](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/46).

### 10단계 — 정책과 메모 복구 경로

- **목적:** 정책 또는 자료가 잘못 바뀌었을 때 통제된 복구 경로를 제공합니다.
- **실제 작업:** 안전 정책·시험 정책과 정책 미리보기/복원 도구를 만들었습니다. 메모 백업은 소유권과 SHA-256 해시를 확인하고 기존 백업을 함부로 덮어쓰지 않게 했습니다. `/api/restore/:id`는 인증·대상·소유권·해시를 검사해 한 자료를 복구하고 결과를 확인합니다.
- **확인 범위:** README에 당시 백업 및 판정 기록이 있습니다. 모든 운영 DB의 실제 복구 훈련을 이번 정리에서 완료했다고 확대하지 않습니다.
- **근거:** [policy-recovery.mjs](../src/policy-recovery.mjs), [stage-10.sql](../supabase/stage-10.sql), `recovery/`·`scripts/policy-*.mjs`, PR [#47](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/47).

### 11단계 — 설치 가능한 앱과 기기 승인

- **목적:** 앱 설치 여부와 신뢰할 수 있는 기기 여부를 구분합니다.
- **실제 작업:** PWA manifest·아이콘·온라인/오프라인 안내를 추가했습니다. 기기 승인 요청·상태·승인 API와 보호 요청 서명을 연결하고 개인키는 메모리에서 다루도록 했습니다. 설치만으로 승인된 기기가 되지 않습니다.
- **근거:** [manifest](../public/manifest.webmanifest), `api/device/`, [README](../README.md)의 11단계 기록, PR [#48](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/48)~[#50](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/50).

### 12단계 — 보호 현황을 한 화면에 모음

- **목적:** 앞 단계의 정책·기기·사건·백업·검사 결과를 운영자가 이해할 수 있게 합니다.
- **실제 작업:** 운영 대시보드를 구성하고 `/api/device/status?view=operations`로 현황을 모았습니다. 배포 함수 수 제한에 맞춰 기존 경로를 활용했습니다. 자기 점검은 실제 관측 결과와 제출용 표시의 의미가 맞도록 수정했습니다.
- **당시 관찰:** README에 인증 없는 요청·잘못된 인증·서명 없는 요청의 거부와 승인된 서명 요청의 응답을 구분한 기록이 있습니다. Preview 보호 화면과 앱 API 응답도 구분했습니다.
- **근거:** [README](../README.md)의 12단계 실측·최종 결과, PR [#51](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/51)~[#62](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/62). 최종 정합성 수정 커밋은 `f7888b7`입니다.

## 13~20단계: 결과를 정확히 설명하는 로컬 Agent

이 구간의 학생 화면 구현은 [on-client/student/extension.mjs](../on-client/student/extension.mjs)에 있습니다. **제공 서버·화면이 요청, 인증, 입력 검증, 취소와 오래된 응답 처리를 맡고 학생 함수는 전달받은 상태를 표시합니다.** 아래 설명은 제공 시스템 전체를 새로 구현했다는 뜻이 아닙니다. DOM은 `createElement`·`textContent`로 만들며, 상태를 색상만으로 구분하지 않습니다.

### 13단계 — 세 메뉴와 사용자·기기·세션

- **실제 작업:** 기존 자료실을 보존하면서 `on-client` 시작 틀을 연결했습니다. `createStudentView`·`renderIdentity`에서 보호 현황·업무 앱·보안 기록의 기본 흐름과 사용자·기기·세션 표시를 구성했습니다. 요청 전·조회 중·성공·오류를 구분하고 갱신 때 이전 정보를 제거합니다.
- **수정 이력:** 초기 판정에서 상태 원문 코드 병기가 부족해 한국어 설명과 `active`·`expired`·`unknown` 등 원래 값을 함께 표시하도록 보완했습니다.
- **근거:** 이슈 [#69](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/69)~[#72](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/72), [#76](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/76); PR #73~#75·[#77](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/77). 당시 사용자 메뉴·키보드 확인 기록과 최종 PC 재현은 별도입니다.

### 14단계 — 업무 앱 접근 판정

- **실제 작업:** `renderDecision`에서 `allow`·`deny`·`challenge`·`unknown`을 구분하고 이유·시각·대상을 표시했습니다. 요청 실패와 원천 시스템의 거부 판정을 섞지 않으며 새 입력에는 이전 판정이 남지 않게 했습니다.
- **결과와 경계:** “허용 판정”은 해당 앱에서 모든 작업이 실제 실행됐다는 보장이 아닙니다. 당시 demo의 허용·거부·추가 확인 및 키보드 확인은 이슈에 기록돼 있습니다.
- **근거:** 이슈 [#78](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/78), PR [#79](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/79).

### 15단계 — 보안 기록 탐색

- **실제 작업:** `renderEvents`에서 최신순 정렬, 종류·앱·접속 상태 필터, 선택한 사건의 근거·규칙·상태를 표시했습니다. 조회 실패와 기록 없음은 다른 문구로 안내하고 갱신·오류 시 이전 상세를 정리했습니다.
- **확인 범위:** 당시 실제 demo는 사건 1건이었고 여러 사건 비교는 모의 입력으로 점검했습니다. demo 개수를 실제 운영 사건 수로 해석하지 않습니다.
- **근거:** 이슈 [#80](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/80), PR [#81](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/81).

### 16단계 — 보호 현황과 도움정보

- **실제 작업:** `renderStatus`에서 기기·세션·알림·진단 상태를 보여 주었습니다. “도움정보 복사”는 사용자가 눌렀을 때만 허용된 진단 필드를 복사하도록 했습니다. 지원하지 않는 조치를 실행 가능한 것처럼 표시하지 않습니다.
- **제한:** 복사 대상은 `requestId`·`component`·`version`·`checkedAt`·`engine.mode`·`engine.code`입니다. 진단 전체나 비밀값을 전송하는 기능이 아닙니다.
- **근거:** 이슈 [#82](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/82), PR [#83](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/83).

### 17단계 — AI 연결 상태와 설명 요청의 기초

- **실제 작업:** `renderAiConnection`과 설명의 기본 상태에서 계정 연결·앱 승인·모델 확인·설명 요청을 구분했습니다. 연결 확인이나 모델 목록 조회만으로 설명 생성 성공을 표시하지 않습니다.
- **과거와 현재:** 당시 실제 연결에서 `503 / ON_AI_PROVISIONING_PENDING`이 보고됐고 공식 판정에도 일부 미확인 이력이 있었습니다. 현재 과제 완료는 사용자의 전체 통과 보고를 반영합니다. 과거 오류를 실제 AI 성공으로 바꾸지 않습니다.
- **근거:** PR [#91](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/91), 과제 이슈 [#84](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/84)·[#90](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/90). 실제 AI 검증은 [#89](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/89)에 남습니다.

### 18단계 — 사건의 근거에 연결한 AI 설명

- **실제 작업:** `renderExplanation`에서 사건이 없어도 오류를 먼저 안전하게 표시합니다. 성공한 설명은 현재 사건의 근거 ID와 대조하고 근거 글·규칙·사건 ID를 보여 줍니다. 접속·세션·기기의 `unknown`은 각각 확인 불가로 표시합니다.
- **잘못된 해석 방지:** 없는 근거를 만들지 않고, 제안은 이유와 미실행 상태를 표시합니다. 지원 조치가 없으면 제안이 없는 이유를 설명합니다. 실패·근거 불일치에는 성공 속성을 붙이지 않고 새 선택·갱신 시 이전 설명을 제거합니다.
- **근거:** PR [#92](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/92), 이슈 [#94](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/94), `test/stage18-explanation*.test.mjs`. DOM·요청 수명주기 모의 검사 12건이며 실제 유료 설명 호출은 별도 미확인입니다.

### 19단계 — 조치 준비·접수·효과를 분리

- **실제 작업:** `renderAction`에서 11가지 상태를 구분했습니다. `prepared`는 준비됨·미실행, `executing`은 전송 중, `pending`은 서버 접수·처리 중입니다. `succeeded`와 `observation.effectApplied === true`가 함께 있어야 효과 확인으로 표시합니다.
- **잘못된 해석 방지:** 사건·근거·대상·generation·요청·접수·version을 받은 범위에서 표시하고 `unknown`은 결과 재조회를 안내합니다. 학생 코드에 실행 버튼·POST·인증 티켓을 추가하지 않았습니다. 화면 취소는 이미 전달된 조치 효과의 취소가 아닙니다.
- **근거:** PR [#93](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/93), 이슈 [#95](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/95), [모의 검사 13건](../test/stage19-action.test.mjs). 공식 안내상 실제 집행 연결은 준비되지 않았으며 과제 통과와 별개로 미완료입니다.

### 20단계 — 정확한 패키지 버전과 OSV 결과

- **실제 작업:** `renderVulnerabilities`에 요청 상태 4종, 전체 조회 상태 5종, 패키지 상태 3종을 표시했습니다. 전달된 정확한 버전·출처·확인 시각·lock 메타데이터와 취약점 ID·수정 시각을 보여 줍니다.
- **잘못된 해석 방지:** 일부 조회 실패에도 이미 받은 취약점 ID를 보존합니다. `none_found`는 조회 범위에서 알려진 항목이 없다는 뜻이며 앱 전체의 안전 보장이 아닙니다. 미설정·미조회·확인 불가를 취약점 없음으로 바꾸지 않습니다. 진행 중·오류·취소 이후 오래된 표가 남지 않는 흐름도 점검했습니다.
- **근거:** PR [#109](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/109), 이슈 [#104](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/104), [모의 검사 13건](../test/stage20-vulnerabilities.test.mjs). 실제 HTTP에서는 `not_configured`가 관측됐고 승인된 프로젝트의 외부 OSV 조회·설치 버전 대조는 미확인입니다.

## 21~22단계: 실행 설명과 최종 인수인계

### 21단계 — 다른 사람이 실행할 수 있는 문서

- **실제 작업:** 기존 README를 보존하면서 학생 안내와 [STUDENT_RUNBOOK.md](STUDENT_RUNBOOK.md)를 작성했습니다. 작업 폴더, 런타임 버전, 시작·종료·재실행, 브라우저 주소, 정상 시작 신호, 장애별 확인 순서를 정리했습니다.
- **구성 설명:** 브라우저 → 로컬 앱 서버 → 접근 제어·XDR / AI 게이트웨이 / OSV 관계와 학생 함수·제공 코드의 경계를 글과 Mermaid로 설명했습니다. 로컬 앱의 Node `24.19.0` 기준을 루트의 `>=22` 선언과 구분했습니다.
- **근거:** PR [#115](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/115), 이슈 [#110](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/110). Linux의 HTTP 재현과 Windows PowerShell·브라우저 미확인을 구분했습니다. PR #115의 문서가 당시 main에 없던 부분은 22단계 최종 제출본에 포함했습니다.

### 22단계 — 같은 최종 커밋을 재현하고 넘기기

- **실제 작업:** [STUDENT_HANDOVER.md](STUDENT_HANDOVER.md)에 새 빈 폴더의 지정 SHA 체크아웃, 단계별 확인, 데이터 백업·복원 계획, 지원 범위와 미완료 사항을 정리했습니다. [STUDENT_REPRO_BASE.json](STUDENT_REPRO_BASE.json)은 사전 기준 커밋의 HTTP 관찰 기록으로 보존하고 최종 커밋 재현과 구분했습니다.
- **최종 재현 기록:** AI 작업 환경의 Linux·Node `24.19.0`에서 최종 후보 `b58f29cabbef9d9247c0dc2e93dae2e9e47a7ac3`를 별도 폴더에 받았습니다. 문법 검사, 18~20단계 모의 검사 38건, 기본/demo HTTP, 종료·재실행, Git bundle 검증·복원 결과를 #120에 남겼습니다. 기본 엔진 미연결 `503`과 OSV `not_configured`를 실패 없는 실제 연동으로 해석하지 않았습니다.
- **보존 범위:** 기존 작업 공간 사본의 295개 파일 보존을 점검했습니다. 이는 사용자 PC의 모든 자료를 백업했다는 뜻이 아닙니다. Git bundle은 커밋된 파일을 복구하며 DB·인증서·무시 파일을 복원하지 않습니다.
- **현재 상태:** 사용자 전체 통과 보고와 PR #121 main 병합을 확인했습니다. 본인 PC의 최종 브라우저 재현·실제 외부 연결·DB 복원은 추가 확인하지 않았습니다.
- **근거:** PR [#121](https://github.com/SuperNova080710/choi-bujang-secret-vault/pull/121), 상위 이슈 [#116](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/116), 최종 증거 [#120](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/120).

## 번호 단계와 별도로 남아 있는 보강 기록

README에는 쿠키 인증 보강과 XDR 보너스 기록도 있습니다. 이를 새로운 번호 단계나 0단계로 끼워 넣지 않습니다. XDR-02 ~ 06 등의 상세 내용·당시 상태는 README의 해당 제목을 따르며, 이 문서의 0 ~ 22단계 완료 표가 보너스나 모든 운영 검증의 추가 성공을 의미하지 않습니다.

## 과제 완료 후에도 남아 있는 확인

| 항목 | 현재 상태 | 후속 기록 |
|---|---|---|
| 0단계 실제 작업 | 사용자 확인: 기록 없음 | 새 근거 확보 시 이 문서 보완 |
| 실제 계정 AI 연결·응답·복구 | 추가 성공 확인 안 함 | [#89](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/89) |
| 본인 PC에서 동일 최종 SHA의 PowerShell·브라우저 재현 | 추가 확인 안 함 | [#123](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/123) |
| 실제 학생 SDP 판정·사건 원천 연결 | 최종 운영 검증 미확인 | #123 |
| 승인된 프로젝트 OSV·실제 설치 버전 대조 | 설정 및 실제 조회 미확인 | #123 |
| 실제 조치 집행·효과 관측 | 공식 안내상 연결 미완료 | #123 |
| 학생 데이터·DB·인증 자격의 복원 | Git 파일 복원과 별도로 미확인 | #123 |

이 항목들은 추가 수료 조건을 임의로 만든 것이 아니라 **과제 통과를 실제 운영 성공과 혼동하지 않기 위한 잔여 범위**입니다. 확인을 위해 유료 AI 요청이나 실제 보안 조치를 임의로 실행하지 않습니다.

## 이슈 정리 원칙

이번 정리에서는 기존 과제 이슈의 상단에 현재 완료 상태를 적고, 과거 대기·실패·미확인 기록은 접힌 영역에 원문 그대로 보존했습니다. 완료된 과제는 닫고 운영 확인 #89·#123은 열어 둡니다. 정리 작업은 [#122](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/122)와 하위 작업 #124~#126에서 추적합니다. 새 문서 PR의 병합은 사용자가 진행합니다.

새로 확인한 결과를 추가할 때에는 **대상 커밋, 실행 환경, 실행자, 시각, 실제 관찰 결과, 남은 미확인 사항**을 함께 남깁니다. 서로 다른 커밋의 과거 성공을 합쳐 최종 버전 전체가 실제 운영 검증됐다고 표현하지 않습니다.

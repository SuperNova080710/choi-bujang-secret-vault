# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 2단계 현재 상태

2단계에서는 가상 자료를 공개 정적 파일에서 서버 측 저장소로 옮겼습니다.

현재 구조는 다음과 같습니다.

* 가상 자료 4건은 Supabase `public.virtual_notes` 테이블에 저장합니다.
* `owner_id uuid` 컬럼을 미리 만들었지만 현재 단계에서는 `auth.users`와 FK로 연결하지 않습니다.
* `virtual_notes` 테이블에는 RLS를 활성화했습니다.
* `anon`과 `authenticated` 역할에는 테이블 조회 권한을 부여하지 않았습니다.
* 브라우저 화면은 `/data.json`을 직접 읽지 않고 `/api/notes`를 호출합니다.
* `/api/notes`는 Vercel 서버 함수에서 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY` 환경변수를 사용해 Supabase를 조회합니다.
* `SUPABASE_SECRET_KEY`는 브라우저 코드, 응답, 로그, Git에 포함하지 않습니다.
* `/data.json`에는 더 이상 가상 자료가 들어 있지 않습니다.
* 2단계에서는 `/api/notes` 자체가 아직 공개 API이므로 비로그인 요청으로 가상 자료를 조회할 수 있습니다. 실제 자료나 비밀정보는 절대로 저장하지 않습니다.

Supabase 테이블과 가상 자료의 초기 설정은 [`supabase/stage-2.sql`](supabase/stage-2.sql)에 기록되어 있습니다.

Vercel에는 다음 환경변수가 필요합니다.

* `SUPABASE_URL`
* `SUPABASE_SECRET_KEY`

`SUPABASE_SECRET_KEY`의 실제 값은 Git, 코드, 제출 내용 또는 채팅에 기록하지 않습니다.

## 2단계 정적 자료 노출 확인

2단계에서 공개 정적 파일로부터 기존 가상 자료를 제거했는지 확인할 수 있습니다.

배포된 `/data.json`을 직접 열어 `notes`가 비어 있는지 확인합니다.

```json
{
  "sampleMarker": "SAMPLE_NOTE_1",
  "notes": []
}
```

현재 프로젝트의 정적 파일에서 기존 가상 자료 문장을 검색할 때는 다음 명령을 사용합니다.

```bash
grep -R -n -E '실습용 가상 과제 기록|실습용 가상 포트폴리오 기록|실습용 가상 리추얼 기록|실습용 가상 행정 자료' public src api data.json
```

검색 결과가 없으면 현재 지정한 정적 파일 범위에서는 해당 문장을 찾지 못한 것입니다.

GitHub의 최신 커밋에서도 같은 문장이 남아 있지 않은지 확인해야 합니다. 로컬 작업 트리가 최신 커밋과 일치하는지 먼저 확인하고 GitHub의 현재 브랜치 파일과 비교합니다.

단, 이 검색은 **과거 공개 이력까지 제거했다는 의미가 아닙니다.** 1단계에서 이미 공개된 Git 커밋과 이전 Vercel 배포에는 기존 가상 자료가 남아 있을 수 있습니다. 따라서 2단계에서는 현재 정적 파일과 최신 저장소에서 자료를 제거한 사실만 확인하며, 과거 공개 이력이 해결되었다고 주장하지 않습니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다.

2단계부터 `npm run build`는 `data.json`을 `public/data.json`으로 복사하지 않습니다. 공개 화면에서 자료를 읽을 때는 Vercel의 `/api/notes` 서버 함수를 사용합니다.

빌드 과정에서는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 배포용 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다.

`public/aleph.json`은 Git에 커밋하지 않습니다. 로컬에서 가상 화면과 빌드 흐름만 확인할 때는 다음을 사용합니다.

```bash
npm run build -- --local
```

로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다.

`src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽는 자체 점검 도구입니다. 이 자체 점검 결과를 실제 심판 판정으로 간주하지 않습니다.

## 2단계 제작 파일

### `supabase/stage-2.sql`

Supabase에 다음 구조를 만드는 SQL입니다.

* `public.virtual_notes` 테이블
* `owner_id uuid`
* 제목과 내용
* RLS 활성화
* `anon`, `authenticated` 역할의 테이블 권한 제거
* 실습용 가상 자료 4건

실제 비밀번호, 토큰, API 키 또는 학생 자료를 SQL 파일에 넣지 않습니다.

### `api/notes.js`

Vercel 서버 함수입니다.

브라우저가 `/api/notes`를 요청하면 서버 함수가 Supabase의 `virtual_notes`를 읽어 가상 자료를 반환합니다.

서버 함수에서만 다음 환경변수를 읽습니다.

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
```

비밀키를 클라이언트 JavaScript로 전달하거나 API 응답에 포함하지 않습니다.

2단계에서는 이 API에 별도의 로그인 보호가 없으므로 공개 호출이 가능한 상태입니다. 로그인과 접근 제어는 이후 단계의 작업입니다.

## 3단계 현재 상태

3단계에서는 Supabase Auth를 이용한 실제 로그인과 서버 측 로그인 토큰 검증을 추가했습니다. 로그인한 사용자는 가상 메모를 조회하고 추가·수정·삭제할 수 있습니다.

현재 구조는 다음과 같습니다.

* Supabase Auth의 이메일/비밀번호 로그인을 사용합니다.
* 브라우저에서는 Supabase 공식 SDK의 `signInWithPassword()`, `signOut()`, `getSession()`, `onAuthStateChange()`를 사용합니다.
* 브라우저에는 Supabase Project URL과 Publishable Key만 사용합니다.
* `SUPABASE_SECRET_KEY`는 브라우저 코드에 포함하지 않습니다.
* `/api/notes`와 `/api/notes/:id`는 요청의 `Authorization: Bearer <access_token>`을 서버에서 검증합니다.
* 서버의 토큰 검증은 시작 틀에서 제공된 `src/verify-login.mjs`를 사용합니다.
* `src/verify-login.mjs` 자체는 수정하지 않았습니다.
* 검증된 로그인 사용자의 UUID를 서버에서 `owner_id`로 사용합니다.
* 브라우저가 전달하는 `userId`나 `role`을 사용자 식별 정보로 신뢰하지 않습니다.
* 인증되지 않은 요청이나 토큰 검증에 실패한 요청은 `401 LOGIN_REQUIRED` JSON 응답으로 거부합니다.
* `/api/notes`는 로그인 사용자의 목록을 반환하고, `POST /api/notes`로 메모를 추가합니다.
* `/api/notes/:id`에서 단일 메모 조회, 수정, 삭제를 수행합니다.
* API의 단일 메모 ID는 UUID 형식의 `public_id`를 사용합니다.
* 기존 2단계 가상 자료 네 건은 유지하기 위해 `owner_id`가 `NULL`인 자료도 로그인 사용자 목록에서 계속 조회할 수 있도록 처리했습니다.
* 현재 단계에서는 메모 소유권 검증을 의도적으로 적용하지 않았습니다. 따라서 다른 로그인 사용자가 다른 사용자의 메모를 조회·수정·삭제할 수 있으며, 이 문제는 4단계에서 처리할 범위입니다.

3단계 인증 및 메모 API의 주요 파일은 다음과 같습니다.

* `public/index.html`
  * Supabase Auth 로그인/로그아웃 화면
  * 로그인 사용자용 메모 추가·수정·삭제 UI
  * 세션 access token을 API 요청의 Authorization 헤더에 전달
* `src/verify-login.mjs`
  * 시작 틀에서 제공된 로그인 토큰 검증 모듈
  * 3단계에서는 파일 자체를 수정하지 않음
* `src/notes-api.mjs`
  * 요청 인증과 Supabase 서버 클라이언트 생성의 공통 처리
* `api/notes.js`
  * 로그인 사용자 메모 목록 조회 및 추가
* `api/notes/[id].js`
  * 로그인 사용자 메모 단일 조회·수정·삭제
* `supabase/stage-3.sql`
  * 기존 `virtual_notes`에 UUID 기반 `public_id`를 추가하는 3단계 DB 변경

3단계의 실제 API 경로는 `aleph.config.json`에 다음과 같이 등록되어 있습니다.

```json
{
  "allowedRoutes": [
    "/api/notes",
    "/api/notes/:id"
  ]
}
```

로그인 토큰 검증에 사용하는 Supabase issuer, JWKS URL, audience도 `aleph.config.json`의 `identityProvider`에 기록되어 있습니다. 이 설정에는 비밀키가 포함되지 않습니다.

## 3단계 검증 순서

1. Supabase Auth에서 테스트 계정을 준비합니다.
2. 배포된 `/`에서 테스트 계정으로 로그인합니다.
3. 로그인 상태에서 기존 가상 자료가 조회되는지 확인합니다.
4. 메모 추가 UI를 사용하여 새 메모를 추가합니다.
5. 추가된 메모를 수정하고 변경 내용이 반영되는지 확인합니다.
6. 수정된 메모를 단일 GET API로 조회하여 `{ id, title, body }` 응답을 확인합니다.
7. 메모를 삭제합니다.
8. 삭제된 메모의 단일 GET 요청이 `404 NOTE_NOT_FOUND`를 반환하는지 확인합니다.
9. 로그아웃 후 메모 관리 UI가 비로그인 상태로 변경되는지 확인합니다.
10. 비로그인 상태에서 `/api/notes`에 접근하면 `401 LOGIN_REQUIRED` JSON 응답이 반환되는지 확인합니다.
11. 비로그인 상태에서 POST, PUT, DELETE API도 인증 없이 실행되지 않는지 확인합니다.
12. 다른 테스트 계정으로 로그인하여 첫 번째 계정의 메모에 접근할 수 있는지 확인합니다. 현재 단계에서는 이 접근이 가능해야 하며, 해당 소유권 검증 부재는 4단계에서 처리할 의도적인 취약점입니다.
13. 브라우저 코드와 응답에서 `SUPABASE_SECRET_KEY`가 노출되지 않는지 확인합니다.
14. `/aleph.json`에 접근할 수 있는지 확인합니다.
15. 첫 화면 응답에 `X-Content-Type-Options: nosniff`가 적용되는지 확인합니다.
16. `aleph.config.json`의 `step`, `identityProvider`, `allowedRoutes`, `judgeIssuer`가 실제 구현과 일치하는지 확인합니다.

3단계 최종 검증 결과:
- 로그인 성공 및 로그아웃 상태 변경 확인
- 비로그인 `/api/notes` 요청에서 `401 LOGIN_REQUIRED` 확인
- 로그인 상태에서 기존 가상 자료 조회 확인
- 메모 추가 `201` 확인
- 메모 수정 `200` 확인
- 단일 메모 조회 `200` 확인
- 메모 삭제 `204` 확인
- 삭제 후 단일 메모 조회 `404 NOTE_NOT_FOUND` 확인
- 비로그인 POST/PUT/DELETE 요청 거부 확인
- 다른 사용자에 의한 메모 조회·수정·삭제 가능 상태 확인
- 서버 전용 `SUPABASE_SECRET_KEY` 브라우저 노출 없음 확인
- `/aleph.json` 접근 확인
- 첫 화면 보안 헤더 확인
- `git diff --check` 통과
- 3단계 UI CRUD 커밋 `c2bae04`를 PR #9로 merge 완료
- Vercel 배포 완료
- 배포 환경에서 최종 CRUD 브라우저 검증 완료

3단계의 소유권 검증 부재는 구현 누락이 아니라 단계별 과제 범위에 따른 의도적인 상태입니다. 4단계에서는 검증된 사용자 ID와 메모의 `owner_id`를 비교하여 다른 사용자의 메모에 대한 조회·수정·삭제를 차단하는 작업을 수행합니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 이전 단계의 동작과 변경사항을 유지해야 합니다.

2단계부터는 공개 `data.json`에 자료를 복사하는 1단계 빌드 흐름을 사용하지 않습니다. 자료는 서버 측 저장소와 API를 통해 읽습니다.

3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다.

비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 로그, 브라우저 응답 또는 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## 2단계 검증 순서

1. Supabase SQL을 실행하고 `virtual_notes`의 RLS 및 권한을 확인합니다.
2. 로컬에서 정적 파일에 기존 자료가 남아 있지 않은지 검색합니다.
3. `npm run build -- --local`로 로컬 빌드를 확인합니다.
4. 변경사항을 Git에 커밋하고 GitHub에 push합니다.
5. Vercel이 새 커밋을 배포하도록 합니다.
6. 배포된 `/`에서 4개의 가상 자료가 정상적으로 표시되는지 확인합니다.
7. 배포된 `/data.json`에 자료가 없는지 확인합니다.
8. 배포된 `/api/notes`에서 서버 측 저장 자료가 반환되는지 확인합니다.
9. 브라우저 소스와 응답에서 `SUPABASE_SECRET_KEY`가 노출되지 않는지 확인합니다.
10. 최신 GitHub 파일에서 기존 가상 자료 문장을 검색합니다.
11. 과거 Git 커밋과 이전 배포에 자료가 남아 있을 가능성을 별도로 기록합니다.

## 롤백 원칙

작업 중 문제가 발생하면 먼저 현재 상태와 변경사항을 확인합니다.

```bash
git status
git diff
```

2단계 작업과 기존 작업을 구분한 뒤 필요한 파일만 수정하거나 되돌립니다. Supabase 데이터베이스를 임의로 삭제하거나 초기화하지 않습니다.

`git reset --hard`를 사용해 전체 작업을 무조건 되돌리지 않습니다.

## 4단계 현재 상태

4단계에서는 로그인한 사용자가 자신의 메모만 읽기·추가·수정·삭제할 수 있도록 API와 DB 양쪽에서 소유권을 강제했습니다.

### 4단계 제작 1: 메모 소유자 연결

* A 테스트 계정을 A 계정으로 사용했습니다.
* B 테스트 계정을 B 계정으로 사용했습니다.
* 기존 주요 메모 3건을 A 소유로 연결했습니다.
* B 소유의 시험 메모 1건을 추가했습니다.
* 기존 Stage 3 테스트 메모의 소유자도 확인했습니다.
* `owner_id`가 `NULL`인 `훈련 행정 자료`는 특정 사용자의 소유가 아니므로 4단계 API에서 노출하지 않습니다.
* 실제 사용자 UUID와 인증 토큰은 저장소에 기록하지 않습니다.

### 4단계 제작 2: API 소유권 검사

API는 URL이나 요청 본문의 사용자 ID를 신뢰하지 않고 서버에서 검증된 로그인 사용자 ID를 사용합니다.

* `GET /api/notes`는 인증된 사용자가 소유한 메모만 반환합니다.
* `POST /api/notes`는 검증된 사용자 ID를 `owner_id`로 저장합니다.
* `GET /api/notes/:id`는 `public_id`와 인증된 사용자 ID가 모두 일치하는 메모만 조회합니다.
* `PUT /api/notes/:id`는 기존 메모의 소유자를 확인한 후 자기 메모만 수정합니다.
* `PUT`에서는 수정 후 반환된 행의 소유자도 다시 확인합니다.
* `DELETE /api/notes/:id`는 기존 메모의 소유자를 확인한 후 자기 메모만 삭제합니다.
* 단일 메모 응답은 `{ id, title, body }` 형식을 유지합니다.
* 수정 요청 본문은 `{ title, body }` 형식을 유지합니다.

### 4단계 제작 3: DB 최소 권한 및 RLS

`public.virtual_notes`에만 DB 권한과 RLS를 적용했습니다.

* `PUBLIC`, `anon`, `authenticated`의 기존 테이블 권한을 회수했습니다.
* `authenticated`에 SELECT, INSERT, UPDATE, DELETE만 다시 부여했습니다.
* `anon`에는 테이블 권한이 없습니다.
* SELECT는 `auth.uid() = owner_id`인 행만 허용합니다.
* INSERT는 새 행의 `owner_id`가 `auth.uid()`인 경우만 허용합니다.
* UPDATE는 기존 행과 변경 후 행의 `owner_id`가 모두 `auth.uid()`인 경우만 허용합니다.
* DELETE는 `auth.uid() = owner_id`인 행만 허용합니다.
* 다른 테이블의 권한이나 정책은 변경하지 않았습니다.

적용 후 `information_schema.role_table_grants`와 `has_table_privilege()`로 실제 권한을 확인했습니다.

### 4단계 검증 결과

Stage 4 Preview 배포에서 다음을 확인했습니다.

* A 로그인 → 자신의 메모 목록 조회 정상
* B 로그인 → 자신의 메모 목록 조회 정상
* A/B 각자 자신의 메모 CRUD 정상
* A 계정 → 자신의 `public_id` 직접 GET → HTTP 200
* B 계정 → A의 `public_id` 직접 GET → HTTP 404
* B 계정 → A의 메모 PUT → HTTP 403
* B 계정 → A의 메모 DELETE → HTTP 403
* `owner_id = NULL`인 메모는 A/B 목록에 노출되지 않음
* `anon`의 SELECT/INSERT/UPDATE/DELETE 권한은 모두 없음
* `authenticated`의 SELECT/INSERT/UPDATE/DELETE 권한은 모두 있음

Preview 최초 배포에서는 Vercel Preview 환경에 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`가 적용되지 않아 `SERVER_CONFIG_ERROR`가 발생했습니다. 두 환경변수를 Production & Preview 환경으로 변경하고 재배포한 후 정상 동작을 확인했습니다.

### 4단계 API 허용 경로

`aleph.config.json`에는 실제 API 메서드와 경로를 다음과 같이 기록했습니다.

```json
{
  "allowedRoutes": [
    "GET /api/notes",
    "POST /api/notes",
    "GET /api/notes/:id",
    "PUT /api/notes/:id",
    "DELETE /api/notes/:id"
  ]
}
```

### 4단계 저장점

4단계 변경사항을 저장점으로 커밋하기 전에 다음을 확인합니다.

* `git status`와 `git diff`로 변경 범위를 확인합니다.
* 커밋 대상 파일과 비밀정보·인증 토큰 포함 여부를 검토합니다.
* `artifacts/submission.json`과 `bundle-notes.json`은 커밋하지 않습니다.
* Supabase DB 데이터와 기존 작업은 임의로 초기화하거나 삭제하지 않습니다.
* `npm run bundle` 실행 결과를 확인하고 제출 묶음의 단계 및 커밋 정보를 검증합니다.

4단계 DB RLS 및 최소 권한 정책은 Supabase에서 별도로 적용했습니다. 실제 사용자 UUID와 인증 토큰은 저장소에 기록하지 않습니다.

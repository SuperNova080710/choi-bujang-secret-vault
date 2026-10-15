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

## 5단계 현재 상태

5단계에서는 브라우저의 메모 데이터 요청을 Vercel 서버 함수로 통일하고, Supabase 원본 REST API를 통한 직접 접근을 차단했습니다.

### 구현 및 설정

- `public/index.html`의 메모 조회·추가·수정·삭제는 `/api/notes` 및 `/api/notes/:id` 서버 함수를 사용합니다.
- Supabase Auth의 `getSession()`, `signInWithPassword()`, `signOut()` 호출은 유지합니다.
- 서버 함수는 로그인 토큰을 검증하고, 검증된 사용자 ID를 기준으로 메모 소유권을 확인합니다.
- `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`는 서버 환경변수로 사용합니다. 서버 전용 키를 브라우저 코드에 포함하지 않습니다.
- `public.virtual_notes`의 `PUBLIC`, `anon`, `authenticated` 직접 권한을 회수했습니다.
- RLS는 활성화 상태로 유지했습니다. 서버 함수의 메모 기능은 서버 전용 설정을 이용합니다.
- `aleph.config.json`의 `step`은 `5`이며, `originalApiUrl`은 `https://foynurtqnrgvsctcvbdr.supabase.co/rest/v1/virtual_notes`입니다.
- `judgeIssuer`와 기존 `allowedRoutes`는 유지했습니다.

### 5단계 검증 결과

사용자 확인 기준으로 다음 검증을 완료했습니다.

- A 계정의 메모 조회·추가·수정·삭제 정상
- B 계정의 메모 조회·추가·수정·삭제 정상
- 비로그인 API 요청은 HTTP 401로 거부
- 다른 사용자 메모 조회는 HTTP 404로 거부
- 다른 사용자 메모 수정·삭제는 HTTP 403으로 거부
- 공개 키를 이용한 원본 REST API 직접 접근 차단
- DB 직접 권한 회수 후에도 서버 함수의 메모 기능 정상

이 결과는 해당 환경에서 수행한 검증 기록이며, 별도의 심판 점수나 판정 결과를 의미하지 않습니다.

## XDR-02 웹 주입 공격 탐지

XDR-02는 `xdr/fixtures/web-injection.json`에 정의된 가상 경보 26건을 대상으로 웹 주입 공격 징후를 분류하는 실습 모듈입니다. 실제 서비스의 운영 로그를 수집하거나 네트워크 요청을 직접 차단하지 않습니다.

### 구성 파일

- `xdr/web-injection/read-alerts.mjs`: 가상 경보에서 시간, 출발지 IP, 계정, 규칙 수준, 설명 등을 추출합니다.
- `xdr/web-injection/patterns.json`: MITRE ATT&CK T1190을 참고한 공격 패턴 목록을 관리합니다.
- `xdr/web-injection/decide.mjs`: 경보의 설명, URL, 반복 횟수, 규칙 수준, 출발지 IP 및 MITRE ATT&CK 태그를 검토해 `block`, `alert`, `record`로 분류하고 신뢰도와 사유를 반환합니다.
- `xdr/web-injection/respond.mjs`: 분류 결과를 `xdr/alerts.log`에 JSONL 형식으로 추가하고 대응 결과를 처리합니다. `block`은 실제 네트워크 차단이 아니라 차단 후보를 의미합니다.
- `xdr/web-injection/result.json`: 실행 결과와 분류 건수를 저장합니다.

### 분류 기준

- **`block` — 차단 후보:** 명시적으로 정의된 공격 패턴과 반복 횟수, 규칙 수준, 출발지 IP 등 필요한 증거가 차단 기준을 충족하는 경우입니다.
- **`alert` — 추가 확인:** 공격 패턴은 있지만 차단 기준이 충족되지 않거나, 단발성 의심 징후가 확인된 경우입니다. 정상 문맥으로 보이는 설명이라도 MITRE ATT&CK `T1190` 태그가 있으면 명확한 공격 증거가 부족한 경보로 분류합니다.
- **`record` — 기록:** 지정된 공격 패턴이나 별도의 의심 근거가 확인되지 않아 정상 활동 또는 일반 이벤트로 기록하는 경우입니다.

`T1190` 태그는 경보의 분류 맥락을 제공하지만, 그 자체로 공격 성공을 입증하지 않습니다. 따라서 이 태그만으로 `block` 처리하지 않고 `alert`로 분류합니다.

### 실행 및 검증

저장소 루트에서 다음 명령을 실행합니다.

```bash
npm run xdr:run -- web-injection
```

검증 항목은 다음과 같습니다.

- 가상 경보 26건을 처리합니다.
- 명확한 공격은 차단 후보로, 애매한 시도는 알림으로, 나머지는 기록으로 분류합니다.
- 정상 계정 이벤트가 차단 후보로 잘못 분류되지 않는지 확인합니다.
- 차단 후보에 만료 시각이 기록되는지 확인합니다.
- 기존 `xdr/alerts.log` 기록이 보존되는지 확인합니다.
- 과제 채점 결과에서 요구된 분류 조건을 충족하는지 확인합니다.

### 결과 해석 및 주의사항

과제 채점에서 **100점**을 획득했으며, 이는 해당 과제의 채점 기준을 충족했음을 의미합니다. 실제 로컬 실행 건수는 수정된 코드로 다시 실행한 `xdr/web-injection/result.json`을 기준으로 기록해야 합니다. 채점 결과와 로컬 실행 건수는 서로 다른 검증 결과이므로 구분합니다.

이 모듈은 가상 fixture를 이용한 실습용 분류기입니다. 채점 결과만으로 실제 운영 환경의 탐지 성능이나 ZTNA 차단 효과가 입증되는 것은 아닙니다.

**로그 주의사항:** `node xdr/web-injection/respond.mjs`는 공유 로그에 새 기록을 추가할 수 있습니다. 재실행하면 동일한 경보 ID의 기록이 중복 추가될 수 있으므로 실행 전후의 로그 상태를 확인합니다.

## 6단계 현재 상태 — 등록된 기기만 자료실 접근 허용

6단계에서는 ALEPH SDP 판정기가 전달한 요청에서 기기 등록 여부를 확인합니다. `src/decider.mjs`는 `request.deviceRegistered === true`인 요청만 허용합니다. 값이 `false`이거나 누락된 요청은 `deny`와 `device_not_registered` 사유 코드로 거부합니다.

### 구현 파일

- `src/decider.mjs`
  - `RULE_IDS`에 실제 구현 규칙인 `device_registered`를 등록합니다.
  - 등록된 기기의 요청은 `allow`로 판정합니다.
  - 미등록 또는 등록 여부가 확인되지 않은 요청은 `deny`로 판정합니다.
  - 응답은 `schema`, `requestId`, `decision`, `reasonCode`, `ruleIds`의 5개 필드를 유지합니다.
- `scripts/decider-test.mjs`
  - 등록 기기의 정상 요청을 검증합니다.
  - 미등록 기기의 가상 요청이 `device_not_registered`로 거부되는지 검증합니다.

### 로컬 검증 순서

저장소 루트에서 다음 명령을 실행합니다.

```bash
npm run decider:test
```

통과 시 예상 출력:

```text
통과 · 등록 기기의 정상 요청
통과 · 미등록 기기의 가상 요청
이 명령은 가상 요청으로 연습하며 심판 통과 증거가 아닙니다.
```

이 테스트는 로컬 가상 요청 검증입니다. 실제 기기 등록 절차의 동작, Vercel 배포 상태 또는 심판의 통과 여부를 증명하지 않습니다. 실제 화면과 배포 상태는 별도로 확인해야 합니다.

### 보안 주의사항

- 요청의 `userId`, `role`, 토큰 또는 기기 개인 키를 별도로 신뢰하거나 저장하지 않습니다.
- 실제 비밀번호, 토큰, 서버 전용 키, 기기 개인 키 및 개인정보를 코드·로그·Git·제출 묶음에 기록하지 않습니다.
- `deviceRegistered`는 SDP 엔진이 검증한 계약 필드입니다. 클라이언트가 임의로 보낸 값만으로 등록 상태를 결정해서는 안 됩니다.

## 7단계 현재 상태 — 평소와 다른 접속은 다시 확인

7단계에서는 등록된 기기의 요청이라도 복합적인 이상 신호가 나타나면 추가 본인 확인을 요구하도록 판정 규칙을 확장합니다.

### 구현 파일

- `src/decider.mjs`
  - `RULE_IDS`에 `step_up_required`를 추가합니다.
  - 신호 구조가 유효하지 않거나 실제 신호 출처를 확인할 수 없는 요청은 `step_up`으로 판정합니다.
  - 가상 신호에서 비정상 시간(00:00~05:59 또는 22:00~23:59), 낯선 네트워크, 최근 5분 이내 대량 조회가 함께 나타나면 `step_up`으로 판정합니다.
  - 지역 변경만으로는 차단하지 않습니다.
  - 복합 이상 요청은 유효한 추가 확인 전에는 `step_up`으로 판정합니다.
  - 엔진이 `stepUp.verified: true`와 0~900 범위의 정수 `authAgeSeconds`를 전달하면 재확인된 요청으로 다시 판정해 `allow`합니다.
  - 응답은 기존의 `schema`, `requestId`, `decision`, `reasonCode`, `ruleIds` 5개 필드를 유지합니다.
- `scripts/decider-test.mjs`
  - 정상 가상 요청, 미등록 기기, 복합 이상 접속, 유효한 추가 확인을 마친 복합 이상 요청을 검사합니다.
- `scripts/fixture-7.mjs`
  - 정상 사건과 복합 이상 사건의 가상 판정을 확인합니다.
- `src/attack-check.mjs`
  - 기존 단계의 검사를 유지하면서 7단계의 가상 판정 검사를 추가합니다.

### 로컬 검증

```bash
npm run decider:test
npm run fixture:7
```

확인된 결과:

- 등록 기기의 정상 가상 요청: `allow`
- 미등록 기기의 가상 요청: `deny`
- 복합 이상 가상 요청: `step_up`
- 엔진이 `stepUp.verified: true`와 0~900 범위의 정수 `authAgeSeconds`를 전달한 재확인 복합 이상 요청: `allow`

이 결과는 로컬 가상 테스트 결과입니다. 실제 서비스의 재인증 연동, 민감 자료 접근 차단 또는 심판 통과를 증명하지 않습니다.

### 실제 연동 관련 제한

- 복합 이상 가상 요청은 추가 확인 전 `step_up`으로 판정합니다.
- 엔진이 `stepUp.verified: true`와 0~900 범위의 정수 `authAgeSeconds`를 전달한 재확인 요청은 다시 판정해 `allow`합니다.
- 미등록 기기는 재확인 여부와 관계없이 기존 `device_registered` 규칙으로 거부합니다.
- 지역 하나만으로는 추가 확인이나 영구 차단을 결정하지 않습니다.

`stepUp.verified`와 `authAgeSeconds`는 판정기 요청 계약에 포함된 엔진 제공 값이므로 가상 판정에서는 이를 사용해 재확인 뒤 요청을 다시 판정합니다.

다만 이 로컬 판정 결과만으로 실제 서비스에서 새 로그인 시각 검증과 재인증 흐름이 운영 엔진에 연결되어 있다고 주장하지 않습니다. `judge_fixture` 신호와 `npm run decider:test`는 가상 시험이며 실제 재인증 연동 및 심판 통과 여부는 별도로 확인합니다.

또한 `judge_fixture` 신호는 테스트 데이터입니다. 실제 위치·시간·네트워크 정보를 수집하거나 검증한 결과로 취급하지 않습니다.

### 심판 제출 전 확인 사항

- `aleph.config.json`의 `step`이 `7`인지 확인합니다.
- `npm run bundle`을 실행하고 첫 번째 오류부터 확인합니다.
- `reasonCode`가 운영 계약의 허용 목록에 포함되는지 확인합니다.
- 번들 결과에 실제 토큰, 비밀번호, 개인 키 또는 개인정보가 포함되지 않는지 확인합니다.
- `bundle-notes.json`과 `artifacts/submission.json`은 Git 커밋에 포함하지 않습니다.
- 배포 및 심판 결과는 실제 실행 결과를 확인한 뒤에만 기록합니다.

## 8단계 현재 상태 — 자료마다 갈 수 있는 구역을 나눕니다

8단계에서는 로그인 여부만 확인하는 것에서 더 나아가 사용자·기기·동작·정확한 자원 경로를 함께 확인하고, 실제 자료 API에서도 저장된 소유자와 서버 권한을 다시 대조합니다.

기존 1~7단계의 로그인, 소유권 보호, 원본 REST 보호, 등록 기기 판정, 복합 이상 접속 추가 확인 규칙은 유지합니다.

### 자원 ID

`src/resource-id.mjs`에서 메모와 강사 공지를 서로 다른 자원 영역으로 구분합니다.

- 개별 메모: `notes:<id>`
- 본인 메모 목록: `notes:list`
- 강사 공지: `announcements:<id>`

기존 메모 데이터와 `/api/notes`, `/api/notes/:id` 주소는 변경하지 않았습니다. 화면 메뉴도 이번 단계에서 변경하지 않았습니다.

자원 ID는 브라우저가 임의로 전달하는 `role`, `userId` 또는 소유자 값에서 만들지 않습니다.

### `resource_scope` 판정 규칙

`src/decider.mjs`의 `RULE_IDS`에는 기존 규칙과 함께 다음 규칙이 등록되어 있습니다.

- `device_registered`
- `step_up_required`
- `resource_scope`

판정 순서는 다음과 같습니다.

1. 등록되지 않은 기기는 `device_registered` 규칙으로 거부합니다.
2. 신호 구조가 유효하지 않거나 추가 확인이 필요한 복합 이상 요청은 `step_up_required` 규칙으로 다시 확인을 요구합니다.
3. 위 검사를 통과한 요청은 `resource_scope` 규칙에서 사용자·기기·메서드·정확한 자원 경로를 확인합니다.
4. 허용된 자원 연결과 일치하지 않으면 `deny / resource_not_allowed`로 거부합니다.

자원 판정에는 SDP 엔진이 확인한 다음 요청 값을 사용합니다.

- `classId`
- `projectId`
- `subjectId`
- `deviceId`
- `service`
- `method`
- `path`
- `route`
- `queryLength`

판정기 계약에 없는 `role`, `ownerId`, Supabase 사용자 UUID 등의 필드를 요청에 새로 만들지 않습니다.

`subjectId`는 엔진이 제공하는 가명 주체이므로 Supabase Auth의 사용자 UUID와 직접 비교하지 않습니다.

### 정확한 경로 판정

메모 단건은 정확한 `/notes/:id` 형태에서만 판정합니다.

현재 Stage 8 가상 연결에서 허용하는 정상 예시는 다음과 같습니다.

- `GET /notes/demo`
- `PUT /notes/demo`
- `GET /notes`

본인 메모 목록은 `notes:list` 자원으로 별도 구분합니다.

다음과 같은 요청은 자원으로 인정하지 않습니다.

- `/notes/export`
- `/notes/:id/extra`와 같은 추가 깊이 경로
- 허용하지 않은 메서드
- 경로와 `route`가 서로 다른 요청
- 쿼리를 이용해 다른 기능을 선택하는 요청
- 서버 자원 연결과 주체·기기·경로가 일치하지 않는 요청

따라서 `:id`와 같은 깊이에 `export` 같은 기능 이름을 넣어 자원 판정을 우회하지 못하도록 합니다.

### 서버 자원 연결

Stage 8 판정기는 자원 소유권과 강사 권한을 클라이언트 입력에서 가져오지 않습니다.

기본 가상 판정 연결에는 `learner_fixture`, 등록 기기, `notes:demo`, `notes:list` 관계만 포함되어 있습니다. 이는 Stage 8 로컬 판정과 제공된 fixture를 위한 연결입니다.

별도의 운영 자원 연결이 필요한 환경에서는 서버의 `ALEPH_RESOURCE_BINDINGS` JSON 설정으로 확인된 주체·기기·서비스·경로·자원·권한을 연결할 수 있습니다.

강사 공지 수정은 자원 연결에 서버 측 `instructor: true`가 확인되어야 판정기에서 허용될 수 있습니다.

브라우저가 요청 본문에 다음과 같이 전달하더라도 강사 권한의 근거로 사용하지 않습니다.

```json
{
  "role": "instructor"
}
```

### 메모 API의 소유자 재검증

`api/notes.js`의 목록 조회는 기존과 같이 검증된 로그인 사용자의 `owner_id`만 조회합니다.

8단계에서는 조회 결과를 반환하기 직전에도 모든 행의 저장된 `owner_id`가 검증된 `authentication.userId`와 같은지 다시 확인합니다.

따라서 목록 쿼리 조건이 잘못 변경되거나 예상하지 못한 행이 반환되더라도 다른 사용자의 자료를 그대로 응답하지 않습니다.

`api/notes/[id].js`의 단건 GET도 다음 두 단계를 모두 사용합니다.

1. DB 조회 단계에서 `public_id`와 로그인 사용자의 `owner_id`를 함께 조건으로 사용합니다.
2. 조회된 행의 실제 `owner_id`를 `authentication.userId`와 다시 비교합니다.

소유자가 일치하지 않으면 다른 메모의 존재 여부를 별도로 노출하지 않도록 `404 NOTE_NOT_FOUND`로 처리합니다.

기존 PUT·DELETE의 저장된 `owner_id` 비교와 소유자 조건 쿼리도 유지합니다.

### 강사 공지 수정 API

8단계에서 다음 서버 API를 추가했습니다.

```text
PUT /api/announcements/:id
```

`aleph.config.json`의 `allowedRoutes`에도 같은 경로를 등록했습니다.

공지 수정 API는 다음 순서로 권한을 확인합니다.

1. 기존 서버 로그인 검증으로 실제 로그인 사용자를 확인합니다.
2. 요청 본문의 `role`, `userId` 또는 화면 메뉴 상태를 권한 근거로 사용하지 않습니다.
3. 서버의 `vault_instructors.user_id`와 검증된 `authentication.userId`를 비교합니다.
4. 강사 권한 조회 실패, 권한 없음 또는 사용자 불일치는 `403 ANNOUNCEMENT_FORBIDDEN`으로 거부합니다.
5. 강사 권한이 확인된 경우에만 `vault_announcements`의 지정된 공지를 수정합니다.

요청 본문에는 `title`, `body`만 허용합니다. `role`과 같은 추가 필드를 넣어 권한을 위조하려는 요청은 유효한 공지 수정 본문으로 인정하지 않습니다.

### 강사 공지 기능의 현재 제한

현재 저장소에는 `vault_instructors`와 `vault_announcements` 테이블을 생성하거나 실제 강사를 배정하는 DB 변경 작업을 포함하지 않았습니다.

따라서 해당 서버 권한 데이터가 준비되지 않은 환경에서는 공지 수정 요청이 기본 거부됩니다.

현재 확인한 것은 다음 범위입니다.

- 클라이언트 `role`을 권한 근거로 사용하지 않음
- 검증된 로그인 사용자 ID를 서버 강사 권한과 대조하도록 구현
- 강사 권한 조회 실패 시 기본 거부
- 일반 학생의 공지 수정에 대한 판정기 자원 구역 거부

실제 강사 계정의 공지 수정 성공은 DB 권한 데이터와 공지 자료가 준비된 운영 환경에서 별도로 확인해야 합니다.

### 8단계 로컬 판정 확인

기존 7단계 회귀 검사를 다시 실행했습니다.

`npm run fixture:7`:

```text
정상 사건: allow
복합 이상 사건: step_up
```

`npm run decider:test`:

```text
통과 · 등록 기기의 정상 요청
통과 · 미등록 기기의 가상 요청
통과 · 복합 이상 접속
통과 · 다시 확인한 복합 이상 접속
```

추가한 Stage 8 자원 구역 가상 판정에서는 다음 결과를 확인했습니다.

```text
본인 메모 목록: allow
다른 주체 목록: deny
기능 경로: deny
```

또한 별도 직접 판정에서 다음 조건을 확인했습니다.

- 본인 메모 GET: `allow`
- 본인 메모 PUT: `allow`
- 다른 주체의 본인 메모 요청: `deny`
- 쿼리가 포함된 자원 요청: `deny`
- `export` 기능 이름 경로: `deny`
- 클라이언트가 강사 역할을 주장하는 것만으로는 공지 수정 권한을 얻지 못함
- 서버 자원 연결에 `instructor: true`가 있는 경우에만 강사 공지 자원 권한을 인정할 수 있음

이 결과는 모두 로컬 가상 판정 결과이며 실제 심판 통과를 의미하지 않습니다.

### 8단계 직접 공격 점검

`src/attack-check.mjs`는 8단계를 인식하도록 확장했습니다.

기존 비로그인 API, 정적 자료, 원본 Supabase REST, 등록 기기, 복합 이상 접속 검사를 유지하면서 다음 Stage 8 가상 검사를 추가했습니다.

- 본인 메모 단건·목록 정상 허용
- 다른 주체의 메모 단건·목록 거부
- `/notes/export`와 같은 기능 경로 거부
- 강사 권한 연결이 없는 학생의 공지 수정 거부

기존 6·7단계 자기점검 요청에도 현재 판정기 계약의 사용자·기기·서비스·경로 정보를 포함하여 `resource_scope` 추가 이후에도 이전 단계 판정을 계속 검증할 수 있도록 했습니다.

`src/attack-check.mjs`의 Stage 8 전체 실행 결과는 최종 저장점 커밋 후 `npm run bundle` 과정에서 확인합니다.

### 제출 설정

`aleph.config.json`은 8단계 구현에 맞춰 다음 상태로 변경합니다.

- `step`: `8`
- 기존 `judgeIssuer` 유지
- 기존 `identityProvider` 유지
- 기존 `originalApiUrl` 유지
- 기존 메모 API 경로 유지
- `PUT /api/announcements/:id` 추가

`resource_scope` 규칙은 `package/POLICIES.md`에도 실제 구현 규칙으로 기록합니다.

### 현재 검증 상태

현재까지 확인된 상태를 구분하면 다음과 같습니다.

- 자원 ID 구분 구현: 완료
- `resource_scope` 판정 구현: 완료
- 기존 6·7단계 로컬 회귀 테스트: 통과
- Stage 8 본인 목록/타 주체 목록/기능 경로 로컬 판정: 통과
- 메모 API 소유자 반환 전 재검증: 구현 완료
- 강사 공지 서버 권한 검증 API: 구현 완료
- `node --check` 정적 구문 검사: 통과
- `git diff --check`: 통과
- 실제 Stage 8 운영 배포: 아직 확인하지 않음
- 실제 A/B 계정 간 운영 API 구역 차단: 아직 확인하지 않음
- 실제 강사 계정 공지 수정: 아직 확인하지 않음
- Stage 8 `npm run bundle`: 아직 실행하지 않음
- Stage 8 심판 판정: 아직 제출하지 않음

로컬 테스트, 직접 점검 및 제출 묶음 생성 성공은 각각 별개의 검증 단계이며 심판 통과와 동일하게 취급하지 않습니다.

### 8단계 구역 규칙 재검증 저장점

8단계의 자원 구역 판정을 실제 서버 API와 심판 요청 계약에 맞게 다시 정리했습니다.

현재 구조는 다음과 같습니다.

- 메모와 강사 공지는 서버가 서로 다른 자원 ID로 구분합니다.
  - 메모 단건: `notes:<id>`
  - 메모 목록: `notes:list`
  - 강사 공지 단건: `announcements:<id>`
- 자원 ID는 브라우저가 전달한 값을 신뢰하지 않고 서버 라우트와 검증된 자료 ID로 생성합니다.
- `aleph.config.json`의 `allowedRoutes`는 각 API 경로에 `service`, `method`, `pathPattern`, `zone`을 명시합니다.
  - 메모 API: `my-notes`
  - 강사 공지 수정 API: `instructor-materials`
- `src/decider.mjs`는 `aleph.decision.v1` 계약에 실제로 존재하는 값만 사용합니다.
- 판정기는 자료의 실제 소유자를 추측하지 않고 등록 기기, 복합 이상 접속, 정확한 서비스·메서드·경로·route 구역만 판정합니다.
- 일반 메모 전체 목록이나 `export`, `admin` 같은 기능 경로는 단건 자료 구역으로 허용하지 않습니다.
- 메모 단건의 실제 소유권은 최종 API가 `authentication.userId`와 DB의 `owner_id`를 다시 비교해 확인합니다.
- `/api/notes` 목록도 인증 사용자의 `owner_id`로 조회 범위를 제한합니다.
- 메모 생성 시 `owner_id`는 서버가 인증 사용자 ID로 지정합니다.
- 강사 공지 수정은 요청 body의 `role`을 신뢰하지 않고 서버의 `vault_instructors`에서 로그인 사용자의 강사 권한을 확인합니다.
- 기존 7단계의 등록 기기 및 복합 이상 접속 `step_up` 규칙은 유지합니다.

로컬 재검증:

```bash
node --test test/stage8-api-guard.test.mjs
node --test test/stage8-decider.test.mjs
node --test test/stage8-resource-id.test.mjs
npm run fixture:7
npm run decider:test
git diff --check
```

확인된 로컬 결과:

- Stage 8 API guard: 7/7 통과
- Stage 8 decider: 15/15 통과
- Stage 8 resource ID: 6/6 통과
- Stage 7 fixture: 정상 요청 `allow`, 복합 이상 요청 `step_up`
- `npm run decider:test`: 4개 가상 요청 통과
- `git diff --check`: 통과

이 결과는 로컬 정적 검사와 가상 요청 자기점검 결과이며, 실제 심판 통과나 배포 성공을 의미하지 않습니다.

## 8단계 최종 결과

8단계 자원 구역 판정과 API 소유권 검증을 최종 수정한 뒤 Git push, PR merge, Vercel 배포 및 심판 제출까지 완료했습니다.

최종 `main` 기준 merge 커밋:

```text
a952b28 Merge pull request #45 from SuperNova080710/stage8-fix-resource-routing
```

사용자가 최종 심판 결과를 직접 확인했으며 **8단계는 통과 완료 상태**입니다.

앞선 8단계 기록 중 실제 배포·심판 제출이 아직 확인되지 않았다고 적힌 부분은 당시 중간 저장점의 상태이며, 현재 최신 상태는 이 절을 기준으로 합니다.

## 9단계 현재 상태 — 도플갱어를 찾고 권한을 거둡니다

9단계에서는 검증된 가상 조회 사건을 별도의 탐지기로 분석하고, 같은 가명 사용자의 단시간 대량 GET 조회가 확인되면 실제 권한을 직접 변경하지 않고 `propose_revocation` 회수 제안만 생성합니다.

기존 1~8단계의 로그인, HttpOnly 쿠키 인증, Judge Bearer 인증, 등록 기기 판정, 복합 이상 접속 `step_up`, 자원 구역 판정 및 최종 API의 소유권·강사 권한 검증은 유지합니다.

### 탐지 사건 계약

`src/detect.mjs`를 수정하기 전에 `docs/DETECT_EVENTS.md`의 9단계 가상 사건 계약을 확인했습니다.

로컬 `detect(events)`에 전달되는 사건은 다음 값만 사용합니다.

```
at
method
identity.sub
```

- `identity.sub`는 운영 측이 검증하여 전달하는 가명 주체로 취급합니다.
- 브라우저가 임의로 보낸 사용자 번호를 신원으로 사용하지 않습니다.
- 메모 제목·본문, 토큰, 비밀번호, 실명 또는 서버 전용 비밀값을 탐지 입력으로 저장하거나 출력하지 않습니다.
- 현재 로컬 사건 계약에는 `deviceId`, `network`, `region`, 기존 판정 결과가 없습니다.
- 따라서 계약에 없는 기기나 네트워크 값을 `src/detect.mjs`에서 임의로 만들어 사용하지 않습니다.

### `burst_read` 탐지 규칙

`src/detect.mjs`는 가명 사용자별 GET 사건을 분리하여 검사합니다.

탐지 조건:

```
같은 identity.sub
+
GET 요청
+
어느 연속 10분 구간에서든
+
120건 초과
```

조건을 만족하면 다음 결과를 반환합니다.

```
{
  "action": "propose_revocation",
  "reasonCode": "burst_read",
  "subject": "해당 가명 사용자"
}
```

그 밖의 사건은 다음 결과를 유지합니다.

```
{
  "action": "observe"
}
```

경계 조건:

- 정확히 120건은 `observe`
- 121건부터 `propose_revocation`
- 서로 다른 `identity.sub`의 사건은 합산하지 않음
- 전체 사건이 많아도 같은 10분 구간에 121건이 없으면 회수 제안을 내지 않음
- GET이 아닌 요청은 `burst_read` 집계에 포함하지 않음
- 사건 배열 순서를 신뢰하지 않고 사용자별 시각을 정렬한 뒤 10분 슬라이딩 윈도우를 검사함

### 회수 제안의 범위

`propose_revocation`은 실제 세션이나 기기 권한을 직접 변경하는 동작이 아닙니다.

9단계 구현에서는 다음 작업을 하지 않습니다.

```
세션 직접 삭제
토큰 직접 폐기
기기 권한 직접 변경
Supabase 로그아웃 강제 실행
별도의 회수 API 생성
기존 allow / deny / step_up 응답 계약 변경
```

현재 로컬 `detect(events)` 계약에는 가상 기기 식별자가 없으므로 `deviceId`나 `targetDeviceId`를 임의로 생성하지 않습니다.

실제 운영 엔진의 사건 전달, 기기·세션 권한 회수, 회수된 신원이나 남은 세션의 재시도 차단, 회수까지 걸린 시간은 심판 및 운영 연동에서 별도로 확인해야 합니다.

### 9단계 직접 자기점검

`src/attack-check.mjs`가 9단계를 인식하도록 확장했습니다.

기존 3~8단계 점검을 보존하면서 다음 세 가지 가상 탐지 점검을 추가했습니다.

- 정상 조회 30건 → `observe`
- 정확히 120건 → `observe`
- 121건 폭주 조회 → `propose_revocation / burst_read`

`src/attack-check.mjs`의 전체 `attackId` 수는 20개이며 `scripts/bundle.mjs`가 허용하는 최대 20개 범위 안에 있습니다.

### 9단계 제출 설정

`aleph.config.json`은 9단계에 맞춰 다음과 같이 변경했습니다.

```
step: 9
```

다음 기존 설정은 변경하지 않았습니다.

- `repoUrl`
- `publicAppUrl`
- `judgeIssuer`
- `identityProvider`
- `allowedRoutes`
- `originalApiUrl`
- `restoreRoute`

8단계에서 심판을 통과한 route zone 설정과 기존 API 허용 경로를 그대로 유지합니다.

### 정책 기록

`package/POLICIES.md`에 실제 구현된 9단계 탐지 규칙을 추가했습니다.

```
burst_read
```

또한 8단계 정책 이름은 실제 구현과 맞게:

```
resource_zone
```

으로 기록합니다.

### 9단계 로컬 검증

실행한 검사:

```
node --check src/detect.mjs
node --check src/attack-check.mjs
npm run detect:test
git diff --check
```

확인된 결과:

```
통과 · 정상 조회 30건
통과 · 10분 안에 120건
통과 · 10분 안에 121건
통과 · 폭주 조회 200건
통과 · 서로 다른 사용자 각 100건
통과 · 10분 밖으로 흩어진 조회 200건
```

`src/attack-check.mjs`의 `attackId` 개수:

```
20
```

구문 검사와 `git diff --check`도 오류 없이 통과했습니다.

### 현재 검증 상태

현재 상태를 구분하면 다음과 같습니다.

- 9단계 사건 입력 최소화: 구현 완료
- 사용자별 GET 사건 분리: 구현 완료
- 10분 슬라이딩 윈도우: 구현 완료
- 정확히 120건 경계 처리: 구현 완료
- 121건 이상 `burst_read` 탐지: 구현 완료
- `propose_revocation` 제안 생성: 구현 완료
- 정상 사건 `observe` 유지: 구현 완료
- 다른 사용자 사건 비합산: 구현 완료
- 10분 밖 사건 비합산: 구현 완료
- `npm run detect:test`: 6개 가상 사건 모두 통과
- `node --check src/detect.mjs`: 통과
- `node --check src/attack-check.mjs`: 통과
- `git diff --check`: 통과
- 실제 운영 엔진의 사건 전달: 아직 확인하지 않음
- 실제 기기·세션 권한 회수: 아직 확인하지 않음
- 회수된 신원으로 다음 요청 재시도 차단: 아직 확인하지 않음
- 남은 탈취 세션 재접속 차단: 아직 확인하지 않음
- 회수된 도플갱어의 다른 자원 이동 차단: 아직 확인하지 않음
- 회수까지 걸린 시간 측정: 아직 확인하지 않음
- 9단계 Vercel 배포: 아직 확인하지 않음
- 9단계 심판 제출: 아직 확인하지 않음
- 9단계 심판 통과: 아직 확인하지 않음

`npm run detect:test`와 `src/attack-check.mjs`는 가상 사건에 대한 학생 자기점검입니다. 이 결과만으로 실제 접속 회수, 운영 엔진 연결 또는 심판 통과를 주장하지 않습니다.

## 9단계 최종 결과 갱신

9단계 변경은 `stage9` 브랜치에서 구현한 뒤 PR #46으로 `main`에 병합했습니다.

9단계 구현 저장점:

```text
fc33950 feat: 9단계 도플갱어 탐지 및 회수 제안 추가
```

9단계 병합 커밋:

```text
8eb5ac9 Merge pull request #46 from SuperNova080710/stage9
```

배포와 심판 제출을 완료했고, 사용자가 심판 결과를 직접 확인했습니다.

**9단계 최종 결과: 100점 통과**

앞선 9단계 기록 중 배포·심판 제출·심판 통과가 아직 확인되지 않았다고 적힌 부분은 당시 저장점의 상태이며, 현재 최신 상태는 이 절을 기준으로 합니다.

---

## 10단계 현재 구현 상태 — 백업에서 자료실을 되살립니다

10단계에서는 운영 판정 정책이나 전체 자료를 무조건 덮어쓰지 않고 다음 두 복구 대상을 분리했습니다.

1. 검증된 안전 정책 사본에서 시험 정책의 변경된 항목만 복원
2. 비공개 메모 사본에서 지정된 메모 한 건만 복원

### 정책 복구

안전 정책 사본:

```text
recovery/safe-policy.json
```

현재 시험 정책:

```text
recovery/test-policy.json
```

정책 복구 관련 구현:

```text
src/policy-recovery.mjs
scripts/policy-preview.mjs
scripts/policy-restore.mjs
```

안전 정책 사본은 다음 값으로 검증합니다.

- 백업 schema
- 백업 version
- 9단계 100점 통과 당시 source commit
- 정책 내용의 canonical SHA-256

검증 실패 또는 사본 부재 시 복구를 중단합니다.

복구 실행 전에는 반드시 변경 예정 항목을 먼저 표시합니다.

제작 과정에서 사용한 시험 정책에서는 다음 차이를 확인했습니다.

```text
notes.otherOwnerRead
현재 시험 정책: true
검증된 안전 정책: false
```

검증된 버전을 명시하지 않으면 실제 시험 정책 복구를 수행하지 않습니다.

정책 복구는 전체 정책 객체를 덮어쓰지 않고 미리보기에서 확인된 변경 경로만 안전 사본의 값으로 되돌립니다.

현재 로컬에서 확인한 결과:

- 안전 정책 사본 검증: 통과
- 안전 정책 사본 누락 시 중단: 통과
- 안전 정책 사본 변조 시 중단: 통과
- 복구 전 변경 범위 표시: 통과
- 잘못된 백업 버전으로 복구 요청 시 중단: 통과
- 검증된 버전으로 시험 정책 복구: 통과
- 복구 뒤 정책 차이 0건 확인: 통과
- A의 자기 자료 허용 정책 유지: 통과
- B의 A 자료 요청 거부 정책 복원: 통과
- 공지 서비스 정책 보존: 통과

이 정책 파일은 10단계 복구 절차를 검증하기 위한 시험 정책이며 `src/decider.mjs`의 실제 운영 판정 계약을 대체하지 않습니다.

### 메모 사전 백업

서버 전용 메모 사본 테이블:

```text
public.virtual_note_backups
```

DB 준비 스크립트:

```text
supabase/stage-10.sql
```

현재 백업 테이블은 다음 조건으로 구성했습니다.

- Row Level Security 활성화
- `PUBLIC` 직접 권한 제거
- `anon` 직접 권한 제거
- `authenticated` 직접 권한 제거
- `owner_id`가 확인되는 메모만 백업
- 기존 백업과 같은 `public_id`가 있으면 덮어쓰지 않음
- 각 메모의 `content` SHA-256 저장

사전 백업 검증 결과:

```text
backup_count = 6
valid_hash_count = 6
```

백업 6건 모두 현재 원본과 다음 값이 일치하는 것을 확인했습니다.

- `public_id`
- `owner_id`
- `content` SHA-256

RLS 활성화와 일반 클라이언트 역할의 직접 접근 권한 제거도 확인했습니다.

### 메모 단건 복구 경로

복구 서비스:

```text
note-recovery
```

복구 경로:

```text
POST /api/restore/:id
```

설정:

```text
aleph.config.json
step = 10
restoreRoute = /api/restore/:id
```

복원 요청은 다음 순서로 검증합니다.

1. POST 요청인지 확인
2. 요청 ID가 UUID인지 확인
3. 인증 사용자 확인
4. 비공개 백업에서 요청 ID 한 건만 조회
5. 요청 ID와 백업 `public_id` 대조
6. 인증 사용자와 백업 `owner_id` 대조
7. 백업 `content`를 다시 SHA-256하여 저장된 해시와 대조
8. 같은 ID의 현재 메모가 다른 사용자의 소유라면 중단
9. 대상 한 건만 UPDATE 또는 INSERT
10. 저장 결과의 ID·소유자·내용 SHA-256을 다시 검증

복구 응답에는 메모 본문을 포함하지 않습니다.

현재 helper 검증 결과:

- 정상 백업 검증: 통과
- 다른 ID: 거부 확인
- 다른 소유자: 거부 확인
- 변조된 백업 내용: 거부 확인

실제 시험 계정 B의 메모를 심판이 변조하거나 삭제한 뒤 `POST /api/restore/:id`로 되살리는 시험은 아직 실행하지 않았습니다.

---

## 10단계 제작 4 — 복구 후 1~9단계 재시험 순서

복구가 실행된 뒤에는 복구 성공 여부만 확인하지 않고 이전 단계에서 막고 있던 요청이 다시 허용되지 않았는지 순서대로 재검증합니다.

현재 아래 절차 중 실제 시험 계정 B의 복구 이후 수행해야 하는 항목은 **미실행** 상태입니다. 미실행 결과를 통과로 기록하지 않습니다.

### 0. 복구 직전 사본 재검증

상태: **사전 검증 실행 완료 / 실제 사고 직전 재검증은 미실행**

확인 항목:

1. 안전 정책 사본의 version과 SHA-256을 다시 검증
2. 메모 백업의 ID·소유자·내용 SHA-256을 다시 검증
3. 복원 대상 ID가 정확히 한 건인지 확인
4. 실행 전에 바뀔 정책 항목을 미리보기로 확인

정책 미리보기:

```bash
node scripts/policy-preview.mjs
```

정책 사본이나 메모 사본 검증이 실패하면 복구를 실행하지 않습니다.

### 1. 시험 정책 복구

상태: **로컬 시험 정책에서는 실행 완료 / 심판 사고 이후 재실행은 미실행**

순서:

```bash
node scripts/policy-restore.mjs
```

변경 예정 항목을 확인한 뒤 검증된 버전을 명시하여 실행합니다.

```bash
node scripts/policy-restore.mjs --apply stage9-100-fc33950
```

복구 후 다시:

```bash
node scripts/policy-preview.mjs
```

를 실행하여 안전 정책 범위의 차이가 0건인지 확인합니다.

기대 결과:

```text
A → A 자료 요청: 허용 유지
B → A 자료 요청: 다시 거부
다른 서비스 정책: 기존 값 유지
```

### 2. 시험 계정 B 메모 한 건 복원

상태: **미실행**

이 시험은 심판 또는 시험 환경에서 B 소유의 지정된 가상 메모가 변조되거나 삭제된 뒤 수행합니다.

대상:

```text
POST /api/restore/<B의 지정 메모 ID>
```

확인할 값:

- 응답 `id`가 요청한 백업 ID와 같은가
- `ownerVerified`가 `true`인가
- 응답 `contentSha256`이 사본의 SHA-256과 같은가
- 다른 메모가 변경되지 않았는가
- 기존 감사 기록이 삭제되거나 수정되지 않았는가

메모 본문이나 인증 토큰은 검증 기록에 남기지 않습니다.

### 3. 1~5단계 대표 자료·인증 방어 재검증

상태: **복구 후 미실행**

현재 `src/attack-check.mjs`에서 사용하는 대표 확인 기준:

```text
anonymous_api_note_read
invalid_token_api_note_read
anonymous_api_note_detail
anonymous_api_note_update
anonymous_api_note_delete
anonymous_static_note_read
public_html_no_supabase_key
public_html_no_supabase_url
public_key_direct_rest_read
```

기대 결과:

- 비로그인 메모 조회 거부
- 잘못된 토큰 조회 거부
- 비로그인 상세 조회 거부
- 비로그인 수정·삭제 거부
- 공개 `data.json`에서 비공개 가상 메모 노출 없음
- 공개 HTML에 Supabase URL/Publishable Key 직접 사용 없음
- 공개 키를 사용한 원본 REST 직접 조회 거부

### 4. 6단계 등록 기기 방어 재검증

상태: **복구 후 미실행**

재실행:

```bash
npm run decider:test
```

기대 결과:

```text
등록 기기의 정상 요청 → allow
미등록 기기 → deny / device_not_registered
```

### 5. 7단계 복합 이상 접속 재검증

상태: **복구 후 미실행**

재실행:

```bash
npm run fixture:7
npm run decider:test
```

기대 결과:

```text
정상 요청 → allow
복합 이상 요청 → step_up
유효한 추가 확인 뒤 재시도 → allow
```

### 6. 8단계 자원 구역·소유권 재검증

상태: **복구 후 미실행**

로컬 판정·API 회귀 검사:

```bash
node --test test/stage8-resource-id.test.mjs
node --test test/stage8-decider.test.mjs
node --test test/stage8-api-guard.test.mjs
```

기대 결과:

```text
본인 메모 단건 정상 요청 → 허용
다른 사용자의 메모 → 최종 API에서 거부
메모 전체 목록을 단건 자원으로 위장 → 거부
export/admin 등 기능 경로를 자원 ID로 위장 → 거부
일반 학생의 강사 공지 수정 → 거부
```

실제 A/B 시험 계정을 이용한 배포 환경의 타인 자료 접근 재시험은 아직 미실행입니다.

### 7. 9단계 대량 조회 탐지 재검증

상태: **복구 후 미실행**

재실행:

```bash
npm run detect:test
```

기대 결과:

```text
정상 조회 30건 → observe
10분 안 정확히 120건 → observe
10분 안 121건 → propose_revocation / burst_read
서로 다른 사용자의 사건 → 합산하지 않음
10분 밖 사건 → 같은 폭주로 합산하지 않음
```

`propose_revocation`은 회수 제안이며 실제 기기·세션 회수 성공을 의미하지 않습니다.

### 8. 전체 복구 후 최종 자기점검

상태: **미실행**

10단계 저장점 커밋 이후 다음 순서로 최종 제출 묶음을 생성합니다.

```text
정책 사본 검증
→ 지정 메모 복원 검증
→ 1~9단계 대표 정상·금지 요청 재검증
→ git diff / 비밀값 검사
→ 10단계 저장점 커밋
→ npm run bundle
```

`npm run bundle`의 공격 자기점검 결과는 학생의 직접 점검 결과이며 심판 판정으로 기록하지 않습니다.

---

## 10단계 현재 검증 상태

현재까지 실제로 확인한 내용:

- 정책 사본 SHA-256 검증: 통과
- 정책 사본 누락 시 중단: 통과
- 정책 사본 변조 시 중단: 통과
- 정책 복구 전 변경 범위 표시: 통과
- 시험 정책 선택 항목 복원: 통과
- A 정상 정책 유지 / B의 A 자료 정책 거부: 통과
- 다른 서비스 정책 보존: 통과
- 비공개 메모 백업 테이블 생성: 완료
- 메모 백업 6건 생성: 완료
- 백업 6건 SHA-256 형식 검증: 통과
- 백업 ID·소유자·내용 해시 원본 일치: 통과
- 백업 테이블 RLS 활성화: 확인
- PUBLIC / anon / authenticated 직접 권한 제거: 확인
- 메모 백업 helper ID 검증: 통과
- 메모 백업 helper 소유자 검증: 통과
- 메모 백업 helper 내용 해시 검증: 통과
- 기존 decider 가상 요청 회귀: 통과
- 기존 Stage 7 fixture 회귀: 통과
- 기존 Stage 8 테스트 회귀: 통과
- 기존 Stage 9 detect 테스트 회귀: 통과
- `aleph.config.json` step 10: 적용 완료
- `restoreRoute = /api/restore/:id`: 적용 완료

아직 실행하지 않은 내용:

- 심판이 변조한 시험 계정 B 메모 실제 복원: 미실행
- 심판이 삭제한 시험 계정 B 메모 실제 복원: 미실행
- 복구 직후 실제 A/B 계정 접근 재시험: 미실행
- 복구 직후 배포 환경의 1~9단계 대표 공격 재전송: 미실행
- 10단계 Vercel 배포: 미실행
- 10단계 `npm run bundle`: 미실행
- 10단계 심판 제출: 미실행
- 10단계 심판 판정: 미실행

로컬 검증 결과, 데이터베이스 사전 백업 검증, 실제 배포, 심판 판정은 서로 다른 검증 단계로 취급합니다.

## 10단계 최종 결과 갱신

> 이 절은 위쪽에 남아 있는 10단계 제출 전 상태 기록보다 최신입니다.

- 브랜치: `stage10`
- 구현 저장점: `c30eaf8` (`feat: 10단계 저장점`)
- main 병합: `fd9472f` (`Merge pull request #47 from SuperNova080710/stage10`)
- PR: `#47`
- Vercel 배포: 완료
- `npm run bundle`: 통과
- 심판 제출: 완료
- 심판 판정: **100점 통과**

따라서 위쪽 10단계 문서에서 `bundle 미실행`, `Vercel 배포 미실행`, `심판 판정 미실행`으로 적힌 부분은 당시 저장점 이전의 역사적 상태이며 현재 상태를 의미하지 않습니다.

10단계에서 사용한 실제 복구 경로는 다음과 같습니다.

```text
POST /api/restore/:id
```

`aleph.config.json`의 `restoreRoute`도 이 실제 경로와 일치해야 합니다.

---

## 11단계 — 나만의 접속 앱을 완성합니다

### 목표

기존 BYTE BACK 자료실을 설치형 웹앱으로 제공하면서, 앱 설치 여부 자체를 기기 신뢰 근거로 사용하지 않습니다.

보호 자료는 로그인만으로 표시하지 않으며 서버가 등록 기기로 확인하고 현재 실행 세션이 해당 기기 개인키를 보유한 경우에만 기존 자료실을 엽니다.

기기 개인키나 승인 토큰은 브라우저 영구 저장소에 저장하지 않습니다.

### 제작 1 — 설치형 웹앱 화면

추가한 공개 리소스:

```text
public/manifest.webmanifest
public/app-icon.svg
```

`public/index.html`에 다음을 추가했습니다.

```text
Web App Manifest 연결
설치형 실행 여부 표시
온라인 / 오프라인 상태 표시
기기 승인 상태 표시
설치 여부와 기기 승인 여부가 별개라는 안내
```

설치형 앱으로 실행되고 있다는 사실만으로 `approved` 상태를 만들지 않습니다.

오프라인 상태에서는 보호 자료를 새로 읽거나 기기 승인 상태를 확인할 수 없다고 표시합니다.

### 제작 2 — 서버 기기 승인

서버 전용 테이블:

```text
public.vault_devices
public.vault_device_request_nonces
```

두 테이블 모두 RLS를 활성화했으며 다음 역할의 직접 테이블 권한을 제거했습니다.

```text
PUBLIC
anon
authenticated
```

기기 승인 관련 API:

```text
POST /api/device/request
POST /api/device/approve
GET  /api/device/status
```

승인 흐름:

```text
로그인
→ 브라우저 메모리에서 P-256 키 생성
→ 서버에 공개키와 기기 승인 요청
→ 서버가 pending 기기와 일회용 challenge 생성
→ 브라우저가 개인키로 challenge 서명
→ 서버가 저장된 공개키로 서명 검증
→ 검증 성공 뒤에만 approved
→ 별도 상태 API로 서버 승인 결과 재확인
→ 승인 확인 뒤 보호 자료 표시
```

승인 버튼 클릭 자체는 승인으로 처리하지 않습니다.

### 기기 키 저장 정책

기기 개인키는 현재 페이지 실행 중 JavaScript 메모리에만 존재합니다.

다음 브라우저 저장소에는 기기 키나 승인 토큰을 기록하지 않습니다.

```text
localStorage
sessionStorage
IndexedDB
```

서버는 기기 공개키만 저장합니다.

기기 식별자는 JavaScript에서 읽을 수 없는 `HttpOnly` 쿠키로 관리합니다.

로그아웃 시 인증 쿠키와 함께 기기 식별 쿠키도 제거합니다.

페이지를 새로고침하여 서버에 승인 이력이 남아 있더라도 현재 실행 세션의 개인키가 사라졌다면 보호 자료를 표시하지 않습니다.

### 보호 요청 서명

브라우저의 보호된 메모 요청은 다음 값을 하나의 서명 payload에 묶습니다.

```text
HTTP method
실제 request path + query
요청 body SHA-256
timestamp
nonce
```

P-256 ECDSA / SHA-256으로 현재 메모리의 기기 개인키를 사용해 서명합니다.

서버는 실제 도착한 요청에서 같은 값을 다시 계산하여 저장된 기기 공개키로 검증합니다.

서명 검증 뒤 `(device_id, nonce)`를 서버 DB에 기록하여 같은 nonce의 재사용을 거부합니다.

### 이번 단계의 세 공격에 대한 처리

서명 없는 보호 요청:

```text
DEVICE_SIGNATURE_REQUIRED
```

서명한 뒤 요청 경로를 변경:

```text
서명 payload의 target과 실제 request target 불일치
→ DEVICE_SIGNATURE_INVALID
```

서명한 뒤 메모 수정 본문을 변경:

```text
서명 payload의 body SHA-256과 실제 요청 body SHA-256 불일치
→ DEVICE_SIGNATURE_INVALID
```

### 기존 인증 경로 보존

`authenticateRequest()`는 서버 내부에서 다음 두 인증 출처를 구분합니다.

```text
cookie
bearer
```

일반 브라우저의 HttpOnly-cookie 인증 요청에는 승인된 기기와 요청 서명을 추가로 요구합니다.

기존 심판의 Bearer 인증 경로는 이전 단계 검증 호환성을 위해 기존 인증·소유권 경로를 유지합니다.

이 `authSource` 값은 서버 내부 인증 흐름을 구분하기 위한 값이며 `src/decider.mjs`의 요청 계약에 추가되는 필드가 아닙니다.

### 승인 전 자료 차단

로그인 성공만으로 `/api/notes`를 읽지 않습니다.

```text
로그인 성공
→ 서버 기기 상태 조회
→ 미등록 / pending / revoked / 현재 기기 키 없음
   → 메모 폼 숨김
   → 실제 메모 미표시
→ 서버 approved + 현재 메모리 개인키 존재
   → 서명된 /api/notes 요청
   → 기존 자료실 표시
```

### 기존 판정기 계약

`src/decider.mjs`는 11단계에서 수정하지 않았습니다.

계속 `docs/DECIDER_REQUEST.md`에 정의된 요청 필드만 사용하며 다음과 같은 임의 요청 값을 읽지 않습니다.

```text
request.role
request.identity
request.device
request.geo
request.device.approval
```

기존 `RULE_IDS`도 그대로 유지합니다.

```text
device_registered
step_up_required
resource_zone
```

### 11단계 검증 상태

실제로 확인한 항목:

```text
manifest JSON 검증                     통과
PWA 정적 리소스 build 보존             통과
브라우저 영구 저장소 미사용             확인
P-256 challenge 정상 서명               통과
변경된 challenge 서명                   거부 확인
경로 변경 후 기존 서명                  거부 확인
본문 변경 후 기존 서명                  거부 확인
기기 테이블 RLS                         활성화 확인
PUBLIC 직접 권한                        없음 확인
anon 직접 권한                          없음 확인
authenticated 직접 권한                 없음 확인
승인 전 보호 자료 비표시                 확인
승인 뒤 기존 자료실 표시                 확인
서명 없는 cookie 보호 요청               거부 확인
기존 decider:test                       통과
기존 Stage 7 fixture                    통과
기존 Stage 9 detect:test                통과
Stage 8 resource-id 테스트              6/6 통과
Stage 8 decider 테스트                  15/15 통과
Stage 8 API guard 테스트                7/7 통과
npm run build -- --local                통과
git diff --check                        통과
```

### 11단계 최종 완료 상태

11단계는 저장점 작성, 원격 push, PR 병합, Vercel 배포 및 심판 제출까지 완료했습니다.

최종 심판 판정:

```text
11단계 심판 점수: 100점
```

11단계 심판 재확인 과정에서 `public/index.html`에 포함되어 있던 JavaScript를
`public/app.js`로 분리하여 정적 HTML과 실행 스크립트의 경계를 명확하게 했습니다.

최종 11단계가 `main`에 병합된 기준 커밋:

```
6e863aa Merge pull request #50 from SuperNova080710/stage11-fix-judge
```

주요 보완 커밋:

```
fd9ebc8 index.html에서 app.js분리
```

로컬 검증, 실제 Vercel 배포, 심판 판정은 서로 다른 검증 단계이며,
위 100점은 로컬 자체 시험 결과가 아니라 실제 11단계 심판 판정 결과입니다.

로컬 검증, 데이터베이스 설정 검증, 실제 배포, 심판 판정은 서로 다른 검증 단계로 취급합니다.

## 12단계 — 탈환 작전실을 완성합니다

### 목표

1~11단계에서 구현한 인증, 소유권, 기기 등록, 판정, 탐지, 복구 기능을
한 화면에서 확인할 수 있는 탈환 작전실을 제공합니다.

12단계에서는 과거 단계의 시험 결과를 임의로 성공 처리하지 않습니다.

실제로 현재 배포 API를 호출하여 확인한 요청만 실제 결과로 기록하고,
실행하지 않았거나 배포 환경 때문에 애플리케이션까지 도달하지 못한 요청은
`미실행`으로 남깁니다.

41종 총공세 역시 실제 ALEPH 심판이 수행하기 전에는
`41/41 통과`라고 표시하지 않습니다.

### 탈환 작전실

로그인한 사용자는 기존 자료실과 별도로 탈환 작전실을 확인할 수 있습니다.

작전실에서는 다음 항목을 표시합니다.

```text
판정기 규칙
탐지 사건 기록 상태
기기 승인·대기·회수 상태
복구 사본 버전
1~11단계 정상·금지 요청 확인표
```

작전실 조회에는 기존 Vercel Function을 재사용합니다.

```
GET /api/device/status?view=operations
```

별도의 `/api/operations` Function을 만들지 않은 이유는
Vercel Hobby 배포의 Serverless Function 개수 제한을 넘기지 않기 위해서입니다.

기존 11단계 기기 상태 API:

```
GET /api/device/status
```

의 계약은 유지합니다.

### 작전실 서버 응답

작전실 응답 스키마:

```
aleph.operations.summary.v1
```

서버에서 직접 확인하는 항목:

```
src/decider.mjs의 RULE_IDS
현재 사용자의 vault_devices 상태 집계
현재 사용자의 virtual_note_backups 버전 집계
현재 서버 확인 시각
```

작전실에서는 가상 메모 본문을 읽지 않습니다.

다음 값도 작전실 응답에 포함하지 않습니다.

```
메모 제목
메모 본문
사용자 이메일
사용자 UUID
기기 ID
기기 공개키
기기 개인키
access token
refresh token
```

### 판정기 표시

현재 판정기의 공식 규칙 ID는 다음 세 개입니다.

```
device_registered
step_up_required
resource_zone
```

`src/decider.mjs`는 계속 `docs/DECIDER_REQUEST.md`의 공식 필드만 사용합니다.

다음과 같은 임의 요청 필드는 판정에 사용하지 않습니다.

```
request.role
request.identity
request.device
request.geo
```

### 탐지 사건 표시

`src/detect.mjs`는 탐지 결과로 다음과 같은 회수 제안을 만들 수 있습니다.

```
propose_revocation
```

그러나 현재 저장소에는 실제 운영 탐지 사건을 영구 저장하는 사건 저장소가 없습니다.

따라서 작전실에서는 사건 수를 임의로 `0건`이라고 표시하지 않습니다.

현재 상태는 다음과 같이 구분합니다.

```
status: not_recorded
observedIncidentCount: null
revocationIntegration: proposal_only
```

즉, 탐지 규칙이 존재하는 것과 실제 운영 사건이 저장되었다는 것은 서로 다른 사실입니다.

### 기기 회수 상태

현재 로그인 사용자에게 속한 `vault_devices.status`만 서버에서 집계합니다.

표시하는 상태:

```
total
pending
approved
revoked
```

기기 ID나 공개키는 작전실에 노출하지 않습니다.

또한 `src/detect.mjs`의 `propose_revocation` 결과가
실제로 기기 상태를 `revoked`로 변경했다는 의미로 표시하지 않습니다.

현재 탐지와 실제 회수 상태 변경은 별개의 경로입니다.

### 복구 상태

복구 현황은 현재 로그인 사용자의 `virtual_note_backups`에서
`backup_version`만 읽어 집계합니다.

작전실은 복구 사본의 메모 제목이나 본문을 읽지 않습니다.

실제 복구 API:

```
POST /api/restore/:id
```

`aleph.config.json`의 복구 경로도 동일하게 유지합니다.

```
/api/restore/:id
```

### 1~11단계 실측 확인표

확인표에는 다음 항목을 구분해서 기록합니다.

```
단계
정상 / 금지
요청
기대 결과
실제 결과
점검 요청 ID
확인 시각
```

`점검 요청 ID`는 `npm run ops:record`가 실제 Production GET 요청에 연결한 `alephEvidence.requestKey`입니다.

브라우저 화면은 새 UUID를 만들지 않고 `ops/ops-record.json`의 서버 기록을 그대로 표시합니다.

실제 API 호출을 수행하지 않은 항목은 다음과 같이 유지합니다.

```
실제 결과: 미실행
점검 요청 ID: 미실행
확인 시각: 미실행
```

실행하지 않은 시험을 성공으로 간주하지 않습니다.

### Preview에서 실제 확인한 결과

12단계 Preview Deployment에서 실제 확인한 결과:

```
Stage 1
GET /
→ HTTP 200

Stage 2 / 5
GET /data.json
→ HTTP 200
→ 공개 notes 배열이 비어 있음

Stage 6 / 11
승인된 현재 기기에서 서명한 GET /api/notes
→ HTTP 200

Stage 6 / 11
로그인 상태에서 서명 없이 GET /api/notes
→ HTTP 403

Stage 11
서명된 보호 자료 GET
→ HTTP 200

Stage 11
서명 없는 보호 자료 GET
→ HTTP 403
```

Preview에서 다음 요청은 실제 애플리케이션 인증 결과로 판정하지 않았습니다.

```
GET /api/notes · 무인증
GET /api/notes · 잘못된 Bearer
```

해당 Preview Deployment에는 Vercel Deployment Protection이 적용되어 있습니다.

인증 쿠키를 제외한 요청은 애플리케이션 `/api/notes`에 도달하기 전에
Vercel SSO로 리다이렉트되므로, 이 결과를 애플리케이션의 `401` 또는 `403` 방어 성공으로 기록하지 않습니다.

따라서 Preview에서는 두 항목을 `미실행`으로 유지했습니다.
이후 공개 Production 배포에서 두 요청을 다시 실행하여 실제 애플리케이션의 HTTP 401 거부 응답을 확인했습니다.

### Production에서 최종 확인한 결과

12단계가 `main`에 병합되고 공개 Production 배포가 완료된 뒤
Preview Deployment Protection의 영향을 받지 않는 공개 환경에서 다시 실측했습니다.

실제로 확인한 결과:

```text
Stage 1
GET /
→ HTTP 200

Stage 3~5
GET /api/notes · 무인증
→ HTTP 401
→ 애플리케이션 인증 계층에서 거부 확인

Stage 4~5
GET /api/notes · 잘못된 Bearer
→ HTTP 401
→ 잘못된 토큰 거부 확인

Stage 2 / 5
GET /data.json
→ HTTP 200
→ 공개 notes 배열이 비어 있음

Stage 6 / 11
승인된 현재 기기에서 서명한 GET /api/notes
→ HTTP 200

Stage 6 / 11
로그인 상태에서 서명 없이 GET /api/notes
→ HTTP 403

Stage 11
서명된 보호 자료 GET
→ HTTP 200

Stage 11
서명 없는 보호 자료 GET
→ HTTP 403
```

Preview에서는 Vercel Deployment Protection 때문에 판정하지 않았던
무인증 요청과 잘못된 Bearer 요청도 Production에서는 실제 애플리케이션까지 도달했으며,
두 요청 모두 HTTP 401로 거부되는 것을 확인했습니다.

따라서 Preview에서 해당 두 항목을 `미실행`으로 유지했던 것은
배포 보호 계층의 결과를 애플리케이션 방어 결과로 잘못 기록하지 않기 위한 조치였습니다.

현재도 다음 시험은 12단계 화면에서 임의로 실행하거나 통과 처리하지 않습니다.

```
Stage 7  복합 이상 접속 요청
Stage 8  본인 메모 단건 GET
Stage 8  타인 메모 단건 GET
Stage 9  10분 안 121회 GET
Stage 10 POST /api/restore/:id
```

이 항목들은 실제 실행되지 않았으므로 계속 `미실행`으로 구분합니다.

### 의도적으로 미실행으로 유지한 시험

현재 작전실에서 다음 시험은 임의로 실행하거나 통과 처리하지 않습니다.

```
Stage 7  복합 이상 접속의 step_up 판정
Stage 8  본인 메모 단건 조회
Stage 8  타인 메모 단건 조회 차단
Stage 9  10분 안 121회 GET 탐지
Stage 10 지정 복구 사본 복원
```

해당 기능 자체의 과거 단계 시험과
현재 12단계 화면에서 수행한 실측 요청은 구분합니다.

### 41종 총공세

12단계 작전실은 41종 총공세 결과를 생성하거나 추측하지 않습니다.

```
ALEPH 심판 실행 전:
41종 총공세 결과 미확정

ALEPH 심판 실행 후:
실제 심판 판정만 기록
```

로컬 `decider:test`, `detect:test`, `attack-check` 결과를
41종 총공세 통과 결과로 바꾸어 표시하지 않습니다.

---

## 12단계 설치

필수 환경:

```
Node.js 22 이상
npm
Supabase 프로젝트
Vercel 배포 환경
```

의존성 설치:

```
npm install
```

실제 비밀번호, 사용자 토큰, Supabase 서버 전용 키, 기기 개인키를
저장소나 문서에 기록하지 않습니다.

Vercel 서버 함수에서 필요한 비밀값은 Vercel 환경변수로만 설정합니다.

---

## 12단계 실행

이 저장소에는 장시간 실행되는 로컬 개발 서버 스크립트가 없습니다.

`package.json`에는 `dev` 또는 `start` 스크립트가 없으므로
존재하지 않는 로컬 실행 명령을 사용하지 않습니다.

로컬에서 정적 결과물과 빌드 흐름을 확인할 때는 다음을 실행합니다.

```
npm run build -- --local
```

이 명령은 검증용 로컬 빌드이며 Vercel 배포 성공이나
실제 API 실행을 의미하지 않습니다.

실제 애플리케이션과 Serverless Function은 Vercel 배포 환경에서 실행합니다.

현재 공개 Production URL:

```
https://choi-bujang-secret-vault-alpha.vercel.app
```

브랜치를 GitHub에 push하면 연결된 Vercel 프로젝트에서
Preview Deployment를 생성하여 배포 전 동작을 확인할 수 있습니다.

---

## 12단계 중지

`npm run build -- --local`은 빌드가 완료되면 프로세스가 종료되므로
별도의 로컬 서버 중지 절차가 없습니다.

현재 저장소에는 다음과 같은 장시간 실행 프로세스가 없습니다.

```
npm run dev
npm start
```

Vercel Preview 또는 Production Deployment의 실행 상태는
저장소의 로컬 프로세스가 아니라 Vercel 배포 상태로 관리합니다.

---

## 12단계 복구 절차

12단계 작전실 자체는 메모 복구를 자동 실행하지 않습니다.

메모 복구는 10단계에서 구현한 기존 복구 경로를 사용합니다.

```
POST /api/restore/:id
```

복구 전에 반드시 다음 조건을 확인합니다.

```
로그인 사용자
복구 대상 메모 소유권
지정된 backup version
백업 대상 메모 ID
저장된 콘텐츠 SHA
```

복구는 지정된 사본 하나만 대상으로 하며
데이터베이스 전체를 초기화하거나 임의의 다른 사용자 자료를 복구하지 않습니다.

복구 기능의 재검증은 README의 10단계 복구 절차와 해당 단계에서 기록한 정책·API 검증 절차를 기준으로 수행합니다.

Supabase 테이블을 임의로 삭제하거나 초기화하지 않습니다.

문제가 발생하면 먼저 다음을 확인합니다.

```
git status
git diff
```

전체 작업을 무조건 되돌리는 `git reset --hard`는 사용하지 않습니다.

---

## 학생 구현과 ALEPH SDP 엔진의 구분

### 이 저장소에서 학생이 구현·관리하는 영역

다음은 이 저장소에서 작성하거나 단계별로 수정한 애플리케이션 영역입니다.

```
public/index.html
public/app.js
api/*
src/notes-api.mjs
src/device-approval.mjs
src/device-request.mjs
src/policy-recovery.mjs
src/resource-id.mjs
src/decider.mjs의 학생 판정 규칙
src/detect.mjs의 학생 탐지 규칙
aleph.config.json
Supabase 단계별 SQL
로컬 시험 및 제출 보조 스크립트
```

### ALEPH SDP 엔진 / 심판 영역

ALEPH SDP 엔진과 실제 심판 실행 환경은 이 저장소의 애플리케이션 코드가 아닙니다.

이 저장소는 판정 규칙과 탐지 규칙, 제출 설정을 제공하며
실제 ALEPH SDP 엔진과 심판은 외부 환경에서 이를 검증합니다.

따라서 다음 결과는 서로 동일한 의미가 아닙니다.

```
npm run decider:test
npm run detect:test
npm run bundle
Vercel 실제 API 결과
ALEPH SDP 엔진 결과
ALEPH 심판 최종 점수
```

`npm run decider:test`와 `npm run detect:test`는 학생 저장소의 로컬 계약 시험입니다.

`npm run bundle`은 제출 묶음 생성 및 자체 검증 과정입니다.

실제 심판 점수와 41종 총공세 결과는 ALEPH 심판 실행 결과만 사용합니다.

`aleph.config.json`의 `judgeIssuer`는 제공된 심판 설정을 유지하며 임의로 변경하지 않습니다.

---

## 12단계 제출 설정

현재 단계:

```
{
  "step": 12
}
```

복구 경로:

```
{
  "restoreRoute": "/api/restore/:id"
}
```

`src/attack-check.mjs`는 기존 공격 점검 계약을 변경하지 않고
12단계에서도 실행할 수 있도록 단계 허용 범위에 `12`만 추가했습니다.

기존 `attackId`, `expected`, `observed` 제출 구조를 임의로 확장하지 않습니다.

---

## 12단계 검증 원칙

다음 항목은 서로 별도로 기록합니다.

```
구현 완료
정적 검사 통과
로컬 자체 시험 통과
Preview 실제 API 확인
Production 실제 API 확인
제출 bundle 생성
ALEPH 심판 제출
ALEPH 심판 판정
```

앞 단계가 성공했다고 해서 다음 단계까지 성공한 것으로 간주하지 않습니다.

특히 실제로 수행하지 않은 요청과 41종 총공세는
심판 결과가 확인되기 전까지 통과로 기록하지 않습니다.

---

## 12단계 최종 제출 기준

12단계 제출 묶음은 Production 배포와 실측 검증이 완료된 clean `main`의 최종 일반 커밋을 기준으로 생성합니다.

---

## 12단계 증거 출처 구분 — 최신 구조

이 절은 위의 초기 12단계 화면 설명보다 최신입니다.

| 정보 | 출처 | 의미 |
|---|---|---|
| 판정 규칙 이름 | `src/decider.mjs`의 `RULE_IDS` | 구현된 학생 규칙 목록이며 실측 결과가 아님 |
| 6~9단계 고정 점검 | `GET /api/device/status?view=rule-check&case=...` | 고정 가상 입력의 판정·탐지 결과이며 실제 사용자 사건이 아님 |
| Production 점검 기록 | `ops/ops-record.json` | 실제 Production GET 결과와 동일한 requestKey·확인 시각 |
| 로그인 사용자의 기기·백업 현황 | `GET /api/device/status?view=operations` | 현재 사용자 DB 상태를 서버가 조회한 결과 |
| 41종 총공세 | ALEPH 심판 | 심판 실행 전에는 결과를 생성하거나 통과로 표시하지 않음 |

실행하지 않은 쓰기 요청은 `미실행:`으로 기록하며 `blocked` 또는 `allowed`로 계산하지 않습니다. 작전실 확인표는 브라우저가 결과나 UUID를 새로 만들지 않고 서버가 제공한 동일한 `ops/ops-record.json`의 행을 표시합니다.


### Stage 1 작전실 증적 보완

- 작전실 표의 Stage 1은 `public_root_available` 점검으로 표시합니다.
- 이 점검은 Production의 `GET /`를 실제로 호출해 HTTP 200을 확인하며, 같은 응답 HTML에 Supabase Publishable Key 또는 프로젝트 URL 할당이 노출되지 않았는지도 함께 검사합니다.
- 제출 묶음 규격은 직접 점검을 최대 20개까지만 허용하므로, 기존 공개 HTML 점검을 Stage 1 공개 루트 증적으로 통합해 총 점검 수 20개를 유지합니다.
- Stage 5의 원본 REST 직접 조회 차단은 `public_key_direct_rest_read`로 별도 유지합니다.
- 기존 `ops/ops-record.json`은 과거 Production 실측 기록이므로 코드를 배포한 뒤 `npm run ops:record`로 다시 생성하기 전까지 임의 수정하지 않습니다.


---

## 12단계 최종 결과

12단계 「탈환 작전실을 완성합니다」는 최종 제출에서 ALEPH 심판 **100점으로 통과**했습니다.

최종 통과 직전 저장점:

```text
f7888b7 12단계 Stage 2 observed 정합성 수정 (#62)
```

최종 제출에서는 `anonymous_static_note_read`의 제출용 `observed`를 심판이 직접 확인할 수 있는 HTTP 상태만 기록하도록 정리했습니다.

```
HTTP 200
```

공개 `/data.json`의 `notes` 배열이 비어 있는지에 대한 검증 자체는 내부 실측 증거로 유지하여 작전실 집계와 제출 기록의 역할을 분리했습니다.

최종 상태:

```
Stage 12 ALEPH 심판: 100점 통과
```

---

## 보너스 XDR-03 — 알려진 취약점 악용 탐지

모듈 키:

```
known-cve
```

시험 경보:

```
xdr/fixtures/known-cve.json
```

구현 파일:

```
xdr/known-cve/read-alerts.mjs
xdr/known-cve/patterns.json
xdr/known-cve/decide.mjs
xdr/known-cve/respond.mjs
xdr/known-cve/result.json
```

### 경보 읽기

`read-alerts.mjs`는 원본 Wazuh 모양 경보에서 다음 항목만 추출합니다.

```
timestamp
sourceIp
account
ruleLevel
description
```

URL, user-agent, 원본 data 전체 등 불필요한 값은 출력하지 않습니다.

확인 결과:

```
원본 경보 24건
추출 결과 24건
```

### 알려진 취약점 패턴

`patterns.json`에는 CVE-2021-44228 및 MITRE ATT&CK T1190 근거에 따라 다음 세 패턴만 정의했습니다.

```
jndi_remote_lookup_header
jndi_remote_lookup_argument
known_cve_probe_trace
```

완전한 JNDI 원격 조회 형태는 명확한 악용 신호로 보고, CVE/T1190 관련 점검 흔적만 존재하는 경우에는 보조 신호로 사용합니다.

### 판단 모듈

`decide.mjs`는 다른 파일이나 패키지를 import하지 않고 단독으로 판단합니다.

반환 형식:

```
{
  action: 'block' | 'alert' | 'record',
  confidence,
  reason
}
```

판단 기준:

```
명확한 JNDI 원격 조회 형태
→ block
→ confidence 0.98~0.99

CVE-2021-44228 / T1190 문맥의 애매한 점검 흔적
→ alert
→ confidence 0.65

알려진 취약점 악용 근거 없음
→ record
→ confidence 0.1
```

특정 경보 ID를 하드코딩하지 않고 경보 내용과 패턴 자체를 기준으로 판단합니다.

### 대응 연결

`respond.mjs`는 `block` 결과에 대해서만 임시 거부 규칙 후보를 생성합니다.

규칙에는 다음 정보를 기록합니다.

```
effect
sourceIp
sourceAlertId
expiresAt
reason
```

`alert`는 알림만 남기고, `record`는 기록만 남깁니다.

기존 ZTNA 판정기 규칙 파일인 `src/decider.mjs`는 수정하지 않습니다.

대응 로그:

```
xdr/alerts.log
```

### 시험 경보 실행 결과

실행 명령:

```
npm run xdr:run -- known-cve
```

최종 분류:

```
block: 8
alert: 7
record: 9
total: 24
```

정상 이벤트:

```
kc-17 ~ kc-24
```

확인 결과:

```
정상 이벤트 block: 0
```

`kc-12`는 중괄호가 한 번 등장하지만 JNDI 원격 조회 구문이나 명확한 알려진 취약점 악용 신호가 없어 `record`로 유지했습니다.

### XDR-03 재현 방법

```
node xdr/known-cve/read-alerts.mjs
node --check xdr/known-cve/decide.mjs
node --check xdr/known-cve/respond.mjs
npm run xdr:run -- known-cve
node xdr/known-cve/respond.mjs
```

`npm run xdr:run -- known-cve`는 `xdr/known-cve/result.json`을 갱신합니다.

`node xdr/known-cve/respond.mjs`는 대응 결과를 `xdr/alerts.log`에 추가하므로 제출 직전 반복 실행하여 동일 경보를 중복 기록하지 않습니다.

### 현재 검증 상태

```
경보 읽기 24/24: 통과
patterns.json 근거 필드: 확인
decide.mjs import 없음: 확인
명확한 공격 block: 확인
애매한 사건 alert: 확인
정상 사건 record: 확인
block 8 / alert 7 / record 9: 확인
정상 이벤트 block 0: 확인
respond 임시 deny 후보 8건: 확인
기존 ZTNA 판정기 파일 미수정: 확인
node --check: 통과
git diff --check: 통과
ALEPH XDR-03 심판 제출: 아직 안 함
ALEPH XDR-03 심판 통과: 아직 확인 안 됨
```


---

## XDR-03 최종 결과 갱신 — 알려진 취약점 악용 탐지

기존 XDR-03 기록의 `block 8 / alert 7 / record 9` 및 심판 미제출 표기는 당시 중간 저장점 상태입니다.

최종 수정에서는 직접 JNDI 원격 조회는 `block`, 직접 차단되지 않은 MITRE T1190 사건은 `alert`, T1190이 없는 정상 사건은 `record`로 분류했습니다.

최종 실행 결과:

```text
block: 8
alert: 8
record: 8
```

세부 분류:

```
kc-01 ~ kc-08  -> block
kc-09 ~ kc-16  -> alert
kc-17 ~ kc-24  -> record
```

ALEPH XDR-03 심판 최종 결과:

```
100 / 100
```

---

## XDR-04 현재 구현 상태 — 몰래 심어진 프로그램을 찾아냅니다

XDR-04 `persistence` 모듈은 서비스·예약 작업·시작 항목의 지속성 공격 경보를 판별합니다.

입력 fixture:

```
xdr/fixtures/persistence.json
```

구현 파일:

```
xdr/persistence/read-alerts.mjs
xdr/persistence/patterns.json
xdr/persistence/decide.mjs
xdr/persistence/respond.mjs
xdr/persistence/result.json
```

### 경보 읽기

`read-alerts.mjs`는 원본 경보를 수정하지 않고 다음 다섯 필드만 출력합니다.

```
timestamp
sourceIp
account
ruleLevel
description
```

검증 결과:

```
원본 경보: 24
추출 결과: 24
```

### 지속성 공격 패턴

`patterns.json`에는 과제에서 요구한 세 패턴만 기록합니다.

```
unsigned_new_service_registration
unfamiliar_scheduled_task
startup_folder_change
```

근거는 MITRE ATT&CK T1543 및 T1053입니다.

MITRE ID 자체만으로 공격을 확정하지 않고, 새 서비스 등록·낯선 예약 작업·시작 항목 변경과 같은 실제 변화 신호를 함께 판단합니다.

### 판단 모듈

`decide.mjs`는 외부 파일이나 패키지를 불러오지 않고 경보 하나만으로 판단합니다.

```
confidence >= 0.85  -> block
confidence >= 0.50  -> alert
그 아래               -> record
```

현재 fixture 분류:

```
ps-01 ~ ps-08  -> block
ps-09 ~ ps-16  -> alert
ps-17 ~ ps-24  -> record
```

최종 실행 결과:

```
block: 8
alert: 8
record: 8
```

정상 이벤트 block:

```
0
```

### 대응 모듈

`respond.mjs`는 `block` 결과만 임시 ZTNA 거부 규칙 후보로 만듭니다.

거부 규칙 후보에는 다음 값을 넣습니다.

```
sourceAlertId
sourceIp
expiresAt
reason
```

현재 구현에서는 생성 시각으로부터 5분 뒤를 만료 시각으로 사용합니다.

`alert`는 알림만 남기고 `record`는 기록만 남깁니다.

기존 ZTNA 판정기인 `src/decider.mjs`의 규칙은 수정하지 않습니다.

임시 로그를 사용한 대응 검증 결과:

```
전체 경보: 24
차단 후보: 8
비차단 이벤트의 잘못된 거부 규칙: 0
로그 기록: 24
```

### XDR-04 재현 방법

```
node xdr/persistence/read-alerts.mjs
node --check xdr/persistence/decide.mjs
node --check xdr/persistence/respond.mjs
npm run xdr:run -- persistence
```

`npm run xdr:run -- persistence`는 `xdr/persistence/result.json`을 갱신합니다.

`respond.mjs`의 실제 로그 기록 기능을 반복 실행하면 동일 시험 경보가 `xdr/alerts.log`에 중복될 수 있으므로 제출 직전에는 불필요하게 반복 실행하지 않습니다.

### XDR-04 현재 검증 상태

```
경보 읽기 24/24: 통과
patterns.json 근거 필드: 확인
decide.mjs import 없음: 확인
명확한 공격 block: 확인
애매한 사건 alert: 확인
정상 사건 record: 확인
block 8 / alert 8 / record 8: 확인
정상 이벤트 block 0: 확인
respond 임시 deny 후보 8건: 확인
비차단 이벤트 잘못된 deny 후보 0건: 확인
기존 ZTNA 판정기 파일 미수정: 확인
node --check: 통과
git diff --check: 통과
ALEPH XDR-04 심판 제출: 아직 안 함
ALEPH XDR-04 심판 통과: 아직 확인 안 됨
```

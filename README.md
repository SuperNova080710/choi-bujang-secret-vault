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
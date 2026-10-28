> **2026-10-28 확인 반영:** 사용자 실제 OSV 조회 완료. jose 6.2.12에서 조회 시점 알려진 항목 없음, 제외 9건. 시각·잠금 파일 해시는 [최종 확인 기록](FINAL_SUBMISSION.md)에 있습니다. 아래 설정 절차를 이미 수행했으면 반복할 필요가 없습니다.

# OSV 조회 설정과 확인 절차

기준: 2026-10-27, 공식 0.2.19 소스. 실제 외부 OSV 조회 성공 보고가 아닙니다.

## 결론

`PROJECT_NOT_CONFIGURED`는 SDP 오류가 아닙니다. `createProjectScanner`에 절대 프로젝트 경로가 없으면 반환됩니다. 기본 CLI는 `ON_PROJECT_DIRECTORY`와 JSON 배열 `ON_APPROVED_PUBLIC_PACKAGES`를 읽습니다. `start-alekov.ps1`은 부모 환경을 상속하고 비밀값 이름을 제거하지만 이 두 변수는 제거하지 않습니다. 이 전달 경로는 코드 검토 결과이며 Windows 실행 시험은 별도입니다. 제공 서버를 수정할 필요가 없습니다.

## 필요한 입력

- 대상 프로젝트의 절대 경로: `package-lock.json` v2/v3와 실제 `node_modules`가 함께 있어야 합니다.
- 서버 측 공개 조회 승인 목록: 공개 npm canonical 패키지명만 명시합니다. 브라우저 입력으로 확대하지 않습니다.
- lock의 정확한 버전·공개 registry tarball 정보와 설치된 `package.json`의 이름·버전이 일치해야 합니다.
- 조회 본문은 승인된 패키지 이름·정확한 버전·ecosystem뿐입니다. 전체 lock, 토큰, 로컬 경로는 OSV에 보내지 않습니다.

`on-client`는 외부 npm 의존성이 없는 앱입니다. 앱 폴더 자체와 검사할 npm 프로젝트를 혼동하지 마세요. 저장소 루트의 package.json에는 `jose`, `@supabase/supabase-js`가 있지만 사용자는 이후 루트 의존성을 설치하고 jose 실제 조회를 확인했습니다. 설치 파일이 없으면 임의로 설치·업데이트하지 말고 먼저 대상 프로젝트를 정합니다.

## Windows: 외부 요청 없이 설정 경로 먼저 확인

승인받은 기존 프로젝트의 `on-client` 폴더에서 앱을 종료하고 실행합니다. 다음 예시는 저장소 루트를 조회 대상으로 삼고 공개 승인 목록은 비워 둡니다. 상대 경로를 절대 경로로 변환하며 사용자별 경로를 문서에 고정하지 않습니다.

```powershell
$env:ON_PROJECT_DIRECTORY = (Resolve-Path ..).Path
$env:ON_APPROVED_PUBLIC_PACKAGES = '[]'
Test-Path (Join-Path $env:ON_PROJECT_DIRECTORY 'package-lock.json')
Test-Path (Join-Path $env:ON_PROJECT_DIRECTORY 'node_modules')
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
```

두 파일/폴더 존재 여부만 확인합니다. 화면의 「설치 패키지 조회」를 누르면 유효한 lock에 대해 `NO_APPROVED_PACKAGES`가 나올 수 있습니다. 이는 설정 경로가 전달됐지만 승인 목록이 비어 있다는 뜻이며 외부 조회 성공이 아닙니다. `LOCKFILE_UNVERIFIABLE`이면 대상 lock 또는 경로 조건을 확인합니다.

## 공개 패키지 조회

대상 프로젝트와 서버 측 공개 조회 승인 범위를 확인한 뒤에만 목록을 지정합니다. 예를 들어 공개 조회를 승인한 `jose` 하나를 검사할 때는 앱 종료 후 같은 PowerShell에서 다음과 같이 실행합니다. 이 단계에서 조회 버튼을 누르면 패키지명·정확한 설치 버전이 OSV로 전송됩니다.

```powershell
$env:ON_APPROVED_PUBLIC_PACKAGES = '["jose"]'
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
```

`jose`를 검사 대상이라고 임의로 확정한 것은 아닙니다. 실제 대상·설치 여부·조회 승인 범위가 다르면 목록도 달라집니다. 사설 패키지명이나 인증정보는 넣지 않습니다. PowerShell 환경변수는 현재 셸에만 적용됩니다. 점검 후 앱을 종료하고 초기화하려면:

```powershell
Remove-Item Env:ON_PROJECT_DIRECTORY -ErrorAction SilentlyContinue
Remove-Item Env:ON_APPROVED_PUBLIC_PACKAGES -ErrorAction SilentlyContinue
```

## 결과 해석

| 결과 | 의미 |
|---|---|
| PROJECT_NOT_CONFIGURED | 절대 대상 경로 미설정 |
| NO_APPROVED_PACKAGES | 조회 가능한 승인 패키지 없음; 취약점 없음이 아님 |
| LOCKFILE_UNVERIFIABLE | lock/경로 검증 불가 |
| partial / unverifiable | 설치 버전 불일치·조회 실패 등으로 전체 확인 불가 |
| complete / none_found | 해당 시각·패키지·버전 범위에서 알려진 항목 없음 |
| known_vulnerabilities | 알려진 취약점 ID 있음; 실제 침해 판정이 아님 |

## 검증 근거

`node --test test/osv-configuration.test.mjs test/stage20-vulnerabilities.test.mjs`: 17개 통과. 임시 가상 프로젝트와 모의 OSV transport로 미설정·빈 승인·설치 일치·불일치를 검사했습니다. 이 17개 검사는 모의 시험입니다. 이후 사용자 Windows 실제 조회 결과는 위 최종 확인 기록에 별도로 반영했습니다.

소스: `on-client/src/server.mjs`, `on-client/src/vulnerabilities/project-scan.mjs`, `on-client/src/vulnerabilities/osv.mjs`, `on-client/tools/start-alekov.ps1`.

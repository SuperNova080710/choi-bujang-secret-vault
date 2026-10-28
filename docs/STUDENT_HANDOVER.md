> **2026-10-28 최종 기준:** 이 문서는 단계별 이력을 보존합니다. 최신 과제 조건·실제 확인 결과·제출 위치는 [최종 제출·완성 기록](final-week/FINAL_SUBMISSION.md)을 우선합니다.

# 최부장님 최종 인수인계 — 22단계

## 버전과 현재 결론

- 저장소: https://github.com/SuperNova080710/choi-bujang-secret-vault
- 제출 후보 브랜치: `stage22-final-handover`
- 상태: **검증 중인 인수인계 후보**. 운영 인증 또는 v1.0 출시 선언이 아닙니다.
- 로컬 앱 패키지 버전: `0.2.11`(변경 없음). Node 기준 `24.19.0`.
- 기준 main 커밋: `13f4cda789098950e291fc39604ea8f561da965e`.
- 21단계 문서 원천: `42e930995d200b1a5f4b54b416b7e9d0f295db45`의 README 학생 안내와 `docs/STUDENT_RUNBOOK.md`.
- 위 두 커밋의 차이는 문서 2개뿐입니다. PR #115가 단계 브랜치로 병합되어 main에 문서가 빠진 상태였으므로 이번 제출본에 해당 문서를 포함합니다.
- 이번 변경은 문서·증거 기록뿐이며 학생 함수·제공 서버·인증·설정·의존성을 변경하지 않습니다.

이 파일 안에 자기 자신의 미래 커밋 SHA를 적을 수는 없습니다. **제출할 최종 40자리 SHA는 해당 체크아웃의 `git rev-parse HEAD`로 고정**하고, 최종 커밋을 만든 뒤 새 폴더에서 실제 재현한 SHA·시각·결과를 [최종 검증 이슈 #120](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/120)에 기록합니다. 아래 기준 커밋의 사전 결과와 최종 커밋의 재현 결과를 혼동하지 않습니다. 최종 기록의 SHA가 제출 SHA와 다르면 최종 재현 확인으로 사용하지 않습니다.

## 실행에 필요한 것

[21단계 실행 설명서](STUDENT_RUNBOOK.md)의 작업 위치·명령·구성도·장애 안내를 따릅니다. 핵심은 Git 최상위 아래 `on-client`에서 실행하는 것입니다. 루트 자료실/Vercel과 로컬 앱은 별도 실행 경로입니다.

| 구분 | 필요한 파일·설정 | 설치/이동 제한 |
|---|---|---|
| 로컬 기본/demo | 저장소 전체, 특히 on-client의 public/src/student/tools/package.json | 외부 npm 의존성 없음. 설치 없이 npm start/demo/check 사용 |
| 이전 자료실 기능 | 루트 package.json/package-lock.json, public/api/src 등 | 필요 시 루트 npm ci. 이번에는 설치·배포·원격 DB 확인 안 함 |
| 실제 SDP | 운영자가 승인한 개인 호스트 설정·인증서·자격 | 프로젝트 밖 별도 보호 경로. 새 PC에서 재발급/재승인 필요 여부를 운영자가 확인 |
| 실제 AI | Windows native 호스트 설정·앱 승인·사용 권한 | 기존 폴더의 자격 저장소를 무작정 복사하지 않음 |
| OSV | 운영자가 정한 프로젝트 경로·공개 패키지 허용 목록 | 설정 없이 not_configured 가능. 학생이 허용 목록을 임의 확대하지 않음 |
| 실제 조치 | 운영자의 조치 설정·원천 집행기·관측 결과 | 실집행 미완료. 시험 삼아 실행하지 않음 |

`on-client/.env.example`은 비밀 없는 견본이며 자동 로드되는 설정 파일이 아닙니다. 루트 `.gitignore`의 `.env`, `.env.*`, `node_modules/` 제외를 유지합니다. 비밀값이나 실행자의 로컬 절대 경로를 소스에 고정하지 않습니다. 운영자 설정에 필요한 절대 경로는 배포 대상 PC에서 별도로 준비합니다.

## 새 빈 폴더 재현 절차 — PowerShell

원래 저장소 밖의 작업용 상위 폴더에서 새 PowerShell 창을 엽니다. 아래 `$targetCommit`에는 PR에 기록된 실제 제출 후보 40자리 값을 입력합니다. 이미 존재하는 재현 폴더는 삭제하거나 재사용하지 않고 중단합니다.

```powershell
$targetCommit = Read-Host '검증할 40자리 커밋'
if ($targetCommit -notmatch '^[0-9a-f]{40}$') { throw '40자리 SHA를 확인하세요.' }
$reproFolder = Join-Path (Get-Location) ('choi-bujang-repro-' + $targetCommit.Substring(0,12))
if (Test-Path -LiteralPath $reproFolder) { throw '이미 있는 폴더입니다. 다른 빈 작업 위치를 선택하세요.' }
git clone --no-checkout https://github.com/SuperNova080710/choi-bujang-secret-vault.git $reproFolder
if ($LASTEXITCODE -ne 0) { throw '복제 실패' }
Set-Location -LiteralPath $reproFolder
git checkout --detach $targetCommit
if ($LASTEXITCODE -ne 0) { throw '지정 커밋 체크아웃 실패' }
$actualCommit = (git rev-parse HEAD).Trim()
if ($actualCommit -ne $targetCommit) { throw '커밋 불일치' }
git status --short
node --version
npm --version
git --version
Set-Location .\on-client
npm run check
npm run demo
```

검사 기준은 Node 24.19.0입니다. Node 22.11.0에서 과거 `node:sqlite` 오류가 보고됐으므로 단순히 루트 engines가 >=22라는 이유로 실행을 보장하지 않습니다. Git에 없는 로컬 커밋이라면 같은 방식으로 `git clone --no-checkout <원래 저장소 경로> <새 폴더>`를 사용하고 SHA를 확인합니다. 원래 폴더 내용이나 인증 파일을 덮어쓰지 않습니다.

시작 로그 `케셰브 예제: http://127.0.0.1:5189`를 확인하고 그 주소를 PC 브라우저에서 엽니다. 보호 현황·업무 앱·보안 기록의 demo 표시를 확인합니다. 다음 순서를 한 단계씩 기록합니다.

1. 첫 확인은 **원래 작업 폴더와 기록이 그대로 남았는지**입니다. 원래 폴더의 `git status --short`, `git rev-parse HEAD`를 실행 전후 비교합니다. 이번 재현 명령은 새 폴더만 대상으로 합니다.
2. 새 폴더의 커밋·런타임·실행 위치·시작 로그를 기록합니다. 화면 결과에는 demo인지 반드시 적습니다.
3. 브라우저에서 제공 화면과 학생 칸을 대조합니다. 조회 실패·unknown·미조회를 성공으로 적지 않습니다. 유료 AI 설명이나 실제 조치 버튼은 재현을 위해 누르지 않습니다.
4. 실행 창에서 Ctrl+C로 종료하고 HTTP 응답이 멈추는지 확인합니다. 같은 명령으로 재실행하고 새 상태를 확인합니다.
5. 기본 미연결 상태도 확인하려면 demo를 종료하고 on-client에서 `npm start`를 실행합니다. ENGINE_NOT_CONNECTED를 빈 성공으로 처리하면 안 됩니다. 확인 후 종료합니다.

루트에서 수행하는 기존 모의 테스트 명령은 다음과 같습니다.

```powershell
node --test test/stage18-explanation.test.mjs test/stage18-explanation-lifecycle.test.mjs test/stage19-action.test.mjs test/stage20-vulnerabilities.test.mjs
```

Windows 실행기·브라우저 직접 조작은 이번 AI 작업 환경에서 미실행입니다. 위 PowerShell 절차는 현재 파일과 대조한 사용자 실행 절차이며 실행했다고 주장하지 않습니다. 포트 충돌·실행기 사용은 21단계 설명서 4·8절을 따릅니다.

## 재현 증거와 단계별 상태

동봉 [기준 커밋 HTTP 기록](STUDENT_REPRO_BASE.json)은 **사전 재현 기록**입니다. 기록 대상 SHA는 파일의 commit 필드입니다. 실제 실행자는 AI 작업 환경이며 학생 본인의 PC 실행 진술이 아닙니다. 시간은 파일에 UTC ISO로 보존했고 아래 표는 한국 시각입니다. 서버 AI가 실행했다는 뜻도 아닙니다.

사전 환경: 새 git clone 폴더, Linux, Node 24.19.0/npm 11.9.0/Git 2.51.1. 사용자 원래 PC 폴더에는 접근하지 않았습니다. 이번 작업 공간의 기존 사본 295개 파일은 변경 전 SHA-256 목록으로 보존 점검합니다. 인증 설정을 복사하지 않았고, 외부 AI·OSV·집행 요청 없이 loopback HTTP GET만 사용했습니다.

| 단계 | 현재 기능/원문 | 사전 확인 결과 | 확인 시각·근거 | 미확인 원인/범위 |
|---|---|---|---|---|
| 13 | 로컬 진입점·보호 현황/업무 앱/보안 기록 | 기본/demo 루트와 학생 JS HTTP 200 | 2026-10-23 15:19:40~42 KST, HTTP JSON | 브라우저 시각 확인 미실행 |
| 14 | renderIdentity/renderDecision | demo me/apps 200, 기본 미연결 503 | 같은 시간 JSON, 함수 원문 | 실제 SDP 판정 및 이번 UI 조작 미실행 |
| 15 | renderEvents 필터·근거·규칙·상태 | demo events 200, 예제 1건 | 같은 시간 JSON·원문 | 필터 실제 브라우저 조작 미실행 |
| 16 | renderStatus 기기·세션·알림·도움정보 | demo devices/sessions 각 1건, diagnostics 200 | 같은 시간 JSON·원문 | 실제 기기/세션 원천 조회 미확인 |
| 17 | renderAiConnection 계정·앱 승인/모델 확인 표시 | 코드 존재·기존 오류/미확인 처리 원문 확인 | 2026-10-23 코드 대조 | 실제 계정·모델 연결 미확인; #89/#90 추적 |
| 18 | renderExplanation 근거 연결·오류·unknown·제안 미실행 | 모의 12건 통과 | 새 clone에서 node --test, 2026-10-23 | 실제 유료 설명 응답 미확인 |
| 19 | renderAction 준비/ACK/효과 관측 구분 | 모의 13건 통과 | 같은 새 clone 테스트 | 실제 집행·원천 결과 관측 미완료(UNV) |
| 20 | renderVulnerabilities 정확 버전/부분 결과/취소 | 모의 13건 통과; HTTP not_configured | 같은 테스트 및 HTTP JSON | 승인된 프로젝트 설정 없음. 외부 OSV/설치 버전 대조 미확인 |
| 21 | README·STUDENT_RUNBOOK.md | 경로·실행 계약 코드 대조; 단계 브랜치의 문서 포함 | 21단계 문서 원천 SHA, 이번 문서 대조 | 새 PowerShell/사용자 PC 재현 미확인 |

38건 테스트는 모두 이번 새 clone의 동일 기준 코드에서 실행했습니다. 예전 단계별 통과 기록을 모아서 최종 코드 전체의 운영 성공으로 표시하지 않습니다. 20·21단계 공식 통과는 사용자 보고이며 정확한 판정 접수 시각·전체 판정 HTML은 이번에 제공되지 않았습니다.

최종 문서 커밋이 만들어진 후 별도 새 폴더에 **그 SHA를 직접 체크아웃**하고 문법·38건 테스트·기본/demo/종료/재실행을 다시 확인합니다. 최종 결과는 #120에 SHA와 실제 확인 시각으로 남깁니다. 이를 확인하기 전에는 사전 JSON을 최종 커밋 실행 기록이라고 부르지 않습니다. 변경 후에는 새 SHA로 동일 절차를 수행하며 이전 기록은 삭제하지 않습니다.

## 데이터 보존·백업·복원 계획

| 대상 | 보존/백업 절차 | 복원 순서·제한 |
|---|---|---|
| 커밋된 코드·문서·테스트·lock | Git 원격과 최종 SHA를 보관. 필요하면 원래 저장소에서 프로젝트 밖에 `git bundle create <새 백업파일> --all`, 이어 `git bundle verify <백업파일>` | 빈 폴더로 bundle을 clone하고 목표 SHA 체크아웃. tracked 파일만 복구; untracked/무시 파일/DB/원격 자료는 포함 안 됨 |
| 미커밋 학생 작업 | status/diff 확인 후 해당 파일을 별도 보호 위치에 복사하고 SHA-256 대조. staged/unstaged 구분, 일괄 삭제/덮어쓰기 금지 | 원본 보존 후 별도 폴더에서 변경 파일 검토·선택 반영. patch만으로 untracked/바이너리 전체 보존을 보장하지 않음 |
| 이전 자료실 Supabase 학생 데이터 | 권한 있는 소유자/운영자가 승인된 DB 백업 경로로 schema·행·RLS·권한·참조 관계를 보존. 비공개 백업은 저장소/제출물 밖에 보관 | 격리된 복원 대상에서 구조·행 수·접근 통제 확인 후 전환. 이번 작업은 DB 백업/복원 미실행. Git clone은 이 데이터를 복원하지 않음 |
| 조치 SQLite/영수증/멱등성 기록 | 실제 사용 중인 운영 DB는 운영자가 서비스와 쓰기를 멈추거나 SQLite 일관성 백업 수단을 사용. WAL 포함 여부와 시점 확인. 실행 중 DB 파일 하나만 무작정 복사하지 않음 | 격리 복원 후 무결성·요청/영수증/중복 방지 기록 보존 검증. 과거 요청 재전송·실집행으로 확인하지 않음. 이번 실제 DB 복원 미실행 |
| native 자격·인증서·개인키·토큰 | Git/JSON/공유 ZIP 제외. Windows 자격 보관 및 운영자 재발급·승인 정책 사용 | 다른 PC에 파일 복사만으로 연결된다고 보장하지 않음. 본인·프로젝트·기기 승인 재확인 |
| demo·화면 임시 상태 | 예제 엔진 자료와 코드만 보존. UI 요청 세대·선택·이전 설명은 영구 데이터 백업 아님 | 재시작 후 새로 조회. 이전 화면을 현재 원천 결과로 복원하지 않음 |

백업 파일은 원본과 다른 보호 위치에 보관하고 파일 크기·SHA-256·대상 커밋·백업 시각을 별도 목록에 남깁니다. 기존 백업을 덮어쓰지 않습니다. 보존 기간·접근 권한은 데이터 소유자가 정합니다. 민감한 자료를 백업 편의상 Git에 추가하지 않습니다.

이번에는 새 clone의 **코드 Git bundle 생성·검증·새 폴더 복원**을 최종 커밋 검증 과정에 포함하고 #120에 결과를 남깁니다. 이는 코드 보존 실험이며 학생 데이터·DB·자격의 실제 복원 성공으로 확대하지 않습니다.

## 남은 작업과 인계 순서

1. 사용자 PC에서 원래 작업 보존 확인 후 같은 최종 SHA의 PowerShell/브라우저 재현을 수행합니다. 결과를 실제 시각과 환경으로 #120에 추가합니다.
2. #89/#90의 실제 AI 연결·17단계 판정 증거, 실제 SDP/OSV/19단계 집행 결과는 각각 미해결 범위로 유지합니다. 22단계 통과로 자동 해결하지 않습니다.
3. PR을 사용자가 검토·병합합니다. 병합 커밋을 제출하려면 SHA가 달라지므로 해당 SHA에서 재현 여부를 다시 기록합니다. 이미 검증한 PR 커밋을 그대로 제출할 수도 있습니다.
4. 21단계 설명서 10절대로 저장소·40자리 커밋을 22단계에 직접 입력합니다. 워크벤치 포털 제출 준비의 13~20 지원과 혼동하지 않습니다.
5. 비공개 원문 도구는 프로젝트 밖에 풀고 출력 JSON도 프로젝트 밖의 새 폴더에 만듭니다. 실제 도구/출력 경로를 확인한 뒤 Git 최상위에서 `node <도구 실제 경로> --output <새 JSON 실제 경로> --commit <검증한 SHA>`를 실행합니다. 경로에 공백이 있으면 따옴표로 감쌉니다. 이번 작업에서는 이 도구를 실행하거나 제출하지 않았습니다.
6. 원문 전달과 공식 통과를 구분합니다. 원문 전달만 실패하면 기존 접수를 유지하고 「원문만 다시 보내기」를 사용합니다.

22단계는 AI의 원문 검토 기준 수료입니다. 운영자 인증·새 환경 실행 보증·실제 보안 효과 확인이 아니며, 미완료 항목이 있는 현재 버전은 계속 검증 중입니다.

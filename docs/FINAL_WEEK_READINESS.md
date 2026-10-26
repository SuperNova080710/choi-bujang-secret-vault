# 마지막 총공세 준비 상태

> 현재 0.2.19 상태는 [대기 인수인계](final-week/WAITING_HANDOFF.md)를 따릅니다. 아래의 0.2.14/학생 수집 계약은 당시 개발 기록이며 공식 6항목 API와 혼합하지 않습니다.

## 후속 갱신 — 2~7일차 개발 준비

1일차는 사용자 Windows 데모 필터·상세 확인과 기능 우선순위 승인으로 완료했습니다(#129, #131). 이후 학생 영역에 PC 수집기·개발용 진입점·조회 타임라인을 추가했습니다. 최신 구현·테스트·미실시 범위는 [시연과 근거](final-week/DEMO_AND_EVIDENCE.md), 실행은 [QUICKSTART](final-week/QUICKSTART.md)를 따릅니다. 아래 내용은 0.2.14 업데이트 당시의 기준 기록입니다.

**해석 정정:** 2일차의 “제공 기능이 있으면 중복 구현하지 않는다”는 조건을 제공본이 없으면 개발을 멈춰야 한다는 뜻으로 해석하지 않습니다. PC 조회는 학생 확장으로 구현했고, package-app은 6일차의 공식 포장 의존성으로 분리했습니다. 승인 설치형 host의 학생 API 반영은 아직 확인되지 않았습니다.

확인일: 2026-10-26 (한국 시간). 기준 소스: `8c08f038b848eb65b255b4b3cb79d05fd510a55e` + 이 PR의 공식 시작 틀 갱신.

## 목표와 선택

- 22단계까지 만든 최부장님을 보존하여 실제 PC에서 사용할 앱으로 다듬는다.
- 개발: Ubuntu. 사용자 테스트: Windows, Node v24.22.1.
- 화면: 기록 타임라인형. 포장: 공식 기본 포장 후 Inno Setup 사용자 단위 설치.
- 권장 기간: 2026-10-26 ~ 2026-11-06 23:59 KST. 7일차는 권장 순서이며 새로운 단계 점수를 뜻하지 않는다.

## 확인된 현재 상태

| 항목 | 근거와 결과 |
|---|---|
| Windows 기존 서버 실행 | 사용자가 브라우저 접속 성공을 보고함 |
| Windows 기존 데모 | 사용자가 예제 화면 표시 성공을 보고함. 상세 기능 전체 검증은 아님 |
| Windows 실제 연결 | 사용자가 `/api/me`의 `503 / ENGINE_NOT_CONNECTED / disconnected` 응답을 제공함 |
| 기록 조회·필터 | 학생 `renderEvents`에 최신순 정렬, 종류·앱·접속 상태 필터, 상세 표시가 있음. 코드 확인 |
| CPU·메모리·디스크 실측 | 현 배포본에서 해당 조회 구현을 확인하지 못함. 실측 성공 아님 |
| Windows 네트워크·방화벽·이벤트 조회 | 현 배포본에서 해당 조회 구현을 확인하지 못함 |
| `package-app` | 기존 0.2.11 및 공식 0.2.14 ZIP 모두에 명령 없음 |
| `student/appearance.json` | 공식 0.2.14 ZIP에 없음. 허용 스키마를 추측해 만들지 않음 |

핵심 기능 후보는 ① 기록 조회·필터 ② PC 실측과 변화 확인 ③ 네트워크·방화벽·이벤트 요약이다. 뒤 두 기능은 제공 계약 확인 전 구현·완료로 기록하지 않는다. Windows 이벤트 경고·오류 건수는 공격 탐지 결과가 아니다.

## 이번 변경: 공식 0.2.11 → 0.2.14 제공 파일 동기화

공식 자료:

- https://aleph-workbench-downloads.vercel.app/update-alekov-0.2.14-guide.html
- https://aleph-workbench-downloads.vercel.app/update-alekov-0.2.14.ps1
- https://aleph-workbench-downloads.vercel.app/alekov-starter-0.2.14.zip

다운로드한 두 파일의 SHA-256이 공식 안내 값과 일치했다.

| 자료 | SHA-256 |
|---|---|
| 업데이트 PS1 | `a02bc018ef39989cfb7745edcc66aa9065cb0accad7c00b0aa06e965201beb7a` |
| 시작 틀 ZIP | `88294d21948386e7be2b01cb895e69722a1401e88a51183e55a326bd4700d66b` |

공식 PS1의 고정 목록 17개에 대해 기존 파일의 바이트 해시가 0.2.11 기준값과 모두 일치하는지 확인했다. ZIP의 새 파일도 각각 0.2.14 기준값과 대조한 후 해당 17개만 교체했다. Windows PS1을 실행한 것은 아니며 Windows 개인 백업을 생성했다고 주장하지 않는다. Git의 기준 커밋에 이전 파일이 보존된다.

변경 범위: 제공 manifest, README, 안내 문서 3개, package.json, public의 app.js·ai-connect.mjs, AI service·vault-service, connection manager·native-login, SDP host, server, 제공 PowerShell 도구 2개, vendor/clco-http.mjs.

학생 파일을 포함한 나머지 기존 추적 파일은 바이트 단위로 동일함을 확인했다. 제공 파일의 CRLF를 보존했으며 일반 `git diff --check`는 CR을 공백으로 보고하므로 `git -c core.whitespace=cr-at-eol diff --check`로 검사했다.

## 자동 확인 결과

Linux / Node v24.22.1에서 실행:

- `node --check on-client/student/extension.mjs`: 통과.
- `node --test test/stage18-explanation-lifecycle.test.mjs test/stage18-explanation.test.mjs test/stage19-action.test.mjs test/stage20-vulnerabilities.test.mjs`: 38개 통과, 실패 0.
- 일반 실행: 루트 HTTP 200, me/apps/events/devices/sessions 모두 HTTP 503와 `ENGINE_NOT_CONNECTED`, `disconnected` 확인.
- 데모 실행: 루트와 같은 5개 API HTTP 200, `demo` 확인.
- CRLF를 고려한 diff 공백 검사 통과.

미실시: 갱신 후 Windows PowerShell 실행·DPAPI·계정 연결·AI 승인·실제 SDP 연결·Windows 실측·설치·제거. 자동 테스트와 데모 성공은 이 항목들의 완료 근거가 아니다.

## Windows에서 다음에 확인할 순서

이 PR의 버전을 받은 뒤 서버 창에서 Ctrl+C로 종료하고 `on-client` 폴더에서 실행한다. 기존 다운로드 폴더와 Ubuntu 개발 원본을 덮어쓰지 않는다. ZIP으로 받은 폴더는 Git 저장소라고 가정하지 않는다. 기존 폴더를 보관하고 PR 브랜치 또는 병합 후 main을 별도 폴더에 받는다.

```powershell
# 해당 버전의 on-client 폴더에서
node --version
Get-Content .\package.json
npm.cmd run demo
```

`version`이 `0.2.14`인지 확인하고 http://127.0.0.1:5189 에서 예제 화면을 확인한다. 실제 연결 성공이라고 기록하지 않는다.

계정 연결 준비까지 확인할 때는 데모를 종료한 뒤 제공 실행 도구를 사용한다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
```

0.2.14 도구는 Windows 사용자·프로젝트에 맞는 로컬 계정 연결 보관소를 준비한다. `npm.cmd start`만 실행하는 것과 이 준비 절차가 다르다. 해당 실행에만 ExecutionPolicy 옵션을 사용하며 전역 정책을 변경하지 않는다. 로그인·승인은 사용자가 공식 화면에서 직접 한다. 오류가 나면 안전한 코드·메시지만 기록하고 설정 파일·키·토큰은 보내지 않는다. 계정·AI 연결과 SDP 연결은 별개이다.

## 제공 자료 확인이 필요한 항목

과제는 `package-app`, 제공 PC 상태 조회, 승인 실행 환경과 appearance 계약을 설명하지만 이번 공식 0.2.14 ZIP에는 포장 명령과 PC 상태 조회가 없다. 다음 내용을 담당자에게 확인해야 한다.

> 마지막 총공세를 준비 중입니다. 공식 0.2.14 ZIP의 package.json에도 package-app 명령이 없으며, 내 PC 상태 조회 및 appearance.json 계약을 찾지 못했습니다. 기존 student 코드와 Git 기록을 보존하는 최신 제공 파일 업데이트 경로, 승인 실행 환경 설치 안내, PC 상태 조회·화면 꾸밈 입력 계약을 안내 부탁드립니다. 개발은 Ubuntu, 테스트와 설치는 Windows에서 진행합니다.

제공본이 오면 학생 구현과 비교하여 중복 수집을 제거하거나 공식 경로에 연결한다. 자료 대기 자체가 학생 기능 개발의 필수 차단 조건은 아니다. 임의 포장 스크립트나 가짜 승인 파일로 대체하지 않는다. 준비 대기 중에도 기존 기록 화면의 사용성 검토와 실행 안내 개선은 가능하다.

## 이후 완료 기준

1. 실측과 서비스 조회의 출처·측정 시각·단위를 표시하고 실패를 0이나 예시 값으로 대체하지 않는다.
2. 읽기 전용 Windows 조회와 SDP 연결 상태를 분리한다.
3. 동료의 첫 사용 관찰과 본인의 재실행 결과를 구분한다.
4. 공식 `--finish-materials`로 같은 소스에서 나온 `finish.commit.raw`, `finish.archive.tar.gz`, `app.zip`, `APP_PACKAGE_MANIFEST.json`을 한 묶음으로 보존한다.
5. 승인 실행 환경이 있는 Windows 새 경로에서 설치·실행·제거를 확인한 후 시연 근거를 정리한다.
6. 다중 캡처·최종 확인은 첨부 안내상 시험0반 전용 로컬 경로이다. 일반 운영 페이지의 네 파일 등록과 혼동하거나 사진으로 대체하지 않는다.

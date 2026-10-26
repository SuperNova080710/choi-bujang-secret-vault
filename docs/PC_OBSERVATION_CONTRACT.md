# 학생 PC 읽기 전용 조회 계약

이 계약은 마지막 총공세 2~3일차를 위해 직접 추가한 학생 기능이다. 공식 제공 기능이나 설치형 host 지원 계약이라고 주장하지 않는다. 제공 `src/server.mjs`, 인증·판정 코드, `public` 공통 화면은 수정하지 않는다.

## 실행과 연결

`on-client`에서 `node student/start-pc.mjs` 또는 `node student/start-pc.mjs --demo`를 실행한다. 기본 포트 5189, loopback에만 바인딩한다. `--demo`는 기존 SDP 자료만 예제로 제공하며 PC 조회는 여전히 서버 실행 PC 실측이다. 기존 `npm start`와 공식 PowerShell 실행 경로에는 새 PC API가 없으므로 학생 화면은 명시적 미지원 안내를 표시해야 한다.

진입점은 제공 `createOnServer`로 만든 서버의 요청 처리를 합성한다. `/api/student/pc-observation`만 별도로 처리하고 나머지 요청은 원래 처리기에 전달한다. 이 개발 진입점은 native 로그인·SDP 자격 설정 옵션을 복제하지 않으며 기존 운영 연결은 원래 실행 도구에서 사용한다. 공식 설치형 host의 학생 API 연결 계약은 아직 미확인이다.

## 요청과 결과

`POST /api/student/pc-observation`: 빈 본문, `X-Student-PC: read`, 정확한 같은 origin 필수. 쿼리·입력 명령·경로 인자·CORS를 허용하지 않는다. 하나의 수집만 진행하며 동시 요청은 429다. 브라우저가 취소한 뒤에도 이미 시작된 읽기는 최대 12초 동안 종료를 기다릴 수 있다. 자동 재시도는 없다.

성공 `{ok:true,data:{schema:'choi.pc-observation.v1',mode:'measured',platform,startedAt,checkedAt,metrics}}`.
항목은 cpu/memory/disk/network/firewall/systemEvents/applicationEvents로 고정한다. 각 항목은 `{status:'ok', source, observedAt, value}` 또는 `{status:'unknown', source, observedAt, code}`다. 일부 실패가 있어도 받은 결과를 유지하며 전체 성공으로 표현하지 않는다. 서버 오류 문자열·개인 경로는 반환하지 않는다.

| 항목 | 단위·범위 | 방법 |
|---|---|---|
| CPU | 전체 논리 CPU 시간 합계의 500ms 구간 사용률 % | node:os.cpus 차분 |
| 메모리 | totalBytes, usedBytes=total-free | node:os.totalmem/freemem; 작업 관리자 값과 집계 방식이 다를 수 있음 |
| 디스크 | Windows 시스템 볼륨 totalBytes/freeBytes | Win32_LogicalDisk |
| 네트워크 | 어댑터 전체/링크 Up 개수 | Get-NetAdapter; IP·MAC·이름은 출력하지 않음 |
| 방화벽 | Domain/Private/Public 설정 켜짐 여부 | Get-NetFirewallProfile; 현재 활성 프로필·실제 차단 효과를 판정하지 않음 |
| Windows 기록 | 최근 24시간 로그별 경고(Level 3)·오류(Level 2) 수 | Get-WinEvent; Critical 등 다른 레벨 제외 |

각 로그는 최신 10,001건까지만 조회하고 10,000건을 넘으면 최신 10,000건 집계 및 `capped:true`를 반환한다. 이때 전체 건수로 표현하지 않는다. 메시지·사용자·사건 원문은 출력하지 않는다. 0건은 NoMatchingEventsFound일 때만 인정하며 권한·서비스 오류는 확인 불가다. 한 PowerShell 프로세스 안에서 항목별 오류를 분리하고 전체 프로세스 제한을 넘으면 Windows 항목 전부 확인 불가로 남긴다. CPU·메모리는 별도 결과를 보존한다.

PowerShell은 고정 `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`와 고정 학생 PS1만 실행한다. Windows가 다른 위치에 설치되면 Windows 항목은 확인 불가가 될 수 있다. 관리자 권한·원격 컴퓨터 조회·설정 변경은 사용하지 않는다. 비 Windows에서는 CPU·메모리만 실측하고 Windows 전용 항목은 WINDOWS_ONLY다. 시험 환경 측정값을 사용자 PC 값으로 사용하지 않는다.

## 원칙과 검증

PC 조회 성공은 SDP 연결·로그인·보안 기준 충족을 뜻하지 않는다. Windows 경고·오류 건수는 침해·공격 탐지 결과가 아니다. 실측값은 표시 시각과 함께 과거 조회값으로 취급하고 현재 실시간 값으로 오인하게 하지 않는다.

`node --test test/pc-collector.test.mjs test/pc-server.test.mjs`는 단위 및 로컬 HTTP 경계 검증이다. Windows PowerShell 실제 실행은 Windows 사용자 확인 전 미실시이며 모의 Windows 결과로 대체하지 않는다.

공식 API 참고:
- https://nodejs.org/api/os.html
- https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-5.1
- https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter
- https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewallprofile

# BYTE BACK 방어전 · ALEPH 보안 Agent 「최부장님」

이 저장소는 초기 BYTE BACK 방어전(1~12단계, XDR 보너스 포함)과 ALEPH 4차 방어전의 보안 Agent(`on-client/`, 13~22단계)를 함께 관리합니다. 두 앱의 실행 환경과 검증 결과는 구분합니다.

> **문서 정리 실험:** 과거 상세 기록을 삭제하거나 코드를 바꾸지 않고, 최상위 README만 짧은 안내서로 정리한 브랜치입니다. **이전 2,972줄 README 전체는 [2026-10-22 병합 커밋의 원문](https://github.com/SuperNova080710/choi-bujang-secret-vault/blob/04858ec74d6331e72fb3194093f4b9edec46bd7f/README.md)에 그대로 보존**되어 있습니다. 과거 단계별 검증·복구·XDR 재현은 원문을 기준으로 합니다.

## 프로젝트 구조

| 경로 | 역할 |
| --- | --- |
| `public/`, `api/`, `src/`, `supabase/` | 기존 방어전 앱·API·보안 판정·자료 접근·기기 인증 |
| `xdr/` | 웹 주입, 무차별 로그인, 알려진 취약점, 지속성 공격, 권한 상승, 자료 유출 등의 탐지 기록과 구현 |
| `test/`, `scripts/`, `recovery/`, `ops/` | 기존 단계별 검증·복구·운영 자료 |
| `on-client/student/extension.mjs` | 13단계 이후 학생 UI 표시 함수 |
| `on-client/public/` | 제공된 보안 Agent 화면과 AI 연결·사건 설명 요청 |
| `on-client/src/`, `on-client/vendor/` | 제공 서버, 신원·권한·AI 서비스와 HTTP 전송 |
| `on-client/docs/` | 공식 단계별 입력 계약, 실행·제출·문제 해결 안내 |

기존 1~12단계의 실제 판정과 재현 내역은 위 [원본 README](https://github.com/SuperNova080710/choi-bujang-secret-vault/blob/04858ec74d6331e72fb3194093f4b9edec46bd7f/README.md) 및 Git 기록을 참조합니다. 과거 단계의 학생 파일, SQL, XDR 증적, 시험 자료는 이 문서 정리에서 변경하지 않았습니다.

## 4차 방어전 및 현재 17단계

`on-client/`은 13~22단계에 사용하는 **별도 로컬 보안 Agent**입니다. 상세 사용법은 [on-client/README.md](on-client/README.md), 공식 요구사항은 [STUDENT_PROMPTS.md](on-client/docs/STUDENT_PROMPTS.md), [STUDENT_LAUNCH_GUIDE.md](on-client/docs/STUDENT_LAUNCH_GUIDE.md)를 확인합니다.

17단계 목표는 **AI 연결 점검과 실제 보안 사건 설명 결과를 구별하여 안전하게 표시하는 것**입니다.

- 학생 구현: `on-client/student/extension.mjs`의 `renderAiConnection`, `renderExplanation`
- 연결 점검: `idle` / `loading` / `ok` / `error` 구분, `test` / `verified`, 모델 수와 점검 시각, 오류 원인, 초기화, 수동 재점검
- 사건 설명: 실제 응답이 성공한 경우에만 사건 ID·요약과 `data-student-explanation-event` 표시. 실패하면 원 기록 유지
- 보안 원칙: 사용자의 요청으로만 실행, 비밀값 표시·커밋 금지, AI 제안은 참고 정보이며 실제 조치의 성공으로 간주하지 않음

### 사건 설명 호출 경로(소스 코드 기준)

```text
on-client/public/app.js
  「AI 설명 요청」 → POST /api/ai/explain
on-client/src/server.mjs
  현재 사건·사용자·프로젝트·세션 확인
  native 또는 일반 경로에서 explainIncident(...) 호출
on-client/src/ai/vault-service.mjs → on-client/src/ai/service.mjs
  앱 전용 자격 증명 및 ai.explain 권한·모델 허용 여부 확인
  승인된 사건 정보를 모델 메시지로 구성 → chat(...)
on-client/vendor/clco-http.mjs
  Bearer 인증을 사용한 POST /chat/completions
```

`ai.models`로 모델 목록을 조회할 수 있더라도 별도 `ai.explain` 권한이 없으면 사건 설명이 허용된 것은 아닙니다. 실제 접속 성공에는 운영 측 계정·앱 전용 자격 증명·허용 모델과 유효한 신원/사건 연결이 필요합니다. **코드상 호출 경로 존재와 운영 서버에서 실제로 AI 응답을 받은 사실은 다릅니다.**

### 확인 상태 (2026-10-22)

- 17단계 공식 피드백: 9개 항목 중 8개 통과, `ai_model_called` **확인 불가(UNV)**. **17단계 공식 통과로 기록하지 않습니다.**
- 공식 보류 사유: 제공 서버 `on-client/src/server.mjs`와 전송 `on-client/vendor/clco-http.mjs`가 심사 입력에 파일 목록으로만 제공되어 전체 경로를 검증하지 못했다고 안내됨
- GitHub 원문 및 제출 JSON에 두 파일이 존재함은 확인했지만, **운영 AI 권한·모델 호출 성공은 미확인**
- 제공 서버·화면·전송·인증 코드는 변경하지 않습니다. 관련 진행 이력은 [Issue #90](https://github.com/SuperNova080710/choi-bujang-secret-vault/issues/90)을 참조합니다.

## 로컬 검증과 제출 주의사항

- `on-client/` 앱은 Node.js 24.19.0 대상이며, `npm run check`는 학생 화면 파일의 **문법 검사**만 수행합니다. `npm run demo`는 실제 AI 연결 성공을 증명하지 않습니다.
- 비밀번호, API 키, 토큰, 인증서, 개인키 및 비공개 운영 설정을 저장소와 제출 자료에 포함하지 않습니다.
- ALEPH 공식 심사는 제출 커밋의 **원문을 읽는 평가**이며 코드를 직접 실행하는 검증은 아닙니다. 로컬 점검과 공식 통과 판정은 구분합니다.
- 이 README 정리 실험이 AI 심사의 파일 선택이나 분량 제한을 해결한다는 보장은 없습니다. 검증 전 `main`에 병합하지 않습니다.

## 과거 상세 기록 다시 보기

과거 README 내용이 필요한 경우 다음 명령으로 **정리 이전 정본 전체**를 열람할 수 있습니다.

```bash
git show 04858ec74d6331e72fb3194093f4b9edec46bd7f:README.md
```

기존 1~12단계/XDR 기록은 해당 원본 README와 Git 커밋 기록으로 보존하고, 현재 브랜치는 위 안내서 외 다른 파일을 변경하지 않습니다.

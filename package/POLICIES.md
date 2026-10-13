# 검문소·탐지 규칙

실제로 구현한 규칙만 아래 표에 기록합니다. 로컬 가상 테스트 결과와 실제 서비스의 접근 통제 결과를 구분합니다.

| 규칙 | 단계 | 막는 공격 | 확인 방법 |
|---|---|---|---|
| `device_registered` | 6 | 등록되지 않았거나 등록 여부가 확인되지 않은 기기의 요청 | `npm run decider:test`의 미등록 기기 가상 요청 검사. 6단계 심판 100점 획득 |
| `step_up_required` | 7 | 가상 신호에서 비정상 시간, 낯선 네트워크, 최근 대량 조회가 동시에 나타나는 요청을 정상 요청으로 허용하는 행위 | `npm run decider:test`, `npm run fixture:7` 및 7단계 `src/attack-check.mjs` 가상 판정 검사 |
| `resource_zone` | 8 | 다른 사용자의 메모 단건·목록 접근, 알 수 없는 기능 경로 접근, 강사 권한이 없는 사용자의 공지 수정 | `src/attack-check.mjs`의 본인 자원 허용·목록 구역 거부·기능 경로 거부·학생 공지 수정 거부 가상 판정 검사 |
| `burst_read` | 9 | 같은 가명 사용자의 GET 조회가 어느 10분 구간에서든 120건을 초과하는 대량 조회 | `npm run detect:test` 및 9단계 `src/attack-check.mjs`의 정상·120건 경계·121건 회수 제안 가상 검사 |

## 검증 한계

- `device_registered`의 실제 요청 필드가 신뢰할 수 있는 SDP 엔진에서 전달되는지는 별도 계약 검증이 필요합니다.
- `step_up_required`는 추가 본인 확인을 요구하는 판정입니다. 실제 재인증 절차와 연결되었다는 의미가 아닙니다.
- `stepUp.verified`와 `authAgeSeconds` 값만으로 실제 재인증 성공을 입증할 수 없습니다.
- `judge_fixture`는 테스트용 가상 신호이며 실제 지역, 네트워크 또는 접속 시간의 증거가 아닙니다.
- `resource_zone`은 엔진이 확인한 `classId`, `projectId`, `subjectId`, `deviceId`, `service`, `method`, `path`, `route`를 이용해 요청 구역을 판정합니다. `subjectId`를 Supabase 사용자 UUID와 직접 비교하지 않으며 실제 자료 소유권은 최종 API에서 확인합니다.
- 강사 공지 API는 요청 본문의 `role`을 권한 근거로 사용하지 않고 서버의 `vault_instructors` 권한을 확인합니다.
- 현재 저장소에는 `vault_instructors`와 `vault_announcements`를 생성하는 DB 스키마 변경을 포함하지 않았으므로, 해당 서버 권한 데이터가 준비되지 않은 환경에서는 강사 공지 수정이 기본 거부됩니다.
- 실제 서비스의 타인 자원 접근 차단과 강사 공지 정상 수정은 배포 및 실제 권한 데이터가 준비된 뒤 별도 검증이 필요합니다.
- 9단계 `detect(events)`의 로컬 사건 계약에는 `at`, `method`, `identity.sub`만 있으므로 실제 네트워크 이상 여부나 기기 식별자를 로컬 탐지기가 임의로 추측하지 않습니다.
- `burst_read`의 `propose_revocation`은 회수 제안 결과일 뿐입니다. 실제 기기·세션 권한 회수, 운영 엔진 사건 전달, 회수까지 걸린 시간 및 심판 판정은 별도로 확인해야 합니다.
- 로컬 테스트 통과는 심판 통과를 의미하지 않습니다.

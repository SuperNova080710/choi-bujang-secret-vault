> 2026-10-27 갱신: 아래 포장 절차·검증 수치는 작성 당시 기록입니다. 사용자 전달 공지상 과제 제출은 저장소 URL+커밋 SHA이며 포장/업로드가 필수 조건이 아닙니다. 최신 Windows·AI 확인은 [현재 인수인계](WAITING_HANDOFF.md), 소개·시연은 [배포 자료](RELEASE_KIT.md)를 따릅니다. 설치형 배포 검증은 여전히 별도입니다.

# 6일차 공식 포장·설치 준비

0.2.19에는 공식 `package-app`이 포함됩니다. 사용자 Windows에서 `PROVIDED_RUNTIME_NOT_INSTALLED`를 실제 확인했고 담당자는 대기를 안내했습니다. Inno Setup은 설치 완료입니다. [현재 근거·잔여 작업](WAITING_HANDOFF.md)을 먼저 읽습니다.

## 읽기 전용 사전 점검

저장소 루트에서:

```text
node scripts/final-week-preflight.mjs
```

명령 존재, 소스 커밋·작업 상태만 읽고 파일을 변경하거나 포장·설치하지 않는다. 종료 코드 2는 남은 확인이 있다는 뜻이다. 승인 실행 환경과 학생 API의 설치형 연결을 자동으로 검증할 수 없으므로 항상 미확인으로 남긴다. ZIP 폴더는 Git 저장소가 아니어서 소스 커밋·작업 상태를 확인하지 못할 수 있다. `.git`을 새로 만들어 근거를 꾸미지 않는다.

## 공식 제공본을 받은 뒤

1. 기존 학생 파일과 Git 기록을 보존하고 공식 업데이트의 변경 목록부터 비교한다.
2. 승인된 host에서 `student/extension.mjs`와 학생 PC API가 어떻게 연결되는지 확인한다. 학생 개발 진입점만 성공한 상태를 설치형 지원으로 보지 않는다.
3. `package-app` 실제 스크립트, 필요한 아이콘(256×256 PNG), 승인 실행 환경과 INSTALL.md의 설치 방식을 확인한다.
4. Ubuntu 개발 저장소에서 변경을 커밋·푸시하고 Windows에서 같은 커밋을 받는다. 출력 폴더는 아직 없어야 하며 상위 폴더는 있어야 한다.
5. 아래는 **공식 도구가 준비된 뒤 경로를 실제 값으로 바꿔 실행하는 예시**다. 승인 실행 환경·아이콘·최종 커밋 준비 후 실행한다.

```powershell
# 공식 package-app이 존재하는 on-client에서만
npm.cmd run package-app -- --source . --out "C:\MyWork\ChoiFinalPackage" --iconPath "C:\MyWork\ChoiIcon.png" --finish-materials
```

아이콘이 공식 appearance 계약에 등록돼 있다면 안내에 따라 iconPath를 생략한다. 스키마를 추측해 appearance.json을 만들지 않는다. `PROVIDED_RUNTIME_NOT_INSTALLED`나 승인 키 관련 안내가 나오면 담당자 준비 항목으로 남기며 `--app-only-v1`로 우회하지 않는다.

## 함께 보존할 파일

동일한 마지막 실행에서 생성한 아래 네 파일만 한 묶음으로 보관한다. 이름을 바꾸거나 다시 압축하거나 다른 버전과 섞지 않는다.

- `finish.commit.raw`
- `finish.archive.tar.gz`
- `app.zip`
- `APP_PACKAGE_MANIFEST.json`

manifest의 `source.git.head`가 최종 소스 커밋과 맞는지 확인한다. finish.commit.raw의 parent는 최종 커밋 번호가 아니다. 각 파일 해시는 바이트 식별 근거이지 네 파일의 같은 버전 관계를 단독으로 증명하지는 않는다. 함께 생성한 로그·manifest·출력 경로를 보존한다.

## Inno Setup 단계

기본 패키지와 INSTALL.md의 설치·실행이 확인된 뒤에 진행한다. 지금은 실제 payload·실행 진입점·승인 host 설치 방식이 없어 완성 setup.exe 또는 실행 가능한 설치 스크립트를 생성하지 않는다.

1. 공식 기본 묶음을 보존하고 별도 재료 폴더에 복사한다.
2. Inno Setup 마법사에 실제 앱 이름·버전·게시자·재료 경로와 INSTALL.md로 확인한 실행 진입점을 지정한다.
3. 사용자 단위 설치(`PrivilegesRequired=lowest`), 사용자 쓰기 가능 설치 위치, 시작 메뉴 바로가기, 제거 기능을 사용한다.
4. 제공 runtime이 필요한 경우 공식 설치 안내를 따른다. 비밀·승인 파일을 설치 파일에 담거나 다른 PC로 복사하지 않는다.
5. 다른 새 경로에서 설치→실행→제거를 확인한다. 코드 서명·스토어 등록은 이번 필수 작업이 아니다.
6. 완성된 setup.exe의 SHA-256을 `Get-FileHash -Algorithm SHA256`으로 기록한다. 보안 경고를 없애려고 보호 설정을 끄지 않는다.

공식 참고: https://jrsoftware.org/isinfo.php · https://jrsoftware.org/ishelp/topic_setup_privilegesrequired.htm

## 제출 경로

첨부 안내에서 운영 페이지의 포장 자료 올리기는 네 파일 등록이다. 다중 캡처·최종 확인은 시험0반 전용 로컬 화면으로 설명되어 있다. 일반 학생이 받지 못한 전용 화면을 사용할 수 있다고 가정하지 않는다. 캡처를 네 파일 입력란에 대신 넣지 말고 실제 운영 안내를 확인한다.

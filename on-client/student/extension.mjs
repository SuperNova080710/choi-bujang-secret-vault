// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      // 매 호출마다 새 DOM을 만들고, 이전 입력이나 사용자 정보를 보관하지 않습니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '현재 사용자·기기·세션 정보');

      const knownValue = (value) =>
        typeof value === 'string' && value.trim() ? value : '확인 불가';
      const deviceStatus = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      };
      const sessionStatus = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      };
      // 사용자에게 읽기 쉬운 설명과 서버에서 받은 원래 상태 코드를 함께 표시합니다.
      const describeStatus = (status, labels) => {
        if (typeof status !== 'string' || !status.trim()) return '확인 불가';
        const label = Object.hasOwn(labels, status) ? labels[status] : '확인 불가';
        return `${label}(${status})`;
      };
      const modeStatus = {
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      };
      const appendText = (parent, value) => {
        const p = document.createElement('p');
        p.textContent = value;
        parent.append(p);
      };
      const appendField = (parent, field, value) => {
        const p = document.createElement('p');
        const title = document.createElement('strong');
        title.textContent = field + ': ';
        const detail = document.createElement('span');
        detail.textContent = knownValue(value);
        p.append(title, detail);
        parent.append(p);
      };
      const appendGroup = (title, resource, renderData) => {
        const group = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = title;
        group.append(heading);
        if (Object.hasOwn(modeStatus, resource?.mode)) {
          appendField(group, '연결 상태', modeStatus[resource.mode]);
        }
        if (resource?.status === 'loading') {
          appendText(group, '불러오는 중');
        } else if (resource?.status === 'ok') {
          renderData(group, resource.data);
        } else if (resource?.status === 'error') {
          // 서버 오류는 전달된 메시지를 표시하고, 이전 신원 데이터는 재사용하지 않습니다.
          const detail = knownValue(resource?.error?.message);
          appendText(group, '연결 실패: ' + detail);
        } else {
          appendText(group, '확인 불가');
        }
        root.append(group);
      };

      appendGroup('현재 로그인 사용자', me, (group, data) => {
        appendField(group, '사용자 이름', data?.user?.label);
        appendField(group, '사용자 ID', data?.user?.id);
        appendField(group, '현재 기기', data?.device?.label);
        appendField(group, '기기 ID', data?.device?.id);
        appendField(group, '기기 보안 상태',
          describeStatus(data?.device?.status, deviceStatus));
        appendField(group, '현재 세션 ID', data?.session?.id);
        appendField(group, '현재 세션 상태',
          describeStatus(data?.session?.status, sessionStatus));
      });

      appendGroup('등록 기기 목록', devices, (group, data) => {
        if (!Array.isArray(data)) {
          appendText(group, '기기 목록 확인 불가');
          return;
        }
        if (data.length === 0) {
          appendText(group, '표시할 기기가 없습니다.');
        }
        for (const device of data) {
          const item = document.createElement('div');
          appendField(item, '기기', device?.label);
          appendField(item, '기기 ID', device?.id);
          appendField(item, '보안 상태',
            describeStatus(device?.status, deviceStatus));
          group.append(item);
        }
      });

      appendGroup('로그인 세션 목록', sessions, (group, data) => {
        if (!Array.isArray(data)) {
          appendText(group, '세션 목록 확인 불가');
          return;
        }
        if (data.length === 0) {
          appendText(group, '표시할 세션이 없습니다.');
        }
        for (const session of data) {
          const item = document.createElement('div');
          appendField(item, '세션 ID', session?.id);
          appendField(item, '세션 상태',
            describeStatus(session?.status, sessionStatus));
          group.append(item);
        }
      });

      return root;
    },
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}

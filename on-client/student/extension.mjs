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
    renderDecision({ status, mode, data, error, appId } = {}) {
      // 매 호출의 자료만 새 DOM에 표시하며, 이전 판정은 보관하지 않습니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '선택한 업무 앱의 접근 판정 결과');

      const knownValue = (value) =>
        typeof value === 'string' && value.trim() ? value : '확인 불가';
      const appendText = (text) => {
        const p = document.createElement('p');
        p.textContent = text;
        root.append(p);
      };
      const appendField = (label, value) => {
        const p = document.createElement('p');
        const title = document.createElement('strong');
        title.textContent = label + ': ';
        const detail = document.createElement('span');
        detail.textContent = knownValue(value);
        p.append(title, detail);
        root.append(p);
      };
      const modeLabels = {
        demo: '예제 자료(demo) · 실제 연결 아님',
        connected: '연결됨(connected)',
        disconnected: '연결 없음(disconnected)',
        unknown: '확인 불가(unknown)',
      };
      appendField('자료 모드',
        typeof mode === 'string' && Object.hasOwn(modeLabels, mode)
          ? modeLabels[mode] : '확인 불가(unknown)');

      const selectedAppId = appId ?? data?.appId;
      if (selectedAppId != null) appendField('요청 앱 ID', selectedAppId);

      if (status === 'idle') {
        appendText('앱을 골라 접속을 요청하세요.');
      } else if (status === 'loading') {
        appendText('판정 확인 중입니다.');
      } else if (status === 'error') {
        appendText('요청 실패: ' + knownValue(error?.message));
        appendText('요청 실패는 서버의 접근 거부(deny) 판정이 아닙니다.');
      } else if (status === 'ok') {
        const labels = {
          allow: '접근 허용(allow)',
          deny: '접근 거부(deny)',
          challenge: '추가 확인 필요(challenge)',
          unknown: '확인 불가(unknown)',
        };
        const decision = typeof data?.decision === 'string'
          && Object.hasOwn(labels, data.decision) ? data.decision : 'unknown';
        appendField('접근 판정', labels[decision]);
        appendField('판정 이유', data?.reason);
        appendField('판정 시각', data?.checkedAt);
        if (decision === 'allow') {
          appendText('정책상 접근 허용이며 실제 업무 앱 접속 성공을 보장하지 않습니다.');
        } else if (decision === 'challenge') {
          appendText('추가 인증 또는 확인이 필요합니다. 이 앱은 확인 절차를 대신 수행하지 않습니다.');
        } else if (decision === 'unknown') {
          appendText('판정을 확인할 수 없습니다. 접근이 허용되었다고 간주하지 마세요.');
        }
      } else {
        appendText('접근 판정 확인 불가(unknown).');
      }
      return root;
    },
    renderEvents({ status, mode, data, error } = {}) {
      // 화면마다 새 DOM과 필터·상세 선택을 만듭니다. 이전 조회 자료는 보관하지 않습니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '본인 최근 접속·XDR 보안 기록');
      const make = (tag, value) => {
        const element = document.createElement(tag);
        if (value !== undefined) element.textContent = String(value);
        return element;
      };
      const paragraph = (parent, value) => parent.append(make('p', value));
      const knownValue = (value) =>
        typeof value === 'string' && value.trim() ? value : '확인 불가';
      const field = (parent, name, value) => {
        const p = make('p');
        p.append(make('strong', name + ': '), make('span', knownValue(value)));
        parent.append(p);
      };
      const stateLabels = {
        access: { allowed: '접근 허용', denied: '접근 거부', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
      };
      const describeState = (value, labels) => {
        const code = knownValue(value);
        const label = Object.hasOwn(labels, code) ? labels[code] : '확인 불가';
        return label + '(' + (code === '확인 불가' ? 'unknown' : code) + ')';
      };
      const kinds = { access: '접속 기록', xdr: 'XDR 경보' };
      const describeKind = (value) =>
        (Object.hasOwn(kinds, value) ? kinds[value] : '종류 확인 불가')
        + '(' + knownValue(value) + ')';
      const appLabel = (appId) =>
        appId == null ? '앱 ID 없음 · 앱 확인 불가' : knownValue(appId);
      const modes = {
        demo: '예제 데이터(demo) · 실제 연결 아님',
        connected: '연결됨(connected)',
        disconnected: '연결 없음(disconnected)',
        unknown: '확인 불가(unknown)',
      };
      field(root, '자료 모드',
        typeof mode === 'string' && Object.hasOwn(modes, mode)
          ? modes[mode] : '확인 불가(unknown)');
      paragraph(root,
        '현재 등록 정보와 맞춰 본 본인의 최근 보안 기록(최대 40건)입니다. '
        + '전체 직원의 이력이나 실시간 전체 위협 탐지가 아니며, XDR은 이미 저장된 경보만 표시합니다.');

      if (status === 'loading') {
        paragraph(root, '보안 기록을 불러오는 중입니다.');
        return root;
      }
      if (status === 'idle') {
        paragraph(root, '보안 기록 조회 전입니다.');
        return root;
      }
      if (status === 'error') {
        if (error?.code === 'CONTRACT_MISMATCH') {
          paragraph(root, '기록 확인 불가(CONTRACT_MISMATCH): 응답 계약이 일치하지 않습니다.');
        }
        paragraph(root, '기록을 불러오지 못했습니다: ' + knownValue(error?.message));
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        paragraph(root, '기록 확인 불가: 기록 응답을 확인할 수 없습니다.');
        return root;
      }
      if (data.length === 0) {
        paragraph(root, '표시할 기록이 없습니다.');
        return root;
      }

      // 원본 배열은 수정하지 않고 최신 시각이 먼저 오도록 복사본만 정렬합니다.
      const events = [...data].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      const filterArea = make('div');
      const addFilter = (name, choices) => {
        const label = make('label');
        label.append(make('span', name + ': '));
        const select = make('select');
        select.setAttribute('aria-label', name);
        const addOption = (value, title) => {
          const option = make('option', title);
          option.value = value;
          select.append(option);
        };
        addOption('all', '전체');
        for (const choice of choices) addOption(choice.value, choice.label);
        select.value = 'all';
        label.append(select);
        filterArea.append(label);
        return select;
      };
      const kindFilter = addFilter('기록 종류',
        [...new Set(events.map((event) => event.kind))]
          .map((value) => ({ value, label: describeKind(value) })));
      const appFilter = addFilter('업무 앱',
        [...new Set(events.map((event) => event.appId ?? ''))]
          .map((value) => ({
            value,
            label: value === '' ? '앱 ID 없음' : value,
          })));
      const accessFilter = addFilter('접속 상태',
        [...new Set(events.map((event) => event.state.access))]
          .map((value) => ({
            value,
            label: describeState(value, stateLabels.access),
          })));

      const count = make('p');
      const list = make('div');
      const detailSlot = make('div');
      root.append(filterArea, count, list, detailSlot);

      const addLines = (target, title, entries) => {
        const section = make('section');
        section.append(make('h4', title));
        if (!Array.isArray(entries) || entries.length === 0) {
          paragraph(section, title + ' 정보가 없습니다.');
        } else {
          const ul = make('ul');
          for (const entry of entries) {
            ul.append(make('li',
              'ID ' + knownValue(entry?.id) + ' · ' + knownValue(entry?.text)));
          }
          section.append(ul);
        }
        target.append(section);
      };
      const eventDetail = (event) => {
        const detail = make('section');
        detail.setAttribute('data-student-event-detail', event.id);
        detail.append(make('h3', event.id + ' 상세'));
        field(detail, '사건 ID', event.id);
        field(detail, '업무 앱', appLabel(event.appId));
        field(detail, '발생 시각', event.at);
        field(detail, '기록 종류', describeKind(event.kind));
        addLines(detail, '근거', event.evidence);
        addLines(detail, '규칙', event.rules);
        const states = make('section');
        states.append(make('h4', '관측 상태'));
        field(states, '접속 상태', describeState(event.state.access, stateLabels.access));
        field(states, '세션 상태', describeState(event.state.session, stateLabels.session));
        field(states, '기기 상태', describeState(event.state.device, stateLabels.device));
        detail.append(states);
        return detail;
      };

      const renderFiltered = () => {
        const filtered = events.filter((event) =>
          (kindFilter.value === 'all' || event.kind === kindFilter.value)
          && (appFilter.value === 'all' || (event.appId ?? '') === appFilter.value)
          && (accessFilter.value === 'all' || event.state.access === accessFilter.value));
        count.textContent = '필터 결과 ' + filtered.length
          + '건 / 받은 기록 ' + events.length + '건';
        list.replaceChildren();
        // 필터 변경 시 보이지 않는 이전 기록의 상세가 남지 않도록 초기화합니다.
        detailSlot.replaceChildren();
        if (filtered.length === 0) {
          paragraph(list, '필터 조건에 맞는 기록이 없습니다.');
          return;
        }
        for (const event of filtered) {
          const row = make('article');
          row.setAttribute('data-student-event-id', event.id);
          field(row, '사건 ID', event.id);
          field(row, '발생 시각', event.at);
          field(row, '기록 종류', describeKind(event.kind));
          field(row, '업무 앱', appLabel(event.appId));
          field(row, '요약', event.summary);
          const button = make('button', event.id + ' 상세');
          button.type = 'button';
          button.setAttribute('aria-label', event.id + ' 상세');
          button.addEventListener('click', () => {
            detailSlot.replaceChildren(eventDetail(event));
          });
          row.append(button);
          list.append(row);
        }
      };
      kindFilter.addEventListener('change', renderFiltered);
      appFilter.addEventListener('change', renderFiltered);
      accessFilter.addEventListener('change', renderFiltered);
      renderFiltered();
      return root;
    },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}

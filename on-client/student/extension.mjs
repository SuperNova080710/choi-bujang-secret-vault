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
        // 공식 16단계: 지원하지 않는 조치만 알립니다. 실행 요청은 생성하지 않습니다.
        if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
          const actions = make('section');
          actions.append(make('h4', '미지원 조치'));
          paragraph(actions, '조치 실행 연결은 준비 중입니다. 이 화면에서는 조치를 실행하지 않습니다.');
          for (const action of event.supportedActions) {
            const button = make('button', String(action) + ' 미지원');
            button.type = 'button';
            button.disabled = true;
            actions.append(button);
          }
          detail.append(actions);
        }
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
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      // 제공 화면의 최신 입력만 사용합니다. 네트워크 요청이나 자동 재시도는 하지 않습니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '기기·세션·알림·도움정보 상태');
      const make = (tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        return node;
      };
      const paragraph = (parent, text) => parent.append(make('p', text));
      const field = (parent, name, value) => {
        const line = make('p');
        line.append(make('strong', name + ': '), make('span', value));
        parent.append(line);
      };
      const known = (value) =>
        typeof value === 'string' && value.trim() ? value : '확인 불가';
      const labels = {
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
      };
      const describe = (value, dictionary) => {
        const code = typeof value === 'string' && value.trim() ? value : 'unknown';
        return (Object.hasOwn(dictionary, code) ? dictionary[code] : '확인 불가')
          + '(' + code + ')';
      };
      const modes = {
        connected: '연결됨(connected)',
        demo: '예제 자료(demo) · 실제 연결 아님',
        disconnected: '연결 없음(disconnected)',
        unknown: '확인 불가(unknown)',
      };
      field(root, '연결 상태', Object.hasOwn(modes, mode) ? modes[mode] : modes.unknown);
      paragraph(root,
        '등록 기기는 본인 명의의 미회수 기기 최대 100개입니다. '
        + '세션은 지금 검증된 연결 하나만 나타내며 과거 세션 전체 목록이 아닙니다.');

      const retryHint = '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요. 자동 재요청은 하지 않습니다.';
      const renderResource = (name, resource, emptyText, row) => {
        const section = make('section');
        section.append(make('h3', name));
        if (resource?.status === 'loading') {
          paragraph(section, name + ' 불러오는 중입니다.');
        } else if (resource?.status === 'error') {
          paragraph(section, name + ' 조회 실패: ' + known(resource?.error?.message));
          if (typeof resource?.error?.code === 'string' &&
            /TIMEOUT|TIMED_OUT/i.test(resource.error.code)) {
            paragraph(section, '요청 시간이 초과됐습니다.');
          }
          paragraph(section, retryHint);
        } else if (resource?.status === 'ok') {
          if (!Array.isArray(resource.data)) {
            paragraph(section, name + ' 확인 불가: 응답 형식이 올바르지 않습니다.');
          } else if (resource.data.length === 0) {
            paragraph(section, emptyText);
          } else {
            for (const item of resource.data) row(section, item);
          }
        } else if (resource?.status === 'idle') {
          paragraph(section, name + ' 조회 전입니다.');
        } else {
          paragraph(section, name + ' 확인 불가: 조회 결과가 없습니다.');
        }
        root.append(section);
      };

      renderResource('등록 기기', devices, '등록된 기기가 없습니다.', (parent, device) => {
        const item = make('div');
        field(item, '기기 이름', known(device?.label));
        field(item, '기기 상태', describe(device?.status, labels.device));
        parent.append(item);
      });
      renderResource('현재 세션', sessions, '현재 연결이 없습니다.', (parent, session) => {
        const item = make('div');
        field(item, '세션 ID', known(session?.id));
        field(item, '세션 상태', describe(session?.status, labels.session));
        parent.append(item);
      });

      const alerts = make('section');
      alerts.append(make('h3', '주의 알림'));
      if (!Array.isArray(notifications) || notifications.length === 0) {
        paragraph(alerts, '주의할 알림이 없습니다.');
      } else {
        const list = make('ul');
        for (const notice of notifications) {
          const item = make('li');
          field(item, '자료(resource)', known(notice?.resource));
          field(item, '코드(code)', known(notice?.code));
          field(item, '메시지(message)', known(notice?.message));
          list.append(item);
        }
        alerts.append(list);
      }
      root.append(alerts);

      const diag = make('section');
      diag.append(make('h3', '연결 도움정보'));
      let safeDetails = null;
      if (diagnostics?.status === 'loading') {
        paragraph(diag, '도움정보 불러오는 중입니다.');
      } else if (diagnostics?.status === 'error') {
        paragraph(diag, '도움정보 조회 실패: ' + known(diagnostics?.error?.message));
        paragraph(diag, retryHint);
      } else if (diagnostics?.status === 'ok') {
        // 허용된 필드만 형식 검증 후 재구성합니다. 중첩 ai/설정 값은 사용하지 않습니다.
        const source = diagnostics.data;
        const safeId = (value) =>
          typeof value === 'string' && value.length <= 128
          && /^[A-Za-z0-9._:-]+$/.test(value)
          && !/secret|token|password|api[_-]?key|bearer|authorization/i.test(value)
            ? value : '확인 불가';
        const safeVersion = (value) =>
          typeof value === 'string' && /^v?[0-9]+(?:\.[0-9]+){1,3}(?:[-.][A-Za-z0-9]+)?$/.test(value)
            ? value : '확인 불가';
        const safeTime = (value) =>
          typeof value === 'string'
          && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
          && Number.isFinite(Date.parse(value)) ? value : '확인 불가';
        const safeMode = (value) =>
          ['connected', 'disconnected', 'demo', 'unknown'].includes(value)
            ? value : 'unknown';
        const safeCode = (value) =>
          typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(value)
          && !/SECRET|TOKEN|PASSWORD|API_KEY|BEARER|AUTHORIZATION/.test(value)
            ? value : 'UNVERIFIED';
        safeDetails = {
          requestId: safeId(source?.requestId),
          component: safeId(source?.component),
          version: safeVersion(source?.version),
          checkedAt: safeTime(source?.checkedAt),
          engine: {
            mode: safeMode(source?.engine?.mode),
            code: safeCode(source?.engine?.code),
          },
        };
        field(diag, 'requestId', safeDetails.requestId);
        field(diag, 'component', safeDetails.component);
        field(diag, 'version', safeDetails.version);
        field(diag, 'checkedAt', safeDetails.checkedAt);
        field(diag, 'engine.mode', safeDetails.engine.mode);
        field(diag, 'engine.code', safeDetails.engine.code);
      } else if (diagnostics?.status === 'idle') {
        paragraph(diag, '도움정보 조회 전입니다. 제공 화면에서 도움정보 조회를 직접 누르세요.');
      } else {
        paragraph(diag, '도움정보 확인 불가: 조회 결과가 없습니다.');
      }

      paragraph(diag, '도움 요청 시 필요한 비밀 없는 점검 값만 복사합니다. 복사 전에는 어디에도 전송되지 않습니다.');
      const copy = make('button', '도움정보 복사');
      copy.type = 'button';
      copy.disabled = safeDetails === null;
      const feedback = make('p');
      feedback.setAttribute('role', 'status');
      copy.addEventListener('click', async () => {
        if (copy.disabled || safeDetails === null) return;
        // 복사는 사용자 클릭에만 반응합니다. 표시·복사 대상은 동일한 6개 필드입니다.
        const payload = JSON.stringify(safeDetails, null, 2);
        try {
          if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
            throw new Error('CLIPBOARD_UNAVAILABLE');
          }
          await navigator.clipboard.writeText(payload);
          feedback.textContent = '안전한 도움정보를 클립보드에 복사했습니다.';
        } catch {
          feedback.textContent = '복사할 수 없습니다. 브라우저 클립보드 권한을 확인하세요.';
        }
      });
      diag.append(copy, feedback);
      root.append(diag);
      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted } = {}) {
      // 제공 서버가 넘긴 현 시점의 점검 결과만 표시합니다. 요청·재시도·자격 관리는 제공 화면의 책임입니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', 'AI 연결 점검 상태');
      const make = (tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        return node;
      };
      const paragraph = (value) => root.append(make('p', value));
      const field = (label, value) => {
        const line = make('p');
        line.append(make('strong', label + ': '), make('span', value));
        root.append(line);
      };
      const modes = {
        connected: '연결됨(connected)',
        demo: '예제 자료(demo) · 실제 AI 연결 확인 아님',
        disconnected: '연결 없음(disconnected)',
        unknown: '확인 불가(unknown)',
      };
      field('자료 모드', Object.hasOwn(modes, mode) ? modes[mode] : modes.unknown);

      // 공식 앱에서 안전하게 정규화해 넘기는 코드만 분류합니다.
      const guidance = {
        ON_AI_PROVISIONING_PENDING: '앱 이용 권한이 준비 중이거나 확인되지 않았습니다. 담당자에게 계정 연결과 앱 권한을 확인 요청하세요.',
        ON_AI_AUTHORIZATION_CHANGED: '점검 중 이용 권한이 변경됐습니다. 담당자에게 현재 권한을 확인 요청하세요.',
        SUBJECT_SCOPE_UNVERIFIED: '현재 계정과 프로젝트의 연결을 확인할 수 없습니다. 담당자에게 확인 요청하세요.',
        WB_CLCO_AUTH_REQUIRED: '앱 인증에 실패했습니다. 계정 연결과 앱 승인을 다시 확인하고 담당자에게 문의하세요.',
        WB_CLCO_ACCESS_BLOCKED: '앱 접근이 제한됐습니다. 담당자에게 이용 권한을 확인 요청하세요.',
        WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반의 AI 사용량이 소진됐습니다. 담당자에게 한도를 확인 요청하세요.',
        WB_CLCO_LIMIT_REACHED: 'AI 이용 한도에 도달했습니다. 담당자에게 확인 요청하세요.',
        WB_CLCO_SESSION_CLOSED: '현재 AI 이용 시간이 아닙니다. 이용 가능 시간을 확인하세요.',
        WB_CLCO_RATE_LIMITED: '요청이 일시적으로 제한됐습니다. 잠시 뒤 버튼을 직접 눌러 다시 점검하세요.',
        WB_CLCO_TIMEOUT: 'AI 응답 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
        REQUEST_TIMEOUT: '서버 AI 요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
        ENGINE_TIMEOUT: '서버 확인 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
        TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
        WB_CLCO_NETWORK_ERROR: 'AI 네트워크 연결에 실패했습니다. 연결 상태를 확인하고 직접 다시 점검하세요.',
        WB_CLCO_SERVER_UNAVAILABLE: 'AI 서버에 연결할 수 없습니다. 잠시 뒤 직접 다시 점검하세요.',
        WB_CLCO_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 점검 결과가 아닙니다.',
        CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 점검 결과가 아닙니다.',
        REQUEST_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 점검 결과가 아닙니다.',
        ON_AI_MODEL_LIST_EMPTY: '현재 앱에서 사용할 수 있는 모델이 없습니다. 담당자에게 모델 허용 설정을 확인 요청하세요.',
        MODEL_NOT_CONFIGURED: '사용할 모델이 설정되지 않았습니다. 담당자에게 모델 허용 설정을 확인 요청하세요.',
        WB_CLCO_INVALID_RESPONSE: '게이트 응답을 확인할 수 없습니다. 담당자에게 게이트 버전과 앱 권한을 확인 요청하세요.',
        ON_AI_INVALID_INPUT: 'AI 요청의 입력을 확인할 수 없습니다. 담당자에게 확인 요청하세요.',
        ON_AI_INVALID_OUTPUT: 'AI 응답을 확인할 수 없습니다. 담당자에게 확인 요청하세요.',
        AI_REQUEST_UNVERIFIED: 'AI 연결 또는 응답을 확인할 수 없습니다. 담당자에게 계정 연결과 앱 권한을 확인 요청하세요.',
      };
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+)/i;
      const safeMessage = (value) =>
        typeof value === 'string' && value.trim() && value.length <= 400
        && !secretPattern.test(value) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
          ? value : '오류 상세 정보 확인 불가';

      if (status === 'idle') {
        paragraph('AI 연결 점검 전입니다.');
      } else if (status === 'loading') {
        paragraph('AI 연결 점검 중입니다.');
      } else if (status === 'error') {
        const code = typeof error?.code === 'string' && Object.hasOwn(guidance, error.code)
          ? error.code : 'AI_REQUEST_UNVERIFIED';
        paragraph('AI 연결 점검 실패');
        field('오류 코드', code);
        field('오류 메시지', safeMessage(error?.message));
        paragraph(guidance[code]);
      } else if (status === 'ok') {
        if (data?.transportChecked !== true
          || !['test', 'verified'].includes(data?.audienceAuthorization)
          || !Number.isInteger(data?.modelCount) || data.modelCount < 0
          || typeof checkedAt !== 'string' || !Number.isFinite(Date.parse(checkedAt))) {
          paragraph('AI 연결 점검 결과를 확인할 수 없습니다. 담당자에게 응답 계약을 확인 요청하세요.');
        } else {
          paragraph(data.audienceAuthorization === 'test'
            ? '시험 연결 점검(test) · 실제 앱 권한 확인 아님'
            : '앱 권한 확인 후 점검(verified) · 해당 점검 시각 기준');
          field('모델 수', data.modelCount);
          field('점검 시각', checkedAt);
          paragraph('이 결과는 AI 연결과 모델 목록만 점검한 것입니다. 사건 설명은 아직 실행하지 않았습니다.');
          // explanationAccepted 값으로 성공을 유추하지 않습니다. 사건 설명은 보안 기록에서만 확인합니다.
          void explanationAccepted;
        }
      } else {
        paragraph('AI 연결 점검 상태를 확인할 수 없습니다.');
      }
      paragraph('자동으로 다시 점검하지 않습니다. 필요한 경우 「현재 API 연결 점검」 버튼을 직접 누르세요.');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      // 17단계 기초 표시: 제공된 사건 설명 실행 결과만 표시하고 새 AI 호출·조치는 수행하지 않습니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '선택한 보안 사건의 AI 설명');
      const make = (tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        return node;
      };
      const paragraph = (value) => root.append(make('p', value));
      const field = (label, value) => {
        const line = make('p');
        line.append(make('strong', label + ': '), make('span', value));
        root.append(line);
      };
      const validId = (value) =>
        typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value);
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+)/i;
      const safeMessage = (value) =>
        typeof value === 'string' && value.trim() && value.length <= 400
        && !secretPattern.test(value) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
          ? value : '오류 상세 정보 확인 불가';

      if (!event) {
        paragraph('보안 기록에서 사건을 먼저 선택하세요.');
      } else if (explanation?.status === 'loading') {
        paragraph('AI 사건 설명 요청 중입니다.');
      } else if (explanation?.status === 'idle' || !explanation) {
        paragraph('선택한 사건의 AI 설명은 아직 요청하지 않았습니다.');
      } else if (explanation.status === 'ok') {
        const summary = explanation.data?.summary;
        if (!validId(event.id) || typeof summary !== 'string'
          || !summary.trim() || summary.length > 1500 || secretPattern.test(summary)) {
          paragraph('AI 사건 설명 결과를 확인할 수 없습니다. 사건 ID 또는 요약 형식이 올바르지 않습니다.');
          paragraph('기존 보안 기록은 그대로입니다.');
        } else {
          root.setAttribute('data-student-explanation-event', event.id);
          paragraph('AI 설명(참고용) · 실제 조치 실행 결과가 아닙니다.');
          field('사건 ID', event.id);
          field('AI 요약', summary);
          if (typeof checkedAt === 'string' && Number.isFinite(Date.parse(checkedAt))) {
            field('설명 확인 시각', checkedAt);
          }
        }
      } else if (explanation.status === 'error') {
        const code = typeof explanation.error?.code === 'string'
          && /^[A-Z][A-Z0-9_]{0,79}$/.test(explanation.error.code)
          ? explanation.error.code : 'AI_REQUEST_UNVERIFIED';
        paragraph('AI 사건 설명 실패');
        field('오류 코드', code);
        field('오류 메시지', safeMessage(explanation.error?.message));
        paragraph('기존 보안 기록은 그대로입니다. 설명 실패는 기존 판정이나 기록을 변경하지 않습니다.');
      } else {
        paragraph('AI 사건 설명 상태를 확인할 수 없습니다.');
        paragraph('기존 보안 기록은 그대로입니다.');
      }
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}

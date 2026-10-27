// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView({ api } = {}) {
  let pcPanel;
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
      pcPanel ??= createPcObservationView({ api });
      pcPanel.setConnection(mode);
      root.append(pcPanel, createGithubReadinessView());
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
    renderVulnerabilities({ status = 'idle', mode, data, error } = {}) {
      // 제공 앱이 응답 검증과 요청 취소/세대 관리를 담당합니다.
      // 매 입력마다 새 DOM을 반환하여 이전 표·해시·행 속성을 재사용하지 않습니다.
      const make = (tag, text) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = String(text);
        return node;
      };
      const root = make('section');
      root.setAttribute('aria-label', '설치 패키지 취약점 조회 결과');
      const line = (text) => root.append(make('p', text));
      const field = (label, value) => {
        if (value !== undefined && value !== null && value !== '') line(`${label}: ${value}`);
      };
      const safeText = (value) => typeof value === 'string' && value.trim()
        && !/[\u0000-\u001f\u007f]|bearer\s+\S+|sk-[A-Za-z0-9_-]{8,}|private\s*key|password|-----BEGIN /i.test(value);
      const statusLine = (text) => {
        const node = make('p', text);
        node.setAttribute('role', 'status');
        root.append(node);
      };
      if (status === 'idle') {
        statusLine('조회 전(idle): 아직 설치 패키지를 조회하지 않았습니다.');
        return root;
      }
      if (status === 'loading') {
        statusLine('조회 중(loading): 설치 패키지의 알려진 취약점 정보를 확인하고 있습니다.');
        return root;
      }
      if (status === 'error') {
        statusLine('조회 실패(error): ' + (safeText(error?.message) ? error.message : '오류 상세 정보 확인 불가'));
        if (typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)) field('오류 코드', error.code);
        line('이전 조회 결과는 현재 결과가 아닙니다. 제공 화면의 설치 패키지 조회로 직접 다시 조회하세요.');
        return root;
      }
      const scanLabels = {
        complete: '모두 조회', partial: '일부 조회 실패', not_checked: '아직 조회 안 함',
        not_configured: '조회 준비 미완료', unverifiable: 'lock 파일 확인 불가',
      };
      if (status !== 'ok' || !data || !Object.hasOwn(scanLabels, data.status) || !Array.isArray(data.packages)) {
        statusLine('조회 확인 불가: 조회 결과 형식을 확인할 수 없습니다.');
        return root;
      }
      statusLine(`${scanLabels[data.status]}(${data.status})`);
      if (mode === 'demo') line('예제 자료(demo): 실제 프로젝트 조회 결과가 아닙니다.');
      field('잠금 파일 버전(lockfileVersion)', data.lockfileVersion);
      field('잠금 파일 해시(lockfileHash)', data.lockfileHash);
      field('전체 확인 시각(checkedAt)', data.checkedAt);
      if (data.status === 'not_configured') line('조회 대상 프로젝트 설정이 필요합니다. 대상 경로와 허용 패키지는 운영자가 준비합니다.');
      if (data.status === 'not_checked') line('승인된 공개 조회 대상이 없어 아직 조회하지 않았습니다. 취약점이 없다는 뜻이 아닙니다.');
      if (data.status === 'unverifiable') line('package-lock.json 확인이 불가능하여 설치 버전과 취약점 조회 결과를 확인할 수 없습니다.');
      if (data.status === 'partial') line('일부 패키지의 전체 조회를 확인할 수 없습니다. 이미 확인한 취약점 ID는 아래에 유지합니다.');
      line('OSV는 알려진 취약점 데이터베이스입니다. 조회 범위에서 항목이 없더라도 패키지나 앱 전체의 안전성을 보장하지 않습니다.');
      if (data.packages.length === 0) {
        line('표시할 패키지 조회 결과가 없습니다.');
        return root;
      }
      const table = make('table');
      table.append(make('caption', '설치 패키지별 알려진 취약점 조회 결과'));
      const head = make('thead'), headings = make('tr');
      for (const label of ['패키지', '정확한 설치 버전', '조회 상태', '출처', '확인 시각', '취약점 ID · 수정 시각']) {
        const cell = make('th', label);
        cell.setAttribute('scope', 'col');
        headings.append(cell);
      }
      head.append(headings);
      table.append(head);
      const body = make('tbody');
      const packageLabels = {
        known_vulnerabilities: '알려진 항목 있음', none_found: '알려진 항목 없음', unverifiable: '조회 확인 불가',
      };
      for (const pkg of data.packages) {
        const row = make('tr');
        row.setAttribute('data-student-package-name', pkg.name);
        row.setAttribute('data-student-package-version', pkg.version);
        // version은 제공 앱이 검증한 lock/설치 메타데이터의 정확한 값입니다.
        // package.json의 범위로 대체하거나 임의의 버전·출처·시각을 만들지 않습니다.
        row.append(make('td', pkg.name), make('td', pkg.version));
        let description = `${packageLabels[pkg.status] ?? '조회 확인 불가'}(${pkg.status})`;
        const findings = Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities : [];
        if (pkg.status === 'unverifiable' && findings.length > 0) description = '일부 확인·전체 조회 확인 불가(unverifiable)';
        if (pkg.status === 'none_found') description += ': 조회 시점·조회 범위에서 알려진 항목이 없습니다.';
        row.append(make('td', description), make('td', pkg.source ?? '확인 불가'), make('td', pkg.checkedAt ?? '확인 불가'));
        const cell = make('td');
        if (findings.length > 0) {
          const list = make('ul');
          for (const finding of findings) list.append(make('li', `${finding.id} — 수정 시각(modified): ${finding.modified ?? '확인 불가'}`));
          cell.append(list);
        } else cell.textContent = pkg.status === 'none_found' ? '조회 범위에서 알려진 항목 없음' : '확인된 취약점 ID 없음·전체 결과 확인 불가';
        row.append(cell);
        body.append(row);
      }
      table.append(body);
      root.append(table);
      return root;
    },
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
      // 매 호출마다 새 DOM을 반환합니다. 제공 앱이 이전 DOM을 교체하며 AI 호출·조치는 수행하지 않습니다.
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

      const fail = (reason) => {
        paragraph('AI 설명 실패: ' + reason);
        paragraph('기존 보안 기록은 그대로입니다. 설명 실패는 기존 판정이나 기록을 변경하지 않으며 과제 실패를 뜻하지 않습니다.');
      };
      // 오류는 사건 없음보다 먼저 표시합니다. 제공 앱이 근거 부족 사건을 null로 전달할 수 있습니다.
      if (explanation?.status === 'error') {
        const code = typeof explanation.error?.code === 'string'
          && /^[A-Z][A-Z0-9_]{0,79}$/.test(explanation.error.code)
          ? explanation.error.code : 'AI_REQUEST_UNVERIFIED';
        fail(safeMessage(explanation.error?.message));
        field('오류 코드', code);
        if (code === 'ON_AI_INVALID_INPUT') {
          paragraph('설명에 필요한 사건 근거·규칙이 부족하거나 입력을 확인할 수 없습니다.');
        } else if (code === 'ON_AI_INVALID_OUTPUT') {
          paragraph('근거 불일치 또는 조치·응답 계약 위반으로 설명을 사용할 수 없습니다. 이미 실행했다고 답한 설명도 사용할 수 없습니다.');
        }
      } else if (!event) {
        paragraph('보안 기록에서 기록을 먼저 고르세요.');
      } else if (explanation?.status === 'loading') {
        paragraph('AI 사건 설명 요청 중입니다.');
      } else if (explanation?.status === 'idle' || !explanation) {
        paragraph('선택한 사건의 AI 설명은 아직 요청하지 않았습니다.');
      } else if (explanation.status === 'ok') {
        const data = explanation.data;
        const safeText = (value, limit) => typeof value === 'string' && value.trim()
          && value.length <= limit && !secretPattern.test(value)
          && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
        const rowsValid = (rows, limit) => Array.isArray(rows) && rows.length > 0
          && rows.every((row) => validId(row?.id) && safeText(row?.text, limit))
          && new Set(rows.map((row) => row.id)).size === rows.length;
        // 요약을 붙이기 전에 현재 사건의 모든 인용과 미실행 계약을 확인합니다.
        if (!validId(event.id) || !safeText(data?.summary, 1500)) {
          fail('사건 ID 또는 요약 형식을 확인할 수 없습니다.');
          return root;
        }
        if (data.executed !== false || data.requiresHumanConfirmation !== true) {
          fail('이미 실행했다고 답했거나 사람 확인·미실행 상태를 확인할 수 없어 설명을 사용할 수 없습니다.');
          return root;
        }
        if (!rowsValid(event.evidence, 500) || !rowsValid(event.rules, 300)) {
          fail('사건 근거·규칙이 부족하거나 형식을 확인할 수 없어 설명을 사용할 수 없습니다.');
          return root;
        }
        const evidence = new Map(event.evidence.map((row) => [row.id, row.text]));
        const validRefs = (refs) => Array.isArray(refs) && refs.length > 0
          && new Set(refs).size === refs.length
          && refs.every((id) => evidence.has(id));
        if (!validRefs(data.evidenceIds) || data.evidenceIds.length !== evidence.size) {
          fail('근거가 맞지 않음: 현재 사건에 없는 근거 ID, 누락 또는 중복 인용이 있어 설명을 사용할 수 없습니다.');
          return root;
        }
        if (!Array.isArray(event.supportedActions) || !Array.isArray(data.proposals)
          || data.proposals.some((proposal) => !validId(proposal?.action)
            || !event.supportedActions.includes(proposal.action)
            || !validRefs(proposal.evidenceIds) || !safeText(proposal.reason, 500))) {
          fail('제안의 지원 조치·근거·이유를 확인할 수 없어 설명을 사용할 수 없습니다.');
          return root;
        }

        root.setAttribute('data-student-explanation-event', event.id);
        root.append(make('h3', 'AI 설명(참고용)'));
        paragraph('AI 요약은 해석입니다. 사실 판단은 근거 글과 연동 시스템이 알려 준 현재 상태를 기준으로 하세요.');
        field('사건 ID', event.id);
        field('AI 요약', data.summary);
        if (typeof checkedAt === 'string' && Number.isFinite(Date.parse(checkedAt))) {
          field('설명 확인 시각', checkedAt);
        }
        root.append(make('h4', '인용한 근거'));
        const references = make('ul');
        for (const id of data.evidenceIds) references.append(make('li', id + ' — ' + evidence.get(id)));
        root.append(references, make('h4', '현재 규칙'));
        const rules = make('ul');
        for (const rule of event.rules) rules.append(make('li', rule.id + ' — ' + rule.text));
        root.append(rules, make('h4', '확인 불가 상태'));
        const unknown = make('ul');
        for (const [key, name] of [['access', '접속'], ['session', '세션'], ['device', '기기']]) {
          if (event.state?.[key] === 'unknown') {
            unknown.append(make('li', name + ': 확인 불가(unknown)'));
          }
        }
        if (unknown.childElementCount === 0) paragraph('없음');
        else root.append(unknown);
        root.append(make('h4', '조치 제안'));
        if (data.proposals.length === 0) {
          paragraph(event.supportedActions.length === 0
            ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
            : 'AI가 제안한 조치가 없습니다.');
        } else {
          const proposals = make('ul');
          for (const proposal of data.proposals) {
            const item = make('li');
            item.append(make('p', proposal.action + ' — ' + proposal.reason));
            item.append(make('p', '근거 ID: ' + proposal.evidenceIds.join(', ')));
            item.append(make('p', '사람 확인이 필요하며 실행되지 않았습니다.'));
            proposals.append(item);
          }
          root.append(proposals);
        }
        paragraph('AI 설명·제안만으로 보안 조치가 실행되지는 않습니다. 아직 실행되지 않았습니다.');
      } else {
        paragraph('AI 사건 설명 상태를 확인할 수 없습니다.');
        paragraph('기존 보안 기록은 그대로입니다.');
      }
      return root;
    },
    renderAction({ status = 'idle', event, actionId, target, receipt, observation,
      message, confirmationExpiresAt, error } = {}) {
      // 입력을 보관하지 않고 새 DOM을 반환합니다. 교체·요청 취소·중복 방지는 제공 앱이 담당합니다.
      const root = document.createElement('section');
      root.setAttribute('aria-label', '현재 사건의 보안 조치 상태');
      const make = (tag, text) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = String(text);
        return node;
      };
      const paragraph = (text) => root.append(make('p', text));
      const field = (name, value) => {
        const row = make('p');
        row.append(make('strong', name + ': '), make('span', value));
        root.append(row);
      };
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|ac-on-[A-Za-z0-9_-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|token|비밀번호|토큰)\s*[:=]\s*\S+)/i;
      const safeText = (value) => typeof value === 'string' && value.trim()
        && value.length <= 500 && !secretPattern.test(value)
        && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
      const safeId = (value) => safeText(value)
        && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
      const safeTime = (value) => typeof value === 'string'
        && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
        && Number.isFinite(Date.parse(value));
      const idField = (name, value) => { if (safeId(value)) field(name, value); };
      const numberField = (name, value) => {
        if (Number.isSafeInteger(value) && value >= 0) field(name, value);
      };
      const labels = {
        idle: '아직 미실행(idle)',
        loading: '조치 준비 또는 결과 조회 중(loading)',
        prepared: '준비됨·미실행(prepared)',
        executing: '서버에 전달 중(executing)',
        pending: '서버 접수·처리 중(pending)',
        succeeded: '효과 확인(succeeded)',
        denied: '연동 시스템 거절(denied)',
        failed: '연동 시스템 처리 실패(failed)',
        unknown: '결과 불명(unknown)',
        expired: '확인 기한 지남(expired)',
        error: '요청 처리 안 됨(error)',
      };
      // 다른 사건·조치의 영수증은 현재 결과로 붙이지 않습니다.
      const mismatched = (receipt?.eventId != null && receipt.eventId !== event?.id)
        || (receipt?.actionId != null && receipt.actionId !== actionId);
      const confirmed = status === 'succeeded' && !mismatched
        && observation?.effectApplied === true && safeTime(observation.observedAt)
        && safeId(receipt?.receiptId);
      const displayStatus = mismatched || !Object.hasOwn(labels, status)
        || (status === 'succeeded' && !confirmed) ? 'unknown' : status;
      root.append(make('h3', labels[displayStatus]));
      if (displayStatus !== status && Object.hasOwn(labels, status)) field('받은 상태', status);

      // 이 속성은 현재 입력의 식별자입니다. 조치가 성공했다는 뜻이 아닙니다.
      if (!mismatched && safeId(event?.id)) root.setAttribute('data-student-action-event', event.id);
      if (!mismatched && safeId(receipt?.requestId)) root.setAttribute('data-student-action-request', receipt.requestId);
      idField('사건 ID', event?.id);
      if (Array.isArray(event?.evidence)) {
        const list = make('ul');
        for (const evidence of event.evidence) {
          if (safeId(evidence?.id)) list.append(make('li', evidence.id));
        }
        root.append(make('h4', '현재 사건의 근거 ID'));
        if (list.childElementCount > 0) root.append(list);
        else paragraph('제공된 근거 ID가 없습니다.');
      }
      idField('조치 ID(actionId)', actionId);
      idField('실제 대상 ID(target.id)', target?.id);
      numberField('대상 세대(target.generation)', target?.generation);
      if (!mismatched) {
        idField('요청 ID(requestId)', receipt?.requestId);
        idField('접수 ID(receiptId)', receipt?.receiptId);
        numberField('결과 버전(version)', receipt?.version);
        if (receipt?.replayed === true) {
          paragraph('동일 요청의 기존 접수 결과입니다(replayed: true). 새 조치 실행을 뜻하지 않습니다.');
        }
      } else {
        paragraph('영수증의 사건 또는 조치가 현재 입력과 일치하지 않아 현재 결과로 표시할 수 없습니다.');
      }

      if (displayStatus === 'idle') {
        paragraph('AI 제안만으로 조치를 실행하지 않습니다. 사람 확인이 필요합니다.');
      } else if (displayStatus === 'loading') {
        paragraph('준비 또는 조회 결과를 기다리고 있습니다. 현재 조치 효과는 아직 확인되지 않았습니다.');
      } else if (displayStatus === 'prepared') {
        field('사람 확인 기한(confirmationExpiresAt)',
          safeTime(confirmationExpiresAt) ? confirmationExpiresAt : '확인 불가');
        paragraph('아직 실행되지 않았습니다. 사건·근거·조치·실제 대상과 확인 기한을 확인한 뒤 제공 화면의 「대상과 조치를 확인했으며 집행합니다」 버튼을 사용하세요.');
      } else if (displayStatus === 'executing') {
        paragraph('서버에 요청을 전달하고 있습니다. 처리 결과와 실제 효과는 아직 확인되지 않았습니다.');
      } else if (displayStatus === 'pending') {
        paragraph('서버가 요청을 접수하여 처리 중입니다. 접수 응답(ACK)은 실제 효과 확인이 아니며 결과는 아직 확인되지 않았습니다.');
      } else if (displayStatus === 'succeeded') {
        field('관측 시각(observedAt)', observation.observedAt);
        field('effectApplied', 'true');
      } else if (displayStatus === 'unknown') {
        paragraph('성공이나 효과 없음으로 판단하지 마세요. 같은 조치를 다시 집행하지 말고 제공 화면의 「원천 결과만 재조회」 버튼으로 결과만 확인하세요.');
        if (status === 'succeeded' && !confirmed && !mismatched) {
          paragraph('실제 효과(effectApplied: true)·관측 시각·접수 ID를 함께 확인할 수 없어 결과 불명으로 표시합니다.');
        }
      } else if (displayStatus === 'expired') {
        paragraph('이전 준비로는 집행할 수 없습니다. 제공 화면에서 조치를 다시 준비하고 대상과 새 확인 기한을 확인하세요.');
      }
      if (safeText(message)) field('안내', message);
      else if (displayStatus === 'denied' || displayStatus === 'failed') field('이유', '상세 이유 확인 불가');
      if (error || displayStatus === 'error') {
        const code = typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)
          ? error.code : 'ACTION_RESULT_UNVERIFIED';
        field('오류 코드', code);
        field('오류 메시지', safeText(error?.message) ? error.message : '오류 상세 정보 확인 불가');
      }
      if (Array.isArray(event?.supportedActions) && event.supportedActions.length === 0) {
        paragraph('연동 시스템이 지원하는 조치가 없어 「조치 준비」 버튼이 나오지 않는 것이 정상입니다.');
      } else if (!event) {
        paragraph('연동 시스템이 지원하는 조치가 없는 기록에는 「조치 준비」 버튼이 나오지 않는 것이 정상입니다.');
      }
      paragraph('「조치 화면 취소」는 화면의 준비·조회 상태를 지웁니다. 이미 서버에 전달된 조치 효과를 되돌리지 않습니다.');
      return root;
    },
  };
}


// 학생 추가 기능. 요청은 사용자가 버튼을 누를 때만 보내며 PC 자료는 메모리에만 둡니다.
export function createPcObservationView({ api, request = (...args) => fetch(...args), timeoutMs = 16000 } = {}) {
  const make = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
  const official = typeof api?.get === 'function';
  const root = make('section'); root.className = 'pc-observations'; root.setAttribute('aria-label', '내 PC 조회 타임라인');
  const title = make('h2', '내 PC 조회 타임라인');
  const connection = make('p'); connection.className = 'muted';
  root.setConnection = mode => { connection.textContent = 'SDP 자료: ' + ({ demo: '예제 자료 · 실제 서버 연결 아님', disconnected: 'SDP 미연결', connected: '연결된 자료', unknown: '연결 여부 확인 불가' }[mode] ?? '연결 여부 확인 불가') + ' · PC 실측과 별도입니다.'; };
  root.setConnection('unknown');
  const intro = make('p', '이 앱 서버가 실행되는 PC를 읽습니다. 버튼을 누를 때만 측정하며 화면을 닫으면 조회 기록이 사라집니다.');
  const actions = make('div'); actions.className = official ? 'pc-actions row' : 'pc-actions';
  const read = make('button', '다시 조회'), cancel = make('button', '조회 취소'), clear = make('button', '조회 기록 지우기');
  for (const button of [read, cancel, clear]) { button.type = 'button'; button.className = 'btn'; }
  cancel.disabled = true; actions.append(read, cancel, clear);
  const status = make('p', '아직 조회하지 않았습니다.'); if (official) status.className = 'state state-empty'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const current = make('div'); current.className = 'pc-current';
  const filterLabel = make('label', '조회 기록 필터 '), filter = make('select'); filter.setAttribute('aria-label', 'PC 조회 기록 필터');
  for (const [value, text] of [['all', '전체'], ['resources', 'CPU·메모리·디스크'], ['security', '연결·방화벽·이벤트'], ['unknown', '확인 불가']]) {
    const option = make('option', text); option.value = value; filter.append(option);
  }
  if (official) { filterLabel.className = 'event-actions'; filter.className = 'btn'; }
  filterLabel.append(filter);
  const history = make('ol'); history.className = official ? 'pc-history records' : 'pc-history';
  const note = make('p', 'Windows 경고·오류 건수는 침해·공격 탐지 결과가 아닙니다. 방화벽은 프로필 설정이며 실제 차단 효과를 판정하지 않습니다. 네트워크 링크 연결은 인터넷·SDP 접속 성공을 뜻하지 않습니다.'); note.className = 'muted';
  const style = make('link'); style.rel = 'stylesheet'; style.href = '/student/pc-view.css';
  if (!official) root.append(style);
  root.append(title, intro, connection, actions, status, current, filterLabel, history, note);
  if (official) intro.textContent = '공식 PC 조회 기능으로 읽고, 학생 화면에서 최근 30회 기록과 직전 값을 비교합니다. 수동 조회이며 화면을 닫으면 기록이 사라집니다.';
  let rows = [], generation = 0, controller, timer;
  const evidenceNodes = new Map();
  const expandedEvidence = new Set();
  const names = { cpu: 'CPU 사용률', memory: '메모리 사용량', disk: '시스템 디스크 여유', network: '네트워크 어댑터', firewall: '방화벽 프로필 설정', systemEvents: 'System 경고·오류', applicationEvents: 'Application 경고·오류' };
  if (official) { names.disk = '앱 위치 디스크 여유'; names.network = '네트워크 구성'; delete names.systemEvents; delete names.applicationEvents; names.events = 'System·Application 합산 경고·오류'; }
  const keys = Object.keys(names);
  const numeric = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const integer = v => Number.isSafeInteger(v) && v >= 0;
  const gib = n => (n / 1073741824).toFixed(2) + ' GiB';
  const time = iso => new Date(iso).toLocaleString('ko-KR', { hour12: false }) + ' (PC 현지 시각)';
  const reason = code => ({ WINDOWS_ONLY: 'Windows에서만 조회할 수 있습니다.', READ_FAILED: '권한 또는 조회 기능을 확인한 뒤 다시 조회하세요.', COLLECTOR_FAILED: 'Windows 조회가 실패하거나 제한 시간을 넘었습니다. 실행 환경을 확인한 뒤 다시 조회하세요.', INVALID_RESULT: '조회 결과 형식을 확인하지 못했습니다.' }[code] ?? '조회 결과를 확인하지 못했습니다. 다시 조회하세요.');
  function summary(key, row) {
    const v = row?.value;
    if (row?.status !== 'ok') return '확인 불가 — ' + reason(row?.code);
    if (key === 'cpu' && numeric(v) && v <= 100) return v.toFixed(1) + (official ? '% · 200ms 구간' : '% · 500ms 구간');
    if (key === 'memory' && numeric(v?.totalBytes) && v.totalBytes > 0 && numeric(v?.usedBytes) && v.usedBytes <= v.totalBytes)
      return gib(v.usedBytes) + ' / ' + gib(v.totalBytes) + ' (' + (v.usedBytes / v.totalBytes * 100).toFixed(1) + '% · 전체−여유)';
    if (key === 'disk' && numeric(v?.totalBytes) && v.totalBytes > 0 && numeric(v?.freeBytes) && v.freeBytes <= v.totalBytes)
      return gib(v.freeBytes) + ' / ' + gib(v.totalBytes) + ' 여유';
    if (official && key === 'network') return integer(v?.interfaceCount) && integer(v?.ipv4Count) ? '외부 인터페이스 ' + v.interfaceCount + '개 · IPv4 구성 ' + v.ipv4Count + '개 (링크 Up 수 아님)' : '확인 불가 — 조회 결과 형식이 올바르지 않습니다.';
    if (key === 'events' && integer(v?.warningCount) && integer(v?.errorCount) && v.warningCount + v.errorCount <= 5000 && v.sampleLimit === 5000 && typeof v.truncated === 'boolean' && Number.isFinite(Date.parse(v.since))) return '경고 ' + v.warningCount + '건 · 오류 ' + v.errorCount + '건 · System·Application 합산, 최대 5,000건' + (v.truncated ? ' (일부 집계)' : '') + ' · ' + time(v.since) + ' 이후';
    if (key === 'network' && integer(v?.total) && integer(v?.up) && v.up <= v.total) return '링크 연결 ' + v.up + '개 / 전체 ' + v.total + '개';
    if (key === 'firewall' && ['domain', 'private', 'public'].every(k => typeof v?.[k] === 'boolean'))
      return ['domain', 'private', 'public'].map(k => k + ': ' + (v[k] ? '켜짐' : '꺼짐')).join(' · ');
    if (['systemEvents', 'applicationEvents'].includes(key) && integer(v?.warnings) && integer(v?.errors) && v.warnings + v.errors <= 10000 && typeof v.capped === 'boolean'
      && Number.isFinite(Date.parse(v.windowStart)) && Number.isFinite(Date.parse(v.windowEnd)) && Date.parse(v.windowStart) < Date.parse(v.windowEnd))
      return '경고 ' + v.warnings + '건 · 오류 ' + v.errors + '건' + (v.capped ? ' · 최신 10,000건만 집계 (전체 아님)' : '') + ' · ' + time(v.windowStart) + ' ~ ' + time(v.windowEnd);
    return '확인 불가 — 조회 결과 형식이 올바르지 않습니다.';
  }
  function validate(data) {
    if (official) data = normalizeOfficialPc(data);
    if (data?.schema !== 'choi.pc-observation.v1' || data.mode !== 'measured' || !Number.isFinite(Date.parse(data.checkedAt)) || !data.metrics) throw Error('INVALID_RESULT');
    const copy = { at: data.checkedAt, platform: typeof data.platform === 'string' ? data.platform : 'unknown', metrics: {} };
    for (const key of keys) {
      const row = data.metrics[key];
      if (!row || !['ok', 'unknown'].includes(row.status) || !Number.isFinite(Date.parse(row.observedAt)) || typeof row.source !== 'string' || row.source.length > 180) throw Error('INVALID_RESULT');
      copy.metrics[key] = { ...row, label: summary(key, row) };
      if (copy.metrics[key].label.startsWith('확인 불가')) copy.metrics[key].status = 'unknown';
    }
    return copy;
  }
  function comparison(key, item, previous) {
    if (!previous || item.status !== 'ok' || previous.status !== 'ok' || item.source !== previous.source) return '';
    const value = v => key === 'cpu' ? v : key === 'memory' ? v.usedBytes / v.totalBytes * 100 : v.freeBytes / 1073741824;
    if (!['cpu', 'memory', 'disk'].includes(key)) return '';
    const delta = value(item.value) - value(previous.value);
    return '직전 조회 대비 ' + (delta > 0 ? '+' : '') + delta.toFixed(1) + (key === 'disk' ? ' GiB' : '%p');
  }
  function draw() {
    for (const [key, detail] of evidenceNodes) {
      if (detail.open) expandedEvidence.add(key); else expandedEvidence.delete(key);
    }
    evidenceNodes.clear();
    current.replaceChildren(); history.replaceChildren();
    if (!rows.length) { current.append(make('p', '저장된 PC 조회가 없습니다. 다시 조회를 눌러 첫 기록을 만드세요.')); return; }
    const latest = rows[0];
    current.append(make('h3', '최근 조회 요약'));
    const knownCount = keys.filter(key => latest.metrics[key].status === 'ok').length;
    const overview = make('p', '읽은 항목 ' + knownCount + '/' + keys.length + ' · 확인 불가 ' + (keys.length - knownCount) + '개 · 보관 기록 ' + rows.length + '/30회');
    overview.className = 'item-title';
    current.append(overview, make('p', '마지막 측정 · ' + time(latest.at)));
    if (!knownCount) current.append(make('p', '읽은 항목이 없습니다. 아래 항목별 이유를 확인하고 다시 조회하세요.'));
    else if (knownCount < keys.length) current.append(make('p', '일부 항목만 읽었습니다. 확인 불가 항목을 정상으로 해석하지 마세요.'));
    current.append(make('p', (official ? '공식 PC 조회 · OS 정보는 응답에 포함되지 않습니다.' : '서버 OS: ' + latest.platform) + ' · 실측 조회 기록이며 현재 실시간 상태가 아닙니다.'));
    const cards = make('div'); cards.className = official ? 'grid-2' : 'pc-grid';
    for (const key of keys) {
      const row = latest.metrics[key], card = make('article'); card.className = official ? 'pc-metric card' : 'pc-metric'; card.setAttribute('data-state', row.status);
      card.setAttribute('data-metric', key);
      const value = make(official ? 'strong' : 'p', row.label); value.className = official ? 'pc-value item-title' : 'pc-value';
      card.append(make('h4', names[key]), value);
      const change = comparison(key, row, rows[1]?.platform === latest.platform ? rows[1].metrics[key] : undefined);
      if (change) { const delta = make('p', change); delta.className = official ? 'pc-change muted' : 'pc-change'; card.append(delta); }
      const detail = make('details'), heading = make('summary', '출처와 측정 시각');
      detail.open = expandedEvidence.has(key); evidenceNodes.set(key, detail);
      detail.append(heading, make('p', row.source), make('p', time(row.observedAt))); card.append(detail); cards.append(card);
    }
    current.append(cards);
    for (const snapshot of rows) {
      const selected = keys.filter(key => filter.value === 'resources' ? ['cpu', 'memory', 'disk'].includes(key) : filter.value === 'security' ? !['cpu', 'memory', 'disk'].includes(key) : filter.value === 'unknown' ? snapshot.metrics[key].status === 'unknown' : true);
      if (!selected.length) continue;
      const item = make('li'), detail = make('details'); if (official) item.className = 'event'; detail.append(make('summary', time(snapshot.at) + ' · ' + selected.length + '개 항목'));
      for (const key of selected) detail.append(make('p', names[key] + ': ' + snapshot.metrics[key].label));
      item.append(detail); history.append(item);
    }
    if (!history.childElementCount) history.append(make('li', '필터 조건에 맞는 기록이 없습니다.'));
  }
  function stop() { generation++; controller?.abort(); controller = undefined; clearTimeout(timer); timer = undefined; read.disabled = false; cancel.disabled = true; root.setAttribute('aria-busy', 'false'); }
  cancel.addEventListener('click', () => { stop(); status.textContent = '조회 취소. 이전 기록은 과거 조회로 남아 있습니다. 서버의 읽기 작업은 제한 시간 안에 종료됩니다.'; });
  clear.addEventListener('click', () => { stop(); rows = []; draw(); status.textContent = '메모리의 PC 조회 기록을 지웠습니다.'; });
  filter.addEventListener('change', draw);
  read.addEventListener('click', async () => {
    if (read.disabled) return;
    stop(); const currentGeneration = generation; controller = new AbortController(); let timedOut = false;
    timer = setTimeout(() => { timedOut = true; controller?.abort(); }, timeoutMs);
    read.disabled = true; cancel.disabled = false; root.setAttribute('aria-busy', 'true'); status.textContent = 'PC 상태를 읽는 중입니다. 이전 값은 과거 조회입니다.';
    try {
      let json;
      if (official) {
        // The provided API owns the request timeout; local cancellation discards its late result.
        const signal = controller.signal;
        const aborted = new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('CANCELLED')), { once: true }));
        json = await Promise.race([api.get('/api/pc/status'), aborted]);
        if (json?.ok !== true) throw Error(json?.error?.code === 'NOT_ALLOWED' ? 'UNSUPPORTED' : 'REQUEST_FAILED');
      } else {
        const response = await request('/api/student/pc-observation', { method: 'POST', headers: { 'X-Student-PC': 'read' }, signal: controller.signal, cache: 'no-store' });
        if (currentGeneration !== generation) return;
        if (response.status === 404) throw Error('UNSUPPORTED');
        if (response.status === 429) throw Error('BUSY');
        if (!response.ok) throw Error('REQUEST_FAILED');
        json = await response.json();
      }
      if (currentGeneration !== generation) return;
      if (json.ok !== true) throw Error('INVALID_RESULT');
      const snapshot = validate(json.data);
      if (rows[0] && Date.parse(snapshot.at) < Date.parse(rows[0].at)) throw Error('OLD_RESULT');
      rows.unshift(snapshot); rows = rows.slice(0, 30); draw();
      const failed = keys.filter(key => snapshot.metrics[key].status !== 'ok').length;
      status.textContent = failed ? '조회 완료 · ' + failed + '개 항목 확인 불가. 각 항목의 이유를 확인해 주세요.' : '조회 완료 · ' + keys.length + '개 항목을 읽었습니다. 보안 안전 판정이 아닙니다.';
    } catch (error) {
      if (currentGeneration !== generation) return;
      status.textContent = timedOut ? '조회 시간이 초과됐습니다. 잠시 후 다시 조회하세요. 이전 기록은 과거 조회입니다.'
        : ({ UNSUPPORTED: '현재 실행 경로는 이 PC 조회를 지원하지 않습니다. 시작 틀 0.2.19와 실행 경로를 확인하세요. 설치형 host의 실제 동작은 별도 검증이 필요합니다.', BUSY: '서버에서 이전 조회가 진행 중입니다. 잠시 후 다시 조회하세요.', INVALID_RESULT: '조회 결과 형식을 확인하지 못했습니다. 실행 버전을 확인한 뒤 다시 조회하세요.', OLD_RESULT: '이전 조회보다 오래된 결과를 받았습니다. PC 시각을 확인한 뒤 다시 조회하세요.' }[error.message] ?? 'PC 조회에 실패했습니다. 앱 서버 실행 상태를 확인한 뒤 다시 조회하세요. 이전 기록은 과거 조회입니다.');
    } finally {
      if (currentGeneration === generation) { clearTimeout(timer); timer = undefined; controller = undefined; read.disabled = false; cancel.disabled = true; root.setAttribute('aria-busy', 'false'); }
    }
  });
  draw(); return root;
}

// Exact 0.2.19 contract: no invented OS, per-log split, link state, or system-drive scope.
export function normalizeOfficialPc(data) {
  if (data?.schema !== 'aleph.on.pc-status.v1' || data.source !== 'local-pc' || !Number.isFinite(Date.parse(data.measuredAt)) || !data.metrics) throw Error('INVALID_RESULT');
  const sources = { cpu: '공식 node:os.cpus · 200ms 차분', memory: '공식 node:os.totalmem − freemem', disk: '공식 node:fs.statfs · 앱 위치 볼륨의 사용 가능 공간', network: '공식 node:os.networkInterfaces · 비내부 인터페이스/IPv4 구성 수', firewall: '공식 Get-NetFirewallProfile · Domain/Private/Public', events: '공식 Get-WinEvent · System/Application 합산 · 최대 5,000건' };
  const metrics = {};
  for (const [key, source] of Object.entries(sources)) {
    const m = data.metrics[key];
    let value;
    if (key === 'cpu' && m?.sampleMs === 200) value = m.usagePercent;
    if (key === 'memory') value = { usedBytes: m?.usedBytes, totalBytes: m?.totalBytes };
    if (key === 'disk') value = { freeBytes: m?.freeBytes, totalBytes: m?.totalBytes };
    if (key === 'network') value = { interfaceCount: m?.interfaceCount, ipv4Count: m?.ipv4Count };
    if (key === 'firewall' && Array.isArray(m?.profiles) && m.profiles.length === 3 && ['Domain','Private','Public'].every(name => m.profiles.some(p => p.name === name && typeof p.enabled === 'boolean'))) value = Object.fromEntries(m.profiles.map(p => [p.name.toLowerCase(), p.enabled]));
    if (key === 'events') value = { warningCount: m?.warningCount, errorCount: m?.errorCount, sampleLimit: m?.sampleLimit, truncated: m?.truncated, since: m?.since };
    metrics[key] = { status: m?.state === 'ok' ? 'ok' : 'unknown', source, observedAt: data.measuredAt, value, code: m?.reason === 'unsupported' ? 'WINDOWS_ONLY' : 'READ_FAILED' };
  }
  return { schema: 'choi.pc-observation.v1', mode: 'measured', checkedAt: data.measuredAt, platform: 'official-contract', metrics };
}


// No service API is exposed by the official 0.2.19 student contract.
export function createGithubReadinessView() {
  const make = (tag, text) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  const section = make('section'); section.className = 'card';
  section.setAttribute('aria-label', 'GitHub 서비스 연결 준비');
  const state = make('p', '연결 전 · 확인 불가'); state.className = 'state state-empty';
  section.append(make('h2', 'GitHub 서비스'), state,
    make('p', '공식 앱의 GitHub 조회 경로가 아직 제공되지 않아 서비스 정보를 읽지 않았습니다.'),
    make('p', '저장소 변경·이슈·자동 검사: 확인 불가'),
    make('p', '사용량·월 비용: 확인 불가'),
    make('p', '계정 보안·취약점: 확인 불가'),
    make('p', '다음 단계: 담당자의 공식 서비스 연결 방법과 지원 권한을 확인합니다.'));
  const evidence = make('details');
  evidence.append(make('summary', '조회 범위와 제한'),
    make('p', '출처: 시작 틀 0.2.19 학생 API 허용 목록. GitHub 조회 시각: 미조회.'),
    make('p', '이 카드는 외부 요청이나 인증정보 입력·저장을 하지 않습니다. PC 실측 및 SDP 연결 상태와는 별개입니다.'));
  section.append(evidence); return section;
}

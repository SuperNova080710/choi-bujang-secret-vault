import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudentView } from '../on-client/student/extension.mjs';

// Minimal DOM fixture: HTML interpretation and network access are deliberately absent.
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.text = ''; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(x => x.textContent).join('\n'); }
  get childElementCount() { return this.children.length; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; this.text = ''; }
}
globalThis.document = { createElement: tag => new Element(tag) };
globalThis.fetch = () => { throw new Error('Network must not be called'); };
const view = createStudentView();
const event = (id = 'event-a') => ({ id, evidence: [{ id: id + '-e1', text: '관측 근거 ' + id }], rules: [{ id: id + '-r1', text: '정책 규칙 ' + id }], state: { access: 'unknown', session: 'unknown', device: 'unknown' }, supportedActions: [] });
const explanation = (e) => ({ status: 'ok', data: { summary: '참고 요약 ' + e.id, evidenceIds: e.evidence.map(x => x.id), proposals: [], requiresHumanConfirmation: true, executed: false } });
const render = (e, x = explanation(e)) => view.renderExplanation({ event: e, explanation: x });
const rejected = (root) => { assert.equal(root.attrs['data-student-explanation-event'], undefined); assert.doesNotMatch(root.textContent, /참고 요약/); };

test('two events bind their own evidence, rules and success marker', () => {
  for (const id of ['event-a', 'event-b']) {
    const e = event(id), root = render(e);
    assert.equal(root.attrs['data-student-explanation-event'], id);
    assert.match(root.textContent, new RegExp(id + '-e1 — 관측 근거 ' + id));
    assert.match(root.textContent, new RegExp(id + '-r1 — 정책 규칙 ' + id));
    assert.match(root.textContent, /지원하는 조치가 없어 제안이 없습니다/);
  }
});
test('unknown access, session and device remain unknown individually', () => {
  const root = render(event());
  for (const name of ['접속', '세션', '기기']) assert.ok(root.textContent.includes(name + ': 확인 불가(unknown)'));
  const e = event(); e.state = { access: 'allowed', session: 'active', device: 'compliant' };
  assert.match(render(e).textContent, /확인 불가 상태\n없음/);
});
test('null event errors take priority and preserve safe reason/code', () => {
  const root = render(null, { status: 'error', error: { code: 'ON_AI_INVALID_INPUT', message: '근거가 부족합니다.' } });
  rejected(root); assert.match(root.textContent, /ON_AI_INVALID_INPUT/); assert.match(root.textContent, /근거가 부족합니다/);
  assert.doesNotMatch(root.textContent, /먼저 고르세요/);
  assert.match(render(null, { status: 'idle' }).textContent, /먼저 고르세요/);
});
test('wrong, missing, duplicate and insufficient evidence are rejected', () => {
  const e = event();
  for (const refs of [['other-event-e1'], [], [e.evidence[0].id, e.evidence[0].id]]) {
    const x = explanation(e); x.data.evidenceIds = refs; rejected(render(e, x));
  }
  rejected(render(event('event-b'), explanation(e)));
  const x = explanation(e); e.evidence = []; rejected(render(e, x));
});
test('executed and unconfirmed explanations cannot be shown', () => {
  for (const field of ['executed', 'requiresHumanConfirmation']) {
    const e = event(), x = explanation(e); x.data[field] = field === 'executed'; rejected(render(e, x));
  }
});
test('supported proposals show reason and unexecuted confirmation without buttons', () => {
  const e = event(); e.supportedActions = ['revoke_session'];
  const x = explanation(e); x.data.proposals = [{ action: 'revoke_session', evidenceIds: x.data.evidenceIds, reason: '세션 근거를 확인해야 합니다.' }];
  const root = render(e, x);
  assert.match(root.textContent, /revoke_session — 세션 근거를 확인해야 합니다/);
  assert.match(root.textContent, /사람 확인이 필요하며 실행되지 않았습니다/);
  const walk = n => [n, ...n.children.flatMap(walk)];
  assert.equal(walk(root).some(n => n.tag === 'button'), false);
  x.data.proposals[0].evidenceIds = ['missing']; rejected(render(e, x));
  x.data.proposals[0].evidenceIds = x.data.evidenceIds; e.supportedActions = []; rejected(render(e, x));
});
test('refresh, loading, idle and failures replace successful content', () => {
  const slot = new Element('div'), e = event();
  for (const x of [{ status: 'loading' }, { status: 'idle' }, { status: 'error', error: { message: '시간 초과', code: 'TIMEOUT' } }]) {
    slot.replaceChildren(render(e)); slot.replaceChildren(render(e, x)); rejected(slot.children[0]);
  }
  slot.replaceChildren(render(null, { status: 'idle' })); rejected(slot.children[0]);
});
test('error secrets are suppressed and summary HTML is literal text', () => {
  const root = render(null, { status: 'error', error: { code: '<unsafe>', message: 'password=fixture-only' } });
  assert.doesNotMatch(root.textContent, /fixture-only|<unsafe>/);
  const e = event(), x = explanation(e); x.data.summary = '<img src=x onerror=alert(1)>';
  assert.match(render(e, x).textContent, /<img src=x/);
});
test('AI failure leaves existing decision DOM and inputs intact', () => {
  const e = event(), before = JSON.stringify(e);
  const decision = view.renderDecision({ status: 'ok', data: { decision: 'deny', reason: '정책상 거부' } });
  const text = decision.textContent;
  render(e, { status: 'error', error: { code: 'TIMEOUT', message: '시간 초과' } });
  assert.equal(decision.textContent, text); assert.equal(JSON.stringify(e), before);
});

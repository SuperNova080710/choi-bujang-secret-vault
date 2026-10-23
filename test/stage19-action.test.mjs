import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createStudentView } from '../on-client/student/extension.mjs';

// In-memory DOM and deferred responses only; no AI or security action is sent.
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.text = ''; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(x => x.textContent).join(''); }
  get childElementCount() { return this.children.length; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; this.text = ''; }
}
globalThis.document = { createElement: tag => new Element(tag) };
globalThis.fetch = () => { throw new Error('Network is prohibited in this test'); };
const view = createStudentView();
const render = input => view.renderAction(input);
const walk = node => [node, ...node.children.flatMap(walk)];
const requestId = '10000000-0000-4000-8000-000000000001';
const receiptId = '20000000-0000-4000-8000-000000000001';
const fixture = (status = 'prepared') => ({
  status, event: { id: 'event-a', evidence: [{ id: 'evidence-a' }], supportedActions: ['revoke_session'] },
  actionId: 'revoke_session', target: { id: 'subject:fixture-a', generation: 7 },
  receipt: { requestId, receiptId, eventId: 'event-a', actionId: 'revoke_session', status, version: 3, replayed: false },
  observation: { observedAt: '2026-10-23T04:00:00Z', effectApplied: true },
  confirmationExpiresAt: '2099-01-01T00:00:00Z', message: '시험 응답 안내',
});

test('all eleven action statuses have distinct Korean labels and raw values', () => {
  const expected = { idle: '아직 미실행', loading: '조치 준비 또는 결과 조회 중', prepared: '준비됨·미실행',
    executing: '서버에 전달 중', pending: '서버 접수·처리 중', succeeded: '효과 확인',
    denied: '연동 시스템 거절', failed: '연동 시스템 처리 실패', unknown: '결과 불명',
    expired: '확인 기한 지남', error: '요청 처리 안 됨' };
  // The official list contains eleven named statuses, including loading.
  for (const [status, label] of Object.entries(expected)) {
    const root = render(fixture(status));
    assert.equal(root.children[0].textContent, `${label}(${status})`);
    if (status !== 'succeeded') assert.doesNotMatch(root.children[0].textContent, /효과 확인/);
  }
});
test('prepared binds current evidence, action, target, receipt and confirmation deadline', () => {
  const input = fixture(), root = render(input);
  for (const value of ['event-a', 'evidence-a', 'revoke_session', 'subject:fixture-a', requestId, receiptId, '2099-01-01T00:00:00Z']) assert.ok(root.textContent.includes(value));
  assert.match(root.textContent, /대상 세대\(target.generation\): 7/);
  assert.match(root.textContent, /결과 버전\(version\): 3/);
  assert.equal(root.attributes['data-student-action-event'], 'event-a');
  assert.equal(root.attributes['data-student-action-request'], requestId);
  assert.match(root.textContent, /아직 실행되지 않았습니다/);
  assert.match(root.textContent, /대상과 조치를 확인했으며 집행합니다/);
  assert.equal(walk(root).some(n => ['button', 'input', 'form'].includes(n.tag)), false);
});
test('executing and ACK stay unconfirmed even if an observation is present', () => {
  for (const status of ['executing', 'pending']) {
    const root = render(fixture(status));
    assert.doesNotMatch(root.textContent, /효과 확인\(succeeded\)|effectApplied: true/);
    assert.match(root.textContent, /아직 확인되지 않았습니다/);
  }
  assert.match(render(fixture('pending')).textContent, /접수 응답\(ACK\)/);
});
test('succeeded requires strict true and identifiable observation; missing proof is unknown', () => {
  const valid = render(fixture('succeeded'));
  assert.match(valid.textContent, /효과 확인\(succeeded\)/);
  assert.match(valid.textContent, /effectApplied: true/);
  assert.match(valid.textContent, /2026-10-23T04:00:00Z/);
  for (const value of [false, null, undefined, 'true', 1]) {
    const input = fixture('succeeded'); input.observation.effectApplied = value;
    const root = render(input);
    assert.match(root.children[0].textContent, /결과 불명\(unknown\)/);
    assert.doesNotMatch(root.textContent, /효과 확인\(succeeded\)/);
  }
  for (const alter of [x => { x.observation = null; }, x => { x.observation.observedAt = 'invalid'; }, x => { delete x.receipt.receiptId; }]) {
    const input = fixture('succeeded'); alter(input);
    assert.match(render(input).children[0].textContent, /결과 불명/);
  }
});
test('unknown requests result-only lookup; replayed receipt never implies a new execution', () => {
  const input = fixture('unknown'); input.receipt.replayed = true;
  const root = render(input);
  assert.match(root.textContent, /성공이나 효과 없음으로 판단하지 마세요/);
  assert.match(root.textContent, /원천 결과만 재조회/);
  assert.match(root.textContent, /replayed: true/);
  assert.match(root.textContent, /새 조치 실행을 뜻하지 않습니다/);
  assert.match(root.textContent, /이미 서버에 전달된 조치 효과를 되돌리지 않습니다/);
});
test('mismatched receipt cannot claim effect or carry old request markers', () => {
  for (const key of ['eventId', 'actionId']) {
    const input = fixture('succeeded'); input.receipt[key] = 'old-value';
    const root = render(input);
    assert.match(root.children[0].textContent, /결과 불명/);
    assert.equal(root.attributes['data-student-action-event'], undefined);
    assert.equal(root.attributes['data-student-action-request'], undefined);
    assert.doesNotMatch(root.textContent, /효과 확인\(succeeded\)|old-value/);
  }
});
test('new input and empty idle render do not retain old target, request or observation', () => {
  const slot = new Element('div'), first = fixture('succeeded');
  slot.replaceChildren(render(first));
  const next = { status: 'loading', event: { id: 'event-b', evidence: [{ id: 'evidence-b' }], supportedActions: [] } };
  slot.replaceChildren(render(next));
  assert.doesNotMatch(slot.textContent, /event-a|evidence-a|subject:fixture-a|2026-10-23/);
  assert.equal(slot.children[0].attributes['data-student-action-request'], undefined);
  assert.match(slot.textContent, /버튼이 나오지 않는 것이 정상/);
  slot.replaceChildren(render());
  assert.doesNotMatch(slot.textContent, /event-b|evidence-b/);
  assert.deepEqual(slot.children[0].attributes, { 'aria-label': '현재 사건의 보안 조치 상태' });
});
test('safe error details, denial reason and expiry guidance are shown without secrets or markup', () => {
  const root = render({ status: 'error', error: { code: 'ACTION_UNSUPPORTED', message: '연동 미지원' } });
  assert.match(root.textContent, /ACTION_UNSUPPORTED/); assert.match(root.textContent, /연동 미지원/);
  assert.match(render(fixture('denied')).textContent, /시험 응답 안내/);
  assert.match(render(fixture('failed')).textContent, /시험 응답 안내/);
  assert.match(render(fixture('expired')).textContent, /다시 준비/);
  const secret = 'ac-on-' + 'x'.repeat(43);
  const hidden = render({ status: 'error', confirmationId: secret, error: { code: '<unsafe>', message: secret } });
  assert.doesNotMatch(hidden.textContent, /ac-on-|<unsafe>/);
  const html = render({ status: 'failed', message: '<img src=x onerror=alert(1)>' });
  assert.match(html.textContent, /<img src=x/); assert.equal(walk(html).some(n => n.tag === 'img'), false);
});
test('render does not mutate its input or non-action views', () => {
  const input = fixture(), before = JSON.stringify(input);
  const decision = view.renderDecision({ status: 'ok', data: { decision: 'deny', reason: '기존 판정' } });
  const previous = decision.textContent;
  render(input); render({ status: 'error' });
  assert.equal(JSON.stringify(input), before); assert.equal(decision.textContent, previous);
});

// Execute the provided app's unchanged validators and action lifecycle with mock
// transport. This tests guards/duplicate prevention, not a live server execution.
const app = readFileSync(new URL('../on-client/public/app.js', import.meta.url), 'utf8');
const declarations = app.slice(app.indexOf('const STATE_LABELS'), app.indexOf('const KIND_LABELS'))
  + app.slice(app.indexOf('const ID_PATTERN'), app.indexOf('const VALIDATORS'))
  + app.slice(app.indexOf('const ACTION_MESSAGES'), app.indexOf('// ---------- 학생 구현 연결'));
function harness() {
  const calls = [], nodes = new Map(), snapshots = [];
  const state = { selectedExplanation: { event: fixture().event, resource: { status: 'ok', data: { proposals: [{ action: 'revoke_session' }] } } } };
  const context = vm.createContext({
    actionGeneration: 0, generation: 0, actionController: null, actionTicket: null,
    actionIntent: null, actionExpiryTimer: null, actionState: { status: 'idle' }, state,
    AbortController, structuredClone, setTimeout: () => 1, clearTimeout() {},
    $: id => { if (!nodes.has(id)) nodes.set(id, new Element('div')); return nodes.get(id); },
    el: (tag, attrs) => { const n = new Element(tag); n.textContent = attrs?.text ?? ''; return n; },
    setChildren: (node, ...children) => node.replaceChildren(...children.filter(Boolean)),
    renderStudent: () => {
      const input = structuredClone(context.actionState); snapshots.push(input);
      context.$('student-action').replaceChildren(render(input));
    },
    aiRequest: (path, options) => new Promise(resolve => calls.push({ path, options, resolve })),
  });
  vm.runInContext(declarations, context);
  const prepare = async () => {
    const pending = context.prepareAction(state.selectedExplanation.event, 'revoke_session');
    const data = fixture().receipt;
    calls.at(-1).resolve({ ok: true, data: { ...data, confirmationId: 'ac-on-' + 'x'.repeat(43),
      confirmationExpiresAt: '2099-01-01T00:00:00Z', target: fixture().target } });
    await pending;
  };
  return { context, state, calls, nodes, snapshots, prepare };
}
test('provided app requires human confirmation, dispatches once, then only queries result', async () => {
  const h = harness(); await h.prepare();
  assert.equal(h.calls.length, 1); assert.equal(h.context.actionState.status, 'prepared');
  assert.equal(JSON.stringify(h.snapshots).includes('ac-on-'), false);
  const first = h.context.executeAction();
  await h.context.executeAction();
  assert.equal(h.calls.filter(c => c.path.endsWith('/execute')).length, 1);
  assert.equal(h.context.actionState.status, 'executing');
  h.calls.at(-1).resolve({ ok: true, data: { ...fixture('pending').receipt } }); await first;
  assert.equal(h.context.actionState.status, 'pending');
  assert.doesNotMatch(h.nodes.get('student-action').textContent, /효과 확인\(succeeded\)/);
  const lookup = h.context.actionOperation('result', { requestId });
  h.calls.at(-1).resolve({ ok: true, data: { ...fixture('succeeded').receipt, observation: fixture().observation } });
  await lookup;
  assert.match(h.nodes.get('student-action').textContent, /효과 확인\(succeeded\)/);
  assert.equal(h.calls.filter(c => c.path.endsWith('/execute')).length, 1);
});
test('unsupported proposal cannot prepare or dispatch', async () => {
  const h = harness(); h.state.selectedExplanation.event.supportedActions = [];
  await h.context.prepareAction(h.state.selectedExplanation.event, 'revoke_session');
  await h.context.executeAction(); assert.equal(h.calls.length, 0);
});
test('refresh or cancellation clears old markers and discards delayed action response', async () => {
  for (const refresh of [false, true]) {
    const h = harness(); await h.prepare(); const pending = h.context.executeAction();
    if (refresh) h.context.generation++;
    h.context.clearAction({ cancelled: !refresh });
    h.calls.at(-1).resolve({ ok: true, data: fixture('pending').receipt }); await pending;
    assert.equal(h.context.actionState.status, 'idle');
    assert.doesNotMatch(h.nodes.get('student-action').textContent, /subject:fixture-a|event-a/);
    assert.equal(h.nodes.get('student-action').children[0].attributes['data-student-action-request'], undefined);
  }
});
test('timeout after dispatch becomes unknown without retry or an effect claim', async () => {
  const h = harness(); await h.prepare(); const pending = h.context.executeAction();
  h.calls.at(-1).resolve({ ok: false, error: { code: 'ACTION_TIMEOUT' } }); await pending;
  assert.equal(h.context.actionState.status, 'unknown');
  assert.match(h.nodes.get('student-action').textContent, /원천 결과만 재조회/);
  assert.equal(h.calls.length, 2);
});

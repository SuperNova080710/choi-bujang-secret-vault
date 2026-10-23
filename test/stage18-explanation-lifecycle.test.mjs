import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Run the unchanged provided application's request/cancel functions with deferred
// mock responses. No server, authentication, paid AI or action endpoint is used.
const source = readFileSync(new URL('../on-client/public/app.js', import.meta.url), 'utf8');
const requestSource = source.slice(source.indexOf('async function requestExplain('), source.indexOf('\nfunction renderExplanation(x,'));
function harness() {
  const requests = [], rendered = [];
  const state = { selectedExplanation: { event: null, resource: { status: 'idle' } } };
  const slots = new Map([['a', {}], ['b', {}]]);
  const cancelButton = { disabled: true };
  const context = vm.createContext({
    generation: 0, explanationGeneration: 0, explainSlots: slots,
    explainControllers: new Map(), state, AbortController, structuredClone,
    clearAction() {}, safeEventForAi: () => true,
    renderStudent: () => rendered.push(structuredClone(state.selectedExplanation)),
    $: () => cancelButton, setChildren: (slot, ...children) => { slot.children = children; },
    stateBox: (status, text) => ({ status, text }),
    document: { body: { contains: () => true } },
    aiRequest: (_path, options) => new Promise(resolve => requests.push({ resolve, options })),
    safeAiFailure: result => ({ status: 'error', error: result.error }),
    validExplanation: data => data.explanation,
    safeAiTime: () => true,
    renderExplanation: (data, event) => ({ data, event }),
    el: () => ({}), AI_MESSAGES: { CANCELLED: '취소됨' },
  });
  vm.runInContext(requestSource, context);
  const respond = (index, summary) => requests[index].resolve({ ok: true, data: { explanation: { summary } }, meta: { checkedAt: '2026-10-23T00:00:00Z' } });
  return { context, requests, state, slots, rendered, respond };
}
test('late event A response cannot replace event B explanation', async () => {
  const h = harness();
  const first = h.context.requestExplain({ id: 'a' }, {});
  const second = h.context.requestExplain({ id: 'b' }, {});
  assert.equal(h.requests[0].options.signal.aborted, true);
  h.respond(1, 'B summary'); await second;
  h.respond(0, 'A summary'); await first;
  assert.equal(h.state.selectedExplanation.event.id, 'b');
  assert.equal(h.state.selectedExplanation.resource.data.summary, 'B summary');
  assert.equal(h.slots.get('a').children.length, 0);
  assert.equal(h.rendered.some(x => x.resource.data?.summary === 'A summary'), false);
});
test('refresh reset clears selection and rejects an in-flight response', async () => {
  const h = harness();
  const pending = h.context.requestExplain({ id: 'a' }, {});
  h.context.generation++;
  h.context.cancelExplanation({ reset: true });
  h.respond(0, 'stale summary'); await pending;
  assert.equal(h.state.selectedExplanation.event, null);
  assert.equal(h.state.selectedExplanation.resource.status, 'idle');
  assert.equal(h.slots.get('a').children.length, 0);
  assert.equal(h.requests[0].options.signal.aborted, true);
});
test('AI error updates explanation only and leaves non-AI resources intact', async () => {
  const h = harness();
  h.state.events = { status: 'ok', data: [{ id: 'a' }] };
  h.state.decision = { status: 'ok', data: { decision: 'deny' } };
  const before = JSON.stringify([h.state.events, h.state.decision]);
  const pending = h.context.requestExplain({ id: 'a' }, {});
  h.requests[0].resolve({ ok: false, error: { code: 'TIMEOUT', message: '시간 초과' } });
  await pending;
  assert.equal(h.state.selectedExplanation.resource.status, 'error');
  assert.equal(JSON.stringify([h.state.events, h.state.decision]), before);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createStudentView } from '../on-client/student/extension.mjs';
import { normalizeScan } from '../on-client/public/vulnerabilities-view.mjs';

// All packages, findings and responses below are fixtures. No OSV network calls.
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.text = ''; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(x => x.textContent).join(''); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; this.text = ''; }
}
globalThis.document = { createElement: tag => new Element(tag) };
globalThis.fetch = () => { throw new Error('External requests prohibited'); };
const view = createStudentView();
const render = input => view.renderVulnerabilities(input);
const walk = node => [node, ...node.children.flatMap(walk)];
const rows = node => walk(node).filter(n => n.attributes['data-student-package-name']);
const at = '2026-10-23T05:00:00Z', modified = '2026-10-22T00:00:00Z';
const pkg = (status = 'known_vulnerabilities') => ({
  name: 'fixture-public', version: '1.2.3', status,
  vulnerabilities: status === 'none_found' ? [] : [{ id: 'OSV-FIXTURE-20', modified }],
  source: 'https://api.osv.dev/v1/querybatch', checkedAt: at,
});
const scan = (status = 'complete') => ({ status, lockfileVersion: 3, lockfileHash: 'a'.repeat(64),
  excluded: { count: 0 }, checkedAt: at, packages: [pkg(status === 'partial' ? 'unverifiable' : 'known_vulnerabilities')] });
const ok = data => ({ status: 'ok', data });

test('idle/loading/error suppress stale rows and distinguish request states', () => {
  const good = render(ok(scan()));
  assert.equal(rows(good).length, 1);
  for (const [status, label] of [['idle', '조회 전'], ['loading', '조회 중'], ['error', '조회 실패']]) {
    const root = render({ status, data: scan(), error: { code: 'TIMEOUT', message: '조회 시간이 초과됐습니다.' } });
    assert.match(root.textContent, new RegExp(label));
    assert.equal(rows(root).length, 0);
    assert.ok(!root.textContent.includes('OSV-FIXTURE-20'));
    if (status === 'error') assert.match(root.textContent, /TIMEOUT.*다시 조회/s);
  }
});
test('all five scan states retain raw values and optional metadata is not fabricated', () => {
  for (const status of ['complete', 'partial', 'not_checked', 'not_configured', 'unverifiable']) {
    const data = status === 'complete' || status === 'partial' ? scan(status) : { status, checkedAt: at, packages: [] };
    const root = render(ok(data));
    assert.ok(root.textContent.includes(`(${status})`));
    assert.ok(root.textContent.includes(at));
    if (!('lockfileHash' in data)) assert.doesNotMatch(root.textContent, /lockfileHash|lockfileVersion/);
  }
  assert.match(render(ok({ status: 'not_configured', packages: [] })).textContent, /프로젝트 설정이 필요/);
  assert.match(render(ok({ status: 'not_checked', packages: [] })).textContent, /승인된 공개 조회 대상이 없어/);
});
test('exact version, source, timestamps, lock metadata and each finding stay bound to their row', () => {
  const data = scan();
  data.packages.push({ ...pkg('none_found'), name: 'fixture-second', version: '2.4.6-beta.1' });
  const root = render(ok(data)), result = rows(root);
  assert.equal(result.length, 2);
  assert.equal(result[0].attributes['data-student-package-version'], '1.2.3');
  assert.equal(result[1].attributes['data-student-package-version'], '2.4.6-beta.1');
  for (const text of ['OSV-FIXTURE-20', modified, at, 'https://api.osv.dev/v1/querybatch']) assert.ok(result[0].textContent.includes(text));
  assert.ok(!result[1].textContent.includes('OSV-FIXTURE-20'));
  assert.ok(root.textContent.includes(data.lockfileHash));
  assert.match(root.textContent, /lockfileVersion\): 3/);
});
test('partial failure retains received findings and does not claim none_found', () => {
  const data = scan('partial');
  data.packages.push({ ...pkg('unverifiable'), name: 'fixture-empty', vulnerabilities: [] });
  const root = render(ok(data));
  assert.match(root.textContent, /일부 조회 실패\(partial\)/);
  assert.match(rows(root)[0].textContent, /일부 확인·전체 조회 확인 불가\(unverifiable\)/);
  assert.match(rows(root)[0].textContent, /OSV-FIXTURE-20/);
  assert.doesNotMatch(rows(root)[1].textContent, /알려진 항목 없음|none_found/);
});
test('none_found is limited to checked scope and time, never an app safety verdict', () => {
  const data = scan(); data.packages = [pkg('none_found')];
  const root = render(ok(data));
  assert.match(root.textContent, /알려진 항목 없음\(none_found\).*조회 시점·조회 범위/s);
  assert.match(root.textContent, /안전성을 보장하지 않습니다/);
});
test('new scan replaces old version, finding and hash without mutating input', () => {
  const data = scan(), before = JSON.stringify(data), slot = new Element('div');
  slot.replaceChildren(render(ok(data)));
  const next = scan(); next.lockfileHash = 'b'.repeat(64); next.packages = [{ ...pkg('none_found'), version: '1.2.4' }];
  slot.replaceChildren(render(ok(next)));
  assert.ok(!slot.textContent.includes(data.lockfileHash));
  assert.ok(!slot.textContent.includes('OSV-FIXTURE-20'));
  assert.equal(rows(slot)[0].attributes['data-student-package-version'], '1.2.4');
  assert.equal(JSON.stringify(data), before);
});
test('text-only rendering has no controls or markup interpretation; missing data is not success', () => {
  const root = render({ status: 'error', error: { message: '<img src=x onerror=alert(1)>' } });
  assert.ok(root.textContent.includes('<img'));
  assert.equal(walk(root).some(n => ['img', 'button', 'form', 'script'].includes(n.tag)), false);
  assert.match(render(ok(null)).textContent, /조회 확인 불가/);
  assert.equal(rows(render(ok(null))).length, 0);
});
test('provided normalizer rejects a version range and preserves valid partial findings', () => {
  const data = scan(); data.packages[0].version = '^1.2.0';
  assert.equal(normalizeScan(data), null);
  const partial = normalizeScan(scan('partial'));
  assert.ok(partial);
  assert.equal(partial.packages[0].vulnerabilities[0].id, 'OSV-FIXTURE-20');
  assert.equal(rows(render(ok(partial)))[0].attributes['data-student-package-version'], '1.2.3');
});

// Execute unchanged main app request/cancel/clear functions, with its real
// normalizer and student renderer, replacing only transport and timer scheduling.
const source = readFileSync(new URL('../on-client/public/app.js', import.meta.url), 'utf8');
const lifecycle = source.slice(source.indexOf('function clearVulnerabilities()'), source.indexOf('\nfunction renderApps()'));
function harness() {
  const requests = [], timers = new Map(), state = { vulnerabilities: { status: 'idle' } }, slot = new Element('div');
  let timerId = 0;
  const context = vm.createContext({
    generation: 0, vulnerabilitiesGeneration: 0, vulnerabilitiesController: null,
    state, AbortController, normalizeScan, REQUEST_TIMEOUT_MS: 10000, UNKNOWN_META: {},
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    localFailure: (code, message) => ({ ok: false, error: { code, message } }),
    renderVulnerabilities() { slot.replaceChildren(render(state.vulnerabilities)); },
    request: (path, options) => new Promise(resolve => requests.push({ path, options, resolve })),
  });
  vm.runInContext(lifecycle, context);
  const respond = (index, data = scan()) => requests[index].resolve({ ok: true, data });
  return { context, requests, timers, state, slot, respond };
}
test('cancel prevents a late response from restoring rows', async () => {
  const h = harness(), pending = h.context.loadVulnerabilities();
  h.context.cancelVulnerabilities();
  assert.equal(h.requests[0].options.signal.aborted, true);
  h.respond(0); await pending;
  assert.equal(h.state.vulnerabilities.status, 'error');
  assert.equal(rows(h.slot).length, 0);
  assert.match(h.slot.textContent, /CANCELLED/);
});
test('manual request after failure reaches transport again and replaces error', async () => {
  const h = harness(), first = h.context.loadVulnerabilities();
  h.requests[0].resolve({ ok: false, error: { code: 'SERVICE_UNAVAILABLE' } }); await first;
  assert.equal(h.state.vulnerabilities.status, 'error');
  const retry = h.context.loadVulnerabilities();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].path, '/api/vulnerabilities');
  h.respond(1); await retry;
  assert.equal(rows(h.slot).length, 1);
  assert.equal(h.state.vulnerabilities.status, 'ok');
});
test('new request wins over an older response and refreshed scan uses a new hash', async () => {
  const h = harness(), first = h.context.loadVulnerabilities(), second = h.context.loadVulnerabilities();
  const newer = scan(); newer.lockfileHash = 'b'.repeat(64);
  h.respond(1, newer); await second; h.respond(0); await first;
  assert.ok(h.slot.textContent.includes(newer.lockfileHash));
  assert.ok(!h.slot.textContent.includes('a'.repeat(64)));
});
test('refresh clears rows and prevents an in-flight scan from returning', async () => {
  const h = harness(), pending = h.context.loadVulnerabilities();
  h.context.generation++; h.context.clearVulnerabilities();
  h.respond(0); await pending;
  assert.equal(h.state.vulnerabilities.status, 'idle');
  assert.equal(rows(h.slot).length, 0);
});
test('timeout clears the request and allows retry without automatic duplicate calls', async () => {
  const h = harness(), first = h.context.loadVulnerabilities();
  [...h.timers.values()][0](); await first;
  assert.equal(h.state.vulnerabilities.status, 'error');
  assert.equal(h.requests.length, 1);
  const retry = h.context.loadVulnerabilities();
  h.respond(1); await retry; h.respond(0); await Promise.resolve();
  assert.equal(h.state.vulnerabilities.status, 'ok');
  assert.equal(h.requests.length, 2);
  assert.equal(h.timers.size, 0);
});

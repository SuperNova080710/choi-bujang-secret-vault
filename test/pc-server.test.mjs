import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createPcServer } from '../on-client/student/start-pc.mjs';
async function fixture(t, collect) {
  const server = createPcServer({ demo: true, collect });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const port = server.address().port, origin = `http://127.0.0.1:${port}`;
  const request = (options = {}) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: options.path ?? '/api/student/pc-observation', method: options.method ?? 'POST',
      headers: { origin, 'x-student-pc': 'read', ...options.headers } }, res => {
      let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => resolve({ status: res.statusCode, body }));
    }); req.on('error', reject); req.end(options.body);
  });
  return { request, origin };
}
test('same-origin explicit read works and official demo routes remain available', async t => {
  let calls = 0; const { request } = await fixture(t, async () => { calls++; return { mode: 'measured' }; });
  assert.equal((await request()).status, 200); assert.equal(calls, 1);
  for (const path of ['/', '/api/me', '/api/apps', '/api/events', '/api/devices', '/api/sessions']) assert.equal((await request({ path, method: 'GET' })).status, 200);
});
test('reject cross-origin, rebinding, query, body and GET without collecting', async t => {
  let calls = 0; const { request } = await fixture(t, async () => { calls++; });
  for (const options of [
    { headers: { origin: 'https://other.invalid' } }, { headers: { host: 'other.invalid' } },
    { headers: { 'sec-fetch-site': 'cross-site' } }, { headers: { 'x-student-pc': '' } },
    { path: '/api/student/pc-observation?command=anything' }, { method: 'GET' },
    { body: 'x', headers: { 'content-length': '1' } },
  ]) assert.ok([400, 403].includes((await request(options)).status));
  assert.equal(calls, 0);
});
test('concurrent clicks cannot spawn concurrent collectors', async t => {
  let release; const { request } = await fixture(t, () => new Promise(resolve => { release = resolve; }));
  const first = request();
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await request()).status, 429); release({}); assert.equal((await first).status, 200);
});
test('failure returns a safe code and unlocks the next manual retry', async t => {
  let calls = 0; const { request } = await fixture(t, async () => { if (!calls++) throw Error('PRIVATE'); return {}; });
  const fail = await request(); assert.equal(fail.status, 503); assert.doesNotMatch(fail.body, /PRIVATE/);
  assert.equal((await request()).status, 200);
});

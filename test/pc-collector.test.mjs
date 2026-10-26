import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectPc, cpuPercent, keys, validValue } from '../on-client/student/pc/collect.mjs';
const time = '2026-10-26T03:00:00.000Z';
const cpu = (idle, user) => [{ times: { idle, user, sys: 0, nice: 0, irq: 0 } }];
const system = () => { let reads = 0; return { cpus: () => reads++ ? cpu(160, 40) : cpu(100, 0), totalmem: () => 1000, freemem: () => 250 }; };
const base = () => ({ system: system(), sleep: async () => {}, clock: () => time });
test('CPU is delta of logical CPU times; unavailable counters never become zero', () => {
  assert.equal(cpuPercent(cpu(100, 0), cpu(160, 40)), 40);
  for (const pair of [[[], []], [cpu(1, 1), cpu(1, 1)], [cpu(10, 0), cpu(9, 0)]]) assert.throws(() => cpuPercent(...pair));
});
test('Linux measures only supported metrics and never calls Windows', async () => {
  const data = await collectPc({ ...base(), platform: 'linux', windows: () => { throw Error('must not run'); } });
  assert.equal(data.metrics.cpu.value, 40); assert.equal(data.metrics.memory.value.usedBytes, 750);
  for (const k of keys.slice(2)) { assert.equal(data.metrics[k].code, 'WINDOWS_ONLY'); assert.equal(data.metrics[k].value, undefined); }
});
test('Windows partial failure remains per-item unknown; unknown/private output fields are dropped', async () => {
  const result = await collectPc({ ...base(), platform: 'win32', windows: async () => ({
    disk: { status: 'ok', observedAt: time, value: { totalBytes: 100, freeBytes: 20, hostname: 'PRIVATE' } },
    firewall: { status: 'unknown', message: 'private-path' },
    network: { status: 'ok', observedAt: time, value: { total: 2, up: 1 } },
  }) });
  assert.equal(result.metrics.disk.value.freeBytes, 20);
  assert.equal(result.metrics.firewall.status, 'unknown');
  assert.equal(result.metrics.systemEvents.status, 'unknown');
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|private-path/);
});
test('invalid values, timestamps and event bounds cannot become successful observations', async () => {
  assert.equal(validValue('memory', { totalBytes: 2, usedBytes: 3 }), false);
  assert.equal(validValue('firewall', { domain: true, private: true, public: 'true' }), false);
  assert.equal(validValue('systemEvents', { warnings: 10001, errors: 0, capped: true, windowStart: '2026-10-25', windowEnd: '2026-10-26' }), false);
  const result = await collectPc({ ...base(), platform: 'win32', windows: async () => ({ disk: { status: 'ok', observedAt: '2000-01-01', value: { totalBytes: 100, freeBytes: 20 } } }) });
  assert.equal(result.metrics.disk.status, 'unknown');
});
test('collector timeout/error is sanitized, CPU and memory still survive', async () => {
  const result = await collectPc({ ...base(), platform: 'win32', windows: async () => { throw Error('secret stderr'); } });
  assert.equal(result.metrics.cpu.status, 'ok');
  for (const k of keys.slice(2)) assert.equal(result.metrics[k].code, 'COLLECTOR_FAILED');
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});

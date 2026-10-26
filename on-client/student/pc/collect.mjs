import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const execute = promisify(execFile);
export const sources = Object.freeze({
  cpu: 'node:os.cpus / logical CPU time delta (500 ms)',
  memory: 'node:os.totalmem / freemem (total minus free)',
  disk: 'Win32_LogicalDisk / system volume',
  network: 'Get-NetAdapter / adapter link state',
  firewall: 'Get-NetFirewallProfile / configured profiles',
  systemEvents: 'Get-WinEvent / System / level 2,3 / last 24h',
  applicationEvents: 'Get-WinEvent / Application / level 2,3 / last 24h',
});
export const keys = Object.keys(sources);
const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const count = n => Number.isSafeInteger(n) && n >= 0;
export function validValue(key, v) {
  if (key === 'cpu') return finite(v) && v <= 100;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if (key === 'memory') return finite(v.totalBytes) && v.totalBytes > 0 && finite(v.usedBytes) && v.usedBytes <= v.totalBytes;
  if (key === 'disk') return finite(v.totalBytes) && v.totalBytes > 0 && finite(v.freeBytes) && v.freeBytes <= v.totalBytes;
  if (key === 'network') return count(v.total) && count(v.up) && v.up <= v.total;
  if (key === 'firewall') return ['domain', 'private', 'public'].every(k => typeof v[k] === 'boolean');
  return count(v.warnings) && count(v.errors) && v.warnings + v.errors <= 10000 && typeof v.capped === 'boolean'
    && Number.isFinite(Date.parse(v.windowStart)) && Number.isFinite(Date.parse(v.windowEnd))
    && Date.parse(v.windowEnd) > Date.parse(v.windowStart)
    && Date.parse(v.windowEnd) - Date.parse(v.windowStart) <= 86401000;
}
function projectValue(key, v) {
  if (key === 'cpu') return v;
  const fields = key === 'memory' ? ['totalBytes', 'usedBytes'] : key === 'disk' ? ['totalBytes', 'freeBytes']
    : key === 'network' ? ['total', 'up'] : key === 'firewall' ? ['domain', 'private', 'public']
      : ['warnings', 'errors', 'capped', 'windowStart', 'windowEnd'];
  return Object.fromEntries(fields.map(k => [k, v[k]]));
}
export function metric(key, value, observedAt) {
  return { status: 'ok', source: sources[key], observedAt, value: projectValue(key, value) };
}
export function unknown(key, code, observedAt) {
  return { status: 'unknown', source: sources[key], observedAt, code };
}
export function cpuPercent(before, after) {
  if (!before.length || before.length !== after.length) throw Error('CPU_UNAVAILABLE');
  let idle = 0, total = 0;
  for (let i = 0; i < before.length; i++) {
    for (const name of ['user', 'nice', 'sys', 'idle', 'irq']) {
      const delta = after[i].times[name] - before[i].times[name];
      if (!finite(delta)) throw Error('CPU_UNAVAILABLE');
      total += delta; if (name === 'idle') idle += delta;
    }
  }
  if (total <= 0) throw Error('CPU_UNAVAILABLE');
  return Math.round((1 - idle / total) * 1000) / 10;
}
export async function runWindows() {
  // Fixed executable/script, no HTTP data or shell interpolation enters this call.
  const { stdout } = await execute('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', fileURLToPath(new URL('./read-windows.ps1', import.meta.url)),
  ], { timeout: 12000, maxBuffer: 32768, windowsHide: true, encoding: 'utf8' });
  return JSON.parse(stdout.replace(/^\uFEFF/, ''));
}
export async function collectPc({ platform = process.platform, system = os, sleep = delay,
  windows = runWindows, clock = () => new Date().toISOString() } = {}) {
  const startedAt = clock();
  const metrics = {};
  const cpu = (async () => {
    try { const before = system.cpus(); await sleep(500); const value = cpuPercent(before, system.cpus()); metrics.cpu = metric('cpu', value, clock()); }
    catch { metrics.cpu = unknown('cpu', 'READ_FAILED', clock()); }
  })();
  try {
    const totalBytes = system.totalmem(), free = system.freemem(), value = { totalBytes, usedBytes: totalBytes - free };
    if (!finite(free) || !validValue('memory', value)) throw Error('INVALID_MEMORY');
    metrics.memory = metric('memory', value, clock());
  } catch { metrics.memory = unknown('memory', 'READ_FAILED', clock()); }
  const windowsKeys = keys.slice(2);
  if (platform !== 'win32') {
    for (const key of windowsKeys) metrics[key] = unknown(key, 'WINDOWS_ONLY', clock());
  } else {
    try {
      const result = await windows();
      for (const key of windowsKeys) {
        const row = result?.[key];
        const at = row?.observedAt;
        const validTime = typeof at === 'string' && Date.parse(at) >= Date.parse(startedAt) - 1000 && Date.parse(at) <= Date.parse(clock()) + 1000;
        metrics[key] = row?.status === 'ok' && validTime && validValue(key, row.value)
          ? metric(key, row.value, at) : unknown(key, row?.status === 'unknown' ? 'READ_FAILED' : 'INVALID_RESULT', clock());
      }
    } catch { for (const key of windowsKeys) metrics[key] = unknown(key, 'COLLECTOR_FAILED', clock()); }
  }
  await cpu;
  return { schema: 'choi.pc-observation.v1', mode: 'measured', platform, startedAt, checkedAt: clock(), metrics };
}

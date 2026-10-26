// Read-only preparation check. Does not package, install, modify policy, or approve a runtime.
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function inspectPreparation(root, { git = args => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 5000 }) } = {}) {
  let pkg;
  try { pkg = JSON.parse(await readFile(resolve(root, 'on-client/package.json'), 'utf8')); }
  catch { return { readyForOfficialPackaging: false, blockers: ['APP_PACKAGE_JSON_UNREADABLE'], checks: {} }; }
  const script = pkg?.scripts?.['package-app'];
  const packageToolPresent = typeof script === 'string' && script.trim().length > 0;
  const head = git(['rev-parse', '--verify', 'HEAD']);
  const hash = head?.status === 0 && /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(head.stdout?.trim()) ? head.stdout.trim() : null;
  const status = git(['status', '--porcelain']);
  const clean = status?.status === 0 && typeof status.stdout === 'string' ? status.stdout.length === 0 : null;
  const blockers = [];
  if (!packageToolPresent) blockers.push('OFFICIAL_PACKAGE_APP_MISSING');
  if (!hash) blockers.push('SOURCE_COMMIT_UNVERIFIED');
  if (clean !== true) blockers.push(clean === false ? 'SOURCE_HAS_UNCOMMITTED_CHANGES' : 'SOURCE_STATUS_UNVERIFIED');
  // These require the approved Windows environment; file existence is not proof of approval.
  blockers.push('APPROVED_RUNTIME_NOT_VERIFIED', 'STUDENT_PC_HOST_INTEGRATION_NOT_VERIFIED');
  return { readyForOfficialPackaging: false, blockers, checks: {
    starterVersion: typeof pkg.version === 'string' ? pkg.version : null,
    packageToolPresent, sourceCommit: hash, sourceClean: clean,
    approvedRuntime: 'unverified', studentPcHostIntegration: 'unverified',
  }, next: 'Use the official package-app and approved host instructions when available; this check performs no packaging.' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1) { console.error('Usage: node scripts/final-week-preflight.mjs [repository-root]'); process.exitCode = 1; }
  else {
    const root = args[0] ? resolve(args[0]) : fileURLToPath(new URL('../', import.meta.url));
    const result = await inspectPreparation(root);
    console.log(JSON.stringify(result, null, 2)); process.exitCode = 2;
  }
}

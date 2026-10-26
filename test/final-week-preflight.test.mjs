import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectPreparation } from '../scripts/final-week-preflight.mjs';
async function setup(t, scripts = {}) {
  const root = await mkdtemp(join(tmpdir(), 'pc-preflight-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'on-client'));
  await writeFile(join(root, 'on-client/package.json'), JSON.stringify({ version: '0.2.14', scripts }));
  return root;
}
const git = args => ({ status: 0, stdout: args[0] === 'rev-parse' ? 'a'.repeat(40) + '\n' : '' });
test('missing official command is a blocker and source file remains unchanged', async t => {
  const root = await setup(t); const path = join(root, 'on-client/package.json'); const before = await readFile(path);
  const r = await inspectPreparation(root, { git });
  assert.ok(r.blockers.includes('OFFICIAL_PACKAGE_APP_MISSING')); assert.deepEqual(await readFile(path), before);
});
test('existing command never proves approved runtime or installed-host integration', async t => {
  const root = await setup(t, { 'package-app': 'must-not-execute-this' });
  const r = await inspectPreparation(root, { git });
  assert.equal(r.checks.packageToolPresent, true); assert.equal(r.readyForOfficialPackaging, false);
  assert.ok(r.blockers.includes('APPROVED_RUNTIME_NOT_VERIFIED'));
});
test('ZIP source and dirty tree are accurately distinguished without exposing paths', async t => {
  const root = await setup(t);
  const zip = await inspectPreparation(root, { git: () => ({ status: 128, stderr: 'PRIVATE' }) });
  assert.equal(zip.checks.sourceCommit, null); assert.equal(zip.checks.sourceClean, null);
  const dirty = await inspectPreparation(root, { git: args => args[0] === 'status' ? { status: 0, stdout: '?? PRIVATE' } : git(args) });
  assert.equal(dirty.checks.sourceClean, false); assert.doesNotMatch(JSON.stringify([zip, dirty]), /PRIVATE/);
});
test('invalid package metadata returns a bounded preparation failure', async t => {
  const root = await setup(t); await writeFile(join(root, 'on-client/package.json'), '{');
  assert.deepEqual((await inspectPreparation(root, { git })).blockers, ['APP_PACKAGE_JSON_UNREADABLE']);
});

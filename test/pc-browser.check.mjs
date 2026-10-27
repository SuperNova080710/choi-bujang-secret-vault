// Optional browser QA. Use an existing Playwright installation; the app needs no npm dependencies.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createOnServer } from '../on-client/src/server.mjs';
import { demoEngine } from '../on-client/src/engine.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright'));
const server = createOnServer({ engine: demoEngine() });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const panel = page.getByRole('region', { name: '내 PC 조회 타임라인', exact: true });
  const read = panel.getByRole('button', { name: '다시 조회', exact: true });
  await read.waitFor(); await read.focus(); await page.keyboard.press('Enter');
  await panel.getByRole('status').filter({ hasText: /조회 완료/ }).waitFor();
  assert.match(await panel.innerText(), /WINDOWS|Windows|OS 정보/);
  assert.match(await panel.innerText(), /예제 자료 · 실제 서버 연결 아님/);
  assert.equal(await panel.locator('.pc-metric').count(), 6);
  const evidence = panel.locator('[data-metric=cpu] details');
  await evidence.locator('summary').focus(); await page.keyboard.press('Enter');
  assert.equal(await evidence.evaluate(el=>el.open),true);
  await read.click(); await page.waitForFunction(() => document.querySelectorAll('.pc-history > li').length === 2);
  assert.match(await panel.innerText(), /직전 조회 대비/);
  assert.equal(await evidence.evaluate(el=>el.open),true);
  await panel.getByLabel('PC 조회 기록 필터').focus();
  await panel.getByLabel('PC 조회 기록 필터').selectOption('unknown');
  assert.doesNotMatch(await panel.locator('.pc-history').innerText(), /CPU 사용률/);
  assert.equal(await panel.getByLabel('PC 조회 기록 필터').evaluate(el=>el===document.activeElement),true);
  assert.equal(await evidence.evaluate(el=>el.open),true);
  for (const width of [320, 390, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    assert.equal(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    if (process.env.PC_QA_DIR) { await mkdir(process.env.PC_QA_DIR, { recursive: true }); await panel.screenshot({ path: `${process.env.PC_QA_DIR}/pc-${width}.png` }); }
  }
  await panel.getByRole('button', { name: '조회 기록 지우기' }).click();
  assert.equal(await panel.locator('.pc-history > li').count(), 0);
  await page.route('**/api/pc/status', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }));
  await read.click(); await panel.getByRole('status').filter({ hasText: 'PC 조회에 실패' }).waitFor();
  await page.unroute('**/api/pc/status');
  await read.click(); await panel.getByRole('status').filter({ hasText: /조회 완료/ }).waitFor();
  assert.equal(await panel.locator('.pc-history > li').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS: browser keyboard, real Linux metrics, history/filter/delete, 503 recovery, widths 320/390/1280/1920, no page errors');
} finally {
  await browser?.close();
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
}

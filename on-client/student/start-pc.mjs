// Student development entry point. Official runtime and its authorization stay untouched.
import { createOnServer } from '../src/server.mjs';
import { demoEngine } from '../src/engine.mjs';
import { collectPc } from './pc/collect.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function createPcServer({ demo = false, collect = collectPc } = {}) {
  const server = createOnServer(demo ? { engine: demoEngine() } : {});
  const [original] = server.listeners('request');
  server.removeAllListeners('request');
  let busy = false;
  server.on('request', async (req, res) => {
    if (!req.url?.startsWith('/api/student/pc-observation')) { original(req, res); return; }
    const reply = (status, body) => {
      if (res.destroyed) return;
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(JSON.stringify(body));
    };
    const address = server.address();
    const hosts = [`127.0.0.1:${address?.port}`, `localhost:${address?.port}`];
    if (!hosts.includes(req.headers.host) || req.headers.origin !== `http://${req.headers.host}`
      || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) {
      reply(403, { ok: false, code: 'LOCAL_ORIGIN_REQUIRED' }); return;
    }
    if (req.url !== '/api/student/pc-observation' || req.method !== 'POST'
      || req.headers['x-student-pc'] !== 'read' || req.headers['transfer-encoding']
      || (req.headers['content-length'] && req.headers['content-length'] !== '0')) {
      reply(400, { ok: false, code: 'EMPTY_READ_REQUEST_REQUIRED' }); return;
    }
    if (busy) { reply(429, { ok: false, code: 'COLLECTION_BUSY' }); return; }
    busy = true;
    try { reply(200, { ok: true, data: await collect() }); }
    catch { reply(503, { ok: false, code: 'COLLECTION_FAILED' }); }
    finally { busy = false; }
  });
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--demo') || args.length > 1) throw Error('Only --demo is supported');
  const port = Number(process.env.ON_PORT ?? 5189);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('INVALID_PORT');
  const server = createPcServer({ demo: args.includes('--demo') });
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'PORT_IN_USE: stop the previous app first.' : 'SERVER_START_FAILED'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`PC read-only development app: http://127.0.0.1:${port}`));
}

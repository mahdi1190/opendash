// Outbound-only relay connector. Never publishes the dashboard HTTP server.
import { join } from 'node:path';
import { readJson, writeJson, withLock } from './fsutil.mjs';
import { REPO_ROOT } from './datadir.mjs';
import { bridgeMcp } from '../mcp/remote-server.mjs';
import { relayMethods, relayOrigin } from '../cloudflare/relay-worker.mjs';

const services = new Map(), MAX = 256 * 1024;
const fail = message => Object.assign(new Error(message), { status: 409 });
export function createHostedRelay({ dataDir, publicOrigin, serviceFile = join(REPO_ROOT, 'cloudflare', 'service.json'), fetchFn = fetch, rpc = message => bridgeMcp(dataDir, message), now = Date.now, log = () => {} }) {
  const file = join(dataDir, 'secrets', 'hosted-relay.json');
  let running = false, stopped = true, controller = null, loop = null, pending = [], linked = false, lastContact = 0, lastError = null;
  const config = () => readJson(file, { fallback: null });
  async function origin() {
    const published = await readJson(serviceFile, { fallback: null });
    const value = publicOrigin || process.env.OPENDASH_RELAY_ORIGIN || published?.publicOrigin;
    if (!value) return null;
    try { return relayOrigin(value); } catch { throw fail('The published OpenDash relay address is invalid.'); }
  }
  async function call(cfg, path, body, authenticated = true, timeout = 25000) {
    if (authenticated && (!valid(cfg) || cfg.origin !== await origin())) throw fail('The relay registration does not match the published service. Link Claude again.');
    const abort = new AbortController(), stop = () => abort.abort(); const active = controller;
    active?.signal.addEventListener('abort', stop, { once: true });
    const timer = setTimeout(stop, timeout);
    try {
      const url = cfg.origin + (authenticated ? '/i/' + cfg.installation : '') + path;
      const response = await fetchFn(url, { method: 'POST', redirect: 'error', signal: abort.signal, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer ' + cfg.secret } : {}) }, body: JSON.stringify(body) });
      const chunks = [], reader = response.body?.getReader(); let size = 0, text;
      if (reader) {
        try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX) { await reader.cancel(); throw fail('The relay response exceeded its size limit.'); } chunks.push(value); } } finally { reader.releaseLock(); }
        text = Buffer.concat(chunks).toString('utf8');
      } else { text = await response.text(); if (Buffer.byteLength(text) > MAX) throw fail('The relay response exceeded its size limit.'); }
      let result; try { result = JSON.parse(text); } catch { throw fail('The relay returned an unreadable response.'); }
      if (!response.ok) throw Object.assign(fail(response.status === 401 || response.status === 404 ? 'This relay connection was revoked. Link Claude again.' : response.status === 429 ? 'The relay is busy. It will retry shortly.' : 'The OpenDash relay could not complete this request.'), { revoked: response.status === 401 || response.status === 404 });
      return result;
    } finally { clearTimeout(timer); active?.signal.removeEventListener('abort', stop); }
  }
  const valid = cfg => cfg && /^[A-Za-z0-9_-]{43}$/.test(cfg.installation) && /^[A-Za-z0-9_-]{43}$/.test(cfg.secret) && cfg.endpoint === cfg.origin + '/i/' + cfg.installation + '/mcp';
  async function status() {
    const cfg = await config(), service = await origin();
    return { available: !!service, configured: !!valid(cfg), running, online: running && now() - lastContact < 45000, linked: linked && running, endpoint: valid(cfg) ? cfg.endpoint : null, requests: pending, error: lastError,
      disclosure: 'Claude requests and dashboard responses pass through the OpenDash relay. Your main dashboard remains local.' };
  }
  async function runJob(cfg, job) {
    if (!job || !/^[A-Za-z0-9_-]{43}$/.test(job.id || '') || !/^[A-Za-z0-9_-]{43}$/.test(job.nonce || '') || job.expires <= now()) return;
    const msg = job.message; let response;
    const allowed = msg && msg.jsonrpc === '2.0' && relayMethods.has(msg.method) && ['number', 'string'].includes(typeof msg.id)
      && job.scope?.split(' ').includes('opendash:read') && !(msg.method === 'tools/call' && ['apply_changes', 'undo_changes'].includes(msg.params?.name))
      && !(msg.method === 'tools/call' && msg.params?.name === 'propose_changes' && !job.scope.split(' ').includes('opendash:propose'));
    if (!allowed) response = { jsonrpc: '2.0', id: msg?.id ?? null, error: { code: -32601, message: 'Relay request is not allowed.' } };
    else try { response = await rpc(msg); } catch { response = { jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: 'Local OpenDash could not complete the request.' } }; }
    if (Buffer.byteLength(JSON.stringify(response)) > MAX - 1024) response = { jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: 'Narrow this request: its response exceeds the relay size limit.' } };
    if (!stopped) await call(cfg, '/agent/result', { id: job.id, nonce: job.nonce, response }).catch(() => {});
  }
  function wait(ms) { return new Promise(resolve => { const active = controller; const finish = () => { clearTimeout(timer); active?.signal.removeEventListener('abort', finish); resolve(); }; const timer = setTimeout(finish, ms); active?.signal.addEventListener('abort', finish, { once: true }); }); }
  async function start() {
    if (running) return;
    const cfg = await config(), service = await origin(); if (!valid(cfg) || !cfg.enabled || !service || cfg.origin !== service) return;
    stopped = false; running = true; controller = new AbortController();
    loop = (async () => {
      let errors = 0;
      while (!stopped) {
        try {
          const data = await call(cfg, '/agent/poll', {});
          if (stopped) break; lastContact = now(); lastError = null; errors = 0;
          pending = Array.isArray(data.requests) ? data.requests.slice(0, 10).filter(r => /^[A-Za-z0-9_-]{43}$/.test(r.id || '') && /^[A-Z0-9_-]{8}$/.test(r.displayCode || '')).map(r => ({ id: r.id, displayCode: r.displayCode, clientName: String(r.clientName || 'Claude').slice(0, 80), scope: String(r.scope || '').slice(0, 80), expires: r.expires })) : [];
          const jobs = Array.isArray(data.jobs) ? data.jobs.slice(0, 4) : [];
          await Promise.all(jobs.map(j => runJob(cfg, j)));
          await wait(pending.length || jobs.length ? 1500 : 10000);
        } catch (e) {
          if (stopped) break; lastError = e.status ? e.message : 'The relay is unreachable; OpenDash will retry.'; errors++;
          if (e.revoked) { stopped = true; pending = []; linked = false; await withLock(file, () => writeJson(file, { ...cfg, enabled: false }, { mode: 0o600 })); break; }
          await wait(Math.min(30000, 1000 * 2 ** Math.min(5, errors)));
        }
      }
    })().finally(() => { running = false; });
    loop.catch(() => { lastError = 'The local relay connector stopped. Link Claude again.'; running = false; });
  }
  async function link() {
    const service = await origin(); if (!service) throw fail('The shared OpenDash relay has not been published yet.');
    await withLock(file, async () => {
      const current = await config(); if (valid(current) && current.origin === service && current.enabled) return;
      const out = await call({ origin: service }, '/installations', {}, false);
      const cfg = { origin: service, installation: out.installation, secret: out.secret, endpoint: out.endpoint, enabled: true };
      if (!valid(cfg)) throw fail('The relay returned an invalid registration.');
      await writeJson(file, cfg, { mode: 0o600 });
    });
    await start(); log('note', 'Hosted Claude relay connector started'); return status();
  }
  async function refresh() {
    const cfg = await config(); if (!valid(cfg) || !cfg.enabled) return status();
    try { const remote = await call(cfg, '/agent/status', {}, true, 5000); linked = !!remote.linked; pending = Array.isArray(remote.requests) ? remote.requests.slice(0, 10) : []; }
    catch (e) { lastError = e.status ? e.message : 'The relay could not be reached.'; }
    return status();
  }
  async function approve(id, code) {
    if (!pending.some(r => r.id === id && r.displayCode === code && r.expires > now())) throw fail('This matching-code request expired. Start again in Claude.');
    const cfg = await config(); if (!valid(cfg)) throw fail('Link Claude first.');
    await call(cfg, '/agent/approve', { id, code }); return refresh();
  }
  async function revoke() { const cfg = await config(); if (valid(cfg)) await call(cfg, '/agent/revoke', {}); linked = false; pending = []; return status(); }
  async function stop() { stopped = true; controller?.abort(); if (loop) await loop; controller = null; running = false; pending = []; linked = false; }
  async function disconnect() {
    const cfg = await config(); await stop();
    if (valid(cfg)) await call(cfg, '/agent/disconnect', {}, true, 5000).catch(() => {});
    await withLock(file, () => writeJson(file, null, { mode: 0o600 })); return status();
  }
  return { status, link, start, refresh, approve, revoke, disconnect, stop };
}
export function hostedRelayFor(ctx) { if (!services.has(ctx.dataDir)) services.set(ctx.dataDir, createHostedRelay({ dataDir: ctx.dataDir, log: ctx.log })); return services.get(ctx.dataDir); }

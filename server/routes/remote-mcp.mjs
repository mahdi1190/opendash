import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { installSpawnGuard } from '../../lib/spawn-guard.mjs';
installSpawnGuard();   // in a test process, never start a real AI agent CLI (lib/spawn-guard.mjs)
import { REPO_ROOT } from '../../lib/datadir.mjs';
import { secretStore } from '../../lib/secret-store.mjs';
import { createRemoteAuth, remoteOrigin } from '../../lib/remote-mcp-auth.mjs';
import { HttpError } from '../http.mjs';

export default function register(app) {
  const { dataDir } = app.ctx;
  const store = secretStore(dataDir), KEY = 'remote-mcp-config';   // this computer's secret store
  const config = () => store.get(KEY).catch(e => { if (e.code === 'SECRET_CORRUPT') return null; throw e; });
  const authFor = async () => { const cfg = await config(); if (!cfg) throw new HttpError(400, 'Set the Cloudflare hostname first.'); return { cfg, auth: createRemoteAuth({ dataDir, publicOrigin: cfg.publicOrigin }) }; };
  const running = async cfg => {
    try {
      const r = await fetch(`http://127.0.0.1:${cfg.port}/.well-known/oauth-authorization-server`, { signal: AbortSignal.timeout(700) });
      return r.ok && (await r.json()).issuer === cfg.publicOrigin;
    } catch { return false; }
  };
  app.route({ path: '/api/connections/remote-mcp', method: 'GET', handler: async () => {
    const cfg = await config();
    if (!cfg) return { configured: false, running: false, requests: [] };
    const auth = createRemoteAuth({ dataDir, publicOrigin: cfg.publicOrigin });
    return { configured: true, publicOrigin: cfg.publicOrigin, endpoint: cfg.publicOrigin + '/mcp', port: cfg.port, running: await running(cfg), requests: await auth.pending(), connectUntil: (await auth.connectState()).connectUntil };
  } });
  app.route({ path: '/api/connections/remote-mcp/configure', method: 'POST', handler: async c => {
    const b = await c.body(); let origin;
    try { origin = remoteOrigin(b.publicOrigin); } catch { throw new HttpError(400, 'Enter the public HTTPS hostname managed by your Cloudflare account.'); }
    // Fixed independent port; never tunnel the main dashboard server.
    await store.lock(KEY, async () => {
      const previous = await config();
      if (previous && previous.publicOrigin !== origin && await running(previous)) throw new HttpError(409, 'Stop the existing gateway before changing its hostname.');
      await store.set(KEY, { publicOrigin: origin, port: 4911 });
    });
    return { ok: true };
  } });
  app.route({ path: '/api/connections/remote-mcp/start', method: 'POST', handler: async c => {
    await c.body({ allowEmpty: true });
    const { cfg } = await authFor();
    if (await running(cfg)) return { ok: true, already: true };
    const child = spawn(process.execPath, [join(REPO_ROOT, 'mcp', 'remote-server.mjs'), '--data-dir', dataDir], { cwd: REPO_ROOT, shell: false, windowsHide: true, detached: true, stdio: 'ignore' });
    let launchFailed = false; child.on('error', () => { launchFailed = true; }); child.unref();
    for (let i = 0; i < 12 && !launchFailed; i++) {
      await new Promise(r => setTimeout(r, 250));
      if (await running(cfg)) return { ok: true };
    }
    throw new HttpError(502, 'The remote gateway could not start. Check whether port 4911 is in use.');
  } });
  // Connect: new Claude connections are accepted for ten minutes after this (lib/remote-mcp-auth.mjs).
  app.route({ path: '/api/connections/remote-mcp/connect', method: 'POST', handler: async c => {
    await c.body({ allowEmpty: true }); const { auth } = await authFor(); return auth.openConnectWindow();
  } });
  app.route({ path: '/api/connections/remote-mcp/approve', method: 'POST', handler: async c => {
    const b = await c.body(), { auth } = await authFor();
    try { return await auth.approve(String(b.id || ''), String(b.code || '')); }
    catch (e) {
      if (e.error === 'code_mismatch') throw new HttpError(400, `Those letters don't match. Look at your own Claude sign-in tab and type the 4 letters it shows${e.left ? ` (${e.left} ${e.left === 1 ? 'try' : 'tries'} left)` : ''}. If you didn't start a connection just now, don't approve it.`);
      if (e.error === 'code_burned') throw new HttpError(400, 'Three wrong codes, so connecting was stopped to keep you safe. Press Connect Claude to start again.');
      throw new HttpError(400, 'This connection request expired. Start again in Claude.');
    }
  } });
  app.route({ path: '/api/connections/remote-mcp/revoke', method: 'POST', handler: async c => {
    await c.body({ allowEmpty: true }); const { auth } = await authFor(); return auth.revokeAll();
  } });
}

// server/routes/offsite-backup.mjs - Settings > Data > "Daily encrypted copy"
// (lib/offsite-backup.mjs): a locked copy of your data in OneDrive/OpenDash
// Backups (or a folder you choose) once a day, the newest 14 kept, and
// restoring from one.
//
//   GET  /api/backup/offsite[?folder=]  -> {enabled, folder, suggestedFolder, lock, lastRunAt, lastResult,
//                                           due, running, canUseRecoveryKey, keep, backups:[{name, date, host, size, lock}]}
//   POST /api/backup/offsite/settings   {enabled?, folder?, passphrase?, useRecoveryKey?} -> the status
//   POST /api/backup/offsite/now        {} -> {name, bytes, removed}
//   POST /api/backup/offsite/inspect    {name, passphrase?, recoveryKey?, folder?} -> what it holds (counts)
//   POST /api/backup/offsite/restore    {name, passphrase?, recoveryKey?, folder?} -> {restored, tasks, backup}
//                                       (the current data is backed up first: lib/sharing.mjs importData)
//
// The page only (same origin). The daily copy is checked every 30 minutes
// (first 2 minutes after start) and skipped while a move is running. The
// passphrase is never stored: only the key made from it, on this computer.

import { hostname } from 'node:os';
import { createOffsiteBackup } from '../../lib/offsite-backup.mjs';
import { secretStore } from '../../lib/secret-store.mjs';
import { exportData, inspectDataZip, importData } from '../../lib/sharing.mjs';
import { HttpError } from '../http.mjs';

export const TICK_MS = 30 * 60 * 1000;

export default function register(app) {
  const ctx = app.ctx;
  const { log } = ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const svc = createOffsiteBackup({
    secrets: ctx.offsiteSecrets || secretStore(root),
    exportZip: () => exportData({ dataDir: root, financeDir: ctx.financeDir }).buffer,
    host: hostname(), appVersion: ctx.version, log,
    // under the test runner never the real OneDrive folder (tests set ctx.offsiteEnv)
    env: ctx.offsiteEnv || (process.env.NODE_TEST_CONTEXT ? {} : process.env),
    // Sync's recovery key, once sync has one (lib/sync); none yet: passphrase only.
    recoveryKey: () => (ctx.sync && typeof ctx.sync.recoveryKey === 'function' ? ctx.sync.recoveryKey() : null),
  });
  ctx.offsiteBackup = svc;

  const fromPage = (c) => {
    const origin = c.req.headers.origin, sfs = c.req.headers['sec-fetch-site'];
    if (origin === `http://localhost:${c.port}` || origin === `http://127.0.0.1:${c.port}` || sfs === 'same-origin') return;
    throw new HttpError(403, 'only the OpenDash page can do this');
  };
  const http = (e) => (e && e.code && e.status ? new HttpError(e.status, e.message, { code: e.code }) : e);
  const secretOf = (b) => ({
    ...(typeof b.passphrase === 'string' && b.passphrase ? { passphrase: b.passphrase } : {}),
    ...(typeof b.recoveryKey === 'string' && b.recoveryKey ? { recoveryKey: Buffer.from(b.recoveryKey.trim(), /^[0-9a-f]+$/i.test(b.recoveryKey.trim()) ? 'hex' : 'base64') } : {}),
    ...(typeof b.folder === 'string' && b.folder ? { folder: b.folder } : {}),
  });

  let timer = null;
  const tick = async () => {
    try {
      if (ctx.moveGate && ctx.moveGate.paused) return;
      if (await svc.isDue()) await svc.runNow();
    } catch { /* logged by the service; tried again next tick */ }
  };
  app.onReady(() => {
    const ms = Number(process.env.DASHBOARD_BACKUP_TICK_MS) || (process.env.NODE_TEST_CONTEXT ? 0 : TICK_MS);
    if (!ms) return;
    setTimeout(tick, Math.min(ms, 2 * 60 * 1000)).unref?.();
    timer = setInterval(tick, ms); timer.unref?.();
  });
  app.onClose(() => { clearInterval(timer); timer = null; });

  app.route({ path: '/api/backup/offsite', method: 'GET', quiet: true, handler: async (c) => {
    const f = c.query.get('folder');
    if (f && (f.length > 400 || !/^([A-Za-z]:[\\/]|\/)/.test(f))) throw new HttpError(400, 'folder must be a full path');
    return { ...(await svc.status()), backups: await svc.list(f || undefined), ...(f ? { looked: f } : {}) };
  } });

  app.route({
    path: '/api/backup/offsite/settings', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      fromPage(c);
      const b = await c.body();
      const patch = {};
      if (typeof b.enabled === 'boolean') patch.enabled = b.enabled;
      if (b.folder !== undefined) patch.folder = b.folder === null ? null : String(b.folder);
      if (typeof b.passphrase === 'string') patch.passphrase = b.passphrase;
      if (b.useRecoveryKey === true) patch.useRecoveryKey = true;
      try {
        const st = await svc.configure(patch);
        if (patch.enabled !== undefined) log('note', `daily encrypted copy turned ${patch.enabled ? 'on' : 'off'}`);
        return st;
      } catch (e) { throw http(e); }
    },
  });

  app.route({
    path: '/api/backup/offsite/now', method: 'POST', methodError: 'POST only',
    handler: async (c) => { fromPage(c); await c.body({ allowEmpty: true }); try { return await svc.runNow(); } catch (e) { throw http(e); } },
  });

  app.route({
    path: '/api/backup/offsite/inspect', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      fromPage(c);
      const b = await c.body();
      try { return { name: b.name, ...inspectDataZip(await svc.open(String(b.name || ''), secretOf(b))) }; } catch (e) { throw http(e); }
    },
  });

  app.route({
    path: '/api/backup/offsite/restore', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      fromPage(c);
      const b = await c.body();
      let buffer;
      try { buffer = await svc.open(String(b.name || ''), secretOf(b)); } catch (e) { throw http(e); }
      const r = await importData({ buffer, dataDir: root, financeDir: ctx.financeDir, store: ctx.store, setConfig: ctx.setConfig, log });
      log('note', `restored the encrypted copy ${String(b.name).slice(0, 80)}`);
      return { restored: b.name, ...r };
    },
  });
}

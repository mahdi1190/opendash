// server/routes/sync.mjs - "Sync across my devices" (lib/sync/engine.mjs).
//
//   GET  /api/sync/status     -> {enabled, state: off|syncing|ok|waiting|locked|error, message,
//                                 folder, cloud, deviceName, devices:[{id, name, kind, me, lastSeen, fetches}],
//                                 accounts:[{id, label, fetcher}], e2e:{on, ready, reason, pairing,
//                                 requests, offer, found, ...}, skew:{text}, lastSyncAt, conflicts, ...}
//   POST /api/sync/settings   {enabled?, apply?, folder?, deviceName?} -> the status
//                             apply (default off) = write other computers' changes into this
//                             data; off = shadow mode: collect them and report what would change
//                             (400 {error, code} for a folder that is missing, inside the
//                             data or app folder; off by default)
//   POST /api/sync/now        run a sync pass now -> the status
//
// End-to-end encrypted sync (lib/sync/e2e.mjs; every answer is the status, 400 {error, code}
// for anything the user can fix):
//   POST /api/sync/setup             {folder?, deviceName?, apply?}  "this is my first computer":
//                                    a new encrypted group; the answer carries recoveryCode ONCE
//   POST /api/sync/join              {folder?, deviceName?, apply?}  "I already use OpenDash"
//   POST /api/sync/encrypt           move unencrypted sync to encrypted (recoveryCode if it made the group)
//   POST /api/sync/recovery          {code}         join with the recovery code
//   POST /api/sync/recovery/new      a new recovery code (recoveryCode); the old one stops working
//   POST /api/sync/pair/start        this (new) computer asks to be approved
//   POST /api/sync/pair/respond      {sid}          "Check it's yours" on the other computer
//   POST /api/sync/pair/confirm      {sid, match}   the 6 digits match (or not), on either computer
//   POST /api/sync/pair/cancel
//   POST /api/sync/offer             a one-time QR offer for a phone -> {offer: {text, expiresAt}}
//   POST /api/sync/offer/join        {text}         join with what the QR code says
//   POST /api/sync/devices/rename    {id, name}
//   POST /api/sync/devices/remove    {id}           a new key for the others
//   POST /api/sync/fetcher           {account}      "Use this computer instead" (needs this
//                                                   computer's own sign-in for that account)
//
// Same-origin only, like every /api/ route (server/router.mjs). Changes from
// other devices reach open tabs through the normal live-sync path: the engine
// commits through the state store, which bumps the version and announces it
// on /api/events with source 'sync'.

import { createNodeSyncEngine } from '../../lib/sync/node-host.mjs';
import { secretStore } from '../../lib/secret-store.mjs';

/** Does this computer hold its own sign-in for an account's provider? (Tokens never sync.) */
async function hasSignIn(dataDir, provider) {
  const p = String(provider || '').toLowerCase();
  const key = /microsoft|outlook|office|hotmail|live/.test(p) ? 'microsoft-tokens' : /google|gmail/.test(p) ? 'google-tokens' : null;
  if (!key) return false;
  try { return !!(await secretStore(dataDir).get(key)); } catch { return false; }
}

export default function register(app) {
  const { store, log, paths, repoRoot, version } = app.ctx;
  const engine = createNodeSyncEngine({
    store, dataDir: paths.root, log, appVersion: version, forbid: [repoRoot],
    // The account registry and fetched snapshots sync; the connections code asks
    // app.ctx.sync.isFetcher(accountId) before running an account's fetch job.
    ...(process.env.DASHBOARD_SYNC_POLL_MS ? { pollMs: Math.max(500, Number(process.env.DASHBOARD_SYNC_POLL_MS) || 5000) } : {}),
  });
  app.ctx.sync = engine;
  app.onReady(async () => { await engine.start().catch((e) => log('warn', `sync could not start: ${e && (e.code || e.message)}`)); });
  app.onClose(async () => { await engine.stop(); });

  app.route({ path: '/api/sync/status', method: 'GET', quiet: true, handler: () => engine.status() });
  app.route({
    path: '/api/sync/settings', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      const patch = {};
      for (const k of ['enabled', 'apply', 'folder', 'deviceName']) if (b && b[k] !== undefined) patch[k] = b[k];
      try { return await engine.configure(patch); }
      catch (e) { if (e.status === 400) return c.json(400, { error: e.message, code: e.code }); throw e; }
    },
  });
  app.route({ path: '/api/sync/now', method: 'POST', methodError: 'POST only', handler: async () => { await engine.syncNow(); return engine.status(); } });

  // ─── Encrypted sync ──────────────────────────────────────────────────
  const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const post = (path, fn) => app.route({
    path, method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const b = (await c.body({ allowEmpty: true })) || {};
      try { return await fn(b); }
      catch (e) { if (e && e.status === 400) return c.json(400, { error: e.message, code: e.code }); throw e; }
    },
  });
  const where = (b) => ({ folder: str(b.folder, 1000), deviceName: str(b.deviceName, 60), ...(typeof b.apply === 'boolean' ? { apply: b.apply } : {}) });
  post('/api/sync/setup', (b) => engine.setupFirst(where(b)));
  post('/api/sync/join', (b) => engine.joinExisting(where(b)));
  post('/api/sync/encrypt', () => engine.encrypt());
  post('/api/sync/recovery', (b) => engine.joinWithRecovery(str(b.code, 200) || ''));
  post('/api/sync/recovery/new', () => engine.newRecoveryCode());
  post('/api/sync/pair/start', () => engine.pairStart());
  post('/api/sync/pair/respond', (b) => engine.pairRespond(str(b.sid, 40)));
  post('/api/sync/pair/confirm', (b) => engine.pairConfirm(str(b.sid, 40), b.match === true));
  post('/api/sync/pair/cancel', () => engine.pairCancel());
  post('/api/sync/offer', () => engine.makeOffer());
  post('/api/sync/offer/join', (b) => engine.joinWithOffer(str(b.text, 300) || ''));
  post('/api/sync/devices/rename', (b) => engine.renameDevice(str(b.id, 40), str(b.name, 60)));
  post('/api/sync/devices/remove', (b) => engine.removeDevice(str(b.id, 40)));
  post('/api/sync/fetcher', async (b) => {
    const id = str(b.account, 200);
    const acc = (engine.status().accounts || []).find(a => a.id === id);
    const r = await engine.takeOver(id, { hasToken: acc ? await hasSignIn(paths.root, acc.provider) : false });
    if (!r.ok) { const e = new Error(r.message); e.status = 400; e.code = r.code; throw e; }
    return engine.status();
  });
}

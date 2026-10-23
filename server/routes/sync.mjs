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
//   POST /api/sync/code/start        "Add a computer": a 4-letter join code on this computer
//                                    (status e2e.joinCode {role:'offer', code, step, expiresAt}); 10 minutes, single use
//   POST /api/sync/code/cancel       stop the code on screen (or the code being tried on a new computer)
//   POST /api/sync/code/join         {code}         the new computer types the 4 letters
//   POST /api/sync/offer             a one-time QR offer for a phone -> {offer: {text, expiresAt}}
//   POST /api/sync/offer/join        {text}         join with what the QR code says
//   POST /api/sync/devices/rename    {id, name}
//   POST /api/sync/devices/remove    {id}           a new key for the others
//   POST /api/sync/fetcher           {account}      "Use this computer instead" (needs this
//                                                   computer's own sign-in for that account)
//
// Live sync (lib/sync/live/, docs/dev/LIVE_SYNC.md): paired computers connect
// to each other directly (same Wi-Fi, or over the internet through a port the
// router opens) and a change shows on the other within a second; the folder
// stays the catch-up path. The status carries `live` {on, state, peers:[{name,
// state: live|connecting|not-live, path: lan|internet, reason}], reach, roles,
// firewall}. It runs only with encrypted sync. DASHBOARD_LIVE_SYNC=off turns
// it off, DASHBOARD_LIVE_NAT=off leaves the router alone.
//   POST /api/sync/live              {enabled?, internet?, prefer?: [deviceId]} -> the status
//
// Same-origin only, like every /api/ route (server/router.mjs). Changes from
// other devices reach open tabs through the normal live-sync path: the engine
// commits through the state store, which bumps the version and announces it
// on /api/events with source 'sync'.
//
// Accounts (lib/accounts.mjs): app.ctx.sync is the fetcher policy while sync is
// on (isFetcher before an account's fetch job, takeOver for "Fetch on this
// computer instead"); an accounts.json that arrives from another computer
// brings this computer's account sources in line (reconcileSources).

import { createNodeSyncEngine } from '../../lib/sync/node-host.mjs';
import { accountsFor } from '../../lib/accounts.mjs';
import { createNodeLive } from '../../lib/sync/live/node-live.mjs';
import { writeProfile, applyProfile, PROFILE_REL } from '../../lib/profile.mjs';
import { SOURCE_PREFS_REL } from '../../lib/source-prefs.mjs';
import { applySourcePrefs } from '../../lib/sources.mjs';
import { DEFAULT_CONFIG } from '../../lib/datadir.mjs';

export default function register(app) {
  const { store, log, paths, repoRoot, version } = app.ctx;
  const engine = createNodeSyncEngine({
    store, dataDir: paths.root, log, appVersion: version, forbid: [repoRoot],
    // The account registry and fetched snapshots sync; the accounts code asks
    // app.ctx.sync.isFetcher(accountId) before running an account's fetch job.
    ...(process.env.DASHBOARD_SYNC_POLL_MS ? { pollMs: Math.max(500, Number(process.env.DASHBOARD_SYNC_POLL_MS) || 5000) } : {}),
  });
  app.ctx.sync = engine;
  // The accounts service of this data folder (the server's ctx; a bare {dataDir} for stand-in apps).
  const accounts = () => accountsFor(app.ctx.dataDir ? app.ctx : { dataDir: paths.root });
  engine.onApplied((info) => {
    // Open tabs hear which synced files changed (the calendar or inbox another
    // device published, an answer to a remote request, an AI result) and reload them.
    const rels = (info && info.fileRels) || [];
    const sse = app.ctx.liveSync;
    if (rels.length && sse && typeof sse.emit === 'function') { try { sse.emit('synced-files', { rels: rels.slice(0, 50), at: Date.now() }); } catch { /* no open tabs */ } }
    // The person's settings changed on another computer (lib/profile.mjs): into this config.json.
    if (rels.includes(PROFILE_REL) && typeof app.ctx.setConfig === 'function') {
      applyProfile(paths.root, { getConfig: () => app.ctx.getConfig(), setConfig: (p) => app.ctx.setConfig(p), log }).catch(() => {});
    }
    // Your choices on sources (names, colours, on/off: lib/source-prefs.mjs) changed on another computer: into this sources.json.
    if (rels.includes(SOURCE_PREFS_REL)) applySourcePrefs(paths.root, { log }).catch((e) => log('warn', `sync: source choices could not be used (${e && (e.code || e.message)})`));
    if (!rels.includes('accounts.json')) return;
    accounts().reconcileSources().catch((e) => log('warn', `sync: account sources could not be brought in line (${e && (e.code || e.message)})`));
  });
  // Live sync: a computer may take an account's lease only with its own sign-in for that
  // account (accounts/<id> in this computer's secret store; tokens never sync). The
  // 'claude' role (answering remote requests that need Claude, lib/remote-jobs.mjs)
  // is claimed only by a computer where Claude works.
  const live = createNodeLive({
    engine, dataDir: paths.root, log, canFetch: (acc) => accounts().hasSignIn(acc && acc.id),
    extraRoles: ['phone', 'claude'],
    canRun: async (role) => (role !== 'claude' ? true : !!(app.ctx.remoteJobs && (await app.ctx.remoteJobs.localCaps()).claude)),
  });
  // Not ctx.liveSync: that is the open tabs' event stream (server/live-sync.mjs), which
  // the calendar writer and the time route emit on.
  app.ctx.peerLive = live;
  if (app.ctx.remoteJobs) app.ctx.remoteJobs.attach(engine, live);
  app.onReady(async () => {
    // The person's settings as this computer has them, for the others (a first copy: only what differs from the defaults).
    if (typeof app.ctx.getConfig === 'function') await writeProfile(paths.root, app.ctx.getConfig(), { defaults: DEFAULT_CONFIG }).catch(() => {});
    // Source choices that arrived while this computer was not running them in yet.
    await applySourcePrefs(paths.root, { log }).catch(() => {});
    await engine.start().catch((e) => log('warn', `sync could not start: ${e && (e.code || e.message)}`));
    if (live) await live.start().catch((e) => log('warn', `live sync could not start: ${e && (e.code || e.message)}`));
  });
  app.onClose(async () => { if (live) await live.stop().catch(() => {}); await engine.stop(); });

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
  post('/api/sync/code/start', () => engine.codeStart());
  post('/api/sync/code/cancel', () => engine.codeCancel());
  post('/api/sync/code/join', (b) => engine.codeJoin(str(b.code, 40) || ''));
  post('/api/sync/offer', () => engine.makeOffer());
  post('/api/sync/offer/join', (b) => engine.joinWithOffer(str(b.text, 300) || ''));
  post('/api/sync/devices/rename', (b) => engine.renameDevice(str(b.id, 40), str(b.name, 60)));
  post('/api/sync/devices/remove', (b) => engine.removeDevice(str(b.id, 40)));
  post('/api/sync/live', async (b) => {
    if (!live) { const e = new Error('Live sync is turned off on this computer (DASHBOARD_LIVE_SYNC=off).'); e.status = 400; e.code = 'LIVE_OFF'; throw e; }
    const patch = {};
    if (typeof b.enabled === 'boolean') patch.enabled = b.enabled;
    if (typeof b.internet === 'boolean') patch.internet = b.internet;
    if (Array.isArray(b.prefer)) patch.prefer = b.prefer.filter(x => typeof x === 'string').slice(0, 16);
    await live.configure(patch);
    return engine.status();
  });
  // The same take-over as Connections' "Fetch on this computer instead": the accounts code knows
  // whether this computer holds its own sign-in (accounts/<id> in its secret store).
  post('/api/sync/fetcher', async (b) => {
    const id = str(b.account, 200);
    const r = await Promise.resolve().then(() => accounts().fetchHere(id)).catch((e) => ({ ok: false, code: (e && e.code) || 'UNKNOWN_ACCOUNT', message: (e && e.code && e.message) || 'That account is not connected any more.' }));
    if (!r.ok) { const e = new Error(r.message); e.status = 400; e.code = r.code; throw e; }
    return engine.status();
  });
}

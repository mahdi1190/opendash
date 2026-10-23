// server/routes/sync.mjs - "Sync across my devices" (lib/sync/engine.mjs).
//
//   GET  /api/sync/status     -> {enabled, state: off|syncing|ok|waiting|error, message,
//                                 folder, cloud, deviceName, devices:[{name, me, lastSeen}],
//                                 lastSyncAt, conflicts:{count, recent}, detected:[{kind,label,path}], ...}
//   POST /api/sync/settings   {enabled?, apply?, folder?, deviceName?} -> the status
//                             apply (default off) = write other computers' changes into this
//                             data; off = shadow mode: collect them and report what would change
//                             (400 {error, code} for a folder that is missing, inside the
//                             data or app folder; off by default)
//   POST /api/sync/now        run a sync pass now -> the status
//
// Same-origin only, like every /api/ route (server/router.mjs). Changes from
// other devices reach open tabs through the normal live-sync path: the engine
// commits through the state store, which bumps the version and announces it
// on /api/events with source 'sync'.

import { createNodeSyncEngine } from '../../lib/sync/node-host.mjs';

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
}

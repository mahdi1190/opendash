// server/routes/locations.mjs - the permanent location log (lib/locations.mjs), 2.16.
//
//   GET  /api/locations               -> {ok, v, prefs, records:[rec] (oldest first), done:[...], badges, dev, synced}
//   POST /api/locations               {records?:[rec], done?:[completion], badges?:{id: ms}}
//                                     -> {ok, added, grown, off?}   (upsert by id; logging off: kept nowhere)
//   POST /api/locations/prefs         {on?: bool, noticeAt?: ms} -> {ok, prefs}
//   POST /api/locations/delete        {confirm: true, from?, to?} -> {ok, removed}   (Settings > Location history;
//                                     from/to in ms: only that window, for "Forget this trip")
//   GET  /api/locations/spend         -> {status: 'ok', currency, rows:[{cc, amount, n}]} | {status: 'none'}
//                                     (only when the finance analysis carries spend per country)
//
// Same origin only, like every /api/ route. Nothing here calls out: no IP lookup, no Claude.
// The log gets counts only, never places.

import { HttpError } from '../http.mjs';
import { readLog, upsert, setPrefs, deleteAll, spendByCountry } from '../../lib/locations.mjs';

export default function register(app) {
  const { dataDir, log } = app.ctx;
  // This computer's name in sync (Settings > Sync), so each record says which device saw it.
  const dev = () => {
    try { const s = app.ctx.sync && typeof app.ctx.sync.status === 'function' ? app.ctx.sync.status() : null; return (s && s.deviceName) || 'This computer'; }
    catch { return 'This computer'; }
  };
  const synced = () => {
    try { const s = app.ctx.sync && typeof app.ctx.sync.status === 'function' ? app.ctx.sync.status() : null; return !!(s && s.enabled && s.e2e && s.e2e.on); }
    catch { return false; }
  };

  app.route({
    path: '/api/locations', method: ['GET', 'POST'], maxBody: 512 * 1024, methodError: 'GET or POST only', quiet: true,
    handler: async (c) => {
      if (c.method === 'GET') {
        const L = await readLog(dataDir);
        const records = Object.values(L.records).filter(r => r && typeof r === 'object' && Number.isFinite(r.at)).sort((a, b) => a.at - b.at);
        return { ok: true, v: L.v || 1, prefs: L.prefs, records, done: Object.values(L.done), badges: L.badges, dev: dev(), synced: synced() };
      }
      const b = await c.body();
      if (!b || typeof b !== 'object') throw new HttpError(400, 'records are required');
      const r = await upsert(dataDir, b, { dev: dev() });
      if (r.added || r.grown) log('info', `locations: ${r.added} added, ${r.grown} grown`);
      const { write, ...out } = r;
      return out;
    },
  });
  app.route({
    path: '/api/locations/prefs', method: 'POST', maxBody: 2048, methodError: 'POST only',
    handler: async (c) => setPrefs(dataDir, await c.body()),
  });
  app.route({
    path: '/api/locations/delete', method: 'POST', maxBody: 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body();
      if (!b || b.confirm !== true) throw new HttpError(400, 'confirm is required');
      const range = b.from != null && b.to != null ? { from: b.from, to: b.to } : null;
      const r = await deleteAll(dataDir, range);
      log('info', `locations: ${range ? 'a window' : 'the history'} deleted by the user (${r.removed} entries)`);
      const { write, ...out } = r;
      return out;
    },
  });
  app.route({
    path: '/api/locations/spend', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async () => {
      try {
        const { financeData } = await import('../../lib/finance.mjs');
        const d = await financeData();
        const rows = d && d.status === 'ok' ? spendByCountry(d.analysis) : null;
        if (!rows) return { status: 'none' };
        const cfg = typeof app.ctx.getConfig === 'function' ? app.ctx.getConfig() || {} : {};
        return { status: 'ok', currency: cfg.currency || (d.meta && d.meta.currency) || 'GBP', rows };
      } catch { return { status: 'none' }; }
    },
  });
  app.route({ prefix: '/api/locations/', method: '*', handler: (c) => c.json(404, { error: 'unknown locations route' }) });
}

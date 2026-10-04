// server/routes/time.mjs - the computer's time zone as the page sees it (travel spec 2.2, 2.4, 7.2).
//
//   GET    /api/time                -> {system:{zone, at}|null, home, effective, follow, away, diffMin,
//                                       overrideReady, changes:[the last 10 {at, from, to}]}
//                                      `system` is what time.json last recorded (the page compares it with
//                                      its own zone at boot); `effective` is for this request (its header).
//   POST   /api/time/observe {zone, offsetMin, client?}
//                                   -> {ok, changed, effective, today}   at most once per 10 s per client (429)
//   DELETE /api/time/history {from?, to?}   (ISO dates or instants; {} = all) -> {ok, removed}
//
// A change is appended to <data>/time.json and announced to open tabs as the
// live-sync event `time` (they re-read their own zone). Node cannot see the
// computer's zone change after it started, so the page is the sensor: the MCP
// and get_context read time.json (lib/clock.mjs systemZone).
// Logs carry booleans and counts only, never zone ids (spec 6.7).

import { HttpError } from '../http.mjs';
import { timeStoreFor, canonZone, clockFollowOf, CLOCK_OVERRIDE_READY } from '../../lib/clock.mjs';

export const OBSERVE_EVERY_MS = 10 * 1000;

export default function register(app) {
  const ctx = app.ctx;
  const where = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const keepDays = () => { const t = (ctx.getConfig && ctx.getConfig() || {}).travel; return (t && Number(t.keepDays)) || 365; };
  const store = timeStoreFor(where, { keepDays });
  store.get().catch(() => {});        // prime peek() for c.clockNow()
  const lastBy = new Map();           // client -> last observe (ms)

  app.route({
    path: '/api/time', method: 'GET', methodError: 'GET only',
    handler: async (c) => {
      const t = await store.get();
      const cfg = c.getConfig();
      const now = c.clockNow();
      return {
        system: t.system ? { zone: t.system.zone, at: t.system.at } : null,
        home: now.home, effective: now.timezone, follow: clockFollowOf(cfg), away: now.away, diffMin: now.diffMin,
        today: now.today, overrideReady: CLOCK_OVERRIDE_READY,
        changes: t.changes.slice(-10),
      };
    },
  });

  app.route({
    path: '/api/time/observe', method: 'POST', methodError: 'POST only',
    handler: async (c) => {
      const b = await c.body({ max: 2048 });
      const zone = canonZone(typeof b.zone === 'string' ? b.zone : '');
      if (!zone) throw new HttpError(400, 'zone must be a time zone id such as Europe/London');
      const off = b.offsetMin == null ? null : Number(b.offsetMin);
      if (off != null && (!Number.isFinite(off) || Math.abs(off) > 18 * 60)) throw new HttpError(400, 'offsetMin must be minutes east of UTC');
      const client = typeof b.client === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(b.client) ? b.client : 'page';
      const t = Date.now();
      const last = lastBy.get(client) || 0;
      if (t - last < OBSERVE_EVERY_MS) return c.json(429, { ok: false, error: 'too many: at most one observation every 10 s', retryAfterMs: OBSERVE_EVERY_MS - (t - last) });
      lastBy.set(client, t);
      if (lastBy.size > 200) lastBy.delete(lastBy.keys().next().value);
      const r = await store.observe(zone, off, t);
      if (!r.ok) throw new HttpError(400, r.error || 'not recorded');
      if (r.changed) {
        ctx.log?.('info', 'time observe: changed');
        try { ctx.liveSync?.emit('time', { at: new Date(t).toISOString() }); } catch { /* no live sync (tests) */ }
      }
      const now = c.clockNow();
      return { ok: true, changed: r.changed, effective: now.timezone, today: now.today };
    },
  });

  app.route({
    path: '/api/time/history', method: 'DELETE', methodError: 'DELETE only',
    handler: async (c) => {
      const b = await c.body({ max: 2048, allowEmpty: true });
      const ok = (v) => v == null || v === '' || (typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00Z' : v))) || Number.isFinite(v);
      if (!ok(b.from) || !ok(b.to)) throw new HttpError(400, 'from and to must be ISO dates or times');
      const r = await store.forget({ from: b.from || null, to: b.to || null });
      ctx.log?.('info', `time history forgot ${r.removed}`);
      return r;
    },
  });

  app.route({ prefix: '/api/time/', method: '*', handler: (c) => c.json(404, { error: 'unknown time route' }) });
}

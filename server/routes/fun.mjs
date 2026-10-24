// server/routes/fun.mjs - Fun with friends (2.17, agent 'fun'): lib/friends/fun.mjs over HTTP.
//
// Loads lib/friends/fun.mjs at the top level, so its friends kinds (fun:wave, fun:react, fun:gift,
// fun:day, fun:event, fun:line) are defined before the friends engine starts (every route file loads
// first; docs/dev/FRIENDS.md section 9). The routes go through the normal router: 127.0.0.1 only, the
// Host check (421), same-origin on every /api/ request (403), JSON bodies (415) with small limits (413).
// Every value is checked against the allow-lists here and again in lib/friends/fun.mjs; answers carry
// no keys, tokens or anything a friend wrote as text (there is none: everything is an id).
//
//   GET  /api/fun                       -> {ok, on, today, week, friends: {id: {level, duo, quests, theme, ...}},
//                                           gifts: {inbox, recent}, book, reacts, facts, event, caps, recap, prefs}
//   POST /api/fun/wave     {to, t: wave|high5|nudge|thanks, a?}   -> {ok, id, sent, queued, a, combo, candy}
//   POST /api/fun/react    {to, re, e, on}                       -> {ok, id, sent, queued, reacts}
//   POST /api/fun/gift     {to, t, item, wrap, line?, owned?}    -> {ok, id, sent, queued, candy}
//   POST /api/fun/gift/open {id}                                 -> {ok, gift, first}
//   POST /api/fun/event    {to, t: knock|treat|trick}            -> {ok, id, sent, queued, candy}
//   POST /api/fun/day                                            -> {ok, day, sent, queued}  (the page: a task was finished today)
//   POST /api/fun/prefs    {costume?, high5?, theme?: {friend, id}, spaceTheme?: {space, id}, recapSeen?}
//
// 400 {error, code}: one plain sentence the page shows as it is. Open tabs hear `event: fun` on
// /api/events: {type: 'wave'|'gift'|'react'|'day'|'event'|'duo'|'tier', ...ids and numbers only}.

import { createFun } from '../../lib/friends/fun.mjs';

export default function register(app) {
  const ctx = app.ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const cfg = () => (typeof ctx.getConfig === 'function' && ctx.getConfig()) || {};
  const fun = createFun({
    dataDir: root,
    friends: () => (ctx.friends && typeof ctx.friends.send === 'function' ? ctx.friends : null),
    emit: (data) => { const sse = ctx.liveSync; if (sse && typeof sse.emit === 'function') sse.emit('fun', data); },
    emitFriends: (data) => { const sse = ctx.liveSync; if (sse && typeof sse.emit === 'function') sse.emit('friends', data); },
    zone: () => cfg().timezone || null,
    weekStart: () => cfg().weekStart || 'Mon',
    log: (lvl, msg) => { try { ctx.log?.(lvl, msg); } catch { /* no log */ } },
  });
  ctx.fun = fun;
  app.onReady(async () => { fun.attach(); });

  const str = (v, max = 64) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const route = (path, method, fn, extra = {}) => app.route({
    path, method, methodError: `${method} only`, maxBody: 4096, ...extra,
    handler: async (c) => {
      try { fun.attach(); const out = await fn(c); return { ok: true, ...(out || {}) }; }
      catch (e) { if (e && (e.status === 400 || e.status === 409)) return c.json(e.status, { error: e.message, code: e.code }); throw e; }
    },
  });
  const body = async (c) => { const b = await c.body({ allowEmpty: true }); return b && typeof b === 'object' && !Array.isArray(b) ? b : {}; };

  route('/api/fun', 'GET', () => fun.view(), { quiet: true });
  route('/api/fun/wave', 'POST', async (c) => { const b = await body(c); return fun.wave({ to: str(b.to, 20), t: str(b.t, 10), a: str(b.a, 20) || null }); });
  route('/api/fun/react', 'POST', async (c) => { const b = await body(c); return fun.react({ to: str(b.to, 20), re: str(b.re, 40), e: str(b.e, 20), on: b.on !== false }); });
  route('/api/fun/gift', 'POST', async (c) => {
    const b = await body(c);
    const owned = b.owned && typeof b.owned === 'object' && !Array.isArray(b.owned) ? Object.fromEntries(Object.entries(b.owned).slice(0, 8).filter(([k, v]) => /^[a-z0-9-]{1,24}$/.test(k) && v === true)) : null;
    return fun.gift({ to: str(b.to, 20), t: str(b.t, 12), item: str(b.item, 40), wrap: str(b.wrap, 20), line: str(b.line, 20) || null, owned });
  });
  route('/api/fun/gift/open', 'POST', async (c) => fun.openGift({ id: str((await body(c)).id, 40) }));
  route('/api/fun/event', 'POST', async (c) => { const b = await body(c); return fun.event({ to: str(b.to, 20), t: str(b.t, 10) }); });
  route('/api/fun/day', 'POST', () => fun.day(), { quiet: true });
  route('/api/fun/prefs', 'POST', async (c) => {
    const b = await body(c);
    const pair = (o, k) => (o && typeof o === 'object' && !Array.isArray(o) ? { [k]: str(o[k], 64), id: str(o.id, 20) } : undefined);
    return fun.setPrefs({
      costume: typeof b.costume === 'boolean' ? b.costume : undefined, high5: str(b.high5, 20),
      theme: pair(b.theme, 'friend'), spaceTheme: pair(b.spaceTheme, 'space'), recapSeen: str(b.recapSeen, 10),
    });
  });
  app.route({ prefix: '/api/fun/', method: '*', handler: (c) => c.json(404, { error: 'unknown fun route' }) });
}

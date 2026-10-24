// server/routes/garden-social.mjs - Gardens with friends (2.18, agent 'garden-social'): lib/friends/garden.mjs
// over HTTP (docs/dev/GARDEN.md section 11).
//
// Loads lib/friends/garden.mjs at the top level, so its friends kinds (garden, garden:ask, garden:act,
// garden:line) are defined before the friends engine starts (every route file loads first; docs/dev/FRIENDS.md
// section 9). The routes go through the normal router: 127.0.0.1 only, the Host check (421), same-origin on
// every /api/ request (403), JSON bodies (415) with small limits (413). Every value is checked against the
// tables here and again in lib/friends/garden.mjs. Answers carry ids, cells, numbers and the guestbook lines
// friends wrote (plain text: the page shows them with textContent only); never a key or a token.
//
//   GET  /api/garden-social[?snaps=0][&have=<friendId>.<got>,...]
//                                         -> {ok, on, today, gardens: {friendId: {snap? (not when `have` has it: same: true), lv, n, at, got, hearts, visited} | null},
//                                            inbox, book, pending, sentToday, tally, visitDays, prefs, unseen}
//   GET  /api/garden-social/friend?id=    -> {ok, friend, today, garden: {snap, at, got, hearts} | null, used, caps, mine}
//   POST /api/garden-social/act      {to, t: visit|water|gift|react|sign|like, p?, x?, y?, k?, item?, e?, txt?}
//                                         -> {ok, id, sent, queued, day}
//   POST /api/garden-social/ask      {to}  -> {ok, asked | fresh | capped}   (a fresh copy of their garden, please)
//   POST /api/garden-social/applied  {ids} -> {ok, n}       (the page applied these waterings and parcels to its garden)
//   POST /api/garden-social/hide     {id, hidden}           (a guestbook line out of sight, or back)
//   POST /api/garden-social/prefs    {book?, gifts?, seen?}  -> {ok, prefs}
//
// 400 / 409 {error, code}: one plain sentence the page shows as it is. Open tabs hear `event: garden` on
// /api/events: {type: 'act'|'snap'|'sent'|'applied'|'changed', from?, to?, id?, t?, ...ids only}.

import { createGardenSocial } from '../../lib/friends/garden.mjs';

export default function register(app) {
  const ctx = app.ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const cfg = () => (typeof ctx.getConfig === 'function' && ctx.getConfig()) || {};
  const sse = (event, data) => { const s = ctx.liveSync; if (s && typeof s.emit === 'function') s.emit(event, data); };
  const gs = createGardenSocial({
    dataDir: root,
    friends: () => (ctx.friends && typeof ctx.friends.send === 'function' ? ctx.friends : null),
    emit: (data) => sse('garden', data),
    emitFriends: (data) => sse('friends', data),
    zone: () => cfg().timezone || null,
    // agent perms (server/routes/perms.mjs): do I share my garden with this friend? Without it: yes, for a confirmed friend.
    policy: async (friend, scope) => {
      const p = ctx.friendsShare;
      if (!p || typeof p.policy !== 'function') return !!friend && friend.status === 'friend';
      return !!(await p.policy(friend, scope, { allowed: true }));
    },
    log: (lvl, msg) => { try { ctx.log?.(lvl, msg); } catch { /* no log */ } },
  });
  ctx.gardenSocial = gs;
  app.onReady(async () => { gs.attach(); });

  const str = (v, max = 64) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const intOf = (v) => (Number.isInteger(v) ? v : undefined);
  const route = (path, method, fn, extra = {}) => app.route({
    path, method, methodError: `${method} only`, maxBody: 4096, ...extra,
    handler: async (c) => {
      try { gs.attach(); const out = await fn(c); return { ok: true, ...(out || {}) }; }
      catch (e) { if (e && (e.status === 400 || e.status === 409)) return c.json(e.status, { error: e.message, code: e.code }); throw e; }
    },
  });
  const body = async (c) => { const b = await c.body({ allowEmpty: true }); return b && typeof b === 'object' && !Array.isArray(b) ? b : {}; };

  // have=<friendId>.<got>,...: the snapshots the page holds already (not sent again)
  const haveOf = (q) => {
    const out = {};
    for (const part of String(q || '').split(',').slice(0, 200)) { const m = /^([0-9a-f]{16})\.(\d{1,15})$/.exec(part); if (m) out[m[1]] = Number(m[2]); }
    return out;
  };
  route('/api/garden-social', 'GET', (c) => gs.view({ snaps: c.query.get('snaps') !== '0', have: haveOf(c.query.get('have')) }), { quiet: true });
  route('/api/garden-social/friend', 'GET', (c) => gs.friendView(str(c.query.get('id'), 20)), { quiet: true });
  route('/api/garden-social/act', 'POST', async (c) => {
    const b = await body(c);
    return gs.act({ to: str(b.to, 20), t: str(b.t, 10), p: str(b.p, 64), x: intOf(b.x), y: intOf(b.y), k: str(b.k, 8), item: str(b.item, 64), e: str(b.e, 20), txt: str(b.txt, 600) });
  });
  route('/api/garden-social/ask', 'POST', async (c) => gs.ask({ to: str((await body(c)).to, 20) }), { quiet: true });
  route('/api/garden-social/applied', 'POST', async (c) => {
    const b = await body(c);
    return gs.applied({ ids: Array.isArray(b.ids) ? b.ids.slice(0, 200).map(x => str(x, 40)) : [] });
  }, { maxBody: 16384 });
  route('/api/garden-social/hide', 'POST', async (c) => { const b = await body(c); return gs.hide({ id: str(b.id, 40), hidden: b.hidden !== false }); });
  route('/api/garden-social/prefs', 'POST', async (c) => {
    const b = await body(c);
    return gs.setPrefs({ book: typeof b.book === 'boolean' ? b.book : undefined, gifts: typeof b.gifts === 'boolean' ? b.gifts : undefined, seen: b.seen === true });
  });
  app.route({ prefix: '/api/garden-social/', method: '*', handler: (c) => c.json(404, { error: 'unknown garden route' }) });
}

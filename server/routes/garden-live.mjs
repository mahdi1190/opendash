// server/routes/garden-live.mjs - playing together, live (docs/dev/GARDEN_TOGETHER.md): lib/friends/live.mjs over HTTP.
//
// Loads lib/friends/live.mjs at the top level, so its friends kinds (gl:*) are defined before the friends engine starts.
// The normal router: 127.0.0.1 only, the Host check (421), same-origin on every /api/ request (403), JSON bodies (415), small
// limits (413). Open tabs hear `event: garden` {type: 'live', ev} on /api/events. Answers carry ids, cells, numbers and first
// names (plain text: the page sets them with textContent only); never a key or a token.
//
//   GET  /api/garden-live                      -> {ok, on, v, open, groupLook, perms, posts, host, visit, budget, stats}
//   POST /api/garden-live/here  {role: host|visit, on, f?, look?, name?, tab?}   the page says where it is (and every 30 s while it stays); a host's answer says whether this tab is the host (`lead`)
//   POST /api/garden-live/send  {k: go|em|do, body}                        a visitor's page to the garden it is in
//   POST /api/garden-live/host  {to?, k: go|em|res|d|snap, body, tab?}     the host's page to who is there
//   POST /api/garden-live/post  {to, id, why, i?, items?}                  something posted to a friend (durable)
//   POST /api/garden-live/applied {ids}
//   POST /api/garden-live/perm  {id, lv?, touch?, share?}   /prefs {open?, groupLook?}   /home {id}

import { createGardenLive } from '../../lib/friends/live.mjs';

export default function register(app) {
  const ctx = app.ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const sse = (event, data) => { const s = ctx.liveSync; if (s && typeof s.emit === 'function') s.emit(event, data); };
  let groupsAt = 0, groups = [];   // the friend's groups, a few seconds old at most: a message from a friend asks this
  const gl = createGardenLive({
    dataDir: root,
    friends: () => (ctx.friends && typeof ctx.friends.send === 'function' ? ctx.friends : null),
    emit: (data) => sse('garden', data),
    groupMember: async (id) => {
      const t = typeof ctx.togetherSpaces === 'function' ? ctx.togetherSpaces() : null;
      if (!t || typeof t.list !== 'function') return false;
      if (Date.now() - groupsAt > 5000) { const spaces = await t.list().catch(() => []); groups = Array.isArray(spaces) ? spaces : []; groupsAt = Date.now(); }   // clock-ok: a cache age
      return groups.some(sp => { const m = sp && sp.status === 'joined' && sp.value && sp.value.members && sp.value.members[id]; return !!m && !m.left && !m.removed; });   // (people who left or were removed keep a record there)
    },
    log: (lvl, msg) => { try { ctx.log?.(lvl, msg); } catch { /* no log */ } },
  });
  ctx.gardenLive = gl;
  app.onReady(async () => { gl.attach(); });

  const route = (path, method, fn, extra = {}) => app.route({
    path, method, methodError: `${method} only`, maxBody: 4096, ...extra,
    handler: async (c) => {
      try { gl.attach(); const out = await fn(c); return { ok: true, ...(out || {}) }; }
      catch (e) { if (e && (e.status === 400 || e.status === 409)) return c.json(e.status, { error: e.message, code: e.code }); throw e; }
    },
  });
  const body = async (c) => { const b = await c.body({ allowEmpty: true }); return b && typeof b === 'object' && !Array.isArray(b) ? b : {}; };
  const str = (v, max = 64) => (typeof v === 'string' ? v.slice(0, max) : undefined);

  route('/api/garden-live', 'GET', () => gl.view(), { quiet: true });
  route('/api/garden-live/here', 'POST', async (c) => {
    const b = await body(c);
    return gl.here({ role: str(b.role, 8), on: b.on === 'again' ? 'again' : b.on === 'release' ? 'release' : b.on === true, f: str(b.f, 20), look: b.look, name: str(b.name, 60), tab: str(b.tab, 24) });
  }, { quiet: true, maxBody: 8192 });
  route('/api/garden-live/send', 'POST', async (c) => { const b = await body(c); return gl.visitSend({ k: str(b.k, 8), body: b.body }); }, { quiet: true });
  route('/api/garden-live/host', 'POST', async (c) => { const b = await body(c); return gl.hostSend({ to: b.to === undefined ? 'all' : str(b.to, 20), k: str(b.k, 8), body: b.body, tab: str(b.tab, 24) }); }, { quiet: true, maxBody: 64 * 1024 });
  route('/api/garden-live/post', 'POST', async (c) => { const b = await body(c); return gl.post({ to: str(b.to, 20), id: str(b.id, 64), why: str(b.why, 10), i: str(b.i, 64), items: Array.isArray(b.items) ? b.items.slice(0, 4) : undefined }); });
  route('/api/garden-live/applied', 'POST', async (c) => { const b = await body(c); return gl.applied({ ids: Array.isArray(b.ids) ? b.ids.slice(0, 200).map(x => str(x, 64)) : [] }); }, { maxBody: 16384 });
  route('/api/garden-live/perm', 'POST', async (c) => { const b = await body(c); return gl.setPerm({ id: str(b.id, 20), lv: str(b.lv, 8), touch: typeof b.touch === 'boolean' ? b.touch : undefined, share: str(b.share, 8) }); });
  route('/api/garden-live/prefs', 'POST', async (c) => { const b = await body(c); return gl.setPrefs({ open: typeof b.open === 'boolean' ? b.open : undefined, groupLook: typeof b.groupLook === 'boolean' ? b.groupLook : undefined }); });
  route('/api/garden-live/home', 'POST', async (c) => gl.sendHome({ id: str((await body(c)).id, 20) }));
  app.route({ prefix: '/api/garden-live/', method: '*', handler: (c) => c.json(404, { error: 'unknown garden route' }) });
}

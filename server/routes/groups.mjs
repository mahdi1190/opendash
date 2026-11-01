// server/routes/groups.mjs - Freeflo Groups (docs/dev/GROUPS.md).
//
// The normal router: 127.0.0.1 only, the Host check (421), same-origin on every /api/ request (403), JSON bodies
// (415) with limits (413). No answer carries a key or a token. A group's link is the one secret that reaches the page:
// only from /share, /reset and /joining, only for someone who runs the group, because sharing it is the whole point.
//
//   GET  /api/groups                   -> {ok, groups: [view], caps}
//   GET  /api/groups/one?id=           -> {ok, group, members, posts, requests, blocks, myFp}
//   POST /api/groups/create            {name, about?, welcome?, logo?, mode?, exp?, maxUses?, posts?, auto?, myName?} -> {ok, id, link, message, ...}
//   POST /api/groups/preview           {text}  a link or a code -> {ok, name, about, ownerName, ownerFp, mode, ...}
//   POST /api/groups/join              {text, name?, status?, home?, auto?} -> {ok, status, name, welcome, id}   home: also use this group's connection for friends. auto: yes to automatic friends here
//   POST /api/groups/cancel | forget | leave | delete | check | share | reset | keep-link   {id}
//   POST /api/groups/joining           {id, mode, exp?, maxUses?}    /code {id, on}
//   POST /api/groups/approve | remove | remove/undo | unblock | transfer | friend   {id, iid}
//   POST /api/groups/decline           {id, iid, block?}    /remove also {block?}    /role {id, iid, role}
//   POST /api/groups/post              {id, ch: a|m, text}  /profile {id, name?, status?, autoOk?}
//   POST /api/groups/card              {id, name?, about?, welcome?, logo?, auto?, posts?}
//
// 400 {error, code}: a plain sentence the page shows as it is.

import { createGroupsEngine } from '../../lib/friends/groups.mjs';

export default function register(app) {
  const { paths, log } = app.ctx;
  const cfg = () => (typeof app.ctx.getConfig === 'function' && app.ctx.getConfig()) || {};
  let engine = null;
  const get = () => {
    if (!engine) {
      engine = createGroupsEngine({
        dataDir: paths.root, log, friends: app.ctx.friends || null,
        emit: (event, data) => { const sse = app.ctx.liveSync; if (sse && typeof sse.emit === 'function') sse.emit(event, data); },
        getName: () => cfg().userName || '',
      });
      app.ctx.groups = engine;
    }
    return engine;
  };
  get();
  app.onReady(async () => {
    await get().start().catch((e) => log('warn', `groups could not start: ${e && (e.code || e.message)}`));
    const sync = app.ctx.sync;
    if (sync && typeof sync.onApplied === 'function') sync.onApplied((info) => { const rels = (info && info.fileRels) || []; if (rels.some(r => String(r) === 'friends/groups.json')) get().reload().catch(() => {}); });
  });
  app.onClose(async () => { await get().stop().catch(() => {}); });

  const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const idOf = (b) => str(b.id, 22) || '';
  const iidOf = (b) => str(b.iid, 22) || '';
  const route = (path, method, fn, extra = {}) => app.route({
    path, method, methodError: `${[].concat(method).join(' or ')} only`, ...extra,
    handler: async (c) => {
      try { const out = await fn(c); return { ok: true, ...(out || {}) }; }
      catch (e) { if (e && e.status === 400) return c.json(400, { error: e.message, code: e.code }); throw e; }
    },
  });
  const body = async (c) => (await c.body({ allowEmpty: true })) || {};
  const post = (name, fn, extra) => route(`/api/groups/${name}`, 'POST', async (c) => fn(await body(c)), extra);

  route('/api/groups', 'GET', () => get().list(), { quiet: true });
  route('/api/groups/one', 'GET', (c) => get().detail(str(c.query.get('id'), 22) || ''), { quiet: true });
  const cardOf = (b) => ({
    name: str(b.name, 120), about: str(b.about, 1000), welcome: str(b.welcome, 1000),
    logo: b.logo && typeof b.logo === 'object' ? { e: str(b.logo.e, 16) || '', c: str(b.logo.c, 7) || '' } : undefined,
    auto: typeof b.auto === 'boolean' ? b.auto : undefined, posts: b.posts === 'admins' || b.posts === 'all' ? b.posts : undefined,
  });
  post('create', (b) => get().create({ ...cardOf(b), mode: b.mode === 'open' ? 'open' : 'approve', exp: Number.isFinite(b.exp) ? b.exp : null, maxUses: Number.isInteger(b.maxUses) ? b.maxUses : null, myName: str(b.myName, 60) }));
  post('preview', (b) => get().preview(str(b.text, 2000) || ''));
  post('join', (b) => get().join(str(b.text, 2000) || '', { name: str(b.name, 60), status: str(b.status, 120), home: b.home === true, auto: b.auto === true }));
  post('cancel', (b) => get().cancelJoin(idOf(b)));
  post('forget', (b) => get().forget(idOf(b)));
  post('leave', (b) => get().leave(idOf(b)));
  post('delete', (b) => get().deleteGroup(idOf(b)));
  post('check', (b) => get().check(idOf(b) || null));
  post('share', (b) => get().share(idOf(b)));
  post('reset', (b) => get().resetLink(idOf(b)));
  post('keep-link', (b) => get().keepLink(idOf(b)));
  post('joining', (b) => get().setJoin(idOf(b), { mode: b.mode === 'open' ? 'open' : 'approve', exp: Number.isFinite(b.exp) ? b.exp : null, maxUses: Number.isInteger(b.maxUses) ? b.maxUses : null }));
  post('code', (b) => get().setCode(idOf(b), b.on === true));
  post('approve', (b) => get().approve(idOf(b), iidOf(b)));
  post('decline', (b) => get().decline(idOf(b), iidOf(b), { block: b.block === true }));
  post('remove', (b) => get().remove(idOf(b), iidOf(b), { block: b.block === true }));
  post('remove/undo', (b) => get().undoRemove(idOf(b), iidOf(b)));
  post('unblock', (b) => get().unblock(idOf(b), iidOf(b)));
  post('role', (b) => get().setRole(idOf(b), iidOf(b), b.role === 'admin' ? 'admin' : 'member'));
  post('transfer', (b) => get().transfer(idOf(b), iidOf(b)));
  post('friend', (b) => get().addFriend(idOf(b), iidOf(b)));
  post('post', (b) => get().post(idOf(b), { ch: b.ch === 'a' ? 'a' : 'm', text: str(b.text, 4000) || '' }), { maxBody: 16 * 1024 });
  post('profile', (b) => get().setProfile(idOf(b), { name: str(b.name, 60), status: str(b.status, 120), autoOk: typeof b.autoOk === 'boolean' ? b.autoOk : undefined }));
  post('card', (b) => get().setCard(idOf(b), cardOf(b)));
  app.route({ prefix: '/api/groups/', method: '*', handler: (c) => c.json(404, { error: 'unknown groups route' }) });
}

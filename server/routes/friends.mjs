// server/routes/friends.mjs - OpenDash Friends (docs/dev/FRIENDS.md section 13).
//
// The routes go through the normal router (server/router.mjs): 127.0.0.1 only,
// the Host check (421), same-origin on every /api/ request (403), JSON bodies
// (415) with limits (413). No answer ever carries a key, a token or a nonce:
// views come from lib/friends/engine.mjs, which builds them without those.
// The invite text POST /api/friends/invite returns IS the invite the person
// shares (it carries a drop token and, for a relay owner, a one-time relay
// token); it is never logged.
//
//   GET  /api/friends[?peek=1]               -> {ok, me, friends:[view], counts, relay, direct, dropped}
//                                            (peek: before Friends is first opened; no identity is made)
//   GET  /api/friends/friend?id=             -> {ok, friend, shared:{kind:{at,b}}, feed:[entry]}
//   GET  /api/friends/feed?friend=&kind=&limit=&before=   -> {ok, entries}
//   POST /api/friends/feed       {event}     -> {ok, entry | id...}  (friendsFeedPost)
//   POST /api/friends/me         {name?, presence?:{share?, state?}, direct?} -> {ok, prefs}
//   POST /api/friends/code/rotate            -> {ok, code}
//   POST /api/friends/live       {cancel?}  -> {live: {code, expiresAt} | null}  (the 4-letter live code)
//   POST /api/friends/add        {code} | {invite}  -> {ok, friend}
//   POST /api/friends/invite     {ttlDays?, relayScopes?}  -> {ok, id, text, link, exp, relayScopes}
//   POST /api/friends/invite/cancel {id}
//   POST /api/friends/approve | confirm | decline | mismatch | cancel   {id}
//                                 confirm: the requester's "The codes match" (added by code)
//   POST /api/friends/remove     {id, block?} -> {ok, undoUntil}
//   POST /api/friends/remove/undo {id} | /api/friends/unblock {id}
//   POST /api/friends/send       {to, kind, body, group?} -> {ok, id, sent, queued, skipped}
//                                {to: id|[ids]|'*', kind, revoke: true}: take a latest / handler kind back
//   POST /api/friends/publish    {kind, body} -> {ok, sent, queued};  {kind, revoke: true}: stop publishing it
//   POST /api/friends/presence   {state}  (the page: online | focusing | travelling | away)
//   POST /api/friends/check      pull the mailbox now -> {ok, got}
//   POST /api/friends/rotate     renew my friend keys (or go on with a renewal) -> {ok, rotation}
//   GET  /api/friends/rotation   -> {ok, rotation: {step, role, friends, moved, failed, waiting, error...} | null}
//   POST /api/friends/relay-ask  {id, allow?}: let a friend's renewed key keep using my connection (allow: false: not now)
//
// 400 {error, code}: a plain sentence the page shows as it is.

import { createFriendsEngine } from '../../lib/friends/engine.mjs';
import { isOwedKind } from '../../lib/owed-friends.mjs';
import { createNodeDirect } from '../../lib/friends/node-direct.mjs';
import { registerIdentityExtra, primeIdentity, loadIdentity } from '../../lib/friends/store.mjs';

export default function register(app) {
  const { paths, log } = app.ctx;
  const dataDir = paths.root;
  const cfg = () => (typeof app.ctx.getConfig === 'function' && app.ctx.getConfig()) || {};
  let engine = null;
  let direct = null;
  try {
    direct = createNodeDirect({
      dataDir, log,
      getIdentity: () => loadIdentity(dataDir),
      peers: () => (engine ? engine.peerMap : new Map()),
      onEnvelope: (env, id) => { if (engine) engine.receive(env, 'direct', id).catch(() => {}); },
      onLink: (id, up) => { if (engine) engine.onLink(id, up); },
    });
  } catch (e) { log('warn', `friends: direct links are off (${e && (e.code || e.message)})`); direct = null; }
  engine = createFriendsEngine({
    dataDir, log, direct,
    emit: (event, data) => { const sse = app.ctx.liveSync; if (sse && typeof sse.emit === 'function') sse.emit(event, data); },
    getName: () => cfg().userName || '',
    zone: () => cfg().timezone || null,
  });
  app.ctx.friends = engine;
  // The identity rides in the device-pairing keyring (lib/sync/e2e.mjs): one per person.
  registerIdentityExtra(dataDir, { onChange: () => { engine.reload().catch(() => {}); } });
  // Renewed keys (here or on another device): device sync makes this computer's relay certificate
  // again with the new identity (lib/sync/relay-node.mjs reads only the current one).
  engine.onRotated(() => {
    const sync = app.ctx.sync;
    if (sync && typeof sync.relayChanged === 'function') Promise.resolve().then(() => sync.relayChanged()).catch(() => {});
  });
  // ...and again when the renewal is done (the relay trusts only the new key now: the sync group can move to it).
  let rotationDoneAt = null;
  engine.onChange(() => {
    Promise.resolve().then(() => engine.rotation()).then((r) => {
      const d = (r && r.doneAt) || 0;
      if (rotationDoneAt === null) { rotationDoneAt = d; return; }
      if (!d || d === rotationDoneAt) return;
      rotationDoneAt = d;
      const sync = app.ctx.sync;
      if (sync && typeof sync.relayChanged === 'function') return sync.relayChanged();
      return null;
    }).catch(() => {});
  });

  app.onReady(async () => {
    await primeIdentity(dataDir).catch(() => {});
    // A friends file another of the person's devices changed (sync): read it again.
    const sync = app.ctx.sync;
    if (sync && typeof sync.onApplied === 'function') {
      sync.onApplied((info) => { const rels = (info && info.fileRels) || []; if (rels.some(r => String(r).startsWith('friends/'))) engine.reload().catch(() => {}); });
    }
    if (await loadIdentity(dataDir).catch(() => null)) await engine.start().catch((e) => log('warn', `friends could not start: ${e && (e.code || e.message)}`));
  });
  app.onClose(async () => { await engine.stop().catch(() => {}); });

  const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  // What someone owes goes only through /api/owed/share, which builds it itself on the person's press (lib/owed-friends.mjs).
  const refuseOwed = (kind) => { if (isOwedKind(kind)) throw Object.assign(new Error('That can only be sent from Owed to me.'), { status: 400, code: 'BAD_KIND' }); };
  const route = (path, method, fn, extra = {}) => app.route({
    path, method, methodError: `${[].concat(method).join(' or ')} only`, ...extra,
    handler: async (c) => {
      try { const out = await fn(c); return { ok: true, ...(out || {}) }; }
      catch (e) { if (e && e.status === 400) return c.json(400, { error: e.message, code: e.code }); throw e; }
    },
  });
  const body = async (c) => (await c.body({ allowEmpty: true })) || {};

  // ?peek=1: the page's background look before Friends was ever opened (makes no identity).
  route('/api/friends', 'GET', (c) => engine.snapshot({ create: c.query.get('peek') !== '1' }), { quiet: true });
  route('/api/friends/friend', 'GET', (c) => engine.friendDetail(str(c.query.get('id'), 20)), { quiet: true });
  route('/api/friends/feed', ['GET', 'POST'], async (c) => {
    if (c.method === 'GET') {
      const q = c.query;
      return { entries: await engine.feed({ friend: str(q.get('friend'), 20) || null, kind: str(q.get('kind'), 90) || null, limit: Number(q.get('limit')) || 50, before: q.get('before') != null ? Number(q.get('before')) : null }) };
    }
    const b = await body(c);
    refuseOwed(b.event && b.event.kind);
    return engine.feedPost(b.event);
  }, { maxBody: 48 * 1024, quiet: true });
  route('/api/friends/me', 'POST', async (c) => {
    const b = await body(c);
    return { prefs: await engine.setMe({ name: str(b.name, 60), presence: b.presence && typeof b.presence === 'object' ? { share: b.presence.share, state: str(b.presence.state, 20) } : undefined, direct: typeof b.direct === 'boolean' ? b.direct : undefined }) };
  });
  route('/api/friends/code/rotate', 'POST', () => engine.rotateCode());
  // 2.20.1: "Show my friend code" (4 letters, 10 minutes, once) -> {code, expiresAt}; {cancel: true} ends it.
  route('/api/friends/live', 'POST', async (c) => ((await body(c)).cancel === true ? (await engine.cancelLiveCode(), { live: null }) : { live: await engine.showLiveCode() }));
  route('/api/friends/add', 'POST', async (c) => {
    const b = await body(c);
    const invite = str(b.invite, 8000) || null;
    const friend = await engine.add({ code: str(b.code, 40) || null, invite });
    // An invite with relay access may have made it the home relay (friends/relays.json, the one source): sync looks now.
    const sync = app.ctx.sync;
    if (invite && sync && typeof sync.relayChanged === 'function') Promise.resolve().then(() => sync.relayChanged()).catch(() => {});
    return { friend };
  }, { maxBody: 16 * 1024 });
  route('/api/friends/invite', 'POST', async (c) => {
    const b = await body(c);
    return engine.createInvite({ ttlDays: Number(b.ttlDays) || 7, relayScopes: Array.isArray(b.relayScopes) ? b.relayScopes.map(x => str(x, 20)).filter(Boolean).slice(0, 4) : null });
  });
  route('/api/friends/invite/cancel', 'POST', async (c) => engine.cancelInvite(str((await body(c)).id, 20)));
  for (const act of ['approve', 'confirm', 'decline', 'mismatch', 'cancel', 'unblock']) {
    route(`/api/friends/${act}`, 'POST', async (c) => {
      const r = await engine[act](str((await body(c)).id, 20));
      return r && r.id ? { friend: r } : (r || {});
    });
  }
  route('/api/friends/remove', 'POST', async (c) => { const b = await body(c); return engine.remove(str(b.id, 20), { block: b.block === true }); });
  route('/api/friends/remove/undo', 'POST', async (c) => ({ friend: await engine.undoRemove(str((await body(c)).id, 20)) }));
  route('/api/friends/send', 'POST', async (c) => {
    const b = await body(c);
    refuseOwed(b.kind);
    const to = Array.isArray(b.to) ? b.to.map(x => str(x, 20)).filter(Boolean).slice(0, 64) : str(b.to, 20);
    return engine.send(b.to === '*' ? '*' : to, str(b.kind, 90) || '', b.body, { group: str(b.group, 64) || null, revoke: b.revoke === true });
  }, { maxBody: 64 * 1024 });
  route('/api/friends/publish', 'POST', async (c) => { const b = await body(c); refuseOwed(b.kind); return b.revoke === true ? engine.unpublish(str(b.kind, 90) || '') : engine.publish(str(b.kind, 90) || '', b.body); }, { maxBody: 48 * 1024 });
  route('/api/friends/presence', 'POST', async (c) => { await engine.setPresence(str((await body(c)).state, 20) || ''); return {}; }, { quiet: true });
  route('/api/friends/check', 'POST', async () => ({ got: await engine.check() }));
  // Identity rotation (FRIENDS.md section 15): start (or go on with) renewing my keys; answer a friend's relay ask.
  route('/api/friends/rotate', 'POST', async () => {
    const rotation = await engine.rotateIdentity();
    const sync = app.ctx.sync;
    if (sync && typeof sync.relayChanged === 'function') Promise.resolve().then(() => sync.relayChanged()).catch(() => {});
    return { rotation };
  });
  route('/api/friends/rotation', 'GET', async () => ({ rotation: await engine.rotation() }), { quiet: true });
  route('/api/friends/relay-ask', 'POST', async (c) => { const b = await body(c); return { friend: await engine.answerRelayAsk(str(b.id, 20), b.allow !== false) }; });
  app.route({ prefix: '/api/friends/', method: '*', handler: (c) => c.json(404, { error: 'unknown friends route' }) });
}

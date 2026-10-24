// server/routes/perms.mjs - what each friend can see (2.17), lib/friends/share.mjs. Owner: perms.
//
//   GET  /api/friends/perms/preview?friend=<id>   -> {ok, friend, today, stopped, scopes: [{scope, mode, on, reason?, data?, bodies?, bytes?, sent?}]}
//                                                    EXACTLY what that friend would get now (the sender's own builders)
//   GET  /api/friends/perms/audit                 -> {ok, sent: {friend: {scope: {live, op, mode, at, n, bytes, ackAt, ...}}}, events}
//                                                    the audit log: what went to whom and when (never the data)
//   POST /api/friends/perms/now     {friend?}     -> {ok, sent, failed}       send what changed now (Settings > Privacy)
//   GET  /api/friends/received                    -> {ok, friends: [{friend, scopes: {scope: {mode, at, got, until?, n?}}}]}
//   GET  /api/friends/received?friend=<id>        -> {ok, friend, scopes: {scope: {mode, at, got, until?, data}}}
//   POST /api/friends/received/forget {friend}    -> {ok}                     remove your copy of what they shared
//
// The choices themselves are state.friendPerms (the page saves them with the
// state; the pipeline reads them on every change). Received data is untrusted:
// it is validated again on every read and answered as data only.
// app.ctx.friendsShare = the pipeline; app.ctx.friendsData(friendId, scope?) for other server code.

import { HttpError } from '../http.mjs';
import { createSharePipeline, defineShareKinds, friendsData, friendsDataList, forgetReceived, validFriendId } from '../../lib/friends/share.mjs';

// The kinds are defined when the route files load, before the friends engine starts (FRIENDS.md section 9).
try { defineShareKinds(); } catch (e) { /* the engine reports kinds it does not know */ }

export default function register(app) {
  const { dataDir, store, log } = app.ctx;
  const pipe = createSharePipeline({
    dataDir, store, log,
    actions: app.ctx.actions || null,
    getConfig: () => (typeof app.ctx.getConfig === 'function' ? app.ctx.getConfig() : {}),
    friends: () => app.ctx.friends || null,
    isMain: async () => {
      const mc = app.ctx.mainComputer;
      if (!mc || typeof mc.status !== 'function') return true;
      try { const s = await mc.status(); return s.isMain !== false; } catch { return true; }
    },
    emit: (event, data) => { try { app.ctx.liveSync && app.ctx.liveSync.emit(event, data); } catch { /* no open tabs */ } },
  });
  app.ctx.friendsShare = pipe;
  app.ctx.friendsData = (friendId, scope = null) => friendsData(dataDir, friendId, scope);
  // The policy goes in as early as possible: the friends engine asks it before it sends anything.
  pipe.attach();
  app.onReady(() => {
    if (process.env.DASHBOARD_FRIENDS_SHARE === 'off') return;
    pipe.attach();
    pipe.start();
  });
  app.onClose?.(() => pipe.stop());

  const friendParam = (c) => {
    const id = c.query.get('friend');
    if (!validFriendId(id)) throw new HttpError(400, 'friend is required');
    return id;
  };
  app.route({
    path: '/api/friends/perms/preview', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => ({ ok: true, ...(await pipe.preview(friendParam(c))) }),
  });
  app.route({
    path: '/api/friends/perms/audit', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async () => ({ ok: true, ...(await pipe.audit()) }),
  });
  app.route({
    path: '/api/friends/perms/now', method: 'POST', maxBody: 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = (await c.body()) || {};
      const friend = b.friend == null ? null : String(b.friend);
      if (friend !== null && !validFriendId(friend)) throw new HttpError(400, 'friend is not valid');
      pipe.attach();
      return pipe.pass(friend ? { friend } : {});
    },
  });
  app.route({
    path: '/api/friends/received', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => {
      if (!c.query.has('friend')) return { ok: true, friends: await friendsDataList(dataDir) };
      const id = friendParam(c);
      const doc = await friendsData(dataDir, id);
      return { ok: true, friend: id, scopes: doc ? doc.scopes : {} };
    },
  });
  app.route({
    path: '/api/friends/received/forget', method: 'POST', maxBody: 1024, methodError: 'POST only',
    handler: async (c) => {
      const b = (await c.body()) || {};
      if (!validFriendId(b.friend)) throw new HttpError(400, 'friend is required');
      await forgetReceived(dataDir, b.friend);
      log('info', 'friends share: the user removed what a friend shared from this computer');
      return { ok: true };
    },
  });
}

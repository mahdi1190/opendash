// server/routes/profile.mjs - loads the profile rules so the friends kind 'profile' has its full schema
// (lib/profile-avatar.mjs calls defineKind at load; every route file loads before the friends engine starts:
// docs/dev/FRIENDS.md section 9). The profile itself is part of the state (state.profile, a synced UI key)
// and goes to friends through Friends.publish('profile', body) on the page.
//
// 2.18 (agent 'you'): friends' visits to your card, counts only (lib/profile-visits.mjs, which defines the
// kind 'profile:visit' at load). The page sends a visit with Friends.send (POST /api/friends/send) and reads
// the count here. The normal router's protections apply (127.0.0.1, Host check, same-origin on every /api/
// request). Open tabs hear `event: profile` {type: 'visit'} on /api/events when one is counted.
//
//   GET /api/profile/visits   -> {ok, total, week, today}   (numbers only: never who)

import '../../lib/profile-avatar.mjs';
import { createProfileVisits } from '../../lib/profile-visits.mjs';

export default function register(app) {
  const ctx = app && app.ctx ? app.ctx : {};
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  if (!app || typeof app.route !== 'function' || !root) return;
  const cfg = () => (typeof ctx.getConfig === 'function' && ctx.getConfig()) || {};
  const visits = createProfileVisits({
    dataDir: root,
    friends: () => (ctx.friends && typeof ctx.friends.on === 'function' ? ctx.friends : null),
    emit: (data) => { const sse = ctx.liveSync; if (sse && typeof sse.emit === 'function') sse.emit('profile', data); },
    zone: () => cfg().timezone || null,
    log: (lvl, msg) => { try { ctx.log?.(lvl, msg); } catch { /* no log */ } },
  });
  if (typeof app.onReady === 'function') app.onReady(async () => { visits.attach(); });
  app.route({
    path: '/api/profile/visits', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async () => { visits.attach(); return { ok: true, ...(await visits.view()) }; },
  });
}

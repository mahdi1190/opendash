// server/routes/relay.mjs - Settings > Your relay (lib/relay/deploy.mjs,
// docs/dev/RELAY_PROTOCOL.md).
//
//   GET  /api/relay                    {relay: the home relay of friends/relays.json, connect: {state, step, steps,
//                                      note, loginUrl, error, result}, mine, canConnect, sync, node: {min}}
//   GET  /api/relay/admin              the relay's members, devices, invites and usage (owner), or this person's role
//   POST /api/relay/connect            {accountId?, fresh?, checkOnly?, relogin?, adopt?}: Connect Cloudflare (wrangler
//                                      login + deploy), runs in the background; again when connected = update in place
//   POST /api/relay/cancel             stop it at once (kills wrangler's whole process tree)
//   POST /api/relay/members/revoke     {iid}       -> {undo}
//   POST /api/relay/members/restore    {iid}       (Undo)
//   POST /api/relay/members/scopes     {iid, scopes: ['message', 'sync'?]}
//   POST /api/relay/invites/cancel     {id}
//   POST /api/relay/devices/revoke     {cert}
//   POST /api/relay/disconnect         stop using it on every device (the Worker stays on Cloudflare) -> {undo}
//   POST /api/relay/reconnect          Undo of disconnect (within a minute)
//   POST /api/relay/use-invite         {invite}: use a friend's relay instead
//   POST /api/relay/sync               device sync may use the home relay (a friend's relay joined from Friends
//                                      is used for sync only after this choice)
//   POST /api/relay/local              {origin}: a relay on THIS computer (tools/relay-local.mjs) as your own;
//                                      registered only with OPENDASH_RELAY_ALLOW_LOCAL=1 (development, self-hosting)
//
// Nothing here returns wrangler's output, the Cloudflare sign-in or a key. connect.loginUrl
// (the Cloudflare sign-in page, checked: https://dash.cloudflare.com/oauth2/auth only) and
// connect.error.accounts (names and ids, to pick one) are read from it in memory for the
// one job (lib/relay/deploy.mjs).

import { createRelayService } from '../../lib/relay/deploy.mjs';
import { relayLocalAllowed } from '../../lib/relay/origin.mjs';
import { HttpError } from '../http.mjs';

export default function register(app) {
  const svc = app.ctx.relayService || (app.ctx.relayService = createRelayService(app.ctx));
  const wrap = (fn) => async (c) => {
    try { return await fn(c); }
    catch (e) { throw new HttpError(e.status || (e.code === 'network' ? 502 : 400), e.code ? e.message : 'The relay could not be reached. Try again.'); }
  };
  const body = (c) => c.body({ allowEmpty: true });
  app.route({ path: '/api/relay', method: 'GET', handler: wrap(() => svc.status()) });
  app.route({ path: '/api/relay/admin', method: 'GET', handler: wrap(() => svc.admin()) });
  app.route({ path: '/api/relay/connect', method: 'POST', handler: wrap(async (c) => {
    const b = await body(c);
    return svc.connect({
      accountId: typeof b.accountId === 'string' ? b.accountId.trim().toLowerCase() : null,
      fresh: b.fresh === true, checkOnly: b.checkOnly === true, relogin: b.relogin === true, adopt: b.adopt === true,
    });
  }) });
  app.route({ path: '/api/relay/cancel', method: 'POST', handler: wrap(() => svc.cancel()) });
  app.route({ path: '/api/relay/members/revoke', method: 'POST', handler: wrap(async (c) => { const b = await body(c); const r = await svc.memberRevoke(b.iid); return { ok: true, undo: b.iid, until: r.until || null }; }) });
  app.route({ path: '/api/relay/members/restore', method: 'POST', handler: wrap(async (c) => { const b = await body(c); await svc.memberRestore(b.iid); return { ok: true }; }) });
  app.route({ path: '/api/relay/members/scopes', method: 'POST', handler: wrap(async (c) => { const b = await body(c); await svc.memberScopes(b.iid, b.scopes); return { ok: true }; }) });
  app.route({ path: '/api/relay/groups/delete', method: 'POST', handler: wrap(async (c) => { const b = await body(c); await svc.groupDelete(b.gid); return { ok: true }; }) });
  app.route({ path: '/api/relay/invites/cancel', method: 'POST', handler: wrap(async (c) => { const b = await body(c); await svc.inviteCancel(b.id); return { ok: true }; }) });
  app.route({ path: '/api/relay/devices/revoke', method: 'POST', handler: wrap(async (c) => { const b = await body(c); await svc.certRevoke(b.cert); return { ok: true }; }) });
  app.route({ path: '/api/relay/disconnect', method: 'POST', handler: wrap(() => svc.disconnect()) });
  app.route({ path: '/api/relay/reconnect', method: 'POST', handler: wrap(() => svc.reconnect()) });
  app.route({ path: '/api/relay/use-invite', method: 'POST', handler: wrap(async (c) => { const b = await body(c); return svc.useInvite(b.invite); }) });
  app.route({ path: '/api/relay/sync', method: 'POST', handler: wrap(() => svc.useForSync()) });
  // Development and self-hosting only (RELAY_PROTOCOL.md section 12): nothing but the environment turns it on.
  if (relayLocalAllowed()) app.route({ path: '/api/relay/local', method: 'POST', handler: wrap(async (c) => { const b = await body(c); return svc.useLocal(typeof b.origin === 'string' ? b.origin.slice(0, 200) : ''); }) });
}

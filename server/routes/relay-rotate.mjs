// server/routes/relay-rotate.mjs - after a key renewal (docs/dev/FRIENDS.md section 15) the person's
// OWN relay is deployed again with OWNER_KEY = the new identity key, through the existing deploy
// path (lib/relay/deploy.mjs createRelayService().connect(): the same Worker name and address,
// and the job Settings > Your connection to friends shows, with its Cancel).
//
//   GET  /api/relay/rotate   -> {ok, state: 'idle'|'running'|'done'|'error'|'cancelled'|'elsewhere'|'not-needed', error?, at}
//   POST /api/relay/rotate   update the relay now (also on a computer that did not deploy it:
//                            Cloudflare may ask to sign in in the browser)
//
// It runs by itself only where that needs no surprise: the friends engine says this person's keys
// were renewed ('identity-rotated': here, or on another device whose renewal the keyring brought),
// this person OWNS their home relay, the relay does not know the new key as its owner yet, and THIS
// computer deployed the relay before (its device folder has deploy.json, so wrangler is signed in).
// Anywhere else the page offers "Update my connection". Until then the new key works on the relay as a
// member (the old key let it in), and the old key is still the owner: the page says so.
// Nothing here returns wrangler's output, the Cloudflare sign-in or a key.

import { createRelayService, relayDeployed } from '../../lib/relay/deploy.mjs';
import { homeRelay } from '../../lib/friends/store.mjs';

const WATCH_MS = 3000, WATCH_MAX_MS = 25 * 60 * 1000;

export default function register(app) {
  const ctx = app.ctx;
  const root = (ctx.paths && ctx.paths.root) || ctx.dataDir;
  const log = typeof ctx.log === 'function' ? ctx.log : () => {};
  // relay.mjs makes the service (route files load in name order: this one first), so it is looked up when needed.
  const svc = () => ctx.relayService || (ctx.relayService = createRelayService(ctx));
  let st = { state: 'idle', at: 0, error: null };
  let watch = null;
  const view = () => ({ ok: true, state: st.state, at: st.at, error: st.error });
  const friends = () => (ctx.friends && typeof ctx.friends.rotationCheck === 'function' ? ctx.friends : null);
  const told = () => { const f = friends(); if (f) f.rotationCheck().catch(() => {}); };

  /** Does the home relay still need the new owner key? (this person owns it, and it does not answer 'owner' to the new key) */
  async function needed() {
    const home = await homeRelay(root).catch(() => null);
    if (!home || home.role !== 'owner') return false;
    const f = ctx.friends;
    const role = f && typeof f.relayRole === 'function' ? await f.relayRole().catch(() => null) : null;
    return role !== 'owner';
  }
  function follow() {
    clearInterval(watch);
    const started = Date.now();
    watch = setInterval(async () => {
      let job = null;
      try { job = (await svc().status()).connect; } catch { job = null; }
      if (job && job.state === 'running' && Date.now() - started < WATCH_MAX_MS) return;
      clearInterval(watch); watch = null;
      if (job && job.state === 'done') { st = { state: 'done', at: Date.now(), error: null }; log('info', 'relay: deployed again with your new keys'); told(); }
      else if (job && job.state === 'cancelled') st = { state: 'cancelled', at: Date.now(), error: null };
      else {
        const e = job && job.error;
        st = { state: 'error', at: Date.now(), error: { message: e && e.message ? String(e.message).slice(0, 200) : 'Your connection to friends could not be updated.', next: e && e.next ? String(e.next).slice(0, 200) : 'Press Try again.' } };
        log('warn', `relay: not deployed again after the key renewal (${e && e.code ? e.code : 'error'})`);
      }
    }, WATCH_MS);
    if (watch.unref) watch.unref();
  }
  async function redeploy({ auto = false } = {}) {
    if (st.state === 'running') return view();
    if (!(await needed())) { st = { state: 'not-needed', at: Date.now(), error: null }; told(); return view(); }
    if (auto && !relayDeployed(root)) { st = { state: 'elsewhere', at: Date.now(), error: null }; return view(); }
    log('info', `relay: deploying it again with your new keys${auto ? ' (after the key renewal)' : ''}`);
    try { await svc().connect({}); }
    catch (e) { st = { state: 'error', at: Date.now(), error: { message: 'Your connection to friends could not be updated.', next: 'Press Try again.' } }; return view(); }
    st = { state: 'running', at: Date.now(), error: null };
    follow();
    return view();
  }

  app.onReady(async () => {
    const f = ctx.friends;
    if (!f || typeof f.onRotated !== 'function') return;
    f.onRotated((info) => { if (info && info.role === 'owner') redeploy({ auto: true }).catch(() => {}); });
    // A renewal that was waiting for the relay when OpenDash stopped: carry on.
    try { const r = await f.rotation(); if (r && r.step === 'owner') setTimeout(() => { redeploy({ auto: true }).catch(() => {}); }, 20000).unref?.(); } catch { /* no friends yet */ }
  });
  app.onClose?.(async () => { clearInterval(watch); });

  app.route({ path: '/api/relay/rotate', method: ['GET', 'POST'], methodError: 'GET or POST only', quiet: true,
    handler: async (c) => (c.method === 'POST' ? redeploy({ auto: false }) : view()) });
}

// lib/friends/live-room.mjs - this computer's socket to a relay's pass-through room (lib/relay/space-room.mjs,
// docs/dev/GARDEN_TOGETHER.md section 4). Node only. Carries sealed envelopes and nothing else.
//
// A relay origin can come from a friend, so the socket gets what every relay request gets: the origin check and
// the public-address check inside the socket's own DNS lookup (relay-client.mjs). It never reconnects by itself:
// the session decides that (lib/friends/live.mjs: the same room with the same ticket, or a knock for new ones).

import { connectWebSocket } from '../relay/node-ws.mjs';
import { signerFromPkcs8, answerChallenge, signRequest } from '../relay/auth.mjs';
import { isLocalRelayOrigin } from '../relay/origin.mjs';
import { ROOM } from '../relay/space-room.mjs';
import { guardedLookup, relayClockSkew } from './relay-client.mjs';
import { cleanOrigin } from './core.mjs';

const fail = (code, message) => Object.assign(new Error(message), { code });
const BATCH_MS = 12, BATCH_BYTES = 24 * 1024;
const QUIET_MS = 30000, ANSWER_MS = 9000, WATCH_MS = 5000;   // nothing heard for this long: a ping (answered by the relay without waking the room); no answer: the socket is dead, whatever TCP thinks (a closed lid, a changed network)
const IN_PER_SEC = 40;   // from one person: more than this is dropped here, before any key work

/**
 * openRoomLink({origin, identity | signer, id, auth: {host, nonce, ticket?, exp?}, onEnv(env, fromIid), onPeer(iid, on), onOver(iid), onClosed(code, why), onSent(n)})
 * -> Promise<{isOpen(), iid, sendGuest(env), sendTo(iid, env), kick(iid), unban(iid), check(), close()}>
 * The upgrade itself is signed (lib/relay/core.mjs roomGate). A visitor signs with a key made for the visit, so the relay never
 * sees who is visiting whom; the ticket names that key. A refusal carries `status` (429, 503) and `why` (the relay's word).
 * onClosed's why: 'closed', 'kick', 'budget', 'share', 'timeout', or 'dead' (no answer to a ping: this end gave up on the socket).
 */
export async function openRoomLink({ origin, identity, signer = null, id, auth, onEnv, onPeer = () => {}, onOver = () => {}, onClosed = () => {}, onSent = () => {}, timeoutMs = 8000 }) {
  const o = cleanOrigin(origin);
  if (!o) throw fail('BAD_RELAY', 'A relay must be an https address.');
  if (!/^[A-Za-z0-9_-]{43}$/.test(String(id || ''))) throw fail('BAD_REQUEST', 'bad room');
  const url = o.replace(/^http/, 'ws') + `/v1/rt/${id}/ws`;
  const sign = signer || await signerFromPkcs8(identity.ed.priv, identity.ed.pub);
  const pass = [auth.host, auth.nonce, auth.exp ?? '', auth.ticket ?? ''].join('.');
  const dial = async (skew) => connectWebSocket(url, { headers: { ...(await signRequest({ signer: sign, url, method: 'GET', now: Date.now() + skew })), 'X-OD-Room': pass }, maxMessage: 64 * 1024, timeoutMs, lookup: guardedLookup(isLocalRelayOrigin(o)) });
  let ws;
  try { ws = await dial(0); }
  catch (e) { if (!e || e.status !== 401) throw e; ws = await dial(await relayClockSkew(o)); }   // this computer's clock is off: the relay's says by how much
  let open = false, closed = false, ping = null, flushT = null, queue = [], queued = 0, refused = '', heardAt = Date.now(), askedAt = 0;
  const seen = new Map();
  const ask = () => { if (askedAt) return; askedAt = Date.now(); try { ws.send('ping'); } catch { /* closed */ } };
  const watch = () => {
    if (!open || closed) return;
    const t = Date.now();
    if (askedAt && t - askedAt > ANSWER_MS) { try { ws.close(1000); } catch { /* gone */ } finish(4000, 'dead'); return; }
    if (!askedAt && t - heardAt >= QUIET_MS) ask();
  };
  const finish = (code, why) => {
    if (closed) return;
    closed = true; open = false;
    clearInterval(ping); clearTimeout(flushT); queue = [];
    try { onClosed(code, why); } catch { /* fine */ }
  };
  const allow = (f) => {
    const s = Math.floor(Date.now() / 1000);
    let w = seen.get(f);
    if (!w || w.s !== s) { if (seen.size > 32) seen.clear(); w = { s, n: 0 }; seen.set(f, w); }
    return ++w.n <= IN_PER_SEC;
  };
  const link = {
    iid: null,
    isOpen: () => open && !closed,
    /** A guest's message to the host. */
    sendGuest(env) { if (!link.isOpen()) return false; ws.send(JSON.stringify({ t: 'to', env })); onSent(1); return true; },
    /** The host's message to one guest: gathered with the others of this moment into one message (what the relay's owner pays for). */
    sendTo(iid, env) {
      if (!link.isOpen()) return false;
      const size = JSON.stringify(env).length + 40;
      if (queue.length >= ROOM.batch || queued + size > BATCH_BYTES) flush();
      queue.push([iid, env]); queued += size;
      if (!flushT) { flushT = setTimeout(flush, BATCH_MS); if (flushT.unref) flushT.unref(); }
      return true;
    },
    kick(iid) { if (link.isOpen()) { flush(); ws.send(JSON.stringify({ t: 'kick', g: iid })); onSent(1); } },
    unban(iid) { if (link.isOpen()) { ws.send(JSON.stringify({ t: 'unban', g: iid })); onSent(1); } },
    /** Is it really still there? Asked now (after a long sleep, a long silence): no answer closes it. */
    check() { if (link.isOpen()) ask(); },
    close() { if (!closed) { flush(); try { ws.close(1000); } catch { /* gone */ } finish(1000, 'closed'); } },
  };
  function flush() {
    clearTimeout(flushT); flushT = null;
    if (!queue.length || !link.isOpen()) { queue = []; queued = 0; return; }
    const b = queue; queue = []; queued = 0;
    ws.send(JSON.stringify({ t: 'to', b }));
    onSent(1);
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { reject(fail('ETIMEDOUT', 'The room did not answer in time.')); try { ws.close(1000); } catch { /* gone */ } finish(1006, 'timeout'); }, timeoutMs);
    if (timer.unref) timer.unref();
    ws.on('close', (code) => { clearTimeout(timer); if (!open) reject(Object.assign(fail('ROOM_REFUSED', 'The room did not take us.'), { why: refused, ...(refused === 'rate_limit' ? { status: 429 } : refused === 'relay_busy' ? { status: 503 } : {}) })); finish(code, 'closed'); });
    ws.on('message', async (t) => {
      heardAt = Date.now(); askedAt = 0;
      if (typeof t !== 'string' || t === 'pong' || t.length > 64 * 1024) return;
      let m; try { m = JSON.parse(t); } catch { return; }
      if (!m || typeof m !== 'object') return;
      if (m.t === 'challenge' && typeof m.c === 'string' && m.c.length <= 64) {
        try { ws.send(JSON.stringify({ ...(await answerChallenge({ signer: sign, url, challenge: m.c })), host: auth.host, nonce: auth.nonce, ...(auth.ticket ? { ticket: auth.ticket, exp: auth.exp } : {}) })); } catch { /* closed */ }
      } else if (m.t === 'error' && !open) {
        refused = typeof m.error === 'string' ? m.error.slice(0, 32) : '';
      } else if (m.t === 'ready') {
        clearTimeout(timer);
        link.iid = typeof m.g === 'string' ? m.g : null;
        open = true;
        heardAt = Date.now();
        ping = setInterval(watch, WATCH_MS);
        if (ping.unref) ping.unref();
        resolve(link);
      } else if (m.t === 'fwd' && m.env && typeof m.env === 'object') {
        const f = typeof m.f === 'string' ? m.f.slice(0, 32) : 'h';
        if (allow(f)) { try { Promise.resolve(onEnv(m.env, f)).catch(() => {}); } catch { /* the engine counts it */ } }
      } else if (m.t === 'peer' && typeof m.g === 'string') {
        try { onPeer(m.g, m.on === true); } catch { /* fine */ }
      } else if (m.t === 'over' && typeof m.g === 'string') {
        try { onOver(m.g); } catch { /* fine */ }
      } else if (m.t === 'err' && (m.error === 'budget' || m.error === 'share')) {
        finish(4429, m.error);
      } else if (m.t === 'closed') {
        finish(4410, m.why === 'kick' ? 'kick' : 'closed');
      }
    });
  });
}

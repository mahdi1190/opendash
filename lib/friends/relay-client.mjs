// lib/friends/relay-client.mjs - the friends calls of a private OpenDash relay
// (docs/dev/RELAY_PROTOCOL.md section 7; docs/dev/FRIENDS.md section 3). Node only.
//
// Every request is signed with the person's identity key (Ed25519) through
// lib/relay/auth.mjs (signRequest, signerFromPkcs8, iidOf, dropId,
// answerChallenge): one implementation of the signing for the relay and its
// clients. It is loaded on first use, so a version without relay support says
// so plainly instead of failing to start.
//
// A relay origin can come from a friend (their card, an invite), so every
// connection is guarded: the shared origin check (lib/relay/origin.mjs: a public
// https origin; http://127.0.0.1:<port> or localhost:<port> only when the process
// has OPENDASH_RELAY_ALLOW_LOCAL=1), the host must resolve to a PUBLIC address
// (checked in the socket's own DNS lookup, so a name that points inside this
// network is refused: no requests into the local network from the server), no
// redirects, 10-second timeouts, answers capped at 2 MB. Bodies carry only
// sealed envelopes, directory blobs, ids and tokens: no names, no emails.

import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns';
import { classifyAddress } from '../sync/live/addrbook.mjs';
import { cleanOrigin, isMbox, isToken, cleanEnvelope, RELAY_SCOPES } from './core.mjs';
import { isLocalRelayOrigin } from '../relay/origin.mjs';

let authMod = null;
async function loadAuth() {
  if (authMod !== null) return authMod;
  try { authMod = await import('../relay/auth.mjs'); } catch { authMod = false; }
  return authMod;
}
let wsMod = null;
async function loadWs() {
  if (wsMod !== null) return wsMod;
  try { wsMod = await import('../relay/node-ws.mjs'); } catch { wsMod = false; }
  return wsMod;
}
/** A text WebSocket: lib/relay/node-ws.mjs (any Node), else the global one (Node 22+) -> {send, close, onMessage, onClose} | null. */
async function openSocket(url, lookup) {
  const W = await loadWs();
  if (W && typeof W.connectWebSocket === 'function') {
    // The same guard as every other call: a group's link comes from strangers, and a name can be changed to point inside this network.
    const ws = await W.connectWebSocket(url, { maxMessage: 256 * 1024, lookup });
    return { send: (t) => ws.send(t), close: () => { try { ws.close(1000); } catch { /* closed */ } }, onMessage: (fn) => ws.on('message', (m) => fn(typeof m === 'string' ? m : '')), onClose: (fn) => ws.on('close', () => fn()) };
  }
  const G = globalThis.WebSocket;
  if (typeof G !== 'function') return null;
  return new Promise((resolve, reject) => {
    const ws = new G(url);
    const msgFns = [], closeFns = [];
    ws.onopen = () => resolve({ send: (t) => ws.send(t), close: () => { try { ws.close(); } catch { /* closed */ } }, onMessage: (fn) => msgFns.push(fn), onClose: (fn) => closeFns.push(fn) });
    ws.onmessage = (ev) => { const t = typeof ev.data === 'string' ? ev.data : ''; for (const f of msgFns) f(t); };
    ws.onclose = () => { for (const f of closeFns) f(); reject(new Error('closed')); };
    ws.onerror = () => { /* onclose follows */ };
  });
}
/** Is relay support part of this version (lib/relay/auth.mjs present)? */
export async function relaySupport() { return !!(await loadAuth()); }

const MAX_ANSWER = 2 * 1024 * 1024;
const TIMEOUT_MS = 10000;
const SEG_RE = /^[A-Za-z0-9._~-]{1,128}$/;
const fail = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra });

/** A DNS lookup that refuses anything but public addresses (a local relay origin: this computer only). */
export function guardedLookup(local) {
  const ok = (a) => (local ? classifyAddress(a) === 'loopback' : classifyAddress(a) === 'global');
  return (host, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    const o = typeof opts === 'number' ? { family: opts } : { ...(opts || {}) };
    dns.lookup(host, { ...o, all: true }, (err, list) => {
      if (err) return cb(err);
      const good = (list || []).filter(x => ok(x.address));
      if (!good.length) return cb(fail('ENOTPUBLIC', 'That relay is not on the public internet.'));
      if (o.all) return cb(null, good);
      return cb(null, good[0].address, good[0].family);
    });
  };
}

function rawRequest({ url, method, headers, body, local }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    if (!isHttps && !(local && u.protocol === 'http:')) return reject(fail('BAD_RELAY', 'A relay must be an https address.'));
    const data = body == null ? null : Buffer.from(body, 'utf8');
    const req = (isHttps ? https : http).request({
      hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, method,
      headers: { ...headers, Accept: 'application/json', ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : { 'Content-Length': 0 }) },
      lookup: guardedLookup(local), timeout: TIMEOUT_MS, agent: false,
    }, (res) => {
      const chunks = []; let size = 0;
      res.on('data', (c) => { size += c.length; if (size > MAX_ANSWER) { req.destroy(fail('TOO_BIG', 'The relay answered with too much data.')); return; } chunks.push(c); });
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(fail('ETIMEDOUT', 'The relay did not answer in time.')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
const parse = (t) => { try { const v = JSON.parse(t); return v && typeof v === 'object' ? v : null; } catch { return null; } };

/**
 * Does this relay have the pass-through rooms (docs/dev/GARDEN_TOGETHER.md section 4)? An unsigned look at its health,
 * through the same guards as everything else. -> true | false (older); throws when it cannot be reached.
 */
export async function relayHasRooms(origin) {
  const o = cleanOrigin(origin);
  if (!o) throw fail('BAD_RELAY', 'A relay must be an https address.');
  const r = await rawRequest({ url: o + '/v1/health', method: 'GET', headers: {}, body: null, local: isLocalRelayOrigin(o) });
  const j = parse(r.text) || {};
  return r.status === 200 && j.rt === 1;
}

/** How far the relay's clock is from this computer's, in ms (a room's signed upgrade, when this computer's clock is off). */
export async function relayClockSkew(origin) {
  const o = cleanOrigin(origin);
  if (!o) throw fail('BAD_RELAY', 'A relay must be an https address.');
  const r = await rawRequest({ url: o + '/v1/health', method: 'GET', headers: {}, body: null, local: isLocalRelayOrigin(o) });
  const j = parse(r.text) || {};
  return Number.isFinite(j.now) ? j.now - Date.now() : 0;
}

/** A plain sentence for a relay error (for the page; never the relay's own text verbatim beyond a short message). */
export function relayErrorText(e) {
  const code = e && (e.relayError || e.code);
  if (code === 'RELAY_UNAVAILABLE') return 'Relay support is not part of this version of OpenDash yet.';
  if (code === 'not_member') return "That relay is private, and you're not a member of it. Ask its owner for an invite.";
  if (code === 'scope') return "Your access to that relay doesn't include friends.";
  if (code === 'gone') return 'That invite or link has already been used, or it has expired.';
  if (code === 'forbidden') return "That relay didn't accept the message. They may have removed this friendship.";
  if (code === 'rate_limit' && e.retryAfter > 1800) return "Today's share of that relay is used up. Messages wait and go after midnight UTC.";
  if (code === 'rate_limit') return 'The relay asked us to slow down. It will try again shortly.';
  if (code === 'relay_busy') return 'The relay is resting until midnight UTC (its free-tier limit). Messages wait and go later.';
  if (code === 'quota') return 'The mailbox on that relay is full. Messages wait and go later.';
  if (code === 'ENOTPUBLIC' || code === 'BAD_RELAY') return "That relay address can't be used (it must be a public https address).";
  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ECONNRESET' || code === 'EAI_AGAIN') return "The relay can't be reached right now. Messages wait and go when it's back.";
  return "Something went wrong talking to the relay. It will try again.";
}

/**
 * A client for one relay origin, acting as `identity` (lib/friends/core.mjs format).
 * Every method returns the relay's JSON answer or throws {code, status, relayError, retryAfter}.
 */
export function createRelayClient({ origin, identity }) {
  const o = cleanOrigin(origin);
  if (!o) throw fail('BAD_RELAY', 'A relay must be an https address.');
  const local = isLocalRelayOrigin(o);       // only with OPENDASH_RELAY_ALLOW_LOCAL=1 (lib/relay/origin.mjs)
  let skew = 0;
  let signer = null;
  const seg = (s) => { if (!SEG_RE.test(String(s || ''))) throw fail('BAD_REQUEST', 'bad relay path'); return s; };

  async function call(method, path, { body = null, query = '', drop = null } = {}) {
    const A = await loadAuth();
    if (!A) throw fail('RELAY_UNAVAILABLE', 'Relay support is not part of this version yet.');
    if (!signer) signer = await A.signerFromPkcs8(identity.ed.priv, identity.ed.pub);
    const url = o + path + (query ? `?${query}` : '');
    const text = body == null ? null : JSON.stringify(body);
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers = await A.signRequest({ signer, url, method, body: text, now: Date.now() + skew });
      if (drop) { if (!isToken(drop)) throw fail('BAD_REQUEST', 'bad drop token'); headers['X-OD-Drop'] = drop; }
      const r = await rawRequest({ url, method, headers, body: text, local });
      const now = Number(r.headers['x-od-now']);
      if (Number.isFinite(now) && now > 1e12) skew = now - Date.now();
      const j = parse(r.text) || {};
      if (r.status === 401 && attempt === 0 && (j.error === 'clock' || j.error === 'replay')) continue;
      if (r.status >= 400 || r.status < 200) {
        const ra = Number(r.headers['retry-after']);
        throw fail(`RELAY_${r.status}`, typeof j.message === 'string' ? j.message.slice(0, 200) : `relay error ${r.status}`, { status: r.status, relayError: typeof j.error === 'string' ? j.error.slice(0, 40) : null, retryAfter: Number.isFinite(ra) ? ra : null });
      }
      return j;
    }
    throw fail('RELAY_CLOCK', 'The relay refused the time twice.');
  }

  const cleanScopes = (s) => (Array.isArray(s) ? s : []).map(x => (x === 'friend-mailbox' ? 'message' : x === 'device-sync' ? 'sync' : x)).filter(x => RELAY_SCOPES.includes(x));
  return {
    origin: o,
    /** Join with an invite's one-time relay token -> {scopes, mbox, exp}. No role: the relay's claim is not trusted (always a member). */
    async redeem(token) {
      if (!isToken(token)) throw fail('BAD_REQUEST', 'bad invite token');
      const j = await call('POST', '/v1/invites/redeem', { body: { token } });
      // pending: what the invite allows once the owner approves the friend request (until then: message only)
      return { scopes: cleanScopes(j.scopes), mbox: isMbox(j.mbox) ? j.mbox : null, exp: Number.isFinite(j.exp) ? j.exp : null, pending: j.pending && typeof j.pending === 'object' ? cleanScopes(j.pending.scopes) : null };
    },
    async me() { const j = await call('GET', '/v1/me'); return { role: j.role === 'owner' ? 'owner' : 'member', scopes: cleanScopes(j.scopes), liveCodes: j.liveCodes === 1, groups: j.groups === 1, canStartGroups: j.canStartGroups === 1 }; },
    /** What this relay says it is: {groups: 1} when it runs groups at all. No signature needed. */
    async health() {
      const r = await rawRequest({ url: `${o}/v1/health`, method: 'GET', headers: {}, body: null, local });
      const j = parse(r.text) || {};
      return { groups: r.status === 200 && j.groups === 1 ? 1 : 0 };
    },
    /** A group on this relay (docs/dev/GROUPS.md, RELAY_PROTOCOL.md section 13): one signed call. */
    async rg(method, gid, rest = '', { body = null, query = '' } = {}) {
      if (!/^[A-Za-z0-9_-]{22}$/.test(gid || '') || !/^(\/[A-Za-z0-9._~-]+)*$/.test(rest)) throw fail('BAD_REQUEST', 'bad group path');
      return call(method, `/v1/rg/${gid}${rest}`, { body, query });
    },
    /** A group's 4-letter code, looked up by its hash -> {gid, blob} | null (members of this relay only). */
    async groupCode(key) {
      if (!/^[0-9a-f]{64}$/.test(key)) return null;
      try { const j = await call('GET', `/v1/gcodes/${key}`); return typeof j.gid === 'string' && j.blob && typeof j.blob === 'object' ? { gid: j.gid, blob: j.blob } : null; }
      catch (e) { if (e.status === 404) return null; throw e; }
    },
    /** Owner only: a one-time relay access token for an invite -> {id, token, exp}. */
    async mintInvite({ scopes = ['message'], ttlMs = null } = {}) {
      const j = await call('POST', '/v1/admin/invites', { body: { scopes: cleanScopes(scopes), ...(ttlMs ? { ttlMs } : {}) } });
      if (!isToken(j.token)) throw fail('RELAY_BAD_ANSWER', 'The relay did not give an invite token.');
      return { id: typeof j.id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(j.id) ? j.id : null, token: j.token, exp: Number.isFinite(j.exp) ? j.exp : null };
    },
    /** Owner only: an open invite's one-time token deleted (already used or gone: fine). */
    async revokeInvite(id) {
      if (!/^[A-Za-z0-9_-]{11}$/.test(String(id || ''))) return false;
      await call('DELETE', `/v1/admin/invites/${seg(id)}`);
      return true;
    },
    /** Owner only: open invite ids and the members' {key, via, revoked} (to close what an invite let in). */
    async grants() {
      const j = await call('GET', '/v1/admin');
      const invites = (Array.isArray(j.invites) ? j.invites : []).map(x => (x && typeof x.id === 'string' ? x.id : null)).filter(id => /^[A-Za-z0-9_-]{11}$/.test(id || ''));
      const members = (Array.isArray(j.members) ? j.members : []).filter(x => x && typeof x.key === 'string').map(x => ({ key: x.key, via: typeof x.via === 'string' ? x.via.slice(0, 40) : null, revoked: !!x.revoked, pending: !!x.pending, exp: Number.isFinite(x.exp) ? x.exp : null }));
      return { invites, members };
    },
    /** Owner only: take a member's access back (404 when they never joined: fine). */
    async revokeMember(edPub) {
      const A = await loadAuth();
      if (!A) throw fail('RELAY_UNAVAILABLE', 'Relay support is not part of this version yet.');
      // keepGroups: a friendship or an invite ended; the groups they are in here are another matter (a relay before groups ignores it)
      try { await call('DELETE', `/v1/admin/members/${seg(await A.iidOf(edPub))}`, { query: 'keepGroups=1' }); return true; }
      catch (e) { if (e.status === 404) return false; throw e; }
    },
    /**
     * Owner only: let an identity key in (or change its grant) -> true. Used by identity
     * rotation (FRIENDS.md section 15): the new key of the owner before the relay is
     * redeployed, or a friend's new key when the owner presses "Let them keep using it".
     */
    async addMember(edPub, { scopes = ['message'], quota = null } = {}) {
      const A = await loadAuth();
      if (!A) throw fail('RELAY_UNAVAILABLE', 'Relay support is not part of this version yet.');
      const body = { key: edPub, scopes: cleanScopes(scopes).length ? cleanScopes(scopes) : ['message'] };
      if (Number.isFinite(quota) && quota > 0) body.quota = quota;
      await call('PUT', `/v1/admin/members/${seg(await A.iidOf(edPub))}`, { body });
      return true;
    },
    /** Owner only: the friend request of someone an invite let in was approved: what the invite allowed applies (false: not a member). */
    async confirmMember(edPub) {
      const A = await loadAuth();
      if (!A) throw fail('RELAY_UNAVAILABLE', 'Relay support is not part of this version yet.');
      try { await call('PUT', `/v1/admin/members/${seg(await A.iidOf(edPub))}`, { body: { key: edPub, pending: false } }); return true; }
      catch (e) { if (e.status === 404) return false; throw e; }
    },
    /** Owner only: when a member's access runs out by itself (ms; renewed for active friends). */
    async memberExpiry(edPub, exp) {
      const A = await loadAuth();
      if (!A) throw fail('RELAY_UNAVAILABLE', 'Relay support is not part of this version yet.');
      try { await call('PUT', `/v1/admin/members/${seg(await A.iidOf(edPub))}`, { body: { exp } }); return true; }
      catch (e) { if (e.status === 404) return false; throw e; }
    },
    /** Owner only: one member's grant by their identity key -> {scopes, quota, revoked} | null. */
    async memberOf(edPub) {
      const j = await call('GET', '/v1/admin');
      const m = (Array.isArray(j.members) ? j.members : []).find(x => x && x.key === edPub);
      return m ? { scopes: cleanScopes(m.scopes), quota: Number.isFinite(m.quota) ? m.quota : null, revoked: !!m.revoked } : null;
    },
    async mailbox() { const j = await call('GET', '/v1/mailbox'); if (!isMbox(j.mbox)) throw fail('RELAY_BAD_ANSWER', 'The relay did not give a mailbox.'); return { mbox: j.mbox }; },
    async mintDrop(mbox, { ttlMs = null } = {}) {
      const j = await call('POST', `/v1/mb/${seg(mbox)}/drops`, { body: ttlMs ? { ttlMs } : {} });
      if (!isToken(j.token)) throw fail('RELAY_BAD_ANSWER', 'The relay did not give a drop token.');
      return { token: j.token, exp: Number.isFinite(j.exp) ? j.exp : null };
    },
    async revokeDrop(mbox, drop) {
      const A = await loadAuth();
      if (!A) throw fail('RELAY_UNAVAILABLE', 'Relay support is not part of this version yet.');
      try { await call('DELETE', `/v1/mb/${seg(mbox)}/drops/${seg(await A.dropId(drop))}`); return true; }
      catch (e) { if (e.status === 404 || e.status === 410) return false; throw e; }
    },
    /** Store-and-forward into someone's mailbox (their drop token). */
    async post(mbox, drop, env) {
      const e = cleanEnvelope(env);
      if (!e) throw fail('BAD_REQUEST', 'not an envelope');
      return call('POST', `/v1/mb/${seg(mbox)}/post`, { body: { env: e }, drop });
    },
    /** Read my mailbox -> {items: [{rid, env, at}], cursor, more}. */
    async pull(mbox, after = 0, limit = 100) {
      const a = Number.isFinite(Number(after)) ? Math.max(0, Math.floor(Number(after))) : 0;
      const j = await call('GET', `/v1/mb/${seg(mbox)}/items`, { query: `after=${a}&limit=${Math.max(1, Math.min(200, limit | 0))}` });
      const items = (Array.isArray(j.items) ? j.items : []).slice(0, 500).filter(x => x && typeof x.rid === 'string' && x.rid.length <= 64).map(x => ({ rid: x.rid, env: x.env, at: Number(x.at) || 0 }));
      return { items, cursor: Number.isFinite(Number(j.cursor)) ? Number(j.cursor) : a, more: j.more === true };
    },
    async ack(mbox, rids) {
      const list = (rids || []).filter(r => typeof r === 'string' && r.length <= 64).slice(0, 500);
      if (!list.length) return null;
      return call('POST', `/v1/mb/${seg(mbox)}/ack`, { body: { rids: list } });
    },
    /** live (2.20.1): {exp, once} for a live friend code (a relay from before 2.20.1 ignores both). */
    async publish(key, blob, live = null) {
      if (!/^[0-9a-f]{64}$/.test(key)) throw fail('BAD_REQUEST', 'bad directory key');
      return call('PUT', `/v1/codes/${key}`, { body: { blob, ...(live && Number.isFinite(live.exp) ? { exp: live.exp, once: live.once === true } : {}) } });
    },
    async unpublish(key) {
      if (!/^[0-9a-f]{64}$/.test(key)) return false;
      try { await call('DELETE', `/v1/codes/${key}`); return true; } catch (e) { if (e.status === 404) return false; throw e; }
    },
    /**
     * Short invite links (RELAY_PROTOCOL.md 7.8): an invite kept sealed under a hash of its token.
     * put/del by the inviter (a member); get by anyone holding the link -> {blob, exp} | null
     * (unknown, used up or expired). A relay from before 7.8 answers 404 to put: callers fall back
     * to the long invite.
     */
    async invPut(key, blob, exp) {
      if (!/^[0-9a-f]{64}$/.test(key)) throw fail('BAD_REQUEST', 'bad invite key');
      return call('PUT', `/v1/inv/${key}`, { body: { blob, ...(Number.isFinite(exp) ? { exp } : {}) } });
    },
    async invGet(key) {
      if (!/^[0-9a-f]{64}$/.test(key)) return null;
      try {
        const j = await call('GET', `/v1/inv/${key}`);
        return j.blob && typeof j.blob === 'object' ? { blob: j.blob, exp: Number.isFinite(j.exp) ? j.exp : null } : null;
      } catch (e) { if (e.status === 404 || e.status === 410) return null; throw e; }
    },
    async invDel(key) {
      if (!/^[0-9a-f]{64}$/.test(key)) return false;
      try { await call('DELETE', `/v1/inv/${key}`); return true; } catch (e) { if (e.status === 404) return false; throw e; }
    },
    async lookup(key) {
      if (!/^[0-9a-f]{64}$/.test(key)) return null;
      try { const j = await call('GET', `/v1/codes/${key}`); return j.blob && typeof j.blob === 'object' ? j.blob : null; }
      catch (e) { if (e.status === 404) return null; throw e; }
    },
    /**
     * Live push of my mailbox (WebSocket, section 7.7) through lib/relay/node-ws.mjs
     * (or Node's own WebSocket). onItem({rid, env, at}); onState('live'|'down').
     * Only ever opened to the person's OWN relays. -> stop()
     */
    listen(mbox, { onItem, onState = () => {} }) {
      if (!isMbox(mbox)) return null;
      return socket(`/v1/mb/${mbox}/ws`, { onState, onMsg: (m) => { if (m.t === 'item' && typeof m.rid === 'string' && m.rid.length <= 64) { try { onItem({ rid: m.rid, env: m.env, at: Number(m.at) || 0 }); } catch { /* the handler's own problem */ } } } });
    },
    /** A group's live push: onMsg({t: 'chg', s, ...}); onState('live'|'down'). -> stop() */
    listenGroup(gid, { onMsg, onState = () => {} }) {
      if (!/^[A-Za-z0-9_-]{22}$/.test(gid || '')) return null;
      return socket(`/v1/rg/${gid}/ws`, { onState, onMsg: (m) => { try { onMsg(m); } catch { /* the handler's own problem */ } } });
    },
  };
  function socket(path, { onMsg, onState }) {
      const wsUrl = o.replace(/^http/, 'ws') + path;
      let ws = null, stopped = false, wait = 5000, ping = null, timer = null, heardAt = 0, askedAt = 0, upAt = 0;
      const later = () => { if (stopped) return; clearTimeout(timer); timer = setTimeout(open, wait); if (timer.unref) timer.unref(); wait = Math.min(30 * 60 * 1000, wait * 2); };
      const onText = async (t) => {
        heardAt = Date.now(); askedAt = 0;
        if (!t || t.length > 200 * 1024 || t === 'pong') return;
        const m = parse(t);
        if (!m) return;
        if (m.t === 'challenge' && typeof m.c === 'string' && m.c.length <= 64) {
          const A = await loadAuth();
          if (!A) { if (ws) ws.close(); return; }
          if (!signer) signer = await A.signerFromPkcs8(identity.ed.priv, identity.ed.pub);
          try { ws.send(JSON.stringify(await A.answerChallenge({ signer, url: wsUrl, challenge: m.c }))); } catch { /* closed */ }
        } else if (m.t === 'ready') { upAt = Date.now(); onState('live'); }
        else onMsg(m);
      };
      async function open() {
        if (stopped) return;
        try { ws = await openSocket(wsUrl, guardedLookup(local)); } catch { ws = null; }
        if (!ws) { onState('down'); return later(); }
        if (stopped) { ws.close(); return; }
        ws.onMessage((t) => { onText(t); });
        // (only a socket that stayed up starts the waiting again: one the relay takes and closes at once, time after time, must not be redialled every 5 seconds for ever)
        const me = ws;
        ws.onClose(() => { if (ws !== me) return; clearInterval(ping); if (upAt && Date.now() - upAt >= 60000) wait = 5000; upAt = 0; onState('down'); later(); });
        heardAt = Date.now(); askedAt = 0;
        // A ping nothing answered: this socket is dead, whatever TCP thinks (a closed lid, a changed network). It is closed, so 'live' never means a push that cannot come.
        ping = setInterval(() => {
          if (askedAt && Date.now() - askedAt > 15000) { const dead = ws; clearInterval(ping); ws = null; try { dead.close(); } catch { /* gone */ } if (upAt && Date.now() - upAt >= 60000) wait = 5000; upAt = 0; onState('down'); later(); return; }
          askedAt = Date.now();
          try { ws.send('ping'); } catch { /* closed */ }
        }, 50000);
        if (ping.unref) ping.unref();
      }
      open();
      return () => { stopped = true; clearTimeout(timer); clearInterval(ping); if (ws) ws.close(); };
  }
}

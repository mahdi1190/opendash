// lib/sync/relay-node.mjs - the Node side of sync through your relay
// (lib/sync/relay.mjs): where the relay is, this computer's device key and
// certificate, the friends identity in the pairing payload, and the adapter
// for lib/sync/node-host.mjs.
//
// WHERE THE RELAY IS. Nothing is built in (RELAY_PROTOCOL.md section 1). The
// person's home relay is <data>/friends/relays.json (lib/friends store.mjs
// setRelay(..., {home: true}); synced end-to-end encrypted, so every one of
// their devices sees the same one): usable for sync when this person owns it,
// or was given the 'sync' scope AND chose it for sync in Settings > Your relay
// (its record's sync: true). Only the home relay, never another one by itself.
// OPENDASH_PERSONAL_RELAY_ORIGIN overrides it for
// sync only (operators and development; not OPENDASH_RELAY_ORIGIN, which is the
// hosted Claude MCP relay's: lib/hosted-relay.mjs). A new computer that joins
// with a link uses the link's origin until relays.json arrives. Every origin
// passes the shared check (lib/relay/origin.mjs: public https; a local relay
// only with OPENDASH_RELAY_ALLOW_LOCAL=1), and a name that resolves inside this
// network is refused (lib/relay/public.mjs).
//
// WHO MAY USE IT. Requests are signed with this computer's own Ed25519 device
// key (secret store 'sync-relay-device', made here) and a certificate from the
// person's identity (secret store 'friends-identity', lib/friends; RELAY_PROTOCOL.md
// 2.1). The identity reaches a new computer inside the encrypted pairing
// payload, whichever way it joins (join code, 6-digit pairing, QR offer,
// recovery code, and the members' keys.json rewraps: lib/sync/e2e.mjs
// registerKeyringExtra, registered by lib/friends/store.mjs as 'friends'). A
// computer without it yet cannot use the relay; a code from one that has it
// brings it at once. Keys and certificates are
// never logged and never returned by a route.

import { existsSync, mkdirSync, promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { createFolderAdapter, syncRootFor, deviceDir, isSyncFileName, BLOB_DIR, LOG_RE } from './folder.mjs';
import { createRelayAdapter } from './relay.mjs';
import { createRelayClient, cleanOrigin, makeCert, checkCert, newEdKeys, signerFrom } from './relay-client.mjs';
import { publicRelay } from '../relay/public.mjs';
import { unb64u, utf8, sha256, concat, hex } from './e2e-crypto.mjs';
import { atomicWrite } from '../fsutil.mjs';

export const RELAYS_REL = 'friends/relays.json';
export const DEVICE_KEY = 'sync-relay-device';
export const IDENTITY_KEY = 'friends-identity';
const CERT_DAYS = 365, RENEW_DAYS = 30, DAY = 86400000;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// ─── The friends identity ──────────────────────────────────────────────────
// Shape (docs/dev/FRIENDS.md section 2): secret store 'friends-identity' =
// {v:1, current: identity, others: [identity...]}, identity = {v:1, id,
// x:{pub, priv}, ed:{pub, priv}, createdAt}. lib/friends/store.mjs makes it and
// registers it as the 'friends' keyring extra (lib/sync/e2e.mjs), so every way of
// pairing brings it to a new computer. Here it is only read, to certify this
// computer's device key.
async function friendIdOf(xPub, edPub) {
  const x = unb64u(xPub || ''), e = unb64u(edPub || '');
  if (!x || x.length !== 32 || !e || e.length !== 32) return null;
  return hex((await sha256(concat(utf8('opendash-friend-v1\n'), x, e))).subarray(0, 8));
}
const b64len = (s, n) => typeof s === 'string' && (unb64u(s) || { length: -1 }).length === n;
async function cleanIdentity(i) {
  if (!isObj(i) || !isObj(i.x) || !isObj(i.ed)) return null;
  if (!b64len(i.x.pub, 32) || !b64len(i.ed.pub, 32) || !b64len(i.x.priv, 48) || !b64len(i.ed.priv, 48)) return null;
  if (!/^[0-9a-f]{16}$/.test(i.id || '') || (await friendIdOf(i.x.pub, i.ed.pub)) !== i.id) return null;
  return { v: 1, id: i.id, x: { pub: i.x.pub, priv: i.x.priv }, ed: { pub: i.ed.pub, priv: i.ed.priv }, createdAt: Number.isFinite(i.createdAt) && i.createdAt > 0 ? i.createdAt : 0 };
}
/** The identities this computer holds, the person's chosen one first. */
async function identities(rec) {
  const list = [];
  if (isObj(rec)) for (const i of [rec.current, ...(Array.isArray(rec.others) ? rec.others : [])]) { const c = await cleanIdentity(i); if (c && !list.some(x => x.id === c.id)) list.push(c); }
  return list;
}

// ─── Where the relay is ────────────────────────────────────────────────────
/**
 * The relay for device sync: {origin, source: 'env'|'friends', role, scopes, usable}
 * or null. Only the home relay; usable: this person may sync through it (owner, or
 * a member relay with the 'sync' scope that they chose for sync).
 */
export async function readRelayInfo(dataDir, { env = process.env } = {}) {
  // A name that points inside this network is never used (it may have come from a friend's invite).
  const reachable = async (info) => (info && (await publicRelay(info.origin)) === 'private' ? { ...info, usable: false, private: true } : info);
  if (env.OPENDASH_PERSONAL_RELAY_ORIGIN) {
    const o = cleanOrigin(env.OPENDASH_PERSONAL_RELAY_ORIGIN);
    if (o) return reachable({ origin: o, source: 'env', role: 'owner', scopes: ['message', 'sync'], usable: true });
  }
  let rec = null;
  try {
    const t = await fsp.readFile(join(dataDir, ...RELAYS_REL.split('/')), 'utf8');
    rec = JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);
  } catch { rec = null; }
  if (!isObj(rec) || !isObj(rec.relays)) return null;
  const pick = (r) => {
    if (!isObj(r)) return null;
    const origin = cleanOrigin(r.origin);
    if (!origin) return null;
    const scopes = Array.isArray(r.scopes) ? r.scopes.filter(x => typeof x === 'string').slice(0, 8) : [];
    const role = r.role === 'owner' ? 'owner' : 'member';
    // A member relay (a friend's) carries device sync only when the person chose it for that (r.sync, set by
    // Settings > Your relay), not because its owner's invite granted 'sync'.
    return { origin, source: 'friends', role, scopes, usable: role === 'owner' || (r.sync === true && (scopes.includes('sync') || scopes.includes('device-sync'))) };
  };
  // syncAll: the person's choice to sync ALL their devices through it (`sync`: {on, at}, synced), or null.
  const syncAll = isObj(rec.sync) && typeof rec.sync.on === 'boolean' ? rec.sync.on : null;
  const withChoice = (x) => (x ? { ...x, syncAll } : x);
  // The home relay only (2.17.1): device sync never moves to another relay by itself. With no home relay
  // (disconnected), sync stays on the folder and the network until the person chooses one.
  return typeof rec.home === 'string' ? withChoice(await reachable(pick(rec.relays[rec.home]))) : null;
}

// ─── This computer's device key and certificate ────────────────────────────
/**
 * createRelayAuth({secrets, now}) -> {signer(): {key, cert, sign} | null, status(), reset()}
 * The certificate comes from the identity this computer holds (the earliest
 * one that the relay accepts: rotate() moves to the next after a refusal).
 */
export function createRelayAuth({ secrets, now = () => Date.now(), log = () => {} }) {
  let cache = null, tryIndex = 0, why = null, oldDenied = false;
  async function load() {
    const rec = await secrets.get(IDENTITY_KEY).catch(() => null);
    const list = await identities(rec);
    if (!list.length) { why = 'no-identity'; return null; }
    let d = await secrets.get(DEVICE_KEY).catch(() => null);
    if (!isObj(d) || !b64len(d.priv, 48) || !b64len(d.pub, 32)) {
      const k = await newEdKeys();
      d = { v: 1, priv: k.priv, pub: k.pub, cert: null, certBy: null, certExp: 0 };
      await secrets.set(DEVICE_KEY, d);
    }
    // Just after a renewal of the person's keys (FRIENDS.md section 15): the certificate the now RETIRED
    // identity made stays in use while the relay still accepts it, so the new keys reach the person's other
    // devices through the sync group they can all still read. Nothing new is ever signed with a retired key:
    // once the relay says "not a member" (it trusts only the new key), the certificate is made again with
    // the current identity and the group moves to it on enrolment (RELAY_PROTOCOL.md 5.1).
    const retiredHere = isObj(rec) && Array.isArray(rec.retiredKeys) && rec.retiredKeys.some(i => isObj(i) && isObj(i.ed) && i.ed.pub === d.certBy);
    if (!tryIndex && !oldDenied && d.cert && d.certBy && retiredHere && !list.some(i => i.ed.pub === d.certBy)
      && d.certExp - now() > RENEW_DAYS * DAY && await checkCert(d.cert)) {
      why = null;
      return { signer: signerFrom({ priv: d.priv, pub: d.pub, cert: d.cert }), identities: list.length, old: true };
    }
    const prefer = d.certBy && list.find(i => i.ed.pub === d.certBy);
    const id = tryIndex ? list[tryIndex % list.length] : (prefer || list[0]);
    const fresh = d.cert && d.certBy === id.ed.pub && d.certExp - now() > RENEW_DAYS * DAY && await checkCert(d.cert);
    if (!fresh) {
      const iat = now(), exp = iat + CERT_DAYS * DAY;
      const cert = await makeCert({ identityPriv: id.ed.priv, identityPub: id.ed.pub, devicePub: d.pub, iat, exp });
      d = { ...d, cert, certBy: id.ed.pub, certExp: exp };
      await secrets.set(DEVICE_KEY, d);
      log('info', 'sync (relay): this computer has a new device certificate');
    }
    why = null;
    return { signer: signerFrom({ priv: d.priv, pub: d.pub, cert: d.cert }), identities: list.length };
  }
  return {
    async signer() {
      if (cache && now() - cache.at < 10 * 60 * 1000) return cache.value ? cache.value.signer : null;
      let value = null;
      try { value = await load(); } catch { value = null; why = why || 'error'; }
      cache = { at: now(), value };
      return value ? value.signer : null;
    },
    /** The relay said "not a member": try the next identity this computer holds (if any). */
    async rotate() {
      const old = !!(cache && cache.value && cache.value.old);
      const n = (cache && cache.value && cache.value.identities) || 1;
      if (!old && n < 2) return false;
      if (old) oldDenied = true; else tryIndex++;
      cache = null;
      const d = await secrets.get(DEVICE_KEY).catch(() => null);
      if (isObj(d)) await secrets.set(DEVICE_KEY, { ...d, cert: null, certBy: null, certExp: 0 });
      return true;
    },
    status: () => ({ hasKey: !!(cache && cache.value), why }),
    reset() { cache = null; },
  };
}

// ─── Seeding this computer's own files when the transport changes ──────────
/**
 * Bring this device's own sync files from one OpenDash Sync root to another
 * (folder -> its private relay folder, or back): a log when the source copy is
 * longer (each device is its only writer, so the longer one holds the shorter),
 * a JSON file when the source is newer, a blob when it is missing. Nothing of
 * another device is touched.
 */
export async function seedOwnFiles(fromRoot, toRoot, deviceId) {
  const from = deviceDir(fromRoot, deviceId), to = deviceDir(toRoot, deviceId);
  if (!existsSync(from)) return false;
  const stat = (p) => fsp.stat(p).catch(() => null);
  let copied = 0;
  for (const n of await fsp.readdir(from).catch(() => [])) {
    if (isSyncFileName(n)) {
      const a = await stat(join(from, n)), b = await stat(join(to, n));
      if (!a || !a.isFile()) continue;
      const take = !b || (LOG_RE.test(n) ? a.size > b.size : a.mtimeMs > b.mtimeMs + 1000);
      if (take) { await atomicWrite(join(to, n), await fsp.readFile(join(from, n)), { encoding: null }); copied++; }
    } else if (n === BLOB_DIR) {
      for (const sub of await fsp.readdir(join(from, n)).catch(() => [])) {
        if (!/^[0-9a-f]{2}$/.test(sub)) continue;
        for (const loc of await fsp.readdir(join(from, n, sub)).catch(() => [])) {
          if (!/^[0-9a-f]{32}$/.test(loc) || existsSync(join(to, n, sub, loc))) continue;
          await atomicWrite(join(to, n, sub, loc), await fsp.readFile(join(from, n, sub, loc)), { encoding: null });
          copied++;
        }
      }
    }
  }
  return copied > 0;
}

/**
 * The transport for sync through the relay, as node-host's adapterFactory makes it:
 * mode 'both' (the cloud folder + the relay) or 'relay' (a private folder on this
 * computer + the relay). Returns a lib/sync/relay.mjs adapter.
 */
export function createNodeRelayTransport({ folder, origin, deviceId, now, localDir, lastFolder, local: L, e2e, auth, isLive, onJoinEvent, log, maxLogBytes, env = process.env }) {
  const mode = folder ? 'both' : 'relay';
  const mirrorDir = join(localDir, 'relay-own');
  if (mode === 'relay') { try { mkdirSync(mirrorDir, { recursive: true }); } catch { /* ready() says */ } }
  const local = createFolderAdapter({ folder: mode === 'both' ? folder : mirrorDir, deviceId, now, ...(maxLogBytes ? { maxLogBytes } : {}) });
  const signer = async () => auth.signer();
  const client = createRelayClient({ origin, signer, now });
  const anonClient = createRelayClient({ origin, signer: null, now });
  const seed = async () => {
    // Relay only, coming from a folder: this computer's files move to its private folder.
    if (mode === 'relay' && lastFolder) await seedOwnFiles(syncRootFor(lastFolder), syncRootFor(mirrorDir), deviceId);
    // A folder added to relay-only sync: this computer's files go into it.
    if (mode === 'both' && existsSync(syncRootFor(mirrorDir))) await seedOwnFiles(syncRootFor(mirrorDir), syncRootFor(folder), deviceId);
  };
  return createRelayAdapter({
    deviceId, local, mode, origin, now, log, isLive, onJoinEvent, anonClient, seed,
    state: L ? { read: (n) => L.read(n), write: (n, t) => L.write(n, t) } : null,
    client: async () => ((await auth.signer()) ? client : null),
    onDenied: () => auth.rotate(),
    group: async () => {
      if (!e2e || !e2e.ready) return null;
      const s = e2e.status();
      if (!s.group) return null;
      return { group: s.group, cap: (kid) => e2e.relayCap(kid || null), caps: () => e2e.relayCaps() };
    },
  });
}

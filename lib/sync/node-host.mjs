// lib/sync/node-host.mjs - the Node side of folder sync: the host adapter the
// platform-agnostic core (lib/sync/engine.mjs) needs, and createNodeSyncEngine,
// which wires the core to the dashboard's state store, the data folder and a
// cloud-drive folder (lib/sync/folder.mjs). A phone or PWA build would supply
// its own host (app storage) and transport (a cloud API) instead.
//
// Host adapter:
//   hostKey, defaultName     this computer (identity binding, default device name)
//   fetcherId                this computer's id in the fetcher role: lib/devicedir.mjs
//                            ensureHostId(dataDir), the same id lib/accounts.mjs records
//                            as an account's `fetcher`
//   local                    this computer's own sync files: read/write/remove/rename/exists(name), where
//   data                     synced files in the data folder, by '/'-separated relative path:
//                            readJson(rel) -> {present, value} | {present:false} | {error},
//                            writeJson, remove, list(dir), stamp(rel),
//                            updateJson(rel, fn) (read-change-write under the file's lock,
//                            the lock lib/accounts-file.mjs and the snapshot writers use),
//                            withLocks(rels, fn) (fn while those files are locked)
//                            Binary files the blob channel carries (lib/sync/blobs.mjs: people
//                            pictures, narration audio; BIN_REL only): readBytes(rel, max) ->
//                            bytes | null, writeBytes(rel, bytes), statBytes(rel) -> {size, mtimeMs} | null
//   stateStamp()             the state file's size:mtime (finds writes by other processes)
//   checkFolder(path)        {ok, path} or {ok:false, error, code}
//   folderLabel(path), detect(), disabled
//
// The local folder is never inside the data folder (which may be in OneDrive):
// it is <device base>/sync/<key>, under the per-computer base of
// lib/devicedir.mjs deviceBase() (Windows %LOCALAPPDATA%\OpenDash, macOS
// ~/Library/Application Support/OpenDash, Linux ~/.local/state/opendash; a test
// or a temp data folder gets the temp base), <key> from the data folder's path
// and this computer's name. The base is decided by lib/devicedir.mjs only;
// DASHBOARD_SYNC_LOCAL_DIR (or localDir) overrides the folder.

import { promises as fsp, existsSync } from 'node:fs';
import { join, resolve, isAbsolute, dirname } from 'node:path';
import { hostname, homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { atomicWrite, isInside, retryFs, withLock } from '../fsutil.mjs';
import { deviceBase, ensureHostId } from '../devicedir.mjs';
import { createSyncEngine } from './engine.mjs';
import { createE2E } from './e2e.mjs';
import { createFolderAdapter, detectCloudFolders, syncRootFor } from './folder.mjs';
import { secretStore } from '../secret-store.mjs';
import { friendlyDeviceName } from './devname.mjs';
import { probeDeviceName, findSyncFolders } from './node-health.mjs';
import { readRelayInfo, createRelayAuth, createNodeRelayTransport, IDENTITY_KEY, RELAYS_REL } from './relay-node.mjs';

/**
 * Where this computer keeps its own sync files for a data folder (never inside
 * it). `base` (tests) replaces the device base, as in lib/devicedir.mjs.
 */
export function defaultLocalDir(dataDir, host = hostname(), { env = process.env, platform = process.platform, home = homedir(), base } = {}) {
  if (env.DASHBOARD_SYNC_LOCAL_DIR) return resolve(env.DASHBOARD_SYNC_LOCAL_DIR);
  const key = createHash('sha1').update(`${resolve(dataDir).toLowerCase()}|${host}`).digest('hex').slice(0, 16);
  // The same per-computer base as lib/devicedir.mjs (%LOCALAPPDATA%\OpenDash on
  // Windows), which also keeps tests and temp data folders out of the real one.
  return join(deviceBase({ base, env, platform, home, dataDir }), 'sync', key);
}

const LOCAL_NAME = /^[a-z][a-z.-]{0,40}\.(json|jsonl)$/;
// The binary files the blob channel may read or write (the same names as lib/sync/blobs.mjs blobKind).
const BIN_REL = /^(people\/images\/[a-z0-9][a-z0-9-]{0,59}-(avatar|cover)-[0-9a-f]{16}\.(png|jpg|webp|gif)|cache\/narration\/[a-f0-9]{64}\.mp3|expenses\/receipts\/rc-[0-9a-f]{16}\.(pdf|png|jpg|webp|gif))$/;

export function createNodeHost({ dataDir, stateFile, localDir, forbid = [], host = hostname(), detect = () => detectCloudFolders(), env = process.env, deviceOpts = {}, fetcherId = null }) {
  const root = resolve(dataDir);
  const own = !!(localDir || env.DASHBOARD_SYNC_LOCAL_DIR);
  const dir = localDir ? resolve(localDir) : defaultLocalDir(root, host, { env, ...deviceOpts });
  // The whole per-computer base (it holds this computer's sign-ins) is off limits as a sync folder.
  const deviceDir = own ? dir : deviceBase({ ...deviceOpts, env, dataDir: root });
  let fid = fetcherId;
  const lp = (name) => { if (!LOCAL_NAME.test(name)) throw new Error(`not a sync file name: ${name}`); return join(dir, name); };
  const dp = (rel) => {
    const parts = String(rel).split('/');
    if (!parts.length || parts.some(s => !s || s === '.' || s === '..')) throw new Error('bad path');
    const p = join(root, ...parts);
    if (!isInside(root, p)) throw new Error('bad path');
    return p;
  };
  const statStamp = async (p) => { try { const s = await fsp.stat(p); return `${s.size}:${s.mtimeMs}`; } catch { return '-'; } };
  // The default device name, made friendly ("MacBook Pro", "Dell XPS 15", "Windows laptop":
  // lib/sync/devname.mjs); macOS's ComputerName and Windows' maker and model are asked for once.
  const platform = deviceOpts.platform || process.platform;
  let friendly = friendlyDeviceName({ hostname: host, platform });
  if (!env.NODE_TEST_CONTEXT) probeDeviceName({ platform, env }).then((x) => { if (x) friendly = friendlyDeviceName({ hostname: host, platform, ...x }); }).catch(() => {});
  const readData = async (rel) => {
    let t;
    try { t = await retryFs(() => fsp.readFile(dp(rel), 'utf8'), { retries: 4 }); }
    catch (e) { return e.code === 'ENOENT' ? { present: false } : { error: e.code || 'unreadable' }; }
    try { return { present: true, value: JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t) }; } catch { return { error: 'not JSON' }; }
  };
  return {
    hostKey: host,
    get defaultName() { return friendly || host; },
    get fetcherId() {
      if (!fid) { try { fid = ensureHostId(root, { env, ...deviceOpts }); } catch { fid = null; } }
      return fid;
    },
    local: {
      where: dir,
      async read(name) { try { return await retryFs(() => fsp.readFile(lp(name), 'utf8'), { retries: 4 }); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } },
      write: (name, text) => atomicWrite(lp(name), text),
      remove: (name) => fsp.unlink(lp(name)).catch(() => {}),
      rename: (a, b) => retryFs(() => fsp.rename(lp(a), lp(b))),
      exists: async (name) => existsSync(lp(name)),
    },
    data: {
      readJson: readData,
      writeJson: (rel, value) => atomicWrite(dp(rel), JSON.stringify(value, null, 1)),
      /** fn(value | undefined) -> the new value, or undefined to leave the file; under the file's lock. */
      updateJson: (rel, fn) => withLock(dp(rel), async () => {
        const cur = await readData(rel);
        if (cur.error) { const e = new Error(`${rel} cannot be read right now`); e.code = 'SYNC_FILE_BUSY'; throw e; }
        const next = await fn(cur.present ? cur.value : undefined);
        if (next !== undefined) await atomicWrite(dp(rel), JSON.stringify(next, null, 1) + '\n');
        return next;
      }),
      /** fn() while the given files are locked (in a fixed order, so two callers never wait on each other). */
      withLocks(rels, fn) {
        const paths = [...new Set((rels || []).map(dp))].filter(p => existsSync(dirname(p))).sort();
        const go = (i) => (i >= paths.length ? fn() : withLock(paths[i], () => go(i + 1)));
        return go(0);
      },
      remove: (rel) => fsp.unlink(dp(rel)).catch(() => {}),
      list: async (rel) => { try { return await fsp.readdir(dp(rel)); } catch { return []; } },
      stamp: (rel) => statStamp(dp(rel)),
      async readBytes(rel, max = 8 * 1024 * 1024) {
        if (!BIN_REL.test(rel)) return null;
        try {
          const st = await fsp.stat(dp(rel));
          if (!st.isFile() || st.size > max) return null;
          return await retryFs(() => fsp.readFile(dp(rel)), { retries: 4 });
        } catch { return null; }
      },
      async writeBytes(rel, bytes) {
        if (!BIN_REL.test(rel)) throw new Error('bad path');
        await atomicWrite(dp(rel), Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), { encoding: null, mode: 0o600 });
      },
      async statBytes(rel) {
        if (!BIN_REL.test(rel)) return null;
        try { const s = await fsp.stat(dp(rel)); return s.isFile() ? { size: s.size, mtimeMs: s.mtimeMs } : null; } catch { return null; }
      },
    },
    stateStamp: () => statStamp(stateFile),
    async checkFolder(f) {
      if (!f || f.length > 1000 || !isAbsolute(f)) return { ok: false, code: 'BAD_SYNC_SETTING', error: 'Choose a full folder path, for example your OneDrive folder.' };
      const full = resolve(f);
      let s = null;
      try { s = await fsp.stat(full); } catch { s = null; }
      if (!s || !s.isDirectory()) return { ok: false, code: 'BAD_SYNC_SETTING', error: 'That folder does not exist on this computer.' };
      const r = syncRootFor(full);
      if (isInside(root, r) || isInside(r, root)) return { ok: false, code: 'BAD_SYNC_SETTING', error: 'Choose a folder outside the OpenDash data folder.' };
      if (isInside(deviceDir, r) || isInside(r, deviceDir)) return { ok: false, code: 'BAD_SYNC_SETTING', error: "Choose a folder outside OpenDash's own settings folder." };
      for (const bad of forbid) if (bad && (isInside(bad, r) || isInside(r, bad))) return { ok: false, code: 'BAD_SYNC_SETTING', error: 'Choose a folder outside the OpenDash app folder.' };
      return { ok: true, path: full };
    },
    folderLabel(f) {
      const s = String(f || '').toLowerCase();
      if (/onedrive/.test(s)) return 'OneDrive';
      if (/google ?drive|my drive/.test(s)) return 'Google Drive';
      if (/dropbox/.test(s)) return 'Dropbox';
      return 'the sync folder';
    },
    detect,
    /** Where an OpenDash Sync folder holding these devices is now (it moved): lib/sync/node-health.mjs. */
    findSyncFolders: (ids, opts = {}) => findSyncFolders(ids, { ...opts, detect }),
    get disabled() { return env.DASHBOARD_SYNC === 'off' ? 'Turned off by DASHBOARD_SYNC=off.' : null; },
  };
}

/**
 * The sync engine for the dashboard server: the core + the Node host + the
 * folder transport + end-to-end encryption, whose keys live in this
 * computer's secret store (lib/secret-store.mjs: the device folder of
 * lib/devicedir.mjs, never the data folder or the sync folder). `secrets`
 * replaces the store (tests: an in-memory one). It is opened only when
 * encrypted sync is used. deviceOpts {base} and fetcherId: tests.
 */
export function createNodeSyncEngine({ store, dataDir, localDir, forbid, host, detect, env, maxLogBytes, secrets, deviceOpts, fetcherId, ...opts }) {
  const h = createNodeHost({ dataDir, stateFile: store.file, localDir, forbid, ...(host ? { host } : {}), ...(detect ? { detect } : {}), ...(env ? { env } : {}), ...(deviceOpts ? { deviceOpts } : {}), ...(fetcherId ? { fetcherId } : {}) });
  let ss = secrets || null;
  const lazy = () => (ss = ss || secretStore(dataDir));
  const sec = { get: (k) => lazy().get(k), set: (k, v) => lazy().set(k, v) };
  const e2e = createE2E({ secrets: sec, log: opts.log, ...(opts.now ? { now: opts.now } : {}), kind: opts.kind || 'computer' });
  // ── relay ── sync through the person's own relay (lib/sync/relay-node.mjs): where it is
  // (friends/relays.json, synced), and this computer's device key and certificate.
  const e = env || process.env;
  const auth = createRelayAuth({ secrets: sec, log: opts.log || (() => {}), ...(opts.now ? { now: opts.now } : {}) });
  let relay = { info: null, hasKey: false, at: 0, stamp: null };
  h.relayInfo = () => relay.info;
  h.relayHasKey = () => relay.hasKey;
  // ── relay carry-over ── the friends identity's id (a live link offers the key to a computer that lacks it),
  // and the person's choice to sync through their relay, kept in friends/relays.json ('sync', synced).
  h.friendsId = () => relay.idNow || null;
  h.setRelaySyncChoice = async (on) => {
    await h.data.updateJson(RELAYS_REL, (v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v) || !v.home) return undefined;
      if (v.sync && typeof v.sync === 'object' && v.sync.on === !!on) return undefined;
      return { ...v, sync: { on: !!on, at: Date.now() } };
    });
    relay.at = 0;
  };
  h.refreshRelayInfo = async ({ force = false } = {}) => {
    // The key first (a join code may just have brought it), then the relay setting when its file changed.
    let hasKey = false, idNow = null;
    try { const v = await sec.get(IDENTITY_KEY); hasKey = !!(v && v.current); idNow = hasKey ? String(v.current.id || '') : null; } catch { hasKey = false; }
    // A renewal of the friend keys (here or brought by the keyring): the certificate is made again with the new one at once.
    if (hasKey !== relay.hasKey || idNow !== relay.idNow) { auth.reset(); relay = { ...relay, hasKey, idNow }; }
    const stamp = await h.data.stamp(RELAYS_REL).catch(() => '-');
    if (!force && stamp === relay.stamp && Date.now() - relay.at < 60000) return relay.info;
    const info = await readRelayInfo(dataDir, { env: e }).catch(() => null);
    relay = { ...relay, info, hasKey, at: Date.now(), stamp };     // (idNow kept: else every look reset the certificate cache)
    return info;
  };
  return createSyncEngine({
    store, host: h, e2e, ...opts,
    adapterFactory: ({ folder, deviceId, now, relay: r, lastFolder, isLive, onJoinEvent }) => (r && r.origin
      ? createNodeRelayTransport({ folder, origin: r.origin, deviceId, now, localDir: h.local.where, lastFolder, local: h.local, e2e, auth, isLive, onJoinEvent, log: opts.log, maxLogBytes, env: e })
      : createFolderAdapter({ folder, deviceId, now, ...(maxLogBytes ? { maxLogBytes } : {}) })),
  });
}

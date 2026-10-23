// lib/sync/node-host.mjs - the Node side of folder sync: the host adapter the
// platform-agnostic core (lib/sync/engine.mjs) needs, and createNodeSyncEngine,
// which wires the core to the dashboard's state store, the data folder and a
// cloud-drive folder (lib/sync/folder.mjs). A phone or PWA build would supply
// its own host (app storage) and transport (a cloud API) instead.
//
// Host adapter:
//   hostKey, defaultName     this computer (identity binding, default device name)
//   local                    this computer's own sync files: read/write/remove/rename/exists(name), where
//   data                     synced files in the data folder, by '/'-separated relative path:
//                            readJson(rel) -> {present, value} | {present:false} | {error},
//                            writeJson, remove, list(dir), stamp(rel)
//   stateStamp()             the state file's size:mtime (finds writes by other processes)
//   checkFolder(path)        {ok, path} or {ok:false, error, code}
//   folderLabel(path), detect(), disabled
//
// The local folder is never inside the data folder (which may be in OneDrive):
// %LOCALAPPDATA%\OpenDash\sync\<key> on Windows, ~/Library/Application Support/
// OpenDash/sync/<key> on macOS, $XDG_STATE_HOME or ~/.local/state/opendash/
// sync/<key> elsewhere; DASHBOARD_SYNC_LOCAL_DIR overrides. (When the device
// folder of lib/devicedir.mjs lands, this becomes <deviceRoot>/sync.)

import { promises as fsp, existsSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { hostname, homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { atomicWrite, isInside, retryFs } from '../fsutil.mjs';
import { createSyncEngine } from './engine.mjs';
import { createE2E } from './e2e.mjs';
import { createFolderAdapter, detectCloudFolders, syncRootFor } from './folder.mjs';
import { secretStore } from '../secret-store.mjs';

/** Where this computer keeps its own sync files for a data folder (never inside it). */
export function defaultLocalDir(dataDir, host = hostname(), { env = process.env, platform = process.platform, home = homedir() } = {}) {
  if (env.DASHBOARD_SYNC_LOCAL_DIR) return resolve(env.DASHBOARD_SYNC_LOCAL_DIR);
  const key = createHash('sha1').update(`${resolve(dataDir).toLowerCase()}|${host}`).digest('hex').slice(0, 16);
  const base = platform === 'win32' ? join(env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'OpenDash')
    : platform === 'darwin' ? join(home, 'Library', 'Application Support', 'OpenDash')
      : join(env.XDG_STATE_HOME || join(home, '.local', 'state'), 'opendash');
  return join(base, 'sync', key);
}

const LOCAL_NAME = /^[a-z][a-z.-]{0,40}\.(json|jsonl)$/;

export function createNodeHost({ dataDir, stateFile, localDir, forbid = [], host = hostname(), detect = () => detectCloudFolders(), env = process.env }) {
  const root = resolve(dataDir);
  const dir = localDir ? resolve(localDir) : defaultLocalDir(root, host, { env });
  const lp = (name) => { if (!LOCAL_NAME.test(name)) throw new Error(`not a sync file name: ${name}`); return join(dir, name); };
  const dp = (rel) => {
    const parts = String(rel).split('/');
    if (!parts.length || parts.some(s => !s || s === '.' || s === '..')) throw new Error('bad path');
    const p = join(root, ...parts);
    if (!isInside(root, p)) throw new Error('bad path');
    return p;
  };
  const statStamp = async (p) => { try { const s = await fsp.stat(p); return `${s.size}:${s.mtimeMs}`; } catch { return '-'; } };
  return {
    hostKey: host,
    defaultName: host,
    local: {
      where: dir,
      async read(name) { try { return await retryFs(() => fsp.readFile(lp(name), 'utf8'), { retries: 4 }); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } },
      write: (name, text) => atomicWrite(lp(name), text),
      remove: (name) => fsp.unlink(lp(name)).catch(() => {}),
      rename: (a, b) => retryFs(() => fsp.rename(lp(a), lp(b))),
      exists: async (name) => existsSync(lp(name)),
    },
    data: {
      async readJson(rel) {
        let t;
        try { t = await retryFs(() => fsp.readFile(dp(rel), 'utf8'), { retries: 4 }); }
        catch (e) { return e.code === 'ENOENT' ? { present: false } : { error: e.code || 'unreadable' }; }
        try { return { present: true, value: JSON.parse(t.charCodeAt(0) === 0xfeff ? t.slice(1) : t) }; } catch { return { error: 'not JSON' }; }
      },
      writeJson: (rel, value) => atomicWrite(dp(rel), JSON.stringify(value, null, 1)),
      remove: (rel) => fsp.unlink(dp(rel)).catch(() => {}),
      list: async (rel) => { try { return await fsp.readdir(dp(rel)); } catch { return []; } },
      stamp: (rel) => statStamp(dp(rel)),
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
      if (isInside(dir, r) || isInside(r, dir)) return { ok: false, code: 'BAD_SYNC_SETTING', error: "Choose a folder outside OpenDash's own settings folder." };
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
    get disabled() { return env.DASHBOARD_SYNC === 'off' ? 'Turned off by DASHBOARD_SYNC=off.' : null; },
  };
}

/**
 * The sync engine for the dashboard server: the core + the Node host + the
 * folder transport + end-to-end encryption, whose keys live in this
 * computer's secret store (lib/secret-store.mjs: the device folder of
 * lib/devicedir.mjs, never the data folder or the sync folder). `secrets`
 * replaces the store (tests: an in-memory one). It is opened only when
 * encrypted sync is used.
 */
export function createNodeSyncEngine({ store, dataDir, localDir, forbid, host, detect, env, maxLogBytes, secrets, ...opts }) {
  const h = createNodeHost({ dataDir, stateFile: store.file, localDir, forbid, ...(host ? { host } : {}), ...(detect ? { detect } : {}), ...(env ? { env } : {}) });
  let ss = secrets || null;
  const lazy = () => (ss = ss || secretStore(dataDir));
  const e2e = createE2E({ secrets: { get: (k) => lazy().get(k), set: (k, v) => lazy().set(k, v) }, log: opts.log, ...(opts.now ? { now: opts.now } : {}), kind: 'computer' });
  return createSyncEngine({
    store, host: h, e2e, ...opts,
    adapterFactory: ({ folder, deviceId, now }) => createFolderAdapter({ folder, deviceId, now, ...(maxLogBytes ? { maxLogBytes } : {}) }),
  });
}

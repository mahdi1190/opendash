// Shared helpers for the encrypted-sync tests (tests/sync-e2e*.test.mjs).
// Every device keeps its secrets through lib/secret-store.mjs with the file
// backend in the test's own temp folder (or an in-memory backend), so nothing
// is ever written to the real per-user folder.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createStateStore } from '../server/state-store.mjs';
import { createNodeSyncEngine } from '../lib/sync/node-host.mjs';
import { secretStore, fileBackend } from '../lib/secret-store.mjs';
import { SYNC_DIR_NAME } from '../lib/sync/folder.mjs';
import { engines } from './sync.shared.mjs';

export { tempDir, rm, sleep, waitFor, editState, stopAll, keepAlive } from './sync.shared.mjs';

/** A secret store kept in memory (a stand-in for a phone's Keychain). */
export function memorySecrets() {
  const m = new Map();
  return {
    get: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null),
    set: async (k, v) => { m.set(k, structuredClone(v)); },
    _map: m,
  };
}

/**
 * One computer with encrypted sync available: a data folder, its state store,
 * its engine (not started) and its secret store (lib/secret-store.mjs, file
 * backend in <base>/secrets-<name>).
 */
export function makeE2EDevice(base, name, { state = { custom: [] }, now, log, background = true, secrets, pollMs = 60000, kind } = {}) {
  const data = join(base, `data-${name}`);
  mkdirSync(join(data, 'state'), { recursive: true });
  if (state) writeFileSync(join(data, 'state', 'dashboard-state.json'), JSON.stringify({ ...state, _lastSave: 1 }));
  const store = createStateStore({ stateDir: join(data, 'state') });
  const secretsDir = join(base, `secrets-${name}`);
  const sec = secrets || secretStore(null, { backend: fileBackend(secretsDir) });
  const eng = createNodeSyncEngine({ store, dataDir: data, localDir: join(base, `local-${name}`), host: `host-${name}`, pollMs, watch: false, debounceMs: 20, background, detect: () => [], secrets: sec, ...(kind ? { kind } : {}), ...(now ? { now } : {}), ...(log ? { log } : {}) });
  engines.add(eng);
  return { name, data, store, eng, secretsDir, secrets: sec };
}

/** Run a sync pass on every device, `rounds` times (the shared folder is instant). */
export async function settle(devs, rounds = 3) {
  for (let i = 0; i < rounds; i++) for (const d of devs) await d.eng.syncNow();
}

/** Every file under the sync folder: [{rel, text}]. */
export function folderFiles(cloud) {
  const root = join(cloud, SYNC_DIR_NAME);
  const out = [];
  const walk = (dir, rel) => {
    if (!existsSync(dir)) return;
    for (const n of readdirSync(dir)) {
      const p = join(dir, n), r = rel ? `${rel}/${n}` : n;
      if (statSync(p).isDirectory()) walk(p, r); else out.push({ rel: r, text: readFileSync(p, 'utf8') });
    }
  };
  walk(root, '');
  return out;
}
export const devFile = (cloud, id, name) => join(cloud, SYNC_DIR_NAME, 'devices', id, name);
export const titles = async (d) => ((await d.store.readObject()).custom || []).map(t => t.title).sort();

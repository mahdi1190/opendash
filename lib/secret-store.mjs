// lib/secret-store.mjs - THE way OpenDash keeps a secret: sign-ins, refresh
// tokens, API keys, bank keys. Callers name a KEY; where and how the value is
// kept is the backend's business, so a later OS keychain backend (Windows
// Credential Manager, macOS/iOS Keychain, Android Keystore, a desktop shell's
// secure storage) can replace the files without touching any caller.
//
//   const s = secretStore(dataDir)      the secrets of one data folder on THIS computer
//   await s.get(key)          -> value | null   missing -> null. A value that exists but
//                                               cannot be read THROWS (code SECRET_CORRUPT
//                                               when it is not valid JSON): never mistaken for
//                                               "none", which would lose a one-time Monzo token.
//   await s.set(key, value)   any JSON value (null is kept as a value: "signed out").
//                             Atomic, but takes no lock (see lock).
//   await s.delete(key)       gone (no error when it was not there)
//   await s.list(prefix?)     -> [key], sorted; prefix 'fin/' lists one folder
//   await s.has(key)          is a value saved (a saved null counts)?
//   await s.update(key, fn)   read-modify-write under the key's lock: fn(current|null) -> next;
//                             undefined = no change, null = delete. Returns the new value.
//   await s.lock(key, fn)     run fn holding the key's cross-process lock, for changes that span
//                             a network call (an OAuth refresh must not run twice at once).
//                             Not re-entrant: inside fn use get/set, never lock/update the same key.
//
// Keys: one or two parts of letters, digits, '.', '_' and '-' ('microsoft-tokens',
// 'fin/monzo-<sourceId>'); no leading dot, no '..'.
//
// Backend contract: { kind, read(key) -> value|null, write(key, value), remove(key),
// keys(prefix) -> [key], lock(key, fn) }. The default is fileBackend(secretsDir(dataDir)):
// <device folder>/secrets/<key>.json, mode 0600 (lib/fsutil.mjs: atomic, OneDrive-safe
// retries, cross-process lock), the same files OpenDash kept before this interface.
// setSecretBackendFactory(fn(dataDir) -> backend) swaps it for every store made after.
//
// Platform paths live only in lib/devicedir.mjs. Node stdlib only.

import { existsSync, promises as fsp } from 'node:fs';
import { join, resolve } from 'node:path';
import { readJson, writeJson, withLock, retryFs } from './fsutil.mjs';
import { secretsDir } from './devicedir.mjs';

const PART = '[A-Za-z0-9_-][A-Za-z0-9._-]{0,159}';
const KEY_RE = new RegExp(`^${PART}(?:/${PART})?$`);

export function checkKey(key) {
  const k = String(key ?? '');
  if (!KEY_RE.test(k) || k.split('/').some(p => p === '.' || p === '..' || p.startsWith('.'))) {
    throw Object.assign(new Error('bad secret name'), { code: 'BAD_SECRET_KEY' });
  }
  return k;
}

/** Secrets as JSON files in one folder (the default backend). */
export function fileBackend(dir) {
  const root = resolve(dir);
  const file = (key) => join(root, ...checkKey(key).split('/')) + '.json';
  return {
    kind: 'file', dir: root, file,
    async read(key) {
      const f = file(key);
      if (!existsSync(f)) return null;
      try { return await readJson(f); }
      catch (e) {
        if (e && e.code === 'ENOENT') return null;
        if (e instanceof SyntaxError || /not valid JSON/.test(String(e && e.message))) throw Object.assign(new Error(`the saved secret ${key} is damaged`), { code: 'SECRET_CORRUPT' });
        throw e;
      }
    },
    async write(key, value) { await writeJson(file(key), value, { mode: 0o600 }); },
    async remove(key) {
      await retryFs(() => fsp.unlink(file(key)), { label: 'removing a secret' }).catch(e => { if (e.code !== 'ENOENT') throw e; });
    },
    async keys(prefix = '') {
      const out = [];
      const walk = async (dir, pre, depth) => {
        let names = [];
        try { names = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
        for (const d of names) {
          if (d.name.startsWith('.')) continue;
          if (d.isDirectory()) { if (depth === 0) await walk(join(dir, d.name), `${d.name}/`, 1); continue; }
          if (!d.name.endsWith('.json')) continue;      // locks, temp files
          const key = pre + d.name.slice(0, -5);
          if (KEY_RE.test(key) && key.startsWith(prefix)) out.push(key);
        }
      };
      await walk(root, '', 0);
      return out.sort();
    },
    lock(key, fn) { return withLock(file(key), fn); },
  };
}

let backendFactory = (dataDir) => fileBackend(secretsDir(dataDir));
/** Replace the backend for every store made after this (a keychain, a test fake). null = the files again. */
export function setSecretBackendFactory(fn) {
  backendFactory = typeof fn === 'function' ? fn : (dataDir) => fileBackend(secretsDir(dataDir));
}

/** The store for one data folder's secrets on this computer (see the header). */
export function secretStore(dataDir, { backend } = {}) {
  if (!dataDir && !backend) throw new Error('secretStore needs a data folder');
  const b = backend || backendFactory(resolve(dataDir));
  return {
    kind: b.kind,
    get: (key) => b.read(checkKey(key)),
    set: (key, value) => b.write(checkKey(key), value === undefined ? null : value),
    delete: (key) => b.remove(checkKey(key)),
    list: (prefix = '') => b.keys(String(prefix || '')),
    /** Is there a saved value (even a null one)? */
    has: async (key) => (await b.keys(checkKey(key))).includes(key),
    lock: (key, fn) => b.lock(checkKey(key), fn),
    update: (key, fn) => b.lock(checkKey(key), async () => {
      const cur = await b.read(key);
      const next = await fn(cur);
      if (next === undefined) return cur;
      if (next === null) { await b.remove(key); return null; }
      await b.write(key, next);
      return next;
    }),
    /** Where the file backend keeps them (diagnostics, tests); null for other backends. */
    location: b.dir || null,
  };
}

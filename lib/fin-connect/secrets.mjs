// lib/fin-connect/secrets.mjs - finance connector credentials on THIS computer
// only, as keys 'fin/<name>' of the secret store (lib/secret-store.mjs; with the
// default file backend: <device folder>/secrets/fin/<name>.json, mode 0600,
// atomic, locked; design 3.4). The device folder is outside the data folder
// since 2.15 (lib/devicedir.mjs): these never travel to another computer.
//
//   secretsFor(dataDir) -> {dir, read(name), write(name, obj), update(name, fn), remove(name), file(name)}
//   (dir/file: where the file backend keeps them; null with another backend)
//
// Names: monzo-<sourceId>, eb-app, eb-<sourceId>, plasma-<sourceId>, plasma-key.
// A missing secret reads as null; one that exists but cannot be read THROWS
// (it is never treated as empty, which would lose a one-time Monzo refresh token).
// Nothing here logs; the page never receives these objects (index.mjs masks).
// lib/sharing.mjs already leaves secrets/ out of exports and app copies.

import { join, resolve } from 'node:path';
import { secretStore } from '../secret-store.mjs';

const NAME_RE = /^[a-z][a-z0-9-]{1,79}$/;
const services = new Map();

export function secretsFor(dataDir) {
  const root = resolve(dataDir);
  if (services.has(root)) return services.get(root);
  const store = secretStore(root);
  const key = (name) => {
    if (!NAME_RE.test(String(name || ''))) throw new Error('bad secret name');
    return `fin/${name}`;
  };
  const dir = store.location ? join(store.location, 'fin') : null;
  const file = (name) => { const k = key(name); return dir ? join(dir, `${k.slice(4)}.json`) : null; };
  const asObj = (v) => (v && typeof v === 'object' ? v : null);
  async function read(name) { return asObj(await store.get(key(name))); }      // throws when unreadable or corrupt (strict)
  async function write(name, obj) { const k = key(name); return store.lock(k, () => store.set(k, obj)); }
  /** Read-modify-write under the secret's lock. fn(current|null) -> next (null deletes). */
  async function update(name, fn) { return store.update(key(name), (cur) => fn(asObj(cur))); }
  async function remove(name) { return update(name, () => null); }
  const svc = { dir, file, read, write, update, remove };
  services.set(root, svc);
  return svc;
}

/** "oauth2client_••••7f3a": enough to recognise, never enough to use. */
export function maskId(id, keep = 4) {
  const s = String(id || '');
  if (!s) return '';
  const m = /^([a-z0-9]+_)/i.exec(s);
  return (m ? m[1] : '') + '••••' + s.slice(-keep);
}

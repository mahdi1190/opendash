// lib/fin-connect/secrets.mjs - finance connector credentials on THIS computer
// only: <data>/secrets/fin/<name>.json (mode 0600, atomic, locked; design 3.4).
//
//   secretsFor(dataDir) -> {dir, read(name), write(name, obj), update(name, fn), remove(name), file(name)}
//
// Names: monzo-<sourceId>, eb-app, eb-<sourceId>, plasma-<sourceId>, plasma-key.
// A missing file reads as null; a file that exists but cannot be read THROWS
// (it is never treated as empty, which would lose a one-time Monzo refresh token).
// Nothing here logs; the page never receives these objects (index.mjs masks).
// lib/sharing.mjs already leaves secrets/ out of exports and app copies.

import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { readJson, writeJson, withLock, retryFs } from '../fsutil.mjs';

const NAME_RE = /^[a-z][a-z0-9-]{1,79}$/;
const services = new Map();

export function secretsFor(dataDir) {
  const root = resolve(dataDir);
  if (services.has(root)) return services.get(root);
  const dir = join(root, 'secrets', 'fin');
  const file = (name) => {
    if (!NAME_RE.test(String(name || ''))) throw new Error('bad secret name');
    return join(dir, `${name}.json`);
  };
  async function read(name) {
    const f = file(name);
    if (!existsSync(f)) return null;
    const v = await readJson(f);           // throws when unreadable or corrupt (strict)
    return v && typeof v === 'object' ? v : null;
  }
  async function write(name, obj) {
    const f = file(name);
    return withLock(f, () => writeJson(f, obj, { mode: 0o600 }));
  }
  /** Read-modify-write under the file's lock. fn(current|null) -> next (null deletes). */
  async function update(name, fn) {
    const f = file(name);
    return withLock(f, async () => {
      const cur = existsSync(f) ? await readJson(f) : null;
      const next = await fn(cur && typeof cur === 'object' ? cur : null);
      if (next === undefined) return cur;
      if (next === null) { await retryFs(() => unlink(f), { label: 'removing a sign-in' }).catch(e => { if (e.code !== 'ENOENT') throw e; }); return null; }
      await writeJson(f, next, { mode: 0o600 });
      return next;
    });
  }
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

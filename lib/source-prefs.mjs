// lib/source-prefs.mjs - your choices on each data source follow you
// (docs/dev/MULTI_DEVICE.md, docs/dev/SYNC_FORMAT.md section 8).
//
// sources.json stays on each computer: its definitions hold iCal secret links,
// this computer's MCP server names and bank sessions, and a source that does
// not validate on another computer would be dropped there and the drop sent
// back (lib/sync/manifest.mjs FILE_RULES says more). What in it is the
// PERSON's are the choices: the name, colour and on/off of a source, and the
// name, colour, on/off and "mine" of each calendar, mailbox or bank account in
// it. Those are copied into <data>/source-prefs.json, a synced file (role
// 'shared': field by field, the later change wins):
//   - every write of sources.json writes source-prefs.json (lib/sources.mjs writeSourcesFile)
//   - a source-prefs.json that sync brings in is applied to sources.json
//     (lib/sources.mjs applySourcePrefs; server/routes/sync.mjs on engine.onApplied)
//   - another computer's MCP and calendar-link sources, shown here through its
//     capabilities (lib/remote-jobs.mjs remoteSources), wear them too (withPrefs)
//
// Sync never ADDS or REMOVES a source or an account through this file: it only
// changes the choices on the ones this computer already has (accounts.json,
// Connections and fetches make them). The entries of sources this computer does
// not have are kept as they are (they are another computer's), so nothing is
// dropped and sent back. A field the file does not have yet is only added when
// it is a real choice (not the default: a calendar switched off, a colour
// picked, a name typed), so a computer that has never been set up cannot
// overwrite the other's choices with its defaults; a field the file has
// follows this computer's changes.
//
// source-prefs.json = {version: 1, sources: {<sourceId>: {label?, colour?, enabled?,
//   accounts: {<accountId>: {name?, renamed?, colour?, enabled?, own?}}}}}
//
// Node stdlib only.

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readJson, writeJson, withLock } from './fsutil.mjs';

export const SOURCE_PREFS_REL = 'source-prefs.json';
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const stable = (v) => JSON.stringify(v, (k, x) => (isObj(x) ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x));
const fileOf = (dataDir) => join(dataDir, SOURCE_PREFS_REL);
const KEY_RE = /^[A-Za-z0-9_@.:#+\-]{1,160}$/;
const SOURCE_FIELDS = ['label', 'colour', 'enabled'];
const ACCOUNT_FIELDS = ['name', 'renamed', 'colour', 'enabled', 'own'];

/**
 * The choices of one source as this computer has them: {label, colour, enabled?, accounts: {id: {...}}}.
 * isDefault(source, field, value, account?, index?) -> true when a value is only the default.
 * accountRuled: the source's on/off follows its account (accounts.json features), so it is left out.
 */
function choicesOf(s, isDefault) {
  const out = { accounts: {} };
  for (const k of SOURCE_FIELDS) {
    if (s[k] === undefined || (k === 'enabled' && s.account)) continue;
    out[k] = { v: s[k], d: !!isDefault(s, k, s[k]) };
  }
  (Array.isArray(s.accounts) ? s.accounts : []).forEach((a, i) => {
    if (!a || !KEY_RE.test(String(a.id || ''))) return;
    const o = {};
    for (const k of ACCOUNT_FIELDS) {
      if (a[k] === undefined) continue;
      if (k === 'name' && a.renamed !== true) continue;     // a name the provider gave is the same everywhere
      o[k] = { v: a[k], d: !!isDefault(s, k, a[k], a, i) };
    }
    out.accounts[a.id] = o;
  });
  return out;
}

/**
 * The file after this computer's sources are laid over it (`cur`, the file as
 * it is): a field the file has follows this computer's value; a missing one is
 * added only when it is not the default. Entries of other sources are kept.
 */
export function overlayPrefs(cur, sources, { isDefault = () => false } = {}) {
  const base = isObj(cur) && isObj(cur.sources) ? cur.sources : {};
  const next = { version: 1, sources: JSON.parse(JSON.stringify(base)) };
  for (const s of Array.isArray(sources) ? sources : []) {
    if (!s || !KEY_RE.test(String(s.id || '')) || s.demo || s.remote) continue;
    const c = choicesOf(s, isDefault);
    const had = isObj(next.sources[s.id]) ? next.sources[s.id] : null;
    const e = had || {};
    for (const [k, { v, d }] of Object.entries(c)) {
      if (k === 'accounts') continue;
      if (Object.hasOwn(e, k) || !d) e[k] = v;
    }
    const accs = isObj(e.accounts) ? e.accounts : {};
    for (const [id, o] of Object.entries(c.accounts)) {
      const ae = isObj(accs[id]) ? accs[id] : {};
      for (const [k, { v, d }] of Object.entries(o)) if (Object.hasOwn(ae, k) || !d) ae[k] = v;
      if (Object.keys(ae).length) accs[id] = ae;
    }
    if (Object.keys(accs).length) e.accounts = accs;
    if (had || Object.keys(e).length) next.sources[s.id] = e;
  }
  return next;
}

/** Write source-prefs.json from this computer's sources (after every sources.json write). Unchanged content is not rewritten. */
export async function writeSourcePrefs(dataDir, sources, { isDefault } = {}) {
  const f = fileOf(dataDir);
  return withLock(f, async () => {
    const had = existsSync(f);
    const cur = had ? await readJson(f, { fallback: null }).catch(() => null) : null;
    if (had && !isObj(cur)) return false;                  // unreadable right now: next write
    const next = overlayPrefs(cur, sources, { isDefault });
    if (!had && !Object.keys(next.sources).length) return false;
    if (had && stable(next) === stable({ version: 1, ...cur })) return false;
    await writeJson(f, next, { trailingNewline: true });
    return true;
  });
}

/** source-prefs.json as it is now, or null. */
export async function readSourcePrefs(dataDir) {
  const v = await readJson(fileOf(dataDir), { fallback: null }).catch(() => null);
  return isObj(v) && isObj(v.sources) ? v : null;
}

/**
 * Lay the choices in `prefs` over `sources` (in place): only sources and
 * accounts that exist; clean(field, value) -> the value to use, or undefined
 * to leave it. -> how many fields changed.
 */
export function applyPrefs(sources, prefs, { clean = (k, v) => v } = {}) {
  if (!prefs || !isObj(prefs.sources)) return 0;
  let n = 0;
  const set = (o, k, raw) => {
    const v = clean(k, raw);
    if (v === undefined || stable(o[k]) === stable(v)) return;
    o[k] = v; n++;
  };
  for (const s of Array.isArray(sources) ? sources : []) {
    const p = s && prefs.sources[s.id];
    if (!isObj(p)) continue;
    for (const k of SOURCE_FIELDS) if (Object.hasOwn(p, k) && !(k === 'enabled' && s.account)) set(s, k, p[k]);
    if (!isObj(p.accounts) || !Array.isArray(s.accounts)) continue;
    for (const a of s.accounts) {
      const q = a && p.accounts[a.id];
      if (!isObj(q)) continue;
      for (const k of ACCOUNT_FIELDS) if (Object.hasOwn(q, k)) set(a, k, q[k]);
    }
  }
  return n;
}

/**
 * A copy of another computer's source (lib/remote-jobs.mjs remoteSources: no
 * accounts of its own) wearing the choices in `prefs`: its colour and label,
 * and its calendars or mailboxes with their names, colours and on/off.
 */
export function withPrefs(source, prefs, { clean = (k, v) => v } = {}) {
  const p = prefs && isObj(prefs.sources) ? prefs.sources[source && source.id] : null;
  if (!isObj(p)) return source;
  const out = { ...source };
  for (const k of ['label', 'colour']) if (Object.hasOwn(p, k)) { const v = clean(k, p[k]); if (v !== undefined) out[k] = v; }
  if (isObj(p.accounts)) {
    const have = new Map((Array.isArray(out.accounts) ? out.accounts : []).map(a => [a.id, a]));
    for (const [id, q] of Object.entries(p.accounts)) {
      if (!KEY_RE.test(id) || !isObj(q)) continue;
      const a = { ...(have.get(id) || { id, name: id }) };
      for (const k of ACCOUNT_FIELDS) if (Object.hasOwn(q, k)) { const v = clean(k, q[k]); if (v !== undefined) a[k] = v; }
      have.set(id, a);
    }
    out.accounts = [...have.values()];
  }
  return out;
}

// server/actions/journal.mjs - <data>/state/actions-journal.json
//
//   history      the last batches applied through the actions layer, newest
//                last: {token, at, version, prevVersion, source, client,
//                summary, ops, entities:[{key, before, after}], undone?, undoOf?}
//                `entities` (what undo needs) is kept for the newest
//                KEEP_UNDOABLE entries; older ones stay listed but cannot be
//                undone any more.
//   idem         idempotencyKey -> {at, response}   (kept 24 hours)
//   proposals    id -> {at, ops, preview, ...}       (kept 7 days)
//
// PROPOSALS ARE A SYNCED FILE (<data>/state/proposals.json, lib/sync/manifest.mjs
// SYNC_FILES 'proposals'): a change the assistant (or an MCP client in propose
// mode) proposed on one computer shows, and can be applied or dismissed, on
// every computer, and its status follows: applied or dismissed on one shows on
// the other, and the apply path refuses a proposal that is not pending
// (server/actions/index.mjs, under the state lock). On disk each proposal is an
// item of a list (merged by id) and the ops applied so far are a MAP
// {opIndex: true} (merged entry by entry), so two computers applying different
// parts both count; the status is derived from it (all ops applied = applied).
// The rest of the journal (undo history with its snapshots, idempotency keys)
// belongs to this computer and stays in actions-journal.json. An older journal
// that still holds proposals hands them over on its next write.
//
// Written with lib/fsutil (atomic, OneDrive-safe) under its own lock. When a
// state write and a journal write happen together the state lock is taken
// first, always in that order, so the two can never deadlock: state, then the
// journal, then the proposals file (the sync engine takes state, then the
// synced files; it never takes the journal's lock).

import { join } from 'node:path';
import { withLock, writeJson, readJson } from '../../lib/fsutil.mjs';

export const KEEP_HISTORY = 200;
export const KEEP_UNDOABLE = 60;
export const IDEM_TTL_MS = 24 * 3600 * 1000;
export const PROPOSAL_TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_ENTITY_BYTES = 6 * 1024 * 1024;

const empty = () => ({ version: 1, history: [], idem: {}, proposals: {} });
/** The synced proposals file, relative to the data folder (lib/sync/manifest.mjs SYNC_FILES 'proposals'). */
export const PROPOSALS_REL = 'state/proposals.json';
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v);

/**
 * The proposals file -> {id: proposal} as the actions layer uses it
 * (appliedIdx a sorted list, status derived: every op applied = 'applied').
 */
export function proposalsFromFile(doc) {
  const out = {};
  const list = isObj(doc) && Array.isArray(doc.proposals) ? doc.proposals : [];
  for (const x of list) {
    if (!isObj(x) || typeof x.id !== 'string' || !x.id || ['__proto__', 'constructor', 'prototype'].includes(x.id)) continue;
    const { id, applied, ...p } = x;
    const idx = isObj(applied) ? Object.keys(applied).filter(k => applied[k] && /^\d{1,4}$/.test(k)).map(Number).sort((a, b) => a - b) : [];
    const n = Array.isArray(p.ops) ? p.ops.length : 0;
    p.appliedIdx = idx;
    if (isObj(p.createdIds)) p.createdIds = { ...p.createdIds }; else delete p.createdIds;
    // Two computers applying different parts both count (the map merged them): all applied is applied,
    // even when the other one's status said pending or dismissed.
    if (n && idx.length >= n) p.status = 'applied';
    else if (!['pending', 'applied', 'dismissed'].includes(p.status)) p.status = 'pending';
    p.at = Number(p.at) || 0;
    out[id] = p;
  }
  return out;
}
/** {id: proposal} -> the proposals file (oldest first; appliedIdx as a map {opIndex: true}). */
export function proposalsToFile(map) {
  const list = Object.entries(map || {}).filter(([, p]) => isObj(p)).map(([id, p]) => {
    const { appliedIdx, ...rest } = p;
    const n = Array.isArray(p.ops) ? p.ops.length : 0;
    // A whole proposal applied in one click has no appliedIdx: every op is applied.
    const idx = p.status === 'applied' && !(Array.isArray(appliedIdx) && appliedIdx.length) ? [...Array(n).keys()] : (Array.isArray(appliedIdx) ? appliedIdx : []);
    const applied = {};
    for (const i of idx) if (Number.isInteger(i) && i >= 0) applied[String(i)] = true;
    return { id, ...rest, at: Number(p.at) || 0, applied };
  }).sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  return { version: 1, proposals: list };
}

export function createJournal(stateDir, { now = () => Date.now(), proposalsFile } = {}) {
  const file = join(stateDir, 'actions-journal.json');
  const pfile = proposalsFile || join(stateDir, 'proposals.json');

  async function loadProposals(strict) {
    const doc = await readJson(pfile, { fallback: null }).catch((e) => { if (strict) throw e; return null; });
    return proposalsFromFile(doc);
  }
  // strict (used before a write): a journal that exists but cannot be READ
  // (locked by another program) throws instead of counting as empty - writing
  // an empty journal would lose the undo history and idempotency keys.
  // A corrupt (unparseable) journal still starts afresh.
  async function load(strict = false) {
    const j0 = await readJson(file, { fallback: null }).catch((e) => { if (strict) throw e; return null; });
    const j = !j0 || typeof j0 !== 'object' || !Array.isArray(j0.history) ? empty() : j0;
    j.idem = j.idem && typeof j.idem === 'object' ? j.idem : {};
    // The synced file is the proposals' home; an older journal's own ones (not in the file) come along.
    const legacy = j.proposals && typeof j.proposals === 'object' ? j.proposals : {};
    const props = await loadProposals(strict);
    let moved = 0;
    for (const [id, p] of Object.entries(legacy)) if (p && typeof p === 'object' && !Object.hasOwn(props, id)) { props[id] = p; moved++; }
    j.proposals = props;
    Object.defineProperty(j, '_moved', { value: moved, enumerable: false });
    return j;
  }

  function prune(j) {
    const t = now();
    for (const [k, v] of Object.entries(j.idem)) if (!v || t - v.at > IDEM_TTL_MS) delete j.idem[k];
    for (const [k, v] of Object.entries(j.proposals)) if (!v || t - v.at > PROPOSAL_TTL_MS) delete j.proposals[k];
    const props = Object.entries(j.proposals).sort((a, b) => b[1].at - a[1].at);
    for (const [k] of props.slice(100)) delete j.proposals[k];
    if (j.history.length > KEEP_HISTORY) j.history = j.history.slice(-KEEP_HISTORY);
    let bytes = 0;
    for (let i = j.history.length - 1, n = 0; i >= 0; i--, n++) {
      const h = j.history[i];
      if (!h.entities) continue;
      bytes += JSON.stringify(h.entities).length;
      if (n >= KEEP_UNDOABLE || bytes > MAX_ENTITY_BYTES) { delete h.entities; h.expired = true; }
    }
    return j;
  }

  /** Read-modify-write under the journal lock, then the proposals file's (the sync engine's lock on it). fn(j) may return a value. */
  async function update(fn) {
    return withLock(file, () => withLock(pfile, async () => {
      const j = await load(true);
      const before = JSON.stringify(sortKeys(proposalsToFile(j.proposals)));
      const out = await fn(j);
      prune(j);
      const doc = proposalsToFile(j.proposals);
      // Only a real change rewrites the synced file (each write is a sync pass's work).
      if (j._moved || JSON.stringify(sortKeys(doc)) !== before) await writeJson(pfile, doc, { trailingNewline: true });
      const { proposals, ...rest } = j;
      await writeJson(file, { ...rest, proposals: {} });
      return out;
    }));
  }

  const brief = (h) => ({
    token: h.token, at: new Date(h.at).toISOString(), version: h.version, source: h.source, ...(h.client ? { client: h.client } : {}),
    summary: h.summary, ops: h.ops, ...(h.undoOf ? { undoOf: h.undoOf } : {}),
    ...(h.undone ? { undone: { at: new Date(h.undone.at).toISOString(), by: h.undone.by } } : {}),
    undoable: !!(h.entities && !h.undone),
    // What it touched (entity keys such as 'task:<id>'; the Home "What changed" widget opens a
    // single task from them). Only while the entry can still be undone (older ones drop entities).
    ...(Array.isArray(h.entities) ? { touched: h.entities.slice(0, 20).map(e => e.key), touchedCount: h.entities.length } : {}),
  });

  return {
    file, proposalsFile: pfile, load, update,
    async history(limit = 20) {
      const j = await load();
      return j.history.slice(-limit).reverse().map(brief);
    },
    async entry(token) { return (await load()).history.find(h => h.token === token) || null; },
    async latestFor(version) {
      const j = await load();
      for (let i = j.history.length - 1; i >= 0; i--) if (j.history[i].version === version) return brief(j.history[i]);
      return null;
    },
    async idem(key) {
      const v = await this.idemEntry(key);
      return v ? v.response : null;
    },
    /** {at, response, opsHash?} for a key used in the last 24 hours, else null. */
    async idemEntry(key) {
      const j = await load();
      const v = Object.hasOwn(j.idem, key) ? j.idem[key] : null;
      return v && now() - v.at <= IDEM_TTL_MS ? v : null;
    },
    async getProposal(id) {
      const j = await load();
      const p = j.proposals[id];
      if (!p || now() - p.at > PROPOSAL_TTL_MS) return null;
      return { id, ...p, at: new Date(p.at).toISOString() };
    },
  };
}

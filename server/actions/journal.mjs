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
// Written with lib/fsutil (atomic, OneDrive-safe) under its own lock. When a
// state write and a journal write happen together the state lock is taken
// first, always in that order, so the two can never deadlock.

import { join } from 'node:path';
import { withLock, writeJson, readJson } from '../../lib/fsutil.mjs';

export const KEEP_HISTORY = 200;
export const KEEP_UNDOABLE = 60;
export const IDEM_TTL_MS = 24 * 3600 * 1000;
export const PROPOSAL_TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_ENTITY_BYTES = 6 * 1024 * 1024;

const empty = () => ({ version: 1, history: [], idem: {}, proposals: {} });

export function createJournal(stateDir, { now = () => Date.now() } = {}) {
  const file = join(stateDir, 'actions-journal.json');

  // strict (used before a write): a journal that exists but cannot be READ
  // (locked by another program) throws instead of counting as empty - writing
  // an empty journal would lose the undo history and idempotency keys.
  // A corrupt (unparseable) journal still starts afresh.
  async function load(strict = false) {
    const j = await readJson(file, { fallback: null }).catch((e) => { if (strict) throw e; return null; });
    if (!j || typeof j !== 'object' || !Array.isArray(j.history)) return empty();
    j.idem = j.idem && typeof j.idem === 'object' ? j.idem : {};
    j.proposals = j.proposals && typeof j.proposals === 'object' ? j.proposals : {};
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

  /** Read-modify-write under the journal lock. fn(j) may return a value. */
  async function update(fn) {
    return withLock(file, async () => {
      const j = await load(true);
      const out = await fn(j);
      await writeJson(file, prune(j));
      return out;
    });
  }

  const brief = (h) => ({
    token: h.token, at: new Date(h.at).toISOString(), version: h.version, source: h.source, ...(h.client ? { client: h.client } : {}),
    summary: h.summary, ops: h.ops, ...(h.undoOf ? { undoOf: h.undoOf } : {}),
    ...(h.undone ? { undone: { at: new Date(h.undone.at).toISOString(), by: h.undone.by } } : {}),
    undoable: !!(h.entities && !h.undone),
  });

  return {
    file, load, update,
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

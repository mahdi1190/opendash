/* ============================================================
   SELECT LISTS + PROPOSAL SUBSETS: the pure rules (owner: Shell/Design)
   Behind the shared select list (11-ui-select.js) and "apply only the
   ticked changes" of an assistant proposal. No DOM and no page globals:
   lib/select-logic.mjs evaluates this file for Node, so the actions layer
   applies a proposal subset with the SAME rules the page uses to tick and
   untick, and tests/select-logic.test.mjs checks them.

   Selection (ids in display order; `on` is a Set of ticked ids; `locked`
   holds ids that cannot change: applied, or not selectable)
     selRange(order, from, to)              ids between two rows (shift-click)
     selSet(on, ids, value, locked)         tick/untick -> the ids that changed
     selAllIds / selInvertIds(order, on, locked)
     selState(order, on, locked)            'none' | 'some' | 'all' (the master box)
     selKeep(order, on, seen, defaultOn)    keep ticks across a re-render; new rows get the default
     selCountText(n, m)                     '2 of 5 selected'
   Proposal ops (an op names a task it creates with ref:'a'; later ops use '$a')
     opsRefDeps(ops)                        per op: the earlier ops it needs (direct)
     opsTickClosure(deps, i)                i + everything it needs (transitive)
     opsUntickClosure(deps, i)              i + everything that needs it (transitive)
     opsSubset(ops, only, {applied, createdIds})
                                            the ops to send for a subset: prerequisites
                                            added, refs to ops already applied replaced
                                            by the ids they created; index[k] = the
                                            original number of the k-th op sent
     opsRemapPreview(preview, index)        a subset's preview/errors back to original numbers
   ============================================================ */

/** The ids between `from` and `to` (inclusive) in display order; just [to] when `from` is not shown. */
function selRange(order, from, to) {
  const a = order.indexOf(from), b = order.indexOf(to);
  if (b < 0) return [];
  if (a < 0) return [to];
  return order.slice(Math.min(a, b), Math.max(a, b) + 1);
}
/** Tick (value true) or untick ids, skipping locked ones. Returns the ids that changed. */
function selSet(on, ids, value, locked) {
  const changed = [];
  for (const id of ids) {
    if (locked && locked.has(id)) continue;
    if (value && !on.has(id)) { on.add(id); changed.push(id); }
    else if (!value && on.has(id)) { on.delete(id); changed.push(id); }
  }
  return changed;
}
function selAllIds(order, on, locked) { return order.filter(id => !(locked && locked.has(id))); }
/** What is ticked after Invert: every selectable row that was not ticked. */
function selInvertIds(order, on, locked) { return order.filter(id => !(locked && locked.has(id)) && !on.has(id)); }
function selState(order, on, locked) {
  const open = order.filter(id => !(locked && locked.has(id)));
  const n = open.filter(id => on.has(id)).length;
  return !n ? 'none' : n === open.length ? 'all' : 'some';
}
/**
 * After a re-render: forget ticks of rows that are gone, and give rows not
 * seen before their default (defaultOn(id) -> bool). Mutates `on` and `seen`.
 */
function selKeep(order, on, seen, defaultOn) {
  const now = new Set(order);
  for (const id of [...on]) if (!now.has(id)) on.delete(id);
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (defaultOn && defaultOn(id)) on.add(id);
  }
  return on;
}
function selCountText(n, m) { return `${n} of ${m} selected`; }

/* ---------- proposal ops ---------- */
const _OPS_REF_RE = /^[A-Za-z0-9_-]{1,40}$/;
/** The fields of an op ({op, ...params} or {op, params}). */
function _opsParams(op) {
  if (!op || typeof op !== 'object') return {};
  return op.params && typeof op.params === 'object' && !Array.isArray(op.params) ? op.params : op;
}
/** The ref name an op defines (task.create / task.promote_subtask {ref:'a'}), or null. */
function opsRefOf(op) {
  const r = _opsParams(op).ref;
  return typeof r === 'string' && _OPS_REF_RE.test(r) ? r : null;
}
/** Every '$name' string inside an op (any depth), the op's own ref field left out. */
function _opsUses(op) {
  const out = [];
  const walk = (v, key, depth) => {
    if (depth > 8) return;
    if (typeof v === 'string') { if (key !== 'ref' && v.length > 1 && v[0] === '$' && _OPS_REF_RE.test(v.slice(1))) out.push(v.slice(1)); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x, null, depth + 1); return; }
    if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], k, depth + 1);
  };
  walk(op, null, 0);
  return out;
}
/**
 * deps[i] = the earlier ops op i needs (the latest op before it that defined each ref it uses).
 * A person made earlier in the batch counts too: person.create {id:'sam-lee'} (or its name)
 * is needed by a later op whose person / people names that id or name (task.link_person,
 * task.create {people}), so a link is never applied without the person it links.
 */
function opsRefDeps(ops) {
  const list = Array.isArray(ops) ? ops : [];
  const defined = new Map(), persons = new Map();
  const fold = (v) => String(v || '').trim().toLowerCase();
  return list.map((op, i) => {
    const need = new Set();
    for (const name of _opsUses(op)) if (defined.has(name)) need.add(defined.get(name));
    const pr = _opsParams(op);
    if (op && op.op !== 'person.create') {
      const who = [pr.person, ...(Array.isArray(pr.people) ? pr.people : [])].filter(x => typeof x === 'string');
      for (const w of who) if (persons.has(fold(w))) need.add(persons.get(fold(w)));
    }
    const ref = opsRefOf(op);
    if (ref) defined.set(ref, i);
    if (op && op.op === 'person.create') for (const k of [pr.id, pr.name]) if (typeof k === 'string' && k.trim()) persons.set(fold(k), i);
    return [...need].sort((a, b) => a - b);
  });
}
function _opsWalk(start, next) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (seen.has(i)) continue;
    seen.add(i);
    for (const j of next(i) || []) if (!seen.has(j)) stack.push(j);
  }
  return [...seen].sort((a, b) => a - b);
}
/** Ticking op i also ticks everything it needs. */
function opsTickClosure(deps, i) { return _opsWalk(i, (k) => deps[k]); }
/** Unticking op i also unticks everything that needs it. */
function opsUntickClosure(deps, i) {
  const rev = deps.map(() => []);
  deps.forEach((need, k) => { for (const d of need) if (rev[d]) rev[d].push(k); });
  return _opsWalk(i, (k) => rev[k]);
}
/**
 * The ops to send when only some of a proposal's ops are applied.
 *   only        original op numbers the user ticked
 *   applied     op numbers applied earlier (left out; their refs are resolved)
 *   createdIds  {opNumber: id} the ids those earlier applies created
 * -> {ops, index, added, missing, error?}
 *   index[k]  the original number of ops[k]   added  prerequisites the user had not ticked
 *   missing   refs to applied ops whose new id is unknown (cannot be sent)
 */
function opsSubset(ops, only, o) {
  o = o || {};
  const list = Array.isArray(ops) ? ops : [];
  const deps = opsRefDeps(list);
  const done = new Set((o.applied || []).map(Number));
  const created = o.createdIds || {};
  const asked = new Set();
  for (const raw of Array.isArray(only) ? only : []) {
    const i = Number(raw);
    if (!Number.isInteger(i) || i < 0 || i >= list.length) return { ops: [], index: [], added: [], missing: [], error: `there is no change number ${raw} in this proposal` };
    asked.add(i);
  }
  const want = new Set();
  for (const i of asked) if (!done.has(i)) for (const k of opsTickClosure(deps, i)) if (!done.has(k)) want.add(k);
  const index = [...want].sort((a, b) => a - b);
  const missing = [];
  // Which op defines each ref at each position (refs may be reused later in a batch).
  const definer = [];
  const latest = new Map();
  list.forEach((op, i) => { definer[i] = new Map(latest); const r = opsRefOf(op); if (r) latest.set(r, i); });
  const swap = (v, defs, key, depth) => {
    if (depth > 8) return v;
    if (typeof v === 'string') {
      if (key === 'ref' || v.length < 2 || v[0] !== '$') return v;
      const name = v.slice(1);
      const at = defs.get(name);
      if (at === undefined || !done.has(at)) return v;
      const id = created[at];
      if (typeof id === 'string' && id) return id;
      if (!missing.includes(name)) missing.push(name);
      return v;
    }
    if (Array.isArray(v)) return v.map(x => swap(x, defs, null, depth + 1));
    if (v && typeof v === 'object') { const out = {}; for (const k of Object.keys(v)) out[k] = swap(v[k], defs, k, depth + 1); return out; }
    return v;
  };
  const out = index.map(i => swap(list[i], definer[i], null, 0));
  return { ops: out, index, added: index.filter(i => !asked.has(i)), missing };
}
/** A subset's preview entries (or errors) carry index = position in the subset: give them the original numbers. */
function opsRemapPreview(preview, index) {
  return (Array.isArray(preview) ? preview : []).map(p => (p && Number.isInteger(p.index) && index[p.index] !== undefined ? Object.assign({}, p, { index: index[p.index] }) : p));
}

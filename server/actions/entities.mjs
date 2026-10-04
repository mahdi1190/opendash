// server/actions/entities.mjs - before/after snapshots of the things an op
// touches, so a batch can be undone exactly and an undo can tell whether
// someone changed the same thing since.
//
// An entity key is one of
//   task:<id>       the task entry + its status, pin, notes, completion log,
//                   seed-deleted flag and bin entries (the activity log is
//                   append-only and never rolled back)
//   person:<id>     the person entry
//   countdowns      the whole countdown list (order matters)
//   tagRegistry     the canonical tag list, when the state has one
//   resource:<id>   one Files & links entry (state.resources)
//   autolink:<id>   one task's auto-link suggestions + rejected/applied memory (state.autolink)

import { clone, same } from './model.mjs';

const has = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);
// Whole top-level keys the calendar/email ops snapshot as one entity ('key:<name>').
const CALENDAR_KEYS = new Set(['calendarSettings', 'emailTriage', 'reviews',   // + ops-brief.mjs (state.reviews)
  'pinnedTags', 'quickTemplates', 'taskTemplates', 'viewFilter']);              // + tag rename/merge/delete (ops.mjs retagElsewhere)
const val = (o, k) => (has(o, k) ? clone(o[k]) : null);

function registryKey(s) { return has(s, 'tagRegistry') ? 'tagRegistry' : has(s, 'tags') ? 'tags' : 'tagRegistry'; }

// ops-autolink.mjs: state.autolink is snapshotted PER TASK ('autolink:<taskId>'), so undoing
// one auto-link batch does not conflict with later suggestion runs for other tasks. An entry
// belongs to every task its key names ('<task>|<type>|<ref>', or '<a>|task|<b>' for two tasks).
export function autolinkKeyTasks(key) {
  const p = String(key || '').split('|');
  return p[1] === 'task' ? [p[0], p.slice(2).join('|')] : [p[0]];
}
const alOf = (s) => (s.autolink && typeof s.autolink === 'object' && !Array.isArray(s.autolink) ? s.autolink : null);
function autolinkSnap(s, tid) {
  const a = alOf(s) || {};
  const mine = (k) => autolinkKeyTasks(k).includes(tid);
  return {
    suggestions: (Array.isArray(a.suggestions) ? a.suggestions : []).filter(x => x && mine(x.key)).map(clone),
    rejected: Object.fromEntries(Object.entries(a.rejected || {}).filter(([k]) => mine(k)).map(([k, v]) => [k, clone(v)])),
    applied: Object.fromEntries(Object.entries(a.applied || {}).filter(([k]) => mine(k)).map(([k, v]) => [k, clone(v)])),
  };
}
// Pending suggestions are recomputed all the time (every run, every edit): restoring a task's entity
// puts its memory back exactly and its suggestions back MERGED (the old ones return, newer ones stay),
// and only the memory counts as "changed since" for the undo conflict check (comparable below).
function autolinkRestore(s, tid, snap) {
  const a = alOf(s) || (s.autolink = {});
  const mine = (k) => autolinkKeyTasks(k).includes(tid);
  const cur = Array.isArray(a.suggestions) ? a.suggestions : [];
  const back = new Map(snap.suggestions.map(x => [x.key, x]));
  const done = (k) => Object.hasOwn(snap.applied, k) || Object.hasOwn(snap.rejected, k);
  const keepNewer = cur.filter(x => x && mine(x.key) && !back.has(x.key) && !done(x.key));
  a.suggestions = cur.filter(x => !(x && mine(x.key))).concat(snap.suggestions.map(clone), keepNewer);
  a.rejected = Object.fromEntries(Object.entries(a.rejected || {}).filter(([k]) => !mine(k)).concat(Object.entries(snap.rejected).map(([k, v]) => [k, clone(v)])));
  a.applied = Object.fromEntries(Object.entries(a.applied || {}).filter(([k]) => !mine(k)).concat(Object.entries(snap.applied).map(([k, v]) => [k, clone(v)])));
}

export function snapshot(s, key) {
  const [kind, ...rest] = key.split(':');
  const id = rest.join(':');
  if (kind === 'task') {
    const custom = s.custom || [];
    const index = custom.findIndex(t => t && t.id === id);
    return {
      item: index >= 0 ? clone(custom[index]) : null,
      index,
      status: val(s.statuses, id), pinned: val(s.pinned, id), notes: val(s.notes, id),
      deleted: val(s.deleted, id), completionLog: val(s.completionLog, id),
      bin: (s.bin && Array.isArray(s.bin.tasks) ? s.bin.tasks : []).filter(b => b && b.id === id).map(clone),
    };
  }
  if (kind === 'person') {
    const people = s.people || [];
    const index = people.findIndex(p => p && p.id === id);
    return { item: index >= 0 ? clone(people[index]) : null, index };
  }
  if (kind === 'countdowns') return clone(s.countdowns || []);
  if (kind === 'resource') {                                             // ops-resources.mjs: one Files & links entry
    const list = Array.isArray(s.resources) ? s.resources : [];
    const index = list.findIndex(r => r && r.id === id);
    return { item: index >= 0 ? clone(list[index]) : null, index };
  }
  if (kind === 'tagRegistry') return { key: registryKey(s), value: val(s, registryKey(s)) };
  if (kind === 'streams') return { value: val(s, 'streams') };          // ops-streams.mjs
  if (kind === 'home') return { value: val(s, 'home') };                 // ops-home.mjs: Home's Focus settings
  if (kind === 'eventMeta') return { value: val(s.eventMeta, id) };      // ops-calendar.mjs: one event's notes/links
  if (kind === 'autolink') return autolinkSnap(s, id);                    // ops-autolink.mjs: one task's suggestions + memory
  if (kind === 'key' && CALENDAR_KEYS.has(id)) return { value: val(s, id) };   // ops-calendar.mjs: a whole top-level key
  throw new Error('unknown entity ' + key);
}

/** The comparable part of a snapshot (index positions do not count as a change). */
export function comparable(key, snap, forUndo = false) {
  if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return snap;
  if (forUndo && String(key).startsWith('autolink:')) return { rejected: snap.rejected, applied: snap.applied };   // suggestions churn (see autolinkRestore)
  const { index, ...rest } = snap;
  return rest;
}
export const sameSnap = (key, a, b, forUndo = false) => same(comparable(key, a, forUndo), comparable(key, b, forUndo));

function setOrDelete(s, mapKey, id, v) {
  if (v === null || v === undefined) { if (s[mapKey]) delete s[mapKey][id]; return; }
  s[mapKey] = s[mapKey] || {};
  s[mapKey][id] = clone(v);
}

/** Put entity `key` back to `snap` in state `s` (mutates s). */
export function restore(s, key, snap) {
  const [kind, ...rest] = key.split(':');
  const id = rest.join(':');
  if (kind === 'task') {
    s.custom = s.custom || [];
    const at = s.custom.findIndex(t => t && t.id === id);
    if (!snap.item) { if (at >= 0) s.custom.splice(at, 1); }
    else if (at >= 0) s.custom[at] = clone(snap.item);
    else s.custom.splice(Math.max(0, Math.min(snap.index >= 0 ? snap.index : s.custom.length, s.custom.length)), 0, clone(snap.item));
    setOrDelete(s, 'statuses', id, snap.status);
    setOrDelete(s, 'pinned', id, snap.pinned);
    setOrDelete(s, 'notes', id, snap.notes);
    setOrDelete(s, 'deleted', id, snap.deleted);
    setOrDelete(s, 'completionLog', id, snap.completionLog);
    s.bin = s.bin || { tasks: [], notes: [] };
    s.bin.tasks = (s.bin.tasks || []).filter(b => !(b && b.id === id)).concat(snap.bin.map(clone));
    return;
  }
  if (kind === 'person') {
    s.people = s.people || [];
    const at = s.people.findIndex(p => p && p.id === id);
    if (!snap.item) { if (at >= 0) s.people.splice(at, 1); }
    else if (at >= 0) s.people[at] = clone(snap.item);
    else s.people.splice(Math.max(0, Math.min(snap.index >= 0 ? snap.index : s.people.length, s.people.length)), 0, clone(snap.item));
    return;
  }
  if (kind === 'countdowns') { s.countdowns = clone(snap); return; }
  if (kind === 'resource') {                                             // ops-resources.mjs
    s.resources = Array.isArray(s.resources) ? s.resources : [];
    const at = s.resources.findIndex(r => r && r.id === id);
    if (!snap.item) { if (at >= 0) s.resources.splice(at, 1); }
    else if (at >= 0) s.resources[at] = clone(snap.item);
    else s.resources.splice(Math.max(0, Math.min(snap.index >= 0 ? snap.index : s.resources.length, s.resources.length)), 0, clone(snap.item));
    return;
  }
  if (kind === 'tagRegistry') {
    if (snap.value === null) delete s[snap.key];
    else s[snap.key] = clone(snap.value);
    return;
  }
  if (kind === 'streams') {                                              // ops-streams.mjs
    if (snap.value === null) delete s.streams;
    else s.streams = clone(snap.value);
    return;
  }
  if (kind === 'home') {                                                 // ops-home.mjs: Home's Focus settings
    if (snap.value === null) delete s.home;
    else s.home = clone(snap.value);
    return;
  }
  if (kind === 'eventMeta') { setOrDelete(s, 'eventMeta', id, snap.value); return; }   // ops-calendar.mjs
  if (kind === 'autolink') { autolinkRestore(s, id, snap); return; }                    // ops-autolink.mjs
  if (kind === 'key' && CALENDAR_KEYS.has(id)) {
    if (snap.value === null) delete s[id];
    else s[id] = clone(snap.value);
    return;
  }
  throw new Error('unknown entity ' + key);
}

/**
 * A recorder for one batch: touch(key) before the first change to an entity
 * stores its "before"; finish() collects the "after" of every touched one.
 */
export function recorder(s) {
  const before = new Map();
  return {
    touch(key) { if (!before.has(key)) before.set(key, snapshot(s, key)); },
    keys: () => [...before.keys()],
    finish(state = s) {
      const out = [];
      for (const [key, b] of before) {
        const a = snapshot(state, key);
        if (!sameSnap(key, a, b)) out.push({ key, before: b, after: a });
      }
      return out;
    },
  };
}

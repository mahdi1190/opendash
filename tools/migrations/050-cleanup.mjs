// 050-cleanup - leftovers that make counts and views wrong. Generic, no plan.
//
//   1. junk keys: entries whose key holds a line break or is blank (text
//      dropped onto a list was taken as a task id) in statuses, notes,
//      pinned, taskActivity and completionLog, and non-task strings in
//      customOrder lists;
//   2. orphans: statuses/notes/pins of binned tasks are copied INTO their bin
//      record (so restoring brings them back) and removed from the live maps;
//      for tasks deleted for good, notes go to the notes bin (restorable) and
//      statuses, pins, activity and completion times go to the archive;
//      customOrder entries for tasks that no longer exist are dropped;
//   3. subtasks titled "[ ] ..." / "[x] ..." lose the literal box (and "[x]"
//      ticks the subtask);
//   4. descriptions with stacked "**Sync YYYY-MM-DD:**" layers keep the newest
//      layer and the original description; the layers in between become dated
//      notes on the task (nothing is lost);
//   5. completion logs: completions stamped within 10 minutes of the previous
//      one (a repeating task clicked forward several times) are archived, so
//      Wins counts each completion once.
// Everything removed goes to state.cleanupArchive['050-cleanup'] (never
// deleted). Idempotent. Reports counts only.

import { runIfMain } from './_lib.mjs';

export const id = '050-cleanup';
export const description = 'Clean junk keys, orphaned statuses/notes/activity, "[ ]" subtasks, stacked sync layers in descriptions and burst completions.';
export const auto = false;

const SEP = '\n\n---\n\n';
const SYNC_RE = /^\*\*Sync (\d{4}-\d{2}-\d{2}):\*\*/;
const BURST_MS = 10 * 60 * 1000;
const isJunkKey = (k) => typeof k !== 'string' || !k.trim() || /[\r\n\t]/.test(k) || k !== k.trim();
const dateTs = (iso, hour = 12) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d, hour); };

export function cleanup(state, { now = Date.now() } = {}) {
  const s = { junkKeys: 0, junkOrder: 0, deadOrder: 0, binStatusCopied: 0, binNotesCopied: 0, orphanStatuses: 0, orphanPins: 0,
    orphanNotesToBin: 0, orphanActivity: 0, orphanCompletions: 0, bracketSubtasks: 0, bracketTasks: 0, layeredTasks: 0,
    layeredOpen: 0, layersMoved: 0, detailCharsBefore: 0, detailCharsAfter: 0, burstCompletions: 0, burstTasks: 0 };
  const archive = (state.cleanupArchive = state.cleanupArchive && typeof state.cleanupArchive === 'object' ? state.cleanupArchive : {});
  const arc = archive[id] || { statuses: {}, pinned: {}, taskActivity: {}, completionLog: {}, customOrder: {}, junk: {} };
  let archived = false;
  const put = (bucket, key, val) => {
    archived = true;
    arc[bucket] = arc[bucket] || {};
    if (Array.isArray(val) && Array.isArray(arc[bucket][key])) arc[bucket][key] = [...arc[bucket][key], ...val];
    else arc[bucket][key] = val;
  };
  const custom = Array.isArray(state.custom) ? state.custom : [];
  const liveIds = new Set(custom.filter(t => t && t.id).map(t => t.id));
  const binTasks = state.bin && Array.isArray(state.bin.tasks) ? state.bin.tasks : [];
  const binById = new Map();
  for (const b of binTasks) if (b && b.id && b.kind !== 'board' && !liveIds.has(b.id)) binById.set(b.id, b);
  const st = state.statuses && typeof state.statuses === 'object' ? state.statuses : (state.statuses = {});
  const notes = state.notes && typeof state.notes === 'object' ? state.notes : (state.notes = {});
  const pinned = state.pinned && typeof state.pinned === 'object' ? state.pinned : (state.pinned = {});
  const act = state.taskActivity && typeof state.taskActivity === 'object' ? state.taskActivity : (state.taskActivity = {});
  const comp = state.completionLog && typeof state.completionLog === 'object' ? state.completionLog : (state.completionLog = {});

  // 1. junk keys
  for (const [name, map] of [['statuses', st], ['notes', notes], ['pinned', pinned], ['taskActivity', act], ['completionLog', comp]]) {
    for (const k of Object.keys(map)) {
      if (!isJunkKey(k)) continue;
      put('junk', name + ':' + JSON.stringify(k).slice(1, 60), map[k]);
      delete map[k]; s.junkKeys++;
    }
  }
  if (state.customOrder && typeof state.customOrder === 'object') {
    for (const [view, list] of Object.entries(state.customOrder)) {
      if (!Array.isArray(list)) continue;
      const keep = [], drop = [];
      for (const x of list) {
        if (typeof x === 'string' && liveIds.has(x) && !keep.includes(x)) keep.push(x);
        else { drop.push(x); if (typeof x === 'string' && !isJunkKey(x) && !/\s/.test(x)) s.deadOrder++; else s.junkOrder++; }
      }
      if (drop.length) { put('customOrder', view, drop); state.customOrder[view] = keep; }
    }
  }
  // 2. orphans
  state.bin = state.bin && typeof state.bin === 'object' ? state.bin : { tasks: [], notes: [] };
  state.bin.notes = Array.isArray(state.bin.notes) ? state.bin.notes : [];
  for (const k of Object.keys(st)) {
    if (liveIds.has(k)) continue;
    const b = binById.get(k);
    if (b) { if ((!b.status || b.status === 'todo') && st[k] && st[k] !== 'todo') { b.status = st[k]; s.binStatusCopied++; } }
    else { put('statuses', k, st[k]); }
    delete st[k]; s.orphanStatuses++;
  }
  for (const k of Object.keys(pinned)) {
    if (liveIds.has(k)) continue;
    const b = binById.get(k);
    if (b) { if (!b.pinned && pinned[k]) b.pinned = true; } else put('pinned', k, pinned[k]);
    delete pinned[k]; s.orphanPins++;
  }
  for (const k of Object.keys(notes)) {
    if (liveIds.has(k)) continue;
    const list = Array.isArray(notes[k]) ? notes[k] : [];
    const b = binById.get(k);
    if (b) {
      const have = Array.isArray(b.notes) ? b.notes : [];
      const add = list.filter(n => n && !have.some(h => h && (h.id === n.id || h.text === n.text)));
      if (add.length) { b.notes = [...have, ...add.map(n => ({ ...n }))]; s.binNotesCopied += add.length; }
    } else {
      for (const n of list) if (n && n.text) { state.bin.notes.push({ binTs: now, taskId: k, taskTitle: '(deleted task)', note: { ...n } }); s.orphanNotesToBin++; }
    }
    delete notes[k];
  }
  for (const k of Object.keys(act)) {
    if (liveIds.has(k) || binById.has(k)) continue;
    put('taskActivity', k, act[k]); delete act[k]; s.orphanActivity++;
  }
  for (const k of Object.keys(comp)) {
    if (liveIds.has(k) || binById.has(k)) continue;
    put('completionLog', k, comp[k]); delete comp[k]; s.orphanCompletions++;
  }
  // 3. "[ ] " subtasks
  const fixSubs = (t) => {
    let n = 0;
    for (const sub of Array.isArray(t.subtasks) ? t.subtasks : []) {
      if (!sub || typeof sub.title !== 'string') continue;
      const m = /^\s*\[\s*([xX✓✔]?)\s*\]\s*/.exec(sub.title);
      if (!m || m[0].length >= sub.title.length) continue;
      sub.title = sub.title.slice(m[0].length);
      if (m[1]) sub.done = true;
      n++;
    }
    return n;
  };
  for (const t of custom) { if (!t) continue; const n = fixSubs(t); if (n) { s.bracketSubtasks += n; s.bracketTasks++; } }
  for (const b of binTasks) if (b && b.customData) fixSubs(b.customData);
  // 4. stacked sync layers
  for (const t of custom) {
    if (!t || typeof t.detail !== 'string' || !t.detail.includes('**Sync ')) continue;
    const parts = t.detail.split(SEP);
    let lead = 0;
    while (lead < parts.length && SYNC_RE.test(parts[lead])) lead++;
    if (lead < 2) continue;
    const base = lead < parts.length ? parts[parts.length - 1] : null;
    const middle = parts.slice(1, base === null ? parts.length : parts.length - 1);
    if (!middle.length) continue;
    s.detailCharsBefore += t.detail.length;
    const list = Array.isArray(notes[t.id]) ? notes[t.id] : [];
    let prevTs = now;
    const created = [];
    middle.forEach((text, i) => {
      const m = SYNC_RE.exec(text) || /(\d{4}-\d{2}-\d{2})/.exec(text.slice(0, 80));
      let ts = m ? dateTs(m[1]) : prevTs - 1000;
      if (ts >= prevTs) ts = prevTs - 1000;
      prevTs = ts;
      const body = text.trim();
      if (!body || list.some(n => n && n.text === body)) return;
      created.push({ id: `n-${id}-${t.id}-${i}`.slice(0, 120), ts, text: body, via: 'migration' });
    });
    notes[t.id] = [...list, ...created].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    t.detail = base === null ? parts[0] : parts[0] + SEP + base;
    s.detailCharsAfter += t.detail.length;
    s.layeredTasks++; s.layersMoved += middle.length;
    if ((st[t.id] || 'todo') !== 'done') s.layeredOpen++;
  }
  // 5. burst completions
  for (const [k, list] of Object.entries(comp)) {
    if (!Array.isArray(list) || list.length < 2) continue;
    const sorted = list.filter(x => Number.isFinite(x)).sort((a, b) => a - b);
    const keep = [], drop = [];
    for (const ts of sorted) { if (keep.length && ts - keep[keep.length - 1] < BURST_MS) drop.push(ts); else keep.push(ts); }
    if (drop.length) { comp[k] = keep; put('completionLog', k, drop); s.burstCompletions += drop.length; s.burstTasks++; }
  }
  if (archived) { arc.at = arc.at || new Date(now).toISOString(); archive[id] = arc; }
  else if (!Object.keys(archive).length) delete state.cleanupArchive;
  return s;
}

export async function run(ctx) {
  const state = await ctx.state.read();
  if (!state) return { changed: false, notes: ['no state file yet: nothing to do'] };
  const original = JSON.stringify(state);
  const completionsBefore = Object.values(state.completionLog || {}).reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);
  const s = cleanup(state);
  const completionsAfter = Object.values(state.completionLog || {}).reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);
  const changed = JSON.stringify(state) !== original;
  const notes = [
    `junk keys removed: ${s.junkKeys}; junk text in saved orders: ${s.junkOrder}; dead ids in saved orders: ${s.deadOrder}`,
    `orphan statuses: ${s.orphanStatuses} (${s.binStatusCopied} copied into their bin record), pins: ${s.orphanPins}`,
    `orphan notes: ${s.binNotesCopied} copied into bin records, ${s.orphanNotesToBin} moved to the notes bin; orphan activity logs archived: ${s.orphanActivity}; orphan completion logs archived: ${s.orphanCompletions}`,
    `subtasks with a literal "[ ]": ${s.bracketSubtasks} on ${s.bracketTasks} tasks`,
    `descriptions with stacked sync layers: ${s.layeredTasks} (${s.layeredOpen} open); ${s.layersMoved} older layers became notes; description text ${s.detailCharsBefore} -> ${s.detailCharsAfter} characters`,
    `burst completions archived: ${s.burstCompletions} on ${s.burstTasks} tasks; completions ${completionsBefore} -> ${completionsAfter}`,
  ];
  if (changed) await ctx.state.write(state);
  return { changed, notes, stats: s };
}

await runIfMain(import.meta.url, { id, description, auto, run });

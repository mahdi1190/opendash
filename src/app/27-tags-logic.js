/* ============================================================
   TAGS - pure functions (no DOM, no globals, no I/O). Owner: Tags.

   Shared with Node exactly like 52-people-link.js: lib/people-tags.mjs loads
   both files, so the tag manager, the actions layer and migration 040 all
   rename/merge/clean tags with this one implementation. Every name starts
   with tgl / TGL_. Uses ppl* functions from 52-people-link.js.

   The tag rule (shown in the tag manager): tags say what KIND of work a
   task is, or which cross-stream project it belongs to. Nothing else:
   streams go in the stream, people in People, urgency in priority or pin,
   timing in the due date / status / repeat fields.

   state.tagRegistry (optional) is the canonical list:
     [{id, pinned?, archived?, color?, icon?, note?}]   (plain strings also read;
     color/icon = the tag's marker, set from right-click > Colour & symbol)
   Known tags = the registry + every tag in use. Archived tags stay on their
   tasks but leave the sidebar and the pickers. A state without a registry
   simply treats every used tag as known.
   ============================================================ */

// Tags that describe state, timing or urgency: each has a proper field.
const TGL_STATUS = {
  urgent: 'priority', 'must-do': 'priority', important: 'priority', 'high-priority': 'priority', asap: 'priority', 'action-required': 'priority', priority: 'priority',
  today: 'date', tomorrow: 'date', overdue: 'date', deadline: 'date', 'this-week': 'date', 'next-week': 'date', due: 'date',
  recurring: 'recurrence', cadence: 'recurrence', repeat: 'recurrence', repeating: 'recurrence',
  doing: 'status', 'in-progress': 'status', wip: 'status', done: 'status', todo: 'status', 'to-do': 'status', started: 'status',
  blocked: 'waiting', blocker: 'waiting',
};
const TGL_FIELD_LABEL = { priority: 'use priority or pin', date: 'use the due date', recurrence: 'use repeat', status: 'use the status', waiting: "use 'waiting'" };

/** Canonical form: lower-case, '#' dropped, spaces/underscores to '-', letters/digits/'-' only. */
function tglNorm(v) {
  let s = String(v == null ? '' : v).normalize('NFKC').toLowerCase().trim().replace(/^#+/, '').replace(/[\s_/]+/g, '-');
  s = s.replace(/[^\p{L}\p{N}-]/gu, '').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  return Array.from(s).slice(0, 40).join('').replace(/-$/, '');
}
function tglSlug(v) { return pplFold(v).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/** Registry entries as objects, or null when the state has none. */
function tglRegistry(state) {
  const r = state && state.tagRegistry;
  if (!Array.isArray(r)) return null;
  const out = [];
  for (const x of r) {
    const e = typeof x === 'string' ? { id: x } : (x && typeof x === 'object' ? Object.assign({}, x, { id: x.id || x.name || x.tag }) : null);
    if (e && e.id && !out.some(o => o.id === e.id)) out.push(e);
  }
  return out;
}
function tglEntry(state, tag) { const r = tglRegistry(state); return r ? r.find(e => e.id === tag) || null : null; }
function tglIsArchived(state, tag) { const e = tglEntry(state, tag); return !!(e && e.archived); }
function tglIsPinned(state, tag) {
  const e = tglEntry(state, tag);
  if (e && e.pinned) return true;
  return Array.isArray(state && state.pinnedTags) && state.pinnedTags.includes(tag);
}

/** Usage over live tasks (and the bin): Map tag -> {open, total, done, bin}. */
function tglUsage(state) {
  const map = new Map();
  const st = (state && state.statuses) || {}, del = (state && state.deleted) || {};
  const get = (t) => { let r = map.get(t); if (!r) { r = { open: 0, total: 0, done: 0, bin: 0 }; map.set(t, r); } return r; };
  for (const t of Array.isArray(state && state.custom) ? state.custom : []) {
    if (!t || del[t.id]) continue;
    const seen = new Set();
    for (const tag of Array.isArray(t.tags) ? t.tags : []) {
      if (typeof tag !== 'string' || !tag || seen.has(tag)) continue;
      seen.add(tag);
      const r = get(tag); r.total++;
      if (st[t.id] === 'done') r.done++; else r.open++;
    }
  }
  for (const b of (state && state.bin && Array.isArray(state.bin.tasks)) ? state.bin.tasks : []) {
    for (const tag of (b && b.customData && Array.isArray(b.customData.tags)) ? b.customData.tags : []) if (typeof tag === 'string' && tag) get(tag).bin++;
  }
  return map;
}
/** Every known tag: registry + used on live tasks. */
function tglKnown(state) {
  const s = new Set();
  for (const e of tglRegistry(state) || []) s.add(e.id);
  for (const [t, u] of tglUsage(state)) if (u.total) s.add(t);
  return s;
}
/** Stream ids and slugged stream labels: a tag equal to one repeats a stream. */
function tglStreamKeys(state) {
  const keys = new Set();
  for (const s of Array.isArray(state && state.streams) ? state.streams : []) {
    if (!s || !s.id) continue;
    keys.add(tglNorm(s.id)); if (s.label) keys.add(tglSlug(s.label));
  }
  for (const t of Array.isArray(state && state.custom) ? state.custom : []) if (t && typeof t.stream === 'string' && t.stream) keys.add(tglNorm(t.stream));
  keys.delete('');
  return keys;
}

/**
 * Why a tag looks wrong: [{kind, label}] with kind one of
 * stream | person | status | single | unused | archived. ctx = {streamKeys, index, usage, state}.
 */
function tglFlags(tag, ctx) {
  const out = [];
  const u = (ctx.usage && ctx.usage.get(tag)) || { open: 0, total: 0 };
  if (ctx.streamKeys && ctx.streamKeys.has(tag)) out.push({ kind: 'stream', label: 'same as stream' });
  const pid = ctx.index ? pplTagPerson(tag, ctx.index) : null;
  if (pid) { const p = ctx.index.byId.get(pid); out.push({ kind: 'person', label: 'a person' + (p && p.name ? ': ' + p.name : ''), personId: pid }); }
  const f = TGL_STATUS[tag] || (/^(phase|tier|wave|sprint)-?\d+$/.test(tag) ? 'date' : null);
  if (f) out.push({ kind: 'status', label: TGL_FIELD_LABEL[f] || 'a field', field: f });
  if (u.total === 1) out.push({ kind: 'single', label: 'used once' });
  if (!u.open && u.total) out.push({ kind: 'unused', label: 'no open tasks' });
  if (ctx.state && tglIsArchived(ctx.state, tag)) out.push({ kind: 'archived', label: 'archived' });
  return out;
}

/** Grouping key for near-duplicates: no hyphens, singular. */
function tglKey(t) {
  let k = String(t).replace(/-/g, '');
  if (k.length > 4 && /s$/.test(k) && !/(ss|us|is)$/.test(k)) k = k.slice(0, -1);
  return k;
}
/** One letter missing or extra ("meetng"/"meeting"). Swapped letters are NOT typos here: writing/waiting are different words. */
function tglDist1(a, b) {
  if (Math.abs(a.length - b.length) !== 1) return false;
  if (a.length < b.length) { const x = a; a = b; b = x; }
  let i = 0, j = 0, skipped = false;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (skipped) return false;
    skipped = true; i++;
  }
  return true;
}
/**
 * Near-duplicate groups: plural/singular, hyphen variants, -ing forms and
 * one-letter typos (6+ letters). -> [{into, from:[...], tasks}] where into is
 * the most used (registry tags win).
 */
function tglSimilar(state, usage) {
  usage = usage || tglUsage(state);
  const reg = new Set((tglRegistry(state) || []).map(e => e.id));
  const tags = [...usage.keys()].filter(t => usage.get(t).total);
  const parent = new Map(tags.map(t => [t, t]));
  const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  const join = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  const byKey = new Map();
  for (const t of tags) { const k = tglKey(t); if (byKey.has(k)) join(t, byKey.get(k)); else byKey.set(k, t); }
  const set = new Set(tags);
  for (const t of tags) {
    if (/ing$/.test(t) && t.length > 6) { const base = t.slice(0, -3); if (set.has(base)) join(t, base); else if (set.has(base + 'e')) join(t, base + 'e'); }
  }
  const long = tags.filter(t => t.length >= 6);
  for (let i = 0; i < long.length; i++) for (let j = i + 1; j < long.length; j++) {
    if (/\d/.test(long[i]) || /\d/.test(long[j])) continue;
    if (tglDist1(long[i], long[j])) join(long[i], long[j]);
  }
  const groups = new Map();
  for (const t of tags) { const r = find(t); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(t); }
  const out = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    g.sort((a, b) => (reg.has(b) - reg.has(a)) || (usage.get(b).total - usage.get(a).total) || a.length - b.length || (a < b ? -1 : 1));
    const into = g[0], from = g.slice(1);
    out.push({ into, from, tasks: from.reduce((n, t) => n + usage.get(t).total, 0) });
  }
  return out.sort((a, b) => b.tasks - a.tasks);
}

/* ---------- whole-dashboard tag edits (tag manager, actions, migration) ---------- */
// Each edit walks: live tasks, bin copies, quick-add and saved templates,
// the registry and pinnedTags. log(taskId, entry) is called
// for every live task that changed (the caller adds ts/source).

function _tglMapList(list, fn) {
  const out = [];
  for (const t of Array.isArray(list) ? list : []) {
    const r = fn(t);
    for (const x of Array.isArray(r) ? r : [r]) if (x && !out.includes(x)) out.push(x);
  }
  return out;
}
function _tglSame(a, b) { return a.length === b.length && a.every((x, i) => x === b[i]); }
/** Apply fn(tag) -> tag | [tags] | null everywhere. Returns {tasks, open, done, bin, templates}. */
function tglMapEverywhere(state, fn, log, label) {
  const st = state.statuses || {}, del = state.deleted || {};
  const r = { tasks: 0, open: 0, done: 0, bin: 0, templates: 0, taskIds: [] };
  for (const t of Array.isArray(state.custom) ? state.custom : []) {
    if (!t || !Array.isArray(t.tags) || !t.tags.length) continue;
    const before = t.tags.slice();
    const after = _tglMapList(before, fn);
    if (_tglSame(before, after)) continue;
    t.tags = after;
    if (!del[t.id]) { r.tasks++; r.taskIds.push(t.id); if (st[t.id] === 'done') r.done++; else r.open++; }
    if (log) log(t.id, { type: 'tags', from: before, to: after, text: label || 'Tags changed' });
  }
  for (const b of state.bin && Array.isArray(state.bin.tasks) ? state.bin.tasks : []) {
    const d = b && b.customData;
    if (!d || !Array.isArray(d.tags) || !d.tags.length) continue;
    const after = _tglMapList(d.tags, fn);
    if (!_tglSame(d.tags, after)) { d.tags = after; r.bin++; }
  }
  for (const key of ['quickTemplates', 'taskTemplates']) {
    for (const tp of Array.isArray(state[key]) ? state[key] : []) {
      if (!tp || !Array.isArray(tp.tags) || !tp.tags.length) continue;
      const after = _tglMapList(tp.tags, fn);
      if (!_tglSame(tp.tags, after)) { tp.tags = after; r.templates++; }
    }
  }
  if (Array.isArray(state.pinnedTags)) state.pinnedTags = _tglMapList(state.pinnedTags, fn);
  return r;
}
function _tglRegistryEdit(state, fn) {
  const reg = tglRegistry(state);
  if (!reg) return;
  state.tagRegistry = fn(reg);
}

/**
 * Everything else that names a tag by its text: the saved view filter
 * (viewFilter 'tag:x'), the open view, that view's sort/group prefs and
 * other registry entries' aliases. Mutates state; returns what changed
 * (key names only). Used by rename and merge here and in the actions layer.
 */
function tglRenameRefs(s, from, to) {
  const out = [];
  if (!s || !from || !to || from === to) return out;
  const fv = 'tag:' + from, tv = 'tag:' + to;
  if (s.viewFilter === fv || s.viewFilter === '#' + from) { s.viewFilter = tv; out.push('viewFilter'); }
  if (s.view === fv) { s.view = tv; out.push('view'); }
  const p = s.taskViewPrefs;
  if (p && typeof p === 'object' && Object.prototype.hasOwnProperty.call(p, fv)) {
    if (!Object.prototype.hasOwnProperty.call(p, tv)) p[tv] = p[fv];
    delete p[fv]; out.push('taskViewPrefs');
  }
  for (const e of Array.isArray(s.tagRegistry) ? s.tagRegistry : []) {
    if (!e || typeof e !== 'object' || !Array.isArray(e.aliases) || !e.aliases.includes(from)) continue;
    e.aliases = _tglMapList(e.aliases, a => (a === from ? to : a)).filter(a => a !== (e.id || e.name || e.tag));
    if (!out.includes('aliases')) out.push('aliases');
  }
  return out;
}

/** Rename a tag everywhere. If `to` already exists it becomes a merge. */
function tglRename(state, from, to, log) {
  from = tglNorm(from); to = tglNorm(to);
  if (!from || !to || from === to) return { tasks: 0, open: 0, done: 0, bin: 0, templates: 0, taskIds: [] };
  const r = tglMapEverywhere(state, t => (t === from ? to : t), log, `Tag renamed: ${from} -> ${to}`);
  r.refs = tglRenameRefs(state, from, to);
  _tglRegistryEdit(state, reg => {
    const src = reg.find(e => e.id === from), dst = reg.find(e => e.id === to);
    if (src && !dst) src.id = to;
    else if (src && dst) { if (src.pinned) dst.pinned = true; return reg.filter(e => e !== src); }
    return reg;
  });
  return r;
}
/** Merge tags into one (the target is created in the registry if needed). */
function tglMerge(state, froms, into, log) {
  into = tglNorm(into);
  const set = new Set((froms || []).map(tglNorm).filter(t => t && t !== into));
  if (!into || !set.size) return { tasks: 0, open: 0, done: 0, bin: 0, templates: 0, taskIds: [] };
  const r = tglMapEverywhere(state, t => (set.has(t) ? into : t), log, `Tags merged into ${into}: ${[...set].join(', ')}`);
  for (const f of set) tglRenameRefs(state, f, into);
  _tglRegistryEdit(state, reg => {
    const pinned = reg.some(e => set.has(e.id) && e.pinned);
    reg = reg.filter(e => !set.has(e.id));
    let dst = reg.find(e => e.id === into);
    if (!dst) { dst = { id: into }; reg.push(dst); }
    if (pinned) dst.pinned = true;
    return reg;
  });
  return r;
}
/** Remove a tag from every task (and the registry). */
function tglDelete(state, tag, log) {
  tag = tglNorm(tag);
  const r = tglMapEverywhere(state, t => (t === tag ? null : t), log, `Tag removed: ${tag}`);
  _tglRegistryEdit(state, reg => reg.filter(e => e.id !== tag));
  return r;
}
/** Set registry flags (creates the registry and the entry if needed). patch: {pinned, archived, color, icon, note} */
function tglSetFlags(state, tag, patch) {
  tag = tglNorm(tag);
  if (!tag) return null;
  const reg = tglRegistry(state) || [];
  let e = reg.find(x => x.id === tag);
  if (!e) { e = { id: tag }; reg.push(e); }
  for (const k of ['pinned', 'archived']) if (patch && patch[k] !== undefined) { if (patch[k]) e[k] = true; else delete e[k]; }
  for (const k of ['color', 'icon', 'note']) if (patch && patch[k] !== undefined) { if (patch[k]) e[k] = String(patch[k]).slice(0, 200); else delete e[k]; }
  if (e.pinned && e.archived) delete e.pinned;
  state.tagRegistry = reg;
  if (patch && patch.pinned === false && Array.isArray(state.pinnedTags)) state.pinnedTags = state.pinnedTags.filter(t => t !== tag);
  return e;
}
/** Add a tag to the registry (if the state has one). Returns the normalised tag. */
function tglRegister(state, tag) {
  tag = tglNorm(tag);
  if (!tag) return '';
  const reg = tglRegistry(state);
  if (reg && !reg.some(e => e.id === tag)) { reg.push({ id: tag }); state.tagRegistry = reg; }
  return tag;
}

/* ---------- the clean-up engine (migration 040, "Apply suggested clean-up") ---------- */
const TGL_CADENCE = [[/\b(daily|every\s+day|each\s+day)\b/i, 'daily'], [/\b(weekdays|every\s+weekday)\b/i, 'weekdays'],
  [/\b(fortnightly|biweekly|every\s+(two|2)\s+weeks)\b/i, 'biweekly'], [/\b(weekly|every\s+week|per\s+week|a\s+week|each\s+week|\/\s*week)\b/i, 'weekly'],
  [/\b(monthly|every\s+month|each\s+month|per\s+month|first\s+\w+day\s+(of\s+)?(each|every)\s+month)\b/i, 'monthly']];
function _tglDaysUntil(today, iso) {
  if (!today || !iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const a = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const b = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.round((b - a) / 86400000);
}
const _TGL_RANK = { p1: 1, p2: 2, p3: 3, p0: 4 };

/**
 * Clean every tag in the dashboard with a plan. All parts are optional:
 *   plan = { canonical:[tags], stripUnknown:bool, merges:{into:[from...]},
 *            toPeople:{tag: personId}, remove:[tags], addTags:{taskId:[tags]},
 *            urgentWithinDays: 14 }
 * Without a plan only the generic rules run: person tags become people
 * links, a tag equal to the task's own stream goes, status/timing tags move
 * into fields.
 * env = {index (pplBuildIndex), today 'YYYY-MM-DD', log(taskId, entry),
 *        only: ['person'|'stream'|'status'] (default: all generic rules; the
 *        tag manager's clean-up cards apply one rule at a time)}
 * Mutates state; returns counts (no tag names, no task text).
 */
function tglCleanState(state, plan, env) {
  plan = plan || {}; env = env || {};
  const log = env.log || null;
  const only = Array.isArray(env.only) ? new Set(env.only) : null;
  const rule = (k) => !only || only.has(k);
  const idx = env.index || pplBuildIndex(state.people);
  const st = state.statuses || (state.statuses = {});
  const del = state.deleted || {};
  const merges = new Map();
  for (const [into, froms] of Object.entries(plan.merges || {})) for (const f of Array.isArray(froms) ? froms : []) if (tglNorm(f)) merges.set(tglNorm(f), tglNorm(into));
  const toPeople = new Map(Object.entries(plan.toPeople || {}).map(([k, v]) => [tglNorm(k), String(v)]));
  const remove = new Set((plan.remove || []).map(tglNorm));
  const canonical = Array.isArray(plan.canonical) ? plan.canonical.map(tglNorm).filter(Boolean) : null;
  const canon = canonical ? new Set(canonical) : null;
  const strip = !!(plan.stripUnknown && canon);
  const within = Number.isFinite(plan.urgentWithinDays) ? plan.urgentWithinDays : 14;
  const personIds = new Set((Array.isArray(state.people) ? state.people : []).map(p => p && p.id));
  const streams = Array.isArray(state.streams) ? state.streams : [];
  const ownStreamKeys = (sid) => { const s = streams.find(x => x && x.id === sid); return new Set([tglNorm(sid || ''), s && s.label ? tglSlug(s.label) : ''].filter(Boolean)); };
  const usageBefore = tglUsage(state);
  const stats = {
    tagsBefore: [...usageBefore.values()].filter(u => u.total).length,
    openTagsBefore: [...usageBefore.values()].filter(u => u.open).length,
    tasksChanged: 0, openTasksChanged: 0, doneTasksChanged: 0, binTasksChanged: 0,
    peopleLinked: 0, tasksGainingPeople: 0, waitingAdded: 0, priorityRaised: 0, recurrenceSet: 0, statusSet: 0,
    tagsAdded: 0, templatesChanged: 0, tasksOverThreeTags: 0, unknownPersonRefs: 0,
  };

  // One tag -> {tags:[...], person, waiting, field}
  function decide(raw, task) {
    const t = tglNorm(raw);
    const res = { tags: [], person: null, waiting: false, field: null };
    if (!t) return res;
    let pid = toPeople.has(t) ? toPeople.get(t) : null;
    if (pid && !personIds.has(pid)) { stats.unknownPersonRefs++; pid = null; }
    if (!pid && rule('person') && !(canon && canon.has(t)) && !merges.has(t)) pid = pplTagPerson(t, idx);
    if (pid) { res.person = pid; if (pplTagIsWaiting(t)) res.waiting = true; }
    if (merges.has(t)) { res.tags.push(merges.get(t)); return res; }
    if (pid) return res;
    if (rule('stream') && task && ownStreamKeys(task.stream).has(t) && !(canon && canon.has(t) && !remove.has(t))) return res;
    if (rule('status') && TGL_STATUS[t] && !(canon && canon.has(t))) {
      res.field = TGL_STATUS[t];
      if (res.field === 'waiting') res.tags.push('waiting');
      return res;
    }
    if (remove.has(t)) return res;
    if (strip && !canon.has(t)) return res;
    res.tags.push(t);
    return res;
  }

  function cleanTask(task, live) {
    const before = Array.isArray(task.tags) ? task.tags.slice() : [];
    const open = live && st[task.id] !== 'done';
    const tags = [], linked = [], fields = new Set();
    let waiting = false;
    for (const raw of before) {
      const d = decide(raw, task);
      for (const x of d.tags) if (x && !tags.includes(x)) tags.push(x);
      if (d.person && !linked.includes(d.person)) linked.push(d.person);
      if (d.waiting) waiting = true;
      if (d.field) fields.add(d.field + ':' + tglNorm(raw));
    }
    if (waiting && !tags.includes('waiting') && (!canon || canon.has('waiting'))) { tags.push('waiting'); if (live) stats.waitingAdded++; }
    let changed = !_tglSame(before, tags);
    if (changed) task.tags = tags;
    // people links from tags (never re-adding someone the user unlinked)
    if (linked.length) {
      const excluded = new Set(Array.isArray(task.peopleExcluded) ? task.peopleExcluded : []);
      const cur = Array.isArray(task.people) ? task.people.slice() : [];
      const add = linked.filter(id => !cur.includes(id) && !excluded.has(id));
      if (add.length) {
        task.people = [...cur, ...add];
        changed = true;
        if (live) { stats.peopleLinked += add.length; stats.tasksGainingPeople++; }
        if (live && log) for (const id of add) { const p = idx.byId.get(id); log(task.id, { type: 'people', text: `Linked ${p && p.name ? p.name : id} (was a tag)` }); }
      }
    }
    // fields from status tags (open live tasks only)
    if (open) {
      const has = (f) => [...fields].some(x => x.startsWith(f + ':'));
      if (has('priority')) {
        const d = _tglDaysUntil(env.today, task.dueDate);
        const cur = task.priority || 'p0';
        if (d !== null && d <= within && (_TGL_RANK[cur] || 4) > 1) {
          task.priority = 'p1'; changed = true; stats.priorityRaised++;
          if (log) log(task.id, { type: 'priority', from: cur, to: 'p1', reason: 'was tagged urgent' });
        }
      }
      if (has('recurrence') && (!task.recurrence || task.recurrence === 'none')) {
        const hit = TGL_CADENCE.find(([re]) => re.test(String(task.title || '')));
        if (hit) {
          task.recurrence = hit[1]; changed = true; stats.recurrenceSet++;
          if (log) log(task.id, { type: 'recurrence', from: 'none', to: hit[1], reason: 'was tagged recurring' });
        }
      }
      if (has('status') && (st[task.id] || 'todo') === 'todo' && [...fields].some(x => /^status:(doing|in-progress|wip|started)$/.test(x))) {
        st[task.id] = 'doing'; changed = true; stats.statusSet++;
        if (log) log(task.id, { type: 'status', from: 'todo', to: 'doing', reason: 'was tagged in progress' });
      }
    }
    if (changed && live && log && !_tglSame(before, task.tags || [])) log(task.id, { type: 'tags', from: before, to: task.tags || [], text: 'Tags cleaned up' });
    return changed;
  }

  for (const t of Array.isArray(state.custom) ? state.custom : []) {
    if (!t || !t.id) continue;
    const live = !del[t.id];
    if (cleanTask(t, live)) {
      if (live) { stats.tasksChanged++; if (st[t.id] === 'done') stats.doneTasksChanged++; else stats.openTasksChanged++; }
    }
  }
  for (const b of state.bin && Array.isArray(state.bin.tasks) ? state.bin.tasks : []) {
    if (b && b.customData && cleanTask(b.customData, false)) stats.binTasksChanged++;
  }
  // templates: tags only
  const mapOnly = (list) => _tglMapList(list, (raw) => { const d = decide(raw, null); return d.tags; });
  for (const key of ['quickTemplates', 'taskTemplates']) {
    for (const tp of Array.isArray(state[key]) ? state[key] : []) {
      if (!tp || !Array.isArray(tp.tags)) continue;
      const after = mapOnly(tp.tags);
      if (!_tglSame(tp.tags, after)) { tp.tags = after; stats.templatesChanged++; }
    }
  }
  if (Array.isArray(state.pinnedTags)) state.pinnedTags = mapOnly(state.pinnedTags);
  // hand-picked tags for untagged tasks
  for (const [tid, list] of Object.entries(plan.addTags || {})) {
    const t = (state.custom || []).find(x => x && x.id === tid);
    if (!t || del[tid]) continue;
    const cur = Array.isArray(t.tags) ? t.tags.slice() : [];
    const add = (Array.isArray(list) ? list : []).map(tglNorm).filter(x => x && !cur.includes(x) && (!canon || canon.has(x)));
    if (!add.length) continue;
    t.tags = [...cur, ...add];
    stats.tagsAdded += add.length;
    if (log) log(tid, { type: 'tags', from: cur, to: t.tags, text: 'Tags added' });
  }
  // the canonical registry (keeps existing flags)
  if (canonical) {
    const old = tglRegistry(state) || [];
    const reg = canonical.map(id => Object.assign({}, old.find(e => e.id === id) || {}, { id }));
    if (!strip) for (const e of old) if (!reg.some(x => x.id === e.id)) reg.push(e);
    state.tagRegistry = reg;
  }
  const after = tglUsage(state);
  stats.tagsAfter = [...after.values()].filter(u => u.total).length;
  stats.openTagsAfter = [...after.values()].filter(u => u.open).length;
  for (const t of state.custom || []) if (t && !del[t.id] && st[t.id] !== 'done' && Array.isArray(t.tags) && t.tags.length > 3) stats.tasksOverThreeTags++;
  return stats;
}

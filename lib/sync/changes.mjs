// lib/sync/changes.mjs - "What changed": a short, human list of the changes
// your other devices made here ("3 changes from MacBook Pro · 2 min ago:
// renamed a task, changed a budget, hid a calendar").
//
// PLATFORM-AGNOSTIC: no node: imports, no I/O. The sync engine
// (lib/sync/engine.mjs) hands it the registers another device's changes won in
// one pass (nothing new is logged: these are the registers the merge already
// has); the feed keeps the last ~100 entries in this computer's own sync
// folder (changes.json, never synced: it can name tasks).
//
//   describeApplied(won, {before, after})  -> [{key, n, names}] for one pass
//   groupText({key, n})                    -> "renamed 2 tasks"
//   createFeed({max, mergeMs})             -> {add, list, load, toJSON}
//
// One ENTITY (a task, a person, a budget...) counts once per pass, with its
// most telling action: a new task written field by field is "added a task",
// not "renamed a task, rescheduled a task...". Bookkeeping that only follows
// other changes (activity entries, the bin, seen flags, counters, results and
// caches such as mail and calendar snapshots) is left out: the feed is about
// what a person did.

const FILE = 'file:';

// [key, one, many(n)], most telling first: an entity keeps the first of its actions in this order.
const ACTIONS = [
  ['task-add', 'added a task', (n) => `added ${n} tasks`],
  ['task-delete', 'deleted a task', (n) => `deleted ${n} tasks`],
  ['task-done', 'completed a task', (n) => `completed ${n} tasks`],
  ['task-reopen', 'reopened a task', (n) => `reopened ${n} tasks`],
  ['task-rename', 'renamed a task', (n) => `renamed ${n} tasks`],
  ['task-date', 'rescheduled a task', (n) => `rescheduled ${n} tasks`],
  ['task-plan', 'planned a task', (n) => `planned ${n} tasks`],
  ['task-priority', 'changed a priority', (n) => `changed ${n} priorities`],
  ['task-stream', 'moved a task to another stream', (n) => `moved ${n} tasks to another stream`],
  ['task-pin', 'pinned or unpinned a task', (n) => `pinned or unpinned ${n} tasks`],
  ['task-checklist', 'changed a checklist', (n) => `changed ${n} checklists`],
  ['task-tags', 'changed the tags of a task', (n) => `changed the tags of ${n} tasks`],
  ['task-people', 'linked people to a task', (n) => `linked people to ${n} tasks`],
  ['task-edit', 'edited a task', (n) => `edited ${n} tasks`],
  ['task-order', 'reordered tasks', () => 'reordered tasks'],
  ['note-add', 'added a note', (n) => `added ${n} notes`],
  ['note-edit', 'edited a note', (n) => `edited ${n} notes`],
  ['person-add', 'added a person', (n) => `added ${n} people`],
  ['person-delete', 'removed a person', (n) => `removed ${n} people`],
  ['person-edit', 'edited a person', (n) => `edited ${n} people`],
  ['stream-add', 'added a stream', (n) => `added ${n} streams`],
  ['stream-edit', 'changed a stream', (n) => `changed ${n} streams`],
  ['countdown-add', 'added a countdown', (n) => `added ${n} countdowns`],
  ['countdown-edit', 'changed a countdown', (n) => `changed ${n} countdowns`],
  ['resource-edit', 'changed a file or link', (n) => `changed ${n} files or links`],
  ['tags', 'changed tags', () => 'changed tags'],
  ['template', 'changed a template', (n) => `changed ${n} templates`],
  ['board', 'changed a board', (n) => `changed ${n} boards`],
  ['daynote', 'wrote in a daily note', (n) => `wrote in ${n} daily notes`],
  ['event-note', 'added a note to an event', (n) => `added notes to ${n} events`],
  ['review', 'saved a review', (n) => `saved ${n} reviews`],
  ['budget', 'changed a budget', (n) => `changed ${n} budgets`],
  ['category', 'recategorised a payment', (n) => `recategorised ${n} payments`],
  ['bank-account', 'renamed or recoloured a bank account', (n) => `changed ${n} bank accounts`],
  ['cal-hide', 'hid a calendar', (n) => `hid ${n} calendars`],
  ['cal-show', 'showed a calendar', (n) => `showed ${n} calendars`],
  ['cal-settings', 'renamed or recoloured a calendar', (n) => `changed ${n} calendars`],
  ['source', 'changed a calendar or mail source', (n) => `changed ${n} sources`],
  ['account', 'changed a connected account', (n) => `changed ${n} connected accounts`],
  ['roles', 'changed which computer runs a job', () => 'changed which computer runs a job'],
  ['proposal', 'answered an AI proposal', (n) => `answered ${n} AI proposals`],
  ['chat', 'continued a chat', (n) => `continued ${n} chats`],
  ['triage', 'handled an email suggestion', (n) => `handled ${n} email suggestions`],
  ['draft', 'changed an email draft', (n) => `changed ${n} email drafts`],
  ['trip', 'updated a trip', (n) => `updated ${n} trips`],
  ['home', 'changed Home', () => 'changed Home'],
  ['theme', 'changed the theme', () => 'changed the theme'],
  ['layout', 'changed the layout', () => 'changed the layout'],
  ['animation', 'changed animations', () => 'changed animations'],
  ['settings', 'changed your settings', () => 'changed your settings'],
];
const RANK = new Map(ACTIONS.map(([k], i) => [k, i]));
const TEXT = new Map(ACTIONS.map(([k, one, many]) => [k, { one, many }]));

const TASK_FIELD = {
  title: 'task-rename', dueDate: 'task-date', dueTime: 'task-date', recurrence: 'task-date', repeatDay: 'task-date',
  plannedFor: 'task-plan', plannedTime: 'task-plan', plannedMinutes: 'task-plan',
  priority: 'task-priority', stream: 'task-stream', tags: 'task-tags', people: 'task-people', subtasks: 'task-checklist',
};
const LAYOUT = new Set(['density', 'sortBy', 'groupBy', 'taskViewPrefs', 'viewMode', 'peopleView', 'openItemsIn', 'itemHero', 'homeUI', 'collapsedSidebar', 'sidebarLists', 'viewFilter', 'focus', 'sidebarCollapsed', 'paneSizes', 'sidebarOrder']);
// Bookkeeping that follows other changes, counters and memories: never its own line.
const QUIET = new Set(['taskActivity', 'completionLog', 'bin', 'seen', 'uiPrefs', 'drafts', 'suggestStats', 'achievements', 'game', 'lastReviewPrompt', 'chatMeta', 'suggest', 'deleted']);   // ── game ── (2.16) quiet bookkeeping
// Synced files that are a person's edits (everything else under file: is a result or a cache).
const FILE_KIND = {
  'accounts.json': 'account', 'roles.json': 'roles', 'profile.json': 'settings', 'source-prefs.json': 'source',
  'state/proposals.json': 'proposal', 'inbox/drafts.json': 'draft', 'animations/mine.json': 'animation', 'index/settings.json': 'settings',
};

const findById = (arr, id) => (Array.isArray(arr) ? arr.find(x => x && String(x.id) === String(id)) : null);
const short = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60);

/**
 * What one register says a person did: {ent, act, name?} or null (bookkeeping).
 * before / after: the state before and after the pass (for names and "was it new?").
 */
export function classify(path, reg, { before = null, after = null } = {}) {
  if (!Array.isArray(path) || !path.length || !reg) return null;
  const [top, a, b] = path;
  const leaf = path[path.length - 1];
  const alive = leaf === '@alive' && path.length === 3;
  const v = reg.d ? undefined : reg.v;
  const nameIn = (key, id, field = 'title') => {
    const x = findById(after && after[key], id) || findById(before && before[key], id);
    return x ? short(x[field] || x.name || x.label || x.title) : null;
  };
  if (typeof top !== 'string' || QUIET.has(top)) return null;
  if (top === 'custom') {
    if (a == null) return null;
    const name = nameIn('custom', a);
    if (alive) return { ent: `task:${a}`, act: v === true ? (findById(before && before.custom, a) ? 'task-edit' : 'task-add') : 'task-delete', name };
    if (leaf === '@pos' && path.length === 3) return { ent: 'order:tasks', act: 'task-order' };
    return { ent: `task:${a}`, act: TASK_FIELD[b] || 'task-edit', name };
  }
  if (top === 'statuses') {
    if (a == null) return null;
    const name = nameIn('custom', a);
    return { ent: `task:${a}`, act: v === 'done' ? 'task-done' : (before && before.statuses && before.statuses[a] === 'done' ? 'task-reopen' : 'task-edit'), name };
  }
  if (top === 'pinned') return a == null ? null : { ent: `task:${a}`, act: 'task-pin', name: nameIn('custom', a) };
  if (top === 'customOrder' || top === 'boardOrder') return { ent: 'order:tasks', act: 'task-order' };
  if (top === 'taskBoards') return a == null || (leaf === '@pos' && path.length === 3) ? null : { ent: `board:${a}`, act: 'board', name: nameIn('taskBoards', a, 'name') };
  if (top === 'notes') {
    if (a == null || b == null) return null;
    const had = before && before.notes && Array.isArray(before.notes[a]) && before.notes[a].some(n => n && String(n.id) === String(b));
    return { ent: `note:${a}:${b}`, act: had ? 'note-edit' : 'note-add', name: nameIn('custom', a) };
  }
  if (top === 'people' || top === 'peopleNotes') {
    if (a == null) return { ent: 'people', act: 'person-edit' };
    const name = top === 'people' ? nameIn('people', a, 'name') : null;
    if (top === 'people' && alive) return { ent: `person:${a}`, act: v === true ? (findById(before && before.people, a) ? 'person-edit' : 'person-add') : 'person-delete', name };
    return { ent: `person:${a}`, act: 'person-edit', name };
  }
  if (top === 'peopleIgnoredNames' || top === 'peopleIgnoredEmails' || top === 'peopleAutoLink') return { ent: 'people-settings', act: 'person-edit' };
  if (top === 'streams' || top === 'countdowns') {
    if (a == null) return null;
    const kind = top === 'streams' ? 'stream' : 'countdown';
    const name = nameIn(top, a, 'label');
    if (leaf === '@pos' && path.length === 3) return null;
    if (alive && v === true && !findById(before && before[top], a)) return { ent: `${kind}:${a}`, act: `${kind}-add`, name };
    return { ent: `${kind}:${a}`, act: `${kind}-edit`, name };
  }
  if (top === 'resources') return a == null || (leaf === '@pos' && path.length === 3) ? null : { ent: `resource:${a}`, act: 'resource-edit', name: nameIn('resources', a) };
  if (top === 'tagRegistry' || top === 'tags' || top === 'pinnedTags') return { ent: 'tags', act: 'tags' };
  if (top === 'taskTemplates' || top === 'quickTemplates') return { ent: `template:${a == null ? '' : a}`, act: 'template' };
  if (top === 'daynotes') return a == null ? null : { ent: `daynote:${a}`, act: 'daynote', name: String(a).slice(0, 10) };
  if (top === 'eventMeta') return a == null ? null : { ent: `event:${a}`, act: 'event-note' };
  if (top === 'calendarSettings') return { ent: `cal:${a == null ? '' : a}`, act: 'cal-settings' };
  if (top === 'weeklyReviews' || top === 'reviews') return { ent: 'review', act: 'review' };
  if (top === 'calPrefs') {
    if (a === 'hidden' && typeof b === 'string') {
      if (/^cal:/.test(b)) return { ent: `calvis:${b}`, act: v === true ? 'cal-hide' : 'cal-show' };
      return { ent: 'layout', act: 'layout' };
    }
    return { ent: 'layout', act: 'layout' };
  }
  if (top === 'home') return { ent: 'home', act: 'home' };
  if (top === 'theme' || top === 'autoTheme') return { ent: 'theme', act: 'theme' };
  if (LAYOUT.has(top)) return { ent: 'layout', act: 'layout' };
  if (top === 'animPrefs') return { ent: 'animation', act: 'animation' };
  if (top === 'defaultStream' || top === 'archiveDays') return { ent: 'settings', act: 'settings' };
  if (top === 'travel') return { ent: `trip:${a === 'trips' && b ? b : ''}`, act: 'trip' };
  if (top === 'emailTriage') return { ent: `triage:${b == null ? a : b}`, act: 'triage' };
  if (top === 'taskChat') return a == null ? null : { ent: `chat:${a}`, act: 'chat', name: nameIn('custom', a) };
  if (top === 'assistantChat') return { ent: 'chat:assistant', act: 'chat' };
  if (top.startsWith(FILE)) {
    const rel = top.slice(FILE.length);
    if (rel === 'finance-share/edits.json') {
      if (a === 'budgets') return { ent: `budget:${b == null ? '' : b}`, act: 'budget' };
      if (a === 'overrides') return { ent: `category:${b == null ? '' : b}`, act: 'category' };
      if (a === 'accounts') return { ent: `bank:${b == null ? '' : b}`, act: 'bank-account' };
      return null;
    }
    const kind = FILE_KIND[rel];
    if (!kind) return null;
    if (kind === 'proposal') return { ent: `proposal:${b == null ? '' : b}`, act: 'proposal' };
    if (kind === 'draft') return { ent: `draft:${b == null ? '' : b}`, act: 'draft' };
    if (kind === 'account') return { ent: `account:${b == null ? '' : b}`, act: 'account' };
    if (kind === 'source') return { ent: `source:${b == null ? '' : b}`, act: 'source' };
    return { ent: kind, act: kind };
  }
  return null;
}

/**
 * The groups of one pass: [{key, n, names}] in ACTIONS order. won: [[path, reg]]
 * (the registers that won). An entity counts once, under its most telling action.
 */
export function describeApplied(won, ctx = {}) {
  const ents = new Map();   // ent -> {act, name}
  for (const [p, r] of won || []) {
    const c = classify(p, r, ctx);
    if (!c) continue;
    const cur = ents.get(c.ent);
    if (!cur || RANK.get(c.act) < RANK.get(cur.act)) ents.set(c.ent, { act: c.act, name: c.name || (cur && cur.name) || null });
    else if (!cur.name && c.name) cur.name = c.name;
  }
  const groups = new Map();
  for (const [ent, { act, name }] of ents) {
    let g = groups.get(act);
    if (!g) { g = { key: act, n: 0, names: [], ents: [] }; groups.set(act, g); }
    g.n++;
    g.ents.push(ent);
    if (name && g.names.length < 3 && !g.names.includes(name)) g.names.push(name);
  }
  return [...groups.values()].sort((x, y) => RANK.get(x.key) - RANK.get(y.key));
}

/** "renamed a task" / "renamed 2 tasks". */
export function groupText(g) {
  const t = TEXT.get(g && g.key);
  if (!t) return 'made a change';
  return g.n > 1 ? t.many(g.n) : t.one;
}
/** "renamed a task, changed a budget and hid a calendar" (the first `max` groups, then "and N more"). */
export function entryText(entry, max = 4) {
  const gs = (entry && entry.groups) || [];
  const parts = gs.slice(0, max).map(groupText);
  const rest = gs.slice(max).reduce((a, g) => a + g.n, 0);
  if (rest) parts.push(`${rest} more`);
  if (parts.length <= 1) return parts.join('');
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

/**
 * The feed: newest first, at most `max` entries. Passes from the same devices
 * within mergeMs of the last entry are folded into it (a burst of live edits is
 * one line), an entity counted once per entry.
 */
export function createFeed({ max = 100, mergeMs = 2 * 60 * 1000 } = {}) {
  let entries = [];
  let lastEnts = null;   // entity keys per group of the newest entry (memory only)
  const clean = (e) => (e && typeof e === 'object' && Number.isFinite(e.at) && Array.isArray(e.groups) ? {
    id: String(e.id || '').slice(0, 24), at: e.at, until: Number.isFinite(e.until) ? e.until : e.at,
    from: Array.isArray(e.from) ? e.from.map(x => String(x).slice(0, 60)).slice(0, 4) : [],
    count: Number.isInteger(e.count) ? e.count : 0, live: !!e.live,
    groups: e.groups.filter(g => g && TEXT.has(g.key) && Number.isInteger(g.n) && g.n > 0).slice(0, 40)
      .map(g => ({ key: g.key, n: g.n, names: Array.isArray(g.names) ? g.names.map(x => String(x).slice(0, 60)).slice(0, 3) : [] })),
  } : null);
  return {
    /** One pass: {at, from: [names], groups (describeApplied), live}. Returns the entry it went into, or null. */
    add({ at, from = [], groups = [], live = false }) {
      if (!groups.length) return null;
      const names = [...new Set(from.filter(Boolean))].slice(0, 4);
      const head = entries[0];
      if (head && lastEnts && at - head.until <= mergeMs && head.from.join('|') === names.join('|')) {
        for (const g of groups) {
          let hg = head.groups.find(x => x.key === g.key);
          if (!hg) { hg = { key: g.key, n: 0, names: [] }; head.groups.push(hg); }
          const seen = lastEnts.get(g.key) || new Set();
          lastEnts.set(g.key, seen);
          for (const ent of g.ents || []) if (!seen.has(ent)) { seen.add(ent); hg.n++; }
          for (const n of g.names || []) if (hg.names.length < 3 && !hg.names.includes(n)) hg.names.push(n);
        }
        head.groups.sort((x, y) => RANK.get(x.key) - RANK.get(y.key));
        head.count = head.groups.reduce((a, g) => a + g.n, 0);
        head.until = at;
        head.live = head.live || !!live;
        return head;
      }
      const e = { id: `${at.toString(36)}${Math.random().toString(36).slice(2, 6)}`, at, until: at, from: names, live: !!live, groups: groups.map(g => ({ key: g.key, n: g.n, names: (g.names || []).slice(0, 3) })), count: groups.reduce((a, g) => a + g.n, 0) };
      lastEnts = new Map(groups.map(g => [g.key, new Set(g.ents || [])]));
      entries = [e, ...entries].slice(0, max);
      return e;
    },
    list: (n = max) => entries.slice(0, n).map(e => ({ ...e, text: entryText(e) })),
    load(json) {
      try { const o = typeof json === 'string' ? JSON.parse(json) : json; entries = (Array.isArray(o && o.entries) ? o.entries : []).map(clean).filter(Boolean).slice(0, max); }
      catch { entries = []; }
      lastEnts = null;
    },
    toJSON: () => ({ v: 1, entries }),
    get size() { return entries.length; },
  };
}

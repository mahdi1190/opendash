// lib/home-topbar.mjs - the data rules of Home and the top bar, shared by the
// actions layer (server/actions/ops-home.mjs), migration 020-countdowns and the
// tests. Owner: Home / top-bar builder. Pure functions, no I/O.
//
// The page has the same rules in src/app/10-header.js (tbNormalize, tbList) and
// src/app/12-home.js (homeFocusWhy, homeFocusTasks); tests/home-topbar.test.mjs
// runs both on the same data so they cannot drift apart.
//
// Top-bar widget (state.countdowns[], array order = display order, headline first):
//   { id, type: 'countdown'|'countup'|'progress'|'tasks'|'event'|'clock',
//     label, date, time, start, icon, color, style: 'subtle'|'tinted'|'solid',
//     unit: 'days'|'weeks'|'workdays'|'date', headline, showBar, warnDays,
//     hideWhenPast, visible, tasks: 'today'|'overdue'|'week'|'doing'|'pinned',
//     clock: 'both'|'time'|'date' }
// Home settings (state.home):
//   { focus: {count, pinned, p1, overdue, doing, planned, dueSoonDays, streams[]},
//     focusOrder: [taskId], snoozed: {taskId: 'YYYY-MM-DD'},
//     layout: {version: 1, widgets: [{id, size: 's'|'m'|'l'|'full', hidden}]} }
// The layout rules (HOME_WIDGETS, normalizeHomeLayout) are the page's
// homeLayoutNormalize + the widgets' registerHomeWidget() calls (src/app/12-home*.js);
// tests/home-layout.test.mjs runs both on the same data.

export const SWATCHES = Object.freeze(['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate']);
export const WIDGET_TYPES = Object.freeze({
  countdown: { label: 'Countdown', icon: 'hourglass', dated: true },
  countup: { label: 'Count up', icon: 'timer', dated: true },
  progress: { label: 'Progress', icon: 'target', dated: true },
  tasks: { label: 'Tasks due', icon: 'list-checks', dated: false },
  event: { label: 'Next event', icon: 'calendar-clock', dated: false },
  clock: { label: 'Date & time', icon: 'clock', dated: false },
});
export const DATED_TYPES = Object.freeze(['countdown', 'countup', 'progress']);
export const LIVE_TYPES = Object.freeze(['tasks', 'event', 'clock']);
export const UNITS = Object.freeze(['days', 'weeks', 'workdays', 'date']);
export const STYLES = Object.freeze(['subtle', 'tinted', 'solid']);
export const TASK_FILTERS = Object.freeze(['today', 'overdue', 'week', 'doing', 'pinned']);
export const CLOCK_FORMATS = Object.freeze(['both', 'time', 'date']);
export const HOME_FOCUS_DEFAULTS = Object.freeze({ count: 5, pinned: true, p1: true, overdue: true, doing: true, planned: true, dueSoonDays: 3, streams: [] });

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX = /^#[0-9a-f]{3,8}$/i;
const ICON_NAME = /^[a-z][a-z0-9-]*$/;

/** Colour names people (and older files) use, mapped onto the swatches. */
const COLOR_ALIASES = { purple: 'violet', indigo: 'indigo', blue: 'blue', navy: 'blue', teal: 'teal', cyan: 'teal', green: 'green', lime: 'green', yellow: 'amber', amber: 'amber', gold: 'amber', orange: 'orange', red: 'red', crimson: 'red', pink: 'pink', magenta: 'pink', violet: 'violet', grey: 'slate', gray: 'slate', slate: 'slate', black: 'slate' };
/** Emoji used by the old countdown editor, mapped onto sprite icons. */
export const EMOJI_ICONS = Object.freeze({
  '🎓': 'graduation-cap', '📜': 'scroll-text', '📄': 'file-text', '📃': 'file-text', '📝': 'notebook-pen', '📚': 'book-open', '📖': 'book-open',
  '💼': 'briefcase', '🏢': 'building-2', '🏛️': 'landmark', '🏛': 'landmark', '🚀': 'rocket', '🎯': 'target', '🏆': 'trophy', '🥇': 'medal', '⭐': 'star', '🌟': 'star',
  '✈️': 'plane', '✈': 'plane', '🧳': 'luggage', '🏖️': 'palmtree', '🏖': 'palmtree', '🗺️': 'map', '🗺': 'map', '📍': 'map-pin',
  '🎉': 'party-popper', '🥳': 'party-popper', '🎁': 'gift', '🎂': 'cake', '❤️': 'heart', '❤': 'heart', '💍': 'gem',
  '📅': 'calendar', '📆': 'calendar', '🗓️': 'calendar', '🗓': 'calendar', '⏳': 'hourglass', '⌛': 'hourglass', '⏰': 'alarm-clock', '🕒': 'clock',
  '💰': 'coins', '💷': 'banknote', '💵': 'banknote', '💳': 'credit-card', '🏦': 'landmark', '🏠': 'house', '🔑': 'key-round',
  '🔬': 'microscope', '🧪': 'test-tube', '⚗️': 'flask-conical', '🧬': 'dna', '🧠': 'brain', '💡': 'lightbulb', '💻': 'laptop', '📊': 'chart-column', '📈': 'trending-up',
  '🏥': 'hospital', '💊': 'pill', '🏋️': 'dumbbell', '🚗': 'car', '🚆': 'train-front', '🎤': 'mic', '🎵': 'music', '🎟️': 'ticket', '🎟': 'ticket',
  '🤝': 'handshake', '👥': 'users', '📧': 'mail', '✉️': 'mail', '📞': 'phone', '🏁': 'flag', '🚩': 'flag', '♻️': 'recycle', '♻': 'recycle', '🌱': 'sprout',
});

const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) && v !== null && v !== '' ? Math.max(lo, Math.min(hi, n)) : d; };

/** A colour the page can show: a swatch name or #hex; anything else -> fallback. */
export function normColor(c, fallback) {
  if (typeof c !== 'string') return fallback;
  const v = c.trim().toLowerCase();
  if (SWATCHES.includes(v)) return v;
  if (HEX.test(v)) return v;
  return COLOR_ALIASES[v] || fallback;
}

/**
 * Every field filled in, exactly as the page's tbNormalize (10-header.js) does.
 * index = position in the list (for the default colour), legacyHeadline = the
 * pre-2.0 rule "the first countdown is the headline" applies to this one.
 */
export function normalizeWidget(raw, index = 0, legacyHeadline = false) {
  const w = { ...(raw && typeof raw === 'object' ? raw : {}) };
  w.id = String(w.id || '');
  w.type = WIDGET_TYPES[w.type] ? w.type : 'countdown';
  w.label = typeof w.label === 'string' ? w.label : '';
  w.date = ISO.test(w.date || '') ? w.date : '';
  w.time = HHMM.test(w.time || '') ? w.time : '';
  w.start = ISO.test(w.start || '') ? w.start : '';
  w.unit = ({ d: 'days', w: 'weeks', wd: 'workdays' })[w.unit] || (UNITS.includes(w.unit) ? w.unit : 'days');
  w.headline = typeof w.headline === 'boolean' ? w.headline : !!legacyHeadline;
  w.style = STYLES.includes(w.style) ? w.style : (w.headline ? 'tinted' : 'subtle');
  if (!(typeof w.color === 'string' && (SWATCHES.includes(w.color) || HEX.test(w.color)))) {
    w.color = w.headline ? 'indigo' : SWATCHES[((Number(index) || 0) + 1) % SWATCHES.length];
  }
  if (typeof w.icon !== 'string' || !w.icon.trim()) w.icon = WIDGET_TYPES[w.type].icon;
  const dated = WIDGET_TYPES[w.type].dated;
  w.warnDays = Number.isFinite(Number(w.warnDays)) && w.warnDays !== null && w.warnDays !== '' ? clampInt(w.warnDays, 0, 365, 0) : (w.type === 'countdown' ? 14 : 0);
  w.showBar = typeof w.showBar === 'boolean' ? w.showBar : (w.type === 'progress' || (dated && !!w.start));
  w.hideWhenPast = !!w.hideWhenPast;
  w.visible = w.visible !== false;
  w.tasks = TASK_FILTERS.includes(w.tasks) ? w.tasks : 'today';
  w.clock = CLOCK_FORMATS.includes(w.clock) ? w.clock : 'both';
  return w;
}

/** The list as the page shows it: normalised, one headline, headline first. */
export function widgetList(raw) {
  const arr = Array.isArray(raw) ? raw.filter(w => w && typeof w === 'object') : [];
  const legacy = !arr.some(w => typeof w.headline === 'boolean');
  const list = arr.map((w, i) => normalizeWidget(w, i, legacy && i === 0));
  let seen = false;
  for (const w of list) { if (w.headline) { if (seen) w.headline = false; seen = true; } }
  const h = list.findIndex(w => w.headline);
  if (h > 0) list.unshift(list.splice(h, 1)[0]);
  return list;
}

/** What is stored: the normalised widget without fields its type does not use. */
export function storedWidget(w) {
  const o = { ...w };
  if (!o.time) delete o.time;
  if (!o.start) delete o.start;
  if (o.type !== 'tasks') delete o.tasks;
  if (o.type !== 'clock') delete o.clock;
  if (!WIDGET_TYPES[o.type].dated) { delete o.date; delete o.hideWhenPast; delete o.unit; }
  return o;
}

/**
 * Upgrade a pre-2.0 countdown list to the explicit widget schema without
 * changing what the top bar shows: the first one stays the headline, colours
 * and icons are kept (old colour names and emoji mapped onto the design
 * system's swatches and symbols where there is a clear match).
 * Returns { list, changed, upgraded } (upgraded = how many entries changed).
 */
export function upgradeCountdowns(raw) {
  const arr = Array.isArray(raw) ? raw.filter(w => w && typeof w === 'object') : [];
  const legacy = !arr.some(w => typeof w.headline === 'boolean');
  let upgraded = 0;
  const out = arr.map((w0, i) => {
    const w = { ...w0 };
    if (!w.id) w.id = `cd-mig-${i + 1}`;
    if (typeof w.color === 'string' && !SWATCHES.includes(w.color) && !HEX.test(w.color)) {
      const m = normColor(w.color, null); if (m) w.color = m; else delete w.color;
    }
    if (typeof w.icon === 'string' && w.icon && !ICON_NAME.test(w.icon)) {
      const k = w.icon.trim();
      const m = EMOJI_ICONS[k] || EMOJI_ICONS[k.replace(/️/g, '')];
      if (m) w.icon = m;
    }
    const n = storedWidget(normalizeWidget(w, i, legacy && i === 0));
    if (JSON.stringify(n) !== JSON.stringify(w0)) upgraded++;
    return n;
  });
  // One headline, and it leads.
  let seen = false;
  for (const w of out) { if (w.headline) { if (seen) { w.headline = false; if (w.style === 'tinted') w.style = 'subtle'; upgraded++; } seen = true; } }
  const h = out.findIndex(w => w.headline);
  if (h > 0) { out.unshift(out.splice(h, 1)[0]); upgraded++; }
  return { list: out, changed: upgraded > 0, upgraded };
}

/** Make `id` the headline (clears the others, moves it first). Mutates list. */
export function setHeadline(list, id) {
  const w = list.find(x => x.id === id);
  if (!w) return list;
  for (const x of list) if (x !== w && x.headline) { x.headline = false; if (x.style === 'tinted') x.style = 'subtle'; }
  w.headline = true;
  if (w.style === 'subtle') w.style = 'tinted';
  const i = list.indexOf(w);
  if (i > 0) { list.splice(i, 1); list.unshift(w); }
  return list;
}

/* ───────────────────────── Home Focus ───────────────────────── */

const daysBetweenIso = (a, b) => {
  const u = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((u(b) - u(a)) / 86400000);
};

/** state.home.focus with defaults and limits applied. */
export function focusConfig(home) {
  const f = { ...HOME_FOCUS_DEFAULTS, ...((home && typeof home === 'object' && home.focus) || {}) };
  f.count = clampInt(f.count, 1, 9, 5);
  f.dueSoonDays = clampInt(f.dueSoonDays, 0, 30, 0);
  for (const k of ['pinned', 'p1', 'overdue', 'doing', 'planned']) f[k] = bool(f[k], HOME_FOCUS_DEFAULTS[k]);
  f.streams = Array.isArray(f.streams) ? f.streams.filter(x => typeof x === 'string') : [];
  return f;
}

/**
 * Why a task is in Focus and its score: the same rules as homeFocusWhy() in
 * src/app/12-home.js. t = a task of state.custom, st = {status, pinned}.
 */
export function focusWhy(t, st, cfg, today) {
  const due = t.dueDate && ISO.test(t.dueDate) ? t.dueDate : null;
  const d = due ? daysBetweenIso(today, due) : null;
  const why = []; let s = 0;
  if (cfg.overdue && d !== null && d < 0) { why.push('overdue'); s += 400 - Math.max(d, -30); }
  else if (d === 0) { why.push('today'); s += 300; }
  if (cfg.doing && st.status === 'doing') { why.push('doing'); s += 250; }
  if (cfg.pinned && st.pinned) { why.push('pinned'); s += 220; }
  if (cfg.planned && t.plannedFor && t.plannedFor <= today) { why.push('planned'); s += 200; }
  const p = t.priority || 'p0';
  if (cfg.p1 && p === 'p1') { why.push('p1'); s += 120; }
  else s += p === 'p2' ? 30 : p === 'p3' ? 10 : 0;
  if (cfg.dueSoonDays && d !== null && d > 0 && d <= cfg.dueSoonDays) { why.push('soon'); s += 100 - d * 10; }
  return { why, score: s, daysLeft: d };
}

/**
 * The Focus list for state s on `today`: manual order (home.focusOrder) first,
 * then by score; snoozed and not-yet-started tasks left out.
 * Returns { config, tasks:[{task, why, score}], candidates, hidden }.
 */
export function focusTasks(s, today, limit) {
  const home = s && typeof s.home === 'object' && s.home ? s.home : {};
  const cfg = focusConfig(home);
  const snoozed = home.snoozed && typeof home.snoozed === 'object' ? home.snoozed : {};
  const order = Array.isArray(home.focusOrder) ? home.focusOrder : [];
  const streams = cfg.streams.length ? new Set(cfg.streams) : null;
  const statuses = s.statuses || {}, pinned = s.pinned || {}, deleted = s.deleted || {};
  const cands = []; let hidden = 0;
  for (const t of (Array.isArray(s.custom) ? s.custom : [])) {
    if (!t || deleted[t.id]) continue;
    const status = statuses[t.id] || 'todo';
    if (status === 'done') continue;
    if (t.startDate && t.startDate > today) continue;
    if (streams && !streams.has(t.stream)) continue;
    const r = focusWhy(t, { status, pinned: !!pinned[t.id] }, cfg, today);
    if (!r.why.length) continue;
    if (snoozed[t.id] && snoozed[t.id] >= today) { hidden++; continue; }
    cands.push({ task: t, why: r.why, score: r.score, o: order.indexOf(t.id) });
  }
  cands.sort((a, b) => {
    if (a.o >= 0 || b.o >= 0) { if (a.o < 0) return 1; if (b.o < 0) return -1; return a.o - b.o; }
    return b.score - a.score;
  });
  return { config: cfg, tasks: cands.slice(0, limit || cfg.count).map(({ o, ...x }) => x), candidates: cands.length, hidden };
}

/* ───────────────────────── Home layout ───────────────────────── */

export const HOME_LAYOUT_VERSION = 1;
/** Widget sizes and the columns (of 12) each takes on a wide screen; phones show one column. */
export const HOME_SIZES = Object.freeze(['s', 'm', 'l', 'full']);
export const HOME_SIZE_COLS = Object.freeze({ s: 4, m: 6, l: 8, full: 12 });
export const HOME_SIZE_NAMES = Object.freeze({ s: 'small (a third)', m: 'medium (half)', l: 'large (two thirds)', full: 'full width' });

/**
 * The widget catalogue in default order. MUST match the page's
 * registerHomeWidget() calls (id, sizes, defaultSize, defaultHidden, order);
 * tests/home-layout.test.mjs fails when they drift. aliases = words people
 * use for it ("move Finances to the top").
 */
export const HOME_WIDGETS = Object.freeze([
  { id: 'today', title: 'Today', sizes: ['l', 'full'], defaultSize: 'full', aliases: ['summary', 'hero', 'today summary', 'today hero', 'brief', 'morning brief', 'start my day'] },
  { id: 'focus', title: 'Focus', sizes: ['m', 'l', 'full'], defaultSize: 'l', aliases: ['focus tasks', 'important tasks', 'tasks', 'focus board'] },
  // The default board is rows of 12 columns ("shelves"): today | focus l + schedule s |
  // finance s + people s + countdowns s | week l + waiting s. Suggested links waits in the gallery.
  { id: 'schedule', title: 'Today’s schedule', sizes: ['s', 'm', 'l'], defaultSize: 's', aliases: ['schedule', 'timeline', 'calendar', 'agenda', 'events', 'today schedule', 'today timeline'] },
  { id: 'links', title: 'Suggested links', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, aliases: ['links', 'suggestions', 'auto-links'] },
  { id: 'finance', title: 'Money', sizes: ['s', 'm', 'l'], defaultSize: 's', aliases: ['finances', 'finance', 'money', 'spending', 'budget', 'spent today'] },
  { id: 'people', title: 'People today', sizes: ['s', 'm'], defaultSize: 's', aliases: ['people', 'follow up', 'follow-up', 'follow ups', 'follow-ups', 'who i am meeting', 'meetings with people'] },
  { id: 'countdowns', title: 'Countdowns', sizes: ['s', 'm'], defaultSize: 's', aliases: ['countdown', 'deadlines', 'dates'] },
  { id: 'week', title: 'This week', sizes: ['l', 'full'], defaultSize: 'l', aliases: ['week', 'week strip', 'upcoming', 'next 7 days'] },
  { id: 'waiting', title: 'Waiting on', sizes: ['s', 'm'], defaultSize: 's', aliases: ['waiting', 'blocked', 'waiting on others', 'chase', 'things to chase'] },
].map(w => Object.freeze({ defaultHidden: false, ...w, sizes: Object.freeze([...w.sizes]), aliases: Object.freeze([...w.aliases]) })));

/**
 * A stored size made legal for a widget: kept when allowed, else the allowed
 * size nearest in columns (ties -> the larger), else the default.
 * Same as homeClampSize() on the page.
 */
export function clampHomeSize(size, sizes, fallback) {
  if (sizes.includes(size)) return size;
  const want = HOME_SIZE_COLS[size];
  if (!want) return sizes.includes(fallback) ? fallback : sizes[0];
  let best = sizes[0], bd = Infinity;
  for (const s of sizes) {
    const d = Math.abs(HOME_SIZE_COLS[s] - want);
    if (d < bd || (d === bd && HOME_SIZE_COLS[s] > HOME_SIZE_COLS[best])) { best = s; bd = d; }
  }
  return best;
}

/**
 * state.home.layout made whole: {version, widgets:[{id, size, hidden}]} in
 * display order. Accepts the stored object or a bare array. Unknown ids and
 * repeats are dropped, sizes clamped, hidden is a boolean, and catalogue
 * widgets that are missing are appended in catalogue order with their
 * defaults. Same as homeLayoutNormalize() on the page.
 */
export function normalizeHomeLayout(raw, catalog = HOME_WIDGETS) {
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && Array.isArray(raw.widgets) ? raw.widgets : []);
  const byId = new Map(catalog.map(c => [c.id, c]));
  const seen = new Set();
  const out = [];
  for (const w of list) {
    if (!w || typeof w !== 'object' || typeof w.id !== 'string') continue;
    const c = byId.get(w.id);
    if (!c || seen.has(w.id)) continue;
    seen.add(w.id);
    out.push({ id: w.id, size: clampHomeSize(w.size, c.sizes, c.defaultSize), hidden: w.hidden === true });
  }
  for (const c of catalog) if (!seen.has(c.id)) out.push({ id: c.id, size: c.defaultSize, hidden: !!c.defaultHidden });
  return { version: HOME_LAYOUT_VERSION, widgets: out };
}

/** A widget by id, title or alias (case-insensitive); null when nothing matches. */
export function findHomeWidget(ref, catalog = HOME_WIDGETS) {
  const q = String(ref || '').trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
  if (!q) return null;
  const plain = (s) => String(s).toLowerCase().replace(/[’']/g, "'");
  return catalog.find(c => c.id === q)
    || catalog.find(c => plain(c.title) === q)
    || catalog.find(c => (c.aliases || []).some(a => plain(a) === q))
    || null;
}

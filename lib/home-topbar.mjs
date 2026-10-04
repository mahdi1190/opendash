// lib/home-topbar.mjs - the data rules of Home and the top bar, shared by the
// actions layer (server/actions/ops-home.mjs), migration 020-countdowns and the
// tests. Owner: Home / top-bar builder (the widget platform: groups, copies,
// widget settings). Pure functions, no I/O.
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
//     layout: {version: 1, widgets: [{id, size: 's'|'m'|'l'|'full', hidden}]},
//     widgetPrefs: {instanceId: {...}} }   each widget's own settings (HOME_WIDGET_PREFS)
// The layout rules (HOME_WIDGETS, normalizeHomeLayout) are the page's
// homeLayoutNormalize + the widgets' registerHomeWidget() calls (src/app/12-home*.js);
// tests/home-layout.test.mjs and tests/home-platform.test.mjs run both on the same data.
// Copies: a widget with multi > 1 can be on Home more than once; copy ids are
// '<id>~<n>' (n = 2..multi), the first copy is the bare id. A copy exists while
// it is in the layout or has a widgetPrefs entry (so an older build that drops
// copy ids from the layout loses nothing: the copies come back with their settings).

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
  // A clock's zone (travel spec 5.1, the page's tbNormalize): 'local' = the dashboard's zone (default), 'home', or an IANA id.
  if (w.type === 'clock' && w.zone && w.zone !== 'local') {
    if (w.zone !== 'home' && !validClockZone(w.zone)) delete w.zone;
  } else delete w.zone;
  if (typeof w.zoneLabel === 'string' && w.zone) w.zoneLabel = w.zoneLabel.slice(0, 40); else delete w.zoneLabel;
  return w;
}
/** An IANA zone id Intl knows ('Asia/Tokyo'), not a bare offset. */
export function validClockZone(z) {
  if (typeof z !== 'string' || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$/.test(z)) return false;
  try { new Intl.DateTimeFormat('en-GB', { timeZone: z }); return true; } catch { return false; }
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
 * The Focus list for state s on `today`: pinned tasks first, then the manual order
 * (home.focusOrder), then by score (the page's homeFocusTasks, src/app/12-home.js); snoozed and not-yet-started tasks left out.
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
    cands.push({ task: t, why: r.why, score: r.score, o: order.indexOf(t.id), pin: !!(cfg.pinned && pinned[t.id]) });
  }
  cands.sort((a, b) => {
    if (a.pin !== b.pin) return a.pin ? -1 : 1;
    if (a.o >= 0 || b.o >= 0) { if (a.o < 0) return 1; if (b.o < 0) return -1; return a.o - b.o; }
    return b.score - a.score;
  });
  return { config: cfg, tasks: cands.slice(0, limit || cfg.count).map(({ o, pin, ...x }) => x), candidates: cands.length, hidden };
}

/* ───────────────────────── Home layout ───────────────────────── */

export const HOME_LAYOUT_VERSION = 1;
/** Widget sizes and the columns (of 12) each takes on a wide screen; phones show one column. */
export const HOME_SIZES = Object.freeze(['s', 'm', 'l', 'full']);
export const HOME_SIZE_COLS = Object.freeze({ s: 4, m: 6, l: 8, full: 12 });
export const HOME_SIZE_NAMES = Object.freeze({ s: 'small (a third)', m: 'medium (half)', l: 'large (two thirds)', full: 'full width' });
/**
 * A widget's optional height, set by dragging its bottom edge in Customise: h rows of
 * HOME_ROW_PX each (the content scrolls inside when taller). No h = as tall as its content.
 */
export const HOME_ROW_PX = 40;
export const HOME_H_MIN = 3;
export const HOME_H_MAX = 30;
/** A valid height in rows, or undefined (auto). Pure. */
export function homeHeightRows(h) {
  return Number.isInteger(h) && h >= HOME_H_MIN && h <= HOME_H_MAX ? h : undefined;
}

/** Add widget groups, in gallery order (a widget without a known group is 'other'). */
export const HOME_WIDGET_GROUPS = Object.freeze({ time: 'Time', tasks: 'Tasks', people: 'People', money: 'Money', files: 'Files & knowledge', wellbeing: 'Wellbeing', fun: 'Fun', system: 'Trust & system', other: 'More' });

/**
 * The widget catalogue in default order. MUST match the page's
 * registerHomeWidget() calls (id, sizes, defaultSize, defaultHidden, order,
 * group, multi); tests/home-layout.test.mjs and tests/home-platform.test.mjs
 * fail when they drift. aliases = words people use for it ("move Finances to
 * the top"). multi = how many copies Home may hold (1 = one).
 */
export const HOME_WIDGETS = Object.freeze([
  { id: 'today', title: 'Today', group: 'time', sizes: ['l', 'full'], defaultSize: 'full', aliases: ['summary', 'hero', 'today summary', 'today hero', 'start my day'] },
  { id: 'focus', title: 'Focus', group: 'tasks', sizes: ['m', 'l', 'full'], defaultSize: 'l', aliases: ['focus tasks', 'important tasks', 'tasks', 'focus board'] },
  // The default board is rows of 12 columns ("shelves"), under the day's hero (not a widget):
  // today (a brand-new folder's welcome only) | focus l + schedule s |
  // finance s + people s + countdowns s | week l + waiting s. Suggested links waits in the gallery.
  { id: 'schedule', title: 'Today’s schedule', group: 'time', sizes: ['s', 'm', 'l'], defaultSize: 's', aliases: ['schedule', 'timeline', 'calendar', 'agenda', 'events', 'today schedule', 'today timeline'] },
  // Suggestions (68-suggest-*.js): shown by default, full width, its own shelf under Focus + schedule.
  { id: 'suggest', title: 'Suggestions', group: 'tasks', sizes: ['s', 'm', 'l', 'full'], defaultSize: 'full', aliases: ['suggestions', 'ideas', 'recommendations', 'what should i do', 'next steps', 'nudges'] },
  { id: 'links', title: 'Suggested links', group: 'files', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, aliases: ['links', 'suggested links', 'auto-links'] },
  { id: 'finance', title: 'Money', group: 'money', sizes: ['s', 'm', 'l'], defaultSize: 's', aliases: ['finances', 'finance', 'money', 'spending', 'budget', 'spent today'] },
  { id: 'people', title: 'People today', group: 'people', sizes: ['s', 'm'], defaultSize: 's', aliases: ['people', 'follow up', 'follow-up', 'follow ups', 'follow-ups', 'who i am meeting', 'meetings with people'] },
  { id: 'countdowns', title: 'Countdowns', group: 'time', sizes: ['s', 'm'], defaultSize: 's', aliases: ['countdown', 'deadlines', 'dates'] },
  { id: 'week', title: 'This week', group: 'time', sizes: ['l', 'full'], defaultSize: 'l', aliases: ['week', 'week strip', 'upcoming', 'next 7 days'] },
  { id: 'waiting', title: 'Waiting on', group: 'people', sizes: ['s', 'm'], defaultSize: 's', aliases: ['waiting', 'blocked', 'waiting on others', 'chase', 'things to chase'] },
  // The v1 widgets (WIDGETS_CATALOGUE.md 3). All hidden by default, so no existing board
  // changes: they wait in Customise > Add widget. Each page file (src/app/12-home-w-<id>.js)
  // starts as a stub (available: false) until its builder finishes it.
  { id: 'capture', title: 'Quick capture', group: 'tasks', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, aliases: ['capture', 'quick add', 'add a task', 'new task', 'to sort'] },
  { id: 'gap', title: 'Fill the gap', group: 'time', sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, aliases: ['gap', 'fill gap', 'free time', 'spare time', 'what next', 'what now'] },
  { id: 'dayplan', title: 'Plan my day', group: 'time', sizes: ['m', 'l', 'full'], defaultSize: 'l', defaultHidden: true, aliases: ['day plan', 'plan my day', 'capacity', 'planner', 'day planner', 'time blocking'] },
  { id: 'nextup', title: 'Meeting prep', group: 'time', sizes: ['s', 'm', 'l', 'full'], defaultSize: 'm', defaultHidden: true, aliases: ['next meeting', 'meeting prep', 'prep', 'next up', 'prepare for meeting'] },
  { id: 'wrapup', title: 'After meetings', group: 'time', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, aliases: ['wrap up', 'wrap-up', 'after meetings', 'meeting notes', 'meeting follow-ups'] },
  { id: 'calcheck', title: 'Invites & clashes', group: 'time', sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, aliases: ['invites', 'invitations', 'clashes', 'conflicts', 'calendar check', 'rsvp', 'double bookings'] },
  { id: 'inbox', title: 'Needs reply', group: 'people', sizes: ['s', 'm', 'l', 'full'], defaultSize: 'm', defaultHidden: true, aliases: ['email', 'emails', 'mail', 'needs reply', 'replies', 'to reply'] },
  { id: 'owe', title: 'I owe', group: 'people', sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, aliases: ['i owe', 'promises', 'what i owe', 'commitments', 'owed'] },
  { id: 'catchup', title: 'Catch up', group: 'tasks', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, aliases: ['catch up', 'catch-up', 'slipped', 'overdue', 'rollover', 'keeps moving', 'stuck'] },
  { id: 'runway', title: 'Deadline runway', group: 'tasks', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, multi: 4, aliases: ['deadline runway', 'pace', 'burn-up', 'burnup', 'on track', 'will i make it'] },
  { id: 'list', title: 'Smart list', group: 'tasks', sizes: ['s', 'm', 'l', 'full'], defaultSize: 'm', defaultHidden: true, multi: 6, aliases: ['smart list', 'saved search', 'search list', 'filter', 'custom list'] },
  { id: 'habits', title: 'Habits & routines', group: 'wellbeing', sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, aliases: ['habits', 'habit', 'routines', 'routine', 'streaks', 'habit tracker'] },
  { id: 'launchpad', title: 'Launchpad', group: 'files', sizes: ['s', 'm', 'l', 'full'], defaultSize: 's', defaultHidden: true, aliases: ['launcher', 'pinned', 'shortcuts', 'favourites', 'favorites', 'bookmarks', 'snippets'] },
  { id: 'spendable', title: 'Payday & safe to spend', group: 'money', sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, aliases: ['safe to spend', 'payday', 'spendable', 'bills', 'balance', 'balances', 'left to spend'] },
  { id: 'notebook', title: 'Daily note', group: 'files', sizes: ['s', 'm', 'l', 'full'], defaultSize: 'm', defaultHidden: true, aliases: ['daily note', 'notes', 'journal', 'lab notebook', 'work log', 'scratchpad'] },
  { id: 'activity', title: 'What changed', group: 'system', sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, aliases: ['what changed', 'changes', 'history', 'undo', 'audit', 'recent changes'] },
  // Travel (travel spec 5.1, 12-home-w-travel.js): hidden until travel features are on and a trip is near.
  { id: 'travel', title: 'Trip', group: 'time', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, aliases: ['trip', 'travel', 'time zone', 'world clock', 'abroad', 'holiday', 'flight'] },
  // Animation of the day (v2.2 wave 5, 12-home-w-animday.js): a small card, waiting in Add widget
  // (the default board is whole shelves of 12).
  { id: 'animday', title: 'Animation of the day', group: 'fun', sizes: ['s', 'm'], defaultSize: 's', defaultHidden: true, aliases: ['animation of the day', 'animation', 'today\'s animation', 'look of the day', 'opening'] },
].map(w => Object.freeze({ defaultHidden: false, group: 'other', multi: 1, ...w, sizes: Object.freeze([...w.sizes]), aliases: Object.freeze([...w.aliases]) })));

/* ───────────────────────── widget settings (state.home.widgetPrefs) ───────────────────────── */

/** The most one copy's settings may take, as JSON. */
export const HOME_WIDGET_PREFS_MAX_BYTES = 4096;
const sBool = (description) => ({ type: 'boolean', description });
const sInt = (minimum, maximum, description) => ({ type: 'integer', minimum, maximum, description });
const sStr = (maxLength, description) => ({ type: 'string', maxLength, description });
const sEnum = (values, description) => ({ type: typeof values[0] === 'number' ? 'integer' : 'string', enum: values, description });
const sIds = (maxItems, description) => ({ type: 'array', items: { type: 'string', minLength: 1, maxLength: 160 }, maxItems, uniqueItems: true, description });
const sObj = (properties, description) => ({ type: 'object', properties, additionalProperties: false, description });
/**
 * Each widget's settings: the keys it accepts and their types, in the JSON Schema subset
 * server/actions/validate.mjs checks (set_home_widget validates against these). Keys
 * not given take the widget's defaults (the `defaults` of its registerHomeWidget()).
 * Written from WIDGETS_CATALOGUE.md section 3; a widget builder who needs another
 * key asks the integrator to add it here (tests/home-platform.test.mjs checks that
 * every page default fits its schema).
 */
export const HOME_WIDGET_PREFS = Object.freeze({
  capture: sObj({ stream: { type: ['string', 'null'], maxLength: 60, description: 'stream id for new tasks (null = the usual default)' }, showSort: sBool('Large: show "To sort" (recent tasks with no date, plan, tags or stream)'), sorted: sIds(200, 'task ids marked "Looks fine"') }),
  gap: sObj({ buffer: sInt(0, 30, 'minutes kept free before the next event'), allowUnestimated: sBool('offer tasks with no estimate in gaps of 45 min or more') }),
  dayplan: sObj({ unestimated: sInt(5, 240, 'minutes assumed for a task with no estimate'), buffer: sInt(0, 30, 'minutes between planned blocks'), book: sBool('Auto-plan books the blocks in Google Calendar (own events, no guests) instead of planned times') }),
  nextup: sObj({ horizonH: sInt(1, 72, 'how many hours ahead to look for the next meeting'), showEmails: sBool('Large: show recent emails with the attendees') }),
  wrapup: sObj({ windowH: sInt(0, 168, 'meetings that ended within this many hours (0 = today only)'), skipRecurring: sBool('leave out repeating meetings') }),
  calcheck: sObj({
    checks: sObj({ reply: sBool('invitations to answer'), clash: sBool('overlapping events'), b2b: sBool('3 h or more back to back'), link: sBool('meetings with no place or call link'), hours: sBool('events outside working hours') }, 'which checks run'),
    days: sInt(1, 60, 'how many days ahead to check'),
    dismissed: { type: 'object', description: '"It\'s fine" choices: problem key -> when it expires' },
  }),
  inbox: sObj({ knownOnly: sBool('only people you know'), maxDays: sEnum([7, 14, 30], 'leave out threads older than this many days') }),
  owe: sObj({ emailRows: sBool('also list emails from people you know waiting 2+ days'), groupByPerson: sBool('Large: group by person') }),
  catchup: sObj({ overdue: sBool('list overdue tasks'), missedPlans: sBool('list tasks planned for a past day'), moves: sInt(2, 10, '"Keeps moving" after this many moves later'), includeRepeating: sBool('include repeating tasks') }),
  runway: sObj({
    countdownId: { type: ['string', 'null'], maxLength: 120, description: 'the countdown it tracks (an id from list_countdowns)' },
    scope: sObj({ kind: sEnum(['stream', 'tag', 'query'], 'what counts towards it'), value: sStr(200, 'the stream id, tag or search') }, 'the tasks that count'),
    unit: sEnum(['tasks', 'steps'], 'count tasks, or checklist steps'),
    countWeekends: sBool('count weekends as working days'),
    since: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'start of the pace window (YYYY-MM-DD; null = automatic)' },
  }),
  list: sObj({ title: sStr(80, 'the list title'), query: sStr(300, 'a task search, e.g. "#onboarding due:week" (open tasks unless it says is:done)'), group: sEnum(['none', 'due', 'stream', 'person'], 'Large: grouping'), limit: sInt(1, 50, 'how many rows'), showDoneToday: sBool('show what was ticked today') }),
  habits: sObj({ mode: sEnum(['auto', 'tag', 'all'], 'auto = #habit tasks, else daily/weekly repeating tasks; tag = only the tag; all = every repeating task'), tag: sStr(60, 'the habit tag (mode tag)'), days: sInt(7, 60, 'days of history shown') }),
  launchpad: sObj({ order: sIds(200, 'resource ids in tile order'), labels: sBool('show labels under the tiles'), groupByStream: sBool('Large: group by stream') }),
  spendable: sObj({ cushion: { type: ['number', 'null'], minimum: 0, maximum: 10000000, description: 'money kept aside, not counted as safe to spend (null = the usual cushion)' }, mode: sEnum(['auto', 'payday', 'month'], 'count to the next payday, or to the end of the month'), accounts: sBool('Large: one row per account') }),
  notebook: sObj({ template: sStr(2000, 'markdown a new day starts with'), onThisDay: sBool('Large: show the same day last month and last year') }),
  activity: sObj({ mine: sBool('also list your own changes'), range: sEnum(['today', '7d'], 'today or the last 7 days') }),
});

/** Settings merged with a patch: null removes a key (back to its default), undefined is ignored. Pure. */
export function mergeWidgetPrefs(cur, patch) {
  const out = { ...(cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype' || v === undefined) continue;
    if (v === null) delete out[k]; else out[k] = v;
  }
  return out;
}

/* ───────────────────────── copies of one widget ───────────────────────── */

const COPY_RE = /^(.+)~([2-9]|[1-9]\d)$/;
/** 'runway~2' -> {base:'runway', n:2}; any other id -> {base:id, n:1}. */
export function splitHomeInstance(id) {
  const s = String(id ?? '');
  const m = COPY_RE.exec(s);
  return m ? { base: m[1], n: Number(m[2]) } : { base: s, n: 1 };
}
/** The catalogue entry an id belongs to: the widget itself, or a copy 2..multi of one; else null. */
export function homeCatalogEntry(id, catalog = HOME_WIDGETS) {
  const { base, n } = splitHomeInstance(id);
  const c = catalog.find(x => x.id === base);
  if (!c) return null;
  return n === 1 || n <= (Number(c.multi) || 1) ? c : null;
}
/** The name of a widget or copy ("Deadline runway 2"). */
export function homeInstanceTitle(id, catalog = HOME_WIDGETS) {
  const c = homeCatalogEntry(id, catalog);
  if (!c) return String(id);
  const { n } = splitHomeInstance(id);
  return n > 1 ? `${c.title} ${n}` : c.title;
}
/**
 * A widget or copy by id ('runway~2'), title, alias, or a name with a copy number
 * ("smart list 2"). -> {id, def, n} or null. Same rules as findHomeWidget for plain names.
 */
export function findHomeInstance(ref, catalog = HOME_WIDGETS) {
  const raw = String(ref ?? '').trim();
  if (homeCatalogEntry(raw, catalog)) { const c = homeCatalogEntry(raw, catalog); return { id: raw, def: c, n: splitHomeInstance(raw).n }; }
  const c0 = findHomeWidget(raw, catalog);
  if (c0) return { id: c0.id, def: c0, n: 1 };
  const m = /^(.+?)\s*(?:~|#|\s)\s*(\d{1,2})$/.exec(raw);
  if (!m) return null;
  const c = findHomeWidget(m[1], catalog);
  const n = Number(m[2]);
  if (!c || n < 1 || n > (Number(c.multi) || 1)) return null;
  return { id: n === 1 ? c.id : `${c.id}~${n}`, def: c, n };
}

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
 * state.home.layout made whole: {version, widgets:[{id, size, hidden, h?}]} in
 * display order. Accepts the stored object or a bare array. Unknown ids and
 * repeats are dropped, sizes clamped, hidden is a boolean, and catalogue
 * widgets that are missing are appended in catalogue order with their
 * defaults. Copies ('<id>~<n>', n = 2..multi) are kept like widgets; a copy
 * that has settings (prefs = state.home.widgetPrefs) but is missing from the
 * layout comes back at the end, shown. Same as homeLayoutNormalize() on the page.
 */
export function normalizeHomeLayout(raw, catalog = HOME_WIDGETS, prefs = null) {
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && Array.isArray(raw.widgets) ? raw.widgets : []);
  const seen = new Set();
  const out = [];
  for (const w of list) {
    if (!w || typeof w !== 'object' || typeof w.id !== 'string') continue;
    const c = homeCatalogEntry(w.id, catalog);
    if (!c || seen.has(w.id)) continue;
    seen.add(w.id);
    const h = homeHeightRows(w.h);
    out.push({ id: w.id, size: clampHomeSize(w.size, c.sizes, c.defaultSize), hidden: w.hidden === true, ...(h ? { h } : {}) });
  }
  // A widget the saved board has never seen (new in this version) goes in after its
  // neighbour in the catalogue, not at the very end: a new default widget then sits
  // beside its neighbour on an existing board too (12-home.js does the same).
  for (let i = 0; i < catalog.length; i++) {
    const c = catalog[i];
    if (seen.has(c.id)) continue;
    // Every earlier catalogue entry is in `out` by now (kept or just added).
    const at = i === 0 ? out.length : out.findIndex(w => w.id === catalog[i - 1].id) + 1;
    out.splice(at, 0,{ id: c.id, size: c.defaultSize, hidden: !!c.defaultHidden });
    seen.add(c.id);
  }
  if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
    const at = (id) => catalog.indexOf(homeCatalogEntry(id, catalog)) * 100 + splitHomeInstance(id).n;
    const lost = Object.keys(prefs).filter(id => !seen.has(id) && splitHomeInstance(id).n > 1 && homeCatalogEntry(id, catalog)).sort((a, b) => at(a) - at(b));
    for (const id of lost) out.push({ id, size: homeCatalogEntry(id, catalog).defaultSize, hidden: false });
  }
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

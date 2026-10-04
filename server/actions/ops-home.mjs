// server/actions/ops-home.mjs - the top bar (widgets) and Home (Focus) for
// assistants and MCP clients. Owner: Home / top-bar builder. ops.mjs and
// queries.mjs merge these in by name, so they REPLACE the earlier countdown.*
// ops and countdowns.list with versions that know the 2.0 widget schema
// (lib/home-topbar.mjs); the tool names stay the same.
//
// Writes
//   countdown.create   [create_countdown]     a dated widget: countdown, count-up or progress
//   countdown.update   [update_countdown]     any field, incl. style, symbol, show-as, headline, visible
//   countdown.delete   [delete_countdown]     (danger: dry run first) the next one becomes the headline
//   countdown.reorder  [reorder_countdowns]   the first listed becomes the headline
//   topbar.add_widget  [add_topbar_widget]    a live widget: tasks due, next event, date & time
//   home.set_focus     [set_home_focus]       what Home's Focus shows, its order, hide/unhide
//   home.set_layout    [set_home_layout]      Home's widgets: move, resize, hide/show, order
//   home.reset_layout  [reset_home_layout]    Home's widgets back to the default arrangement
// The matching reads (list_countdowns, get_home_focus, get_home_layout) are in queries-home.mjs.
//
// Undo: 'countdowns' and 'home' entities (entities.mjs).

import { ActionError, cleanLine, isIsoDate, dateError, daysBetween, weekdayOf, newCountdownId, truncate, LIMITS, addDaysIso } from './model.mjs';
import {
  WIDGET_TYPES, DATED_TYPES, LIVE_TYPES, UNITS, STYLES, TASK_FILTERS, CLOCK_FORMATS, SWATCHES,
  normalizeWidget, widgetList, storedWidget, setHeadline, normColor, focusConfig, EMOJI_ICONS,
  HOME_WIDGETS, HOME_SIZES, HOME_SIZE_NAMES, HOME_LAYOUT_VERSION, normalizeHomeLayout, findHomeWidget,
} from '../../lib/home-topbar.mjs';

const obj = (properties, required = [], extra = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extra });
const DATE = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', formatHint: 'YYYY-MM-DD', description: 'ISO date YYYY-MM-DD (get_context gives today)' };
const S = {
  id: { type: 'string', minLength: 1, maxLength: 120, description: 'widget id from list_countdowns (its exact label also works)' },
  label: { type: 'string', minLength: 1, maxLength: 200, description: 'short label, e.g. "Product launch"' },
  date: { ...DATE, description: 'countdown: the target date; countup: the date it counts from; progress: the end date' },
  time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', formatHint: 'HH:MM', description: 'optional time on the date, 24-hour HH:MM' },
  start: { ...DATE, description: 'start date for the progress bar (required for type progress)' },
  icon: { type: 'string', maxLength: 32, description: "symbol: an icon name such as 'graduation-cap', 'rocket', 'briefcase', 'plane', 'flag', 'calendar', 'target' (lower-case-with-dashes), or one emoji" },
  color: { type: 'string', maxLength: 40, description: `colour: one of ${SWATCHES.join(', ')} (or #RRGGBB)` },
  style: { type: 'string', enum: [...STYLES], description: 'subtle (outline), tinted (soft colour; the headline default) or solid (filled)' },
  unit: { type: 'string', enum: [...UNITS], description: 'show the distance as days, weeks, workdays (Mon-Fri) or the date itself' },
  headline: { type: 'boolean', description: 'true makes it the headline: shown first and emphasised (one per bar)' },
  warnDays: { type: 'integer', minimum: 0, maximum: 365, description: 'the number turns red under this many days (0 = never)' },
  hideWhenPast: { type: 'boolean', description: 'hide it from the bar once the date has passed' },
  showBar: { type: 'boolean', description: 'show a thin progress bar (needs start)' },
  visible: { type: 'boolean', description: 'false hides it from the bar but keeps it' },
  position: { type: 'integer', minimum: 0, maximum: 100, description: '0 = first (makes it the headline); default: last' },
};
const WIDGET_REF = { type: 'string', minLength: 1, maxLength: 60, description: `a Home widget id (${HOME_WIDGETS.map(w => w.id).join(', ')}) or its name` };
const DATED_FIELDS = { label: S.label, date: S.date, type: { type: 'string', enum: [...DATED_TYPES], description: 'countdown (days until, the default), countup (days since) or progress (time between start and date)' }, time: S.time, start: S.start, icon: S.icon, color: S.color, style: S.style, unit: S.unit, headline: S.headline, warnDays: S.warnDays, hideWhenPast: S.hideWhenPast, showBar: S.showBar, visible: S.visible };

const ICON_RE = /^[a-z][a-z0-9-]{0,31}$/;
function cleanIcon(v) {
  if (v === undefined) return undefined;
  const s = cleanLine(v, 32);
  if (!s) throw new ActionError('BAD_VALUE', 'icon must not be empty', { field: 'icon' });
  if (ICON_RE.test(s)) return s;
  if (EMOJI_ICONS[s]) return EMOJI_ICONS[s];
  if (Array.from(s).length > 2) throw new ActionError('BAD_VALUE', `icon must be an icon name like 'rocket' or a single emoji; got '${truncate(s, 20)}'`, { field: 'icon' });
  return s;
}
function cleanColor(v) {
  if (v === undefined) return undefined;
  const c = normColor(String(v), null);
  if (!c) throw new ActionError('BAD_VALUE', `color must be one of ${SWATCHES.join(', ')} or #RRGGBB; got '${truncate(v, 20)}'`, { field: 'color', valid: [...SWATCHES] });
  return c;
}

/** The working list (normalised, headline first), and a saver. */
function widgets(ctx) {
  ctx.touch('countdowns');
  return widgetList(ctx.s.countdowns);
}
function save(ctx, list) {
  ctx.s.countdowns = list.map(storedWidget);
}
function find(list, ref, field = 'id') {
  const q = String(ref).trim();
  const hit = list.find(w => w.id === q) || list.find(w => w.label && w.label.toLowerCase() === q.toLowerCase());
  if (hit) return hit;
  throw new ActionError('NOT_FOUND', `no top-bar widget '${truncate(q, 40)}'`, {
    field, valid: list.map(w => w.id),
    hint: list.length ? `widgets: ${list.map(w => `${w.id} = "${truncate(w.label || WIDGET_TYPES[w.type].label, 30)}"`).join('; ')}` : 'there are no widgets yet',
  });
}
const nameOf = (w) => w.label || WIDGET_TYPES[w.type].label;
const change = (w, field, from, to) => ({ entity: 'countdown', id: w.id, label: truncate(nameOf(w), 60), field, from: from ?? null, to: to ?? null });

/** Apply the shared optional fields; returns the changes. */
function applyFields(ctx, w, p) {
  const ch = [];
  const set = (field, v) => {
    if (v === undefined || JSON.stringify(v) === JSON.stringify(w[field])) return;
    ch.push(change(w, field, w[field], v)); w[field] = v;
  };
  if (p.label !== undefined) { const l = cleanLine(p.label, LIMITS.label); if (!l && WIDGET_TYPES[w.type].dated) throw new ActionError('BAD_VALUE', 'label must not be empty', { field: 'label' }); set('label', l); }
  if (p.type !== undefined) set('type', p.type);
  if (p.date !== undefined) { if (!isIsoDate(p.date)) throw dateError('date', p.date, ctx.today); set('date', p.date); }
  if (p.time !== undefined) set('time', p.time || '');
  if (p.start !== undefined) { if (p.start && !isIsoDate(p.start)) throw dateError('start', p.start, ctx.today); set('start', p.start || ''); }
  if (p.icon !== undefined) set('icon', cleanIcon(p.icon));
  if (p.color !== undefined) set('color', cleanColor(p.color));
  if (p.style !== undefined) set('style', p.style);
  if (p.unit !== undefined) set('unit', p.unit);
  if (p.warnDays !== undefined) set('warnDays', p.warnDays);
  if (p.hideWhenPast !== undefined) set('hideWhenPast', !!p.hideWhenPast);
  if (p.visible !== undefined) set('visible', !!p.visible);
  if (p.tasks !== undefined) set('tasks', p.tasks);
  if (p.clock !== undefined) set('clock', p.clock);
  if (p.showBar !== undefined) set('showBar', !!p.showBar);
  else if (p.start !== undefined && w.type !== 'countup') set('showBar', !!w.start || w.type === 'progress');
  if (w.type === 'progress') {
    if (!w.start) throw new ActionError('BAD_VALUE', 'a progress widget needs start (the date it began)', { field: 'start' });
    if (w.date && w.start >= w.date) throw new ActionError('BAD_VALUE', `start (${w.start}) must be before date (${w.date})`, { field: 'start' });
    w.showBar = true;
  }
  return ch;
}

export const HOME_OPS = [
  {
    name: 'countdown.create', tool: 'create_countdown',
    description: 'Add a dated widget to the top bar: a countdown to a date (default), a count-up since a date, or a progress bar between start and date. position 0 or headline:true makes it the headline. For a live task count, next calendar event or clock use add_topbar_widget.',
    schema: obj({ ...DATED_FIELDS, position: S.position }, ['label', 'date']),
    run(ctx, p) {
      const list = widgets(ctx);
      const lbl = cleanLine(p.label, LIMITS.label);
      if (!lbl) throw new ActionError('BAD_VALUE', 'label must not be empty', { field: 'label' });
      if (!isIsoDate(p.date)) throw dateError('date', p.date, ctx.today);
      const type = p.type || 'countdown';
      if (list.some(w => w.label.toLowerCase() === lbl.toLowerCase() && w.date === p.date && w.type === type)) {
        throw new ActionError('DUPLICATE_COUNTDOWN', `a ${WIDGET_TYPES[type].label.toLowerCase()} "${lbl}" on ${p.date} already exists`, { field: 'label', hint: 'update it with update_countdown instead' });
      }
      const used = new Set(list.map(w => w.color));
      const w = normalizeWidget({ id: newCountdownId(), type, label: lbl, date: p.date, headline: false, color: SWATCHES.find(c => !used.has(c)) || SWATCHES[list.length % SWATCHES.length] }, list.length, false);
      applyFields(ctx, w, { ...p, label: undefined, type: undefined, date: undefined });
      const at = p.position === undefined ? list.length : Math.min(p.position, list.length);
      list.splice(at, 0, w);
      if (p.headline === true || at === 0 || !list.some(x => x.headline)) setHeadline(list, w.id);
      else if (p.headline === false && w.headline) w.headline = false;
      save(ctx, list);
      return {
        summary: `Add ${WIDGET_TYPES[type].label.toLowerCase()} "${lbl}" (${p.date}, ${weekdayOf(p.date).slice(0, 3)}; ${daysBetween(ctx.today, p.date)} days from today)${w.headline ? ' as the headline' : ''}`,
        changes: [change(w, 'created', null, p.date)], created: { countdownId: w.id },
      };
    },
  },
  {
    name: 'countdown.update', tool: 'update_countdown',
    description: 'Change a top-bar widget: label, date, time, start, type, symbol (icon), colour, style, show-as unit, warn-under days, hide once passed, visible, progress bar, or make it the headline. Live widgets also take tasks (which count) and clock (format).',
    schema: obj({
      id: S.id, ...DATED_FIELDS,
      type: { type: 'string', enum: Object.keys(WIDGET_TYPES), description: 'countdown, countup or progress (dated); tasks, event or clock (live)' },
      tasks: { type: 'string', enum: [...TASK_FILTERS], description: 'tasks widget: which tasks it counts' },
      clock: { type: 'string', enum: [...CLOCK_FORMATS], description: 'clock widget: time + date, time or date' },
      label: { type: 'string', maxLength: 200, description: 'new label (live widgets may use "" for the automatic one)' },
    }, ['id'], { minProperties: 2, minPropertiesMessage: 'update_countdown needs at least one field to change' }),
    run(ctx, p) {
      const list = widgets(ctx);
      const w = find(list, p.id);
      const ch = [];
      if (p.type !== undefined && WIDGET_TYPES[p.type].dated !== WIDGET_TYPES[w.type].dated) {
        if (WIDGET_TYPES[p.type].dated && !w.date && !p.date) throw new ActionError('BAD_VALUE', `changing to ${p.type} needs a date`, { field: 'date' });
      }
      ch.push(...applyFields(ctx, w, p));
      if (WIDGET_TYPES[w.type].dated && !w.date) throw new ActionError('BAD_VALUE', 'a dated widget needs date', { field: 'date' });
      if (p.headline === true && !w.headline) { setHeadline(list, w.id); ch.push(change(w, 'headline', false, true)); }
      else if (p.headline === false && w.headline) {
        w.headline = false; if (w.style === 'tinted' && p.style === undefined) w.style = 'subtle';
        const next = list.find(x => x !== w);
        if (next) setHeadline(list, next.id);
        ch.push(change(w, 'headline', true, false));
      }
      save(ctx, list);
      if (!ch.length) ctx.warn(`widget "${truncate(nameOf(w), 40)}": nothing to change`);
      return { summary: ch.length ? `Update "${truncate(nameOf(w), 40)}": ${ch.map(c => `${c.field} -> ${typeof c.to === 'string' || typeof c.to === 'number' || typeof c.to === 'boolean' ? c.to : '…'}`).join(', ')}` : 'No change', changes: ch };
    },
  },
  {
    name: 'countdown.delete', tool: 'delete_countdown', danger: true,
    description: 'Remove a widget from the top bar (to keep it but not show it, use update_countdown visible:false). Needs a dry run first.',
    schema: obj({ id: S.id }, ['id']),
    run(ctx, p) {
      const list = widgets(ctx);
      const w = find(list, p.id);
      const rest = list.filter(x => x !== w);
      if (w.headline && rest.length) setHeadline(rest, rest[0].id);
      save(ctx, rest);
      return { summary: `Delete "${truncate(nameOf(w), 40)}"${w.date ? ` (${w.date})` : ''} from the top bar`, changes: [change(w, 'deleted', w.date || w.type, null)] };
    },
  },
  {
    name: 'countdown.reorder', tool: 'reorder_countdowns',
    description: 'Put top-bar widgets in a new order: the ids listed come first, in that order, and the first becomes the headline; the rest keep their order after them.',
    schema: obj({ ids: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 120 }, minItems: 1, maxItems: 100, uniqueItems: true } }, ['ids']),
    run(ctx, p) {
      const list = widgets(ctx);
      const picked = p.ids.map((ref, i) => find(list, ref, `ids[${i}]`));
      const before = list.map(w => w.id);
      const out = [...picked, ...list.filter(w => !picked.includes(w))];
      setHeadline(out, out[0].id);
      const after = out.map(w => w.id);
      const same = before.join() === after.join();
      save(ctx, out);
      return { summary: same ? 'Widgets already in that order' : `Reorder the top bar (headline: "${truncate(nameOf(out[0]), 40)}")`, changes: same ? [] : [{ entity: 'countdown', id: '*', label: 'order', field: 'order', from: before, to: after }] };
    },
  },
  {
    name: 'topbar.add_widget', tool: 'add_topbar_widget',
    description: 'Add a live widget to the top bar: "tasks" (a live count: tasks option today|overdue|week|doing|pinned), "event" (the next calendar event) or "clock" (date and time; clock option both|time|date). For dated countdowns use create_countdown.',
    schema: obj({
      type: { type: 'string', enum: [...LIVE_TYPES], description: 'tasks, event or clock' },
      tasks: { type: 'string', enum: [...TASK_FILTERS], description: 'tasks widget: which tasks to count (default today = due today or overdue)' },
      clock: { type: 'string', enum: [...CLOCK_FORMATS], description: 'clock widget: what to show (default both)' },
      label: { type: 'string', maxLength: 200, description: 'optional label (default: automatic)' },
      icon: S.icon, color: S.color, style: S.style, showBar: S.showBar, visible: S.visible, position: S.position,
    }, ['type']),
    run(ctx, p) {
      const list = widgets(ctx);
      if (list.some(w => w.type === p.type && (p.type !== 'tasks' || w.tasks === (p.tasks || 'today')))) {
        throw new ActionError('DUPLICATE_WIDGET', `the top bar already has a ${WIDGET_TYPES[p.type].label.toLowerCase()} widget${p.type === 'tasks' ? ` for ${p.tasks || 'today'}` : ''}`, { field: 'type', hint: 'change it with update_countdown' });
      }
      const w = normalizeWidget({ id: newCountdownId(), type: p.type, label: '', headline: false, color: p.type === 'clock' ? 'slate' : p.type === 'event' ? 'blue' : 'teal', warnDays: 0 }, list.length, false);
      applyFields(ctx, w, { ...p, type: undefined });
      const at = p.position === undefined ? list.length : Math.min(p.position, list.length);
      list.splice(at, 0, w);
      if (at === 0 || !list.some(x => x.headline)) setHeadline(list, w.id);
      save(ctx, list);
      return { summary: `Add a "${WIDGET_TYPES[p.type].label}" widget to the top bar${p.type === 'tasks' ? ` (${w.tasks})` : p.type === 'clock' ? ` (${w.clock})` : ''}`, changes: [change(w, 'created', null, p.type)], created: { countdownId: w.id } };
    },
  },
  {
    name: 'home.set_focus', tool: 'set_home_focus',
    description: "Tune Home's Focus list (the most important tasks right now): how many to show (count 3-7 typical), which rules put a task there (pinned, p1 = high priority, overdue, doing = in progress, planned = planned for today, dueSoonDays = due within N days, 0 = off), streams (only these; [] = all), order (task ids in the order to show them; [] = automatic by importance), hide (task ids hidden from Focus until tomorrow, or until hideUntil: the day they come back, e.g. next Monday) and unhide (task ids, or ['*'] for all). Hiding (snoozing) never changes a task's due date: use reschedule_task for that.",
    schema: obj({
      count: { type: 'integer', minimum: 1, maximum: 9 },
      pinned: { type: 'boolean' }, p1: { type: 'boolean' }, overdue: { type: 'boolean' }, doing: { type: 'boolean' }, planned: { type: 'boolean' },
      dueSoonDays: { type: 'integer', minimum: 0, maximum: 30 },
      streams: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 30, uniqueItems: true, description: 'stream ids; [] = every stream' },
      order: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 160 }, maxItems: 30, uniqueItems: true, description: 'task ids in display order; [] = automatic' },
      hide: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 160 }, maxItems: 30, uniqueItems: true, description: 'task ids to hide from Focus until tomorrow (or until hideUntil)' },
      hideUntil: { ...DATE, description: 'with hide: the day the hidden tasks come back to Focus (after today; default tomorrow)' },
      unhide: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 160 }, maxItems: 30, uniqueItems: true, description: "task ids to show again, or ['*']" },
    }, [], { minProperties: 1, minPropertiesMessage: 'set_home_focus needs at least one setting' }),
    run(ctx, p) {
      ctx.touch('home');
      const s = ctx.s;
      const home = s.home && typeof s.home === 'object' ? { ...s.home } : {};
      const ch = [];
      const rec = (field, from, to) => { if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null)) ch.push({ entity: 'home', id: 'focus', label: 'Home focus', field, from: from ?? null, to: to ?? null }); };
      const cur = focusConfig(home);
      const focus = { ...(home.focus || {}) };
      for (const k of ['count', 'pinned', 'p1', 'overdue', 'doing', 'planned', 'dueSoonDays']) {
        if (p[k] !== undefined) { rec(k, cur[k], p[k]); focus[k] = p[k]; }
      }
      if (p.streams !== undefined) {
        const known = new Set([...(Array.isArray(s.streams) ? s.streams.map(x => x.id) : []), ...(s.custom || []).map(t => t && t.stream).filter(Boolean)]);
        p.streams.forEach((id, i) => { if (!known.has(id)) throw new ActionError('NOT_FOUND', `no stream '${truncate(id, 40)}'`, { field: `streams[${i}]`, valid: [...known] }); });
        rec('streams', cur.streams, p.streams); focus.streams = p.streams;
      }
      home.focus = focus;
      const live = (id, field) => { ctx.task(id, field); return id; };
      if (p.order !== undefined) {
        const ids = p.order.map((id, i) => live(id, `order[${i}]`));
        rec('order', home.focusOrder || [], ids); home.focusOrder = ids;
      }
      const sn = { ...(home.snoozed || {}) };
      for (const [k, v] of Object.entries(sn)) if (!v || v < ctx.today) delete sn[k];
      if (p.unhide !== undefined) {
        const ids = p.unhide.includes('*') ? Object.keys(sn) : p.unhide;
        for (const id of ids) if (sn[id]) { rec('hidden', id, null); delete sn[id]; }
      }
      // snoozed[id] is the LAST day the task stays out of Focus (the page's Snooze menu writes the same).
      let last = ctx.today;
      if (p.hideUntil !== undefined) {
        if (p.hide === undefined) throw new ActionError('BAD_VALUE', 'hideUntil goes with hide: the task ids to hide until that day', { field: 'hideUntil' });
        if (!isIsoDate(p.hideUntil)) throw dateError('hideUntil', p.hideUntil, ctx.today);
        if (p.hideUntil <= ctx.today) throw new ActionError('BAD_VALUE', `hideUntil is the day the tasks come back, so it must be after today (${ctx.today}); got ${p.hideUntil}`, { field: 'hideUntil' });
        last = addDaysIso(p.hideUntil, -1);
      }
      if (p.hide !== undefined) {
        p.hide.forEach((id, i) => { live(id, `hide[${i}]`); if (sn[id] !== last) { rec('hidden', sn[id] ? `${id} until ${addDaysIso(sn[id], 1)}` : null, last === ctx.today ? id : `${id} until ${p.hideUntil}`); sn[id] = last; } });
      }
      home.snoozed = sn;
      s.home = home;
      if (!ch.length) ctx.warn('set_home_focus: nothing to change');
      return { summary: ch.length ? `Home focus: ${[...new Set(ch.map(c => c.field))].join(', ')}` : 'No change to Home focus', changes: ch };
    },
  },
  {
    name: 'home.set_layout', tool: 'set_home_layout',
    description: "Arrange Home's widgets (get_home_layout lists them in page order): move one (position 0 = first on the page, or before / after another widget), resize it (size s = a third of the width, m = half, l = two thirds, full = the whole width; each widget allows only some sizes), hide it, or show a hidden one again. order puts the listed widgets first, in that order. Widget ids: " + HOME_WIDGETS.map(w => `${w.id} (${w.title})`).join(', ') + "; their names work too. Example: 'move Finances to the top' = widgets:[{id:'finance', position:0}].",
    schema: obj({
      widgets: {
        type: 'array', minItems: 1, maxItems: 20, description: 'one change per widget, applied in this order',
        items: obj({
          id: WIDGET_REF,
          size: { type: 'string', enum: [...HOME_SIZES], description: 's (a third of the width), m (half), l (two thirds) or full' },
          hidden: { type: 'boolean', description: 'true hides it from Home (it stays in Customise > Add widget); false shows it again' },
          position: { type: 'integer', minimum: 0, maximum: 30, description: '0 = first on the page; counts the widgets that are shown' },
          before: { ...WIDGET_REF, description: 'put it just before this widget' },
          after: { ...WIDGET_REF, description: 'put it just after this widget' },
        }, ['id'], { minProperties: 2, minPropertiesMessage: 'each widget change needs size, hidden, position, before or after' }),
      },
      order: { type: 'array', minItems: 1, maxItems: 20, uniqueItems: true, items: WIDGET_REF, description: 'these widgets first, in this order; the rest keep their order after them' },
    }, [], { minProperties: 1, minPropertiesMessage: 'set_home_layout needs widgets or order' }),
    run(ctx, p) {
      ctx.touch('home');
      const s = ctx.s;
      const home = s.home && typeof s.home === 'object' ? { ...s.home } : {};
      const before = normalizeHomeLayout(home.layout).widgets;
      let list = before.map(w => ({ ...w }));
      if (p.order) {
        const picked = p.order.map((ref, i) => widgetOf(ref, `order[${i}]`).id);
        if (new Set(picked).size !== picked.length) throw new ActionError('BAD_VALUE', 'order names the same widget twice', { field: 'order' });
        list = [...picked.map(id => list.find(w => w.id === id)), ...list.filter(w => !picked.includes(w.id))];
      }
      (p.widgets || []).forEach((c, i) => {
        const def = widgetOf(c.id, `widgets[${i}].id`);
        const w = list.find(x => x.id === def.id);
        const moves = ['position', 'before', 'after'].filter(k => c[k] !== undefined);
        if (moves.length > 1) throw new ActionError('BAD_VALUE', `widgets[${i}]: give only one of position, before or after`, { field: `widgets[${i}]` });
        if (c.size !== undefined) {
          if (!def.sizes.includes(c.size)) {
            throw new ActionError('BAD_VALUE', `${def.title} can be ${def.sizes.map(x => `${x} (${HOME_SIZE_NAMES[x]})`).join(', ')}; not ${c.size}`, { field: `widgets[${i}].size`, valid: [...def.sizes] });
          }
          w.size = c.size;
        }
        if (c.hidden !== undefined) w.hidden = c.hidden;
        if (!moves.length) return;
        const rest = list.filter(x => x !== w);
        let at;
        if (c.position !== undefined) {
          const shown = rest.filter(x => !x.hidden);
          at = c.position >= shown.length ? rest.length : rest.indexOf(shown[c.position]);
        } else {
          const key = c.before !== undefined ? 'before' : 'after';
          const ref = widgetOf(c[key], `widgets[${i}].${key}`);
          if (ref.id === def.id) throw new ActionError('BAD_VALUE', `widgets[${i}]: a widget cannot go ${key} itself`, { field: `widgets[${i}].${key}` });
          at = rest.findIndex(x => x.id === ref.id) + (key === 'after' ? 1 : 0);
        }
        rest.splice(at, 0, w);
        list = rest;
      });
      const after = normalizeHomeLayout({ widgets: list }).widgets;
      const ch = [];
      const rec = (id, field, from, to) => ch.push({ entity: 'home', id: 'layout:' + id, label: titleOf(id), field, from, to });
      const words = [];
      for (const w of after) {
        const b = before.find(x => x.id === w.id);
        if (b.size !== w.size) { rec(w.id, 'size', b.size, w.size); words.push(`${titleOf(w.id)} ${HOME_SIZE_NAMES[w.size]}`); }
        if (b.hidden !== w.hidden) { rec(w.id, 'hidden', b.hidden, w.hidden); words.push(`${titleOf(w.id)} ${w.hidden ? 'hidden' : 'shown'}`); }
      }
      const shownIds = (arr) => arr.filter(x => !x.hidden).map(x => x.id);
      if (before.map(x => x.id).join() !== after.map(x => x.id).join()) {
        ch.push({ entity: 'home', id: 'layout', label: 'Home layout', field: 'order', from: shownIds(before), to: shownIds(after) });
        words.unshift(`order ${shownIds(after).map(titleOf).join(', ')}`);
      }
      home.layout = { version: HOME_LAYOUT_VERSION, widgets: after };
      s.home = home;
      if (!ch.length) ctx.warn('set_home_layout: nothing to change');
      return { summary: ch.length ? `Home layout: ${words.join('; ')}` : 'No change to the Home layout', changes: ch };
    },
  },
  {
    name: 'home.reset_layout', tool: 'reset_home_layout',
    description: "Put Home's widgets back to the default arrangement: the default widgets shown, in the default order and sizes. Focus settings are kept.",
    schema: obj({}),
    run(ctx) {
      ctx.touch('home');
      const s = ctx.s;
      const home = s.home && typeof s.home === 'object' ? { ...s.home } : {};
      const had = home.layout !== undefined;
      delete home.layout;
      s.home = home;
      if (!had) ctx.warn('reset_home_layout: Home already has the default layout');
      return {
        summary: had ? 'Reset the Home layout to the default' : 'Home already has the default layout',
        changes: had ? [{ entity: 'home', id: 'layout', label: 'Home layout', field: 'layout', from: 'custom', to: 'default' }] : [],
      };
    },
  },
];

/* ---------- Home layout helpers ---------- */
function titleOf(id) { const w = HOME_WIDGETS.find(x => x.id === id); return w ? w.title : id; }
function widgetOf(ref, field) {
  const w = findHomeWidget(ref);
  if (w) return w;
  throw new ActionError('NOT_FOUND', `no Home widget '${truncate(String(ref), 40)}'`, {
    field, valid: HOME_WIDGETS.map(x => x.id),
    hint: `Home widgets: ${HOME_WIDGETS.map(x => `${x.id} = "${x.title}"`).join('; ')}`,
  });
}


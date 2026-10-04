// server/actions/queries-home.mjs - read queries for the top bar and Home
// (owner: Home / top-bar builder). queries.mjs merges these in by name, so
// countdowns.list here replaces the earlier one with a version that knows the
// 2.0 widget schema; the tool name stays list_countdowns.
//
//   countdowns.list  [list_countdowns]  every top-bar widget, headline first,
//                                       with its date, weekday and days left
//   home.focus       [get_home_focus]   the tasks Home's Focus shows right
//                                       now, in order, and why each is there
//   home.layout      [get_home_layout]  Home's widgets in page order: size,
//                                       allowed sizes, hidden, position
//
// No imports from queries.mjs (it imports this file).

import { daysBetween, weekdayOf } from './model.mjs';
import { WIDGET_TYPES, widgetList, focusTasks, HOME_WIDGETS, HOME_SIZE_NAMES, normalizeHomeLayout } from '../../lib/home-topbar.mjs';

const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });

const TASKS_LABEL = { today: 'Due today', overdue: 'Overdue', week: 'Next 7 days', doing: 'In progress', pinned: 'Pinned' };

function describeWidget(w, today) {
  const o = { id: w.id, type: w.type, label: w.label || (w.type === 'tasks' ? TASKS_LABEL[w.tasks] : WIDGET_TYPES[w.type].label) };
  if (w.headline) o.headline = true;
  if (!w.visible) o.visible = false;
  if (WIDGET_TYPES[w.type].dated) {
    o.date = w.date;
    if (w.date) { o.day = weekdayOf(w.date).slice(0, 3); const d = daysBetween(today, w.date); o.daysLeft = d; if (d < 0) o.passed = true; }
    if (w.time) o.time = w.time;
    if (w.start) o.start = w.start;
    if (w.unit !== 'days') o.unit = w.unit;
    if (w.warnDays) o.warnDays = w.warnDays;
    if (w.hideWhenPast) o.hideWhenPast = true;
  }
  if (w.type === 'tasks') o.tasks = w.tasks;
  if (w.type === 'clock') o.clock = w.clock;
  o.icon = w.icon; o.color = w.color; o.style = w.style;
  if (w.showBar) o.showBar = true;
  return o;
}

const WHY_TEXT = { overdue: 'overdue', today: 'due today', doing: 'in progress', pinned: 'pinned', planned: 'planned for today', p1: 'high priority', soon: 'due soon' };

function focusRow(s, today, t, why) {
  const o = { id: t.id, title: t.title };
  if (t.dueDate) { o.due = t.dueDate; o.day = weekdayOf(t.dueDate).slice(0, 3); o.daysLeft = daysBetween(today, t.dueDate); }
  o.status = (s.statuses && s.statuses[t.id]) || 'todo';
  if (t.priority && t.priority !== 'p0') o.priority = t.priority;
  o.stream = t.stream;
  if (s.pinned && s.pinned[t.id]) o.pinned = true;
  const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
  if (subs.length) {
    o.subtasks = `${subs.filter(x => x && x.done).length}/${subs.length}`;
    const next = subs.filter(x => x && !x.done).slice(0, 3).map(x => x.title);
    if (next.length) o.nextSubtasks = next;
  }
  o.why = why.map(k => WHY_TEXT[k] || k);
  return o;
}

export const HOME_QUERIES = [
  {
    name: 'countdowns.list', tool: 'list_countdowns',
    description: 'The top-bar widgets in display order (the headline first): countdowns, count-ups and progress bars with their dates, weekday and days left, plus live widgets (tasks due, next event, clock). Hidden ones have visible:false.',
    schema: obj({}),
    run(q) {
      const today = q.clock.today;
      return { today, countdowns: widgetList(q.s.countdowns).map(w => describeWidget(w, today)) };
    },
  },
  {
    name: 'home.focus', tool: 'get_home_focus',
    description: "What Home's Focus shows right now: the most important open tasks (pinned, high priority, overdue, in progress, due soon) in display order, each with why it is there and its next subtasks; plus the Focus settings and how many are hidden for today.",
    schema: obj({ limit: { type: 'integer', minimum: 1, maximum: 30, description: 'default: the Focus count setting' } }),
    run(q, p) {
      const today = q.clock.today;
      const r = focusTasks(q.s, today, p.limit);
      return { today, settings: r.config, qualifying: r.candidates, hiddenToday: r.hidden, tasks: r.tasks.map(x => focusRow(q.s, today, x.task, x.why)) };
    },
  },
  {
    name: 'home.layout', tool: 'get_home_layout',
    description: "Home's widgets in page order: id, title, size (s = a third of the width, m = half, l = two thirds, full = the whole width), the sizes it allows, and its position among the shown ones (hidden ones have hidden:true and wait in Customise > Add widget). Change them with set_home_layout.",
    schema: obj({}),
    run(q) {
      const home = q.s.home && typeof q.s.home === 'object' ? q.s.home : {};
      let n = 0;
      return {
        custom: home.layout !== undefined, sizes: { ...HOME_SIZE_NAMES },
        widgets: normalizeHomeLayout(home.layout).widgets.map(w => {
          const d = HOME_WIDGETS.find(x => x.id === w.id);
          const o = { id: w.id, title: d.title, size: w.size, sizes: [...d.sizes] };
          if (w.hidden) o.hidden = true; else o.position = n++;
          return o;
        }),
      };
    },
  },
];

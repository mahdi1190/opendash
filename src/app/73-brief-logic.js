/* ============================================================
   MORNING BRIEF / FINISH THE DAY / REVIEW: the rules (owner: Brief + Review).
   PURE classic script, like 71-anim-library.js: no DOM, no page globals;
   lib/brief-logic.mjs evaluates it in Node for the tests and the brief.get
   query. Inputs are plain objects; dates are 'YYYY-MM-DD', times minutes
   after midnight.

   briefTimeOfDay(hour, sunrise, sunset)  'dawn'|'morning'|'day'|'dusk'|'evening'|'night'
   briefDayType(day)                       what kind of day it is + layout/tone
   briefHeadline(day, dayType)             the one item the hero scene is about
   briefGaps(events, from, to, min)        free stretches between meetings
   briefRelTime(minutes)                   'in 42 min' / 'in 1 h 5 min' / 'now'
   briefStats(counts)                      [{n, one, many}] for "3 meetings · 5 tasks"
   briefOrchestrate(steps, opts)           the auto-refresh (calendar, inbox, finance)
   briefRollover(tasks, today)             what slipped today and how to roll it
   briefStreak(dayCounts, today)           consecutive days with something done
   reviewWeekRange(today, weekStart)       this / next week
   reviewWeekStats(input)                  wins per stream, slipped deadlines + why
   reviewCapacity(days, capacityMin)       next week's booked time against capacity
   ============================================================ */
const BRIEF_MEETING_TYPES = Object.freeze(['meeting', 'one-on-one', 'video-call', 'call', 'interview', 'conference', 'lecture']);
const BRIEF_TRAVEL_TYPES = Object.freeze(['flight', 'train', 'travel', 'takeoff', 'landing', 'layover', 'ferry', 'coach']);   // + the travel spec 4.7 transport scenes
const BRIEF_CELEBRATE_TYPES = Object.freeze(['birthday', 'wedding', 'party', 'celebration']);

function briefPad(n) { return String(n).padStart(2, '0'); }
function briefHM(min) { const m = Math.max(0, Math.round(Number(min) || 0)); return briefPad(Math.floor(m / 60) % 24) + ':' + briefPad(m % 60); }
function briefMin(hm) { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function briefAddDays(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const t = new Date(Date.UTC(y, (m || 1) - 1, d || 1) + n * 86400000);
  return t.getUTCFullYear() + '-' + briefPad(t.getUTCMonth() + 1) + '-' + briefPad(t.getUTCDate());
}
function briefWeekday(iso) { const [y, m, d] = String(iso).split('-').map(Number); return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay(); }
function briefDaysBetween(a, b) {
  const p = (s) => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
  return Math.round((p(b) - p(a)) / 86400000);
}

/** Time of day from the hour (decimal) and the sun (decimal hours; defaults 07:00 / 19:00). */
function briefTimeOfDay(hour, sunrise, sunset) {
  const h = Number(hour) || 0, up = Number.isFinite(sunrise) ? sunrise : 7, down = Number.isFinite(sunset) ? sunset : 19;
  if (h < up - 0.75 || h >= down + 1.25) return 'night';
  if (h < up + 1) return 'dawn';
  if (h < 12) return 'morning';
  if (h < down - 1) return 'day';
  if (h < down + 0.5) return 'dusk';
  return 'evening';
}

/** "in 42 min", "in 1 h 5 min", "in 3 h", "now", "5 min ago". */
function briefRelTime(minutes) {
  const m = Math.round(Number(minutes) || 0);
  if (m <= 0 && m > -1) return 'now';
  if (m < 0) { const a = -m; return a < 60 ? `${a} min ago` : `${Math.floor(a / 60)} h ago`; }
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r && h < 4 ? `in ${h} h ${r} min` : `in ${h} h`;
}

/** Free stretches of at least `min` minutes between timed events, inside [from, to]. */
function briefGaps(events, from, to, min) {
  from = Number.isFinite(from) ? from : 9 * 60; to = Number.isFinite(to) ? to : 17.5 * 60; min = Number.isFinite(min) ? min : 30;
  const busy = (events || []).filter(e => e && !e.allDay && Number.isFinite(e.start))
    .map(e => [Math.max(from, e.start), Math.min(to, Number.isFinite(e.end) ? e.end : e.start + 30)])
    .filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  const out = []; let cur = from;
  for (const [a, b] of busy) {
    if (a - cur >= min) out.push({ start: cur, end: a, minutes: a - cur });
    cur = Math.max(cur, b);
  }
  if (to - cur >= min) out.push({ start: cur, end: to, minutes: to - cur });
  return out;
}

const BRIEF_LAYOUTS = Object.freeze({
  deadline: { lead: 'focus', accent: 'red', order: ['focus', 'deadlines', 'schedule', 'weather', 'waiting', 'money'] },
  meetings: { lead: 'schedule', accent: 'blue', order: ['schedule', 'focus', 'weather', 'deadlines', 'waiting', 'money'] },
  travel: { lead: 'trip', accent: 'teal', order: ['trip', 'schedule', 'weather', 'focus', 'deadlines', 'money', 'waiting'] },
  light: { lead: 'backlog', accent: 'green', order: ['focus', 'backlog', 'schedule', 'weather', 'deadlines', 'waiting', 'money'] },
  weekend: { lead: 'gentle', accent: 'amber', order: ['schedule', 'weather', 'focus', 'backlog', 'deadlines', 'money'] },
  off: { lead: 'gentle', accent: 'teal', order: ['schedule', 'weather', 'focus', 'money'] },
  normal: { lead: 'focus', accent: 'indigo', order: ['focus', 'schedule', 'weather', 'deadlines', 'waiting', 'money'] },
});

/**
 * What kind of day is it? day = {
 *   date, weekday (0 Sun .. 6 Sat; from date when absent),
 *   events: [{title, type, start, end, allDay, minutes, days, own}]   (today's, scene types already classified;
 *           own: false = from someone else's calendar, so their leave does not make it your day off)
 *   tasks:  {today, overdue, p1Today, deadlines: [{title, type}]} (counts + the deadline items)
 *   weather: {cond} (optional)
 * } -> {type, lead, accent, order, tagline, flags, counts}
 */
function briefDayType(day) {
  day = day || {};
  const wd = Number.isFinite(day.weekday) ? day.weekday : (day.date ? briefWeekday(day.date) : 1);
  const events = (day.events || []).filter(Boolean);
  const timed = events.filter(e => !e.allDay);
  const meetings = timed.filter(e => BRIEF_MEETING_TYPES.includes(e.type));
  // Booked time is the union of the meetings (two overlapping invites are not twice the time).
  let meetingMinutes = 0, upTo = -1;
  for (const [a, b] of meetings.map(e => { const s = Number(e.start) || 0; return [s, Number.isFinite(e.end) ? e.end : s + (Number(e.minutes) || 0)]; }).sort((x, y) => x[0] - y[0])) {
    if (b > Math.max(a, upTo)) { meetingMinutes += b - Math.max(a, upTo); upTo = b; }
  }
  const t = day.tasks || {};
  const deadlines = (t.deadlines || []).length + events.filter(e => e.type === 'deadline').length;
  const tasksToday = Number(t.today) || 0;
  // Someone else's all-day trip in a shared calendar ("Sam away: conference") is not your travel day.
  const travel = events.filter(e => BRIEF_TRAVEL_TYPES.includes(e.type) && (!e.allDay || (e.type === 'travel' && e.own !== false)));
  // A day off is YOUR leave: someone else's leave in a shared calendar is not (own: false).
  const off = events.some(e => e.allDay && e.type === 'holiday' && e.own !== false);
  const celebrations = events.filter(e => BRIEF_CELEBRATE_TYPES.includes(e.type));
  const flags = {
    birthday: events.some(e => e.type === 'birthday'),
    celebrate: celebrations.length > 0,
    travel: travel.length > 0,
    rainy: !!(day.weather && /rain|showers|drizzle|thunder/.test(day.weather.cond || '')),
    weekend: wd === 0 || wd === 6,
  };
  let type;
  if (travel.length) type = 'travel';
  // A deadline day: something deadline-like is due today, or three high-priority tasks are.
  // (An old overdue backlog is not a deadline: it does not take over every day.)
  else if (deadlines > 0 || (Number(t.p1Today) || 0) >= 3) type = 'deadline';
  else if (flags.weekend) type = 'weekend';
  else if (off) type = 'off';
  else if (meetings.length >= 4 || meetingMinutes >= 240) type = 'meetings';
  else if (meetings.length <= 1 && tasksToday <= 2) type = 'light';
  else type = 'normal';
  const hrs = meetingMinutes >= 60 ? `${Math.round(meetingMinutes / 30) / 2} h` : `${meetingMinutes} min`;
  const taglines = {
    travel: 'A travel day. Here is the trip, and only what still matters around it.',
    deadline: deadlines > 1 ? `${deadlines} deadlines today. Protect your morning.` : deadlines === 1 ? 'A deadline day. Protect your morning.' : `${Number(t.p1Today) || 0} high-priority tasks are due. Protect your morning for the hardest one.`,
    weekend: 'It is the weekend. Take it gently.',
    off: 'A day off. Nothing here needs you urgently.',
    meetings: `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}, ${hrs} booked. The gaps are your work time.`,
    light: 'A lighter day. Good for clearing a few things off the backlog.',
    normal: 'A steady day. One thing at a time.',
  };
  const L = BRIEF_LAYOUTS[type];
  return {
    type, lead: L.lead, accent: flags.birthday && type !== 'deadline' ? 'pink' : L.accent, order: L.order.slice(),
    tagline: taglines[type], flags,
    counts: { meetings: meetings.length, meetingMinutes, tasks: tasksToday, deadlines, events: events.length, celebrations: celebrations.length },
  };
}

/**
 * The headline item for the hero scene: a celebration tonight, the deadline,
 * the trip, else the next meeting, else the first focus task.
 * day.focus: [{id, title, type}], day.now: minutes.
 */
function briefHeadline(day, dt) {
  day = day || {}; dt = dt || briefDayType(day);
  const ev = (day.events || []).filter(Boolean);
  const now = Number.isFinite(day.now) ? day.now : 0;
  const pickEv = (pred) => ev.find(pred);
  if (dt.type === 'travel') {
    const tr = pickEv(e => BRIEF_TRAVEL_TYPES.includes(e.type) && !e.allDay) || pickEv(e => BRIEF_TRAVEL_TYPES.includes(e.type));
    if (tr) return { kind: 'event', title: tr.title, type: tr.type, start: tr.start, why: 'trip' };
  }
  const cel = pickEv(e => BRIEF_CELEBRATE_TYPES.includes(e.type) && (e.allDay || (e.end || e.start + 60) > now));
  if (cel) return { kind: 'event', title: cel.title, type: cel.type, start: cel.start, allDay: !!cel.allDay, why: cel.type === 'birthday' ? 'birthday' : 'celebration' };
  if (dt.type === 'deadline') {
    const d = (day.tasks && day.tasks.deadlines || [])[0] || pickEv(e => e.type === 'deadline');
    if (d) return { kind: d.id ? 'task' : 'event', id: d.id, title: d.title, type: 'deadline', why: 'deadline', urgent: true };
  }
  const next = ev.filter(e => !e.allDay && (e.end || e.start + 30) > now).sort((a, b) => a.start - b.start)[0];
  if (next && (dt.type === 'meetings' || !(day.focus || []).length)) return { kind: 'event', title: next.title, type: next.type, start: next.start, why: 'next' };
  const f = (day.focus || [])[0];
  if (f) return { kind: 'task', id: f.id, title: f.title, type: f.type || 'task', why: 'focus' };
  if (next) return { kind: 'event', title: next.title, type: next.type, start: next.start, why: 'next' };
  return null;
}

/** [{n, one, many}] -> rendered as "3 meetings · 5 tasks · 2 deadlines" (zero counts dropped, tasks always kept). */
function briefStats(c) {
  c = c || {};
  const out = [];
  if (c.meetings) out.push({ key: 'meetings', n: c.meetings, one: 'meeting', many: 'meetings' });
  out.push({ key: 'tasks', n: c.tasks || 0, one: 'task', many: 'tasks' });
  if (c.deadlines) out.push({ key: 'deadlines', n: c.deadlines, one: 'deadline', many: 'deadlines' });
  if (c.celebrations) out.push({ key: 'celebrations', n: c.celebrations, one: 'celebration', many: 'celebrations' });
  return out;
}

/**
 * Refresh what the brief shows, in parallel, each step only when it makes sense:
 *   steps: [{id, label, available() -> bool|reason string, stale() -> bool,
 *            start() -> {started|skipped|running|error}, wait() -> {ok|error}}]
 *   opts:  {onProgress(id, status, info), timeoutMs}
 * Statuses: pending, skipped (not connected: info.reason), fresh (recent enough),
 * running, done, error, timeout. Resolves {results:{id:{status, reason}}, changed}.
 * Never throws: a failing step is reported and the rest go on.
 */
async function briefOrchestrate(steps, opts) {
  opts = opts || {};
  const results = {};
  const report = (id, status, info) => { results[id] = Object.assign({ status }, info || {}); try { opts.onProgress && opts.onProgress(id, status, info || {}); } catch (e) { /* the UI's problem */ } };
  const timeout = Number(opts.timeoutMs) || 180000;
  const withTimeout = (p) => new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve({ timeout: true }); } }, timeout);
    Promise.resolve(p).then(v => { if (!done) { done = true; clearTimeout(t); resolve(v || {}); } }, e => { if (!done) { done = true; clearTimeout(t); resolve({ error: (e && e.message) || String(e) }); } });
  });
  for (const s of steps) report(s.id, 'pending');
  await Promise.all(steps.map(async (s) => {
    try {
      const av = s.available ? await s.available() : true;
      if (av !== true) { report(s.id, 'skipped', { reason: typeof av === 'string' ? av : 'not connected' }); return; }
      const stale = s.stale ? await s.stale() : true;
      if (!stale) { report(s.id, 'fresh'); return; }
      report(s.id, 'running');
      const st = await withTimeout(s.start());
      if (st.timeout) { report(s.id, 'timeout'); return; }
      if (st.error) { report(s.id, 'error', { reason: String(st.error) }); return; }
      if (st.skipped) { report(s.id, 'fresh'); return; }
      const w = s.wait ? await withTimeout(s.wait()) : {};
      if (w.timeout) report(s.id, 'timeout');
      else if (w.error) report(s.id, 'error', { reason: String(w.error) });
      else report(s.id, 'done');
    } catch (e) {
      report(s.id, 'error', { reason: (e && e.message) || String(e) });
    }
  }));
  return { results, changed: Object.values(results).some(r => r.status === 'done') };
}

/**
 * What slipped today: open tasks due today, overdue, or planned for today
 * and not done. tasks: [{id, title, due, planned, done, priority}].
 * -> [{id, title, why: 'due'|'overdue'|'planned', field: 'due'|'planned', from}]
 */
function briefRollover(tasks, today) {
  const out = [];
  for (const t of tasks || []) {
    if (!t || t.done) continue;
    if (t.due && t.due === today) out.push({ id: t.id, title: t.title, priority: t.priority, why: 'due', field: 'due', from: t.due });
    else if (t.due && t.due < today) out.push({ id: t.id, title: t.title, priority: t.priority, why: 'overdue', field: 'due', from: t.due, days: briefDaysBetween(t.due, today) });
    else if (t.planned && t.planned <= today && (!t.due || t.due > today)) out.push({ id: t.id, title: t.title, priority: t.priority, why: 'planned', field: 'planned', from: t.planned });
  }
  const rank = { p1: 0, p2: 1, p3: 2, p0: 3 };
  return out.sort((a, b) => (a.why === 'overdue' ? 0 : a.why === 'due' ? 1 : 2) - (b.why === 'overdue' ? 0 : b.why === 'due' ? 1 : 2) || (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3));
}

/** Consecutive days with at least one completion, ending today (or yesterday when nothing is done yet today). */
function briefStreak(dayCounts, today) {
  dayCounts = dayCounts || {};
  let d = today, n = 0;
  const todayDone = (dayCounts[today] || 0) > 0;
  if (!todayDone) d = briefAddDays(today, -1);
  while ((dayCounts[d] || 0) > 0 && n < 400) { n++; d = briefAddDays(d, -1); }
  return { days: n, includesToday: todayDone };
}

/** This week and next week for a week start ('Mon' | 'Sun' | 'Sat'). */
function reviewWeekRange(today, weekStart) {
  const startIdx = { Mon: 1, Sun: 0, Sat: 6 }[weekStart] ?? 1;
  const back = (briefWeekday(today) - startIdx + 7) % 7;
  const from = briefAddDays(today, -back);
  return { from, to: briefAddDays(from, 6), nextFrom: briefAddDays(from, 7), nextTo: briefAddDays(from, 13), prevFrom: briefAddDays(from, -7), prevTo: briefAddDays(from, -1) };
}

/**
 * The week in numbers. input = {
 *   from, to,                                  (inclusive ISO dates)
 *   tasks: [{id, title, stream}],
 *   completions: {taskId: [ms...]},            (state.completionLog)
 *   activity: {taskId: [{ts, type, from, to, reason}]},  (state.taskActivity)
 *   dayOf(ms) -> 'YYYY-MM-DD'                  (local date; required)
 * } -> {completed, perStream:[{stream, n}], byDay:{iso:n}, slipped:[{id, title, from, to, reason, moves}], reasons:[{reason, n}]}
 */
function reviewWeekStats(input) {
  const { from, to, dayOf } = input;
  const byId = new Map((input.tasks || []).map(t => [t.id, t]));
  const inRange = (iso) => iso && iso >= from && iso <= to;
  const perStream = new Map(), byDay = {};
  let completed = 0;
  for (const [id, list] of Object.entries(input.completions || {})) {
    for (const ts of list || []) {
      const day = dayOf(Number(ts));
      if (!inRange(day)) continue;
      completed++;
      byDay[day] = (byDay[day] || 0) + 1;
      const s = (byId.get(id) || {}).stream || 'none';
      perStream.set(s, (perStream.get(s) || 0) + 1);
    }
  }
  const slipped = [], reasons = new Map();
  for (const [id, list] of Object.entries(input.activity || {})) {
    const moves = (list || []).filter(a => a && a.type === 'date' && a.from && a.to && a.to > a.from && inRange(dayOf(Number(a.ts))) && a.from <= to);
    if (!moves.length) continue;
    const t = byId.get(id) || {};
    const last = moves[moves.length - 1];
    const reason = String(last.reason || '').trim() || 'no reason given';
    reasons.set(reason, (reasons.get(reason) || 0) + 1);
    slipped.push({ id, title: t.title || '(deleted task)', stream: t.stream || null, from: moves[0].from, to: last.to, reason, moves: moves.length });
  }
  slipped.sort((a, b) => b.moves - a.moves || a.from.localeCompare(b.from));
  return {
    completed, byDay,
    perStream: [...perStream.entries()].map(([stream, n]) => ({ stream, n })).sort((a, b) => b.n - a.n),
    slipped, reasons: [...reasons.entries()].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n),
  };
}

/**
 * Next week against capacity. days: [{date, events:[{minutes, type, allDay}], tasks: n, estimate: minutes}]
 * -> [{date, meetings, booked, tasks, free, load, warn}]   (load = booked / capacity)
 */
function reviewCapacity(days, capacityMin) {
  const cap = Number(capacityMin) || 8 * 60;
  return (days || []).map(d => {
    const evs = (d.events || []).filter(e => e && !e.allDay);
    const booked = evs.reduce((t, e) => t + Math.max(0, Math.min(cap, Number(e.minutes) || 0)), 0);
    const planned = Number(d.estimate) || 0;
    const load = (booked + planned) / cap;
    return { date: d.date, meetings: evs.filter(e => BRIEF_MEETING_TYPES.includes(e.type)).length, booked, planned, tasks: Number(d.tasks) || 0, free: Math.max(0, cap - booked - planned), load: Math.round(load * 100) / 100, warn: load > 0.75 };
  });
}

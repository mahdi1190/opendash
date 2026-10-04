/* ============================================================
   DEADLINE RUNWAY: the pure model (WIDGETS_CATALOGUE.md 3.10).
   OWNER: the "runway" widget builder. The widget is 12-home-w-runway.js.
   "Will I make it?" for a countdown, from the user's real pace.
   No DOM and no page globals: tests/home-w-runway.test.mjs runs this file
   alone in a VM. Days are 'YYYY-MM-DD'; weekdays 0 = Sunday ... 6 = Saturday.

     homeRunway(o) -> the model (see the function)
     rwWorkdaysIn(from, to, days)        workdays in [from, to] (both included)
     rwNthWorkday(from, n, days)         the day the n-th workday falls on (from counts)
     rwInScope(item, scope, match)       is a task in {kind: stream|tag|query, value}
     rwGuessScope(label, streams, tags)  a scope from a countdown's name, or null
     rwSparkGeometry(model, o)           the burn-up chart's paths (fixed point count,
                                         so a later change can morph in place)
     rwWeekRows(model, o)                the chart's text table: week, done, needed
   ============================================================ */
const RUNWAY_PACE_DAYS = 14;          // actual pace: completions in the last 14 days
const RUNWAY_SINCE_MAX = 90;          // the automatic start: at most 90 days back
const RUNWAY_SINCE_LIMIT = 366;       // a chosen start: at most a year back
const RUNWAY_TIGHT = 0.75;            // tight: at least 3/4 of the pace needed
const RUNWAY_POINTS = 40;             // points on the chart's done line (always the same)
const RUNWAY_WEEKDAYS = Object.freeze([1, 2, 3, 4, 5]);
const RUNWAY_STATUS_TEXT = Object.freeze({ on: 'On track', tight: 'Tight', behind: 'Behind', done: 'Done', past: 'Date passed', empty: 'Nothing yet' });
const _RW_ISO = /^\d{4}-\d{2}-\d{2}$/;
const _RW_STOP = new Set(['the', 'and', 'for', 'with', 'from', 'due', 'deadline', 'date', 'day', 'end', 'start', 'new', 'my', 'our', 'of', 'to', 'in', 'on', 'at', 'by', 'a', 'an']);

function _rwIsIso(s) { return typeof s === 'string' && _RW_ISO.test(s); }
function _rwDayNo(iso) { const [y, m, d] = String(iso).split('-').map(Number); return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000); }
function _rwIso(n) { const d = new Date(n * 86400000); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
function _rwAdd(iso, n) { return _rwIso(_rwDayNo(iso) + n); }
function _rwDow(iso) { return ((_rwDayNo(iso) % 7) + 7 + 4) % 7; }            // 1970-01-01 was a Thursday
/** The local day of a timestamp (ms or an ISO string), or null. */
function _rwLocalDay(ts) {
  const ms = typeof ts === 'number' ? ts : typeof ts === 'string' && ts ? Date.parse(ts) : NaN;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  if (typeof Clock !== 'undefined') return Clock.parts(ms).iso;   // the page's day (travel spec 2.7)
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // clock-ok: Node fallback
}
function _rwDays(o) {
  if (o && o.countWeekends) return [0, 1, 2, 3, 4, 5, 6];
  const d = o && Array.isArray(o.workDays) ? o.workDays.filter(x => Number.isInteger(x) && x >= 0 && x <= 6) : [];
  return d.length ? [...new Set(d)] : RUNWAY_WEEKDAYS.slice();
}

/** Workdays in [from, to], both included (0 when to is before from). */
function rwWorkdaysIn(from, to, days) {
  if (!_rwIsIso(from) || !_rwIsIso(to)) return 0;
  const a = _rwDayNo(from), b = _rwDayNo(to);
  if (b < a) return 0;
  const set = new Set(days && days.length ? days : RUNWAY_WEEKDAYS);
  const span = b - a + 1;
  let n = Math.floor(span / 7) * set.size;                     // whole weeks
  for (let k = a + Math.floor(span / 7) * 7; k <= b; k++) if (set.has(((k % 7) + 7 + 4) % 7)) n++;
  return n;
}
/** The day the n-th workday falls on, counting `from` itself when it is a workday (n >= 1). null past `cap` days. */
function rwNthWorkday(from, n, days, cap) {
  if (!_rwIsIso(from) || !(n >= 1)) return null;
  const set = new Set(days && days.length ? days : RUNWAY_WEEKDAYS);
  const lim = Number.isFinite(cap) ? cap : 1100;
  let k = _rwDayNo(from), left = Math.ceil(n);
  for (let i = 0; i <= lim; i++, k++) {
    if (set.has(((k % 7) + 7 + 4) % 7) && --left === 0) return _rwIso(k);
  }
  return null;
}

/** Is a task in the scope? query scopes need `match(item)` (the page's task search). */
function rwInScope(item, scope, match) {
  if (!item || !scope || typeof scope.value !== 'string' || !scope.value.trim()) return false;
  const v = scope.value.trim();
  if (scope.kind === 'stream') return item.stream === v;
  if (scope.kind === 'tag') { const lv = v.replace(/^#/, '').toLowerCase(); return (Array.isArray(item.tags) ? item.tags : []).some(t => String(t).toLowerCase() === lv); }
  if (scope.kind === 'query') return typeof match === 'function' ? !!match(item) : false;
  return false;
}
function _rwWords(s) { return String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !_RW_STOP.has(w)); }
function _rwSame(a, b) { return a === b || a + 's' === b || b + 's' === a; }
/**
 * A scope guessed from a countdown's name: a stream whose id or name shares a word with it
 * ("Report corrections" -> stream report), else a tag that is one of its words or phrases
 * ("Acme milestone 2" -> #acme). streams [{id, label}], tags ['tag'...] (most used first). null = no guess.
 */
function rwGuessScope(label, streams, tags) {
  const words = _rwWords(label);
  if (!words.length) return null;
  for (const s of streams || []) {
    if (!s || !s.id) continue;
    const sw = _rwWords(s.id).concat(_rwWords(s.label));
    if (sw.some(x => words.some(w => _rwSame(w, x)))) return { kind: 'stream', value: String(s.id) };
  }
  const phrase = ' ' + words.join(' ') + ' ';
  for (const t of tags || []) {
    const tw = _rwWords(t);
    if (!tw.length) continue;
    if (tw.length === 1 ? words.some(w => _rwSame(w, tw[0])) : phrase.includes(' ' + tw.join(' ') + ' ')) return { kind: 'tag', value: String(t) };
  }
  return null;
}
function _rwRepeating(it) { return !!(it && it.recurrence && it.recurrence !== 'none'); }
function _rwLastTs(log, id) { const a = log && Array.isArray(log[id]) ? log[id] : []; let m = 0; for (const x of a) if (Number(x) > m) m = Number(x); return m; }
function _rwWontDo(it, statuses, log) {
  return !!(it && statuses[it.id] === 'done' && it.resolution === 'wontdo' && (Number(it.resolvedAt) || 0) >= _rwLastTs(log, it.id));
}
const _RW_PRIO = { p1: 0, p2: 1, p3: 2, p0: 3 };

/**
 * The runway for one countdown and scope.
 * o: {items: [task], statuses: {id: status}, completionLog: {id: [ms]}, countdown: {id, label, date},
 *     scope: {kind, value}, match(item) (query scopes), unit: 'tasks'|'steps', today: 'YYYY-MM-DD',
 *     countWeekends, workDays: [0..6] (the user's working days; weekends added by countWeekends),
 *     since: 'YYYY-MM-DD' | null, dayOf(ts) -> local day (default: this machine's clock),
 *     freeMinOn(iso) -> free minutes that day (optional: the hours line)}
 * Repeating tasks never finish, and "won't do" tasks are let go: neither counts.
 * -> {unit, total, done, open, date, daysLeft, workdaysLeft, required, actual, recentDone,
 *     window: {from, workdays}, status, statusText, projected, projectedLate, since,
 *     series: [{date, done, total}], next: [{id, title, due, steps: {done, total} | null}],
 *     hours: null | {remainingMin, freeMin, estimated, of, short}}
 */
function homeRunway(o) {
  o = o || {};
  const today = _rwIsIso(o.today) ? o.today : _rwLocalDay(Date.now());
  const unit = o.unit === 'steps' ? 'steps' : 'tasks';
  const days = _rwDays(o);
  const statuses = o.statuses && typeof o.statuses === 'object' ? o.statuses : {};
  const log = o.completionLog && typeof o.completionLog === 'object' ? o.completionLog : {};
  const dayOf = typeof o.dayOf === 'function' ? o.dayOf : _rwLocalDay;
  const date = o.countdown && _rwIsIso(o.countdown.date) ? o.countdown.date : null;
  const items = (Array.isArray(o.items) ? o.items : []).filter(it => it && it.id && rwInScope(it, o.scope, o.match) && !_rwRepeating(it) && !_rwWontDo(it, statuses, log));

  // Units: tasks, or checklist steps (a task without a checklist is one step; a done task's steps are all done).
  const units = [];
  const perTask = new Map();
  for (const it of items) {
    const isDone = statuses[it.id] === 'done';
    const created = dayOf(it.createdAt);
    const doneDay = isDone ? dayOf(_rwLastTs(log, it.id)) : null;
    const subs = unit === 'steps' && Array.isArray(it.subtasks) ? it.subtasks.filter(s => s && typeof s === 'object') : [];
    if (!subs.length) { units.push({ created, done: isDone, doneDay }); perTask.set(it.id, null); continue; }
    let d = 0;
    for (const s of subs) {
      const sd = isDone || !!s.done;
      if (sd) d++;
      units.push({ created: dayOf(s.ts) || created, done: sd, doneDay: sd ? (s.done && s.doneAt ? dayOf(s.doneAt) : doneDay) : null });
    }
    perTask.set(it.id, { done: d, total: subs.length });
  }
  const total = units.length;
  const done = units.filter(u => u.done).length;
  const open = total - done;

  // The start of the chart (and the earliest the pace window reaches back).
  const t0 = _rwDayNo(today);
  let since;
  if (_rwIsIso(o.since)) since = _rwIso(Math.max(t0 - RUNWAY_SINCE_LIMIT, Math.min(t0, _rwDayNo(o.since))));
  else {
    const first = units.reduce((m, u) => (u.created && (!m || u.created < m) ? u.created : m), null);
    since = first ? _rwIso(Math.max(t0 - RUNWAY_SINCE_MAX, Math.min(t0, _rwDayNo(first)))) : _rwAdd(today, -(RUNWAY_PACE_DAYS - 1));
  }
  const s0 = _rwDayNo(since);

  // Burn-up: done and total at the end of each day since `since` (unknown days count from the start).
  const span = t0 - s0 + 1;
  const addT = new Array(span).fill(0), addD = new Array(span).fill(0);
  const at = (iso) => (iso ? Math.max(0, Math.min(span - 1, _rwDayNo(iso) - s0)) : 0);
  for (const u of units) {
    if (u.created && _rwDayNo(u.created) > t0) addT[span - 1]++; else addT[at(u.created)]++;
    if (u.done) addD[at(u.doneDay)]++;
  }
  const series = [];
  let ct = 0, cd = 0;
  for (let i = 0; i < span; i++) { ct += addT[i]; cd += addD[i]; series.push({ date: _rwIso(s0 + i), done: Math.min(cd, ct), total: ct }); }

  // Actual pace: what was finished in the last 14 days (never before `since`) per workday.
  const wFrom = _rwIso(Math.max(t0 - (RUNWAY_PACE_DAYS - 1), s0));
  const recentDone = units.filter(u => u.done && u.doneDay && u.doneDay >= wFrom && u.doneDay <= today).length;
  const wDays = rwWorkdaysIn(wFrom, today, days);
  const actual = recentDone / Math.max(1, wDays);

  // Time left: calendar days, and workdays from today up to the day before the date (the date
  // itself when it is today), as the top bar counts them.
  const daysLeft = date ? _rwDayNo(date) - t0 : null;
  const workdaysLeft = date == null ? null : daysLeft < 0 ? 0 : daysLeft === 0 ? 1 : rwWorkdaysIn(today, _rwAdd(date, -1), days);
  const required = date != null && daysLeft >= 0 && open > 0 ? open / Math.max(1, workdaysLeft) : 0;

  let status;
  if (!total) status = 'empty';
  else if (!open) status = 'done';
  else if (date != null && daysLeft < 0) status = 'past';
  else if (actual >= required) status = 'on';
  else if (actual >= RUNWAY_TIGHT * required) status = 'tight';
  else status = 'behind';

  // Projected finish at the actual pace.
  let projected = null;
  if (open > 0 && actual > 0) projected = rwNthWorkday(today, Math.ceil(open / actual - 1e-9), days);
  const projectedLate = !!(projected && date && projected > date);

  // The next open tasks: in progress first, then by date, priority and age.
  const due = (it) => (_rwIsIso(it.dueDate) ? it.dueDate : '9999-12-31');
  const next = items.filter(it => statuses[it.id] !== 'done').sort((a, b) =>
    ((statuses[b.id] === 'doing') - (statuses[a.id] === 'doing'))
    || due(a).localeCompare(due(b))
    || ((_RW_PRIO[a.priority] ?? 3) - (_RW_PRIO[b.priority] ?? 3))
    || ((dayOf(a.createdAt) || '').localeCompare(dayOf(b.createdAt) || ''))
    || String(a.title || '').localeCompare(String(b.title || '')))
    .map(it => ({ id: it.id, title: String(it.title || ''), due: _rwIsIso(it.dueDate) ? it.dueDate : null, steps: perTask.get(it.id) || null }));

  // Hours (only when at least half the open tasks have estimates): the work left against free time.
  let hours = null;
  const openTasks = items.filter(it => statuses[it.id] !== 'done');
  const est = openTasks.filter(it => Number(it.estimate) > 0);
  if (typeof o.freeMinOn === 'function' && date != null && daysLeft >= 0 && openTasks.length && est.length * 2 >= openTasks.length) {
    const avg = est.reduce((n, it) => n + Number(it.estimate), 0) / est.length;
    let remainingMin = 0;
    for (const it of openTasks) {
      const st = perTask.get(it.id);
      const frac = st && st.total ? (st.total - st.done) / st.total : 1;
      remainingMin += (Number(it.estimate) > 0 ? Number(it.estimate) : avg) * frac;
    }
    let freeMin = 0;
    const last = daysLeft === 0 ? t0 : _rwDayNo(date) - 1;
    for (let k = t0; k <= last && k - t0 <= 400; k++) freeMin += Math.max(0, Number(o.freeMinOn(_rwIso(k))) || 0);
    remainingMin = Math.round(remainingMin);
    hours = { remainingMin, freeMin: Math.round(freeMin), estimated: est.length, of: openTasks.length, short: remainingMin > freeMin };
  }

  return {
    unit, total, done, open, date, today, daysLeft, workdaysLeft,
    required: Math.round(required * 100) / 100, actual: Math.round(actual * 100) / 100, recentDone,
    window: { from: wFrom, workdays: wDays },
    status, statusText: RUNWAY_STATUS_TEXT[status], projected, projectedLate, since, series, next, hours,
  };
}

/**
 * The burn-up chart for a model: paths in a w x h box. The x axis runs from `since` to the
 * date (or today when the date has passed); the done line always has RUNWAY_POINTS points.
 * -> {done, area, total, need, today: {x, y}, end: {x, y}, dateX, max}
 */
function rwSparkGeometry(m, o) {
  o = o || {};
  const w = o.w || 300, h = o.h || 60, pad = o.pad == null ? 3 : o.pad, n = o.n || RUNWAY_POINTS;
  const series = m && Array.isArray(m.series) && m.series.length ? m.series : [{ date: (m && m.today) || '1970-01-01', done: 0, total: 0 }];
  const a = _rwDayNo(series[0].date), t = _rwDayNo(series[series.length - 1].date);
  const end = m && m.date && _rwDayNo(m.date) > t ? _rwDayNo(m.date) : t;
  const width = Math.max(1, end - a);
  const max = Math.max(1, ...series.map(p => p.total));
  const X = (day) => Math.round((pad + (day - a) / width * (w - 2 * pad)) * 10) / 10;
  const Y = (v) => Math.round((h - pad - (v / max) * (h - 2 * pad)) * 10) / 10;
  const val = (key, day) => {                        // the series at a fractional day (steps between days)
    const i = Math.max(0, Math.min(series.length - 1, Math.floor(day - a)));
    return series[i][key];
  };
  const pts = [];
  for (let i = 0; i < n; i++) { const day = a + (t - a) * (n === 1 ? 1 : i / (n - 1)); pts.push([X(day), Y(val('done', day))]); }
  const line = (p) => 'M' + p.map(q => q[0] + ' ' + q[1]).join(' L');
  const done = line(pts);
  const area = done + ` L${pts[pts.length - 1][0]} ${Y(0)} L${pts[0][0]} ${Y(0)} Z`;
  const totPts = [];
  for (let i = 0; i < n; i++) { const day = a + (t - a) * (n === 1 ? 1 : i / (n - 1)); totPts.push([X(day), Y(val('total', day))]); }
  totPts.push([X(end), Y(series[series.length - 1].total)]);
  const last = series[series.length - 1];
  const todayPt = { x: X(t), y: Y(last.done) };
  const endPt = { x: X(end), y: Y(last.total) };
  const need = end > t && last.done < last.total ? `M${todayPt.x} ${todayPt.y} L${endPt.x} ${endPt.y}` : '';
  return { done, area, total: line(totPts), need, today: todayPt, end: endPt, dateX: m && m.date && end === _rwDayNo(m.date) ? X(end) : null, max };
}

/**
 * The chart as a table, a row a week: the week's first day, what was done by its end (past
 * weeks) and what has to be done by its end to finish on time (weeks still to come).
 */
function rwWeekRows(m, o) {
  o = o || {};
  const series = m && Array.isArray(m.series) ? m.series : [];
  if (!series.length) return [];
  const rows = [];
  const a = _rwDayNo(series[0].date), t = _rwDayNo(series[series.length - 1].date);
  for (let k = a; k <= t; k += 7) {
    const e = Math.min(t, k + 6);
    rows.push({ week: _rwIso(k), done: series[e - a].done, needed: null });
  }
  if (m.date && m.open > 0 && _rwDayNo(m.date) > t) {
    const d = _rwDayNo(m.date), last = series[series.length - 1];
    const per = (last.total - last.done) / Math.max(1, d - t);
    for (let k = t + 1 + ((7 - ((t + 1 - a) % 7)) % 7); k <= d && rows.length < (o.max || 80); k += 7) {
      const e = Math.min(d, k + 6);
      rows.push({ week: _rwIso(k), done: null, needed: Math.min(last.total, Math.round((last.done + per * (e - t)) * 10) / 10) });
    }
  }
  return rows;
}

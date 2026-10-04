/* ============================================================
   HOME widget "habits": the pure model (WIDGETS_CATALOGUE.md 3.12).
   OWNER: the "habits" widget builder (Phase 1, wave 1). The widget is
   12-home-w-habits.js; tests/home-w-habits.test.mjs runs this file alone in a VM.
   No DOM, no state, no clock: everything comes in as arguments. Loads before
   12-home.js (build order), so it only declares things.

   No habits store: a habit is a repeating task (recurrence + an optional tag),
   ticked through the completion log; a skip is the task's `occurrence` activity
   with skipped: true (markWontDo / task.wont_do). So MCP clients, the assistant and
   the Tasks views already understand habits.

   homeHabitKind(rec)          'day' (daily, weekdays) | 'period' (weekly, biweekly,
                               monthly) | null (does not repeat)
   homeHabitTag(tag)           the tag as stored on tasks: no '#', lower case ('habit' when blank)
   homeHabitPick(tasks, o)     which tasks are habits. o: {mode: 'auto'|'tag'|'all', tag, isOpen(t)}
                               auto: tasks with the tag if any exist, else tasks repeating daily,
                               on weekdays, weekly or every 2 weeks (monthly ones are usually bills
                               and chores); tag: only the tag; all: every repeating task.
                               -> {list (stable order), source: 'tag'|'repeat'|'all', tag, mode}
   homeHabitStats(item, o)     one habit's chain. o: {completions [ms], activity [entries], today
                               'YYYY-MM-DD', days (the window, default 14), weekStart 'Mon'|'Sun'|'Sat',
                               dayOf(ms) -> 'YYYY-MM-DD' (default: local time)}
     Day habits (daily, weekdays), one state per day:
       done     a completion that day             skipped  a skip that day
       missed   a scheduled day gone by with neither
       due      today, still open (it never breaks the chain)
       off      not scheduled (a weekend for a weekday habit); 'extra' when done anyway
       before   before the habit began            future   after today
     Period habits (weekly, every 2 weeks, monthly): a period is done when any completion
       falls inside it, else skipped, else missed once it is over (open while it runs).
       Weeks start on the user's week start; 2-week periods are counted from the week of the
       task's date; months are calendar months.
     Streak: the run of consecutive scheduled days (or periods) done or skipped, counted back
       from today; a skip keeps the chain but does not add to it; today still open does not
       break it. Best: the longest such run. Rate: done / (done + missed) over the last 30 days.
     The habit begins when it became a repeating task (its last "does not repeat" -> repeating
       change in the activity), else when it was created or first done, whichever is earlier.
       Before anything is done or skipped, a first date still ahead moves the start there (a
       habit that starts next month has missed nothing).
     -> {kind, rec, start, now, doneToday, skippedToday, tickable, showToday, streak, best,
         rate, rateDone, rateOf, window: {done, of, unit, unitOne}, cells [{date, state}] (the
         last `days` days), heat [{date, state}] (8 weeks, the week start first, column by
         column), next}
       now (today, or this period for period habits): done | skipped | due | open (this
         period, its date still ahead: a tick now counts) | later (its next date is after
         this period) | off | before
   homeHabitSummary(st)        "done 11 of the last 14 days" (each row's text summary)
   homeHabitSay(title, st)     "Stretch, done today, 6-day streak" (a pill's accessible name)
   homeHabitTotals(list)       {due, done, all}: today's habits (the header's count and the
                               once-a-day celebration when every one is done)
   ============================================================ */
const HOME_HABIT_AUTO = Object.freeze(['daily', 'weekdays', 'weekly', 'biweekly']);
const _HAB_ORDER = Object.freeze({ daily: 0, weekdays: 1, weekly: 2, biweekly: 3, monthly: 4 });
const _HAB_MAX_DAYS = 3660;                       // ten years: the walks stay bounded

function homeHabitKind(rec) {
  const r = String(rec == null ? '' : rec);
  if (r === 'daily' || r === 'weekdays') return 'day';
  if (r === 'weekly' || r === 'biweekly' || r === 'monthly') return 'period';
  return null;
}
function homeHabitTag(tag) {
  const t = String(tag == null ? '' : tag).trim().replace(/^#+/, '').trim().toLowerCase();
  return t || 'habit';
}

/* ---------- days as numbers (UTC day counts, so no time zone can shift them) ---------- */
function _habDn(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso == null ? '' : iso));
  return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN;
}
function _habIso(dn) { return new Date(dn * 86400000).toISOString().slice(0, 10); }   // clock-ok: a day number to its ISO date (UTC arithmetic)
function _habDow(dn) { return (((dn + 4) % 7) + 7) % 7; }          // 1 Jan 1970 was a Thursday; 0 = Sunday
function _habLocalDay(ms) {
  const d = new Date(Number(ms));
  if (!Number.isFinite(d.getTime())) return '';
  if (typeof Clock !== 'undefined') return Clock.parts(d.getTime()).iso;   // the page's day (travel spec 2.7)
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;   // clock-ok: Node fallback
}
function _habWeekStartDow(ws) {
  const s = String(ws == null ? 'Mon' : ws).trim().toLowerCase();
  return s.startsWith('sun') ? 0 : s.startsWith('sat') ? 6 : 1;
}
function _habWeekOf(dn, wsDow) { return dn - ((_habDow(dn) - wsDow + 7) % 7); }
function _habMonthOf(dn) { const d = new Date(dn * 86400000); return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 86400000); }
function _habMonthEnd(dn) { const d = new Date(dn * 86400000); return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 86400000) - 1; }

/* ---------- which tasks are habits ---------- */
function homeHabitOrder(list) {
  return (list || []).slice().sort((a, b) =>
    ((_HAB_ORDER[a.recurrence] ?? 9) - (_HAB_ORDER[b.recurrence] ?? 9))
    || ((Number(a.createdAt) || 0) - (Number(b.createdAt) || 0))
    || String(a.title || '').localeCompare(String(b.title || ''))
    || String(a.id).localeCompare(String(b.id)));
}
function homeHabitPick(tasks, o) {
  o = o || {};
  const tag = homeHabitTag(o.tag);
  const mode = o.mode === 'tag' || o.mode === 'all' ? o.mode : 'auto';
  const open = typeof o.isOpen === 'function' ? o.isOpen : () => true;
  const repeating = (tasks || []).filter(t => t && t.id && homeHabitKind(t.recurrence) && open(t));
  const tagged = (t) => Array.isArray(t.tags) && t.tags.some(x => homeHabitTag(x) === tag);
  let list, source;
  if (mode === 'all') { list = repeating; source = 'all'; }
  else if (mode === 'tag') { list = repeating.filter(tagged); source = 'tag'; }
  else {
    const withTag = repeating.filter(tagged);
    if (withTag.length) { list = withTag; source = 'tag'; }
    else { list = repeating.filter(t => HOME_HABIT_AUTO.includes(t.recurrence)); source = 'repeat'; }
  }
  return { list: homeHabitOrder(list), source, tag, mode };
}

/* ---------- one habit's chain ---------- */
function homeHabitStats(item, o) {
  o = o || {};
  item = item || {};
  const rec = String(item.recurrence || 'none');
  const kind = homeHabitKind(rec);
  const today = _habDn(o.today);
  const days = Math.max(1, Math.min(120, Math.round(Number(o.days)) || 14));
  const dayOf = typeof o.dayOf === 'function' ? o.dayOf : _habLocalDay;
  const dn = (ms) => (ms == null || ms === '' || !Number.isFinite(Number(ms)) ? NaN : _habDn(dayOf(Number(ms))));
  const wsDow = _habWeekStartDow(o.weekStart);
  const activity = Array.isArray(o.activity) ? o.activity : [];
  if (!Number.isFinite(today)) {
    return { kind, rec, start: null, now: 'off', doneToday: false, skippedToday: false, tickable: false, showToday: false, streak: 0, best: 0, rate: null, rateDone: 0, rateOf: 0, window: { done: 0, of: 0, unit: 'days', unitOne: 'day' }, cells: [], heat: [], next: null };
  }

  // When it became a habit: the last change from "does not repeat" to a repeat.
  let became = NaN;
  for (const a of activity) {
    if (!a || a.type !== 'recurrence') continue;
    const from = a.from == null ? 'none' : String(a.from), to = a.to == null ? 'none' : String(a.to);
    if (from === 'none' && to !== 'none') { const d = dn(a.ts); if (Number.isFinite(d) && !(d <= became)) became = d; }
  }
  const done = new Set(), skip = new Set();
  for (const ts of Array.isArray(o.completions) ? o.completions : []) {
    const d = dn(ts);
    if (Number.isFinite(d) && d <= today && !(d < became)) done.add(d);
  }
  for (const a of activity) {
    if (!a || a.type !== 'occurrence' || !a.skipped) continue;
    const d = dn(a.ts);
    if (Number.isFinite(d) && d <= today && !(d < became) && !done.has(d)) skip.add(d);
  }
  const marks = [...done, ...skip];
  const firstMark = marks.length ? Math.min(...marks) : NaN;
  let start = became;
  if (!Number.isFinite(start)) {
    const made = dn(item.createdAt);
    start = Number.isFinite(made) ? (Number.isFinite(firstMark) ? Math.min(made, firstMark) : made) : (Number.isFinite(firstMark) ? firstMark : today);
  }
  const due = _habDn(item.dueDate);
  if (!marks.length && Number.isFinite(due) && due > start) start = due;   // not begun yet: nothing before its first date is missed
  if (!Number.isFinite(start)) start = today;
  start = Math.max(start, today - _HAB_MAX_DAYS);

  let dayState, nowState, streak = 0, best = 0, rateDone = 0, rateOf = 0;
  const win = { done: 0, of: 0, unit: 'days', unitOne: 'day' };
  const cell = (d) => ({ date: _habIso(d), state: dayState(d) });

  if (kind === 'day') {
    const sched = rec === 'weekdays' ? (d) => { const w = _habDow(d); return w >= 1 && w <= 5; } : () => true;
    dayState = (d) => {
      if (d > today) return 'future';
      if (d < start) return 'before';
      if (!sched(d)) return done.has(d) ? 'extra' : 'off';
      if (done.has(d)) return 'done';
      if (skip.has(d)) return 'skipped';
      return d === today ? 'due' : 'missed';
    };
    for (let d = today; d >= start; d--) {                 // back from today: missed ends it
      const s = dayState(d);
      if (s === 'done') streak++;
      else if (s === 'missed') break;
    }
    let run = 0;
    for (let d = start; d <= today; d++) {
      const s = dayState(d);
      if (s === 'done') { run++; if (run > best) best = run; } else if (s === 'missed') run = 0;
    }
    for (let d = Math.max(start, today - 29); d <= today; d++) {
      const s = dayState(d);
      if (s === 'done') { rateDone++; rateOf++; } else if (s === 'missed') rateOf++;
    }
    for (let d = today - days + 1; d <= today; d++) {
      const s = dayState(d);
      if (s === 'done') { win.done++; win.of++; } else if (s === 'missed' || s === 'skipped') win.of++;
    }
    if (rec === 'weekdays') { win.unit = 'weekdays'; win.unitOne = 'weekday'; }
    nowState = dayState(today);
    if (nowState === 'extra') nowState = 'done';
    // Its next date is after today with nothing marked today (moved on by hand): not today's.
    if (nowState === 'due' && Number.isFinite(due) && due > today) nowState = 'later';
  } else if (kind === 'period') {
    const anchor = _habWeekOf(Number.isFinite(due) ? due : start, wsDow);
    const pOf = rec === 'weekly' ? (d) => _habWeekOf(d, wsDow)
      : rec === 'biweekly' ? (d) => anchor + 14 * Math.floor((_habWeekOf(d, wsDow) - anchor) / 14)
        : _habMonthOf;
    const pEnd = rec === 'weekly' ? (p) => p + 6 : rec === 'biweekly' ? (p) => p + 13 : _habMonthEnd;
    const pMemo = new Map();
    const pState = (p) => {
      if (pMemo.has(p)) return pMemo.get(p);
      const e = pEnd(p);
      let s;
      if (p > today) s = 'future';
      else if (e < start) s = 'before';
      else {
        let anyDone = false, anySkip = false;
        for (let d = Math.max(p, start); d <= Math.min(e, today); d++) { if (done.has(d)) { anyDone = true; break; } if (skip.has(d)) anySkip = true; }
        s = anyDone ? 'done' : anySkip ? 'skipped' : e >= today ? 'open' : 'missed';
      }
      pMemo.set(p, s);
      return s;
    };
    dayState = (d) => {
      if (d > today) return 'future';
      if (d < start) return 'before';
      if (done.has(d)) return 'done';
      if (skip.has(d)) return 'skipped';
      const s = pState(pOf(d));
      return s === 'done' ? 'cover' : s === 'skipped' ? 'skipcover' : s === 'missed' ? 'lapse' : d === today ? 'due' : 'open';
    };
    const cur = pOf(today), first = pOf(start);
    for (let p = cur; p >= first; p = pOf(p - 1)) {
      const s = pState(p);
      if (s === 'done') streak++;
      else if (s === 'missed' || s === 'before') break;
    }
    const periods = [];
    for (let p = first; p <= cur; p = pEnd(p) + 1) periods.push(p);
    let run = 0;
    for (const p of periods) {
      const s = pState(p);
      if (s === 'done') { run++; if (run > best) best = run; } else if (s === 'missed') run = 0;
    }
    for (const p of periods) {
      if (pEnd(p) < today - 29) continue;
      const s = pState(p);
      if (s === 'done') { rateDone++; rateOf++; } else if (s === 'missed') rateOf++;
    }
    for (const p of periods) {
      if (pEnd(p) < today - days + 1) continue;
      const s = pState(p);
      if (s === 'done') { win.done++; win.of++; } else if (s === 'missed' || s === 'skipped') win.of++;
    }
    if (rec === 'weekly') { win.unit = 'weeks'; win.unitOne = 'week'; }
    else if (rec === 'biweekly') { win.unit = 'fortnights'; win.unitOne = 'fortnight'; }
    else { win.unit = 'months'; win.unitOne = 'month'; }
    const cs = pState(cur);
    nowState = start > pEnd(cur) || cs === 'before' ? 'before'
      : cs === 'done' ? 'done' : cs === 'skipped' ? 'skipped'
        : !Number.isFinite(due) || due <= today ? 'due' : due <= pEnd(cur) ? 'open' : 'later';
  } else {
    dayState = (d) => (d > today ? 'future' : 'off');
    nowState = 'off';
  }

  const doneToday = done.has(today), skippedToday = skip.has(today);
  const tickable = kind === 'day' ? nowState === 'due' : nowState === 'due' || nowState === 'open';
  const showToday = doneToday || skippedToday || nowState === 'due' || (kind === 'day' && (nowState === 'done' || nowState === 'skipped'));
  const cells = [];
  for (let d = today - days + 1; d <= today; d++) cells.push(cell(d));
  const heat = [];
  const h0 = _habWeekOf(today, wsDow) - 7 * 7;
  for (let i = 0; i < 56; i++) heat.push(cell(h0 + i));
  return {
    kind, rec, start: Number.isFinite(start) ? _habIso(start) : null, now: nowState,
    doneToday, skippedToday, tickable, showToday,
    streak, best: Math.max(best, streak),
    rate: rateOf ? rateDone / rateOf : null, rateDone, rateOf,
    window: win, cells, heat, next: Number.isFinite(due) ? _habIso(due) : null,
  };
}

/* ---------- words ---------- */
function homeHabitSummary(st) {
  if (!st || !st.window) return '';
  const w = st.window;
  if (st.now === 'before' && !w.of) return 'not started yet';
  if (!w.of) return st.doneToday ? 'done today' : 'nothing to count yet';
  if (w.of === 1) return `done ${w.done} of 1 ${w.unitOne}`;
  return `done ${w.done} of the last ${w.of} ${w.unit}`;
}
function homeHabitSay(title, st) {
  const t = String(title || 'Habit');
  if (!st) return t;
  const period = st.kind === 'period' ? ({ weekly: 'this week', biweekly: 'this fortnight', monthly: 'this month' })[st.rec] || 'this time' : 'today';
  const state = st.doneToday ? 'done today'
    : st.now === 'done' ? `done ${period}`
      : st.now === 'skipped' || st.skippedToday ? `skipped ${period}`
        : st.now === 'due' ? (st.kind === 'period' ? `due ${period}` : 'not done yet')
          : st.now === 'open' ? `open ${period}` : st.now === 'before' ? 'not started yet' : 'not due today';
  const unit = st.kind === 'period' ? ({ weekly: 'week', biweekly: 'fortnight', monthly: 'month' })[st.rec] || 'period' : 'day';
  return `${t}, ${state}, ${st.streak}-${unit} streak`;
}
function homeHabitTotals(list) {
  let due = 0, done = 0, skipped = 0, all = 0;
  for (const h of list || []) {
    if (!h) continue;
    all++;
    if (!h.showToday) continue;
    due++;
    if (h.doneToday) done++;
    else if (h.skippedToday || h.now === 'skipped') skipped++;
  }
  // allDone: every habit of today is ticked or skipped, and at least one was really done.
  return { due, done, skipped, open: due - done - skipped, all, allDone: due > 0 && done > 0 && done + skipped === due };
}

/* ============================================================
   HOME widget "gap" (Fill the gap): the pure parts. OWNER: the "gap" widget
   builder (WIDGETS_CATALOGUE.md 3.2). The widget is 12-home-w-gap.js.
   No DOM, no state, no page globals: tests/home-w-gap.test.mjs runs this file
   in a VM beside 12-home-plan-logic.js (planMergeBusy, planFreeGaps), which it
   only calls inside functions (the build loads this file before that one).
   Times are minutes since midnight; days 'YYYY-MM-DD'.

     GAP_MIN                       15: shorter free stretches are not gaps
     GAP_UNESTIMATED_MIN           45: a task with no estimate is offered only in gaps this long
     gapTaskMinutes(t)             its estimate, else 15 when tagged quick / small / 5min, else null
     gapDay(o)                     the free time left today, from now:
                                   {state: 'off'|'free'|'busy'|'none', cur, busyUntil, busyWith,
                                    endsWith, later, gaps, sig}
     gapCandidates(len, tasks, o)  the tasks that fit `len` minutes, best first (the spec's rule)
     gapPlanAll(gaps, tasks, o)    each gap's best task, each task once ("Plan it" rows, Plan all)
     gapBlockLength(pick, len)     how long a block for a pick is (15 min at least, inside the gap)
     gapRing(cur, nowMin)          {left, total, frac}: the ring that empties as the gap runs out
     gapWords(day, nowMin)         the words: {big, unit, line, sub, aria}

   Task shape (the suggestions snapshot's, 68-suggest-context.js _sgTasks): {id, title,
   stream, priority, status, due, dueTime, planned, plannedTime, estimate, tags, waiting,
   snoozed, notStarted}.
   ============================================================ */
const GAP_MIN = 15;
const GAP_UNESTIMATED_MIN = 45;
const _GAP_QUICK_TAGS = ['quick', 'small', '5min'];

function _gapHM(min) {
  const m = Math.max(0, Math.min(24 * 60, Math.round(Number(min) || 0)));
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
/** "45 min", "2 h", "1 h 30 min". */
function _gapDur(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
/** The same for a screen reader: "1 hour 30 minutes". */
function _gapDurSay(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  const h = Math.floor(m / 60), r = m % 60;
  const hs = h ? `${h} hour${h === 1 ? '' : 's'}` : '', rs = r || !h ? `${r} minute${r === 1 ? '' : 's'}` : '';
  return [hs, rs].filter(Boolean).join(' ');
}
function _gapDays(a, b) {
  const p = (s) => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
  return Math.round((p(b) - p(a)) / 86400000);
}
function _gapShort(t, max) {
  const s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : s;
}
function _gapTagged(t) {
  const tags = Array.isArray(t && t.tags) ? t.tags : [];
  return tags.some(x => _GAP_QUICK_TAGS.includes(String(x || '').replace(/^#/, '').toLowerCase()));
}

/** The task's minutes: its estimate, else 15 when tagged quick / small / 5min, else null (unknown). */
function gapTaskMinutes(t) {
  const e = Number(t && t.estimate);
  if (e > 0) return Math.round(e);
  return _gapTagged(t) ? 15 : null;
}

/**
 * The free time left today, from now. o: {nowMin, workStart, workEnd, workDay (default true),
 * blocks: [{start, end, title, kind: 'event'|'task'}] (timed events and timed tasks today), min (15)}
 * -> {state, cur, busyUntil, busyWith, endsWith, later, gaps, sig}
 *   state 'off'   outside the working hours (or not a working day)
 *         'free'  free right now: cur = {start: now, end, minutes, from (when the stretch began)}
 *         'busy'  in something (or a stretch under 15 min) now: cur = the next gap
 *         'none'  no gap of `min` minutes left today
 *   busyUntil     the end of what is on now (busy only; null when free for a few minutes)
 *   busyWith      what is on now {title, kind} (busy only)
 *   endsWith      what ends cur {title, kind, start} (null = the end of the working day)
 *   later         the gaps after cur; gaps = all of them, cur first
 *   sig           changes only when the picture changes (not every minute), for the tick
 */
function gapDay(o) {
  o = o || {};
  const now = Number(o.nowMin);
  const ws = Number.isFinite(o.workStart) ? o.workStart : 9 * 60;
  const we = Number.isFinite(o.workEnd) ? o.workEnd : 18 * 60;
  const min = Number.isFinite(o.min) ? o.min : GAP_MIN;
  const off = { state: 'off', cur: null, busyUntil: null, busyWith: null, endsWith: null, later: [], gaps: [], sig: 'off' };
  if (o.workDay === false || !Number.isFinite(now) || now < ws || now >= we) return off;
  const blocks = (Array.isArray(o.blocks) ? o.blocks : []).filter(b => b && Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start);
  const merged = planMergeBusy(blocks);
  const gaps = planFreeGaps(blocks, { start: ws, end: we, from: now, min });
  const onNow = merged.find(([s, e]) => s <= now && e > now) || null;
  let cur = null, state = 'none', busyUntil = null, busyWith = null;
  const first = gaps[0] || null;
  if (first && first.start <= now && !onNow) {
    state = 'free';
    // When this stretch began: the end of what came before it (or the start of the day).
    let from = ws;
    for (const [, e] of merged) if (e <= now && e > from) from = e;
    cur = { start: now, end: first.end, minutes: first.end - now, from: Math.min(from, now) };
  } else if (first) {
    state = 'busy';
    cur = { start: first.start, end: first.end, minutes: first.minutes, from: first.start };
    if (onNow) {
      busyUntil = onNow[1];
      const on = blocks.filter(b => b.start <= now && b.end > now)
        .sort((a, b) => ((a.kind === 'event') === (b.kind === 'event') ? (a.start - b.start) || String(a.title || '').localeCompare(String(b.title || '')) : a.kind === 'event' ? -1 : 1))[0];
      busyWith = on ? { title: String(on.title || ''), kind: on.kind || 'event' } : null;
    }
  }
  if (!cur) return Object.assign({}, off, { state: 'none', sig: 'none' });
  const after = blocks.filter(b => b.start === cur.end)
    .sort((a, b) => ((a.kind === 'event') === (b.kind === 'event') ? String(a.title || '').localeCompare(String(b.title || '')) : a.kind === 'event' ? -1 : 1))[0];
  const endsWith = after && cur.end < we ? { title: String(after.title || ''), kind: after.kind || 'event', start: after.start } : null;
  const later = gaps.slice(1).map(g => ({ start: g.start, end: g.end, minutes: g.minutes }));
  const sig = [state, cur.from, cur.end, busyUntil == null ? '' : busyUntil, endsWith ? endsWith.title : '', later.map(g => g.start + '-' + g.end).join(',')].join('|');
  return { state, cur, busyUntil, busyWith, endsWith, later, gaps: [cur].concat(later), sig };
}

/**
 * The tasks that fit `len` free minutes, best first. o: {today, buffer (5), allowUnestimated
 * (true), focus: [ids] (Home's Focus list, in order), skip: [ids], limit (3)}.
 * 1. Eligible: open, already started, not waiting, not snoozed on Home, no time of its own
 *    today (a planned slot or a due time: it is already on the schedule), not in skip.
 * 2. Minutes: gapTaskMinutes (the estimate, else 15 when tagged quick, else unknown).
 * 3. Fits: minutes <= len - buffer. Unknown: only when allowed and len >= 45 ("no estimate").
 * 4. Rank: overdue or due today; in Focus; p1; due within 3 days; the shortest that fits;
 *    then the Focus order, the due date, the title and the id (deterministic).
 * -> [{id, title, stream, minutes (null = unknown), unknown, why: [chips], reason, due, priority, inFocus}]
 */
function gapCandidates(len, tasks, o) {
  o = o || {};
  len = Math.round(Number(len) || 0);
  const buffer = Number.isFinite(Number(o.buffer)) ? Math.max(0, Number(o.buffer)) : 5;
  const allow = o.allowUnestimated !== false;
  const today = o.today || '';
  const focus = Array.isArray(o.focus) ? o.focus : [];
  const skip = new Set(Array.isArray(o.skip) ? o.skip : o.skip instanceof Set ? [...o.skip] : []);
  const room = len - buffer;
  if (len < GAP_MIN) return [];
  const out = [];
  for (const t of Array.isArray(tasks) ? tasks : []) {
    if (!t || !t.id || skip.has(t.id)) continue;
    if (t.status === 'done' || t.waiting || t.snoozed || t.notStarted) continue;
    if ((t.planned === today && t.plannedTime) || (t.due === today && t.dueTime)) continue;
    const minutes = gapTaskMinutes(t);
    const unknown = minutes == null;
    if (unknown) { if (!allow || len < GAP_UNESTIMATED_MIN) continue; }
    else if (minutes > room) continue;
    const d = t.due && today ? _gapDays(today, t.due) : null;
    const urgent = d !== null && d <= 0, soon = d !== null && d > 0 && d <= 3;
    const fi = focus.indexOf(t.id);
    const p1 = t.priority === 'p1';
    const why = [];
    why.push(unknown ? 'no estimate' : `fits ${minutes} min`);
    if (d !== null && d < 0) why.push('overdue');
    else if (d === 0) why.push('due today');
    else if (d === 1) why.push('due tomorrow');
    else if (soon) why.push(`due in ${d} days`);
    if (fi >= 0) why.push('in Focus');
    if (p1) why.push('p1');
    if (_gapTagged(t)) why.push('quick');
    out.push({
      id: t.id, title: String(t.title || ''), stream: t.stream || '', minutes: unknown ? null : minutes, unknown,
      why, reason: why[0], due: t.due || null, priority: t.priority || 'p0', inFocus: fi >= 0,
      _k: [urgent ? 0 : 1, fi >= 0 ? 0 : 1, p1 ? 0 : 1, soon ? 0 : 1, unknown ? 1e6 : minutes, fi >= 0 ? fi : 1e6, t.due || '9999-99-99'],
    });
  }
  out.sort((a, b) => {
    for (let i = 0; i < a._k.length; i++) {
      const x = a._k[i], y = b._k[i];
      if (x !== y) return typeof x === 'string' ? x.localeCompare(y) : x - y;
    }
    return a.title.localeCompare(b.title) || String(a.id).localeCompare(String(b.id));
  });
  const limit = Number.isFinite(o.limit) ? o.limit : 3;
  return out.slice(0, limit).map(({ _k, ...c }) => c);
}

/**
 * Each gap's best task, every task at most once, in gap order (L: one "Plan it" row per gap;
 * Plan all). gaps: [{start, end}] (the first may start now); o: as gapCandidates, plus
 * o.skip (ids never picked). -> [{gap, pick: candidate | null, len (block minutes)}]
 */
function gapPlanAll(gaps, tasks, o) {
  o = o || {};
  const used = new Set(Array.isArray(o.skip) ? o.skip : []);
  const out = [];
  for (const g of Array.isArray(gaps) ? gaps : []) {
    if (!g || !(g.end > g.start)) continue;
    const len = g.end - g.start;
    const pick = gapCandidates(len, tasks, Object.assign({}, o, { skip: [...used], limit: 1 }))[0] || null;
    if (pick) used.add(pick.id);
    out.push({ gap: { start: g.start, end: g.end, minutes: len }, pick, len: pick ? gapBlockLength(pick, len) : 0 });
  }
  return out;
}

/** A block for a pick: its minutes (30 when unknown), at least 15, never longer than the gap (0 = no room). */
function gapBlockLength(pick, len) {
  len = Math.round(Number(len) || 0);
  if (len < GAP_MIN) return 0;
  const want = pick && Number(pick.minutes) > 0 ? Number(pick.minutes) : 30;
  return Math.min(len, Math.max(GAP_MIN, Math.round(want / 5) * 5));
}

/** The ring: how much of the stretch is left (free) or the whole next gap (busy). */
function gapRing(cur, nowMin) {
  if (!cur) return { left: 0, total: 0, frac: 0 };
  const total = Math.max(1, cur.end - (Number.isFinite(cur.from) ? cur.from : cur.start));
  const left = Math.max(0, cur.end - Math.max(cur.start, Number(nowMin) || 0));
  return { left, total, frac: Math.max(0, Math.min(1, left / total)) };
}

/**
 * The words for the top of the widget. day = gapDay(...).
 * -> {big, unit (the ring's centre), line ("25 min free"), sub ("until Standup at 14:00"), aria}
 */
function gapWords(day, nowMin) {
  if (!day || !day.cur) return { big: '', unit: '', line: '', sub: '', aria: '' };
  const c = day.cur;
  const left = day.state === 'free' ? Math.max(0, c.end - nowMin) : c.minutes;
  const big = left < 60 ? String(left) : `${Math.floor(left / 60)} h`;
  const unit = left < 60 ? 'min' : (left % 60 ? `${left % 60} min` : '');
  const what = day.endsWith && day.endsWith.title ? _gapShort(day.endsWith.title, 40) : '';
  const endTxt = c.end >= 24 * 60 ? 'midnight' : _gapHM(c.end);
  if (day.state === 'free') {
    const sub = what ? `until ${what} at ${endTxt}` : `until ${endTxt}`;
    return { big, unit, line: `${_gapDur(left)} free`, sub, aria: `${_gapDurSay(left)} free ${sub}` };
  }
  const until = what ? ` until ${what}` : ` until ${endTxt}`;
  if (day.busyUntil == null) {
    // Free for a few minutes now (under 15): the next real gap.
    const line = `Next gap at ${_gapHM(c.start)}`;
    return { big, unit, line, sub: `${_gapDur(c.minutes)} free${until}`, aria: `${line}: ${_gapDurSay(c.minutes)} free${until}` };
  }
  const then = c.start === day.busyUntil;
  const line = `Busy until ${_gapHM(day.busyUntil)}`;
  const sub = then ? `then ${_gapDur(c.minutes)} free` : `${_gapDur(c.minutes)} free from ${_gapHM(c.start)}`;
  return { big, unit, line, sub, aria: `${line}, ${then ? `then ${_gapDurSay(c.minutes)} free` : `${_gapDurSay(c.minutes)} free from ${_gapHM(c.start)}`}${until}` };
}

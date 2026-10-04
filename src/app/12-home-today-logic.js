/* ============================================================
   HOME "today" hero: the pure parts (no DOM, no state, no globals).
   Owner: HB1 (today hero). The widget is 12-home-w-today.js; tests load
   this file alone in a VM (tests/home-today.test.mjs).

     homeTodayShort(title, max)       a title short enough to sit in a sentence
     homeTodayDur(min)                {big, small}: "42 min" | "6 h" + "12 min"
     homeTodayGaps(events, nowMin, o) free gaps left today (o: {start, end, min})
     homeTodayStats(input)            the numbers row (morning or evening)
     homeTodayTemplate(input)         "today in a few lines" from tasks and events,
                                      when no AI script exists:
                                      {sentences:[{text, entities:[{type, ref, text, start, end}]}], tone}
                                      (the same shape as a story script, so one renderer draws both)
     homeTodaySegments(text, ents)    the text cut into plain and entity runs
     homeTodayRain(hourly, today, h)  the first rain window from hour h today, or null
     homeTodayWeek(iso)               the ISO week number
     homeTodayChips(input)            the deadline / countdown chips, most urgent first
   Times are 'HH:MM' strings (local), dates 'YYYY-MM-DD'.
   ============================================================ */
const _HT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const _HT_DAY_START = 9 * 60;       // the working day the free-time maths uses
const _HT_DAY_END = 18 * 60;
function _htWord(n) { return n >= 0 && n < 10 ? _HT_WORDS[n] : String(n); }
function _htCount(n, one, many) { return `${_htWord(n)} ${n === 1 ? one : (many || one + 's')}`; }
function _htCap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function _htMin(hm) { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function _htHM(min) { const m = Math.max(0, Math.round(Number(min) || 0)); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
/** Timed events (start known), by start time. */
function _htTimed(events) {
  return (Array.isArray(events) ? events : []).filter(e => e && !e.allDay && _htMin(e.start) !== null)
    .slice().sort((a, b) => _htMin(a.start) - _htMin(b.start));
}
function _htEnd(e) { const s = _htMin(e.start), x = _htMin(e.end); return x !== null && x > s ? x : s + 30; }
/** All-day entries (a birthday, leave), each once, in the order given. */
function _htAllDay(events) {
  const seen = new Set();
  return (Array.isArray(events) ? events : []).filter(e => {
    if (!e || !e.allDay) return false;
    const k = e.id ? 'i:' + e.id : 't:' + e.title;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * A title short enough to say in a sentence: the part before a colon, semicolon,
 * " - " or bracket when that is a real name, then at most `max` characters on a
 * word boundary. Same rule as lib/story-data.mjs shortTitle.
 */
function homeTodayShort(t, max) {
  max = max || 48;
  const full = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  let s = full;
  const head = s.split(/\s*(?::|;|\s[–—-]\s|\(|\[|\|)\s*/)[0];
  if (head.length >= 8 && head.length < s.length) s = head;
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '');
  s = s.replace(/[\s,.;:–—-]+$/, '');
  return s || full.slice(0, max);
}

/** A span of minutes as {big, small}: 42 -> "42 min"; 372 -> "6 h" + "12 min"; 120 -> "2 h". */
function homeTodayDur(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return { big: `${m} min`, small: '' };
  return { big: `${Math.floor(m / 60)} h`, small: m % 60 ? `${m % 60} min` : '' };
}
/** Free time in words: 45 -> "45 min", 150 -> "2½ h", 120 -> "2 h". */
function _htFree(min) {
  if (min < 60) return `${Math.round(min / 5) * 5} min`;
  const h = Math.floor(min / 60), half = min % 60 >= 30;
  return `${h}${half ? '½' : ''} h`;
}

/**
 * The free gaps left today between max(now, o.start) and o.end, at least o.min
 * minutes long (defaults 09:00, 18:00, 30). [{start, end, minutes}] in minutes.
 */
function homeTodayGaps(events, nowMin, o) {
  o = o || {};
  const dayEnd = Number.isFinite(o.end) ? o.end : _HT_DAY_END;
  const from = Math.max(Number(nowMin) || 0, Number.isFinite(o.start) ? o.start : _HT_DAY_START);
  const min = Number.isFinite(o.min) ? o.min : 30;
  const out = [];
  let at = from;
  for (const e of _htTimed(events)) {
    const a = _htMin(e.start), b = _htEnd(e);
    if (b <= at) continue;
    if (a > at) { const end = Math.min(a, dayEnd); if (end - at >= min) out.push({ start: at, end, minutes: end - at }); }
    at = Math.max(at, b);
    if (at >= dayEnd) return out;
  }
  if (dayEnd - at >= min) out.push({ start: at, end: dayEnd, minutes: dayEnd - at });
  return out;
}

/**
 * The numbers row. x = {
 *   now: 'HH:MM', evening, dueToday, overdue, doneToday, firstDoneAt: 'HH:MM'|null, slipped,
 *   events: [{id, title, start, end, allDay, bg}] (today; bg = leave / out-of-office / a
 *     free block: all-day, but not counted as an event, as in Today's schedule),
 *   calendar: false when there is none, 'unknown' before it has been read,
 *   tomorrowFirst: {id, title, start}|null,
 *   focus: [{done, subDone, subTotal}]  (a task without subtasks counts as one step),
 *   dayStart, dayEnd (minutes; default 09:00-18:00) }
 * -> {due, events, next, focus, done, slipped}: each has the text its cell shows.
 */
function homeTodayStats(x) {
  x = x || {};
  const now = _htMin(x.now) ?? 0;
  const timed = _htTimed(x.events);
  const allDay = _htAllDay(x.events);
  const left = timed.filter(e => _htEnd(e) > now);
  const held = timed.length - left.length;
  const upcoming = left.filter(e => _htMin(e.start) > now);
  const current = left.find(e => _htMin(e.start) <= now) || null;
  const cal = x.calendar !== false;
  const unknown = x.calendar === 'unknown';          // not read yet: say nothing rather than "nothing"

  const nd = Math.max(0, x.dueToday || 0), no = Math.max(0, x.overdue || 0);
  const due = { n: nd, overdue: no, bad: no > 0, sub: no ? `${no} overdue` : 'Nothing overdue' };

  let evSub;
  if (!cal) evSub = 'No calendar';
  else if (unknown) evSub = '';
  else if (!timed.length) evSub = allDay.length ? 'No meetings' : 'Nothing booked';
  else if (!left.length) evSub = 'All done';
  else if (x.evening) evSub = `${_htCap(_htWord(left.length))} still to come`;
  else {
    const from = Math.max(now, Number.isFinite(x.dayStart) ? x.dayStart : _HT_DAY_START);
    const first = upcoming[0];
    if (!current && first && _htMin(first.start) - from >= 120) evSub = `Free until ${first.start}`;
    else {
      const free = homeTodayGaps(timed, now, { start: x.dayStart, end: x.dayEnd }).reduce((t, g) => t + g.minutes, 0);
      evSub = free >= 30 ? `${_htFree(free)} free` : 'Back to back';
    }
  }
  const events = { n: timed.length + allDay.filter(e => !e.bg).length, timed: timed.length, allDay: allDay.length, held, left: left.length, calendar: cal, unknown, sub: evSub };

  let next;
  const up = upcoming[0];
  if (up) {
    const m = _htMin(up.start) - now, d = homeTodayDur(m);
    next = { state: 'soon', id: up.id || null, title: up.title || '', start: up.start, end: up.end || '', minutes: m, big: d.big, small: d.small, at: up.start };
  } else if (current) {
    next = { state: 'now', id: current.id || null, title: current.title || '', start: current.start, end: current.end || '', minutes: 0, big: 'Now', small: '', at: current.end ? `until ${current.end}` : '' };
  } else if (x.tomorrowFirst && x.tomorrowFirst.start) {
    const t = x.tomorrowFirst;
    next = { state: 'tomorrow', id: t.id || null, title: t.title || '', start: t.start, end: t.end || '', minutes: null, big: 'Tomorrow', small: t.start, at: '' };
  } else {
    next = { state: 'none', id: null, title: '', start: '', end: '', minutes: null, big: '—', small: '', at: unknown ? '' : cal ? 'Nothing else today' : 'No calendar' };
  }

  let fd = 0, ft = 0;
  for (const f of Array.isArray(x.focus) ? x.focus : []) {
    if (!f) continue;
    const t = Math.max(1, Math.round(Number(f.subTotal) || 0));
    ft += t;
    fd += f.done ? t : Math.min(t, Math.max(0, Math.round(Number(f.subDone) || 0)));
  }
  const focus = { done: fd, total: ft, pct: ft ? Math.round(fd / ft * 100) : 0 };

  const n = Math.max(0, x.doneToday || 0);
  const done = { n, sub: n ? (x.firstDoneAt ? `Since ${x.firstDoneAt}` : 'Good going') : 'A blank page' };
  const s = Math.max(0, x.slipped || 0);
  const slipped = { n: s, sub: s ? 'Roll them to tomorrow' : 'Nothing slipped' };
  return { due, events, next, focus, done, slipped };
}

/* ---------- "today in a few lines", the deterministic version ---------- */
/** A sentence with entity spans; offsets are counted as the text grows. */
function _htSay() {
  let text = '';
  const entities = [];
  const b = {
    t(s) { text += s; return b; },
    e(type, ref, s) { const start = text.length; text += s; entities.push({ type, ref: String(ref), text: s, start, end: text.length }); return b; },
    done() {
      if (!text.trim()) return null;
      const first = text.charAt(0);
      // Never re-case an entity (its text has to match the sentence exactly).
      if (!entities.some(e => e.start === 0)) text = first.toUpperCase() + text.slice(1);
      return { text, entities };
    },
  };
  return b;
}
/**
 * x = {
 *   evening, now: 'HH:MM', dayStart, dayEnd,
 *   dueToday: [{id, title}], overdue: [{id, title}], dueTomorrow: [{id, title}],
 *   events: [{id, title, start, end, allDay, bg}] (today),
 *   calendar: true (read), false (none) or 'unknown' (not read yet); without one
 *     nothing is said about meetings or free time (default true),
 *   focus: [{id, title}] (the Focus list, most important first),
 *   done: [{id, title}] (evening: finished today, most important first), doneCount,
 *   slipped (evening: still open, due or planned today or before), slippedToday (of those, today's),
 *   tomorrowFirst: {id, title, start}|null }
 * -> {sentences (at most 3), tone: 'clear'|'busy'|'normal'|'evening'}
 * All-day entries (a birthday, leave) are named on a day without meetings, so the
 * words never call the calendar empty while the Events number and Today's
 * schedule show something.
 */
function homeTodayTemplate(x) {
  x = x || {};
  const now = _htMin(x.now) ?? 0;
  const timed = _htTimed(x.events);
  const left = timed.filter(e => _htEnd(e) > now);
  const upcoming = left.filter(e => _htMin(e.start) > now);
  const current = left.find(e => _htMin(e.start) <= now) || null;
  const due = Array.isArray(x.dueToday) ? x.dueToday.filter(Boolean) : [];
  const over = Array.isArray(x.overdue) ? x.overdue.filter(Boolean) : [];
  const focus = Array.isArray(x.focus) ? x.focus.filter(Boolean) : [];
  const S = [];
  const said = new Set();
  const push = (b) => { const s = b.done(); if (s && S.length < 3) S.push(s); };
  const sh = (o, n) => homeTodayShort(o && o.title, n);
  const task = (b, t) => { said.add(t.id); return b.e('task', t.id, sh(t)); };
  const ev = (b, e) => b.e('event', e.id, sh(e, 40));
  const time = (b, hm, text) => b.e('time', hm, text || hm);

  if (x.evening) {
    const n = Math.max(0, x.doneCount || 0), top = (x.done || [])[0];
    if (n && top) push(task(_htSay().t(`You closed ${_htCount(n, 'task')} today, including `), top).t('.'));
    else if (n) push(_htSay().t(`You closed ${_htCount(n, 'task')} today.`));
    else push(_htSay().t('A quieter day on the list. Rest counts too.'));
    const s = Math.max(0, x.slipped || 0);
    const st = Number.isFinite(x.slippedToday) ? Math.min(s, x.slippedToday) : s;
    const tonight = upcoming[0];
    // "Didn't fit today" only when they were today's; older ones are just "still open".
    if (s && st === s) push(_htSay().t(`${_htCap(_htCount(s, 'thing'))} didn’t fit today; ${s === 1 ? 'it can' : 'they can'} move to tomorrow without guilt.`));
    else if (s) push(_htSay().t(`${_htCap(_htCount(s, 'thing'))} ${s === 1 ? 'is' : 'are'} still open${st ? `, ${_htWord(st)} of them from today` : ''}; pick what moves to tomorrow.`));
    else if (tonight) push(time(ev(_htSay().t('Still to come: '), tonight).t(' at '), tonight.start).t('.'));
    const tf = x.tomorrowFirst;
    const dt = (x.dueTomorrow || [])[0];
    if (tf && tf.start) push(ev(time(_htSay().t('Tomorrow starts at '), tf.start).t(' with '), tf).t('.'));
    else if (dt) push(task(_htSay().t('Tomorrow, '), dt).t(' is due.'));
    else if (s && tonight) push(time(ev(_htSay().t('Still to come: '), tonight).t(' at '), tonight.start).t('.'));
    return { sentences: S, tone: 'evening' };
  }

  const nothingDue = !due.length && !over.length;
  const from = Math.max(now, Number.isFinite(x.dayStart) ? x.dayStart : _HT_DAY_START);
  // No calendar, or not read yet: say nothing about meetings or free time rather than "none".
  const known = x.calendar === undefined || x.calendar === true;
  // All-day entries (a birthday, leave): the Events number and Today's schedule show them, so a
  // day without meetings names them ("Lena's birthday today, otherwise a clear day ...").
  const allDay = known ? _htAllDay(x.events) : [];
  const days = (b) => {
    allDay.slice(0, 2).forEach((e, i) => {
      if (i) b.t(allDay.length > 2 ? ', ' : ' and ');
      if (e.id) ev(b, e); else b.t(sh(e, 40));
    });
    if (allDay.length > 2) b.t(` and ${_htWord(allDay.length - 2)} more`);
    return b;
  };
  let tone = timed.length >= 4 ? 'busy' : 'normal';
  // 1. The calendar.
  if (!known) {
    if (nothingDue) { push(_htSay().t('Nothing is due today.')); tone = 'clear'; }
  } else if (nothingDue && !left.length) {
    if (allDay.length) push(days(_htSay()).t(timed.length ? ' today, otherwise a clear rest of the day: nothing is due and the meetings are done.'
      : ' today, otherwise a clear day: nothing is due and there are no meetings.'));
    else push(_htSay().t(timed.length ? 'A clear rest of the day: nothing is due and the calendar is done.' : 'A clear day: nothing is due and the calendar is empty.'));
    tone = 'clear';
  } else if (nothingDue && !current && upcoming[0] && _htMin(upcoming[0].start) - from >= 120) {
    const e = upcoming[0];
    if (allDay.length) push(ev(time(days(_htSay()).t(' today. Nothing is due, and there are no meetings until '), e.start).t(', when you have '), e).t('.'));
    else push(ev(time(_htSay().t('A clear day. Nothing is due, and the calendar is empty until '), e.start).t(', when you have '), e).t('.'));
    tone = 'clear';
  } else if (current) {
    const b = ev(_htSay().t('Right now it’s '), current);
    if (upcoming[0]) time(ev(b.t(', then '), upcoming[0]).t(' at '), upcoming[0].start);
    else if (current.end) b.t(` until ${current.end}`);
    push(b.t('.'));
  } else if (upcoming.length) {
    const b = time(ev(_htSay().t(timed.length > upcoming.length ? 'Next up is ' : 'First up is '), upcoming[0]).t(' at '), upcoming[0].start);
    if (upcoming[1]) time(ev(b.t(', then '), upcoming[1]).t(' at '), upcoming[1].start);
    const more = upcoming.length - 2;
    if (more > 0) b.t(`, and ${_htWord(more)} more after that`);
    push(b.t('.'));
  } else if (timed.length) push(allDay.length ? days(_htSay()).t(' today, and the meetings are done.') : _htSay().t('The calendar is clear for the rest of the day.'));
  else push(allDay.length ? days(_htSay()).t(' today, and no meetings, so the day is yours.') : _htSay().t('No meetings today, so the day is yours.'));

  // 2. What is due (the clear-day sentence already said it).
  if (tone !== 'clear') {
    if (due.length === 1) {
      const b = task(_htSay(), due[0]).t(' is due today');
      if (over.length) b.t(`, and ${_htCount(over.length, 'task')} ${over.length === 1 ? 'is' : 'are'} overdue`);
      push(b.t('.'));
    } else if (due.length > 1) {
      const b = task(_htSay().t(`${_htCap(_htCount(due.length, 'thing'))} are due today, starting with `), due[0]);
      if (over.length) b.t(`, plus ${_htWord(over.length)} overdue`);
      push(b.t('.'));
    } else if (over.length === 1) push(task(_htSay().t('Nothing is due today, but '), over[0]).t(' is overdue.'));
    else if (over.length > 1) push(task(_htSay().t(`Nothing is due today, but ${_htCount(over.length, 'overdue task')} could use a look, starting with `), over[0]).t('.'));
  }

  // 3. One practical suggestion: the clearest stretch, pointed at the top Focus task.
  const f = focus.find(t => !said.has(t.id)) || null;
  const gaps = known ? homeTodayGaps(timed, now, { start: x.dayStart, end: x.dayEnd, min: 45 }) : [];
  const best = gaps.slice().sort((a, b) => b.minutes - a.minutes)[0] || null;
  if (tone === 'clear') {
    if (f) push(task(_htSay().t('A good day to get ahead on '), f).t(', or to rest.'));
    else push(_htSay().t('A good day to get ahead, or to rest.'));
  } else if (best && f) {
    const range = `${_htHM(best.start)}–${_htHM(best.end)}`;
    push(task(time(_htSay().t('Your clearest stretch is '), _htHM(best.start), range).t(': point it at '), f).t('.'));
  } else if (f) push(task(_htSay().t('When you get a moment, make a start on '), f).t('.'));
  else if (best && best.minutes >= 60) {
    const range = `${_htHM(best.start)}–${_htHM(best.end)}`;
    push(time(_htSay().t('Your clearest stretch is '), _htHM(best.start), range).t('.'));
  }
  return { sentences: S, tone };
}

/** text cut into [{text, start, end, entity|null}] (entities by offsets, else by their text). */
function homeTodaySegments(text, entities) {
  const s = String(text || '');
  const lower = s.toLowerCase();
  const spans = [];
  for (const e of Array.isArray(entities) ? entities : []) {
    if (!e) continue;
    let a = Number(e.start), b = Number(e.end);
    if (!(Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b <= s.length && b > a)) {
      const i = e.text ? lower.indexOf(String(e.text).toLowerCase()) : -1;
      if (i < 0) continue;
      a = i; b = i + String(e.text).length;
    }
    if (spans.some(x => a < x.end && b > x.start)) continue;
    spans.push({ start: a, end: b, entity: e });
  }
  spans.sort((p, q) => p.start - q.start);
  const out = [];
  let at = 0;
  for (const sp of spans) {
    if (sp.start > at) out.push({ text: s.slice(at, sp.start), start: at, end: sp.start, entity: null });
    out.push({ text: s.slice(sp.start, sp.end), start: sp.start, end: sp.end, entity: sp.entity });
    at = sp.end;
  }
  if (at < s.length) out.push({ text: s.slice(at), start: at, end: s.length, entity: null });
  return out;
}

/**
 * The first rain window today from hour `fromHour` (hourly = lib/weather.mjs
 * hourly[]: {date, hour, cond, rain}). Hours in a row with a rain chance of
 * o.min % or more (default 50). -> {from, to, chance, label, cond} | null
 */
function homeTodayRain(hourly, today, fromHour, o) {
  const min = (o && Number.isFinite(o.min)) ? o.min : 50;
  const hrs = (Array.isArray(hourly) ? hourly : []).filter(h => h && h.date === today && Number(h.hour) >= (Number(fromHour) || 0))
    .slice().sort((a, b) => a.hour - b.hour);
  const i = hrs.findIndex(h => (Number(h.rain) || 0) >= min);
  if (i < 0) return null;
  let j = i, peak = Number(hrs[i].rain) || 0;
  while (j + 1 < hrs.length && (Number(hrs[j + 1].rain) || 0) >= min && hrs[j + 1].hour === hrs[j].hour + 1) { j++; peak = Math.max(peak, Number(hrs[j].rain) || 0); }
  const wet = hrs.slice(i, j + 1).find(h => /^(rain|showers|drizzle|thunder|snow)$/.test(h.cond)) || hrs[i];
  const label = { rain: 'Rain', showers: 'Showers', drizzle: 'Drizzle', thunder: 'Thunder', snow: 'Snow' }[wet.cond] || 'Rain likely';
  const hh = (h) => String(h % 24).padStart(2, '0') + ':00';
  return { from: hh(hrs[i].hour), to: hh(hrs[j].hour + 1), chance: peak, label, cond: wet.cond || 'rain' };
}

/** ISO 8601 week number of a 'YYYY-MM-DD' date. */
function homeTodayWeek(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

/**
 * The deadline chips, most urgent first (the row shows what fits and fades the rest).
 * x = {evening, dueToday:[{id,title}], dueTomorrow:[{id,title}],
 *      countdowns:[{id, label, num, unit, warn}] (soonest or headline first), tomorrowFirst:{id,title,start}|null}
 * -> [{kind: 'task'|'countdown'|'event', ref, lead, text, title, tone: 'acc'|'warn'|''}]
 */
function homeTodayChips(x) {
  x = x || {};
  const out = [];
  const add = (c) => { if (out.length < 3 && !out.some(o => o.kind === c.kind && o.ref === c.ref)) out.push(c); };
  const tk = (t, lead, tone) => add({ kind: 'task', ref: t.id, lead, text: homeTodayShort(t.title, 40), title: String(t.title || ''), tone });
  if (x.evening && x.tomorrowFirst && x.tomorrowFirst.start) {
    const e = x.tomorrowFirst;
    add({ kind: 'event', ref: e.id, lead: `Tomorrow ${e.start}`, text: homeTodayShort(e.title, 32), title: String(e.title || ''), tone: '' });
  }
  if (!x.evening) for (const t of (x.dueToday || []).slice(0, 2)) tk(t, 'Today', 'acc');
  for (const t of (x.dueTomorrow || []).slice(0, 2)) tk(t, 'Tomorrow', 'warn');
  for (const c of x.countdowns || []) {
    if (!c || !c.id) continue;
    add({ kind: 'countdown', ref: c.id, lead: `${c.num}${c.unit ? ' ' + c.unit : ''}`, text: homeTodayShort(c.label, 32), title: String(c.label || ''), tone: c.warn ? 'warn' : '' });
  }
  return out;
}

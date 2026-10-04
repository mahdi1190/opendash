/* ============================================================
   HOME calendar helpers, shared by the "schedule" and "week" widgets
   (12-home-w-schedule.js, 12-home-w-week.js). Owner: HB3 (schedule, week,
   countdowns). Declarations only: build.mjs loads 12-home-*.js before
   12-home.js, and nothing here runs until Home renders.

   Where events come from (read-only):
     - the calendar store (CalStore + calEntriesOn, 40-calendar.js): every
       connected calendar with the user's colours and visibility, declined
       events left out. Loaded on first use; its 'load' repaints Home.
     - while that store does not exist (a trimmed build), the top bar's small
       cache (calendarSoon, 10-header.js), with the widget's own repaint.
   Scenes are classified like the morning brief (animForEvent, 74-brief-ui.js;
   animClassify for the small cache). Leave, out-of-office and "free" blocks
   are background, as in the brief: an all-day chip, never "now" or "next".

     homeCalStatus(onUpdate)   {off, loading, none, error, ok, stale, running, fetchedAt, label}
     homeCalEvents(iso)        that day's events: [{kind:'event', key, id, title, allDay,
                               bg, start, end (minutes in the day), color, type,
                               location, join, people:[personId], calendar, until}]
     homeTimedTasks(iso)       open tasks with a time that day (kind:'task')
     homeDayModel(o)           PURE: one day's timeline (past / now / next, the
                               now line, free gaps). tests/home-schedule.test.mjs
     homeDur(min), homeHM(min) "1 h 30 min" / "42 min", "09:05"
     homeCalOpenEvent(id, el)  the event card (openEvent), else the calendar
   ============================================================ */
const HOME_WORK_START = 8 * 60;      // free gaps are looked for between 08:00 ...
const HOME_WORK_END = 18 * 60;       // ... and 18:00: focus time, not evenings
const HOME_GAP_MIN = 45;             // shorter free stretches get no band
const HOME_GAP_BEST = 90;            // the longest gap of at least this is "best for focus"
const HOME_CAL_STALE_MS = 6 * 3600 * 1000;

function homeHM(min) {
  const m = Math.max(0, Math.min(24 * 60, Math.round(Number(min) || 0)));
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
/** "42 min", "2 h", "1 h 30 min". */
function homeDur(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
function _homeMinOf(hm) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function homeNowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function _homeAddDays(iso, n) { const [y, m, d] = String(iso).split('-').map(Number); return fmtDate(new Date(y, (m || 1) - 1, (d || 1) + n)); }

/* ---------- is there a calendar, and how fresh is it ---------- */
function _homeCalStore() { return typeof CalStore !== 'undefined' && CalStore && typeof calEntriesOn === 'function' ? CalStore : null; }
function _homeServerUp() { return typeof _serverAvailable === 'undefined' || !!_serverAvailable; }
/**
 * What the calendar can give Home right now. Starts the store loading the first
 * time (its 'load' repaints Home); onUpdate is for the small-cache fallback.
 */
function homeCalStatus(onUpdate) {
  const out = { off: false, loading: false, none: false, error: '', ok: false, stale: false, running: false, fetchedAt: '', label: '' };
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.features && APP_CONFIG.features.calendar === false) { out.off = true; return out; }
  const store = _homeCalStore();
  if (store) {
    const st = store.st || {};
    if (!st.loaded && !st.loading && _homeServerUp()) { try { store.load(); } catch (e) { /* shown as not loaded */ } }
    const d = store.data;
    out.running = typeof store.running === 'function' && store.running();
    if (!st.loaded) { if (_homeServerUp()) out.loading = true; else out.none = true; return out; }
    if (st.error && !d) { out.error = String(st.error); return out; }
    const has = !!(d && (d.fetchedAt || (Array.isArray(d.events) && d.events.length) || (Array.isArray(d.calendars) && d.calendars.length)));
    if (!has) { out.none = true; return out; }
    out.ok = true;
    out.fetchedAt = d.fetchedAt || '';
  } else if (typeof calendarSoon === 'function') {
    const c = calendarSoon(onUpdate);
    if (c.loading && !c.at) { out.loading = true; return out; }
    if (!c.ok) { out.none = true; return out; }
    out.ok = true;
    out.fetchedAt = c.fetchedAt || '';
  } else { out.none = true; return out; }
  const at = Date.parse(out.fetchedAt || '');
  if (Number.isFinite(at)) {
    out.stale = Date.now() - at > HOME_CAL_STALE_MS;
    const d = new Date(at);
    let when = '';
    try {
      when = fmtDate(d) === todayStr() ? d.toLocaleTimeString(APP_CONFIG.locale || undefined, { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short' });
    } catch (e) { when = fmtDate(d); }
    out.label = 'Updated ' + when;
  }
  return out;
}

/* ---------- people on an event (attendees matched by email) ---------- */
let _homeCalPplKey = '', _homeCalPplMap = new Map();
function _homeCalPeopleMap() {
  const people = (typeof state !== 'undefined' && Array.isArray(state.people)) ? state.people : [];
  const key = people.length + ':' + people.map(p => p && p.id).join(',');
  if (key === _homeCalPplKey) return _homeCalPplMap;
  _homeCalPplKey = key;
  _homeCalPplMap = new Map();
  for (const p of people) {
    if (!p || p.self) continue;
    for (const e of [p.email, ...(Array.isArray(p.emails) ? p.emails : [])]) if (typeof e === 'string' && e) _homeCalPplMap.set(e.toLowerCase(), p.id);
  }
  return _homeCalPplMap;
}
function _homeCalPeople(attendees) {
  const map = _homeCalPeopleMap(), out = [];
  for (const a of Array.isArray(attendees) ? attendees : []) {
    if (!a || a.self) continue;
    const id = a.personId || (a.email && map.get(String(a.email).toLowerCase()));
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/* ---------- one day's events ---------- */
/** The day's events, normalised; timed ones sorted by start. */
function homeCalEvents(iso) {
  const store = _homeCalStore();
  if (store && store.data) return _homeCalFromStore(iso);
  if (typeof _calSoon !== 'undefined' && _calSoon && Array.isArray(_calSoon.events)) return _homeCalFromSoon(iso, _calSoon.events);
  return [];
}
function _homeCalFromStore(iso) {
  let entries = [];
  try { entries = calEntriesOn(iso, { sources: { google: true, tasks: false, countdowns: false, declined: false } }); } catch (e) { return []; }
  const out = [];
  for (const e of entries) {
    if (!e || e.kind !== 'event' || e.declined) continue;
    const ev = e.ref || {};
    let type = 'event';
    try { if (typeof animForEvent === 'function') type = animForEvent(ev).type || 'event'; } catch (x) { /* plain scene */ }
    const bg = !e.allDay && (!!e.free || type === 'holiday' || ev.eventType === 'outOfOffice');
    let cal = '', until = '', first = iso;
    try { const c = typeof calEventCalendar === 'function' ? calEventCalendar(ev) : null; cal = c ? c.name || '' : ''; } catch (x) { /* no name */ }
    try { const span = typeof calEventDays === 'function' ? calEventDays(ev) : null; if (span) { first = span[0]; if (span[1] > iso) until = span[1]; } } catch (x) { /* one day */ }
    out.push({
      kind: 'event', key: 'e:' + e.id, id: e.id, title: String(e.title || '(no title)'), allDay: !!e.allDay || bg, bg,
      start: e.allDay ? 0 : Math.max(0, Number(e.start) || 0), end: e.allDay ? 24 * 60 : Math.min(24 * 60, Number(e.end) || 0),
      at: !e.allDay && ev.start && ev.start.dateTime ? Date.parse(ev.start.dateTime) : null,   // the instant it starts
      color: e.color || 'blue', type, important: !!e.important,
      location: String(ev.location || ''), join: !!(ev.conferenceUrl || ev.hangoutLink), people: _homeCalPeople(ev.attendees), calendar: cal, until, first,
    });
  }
  return _homeCalSort(out);
}
function _homeCalFromSoon(iso, list) {
  const out = [];
  for (const e of list) {
    if (!e || !(e.date === iso || (e.until && e.date <= iso && e.until >= iso))) continue;
    const s = _homeMinOf(e.start), en = _homeMinOf(e.end);
    const allDay = !!e.allDay || e.date !== iso || s === null;
    let type = 'event';
    try {
      if (typeof animClassify === 'function' && typeof _animOpts === 'function') {
        type = animClassify({ kind: 'event', title: e.title, location: e.location, link: !!e.joinUrl, attendees: (e.attendees || []).length, start: s, minutes: s !== null && en !== null ? en - s : 0, allDay }, _animOpts()).type || 'event';
      }
    } catch (x) { /* plain scene */ }
    const bg = !allDay && type === 'holiday';
    out.push({
      kind: 'event', key: 'e:' + (e.id || e.date + (e.start || '') + e.title), id: e.id || '', title: String(e.title || '(no title)'), allDay: allDay || bg, bg,
      start: allDay ? 0 : s, end: allDay ? 24 * 60 : (en !== null && en > s ? en : s + 30), color: 'blue', type, important: !!e.important,
      location: String(e.location || ''), join: !!e.joinUrl, people: _homeCalPeople(e.attendees), calendar: e.calendar || '', until: e.until && e.until > iso ? e.until : '', first: e.date || iso,
    });
  }
  return _homeCalSort(out);
}
function _homeCalSort(list) {
  return list.sort((a, b) => (b.allDay - a.allDay) || (a.start - b.start) || (a.end - b.end) || a.title.localeCompare(b.title));
}

/** Open tasks with a time on that day (a scheduled block or a due time). */
function homeTimedTasks(iso) {
  if (typeof getAllItems !== 'function') return [];
  const out = [];
  for (const i of getAllItems()) {
    if (statusOf(i.id) === 'done' || effDate(i) !== iso) continue;
    const s = _homeMinOf(i.dueTime);
    if (s === null) continue;
    const est = Math.max(5, Math.min(12 * 60, Number(i.estimate) || 30));
    const st = (typeof STREAMS !== 'undefined' && STREAMS[effStream(i)]) || null;
    out.push({ kind: 'task', key: 't:' + i.id, id: i.id, title: String(effTitle(i) || ''), allDay: false, bg: false, start: s, end: Math.min(24 * 60, s + est),
      color: st && st.color ? st.color : '', stream: st ? st.label || '' : '', prio: effPriority(i), estimated: !!Number(i.estimate) });
  }
  return out.sort((a, b) => a.start - b.start || a.title.localeCompare(b.title));
}

/* ---------- the day's timeline (pure) ---------- */
/**
 * o: {events, tasks, nowMin (null = not today), nowMs (Date.now(), optional), workStart, workEnd, gapMin}
 * -> {allDay, timed, rows, next, nextIn, current, gaps, freeMin, eventCount, sig}
 * rows, in reading order: {t:'item', item, state:'past'|'now'|'future', next},
 * {t:'now', min} (after anything under way, before the first thing still to
 * start), {t:'gap', start, end, minutes, best, lead}. Gaps: free stretches of
 * at least gapMin between workStart and workEnd, from now on (a gap that
 * starts now begins at the next quarter hour). sig changes only when the
 * picture changes (something starts or ends, a gap appears), so a minute tick
 * can update the "in 42 min" text in place and repaint only then.
 */
function homeDayModel(o) {
  o = o || {};
  const ws = Number.isFinite(o.workStart) ? o.workStart : HOME_WORK_START;
  const we = Number.isFinite(o.workEnd) ? o.workEnd : HOME_WORK_END;
  const gmin = Number.isFinite(o.gapMin) ? o.gapMin : HOME_GAP_MIN;
  const now = Number.isFinite(o.nowMin) ? o.nowMin : null;
  const allDay = [], timed = [];
  for (const e of o.events || []) (e.allDay || e.bg ? allDay : timed).push(e);
  for (const t of o.tasks || []) timed.push(t);
  timed.sort((a, b) => (a.start - b.start) || (a.end - b.end) || ((a.kind === 'task') - (b.kind === 'task')) || String(a.title).localeCompare(String(b.title)));
  const endOf = (x) => (x.end > x.start ? x.end : x.start + 1);
  const stateOf = (x) => (now === null ? 'future' : endOf(x) <= now ? 'past' : x.start <= now ? 'now' : 'future');
  const items = timed.map(x => ({ t: 'item', item: x, state: stateOf(x), next: false }));
  const future = items.filter(r => r.state === 'future');
  const nx = future.find(r => r.item.kind === 'event') || future[0] || null;
  if (nx) nx.next = true;
  // Free gaps: the busy blocks (events and timed tasks), merged, inside the working day, from now on.
  const busy = timed.map(x => [x.start, endOf(x)]).sort((a, b) => a[0] - b[0]);
  const from0 = now === null ? ws : Math.max(ws, Math.ceil(now / 15) * 15);
  const gaps = [];
  let cur = from0;
  const add = (a, b) => { if (b - a >= gmin) gaps.push({ t: 'gap', start: a, end: b, minutes: b - a, best: false, lead: a === from0 && now !== null }); };
  for (const [s, e] of busy) {
    if (cur >= we) break;
    if (e <= cur) continue;
    if (s > cur) add(cur, Math.min(s, we));
    cur = Math.max(cur, e);
  }
  if (cur < we) add(cur, we);
  let best = null;
  for (const g of gaps) if (g.minutes >= HOME_GAP_BEST && (!best || g.minutes > best.minutes)) best = g;
  if (best) best.best = true;
  // Reading order: items by start, the now line after anything already under way, a gap after what ends at its start.
  const keyed = items.map(r => [r.item.start, 1, r]);
  if (now !== null) keyed.push([now + 0.5, 0, { t: 'now', min: now }]);
  for (const g of gaps) keyed.push([g.start, 2, g]);
  keyed.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  const rows = keyed.map(k => k[2]);
  const sig = [allDay.map(e => e.key).join(','), rows.map(r => (r.t === 'item' ? r.item.key + ':' + r.state[0] + (r.next ? '*' : '') : r.t === 'gap' ? `g${r.start}-${r.end}` : 'now')).join('|')].join('#');
  return {
    allDay, timed, rows, gaps,
    // "in N min": real minutes when the event's instant is known (o.nowMs, item.at), as the brief
    // counts; clock minutes otherwise. They differ only on the night the clocks change.
    next: nx ? nx.item : null,
    nextIn: nx && now !== null ? (Number.isFinite(o.nowMs) && Number.isFinite(nx.item.at) ? Math.max(0, Math.round((nx.item.at - o.nowMs) / 60000)) : nx.item.start - now) : null,
    current: items.filter(r => r.state === 'now').map(r => r.item),
    freeMin: gaps.reduce((n, g) => n + g.minutes, 0),
    eventCount: allDay.filter(e => !e.bg).length + timed.filter(x => x.kind === 'event').length,
    sig,
  };
}

/* ---------- opening an event ---------- */
/** The event's card (61-task-card.js openEvent), else the calendar's own panel, else the calendar. */
function homeCalOpenEvent(id, fromEl) {
  if (!id) { if (typeof setView === 'function') setView('calendar'); return; }
  if (typeof openEvent === 'function') { openEvent(id, { from: fromEl || null }); return; }
  if (typeof calOpenEvent === 'function') { calOpenEvent(id, fromEl); return; }
  if (typeof setView === 'function') setView('calendar');
}
/** CSS colour for a calendar swatch name, a stream colour or a hex. */
function homeCalColor(c, fallback) {
  const v = String(c || '');
  if (/^(indigo|blue|teal|green|amber|orange|red|pink|violet|slate)$/.test(v)) return `var(--sw-${v})`;
  return typeof safeColor === 'function' ? safeColor(v, fallback || 'var(--sw-blue)') : (fallback || 'var(--sw-blue)');
}
/**
 * The bars' one-time grow (week load bars, countdown bars): on the widget's
 * first paint, and on repaints inside that first second, carried on from where
 * it was (data arriving mid-way must not cut it short or start it again).
 */
const _homeGrowAt = new Map();
function homeGrowEntering(card, id, first) {
  const now = performance.now();
  if (first) _homeGrowAt.set(id, now);
  const t0 = _homeGrowAt.get(id);
  const el = t0 === undefined ? Infinity : now - t0;
  if (el > 1100) return;
  card.classList.add('is-entering');
  card.style.setProperty('--grow-el', Math.round(el) + 'ms');
  setTimeout(() => { if (card.isConnected) card.classList.remove('is-entering'); }, Math.max(0, 1100 - el));
}
/** A scene's markup, or nothing when the scene library is not on the page. */
function homeScene(type, o) {
  return typeof animSceneHtml === 'function' ? animSceneHtml(type || 'event', o || {}) : '';
}

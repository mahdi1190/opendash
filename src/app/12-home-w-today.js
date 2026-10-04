/* ============================================================
   HOME widget "today": the hero, the morning brief in more detail without
   starting the story. Owner: HB1 (today hero). Pure logic (tested in Node):
   12-home-today-logic.js. CSS: 13-home-w-today.css.

   What it shows
     - the date and week, the greeting, the mini weather (lib/weather.mjs through
       the brief's GET /api/brief/weather and its client cache, briefLoadWeather);
     - "today in a few lines", with chips for the people, events, times and tasks
       it names (a chip opens what it names). The words come from, in order:
         1. the story's AI script for today (GET /api/story?kind=morning|evening,
            when window.Story exists, Claude wrote it and it is still current),
            drawn with Story.kit.sentenceHtml;
         2. the brief's AI summary for today (GET /api/brief/summary: cached text only);
         3. homeTodayTemplate(): tasks, events and the Focus list.
       Nothing here ever asks Claude to write (no POST): the story engine prefetches;
     - the deadline chips (today, tomorrow, countdowns);
     - Start my day (Story.open('morning'), else the brief page); from the evening
       hour Finish the day (Story.open('evening'), else Review > Evening), on a
       Sunday evening Weekly review (Story.open('week'));
     - five numbers: due today, events (free time), the next event counting down
       live, Focus progress (subtasks done of today's Focus), done today. Evening:
       done, events held, next, Focus, slipped.
   A new user (no tasks at all) gets the welcome hero with three setup steps.

   Sizes: full (two columns) and l (narrow side column, numbers wrap 3 + 2); a
   phone gets the compact hero. Container queries on .hh do the layout.
   Motion, once per entry (ctx.firstPaint): the Focus ring sweeps. The first entry
   of the day also reads the text in (words brighten in turn, chips pop on their
   word); later entries show it formed. Re-renders (saves, live sync, the minute
   tick) carry a running entrance on from where it was (negative delays) and never
   restart it. Loops: only the Next dot pulses (CSS; paused in a hidden tab, none
   with reduced motion). The countdown ticks each minute in place.
   ============================================================ */
registerHomeWidget({
  id: 'today', title: 'Today', icon: 'sun', order: 10,
  description: 'Today in a few lines: weather, the next event, what is due and how Focus is going, with Start my day',
  sizes: ['l', 'full'], defaultSize: 'full',
  render(el, ctx) { return _hhRender(el, ctx); },
  unmount() { _hhStopTicker(); clearTimeout(_hh.waitTimer); },
});

const _HH_READ_KEY = 'dashboard-home-read';     // localStorage: the day the read-along last played
const _HH_WAIT_MS = 900;                         // first paint of an entry: wait this long for the words
const _HH_PO = { p1: 0, p2: 1, p3: 2, p0: 3 };
/* Lucide geometry (ISC, vendor/icons/Lucide-LICENSE.txt). Trusted constant markup. */
const _HH_PLAY = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z"/></svg>';
const _HH_CLOUD = '<path class="w-cl" d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/>';
const _HH_WX = {
  sun: '<g class="w-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></g>',
  moon: '<path class="w-moon" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  cloud: '<path class="w-cl" d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  partly: '<path class="w-sun" d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.95 12.65a4 4 0 0 0-5.93-4.13"/><path class="w-cl" d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  partlyNight: '<path class="w-cl" d="M13 16a3 3 0 1 1 0 6H7a5 5 0 1 1 4.9-6Z"/><path class="w-moon" d="M10.1 9A6 6 0 0 1 16 4a4 4 0 0 0 6 6 6 6 0 0 1-3 5.2"/>',
  fog: _HH_CLOUD + '<path class="w-cl" d="M16 17H7M17 21H9"/>',
  drizzle: _HH_CLOUD + '<path class="w-rn" d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/>',
  rain: _HH_CLOUD + '<path class="w-rn" d="M16 14v6M8 14v6M12 16v6"/>',
  showers: _HH_CLOUD + '<path class="w-rn" d="M16 14v2M8 14v2M12 16v4M16 19v2M8 19v1"/>',
  snow: _HH_CLOUD + '<path class="w-rn" d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/>',
  thunder: '<path class="w-cl" d="M6 16.3A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 .5 9"/><path class="w-sun" d="m13 12-3 5h4l-3 5"/>',
};
let _hh = {
  el: null, timer: 0, tickKey: '', sig: '', vis: false,
  entryAt: 0, read: false, readAt: 0, shown: false, waitUntil: 0, waitTimer: 0,
  story: {}, summary: {}, busy: {},
  evs: null,                                     // today's events by id (the last model), for chips and Next
};

/** Is the hero on Home (12-home.js then titles the page "Home" instead of repeating the greeting)? */
function homeTodayOnBoard() {
  try {
    const w = homeLayout().widgets.find(x => x.id === 'today');
    return !!(w && !w.hidden && homeWidgetAvailable(homeWidgetDef('today')));
  } catch (e) { return false; }
}

/* ---------- small helpers ---------- */
function _hhPad(n) { return String(n).padStart(2, '0'); }
function _hhNowHM(d) { d = d || new Date(); return _hhPad(d.getHours()) + ':' + _hhPad(d.getMinutes()); }
function _hhReduced() {
  if (window.Motion && typeof Motion.prefersReduced === 'function' && Motion.prefersReduced()) return true;
  return typeof animEnabled === 'function' ? !animEnabled() : false;
}
function _hhServer() { return typeof _serverAvailable === 'undefined' || !!_serverAvailable; }
function _hhAiOn() { return typeof briefPrefs !== 'function' || briefPrefs().ai !== false; }
function _hhEveningHour() { return typeof briefPrefs === 'function' ? briefPrefs().eveningHour : 17; }
function _hhGet(url) {
  return fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))));
}
function _hhStory() { return typeof window !== 'undefined' && window.Story && typeof window.Story.open === 'function' ? window.Story : null; }
function _hhCalOff() { return !!(APP_CONFIG.features && APP_CONFIG.features.calendar === false); }
/** On Home, painted, and the hero is there: async arrivals may touch it. */
function _hhLive() { return !!(_hh.el && _hh.el.isConnected && typeof state !== 'undefined' && state.view === 'home'); }
function _hhRerender() { if (_hhLive() && typeof homeRerenderWidget === 'function') homeRerenderWidget('today'); }

/* ---------- the model: everything the hero reads, from the page's own data ---------- */
function _hhModel() {
  const nowD = new Date();
  const today = todayStr();
  const tomorrow = typeof tomorrowStr === 'function' ? tomorrowStr() : fmtDate(new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate() + 1));
  const now = _hhNowHM(nowD);
  const hour = nowD.getHours();
  const evening = hour >= _hhEveningHour();
  const all = getAllItems();
  const open = all.filter(i => statusOf(i.id) !== 'done');
  const prio = (i) => _HH_PO[effPriority(i)] ?? 3;
  const byPrio = (a, b) => (prio(a) - prio(b)) || String(a.dueTime || '99').localeCompare(String(b.dueTime || '99'));
  const dueToday = open.filter(i => effDate(i) === today).sort(byPrio);
  const overdue = open.filter(i => { const d = effDate(i); return d && d < today; }).sort((a, b) => effDate(a).localeCompare(effDate(b)));
  const dueTomorrow = open.filter(i => effDate(i) === tomorrow).sort(byPrio);
  // Done today (the completion log), with the time of the first one.
  let doneToday = 0, firstAt = Infinity;
  const doneIds = [];
  for (const [id, arr] of Object.entries(state.completionLog || {})) {
    let hit = false;
    for (const ts of arr || []) { const n = Number(ts); if (n && fmtDate(new Date(n)) === today) { doneToday++; hit = true; if (n < firstAt) firstAt = n; } }
    if (hit) doneIds.push(id);
  }
  const doneItems = doneIds.map(id => getItem(id)).filter(i => i && statusOf(i.id) === 'done').sort(byPrio);
  // Today's Focus: the Focus list, plus what was finished today that belonged in it.
  const focusList = typeof homeFocusTasks === 'function' ? homeFocusTasks().map(f => f.i) : [];
  const inFocus = new Set(focusList.map(i => i.id));
  const focusDone = doneItems.filter(i => !inFocus.has(i.id) && ((effDate(i) && effDate(i) <= today) || isPinned(i.id) || (i.plannedFor && i.plannedFor <= today) || effPriority(i) === 'p1'));
  const units = (i, done) => { const subs = (typeof getSubtasks === 'function' ? getSubtasks(i.id) : i.subtasks) || []; return { done, subDone: subs.filter(s => s && s.done).length, subTotal: subs.length }; };
  // Calendar: the events Today's schedule shows (so the words, the numbers and the schedule agree).
  const { events, tomorrowFirst, hasCal, unknown: calUnknown } = _hhCal(today, tomorrow);
  // Countdowns, in the top bar's order (tbList puts the headline first; the user orders the rest).
  let countdowns = [];
  if (typeof tbList === 'function' && typeof tbCompute === 'function') {
    countdowns = tbList().filter(w => w && w.visible !== false && w.type === 'countdown' && w.date && w.date >= today)
      .map(w => ({ w, c: tbCompute(w) })).filter(x => !x.c.hidden && !x.c.past).slice(0, 2)
      .map(({ w, c }) => ({ id: w.id, label: w.label || 'Countdown', num: c.num, unit: c.unit, warn: !!c.warn }));
  }
  // What slipped: the evening page's own rule (due or planned today or before, still open).
  const roll = !evening ? [] : typeof briefRollover === 'function'
    ? briefRollover(open.map(i => ({ id: i.id, title: effTitle(i), due: effDate(i), planned: i.plannedFor || null, done: false, priority: effPriority(i) })), today)
    : [...dueToday.map(i => ({ why: 'due' })), ...overdue.map(i => ({ why: 'overdue' }))];
  const slipped = roll.length, slippedToday = roll.filter(r => r.why !== 'overdue').length;
  const mini = (i) => ({ id: i.id, title: effTitle(i) });
  const m = {
    today, tomorrow, now, hour, evening, nowD,
    isNew: !all.length && !Object.keys(state.completionLog || {}).length,
    sunday: nowD.getDay() === 0,
    dueToday, overdue, dueTomorrow, doneItems, doneToday, events, tomorrowFirst, countdowns, hasCal, calLoading: calUnknown,
    focusList,
  };
  m.stats = homeTodayStats({
    now, evening, dueToday: dueToday.length, overdue: overdue.length, doneToday,
    firstDoneAt: Number.isFinite(firstAt) ? _hhNowHM(new Date(firstAt)) : null, slipped,
    events, calendar: hasCal ? true : calUnknown ? 'unknown' : false, tomorrowFirst,
    focus: [...focusList.map(i => units(i, false)), ...focusDone.map(i => units(i, true))],
  });
  m.tpl = {
    evening, now, events, tomorrowFirst, slipped, slippedToday, calendar: hasCal ? true : calUnknown ? 'unknown' : false,
    dueToday: dueToday.map(mini), overdue: overdue.map(mini), dueTomorrow: dueTomorrow.map(mini),
    focus: focusList.map(mini), done: doneItems.map(mini), doneCount: doneToday,
  };
  m.chips = homeTodayChips({ evening, dueToday: dueToday.map(mini), dueTomorrow: dueTomorrow.map(mini), countdowns, tomorrowFirst });
  return m;
}

/**
 * Today's events and tomorrow's first timed one: [{id, title, start, end ('HH:MM'), allDay, bg,
 * location, type}]. Read where Today's schedule reads them (12-home-cal.js: the calendar store,
 * the user's visible calendars, declined events left out, leave / out-of-office / free blocks as
 * all-day background), else the top bar's 8-day cache (10-header.js calendarSoon).
 * unknown = not read yet (or could not be read): the hero then makes no claims about the calendar.
 */
function _hhCal(today, tomorrow) {
  const none = { events: [], tomorrowFirst: null, hasCal: false, unknown: false };
  const index = new Map();
  _hh.evs = index;
  if (_hhCalOff()) return none;
  if (typeof homeCalStatus === 'function' && typeof homeCalEvents === 'function' && typeof homeHM === 'function') {
    const st = homeCalStatus(_hhOnCal);
    if (st.off) return none;
    if (!st.ok) return Object.assign({}, none, { unknown: !!(st.loading || st.error) });
    const map = (e) => {
      const o = { id: e.id || '', title: e.title || 'Event', start: e.allDay ? '' : homeHM(e.start), end: e.allDay ? '' : homeHM(e.end), allDay: !!e.allDay, bg: !!e.bg, location: e.location || '', type: e.type || '' };
      if (o.id && !index.has(o.id)) index.set(o.id, o);
      return o;
    };
    const events = homeCalEvents(today).map(map);
    const tom = homeCalEvents(tomorrow).find(e => !e.allDay && !e.bg);
    return { events, tomorrowFirst: tom ? map(tom) : null, hasCal: true, unknown: false };
  }
  const cal = typeof calendarSoon === 'function' ? calendarSoon(_hhOnCal) : { events: [], ok: false, at: 1 };
  const hasCal = !!(cal.ok || (cal.events && cal.events.length));
  const onDay = (e, d) => e && (e.date === d || (e.until && e.date <= d && e.until >= d));
  const evOf = (e, d) => ({ id: e.id, title: e.title || 'Event', start: e.start || '', end: e.end || '', allDay: !!e.allDay || e.date !== d, location: e.location || '' });
  const events = (cal.events || []).filter(e => onDay(e, today)).map(e => evOf(e, today));
  const tomTimed = (cal.events || []).filter(e => e && e.date === tomorrow && !e.allDay && e.start).sort((a, b) => a.start.localeCompare(b.start));
  return { events, tomorrowFirst: tomTimed[0] ? evOf(tomTimed[0], tomorrow) : null, hasCal, unknown: !hasCal && !cal.at };
}

/* ---------- the words: AI script, AI summary, or the template ---------- */
/** A story script is current: Claude wrote it, and (morning) nothing it names has already happened. */
function _hhScriptCurrent(entry, m) {
  const sc = entry && entry.script;
  if (!sc || sc.source !== 'ai' || !Array.isArray(sc.sentences) || !sc.sentences.length) return false;
  if (m.evening) return true;
  const nowMin = m.hour * 60 + m.nowD.getMinutes();
  const evs = new Map(((entry.data && entry.data.events) || []).map(e => [e.id, e]));
  for (const s of sc.sentences.slice(0, 3)) for (const e of s.entities || []) {
    if (e.type === 'event') { const ev = evs.get(e.ref); if (ev && !ev.allDay && Number.isFinite(ev.endMin) && ev.endMin <= nowMin) return false; }
    if (e.type === 'time') { const t = /^(\d{1,2}):(\d{2})$/.exec(String(e.ref || '')); if (t && Number(t[1]) * 60 + Number(t[2]) < nowMin) return false; }
  }
  return true;
}
/** At most three sentences and about three lines. */
function _hhBudget(sentences) {
  const out = []; let n = 0;
  for (const s of sentences || []) {
    if (!s || !s.text) continue;
    const len = String(s.text).length;
    if (out.length && (out.length >= 3 || n + len > 330)) break;
    out.push({ text: String(s.text), entities: Array.isArray(s.entities) ? s.entities : [] });
    n += len;
  }
  return out;
}
function _hhText(m) {
  const kind = m.evening ? 'evening' : 'morning';
  const st = _hh.story[kind];
  if (st && st.date === m.today && _hhScriptCurrent(st, m)) return { src: 'story', sentences: _hhBudget(st.script.sentences), data: st.data };
  // The brief's summary is plain text written in the morning: only while the morning lasts.
  if (m.evening || m.hour < 12) {
    const page = kind === 'morning' && typeof _bf !== 'undefined' && _bf.summary && _bf.summary.brief;
    const sm = page && page.date === m.today && page.text ? page : _hh.summary[kind];
    if (sm && sm.date === m.today && sm.text) {
      const parts = String(sm.text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'])/);
      return { src: 'brief', sentences: _hhBudget(parts.map(t => ({ text: t, entities: [] }))) };
    }
  }
  const t = homeTodayTemplate(m.tpl);
  return { src: 'template', sentences: t.sentences, tone: t.tone };
}
/** Fetch what is missing or old (each at most every 10 minutes); arrivals repaint the hero. */
function _hhLoad(m) {
  if (!_hhServer()) return;
  const kind = m.evening ? 'evening' : 'morning';
  const old = (e) => !e || e.date !== m.today || Date.now() - e.at > 10 * 60 * 1000;
  if (_hhStory() && _hhAiOn() && !_hh.busy['story:' + kind] && old(_hh.story[kind])) {
    _hh.busy['story:' + kind] = true;
    _hhGet('/api/story?kind=' + kind)
      // Keyed by the server's day (its time zone): a script for another day is never shown.
      .then(j => { _hh.story[kind] = { date: (j && j.date) || m.today, at: Date.now(), script: j && j.script, data: j && j.data }; })
      .catch(() => { _hh.story[kind] = { date: m.today, at: Date.now(), script: null, data: null }; })
      .finally(() => { _hh.busy['story:' + kind] = false; _hhArrived('story'); });
  }
  const sk = kind === 'morning' ? 'brief' : 'evening';
  if (_hhAiOn() && (m.evening || m.hour < 12) && !_hh.busy['sum:' + kind] && old(_hh.summary[kind])) {
    _hh.busy['sum:' + kind] = true;
    _hhGet(`/api/brief/summary?kind=${sk}&date=${encodeURIComponent(m.today)}`)
      .then(j => { _hh.summary[kind] = { date: m.today, at: Date.now(), text: j && typeof j.text === 'string' ? j.text : null }; })
      .catch(() => { _hh.summary[kind] = { date: m.today, at: Date.now(), text: null }; })
      .finally(() => { _hh.busy['sum:' + kind] = false; _hhArrived('summary'); });
  }
  if (APP_CONFIG.location && typeof briefLoadWeather === 'function' && typeof _bf !== 'undefined' && !_bf.weatherLoading
    && (!_bf.weather || Date.now() - (_bf.weatherAt || 0) > 10 * 60 * 1000) && !_hh.busy.wx) {
    _hh.busy.wx = true;
    briefLoadWeather().finally(() => { _hh.busy.wx = false; _hhArrived('wx'); });
  }
}
/** Still waiting for the words of this entry's first paint? */
function _hhWaiting(m) {
  if (Date.now() >= _hh.waitUntil) return false;
  const kind = m.evening ? 'evening' : 'morning';
  return !!(_hh.busy['story:' + kind] || _hh.busy['sum:' + kind] || m.calLoading);
}
function _hhOnCal() { _hhArrived('cal'); }
function _hhArrived(what) {
  if (!_hhLive()) return;
  if (what === 'wx') { _hhPaintWx(_hh.el, true); return; }     // new data: the one place the weather fades in
  const m = _hhModel();
  if (_hhWaiting(m)) return;                                  // the rest is still coming: one repaint for all
  if (_hh.el.classList.contains('is-waiting') || _hhSig(m) !== _hh.sig) _hhRerender();
}
/** What decides the hero's structure (the minute tick repaints only when it changes). */
function _hhSig(m) {
  const s = m.stats;
  const t = _hhText(m);
  return JSON.stringify([m.isNew, m.evening, m.hasCal, s.due, s.events, s.next.state, s.next.id, s.focus, s.done, s.slipped,
    t.src, t.sentences.map(x => x.text), m.chips.map(c => c.ref + c.lead)]);
}

/* ---------- render ---------- */
function _hhRender(el, ctx) {
  const reduced = _hhReduced();
  const m = _hhModel();
  if (ctx.firstPaint) {
    _hh.entryAt = performance.now();
    _hh.readAt = 0;
    _hh.shown = false;
    _hh.waitUntil = Date.now() + _HH_WAIT_MS;
    let seen = '';
    try { seen = localStorage.getItem(_HH_READ_KEY) || ''; } catch (e) { /* private mode */ }
    _hh.read = !reduced && !document.hidden && seen !== m.today && !m.isNew && !document.documentElement.classList.contains('story-open');
    clearTimeout(_hh.waitTimer);
    _hh.waitTimer = setTimeout(() => { if (_hhLive() && _hh.el.classList.contains('is-waiting')) _hhRerender(); }, _HH_WAIT_MS + 30);
  }
  _hhLoad(m);
  const root = document.createElement('section');
  const tod = m.hour < 5 || m.hour >= 22 ? 'night' : m.evening ? 'evening' : m.hour < 12 ? 'morning' : 'day';
  root.className = `hh tod-${tod}` + (m.evening ? ' is-evening' : '') + (m.isNew ? ' is-new' : '');
  root.dataset.size = ctx.size;
  root.setAttribute('aria-label', 'Today');
  el.appendChild(root);
  _hh.el = root;
  if (m.isNew) _hhPaintWelcome(root, m);
  else _hhPaintHero(root, m, ctx, reduced);
  _hh.sig = _hhSig(m);
  _hhEnsureTicker();
  return true;
}

function _hhOverline(m) {
  let d = '';
  try { d = m.nowD.toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { d = m.today; }
  const wk = homeTodayWeek(m.today);
  return `<div class="hh-ovl"><span class="hh-live" aria-hidden="true"></span><span>${esc(d)}${wk && !m.isNew ? ` · Week ${esc(wk)}` : ''}</span></div>`;
}
/** "Good morning, Sam" (evening from the brief's evening hour, so it matches Finish the day). */
function _hhHello(m) {
  const part = m.hour < 5 || m.evening ? 'Good evening' : m.hour < 12 ? 'Good morning' : 'Good afternoon';
  const name = typeof userName === 'function' ? userName() : '';
  return name ? `${part}, ${name}` : part;
}
function _hhGreeting(m) { return _hhHello(m) + '.'; }

function _hhPaintHero(root, m, ctx, reduced) {
  const text = _hhText(m);
  const waiting = !_hh.shown && _hhWaiting(m);       // the first paint of an entry waits (briefly) for the words
  if (!waiting) _hh.shown = true;
  const now = performance.now();
  // Entrance timing, carried across re-renders by negative delays.
  if (!reduced && now - _hh.entryAt < 1600) { root.classList.add('is-entering'); root.style.setProperty('--hh-en', `${-Math.round(now - _hh.entryAt)}ms`); }
  if (!waiting && _hh.read && !reduced) {
    if (!_hh.readAt) { _hh.readAt = now; try { localStorage.setItem(_HH_READ_KEY, m.today); } catch (e) { /* private mode */ } }
    if (now - _hh.readAt < 2200) { root.classList.add('is-reading'); root.style.setProperty('--hh-rd', `${-Math.round(now - _hh.readAt)}ms`); }
  }
  root.classList.toggle('is-waiting', waiting);
  root.dataset.src = text.src;
  const go = _hhGoSpec(m);
  root.innerHTML = `<div class="hh-in">
      <div class="hh-head">${_hhOverline(m)}<h2 class="hh-hi">${esc(_hhGreeting(m))}</h2></div>
      <p class="hh-say">${waiting ? '<span class="hh-sk" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}</p>
      <div class="hh-chips"></div>
      <div class="hh-side"><div class="hh-wx" hidden></div><div class="hh-go-wrap"></div></div>
      <div class="hh-stats" role="group" aria-label="Today in numbers"></div>
    </div>`;
  if (!waiting) _hhPaintSay(root.querySelector('.hh-say'), text, m);
  _hhPaintChips(root.querySelector('.hh-chips'), m);
  _hhPaintWx(root);
  if (go) root.querySelector('.hh-go-wrap').appendChild(_hhGoButton(go));
  _hhPaintStats(root.querySelector('.hh-stats'), m, root.classList.contains('is-entering'));
}

/* ---------- the sentence ---------- */
function _hhWordsIn(s) { return String(s || '').split(/\s+/).filter(Boolean).length; }
/** One sentence as word spans (.st-w) and entity spans (.st-ent): Story's kit, or the same markup made here. */
function _hhSentenceHtml(s, step, base) {
  const st = _hhStory();
  const kit = st && (typeof st.sentenceHtml === 'function' ? st : st.kit && typeof st.kit.sentenceHtml === 'function' ? st.kit : null);
  if (kit) { try { return kit.sentenceHtml(s.text, s.entities, { step, delay: base }); } catch (e) { /* fall through to ours */ } }
  let n = 0, out = '';
  const words = (seg, tail) => {
    let html = '';
    const re = /(\s+)|(\S+)/g; let mm;
    while ((mm = re.exec(seg.text))) {
      if (mm[1]) { html += mm[1]; continue; }
      const last = tail && re.lastIndex >= seg.text.length;
      html += `<span class="st-w" style="--i:${n};--st-step:${step}ms;--st-d0:${base}ms">${esc(mm[2])}${last ? `<span class="st-tail">${esc(tail)}</span>` : ''}</span>`;
      n++;
    }
    return html;
  };
  const segs = homeTodaySegments(s.text, s.entities);
  for (let k = 0; k < segs.length; k++) {
    const seg = segs[k];
    if (!seg.entity) { out += words(seg); continue; }
    const nx = segs[k + 1];
    const lead = nx && !nx.entity ? /^[^\s\p{L}\p{N}]+/u.exec(nx.text) : null;
    if (lead) segs[k + 1] = { text: nx.text.slice(lead[0].length), start: nx.start + lead[0].length, end: nx.end, entity: null };
    out += `<span class="st-ent" data-type="${escAttr(seg.entity.type)}" data-key="${escAttr(seg.entity.type + '|' + seg.entity.ref)}">${words(seg, lead ? lead[0] : '')}</span>`;
  }
  return out;
}
function _hhPaintSay(p, text, m) {
  const sentences = text.sentences && text.sentences.length ? text.sentences : [{ text: 'Here is your day.', entities: [] }];
  const total = sentences.reduce((t, s) => t + _hhWordsIn(s.text), 0);
  const step = Math.max(12, Math.min(34, Math.round(900 / Math.max(1, total))));
  let base = 0;
  p.innerHTML = sentences.map(s => { const h = _hhSentenceHtml(s, step, base); base += _hhWordsIn(s.text) * step; return h; }).join(' ');
  p.dataset.src = text.src;
  // Chips: a lead (avatar, scene, clock, stream ring), punctuation moved outside the pill, and a target.
  for (const ent of p.querySelectorAll('.st-ent')) {
    const key = ent.getAttribute('data-key') || '';
    const cut = key.indexOf('|');
    const type = ent.getAttribute('data-type') || key.slice(0, cut);
    const ref = key.slice(cut + 1);
    const w0 = ent.querySelector('.st-w');
    if (w0) for (const v of ['--i', '--st-step', '--st-d0']) ent.style.setProperty(v, w0.style.getPropertyValue(v));
    const tails = [...ent.querySelectorAll('.st-tail')];
    const info = _hhEntity(type, ref, text, m);
    ent.classList.add('hh-ent');
    // The words go in one box that can shorten with an ellipsis (a long title on a phone).
    const et = document.createElement('span'); et.className = 'hh-et';
    while (ent.firstChild) et.appendChild(ent.firstChild);
    ent.appendChild(et);
    if (info.lead) ent.insertAdjacentHTML('afterbegin', `<span class="hh-el" aria-hidden="true">${info.lead}</span>`);
    if (info.style) ent.setAttribute('style', (ent.getAttribute('style') || '') + ';' + info.style);
    if (info.title) ent.title = info.title;
    if (info.run) {
      ent.setAttribute('role', 'link'); ent.tabIndex = 0;
      ent._hhRun = info.run;
      if (info.current) ent.setAttribute('aria-current', 'true');
    }
    if (tails.length) {
      const nw = document.createElement('span'); nw.className = 'hh-nw';
      ent.replaceWith(nw); nw.appendChild(ent);
      for (const t of tails) {
        const w = t.parentElement;
        const tw = document.createElement('span'); tw.className = 'st-w hh-tail';
        if (w) for (const v of ['--i', '--st-step', '--st-d0']) tw.style.setProperty(v, w.style.getPropertyValue(v));
        tw.textContent = t.textContent; t.remove(); nw.appendChild(tw);
      }
    }
  }
  if (!p._hhWired) {
    p._hhWired = true;
    const act = (e) => { const c = e.target.closest('.st-ent[role="link"]'); if (c && c._hhRun) { e.preventDefault(); c._hhRun(c); } };
    p.addEventListener('click', act);
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') act(e); });
  }
}
/** What a chip shows before its words and what clicking it opens. Unknown refs stay plain text. */
function _hhEntity(type, ref, text, m) {
  const out = { lead: '', run: null, title: '', style: '', current: false };
  if (type === 'person') {
    const p = typeof getPerson === 'function' ? getPerson(ref) : null;
    if (!p) return out;
    out.lead = _hhAvatar(p);
    out.title = p.name || '';
    out.run = () => setView('person:' + p.id);
  } else if (type === 'event') {
    const ev = _hhEventById(ref, text);
    out.lead = typeof animSceneHtml === 'function' ? animSceneHtml(_hhEventScene(ev, ref, text), { size: 'xs', cls: 'hh-esc' }) : icon('calendar');
    if (ev) out.title = [ev.title, ev.start ? ev.start + (ev.end ? '–' + ev.end : '') : ''].filter(Boolean).join(' · ');
    out.run = (el) => _hhOpenEvent(ref, el);
  } else if (type === 'time') {
    out.lead = icon('clock');
    out.run = () => _hhOpenCalendar();
    out.title = 'Open the calendar';
  } else if (type === 'task' || type === 'deadline') {
    if (String(ref).startsWith('cd:')) {
      out.lead = icon('hourglass');
      out.run = () => _hhOpenCountdown(String(ref).slice(3));
      return out;
    }
    const it = getItem(ref);
    if (!it) { out.lead = icon(type === 'deadline' ? 'hourglass' : 'circle'); return out; }
    const s = STREAMS[effStream(it)];
    out.style = `--sc:${safeColor(s && s.color, 'var(--accent)')}`;
    out.lead = type === 'deadline' ? icon('hourglass') : '<i class="hh-ck"></i>';
    out.title = effTitle(it);
    out.run = (el) => homeOpenTask(it.id, el);
    out.current = typeof tcCurrentTaskId === 'function' && tcCurrentTaskId() === it.id;
  } else if (type === 'money') {
    out.lead = icon('coins');
    if (!(APP_CONFIG.features && APP_CONFIG.features.finance === false)) out.run = () => setView('finance');
  } else if (type === 'place') out.lead = icon('map-pin');
  return out;
}
function _hhAvatar(p) {
  const url = typeof safeUrl === 'function' ? safeUrl(p.avatarUrl) : '';
  const inner = url ? `<img src="${escAttr(url)}" alt="">` : esc(typeof avatarInitials === 'function' ? avatarInitials(p.name) : String(p.name || '?').slice(0, 1));
  return `<span class="avatar hh-av" style="--c:${escAttr(safeColor(p.color, 'var(--sw-slate)'))}">${inner}</span>`;
}
function _hhEventById(id, text) {
  const own = _hh.evs && _hh.evs.get(id);
  if (own) return own;
  const c = typeof _calSoon !== 'undefined' ? _calSoon : null;
  const a = c && (c.events || []).find(e => e && e.id === id);
  if (a) return a;
  const d = text && text.data && (text.data.events || []).find(e => e && e.id === id);
  return d || null;
}
function _hhEventScene(ev, id, text) {
  const d = text && text.data && (text.data.events || []).find(e => e && e.id === id);
  if (d && d.type) return d.type;
  if (ev && ev.type) return ev.type;             // classified already (12-home-cal.js, like Today's schedule)
  if (!ev || typeof animClassify !== 'function') return 'event';
  const s = /^(\d{1,2}):(\d{2})/.exec(ev.start || ''), e = /^(\d{1,2}):(\d{2})/.exec(ev.end || '');
  const start = s ? Number(s[1]) * 60 + Number(s[2]) : null;
  const minutes = s && e ? Math.max(0, Number(e[1]) * 60 + Number(e[2]) - start) : 0;
  try {
    return animClassify({ kind: 'event', title: ev.title, location: ev.location, allDay: !!ev.allDay, start, minutes, attendees: (ev.attendees || []).length, link: !!ev.joinUrl },
      typeof _animOpts === 'function' ? _animOpts() : {}).type || 'event';
  } catch (err) { return 'event'; }
}

/* ---------- targets ---------- */
function _hhOpenCalendar() {
  if (_hhCalOff()) return;
  if (typeof calSetFocus === 'function') { try { calSetFocus(todayStr(), { quiet: true }); } catch (e) { /* calendar not ready */ } }
  setView('calendar');
}
function _hhOpenEvent(id, from) {
  if (id && typeof openEvent === 'function') { openEvent(id, { from: from || null, context: 'home' }); return; }
  _hhOpenCalendar();
}
function _hhOpenCountdown(id) {
  if (typeof openCountdownEditor === 'function') openCountdownEditor(id);
  else if (typeof openTopbarCustomiser === 'function') openTopbarCustomiser({});
}

/* ---------- deadline chips ---------- */
function _hhPaintChips(host, m) {
  if (!m.chips.length) { host.remove(); return; }
  host.setAttribute('role', 'list');
  for (const c of m.chips) {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'hh-dl' + (c.tone ? ' ' + c.tone : '');
    b.setAttribute('role', 'listitem');
    const ic = c.kind === 'countdown' ? 'timer' : c.kind === 'event' ? 'sunrise' : 'flag';
    b.innerHTML = `${icon(ic)}<b>${esc(c.lead)}</b><span>${esc(c.text)}</span>`;
    b.title = c.title;
    // When the row is tight, long titles give way first: a short chip ("34 d Product launch") keeps its words.
    b.style.setProperty('--hh-shrink', String(Math.max(0, Array.from(String(c.text || '')).length - 16)));
    if (c.kind === 'task') { b.onclick = () => homeOpenTask(c.ref, b); if (typeof tcCurrentTaskId === 'function' && tcCurrentTaskId() === c.ref) b.setAttribute('aria-current', 'true'); }
    else if (c.kind === 'event') b.onclick = () => _hhOpenEvent(c.ref, b);
    else b.onclick = () => _hhOpenCountdown(c.ref);
    host.appendChild(b);
  }
}

/* ---------- weather ---------- */
function _hhWxIcon(cond, isDay, cls) {
  const k = cond === 'clear' ? (isDay === false ? 'moon' : 'sun') : cond === 'partly' ? (isDay === false ? 'partlyNight' : 'partly') : _HH_WX[cond] ? cond : 'cloud';
  return `<svg class="hh-wxi${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_HH_WX[k]}</svg>`;
}
function _hhDeg(t) { return typeof t === 'number' && isFinite(t) ? Math.round(t) + '°' : '–'; }
/** Paint the weather box; `arrived` (fresh data, not a re-render) lets it fade in. */
function _hhPaintWx(root, arrived) {
  const box = root && root.querySelector('.hh-wx');
  if (!box) return;
  const w = typeof _bf !== 'undefined' && _bf.weather && _bf.weather.ok && _bf.weather.current ? _bf.weather : null;
  if (!w || !APP_CONFIG.location) { box.hidden = true; box.innerHTML = ''; return; }
  const c = w.current, t = w.today || {};
  const rain = homeTodayRain(w.hourly, todayStr(), new Date().getHours());
  const wasHidden = box.hidden;
  const place = w.location && w.location.name ? w.location.name : '';
  box.innerHTML = `${_hhWxIcon(c.cond, c.isDay)}<span class="t">${esc(_hhDeg(c.temp))}</span>`
    + `<span class="c"><b>${esc(c.label || '')}</b>${t.hi !== undefined && t.hi !== null ? ` · H ${esc(_hhDeg(t.hi))} L ${esc(_hhDeg(t.lo))}` : ''}</span>`
    + (rain ? `<span class="rain">${_hhWxIcon(rain.cond, true, 'sm')}${esc(rain.label)} ${esc(rain.from)}–${esc(rain.to)} · ${esc(rain.chance)}%</span>` : '')
    + `<span class="src">${esc(w.attribution && w.attribution.text ? w.attribution.text : 'Weather data by Open-Meteo.com')}</span>`;
  // The attribution line is hidden on phones, so the label carries it too (Open-Meteo, CC BY 4.0).
  box.title = `${place ? place + ': ' : ''}${c.label || ''}, ${_hhDeg(c.temp)}${w.stale ? ' (from earlier)' : ''} · ${w.attribution && w.attribution.text ? w.attribution.text : 'Weather data by Open-Meteo.com'}`;
  box.setAttribute('role', 'img'); box.setAttribute('aria-label', box.title);
  box.hidden = false;
  if (arrived && wasHidden && !_hhReduced() && window.Motion && typeof Motion.animate === 'function' && root.isConnected) Motion.animate(box, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
}

/* ---------- Start my day / Finish the day ---------- */
function _hhGoSpec(m) {
  const st = _hhStory();
  const played = (k) => !!(st && typeof st.playedToday === 'function' && st.playedToday(k));
  if (m.evening && m.sunday && !_hhWeekDone(m)) return { kind: 'week', label: 'Weekly review', ic: 'calendar-range', quiet: false };
  if (m.evening) {
    const saved = typeof _eveningSavedToday === 'function' && _eveningSavedToday();
    return saved || played('evening') ? { kind: 'evening', label: 'Replay my day', ic: 'sunset', quiet: true } : { kind: 'evening', label: 'Finish the day', ic: 'sunset', quiet: false };
  }
  const seen = played('morning') || (typeof _briefSeenToday === 'function' && _briefSeenToday());
  return seen ? { kind: 'morning', label: 'Replay my morning', ic: 'sunrise', quiet: true } : { kind: 'morning', label: 'Start my day', ic: 'play', quiet: false };
}
/** This week's review is saved already (the same test as the weekly prompt, 78-brief-hooks.js). */
function _hhWeekDone(m) {
  if (typeof reviewWeekRange !== 'function') return false;
  try {
    const r = reviewWeekRange(m.today, APP_CONFIG.weekStart || 'Mon');
    return (state.reviews || []).some(x => x && x.kind === 'week' && (x.date === r.from || x.date === r.prevFrom));
  } catch (e) { return false; }
}
function _hhGoButton(g) {
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'btn hh-go' + (g.quiet ? ' is-quiet' : '');
  const st = _hhStory();
  b.innerHTML = `${g.ic === 'play' ? _HH_PLAY : icon(g.ic)}<span>${esc(g.label)}</span>${st && !g.quiet ? '<span class="meta">Story</span>' : ''}`;
  b.setAttribute('data-tip', g.kind === 'week' ? 'Your week as a short story, then the review' : g.kind === 'evening' ? 'Your day as a short story, then wrap up' : 'Your day as a short story, read out');
  b.onclick = () => _hhGo(g.kind);
  return b;
}
function _hhGo(kind) {
  const st = _hhStory();
  if (st) {
    if (typeof st.isOpen === 'function' && st.isOpen() && typeof st.kind === 'function' && st.kind() === kind) return;   // already playing: a no-op
    st.open(kind, { autoplay: true });
    return;
  }
  if (kind === 'morning') { if (typeof briefOpen === 'function') briefOpen({ welcome: false }); else setView('review:today'); }
  else setView(kind === 'week' ? 'review:week' : 'review:evening');
}

/* ---------- the numbers ---------- */
function _hhRing(done, total, sweep) {
  const p = total ? Math.round(done / total * 100) : 0;
  return `<svg class="hh-ring${sweep ? ' is-sweep' : ''}${p ? '' : ' is-zero'}" viewBox="0 0 36 36" style="--p:${p}" aria-hidden="true"><circle class="tr" cx="18" cy="18" r="15.9" pathLength="100"/><circle class="fl" cx="18" cy="18" r="15.9" pathLength="100"/></svg>`;
}
function _hhNextV(n) { return `<b class="hh-nb">${esc(n.big)}</b>${n.small ? `<small>${esc(n.small)}</small>` : ''}`; }
function _hhNextWho(n, m) {
  if (!n.title) return `<span class="s">${esc(n.at)}</span>`;
  const ev = _hhEventById(n.id, null);
  const scene = typeof animSceneHtml === 'function' ? animSceneHtml(_hhEventScene(ev, n.id, null), { size: 'xs', cls: 'hh-nsc' }) : '';
  return `<span class="who">${scene}<span>${esc(homeTodayShort(n.title, 40))}${n.state === 'soon' ? ` · ${esc(n.start)}` : n.at ? ` · ${esc(n.at)}` : ''}</span></span>`;
}
function _hhPaintStats(host, m, first) {
  const s = m.stats;
  const cells = [];
  const cell = (k, html, label, run) => cells.push({ k, html, label, run });
  const noCal = !m.hasCal && !m.calLoading;
  const due = () => cell('due', `<span class="l">${icon('sun')}Due today</span><span class="v">${esc(s.due.n)}</span><span class="s${s.due.bad ? ' bad' : ''}">${esc(s.due.sub)}</span>`,
    `Due today: ${s.due.n}. ${s.due.sub}.`, () => setView('today'));
  const evs = () => cell('events', `<span class="l">${icon('calendar-days')}Events</span><span class="v">${noCal || s.events.unknown ? '—' : m.evening && s.events.timed ? `${esc(s.events.held)}<small>of ${esc(s.events.timed)}</small>` : esc(s.events.n)}</span><span class="s">${esc(s.events.sub)}</span>`,
    `Events today: ${s.events.n}. ${s.events.sub}.`, () => (noCal ? setView('connections') : _hhOpenCalendar()));
  const next = () => cell('next', `<span class="l"><i class="hh-pulse${s.next.state === 'soon' || s.next.state === 'now' ? '' : ' is-off'}" aria-hidden="true"></i>Next</span><span class="v">${_hhNextV(s.next)}</span>${_hhNextWho(s.next, m)}`,
    s.next.title ? `Next: ${s.next.title}, ${s.next.big}${s.next.small ? ' ' + s.next.small : ''}` : `Next: ${s.next.at}`, (el) => (s.next.id ? _hhOpenEvent(s.next.id, el) : noCal ? setView('connections') : _hhOpenCalendar()));
  const focus = () => cell('focus', `${_hhRing(s.focus.done, s.focus.total, first)}<span><span class="l">Focus</span><span class="v">${s.focus.total ? `${esc(s.focus.done)}<small>/ ${esc(s.focus.total)}</small>` : '—'}</span></span>`,
    s.focus.total ? `Focus: ${s.focus.done} of ${s.focus.total} steps done today` : 'Focus: nothing yet', () => _hhToFocus());
  const done = () => cell('done', `<span class="l">${icon('circle-check')}Done today</span><span class="v">${esc(s.done.n)}</span><span class="s">${esc(s.done.sub)}</span>`,
    `Done today: ${s.done.n}`, () => setView('completed'));
  const slip = () => cell('slipped', `<span class="l">${icon('arrow-right')}Slipped</span><span class="v">${esc(s.slipped.n)}</span><span class="s">${esc(s.slipped.sub)}</span>`,
    `Slipped: ${s.slipped.n}. ${s.slipped.sub}.`, () => setView(s.slipped.n ? 'review:evening' : 'today'));
  if (m.evening) { done(); evs(); next(); focus(); slip(); } else { due(); evs(); next(); focus(); done(); }
  for (const c of cells) {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'hh-st k-' + c.k + (c.k === 'next' ? ' is-' + s.next.state : '');
    b.innerHTML = c.html;
    b.setAttribute('aria-label', c.label);
    b.onclick = () => c.run(b);
    host.appendChild(b);
  }
}
/** The Focus cell: bring the Focus widget into view (else the Today list). */
function _hhToFocus() {
  const f = document.querySelector('#main-body .hg-w[data-wid="focus"]:not([hidden])');
  if (!f) { setView('today'); return; }
  try { f.scrollIntoView({ behavior: _hhReduced() ? 'auto' : 'smooth', block: 'start' }); } catch (e) { f.scrollIntoView(); }
}

/* ---------- the minute tick: the countdown in place, a repaint only when the shape changes ---------- */
function _hhEnsureTicker() {
  if (!_hh.vis) {
    _hh.vis = true;
    // A hidden tab does not tick at all; coming back catches up at once, then ticks again.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) _hhStopTicker();
      else if (_hhLive()) { _hhTick(); _hhEnsureTicker(); }
    });
  }
  if (_hh.timer || document.hidden) return;
  _hh.tickKey = todayStr() + ' ' + _hhNowHM();
  _hh.timer = setInterval(_hhTick, 10000);
}
function _hhStopTicker() { clearInterval(_hh.timer); _hh.timer = 0; }
function _hhTick() {
  if (!_hh.el || !_hh.el.isConnected) { _hhStopTicker(); return; }
  if (document.hidden || typeof state === 'undefined' || state.view !== 'home') return;
  const key = todayStr() + ' ' + _hhNowHM();
  if (key === _hh.tickKey) return;
  _hh.tickKey = key;
  const m = _hhModel();
  if (m.isNew || _hhSig(m) !== _hh.sig) { _hhRerender(); return; }
  const v = _hh.el.querySelector('.hh-st.k-next .v');
  const html = _hhNextV(m.stats.next);
  if (v && v.innerHTML !== html) {
    v.innerHTML = html;
    if (!_hhReduced() && window.Motion && typeof Motion.animate === 'function') Motion.animate(v, [{ opacity: 0.35 }, { opacity: 1 }], { duration: 120 });
    const b = v.closest('.hh-st'); if (b && m.stats.next.title) b.setAttribute('aria-label', `Next: ${m.stats.next.title}, ${m.stats.next.big}${m.stats.next.small ? ' ' + m.stats.next.small : ''}`);
  }
}

/* ---------- a new user: the welcome hero with three steps ---------- */
function _hhPaintWelcome(root, m) {
  // Done only when Home has read events (as Today's schedule says), not when a source merely exists.
  const cal = typeof homeCalStatus === 'function' ? homeCalStatus().ok : typeof connHas === 'function' ? connHas('calendar') : false;
  const g = _hhHello(m);
  root.innerHTML = `<div class="hh-in">
      <div class="hh-head">${_hhOverline(m)}<h2 class="hh-hi">${esc(g)}. Welcome to your Home.</h2></div>
      <div class="hh-side"><div class="hh-wx" hidden></div></div>
      <p class="hh-say hh-intro">This page fills itself in as you add tasks and connect a calendar: today in a few lines, what to focus on, where you need to be and who you will see. Three steps get you there.</p>
      <ol class="hh-setup">
        <li class="hh-stp"><span class="no">1</span><b>Add your first task</b><p>Type it the way you would say it: “Draft the intro Friday”.</p>
          <label class="hh-qa">${icon('plus')}<input type="text" placeholder="Add a task…" aria-label="Add your first task" data-fk="hh-first-task" enterkeyhint="done"><span class="kbd">Enter</span></label></li>
        <li class="hh-stp${cal ? ' done' : ''}"><span class="no">${cal ? icon('check') : '2'}</span><b>Connect a calendar</b><p>Read-only. Your events appear in Today’s schedule with their own scenes.</p>
          <button type="button" class="btn btn-secondary btn-sm" data-act="cal">${icon('calendar-plus')}<span>${cal ? 'Calendar connected' : 'Connect calendar'}</span></button></li>
        <li class="hh-stp"><span class="no">3</span><b>Or explore with demo data</b><p>A realistic week of made-up tasks, people and money. Reset it later in Settings › Data.</p>
          <button type="button" class="btn btn-ghost btn-sm" data-act="demo">${icon('sparkles')}<span>Load demo data</span></button></li>
      </ol>
    </div>`;
  _hhPaintWx(root);
  const inp = root.querySelector('.hh-qa input');
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { inp.value = ''; return; }
    if (e.key !== 'Enter' || e.isComposing) return;
    const v = inp.value.trim();
    if (!v) return;
    e.preventDefault();
    if (typeof addTaskFromText === 'function') { inp.value = ''; homeFocusAfterAdd(addTaskFromText(v), '#main-body .hh .hh-hi'); }
    else if (typeof openQuickAddDialog === 'function') openQuickAddDialog(v);
  });
  const calBtn = root.querySelector('[data-act="cal"]');
  if (cal) calBtn.disabled = true;
  calBtn.onclick = () => { if (window.Connections && typeof Connections.open === 'function') Connections.open('calendar'); else setView('connections'); };
  const demo = root.querySelector('[data-act="demo"]');
  demo.onclick = async () => {
    if (demo.disabled) return;
    demo.disabled = true; demo.querySelector('span').textContent = 'Loading demo data…';
    try {
      const r = await fetch('/api/demo/load', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || ('HTTP ' + r.status)); }
      location.hash = '#view=home';
      location.reload();
    } catch (e) {
      demo.disabled = false; demo.querySelector('span').textContent = 'Load demo data';
      toast(typeof netErrorMessage === 'function' ? netErrorMessage(e) : 'Demo data could not be loaded: ' + e.message, { kind: 'err' });
    }
  };
}

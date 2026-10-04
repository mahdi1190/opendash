/* ============================================================
   CALENDAR: DATA + SHARED PIECES (owner: Calendar)
   ------------------------------------------------------------
   createGoogleDataStore(o)   loader + "Update" job client for the Google
                              data jobs (calendar here, inbox in 55-email-google.js):
                              load(), update({force}), age(), running(),
                              access() -> 'yes'|'no'|'unknown', maybeAuto()
   gdConnAccess(id)           connection gate: window.Connections?.has(id), with a
                              fallback on GET /api/connections
   CalStore                   the calendar store (GET /api/calendar)
   calEventsOn(iso)           Google events touching a day (local time)
   calEntriesOn(iso, opt)     events + tasks + countdowns of a day, sorted, as
                              chips for every view (month/week/day/agenda/rail).
                              Outside the Calendar page (opt.sources given: Home's
                              schedule and hero, the brief) only the user's own day:
                              calEventIsMine, untitled events left out (opt.mine overrides)
   calEventVisible(ev), calEventIsMine(ev), calEventUntitled(ev)
                              the server's rule too (lib/calendar-visibility.mjs: shown,
                              mine, untitled), so the stories and the page agree
   calScheduleTask(id, d, t)  move a task to a day (and time), with Undo
   googleCalendarUrl(o)       Google's prefilled "new event" page (no write access)
   calendarAttendeeSuggestions(), calendarEventsFor(person)  for People
   renderCalendarEvents()     Today page: today's schedule strip
   renderCalendarView(el)     task views' "Calendar" mode: month grid of the
                              tasks that view shows, drag to reschedule
   calCalendars()             the Google calendars (several through one account),
                              with the user's names/colours and visibility
   window.CalendarData        the same helpers for other modules / tools
   Data keys in state (saveData; MCP ops in server/actions/ops-calendar.mjs):
     eventMeta {[eventId]: {notes, notesBy, tasks:[taskId], important}}
     calendarSettings {[calendarId]: {alias, color}}
   UI key: calPrefs {mode, showDone, hidden:{'cal:<id>', google, tasks, countdowns, declined}}.
     hidden['cal:<id>']: true = off, false = on (the user's choice); absent = the
     calendar's default (the server's defaultOn: another person's calendar starts
     off, "only my stuff by default"; config.myEmails says which are yours).
   Sources: calendars come from several sources (Google, other MCP servers, iCal
   links); each calendar carries sourceId + sourceLabel, ids outside Google are
   '<sourceId>/<id>'. Managed on Connections (56-sources.js).
   Tasks may carry dueTime 'HH:MM' + estimate (minutes): a planned block.
   ============================================================ */

/* ---------- connection gate ---------- */
let _gdConn = null, _gdConnAt = 0, _gdConnLoading = false;
async function _gdLoadConn(force) {
  if (_gdConnLoading || (!force && _gdConn && Date.now() - _gdConnAt < 60000)) return _gdConn;
  if (!_serverAvailable) return null;
  _gdConnLoading = true;
  try {
    const r = await fetch('/api/connections', { cache: 'no-store' });
    if (r.ok) { _gdConn = await r.json(); _gdConnAt = Date.now(); }
  } catch (e) { /* offline: keep the old answer */ }
  _gdConnLoading = false;
  return _gdConn;
}
/**
 * Can the dashboard use connector `id` ('calendar'|'gmail'|...)?
 * 'yes' = connected, 'no' = known not to work (greyed out), 'unknown' = never
 * checked (allowed while Claude itself is available: the first run tells).
 */
function gdConnAccess(id) {
  try {
    const C = window.Connections;
    if (C && typeof C.has === 'function') {
      const st = typeof C.status === 'function' ? C.status(id) : null;
      if (C.has(id)) return 'yes';
      return st && /unknown|checking/.test(String(st.status || st)) ? (AI_AVAILABLE ? 'unknown' : 'no') : 'no';
    }
  } catch (e) { /* fall back below */ }
  if (!_serverAvailable) return 'no';
  if (!_gdConn) { _gdLoadConn().then(() => { if (_gdConn) _gdRepaint(); }); return AI_AVAILABLE ? 'unknown' : 'no'; }
  const s = _gdConn[id] && _gdConn[id].status;
  if (s === 'connected') return 'yes';
  if (!s || s === 'unknown') return AI_AVAILABLE ? 'unknown' : 'no';
  return 'no';
}
function gdConnMessage(id, label) {
  const c = _gdConn && _gdConn[id];
  if (c && c.message) return String(c.message);
  if (!AI_AVAILABLE) return 'Claude is not available on this computer yet: open Connections.';
  return `Connect ${label} in Connections first.`;
}
function _gdRepaint() {
  if (typeof render === 'function' && typeof state !== 'undefined') {
    if (String(state.view).startsWith('calendar') || state.view === 'triage' || state.view === 'today' || state.view.startsWith('person:')) render();
    else if (typeof renderSidebar === 'function') renderSidebar();
  }
}
const _GD_AUTH_CODES = new Set(['CONNECTOR_AUTH', 'TOOL_MISSING', 'CLI_MISSING', 'NOT_SIGNED_IN']);

/* ---------- a Google data store (calendar / inbox) ---------- */
function createGoogleDataStore(o) {
  const AUTO_MS = 30 * 60 * 1000;
  const st = { loaded: false, loading: false, data: null, error: null, job: null, timer: null, lastAuto: 0, waiters: [] };
  const changed = (why) => { try { o.onChange && o.onChange(why); } catch (e) { console.error('[' + o.name + ']', e); } };
  async function load(force) {
    if (st.loading) return new Promise(r => st.waiters.push(r));
    if (st.loaded && !force) return st.data;
    st.loading = true;
    try {
      const r = await fetch(o.url, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
      st.data = j; st.error = null;
      if (j.job) st.job = j.job;
    } catch (e) {
      st.error = _serverAvailable ? ((e && e.message) || String(e)) : 'The OpenDash server is not running, so ' + o.label + ' data cannot be loaded.';
    }
    st.loaded = true; st.loading = false;
    if (st.job && st.job.state === 'running') poll();
    const w = st.waiters.splice(0); w.forEach(f => f(st.data));
    changed('load');
    return st.data;
  }
  function running() { return !!(st.job && st.job.state === 'running'); }
  function age() {
    const at = st.data && st.data.fetchedAt ? Date.parse(st.data.fetchedAt) : NaN;
    return Number.isFinite(at) ? Date.now() - at : null;
  }
  function access() { return gdConnAccess(o.connector); }
  function poll() {
    if (st.timer) return;
    st.timer = setInterval(async () => {
      let j = null;
      try { const r = await fetch(o.statusUrl, { cache: 'no-store' }); j = await r.json(); } catch (e) { return; }
      st.job = j.job || null;
      changed('job');
      if (!running()) {
        clearInterval(st.timer); st.timer = null;
        await load(true);
        finished(st.job);
      }
    }, 2000);
  }
  function finished(job) {
    if (!job) return;
    _gdLoadConn(true).then(() => { try { window.Connections && window.Connections.refresh && window.Connections.refresh(); } catch (e) {} _gdRepaint(); });
    if (job.state === 'ok') {
      if (job.forced) toast(`${o.label} updated` + (job.result && Number.isFinite(job.result.count) ? ` · ${job.result.count} ${o.noun}` : ''), { kind: 'ok', icon: 'refresh-cw' });
    } else if (job.state === 'error' && (job.forced || _GD_AUTH_CODES.has(job.code))) {
      toast(job.error || `${o.label} could not be updated.`, {
        kind: 'err', timeout: 8000,
        action: _GD_AUTH_CODES.has(job.code) ? { label: 'Open Connections', run: () => setView('connections') } : { label: 'Try again', run: () => update({ force: true }) },
      });
    }
  }
  async function update(opts) {
    opts = opts || {};
    if (running()) return { running: true };
    try {
      const r = await fetch(o.updateUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ force: opts.force !== false }, opts.body || {})) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409 && j.code === 'NO_SOURCES') {
        if (opts.force !== false) toast(j.error || 'Nothing is connected yet.', { icon: 'plug', timeout: 8000, action: { label: 'Open Connections', run: () => (window.Connections ? Connections.open(o.connector) : setView('connections')) } });
        return { error: true, noSources: true };
      }
      if (r.status === 202 || r.status === 409) { st.job = j.job || null; changed('job'); poll(); return { started: r.status === 202 }; }
      if (r.ok && j.skipped) return { skipped: true };
      throw new Error(j.error || 'HTTP ' + r.status);
    } catch (e) {
      if (opts.force !== false) toast((e && e.message) || 'The update could not start.', { kind: 'err' });
      return { error: true };
    }
  }
  /** Refresh on its own at most every 30 minutes while the view is open. */
  function maybeAuto() {
    if (!_serverAvailable || running() || access() !== 'yes') return;
    const a = age();
    if (a !== null && a < AUTO_MS) return;
    if (Date.now() - st.lastAuto < AUTO_MS) return;
    st.lastAuto = Date.now();
    update({ force: false });
  }
  return { st, load, update, poll, age, running, access, maybeAuto, get data() { return st.data; }, label: o.label, connector: o.connector };
}

/** "Updated 8 min ago" / "Updated 26 Aug · 37 days ago" / "Never updated". */
function gdAgeLabel(iso, verb) {
  verb = verb || 'Updated';
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return 'Never updated';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return verb + ' just now';
  if (mins < 60) return `${verb} ${mins} min ago`;
  const d = new Date(t);
  if (Clock.parts(t).iso === todayStr()) return `${verb} ${_calTime(d)} today`;
  const days = Math.floor((Date.now() - t) / 86400000);
  const day = d.toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short', timeZone: Clock.zone() });
  return days < 1 ? `${verb} ${day}, ${_calTime(d)}` : `${verb} ${day} · ${days} day${days === 1 ? '' : 's'} ago`;
}
function gdIsStale(store) { const a = store.age(); return a === null || a > 24 * 3600 * 1000; }

/* ---------- dates ---------- */
const _CAL_LOCALE = () => APP_CONFIG.locale || undefined;
function _calParse(iso) { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
// Wall dates (_calParse: a local Date at midnight built from y/m/d, never from an instant) do
// calendar arithmetic only, so the computer's zone cannot shift them. Instants (event times,
// "now") go through Clock (07-core-clock.js), so the page can show a zone other than the computer's.
function _calAddDays(iso, n) { const d = _calParse(iso); d.setDate(d.getDate() + n); return fmtDate(d); } // clock-ok: wall date
function _calWeekStartOf(iso) {
  const ws = typeof _weekStartIndex === 'function' ? _weekStartIndex() : 1;
  const d = _calParse(iso);
  d.setDate(d.getDate() - ((d.getDay() - ws + 7) % 7)); // clock-ok: wall date
  return fmtDate(d);
}
function _calFmt(iso, opts) { return _calParse(iso).toLocaleDateString(_CAL_LOCALE(), opts); }
/** An instant's wall time ('09:30') in the dashboard's zone. */
function _calTime(d) { return d.toLocaleTimeString(_CAL_LOCALE(), { hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}), timeZone: Clock.zone() }); }
function _calHM(min) { const h = Math.floor(min / 60), m = min % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
function _calMinOf(hm) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
/** A wall time 'HH:MM' as the locale writes it (no zone: it is not an instant). */
function _calTimeLabel(hm) { const n = _calMinOf(hm); if (n === null) return ''; return new Date(Date.UTC(2024, 0, 1, Math.floor(n / 60), n % 60)).toLocaleTimeString(_CAL_LOCALE(), { hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}), timeZone: 'UTC' }); }

/* ---------- the calendar store ---------- */
let _calIndex = null;   // Map iso -> [event]
let _calWasRunning = false;
const CalStore = createGoogleDataStore({
  name: 'calendar', connector: 'calendar', label: 'Google Calendar', noun: 'events',
  url: '/api/calendar', statusUrl: '/api/calendar/status', updateUrl: '/api/calendar/update',
  onChange: (why) => {
    if (why === 'load') _calIndex = null;
    if (typeof state === 'undefined') return;
    const onCal = state.view === 'calendar' || String(state.view).startsWith('calendar:');
    if (onCal) {
      // Progress ticks only repaint the sidebar card; starting/stopping repaints the page.
      const run = CalStore.running();
      if (why === 'job' && run === _calWasRunning) { _calPaintChrome(); return; }
      _calWasRunning = run;
      render();
    }
    else if (why === 'load' && (state.view === 'today' || state.view === 'home' || state.view.startsWith('person:') || (state.viewMode === 'calendar' && isTaskView(state.view)))) renderMain();
  },
});
function calPrefs() {
  if (!state.calPrefs || typeof state.calPrefs !== 'object') state.calPrefs = {};
  const p = state.calPrefs;
  if (!['month', 'week', 'day', 'agenda'].includes(p.mode)) p.mode = 'month';
  if (!p.hidden || typeof p.hidden !== 'object') p.hidden = { declined: true };
  return p;
}
function calSourceOn(k) { return !calPrefs().hidden[k]; }
function calEventMeta(id, create) {
  if (!state.eventMeta || typeof state.eventMeta !== 'object') { if (!create) return {}; state.eventMeta = {}; }
  if (!state.eventMeta[id]) { if (!create) return {}; state.eventMeta[id] = {}; }
  return state.eventMeta[id];
}

function calAllEvents() { const d = CalStore.data; return d && Array.isArray(d.events) ? d.events : []; }
function calEventById(id) { return calAllEvents().find(e => e.id === id) || null; }
/** An event's start / end as an instant (an all-day date starts at midnight in the dashboard's zone). */
function calEventStart(ev) { return ev.start.dateTime ? new Date(ev.start.dateTime) : new Date(Clock.at(ev.start.date, 0)); }
function calEventEnd(ev) { return ev.end && ev.end.dateTime ? new Date(ev.end.dateTime) : ev.end && ev.end.date ? new Date(Clock.at(ev.end.date, 0)) : calEventStart(ev); }
/** [firstDay, lastDay] in the dashboard's zone (all-day ends are exclusive; a midnight end stays on the day before). */
function calEventDays(ev) {
  if (ev.allDay || ev.start.date) {
    const a = ev.start.date, endEx = ev.end && ev.end.date ? ev.end.date : _calAddDays(a, 1);
    const b = _calAddDays(endEx, -1);
    return [a, b < a ? a : b];
  }
  const s = calEventStart(ev), e = new Date(Math.max(calEventEnd(ev).getTime() - 1, s.getTime()));
  return [Clock.parts(s.getTime()).iso, Clock.parts(e.getTime()).iso];
}
function _calBuildIndex() {
  const idx = new Map();
  for (const ev of calAllEvents()) {
    let [a, b] = calEventDays(ev);
    for (let i = 0, d = a; d <= b && i < 62; i++, d = _calAddDays(d, 1)) {
      if (!idx.has(d)) idx.set(d, []);
      idx.get(d).push(ev);
    }
  }
  return idx;
}
let _calIndexZone = '';   // the zone the index's days are in: a new zone (travel, the override) rebuilds it
function calEventsOn(iso) {
  if (!_calIndex || _calIndexZone !== Clock.zone()) { _calIndex = _calBuildIndex(); _calIndexZone = Clock.zone(); }
  return _calIndex.get(iso) || [];
}
/* ---------- calendars (several Google calendars through one account) ---------- */
const CAL_SWATCHES = ['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate'];
function calSettingsFor(id) {
  const s = state.calendarSettings && typeof state.calendarSettings === 'object' ? state.calendarSettings[id] : null;
  return s && typeof s === 'object' ? s : {};
}
/**
 * The Google calendars of the last update, with the user's names, colours and
 * visibility: [{id, name, googleName, color, hidden, count, error, description}].
 * An old snapshot without a calendar list gives one 'google' row.
 */
function _calHiddenOf(hidden, key, defaultOn) {
  return Object.prototype.hasOwnProperty.call(hidden, key) ? hidden[key] === true : defaultOn === false;
}
function calCalendars() {
  const d = CalStore.data;
  const list = d && Array.isArray(d.calendars) ? d.calendars : [];
  const hidden = calPrefs().hidden;
  if (!list.length) {
    if (!calAllEvents().length) return [];
    return [{ id: 'google', name: 'Google Calendar', googleName: 'Google Calendar', color: calSettingsFor('google').color || 'blue', hidden: !!hidden.google, count: calAllEvents().length, legacy: true }];
  }
  return list.map((c, i) => {
    const s = calSettingsFor(c.id);
    return {
      id: c.id, googleName: c.googleName || c.name || c.id, defaultName: c.name || c.id, name: s.alias || c.name || c.id, description: c.description || '',
      color: CAL_SWATCHES.includes(s.color) ? s.color : CAL_SWATCHES.includes(c.color) ? c.color : CAL_SWATCHES[i % CAL_SWATCHES.length],
      hidden: _calHiddenOf(hidden, c.id === 'google' ? 'google' : 'cal:' + c.id, c.defaultOn), defaultOn: c.defaultOn !== false, count: Number(c.count) || 0, error: c.error || null,
      sourceId: c.sourceId || null, sourceLabel: c.sourceLabel || 'Google',
    };
  });
}
let _calCalMapCache = null, _calCalMapKey = '';
function _calCalMap() {
  const key = JSON.stringify([CalStore.data && CalStore.data.fetchedAt, state.calendarSettings || null, calPrefs().hidden]);
  if (_calCalMapCache && key === _calCalMapKey) return _calCalMapCache;
  _calCalMapKey = key;
  _calCalMapCache = new Map(calCalendars().map(c => [c.id, c]));
  return _calCalMapCache;
}
/** The calendars an event is in (known ones first; 'google' for an old snapshot). */
function calEventCalendarIds(ev) {
  const ids = Array.isArray(ev.calendars) && ev.calendars.length ? ev.calendars : ev.calendarId ? [ev.calendarId] : [];
  return ids.length ? ids : ['google'];
}
function calEventCalendar(ev) {
  const m = _calCalMap();
  for (const id of calEventCalendarIds(ev)) { const c = m.get(id); if (c && !c.hidden) return c; }
  return m.get(calEventCalendarIds(ev)[0]) || null;
}
/** Shown when at least one of its calendars is switched on. */
function calEventVisible(ev) {
  const m = _calCalMap();
  if (!m.size) return true;
  return calEventCalendarIds(ev).some(id => { const c = m.get(id); return c ? !c.hidden : !m.size; });
}
/** No real title: "(no title)" (a private busy block), empty, "(busy)". Busy time, never a name to say. */
function calEventUntitled(ev) {
  const t = String((ev && (ev.summary != null ? ev.summary : ev.title)) || '').replace(/\s+/g, ' ').trim();
  return !t || /^\(?\s*(no title|untitled|busy|no subject)\s*\)?$/i.test(t);
}
/**
 * The user's own day (Home, the brief; the server's stories use the same rule,
 * lib/calendar-visibility.mjs "mine"): shown, not declined, and in one of the user's
 * own calendars that is switched on, or the user is invited (an attendee or the
 * organiser address is in config.myEmails). Someone else's calendar the user switched
 * on shows in the Calendar, but its meetings are not the user's "next up".
 */
function calEventIsMine(ev) {
  if (!ev || !calEventVisible(ev) || calIsDeclined(ev)) return false;
  const m = _calCalMap();
  if (!m.size) return true;
  if (calEventCalendarIds(ev).some(id => { const c = m.get(id); return c && !c.hidden && c.defaultOn !== false; })) return true;
  const mine = new Set(((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.myEmails) || []).map(x => String(x || '').trim().toLowerCase()).filter(Boolean));
  if (!mine.size) return false;
  const addr = (x) => String((x && x.email) || '').trim().toLowerCase();
  if (ev.organizer && mine.has(addr(ev.organizer))) return true;
  return (ev.attendees || []).some(a => a && mine.has(addr(a)) && (a.response || a.responseStatus) !== 'declined');
}
function calSetCalendarHidden(id, hidden) {
  const p = calPrefs();
  const k = id === 'google' ? 'google' : 'cal:' + id;
  // Explicit both ways: "on" must also win over a calendar that starts off.
  if (id === 'google') { if (hidden) p.hidden[k] = true; else delete p.hidden[k]; }
  else p.hidden[k] = !!hidden;
  saveUI(); render();
}
function calEventColor(ev) {
  // An event with its own Google colour (colorId 1-11) shows it, as in Google (46-cal-event-edit-logic.js).
  const own = ev && ev.colorId && typeof evcColor === 'function' ? evcColor(ev.colorId) : null;
  if (own) return own.sw;
  const c = calEventCalendar(ev);
  if (c) return c.color;
  if (ev.eventType === 'birthday') return 'pink';
  if (ev.eventType === 'outOfOffice') return 'slate';
  return 'blue';
}
function calIsDeclined(ev) { return ev.selfResponse === 'declined'; }
/** Starred by the user, or linked to an urgent open task, or on a countdown's day with a matching name. */
function calIsImportant(ev) {
  const m = calEventMeta(ev.id);
  if (m.important === true) return true;
  if (m.important === false) return false;
  for (const tid of (m.tasks || [])) { const t = getItem(tid); if (t && effPriority(t) === 'p1' && statusOf(t.id) !== 'done') return true; }
  const [a] = calEventDays(ev);
  const words = String(ev.summary || '').toLowerCase().split(/\W+/).filter(w => w.length > 3);
  for (const c of (state.countdowns || [])) {
    if (c && c.date === a && words.some(w => String(c.label || '').toLowerCase().includes(w))) return true;
  }
  return false;
}

/* ---------- people matching ---------- */
function _calPersonIndex() {
  const byEmail = new Map(), byName = new Map();
  for (const p of (state.people || [])) {
    for (const e of [p.email, ...(Array.isArray(p.emails) ? p.emails : [])]) if (e) byEmail.set(String(e).toLowerCase(), p);
    if (p.name) byName.set(String(p.name).toLowerCase(), p);
    for (const a of (p.aliases || [])) if (a && String(a).length > 2) byName.set(String(a).toLowerCase(), p);
  }
  return { byEmail, byName };
}
function calPersonFor(att, ix) {
  // The People area's index knows every address a person uses (pplPersonEmails).
  if (att.email && typeof pplIndex === 'function') {
    try { const id = pplIndex().email.get(String(att.email).toLowerCase()); if (id) return getPerson(id) || null; } catch (e) { /* fall back */ }
  }
  ix = ix || _calPersonIndex();
  return (att.email && ix.byEmail.get(att.email)) || (att.name && ix.byName.get(att.name.toLowerCase())) || null;
}
/** Attendees of the loaded events who are not in People yet, most met first. For the People suggestions. */
function calendarAttendeeSuggestions(limit) {
  const ix = _calPersonIndex(), today = todayStr(), map = new Map();
  for (const ev of calAllEvents()) {
    const day = calEventDays(ev)[0];
    for (const a of (ev.attendees || [])) {
      if (a.self || !a.email || /@(group|resource)\.calendar\.google\.com$/.test(a.email) || calPersonFor(a, ix)) continue;
      const cur = map.get(a.email) || { email: a.email, name: '', count: 0, lastSeen: null, nextSeen: null, source: 'calendar' };
      cur.count++;
      if (a.name && !cur.name) cur.name = a.name;
      if (day <= today && (!cur.lastSeen || day > cur.lastSeen)) cur.lastSeen = day;
      if (day > today && (!cur.nextSeen || day < cur.nextSeen)) cur.nextSeen = day;
      map.set(a.email, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.email.localeCompare(b.email)).slice(0, limit || 50);
}
/** Events with this person (by email or name), soonest upcoming first, then recent. */
function calendarEventsFor(person, limit) {
  if (!person) return [];
  const addrs = typeof pplPersonEmails === 'function' ? pplPersonEmails(person) : [person.email, ...(Array.isArray(person.emails) ? person.emails : [])];
  const emails = new Set((addrs || []).filter(Boolean).map(e => String(e).toLowerCase()));
  const names = new Set([person.name, ...(person.aliases || [])].filter(n => n && String(n).length > 2).map(n => String(n).toLowerCase()));
  const now = Date.now();
  const hits = calAllEvents().filter(ev => (ev.attendees || []).some(a => !a.self && ((a.email && emails.has(a.email)) || (a.name && names.has(a.name.toLowerCase())))));
  const up = hits.filter(e => calEventEnd(e).getTime() >= now).sort((a, b) => calEventStart(a) - calEventStart(b));
  const past = hits.filter(e => calEventEnd(e).getTime() < now).sort((a, b) => calEventStart(b) - calEventStart(a));
  return up.concat(past).slice(0, limit || 10);
}

/* ---------- entries (one shape for every view) ---------- */
/**
 * Everything on a day as chips: {kind:'event'|'task'|'countdown', key, id,
 * title, allDay, start/end minutes (timed), color, prio, done, important, ref};
 * a task's planned slot is a second task entry with planned:true (key 'p:<id>').
 * opt: {taskFilter(item), includeDone, sources (override calPrefs), plans (false: no planned slots)}
 */
function calEntriesOn(iso, opt) {
  opt = opt || {};
  const on = (k) => (opt.sources ? opt.sources[k] !== false : calSourceOn(k));
  const out = [];
  if (on('countdowns')) {
    for (const c of (state.countdowns || [])) {
      if (!c || c.date !== iso) continue;
      out.push({ kind: 'countdown', key: 'c:' + c.id, id: c.id, title: c.label || 'Countdown', allDay: true, color: _CD_SWATCHES.includes(c.color) ? c.color : 'amber', icon: _isIconName(c.icon) ? c.icon : 'hourglass', important: true, ref: c, sort: 0 });
    }
  }
  // Home and the brief (opt.sources) show the user's own day, as the stories do; the
  // Calendar page shows every calendar that is switched on. User request, 3 Oct.
  const mineOnly = opt.mine !== undefined ? !!opt.mine : !!opt.sources;
  if (opt.sources ? on('google') : true) {
    for (const ev of calEventsOn(iso)) {
      if (!calEventVisible(ev)) continue;
      if (mineOnly && (!calEventIsMine(ev) || calEventUntitled(ev))) continue;
      const declined = calIsDeclined(ev);
      if (declined && !on('declined')) continue;
      const imp = calIsImportant(ev);
      const e = { kind: 'event', key: 'e:' + ev.id, id: ev.id, title: ev.summary, allDay: !!ev.allDay, color: calEventColor(ev), important: imp, declined, free: !!ev.free, ref: ev };
      if (!ev.allDay) {
        const s = calEventStart(ev), en = calEventEnd(ev);
        // Wall-clock minutes, as Google draws them: a clock-change day has 23 or 25 hours, and
        // counting elapsed time put everything after 02:00 an hour off on those days.
        const wall = (d) => { const p = Clock.parts(d.getTime()); return p.iso < iso ? 0 : p.iso > iso ? 24 * 60 : p.h * 60 + p.mi; };
        e.start = wall(s);
        e.end = wall(en);
        if (e.end <= e.start) e.end = Math.min(24 * 60, e.start + 15);
        e.continued = Clock.parts(s.getTime()).iso !== iso;
        // A timed event that fills the whole day (or a day it runs through) reads as all-day.
        // So does one that lasts a day or more (a trip, a conference): it sits in the all-day lane.
        if ((e.start === 0 && e.end >= 24 * 60 - 1) || en.getTime() - s.getTime() >= 24 * 3600 * 1000) { e.allDay = true; e.time = ''; }
        e.time = e.continued ? '' : _calTime(s);
      }
      // Important first; other people's all-day "free" items (leave, reminders) last.
      e.sort = imp ? (e.allDay ? 0.5 : 0.6 + e.start / 10000) : e.allDay ? (e.free ? 1800 : 1) : 10 + e.start;
      out.push(e);
    }
  }
  // Planned time (20-task-plan.js) has its own switch ('plans', on unless hidden): it is not a due date.
  const tasksOn = on('tasks'), plansOn = opt.plans !== false && on('plans') && typeof planSlotOf === 'function';
  if (tasksOn || plansOn) {
    // The calendar's own view can show one stream only (right-click a stream > Show in calendar).
    const onlyStream = !opt.sources && calPrefs().stream && STREAMS[calPrefs().stream] ? calPrefs().stream : null;
    for (const t of getAllItems()) {
      // A planned slot that day: when the user means to work on it, its own entry
      // (planned:true, key 'p:<id>') beside the deadline's. opt.plans:false leaves them out.
      const ps = plansOn ? planSlotOf(t) : null;
      const dueHere = tasksOn && effDate(t) === iso, planHere = !!(ps && ps.date === iso);
      if (!dueHere && !planHere) continue;
      if (onlyStream && effStream(t) !== onlyStream) continue;
      const done = statusOf(t.id) === 'done';
      if (done && !opt.includeDone) continue;
      if (opt.taskFilter && !opt.taskFilter(t)) continue;
      const p = effPriority(t);
      if (planHere) {
        out.push({ kind: 'task', planned: true, key: 'p:' + t.id, id: t.id, title: effTitle(t), allDay: false, prio: p, done, important: false, ref: t,
          start: ps.start, end: ps.end, time: _calTimeLabel(ps.time), sort: 10 + ps.start });
      }
      if (!dueHere) continue;
      const tm = _calMinOf(t.dueTime);
      const e = { kind: 'task', key: 't:' + t.id, id: t.id, title: effTitle(t), allDay: tm === null, prio: p, done, important: p === 'p1', ref: t };
      if (tm !== null) { e.start = tm; e.end = Math.min(24 * 60, tm + (Number(t.estimate) > 0 ? Math.min(Number(t.estimate), 8 * 60) : 30)); e.time = _calTimeLabel(t.dueTime); }
      e.sort = p === 'p1' && !done ? 0.7 : tm !== null ? 10 + tm : 1600 + (PRIORITY_ORDER[p] ?? 3);
      out.push(e);
    }
  }
  out.sort((a, b) => a.sort - b.sort || String(a.title).localeCompare(String(b.title)));
  return out;
}

/** Chip markup for month cells and the all-day row (text is escaped). */
function calChipHtml(e, o) {
  o = o || {};
  const cls = ['ce'];
  let inner = '';
  if (e.kind === 'event') {
    cls.push(e.allDay ? 'allday' : 'timed', 'c-' + e.color);
    if (e.important) cls.push('imp');
    if (e.declined) cls.push('declined');
    inner = (e.time && !e.allDay ? `<time>${esc(e.time)}</time>` : '') + `<span>${esc(e.title)}</span>`;
  } else if (e.kind === 'task') {
    cls.push('tk');
    if (e.planned) cls.push('plan');
    if (e.done) cls.push('done');
    // A stream with its own symbol or shape shows it on its tasks (28-customise.js).
    const sid = e.ref ? effStream(e.ref) : null;
    const mark = sid && typeof streamIsCustomised === 'function' && streamIsCustomised(sid) ? streamMarkHtml(sid) : '';
    inner = `<span class="mini-check ${escAttr(e.prio)}"></span>` + (e.time ? `<time>${esc(e.time)}</time>` : '') + mark + `<span>${esc(e.title)}</span>`;
  } else {
    cls.push('cd', 'c-' + e.color);
    inner = icon(e.icon) + `<span>${esc(e.title)}</span>`;
  }
  const drag = e.kind === 'task' && !o.noDrag ? ' draggable="true"' : '';
  const tip = e.kind === 'event' ? `${e.time ? e.time + ' · ' : ''}${e.title}${e.declined ? ' (declined)' : ''}` : e.kind === 'task' ? `${e.planned ? 'Planned' : 'Task'}: ${e.title}` : `Countdown: ${e.title}`;
  return `<button type="button" class="${cls.join(' ')}" data-kind="${e.kind}" data-id="${escAttr(e.id)}"${e.planned ? ' data-plan="1"' : ''}${drag} title="${escAttr(tip)}">${inner}</button>`;
}

/* ---------- scheduling (drag and drop) ---------- */
const CAL_DND_TYPE = 'application/x-dashboard-task';
let _calDragId = null;          // the task being dragged (dataTransfer is unreadable during dragover)
let _calDragOffsetMin = 0;      // where in a planned block it was grabbed, so it keeps its place
function calDragStart(e, id) {
  const t = getItem(id);
  _calDragId = id;
  _calDragOffsetMin = 0;
  if (typeof planDragNote === 'function') planDragNote(e, id);   // a planned block moves its slot, never the deadline (20-task-plan.js)
  const block = e.target && e.target.closest ? e.target.closest('.wv-ev.is-task') : null;
  if (block) {
    const r = block.getBoundingClientRect();
    _calDragOffsetMin = Math.max(0, Math.round(((e.clientY - r.top) / (typeof CAL_HOUR_PX === 'number' ? CAL_HOUR_PX : 48)) * 60 / 15) * 15);
  }
  try {
    e.dataTransfer.setData(CAL_DND_TYPE, id);
    e.dataTransfer.setData('text/plain', effTitle(t || { title: '' }));
    e.dataTransfer.effectAllowed = 'move';
    if (!block && t) {
      // A small card follows the pointer: the task and how long it is planned for.
      const g = document.createElement('div'); g.className = 'wv-ghost';
      const mins = Number(t.estimate) > 0 ? Number(t.estimate) : 30;
      g.innerHTML = `${icon('grip-vertical', 'i-xs')}<span class="mini-check ${escAttr(effPriority(t))}"></span><span class="wv-ghost-n">${esc(effTitle(t))}</span><span class="wv-ghost-t">${esc(typeof calDurLabel === 'function' ? calDurLabel(mins) : mins + 'm')}</span>`;
      document.body.appendChild(g);
      e.dataTransfer.setDragImage(g, 14, 16);
      setTimeout(() => g.remove(), 0);
    }
  } catch (x) { /* old browsers */ }
  document.body.classList.add('cal-dragging');
}
function calDragEnd() {
  _calDragId = null; _calDragOffsetMin = 0;
  document.body.classList.remove('cal-dragging');
  document.querySelectorAll('.drop-on').forEach(n => n.classList.remove('drop-on'));
  document.querySelectorAll('.wv-drop:not(.pick)').forEach(n => { n.hidden = true; });
}
function calDropTaskId(e) { try { return e.dataTransfer.getData(CAL_DND_TYPE) || null; } catch (x) { return null; } }
/** Wire a drop target. at(e) -> {date, time|null|undefined} (undefined time = keep the task's time). */
function calMakeDropTarget(el, at) {
  el.addEventListener('dragover', (e) => {
    if (![...(e.dataTransfer.types || [])].includes(CAL_DND_TYPE)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    el.classList.add('drop-on');
  });
  el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove('drop-on'); });
  el.addEventListener('drop', (e) => {
    const id = calDropTaskId(e);
    el.classList.remove('drop-on');
    if (!id) return;
    e.preventDefault();
    const where = at(e);
    if (where && where.date && typeof planDropOnDay === 'function' && planDropOnDay(id, where)) return;
    if (where && where.date) calScheduleTask(id, where.date, where.time);
  });
}
/** Move a task to `date` (and `time` 'HH:MM', null = no time, undefined = keep). One undo step + an Undo toast. */
function calScheduleTask(id, date, time) {
  const t = getItem(id); if (!t) return;
  const prev = { dueDate: t.dueDate || null, dueTime: t.dueTime || null };
  const nextTime = time === undefined ? prev.dueTime : time;
  if (prev.dueDate === date && prev.dueTime === (nextTime || null)) return;
  if (prev.dueDate !== date) logActivity(id, 'date', { from: prev.dueDate, to: date, reason: 'Moved on the calendar' });
  t.dueDate = date;
  if (nextTime) t.dueTime = nextTime; else delete t.dueTime;
  saveData(); render();
  const when = _calFmt(date, { weekday: 'short', day: 'numeric', month: 'short' }) + (nextTime ? ', ' + _calTimeLabel(nextTime) : '');
  toast(`Moved to ${when}`, { kind: 'ok', icon: 'calendar-check', action: { label: 'Undo', run: () => {
    const x = getItem(id); if (!x) return;
    x.dueDate = prev.dueDate;
    if (prev.dueTime) x.dueTime = prev.dueTime; else delete x.dueTime;
    saveData(); render();
  } } });
}

/* ---------- Google Calendar: prefilled "new event" page ---------- */
/** An instant as Google's 'YYYYMMDDTHHMMSS' wall time in the dashboard's zone (sent with ctz = that zone). */
function _calStamp(ms) { const t = Clock.parts(ms), p = (n) => String(n).padStart(2, '0'); return `${t.iso.replace(/-/g, '')}T${p(t.h)}${p(t.mi)}00`; }
/** o: {title, date 'YYYY-MM-DD', time 'HH:MM'|null, minutes, details, location} -> https URL. */
function googleCalendarUrl(o) {
  o = o || {};
  const date = /^\d{4}-\d{2}-\d{2}$/.test(o.date || '') ? o.date : todayStr();
  let dates;
  const tm = _calMinOf(o.time);
  if (tm !== null) {
    const s = Clock.at(date, tm);
    const e = s + (Number(o.minutes) > 0 ? Number(o.minutes) : 60) * 60000;
    dates = _calStamp(s) + '/' + _calStamp(e);
  } else {
    dates = date.replace(/-/g, '') + '/' + _calAddDays(date, 1).replace(/-/g, '');
  }
  const q = new URLSearchParams({ action: 'TEMPLATE', text: String(o.title || '').slice(0, 300), dates });
  if (o.details) q.set('details', String(o.details).slice(0, 1500));
  if (o.location) q.set('location', String(o.location).slice(0, 300));
  if (tm !== null) q.set('ctz', Clock.zone());   // one zone for the stamp and ctz (spec 2.7 P5)
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
function calAddTaskToGoogle(id) {
  const t = getItem(id); if (!t) return;
  const url = googleCalendarUrl({ title: effTitle(t), date: effDate(t) || todayStr(), time: t.dueTime || null, details: effDetail(t) });
  window.open(url, '_blank', 'noopener');
}

/* ---------- Today page: today's schedule strip ---------- */
function renderCalendarEvents() {
  if (APP_CONFIG.features && APP_CONFIG.features.calendar === false) return null;
  if (!CalStore.st.loaded) { CalStore.load(); return null; }
  const today = todayStr();
  const evs = calEntriesOn(today, { sources: { google: true, tasks: false, countdowns: false, declined: false } }).filter(e => e.kind === 'event');
  const wrap = document.createElement('div'); wrap.className = 'cal-sched';
  const now = Date.now();
  if (!CalStore.data || CalStore.data.status !== 'ok') {
    if (CalStore.access() === 'no') return null;
    wrap.innerHTML = `<span class="cal-sched-empty">${icon('calendar-days')}<span>No calendar yet</span></span>`;
  } else if (!evs.length) {
    wrap.innerHTML = `<span class="cal-sched-empty">${icon('calendar-check')}<span>Nothing on your calendar today</span></span>`;
  }
  // Pills sit in one row that never squeezes them: whatever does not fit wraps
  // out of sight (past events go first) and is counted in "+N".
  const pills = document.createElement('div'); pills.className = 'cal-sched-pills';
  let more = null;
  if (CalStore.data && CalStore.data.status === 'ok' && evs.length) {
    for (const e of evs.slice(0, 8)) {
      const ev = e.ref, s = calEventStart(ev).getTime(), en = calEventEnd(ev).getTime();
      const isNow = !e.allDay && s <= now && en > now;
      const b = document.createElement('button'); b.type = 'button';
      b.className = `cal-pill c-${e.color}` + (!e.allDay && en < now ? ' past' : '') + (isNow ? ' now' : '') + (e.important ? ' imp' : '');
      b.innerHTML = `<time>${esc(e.allDay ? 'All day' : e.time)}</time><span>${esc(e.title)}</span>${isNow ? '<em class="cal-pill-now">now</em>' : ''}`;
      b.title = e.title + (isNow ? ' (happening now)' : '');
      b.onclick = () => { calOpenEvent(ev.id, b); };
      pills.appendChild(b);
    }
    wrap.appendChild(pills);
    more = document.createElement('button'); more.type = 'button'; more.className = 'cal-sched-more'; more.hidden = true;
    more.onclick = () => setView('calendar:day');
    const extra = Math.max(0, evs.length - 8);
    let ro = null;
    const fit = () => {
      if (!pills.isConnected) { if (ro) { ro.disconnect(); ro = null; } return; }
      const all = [...pills.children];
      all.forEach(p => { p.hidden = false; });
      const cut = () => all.filter(p => !p.hidden && p.offsetTop > 2);
      // Drop past events before upcoming ones when space is short.
      for (const p of all.filter(x => x.classList.contains('past'))) { if (!cut().length) break; p.hidden = true; }
      const n = all.filter(p => p.hidden).length + cut().length + extra;
      more.hidden = !n; more.textContent = `+${n}`;
      more.title = `${n} more today · open the day`;
    };
    requestAnimationFrame(() => {
      fit();
      if (pills.isConnected && typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => fit()); ro.observe(pills); }
    });
  }
  const tail = document.createElement('span'); tail.className = 'cal-sched-tail';
  if (more) tail.appendChild(more);
  if (CalStore.data && CalStore.data.fetchedAt && gdIsStale(CalStore)) {
    const a = document.createElement('span'); a.className = 'cal-age warn'; a.textContent = gdAgeLabel(CalStore.data.fetchedAt);
    tail.appendChild(a);
  }
  const open = document.createElement('button'); open.type = 'button'; open.className = 'btn btn-ghost btn-sm';
  open.innerHTML = `<span>Open calendar</span>${icon('arrow-right', 'i-sm')}`;
  open.onclick = () => setView('calendar');
  tail.appendChild(open);
  wrap.appendChild(tail);
  return wrap;
}
/** Kept for the boot code: loads the calendar data (cheap, local) once. */
function fetchCalendarEvents() { if (_serverAvailable) CalStore.load(); }

/* ---------- the task views' "Calendar" mode ---------- */
// A month grid of exactly the tasks the current view and filter show; drag a
// task to another day to reschedule it. The full Calendar lives at #view=calendar.
function renderCalendarView(container) {
  if (!/^\d{4}-\d{2}$/.test(state.calMonth || '')) state.calMonth = todayStr().slice(0, 7);
  const [yr, mo] = state.calMonth.split('-').map(Number);
  const filter = (i) => matchesView(i, state.view) || (effDate(i) && ['today', 'week', 'tomorrow'].includes(state.view) && !isArchived(i));
  const wrap = document.createElement('div'); wrap.className = 'cal-taskmonth';
  const head = document.createElement('div'); head.className = 'cal-h';
  head.innerHTML = `<h1>${esc(new Date(yr, mo - 1, 1).toLocaleDateString(_CAL_LOCALE(), { month: 'long' }))} <span>${yr}</span></h1>`
    + `<button type="button" class="btn-icon" data-d="-1" aria-label="Previous month">${icon('chevron-left')}</button>`
    + `<button type="button" class="btn-icon" data-d="1" aria-label="Next month">${icon('chevron-right')}</button>`
    + `<button type="button" class="btn btn-secondary btn-sm" data-d="0">Today</button>`
    + `<span class="spacer"></span><button type="button" class="btn btn-ghost btn-sm" data-open>${icon('calendar-days')}<span>Open full calendar</span></button>`;
  head.querySelectorAll('[data-d]').forEach(b => {
    b.onclick = () => {
      const n = Number(b.dataset.d);
      const d = n === 0 ? _calParse(todayStr()) : new Date(yr, mo - 1 + n, 1);
      state.calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // clock-ok: wall date
      saveUI(); renderMain();
    };
  });
  head.querySelector('[data-open]').onclick = () => setView('calendar');
  wrap.appendChild(head);
  const grid = calMonthGrid({
    year: yr, month: mo - 1,
    entries: (iso) => calEntriesOn(iso, { sources: { google: false, countdowns: false, tasks: true }, taskFilter: (i) => filter(i) && matchesSearch(i, searchQuery), includeDone: true }),
    onDay: (iso) => setView('day:' + iso),
  });
  grid.classList.add('compact');
  wrap.appendChild(grid);
  container.appendChild(wrap);
  requestAnimationFrame(() => calFitMonth(grid));
}

/**
 * The month grid used by the Calendar section and the task views.
 * o: {year, month (0-11), entries(iso) -> [entry], selected, onDay(iso),
 *     onSelect(iso), onEvent(id), onTask(id)}
 */
function calMonthGrid(o) {
  const ws = typeof _weekStartIndex === 'function' ? _weekStartIndex() : 1;
  const first = new Date(o.year, o.month, 1);
  const lead = (first.getDay() - ws + 7) % 7; // clock-ok: wall date
  const start = new Date(o.year, o.month, 1 - lead);
  const daysIn = new Date(o.year, o.month + 1, 0).getDate(); // clock-ok: wall date
  const weeks = Math.ceil((lead + daysIn) / 7);
  const today = todayStr();
  const grid = document.createElement('div'); grid.className = 'month';
  grid.style.setProperty('--weeks', String(weeks));
  grid.setAttribute('role', 'grid');
  const base = new Date(2024, 0, 7 + ws);
  for (let i = 0; i < 7; i++) {
    const h = document.createElement('div'); h.className = 'dow'; h.setAttribute('role', 'columnheader');
    h.textContent = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i).toLocaleDateString(_CAL_LOCALE(), { weekday: 'short' }); // clock-ok: wall date
    grid.appendChild(h);
  }
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i); // clock-ok: wall date
    const iso = fmtDate(d);
    const out = d.getMonth() !== o.month; // clock-ok: wall date
    const wk = d.getDay() === 0 || d.getDay() === 6; // clock-ok: wall date
    const cell = document.createElement('div');
    cell.className = 'mc' + (out ? ' out' : '') + (wk ? ' wkend' : '') + (iso === today ? ' today' : '') + (o.selected === iso ? ' sel' : '');
    cell.dataset.date = iso;
    cell.setAttribute('role', 'gridcell');
    const label = d.getDate() === 1 ? d.toLocaleDateString(_CAL_LOCALE(), { day: 'numeric', month: 'short' }) : String(d.getDate()); // clock-ok: wall date
    const full = d.toLocaleDateString(_CAL_LOCALE(), { weekday: 'long', day: 'numeric', month: 'long' });
    const entries = o.entries(iso);
    cell.innerHTML = `<button type="button" class="dn" aria-label="${escAttr(full)}">${esc(label)}</button>` + entries.map(e => calChipHtml(e)).join('');
    cell._entries = entries;
    grid.appendChild(cell);
    calMakeDropTarget(cell, () => ({ date: iso }));
  }
  grid.addEventListener('click', (e) => {
    const chip = e.target.closest('.ce');
    const cell = e.target.closest('.mc');
    if (chip && chip.classList.contains('more')) { e.stopPropagation(); calDayPopover(chip, cell.dataset.date, cell._entries, o); return; }
    if (chip) { e.stopPropagation(); _calChipClick(chip, o); return; }
    if (e.target.closest('.dn') && cell) { (o.onDay || o.onSelect || (() => {}))(cell.dataset.date); return; }
    if (cell && o.onSelect) o.onSelect(cell.dataset.date);
  });
  grid.addEventListener('dblclick', (e) => { const cell = e.target.closest('.mc'); if (cell && !e.target.closest('.ce') && o.onDay) o.onDay(cell.dataset.date); });
  grid.addEventListener('contextmenu', (e) => { const chip = e.target.closest('.ce.tk'); if (chip) { e.preventDefault(); calTaskMenu(chip, chip.dataset.id); } });
  grid.addEventListener('dragstart', (e) => { const chip = e.target.closest('.ce.tk'); if (chip) calDragStart(e, chip.dataset.id); });
  grid.addEventListener('dragend', calDragEnd);
  return grid;
}
function _calChipClick(chip, o) {
  const id = chip.dataset.id, kind = chip.dataset.kind;
  // The chip goes along so the centre card can grow out of it (61-task-card.js).
  if (kind === 'event') (o.onEvent || calOpenEvent)(id, chip);
  else if (kind === 'task') (o.onTask || (typeof openTask === 'function' ? (tid, el) => openTask(tid, { from: el }) : selectTask))(id, chip);
  else if (kind === 'countdown' && typeof openCountdownEditor === 'function') openCountdownEditor(id);
}
/** Hide the chips that do not fit in each cell and add "N more". */
function calFitMonth(grid) {
  if (!grid || !grid.isConnected) return;
  for (const cell of grid.querySelectorAll('.mc')) {
    cell.querySelectorAll('.ce.more').forEach(n => n.remove());
    const chips = [...cell.querySelectorAll('.ce')];
    chips.forEach(c => { c.hidden = false; });
    if (cell.scrollHeight <= cell.clientHeight + 1 || chips.length < 2) continue;
    const more = document.createElement('button'); more.type = 'button'; more.className = 'ce more';
    cell.appendChild(more);
    let hidden = 0;
    for (let i = chips.length - 1; i >= 0 && cell.scrollHeight > cell.clientHeight + 1; i--) { chips[i].hidden = true; hidden++; more.textContent = `${hidden} more`; }
    more.setAttribute('aria-label', `${hidden} more on this day`);
  }
}
function calDayPopover(anchor, iso, entries, o) {
  openPopover(anchor, (el, close) => {
    el.classList.add('cal-daypop');
    const h = document.createElement('div'); h.className = 'cal-daypop-h';
    h.textContent = _calFmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
    el.appendChild(h);
    const list = document.createElement('div'); list.className = 'cal-daypop-l';
    list.innerHTML = (entries || []).map(e => calChipHtml(e)).join('');
    list.addEventListener('click', (e) => { const chip = e.target.closest('.ce'); if (chip) { close(); _calChipClick(chip, o || {}); } });
    list.addEventListener('dragstart', (e) => { const chip = e.target.closest('.ce.tk'); if (chip) { calDragStart(e, chip.dataset.id); setTimeout(close, 0); } });
    list.addEventListener('dragend', calDragEnd);
    el.appendChild(list);
    if (o && o.onDay) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm cal-daypop-open';
      b.innerHTML = `<span>Open day</span>${icon('arrow-right', 'i-sm')}`;
      b.onclick = () => { close(); o.onDay(iso); };
      el.appendChild(b);
    }
  }, { align: 'start', width: 280 });
}
/** Right-click menu for a task chip anywhere in the calendar. */
function calTaskMenu(anchor, id) {
  const t = getItem(id); if (!t) return;
  openMenu(anchor, [
    { label: 'Open task', icon: 'maximize-2', run: () => (typeof openTask === 'function' ? openTask(id, { from: anchor }) : selectTask(id)) },
    { label: statusOf(id) === 'done' ? 'Mark as to do' : 'Mark as done', icon: 'circle-check', run: () => { setStatus(id, statusOf(id) === 'done' ? 'todo' : 'done'); } },
    'sep',
    { label: 'Add to Google Calendar', icon: 'calendar-plus', run: () => calAddTaskToGoogle(id) },
    ...(t.dueTime ? [{ label: 'Remove the time', icon: 'clock', run: () => calScheduleTask(id, effDate(t), null) }] : []),
    ...(t.plannedFor && t.plannedTime && typeof setPlannedSlot === 'function' ? [{ label: 'Remove the planned time', icon: 'circle-x', run: () => setPlannedSlot(id, t.plannedFor, null) }] : []),
    { label: 'Remove the date', icon: 'circle-dashed', run: () => { const prev = effDate(t); setDateWithReason(id, null, 'Removed on the calendar'); delete t.dueTime; toast('Date removed', { action: { label: 'Undo', run: () => calScheduleTask(id, prev, undefined) } }); } },
  ], { align: 'start' });
}

/* ---------- for other modules and tools ---------- */
window.CalendarData = {
  store: CalStore,
  load: (force) => CalStore.load(force),
  events: () => calAllEvents(),
  eventsOn: (iso) => calEventsOn(iso),
  eventById: (id) => calEventById(id),
  eventsFor: (person, limit) => calendarEventsFor(person, limit),
  attendeeSuggestions: (limit) => calendarAttendeeSuggestions(limit),
  googleCalendarUrl: (o) => googleCalendarUrl(o),
  addTaskToGoogle: (id) => calAddTaskToGoogle(id),
  scheduleTask: (id, date, time) => calScheduleTask(id, date, time),
  access: () => CalStore.access(),
};

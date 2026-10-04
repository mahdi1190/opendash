/* ============================================================
   SUGGESTIONS ENGINE: the snapshot (owner: Suggestions engine)
   ------------------------------------------------------------
   sgSnapshot() builds the `ctx` every rule reads (shape: 68-suggest-logic.js
   sgPrepare), from the page: state (tasks, people, Home's Focus list),
   CalStore (the full events: free, declined, attendees), state.eventMeta
   (origin = the dashboard's own blocks, linked tasks, notes), InboxStore,
   the working hours (config.workHours via homeWorkHours() when it exists),
   which widgets are on the board, and what can be written (CalWrite, Gmail
   drafts). Rules never read the DOM or `state` themselves.
   Memoised on the state version, the calendar and inbox fetch times, the
   minute and the board, so every surface in one render shares one snapshot.
   sgSnapshot({now}) takes an injected clock (tests, screenshots).
   ============================================================ */

let _sgSnap = null, _sgSnapKey = '';
/** Working hours as config gives them (sgWork normalises): config.workHours, Mon-Fri 09:00-18:00 by default. */
function sgWorkHoursRaw() {
  if (typeof homeWorkHours === 'function') { try { const w = homeWorkHours(); if (w) return w; } catch (e) { /* the default */ } }
  return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.workHours) || null;
}
function _sgEveningHour() {
  try { if (typeof briefPrefs === 'function') { const h = Number(briefPrefs().eveningHour); if (h >= 12 && h <= 23) return h; } } catch (e) { /* default */ }
  const h = Number(APP_CONFIG && APP_CONFIG.brief && APP_CONFIG.brief.eveningHour);
  return h >= 12 && h <= 23 ? h : 17;
}
function _sgCalStatus() {
  try { if (typeof homeCalStatus === 'function') return homeCalStatus(); } catch (e) { /* below */ }
  return { ok: false, stale: false, label: '', fetchedAt: '' };
}
/** Can a focus block be written? -> {ok, reason: 'ok'|'connect'|'stale'|'none'} (S1's button). */
function sgCanBlock() {
  const w = typeof window !== 'undefined' ? window.CalWrite : null;
  if (!w || typeof w.create !== 'function') return { ok: false, reason: 'none' };
  let fake = false;
  try { fake = !!(w.info && w.info().fake); } catch (e) { fake = false; }
  let cal = null;
  try { cal = w.defaultCalendarId ? w.defaultCalendarId() : null; } catch (e) { cal = null; }
  if (!cal) return { ok: false, reason: 'connect' };
  if (!fake && typeof CalStore !== 'undefined' && typeof CalStore.access === 'function' && CalStore.access() === 'no') return { ok: false, reason: 'connect' };
  const st = _sgCalStatus();
  if (st.stale) return { ok: false, reason: 'stale' };
  return { ok: true, reason: 'ok' };
}
function _sgSurfaces() {
  const out = {};
  if (typeof state === 'undefined' || state.view !== 'home' || typeof homeLayout !== 'function') return out;
  try {
    for (const w of homeLayout().widgets) {
      if (w.hidden) continue;
      const def = typeof homeWidgetDef === 'function' ? homeWidgetDef(w.id) : null;
      if (def && typeof homeWidgetAvailable === 'function' && !homeWidgetAvailable(def)) continue;
      out[w.id] = true;
    }
  } catch (e) { /* none */ }
  return out;
}
function _sgOpenTask() { try { return typeof tcCurrentTaskId === 'function' ? tcCurrentTaskId() || null : null; } catch (e) { return null; } }
/** Who organised an event (not the user): Google's name, else the People entry with that email. -> {name, email} */
function _sgOrganizer(ev) {
  const o = ev && ev.organizer;
  if (!o || o.self) return { name: '', email: '' };
  const email = String(o.email || '').toLowerCase();
  let name = String(o.name || o.displayName || '');
  if (!name && email) {
    const p = (state.people || []).find(x => x && [x.email].concat(x.emails || []).some(e => String(e || '').toLowerCase() === email));
    if (p) name = String(p.name || '');
  }
  return { name: name.slice(0, 80), email: email.slice(0, 120) };
}
function _sgCanRsvp(ev) { try { const w = typeof window !== 'undefined' ? window.CalWrite : null; return !!(w && typeof w.canRsvp === 'function' && (w.canRsvp(ev) || {}).ok); } catch (e) { return false; } }
function _sgEventMeta(id) { const m = state.eventMeta && state.eventMeta[id]; return m && typeof m === 'object' ? m : {}; }
function _sgEventsOn(iso) {
  if (typeof calEntriesOn !== 'function' || typeof CalStore === 'undefined' || !CalStore.data) return [];
  let entries = [];
  try { entries = calEntriesOn(iso, { sources: { google: true, tasks: false, countdowns: false, declined: true } }); } catch (e) { return []; }
  const out = [];
  for (const e of entries) {
    if (!e || e.kind !== 'event') continue;
    const ev = e.ref || {};
    const meta = _sgEventMeta(e.id);
    const att = Array.isArray(ev.attendees) ? ev.attendees : [];
    let type = 'event';
    try { if (typeof animForEvent === 'function') type = (animForEvent(ev) || {}).type || 'event'; } catch (x) { /* plain */ }
    out.push({
      id: e.id, title: String(e.title || ''), start: e.allDay ? 0 : Number(e.start) || 0, end: e.allDay ? 24 * 60 : Number(e.end) || 0,
      allDay: !!e.allDay, free: !!e.free, declined: !!e.declined, type,
      people: typeof _homeCalPeople === 'function' ? _homeCalPeople(att) : [],
      attendees: att.filter(a => a && !a.self && !a.resource).length,
      organizerSelf: !!(ev.organizer && ev.organizer.self), myResponse: ev.selfResponse || '',
      recurring: !!ev.recurringEventId, calendarId: ev.calendarId || '', location: String(ev.location || ''),
      join: !!(ev.conferenceUrl || ev.hangoutLink),
      origin: meta.origin && typeof meta.origin === 'object' ? meta.origin : null,
      linked: Array.isArray(meta.tasks) ? meta.tasks.slice() : [], notes: !!meta.notes, wrapped: !!meta.wrapped,
      // S6 (68-suggest-rules-time.js): who invited the user, and whether the dashboard may answer it.
      organizer: _sgOrganizer(ev).name, organizerEmail: _sgOrganizer(ev).email,
      canRsvp: ev.selfResponse === 'needsAction' ? _sgCanRsvp(ev) : false,
    });
  }
  return out;
}
function _sgTasks(today, focusWhy) {
  const tasks = [], timed = {};
  const snoozed = (state.home && state.home.snoozed) || {};
  for (const i of typeof getAllItems === 'function' ? getAllItems() : []) {
    const status = statusOf(i.id);
    if (status === 'done') continue;
    const subs = typeof effSubtasks === 'function' ? effSubtasks(i) : (i.subtasks || []);
    const open = [], doneAt = [];
    let done = 0;
    for (const s of Array.isArray(subs) ? subs : []) {
      if (!s || typeof s !== 'object') continue;
      if (s.done) { done++; if (s.doneAt) doneAt.push(Number(s.doneAt)); } else if (open.length < 5) open.push(String(s.title || s.text || ''));
    }
    const due = effDate(i);
    const t = {
      id: i.id, title: String(effTitle(i) || ''), stream: effStream(i) || '', priority: effPriority(i), status,
      due: due || null, dueTime: i.dueTime || null, planned: i.plannedFor || null, plannedTime: i.plannedTime || null,
      plannedMinutes: Number(i.plannedMinutes) || null, estimate: Number(i.estimate) || null, createdAt: i.createdAt || null,
      waiting: typeof homeIsWaiting === 'function' ? homeIsWaiting(i) : false,
      snoozed: !!(snoozed[i.id] && snoozed[i.id] >= today), notStarted: !!(i.startDate && i.startDate > today),
      subtasks: { done, total: (Array.isArray(subs) ? subs.length : 0), open, doneAt },
      people: typeof effPeople === 'function' ? effPeople(i) : [], tags: typeof effTags === 'function' ? effTags(i) : [],
      focusWhy: focusWhy.get(i.id) || [],
    };
    if (typeof _sgTaskExtra === 'function') Object.assign(t, _sgTaskExtra(i, today));   // moves, waitingOn, emails (68-suggest-context-tasks.js)
    tasks.push(t);
    const add = (iso, hm, mins) => {
      const s = typeof _homeMinOf === 'function' ? _homeMinOf(hm) : null;
      if (!iso || s === null) return;
      (timed[iso] || (timed[iso] = [])).push({ id: i.id, start: s, end: Math.min(24 * 60, s + Math.max(5, Math.min(720, mins || 30))) });
    };
    add(due, i.dueTime, Number(i.estimate));
    if (i.plannedFor && i.plannedTime) add(i.plannedFor, i.plannedTime, Number(i.plannedMinutes) || Number(i.estimate));
  }
  return { tasks, timed };
}
function _sgPeople() {
  const out = {};
  for (const p of (state.people || [])) {
    if (!p || !p.id) continue;
    out[p.id] = { first: String(p.name || '').split(/\s+/)[0] || '', name: String(p.name || ''), email: p.email || (p.emails && p.emails[0]) || '', self: !!p.self };
  }
  return out;
}
function _sgInbox() {
  const d = typeof InboxStore !== 'undefined' ? InboxStore.data : null;
  const msgs = d && Array.isArray(d.messages) ? d.messages : [];
  const handled = (state.emailTriage && state.emailTriage.handled) || {};
  return {
    ok: !!(d && (d.fetchedAt || msgs.length)), fetchedAt: (d && d.fetchedAt) || '',
    threads: msgs.slice(0, 200).map(m => ({ id: m.threadId || m.id, lastMessageId: m.lastMessageId || '', from: m.from || {}, subject: String(m.subject || ''),
      date: m.date || '', unread: !!m.unread, important: !!m.important, category: m.category || '', count: Number(m.count) || 1, handled: !!handled[m.threadId || m.id] })),
  };
}
/** The snapshot. o.now = a Date or epoch ms (tests, screenshots); default the page clock. */
function sgSnapshot(o) {
  o = o || {};
  // "Now" in the dashboard's zone (Clock, travel spec 2.7 P9); the memo key carries the zone.
  const d = new Date(o.now != null ? (o.now instanceof Date ? o.now.getTime() : Number(o.now)) : Clock.now());
  const cp = Clock.parts(d.getTime());
  const today = cp.iso, min = cp.min;
  const cs = _sgCalStatus();
  const calData = typeof CalStore !== 'undefined' ? CalStore.data : null;
  const inbox = typeof InboxStore !== 'undefined' ? InboxStore.data : null;
  const surfaces = _sgSurfaces();
  const can = sgCanBlock();
  const key = [state._lastSave || 0, state._saveCount || 0, calData ? (calData.fetchedAt || '') + ':' + ((calData.events || []).length) : '-', cs.stale ? 's' : '',
    inbox ? inbox.fetchedAt || '' : '-', today, min, Clock.zone(), JSON.stringify(surfaces), can.reason, (typeof DashboardNet !== 'undefined' && DashboardNet.down) ? 'down' : '',
    typeof _sgCalwTick !== 'undefined' ? _sgCalwTick : 0, _sgOpenTask(), typeof TravelStore !== 'undefined' ? TravelStore.version() : 0].join('|');
  if (!o.fresh && o.now == null && _sgSnap && key === _sgSnapKey) return _sgSnap;
  const focusList = typeof homeFocusTasks === 'function' ? homeFocusTasks(5) : [];
  const focusWhy = new Map(focusList.map(x => [x.i.id, (x.why || []).map(w => w.t)]));
  const { tasks, timed } = _sgTasks(today, focusWhy);
  const days = {};
  if (cs.ok) for (let k = -1; k <= 7; k++) { const iso = sgAddDays(today, k); days[iso] = _sgEventsOn(iso); }
  const gmailDraft = !!(typeof window !== 'undefined' && window.GmailDraft && typeof window.GmailDraft.available === 'function' && (() => { try { return window.GmailDraft.available(); } catch (e) { return false; } })());
  const ctx = {
    now: { date: today, min, dow: cp.dow, ts: d.getTime() },
    tz: Clock.zone(), homeTz: Clock.home(), locale: APP_CONFIG.locale || '', userFirst: typeof userName === 'function' ? userName() : '',
    work: sgWork(sgWorkHoursRaw()), eveningHour: _sgEveningHour(),
    cal: { ok: !!cs.ok, stale: !!cs.stale, writable: can.ok, fetchedAt: cs.fetchedAt || '', label: cs.label || '', days },
    tasks, timed, focus: focusList.map(x => x.i.id),
    people: _sgPeople(), inbox: _sgInbox(),
    triage: { pending: ((state.emailTriage && state.emailTriage.suggestions) || []).filter(s => s && (!s.status || s.status === 'pending')) },
    countdowns: (state.countdowns || []).filter(c => c && c.date).map(c => ({ id: c.id, label: c.label || '', date: c.date, daysLeft: sgDaysBetween(today, c.date) })),
    surfacesVisible: surfaces,
    openTask: _sgOpenTask(),           // the task card on screen (S2 block-task shows in it)
    capabilities: {
      calendar: !!cs.ok && !cs.stale, calWrite: can.ok || can.reason === 'stale', inbox: !!(inbox && inbox.fetchedAt), gmailDraft,
      server: typeof _serverAvailable === 'undefined' || !!_serverAvailable, ai: typeof AI_AVAILABLE !== 'undefined' && !!AI_AVAILABLE,
    },
    net: { down: !!(typeof DashboardNet !== 'undefined' && DashboardNet.down) },
    // The money story (src/finance/28-money-story.js): {ok, known, offer: {due, ref, month, label, key}} or null.
    money: (typeof window !== 'undefined' && window.MoneyStory && typeof window.MoneyStory.status === 'function') ? (() => { try { return window.MoneyStory.status(d); } catch (e) { return null; } })() : null,
  };
  if (typeof _sgCtxExtra === 'function') Object.assign(ctx, _sgCtxExtra(ctx));   // streams, eveningSaved, myEmails (68-suggest-context-tasks.js)
  // Travel (69-travel.js): the trips, legs, body clock and their-time facts the T1-T14 cards read.
  if (typeof trSnapshot === 'function') {
    try { ctx.travel = trSnapshot({ tasks, now: o.now != null ? d.getTime() : undefined }); } catch (e) { console.error('[travel]', e); ctx.travel = null; }
    ctx.capabilities.travel = !!(ctx.travel && ctx.travel.on);
  }
  if (o.now == null) { _sgSnap = ctx; _sgSnapKey = key; }
  return ctx;
}

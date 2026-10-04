/* ============================================================
   CALENDAR WRITE: window.CalWrite (owner: Calendar write layer)
   ------------------------------------------------------------
   Changes to real Google Calendar events, the way Google Calendar's own page
   makes them: the event moves at once (optimistic), Google is told in the
   background, a chip says "Saving to Google..." then "Saved", and a toast offers
   Undo (the inverse change). If Google says no, the event goes back and the
   toast says why. Server side: server/routes/calendar.mjs + lib/calendar-write.mjs.
   The rules (who may change what, guests, optimistic copies, coalescing) live
   in 44-calendar-write-logic.js, shared with the server.

   API (every write resolves; it never rejects):
     CalWrite.canEdit(ev)            -> {ok, reason?, code?, calendarId?}   ev = event, id or calendar entry
     CalWrite.guests(ev)             -> [{email, name, self:false, organizer, responseStatus}]
     CalWrite.move(id, {start, end, allDay})   CalWrite.resize(id, {end})
     CalWrite.update(id, {title?, start?, end?, allDay?, location?, description?, calendarId?})
     CalWrite.create({calendarId?, title, start, end, allDay?, location?, description?})  (default: primary)
     CalWrite.remove(id)             CalWrite.rsvp(id, 'accepted'|'declined'|'tentative')
       -> Promise<{ok:true, event, events?, removed?, undo} | {ok:false, code, message, cancelled?}>
     The last argument may only be {quiet: true, silent: true}: nothing outside CalWrite can skip or answer its questions.
     (quiet: no toast for a refusal; silent: no "saved" toast with Undo, the caller shows its own, e.g. a suggestion's receipt.)
     CalWrite.pending(id) -> boolean      CalWrite.onChange(fn) -> unsubscribe
       fn({id, op, state:'pending'|'saved'|'error'|'cancelled', pending, newId?, code?, message?})
     Extras: canRsvp(ev), fieldEditable(ev, field), defaultCalendarId(), writableCalendars(), undoLast() (z / Ctrl+Z),
       realId(id) (a created event's temporary 'tmp-' id -> its Google id), info() -> {fake},
       supports('colorId'|'guests') -> true: update patches may carry colorId ('1'-'11'),
       addGuests [email|{email, optional}], removeGuests [email]; create may carry colorId, guests.
   Times: timed = Date, epoch ms or ISO date-time; all-day = 'YYYY-MM-DD' (or a
   Date: its local day) with Google's EXCLUSIVE end day (a one-day event on the
   6th ends on the 7th).
   Before a write: a repeating event asks "This event / This and following /
   All events" (the middle one is not possible through the connector: shown
   disabled); an event with guests asks "Send update / Don't send / Cancel"
   (Cancel puts the event back). Writes to one calendar go one at a time;
   quick edits to the same event that are still waiting are merged (last wins).
   CSS: styles/44-calendar-write.css (chip, dialogs, .calw-pending for blocks being saved).
   ============================================================ */

const _calwClientId = 'tab' + Math.random().toString(36).slice(2, 10);
const _calwSubs = new Set();
const _calwPendingN = new Map();     // event id -> writes queued or running
const _calwQueues = new Map();       // calendar id -> {busy, jobs:[]}
const _calwTmp = new Map();          // 'tmp-...' id of a created event -> its Google id
let _calwChipEl = null, _calwChipTimer = null, _calwReloadAfter = false, _calwSeq = 0;

/* ---------- the model (CalStore.data.events) ---------- */
function _calwCalendars() { const d = typeof CalStore !== 'undefined' ? CalStore.data : null; return d && Array.isArray(d.calendars) ? d.calendars : []; }
function _calwList() { const d = typeof CalStore !== 'undefined' ? CalStore.data : null; if (!d) return null; if (!Array.isArray(d.events)) d.events = []; return d.events; }
function calwRealId(id) { let x = id, n = 0; while (_calwTmp.has(x) && n++ < 5) x = _calwTmp.get(x); return x; }
function _calwGet(id) { const list = _calwList(); if (!list) return null; const rid = calwRealId(id); return list.find(e => e.id === rid) || list.find(e => e.id === id) || null; }
function _calwEv(x) {
  if (!x) return null;
  if (typeof x === 'string') return _calwGet(x);
  if (x.kind !== undefined) return x.kind === 'event' && x.ref ? (_calwGet(x.ref.id) || x.ref) : null;
  return x.id ? (_calwGet(x.id) || x) : null;
}
function _calwClone(ev) { return JSON.parse(JSON.stringify(ev)); }
function _calwPut(ev, replaces) {
  const list = _calwList(); if (!list || !ev) return;
  const i = list.findIndex(e => e.id === (replaces || ev.id));
  if (i >= 0) list[i] = ev; else list.push(ev);
}
function _calwDrop(ids) {
  const list = _calwList(); if (!list || !ids || !ids.length) return;
  const gone = new Set(ids);
  for (let i = list.length - 1; i >= 0; i--) if (gone.has(list[i].id)) list.splice(i, 1);
}
/** The model changed: drop the calendar's derived caches and paint. */
function _calwRepaint() {
  _calIndex = null;
  if (typeof _calRepeatCache !== 'undefined') _calRepeatCache = { key: NaN, map: new Map() };
  if (typeof _rowMeetKey !== 'undefined') _rowMeetKey = null;
  if (typeof _calSoon !== 'undefined') _calSoon.at = 0;
  if (typeof render === 'function' && typeof state !== 'undefined') render();
}
function _calwOpt() { return { assumeRoles: false, myEmails: [] }; }
function _calwFake() { const d = typeof CalStore !== 'undefined' ? CalStore.data : null; return !!(d && d.write && d.write.fake); }
/** The user's own addresses (Settings > emails + Google's primary calendar): invitations are answered only for these. */
function _calwMine() {
  const out = ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.myEmails) || []).map(x => String(x).trim().toLowerCase()).filter(Boolean);
  const p = _calwCalendars().find(c => c && c.primary);
  if (p && p.id) out.push(String(p.id).toLowerCase());
  return out;
}
/** Who would be emailed about this event, as one comparable string (the guests a Send / Don't send answer was about). */
function _calwGuestSig(ev) { return ev ? calwGuests(ev).map(g => String(g.email).toLowerCase()).sort().join(',') : ''; }

/* ---------- questions ---------- */
function calwCanEdit(x) {
  if (x && typeof x === 'object' && x.kind !== undefined && x.kind !== 'event') return { ok: false, code: 'NOT_EVENT', reason: 'Tasks and countdowns belong to the dashboard, not to Google Calendar.' };
  const ev = _calwEv(x);
  if (!ev) return { ok: false, code: 'NOT_EVENT', reason: 'Only Google Calendar events can be changed here.' };
  // (the banner's state too: _serverAvailable stays true after a server that was up goes away, 86-offline-banner.js)
  if ((typeof _serverAvailable !== 'undefined' && !_serverAvailable) || (typeof srvIsOffline === 'function' && srvIsOffline())) return { ok: false, code: 'SERVER_DOWN', reason: NET_DOWN_MESSAGE };
  const r = calwEditInfo(ev, _calwCalendars(), _calwOpt());
  if (!r.ok) return { ok: false, code: r.code, reason: r.reason };
  if (!_calwFake() && typeof CalStore !== 'undefined' && CalStore.access() === 'no') {
    return { ok: false, code: 'NOT_CONNECTED', reason: typeof gdConnMessage === 'function' ? gdConnMessage('calendar', 'Google Calendar') : 'Connect Google Calendar in Connections first.' };
  }
  return { ok: true, calendarId: r.calendarId };
}
function calwDefaultCalendarId() {
  const cals = _calwCalendars();
  const ok = (c) => c && !String(c.id).includes('/') && c.id !== 'google' && ['owner', 'writer'].includes(calwRole(c, _calwOpt()));
  const p = cals.find(c => c.primary);
  if (p) return p.id;
  const w = cals.find(ok);
  return w ? w.id : null;
}
function calwWritableCalendars() {
  return _calwCalendars().filter(c => c && !String(c.id).includes('/') && c.id !== 'google' && ['owner', 'writer'].includes(calwRole(c, _calwOpt())))
    .map(c => ({ id: c.id, name: (typeof calSettingsFor === 'function' && calSettingsFor(c.id).alias) || c.name || c.id, primary: !!c.primary }));
}

/* ---------- status: subscribers, pending, the chip ---------- */
function _calwNotify(o) { for (const fn of [..._calwSubs]) { try { fn(o); } catch (e) { console.error('[CalWrite]', e); } } }
function _calwMark(id, d, op) {
  const n = Math.max(0, (_calwPendingN.get(id) || 0) + d);
  if (n) _calwPendingN.set(id, n); else _calwPendingN.delete(id);
  if (d > 0 && n === 1) _calwNotify({ id, op, state: 'pending', pending: true });
}
function calwPending(id) { return !!(_calwPendingN.get(id) || _calwPendingN.get(calwRealId(id))); }
function _calwBusyCount() { let n = 0; for (const q of _calwQueues.values()) n += q.jobs.length + (q.busy ? 1 : 0); return n; }
function _calwChip(result) {
  if (!document.body) return;
  if (!_calwChipEl) {
    _calwChipEl = document.createElement('div');
    _calwChipEl.className = 'calw-chip'; _calwChipEl.id = 'calw-chip';
    _calwChipEl.setAttribute('role', 'status'); _calwChipEl.setAttribute('aria-live', 'polite');
    _calwChipEl.hidden = true;
    document.body.appendChild(_calwChipEl);
  }
  const el = _calwChipEl, n = _calwBusyCount();
  clearTimeout(_calwChipTimer);
  const set = (cls, ic, text) => {
    // Bottom-left of the page content (clear of the sidebar and of the toasts in the middle).
    const main = document.getElementById('main');
    const left = main ? main.getBoundingClientRect().left : 0;
    el.style.left = Math.round(Math.max(0, left) + 16) + 'px';
    el.className = 'calw-chip ' + cls + (_calwFake() ? ' is-fake' : '');
    el.innerHTML = (ic === 'spin' ? '<span class="spinner calw-spin" aria-hidden="true"></span>' : icon(ic)) + `<span>${esc(text)}</span>` + (_calwFake() ? '<em class="calw-fake">test connector</em>' : '');
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('in'));
  };
  if (n > 0) { set('is-saving', 'spin', n > 1 ? `Saving ${n} changes to Google…` : 'Saving to Google…'); return; }
  if (result === 'ok') {
    set('is-saved', 'cloud-check', 'Saved');
    _calwChipTimer = setTimeout(() => { el.classList.remove('in'); _calwChipTimer = setTimeout(() => { el.hidden = true; }, 200); }, 1400);
    return;
  }
  el.classList.remove('in'); el.hidden = true;
}

/* ---------- dialogs ---------- */
function _calwWhen(ev) {
  if (!ev || !ev.start) return '';
  try {
    if (ev.allDay || ev.start.date) return _calFmt(ev.start.date, { weekday: 'short', day: 'numeric', month: 'short' });
    const s = new Date(ev.start.dateTime);
    return s.toLocaleDateString(_CAL_LOCALE(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: Clock.zone() }) + ', ' + _calTime(s);
  } catch (e) { return ''; }
}
/** "This event / This and following events / All events" -> 'this' | 'all' | null (cancelled). */
function _calwAskScope(ev, op, o) {
  o = o || {};
  return new Promise((resolve) => {
    let answered = false, choice = 'this', closeDlg = null;
    const verb = op === 'remove' ? 'Delete' : op === 'rsvp' ? 'Reply to' : 'Change';
    const opts = [
      { id: 'this', label: 'This event' },
      { id: 'following', label: 'This and following events', disabled: true, hint: 'Not possible through the Google connector: use Google Calendar for this.' },
      { id: 'all', label: 'All events', disabled: !!o.allDisabled, hint: o.allDisabled || '' },
    ];
    if (op === 'rsvp') opts.splice(1, 1);
    closeDlg = openDialog({
      title: `${verb} recurring event`, width: 420, resizeKey: 'calw-scope',
      body: (el) => {
        el.classList.add('calw-dlg');
        const list = document.createElement('div'); list.className = 'calw-scope'; list.setAttribute('role', 'radiogroup');
        list.setAttribute('aria-label', `${verb} which events`);
        for (const x of opts) {
          const row = document.createElement('label'); row.className = 'calw-opt' + (x.disabled ? ' is-off' : '');
          const r = document.createElement('input'); r.type = 'radio'; r.name = 'calw-scope'; r.value = x.id; r.disabled = !!x.disabled; r.checked = x.id === 'this';
          if (x.id === 'this') r.setAttribute('autofocus', '');
          r.onchange = () => { if (r.checked) choice = x.id; };
          r.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); answered = true; resolve(choice); if (closeDlg) closeDlg(); } };
          const t = document.createElement('span'); t.className = 'calw-opt-l'; t.textContent = x.label;
          row.append(r, t);
          if (x.hint && x.disabled) { const h = document.createElement('span'); h.className = 'calw-opt-h'; h.textContent = x.hint; row.appendChild(h); row.title = x.hint; }
          list.appendChild(row);
        }
        el.appendChild(list);
      },
      actions: [
        'spacer',
        { label: 'Cancel', run: () => { answered = true; resolve(null); } },
        { label: 'OK', primary: true, run: () => { answered = true; resolve(choice); } },
      ],
      onClose: () => { if (!answered) resolve(null); },
    });
  });
}
/**
 * "Update N guests? Google will email them" -> 'all' | 'none' | null (cancelled).
 * kind: 'update' | 'remove' | 'invite' (new guests: `invitees` are the ones asked about).
 */
function _calwAskGuests(ev, kind, invitees) {
  const g = kind === 'invite' ? (invitees || []).map(x => ({ email: x.email, name: '' })) : calwGuests(ev);
  return new Promise((resolve) => {
    let answered = false;
    const n = g.length, who = `${n} guest${n === 1 ? '' : 's'}`;
    const title = kind === 'remove' ? `Cancel the event for ${who}?` : kind === 'invite' ? `Invite ${who}?` : `Update ${who}?`;
    const lead = kind === 'remove' ? 'Google will email them that it is cancelled, unless you choose not to send it.'
      : kind === 'invite' ? 'Google will email them an invitation, unless you choose not to send it.'
        : 'Google will email them the change, unless you choose not to send it.';
    openDialog({
      title, width: 440, resizeKey: 'calw-guests',
      body: (el) => {
        el.classList.add('calw-dlg');
        const p = document.createElement('p'); p.className = 'calw-lead';
        p.textContent = lead;
        el.appendChild(p);
        const ul = document.createElement('ul'); ul.className = 'calw-guests';
        for (const x of g.slice(0, 5)) {
          const li = document.createElement('li');
          const nm = document.createElement('span'); nm.className = 'calw-g-n'; nm.textContent = x.name || x.email;
          li.appendChild(nm);
          if (x.name) { const em = document.createElement('span'); em.className = 'calw-g-e'; em.textContent = x.email; li.appendChild(em); }
          ul.appendChild(li);
        }
        if (n > 5) { const li = document.createElement('li'); li.className = 'calw-g-more'; li.textContent = `and ${n - 5} more`; ul.appendChild(li); }
        el.appendChild(ul);
      },
      actions: [
        { label: 'Cancel', run: () => { answered = true; resolve(null); } },
        'spacer',
        { label: 'Don\'t send', run: () => { answered = true; resolve('none'); } },
        { label: kind === 'remove' ? 'Send cancellation' : kind === 'invite' ? 'Send invitations' : 'Send update', primary: true, icon: 'send', run: () => { answered = true; resolve('all'); } },
      ],
      onClose: () => { if (!answered) resolve(null); },
    });
  });
}

/* ---------- times ---------- */
function _calwTime(v, allDay) {
  if (v == null || v === '') return undefined;
  if (allDay) {
    if (v instanceof Date) return Clock.parts(v.getTime()).iso;
    if (typeof v === 'number') return Clock.parts(v).iso;
    return String(v).slice(0, 10);
  }
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'number') return new Date(v).toISOString();
  const s = String(v);
  const wall = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(s);
  if (wall) return new Date(Clock.at(wall[1], Number(wall[2]) * 60 + Number(wall[3])) + Number(wall[4] || 0) * 1000).toISOString();    // a wall time in the dashboard's zone
  return s;
}
function _calwPatchIn(p) {
  const out = {};
  if (!p || typeof p !== 'object') return out;
  for (const k of ['title', 'location', 'description', 'calendarId', 'colorId']) if (p[k] !== undefined) out[k] = p[k] == null ? '' : String(p[k]);
  if (p.addGuests !== undefined) { const g = calwGuestList(p.addGuests); if (g.length) out.addGuests = g; }
  if (p.removeGuests !== undefined) { const g = calwGuestList(p.removeGuests).map(x => x.email); if (g.length) out.removeGuests = g; }
  if (p.allDay !== undefined) out.allDay = !!p.allDay;
  const ad = p.allDay;
  if (p.start !== undefined) out.start = _calwTime(p.start, ad);
  if (p.end !== undefined) out.end = _calwTime(p.end, ad);
  return out;
}
function _calwTimesFor(ev, patch) { return calwPatchTimes(ev, patch); }

/* ---------- the queue ---------- */
function _calwEnqueue(job) {
  // A newer change to an event retires the toast of the older one: its Undo / Try again would undo or replay past it.
  if (!job.undo && _calwToastFor && calwRealId(_calwToastFor) === calwRealId(job.id)) {
    if (_calwToastClose) { try { _calwToastClose(); } catch (e) { /* gone */ } }
    _calwToastClose = null; _calwToastFor = null;
    _calwLastUndo = null;                 // (and z / Ctrl+Z: the same Undo)
  }
  const key = job.calendarId || 'primary';
  let q = _calwQueues.get(key);
  if (!q) { q = { busy: false, jobs: [] }; _calwQueues.set(key, q); }
  if (job.op === 'update') {
    // A quick second edit while the first still waits: one write, last wins.
    const prev = q.jobs.find(x => x.op === 'update' && x.id === job.id && x.scope === job.scope && x.sendUpdates === job.sendUpdates && !!x.undo === !!job.undo);
    if (prev) {
      prev.patch = calwMergePatch(prev.patch, job.patch);
      prev.kind = job.kind; prev.waiters.push(...job.waiters);
      _calwChip();
      return;
    }
  }
  q.jobs.push(job);
  _calwMark(job.id, 1, job.op);
  _calwChip();
  _calwPump(key);
}
async function _calwPump(key) {
  const q = _calwQueues.get(key);
  if (!q || q.busy) return;
  const job = q.jobs.shift();
  if (!job) { _calwQueues.delete(key); _calwIdle(); return; }
  q.busy = true;
  let res;
  try { res = await _calwRun(job); }
  catch (e) { res = _calwFailed(job, e); }
  q.busy = false;
  _calwMark(job.id, -1, job.op);
  // Told after the count dropped, so pending(id) already says what is left.
  const newId = job.op === 'create' && res && res.event ? res.event.id : undefined;
  _calwNotify(res && res.ok
    ? { id: job.id, op: job.op, state: 'saved', pending: calwPending(job.id), ...(newId ? { newId } : {}) }
    : { id: job.id, op: job.op, state: 'error', pending: calwPending(job.id), code: res && res.code, message: res && res.message });
  for (const w of job.waiters) { try { w(res); } catch (e) { console.error('[CalWrite]', e); } }
  _calwChip(res && res.ok ? 'ok' : null);
  _calwPump(key);
}
function _calwIdle() {
  if (_calwBusyCount() || !_calwReloadAfter) return;
  _calwReloadAfter = false;
  if (typeof CalStore !== 'undefined') CalStore.load(true);
}
async function _calwSend(method, url, body) {
  let r;
  try {
    r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({}, body, { client: _calwClientId })) });
  } catch (e) {
    const err = new Error(netErrorMessage(e)); err.code = netIsDown(e) ? 'SERVER_DOWN' : 'NETWORK'; throw err;
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) {
    const err = new Error(j.message || j.error || ('The change could not be saved (HTTP ' + r.status + ').'));
    err.code = j.code || 'HTTP_' + r.status; err.current = j.current || null; err.removed = j.removed || null;
    throw err;
  }
  return j;
}
async function _calwRun(job) {
  let res;
  const enc = (id) => '/api/calendar/events/' + encodeURIComponent(calwRealId(id));
  // An event made a moment ago: the calendar Google actually put it on.
  const cal = /^tmp-/.test(job.id) ? ((_calwGet(job.id) || {}).calendarId || job.calendarId) : job.calendarId;
  if (job.op === 'create') res = await _calwSend('POST', '/api/calendar/events', job.body);
  else if (job.op === 'update') {
    const cur = _calwGet(job.id);
    // An undo names the version its change made (job.expectedUpdated): a newer one, even after a refresh, refuses it.
    const exp = job.expectedUpdated || (cur && cur.updated);
    res = await _calwSend('PATCH', enc(job.id), { calendarId: cal, patch: job.patch, scope: job.scope, sendUpdates: job.sendUpdates, ...(exp && job.scope !== 'all' ? { expectedUpdated: exp } : {}) });
  } else if (job.op === 'remove') {
    const base = job.before.find(e => e.id === calwRealId(job.id));
    const exp = job.expectedUpdated || (base && base.updated);
    res = await _calwSend('DELETE', enc(job.id), { calendarId: cal, scope: job.scope, sendUpdates: job.sendUpdates, ...(exp && job.scope !== 'all' ? { expectedUpdated: exp } : {}) });
  } else if (job.op === 'rsvp') {
    res = await _calwSend('POST', enc(job.id) + '/rsvp', { calendarId: cal, response: job.response, scope: job.scope });
  }
  _calwApplied(job, res);
  return res;
}
/** Google said yes: its version replaces the optimistic one; edits still waiting go back on top. */
function _calwApplied(job, res) {
  if (job.op === 'create') {
    _calwDrop([job.id]);
    if (res.event) _calwTmp.set(job.id, res.event.id);
  }
  if (res.replaced) _calwTmp.set(res.replaced.from, res.replaced.to);
  if (res.removed && res.removed.length) _calwDrop(res.removed);
  const evs = res.events && res.events.length ? res.events : res.event ? [res.event] : [];
  for (const e of evs) _calwPut(e);
  const touched = new Set(evs.map(e => e.id));
  for (const q of _calwQueues.values()) {
    for (const w of q.jobs) {
      const rid = calwRealId(w.id);
      if (!touched.has(rid)) continue;
      const base = _calwGet(rid);
      if (!base) continue;
      w.before = w.before.map(b => (b.id === rid ? _calwClone(base) : b));
      if (w.op === 'update') _calwPut(calwApplyPatch(base, w.patch, { timeZone: Clock.zone() }));   // the event's own zone wins (calwApplyPatch)
    }
  }
  if (job.op === 'create' && res.refresh && typeof CalStore !== 'undefined') CalStore.update({ force: true });
  _calwRepaint();
  _calwSavedToast(job, res);
}
/** Google (or the server, or the network) said no: put things back and say why. */
function _calwFailed(job, e) {
  const code = (e && e.code) || 'FAILED';
  const message = netErrorMessage(e, 'The change could not be saved to Google Calendar.');
  // Edits still waiting on this event were built on top of this one: they go too.
  const rid = calwRealId(job.id);
  for (const q of _calwQueues.values()) {
    for (let i = q.jobs.length - 1; i >= 0; i--) {
      const w = q.jobs[i];
      if (calwRealId(w.id) !== rid) continue;
      q.jobs.splice(i, 1);
      _calwMark(w.id, -1, w.op);
      const r = { ok: false, code: 'CANCELLED', cancelled: true, message: 'An earlier change to this event was not saved.' };
      for (const fn of w.waiters) { try { fn(r); } catch (x) { console.error(x); } }
    }
  }
  if (job.op === 'create') _calwDrop([job.id]);
  for (const b of job.before) _calwPut(_calwClone(b));
  if (code === 'CONFLICT' && e.current && e.current.id) _calwPut(e.current);
  if (e.removed && e.removed.length) _calwDrop(e.removed);
  _calwRepaint();
  _calwErrorToast(job, code, message);
  return { ok: false, code, message };
}

/* ---------- toasts ---------- */
/** One calendar toast at a time, like Google's snackbar: a newer one replaces the older (and its Undo). */
let _calwToastClose = null, _calwToastFor = null, _calwLastUndo = null;
function _calwToast(msg, o, forId) {
  if (_calwToastClose) { try { _calwToastClose(); } catch (e) { /* gone */ } }
  _calwLastUndo = null;                   // a newer calendar message: z / Ctrl+Z no longer reach the older change
  const close = toast(msg, o);
  _calwToastClose = typeof close === 'function' ? close : null;
  _calwToastFor = forId || null;          // the event its Undo / Try again acts on
  return close;
}
function _calwWaitingFor(id) {
  const rid = calwRealId(id);
  for (const q of _calwQueues.values()) if (q.jobs.some(w => calwRealId(w.id) === rid)) return true;
  return false;
}
function _calwSavedToast(job, res) {
  if (_calwWaitingFor(job.id)) return;            // another change to it is on its way: that one reports
  if (job.silent) return;                         // the caller shows its own receipt with its own Undo (suggestions)
  if (job.undo) { _calwToast('Undone', { kind: 'ok', icon: 'undo-2' }); return; }
  let msg = 'Event saved';
  if (job.op === 'create') msg = 'Event created';
  else if (job.op === 'remove') msg = res.note || 'Event deleted';
  else if (job.op === 'rsvp') msg = { accepted: 'You said yes', declined: 'You said no', tentative: 'You said maybe' }[job.response] || 'Reply sent';
  else if (job.kind === 'move' && res.event) msg = 'Moved to ' + _calwWhen(res.event);
  const undo = res.undo;
  // The guests as they are after this change: the undo reuses this change's Send / Don't send only for them.
  // (a delete's undo re-creates the guests the delete asked about)
  const after = res.event || (undo && undo.args && undo.args.id ? _calwGet(undo.args.id) : null);
  const ctx = { guestSig: job.op === 'remove' ? (job.guestSig || '') : _calwGuestSig(after), sendUpdates: job.sendUpdates };
  const target = job.op === 'create' ? (res.event && res.event.id) : (undo && undo.args && undo.args.id) || job.id;
  const run = () => { _calwLastUndo = null; return _calwUndo(undo, ctx); };
  _calwToast(msg, { kind: 'ok', icon: 'calendar-check', ...(undo ? { action: { label: 'Undo', run } } : {}) }, target);
  if (undo) _calwLastUndo = { run, mark: _calwUndoMark() };
}
/** Where the app's own undo history stands (01-core-state.js): a task change made after a calendar change is undone first. */
function _calwUndoMark() {
  if (typeof _undoStack === 'undefined' || !Array.isArray(_undoStack)) return '';
  const top = _undoStack[_undoStack.length - 1];
  return _undoStack.length + '|' + (top ? String(top).length + String(top).slice(-64) : '');
}
/** z / Ctrl+Z on the calendar (45-calendar-grid-edit.js), as Google: undo the last calendar change while it is the newest thing to undo. */
function calwUndoLast() {
  const u = _calwLastUndo;
  if (!u || u.mark !== _calwUndoMark()) return false;
  if (_calwToastClose) { try { _calwToastClose(); } catch (e) { /* gone */ } _calwToastClose = null; }   // its Undo button must not run it twice
  u.run();
  return true;
}
function _calwErrorToast(job, code, message) {
  const act = calwErrorAction(code);
  let action = null;
  // Server down: the change went back, so keep the way to send it again once the server is up.
  if (code === 'SERVER_DOWN') action = { label: 'Try again', run: () => _calwRetry(job) };
  else if (act === 'connections') action = { label: 'Open Connections', run: () => (window.Connections && Connections.open ? Connections.open('calendar') : setView('connections')) };
  else if (act === 'update' && typeof CalStore !== 'undefined') action = { label: 'Update calendar', run: () => CalStore.update({ force: true }) };
  else if (act === 'google') {
    const ev = _calwGet(job.id);
    if (ev && ev.htmlLink && typeof safeUrl === 'function' && safeUrl(ev.htmlLink)) action = { label: 'Open in Google', run: () => window.open(ev.htmlLink, '_blank', 'noopener') };
  } else if (act === 'retry' || act === 'retry-fresh') action = { label: 'Try again', run: () => _calwRetry(job) };
  const text = code === 'CONFLICT' ? 'This event changed in Google Calendar since the last update, so your change was not saved. It now shows the latest version.' : message;
  _calwToast(text, { kind: 'err', timeout: code === 'SERVER_DOWN' ? 30000 : 9000, ...(action ? { action } : {}) }, job.op === 'create' ? null : job.id);
}
/**
 * Try again / Undo keep the series answer and the Send / Don't send answer of the
 * change they repeat or reverse, but only for the same guests: guestSig is who
 * that answer was about. If the event now has other guests (added in Google, or
 * since), the question is asked again; Cancel leaves everything as it is.
 */
function _calwRetry(job) {
  const o = { scope: job.scope, sendUpdates: job.sendUpdates, noDialogs: true, kind: job.kind, calendarId: job.calendarId, guestSig: job.guestSig };
  if (job.op === 'update') return calwUpdate(job.id, job.patch, o);
  if (job.op === 'remove') return calwRemove(job.id, o);
  if (job.op === 'rsvp') return calwRsvp(job.id, job.response, o);
  if (job.op === 'create') return calwCreate(job.body, { noDialogs: true });
  return null;
}
function _calwUndo(u, ctx) {
  const a = (u && u.args) || {};
  ctx = ctx || {};
  const o = { scope: a.scope || 'this', sendUpdates: a.sendUpdates || 'none', noDialogs: true, undo: true, calendarId: a.calendarId,
    guestSig: ctx.guestSig !== undefined ? ctx.guestSig : '', ...(a.expectedUpdated ? { expectedUpdated: a.expectedUpdated } : {}) };
  if (u.op === 'update') return calwUpdate(a.id, a.patch, o);
  if (u.op === 'remove') return calwRemove(a.id, o);
  if (u.op === 'rsvp') return calwRsvp(a.id, a.response, o);
  if (u.op === 'create') return calwCreate(a, { noDialogs: true, undo: true, guestSig: o.guestSig });
  return null;
}
/**
 * The Send / Don't send answer for a write, when no question is needed (no guests,
 * or a retry / undo whose guests are still the ones its answer was about); null =
 * ask. (Synchronous, so a write without a question is queued at once, as before.)
 */
function _calwGuestReuse(ev, kind, o) {
  if (!kind) return o.sendUpdates || 'none';
  if (!o.noDialogs) return null;
  if (o.guestSig === undefined || o.guestSig === _calwGuestSig(ev)) return o.sendUpdates || 'none';
  return null;
}

/* ---------- the writes ---------- */
const _calwRefused = (r) => Promise.resolve({ ok: false, code: r.code || 'READ_ONLY', message: r.reason || r.message || 'This event cannot be changed here.' });
function _calwPromise(job) { return new Promise((resolve) => { job.waiters = [resolve]; _calwEnqueue(job); }); }
/** Optimistic copies of the occurrences a change touches (all loaded ones for "All events"). */
function _calwTouch(ev, scope, fn) {
  const list = _calwList() || [];
  const sid = scope === 'all' ? calwSeriesId(ev) : null;
  const hit = sid ? list.filter(e => e.id === ev.id || calwSeriesId(e) === sid) : [ev];
  const before = hit.map(_calwClone);
  for (const e of hit) { const n = fn(e); if (n) _calwPut(n, e.id); else _calwDrop([e.id]); }
  return before;
}
function _calwRestore(before) { for (const b of before) _calwPut(_calwClone(b)); _calwRepaint(); }

async function calwUpdate(id, patchIn, o) {
  o = o || {};
  const ev = _calwEv(id);
  const can = calwCanEdit(ev || id);
  if (!can.ok) { if (!o.quiet) toast(can.reason, { kind: 'err', icon: 'lock' }); return _calwRefused(can); }
  const patch = _calwPatchIn(patchIn);
  if (!Object.keys(patch).length) return { ok: true, event: ev, unchanged: true };
  if (patch.description !== undefined) {
    const f = calwFieldEditable(ev, 'description');
    if (!f.ok) { toast(f.reason, { kind: 'err' }); return _calwRefused(f); }
  }
  if (patch.calendarId && patch.calendarId !== ev.calendarId) {
    const f = calwFieldEditable(ev, 'calendarId');
    if (!f.ok) { toast(f.reason, { kind: 'err' }); return _calwRefused(f); }
  }
  const tz = Clock.zone();   // only for an event without its own zone (calwApplyPatch keeps the event's)
  const t = _calwTimesFor(ev, patch);
  const from = { allDay: !!ev.allDay, start: ev.start.dateTime || ev.start.date, end: ev.end.dateTime || ev.end.date };
  // Show it at once; "All events" moves every loaded occurrence the same way.
  let before = _calwTouch(ev, 'this', (e) => calwApplyPatch(e, patch, { timeZone: tz }));
  _calwRepaint();
  let scope = o.scope || 'this';
  if (!o.noDialogs && calwIsRecurring(ev)) {
    const otherDay = t && (t.allDay ? t.start !== from.start.slice(0, 10) : Clock.parts(Date.parse(t.start)).iso !== Clock.parts(Date.parse(from.start)).iso);
    const why = !calwSeriesId(ev) ? 'Update the calendar first: this repeating event\'s series is not known yet.'
      : patch.calendarId ? 'A whole series cannot change calendar here.'
        : otherDay ? 'Moving every event of a series to another day is not possible through the Google connector.'
          : t && t.allDay !== from.allDay ? 'A whole series cannot switch between all-day and timed here.' : '';
    scope = await _calwAskScope(ev, 'update', { allDisabled: why });
    if (!scope) { _calwRestore(before); _calwNotify({ id: ev.id, op: 'update', state: 'cancelled', pending: calwPending(ev.id) }); return { ok: false, cancelled: true, code: 'CANCELLED', message: 'Cancelled' }; }
  }
  if (scope === 'all') {
    // Every other loaded occurrence: the same text, shifted like the one that moved.
    const sid = calwSeriesId(ev), text = {};
    for (const k of ['title', 'location', 'description']) if (patch[k] !== undefined) text[k] = patch[k];
    for (const e of (_calwList() || []).filter(x => x.id !== ev.id && calwSeriesId(x) === sid)) {
      before.push(_calwClone(e));
      let n = calwApplyPatch(e, text, { timeZone: tz });
      if (t) n = calwApplyPatch(n, calwShiftTimes(e, from, t), { timeZone: tz });
      _calwPut(n);
    }
    _calwRepaint();
  }
  // Guests: asked here; a retry / undo reuses its answer only while the guests are the same (_calwGuestReuse).
  const guestSig = _calwGuestSig(ev);
  const askKind = calwNeedsGuestPrompt(ev, 'update', patch);
  let sendUpdates = _calwGuestReuse(ev, askKind, o);
  if (sendUpdates === null) sendUpdates = await _calwAskGuests(ev, askKind, patch.addGuests);
  if (!sendUpdates) { _calwRestore(before); _calwNotify({ id: ev.id, op: 'update', state: 'cancelled', pending: calwPending(ev.id) }); return { ok: false, cancelled: true, code: 'CANCELLED', message: 'Cancelled' }; }
  return _calwPromise({ op: 'update', id: ev.id, calendarId: o.calendarId || can.calendarId || ev.calendarId, patch, scope, sendUpdates, before, kind: o.kind || 'edit', undo: !!o.undo, silent: !!o.silent,
    guestSig, ...(o.expectedUpdated ? { expectedUpdated: o.expectedUpdated } : {}) });
}
function calwMove(id, t, o) { t = t || {}; return calwUpdate(id, { start: t.start, end: t.end, ...(t.allDay !== undefined ? { allDay: t.allDay } : {}) }, Object.assign({ kind: 'move' }, o || {})); }
function calwResize(id, t, o) { t = t || {}; return calwUpdate(id, { end: t.end, ...(t.allDay !== undefined ? { allDay: t.allDay } : {}) }, Object.assign({ kind: 'resize' }, o || {})); }

async function calwRemove(id, o) {
  o = o || {};
  const ev = _calwEv(id);
  const can = calwCanEdit(ev || id);
  if (!can.ok) { if (!o.quiet) toast(can.reason, { kind: 'err', icon: 'lock' }); return _calwRefused(can); }
  let scope = o.scope || 'this';
  let before = _calwTouch(ev, 'this', () => null);
  _calwRepaint();
  if (!o.noDialogs && calwIsRecurring(ev)) {
    scope = await _calwAskScope(ev, 'remove', { allDisabled: calwSeriesId(ev) ? '' : 'Update the calendar first: this repeating event\'s series is not known yet.' });
    if (!scope) { _calwRestore(before); return { ok: false, cancelled: true, code: 'CANCELLED', message: 'Cancelled' }; }
  }
  if (scope === 'all') { before = before.concat(_calwTouch(ev, 'all', () => null).filter(b => b.id !== ev.id)); _calwRepaint(); }
  // (an undo of a delete re-creates the guests with this same choice)
  const guestSig = _calwGuestSig(ev);
  const askKind = calwNeedsGuestPrompt(ev, 'remove');
  let sendUpdates = _calwGuestReuse(ev, askKind, o);
  if (sendUpdates === null) sendUpdates = await _calwAskGuests(ev, askKind);
  if (!sendUpdates) { _calwRestore(before); return { ok: false, cancelled: true, code: 'CANCELLED', message: 'Cancelled' }; }
  return _calwPromise({ op: 'remove', id: ev.id, calendarId: o.calendarId || can.calendarId || ev.calendarId, scope, sendUpdates, before, kind: 'remove', undo: !!o.undo, silent: !!o.silent,
    guestSig, ...(o.expectedUpdated ? { expectedUpdated: o.expectedUpdated } : {}) });
}

async function calwRsvp(id, response, o) {
  o = o || {};
  const ev = _calwEv(id);
  const mine = _calwMine();
  const can = calwCanRsvp(ev || id, { mine });
  if (!can.ok) { if (!o.quiet) toast(can.reason, { kind: 'err' }); return _calwRefused(can); }
  if (!['accepted', 'declined', 'tentative'].includes(response)) return { ok: false, code: 'BAD_REQUEST', message: 'Reply yes, no or maybe.' };
  let scope = o.scope || 'this';
  if (!o.noDialogs && calwSeriesId(ev)) {
    scope = await _calwAskScope(ev, 'rsvp');
    if (!scope) return { ok: false, cancelled: true, code: 'CANCELLED', message: 'Cancelled' };
  }
  const before = _calwTouch(ev, scope, (e) => {
    const n = _calwClone(e); n.selfResponse = response;
    for (const a of n.attendees || []) if (a.self) a.response = response;
    return n;
  });
  _calwRepaint();
  // Answered through the user's own copy of the event (the server refuses any other calendar).
  const own = (Array.isArray(ev.calendars) && ev.calendars.length ? ev.calendars : [ev.calendarId]).find(c => mine.indexOf(String(c).toLowerCase()) >= 0);
  return _calwPromise({ op: 'rsvp', id: ev.id, calendarId: o.calendarId || own || ev.calendarId, response, scope, before, kind: 'rsvp', undo: !!o.undo });
}

async function calwCreate(input, o) {
  o = o || {};
  input = input || {};
  const allDay = !!input.allDay;
  const start = _calwTime(input.start, allDay), endIn = _calwTime(input.end, allDay);
  if (!start) return Promise.resolve({ ok: false, code: 'BAD_REQUEST', message: 'A new event needs a start.' });
  const primary = (_calwCalendars().find(c => c.primary) || {}).id || null;
  // Google's default is the primary calendar: name it only when the user picked one or it is known.
  const sendCal = input.calendarId || primary || null;
  const calId = sendCal || calwDefaultCalendarId();
  const tmp = 'tmp-' + Date.now().toString(36) + '-' + (++_calwSeq);
  const draft = { id: tmp, calendarId: calId || undefined, summary: String(input.title || '').trim() || '(No title)', status: 'confirmed', allDay,
    start: allDay ? { date: start } : { dateTime: start }, end: {}, organizer: calId ? { email: calId, self: true } : undefined };
  const t = calwPatchTimes(draft, { start, end: endIn, allDay });
  if (!t) return Promise.resolve({ ok: false, code: 'BAD_REQUEST', message: 'Those times are not valid.' });
  const guests = calwGuestList(input.attendees || input.guests);
  // A new event is made in the zone the user is in (travel spec 2.3, P6); an undone delete keeps its own.
  const newZone = (input.timeZone && Clock.valid(input.timeZone) && input.timeZone) || Clock.zone();
  const ev = calwApplyPatch(draft, { start: t.start, end: t.end, allDay, location: input.location || '', description: input.description || '',
    ...(input.colorId ? { colorId: String(input.colorId) } : {}), ...(guests.length ? { addGuests: guests } : {}) }, { timeZone: newZone });
  _calwPut(ev);
  _calwRepaint();
  // A new event with guests: Google asks whether to email them the invitation.
  let sendUpdates = input.sendUpdates || 'none';
  // (an undone delete re-invites with the delete's answer, unless these are not the guests it was about)
  const sameGuests = o.guestSig !== undefined && o.guestSig === guests.map(g => g.email).sort().join(',');
  if (guests.length && (!o.noDialogs || (o.guestSig !== undefined && !sameGuests))) {
    sendUpdates = await _calwAskGuests(ev, 'invite', guests);
    if (!sendUpdates) { _calwDrop([tmp]); _calwRepaint(); return { ok: false, cancelled: true, code: 'CANCELLED', message: 'Cancelled' }; }
  }
  const body = { title: ev.summary, start: t.start, end: t.end, allDay, timeZone: newZone, ...(sendCal ? { calendarId: sendCal } : {}),
    ...(input.location ? { location: String(input.location) } : {}), ...(input.description ? { description: String(input.description) } : {}),
    ...(input.colorId ? { colorId: String(input.colorId) } : {}),
    ...(guests.length ? { attendees: guests, sendUpdates } : {}),
    ...(Array.isArray(input.recurrence) && input.recurrence.length ? { recurrence: input.recurrence } : {}) };
  // Same queue key as the draft's calendar, so edits to it wait for the create.
  return _calwPromise({ op: 'create', id: tmp, calendarId: calId || 'primary', body, before: [], kind: 'create', undo: !!o.undo, silent: !!o.silent });
}

/* ---------- other tabs ---------- */
/** Live sync 'calendar' event (86-live-sync.js): another tab or tool changed Google Calendar. */
function calwOnRemote(d) {
  if (!d || d.client === _calwClientId || typeof CalStore === 'undefined' || !CalStore.st.loaded) return;
  if (_calwBusyCount()) { _calwReloadAfter = true; return; }
  CalStore.load(true);
}

/**
 * Options callers may pass: only `quiet` (no toast for a refusal). The ones that
 * skip the series / guest questions or pick the answer (noDialogs, sendUpdates,
 * scope, undo, guestSig, expectedUpdated, calendarId) are CalWrite's own, for
 * its Undo and Try again: no other code can write past the guest question.
 */
function _calwPublicOpt(o) {
  if (!o || typeof o !== 'object') return {};
  // silent: no "saved" toast (its Undo); the caller owns the receipt and the Undo. Errors still toast and resolve {ok:false}.
  return Object.assign({}, o.quiet ? { quiet: true } : {}, o.silent ? { silent: true } : {});
}
function _calwPublicInput(input) {
  if (!input || typeof input !== 'object') return input;
  const out = Object.assign({}, input);
  delete out.sendUpdates;                    // asked when there are guests
  return out;
}
window.CalWrite = {
  canEdit: (ev) => calwCanEdit(ev),
  guests: (ev) => calwGuests(_calwEv(ev) || ev),
  move: (id, t, o) => calwMove(id, t, _calwPublicOpt(o)),
  resize: (id, t, o) => calwResize(id, t, _calwPublicOpt(o)),
  update: (id, patch, o) => calwUpdate(id, patch, _calwPublicOpt(o)),
  create: (input, o) => calwCreate(_calwPublicInput(input), _calwPublicOpt(o)),
  remove: (id, o) => calwRemove(id, _calwPublicOpt(o)),
  rsvp: (id, response, o) => calwRsvp(id, response, _calwPublicOpt(o)),
  pending: (id) => calwPending(id),
  onChange: (fn) => { if (typeof fn !== 'function') return () => {}; _calwSubs.add(fn); return () => _calwSubs.delete(fn); },
  canRsvp: (ev) => calwCanRsvp(_calwEv(ev) || ev, { mine: _calwMine() }),
  fieldEditable: (ev, field) => calwFieldEditable(_calwEv(ev) || ev, field),
  defaultCalendarId: () => calwDefaultCalendarId(),
  writableCalendars: () => calwWritableCalendars(),
  realId: (id) => calwRealId(id),
  info: () => ({ fake: _calwFake(), clientId: _calwClientId }),
  /** Optional fields the connector can write: 'colorId' (Google's 11 event colours), 'guests' (addGuests / removeGuests; `guests` on create). */
  supports: (k) => k === 'colorId' || k === 'guests',
  /** z / Ctrl+Z: undo the last calendar change (the toast's Undo) if it is still the newest; -> true when it did. */
  undoLast: () => calwUndoLast(),
};

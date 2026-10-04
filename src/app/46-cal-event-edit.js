/* ============================================================
   EVENT EDITING IN THE CARD AND THE SIDE PANEL (owner: Calendar)
   ------------------------------------------------------------
   User request, 3 Oct: the calendar should feel like Google Calendar's when
   events are clicked and moved around. The user chose "Yes, confirm when
   others are invited": real Google events are edited in place and saved back.

   What this adds to the event card (61-task-card.js) and the calendar's side
   panel (43-calendar-panel.js), through calEventParts(ev, {where}) ->
   evcDecorate(out, ev, {where}) -> out.edit = {ok, reason, invitee, title,
   when, rsvp, location, desc, facts, guests[], ro, canDelete, colour}:
     title (inline), start / end date (the app's mini month) and time (a
     15-minute list with lengths, as Google's; typed times too), All day, the
     event's time zone when it is not yours, location (+ Maps), description
     (rendered; click to edit as plain text), calendar (move to another one you
     can write to), colour (Google's 11, or back to the calendar's) and
     guests (add / remove) when CalWrite says it can write them
     (CalWrite.supports('colorId' | 'guests'): patch colorId, addGuests
     [{email}], removeGuests [email]; create colorId, guests), Yes / No /
     Maybe for invitations, Delete (evcDelete).
   Each field saves when it is committed (blur, Enter, a pick) through
   window.CalWrite (44-calendar-write.js): it updates the page at once, asks
   before Google emails guests, asks which events of a series, shows "Saving
   to Google... Saved" with Undo and reverts on failure. Field rules are
   CalWrite's too (fieldEditable: a formatted description, the calendar of an
   event with guests or a series stay in Google; canRsvp). Without CalWrite,
   or for an event CalWrite.canEdit refuses (another person's calendar, a
   read-only calendar, an invitation you do not organise), everything shows
   read-only with the reason, quietly.
   Create mode: openEvent(null, {create:{start, end, allDay, calendarId,
   title}}) (the quick-create popover's "More options") -> evcOpenCreate:
   the card on a new event, saved with CalWrite.create.
   Pure rules: 46-cal-event-edit-logic.js (tests/cal-event-edit.test.mjs).
   Event text is untrusted: textContent / esc() everywhere.
   ============================================================ */

/* ---------- CalWrite (feature-detected: the page still works without it) ---------- */
function _evcCW() {
  const w = typeof window !== 'undefined' ? window.CalWrite : null;
  return w && typeof w.update === 'function' ? w : null;
}
/** Does the write path support an optional field ('colorId', 'guests')? Only when CalWrite says so. */
function _evcSupports(k) {
  const w = _evcCW();
  if (!w || typeof w.supports !== 'function') return false;
  try { return !!w.supports(k); } catch (e) { return false; }
}
/** Can the card change this event? {ok, reason, invitee} (CalWrite.canEdit decides: your calendars, the organiser's copy). */
function evcEditable(ev) {
  if (!ev) return { ok: false, reason: '' };
  const invitee = evcIsInvitee(ev);
  const w = _evcCW();
  if (!w || typeof w.canEdit !== 'function') return { ok: false, reason: '', invitee };   // no write path in this copy: read-only, as before
  let r = null;
  try { r = w.canEdit(ev) || null; } catch (e) { r = null; }
  if (!r || !r.ok) return { ok: false, reason: String((r && r.reason) || 'You can only view this calendar.'), invitee };
  return { ok: true, reason: '', invitee };
}
/** One field of an editable event (a formatted description, the calendar of an event with guests or a series stay in Google). */
function _evcFieldOk(ev, field) {
  const w = _evcCW();
  try {
    if (w && typeof w.fieldEditable === 'function') return w.fieldEditable(ev, field) || { ok: true };
    if (typeof calwFieldEditable === 'function') return calwFieldEditable(ev, field) || { ok: true };   // 44-calendar-write-logic.js
  } catch (e) { /* fall through */ }
  return { ok: true };
}
/** Can you answer this invitation from here? */
function _evcCanRsvp(ev) {
  const w = _evcCW();
  if (!w || typeof w.rsvp !== 'function') return false;
  try {
    if (typeof w.canRsvp === 'function') return !!(w.canRsvp(ev) || {}).ok;
    if (typeof calwCanRsvp === 'function') return !!(calwCanRsvp(ev) || {}).ok;
  } catch (e) { return false; }
  return evcIsInvitee(ev);
}
function _evcRawCals() { const d = typeof CalStore !== 'undefined' ? CalStore.data : null; return d && Array.isArray(d.calendars) ? d.calendars : []; }
/** Calendars you can write to, with the names and colours the dashboard shows. */
function _evcWritableCals() {
  const shown = new Map((typeof calCalendars === 'function' ? calCalendars() : []).map(c => [c.id, c]));
  const w = _evcCW();
  let list = null;
  try { list = w && typeof w.writableCalendars === 'function' ? w.writableCalendars() : null; } catch (e) { list = null; }
  if (!Array.isArray(list)) list = evcWritableCalendars(_evcRawCals());
  return list.map(r => {
    const c = shown.get(r.id) || {};
    return { id: r.id, name: c.name || r.name || r.id, color: c.color || r.color || 'blue', primary: !!r.primary };
  }).sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
}
function _evcDefaultCal() {
  const w = _evcCW();
  try { const id = w && typeof w.defaultCalendarId === 'function' ? w.defaultCalendarId() : null; if (id) return id; } catch (e) { /* below */ }
  const c = _evcWritableCals(); return c.length ? c[0].id : '';
}
function _evcCalOf(id) { return (typeof calCalendars === 'function' ? calCalendars() : []).find(c => c.id === id) || null; }

/* ---------- writing ---------- */
// "Saving to Google... Saved", Undo and the error toasts are CalWrite's (one
// status chip for the whole page); the card only follows ids and repaints.
const _evcLastTimes = new Map(); // event id -> times before All day was switched on
let _evcSubbed = false;
function _evcWatch() {
  if (_evcSubbed) return;
  const w = _evcCW();
  if (!w || typeof w.onChange !== 'function') return;
  _evcSubbed = true;
  // A new event's temporary id becomes its Google id: an open card follows it (before the repaint).
  try { w.onChange((o) => { if (o && o.id && o.newId && o.newId !== o.id) _evcIdMoved(o.id, o.newId); }); } catch (e) { _evcSubbed = false; }
}
/** Run one CalWrite call for `key` (an event id); repaint from the model when it did not go through. */
function _evcWrite(key, run) {
  const w = _evcCW();
  if (!w) return Promise.resolve(null);
  _evcWatch();
  let p;
  try { p = Promise.resolve(run(w)); } catch (e) { p = Promise.reject(e); }
  const done = (r) => {
    const good = !!r && r.ok !== false && !r.cancelled;
    if (good && r.event && r.event.id && r.event.id !== key && !/^new:/.test(key)) _evcIdMoved(key, r.event.id);
    // Cancelled (guest question, which events) or failed: the fields show what the calendar has again.
    if (!good && typeof render === 'function') render();
    return r;
  };
  return p.then(done, () => done(null));
}
/** The card's entry for an event whose id changed in CalWrite (a new event's 'tmp-' id, a calendar move). */
function evcFollowId(entry) {
  if (!entry || entry.kind !== 'event' || typeof calEventById !== 'function' || calEventById(entry.id)) return;
  const w = _evcCW();
  let to = null;
  try { to = w && typeof w.realId === 'function' ? w.realId(entry.id) : null; } catch (e) { to = null; }
  if (to && to !== entry.id && calEventById(to)) entry.id = to;
}
/** Save a patch (only the changed fields) to an event. */
function evcUpdate(ev, patch) {
  if (!ev || !patch || !Object.keys(patch).length) return Promise.resolve(null);
  return _evcWrite(ev.id, (w) => w.update(ev.id, patch));
}
/** An event that came back from Google with a new id (moved to another calendar): the open card and panel follow it. */
function _evcIdMoved(from, to) {
  if (typeof _tc !== 'undefined' && _tc) for (const e of _tc.stack) if (e.kind === 'event' && e.id === from) e.id = to;
  if (typeof _calOpenEventId !== 'undefined' && _calOpenEventId === from) _calOpenEventId = to;
}
/** Delete an event (a quiet confirm for a lone event; CalWrite asks about guests and series itself). */
async function evcDelete(ev) {
  const w = _evcCW();
  if (!ev || !w || typeof w.remove !== 'function') return;
  let guests = [];
  try { guests = typeof w.guests === 'function' ? (w.guests(ev) || []) : []; } catch (e) { guests = []; }
  if (!guests.length && !ev.recurring) {
    const ok = await confirmDialog({ title: 'Delete this event?', text: `“${String(ev.summary || 'This event')}” will be deleted from Google Calendar. You can undo it straight after.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
  }
  const id = ev.id;
  const r = await _evcWrite(id, (cw) => cw.remove(id));
  if (!r || r.ok === false || r.cancelled) return;
  // Gone: the card / panel showing it closes (it usually already has, as the page dropped the event at once).
  if (typeof _tc !== 'undefined' && _tc && !_tc.closing) {
    const cur = _tcCur();
    if (cur && cur.kind === 'event' && cur.id === id) { if (!tcBack()) tcClose(); }
  }
  if (typeof _calOpenEventId !== 'undefined' && _calOpenEventId === id) { _calOpenEventId = null; render(); }
}

/* ---------- small pieces ---------- */
function _evcEl(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
function _evcDateLabel(iso) {
  const other = iso.slice(0, 4) !== todayStr().slice(0, 4);
  return _calFmt(iso, other ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' });
}
function _evcLongDate(iso) { return _calFmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
/**
 * Commit a text field on Enter / blur; Esc puts the old text back. Blurs
 * caused by a repaint (the field already gone) never save.
 */
function _evcCommitOn(el, o) {
  let reverted = false;
  el.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && (o.single ? !e.shiftKey : (e.ctrlKey || e.metaKey))) {
      e.preventDefault(); e.stopPropagation();
      el.blur();
      const card = el.closest('.tc'); if (card) { try { card.focus({ preventScroll: true }); } catch (err) { /* gone */ } }   // keys keep working
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      el.value = o.original; reverted = true;
      if (o.input) o.input();
      el.blur();
      const card = el.closest('.tc'); if (card) { try { card.focus({ preventScroll: true }); } catch (err) { /* gone */ } }
    }
  });
  el.addEventListener('blur', (e) => {
    if (!el.isConnected) return;
    const was = reverted; reverted = false;
    if (!was && el.value !== o.original) {
      // The side panel repaints after the save: keep focus on where Tab was going (the card does this itself).
      const rt = e.relatedTarget;
      if (rt && rt.dataset && rt.dataset.fk && !el.closest('.tc') && typeof _keepFocus === 'function') _keepFocus(rt.dataset.fk);
      o.commit(el.value);
    }
    if (o.after) o.after(was);
  });
}
function _evcAutosize(ta, max) {
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(max || 9999, ta.scrollHeight) + 'px'; };
  ta.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return fit;
}

/* ---------- date and time pickers ---------- */
function _evcDateBtn(iso, o) {
  const b = _evcEl('button', 'evc-f evc-date' + (o.muted ? ' is-muted' : ''), _evcDateLabel(iso));
  b.type = 'button'; b.dataset.fk = o.fk;
  b.setAttribute('aria-label', `${o.label}: ${_evcLongDate(iso)}`); b.setAttribute('aria-haspopup', 'dialog');
  b.onclick = (e) => { e.stopPropagation(); _evcDatePop(b, { value: iso, title: o.label, onPick: o.onPick }); };
  return b;
}
/** The app's date picker (type a date, or the mini month). */
function _evcDatePop(anchor, o) {
  openPopover(anchor, (el, close) => {
    el.classList.add('due-pop', 'evc-datepop');
    const pick = (d) => { close(); try { anchor.focus({ preventScroll: true }); } catch (e) { /* gone */ } if (d && d !== o.value) o.onPick(d); };
    if (o.title) el.appendChild(_evcEl('div', 'pop-label', o.title));
    const box = _evcEl('label', 'input input-sm due-pop-in'); box.innerHTML = icon('calendar');
    const inp = document.createElement('input'); inp.placeholder = 'Type a date: fri, 15 oct'; inp.setAttribute('autofocus', ''); inp.setAttribute('aria-label', 'Type a date');
    const hint = _evcEl('span', 'due-pop-hint');
    box.append(inp, hint);
    el.appendChild(box);
    const parse = () => {
      const v = inp.value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      try { return typeof parseQuickAdd === 'function' ? (parseQuickAdd('x ' + v).dueDate || null) : null; } catch (e) { return null; }
    };
    inp.oninput = () => { const d = parse(); hint.textContent = d ? _evcDateLabel(d) : ''; };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const d = parse(); if (d) pick(d); } };
    const mm = document.createElement('div');
    buildMiniMonth(mm, { value: o.value, onPick: (d) => pick(d) });
    el.appendChild(mm);
  }, { width: 280, align: 'start' });
}
function _evcTimeBtn(hm, o) {
  const b = _evcEl('button', 'evc-f evc-time', _calTimeLabel(hm));
  b.type = 'button'; b.dataset.fk = o.fk;
  b.setAttribute('aria-label', `${o.label}: ${_calTimeLabel(hm)}`); b.setAttribute('aria-haspopup', 'listbox');
  b.onclick = (e) => { e.stopPropagation(); _evcTimePop(b, { value: hm, options: o.options(), label: o.label, onPick: o.onPick }); };
  return b;
}
/** Google's time list: 15-minute steps (end times with their length); type a time to jump or set it. */
function _evcTimePop(anchor, o) {
  openPopover(anchor, (el, close) => {
    el.classList.add('evc-timepop');
    const opts = o.options || [];
    const inp = document.createElement('input'); inp.className = 'control control-sm evc-tin'; inp.placeholder = 'Type a time'; inp.setAttribute('autofocus', '');
    inp.setAttribute('aria-label', o.label + ' (type a time)'); inp.autocomplete = 'off';
    const list = _evcEl('div', 'evc-tl'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', o.label);
    el.append(inp, list);
    let idx = opts.findIndex(x => x.hm === o.value);
    if (idx < 0) { const v = evcMin(o.value) || 0; idx = Math.max(0, opts.findIndex(x => x.min >= v)); }
    const pick = (hm, opt) => { close(); try { anchor.focus({ preventScroll: true }); } catch (e) { /* gone */ } if (hm !== o.value || (opt && opt.date)) o.onPick(hm, opt); };
    const rows = opts.map((x, i) => {
      const b = _evcEl('button', 'pop-item evc-ti'); b.type = 'button'; b.tabIndex = -1;
      b.setAttribute('role', 'option');
      b.innerHTML = `<span class="lbl">${esc(_calTimeLabel(x.hm))}</span>${x.dur ? `<span class="hint">${esc(x.dur)}</span>` : ''}`;
      b.onclick = () => pick(x.hm, x);
      b.onmousemove = () => mark(i, false);
      list.appendChild(b);
      return b;
    });
    const mark = (i, scroll) => {
      idx = Math.max(0, Math.min(rows.length - 1, i));
      rows.forEach((r, j) => { r.classList.toggle('on', j === idx); r.setAttribute('aria-selected', j === idx ? 'true' : 'false'); });
      const r = rows[idx];
      if (r && scroll) {
        if (scroll === 'center') list.scrollTop = Math.max(0, r.offsetTop - list.clientHeight / 2 + r.offsetHeight / 2);
        else if (r.offsetTop < list.scrollTop) list.scrollTop = r.offsetTop;
        else if (r.offsetTop + r.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = r.offsetTop + r.offsetHeight - list.clientHeight;
      }
    };
    inp.addEventListener('input', () => {
      const t = evcParseTime(inp.value);
      if (!t) return;
      const v = evcMin(t);
      const j = opts.findIndex(x => x.min >= v);
      if (j >= 0) mark(j, 'center');
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mark(idx + (e.key === 'ArrowDown' ? 1 : -1), true); }
      else if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); mark(idx + (e.key === 'PageDown' ? 8 : -8), true); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const typed = inp.value.trim() ? evcParseTime(inp.value) : null;
        if (typed) { const same = opts.find(x => x.hm === typed); pick(typed, same); }
        else if (!inp.value.trim() && opts[idx]) pick(opts[idx].hm, opts[idx]);
        else inp.classList.add('is-invalid');
      }
    });
    if (rows.length) requestAnimationFrame(() => mark(idx, 'center'));
  }, { width: 216, align: 'start' });
}
/**
 * The date/time row: [date] [start] – [end] [end date], then All day, the
 * time zone and how it repeats. onEdit(field, value) with the fields of
 * evcWhenEdit ('end' = {date, time} from the end list).
 */
function _evcWhenEditor(w, onEdit, o) {
  o = o || {};
  const pre = o.fk || 'evc';
  const box = _evcEl('div', 'evc-when');
  const r1 = _evcEl('div', 'evc-when-r');
  r1.appendChild(_evcDateBtn(w.startDate, { fk: pre + '-sd', label: w.allDay ? 'Start date' : 'Date', onPick: (v) => onEdit('startDate', v) }));
  if (!w.allDay) r1.appendChild(_evcTimeBtn(w.startTime, { fk: pre + '-st', label: 'Start time', options: () => evcTimeOptions({}), onPick: (hm) => onEdit('startTime', hm) }));
  const dash = _evcEl('span', 'evc-dash', '–'); dash.setAttribute('aria-hidden', 'true');
  r1.appendChild(dash);
  if (!w.allDay) {
    r1.appendChild(_evcTimeBtn(w.endTime, {
      fk: pre + '-et', label: 'End time', options: () => evcEndOptions(w),
      onPick: (hm, opt) => (opt && opt.date ? onEdit('end', { date: opt.date, time: hm }) : onEdit('endTime', hm)),
    }));
  }
  r1.appendChild(_evcDateBtn(w.endDate, { fk: pre + '-ed', label: 'End date', muted: !w.allDay && w.endDate === w.startDate, onPick: (v) => onEdit('endDate', v) }));
  box.appendChild(r1);
  const r2 = _evcEl('div', 'evc-when-r2');
  const ad = _evcEl('label', 'evc-allday');
  const sw = document.createElement('button'); sw.type = 'button'; sw.className = 'switch'; sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', w.allDay ? 'true' : 'false'); sw.dataset.fk = pre + '-allday';
  sw.onclick = (e) => { e.preventDefault(); onEdit('allDay', !w.allDay); };
  ad.append(sw, _evcEl('span', '', 'All day'));
  r2.appendChild(ad);
  for (const n of o.extra || []) if (n) r2.appendChild(n);
  box.appendChild(r2);
  return box;
}
/** The event's own time zone, when it is not the one the page shows times in. */
function _evcZoneBit(ev) {
  if (!ev || ev.allDay) return null;
  const raw = _evcRawCals().find(c => c.id === ev.calendarId);
  const ez = (ev.start && ev.start.timeZone) || ev.timeZone || (raw && raw.timeZone) || '';
  // The zone the page shows times in (Clock, travel spec 2.7 P7); while away, also home.
  const vz = Clock.zone();
  const z = evcZoneNote(Clock.canon(ez) || ez, vz);
  const home = Clock.home();
  const awayHome = home !== vz && Clock.canon(z) !== home ? home : '';
  if (!z && !awayHome) return null;
  const span = (zone) => `${Clock.fmtTime(calEventStart(ev).getTime(), { zone })}–${Clock.fmtTime(calEventEnd(ev).getTime(), { zone })}`;
  const frag = document.createDocumentFragment();
  if (z) {
    const b = _evcEl('span', 'evc-bit evc-zone');
    b.innerHTML = icon('globe', 'i-xs') + '<span></span>';
    b.querySelector('span').textContent = `${Clock.label(z)} · ${span(z)} there`;
    b.title = `Set in ${Clock.label(z)} time. Times here are in yours (${Clock.label(vz)}).`;
    frag.appendChild(b);
  }
  if (awayHome) {
    const h = _evcEl('span', 'evc-bit evc-zone evc-home');
    h.innerHTML = icon('house', 'i-xs') + '<span></span>';
    h.querySelector('span').textContent = `${span(awayHome)} ${Clock.label(awayHome)}, home`;
    h.title = `Home time (${Clock.label(awayHome)}). Times here are in yours (${Clock.label(vz)}).`;
    frag.appendChild(h);
  }
  return frag;
}
function _evcRepeatBit(ev) {
  if (!ev || !ev.recurring) return null;
  const info = typeof calRepeatInfo === 'function' ? calRepeatInfo(ev) : null;
  const b = _evcEl('span', 'evc-bit');
  b.innerHTML = icon('repeat', 'i-xs') + '<span></span>';
  b.querySelector('span').textContent = (info && info.label) || 'Repeating event';
  return b;
}
function _evcLiveBit(live) {
  if (!live) return null;
  const b = _evcEl('b', 'ev-live' + (live === 'Now' ? ' now' : ''), live);
  return b;
}

/* ---------- the parts ---------- */
function _evcTitle(ev, ed, where) {
  if (!ed.ok) {
    const h = _evcEl(where === 'card' ? 'h2' : 'div', where === 'card' ? 'tc-evtitle' : 'ev-title', String(ev.summary || '(no title)'));
    if (where === 'card') h.id = 'tc-title';
    return h;
  }
  const orig = String(ev.summary || '');
  const ta = document.createElement('textarea'); ta.rows = 1;
  ta.className = (where === 'card' ? 'tc-title ' : '') + 'evc-title';
  if (where === 'card') ta.id = 'tc-title';
  ta.dataset.fk = 'evc-title'; ta.maxLength = 300; ta.spellcheck = true;
  ta.placeholder = 'Add title'; ta.setAttribute('aria-label', 'Event title');
  ta.value = orig;
  const fit = _evcAutosize(ta);
  _evcCommitOn(ta, {
    single: true, original: orig, input: fit,
    commit: (v) => {
      const t = v.replace(/\s+/g, ' ').trim();
      if (!t) { ta.value = orig; fit(); return; }
      evcUpdate(ev, evcPatchDiff({ title: orig }, { title: t }));
    },
  });
  return ta;
}
function _evcWhen(ev, ed, where, live) {
  // Travel (69-travel-ui.js): "your time (Tokyo)" while away and the other people's time (spec 5.2).
  const extra = [_evcZoneBit(ev), typeof trEvcZoneExtras === 'function' ? trEvcZoneExtras(ev) : null, _evcRepeatBit(ev), _evcLiveBit(live)];
  // Opened by a suggestion with a better time (cal.moveOpen): the editor at that time, saved only with Save.
  const prop = typeof trEvcProposal === 'function' ? trEvcProposal(ev, ed, where, extra) : null;
  if (prop) return prop;
  if (!ed.ok) {
    const box = _evcEl('div', where === 'card' ? 'tc-sub tc-when evc-when-ro' : 'ev-when evc-when-ro');
    const b = _evcEl('span', 'tc-bit');
    b.innerHTML = icon('clock', 'i-xs') + '<span></span>';
    b.querySelector('span').textContent = _calWhenText(ev);
    box.appendChild(b);
    for (const n of extra) if (n) box.appendChild(n);
    return box;
  }
  const w = evcWhenOf(ev);
  if (w.allDay && _evcLastTimes.has(ev.id)) w.lastTimes = _evcLastTimes.get(ev.id);
  const onEdit = (field, value) => {
    const n = evcWhenEdit(w, field, value);
    if (field === 'allDay' && value && n.lastTimes) _evcLastTimes.set(ev.id, n.lastTimes);
    evcUpdate(ev, evcPatchDiff({ when: w }, { when: n }));
  };
  return _evcWhenEditor(w, onEdit, { fk: 'evc', extra });
}
/** Yes / No / Maybe for an invitation (also when the event itself is read-only). */
function _evcRsvp(ev) {
  if (!evcIsInvitee(ev)) return null;
  const can = _evcCanRsvp(ev);
  const cur = ev.selfResponse || 'needsAction';
  const box = _evcEl('div', 'evc-rsvp');
  box.appendChild(_evcEl('span', 'evc-rsvp-q', cur === 'needsAction' ? 'Going?' : 'Your answer'));
  const seg = _evcEl('div', 'seg evc-rsvp-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Your answer');
  for (const [k, label, ic] of [['accepted', 'Yes', 'check'], ['declined', 'No', 'x'], ['tentative', 'Maybe', 'circle-help']]) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.fk = 'evc-rsvp-' + k; b.dataset.r = k;
    b.className = cur === k ? 'on' : '';
    b.setAttribute('aria-pressed', cur === k ? 'true' : 'false');
    b.innerHTML = icon(ic, 'i-xs') + `<span>${esc(label)}</span>`;
    if (!can) { b.disabled = true; b.title = 'Answer in Google Calendar'; }
    b.onclick = () => { if (cur !== k) _evcWrite(ev.id, (cw) => cw.rsvp(ev.id, k)); };
    seg.appendChild(b);
  }
  box.appendChild(seg);
  return box;
}
function _evcLocation(ev, ed) {
  const loc = String(ev.location || '');
  if (!ed.ok && !loc) return null;
  const row = _evcEl('div', 'evc-row evc-loc');
  row.innerHTML = icon('map-pin', 'i-sm evc-ic');
  if (ed.ok) {
    const inp = document.createElement('input'); inp.className = 'evc-in'; inp.dataset.fk = 'evc-loc'; inp.maxLength = 300;
    inp.placeholder = 'Add location'; inp.setAttribute('aria-label', 'Location'); inp.value = loc; inp.autocomplete = 'off';
    _evcCommitOn(inp, { single: true, original: loc, commit: (v) => evcUpdate(ev, evcPatchDiff({ location: loc }, { location: v })) });
    row.appendChild(inp);
  } else {
    const t = _evcEl('span', 'evc-loc-t', loc); t.title = loc;
    row.appendChild(t);
  }
  const url = safeUrl(evcMapsUrl(loc));
  if (loc && url) {
    const a = document.createElement('a'); a.className = 'btn btn-icon btn-ghost btn-sm evc-maps'; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.innerHTML = icon('map'); a.setAttribute('aria-label', 'Open in Maps'); a.setAttribute('data-tip', 'Open in Maps');
    row.appendChild(a);
  }
  return row;
}
let _evcDescEditing = null;   // the event whose description is open for typing
function _evcDesc(ev, ed, where) {
  const desc = String(ev.description || '');
  const field = ed.ok ? _evcFieldOk(ev, 'description') : { ok: false };
  const trunc = evcDescTruncated(desc) || !field.ok;
  const can = ed.ok && !trunc;
  if (!desc && !can) return null;
  const sec = _evcEl('div', 'evc-desc');
  sec.appendChild(_evcEl('div', 'ev-sec', 'Description'));
  const swap = () => { const fresh = _evcDesc(calEventById(ev.id) || ev, ed, where); if (fresh && sec.isConnected) sec.replaceWith(fresh); return fresh; };
  if (can && _evcDescEditing === ev.id) {
    const ta = document.createElement('textarea'); ta.className = 'evc-desc-in'; ta.dataset.fk = 'evc-desc'; ta.rows = 4;
    ta.placeholder = 'Add a description'; ta.setAttribute('aria-label', 'Description'); ta.value = desc;
    const fit = _evcAutosize(ta, where === 'card' ? 520 : 320);
    _evcCommitOn(ta, {
      single: false, original: desc, input: fit,
      commit: (v) => evcUpdate(ev, evcPatchDiff({ description: desc }, { description: v })),
      after: () => { if (_evcDescEditing === ev.id) _evcDescEditing = null; setTimeout(swap, 0); },
    });
    sec.appendChild(ta);
    sec.appendChild(_evcEl('p', 'evc-note', 'Plain text. Ctrl+Enter or click away to save, Esc to cancel.'));
    return sec;
  }
  const body = _evcEl('div', 'md evc-desc-b' + (desc ? '' : ' is-empty'));
  if (desc) body.innerHTML = renderMarkdown(desc); else body.textContent = 'Add a description';
  if (can) {
    body.classList.add('is-editable'); body.tabIndex = 0; body.dataset.fk = 'evc-desc-view';
    body.setAttribute('aria-label', desc ? 'Description. Press Enter to edit' : 'Add a description');
    const open = () => {
      _evcDescEditing = ev.id;
      const fresh = swap();
      const ta = fresh && fresh.querySelector('textarea');
      if (ta) { ta.focus({ preventScroll: true }); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { /* fine */ } }
    };
    body.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      const sel = window.getSelection ? String(window.getSelection()) : '';
      if (sel) return;   // selecting text to copy it is not a click to edit
      open();
    });
    body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === body) { e.preventDefault(); open(); } });
  }
  sec.appendChild(body);
  if (trunc && ed.ok) sec.appendChild(_evcEl('p', 'evc-note', field.ok ? 'Only the start of this description is loaded, so it is edited in Google Calendar.' : String(field.reason || 'Edit this description in Google Calendar.')));
  return sec;
}
function _evcDotHtml(sw) { return `<span class="evc-dot c-${escAttr(/^[a-z]+$/.test(sw || '') ? sw : 'blue')}" aria-hidden="true"></span>`; }
/** Calendar, colour, free/busy: the details column. */
function _evcFacts(ev, ed) {
  const dl = _evcEl('dl', 'ev-dl evc-dl');
  const row = (ic, label, node) => {
    const dt = document.createElement('dt'); dt.innerHTML = icon(ic, 'i-xs') + `<span>${esc(label)}</span>`;
    const dd = document.createElement('dd'); dd.appendChild(node);
    dl.append(dt, dd);
  };
  // Calendar (move to another one you can write to)
  const cal = calEventCalendar(ev);
  const calField = ed.ok ? _evcFieldOk(ev, 'calendarId') : { ok: false };
  const cals = ed.ok && calField.ok ? _evcWritableCals() : [];
  const calHtml = (c) => `${_evcDotHtml(c ? c.color : 'blue')}<span class="truncate">${esc(c ? c.name : 'Calendar')}</span>`;
  if (cals.length > 1) {
    const b = _evcEl('button', 'evc-pick'); b.type = 'button'; b.dataset.fk = 'evc-cal';
    b.innerHTML = calHtml(cal) + icon('chevrons-up-down', 'i-xs evc-chev');
    b.setAttribute('aria-label', 'Calendar: ' + (cal ? cal.name : '') + '. Change');
    b.onclick = () => openMenu(b, cals.map(c => ({
      label: c.name, icon: _evcDotHtml(c.color), checked: c.id === ev.calendarId,
      run: () => { if (c.id !== ev.calendarId) evcUpdate(ev, { calendarId: c.id }); },
    })), { align: 'start', width: 260 });
    row('calendar', 'Calendar', b);
  } else if (cal) {
    const s = _evcEl('span', 'evc-val'); s.innerHTML = calHtml(cal) + (ev.calendars && ev.calendars.length > 1 ? `<span class="subtle">+${ev.calendars.length - 1}</span>` : '');
    if (ed.ok && !calField.ok && calField.reason) s.title = String(calField.reason);
    row('calendar', 'Calendar', s);
  }
  // Colour (Google's 11 event colours), when the write path supports it
  const col = evcColor(ev.colorId);
  if (ed.ok && _evcSupports('colorId')) {
    const b = _evcEl('button', 'evc-pick'); b.type = 'button'; b.dataset.fk = 'evc-colour';
    b.innerHTML = (col ? `<span class="evc-dot gc-${escAttr(col.id)}" aria-hidden="true"></span>` : _evcDotHtml(cal ? cal.color : 'blue')) + `<span class="truncate">${esc(col ? col.name : 'Calendar colour')}</span>` + icon('chevrons-up-down', 'i-xs evc-chev');
    b.setAttribute('aria-label', 'Colour: ' + (col ? col.name : 'calendar colour') + '. Change');
    b.onclick = () => _evcColourPop(b, ev, null, _evcCalSwatch(ev));
    row('palette', 'Colour', b);
  } else if (col) {
    const s = _evcEl('span', 'evc-val'); s.innerHTML = `<span class="evc-dot gc-${escAttr(col.id)}" aria-hidden="true"></span><span>${esc(col.name)}</span>`;
    row('palette', 'Colour', s);
  }
  if (ev.free) row('coffee', 'Shows as', _evcEl('span', 'evc-val', 'Free'));
  if (ev.status === 'tentative') row('circle-help', 'Status', _evcEl('span', 'evc-val', 'Tentative'));
  if (!ev.location && ev.conferenceUrl) row('video', 'Where', _evcEl('span', 'evc-val', String(ev.conferenceName || 'Video call')));
  return dl.children.length ? dl : null;
}
/** Google's event colours, plus the calendar's own (colorId '' puts it back). calSw: that calendar's swatch. */
function _evcColourPop(anchor, ev, onPick, calSw) {
  openPopover(anchor, (el, close) => {
    el.classList.add('evc-colpop');
    el.appendChild(_evcEl('div', 'pop-label', 'Event colour'));
    const grid = _evcEl('div', 'evc-colgrid'); grid.setAttribute('role', 'radiogroup'); grid.setAttribute('aria-label', 'Event colour');
    const now = String(ev.colorId || '');
    const opts = [{ id: '', name: 'Calendar colour', sw: /^[a-z]+$/.test(calSw || '') ? calSw : 'blue' }, ...EVC_COLORS];
    for (const c of opts) {
      const b = _evcEl('button', 'evc-col' + (c.id ? ' gc-' + c.id : ' evc-col-cal')); b.type = 'button';
      if (!c.id) b.style.setProperty('--c', `var(--sw-${c.sw})`);
      const on = now === c.id;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.setAttribute('aria-label', c.name); b.setAttribute('data-tip', c.name);
      if (on) b.innerHTML = icon('check');
      b.onclick = () => { close(); try { anchor.focus({ preventScroll: true }); } catch (e) { /* gone */ } if (!on) (onPick ? onPick(c.id) : evcUpdate(ev, { colorId: c.id })); };
      grid.appendChild(b);
    }
    el.appendChild(grid);
  }, { width: 236, align: 'start' });
}
/** The swatch of an event's calendar (what "Calendar colour" means for it). */
function _evcCalSwatch(ev) { const c = typeof calEventCalendar === 'function' ? calEventCalendar(ev) : null; return c && c.color ? c.color : 'blue'; }
const _EVC_RS = { accepted: ['yes', 'Going'], declined: ['no', 'Declined'], tentative: ['maybe', 'Maybe'], needsAction: ['wait', 'Awaiting'] };
/** Guests with their answers (organiser first); add / remove when supported. -> [nodes] */
function _evcGuests(ev, ed) {
  const att = (ev.attendees || []).slice();
  const canGuests = ed.ok && _evcSupports('guests');
  if (!att.length && !ed.ok) return [];
  att.sort((a, b) => (b.organizer ? 1 : 0) - (a.organizer ? 1 : 0) || (a.self ? 1 : 0) - (b.self ? 1 : 0));
  const out = [];
  const head = _evcEl('div', 'ev-sec evc-ghead');
  head.innerHTML = `Guests <span>${att.length ? esc(att.length) : ''}</span>`;
  out.push(head);
  const sum = evcGuestSummary(att);
  if (att.length) out.push(_evcEl('div', 'evc-gsum', sum.text));
  if (att.length) {
    const list = _evcEl('div', 'ev-people evc-guests');
    const MAX = 8;
    att.forEach((a, i) => {
      const row = _evcGuestRow(ev, a, canGuests);
      if (i >= MAX) { row.classList.add('is-more'); row.hidden = true; }
      list.appendChild(row);
    });
    if (att.length > MAX) {
      const more = _evcEl('button', 'ev-more link-btn', `Show ${att.length - MAX} more`); more.type = 'button';
      more.onclick = () => { list.querySelectorAll('.is-more').forEach(r => { r.hidden = false; }); more.remove(); };
      list.appendChild(more);
    }
    out.push(list);
  }
  if (canGuests) out.push(_evcGuestAdd(ev));
  else if (ed.ok) out.push(_evcEl('p', 'evc-note', att.length ? 'Add or remove guests in Google Calendar.' : 'No guests. Invite people from Google Calendar.'));
  return out;
}
function _evcGuestRow(ev, a, canGuests) {
  const p = a.self ? null : calPersonFor(a);
  const row = _evcEl('div', 'ev-person evc-guest');
  const name = a.self ? 'You' : (p ? p.name : (a.name || a.email));
  const sub = [];
  if (a.self) sub.push(typeof userName === 'function' ? userName() : '');
  else if (p) sub.push(p.role || p.org || a.email || '');
  else if (a.name && a.email) sub.push(a.email);
  if (a.organizer) sub.push('organiser');
  if (a.optional) sub.push('optional');
  const rs = _EVC_RS[a.response] || _EVC_RS.needsAction;
  const me = a.self && Array.isArray(state.people) ? state.people.find(x => x && x.self) : null;
  const av = p && typeof avatarHtml === 'function' ? avatarHtml(p, 24)
    : me && typeof avatarHtml === 'function' ? avatarHtml(me, 24)
    : `<span class="avatar avatar-24" style="--c:var(--sw-${a.self ? 'indigo' : 'slate'})">${esc(a.self ? String((typeof userName === 'function' ? userName() : '') || 'You').trim().charAt(0).toUpperCase() : avatarInitials(a.name || a.email))}</span>`;
  const glyph = rs[0] === 'yes' ? icon('check') : rs[0] === 'no' ? icon('x') : rs[0] === 'maybe' ? '<b>?</b>' : '';
  row.innerHTML = `<span class="evc-av">${av}<span class="evc-rs ${rs[0]}" title="${escAttr(rs[1])}">${glyph}</span></span><div class="ev-pn"><b></b><span class="ev-ps"></span></div>`;
  row.querySelector('.ev-pn b').textContent = name;
  row.querySelector('.ev-ps').textContent = sub.filter(Boolean).join(' · ');
  row.setAttribute('aria-label', `${name}: ${rs[1]}`);
  if (p) {
    row.classList.add('linked'); row.tabIndex = 0; row.setAttribute('role', 'button');
    row.title = 'Open ' + p.name;
    row.onclick = () => openPerson(p.id, { from: row });   // inside the card: on top, with Back
    row.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); row.click(); } };
  } else if (!a.self && a.email && typeof calAddAttendee === 'function') {
    const add = _evcEl('button', 'btn btn-icon btn-ghost btn-sm ev-addp'); add.type = 'button';
    add.setAttribute('data-tip', 'Add to People'); add.setAttribute('aria-label', 'Add ' + (a.name || a.email) + ' to People');
    add.innerHTML = icon('user-plus');
    add.onclick = (e) => { e.stopPropagation(); calAddAttendee(a); };
    row.appendChild(add);
  }
  if (canGuests && !a.self && !a.organizer && a.email) {
    const x = _evcEl('button', 'btn btn-icon btn-ghost btn-sm evc-gx'); x.type = 'button';
    x.setAttribute('data-tip', 'Remove guest'); x.setAttribute('aria-label', 'Remove ' + (a.name || a.email));
    x.innerHTML = icon('x');
    x.onclick = (e) => { e.stopPropagation(); evcUpdate(ev, { removeGuests: [String(a.email).toLowerCase()] }); };
    row.appendChild(x);
  }
  return row;
}
/** "Add guests": addresses, or a name from People with an address. */
function _evcGuestAdd(ev, onAdd) {
  const row = _evcEl('div', 'evc-row evc-gadd');
  row.innerHTML = icon('user-plus', 'i-sm evc-ic');
  const inp = document.createElement('input'); inp.className = 'evc-in'; inp.dataset.fk = 'evc-gadd'; inp.autocomplete = 'off';
  inp.placeholder = 'Add guests'; inp.setAttribute('aria-label', 'Add guests (email addresses)');
  const listId = 'evc-people-' + Math.random().toString(36).slice(2, 8);
  const dl = document.createElement('datalist'); dl.id = listId;
  for (const p of (state.people || [])) {
    if (!p || p.self) continue;
    const em = p.email || (Array.isArray(p.emails) && p.emails[0]);
    if (!em) continue;
    const op = document.createElement('option'); op.value = em; op.label = p.name || em; dl.appendChild(op);
    if (dl.children.length >= 300) break;
  }
  inp.setAttribute('list', listId);
  const have = new Set(evcGuestEmails(ev && ev.attendees));
  const go = () => {
    const emails = evcParseGuests(inp.value).filter(e => !have.has(e));
    if (!inp.value.trim()) return;
    if (!emails.length) { inp.classList.add('is-invalid'); return; }
    inp.value = ''; inp.classList.remove('is-invalid');
    if (onAdd) onAdd(emails); else evcUpdate(ev, { addGuests: emails.map(email => ({ email })) });
  };
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') { if (inp.value.trim()) { e.preventDefault(); e.stopPropagation(); go(); } }
    if (e.key === 'Escape' && inp.value) { e.preventDefault(); e.stopPropagation(); inp.value = ''; inp.classList.remove('is-invalid'); }
  });
  inp.addEventListener('input', () => inp.classList.remove('is-invalid'));
  inp.addEventListener('change', () => { if (evcParseGuests(inp.value).length) go(); });
  row.append(inp, dl);
  return row;
}
function _evcRoNote(ed) {
  if (ed.ok || !ed.reason) return null;
  const p = _evcEl('p', 'evc-ro');
  p.innerHTML = icon('lock', 'i-xs') + '<span></span>';
  p.querySelector('span').textContent = ed.reason;
  return p;
}

/**
 * calEventParts' hook (43-calendar-panel.js): the editable (or read-only)
 * versions of the parts, in out.edit. o.where: 'card' | 'panel'.
 */
function evcDecorate(out, ev, o) {
  o = o || {};
  const where = o.where === 'card' ? 'card' : 'panel';
  const ed = evcEditable(ev);
  _evcWatch();
  if (_evcDescEditing && _evcDescEditing !== ev.id) _evcDescEditing = null;
  out.edit = {
    ok: ed.ok, reason: ed.reason, invitee: !!ed.invitee,
    title: _evcTitle(ev, ed, where),
    when: _evcWhen(ev, ed, where, out.live),
    rsvp: _evcRsvp(ev),
    location: _evcLocation(ev, ed),
    desc: _evcDesc(ev, ed, where),
    facts: _evcFacts(ev, ed),
    guests: _evcGuests(ev, ed),
    ro: _evcRoNote(ed),
    canDelete: ed.ok && typeof (_evcCW() || {}).remove === 'function',
    colour: ed.ok && _evcSupports('colorId') ? (anchor) => _evcColourPop(anchor, ev, null, _evcCalSwatch(ev)) : null,
  };
  return out;
}
/** Keys on the event card: E edits the title, Delete / Backspace deletes (as in Google Calendar). */
function evcCardKey(k, cur) {
  const ev = cur && cur.kind === 'event' && typeof calEventById === 'function' ? calEventById(cur.id) : null;
  if (!ev || !evcEditable(ev).ok) return false;
  if (k === 'e') { const t = _tc && _tc.card.querySelector('[data-fk="evc-title"]'); if (t) { t.focus(); t.select(); } return true; }
  if (k === 'Delete' || k === 'Backspace') { evcDelete(ev); return true; }
  return false;
}

/* ---------- create mode: a new Google event in the card ---------- */
/** openEvent(null, {create}) lands here: the card on a new event, prefilled. */
function evcOpenCreate(prefill, o) {
  o = o || {};
  const draft = evcDraftFrom(prefill || {}, {});
  // A suggestion's prefill (68-suggest-actions.js): the task the block is for and who made it; Save links it back.
  if (prefill && (prefill.relatedTaskId || prefill.origin)) draft.link = { taskId: String(prefill.relatedTaskId || ''), origin: prefill.origin || null, key: String(prefill.suggestKey || '') };
  const cals = _evcWritableCals();
  if (!draft.calendarId || (cals.length && !cals.some(c => c.id === draft.calendarId))) draft.calendarId = _evcDefaultCal() || draft.calendarId;
  if (typeof _calOpenEventId !== 'undefined' && _calOpenEventId) { _calOpenEventId = null; render(); }
  const fromEl = o.from && o.from.isConnected ? o.from : null;
  tcOpen({ kind: 'evcreate', draft }, Object.assign({}, o, { fromEl, fromRect: fromEl ? fromEl.getBoundingClientRect() : null }));
  return 'card';
}
/** The scene band for a new event: follows the title, tinted with the calendar's colour. */
function evcHeroSpec(d) {
  if (typeof animSceneHtml !== 'function') return null;
  const w = evcWhenToWrite(d.when);
  const fake = { id: 'draft:' + d.key, summary: d.title || 'New event', allDay: w.allDay, calendarId: d.calendarId, location: d.location, description: d.description,
    start: w.allDay ? { date: w.start } : { dateTime: w.start }, end: w.allDay ? { date: w.end } : { dateTime: w.end } };
  let type = 'event';
  try { type = (typeof animForEvent === 'function' ? (animForEvent(fake) || {}).type : null) || 'event'; } catch (e) { type = 'event'; }
  return { type, why: 'follows the title', color: `var(--sw-${_evcDraftSwatch(d)})`, pick: null };
}
function _evcDraftSwatch(d) {
  const col = evcColor(d.colorId);
  if (col) return col.sw;
  const c = _evcCalOf(d.calendarId) || _evcWritableCals().find(x => x.id === d.calendarId);
  return c && /^[a-z]+$/.test(c.color || '') ? c.color : 'blue';
}
/** The card in create-event mode (61-task-card.js _tcPaint). */
function _evcCreateView(inner, cur) {
  const d = cur.draft;
  const cw = _evcCW();
  const canSave = !!(cw && typeof cw.create === 'function');
  const repaint = () => { if (_tc && _tcCur() === cur) _tcPaint(); };
  _tc.card.setAttribute('aria-label', 'New event');
  const left = [];
  if (_tc.stack.length > 1) left.push(_tcBackBtn());
  const lbl = _evcEl('span', 'tc-crumb');
  lbl.innerHTML = `${icon('calendar-plus', 'i-sm')}<span>New event</span><span class="tc-crumb-sub">in Google Calendar</span>`;
  left.push(lbl);
  inner.appendChild(_tcBar(left, [_tcMaxBtn()]));

  const head = _evcEl('div', 'tc-head tc-head-ev evc-head-new');
  const colourOk = canSave && _evcSupports('colorId');
  const sw = _evcEl(colourOk ? 'button' : 'span', 'tc-evsq c-' + _evcDraftSwatch(d));
  if (colourOk) {
    sw.type = 'button'; sw.classList.add('evc-sqbtn'); sw.dataset.fk = 'evn-colour';
    sw.setAttribute('aria-label', 'Event colour'); sw.setAttribute('data-tip', 'Colour');
    sw.onclick = () => _evcColourPop(sw, { colorId: d.colorId }, (id) => { d.colorId = id; repaint(); }, _evcDraftSwatch(Object.assign({}, d, { colorId: '' })));
  } else sw.setAttribute('aria-hidden', 'true');
  const hb = _evcEl('div', 'tc-hb');
  const ta = document.createElement('textarea'); ta.className = 'tc-title evc-title'; ta.id = 'tc-title'; ta.rows = 1; ta.dataset.fk = 'evn-title';
  ta.placeholder = 'Add title'; ta.setAttribute('aria-label', 'Event title'); ta.maxLength = 300; ta.spellcheck = true;
  ta.value = d.title;
  const fit = _evcAutosize(ta);
  let heroT = 0;
  ta.addEventListener('input', () => {
    d.title = ta.value.replace(/\n/g, ' ');
    ta.closest('.tc-head').classList.remove('is-invalid');
    fit();
    clearTimeout(heroT);
    heroT = setTimeout(() => { if (_tc && _tcCur() === cur) _tcHeroSync(cur); }, 250);
  });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); _evcCreateSave(); } });
  hb.append(ta, _evcWhenEditor(d.when, (f, v) => {
    d.when = evcWhenEdit(d.when, f, v);
    repaint();
  }, { fk: 'evn' }));
  head.append(sw, hb);
  inner.appendChild(head);

  const scroll = _evcEl('div', 'tc-scroll');
  const cols = _evcEl('div', 'tc-cols evc-cols');
  const top = _evcEl('div', 'tc-main tc-evmain tc-evtop');   // the place first (Google's order), then the details, then the rest
  const main = _evcEl('div', 'tc-main tc-evmain evc-newmain');
  // Location
  const lrow = _evcEl('div', 'evc-row evc-loc');
  lrow.innerHTML = icon('map-pin', 'i-sm evc-ic');
  const lin = document.createElement('input'); lin.className = 'evc-in'; lin.dataset.fk = 'evn-loc'; lin.maxLength = 300; lin.autocomplete = 'off';
  lin.placeholder = 'Add location'; lin.setAttribute('aria-label', 'Location'); lin.value = d.location;
  lin.addEventListener('input', () => { d.location = lin.value; });
  lin.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); _evcCreateSave(); } });
  lrow.appendChild(lin);
  top.appendChild(lrow);
  // Description
  const ds = _evcEl('div', 'evc-desc');
  ds.appendChild(_evcEl('div', 'ev-sec', 'Description'));
  const dta = document.createElement('textarea'); dta.className = 'evc-desc-in'; dta.dataset.fk = 'evn-desc'; dta.rows = 4;
  dta.placeholder = 'Add a description'; dta.setAttribute('aria-label', 'Description'); dta.value = d.description;
  _evcAutosize(dta, 420);
  dta.addEventListener('input', () => { d.description = dta.value; });
  ds.appendChild(dta);
  main.appendChild(ds);
  // Guests (when the write path takes them)
  if (canSave && _evcSupports('guests')) {
    const gs = _evcEl('div', 'evc-newguests');
    gs.appendChild(_evcEl('div', 'ev-sec', 'Guests'));
    const chips = _evcEl('div', 'chips evc-gchips');
    for (const em of d.guests) {
      const c = _evcEl('span', 'chip chip-lg');
      c.appendChild(_evcEl('span', '', em));
      const x = _evcEl('button', 'x'); x.type = 'button'; x.innerHTML = icon('x', 'i-xs'); x.setAttribute('aria-label', 'Remove ' + em);
      x.onclick = () => { d.guests = d.guests.filter(g => g !== em); repaint(); };
      c.appendChild(x);
      chips.appendChild(c);
    }
    if (d.guests.length) gs.appendChild(chips);
    gs.appendChild(_evcGuestAdd({ attendees: d.guests.map(email => ({ email })) }, (emails) => { d.guests = [...new Set([...d.guests, ...emails])]; repaint(); }));
    if (d.guests.length) gs.appendChild(_evcEl('p', 'evc-note', 'Google emails the guests an invitation when you save.'));
    main.appendChild(gs);
  }
  const side = _evcEl('aside', 'tc-side tc-evside'); side.setAttribute('aria-label', 'Details');
  const dl = _evcEl('dl', 'ev-dl evc-dl');
  const cals = _evcWritableCals();
  const cur0 = cals.find(c => c.id === d.calendarId) || _evcCalOf(d.calendarId);
  const dt = document.createElement('dt'); dt.innerHTML = icon('calendar', 'i-xs') + '<span>Calendar</span>';
  const dd = document.createElement('dd');
  const calHtml = (c) => `${_evcDotHtml(c ? c.color : 'blue')}<span class="truncate">${esc(c ? c.name : 'Your calendar')}</span>`;
  if (cals.length > 1) {
    const b = _evcEl('button', 'evc-pick'); b.type = 'button'; b.dataset.fk = 'evn-cal';
    b.innerHTML = calHtml(cur0) + icon('chevrons-up-down', 'i-xs evc-chev');
    b.setAttribute('aria-label', 'Calendar: ' + (cur0 ? cur0.name : 'your calendar') + '. Change');
    b.onclick = () => openMenu(b, cals.map(c => ({ label: c.name, icon: _evcDotHtml(c.color), checked: c.id === d.calendarId, run: () => { d.calendarId = c.id; _tcHeroSync(cur); repaint(); } })), { align: 'start', width: 260 });
    dd.appendChild(b);
  } else { const s = _evcEl('span', 'evc-val'); s.innerHTML = calHtml(cur0); dd.appendChild(s); }
  dl.append(dt, dd);
  if (colourOk) {
    const col = evcColor(d.colorId);
    const ct = document.createElement('dt'); ct.innerHTML = icon('palette', 'i-xs') + '<span>Colour</span>';
    const cd = document.createElement('dd');
    const b = _evcEl('button', 'evc-pick'); b.type = 'button'; b.dataset.fk = 'evn-colour2';
    b.innerHTML = (col ? `<span class="evc-dot gc-${escAttr(col.id)}" aria-hidden="true"></span>` : _evcDotHtml(_evcDraftSwatch(d))) + `<span class="truncate">${esc(col ? col.name : 'Calendar colour')}</span>` + icon('chevrons-up-down', 'i-xs evc-chev');
    b.onclick = () => _evcColourPop(b, { colorId: d.colorId }, (id) => { d.colorId = id; repaint(); }, _evcDraftSwatch(Object.assign({}, d, { colorId: '' })));
    cd.appendChild(b);
    dl.append(ct, cd);
  }
  side.appendChild(dl);
  if (d.link && typeof sgEvcLinkRow === 'function') { const lr = sgEvcLinkRow(d, repaint); if (lr) side.appendChild(lr); }
  if (!canSave) side.appendChild(_evcRoNote({ ok: false, reason: 'Saving straight to Google is not available here: Save opens Google Calendar with these details filled in.' }));
  cols.append(top, side, main);
  scroll.appendChild(cols);
  inner.appendChild(scroll);

  const foot = _evcEl('div', 'tc-foot');
  foot.innerHTML = '<span class="tc-keys is-left"><span><kbd class="kbd">↵</kbd> save</span><span><kbd class="kbd">Esc</kbd> cancel</span></span>';
  const cancel = _evcEl('button', 'btn btn-ghost btn-sm', 'Cancel'); cancel.type = 'button';
  cancel.onclick = () => _tcBackOrClose();
  const go = _evcEl('button', 'btn btn-primary btn-sm'); go.type = 'button'; go.dataset.fk = 'evn-save';
  go.innerHTML = icon(canSave ? 'check' : 'external-link') + `<span>${canSave ? 'Save' : 'Open in Google Calendar'}</span>`;
  go.onclick = () => _evcCreateSave();
  foot.append(cancel, go);
  inner.appendChild(foot);
}
/** Save the new event: the card closes at once (as Google's dialog does) and CalWrite shows it and saves it. */
function _evcCreateSave() {
  const cur = _tc ? _tcCur() : null;
  if (!cur || cur.kind !== 'evcreate') return;
  const d = cur.draft;
  // Like Google (and the quick-create popover): an event without a title is saved as "(No title)".
  const title = String(d.title || '').replace(/\s+/g, ' ').trim() || '(No title)';
  d.title = title;
  const cw = _evcCW();
  const args = evcDraftToCreate(d);
  if (!_evcSupports('colorId')) delete args.colorId;
  if (!_evcSupports('guests')) delete args.guests;
  const leave = () => { if (_tc.stack.length > 1) { _tc.stack.pop(); _tcPaint({ swap: 'back' }); _tcFocusStart(); } else tcClose(); };
  if (!cw || typeof cw.create !== 'function') {
    const w = d.when;
    const mins = w.allDay ? null : Math.max(EVC_STEP, evcSpan(w));
    window.open(googleCalendarUrl({ title, date: w.startDate, time: w.allDay ? null : w.startTime, minutes: mins, details: d.description, location: d.location }), '_blank', 'noopener');
    leave();
    return;
  }
  leave();
  // From a suggestion: its own toast (one Undo for the event and the task link) instead of CalWrite's.
  const linked = !!(d.link && typeof sgAfterEventCreate === 'function');
  _evcWrite('new:' + d.key, (w) => w.create(args, linked ? { silent: true } : undefined)).then((r) => {
    if (r && r.ok !== false && !r.cancelled) { if (linked) sgAfterEventCreate(r, d); return; }
    toast(`“${title}” was not saved to Google.`, { kind: 'err', timeout: 9000, action: { label: 'Edit again', run: () => tcOpen({ kind: 'evcreate', draft: d }, {}) } });
  });
}

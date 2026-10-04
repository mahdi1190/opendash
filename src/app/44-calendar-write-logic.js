/* ============================================================
   CALENDAR WRITE: THE RULES (owner: Calendar write layer)
   ------------------------------------------------------------
   Pure classic-script file: no DOM, no page globals. The page uses it through
   44-calendar-write.js (window.CalWrite); Node evaluates the same text
   (lib/calendar-write.mjs), so the page and the server agree on who may change
   what, how a change looks before Google answers, and which guests hear of it.

     calwRole(cal, opt)              a calendar's accessRole, or null (unknown)
     calwEditInfo(ev, cals, opt)     may this event be moved / edited / deleted?
                                     -> {ok, calendarId} | {ok:false, code, reason}
     calwCanRsvp(ev, opt)            may the user answer this invitation? (opt.mine: their own addresses)
     calwFieldEditable(ev, field)    e.g. a description with formatting is not
     calwGuests(ev)                  the people Google would email (not you, rooms, calendars)
     calwGuestList(list)             new guests (strings or {email, optional}) -> clean [{email, optional?}]
     calwNeedsGuestPrompt(ev, op, p) ask "Send / Don't send"? -> 'invite' | 'update' | 'remove' | false
     calwSeriesId(ev)                the recurring series an occurrence belongs to
     calwIsRecurring(ev)
     calwApplyPatch(ev, patch, opt)  the event as it will look (optimistic copy)
     calwMergePatch(a, b)            two quick edits to one event -> one (last wins)
     calwShiftTimes(ev, from, to)    move a sibling occurrence like the one dragged
     calwErrorAction(code)           what an error offers: connections|retry|refresh|update|google|null
   Times in a patch: timed = ISO date-times ('2026-10-06T10:00:00Z' or with an
   offset); all-day = 'YYYY-MM-DD' with Google's EXCLUSIVE end date.
   Patch fields: title, start, end, allDay, location, description, calendarId,
   colorId ('1'-'11', Google's event colours; '' = the calendar's), addGuests
   ([email | {email, optional}]), removeGuests ([email]).
   ============================================================ */

const CALW_ROLES = ['owner', 'writer', 'reader', 'freeBusyReader'];
const CALW_READONLY_TYPES = ['birthday', 'fromGmail', 'workingLocation'];
const CALW_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function _calwNo(code, reason) { return { ok: false, code: code, reason: reason }; }
function _calwLower(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

/**
 * The access the account has to a calendar (from the list_events answer, kept
 * by "Update calendar"). Unknown -> null. opt.assumeRoles (the fake connector
 * only): the user's own, primary, group and holiday calendars count as 'owner',
 * other people's as 'reader'.
 */
function calwRole(cal, opt) {
  if (!cal || typeof cal !== 'object') return null;
  if (CALW_ROLES.indexOf(cal.accessRole) >= 0) return cal.accessRole;
  if (!opt || !opt.assumeRoles) return null;
  const id = _calwLower(cal.id);
  const mine = (opt.myEmails || []).map(_calwLower).filter(Boolean);
  if (cal.primary || !mine.length || mine.indexOf(id) >= 0) return 'owner';
  if (/@(group|import)\.(v\.)?calendar\.google\.com$/.test(id) || id.indexOf('#') >= 0) return 'owner';
  return 'reader';
}

/** Accept an event, or a calendar entry ({kind:'event', ref}); task and countdown lanes are not events. */
function _calwEvent(ev) {
  if (!ev || typeof ev !== 'object') return null;
  if (ev.kind !== undefined) return ev.kind === 'event' && ev.ref && typeof ev.ref === 'object' ? ev.ref : null;
  return ev.id && ev.start ? ev : null;
}
function _calwCalIds(ev) {
  if (Array.isArray(ev.calendars) && ev.calendars.length) return ev.calendars.slice();
  return ev.calendarId ? [ev.calendarId] : [];
}

/**
 * Can the user change this event in Google (move, resize, edit, delete)?
 * cals = the calendars of the snapshot [{id, accessRole, primary}]. Only events
 * on calendars the account owns or can write, and only the organiser's copy
 * (or any copy when guests may modify). calendarId = the copy to write through.
 */
function calwEditInfo(evIn, cals, opt) {
  const ev = _calwEvent(evIn);
  if (!ev) return _calwNo('NOT_EVENT', 'Only Google Calendar events can be changed here.');
  // The page's own draft of an event being created (never on the server: opt.server).
  if (/^tmp-/.test(String(ev.id)) && !(opt && opt.server)) return { ok: true, calendarId: ev.calendarId || null, pending: true };
  const ids = _calwCalIds(ev);
  if (!ids.length || ids.some(function (id) { return String(id).indexOf('/') >= 0 || id === 'google'; })) {
    return _calwNo('READ_ONLY', 'This event comes from a calendar the dashboard can only read.');
  }
  if (CALW_READONLY_TYPES.indexOf(ev.eventType) >= 0) return _calwNo('READ_ONLY', 'Google does not let this kind of event be changed here.');
  const byId = {};
  (cals || []).forEach(function (c) { if (c && c.id) byId[c.id] = c; });
  const writable = [];
  let unknown = 0;
  ids.forEach(function (id) {
    const role = calwRole(byId[id], opt);
    if (role === 'owner' || role === 'writer') writable.push(id);
    else if (!role) unknown++;
  });
  if (!writable.length) {
    return unknown ? _calwNo('ACCESS_UNKNOWN', 'Update the calendar once so the dashboard learns which calendars you can change.')
      : _calwNo('READ_ONLY', 'You can only view this calendar.');
  }
  // The organiser's copy: by address; with no organiser at all, the event is the calendar's own;
  // an organiser known only by name (older snapshots) is the calendar of that name (group calendars).
  const org = ev.organizer && ev.organizer.email ? _calwLower(ev.organizer.email) : '';
  const orgName = !org && ev.organizer && ev.organizer.name ? _calwLower(ev.organizer.name) : '';
  const noOrganizer = !org && !orgName;
  let copy = null;
  for (let i = 0; i < writable.length && !copy; i++) {
    const c = byId[writable[i]] || {};
    if (noOrganizer || (org && _calwLower(writable[i]) === org) || (orgName && (_calwLower(c.googleName) === orgName || _calwLower(c.name) === orgName))) copy = writable[i];
  }
  if (!copy && ev.organizer && ev.organizer.self && writable.indexOf(ev.calendarId) >= 0) copy = ev.calendarId;
  if (copy) return { ok: true, calendarId: copy };
  if (ev.guestsCanModify) return { ok: true, calendarId: writable[0], asGuest: true };
  return _calwNo('NOT_ORGANIZER', 'Only the organiser can change this event. You can still reply to it.');
}

/**
 * Can the user answer (RSVP) this event? Only when invited, and not as its organiser.
 * opt.mine = the user's own addresses (config.myEmails + the primary calendar):
 * when known, the guest marked `self` must be one of them and the event must be
 * on one of the user's own calendars. On another person's calendar Google marks
 * THAT person as `self`, and a reply through it would go out in their name.
 */
function calwCanRsvp(evIn, opt) {
  const ev = _calwEvent(evIn);
  if (!ev) return _calwNo('NOT_EVENT', 'Only Google Calendar events have replies.');
  const me = (ev.attendees || []).filter(function (a) { return a && a.self; })[0];
  if (!me && !ev.selfResponse) return _calwNo('NOT_INVITED', 'You are not a guest of this event.');
  if (me && me.organizer) return _calwNo('ORGANIZER', 'You organise this event.');
  if (_calwCalIds(ev).some(function (id) { return String(id).indexOf('/') >= 0; })) return _calwNo('READ_ONLY', 'This event comes from a calendar the dashboard can only read.');
  const mine = (opt && Array.isArray(opt.mine) ? opt.mine : []).map(_calwLower).filter(Boolean);
  if (mine.length) {
    const notMine = 'This invitation is on another person\'s calendar, so a reply would go out in their name: answer it in Google Calendar.';
    if (me && me.email && mine.indexOf(_calwLower(me.email)) < 0) return _calwNo('NOT_YOURS', notMine);
    if (!_calwCalIds(ev).some(function (id) { return mine.indexOf(_calwLower(id)) >= 0; })) return _calwNo('NOT_YOURS', notMine);
  }
  return { ok: true };
}

/** A field the user may change from the dashboard? (Formatted or cut descriptions stay in Google.) */
function calwFieldEditable(evIn, field) {
  const ev = _calwEvent(evIn);
  if (!ev) return _calwNo('NOT_EVENT', 'Not a Google Calendar event.');
  if (field === 'description' && ev.descriptionLossy) {
    return _calwNo('DESCRIPTION_LOSSY', 'This description has formatting (or is longer than the dashboard keeps): edit it in Google Calendar.');
  }
  if (field === 'calendarId' && calwGuests(ev).length) return _calwNo('HAS_GUESTS', 'An event with guests cannot change calendar here: do it in Google Calendar.');
  if (field === 'calendarId' && calwIsRecurring(ev)) return _calwNo('RECURRING', 'A repeating event cannot change calendar here: do it in Google Calendar.');
  return { ok: true };
}

/** Everyone Google would email about a change: guests other than you, without rooms and calendars. */
function calwGuests(evIn) {
  const ev = _calwEvent(evIn);
  if (!ev) return [];
  return (ev.attendees || []).filter(function (a) {
    return a && !a.self && a.email && !/@(resource|group)\.calendar\.google\.com$/i.test(String(a.email));
  }).map(function (a) {
    return { email: String(a.email), name: a.name || '', self: false, organizer: !!a.organizer, optional: !!a.optional, responseStatus: a.response || a.responseStatus || 'needsAction' };
  });
}

const _CALW_GUEST_FIELDS = ['title', 'start', 'end', 'allDay', 'location', 'description', 'calendarId', 'removeGuests'];
/** New guests in a patch / create input: [{email, optional?}] (strings or objects, lower-cased, no repeats). */
function calwGuestList(list) {
  const seen = {}, out = [];
  (Array.isArray(list) ? list : []).forEach(function (g) {
    const email = _calwLower(typeof g === 'string' ? g : g && g.email);
    if (!email || seen[email] || !/^[^\s@<>"',;:()]+@[^\s@<>"',;:()]+\.[A-Za-z]{2,24}$/.test(email)) return;
    seen[email] = true;
    out.push(g && typeof g === 'object' && g.optional ? { email: email, optional: true } : { email: email });
  });
  return out;
}
/**
 * Should the user be asked whether Google emails the guests? 'invite' when the
 * change adds guests (or creates an event with guests), 'update' / 'remove'
 * when guests already there would hear of it, else false.
 */
function calwNeedsGuestPrompt(evIn, op, patch) {
  if (op === 'rsvp') return false;
  if (op === 'create') return calwGuestList(patch && (patch.attendees || patch.guests)).length ? 'invite' : false;
  if (op === 'update' && calwGuestList(patch && patch.addGuests).length) return 'invite';
  if (!calwGuests(evIn).length) return false;
  if (op === 'remove') return 'remove';
  return _CALW_GUEST_FIELDS.some(function (k) { return patch && Object.prototype.hasOwnProperty.call(patch, k); }) ? 'update' : false;
}

/** The series id of a repeating occurrence (Google: '<series>_<YYYYMMDD>[T<HHMMSS>Z]'), else null. */
function calwSeriesId(evIn) {
  const ev = _calwEvent(evIn);
  if (!ev) return null;
  if (ev.recurringEventId) return String(ev.recurringEventId);
  if (!ev.recurring) return null;
  const m = /^(.+)_\d{8}(T\d{6}Z)?$/.exec(String(ev.id));
  return m ? m[1] : null;
}
function calwIsRecurring(evIn) { const ev = _calwEvent(evIn); return !!(ev && (ev.recurring || ev.recurringEventId)); }

function calwAddDays(iso, n) {
  const p = String(iso).split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10); // clock-ok: UTC civil date (no zone)
}
function _calwDayDiff(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
function _calwStartOf(ev) { return ev.start && (ev.start.dateTime || ev.start.date) || null; }
function _calwEndOf(ev) { return ev.end && (ev.end.dateTime || ev.end.date) || null; }

/**
 * The start/end a patch gives an event: {allDay, start, end}, or null when the
 * patch has no times. A lone `end` keeps the start (resize); a lone `start`
 * keeps the length (move). All-day ends are exclusive and at least a day on.
 */
function calwPatchTimes(ev, patch) {
  if (!patch || (patch.start === undefined && patch.end === undefined && patch.allDay === undefined)) return null;
  const wasAllDay = !!ev.allDay;
  const allDay = patch.allDay !== undefined ? !!patch.allDay : wasAllDay;
  let start = patch.start !== undefined ? patch.start : _calwStartOf(ev);
  let end = patch.end !== undefined ? patch.end : null;
  if (allDay) {
    start = String(start || '').slice(0, 10);
    if (end == null) {
      const len = wasAllDay ? Math.max(1, _calwDayDiff(ev.start.date, ev.end && ev.end.date ? ev.end.date : calwAddDays(ev.start.date, 1))) : 1;
      end = calwAddDays(start, len);
    }
    end = String(end).slice(0, 10);
    if (!CALW_DATE_RE.test(start) || !CALW_DATE_RE.test(end)) return null;
    if (end <= start) end = calwAddDays(start, 1);
    return { allDay: true, start: start, end: end };
  }
  if (end == null) {
    const s0 = Date.parse(_calwStartOf(ev)), e0 = Date.parse(_calwEndOf(ev));
    const len = !wasAllDay && isFinite(s0) && isFinite(e0) && e0 >= s0 ? e0 - s0 : 3600000;
    end = new Date(Date.parse(start) + len).toISOString();
  }
  if (!isFinite(Date.parse(start)) || !isFinite(Date.parse(end))) return null;
  if (Date.parse(end) < Date.parse(start)) end = start;
  return { allDay: false, start: String(start), end: String(end) };
}

/** The event as it will look once Google has the change (a new object; the original is untouched). */
function calwApplyPatch(evIn, patch, opt) {
  const ev = _calwEvent(evIn);
  const out = JSON.parse(JSON.stringify(ev));
  if (!patch) return out;
  if (Object.prototype.hasOwnProperty.call(patch, 'title')) out.summary = String(patch.title || '').trim() || '(no title)';
  if (Object.prototype.hasOwnProperty.call(patch, 'location')) { if (patch.location) out.location = String(patch.location); else delete out.location; }
  if (Object.prototype.hasOwnProperty.call(patch, 'description')) { if (patch.description) out.description = String(patch.description); else delete out.description; }
  const t = calwPatchTimes(ev, patch);
  if (t) {
    const tz = ev.start && ev.start.timeZone ? ev.start.timeZone : (opt && opt.timeZone) || null;
    out.allDay = t.allDay;
    out.start = t.allDay ? { date: t.start } : (tz ? { dateTime: t.start, timeZone: tz } : { dateTime: t.start });
    out.end = t.allDay ? { date: t.end } : (tz ? { dateTime: t.end, timeZone: tz } : { dateTime: t.end });
  }
  if (patch.calendarId && patch.calendarId !== ev.calendarId) { out.calendarId = patch.calendarId; delete out.calendars; }
  if (Object.prototype.hasOwnProperty.call(patch, 'colorId')) { if (patch.colorId) out.colorId = String(patch.colorId); else delete out.colorId; }
  const drop = (patch.removeGuests || []).map(_calwLower);
  const add = calwGuestList(patch.addGuests);
  if (drop.length || add.length) {
    let att = (out.attendees || []).filter(function (a) { return a.self || drop.indexOf(_calwLower(a.email)) < 0; });
    add.forEach(function (g) {
      if (att.some(function (a) { return _calwLower(a.email) === g.email; })) return;
      att.push(g.optional ? { email: g.email, name: '', optional: true, response: 'needsAction' } : { email: g.email, name: '', response: 'needsAction' });
    });
    // Google adds the organiser as a guest once there are others.
    if (add.length && !att.some(function (a) { return a.self; }) && ev.calendarId) att.unshift({ email: _calwLower(ev.calendarId), name: '', self: true, organizer: true, response: 'accepted' });
    if (att.length) out.attendees = att; else delete out.attendees;
  }
  return out;
}

/** Two quick edits to the same event become one: later fields win. */
function calwMergePatch(a, b) {
  const out = {};
  [a, b].forEach(function (p) { if (p) Object.keys(p).forEach(function (k) { out[k] = p[k]; }); });
  return out;
}

/**
 * "All events" of a series: move a sibling occurrence the way one occurrence
 * moved from `from` to `to` ({allDay, start, end} as in calwPatchTimes): same
 * shift, same new length. Returns {allDay, start, end} (timed: ISO 'Z' times).
 */
function calwShiftTimes(sib, from, to) {
  if (to.allDay) {
    const d = _calwDayDiff(from.start, to.start), len = Math.max(1, _calwDayDiff(to.start, to.end));
    const s = calwAddDays(String(_calwStartOf(sib)).slice(0, 10), d);
    return { allDay: true, start: s, end: calwAddDays(s, len) };
  }
  const delta = Date.parse(to.start) - Date.parse(from.start);
  const len = Date.parse(to.end) - Date.parse(to.start);
  const s = Date.parse(_calwStartOf(sib)) + delta;
  return { allDay: false, start: new Date(s).toISOString(), end: new Date(s + len).toISOString() };
}

/** What an error lets the user do next. */
function calwErrorAction(code) {
  switch (code) {
    case 'CLI_MISSING': case 'NOT_SIGNED_IN': case 'CONNECTOR_AUTH': case 'TOOL_MISSING': return 'connections';
    case 'CONFLICT': return 'retry-fresh';
    case 'ACCESS_UNKNOWN': case 'UNCERTAIN': case 'GONE': return 'update';
    case 'DESCRIPTION_LOSSY': case 'SCOPE_UNSUPPORTED': return 'google';
    case 'READ_ONLY': case 'NOT_ORGANIZER': case 'NOT_EVENT': case 'BAD_REQUEST': case 'NOT_FOUND': case 'NOT_INVITED': case 'GUESTS_UNCONFIRMED': return null;
    default: return 'retry';
  }
}

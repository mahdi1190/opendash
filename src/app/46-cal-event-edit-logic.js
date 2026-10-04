/* ============================================================
   EVENT EDITING: PURE RULES (owner: Calendar)
   ------------------------------------------------------------
   The arithmetic behind the editable event card (46-cal-event-edit.js):
   Google Calendar's 15-minute time list with durations, typed times, the
   date/time fields of an event and how an edit moves them (moving the start
   keeps the length, an end before the start becomes the next day), the
   patch that goes to CalWrite (only what changed), new-event drafts, guests,
   colours, Maps links. No DOM and no page globals: tests/cal-event-edit.test.mjs
   loads this file in a VM exactly as the page does.
   Dates are 'YYYY-MM-DD', times 'HH:MM' (24 h), both in wall-clock time in
   the dashboard's zone (Clock, 07-core-clock.js; the tests load it too).
   All-day events: Google's end date is exclusive; the editor shows the last
   day (inclusive) and evcWhenToWrite turns it back.
   ============================================================ */

const EVC_STEP = 15;
const EVC_DAY = 24 * 60;
/** Google's event colours (colorId 1-11), their names and the nearest app swatch (CAL_SWATCHES). */
const EVC_COLORS = Object.freeze([
  { id: '1', name: 'Lavender', sw: 'indigo' }, { id: '2', name: 'Sage', sw: 'green' }, { id: '3', name: 'Grape', sw: 'violet' },
  { id: '4', name: 'Flamingo', sw: 'pink' }, { id: '5', name: 'Banana', sw: 'amber' }, { id: '6', name: 'Tangerine', sw: 'orange' },
  { id: '7', name: 'Peacock', sw: 'blue' }, { id: '8', name: 'Graphite', sw: 'slate' }, { id: '9', name: 'Blueberry', sw: 'indigo' },
  { id: '10', name: 'Basil', sw: 'teal' }, { id: '11', name: 'Tomato', sw: 'red' },
]);
const EVC_EMAIL_RE = /^[^\s@<>"',;:()]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;

function evcPad(n) { return String(n).padStart(2, '0'); }
function evcIsDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function evcIsTime(s) { return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }
function evcDateOf(d) { return `${d.getFullYear()}-${evcPad(d.getMonth() + 1)}-${evcPad(d.getDate())}`; } // clock-ok: wall date (instants use Clock.parts)
function evcHM(min) { const m = ((Math.round(min) % EVC_DAY) + EVC_DAY) % EVC_DAY; return evcPad(Math.floor(m / 60)) + ':' + evcPad(m % 60); }
function evcMin(hm) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function evcAddDays(iso, n) { const [y, m, d] = iso.split('-').map(Number); return evcDateOf(new Date(y, m - 1, d + n)); }
/** Whole days from a to b (wall-clock dates, so a clock change never makes it 0.96). */
function evcDaysBetween(a, b) {
  const u = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((u(b) - u(a)) / 86400000);
}
/** {date, time} plus minutes (crossing midnight moves the date). */
function evcAddMinutes(date, hm, mins) {
  const total = (evcMin(hm) || 0) + Math.round(mins);
  const days = Math.floor(total / EVC_DAY);
  return { date: days ? evcAddDays(date, days) : date, time: evcHM(total - days * EVC_DAY) };
}

/* ---------- labels ---------- */
/** The length Google writes after an end time: "15 mins", "1 hr", "1.25 hrs", "2 hrs". */
function evcDurationLabel(mins) {
  mins = Math.round(Number(mins) || 0);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const h = Math.round((mins / 60) * 100) / 100;
  return `${h} hr${h === 1 ? '' : 's'}`;
}

/* ---------- times ---------- */
/**
 * A typed time -> 'HH:MM', or null: "2pm", "2:30 pm", "14:30", "1430", "9",
 * "9.15", "noon", "midnight".
 */
function evcParseTime(text) {
  const t = String(text == null ? '' : text).trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, ':');
  if (!t) return null;
  if (t === 'noon' || t === 'midday') return '12:00';
  if (t === 'midnight') return '00:00';
  const m = /^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const mi = m[2] ? Number(m[2]) : 0;
  const ap = m[3] || '';
  if (mi > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap[0] === 'p' && h < 12) h += 12;
    if (ap[0] === 'a' && h === 12) h = 0;
  }
  if (h > 23) return null;
  return evcPad(h) + ':' + evcPad(mi);
}
/**
 * The time list: every `step` minutes from `from` to `to` (minutes of the
 * day). With `durationFrom` each row carries its length from then, as Google's
 * end-time list does. -> [{hm, min, dur}]
 */
function evcTimeOptions(o) {
  o = o || {};
  const step = Number(o.step) > 0 ? Number(o.step) : EVC_STEP;
  const from = Number(o.from) > 0 ? Number(o.from) : 0;
  const to = o.to == null ? EVC_DAY - step : Number(o.to);
  const out = [];
  for (let m = from; m <= to; m += step) out.push({ hm: evcHM(m), min: m, dur: o.durationFrom == null ? '' : evcDurationLabel(m - o.durationFrom) });
  return out;
}
/**
 * The end-time list for the editor's fields: same day = the times after the
 * start, each with its length; a later end day = the whole day, lengths
 * counted from the start. An event starting at 23:45 gets 00:00 the next day.
 * -> [{hm, min, dur, date}]
 */
function evcEndOptions(w, step) {
  step = Number(step) > 0 ? Number(step) : EVC_STEP;
  const s = evcMin(w.startTime) || 0;
  const days = Math.max(0, evcDaysBetween(w.startDate, w.endDate));
  if (days === 0) {
    const first = Math.ceil((s + 1) / step) * step;
    const list = evcTimeOptions({ step, from: first, to: EVC_DAY - step, durationFrom: s }).map(x => Object.assign(x, { date: w.endDate }));
    if (!list.length) list.push({ hm: '00:00', min: 0, dur: evcDurationLabel(EVC_DAY - s), date: evcAddDays(w.startDate, 1) });
    return list;
  }
  return evcTimeOptions({ step, durationFrom: s - days * EVC_DAY }).map(x => Object.assign(x, { date: w.endDate }));
}

/* ---------- an event's date/time fields ---------- */
/** An event (Google shape: start/end {dateTime}|{date}) -> {allDay, startDate, startTime, endDate, endTime} in local time. */
function evcWhenOf(ev) {
  const s0 = (ev && ev.start) || {}, e0 = (ev && ev.end) || {};
  if ((ev && ev.allDay) || (s0.date && !s0.dateTime)) {
    const a = String(s0.date || '').slice(0, 10);
    const endEx = e0.date && String(e0.date).slice(0, 10) > a ? String(e0.date).slice(0, 10) : evcAddDays(a, 1);
    return { allDay: true, startDate: a, startTime: null, endDate: evcAddDays(endEx, -1), endTime: null };
  }
  const s = new Date(s0.dateTime);
  const e = e0.dateTime ? new Date(e0.dateTime) : s;
  const end = e.getTime() < s.getTime() ? s : e;
  const sp = Clock.parts(s.getTime()), ep = Clock.parts(end.getTime());
  return {
    allDay: false,
    startDate: sp.iso, startTime: evcHM(sp.h * 60 + sp.mi),
    endDate: ep.iso, endTime: evcHM(ep.h * 60 + ep.mi),
  };
}
/** Length in minutes (wall clock; all-day = whole days). */
function evcSpan(w) {
  const days = evcDaysBetween(w.startDate, w.endDate);
  if (w.allDay) return (days + 1) * EVC_DAY;
  return days * EVC_DAY + (evcMin(w.endTime) || 0) - (evcMin(w.startTime) || 0);
}
/** 'YYYY-MM-DDTHH:MM:00+01:00': the wall-clock time in the dashboard's zone with the offset it has on that day. */
function evcLocalIso(date, hm) {
  const mins = evcMin(hm) || 0;
  const ms = Clock.at(date, mins), t = Clock.parts(ms);
  const off = Clock.offset(ms, Clock.zone());
  const a = Math.abs(off);
  return `${t.iso}T${evcHM(t.h * 60 + t.mi)}:00${off >= 0 ? '+' : '-'}${evcPad(Math.floor(a / 60))}:${evcPad(a % 60)}`;
}
/** The editor's fields -> what CalWrite writes: {allDay, start, end} (all-day: dates, end exclusive; timed: ISO with offset). */
function evcWhenToWrite(w) {
  if (w.allDay) {
    const last = w.endDate && w.endDate >= w.startDate ? w.endDate : w.startDate;
    return { allDay: true, start: w.startDate, end: evcAddDays(last, 1) };
  }
  return { allDay: false, start: evcLocalIso(w.startDate, w.startTime), end: evcLocalIso(w.endDate, w.endTime) };
}
/**
 * One edit to the date/time fields, the way Google Calendar does it:
 *  startDate / startTime  the event keeps its length (the end moves with it);
 *  endDate                never before the start day (a same-day end before the start keeps the old length);
 *  endTime                an end at or before the start means the next day (overnight);
 *  end                    {date, time}: a row of the end-time list (evcEndOptions);
 *  allDay                 on: dates kept, times remembered; off: the remembered times, else 09:00 for an hour.
 * -> new fields (the input is not changed).
 */
function evcWhenEdit(w, field, value) {
  const n = Object.assign({}, w);
  const span = evcSpan(w);
  if (field === 'startDate' && evcIsDate(value)) {
    n.startDate = value;
    n.endDate = evcAddDays(w.endDate, evcDaysBetween(w.startDate, value));
  } else if (field === 'startTime' && evcIsTime(value) && !w.allDay) {
    n.startTime = value;
    const e = evcAddMinutes(n.startDate, value, Math.max(EVC_STEP, span));
    n.endDate = e.date; n.endTime = e.time;
  } else if (field === 'endDate' && evcIsDate(value)) {
    n.endDate = value < w.startDate ? w.startDate : value;
    if (!n.allDay && evcSpan(n) <= 0) { const e = evcAddMinutes(n.startDate, n.startTime, Math.max(EVC_STEP, span)); n.endDate = e.date; n.endTime = e.time; }
  } else if (field === 'endTime' && evcIsTime(value) && !w.allDay) {
    n.endTime = value;
    if (evcSpan(n) <= 0) n.endDate = evcAddDays(n.startDate, 1);
  } else if (field === 'end' && value && evcIsDate(value.date) && evcIsTime(value.time) && !w.allDay) {
    // A row of the end-time list: its day and time together (00:00 the next day).
    n.endDate = value.date < w.startDate ? w.startDate : value.date;
    n.endTime = value.time;
    if (evcSpan(n) <= 0) n.endDate = evcAddDays(n.startDate, 1);
  } else if (field === 'allDay') {
    if (value && !w.allDay) {
      n.allDay = true;
      n.lastTimes = { startTime: w.startTime, endTime: w.endTime };
      // A timed event that ends at midnight does not take the next day with it.
      if (w.endTime === '00:00' && w.endDate > w.startDate) n.endDate = evcAddDays(w.endDate, -1);
      n.startTime = null; n.endTime = null;
    } else if (!value && w.allDay) {
      const lt = w.lastTimes || {};
      n.allDay = false;
      n.startTime = evcIsTime(lt.startTime) ? lt.startTime : '09:00';
      n.endTime = evcIsTime(lt.endTime) ? lt.endTime : evcAddMinutes(n.startDate, n.startTime, 60).time;
      if (evcSpan(n) <= 0) n.endDate = evcAddMinutes(n.startDate, n.startTime, 60).date;
      delete n.lastTimes;
    }
  }
  return n;
}

/* ---------- fields and patches ---------- */
/** The guests' addresses, lower case, without you. */
function evcGuestEmails(attendees) {
  return [...new Set((attendees || []).filter(a => a && !a.self && a.email).map(a => String(a.email).toLowerCase()))];
}
/** What the editor edits, read from an event. */
function evcFieldsOf(ev) {
  ev = ev || {};
  return {
    title: String(ev.summary || ''), location: String(ev.location || ''), description: String(ev.description || ''),
    calendarId: String(ev.calendarId || (Array.isArray(ev.calendars) && ev.calendars[0]) || ''), colorId: String(ev.colorId || ''),
    when: evcWhenOf(ev), guests: evcGuestEmails(ev.attendees),
  };
}
/**
 * The patch for CalWrite.update: only the fields that changed. A change to any
 * date or time sends the whole {start, end, allDay} (the connector moves the
 * end with a lone start). Guests: addGuests [{email}] / removeGuests [email].
 */
function evcPatchDiff(before, after) {
  const p = {};
  const txt = (v) => String(v == null ? '' : v);
  if (after.title !== undefined && txt(after.title).trim() !== txt(before.title).trim() && txt(after.title).trim()) p.title = txt(after.title).trim();
  if (after.location !== undefined && txt(after.location).trim() !== txt(before.location).trim()) p.location = txt(after.location).trim();
  if (after.description !== undefined && txt(after.description).replace(/\s+$/, '') !== txt(before.description).replace(/\s+$/, '')) p.description = txt(after.description).replace(/\s+$/, '');
  if (after.calendarId !== undefined && after.calendarId && txt(after.calendarId) !== txt(before.calendarId)) p.calendarId = txt(after.calendarId);
  if (after.colorId !== undefined && txt(after.colorId) !== txt(before.colorId)) p.colorId = txt(after.colorId);
  if (after.when && before.when) {
    const a = evcWhenToWrite(before.when), b = evcWhenToWrite(after.when);
    if (a.allDay !== b.allDay || a.start !== b.start || a.end !== b.end) Object.assign(p, b);
  }
  if (Array.isArray(after.guests) && Array.isArray(before.guests)) {
    const had = new Set(before.guests.map(e => String(e).toLowerCase())), has = new Set(after.guests.map(e => String(e).toLowerCase()));
    const add = [...has].filter(e => !had.has(e)), rem = [...had].filter(e => !has.has(e));
    if (add.length) p.addGuests = add.map(email => ({ email }));
    if (rem.length) p.removeGuests = rem;
  }
  return p;
}

/* ---------- new events ---------- */
/** A start/end as the quick-create popover may pass it (Date, ms, 'YYYY-MM-DD', ISO date-time, Google {dateTime}|{date}) -> {date, time|null} | null. */
function evcPointOf(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'object' && !(v instanceof Date)) {
    if (v.dateTime) return evcPointOf(v.dateTime);
    if (v.date) return evcPointOf(String(v.date).slice(0, 10));
    return null;
  }
  if (typeof v === 'string') {
    if (evcIsDate(v)) return { date: v, time: null };
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(v);
    if (m) return { date: m[1], time: `${m[2]}:${m[3]}` };   // no zone: local wall clock
  }
  const d = v instanceof Date ? v : new Date(v);
  if (!Number.isFinite(d.getTime())) return null;
  const p = Clock.parts(d.getTime());
  return { date: p.iso, time: evcHM(p.h * 60 + p.mi) };
}
/**
 * A new-event draft from a prefill {title, start, end, allDay, calendarId,
 * location, description, colorId, guests}. No start: the next half hour
 * (Google's default), an hour long. All-day ends are exclusive, as Google's.
 */
function evcDraftFrom(p, o) {
  p = p || {}; o = o || {};
  const now = new Date(o.now != null ? o.now : Clock.now());
  const len = Number(o.minutes) > 0 ? Number(o.minutes) : 60;
  let s = evcPointOf(p.start), e = evcPointOf(p.end);
  let when;
  const allDay = p.allDay === true || (p.allDay !== false && s && s.time === null && (!e || e.time === null));
  if (!s) {
    const np = Clock.parts(now.getTime()), m = np.h * 60 + np.mi;
    s = evcAddMinutes(np.iso, '00:00', Math.ceil((m + 1) / 30) * 30);
    s = { date: s.date, time: s.time };
  }
  if (allDay) {
    const endEx = e && e.date > s.date ? e.date : evcAddDays(s.date, 1);
    when = { allDay: true, startDate: s.date, startTime: null, endDate: evcAddDays(endEx, -1), endTime: null };
  } else {
    const st = s.time || '09:00';
    const end = e && e.time !== null && (e.date > s.date || (e.date === s.date && evcMin(e.time) > evcMin(st))) ? e : evcAddMinutes(s.date, st, len);
    when = { allDay: false, startDate: s.date, startTime: st, endDate: end.date, endTime: end.time };
  }
  const guests = (Array.isArray(p.guests) ? p.guests : []).map(g => String(g && g.email ? g.email : g).trim().toLowerCase()).filter(x => EVC_EMAIL_RE.test(x));
  return {
    key: 'v' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
    title: String(p.title || '').slice(0, 300), when,
    location: String(p.location || ''), description: String(p.description || p.details || ''),
    calendarId: String(p.calendarId || ''), colorId: String(p.colorId || ''), guests: [...new Set(guests)],
  };
}
/** The draft -> CalWrite.create's argument (empty extras left out). */
function evcDraftToCreate(d) {
  const w = evcWhenToWrite(d.when);
  const out = { title: String(d.title || '').trim(), start: w.start, end: w.end, allDay: w.allDay };
  if (d.calendarId) out.calendarId = d.calendarId;
  if (String(d.location || '').trim()) out.location = String(d.location).trim();
  if (String(d.description || '').replace(/\s+$/, '')) out.description = String(d.description).replace(/\s+$/, '');
  if (d.colorId) out.colorId = String(d.colorId);
  if (Array.isArray(d.guests) && d.guests.length) out.guests = d.guests.map(email => ({ email }));
  return out;
}

/* ---------- small rules ---------- */
/** You were invited (someone else organises it): you can answer, not change it. */
function evcIsInvitee(ev) {
  const me = ((ev && ev.attendees) || []).find(a => a && a.self);
  return !!(me && !me.organizer);
}
/** "4 guests · 2 yes, 1 no, 1 awaiting" -> {total, yes, no, maybe, awaiting, text}. */
function evcGuestSummary(attendees) {
  const list = (attendees || []).filter(Boolean);
  const c = { total: list.length, yes: 0, no: 0, maybe: 0, awaiting: 0 };
  for (const a of list) {
    const r = a.response || a.responseStatus;
    if (r === 'accepted') c.yes++; else if (r === 'declined') c.no++; else if (r === 'tentative') c.maybe++; else c.awaiting++;
  }
  const bits = [c.yes && `${c.yes} yes`, c.no && `${c.no} no`, c.maybe && `${c.maybe} maybe`, c.awaiting && `${c.awaiting} awaiting`].filter(Boolean);
  c.text = c.total ? `${c.total} guest${c.total === 1 ? '' : 's'}${bits.length ? ' · ' + bits.join(', ') : ''}` : '';
  return c;
}
/** Addresses typed into "Add guests" ("a@example.org, Sam <b@example.com>") -> valid, lower-case, unique. */
function evcParseGuests(text) {
  const out = [];
  for (const raw of String(text || '').split(/[,;\s]+/)) {
    const e = raw.replace(/^[<(]+|[>)]+$/g, '').trim().toLowerCase();
    if (EVC_EMAIL_RE.test(e) && !out.includes(e)) out.push(e);
  }
  return out;
}
/** A place -> a Maps search link (a web address stays itself; only http(s)). '' for nothing. */
function evcMapsUrl(loc) {
  const s = String(loc || '').trim();
  if (!s) return '';
  if (/^https?:\/\/\S+$/i.test(s)) return s;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s);
}
/** The snapshot keeps the first 1000 characters of a description: a longer one ends in "…" and must not be saved back. */
function evcDescTruncated(desc) { const s = String(desc || ''); return s.length >= 999 && /…$/.test(s); }
/** Event colour id -> {id, name, sw} | null. */
function evcColor(id) { return EVC_COLORS.find(c => c.id === String(id)) || null; }
/** The event's own time zone when it is not the one times are shown in, else ''. */
function evcZoneNote(eventZone, viewZone) {
  const a = String(eventZone || ''), b = String(viewZone || '');
  return a && b && a !== b ? a : '';
}
/**
 * The calendars an event can be saved to or moved to: Google calendars the
 * user owns or can write (accessRole from list_calendars), primary first.
 * cals: [{id, name, color, accessRole, primary, sourceId}]
 */
function evcWritableCalendars(cals) {
  return (cals || []).filter(c => c && c.id && !String(c.id).includes('/') && (c.accessRole === 'owner' || c.accessRole === 'writer'))
    .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
}

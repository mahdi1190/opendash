/* ============================================================
   MEETINGS LOGIC (pure). Owner: W0-B (shared time and people logic).
   Which calendar events are meetings with other people, who those people
   are in People, and what comes next. Used by Home's widgets (Meeting prep,
   After meetings, Invites & clashes, Keep in touch) and the server
   (lib/meet-logic.mjs evaluates this file with 52-people-link.js).
   No DOM and no page globals; the ppl* helpers it calls live in
   52-people-link.js (pure too). Events are the calendar store's shape
   (lib/calendar.mjs): {id, summary, start:{dateTime|date}, end, allDay,
   attendees:[{email, name, self, organizer, optional, response}], organizer,
   selfResponse, eventType, free, iCalUID, calendarId, calendars}.

     homeDedupeEvents(events)        one copy per meeting: the same id, the same iCalUID at the
                                     same start, or the same start, end and title (a meeting
                                     seen through two calendars). The richer copy wins (more
                                     attendees, a description, a join link); calendars merge.
     meetPeopleIndex(people)         {idx (pplBuildIndex), names (folded name/alias -> id|null)}
     meetAttendeePerson(a, ix)       person id of one attendee, or null: the address first, then
                                     the display name or an alias, then the address's local part,
                                     then one unique name inside the display name. Never the user.
                                     (The same rule as lib/story-data.mjs matchAttendee.)
     homeMeetingAttendees(ev, ix, o) the other people: [{email, name, personId, response,
                                     organizer, optional}] (not the user, no rooms or group
                                     calendars). o.myEmails: the user's addresses.
     homeEventPeople(ev, ix)         person ids of an event: attendees, then names in the title
                                     (the stories' eventPeople rule; last contact uses it)
     homeIsMeeting(ev, o)            a meeting with someone: another person is invited, the user
                                     has not declined, timed, not free / out of office / focus time /
                                     working location / birthday, not cancelled
     homeMeetings(events, o)         the meetings between o.from and o.to (ms or ISO), deduped, by
                                     start: [{id, title, start, end (ms), date, startMin, endMin,
                                     minutes, attendees, people:[personId], others, myResponse,
                                     organizer: 'me'|'them'|null, join, location, recurring, ev}]
                                     o: {from, to, myEmails, people | ix, dayOf(ms), minOf(ms), filter(ev)}
     homeNextMeeting(list, now, o)   {meeting, inMin, current} for the meeting under way or the next
                                     one within o.horizonH hours (12); list = events or homeMeetings()
     homeEndedMeetings(list, now, o) meetings that ended in the last o.sinceH hours (12), newest
                                     first, without the ones o.isWrapped(id) says are wrapped up
   ============================================================ */
const _MEET_SKIP_TYPES = ['outOfOffice', 'focusTime', 'workingLocation', 'birthday'];
const _MEET_ROOM_RE = /@(group\.calendar|resource\.calendar|group\.v\.calendar|import\.calendar)\.google\.com$/i;

function _meetMs(w) {
  if (!w) return NaN;
  if (typeof w === 'number') return w;
  if (typeof w === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(w) ? _meetDayStart(w) : Date.parse(w);
  if (w.dateTime) return Date.parse(w.dateTime);
  if (w.date) return _meetDayStart(w.date);
  return NaN;
}
// Wall time in the page's zone (Clock, 07-core-clock.js). Node (lib/meet-logic.mjs) has no Clock:
// there the process's zone stands in, or the caller passes o.dayOf / o.minOf.
function _meetDayStart(iso) { return typeof Clock !== 'undefined' ? Clock.at(iso, 0) : Date.parse(iso + 'T00:00:00'); }
function _meetFold(s) {
  return typeof pplFold === 'function' ? pplFold(s) : String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function _meetTitle(ev) { return String((ev && (ev.summary != null ? ev.summary : ev.title)) || '').replace(/\s+/g, ' ').trim(); }
function _meetRich(ev) { return ((ev.attendees || []).length * 2) + (ev.description ? 3 : 0) + (ev.location ? 1 : 0) + (ev.conferenceUrl || ev.hangoutLink ? 2 : 0); }

function homeDedupeEvents(events) {
  const out = [], byKey = new Map();
  for (const ev of Array.isArray(events) ? events : []) {
    if (!ev || !ev.start) continue;
    const st = _meetMs(ev.start), en = _meetMs(ev.end);
    const keys = ['id:' + ev.id];
    if (ev.iCalUID) keys.push('uid:' + ev.iCalUID + '@' + st);
    const t = _meetFold(_meetTitle(ev));
    if (t) keys.push('st:' + st + '-' + en + '|' + t);
    const hit = keys.map(k => byKey.get(k)).find(Boolean);
    if (!hit) {
      const copy = Object.assign({}, ev);
      out.push(copy);
      for (const k of keys) byKey.set(k, copy);
      continue;
    }
    const cals = new Set([...(hit.calendars || (hit.calendarId ? [hit.calendarId] : [])), ...(ev.calendars || (ev.calendarId ? [ev.calendarId] : []))]);
    if (cals.size > 1) hit.calendars = [...cals];
    if (_meetRich(ev) > _meetRich(hit)) {
      for (const k of ['attendees', 'description', 'location', 'conferenceUrl', 'conferenceName', 'organizer', 'selfResponse', 'htmlLink']) if (ev[k] !== undefined) hit[k] = ev[k];
    }
    for (const k of keys) if (!byKey.has(k)) byKey.set(k, hit);
  }
  return out;
}

/* ---------- attendees -> People ---------- */
function meetPeopleIndex(people) {
  const list = Array.isArray(people) ? people.filter(p => p && p.id) : [];
  const idx = typeof pplBuildIndex === 'function' ? pplBuildIndex(list) : null;
  const names = new Map();
  const put = (k, id) => { if (!k || k.length < 3) return; names.set(k, names.has(k) && names.get(k) !== id ? null : id); };
  for (const p of list) {
    if (p.self || p.isSelf || p.inactive) continue;
    put(_meetFold(p.name || ''), p.id);
    for (const a of Array.isArray(p.aliases) ? p.aliases : []) put(_meetFold(a), p.id);
  }
  return { idx, names };
}
function meetAttendeePerson(a, ix) {
  if (!a || !ix || !ix.idx) return null;
  const idx = ix.idx, names = ix.names || new Map();
  const email = String(a.email || '').trim().toLowerCase();
  if (a.personId && idx.byId.has(a.personId) && !idx.self.has(a.personId)) return a.personId;
  if (email && idx.email.get(email)) return idx.self.has(idx.email.get(email)) ? null : idx.email.get(email);
  const nm = _meetFold(String(a.name || '').trim());
  if (nm && names.get(nm)) return names.get(nm);
  if (email) { const local = _meetFold(email.split('@')[0].replace(/[._-]+/g, ' ')); if (names.get(local)) return names.get(local); }
  const hits = a.name && typeof pplMentions === 'function' ? [...new Set(pplMentions(a.name, idx).map(x => x.pid))] : [];
  return hits.length === 1 && !idx.self.has(hits[0]) ? hits[0] : null;
}
/** People of an event: its attendees (meetAttendeePerson), then names in its title. Never the user. */
function homeEventPeople(ev, ix) {
  const out = [];
  if (!ev || !ix || !ix.idx) return out;
  const add = (id) => { if (id && !ix.idx.self.has(id) && !out.includes(id)) out.push(id); };
  for (const a of Array.isArray(ev.attendees) ? ev.attendees : []) add(meetAttendeePerson(a, ix));
  if (typeof pplMentions === 'function') for (const x of pplMentions(_meetTitle(ev), ix.idx)) add(x.pid);
  return out;
}
function _meetMine(o) { return new Set(((o && o.myEmails) || []).map(e => String(e || '').trim().toLowerCase()).filter(Boolean)); }
function homeMeetingAttendees(ev, ix, o) {
  const mine = _meetMine(o);
  const out = [], seen = new Set();
  for (const a of Array.isArray(ev && ev.attendees) ? ev.attendees : []) {
    if (!a) continue;
    const email = String(a.email || '').trim().toLowerCase();
    if (a.self || (email && mine.has(email)) || a.resource || (email && _MEET_ROOM_RE.test(email))) continue;
    const key = email || _meetFold(a.name || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const pid = ix ? meetAttendeePerson(a, ix) : (a.personId || null);
    out.push({ email, name: String(a.name || '').trim(), personId: pid || null, response: a.response || a.responseStatus || 'needsAction', organizer: !!a.organizer, optional: !!a.optional });
  }
  return out;
}
function _meetMyResponse(ev, mine) {
  if (ev.selfResponse) return ev.selfResponse;
  const me = (ev.attendees || []).find(a => a && (a.self || mine.has(String(a.email || '').trim().toLowerCase())));
  return me ? (me.response || me.responseStatus || 'needsAction') : null;
}
function homeIsMeeting(ev, o) {
  if (!ev || !ev.start || ev.status === 'cancelled') return false;
  if (ev.allDay || ev.start.date || ev.free || _MEET_SKIP_TYPES.includes(ev.eventType)) return false;
  const mine = _meetMine(o);
  if (_meetMyResponse(ev, mine) === 'declined') return false;
  return homeMeetingAttendees(ev, null, o).length > 0;
}
function _meetLocalDay(ms) {
  if (typeof Clock !== 'undefined') return Clock.parts(ms).iso;
  const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); // clock-ok: Node fallback
}
function _meetLocalMin(ms) {
  if (typeof Clock !== 'undefined') { const p = Clock.parts(ms); return p.h * 60 + p.mi; }
  const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); // clock-ok: Node fallback
}
function homeMeetings(events, o) {
  o = o || {};
  const from = o.from != null ? _meetMs(o.from) : -Infinity, to = o.to != null ? _meetMs(o.to) : Infinity;
  const ix = o.ix || (o.people ? meetPeopleIndex(o.people) : null);
  const mine = _meetMine(o);
  const dayOf = typeof o.dayOf === 'function' ? o.dayOf : _meetLocalDay;
  const minOf = typeof o.minOf === 'function' ? o.minOf : _meetLocalMin;
  const out = [];
  for (const ev of homeDedupeEvents(events)) {
    if (!homeIsMeeting(ev, o)) continue;
    if (o.filter && !o.filter(ev)) continue;
    const start = _meetMs(ev.start), end = Math.max(start, _meetMs(ev.end) || start);
    if (!Number.isFinite(start) || end <= from || start >= to) continue;
    const attendees = homeMeetingAttendees(ev, ix, o);
    const org = ev.organizer ? (ev.organizer.self || mine.has(String(ev.organizer.email || '').toLowerCase()) ? 'me' : 'them') : null;
    const startMin = minOf(start);
    out.push({
      id: ev.id, title: _meetTitle(ev) || '(no title)', start, end, date: dayOf(start), startMin,
      endMin: dayOf(end) === dayOf(start) ? minOf(end) : 24 * 60, minutes: Math.round((end - start) / 60000),
      attendees, people: [...new Set(attendees.map(a => a.personId).filter(Boolean))], others: attendees.length,
      myResponse: _meetMyResponse(ev, mine), organizer: org, join: ev.conferenceUrl || ev.hangoutLink || '', location: ev.location || '',
      recurring: !!ev.recurring, ev,
    });
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end || a.title.localeCompare(b.title));
}
function _meetList(list, o) { return (Array.isArray(list) ? list : []).length && list[0] && list[0].ev ? list : homeMeetings(list, o); }
function homeNextMeeting(list, now, o) {
  o = o || {};
  const t = _meetMs(now);
  const horizon = t + (Number.isFinite(o.horizonH) ? o.horizonH : 12) * 3600000;
  const ms = _meetList(list, o).filter(m => m.end > t && m.start < horizon);
  const cur = ms.find(m => m.start <= t);
  const m = cur || ms[0];
  return m ? { meeting: m, inMin: Math.max(0, Math.round((m.start - t) / 60000)), current: !!cur } : null;
}
function homeEndedMeetings(list, now, o) {
  o = o || {};
  const t = _meetMs(now), since = t - (Number.isFinite(o.sinceH) ? o.sinceH : 12) * 3600000;
  return _meetList(list, o).filter(m => m.end <= t && m.end > since && !(typeof o.isWrapped === 'function' && o.isWrapped(m.id)))
    .sort((a, b) => b.end - a.end);
}

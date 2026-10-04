/* ============================================================
   MEETINGS AND LAST CONTACT on the page. Owner: W0-B (shared time and
   people logic). The rules are pure: 12-home-meet-logic.js (meetings,
   attendees -> People) and 53-people-contact-logic.js (last contact); the
   server runs the same files (lib/meet-logic.mjs, lib/people-contact.mjs).
   This file only feeds them the page's data. Nothing here fetches in a
   render except the inbox's usual first load.

     homeMeetIndex()                    meetPeopleIndex(state.people), memoised
     homeMeetingsBetween(from, to, o)   homeMeetings over the calendar store: the user's own day
                                        (calEventIsMine), deduped, attendees matched to People.
                                        from / to: ms, Date or ISO. o: {filter(ev)}
     homeMeetingsOn(iso)                that day's meetings
     homeNextMeetingNow(o)              homeNextMeeting from now (o.horizonH, default 12)
     homeMeetingsToWrap(o)              ended in the last o.sinceH hours (12), not wrapped up
                                        (calIsWrapped, 43-calendar-meta.js), newest first
     peopleLastContact()                Map personId -> {date, kind, daysAgo}, memoised
     personLastContact(p | id)          {date, kind, daysAgo, label} | null, label like
                                        '3 days ago · meeting'
   ============================================================ */
let _pcIxKey = null, _pcIx = null;
function homeMeetIndex() {
  const people = Array.isArray(state.people) ? state.people : [];
  const key = people.length + ':' + people.map(p => p && [p.id, p.name, (p.aliases || []).join('|'), (p.emails || []).join('|'), p.email, p.self ? 1 : 0, p.inactive ? 1 : 0].join(',')).join(';');
  if (key !== _pcIxKey || !_pcIx) { _pcIxKey = key; _pcIx = meetPeopleIndex(people); }
  return _pcIx;
}
function _pcEvents() {
  if (typeof CalStore === 'undefined' || !CalStore || !CalStore.data || typeof calAllEvents !== 'function') return [];
  return calAllEvents().filter(ev => ev && (typeof calEventIsMine !== 'function' || calEventIsMine(ev)));
}
function _pcMyEmails() { return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.myEmails) || []; }
function homeMeetingsBetween(from, to, o) {
  o = o || {};
  const ms = (x) => (x instanceof Date ? x.getTime() : x);
  return homeMeetings(_pcEvents(), { from: ms(from), to: ms(to), myEmails: _pcMyEmails(), ix: homeMeetIndex(), filter: o.filter });
}
function homeMeetingsOn(iso) {
  const day = String(iso || todayStr());
  return homeMeetingsBetween(Clock.at(day, 0), Clock.at(Clock.addDays(day, 1), 0));
}
function homeNextMeetingNow(o) {
  o = o || {};
  const now = Date.now();
  const h = Number.isFinite(o.horizonH) ? o.horizonH : 12;
  return homeNextMeeting(homeMeetingsBetween(now - 12 * 3600000, now + h * 3600000), now, { horizonH: h });
}
function homeMeetingsToWrap(o) {
  o = o || {};
  const now = Date.now();
  const h = Number.isFinite(o.sinceH) ? o.sinceH : 12;
  return homeEndedMeetings(homeMeetingsBetween(now - h * 3600000 - 12 * 3600000, now), now, { sinceH: h, isWrapped: typeof calIsWrapped === 'function' ? calIsWrapped : null });
}

/* ---------- last contact ---------- */
let _pcLastKey = null, _pcLast = null;
function peopleLastContact() {
  const cal = typeof CalStore !== 'undefined' && CalStore && CalStore.data ? CalStore.data.fetchedAt || 'c' : '';
  const inb = typeof InboxStore !== 'undefined' && InboxStore && InboxStore.data ? InboxStore.data.fetchedAt || 'i' : '';
  const key = [state._lastSave || 0, cal, inb, todayStr(), Clock.zone(), Math.floor(Date.now() / 600000), _pcIxKey].join('|');
  if (key === _pcLastKey && _pcLast) return _pcLast;
  const ix = homeMeetIndex();
  const now = Date.now(), today = todayStr();
  const pastEvents = [];
  for (const ev of _pcEvents()) {
    if (typeof calEventEnd !== 'function' || calEventEnd(ev).getTime() > now || ev.allDay) continue;
    const people = homeEventPeople(ev, ix);
    if (people.length) pastEvents.push({ date: Clock.parts(calEventStart(ev).getTime()).iso, people });
  }
  const emails = [];
  if (typeof InboxStore !== 'undefined' && InboxStore) {
    if (typeof _serverAvailable !== 'undefined' && _serverAvailable && InboxStore.st && !InboxStore.st.loaded && !InboxStore.st.loading) { try { InboxStore.load(); } catch (e) { /* later */ } }
    const msgs = InboxStore.data && Array.isArray(InboxStore.data.messages) ? InboxStore.data.messages : [];
    for (const m of msgs) {
      const addr = m && m.from && m.from.email ? String(m.from.email).toLowerCase() : '';
      const pid = addr && ix.idx ? ix.idx.email.get(addr) : null;
      if (pid && !ix.idx.self.has(pid) && m.date) { const t = Date.parse(m.date); if (Number.isFinite(t)) emails.push({ personId: pid, date: Clock.parts(t).iso }); }
    }
  }
  const notes = [];
  for (const p of Array.isArray(state.people) ? state.people : []) for (const n of (p && Array.isArray(p.notes) ? p.notes : [])) if (n && n.ts) notes.push({ personId: p.id, date: Clock.parts(new Date(n.ts).getTime()).iso });
  const doneTasks = [];
  const pidx = typeof pplIndex === 'function' ? pplIndex() : ix.idx;
  for (const t of Array.isArray(state.custom) ? state.custom : []) {
    const log = t && state.completionLog && state.completionLog[t.id];
    if (!Array.isArray(log) || !log.length || (state.deleted && state.deleted[t.id])) continue;
    const ts = Math.max(...log.map(Number).filter(Number.isFinite));
    if (Number.isFinite(ts) && ts <= now) doneTasks.push({ date: Clock.parts(ts).iso, people: pplLinked(state, t, pidx) });
  }
  _pcLast = lastContactMap({ today, pastEvents, emails, notes, doneTasks, includeToday: true });
  _pcLastKey = key;
  return _pcLast;
}
function personLastContact(p) {
  const id = typeof p === 'string' ? p : p && p.id;
  if (!id) return null;
  const c = peopleLastContact().get(id);
  if (!c) return null;
  const d = c.daysAgo;
  const ago = d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 14 ? `${d} days ago` : d < 60 ? `${Math.round(d / 7)} weeks ago` : `${Math.round(d / 30)} months ago`;
  return Object.assign({}, c, { label: `${ago} · ${c.kind}` });
}

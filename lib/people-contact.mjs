// lib/people-contact.mjs - "last contact" for Node: re-exports the pure rule of
// src/app/53-people-contact-logic.js (through lib/meet-logic.mjs, which
// evaluates it) and adds the server-side gathering for one state + data folder.
//
//   lastContactFromData(q, {today, days}) -> Map personId -> {date, kind, daysAgo}
//     q = the actions query context ({s, cfg, clock, paths}); reads the merged
//     calendar (past events, the user's own day) and inbox exactly like the
//     calendar.list / inbox.list queries, plus notes on people and completed
//     tasks linked to them. Never throws: a source it cannot read is skipped.

import { lastContactMap, lastContactFor, contactDaysAgo, contactDue, CONTACT_KINDS, homeEventPeople, meetPeopleIndex } from './meet-logic.mjs';
import { pplBuildIndex, pplLinked } from './people-tags.mjs';

export { lastContactMap, lastContactFor, contactDaysAgo, contactDue, CONTACT_KINDS };

function dayInTz(ms, tz) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Number(ms))); }
  catch { return new Date(Number(ms)).toISOString().slice(0, 10); }
}
function addDays(iso, n) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }

/** Notes on people and completed tasks with them, from the state alone. */
export function contactSourcesFromState(s, { tz = 'UTC' } = {}) {
  s = s || {};
  const idx = pplBuildIndex(s.people);
  const notes = [];
  for (const p of Array.isArray(s.people) ? s.people : []) {
    if (!p || !p.id) continue;
    for (const n of Array.isArray(p.notes) ? p.notes : []) if (n && n.ts) notes.push({ personId: p.id, date: dayInTz(n.ts, tz) });
  }
  const doneTasks = [];
  const log = s.completionLog || {};
  for (const t of Array.isArray(s.custom) ? s.custom : []) {
    const stamps = t && log[t.id];
    if (!Array.isArray(stamps) || !stamps.length || (s.deleted && s.deleted[t.id])) continue;
    const last = Math.max(...stamps.map(Number).filter(Number.isFinite));
    if (!Number.isFinite(last)) continue;
    doneTasks.push({ date: dayInTz(last, tz), people: pplLinked(s, t, idx) });
  }
  return { notes, doneTasks };
}

export async function lastContactFromData(q, { today, days = 90 } = {}) {
  const s = (q && q.s) || {};
  const tz = (q && q.cfg && q.cfg.timezone) || (q && q.clock && q.clock.timezone) || 'UTC';
  today = today || (q && q.clock && q.clock.today);
  const ix = meetPeopleIndex(s.people);
  const pastEvents = [], emails = [];
  try {
    const { CALENDAR_QUERIES } = await import('../server/actions/calendar-queries.mjs');
    const cal = CALENDAR_QUERIES.find(x => x.name === 'calendar.list');
    // calendar.list allows at most 92 days a call: read back in steps.
    for (let to = addDays(today, -1), left = days; left > 0; ) {
      const span = Math.min(left, 90);
      const from = addDays(to, -span + 1);
      const r = await cal.run(q, { from, to, mine: true });
      for (const e of r.events || []) if (e && e.date < today) pastEvents.push({ date: e.date, people: homeEventPeople({ title: e.title, attendees: e.attendees }, ix) });
      left -= span; to = addDays(from, -1);
    }
  } catch { /* no calendar: skipped */ }
  try {
    const { CALENDAR_QUERIES } = await import('../server/actions/calendar-queries.mjs');
    const inbox = CALENDAR_QUERIES.find(x => x.name === 'inbox.list');
    const r = await inbox.run(q, { days: 60, limit: 100 });
    for (const t of r.threads || []) if (t && t.personId && t.date) emails.push({ personId: t.personId, date: String(t.date).slice(0, 10) });
  } catch { /* no inbox: skipped */ }
  return lastContactMap({ today, pastEvents, emails, ...contactSourcesFromState(s, { tz }) });
}

/* ============================================================
   LAST CONTACT (pure). Owner: W0-B (shared people logic).
   When the user was last in touch with each person, and how: one rule for
   the page (53-people-contact.js: personLastContact, Keep in touch), the
   stories (lib/story-data.mjs peopleOfDay) and the server (person.get), via
   lib/people-contact.mjs. No DOM, no page globals.

   Touches are already matched to people by the caller:
     pastEvents  [{date, people:[personId]}]     meetings that happened
     emails      [{personId, date}]              mail from them (date or ISO time)
     notes       [{personId, date}]              notes on the person
     doneTasks   [{date, people:[personId]}]     tasks with them that were completed
     today       'YYYY-MM-DD': later touches do not count, and meetings only before
                 today (the stories' rule: today's are not over yet) unless
                 includeToday is true (the page passes only meetings that have ended)
   The latest day wins; on the same day a meeting beats an email, an email a
   note, a note a task (the order the stories always used).

     CONTACT_KINDS                     ['meeting', 'email', 'note', 'task']
     lastContactMap(src)               Map personId -> {date, kind, daysAgo}
     lastContactFor(personId, src)     {date, kind, daysAgo} | null
     contactDaysAgo(date, today)       whole days from date to today
     contactDue(last, everyDays, today, snoozedUntil)
                                       {due, overdueBy, nextOn}: is a "keep in touch every N
                                       days" person due a message (Keep in touch)
   ============================================================ */
const CONTACT_KINDS = Object.freeze(['meeting', 'email', 'note', 'task']);
function _ctDay(v) {
  const s = String(v == null ? '' : v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}
function _ctNo(iso) { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); }
function contactDaysAgo(date, today) { return date && today ? _ctNo(today) - _ctNo(date) : null; }
function _ctAddDays(iso, n) { const d = new Date(Date.UTC(...iso.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0))) + n * 86400000); return d.toISOString().slice(0, 10); } // clock-ok: UTC civil date (no zone)

function lastContactMap(src) {
  src = src || {};
  const today = _ctDay(src.today);
  const last = new Map();
  const touch = (id, date, kind, strictBefore) => {
    const d = _ctDay(date);
    if (!id || !d || (today && (strictBefore ? d >= today : d > today))) return;
    const cur = last.get(id);
    if (!cur || d > cur.date) last.set(id, { date: d, kind });
  };
  for (const ev of Array.isArray(src.pastEvents) ? src.pastEvents : []) {
    if (!ev) continue;
    for (const id of Array.isArray(ev.people) ? ev.people : []) touch(id, ev.date, 'meeting', !src.includeToday);
  }
  for (const m of Array.isArray(src.emails) ? src.emails : []) if (m) touch(m.personId, m.date, 'email');
  for (const n of Array.isArray(src.notes) ? src.notes : []) if (n) touch(n.personId, n.date, 'note');
  for (const t of Array.isArray(src.doneTasks) ? src.doneTasks : []) {
    if (!t) continue;
    for (const id of Array.isArray(t.people) ? t.people : []) touch(id, t.date, 'task');
  }
  for (const v of last.values()) v.daysAgo = today ? contactDaysAgo(v.date, today) : null;
  return last;
}
function lastContactFor(personId, src) { return lastContactMap(src).get(personId) || null; }
/**
 * Keep in touch: last = lastContactFor(...) (or null), everyDays = how often.
 * -> {due, overdueBy (days past the interval; 0 = today), nextOn ('YYYY-MM-DD' | null)}
 */
function contactDue(last, everyDays, today, snoozedUntil) {
  const every = Number(everyDays);
  const t = _ctDay(today);
  if (!t || !(every > 0)) return { due: false, overdueBy: 0, nextOn: null };
  const snooze = _ctDay(snoozedUntil);
  if (snooze && snooze > t) return { due: false, overdueBy: 0, nextOn: snooze };
  if (!last || !last.date) return { due: true, overdueBy: 0, nextOn: t };
  const nextOn = _ctAddDays(last.date, every);
  const by = _ctNo(t) - _ctNo(nextOn);
  return { due: by >= 0, overdueBy: Math.max(0, by), nextOn };
}

// lib/calendar-visibility.mjs - which calendar events the user sees, and which
// of them make up the user's OWN day. One rule for the whole server:
//   calendar.list / list_calendar (server/actions/calendar-queries.mjs), and
//   through it the stories, the Home hero's story data (lib/story-data.mjs) and
//   brief.get (server/actions/queries-brief.mjs); autolink (lib/autolink.mjs).
// The page keeps the same rule in src/app/40-calendar.js (calCalendars,
// calEventVisible, calEventIsMine, calEventUntitled); calEntriesOn applies the
// "mine" part for Home and the brief. tests/calendar-visibility.test.mjs.
//
//   shown     the Calendar page's rule. A calendar is on when the user switched it on
//             (state.calPrefs.hidden['cal:<id>'] === false), off when they switched it
//             off (true), else it has its default (calendar.defaultOn, from
//             lib/sources.mjs calendarDefaultOn: the user's own, group, holiday and
//             imported calendars on; other people's off, by config.myEmails).
//             An event shows when one of its calendars is on.
//   mine      the user's own day (stories, brief, Home): shown, not declined, and either
//             in one of the user's own calendars that is on, or the user is invited
//             (an attendee or the organiser address is in config.myEmails). Someone
//             else's calendar that the user switched on shows in the Calendar only: its
//             meetings are not "next up" for the user.
//   untitled  an event with no real title ("(no title)": private busy blocks). It is
//             busy time, never a name to say.
//
// Pure, no I/O. Works on raw events (lib/calendar.mjs normaliseEvent: summary,
// calendars/calendarId, attendees [{email, response}], organizer, selfResponse) and
// on calendar.list events (title, myResponse).

/** The calPrefs.hidden key of a calendar ('google' is an old snapshot's single calendar). */
export function calendarPrefKey(id) { return id === 'google' ? 'google' : 'cal:' + id; }

/** state.calPrefs.hidden, or {} */
export function calendarHiddenPrefs(state) {
  const p = state && state.calPrefs;
  return p && p.hidden && typeof p.hidden === 'object' && !Array.isArray(p.hidden) ? p.hidden : {};
}

/** Is this calendar switched on? The user's toggle wins; else its default. */
export function isCalendarShown(cal, hidden = {}) {
  if (!cal || cal.id == null) return false;
  const k = calendarPrefKey(cal.id);
  return Object.prototype.hasOwnProperty.call(hidden, k) ? hidden[k] !== true : cal.defaultOn !== false;
}

/** The calendar ids an event is in ('google' for an old snapshot without them, as the page does). */
export function eventCalendarIds(ev) {
  if (!ev) return [];
  if (Array.isArray(ev.calendars) && ev.calendars.length) return ev.calendars;
  return ev.calendarId ? [ev.calendarId] : ['google'];
}

const NO_TITLE_RE = /^\(?\s*(no title|untitled|busy|no subject)\s*\)?$/i;
/** True for an event without a real title: empty, "(no title)", "(busy)". */
export function isUntitledEvent(ev) {
  const t = String((ev && (ev.summary ?? ev.title)) ?? '').replace(/\s+/g, ' ').trim();
  return !t || NO_TITLE_RE.test(t);
}

/** The user said no (raw selfResponse, or calendar.list's myResponse). */
export function isDeclinedEvent(ev) {
  return !!ev && (ev.selfResponse === 'declined' || ev.myResponse === 'declined');
}

const lowerSet = (list) => new Set((Array.isArray(list) ? list : []).map(x => String(x || '').trim().toLowerCase()).filter(Boolean));

/** Is one of the user's addresses invited (and not declining), or the organiser? */
export function isUserInvited(ev, myEmails) {
  const mine = myEmails instanceof Set ? myEmails : lowerSet(myEmails);
  if (!ev || !mine.size) return false;
  const addr = (x) => String((x && x.email) || '').trim().toLowerCase();
  if (ev.organizer && mine.has(addr(ev.organizer))) return true;
  return (Array.isArray(ev.attendees) ? ev.attendees : []).some(a => a && mine.has(addr(a)) && (a.response || a.responseStatus) !== 'declined');
}

/**
 * The rule for one calendar list and state:
 *   calendarRules({calendars, state, myEmails}) -> {shown(ev), mine(ev), isShown(calId), hiddenIds:Set}
 * calendars: [{id, defaultOn}] (lib/calendar-sources.mjs mergeCalendarData). Without a
 * calendar list (an old snapshot, demo data) every event shows and is the user's.
 */
export function calendarRules({ calendars = [], state = {}, myEmails = [] } = {}) {
  const hidden = calendarHiddenPrefs(state);
  const byId = new Map((Array.isArray(calendars) ? calendars : []).filter(c => c && c.id != null).map(c => [c.id, c]));
  const on = new Map([...byId.values()].map(c => [c.id, isCalendarShown(c, hidden)]));
  const my = lowerSet(myEmails);
  const shown = (ev) => {
    if (!ev) return false;
    if (!byId.size) return true;
    return eventCalendarIds(ev).some(id => on.get(id) === true);
  };
  const mine = (ev) => {
    if (!shown(ev) || isDeclinedEvent(ev)) return false;
    if (!byId.size) return true;
    if (eventCalendarIds(ev).some(id => on.get(id) === true && byId.get(id).defaultOn !== false)) return true;
    return isUserInvited(ev, my);
  };
  return { shown, mine, isShown: (id) => on.get(id) === true, hiddenIds: new Set([...on].filter(([, v]) => !v).map(([k]) => k)) };
}

/**
 * The events the user sees: visibleEvents(cfg, state, events, calendars, {mine}).
 * mine: true -> only the user's own day (see above), declined ones left out.
 */
export function visibleEvents(cfg, state, events, calendars, { mine = false } = {}) {
  const r = calendarRules({ calendars, state, myEmails: (cfg && cfg.myEmails) || [] });
  return (Array.isArray(events) ? events : []).filter(e => e && (mine ? r.mine(e) : r.shown(e)));
}

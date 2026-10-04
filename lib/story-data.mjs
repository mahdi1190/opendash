// lib/story-data.mjs - the structured day model the full-screen stories render
// (owner: Story engine). One model per kind:
//
//   'morning'  today: weather, schedule with scene types and people, focus tasks,
//              deadlines, waiting-on, people of the day, money, free gaps, suggestions
//   'evening'  today so far: what got done, meetings held, what slipped, tomorrow,
//              streak, people met + tomorrow's people, money, suggestions
//   'week'     the review week: completions per day and stream, wins, slips and
//              reasons, next week's load, deadlines and people, money, suggestions
//
// buildStoryData(q, kind, {weather, now}) reads through the actions query
// context q = {s, cfg, clock, paths, financeDir} (server/routes/story.mjs makes
// one), so the calendar, inbox and finance files are read exactly like the
// actions layer reads them. peopleOfDay() is pure (tests call it directly).
//
// Every item a story can point at carries a stable `ref` (task id, event id,
// person id, 'cd:<id>' for a countdown), and data.entities lists them all:
// lib/story-script.mjs only lets a script name entities from that list.
// Event and task text is untrusted data: it is never interpreted, only shown
// (escaped by the page) and given to the model as data.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from './fsutil.mjs';
import { CALENDAR_QUERIES, eventMinutesOn } from '../server/actions/calendar-queries.mjs';
import { focusTasks, widgetList } from './home-topbar.mjs';
import { moneyLine, readAnimAi } from './brief-store.mjs';
import {
  animClassify, briefDayType, briefHeadline, briefMin, briefHM, briefGaps, briefTimeOfDay, briefRollover, briefStreak,
  briefAddDays, briefDaysBetween, briefWeekday, reviewWeekRange, reviewWeekStats, reviewCapacity,
  BRIEF_MEETING_TYPES, BRIEF_CELEBRATE_TYPES,
} from './brief-logic.mjs';
import { pplBuildIndex, pplMentions, pplLinked, pplIsWaiting, pplFold, pplIsSelf } from './people-tags.mjs';
import { isUntitledEvent, isDeclinedEvent } from './calendar-visibility.mjs';
import { planWorkHours } from './plan-logic.mjs';
import { lastContactMap } from './meet-logic.mjs';

export const STORY_KINDS = Object.freeze(['morning', 'evening', 'week']);
export const ENTITY_TYPES = Object.freeze(['person', 'task', 'event', 'time', 'place', 'money', 'deadline']);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const clip = (v, n) => { const s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
/**
 * A title short enough to say and show in a sentence: the part before a colon,
 * semicolon, " - " or bracket when that is a real name, at most `max` characters
 * on a word boundary. "Launch plan: budget, risks; sign-off" -> "Launch plan".
 */
export function shortTitle(t, max = 56) {
  let s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  // A colon between digits ("1:1", "10:30") is part of the name, not a separator.
  const head = s.split(/\s*(?::(?!\d)|;|\s[–—-]\s|\(|\[|\|)\s*/)[0];
  if (head.length >= 8 && head.length < s.length) s = head;
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '');
  return s.replace(/[\s,.;:–—-]+$/, '');
}

// Words a spoken title should not end on ("... for the", "... and").
const TAIL_WORDS = new Set(('a an the and or nor but of for to with in on at by from via into onto about over under per as than then so if '
  + 'near during within without around across behind between through towards toward against among beyond like since after before until '
  + 'my your our their his her its this that these those vs versus incl including plus & + / - – —').split(' '));
// "Re:", "Fwd:", "Reminder:": a label that says nothing about the thing itself.
const NOISE_LABEL = /^(re|fw|fwd|reminder|todo|to-?do|task|note|action|fyi|urgent|important|asap)$/i;
// Where a long title can stop: before a clause or a prepositional tail.
const CUT_BEFORE = /,\s+|;\s+|\s+(?:and|or|but|then|so|plus|\+|&|for|to|with|in|on|at|by|from|via|into|about|near|during|within|without|through|before|after|until|because|while|which|that|including|incl\.?|the|a|an)\s+/gi;
const CUT_CLAUSE = /,\s+|;\s+|\s+(?:and|or|but|then|so|plus|\+|&)\s+/gi;
const realName = (x) => x.length >= 8 && /\p{L}/u.test(x);
function trimTail(s) {
  let out = s.replace(/[\s,.;:!?–—\-/&+]+$/, '');
  for (let i = 0; i < 6; i++) {
    const m = /\s+(\S+)$/.exec(out);
    if (!m || !TAIL_WORDS.has(m[1].toLowerCase())) break;
    out = out.slice(0, m.index).replace(/[\s,.;:!?–—\-/&+]+$/, '');
  }
  return out;
}
/**
 * A title the stories can say in a sentence and show on a chip: the real name
 * of the thing, cut at a natural boundary, never with a dangling tail.
 *   "Acme: register for the supplier portal for the 2027/28 framework contract (deadline 5 Oct)"
 *     -> "Acme – register for the supplier portal"
 *   "Upload the signed forms to the team drive and send everyone the link to the folder"
 *     -> "Upload the signed forms to the team drive"
 *   "Thesis package: comments, rows; freeze" -> "Thesis package"     "Re: lunch plans" -> "lunch plans"
 * Steps: asides in brackets go; the head before " - ", " | " or ";" when it is a real
 * name; a colon label (not "10:30") is the name when it is a real one, a noise word
 * ("Re", "Fwd") is dropped, a short tag ("Acme") is joined with an en dash so the
 * sentence never gets a second colon; then, when still longer than `max`, the cut is
 * before the last ", " / "and" / preposition that leaves a real name, else at a word;
 * tail words ("for the", "and") and punctuation are trimmed. No ellipsis: it is spoken.
 */
export function speakableTitle(t, max = 48) {
  let s = String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const full = s;
  const unbracketed = s.replace(/\s*[([{][^()[\]{}]*[)\]}]/g, '').replace(/\s+([,.;:!?])/g, '$1').replace(/^[\s,.;:–—-]+/, '').replace(/\s+/g, ' ').trim();
  if (realName(unbracketed)) s = unbracketed;
  const head = s.split(/\s+[–—-]\s+|\s*\|\s*|\s*;\s*/)[0].trim();
  if (head !== s && realName(head)) s = head;
  const colon = /^(.*?)\s*:(?!\d)\s*(.+)$/.exec(s);
  if (colon) {
    const label = colon[1].trim(), rest = colon[2].trim();
    if (NOISE_LABEL.test(label)) s = rest;
    else if (realName(label)) s = label;
    else if (label && rest) s = `${label} – ${rest}`;
  }
  if (s.length > max) {
    // The last boundary that fits: a clause ("," "and" "+") when it leaves at least half
    // of max, else any boundary (a preposition, an article) that leaves a real name.
    const lastCut = (re, minLen) => {
      let best = -1;
      for (const m of s.matchAll(re)) {
        if (m.index > max) break;
        const pre = s.slice(0, m.index);
        if (pre.length >= minLen && pre.trim().split(/\s+/).length >= 2) best = m.index;
      }
      return best;
    };
    const clause = lastCut(CUT_CLAUSE, Math.max(16, Math.floor(max / 2)));
    const best = clause > 0 ? clause : lastCut(CUT_BEFORE, 16);
    s = best > 0 ? s.slice(0, best) : s.slice(0, max + 1).replace(/\s+\S*$/, '');
  }
  s = trimTail(s);
  return s || trimTail(full.slice(0, max + 1).replace(/\s+\S*$/, '')) || full.slice(0, max);
}

/** How a due day is said: 'today', 'tomorrow', else the weekday ("Monday"). */
export function dueDayWord(due, today, weekday) {
  if (due && today && due === today) return 'today';
  if (due && today && due === briefAddDays(today, 1)) return 'tomorrow';
  return weekday || (due ? WEEKDAYS[briefWeekday(due)] : 'soon');
}

/**
 * A reason the user gave for moving a task, or null. The labels the page writes
 * itself ("Moved on Home", "Snoozed", "Weekly review") say where, not why.
 */
export function userReason(r) {
  const s = String(r == null ? '' : r).replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
  if (!s || /^no reason given$/i.test(s)) return null;
  if (/^(moved|cleared|removed|rescheduled|dragged|dropped)\b.*\b(on|in|from|to)\b/i.test(s) && s.split(' ').length <= 5) return null;
  if (/^(snoozed|weekly review(:.*)?|chase \(weekly review\))$/i.test(s)) return null;
  return s;
}
const dueOf = (t) => (t && (t.dueDate || t.due)) || null;
const isDeleted = (s, t) => !!(s.deleted && s.deleted[t.id]);
const statusOf = (s, t) => (s.statuses && s.statuses[t.id]) || 'todo';
const isOpenTask = (s, t) => t && t.id && !isDeleted(s, t) && statusOf(s, t) !== 'done';
const WAIT_TAG = /^(waiting|waiting-on|awaiting|blocked)(-|$)/;
function isWaitingTask(s, t) {
  if (!isOpenTask(s, t)) return false;
  if (statusOf(s, t) === 'waiting' || t.waitingOn || t.waiting === true) return true;
  return (Array.isArray(t.tags) ? t.tags : []).some(x => WAIT_TAG.test(String(x))) || pplIsWaiting(t);
}
const FOLLOW_RE = /\b(follow[\s-]?up|chase|nudge|remind|reply|respond|get back to|check in|ping)\b/i;
function isFollowUp(t) {
  if (FOLLOW_RE.test(String(t.title || ''))) return true;
  return (Array.isArray(t.tags) ? t.tags : []).some(x => /^(follow-?up|chase|reply)/i.test(String(x)));
}
function streamLabel(s, id) {
  const st = (Array.isArray(s.streams) ? s.streams : []).find(x => x && x.id === id);
  return st ? clip(st.label, 40) : (id ? clip(id, 40) : null);
}
function dayInTz(ms, tz) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Number(ms))); }
  catch { return new Date(Number(ms)).toISOString().slice(0, 10); }
}
function clockIn(now, tz) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(x => [x.type, x.value]));
    return { today: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  } catch { const iso = now.toISOString(); return { today: iso.slice(0, 10), time: iso.slice(11, 16) }; }
}
function durText(min) {
  const h = Math.floor(min / 60), r = min % 60;
  if (!h) return `${r} minutes`;
  if (!r) return h === 1 ? 'an hour' : `${h} hours`;
  if (r === 30) return h === 1 ? 'an hour and a half' : `${h} and a half hours`;
  return `${h === 1 ? 'an hour' : `${h} hours`} and ${r} minutes`;   // said aloud: words, not "4 h 15 min"
}
function moneyText(n, currency) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP', maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2 }).format(n); }
  catch { return `${Math.round(n)} ${currency || ''}`.trim(); }
}

/* ---------------- people of the day (pure) ---------------- */

/** Folded name/alias -> person id, for attendee display names ("Sam Taylor", "samt"). Ambiguous keys map to null. */
function nameIndex(people) {
  const m = new Map();
  const put = (k, id) => { if (!k || k.length < 3) return; m.set(k, m.has(k) && m.get(k) !== id ? null : id); };
  for (const p of people) {
    if (!p || !p.id || pplIsSelf(p)) continue;
    put(pplFold(p.name || ''), p.id);
    for (const a of Array.isArray(p.aliases) ? p.aliases : []) put(pplFold(a), p.id);
  }
  return m;
}
/** Person ids of one attendee: address first, then the display name, then a unique name inside it. */
export function matchAttendee(a, idx, names) {
  if (!a) return null;
  const email = String(a.email || '').trim().toLowerCase();
  if (a.personId && idx.byId.has(a.personId) && !idx.self.has(a.personId)) return a.personId;
  if (email && idx.email.get(email)) return idx.self.has(idx.email.get(email)) ? null : idx.email.get(email);
  const nm = pplFold(String(a.name || '').trim());
  if (nm && names.get(nm)) return names.get(nm);
  if (email) { const local = pplFold(email.split('@')[0].replace(/[._-]+/g, ' ')); if (names.get(local)) return names.get(local); }
  const hits = a.name ? [...new Set(pplMentions(a.name, idx).map(x => x.pid))] : [];
  return hits.length === 1 && !idx.self.has(hits[0]) ? hits[0] : null;
}
/** People of an event: attendees (email, alias, name) then names in the title. Never the user. */
export function eventPeople(ev, idx, names) {
  const out = [];
  const add = (id) => { if (id && !idx.self.has(id) && !out.includes(id)) out.push(id); };
  for (const a of Array.isArray(ev.attendees) ? ev.attendees : []) add(matchAttendee(a, idx, names));
  for (const x of pplMentions(ev.title || ev.summary || '', idx)) add(x.pid);
  return out;
}
const CELEBRATE_RE = /\b(birthday|bday|b-day|anniversary|wedding|party|celebrat\w*|graduation)\b/i;

/**
 * Who matters today, and why.
 *   state       the dashboard state (people, custom, statuses, deleted, completionLog, notes on people)
 *   events      events in the window: [{id, title, date, start 'HH:MM', end, allDay, type, attendees:[{name,email,personId}]}]
 *   today       ISO date; horizon (ISO) = last day that counts as "due" (default today)
 *   focusIds    the focus task ids (their people are included)
 *   pastEvents  earlier events (same shape) for "last contact"
 *   inbox       [{personId, date}] recent email threads, for "last contact"
 *   tz          the user's time zone (completion timestamps -> dates)
 * -> [{id, name, first, role, org, color, avatarUrl, kind, meetings, celebration, owe, waiting, followUps,
 *      focus, lastContact, reasons, why, score}]  best first, at most `max`.
 */
export function peopleOfDay({ state, events = [], today, horizon, focusIds = [], pastEvents = [], inbox = [], tz = 'UTC', max = 6 } = {}) {
  const s = state || {};
  const people = (Array.isArray(s.people) ? s.people : []).filter(p => p && p.id && !pplIsSelf(p) && !p.inactive);
  const idx = pplBuildIndex(s.people);
  const names = nameIndex(people);
  const until = horizon || today;
  const rec = new Map();
  const get = (id) => {
    const pp = idx.byId.get(id);
    if (!pp || pp.inactive || idx.self.has(id)) return null;   // archived people never show up
    let r = rec.get(id);
    if (!r) { r = { meetings: [], celebration: null, owe: [], waiting: [], followUps: [], focus: [], include: false, score: 0 }; rec.set(id, r); }
    return r;
  };
  // Meetings and celebrations in the window.
  for (const ev of events) {
    if (!ev || ev.myResponse === 'declined') continue;
    // Shaped events (shapeEvents) already carry their matched people; raw ones are matched here.
    const ids = Array.isArray(ev.people) ? ev.people.filter(id => typeof id === 'string' && !idx.self.has(id)) : eventPeople(ev, idx, names);
    const celebrate = BRIEF_CELEBRATE_TYPES.includes(ev.type) || CELEBRATE_RE.test(String(ev.title || ''));
    for (const id of ids) {
      const r = get(id); if (!r) continue;
      if (celebrate) {
        // A birthday names its person in the title; an attendee of a party is a meeting.
        const named = pplMentions(ev.title || '', idx).some(x => x.pid === id);
        if (named && !r.celebration) { r.celebration = { eventId: ev.id, title: clip(ev.title, 120), date: ev.date, kind: /birthday|bday|b-day/i.test(ev.title || '') || ev.type === 'birthday' ? 'birthday' : 'celebration' }; r.include = true; r.score += ev.date === today ? 100 : 40; continue; }
      }
      if (r.meetings.length < 5) r.meetings.push({ eventId: ev.id, title: clip(ev.title, 120), date: ev.date, start: ev.allDay ? null : ev.start || null, end: ev.allDay ? null : ev.end || null, allDay: !!ev.allDay });
      if (!r.include) r.score += ev.date === today ? 60 : 25;
      r.include = true;
    }
  }
  // Tasks: what I owe them, what waits on them, follow-ups due, focus.
  const focus = new Set(focusIds);
  for (const t of Array.isArray(s.custom) ? s.custom : []) {
    if (!isOpenTask(s, t)) continue;
    const linked = pplLinked(s, t, idx).filter(id => !idx.self.has(id));
    if (!linked.length) continue;
    const due = dueOf(t);
    const dueSoon = !!((due && due <= until) || (t.plannedFor && t.plannedFor <= until));
    const item = { id: t.id, title: clip(t.title, 160), due, priority: t.priority || null };
    const waiting = isWaitingTask(s, t);
    for (const id of linked) {
      const r = get(id); if (!r) continue;
      (waiting ? r.waiting : r.owe).push(item);
      if (isFollowUp(t) && dueSoon) { r.followUps.push(item); r.include = true; r.score += 30; }
      if (focus.has(t.id)) { r.focus.push(t.id); r.include = true; r.score += 40; }
      if (dueSoon && !isFollowUp(t)) { r.include = true; r.score += waiting ? 15 : 20; }
    }
  }
  // Last contact: past meetings, email, notes on the person, completed tasks with them.
  // One rule with the page and person.get (src/app/53-people-contact-logic.js, lib/meet-logic.mjs).
  const notes = [], doneTasks = [];
  for (const p of people) for (const n of Array.isArray(p.notes) ? p.notes : []) if (n && n.ts) notes.push({ personId: p.id, date: dayInTz(n.ts, tz) });
  const log = s.completionLog || {};
  for (const t of Array.isArray(s.custom) ? s.custom : []) {
    const stamps = t && log[t.id];
    if (!t || !Array.isArray(stamps) || !stamps.length || isDeleted(s, t)) continue;
    doneTasks.push({ date: dayInTz(Math.max(...stamps.map(Number).filter(Number.isFinite)), tz), people: pplLinked(s, t, idx) });
  }
  const contacts = lastContactMap({
    today, notes, doneTasks,
    pastEvents: pastEvents.filter(ev => ev && ev.date < today).map(ev => ({ date: ev.date, people: eventPeople(ev, idx, names) })),
    emails: inbox.filter(th => th && th.personId && th.date).map(th => ({ personId: th.personId, date: String(th.date).slice(0, 10) })),
  });
  const last = new Map([...contacts].map(([id, c]) => [id, { date: c.date, via: c.kind }]));
  const out = [];
  for (const [id, r] of rec) {
    if (!r.include) continue;
    const p = idx.byId.get(id);
    const lc = last.get(id) || null;
    const reasons = [];
    const why = [];
    if (r.celebration) { reasons.push(r.celebration.kind); why.push(r.celebration.kind === 'birthday' ? (r.celebration.date === today ? 'Birthday today' : 'Birthday ' + WEEKDAYS[briefWeekday(r.celebration.date)]) : 'Celebration'); }
    const m0 = r.meetings.find(m => m.date === today) || r.meetings[0];
    if (m0) { reasons.push('meeting'); why.push(m0.date === today ? (m0.start ? `Meeting at ${m0.start}` : 'Seeing them today') : `Meeting ${WEEKDAYS[briefWeekday(m0.date)]}${m0.start ? ' ' + m0.start : ''}`); }
    if (r.followUps.length) { reasons.push('follow-up'); why.push(r.followUps.length === 1 ? 'Follow-up due' : `${r.followUps.length} follow-ups due`); }
    if (r.owe.length) { reasons.push('owe'); why.push(`You owe ${r.owe.length}`); }
    if (r.waiting.length) { reasons.push('waiting'); why.push(`Waiting on ${r.waiting.length}`); }
    if (r.focus.length) reasons.push('focus');
    r.score += Math.min(10, r.owe.length * 2 + r.waiting.length);
    out.push({
      id, name: clip(p.name, 80), first: clip(String(p.name || '').replace(/^(dr|prof|professor|mr|mrs|ms|miss|mx)\.?\s+/i, '').split(/\s+/)[0], 40),
      role: p.role ? clip(p.role, 60) : null, org: p.org ? clip(p.org, 60) : null, kind: p.kind || 'person',
      color: typeof p.color === 'string' ? p.color.slice(0, 32) : null, avatarUrl: /^https?:\/\//i.test(String(p.avatarUrl || '')) ? String(p.avatarUrl).slice(0, 500) : null,
      meetings: r.meetings, celebration: r.celebration,
      owe: r.owe.slice(0, 5), waiting: r.waiting.slice(0, 5), followUps: r.followUps.slice(0, 5), focus: r.focus.slice(0, 5),
      counts: { owe: r.owe.length, waiting: r.waiting.length, followUps: r.followUps.length },
      lastContact: lc ? { ...lc, daysAgo: briefDaysBetween(lc.date, today) } : null,
      reasons, why: why.join(' · '), score: r.score,
    });
  }
  out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return out.slice(0, max);
}

/* ---------------- gathering ---------------- */

// The user's own day only (lib/calendar-visibility.mjs "mine"): their own calendars
// that are switched on, plus events they are invited to; declined ones left out.
// The same rule Home's schedule and the brief use (src/app/40-calendar.js calEntriesOn).
async function calendarRange(q, from, to) {
  const calQ = CALENDAR_QUERIES.find(x => x.name === 'calendar.list');
  try { return await calQ.run(q, { from, to, mine: true }); } catch { return { events: [] }; }
}
async function inboxRecent(q) {
  const inQ = CALENDAR_QUERIES.find(x => x.name === 'inbox.list');
  try { const r = await inQ.run(q, { days: 60, limit: 100 }); return (r.threads || []).filter(t => t.personId).map(t => ({ personId: t.personId, date: t.date })); } catch { return []; }
}
/**
 * Events for the day model. Untitled ones ("(no title)") come back with untitled:true and title 'Busy'.
 * startMin/endMin are as seen on the event's first day (one that runs past midnight ends at 24:00 there).
 */
function shapeEvents(list, s, idx, names, animOpts) {
  return (list || []).filter(e => e && !isDeclinedEvent(e)).map(e => {
    const m = e.allDay ? null : eventMinutesOn(e);
    const start = m ? m.start : null, end = m ? m.end : null;
    const minutes = m ? Math.max(0, end - start) : 0;
    if (e.untitled || isUntitledEvent(e)) {
      return { id: e.id, title: 'Busy', untitled: true, date: e.date, allDay: !!e.allDay, start: e.allDay ? null : e.start, end: e.allDay ? null : e.end, startMin: start, endMin: end, minutes, type: 'event', ...(e.until ? { until: e.until } : {}), attendees: 0, people: [] };
    }
    const r = animClassify({ kind: 'event', title: e.title, location: e.location, link: !!e.joinUrl, attendees: (e.attendees || []).length + 1, allDay: !!e.allDay, start, minutes, days: e.until ? 2 : 1, calendar: e.calendar }, animOpts);
    return {
      id: e.id, title: clip(e.title, 160), date: e.date, allDay: !!e.allDay,
      start: e.allDay ? null : e.start, end: e.allDay ? null : e.end, startMin: start, endMin: end, minutes,
      type: r.type, ...(e.until ? { until: e.until } : {}), ...(e.location ? { location: clip(e.location, 100) } : {}),
      ...(e.joinUrl && /^https:\/\//i.test(e.joinUrl) ? { joinUrl: String(e.joinUrl).slice(0, 500) } : {}),
      ...(e.important ? { important: true } : {}),
      attendees: (e.attendees || []).length,
      people: eventPeople({ title: e.title, attendees: e.attendees }, idx, names),
      ...(Array.isArray(e.taskIds) ? { taskIds: e.taskIds.slice(0, 10) } : {}),
    };
  });
}
function compactWeather(w, tzNow) {
  if (!w || !w.ok) return null;
  const hr = (hm) => { const m = briefMin(hm); return m === null ? NaN : m / 60; };
  const nowH = (briefMin(tzNow.time) ?? 540) / 60;
  const t = w.today || {};
  const next = (w.hourly || []).filter(h => h && (h.date > tzNow.today || (h.date === tzNow.today && h.hour >= Math.floor(nowH)))).slice(0, 12)
    .map(h => ({ time: h.time, cond: h.cond, temp: h.temp, rain: h.rain }));
  const c = w.current || {};
  return {
    ok: true, place: w.location && w.location.name ? clip(w.location.name, 60) : null,
    cond: c.cond || t.cond || 'none', label: c.label || t.label || null, temp: c.temp ?? null, feels: c.feels ?? null, isDay: c.isDay !== false,
    hi: t.hi ?? null, lo: t.lo ?? null, rainChance: t.rainChance ?? null, sunrise: t.sunrise || null, sunset: t.sunset || null,
    tod: briefTimeOfDay(nowH, hr(t.sunrise), hr(t.sunset)),
    tomorrow: w.tomorrow ? { cond: w.tomorrow.cond, label: w.tomorrow.label, hi: w.tomorrow.hi, lo: w.tomorrow.lo, rainChance: w.tomorrow.rainChance } : null,
    next, units: w.units || null, stale: !!w.stale, attribution: w.attribution || null,
  };
}
async function readMoney(q, today) {
  const af = q.financeDir ? join(q.financeDir, '_system', 'analysis.json') : null;
  if (!af || !existsSync(af) || (q.cfg.features && q.cfg.features.finance === false)) return null;
  const a = await readJson(af, { fallback: null }).catch(() => null);
  if (!a) return null;
  const b = await readJson(join(q.financeDir, '_system', 'budgets.json'), { fallback: null }).catch(() => null);
  const m = moneyLine(a, { today, budgets: b && (b.budgets || b), currency: q.cfg.currency });
  if (!m || !m.available) return null;
  const cur = m.currency;
  return {
    currency: cur,
    yesterday: { ...m.yesterday, text: moneyText(m.yesterday.total, cur) },
    month: { ...m.month, text: moneyText(m.month.toDate, cur), budgetText: moneyText(m.month.budget, cur) },
    week: m.week ? { ...m.week, text: moneyText(m.week.total, cur), avgText: moneyText(m.week.avg, cur) } : null,
    staleDays: m.staleDays,
  };
}
function taskItem(s, t, today, animOpts, extra) {
  const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
  return {
    id: t.id, title: clip(t.title, 200), due: dueOf(t), priority: t.priority || null, stream: streamLabel(s, t.stream),
    daysLeft: dueOf(t) ? briefDaysBetween(today, dueOf(t)) : null,
    type: animClassify({ kind: 'task', id: t.id, title: t.title, tags: t.tags, stream: streamLabel(s, t.stream), priority: t.priority, dueToday: dueOf(t) === today }, animOpts).type,
    subtasks: { done: subs.filter(x => x && x.done).length, total: subs.length, next: subs.filter(x => x && !x.done).slice(0, 2).map(x => clip(x.title || x.text || '', 100)) },
    ...(extra || {}),
  };
}

/**
 * The model for one story. q: actions query context ({s, cfg, clock, paths, financeDir});
 * opts.weather: a shaped forecast (lib/weather.mjs) or null; opts.now: Date (tests).
 */
export async function buildStoryData(q, kind, { weather = null, now = new Date() } = {}) {
  if (!STORY_KINDS.includes(kind)) throw Object.assign(new Error('kind must be morning, evening or week'), { status: 400 });
  const s = q.s || {};
  const cfg = q.cfg || {};
  // The effective zone (where the user is; travel spec 2.3); config.timezone is home.
  const tz = (q.clock && q.clock.timezone) || cfg.timezone || 'UTC';
  const c = clockIn(now, tz);
  const today = c.today, nowMin = briefMin(c.time) ?? 0;
  const idx = pplBuildIndex(s.people);
  const names = nameIndex((Array.isArray(s.people) ? s.people : []).filter(p => p && p.id));
  const ap = s.animPrefs && typeof s.animPrefs === 'object' ? s.animPrefs : {};
  const animOpts = {
    rules: Array.isArray(ap.rules) ? ap.rules : [], overrides: ap.overrides && typeof ap.overrides === 'object' ? ap.overrides : {},
    ai: await readAnimAi(q.paths.root).catch(() => ({})), names: new Set([...names.keys()].map(k => k.split(' ')[0])),
  };
  const tasksAll = (Array.isArray(s.custom) ? s.custom : []).filter(t => t && t.id && !isDeleted(s, t));
  const open = tasksAll.filter(t => isOpenTask(s, t));
  const byId = new Map(tasksAll.map(t => [t.id, t]));
  const weekRange = reviewWeekRange(today, cfg.weekStart || 'Mon');
  // Calendar windows per kind.
  const tomorrow = briefAddDays(today, 1);
  let wr = null;
  if (kind === 'week') {
    const back = briefDaysBetween(weekRange.from, today) < 2;
    wr = back ? { from: weekRange.prevFrom, to: weekRange.prevTo, nextFrom: weekRange.from, nextTo: weekRange.to } : { from: weekRange.from, to: weekRange.to, nextFrom: weekRange.nextFrom, nextTo: weekRange.nextTo };
  }
  const calFrom = kind === 'week' ? wr.from : today;
  const calTo = kind === 'week' ? wr.nextTo : kind === 'evening' ? tomorrow : briefAddDays(today, 1);
  const cal = await calendarRange(q, calFrom, calTo);
  const shaped = shapeEvents(cal.events, s, idx, names, animOpts);
  // Untitled events ("(no title)") are busy time for the free gaps and the week's load,
  // but never a name to say: they are not in the model's events (timelines, "next up", chips).
  const allEvents = shaped.filter(e => !e.untitled);
  const busyOnly = shaped.filter(e => e.untitled);
  const pastCal = await calendarRange(q, briefAddDays(today, -60), briefAddDays(today, -1));
  const pastEvents = (pastCal.events || []).map(e => ({ id: e.id, title: e.title, date: e.date, attendees: e.attendees }));
  const inbox = await inboxRecent(q);
  const onDay = (d) => (e) => e.date === d || (e.until && e.date <= d && e.until >= d);
  // A timed event that runs past midnight, as seen on day d: cut at that day's edges
  // (23:00-01:00 is 23:00-24:00 on its first day and 00:00-01:00 on the next), so it is
  // never "over" before it began and the next day's timeline starts it at midnight.
  const view = (d) => (e) => {
    if (e.allDay || e.startMin === null) return e;
    const m = eventMinutesOn(e, d);
    return !m || (m.start === e.startMin && m.end === e.endMin) ? e : { ...e, startMin: m.start, endMin: m.end, minutes: Math.max(0, m.end - m.start) };
  };
  const eventsOn = (d) => allEvents.filter(onDay(d)).map(view(d));
  const busyOn = (d) => busyOnly.filter(onDay(d)).map(view(d));
  const todayEvents = eventsOn(today);
  const timedToday = todayEvents.filter(e => !e.allDay).sort((a, b) => a.startMin - b.startMin);
  const busyToday = [...timedToday, ...busyOn(today).filter(e => !e.allDay && e.startMin !== null)];

  // Shared pieces.
  const dueToday = open.filter(t => dueOf(t) === today);
  const overdue = open.filter(t => dueOf(t) && dueOf(t) < today);
  const isDeadlineTask = (t) => animClassify({ kind: 'task', id: t.id, title: t.title, tags: t.tags, stream: streamLabel(s, t.stream), priority: t.priority, dueToday: dueOf(t) === today }, animOpts).type === 'deadline';
  const focusRaw = focusTasks(s, today, 3).tasks;
  const focus = focusRaw.map(x => taskItem(s, x.task, today, animOpts, { why: x.why, people: pplLinked(s, x.task, idx).filter(id => !idx.self.has(id)) }));
  const in7 = briefAddDays(today, kind === 'week' ? 13 : 7);
  const deadlines = open.filter(t => { const d = dueOf(t); return d && d >= today && d <= in7 && (t.priority === 'p1' || isDeadlineTask(t)); })
    .sort((a, b) => dueOf(a).localeCompare(dueOf(b))).slice(0, 8).map(t => taskItem(s, t, today, animOpts, { weekday: WEEKDAYS[briefWeekday(dueOf(t))] }));
  const countdowns = widgetList(s.countdowns).filter(w => w && w.type === 'countdown' && w.date && w.date >= today && w.date <= briefAddDays(today, 30))
    .slice(0, 4).map(w => ({ id: 'cd:' + w.id, label: clip(w.label, 80), date: w.date, daysLeft: briefDaysBetween(today, w.date) }));
  const waiting = open.filter(t => isWaitingTask(s, t)).slice(0, 8).map(t => ({ id: t.id, title: clip(t.title, 160), due: dueOf(t), people: pplLinked(s, t, idx).filter(id => !idx.self.has(id)) }));
  // Money days stay on home time: banks date transactions at home (travel spec 2.3).
  const money = await readMoney(q, cfg.timezone && cfg.timezone !== tz ? clockIn(now, cfg.timezone).today : today);
  const w = compactWeather(weather, c);
  const userName = clip(cfg.userName || '', 40);

  const base = {
    kind, date: today, weekday: WEEKDAYS[briefWeekday(today)], now: c.time, tz, userName,
    part: nowMin < 12 * 60 ? 'morning' : nowMin < 17 * 60 ? 'afternoon' : 'evening',
    tod: w ? w.tod : briefTimeOfDay(nowMin / 60),
    weather: w, money, countdowns,
    calendar: { fetchedAt: cal.fetchedAt || null, ...(cal.stale ? { stale: true } : {}), ...(cal.note && !cal.events?.length ? { missing: true } : {}) },
  };

  let out;
  if (kind === 'morning') {
    const dayInput = {
      date: today, weekday: briefWeekday(today), now: nowMin,
      events: todayEvents.map(e => ({ title: e.title, type: e.type, start: e.startMin, end: e.endMin, allDay: e.allDay, minutes: e.minutes })),
      tasks: { today: dueToday.length, overdue: overdue.length, p1Today: dueToday.filter(t => t.priority === 'p1').length, deadlines: dueToday.filter(isDeadlineTask).map(t => ({ id: t.id, title: t.title })) },
      focus: focus.map(f => ({ id: f.id, title: f.title, type: f.type })), weather: w ? { cond: w.cond } : null,
    };
    const dt = briefDayType(dayInput);
    const head = briefHeadline(dayInput, dt);
    // The user's working hours (config.workHours; lib/plan-logic.mjs), as Home and the brief use.
    const wh = planWorkHours(cfg.workHours || null);
    const gaps = briefGaps(busyToday.map(e => ({ start: e.startMin, end: e.endMin, allDay: false })), Math.max(wh.startMin, Math.ceil(nowMin / 15) * 15), wh.endMin, 45)
      .map(g => ({ start: briefHM(g.start), end: briefHM(g.end), minutes: g.minutes, text: durText(g.minutes) }));
    const next = timedToday.find(e => e.endMin > nowMin) || null;
    const people = peopleOfDay({ state: s, events: todayEvents, today, horizon: today, focusIds: focus.map(f => f.id), pastEvents, inbox, tz });
    out = {
      ...base,
      dayType: { type: dt.type, tagline: dt.tagline, accent: dt.accent, flags: dt.flags, counts: dt.counts },
      headline: head ? { ...head, ...(Number.isFinite(head.start) ? { start: briefHM(head.start) } : {}), ref: head.kind === 'task' ? head.id : (todayEvents.find(e => e.title === head.title) || {}).id || null } : null,
      events: todayEvents, next: next ? next.id : null, gaps,
      tasks: { dueToday: dueToday.length, overdue: overdue.length, p1Today: dueToday.filter(t => t.priority === 'p1').length },
      focus, deadlines, waiting, people,
      tomorrow: { events: eventsOn(tomorrow).slice(0, 6) },
    };
  } else if (kind === 'evening') {
    const log = s.completionLog || {};
    const done = [];
    for (const [id, stamps] of Object.entries(log)) {
      const t = byId.get(id);
      if (!t || !(stamps || []).some(ts => dayInTz(ts, tz) === today)) continue;
      done.push(taskItem(s, t, today, animOpts, { people: pplLinked(s, t, idx).filter(x => !idx.self.has(x)) }));
    }
    const rank = { p1: 0, p2: 1, p3: 2, p0: 3 };
    done.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3));
    let subtasksDone = 0;
    for (const t of tasksAll) for (const st of Array.isArray(t.subtasks) ? t.subtasks : []) if (st && st.done && st.doneAt && dayInTz(st.doneAt, tz) === today) subtasksDone++;
    const held = timedToday.filter(e => e.endMin <= nowMin);
    const meetings = held.filter(e => BRIEF_MEETING_TYPES.includes(e.type));
    const rolled = briefRollover(open.map(t => ({ id: t.id, title: clip(t.title, 160), due: dueOf(t), planned: t.plannedFor || null, done: false, priority: t.priority })), today);
    const slipped = rolled.slice(0, 10);
    // All of them, and how many were today's (the rest were already overdue): Home's rule.
    const slippedCount = rolled.length, slippedToday = rolled.filter(r => r.why !== 'overdue').length;
    const dayCounts = {};
    for (const stamps of Object.values(log)) for (const ts of stamps || []) { const d = dayInTz(ts, tz); dayCounts[d] = (dayCounts[d] || 0) + 1; }
    const streak = briefStreak(dayCounts, today);
    let thisWeek = 0;
    for (const [d, n] of Object.entries(dayCounts)) if (d >= weekRange.from && d <= today) thisWeek += n;
    const tomEvents = eventsOn(tomorrow);
    const tomTasks = open.filter(t => dueOf(t) === tomorrow || t.plannedFor === tomorrow).slice(0, 8).map(t => taskItem(s, t, today, animOpts));
    const people = peopleOfDay({ state: s, events: [...held, ...tomEvents], today, horizon: tomorrow, focusIds: [], pastEvents, inbox, tz });
    out = {
      ...base,
      done: done.slice(0, 12), doneCount: done.length, subtasksDone, held: held.map(e => e.id), meetingsHeld: meetings.length,
      events: [...todayEvents, ...tomEvents.filter(e => !todayEvents.some(t => t.id === e.id))],   // a two-day event once (as seen today)
      slipped, slippedCount, slippedToday, streak, thisWeek,
      tomorrow: { date: tomorrow, weekday: WEEKDAYS[briefWeekday(tomorrow)], events: tomEvents.map(e => e.id), tasks: tomTasks, first: (tomEvents.filter(e => !e.allDay).sort((a, b) => a.startMin - b.startMin)[0] || {}).id || null },
      focus, deadlines, waiting, people,
    };
  } else {
    const st = reviewWeekStats({
      from: wr.from, to: wr.to, tasks: tasksAll.map(t => ({ id: t.id, title: clip(t.title, 160), stream: t.stream })),
      completions: s.completionLog || {}, activity: s.taskActivity || {}, dayOf: (ms) => dayInTz(ms, tz),
    });
    const wins = [];
    for (const [id, stamps] of Object.entries(s.completionLog || {})) {
      const t = byId.get(id);
      if (!t || !(stamps || []).some(ts => { const d = dayInTz(ts, tz); return d >= wr.from && d <= wr.to; })) continue;
      wins.push(taskItem(s, t, today, animOpts, { people: pplLinked(s, t, idx).filter(x => !idx.self.has(x)) }));
    }
    const rank = { p1: 0, p2: 1, p3: 2, p0: 3 };
    wins.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3));
    const nextDays = [];
    for (let d = wr.nextFrom; d <= wr.nextTo; d = briefAddDays(d, 1)) {
      const evs = [...eventsOn(d), ...busyOn(d)];
      nextDays.push({ date: d, events: evs.map(e => ({ minutes: e.minutes, type: e.type, allDay: e.allDay })), tasks: open.filter(t => dueOf(t) === d).length, estimate: open.filter(t => dueOf(t) === d).reduce((n, t) => n + (Number(t.estimate) || 0), 0) });
    }
    const capacity = reviewCapacity(nextDays, 8 * 60).map(x => ({ ...x, weekday: WEEKDAYS[briefWeekday(x.date)] }));
    const weekEvents = allEvents.filter(e => e.date >= wr.from && e.date <= wr.to);
    const nextEvents = allEvents.filter(e => e.date >= wr.nextFrom && e.date <= wr.nextTo);
    const people = peopleOfDay({ state: s, events: [...weekEvents.filter(e => e.date <= today), ...nextEvents], today, horizon: wr.nextTo, focusIds: focus.map(f => f.id), pastEvents, inbox, tz });
    const busiest = Object.entries(st.byDay).sort((a, b) => b[1] - a[1])[0] || null;
    out = {
      ...base,
      range: { from: wr.from, to: wr.to, nextFrom: wr.nextFrom, nextTo: wr.nextTo },
      completed: st.completed, byDay: st.byDay, busiest: busiest ? { date: busiest[0], weekday: WEEKDAYS[briefWeekday(busiest[0])], n: busiest[1] } : null,
      perStream: st.perStream.slice(0, 6).map(x => ({ ...x, label: streamLabel(s, x.stream) || 'No stream' })),
      wins: wins.slice(0, 8), slippedWeek: st.slipped.slice(0, 8).map(x => ({ id: x.id, title: clip(x.title, 160), from: x.from, to: x.to, reason: clip(x.reason, 120), moves: x.moves })),
      reasons: st.reasons.slice(0, 4).map(x => ({ reason: clip(x.reason, 120), n: x.n })),
      meetings: weekEvents.filter(e => BRIEF_MEETING_TYPES.includes(e.type) && !e.allDay).length,
      events: [...weekEvents, ...nextEvents].slice(0, 80),
      next: { capacity, heavy: capacity.filter(x => x.warn).map(x => x.date), meetings: nextEvents.filter(e => BRIEF_MEETING_TYPES.includes(e.type) && !e.allDay).length },
      focus, deadlines, waiting, people, overdue: overdue.length,
    };
  }
  out.suggestions = storySuggestions(out);
  out.entities = storyEntities(out);
  return out;
}

/* ---------------- suggestions (deterministic) ---------------- */
/** [{kind, text, refs:[{type, ref}]}] - short, practical, at most four. */
export function storySuggestions(d) {
  const out = [];
  const add = (kind, text, refs = []) => { if (text && out.length < 4) out.push({ kind, text: clip(text, 200), refs }); };
  const f0 = (d.focus || [])[0];
  const ev = new Map((d.events || []).map(e => [e.id, e]));
  const person = new Map((d.people || []).map(p => [p.id, p]));
  // Titles go last (after a colon or "with"), in their speakable form: a long or
  // verb-first title then reads well ("Make it tomorrow's first job: Upload the run list").
  const T = (x) => speakableTitle(x && x.title);
  if (d.kind === 'morning') {
    const g = (d.gaps || []).slice().sort((a, b) => b.minutes - a.minutes)[0];
    const timedToday = (d.events || []).some(e => e.date === d.date && !e.allDay);
    if (g && g.minutes >= 60 && g.minutes <= 300 && f0 && timedToday) add('gap', `From ${g.start} you have ${g.text} free: use it for ${T(f0)}.`, [{ type: 'time', ref: g.start }, { type: 'task', ref: f0.id }]);
    const fu = (d.people || []).find(p => p.followUps.length);
    if (fu) add('follow-up', `Follow up with ${fu.first}: ${T(fu.followUps[0])}.`, [{ type: 'person', ref: fu.id }, { type: 'task', ref: fu.followUps[0].id }]);
    const nx = d.next && ev.get(d.next);
    const prepP = nx && (nx.people || []).map(id => person.get(id)).find(p => p && p.counts.owe);
    if (nx && prepP) add('prep', `Before ${nx.start}, check what you owe ${prepP.first}.`, [{ type: 'time', ref: nx.start }, { type: 'person', ref: prepP.id }]);
    if (d.weather && (d.weather.rainChance ?? 0) >= 60) add('weather', `Rain is likely today (${d.weather.rainChance}%), so take a coat.`, []);
    if ((d.tasks && d.tasks.overdue) >= 3) add('overdue', `${d.tasks.overdue} tasks are overdue: clear one, move the rest.`, []);
    if (!out.length && f0) add('focus', `While the day is quiet, start with ${T(f0)}.`, [{ type: 'task', ref: f0.id }]);
  } else if (d.kind === 'evening') {
    const nSlip = Math.max((d.slipped || []).length, d.slippedCount || 0);
    if (nSlip) add('roll', `Move ${nSlip === 1 ? 'the one unfinished task' : `the ${nSlip} unfinished tasks`} to tomorrow or a better day.`, nSlip === 1 && d.slipped[0] ? [{ type: 'task', ref: d.slipped[0].id }] : []);
    const first = d.tomorrow && d.tomorrow.first && ev.get(d.tomorrow.first);
    if (first) add('tomorrow', `Tomorrow starts at ${first.start} with ${T(first)}.`, [{ type: 'time', ref: first.start }, { type: 'event', ref: first.id }]);
    const t0 = d.tomorrow && d.tomorrow.tasks && d.tomorrow.tasks[0];
    if (t0) add('top', `Make it tomorrow's first job: ${T(t0)}.`, [{ type: 'task', ref: t0.id }]);
    if (d.weather && d.weather.tomorrow && (d.weather.tomorrow.rainChance ?? 0) >= 60) add('weather', 'Rain is likely tomorrow: leave the coat by the door.', []);
  } else {
    if (d.next && d.next.heavy && d.next.heavy.length) {
      const c = d.next.capacity.find(x => x.date === d.next.heavy[0]);
      if (c) add('capacity', c.load >= 1 ? `${c.weekday} next week is already full: keep everything else off it.` : `${c.weekday} next week is ${Math.round(c.load * 100)}% booked: keep it light.`, []);
    }
    const why = d.reasons && d.reasons[0] && userReason(d.reasons[0].reason);
    if (why) add('pattern', `Most moves this week came down to: ${why}.`, []);
    const dl = (d.deadlines || [])[0];
    if (dl) add('deadline', `Plan time for ${dueDayWord(dl.due, d.date, dl.weekday)}'s deadline: ${T(dl)}.`, [{ type: 'deadline', ref: dl.id }]);
    const wp = (d.people || []).find(p => p.waiting.length);
    if (wp) add('chase', `Still waiting on ${wp.first}: ${T(wp.waiting[0])}.`, [{ type: 'person', ref: wp.id }, { type: 'task', ref: wp.waiting[0].id }]);
  }
  return out;
}

/* ---------------- the entity catalogue ---------------- */
/**
 * Everything a script may name: [{type, ref, text, alt?}]. text = how it is
 * usually written (a person's first name, a task title, "10:00", "£12.40").
 * alt = other spellings that also count (full name, aliases).
 */
export function storyEntities(d) {
  const out = [], seen = new Set();
  const add = (type, ref, text, alt) => {
    if (!ref || !text) return;
    const k = type + '|' + ref;
    if (seen.has(k)) return;
    seen.add(k); out.push({ type, ref: String(ref), text: clip(text, 160), ...(alt && alt.length ? { alt: alt.filter(Boolean).map(a => clip(a, 80)) } : {}) });
  };
  // Chip text = the speakable title (what the sentences say); the full title is an alt.
  const S = (x) => speakableTitle(x);
  for (const p of d.people || []) add('person', p.id, p.first || p.name, [p.name]);
  for (const e of d.events || []) {
    if (e.untitled) continue;   // busy time, never named
    add('event', e.id, S(e.title), [e.title]);
    if (e.start) add('time', e.start, e.start);
    if (e.location) add('place', e.location, e.location);
  }
  const tasks = [...(d.focus || []), ...(d.done || []), ...(d.wins || []), ...((d.tomorrow && d.tomorrow.tasks) || []), ...(d.slipped || []), ...(d.slippedWeek || []), ...(d.waiting || [])];
  for (const t of tasks) add('task', t.id, S(t.title), [t.title]);
  for (const t of d.deadlines || []) { add('deadline', t.id, S(t.title), [t.title]); add('task', t.id, S(t.title), [t.title]); }
  for (const c of d.countdowns || []) add('deadline', c.id, c.label);
  for (const p of d.people || []) for (const list of [p.owe, p.waiting, p.followUps]) for (const t of list || []) add('task', t.id, S(t.title), [t.title]);
  for (const g of d.gaps || []) add('time', g.start, g.start);
  if (d.now) add('time', d.now, d.now);
  if (d.weather && d.weather.place) add('place', d.weather.place, d.weather.place);
  if (d.money) {
    if (d.money.yesterday && d.money.yesterday.text) add('money', 'yesterday', d.money.yesterday.text);
    if (d.money.month && d.money.month.text) add('money', 'month', d.money.month.text);
    if (d.money.week && d.money.week.text) add('money', 'week', d.money.week.text);
  }
  return out;
}

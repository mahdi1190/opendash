// lib/waiting-rules.mjs - waiting on people, blocked tasks and someday, for Node.
//
// The page is the reference: src/app/34-review-core.js (rfIsWaiting, rfIsWaitingAny,
// rfBlockers, rfIsBlocked, rfIsSomeday, rfLeavesView, rfWaitPerson, RF_DO.wait / unwait),
// src/app/12-home.js (homeIsWaiting, homeWaitingPerson) and src/app/34-waiting.js
// (rfPersonOwe). list_tasks views, get_person, set_task_waiting, set_task_blocked_by and
// Home's Focus (lib/home-topbar.mjs focusTasks) use these, so the assistant sees the lists
// the page shows. Change a rule here and on the page together. Pure functions, no I/O.

import { pplIsWaiting } from './people-tags.mjs';

export const SOMEDAY_TAG = 'someday';
/** A waiting- / blocked- tag: the Waiting list counts it as waiting, and "Back on my list" strips it. */
export const WAIT_TAG_RE = /^(waiting|waiting-on|awaiting|blocked)(-|$)/;
const WAIT_TAG_PERSON_RE = /^(?:blocked|waiting|waiting-on|awaiting)-(.+)$/;

const statusOf = (s, id) => (s && s.statuses && s.statuses[id]) || 'todo';
const tagsOf = (t) => (t && Array.isArray(t.tags) ? t.tags : []);

/** rfIsOpen: not done and not binned. */
export function isOpenTask(s, t) { return !!t && statusOf(s, t.id) !== 'done' && !(s && s.deleted && s.deleted[t.id]); }
/** rfIsWaiting: the explicit flags (set_task_waiting, the page's "Waiting on…"): waitingOn, waiting:true or status 'waiting'. */
export function isWaiting(s, t) { return !!t && (!!t.waitingOn || t.waiting === true || statusOf(s, t.id) === 'waiting'); }
/** The task's waiting- / blocked- tags. */
export function waitTags(t) { return tagsOf(t).filter(x => WAIT_TAG_RE.test(String(x))); }
/** rfIsWaitingAny: the flags, or (an open task) a waiting- / blocked- tag. The Waiting list shows these. */
export function isWaitingAny(s, t) { return isWaiting(s, t) || (!!t && statusOf(s, t.id) !== 'done' && waitTags(t).length > 0); }
/** rfBlockers: the open tasks this one waits for; done, binned and missing ones no longer block. */
export function openBlockers(s, t) {
  const custom = s && Array.isArray(s.custom) ? s.custom : [];
  const out = [];
  for (const id of t && Array.isArray(t.blockedBy) ? t.blockedBy : []) {
    const b = custom.find(x => x && x.id === id);
    if (b && isOpenTask(s, b)) out.push(b);
  }
  return out;
}
export function isBlocked(s, t) { return openBlockers(s, t).length > 0; }
export function isSomeday(t) { return tagsOf(t).includes(SOMEDAY_TAG); }
/**
 * rfLeavesView: does an active list leave this open task out? A waiting task leaves Today,
 * Tomorrow, Upcoming (week), No date and a day for the Waiting list; a blocked one stays out of
 * Today until what it depends on is done; a someday one leaves No date. In progress always stays.
 */
export function leavesView(s, t, view) {
  const v = String(view || '');
  const active = v === 'today' || v === 'tomorrow' || v === 'week' || v === 'no-date' || v.startsWith('day:');
  if (!t || !active || statusOf(s, t.id) === 'doing') return false;
  if (isWaiting(s, t)) return true;
  if (v === 'today' && isBlocked(s, t)) return true;
  if (v === 'no-date' && isSomeday(t)) return true;
  return false;
}
/** rfWaitPerson: who a task waits on: waitingOn, else a waiting-<id> tag, else its first linked person (not you). linked: its linked person ids. */
export function waitPerson(s, t, linked) {
  if (!t) return null;
  const people = s && Array.isArray(s.people) ? s.people.filter(Boolean) : [];
  const w = t.waitingOn;
  if (w) {
    const p = people.find(x => x.id === String(w)) || people.find(x => String(x.name || '').toLowerCase() === String(w).toLowerCase());
    if (p) return p;
  }
  for (const tag of tagsOf(t)) {
    const m = WAIT_TAG_PERSON_RE.exec(String(tag));
    if (m) { const p = people.find(x => x.id === m[1] || (x.aliases || []).includes(m[1])); if (p) return p; }
  }
  for (const id of linked || []) { const p = people.find(x => x.id === id); if (p && !p.self) return p; }
  return null;
}
/**
 * rfPersonOwe: one person's open tasks split into what the user owes them (owe) and what they
 * owe the user (theyOwe, waiting on them). Waiting = the flags, or pplIsWaiting (a waiting tag,
 * a "Waiting on…" title); a task waiting on someone else is in neither list (it is theirs).
 * linkedOf(t) -> the task's linked person ids.
 */
export function personOwe(s, personId, open, linkedOf) {
  const owe = [], theyOwe = [];
  for (const t of open || []) {
    if (!(isWaiting(s, t) || pplIsWaiting(t))) { owe.push(t); continue; }
    const p = waitPerson(s, t, linkedOf ? linkedOf(t) : []);
    if (!p || p.id === personId || !t.waitingOn) theyOwe.push(t);
  }
  return { owe, theyOwe };
}

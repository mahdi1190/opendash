// server/actions/queries-people.mjs - read queries for People and tags
// (owner: People/Tags). queries.mjs merges these into QUERIES, replacing a
// query with the same name.
//
//   people.list        [list_people]            everyone: kind, role, org, group, emails, open-task count
//   person.get         [get_person]             one person: profile, notes, open tasks split into
//                                               "I owe them" and "waiting on them"
//   people.suggestions [list_link_suggestions]  tasks that name someone they are not linked to, ids
//                                               tasks point at with no profile, and names in tasks
//                                               that match nobody
//   tags.list          [list_tags]              every tag: open/total use, canonical/pinned/archived,
//                                               and why a tag looks wrong (repeats a stream, names a
//                                               person, is a status) - plus the tag rule
//
// Linking follows src/app/52-people-link.js (through lib/people-tags.mjs),
// exactly as the page counts it.

import { ActionError, truncate, weekdayOf, daysBetween, normTag, isoInTz, addDaysIso } from './model.mjs';
import { readMergedCalendar } from '../../lib/calendar-sources.mjs';
import { calendarRules } from '../../lib/calendar-visibility.mjs';
import { lastContactFromData } from '../../lib/people-contact.mjs';
import {
  pplBuildIndex, pplLinked, pplSuggest, pplOrphans, pplUnknownNames, pplIsWaiting, pplPersonEmails, pplKind, pplFold, pplLooksLikeMailbox,
  tglUsage, tglRegistry, tglFlags, tglStreamKeys, tglSimilar,
} from '../../lib/people-tags.mjs';

const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });

/** Attendee or title names that are a group, room or event rather than a person. */
const NOT_A_PERSON = /\b(group|team|lab|society|office|room|calendar|committee|department|dept|list|admin|support|info|events?|meeting|seminar|symposium|workshop|conference|coffee|social|lunch|club|network|centre|center|school|university|faculty|programme|program|futures?)\b/i;
/**
 * People in upcoming calendar events who are not in People (user request, 4 Oct: the
 * assistant proposes adding them): attendees whose address matches nobody, and names in
 * event titles ("Coffee with Sam Lee") that match nobody. The user's ignored names and
 * addresses (state.peopleIgnoredNames / peopleIgnoredEmails) and mailbox-like addresses
 * are left out. events: [{id, title, date, attendees:[{name, email, self}]}].
 * -> [{name, email?, events:[{id, title, date}]}] (most events first). Pure.
 */
export function peopleUnknownInEvents(s, events, o = {}) {
  s = s || {};
  const people = Array.isArray(s.people) ? s.people : [];
  const idx = o.index || pplBuildIndex(people);
  const ignore = new Set((Array.isArray(s.peopleIgnoredNames) ? s.peopleIgnoredNames : []).map(x => pplFold(x)));
  const ignoreMail = new Set((Array.isArray(s.peopleIgnoredEmails) ? s.peopleIgnoredEmails : []).map(x => String(x).toLowerCase()));
  const mine = new Set((o.myEmails || []).map(x => String(x).toLowerCase()));
  const knownMail = new Set(people.flatMap(p => pplPersonEmails(p)).map(x => String(x).toLowerCase()));
  const knownName = new Set(people.flatMap(p => [p.name, ...(Array.isArray(p.aliases) ? p.aliases : [])]).filter(Boolean).map(x => pplFold(x)));
  const out = new Map();
  const add = (name, email, ev) => {
    const key = pplFold(name);
    if (!key || ignore.has(key) || knownName.has(key)) return;
    let r = out.get(key);
    if (!r) { r = { name, ...(email ? { email } : {}), events: [] }; out.set(key, r); }
    if (email && !r.email) r.email = email;
    if (!r.events.some(x => x.id === ev.id)) r.events.push({ id: ev.id, title: truncate(ev.title || '', 80), date: ev.date });
  };
  const list = (Array.isArray(events) ? events : []).filter(e => e && e.id);
  for (const ev of list) {
    for (const a of Array.isArray(ev.attendees) ? ev.attendees : []) {
      if (!a || a.self) continue;
      const email = String(a.email || '').toLowerCase();
      if (email && (knownMail.has(email) || ignoreMail.has(email) || mine.has(email) || pplLooksLikeMailbox({ email }))) continue;
      const name = String(a.name || '').trim();
      // A name is needed to propose someone (an address alone is left to People > Suggestions).
      if (!name || name.includes('@') || name.split(/\s+/).length > 4 || NOT_A_PERSON.test(name)) continue;
      add(name, email || null, ev);
    }
  }
  // Names in the titles: the same rules as the names found in tasks, and only after a cue
  // ("Coffee with Sam Lee", "Call Sam", "Sam's leaving do"): titles are full of capitalised
  // words that are not people ("Process Modelling Meeting").
  const asTasks = list.map(e => ({ id: e.id, title: String(e.title || '') }));
  const stop = o.stop || [];
  for (const u of pplUnknownNames({ custom: asTasks, statuses: {}, deleted: {}, people }, { index: idx, stop, ignore: [...(Array.isArray(s.peopleIgnoredNames) ? s.peopleIgnoredNames : [])], minTasks: 2 })) {
    if (NOT_A_PERSON.test(u.name)) continue;
    const n = u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cue = new RegExp(`(?:\\b(?:with|w/|meet|meeting|call|ping|see|visit|and|&)\\s+${n}(?!\\p{L})|(?<!\\p{L})${n}['’]s\\b)`, 'iu');
    for (const id of u.taskIds) { const ev = list.find(e => e.id === id); if (ev && cue.test(String(ev.title || ''))) add(u.name, null, ev); }
  }
  return [...out.values()].sort((a, b) => b.events.length - a.events.length || a.name.localeCompare(b.name));
}
/** Upcoming events (today + 14 days, the calendars the user shows) for peopleUnknownInEvents. */
async function upcomingEvents(q) {
  const myEmails = (q.cfg && q.cfg.myEmails) || [];
  const snap = q.paths ? await readMergedCalendar(q.paths, { myEmails }).catch(() => null) : null;
  if (!snap || !Array.isArray(snap.events)) return [];
  const from = q.clock.today, to = addDaysIso(from, 14);
  const rules = calendarRules({ calendars: snap.calendars, state: q.s, myEmails });
  const out = [];
  for (const e of snap.events) {
    if (!e || !e.start || !rules.shown(e)) continue;
    const day = String(e.start.date || (e.start.dateTime ? isoInTz(new Date(e.start.dateTime), q.clock.timezone) : '')).slice(0, 10);
    if (!day || day < from || day > to) continue;
    out.push({ id: String(e.id || '').slice(0, 200), title: e.summary || '', date: day, attendees: Array.isArray(e.attendees) ? e.attendees : [] });
  }
  return out;
}
const statusOf = (s, id) => (s.statuses && s.statuses[id]) || 'todo';
const live = (s) => (s.custom || []).filter(t => t && !(s.deleted && s.deleted[t.id]));
export const TAG_RULE = 'Tags say what kind of work a task is (email, meeting, writing...) or which cross-stream project it belongs to. Never a person (link them), a stream, a date, urgency or a status (use those fields). Reuse the canonical tags; a new one needs createTag:true.';

function mini(q, t) {
  const o = { id: t.id, title: truncate(t.title, 120) };
  if (t.dueDate) { o.due = t.dueDate; o.day = weekdayOf(t.dueDate).slice(0, 3); o.daysLeft = daysBetween(q.clock.today, t.dueDate); }
  o.status = statusOf(q.s, t.id);
  if (t.priority && t.priority !== 'p0') o.priority = t.priority;
  o.stream = t.stream;
  return o;
}
function personOut(p, counts) {
  return {
    id: p.id, name: p.name, kind: pplKind(p),
    ...(p.role ? { role: p.role } : {}), ...(p.org ? { org: p.org } : {}), ...(p.group ? { group: p.group } : {}),
    ...(pplPersonEmails(p).length ? { emails: pplPersonEmails(p) } : {}),
    ...(p.aliases && p.aliases.length ? { aliases: p.aliases } : {}),
    ...(p.streams && p.streams.length ? { streams: p.streams } : {}),
    ...(p.self ? { self: true } : {}), ...(p.inactive ? { inactive: true } : {}), ...(p.stub ? { incompleteProfile: true } : {}),
    ...(counts ? { openTasks: counts.get(p.id) || 0 } : {}),
  };
}
function find(s, ref) {
  const q = String(ref || '').trim().toLowerCase();
  const list = Array.isArray(s.people) ? s.people : [];
  return list.find(p => p.id === ref) || list.find(p => String(p.id).toLowerCase() === q) || list.find(p => String(p.name || '').toLowerCase() === q)
    || list.find(p => (p.aliases || []).some(a => String(a).toLowerCase() === q)) || null;
}

export const PEOPLE_QUERIES = [
  {
    name: 'people.list', tool: 'list_people',
    description: 'Everyone in People: id, name, kind (person/org/mailbox), role, org, group, emails, aliases, and how many open tasks link to them. Your own record is marked self.',
    schema: obj({
      text: { type: 'string', maxLength: 100, description: 'optional filter on name, alias, role, org or email' },
      includeInactive: { type: 'boolean', description: 'also list people marked inactive (default true)' },
    }),
    run(q, p) {
      const s = q.s;
      const idx = pplBuildIndex(s.people);
      const counts = new Map();
      for (const t of live(s)) if (statusOf(s, t.id) !== 'done') for (const pid of pplLinked(s, t, idx)) counts.set(pid, (counts.get(pid) || 0) + 1);
      const f = p.text ? p.text.toLowerCase() : '';
      const list = (Array.isArray(s.people) ? s.people : []).filter(x => x && (p.includeInactive !== false || !x.inactive))
        .filter(x => !f || [x.id, x.name, x.role, x.org, x.group, ...pplPersonEmails(x), ...(x.aliases || [])].some(v => String(v || '').toLowerCase().includes(f)));
      const orphans = pplOrphans(s);
      return {
        count: list.length,
        people: list.map(x => personOut(x, counts)),
        ...(orphans.size && !f ? { linkedButNoProfile: [...orphans].map(([id, r]) => ({ id, openTasks: r.open })) } : {}),
      };
    },
  },
  {
    name: 'person.get', tool: 'get_person',
    description: "One person: profile, notes, their open tasks split into 'owe' (things you owe them) and 'waiting' (things you are waiting on them for), how many are done, and lastContact {date, kind: meeting|email|note|task, daysAgo} (when the user was last in touch, or null).",
    schema: obj({ id: { type: 'string', minLength: 1, maxLength: 100, description: 'person id, name or alias' } }, ['id']),
    async run(q, p) {
      const s = q.s;
      const who = find(s, p.id);
      if (!who) {
        const valid = (s.people || []).slice(0, 60).map(x => x.id);
        throw new ActionError('UNKNOWN_PERSON', `unknown person '${truncate(p.id, 40)}'`, { field: 'id', valid, hint: 'list_people shows everyone' });
      }
      const idx = pplBuildIndex(s.people);
      const mine = live(s).filter(t => pplLinked(s, t, idx).includes(who.id));
      const open = mine.filter(t => statusOf(s, t.id) !== 'done').sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));
      return {
        person: personOut(who),
        ...(who.phone ? { phone: who.phone } : {}), ...(who.linkedin ? { linkedin: who.linkedin } : {}), ...(who.tz ? { tz: who.tz } : {}),
        notes: (Array.isArray(who.notes) ? who.notes : []).slice(0, 20).map(n => ({ date: isoInTz(new Date(n.ts || 0), q.clock.timezone), text: truncate(n.text, 600) })),
        owe: open.filter(t => !pplIsWaiting(t)).map(t => mini(q, t)),
        waiting: open.filter(t => pplIsWaiting(t)).map(t => mini(q, t)),
        doneCount: mine.length - open.length,
        // The shared last-contact rule (lib/people-contact.mjs = src/app/53-people-contact-logic.js).
        lastContact: (await lastContactFromData(q, { today: q.clock.today }).catch(() => new Map())).get(who.id) || null,
      };
    },
  },
  {
    name: 'people.suggestions', tool: 'list_link_suggestions',
    description: 'People-linking work to review: open tasks that name someone they are not linked to (strong = in the title or a subtask), ids tasks point at that have no profile, capitalised names in tasks that match nobody (maybe new people: unknownNames, with the tasks that mention them), and people in the next 14 days of calendar events who are not in People (unknownInCalendar: attendees and names in event titles, with the events). Names and addresses the user chose to ignore are already left out. link_suggested_people applies the first list.',
    schema: obj({ limit: { type: 'integer', minimum: 1, maximum: 300 } }),
    async run(q, p) {
      const s = q.s;
      const idx = pplBuildIndex(s.people);
      const lim = p.limit || 60;
      const sug = pplSuggest(s, { index: idx });
      const byId = new Map(live(s).map(t => [t.id, t]));
      const stop = [...(Array.isArray(s.streams) ? s.streams.map(x => x && x.label) : []), ...(s.people || []).flatMap(x => [x.org, x.group]), q.cfg.userName].filter(Boolean);
      const unknown = pplUnknownNames(s, { index: idx, stop, ignore: Array.isArray(s.peopleIgnoredNames) ? s.peopleIgnoredNames : [] });
      return {
        links: sug.slice(0, lim).map(x => ({ taskId: x.taskId, title: truncate((byId.get(x.taskId) || {}).title, 80), personId: x.personId, person: (idx.byId.get(x.personId) || {}).name, where: x.where, strength: x.strength })),
        totalLinks: sug.length,
        strongLinks: sug.filter(x => x.strength === 'strong').length,
        noProfile: [...pplOrphans(s)].map(([id, r]) => ({ id, openTasks: r.open, tasks: r.total })),
        unknownNames: unknown.slice(0, 30).map(u => ({ name: u.name, tasks: u.count, taskIds: u.taskIds.slice(0, 10) })),
        unknownInCalendar: peopleUnknownInEvents(s, await upcomingEvents(q).catch(() => []), { index: idx, stop, myEmails: (q.cfg && q.cfg.myEmails) || [] }).slice(0, 20),
      };
    },
  },
  {
    name: 'tags.list', tool: 'list_tags',
    description: 'Every tag with how many open and total tasks use it (most used first), whether it is canonical, pinned or archived, and flags for tags that should not be tags. Read `rule` before adding a tag.',
    schema: obj({ limit: { type: 'integer', minimum: 1, maximum: 500 }, text: { type: 'string', maxLength: 60, description: 'only tags containing this' } }),
    run(q, p) {
      const s = q.s;
      const usage = tglUsage(s);
      const reg = tglRegistry(s);
      const regMap = new Map((reg || []).map(e => [e.id, e]));
      const ctx = { usage, streamKeys: tglStreamKeys(s), index: pplBuildIndex(s.people), state: s };
      let tags = [...new Set([...[...usage.entries()].filter(([, u]) => u.total).map(([t]) => t), ...regMap.keys()])].map(tag => {
        const u = usage.get(tag) || { open: 0, total: 0 };
        const e = regMap.get(tag);
        const flags = tglFlags(tag, ctx).filter(f => f.kind !== 'archived').map(f => f.kind);
        return { tag, open: u.open, total: u.total, ...(reg ? { canonical: !!e } : {}), ...(e && e.pinned ? { pinned: true } : {}), ...(e && e.archived ? { archived: true } : {}),
          ...(e && e.color ? { color: e.color } : {}), ...(e && e.icon ? { icon: e.icon } : {}), ...(flags.length ? { flags } : {}) };
      });
      if (p.text) { const f = normTag(p.text); tags = tags.filter(t => t.tag.includes(f)); }
      tags.sort((a, b) => (b.open - a.open) || (b.total - a.total) || a.tag.localeCompare(b.tag));
      const lim = p.limit || 100;
      return {
        rule: TAG_RULE,
        count: tags.length,
        ...(reg ? { canonical: reg.filter(e => !e.archived).map(e => e.id) } : {}),
        tags: tags.slice(0, lim), ...(tags.length > lim ? { more: tags.length - lim } : {}),
        similar: tglSimilar(s, usage).slice(0, 10).map(g => ({ into: g.into, from: g.from })),
      };
    },
  },
];

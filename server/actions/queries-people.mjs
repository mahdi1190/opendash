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

import { ActionError, truncate, weekdayOf, daysBetween, normTag, isoInTz } from './model.mjs';
import {
  pplBuildIndex, pplLinked, pplSuggest, pplOrphans, pplUnknownNames, pplIsWaiting, pplPersonEmails, pplKind,
  tglUsage, tglRegistry, tglFlags, tglStreamKeys, tglSimilar,
} from '../../lib/people-tags.mjs';

const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
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
    description: "One person: profile, notes, and their open tasks split into 'owe' (things you owe them) and 'waiting' (things you are waiting on them for), plus how many are done.",
    schema: obj({ id: { type: 'string', minLength: 1, maxLength: 100, description: 'person id, name or alias' } }, ['id']),
    run(q, p) {
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
        ...(who.phone ? { phone: who.phone } : {}), ...(who.linkedin ? { linkedin: who.linkedin } : {}),
        notes: (Array.isArray(who.notes) ? who.notes : []).slice(0, 20).map(n => ({ date: isoInTz(new Date(n.ts || 0), q.clock.timezone), text: truncate(n.text, 600) })),
        owe: open.filter(t => !pplIsWaiting(t)).map(t => mini(q, t)),
        waiting: open.filter(t => pplIsWaiting(t)).map(t => mini(q, t)),
        doneCount: mine.length - open.length,
      };
    },
  },
  {
    name: 'people.suggestions', tool: 'list_link_suggestions',
    description: 'People-linking work to review: open tasks that name someone they are not linked to (strong = in the title or a subtask), ids tasks point at that have no profile, and capitalised names in tasks that match nobody (maybe new people). link_suggested_people applies the first list.',
    schema: obj({ limit: { type: 'integer', minimum: 1, maximum: 300 } }),
    run(q, p) {
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
        unknownNames: unknown.slice(0, 30).map(u => ({ name: u.name, tasks: u.count })),
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

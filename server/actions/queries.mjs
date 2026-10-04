// server/actions/queries.mjs - every READ query of the actions layer.
//
// Each query is { name, tool, description, schema, run(q, params) }, where
//   q = { s (state), cfg, clock:{today, weekday, time, timezone}, paths,
//         financeDir, version, appVersion, journal }
// Results are compact JSON meant for a model with no other context: ids,
// titles, ISO dates and counts; empty fields are left out.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../lib/fsutil.mjs';
import {
  ActionError, STATUSES, PRIORITIES, PRIORITY_LABELS, RECURRENCES, streamList, defaultStream, tagCounts, tagRegistry,
  isIsoDate, isoInTz, stampInTz, addDaysIso, daysBetween, weekdayOf, resolvePerson, resolveStream, normTag, truncate, dateError, closest, levenshtein,
} from './model.mjs';
import { indexTask, scoreTask } from './find.mjs';
import { CALENDAR_QUERIES } from './calendar-queries.mjs';
import { PEOPLE_QUERIES } from './queries-people.mjs';
import { HOME_QUERIES } from './queries-home.mjs';
import { BRIEF_QUERIES } from './queries-brief.mjs';
import { RESOURCE_QUERIES } from './ops-resources.mjs';
import { AUTOLINK_QUERIES } from './ops-autolink.mjs';
import { pplLinked, pplBuildIndex } from '../../lib/people-tags.mjs';

const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const DATE = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', formatHint: 'YYYY-MM-DD' };

export const VIEWS = Object.freeze(['today', 'overdue', 'tomorrow', 'week', 'this-week', 'next-week', 'no-date', 'all', 'pinned', 'doing', 'completed', 'bin']);
const VIEW_HELP = 'today = due today or overdue; overdue; tomorrow; week = due in the next 7 days (and overdue); this-week / next-week = calendar weeks; no-date; all (open); pinned; doing; completed; bin';

// ─── Helpers ───────────────────────────────────────────────────────────────
const statusOf = (s, id) => (s.statuses && s.statuses[id]) || 'todo';
const isLive = (s, t) => t && !(s.deleted && s.deleted[t.id]);
function liveTasks(s) { return (s.custom || []).filter(t => isLive(s, t)); }
function peopleMap(s) { return new Map((Array.isArray(s.people) ? s.people : []).map(p => [p.id, p])); }

/**
 * People linked to a task, exactly as the page counts them: task.people, plus
 * a tag that names someone (blocked-sam, sam-asked...), minus the people the
 * user unlinked (task.peopleExcluded). One rule for the page, the actions
 * layer and MCP: src/app/52-people-link.js (through lib/people-tags.mjs).
 */
export function linkedPeople(s, t) {
  return pplLinked(s, t, _pplIndexFor(s));
}
const _pplIdx = new WeakMap();
function _pplIndexFor(s) {
  const people = Array.isArray(s.people) ? s.people : [];
  const sig = JSON.stringify(people.map(p => p && [p.id, p.name, p.aliases, p.emails, p.email, p.self, p.kind]));
  const hit = _pplIdx.get(s);
  if (hit && hit.sig === sig) return hit.idx;
  const idx = pplBuildIndex(people);
  _pplIdx.set(s, { sig, idx });
  return idx;
}

function weekRange(today, weekStart, offsetWeeks) {
  const startIdx = { Mon: 1, Sun: 0, Sat: 6 }[weekStart] ?? 1;
  const dow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(weekdayOf(today));
  const back = (dow - startIdx + 7) % 7;
  const from = addDaysIso(today, -back + 7 * offsetWeeks);
  return { from, to: addDaysIso(from, 6) };
}

export function compactTask(q, t, pm = peopleMap(q.s)) {
  const s = q.s;
  const o = { id: t.id, title: t.title };
  // The weekday is given so a model never has to work it out (it often gets it wrong).
  if (t.dueDate) { o.due = t.dueDate; o.day = weekdayOf(t.dueDate).slice(0, 3); o.daysLeft = daysBetween(q.clock.today, t.dueDate); }
  o.status = statusOf(s, t.id);
  if (t.priority && t.priority !== 'p0') o.priority = t.priority;
  o.stream = t.stream;
  if (Array.isArray(t.tags) && t.tags.length) o.tags = t.tags;
  const linked = linkedPeople(s, t);
  if (linked.length) o.people = linked.map(id => (pm.get(id) ? pm.get(id).name : id));
  if (s.pinned && s.pinned[t.id]) o.pinned = true;
  const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
  if (subs.length) o.subtasks = `${subs.filter(x => x.done).length}/${subs.length}`;
  if (t.recurrence && t.recurrence !== 'none') o.repeats = t.recurrence;
  // Task fields added by the Tasks area (ops-tasks.mjs): time, plan, estimate, won't do.
  if (t.dueTime) o.time = t.dueTime;
  if (t.plannedFor) o.plannedFor = t.plannedFor;
  if (t.estimate) o.estimateMinutes = t.estimate;
  if (o.status === 'done' && t.resolution === 'wontdo' && (t.resolvedAt || 0) >= ((((s.completionLog || {})[t.id]) || []).slice(-1)[0] || 0)) o.resolution = 'wontdo';
  return o;
}

function binnedTasks(s) {
  return ((s.bin && s.bin.tasks) || []).filter(b => b && b.id);
}

/** Resolve a task id for a read; NOT_FOUND carries the closest titles. */
export function taskNotFound(q, id, field = 'id') {
  const s = q.s;
  const ranked = rankTasks(q, String(id), { includeDone: true, limit: 3 }).filter(r => r.score >= 0.35);
  // A mistyped or truncated id (a character dropped or changed) names its
  // task too: offer ids within two edits.
  const rid = String(id || '').trim();
  const byId = ranked.length || rid.length < 6 ? [] : (s.custom || [])
    .filter(t => t && typeof t.id === 'string' && isLive(s, t) && Math.abs(t.id.length - rid.length) <= 2 && levenshtein(t.id, rid) <= 2)
    .slice(0, 3).map(t => ({ id: t.id, title: t.title, score: 0.9 }));
  const cands = ranked.length ? ranked.map(r => ({ id: r.id, title: r.title, score: r.score })) : byId;
  return new ActionError('NOT_FOUND', `no task with id '${truncate(id, 60)}'`, {
    field,
    candidates: cands,
    hint: ranked.length ? 'did you pass a title? the closest tasks are listed in candidates; use their id'
      : byId.length ? 'the id looks mistyped: the task(s) with the nearest id are in candidates; check the title before using it'
        : 'ids come from list_tasks / search_tasks; never invent one',
  });
}

export function rankTasks(q, text, { includeDone = false, limit = 8, stream, person } = {}) {
  const s = q.s;
  const pm = peopleMap(s);
  const labels = new Map(streamList(s).map(x => [x.id, x.label]));
  const out = [];
  for (const t of liveTasks(s)) {
    const st = statusOf(s, t.id);
    if (!includeDone && st === 'done') continue;
    if (stream && t.stream !== stream) continue;
    const linked = linkedPeople(s, t);
    if (person && !linked.includes(person)) continue;
    const ix = indexTask(t, { peopleById: pm, peopleIds: linked, streamLabel: labels.get(t.stream), notes: (s.notes && s.notes[t.id]) || [] });
    const { score, matchedOn } = scoreTask(ix, text);
    if (score >= 0.3) out.push({ score, matchedOn, t, st });
  }
  out.sort((a, b) => (b.score - a.score) || ((a.st === 'done') - (b.st === 'done')) || String(a.t.dueDate || '9999').localeCompare(String(b.t.dueDate || '9999')));
  return out.slice(0, limit).map(r => ({ ...compactTask(q, r.t, pm), score: r.score, matchedOn: r.matchedOn }));
}

// ─── The queries ───────────────────────────────────────────────────────────
export const QUERIES = [
  {
    name: 'context.get', tool: 'get_context',
    description: 'START HERE. Today\'s date and weekday in the user\'s time zone, the next 14 days, the user, streams, people, tags, countdowns, counts, and what priorities/statuses mean.',
    schema: obj({}),
    run(q) {
      const s = q.s;
      const { open } = tagCounts(s);
      const live = liveTasks(s);
      const openTasks = live.filter(t => statusOf(s, t.id) !== 'done');
      const byStream = new Map();
      for (const t of openTasks) byStream.set(t.stream, (byStream.get(t.stream) || 0) + 1);
      const today = q.clock.today;
      const due = (t) => t.dueDate ? daysBetween(today, t.dueDate) : null;
      const reg = tagRegistry(s);
      // The stream most of a person's tasks live in: a strong hint for where a
      // new task about them belongs.
      const personStreams = new Map();
      {
        const tally = new Map();
        for (const t of live) for (const pid of linkedPeople(s, t)) {
          const m = tally.get(pid) || new Map(); m.set(t.stream, (m.get(t.stream) || 0) + 1); tally.set(pid, m);
        }
        for (const [pid, m] of tally) personStreams.set(pid, [...m.entries()].sort((x, y) => y[1] - x[1])[0][0]);
      }
      return {
        today, weekday: q.clock.weekday, time: q.clock.time, timezone: q.clock.timezone,
        next14Days: Array.from({ length: 14 }, (_, i) => { const d = addDaysIso(today, i + 1); return `${d} ${weekdayOf(d).slice(0, 3)}`; }),
        thisWeek: weekRange(today, q.cfg.weekStart, 0), nextWeek: weekRange(today, q.cfg.weekStart, 1),
        weekStart: q.cfg.weekStart, locale: q.cfg.locale, currency: q.cfg.currency,
        user: q.cfg.userName || null,
        version: q.version,
        streams: streamList(s).filter(x => !x.archived || byStream.get(x.id)).map(x => ({ id: x.id, label: x.label, open: byStream.get(x.id) || 0, ...(x.archived ? { archived: true } : {}) })),
        defaultStream: defaultStream(s),
        people: (Array.isArray(s.people) ? s.people : []).map(p => ({
          id: p.id, name: p.name, ...(p.aliases && p.aliases.length ? { aliases: p.aliases } : {}), ...(p.role ? { role: truncate(p.role, 60) } : {}),
          ...(p.self ? { self: true } : {}), ...(personStreams.get(p.id) ? { usualStream: personStreams.get(p.id) } : {}),
        })),
        tags: {
          ...(reg ? { canonical: reg } : {}),
          mostUsed: [...open.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([tag, n]) => `${tag} (${n})`),
          rule: 'reuse existing tags; a new tag needs createTag:true',
        },
        countdowns: (Array.isArray(s.countdowns) ? s.countdowns : []).map((c, i) => ({ id: c.id, label: c.label, date: c.date, daysLeft: isIsoDate(c.date) ? daysBetween(today, c.date) : null, ...(i === 0 ? { headline: true } : {}) })),
        counts: {
          open: openTasks.length,
          overdue: openTasks.filter(t => due(t) !== null && due(t) < 0).length,
          dueToday: openTasks.filter(t => due(t) === 0).length,
          dueNext7Days: openTasks.filter(t => due(t) !== null && due(t) >= 0 && due(t) <= 7).length,
          doing: openTasks.filter(t => statusOf(s, t.id) === 'doing').length,
          noDate: openTasks.filter(t => !t.dueDate).length,
          inBin: binnedTasks(s).length,
        },
        meaning: {
          priorities: Object.fromEntries(PRIORITIES.map(p => [p, PRIORITY_LABELS[p]])),
          statuses: { todo: 'not started', doing: 'in progress', done: 'finished (kept for history)' },
          recurrence: `${RECURRENCES.join(', ')}; completing a repeating task moves it to its next date and keeps it open`,
          streams: 'a stream is an area of work; every task has exactly one',
          people: 'tasks link to people by id (task.people); create_person adds someone',
          countdowns: 'dated countdowns shown in the top bar; the first one is the headline',
          bin: 'binned tasks can be restored with restore_task',
        },
      };
    },
  },
  {
    name: 'tasks.list', tool: 'list_tasks',
    description: `List tasks with filters (combine freely). view: ${VIEW_HELP}. For "next week" use view:"next-week" (get_context.nextWeek gives the dates). Default: open tasks, soonest first, 50 at most.`,
    schema: obj({
      view: { type: 'string', enum: [...VIEWS], description: VIEW_HELP },
      stream: { type: 'string', maxLength: 60, description: 'stream id' },
      tag: { type: 'string', maxLength: 60 },
      person: { type: 'string', maxLength: 100, description: 'person id or name: tasks linked to them (directly or by a tag such as blocked-<id>)' },
      dueFrom: { ...DATE, description: 'due on or after (YYYY-MM-DD)' },
      dueTo: { ...DATE, description: 'due on or before (YYYY-MM-DD)' },
      status: { type: 'string', enum: ['open', 'todo', 'doing', 'done', 'any'], description: 'default open (todo + doing); a view may imply one' },
      priority: { type: 'string', enum: [...PRIORITIES] },
      text: { type: 'string', maxLength: 200, description: 'words that must appear in the title, description, tags or notes' },
      limit: { type: 'integer', minimum: 1, maximum: 200 },
      offset: { type: 'integer', minimum: 0, maximum: 100000 },
    }),
    run(q, p) {
      const s = q.s;
      const today = q.clock.today;
      for (const f of ['dueFrom', 'dueTo']) if (p[f] !== undefined && !isIsoDate(p[f])) throw dateError(f, p[f], today);
      const view = p.view;
      if (view === 'bin') {
        const items = binnedTasks(s).sort((a, b) => b.binTs - a.binTs).map(b => ({ id: b.id, title: b.title, stream: b.stream, binnedAt: isoInTz(new Date(b.binTs), q.clock.timezone) }));
        const lim = p.limit || 50, off = p.offset || 0;
        return { view, total: items.length, count: Math.min(lim, Math.max(0, items.length - off)), tasks: items.slice(off, off + lim) };
      }
      const stream = p.stream !== undefined ? resolveStream(s, p.stream) : null;
      const person = p.person !== undefined ? resolvePerson(s, p.person).id : null;
      const tag = p.tag !== undefined ? normTag(p.tag) : null;
      let status = p.status || (view === 'completed' ? 'done' : view === 'doing' ? 'doing' : 'open');
      const range = view === 'this-week' ? weekRange(today, q.cfg.weekStart, 0) : view === 'next-week' ? weekRange(today, q.cfg.weekStart, 1) : null;
      const words = p.text ? p.text.toLowerCase().split(/\s+/).filter(Boolean) : [];
      const pm = peopleMap(s);
      let items = liveTasks(s).filter(t => {
        const st = statusOf(s, t.id);
        if (status === 'open' && st === 'done') return false;
        if (status !== 'open' && status !== 'any' && st !== status) return false;
        const d = t.dueDate ? daysBetween(today, t.dueDate) : null;
        // Today = due today or earlier, planned for today (or a past day), or in progress (as on the page).
        if (view === 'today' && !((d !== null && d <= 0) || (t.plannedFor && t.plannedFor <= today) || st === 'doing')) return false;
        if (view === 'overdue' && !(d !== null && d < 0)) return false;
        if (view === 'tomorrow' && d !== 1) return false;
        if (view === 'week' && !(d !== null && d <= 7)) return false;
        if (range && !(t.dueDate && t.dueDate >= range.from && t.dueDate <= range.to)) return false;
        if (view === 'no-date' && t.dueDate) return false;
        if (view === 'pinned' && !(s.pinned && s.pinned[t.id])) return false;
        if (stream && t.stream !== stream) return false;
        if (tag && !(Array.isArray(t.tags) && t.tags.includes(tag))) return false;
        if (person && !linkedPeople(s, t).includes(person)) return false;
        if (p.priority && (t.priority || 'p0') !== p.priority) return false;
        if (p.dueFrom && !(t.dueDate && t.dueDate >= p.dueFrom)) return false;
        if (p.dueTo && !(t.dueDate && t.dueDate <= p.dueTo)) return false;
        if (words.length) {
          const hay = [t.title, t.detail || '', ...(t.tags || []), ...((s.notes && s.notes[t.id]) || []).map(n => n.text), ...(t.subtasks || []).map(x => x.title)].join(' ').toLowerCase();
          if (!words.every(w => hay.includes(w))) return false;
        }
        return true;
      });
      const PO = { p1: 0, p2: 1, p3: 2, p0: 3 };
      items.sort((a, b) => {
        if (view === 'completed') {
          const la = ((s.completionLog || {})[a.id] || []).slice(-1)[0] || 0, lb = ((s.completionLog || {})[b.id] || []).slice(-1)[0] || 0;
          return lb - la;
        }
        const pa = s.pinned && s.pinned[a.id] ? 0 : 1, pb = s.pinned && s.pinned[b.id] ? 0 : 1;
        if (pa !== pb) return pa - pb;
        const da = a.dueDate || '9999-99-99', db = b.dueDate || '9999-99-99';
        return da.localeCompare(db) || (PO[a.priority || 'p0'] - PO[b.priority || 'p0']) || String(a.title).localeCompare(String(b.title));
      });
      const total = items.length;
      const lim = p.limit || 50, off = p.offset || 0;
      items = items.slice(off, off + lim);
      return {
        today, ...(view ? { view } : {}), ...(range ? { range } : {}), status,
        total, count: items.length, ...(off + items.length < total ? { more: `${total - off - items.length} more: pass offset ${off + items.length}` } : {}),
        tasks: items.map(t => compactTask(q, t, pm)),
      };
    },
  },
  {
    name: 'task.get', tool: 'get_task',
    description: 'Everything about one task: description, subtasks (with ids), notes, people, recent history. Works for binned tasks too.',
    schema: obj({ id: { type: 'string', minLength: 1, maxLength: 160, description: 'task id' } }, ['id']),
    run(q, p) {
      const s = q.s;
      const id = String(p.id).trim();
      let t = (s.custom || []).find(x => x && x.id === id);
      let binned = null;
      if (!t || (s.deleted && s.deleted[id])) {
        const b = binnedTasks(s).filter(x => x.id === id).sort((a, c) => c.binTs - a.binTs)[0];
        if (!b) throw taskNotFound(q, id);
        binned = b;
        t = t || b.customData || { id, title: b.title, stream: b.stream };
      }
      const pm = peopleMap(s);
      const labels = new Map(streamList(s).map(x => [x.id, x.label]));
      const notes = binned ? (binned.notes || []) : ((s.notes && s.notes[id]) || []);
      const activity = ((s.taskActivity && s.taskActivity[id]) || []).slice(-15);
      return {
        id, title: t.title, ...(binned ? { binned: true, binnedAt: new Date(binned.binTs).toISOString() } : {}),
        status: binned ? (binned.status || 'todo') : statusOf(s, id),
        due: t.dueDate || null, ...(t.dueDate ? { daysLeft: daysBetween(q.clock.today, t.dueDate), weekday: weekdayOf(t.dueDate) } : {}),
        priority: t.priority || 'p0', stream: t.stream, streamLabel: labels.get(t.stream) || t.stream,
        tags: t.tags || [],
        people: linkedPeople(s, t).map(pid => ({ id: pid, name: pm.get(pid) ? pm.get(pid).name : null, ...((t.people || []).includes(pid) ? {} : { via: 'tag' }) })),
        recurrence: t.recurrence || 'none', pinned: !!(s.pinned && s.pinned[id]),
        detail: t.detail || '',
        subtasks: (t.subtasks || []).map(x => ({ id: x.id, title: x.title, done: !!x.done })),
        // Times on the user's own clock (config.timezone), like every other date here.
        notes: notes.map(n => ({ id: n.id, at: n.ts ? stampInTz(n.ts, q.clock.timezone) : null, text: n.text })),
        history: activity.map(a => ({ at: a.ts ? stampInTz(a.ts, q.clock.timezone) : null, type: a.type, ...(a.from !== undefined ? { from: a.from } : {}), ...(a.to !== undefined ? { to: a.to } : {}), ...(a.text ? { text: a.text } : {}), ...(a.reason ? { reason: a.reason } : {}), ...(a.source ? { by: a.client ? `${a.source}:${a.client}` : a.source } : {}) })),
        ...(t.createdAt && !Number.isNaN(new Date(t.createdAt).getTime()) ? { createdAt: isoInTz(new Date(t.createdAt), q.clock.timezone) } : {}),
      };
    },
  },
  {
    name: 'tasks.find', tool: 'search_tasks',
    description: 'Fuzzy search by words in the title, people, tags, subtasks or description. Returns ranked candidates with a score (1 = exact). Use it before creating or changing a task.',
    schema: obj({
      text: { type: 'string', minLength: 1, maxLength: 200, description: 'what the user called the task, e.g. "email Sam about the report"' },
      includeDone: { type: 'boolean', description: 'also search finished tasks' },
      stream: { type: 'string', maxLength: 60 }, person: { type: 'string', maxLength: 100 },
      limit: { type: 'integer', minimum: 1, maximum: 30 },
    }, ['text']),
    run(q, p) {
      const stream = p.stream !== undefined ? resolveStream(q.s, p.stream) : undefined;
      const person = p.person !== undefined ? resolvePerson(q.s, p.person).id : undefined;
      const results = rankTasks(q, p.text, { includeDone: !!p.includeDone, limit: p.limit || 8, stream, person });
      // Several tasks scoring (nearly) the same as the best one: the words do
      // not say which task is meant, so the model must not just take the first.
      const tied = results.length ? results.filter(r => results[0].score - r.score <= 0.03) : [];
      const ambiguous = tied.length > 1 && results[0].score >= 0.5;
      return {
        query: p.text, count: results.length, results,
        ...(ambiguous ? { ambiguous: true, equallyGood: tied.length } : {}),
        advice: !results.length ? 'no match: it is probably a new task'
          : ambiguous ? `AMBIGUOUS: ${tied.length} tasks match equally well, so do not pick one. Ask the user which they mean (list the candidates with their due dates), unless they clearly meant all of them.`
            : results[0].score >= 0.85 ? 'the top result is very likely the task meant' : 'no strong match: confirm with the user or treat it as new',
      };
    },
  },
  {
    name: 'people.list', tool: 'list_people',
    description: 'Everyone in the dashboard with id, aliases, role and how many open tasks link to them.',
    schema: obj({ text: { type: 'string', maxLength: 100, description: 'optional filter on name, alias, role or email' } }),
    run(q, p) {
      const s = q.s;
      const counts = new Map();
      for (const t of liveTasks(s)) if (statusOf(s, t.id) !== 'done') for (const pid of linkedPeople(s, t)) counts.set(pid, (counts.get(pid) || 0) + 1);
      const f = p.text ? p.text.toLowerCase() : '';
      const people = (Array.isArray(s.people) ? s.people : []).filter(x => !f || [x.id, x.name, x.role, x.email, ...(x.aliases || [])].some(v => String(v || '').toLowerCase().includes(f)));
      const known = new Set((s.people || []).map(x => x.id));
      const dangling = [...counts.keys()].filter(id => !known.has(id));
      return {
        count: people.length,
        people: people.map(x => ({ id: x.id, name: x.name, ...(x.aliases && x.aliases.length ? { aliases: x.aliases } : {}), ...(x.role ? { role: x.role } : {}), ...(x.email ? { email: x.email } : {}), ...(x.self ? { self: true } : {}), openTasks: counts.get(x.id) || 0 })),
        ...(dangling.length && !f ? { linkedButNoProfile: dangling.map(id => ({ id, openTasks: counts.get(id) })) } : {}),
      };
    },
  },
  {
    name: 'countdowns.list', tool: 'list_countdowns',
    description: 'The countdowns in the top bar, in order (the first is the headline), with days left.',
    schema: obj({}),
    run(q) {
      const list = Array.isArray(q.s.countdowns) ? q.s.countdowns : [];
      return { today: q.clock.today, countdowns: list.map((c, i) => ({ id: c.id, label: c.label, date: c.date, daysLeft: isIsoDate(c.date) ? daysBetween(q.clock.today, c.date) : null, ...(c.icon ? { icon: c.icon } : {}), ...(c.color ? { color: c.color } : {}), ...(i === 0 ? { headline: true } : {}) })) };
    },
  },
  {
    name: 'tags.list', tool: 'list_tags',
    description: 'Every tag with how many open and total tasks use it (most used first), and the canonical list if there is one.',
    schema: obj({ limit: { type: 'integer', minimum: 1, maximum: 500 }, text: { type: 'string', maxLength: 60, description: 'only tags containing this' } }),
    run(q, p) {
      const { open, total } = tagCounts(q.s);
      const reg = tagRegistry(q.s);
      const regSet = new Set(reg || []);
      let tags = [...total.keys()].map(tag => ({ tag, open: open.get(tag) || 0, total: total.get(tag), ...(reg ? { canonical: regSet.has(tag) } : {}) }));
      for (const r of reg || []) if (!total.has(r)) tags.push({ tag: r, open: 0, total: 0, canonical: true });
      if (p.text) tags = tags.filter(t => t.tag.includes(normTag(p.text)));
      tags.sort((a, b) => (b.open - a.open) || (b.total - a.total) || a.tag.localeCompare(b.tag));
      const lim = p.limit || 100;
      return { count: tags.length, ...(reg ? { canonical: reg } : {}), tags: tags.slice(0, lim), ...(tags.length > lim ? { more: tags.length - lim } : {}) };
    },
  },
  {
    name: 'calendar.list', tool: 'list_calendar',
    description: 'Calendar events between two dates (read-only, from the last calendar snapshot). Default: today and the next 7 days.',
    schema: obj({ from: { ...DATE, description: 'first day (default today)' }, to: { ...DATE, description: 'last day (default today + 7)' } }),
    async run(q, p) {
      const today = q.clock.today;
      for (const f of ['from', 'to']) if (p[f] !== undefined && !isIsoDate(p[f])) throw dateError(f, p[f], today);
      const from = p.from || today, to = p.to || addDaysIso(from, 7);
      if (to < from) throw new ActionError('BAD_VALUE', `'to' (${to}) is before 'from' (${from})`, { field: 'to' });
      if (daysBetween(from, to) > 92) throw new ActionError('BAD_VALUE', 'the range can be at most 92 days', { field: 'to' });
      const file = q.paths.calendarFile;
      const snap = existsSync(file) ? await readJson(file, { fallback: null }).catch(() => null) : null;
      if (!snap || !Array.isArray(snap.events)) return { from, to, events: [], note: 'no calendar snapshot yet: connect the calendar in the dashboard' };
      const tz = q.clock.timezone;
      const dayOf = (v) => {
        if (!v) return null;
        const raw = typeof v === 'string' ? v : (v.dateTime || v.date || null);
        if (!raw) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { day: raw, time: null, allDay: true, raw };
        const d = new Date(raw);
        if (isNaN(d)) return null;
        let day = raw.slice(0, 10), time = null;
        try {
          day = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
          time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
        } catch { /* keep the raw date */ }
        return { day, time, allDay: false, raw };
      };
      const events = [];
      for (const e of snap.events) {
        const st = dayOf(e.start), en = dayOf(e.end) || st;
        if (!st) continue;
        const endDay = en.allDay && en.day > st.day ? addDaysIso(en.day, -1) : en.day;   // all-day ends are exclusive
        if (endDay < from || st.day > to) continue;
        events.push({
          ...(e.id ? { id: String(e.id).slice(0, 120) } : {}),
          title: truncate(e.summary || e.title || '(no title)', 200),
          date: st.day, weekday: weekdayOf(st.day), ...(st.time ? { start: st.time } : { allDay: true }), ...(en.time && !st.allDay ? { end: en.time } : {}),
          ...(endDay !== st.day ? { until: endDay } : {}),
          ...(e.location ? { location: truncate(e.location, 120) } : {}),
        });
      }
      events.sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
      const fetchedAt = snap.fetchedAt || null;
      const age = fetchedAt ? Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 86400000) : null;
      return { from, to, fetchedAt, ...(age !== null && age >= 1 ? { stale: `the snapshot is ${age} day(s) old; refresh it in the dashboard` } : {}), count: events.length, events };
    },
  },
  {
    name: 'finance.summary', tool: 'get_finance_summary',
    description: 'Read-only spending aggregates (this week, this month, by category, recurring total, balances). No individual transactions.',
    schema: obj({}),
    async run(q) {
      const dir = q.financeDir;
      const file = dir ? join(dir, '_system', 'analysis.json') : null;
      const a = file && existsSync(file) ? await readJson(file, { fallback: null }).catch(() => null) : null;
      if (!a) return { available: false, note: 'no finance analysis yet: set up Finances in the dashboard' };
      const num = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : null);
      const top = (o, n = 8) => Object.entries(o || {}).filter(([, v]) => typeof v === 'number').sort((x, y) => y[1] - x[1]).slice(0, n).map(([k, v]) => ({ category: k, total: num(v) }));
      const bal = Array.isArray(a.balances) ? a.balances : [];
      const cur = q.cfg.currency;
      return {
        available: true, currency: cur,
        asOf: a.latest_transaction || null, staleDays: num(a.stale_days),
        week: a.week ? { from: a.week.start, to: a.week.end, total: num(a.week.total), averageOfPreviousWeeks: num(a.week.avg_prev), byCategory: top(a.week.by_category) } : null,
        month: a.month ? { label: a.month.label, toDate: num(a.month.mtd), lastMonthSameDay: num(a.month.last_month_to_date), lastMonthFull: num(a.month.last_month_full), byCategory: top(a.month.by_category), threeMonthAverageByCategory: top(a.month.avg3_by_category) } : null,
        incomeThisMonth: num(a.income_month),
        recurringMonthlyTotal: num(a.recurring_monthly_total),
        recurringCount: Array.isArray(a.recurring) ? a.recurring.length : 0,
        flagsCount: Array.isArray(a.flags) ? a.flags.length : 0,
        uncategorisedMerchants: Array.isArray(a.uncategorised_merchants) ? a.uncategorised_merchants.length : 0,
        balances: bal.length ? { accounts: bal.length, total: num(bal.filter(b => !b.currency || b.currency === cur).reduce((t, b) => t + (Number(b.balance) || 0), 0)) } : null,
      };
    },
  },
  {
    name: 'history.list', tool: 'list_history',
    description: 'Recent changes made through the actions layer (by the page, the assistant, MCP clients or scripts), newest first, with undo tokens.',
    schema: obj({ limit: { type: 'integer', minimum: 1, maximum: 100 } }),
    async run(q, p) {
      const h = await q.journal.history(p.limit || 20);
      return { count: h.length, history: h };
    },
  },
  {
    name: 'proposal.get', tool: 'get_proposal',
    description: 'A stored proposal (from propose_changes): its ops and preview.',
    schema: obj({ id: { type: 'string', minLength: 1, maxLength: 80 } }, ['id']),
    async run(q, p) {
      const pr = await q.journal.getProposal(p.id);
      if (!pr) throw new ActionError('NOT_FOUND', `no proposal '${truncate(p.id, 40)}' (proposals expire after 7 days)`, { field: 'id' });
      return pr;
    },
  },
];

// Calendar/Email queries (server/actions/calendar-queries.mjs) and People/Tags
// queries (server/actions/queries-people.mjs) replace or add by name.
for (const cq of [...CALENDAR_QUERIES, ...PEOPLE_QUERIES, ...HOME_QUERIES, ...RESOURCE_QUERIES, ...BRIEF_QUERIES, ...AUTOLINK_QUERIES]) {   // + queries-home.mjs (top bar, Home), ops-resources.mjs (Files & links), queries-brief.mjs (brief, reviews)
  const i = QUERIES.findIndex(x => x.name === cq.name);
  if (i >= 0) QUERIES[i] = cq; else QUERIES.push(cq);
}

export const QUERY_BY_NAME = new Map(QUERIES.map(x => [x.name, x]));
export const QUERY_BY_TOOL = new Map(QUERIES.map(x => [x.tool, x]));
export { closest };

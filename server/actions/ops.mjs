// server/actions/ops.mjs - every WRITE operation of the actions layer.
//
// Each op is { name, tool, description, schema, danger, run(ctx, params) }.
//   name      'task.create' ...          (POST /api/actions {ops:[{op:name, ...params}]})
//   tool      'create_task' ...          (the MCP tool name)
//   schema    JSON Schema of the params  (tools/list, GET /api/actions/schema)
//   danger    true for deletes/merges: a batch holding one needs a dry run first
//   run       mutates ctx.s (a working copy of the state) and returns
//             { summary, changes:[{entity, id, label, field, from, to}] }
//
// ctx (built in engine.mjs): s, today, now, source, client, refs, warn(msg),
//   touch(entityKey), task(id, field) -> live task, log(taskId, type, details),
//   checkTags(tags, createTag, field), findSimilar(title).

import {
  ActionError, STATUSES, PRIORITY_INPUTS, PRIORITY_LABELS, RECURRENCES, LIMITS,
  cleanLine, cleanText, normTag, slug, isIsoDate, dateError, addDaysIso, advanceByRecurrence,
  newTaskId, newSubtaskId, newNoteId, newCountdownId, resolveStream, defaultStream, normPriority,
  resolvePerson, tagCounts, tagRegistry, closest, truncate, clone,
} from './model.mjs';
import { STREAM_OPS } from './ops-streams.mjs';
import { CALENDAR_OPS } from './ops-calendar.mjs';
import { extendPeopleOps } from './ops-people.mjs';
import { HOME_OPS } from './ops-home.mjs';
import { TASK_OPS } from './ops-tasks.mjs';
import { BRIEF_OPS } from './ops-brief.mjs';
import { RESOURCE_OPS } from './ops-resources.mjs';
import { AUTOLINK_OPS, bindAutolinkOps } from './ops-autolink.mjs';
import { DAYNOTE_OPS } from './ops-daynotes.mjs';
import { tglRenameRefs } from '../../lib/people-tags.mjs';

// ─── Schema building blocks ────────────────────────────────────────────────
const S = {
  taskId: { type: 'string', minLength: 1, maxLength: 160, description: "task id from list_tasks / search_tasks / get_task (never invent one), or '$name' for a task created earlier in the same batch with ref:'name'" },
  date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', formatHint: 'YYYY-MM-DD', description: 'ISO date YYYY-MM-DD (no natural language; get_context gives today)' },
  dateOrNull: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$', formatHint: 'YYYY-MM-DD', description: 'ISO date YYYY-MM-DD, or null for no date' },
  priority: { type: 'string', enum: [...PRIORITY_INPUTS], description: 'p1 = high, p2 = medium, p3 = low, p0 = none (high/medium/low/none also accepted)' },
  stream: { type: 'string', minLength: 1, maxLength: 60, description: 'stream id from get_context (a stream label is also accepted)' },
  tag: { type: 'string', minLength: 1, maxLength: 60, description: "tag, e.g. 'email' (lower-case; a leading # is dropped)" },
  tags: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 20, description: 'tags (existing ones; see list_tags)' },
  createTag: { type: 'boolean', description: 'true to allow a tag that does not exist yet (avoid: reuse existing tags)' },
  person: { type: 'string', minLength: 1, maxLength: 100, description: 'person id from list_people (an exact name or alias also works)' },
  people: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 100 }, maxItems: 20, description: 'person ids (from list_people)' },
  recurrence: { type: 'string', enum: [...RECURRENCES], description: 'repeat rule; completing a repeating task moves it to its next date' },
  title: { type: 'string', minLength: 1, maxLength: 1000, description: `short task title (max ${LIMITS.title} characters kept)` },
  detail: { type: 'string', maxLength: 40000, description: 'longer description (plain text)' },
  status: { type: 'string', enum: [...STATUSES], description: 'todo, doing (in progress) or done' },
  reason: { type: 'string', maxLength: 1000, description: 'optional short reason, kept in the task history' },
  countdownId: { type: 'string', minLength: 1, maxLength: 120, description: 'countdown id from list_countdowns (or its exact label)' },
  icon: { type: 'string', maxLength: 32, description: "optional symbol: an emoji or an icon name such as 'calendar'" },
  color: { type: 'string', maxLength: 40, description: "optional colour, e.g. '#2563eb'" },
};
const obj = (properties, required = [], extra = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extra });

// ─── Field setters (shared by several ops) ─────────────────────────────────
const label = (t) => truncate(t.title, 60);
function change(t, field, from, to) { return { entity: 'task', id: t.id, label: label(t), field, from: from ?? null, to: to ?? null }; }

function checkDate(ctx, v, field) {
  if (v === null) return null;
  if (!isIsoDate(v)) throw dateError(field, v, ctx.today);
  return v;
}

function setTitle(ctx, t, v) {
  const nv = cleanLine(v, LIMITS.title);
  if (!nv) throw new ActionError('BAD_VALUE', 'title must not be empty', { field: 'title' });
  if (nv === t.title) return [];
  const from = t.title; t.title = nv; ctx.log(t.id, 'title', { from, to: nv });
  return [change(t, 'title', from, nv)];
}
function setDetail(ctx, t, v) {
  const nv = cleanText(v, LIMITS.detail);
  if (nv === (t.detail ?? '')) return [];
  const from = t.detail ?? ''; t.detail = nv; ctx.log(t.id, 'update', { field: 'detail', text: 'Description edited' });
  return [change(t, 'detail', truncate(from, 80), truncate(nv, 80))];
}
function setDue(ctx, t, v, reason, field = 'dueDate') {
  const nv = checkDate(ctx, v, field);
  const from = t.dueDate || null;
  if (nv === from) return [];
  t.dueDate = nv;
  ctx.log(t.id, 'date', { from, to: nv, reason: reason ? cleanLine(reason, LIMITS.reason) : null });
  return [change(t, 'dueDate', from, nv)];
}
function setPriority(ctx, t, v) {
  const nv = normPriority(v);
  const from = t.priority ?? 'p0';
  if (nv === from) return [];
  t.priority = nv; ctx.log(t.id, 'priority', { from, to: nv });
  return [change(t, 'priority', from, nv)];
}
function setStream(ctx, t, v) {
  const nv = resolveStream(ctx.s, v);
  if (nv === t.stream) return [];
  const from = t.stream; t.stream = nv; ctx.log(t.id, 'stream', { from, to: nv });
  return [change(t, 'stream', from, nv)];
}
function setRecurrence(ctx, t, v) {
  const nv = v ?? 'none';
  if (nv === (t.recurrence ?? 'none')) return [];
  const from = t.recurrence ?? 'none'; t.recurrence = nv; ctx.log(t.id, 'recurrence', { from, to: nv });
  return [change(t, 'recurrence', from, nv)];
}
function setTags(ctx, t, tags, createTag) {
  const nv = ctx.checkTags(tags, createTag, 'tags');
  const from = Array.isArray(t.tags) ? t.tags : [];
  if (nv.join('\u0000') === from.join('\u0000')) return [];
  t.tags = nv; ctx.log(t.id, 'tags', { from, to: nv, text: 'Tags: ' + (nv.join(', ') || 'none') });
  return [change(t, 'tags', from, nv)];
}
function setPeople(ctx, t, list) {
  const ids = [];
  for (const [i, p] of list.entries()) { const hit = resolvePerson(ctx.s, p, `people[${i}]`); if (!ids.includes(hit.id)) ids.push(hit.id); }
  const from = Array.isArray(t.people) ? t.people : [];
  if (ids.join('\u0000') === from.join('\u0000')) return [];
  t.people = ids; ctx.log(t.id, 'people', { from, to: ids, text: 'People: ' + (ids.join(', ') || 'none') });
  return [change(t, 'people', from, ids)];
}
function setPinned(ctx, t, v) {
  const was = !!(ctx.s.pinned && ctx.s.pinned[t.id]);
  if (was === !!v) return [];
  ctx.s.pinned = ctx.s.pinned || {};
  if (v) ctx.s.pinned[t.id] = true; else delete ctx.s.pinned[t.id];
  ctx.log(t.id, 'pin', { pinned: !!v });
  return [change(t, 'pinned', was, !!v)];
}
/** Status change with the page's rules: completing a repeating task rolls it to its next date. */
function setStatus(ctx, t, v) {
  const s = ctx.s;
  s.statuses = s.statuses || {};
  const prev = s.statuses[t.id] || 'todo';
  if (prev === v) { ctx.warn(`'${label(t)}' is already ${v}`); return []; }
  const out = [];
  ctx.log(t.id, 'status', { from: prev, to: v });
  s.statuses[t.id] = v;
  out.push(change(t, 'status', prev, v));
  if (v === 'done') {
    s.completionLog = s.completionLog || {};
    (s.completionLog[t.id] = s.completionLog[t.id] || []).push(ctx.now);
    const rec = t.recurrence ?? 'none';
    if (rec && rec !== 'none') {
      // Same rules as the page (20-task-model.js _rollRecurring): next date after
      // today, month anchor kept, subtasks reset, today's plan cleared.
      if (rec === 'monthly' && !t.repeatDay && t.dueDate) t.repeatDay = Number(t.dueDate.slice(8, 10));
      const next = advanceByRecurrence(t.dueDate || null, rec, ctx.today, t.repeatDay);
      out.push(...setDue(ctx, t, next, `repeats ${rec}`));
      if (Array.isArray(t.subtasks) && t.subtasks.some(x => x && x.done)) t.subtasks = t.subtasks.map(x => ({ ...x, done: false }));
      delete t.plannedFor; delete t.plannedTime; delete t.plannedMinutes;   // the planned slot goes with the plan
      s.statuses[t.id] = 'todo';
      out.push(change(t, 'status', 'done', 'todo (repeats)'));
    }
  }
  return out;
}

const UPDATE_FIELDS = ['title', 'detail', 'dueDate', 'priority', 'stream', 'tags', 'recurrence', 'status', 'pinned', 'people'];
function applyFields(ctx, t, p) {
  const ch = [];
  if (p.title !== undefined) ch.push(...setTitle(ctx, t, p.title));
  if (p.detail !== undefined) ch.push(...setDetail(ctx, t, p.detail));
  if (p.stream !== undefined) ch.push(...setStream(ctx, t, p.stream));
  if (p.priority !== undefined) ch.push(...setPriority(ctx, t, p.priority));
  if (p.dueDate !== undefined) ch.push(...setDue(ctx, t, p.dueDate, p.reason));
  if (p.recurrence !== undefined) ch.push(...setRecurrence(ctx, t, p.recurrence));
  if (p.tags !== undefined) ch.push(...setTags(ctx, t, p.tags, p.createTag));
  if (p.people !== undefined) ch.push(...setPeople(ctx, t, p.people));
  if (p.pinned !== undefined) ch.push(...setPinned(ctx, t, p.pinned));
  if (p.status !== undefined) ch.push(...setStatus(ctx, t, p.status));
  return ch;
}
const describeChanges = (ch) => ch.filter(c => c.field !== 'status' || !String(c.to).includes('repeats'))
  .map(c => `${c.field} ${fmt(c.from)} -> ${fmt(c.to)}`).join(', ');
const fmt = (v) => (Array.isArray(v) ? `[${v.join(', ')}]` : v === null || v === '' ? '(none)' : String(v));

function findSubtask(t, ref, field = 'subtaskId') {
  const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
  const q = String(ref).trim();
  const hit = subs.find(x => x.id === q) || subs.find(x => String(x.title).toLowerCase() === q.toLowerCase());
  if (hit) return hit;
  throw new ActionError('NOT_FOUND', `task '${label(t)}' has no subtask '${truncate(q, 40)}'`, {
    field, valid: subs.map(x => x.id), hint: subs.length ? `subtasks: ${subs.map(x => `${x.id} = "${truncate(x.title, 40)}"`).join('; ')}` : 'this task has no subtasks',
  });
}

function findCountdown(ctx, ref, field = 'id') {
  const list = Array.isArray(ctx.s.countdowns) ? ctx.s.countdowns : [];
  const q = String(ref).trim();
  const hit = list.find(c => c.id === q) || list.find(c => String(c.label).toLowerCase() === q.toLowerCase());
  if (hit) return hit;
  throw new ActionError('NOT_FOUND', `no countdown '${truncate(q, 40)}'`, { field, valid: list.map(c => c.id), hint: list.length ? `countdowns: ${list.map(c => `${c.id} = "${truncate(c.label, 30)}"`).join('; ')}` : 'there are no countdowns yet' });
}

function cleanIcon(v) { return v == null ? undefined : cleanLine(v, LIMITS.icon); }
function cleanColor(v) {
  if (v == null || v === '') return undefined;
  const c = String(v).trim();
  if (!/^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(c)) throw new ActionError('BAD_VALUE', `color must be a hex colour like '#2563eb' or a CSS colour name; got '${truncate(c, 20)}'`, { field: 'color' });
  return c;
}

/** Every tag known: the registry (if any) plus every tag in use. */
function knownTags(s) {
  const { total } = tagCounts(s);
  return new Set([...(tagRegistry(s) || []), ...total.keys()]);
}
function tasksWithTag(s, tag) {
  return (s.custom || []).filter(t => t && Array.isArray(t.tags) && t.tags.includes(tag));
}
function registryEdit(ctx, fn) {
  const s = ctx.s;
  const key = Object.prototype.hasOwnProperty.call(s, 'tagRegistry') ? 'tagRegistry' : Object.prototype.hasOwnProperty.call(s, 'tags') ? 'tags' : null;
  if (!key) return;
  ctx.touch('tagRegistry');
  const r = s[key];
  if (Array.isArray(r)) {
    s[key] = fn(r.slice(), 'array');
  } else if (r && typeof r === 'object') {
    s[key] = fn({ ...r }, 'object');
  }
}
const regName = (x) => (typeof x === 'string' ? x : x && (x.id || x.name || x.tag));
function regRename(list, kind, from, to) {
  if (kind === 'object') { if (from in list) { if (!(to in list)) list[to] = list[from]; delete list[from]; } return list; }
  const out = [];
  for (const x of list) {
    if (regName(x) === from) {
      if (out.some(y => regName(y) === to) || list.some(y => regName(y) === to)) continue;
      out.push(typeof x === 'string' ? to : { ...x, ...(x.id !== undefined ? { id: to } : {}), ...(x.name !== undefined ? { name: to } : {}), ...(x.tag !== undefined ? { tag: to } : {}) });
    } else out.push(x);
  }
  return out;
}
function regRemove(list, kind, tag) {
  if (kind === 'object') { delete list[tag]; return list; }
  return list.filter(x => regName(x) !== tag);
}
/**
 * The rest of a tag rename/merge (tasks are done by the op): binned copies,
 * quick-add and saved templates, pinnedTags, the saved view filter, the open
 * view and its prefs, registry aliases (tglRenameRefs, shared with the page).
 * to = null removes the tags (delete). -> the places that changed, for the summary.
 */
function retagElsewhere(ctx, froms, to) {
  const s = ctx.s, out = [];
  const map = (list) => { const r = []; for (const x of list) { const y = froms.includes(x) ? to : x; if (y && !r.includes(y)) r.push(y); } return r; };
  let bin = 0, tpl = 0;
  for (const b of (s.bin && Array.isArray(s.bin.tasks)) ? s.bin.tasks : []) {
    const d = b && b.customData;
    if (!d || !Array.isArray(d.tags) || !d.tags.some(x => froms.includes(x))) continue;
    ctx.touch('task:' + b.id); d.tags = map(d.tags); bin++;
  }
  for (const key of ['quickTemplates', 'taskTemplates']) {
    const list = Array.isArray(s[key]) ? s[key] : [];
    if (!list.some(tp => tp && Array.isArray(tp.tags) && tp.tags.some(x => froms.includes(x)))) continue;
    ctx.touch('key:' + key);
    for (const tp of list) if (tp && Array.isArray(tp.tags) && tp.tags.some(x => froms.includes(x))) { tp.tags = map(tp.tags); tpl++; }
  }
  if (Array.isArray(s.pinnedTags) && s.pinnedTags.some(x => froms.includes(x))) { ctx.touch('key:pinnedTags'); s.pinnedTags = map(s.pinnedTags); out.push('pinned'); }
  const refs = new Set();
  if (to) {
    ctx.touch('key:viewFilter'); ctx.touch('tagRegistry');
    for (const f of froms) for (const r of tglRenameRefs(s, f, to)) refs.add(r);
  }
  if (bin) out.push(`${bin} in the bin`);
  if (tpl) out.push(`${tpl} template${tpl === 1 ? '' : 's'}`);
  if (refs.has('viewFilter') || refs.has('taskViewPrefs') || refs.has('view')) out.push('saved view');
  return out;
}

// ─── The ops ───────────────────────────────────────────────────────────────
export const OPS = [
  {
    name: 'task.create', tool: 'create_task',
    description: 'Create a task. Search first (search_tasks) so you do not create a duplicate.',
    schema: obj({
      title: S.title, dueDate: S.dateOrNull, priority: S.priority, stream: S.stream, tags: S.tags, createTag: S.createTag,
      detail: S.detail, subtasks: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 1000 }, maxItems: 50, description: 'subtask titles' },
      people: S.people, recurrence: S.recurrence, status: { type: 'string', enum: ['todo', 'doing'], description: 'initial status (default todo)' },
      pinned: { type: 'boolean', description: 'pin to the top of lists' },
      ref: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,40}$', formatHint: 'letters, digits, _ or -', description: "name this task so later ops in the same batch can use id '$name'" },
      allowDuplicate: { type: 'boolean', description: 'create even if a very similar open task exists' },
    }, ['title']),
    run(ctx, p) {
      const s = ctx.s;
      const title = cleanLine(p.title, LIMITS.title);
      if (!title) throw new ActionError('BAD_VALUE', 'title must not be empty', { field: 'title' });
      if (!p.allowDuplicate) {
        const dup = ctx.findSimilar(title);
        if (dup.length) {
          throw new ActionError('DUPLICATE_TASK', `a very similar open task already exists: ${dup.map(d => `${d.id} "${truncate(d.title, 50)}"`).join('; ')}`, {
            field: 'title', candidates: dup, hint: 'update that task instead, or pass allowDuplicate:true if this really is a separate task',
          });
        }
      }
      let stream;
      if (p.stream !== undefined) stream = resolveStream(s, p.stream);
      else { stream = defaultStream(s); ctx.warn(`no stream given; used the default stream '${stream}'`); }
      const id = newTaskId();
      ctx.touch('task:' + id);
      const t = {
        id, title,
        dueDate: p.dueDate === undefined ? null : checkDate(ctx, p.dueDate, 'dueDate'),
        priority: p.priority !== undefined ? normPriority(p.priority) : 'p0',
        tags: ctx.checkTags(p.tags || [], p.createTag, 'tags'),
        stream,
        detail: p.detail !== undefined ? cleanText(p.detail, LIMITS.detail) : '',
        subtasks: (p.subtasks || []).map(x => cleanLine(x, LIMITS.subtask)).filter(Boolean).map(x => ({ id: newSubtaskId(), title: x, done: false, ts: ctx.now })),
        recurrence: p.recurrence || 'none',
        people: [],
        createdAt: ctx.now,
        createdVia: ctx.source,
      };
      for (const [i, ref] of (p.people || []).entries()) { const hit = resolvePerson(s, ref, `people[${i}]`); if (!t.people.includes(hit.id)) t.people.push(hit.id); }
      s.custom.push(t);
      ctx.log(id, 'created', { text: 'Created' });
      if (p.status && p.status !== 'todo') { s.statuses = s.statuses || {}; s.statuses[id] = p.status; }
      if (p.pinned) { s.pinned = s.pinned || {}; s.pinned[id] = true; }
      if (p.ref) ctx.refs.set(p.ref, id);
      const bits = [t.stream, t.dueDate ? `due ${t.dueDate}` : 'no date', t.priority !== 'p0' ? `${t.priority} ${PRIORITY_LABELS[t.priority]}` : null,
        t.people.length ? `with ${t.people.join(', ')}` : null, t.tags.length ? `#${t.tags.join(' #')}` : null].filter(Boolean);
      return { summary: `Create task "${label(t)}" (${bits.join(', ')})`, changes: [{ entity: 'task', id, label: label(t), field: 'created', from: null, to: t.title }], created: { id, ref: p.ref } };
    },
  },
  {
    name: 'task.update', tool: 'update_task',
    description: 'Change one or more fields of a task (title, detail, dueDate, priority, stream, tags, recurrence, status, pinned, people). tags/people REPLACE the list.',
    schema: obj({
      id: S.taskId, title: S.title, detail: S.detail, dueDate: S.dateOrNull, priority: S.priority, stream: S.stream,
      tags: S.tags, createTag: S.createTag, recurrence: S.recurrence, status: S.status,
      pinned: { type: 'boolean' }, people: S.people, reason: S.reason,
    }, ['id'], { minProperties: 2, ignoreForMin: ['createTag', 'reason'], minPropertiesMessage: `update_task needs at least one field to change: ${UPDATE_FIELDS.join(', ')}` }),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const ch = applyFields(ctx, t, p);
      if (!ch.length) ctx.warn(`'${label(t)}': nothing to change (the values are already set)`);
      return { summary: ch.length ? `Update "${label(t)}": ${describeChanges(ch)}` : `No change to "${label(t)}"`, changes: ch };
    },
  },
  {
    name: 'task.complete', tool: 'complete_task',
    description: 'Mark a task done. A repeating task moves to its next date instead and stays open.',
    schema: obj({ id: S.taskId }, ['id']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const ch = setStatus(ctx, t, 'done');
      const rolled = ch.find(c => c.field === 'dueDate');
      return { summary: rolled ? `Complete "${label(t)}" (repeats: next due ${rolled.to})` : ch.length ? `Complete "${label(t)}"` : `"${label(t)}" was already done`, changes: ch };
    },
  },
  {
    name: 'task.reopen', tool: 'reopen_task',
    description: 'Set a done (or in-progress) task back to todo.',
    schema: obj({ id: S.taskId }, ['id']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const ch = setStatus(ctx, t, 'todo');
      return { summary: ch.length ? `Reopen "${label(t)}"` : `"${label(t)}" was already open`, changes: ch };
    },
  },
  {
    name: 'task.bin', tool: 'bin_task', danger: true,
    description: 'Move a task to the bin (the page can restore it; restore_task too). Needs a dry run first.',
    schema: obj({ id: S.taskId }, ['id']),
    run(ctx, p) {
      const s = ctx.s;
      const t = ctx.task(p.id);
      const id = t.id;
      ctx.touch('task:' + id);
      s.bin = s.bin || { tasks: [], notes: [] };
      s.bin.tasks = s.bin.tasks || [];
      let binTs = ctx.now;
      while (s.bin.tasks.some(b => b && b.binTs === binTs)) binTs++;
      const isCustom = id.startsWith('u-');
      s.bin.tasks.push({
        binTs, kind: isCustom ? 'custom' : 'seed', id, title: t.title, stream: t.stream,
        customData: isCustom ? clone(t) : null,
        status: (s.statuses && s.statuses[id]) || 'todo',
        notes: s.notes && Array.isArray(s.notes[id]) ? clone(s.notes[id]) : [],
        pinned: !!(s.pinned && s.pinned[id]),
        binnedVia: ctx.source,
      });
      if (isCustom) s.custom = s.custom.filter(x => x.id !== id);
      else { s.deleted = s.deleted || {}; s.deleted[id] = true; }
      if (s.statuses) delete s.statuses[id];
      if (s.notes) delete s.notes[id];
      if (s.pinned) delete s.pinned[id];
      ctx.log(id, 'binned', { text: 'Moved to the bin' });
      return { summary: `Move "${label(t)}" to the bin`, changes: [change(t, 'binned', false, true)] };
    },
  },
  {
    name: 'task.restore', tool: 'restore_task',
    description: 'Bring a task back from the bin.',
    schema: obj({ id: { type: 'string', minLength: 1, maxLength: 160, description: 'id of the binned task (get_task shows binned tasks)' } }, ['id']),
    run(ctx, p) {
      const s = ctx.s;
      const id = String(p.id).trim();
      const entries = (s.bin && s.bin.tasks || []).filter(b => b && b.id === id);
      if (!entries.length) {
        const live = (s.custom || []).find(t => t.id === id && !(s.deleted || {})[id]);
        throw new ActionError(live ? 'NOT_BINNED' : 'NOT_FOUND', live ? `task ${id} is not in the bin` : `no task ${id} in the bin`, { field: 'id', hint: live ? 'it is already active' : 'get_task or list_tasks {view:"bin"} shows binned tasks' });
      }
      const e = entries.reduce((a, b) => (b.binTs > a.binTs ? b : a));
      ctx.touch('task:' + id);
      if (e.kind === 'custom') {
        let data = e.customData ? clone(e.customData) : null;
        if (data && (e.taskOverride || e.dateOverride)) {
          if (e.taskOverride) Object.assign(data, e.taskOverride);
          if (e.dateOverride) data.dueDate = e.dateOverride;
        }
        if (!data) throw new ActionError('CANNOT_RESTORE', `the bin entry for ${id} has no task data`, { field: 'id' });
        if (!s.custom.some(c => c.id === id)) s.custom.push(data);
      } else {
        if (s.deleted) delete s.deleted[id];
        const item = s.custom.find(c => c.id === id);
        if (item) { if (e.taskOverride) Object.assign(item, e.taskOverride); if (e.dateOverride) item.dueDate = e.dateOverride; }
      }
      if (e.status && e.status !== 'todo') { s.statuses = s.statuses || {}; s.statuses[id] = e.status; }
      if (e.notes && e.notes.length) { s.notes = s.notes || {}; s.notes[id] = clone(e.notes); }
      if (e.pinned) { s.pinned = s.pinned || {}; s.pinned[id] = true; }
      s.bin.tasks = s.bin.tasks.filter(b => b !== e);
      ctx.log(id, 'restored', { text: 'Restored from the bin' });
      const t = s.custom.find(c => c.id === id) || { id, title: e.title };
      return { summary: `Restore "${label(t)}" from the bin`, changes: [change(t, 'binned', true, false)] };
    },
  },
  {
    name: 'task.reschedule', tool: 'reschedule_task',
    description: 'Set a new due date (dueDate, or null to clear it) OR move the current one by shiftDays. "Push back", "postpone", "delay", "move out" mean LATER: positive shiftDays (2 = two days later). "Bring forward" means earlier: negative.',
    schema: obj({
      id: S.taskId, dueDate: S.dateOrNull,
      shiftDays: { type: 'integer', minimum: -366, maximum: 366, description: 'move the current due date by this many days: positive = later (push back / postpone), negative = earlier (bring forward)' },
      reason: S.reason,
    }, ['id']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const hasDate = p.dueDate !== undefined, hasShift = p.shiftDays !== undefined;
      if (hasDate === hasShift) throw new ActionError('INVALID_PARAMS', 'reschedule_task needs exactly one of dueDate or shiftDays', { field: hasDate ? 'shiftDays' : 'dueDate' });
      let target = p.dueDate;
      if (hasShift) {
        if (!t.dueDate) throw new ActionError('NO_DUE_DATE', `"${label(t)}" has no due date to shift`, { field: 'shiftDays', hint: 'pass dueDate instead' });
        target = addDaysIso(t.dueDate, p.shiftDays);
      }
      const ch = setDue(ctx, t, target, p.reason);
      return { summary: ch.length ? `Reschedule "${label(t)}": ${fmt(ch[0].from)} -> ${fmt(ch[0].to)}` : `"${label(t)}" is already due ${fmt(target)}`, changes: ch };
    },
  },
  {
    name: 'task.set_priority', tool: 'set_task_priority',
    description: 'Set the priority of a task.',
    schema: obj({ id: S.taskId, priority: S.priority }, ['id', 'priority']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const ch = setPriority(ctx, t, p.priority);
      return { summary: ch.length ? `Priority of "${label(t)}": ${ch[0].from} -> ${ch[0].to}` : `"${label(t)}" already has that priority`, changes: ch };
    },
  },
  {
    name: 'task.move_stream', tool: 'move_task_stream',
    description: 'Move a task to another stream (area of work).',
    schema: obj({ id: S.taskId, stream: S.stream }, ['id', 'stream']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const ch = setStream(ctx, t, p.stream);
      return { summary: ch.length ? `Move "${label(t)}" to stream ${ch[0].to}` : `"${label(t)}" is already in ${t.stream}`, changes: ch };
    },
  },
  {
    name: 'task.add_subtask', tool: 'add_subtask',
    description: 'Add a subtask (checklist item) to a task.',
    schema: obj({ id: S.taskId, title: { type: 'string', minLength: 1, maxLength: 1000 }, done: { type: 'boolean' } }, ['id', 'title']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const title = cleanLine(p.title, LIMITS.subtask);
      if (!title) throw new ActionError('BAD_VALUE', 'subtask title must not be empty', { field: 'title' });
      t.subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
      const st = { id: newSubtaskId(), title, done: !!p.done, ts: ctx.now };
      t.subtasks.push(st);
      ctx.log(t.id, 'subtask', { text: `Subtask added: ${truncate(title, 60)}` });
      return { summary: `Add subtask "${truncate(title, 50)}" to "${label(t)}"`, changes: [change(t, 'subtask+', null, title)], created: { subtaskId: st.id } };
    },
  },
  {
    name: 'task.update_subtask', tool: 'update_subtask',
    description: 'Rename a subtask and/or tick it done or not done.',
    schema: obj({ id: S.taskId, subtaskId: { type: 'string', minLength: 1, maxLength: 1000, description: 'subtask id from get_task (its exact title also works)' }, title: { type: 'string', minLength: 1, maxLength: 1000 }, done: { type: 'boolean' } }, ['id', 'subtaskId'], { minProperties: 3, minPropertiesMessage: 'update_subtask needs title and/or done' }),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const st = findSubtask(t, p.subtaskId);
      const ch = [];
      if (p.title !== undefined) {
        const nv = cleanLine(p.title, LIMITS.subtask);
        if (!nv) throw new ActionError('BAD_VALUE', 'subtask title must not be empty', { field: 'title' });
        if (nv !== st.title) { ch.push(change(t, 'subtask title', st.title, nv)); st.title = nv; }
      }
      if (p.done !== undefined && !!p.done !== !!st.done) { ch.push(change(t, `subtask "${truncate(st.title, 30)}" done`, !!st.done, !!p.done)); st.done = !!p.done; }
      if (ch.length) ctx.log(t.id, 'subtask', { text: `Subtask ${p.done === true ? 'done' : 'updated'}: ${truncate(st.title, 60)}` });
      return { summary: ch.length ? `Update subtask "${truncate(st.title, 40)}" of "${label(t)}"` : 'No change to the subtask', changes: ch };
    },
  },
  {
    name: 'task.remove_subtask', tool: 'remove_subtask',
    description: 'Remove a subtask from a task.',
    schema: obj({ id: S.taskId, subtaskId: { type: 'string', minLength: 1, maxLength: 1000, description: 'subtask id from get_task (its exact title also works)' } }, ['id', 'subtaskId']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const st = findSubtask(t, p.subtaskId);
      t.subtasks = t.subtasks.filter(x => x !== st);
      ctx.log(t.id, 'subtask', { text: `Subtask removed: ${truncate(st.title, 60)}` });
      return { summary: `Remove subtask "${truncate(st.title, 40)}" from "${label(t)}"`, changes: [change(t, 'subtask-', st.title, null)] };
    },
  },
  {
    name: 'task.add_note', tool: 'add_task_note',
    description: 'Add a dated note to a task (newest first).',
    schema: obj({ id: S.taskId, text: { type: 'string', minLength: 1, maxLength: 40000 } }, ['id', 'text']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const text = cleanText(p.text, LIMITS.note);
      if (!text) throw new ActionError('BAD_VALUE', 'note text must not be empty', { field: 'text' });
      ctx.s.notes = ctx.s.notes || {};
      const arr = Array.isArray(ctx.s.notes[t.id]) ? ctx.s.notes[t.id] : [];
      const n = { id: newNoteId(), ts: ctx.now, text, via: ctx.source };
      ctx.s.notes[t.id] = [n, ...arr];
      ctx.log(t.id, 'note', { text: 'Note added' });
      return { summary: `Add a note to "${label(t)}"`, changes: [change(t, 'note+', null, truncate(text, 80))], created: { noteId: n.id } };
    },
  },
  {
    name: 'task.link_person', tool: 'link_person',
    description: 'Link a person to a task.',
    schema: obj({ id: S.taskId, person: S.person }, ['id', 'person']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const who = resolvePerson(ctx.s, p.person);
      const cur = Array.isArray(t.people) ? t.people : [];
      if (cur.includes(who.id)) { ctx.warn(`${who.name || who.id} is already linked to '${label(t)}'`); return { summary: 'No change', changes: [] }; }
      t.people = [...cur, who.id];
      ctx.log(t.id, 'people', { text: `Linked ${who.name || who.id}` });
      return { summary: `Link ${who.name || who.id} to "${label(t)}"`, changes: [change(t, 'people', cur, t.people)] };
    },
  },
  {
    name: 'task.unlink_person', tool: 'unlink_person',
    description: 'Remove a person from a task.',
    schema: obj({ id: S.taskId, person: S.person }, ['id', 'person']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const cur = Array.isArray(t.people) ? t.people : [];
      let pid = String(p.person).trim();
      if (!cur.includes(pid)) { try { pid = resolvePerson(ctx.s, p.person).id; } catch (e) { if (!cur.includes(pid)) throw e; } }
      if (!cur.includes(pid)) { ctx.warn(`'${pid}' is not linked to '${label(t)}'`); return { summary: 'No change', changes: [] }; }
      t.people = cur.filter(x => x !== pid);
      ctx.log(t.id, 'people', { text: `Unlinked ${pid}` });
      return { summary: `Unlink ${pid} from "${label(t)}"`, changes: [change(t, 'people', cur, t.people)] };
    },
  },
  {
    name: 'task.add_tag', tool: 'add_tag',
    description: 'Add a tag to a task. Reuse existing tags (list_tags); a new tag needs createTag:true.',
    schema: obj({ id: S.taskId, tag: S.tag, createTag: S.createTag }, ['id', 'tag']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const [tag] = ctx.checkTags([p.tag], p.createTag, 'tag');
      const cur = Array.isArray(t.tags) ? t.tags : [];
      if (cur.includes(tag)) { ctx.warn(`'${label(t)}' already has #${tag}`); return { summary: 'No change', changes: [] }; }
      t.tags = [...cur, tag];
      ctx.log(t.id, 'tags', { text: `Tag added: ${tag}` });
      return { summary: `Tag "${label(t)}" #${tag}`, changes: [change(t, 'tags', cur, t.tags)] };
    },
  },
  {
    name: 'task.remove_tag', tool: 'remove_tag',
    description: 'Remove a tag from a task.',
    schema: obj({ id: S.taskId, tag: S.tag }, ['id', 'tag']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const tag = normTag(p.tag);
      const cur = Array.isArray(t.tags) ? t.tags : [];
      if (!cur.includes(tag)) { ctx.warn(`'${label(t)}' has no tag #${tag}`); return { summary: 'No change', changes: [] }; }
      t.tags = cur.filter(x => x !== tag);
      ctx.log(t.id, 'tags', { text: `Tag removed: ${tag}` });
      return { summary: `Remove #${tag} from "${label(t)}"`, changes: [change(t, 'tags', cur, t.tags)] };
    },
  },

  // ── People ────────────────────────────────────────────────────────────
  {
    name: 'person.create', tool: 'create_person',
    description: 'Add a person (a contact tasks can be linked to). Check list_people first.',
    schema: obj({
      name: { type: 'string', minLength: 1, maxLength: 200 },
      id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{0,39}$', formatHint: 'lower-case letters, digits and -', description: 'optional id; default: the first name in lower case (tasks that already point at that id get linked)' },
      email: { type: 'string', maxLength: 200 }, role: { type: 'string', maxLength: 300, description: 'role or relationship, e.g. "supervisor"' },
      phone: { type: 'string', maxLength: 60 }, linkedin: { type: 'string', maxLength: 500 },
      aliases: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 20, description: 'other names or nicknames (lower-case)' },
      color: S.color,
      allowDuplicate: { type: 'boolean', description: 'create even if someone with this name exists' },
    }, ['name']),
    run(ctx, p) {
      const s = ctx.s;
      s.people = Array.isArray(s.people) ? s.people : [];
      const name = cleanLine(p.name, LIMITS.name);
      if (!name) throw new ActionError('BAD_VALUE', 'name must not be empty', { field: 'name' });
      const lname = name.toLowerCase();
      const dup = s.people.find(x => String(x.name || '').toLowerCase() === lname || (x.aliases || []).some(a => String(a).toLowerCase() === lname));
      if (dup && !p.allowDuplicate) throw new ActionError('DUPLICATE_PERSON', `${dup.name} already exists (id '${dup.id}')`, { field: 'name', candidates: [{ id: dup.id, name: dup.name }], hint: 'use update_person, or allowDuplicate:true for a different person with the same name' });
      const taken = new Set(s.people.map(x => x.id));
      let id = p.id;
      if (id && taken.has(id)) throw new ActionError('ID_TAKEN', `person id '${id}' is already used by ${s.people.find(x => x.id === id).name}`, { field: 'id' });
      if (!id) {
        const first = slug(name.split(/\s+/)[0]) || 'person';
        id = !taken.has(first) ? first : slug(name) && !taken.has(slug(name)) ? slug(name) : null;
        for (let n = 2; !id; n++) if (!taken.has(`${first}-${n}`)) id = `${first}-${n}`;
      }
      ctx.touch('person:' + id);
      const colors = ['#2563eb', '#7c3aed', '#059669', '#0891b2', '#ea580c', '#db2777', '#dc2626', '#6b7280'];
      const person = {
        id, name, email: cleanLine(p.email || '', LIMITS.email), role: cleanLine(p.role || '', LIMITS.role),
        phone: cleanLine(p.phone || '', LIMITS.phone), linkedin: cleanLine(p.linkedin || '', LIMITS.url), avatarUrl: '',
        color: cleanColor(p.color) || colors[s.people.length % colors.length],
        aliases: [...new Set((p.aliases || []).map(a => cleanLine(a, LIMITS.alias).toLowerCase()).filter(Boolean))],
      };
      s.people.push(person);
      const linked = (s.custom || []).filter(t => Array.isArray(t.people) && t.people.includes(id)).length;
      if (linked) ctx.warn(`${linked} existing task(s) already pointed at '${id}' and are now linked to ${name}`);
      return { summary: `Add person ${name} (id '${id}')`, changes: [{ entity: 'person', id, label: name, field: 'created', from: null, to: name }], created: { personId: id } };
    },
  },
  {
    name: 'person.update', tool: 'update_person',
    description: 'Change a person: name, email, role, phone, linkedin, aliases (replaces the list) or colour.',
    schema: obj({
      id: S.person, name: { type: 'string', minLength: 1, maxLength: 200 }, email: { type: 'string', maxLength: 200 },
      role: { type: 'string', maxLength: 300 }, phone: { type: 'string', maxLength: 60 }, linkedin: { type: 'string', maxLength: 500 },
      aliases: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 20 }, color: S.color,
    }, ['id'], { minProperties: 2, minPropertiesMessage: 'update_person needs at least one field to change: name, email, role, phone, linkedin, aliases, color' }),
    run(ctx, p) {
      const who = resolvePerson(ctx.s, p.id, 'id');
      ctx.touch('person:' + who.id);
      const ch = [];
      const set = (field, v) => { if (v === undefined) return; if (JSON.stringify(v) !== JSON.stringify(who[field] ?? (field === 'aliases' ? [] : ''))) { ch.push({ entity: 'person', id: who.id, label: who.name, field, from: who[field] ?? null, to: v }); who[field] = v; } };
      if (p.name !== undefined) { const n = cleanLine(p.name, LIMITS.name); if (!n) throw new ActionError('BAD_VALUE', 'name must not be empty', { field: 'name' }); set('name', n); }
      set('email', p.email === undefined ? undefined : cleanLine(p.email, LIMITS.email));
      set('role', p.role === undefined ? undefined : cleanLine(p.role, LIMITS.role));
      set('phone', p.phone === undefined ? undefined : cleanLine(p.phone, LIMITS.phone));
      set('linkedin', p.linkedin === undefined ? undefined : cleanLine(p.linkedin, LIMITS.url));
      set('aliases', p.aliases === undefined ? undefined : [...new Set(p.aliases.map(a => cleanLine(a, LIMITS.alias).toLowerCase()).filter(Boolean))]);
      set('color', p.color === undefined ? undefined : cleanColor(p.color));
      return { summary: ch.length ? `Update ${who.name}: ${ch.map(c => c.field).join(', ')}` : `No change to ${who.name}`, changes: ch };
    },
  },

  // ── Countdowns (the top bar) ──────────────────────────────────────────
  {
    name: 'countdown.create', tool: 'create_countdown',
    description: 'Add a countdown to the top bar. position 0 makes it the headline.',
    schema: obj({ label: { type: 'string', minLength: 1, maxLength: 200 }, date: S.date, icon: S.icon, color: S.color, position: { type: 'integer', minimum: 0, maximum: 100, description: '0 = first (the headline); default: last' } }, ['label', 'date']),
    run(ctx, p) {
      const s = ctx.s;
      ctx.touch('countdowns');
      s.countdowns = Array.isArray(s.countdowns) ? s.countdowns : [];
      const lbl = cleanLine(p.label, LIMITS.label);
      if (!lbl) throw new ActionError('BAD_VALUE', 'label must not be empty', { field: 'label' });
      if (!isIsoDate(p.date)) throw dateError('date', p.date, ctx.today);
      if (s.countdowns.some(c => String(c.label).toLowerCase() === lbl.toLowerCase() && c.date === p.date)) {
        throw new ActionError('DUPLICATE_COUNTDOWN', `a countdown "${lbl}" on ${p.date} already exists`, { field: 'label' });
      }
      const cd = { id: newCountdownId(), label: lbl, date: p.date };
      const icon = cleanIcon(p.icon); if (icon) cd.icon = icon;
      const color = cleanColor(p.color); if (color) cd.color = color;
      const at = p.position === undefined ? s.countdowns.length : Math.min(p.position, s.countdowns.length);
      s.countdowns.splice(at, 0, cd);
      return { summary: `Add countdown "${lbl}" (${p.date})${at === 0 ? ' as the headline' : ''}`, changes: [{ entity: 'countdown', id: cd.id, label: lbl, field: 'created', from: null, to: p.date }], created: { countdownId: cd.id } };
    },
  },
  {
    name: 'countdown.update', tool: 'update_countdown',
    description: 'Change a countdown: label, date, icon or colour.',
    schema: obj({ id: S.countdownId, label: { type: 'string', minLength: 1, maxLength: 200 }, date: S.date, icon: S.icon, color: S.color }, ['id'], { minProperties: 2, minPropertiesMessage: 'update_countdown needs label, date, icon or color' }),
    run(ctx, p) {
      ctx.touch('countdowns');
      const cd = findCountdown(ctx, p.id);
      const ch = [];
      const set = (field, v) => { if (v === undefined || v === cd[field]) return; ch.push({ entity: 'countdown', id: cd.id, label: cd.label, field, from: cd[field] ?? null, to: v }); cd[field] = v; };
      if (p.label !== undefined) { const l = cleanLine(p.label, LIMITS.label); if (!l) throw new ActionError('BAD_VALUE', 'label must not be empty', { field: 'label' }); set('label', l); }
      if (p.date !== undefined) { if (!isIsoDate(p.date)) throw dateError('date', p.date, ctx.today); set('date', p.date); }
      if (p.icon !== undefined) set('icon', cleanIcon(p.icon));
      if (p.color !== undefined) set('color', cleanColor(p.color));
      return { summary: ch.length ? `Update countdown "${truncate(cd.label, 40)}": ${ch.map(c => `${c.field} -> ${c.to}`).join(', ')}` : 'No change', changes: ch };
    },
  },
  {
    name: 'countdown.delete', tool: 'delete_countdown', danger: true,
    description: 'Remove a countdown from the top bar. Needs a dry run first.',
    schema: obj({ id: S.countdownId }, ['id']),
    run(ctx, p) {
      ctx.touch('countdowns');
      const cd = findCountdown(ctx, p.id);
      ctx.s.countdowns = ctx.s.countdowns.filter(c => c !== cd);
      return { summary: `Delete countdown "${truncate(cd.label, 40)}" (${cd.date})`, changes: [{ entity: 'countdown', id: cd.id, label: cd.label, field: 'deleted', from: cd.date, to: null }] };
    },
  },
  {
    name: 'countdown.reorder', tool: 'reorder_countdowns',
    description: 'Put countdowns in a new order: the ids listed come first, in that order (the first is the headline); the rest keep their order after them.',
    schema: obj({ ids: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 120 }, minItems: 1, maxItems: 100, uniqueItems: true } }, ['ids']),
    run(ctx, p) {
      ctx.touch('countdowns');
      const list = Array.isArray(ctx.s.countdowns) ? ctx.s.countdowns : [];
      const picked = p.ids.map((ref, i) => findCountdown(ctx, ref, `ids[${i}]`));
      const before = list.map(c => c.id);
      ctx.s.countdowns = [...picked, ...list.filter(c => !picked.includes(c))];
      const after = ctx.s.countdowns.map(c => c.id);
      const same = before.join() === after.join();
      return { summary: same ? 'Countdowns already in that order' : `Reorder countdowns (headline: "${truncate(ctx.s.countdowns[0].label, 40)}")`, changes: same ? [] : [{ entity: 'countdown', id: '*', label: 'order', field: 'order', from: before, to: after }] };
    },
  },

  // ── Tags (whole-dashboard) ────────────────────────────────────────────
  {
    name: 'tag.rename', tool: 'rename_tag',
    description: 'Rename a tag everywhere: every task that has it (also in the bin), quick-add and saved templates, the pinned tags, saved views and the tag list (its colour and symbol come along). To fold it into an existing tag use merge_tags.',
    schema: obj({ from: S.tag, to: S.tag }, ['from', 'to']),
    run(ctx, p) {
      const from = normTag(p.from), to = normTag(p.to);
      if (!to) throw new ActionError('BAD_VALUE', 'the new tag name is empty after cleaning', { field: 'to' });
      const known = knownTags(ctx.s);
      if (!known.has(from)) throw new ActionError('UNKNOWN_TAG', `no tag '${from}'`, { field: 'from', hint: (closest(from, [...known]).map(x => `'${x}'`).join(' or ') || 'list_tags shows every tag') });
      if (from === to) return { summary: 'No change', changes: [] };
      if (known.has(to)) throw new ActionError('TAG_EXISTS', `tag '${to}' already exists`, { field: 'to', hint: `use merge_tags {from:['${from}'], into:'${to}'}` });
      const ch = [];
      for (const t of tasksWithTag(ctx.s, from)) {
        ctx.touch('task:' + t.id);
        const cur = t.tags; t.tags = cur.map(x => (x === from ? to : x));
        ctx.log(t.id, 'tags', { text: `Tag renamed: ${from} -> ${to}` });
        ch.push(change(t, 'tags', cur, t.tags));
      }
      const also = retagElsewhere(ctx, [from], to);
      registryEdit(ctx, (list, kind) => regRename(list, kind, from, to));
      if (!ch.length) ch.push({ entity: 'tag', id: to, label: '#' + to, field: 'name', from, to });
      return { summary: `Rename #${from} to #${to} (${ch.filter(c => c.entity === 'task').length} task${ch.filter(c => c.entity === 'task').length === 1 ? '' : 's'}${also.length ? '; also ' + also.join(', ') : ''})`, changes: ch };
    },
  },
  {
    name: 'tag.merge', tool: 'merge_tags', danger: true,
    description: "Fold one or more tags into another (e.g. from ['mtg-prep'] into 'meeting') on every task. Needs a dry run first.",
    schema: obj({ from: { type: 'array', items: S.tag, minItems: 1, maxItems: 50 }, into: S.tag }, ['from', 'into']),
    run(ctx, p) {
      const into = normTag(p.into);
      if (!into) throw new ActionError('BAD_VALUE', 'into is empty after cleaning', { field: 'into' });
      const known = knownTags(ctx.s);
      const from = [...new Set(p.from.map(normTag))].filter(x => x && x !== into);
      const missing = from.filter(x => !known.has(x));
      if (missing.length) throw new ActionError('UNKNOWN_TAG', `unknown tag(s): ${missing.join(', ')}`, { field: 'from', hint: missing.map(m => closest(m, [...known])[0]).filter(Boolean).map(x => `'${x}'`).join(', ') || 'list_tags shows every tag' });
      const ch = [];
      for (const t of (ctx.s.custom || [])) {
        if (!Array.isArray(t.tags) || !t.tags.some(x => from.includes(x))) continue;
        ctx.touch('task:' + t.id);
        const cur = t.tags;
        const out = [];
        for (const x of cur) { const y = from.includes(x) ? into : x; if (!out.includes(y)) out.push(y); }
        t.tags = out;
        ctx.log(t.id, 'tags', { text: `Tags merged into ${into}` });
        ch.push(change(t, 'tags', cur, out));
      }
      retagElsewhere(ctx, from, into);
      registryEdit(ctx, (list, kind) => {
        let l = list;
        for (const f of from) l = regRemove(l, kind, f);
        if (kind === 'object') { if (!(into in l)) l[into] = (list[from[0]] || {}); return l; }
        if (!l.some(x => regName(x) === into) && (list.some(x => from.includes(regName(x))))) l.push(typeof list[0] === 'string' || !list.length ? into : { id: into });
        return l;
      });
      return { summary: `Merge #${from.join(', #')} into #${into} (${ch.length} task${ch.length === 1 ? '' : 's'})`, changes: ch };
    },
  },
  {
    name: 'tag.delete', tool: 'delete_tag', danger: true,
    description: 'Remove a tag from every task. Needs a dry run first.',
    schema: obj({ tag: S.tag }, ['tag']),
    run(ctx, p) {
      const tag = normTag(p.tag);
      const known = knownTags(ctx.s);
      if (!known.has(tag)) throw new ActionError('UNKNOWN_TAG', `no tag '${tag}'`, { field: 'tag', hint: closest(tag, [...known]).map(x => `'${x}'`).join(' or ') || 'list_tags shows every tag' });
      const ch = [];
      for (const t of tasksWithTag(ctx.s, tag)) {
        ctx.touch('task:' + t.id);
        const cur = t.tags; t.tags = cur.filter(x => x !== tag);
        ctx.log(t.id, 'tags', { text: `Tag removed: ${tag}` });
        ch.push(change(t, 'tags', cur, t.tags));
      }
      retagElsewhere(ctx, [tag], null);
      registryEdit(ctx, (list, kind) => regRemove(list, kind, tag));
      return { summary: `Delete #${tag} (from ${ch.length} task${ch.length === 1 ? '' : 's'})`, changes: ch };
    },
  },
  ...STREAM_OPS,                                   // ops-streams.mjs (Settings > Streams)
  ...CALENDAR_OPS,                                 // ops-calendar.mjs (Calendar + Email triage)
  ...TASK_OPS,                                     // ops-tasks.mjs (Tasks: plan, won't do, subtask order, estimate)
  ...RESOURCE_OPS,                                 // ops-resources.mjs (Files & links)
  ...BRIEF_OPS,                                    // ops-brief.mjs (Review: save a weekly review / evening recap)
  ...AUTOLINK_OPS,                                 // ops-autolink.mjs (auto-linking: suggest, rate, apply, reject, relate)
  ...DAYNOTE_OPS,                                  // ops-daynotes.mjs (Home's Daily note: save a day's markdown)
];
extendPeopleOps(OPS);                              // ops-people.mjs (People + tag registry)
// ops-home.mjs (top bar + Home): replaces countdown.* with the 2.0 widget versions, adds the rest.
for (const op of HOME_OPS) { const i = OPS.findIndex(o => o.name === op.name); if (i >= 0) OPS[i] = op; else OPS.push(op); }

export const OP_BY_NAME = new Map(OPS.map(o => [o.name, o]));
export const OP_BY_TOOL = new Map(OPS.map(o => [o.tool, o]));
bindAutolinkOps(OP_BY_NAME);                       // links.apply runs create_resource / annotate_event / link_person / relate_task

// server/actions/ops-tasks.mjs - task write operations added by the Tasks area
// (owner: Tasks), so an assistant or MCP client can do what the task views and
// the task panel do. Appended to OPS in ops.mjs (TASK_OPS).
//
//   task.plan               [plan_task]               the day you plan to WORK on a task (separate
//                                                     from its deadline); Today shows it
//   task.wont_do            [wont_do_task]            close a task without doing it; on a repeating
//                                                     task: skip this occurrence (it moves on)
//   task.reorder_subtasks   [reorder_subtasks]        put a task's subtasks in a new order
//   task.promote_subtask    [promote_subtask]         turn a subtask into its own task
//   task.set_estimate       [set_task_estimate]       how long it will take (minutes, or null)
//
// Same rules as the page (src/app/20-task-model.js): "won't do" is status done
// + resolution:'wontdo' (+ resolvedAt) and never counts as a completion.

import {
  ActionError, cleanLine, isIsoDate, dateError, truncate, advanceByRecurrence, newTaskId, LIMITS,
} from './model.mjs';

const obj = (properties, required = [], extra = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extra });
const S = {
  taskId: { type: 'string', minLength: 1, maxLength: 160, description: "task id from list_tasks / search_tasks (never invent one), or '$name' for a task created earlier in the same batch with ref:'name'" },
  dateOrNull: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$', formatHint: 'YYYY-MM-DD', description: 'ISO date YYYY-MM-DD, or null to clear' },
  subtaskRef: { type: 'string', minLength: 1, maxLength: 1000, description: 'subtask id from get_task (its exact title also works)' },
  reason: { type: 'string', maxLength: 1000, description: 'optional short reason, kept in the task history' },
};
const label = (t) => truncate(t.title, 60);
const change = (t, field, from, to) => ({ entity: 'task', id: t.id, label: label(t), field, from: from ?? null, to: to ?? null });
const statusOf = (s, id) => (s.statuses && s.statuses[id]) || 'todo';
const lastCompletion = (s, id) => { const l = (s.completionLog || {})[id]; return Array.isArray(l) && l.length ? l[l.length - 1] : 0; };
const isWontDo = (s, t) => statusOf(s, t.id) === 'done' && t.resolution === 'wontdo' && (t.resolvedAt || 0) >= lastCompletion(s, t.id);

function findSubtask(t, ref, field = 'subtaskId') {
  const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
  const q = String(ref ?? '').trim();
  const hit = subs.find(x => x.id === q) || subs.find(x => String(x.title).trim().toLowerCase() === q.toLowerCase());
  if (hit) return hit;
  throw new ActionError('NOT_FOUND', `task '${label(t)}' has no subtask '${truncate(q, 40)}'`, {
    field, valid: subs.map(x => x.id), hint: subs.length ? `subtasks: ${subs.map(x => `${x.id} = "${truncate(x.title, 40)}"`).join('; ')}` : 'this task has no subtasks',
  });
}

export const TASK_OPS = [
  {
    name: 'task.plan', tool: 'plan_task',
    description: "Plan the day the user will WORK on a task (not its deadline). A task planned for today (or an earlier day, until it is done) shows in Today. date null removes it from the plan. Use this for 'put X on my list for today/Thursday'; use reschedule_task to change the deadline.",
    schema: obj({ id: S.taskId, date: S.dateOrNull }, ['id', 'date']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      if (p.date !== null && !isIsoDate(p.date)) throw dateError('date', p.date, ctx.today);
      if (statusOf(ctx.s, t.id) === 'done' && p.date) ctx.warn(`'${label(t)}' is already done; it is planned anyway`);
      const from = t.plannedFor || null;
      const to = p.date || null;
      if (from === to) return { summary: `"${label(t)}" is already ${to ? 'planned for ' + to : 'unplanned'}`, changes: [] };
      if (to) t.plannedFor = to; else delete t.plannedFor;
      ctx.log(t.id, 'plan', { from, to });
      return { summary: to ? `Plan "${label(t)}" for ${to}` : `Remove "${label(t)}" from the plan`, changes: [change(t, 'plannedFor', from, to)] };
    },
  },
  {
    name: 'task.wont_do', tool: 'wont_do_task',
    description: "Close a task WITHOUT doing it (\"won't do\", \"drop\", \"cancel\"); it leaves every list but is not counted as completed. On a repeating task this skips the current occurrence: it moves to its next date and stays open. reopen_task undoes it.",
    schema: obj({ id: S.taskId, reason: S.reason }, ['id']),
    run(ctx, p) {
      const s = ctx.s;
      const t = ctx.task(p.id);
      s.statuses = s.statuses || {};
      const prev = statusOf(s, t.id);
      const reason = p.reason ? cleanLine(p.reason, LIMITS.reason) : null;
      const rec = t.recurrence ?? 'none';
      if (rec && rec !== 'none' && prev !== 'done') {
        if (rec === 'monthly' && !t.repeatDay && t.dueDate) t.repeatDay = Number(t.dueDate.slice(8, 10));
        const from = t.dueDate || null;
        const next = advanceByRecurrence(from, rec, ctx.today, t.repeatDay);
        t.dueDate = next;
        delete t.plannedFor;
        if (Array.isArray(t.subtasks) && t.subtasks.some(x => x && x.done)) t.subtasks = t.subtasks.map(x => ({ ...x, done: false }));
        s.statuses[t.id] = 'todo';
        ctx.log(t.id, 'occurrence', { from, to: next, rec, skipped: true, ...(reason ? { reason } : {}) });
        return { summary: `Skip this occurrence of "${label(t)}" (next due ${next})`, changes: [change(t, 'dueDate', from, next)] };
      }
      if (isWontDo(s, t)) return { summary: `"${label(t)}" is already closed as won't do`, changes: [] };
      if (prev === 'done') {
        // Completed before: it was not really done, so take the completion back.
        const log = (s.completionLog || {})[t.id];
        if (Array.isArray(log) && log.length) log.pop();
      }
      t.resolution = 'wontdo';
      t.resolvedAt = ctx.now;
      s.statuses[t.id] = 'done';
      ctx.log(t.id, 'status', { from: prev, to: 'wontdo', ...(reason ? { reason } : {}) });
      return { summary: `Close "${label(t)}" as won't do`, changes: [change(t, 'status', prev, 'wontdo')] };
    },
  },
  {
    name: 'task.reorder_subtasks', tool: 'reorder_subtasks',
    description: 'Put the subtasks of a task in a new order. subtaskIds lists ids (or exact titles) in the new order; any not listed keep their relative order after them.',
    schema: obj({ id: S.taskId, subtaskIds: { type: 'array', items: S.subtaskRef, minItems: 1, maxItems: 100 } }, ['id', 'subtaskIds']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
      const first = [];
      p.subtaskIds.forEach((ref, i) => { const st = findSubtask(t, ref, `subtaskIds[${i}]`); if (!first.includes(st)) first.push(st); });
      const next = [...first, ...subs.filter(x => !first.includes(x))];
      if (next.every((x, i) => x === subs[i])) return { summary: `Subtasks of "${label(t)}" are already in that order`, changes: [] };
      const from = subs.map(x => x.title);
      t.subtasks = next;
      ctx.log(t.id, 'subtask', { text: 'Subtasks reordered' });
      return { summary: `Reorder the subtasks of "${label(t)}"`, changes: [change(t, 'subtasks', from.join(' | '), next.map(x => x.title).join(' | '))] };
    },
  },
  {
    name: 'task.promote_subtask', tool: 'promote_subtask',
    description: 'Turn a subtask into its own task (same stream, due date, priority, tags and people as the parent). The subtask is removed from the parent.',
    schema: obj({ id: S.taskId, subtaskId: S.subtaskRef, ref: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,40}$', description: "optional name for the new task, usable later in the batch as '$name'" } }, ['id', 'subtaskId']),
    run(ctx, p) {
      const s = ctx.s;
      const parent = ctx.task(p.id);
      const st = findSubtask(parent, p.subtaskId);
      const id = newTaskId();
      ctx.touch('task:' + id);
      const task = {
        id, title: cleanLine(st.title, LIMITS.title) || 'Subtask', dueDate: parent.dueDate || null, priority: parent.priority || 'p0',
        tags: Array.isArray(parent.tags) ? [...parent.tags] : [], stream: parent.stream, detail: '', subtasks: [], recurrence: 'none',
        people: Array.isArray(parent.people) ? [...parent.people] : [], createdAt: ctx.now, createdVia: ctx.source || 'mcp',
      };
      s.custom.push(task);
      if (st.done) { s.statuses = s.statuses || {}; s.statuses[id] = 'done'; }
      parent.subtasks = parent.subtasks.filter(x => x !== st);
      ctx.log(id, 'created', { text: 'From a subtask of: ' + truncate(parent.title, 80) });
      ctx.log(parent.id, 'subtask-promoted', { text: st.title, to: id });
      if (p.ref) ctx.refs.set(p.ref, id);
      return { summary: `Make subtask "${truncate(st.title, 50)}" of "${label(parent)}" its own task`, changes: [{ entity: 'task', id, label: label(task), field: 'created', from: null, to: task.title }, change(parent, 'subtask-', st.title, null)], created: { id } };
    },
  },
  {
    name: 'task.set_estimate', tool: 'set_task_estimate',
    description: 'Set how long a task should take, in minutes (null clears it).',
    schema: obj({ id: S.taskId, minutes: { type: ['integer', 'null'], minimum: 1, maximum: 6000 } }, ['id', 'minutes']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const from = t.estimate ?? null;
      const to = p.minutes ?? null;
      if (from === to) return { summary: `"${label(t)}" already has that estimate`, changes: [] };
      if (to) t.estimate = to; else delete t.estimate;
      ctx.log(t.id, 'estimate', { from, to });
      return { summary: to ? `Estimate "${label(t)}" at ${to} min` : `Clear the estimate of "${label(t)}"`, changes: [change(t, 'estimate', from, to)] };
    },
  },
];

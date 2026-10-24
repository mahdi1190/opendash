// server/actions/ops-waiting.mjs - waiting on people and task dependencies (owner: Review, v2.16).
// Appended to OPS in ops.mjs (WAITING_OPS). The same fields and rules as the page
// (src/app/34-review-core.js):
//
//   task.set_waiting     [set_task_waiting]      the task waits on someone: waitingOn (person id, also
//                                                linked in people[]), waitingSince (today), or waiting:true
//                                                when it is no one in particular; waiting:false clears it.
//                                                A waiting task leaves Today / Upcoming / No date for the
//                                                dashboard's Waiting list and gets a follow-up nudge after N days.
//   task.set_blocked_by  [set_task_blocked_by]   tasks that must be done first (blockedBy); a blocked task
//                                                stays out of Today and dimmed until they are done.
//                                                add / remove ids, or clear. Loops are refused.

import { ActionError, resolvePerson, truncate } from './model.mjs';

const obj = (properties, required = [], extra = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extra });
const taskId = { type: 'string', minLength: 1, maxLength: 160, description: "task id from list_tasks / search_tasks (never invent one), or '$name' for a task created earlier in the same batch with ref:'name'" };
const label = (t) => truncate(t.title, 60);
const change = (t, field, from, to) => ({ entity: 'task', id: t.id, label: label(t), field, from: from ?? null, to: to ?? null });
const isOpen = (s, id) => ((s.statuses && s.statuses[id]) || 'todo') !== 'done';

function dependsOn(s, a, b, seen = new Set()) {
  if (!a || seen.has(a)) return false;
  seen.add(a);
  const t = (s.custom || []).find(x => x.id === a);
  for (const d of (t && Array.isArray(t.blockedBy) ? t.blockedBy : [])) if (d === b || dependsOn(s, d, b, seen)) return true;
  return false;
}

export const WAITING_OPS = [
  {
    name: 'task.set_waiting', tool: 'set_task_waiting',
    description: "Mark a task as waiting on someone (person: id, name or alias), or on no one in particular (person omitted, waiting true). waiting:false stops waiting and puts it back on the user's lists. A waiting task leaves Today, Upcoming and No date for the Waiting list; after a few days a follow-up nudge appears. get_person shows what each person owes the user.",
    schema: obj({ id: taskId, waiting: { type: 'boolean', description: 'true (default) = waiting; false = no longer waiting' }, person: { type: 'string', minLength: 1, maxLength: 100, description: 'who it waits on: person id from list_people (an exact name or alias also works)' }, since: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', formatHint: 'YYYY-MM-DD', description: 'when the waiting started (default today)' } }, ['id']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const from = t.waitingOn || (t.waiting === true ? 'someone' : null);
      if (p.waiting === false) {
        if (!from && ((ctx.s.statuses || {})[t.id]) !== 'waiting') { ctx.warn(`'${label(t)}' is not waiting on anyone`); return { summary: 'No change', changes: [] }; }
        delete t.waitingOn; delete t.waiting; delete t.waitingSince; delete t.waitingNudgedAt;
        if (ctx.s.statuses && ctx.s.statuses[t.id] === 'waiting') ctx.s.statuses[t.id] = 'todo';
        ctx.log(t.id, 'waiting', { text: 'No longer waiting' });
        return { summary: `"${label(t)}" is no longer waiting`, changes: [change(t, 'waitingOn', from, null)] };
      }
      const who = p.person ? resolvePerson(ctx.s, p.person) : null;
      if (who) {
        t.waitingOn = who.id; delete t.waiting;
        const cur = Array.isArray(t.people) ? t.people : [];
        if (!cur.includes(who.id)) t.people = [...cur, who.id];
      } else { delete t.waitingOn; t.waiting = true; }
      t.waitingSince = p.since || ctx.today; delete t.waitingNudgedAt;
      if (ctx.s.statuses && ctx.s.statuses[t.id] === 'doing') ctx.s.statuses[t.id] = 'todo';
      ctx.log(t.id, 'waiting', { text: who ? `Waiting on ${who.name || who.id}` : 'Waiting on someone' });
      return { summary: `"${label(t)}" waits on ${who ? (who.name || who.id) : 'someone'} (since ${t.waitingSince})`, changes: [change(t, 'waitingOn', from, who ? who.id : 'someone')] };
    },
  },
  {
    name: 'task.set_blocked_by', tool: 'set_task_blocked_by',
    description: 'Say which tasks must be done before this one (dependencies). add / remove task ids, or clear:true. While any of them is open the task stays out of Today and shows dimmed; when they are done it lights up again. A loop (A waits for B, B for A) is refused.',
    schema: obj({ id: taskId, add: { type: 'array', maxItems: 20, items: taskId, description: 'task ids that must be done first' }, remove: { type: 'array', maxItems: 20, items: taskId }, clear: { type: 'boolean', description: 'remove every dependency' } }, ['id'], { minProperties: 2 }),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const before = Array.isArray(t.blockedBy) ? [...t.blockedBy] : [];
      let next = p.clear ? [] : [...before];
      for (const r of (p.remove || [])) { const id = ctx.task(r, 'remove').id; next = next.filter(x => x !== id); }
      for (const a of (p.add || [])) {
        const dep = ctx.task(a, 'add');
        if (dep.id === t.id) throw new ActionError('BAD_VALUE', 'a task cannot wait for itself', { field: 'add' });
        if (dependsOn(ctx.s, dep.id, t.id)) throw new ActionError('BAD_VALUE', `that would make a loop: '${label(dep)}' already waits for '${label(t)}'`, { field: 'add' });
        if (!next.includes(dep.id)) next.push(dep.id);
      }
      if (next.join('|') === before.join('|')) { ctx.warn(`'${label(t)}': nothing to change`); return { summary: 'No change', changes: [] }; }
      if (next.length) t.blockedBy = next; else delete t.blockedBy;
      const open = next.filter(id => isOpen(ctx.s, id)).length;
      ctx.log(t.id, 'blocked', { text: next.length ? `Blocked by ${next.length} task${next.length === 1 ? '' : 's'}` : 'No longer blocked' });
      return { summary: next.length ? `"${label(t)}" waits for ${next.length} task${next.length === 1 ? '' : 's'} (${open} still open)` : `"${label(t)}" no longer waits for other tasks`, changes: [change(t, 'blockedBy', before, next)] };
    },
  },
];

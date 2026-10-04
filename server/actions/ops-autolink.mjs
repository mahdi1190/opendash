// server/actions/ops-autolink.mjs - auto-linking in the actions layer (owner:
// Auto-linking). Engine: lib/autolink.mjs (candidates + judge), index:
// lib/workspace-index.mjs. Added to OPS in ops.mjs and QUERIES in queries.mjs.
//
//   links.suggest   [suggest_links]           find links for open tasks (or one task) and keep
//                                             them as SUGGESTIONS (state.autolink.suggestions);
//                                             rejected and applied ones never come back
//   links.rate      [rate_suggested_links]    store a judge's confidence + reason per suggestion
//   links.apply     [apply_suggested_links]   accept suggestions: attach the folder / repo / PR
//                                             (create_resource), link the event (annotate_event),
//                                             the person (link_person), the email or the task
//                                             (relate_task). auto:true = the auto-linker: only
//                                             judged suggestions at or above minConfidence, at
//                                             most maxPerTask folder-level links per task
//   links.reject    [reject_suggested_links]  "not this one": remembered, never suggested again
//   task.relate     [relate_task]             link an email thread or another task to a task
//   task.unrelate   [unrelate_task]
//   links.pending   [get_suggested_links]     (query) the suggestions waiting for review
//   task.related    [get_related]             (query) everything linked to a task, by type
//
// state.autolink = { suggestions:[{id, key, taskId, type, target, score, why, hints?, excerpt?,
//                    judged?:{confidence, reason, model, at}, at}], rejected:{key: at},
//                    applied:{key: {at, by:'auto'|'user', type, taskId}} }
// Undo: entities 'autolink:<taskId>' (entities.mjs; + the tasks, resources and events the sub-ops touch).

import { ActionError, cleanLine, truncate } from './model.mjs';
import { autolinkKeyTasks } from './entities.mjs';
import {
  alState, computeCandidates, loadContextSync, suggestionId, confidenceOf, linkKey, refOf, LINK_TYPES, MAX_PENDING_PER_TASK, MAX_PENDING,
} from '../../lib/autolink.mjs';
import { rsrcSafeUrl, rsrcDisplayLabel, resourcesOf } from '../../lib/resources.mjs';
import { pplBuildIndex, pplLinked } from '../../lib/people-tags.mjs';

let OPS_BY_NAME = null;
/** ops.mjs hands over its op table so links.apply can run the real ops (create_resource, annotate_event...). */
export function bindAutolinkOps(map) { OPS_BY_NAME = map; }

const THREAD_RE = /^[A-Za-z0-9_\-]{1,120}$/;
const obj = (properties, required = [], extra = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extra });
const S = {
  taskId: { type: 'string', minLength: 1, maxLength: 160, description: 'task id from search_tasks / list_tasks' },
  sid: { type: 'string', minLength: 1, maxLength: 40, description: 'suggestion id (ls-...) from suggest_links or get_suggested_links' },
  conf: { type: 'number', minimum: 0, maximum: 1 },
};
export const suggestionLabel = (sg) => {
  const t = (sg && sg.target) || {};
  if (sg.type === 'resource') return t.label || t.target || 'link';
  if (sg.type === 'event') return t.title || 'event';
  if (sg.type === 'email') return t.subject || 'email';
  if (sg.type === 'person') return t.name || t.personId || 'person';
  if (sg.type === 'task') return t.title || t.taskId || 'task';
  return sg.type;
};
const NOUN = { resource: 'link', event: 'event', email: 'email', person: 'person', task: 'task' };
const nounOf = (sg) => (sg.type === 'resource' ? (sg.target && sg.target.kind === 'github' ? 'GitHub link' : 'folder') : NOUN[sg.type] || sg.type);
const schange = (sg, field, from, to) => ({ entity: 'suggestion', id: sg.id, label: truncate(suggestionLabel(sg), 60), field, from: from ?? null, to: to ?? null });
const taskOpen = (s, id) => (s.statuses || {})[id] !== 'done' && !(s.deleted && s.deleted[id]) && (s.custom || []).some(t => t && t.id === id);

function compactSuggestion(s, sg) {
  const t = (s.custom || []).find(x => x && x.id === sg.taskId);
  return {
    id: sg.id, taskId: sg.taskId, ...(t ? { taskTitle: truncate(t.title, 80) } : {}), type: sg.type, what: nounOf(sg), label: truncate(suggestionLabel(sg), 120),
    confidence: Math.round(confidenceOf(sg) * 100) / 100, judged: !!sg.judged, ...(sg.judged && sg.judged.reason ? { reason: sg.judged.reason } : {}),
    why: (sg.why || []).slice(0, 3), ...(sg.type === 'resource' ? { target: sg.target.target } : {}),
  };
}

function relatedOf(s, t) {
  const out = { emails: [], tasks: [] };
  for (const r of Array.isArray(t.related) ? t.related : []) {
    if (r && r.type === 'email') out.emails.push(r);
    if (r && r.type === 'task') out.tasks.push({ id: r.id, dir: 'out' });
  }
  for (const o of Array.isArray(s.custom) ? s.custom : []) {
    if (o && o.id !== t.id && Array.isArray(o.related) && o.related.some(r => r && r.type === 'task' && r.id === t.id) && !out.tasks.some(x => x.id === o.id)) out.tasks.push({ id: o.id, dir: 'in' });
  }
  return out;
}

/** Record the undo "before" of every task an auto-link key belongs to (call BEFORE changing it). */
function touchKeys(ctx, keys) {
  const seen = new Set();
  for (const k of keys) for (const tid of autolinkKeyTasks(k)) if (tid && !seen.has(tid)) { seen.add(tid); ctx.touch('autolink:' + tid); }
}

/** Run another op inside this batch (the same ctx: same copy, same undo record). */
function sub(ctx, name, params) {
  const def = OPS_BY_NAME && OPS_BY_NAME.get(name);
  if (!def) throw new ActionError('INTERNAL', `op ${name} is not available`);
  return def.run(ctx, params) || { changes: [] };
}

function applyOne(ctx, sg) {
  const t = sg.target || {};
  if (sg.type === 'resource') return sub(ctx, 'resource.create', { target: t.target, kind: t.kind === 'github' ? 'github' : 'folder', label: truncate(t.label || '', 120) || undefined, task: sg.taskId });
  if (sg.type === 'event') return sub(ctx, 'event.annotate', { eventId: t.eventId, linkTasks: [sg.taskId] });
  if (sg.type === 'person') return sub(ctx, 'task.link_person', { id: sg.taskId, person: t.personId });
  if (sg.type === 'email') return sub(ctx, 'task.relate', { id: sg.taskId, type: 'email', target: t.messageId, label: t.subject, ...(t.link ? { link: t.link } : {}), ...(t.from ? { from: t.from } : {}), ...(t.date ? { date: t.date } : {}) });
  if (sg.type === 'task') return sub(ctx, 'task.relate', { id: sg.taskId, type: 'task', target: t.taskId });
  throw new ActionError('BAD_VALUE', `unknown link type '${sg.type}'`);
}
/** Folder-level links the auto-linker already attached to a task (still attached). */
function autoFolderCount(s, al, taskId) {
  let n = 0;
  const linked = new Set(resourcesOf(s).filter(r => (r.links || []).some(l => l.type === 'task' && l.id === taskId)).map(r => refOf('resource', { kind: r.kind, target: r.target })));
  for (const [k, v] of Object.entries(al.applied)) {
    if (!v || v.by !== 'auto' || v.type !== 'resource' || v.taskId !== taskId) continue;
    const ref = k.split('|').slice(2).join('|');
    if (linked.has(ref)) n++;
  }
  return n;
}

export const AUTOLINK_OPS = [
  {
    name: 'links.suggest', tool: 'suggest_links',
    description: 'Find what open tasks relate to (no AI, a few seconds): the FOLDERS on this computer where their work lives (from the workspace index; individual files are only the reason, never attached), GitHub repos and open PRs, calendar events, emails, people and similar tasks. Results are kept as suggestions for the user to review (get_suggested_links); nothing is attached. Give taskId for one task, or nothing for every open task.',
    schema: obj({ taskId: S.taskId, taskIds: { type: 'array', items: S.taskId, maxItems: 200 } }),
    run(ctx, p) {
      const s = ctx.s;
      let ids = null;
      if (p.taskId) ids = [ctx.task(p.taskId, 'taskId').id];
      else if (p.taskIds) ids = p.taskIds.filter(id => taskOpen(s, id));
      const data = loadContextSync(ctx.paths);
      const cands = computeCandidates(s, data, { taskIds: ids, today: ctx.today, now: ctx.now });
      const al = alState(s, true);
      const before = new Map(al.suggestions.map(sg => [sg.key, sg]));
      const changes = [];
      let added = 0;
      const touched = new Set(cands.keys());
      // Keep suggestions of other tasks; a full run drops those of tasks that are closed or gone.
      let keep = al.suggestions.filter(sg => !touched.has(sg.taskId) && (ids || taskOpen(s, sg.taskId)));
      // One suggestion per key: "task A relates to task B" is found from both sides but offered once.
      const seenKeys = new Set(keep.map(sg => sg.key));
      for (const [taskId, list] of cands) {
        const mine = [];
        for (const c of list) {
          if (seenKeys.has(c.key)) continue;
          seenKeys.add(c.key);
          const prev = before.get(c.key);
          const sg = { id: suggestionId(c.key), key: c.key, taskId, type: c.type, target: c.target, score: c.score, why: c.why || [],
            ...(c.hints && c.hints.length ? { hints: c.hints } : {}), ...(c.excerpt ? { excerpt: c.excerpt } : {}),
            ...(prev && prev.judged ? { judged: prev.judged } : {}), at: prev ? prev.at : ctx.now };
          if (!prev) { added++; if (changes.length < 40) changes.push(schange(sg, 'suggested', null, `${nounOf(sg)} for "${truncate((s.custom.find(x => x.id === taskId) || {}).title || taskId, 40)}"`)); }
          mine.push(sg);
        }
        mine.sort((a, b) => confidenceOf(b) - confidenceOf(a));
        keep.push(...mine.slice(0, MAX_PENDING_PER_TASK));
      }
      if (keep.length > MAX_PENDING) keep = keep.sort((a, b) => confidenceOf(b) - confidenceOf(a)).slice(0, MAX_PENDING);
      // Undo: only the tasks whose suggestions really changed get an entity.
      const afterMap = new Map(keep.map(sg => [sg.key, sg]));
      const changedKeys = [];
      for (const [k, sg] of before) if (!afterMap.has(k) || JSON.stringify(afterMap.get(k)) !== JSON.stringify(sg)) changedKeys.push(k);
      for (const k of afterMap.keys()) if (!before.has(k)) changedKeys.push(k);
      // Old memories: keep the newest 5000 of each.
      const prune = {};
      for (const k of ['rejected', 'applied']) {
        const e = Object.entries(al[k]);
        if (e.length > 5000) {
          const sorted = e.sort((a, b) => (Number(b[1] && b[1].at || b[1]) || 0) - (Number(a[1] && a[1].at || a[1]) || 0));
          prune[k] = sorted.slice(0, 5000);
          changedKeys.push(...sorted.slice(5000).map(([key]) => key));
        }
      }
      touchKeys(ctx, changedKeys);
      al.suggestions = keep;
      for (const k of Object.keys(prune)) al[k] = Object.fromEntries(prune[k]);
      const pending = keep.filter(sg => touched.has(sg.taskId)).length;
      const list = p.taskId ? keep.filter(sg => sg.taskId === ids[0]).map(sg => compactSuggestion(s, sg)) : undefined;
      if (!data.index) ctx.warn('no workspace index yet (Settings > Files & auto-link): folders were not searched');
      return {
        summary: `Suggest links for ${touched.size} task${touched.size === 1 ? '' : 's'}: ${pending} waiting for review${added ? `, ${added} new` : ''}`,
        changes, created: { tasks: touched.size, pending, added, ...(list ? { suggestions: list } : {}) },
      };
    },
  },
  {
    name: 'links.rate', tool: 'rate_suggested_links',
    description: "Store a confidence (0-1) and a short reason for suggested links (the dashboard's judge does this; you can too after looking at them). Ratings at or above the user's threshold may be attached automatically by the dashboard.",
    schema: obj({
      ratings: { type: 'array', minItems: 1, maxItems: 400, items: obj({ id: S.sid, confidence: S.conf, reason: { type: 'string', maxLength: 300 } }, ['id', 'confidence']) },
      model: { type: 'string', maxLength: 60 },
    }, ['ratings']),
    run(ctx, p) {
      const al = alState(ctx.s, true);
      const byId = new Map(al.suggestions.map(sg => [sg.id, sg]));
      touchKeys(ctx, p.ratings.map(r => byId.get(r.id)).filter(Boolean).map(sg => sg.key));
      const changes = [];
      let missing = 0;
      for (const r of p.ratings) {
        const sg = byId.get(r.id);
        if (!sg) { missing++; continue; }
        const conf = Math.round(Math.max(0, Math.min(1, r.confidence)) * 100) / 100;
        const from = sg.judged ? sg.judged.confidence : null;
        sg.judged = { confidence: conf, reason: cleanLine(r.reason || '', 200), ...(p.model ? { model: cleanLine(p.model, 60) } : {}), at: ctx.now };
        if (from !== conf && changes.length < 60) changes.push(schange(sg, 'confidence', from, conf));
      }
      if (missing) ctx.warn(`${missing} rating${missing === 1 ? '' : 's'} for suggestions that are gone (recomputed or handled) were skipped`);
      return { summary: `Rate ${p.ratings.length - missing} suggested link${p.ratings.length - missing === 1 ? '' : 's'}`, changes };
    },
  },
  {
    name: 'links.apply', tool: 'apply_suggested_links',
    description: 'Accept suggested links: a folder or GitHub link is attached to the task (create_resource), an event gets the task linked (annotate_event), a person is linked (link_person), an email or another task is related (relate_task). Give suggestionIds, or taskId (+ minConfidence) to accept every suggestion of a task at or above a confidence, or all:true + minConfidence for every task.',
    schema: obj({
      suggestionIds: { type: 'array', items: S.sid, minItems: 1, maxItems: 200 },
      taskId: S.taskId,
      all: { type: 'boolean', description: 'every pending suggestion (with minConfidence)' },
      minConfidence: { ...S.conf, description: 'only suggestions at or above this confidence' },
      auto: { type: 'boolean', description: 'the automatic run: judged suggestions only, at most maxPerTask folder-level links per task' },
      maxPerTask: { type: 'integer', minimum: 0, maximum: 5 },
    }, [], { minProperties: 1, minPropertiesMessage: 'apply_suggested_links needs suggestionIds, taskId or all' }),
    run(ctx, p) {
      const s = ctx.s;
      const al = alState(s, true);
      let picked;
      if (p.suggestionIds) {
        const want = new Set(p.suggestionIds);
        picked = al.suggestions.filter(sg => want.has(sg.id));
        const gone = p.suggestionIds.filter(id => !picked.some(sg => sg.id === id));
        if (gone.length && !p.auto) {
          if (!picked.length) throw new ActionError('UNKNOWN_SUGGESTION', `no pending suggestion with id ${gone.slice(0, 3).join(', ')}`, { field: 'suggestionIds', hint: 'get_suggested_links lists the pending ones (handled ones are gone)' });
          ctx.warn(`${gone.length} suggestion${gone.length === 1 ? ' was' : 's were'} already handled or recomputed`);
        }
      } else if (p.taskId) {
        const t = ctx.task(p.taskId, 'taskId');
        picked = al.suggestions.filter(sg => sg.taskId === t.id);
      } else if (p.all) {
        if (p.minConfidence == null) throw new ActionError('INVALID_PARAMS', 'all:true needs minConfidence', { field: 'minConfidence' });
        picked = al.suggestions.slice();
      } else throw new ActionError('INVALID_PARAMS', 'give suggestionIds, taskId or all', { field: 'suggestionIds' });
      if (p.minConfidence != null) picked = picked.filter(sg => confidenceOf(sg) >= p.minConfidence);
      if (p.auto) picked = picked.filter(sg => sg.judged && sg.judged.confidence >= (p.minConfidence ?? 0.85));
      picked.sort((a, b) => confidenceOf(b) - confidenceOf(a));
      touchKeys(ctx, picked.map(sg => sg.key));
      const maxPer = p.maxPerTask ?? 2;
      const perTask = new Map();
      const changes = [], appliedKeys = [], triedKeys = [];
      let applied = 0, capped = 0, stale = 0;
      for (const sg of picked) {
        triedKeys.push(sg.key);
        if (!taskOpen(s, sg.taskId) && (s.custom || []).every(t => t.id !== sg.taskId)) { stale++; al.suggestions = al.suggestions.filter(x => x !== sg); continue; }
        if (p.auto && sg.type === 'resource') {
          const n = perTask.has(sg.taskId) ? perTask.get(sg.taskId) : autoFolderCount(s, al, sg.taskId);
          if (n >= maxPer) { capped++; continue; }
          perTask.set(sg.taskId, n + 1);
        }
        let r;
        try { r = applyOne(ctx, sg); }
        catch (e) {
          if (!(e instanceof ActionError)) throw e;
          stale++; al.suggestions = al.suggestions.filter(x => x !== sg);
          ctx.warn(`"${truncate(suggestionLabel(sg), 50)}" could not be linked (${e.code})`);
          continue;
        }
        changes.push(...(r.changes || []));
        al.suggestions = al.suggestions.filter(x => x !== sg);
        al.applied[sg.key] = { at: ctx.now, by: p.auto ? 'auto' : 'user', type: sg.type, taskId: sg.taskId, ...(sg.judged ? { confidence: sg.judged.confidence } : {}) };
        appliedKeys.push(sg.key);
        applied++;
        ctx.log(sg.taskId, 'update', { text: `${p.auto ? 'Auto-linked' : 'Linked'} ${nounOf(sg)}: ${truncate(suggestionLabel(sg), 80)}` });
      }
      if (capped) ctx.warn(`${capped} folder-level link${capped === 1 ? '' : 's'} left as suggestions: at most ${maxPer} are attached automatically per task`);
      if (!applied && !p.auto && !stale) ctx.warn('nothing to apply');
      return {
        summary: applied ? `${p.auto ? 'Auto-link' : 'Link'} ${applied} suggested item${applied === 1 ? '' : 's'}` : 'No links applied',
        changes, created: { applied, appliedKeys, triedKeys },
      };
    },
  },
  {
    name: 'links.reject', tool: 'reject_suggested_links',
    description: 'Reject suggested links ("not related"). Rejections are remembered, so the same link is never suggested again for that task. items:[{taskId, type, target}] rejects a link that is not a pending suggestion (for example one just unlinked).',
    schema: obj({
      suggestionIds: { type: 'array', items: S.sid, minItems: 1, maxItems: 400 },
      items: { type: 'array', maxItems: 50, items: obj({ taskId: S.taskId, type: { type: 'string', enum: [...LINK_TYPES] }, target: { type: 'object' } }, ['taskId', 'type', 'target']) },
    }, [], { minProperties: 1, minPropertiesMessage: 'reject_suggested_links needs suggestionIds or items' }),
    run(ctx, p) {
      const al = alState(ctx.s, true);
      const keys = new Set();
      const changes = [];
      for (const id of p.suggestionIds || []) {
        const sg = al.suggestions.find(x => x.id === id);
        if (!sg) { ctx.warn(`suggestion ${id} is already gone`); continue; }
        keys.add(sg.key);
        changes.push(schange(sg, 'rejected', null, true));
      }
      for (const it of p.items || []) {
        const tg = it.target && typeof it.target === 'object' && !Array.isArray(it.target) ? it.target : {};
        const ref = refOf(it.type, tg);
        if (!ref || ref === 'ev:' || ref === 'em:undefined' || ref === 'p:undefined') throw new ActionError('BAD_VALUE', 'target does not name the linked thing', { field: 'items.target' });
        keys.add(linkKey(it.taskId, it.type, ref));
      }
      touchKeys(ctx, [...keys]);
      for (const k of keys) al.rejected[k] = ctx.now;
      const before = al.suggestions.length;
      al.suggestions = al.suggestions.filter(sg => !keys.has(sg.key));
      const n = keys.size;
      return { summary: `Reject ${n} link${n === 1 ? '' : 's'}${before !== al.suggestions.length ? '' : ' (remembered)'}`, changes };
    },
  },
  {
    name: 'task.relate', tool: 'relate_task',
    description: 'Relate an email thread (type "email", target = thread id from list_inbox) or another task (type "task", target = its id) to a task. Shown in the task\'s Related section.',
    schema: obj({
      id: S.taskId, type: { type: 'string', enum: ['email', 'task'] },
      target: { type: 'string', minLength: 1, maxLength: 160, description: 'email thread id or task id' },
      label: { type: 'string', maxLength: 200, description: 'email subject (shown in the task)' },
      link: { type: 'string', maxLength: 600, description: 'https link to the email' },
      from: { type: 'string', maxLength: 120 }, date: { type: 'string', maxLength: 30 },
    }, ['id', 'type', 'target']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const rel = Array.isArray(t.related) ? t.related : [];
      if (p.type === 'task') {
        const o = ctx.task(p.target, 'target');
        if (o.id === t.id) throw new ActionError('BAD_VALUE', 'a task cannot be related to itself', { field: 'target' });
        const both = relatedOf(ctx.s, t).tasks.some(x => x.id === o.id);
        if (both) { ctx.warn(`"${truncate(o.title, 50)}" is already related`); return { summary: 'No change', changes: [] }; }
        t.related = [...rel, { type: 'task', id: o.id, at: ctx.now }];
        ctx.log(t.id, 'update', { text: `Related to "${truncate(o.title, 80)}"` });
        return { summary: `Relate "${truncate(t.title, 50)}" to "${truncate(o.title, 50)}"`, changes: [{ entity: 'task', id: t.id, label: truncate(t.title, 60), field: 'related task', from: null, to: truncate(o.title, 60) }] };
      }
      if (!THREAD_RE.test(p.target)) throw new ActionError('BAD_VALUE', 'target is not an email thread id (list_inbox gives them)', { field: 'target' });
      if (rel.some(r => r && r.type === 'email' && r.id === p.target)) { ctx.warn('that email is already related'); return { summary: 'No change', changes: [] }; }
      const link = rsrcSafeUrl(p.link || '');
      const e = { type: 'email', id: p.target, label: cleanLine(p.label || '', 200) || '(no subject)', ...(link ? { link } : {}), ...(p.from ? { from: cleanLine(p.from, 120) } : {}), ...(p.date && /^\d{4}-\d{2}-\d{2}/.test(p.date) ? { date: p.date.slice(0, 25) } : {}), at: ctx.now };
      t.related = [...rel, e];
      ctx.log(t.id, 'update', { text: `Email related: "${truncate(e.label, 80)}"` });
      return { summary: `Relate the email "${truncate(e.label, 50)}" to "${truncate(t.title, 50)}"`, changes: [{ entity: 'task', id: t.id, label: truncate(t.title, 60), field: 'related email', from: null, to: truncate(e.label, 60) }] };
    },
  },
  {
    name: 'task.unrelate', tool: 'unrelate_task',
    description: 'Remove a related email or task from a task (both directions for tasks).',
    schema: obj({ id: S.taskId, type: { type: 'string', enum: ['email', 'task'] }, target: { type: 'string', minLength: 1, maxLength: 160 } }, ['id', 'type', 'target']),
    run(ctx, p) {
      const t = ctx.task(p.id);
      const changes = [];
      const drop = (task) => {
        const rel = Array.isArray(task.related) ? task.related : [];
        const other = task === t ? p.target : t.id;
        const next = rel.filter(r => !(r && r.type === p.type && r.id === other));
        if (next.length === rel.length) return false;
        if (next.length) task.related = next; else delete task.related;
        return true;
      };
      if (drop(t)) changes.push({ entity: 'task', id: t.id, label: truncate(t.title, 60), field: `related ${p.type}`, from: p.target, to: null });
      if (p.type === 'task') {
        const o = (ctx.s.custom || []).find(x => x && x.id === p.target);
        if (o && Array.isArray(o.related) && o.related.some(r => r && r.type === 'task' && r.id === t.id)) {
          const oo = ctx.task(o.id, 'target');
          if (drop(oo)) changes.push({ entity: 'task', id: oo.id, label: truncate(oo.title, 60), field: 'related task', from: t.id, to: null });
        }
      }
      if (!changes.length) ctx.warn('that was not related');
      return { summary: changes.length ? `Unrelate from "${truncate(t.title, 50)}"` : 'No change', changes };
    },
  },
];

export const AUTOLINK_QUERIES = [
  {
    name: 'links.pending', tool: 'get_suggested_links',
    description: 'Suggested links waiting for review (from suggest_links and the auto-linker), most confident first: folders, GitHub links, events, emails, people and tasks, each with a confidence, the reason and the evidence. Accept with apply_suggested_links, reject with reject_suggested_links.',
    schema: obj({ taskId: S.taskId, type: { type: 'string', enum: [...LINK_TYPES] }, minConfidence: S.conf, limit: { type: 'integer', minimum: 1, maximum: 200 } }),
    run(q, p) {
      const s = q.s;
      let list = alState(s).suggestions.filter(sg => (!p.taskId || sg.taskId === p.taskId) && (!p.type || sg.type === p.type) && (p.minConfidence == null || confidenceOf(sg) >= p.minConfidence));
      list = list.sort((a, b) => confidenceOf(b) - confidenceOf(a));
      const limit = p.limit || 40;
      return { count: list.length, ...(list.length > limit ? { more: list.length - limit } : {}), suggestions: list.slice(0, limit).map(sg => compactSuggestion(s, sg)) };
    },
  },
  {
    name: 'task.related', tool: 'get_related',
    description: "Everything linked to one task, by type: files & links, calendar events (upcoming first), related emails, people and related tasks, plus how many suggestions wait for review.",
    schema: obj({ id: S.taskId }, ['id']),
    run(q, p) {
      const s = q.s;
      const t = (s.custom || []).find(x => x && x.id === p.id);
      if (!t) throw new ActionError('UNKNOWN_TASK', `no task with id '${truncate(p.id, 40)}'`, { field: 'id', hint: 'search_tasks finds tasks by words' });
      const files = resourcesOf(s).filter(r => (r.links || []).some(l => l.type === 'task' && l.id === t.id)).map(r => ({ id: r.id, kind: r.kind, label: rsrcDisplayLabel(r), ...(r.kind !== 'snippet' ? { target: r.target } : {}) }));
      let events = [];
      try {
        const ctxData = loadContextSync(q.paths);
        const byId = new Map((ctxData.events || []).map(e => [e.id, e]));
        for (const [eid, m] of Object.entries(s.eventMeta || {})) {
          if (!m || !Array.isArray(m.tasks) || !m.tasks.includes(t.id)) continue;
          const e = byId.get(eid);
          events.push({ eventId: eid, title: e ? e.summary : null, start: e ? (e.start.dateTime || e.start.date) : null });
        }
      } catch { /* calendar not readable */ }
      const today = q.clock.today;
      events = events.sort((a, b) => ((a.start || '') < today) - ((b.start || '') < today) || String(a.start).localeCompare(String(b.start)));
      const idx = pplBuildIndex(s.people);
      const people = pplLinked(s, t, idx).map(pid => ({ id: pid, name: (idx.byId.get(pid) || {}).name || pid }));
      const rel = relatedOf(s, t);
      const tasks = rel.tasks.map(x => { const o = (s.custom || []).find(y => y.id === x.id); return { id: x.id, title: o ? truncate(o.title, 100) : null, done: (s.statuses || {})[x.id] === 'done' }; });
      const pending = alState(s).suggestions.filter(sg => sg.taskId === t.id).length;
      return { id: t.id, title: t.title, files, events, emails: rel.emails.map(e => ({ id: e.id, subject: e.label, ...(e.from ? { from: e.from } : {}), ...(e.date ? { date: e.date } : {}) })), people, tasks, suggestionsWaiting: pending };
    },
  },
];

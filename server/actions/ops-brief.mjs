// server/actions/ops-brief.mjs - write ops for the Review tab (owner: Brief + Review).
// ops.mjs adds these to OPS.
//
//   review.save  [save_review]  save a weekly review or an evening "finish the day"
//                               recap into state.reviews. One review per kind and
//                               date: saving again replaces it (so retries and
//                               edits never duplicate). Undo: entity 'key:reviews'.
//
// state.reviews = [{ id, kind: 'week'|'evening', date, savedAt, source,
//   outcomes: [{area, items:[...]}], wins: [...], slipped: [{taskId?, title, reason}],
//   done: [{taskId?, title}], rolled: n, top3: [taskId], notes, summary, stats: {...} }]
// (at most 400 kept, oldest dropped first).

import { ActionError, cleanLine, cleanText, isIsoDate, dateError, truncate } from './model.mjs';

const obj = (properties, required = [], extra = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extra });
const STR = (max) => ({ type: 'string', maxLength: max });
const KEEP = 400;

const SCHEMA = obj({
  kind: { type: 'string', enum: ['week', 'evening'], description: "'week' = the weekly review, 'evening' = a finish-the-day recap" },
  date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', formatHint: 'YYYY-MM-DD', description: 'the day (evening) or the first day of the week reviewed (week)' },
  outcomes: { type: 'array', maxItems: 20, description: 'up to three outcomes per area (stream) for the coming week', items: obj({ area: STR(80), items: { type: 'array', maxItems: 3, items: STR(300) } }, ['area', 'items']) },
  wins: { type: 'array', maxItems: 30, items: STR(300), description: 'wins worth remembering' },
  slipped: { type: 'array', maxItems: 50, items: obj({ taskId: STR(160), title: STR(300), reason: STR(300) }, ['title']), description: 'what slipped and why' },
  done: { type: 'array', maxItems: 80, items: obj({ taskId: STR(160), title: STR(300), kind: { type: 'string', enum: ['task', 'subtask', 'event'] } }, ['title']), description: 'what got done (evening)' },
  rolled: { type: 'integer', minimum: 0, maximum: 500, description: 'how many tasks were rolled to tomorrow' },
  top3: { type: 'array', maxItems: 3, items: STR(160), description: "tomorrow's top three task ids (evening)" },
  notes: { type: 'string', maxLength: 4000 },
  summary: { type: 'string', maxLength: 1200, description: 'the AI summary, if one was made' },
  stats: obj({
    completed: { type: 'integer', minimum: 0, maximum: 100000 }, slipped: { type: 'integer', minimum: 0, maximum: 100000 },
    streak: { type: 'integer', minimum: 0, maximum: 10000 }, meetings: { type: 'integer', minimum: 0, maximum: 1000 },
    perStream: { type: 'array', maxItems: 30, items: obj({ stream: STR(80), n: { type: 'integer', minimum: 0, maximum: 100000 } }, ['stream', 'n']) },
    spent: { type: ['number', 'null'] }, spentAvg: { type: ['number', 'null'] },
  }),
}, ['kind', 'date']);

const clean = (p) => {
  const out = {};
  if (p.outcomes) out.outcomes = p.outcomes.map(o => ({ area: cleanLine(o.area, 80), items: o.items.map(x => cleanLine(x, 300)).filter(Boolean) })).filter(o => o.area && o.items.length);
  if (p.wins) out.wins = p.wins.map(x => cleanLine(x, 300)).filter(Boolean);
  if (p.slipped) out.slipped = p.slipped.map(x => ({ ...(x.taskId ? { taskId: cleanLine(x.taskId, 160) } : {}), title: cleanLine(x.title, 300), ...(x.reason ? { reason: cleanLine(x.reason, 300) } : {}) }));
  if (p.done) out.done = p.done.map(x => ({ ...(x.taskId ? { taskId: cleanLine(x.taskId, 160) } : {}), title: cleanLine(x.title, 300), ...(x.kind ? { kind: x.kind } : {}) }));
  if (p.rolled !== undefined) out.rolled = p.rolled;
  if (p.top3) out.top3 = p.top3.map(x => cleanLine(x, 160)).filter(Boolean);
  if (p.notes !== undefined) out.notes = cleanText(p.notes, 4000);
  if (p.summary !== undefined) out.summary = cleanText(p.summary, 1200);
  if (p.stats) out.stats = JSON.parse(JSON.stringify(p.stats));
  return out;
};

export const BRIEF_OPS = [
  {
    name: 'review.save', tool: 'save_review',
    description: "Save a weekly review (kind 'week', date = the first day of the week) or an evening recap (kind 'evening', date = that day). Saving the same kind and date again replaces the earlier one. Shown in the dashboard's Review > History; list_reviews reads them back.",
    schema: SCHEMA,
    run(ctx, p) {
      if (!isIsoDate(p.date)) throw dateError('date', p.date, ctx.today);
      if (p.top3) for (const id of p.top3) ctx.task(id, 'top3');   // must be real tasks
      ctx.touch('key:reviews');
      const s = ctx.s;
      if (!Array.isArray(s.reviews)) s.reviews = [];
      const at = s.reviews.findIndex(r => r && r.kind === p.kind && r.date === p.date);
      const prev = at >= 0 ? s.reviews[at] : null;
      const rec = { id: prev ? prev.id : `rv-${p.kind}-${p.date}`, kind: p.kind, date: p.date, savedAt: new Date(ctx.now || Date.now()).toISOString(), source: ctx.source || 'ui', ...clean(p) };
      if (at >= 0) s.reviews[at] = rec; else s.reviews.push(rec);
      if (s.reviews.length > KEEP) s.reviews.splice(0, s.reviews.length - KEEP);
      const label = p.kind === 'week' ? `weekly review (week of ${p.date})` : `evening recap for ${p.date}`;
      return {
        summary: `${prev ? 'Update' : 'Save'} the ${label}`,
        changes: [{ entity: 'review', id: rec.id, label: truncate(label, 80), field: prev ? 'updated' : 'created', from: prev ? prev.savedAt : null, to: rec.savedAt }],
        created: prev ? undefined : { reviewId: rec.id },
      };
    },
  },
];
export { ActionError };

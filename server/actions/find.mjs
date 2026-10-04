// server/actions/find.mjs - fuzzy task search, so a caller updates the task
// the user meant instead of creating a duplicate.
//
// Scores are 0..1. The title counts most; people (names and aliases linked to
// the task), tags, the stream, subtasks and the description count less. Small
// typos (one or two letters) and word prefixes still match.

import { levenshtein, COMBINING } from './model.mjs';

const STOP = new Set(['the', 'a', 'an', 'to', 'for', 'of', 'and', 'on', 'in', 'with', 're', 'about', 'my', 'is', 'at', 'by', 'from', 'task', 'tasks']);

export function tokens(s) {
  return String(s ?? '').normalize('NFKD').replace(COMBINING, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter(w => w && !STOP.has(w));
}

function tokenScore(q, words) {
  let best = 0;
  for (const w of words) {
    if (w === q) return 1;
    if (q.length >= 3 && w.startsWith(q)) best = Math.max(best, 0.85);
    else if (w.length >= 3 && q.startsWith(w) && w.length >= q.length - 2) best = Math.max(best, 0.8);
    else if (q.length >= 4 && Math.abs(w.length - q.length) <= 2) {
      const d = levenshtein(q, w);
      if (d === 1) best = Math.max(best, 0.75);
      else if (d === 2 && q.length >= 7) best = Math.max(best, 0.6);
    }
  }
  return best;
}

/** Build the searchable view of a task once. */
export function indexTask(t, { peopleById, peopleIds, streamLabel, notes } = {}) {
  const people = (peopleIds || (Array.isArray(t.people) ? t.people : [])).flatMap(id => {
    const p = peopleById && peopleById.get(id);
    return p ? [p.id, p.name, ...(p.aliases || [])] : [id];
  });
  return {
    t,
    title: tokens(t.title),
    titleNorm: tokens(t.title).join(' '),
    people: tokens(people.join(' ')),
    tags: tokens((t.tags || []).join(' ')),
    other: tokens([streamLabel || t.stream, ...(t.subtasks || []).map(s => s.title), t.detail || '', ...(notes || []).map(n => n.text)].join(' ').slice(0, 4000)),
  };
}

/** Score one indexed task against a query. Returns {score, matchedOn}. */
export function scoreTask(ix, query) {
  const q = tokens(query);
  if (!q.length) return { score: 0, matchedOn: [] };
  const qNorm = q.join(' ');
  if (ix.titleNorm === qNorm) return { score: 1, matchedOn: ['title'] };
  const on = new Set();
  let sum = 0, titleHits = 0;
  for (const w of q) {
    const a = tokenScore(w, ix.title);
    const b = tokenScore(w, ix.people) * 0.85;
    const c = tokenScore(w, ix.tags) * 0.7;
    const d = tokenScore(w, ix.other) * 0.45;
    const best = Math.max(a, b, c, d);
    if (best > 0) {
      if (best === a) { on.add('title'); titleHits++; } else if (best === b) on.add('people'); else if (best === c) on.add('tags'); else on.add('detail');
    }
    sum += best;
  }
  const coverage = sum / q.length;
  const precision = ix.title.length ? Math.min(1, titleHits / ix.title.length) : 0;
  let score = 0.8 * coverage + 0.2 * precision;
  if (qNorm.length >= 4 && ix.titleNorm.includes(qNorm)) score = Math.max(score, 0.85 + 0.1 * Math.min(1, qNorm.length / Math.max(1, ix.titleNorm.length)));
  return { score: Math.round(Math.min(1, score) * 1000) / 1000, matchedOn: [...on] };
}

/** True when two titles are near-identical (used to refuse duplicate creates). */
export function nearDuplicate(a, b) {
  const x = tokens(a), y = tokens(b);
  if (!x.length || !y.length) return false;
  if (x.join(' ') === y.join(' ')) return true;
  const sx = new Set(x), sy = new Set(y);
  const inter = [...sx].filter(w => sy.has(w)).length;
  const jac = inter / new Set([...sx, ...sy]).size;
  if (jac >= 0.85 && Math.abs(x.length - y.length) <= 1) return true;
  // the same words with one typo in one longer word ("Email Sam re corections");
  // numbers and short words must match exactly ("Invoice 12" is not "Invoice 13").
  if (x.length === y.length && x.length >= 3) {
    const diff = x.map((w, i) => [w, y[i]]).filter(([p, q]) => p !== q);
    if (diff.length !== 1) return false;
    const [p, q] = diff[0];
    return p.length >= 5 && q.length >= 5 && !/\d/.test(p + q) && levenshtein(p, q) <= 2;
  }
  return false;
}

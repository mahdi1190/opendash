// server/actions/ops-daynotes.mjs - the Daily note store (owner: the "notebook"
// Home widget, WIDGETS_CATALOGUE.md 3.15). One running markdown note per day:
//   state.daynotes = { 'YYYY-MM-DD': { md, updatedAt } }   (a data key; no migration)
// Added to OPS in ops.mjs and QUERIES in queries.mjs. The rules (cap, append,
// search) are the page's own: src/app/12-home-notebook-logic.js via lib/daynotes.mjs.
//
//   daynote.save  [save_daynote]  {date, md | appendMd}: replace a day's note, or
//                                 add lines at its end; 10,000 characters a day;
//                                 md '' clears the day. Undo: entity 'daynote:<date>'.
//   daynotes.get  [get_daynotes]  {date | from, to, q}: one day, a range (92 days at
//                                 most), or the lines matching q.
//
// Privacy (catalogue open question 4): whether assistants may read daily notes is
// the user's call. Until then the query is flagged `assistant: false`, so the in-app
// assistant's tool list (lib/assistant.mjs assistantToolNames) leaves it out, and
// get_context never includes notes.

import { ActionError, cleanText, isIsoDate, dateError, weekdayOf } from './model.mjs';
import { DAYNOTE_MAX, dnAppend, dnSearch, dnAddDays, dnTasks } from '../../lib/daynotes.mjs';

const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const DATE = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', formatHint: 'YYYY-MM-DD' };
const RANGE_MAX = 92;
const OUT_MAX = 60000;                               // characters of note text one query returns

const notesOf = (s) => (s.daynotes && typeof s.daynotes === 'object' && !Array.isArray(s.daynotes) ? s.daynotes : {});
const mdOf = (s, date) => { const e = notesOf(s)[date]; return e && typeof e.md === 'string' ? e.md : ''; };
// Multi-line text as the page keeps it: control characters out, line ends normalised.
const clean = (v) => cleanText(v);
const tooLong = (n, date) => new ActionError('BAD_VALUE', `the note for ${date} would be ${n.toLocaleString('en-GB')} characters; a day holds at most ${DAYNOTE_MAX.toLocaleString('en-GB')}`, {
  field: 'md', hint: 'shorten it, or write the rest on another day',
});

export const DAYNOTE_OPS = [
  {
    name: 'daynote.save', tool: 'save_daynote',
    description: "Write the user's daily note for one day (the Daily note widget on Home: a running markdown log of what they tried, decided and learned). md replaces the whole day's note ('' clears it); appendMd adds lines at the end (for a timestamped entry use '- HH:MM text'). Give exactly one of md / appendMd. At most 10,000 characters per day.",
    schema: obj({
      date: { ...DATE, description: 'the day the note is for' },
      md: { type: 'string', maxLength: DAYNOTE_MAX, description: "the whole note for that day, in markdown (replaces it; '' clears the day)" },
      appendMd: { type: 'string', minLength: 1, maxLength: DAYNOTE_MAX, description: 'markdown added at the end of that day, on a line of its own' },
    }, ['date']),
    run(ctx, p) {
      if (!isIsoDate(p.date)) throw dateError('date', p.date, ctx.today);
      const hasMd = p.md !== undefined, hasAppend = p.appendMd !== undefined;
      if (hasMd === hasAppend) throw new ActionError('INVALID_PARAMS', 'give exactly one of md (replace the day) or appendMd (add at the end)', { field: hasMd ? 'appendMd' : 'md' });
      ctx.touch('daynote:' + p.date);
      const s = ctx.s;
      const prev = mdOf(s, p.date);
      let next;
      if (hasMd) next = clean(p.md);
      else {
        const add = clean(p.appendMd);
        if (!add) throw new ActionError('BAD_VALUE', 'appendMd is empty after cleaning', { field: 'appendMd' });
        next = dnAppend(prev, add);
      }
      if (next.length > DAYNOTE_MAX) throw tooLong(next.length, p.date);
      const label = `daily note for ${weekdayOf(p.date)} ${p.date}`;
      if (next === prev) return { summary: `No change to the ${label}`, changes: [] };
      if (!s.daynotes || typeof s.daynotes !== 'object' || Array.isArray(s.daynotes)) s.daynotes = {};
      if (next.trim()) s.daynotes[p.date] = { md: next, updatedAt: new Date(ctx.now || Date.now()).toISOString() };
      else delete s.daynotes[p.date];
      const verb = !next.trim() ? 'Clear' : !prev ? 'Start' : hasAppend ? 'Add to' : 'Rewrite';
      // History shows sizes only, never the note's words.
      return {
        summary: `${verb} the ${label}`,
        changes: [{ entity: 'daynote', id: p.date, label: `Daily note ${p.date}`, field: 'md', from: prev ? `${prev.length} characters` : null, to: next.trim() ? `${next.length} characters` : null }],
      };
    },
  },
];

function dayOut(date, e) {
  const md = e && typeof e.md === 'string' ? e.md : '';
  const tasks = dnTasks(md);
  return { date, weekday: weekdayOf(date), md, chars: md.length, updatedAt: (e && e.updatedAt) || null, openTasks: tasks.filter(t => !t.done).length };
}

export const DAYNOTE_QUERIES = [
  {
    name: 'daynotes.get', tool: 'get_daynotes', assistant: false,
    description: "Read the user's daily notes (Home's Daily note: one markdown note per day). date = one day; from + to = a range of at most 92 days (days without a note are left out); q = the lines containing every word of q, newest day first (within from/to when given). With nothing: the last 7 days.",
    schema: obj({
      date: { ...DATE, description: 'one day' },
      from: { ...DATE, description: 'first day of a range' },
      to: { ...DATE, description: 'last day of a range (default: today)' },
      q: { type: 'string', minLength: 1, maxLength: 200, description: 'words to search for' },
      limit: { type: 'integer', minimum: 1, maximum: 100, description: 'search: most lines returned (default 30)' },
    }),
    run(q, p) {
      const today = q.clock.today;
      for (const k of ['date', 'from', 'to']) if (p[k] !== undefined && !isIsoDate(p[k])) throw dateError(k, p[k], today);
      if (p.date && (p.from || p.to)) throw new ActionError('INVALID_PARAMS', 'give date, or from/to, not both', { field: 'date' });
      const notes = notesOf(q.s);
      const total = Object.keys(notes).filter(isIsoDate).length;
      if (p.date) return { today, date: p.date, note: notes[p.date] ? dayOut(p.date, notes[p.date]) : null, daysWithNotes: total };
      let from = p.from, to = p.to || today;
      if (!from) from = p.q ? '0000-01-01' : dnAddDays(to, -6);
      if (from > to) throw new ActionError('BAD_VALUE', `from (${from}) is after to (${to})`, { field: 'from' });
      const inRange = (d) => d >= from && d <= to;
      if (p.q) {
        const pick = Object.fromEntries(Object.entries(notes).filter(([d]) => isIsoDate(d) && inRange(d)));
        const lines = dnSearch(pick, p.q, { limit: p.limit || 30, perDay: 5 }).map(x => ({ date: x.date, weekday: weekdayOf(x.date), line: x.line + 1, text: x.text }));
        return { today, q: p.q, from: p.from || null, to, matches: lines, count: lines.length, daysWithNotes: total };
      }
      if (dnAddDays(from, RANGE_MAX - 1) < to) throw new ActionError('BAD_VALUE', `a range covers at most ${RANGE_MAX} days`, { field: 'from', hint: 'ask for a shorter range, or search with q' });
      const days = Object.keys(notes).filter(d => isIsoDate(d) && inRange(d)).sort();
      const out = [];
      let size = 0, truncated = false;
      for (const d of days.reverse()) {                        // newest first, so a cut keeps the recent days
        const o = dayOut(d, notes[d]);
        if (size + o.chars > OUT_MAX) { truncated = true; break; }
        size += o.chars; out.push(o);
      }
      return { today, from, to, notes: out.reverse(), count: out.length, ...(truncated ? { truncated: true, hint: 'ask for a shorter range' } : {}), daysWithNotes: total };
    },
  },
];

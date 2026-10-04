// 045-tasks-fields - task fields the Tasks area (2.0) relies on. Generic, no plan.
//
//   1. createdAt: tasks without one get it from their "created" history entry,
//      else their oldest history entry, else the time in a "u-<ms>-..." id,
//      else the oldest note. Tasks with none of these are left alone. Used by
//      the "Newest" sort, the task panel footer and assistants.
//   2. subtasks without an id get one (the task panel ticks, reorders and
//      promotes subtasks by id), and a subtask stored as {text} gets a title.
//   3. the old global sort: views now keep their own sort (taskViewPrefs, by
//      date then priority unless the user dragged a view into order), so the
//      leftover global sortBy:"manual" is reset to "date" and a retired
//      viewMode:"calendar" goes back to "list".
// Idempotent. Reports counts only. Nothing is deleted.

import { runIfMain } from './_lib.mjs';

export const id = '045-tasks-fields';
export const description = 'Backfill task createdAt, give id-less subtasks an id, reset the old global manual sort.';
export const auto = false;

const rand = () => Math.random().toString(36).slice(2, 6).padEnd(4, '0');

export function upgradeTasks(state) {
  const s = { createdFromHistory: 0, createdFromId: 0, createdFromNotes: 0, createdMissing: 0, subtaskIds: 0, subtaskTitles: 0, sortReset: 0, viewModeReset: 0 };
  const custom = Array.isArray(state.custom) ? state.custom : [];
  const act = state.taskActivity && typeof state.taskActivity === 'object' ? state.taskActivity : {};
  const notes = state.notes && typeof state.notes === 'object' ? state.notes : {};
  for (const t of custom) {
    if (!t || typeof t !== 'object') continue;
    if (!(Number(t.createdAt) > 0)) {
      // Entries written by other migrations (client "NNN-name", e.g. 040-tags
      // re-tagging a task) say when the migration ran, not when the task was
      // made: they must not become its createdAt when 045 runs after them.
      const hist = Array.isArray(act[t.id]) ? act[t.id].filter(a => a && Number(a.ts) > 0 && !/^\d{3}-[a-z0-9-]+$/.test(String(a.client || ''))) : [];
      const created = hist.find(a => a.type === 'created');
      const m = /^u-(\d{12,14})(?:-|$)/.exec(String(t.id || ''));
      const noteTs = (Array.isArray(notes[t.id]) ? notes[t.id] : []).map(n => Number(n && n.ts)).filter(x => x > 0);
      let ts = 0;
      if (created) { ts = Number(created.ts); s.createdFromHistory++; }
      else if (hist.length) { ts = Math.min(...hist.map(a => Number(a.ts))); s.createdFromHistory++; }
      else if (m) { ts = Number(m[1]); s.createdFromId++; }
      else if (noteTs.length) { ts = Math.min(...noteTs); s.createdFromNotes++; }
      if (ts > 0) t.createdAt = ts; else s.createdMissing++;
    }
    if (Array.isArray(t.subtasks)) {
      const seen = new Set();
      t.subtasks = t.subtasks.map((st, i) => {
        if (!st || typeof st !== 'object') return st;
        const out = st;
        if (out.title === undefined && typeof out.text === 'string') { out.title = out.text; s.subtaskTitles++; }
        if (!out.id || seen.has(out.id)) { out.id = `st-${Number(t.createdAt) || 0}-${i}-${rand()}`; s.subtaskIds++; }
        seen.add(out.id);
        return out;
      });
    }
  }
  if (state.sortBy === 'manual') { state.sortBy = 'date'; s.sortReset++; }
  if (state.viewMode === 'calendar') { state.viewMode = 'list'; s.viewModeReset++; }
  return s;
}

export async function run(ctx) {
  const state = await ctx.state.read();
  if (!state) return { changed: false, notes: ['no state file yet: nothing to do'] };
  const original = JSON.stringify(state);
  const s = upgradeTasks(state);
  const changed = JSON.stringify(state) !== original;
  const notes = [
    `createdAt filled: ${s.createdFromHistory} from history, ${s.createdFromId} from the id, ${s.createdFromNotes} from notes; ${s.createdMissing} left without (no trace of when)`,
    `subtasks given an id: ${s.subtaskIds}; given a title: ${s.subtaskTitles}`,
    `old global manual sort reset: ${s.sortReset}; retired calendar mode reset: ${s.viewModeReset}`,
  ];
  if (changed) await ctx.state.write(state);
  return { changed, notes, stats: s };
}

await runIfMain(import.meta.url, { id, description, auto, run });

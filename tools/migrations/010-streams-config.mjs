// 010-streams-config - move streams and quick-add templates out of the code
// and into the user's state, so a new user gets generic defaults and an
// existing user keeps exactly what they had.
//
// Up to v1 the app shipped one fixed list of streams (STREAMS) and quick-add
// chips (TEMPLATES) in src/script.js. From 2.0 they are data:
//   state.streams         [{id, label, color, order, archived}]
//   state.quickTemplates  [{label, title, stream, tags, priority, daysAhead?, recurrence?}]
// This migration writes a stream list into a state that has none yet (every
// stream id found in tasks, the bin or boards; a well-known id gets its
// built-in label and colour, matched by id, any other id a generated one)
// and an empty quick-add list. With no state file yet it writes nothing (a
// new user starts with the app's generic defaults). Never overwrites
// state.streams / state.quickTemplates if they already exist.

import { runIfMain } from './_lib.mjs';

export const id = '010-streams-config';
export const description = 'Store the streams and quick-add templates in the state instead of the code.';
export const auto = true;

// Well-known stream ids and their label and colour, matched by id (never by
// label): the app's generic defaults (src/app/00-core-constants.js) plus a few
// common extras. Any other id gets a generated label and a palette colour.
export const KNOWN_STREAMS = [
  { id: 'work', label: 'Work', color: '#2563eb' },
  { id: 'projects', label: 'Projects', color: '#7c3aed' },
  { id: 'side-project', label: 'Side project', color: '#ea580c' },
  { id: 'learning', label: 'Learning', color: '#059669' },
  { id: 'admin', label: 'Admin', color: '#0891b2' },
  { id: 'health', label: 'Health', color: '#0d9488' },
  { id: 'personal', label: 'Personal', color: '#6b7280' },
];
const PALETTE = ['#2563eb', '#7c3aed', '#059669', '#0891b2', '#ea580c', '#4338ca', '#db2777', '#dc2626', '#6b7280', '#0d9488', '#ca8a04'];
const titleCase = (s) => String(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Stream ids in use: well-known ids first in their built-in order, then the rest by name. */
export function usedStreamIds(state) {
  const count = new Map();
  const add = (sid) => { if (typeof sid === 'string' && /^[a-z0-9][a-z0-9_-]{0,39}$/i.test(sid)) count.set(sid, (count.get(sid) || 0) + 1); };
  for (const t of state.custom || []) add(t && t.stream);
  for (const b of (state.bin && state.bin.tasks) || []) add(b && (b.stream || (b.customData && b.customData.stream)));
  for (const b of state.boards || []) add(b && b.stream);
  const known = KNOWN_STREAMS.map(s => s.id);
  return [...count.keys()].sort((a, b) => {
    const ia = known.indexOf(a), ib = known.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;       // the built-in order
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
}

export function buildStreams(state) {
  const ids = usedStreamIds(state);
  let k = 0;
  return ids.map((sid, order) => {
    const known = KNOWN_STREAMS.find(s => s.id === sid);
    return known ? { ...known, order, archived: false }
      : { id: sid, label: titleCase(sid), color: PALETTE[(k++) % PALETTE.length], order, archived: false };
  });
}

export async function run(ctx) {
  const notes = [];
  const state = await ctx.state.read();
  if (!state) return { changed: false, notes: ['no state file yet: a new user starts with the generic defaults'] };
  let changed = false;
  if (!Array.isArray(state.streams)) {
    state.streams = buildStreams(state);
    const kn = state.streams.filter(s => KNOWN_STREAMS.some(v => v.id === s.id)).length;
    notes.push(`streams: stored ${state.streams.length} (${kn} with a built-in label and colour)`);
    changed = true;
  } else {
    notes.push(`streams: already stored (${state.streams.length})`);
  }
  if (!Array.isArray(state.quickTemplates)) {
    // No built-in quick-add chips are seeded: the user adds their own (Settings).
    state.quickTemplates = [];
    notes.push(`quick-add templates: stored ${state.quickTemplates.length}`);
    changed = true;
  } else {
    notes.push(`quick-add templates: already stored (${state.quickTemplates.length})`);
  }
  if (changed) await ctx.state.write(state);
  return { changed, notes };
}

await runIfMain(import.meta.url, { id, description, auto, run });

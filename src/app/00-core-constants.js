/* ============================================================
   STREAMS / CONSTANTS / TEMPLATES
   ============================================================ */
// Streams and quick-add templates are DATA (state.streams, state.quickTemplates),
// not code. A new user starts with the generic defaults below; an existing
// user's lists were moved into their state by tools/migrations/010-streams-config.
// STREAMS and TEMPLATES stay as the lookup objects the rest of the app reads
// (STREAMS[id].label / .color, Object.entries(STREAMS), for (t of TEMPLATES));
// applyStreams() refills them whenever state is loaded or replaced.
const DEFAULT_STREAMS = [
  { id: 'work',     label: 'Work',     color: '#2563eb' },
  { id: 'projects', label: 'Projects', color: '#7c3aed' },
  { id: 'learning', label: 'Learning', color: '#059669' },
  { id: 'admin',    label: 'Admin',    color: '#0891b2' },
  { id: 'personal', label: 'Personal', color: '#6b7280' },
];
const DEFAULT_QUICK_TEMPLATES = [
  { label: 'Follow-up email', title: 'Email re: ', stream: 'work', tags: ['email'], priority: 'p3' },
  { label: 'Daily review',    title: 'Daily review + plan', stream: 'personal', tags: [], priority: 'p3', daysAhead: 1, recurrence: 'daily' },
];
const STREAMS = {};      // id -> { label, color, order, archived, synthetic? }
const TEMPLATES = [];    // quick-add chips under the quick-add box

/**
 * Rebuild STREAMS/TEMPLATES from a state object. Stream ids that tasks use but
 * the list lacks get a grey generated entry, so nothing ever renders blank.
 */
function applyStreams(s) {
  for (const k of Object.keys(STREAMS)) delete STREAMS[k];
  const list = Array.isArray(s && s.streams) && s.streams.length ? s.streams : DEFAULT_STREAMS;
  list.forEach((x, i) => {
    if (!x || typeof x.id !== 'string' || !x.id) return;
    STREAMS[x.id] = { label: String(x.label || x.id), color: safeColor(x.color, '#6b7280'), order: x.order ?? i, archived: !!x.archived };
    // The marker's symbol and shape (right-click > Colour, symbol & shape; 28-customise.js draws them).
    if (typeof x.icon === 'string' && x.icon) STREAMS[x.id].icon = x.icon;
    if (typeof x.shape === 'string' && x.shape && x.shape !== 'dot') STREAMS[x.id].shape = x.shape;
  });
  const used = new Set();
  for (const t of (s && Array.isArray(s.custom) ? s.custom : [])) if (t && typeof t.stream === 'string' && t.stream) used.add(t.stream);
  for (const id of used) {
    if (!STREAMS[id]) STREAMS[id] = { label: id.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), color: '#6b7280', order: 999, archived: false, synthetic: true };
  }
  TEMPLATES.length = 0;
  const tl = Array.isArray(s && s.quickTemplates) ? s.quickTemplates : DEFAULT_QUICK_TEMPLATES;
  for (const t of tl) if (t && t.label && t.title) TEMPLATES.push(t);
}
/** The stream new tasks get when the view does not imply one. */
function defaultStreamId() {
  if (state && state.defaultStream && STREAMS[state.defaultStream]) return state.defaultStream;
  if (STREAMS.personal) return 'personal';
  return Object.keys(STREAMS)[0] || 'personal';
}

const PRIORITIES = {
  p1: { label: 'P1 — High',   color: 'var(--p1)' },
  p2: { label: 'P2 — Medium', color: 'var(--p2)' },
  p3: { label: 'P3 — Low',    color: 'var(--p3)' },
  p0: { label: 'No priority', color: 'var(--p0)' },
};
const PRIO_FLAG_SVG = '<svg viewBox="0 0 16 16"><path d="M3 1.5v13a.5.5 0 0 0 1 0V10h7l1 2h3a.5.5 0 0 0 .447-.724L13 7l2.447-4.276A.5.5 0 0 0 15 2H4v-.5a.5.5 0 0 0-1 0z"/></svg>';


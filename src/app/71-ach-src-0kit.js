/* ============================================================
   ACHIEVEMENTS, the shared pass for the pack fact sources (2.21; docs/dev/ACHIEVEMENTS_500.md 1.7).
   PURE: no DOM, no page globals at load. ONE walk over the finished tasks, done once per facts build
   (memoised on the context), so 500 achievements never mean 500 passes.

   Anti-abuse rules every pack source follows (the same spirit as the garden's focus-time economy):
     - only REAL finishes count: a one-off task that is not "light" (gameIsLight: tiny, ticked straight
       after it was added, or bare), so adding and ticking junk earns nothing;
     - a repeating task counts once a day (as XP does); a task closed as won't do is never a finish;
     - things you set (plans, estimates, priorities, dates) only count on tasks you then really finished;
     - big numbers sit in the hard tiers, small ones need runs, weeks and months, not clicks.

     achPass(c) -> {
       fin:   [{id, t, e, day, ts, created, due, acts, est, planTo, planAt, slot}]  real finished one-off tasks
       finBy: Map id -> the same record
       focusMs: Map taskId -> focused ms,
       open:  tasks still open (one-off), wont: closed as won't do,
     }
   ============================================================ */
function _achAct(c, id) { const a = c.data.taskActivity && c.data.taskActivity[id]; return Array.isArray(a) ? a : []; }
function _achIsWont(c, t) { return !!t && c.isDone(t.id) && t.resolution === 'wontdo'; }
function achPass(c) {
  if (c._pass) return c._pass;
  const P = { fin: [], finBy: new Map(), focusMs: new Map(), open: [], wont: [], bins: [] };
  c._pass = P;
  for (const s of c.sessions) if (s.t) P.focusMs.set(s.t, (P.focusMs.get(s.t) || 0) + s.ms);
  const firstDone = new Map();
  for (const e of c.entries) {
    const t = c.tasks.get(e.id);
    if (!t || c.repeats(t) || e.light || _achIsWont(c, t)) continue;
    if (!firstDone.has(e.id)) firstDone.set(e.id, e);
  }
  for (const [id, e] of firstDone) {
    const t = c.tasks.get(id), acts = _achAct(c, id).filter(a => a && typeof a === 'object').slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
    // the plan that stood when it was finished: the last `plan` entry (with a day) made before the finish
    let planTo = '', planAt = 0, slot = false;
    for (const a of acts) {
      if (a.type !== 'plan' || !a.to || !(a.ts <= e.ts + 60000)) continue;
      planTo = a.to; planAt = a.ts; slot = !!a.time;
    }
    const r = { id, t, e, day: e.day, ts: e.ts, created: Number(t.createdAt) > 0 ? c.day(t.createdAt) : '', due: t.dueDate || '', acts, est: Number(t.estimate) || 0, planTo, planAt, slot };
    P.fin.push(r); P.finBy.set(id, r);
  }
  for (const t of c.tasks.values()) {
    if (c.repeats(t)) continue;
    if (_achIsWont(c, t)) P.wont.push(t);
    else if (!c.isDone(t.id)) P.open.push(t);
  }
  const bin = c.data.bin && Array.isArray(c.data.bin.tasks) ? c.data.bin.tasks : [];
  for (const b of bin) if (b && b.customData && b.binTs) P.bins.push(b);
  return P;
}
/** The day a task was last closed one way or another, or '' (finished, won't do). */
function achTaskKind(c, t) {
  // the first tag, else the stream: "kinds of work" for estimates and focus
  const tag = Array.isArray(t.tags) && t.tags.length ? String(t.tags[0]).toLowerCase() : '';
  return tag || (t.stream ? 's:' + t.stream : '');
}
/** The Monday-style week keys a date range touches are the caller's job; this gives the season of an ISO day (northern). */
function achSeasonOf(iso) { const m = Number(String(iso).slice(5, 7)); return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }

/* ============================================================
   GAME, the achievements' counters and facts, the page side (2.18 B0;
   docs/dev/ACHIEVEMENTS_500.md 2.1). The facts themselves are pure
   (71-ach-1facts.js achFactsCompute); this file feeds them the live state, keeps
   the counters for moments the data cannot show, reads the device providers and
   runs the periodic checks.

   The counters live in state.game (synced, lib/sync/manifest.mjs '── game ──'):
     ticks   {kind: {day: 1}}                 "did X on this day" (92-game-1core.js gameStreakTick)
     counts  {kind: {'YYYY-MM|slot': n}}      events that happen several times a day: one register per
                                              month and DEVICE SLOT, so two computers never write the same
                                              register and the totals add up. Buckets older than 24 months
                                              fold into 'YYYY|slot' (this slot's own keys only).
     marks   {kind: {key: 'YYYY-MM-DD'}}      firsts and collections: set once, 1,000 keys a kind at most
   The slot is a random id per browser profile (localStorage 'opendash-ach-slot'): bookkeeping, never synced.
   Keys are IDS FROM THE APP'S OWN TABLES ONLY (page ids, view modes, widget ids, scene refs, 'YYYY-MM'):
   never task titles, people, places, amounts or other text. Kinds are [a-z0-9-]{1,24}.

   PUBLIC API (other modules call these; safe at any time, never throw):
     gameCount(kind, n = 1)         += n in this month's bucket for this device -> this device's month total
     gameMark(kind, key)            marks[kind][key] = today, once -> true when new
     gameStreakTick(kind, day?)     (92-game-1core.js) a tick
     registerAchFacts(id, fn)       a DEVICE provider (finance, locations, calendar, friends, a 2.18 module):
                                    fn() -> {n: {fact: number}, s: {series: {key: number}}, m: {kind: {key: day}}}
                                    or a flat {fact: number}; read at most once a minute, in a try. Known
                                    providers are read without registering: gameAchFacts, funAchFacts and, when
                                    their modules are there, gardenAchFacts, petAchFacts, wardrobeAchFacts, youAchFacts
     registerAchCheck(id, fn)       a periodic check fn({today, counts, tick, mark}) (load, then every 5 minutes
                                    while the page is visible): for "a check found..." ticks
     gameFacts()                    the facts view achEval reads (memoised with gameStats' key)
     gameFactsRaw()                 {n, s, m, errors}
     gameFactsBoot()                after the state file has loaded (99-boot.js): the 'open' tick, the checks
     window.OpenDashGame            gains count, mark, facts, registerFacts (no load-order worries)
   ============================================================ */
const _gf = { key: '', view: null, raw: null, rev: 0, prov: new Map(), provMemo: new Map(), checks: new Map(), slot: '', booted: false, timer: 0 };
const _GF_AUTO = ['gameAchFacts', 'funAchFacts', 'gardenAchFacts', 'petAchFacts', 'wardrobeAchFacts', 'youAchFacts'];

function _gfKind(kind) { const k = String(kind || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24); return k || ''; }
function _gfSlot() {
  if (_gf.slot) return _gf.slot;
  let s = '';
  try { s = localStorage.getItem('opendash-ach-slot') || ''; } catch (e) { s = ''; }
  if (!/^[a-z0-9]{6}$/.test(s)) {
    s = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
    try { localStorage.setItem('opendash-ach-slot', s); } catch (e) { /* private mode: one slot per page load (registers still add up) */ }
  }
  return (_gf.slot = s);
}
function _gfDirty() { _gf.rev++; _gf.key = ''; if (typeof achCheckSoon === 'function') achCheckSoon(1500); }
/** Buckets of this slot older than 24 months fold into one per year (never another device's). */
function _gfFold(b, slot) {
  const today = todayStr(), cut = `${Number(today.slice(0, 4)) - 2}-${today.slice(5, 7)}`;
  for (const k of Object.keys(b)) {
    const m = /^(\d{4})-(\d{2})\|(.+)$/.exec(k);
    if (!m || m[3] !== slot || `${m[1]}-${m[2]}` >= cut) continue;
    const y = `${m[1]}|${slot}`;
    b[y] = (Number(b[y]) || 0) + (Number(b[k]) || 0);
    delete b[k];
  }
}
function gameCount(kind, n) {
  try {
    const k = _gfKind(kind);
    if (!k || typeof state === 'undefined' || !state) return 0;
    const add = Math.max(1, Math.min(1000, Math.round(Number(n) || 1)));
    const g = _gmG(), slot = _gfSlot();
    const b = g.counts[k] && typeof g.counts[k] === 'object' ? g.counts[k] : (g.counts[k] = {});
    const key = todayStr().slice(0, 7) + '|' + slot;
    b[key] = (Number(b[key]) || 0) + add;
    _gfFold(b, slot);
    _gmSave();
    _gfDirty();
    return b[key];
  } catch (e) { return 0; }
}
function gameMark(kind, key) {
  try {
    const k = _gfKind(kind), kk = String(key == null ? '' : key).slice(0, 64);
    if (!k || !/^[A-Za-z0-9:_./-]{1,64}$/.test(kk) || typeof state === 'undefined' || !state) return false;
    const g = _gmG();
    const m = g.marks[k] && typeof g.marks[k] === 'object' ? g.marks[k] : (g.marks[k] = {});
    if (m[kk] || Object.keys(m).length >= 1000) return false;
    m[kk] = todayStr();
    _gmSave();
    _gfDirty();
    return true;
  } catch (e) { return false; }
}
function registerAchFacts(id, fn) {
  if (!id || typeof fn !== 'function') return false;
  _gf.prov.set(String(id), fn); _gf.provMemo.delete(String(id)); _gfDirty();
  return true;
}
function registerAchCheck(id, fn) {
  if (!id || typeof fn !== 'function') return false;
  _gf.checks.set(String(id), fn);
  return true;
}
/** Every provider's answer, each kept a minute. */
function _gfProviders() {
  const minute = Math.floor(Date.now() / 60000), out = [];
  const read = (id, fn) => {
    const m = _gf.provMemo.get(id);
    if (m && m.at === minute) { if (m.v) out.push(m.v); return; }
    let v = null;
    try { v = fn(); } catch (e) { v = null; }
    if (v && typeof v.then === 'function') { v.then(x => { _gf.provMemo.set(id, { at: minute, v: x || null }); _gf.key = ''; }).catch(() => {}); v = m ? m.v : null; }
    _gf.provMemo.set(id, { at: minute, v: v || null });
    if (v) out.push(v);
  };
  for (const name of _GF_AUTO) { const fn = typeof globalThis !== 'undefined' ? globalThis[name] : null; if (typeof fn === 'function' && !_gf.prov.has(name)) read(name, fn); }
  for (const [id, fn] of _gf.prov) read(id, fn);
  return out;
}
function _gfKey() {
  let base = '';
  try { base = typeof _gmKey === 'function' ? _gmKey() : todayStr(); } catch (e) { base = String(Date.now()); }
  return base + '|' + _gf.rev;
}
function _gfCtx() {
  return { today: todayStr(), weekStart: typeof _gmWs === 'function' ? _gmWs() : 'Mon', birthday: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.birthday) || '' };
}
function gameFactsRaw() {
  const k = _gfKey();
  if (_gf.raw && _gf.key === k) return _gf.raw;
  const ctx = _gfCtx();
  let pre = null;
  try { const s = gameStats(); if (s) pre = { xt: { total: s.xp.tasks, entries: s.xp.entries }, sessions: s.focus.list }; } catch (e) { pre = null; }
  const raw = achFactsCompute({ data: state, today: ctx.today, weekStart: ctx.weekStart, birthday: ctx.birthday, partsOf: (ms) => Clock.parts(ms), pre, extra: _gfProviders() });
  _gf.raw = raw; _gf.key = k; _gf.view = null;
  return raw;
}
/** The facts view for achEval: numbers, series, marks, today, and (set by the caller) the unlocked set. */
function gameFacts() {
  try {
    const raw = gameFactsRaw();
    if (_gf.view && _gf.view.raw === raw) return _gf.view;
    const a = typeof achState === 'function' ? achState() : { unlocked: {}, hist: {} };
    _gf.view = achFactsView(raw, Object.assign(_gfCtx(), { unlocked: a.unlocked, hist: a.hist || {} }));
    return _gf.view;
  } catch (e) {
    console.error('[ach] facts', e);
    return achFactsView({ n: {}, s: {}, m: {} }, _gfCtx());
  }
}

/* ---------- the periodic checks: "a check found..." ticks and marks ---------- */
function _gfOpenTasks() { return (state.custom || []).filter(t => t && t.id && statusOf(t.id) !== 'done'); }
registerAchCheck('lists', (c) => {
  const open = _gfOpenTasks(), today = c.today;
  const counts = typeof sidebarCounts === 'function' ? c.counts() : null;
  const overdue = counts ? counts.overdue : open.filter(t => t.dueDate && t.dueDate < today).length;
  if (open.length >= 5 && overdue === 0) c.tick('overdue-none');
  if (open.length >= 20 && open.every(t => t.priority === 'p1' || t.priority === 'p2' || t.priority === 'p3')) c.tick('all-prioritised');
  if (open.length === 42) c.mark('open42', 'seen');
  if (!open.length) { const s = gameStats(); if (s && s.done.total >= 50) c.tick('zero-open'); }
  if (open.length >= 20) {
    const cut = Date.now() - 60 * 86400000;
    const touched = (t) => Math.max(Number(t.createdAt) || 0, ...((state.taskActivity && state.taskActivity[t.id]) || []).map(a => Number(a && a.ts) || 0),
      ...((state.notes && state.notes[t.id]) || []).map(n => Number(n && n.ts) || 0)) >= cut;
    if (open.every(touched)) c.tick('stale-none');
  }
});
registerAchCheck('holiday', (c) => {
  const st = state.profile && state.profile.status;
  if (st && st.emoji === '🌴' && !(st.until && Number(st.until) < Date.now())) c.tick('holiday');
});
function gameFactsChecks() {
  if (typeof state === 'undefined' || !state || !(state.custom || []).length) return;
  let counts = null;
  const c = {
    today: todayStr(),
    counts: () => (counts || (counts = sidebarCounts())),
    tick: (k) => gameStreakTick(k),
    mark: (k, key) => gameMark(k, key),
    count: (k, n) => gameCount(k, n),
  };
  for (const [id, fn] of _gf.checks) { try { fn(c); } catch (e) { console.warn('[ach] check ' + id + ' failed', e); } }
}
/** After the state file has loaded (99-boot.js): today's 'open' tick, then the checks, then every 5 minutes. */
function gameFactsBoot() {
  if (_gf.booted) return;
  _gf.booted = true;
  try { gameStreakTick('open'); } catch (e) { /* never in the way */ }
  setTimeout(() => { try { gameFactsChecks(); } catch (e) { /* never in the way */ } }, 4000);
  _gf.timer = setInterval(() => {
    if (document.hidden) return;
    try { gameStreakTick('open'); gameFactsChecks(); } catch (e) { /* never in the way */ }
  }, 5 * 60000);
}

if (typeof window !== 'undefined') {
  const prev = window.OpenDashGame || {};
  window.OpenDashGame = Object.freeze(Object.assign({}, prev, {
    count: (k, n) => gameCount(k, n), mark: (k, key) => gameMark(k, key), facts: () => gameFacts(),
    registerFacts: (id, fn) => registerAchFacts(id, fn), registerPack: (p) => registerAchievementPack(p),
  }));
}

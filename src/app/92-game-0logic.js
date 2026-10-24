/* ============================================================
   GAME, the pure part (2.16). No DOM, no page globals at load: everything
   comes in as arguments, so the numbers are the same on every computer.
   The page side is 92-game-1core.js (state.game, moments, the public API),
   92-game-2focus.js (the focus timer), 92-game-3ui.js (chip, Home, the Game
   page, the task card, Settings).

     XP              gameTaskXp(task, ts, o)  one completion's XP before the daily caps
                     gameXpFromLog(o)         every completion's XP: {total, byDay, entries}
                     gameFocusXp(sessions, dayOf)   1 XP per 5 focused minutes, 40 a day at most
     levels          gameLevelOf(xp)          {level, into, need, pct, total}; gameTitleOf(level)
     streaks         gameStreak(active, today, o)   a run of days (or weeks) with streak freezes
     weeks           gameWeekFrom(iso, weekStart)   the first day of iso's week ('Mon'|'Sun'|'Sat')
     quests          gameQuestPick(ctx)       three quests for a week, from the user's own data
     records         gameRecords(o)           personal bests from the data
     estimates       gameEstimateLearn(samples) / gameEstimateLine(kind, r)
     unlocks         GAME_ACCENTS, gameUnlocksAt(level)

   The XP rules (approved by the user, 24 Oct):
     - priority and size: p1 30, p2 20, p3 12, none 10, times the estimate's size
       (10 min 0.5x ... 3 h and more 2.2x), plus 2 per subtask (16 at most);
       done by the due date +10%; a repeating task (a habit) 0.6x, once a day
     - no reward for padding: a task closed again counts once; a "light" task
       (estimate 10 min or less, ticked within 3 minutes of being added, or a
       bare one with no priority, estimate, subtasks or date) earns 5, and only
       the first 8 light tasks of a day earn anything
   Gentle: nothing is ever taken away (unlocks stay unlocked), a missed day is
   forgiven by a streak freeze, and nothing here ever blocks work.
   ============================================================ */
const GAME_FUN_LEVELS = Object.freeze(['off', 'subtle', 'full']);
const GAME_RULES = Object.freeze({
  base: Object.freeze({ p1: 30, p2: 20, p3: 12, p0: 10 }),
  light: 5, lightCap: 8, quickMs: 180000,
  subtaskXp: 2, subtaskCap: 16, habitMul: 0.6, onTimeMul: 1.1,
  focusMinPerXp: 5, focusDayCap: 40,
  bossMin: 3,                      // a task with this many subtasks or more is a boss task
});
const _GAME_DAY = 86400000;
function _gmIso(iso, n) { const t = Date.parse(iso + 'T12:00:00Z') + n * _GAME_DAY; return new Date(t).toISOString().slice(0, 10); }   // clock-ok: UTC date maths on ISO days
function _gmDow(iso) { return new Date(iso + 'T12:00:00Z').getUTCDay(); }   // clock-ok: weekday of an ISO day
function _gmDayFallback(ts) { return new Date(Number(ts)).toISOString().slice(0, 10); }   // clock-ok: Node fallback; the page passes Clock's day
function _gmHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** A small seeded random (mulberry32): the same week gives the same picks on every computer. */
function _gmRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- weeks ---------- */
function gameWeekFrom(iso, weekStart) {
  const start = weekStart === 'Sun' ? 0 : weekStart === 'Sat' ? 6 : 1;
  return _gmIso(iso, -((_gmDow(iso) - start + 7) % 7));
}

/* ---------- XP ---------- */
function gameSizeMul(est) {
  const m = Number(est) || 0;
  if (m <= 0) return 1;
  if (m <= 10) return 0.5;
  if (m <= 20) return 0.7;
  if (m <= 45) return 1;
  if (m <= 90) return 1.3;
  if (m <= 180) return 1.7;
  return 2.2;
}
function _gmPri(t) { const p = t && t.priority; return p === 'p1' || p === 'p2' || p === 'p3' ? p : 'p0'; }
function _gmRepeats(t) { return !!(t && t.recurrence && t.recurrence !== 'none'); }
/** A light task: tiny, ticked straight after it was added, or bare (no priority, estimate, subtasks or date). */
function gameIsLight(t, ts) {
  if (!t) return false;
  const est = Number(t.estimate) || 0;
  if (est > 0 && est <= 10) return true;
  if (Number(t.createdAt) > 0 && Number(ts) - Number(t.createdAt) >= 0 && Number(ts) - Number(t.createdAt) < GAME_RULES.quickMs) return true;
  const subs = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
  return _gmPri(t) === 'p0' && !est && !subs && !t.dueDate && !_gmRepeats(t);
}
/** One completion's XP before the daily caps: {xp, light}. A task that no longer exists counts as a plain one. */
function gameTaskXp(t, ts, o) {
  o = o || {};
  if (!t) return { xp: GAME_RULES.base.p0, light: false };
  if (gameIsLight(t, ts)) return { xp: GAME_RULES.light, light: true };
  let xp = GAME_RULES.base[_gmPri(t)] * gameSizeMul(t.estimate);
  const subs = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
  xp += Math.min(GAME_RULES.subtaskCap, subs * GAME_RULES.subtaskXp);
  if (t.dueDate && o.day && o.day <= t.dueDate) xp *= GAME_RULES.onTimeMul;
  if (_gmRepeats(t)) xp *= GAME_RULES.habitMul;
  return { xp: Math.max(1, Math.round(xp)), light: false };
}
/**
 * Every completion's XP. o = {log: {taskId: [ms]}, tasks: Map(id -> task), dayOf(ms)}.
 * A one-off task counts once (closing it again earns nothing), a repeating one once a day;
 * light tasks past the day's cap earn 0. -> {total, byDay: {day: xp}, entries: [{id, ts, day, xp, light}]}
 */
function gameXpFromLog(o) {
  o = o || {};
  const dayOf = typeof o.dayOf === 'function' ? o.dayOf : _gmDayFallback;
  const tasks = o.tasks instanceof Map ? o.tasks : new Map();
  const all = [];
  for (const [id, arr] of Object.entries(o.log || {})) {
    if (!Array.isArray(arr)) continue;
    for (const v of arr) { const ts = Number(v); if (isFinite(ts) && ts > 0) all.push([id, ts]); }
  }
  all.sort((a, b) => a[1] - b[1]);
  const once = new Set(), lightN = new Map(), byDay = {}, entries = [];
  let total = 0;
  for (const [id, ts] of all) {
    const t = tasks.get(id), day = dayOf(ts);
    const k = _gmRepeats(t) ? id + '|' + day : id;
    if (once.has(k)) continue;
    once.add(k);
    let { xp, light } = gameTaskXp(t, ts, { day });
    if (light) { const n = (lightN.get(day) || 0) + 1; lightN.set(day, n); if (n > GAME_RULES.lightCap) xp = 0; }
    total += xp;
    byDay[day] = (byDay[day] || 0) + xp;
    entries.push({ id, ts, day, xp, light });
  }
  return { total, byDay, entries };
}
/** Focus XP per day: 1 per 5 minutes logged, at most 40 a day. sessions: [{ms, d}] -> {total, byDay} */
function gameFocusXp(sessions, dayOf) {
  const per = new Map();
  for (const s of sessions || []) {
    if (!s || !(Number(s.ms) > 0)) continue;
    const d = s.d || (typeof dayOf === 'function' && s.s ? dayOf(s.s) : '');
    if (!d) continue;
    per.set(d, (per.get(d) || 0) + Number(s.ms));
  }
  const byDay = {}; let total = 0;
  for (const [d, ms] of per) { const xp = Math.min(GAME_RULES.focusDayCap, Math.floor(ms / 60000 / GAME_RULES.focusMinPerXp)); if (xp) { byDay[d] = xp; total += xp; } }
  return { total, byDay };
}

/* ---------- levels ---------- */
/** XP from level L to L+1: 110, 140, 170 ... (level 10 at 2,070 XP, level 50 at 40,670). */
function gameLevelCost(level) { return 80 + 30 * Math.max(1, level); }
function gameLevelOf(xp) {
  let left = Math.max(0, Math.floor(Number(xp) || 0)), level = 1;
  while (level < 999 && left >= gameLevelCost(level)) { left -= gameLevelCost(level); level++; }
  const need = gameLevelCost(level);
  return { level, into: left, need, pct: Math.max(0, Math.min(1, left / need)), total: Math.max(0, Math.floor(Number(xp) || 0)) };
}
const GAME_TITLES = Object.freeze([[1, 'Newcomer'], [3, 'Apprentice'], [6, 'Doer'], [10, 'Finisher'], [15, 'Pathfinder'], [20, 'Expert'], [30, 'Master'], [40, 'Grandmaster'], [50, 'Legend'], [75, 'Mythic']]);
function gameTitleOf(level) { let t = GAME_TITLES[0][1]; for (const [l, n] of GAME_TITLES) if (level >= l) t = n; return t; }
/** The next title and the level it comes at, or null at the top. */
function gameNextTitle(level) { const n = GAME_TITLES.find(([l]) => l > level); return n ? { level: n[0], title: n[1] } : null; }

/* ---------- unlocks (cosmetic only) ---------- */
// Accents: swatch colours for the picker; the full light and dark sets are in styles/92-game.css.
const GAME_ACCENTS = Object.freeze([
  { id: '', label: 'Indigo', level: 1, sw: '#5b5bd6' },
  { id: 'teal', label: 'Teal', level: 3, sw: '#0f8a80' },
  { id: 'forest', label: 'Forest', level: 5, sw: '#2f855a' },
  { id: 'coral', label: 'Coral', level: 8, sw: '#d9534a' },
  { id: 'amber', label: 'Amber', level: 12, sw: '#b45309' },
  { id: 'rose', label: 'Rose', level: 16, sw: '#d6336c' },
  { id: 'violet', label: 'Violet', level: 20, sw: '#7c3aed' },
  { id: 'ocean', label: 'Ocean', level: 25, sw: '#1d6fd8' },
  { id: 'graphite', label: 'Graphite', level: 30, sw: '#3f3f46' },
  { id: 'gold', label: 'Gold', level: 40, sw: '#a16207' },
  { id: 'ember', label: 'Ember', level: 50, sw: '#c2410c' },
]);
// The "levels" animation pack (72-anim-pack-levels.js): each item unlocks with ACH_DEFS 'level-N'.
const GAME_LEVEL_REWARDS = Object.freeze([[5, 'levels/lv-star'], [10, 'levels/lv-comet'], [15, 'levels/lv-firefly'], [20, 'levels/lv-balloon'], [30, 'levels/lv-lighthouse'], [40, 'levels/lv-summit'], [50, 'levels/lv-crown']]);
/** What a level opens up, exactly at that level: {accents: [...], items: [ref], title}. */
function gameUnlocksAt(level) {
  const t = GAME_TITLES.find(([l]) => l === level);
  return {
    accents: GAME_ACCENTS.filter(a => a.level === level && a.id),
    items: GAME_LEVEL_REWARDS.filter(([l]) => l === level).map(([, r]) => r),
    title: t && level > 1 ? t[1] : '',
  };
}

/* ---------- streaks ---------- */
/**
 * A run of active days (or weeks) with streak freezes. active: Set of ISO days (week
 * starts when o.unit is 'week'); today: ISO day (this week's start for weeks).
 * Freezes: one to start with, one more every o.earnEvery active units, o.max at most;
 * a missed unit uses one up (the run carries on), with none left the run starts again.
 * Today never breaks a run: it is still open.
 * -> {current, best, freezes, frozen: [units bridged], todayDone, atRisk, since}
 */
function gameStreak(active, today, o) {
  o = o || {};
  const week = o.unit === 'week', step = week ? 7 : 1;
  const set = active instanceof Set ? active : new Set(active || []);
  const start = o.start == null ? 1 : o.start, earnEvery = o.earnEvery || (week ? 4 : 7), max = o.max == null ? (week ? 1 : 2) : o.max;
  const out = { current: 0, best: 0, freezes: start, frozen: [], todayDone: set.has(today), atRisk: false, since: '', usedTotal: 0 };
  let first = '';
  for (const d of set) if (d <= today && (!first || d < first)) first = d;
  if (!first) return out;
  let run = 0, earn = 0, freezes = start, since = '', frozen = [], used = 0;
  const limit = week ? 600 : 4000;   // at most ~11 years of days
  let d = first;
  if (Math.round((Date.parse(today) - Date.parse(first)) / (_GAME_DAY * step)) > limit) d = _gmIso(today, -limit * step);
  for (let i = 0; d <= today && i <= limit + 1; i++, d = _gmIso(d, step)) {
    if (set.has(d)) {
      if (!run) { since = d; frozen = []; }
      run++; earn++;
      if (earn >= earnEvery) { earn = 0; freezes = Math.min(max, freezes + 1); }
      if (run > out.best) out.best = run;
    } else if (d === today) {
      break;   // still open
    } else if (run > 0 && freezes > 0) {
      freezes--; used++; frozen.push(d);
    } else if (run > 0) {
      run = 0; earn = 0; freezes = start; since = ''; frozen = [];
    }
  }
  out.current = run; out.freezes = freezes; out.frozen = frozen; out.since = since; out.usedTotal = used;
  out.atRisk = run > 0 && !out.todayDone && freezes === 0;
  return out;
}

/* ---------- quests ---------- */
/**
 * Three quests for a week, chosen from the user's own data (no AI). ctx = {
 *   from, streams: [{id, label, open, avg}], overdue: [ids], avgWeekDone, avgActiveDays,
 *   p1Open, reviewed (this week's review saved), finance (bool), focusAvgMin, bossOpen,
 *   peopleOpen, oldOpen, inboxUsed }
 * -> [{id, kind, label, target, ...}] (ids are unique within the week)
 */
function gameQuestPick(ctx) {
  ctx = ctx || {};
  const rnd = _gmRand(_gmHash('quests|' + (ctx.from || '')));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Math.round(n)));
  const out = [], want = [];
  const overdue = Array.isArray(ctx.overdue) ? ctx.overdue : [];
  if (overdue.length) {
    want.push(overdue.length <= 12
      ? { id: 'overdue', kind: 'overdue', label: overdue.length === 1 ? 'Clear the overdue task' : 'Clear everything overdue', target: overdue.length, ids: overdue.slice() }
      : { id: 'overdue', kind: 'overdue', label: 'Clear 8 overdue tasks', target: 8, ids: overdue.slice(0, 40) });
  }
  if (!ctx.reviewed) want.push({ id: 'review', kind: 'review', label: 'Review your week', target: 1 });
  const streams = (ctx.streams || []).filter(s => s && s.open >= 2).sort((a, b) => b.open - a.open || String(a.id).localeCompare(String(b.id)));
  if (streams.length) {
    const s = streams[Math.floor(rnd() * Math.min(2, streams.length))];
    const n = clamp(Math.max(2, (s.avg || 0) * 1.2), 2, Math.min(5, s.open));
    want.push({ id: 'stream-' + s.id, kind: 'stream', stream: s.id, label: `Finish ${n} ${s.label} task${n === 1 ? '' : 's'}`, target: n });
  }
  const extra = [];
  if ((ctx.avgWeekDone || 0) >= 4) { const n = clamp(ctx.avgWeekDone * 1.15, 5, 60); extra.push({ id: 'total', kind: 'total', label: `Finish ${n} tasks this week`, target: n }); }
  { const n = (ctx.avgActiveDays || 0) >= 4 ? 5 : 4; extra.push({ id: 'days', kind: 'days', label: `Get something done on ${n} days`, target: n }); }
  if ((ctx.p1Open || 0) >= 2) { const n = Math.min(3, ctx.p1Open); extra.push({ id: 'p1', kind: 'p1', label: `Finish ${n} high-priority tasks`, target: n }); }
  if ((ctx.focusAvgMin || 0) >= 30) { const n = clamp((ctx.focusAvgMin * 1.2) / 30, 2, 20) * 30; extra.push({ id: 'focus', kind: 'focus', label: `Focus for ${n % 60 ? (n / 60).toFixed(1) : n / 60} hours`, target: n }); }
  if ((ctx.bossOpen || 0) >= 1) extra.push({ id: 'boss', kind: 'boss', label: 'Defeat a boss task', target: 1 });
  if (ctx.finance) extra.push({ id: 'nospend', kind: 'nospend', label: 'Have 3 no-spend days', target: 3 });
  if (ctx.inboxUsed) extra.push({ id: 'inbox', kind: 'inbox', label: 'Reach inbox zero twice', target: 2 });
  if ((ctx.peopleOpen || 0) >= 3) extra.push({ id: 'people', kind: 'people', label: 'Finish 3 tasks for other people', target: 3 });
  if ((ctx.oldOpen || 0) >= 1) extra.push({ id: 'old', kind: 'old', label: 'Finish a task open for a month or more', target: 1 });
  for (let i = extra.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [extra[i], extra[j]] = [extra[j], extra[i]]; }
  for (const q of [...want, ...extra]) { if (out.length >= 3) break; if (!out.some(x => x.id === q.id)) out.push(q); }
  return out;
}

/* ---------- records ---------- */
/**
 * Personal bests. o = {completionsByDay: {day: n}, xpByDay: {day: xp}, weekStart, streakBest,
 * focusSessions: [{ms, d}], bosses: [{n, d}], spendByWeek: {from: amount} | null (complete weeks only)}
 * -> {dayMost, weekMost, xpDay, streak, focusLongest, bossBig, cheapestWeek} each {v, d} or null
 */
function gameRecords(o) {
  o = o || {};
  const best = (map) => { let r = null; for (const [d, v] of Object.entries(map || {})) if (v > 0 && (!r || v > r.v || (v === r.v && d < r.d))) r = { v, d }; return r; };
  const weeks = {};
  for (const [d, n] of Object.entries(o.completionsByDay || {})) { const w = gameWeekFrom(d, o.weekStart); weeks[w] = (weeks[w] || 0) + n; }
  let focus = null;
  for (const s of o.focusSessions || []) if (s && s.ms > 0 && (!focus || s.ms > focus.v)) focus = { v: s.ms, d: s.d || '' };
  let boss = null;
  for (const b of o.bosses || []) if (b && b.n > 0 && (!boss || b.n > boss.v)) boss = { v: b.n, d: b.d || '' };
  let cheap = null;
  if (o.spendByWeek) for (const [d, v] of Object.entries(o.spendByWeek)) if (isFinite(v) && v >= 0 && (!cheap || v < cheap.v)) cheap = { v, d };
  return {
    dayMost: best(o.completionsByDay), weekMost: best(weeks), xpDay: best(o.xpByDay),
    streak: o.streakBest > 0 ? { v: o.streakBest, d: '' } : null,
    focusLongest: focus, bossBig: boss, cheapestWeek: cheap,
  };
}

/* ---------- estimates ---------- */
function _gmMedian(a) { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
/**
 * What the focus timer has learned about the estimates. samples: [{kind, est (min), actual (min)}]
 * (done one-off tasks with an estimate and 5+ timed minutes). The ratio is the median
 * actual/estimate, clamped to 0.25..6. -> {byKind: {kind: {ratio, n}}, overall: {ratio, n} | null}
 */
function gameEstimateLearn(samples) {
  const by = new Map(), all = [];
  for (const s of samples || []) {
    if (!s || !(s.est > 0) || !(s.actual >= 5)) continue;
    const r = Math.max(0.25, Math.min(6, s.actual / s.est));
    all.push(r);
    const k = String(s.kind || 'tasks');
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(r);
  }
  const byKind = {};
  for (const [k, rs] of by) byKind[k] = { ratio: Math.round(_gmMedian(rs) * 10) / 10, n: rs.length };
  return { byKind, overall: all.length ? { ratio: Math.round(_gmMedian(all) * 10) / 10, n: all.length } : null };
}
/** "You usually take 1.5x your estimate on writing", or '' when there is too little to say. */
function gameEstimateLine(kind, r) {
  if (!r || r.n < 3 || Math.abs(r.ratio - 1) < 0.15) return '';
  const on = kind && kind !== 'tasks' ? ` on ${kind}` : '';
  return r.ratio > 1 ? `You usually take ${r.ratio}x your estimate${on}` : `You're usually quicker than your estimate${on} (${r.ratio}x)`;
}

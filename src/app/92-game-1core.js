/* ============================================================
   GAME, the page side (2.16): state.game, the numbers, the moments, the API.
   The rules are pure (92-game-0logic.js); the focus timer is 92-game-2focus.js;
   the chip, Home, the Game page, the task card and Settings are 92-game-3ui.js.

   state.game (a UI key: saveUI, never an undo step; synced, lib/sync/manifest.mjs '── game ──'):
     {v: 1,
      prefs:   {fun: 'off'|'subtle'|'full' (default subtle), sounds: bool (default off), accent: id},
      awards:  {key: {d, xp, k, n?, t?}}   XP for moments the data cannot show (boss tasks, quests,
                                           the bonus task, inbox zero, places, other modules' events)
      ticks:   {kind: {day: 1}}            streak days the data cannot show (inbox zero, focus blocks)
      counts:  {kind: {'YYYY-MM|slot': n}} (2.18) events counted per month and device (92-game-4facts.js gameCount)
      marks:   {kind: {key: day}}          (2.18) firsts and collections by app id (92-game-4facts.js gameMark)
      focus:   {id: {t, s, ms, e, k, d}}   focus timer sessions: task, start, length, the estimate then,
                                           the kind of work (first tag or stream), the day
      run:     {t, s, f, acc, p} | null    the running focus timer (follows you to your other devices)
      quests:  {weekFrom: {list, done: {questId|'all': day}}}
      records: {key: {v, d, at}}           the personal bests already seen (a new one gets a moment); combo: the
                                           longest run of tasks under 20 minutes apart (2.18)
      seen:    {level, levelMax, intro, weekRecap, bonus: {d, t}, milestones: {}}}
   Everything else (XP from tasks and focus, levels, streaks, records, quest progress) is
   computed here from the data on each device: the same numbers everywhere, nothing to merge.

   PUBLIC API (other modules call these; all are safe to call at any time and never throw):
     gameAward(event)        event {kind, key?, xp?, label?, day?, quiet?}: XP for a moment.
                             Known kinds (fixed XP): inbox-zero 15, journal 5, garden 5, habit 5,
                             place-new 10, city-new 15, country-new 30, person-catchup 10, wrapped 10,
                             focus-block 5; any other kind: xp 1..25 (default 5). One per kind and key
                             (default key: the day); at most 3 a day per kind. -> {key, xp} | null
                             Reviews (weekly 40, evening 10) and daily notes (5) earn XP straight from
                             the data: awards for them are refused (they would count twice).
     gameStreakTick(kind, day?)   mark a streak day ('inbox', 'focus' or your own kind) -> bool
     gameStats()             everything below, computed (memoised; cheap to call):
                             {today, week, xp: {total, today, week, byDay, tasks, focus, awards},
                              level: {level, into, need, pct, total, title, next, max},
                              streaks: {done, inbox, focus, review, nospend|null} (each gameStreak's result),
                              quests: {from, to, list: [{id, kind, label, target, n, done}], daysLeft},
                              records: {dayMost, weekMost, xpDay, streak, focusLongest, bossBig, cheapestWeek},
                              focus: {sessions, totalMs, weekMs, todayMs, byDay: {day: ms}, longestMs},
                              estimates: {byKind: {kind: {ratio, n}}, overall},
                              bosses: {defeated: [{t, n, d}], open: [taskId]},
                              done: {total, byDay: {day: n}}, facts (the achievements' facts), bonus}
     gameDailyXp(from, to)   [{day, xp, done, focusMin}] for every day in the range (Wrapped, heatmaps)
     gameFocusSessions(from?, to?)   [{id, task, start, ms, day, kind, estimate}]
     gameFun() / gameOn()    the Fun level; false when it is Off
     gameAchFacts()          the achievements' extra facts (78-achievements.js reads them)
     window.OpenDashGame     the same API on one object {stats, dailyXp, focusSessions, award,
                             streakTick, fun, on}
     document event 'opendash:game'  detail {kind: 'level'|'achievement'|'quest'|'boss'|'record'|
                             'award'|'focus', ...}: a moment just happened (a journal can log it)
   Rules: computed locally, never blocking work (every hook runs later, in a try), no Claude calls,
   the Fun level (Off / Subtle / Full) gates every moment, sounds are off unless switched on.
   ============================================================ */
const _gm = { memo: null, key: '', rev: 0, days: new Map(), fin: null, finAt: 0, finBusy: false, loc: null, locAt: -1,
  combo: { n: 0, at: 0 }, checkT: 0, paintQ: 0, introUntil: 0, ac: null, queue: [], showing: false, bossHit: null };
const GAME_AWARD_XP = Object.freeze({ 'inbox-zero': 15, journal: 5, garden: 5, habit: 5,
  'place-new': 10, 'city-new': 15, 'country-new': 30, 'person-catchup': 10, wrapped: 10, 'focus-block': 5 });
const _GM_INTERNAL = new Set(['boss', 'quest', 'bonus', 'ach']);   // ach: an achievement's XP (78-achievements.js), never through gameAward
// Earned straight from the data, so an award for them would count twice: a weekly review 40, an evening review 10, a daily note 5.
const _GM_DERIVED = new Set(['review-week', 'review-evening', 'review', 'daynote']);
const GAME_DATA_XP = Object.freeze({ week: 40, evening: 10, daynote: 5 });

function _gmG() {
  if (typeof state === 'undefined' || !state) return { prefs: {}, awards: {}, ticks: {}, counts: {}, marks: {}, focus: {}, quests: {}, records: {}, seen: {} };
  if (!state.game || typeof state.game !== 'object' || Array.isArray(state.game)) state.game = { v: 1 };
  const g = state.game;
  for (const k of ['prefs', 'awards', 'ticks', 'counts', 'marks', 'focus', 'quests', 'records', 'seen']) if (!g[k] || typeof g[k] !== 'object' || Array.isArray(g[k])) g[k] = {};
  if (!g.v) g.v = 1;
  return g;
}
function _gmSave() {
  _gm.rev++; _gm.key = '';
  if (typeof saveUI === 'function') saveUI();
  _gmRepaintSoon();
}
function gameFun() {
  const f = typeof state !== 'undefined' && state && state.game && state.game.prefs ? state.game.prefs.fun : '';
  return GAME_FUN_LEVELS.includes(f) ? f : 'subtle';
}
function gameOn() { return gameFun() !== 'off'; }
function _gmMotion() { return !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
function _gmEmit(kind, detail) { try { document.dispatchEvent(new CustomEvent('opendash:game', { detail: Object.assign({ kind }, detail || {}) })); } catch (e) { /* old browser */ } }
function gamePrefSet(patch) {
  const g = _gmG();
  Object.assign(g.prefs, patch || {});
  _gmSave();
  gameAccentApply();
  if (typeof render === 'function') render();
}
/** Apply the chosen accent (unlocked by the highest level ever reached: nothing earned is lost). */
function gameAccentApply() {
  const g = _gmG(), id = String(g.prefs.accent || '');
  const a = GAME_ACCENTS.find(x => x.id === id);
  const ok = a && a.id && gameAccentOpen(a);
  if (ok) document.documentElement.setAttribute('data-game-accent', a.id); else document.documentElement.removeAttribute('data-game-accent');
}

/** An accent is open from its level, or (2.18) from the achievement that unlocks 'accent:<id>' (a.ach or achUnlockOf). */
function gameAccentOpen(a) {
  if (!a) return false;
  if (!a.id) return true;
  if (a.level && a.level <= Math.max(1, Number(_gmG().seen.levelMax) || 1) && !a.achOnly) return true;
  const ach = a.ach || (typeof achUnlockOf === 'function' ? achUnlockOf('accent', a.id) : null);
  if (!ach) return false;
  try { return typeof achState === 'function' && !!achState().unlocked[ach]; } catch (e) { return false; }
}

/* ---------- days (Clock's zone; cached per timestamp) ---------- */
function _gmParts(ts) {
  let p = _gm.days.get(ts);
  if (!p) { const c = Clock.parts(ts); p = { iso: c.iso, h: c.h }; if (_gm.days.size > 20000) _gm.days.clear(); _gm.days.set(ts, p); }
  return p;
}
function _gmDayOf(ts) { return _gmParts(Number(ts)).iso; }
function _gmWs() { return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.weekStart) || 'Mon'; }
function _gmKindOf(t) {
  if (!t) return 'tasks';
  const tag = Array.isArray(t.tags) && t.tags.length ? String(t.tags[0]).replace(/^#/, '').toLowerCase() : '';
  if (tag) return tag;
  const s = t.stream && typeof STREAMS !== 'undefined' && STREAMS[t.stream] ? STREAMS[t.stream].label : '';
  return s ? String(s).toLowerCase() : 'tasks';
}
function _gmIsBoss(t) { return !!t && !_gmRepeats(t) && Array.isArray(t.subtasks) && t.subtasks.length >= GAME_RULES.bossMin; }

/* ---------- finances (no-spend days, the cheapest week): read once in a while, never stored ---------- */
function _gmFinLoad(force) {
  if (_gm.finBusy || !gameOn()) return;
  if (!force && _gm.finAt && Date.now() - _gm.finAt < 30 * 60000) return;
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.features && APP_CONFIG.features.finance === false) return;
  if (typeof _serverAvailable !== 'undefined' && _serverAvailable === false) return;
  _gm.finBusy = true; _gm.finAt = Date.now();
  fetch('/api/finance', { cache: 'no-store', headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : null))
    .then(a => {
      if (!a || !Array.isArray(a.transactions) || !a.transactions.length) { _gm.fin = null; return; }
      const ex = Array.isArray(a.exclude_from_spending) && a.exclude_from_spending.length ? a.exclude_from_spending.map(String) : ['Income', 'Internal transfers'];
      const spend = {}; let first = '', last = '';
      for (const r of a.transactions) {
        const d = String((r && r.d) || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        if (!first || d < first) first = d;
        if (!last || d > last) last = d;
        const amt = Number(r.a);
        if (!isFinite(amt) || amt >= 0 || ex.includes(String(r.c || ''))) continue;
        spend[d] = (spend[d] || 0) - amt;
      }
      if (!first) { _gm.fin = null; return; }
      const today = todayStr(), lastOk = last < today ? last : Clock.addDays(today, -1);
      let d = first < Clock.addDays(today, -420) ? Clock.addDays(today, -420) : first;
      const quiet = new Set(), ws = _gmWs(), weeks = {};
      for (let i = 0; d <= lastOk && i < 500; i++, d = Clock.addDays(d, 1)) {
        if (!spend[d]) quiet.add(d);
        const w = gameWeekFrom(d, ws);
        if (w >= first && Clock.addDays(w, 6) <= lastOk && w >= Clock.addDays(today, -371)) weeks[w] = (weeks[w] || 0) + (spend[d] || 0);
      }
      _gm.fin = { quiet, first, last: lastOk, spendByWeek: weeks, currency: (a.currency || (APP_CONFIG && APP_CONFIG.currency) || 'GBP') };
      _gm.key = ''; _gmRepaintSoon(); _gmCheckSoon(1200);
      if (typeof achCheckSoon === 'function') achCheckSoon(2500);   // the money achievements
    })
    .catch(() => { /* offline or no finances: the money parts wait */ })
    .finally(() => { _gm.finBusy = false; });
}
function gameMoney(v, cur) {
  try { return new Intl.NumberFormat((APP_CONFIG && APP_CONFIG.locale) || undefined, { style: 'currency', currency: cur || (APP_CONFIG && APP_CONFIG.currency) || 'GBP', maximumFractionDigits: 0 }).format(v); } catch (e) { return String(Math.round(v)); }
}

/* ---------- places (the 'locations' module's locationsFacts(), src/app/90-locations*.js) ---------- */
// locationsFacts() -> {countries: [{cc, country, first (ms), ...}], cities: [{key, city, cc, first (ms), ...}], badges, ...}:
// a place is one entry of cities (a town, or a country's own place when no town is known); each first visit
// is a new-place event (country-new / city-new) that earns a little XP on the day it happened.
function _gmLocNorm(r) {
  if (!r || typeof r !== 'object') return null;
  const cs = Array.isArray(r.countries) ? r.countries : [], ps = Array.isArray(r.cities) ? r.cities : [];
  const day = (ms) => (Number(ms) > 0 ? _gmDayOf(Number(ms)) : '');
  const events = [];
  for (const c of cs) if (c && c.cc && !c.home) events.push({ kind: 'country', id: 'cc:' + c.cc, country: c.cc, day: day(c.first) });
  for (const c of ps) if (c && c.key && c.city) events.push({ kind: 'city', id: 'city:' + c.key, place: c.key, country: c.cc || '', day: day(c.first) });
  return { places: ps.length, cities: ps.filter(c => c && c.city).length, countries: cs.length, badges: Array.isArray(r.badges) ? r.badges : [], events };
}
if (typeof window !== 'undefined') window.addEventListener('opendash:location-badge', () => { _gm.locAt = -1; _gm.rev++; _gm.key = ''; });
function _gmLoc() {
  if (typeof locationsFacts !== 'function') return null;
  const m = Math.floor(Date.now() / 60000);
  if (_gm.locAt === m) return _gm.loc;
  _gm.locAt = m;
  try {
    const r = locationsFacts();
    if (r && typeof r.then === 'function') r.then(v => { _gm.loc = _gmLocNorm(v); _gm.key = ''; }).catch(() => {});
    else _gm.loc = _gmLocNorm(r);
  } catch (e) { /* the locations module is busy or off */ }
  return _gm.loc;
}

/* ---------- the numbers ---------- */
function _gmReviewWeeks(ws) {
  const set = new Set();
  for (const r of (state.reviews || [])) if (r && r.kind === 'week' && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) set.add(gameWeekFrom(r.date, ws));
  for (const r of (state.weeklyReviews || [])) { const d = r && (r.weekOf || (r.ts ? _gmDayOf(r.ts) : '')); if (/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) set.add(gameWeekFrom(d, ws)); }
  return set;
}
function _gmKey() {
  return [todayStr(), state && state._lastSave, state && state._saveCount, _gm.rev, Math.floor(Date.now() / 60000), (state.custom || []).length].join('|');
}
function gameStats() {
  try { const k = _gmKey(); if (_gm.memo && _gm.key === k) return _gm.memo; const s = _gmCompute(); _gm.memo = s; _gm.key = k; return s; }
  catch (e) { console.error('[game]', e); return _gm.memo || null; }
}
function _gmCompute() {
  const g = _gmG(), today = todayStr(), ws = _gmWs(), week = gameWeekFrom(today, ws), weekTo = Clock.addDays(week, 6);
  const tasks = new Map();
  for (const t of (state.custom || [])) if (t && t.id) tasks.set(t.id, t);
  const log = state.completionLog || {};
  const xt = gameXpFromLog({ log, tasks, dayOf: _gmDayOf });
  const sessions = [];
  for (const [id, s] of Object.entries(g.focus)) if (s && typeof s === 'object' && Number(s.ms) > 0) sessions.push({ id, t: s.t, s: Number(s.s) || 0, ms: Number(s.ms), e: Number(s.e) || 0, k: s.k || 'tasks', d: s.d || (s.s ? _gmDayOf(s.s) : '') });
  const xf = gameFocusXp(sessions, _gmDayOf);
  let xa = 0; const awByDay = {};
  const bossDefeated = [];
  for (const a of Object.values(g.awards)) {
    if (!a || typeof a !== 'object') continue;
    const xp = Math.max(0, Number(a.xp) || 0);
    xa += xp; if (a.d && a.k !== 'ach') awByDay[a.d] = (awByDay[a.d] || 0) + xp;   // achievement XP: in the total, never in a day
    if (a.k === 'boss') bossDefeated.push({ t: a.t || '', n: Number(a.n) || 0, d: a.d || '' });
  }
  // reviews and daily notes, straight from the data
  const dataByDay = {}; let xd = 0;
  const addD = (d, v) => { if (/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) { dataByDay[d] = (dataByDay[d] || 0) + v; xd += v; } };
  for (const r of (state.reviews || [])) if (r && (r.kind === 'week' || r.kind === 'evening')) addD(r.date, GAME_DATA_XP[r.kind]);
  for (const r of (state.weeklyReviews || [])) if (r) addD(r.weekOf || (r.ts ? _gmDayOf(r.ts) : ''), GAME_DATA_XP.week);
  for (const [d, v] of Object.entries(state.daynotes || {})) if (v && String(v.md || '').trim().length >= 20) addD(d, GAME_DATA_XP.daynote);
  const xpByDay = Object.assign({}, xt.byDay);
  for (const m of [xf.byDay, awByDay, dataByDay]) for (const [d, v] of Object.entries(m)) xpByDay[d] = (xpByDay[d] || 0) + v;
  const total = xt.total + xf.total + xa + xd;
  const lv = gameLevelOf(total);
  let weekXp = 0; for (const [d, v] of Object.entries(xpByDay)) if (d >= week && d <= weekTo) weekXp += v;

  // completions per day, and the facts the achievements read
  const doneByDay = {}, doneDays = new Set(), streamWeeks = new Map(), people = new Set();
  let p1Done = 0, early = 0, late = 0, weekend = 0, habit = 0, peopleTasks = 0, firstTs = 0;
  for (const e of xt.entries) {
    doneByDay[e.day] = (doneByDay[e.day] || 0) + 1; doneDays.add(e.day);
    if (!firstTs || e.ts < firstTs) firstTs = e.ts;
    const t = tasks.get(e.id);
    const h = _gmParts(e.ts).h;
    if (h < 7) early++; if (h >= 23) late++;
    const dow = new Date(e.day + 'T12:00:00Z').getUTCDay(); if (dow === 0 || dow === 6) weekend++;   // clock-ok: weekday of an ISO day
    if (!t) continue;
    if (t.priority === 'p1' && !e.light) p1Done++;
    if (_gmRepeats(t)) habit++;
    if (Array.isArray(t.people) && t.people.length) { peopleTasks++; for (const p of t.people) people.add(p); }
    if (t.stream) { const w = gameWeekFrom(e.day, ws); if (!streamWeeks.has(w)) streamWeeks.set(w, new Set()); streamWeeks.get(w).add(t.stream); }
  }
  for (const t of tasks.values()) if (Number(t.createdAt) > 0 && (!firstTs || t.createdAt < firstTs)) firstTs = Number(t.createdAt);
  const sortedDays = [...doneDays].sort();
  let comeback = 0;
  for (let i = 1; i < sortedDays.length; i++) if (clockDaysBetween(sortedDays[i - 1], sortedDays[i]) >= 14) { comeback = 1; break; }

  // streaks
  const inboxDays = new Set(Object.keys(g.ticks.inbox || {}));
  if (typeof seenAll === 'function') { try { for (const d of Object.keys(seenAll('inboxZero') || {})) inboxDays.add(d); } catch (e) { /* not booted */ } }
  const focusDays = new Set(Object.keys(g.ticks.focus || {}));
  for (const s of sessions) if (s.ms >= 600000 && s.d) focusDays.add(s.d);
  const revWeeks = _gmReviewWeeks(ws);
  const fin = _gm.fin;
  const streaks = {
    done: gameStreak(doneDays, today),
    inbox: gameStreak(inboxDays, today),
    focus: gameStreak(focusDays, today),
    review: gameStreak(revWeeks, week, { unit: 'week' }),
    nospend: fin ? gameStreak(fin.quiet, fin.last < today ? Clock.addDays(fin.last, 1) : today) : null,
  };

  // focus and estimates
  const focusByDay = {}, perTask = new Map();
  let totalMs = 0, weekMs = 0, longest = 0;
  for (const s of sessions) {
    totalMs += s.ms; focusByDay[s.d] = (focusByDay[s.d] || 0) + s.ms;
    if (s.d >= week && s.d <= weekTo) weekMs += s.ms;
    if (s.ms > longest) longest = s.ms;
    if (s.t) perTask.set(s.t, (perTask.get(s.t) || 0) + s.ms);
  }
  const samples = []; let estimateHits = 0;
  for (const [tid, ms] of perTask) {
    const t = tasks.get(tid);
    if (!t || _gmRepeats(t) || !(Number(t.estimate) > 0) || (state.statuses || {})[tid] !== 'done' || t.resolution === 'wontdo') continue;
    const actual = ms / 60000;
    if (actual < 5) continue;
    samples.push({ kind: _gmKindOf(t), est: Number(t.estimate), actual });
    if (Math.abs(actual / Number(t.estimate) - 1) <= 0.2) estimateHits++;
  }
  const estimates = gameEstimateLearn(samples);

  // bosses: open one-off tasks with 3+ subtasks
  const bossOpen = [];
  for (const t of tasks.values()) if (_gmIsBoss(t) && (state.statuses || {})[t.id] !== 'done') bossOpen.push(t.id);

  const records = gameRecords({ completionsByDay: doneByDay, xpByDay, weekStart: ws, streakBest: streaks.done.best, focusSessions: sessions, bosses: bossDefeated, spendByWeek: fin ? fin.spendByWeek : null });
  const quests = _gmQuests({ g, today, week, weekTo, ws, tasks, entries: xt.entries, sessions, revWeeks, inboxDays, bossDefeated });
  const loc = _gmLoc();
  let questsDone = 0, questPerfect = 0;
  for (const q of Object.values(g.quests)) { const dn = q && q.done && typeof q.done === 'object' ? q.done : {}; questsDone += Object.keys(dn).filter(k => k !== 'all').length; if (dn.all) questPerfect++; }
  let daynotes = 0;
  for (const v of Object.values(state.daynotes || {})) if (v && String(v.md || '').trim()) daynotes++;
  const facts = {
    done: xt.entries.length, bestStreak: streaks.done.best, dayMax: records.dayMost ? records.dayMost.v : 0, p1Done, earlyDone: early, lateDone: late,
    weekendDone: weekend, streamsWeek: Math.max(0, ...[...streamWeeks.values()].map(s => s.size)), comeback, freezesUsed: streaks.done.usedTotal,
    focusSessions: sessions.length, focusHours: Math.floor(totalMs / 3600000), focusLongestMin: Math.floor(longest / 60000), estimateHits,
    bossDefeated: bossDefeated.length, bossBig: Math.max(0, ...bossDefeated.map(b => b.n)), questsDone, questPerfect,
    noSpendBest: streaks.nospend ? streaks.nospend.best : 0, noSpendDays: fin ? fin.quiet.size : 0,
    places: loc ? loc.places : 0, cities: loc ? loc.cities : 0, countries: loc ? loc.countries : 0,
    peopleDistinct: people.size, peopleTasks, habitDone: habit, inboxDays: inboxDays.size, reviews: revWeeks.size, reviewStreak: streaks.review.best,
    daynotes, level: lv.level, xpDay: records.xpDay ? records.xpDay.v : 0, daysWithUs: firstTs ? clockDaysBetween(_gmDayOf(firstTs), today) : 0,
  };
  const next = GAME_ACCENTS.find(a => a.level > lv.level) || null;
  return {
    today, week, weekTo,
    xp: { total, today: xpByDay[today] || 0, week: weekXp, byDay: xpByDay, tasks: xt.total, focus: xf.total, awards: xa, data: xd, entries: xt.entries },
    level: Object.assign({}, lv, { title: gameTitleOf(lv.level), next: gameNextTitle(lv.level), max: Math.max(lv.level, Number(g.seen.levelMax) || 1), nextAccent: next }),
    streaks, quests, records,
    focus: { sessions: sessions.length, totalMs, weekMs, todayMs: focusByDay[today] || 0, byDay: focusByDay, longestMs: longest, list: sessions },
    estimates, bosses: { defeated: bossDefeated, open: bossOpen },
    done: { total: xt.entries.length, byDay: doneByDay }, facts, finance: !!fin, places: !!loc,
    bonus: gameBonusTask(tasks, today),
  };
}
function gameAchFacts() { const s = gameStats(); return s ? s.facts : null; }

/* ---------- quests ---------- */
function _gmQuestCtx(o) {
  const { today, week, ws, tasks, entries, sessions, revWeeks, inboxDays } = o;
  const st = state.statuses || {}, from28 = Clock.addDays(week, -28), prev = Clock.addDays(week, -7);
  const open = [...tasks.values()].filter(t => st[t.id] !== 'done');
  const streams = new Map();
  for (const t of open) if (t.stream && !_gmRepeats(t)) { const s = streams.get(t.stream) || { id: t.stream, label: (STREAMS[t.stream] && STREAMS[t.stream].label) || t.stream, open: 0, done: 0 }; s.open++; streams.set(t.stream, s); }
  let done28 = 0; const days28 = new Set();
  for (const e of entries) if (e.day >= from28 && e.day < week) { done28++; days28.add(e.day); const t = tasks.get(e.id); const s = t && streams.get(t.stream); if (s) s.done++; }
  for (const s of streams.values()) s.avg = s.done / 4;
  let focus28 = 0; for (const s of sessions) if (s.d >= from28 && s.d < week) focus28 += s.ms;
  return {
    from: week, streams: [...streams.values()],
    overdue: open.filter(t => t.dueDate && t.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(t => t.id),
    avgWeekDone: done28 / 4, avgActiveDays: days28.size / 4,
    p1Open: open.filter(t => t.priority === 'p1').length,
    reviewed: revWeeks.has(week) || revWeeks.has(prev), finance: !!_gm.fin, focusAvgMin: focus28 / 60000 / 4,
    bossOpen: open.filter(_gmIsBoss).length, peopleOpen: open.filter(t => Array.isArray(t.people) && t.people.length).length,
    oldOpen: open.filter(t => !_gmRepeats(t) && Number(t.createdAt) > 0 && Date.now() - t.createdAt > 30 * 86400000).length,
    inboxUsed: [...inboxDays].some(d => d >= from28),
  };
}
function _gmQuestProgress(q, o) {
  const { week, weekTo, today, tasks, entries, sessions, revWeeks, inboxDays, bossDefeated } = o;
  const inW = (d) => d >= week && d <= weekTo;
  const wk = entries.filter(e => inW(e.day));
  const st = state.statuses || {};
  switch (q.kind) {
    case 'stream': return wk.filter(e => { const t = tasks.get(e.id); return t && t.stream === q.stream; }).length;
    case 'total': return wk.length;
    case 'days': return new Set(wk.map(e => e.day)).size;
    case 'p1': return wk.filter(e => { const t = tasks.get(e.id); return t && t.priority === 'p1'; }).length;
    case 'overdue': return (q.ids || []).filter(id => { const t = tasks.get(id); return !t || st[id] === 'done' || !t.dueDate || t.dueDate >= today; }).length;
    case 'review': return revWeeks.has(week) || revWeeks.has(Clock.addDays(week, -7)) ? 1 : 0;
    case 'focus': return Math.floor(sessions.filter(s => inW(s.d)).reduce((a, s) => a + s.ms, 0) / 60000);
    case 'boss': return bossDefeated.filter(b => inW(b.d)).length;
    case 'nospend': { const f = _gm.fin; if (!f) return 0; let n = 0; for (let d = week; d <= weekTo && d <= f.last; d = Clock.addDays(d, 1)) if (f.quiet.has(d)) n++; return n; }
    case 'inbox': return [...inboxDays].filter(inW).length;
    case 'people': return wk.filter(e => { const t = tasks.get(e.id); return t && Array.isArray(t.people) && t.people.length; }).length;
    case 'old': return wk.filter(e => { const t = tasks.get(e.id); return t && Number(t.createdAt) > 0 && e.ts - t.createdAt >= 30 * 86400000; }).length;
    default: return 0;
  }
}
function _gmQuests(o) {
  const { g, week, weekTo, today } = o;
  let q = g.quests[week];
  if (!q || !Array.isArray(q.list) || !q.list.length) {
    // Chosen once a week, from the data as it is now (never before the tasks have loaded)
    if (!(state.custom || []).length) return { from: week, to: weekTo, list: [], daysLeft: clockDaysBetween(today, weekTo) + 1 };
    q = { list: gameQuestPick(_gmQuestCtx(o)), done: {} };
    g.quests[week] = q;
    setTimeout(() => { if (typeof saveUI === 'function') saveUI(); }, 0);
  }
  const done = q.done && typeof q.done === 'object' ? q.done : {};
  const list = q.list.map(x => { const n = Math.min(x.target, _gmQuestProgress(x, o)); return Object.assign({}, x, { n, done: done[x.id] || (n >= x.target ? 'now' : '') }); });
  return { from: week, to: weekTo, list, allDone: !!done.all, daysLeft: clockDaysBetween(today, weekTo) + 1 };
}

/* ---------- the bonus task of the day: a neglected task worth double XP today ---------- */
function gameBonusTask(tasks, today) {
  const g = _gmG();
  today = today || todayStr();
  const b = g.seen.bonus;
  if (b && b.d === today) return b.t || '';
  if (!(state.custom || []).length) return '';
  const st = state.statuses || {}, now = Date.now();
  const list = [...(tasks || new Map((state.custom || []).map(t => [t.id, t]))).values()]
    .filter(t => t && t.id && st[t.id] !== 'done' && !_gmRepeats(t) && !gameIsLight(t, now) && !(t.snoozedUntil && t.snoozedUntil > today))
    .sort((a, b2) => {
      const ao = a.dueDate && a.dueDate < today ? 0 : 1, bo = b2.dueDate && b2.dueDate < today ? 0 : 1;
      if (ao !== bo) return ao - bo;
      if (!ao) return a.dueDate.localeCompare(b2.dueDate);
      return (Number(a.createdAt) || 0) - (Number(b2.createdAt) || 0);
    }).slice(0, 6);
  const pick = list.length ? list[_gmHash('bonus|' + today) % list.length].id : '';
  g.seen.bonus = { d: today, t: pick };
  setTimeout(() => { if (typeof saveUI === 'function') saveUI(); }, 0);
  return pick;
}

/* ---------- awards and streak ticks (the public API) ---------- */
function _gmAwardRaw(key, rec) {
  const g = _gmG();
  if (g.awards[key]) return false;
  g.awards[key] = rec;
  _gmSave();
  return true;
}
function gameAward(ev) {
  try {
    if (!ev || typeof ev !== 'object') ev = { kind: String(ev || '') };
    const kind = String(ev.kind || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
    if (!kind || _GM_INTERNAL.has(kind) || _GM_DERIVED.has(kind) || typeof state === 'undefined' || !state) return null;
    const day = /^\d{4}-\d{2}-\d{2}$/.test(String(ev.day || '')) ? ev.day : todayStr();
    const xp = GAME_AWARD_XP[kind] != null ? GAME_AWARD_XP[kind] : Math.max(1, Math.min(25, Math.round(Number(ev.xp) || 5)));
    const key = (kind + ':' + (ev.key != null && ev.key !== '' ? String(ev.key) : day)).slice(0, 120);
    const g = _gmG();
    if (g.awards[key]) return null;
    if (Object.values(g.awards).filter(a => a && a.k === kind && a.d === day).length >= 3) return null;
    g.awards[key] = { d: day, xp, k: kind };
    _gmSave();
    _gmEmit('award', { award: kind, xp, label: ev.label || '' });
    if (!ev.quiet) _gmFloat(`+${xp} XP`, ev.label ? String(ev.label).slice(0, 40) : '');
    _gmCheckSoon();
    return { key, xp };
  } catch (e) { return null; }
}
function gameStreakTick(kind, day) {
  try {
    const k = String(kind || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
    if (!k || typeof state === 'undefined' || !state) return false;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) ? day : todayStr();
    const g = _gmG();
    if (!g.ticks[k] || typeof g.ticks[k] !== 'object') g.ticks[k] = {};
    if (g.ticks[k][d]) return false;
    g.ticks[k][d] = 1;
    _gmSave();
    if (k === 'inbox') gameAward({ kind: 'inbox-zero', quiet: true });
    else if (k === 'focus') gameAward({ kind: 'focus-block', quiet: true });
    _gmCheckSoon();
    return true;
  } catch (e) { return false; }
}
function gameDailyXp(from, to) {
  const s = gameStats(); if (!s) return [];
  const out = [];
  for (let d = from, i = 0; d <= to && i < 800; d = Clock.addDays(d, 1), i++) out.push({ day: d, xp: s.xp.byDay[d] || 0, done: s.done.byDay[d] || 0, focusMin: Math.round((s.focus.byDay[d] || 0) / 60000) });
  return out;
}
function gameFocusSessions(from, to) {
  const s = gameStats(); if (!s) return [];
  return s.focus.list.filter(x => (!from || x.d >= from) && (!to || x.d <= to)).sort((a, b) => a.s - b.s)
    .map(x => ({ id: x.id, task: x.t, start: x.s, ms: x.ms, day: x.d, kind: x.k, estimate: x.e }));
}
if (typeof window !== 'undefined') {
  window.OpenDashGame = Object.freeze({
    stats: () => gameStats(), dailyXp: (a, b) => gameDailyXp(a, b), focusSessions: (a, b) => gameFocusSessions(a, b),
    award: (e) => gameAward(e), streakTick: (k, d) => gameStreakTick(k, d), fun: () => gameFun(), on: () => gameOn(),
  });
}

/* ---------- hooks from the task model ---------- */
/** A task was just closed (78-achievements.js achTaskDone, from toggleDone). */
function gameTaskDone(item) {
  if (!item) return;
  setTimeout(() => { try { _gmTaskDone(item); } catch (e) { console.error('[game]', e); } }, 0);
}
function _gmTaskDone(item) {
  _gm.key = '';
  const s = gameStats(); if (!s) return;
  const today = s.today;
  let entry = null;
  for (let i = s.xp.entries.length - 1, n = 0; i >= 0 && n < 400; i--, n++) if (s.xp.entries[i].id === item.id) { entry = s.xp.entries[i]; break; }
  const xp = entry && entry.day === today ? entry.xp : 0;
  const g = _gmG();
  let bonus = 0;
  const b = g.seen.bonus;
  if (b && b.d === today && b.t === item.id && xp > 0 && _gmAwardRaw('bonus:' + today, { d: today, xp, k: 'bonus', t: item.id })) bonus = xp;
  const t = getItem(item.id);
  if (_gmIsBoss(t)) _gmBossDefeat(t);
  const now = Date.now();
  _gm.combo.n = now - _gm.combo.at < 20 * 60000 ? _gm.combo.n + 1 : 1;
  _gm.combo.at = now;
  if (_gm.combo.n >= 3) {   // 2.18: the longest combo is a record (the achievements' game.comboBest)
    const rc = g.records.combo;
    if (!rc || _gm.combo.n > (Number(rc.v) || 0)) { g.records.combo = { v: _gm.combo.n, d: today, at: today }; _gm.key = ''; if (typeof saveUI === 'function') saveUI(); }
  }
  if (xp + bonus > 0) {
    const sub = [bonus ? 'Bonus task: double XP' : '', _gm.combo.n >= 2 && gameFun() === 'full' ? `Combo x${_gm.combo.n}` : ''].filter(Boolean).join(' · ');
    _gmFloat(`+${xp + bonus} XP`, sub);
  }
  _gmChipPulse();
  _gmCheckSoon(900);
}
/** A subtask was ticked or unticked (20-task-model.js toggleSubtask): the boss bar takes a hit. */
function gameSubtaskToggled(taskId, subs, changed) {
  try {
    const t = getItem(taskId);
    if (!t || _gmRepeats(t) || !Array.isArray(subs) || subs.length < GAME_RULES.bossMin) return;
    const left = subs.filter(x => !x.done).length;
    if (changed && changed.done) {
      _gm.bossHit = { id: taskId, at: Date.now(), from: (left + 1) / subs.length };
      if (left > 0 && gameFun() === 'full') _gmFloat('Hit!', `${left} to go`);
      requestAnimationFrame(() => {
        for (const el of document.querySelectorAll('.gm-boss[data-boss-id="' + (window.CSS && CSS.escape ? CSS.escape(taskId) : taskId) + '"]')) { el.classList.remove('is-hit'); void el.offsetWidth; el.classList.add('is-hit'); }
      });
    }
    if (left === 0) setTimeout(() => { try { _gmBossDefeat(getItem(taskId)); } catch (e) { /* never in the way */ } }, 350);
  } catch (e) { /* never in the way */ }
}
function _gmBossDefeat(t) {
  if (!t) return;
  const n = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
  if (n < GAME_RULES.bossMin) return;
  const today = todayStr(), xp = Math.min(80, 10 + 5 * n);
  if (!_gmAwardRaw('boss:' + t.id, { d: today, xp, k: 'boss', n, t: t.id })) return;
  _gmEmit('boss', { task: t.id, subtasks: n, xp });
  gameMoment({ over: 'Boss defeated', title: effTitle(t), sub: `All ${n} subtasks down. +${xp} XP`, icon: 'crown', big: true, sound: 'boss', at: document.querySelector('.gm-boss[data-boss-id]') });
  _gmCheckSoon(1500);
}

/* ---------- the checks: level ups, quests, records, the week's recap ---------- */
function _gmCheckSoon(ms) { clearTimeout(_gm.checkT); _gm.checkT = setTimeout(() => { try { _gmCheckAll(); } catch (e) { console.error('[game]', e); } }, ms == null ? 1200 : ms); }
function _gmCheckAll() {
  if (typeof state === 'undefined' || !state || !(state.custom || []).length) return;
  _gm.key = '';
  const s = gameStats(); if (!s) return;
  const g = _gmG(), seen = g.seen, lv = s.level.level, today = s.today;
  let dirty = false;
  // first run: take the history as it is, say hello once, celebrate nothing old
  if (seen.level == null) {
    seen.level = lv; seen.levelMax = Math.max(lv, Number(seen.levelMax) || 1); seen.intro = today; seen.weekRecap = s.week;
    for (const [k, r] of Object.entries(s.records)) if (r && k !== 'cheapestWeek') g.records[k] = { v: r.v, d: r.d || '', at: '' };
    _gmSave();
    gameAccentApply();
    _gm.introUntil = Date.now() + 15000;
    if (gameOn()) toast(`New: Freeflo keeps score. From your history you're level ${lv} (${s.level.title}) with ${s.xp.total.toLocaleString()} XP`, { icon: 'trophy', action: { label: 'Have a look', run: () => setView('game') } });
    return;
  }
  // level
  if (lv > seen.level) {
    const from = seen.level;
    seen.level = lv; seen.levelMax = Math.max(lv, Number(seen.levelMax) || 1); dirty = true;
    const un = { accents: [], items: [], title: '' };
    for (let l = from + 1; l <= lv; l++) { const u = gameUnlocksAt(l); un.accents.push(...u.accents); un.items.push(...u.items); if (u.title) un.title = u.title; }
    const bits = [];
    if (un.title) bits.push(`new title: ${un.title}`);
    if (un.accents.length) bits.push(`the ${un.accents.map(a => a.label).join(' and ')} accent${un.accents.length > 1 ? 's' : ''}`);
    for (const r of un.items) { const it = typeof animItem === 'function' ? animItem(r) : null; if (it) bits.push(`the ${it.label} animation`); }
    _gmEmit('level', { level: lv, from });
    gameMoment({ over: 'Level up', title: `Level ${lv}`, sub: (bits.length ? 'Unlocked ' + bits.join(', ') + '.' : gameTitleOf(lv)), icon: 'star', big: true, sound: 'level', art: un.items[0] || '', action: { label: 'See', run: () => setView('game') } });
    gameAccentApply();
  } else if (lv < seen.level) { seen.level = lv; dirty = true; }   // an undo: say nothing (unlocks stay)
  // quests
  const qw = g.quests[s.week];
  if (qw && Array.isArray(qw.list)) {
    if (!qw.done || typeof qw.done !== 'object') qw.done = {};
    for (const q of s.quests.list) {
      if (q.done !== 'now' || qw.done[q.id]) continue;
      qw.done[q.id] = today; dirty = true;
      _gmAwardRaw(`quest:${s.week}:${q.id}`, { d: today, xp: 50, k: 'quest' });
      _gmEmit('quest', { quest: q.id, label: q.label });
      gameMoment({ over: 'Quest complete', title: q.label, sub: '+50 XP', icon: 'flag', sound: 'quest', action: { label: 'Quests', run: () => setView('game') } });
    }
    if (!qw.done.all && qw.list.length >= 3 && qw.list.every(q => qw.done[q.id])) {
      qw.done.all = today; dirty = true;
      _gmAwardRaw(`quest:${s.week}:all`, { d: today, xp: 50, k: 'quest' });
      gameMoment({ over: 'Perfect week', title: 'Every quest done', sub: '+50 bonus XP', icon: 'star', big: true, sound: 'level' });
    }
  }
  // personal records (a moment only for a real best, set today, once a day each)
  const MIN = { dayMost: 5, weekMost: 15, xpDay: 120, streak: 5, focusLongest: 30 * 60000, bossBig: 5 };
  const WORDS = { dayMost: (v) => `${v} tasks in a day`, weekMost: (v) => `${v} tasks in a week`, xpDay: (v) => `${v} XP in a day`, streak: (v) => `${v} days in a row`, focusLongest: (v) => `${Math.round(v / 60000)} minutes of focus in one go`, bossBig: (v) => `a boss with ${v} subtasks` };
  let told = false;
  for (const k of Object.keys(MIN)) {
    const r = s.records[k]; if (!r) continue;
    const old = g.records[k];
    if (old && !(r.v > old.v)) continue;
    const fresh = k === 'streak' ? r.v % 5 === 0 : (r.d === today || (k === 'weekMost' && r.d === s.week));   // a record run: every fifth day, not daily
    g.records[k] = { v: r.v, d: r.d || '', at: today }; dirty = true;
    if (old && fresh && !told && old.v >= MIN[k] && old.at !== today) {
      told = true;
      _gmEmit('record', { record: k, value: r.v, was: old.v });
      if (typeof gameCount === 'function') gameCount('record');   // 2.18: personal records set (92-game-4facts.js)
      gameMoment({ over: 'New personal record', title: WORDS[k](r.v), sub: `Your best was ${k === 'focusLongest' ? Math.round(old.v / 60000) + ' minutes' : old.v.toLocaleString()}.`, icon: 'medal', sound: 'achievement' });
    }
  }
  // places: the locations module's new-place events earn a little XP, quietly
  const loc = _gm.loc;
  if (loc && loc.events && loc.events.length) {
    for (const e of loc.events.slice(-200)) {
      if (!e || typeof e !== 'object') continue;
      const kind = String(e.kind || e.type || '');
      const k = /country/.test(kind) ? 'country-new' : /city|town/.test(kind) ? 'city-new' : /new|first|place|visit/.test(kind) ? 'place-new' : '';
      if (!k) continue;
      const day = /^\d{4}-\d{2}-\d{2}$/.test(String(e.day || e.date || '').slice(0, 10)) ? String(e.day || e.date).slice(0, 10) : today;
      const key = `${k}:${(_gmHash(JSON.stringify([e.id || '', e.place || e.placeId || e.name || '', e.country || '', day])) >>> 0).toString(36)}`;
      if (!g.awards[key]) { g.awards[key] = { d: day, xp: GAME_AWARD_XP[k], k }; dirty = true; }
    }
  }
  // the week's recap, once, on the first open of a new week
  if (seen.weekRecap !== s.week) {
    const lastFrom = Clock.addDays(s.week, -7), lastTo = Clock.addDays(s.week, -1);
    seen.weekRecap = s.week; dirty = true;
    let xp = 0, best = null;
    for (let d = lastFrom; d <= lastTo; d = Clock.addDays(d, 1)) { xp += s.xp.byDay[d] || 0; const n = s.done.byDay[d] || 0; if (n && (!best || n > best.n)) best = { d, n }; }
    const lq = g.quests[lastFrom];
    const qn = lq && lq.done ? Object.keys(lq.done).filter(k => k !== 'all').length : 0;
    if (xp > 0 && gameOn()) {
      const wd = best ? new Date(best.d + 'T12:00:00Z').toLocaleDateString((APP_CONFIG && APP_CONFIG.locale) || undefined, { weekday: 'long', timeZone: 'UTC' }) : '';
      setTimeout(() => toast(`Last week: ${xp.toLocaleString()} XP${lq && lq.list ? ` · ${qn} of ${lq.list.length} quests` : ''}${best ? ` · best day ${wd} (${best.n} done)` : ''}: new quests are up`, { icon: 'calendar-range', action: { label: 'See them', run: () => setView('game') } }), 2500);
    }
  }
  if (dirty) _gmSave();
}

/* ---------- moments: the XP float, the moment card, sounds ---------- */
function _gmFloat(text, sub) {
  if (!gameOn() || !_gmMotion() || document.hidden) return;
  const p = typeof _pointer !== 'undefined' ? _pointer : null;
  if (!p || Date.now() - p.at > 4000) return;
  const el = document.createElement('div');
  el.className = 'gm-float' + (gameFun() === 'full' ? ' is-full' : '');
  el.setAttribute('aria-hidden', 'true');
  el.style.left = Math.max(30, Math.min(window.innerWidth - 30, p.x + 22)) + 'px';
  el.style.top = Math.max(30, p.y - 26) + 'px';
  el.innerHTML = `<b>${esc(text)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
function _gmChipPulse() {
  if (!gameOn() || !_gmMotion()) return;
  requestAnimationFrame(() => { const c = document.querySelector('#tbw-game .gm-chip'); if (c) { c.classList.remove('is-pulse'); void c.offsetWidth; c.classList.add('is-pulse'); } });
}
/**
 * A moment. o = {over, title, sub, icon, art (an animation ref), big, sound, action, at (element for the burst)}.
 * Off: nothing. Subtle: one quiet toast (a big one also plays its art for a moment). Full: a card in the
 * middle of the screen with confetti; several in a row wait their turn.
 */
function gameMoment(o) {
  if (!o || !gameOn()) return;
  if (o.sound) gameSound(o.sound);
  if (gameFun() === 'subtle' || document.hidden) {
    toast(`${o.over ? o.over + ': ' : ''}${o.title}${o.sub ? ' · ' + o.sub : ''}`, { icon: o.icon || 'award', action: o.action || null });
    if (o.big && o.art && typeof animMomentPlay === 'function' && typeof animItem === 'function') { const it = animItem(o.art); if (it) animMomentPlay(it, { center: true, size: 'lg', ms: 1300, cls: 'ach-moment', caption: o.title }); }
    return;
  }
  _gm.queue.push(o);
  if (!_gm.showing) _gmNextMoment();
}
function _gmNextMoment() {
  const o = _gm.queue.shift();
  if (!o) { _gm.showing = false; return; }
  _gm.showing = true;
  const el = document.createElement('div');
  el.className = 'gm-moment' + (o.big ? ' is-big' : '');
  el.setAttribute('role', 'status');
  const it = o.art && typeof animItem === 'function' ? animItem(o.art) : null;
  const art = it && typeof animItemHtml === 'function' ? animItemHtml(it, { size: 'lg', live: _gmMotion(), reduced: !_gmMotion() }) : `<span class="gm-moment-ic">${icon(o.icon || 'award')}</span>`;
  el.innerHTML = `<div class="gm-moment-art">${art}</div><div class="gm-moment-t"><span class="overline">${esc(o.over || '')}</span><b>${esc(o.title || '')}</b>${o.sub ? `<span class="muted">${esc(o.sub)}</span>` : ''}</div>`
    + (o.action ? `<button type="button" class="btn btn-secondary btn-sm gm-moment-go">${esc(o.action.label || 'See')}</button>` : '')
    + `<button type="button" class="btn btn-ghost btn-sm btn-icon gm-moment-x" aria-label="Close">${icon('x')}</button>`;
  let gone = false;
  const close = () => { if (gone) return; gone = true; clearTimeout(tm); document.removeEventListener('keydown', onKey, true); el.classList.add('is-out'); setTimeout(() => { el.remove(); _gmNextMoment(); }, _gmMotion() ? 220 : 0); };
  const onKey = (e) => { if (e.key === 'Escape') { close(); } };
  el.querySelector('.gm-moment-x').onclick = close;
  const go = el.querySelector('.gm-moment-go');
  if (go) go.onclick = () => { close(); try { o.action.run(); } catch (e) { /* the view is gone */ } };
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(el);
  if (_gmMotion() && typeof animBurst === 'function' && typeof animEnabled === 'function' && animEnabled()) requestAnimationFrame(() => animBurst(el.querySelector('.gm-moment-art'), 'celebration'));
  const tm = setTimeout(close, o.big ? 4200 : 3000);
}
/** A short chime made on the spot (no audio files): only when Sounds is on and the Fun level is not Off. */
function gameSound(kind) {
  try {
    const g = _gmG();
    if (!g.prefs.sounds || !gameOn() || document.hidden) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = _gm.ac || (_gm.ac = new AC());
    if (ac.state === 'suspended') ac.resume();
    const notes = { level: [523.25, 659.25, 783.99, 1046.5], boss: [392, 523.25, 659.25, 783.99, 1046.5], quest: [783.99, 1046.5], achievement: [880, 1174.66], milestone: [659.25, 783.99, 1046.5] }[kind] || [880];
    const t0 = ac.currentTime + 0.02;
    notes.forEach((f, i) => {
      const o = ac.createOscillator(), v = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t = t0 + i * 0.09;
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.05, t + 0.015); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(v); v.connect(ac.destination); o.start(t); o.stop(t + 0.34);
    });
  } catch (e) { /* no audio here */ }
}
/**
 * The achievements' unlock moment (78-achievements.js achUnlockMoment hands over to this), by rarity:
 * common and uncommon a quiet toast (Full: a small card), rare a card with confetti, epic and legendary a
 * big card with art and a chime (if sounds are on). Three or more at once: one toast. Unlocks from history
 * never come here: 78-achievements.js shows them once, as one calm summary (achHistorySummary).
 */
function gameAchMoment(ids, o) {
  o = o || {};
  if (!ids || !ids.length || !gameOn()) return;
  const rest = ids.filter(id => !/^level-\d+$/.test(id));   // level unlocks ride on the level-up moment
  if (!rest.length) return;
  _gmEmit('achievement', { ids: rest });
  if (rest.length > 2) {
    const xp = rest.reduce((t, id) => { const d = achDef(id); return t + (d && d.xp ? d.xp : 0); }, 0);
    toast(`${rest.length} achievements earned${xp ? ` (+${xp.toLocaleString()} XP)` : ''}`, { icon: 'award', action: { label: 'See them', run: () => gameOpenWall(rest[0]) } });
    gameSound('achievement');
    return;
  }
  const MILE = /^(done-(100|500|1000|2500|5000)|year-(one|two)|streak-(30|100|365))$/;
  for (const id of rest) {
    const d = achDef(id); if (!d) continue;
    const rank = (typeof ACH_RARITY !== 'undefined' && ACH_RARITY[d.rarity] ? ACH_RARITY[d.rarity].rank : 1);
    const rw = d.reward && typeof _achRewardLabel === 'function' ? _achRewardLabel(d) : '';
    const un = d.unlock && typeof achRewardLabel === 'function' ? achRewardLabel(d.unlock) : '';
    const big = MILE.test(id) || rank >= 4;
    const r = typeof ACH_RARITY !== 'undefined' && ACH_RARITY[d.rarity] ? ACH_RARITY[d.rarity] : null;
    const over = big ? (rank >= 5 ? 'Legendary achievement' : MILE.test(id) ? 'Milestone' : 'Epic achievement') : (rank === 3 ? 'Rare achievement' : 'Achievement');
    const sub = [rw ? `Unlocked ${rw}.` : un ? `Unlocked: ${un}.` : d.hint, r && d.xp ? `+${d.xp} XP` : ''].filter(Boolean).join(' ');
    gameMoment({ over, title: d.label, sub, icon: d.icon || 'award', art: d.reward && d.reward.item ? d.reward.item : '', big, quiet: rank <= 2, sound: big ? 'milestone' : rank >= 3 ? 'achievement' : '', action: { label: 'See', run: () => gameOpenWall(id) } });
  }
}
/** The achievements wall (Life > Achievements; the view 'game:wall'), at one achievement when given. */
function gameOpenWall(id) {
  if (typeof gameWallOpen === 'function') { gameWallOpen(id); return; }   // the Achievements page (92-game-5wall.js)
  setView('game:wall');   // Life > Achievements (2.18)
  requestAnimationFrame(() => setTimeout(() => {
    const el = (id && document.querySelector(`.gm-ach[data-ach="${id}"]`)) || document.getElementById('gm-wall');
    if (el) { el.scrollIntoView({ block: id ? 'center' : 'start', behavior: _gmMotion() ? 'smooth' : 'auto' }); if (id) { el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 1600); } }
  }, 80));
}

/* ---------- repainting (the chip, the timer, an open Game page) ---------- */
function _gmRepaintSoon() {
  if (_gm.paintQ) return;
  _gm.paintQ = requestAnimationFrame(() => {
    _gm.paintQ = 0;
    try {
      if (typeof _gmChipRender === 'function') { const el = document.getElementById('tbw-game'); if (el) el.hidden = _gmChipRender(el) === false; }
      if (typeof gameFocusPaint === 'function') gameFocusPaint();
      if (state.view === 'game' && typeof render === 'function') render();
    } catch (e) { console.error('[game]', e); }
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => {
    try { gameAccentApply(); } catch (e) { /* not booted */ }
    setTimeout(() => _gmCheckSoon(0), 3500);
    setTimeout(() => _gmFinLoad(false), 20000);
    setInterval(() => { if (!document.hidden) { _gmCheckSoon(0); _gmFinLoad(false); } }, 5 * 60000);
  }, { once: true });
}

/* ============================================================
   ACHIEVEMENTS, the facts (2.18 B0; docs/dev/ACHIEVEMENTS_500.md 1.7, 2.1). PURE:
   no DOM, no page globals at load. The page (92-game-4facts.js gameFacts) and the
   dev tool (tools/ach-dayone.mjs) call the same code on the same data, so a
   number here is the number on every computer.

   Facts are numbers (n), series are {key: number} (s: d.* per ISO day, w.* per
   week start, c.* per month start 'YYYY-MM-01'), marks are {kind: {key: day}} (m).
   Everything is computed from the data each time (BACK-FILL is free: history
   counts the day the update arrives); only moments the data cannot show are
   kept, as counters in state.game (92-game-4facts.js):
     ticks   state.game.ticks[kind][day] = 1      -> series d.<kind>, w.<kind> (days that week), fact t.<kind> (days)
     counts  state.game.counts[kind]['YYYY-MM|slot'] = n   -> fact c.<kind> (total), series c.<kind> (per month)
     marks   state.game.marks[kind][key] = day    -> m[kind]; fact m.<kind> (keys)
   SEEDS ARE VIRTUAL: a source unions the history into a series when it is
   computed (d.open = the open ticks + every day the brief, the opening or Home's
   read-along was seen + every day something was done, reviewed or written), so
   nothing is written to back-fill and two computers never disagree.

     achFactsCompute(input) -> {n, s, m, errors: [sourceId]}
        input = {data: the state (or a data folder's dashboard-state.json), today: 'YYYY-MM-DD',
                 weekStart: 'Mon'|'Sun'|'Sat', birthday: 'MM-DD'|'', partsOf(ms) -> {iso, h, min, dow}
                 (the page: Clock.parts; the tool: the config's zone), pre?: {xt, sessions} (the page
                 reuses gameStats' pass), extra?: [provider results] merged last (achFactsMerge)}
     registerAchFactSource(id, fn, {order}) a DATA source: fn(ctx, out) reads ctx and writes out. Packs
        add theirs at load (71-ach-pack-*.js), pure like this file. ctx = {data, today, ws, birthday,
        part(ms), day(ms), tasks: Map, statuses, isDone(id), repeats(t), entries: [{id, ts, day, xp, light}]
        (one-off tasks once, repeating tasks once a day: exactly like XP), sessions: [{id, t, s, ms, e, k, d}],
        g: state.game with every sub-object, seen: state.seen, weekOf(iso), add(iso, n), between(a, b),
        doneDays: Set (after 'core')}. out = {n, s, set(f, v), max(f, v), inc(f, v=1), add(series, key, v=1),
        put(series, key, v), peak(series, key, v), series(name)}.
     achFactsMerge(raw, extra)              device providers in: numbers keep the larger, series per key the
                                            larger, marks are added
     achFactsView(raw, {today, weekStart, birthday, unlocked, hist}) -> F for achEval (71-ach-0dsl.js)
   Rules: ids and counts only, never text, names, places or amounts (a series key is a day, a week
   or a month; a mark key is an id from the app's own tables).
   ============================================================ */
const _ACH_SRC = [];
function registerAchFactSource(id, fn, o) {
  if (!id || typeof fn !== 'function') return false;
  const rec = { id: String(id), fn, order: o && isFinite(o.order) ? Number(o.order) : 50 };
  const i = _ACH_SRC.findIndex(s => s.id === rec.id);
  if (i >= 0) _ACH_SRC[i] = rec; else _ACH_SRC.push(rec);
  _ACH_SRC.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
  return true;
}
function achFactSources() { return _ACH_SRC.map(s => s.id); }
function _achOut() {
  const n = Object.create(null), s = Object.create(null);
  const ser = (k) => s[k] || (s[k] = Object.create(null));
  return {
    n, s, series: ser,
    set(k, v) { n[k] = Number(v) || 0; },
    max(k, v) { v = Number(v) || 0; if (!(k in n) || v > n[k]) n[k] = v; },
    inc(k, v) { n[k] = (n[k] || 0) + (v == null ? 1 : Number(v) || 0); },
    add(k, key, v) { if (!key) return; const o = ser(k); o[key] = (o[key] || 0) + (v == null ? 1 : Number(v) || 0); },
    put(k, key, v) { if (!key) return; ser(k)[key] = v == null ? 1 : Number(v) || 0; },
    peak(k, key, v) { if (!key) return; const o = ser(k); v = Number(v) || 0; if (!(key in o) || v > o[key]) o[key] = v; },
  };
}
function _achObj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
const _ACH_ISO = /^\d{4}-\d{2}-\d{2}$/;
function _achCtx(input) {
  const data = _achObj(input.data);
  const today = _ACH_ISO.test(String(input.today || '')) ? input.today : new Date().toISOString().slice(0, 10);   // clock-ok: pure fallback; callers pass their day
  const ws = input.weekStart === 'Sun' || input.weekStart === 'Sat' ? input.weekStart : 'Mon';
  const partsOf = typeof input.partsOf === 'function' ? input.partsOf
    : (ms) => { const d = new Date(ms); return { iso: d.toISOString().slice(0, 10), h: d.getUTCHours(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), dow: d.getUTCDay() }; };   // clock-ok: Node fallback (UTC)
  const cache = new Map();
  const part = (ms) => { ms = Number(ms); let p = cache.get(ms); if (!p) { p = partsOf(ms) || {}; if (cache.size > 60000) cache.clear(); cache.set(ms, p); } return p; };
  const day = (ms) => part(ms).iso || '';
  const tasks = new Map();
  for (const t of Array.isArray(data.custom) ? data.custom : []) if (t && t.id) tasks.set(t.id, t);
  const statuses = _achObj(data.statuses);
  const g0 = _achObj(data.game), g = {};
  for (const k of ['prefs', 'awards', 'ticks', 'counts', 'marks', 'focus', 'quests', 'records', 'seen']) g[k] = _achObj(g0[k]);
  const pre = _achObj(input.pre);
  let xt = pre.xt && Array.isArray(pre.xt.entries) ? pre.xt : null;
  if (xt && !xt.byDay) { const b = {}; for (const e of xt.entries) if (e && e.day) b[e.day] = (b[e.day] || 0) + (Number(e.xp) || 0); xt = Object.assign({}, xt, { byDay: b }); }
  if (!xt) {
    if (typeof gameXpFromLog === 'function') xt = gameXpFromLog({ log: _achObj(data.completionLog), tasks, dayOf: day });
    else {
      const entries = [];
      for (const [id, arr] of Object.entries(_achObj(data.completionLog))) if (Array.isArray(arr)) for (const v of arr) { const ts = Number(v); if (ts > 0) entries.push({ id, ts, day: day(ts), xp: 0, light: false }); }
      entries.sort((a, b) => a.ts - b.ts);
      xt = { total: 0, byDay: {}, entries };
    }
  }
  let sessions = Array.isArray(pre.sessions) ? pre.sessions : null;
  if (!sessions) {
    sessions = [];
    for (const [id, s] of Object.entries(g.focus)) if (s && typeof s === 'object' && Number(s.ms) > 0) sessions.push({ id, t: s.t, s: Number(s.s) || 0, ms: Number(s.ms), e: Number(s.e) || 0, k: s.k || 'tasks', d: s.d || (s.s ? day(s.s) : '') });
  }
  return {
    data, today, ws, birthday: String(input.birthday || ''), part, day, tasks, statuses, xt, entries: xt.entries || [], sessions, g, seen: _achObj(data.seen),
    isDone: (id) => statuses[id] === 'done', repeats: (t) => !!(t && t.recurrence && t.recurrence !== 'none'),
    weekOf: (iso) => achWeekOf(iso, ws), add: achDayAdd, between: achDaysBetween, doneDays: new Set(),
  };
}

/* ---------- the counters (ticks, counts, marks): first, so DATA sources can union into them ---------- */
registerAchFactSource('counters', (c, o) => {
  for (const [kind, days] of Object.entries(c.g.ticks)) {
    let n = 0;
    for (const d of Object.keys(_achObj(days))) { if (!_ACH_ISO.test(d)) continue; n++; o.put('d.' + kind, d, 1); o.add('w.' + kind, c.weekOf(d)); }
    o.set('t.' + kind, n);
  }
  for (const [kind, buckets] of Object.entries(c.g.counts)) {
    let n = 0;
    for (const [k, v] of Object.entries(_achObj(buckets))) {
      const x = Math.max(0, Number(v) || 0); if (!x) continue;
      n += x;
      const m = /^(\d{4})(?:-(\d{2}))?\|/.exec(k);
      if (m) o.add('c.' + kind, `${m[1]}-${m[2] || '01'}-01`, x);
    }
    o.set('c.' + kind, n);
  }
  for (const [kind, keys] of Object.entries(c.g.marks)) o.set('m.' + kind, Object.keys(_achObj(keys)).length);
}, { order: 5 });

/* ---------- the core: the 78's facts (as 92-game-1core.js _gmCompute counts them) and the common series ---------- */
const _ACH_DATA_XP = { week: 40, evening: 10, daynote: 5 };   // as 92-game-1core.js GAME_DATA_XP
registerAchFactSource('core', (c, o) => {
  const today = c.today, data = c.data;
  // completions
  const doneDays = c.doneDays, streamWeeks = new Map(), dayStreams = new Map(), people = new Set(), byDay = {};
  let p1 = 0, early = 0, late = 0, weekend = 0, habit = 0, peopleTasks = 0, firstTs = 0;
  for (const e of c.entries) {
    o.add('d.done', e.day); doneDays.add(e.day); byDay[e.day] = (byDay[e.day] || 0) + 1;
    if (!firstTs || e.ts < firstTs) firstTs = e.ts;
    const h = Number(c.part(e.ts).h) || 0;
    if (h < 7) early++; if (h >= 23) late++;
    const dow = achDow(e.day); if (dow === 0 || dow === 6) weekend++;
    const t = c.tasks.get(e.id);
    if (!t) continue;
    if (t.priority === 'p1' && !e.light) { p1++; o.add('d.p1Done', e.day); }
    if (c.repeats(t)) habit++;
    if (Array.isArray(t.people) && t.people.length) { peopleTasks++; for (const x of t.people) people.add(x); }
    if (t.stream) {
      const w = c.weekOf(e.day);
      if (!streamWeeks.has(w)) streamWeeks.set(w, new Set()); streamWeeks.get(w).add(t.stream);
      if (!dayStreams.has(e.day)) dayStreams.set(e.day, new Set()); dayStreams.get(e.day).add(t.stream);
    }
  }
  for (const d of doneDays) { o.put('d.doneAny', d, 1); o.add('w.activeDays', c.weekOf(d)); }
  for (const [d, set] of dayStreams) o.put('d.streams', d, set.size);
  for (const t of c.tasks.values()) if (Number(t.createdAt) > 0 && (!firstTs || t.createdAt < firstTs)) firstTs = Number(t.createdAt);
  const sorted = [...doneDays].sort();
  let comeback = 0;
  for (let i = 1; i < sorted.length; i++) if (achDaysBetween(sorted[i - 1], sorted[i]) >= 14) { comeback = 1; break; }
  const streak = typeof gameStreak === 'function' ? gameStreak(doneDays, today) : null;
  let dayMax = 0; for (const v of Object.values(byDay)) if (v > dayMax) dayMax = v;
  o.set('done', c.entries.length); o.set('dayMax', dayMax); o.set('p1Done', p1); o.set('earlyDone', early); o.set('lateDone', late);
  o.set('weekendDone', weekend); o.set('streamsWeek', Math.max(0, ...[...streamWeeks.values()].map(s => s.size)));
  o.set('comeback', comeback); o.set('habitDone', habit); o.set('peopleDistinct', people.size); o.set('peopleTasks', peopleTasks);
  o.set('bestStreak', Math.max(streak ? streak.best : 0, typeof recapLongestRun === 'function' ? recapLongestRun(doneDays) : 0));
  o.set('freezesUsed', streak ? streak.usedTotal || 0 : 0);
  o.set('daysWithUs', firstTs ? Math.max(0, achDaysBetween(c.day(firstTs), today)) : 0);
  // focus and estimates
  const perTask = new Map(), focusDay = {};
  let totalMs = 0, longest = 0;
  for (const s of c.sessions) {
    totalMs += s.ms; if (s.ms > longest) longest = s.ms;
    if (s.d) focusDay[s.d] = (focusDay[s.d] || 0) + s.ms;
    if (s.t) perTask.set(s.t, (perTask.get(s.t) || 0) + s.ms);
  }
  for (const [d, ms] of Object.entries(focusDay)) { const m = Math.floor(ms / 60000); if (m > 0) o.put('d.focusMin', d, m); }
  let hits = 0;
  for (const [tid, ms] of perTask) {
    const t = c.tasks.get(tid);
    if (!t || c.repeats(t) || !(Number(t.estimate) > 0) || !c.isDone(tid) || t.resolution === 'wontdo') continue;
    const actual = ms / 60000;
    if (actual >= 5 && Math.abs(actual / Number(t.estimate) - 1) <= 0.2) hits++;
  }
  o.set('focusSessions', c.sessions.length); o.set('focusHours', Math.floor(totalMs / 3600000)); o.set('focusLongestMin', Math.floor(longest / 60000)); o.set('estimateHits', hits);
  // awards: bosses, and XP (achievement XP counts in the total, never in a day: no record or day goal can be bought with it)
  const xpDay = Object.assign({}, c.xt.byDay || {});
  let xpAwards = 0, bosses = 0, bossBig = 0;
  for (const a of Object.values(c.g.awards)) {
    if (!a || typeof a !== 'object') continue;
    const xp = Math.max(0, Number(a.xp) || 0);
    xpAwards += xp;
    if (a.k !== 'ach' && a.d && _ACH_ISO.test(a.d)) xpDay[a.d] = (xpDay[a.d] || 0) + xp;
    if (a.k === 'boss') { bosses++; bossBig = Math.max(bossBig, Number(a.n) || 0); if (a.d) o.add('d.boss', a.d); }
  }
  o.set('bossDefeated', bosses); o.set('bossBig', bossBig);
  let focusXp = 0;
  if (typeof gameFocusXp === 'function') { const fx = gameFocusXp(c.sessions, c.day); focusXp = fx.total; for (const [d, v] of Object.entries(fx.byDay)) xpDay[d] = (xpDay[d] || 0) + v; }
  // quests
  let qDone = 0, qPerfect = 0;
  for (const q of Object.values(c.g.quests)) { const dn = _achObj(q && q.done); qDone += Object.keys(dn).filter(k => k !== 'all').length; if (dn.all) qPerfect++; }
  o.set('questsDone', qDone); o.set('questPerfect', qPerfect);
  o.set('game.comboBest', Number(_achObj(c.g.records.combo).v) || 0);   // the longest combo (92-game-1core.js records.combo)
  // inbox zero: the ticks and the celebration's seen days
  const inbox = new Set(Object.keys(_achObj(c.g.ticks.inbox)).filter(d => _ACH_ISO.test(d)));
  for (const d of Object.keys(_achObj(c.seen.inboxZero))) if (_ACH_ISO.test(d)) inbox.add(d);
  for (const d of inbox) o.put('d.inboxZero', d, 1);
  o.set('inboxDays', inbox.size);
  // reviews and daily notes (and their XP, straight from the data)
  const revWeeks = new Set(); let xpData = 0;
  const addXp = (d, v) => { if (_ACH_ISO.test(String(d || ''))) { xpDay[d] = (xpDay[d] || 0) + v; xpData += v; } };
  for (const r of Array.isArray(data.reviews) ? data.reviews : []) {
    if (!r || !_ACH_ISO.test(String(r.date || ''))) continue;
    if (r.kind === 'week') {
      revWeeks.add(c.weekOf(r.date)); addXp(r.date, _ACH_DATA_XP.week);
      const at = Date.parse(r.savedAt || ''); o.add('d.weekReview', isFinite(at) ? c.day(at) : r.date);
    } else if (r.kind === 'evening') { addXp(r.date, _ACH_DATA_XP.evening); o.add('d.evening', r.date); }
  }
  for (const r of Array.isArray(data.weeklyReviews) ? data.weeklyReviews : []) {
    const d = r && (r.weekOf || (r.ts ? c.day(r.ts) : ''));
    if (_ACH_ISO.test(String(d || ''))) { revWeeks.add(c.weekOf(d)); addXp(d, _ACH_DATA_XP.week); }
  }
  for (const w of revWeeks) o.put('w.review', w, 1);
  const rs = typeof gameStreak === 'function' ? gameStreak(revWeeks, c.weekOf(today), { unit: 'week' }) : null;
  o.set('reviews', revWeeks.size); o.set('reviewStreak', rs ? rs.best : 0);
  let notes = 0;
  for (const [d, v] of Object.entries(_achObj(data.daynotes))) {
    const md = String((v && v.md) || '').trim();
    if (!md) continue;
    notes++; o.put('d.daynote', d, 1);
    if (md.length >= 20) addXp(d, _ACH_DATA_XP.daynote);
  }
  o.set('daynotes', notes);
  for (const [d, v] of Object.entries(xpDay)) if (_ACH_ISO.test(d) && v > 0) o.put('d.xp', d, v);
  let xpBest = 0; for (const v of Object.values(xpDay)) if (v > xpBest) xpBest = v;
  o.set('xpDay', xpBest);
  const total = (Number(c.xt.total) || 0) + focusXp + xpAwards + xpData;
  o.set('xpTotal', total);
  o.set('level', typeof gameLevelOf === 'function' ? gameLevelOf(total).level : 1);
  // the noted moments (78-achievements.js achNote)
  const noted = _achObj(_achObj(data.achievements).notes);
  for (const k of ['focus', 'boss', 'under-budget', 'inbox-zero']) o.set(k, noted[k] ? 1 : 0);
  // d.open: the open ticks, plus every day the app shows it was open (a virtual seed)
  for (const grp of ['brief', 'opening', 'homeRead']) for (const d of Object.keys(_achObj(c.seen[grp]))) if (_ACH_ISO.test(d)) o.put('d.open', d, 1);
  for (const d of doneDays) o.put('d.open', d, 1);
  for (const k of ['d.evening', 'd.weekReview', 'd.daynote']) for (const d of Object.keys(o.s[k] || {})) o.put('d.open', d, 1);
  o.set('t.open', Object.keys(o.s['d.open'] || {}).length);
}, { order: 10 });

/* ---------- merging and the view ---------- */
/** Device providers' results in: {n, s, m} or a flat {fact: number}. Numbers keep the larger, series per key. */
function achFactsMerge(raw, extra) {
  raw = raw || { n: {}, s: {}, m: {} };
  raw.n = raw.n || {}; raw.s = raw.s || {}; raw.m = raw.m || {};
  for (const x of Array.isArray(extra) ? extra : [extra]) {
    if (!x || typeof x !== 'object') continue;
    const flat = !('n' in x) && !('s' in x) && !('m' in x);
    const nn = flat ? x : _achObj(x.n);
    for (const [k, v] of Object.entries(nn)) { const n = Number(v); if (isFinite(n) && (!(k in raw.n) || n > raw.n[k])) raw.n[k] = n; }
    if (flat) continue;
    for (const [k, ser] of Object.entries(_achObj(x.s))) {
      const into = raw.s[k] || (raw.s[k] = {});
      for (const [key, v] of Object.entries(_achObj(ser))) { const n = Number(v); if (isFinite(n) && (!(key in into) || n > into[key])) into[key] = n; }
    }
    for (const [k, keys] of Object.entries(_achObj(x.m))) {
      const into = raw.m[k] || (raw.m[k] = {});
      for (const [key, d] of Object.entries(_achObj(keys))) if (!into[key] || String(d) < String(into[key])) into[key] = d;
    }
  }
  return raw;
}
/** The data in, every source run once. -> {n, s, m, errors} */
function achFactsCompute(input) {
  input = input || {};
  const c = _achCtx(input), o = _achOut(), errors = [];
  for (const src of _ACH_SRC) {
    try { src.fn(c, o); } catch (e) { errors.push(src.id); try { console.warn('[ach] fact source ' + src.id + ' failed', e); } catch (x) { /* no console */ } }
  }
  const m = {};
  for (const [k, keys] of Object.entries(c.g.marks)) m[k] = Object.assign({}, _achObj(keys));
  const raw = { n: o.n, s: o.s, m, errors };
  if (input.extra) achFactsMerge(raw, input.extra);
  return raw;
}
/** The facts as achEval reads them. o = {today, weekStart, birthday, unlocked, hist}. */
function achFactsView(raw, o) {
  raw = raw || {}; o = o || {};
  const n = _achObj(raw.n), s = _achObj(raw.s), m = _achObj(raw.m);
  return {
    n: (k) => Number(n[k]) || 0, s: (k) => s[k] || null, m: (k) => m[k] || null,
    ctx: { today: o.today || '', weekStart: o.weekStart || 'Mon', birthday: o.birthday || '' },
    unlocked: o.unlocked || {}, hist: o.hist || {}, raw,
  };
}

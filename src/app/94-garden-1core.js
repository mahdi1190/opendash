/* ============================================================
   GARDEN, the engine (2.18, agent 'garden-engine'): state, growth, care, the
   economy, actions with Undo, the 2.16 migration, snapshots, the tick.
   Catalogue and art contract: 94-garden-0catalog.js; design: docs/dev/GARDEN.md.

   state.garden (a UI key: saveUI, never an app undo step, the garden has its own
   Undo; synced: lib/sync/manifest.mjs and model.mjs '── garden ──'). Everything
   that can be is computed from the data on each device (coins from finished
   tasks, focus and streaks; every plant's stage from time and care); only choices
   and events are kept, each in its own map entry, so two devices add up.

   PUBLIC API (safe to call at any time; none of them throws):
     gardenEnsure()            set the garden up once (the 2.16 migration); true when it exists
     gardenModel(now?)         everything the renderer and the page need, memoised by the minute:
                               {now, today, season, tod, events, rain, level, areas, plants, decor, water,
                                wallet, visitors, blooms, occ, ...}
     gardenWallet()            {coins, xp, level, items: {itemId: n}, n: {planted, harvests, ...}}
     gardenWaterInfo()         {cap, left, used, raining}
     gardenSnapshot()          what a friend may see (docs/dev/GARDEN.md section 7)
     gardenDailyTasks() / gardenWeekQuests()   [{def, label, n, have, done, claimed}]
     gardenFacts()             the ribbons' facts
     actions (each returns {ok, msg} and offers Undo through a toast):
       gardenPlantAt(plantId, x, y, o), gardenWater(uid), gardenWaterAll(), gardenFeed(uid),
       gardenPrune(uid), gardenHarvest(uid), gardenHarvestAll(), gardenDig(uid), gardenMovePlant(uid, x, y),
       gardenPlaceDecor(decorId, x, y, r), gardenMoveDecor(uid, x, y), gardenRotateDecor(uid),
       gardenRemoveDecor(uid), gardenBuy(item, n), gardenSell(item, n), gardenMakeBouquet(stems),
       gardenCollect(uid) (compost, hive, wishing well), gardenUndo()
     gardenTick()              grants, ribbons, daily tasks, quests, discoveries, tidying (debounced, after
                               actions and paints); moments respect the Fun level
     document event 'opendash:garden' {kind, ...}
   Rules: calm (nothing dies, nothing is taken away), Undo not questions, the Fun level gates moments,
   nothing here calls Claude or reads friends' data.
   ============================================================ */
const _GD_H = 3600000, _GD_DAY = 86400000;
const _gd = { rev: 0, obj: null, memo: null, memoKey: '', wallet: null, walletKey: '', act: null, actKey: '', undo: [],
  tickT: 0, tickBusy: false, paintQ: 0, seenVisit: '', lastToastAt: 0 };

/* ---------- state ---------- */
const _GD_MAPS = ['plants', 'decor', 'led', 'bank', 'wl', 'vd', 'disc', 'rib', 'dt', 'wq', 'gr', 'seen', 'prefs',
  'fl', 'bl', 'fd',   // 2.22: the fish log, the bug book, per-day fishing (94-garden-fish-2core.js)
  'gl', 'gq', 'gv', 'glt'];  // what visitors did here, what is still to post to them, what you planted in friends' gardens, what they touched since the visit's copy (`glc`) (94-garden-live-*.js)
function _gdG() {
  if (typeof state === 'undefined' || !state) { const z = { v: 1 }; for (const k of _GD_MAPS) z[k] = {}; return z; }
  if (!state.garden || typeof state.garden !== 'object' || Array.isArray(state.garden)) state.garden = { v: 1 };
  const g = state.garden;
  // a newer copy from another tab or device replaces the object: forget what was worked out from the old one
  if (_gd.obj !== g) { _gd.obj = g; _gd.rev++; _gd.memoKey = ''; _gd.walletKey = ''; }
  for (const k of _GD_MAPS) if (!g[k] || typeof g[k] !== 'object' || Array.isArray(g[k])) g[k] = {};
  if (!g.v) g.v = 1;
  return g;
}
function _gdNow() { return typeof Clock !== 'undefined' ? Clock.now() : Date.now(); }   // clock-ok: Node fallback
function _gdToday() { return typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10); }   // clock-ok: fallback
function _gdDayOf(ms) { return typeof Clock !== 'undefined' ? Clock.parts(ms).iso : new Date(ms).toISOString().slice(0, 10); }   // clock-ok: fallback
function _gdAddDays(iso, n) { return typeof Clock !== 'undefined' ? Clock.addDays(iso, n) : new Date(Date.parse(iso + 'T12:00:00Z') + n * _GD_DAY).toISOString().slice(0, 10); }   // clock-ok: UTC maths
function _gdDayMs(iso, min) { try { return Clock.at(iso, min || 0); } catch (e) { return Date.parse(iso + 'T00:00:00') + (min || 0) * 60000; } }
function _gdUid(p) { return (p || 'g') + Math.floor(_gdNow()).toString(36).slice(-6) + Math.floor(Math.random() * 1679616).toString(36).padStart(4, '0'); }
function _gdWeekFrom(iso) {
  if (typeof gameWeekFrom === 'function') { try { return gameWeekFrom(iso, typeof _gmWs === 'function' ? _gmWs() : 1); } catch (e) { /* below */ } }
  const d = new Date(iso + 'T12:00:00Z'), dow = (d.getUTCDay() + 6) % 7;   // clock-ok: ISO weekday maths
  return _gdAddDays(iso, -dow);
}
function _gdEmit(kind, detail) { try { document.dispatchEvent(new CustomEvent('opendash:garden', { detail: Object.assign({ kind }, detail || {}) })); } catch (e) { /* old browser */ } }
function gardenFun() { try { return typeof memFunLevel === 'function' ? memFunLevel() : 'subtle'; } catch (e) { return 'subtle'; } }
function gardenMotionOn() { return !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()) && gardenFun() !== 'off'; }
function _gdSouth() { try { return gardenSouthern(typeof Clock !== 'undefined' ? Clock.zone() : ''); } catch (e) { return false; } }

/** Save, forget the memos, repaint what shows the garden. */
function _gdSave() {
  _gd.rev++; _gd.memoKey = ''; _gd.walletKey = '';
  if (typeof saveUI === 'function') saveUI();
  gardenRepaintSoon();
}
function gardenRepaintSoon() {
  if (_gd.paintQ) return;
  _gd.paintQ = requestAnimationFrame(() => {
    _gd.paintQ = 0;
    try { if (typeof _gdpRepaint === 'function') _gdpRepaint(); } catch (e) { console.error('[garden]', e); }
    try { if (typeof _hgdRepaint === 'function') _hgdRepaint(); } catch (e) { console.error('[garden]', e); }
  });
}

/* ---------- the data: tasks and focus per day ---------- */
function _gdActKey() {
  const log = (typeof state !== 'undefined' && state && state.completionLog) || {};
  let n = 0, mx = 0;
  for (const arr of Object.values(log)) if (Array.isArray(arr)) { n += arr.length; for (const t of arr) if (t > mx) mx = t; }
  const gr = typeof _gm !== 'undefined' && _gm ? _gm.rev : 0;
  return n + ':' + mx + ':' + gr + ':' + _gdToday();
}
/** {days: Map(day -> {n, ts (sorted), focusMin}), sorted days, cum: Map(day -> boost so far), total} */
function _gdAct() {
  const k = _gdActKey();
  if (_gd.act && _gd.actKey === k) return _gd.act;
  const days = new Map();
  const log = (typeof state !== 'undefined' && state && state.completionLog) || {};
  let total = 0;
  for (const arr of Object.values(log)) {
    if (!Array.isArray(arr)) continue;
    for (const t of arr) {
      const ts = Number(t); if (!isFinite(ts) || ts <= 0) continue;
      total++;
      const d = _gdDayOf(ts);
      let r = days.get(d); if (!r) days.set(d, r = { n: 0, ts: [], focusMin: 0 });
      r.n++; r.ts.push(ts);
    }
  }
  let fb = null;
  try { const s = typeof gameStats === 'function' ? gameStats() : null; fb = s && s.focus && s.focus.byDay; } catch (e) { fb = null; }
  if (fb) for (const [d, ms] of Object.entries(fb)) { let r = days.get(d); if (!r) days.set(d, r = { n: 0, ts: [], focusMin: 0 }); r.focusMin = Math.round((Number(ms) || 0) / 60000); }
  const sorted = [...days.keys()].sort();
  const cum = new Map(), cnt = new Map(); let acc = 0, done = 0;
  for (const d of sorted) { const r = days.get(d); r.ts.sort((a, b) => a - b); acc += _gdBoostOf(r.n, r.focusMin); cum.set(d, acc); done += r.n; cnt.set(d, done); }
  _gd.act = { days, sorted, cum, cnt, total };
  _gd.actKey = k;
  return _gd.act;
}
function _gdBoostOf(n, focusMin) { return Math.min(8, n) * 1.5 + Math.min(6, Math.floor((focusMin || 0) / 25)); }
/** The boost total up to and including day d (binary search over the days with data). */
function _gdCumAt(A, d) {
  let lo = 0, hi = A.sorted.length - 1, best = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (A.sorted[m] <= d) { best = m; lo = m + 1; } else hi = m - 1; }
  return best < 0 ? 0 : A.cum.get(A.sorted[best]);
}
/** Activity hours (finished tasks and focus) between t0 and now. */
function _gdActivity(A, t0, now) {
  if (!(now > t0)) return 0;
  const d0 = _gdDayOf(t0), d1 = _gdDayOf(now);
  const r0 = A.days.get(d0);
  let first = 0;
  if (r0) { let n = 0; for (const ts of r0.ts) if (ts > t0 && ts <= now) n++; first = Math.min(8, n) * 1.5 + (d0 === d1 ? 0 : Math.min(6, Math.floor(r0.focusMin / 25))); }
  if (d1 <= d0) return first;
  return first + _gdCumAt(A, d1) - _gdCumAt(A, d0);
}
function _gdStreakAt(A, d) { let n = 0, c = d; while (A.days.has(c) && A.days.get(c).n > 0 && n < 400) { n++; c = _gdAddDays(c, -1); } return n; }
/* ---------- 2.18.1: what earned coins, per day (focus sessions and finished tasks; rules in 94-garden-0econ.js) ---------- */
function _gdEconFrom(g) { return (g && g.seen && g.seen.econ2) || '9999-12-31'; }
/** From the day the 2.18.1 rules began: earlier days keep the 2.18.0 amounts, so nobody loses coins. Set once, synced. */
function _gdEconMark() {
  const g = _gdG();
  if (!g.since || g.seen.econ2 || !gardenReady()) return;
  g.seen.econ2 = _gdToday(); _gd.walletKey = ''; _gd.memoKey = '';
  if (typeof saveUI === 'function') saveUI();
}
/** Map(day -> {sessions: [{ms}], done: [{first, gapMs, estimate, loggedMs}]}) */
function _gdEconInputs(A) {
  if (A.econIn) return A.econIn;
  const inp = new Map(), slot = (d) => { let r = inp.get(d); if (!r) inp.set(d, r = { sessions: [], done: [] }); return r; };
  const tasks = new Map();
  for (const t of ((typeof state !== 'undefined' && state && state.custom) || [])) if (t && t.id) tasks.set(t.id, t);
  let list = [];
  try { const st = typeof gameStats === 'function' ? gameStats() : null; list = (st && st.focus && st.focus.list) || []; } catch (e) { list = []; }
  const minMs = GARDEN_ECON.minSessionMin * 60000, byTask = new Map();
  for (const s of list) {
    if (!s || !(Number(s.ms) >= minMs) || !s.d) continue;
    slot(s.d).sessions.push({ ms: Number(s.ms) });
    if (s.t) { let a = byTask.get(s.t); if (!a) byTask.set(s.t, a = []); a.push({ d: s.d, ms: Number(s.ms) }); }
  }
  const log = (typeof state !== 'undefined' && state && state.completionLog) || {};
  for (const [id, arr] of Object.entries(log)) {
    if (!Array.isArray(arr)) continue;
    const t = tasks.get(id), rep = !!(t && t.recurrence && t.recurrence !== 'none');
    const tss = arr.map(Number).filter(x => isFinite(x) && x > 0).sort((a, b) => a - b), days = new Set();
    tss.forEach((ts, i) => {
      const day = _gdDayOf(ts), first = rep ? !days.has(day) : i === 0;
      days.add(day);
      let logged = 0;
      for (const x of byTask.get(id) || []) if (rep ? x.d === day : x.d <= day) logged += x.ms;
      slot(day).done.push({ first, gapMs: t && Number(t.createdAt) > 0 ? ts - Number(t.createdAt) : -1, estimate: t ? Number(t.estimate) || 0 : 0, loggedMs: logged });
    });
  }
  A.econIn = inp;
  return inp;
}

/* ---------- weather, rain, time of day ---------- */
const _GD_WET = new Set(['rain', 'drizzle', 'showers', 'thunder']);
function _gdWeather() { try { return typeof _bf !== 'undefined' && _bf && _bf.weather && _bf.weather.ok ? _bf.weather : null; } catch (e) { return null; } }
/** The fallback shower: about one morning in five, the same on every device. */
function _gdShowerAt(iso) { const h = gardenHash('gd-rain|' + iso); return h % 5 === 0 ? _gdDayMs(iso, 6 * 60 + (h >> 8) % 50) : 0; }
/** {now: raining, snow, last: when it last rained (ms, 0 = not in 3 days), label} */
function _gdRain(now) {
  // the weather the app has is for now: a time-lapse frame in the past uses the gentle showers instead
  const live = Math.abs(now - _gdNow()) < 2 * _GD_H;
  const w = live ? _gdWeather() : null, today = _gdDayOf(now), out = { now: false, snow: false, last: 0, label: '' };
  if (w) {
    const cur = w.current || {};
    if (_GD_WET.has(cur.cond)) { out.now = true; out.last = now; out.label = cur.label || 'Rain'; }
    if (cur.cond === 'snow') { out.snow = true; out.label = cur.label || 'Snow'; }
    const h = Clock.parts(now).h;
    for (const x of (Array.isArray(w.hourly) ? w.hourly : [])) {
      if (x && x.date === today && x.hour <= h && _GD_WET.has(x.cond)) { const t = _gdDayMs(today, x.hour * 60 + 30); if (t <= now && t > out.last) out.last = t; }
    }
    return out;
  }
  for (let k = 0; k < 3; k++) {
    const d = _gdAddDays(today, -k), t = _gdShowerAt(d);
    if (t && t <= now) { if (t > out.last) out.last = t; if (now - t < 50 * 60000) { out.now = true; out.label = 'A morning shower'; } break; }
  }
  return out;
}
/** dawn / day / dusk / night from your clock (and sunrise / sunset from the weather when there is one). */
function _gdTod(now, season) {
  const p = Clock.parts(now), h = p.h + p.mi / 60;
  const w = _gdWeather();
  const hm = (s) => { const m = /(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? +m[1] + m[2] / 60 : NaN; };
  let up = w && w.today ? hm(w.today.sunrise) : NaN, down = w && w.today ? hm(w.today.sunset) : NaN;
  if (!isFinite(up) || !isFinite(down)) { const t = { spring: [6.3, 19.6], summer: [5, 21.2], autumn: [7, 18], winter: [8, 16.2] }[season] || [7, 19]; up = t[0]; down = t[1]; }
  if (h >= up - 0.75 && h < up + 0.75) return 'dawn';
  if (h >= down - 0.75 && h < down + 0.75) return 'dusk';
  return h >= up && h < down ? 'day' : 'night';
}

/* ---------- the migration from 2.16 (and a first garden for someone new) ---------- */
const _GD_216_KINDS = ['tulip', 'daisy', 'sunflower', 'lavender', 'basil'];
/**
 * Is the state really loaded? The first paint uses this browser's cached copy before the file is read; a new browser's
 * cache is empty, and setting the garden up from that would start it from nothing (and could be saved over the real
 * history). So: once the file has been read (_lastSave), or after a few seconds when there is no server at all.
 */
function gardenReady() {
  if (typeof state === 'undefined' || !state) return false;
  if (state._lastSave) return true;
  if (typeof _serverAvailable !== 'undefined' && _serverAvailable) return false;   // the file is still being read
  if (!_gd.bootAt) _gd.bootAt = Date.now();   // clock-ok: a wait, not a date
  return Date.now() - _gd.bootAt > 5000;   // clock-ok: browser storage only: after the server probe has had its chance
}
/** Set the garden up once. True when the garden exists (now or already). */
function gardenEnsure() {
  if (typeof state === 'undefined' || !state) return false;
  const g = _gdG();
  if (g.since) return true;
  if (!gardenReady()) {
    clearTimeout(_gd.readyT);
    _gd.readyT = setTimeout(() => { if (gardenEnsure() && /^(home|garden)/.test(String(state.view || '')) && typeof render === 'function') render(); }, 1500);
    return false;
  }
  const now = _gdNow(), today = _gdToday();
  let m = null;
  try { m = typeof memGardenModel === 'function' ? memGardenModel(14) : null; } catch (e) { m = null; }
  const total = m ? m.total || 0 : 0, streak = m ? m.streak || 0 : 0;
  g.since = today;
  // the old oak: back left of the front garden, at its 2.16 size (it keeps growing with every task)
  g.plants.heart = { p: 'heart-oak', x: 6, y: 4, t: now - 30 * _GD_DAY, w: now, v: 0 };
  // the last two weeks' plants, as 2.16 drew them, along the front of the bed
  const cells = [[8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [13, 7], [8, 6], [10, 6], [12, 6]];
  const plots = m && Array.isArray(m.plots) ? m.plots.filter(p => p.n > 0).slice(-cells.length) : [];
  plots.forEach((pl, i) => {
    const id = _GD_216_KINDS[pl.kind % _GD_216_KINDS.length] || 'daisy', def = gardenPlant(id);
    const stage = pl.stage >= 3 ? 4 : pl.stage === 2 ? 3 : 1;
    const t = now - Math.ceil(gardenHoursFor(def, stage) / 0.8 + 1) * _GD_H;
    g.plants['m' + (i + 1)] = { p: id, x: cells[i][0], y: cells[i][1], t, w: now, v: (gardenHash(pl.iso) % ((def.look.v || [0]).length)) };
  });
  if (!plots.length) {   // someone new: two sprouts to say hello
    g.plants.m1 = { p: 'daisy', x: 9, y: 7, t: now - 3 * _GD_H, w: now, v: 0 };
    g.plants.m2 = { p: 'sunflower', x: 11, y: 6, t: now - 4 * _GD_H, w: now, v: 0 };
  }
  // a path, a bench and a sign so it looks lived in
  for (let x = 6; x <= 13; x++) g.decor['p' + x] = { d: 'stepping-stones', x, y: 8, r: 0, v: 0, at: now };
  g.decor.sign = { d: 'welcome-sign', x: 14, y: 8, r: 0, v: 0, at: now };
  const coins = 60 + Math.min(500, total) + 10 * Math.min(30, streak);
  const xp = Math.min(500, Math.round(total * 1.5));
  // the starter path and sign come with the grant, so your bag balances (placed = owned)
  g.led.mig = { d: today, k: 'mig', c: coins, x: xp, i: { 'seed:daisy': 2, 'seed:tulip': 2, 'seed:marigold': 1, 'seed:basil': 1, fertiliser: 2, 'decor:stepping-stones': 8, 'decor:welcome-sign': 1 }, n: 0 };
  g.disc['heart-oak'] = today;
  for (const pl of Object.values(g.plants)) if (!g.disc[pl.p]) g.disc[pl.p] = today;
  g.disc['stepping-stones'] = today; g.disc['welcome-sign'] = today;
  // the level you start at is not a level-up moment
  const plantsFound = Object.keys(g.disc).filter(id => gardenPlant(id)).length;
  g.seen.level = gardenLevelOf(xp + 10 * plantsFound).level;
  _gdSave();
  _gdEmit('setup', { coins, xp, total });
  return true;
}

/* ---------- growth of one plant ---------- */
/** The old oak's size from everything finished (up to a day, for the time-lapse). */
function _gdHeartLevel(A, upTo) {
  let total = A.total;
  if (upTo) { let lo = 0, hi = A.sorted.length - 1, best = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (A.sorted[mid] <= upTo) { best = mid; lo = mid + 1; } else hi = mid - 1; } total = best < 0 ? 0 : A.cnt.get(A.sorted[best]); }
  return [0, 10, 50, 150, 400, 1000, 2500].filter(x => total >= x).length - 1;
}
function _gdSprinkled(g, pl, def, now) {
  // the latest 06:00 a sprinkler within its reach watered this cell
  let best = 0;
  const fp = def.fp || 1;
  for (const d of Object.values(g.decor)) {
    const dd = d && gardenDecor(d.d); if (!dd || !dd.effect || dd.effect.kind !== 'sprinkler') continue;
    const r = dd.effect.r || 1;
    if (pl.x + fp - 1 < d.x - r || pl.x > d.x + r || pl.y + fp - 1 < d.y - r || pl.y > d.y + r) continue;
    const today = _gdDayOf(now);
    let t = _gdDayMs(today, 360); if (t > now) t = _gdDayMs(_gdAddDays(today, -1), 360);
    if ((d.at || 0) <= t && t > best) best = t;
  }
  return best;
}
function _gdNearEffect(occDecor, x, y, fp, kind, r) {
  for (const d of occDecor) {
    if (!d.def.effect || d.def.effect.kind !== kind) continue;
    const rr = r == null ? (d.def.effect.r || 1) : r;
    if (x + fp - 1 >= d.x - rr && x <= d.x + (d.def.w || 1) - 1 + rr && y + fp - 1 >= d.y - rr && y <= d.y + (d.def.h || 1) - 1 + rr) return true;
  }
  return false;
}
/**
 * One plant's state now: {stage, hours, thirsty, dry, lastWater, ripe, overgrown, inSeason, nextIn (hours to the next
 * stage or ripeness), variant}. ctx {A, rain, season, events, now, decorList, g}.
 */
function _gdPlantState(pl, def, ctx) {
  const now = ctx.now, A = ctx.A;
  if (def.special === 'heart') {
    const lv = _gdHeartLevel(A, now < _gdNow() - _GD_H ? _gdDayOf(now) : '');
    return { stage: Math.min(4, 1 + lv), hours: 0, thirsty: false, dry: 0, lastWater: now, ripe: false, overgrown: false, inSeason: true, nextIn: null, variant: lv, heart: lv };
  }
  const t0 = Number(pl.t) || now;
  const area = gardenAreaAt(pl.x, pl.y, null);
  const inSeason = area === 'greenhouse' || gardenInSeason(def, ctx.season) || _gdNearEffect(ctx.decorList, pl.x, pl.y, def.fp || 1, 'cold', 1);
  let sf = inSeason ? 1.3 : 0.8;
  if (ctx.events.includes('midsummer')) sf *= 1.25;
  const lastWater = Math.max(Number(pl.w) || t0, ctx.rain.last || 0, _gdSprinkled(ctx.g, pl, def, now));
  const dry = def.thirst ? Math.max(0, (now - lastWater) / _GD_H - def.thirst) : 0;
  const realH = Math.max(0, (now - t0) / _GD_H);
  const act = _gdActivity(A, t0, now);
  const eff = Math.max(0, realH - 0.5 * ((Number(pl.dh) || 0) + dry)) * sf + act + (Number(pl.fb) || 0);
  let stage = gardenStageAt(def, eff), ripe = false, nextIn = null;
  const y = def.yield, hv = pl.hv && pl.hv <= now ? pl.hv : 0;   // a harvest after `now` (the time-lapse) has not happened yet
  if (y && hv && stage >= 4) {
    const since = Math.max(0, (now - hv) / _GD_H - 0.5 * dry) * sf + _gdActivity(A, hv, now);
    ripe = since >= (y.regrow || 24);
    stage = ripe ? 4 : 3;
    if (!ripe) nextIn = Math.max(0.1, ((y.regrow || 24) - since) / sf);
  } else {
    ripe = !!y && stage >= 4;
    if (stage < 4) nextIn = Math.max(0.1, (gardenHoursFor(def, stage + 1) - eff) / sf);
  }
  if (def.special === 'rare-bloom' && stage >= 4) {
    const into = eff - gardenHoursFor(def, 4), cyc = 30 * 24;
    const open = (into % cyc) < 48;
    if (!open) { stage = 3; ripe = false; nextIn = (cyc - (into % cyc)) / sf; }
  }
  const lastTrim = Math.max(pl.pr && pl.pr <= now ? Number(pl.pr) : 0, hv, t0 + gardenHoursFor(def, 4) * _GD_H / sf);
  const overgrown = stage >= 4 && !['veg', 'water', 'succulent'].includes(def.cat) && now - lastTrim > 3 * _GD_DAY;
  return { stage, hours: eff, thirsty: dry > 0, dry, lastWater, ripe, overgrown, inSeason, nextIn, variant: Math.max(0, Math.min(7, Number(pl.v) || 0)) };
}

/* ---------- the wallet: coins, XP, items (everything summed, nothing double) ---------- */
function _gdAddItems(into, items, k) { if (!items) return; for (const [id, n] of Object.entries(items)) { const v = Number(n) || 0; if (v) into[id] = (into[id] || 0) + v * (k || 1); } }
const _GD_N_KINDS = { p: 'planted', h: 'harvests', q: 'bouquets', s: 'sold', f: 'fed', r: 'pruned', b: 'bought', w: 'wishes', cp: 'collected', hy: 'collected',
  fc: 'fished', bc: 'netted', od: 'traded', gv: 'gifted', cr: 'crafted' };   // 2.22: fish caught, bugs netted, orders filled, catches given
function _gdSeedPool(pred) { return GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && pred(p)).map(p => p.id); }
/** A reward's items with its wildcards resolved ('seed:*' a common seed, 'seed:*rare' an uncommon or rare one), seeded. */
function _gdResolve(items, seed) {
  if (!items) return null;
  const out = {};
  for (const [k, n] of Object.entries(items)) {
    if (k === 'seed:*' || k === 'seed:*rare') {
      const pool = k === 'seed:*' ? _gdSeedPool(p => p.rarity === 'common' && p.lv <= 3) : _gdSeedPool(p => p.rarity === 'uncommon' || p.rarity === 'rare');
      const id = pool[gardenHash(seed + '|' + k) % pool.length];
      out['seed:' + id] = (out['seed:' + id] || 0) + n;
    } else out[k] = (out[k] || 0) + n;
  }
  return out;
}
/** A daily garden task pays half from the 2.18.1 day on (they are clicks). */
function gardenDailyCoins(def, day) { const ef = _gdEconFrom(_gdG()); return (day || _gdToday()) >= ef ? Math.max(1, Math.round(def.c * GARDEN_ECON.dailyShare)) : def.c; }
function _gdRewardOf(kind, id, key) {
  if (kind === 'dt') { const t = GARDEN_DAILY.find(x => x.id === id); return t ? { c: gardenDailyCoins(t, key), x: t.x, i: _gdResolve(t.i, 'dt|' + key + '|' + id) } : null; }
  if (kind === 'wq') { const t = GARDEN_QUESTS.find(x => x.id === id); return t ? { c: t.c, x: t.x, i: _gdResolve(t.i, 'wq|' + key + '|' + id) } : null; }
  if (kind === 'rib') { const r = GARDEN_RIBBONS.find(x => x.id === id); return r ? { c: r.reward.c || 0, x: 25, i: r.reward.i || null } : null; }
  return null;
}
/** Coins (and free seed packets) earned from the data on one day. */
function _gdEarnDay(A, d, questsDone, run) {
  const r = A.days.get(d), n = r ? r.n : 0, fm = r ? r.focusMin : 0;
  const c = Math.min(70, 4 * Math.min(n, 10) + Math.min(18, Math.floor(fm / 10)) + (n > 0 ? Math.min(10, run == null ? _gdStreakAt(A, d) : run) : 0)) + 25 * (questsDone || 0);
  const packets = Math.min(2, Math.floor(n / 3));
  return { c, packets };
}
function _gdGameQuestsByDay() {
  const out = {};
  try {
    const q = state.game && state.game.quests;
    if (q && typeof q === 'object') for (const wk of Object.values(q)) { const done = wk && wk.done; if (done && typeof done === 'object') for (const [id, d] of Object.entries(done)) if (id !== 'all' && typeof d === 'string') out[d] = (out[d] || 0) + 1; }
  } catch (e) { /* no game */ }
  return out;
}
function gardenWallet() {
  const g = _gdG(), A = _gdAct();
  const key = _gd.rev + '|' + _gd.actKey + '|' + Object.keys(g.led).length;
  if (_gd.wallet && _gd.walletKey === key) return _gd.wallet;
  const items = {}, n = { planted: 0, harvests: 0, bouquets: 0, sold: 0, fed: 0, pruned: 0, bought: 0, wishes: 0, collected: 0, daily: 0, quests: 0, fished: 0, netted: 0, traded: 0, gifted: 0, crafted: 0 };
  let coins = 0, xp = 0, earned = 0, today = _gdToday();
  // earned from the data since the garden began (2.18.0 rules before the econ2 day, the time-based rules from it)
  let econToday = null;
  if (g.since) {
    const qd = _gdGameQuestsByDay(), ef = _gdEconFrom(g), EI = _gdEconInputs(A);
    const pool = _gdSeedPool(p => p.rarity === 'common' && p.lv <= 2);
    let run = _gdStreakAt(A, _gdAddDays(g.since, -1)), run2 = 0;
    for (let d = g.since, i = 0; d <= today && i < 3000; d = _gdAddDays(d, 1), i++) {
      const r = A.days.get(d); run = r && r.n > 0 ? run + 1 : 0;
      const e = _gdEarnDay(A, d, qd[d], run);
      let c = e.c, packets = e.packets;
      if (d >= ef) {
        const t = gardenEconDay(Object.assign({ sessions: [], done: [] }, EI.get(d), { run: run2 + 1 }));
        run2 = t.base > 0 ? run2 + 1 : 0;
        const legacy = d === ef ? e.c - 25 * (qd[d] || 0) : 0;   // the day it began, nobody earns less than the old rules gave
        c = Math.max(legacy, t.coins) + 25 * (qd[d] || 0);
        packets = d === ef ? Math.max(packets, t.packets) : t.packets;
        if (d === today) econToday = t;
      }
      coins += c; earned += c;
      for (let k = 0; k < packets; k++) { const id = pool[gardenHash('gd-packet|' + d + '|' + k) % pool.length]; items['seed:' + id] = (items['seed:' + id] || 0) + 1; }
    }
  }
  // the ledger and the bank
  const take = (e) => {
    if (!e || typeof e !== 'object') return;
    coins += Number(e.c) || 0; xp += e.k === 'gl' && !e.ok ? 0 : Number(e.x) || 0;   // (a visit's record that has not been answered: its x is still a cell, not XP)
    _gdAddItems(items, e.i);
    if (e.k && _GD_N_KINDS[e.k]) n[_GD_N_KINDS[e.k]] += Number(e.n) || 0;
    if (e.nn && typeof e.nn === 'object') for (const [k, v] of Object.entries(e.nn)) if (k in n) n[k] += Number(v) || 0;
  };
  for (const e of Object.values(g.led)) take(e);
  for (const e of Object.values(g.bank)) take(e);
  // rewards: daily tasks, quests, ribbons; grants; discoveries
  for (const [day, m] of Object.entries(g.dt)) if (m && typeof m === 'object') for (const id of Object.keys(m)) { const r = _gdRewardOf('dt', id, day); if (r) { coins += r.c; xp += r.x; _gdAddItems(items, r.i); n.daily++; } }
  for (const [wk, m] of Object.entries(g.wq)) if (m && typeof m === 'object') for (const id of Object.keys(m)) { const r = _gdRewardOf('wq', id, wk); if (r) { coins += r.c; xp += r.x; _gdAddItems(items, r.i); n.quests++; } }
  for (const id of Object.keys(g.rib)) { const r = _gdRewardOf('rib', id); if (r) { coins += r.c; xp += r.x; _gdAddItems(items, r.i); } }
  for (const key of Object.keys(g.gr)) { const m = /^(ach|ev):([a-z0-9-]+)/.exec(key); if (m && gardenPlant(m[2])) _gdAddItems(items, { ['seed:' + m[2]]: 1 }); }
  xp += 10 * Object.keys(g.disc).filter(id => gardenPlant(id) || gardenVisitor(id)).length;
  xp += 8 * (Object.keys(g.fl).filter(id => gardenFishDef(id)).length + Object.keys(g.bl).filter(id => gardenBugDef(id)).length);   // 2.22: every new kind of fish or bug
  // decorations placed are not in your bag (never below none: a copy synced from elsewhere may lead the ledger)
  for (const d of Object.values(g.decor)) if (d && !d.own && gardenDecor(d.d)) items['decor:' + d.d] = (items['decor:' + d.d] || 0) - 1;   // (own: a friend's, from their bag: docs/dev/GARDEN_TOGETHER.md)
  for (const k of Object.keys(items)) if (items[k] < 0) items[k] = 0;
  const lv = gardenLevelOf(xp);
  _gd.wallet = { coins: Math.max(0, Math.round(coins)), xp: Math.max(0, xp), level: lv, items, n, earned, econToday: econToday || gardenEconDay({ sessions: [], done: [] }), econFrom: _gdEconFrom(g) };
  _gd.walletKey = key;
  return _gd.wallet;
}
function gardenHas(item) { const w = gardenWallet(); return Math.max(0, Math.floor(w.items[item] || 0)); }
function _gdOwnsTool(id) { return gardenHas('tool:' + id) > 0; }

/* ---------- water ---------- */
function gardenWaterInfo(model) {
  const g = _gdG(), now = _gdNow(), today = _gdDayOf(now);
  let cap = 10;
  for (const t of GARDEN_TOOLS) if (t.kind === 'can' && _gdOwnsTool(t.id)) cap += t.n;
  const per = {};
  for (const d of Object.values(g.decor)) { const dd = d && gardenDecor(d.d); if (dd && dd.effect && dd.effect.kind === 'can' && (per[dd.id] || 0) < 2) { per[dd.id] = (per[dd.id] || 0) + 1; cap += dd.effect.n || 0; } }
  const A = _gdAct(), doneToday = A.days.has(today) ? A.days.get(today).n : 0;
  const wal = gardenWallet(), bonus = today >= wal.econFrom ? wal.econToday.water : Math.min(10, 2 * doneToday);
  const used = Object.keys(g.wl[today] || {}).length;
  const rain = model ? model.rain : _gdRain(now);
  return { cap, bonus, used, left: Math.max(0, cap + bonus - used), raining: !!rain.now };
}

/* ---------- the model ---------- */
function _gdAreasOpen(level) {
  // 2.23: land you bought is yours for good (its row is in your ledger as an item, 'land:<id>', so it syncs and banks like everything else)
  const owned = GARDEN_AREAS.filter(a => a.buy && gardenHas('land:' + a.id) > 0).map(a => a.id);
  if (!(typeof gardenVisitOn === 'function' && gardenVisitOn())) gardenLandSet(owned);   // (on a visit the land on screen is your friend's)
  return GARDEN_AREAS.filter(a => (a.buy ? owned.includes(a.id) : level >= a.lv)).map(a => a.id);
}
function gardenModel(nowArg) {
  const g = _gdG();
  if (!g.since) gardenEnsure();
  _gdEconMark();
  const now = nowArg || _gdNow();
  const A = _gdAct();
  const w = _gdWeather();
  const key = [_gd.rev, Math.floor(now / 60000), _gd.actKey, w ? w.fetchedAt : '-', gardenFun()].join('|');
  if (!nowArg && _gd.memo && _gd.memoKey === key) return _gd.memo;
  const today = _gdDayOf(now), south = _gdSouth(), season = gardenSeasonOf(today, south), events = gardenEventsOn(today);
  const rain = _gdRain(now), tod = _gdTod(now, season);
  const wallet = gardenWallet(), level = wallet.level.level;
  const decor = [];
  for (const [uid, d] of Object.entries(g.decor)) { const def = d && gardenDecor(d.d); if (!def || !Number.isInteger(d.x) || !Number.isInteger(d.y)) continue; if (nowArg && uid.length > 4 && Number(d.at) > now) continue; decor.push({ uid, def, x: d.x, y: d.y, r: (Number(d.r) || 0) & 3, v: Math.max(0, Math.min(7, Number(d.v) || 0)), at: d.at || 0 }); }
  const ctx = { now, A, rain, season, events, decorList: decor, g };
  const plants = [];
  let blooms = 0, ripe = 0, thirsty = 0, trees = 0;
  const cats = {};
  for (const [uid, pl] of Object.entries(g.plants)) {
    const def = pl && gardenPlant(pl.p); if (!def || !Number.isInteger(pl.x) || !Number.isInteger(pl.y)) continue;
    const s = _gdPlantState(pl, def, ctx);
    if (nowArg && Number(pl.t) > now) continue;   // the time-lapse: not planted yet
    const it = Object.assign({ uid, def, x: pl.x, y: pl.y, fp: def.fp || 1, t: (gardenHash(uid) % 1000) / 1000, hc: pl.hc || 0, planted: Number(pl.t) || 0 }, s);
    plants.push(it);
    if (s.stage >= 4 && (def.cat === 'flower' || def.cat === 'wild' || def.cat === 'water' || def.cat === 'exotic')) blooms++;
    if (s.ripe) ripe++;
    if (s.thirsty) thirsty++;
    if (def.cat === 'tree' && s.stage >= 3) trees++;
    cats[def.cat] = (cats[def.cat] || 0) + 1;
  }
  // occupancy: 'x,y' -> {plant, decor, ground}
  const occ = new Map();
  const cell = (x, y) => { const k = x + ',' + y; let c = occ.get(k); if (!c) occ.set(k, c = {}); return c; };
  for (const p of plants) for (let dy = 0; dy < p.fp; dy++) for (let dx = 0; dx < p.fp; dx++) { const c = cell(p.x + dx, p.y + dy); if (!c.plant) c.plant = p.uid; }
  for (const d of decor) for (let dy = 0; dy < (d.def.h || 1); dy++) for (let dx = 0; dx < (d.def.w || 1); dx++) { const c = cell(d.x + dx, d.y + dy); if (d.def.layer === 'ground') { if (!c.ground) c.ground = d.uid; } else if (!c.decor) c.decor = d.uid; }
  const m = { now, today, season, south, tod, events, rain, level: wallet.level, areas: _gdAreasOpen(level), plants, decor, occ, blooms, ripe, thirsty, trees, cats,
    heart: _gdHeartLevel(A, nowArg ? today : ''), wallet, totalDone: A.total };
  m.water = gardenWaterInfo(m);
  m.visitors = _gdVisitorsNow(m);
  if (!nowArg) { _gd.memo = m; _gd.memoKey = key; }
  return m;
}
/** The garden you are standing in: your own, or on a visit your friend's (94-garden-visit-0world.js). Your wallet, the shop and your own rewards always go by gardenModel(): they are yours wherever you stand. */
function gardenHere(nowArg) { const v = typeof gardenVisitModel === 'function' ? gardenVisitModel() : null; return v || gardenModel(nowArg); }
function gardenPlantById(m, uid) { return m.plants.find(p => p.uid === uid) || null; }
function gardenDecorById(m, uid) { return m.decor.find(d => d.uid === uid) || null; }

/* ---------- visitors ---------- */
function _gdNeedsMet(v, m) {
  const n = v.needs || {};
  if (n.bloom && m.blooms < n.bloom) return false;
  if (n.ripe && m.ripe < n.ripe) return false;
  if (n.trees && m.trees < n.trees) return false;
  if (n.rain && !m.rain.now && !(m.rain.last && m.now - m.rain.last < 3 * _GD_H)) return false;
  if (n.area && !m.areas.includes(n.area)) return false;
  if (n.plants && !m.plants.some(p => n.plants.includes(p.def.id) && p.stage >= 2)) return false;
  if (n.cats) for (const [c, k] of Object.entries(n.cats)) if ((m.cats[c] || 0) < k) return false;
  if (n.decor && !m.decor.some(d => n.decor.includes(d.def.id))) return false;
  if (n.effect && !(m.decor.some(d => d.def.effect && d.def.effect.kind === n.effect) || (n.effect === 'pond' && m.areas.includes('pond')))) return false;
  return true;
}
function _gdSpotFor(v, m, rnd) {
  const pick = (list) => list.length ? list[Math.floor(rnd() * list.length)] : null;
  const W = GARDEN_WORLD;
  const freeLawn = () => { for (let i = 0; i < 30; i++) { const x = Math.floor(rnd() * W.cols), y = 8 + Math.floor(rnd() * 3); const c = m.occ.get(x + ',' + y); if (!c || (!c.plant && !c.decor)) return { x: x + 0.5, y: y + 0.7 }; } return { x: 10.5, y: 9.7 }; };
  const atPlant = (p) => p ? { x: p.x + p.fp / 2 + (rnd() - 0.5) * 0.4, y: p.y + p.fp - 0.25, lift: Math.max(0.4, (p.def.look.h || 0.7) * (p.stage / 4)) } : null;
  const atDecor = (d) => d ? { x: d.x + (d.def.w || 1) / 2, y: d.y + (d.def.h || 1) - 0.2, lift: Math.max(0.3, d.def.look.h || 0.6) } : null;
  switch (v.spot) {
    case 'flower': return atPlant(pick(m.plants.filter(p => p.stage >= 4 && ['flower', 'wild', 'water', 'exotic', 'herb'].includes(p.def.cat))));
    case 'plant': return atPlant(pick(m.plants.filter(p => p.stage >= 2 && p.def.cat !== 'tree')));
    case 'tree': return atPlant(pick(m.plants.filter(p => p.def.cat === 'tree' && p.stage >= 3)));
    case 'veg': { const p = pick(m.plants.filter(p2 => p2.def.cat === 'veg')); return p ? { x: p.x + 0.5, y: p.y + 0.9 } : freeLawn(); }
    case 'pond': {
      const md = pick(m.decor.filter(d => d.def.effect && d.def.effect.kind === 'pond'));
      if (m.areas.includes('pond') && (!md || rnd() < 0.7)) { const w = gardenArea('pond').water; return { x: w.x + 0.5 + rnd() * (w.w - 1), y: w.y + 0.6 + rnd() * (w.h - 1), water: true }; }
      return md ? { x: md.x + 1, y: md.y + 1.4, water: true } : null;
    }
    case 'decor': {
      const kinds = v.needs.decor || null;
      return atDecor(pick(m.decor.filter(d => (kinds ? kinds.includes(d.def.id) : d.def.effect && ['birds', 'hedge'].includes(d.def.effect.kind)))));
    }
    case 'light': return atDecor(pick(m.decor.filter(d => d.def.effect && d.def.effect.kind === 'light')));
    case 'seat': return atDecor(pick(m.decor.filter(d => d.def.effect && d.def.effect.kind === 'sit')));
    case 'meadow': { const a = gardenArea('meadow'); return m.areas.includes('meadow') ? { x: a.x + 0.5 + rnd() * (a.w - 1), y: a.y + 0.8 + rnd() * (a.h - 1) } : freeLawn(); }
    case 'sky': return { x: 2 + rnd() * (W.cols - 4), y: -1.5 - rnd() * 2, sky: true };
    default: return freeLawn();
  }
}
/** Who is in the garden now: the same for 20 minutes (seeded by the window), fewer at Subtle. */
function _gdVisitorsNow(m) {
  const fun = gardenFun();
  if (fun === 'off') return [];
  const win = Math.floor(m.now / (20 * 60000));
  const max = fun === 'full' ? 6 : 3, out = [];
  for (const v of GARDEN_VISITORS) {
    if (!v.when.tod.includes(m.tod) || !v.when.seasons.includes(m.season)) continue;
    if (!_gdNeedsMet(v, m)) continue;
    const rnd = gardenRand('gd-vis|' + win + '|' + v.id);
    const lucky = m.decor.some(d => d.def.effect && d.def.effect.kind === 'luck') ? 1.1 : 1;
    if (rnd() > v.chance * (fun === 'full' ? 1 : 0.75) * lucky) continue;
    const at = _gdSpotFor(v, m, rnd);
    if (!at) continue;
    out.push(Object.assign({ id: v.id, def: v, motion: v.motion, t: rnd() }, at));
  }
  // the rarest first, then a fair mix
  const rank = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  out.sort((a, b) => rank[a.def.rarity] - rank[b.def.rarity]);
  return out.slice(0, max);
}

/* ---------- snapshots ---------- */
function gardenSnapshot() {
  try {
    const m = gardenModel();
    const plants = m.plants.slice(0, GARDEN_SNAPSHOT_MAX.plants).map(p => [p.def.id, p.x, p.y, p.stage, p.variant, (p.thirsty ? 1 : 0) | (p.overgrown ? 2 : 0) | (p.ripe ? 4 : 0)]);
    const decor = m.decor.slice(0, GARDEN_SNAPSHOT_MAX.decor).map(d => [d.def.id, d.x, d.y, d.r, d.v]);
    const out = { v: 1, cv: 1, lv: m.level.level, season: m.season, areas: m.areas.slice(), plants, decor, heart: m.heart, at: Math.floor(m.now) };
    try { const sh = typeof gardenShowWire === 'function' ? gardenShowWire() : null; if (sh) out.sh = sh; } catch (e) { /* the showcase is optional */ }   // 2.22: the tank and the case
    try { const tk = typeof petBookWire === 'function' ? petBookWire() : null; if (tk && tk.length) out.tk = tk; } catch (e) { /* tricks are optional */ }   // 2.23: ids of what your pet can do, for friends who visit
    return out;
  } catch (e) { console.error('[garden]', e); return null; }
}

/* ---------- facts, ribbons, daily tasks, quests ---------- */
function _gdDayFacts(g, m, from, to) {
  const f = { watered: 0, harvests: 0, planted: 0, fed: 0, pruned: 0, bouquets: 0, sold: 0, tasks: 0, focusMin: 0, visitors: 0, visitorKinds: 0, decorated: 0, waterDays: 0, dailyDone: 0, fished: 0, netted: 0 };
  const A = _gdAct(), kinds = new Set();
  for (let d = from, i = 0; d <= to && i < 8; d = _gdAddDays(d, 1), i++) {
    const wn = Object.keys(g.wl[d] || {}).length;
    f.watered += wn; if (wn || (m.rain.last && _gdDayOf(m.rain.last) === d)) f.waterDays++;
    const r = A.days.get(d); if (r) { f.tasks += r.n; f.focusMin += r.focusMin; }
    for (const v of Object.keys(g.vd[d] || {})) kinds.add(v);
    if (g.vd[d]) f.visitors += Object.keys(g.vd[d]).length;
    f.dailyDone += Object.keys(g.dt[d] || {}).length;
  }
  f.visitorKinds = kinds.size;
  for (const e of Object.values(g.led)) {
    if (!e || !e.d || e.d < from || e.d > to) continue;
    const k = _GD_N_KINDS[e.k]; if (k && k in f) f[k] += Number(e.n) || 0;
  }
  for (const d of m.decor) if (d.at && _gdDayOf(d.at) >= from && _gdDayOf(d.at) <= to && d.uid.length > 4) f.decorated++;
  if (m.rain.now) f.watered = Math.max(f.watered, 99);   // the rain did it for you
  return f;
}
function _gdTaskRows(defs, f, doneMap, key) {
  return defs.map(t => {
    const want = t.n, have = Math.min(want, f[t.fact] || 0);
    return { def: t, id: t.id, label: t.label.replace('{n}', String(want)), n: want, have, done: have >= want, claimed: !!(doneMap && doneMap[t.id]), key, reward: _gdRewardOf(GARDEN_DAILY.includes(t) ? 'dt' : 'wq', t.id, key) };
  });
}
function gardenDailyTasks(mArg) {
  const g = _gdG(), m = mArg || gardenModel(), today = m.today;
  return _gdTaskRows(gardenPickDaily(today, m.level.level), _gdDayFacts(g, m, today, today), g.dt[today], today);
}
function gardenWeekQuests(mArg) {
  const g = _gdG(), m = mArg || gardenModel(), wk = _gdWeekFrom(m.today);
  // 2.23: one more for the time of year, as well as the week's three
  const seasonal = GARDEN_QUESTS.filter(q => q.season === m.season);
  return _gdTaskRows(gardenPickQuests(wk, m.level.level).concat(seasonal), _gdDayFacts(g, m, wk, m.today), g.wq[wk], wk);
}
function gardenFacts(mArg) {
  const g = _gdG(), m = mArg || gardenModel(), w = m.wallet;
  const disc = Object.keys(g.disc);
  const vis = disc.filter(id => gardenVisitor(id));
  let cat = null;   // 2.22: fishing and bug catching (94-garden-fish-2core.js)
  try { cat = typeof gardenCatchFacts === 'function' ? gardenCatchFacts(m) : null; } catch (e) { cat = null; }
  let soc = null;   // ── garden-social ── visits, waterings, gifts, signatures and hearts with friends (94-garden-social-1core.js)
  try { soc = typeof gardenSocialFacts === 'function' ? gardenSocialFacts() : null; } catch (e) { soc = null; }
  return {
    ...(soc || {}),
    ...(cat || {}),
    planted: w.n.planted, harvests: w.n.harvests, bouquets: w.n.bouquets, sold: w.n.sold, dailyDone: w.n.daily, crafted: w.n.crafted || 0,
    plantsFound: disc.filter(id => gardenPlant(id)).length, visitorsFound: vis.length,
    pondLife: ['frog', 'dragonfly', 'mallard'].filter(id => g.disc[id]).length,
    nightVisitors: vis.filter(id => !gardenVisitor(id).when.tod.includes('day')).length,
    seasons: GARDEN_SEASONS.filter(s => g.seen['season:' + s]).length,
    decorPlaced: m.decor.filter(d => d.def.layer !== 'ground').length,
    areas: m.areas.length, clover: (w.items.clover || 0) > 0 || !!g.disc['four-leaf-clover'] ? 1 : 0,
  };
}
function gardenRibbonRows(mArg) {
  const g = _gdG(), f = gardenFacts(mArg);
  return GARDEN_RIBBONS.map(r => ({ def: r, n: Math.min(r.of, f[r.fact] || 0), of: r.of, done: (f[r.fact] || 0) >= r.of, earned: g.rib[r.id] || '' }));
}
/** The unlock context for gardenLockOf (level, season, events, achievements, ribbons). */
function gardenUnlockCtx(mArg) {
  const g = _gdG(), m = mArg || gardenModel();
  let ach = [];
  try { ach = typeof achUnlockedIds === 'function' ? achUnlockedIds() : Object.keys((state.achievements && state.achievements.unlocked) || {}); } catch (e) { ach = []; }
  return { level: m.level.level, season: m.season, events: m.events, ach: new Set(ach), ribbons: new Set(Object.keys(g.rib)) };
}

/* ---------- the tick: rewards, discoveries, tidying ---------- */
function gardenTickSoon(ms) { clearTimeout(_gd.tickT); _gd.tickT = setTimeout(() => { try { gardenTick(); } catch (e) { console.error('[garden]', e); } }, ms == null ? 800 : ms); }
function gardenTick() {
  if (typeof state === 'undefined' || !state || !_gdG().since || _gd.tickBusy) return;
  _gd.tickBusy = true;
  try {
    const g = _gdG(), m = gardenModel(), today = m.today, moments = [];
    let changed = false;
    // the season you tended in (Four seasons)
    if (!g.seen['season:' + m.season] && (Object.keys(g.wl[today] || {}).length || Object.values(g.led).some(e => e && e.d === today && e.k !== 'mig'))) { g.seen['season:' + m.season] = today; changed = true; }
    // rare seeds for achievements and events: granted once, then in the shop
    const uc = gardenUnlockCtx(m);
    for (const p of GARDEN_PLANTS) {
      const u = p.unlock; if (!u) continue;
      if (u.ach && uc.ach.has(u.ach) && !g.gr['ach:' + p.id]) { g.gr['ach:' + p.id] = today; changed = true; moments.push({ kind: 'grant', text: `A rare seed for you: ${p.name}`, icon: 'sparkles', id: p.id }); }
      if (u.event && m.events.includes(u.event)) { const k = 'ev:' + p.id + ':' + today.slice(0, 4); if (!g.gr[k]) { g.gr[k] = today; changed = true; moments.push({ kind: 'grant', text: `${(GARDEN_EVENTS.find(e => e.id === u.event) || {}).label || 'An event'}: a free ${p.name} seed`, icon: 'gift', id: p.id }); } }
    }
    // daily tasks and the week's quests: paid once when done
    for (const t of gardenDailyTasks(m)) if (t.done && !t.claimed) { (g.dt[today] = g.dt[today] || {})[t.id] = today; changed = true; moments.push({ kind: 'daily', text: `Garden task done: ${t.label} · +${gardenDailyCoins(t.def)} coins`, icon: t.def.icon }); }
    const wk = _gdWeekFrom(today);
    for (const q of gardenWeekQuests(m)) if (q.done && !q.claimed) { (g.wq[wk] = g.wq[wk] || {})[q.id] = today; changed = true; moments.push({ kind: 'quest', text: `Garden quest complete: ${q.label} · +${q.def.c} coins`, icon: 'flag' }); }
    if (changed) { _gd.walletKey = ''; _gd.memoKey = ''; }
    // ribbons (after the rewards above, so their counts are in)
    const f = gardenFacts(gardenModel());
    for (const r of GARDEN_RIBBONS) if (!g.rib[r.id] && (f[r.fact] || 0) >= r.of) { g.rib[r.id] = today; changed = true; moments.push({ kind: 'ribbon', text: `Ribbon: ${r.label}`, icon: r.icon, ribbon: r.id }); }
    // level ups and new areas (each once, on any device)
    const lv = gardenWallet().level.level;
    if ((Number(g.seen.level) || 1) < lv) {
      const was = Number(g.seen.level) || 1; g.seen.level = lv; changed = true;
      moments.push({ kind: 'level', text: `Garden level ${lv}: ${gardenLevelOf(gardenWallet().xp).title}`, icon: 'sprout', level: lv });
      for (const a of GARDEN_AREAS) if (!a.buy && a.lv > was && a.lv <= lv) moments.push({ kind: 'area', text: `The ${a.name.toLowerCase()} ${/s$/.test(a.name) ? 'are' : 'is'} open`, icon: a.icon, area: a.id });
    }
    // tidy: keep a week of per-day maps, fold old ledger entries by month
    if (g.seen.tidy !== today) { g.seen.tidy = today; changed = _gdTidy(g, today) || changed; }
    // several rare seeds at once (the first visit after an update): one line, not a queue of toasts
    const grants = moments.filter(x => x.kind === 'grant');
    if (grants.length > 2) { const names = grants.map(x => (gardenPlant(x.id) || {}).name).filter(Boolean); moments.splice(0, moments.length, { kind: 'grant', text: `Rare seeds for you: ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`, icon: 'sparkles' }, ...moments.filter(x => x.kind !== 'grant')); }
    if (changed) { _gdSave(); for (const x of moments) _gdMoment(x); }
  } finally { _gd.tickBusy = false; }
}
/** Visitors seen on a page or card that is on screen: the almanac and today's list. */
function gardenNoteVisitors(list) {
  if (!list || !list.length) return;
  const g = _gdG(), today = _gdToday();
  let changed = false;
  const fresh = [];
  for (const v of list) {
    const day = g.vd[today] || (g.vd[today] = {});
    if (!day[v.id]) { day[v.id] = 1; changed = true; }
    if (!g.disc[v.id]) { g.disc[v.id] = today; changed = true; fresh.push(v.def); }
  }
  if (changed) { _gdSave(); gardenTickSoon(); }
  for (const d of fresh.slice(0, 2)) _gdMoment({ kind: 'visitor', text: `New visitor: ${d.name}. ${d.blurb || ''}`.trim(), icon: 'binoculars', id: d.id });
}
function _gdTidy(g, today) {
  let changed = false;
  const keepFrom = _gdAddDays(today, -8);
  for (const k of ['wl', 'vd', 'fd']) for (const d of Object.keys(g[k])) if (d < keepFrom) { delete g[k][d]; changed = true; }
  const cut = _gdAddDays(today, -40);
  // daily tasks and weekly quests older than 40 days fold into the bank (their rewards and counts kept)
  const fold = (month, part) => { const b = g.bank[month] || (g.bank[month] = { c: 0, x: 0, i: {}, nn: {} }); b.c += part.c || 0; b.x += part.x || 0; _gdAddItems(b.i, part.i); if (part.nn) for (const [k, v] of Object.entries(part.nn)) b.nn[k] = (b.nn[k] || 0) + v; };
  for (const [day, mp] of Object.entries(g.dt)) {
    if (day >= cut) continue;
    for (const id of Object.keys(mp || {})) { const r = _gdRewardOf('dt', id, day); if (r) fold(day.slice(0, 7), { c: r.c, x: r.x, i: r.i, nn: { daily: 1 } }); }
    delete g.dt[day]; changed = true;
  }
  for (const [wk, mp] of Object.entries(g.wq)) {
    if (wk >= cut) continue;
    for (const id of Object.keys(mp || {})) { const r = _gdRewardOf('wq', id, wk); if (r) fold(wk.slice(0, 7), { c: r.c, x: r.x, i: r.i, nn: { quests: 1 } }); }
    delete g.wq[wk]; changed = true;
  }
  for (const [key, e] of Object.entries(g.led)) {
    if (!e || key === 'mig' || !e.d || e.d >= cut) continue;
    if (key.startsWith('gl.o.') && (e.t === 'place' || !e.ok)) continue;   // still out in a friend's garden, or never answered: taking it back deletes this
    const nn = {}; if (e.k && _GD_N_KINDS[e.k]) nn[_GD_N_KINDS[e.k]] = Number(e.n) || 0;
    fold(e.d.slice(0, 7), { c: Number(e.c) || 0, x: Number(e.x) || 0, i: e.i, nn });
    delete g.led[key]; changed = true;
  }
  return changed;
}

/* ---------- moments (the Fun level gates them) ---------- */
function _gdMoment(x) {
  _gdEmit(x.kind, x);
  const fun = gardenFun();
  if (fun === 'off') return;
  if (fun === 'subtle' && x.kind === 'daily') return;   // Subtle: the page shows the tick, no toast
  try { if (typeof gameAward === 'function' && ['level', 'ribbon', 'quest', 'area'].includes(x.kind)) gameAward({ kind: 'garden', key: x.kind + ':' + (x.level || x.ribbon || x.area || _gdToday()), label: x.text, quiet: fun !== 'full' }); } catch (e) { /* the game is a bonus */ }
  const now = Date.now();   // clock-ok: spacing toasts, not a date
  const wait = Math.max(0, _gd.lastToastAt + 1400 - now);
  _gd.lastToastAt = now + wait;
  setTimeout(() => {
    try {
      const away = state.view !== 'garden' && !String(state.view || '').startsWith('garden:');
      if (_gdOnPage() && typeof _gdgNote === 'function') _gdgNote(String(x.text).split('. ')[0], icon(x.icon || 'sprout'));   // in the garden, a note in the sky, not a toast
      else if (typeof toast === 'function') toast(x.text, { icon: x.icon || 'sprout', kind: x.kind === 'level' || x.kind === 'ribbon' ? 'ok' : '', action: away ? { label: 'Open the garden', run: () => setView(x.kind === 'ribbon' ? 'garden:almanac' : 'garden') } : undefined });
      if (fun === 'full' && (x.kind === 'level' || x.kind === 'ribbon') && typeof _gdpBurst === 'function') _gdpBurst(x.kind);
    } catch (e) { /* the toast host is gone */ }
  }, wait);
}

/* ---------- Undo ---------- */
/** Record the current values of the paths an action will change: [['plants', uid], ['led', key], ...]. */
function _gdMark(paths) {
  const g = _gdG();
  return paths.map(([k, id]) => [k, id, g[k] && Object.prototype.hasOwnProperty.call(g[k], id) ? JSON.parse(JSON.stringify(g[k][id])) : undefined]);
}
function _gdPushUndo(label, mark) {
  _gd.undo.push({ label, mark, at: _gdNow() });
  if (_gd.undo.length > 40) _gd.undo.shift();
}
function gardenCanUndo() { return _gd.undo.length > (typeof gardenVisitUndoFloor === 'function' ? gardenVisitUndoFloor() : 0); }
/** Undo steps that would bring back this record or this queued post are over: it has moved on, and bringing it back would make two. */
function _gdUndoDrop(map, id) {
  const before = _gd.undo.length;
  _gd.undo = _gd.undo.filter(u => !u.mark.some(r => r[0] === map && r[1] === id));
  if (_gd.undo.length !== before) gardenRepaintSoon();
}
function gardenUndo() {
  const u = _gd.undo.pop();
  if (!u) { if (typeof toast === 'function') toast('Nothing to undo in the garden.', { icon: 'undo-2' }); return false; }
  const g = _gdG();
  // newest first, so a path marked twice ends at its oldest value
  for (const [k, id, old] of u.mark.slice().reverse()) { if (!g[k]) g[k] = {}; if (old === undefined) delete g[k][id]; else g[k][id] = old; }
  _gdSave();
  if (typeof toast === 'function' && !_gdOnPage()) toast(`Undone: ${u.label}`, { icon: 'undo-2' });
  return true;
}
function _gdDone(msg, label, mark, o) {
  o = o || {};
  _gdPushUndo(label, mark);
  _gdSave();
  gardenTickSoon();
  // 2.23: on the garden itself the world answers (a sparkle, a number) and the Undo pill stays by the hotbar; a toast is for the palette and Home
  if (msg && !o.quiet && typeof toast === 'function' && !_gdOnPage()) {
    const u = _gd.undo[_gd.undo.length - 1];
    toast(msg, { icon: o.icon || 'sprout', timeout: 5000, action: { label: 'Undo', run: () => { if (_gd.undo[_gd.undo.length - 1] === u) gardenUndo(); else if (typeof toast === 'function') toast('That has moved on: other garden changes came after it.', { icon: 'undo-2' }); } } });
  }
  return { ok: true, msg };
}
function _gdNo(msg) { return { ok: false, msg }; }
/* ---------- a friend's things in your garden (docs/dev/GARDEN_TOGETHER.md section 7), whoever picks or puts away: you, or the assistant ---------- */
const GD_POST_HOLD_MS = 6000;   // your own pick or put-away waits this long before it is posted (Undo takes it out of the queue); then it goes, and so does the Undo step
function _gdPostsSoon() { if (typeof gardenLivePostsSoon === 'function') gardenLivePostsSoon(); }
/**
 * A friend's share of what was just picked: out of `items`, queued in the same save. The id says which pick of which plant, so it can only arrive once
 * however often it is made. What cannot travel (a four-leaf clover) stays here. -> rows for the Undo mark.
 */
function _gdCropShare(rec, uid, items, hold) {
  if (!rec || !rec.by || !rec.gi) return [];
  const share = typeof gardenLiveShareOf === 'function' ? gardenLiveShareOf(rec.by) : 'keeper';
  if (share === 'owner') return [];
  const post = [];
  for (const k of Object.keys(items)) {
    if (!/^(crop|seed):/.test(k) || (typeof glPostItemOk === 'function' ? !glPostItemOk(k) : !k.startsWith('crop:'))) continue;
    const n = items[k], theirs = share === 'split' ? Math.ceil(n / 2) : n;
    if (theirs > 0) post.push([k, Math.min(99, theirs)]);
    if (n - theirs > 0) items[k] = n - theirs; else delete items[k];
  }
  if (!post.length) return [];
  const id = 'c' + uid + '-' + (Number(rec.hc) || 0), rows = _gdMark([['gq', id]]);
  _gdG().gq[id] = { to: rec.by, why: 'crop', i: rec.gi, items: post, at: _gdNow(), ...(hold ? { hold: _gdNow() + GD_POST_HOLD_MS } : {}) };
  _gdPostsSoon();
  return rows;
}
/** A friend's decoration leaves your garden: it goes back to their bag by post, once. -> rows for the Undo mark. */
function _gdDecorBack(rec, hold) {
  if (!rec || !rec.own || !rec.gi) return [];
  const id = 'b' + rec.gi + '0', rows = _gdMark([['gq', id]]);
  _gdG().gq[id] = { to: rec.own, why: 'back', i: rec.gi, at: _gdNow(), ...(hold ? { hold: _gdNow() + GD_POST_HOLD_MS } : {}) };
  _gdPostsSoon();
  return rows;
}
/** You did something final to a record visitors have touched: their lines about it can no longer be undone, and Put my garden back leaves it alone. -> rows for the Undo mark. */
function _gdLiveTouched(uid) {
  const g = _gdG(), rows = [];
  for (const [k, e] of Object.entries(g.gl)) if (e && e.u === uid && !e.undone && !e.over) { rows.push(['gl', k, JSON.parse(JSON.stringify(e))]); e.over = 'own'; }
  if (g.glc && g.glt[uid] !== '!') { rows.push(..._gdMark([['glt', uid]])); g.glt[uid] = '!'; }
  return rows;
}
function _gdOnPage() { return typeof _gdp !== 'undefined' && !!_gdp.root && _gdp.root.isConnected && (state.view === 'garden' || (typeof gardenVisitOn === 'function' && gardenVisitOn())); }
/** On a visit every garden action is a request to the garden's owner, or waits for them: it never writes your own garden (94-garden-visit-0world.js). Null: no visit, carry on. */
function _gdvAsk(t, a) { return typeof gardenVisitAct === 'function' ? gardenVisitAct(t, a) : null; }
function _gdLed(k, body) { const key = k + '.' + _gdToday() + '.' + _gdUid(''); _gdG().led[key] = Object.assign({ d: _gdToday(), k }, body); return key; }

/* ---------- actions ---------- */
function _gdCellFree(m, x, y, w, h, ignore) {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const c = m.occ.get((x + dx) + ',' + (y + dy));
    if (!c) continue;
    if (c.plant && c.plant !== ignore) return 'Something is already growing there';
    if (c.decor && c.decor !== ignore) return 'There is a decoration there';
  }
  return '';
}
function _gdPlaceOk(m, def, x, y, kind, ignore) {
  if (m.visit && m.visit.no[kind === 'decor' ? 'decor' : 'plant']) return m.visit.no[kind === 'decor' ? 'decor' : 'plant'];   // your level there does not reach this: the ghost goes red
  const why = gardenCellOk(def, x, y, m.level.level, kind);
  if (why) return why;
  const w = kind === 'decor' ? def.w || 1 : def.fp || 1, h = kind === 'decor' ? def.h || 1 : def.fp || 1;
  if (kind === 'decor' && def.layer === 'ground') {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const c = m.occ.get((x + dx) + ',' + (y + dy)); if (c && ((c.ground && c.ground !== ignore) || c.plant)) return c.plant ? 'Something is growing there' : 'There is a path there already'; }
    return '';
  }
  if (kind !== 'decor') for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const c = m.occ.get((x + dx) + ',' + (y + dy)); if (c && c.ground && c.ground !== ignore) return 'That is a path: plants go in the beds'; }
  return _gdCellFree(m, x, y, w, h, ignore);
}
/** Plant a seed from your bag. o {quiet, variant}. */
function gardenPlantAt(plantId, x, y, o) {
  o = o || {};
  { const v = _gdvAsk('plant', { id: plantId, x, y }); if (v) return v; }
  const def = gardenPlant(plantId); if (!def) return _gdNo('Unknown seed');
  const m = gardenModel();
  if (gardenHas('seed:' + plantId) < 1) return _gdNo(`No ${def.name} seeds left: the shop has more`);
  const why = _gdPlaceOk(m, def, x, y, 'plant'); if (why) return _gdNo(why);
  const g = _gdG(), uid = _gdUid('p'), now = _gdNow();
  const variants = (def.look.v || []).length || 1;
  const mark = _gdMark([['plants', uid], ['disc', def.id]]);
  const lk = 'p.' + _gdToday() + '.' + uid;
  mark.push(['led', lk, undefined]);
  g.plants[uid] = { p: def.id, x, y, t: now, w: now, v: o.variant != null ? o.variant : gardenHash(uid) % variants };
  g.led[lk] = { d: _gdToday(), k: 'p', i: { ['seed:' + def.id]: -1 }, x: 2, n: 1 };
  const fresh = !g.disc[def.id];
  if (fresh) g.disc[def.id] = _gdToday();
  _gdEmit('plant', { id: def.id, x, y });
  return _gdDone(o.quiet ? '' : `Planted ${_gdA(def.name)}${fresh ? ' · new in your almanac' : ''}`, `planting ${def.name}`, mark, { icon: 'sprout' });
}
function _gdA(name) { return (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name.toLowerCase().replace(/^the /, ''); }
/** Water one plant (o.quiet: part of a sweep). */
function gardenWater(uid, o) {
  o = o || {};
  { const v = _gdvAsk('water', { uid }); if (v) return v; }
  const m = gardenModel(), p = gardenPlantById(m, uid);
  if (!p) return _gdNo('Nothing to water there');
  if (!p.def.thirst || p.def.special === 'heart') return _gdNo(p.def.cat === 'water' ? 'It lives in the pond: never thirsty' : 'Its roots go deep: it finds its own water');
  if (m.rain.now) return _gdNo('The rain is watering everything for you');
  const sinceH = (m.now - p.lastWater) / _GD_H;
  if (!p.thirsty && sinceH < Math.min(8, p.def.thirst / 2)) return _gdNo('Already happy: watered not long ago');
  const wi = m.water; if (wi.left < 1) return _gdNo('The can is empty: it refills tomorrow, and with every task you finish');
  const g = _gdG(), today = m.today;
  const mark = _gdMark([['plants', uid], ['wl', today]]);
  const pl = g.plants[uid];
  pl.dh = Math.round(((Number(pl.dh) || 0) + p.dry) * 10) / 10;
  pl.w = m.now;
  (g.wl[today] = g.wl[today] || {})[uid] = 1;
  _gdEmit('water', { uid, x: p.x, y: p.y, fp: p.fp });
  return _gdDone(o.quiet ? '' : `Watered the ${p.def.name.toLowerCase().replace(/^the /, '')}`, 'watering', mark, { icon: 'droplet', quiet: o.quiet });
}
/** Water every plant that wants it (the thirstiest first), as far as the can goes. */
function gardenWaterAll(o) {
  o = o || {};
  { const v = _gdvAsk('waterAll', {}); if (v) return v; }
  const m = gardenModel();
  if (m.rain.now) return _gdNo('The rain is watering everything for you');
  const want = m.plants.filter(p => p.def.thirst && p.def.special !== 'heart' && (p.thirsty || (m.now - p.lastWater) / _GD_H >= Math.min(8, p.def.thirst / 2)))
    .sort((a, b) => b.dry - a.dry || a.lastWater - b.lastWater);
  if (!want.length) return _gdNo('Everything has had a drink');
  const left = m.water.left; if (left < 1) return _gdNo('The can is empty: it refills tomorrow, and with every task you finish');
  const g = _gdG(), today = m.today, list = want.slice(0, left);
  const mark = _gdMark([['wl', today], ...list.map(p => ['plants', p.uid])]);
  for (const p of list) { const pl = g.plants[p.uid]; pl.dh = Math.round(((Number(pl.dh) || 0) + p.dry) * 10) / 10; pl.w = m.now; (g.wl[today] = g.wl[today] || {})[p.uid] = 1; }
  _gdEmit('water', { n: list.length });
  const more = want.length - list.length;
  return _gdDone(`Watered ${list.length} plant${list.length === 1 ? '' : 's'}${more ? ` · ${more} more when the can refills` : ''}`, 'watering', mark, { icon: 'droplets', quiet: o.quiet });
}
function gardenFeed(uid) {
  { const v = _gdvAsk('feed', { uid }); if (v) return v; }
  const m = gardenModel(), p = gardenPlantById(m, uid);
  if (!p) return _gdNo('Nothing to feed there');
  if (p.def.special === 'heart') return _gdNo('The old oak grows with your work, not with feed');
  if (gardenHas('fertiliser') < 1) return _gdNo('No fertiliser: the shop or a compost bin has some');
  const g = _gdG(), pl = g.plants[uid];
  if (pl.f && _gdDayOf(pl.f) === m.today) return _gdNo('Fed today already: tomorrow it can have more');
  if (p.stage >= 4 && !p.def.yield) return _gdNo('Fully grown: save the feed for something younger');
  const lk = 'f.' + m.today + '.' + uid;
  const mark = _gdMark([['plants', uid], ['led', lk]]);
  pl.f = m.now; pl.fb = (Number(pl.fb) || 0) + 12;
  g.led[lk] = { d: m.today, k: 'f', i: { fertiliser: -1 }, x: 1, n: 1 };
  { const q = gardenPlantById(m, uid); _gdEmit('feed', { uid, x: q ? q.x : 0, y: q ? q.y : 0, fp: q ? q.fp : 1 }); }
  return _gdDone(`Fed the ${p.def.name.toLowerCase().replace(/^the /, '')}: half a day’s growth`, 'feeding', mark, { icon: 'flask-conical' });
}
function gardenPrune(uid) {
  { const v = _gdvAsk('weed', { uid }); if (v) return v; }
  const m = gardenModel(), p = gardenPlantById(m, uid);
  if (!p) return _gdNo('Nothing to trim there');
  if (p.stage < 3) return _gdNo('Too young for a trim');
  const g = _gdG(), pl = g.plants[uid];
  if (pl.pr && m.now - pl.pr < 20 * _GD_H) return _gdNo('Trimmed today already');
  const rnd = gardenRand('gd-prune|' + uid + '|' + m.today);
  const luck = m.decor.some(d => d.def.effect && d.def.effect.kind === 'luck') ? 0.05 : 0;
  const cut = p.def.price > 0 && !p.def.unlock && rnd() < (_gdOwnsTool('golden-shears') ? 0.5 : 0.25) + luck;
  const lk = 'r.' + m.today + '.' + uid;
  const mark = _gdMark([['plants', uid], ['led', lk]]);
  pl.pr = m.now;
  g.led[lk] = { d: m.today, k: 'r', x: 2, n: 1, i: cut ? { ['seed:' + p.def.id]: 1 } : undefined };
  _gdEmit('prune', { uid });
  return _gdDone(cut ? `A tidy trim, and a cutting: +1 ${p.def.name} seed` : `A tidy trim for the ${p.def.name.toLowerCase().replace(/^the /, '')}`, 'trimming', mark, { icon: 'scissors' });
}
/** Harvest one plant: its crop into your basket. */
function gardenHarvest(uid) {
  { const v = _gdvAsk('harvest', { uid }); if (v) return v; }
  const m = gardenModel(), p = gardenPlantById(m, uid);
  if (!p) return _gdNo('Nothing to harvest there');
  if (!p.def.yield) return _gdNo(`${p.def.name} is grown for its looks`);
  if (!p.ripe) return _gdNo(p.nextIn ? `Not ready yet: about ${_gdHoursLabel(p.nextIn)}` : 'Not ready yet');
  const r = _gdHarvestOne(m, p);
  _gdEmit('harvest', { id: p.def.id, n: r.n, x: p.x, y: p.y, fp: p.fp, gold: !!r.gold });
  return _gdDone(`Picked ${r.n} ${r.what}${r.extra}`, 'harvesting', r.mark, { icon: 'shopping-basket' });
}
/** Every ripe plant at once: one save, one Undo. */
function gardenHarvestAll() {
  { const v = _gdvAsk('harvestAll', {}); if (v) return v; }
  const m = gardenModel(), ready = m.plants.filter(p => p.ripe && p.def.yield);
  if (!ready.length) return _gdNo('Nothing is ready to pick yet');
  const marks = [];
  let items = 0, extra = '';
  for (const p of ready) { const r = _gdHarvestOne(m, p); marks.push(...r.mark); items += r.n; if (r.extra && !extra) extra = r.extra; }
  _gdEmit('harvest', { n: items, plants: ready.length, cells: ready.map(p => [p.x, p.y, p.fp, p.def.id]) });
  return _gdDone(`Harvested ${ready.length} plant${ready.length === 1 ? '' : 's'}: ${items} into your basket${extra}`, 'the harvest', marks, { icon: 'shopping-basket' });
}
/** o.visitor: a visitor picks (their share posts at once, no Undo of yours applies, and 94-garden-live-3host.js keeps the diary). */
function _gdHarvestOne(m, p, o) {
  const g = _gdG(), y = p.def.yield, uid = p.uid, visitor = !!(o && o.visitor);
  const rnd = gardenRand('gd-harvest|' + uid + '|' + (p.hc || 0) + '|' + m.today);
  let n = y.n[0] + Math.floor(rnd() * (y.n[1] - y.n[0] + 1));
  if (_gdNearEffect(m.decor, p.x, p.y, p.fp, 'scare', 2) && rnd() < 0.5) n++;
  const items = { ['crop:' + p.def.id]: n };
  const luck = m.decor.some(d => d.def.effect && d.def.effect.kind === 'luck') ? 0.02 : 0;
  let extra = '';
  if ((p.def.cat === 'wild' || p.def.cat === 'flower') && rnd() < 0.01 + luck + (m.plants.some(q => q.def.id === 'four-leaf-clover') ? 0.02 : 0)) { items['seed:four-leaf-clover'] = 1; items.clover = 1; extra = ' · and a four-leaf clover!'; }
  else if (rnd() < 0.04 + luck) { const pool = _gdSeedPool(q => q.rarity === 'uncommon' || q.rarity === 'rare'); const id = pool[Math.floor(rnd() * pool.length)]; items['seed:' + id] = 1; extra = ` · a ${gardenPlant(id).name} seed fell out`; }
  // 2.18.1: now and then a golden harvest, double (a small surprise; seeded so every device agrees)
  const gold = gardenRand('gd-gold|' + uid + '|' + (p.hc || 0) + '|' + m.today)() < 0.06;
  if (gold) { items['crop:' + p.def.id] = n * 2; n *= 2; extra += ' · a golden harvest, double!'; }
  const lk = 'h.' + m.today + '.' + uid + '.' + (p.hc || 0);
  const mark = _gdMark([['plants', uid], ['led', lk], ['disc', 'four-leaf-clover']]);
  mark.push(..._gdCropShare(g.plants[uid], uid, items, !visitor));   // a friend planted it: their share goes by post
  if (!visitor) mark.push(..._gdLiveTouched(uid));
  g.led[lk] = { d: m.today, k: 'h', i: items, x: 3, n: 1 };
  if (items.clover && !g.disc['four-leaf-clover']) g.disc['four-leaf-clover'] = m.today;
  const pl = g.plants[uid];
  if (y.regrow > 0) { pl.hv = m.now; pl.hc = (Number(pl.hc) || 0) + 1; }
  else delete g.plants[uid];
  const what = y.item || (p.def.cat === 'flower' || p.def.cat === 'wild' || p.def.cat === 'water' ? `${p.def.name.toLowerCase()} stems` : p.def.name.toLowerCase());
  return { mark, n, extra, what, gold };
}
function gardenDig(uid) {
  { const v = _gdvAsk('dig', { uid }); if (v) return v; }
  const m = gardenModel(), p = gardenPlantById(m, uid);
  if (!p) return _gdNo('Nothing to dig up there');
  if (p.def.special === 'heart') return _gdNo('The old oak stays: it is your garden’s heart');
  const mark = [..._gdMark([['plants', uid]]), ..._gdLiveTouched(uid)];
  delete _gdG().plants[uid];
  return _gdDone(`Dug up the ${p.def.name.toLowerCase().replace(/^the /, '')}`, 'digging up', mark, { icon: 'shovel' });
}
function gardenMovePlant(uid, x, y) {
  { const v = _gdvAsk('move', { uid, x, y }); if (v) return v; }
  const m = gardenModel(), p = gardenPlantById(m, uid);
  if (!p) return _gdNo('Nothing to move');
  if (p.x === x && p.y === y) return { ok: true, msg: '' };
  const why = _gdPlaceOk(m, p.def, x, y, 'plant', uid); if (why) return _gdNo(why);
  const mark = _gdMark([['plants', uid]]);
  const pl = _gdG().plants[uid]; pl.x = x; pl.y = y;
  return _gdDone(`Moved the ${p.def.name.toLowerCase().replace(/^the /, '')}`, 'moving', mark, { icon: 'move' });
}
function gardenPlaceDecor(decorId, x, y, r) {
  { const v = _gdvAsk('place', { id: decorId, x, y, r }); if (v) return v; }
  const def = gardenDecor(decorId); if (!def) return _gdNo('Unknown decoration');
  if (gardenHas('decor:' + decorId) < 1) return _gdNo(`You have no ${def.name.toLowerCase()} to place: the shop has them`);
  const m = gardenModel();
  const why = _gdPlaceOk(m, def, x, y, 'decor'); if (why) return _gdNo(why);
  const uid = _gdUid('d');
  const mark = _gdMark([['decor', uid], ['disc', def.id]]);
  const g = _gdG();
  g.decor[uid] = { d: def.id, x, y, r: def.rot ? ((Number(r) || 0) & 3) : 0, v: 0, at: m.now };
  if (!g.disc[def.id]) g.disc[def.id] = m.today;
  _gdEmit('decor', { id: def.id });
  return _gdDone(`Placed ${_gdA(def.name)}`, 'placing ' + def.name.toLowerCase(), mark, { icon: 'armchair' });
}
function gardenMoveDecor(uid, x, y) {
  { const v = _gdvAsk('move', { uid, x, y }); if (v) return v; }
  const m = gardenModel(), d = gardenDecorById(m, uid);
  if (!d) return _gdNo('Nothing to move');
  if (d.x === x && d.y === y) return { ok: true, msg: '' };
  const why = _gdPlaceOk(m, d.def, x, y, 'decor', uid); if (why) return _gdNo(why);
  const mark = _gdMark([['decor', uid]]);
  const e = _gdG().decor[uid]; e.x = x; e.y = y; e.at = m.now;
  return _gdDone('', 'moving ' + d.def.name.toLowerCase(), mark, { quiet: true });
}
function gardenRotateDecor(uid) {
  { const v = _gdvAsk('turn', { uid }); if (v) return v; }
  const m = gardenModel(), d = gardenDecorById(m, uid);
  if (!d) return _gdNo('Nothing to turn');
  if (!d.def.rot && !(d.def.v > 1)) return _gdNo(`${d.def.name} looks the same every way round`);
  const mark = _gdMark([['decor', uid]]);
  const e = _gdG().decor[uid];
  if (d.def.rot) e.r = ((Number(e.r) || 0) + 1) & 3; else e.v = ((Number(e.v) || 0) + 1) % d.def.v;
  e.at = m.now;
  return _gdDone('', 'turning ' + d.def.name.toLowerCase(), mark, { quiet: true });
}
/** Next style of a decoration (v styles). */
function gardenStyleDecor(uid) {
  { const v = _gdvAsk('turn', { uid, style: true }); if (v) return v; }
  const m = gardenModel(), d = gardenDecorById(m, uid);
  if (!d || !(d.def.v > 1)) return _gdNo('Only one style');
  const mark = _gdMark([['decor', uid]]);
  const e = _gdG().decor[uid]; e.v = ((Number(e.v) || 0) + 1) % d.def.v; e.at = m.now;
  return _gdDone('', 'restyling ' + d.def.name.toLowerCase(), mark, { quiet: true });
}
function gardenRemoveDecor(uid) {
  { const v = _gdvAsk('take', { uid }); if (v) return v; }
  const m = gardenModel(), d = gardenDecorById(m, uid);
  if (!d) return _gdNo('Nothing to put away');
  const mark = [..._gdMark([['decor', uid]]), ..._gdDecorBack(_gdG().decor[uid], true), ..._gdLiveTouched(uid)];   // a friend's goes back to them
  delete _gdG().decor[uid];
  return _gdDone(`Put the ${d.def.name.toLowerCase()} back in your bag`, 'putting away', mark, { icon: 'package' });
}
/** The price of something in the shop (null = not for sale now) and why not. */
function gardenPriceOf(item, mArg) {
  const m = mArg || gardenModel(), uc = gardenUnlockCtx(m);
  const [kind, id] = String(item).includes(':') ? String(item).split(':') : ['tool', String(item)];
  if (kind === 'seed') {
    const p = gardenPlant(id); if (!p) return { price: null, why: 'Unknown' };
    // rare seeds (an achievement, a ribbon or an event) are sold once unlocked; found ones never are
    if (p.unlock && p.unlock.find) return { price: null, why: gardenLockOf(p, uc) };
    const why = gardenLockOf(p, uc);
    const base = p.price || ({ rare: 40, epic: 60, legendary: 120 }[p.rarity] || 40);
    const deal = gardenDailyDeal(m.today);
    return { price: deal === p.id ? Math.max(1, Math.round(base / 2)) : base, why, deal: deal === p.id };
  }
  if (kind === 'decor') { const d = gardenDecor(id); if (!d) return { price: null, why: 'Unknown' }; if (d.craft) return { price: null, why: 'Made at the crafting bench' }; return { price: d.price, why: gardenLockOf(d, uc) }; }
  const t = gardenTool(id); if (!t) return { price: null, why: 'Unknown' };
  if (t.kind !== 'consumable' && _gdOwnsTool(t.id)) return { price: null, why: 'Yours already' };
  if (t.needs && !_gdOwnsTool(t.needs)) return { price: t.price, why: 'Needs the ' + gardenTool(t.needs).name.toLowerCase() };
  return { price: t.price, why: (t.lv || 1) > m.level.level ? 'Garden level ' + t.lv : '' };
}
/** Today's deal: one seed at half price, the same on every device. */
function gardenDailyDeal(iso) {
  const pool = GARDEN_PLANTS.filter(p => p.price > 0 && !p.unlock && p.rarity !== 'common');
  return pool[gardenHash('gd-deal|' + iso) % pool.length].id;
}
/** A piece of land for sale: {def, owned, cost, lvOk, afford}, or null. */
function gardenLandInfo(id, m) {
  const def = gardenArea(id); if (!def || !def.buy) return null;
  m = m || gardenModel();
  const owned = gardenHas('land:' + id) > 0;
  return { def, owned, cost: def.buy, lvOk: m.level.level >= def.lv, afford: m.wallet.coins >= def.buy };
}
/** Buy a piece of land with coins. One Undo; what grows on it stays where it is. */
function gardenBuyLand(id) {
  { const v = _gdvAsk('land', { id }); if (v) return v; }
  const info = gardenLandInfo(id); if (!info) return _gdNo('That land is not for sale');
  if (info.owned) return _gdNo('That land is already yours');
  if (!info.lvOk) return _gdNo(`${info.def.name} opens at garden level ${info.def.lv}`);
  const m = gardenModel();
  if (!info.afford) return _gdNo(`That costs ${info.cost} coins: you have ${m.wallet.coins}`);
  const lk = 'b.' + m.today + '.' + _gdUid(''), mark = _gdMark([['led', lk]]);
  _gdG().led[lk] = { d: m.today, k: 'b', c: -info.cost, i: { ['land:' + id]: 1 }, n: 1 };
  _gdEmit('land', { id, x: info.def.x, y: info.def.y, w: info.def.w, h: info.def.h });
  return _gdDone(`${info.def.name} is yours`, `buying ${info.def.name.toLowerCase()}`, mark, { icon: 'trees' });
}
function gardenBuy(item, n) {
  n = Math.max(1, Math.min(20, Math.floor(Number(n) || 1)));
  const m = gardenModel(), pr = gardenPriceOf(item, m);
  if (pr.price == null) return _gdNo(pr.why || 'Not for sale');
  if (pr.why) return _gdNo(pr.why);
  const isTool = !String(item).includes(':');
  const key = isTool ? (item === 'fertiliser' ? 'fertiliser' : 'tool:' + item) : String(item);
  if (isTool && item !== 'fertiliser') n = 1;
  const cost = pr.price * n, w = gardenWallet();
  if (w.coins < cost) return _gdNo(`That costs ${cost} coins: you have ${w.coins}`);
  const lk = 'b.' + m.today + '.' + _gdUid('');
  const id = key.split(':')[1] || key;
  const mark = _gdMark([['led', lk], ['disc', id]]);
  const g = _gdG();
  g.led[lk] = { d: m.today, k: 'b', c: -cost, i: { [key]: n }, n };
  if (key.startsWith('decor:') && !g.disc[id]) g.disc[id] = m.today;
  const name = key.startsWith('seed:') ? gardenPlant(id).name + ' seed' + (n > 1 ? 's' : '') : key.startsWith('decor:') ? gardenDecor(id).name : gardenTool(item).name;
  _gdEmit('buy', { item: key, n });
  return _gdDone(`Bought ${n > 1 ? n + ' ' : ''}${name} for ${cost} coins`, 'buying', mark, { icon: 'shopping-bag' });
}
/** What the market pays for one of an item (0 = it does not buy it). */
function gardenSellPrice(item, mArg) {
  const m = mArg || gardenModel(), [kind, id] = String(item).split(':');
  if (kind === 'craft') return typeof gardenCraftSellPrice === 'function' ? gardenCraftSellPrice(id, m) : 0;
  const boost = m.events.includes('harvest-home') ? 1.2 : 1;
  if (kind === 'crop') { const p = gardenPlant(id); return p && p.yield ? Math.max(1, Math.round(p.yield.sell * boost)) : 0; }
  if (kind === 'bq') { const b = GARDEN_BOUQUETS.find(x => x.id === id); return b ? Math.round((b.bonus + b.n * 3) * boost) : 0; }
  if (kind === 'decor') { const d = gardenDecor(id); return d ? Math.floor(d.price / 2) : 0; }
  if (item === 'honey') return Math.round(12 * boost);
  return 0;
}
function gardenSell(item, n, o) {
  o = o || {};
  if (String(item).startsWith('craft:') && typeof gardenCraftSell === 'function') return gardenCraftSell(item, n, o);   // 2.23: a little, and not much of it (94-garden-craft-0rules.js)
  const have = gardenHas(item);
  n = Math.max(1, Math.min(have, Math.floor(Number(n) || 1)));
  if (have < 1) return _gdNo('Nothing to sell');
  const m = gardenModel(), each = gardenSellPrice(item, m);
  if (!each) return _gdNo('The market does not buy that');
  const lk = 's.' + m.today + '.' + _gdUid('');
  const mark = _gdMark([['led', lk]]);
  _gdG().led[lk] = { d: m.today, k: 's', c: each * n, i: { [item]: -n }, n };
  _gdEmit('sell', { item, n });
  return _gdDone(o.quiet ? '' : `Sold ${n} for ${each * n} coins`, 'selling', mark, { icon: 'coins', quiet: o.quiet });
}
/** Make a bouquet from cut flowers in your basket: stems [{id}] (crop ids are plant ids). */
function gardenMakeBouquet(stems) {
  const list = (stems || []).filter(s => s && gardenPlant(s.id));
  const need = {};
  for (const s of list) need[s.id] = (need[s.id] || 0) + 1;
  for (const [id, k] of Object.entries(need)) if (gardenHas('crop:' + id) < k) return _gdNo(`Not enough ${gardenPlant(id).name.toLowerCase()} in your basket`);
  const b = gardenBouquetOf(list.map(s => ({ id: s.id, variant: 0 })));
  if (!b) return _gdNo('A bouquet needs at least three stems');
  const m = gardenModel(), lk = 'q.' + m.today + '.' + _gdUid('');
  const items = {}; for (const [id, k] of Object.entries(need)) items['crop:' + id] = -k;
  items['bq:' + b.id] = 1;
  const mark = _gdMark([['led', lk]]);
  _gdG().led[lk] = { d: m.today, k: 'q', i: items, x: 5, n: 1 };
  _gdEmit('bouquet', { id: b.id, stems: list.length });
  return Object.assign(_gdDone(`Made a ${b.name.toLowerCase()}`, 'the bouquet', mark, { icon: 'flower' }), { bouquet: b });
}
/** Send a bouquet as a gift (agent fun): a guarded hook. Returns true when a dialog opened. */
function gardenBouquetGift(bouquetId) {
  try {
    if (typeof funGiftDialog !== 'function') return false;
    const types = typeof FUN_GIFT_TYPES !== 'undefined' ? FUN_GIFT_TYPES : [];
    if (types.includes('bouquet')) { funGiftDialog(null, { t: 'bouquet', item: bouquetId }); return true; }
    const sticker = /rose/.test(bouquetId) ? 'blossom' : /sunflower/.test(bouquetId) ? 'sunflower' : /wild|pond/.test(bouquetId) ? 'plant' : 'sunflower';
    funGiftDialog(null, { t: 'sticker', item: sticker });
    return true;
  } catch (e) { return false; }
}
/** Collect from a decoration: the compost bin (fertiliser, daily), the beehive (honey, every two days while three
 * flowers bloom), the wishing well (a coin in, sometimes a seed back, daily). */
function gardenCollectInfo(uid, mArg) {
  const m = mArg || gardenModel(), d = gardenDecorById(m, uid), g = _gdG();
  if (!d || !d.def.effect || m.visit) return null;   // (a friend's hive is theirs)
  const k = d.def.effect.kind;
  if (k === 'compost') { const key = 'cp.' + m.today + '.' + uid; return { kind: k, key, ready: !g.led[key], label: 'Take the compost', soon: 'More compost tomorrow' }; }
  if (k === 'hive') {
    const slot = Math.floor(Date.parse(m.today + 'T12:00:00Z') / (2 * _GD_DAY)), key = 'hy.' + slot + '.' + uid;   // clock-ok: a two-day slot from the ISO day
    return { kind: k, key, ready: !g.led[key] && m.blooms >= 3, label: 'Collect the honey', soon: m.blooms < 3 ? 'The bees want three flowers in bloom' : 'More honey in a day or two' };
  }
  if (k === 'wish') { const key = 'wi.' + m.today; return { kind: k, key, ready: !g.led[key], label: 'Make a wish (1 coin)', soon: 'One wish a day' }; }
  return null;
}
function gardenCollect(uid) {
  { const v = _gdvAsk('collect', { uid }); if (v) return v; }
  const m = gardenModel(), info = gardenCollectInfo(uid, m);
  if (!info) return _gdNo('Nothing to collect');
  if (!info.ready) return _gdNo(info.soon);
  const g = _gdG(), mark = _gdMark([['led', info.key]]);
  let msg = '';
  if (info.kind === 'compost') { g.led[info.key] = { d: m.today, k: 'cp', i: { fertiliser: 1 }, n: 1 }; msg = 'One bag of fertiliser from the compost'; }
  else if (info.kind === 'hive') { g.led[info.key] = { d: m.today, k: 'hy', i: { honey: 1 }, x: 2, n: 1 }; msg = 'A jar of honey from the hive'; }
  else {
    if (gardenWallet().coins < 1) return _gdNo('A wish costs one coin');
    const rnd = gardenRand('gd-wish|' + m.today), r = rnd();
    let items = {}, c = -1;
    if (r < 0.03) { const pool = _gdSeedPool(p => p.rarity === 'rare'); const id = pool[Math.floor(rnd() * pool.length)]; items['seed:' + id] = 1; msg = `A wish comes true: a ${gardenPlant(id).name} seed`; }
    else if (r < 0.15) { const pool = _gdSeedPool(p => p.rarity === 'uncommon'); const id = pool[Math.floor(rnd() * pool.length)]; items['seed:' + id] = 1; msg = `Up comes a ${gardenPlant(id).name} seed`; }
    else if (r < 0.5) { const pool = _gdSeedPool(p => p.rarity === 'common'); const id = pool[Math.floor(rnd() * pool.length)]; items['seed:' + id] = 1; msg = `Up comes a ${gardenPlant(id).name} seed`; }
    else { const back = 5 + Math.floor(rnd() * 16); c += back; msg = `Splash. ${back} coins come back up`; }
    g.led[info.key] = { d: m.today, k: 'w', c, i: items, n: 1 };
  }
  _gdEmit('collect', { kind: info.kind });
  return _gdDone(msg, 'collecting', mark, { icon: info.kind === 'wish' ? 'sparkles' : info.kind === 'hive' ? 'hexagon' : 'recycle' });
}
function _gdHoursLabel(h) {
  if (h < 1) return 'within the hour';
  if (h < 20) return Math.round(h) + ' hour' + (Math.round(h) === 1 ? '' : 's');
  const d = Math.round(h / 24); return d + ' day' + (d === 1 ? '' : 's');
}

/* ---------- window.OpenDashGarden ---------- */
if (typeof window !== 'undefined') {
  window.OpenDashGarden = Object.freeze({
    snapshot: () => gardenSnapshot(),
    render: (el, snap, o) => (typeof gardenRender === 'function' ? gardenRender(el, snap, o) : null),
    wallet: () => { try { return gardenWallet(); } catch (e) { return null; } },
    stats: () => { try { const m = gardenModel(); return { level: m.level, plants: m.plants.length, blooms: m.blooms, ripe: m.ripe, thirsty: m.thirsty, visitors: m.visitors.map(v => v.id), season: m.season }; } catch (e) { return null; } },
    open: (tab) => { if (typeof setView === 'function') setView(tab ? 'garden:' + tab : 'garden'); },
    water: () => gardenWaterAll(), harvest: () => gardenHarvestAll(),
  });
}
/* A task finished: the garden grows (repaint), the water can fills, today's tasks may be done. */
if (typeof document !== 'undefined') {
  document.addEventListener('opendash:game', (e) => {
    const k = e && e.detail && e.detail.kind;
    if (k === 'award' || k === 'focus' || k === 'quest' || k === 'level') { _gd.memoKey = ''; _gd.walletKey = ''; gardenRepaintSoon(); gardenTickSoon(1500); }
  });
}

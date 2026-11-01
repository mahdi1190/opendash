/* ============================================================
   GARDEN, the land (the engine). Buying a feature, and what each one does; the things you find: the daily dig spot, forage, curios, the weekend cart.
   Tables: 94-garden-lands-0table.js; drawing: 94-garden-lands-2art.js; bubbles and the land office: 94-garden-lands-3page.js.

   Everything is kept the way the rest of the garden keeps it, so two devices add up and an older app is not upset:
     what you own        ledger items: 'land:<section>', 'feat:<feature>', 'cur:<curio>', 'sky:<star>', 'key:old'
     when you last did   one entry of g.seen each: 'ld.<feature>' = the day, week or season you last took from it. Not ledger keys: those fold into the bank after 40 days,
                         and a key that is gone would pay out twice.
   Every action returns {ok, msg} with one Undo, like the actions in 94-garden-1core.js. Nothing here is called on a visit: the page shows a friend's things read-only.
   Pure of the DOM: Node can evaluate it for the assistant (lib/agent-engine.mjs).
   ============================================================ */
const _GLD_DAY = 86400000;
function _gldKey(id) { return 'ld.' + id; }
function gardenLandOwnsFeature(id) { return gardenHas('feat:' + id) > 0; }
function _gldPay(label, msg, body, seen, icon) {
  const g = _gdG(), today = _gdToday(), lk = 'lc.' + today + '.' + _gdUid(''), rows = (seen || []).map(([k]) => ['seen', k]);
  const mark = _gdMark([['led', lk], ...rows]);
  g.led[lk] = Object.assign({ d: today, k: 'lc' }, body);
  for (const [k, v] of seen || []) { if (v === undefined) delete g.seen[k]; else g.seen[k] = v; }
  if (body.i && Object.keys(body.i).some(k => /^(cur|sky|key):/.test(k))) _gdEmit('landshow', {});   // a find that shows: friends in a live garden see it now
  return _gdDone(msg, label, mark, { icon: icon || 'sparkles' });
}
function _gldInt(seed, a, b) { return a + gardenHash(seed) % (b - a + 1); }
function _gldOwnedSections() { return GARDEN_LAND_SECTIONS.filter(s => gardenHas('land:' + s.id) > 0 || gardenHas('land:' + s.plot) > 0); }

/* ---------- the land you have, as a snapshot says it ---------- */
/** What shows of your finds, whether you are at home or it came in a snapshot: {c: curio ids and the key, z: stars logged, r: garden stars}. For the drawings. */
function gardenLandShowMine(m) { return { c: GARDEN_LAND_CURIOS.filter(c => gardenHas('cur:' + c.id) > 0).map(c => c.id).concat(gardenHas('key:old') > 0 ? [GARDEN_LAND_KEY_ID] : []), z: GARDEN_LAND_SKY.filter(c => gardenHas('sky:' + c.id) > 0).map(c => c.id), r: gardenLandOwnsFeature('lf-stars') ? gardenLandStars(m).stars : 0 }; }
function gardenLandShowOf(snap) { return { c: (snap && snap.lc) || [], z: (snap && snap.lz) || [], r: (snap && snap.lr) || 0 }; }
/** For gardenSnapshot: {areas (at most 12, and a plot you own part of, so an older friend can walk on your plants), ls, lf, lc, lz, lr}. */
function gardenLandsWire(m) {
  const ls = [], lf = [], plots = new Set();
  for (const a of GARDEN_AREAS) if (a.buy && gardenHas('land:' + a.id) > 0) { ls.push(a.id); plots.add(a.id); }
  for (const s of GARDEN_LAND_SECTIONS) if (gardenHas('land:' + s.id) > 0) { ls.push(s.id); plots.add(s.plot); }
  for (const f of GARDEN_LAND_FEATURES) if (f.x != null && gardenLandOwnsFeature(f.id)) lf.push(f.id);
  const areas = GARDEN_AREAS.filter(a => (a.buy ? plots.has(a.id) : m.areas.includes(a.id))).map(a => a.id);
  const S = gardenLandShowMine(m);
  return { areas, ls, lf, lc: S.c, lz: S.z, lr: S.r };
}

/* ---------- building ---------- */
function _gldFootprint(f) {
  if (f.does !== 'maze') { const out = []; for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) out.push([x, y]); return out; }
  const out = []; GARDEN_LAND_MAZE.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) if (row[dx] !== '.') out.push([f.x + dx, f.y + dy]); });
  return out;
}
/** {def, built, why ('' = you can buy it now), cost, spot (what is in the way)}. */
function gardenLandFeatureInfo(id, mArg) {
  const def = gardenLandFeature(id); if (!def) return null;
  const m = mArg || gardenModel(), built = gardenLandOwnsFeature(id);
  let why = '';
  if (!built) {
    const sec = def.sec ? gardenLandRow(def.sec) : null;
    if (m.level.level < def.lv) why = `Opens at garden level ${def.lv}`;
    else if (sec && !(gardenHas('land:' + sec.id) > 0 || gardenHas('land:' + sec.plot) > 0)) why = `Needs ${sec.name} (buy that land first)`;
  }
  let spot = '';
  if (!built && def.x != null) for (const [x, y] of _gldFootprint(def)) { const c = m.occ.get(x + ',' + y); if (c && (c.plant || c.decor)) { const p = c.plant ? gardenPlantById(m, c.plant) : gardenDecorById(m, c.decor); spot = (p && p.def.name) || 'Something'; break; } }
  return { def, built, why, spot, cost: def.cost, afford: m.wallet.coins >= def.cost };
}
function gardenBuildFeature(id) {
  { const v = _gdvAsk('land', { id }); if (v) return v; }
  const info = gardenLandFeatureInfo(id); if (!info) return _gdNo('That is not something you can build');
  if (info.built) return _gdNo('You have that already');
  if (info.why) return _gdNo(info.why);
  if (info.spot) return _gdNo(`${info.spot} is in the way: move it first`);
  const m = gardenModel();
  if (!info.afford) return _gdNo(`That costs ${info.cost} coins: you have ${m.wallet.coins}`);
  const lk = 'b.' + m.today + '.' + _gdUid(''), mark = _gdMark([['led', lk]]), d = info.def;
  _gdG().led[lk] = { d: m.today, k: 'b', c: _gdCost(info.cost), x: 10, i: { ['feat:' + id]: 1 }, n: 1 };
  _gdEmit('land', { id, x: d.x == null ? 30 : d.x, y: d.y == null ? 11 : d.y, w: d.w || 3, h: d.h || 1 });
  const done = _gdDone(`${d.name}: done`, `building ${d.name.toLowerCase()}`, mark, { icon: d.icon });
  gardenModel();   // (it stands in the world from this moment)
  return done;
}

/* ---------- helpers that just work ---------- */
function gardenLandWaterExtra(g, today) {
  let n = 0;
  for (const f of GARDEN_LAND_FEATURES) { if (f.water && gardenLandOwnsFeature(f.id)) n += f.water; if (f.dew && g.seen[_gldKey(f.id)] === today) n += f.dew; }
  return n;
}
/** When the spring rill last watered this plant: this morning at 06:00, or yesterday's. 0 when it does not reach. */
function gardenLandRillAt(pl, fp, now) {
  if (!gardenLandOwnsFeature('lf-rill')) return 0;
  const f = gardenLandFeature('lf-rill');
  if (pl.x + fp - 1 < f.x - f.r || pl.x > f.x + f.r || pl.y + fp - 1 < f.y - f.r || pl.y > f.y + f.r) return 0;
  const today = _gdDayOf(now);
  let t = _gdDayMs(today, 360); if (t > now) t = _gdDayMs(_gdAddDays(today, -1), 360);
  return t;
}
/** How fast you walk, as a share of normal: the stout boots, and not on a friend's land any differently. */
function gardenLandWalkK() { return gardenLandOwnsFeature('lf-boots') ? 1.25 : 1; }   // (they are your boots: the same on a friend's land)

/* ---------- what comes round: a stone, a bin, a hive, the dew ---------- */
function _gldPeriod(per, m) {
  if (per === 'day') return m.today;
  if (per === '2day') return String(Math.floor(Date.parse(m.today + 'T12:00:00Z') / (2 * _GLD_DAY)));   // clock-ok: a two-day slot from the ISO day
  if (per === 'week') return _gdWeekFrom(m.today);
  return m.today.slice(0, 4) + '-' + m.season;
}
const _GLD_SOON = Object.freeze({ day: 'Come back tomorrow', '2day': 'More in a day or two', week: 'Back again next week', season: 'Back next season' });
const _GLD_TOD = Object.freeze({ dawn: 'Only at dawn: come back then', night: 'Only after dark: come back at night' });
/** {ready, label, soon} for a feature that gives something now and then. */
function gardenLandCollectInfo(f, m) {
  const g = _gdG(), p = _gldPeriod(f.per, m), got = g.seen[_gldKey(f.id)] === p, wrong = f.tod && m.tod !== f.tod;
  return { ready: !got && !wrong, period: p, label: f.verb, soon: got ? _GLD_SOON[f.per] : wrong ? _GLD_TOD[f.tod] : '' };
}
function gardenLandCollect(id) {
  { const v = _gdvAsk('collect', { uid: id }); if (v) return v; }
  const f = gardenLandFeature(id), m = gardenModel();
  if (!f || !f.per || !gardenLandOwnsFeature(id)) return _gdNo('Nothing to take');
  const info = gardenLandCollectInfo(f, m); if (!info.ready) return _gdNo(info.soon);
  const G = f.give || {}, body = {}, bits = [];
  if (G.coins) { body.c = _gldInt('lc|' + id + '|' + m.today, G.coins[0], G.coins[1]); bits.push(`${body.c} coins`); }
  if (G.x) body.x = G.x;
  if (G.i) { body.i = _gdResolve(G.i, 'lc|' + id + '|' + info.period); for (const k of Object.keys(body.i)) bits.push(_gldItemName(k)); }
  if (G.season) { const sid = GARDEN_LAND_SEASON_SEED[m.season]; body.i = { ['seed:' + sid]: 1 }; bits.push(_gldItemName('seed:' + sid)); }
  if (G.dew) bits.push(`${G.dew} more cans of water today`);
  if (G.x >= 50) bits.push(`${G.x} experience`);
  return _gldPay(f.name.toLowerCase(), bits.length ? `${f.name}: ${bits.join(', ')}` : f.name, body, [[_gldKey(id), info.period]], f.icon);
}
function _gldItemName(k) {
  const [kind, id] = String(k).split(':');
  if (kind === 'seed') { const p = gardenPlant(id); return p ? `a ${p.name.toLowerCase()} seed` : 'a seed'; }
  if (kind === 'crop') { const p = gardenPlant(id); return p ? p.name.toLowerCase() : 'something'; }
  if (k === 'fertiliser') return 'a bag of fertiliser';
  if (k === 'honey') return 'a jar of honey';
  if (kind === 'decor') { const d = gardenDecor(id); return d ? d.name.toLowerCase() : 'a decoration'; }
  return 'something';
}

/* ---------- things that turn one thing into another ---------- */
/** {state: 'empty' | 'busy' | 'ready', pay, left (hours), have (what you could put in: [[key, n]]), haveN}. */
function gardenLandMachineInfo(f, m) {
  const st = _gdG().seen['ldm.' + f.id];
  if (st && typeof st === 'object') { const left = (Number(st.at) + f.hours * 3600000 - m.now) / 3600000; return { state: left > 0 ? 'busy' : 'ready', pay: Number(st.pay) || 0, left }; }
  const have = Object.entries(m.wallet.items).filter(([k, n]) => { if (!k.startsWith('crop:') || n <= 0) return false; const p = gardenPlant(k.slice(5)); return p && p.cat === f.input && p.yield; }).sort((a, b) => b[1] - a[1]);
  return { state: 'empty', have, haveN: have.reduce((s, [, n]) => s + Math.floor(n), 0) };
}
function gardenLandMachineLoad(id) {
  { const v = _gdvAsk('take', { uid: id }); if (v) return v; }
  const f = gardenLandFeature(id), m = gardenModel(); if (!f || f.does !== 'machine' || !gardenLandOwnsFeature(id)) return _gdNo('Not here');
  const info = gardenLandMachineInfo(f, m);
  if (info.state !== 'empty') return _gdNo('It is busy');
  if (info.haveN < f.n) return _gdNo(`It needs ${f.n} ${f.input === 'fruit' ? 'pieces of fruit' : 'bunches of herbs'}: you have ${info.haveN}`);
  let need = f.n, pay = 0; const i = {};
  for (const [k, n] of info.have) { const take = Math.min(need, Math.floor(n)); if (take <= 0) continue; i[k] = -take; pay += take * gardenPlant(k.slice(5)).yield.sell; need -= take; if (!need) break; }
  pay = Math.ceil(pay * f.mult);
  return _gldPay(f.name.toLowerCase(), `${f.name}: on the go, ${pay} coins when it is done`, { i }, [['ldm.' + id, { at: Math.floor(m.now), pay }]], f.icon);
}
function gardenLandMachineTake(id) {
  { const v = _gdvAsk('take', { uid: id }); if (v) return v; }
  const f = gardenLandFeature(id), m = gardenModel(); if (!f || f.does !== 'machine') return _gdNo('Not here');
  const info = gardenLandMachineInfo(f, m);
  if (info.state !== 'ready') return _gdNo(info.state === 'busy' ? 'Not ready yet' : 'Nothing in it');
  return _gldPay(f.name.toLowerCase(), `${f.name}: ${info.pay} coins`, { c: info.pay, x: 4 }, [['ldm.' + id, undefined]], f.icon);
}
/** Five common seeds for a better one, once a day. */
function gardenLandSwapInfo(m) {
  const done = _gdG().seen[_gldKey('lf-swap')] === m.today;
  const have = Object.entries(m.wallet.items).filter(([k, n]) => { if (!k.startsWith('seed:') || n <= 0) return false; const p = gardenPlant(k.slice(5)); return p && p.rarity === 'common'; }).sort((a, b) => b[1] - a[1]);
  return { done, have, haveN: have.reduce((s, [, n]) => s + Math.floor(n), 0) };
}
function gardenLandSwap() {
  { const v = _gdvAsk('take', { uid: 'lf-swap' }); if (v) return v; }
  const m = gardenModel(), s = gardenLandSwapInfo(m);
  if (!gardenLandOwnsFeature('lf-swap')) return _gdNo('Not here');
  if (s.done) return _gdNo('One swap a day: come back tomorrow');
  if (s.haveN < 5) return _gdNo(`The shelf wants 5 common seeds: you have ${s.haveN}`);
  let need = 5; const i = {};
  for (const [k, n] of s.have) { const take = Math.min(need, Math.floor(n)); if (take <= 0) continue; i[k] = -take; need -= take; if (!need) break; }
  const got = _gdResolve({ 'seed:*rare': 1 }, 'swap|' + m.today);
  for (const [k, n] of Object.entries(got)) i[k] = (i[k] || 0) + n;
  return _gldPay('swapping seeds', `Seed swap: ${_gldItemName(Object.keys(got)[0])}`, { i, x: 3 }, [[_gldKey('lf-swap'), m.today]], 'sprout');
}
/** This week's request on the board: the same on every device. */
function gardenLandHelpInfo(m) {
  const wk = _gdWeekFrom(m.today), pool = GARDEN_PLANTS.filter(p => p.yield && p.price > 0 && !p.unlock && (p.lv || 1) <= m.level.level && ['veg', 'fruit', 'herb', 'flower'].includes(p.cat));
  const p = pool[gardenHash('ld-help|' + wk) % pool.length], n = 4 + gardenHash('ld-help-n|' + wk) % 4;
  const pay = Math.ceil(p.yield.sell * n * 2.5) + 10;
  return { plant: p, n, pay, wk, done: _gdG().seen[_gldKey('lf-help')] === wk, have: Math.floor(m.wallet.items['crop:' + p.id] || 0) };
}
function gardenLandHelp() {
  { const v = _gdvAsk('take', { uid: 'lf-help' }); if (v) return v; }
  const m = gardenModel(), H = gardenLandHelpInfo(m);
  if (!gardenLandOwnsFeature('lf-help')) return _gdNo('Not here');
  if (H.done) return _gdNo('Done for this week: there will be a new note next week');
  if (H.have < H.n) return _gdNo(`Wanted: ${H.n} ${H.plant.name.toLowerCase()}. You have ${H.have}`);
  const i = { ['crop:' + H.plant.id]: -H.n }, curio = gardenHash('ld-help-c|' + H.wk) % 3 === 0 ? _gldNextCurio('help|' + H.wk) : null;
  if (curio) i['cur:' + curio.id] = 1;
  return _gldPay('helping out', `Thank you! ${H.pay} coins${curio ? ` and something odd: ${curio.name.toLowerCase()}` : ''}`, { c: H.pay, x: 20, i }, [[_gldKey('lf-help'), H.wk]], 'flag');
}

/* ---------- the savings oak: bury coins, and in a week they come back with a little more ---------- */
const GARDEN_LAND_OAK = Object.freeze({ days: 7, share: 0.12, sums: Object.freeze([50, 100, 200, 300]) });
function gardenLandOakInfo(m) {
  const st = _gdG().seen['ldo'];
  if (!st || typeof st !== 'object' || !(Number(st.c) > 0)) return { state: 'empty' };
  const left = (Number(st.at) + GARDEN_LAND_OAK.days * _GLD_DAY - m.now) / _GLD_DAY, c = Number(st.c), back = c + Math.round(c * GARDEN_LAND_OAK.share);
  return { state: left > 0 ? 'busy' : 'ready', c, back, left };
}
function gardenLandOakBury(sum) {
  { const v = _gdvAsk('take', { uid: 'lf-oak' }); if (v) return v; }
  const m = gardenModel(); sum = Math.floor(Number(sum) || 0);
  if (!gardenLandOwnsFeature('lf-oak')) return _gdNo('Not here');
  if (!GARDEN_LAND_OAK.sums.includes(sum)) return _gdNo('Not that much');
  if (gardenLandOakInfo(m).state !== 'empty') return _gdNo('There are coins under it already');
  if (m.wallet.coins < sum) return _gdNo(`You have ${m.wallet.coins} coins`);
  return _gldPay('burying coins', `${sum} coins under the oak. Back in a week, with a little more`, { c: _gdCost(sum) }, [['ldo', { c: sum, at: Math.floor(m.now) }]], 'coins');
}
/** Dig them up: with the extra after a week, or just what you put in before that (nothing is ever lost). */
function gardenLandOakDig() {
  { const v = _gdvAsk('take', { uid: 'lf-oak' }); if (v) return v; }
  const m = gardenModel(), O = gardenLandOakInfo(m);
  if (O.state === 'empty') return _gdNo('Nothing buried');
  const back = O.state === 'ready' ? O.back : O.c;
  return _gldPay('digging up coins', `${back} coins from under the oak`, { c: _gdG().inf === 1 ? 0 : back, x: O.state === 'ready' ? 5 : 0 }, [['ldo', undefined]], 'coins');
}

/* ---------- collections ---------- */
function gardenLandCurioCount() { return GARDEN_LAND_CURIOS.filter(c => gardenHas('cur:' + c.id) > 0).length; }
function gardenLandSkyCount() { return GARDEN_LAND_SKY.filter(c => gardenHas('sky:' + c.id) > 0).length; }
function _gldNextCurio(seed) { const left = GARDEN_LAND_CURIOS.filter(c => gardenHas('cur:' + c.id) < 1); return left.length ? left[gardenHash('ld-cur|' + seed) % left.length] : null; }
/** The next reward on a list of [count, coins] not yet paid: {n, c, key} or null. */
function _gldMilestone(name, count) {
  const seen = _gdG().seen;
  for (const [n, c] of GARDEN_LAND_MILESTONES[name]) if (count >= n && !seen['ldp.' + name + '.' + n]) return { n, c, key: 'ldp.' + name + '.' + n };
  return null;
}
function gardenLandMilestoneTake(name, count) {
  const ms = _gldMilestone(name, count); if (!ms) return _gdNo('Nothing to collect yet');
  return _gldPay('a reward', `${ms.c} coins`, { c: ms.c, x: 20 }, [[ms.key, _gdToday()]], 'star');
}
/** Tonight's stars: the same on every device. */
function gardenLandSkyTonight(m) { return GARDEN_LAND_SKY[gardenHash('ld-sky|' + m.today) % GARDEN_LAND_SKY.length]; }
function gardenLandSkyLog() {
  { const v = _gdvAsk('take', { uid: 'lf-observatory' }); if (v) return v; }
  const f = gardenLandFeature('lf-observatory'), m = gardenModel(), info = gardenLandCollectInfo(f, m);
  if (!gardenLandOwnsFeature(f.id)) return _gdNo('Not here');
  if (!info.ready) return _gdNo(info.soon);
  const s = gardenLandSkyTonight(m), fresh = gardenHas('sky:' + s.id) < 1;
  return _gldPay('logging the stars', fresh ? `New in your star book: ${s.name}` : `${s.name} again, clear as anything`, { i: fresh ? { ['sky:' + s.id]: 1 } : {}, x: fresh ? 25 : 5 }, [[_gldKey(f.id), info.period]], 'star');
}
/** Garden points and stars: land, what you built, how many kinds grow, what you have placed. */
function gardenLandStars(m) {
  const kinds = new Set(m.plants.map(p => p.def.id)).size, placed = m.decor.filter(d => d.def.layer !== 'ground').length;
  const land = _gldOwnedSections().length, built = GARDEN_LAND_FEATURES.filter(f => gardenLandOwnsFeature(f.id)).length;
  const pts = land + built * 2 + Math.min(40, kinds) + Math.min(30, Math.floor(placed / 2)) + gardenLandCurioCount();
  const stars = GARDEN_LAND_STAR_AT.filter(n => pts >= n).length;
  return { pts, stars, next: GARDEN_LAND_STAR_AT[stars] || 0, land, built, kinds, placed };
}
/** The maze's chest: full once a week. */
function gardenLandChest() {
  { const v = _gdvAsk('take', { uid: 'lf-chest' }); if (v) return v; }
  const m = gardenModel(), wk = _gdWeekFrom(m.today);
  if (!gardenLandOwnsFeature('lf-maze')) return _gdNo('Not here');
  if (_gdG().seen[_gldKey('lf-chest')] === wk) return _gdNo('Empty for now: it fills up again next week');
  const c = _gldInt('ld-chest|' + wk, 60, 120), cur = _gldNextCurio('chest|' + wk), i = _gdResolve({ 'seed:*rare': 1 }, 'chest|' + wk);
  if (cur) i['cur:' + cur.id] = 1;
  return _gldPay('opening the chest', `In the chest: ${c} coins, ${_gldItemName(Object.keys(_gdResolve({ 'seed:*rare': 1 }, 'chest|' + wk))[0])}${cur ? ` and ${cur.name.toLowerCase()}` : ''}`, { c, x: 15, i }, [[_gldKey('lf-chest'), wk]], 'gift');
}

/* ---------- things you find ---------- */
/** Every cell a find could be on, in a fixed order (a day's spot does not move when you buy land elsewhere). */
const _GLD_FINDS = { cells: null };
function _gldFindCells() {
  if (_GLD_FINDS.cells) return _GLD_FINDS.cells;
  const out = [];
  for (let x = 32; x < GARDEN_WORLD.cols; x++) out.push([x, 12]);
  for (let y = 0; y < GARDEN_WORLD.rows; y++) for (let x = 28; x < GARDEN_WORLD.cols; x++) { const c = gardenLandCell(x, y); if (c && !c.pool) out.push([x, y]); }
  for (let y = 8; y < 11; y++) for (let x = 1; x < 20; x++) out.push([x, y]);
  return (_GLD_FINDS.cells = out);
}
function _gldSpotOk(m, x, y) { if (String(gardenAreaAt(x, y, m.level.level)).startsWith('locked:') || gardenIsWater(x, y) || gardenPropAt(x, y)) return false; const c = m.occ.get(x + ',' + y); return !(c && (c.plant || c.decor)); }
/** Today's dig spot: {x, y}, or null once it is dug. */
function gardenLandDigSpot(m) {
  if (_gdG().seen[_gldKey('dig')] === m.today || m.visit) return null;
  const cells = _gldFindCells(), rnd = gardenRand('ld-dig|' + m.today);
  for (let i = 0; i < 60; i++) { const [x, y] = cells[Math.floor(rnd() * cells.length)]; if (_gldSpotOk(m, x, y)) return { x, y }; }
  return null;
}
function gardenLandDig() {
  { const v = _gdvAsk('take', { uid: 'dig' }); if (v) return v; }
  const m = gardenModel(), g = _gdG();
  if (g.seen[_gldKey('dig')] === m.today) return _gdNo('Nothing more here today');
  const rnd = gardenRand('ld-dig-find|' + m.today), r = rnd(), seen = [[_gldKey('dig'), m.today]];
  // the old key: from level 12, in a week or two of digging, for the walled garden
  if (m.level.level >= 12 && gardenHas('key:old') < 1) {
    const tries = (Number(g.seen['ld.keyn']) || 0) + 1;
    if (tries >= 4 || gardenHash('ld-key|' + m.today) % 4 === 0) return _gldPay('digging', 'An old iron key! There is a walled garden on the grove side with a rusty gate', { i: { 'key:old': 1 }, x: 15 }, seen, 'gift');
    seen.push(['ld.keyn', tries]);
  }
  const cur = r < 0.3 ? _gldNextCurio('dig|' + m.today) : null;
  if (cur) return _gldPay('digging', `You dug up ${cur.name.toLowerCase()}. ${cur.blurb}`, { i: { ['cur:' + cur.id]: 1 }, x: 6 }, seen, 'gift');
  if (r < 0.55) { const i = _gdResolve({ 'seed:*': 1 }, 'dig|' + m.today); return _gldPay('digging', `You dug up ${_gldItemName(Object.keys(i)[0])}`, { i, x: 3 }, seen, 'sprout'); }
  if (r < 0.65) return _gldPay('digging', 'You dug up a bag of fertiliser', { i: { fertiliser: 1 }, x: 3 }, seen, 'gift');
  const c = 5 + Math.floor(rnd() * 11);
  return _gldPay('digging', `You dug up ${c} coins`, { c, x: 3 }, seen, 'coins');
}
/** Today's forage (two at most, only in wild land of your own): [{i, x, y, item, name}]. */
function gardenLandForageSpots(m) {
  if (m.visit || m.level.level < 3) return [];
  const wild = _gldOwnedSections().filter(s => GARDEN_LAND_WILD.includes(s.kind)); if (!wild.length) return [];
  const st = _gdG().seen[_gldKey('forage')], taken = st && st.d === m.today ? st.n || [] : [], F = GARDEN_LAND_FORAGE[m.season], out = [];
  for (let i = 0; i < 2; i++) {
    if (taken.includes(i)) continue;
    const rnd = gardenRand('ld-forage|' + m.today + '|' + i), s = wild[Math.floor(rnd() * wild.length)];
    for (let t = 0; t < 8; t++) { const [x, y] = s.cells[Math.floor(rnd() * s.cells.length)]; if (_gldSpotOk(m, x, y)) { out.push({ i, x, y, item: F.item, name: F.name }); break; } }
  }
  return out;
}
function gardenLandForage(i) {
  { const v = _gdvAsk('take', { uid: 'forage' }); if (v) return v; }
  const m = gardenModel(), spot = gardenLandForageSpots(m).find(s => s.i === i); if (!spot) return _gdNo('Gone: come back tomorrow');
  const st = _gdG().seen[_gldKey('forage')], taken = st && st.d === m.today ? st.n || [] : [], items = { [spot.item]: 1 };
  const cur = gardenHash('ld-forage-c|' + m.today + i) % 6 === 0 ? _gldNextCurio('forage|' + m.today + i) : null;
  if (cur) items['cur:' + cur.id] = 1;
  return _gldPay('foraging', `You found ${spot.name}${cur ? ` and ${cur.name.toLowerCase()}` : ''}`, { i: items, x: 2 }, [[_gldKey('forage'), { d: m.today, n: taken.concat(i) }]], 'leaf');
}
/** The weekend cart: Saturdays and Sundays from level 6, three seeds and a decoration you might not have reached yet. [{key, name, price, bought}], or null when it is not here. */
function gardenLandCart(m) {
  if (m.visit || m.level.level < 6) return null;
  const dow = new Date(m.today + 'T12:00:00Z').getUTCDay();   // clock-ok: the weekday of an ISO day
  if (dow !== 0 && dow !== 6) return null;
  const wk = _gdWeekFrom(m.today), lim = m.level.level + 5, st = _gdG().seen[_gldKey('cart')], bought = st && st.w === wk ? st.b || [] : [];
  const seeds = _gdSeedPool(p => (p.rarity === 'uncommon' || p.rarity === 'rare') && (p.lv || 1) <= lim), decs = GARDEN_DECOR.filter(d => d.price > 0 && !d.craft && !d.unlock && (d.lv || 1) <= lim);
  const out = [], used = new Set();
  for (let i = 0; i < 3 && seeds.length; i++) { const id = seeds[gardenHash('ld-cart|' + wk + '|' + i) % seeds.length]; if (used.has(id)) continue; used.add(id); const p = gardenPlant(id); out.push({ key: 'seed:' + id, name: p.name + ' seed', price: Math.ceil((p.price || 40) * 1.5), bought: bought.includes('seed:' + id) }); }
  if (decs.length) { const d = decs[gardenHash('ld-cart-d|' + wk) % decs.length]; out.push({ key: 'decor:' + d.id, name: d.name, price: Math.ceil(d.price * 1.2), bought: bought.includes('decor:' + d.id) }); }
  return out;
}
function gardenLandCartBuy(key) {
  { const v = _gdvAsk('take', { uid: 'cart' }); if (v) return v; }
  const m = gardenModel(), list = gardenLandCart(m); if (!list) return _gdNo('The cart comes at the weekend');
  const row = list.find(r => r.key === key); if (!row) return _gdNo('Not on the cart this week');
  if (row.bought) return _gdNo('One of each, and that one has gone');
  if (m.wallet.coins < row.price) return _gdNo(`That costs ${row.price} coins: you have ${m.wallet.coins}`);
  const wk = _gdWeekFrom(m.today), st = _gdG().seen[_gldKey('cart')], b = st && st.w === wk ? st.b || [] : [];
  return _gldPay('buying from the cart', `${row.name}: yours`, { c: _gdCost(row.price), i: { [key]: 1 } }, [[_gldKey('cart'), { w: wk, b: b.concat(key) }]], 'store');
}

/* ---------- level ups ---------- */
/** New level: the trails it opens, and one line about what you can now buy. */
function gardenLandsTick(was, lv, moments) {
  for (const t of GARDEN_LAND_TRAILS) if (t.lv > was && t.lv <= lv) moments.push({ kind: 'area', text: `${t.name} is open`, icon: 'footprints', area: t.id });
  const n = GARDEN_LAND_SECTIONS.filter(s => s.lv > was && s.lv <= lv).length + GARDEN_LAND_FEATURES.filter(f => f.lv > was && f.lv <= lv).length;
  if (n) moments.push({ kind: 'grant', text: `${n} new thing${n === 1 ? '' : 's'} at the land office`, icon: 'map-pin' });
}

/* ============================================================
   GARDEN, fishing and bug catching: THE ENGINE (2.22). Everything is kept in state.garden, in the garden's own
   ledger and maps, so it syncs, folds and undoes like the rest (94-garden-1core.js):

     state.garden.fl   {fishId: {n, b (best cm), q (best quality), d (first day), l (last day), g (came as a gift)}}
     state.garden.bl   {bugId: {n, d, l, g}}
     state.garden.fd   {day: {c (fish landed: past GARDEN_CATCH_ECON.xpFish they earn no XP; before 2.34, casts), k: [bug sightings already caught], mf, mb (market coins at full rate), o: {orderId: 1}}}
     state.garden.prefs.{rod, net, bait, bobber, show: {f: [fishIds], b: [bugIds]}, px, py}
     ledger kinds      fc (a fish caught), bc (a bug netted), ct (a cast's bait), od (an order filled), gv (a catch given),
                       gu (a catch unwrapped), plus b (buying gear) and s (selling) as before
     items             fish:<id>-<q>, bug:<id>, gear:<id>, bait:<id>

   What the page does with these (casting, the reel, the net, the pier) is 94-garden-fish-3game.js; the book, the tackle shop,
   the market and the showcase are 94-garden-fish-4page.js. Calm rules, as everywhere in the garden: nothing is lost, a fish
   that gets away costs only the cast, and the market never shuts (past its daily appetite it pays a fifth).
   ============================================================ */
function _gcFd(g, day) { day = day || _gdToday(); if (!g.fd[day] || typeof g.fd[day] !== 'object') g.fd[day] = {}; return g.fd[day]; }
function _gcRand() { return Math.random(); }   // clock-ok: luck at the water, not a date

/* ---------- gear ---------- */
function gardenGearOwned(id) {
  const d = gardenGearDef(id); if (!d) return false;
  return !!d.own || gardenHas('gear:' + id) > 0;
}
function gardenGearBest(list) { let best = list[0]; for (const d of list) if (gardenGearOwned(d.id) && d.tier > best.tier) best = d; return best; }
function _gcPick(kind, list, pref) { const p = pref && list.find(d => d.id === pref); return p && gardenGearOwned(p.id) ? p : gardenGearBest(list); }
function gardenRod() { return _gcPick('rod', GARDEN_RODS, _gdG().prefs.rod); }
function gardenNet() { return _gcPick('net', GARDEN_NETS, _gdG().prefs.net); }
/** The bait you carry: the chosen one if you have some left, else the free worms. */
function gardenBait() {
  const id = _gdG().prefs.bait, d = id && GARDEN_BAITS.find(b => b.id === id);
  return d && (d.own || gardenHas('bait:' + d.id) > 0) ? d : GARDEN_BAITS[0];
}
function gardenBobberOwned(id) {
  const b = GARDEN_BOBBERS.find(x => x.id === id); if (!b) return false;
  if (b.unlock === 'start') return true;
  const [k, n] = b.unlock.split(':'), f = _gcFacts(), need = Number(n) || 0;
  return k === 'fish' ? f.fished >= need : k === 'species' ? f.fishSpecies >= need : k === 'rare' ? f.rareFish >= need : false;
}
function gardenBobber() { const id = _gdG().prefs.bobber, b = GARDEN_BOBBERS.find(x => x.id === id); return b && gardenBobberOwned(b.id) ? b : GARDEN_BOBBERS[0]; }
function gardenGearEquip(kind, id) {
  const g = _gdG();
  if (kind === 'bobber' ? !gardenBobberOwned(id) : !gardenGearOwned(id)) return _gdNo('You do not have that yet');
  if (g.prefs[kind] === id) return { ok: true, msg: '' };
  g.prefs[kind] = id; _gdSave(); _gdEmit('gear', { kind, id });
  return { ok: true, msg: '' };
}
/** Buy a rod or a net (once), or a pack of bait. */
function gardenGearBuy(id) {
  const d = gardenGearDef(id); if (!d) return _gdNo('Unknown gear');
  const m = gardenModel(), w = m.wallet;
  if (d.kind === 'bait') {
    if (d.own) return _gdNo('You always have those');
    if ((d.lv || 1) > m.level.level) return _gdNo('Garden level ' + d.lv);
    if (w.coins < d.price) return _gdNo(`That costs ${d.price} coins: you have ${w.coins}`);
    const lk = 'b.' + m.today + '.' + _gdUid('');
    const mark = _gdMark([['led', lk]]);
    _gdG().led[lk] = { d: m.today, k: 'b', c: _gdCost(d.price), i: { ['bait:' + id]: d.pack || 1 }, n: 1 };
    _gdEmit('buy', { item: 'bait:' + id, n: d.pack || 1 });
    return _gdDone(`Bought ${d.pack || 1} × ${d.name.toLowerCase()} for ${d.price} coins`, 'buying bait', mark, { icon: 'shopping-bag' });
  }
  if (gardenGearOwned(id)) return _gdNo('Yours already');
  if (d.ribbon) { const r = GARDEN_RIBBONS.find(x => x.id === d.ribbon); return _gdNo('A prize for the ribbon “' + (r ? r.label : d.ribbon) + '”'); }
  if ((d.lv || 1) > m.level.level) return _gdNo('Garden level ' + d.lv);
  const list = d.kind === 'rod' ? GARDEN_RODS : GARDEN_NETS, prev = d.kind === 'lake' ? (d.needs ? gardenGearDef(d.needs) : null) : list.find(x => x.tier === d.tier - 1);
  if (prev && !gardenGearOwned(prev.id)) return _gdNo('Needs the ' + prev.name.toLowerCase() + ' first');
  if (w.coins < d.price) return _gdNo(`That costs ${d.price} coins: you have ${w.coins}`);
  const lk = 'b.' + m.today + '.' + _gdUid('');
  const mark = _gdMark([['led', lk]]);
  _gdG().led[lk] = { d: m.today, k: 'b', c: _gdCost(d.price), i: { ['gear:' + id]: 1 }, n: 1 };
  const g = _gdG(); if (d.kind !== 'lake') g.prefs[d.kind] = id;     // the new one goes straight in your hand
  _gdEmit('buy', { item: 'gear:' + id, n: 1 });
  return _gdDone(`Bought the ${d.name.toLowerCase()} for ${d.price} coins`, 'buying a ' + d.kind, mark, { icon: 'shopping-bag' });
}

/* ---------- casts ---------- */
function gardenCastsInfo() {
  // (contests) in a fishing contest a cast uses no bait and keeps no fish (94-garden-live-7contest.js). There is no daily count of casts since 2.34: what limits you is the fish you can see
  return { free: typeof gardenContestLive === 'function' && !!gardenContestLive('fish') };
}
/** Can you cast at this water cell from where you stand? A walk is the page's job; this says how far the rod reaches. */
function gardenCastReach(rod) { return (rod || gardenRod()).st.range; }

/**
 * Cast: nothing is spent and nothing is decided; what bites is whichever fish in the water comes to the float (94-garden-fish-6school.js, gardenFishBite).
 * Returns {ok, zone, strike, bar, line, tier, qmax, baitDef, x, y, contest} or {ok: false, msg}.
 */
function gardenFishPlan(x, y) {
  const m = gardenModel(), zone = gardenWaterZone(x, y);
  if (!zone) return _gdNo('Nothing to fish in there');
  if (zone === 'pond' && !m.areas.includes('pond')) return _gdNo('The pond opens at garden level 7');
  const contest = gardenCastsInfo(m).free;
  const rod = gardenRod(), bait = contest ? GARDEN_BAITS[0] : gardenBait(), station = gardenWorkOwned('fishing-station');
  // chum goes in with the cast: it is spent whether or not anything comes
  if (!contest && bait.st.chum) { const today = _gdToday(); _gdG().led['ct.' + today + '.' + _gdUid('')] = { d: today, k: 'ct', i: { ['bait:' + bait.id]: -1 }, n: 1 }; _gdSave(); }
  return { ok: true, zone, strike: GARDEN_CATCH_ECON.strike + rod.st.react + (station ? 0.3 : 0), bar: rod.st.bar + (station ? 0.05 : 0), line: rod.st.line, spent: !!bait.st.chum, tier: rod.tier, qmax: rod.st.q, baitDef: bait, x, y, contest };
}
/** That very fish has bitten your line: the plan gets it, and a piece of bait is eaten (a cast that nothing took costs nothing). */
function gardenFishBite(plan, f) {
  plan.id = f.id; plan.def = f.def; plan.beh = f.def.beh; plan.cm = f.cm;
  // how hard: the kind of fish, then how big this one is for its kind (a giant of its kind fights up to 2 points harder), and a weak rod feels it more
  const span = Math.max(1, f.def.cm[1] - f.def.cm[0]), size = Math.max(0, Math.min(1, (f.cm - f.def.cm[0]) / span));
  plan.diff = f.def.diff ? Math.min(12, f.def.diff + size * 2) : 0;
  plan.line = plan.line * (1 + 0.1 * Math.max(0, plan.diff - (plan.tier || 1) * 2.2));
  const bait = plan.baitDef;
  if (plan.contest || !bait || bait.own || plan.spent) return;
  plan.spent = true;
  const today = _gdToday();
  _gdG().led['ct.' + today + '.' + _gdUid('')] = { d: today, k: 'ct', i: { ['bait:' + bait.id]: -1 }, n: 1 };
  _gdSave();
}
const _GC_XP = { common: 1, uncommon: 2, rare: 4, epic: 7, legendary: 12 };
/** A fish is landed: add it to the bag and the log. res {perfect}. Returns {ok, def, cm, q, isNew, record, coins?, items?}. */
function gardenCatchFish(plan, res) {
  res = res || {};
  const g = _gdG(), m = gardenModel(), def = plan.def || gardenFishDef(plan.id);
  if (!def) return _gdNo('That one got away');
  const today = m.today, rnd = _gcRand;
  const perfect = !!res.perfect;
  let q = 0;
  if (def.cat === 'fish') {
    if (perfect) q = Math.min(plan.qmax || 1, 1 + (rnd() < 0.35 ? 1 : 0) + (rnd() < 0.08 ? 1 : 0));
    else q = rnd() < 0.12 + 0.06 * (plan.tier || 1) ? Math.min(plan.qmax || 1, 1) : 0;
  }
  const cm = def.cat === 'fish' ? Math.max(def.cm[0], Math.min(def.cm[1], Math.round(Number(plan.cm) || def.cm[0]))) : 0;   // the size of the very fish you saw (a host's number is kept to what that kind can be)
  const key = gardenFishKey(def.id, q);
  const out = { ok: true, def, cm, q, perfect, isNew: false, record: false };
  if (plan.contest) return Object.assign(out, { contest: true });   // (contests) let go again: a contest fish is points and a story, never an item, a coin or a record
  const fdDay = _gcFd(g, today), landed = Number(fdDay.c) || 0;
  fdDay.c = landed + 1;
  const entry = { d: today, k: 'fc', n: 1, x: def.cat === 'fish' && landed < GARDEN_CATCH_ECON.xpFish ? (_GC_XP[def.rarity] || 1) + (perfect ? 1 : 0) : 0, i: {} };   // fishing has no limit; levelling from it has
  if (def.opens) {
    if (def.id === 'coin-purse') { out.coins = 20 + Math.floor(rnd() * 60); entry.c = out.coins; }
    else if (def.id === 'message-bottle') { const lk0 = _gdUid(''); out.items = _gdResolve({ 'seed:*rare': 1 }, 'bottle|' + lk0); entry.i = Object.assign({}, out.items); entry.c = 10; }
  } else entry.i[key] = 1;
  const lk = 'fc.' + today + '.' + _gdUid('');
  g.led[lk] = entry;
  const rec = g.fl[def.id];
  if (!rec) { g.fl[def.id] = { n: 1, b: cm, q, d: today, l: today }; out.isNew = true; }
  else { rec.n = (Number(rec.n) || 0) + 1; rec.l = today; if (cm > (Number(rec.b) || 0)) { rec.b = cm; out.record = def.cat === 'fish'; } if (q > (Number(rec.q) || 0)) rec.q = q; }
  _gdSave(); gardenTickSoon(); _gdEmit('catch', { kind: 'fish', id: def.id, cm, q, isNew: out.isNew });
  return out;
}

/* ---------- bugs ---------- */
function _gcWindow(now) { return Math.floor(now / 1200000); }   // 20 minutes: the same bugs on every device
/**
 * The bugs about right now (not yet caught): [{key, id, x, y (cells), hab}]. Seeded by the 20-minute window, so a reload shows
 * the same ones; a caught one stays gone until the window turns over. Where they live follows what you have grown.
 */
const GARDEN_BUGS_MAX = 6;   // the most at once, in a big, late garden. The owner, 1 Nov 2026: start with very few, and more as the garden grows, but never many
function gardenBugsNow(mArg) {
  const base = _gcBugsBase(mArg);
  if (typeof gardenContestBugsNow !== 'function') return base;
  const extra = gardenContestBugsNow(mArg || gardenModel());   // (contests) a bug contest shows a bug every few seconds, the same on every screen
  return extra.length ? base.concat(extra) : base;
}
function _gcBugsBase(mArg) {
  const m = mArg || gardenModel(), g = _gdG(), W = GARDEN_WORLD;
  if (gardenFun() === 'off') return [];
  const win = _gcWindow(m.now), rnd = gardenRand('gd-bugs|' + win);
  const caught = new Set((g.fd[m.today] && g.fd[m.today].k) || []);
  const blooms = m.plants.filter(p => p.stage >= 3 && ['flower', 'wild', 'exotic', 'herb'].includes(p.def.cat));
  const trees = m.plants.filter(p => p.def.cat === 'tree' && p.stage >= 3);
  const lights = m.decor.filter(d => d.def.effect && d.def.effect.kind === 'light');
  const hotels = m.decor.filter(d => d.def.effect && d.def.effect.kind === 'bugs').length;
  const woods = m.areas.includes('woods'), wet = !!m.rain.now;
  const free = (x, y) => !m.occ.has(x + ',' + y) && !gardenPropAt(x, y) && !gardenIsWater(x, y), onFlower = new Set();
  const spot = (hab) => {
    const pick = (list) => list[Math.floor(rnd() * list.length)];
    switch (hab) {
      case 'flower': { if (!blooms.length) return null; const p = pick(blooms); if (onFlower.has(p.uid)) return null; onFlower.add(p.uid); return { x: p.x + 0.5 + (rnd() - 0.5) * 0.5, y: p.y + 0.6 }; }   // one to a flower: a single daisy with three bees on it is a crowd
      case 'tree': { if (!trees.length) return null; const p = pick(trees); return { x: p.x + 0.9, y: p.y + 1.2 }; }
      case 'light': { if (lights.length) { const d = pick(lights); return { x: d.x + 0.5, y: d.y + 0.5 }; } return woods ? spot('woods') : null; }
      case 'water': { const lake = rnd() < 0.7 || !m.areas.includes('pond'); return lake ? { x: 1 + rnd() * (W.coreCols - 2), y: 13.2 + rnd() * 0.5 } : { x: 15 + rnd() * 4, y: 1.4 + rnd() }; }
      case 'woods': { if (!woods) return null; for (let i = 0; i < 12; i++) { const x = 20 + Math.floor(rnd() * 8), y = Math.floor(rnd() * 11); if (free(x, y)) return { x: x + 0.5, y: y + 0.5 }; } return null; }
      case 'ground': { for (let i = 0; i < 16; i++) { const x = Math.floor(rnd() * W.cols), y = Math.floor(rnd() * 13); const a = gardenAreaAt(x, y, m.level.level); if (!a.startsWith('locked:') && free(x, y)) return { x: x + 0.5, y: y + 0.5 }; } return null; }
      default: { for (let i = 0; i < 16; i++) { const x = Math.floor(rnd() * W.cols), y = 7 + Math.floor(rnd() * 5); if (free(x, y) && gardenAreaAt(x, y, m.level.level) === 'lawn') return { x: x + 0.5, y: y + 0.5 }; } return null; }   // lawn
    }
  };
  const habOk = (h) => h === 'flower' ? blooms.length > 0 : h === 'tree' ? trees.length > 0 : h === 'woods' ? woods : h === 'light' ? lights.length > 0 || woods : true;
  const ctx = { level: m.level.level, tod: m.tod, season: m.season, rain: wet, moon: gardenMoonPhase(m.today), decor: (id) => m.decor.some(d => d.def.id === id), plant: (id) => blooms.some(p => p.def.id === id), caught: (id) => !!g.bl[id] };
  if (typeof gardenEventOn === 'function') ctx.event = gardenEventOn;
  const pool = GARDEN_BUGS.filter(b => gardenBugFits(b, ctx) && b.hab.some(habOk));
  if (!pool.length) return [];
  // flowers bring them, up to what a garden of this level holds: 2 at the start, one more every 5 levels. A bug hotel adds one of its own
  const cap = Math.min(GARDEN_BUGS_MAX, 2 + Math.floor(m.level.level / 5) + Math.min(2, hotels));
  const n = Math.max(1, Math.min(cap, 1 + Math.floor(blooms.length / 8) + Math.floor(trees.length / 6) + (woods ? 1 : 0) + (m.tod === 'night' ? -1 : 0) + (wet ? -1 : 0)));
  const weights = pool.map(b => gardenBugWeight(b, ctx));
  const out = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    let r = rnd() * weights.reduce((a, b) => a + b, 0), k = 0;
    for (; k < pool.length - 1; k++) { r -= weights[k]; if (r <= 0) break; }
    const b = pool[k], habs = b.hab.filter(habOk), hab = habs[Math.floor(rnd() * habs.length)], want = b.needs && b.needs.plant ? blooms.find(p => p.def.id === b.needs.plant) : null, s = want ? { x: want.x + 0.5, y: want.y + 0.6 } : spot(hab);
    if (!s) continue;
    const key = win + '.' + out.length;
    if (caught.has(key)) { out.push(null); continue; }   // keeps the numbering stable when one is caught
    out.push({ key, id: b.id, x: s.x, y: s.y, hab, t: rnd() });
  }
  return out.filter(Boolean);
}
/** A bug is netted. Returns {ok, def, isNew}. */
function gardenCatchBug(actor) {
  const def = actor && gardenBugDef(actor.id); if (!def) return _gdNo('It got away');
  if (/^c[0-9a-z]{6,24}\.\d+$/.test(String(actor.key))) return { ok: true, def, isNew: false, contest: true };   // (contests) a contest bug is let go again: points, never an item
  const g = _gdG(), today = _gdToday(), fd = _gcFd(g, today);
  if (Array.isArray(fd.k) ? fd.k.includes(actor.key) : false) return _gdNo('It has gone');
  fd.k = (Array.isArray(fd.k) ? fd.k : []).concat(actor.key).slice(-60);
  g.led['bc.' + today + '.' + _gdUid('')] = { d: today, k: 'bc', n: 1, x: _GC_XP[def.rarity] || 1, i: { [gardenBugKey(def.id)]: 1 } };
  const rec = g.bl[def.id];
  let isNew = false;
  if (!rec) { g.bl[def.id] = { n: 1, d: today, l: today }; isNew = true; } else { rec.n = (Number(rec.n) || 0) + 1; rec.l = today; }
  _gdSave(); gardenTickSoon(); _gdEmit('catch', { kind: 'bug', id: def.id, isNew });
  return { ok: true, def, isNew };
}

/* ---------- the bag, the market and the order board ---------- */
/** What you carry: {fish: [{id, q, n, def}], bugs: [{id, n, def}], finds...}, newest kinds last, grouped. */
function gardenCatchBag() {
  const items = gardenWallet().items, fish = [], bugs = [];
  for (const [k, v] of Object.entries(items)) {
    const n = Math.floor(v); if (n < 1) continue;
    const fp = gardenFishParse(k);
    if (fp) { fish.push({ id: fp.id, q: fp.q, n, def: gardenFishDef(fp.id), key: k }); continue; }
    if (k.startsWith('bug:')) { const d = gardenBugDef(k.slice(4)); if (d) bugs.push({ id: d.id, n, def: d, key: k }); }
  }
  const order = (x) => GARDEN_FISH.findIndex(f => f.id === x.id);
  fish.sort((a, b) => order(a) - order(b) || b.q - a.q);
  bugs.sort((a, b) => GARDEN_BUGS.indexOf(a.def) - GARDEN_BUGS.indexOf(b.def));
  return { fish, bugs, nFish: fish.reduce((a, x) => a + x.n, 0), nBugs: bugs.reduce((a, x) => a + x.n, 0) };
}
/** One piece's price at the market (a fish is priced as one of middling size). */
function gardenCatchEach(item) {
  const fp = gardenFishParse(item);
  if (fp) { const d = gardenFishDef(fp.id); return gardenFishValue(fp.id, d.cat === 'fish' ? Math.round((d.cm[0] + d.cm[1]) / 2) : 0, fp.q); }
  if (String(item).startsWith('bug:')) return gardenBugValue(String(item).slice(4));
  return 0;
}
function gardenMarketInfo(mArg) {
  const m = mArg || gardenModel(), fd = _gdG().fd[m.today] || {}, E = GARDEN_CATCH_ECON;
  return { fishLeft: Math.max(0, E.marketFish - (Number(fd.mf) || 0)), bugsLeft: Math.max(0, E.marketBugs - (Number(fd.mb) || 0)), fishCap: E.marketFish, bugCap: E.marketBugs };
}
/** Sell n of a fish or bug. Full price while the market has appetite today, a fifth after. */
function gardenCatchSell(item, n, o) {
  o = o || {};
  const have = gardenHas(item);
  if (have < 1) return _gdNo('Nothing to sell');
  n = Math.max(1, Math.min(have, Math.floor(Number(n) || 1)));
  const each = gardenCatchEach(item);
  if (!each) return _gdNo('The market does not buy that');
  const m = gardenModel(), g = _gdG(), isBug = String(item).startsWith('bug:'), E = GARDEN_CATCH_ECON;
  const cap = isBug ? E.marketBugs : E.marketFish, field = isBug ? 'mb' : 'mf';
  const day = g.fd[m.today] && typeof g.fd[m.today] === 'object' ? g.fd[m.today] : null, used = Number(day && day[field]) || 0;
  const total = each * n, full = Math.max(0, Math.min(total, cap - used)), coins = Math.round(full + (total - full) * E.afterCap);
  const lk = 's.' + m.today + '.' + _gdUid('');
  const mark = _gdMark([['led', lk], ['fd', m.today]]);
  g.led[lk] = { d: m.today, k: 's', c: coins, i: { [item]: -n }, n };
  _gcFd(g, m.today)[field] = used + full;
  _gdEmit('sell', { item, n });
  return _gdDone(o.quiet ? '' : `Sold ${n} for ${coins} coins${full < total ? ' (the market has had its fill for today)' : ''}`, 'selling', mark, { icon: 'coins', quiet: o.quiet });
}
/** Sell all your fish (or all your bugs), keeping the best `keep` of each kind (the stars stay with you). Most valuable first, so the market's appetite goes on them. */
function gardenCatchSellAll(kind, keep) {
  const bag = gardenCatchBag(), isBug = kind === 'bug', kept = Math.max(0, Math.floor(Number(keep)) || 0);
  const by = new Map();
  for (const r of (isBug ? bag.bugs : bag.fish)) { if (!by.has(r.id)) by.set(r.id, []); by.get(r.id).push(r); }
  const sell = [];
  for (const list of by.values()) {
    list.sort((a, b) => (b.q || 0) - (a.q || 0));
    let hold = kept;
    for (const r of list) { const k = Math.min(hold, r.n); hold -= k; if (r.n - k > 0) sell.push({ key: r.key, n: r.n - k, each: gardenCatchEach(r.key) }); }
  }
  if (!sell.length) return _gdNo(isBug ? 'No spare bugs to sell' : 'No spare fish to sell');
  sell.sort((a, b) => b.each - a.each);
  const m = gardenModel(), g = _gdG(), E = GARDEN_CATCH_ECON, field = isBug ? 'mb' : 'mf', cap = isBug ? E.marketBugs : E.marketFish;
  const day = g.fd[m.today] && typeof g.fd[m.today] === 'object' ? g.fd[m.today] : null;
  let used = Number(day && day[field]) || 0, coins = 0, count = 0;
  const items = {};
  for (const r of sell) {
    const total = r.each * r.n, full = Math.max(0, Math.min(total, cap - used));
    coins += Math.round(full + (total - full) * E.afterCap); used += full; count += r.n; items[r.key] = -r.n;
  }
  const lk = 's.' + m.today + '.' + _gdUid('');
  const mark = _gdMark([['led', lk], ['fd', m.today]]);
  g.led[lk] = { d: m.today, k: 's', c: coins, i: items, n: count };
  _gcFd(g, m.today)[field] = used;
  _gdEmit('sell', { item: kind, n: count });
  return _gdDone(`Sold ${count} for ${coins} coins`, 'selling', mark, { icon: 'coins' });
}
function gardenOrdersNow(mArg) {
  const m = mArg || gardenModel(), fd = _gdG().fd[m.today] || {}, done = fd.o || {};
  const bag = gardenCatchBag();
  return gardenTradesFor(m.today, m.level.level).map(o => {
    const have = o.kind === 'bug' ? (bag.bugs.find(x => x.id === o.want) || { n: 0 }).n : bag.fish.filter(x => x.id === o.want).reduce((a, x) => a + x.n, 0);
    return Object.assign({}, o, { done: !!done[o.id], have, ok: have >= o.n, def: o.kind === 'bug' ? gardenBugDef(o.want) : gardenFishDef(o.want), reward: _gdResolve(o.i, 'ord|' + m.today + '|' + o.id) });
  });
}
function gardenOrderDo(id) {
  const m = gardenModel(), g = _gdG(), o = gardenOrdersNow(m).find(x => x.id === id);
  if (!o) return _gdNo('That order is not on the board today');
  if (o.done) return _gdNo('Already done today');
  if (!o.ok) return _gdNo(`Needs ${o.n} × ${o.def.name.toLowerCase()}`);
  const take = {};
  if (o.kind === 'bug') take['bug:' + o.want] = -o.n;
  else {
    let need = o.n;
    for (const r of gardenCatchBag().fish.filter(x => x.id === o.want).sort((a, b) => a.q - b.q)) { const k = Math.min(need, r.n); if (k > 0) { take[r.key] = -k; need -= k; } if (!need) break; }
  }
  const lk = 'od.' + m.today + '.' + _gdUid('');
  const mark = _gdMark([['led', lk], ['fd', m.today]]);
  const items = Object.assign({}, take); for (const [k, v] of Object.entries(o.reward || {})) items[k] = (items[k] || 0) + v;
  g.led[lk] = { d: m.today, k: 'od', c: o.c, x: 6, i: items, n: 1 };
  const fd = _gcFd(g, m.today); fd.o = Object.assign({}, fd.o || {}, { [id]: 1 });
  _gdEmit('order', { id });
  return _gdDone(`${o.who} was delighted: +${o.c} coins`, 'filling an order', mark, { icon: 'handshake' });
}

/* ---------- the showcase: your best of each kind goes in the tank and the case ---------- */
function gardenShowGet() {
  const p = _gdG().prefs.show, E = GARDEN_CATCH_ECON, g = _gdG();
  const f = Array.isArray(p && p.f) ? p.f.filter(id => g.fl[id] && gardenFishDef(id) && gardenFishDef(id).cat === 'fish').slice(0, E.showFish) : [];
  const b = Array.isArray(p && p.b) ? p.b.filter(id => g.bl[id] && gardenBugDef(id)).slice(0, E.showBugs) : [];
  return { f, b };
}
function gardenShowToggle(kind, id) {
  const g = _gdG(), E = GARDEN_CATCH_ECON, cur = gardenShowGet(), key = kind === 'bug' ? 'b' : 'f', max = kind === 'bug' ? E.showBugs : E.showFish;
  const list = cur[key].slice(), at = list.indexOf(id);
  if (at >= 0) list.splice(at, 1);
  else { if (kind === 'bug' ? !g.bl[id] : !g.fl[id]) return _gdNo('You have not caught that yet'); if (list.length >= max) return _gdNo(kind === 'bug' ? `The case holds ${max} bugs: take one out first.` : `The tank holds ${max} fish: take one out first.`); list.push(id); }
  g.prefs.show = Object.assign({}, cur, { [key]: list });
  _gdSave(); _gdEmit('show', { kind, id });
  return { ok: true, on: at < 0, msg: '' };
}
/** Your showcase with sizes from the log: {f: [[id, q, cm]], b: [id]}. */
function gardenShowEntries() {
  const g = _gdG(), s = gardenShowGet();
  return { f: s.f.map(id => [id, Math.max(0, Math.min(3, Number(g.fl[id].q) || 0)), Math.max(1, Math.round(Number(g.fl[id].b) || 1))]), b: s.b.slice() };
}
/** What goes to friends with the garden's snapshot (gardenSnapshot): the showcase and your gear, or null when there is nothing. */
function gardenShowWire() {
  const e = gardenShowEntries(), rod = gardenRod().tier, net = gardenNet().tier;
  if (!e.f.length && !e.b.length && rod < 2 && net < 2) return null;
  return { f: e.f, b: e.b, rod, net };
}

/* ---------- facts, for ribbons, daily tasks and the bobbers ---------- */
/** How many catches you have given to friends (parcels leave the bag as 'gs' ledger entries with fish: or bug: items). */
function _gcGiftCount(g) {
  let n = 0;
  for (const e of Object.values(g.led)) if (e && e.k === 'gs' && e.i && Object.keys(e.i).some(k => k.startsWith('fish:') || k.startsWith('bug:'))) n += Number(e.n) || 1;
  for (const e of Object.values(g.bank)) if (e && e.nn && e.nn.gifted) n += Number(e.nn.gifted) || 0;
  return n;
}
/** A friend's parcel of a fish or a bug was unwrapped: it joins your book too (so you can trade to fill the gaps). */
function gardenCatchReceived(k, item) {
  const g = _gdG(), today = _gdToday();
  if (k === 'fish') {
    const m = /^([a-z0-9-]+)-([0-3])$/.exec(String(item)), d = m && gardenFishDef(m[1]); if (!d) return;
    const q = Number(m[2]), r = g.fl[d.id];
    if (!r) g.fl[d.id] = { n: 0, b: Math.round((d.cm[0] + d.cm[1]) / 2), q, d: today, l: today, g: 1 };
    else if (q > (Number(r.q) || 0)) r.q = q;
  } else if (k === 'bug') {
    const d = gardenBugDef(item); if (!d) return;
    if (!g.bl[d.id]) g.bl[d.id] = { n: 0, d: today, l: today, g: 1 };
  }
}
function _gcFacts() {
  const g = _gdG(), w = gardenWallet();
  const fish = Object.keys(g.fl).map(gardenFishDef).filter(d => d && d.cat === 'fish');
  const bugs = Object.keys(g.bl).filter(id => gardenBugDef(id));
  const big = Object.keys(g.fl).some(id => { const d = gardenFishDef(id); return d && d.cat === 'fish' && (Number(g.fl[id].b) || 0) >= 100; });
  return {
    fished: w.n.fished, fishSpecies: fish.length, rareFish: fish.filter(d => ['rare', 'epic', 'legendary'].includes(d.rarity)).length, bigFish: big ? 1 : 0,
    netted: w.n.netted, bugSpecies: bugs.length, rareBugs: bugs.filter(id => ['rare', 'epic', 'legendary'].includes(gardenBugDef(id).rarity)).length,
    ordersDone: w.n.traded, catchGifts: _gcGiftCount(g), showcased: gardenShowGet().f.length + gardenShowGet().b.length,
  };
}
function gardenCatchFacts() { return _gcFacts(); }
/** Your fish log and bug book as rows (the book pages): every species with what you have of it. */
function gardenCatchLog() {
  const g = _gdG(), items = gardenWallet().items;
  const fish = GARDEN_FISH.map(d => ({ def: d, rec: g.fl[d.id] || null, held: [0, 1, 2, 3].reduce((a, q) => a + Math.floor(items[gardenFishKey(d.id, q)] || 0), 0) }));
  const bugs = GARDEN_BUGS.map(d => ({ def: d, rec: g.bl[d.id] || null, held: Math.floor(items[gardenBugKey(d.id)] || 0) }));
  return { fish, bugs };
}

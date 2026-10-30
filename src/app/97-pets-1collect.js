/* ============================================================
   PETS, the collection (2.23, agent 'pets'): which pets are yours, how you earn
   the others, friendship, treats from the garden, toys, beds, lures and rare
   visitors. Rules only (no drawing, no DOM at load): Node's page engine loads
   this file too, so the assistant's pet tool runs the same rules
   (lib/agent-engine.mjs, server/actions/ops-agent.mjs).

   THE RULES, so nothing can be farmed by clicking:
     - garden treats come from crops picked, fish and bugs caught, bouquets and
       orders (time-limited things in the garden), one treat for every two, at
       most PET_GARDEN.dayTreats a day. Digging up and replanting counts for
       nothing, an Undo cannot be counted twice (the count only goes up).
     - friendship: a treat 2 points, a pat 1 (the first 3 a day), playing 2 (3
       times a day), at most PET_GARDEN.dayBond a day for each pet.
     - coins are the garden's own: spending writes one ledger line.
     - nothing is ever taken away: an unlocked pet, a hat or a toy stays yours,
       and a pet you already had is yours whatever its rules are now.

   state.pet, added here (all optional; a save without them works):
     unl {species: day}   earned pets                 roster {species: {look, name}}  each pet's own look and name
     pack [species]       others out in your garden   bd {species: {day: points}}     friendship by day (bd0: from before)
     gt {day: n}          treats from the garden      gb, gr, sb, sh {season: n}      the garden counts seen so far
     buy {key: {d, t?, c?}} bought with treats or coins ('sp:otter', 'hat:chef', 'toy:yarn', 'bed:hammock', 'hatCol:cherry')
     lures {id: n bought}, lused {id: n used}         toy, bed                        what is out in the room
     seen {species: day}  the collection has shown it (the 'new' mark)

     petCollection()      rows for the collection screen [{id, sp, owned, me, out, rar, route, have, of, pct, can, bond, fresh}]
     petCollectCount()    {owned, total, pct}
     petUnlock(id)        pay for or claim a pet -> {ok, why?, spent?}; o.undo
     petChoose(id)        make it your companion (keeps each pet's own look and name) -> {ok}
     petPackToggle(id)    let it out in the garden with you, or bring it in -> {ok, out}
     petBondOf(species)   {level, pts, into, need, pct}      petBondGive(kind) 'treat' | 'pat' | 'play'
     petPlay()            a game with the toy -> {ok, full?}
     petBuy(key)          a hat, colour, toy or bed -> {ok, why?}     petOwnsExtra(key)
     petToySet(id) / petBedSet(id) / petToyNow() / petBedNow()
     petLureHave(id) / petLureBuy(id) -> {ok, why?}
     petEncounterNow(model)  the rare visitor in the garden right now {id, lure, cell, key} | null
     petEncounterMeet(id)    use the lure: it is yours -> {ok, needs?}
     petCollectTick()     count the garden, record what has been earned, queue the celebrations
     petCelebrationsTake()  the species earned since last asked (97-pets-5stage.js shows them)
   ============================================================ */
const PET_GARDEN = Object.freeze({ dayTreats: 4, per: 2, dayBond: 6, patBond: 3, dayPlay: 3, packMax: 3 });
const PET_BOND_STEPS = Object.freeze([6, 10, 14, 18, 24, 30, 36, 44, 52]);   // points from one level to the next
const _ptc = { celeb: [], tickAt: 0, seeded: false };

function _ptcS() { return _ptS(true); }
function _ptcMap(p, k) { if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = {}; return p[k]; }
function _ptcSum(o, f) { let n = 0; for (const v of Object.values(o || {})) n += Math.max(0, Number(f ? f(v) : v) || 0); return n; }

/* ---------- friendship ---------- */
function _ptcBondPts(p, id) { return Math.max(0, Number((p.bd0 || {})[id]) || 0) + _ptcSum((p.bd || {})[id]); }
function petBondOf(id, p0) {
  const p = p0 || _ptS(), pts = _ptcBondPts(p, id);
  let level = 1, left = pts;
  for (const need of PET_BOND_STEPS) { if (left < need) return { level, pts, into: left, need, pct: Math.round(left / need * 100) }; left -= need; level++; }
  return { level, pts, into: 0, need: 0, pct: 100 };
}
function _ptcBondBest(p) {
  let best = 1;
  const ids = new Set([...Object.keys(p.bd || {}), ...Object.keys(p.bd0 || {})]);
  for (const id of ids) best = Math.max(best, petBondOf(id, p).level);
  return best;
}
/** A little friendship for the pet with you. Returns the level when it just went up, else 0. */
function petBondGive(kind) {
  const p = _ptcS(), id = p.look && p.look.species;
  if (!id) return 0;
  const today = _ptToday(), by = _ptcMap(_ptcMap(p, 'bd'), id), have = Number(by[today]) || 0;
  let pts = kind === 'treat' ? 2 : kind === 'play' ? 2 : 1;
  if (kind === 'pat' && (Number(p.petted[today]) || 0) > PET_GARDEN.patBond) pts = 0;
  pts = Math.min(pts, PET_GARDEN.dayBond - have);
  if (pts <= 0) return 0;
  const before = petBondOf(id, p).level;
  by[today] = have + pts;
  const after = petBondOf(id, p).level;
  if (after > before) { _ptNote('bond-' + id + '-' + after, { n: after }); petCollectTick(); return after; }
  return 0;
}

/* ---------- the garden's counts: treats, and crops by season ---------- */
function _ptcWallet() { try { return typeof gardenWallet === 'function' ? gardenWallet() : null; } catch (e) { return null; } }
/** What has happened in the garden since last looked: counts only go up, so an Undo cannot be counted twice. */
function _ptcGardenSync(p) {
  const w = _ptcWallet();
  if (!w || !w.n || !p.look) return false;
  const acts = (w.n.harvests || 0) + (w.n.fished || 0) + (w.n.netted || 0) + (w.n.bouquets || 0) + 2 * (w.n.traded || 0), crops = w.n.harvests || 0;
  if (p.gb == null) { p.gb = acts; p.sb = crops; p.gr = 0; return true; }   // from here on: a garden played before this version gave what it gave
  let changed = false;
  const dc = crops - (Number(p.sb) || 0);
  if (dc > 0) {
    let season = '';
    try { season = gardenModel().season; } catch (e) { season = ''; }
    if (season) { const sh = _ptcMap(p, 'sh'); sh[season] = (Number(sh[season]) || 0) + dc; }
    p.sb = crops; changed = true;
  }
  const dA = acts - (Number(p.gb) || 0);
  if (dA > 0) {
    const all = dA + (Number(p.gr) || 0), make = Math.floor(all / PET_GARDEN.per), today = _ptToday(), gt = _ptcMap(p, 'gt'), had = Number(gt[today]) || 0;
    const room = Math.max(0, PET_GARDEN.dayTreats - had);
    if (make > 0 && room > 0) gt[today] = had + Math.min(make, room);
    p.gr = all % PET_GARDEN.per; p.gb = acts; changed = true;
  }
  return changed;
}
/** Treats earned and spent by the collection's rules (petTreats adds them). */
function _ptcTreatLedger(p) {
  const gt = p.gt || {}, today = _ptToday();
  let spent = _ptcSum(p.buy, v => v && v.t);
  const lures = p.lures || {};
  for (const l of PET_LURES) if (l.treats) spent += (Number(lures[l.id]) || 0) * l.treats;
  let made = 0;   // 2.23: treats baked at the crafting bench (a ledger line, so Undo takes them back)
  try { const w = _ptcWallet(); made = w ? Math.max(0, Math.floor(w.items.ptreat || 0)) : 0; } catch (e) { made = 0; }
  return { earned: _ptcSum(gt) + made, today: Number(gt[today]) || 0, spent };
}

/* ---------- what you have done ---------- */
function _ptcFacts(p) {
  let f = {};
  try { if (typeof gardenFacts === 'function') f = Object.assign({}, gardenFacts()); } catch (e) { f = {}; }
  const sh = p.sh || {};
  for (const s of ['spring', 'summer', 'autumn', 'winter']) f['h-' + s] = Number(sh[s]) || 0;
  return f;
}
function _ptcAch() {
  try { if (typeof achUnlockedIds === 'function') return achUnlockedIds().length; } catch (e) { /* below */ }
  try { return Object.keys((state.achievements && state.achievements.unlocked) || {}).length; } catch (e) { return 0; }
}
function _ptcGrown(plant) {
  try { return (gardenModel().plants || []).filter(q => q.def && q.def.id === plant && q.stage >= 3).length; } catch (e) { return 0; }
}
/** How far along: {have, of, can (earned, or affordable right now), pay (treats|coins)}. */
function _ptcProgress(id, p, ctx, F) {
  const rt = petRoute(id);
  if (!rt) return { have: 1, of: 1, done: true };
  const T = _ptcTreatsNow();
  switch (rt.type) {
    case 'treats': return { have: Math.min(T, rt.of), of: rt.of, pay: 'treats', can: T >= rt.of };
    case 'coins': { const w = _ptcWallet(), c = w ? w.coins : 0; return { have: Math.min(c, rt.of), of: rt.of, pay: 'coins', can: c >= rt.of }; }
    case 'fact': { const h = Number(F[rt.key]) || 0; return { have: Math.min(h, rt.of), of: rt.of, done: h >= rt.of }; }
    case 'grow': { const h = _ptcGrown(rt.plant); return { have: Math.min(h, rt.of), of: rt.of, done: h >= rt.of }; }
    case 'bond': {
      const L = petSpecies(id).lock.bond;
      const h = L[0] === '*' ? _ptcBondBest(p) : petBondOf(L[0], p).level;
      return { have: Math.min(h, rt.of), of: rt.of, done: h >= rt.of };
    }
    case 'ach': { const h = _ptcAch(); return { have: Math.min(h, rt.of), of: rt.of, done: h >= rt.of }; }
    case 'level': return { have: Math.min(ctx.levelMax || 1, rt.of), of: rt.of, done: ctx.game && (ctx.levelMax || 1) >= rt.of };
    case 'streak': return { have: Math.min(ctx.bestStreak || 0, rt.of), of: rt.of, done: ctx.game && (ctx.bestStreak || 0) >= rt.of };
    case 'enc': return { have: petLureHave(rt.lure) > 0 ? 1 : 0, of: 2, enc: true };
    case 'life': { const ok = typeof gardenLifeUnlocked === 'function' && gardenLifeUnlocked(rt.rule); return { have: ok ? 1 : 0, of: 1, done: !!ok }; }
    default: return { have: 0, of: 1 };
  }
}
function _ptcTreatsNow() { try { return petTreats().have; } catch (e) { return 0; } }
function petOwnsSpecies(id, p0) {
  const p = p0 || _ptS(), sp = petSpecies(id);
  if (!sp) return false;
  if (p.look && p.look.species === id) return true;
  if (p.unl && p.unl[id]) return true;
  if (!sp.lock) return true;   // the first friends are free
  return false;
}

/* ---------- the tick: count, record, celebrate ---------- */
function petCollectTick(o) {
  try {
    const p = _ptS();
    if (!p.look || typeof state === 'undefined' || !state.pet) return [];
    let changed = _ptcGardenSync(p);
    // the friendship a pet already had before this version
    if (!p.bd0) {
      p.bd0 = {};
      const treats = _ptcSum(p.fed), pats = _ptcSum(p.petted, v => Math.min(3, Number(v) || 0));
      if (p.look.species) p.bd0[p.look.species] = Math.min(120, treats * 2 + pats);
      changed = true;
    }
    if (!p.unl) { p.unl = {}; changed = true; }
    // a pet you already had (the wardrobe let you pick the rare ones once they were open) stays yours
    if (p.look.species && petSpecies(p.look.species) && petSpecies(p.look.species).lock && !p.unl[p.look.species]) { p.unl[p.look.species] = _ptToday(); changed = true; }
    const ctx = petUnlockCtx(), F = _ptcFacts(p), got = [];
    const first = !p.seenTick;
    for (const sp of PET_SPECIES) {
      if (!sp.lock || p.unl[sp.id]) continue;
      const prog = _ptcProgress(sp.id, p, ctx, F);
      if (prog.done) { p.unl[sp.id] = _ptToday(); got.push(sp.id); _ptNote('met-' + sp.id); changed = true; }
    }
    if (first) { p.seenTick = 1; changed = true; }
    if (got.length && !(o && o.silent)) _ptc.celeb.push(...got);
    if (changed) { p.updatedAt = Date.now(); if (typeof saveUI === 'function') saveUI(); }   // clock-ok: a real time stamp
    if (got.length) { _ptEmit(); try { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('opendash:pet-new', { detail: { species: got } })); } catch (e) { /* no event */ } }
    return got;
  } catch (e) { try { console.error('[pets] tick', e); } catch (x) { /* quiet */ } return []; }
}
function petCelebrationsTake() { const c = _ptc.celeb.slice(); _ptc.celeb.length = 0; return c; }

/* ---------- the collection ---------- */
function petCollectCount() {
  const p = _ptS();
  let owned = 0;
  for (const sp of PET_SPECIES) if (petOwnsSpecies(sp.id, p) || (sp.lock && !petLockOf('species', sp.id, petUnlockCtx()))) owned++;
  return { owned, total: PET_SPECIES.length, pct: Math.round(owned / PET_SPECIES.length * 100) };
}
function petCollection() {
  const p = _ptS(), ctx = petUnlockCtx(), F = _ptcFacts(p), me = p.look && p.look.species, pack = Array.isArray(p.pack) ? p.pack : [], seen = p.seen || {};
  return PET_SPECIES.map(sp => {
    const open = petOwnsSpecies(sp.id, p) || !petLockOf('species', sp.id, ctx);
    const route = petRoute(sp.id), prog = open ? { have: 1, of: 1 } : _ptcProgress(sp.id, p, ctx, F);
    return { id: sp.id, sp, owned: open, me: me === sp.id, out: pack.includes(sp.id), rar: sp.rar || 0, route, have: prog.have, of: prog.of, pct: Math.round(prog.have / Math.max(1, prog.of) * 100), can: !open && !!prog.can, pay: prog.pay || '', enc: !!prog.enc,
      bond: open ? petBondOf(sp.id, p) : null, fresh: open && sp.lock && p.unl && p.unl[sp.id] && !seen[sp.id] };
  });
}
function petCollectSeen() {
  const p = _ptS();
  if (!p.unl) return;
  const seen = _ptcMap(p, 'seen'); let ch = false;
  for (const id of Object.keys(p.unl)) if (!seen[id]) { seen[id] = _ptToday(); ch = true; }
  if (ch && typeof saveUI === 'function') saveUI();
}
function _ptcSpendCoins(n, why) {
  const w = _ptcWallet();
  if (!w || w.coins < n || typeof _gdLed !== 'function') return null;
  const key = _gdLed('pet', { c: -n, i: {} });
  try { if (typeof _gdSave === 'function') _gdSave(); } catch (e) { /* saved below */ }
  return key;
}
/** Pay for a pet, or claim one that has been earned. */
function petUnlock(id) {
  const sp = petSpecies(id), p = _ptcS();
  if (!sp) return { ok: false, why: 'unknown' };
  if (!p.look) return { ok: false, why: 'nopet' };
  if (petOwnsSpecies(id, p)) return { ok: true, already: true };
  const rt = petRoute(id);
  if (!rt) return { ok: true, already: true };
  const u = _ptcMap(p, 'unl'), buy = _ptcMap(p, 'buy'), key = 'sp:' + id, today = _ptToday();
  if (rt.type === 'treats') {
    if (petTreats().have < rt.of) return { ok: false, why: 'treats', need: rt.of };
    buy[key] = { d: today, t: rt.of };
  } else if (rt.type === 'coins') {
    const led = _ptcSpendCoins(rt.of);
    if (!led) return { ok: false, why: 'coins', need: rt.of };
    buy[key] = { d: today, c: rt.of, led };
  } else {
    const prog = _ptcProgress(id, p, petUnlockCtx(), _ptcFacts(p));
    if (!prog.done) return { ok: false, why: rt.type };
  }
  u[id] = today;
  _ptNote('met-' + id);
  petSet({}, {});
  return { ok: true, spent: rt.type === 'treats' || rt.type === 'coins' ? rt.of : 0, pay: rt.type };
}
/** Undo paying for a pet (a moment later, while it is still the last thing done). */
function petUnlockUndo(id) {
  const p = _ptcS(), key = 'sp:' + id, b = p.buy && p.buy[key];
  if (!b) return false;
  if (b.led) { try { const g = _gdG(); delete g.led[b.led]; if (typeof _gdSave === 'function') _gdSave(); } catch (e) { /* the ledger moved on */ } }
  delete p.buy[key];
  if (p.unl) delete p.unl[id];
  if (p.journal) delete p.journal['met-' + id];
  if (p.look && p.look.species === id) return true;   // it is with you already: it stays
  petSet({}, {});
  return true;
}
/** Make this pet your companion. Each pet keeps its own look and name. */
function petChoose(id) {
  const sp = petSpecies(id), p = _ptcS();
  if (!sp) return { ok: false, why: 'unknown' };
  if (!p.look) { petAdopt(petDefault(id)); return { ok: true }; }
  if (!petOwnsSpecies(id, p) && petLockOf('species', id, petUnlockCtx())) return { ok: false, why: 'locked' };
  const cur = p.look.species;
  if (cur === id) return { ok: true, same: true };
  const roster = _ptcMap(p, 'roster');
  roster[cur] = { look: Object.assign({}, p.look), name: p.name || '' };
  const saved = roster[id] && typeof roster[id] === 'object' ? roster[id] : null;
  const look = petNormalize(Object.assign({}, saved ? saved.look : petDefault(id), { species: id }));
  delete look.name;
  const name = saved && saved.name ? saved.name : petRandomName(id, _ptHash(id + (p.born || '')));
  if (Array.isArray(p.pack)) { p.pack = p.pack.filter(x => x !== id); if (!p.pack.includes(cur) && p.pack.length < PET_GARDEN.packMax) p.pack.push(cur); }
  petSet({ look, name });
  return { ok: true, from: cur };
}
/** Let another of your pets out in the garden (or bring it in). */
function petPackToggle(id) {
  const p = _ptcS();
  if (!petOwnsSpecies(id, p) || (p.look && p.look.species === id)) return { ok: false, why: 'locked' };
  const pack = Array.isArray(p.pack) ? p.pack.slice() : [];
  const at = pack.indexOf(id);
  if (at >= 0) pack.splice(at, 1);
  else { if (pack.length >= PET_GARDEN.packMax) return { ok: false, why: 'full' }; pack.push(id); }
  p.pack = pack;
  petSet({}, {});
  return { ok: true, out: at < 0 };
}
/** A pet of your collection as a look (its saved look, or its default). */
function petRosterLook(id) {
  const p = _ptS(), r = p.roster && p.roster[id];
  const look = petNormalize(Object.assign({}, r && r.look ? r.look : petDefault(id), { species: id, name: r && r.name ? r.name : petRandomName(id, _ptHash(id + (p.born || ''))) }));
  return look;
}
function petPackLooks() {
  const p = _ptS();
  return (Array.isArray(p.pack) ? p.pack : []).filter(id => petSpecies(id) && petOwnsSpecies(id, p)).slice(0, PET_GARDEN.packMax).map(petRosterLook);
}

/* ---------- play ---------- */
function petPlay() {
  const g = petGet();
  if (!g.look) return { ok: false, why: 'nopet' };
  const p = _ptcS(), today = _ptToday(), played = _ptcMap(p, 'played'), n = Number(played[today]) || 0;
  _pt.lastCare = Date.now(); _pt.reactUntil = Date.now() + 2600; _pt.memo = null;   // clock-ok: UI timing
  if (n >= PET_GARDEN.dayPlay) return { ok: true, tired: true };   // it plays as long as you like; only the first few count
  played[today] = n + 1;
  const lvl = petBondGive('play');
  if (typeof saveUI === 'function') saveUI();
  _ptCareAward(g);
  return { ok: true, level: lvl };
}

/* ---------- things to buy: hats, colours, toys, beds ---------- */
function _ptcExtraOf(key) {
  const [kind, id] = String(key).split(':');
  if (kind === 'toy') return PET_TOYS.find(x => x.id === id) || null;
  if (kind === 'bed') return PET_BEDS.find(x => x.id === id) || null;
  if (PET_ACC[kind]) return PET_ACC[kind].find(x => x.id === id) || null;
  if (_PT_ACC_COL_OF[kind]) { const c = PET_ACC_COLS[id]; return c ? Object.assign({ id }, c) : null; }
  return null;
}
function petOwnsExtra(key) {
  const x = _ptcExtraOf(key), p = _ptS();
  if (!x) return false;
  if (x.free) return true;
  if (p.buy && p.buy[key]) return true;
  // a colour bought for one accessory is yours for all of them
  const [kind, id] = String(key).split(':');
  if (_PT_ACC_COL_OF[kind] && p.buy) for (const f of Object.keys(_PT_ACC_COL_OF)) if (p.buy[f + ':' + id]) return true;
  if (x.bondAny) return _ptcBondBest(p) >= x.bondAny;
  return false;
}
function petBuy(key) {
  const x = _ptcExtraOf(key), p = _ptcS();
  if (!x) return { ok: false, why: 'unknown' };
  if (petOwnsExtra(key)) return { ok: true, already: true };
  if (x.bondAny) return { ok: false, why: 'bond', need: x.bondAny };
  const buy = _ptcMap(p, 'buy'), today = _ptToday();
  if (x.treats) { if (petTreats().have < x.treats) return { ok: false, why: 'treats', need: x.treats }; buy[key] = { d: today, t: x.treats }; }
  else if (x.coins) { const led = _ptcSpendCoins(x.coins); if (!led) return { ok: false, why: 'coins', need: x.coins }; buy[key] = { d: today, c: x.coins, led }; }
  else return { ok: false, why: 'unknown' };
  petSet({}, {});
  return { ok: true, spent: x.treats || x.coins, pay: x.treats ? 'treats' : 'coins' };
}
function petBuyUndo(key) {
  const p = _ptcS(), b = p.buy && p.buy[key];
  if (!b) return false;
  if (b.led) { try { const g = _gdG(); delete g.led[b.led]; if (typeof _gdSave === 'function') _gdSave(); } catch (e) { /* the ledger moved on */ } }
  delete p.buy[key];
  petSet({}, {});
  return true;
}
function petToyNow() { const p = _ptS(); return PET_TOYS.some(t => t.id === p.toy && petOwnsExtra('toy:' + t.id)) ? p.toy : 'ball'; }
function petBedNow() { const p = _ptS(); return PET_BEDS.some(t => t.id === p.bed && petOwnsExtra('bed:' + t.id)) ? p.bed : 'cushion'; }
function petToySet(id) { if (!petOwnsExtra('toy:' + id)) return { ok: false }; _ptcS().toy = id; petSet({}, {}); return { ok: true }; }
function petBedSet(id) { if (!petOwnsExtra('bed:' + id)) return { ok: false }; _ptcS().bed = id; petSet({}, {}); return { ok: true }; }

/* ---------- lures and rare visitors ---------- */
function petLureHave(id) { const p = _ptS(); return Math.max(0, (Number((p.lures || {})[id]) || 0) - (Number((p.lused || {})[id]) || 0)); }
function petLureBuy(id) {
  const l = PET_LURES.find(x => x.id === id), p = _ptcS();
  if (!l) return { ok: false, why: 'unknown' };
  if (l.treats) { if (petTreats().have < l.treats) return { ok: false, why: 'treats', need: l.treats }; }
  else if (l.coins) { if (!_ptcSpendCoins(l.coins)) return { ok: false, why: 'coins', need: l.coins }; }
  const m = _ptcMap(p, 'lures');
  m[id] = (Number(m[id]) || 0) + 1;
  petSet({}, {});
  return { ok: true };
}
const _PTC_WIN = 1200000;   // 20 minutes: the same visitor on every device
/** The rare visitor about right now, or null. Seeded by the time, so a reload shows the same one; only a pet you do not have yet comes. */
function petEncounterNow(m0) {
  try {
    const p = _ptS();
    if (!p.look || typeof gardenModel !== 'function') return null;
    const m = m0 || gardenModel(), win = Math.floor(_gdNow() / _PTC_WIN), rain = !!(m.rain && m.rain.now);
    let best = null, bh = 0;
    for (const [id, E] of Object.entries(PET_ENCOUNTERS)) {
      if (petOwnsSpecies(id, p)) continue;
      if (E.tod && !E.tod.includes(m.tod)) continue;
      if (E.seasons && !E.seasons.includes(m.season)) continue;
      if (E.rain && !rain) continue;
      const h = _ptHash('enc|' + id + '|' + win);
      if (h % E.every !== 0) continue;
      if (!best || h > bh) { best = { id, lure: E.lure, key: id + '|' + win, h }; bh = h; }
    }
    return best;
  } catch (e) { return null; }
}
/** Offer the lure: it comes to you and it is yours. */
function petEncounterMeet(id) {
  const E = PET_ENCOUNTERS[id], p = _ptcS();
  if (!E || !petSpecies(id)) return { ok: false, why: 'unknown' };
  if (petOwnsSpecies(id, p)) return { ok: true, already: true };
  if (petLureHave(E.lure) < 1) return { ok: false, why: 'lure', needs: E.lure };
  const used = _ptcMap(p, 'lused');
  used[E.lure] = (Number(used[E.lure]) || 0) + 1;
  _ptcMap(p, 'unl')[id] = _ptToday();
  _ptNote('met-' + id);
  petSet({}, {});
  _ptc.celeb.push(id);
  try { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('opendash:pet-new', { detail: { species: [id] } })); } catch (e) { /* no event */ }
  return { ok: true };
}

/* keep the counts moving with the garden and the game (the page only) */
if (typeof document !== 'undefined' && document.addEventListener) {
  const soon = () => { clearTimeout(_ptc.tickT); _ptc.tickT = setTimeout(() => petCollectTick(), 900); };
  document.addEventListener('opendash:garden', soon);
  document.addEventListener('opendash:game', soon);
  if (typeof window !== 'undefined') window.addEventListener('load', () => setTimeout(() => petCollectTick({ silent: true }), 6000), { once: true });
}

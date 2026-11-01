/* ============================================================
   THINGS YOU HOLD AND THE LOOK OF BUILDINGS, the tables and the rules (docs/dev/REWARDS.md, "Looks"; docs/dev/GARDEN_TOGETHER.md section 22).
   The owner: "stuff that we hold, so more decor items, like more types of rods, nets, painting buildings and customizing how specific buildings look, all of that", "playing with friends".

   A LOOK IS NOT A STAT. The rod you fish with stays the rod in gardenRod() (reach, bar, bite); a look only changes how it is drawn, so a favourite look goes with your best rod.
     Owned:    the item look:<id> in the ledger, like land: and feat:, so it syncs and comes back on Undo. It cannot be sold (gardenSellPrice gives 0).
     Worn:     prefs.lkRod, prefs.lkNet, prefs.lkHeld.
     Friends:  rk, nk, hd in the look `g` (ids only; lib/friends/live.mjs GEAR). An older app drops them; an id this app does not know draws nothing.

   BUILDINGS go by id, never by position: moving a building leaves its look alone. prefs.bk_<building id> is "wall.roof.door.awning.awningStyle.roofStyle.sign", small numbers into the tables below, 0 = as it was built.
     Friends:  the snapshot's `bk` (lib/friends/garden.mjs): [[id, 7 numbers]]. An older app drops the field; a number this app does not know draws as built.

   IDS AND TABLE ORDER ARE SAVED: never rename a row, reorder a table or reuse a number. New ones go at the end.
   Tables and sums only, no DOM at load.
   ============================================================ */
const _gsR = (kind, id, name, cost, how, more) => Object.freeze(Object.assign({ kind, id, name, cost: Object.freeze(cost), how }, more || {}));
const _gsRod = (id, name, cost, how, more) => _gsR('rod', id, name, cost, how, more);
const _gsNet = (id, name, cost, how, more) => _gsR('net', id, name, cost, how, more);
const _gsHeld = (id, name, cost, how, more) => _gsR('held', id, name, cost, how, more);

/* sh: how the shaft is drawn. tip: what is on the end. open: when it can be had (from gardenRewardCtx, as for the yard). season: can be had only then, and is yours for good. */
const GARDEN_ROD_SKINS = Object.freeze([
  _gsRod('rl-bamboo', 'Green bamboo', { c: 20 }, 'Sold at the yard', { sh: 'knots', c: '#8fb04a', c2: '#5a7a2a', g: '#c8a46a', tip: 'leaf' }),
  _gsRod('rl-driftwood', 'Driftwood', { 'mat:reed': 2, 'mat:timber': 1 }, 'Catch 5 kinds of fish', { open: c => c.fish >= 5, sh: 'wobble', c: '#a89c88', c2: '#7c705e', g: '#6a5c4a', tip: 'shell' }),
  _gsRod('rl-willow', 'Willow switch', { c: 45 }, 'Sold at the yard', { sh: 'vine', c: '#a8905a', c2: '#6f9a4a', g: '#7a5a34', tip: 'sprig' }),
  _gsRod('rl-bulrush', 'Bulrush', { 'mat:reed': 4 }, 'Catch 10 kinds of bug', { open: c => c.bugs >= 10, sh: 'plain', c: '#7f9a4a', c2: '#5f7a3a', g: '#5f7a3a', tip: 'bulrush' }),
  _gsRod('rl-candy', 'Candy cane', { ticket: 20 }, 'Winter only', { season: 'winter', sh: 'stripes', c: '#fbf5ec', c2: '#d8352a', g: '#d8352a', tip: 'bow' }),
  _gsRod('rl-holly', 'Holly stick', { c: 60 }, 'Winter only', { season: 'winter', sh: 'plain', c: '#3f6a3a', c2: '#2a4a28', g: '#6a4426', tip: 'holly' }),
  _gsRod('rl-ice', 'Icicle', { ticket: 30 }, 'Winter only', { season: 'winter', sh: 'plain', c: '#bfe6f2', c2: '#8cc4da', g: '#6a9ab4', tip: 'crystal' }),
  _gsRod('rl-bone', 'Skeleton rod', { ticket: 25 }, 'Autumn only', { season: 'autumn', sh: 'bones', c: '#efe8d4', c2: '#b8ae94', g: '#54504a', tip: 'skull' }),
  _gsRod('rl-pumpkin', 'Pumpkin vine', { c: 55 }, 'Autumn only', { season: 'autumn', sh: 'vine', c: '#5f7a3a', c2: '#7f9a4a', g: '#54392a', tip: 'pumpkin' }),
  _gsRod('rl-sunflower', 'Sunflower stalk', { c: 55 }, 'Summer only', { season: 'summer', sh: 'plain', c: '#6f9a3f', c2: '#4f7a2f', g: '#4f7a2f', tip: 'sunflower' }),
  _gsRod('rl-toadstool', 'Toadstool', { c: 55 }, 'Spring only', { season: 'spring', sh: 'plain', c: '#efe8d4', c2: '#c8bea4', g: '#7a5a34', tip: 'toadstool' }),
  _gsRod('rl-lantern', 'Lantern rod', { 'mat:timber': 2, 'mat:stone': 1, c: 80 }, 'Garden level 6', { open: c => c.lv >= 6, sh: 'plain', c: '#3a3a42', c2: '#22222a', g: '#22222a', tip: 'lantern' }),
  _gsRod('rl-feather', 'Quill', { ticket: 30 }, 'Read 1 letter', { open: c => c.letters >= 1, sh: 'plain', c: '#efe4cc', c2: '#b8a678', g: '#3a3a5a', tip: 'feather' }),
  _gsRod('rl-coral', 'Coral', { 'mat:reed': 3, c: 90 }, 'Catch 25 kinds of fish', { open: c => c.fish >= 25, sh: 'twist', c: '#e87a6a', c2: '#fbd0c0', g: '#a83a3a', tip: 'coral' }),
  _gsRod('rl-rainbow', 'Rainbow', { c: 150 }, 'Win 5 ribbons', { open: c => c.ribbons >= 5, sh: 'bands', c: '#d8352a', c2: '#f2c432', g: '#3a3a5a', tip: 'star' }),
  _gsRod('rl-stars', 'Night sky', { 'mat:stone': 3, ticket: 15 }, 'Learn 1 pattern of stars', { open: c => c.stars >= 1, sh: 'twist', c: '#26305a', c2: '#ffe27a', g: '#1a2040', tip: 'star' }),
  _gsRod('rl-dragon', 'Dragon', { c: 220 }, 'Own 25 pieces of land', { open: c => c.sections >= 25, sh: 'scales', c: '#a8352a', c2: '#e8a03a', g: '#3a1a14', tip: 'flame' }),
]);
/* hoop: the shape of the rim. bag: the mesh. bits: what is on it. */
const GARDEN_NET_SKINS = Object.freeze([
  _gsNet('nl-butterfly', 'Butterfly net', { c: 25 }, 'Sold at the yard', { hoop: 'round', c: '#e888a8', c2: '#fbeaf0', p: '#c8a46a', bits: 'wings' }),
  _gsNet('nl-crab', 'Crab pot', { 'mat:reed': 2, 'mat:timber': 1 }, 'Catch 5 kinds of fish', { open: c => c.fish >= 5, hoop: 'square', c: '#8a6642', c2: '#d8c48e', p: '#7a5a3a', bits: 'cork' }),
  _gsNet('nl-seaweed', 'Seaweed', { 'mat:reed': 3 }, 'Walk to the island in the lake', { open: c => c.isle >= 1, hoop: 'round', c: '#3f7a5a', c2: '#7fb88a', p: '#a89c88', bits: 'weed' }),
  _gsNet('nl-heart', 'Sweetheart', { ticket: 20 }, 'Spring only', { season: 'spring', hoop: 'heart', c: '#d8405a', c2: '#fbd8e0', p: '#fbf5ec', bits: '' }),
  _gsNet('nl-sun', 'Sun hat', { c: 50 }, 'Summer only', { season: 'summer', hoop: 'round', c: '#e8c24a', c2: '#fbf0c0', p: '#c8a46a', bits: 'ribbon' }),
  _gsNet('nl-bone', 'Skeleton net', { ticket: 25 }, 'Autumn only', { season: 'autumn', hoop: 'ribs', c: '#efe8d4', c2: '#3a3a42', p: '#efe8d4', bits: 'skull' }),
  _gsNet('nl-pumpkin', 'Pumpkin net', { c: 50 }, 'Autumn only', { season: 'autumn', hoop: 'round', c: '#e87a1a', c2: '#ef9f4a', p: '#54392a', bits: 'grin' }),
  _gsNet('nl-frost', 'Snowflake', { ticket: 20 }, 'Winter only', { season: 'winter', hoop: 'star', c: '#8cc4da', c2: '#e8f6fa', p: '#bfe6f2', bits: 'flake' }),
  _gsNet('nl-lantern', 'Paper lantern', { 'mat:timber': 2, c: 60 }, 'Garden level 6', { open: c => c.lv >= 6, hoop: 'round', c: '#c8352a', c2: '#ffcf7a', p: '#3a3a42', bits: 'glow' }),
  _gsNet('nl-stars', 'Star catcher', { 'mat:stone': 3, ticket: 15 }, 'Learn 1 pattern of stars', { open: c => c.stars >= 1, hoop: 'star', c: '#f2c432', c2: '#26305a', p: '#26305a', bits: 'sparks' }),
]);
/* Carried in your hand while you walk: it goes away when your hands are full. */
const GARDEN_HELD = Object.freeze([
  _gsHeld('hd-brolly-red', 'Red umbrella', { c: 30 }, 'Sold at the yard', { art: 'brolly', c: '#c8352a', c2: '#a8251c', pat: '' }),
  _gsHeld('hd-brolly-spot', 'Spotty umbrella', { c: 40 }, 'Sold at the yard', { art: 'brolly', c: '#2f4a7a', c2: '#fbf5ec', pat: 'dots' }),
  _gsHeld('hd-brolly-stripe', 'Beach umbrella', { ticket: 15 }, 'Summer only', { season: 'summer', art: 'brolly', c: '#f2c432', c2: '#fbf5ec', pat: 'stripes' }),
  _gsHeld('hd-brolly-frog', 'Frog umbrella', { 'mat:reed': 3 }, 'Catch 10 kinds of bug', { open: c => c.bugs >= 10, art: 'brolly', c: '#5aa83a', c2: '#fbf5ec', pat: 'frog' }),
  _gsHeld('hd-leaf', 'Big leaf', { 'mat:reed': 1 }, 'From the start', { art: 'leaf', c: '#4f8a3a', c2: '#7fb85a' }),
  _gsHeld('hd-balloon-red', 'Red balloon', { ticket: 8 }, 'From the start', { art: 'balloon', c: '#d8352a', shape: 'round' }),
  _gsHeld('hd-balloon-heart', 'Heart balloon', { ticket: 12 }, 'Spring only', { season: 'spring', art: 'balloon', c: '#e8607a', shape: 'heart' }),
  _gsHeld('hd-balloon-fish', 'Fish balloon', { ticket: 15 }, 'Catch 10 kinds of fish', { open: c => c.fish >= 10, art: 'balloon', c: '#4a9ac4', shape: 'fish' }),
  _gsHeld('hd-balloon-moon', 'Moon balloon', { ticket: 15, 'mat:stone': 1 }, 'Learn 1 pattern of stars', { open: c => c.stars >= 1, art: 'balloon', c: '#f2d84a', shape: 'moon' }),
  _gsHeld('hd-lantern', 'Paper lantern', { 'mat:timber': 1, ticket: 6 }, 'From the start', { art: 'lantern', c: '#e8603a', c2: '#ffcf7a' }),
  _gsHeld('hd-lantern-jack', 'Pumpkin on a stick', { c: 40 }, 'Autumn only', { season: 'autumn', art: 'jack', c: '#e87a1a', c2: '#ffd36a' }),
  _gsHeld('hd-bucket', 'Bucket of fish', { c: 35 }, 'Catch 5 kinds of fish', { open: c => c.fish >= 5, art: 'bucket', c: '#8a9298', c2: '#b8c0c6' }),
  _gsHeld('hd-pail', 'Seaside pail', { c: 20 }, 'Sold at the yard', { art: 'pail', c: '#3a8ac4', c2: '#f2c432' }),
  _gsHeld('hd-pennant', 'Pennant', { 'mat:timber': 1, 'mat:peg': 1 }, 'Open a path early', { open: c => c.earlyTrails >= 1, art: 'pennant', c: '#d8452a', c2: '#fbf5e6' }),
  _gsHeld('hd-sunflower', 'Giant sunflower', { c: 30 }, 'Summer only', { season: 'summer', art: 'flower', c: '#f2c432', c2: '#6a4426' }),
  _gsHeld('hd-mistletoe', 'Sprig of mistletoe', { ticket: 10 }, 'Winter only', { season: 'winter', art: 'mistle', c: '#5a8a4a', c2: '#fbf5ec' }),
]);
const _GS_LOOK = new Map(GARDEN_ROD_SKINS.concat(GARDEN_NET_SKINS, GARDEN_HELD).map(r => [r.id, r]));
const _GS_PREF = Object.freeze({ rod: 'lkRod', net: 'lkNet', held: 'lkHeld' });
function gardenLookDef(id) { return _GS_LOOK.get(String(id)) || null; }
function gardenLookOwned(id) { return gardenHas('look:' + id) > 0; }
function _gsCtx(m) { return Object.assign(gardenRewardCtx(m), { lv: m.level.level }); }
/** Can it be had now? (Yours for good once it is yours.) */
function gardenLookOpen(row, m, ctx) {
  if (row.season && m.season !== row.season) return false;
  return !row.open || !!row.open(ctx || _gsCtx(m));
}
function _gsCanPay(cost, m) {
  for (const [k, n] of Object.entries(cost)) {
    if (k === 'c') { if (_gdG().inf !== 1 && m.wallet.coins < n) return false; }
    else if (gardenHas(k) < n) return false;
  }
  return true;
}
function _gsCostWord(k, n) {
  if (k === 'c') return `${n} coin${n === 1 ? '' : 's'}`;
  if (k === 'ticket') return `${n} ticket${n === 1 ? '' : 's'}`;
  const r = GR_MATERIALS.find(x => 'mat:' + x.id === k);
  return `${n} ${r ? (n === 1 ? r.one : r.name.toLowerCase()) : k}`;
}
function gardenLookCostLine(cost) { return Object.entries(cost).map(([k, n]) => _gsCostWord(k, n)).join(', '); }
/** Buy a look: it goes straight on. One Undo. */
function gardenLookBuy(id) {
  const row = gardenLookDef(id); if (!row) return _gdNo('There is no such thing');
  if (gpVisiting()) return _gdNo('Back in your own garden, you can');
  if (gardenLookOwned(id)) return gardenLookWear(row.kind, id);
  const m = gardenModel();
  if (!gardenLookOpen(row, m)) return _gdNo(row.how);
  if (!_gsCanPay(row.cost, m)) return _gdNo(`${row.name} takes ${gardenLookCostLine(row.cost)}`);
  const g = _gdG(), lk = 'b.' + m.today + '.' + _gdUid(''), pk = _GS_PREF[row.kind], mark = _gdMark([['led', lk], ['prefs', pk]]), i = { ['look:' + id]: 1 };
  for (const [k, n] of Object.entries(row.cost)) if (k !== 'c') i[k] = -n;
  g.led[lk] = { d: m.today, k: 'b', c: _gdCost(row.cost.c || 0), i, n: 1 };
  g.prefs[pk] = id;
  const done = _gdDone(`${row.name}: it is yours, and friends can see it`, `getting ${row.name.toLowerCase()}`, mark, { icon: 'sparkles' });
  _gdEmit('gear', { kind: row.kind, id });
  return done;
}
/** Put one on, or take it off (id empty). */
function gardenLookWear(kind, id) {
  const pk = _GS_PREF[kind]; if (!pk) return _gdNo('There is no such thing');
  if (id && !gardenLookOwned(id)) return _gdNo('You do not have that yet');
  const g = _gdG(); if (id) g.prefs[pk] = id; else delete g.prefs[pk];
  _gdSave(); _gdEmit('gear', { kind, id: id || '' });
  return { ok: true, msg: '' };
}
function gardenLookWorn(kind) { const id = _gdG().prefs[_GS_PREF[kind]]; return id && gardenLookOwned(id) ? id : ''; }
/** Added to `g`. */
function gardenStyleLook(out) {
  for (const [k, kind] of [['rk', 'rod'], ['nk', 'net'], ['hd', 'held']]) { const id = gardenLookWorn(kind); if (id) out[k] = id; }
  return out;
}

/* ---------- the buildings ---------- */
const _gsP = (n, c, open, how) => Object.freeze({ n, c, open, how });
/* Index 0 is "as it was built". */
const GARDEN_BUILD_PAINTS = Object.freeze([null,
  _gsP('Cream', '#efe4c8'), _gsP('Harbour blue', '#3f6f8a'), _gsP('Sage', '#8aa87a'), _gsP('Barn red', '#a8452f'),
  _gsP('Butter', '#ecd27e'), _gsP('Slate', '#5e6874'), _gsP('Rose', '#d890a0'), _gsP('Tar black', '#34343c'),
  _gsP('Sea green', '#3f9a8a', c => c.fish >= 10, 'Catch 10 kinds of fish'), _gsP('Lilac', '#a890c8', c => c.bugs >= 10, 'Catch 10 kinds of bug'),
  _gsP('Clay', '#c87a4f', c => c.sections >= 8, 'Own 8 pieces of land'), _gsP('Moss', '#5a7a3f', c => c.sections >= 15, 'Own 15 pieces of land'),
  _gsP('Royal', '#3a3f9a', c => c.ribbons >= 3, 'Win 3 ribbons'), _gsP('Coral', '#e87a6a', c => c.fish >= 25, 'Catch 25 kinds of fish'),
  _gsP('Midnight', '#20284a', c => c.stars >= 4, 'Learn 4 patterns of stars'), _gsP('Gold', '#e0b43a', c => c.ribbons >= 8, 'Win 8 ribbons'),
]);
const GARDEN_BUILD_ROOFS = Object.freeze([_gsP('Shingles'), _gsP('Thatch'), _gsP('Slates'), _gsP('Tin'), _gsP('Fish scale', null, c => c.fish >= 10, 'Catch 10 kinds of fish')]);
const GARDEN_BUILD_AWNS = Object.freeze([_gsP('Stripes'), _gsP('Plain'), _gsP('Wide stripes'), _gsP('Spots'), _gsP('Bunting', null, c => c.built >= 1, 'Build 1 thing on your land')]);
const GARDEN_BUILD_SIGNS = Object.freeze([_gsP('Board'), _gsP('Round'), _gsP('Shield'), _gsP('Scroll'), _gsP('Fish', null, c => c.fish >= 5, 'Catch 5 kinds of fish'), _gsP('Gilded', null, c => c.ribbons >= 3, 'Win 3 ribbons')]);
/* What each part costs to change. Going back to how it was built is free. */
const GARDEN_BUILD_PARTS = Object.freeze([
  Object.freeze({ k: 'w', name: 'Walls', opts: GARDEN_BUILD_PAINTS, cost: Object.freeze({ 'mat:timber': 1, 'mat:reed': 1 }) }),
  Object.freeze({ k: 'r', name: 'Roof colour', opts: GARDEN_BUILD_PAINTS, cost: Object.freeze({ 'mat:stone': 1, 'mat:reed': 1 }) }),
  Object.freeze({ k: 'd', name: 'Door', opts: GARDEN_BUILD_PAINTS, cost: Object.freeze({ 'mat:timber': 1 }) }),
  Object.freeze({ k: 'a', name: 'Awning colour', opts: GARDEN_BUILD_PAINTS, cost: Object.freeze({ 'mat:reed': 1 }) }),
  Object.freeze({ k: 'ak', name: 'Awning', opts: GARDEN_BUILD_AWNS, cost: Object.freeze({ 'mat:reed': 1, ticket: 2 }) }),
  Object.freeze({ k: 'rk', name: 'Roof', opts: GARDEN_BUILD_ROOFS, cost: Object.freeze({ 'mat:stone': 2 }) }),
  Object.freeze({ k: 's', name: 'Sign', opts: GARDEN_BUILD_SIGNS, cost: Object.freeze({ 'mat:timber': 1, ticket: 2 }) }),
]);
const _GS_KEYS = Object.freeze(GARDEN_BUILD_PARTS.map(p => p.k));
/* swap: the colours in a drawing that are not built from a theme (a house is: gardenBuildTheme). parts: what can be changed on it. */
const GARDEN_BUILDINGS = Object.freeze([
  Object.freeze({ id: 'garden-shop', name: 'Garden shop', house: 1, parts: _GS_KEYS }),
  Object.freeze({ id: 'tackle-shop', name: 'Tackle shop', house: 1, parts: _GS_KEYS }),
  Object.freeze({ id: 'market-stall', name: 'Market stall', parts: Object.freeze(['w', 'r', 'a', 's']), swap: Object.freeze({ w: ['#d8c490'], r: ['#b8901e'], a: ['#f0b92e'] }), sign: Object.freeze([0, -85]), ic: 'basket' }),
  Object.freeze({ id: 'lake-hall', name: 'The lake hall', parts: Object.freeze(['w', 'r', 'd', 's']), swap: Object.freeze({ w: ['#e8dcc0', '#a87c4f', '#e8e0c8'], r: ['#6a4a3a'], d: ['#5a3a20', '#5a4a3a'] }), sign: Object.freeze([0, -44]), ic: 'fish' }),
  Object.freeze({ id: 'land-office', name: 'Land office', parts: Object.freeze(['w', 'r', 's']), swap: Object.freeze({ w: ['#d8c490'], r: ['#7a5a3a', '#a07a50'] }), sign: Object.freeze([0, -59]), ic: 'land' }),
]);
const _GS_BUILD = new Map(GARDEN_BUILDINGS.map(b => [b.id, b]));
const _gsBlank = () => ({ w: 0, r: 0, d: 0, a: 0, ak: 0, rk: 0, s: 0 });
function _gsParse(v) {
  const o = _gsBlank(); if (typeof v !== 'string') return o;
  const a = v.split('.');
  _GS_KEYS.forEach((k, i) => { const n = Number(a[i]); if (Number.isInteger(n) && n >= 0 && n <= 31) o[k] = n; });
  return o;
}
function _gsIsBlank(L) { return _GS_KEYS.every(k => !L[k]); }
const _gstv = { visit: null, preview: null };
/** On a visit, the look of your friend's buildings (from the snapshot's `bk`). */
function gardenBuildLooksSet(rows) {
  const out = new Map();
  for (const r of rows || []) if (Array.isArray(r)) { const L = _gsBlank(); _GS_KEYS.forEach((k, i) => { L[k] = Number(r[i + 1]) || 0; }); out.set(r[0], L); }
  _gstv.visit = out;
}
function gardenBuildLookOf(id) {
  if (_gstv.preview && _gstv.preview.id === id) return _gstv.preview.look;
  if (gpVisiting()) return (_gstv.visit && _gstv.visit.get(id)) || _gsBlank();
  return _gsParse(_gdG().prefs['bk_' + id]);
}
/** For the snapshot. */
function gardenBuildWire() {
  const out = [];
  for (const b of GARDEN_BUILDINGS) { const L = _gsParse(_gdG().prefs['bk_' + b.id]); if (!_gsIsBlank(L)) out.push([b.id].concat(_GS_KEYS.map(k => L[k]))); }
  return out.length ? out : null;
}
/** What going from one look to another costs. */
function gardenBuildCost(b, was, look) {
  const out = {};
  for (const p of GARDEN_BUILD_PARTS) if (b.parts.includes(p.k) && look[p.k] && look[p.k] !== was[p.k]) for (const [k, n] of Object.entries(p.cost)) out[k] = (out[k] || 0) + n;
  return out;
}
function gardenBuildOptOpen(opt, ctx) { return !opt || !opt.open || !!opt.open(ctx); }
function gardenBuildPaint(id, look) {
  const b = _GS_BUILD.get(id); if (!b) return _gdNo('There is no such building');
  if (gpVisiting()) return _gdNo('Back in your own garden, you can');
  const m = gardenModel(), ctx = _gsCtx(m), g = _gdG(), pk = 'bk_' + id, was = _gsParse(g.prefs[pk]), cost = gardenBuildCost(b, was, look);
  for (const p of GARDEN_BUILD_PARTS) if (look[p.k] && look[p.k] !== was[p.k] && !gardenBuildOptOpen(p.opts[look[p.k]], ctx)) return _gdNo(p.opts[look[p.k]].how);
  if (!_gsCanPay(cost, m)) return _gdNo(`That takes ${gardenLookCostLine(cost)}`);
  const lk = 'pl.' + m.today + '.' + _gdUid(''), mark = _gdMark([['led', lk], ['prefs', pk]]), i = {};
  for (const [k, n] of Object.entries(cost)) i[k] = -n;
  if (Object.keys(i).length) g.led[lk] = { d: m.today, k: 'pl', i, n: 1 };
  if (_gsIsBlank(look)) delete g.prefs[pk]; else g.prefs[pk] = _GS_KEYS.map(k => look[k] || 0).join('.');
  const done = _gdDone(`${b.name}: painted, and friends can see it`, `painting ${b.name.toLowerCase()}`, mark, { icon: 'paintbrush' });
  // whoever is in your garden sees it now, not at their next visit
  setTimeout(() => { try { if (_gll.role === 'host' && _glh.on && _glhAnyone()) for (const A of _gll.actors.values()) if (A.f) _glhSendSnap(A.f); } catch (e) { /* the next visit has it */ } }, 300);
  return done;
}

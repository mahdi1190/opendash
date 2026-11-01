/* ============================================================
   GARDEN, regions: every fish and bug has a home on the map (docs/dev/GARDEN_PLAN.md, "Regions"). PURE: tables and plain functions, Node evaluates it (no state, no DOM).
   The owner, 1 Nov 2026: "we added loads more new fish and bugs, so we can relate these fish and bugs to specific areas of the map, and unlockables."

     GARDEN_REGIONS        the six pages of the book: what finishing each one gives
     GARDEN_REGION_WATERS  the waters that have fish of their own, beside the lake and the pond (world cells)
     gardenRegionHome(def) {r: region, w: water id, p: sight id, t: trail id}. Generated from each kind's habitat, then the hand-placed ones. Ids never change; a home is only worked out, never saved.
     gardenRegionHomeOpen  can you get there, given the areas that are open?

   Reaching the land is what unlocks a kind: if its home is not open, it is not there.
   ============================================================ */
const GARDEN_REGIONS = _gdRows([
  { id: 'garden', name: 'The main garden', on: 'in the main garden', icon: 'flower-2', color: '#8fbf6a', parts: _gdF([]), half: _gdF({ c: 100, decor: 'flower-barrow' }), full: _gdF({ c: 250, feat: 'lf-rg-garden', ribbon: 'region-garden' }), blurb: 'The kinds that come to whatever you grow. Everyone starts here.' },
  { id: 'lake', name: 'The lake', on: 'in the lake', icon: 'fish', color: '#6fb4d8', parts: _gdF([]), half: _gdF({ c: 150, decor: 'fish-flag' }), full: _gdF({ c: 400, feat: 'lf-rg-lake', ribbon: 'region-lake' }), blurb: 'From the shore to the far end of the deep water. Everything big lives here.' },
  { id: 'hill', name: 'The north hill', on: 'on the north hill', icon: 'flower', color: '#c8c67a', parts: _gdF(['lt-bramble', 'lt-foxglove', 'lt-ridge', 'lt-link']), half: _gdF({ c: 150, decor: 'hare-statue' }), full: _gdF({ c: 400, feat: 'lf-rg-hill', ribbon: 'region-hill' }), blurb: 'Meadow butterflies, a spring, a high tarn and the pool below the falls.' },
  { id: 'orchards', name: 'The east orchards', on: 'in the east orchards', icon: 'trees', color: '#d89a6a', parts: _gdF(['lt-apple', 'lt-cider', 'lt-pear', 'lt-wall']), half: _gdF({ c: 150, decor: 'apple-crate' }), full: _gdF({ c: 400, feat: 'lf-rg-orchards', ribbon: 'region-orchards' }), blurb: 'Stag beetles, old trees, the cider pond and a dip behind the wall.' },
  { id: 'fields', name: 'The west fields', on: 'in the west fields', icon: 'carrot', color: '#b8a25a', parts: _gdF(['lt-carrot', 'lt-bean', 'lt-cabbage', 'lt-deep']), half: _gdF({ c: 150, decor: 'hay-bale' }), full: _gdF({ c: 400, feat: 'lf-rg-fields', ribbon: 'region-fields' }), blurb: 'Crickets, ground beetles and the bees at the old boles. No water out here.' },
  { id: 'marsh', name: 'The south marsh', on: 'in the south marsh', icon: 'waves', color: '#7ab8a0', parts: _gdF(['lt-furrow', 'lt-board', 'lt-reed', 'lt-heron', 'lt-willow']), half: _gdF({ c: 150, decor: 'driftwood-seat' }), full: _gdF({ c: 400, feat: 'lf-rg-marsh', ribbon: 'region-marsh' }), blurb: 'Dragonflies, the frog pool, the mill race and the pools you can buy.' },
]);
const _GRG_REGION = new Map(GARDEN_REGIONS.map(r => [r.id, r]));
function gardenRegion(id) { return _GRG_REGION.get(String(id)) || null; }

/* The waters, world cells. All but the falls and the bought pools stand on thicket cells, where nobody walks and nothing is planted, so no path is cut and no saved plant is under water.
   via: the trail that opens it; cap: the longest fish (cm) that lives there; like: the kinds that belong in it, by name. */
const _GRG_WATER_ROWS = [
  { id: 'spring', name: 'Foxglove spring', r: 'hill', x: 20, y: 6, w: 1, h: 2, via: 'lt-bramble', cap: 20, like: /newt|stickle|minnow|shrimp|loach|sculpin|goby/ },
  { id: 'falls', name: 'the pool below the little falls', r: 'hill', area: 'pond', cap: 70, like: /trout|char|grayling|dace|darter|salmon|kokanee/ },   // the east end of the pond, where the falls come in: already water
  { id: 'tarn', name: 'the high tarn', r: 'hill', x: 36, y: 2, w: 5, h: 1, via: 'lt-ridge', cap: 80, like: /whitefish|vendace|cisco|herring|smelt|arctic|frost|fog/ },
  { id: 'cider', name: 'the cider pond', r: 'orchards', x: 49, y: 21, w: 3, h: 3, via: 'lt-apple', cap: 70, like: /orfe|ide$|rudd|roach|bream|tench|harvest|berry|primrose|sunny/ },
  { id: 'dip', name: 'the dip behind the wall', r: 'orchards', x: 48, y: 3, w: 2, h: 1, via: 'lt-wall', cap: 45, like: /gourami|tetra|betta|danio|rasbora|swordtail|discus|angelfish|guppy/ },
  { id: 'frogpool', name: 'the frog pool', r: 'marsh', x: 5, y: 26, w: 2, h: 1, via: 'lt-furrow', cap: 50, like: /newt|frog|mud|turtle|terrapin|axolotl|tadpole|crab|crayfish|puppy/ },
  { id: 'race', name: 'the mill race', r: 'marsh', x: 41, y: 30, w: 5, h: 1, via: 'lt-reed', cap: 90, like: /barbel|chub|nase|vimba|sucker|redhorse|bullhead|ruffe|lamprey|shad/ },
  { id: 'brook', name: 'the brook under the rope bridge', r: 'marsh', x: 47, y: 34, w: 3, h: 1, via: 'lt-reed', cap: 40, like: /dace|shiner|bleak|gudgeon|pebble|elver/ },
  { id: 'folly', name: 'the folly pool', r: 'marsh', x: 23, y: 38, w: 5, h: 1, via: 'lt-heron', cap: 60, like: /paper|wish|sun|sprite|crown|ghost/ },
  { id: 'light', name: 'the rocks by the lighthouse', r: 'marsh', x: 36, y: 38, w: 2, h: 1, via: 'lt-heron', cap: 60, like: /lantern|jelly|squid|hatchet|angler/ },
  { id: 'cavepool', name: 'the cave pool at the back of the mossy grotto', r: 'hill', room: 1, via: _grgDoorCell(gardenLandSight('ld-grotto')), cap: 40, like: /^$/ },   // inside a hidden room: its own cells past the map (94-garden-world-4rooms3water.js)
  { id: 'cellarpool', name: 'the flooded floor of the drowned cellar, under the sunken pool', r: 'garden', room: 1, via: _grgDoorCell(gardenLandSight('ld-sunk')), cap: 70, like: /^$/ },
];
const _GRG_POOL_LIKE = Object.freeze({ 'ls-lily-pool': /lily|pipefish|reed|weed|sunfish|bluegill|crappie/, 'ls-deep-pool': /catfish|burbot|snakehead|bowfin|gar$|eel/, 'ls-clear-pool': /clear|pearl|silver|glass/, 'ls-moon-pool': /moon|night/, 'ls-sedge-pool': /pike|perch|sedge/, 'ls-stone-pool': /bass|stone|rock/ });
const GARDEN_REGION_WATERS = _gdRows(_GRG_WATER_ROWS.map(w => {
  if (w.area !== 'pond') return w;
  const p = gardenArea('pond').water;   // derived, so it stays with the pond
  return Object.assign({}, w, { x: p.x + p.w - 2, y: p.y, w: 2, h: p.h });
}).concat(GARDEN_LAND_SECTIONS.filter(s => s.pool).map(s => ({ id: s.id, name: s.name.replace(/^The /, 'the '), r: 'marsh', sec: s.id, via: s.via, x: s.x, y: s.y, w: s.w, h: s.h, cap: 120, like: _GRG_POOL_LIKE[s.id] || /^$/ }))));
/** The zone a water is in: how far out it lies, and never before the way to it. Open water only counts when its zone is open. */
function _grgWaterZone(w) {
  if (w.room || w.area) return 0;
  if (w.sec) return (gardenLandRow(w.sec) || {}).zn || 0;
  return Math.max(gardenZoneOf(Math.floor(w.x + w.w / 2), Math.floor(w.y + w.h / 2)), (gardenLandRow(w.via) || {}).zn || 0);
}
const _GRG_WATER = new Map(GARDEN_REGION_WATERS.map(w => [w.id, w]));
const _GRG_WET = new Set();
for (const w of GARDEN_REGION_WATERS) if (!w.area && !w.sec) for (let y = w.y; y < w.y + w.h; y++) for (let x = w.x; x < w.x + w.w; x++) _GRG_WET.add(x + ',' + y);
/** Is this cell one of the waters that stand on a thicket? (gardenLandWaterAt asks; the falls and the pools are water already.) */
function gardenRegionWaterAt(x, y) { return _GRG_WET.has(x + ',' + y); }
function gardenRegionWaterDef(id) { return _GRG_WATER.get(String(id)) || null; }
function _grgWaterOfCell(x, y) { for (const w of GARDEN_REGION_WATERS) if (x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h && (w.area || (w.sec ? gardenLandCell(x, y) === gardenLandRow(w.sec) : _GRG_WET.has(x + ',' + y)))) return w; return null; }

/* ---------- the hand-placed ones: a few kinds at one place only ---------- */
const _GRG_FISH_HAND = Object.freeze({
  spring: ['ninespine', 'common-goby', 'pumpkinseed', 'signal-crayfish'],
  falls: ['grayling', 'brown-trout'],
  tarn: ['arctic-char'],
  frogpool: ['great-crested-newt', 'axolotl', 'terrapin', 'mud-puppy', 'frog-mouth', 'snapping-turtle', 'musk-turtle'],
  light: ['lantern-minnow', 'lantern-angler'],
  cavepool: ['blind-loach', 'moss-chub', 'drip-pearl'],
  cellarpool: ['jar-minnow', 'cellar-eel', 'barrel-carp'],
  'ls-moon-pool': ['moonfish', 'moon-gazer', 'new-moon-bream'],
  'ls-stone-pool': ['wishing-fish'],
  'ls-lily-pool': ['pearl-gourami'],
});
/* [the sight (GARDEN_LAND_SIGHTS, so wherever it stands), its region, the bugs that live only there] */
const _GRG_BUG_HAND = Object.freeze([
  ['ld-chapel', 'orchards', ['minotaur-beetle', 'violin-beetle']],
  ['ld-stump', 'orchards', ['stag-beetle', 'king-stag']],
  ['ld-ring', 'orchards', ['golden-stag', 'the-walking-branch']],
  ['ld-hollow', 'orchards', ['acorn-weevil', 'musk-beetle']],
  ['ld-clamp', 'orchards', ['ember-beetle', 'sawyer-beetle']],
  ['ld-treehouse', 'orchards', ['yule-moth']],
  ['ld-barrels', 'orchards', ['ruby-tailed-wasp', 'hornet']],
  ['ld-boles', 'fields', ['honey-queen', 'queen-of-the-hive', 'orchid-bee', 'golden-bee']],
  ['ld-hay', 'fields', ['scarecrows-friend', 'leaf-pile-earwig']],
  ['ld-pump', 'fields', ['fountain-fly']],
  ['ld-barn', 'fields', ['old-lady']],
  ['ld-beacon', 'hill', ['the-moonlit-bride', 'starlit-firefly']],
  ['ld-tower', 'hill', ['emperor-moth']],
  ['ld-grotto', 'hill', ['toadstool-sprite', 'glowcap-beetle']],
  ['ld-hut', 'hill', ['marbled-white']],
  ['ld-lighthouse', 'marsh', ['lantern-moth', 'fog-moth', 'comet-moth']],
  ['ld-frog', 'marsh', ['raft-spider', 'great-diving-beetle']],
  ['ld-mill', 'marsh', ['silver-mayfly', 'giant-water-bug']],
  ['ld-hide', 'marsh', ['the-dragon-king', 'norfolk-hawker']],
  ['ld-icehouse', 'marsh', ['ice-worm', 'frost-beetle', 'snow-queen']],
  ['ld-wish', 'marsh', ['well-spider']],
  ['ld-driftwood', 'marsh', ['antlion']],
  ['ld-temple', 'marsh', ['rainbow-scarab', 'sun-scarab']],
  ['ld-house', 'marsh', ['the-old-snail']],
  ['ld-statue', 'garden', ['jewel-beetle', 'orchid-hopper', 'old-vine-bee'], 'the old hothouse'],
]);
/** What you have to open to stand at a sight's door (a hidden room's door is there). */
function _grgDoorCell(s) { const c = gardenLandCell(s.door.x, s.door.y); return c && !c.lane && !c.solid ? c.id : _grgSightTrail(s); }
/** A sight's way in: the trail cell nearest to it. */
function _grgSightTrail(s) {
  let best = '', bd = 1e9;
  const W = GARDEN_WORLD;
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const c = gardenLandCell(x, y); if (!c || !c.trail) continue;
    const d = Math.abs(x - s.x) + Math.abs(y - s.y) + c.lv / 100;   // (level only breaks a tie: the easier way in)
    if (d < bd) { bd = d; best = c.id; }
  }
  return best;
}

/* ---------- every other home, generated from the kind itself ---------- */
const _GRG_BUG_HABS = Object.freeze({ flower: ['hill', 'garden', 'hill'], lawn: ['fields', 'hill', 'garden'], ground: ['fields', 'fields', 'orchards'], tree: ['orchards', 'orchards', 'garden'], woods: ['orchards', 'marsh', 'hill'], light: ['marsh', 'hill', 'garden'], water: ['marsh', 'marsh', 'marsh'] });
const _GRG_RANK = Object.freeze({ common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 });
const _GRG_FISH_STAY = /koi|goldfish|moor|fantail|comet|shubunkin|lionhead/;   // fancy ones belong to someone's pond
function _grgHash(id) { return gardenHash('rg|' + id) >>> 0; }
function _grgFishPlain(f) { return f.zone.includes('pond') && f.zone.length === 1 ? { r: 'garden', w: 'pond' } : { r: 'lake' }; }
function _grgFishFree(f) { return !(f.needs && (f.needs.spot || f.needs.decor || f.needs.plant || f.needs.home || f.needs.map)) && !(f.rarity === 'common' && f.lv <= 3); }
function _grgFishHomes() {
  const out = new Map(), small = GARDEN_REGION_WATERS;
  for (const [w, ids] of Object.entries(_GRG_FISH_HAND)) for (const id of ids) if (gardenFishDef(id)) out.set(id, { r: _GRG_WATER.get(w).r, w });
  for (const f of GARDEN_FISH_ONLY) {
    if (out.has(f.id)) continue;
    const plain = _grgFishPlain(f);
    if (!_grgFishFree(f) || _GRG_FISH_STAY.test(f.id)) { out.set(f.id, plain); continue; }
    const fit = small.filter(w => f.cm[1] <= w.cap && w.like.test(f.id));
    out.set(f.id, fit.length ? (w => ({ r: w.r, w: w.id }))(fit[_grgHash(f.id) % fit.length]) : plain);
  }
  // every water keeps a few that live there at any hour, from the day it opens, so nobody casts into an empty pool
  const open = (w) => { const t = w.area === 'pond' ? 7 : gardenLandRow(w.sec || w.via).lv; return t; };
  for (const w of small) {
    if (w.room) continue;   // only its own
    const easy = (f) => !f.tod.length && !f.seasons.length && !f.needs && f.lv <= open(w) && f.cm[1] <= w.cap, here = () => GARDEN_FISH_ONLY.filter(f => out.get(f.id).w === w.id && easy(f)).length;
    const spare = GARDEN_FISH_ONLY.filter(f => easy(f) && _grgFishFree(f) && (out.get(f.id).r === 'lake' || out.get(f.id).w === 'pond') && !_GRG_FISH_STAY.test(f.id)).sort((a, b) => _grgHash(w.id + a.id) - _grgHash(w.id + b.id));
    while (here() < 3 && spare.length) { const f = spare.shift(); out.set(f.id, { r: w.r, w: w.id }); }
  }
  return out;
}
function _grgBugHomes() {
  const out = new Map();
  for (const [sight, r, ids, room] of _GRG_BUG_HAND) { const s = gardenLandSight(sight); if (s) for (const id of ids) if (gardenBugDef(id)) out.set(id, Object.assign({ r, p: sight, t: room ? _grgDoorCell(s) : _grgSightTrail(s) }, room ? { room } : {})); }
  for (const b of GARDEN_BUGS) {
    if (out.has(b.id)) continue;
    if ((b.rarity === 'common' && b.lv <= 3) || (b.needs && (b.needs.plant || b.needs.decor || b.needs.home || b.needs.map))) { out.set(b.id, { r: 'garden' }); continue; }   // near the start, or it comes to what you grow
    const h = _grgHash(b.id), hab = b.hab.includes('water') ? 'water' : b.hab[h % b.hab.length], r = _GRG_BUG_HABS[hab][(h >>> 3) % 3], parts = gardenRegion(r).parts;
    out.set(b.id, parts.length ? { r, t: parts[Math.min(parts.length - 1, _GRG_RANK[b.rarity] + ((h >>> 6) % 3 === 0 ? 1 : 0))] } : { r });
  }
  return out;
}
const _GRG_FISH_HOME = _grgFishHomes(), _GRG_BUG_HOME = _grgBugHomes();
/** Where this kind lives, or null for a find (a boot turns up in any water). */
function gardenRegionHome(def) { return !def ? null : def.cat === 'bug' ? _GRG_BUG_HOME.get(def.id) || null : def.cat === 'fish' ? _GRG_FISH_HOME.get(def.id) || null : null; }
/** Every kind in a region: [{kind: 'fish' | 'bug', def}]. */
const _GRG_KINDS = new Map(GARDEN_REGIONS.map(r => [r.id, []]));
for (const f of GARDEN_FISH_ONLY) if (!(f.needs && f.needs.home)) _GRG_KINDS.get(_GRG_FISH_HOME.get(f.id).r).push({ kind: 'fish', def: f });   // (a garden's own kinds are on no page: no page should need a friend)
for (const b of GARDEN_BUGS) if (!(b.needs && b.needs.home)) _GRG_KINDS.get(_GRG_BUG_HOME.get(b.id).r).push({ kind: 'bug', def: b });
function gardenRegionKinds(id) { return _GRG_KINDS.get(String(id)) || []; }
/** Can you get to this home, with these areas open? */
function gardenRegionHomeOpen(H, areas) {
  if (!H) return true;
  if (H.w) { if (H.w === 'pond') return areas.includes('pond'); const w = _GRG_WATER.get(H.w), zn = _grgWaterZone(w); if (zn && !areas.includes('zn-' + zn)) return false; return w.sec ? areas.includes(w.sec) : w.area ? areas.includes(w.area) : areas.includes(w.via); }
  return !H.t || areas.includes(H.t);
}
/** Is this lake or pond kind one the lake holds? (what is "in stock" today comes from these) */
function gardenRegionInLake(f) { const H = gardenRegionHome(f); return !H || H.r === 'lake'; }

/* ---------- the plain words: these are what the book says ---------- */
function _grgTrailWords(id) { const t = gardenLandRow(id); if (!t) return ''; const n = t.name; return n.startsWith('The ') ? 't' + n.slice(1) : n.startsWith('Over ') ? n : 'the ' + n[0].toLowerCase() + n.slice(1); }
function _grgOpenWords(H) {
  if (H.w) {
    const w = H.w === 'pond' ? null : _GRG_WATER.get(H.w);
    if (!w || w.area) return 'The pond opens at garden level 7.';
    if (w.sec) { const s = gardenLandRow(w.sec), t = gardenLandRow(w.via); return `Open ${_grgTrailWords(w.via)} (garden level ${t.lv}), then buy ${w.name} at the land office (level ${s.lv}).`; }
    return `Open ${_grgTrailWords(w.via)} (garden level ${Math.max(gardenLandRow(w.via).lv, gardenZone(_grgWaterZone(w)).lv)}).`;
  }
  if (H.t) return `Open ${_grgTrailWords(H.t)} (garden level ${gardenLandRow(H.t).lv}).`;
  return '';
}
function _grgPlaceName(H) { const s = gardenLandSight(H.p); return s ? s.name.replace(/^The /, 'the ').replace(/^A /, 'a ') : ''; }
/** The book's lines for this kind: {where, reach}. null: nothing to add (the lake's fish: the zone's own words are right). */
function gardenRegionWords(def) {
  const H = gardenRegionHome(def); if (!H) return null;
  const R = gardenRegion(H.r), reach = _grgOpenWords(H);
  if (def.cat === 'fish') {
    if (H.r === 'lake' || H.w === 'pond') return reach ? { reach } : null;
    const w = _GRG_WATER.get(H.w);
    return { where: `Lives in ${w.name}, ${R.on}, and nowhere else.`, reach };
  }
  const near = def.hab.map(h => _GF_HAB_WORDS[h] || h);
  if (H.room) return { where: `Lives in ${H.room}, behind ${_grgPlaceName(H)}, and nowhere else.`, reach };
  if (H.p) return { where: `Lives at ${_grgPlaceName(H)}, ${R.on}, and nowhere else.`, reach };
  if (H.r === 'garden') return null;
  return { where: `Lives ${R.on}. Look near ${_gfOr(near)}.`, reach };
}
/** A word or two for a card. '': the card's own words will do. */
function gardenRegionShort(def) {
  const H = gardenRegionHome(def); if (!H || H.r === 'lake' || H.w === 'pond' || H.r === 'garden') return '';
  if (H.p) return _grgPlaceName(H);
  if (H.w) return _GRG_WATER.get(H.w).name;
  return gardenRegion(H.r).name.replace(/^The /, 'the ');
}
/** What stops a cast at this cell of any water, the lake too. '' if nothing. */
function gardenWaterNo(x, y, m) {
  const zone = gardenWaterZone(x, y); if (!zone) return '';
  if (zone === 'pond') return gardenRegionWaterNo(x, y, m.areas);
  return y >= gardenLakeOpenTo() ? `That far water is past the line of floats. It opens at garden level ${gardenLakeZoneOfRow(y).lv}.` : '';
}
/** What stops a cast here. '' if nothing. */
function gardenRegionWaterNo(x, y, areas) {
  if (x >= GARDEN_ROOM_X) return '';   // you are standing beside it
  const w = _grgWaterOfCell(x, y);
  if (w && !w.area) return gardenRegionHomeOpen({ w: w.id }, areas) ? '' : `${w.name[0].toUpperCase()}${w.name.slice(1)}: ${_grgOpenWords({ w: w.id })[0].toLowerCase()}${_grgOpenWords({ w: w.id }).slice(1)}`;
  return areas.includes('pond') ? '' : 'The pond opens at garden level 7.';
}
/** The school's bands for these waters: one small water each, only once it is open. */
function gardenRegionBands(areas) {
  const out = [];
  for (const w of GARDEN_REGION_WATERS) if (!w.room && gardenRegionHomeOpen({ w: w.id }, areas)) out.push({ key: 'r' + w.id, rw: w.id, zone: 'pond', x0: w.x + 0.2, x1: w.x + w.w - 0.2, y0: w.y + 0.2, y1: w.y + w.h - 0.2, n: 1 });
  return out;
}
/** What may swim in a band: a lake or pond band keeps its own kinds and the finds; a region's water has only what lives there, worked out afresh as they are from other zones. */
function gardenRegionOdds(odds, b, ctx) {
  if (!b.rw) { const pond = b.zone === 'pond'; return odds.filter(([id]) => { const d = gardenFishDef(id), H = gardenRegionHome(d); return !H || (pond ? H.w === 'pond' : H.r === 'lake'); }); }
  const out = [];
  for (const { kind, def } of gardenRegionKinds(_GRG_WATER.get(b.rw).r)) if (kind === 'fish' && _GRG_FISH_HOME.get(def.id).w === b.rw && gardenFishFits(def, Object.assign({}, ctx, { zone: def.zone[0] }))) out.push([def.id, gardenBugWeight(def, ctx)]);
  return out;
}
/** May this fish appear in this band? (the one that got away, a legend: they keep to where they live) */
function gardenRegionBandHas(id, b) { const H = gardenRegionHome(gardenFishDef(id)); if (!H) return true; return b.rw ? H.w === b.rw : b.zone === 'pond' ? H.w === 'pond' : H.r === 'lake'; }
/** The cells a bug of this home may sit on, open or not: its trail and the sections off it, or round its place. Cached. */
const _GRG_CELLS = new Map();
function _grgHomeCells(H) {
  const k = H.p || H.t; let c = _GRG_CELLS.get(k); if (c) return c;
  c = [];
  if (H.p) {
    const s = gardenLandSight(H.p);
    for (let y = s.y - 3; y <= s.y + 3; y++) for (let x = s.x - 3; x <= s.x + 3 + (s.w || 1); x++) { const q = gardenLandCell(x, y); if (q && !q.solid && !q.lane) c.push({ x, y, id: q.id, far: 0 }); }
    if (!c.some(q => q.id === H.t)) { const t = gardenLandRow(H.t), near = []; const W = GARDEN_WORLD; for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) if (gardenLandCell(x, y) === t) near.push({ x, y, id: t.id, d: Math.abs(x - s.x) + Math.abs(y - s.y) }); near.sort((a, b) => a.d - b.d); c.push(...near.slice(0, 5)); }
  } else {
    const W = GARDEN_WORLD;
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) { const q = gardenLandCell(x, y); if (q && !q.solid && (q.id === H.t || (q.plot && q.via === H.t))) c.push({ x, y, id: q.id }); }
  }
  _GRG_CELLS.set(k, c);
  return c;
}
/** Somewhere open for a bug that lives away from the garden: {x, y}, or null. free(x, y): nothing stands there. */
function gardenRegionBugCell(H, rnd, areas, free) {
  const cells = _grgHomeCells(H).filter(c => { if (!areas.includes(c.id)) return false; const n = gardenZoneOf(c.x, c.y); return !n || areas.includes('zn-' + n); });   // (not past a gate, even on a path that is open up to it)
  for (let i = 0; i < 10 && cells.length; i++) { const c = cells[Math.floor(rnd() * cells.length)]; if (free(c.x, c.y)) return { x: c.x + 0.5, y: c.y + 0.5 }; }
  return null;
}
/** For the throwaway check: is there a cell to stand on when this home is open? */
function gardenRegionHomeCellsOpen(H, areas) { return H.t || H.p ? _grgHomeCells(H).filter(c => areas.includes(c.id)).length : 1; }

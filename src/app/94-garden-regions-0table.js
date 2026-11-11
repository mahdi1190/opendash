/* ============================================================
   GARDEN, regions: every fish and bug has a home on the map (docs/dev/GARDEN_PLAN.md, "Regions"). PURE: tables and plain functions, Node evaluates it (no state, no DOM).
   The owner, 1 Nov 2026: "we added loads more new fish and bugs, so we can relate these fish and bugs to specific areas of the map, and unlockables."

     GARDEN_REGIONS        the six pages of the book: what finishing each one gives
     GARDEN_REGION_WATERS  the waters that have fish of their own, beside the lake and the pond (world cells)
     gardenRegionHome(def) {r: region, w: water id, p: sight id, t: trail id}. Generated from each kind's habitat, then the hand-placed ones. Ids never change; a home is only worked out, never saved.
     gardenRegionHomeOpen  can you get there, given the areas that are open?

   Reaching the land is what unlocks a kind: if its home is not open, it is not there.
   ============================================================ */
/* The journal's pages (GARDEN_JOURNAL_PAGES, 94-garden-fish-0catalog.js): one region of the vale each, the sea as the seventh. */
const GARDEN_REGIONS = _gdRows(GARDEN_JOURNAL_PAGES.map(p => ({ id: p.id, name: p.name, on: p.sea ? 'in the sea and the estuary' : 'in ' + p.name.replace(/^The /, 'the '), icon: p.sea ? 'waves' : 'map-pin', color: p.color, zone: p.zone, sea: p.sea || 0, parts: _gdF([]), blurb: p.line })));
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
  { id: 'cavepool', name: 'the cave pool at the back of the mossy grotto', r: 'hill', room: 1, at: 'ld-grotto', cap: 40, like: /^$/ },   // inside a hidden room: its own cells past the map (94-garden-world-4rooms3water.js)
  { id: 'cellarpool', name: 'the flooded floor of the drowned cellar, under the sunken pool', r: 'garden', room: 1, at: 'ld-sunk', cap: 70, like: /^$/ },
];
const _GRG_POOL_LIKE = Object.freeze({ 'ls-lily-pool': /lily|pipefish|reed|weed|sunfish|bluegill|crappie/, 'ls-deep-pool': /catfish|burbot|snakehead|bowfin|gar$|eel/, 'ls-clear-pool': /clear|pearl|silver|glass/, 'ls-moon-pool': /moon|night/, 'ls-sedge-pool': /pike|perch|sedge/, 'ls-stone-pool': /bass|stone|rock/ });
function gardenIslandBasinHomeIds(id) {
  const homes = { pond: ['pond', 'spring', 'falls', 'tarn'], 'allotment-pool': ['frogpool', 'race', 'brook', 'folly', 'light'], 'orchard-pool': ['cider', 'dip'] };
  return homes[id] || [];
}
/** Existing kinds have preferred coast habitats, not additional unlock tokens. */
const GARDEN_ISLAND_FISH_COASTS = _gdRows([
  { id: 'north', zone: 0, name: 'the north shore', like: /herring|mackerel|pollock|cod|haddock|whiting|sprat|smelt|flounder|plaice/ },
  { id: 'south', zone: 0, name: 'the south shore and harbour', like: /bass|mullet|bream|goby|blenny|sardine|anchov|wrasse|sole|dab/ },
  { id: 'forest', zone: 1, name: 'the wooded west coast', like: /eel|perch|pike|tench|carp|wood|moss|shade|stickle|loach/ },
  { id: 'valley', zone: 2, name: 'the valley estuary', like: /mullet|bream|flounder|eel|shad|salmon|trout|barbel|dace/ },
  { id: 'ruins', zone: 3, name: 'the rocky ruined coast', like: /crab|rock|stone|goby|blenny|sculpin|shrimp|mussel|oyster|bass/ },
  { id: 'orchard', zone: 4, name: 'the sunny orchard coast', like: /mackerel|sardine|anchov|bream|mullet|sun|gold|wrasse|pompano/ },
  { id: 'headland', zone: 5, name: 'the cold mountain headland', like: /cod|herring|haddock|pollock|char|salmon|arctic|frost|ice|sturgeon|halibut|ling|wolffish|lumpfish/ },
]);
function gardenIslandFishingReach(x, y) {
  const W = GARDEN_WORLD; let nearest = null, distance2 = Infinity;
  for (const loop of gardenIslandGeometry().land) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], dx = (b[0] - a[0]) * W.cellW, dy = (b[1] - a[1]) * W.cellH, t = Math.max(0, Math.min(1, ((x - a[0]) * W.cellW * dx + (y - a[1]) * W.cellH * dy) / (dx * dx + dy * dy || 1))), px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t, d2 = ((px - x) * W.cellW) ** 2 + ((py - y) * W.cellH) ** 2;
    if (d2 < distance2) { distance2 = d2; nearest = { x: px, y: py }; }
  }
  if (!nearest) return { id: 'south', zone: 0, distance: Infinity };
  const dx = nearest.x - x, dy = nearest.y - y, length = Math.hypot(dx, dy) || 1; let region = null;
  for (const inset of [.25, .6, 1]) { const px = nearest.x + dx / length * inset, py = nearest.y + dy / length * inset; if (gardenIslandLandContains(px, py)) { region = gardenIslandRegionAt(px, py); break; } }
  const zone = region && region.zone || 0, id = ({ 1: 'forest', 2: 'valley', 3: 'ruins', 4: 'orchard', 5: 'headland' })[zone] || (y < nearest.y ? 'north' : 'south');
  return { id, zone, distance: Math.sqrt(distance2) };
}
function gardenIslandFishCoastHint(def) {
  if (!def || def.cat !== 'fish') return null;
  if (def.home && def.home.c) return GARDEN_ISLAND_FISH_COASTS.find(coast => coast.id === def.home.c) || null;   // the vale: its own coast
  const matches = GARDEN_ISLAND_FISH_COASTS.filter(coast => coast.like.test(def.id));
  // More specific later regions explain a journey, while the species remains catchable elsewhere.
  return matches.findLast ? matches.findLast(coast => coast.zone > 0) || matches[0] || null : matches.slice().reverse().find(coast => coast.zone > 0) || matches[0] || null;
}
function gardenIslandFishCoastOdds(odds, band) {
  if (!band.islandOcean || !band.coastHabitat) return odds;
  const coast = GARDEN_ISLAND_FISH_COASTS.find(row => row.id === band.coastHabitat), open = !coast?.zone || band.islandAreas.includes('zn-' + coast.zone);
  if (!coast || !open) return odds.filter(([id]) => { const d = gardenFishDef(id); return !(d && d.cat === 'fish' && d.home && d.home.c) || d.rarity === 'common'; });
  // a sea fish keeps to its own coast (def.home.c); the commons wander along any open coast, at a quarter of the odds
  const out = [];
  for (const [id, weight] of odds) {
    const def = gardenFishDef(id), H = def && def.cat === 'fish' ? def.home : null;
    if (!H || !H.c) { out.push([id, weight]); continue; }
    const home = GARDEN_ISLAND_FISH_COASTS.find(row => row.id === H.c), homeOpen = !home || !home.zone || band.islandAreas.includes('zn-' + home.zone);
    if (H.c === coast.id) out.push([id, weight * 2.4]); else if (def.rarity === 'common' && homeOpen) out.push([id, weight * 0.25]);
  }
  return out;
}
function gardenIslandBasinPatchHomes(pool, centre) {
  const mx = pool.wet.x + pool.wet.w / 2, my = pool.wet.y + pool.wet.h / 2;
  if (pool.id === 'pond') return ['pond'].concat(centre.y < my ? ['spring', 'tarn'] : [], centre.x >= mx ? ['falls'] : []);
  if (pool.id === 'allotment-pool') return centre.x < mx ? ['frogpool', 'race', 'brook'] : ['folly', 'light'];
  if (pool.id === 'orchard-pool') return centre.y < my ? ['dip'] : ['cider'];
  return gardenIslandBasinHomeIds(pool.id).slice();
}
function _grgIslandBasin(id) { return (gardenIslandData().freshwater || []).find(pool => gardenIslandBasinHomeIds(pool.id).includes(id)) || null; }
function _grgIslandHomeZone(home) { const p = gardenJournalPage(home.r); return p ? p.zone : 0; }
const GARDEN_REGION_WATERS = _gdRows(_GRG_WATER_ROWS.map(w => {
  if (GARDEN_WORLD.v >= 4 && !w.room) { const pool = _grgIslandBasin(w.id); if (pool) return Object.assign({}, w, pool.wet, { islandBasin: pool.id }); }
  if (w.area !== 'pond') return w;
  const p = gardenArea('pond').water;   // derived, so it stays with the pond
  return Object.assign({}, w, { x: p.x + p.w - 2, y: p.y, w: 2, h: p.h });
}).concat(GARDEN_LAND_SECTIONS.filter(s => s.pool).map(s => ({ id: s.id, name: s.name.replace(/^The /, 'the '), r: 'marsh', sec: s.id, via: s.via, x: s.x, y: s.y, w: s.w, h: s.h, cap: 120, like: _GRG_POOL_LIKE[s.id] || /^$/ }))));
/** The zone a water is in: how far out it lies, and never before the way to it. Open water only counts when its zone is open. */
function _grgWaterZone(w) {
  if (w.room) return 0;
  if (GARDEN_WORLD.v >= 4 && w.islandBasin) return gardenZoneOf(Math.floor(w.x + w.w / 2), Math.floor(w.y + w.h / 2));
  if (w.area) return 0;
  if (w.sec) return (gardenLandRow(w.sec) || {}).zn || 0;
  return Math.max(gardenZoneOf(Math.floor(w.x + w.w / 2), Math.floor(w.y + w.h / 2)), (gardenLandRow(w.via) || {}).zn || 0);
}
const _GRG_WATER = new Map(GARDEN_REGION_WATERS.map(w => [w.id, w]));
const _GRG_WET = new Set();
for (const w of GARDEN_REGION_WATERS) if (!w.area && !w.sec) for (let y = w.y; y < w.y + w.h; y++) for (let x = w.x; x < w.x + w.w; x++) _GRG_WET.add(x + ',' + y);
/** Is this cell one of the waters that stand on a thicket? (gardenLandWaterAt asks; the falls and the pools are water already.) */
function gardenRegionWaterAt(x, y) { return _GRG_WET.has(x + ',' + y); }
function gardenRegionWaterDef(id) {
  const w = _GRG_WATER.get(String(id)) || null; if (!w || !w.room || !w.at) return w;
  const s = gardenLandSightPhysical(w.at);
  return Object.assign({}, w, { via: s ? _grgSightHomeTrail(s, true) : '', entrance: s && s.door ? { x: s.door.x + .5, y: s.door.y + .5 } : null });
}
function _grgWaterOfCell(x, y) { for (const w of GARDEN_REGION_WATERS) if (x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h && (w.area || (w.sec ? gardenLandCell(x, y) === gardenLandRow(w.sec) : _GRG_WET.has(x + ',' + y)))) return w; return null; }

/* ---------- every kind's home is placed by hand, in its own row (def.home: {r: page, w: water} | {r, sea, c: coast} | {r} | {r, g: 1}) ---------- */
/** What you have to open to stand at a sight's door (a hidden room's door is there). */
function _grgDoorCell(s) { const c = gardenLandCell(s.door.x, s.door.y); return c && !c.lane && !c.solid ? c.id : _grgSightTrail(s); }
/** A sight's way in: the trail cell nearest to it. */
function _grgSightHomeTrail(s, door) {
  if (GARDEN_WORLD.v >= 3) {
    const p = door && s.door ? s.door : { x: s.x + (s.w || 1) / 2, y: s.y + (s.h || 1) }, c = gardenLandCell(Math.floor(p.x), Math.floor(p.y));
    if (c && !c.solid) return c.lane ? '' : c.id;
  }
  return door ? _grgDoorCell(s) : _grgSightTrail(s);
}
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

function _grgHash(id) { return gardenHash('rg|' + id) >>> 0; }
const _GRG_FISH_HOME = new Map(GARDEN_FISH_ONLY.map(f => [f.id, f.home])), _GRG_BUG_HOME = new Map(GARDEN_BUGS.map(b => [b.id, b.home]));
/** Where this kind lives, or null for a find (a boot turns up in any water). */
function gardenRegionHome(def) {
  const H = !def ? null : def.cat === 'bug' ? _GRG_BUG_HOME.get(def.id) || null : def.cat === 'fish' ? _GRG_FISH_HOME.get(def.id) || null : null;
  if (!H || !H.p || GARDEN_WORLD.v < 3) return H;
  const s = gardenLandSightPhysical(H.p); return s ? Object.assign({}, H, { t: _grgSightHomeTrail(s, !!H.room) }) : H;
}
/** Every kind in a region: [{kind: 'fish' | 'bug', def}]. */
const _GRG_KINDS = new Map(GARDEN_REGIONS.map(r => [r.id, []]));
for (const f of GARDEN_FISH_ONLY) if (!(f.needs && f.needs.home)) _GRG_KINDS.get(_GRG_FISH_HOME.get(f.id).r).push({ kind: 'fish', def: f });   // (a garden's own kinds are on no page: no page should need a friend)
for (const b of GARDEN_BUGS) if (!(b.needs && b.needs.home)) _GRG_KINDS.get(_GRG_BUG_HOME.get(b.id).r).push({ kind: 'bug', def: b });
function gardenRegionKinds(id) { return _GRG_KINDS.get(String(id)) || []; }
/** Can you get to this home, with these areas open? */
function gardenRegionHomeOpen(H, areas) {
  if (!H) return true;
  if (H.w) {
    if (H.w === 'pond') return GARDEN_WORLD.v >= 4 ? true : areas.includes('pond'); const w = gardenRegionWaterDef(H.w); if (!w) return false;
    if (GARDEN_WORLD.v >= 4 && w.islandBasin) return !gardenZoneLockOf(w.x + w.w / 2, w.y + w.h / 2, areas);
    if (w.room) {
      if (!w.entrance) return false; const zn = gardenZoneOf(Math.floor(w.entrance.x), Math.floor(w.entrance.y));
      return (!zn || areas.includes('zn-' + zn)) && (!w.via || areas.includes(w.via));
    }
    const zn = _grgWaterZone(w); if (zn && !areas.includes('zn-' + zn)) return false; return w.sec ? areas.includes(w.sec) : w.area ? areas.includes(w.area) : areas.includes(w.via);
  }
  if (H.p && GARDEN_WORLD.v >= 3) {
    const s = gardenLandSightPhysical(H.p); if (!s) return false;
    const p = s.door || s, zn = gardenZoneOf(Math.floor(p.x), Math.floor(p.y)), t = _grgSightHomeTrail(s, !!H.room);
    return (!zn || areas.includes('zn-' + zn)) && (GARDEN_WORLD.v >= 4 || !t || areas.includes(t));
  }
  if (H.sea) { const coast = GARDEN_ISLAND_FISH_COASTS.find(row => row.id === H.c); return !coast || !coast.zone || areas.includes('zn-' + coast.zone); }
  if (GARDEN_WORLD.v >= 4 && (H.t || !H.g)) { const zone = _grgIslandHomeZone(H); return !zone || areas.includes('zn-' + zone); }
  return !H.t || areas.includes(H.t);
}
/** Is this lake or pond kind one the lake holds? (what is "in stock" today comes from these) */
function gardenRegionInLake(f) { const H = gardenRegionHome(f); return !H || !!H.sea; }

/* ---------- the plain words: these are what the book says ---------- */
function _grgTrailWords(id) { const t = gardenLandRow(id); if (!t) return ''; const n = t.name; return n.startsWith('The ') ? 't' + n.slice(1) : n.startsWith('Over ') ? n : 'the ' + n[0].toLowerCase() + n.slice(1); }
function _grgSightReachWords(id, inside) {
  const s = gardenLandSight(id); if (!s) return '';
  const name = s.name.replace(/^The /, 'the ').replace(/^A /, 'a ');
  if (gardenLandSightPhysical(id)) return (inside ? 'Use the entrance beside ' : 'Look around ') + name + '.';
  return typeof gardenSightKnown === 'function' && gardenSightKnown(id) ? 'Set out ' + name + ' nearby from Land → Your discovered places.' : 'Find ' + name + (inside ? ' and its way inside.' : '.');
}
function _grgOpenWords(H) {
  if (GARDEN_WORLD.v >= 4) {
    if (H.p) return _grgSightReachWords(H.p, !!H.room);
    if (H.w) {
      const water = H.w === 'pond' ? null : gardenRegionWaterDef(H.w);
      if (water && water.room && water.at) return _grgSightReachWords(water.at, true);
      if (water && water.sec) { const section = gardenLandRow(water.sec), region = gardenIslandRegionForZone(section.zn); return (region ? 'Enter ' + region.name.toLowerCase() + ' at garden level ' + region.level + ', then ' : '') + 'buy ' + water.name + ' at the land office.'; }
      const zone = water ? _grgWaterZone(water) : 0, region = gardenIslandRegionForZone(zone);
      return region ? 'Enter ' + region.name.toLowerCase() + ' at garden level ' + region.level + '.' : 'The village lake is open from the beginning.';
    }
    if (H.t) { const region = gardenIslandRegionForZone(_grgIslandHomeZone(H)); return region ? 'Enter ' + region.name.toLowerCase() + ' at garden level ' + region.level + '.' : 'Look around the village.'; }
  }
  if (H.w) {
    const w = H.w === 'pond' ? null : gardenRegionWaterDef(H.w);
    if (w && w.room && w.at) return _grgSightReachWords(w.at, true);
    if (!w || w.area) return 'The pond opens at garden level 7.';
    if (w.sec) { const s = gardenLandRow(w.sec), t = gardenLandRow(w.via); return `Open ${_grgTrailWords(w.via)} (garden level ${t.lv}), then buy ${w.name} at the land office (level ${s.lv}).`; }
    return `Open ${_grgTrailWords(w.via)} (garden level ${Math.max(gardenLandRow(w.via).lv, gardenZone(_grgWaterZone(w)).lv)}).`;
  }
  if (H.p && GARDEN_WORLD.v >= 3) return _grgSightReachWords(H.p, !!H.room);
  if (H.t) return `Open ${_grgTrailWords(H.t)} (garden level ${gardenLandRow(H.t).lv}).`;
  return '';
}
function _grgPlaceName(H) { const s = gardenLandSight(H.p); return s ? s.name.replace(/^The /, 'the ').replace(/^A /, 'a ') : ''; }
/** The book's lines for this kind: {where, reach}. null: nothing to add (the lake's fish: the zone's own words are right). */
function gardenRegionWords(def) {
  const H = gardenRegionHome(def); if (!H) return null;
  const R = gardenRegion(H.r), reach = _grgOpenWords(H);
  if (def.cat === 'fish') {
    if (GARDEN_WORLD.v >= 4 && H.sea) {
      const coast = gardenIslandFishCoastHint(def), region = coast && gardenIslandRegionForZone(coast.zone);
      return { where: coast ? 'Coastal water, especially ' + coast.name + '. Other open coasts can hold it too.' : 'Open coastal water around the island, north and south as well as the main pier.', reach: region ? region.name + ' opens at garden level ' + region.level + '; its shore favours this kind.' : 'Explore either public shore. Fish gather near people without requiring the main pier.' };
    }
    if (GARDEN_WORLD.v >= 4 && H.w === 'pond') return { where: 'The village lake, along its different banks.', reach: 'The village lake is open from the beginning. Spring-fed fish favour the north bank; the falls feed its east side.' };
    if (H.sea || H.w === 'pond') return reach ? { reach } : null;
    const w = _GRG_WATER.get(H.w);
    if (GARDEN_WORLD.v >= 4 && !w.room) { const basin = w.islandBasin && _grgIslandBasin(w.id), place = basin ? ({ pond: 'the village lake', 'allotment-pool': 'the ruined woodland pond', 'orchard-pool': 'the orchard pond' })[basin.id] : w.name; const bank = ({ spring: 'the spring-fed north bank', tarn: 'the cooler north bank', falls: 'the eastern falls', frogpool: 'the reed-lined west bank', race: 'the west inlet', brook: 'the west inlet', folly: 'the quiet east bank', light: 'the eastern rocks', dip: 'the shaded north bank', cider: 'the sunny south bank' })[H.w]; return { where: 'Lives in ' + place + (bank ? ', near ' + bank : '') + '.', reach }; }
    return { where: `Lives in ${w.name}, ${R.on}, and nowhere else.`, reach };
  }
  const near = def.hab.map(h => _GF_HAB_WORDS[h] || h);
  if (H.room) return { where: `Lives in ${H.room}, behind ${_grgPlaceName(H)}, and nowhere else.`, reach };
  if (H.p) return { where: `Lives at ${_grgPlaceName(H)}, ${R.on}, and nowhere else.`, reach };
  if (H.g) return null;
  return { where: `Lives ${R.on}. Look near ${_gfOr(near)}.`, reach };
}
/** A word or two for a card. '': the card's own words will do. */
function gardenRegionShort(def) {
  const H = gardenRegionHome(def); if (!H || H.sea || H.w === 'pond' || H.g) return '';
  if (H.p) return _grgPlaceName(H);
  if (H.w) return _GRG_WATER.get(H.w).name;
  return gardenRegion(H.r).name.replace(/^The /, 'the ');
}
/** What stops a cast at this cell of any water, the lake too. '' if nothing. */
function gardenWaterNo(x, y, m) {
  const zone = gardenWaterZone(x, y); if (!zone) return '';
  if (GARDEN_WORLD.v >= 4 && x < GARDEN_ROOM_X) {
    const locked = gardenZoneLockOf(x, y, m.areas); if (!locked) return '';
    const region = gardenIslandRegionForZone(Number(locked.slice(3))), row = gardenArea(locked);
    return (region ? region.name : row.name) + ' opens at garden level ' + (region ? region.level : row.lv) + '.';
  }
  if (zone === 'pond') return gardenRegionWaterNo(x, y, m.areas);
  return y >= gardenLakeOpenTo() ? `That far water is past the line of floats. It opens at garden level ${gardenLakeZoneOfRow(y).lv}.` : '';
}
/** What stops a cast here. '' if nothing. */
function gardenRegionWaterNo(x, y, areas) {
  if (x >= GARDEN_ROOM_X) return '';   // you are standing beside it
  if (GARDEN_WORLD.v >= 4) { const locked = gardenZoneLockOf(x, y, areas); return locked ? gardenArea(locked).name + ' opens at garden level ' + gardenArea(locked).lv + '.' : ''; }
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
  if (b.islandHomeWaters) {
    const out = odds.filter(([id]) => gardenFishDef(id).cat !== 'fish');
    const mine = GARDEN_FISH_ONLY.filter(def => { const home = gardenRegionHome(def); return home && b.islandHomeWaters.includes(home.w) && gardenRegionHomeOpen(home, b.islandAreas); });
    for (const def of mine) if (gardenFishFits(def, Object.assign({}, ctx, { zone: def.zone[0] }))) out.push([def.id, gardenBugWeight(def, ctx)]);
    // a water is never empty: when none of its own is about at this hour or season, its commons still bite, at half the odds
    if (!out.some(([id]) => gardenFishDef(id).cat === 'fish')) for (const def of mine) if (def.rarity === 'common' && gardenFishFits(Object.assign({}, def, { tod: [], seasons: [] }), Object.assign({}, ctx, { zone: def.zone[0] }))) out.push([def.id, gardenBugWeight(def, ctx) * 0.5]);
    return out;
  }
  if (!b.rw) { const pond = b.zone === 'pond', local = odds.filter(([id]) => { const d = gardenFishDef(id), H = gardenRegionHome(d); return !H || (pond ? H.w === 'pond' : !!H.sea); }); return gardenIslandFishCoastOdds(local, b); }
  const out = [];
  for (const def of GARDEN_FISH_ONLY) if (_GRG_FISH_HOME.get(def.id).w === b.rw && gardenFishFits(def, Object.assign({}, ctx, { zone: def.zone[0] }))) out.push([def.id, gardenBugWeight(def, ctx)]);
  return out;
}
/** May this fish appear in this band? (the one that got away, a legend: they keep to where they live) */
function gardenRegionBandHas(id, b) { const H = gardenRegionHome(gardenFishDef(id)); if (!H) return true; if (b.islandHomeWaters) return b.islandHomeWaters.includes(H.w) && gardenRegionHomeOpen(H, b.islandAreas); return b.rw ? H.w === b.rw : b.zone === 'pond' ? H.w === 'pond' : !!H.sea; }
/** The cells a bug of this home may sit on, open or not: its trail and the sections off it, or round its place. Cached. */
const _GRG_CELLS = new Map(), _GRG_CELL_PLACES = new Map();
function _grgHomeCells(H) {
  const k = H.p || H.t || 'r:' + H.r, s = H.p ? gardenLandSightPhysical(H.p) : null;
  if (s && GARDEN_WORLD.v >= 3) H = Object.assign({}, H, { t: _grgSightHomeTrail(s, !!H.room) });
  if (H.p) {
    const signature = s ? [s.x, s.y, s.w || 1, s.h || 1, _grgSightHomeTrail(s, !!H.room)].join('|') : 'packed';
    if (_GRG_CELL_PLACES.get(k) !== signature) { _GRG_CELL_PLACES.set(k, signature); _GRG_CELLS.delete(k); }
  }
  let c = _GRG_CELLS.get(k); if (c) return c;
  c = [];
  if (H.p) {
    if (!s) { _GRG_CELLS.set(k, c); return c; } // Packed landmarks have no physical wildlife home.
    for (let y = s.y - 3; y <= s.y + 3; y++) for (let x = s.x - 3; x <= s.x + 3 + (s.w || 1); x++) { const q = gardenLandCell(x, y); if (q && !q.solid && !q.lane) c.push({ x, y, id: GARDEN_WORLD.v >= 4 && !q.plot ? 'zn-' + gardenZoneOf(x, y) : q.id, far: 0 }); }
    if (!c.some(q => q.id === H.t)) { const t = gardenLandRow(H.t), near = []; const W = GARDEN_WORLD; if (t) for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) if (gardenLandCell(x, y) === t) near.push({ x, y, id: t.id, d: Math.abs(x - s.x) + Math.abs(y - s.y) }); near.sort((a, b) => a.d - b.d); c.push(...near.slice(0, 5)); }
  } else {
    const W = GARDEN_WORLD, island = W.v >= 4, zone = island ? _grgIslandHomeZone(H) : 0;
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) { const q = gardenLandCell(x, y), base = island && gardenIslandBaseCell(x, y); if (island ? q && !q.solid && base.land && !base.reserved && !base.beach && !base.freshwater && base.regionZone === zone : q && !q.solid && (q.id === H.t || q.plot && q.via === H.t)) c.push({ x, y, id: island && !q.plot ? 'zn-' + zone : q.id }); }
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

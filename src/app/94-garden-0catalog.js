/* ============================================================
   GARDEN, the catalogue (2.18, agent 'garden-engine'). PURE: tables and small
   functions only; nothing is drawn at load and nothing here touches the DOM or
   the state, so Node can evaluate it the way lib/profile-avatar.mjs evaluates
   the avatar kit (a server-side friends layer may reuse gardenSnapshotClean).
   User request, 24 Oct 2026: "make the garden feature way way better with far
   more things, make the garden feature like a game so more interactable etc,
   more plants, more everything".

   EVERY ID IS STABLE AND UNIQUE ACROSS ALL TABLES (plants, decorations,
   visitors, tiles, areas, tools, bouquets). Ids are saved in the state, synced
   between your devices and sent to friends inside a garden snapshot: never
   rename or reuse one; retire an id by leaving it in place with `retired: 1`.

     GARDEN_WORLD                 the grid: 20 x 11 cells, cell 48 x 30 px on screen, art unit 64 per cell
     GARDEN_RARITY                common / uncommon / rare / epic / legendary {label, colour, weight}
     GARDEN_SEASONS               spring / summer / autumn / winter
     GARDEN_GROW                  growth speeds: the effective hours to reach stage 1..4
     GARDEN_CATS                  plant categories {label, icon, areas, stages: names of stages 0..4, verb}
     GARDEN_PLANTS                131 plants (see the row helper _gP below for every field)
     GARDEN_DECOR                 74 decorations (paths, fences, seats, water, lights, structures, ornaments,
                                  planters, wildlife homes, seasonal) with their effects
     GARDEN_VISITORS              29 visitors (insects, birds, mammals, pond life) and when they come
     GARDEN_TILES                 ground tiles (the areas' grounds and the pond water)
     GARDEN_AREAS                 the areas and the lawn: where they are, their level, what grows there (the four plots you could buy are split into sections: 94-garden-lands-0table.js)
     GARDEN_TOOLS                 watering cans, the hose, golden shears, fertiliser
     GARDEN_BOUQUETS              bouquet styles (which flowers make which bouquet)
     GARDEN_LEVELS                level titles; gardenLevelOf(xp) -> {level, into, need, pct, title}
     GARDEN_RIBBONS               the garden's own achievements (facts from gardenFacts in 94-garden-1core.js)
     GARDEN_DAILY / GARDEN_QUESTS daily garden tasks and weekly garden quests (picked by date)
     GARDEN_EVENTS                seasonal garden events (Trick or treat matches agent fun's window)
     GARDEN_ART                   THE ART CONTRACT (agent 'garden-art'), see below and docs/dev/GARDEN.md

   Helpers: gardenPlant(id), gardenDecor(id), gardenVisitor(id), gardenTile(id), gardenArea(id), gardenTool(id),
   gardenDef(id) (any table, with .kind), gardenSeasonOf(iso, south), gardenEventsOn(iso), gardenInSeason(def, season),
   gardenStageAt(def, hours), gardenStageName(def, stage), gardenLockOf(def, ctx), gardenAreaAt(x, y, level),
   gardenCellOk(def, x, y, level), gardenLevelOf(xp), gardenPickDaily(iso, level), gardenPickQuests(weekFrom, level),
   gardenBouquetOf(flowers), gardenHash(s), gardenRand(seed), gardenArtBox(kind, id), gardenSnapshotClean(raw).

   THE ART CONTRACT (GARDEN_ART; agent 'garden-art' implements it, the engine calls it):
     gardenArt(id, o) -> an SVG FRAGMENT string ('<g>…</g>', no outer <svg>), or '' / null to fall back.
       o {kind: 'plant'|'decor'|'visitor'|'tile'|'crop'|'seed'|'tool'|'bouquet',
          stage 0..4 (plants; 0 = just planted), season 'spring'|'summer'|'autumn'|'winter',
          variant 0..7 (a colour variant: look.v[variant], or a decoration's style), size 's'|'m'|'l'
          (detail: 's' on the small Home card, 'l' for close-ups and photos), t 0..1 (a stable per-instance
          phase: small differences so two roses are not twins), tod 'dawn'|'day'|'dusk'|'night',
          r 0..3 (decorations: facing; fences 0/2 run left-right, 1/3 front-back), thirsty (droop a little),
          overgrown (wild, wants a trim), ripe (fruit or flowers ready), silhouette (almanac: one flat colour),
          uid (a safe id prefix for any <defs> ids)}
       Coordinates: (0, 0) is the ground anchor at the bottom centre of the footprint. One cell is 64 units
       wide; a footprint of w x h cells spans x -32w..32w; the art grows UP (negative y) to about
       -64 * look.h for plants (GARDEN_ART.box gives each kind's box) and may dip to +8 for shadows.
       Explicit colours only (no CSS variables, no external references, no <image>, no text, no scripts):
       the photo mode turns the whole garden into a PNG through a canvas. Deterministic: the same inputs
       give the same string (the engine caches it). Animation is by class names only, the engine's CSS
       runs them and stops them for reduced motion and Fun level Off: gda-sway (a plant moves from its
       base), gda-flutter (wings), gda-glow (lights and glowing plants at night), gda-ripple (water),
       gda-flicker (flames), gda-spin (pinwheels, windmills), gda-bob (floating, bobbing), gda-blink.
     Until agent 'garden-art' lands, the engine draws gardenArtPlaceholder(id, o) (94-garden-2art.js).
   ============================================================ */
const GARDEN_V = 1;
function _gdF(o) { return Object.freeze(o); }
function _gdRows(list) { return Object.freeze(list.map(r => Object.freeze(r))); }

/* ---------- the world ---------- */
/* 2.22: the garden grew. The first 20 x 11 cells are exactly where they were (every saved x, y stays valid); the Wild
   woods run down the east side (x 20..27) and the Lake lies along the south (y 11..17) with its pier and tackle shop. */
// 2.23: 60 x 30 (it was 28 x 18, and 20 x 11 before that). Every saved x, y stays where it was: new land only ever goes east and south. coreCols, coreRows: what a friend on 2.22 can draw.
const GARDEN_WORLD = _gdF({ cols: 60, rows: 30, cellW: 48, cellH: 30, sky: 150, unit: 64, oldCols: 20, oldRows: 11, coreCols: 28, coreRows: 18 });

const GARDEN_RARITY = _gdF({
  common: _gdF({ label: 'Common', col: '#7c8b6f', weight: 60 }),
  uncommon: _gdF({ label: 'Uncommon', col: '#3f8f5a', weight: 25 }),
  rare: _gdF({ label: 'Rare', col: '#3a6fc4', weight: 10 }),
  epic: _gdF({ label: 'Epic', col: '#8a4fc9', weight: 4 }),
  legendary: _gdF({ label: 'Legendary', col: '#c98a12', weight: 1 }),
});
const GARDEN_SEASONS = _gdF(['spring', 'summer', 'autumn', 'winter']);
const GARDEN_SEASON_LABEL = _gdF({ spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' });
/* Growth: effective hours (time, activity and care; 94-garden-1core.js) to reach stages 1, 2, 3, 4. */
const GARDEN_GROW = _gdF({
  quick: _gdF([2, 6, 12, 20]), fast: _gdF([3, 10, 22, 36]), medium: _gdF([6, 18, 40, 64]),
  slow: _gdF([10, 30, 72, 120]), tree: _gdF([24, 96, 240, 480]), ancient: _gdF([48, 192, 480, 960]),
});
const GARDEN_CATS = _gdF({
  flower: _gdF({ label: 'Flowers', one: 'flower', icon: 'flower-2', areas: _gdF(['bed', 'meadow', 'greenhouse']), stages: _gdF(['Seed', 'Sprout', 'Leafy', 'In bud', 'In bloom']), verb: 'Cut flowers' }),
  wild: _gdF({ label: 'Wildflowers', one: 'wildflower', icon: 'flower', areas: _gdF(['meadow', 'bed', 'orchard']), stages: _gdF(['Seed', 'Sprout', 'Leafy', 'In bud', 'In bloom']), verb: 'Pick' }),
  herb: _gdF({ label: 'Herbs', one: 'herb', icon: 'leaf', areas: _gdF(['bed', 'veg', 'greenhouse']), stages: _gdF(['Seed', 'Sprout', 'Small', 'Bushy', 'Ready to pick']), verb: 'Pick' }),
  veg: _gdF({ label: 'Vegetables', one: 'vegetable', icon: 'carrot', areas: _gdF(['veg', 'greenhouse']), stages: _gdF(['Seed', 'Sprout', 'Leafy', 'Growing', 'Ready']), verb: 'Harvest' }),
  fruit: _gdF({ label: 'Fruit', one: 'fruit bush', icon: 'cherry', areas: _gdF(['veg', 'orchard', 'bed']), stages: _gdF(['Seed', 'Sprout', 'Young bush', 'Flowering', 'Fruiting']), verb: 'Pick' }),
  tree: _gdF({ label: 'Trees', one: 'tree', icon: 'trees', areas: _gdF(['orchard', 'bed', 'meadow']), stages: _gdF(['Seed', 'Seedling', 'Sapling', 'Young tree', 'Mature']), verb: 'Pick' }),
  succulent: _gdF({ label: 'Succulents', one: 'succulent', icon: 'sprout', areas: _gdF(['greenhouse', 'bed']), stages: _gdF(['Cutting', 'Rooting', 'Small', 'Plump', 'Flowering']), verb: 'Pick' }),
  water: _gdF({ label: 'Pond plants', one: 'pond plant', icon: 'waves', areas: _gdF(['pond']), stages: _gdF(['Seed', 'Shoot', 'Floating', 'In bud', 'In flower']), verb: 'Cut' }),
  exotic: _gdF({ label: 'Exotics', one: 'exotic', icon: 'palmtree', areas: _gdF(['greenhouse']), stages: _gdF(['Seed', 'Sprout', 'Leafy', 'In bud', 'In flower']), verb: 'Pick' }),
});
const GARDEN_CAT_ORDER = _gdF(['flower', 'wild', 'herb', 'veg', 'fruit', 'tree', 'succulent', 'water', 'exotic']);

/* ---------- plants ----------
   _gP(id, name, cat, rarity, grow, seasons, look, more):
     seasons   when it is in season ('all' = always): growth x1.3 and the best colour; out of season it still
               grows (x0.8), only slower. In the greenhouse everything is in season.
     look      {form, c, c2, leaf, h, v}: the art's palette and shape hints (form is one of the forms listed in
               docs/dev/GARDEN.md section 4; h is the mature height in cells; v the colour variants)
     more      yield: {n: [min, max], regrow: hours (0 = the plant is lifted), sell: coins each, item?: label}
               price: seed price in coins (0 = never sold), lv: garden level to buy it, unlock: {season | event |
               ach | ribbon | find} (find = found only: wishes, cuttings, lucky finds), thirst: hours before it
               wants water (default 24; 0 = never: pond plants), fp: footprint 1 or 2 (2 x 2 cells), areas:
               override the category's areas, attracts: visitor ids, night: opens only at night, glow: glows
               after dark, special: engine rules ('heart' = grows with every task you ever finished), blurb. */
/* 2.18.1: prices about 2x for cheap things up to 3x for dear ones (the early curve stays smooth: a first daisy is 6). */
function _gdUp(p) { p = Number(p) || 0; if (p <= 0) return 0; if (p <= 6) return Math.ceil(p * 2); if (p <= 40) return Math.round(p * 2.5); return Math.round(p * 3); }
function _gP(id, name, cat, rarity, grow, seasons, look, more) {
  const m = more || {};
  const r = Object.assign({ id, name, cat, rarity, grow, seasons: seasons === 'all' ? GARDEN_SEASONS : _gdF(seasons), look: _gdF(Object.assign({ h: 0.7 }, look)) }, m);
  if (r.price === undefined) r.price = { common: 5, uncommon: 14, rare: 36, epic: 90, legendary: 0 }[rarity] + (grow === 'slow' ? 3 : grow === 'tree' ? 12 : grow === 'ancient' ? 30 : 0);
  r.price = _gdUp(r.price);
  if (r.lv === undefined) r.lv = 1;
  if (r.thirst === undefined) r.thirst = cat === 'water' ? 0 : cat === 'succulent' ? 96 : cat === 'tree' ? 48 : cat === 'herb' ? 30 : 24;
  if (r.fp === undefined) r.fp = 1;
  if (r.yield) r.yield = _gdF(Object.assign({ n: [1, 2], regrow: 24, sell: 3 }, r.yield));
  if (r.attracts) r.attracts = _gdF(r.attracts);
  if (r.areas) r.areas = _gdF(r.areas);
  if (r.unlock) r.unlock = _gdF(r.unlock);
  return r;
}
const _G_CUT = (sell, regrow) => ({ n: [1, 3], regrow: regrow || 36, sell: sell || 3 });
const GARDEN_PLANTS = _gdRows([
  /* flowers */
  _gP('daisy', 'Daisy', 'flower', 'common', 'quick', ['spring', 'summer'], { form: 'daisy', c: '#fbfbf6', c2: '#f4c430', leaf: '#5a9e4b', h: 0.45 }, { yield: _G_CUT(2, 24), price: 3, attracts: ['honeybee', 'cabbage-white'], blurb: 'Cheerful and tough: it comes back after every mow.' }),
  _gP('tulip', 'Tulip', 'flower', 'common', 'fast', ['spring'], { form: 'cup', c: '#e0393e', leaf: '#4f8f4a', h: 0.8, v: ['#e0393e', '#f6c445', '#f28cb1', '#8e5bc8', '#f7f3ee', '#ef7a2f'] }, { yield: _G_CUT(3, 48), price: 4, blurb: 'One bulb, one perfect cup of colour.' }),
  _gP('daffodil', 'Daffodil', 'flower', 'common', 'fast', ['spring'], { form: 'trumpet', c: '#f7d33c', c2: '#f39c12', leaf: '#5d9a4a', h: 0.8, v: ['#f7d33c', '#fbf3c8', '#f9e27a'] }, { yield: _G_CUT(3, 48), price: 4, blurb: 'The first trumpet of spring.' }),
  _gP('sunflower', 'Sunflower', 'flower', 'common', 'medium', ['summer'], { form: 'sunflower', c: '#f6b40e', c2: '#6b3e1e', leaf: '#4e8f3a', h: 2.1, v: ['#f6b40e', '#d9671c', '#f3d34a'] }, { yield: { n: [1, 1], regrow: 72, sell: 6 }, attracts: ['honeybee', 'goldfinch'], blurb: 'Taller than you by August, and always facing the sun.' }),
  _gP('lavender', 'Lavender', 'flower', 'common', 'medium', ['summer'], { form: 'spike', c: '#9b7fd1', leaf: '#8aa58a', h: 0.8, v: ['#9b7fd1', '#c7b6ee', '#f2f0f7'] }, { yield: _G_CUT(4, 48), thirst: 40, attracts: ['honeybee', 'bumblebee', 'peacock-butterfly'], blurb: 'The bees will thank you. So will your nose.' }),
  _gP('poppy', 'Poppy', 'flower', 'common', 'fast', ['summer'], { form: 'poppy', c: '#e23d28', c2: '#1d1d1d', leaf: '#6a9c52', h: 0.9, v: ['#e23d28', '#f5a3b5', '#f39c12', '#f6f0e8'] }, { yield: _G_CUT(3, 48), lv: 2, blurb: 'Paper-thin petals that last a single, glorious day each.' }),
  _gP('cornflower', 'Cornflower', 'flower', 'common', 'fast', ['summer'], { form: 'star', c: '#4a6fe3', leaf: '#7a9e6a', h: 0.8, v: ['#4a6fe3', '#e78ab3', '#f6f3f7'] }, { yield: _G_CUT(3, 36), lv: 2, attracts: ['bumblebee'], blurb: 'The bluest blue in the garden.' }),
  _gP('marigold', 'Marigold', 'flower', 'common', 'quick', ['summer', 'autumn'], { form: 'pompom', c: '#f39c12', c2: '#c0561a', leaf: '#4f8a3a', h: 0.55, v: ['#f39c12', '#f6d13a', '#c0561a'] }, { yield: _G_CUT(2, 24), price: 3, attracts: ['ladybird'], blurb: 'Bright, easy and loved by ladybirds.' }),
  _gP('pansy', 'Pansy', 'flower', 'common', 'fast', ['winter', 'spring'], { form: 'pansy', c: '#6c4bb5', c2: '#f7d33c', leaf: '#4e8a46', h: 0.4, v: ['#6c4bb5', '#f6c445', '#e9eefc', '#ef7a2f', '#a2234b'] }, { yield: _G_CUT(2, 36), lv: 2, blurb: 'A little face that cheers up the coldest morning.' }),
  _gP('snowdrop', 'Snowdrop', 'flower', 'common', 'fast', ['winter'], { form: 'bell', c: '#fbfdff', c2: '#7cbf6a', leaf: '#5f9a6a', h: 0.42 }, { yield: _G_CUT(2, 48), unlock: { season: 'winter' }, blurb: 'Nods through the frost: the year is turning.' }),
  _gP('crocus', 'Crocus', 'flower', 'common', 'quick', ['winter', 'spring'], { form: 'goblet', c: '#a678de', c2: '#f39c12', leaf: '#6b9e5a', h: 0.35, v: ['#a678de', '#f6c445', '#f4f1f7'] }, { yield: _G_CUT(2, 36), lv: 2, attracts: ['bumblebee'], blurb: 'A cup of gold or purple poking through the lawn.' }),
  _gP('bluebell', 'Bluebell', 'flower', 'uncommon', 'medium', ['spring'], { form: 'bell-arch', c: '#5b6fd6', leaf: '#4f8a4a', h: 0.6 }, { yield: _G_CUT(4, 48), lv: 3, blurb: 'A blue haze under the trees in May.' }),
  _gP('foxglove', 'Foxglove', 'flower', 'uncommon', 'slow', ['summer'], { form: 'spike-bell', c: '#c45fa0', c2: '#f4e4ef', leaf: '#6b8e5a', h: 1.6, v: ['#c45fa0', '#f4e4ef', '#f0c8de'] }, { yield: _G_CUT(5, 72), lv: 4, attracts: ['bumblebee'], blurb: 'Tall spires of speckled bells: bumblebee heaven.' }),
  _gP('hollyhock', 'Hollyhock', 'flower', 'uncommon', 'slow', ['summer'], { form: 'spike-cup', c: '#f08fb0', leaf: '#5d8f4a', h: 2.0, v: ['#f08fb0', '#8e1d3c', '#f7eedc', '#f6c445'] }, { yield: _G_CUT(5, 72), lv: 5, blurb: 'A cottage garden classic that leans on the fence.' }),
  _gP('peony', 'Peony', 'flower', 'uncommon', 'medium', ['spring', 'summer'], { form: 'peony', c: '#f4a6c0', leaf: '#4f7f46', h: 0.9, v: ['#f4a6c0', '#d12b5c', '#fbf3f0'] }, { yield: _G_CUT(6, 72), lv: 4, blurb: 'Fat buds that burst into a ruffled bowl.' }),
  _gP('rose', 'Rose', 'flower', 'uncommon', 'medium', ['summer', 'autumn'], { form: 'rose', c: '#d2283c', leaf: '#3f7a3e', h: 1.0, v: ['#d2283c', '#f29bb6', '#fbf5ee', '#f6c445', '#f5a676', '#7b1a3a'] }, { yield: _G_CUT(6, 48), thirst: 20, lv: 3, attracts: ['ladybird'], blurb: 'Every garden wants one. Every bouquet too.' }),
  _gP('dahlia', 'Dahlia', 'flower', 'uncommon', 'medium', ['summer', 'autumn'], { form: 'dahlia', c: '#e0566e', leaf: '#3f6f3a', h: 1.1, v: ['#e0566e', '#f39c12', '#8e1d3c', '#f7d6e6', '#f6c445'] }, { yield: _G_CUT(6, 48), lv: 4, blurb: 'Geometry you can grow: petals in perfect spirals.' }),
  _gP('chrysanthemum', 'Chrysanthemum', 'flower', 'uncommon', 'medium', ['autumn'], { form: 'pompom', c: '#e9893a', c2: '#b9471a', leaf: '#4c7a3e', h: 0.8, v: ['#e9893a', '#f4d35e', '#b33c5a', '#f7f1e3'] }, { yield: _G_CUT(5, 48), lv: 5, unlock: { season: 'autumn' }, blurb: 'Autumn’s pompoms, in every sunset colour.' }),
  _gP('sweet-pea', 'Sweet pea', 'flower', 'uncommon', 'medium', ['summer'], { form: 'climber', c: '#d58ae0', leaf: '#77a85a', h: 1.4, v: ['#d58ae0', '#f39bb6', '#fbf7fb', '#7b5ad8'] }, { yield: _G_CUT(5, 24), lv: 4, blurb: 'The more you pick, the more it flowers.' }),
  _gP('hydrangea', 'Hydrangea', 'flower', 'uncommon', 'slow', ['summer'], { form: 'mophead', c: '#7aa2e8', leaf: '#3f7a46', h: 1.1, v: ['#7aa2e8', '#f19ac0', '#f4f6f2', '#9b7fd1'] }, { yield: _G_CUT(6, 72), lv: 6, thirst: 18, blurb: 'Big round heads of blue or pink, depending on the soil’s mood.' }),
  _gP('iris', 'Iris', 'flower', 'uncommon', 'medium', ['spring', 'summer'], { form: 'iris', c: '#5d4fc4', c2: '#f7d33c', leaf: '#5a8f6a', h: 1.0, v: ['#5d4fc4', '#f7f1fa', '#f0b43c', '#3b2a6e'] }, { yield: _G_CUT(5, 48), lv: 3, blurb: 'Sword leaves and a flower like a flag.' }),
  _gP('lily', 'Lily', 'flower', 'uncommon', 'medium', ['summer'], { form: 'lily', c: '#fbe0e6', c2: '#e85d75', leaf: '#4f8a4a', h: 1.2, v: ['#fbe0e6', '#f39c12', '#fdf8f2', '#d93a4a'] }, { yield: _G_CUT(6, 72), lv: 5, blurb: 'A star-shaped trumpet that scents the whole evening.' }),
  _gP('forget-me-not', 'Forget-me-not', 'flower', 'common', 'quick', ['spring'], { form: 'cluster', c: '#7fb3f0', c2: '#f7e15b', leaf: '#5a9a5a', h: 0.35 }, { yield: _G_CUT(2, 24), lv: 2, blurb: 'Tiny sky-blue clouds along the path.' }),
  _gP('cosmos', 'Cosmos', 'flower', 'common', 'fast', ['summer', 'autumn'], { form: 'daisy-tall', c: '#f29ac4', c2: '#f4c430', leaf: '#6fae5a', h: 1.2, v: ['#f29ac4', '#fbf6f8', '#c2185b', '#f39c12'] }, { yield: _G_CUT(3, 24), lv: 2, attracts: ['honeybee', 'red-admiral'], blurb: 'Feathery leaves and flowers that dance in a breeze.' }),
  _gP('zinnia', 'Zinnia', 'flower', 'common', 'fast', ['summer'], { form: 'dahlia', c: '#ff6f3c', leaf: '#4f8f3a', h: 0.8, v: ['#ff6f3c', '#f43f7a', '#f6c445', '#b23ad8'] }, { yield: _G_CUT(3, 24), lv: 3, attracts: ['peacock-butterfly'], blurb: 'Bold, bright and butterfly-approved.' }),
  _gP('snapdragon', 'Snapdragon', 'flower', 'common', 'fast', ['summer'], { form: 'spike-cup', c: '#f6c445', leaf: '#5a8f4a', h: 0.9, v: ['#f6c445', '#e2507a', '#f7f3ee', '#d9581f'] }, { yield: _G_CUT(3, 36), lv: 3, attracts: ['bumblebee'], blurb: 'Squeeze a flower and it opens its mouth.' }),
  _gP('michaelmas-daisy', 'Michaelmas daisy', 'flower', 'common', 'medium', ['autumn'], { form: 'daisy-cloud', c: '#9d7be0', c2: '#f4c430', leaf: '#5a7f4a', h: 0.9 }, { yield: _G_CUT(3, 36), lv: 3, unlock: { season: 'autumn' }, attracts: ['red-admiral'], blurb: 'A cloud of little purple stars at the end of the year.' }),
  _gP('hosta', 'Hosta', 'flower', 'common', 'fast', ['spring', 'summer'], { form: 'hosta', c: '#c9b8ec', leaf: '#4f8a64', h: 0.55, v: ['#4f8a64', '#8fb86a', '#6a8fa8'] }, { lv: 3, thirst: 20, attracts: ['snail'], blurb: 'Grown for its leaves: cool and calm in the shade.' }),
  _gP('christmas-rose', 'Christmas rose', 'flower', 'rare', 'slow', ['winter'], { form: 'flat', c: '#f5f0f7', c2: '#c7d36b', leaf: '#335f3e', h: 0.55, v: ['#f5f0f7', '#d998b8', '#5b2440'] }, { yield: _G_CUT(8, 72), lv: 6, unlock: { season: 'winter' }, blurb: 'Flowers in the snow, when nothing else dares.' }),
  _gP('camellia', 'Camellia', 'flower', 'rare', 'slow', ['winter', 'spring'], { form: 'rose-bush', c: '#e14b6b', leaf: '#2f5f3a', h: 1.3, v: ['#e14b6b', '#f8d2dc', '#fbf6f2'] }, { yield: _G_CUT(8, 72), lv: 8, blurb: 'Glossy leaves and perfect roses in late winter.' }),
  _gP('golden-sunflower', 'Golden sunflower', 'flower', 'legendary', 'medium', ['summer'], { form: 'sunflower', c: '#ffd34d', c2: '#a8641a', leaf: '#5d9a3a', h: 2.3 }, { yield: { n: [1, 1], regrow: 72, sell: 40 }, price: 0, unlock: { ach: 'streak-30' }, glow: 1, attracts: ['honeybee', 'goldfinch'], blurb: 'Earned with a month in a row. It shimmers when the sun hits it.' }),
  _gP('rainbow-tulip', 'Rainbow tulip', 'flower', 'epic', 'fast', ['spring'], { form: 'cup', c: '#e0393e', c2: '#4a6fe3', mix: ['#e0393e', '#f6c445', '#4a6fe3', '#8e5bc8', '#f28a1a', '#4fae5a'], leaf: '#4f8f4a', h: 0.85 }, { yield: _G_CUT(20, 48), price: 0, unlock: { ach: 'quest-perfect' }, blurb: 'Every colour at once: a perfect quest week grows one.' }),
  _gP('frost-rose', 'Frost rose', 'flower', 'epic', 'slow', ['winter'], { form: 'rose', c: '#cfe6fb', c2: '#ffffff', leaf: '#5f8fa0', h: 1.0 }, { yield: _G_CUT(22, 72), price: 0, unlock: { event: 'winter-lights' }, glow: 1, blurb: 'Icy petals that sparkle under the winter lights.' }),
  _gP('sunrise-rose', 'Sunrise rose', 'flower', 'epic', 'medium', ['all'], { form: 'rose', c: '#f7a24a', c2: '#f26b7a', leaf: '#3f7a3e', h: 1.0 }, { yield: _G_CUT(20, 48), price: 0, unlock: { ach: 'early-bird' }, blurb: 'For people who get things done before breakfast.' }),
  /* wildflowers */
  _gP('buttercup', 'Buttercup', 'wild', 'common', 'quick', ['spring', 'summer'], { form: 'cup-small', c: '#f7d417', leaf: '#5f9e4a', h: 0.45 }, { yield: _G_CUT(1, 24), price: 2, blurb: 'Hold one under your chin: do you like butter?' }),
  _gP('clover', 'Clover', 'wild', 'common', 'quick', 'all', { form: 'clover', c: '#e8a7c8', leaf: '#5b9c4a', h: 0.3, v: ['#e8a7c8', '#f6f3f0'] }, { yield: _G_CUT(1, 24), price: 2, thirst: 36, attracts: ['honeybee', 'bumblebee', 'rabbit'], blurb: 'The bees’ favourite snack, right in the lawn.' }),
  _gP('cowslip', 'Cowslip', 'wild', 'common', 'fast', ['spring'], { form: 'bell-cluster', c: '#f2cf3a', leaf: '#6b9e5a', h: 0.5 }, { yield: _G_CUT(2, 36), lv: 2, blurb: 'Nodding golden bells in the long grass.' }),
  _gP('oxeye-daisy', 'Oxeye daisy', 'wild', 'common', 'fast', ['summer'], { form: 'daisy-tall', c: '#fcfcf7', c2: '#f4c430', leaf: '#5a8f4a', h: 0.9 }, { yield: _G_CUT(2, 24), lv: 2, attracts: ['honeybee'], blurb: 'Moon daisies, glowing in the summer dusk.' }),
  _gP('red-campion', 'Red campion', 'wild', 'common', 'fast', ['spring', 'summer'], { form: 'star-small', c: '#e05a8a', leaf: '#5f8a4a', h: 0.8 }, { yield: _G_CUT(2, 36), lv: 3, blurb: 'Bright pink stars along every hedgerow.' }),
  _gP('cow-parsley', 'Cow parsley', 'wild', 'common', 'fast', ['spring'], { form: 'umbel', c: '#fbfbf2', leaf: '#6fae5a', h: 1.2 }, { yield: _G_CUT(2, 36), lv: 3, attracts: ['honeybee'], blurb: 'Queen Anne’s lace: froth along the lanes in May.' }),
  _gP('harebell', 'Harebell', 'wild', 'uncommon', 'medium', ['summer'], { form: 'bell-arch', c: '#8aa0e8', leaf: '#7a9e6a', h: 0.55 }, { yield: _G_CUT(4, 48), lv: 5, blurb: 'Delicate blue bells on stems as thin as hair.' }),
  _gP('bee-orchid', 'Bee orchid', 'wild', 'rare', 'slow', ['summer'], { form: 'orchid-spike', c: '#d79ad6', c2: '#7a4a2a', leaf: '#6a8f5a', h: 0.6 }, { yield: _G_CUT(12, 96), lv: 12, areas: ['meadow'], attracts: ['bumblebee'], blurb: 'A flower that dresses up as a bee. Only in the meadow.' }),
  _gP('primrose', 'Primrose', 'wild', 'common', 'quick', ['spring'], { form: 'flat', c: '#f8e58c', c2: '#f39c12', leaf: '#5a9a4a', h: 0.3, v: ['#f8e58c', '#e78ab3', '#f6f3ee'] }, { yield: _G_CUT(2, 36), blurb: 'The very first flower, as its name says.' }),
  _gP('thistle', 'Thistle', 'wild', 'common', 'medium', ['summer'], { form: 'thistle', c: '#a65fc6', leaf: '#7f9a7a', h: 1.1 }, { yield: _G_CUT(2, 48), lv: 4, thirst: 40, attracts: ['goldfinch', 'bumblebee'], blurb: 'Prickly, purple and the goldfinches’ favourite.' }),
  _gP('meadow-grass', 'Meadow grass', 'wild', 'common', 'quick', 'all', { form: 'grass', c: '#d4c27a', leaf: '#8aae5a', h: 0.9 }, { price: 1, thirst: 48, attracts: ['cabbage-white'], blurb: 'Long grass that ripples like water in the wind.' }),
  _gP('fern', 'Fern', 'wild', 'common', 'fast', 'all', { form: 'fern', leaf: '#3f8f4a', h: 0.7 }, { lv: 3, thirst: 20, attracts: ['snail'], blurb: 'Unfurls like a green question mark in the shade.' }),
  _gP('four-leaf-clover', 'Four-leaf clover', 'wild', 'epic', 'fast', 'all', { form: 'clover', c: '#4fb36a', leaf: '#2f8f4a', h: 0.32 }, { price: 0, unlock: { find: 1 }, thirst: 36, blurb: 'Found, never bought. Gardens with one find rare seeds more often.' }),
  /* herbs */
  _gP('basil', 'Basil', 'herb', 'common', 'fast', ['summer'], { form: 'leafy', leaf: '#3f9b3a', h: 0.5, v: ['#3f9b3a', '#5b2a5e'] }, { yield: { n: [2, 3], regrow: 24, sell: 3 }, blurb: 'Pinch the tops and it grows bushier.' }),
  _gP('mint', 'Mint', 'herb', 'common', 'quick', ['spring', 'summer'], { form: 'leafy', leaf: '#4fb36a', h: 0.45 }, { yield: { n: [2, 4], regrow: 18, sell: 2 }, price: 3, blurb: 'Grows like it has somewhere to be.' }),
  _gP('rosemary', 'Rosemary', 'herb', 'common', 'medium', 'all', { form: 'needle-bush', c: '#7aa0d8', leaf: '#5b7f5a', h: 0.8 }, { yield: { n: [2, 3], regrow: 36, sell: 3 }, thirst: 48, attracts: ['honeybee'], blurb: 'Evergreen, fragrant and in flower in winter.' }),
  _gP('thyme', 'Thyme', 'herb', 'common', 'fast', 'all', { form: 'mat', c: '#c49ad8', leaf: '#6f8f5a', h: 0.28 }, { yield: { n: [2, 3], regrow: 24, sell: 2 }, thirst: 48, attracts: ['honeybee'], blurb: 'A carpet of tiny leaves between the stones.' }),
  _gP('sage', 'Sage', 'herb', 'common', 'medium', ['summer'], { form: 'leafy-soft', c: '#9b7fd1', leaf: '#8fa58a', h: 0.6 }, { yield: { n: [2, 3], regrow: 30, sell: 3 }, lv: 2, blurb: 'Velvety grey leaves you want to stroke.' }),
  _gP('parsley', 'Parsley', 'herb', 'common', 'fast', 'all', { form: 'frilly', leaf: '#3c8f3c', h: 0.4 }, { yield: { n: [2, 3], regrow: 24, sell: 2 }, blurb: 'Curly, bright and on every plate.' }),
  _gP('chives', 'Chives', 'herb', 'common', 'quick', ['spring', 'summer'], { form: 'grass-flower', c: '#b77fd1', leaf: '#4f9e4a', h: 0.55 }, { yield: { n: [2, 3], regrow: 18, sell: 2 }, lv: 2, attracts: ['bumblebee'], blurb: 'Snip the leaves, leave the purple pompoms for the bees.' }),
  _gP('chamomile', 'Chamomile', 'herb', 'uncommon', 'fast', ['summer'], { form: 'daisy-small', c: '#fcfcf5', c2: '#f4c430', leaf: '#8aae5a', h: 0.45 }, { yield: { n: [2, 4], regrow: 24, sell: 4 }, lv: 3, blurb: 'Tiny daisies that become a sleepy cup of tea.' }),
  _gP('coriander', 'Coriander', 'herb', 'common', 'quick', ['spring', 'autumn'], { form: 'frilly', leaf: '#5aa64a', h: 0.45 }, { yield: { n: [2, 3], regrow: 24, sell: 2 }, lv: 2, blurb: 'Loved or not, it grows quickly either way.' }),
  /* vegetables */
  _gP('radish', 'Radish', 'veg', 'common', 'quick', ['spring', 'autumn'], { form: 'root', c: '#e0465a', leaf: '#4f9e4a', h: 0.35 }, { yield: { n: [1, 2], regrow: 0, sell: 3 }, price: 3, blurb: 'Seed to plate in no time at all.' }),
  _gP('carrot', 'Carrot', 'veg', 'common', 'fast', ['spring', 'summer', 'autumn'], { form: 'root-frilly', c: '#f28a1a', leaf: '#4fa64a', h: 0.45, v: ['#f28a1a', '#7b2a6e', '#f6d13a'] }, { yield: { n: [1, 2], regrow: 0, sell: 4 }, attracts: ['rabbit'], blurb: 'Feathery tops above, an orange surprise below.' }),
  _gP('lettuce', 'Lettuce', 'veg', 'common', 'fast', ['spring', 'summer'], { form: 'head', c: '#8bc34a', leaf: '#6fae3a', h: 0.35, v: ['#8bc34a', '#a33a4a'] }, { yield: { n: [1, 1], regrow: 0, sell: 4 }, thirst: 18, attracts: ['rabbit', 'snail'], blurb: 'Crisp, quick and a magnet for snails.' }),
  _gP('potato', 'Potato', 'veg', 'common', 'medium', ['spring', 'summer'], { form: 'bushy', c: '#c9a26a', c2: '#f4f0f7', leaf: '#4f7f3a', h: 0.6 }, { yield: { n: [2, 4], regrow: 0, sell: 3 }, blurb: 'Dig in: there are always more than you expect.' }),
  _gP('tomato', 'Tomato', 'veg', 'common', 'medium', ['summer'], { form: 'vine-fruit', c: '#e0392b', leaf: '#3f7a3a', h: 1.2, v: ['#e0392b', '#f6c445', '#f28a1a', '#6a2a2e'] }, { yield: { n: [2, 4], regrow: 36, sell: 4 }, thirst: 20, blurb: 'Warm from the vine is the only way.' }),
  _gP('pea', 'Pea', 'veg', 'common', 'fast', ['spring', 'summer'], { form: 'vine-pod', c: '#7cc35a', c2: '#f7f5f0', leaf: '#5aa64a', h: 1.0 }, { yield: { n: [2, 4], regrow: 24, sell: 2 }, blurb: 'Pods that pop, peas that never make it to the kitchen.' }),
  _gP('runner-bean', 'Runner bean', 'veg', 'common', 'medium', ['summer'], { form: 'pole', c: '#e2442b', c2: '#5d9e3c', leaf: '#4f8f3a', h: 1.8 }, { yield: { n: [2, 5], regrow: 24, sell: 2 }, lv: 2, blurb: 'Scarlet flowers up a wigwam of canes.' }),
  _gP('courgette', 'Courgette', 'veg', 'common', 'medium', ['summer'], { form: 'sprawl', c: '#2f7a31', c2: '#f7c331', leaf: '#4f8f3a', h: 0.6 }, { yield: { n: [1, 3], regrow: 30, sell: 3 }, lv: 2, blurb: 'Blink and it is a marrow.' }),
  _gP('pumpkin', 'Pumpkin', 'veg', 'uncommon', 'slow', ['autumn'], { form: 'pumpkin', c: '#ef7f1a', c2: '#f7c331', leaf: '#4f8f3a', h: 0.7, v: ['#ef7f1a', '#f2efe3', '#6f8f6a'] }, { yield: { n: [1, 1], regrow: 0, sell: 22 }, lv: 3, thirst: 20, blurb: 'Grow one big enough to sit on.' }),
  _gP('lantern-pumpkin', 'Lantern pumpkin', 'veg', 'epic', 'slow', ['autumn'], { form: 'pumpkin', c: '#f26a12', c2: '#ffd34d', leaf: '#3f7a3a', h: 0.75 }, { yield: { n: [1, 1], regrow: 0, sell: 45 }, price: 0, unlock: { event: 'halloween' }, glow: 1, blurb: 'Grows with a grin. Glows after dark during Trick or treat.' }),
  _gP('beetroot', 'Beetroot', 'veg', 'common', 'fast', ['summer', 'autumn'], { form: 'root', c: '#8e1d4c', leaf: '#5a8f3a', h: 0.45 }, { yield: { n: [1, 2], regrow: 0, sell: 3 }, lv: 2, blurb: 'Ruby roots with red-veined leaves.' }),
  _gP('onion', 'Onion', 'veg', 'common', 'medium', ['spring', 'summer'], { form: 'bulb', c: '#d9a066', leaf: '#6fae6a', h: 0.5, v: ['#d9a066', '#8e2a4c', '#f4efe2'] }, { yield: { n: [1, 2], regrow: 0, sell: 3 }, lv: 2, blurb: 'Layers upon layers, swelling in the sun.' }),
  _gP('garlic', 'Garlic', 'veg', 'common', 'slow', ['autumn', 'winter'], { form: 'bulb', c: '#f2ece0', leaf: '#7aae6a', h: 0.55 }, { yield: { n: [1, 3], regrow: 0, sell: 4 }, lv: 3, blurb: 'Plant a clove in autumn, lift a whole head in summer.' }),
  _gP('sweetcorn', 'Sweetcorn', 'veg', 'uncommon', 'slow', ['summer'], { form: 'stalk', c: '#f5d76e', c2: '#c9a26a', leaf: '#6fae4a', h: 2.0 }, { yield: { n: [1, 2], regrow: 48, sell: 6 }, lv: 4, blurb: 'Tall rustling stalks with golden cobs.' }),
  _gP('cabbage', 'Cabbage', 'veg', 'common', 'medium', ['autumn', 'winter'], { form: 'head', c: '#7da35b', leaf: '#5f8f4a', h: 0.45, v: ['#7da35b', '#7a3a7a'] }, { yield: { n: [1, 1], regrow: 0, sell: 5 }, lv: 3, attracts: ['cabbage-white'], blurb: 'Round and proud, with dew in its leaves.' }),
  _gP('kale', 'Kale', 'veg', 'common', 'medium', ['autumn', 'winter'], { form: 'frilly-tall', leaf: '#4b6d4a', h: 0.7, v: ['#4b6d4a', '#5e3a6a'] }, { yield: { n: [2, 3], regrow: 30, sell: 3 }, lv: 3, blurb: 'Gets sweeter after a frost.' }),
  _gP('leek', 'Leek', 'veg', 'common', 'slow', ['autumn', 'winter'], { form: 'leek', c: '#f1efe2', leaf: '#5f8f7a', h: 0.8 }, { yield: { n: [1, 1], regrow: 0, sell: 5 }, lv: 4, blurb: 'Stands tall through the winter.' }),
  _gP('chilli', 'Chilli', 'veg', 'uncommon', 'medium', ['summer'], { form: 'bush-fruit', c: '#d7261e', leaf: '#3f7a3a', h: 0.7, v: ['#d7261e', '#4f9e3a', '#f6c445', '#f28a1a'] }, { yield: { n: [2, 4], regrow: 36, sell: 5 }, lv: 5, blurb: 'Little lanterns of heat.' }),
  _gP('aubergine', 'Aubergine', 'veg', 'uncommon', 'slow', ['summer'], { form: 'bush-fruit', c: '#4a2a5e', c2: '#a68ad8', leaf: '#4f7a4a', h: 0.8 }, { yield: { n: [1, 2], regrow: 48, sell: 6 }, lv: 6, blurb: 'Glossy purple fruit under velvet leaves.' }),
  _gP('broccoli', 'Broccoli', 'veg', 'common', 'medium', ['spring', 'autumn'], { form: 'floret', c: '#3f7d3a', leaf: '#6a9a8a', h: 0.6 }, { yield: { n: [1, 1], regrow: 0, sell: 4 }, lv: 3, blurb: 'A tiny tree you can eat.' }),
  _gP('parsnip', 'Parsnip', 'veg', 'common', 'slow', ['autumn', 'winter'], { form: 'root-frilly', c: '#efe3c2', leaf: '#6fa64a', h: 0.5 }, { yield: { n: [1, 2], regrow: 0, sell: 4 }, lv: 4, blurb: 'Pale, sweet and best after the first frost.' }),
  _gP('squash', 'Butternut squash', 'veg', 'uncommon', 'slow', ['autumn'], { form: 'pumpkin', c: '#e8b46a', c2: '#f7c331', leaf: '#4f8f3a', h: 0.6 }, { yield: { n: [1, 2], regrow: 0, sell: 9 }, lv: 6, blurb: 'Keeps all winter on a sunny windowsill.' }),
  /* fruit */
  _gP('strawberry', 'Strawberry', 'fruit', 'common', 'fast', ['summer'], { form: 'low-fruit', c: '#e2273b', c2: '#fbfbf6', leaf: '#4f8f3a', h: 0.35 }, { yield: { n: [2, 4], regrow: 24, sell: 3 }, lv: 2, blurb: 'Pick them warm. Eat one on the way in.' }),
  _gP('raspberry', 'Raspberry', 'fruit', 'uncommon', 'medium', ['summer', 'autumn'], { form: 'cane', c: '#d62e5b', leaf: '#5a8f4a', h: 1.2, v: ['#d62e5b', '#f6c445'] }, { yield: { n: [3, 5], regrow: 30, sell: 3 }, lv: 4, blurb: 'Canes heavy with soft red jewels.' }),
  _gP('blueberry', 'Blueberry', 'fruit', 'uncommon', 'medium', ['summer'], { form: 'berry-bush', c: '#4b5fb3', leaf: '#3f7a4a', h: 0.9 }, { yield: { n: [3, 5], regrow: 36, sell: 3 }, lv: 4, attracts: ['blackbird'], blurb: 'Dusty blue berries, and red leaves in autumn.' }),
  _gP('blackcurrant', 'Blackcurrant', 'fruit', 'common', 'medium', ['summer'], { form: 'berry-bush', c: '#2b2140', leaf: '#4f7f3a', h: 0.9 }, { yield: { n: [3, 5], regrow: 36, sell: 2 }, lv: 3, blurb: 'Strings of glossy black berries.' }),
  _gP('gooseberry', 'Gooseberry', 'fruit', 'common', 'medium', ['summer'], { form: 'berry-bush', c: '#a7c957', leaf: '#5a8f3a', h: 0.8, v: ['#a7c957', '#a3243a'] }, { yield: { n: [3, 5], regrow: 36, sell: 2 }, lv: 3, blurb: 'Hairy, tart and wonderful in a crumble.' }),
  _gP('rhubarb', 'Rhubarb', 'fruit', 'common', 'medium', ['spring'], { form: 'big-leaf', c: '#d04a5c', leaf: '#5c8f3a', h: 0.8 }, { yield: { n: [2, 3], regrow: 48, sell: 3 }, lv: 3, blurb: 'Pink stalks under umbrella leaves.' }),
  _gP('bramble', 'Bramble', 'fruit', 'common', 'medium', ['autumn'], { form: 'bramble', c: '#2a1f3d', c2: '#f7f0f4', leaf: '#3f6f3a', h: 1.0 }, { yield: { n: [3, 6], regrow: 36, sell: 2 }, lv: 3, attracts: ['red-admiral', 'blackbird'], blurb: 'Blackberrying season: purple fingers guaranteed.' }),
  _gP('grapevine', 'Grapevine', 'fruit', 'rare', 'slow', ['autumn'], { form: 'vine-grape', c: '#6d3a8c', leaf: '#5a8f3a', h: 1.4, v: ['#6d3a8c', '#b9cf5a'] }, { yield: { n: [2, 4], regrow: 72, sell: 9 }, lv: 8, blurb: 'Bunches of grapes on a sunny wall.' }),
  _gP('melon', 'Melon', 'fruit', 'rare', 'slow', ['summer'], { form: 'melon', c: '#f2c66b', c2: '#9fc35a', leaf: '#4f8f3a', h: 0.5 }, { yield: { n: [1, 1], regrow: 0, sell: 18 }, lv: 9, areas: ['greenhouse'], thirst: 18, blurb: 'Only in the greenhouse: a sweet, netted globe.' }),
  /* trees */
  _gP('heart-oak', 'The old oak', 'tree', 'legendary', 'ancient', 'all', { form: 'oak', c: '#8b5a2b', c2: '#c9a26a', leaf: '#4f8a3a', h: 3.4 }, { price: 0, unlock: { find: 1 }, fp: 2, special: 'heart', thirst: 0, attracts: ['tawny-owl', 'squirrel', 'wood-pigeon'], blurb: 'Your garden’s heart: it grows with everything you have ever finished.' }),
  _gP('apple', 'Apple tree', 'tree', 'uncommon', 'tree', ['spring', 'autumn'], { form: 'fruit-tree', c: '#d8343c', c2: '#f7d6e0', leaf: '#4f8f3a', h: 2.8, v: ['#d8343c', '#9fc35a', '#f2b33a'] }, { yield: { n: [3, 6], regrow: 72, sell: 3 }, fp: 2, lv: 5, attracts: ['blackbird', 'red-admiral'], blurb: 'Pink blossom in spring, apples by autumn.' }),
  _gP('pear', 'Pear tree', 'tree', 'uncommon', 'tree', ['spring', 'autumn'], { form: 'fruit-tree-tall', c: '#c9d14f', c2: '#fbf7f2', leaf: '#4f8a3a', h: 3.0 }, { yield: { n: [3, 5], regrow: 72, sell: 3 }, fp: 2, lv: 6, blurb: 'White blossom and buttery pears.' }),
  _gP('cherry', 'Cherry tree', 'tree', 'uncommon', 'tree', ['spring', 'summer'], { form: 'fruit-tree', c: '#a3172f', c2: '#f8c6d6', leaf: '#3f7a3a', h: 2.7 }, { yield: { n: [4, 8], regrow: 72, sell: 2 }, fp: 2, lv: 6, attracts: ['blackbird'], blurb: 'Race the blackbirds to the cherries.' }),
  _gP('plum', 'Plum tree', 'tree', 'uncommon', 'tree', ['spring', 'summer'], { form: 'fruit-tree', c: '#6b2d5c', c2: '#fbf3f6', leaf: '#4f7f3a', h: 2.6 }, { yield: { n: [3, 6], regrow: 72, sell: 3 }, fp: 2, lv: 7, attracts: ['red-admiral'], blurb: 'Dusky plums, a whole tree at once.' }),
  _gP('fig', 'Fig tree', 'tree', 'rare', 'tree', ['summer'], { form: 'fig', c: '#5c3a5e', leaf: '#4e7d3a', h: 2.0 }, { yield: { n: [2, 4], regrow: 72, sell: 6 }, lv: 8, blurb: 'Big hand-shaped leaves and honey-sweet figs.' }),
  _gP('lemon', 'Lemon tree', 'tree', 'rare', 'slow', 'all', { form: 'potted-tree', c: '#f6e049', c2: '#fbfbf6', leaf: '#3f7a3a', h: 1.6 }, { yield: { n: [2, 3], regrow: 72, sell: 6 }, lv: 9, areas: ['greenhouse', 'bed'], blurb: 'Flowers and fruit at the same time, all year.' }),
  _gP('olive', 'Olive tree', 'tree', 'rare', 'tree', 'all', { form: 'olive', c: '#5b6b2f', leaf: '#8a9a7a', h: 2.0 }, { yield: { n: [3, 6], regrow: 96, sell: 4 }, lv: 9, thirst: 96, blurb: 'Silver leaves and centuries of patience.' }),
  _gP('silver-birch', 'Silver birch', 'tree', 'common', 'tree', 'all', { form: 'birch', c: '#f1efe6', leaf: '#9cc55a', h: 3.0 }, { lv: 5, attracts: ['blue-tit'], blurb: 'White bark that glows in winter light.' }),
  _gP('maple', 'Maple', 'tree', 'uncommon', 'tree', ['autumn'], { form: 'round-tree', c: '#d9462b', leaf: '#4f8f3a', h: 3.0 }, { fp: 2, lv: 6, attracts: ['squirrel'], blurb: 'Green all summer, then fireworks in October.' }),
  _gP('japanese-maple', 'Japanese maple', 'tree', 'rare', 'tree', ['spring', 'autumn'], { form: 'lace-tree', c: '#b8283a', leaf: '#8f2a3a', h: 1.8, v: ['#b8283a', '#6fae4a'] }, { lv: 10, blurb: 'Lace-fine leaves the colour of wine.' }),
  _gP('willow', 'Weeping willow', 'tree', 'rare', 'ancient', 'all', { form: 'weeping', leaf: '#9cbf5a', c: '#7a5a3a', h: 3.2 }, { fp: 2, lv: 7, areas: ['pond', 'orchard', 'meadow'], thirst: 30, attracts: ['kingfisher'], blurb: 'Trails its fingers in the water. Happiest by the pond.' }),
  _gP('magnolia', 'Magnolia', 'tree', 'rare', 'tree', ['spring'], { form: 'blossom-tree', c: '#f6dce6', c2: '#c4507a', leaf: '#4f7f3a', h: 2.6 }, { fp: 2, lv: 10, blurb: 'Tulip-shaped flowers on bare branches.' }),
  _gP('sakura', 'Cherry blossom', 'tree', 'epic', 'tree', ['spring'], { form: 'blossom-tree', c: '#f7b6cc', c2: '#fbe3ec', leaf: '#5a8f4a', h: 2.8 }, { fp: 2, price: 0, unlock: { event: 'spring-bloom' }, blurb: 'A cloud of pink petals for a few precious weeks.' }),
  _gP('holly', 'Holly', 'tree', 'uncommon', 'slow', ['winter'], { form: 'cone-tree', c: '#d0202b', leaf: '#1f5b34', h: 1.6 }, { yield: { n: [2, 4], regrow: 72, sell: 3, item: 'holly sprigs' }, lv: 6, attracts: ['robin'], blurb: 'Red berries for the robins, and for the door.' }),
  _gP('hazel', 'Hazel', 'tree', 'common', 'tree', ['autumn'], { form: 'bush-tree', c: '#a8743a', c2: '#e8d36a', leaf: '#5f8f3a', h: 2.0 }, { yield: { n: [3, 6], regrow: 96, sell: 2, item: 'hazelnuts' }, lv: 5, attracts: ['squirrel'], blurb: 'Catkins in February, nuts for the squirrels in autumn.' }),
  _gP('fir', 'Fir tree', 'tree', 'uncommon', 'tree', ['winter'], { form: 'conifer', leaf: '#2d5a3c', c: '#e2442b', h: 2.6 }, { lv: 5, thirst: 72, attracts: ['blue-tit'], blurb: 'Evergreen. In December it puts on lights.' }),
  _gP('bonsai', 'Bonsai', 'tree', 'epic', 'ancient', 'all', { form: 'bonsai', c: '#5a3a2a', leaf: '#3f7a3a', h: 0.8 }, { price: 0, unlock: { ach: 'focus-hours-10' }, areas: ['greenhouse', 'bed'], blurb: 'Ten focused hours earn you a tiny, ancient tree.' }),
  /* succulents */
  _gP('aloe', 'Aloe vera', 'succulent', 'common', 'medium', 'all', { form: 'aloe', c: '#f28a3a', leaf: '#6aa57a', h: 0.6 }, { lv: 9, blurb: 'Plump spears full of soothing gel.' }),
  _gP('echeveria', 'Echeveria', 'succulent', 'common', 'medium', 'all', { form: 'rosette', c: '#e8a0a8', leaf: '#9fc3b0', h: 0.3, v: ['#9fc3b0', '#c3a6d8', '#b7d38a'] }, { lv: 2, blurb: 'A stone rose, blushing at the tips.' }),
  _gP('jade', 'Jade plant', 'succulent', 'common', 'slow', 'all', { form: 'jade', c: '#f7f0f4', leaf: '#4f8f5a', h: 0.7 }, { lv: 9, blurb: 'The money tree: lucky, they say.' }),
  _gP('barrel-cactus', 'Barrel cactus', 'succulent', 'uncommon', 'slow', 'all', { form: 'barrel', c: '#f05a7e', leaf: '#5a8f5a', h: 0.5 }, { lv: 9, thirst: 168, blurb: 'Round, spiny and crowned with flowers.' }),
  _gP('prickly-pear', 'Prickly pear', 'succulent', 'uncommon', 'slow', ['summer'], { form: 'pads', c: '#f4c430', c2: '#c2185b', leaf: '#6a9f5a', h: 0.9 }, { yield: { n: [1, 3], regrow: 72, sell: 6 }, lv: 10, thirst: 168, blurb: 'Paddles stacked on paddles, with jewel fruit.' }),
  _gP('saguaro', 'Saguaro', 'succulent', 'rare', 'ancient', 'all', { form: 'saguaro', c: '#fbfbf6', leaf: '#5f8f5a', h: 1.8 }, { lv: 11, areas: ['greenhouse'], thirst: 240, blurb: 'Arms up, as if it just finished something big.' }),
  _gP('string-of-pearls', 'String of pearls', 'succulent', 'uncommon', 'medium', 'all', { form: 'trailing', leaf: '#7fbf7a', h: 0.5 }, { lv: 9, blurb: 'Beads of green spilling over the pot.' }),
  _gP('zebra-haworthia', 'Zebra plant', 'succulent', 'common', 'slow', 'all', { form: 'spiky-rosette', c: '#f4f6f2', leaf: '#3f6e4a', h: 0.35 }, { lv: 9, blurb: 'Striped like a little zebra. Very hard to upset.' }),
  /* pond plants */
  _gP('water-lily', 'Water lily', 'water', 'uncommon', 'medium', ['summer'], { form: 'lily-pad', c: '#f7c5d8', c2: '#f6c445', leaf: '#3f8f5a', h: 0.3, v: ['#f7c5d8', '#fbfbf6', '#f6d34a', '#e0566e'] }, { yield: _G_CUT(6, 48), lv: 7, attracts: ['frog', 'dragonfly'], blurb: 'A frog’s favourite seat.' }),
  _gP('lotus', 'Lotus', 'water', 'rare', 'slow', ['summer'], { form: 'lotus', c: '#f49ac1', c2: '#f6d34a', leaf: '#4f9f6a', h: 0.9 }, { yield: _G_CUT(12, 72), lv: 9, attracts: ['dragonfly'], blurb: 'Rises clean from the mud, every single morning.' }),
  _gP('bulrush', 'Bulrush', 'water', 'common', 'fast', 'all', { form: 'reed', c: '#7a4b2a', leaf: '#7a9f4a', h: 1.4 }, { lv: 7, attracts: ['dragonfly', 'mallard'], blurb: 'Velvet sausages on sticks, rustling at the edge.' }),
  _gP('yellow-flag', 'Yellow flag iris', 'water', 'common', 'medium', ['spring', 'summer'], { form: 'iris', c: '#f5d02c', c2: '#7a4a2a', leaf: '#5a8f6a', h: 1.1 }, { yield: _G_CUT(4, 48), lv: 7, blurb: 'Golden flags waving at the water’s edge.' }),
  _gP('marsh-marigold', 'Marsh marigold', 'water', 'common', 'fast', ['spring'], { form: 'cup-small', c: '#f6c90e', leaf: '#3f7f4a', h: 0.4 }, { yield: _G_CUT(3, 36), lv: 7, blurb: 'Kingcups: gold coins in the shallows.' }),
  _gP('water-mint', 'Water mint', 'water', 'common', 'quick', 'all', { form: 'leafy', c: '#c7a6e0', leaf: '#4f9f6a', h: 0.35 }, { yield: { n: [2, 3], regrow: 18, sell: 2 }, lv: 7, blurb: 'Brush past it and the whole pond smells of mint.' }),
  _gP('papyrus', 'Papyrus', 'water', 'rare', 'medium', 'all', { form: 'papyrus', leaf: '#6fae4a', h: 1.6 }, { lv: 10, blurb: 'Green fireworks on tall stems.' }),
  _gP('pickerel-weed', 'Pickerel weed', 'water', 'uncommon', 'medium', ['summer'], { form: 'spike', c: '#6c7fd8', leaf: '#4f8f5a', h: 0.8 }, { yield: _G_CUT(4, 48), lv: 8, attracts: ['dragonfly', 'bumblebee'], blurb: 'Blue spikes above glossy hearts.' }),
  /* exotics */
  _gP('orchid', 'Moth orchid', 'exotic', 'rare', 'slow', 'all', { form: 'orchid', c: '#f2a7d8', c2: '#c4507a', leaf: '#3f7a4a', h: 0.8, v: ['#f2a7d8', '#fbfbf6', '#9b5bc8', '#f6d34a'] }, { yield: _G_CUT(14, 96), lv: 9, blurb: 'A spray of moths that never fly away.' }),
  _gP('bird-of-paradise', 'Bird of paradise', 'exotic', 'rare', 'slow', 'all', { form: 'bird-paradise', c: '#f68b1f', c2: '#3b5bdb', leaf: '#3f7a5a', h: 1.4 }, { yield: _G_CUT(16, 96), lv: 10, blurb: 'A flower that looks like a bird about to sing.' }),
  _gP('venus-flytrap', 'Venus flytrap', 'exotic', 'rare', 'medium', 'all', { form: 'flytrap', c: '#d94a3a', leaf: '#7fbf4a', h: 0.35 }, { lv: 9, thirst: 18, blurb: 'Snaps shut on anything that tickles it.' }),
  _gP('pitcher-plant', 'Pitcher plant', 'exotic', 'rare', 'slow', 'all', { form: 'pitcher', c: '#a3243a', c2: '#9fc35a', leaf: '#6f9f4a', h: 0.8 }, { lv: 11, blurb: 'Little jugs with lids, waiting for a visitor.' }),
  _gP('passion-flower', 'Passion flower', 'exotic', 'rare', 'slow', ['summer'], { form: 'passion', c: '#8f7be8', c2: '#f7f5f0', leaf: '#4f8f3a', h: 1.3 }, { yield: { n: [1, 3], regrow: 72, sell: 8, item: 'passion fruit' }, lv: 10, blurb: 'A flower like a clock face, then a fruit full of sunshine.' }),
  _gP('hibiscus', 'Hibiscus', 'exotic', 'uncommon', 'medium', 'all', { form: 'hibiscus', c: '#e8344e', c2: '#f6d34a', leaf: '#3f7a3a', h: 1.1, v: ['#e8344e', '#f39c12', '#f7c5d8', '#f6d34a'] }, { yield: _G_CUT(8, 48), lv: 9, blurb: 'Big tropical trumpets, one day each.' }),
  _gP('banana', 'Banana plant', 'exotic', 'rare', 'slow', 'all', { form: 'banana', c: '#f6e049', leaf: '#5aae4a', h: 2.2 }, { yield: { n: [3, 6], regrow: 120, sell: 5 }, lv: 11, thirst: 18, blurb: 'Leaves like flags, and a bunch of your own bananas.' }),
  _gP('moonflower', 'Moonflower', 'exotic', 'epic', 'medium', ['summer'], { form: 'moon-trumpet', c: '#f5f7ff', c2: '#d9e4ff', leaf: '#3f7a4a', h: 1.2 }, { yield: _G_CUT(20, 48), price: 0, unlock: { ach: 'night-owl' }, night: 1, glow: 1, attracts: ['moth'], blurb: 'For night owls: it opens only after dark, and glows.' }),
  _gP('glowcap', 'Glowcaps', 'exotic', 'epic', 'fast', ['autumn'], { form: 'mushroom', c: '#7ef0d0', c2: '#f4f0e6', leaf: '#6a5a4a', h: 0.35 }, { price: 0, unlock: { ribbon: 'night-garden' }, glow: 1, thirst: 18, areas: ['greenhouse', 'orchard', 'meadow'], blurb: 'A ring of mushrooms that glows softly at dusk.' }),
  _gP('titan-arum', 'Titan arum', 'exotic', 'legendary', 'ancient', 'all', { form: 'titan', c: '#7a1a3a', c2: '#e6d36a', leaf: '#4f7f3a', h: 2.4 }, { price: 0, unlock: { ribbon: 'master-gardener' }, special: 'rare-bloom', blurb: 'Blooms for two days every few weeks. People travel to see it.' }),
]);
const _GD_PLANT = new Map(GARDEN_PLANTS.map(p => [p.id, p]));

/* ---------- decorations ----------
   _gD(id, name, cat, more): w, h (footprint, default 1 x 1), layer 'ground' (paths: under everything, no plants on
   top) or 'object', price, lv, unlock {season | event | ach | ribbon | find}, rot (can face 4 ways), v (styles),
   effect {kind, ...} (94-garden-1core.js applies it), areas (only there), look {c, c2, h}, blurb. */
function _gD(id, name, cat, more) {
  const r = Object.assign({ id, name, cat, w: 1, h: 1, layer: 'object', price: 10, lv: 1 }, more || {});
  r.price = _gdUp(r.price);
  r.look = _gdF(Object.assign({ h: 0.6 }, r.look || {}));
  if (r.effect) r.effect = _gdF(r.effect);
  if (r.unlock) r.unlock = _gdF(r.unlock);
  if (r.areas) r.areas = _gdF(r.areas);
  return r;
}
const GARDEN_DECOR_CATS = _gdF({
  path: _gdF({ label: 'Paths', icon: 'footprints' }), fence: _gdF({ label: 'Fences and hedges', icon: 'fence' }),
  seat: _gdF({ label: 'Seats', icon: 'armchair' }), water: _gdF({ label: 'Water', icon: 'droplets' }),
  light: _gdF({ label: 'Lights', icon: 'lamp' }), structure: _gdF({ label: 'Structures', icon: 'warehouse' }),
  wildlife: _gdF({ label: 'Wildlife homes', icon: 'bird' }), ornament: _gdF({ label: 'Ornaments', icon: 'sparkles' }),
  planter: _gdF({ label: 'Pots and planters', icon: 'flower-2' }), seasonal: _gdF({ label: 'Seasonal', icon: 'calendar-heart' }),
  angling: _gdF({ label: 'Angling and bugs', icon: 'fish' }),
});
const GARDEN_DECOR_CAT_ORDER = _gdF(['path', 'fence', 'seat', 'water', 'light', 'structure', 'wildlife', 'angling', 'ornament', 'planter', 'seasonal']);
const GARDEN_DECOR = _gdRows([
  /* paths (ground layer) */
  _gD('stepping-stones', 'Stepping stones', 'path', { layer: 'ground', price: 2, look: { c: '#b9b2a4', c2: '#8f877a', h: 0 }, blurb: 'Hop from one to the next.' }),
  _gD('gravel-path', 'Gravel path', 'path', { layer: 'ground', price: 1, look: { c: '#d6cdb8', c2: '#b0a58c', h: 0 }, blurb: 'Crunches nicely underfoot.' }),
  _gD('brick-path', 'Brick path', 'path', { layer: 'ground', price: 3, lv: 2, look: { c: '#b5573a', c2: '#8a3f2a', h: 0 }, v: 2, blurb: 'Herringbone or basket weave.' }),
  _gD('flagstones', 'Flagstones', 'path', { layer: 'ground', price: 3, lv: 3, look: { c: '#c7c2b8', c2: '#9d968a', h: 0 }, blurb: 'Big calm slabs of stone.' }),
  _gD('moss-stones', 'Mossy stones', 'path', { layer: 'ground', price: 4, lv: 8, look: { c: '#a9a99a', c2: '#6f9a4a', h: 0 }, blurb: 'Old stones with green velvet in the cracks.' }),
  _gD('boardwalk', 'Boardwalk', 'path', { layer: 'ground', price: 4, lv: 7, look: { c: '#a87c4f', c2: '#7a5636', h: 0 }, rot: 1, blurb: 'Walk right over the water.' }),
  _gD('mosaic-path', 'Mosaic tiles', 'path', { layer: 'ground', price: 8, lv: 12, look: { c: '#3a7fc4', c2: '#f2b33a', h: 0 }, v: 3, blurb: 'Tiny tiles, hand set, in a sunburst.' }),
  /* fences and hedges */
  _gD('picket-fence', 'Picket fence', 'fence', { price: 4, rot: 1, look: { c: '#f4f1ea', c2: '#cfc8b8', h: 0.55 }, v: 3, blurb: 'White, blue or sage: a cottage classic.' }),
  _gD('wattle-fence', 'Woven willow fence', 'fence', { price: 5, lv: 3, rot: 1, look: { c: '#9a7448', c2: '#6f5232', h: 0.55 }, blurb: 'Hand-woven hazel and willow.' }),
  _gD('box-hedge', 'Box hedge', 'fence', { price: 6, lv: 2, rot: 1, look: { c: '#3f7a3a', c2: '#2f5f2e', h: 0.5 }, effect: { kind: 'hedge' }, attracts: ['wren'], blurb: 'Neat and green. A wren may move in.' }),
  _gD('stone-wall', 'Dry stone wall', 'fence', { price: 6, lv: 5, rot: 1, look: { c: '#b0a898', c2: '#8a8274', h: 0.45 }, blurb: 'Not a drop of mortar, and it will outlast us all.' }),
  _gD('iron-railings', 'Iron railings', 'fence', { price: 8, lv: 8, rot: 1, look: { c: '#2f3438', c2: '#5a6066', h: 0.7 }, blurb: 'Curly tops and a fresh coat of paint.' }),
  _gD('bamboo-screen', 'Bamboo screen', 'fence', { price: 7, lv: 10, rot: 1, look: { c: '#c9b36a', c2: '#8f7a3a', h: 0.85 }, blurb: 'A rustling wall for a quiet corner.' }),
  /* seats */
  _gD('bench', 'Garden bench', 'seat', { w: 2, price: 30, rot: 1, look: { c: '#9a6a3a', c2: '#6f4a28', h: 0.6 }, v: 3, effect: { kind: 'sit' }, blurb: 'Sit a while. Everything here can wait.' }),
  _gD('stone-bench', 'Stone bench', 'seat', { w: 2, price: 45, lv: 6, rot: 1, look: { c: '#c7c2b8', c2: '#9d968a', h: 0.5 }, effect: { kind: 'sit' }, blurb: 'Warm from the sun by afternoon.' }),
  _gD('swing-seat', 'Swing seat', 'seat', { w: 2, price: 90, lv: 8, look: { c: '#f4f1ea', c2: '#7a9fb8', h: 1.3 }, effect: { kind: 'sit' }, blurb: 'Rock gently. Think of nothing.' }),
  _gD('hammock', 'Hammock', 'seat', { w: 2, price: 70, lv: 10, look: { c: '#e8b46a', c2: '#c4507a', h: 0.9 }, v: 3, effect: { kind: 'sit' }, blurb: 'For long summer afternoons.' }),
  _gD('deckchair', 'Deckchair', 'seat', { price: 18, lv: 3, rot: 1, look: { c: '#e04a3a', c2: '#f4f1ea', h: 0.6 }, v: 4, effect: { kind: 'sit' }, blurb: 'Striped like a seaside holiday.' }),
  _gD('picnic-blanket', 'Picnic blanket', 'seat', { w: 2, price: 15, lv: 4, look: { c: '#d83a3a', c2: '#f4f1ea', h: 0.1 }, v: 3, effect: { kind: 'sit' }, blurb: 'Gingham, sandwiches, no plans.' }),
  _gD('bistro-set', 'Bistro table and chairs', 'seat', { w: 2, price: 55, lv: 5, look: { c: '#3f6fa8', c2: '#2f3438', h: 0.7 }, v: 3, effect: { kind: 'sit' }, blurb: 'Coffee for two among the flowers.' }),
  /* water */
  _gD('bird-bath', 'Bird bath', 'water', { price: 30, lv: 2, look: { c: '#c7c2b8', c2: '#7fb3d8', h: 0.75 }, effect: { kind: 'birds' }, blurb: 'Splashing robins guaranteed.' }),
  _gD('fountain', 'Tiered fountain', 'water', { w: 2, h: 2, price: 160, lv: 9, look: { c: '#d3cec4', c2: '#7fb3d8', h: 1.4 }, effect: { kind: 'birds' }, blurb: 'The sound of water in the middle of everything.' }),
  _gD('water-pump', 'Water pump', 'water', { price: 40, lv: 4, look: { c: '#3f6f5a', c2: '#2f3438', h: 0.9 }, effect: { kind: 'can', n: 2 }, blurb: 'An old cast-iron pump: two more cans a day.' }),
  _gD('water-butt', 'Water butt', 'water', { price: 35, lv: 3, look: { c: '#4f6f3a', c2: '#3a4f2a', h: 0.8 }, effect: { kind: 'can', n: 4 }, blurb: 'Catches the rain: four more cans a day.' }),
  _gD('sprinkler', 'Sprinkler', 'water', { price: 50, lv: 5, look: { c: '#e8c33a', c2: '#7fb3d8', h: 0.35 }, effect: { kind: 'sprinkler', r: 1 }, blurb: 'Waters the eight cells around it every morning.' }),
  _gD('mini-pond', 'Little pond', 'water', { w: 2, h: 2, price: 80, lv: 4, look: { c: '#5f9fc4', c2: '#a9a99a', h: 0.1 }, effect: { kind: 'pond' }, attracts: ['frog', 'dragonfly'], blurb: 'Small, but the frogs do not mind.' }),
  _gD('wishing-well', 'Wishing well', 'water', { w: 2, h: 2, price: 150, lv: 11, look: { c: '#a9a29a', c2: '#8a5a3a', h: 1.4 }, effect: { kind: 'wish' }, blurb: 'Toss a coin once a day. Sometimes a seed comes back up.' }),
  /* lights */
  _gD('lantern', 'Lantern', 'light', { price: 20, lv: 3, look: { c: '#2f3438', c2: '#ffd36a', h: 0.8 }, v: 2, effect: { kind: 'light' }, blurb: 'A warm glow by the path at dusk.' }),
  _gD('string-lights', 'String lights', 'light', { w: 2, price: 35, lv: 4, look: { c: '#3a3a3a', c2: '#ffe08a', h: 1.2 }, v: 3, effect: { kind: 'light' }, blurb: 'Fairy lights strung between two posts.' }),
  _gD('solar-lights', 'Solar stake lights', 'light', { price: 12, lv: 2, look: { c: '#3a3f44', c2: '#e8f4ff', h: 0.35 }, effect: { kind: 'light' }, blurb: 'Soak up the sun, glow all night.' }),
  _gD('fire-pit', 'Fire pit', 'light', { w: 2, h: 2, price: 70, lv: 7, look: { c: '#5a5f64', c2: '#ff8a3a', h: 0.4 }, effect: { kind: 'light' }, blurb: 'Crackle, glow and marshmallows.' }),
  _gD('toadstool-lamps', 'Toadstool lamps', 'light', { price: 30, lv: 9, look: { c: '#e04a3a', c2: '#fff1c8', h: 0.4 }, effect: { kind: 'light' }, blurb: 'Red caps with white spots, lit from inside.' }),
  _gD('paper-lanterns', 'Paper lanterns', 'light', { w: 2, price: 50, lv: 12, look: { c: '#f2a7c8', c2: '#ffd36a', h: 1.3 }, v: 3, effect: { kind: 'light' }, blurb: 'Soft round moons hung on a line.' }),
  /* structures */
  _gD('rose-arch', 'Rose arch', 'structure', { w: 2, price: 70, lv: 5, look: { c: '#f4f1ea', c2: '#d2283c', h: 1.7 }, v: 3, blurb: 'Walk under roses every day.' }),
  _gD('pergola', 'Pergola', 'structure', { w: 2, h: 2, price: 140, lv: 9, look: { c: '#a87c4f', c2: '#6fae4a', h: 1.8 }, blurb: 'Dappled shade under trailing vines.' }),
  _gD('gazebo', 'Gazebo', 'structure', { w: 2, h: 2, price: 260, lv: 13, look: { c: '#f4f1ea', c2: '#5a7f9a', h: 2.0 }, effect: { kind: 'sit' }, blurb: 'Tea in the rain, dry and happy.' }),
  _gD('potting-shed', 'Potting shed', 'structure', { w: 2, h: 2, price: 180, lv: 6, look: { c: '#6f8f6a', c2: '#a87c4f', h: 1.6 }, v: 3, effect: { kind: 'shed' }, blurb: 'Seed trays, string and a radio. Seeds keep sprouting in here.' }),
  _gD('cold-frame', 'Cold frame', 'structure', { w: 2, price: 60, lv: 6, look: { c: '#a87c4f', c2: '#cfe6f2', h: 0.45 }, effect: { kind: 'cold', r: 1 }, blurb: 'Plants beside it grow as if it were their season.' }),
  _gD('obelisk', 'Plant obelisk', 'structure', { price: 20, lv: 4, look: { c: '#3f5a4a', c2: '#2f3438', h: 1.4 }, blurb: 'Something for the sweet peas to climb.' }),
  _gD('windmill', 'Garden windmill', 'structure', { price: 30, lv: 4, look: { c: '#f4f1ea', c2: '#d83a3a', h: 1.2 }, v: 2, blurb: 'Turns with every breath of wind.' }),
  _gD('weather-vane', 'Weather vane', 'structure', { price: 45, lv: 8, look: { c: '#2f3438', c2: '#c98a12', h: 1.5 }, blurb: 'A cockerel that always knows where the wind is.' }),
  _gD('sundial', 'Sundial', 'structure', { price: 60, lv: 7, look: { c: '#c7c2b8', c2: '#c98a12', h: 0.7 }, blurb: 'Counts only the sunny hours.' }),
  _gD('dovecote', 'Dovecote', 'structure', { price: 200, lv: 14, look: { c: '#f4f1ea', c2: '#7a5636', h: 1.8 }, attracts: ['wood-pigeon'], blurb: 'A tower of little doors, and soft cooing.' }),
  _gD('wheelbarrow', 'Wheelbarrow', 'structure', { price: 25, lv: 2, rot: 1, look: { c: '#3f7a5a', c2: '#a87c4f', h: 0.5 }, v: 2, blurb: 'Full of flowers, for once.' }),
  /* wildlife homes */
  _gD('bird-feeder', 'Bird feeder', 'wildlife', { price: 20, lv: 2, look: { c: '#a87c4f', c2: '#e8c33a', h: 1.1 }, effect: { kind: 'birds' }, blurb: 'Seeds and suet: the robins will visit.' }),
  _gD('bird-box', 'Bird box', 'wildlife', { price: 25, lv: 3, look: { c: '#8a6a4a', c2: '#3f6f5a', h: 1.2 }, effect: { kind: 'birds' }, attracts: ['blue-tit', 'wren'], blurb: 'A blue tit family may move in.' }),
  _gD('bug-hotel', 'Bug hotel', 'wildlife', { price: 30, lv: 4, look: { c: '#a87c4f', c2: '#c9a26a', h: 0.9 }, effect: { kind: 'bugs' }, attracts: ['ladybird', 'honeybee'], blurb: 'Five stars from the ladybirds.' }),
  _gD('hedgehog-house', 'Hedgehog house', 'wildlife', { price: 35, lv: 5, look: { c: '#7a5636', c2: '#c9a26a', h: 0.45 }, effect: { kind: 'hedgehog' }, attracts: ['hedgehog'], blurb: 'A snug dome for a prickly guest.' }),
  _gD('beehive', 'Beehive', 'wildlife', { price: 90, lv: 6, look: { c: '#f4f1ea', c2: '#e8c33a', h: 0.9 }, effect: { kind: 'hive' }, attracts: ['honeybee'], blurb: 'Honey every two days while three flowers bloom.' }),
  _gD('compost-bin', 'Compost bin', 'wildlife', { price: 40, lv: 3, look: { c: '#3f5a3a', c2: '#6f5232', h: 0.8 }, effect: { kind: 'compost' }, attracts: ['blackbird'], blurb: 'Peelings in, fertiliser out: one a day.' }),
  /* 2.22: angling and bug catching: these show what you have caught (94-garden-fish-1world.js) */
  _gD('aquarium', 'Aquarium', 'angling', { w: 2, price: 90, lv: 2, look: { c: '#7fb8d8', c2: '#4a8ab0', h: 1.1 }, effect: { kind: 'show', what: 'fish' }, blurb: 'Your best catches, swimming. Friends see it when they visit.' }),
  _gD('bug-case', 'Bug case', 'angling', { price: 60, lv: 2, look: { c: '#a87c4f', c2: '#efe3c4', h: 1.0 }, effect: { kind: 'show', what: 'bugs' }, blurb: 'Nine of your bugs, pinned under glass.' }),
  _gD('trophy-board', 'Trophy board', 'angling', { w: 2, price: 75, lv: 3, look: { c: '#8a5a34', c2: '#e8c24a', h: 1.0 }, effect: { kind: 'show', what: 'trophy' }, blurb: 'Your three biggest fish, mounted with brass plates.' }),
  _gD('fish-weathervane', 'Fish weathervane', 'angling', { price: 40, lv: 3, look: { c: '#7a8288', c2: '#e8a83a', h: 1.4 }, blurb: 'Always points at the best fishing.' }),
  _gD('bait-bucket', 'Bait bucket', 'angling', { price: 12, lv: 1, look: { c: '#7a8288', c2: '#2f6a98', h: 0.5 }, blurb: 'A bucket with a minnow that is not going anywhere.' }),
  /* ornaments */
  _gD('gnome', 'Garden gnome', 'ornament', { price: 25, lv: 2, look: { c: '#d83a3a', c2: '#3f6fa8', h: 0.6 }, v: 4, effect: { kind: 'luck' }, blurb: 'Waving, fishing, napping or reading. Gnomes bring luck.' }),
  _gD('scarecrow', 'Scarecrow', 'ornament', { price: 40, lv: 3, look: { c: '#c9a26a', c2: '#3f6fa8', h: 1.5 }, effect: { kind: 'scare', r: 2 }, blurb: 'Guards the veg patch: a little extra at harvest nearby.' }),
  _gD('stone-frog', 'Stone frog', 'ornament', { price: 18, lv: 3, look: { c: '#8a9a7a', c2: '#5f6f4f', h: 0.3 }, blurb: 'Never hops, always smiles.' }),
  _gD('stone-owl', 'Stone owl', 'ornament', { price: 28, lv: 6, look: { c: '#a9a29a', c2: '#7a7268', h: 0.6 }, blurb: 'Watches the garden all night.' }),
  _gD('flamingo', 'Pink flamingo', 'ornament', { price: 22, lv: 5, look: { c: '#f27aa8', c2: '#2f3438', h: 0.9 }, blurb: 'Gloriously out of place.' }),
  _gD('topiary-peacock', 'Topiary peacock', 'ornament', { price: 120, lv: 10, look: { c: '#3f7a3a', c2: '#2f5f2e', h: 1.3 }, blurb: 'Years of careful snipping, in one proud bird.' }),
  _gD('hare-statue', 'Stone hare', 'ornament', { price: 150, lv: 12, look: { c: '#c7c2b8', c2: '#9d968a', h: 1.0 }, blurb: 'Gazing at the moon, whatever the hour.' }),
  _gD('gazing-ball', 'Gazing ball', 'ornament', { price: 50, lv: 8, look: { c: '#5aa0d8', c2: '#c7c2b8', h: 0.7 }, v: 3, blurb: 'The whole garden, curved into one shiny ball.' }),
  _gD('wind-chimes', 'Wind chimes', 'ornament', { price: 25, lv: 5, look: { c: '#c98a12', c2: '#a87c4f', h: 1.3 }, blurb: 'The breeze, made audible.' }),
  _gD('signpost', 'Signpost', 'ornament', { price: 10, rot: 1, look: { c: '#a87c4f', c2: '#f4f1ea', h: 1.1 }, blurb: 'This way to the vegetables.' }),
  _gD('welcome-sign', 'Welcome sign', 'ornament', { price: 12, lv: 2, look: { c: '#a87c4f', c2: '#f2a7c8', h: 0.8 }, blurb: 'A little hand-painted hello.' }),
  _gD('letterbox', 'Letterbox post', 'ornament', { price: 20, lv: 4, look: { c: '#d83a3a', c2: '#2f3438', h: 1.0 }, v: 3, blurb: 'For seed catalogues and postcards.' }),
  /* pots and planters */
  _gD('terracotta-pots', 'Terracotta pots', 'planter', { price: 8, look: { c: '#c8693a', c2: '#e88a5a', h: 0.45 }, v: 3, blurb: 'A cluster of pots with herbs spilling out.' }),
  _gD('hanging-basket', 'Hanging basket', 'planter', { price: 22, lv: 4, look: { c: '#2f3438', c2: '#f27aa8', h: 1.4 }, v: 3, blurb: 'Trailing petunias on a bracket.' }),
  _gD('planter-box', 'Wooden planter', 'planter', { w: 2, price: 18, lv: 3, look: { c: '#a87c4f', c2: '#f6c445', h: 0.5 }, v: 3, blurb: 'A long box of bright bedding plants.' }),
  _gD('old-watering-can', 'Old watering can', 'planter', { price: 10, lv: 2, look: { c: '#7a9a8a', c2: '#f6c445', h: 0.45 }, blurb: 'Retired, now full of marigolds.' }),
  _gD('stone-urn', 'Stone urn', 'planter', { price: 60, lv: 9, look: { c: '#c7c2b8', c2: '#9b7fd1', h: 1.0 }, blurb: 'Grand enough for a stately home.' }),
  /* seasonal */
  _gD('carved-pumpkin', 'Jack-o’-lantern', 'seasonal', { price: 10, unlock: { event: 'halloween' }, look: { c: '#ef7f1a', c2: '#ffd36a', h: 0.45 }, v: 3, effect: { kind: 'light' }, blurb: 'A friendly grin, lit from inside.' }),
  _gD('leaf-pile', 'Leaf pile', 'seasonal', { price: 5, unlock: { season: 'autumn' }, look: { c: '#d9671c', c2: '#a8432a', h: 0.3 }, effect: { kind: 'hedgehog' }, attracts: ['hedgehog'], blurb: 'Jump in it. A hedgehog may sleep in it.' }),
  _gD('hay-bale', 'Hay bale', 'seasonal', { price: 12, unlock: { event: 'harvest-home' }, look: { c: '#e8c96a', c2: '#c9a24a', h: 0.5 }, blurb: 'Harvest home: a seat that smells of summer.' }),
  _gD('snowman', 'Snowman', 'seasonal', { price: 10, unlock: { season: 'winter' }, look: { c: '#fbfdff', c2: '#ef7f1a', h: 1.0 }, v: 3, blurb: 'Carrot nose, coal buttons, a borrowed scarf.' }),
  _gD('festive-lights', 'Festive lights', 'seasonal', { w: 2, price: 30, unlock: { event: 'winter-lights' }, look: { c: '#2f5f2e', c2: '#ffd36a', h: 1.2 }, v: 2, effect: { kind: 'light' }, blurb: 'A twinkling garland for the darkest weeks.' }),
  _gD('bunting', 'Bunting', 'seasonal', { w: 2, price: 15, unlock: { season: 'summer' }, look: { c: '#d83a3a', c2: '#3a6fc4', h: 1.3 }, v: 2, blurb: 'Little flags for a summer fete.' }),
  _gD('painted-eggs', 'Painted eggs', 'seasonal', { price: 10, unlock: { event: 'spring-bloom' }, look: { c: '#f2a7c8', c2: '#7fb3f0', h: 0.25 }, blurb: 'Hidden in the grass for someone to find.' }),
  // 2.23: made at the crafting bench (94-garden-craft-0rules.js), never sold: craft: 1 keeps them out of the shop, price 0 means the market pays nothing for them
  _gD('flower-barrow', 'Flower barrow', 'planter', { craft: 1, price: 0, w: 2, look: { c: '#a86a3a', c2: '#e87a9a', h: 0.7, parts: [['box', { w: 40, h: 18, y: -6 }], ['post', { x: -24, w: 4, h: 10, y: 0 }], ['orb', { x: 16, r: 6, y: 2, c: '#3a3a3a' }], ['bush', { x: -8, y: -22, w: 20, clip: 'sway' }], ['bush', { x: 10, y: -22, w: 16, clip: 'sway' }]] }, blurb: 'Parked for good.' }),
  _gD('herb-rack', 'Drying rack', 'ornament', { craft: 1, price: 0, look: { c: '#8a6a44', c2: '#7aa45a', h: 0.9, parts: [['post', { x: -16, w: 4, h: 44 }], ['post', { x: 16, w: 4, h: 44 }], ['block', { y: -42, w: 42, h: 4 }], ['bush', { x: -9, y: -20, w: 11, h: 18, clip: 'sway' }], ['bush', { x: 9, y: -20, w: 11, h: 18, clip: 'sway' }]] }, blurb: 'Hang it, forget it, cook with it.' }),
  _gD('apple-crate', 'Apple crate', 'ornament', { craft: 1, price: 0, look: { c: '#b08a58', c2: '#d8453a', h: 0.5, parts: [['box', { w: 34, h: 18 }], ['orb', { x: -9, y: -15, r: 6 }], ['orb', { x: 3, y: -16, r: 6 }], ['orb', { x: 11, y: -14, r: 5 }]] }, blurb: 'Help yourself.' }),
  _gD('lantern-gourd', 'Gourd lantern', 'light', { craft: 1, price: 0, effect: { kind: 'light' }, look: { c: '#e88a3c', c2: '#ffd070', h: 0.7, parts: [['post', { w: 4, h: 26 }], ['lantern', { y: -26, r: 9 }]] }, blurb: 'A soft orange glow, and a slightly smug face.' }),
  _gD('driftwood-seat', 'Driftwood seat', 'seat', { craft: 1, price: 0, w: 2, effect: { kind: 'sit' }, look: { c: '#b8a58a', c2: '#8a7a60', h: 0.5, parts: [['block', { w: 54, h: 9, y: -10 }], ['stone', { x: -18, w: 14 }], ['stone', { x: 18, w: 14 }]] }, blurb: 'It came a long way to be sat on.' }),
  _gD('bee-skep', 'Straw skep', 'wildlife', { craft: 1, price: 0, look: { c: '#d8b060', c2: '#8a6a3a', h: 0.7, parts: [['post', { w: 7, h: 16 }], ['block', { y: -16, w: 28, h: 4 }], ['orb', { y: -18, r: 14 }], ['orb', { y: -34, r: 8 }]] }, blurb: 'Bees approve of the thatch.' }),
  _gD('fish-flag', 'Fish flag', 'angling', { craft: 1, price: 0, look: { c: '#4a7ab0', c2: '#f4ead8', h: 1.1, parts: [['post', { w: 4, h: 62 }], ['flag', { x: 2, y: -60, w: 24, h: 12, clip: 'flutter' }]] }, blurb: 'It tells the wind which way the fish went.' }),
  /* the catching overhaul: bugs come to these (effect.what: their shape), and what the lake gives you. Drawn by gartDefine in 94-garden-fish-9world.js */
  _gD('log-pile', 'Log pile', 'wildlife', { price: 30, lv: 3, look: { c: '#7a5636', c2: '#a87c4f', h: 0.5 }, effect: { kind: 'habitat', what: ['beetle', 'stag', 'ladybird', 'spider', 'snail'] }, blurb: 'Beetles move in. So do things that eat beetles.' }),
  _gD('butterfly-bush', 'Butterfly bush', 'wildlife', { price: 45, lv: 4, look: { c: '#5a8a4a', c2: '#a86ad8', h: 1.1 }, effect: { kind: 'habitat', what: ['butterfly', 'bee'] }, blurb: 'Long purple spikes. Butterflies come from all over.' }),
  _gD('moth-sheet', 'Moth sheet', 'wildlife', { price: 40, lv: 5, look: { c: '#f4f0e6', c2: '#8a6a3a', h: 1.2 }, effect: { kind: 'habitat', what: ['moth', 'firefly', 'cicada'] }, blurb: 'A white sheet and a lamp. What flies at night comes to look.' }),
  _gD('firefly-jar', 'Firefly jar', 'angling', { craft: 1, price: 0, look: { c: '#d8ecd8', c2: '#ffe25a', h: 0.7 }, blurb: 'Dark all day. At dusk it wakes up.' }),
  _gD('boot-planter', 'Boot planter', 'angling', { craft: 1, price: 0, look: { c: '#7a5a3a', c2: '#e8607a', h: 0.8 }, blurb: 'Somebody lost this. Now it has daisies.' }),
  _gD('can-chimes', 'Tin can chimes', 'angling', { craft: 1, price: 0, look: { c: '#b8bcc0', c2: '#6a4426', h: 1.3 }, blurb: 'They clink in the wind. Not badly.' }),
  _gD('sea-chest', 'Sunken chest', 'angling', { craft: 1, price: 0, look: { c: '#7a4a2a', c2: '#e8c24a', h: 0.6 }, blurb: 'You read the map, and you found it.' }),
  _gD('ship-wheel', 'Ship’s wheel', 'angling', { craft: 1, price: 0, look: { c: '#7a4a2a', c2: '#c8a23a', h: 1.2 }, blurb: 'From the old wreck, by way of a second map.' }),
  _gD('figurehead', 'Figurehead', 'angling', { craft: 1, price: 0, look: { c: '#c8a46a', c2: '#3f6f8a', h: 1.5 }, blurb: 'She has looked out over this lake a long time.' }),
  _gD('rosette-stand', 'Festival rosette', 'angling', { craft: 1, price: 0, look: { c: '#d8452a', c2: '#e8c24a', h: 1 }, blurb: 'Weighed in, and judged. Friends can see the ribbon.' }),
  _gD('thing-cast', 'Plaster footprint', 'angling', { craft: 1, price: 0, w: 2, look: { c: '#e8e4d8', c2: '#3f6f8a', h: 0.5 }, blurb: 'Five sightings, and this washed up. Nobody can say what made it.' }),
  _gD('legend-plaque', 'Legend plaque', 'angling', { craft: 1, price: 0, look: { c: '#6a4a2e', c2: '#e8c24a', h: 1.1 }, blurb: 'The old angler carved it himself. All four.' }),
  _gD('rose-arch', 'Rose arch', 'structure', { craft: 1, price: 0, w: 2, look: { c: '#7a5a3a', c2: '#d8405a', h: 1.4, parts: [['post', { x: -24, w: 5, h: 72 }], ['post', { x: 24, w: 5, h: 72 }], ['block', { y: -70, w: 58, h: 6 }], ['bush', { x: -24, y: -22, w: 14, h: 30, clip: 'sway' }], ['bush', { x: 24, y: -22, w: 14, h: 30, clip: 'sway' }], ['bush', { y: -74, w: 40, h: 16, clip: 'sway' }]] }, blurb: 'Left by a friend, with a note.' }),
]);
const _GD_DECOR = new Map(GARDEN_DECOR.map(d => [d.id, d]));

/* ---------- visitors ----------
   when {tod: ['dawn','day','dusk','night'], seasons}, needs (all must hold): {bloom: flowers in bloom, plants: [ids]
   (any of them in the garden), cats: {cat: n}, decor: [ids] (any), effect: decoration effect kind (any), area: an
   open area, ripe: plants with fruit or flowers ready, trees: grown trees, rain, level}, chance per 20-minute
   window (deterministic by the window, so a visitor stays put across re-renders), spot: where it shows up,
   motion: the engine's animation for it. */
function _gV(id, name, kind, rarity, when, needs, more) {
  return Object.assign({ id, name, kind, rarity, when: _gdF(Object.assign({ tod: ['dawn', 'day', 'dusk'], seasons: GARDEN_SEASONS }, when)), needs: _gdF(needs || {}), chance: 0.5, spot: 'lawn', motion: 'sit' }, more || {});
}
const _G_WARM = ['spring', 'summer', 'autumn'];
const GARDEN_VISITORS = _gdRows([
  _gV('honeybee', 'Honeybee', 'insect', 'common', { tod: ['day'], seasons: _G_WARM }, { bloom: 2 }, { chance: 0.9, spot: 'flower', motion: 'buzz', look: { c: '#f2b01e', c2: '#2a2a2a' }, blurb: 'Busy, busy: there are flowers out.' }),
  _gV('bumblebee', 'Bumblebee', 'insect', 'common', { tod: ['day'], seasons: ['spring', 'summer'] }, { bloom: 3 }, { chance: 0.7, spot: 'flower', motion: 'buzz', look: { c: '#f2c43a', c2: '#2a2a2a' }, blurb: 'Round, furry and not in any hurry.' }),
  _gV('cabbage-white', 'Cabbage white', 'insect', 'common', { tod: ['day'], seasons: ['spring', 'summer'] }, { bloom: 1 }, { chance: 0.6, spot: 'flower', motion: 'flutter', look: { c: '#f7f5ee', c2: '#3a3a3a' }, blurb: 'A white butterfly with an eye on the cabbages.' }),
  _gV('peacock-butterfly', 'Peacock butterfly', 'insect', 'uncommon', { tod: ['day'], seasons: ['summer'] }, { bloom: 4 }, { chance: 0.45, spot: 'flower', motion: 'flutter', look: { c: '#b83a2a', c2: '#3a4fa8' }, blurb: 'Eyes on its wings to startle the birds.' }),
  _gV('red-admiral', 'Red admiral', 'insect', 'uncommon', { tod: ['day'], seasons: ['summer', 'autumn'] }, { bloom: 6 }, { chance: 0.4, spot: 'flower', motion: 'flutter', look: { c: '#2a2a2a', c2: '#e2442b' }, blurb: 'Loves late flowers and fallen fruit.' }),
  _gV('ladybird', 'Ladybird', 'insect', 'common', { tod: ['day'], seasons: _G_WARM }, { plants: ['rose', 'marigold', 'basil', 'mint', 'thyme'] }, { chance: 0.6, spot: 'plant', motion: 'crawl', look: { c: '#d8202b', c2: '#1a1a1a' }, blurb: 'Seven spots and a big appetite for aphids.' }),
  _gV('dragonfly', 'Dragonfly', 'insect', 'uncommon', { tod: ['day'], seasons: ['summer'] }, { effect: 'pond' }, { chance: 0.6, spot: 'pond', motion: 'dart', look: { c: '#3ab4c4', c2: '#cfeff4' }, blurb: 'A flash of blue over the water.' }),
  _gV('firefly', 'Glow-worms', 'insect', 'rare', { tod: ['night'], seasons: ['summer'] }, { cats: { wild: 3 } }, { chance: 0.5, spot: 'meadow', motion: 'glow', look: { c: '#d8ff7a', c2: '#3a3a2a' }, blurb: 'Tiny green lights in the long grass on warm nights.' }),
  _gV('moth', 'Moth', 'insect', 'common', { tod: ['dusk', 'night'], seasons: _G_WARM }, { effect: 'light' }, { chance: 0.7, spot: 'light', motion: 'flutter', look: { c: '#c9b89a', c2: '#8a7a5a' }, blurb: 'Drawn to the lanterns like a little ghost.' }),
  _gV('snail', 'Snail', 'mollusc', 'common', { tod: ['dawn', 'day', 'dusk', 'night'] }, { rain: 1 }, { chance: 0.8, spot: 'plant', motion: 'crawl', look: { c: '#c9a26a', c2: '#8a8a7a' }, blurb: 'Out for a slow wander after the rain.' }),
  _gV('robin', 'Robin', 'bird', 'common', {}, { effect: 'birds' }, { chance: 0.75, spot: 'decor', motion: 'hop', look: { c: '#e2662b', c2: '#8a6a4a' }, blurb: 'Follows you round the garden, just in case you dig up a worm.' }),
  _gV('blue-tit', 'Blue tit', 'bird', 'common', { tod: ['day'] }, { decor: ['bird-feeder', 'bird-box'] }, { chance: 0.6, spot: 'decor', motion: 'hop', look: { c: '#4a8fd8', c2: '#f2d33a' }, blurb: 'Acrobatics at the feeder.' }),
  _gV('blackbird', 'Blackbird', 'bird', 'common', { tod: ['dawn', 'day', 'dusk'] }, { ripe: 1 }, { chance: 0.6, spot: 'lawn', motion: 'hop', look: { c: '#1f1f1f', c2: '#f2a02b' }, blurb: 'Sings the evening in, and eats the berries.' }),
  _gV('wren', 'Wren', 'bird', 'uncommon', { tod: ['day'] }, { decor: ['box-hedge', 'bird-box'] }, { chance: 0.4, spot: 'decor', motion: 'hop', look: { c: '#8a5a3a', c2: '#c9a26a' }, blurb: 'Tiny, loud and very proud of its hedge.' }),
  _gV('goldfinch', 'Goldfinch', 'bird', 'uncommon', { tod: ['day'], seasons: ['summer', 'autumn'] }, { plants: ['sunflower', 'thistle', 'golden-sunflower'], ripe: 1 }, { chance: 0.5, spot: 'flower', motion: 'hop', look: { c: '#e2b02b', c2: '#d83a3a' }, blurb: 'A charm of goldfinches on the seed heads.' }),
  _gV('wood-pigeon', 'Wood pigeon', 'bird', 'common', { tod: ['day'] }, { trees: 1 }, { chance: 0.5, spot: 'lawn', motion: 'walk', look: { c: '#9aa0aa', c2: '#d8b8c8' }, blurb: 'Coos the same five notes all morning.' }),
  _gV('tawny-owl', 'Tawny owl', 'bird', 'rare', { tod: ['night'] }, { trees: 2 }, { chance: 0.45, spot: 'tree', motion: 'sit', look: { c: '#8a6a4a', c2: '#e2c48a' }, blurb: 'Too-wit, too-woo from the big tree.' }),
  _gV('grey-heron', 'Grey heron', 'bird', 'rare', { tod: ['dawn'] }, { area: 'pond', cats: { water: 3 } }, { chance: 0.5, spot: 'pond', motion: 'sit', look: { c: '#b8bec4', c2: '#3a3a3a' }, blurb: 'Stands perfectly still at the pond at first light.' }),
  _gV('kingfisher', 'Kingfisher', 'bird', 'epic', { tod: ['day'], seasons: _G_WARM }, { area: 'pond', plants: ['willow', 'bulrush'] }, { chance: 0.25, spot: 'pond', motion: 'dart', look: { c: '#1f8fd8', c2: '#f28a2b' }, blurb: 'A blue spark that is gone before you can point.' }),
  _gV('mallard', 'Mallard', 'bird', 'uncommon', { tod: ['dawn', 'day', 'dusk'] }, { area: 'pond' }, { chance: 0.6, spot: 'pond', motion: 'swim', look: { c: '#2f8f4a', c2: '#a87c4f' }, blurb: 'Paddles about as if it owns the pond. It does.' }),
  _gV('frog', 'Frog', 'amphibian', 'common', { tod: ['dawn', 'day', 'dusk', 'night'], seasons: _G_WARM }, { effect: 'pond' }, { chance: 0.75, spot: 'pond', motion: 'hop', look: { c: '#5f9f3a', c2: '#d8c86a' }, blurb: 'Sitting on a lily pad, as frogs should.' }),
  _gV('newt', 'Newt', 'amphibian', 'uncommon', { tod: ['dusk', 'night'], seasons: ['spring', 'summer'] }, { area: 'pond' }, { chance: 0.35, spot: 'pond', motion: 'crawl', look: { c: '#8a6a3a', c2: '#f28a2b' }, blurb: 'An orange belly and a very small dragon’s face.' }),
  _gV('hedgehog', 'Hedgehog', 'mammal', 'uncommon', { tod: ['dusk', 'night'], seasons: _G_WARM }, { effect: 'hedgehog' }, { chance: 0.6, spot: 'lawn', motion: 'walk', look: { c: '#8a6a4a', c2: '#c9a26a' }, blurb: 'Snuffles across the lawn on its nightly rounds.' }),
  _gV('fox', 'Fox', 'mammal', 'rare', { tod: ['dusk', 'night'] }, { area: 'orchard' }, { chance: 0.3, spot: 'lawn', motion: 'walk', look: { c: '#d8642b', c2: '#f7f1ea' }, blurb: 'Trots through the orchard as if on business.' }),
  _gV('squirrel', 'Squirrel', 'mammal', 'common', { tod: ['day'] }, { trees: 1 }, { chance: 0.55, spot: 'tree', motion: 'hop', look: { c: '#a8643a', c2: '#e8c8a8' }, blurb: 'Burying nuts it will never find again.' }),
  _gV('rabbit', 'Rabbit', 'mammal', 'uncommon', { tod: ['dawn', 'dusk'] }, { plants: ['lettuce', 'carrot', 'clover'] }, { chance: 0.45, spot: 'veg', motion: 'hop', look: { c: '#b89a7a', c2: '#f7f1ea' }, blurb: 'Eyeing up the lettuces. Just looking, it says.' }),
  _gV('roe-deer', 'Roe deer', 'mammal', 'epic', { tod: ['dawn'] }, { area: 'meadow', trees: 3 }, { chance: 0.25, spot: 'meadow', motion: 'sit', look: { c: '#a8743a', c2: '#f7f1ea' }, blurb: 'At the edge of the meadow, for a moment, at dawn.' }),
  _gV('pipistrelle', 'Pipistrelle bat', 'mammal', 'uncommon', { tod: ['dusk', 'night'], seasons: ['summer', 'autumn'] }, { effect: 'light' }, { chance: 0.45, spot: 'sky', motion: 'dart', look: { c: '#4a3a3a', c2: '#8a6a6a' }, blurb: 'Swoops after the moths the lights bring in.' }),
  _gV('garden-cat', 'Next door’s cat', 'mammal', 'uncommon', { tod: ['day'] }, { effect: 'sit' }, { chance: 0.35, spot: 'seat', motion: 'sit', look: { c: '#e8a05a', c2: '#f7f1ea' }, blurb: 'Asleep on your bench. It visits everyone’s garden.' }),
]);
const _GD_VISITOR = new Map(GARDEN_VISITORS.map(v => [v.id, v]));

/* ---------- ground tiles ---------- */
const GARDEN_TILES = _gdRows([
  { id: 'grass', name: 'Lawn', c: '#8cc25a', c2: '#7ab04a', winter: '#a9b98a', autumn: '#9ab45a' },
  { id: 'soil', name: 'Flower bed', c: '#8a5a3a', c2: '#74482c', winter: '#7a5a46', autumn: '#8a5a3a' },
  { id: 'tilled', name: 'Veg rows', c: '#7a4a2e', c2: '#5f3822', winter: '#6f4f3e', autumn: '#7a4a2e' },
  { id: 'orchard-grass', name: 'Orchard grass', c: '#9ac46a', c2: '#86b058', winter: '#aab88e', autumn: '#b4b45a' },
  { id: 'long-grass', name: 'Meadow', c: '#a8c86a', c2: '#c4cf7a', winter: '#b4b896', autumn: '#c4b46a' },
  { id: 'pond-water', name: 'Water', c: '#5f9fc4', c2: '#4f8ab0', winter: '#a9cbe0', autumn: '#5f8fb0' },
  { id: 'pond-edge', name: 'Pond edge', c: '#9aa88a', c2: '#7a8a6a', winter: '#b0b8a6', autumn: '#9a9a7a' },
  { id: 'glasshouse', name: 'Greenhouse floor', c: '#c9b8a0', c2: '#b0a088', winter: '#c9b8a0', autumn: '#c9b8a0' },
  { id: 'wild-ground', name: 'Wild ground', c: '#9aa86a', c2: '#88965a', winter: '#aab096', autumn: '#a8a466' },
  { id: 'sand', name: 'Lake shore', c: '#e3d3a2', c2: '#cdbb86', winter: '#d9d4c0', autumn: '#dccb98' },
  { id: 'lake-water', name: 'Lake water', c: '#4f93be', c2: '#3a7aa6', winter: '#9fc4dc', autumn: '#4a85a8' },
  { id: 'forest', name: 'Woodland floor', c: '#6f9a4a', c2: '#5a8239', winter: '#9aa68a', autumn: '#a08a46' },
]);
const _GD_TILE = new Map(GARDEN_TILES.map(t => [t.id, t]));

/* ---------- areas ----------
   x, y, w, h in cells (the world is 20 x 11; y grows towards you). lv = garden level that opens it. cats = the plant
   categories that grow there; water = the pond's water cells (only pond plants), the rest of the pond is its edge
   (flowers, wildflowers and the willow). The lawn is every cell no area claims: decorations only. */
const GARDEN_AREAS = _gdRows([
  { id: 'bed', name: 'Front garden', lv: 1, x: 6, y: 4, w: 8, h: 4, tile: 'soil', cats: _gdF(['flower', 'wild', 'herb', 'fruit', 'tree', 'succulent']), icon: 'flower-2', blurb: 'Where it all starts: flowers, herbs and the old oak.' },
  { id: 'veg', name: 'Veg patch', lv: 3, x: 0, y: 4, w: 6, h: 5, tile: 'tilled', cats: _gdF(['veg', 'herb', 'fruit']), icon: 'carrot', blurb: 'Rows of good things to eat.' },
  { id: 'orchard', name: 'Orchard', lv: 5, x: 0, y: 0, w: 7, h: 4, tile: 'orchard-grass', cats: _gdF(['tree', 'fruit', 'wild']), icon: 'trees', blurb: 'Fruit trees, long grass and fallen apples.' },
  { id: 'pond', name: 'Pond', lv: 7, x: 14, y: 0, w: 6, h: 4, tile: 'pond-edge', water: _gdF({ x: 15, y: 1, w: 4, h: 2 }), cats: _gdF(['water', 'flower', 'wild', 'tree']), icon: 'waves', blurb: 'Water lilies, reeds and a frog or two.' },
  { id: 'greenhouse', name: 'Greenhouse', lv: 9, x: 14, y: 4, w: 6, h: 5, tile: 'glasshouse', cats: _gdF(['exotic', 'succulent', 'veg', 'flower', 'herb', 'fruit', 'tree']), always: 1, icon: 'warehouse', blurb: 'Always summer inside: exotics, succulents and anything out of season.' },
  { id: 'meadow', name: 'Flower meadow', lv: 12, x: 7, y: 0, w: 7, h: 4, tile: 'long-grass', cats: _gdF(['wild', 'flower', 'tree']), icon: 'flower', blurb: 'Let it go wild: poppies, clover and the rarest orchid.' },
  // 2.22: the Wild woods (east) are the bug-catchers' corner; the Lake (south) is where you fish, from the shore or the pier.
  { id: 'woods', name: 'Wild woods', lv: 4, x: 20, y: 0, w: 8, h: 11, tile: 'forest', cats: _gdF(['tree', 'wild', 'fruit', 'herb']), icon: 'trees', bugs: 1, blurb: 'Tall trees, logs and mushrooms: the best place to catch bugs.' },
  { id: 'lake', name: 'The lake', lv: 1, x: 0, y: 11, w: 28, h: 19, tile: 'sand', water: _gdF({ x: 0, y: 13, w: 28, h: 17 }), cats: _gdF([]), icon: 'fish', fishing: 1, blurb: 'Cast a line from the shore or the pier. Deeper water, better fish.' },
  // 2.23: land you buy with coins, either side of the lane that runs east along the shore (y 11-12). buy: what it cost; lv: the garden level it could be bought from; look: how the ground is drawn.
  // Not sold whole any more: someone who bought one keeps it (its id is in their ledger), everyone else buys its sections (94-garden-lands-0table.js).
  // At most 12 areas in all: a friend's snapshot carries the open ones and older versions check that list's length (lib/friends/garden.mjs).
  { id: 'hill', name: 'Sunny hill', lv: 2, buy: 150, look: 'meadow', x: 28, y: 0, w: 16, h: 11, tile: 'long-grass', cats: _gdF(['wild', 'flower', 'tree', 'herb']), icon: 'flower', blurb: 'Open grass that catches the sun all day.' },
  { id: 'field', name: 'Kitchen field', lv: 3, buy: 300, look: 'veg', x: 28, y: 13, w: 16, h: 17, tile: 'tilled', cats: _gdF(['veg', 'herb', 'fruit']), icon: 'carrot', blurb: 'Long rows of good dark soil.' },
  { id: 'grove', name: 'Old orchard', lv: 5, buy: 500, look: 'orchard', x: 44, y: 0, w: 16, h: 11, tile: 'orchard-grass', cats: _gdF(['tree', 'fruit', 'wild', 'flower']), icon: 'trees', blurb: 'Room for a whole avenue of fruit trees.' },
  { id: 'marsh', name: 'Lily marsh', lv: 7, buy: 800, look: 'pond', x: 44, y: 13, w: 16, h: 17, tile: 'pond-edge', water: _gdF({ x: 47, y: 16, w: 10, h: 10 }), cats: _gdF(['water', 'flower', 'wild', 'tree']), icon: 'waves', blurb: 'A wide still pool with its own frogs.' },
]);
/* The land you own, kept here so gardenAreaAt stays a plain lookup: 94-garden-1core.js fills it from your wallet (items 'land:<id>'). Empty in Node, where nothing asks by level. */
const _GD_LAND = new Set();
function gardenLandSet(ids) { _GD_LAND.clear(); for (const id of ids || []) _GD_LAND.add(id); if (typeof gardenLandPropsReset === 'function') gardenLandPropsReset(); }
/* What has been built for the lake in the garden on screen (GARDEN_WORKS): yours, or on a visit your friend's (the snapshot's `wk`). */
const _GD_WORKS = new Set();
function gardenWorksSet(ids) { _GD_WORKS.clear(); for (const id of ids || []) _GD_WORKS.add(id); }
function gardenWorkOwned(id) { return _GD_WORKS.has(id); }
/** How many cells the pier has grown. */
function gardenPierMore() { return _GD_WORKS.has('pier-3') ? 8 : _GD_WORKS.has('pier-2') ? 4 : 0; }
/* Fixed things in the world (not in your bag, not movable): the pier you walk out on, the tackle shop. x, y, w, h in cells.
   walk: you can stand on it; door: the cell you stand on to knock; act: what the page does when you get there.
   col (2.28.1, what it does to your feet): 'full' (the default: its whole footprint is a wall: a shop, a stall, the bench), 'soft' (a small box at its base:
   a lectern, a post box, you slip past) or 'none' (you walk through it: a post at the water's edge, reeds, the boat on the water). A walk prop is 'none'. */
const GARDEN_PROPS = _gdRows([
  { id: 'pier', name: 'The pier', x: 12, y: 12, w: 2, h: 5, walk: 1, blurb: 'Walk out over the water: the fish are bigger past the end of it.' },
  // what you can build on to it (GARDEN_WORKS): no kind, so nothing of their own is drawn: gardenPierGround draws the whole length
  { id: 'pier-2', name: 'The pier', x: 12, y: 17, w: 2, h: 4, walk: 1, needs: 'pier-2', blurb: 'New planks towards the bigger fish.' },
  { id: 'pier-3', name: 'The pier', x: 12, y: 21, w: 2, h: 4, walk: 1, needs: 'pier-3', blurb: 'All the way out, to where the fins are.' },
  // 2.22: the menus are in the world. Walk up and click a building (you go to its door and it opens): act is the page it opens,
  // kind the way it is drawn, tall how many rows its art stands above its footprint (that is where a click counts).
  { id: 'market-stall', name: 'Market stall', x: 0, y: 11, w: 2, h: 1, door: _gdF({ x: 1, y: 12 }), act: 'basket', kind: 'stall', tall: 2, blurb: 'Sell what you have picked, and make bouquets.' },
  { id: 'garden-shop', name: 'Garden shop', x: 6, y: 11, w: 3, h: 1, door: _gdF({ x: 7, y: 12 }), act: 'shop', kind: 'shop', tall: 2.8, blurb: 'Seeds, decorations and tools.' },
  { id: 'notice-board', name: 'Notice board', x: 10, y: 11, w: 2, h: 1, door: _gdF({ x: 11, y: 12 }), act: 'almanac', kind: 'board', tall: 1.9, blurb: 'Everything you have found, and your ribbons.' },
  { id: 'field-journal', name: 'Field journal', x: 21, y: 11, w: 1, h: 1, col: 'soft', door: _gdF({ x: 21, y: 12 }), act: 'journal', kind: 'lectern', tall: 1.4, blurb: 'Your fish book, bug book and showcase.' },
  { id: 'camera-tripod', name: 'Camera', x: 15, y: 11, w: 1, h: 1, col: 'soft', door: _gdF({ x: 15, y: 12 }), act: 'photo', kind: 'tripod', tall: 1.6, blurb: 'Take a picture of your garden.' },
  { id: 'tackle-shop', name: 'Tackle shop', x: 17, y: 11, w: 3, h: 1, door: _gdF({ x: 18, y: 12 }), act: 'tackle', kind: 'tackle', tall: 3, blurb: 'Rods, nets, bait and the fish market.' },
  { id: 'post-box', name: 'Post box', x: 20, y: 11, w: 1, h: 1, col: 'soft', door: _gdF({ x: 20, y: 12 }), act: 'friends', kind: 'postbox', tall: 1.5, blurb: 'Friends’ gardens, parcels and your guestbook.' },
  { id: 'craft-bench', name: 'Crafting bench', x: 3, y: 11, w: 2, h: 1, door: _gdF({ x: 3, y: 12 }), act: 'craft', kind: 'bench', tall: 1.5, verb: 'make something', blurb: 'Turn what you grow, catch and find into hats, collars, decorations and treats.' },
  { id: 'sundial', name: 'Sundial', x: 26, y: 11, w: 1, h: 1, col: 'soft', door: _gdF({ x: 26, y: 12 }), act: 'timelapse', kind: 'sundial', tall: 1.4, blurb: 'Watch your garden’s story as a time-lapse.' },
  // the catching overhaul: drawn by gardenCatchPropArt, opened through _gwOpenProp (94-garden-fish-9world.js). `needs` keeps one that is not built from taking a click
  { id: 'lake-hall', name: 'The lake hall', kind: 'hall', x: 22, y: 11, w: 3, h: 1, door: _gdF({ x: 23, y: 12 }), act: 'hall', tall: 3, blurb: 'Give one of each fish and bug. It grows as you do.' },
  { id: 'lake-board', name: 'The lake board', kind: 'lakeboard', x: 9, y: 11, w: 1, h: 1, col: 'soft', door: _gdF({ x: 9, y: 12 }), act: 'lake', tall: 1.8, blurb: 'The forecast, who is wanted this week, and the lake records.' },
  { id: 'old-angler', name: 'The old angler', kind: 'angler', x: 14, y: 12, w: 1, h: 1, col: 'none', door: _gdF({ x: 15, y: 12 }), act: 'angler', tall: 1.4, blurb: 'Has fished here longer than anybody can remember.' },
  { id: 'smoker', name: 'Smoker', kind: 'smoker', x: 2, y: 11, w: 1, h: 1, col: 'soft', door: _gdF({ x: 2, y: 12 }), act: 'smoker', needs: 'smoker', tall: 1.5, blurb: 'Fish go in. Hours later, something wonderful comes out.' },
  { id: 'jetty-post', name: 'Mooring post', x: 4, y: 12, w: 1, h: 1, walk: 0, col: 'none', tall: 1, blurb: 'A rope, a post and a very patient rowing boat.' },
  // the rowing boat is drawn by gardenWorldProps (key 'boat'); clicking it opens the trip to a friend's garden. x and w are fractions on
  // purpose: its box is the boat's own width, so the water beside it still casts a line.
  { id: 'boat', name: 'Rowing boat', kind: 'boat', x: 4.65, y: 13, w: 1.25, h: 1, walk: 0, col: 'none', door: _gdF({ x: 5, y: 12 }), act: 'sail', verb: 'climb in', tall: 0.5, blurb: 'Row over to a friend’s garden.' },
  { id: 'reed-bank', name: 'Reeds', kind: 'reeds', x: 22, y: 12, w: 3, h: 1, walk: 0, col: 'none', tall: 0.4, blurb: 'Dragonflies like it here.' },
  { id: 'forest-edge', name: 'The forest', x: 27, y: 0, w: 1, h: 11, walk: 0, blurb: 'Too thick to walk through.' },
]);
const GARDEN_LAWN = _gdF({ id: 'lawn', name: 'Lawn', lv: 1, tile: 'grass', cats: _gdF([]), icon: 'fence', blurb: 'Room for paths, seats and everything else.' });
const _GD_AREA = new Map(GARDEN_AREAS.map(a => [a.id, a]));

/* ---------- tools, bouquets, levels ---------- */
const GARDEN_TOOLS = _gdRows(([
  { id: 'can-2', name: 'Bigger watering can', kind: 'can', n: 4, price: 60, lv: 3, icon: 'droplet', blurb: 'Four more cans of water every day.' },
  { id: 'can-3', name: 'Copper watering can', kind: 'can', n: 4, price: 150, lv: 7, needs: 'can-2', icon: 'droplets', blurb: 'Four more again, and it shines.' },
  { id: 'can-4', name: 'Golden watering can', kind: 'can', n: 6, price: 400, lv: 12, needs: 'can-3', icon: 'droplets', blurb: 'The finest can there is: six more a day.' },
  { id: 'hose', name: 'Garden hose', kind: 'hose', price: 120, lv: 6, icon: 'waves', blurb: 'Water a whole row with one click.' },
  { id: 'golden-shears', name: 'Golden shears', kind: 'shears', price: 200, lv: 10, icon: 'scissors', blurb: 'Pruning finds a cutting twice as often.' },
  { id: 'fertiliser', name: 'Fertiliser', kind: 'consumable', price: 6, lv: 1, icon: 'flask-conical', blurb: 'A feed gives a plant half a day’s growth.' },
]).map(x => Object.assign({}, x, { price: _gdUp(x.price) })));
const _GD_TOOL = new Map(GARDEN_TOOLS.map(t => [t.id, t]));
/* Bouquets: the first style whose rule the chosen flowers meet (gardenBouquetOf). n = how many stems at least. */
const GARDEN_BOUQUETS = _gdRows([
  { id: 'rose-bouquet', name: 'Bouquet of roses', n: 5, rule: 'all:rose,frost-rose,sunrise-rose', bonus: 30 },
  { id: 'sunflower-bunch', name: 'Sunflower bunch', n: 3, rule: 'all:sunflower,golden-sunflower', bonus: 25 },
  { id: 'wildflower-posy', name: 'Wildflower posy', n: 3, rule: 'cat:wild', bonus: 12 },
  { id: 'winter-wreath', name: 'Winter wreath', n: 4, rule: 'has:holly', bonus: 28 },
  { id: 'pond-posy', name: 'Water garden posy', n: 3, rule: 'cat:water', bonus: 24 },
  { id: 'rainbow-bouquet', name: 'Rainbow bouquet', n: 6, rule: 'colours:5', bonus: 40 },
  { id: 'grand-bouquet', name: 'Grand bouquet', n: 9, rule: 'any', bonus: 35 },
  { id: 'hand-tied', name: 'Hand-tied bunch', n: 5, rule: 'any', bonus: 18 },
  { id: 'posy', name: 'Posy', n: 3, rule: 'any', bonus: 8 },
]);
const GARDEN_LEVEL_TITLES = _gdF(['Seedling', 'Sprout', 'Weekend gardener', 'Keen gardener', 'Green fingers', 'Allotment regular', 'Pond keeper',
  'Head gardener', 'Glasshouse keeper', 'Garden designer', 'Plantsperson', 'Meadow maker', 'Botanist', 'Master gardener', 'Garden legend']);
/* Level L needs 25 * L * (L - 1) XP in total: 2 at 50, 3 at 150, 5 at 500, 7 at 1,050, 9 at 1,800, 12 at 3,300. */
function gardenLevelOf(xp) {
  xp = Math.max(0, Math.floor(Number(xp) || 0));
  let lv = 1;
  while (lv < 99 && xp >= 25 * (lv + 1) * lv) lv++;
  const base = 25 * lv * (lv - 1), next = 25 * (lv + 1) * lv;
  const title = GARDEN_LEVEL_TITLES[Math.min(lv, GARDEN_LEVEL_TITLES.length) - 1] + (lv > GARDEN_LEVEL_TITLES.length ? ' ' + (lv - GARDEN_LEVEL_TITLES.length + 1) : '');
  return { level: lv, xp, into: xp - base, need: next - base, pct: (xp - base) / (next - base), title, next: next };
}

/* ---------- ribbons (the garden's achievements; facts from gardenFacts, 94-garden-1core.js) ---------- */
const GARDEN_RIBBONS = _gdRows([
  { id: 'first-sprout', label: 'First sprout', hint: 'Plant your first seed.', icon: 'sprout', fact: 'planted', of: 1, reward: { c: 15 } },
  { id: 'green-fingers', label: 'Green fingers', hint: 'Plant 25 seeds.', icon: 'hand', fact: 'planted', of: 25, reward: { c: 40, i: { 'seed:peony': 2 } } },
  { id: 'master-gardener', label: 'Master gardener', hint: 'Plant 150 seeds.', icon: 'crown', fact: 'planted', of: 150, reward: { c: 150, i: { 'seed:titan-arum': 1 } } },
  { id: 'first-harvest', label: 'First basket', hint: 'Harvest 10 times.', icon: 'shopping-basket', fact: 'harvests', of: 10, reward: { c: 25, i: { fertiliser: 3 } } },
  { id: 'harvest-festival', label: 'Harvest festival', hint: 'Harvest 100 times.', icon: 'wheat', fact: 'harvests', of: 100, reward: { c: 120, i: { 'decor:hay-bale': 1 } } },
  { id: 'florist', label: 'Florist', hint: 'Make a bouquet.', icon: 'flower', fact: 'bouquets', of: 1, reward: { c: 20 } },
  { id: 'flower-shop', label: 'Flower shop', hint: 'Make 15 bouquets.', icon: 'store', fact: 'bouquets', of: 15, reward: { c: 100, i: { 'seed:camellia': 2 } } },
  { id: 'botanist', label: 'Botanist', hint: 'Discover 25 plants.', icon: 'book-open', fact: 'plantsFound', of: 25, reward: { c: 60, i: { 'seed:orchid': 1 } } },
  { id: 'encyclopaedia', label: 'Walking encyclopaedia', hint: 'Discover 75 plants.', icon: 'library', fact: 'plantsFound', of: 75, reward: { c: 200 } },
  { id: 'wildlife-friendly', label: 'Wildlife friendly', hint: 'Spot 5 kinds of visitor.', icon: 'bird', fact: 'visitorsFound', of: 5, reward: { c: 40, i: { 'decor:bug-hotel': 1 } } },
  { id: 'nature-reserve', label: 'Nature reserve', hint: 'Spot 18 kinds of visitor.', icon: 'binoculars', fact: 'visitorsFound', of: 18, reward: { c: 150, i: { 'decor:hare-statue': 1 } } },
  { id: 'pond-life', label: 'Pond life', hint: 'Spot a frog, a dragonfly and a duck.', icon: 'waves', fact: 'pondLife', of: 3, reward: { c: 60, i: { 'seed:lotus': 1 } } },
  { id: 'night-garden', label: 'Night garden', hint: 'Spot 3 visitors that only come out at night.', icon: 'moon', fact: 'nightVisitors', of: 3, reward: { c: 50, i: { 'seed:glowcap': 2 } } },
  { id: 'four-seasons', label: 'Four seasons', hint: 'Tend your garden in all four seasons.', icon: 'calendar-range', fact: 'seasons', of: 4, reward: { c: 120, i: { 'seed:sakura': 1 } } },
  { id: 'decorator', label: 'Decorator', hint: 'Place 12 decorations.', icon: 'paintbrush', fact: 'decorPlaced', of: 12, reward: { c: 50, i: { 'decor:gazing-ball': 1 } } },
  { id: 'every-corner', label: 'Every corner', hint: 'Open every area of the garden.', icon: 'map', fact: 'areas', of: 8, reward: { c: 200, i: { 'decor:fountain': 1 } } },
  { id: 'daily-gardener', label: 'Daily gardener', hint: 'Finish 30 daily garden tasks.', icon: 'calendar-check', fact: 'dailyDone', of: 30, reward: { c: 80, i: { 'tool:golden-shears': 1 } } },
  { id: 'market-stall', label: 'Market stall', hint: 'Sell 50 things at the market.', icon: 'coins', fact: 'sold', of: 50, reward: { c: 60 } },
  { id: 'lucky', label: 'Lucky find', hint: 'Find a four-leaf clover.', icon: 'clover', fact: 'clover', of: 1, reward: { c: 77 } },
  // 2.22: fishing and bug catching (facts from gardenCatchFacts, 94-garden-fish-2core.js)
  { id: 'first-catch', label: 'First catch', hint: 'Land your first fish.', icon: 'fish', fact: 'fished', of: 1, reward: { c: 15, i: { 'bait:dough': 5 } } },
  { id: 'angler', label: 'Angler', hint: 'Catch 25 fish.', icon: 'fish', fact: 'fished', of: 25, reward: { c: 50, i: { 'bait:maggot': 5 } } },
  { id: 'fish-log-10', label: 'Fish log', hint: 'Catch 10 kinds of fish.', icon: 'book-open', fact: 'fishSpecies', of: 10, reward: { c: 70, i: { 'bait:glow-lure': 3 } } },
  { id: 'rare-catch', label: 'Rare catch', hint: 'Catch 3 rare fish.', icon: 'sparkles', fact: 'rareFish', of: 3, reward: { c: 90, i: { 'bait:golden-fly': 2 } } },
  { id: 'big-one', label: 'The big one', hint: 'Land a fish a metre long.', icon: 'ruler', fact: 'bigFish', of: 1, reward: { c: 80, i: { 'decor:trophy-board': 1 } } },
  { id: 'master-angler', label: 'Master angler', hint: 'Catch 28 kinds of fish. The golden rod is yours.', icon: 'crown', fact: 'fishSpecies', of: 28, reward: { c: 250, i: { 'gear:rod-5': 1 } } },
  { id: 'fish-log-60', label: 'Keen naturalist', hint: 'Catch 60 kinds of fish.', icon: 'book-open', fact: 'fishSpecies', of: 60, reward: { c: 150, i: { 'bait:golden-fly': 2 } } },
  { id: 'fish-log-120', label: 'Fish scholar', hint: 'Catch 120 kinds of fish.', icon: 'library', fact: 'fishSpecies', of: 120, reward: { c: 250, i: { 'bait:golden-fly': 3 } } },
  { id: 'fish-log-200', label: 'Keeper of the lake', hint: 'Catch 200 kinds of fish.', icon: 'crown', fact: 'fishSpecies', of: 200, reward: { c: 400, i: { 'bait:golden-fly': 5 } } },
  { id: 'rare-catch-30', label: 'Rare company', hint: 'Catch 30 kinds of rare fish.', icon: 'sparkles', fact: 'rareFish', of: 30, reward: { c: 200, i: { 'bait:glow-lure': 6 } } },
  { id: 'first-bug', label: 'First bug', hint: 'Net your first bug.', icon: 'bug', fact: 'netted', of: 1, reward: { c: 15, i: { 'decor:bug-case': 1 } } },
  { id: 'bug-catcher', label: 'Bug catcher', hint: 'Net 25 bugs.', icon: 'bug', fact: 'netted', of: 25, reward: { c: 50, i: { 'decor:bug-hotel': 1 } } },
  { id: 'butterfly-book', label: 'Bug book', hint: 'Net 12 kinds of bug.', icon: 'book-open', fact: 'bugSpecies', of: 12, reward: { c: 70, i: { 'seed:*rare': 1 } } },
  { id: 'entomologist', label: 'Entomologist', hint: 'Net 24 kinds of bug. The golden net is yours.', icon: 'crown', fact: 'bugSpecies', of: 24, reward: { c: 250, i: { 'gear:net-4': 1 } } },
  { id: 'bug-log-60', label: 'Bug spotter', hint: 'Net 60 kinds of bug.', icon: 'book-open', fact: 'bugSpecies', of: 60, reward: { c: 150, i: { 'seed:*rare': 1 } } },
  { id: 'bug-log-120', label: 'Bug scholar', hint: 'Net 120 kinds of bug.', icon: 'library', fact: 'bugSpecies', of: 120, reward: { c: 250, i: { 'seed:*rare': 2 } } },
  { id: 'bug-log-200', label: 'Keeper of the meadow', hint: 'Net 200 kinds of bug.', icon: 'crown', fact: 'bugSpecies', of: 200, reward: { c: 400, i: { 'seed:*rare': 3 } } },
  { id: 'market-trader', label: 'Market trader', hint: 'Fill 10 orders on the board.', icon: 'handshake', fact: 'ordersDone', of: 10, reward: { c: 80, i: { 'decor:fish-weathervane': 1 } } },
  { id: 'show-off', label: 'Show-off', hint: 'Put 6 catches in your showcase.', icon: 'trophy', fact: 'showcased', of: 6, reward: { c: 60 } },
  { id: 'fish-for-friends', label: 'Fish for friends', hint: 'Give 5 catches to friends.', icon: 'gift', fact: 'catchGifts', of: 5, reward: { c: 70, i: { 'bait:dough': 10 } } },
  // ── garden-social ── (2.18) gardens with friends: the facts come from gardenSocialFacts() (94-garden-social-1core.js)
  { id: 'garden-tourist', label: 'Garden tourist', hint: "Visit friends' gardens on 7 different days.", icon: 'footprints', fact: 'gardenVisits', of: 7, reward: { c: 40, i: { 'seed:sweet-pea': 2 } } },
  { id: 'good-neighbour', label: 'Good neighbour', hint: "Water 10 plants in friends' gardens.", icon: 'droplets', fact: 'friendWaters', of: 10, reward: { c: 50, i: { 'decor:old-watering-can': 1 } } },
  { id: 'kind-words', label: 'Kind words', hint: 'Sign 5 guestbooks.', icon: 'feather', fact: 'guestbookSigned', of: 5, reward: { c: 40, i: { 'decor:letterbox': 1 } } },
  { id: 'generous-gardener', label: 'Generous gardener', hint: "Leave 5 gifts in friends' gardens.", icon: 'gift', fact: 'giftsGiven', of: 5, reward: { c: 60, i: { 'seed:camellia': 1 } } },
  { id: 'much-loved', label: 'Much loved', hint: 'Get 10 hearts from friends for your garden.', icon: 'heart', fact: 'heartsReceived', of: 10, reward: { c: 77, i: { 'decor:wind-chimes': 1 } } },
  // ── end garden-social ──
]);

/* ---------- daily garden tasks and weekly garden quests ----------
   Picked the same on every device from the day (or the week) and the garden level; progress is worked out from what
   happened (94-garden-1core.js gardenDailyTasks). Done ones pay out once: their key is the day and the task id. */
const GARDEN_DAILY = _gdRows([
  { id: 'water-3', label: 'Water {n} plants', n: 3, fact: 'watered', c: 10, x: 10, icon: 'droplet' },
  { id: 'water-5', label: 'Water {n} plants', n: 5, fact: 'watered', c: 14, x: 12, icon: 'droplets', lv: 3 },
  { id: 'harvest-1', label: 'Harvest something', n: 1, fact: 'harvests', c: 12, x: 10, icon: 'shopping-basket' },
  { id: 'harvest-3', label: 'Harvest {n} times', n: 3, fact: 'harvests', c: 18, x: 14, icon: 'shopping-basket', lv: 4 },
  { id: 'plant-1', label: 'Plant a seed', n: 1, fact: 'planted', c: 10, x: 8, icon: 'sprout' },
  { id: 'plant-3', label: 'Plant {n} seeds', n: 3, fact: 'planted', c: 15, x: 12, icon: 'sprout', lv: 2 },
  { id: 'tasks-2', label: 'Finish {n} tasks', n: 2, fact: 'tasks', c: 15, x: 12, icon: 'circle-check', i: { 'seed:*': 1 } },
  { id: 'tasks-4', label: 'Finish {n} tasks', n: 4, fact: 'tasks', c: 22, x: 16, icon: 'list-checks', lv: 3 },
  { id: 'focus-25', label: 'Focus for {n} minutes', n: 25, fact: 'focusMin', c: 15, x: 12, icon: 'timer' },
  { id: 'feed-1', label: 'Feed a plant', n: 1, fact: 'fed', c: 8, x: 8, icon: 'flask-conical', lv: 2 },
  { id: 'prune-1', label: 'Give a plant a trim', n: 1, fact: 'pruned', c: 8, x: 8, icon: 'scissors', lv: 3 },
  { id: 'visitor-1', label: 'Spot a visitor', n: 1, fact: 'visitors', c: 8, x: 8, icon: 'bird' },
  { id: 'decorate-1', label: 'Place or move a decoration', n: 1, fact: 'decorated', c: 8, x: 6, icon: 'armchair', lv: 2 },
  { id: 'bouquet-1', label: 'Make a bouquet', n: 1, fact: 'bouquets', c: 15, x: 12, icon: 'flower', lv: 4 },
  { id: 'sell-3', label: 'Sell {n} things at the market', n: 3, fact: 'sold', c: 10, x: 8, icon: 'coins', lv: 3 },
  { id: 'fish-1', label: 'Catch a fish', n: 1, fact: 'fished', c: 10, x: 8, icon: 'fish' },
  { id: 'fish-3', label: 'Catch {n} fish', n: 3, fact: 'fished', c: 16, x: 12, icon: 'fish', lv: 3 },
  { id: 'bug-1', label: 'Net a bug', n: 1, fact: 'netted', c: 10, x: 8, icon: 'bug' },
  { id: 'bug-3', label: 'Net {n} bugs', n: 3, fact: 'netted', c: 16, x: 12, icon: 'bug', lv: 3 },
]);
const GARDEN_QUESTS = _gdRows([
  // 2.23: a task for the time of year (always offered that season, one a week, paid once a week like the others)
  { id: 'qs-spring', season: 'spring', label: 'Spring: plant {n} seeds', n: 6, fact: 'planted', c: 40, x: 30, icon: 'sprout', i: { fertiliser: 1 } },
  { id: 'qs-summer', season: 'summer', label: 'Summer: water on {n} days', n: 4, fact: 'waterDays', c: 40, x: 30, icon: 'droplets', i: { fertiliser: 1 } },
  { id: 'qs-autumn', season: 'autumn', label: 'Autumn: bring in {n} harvests', n: 8, fact: 'harvests', c: 40, x: 30, icon: 'shopping-basket', i: { fertiliser: 1 } },
  { id: 'qs-winter', season: 'winter', label: 'Winter: trim back {n} plants', n: 3, fact: 'pruned', c: 40, x: 30, icon: 'scissors', i: { fertiliser: 1 } },
  { id: 'q-harvest-15', label: 'Harvest {n} times this week', n: 15, fact: 'harvests', c: 70, x: 50, icon: 'shopping-basket', i: { 'seed:*rare': 1 } },
  { id: 'q-plant-10', label: 'Plant {n} seeds this week', n: 10, fact: 'planted', c: 60, x: 45, icon: 'sprout', i: { fertiliser: 3 } },
  { id: 'q-visitors-4', label: 'Spot {n} kinds of visitor this week', n: 4, fact: 'visitorKinds', c: 60, x: 45, icon: 'binoculars', i: { 'seed:*rare': 1 } },
  { id: 'q-bouquets-2', label: 'Make {n} bouquets this week', n: 2, fact: 'bouquets', c: 60, x: 45, icon: 'flower', lv: 4 },
  { id: 'q-tasks-15', label: 'Finish {n} tasks this week', n: 15, fact: 'tasks', c: 80, x: 50, icon: 'list-checks', i: { 'seed:*rare': 1 } },
  { id: 'q-focus-180', label: 'Focus for {n} minutes this week', n: 180, fact: 'focusMin', c: 70, x: 50, icon: 'timer' },
  { id: 'q-water-days-5', label: 'Water the garden on {n} days', n: 5, fact: 'waterDays', c: 60, x: 45, icon: 'droplets' },
  { id: 'q-sell-20', label: 'Sell {n} things at the market', n: 20, fact: 'sold', c: 50, x: 40, icon: 'coins', lv: 3 },
  { id: 'q-daily-10', label: 'Finish {n} daily garden tasks', n: 10, fact: 'dailyDone', c: 70, x: 50, icon: 'calendar-check', i: { 'seed:*rare': 1 } },
  { id: 'q-fish-12', label: 'Catch {n} fish this week', n: 12, fact: 'fished', c: 60, x: 45, icon: 'fish', i: { 'bait:maggot': 5 } },
  { id: 'q-bug-10', label: 'Net {n} bugs this week', n: 10, fact: 'netted', c: 60, x: 45, icon: 'bug', i: { 'bait:dough': 5 } },
]);

/* ---------- seasonal garden events (month-day windows; Trick or treat matches agent fun's FUN_EVENTS) ---------- */
const GARDEN_EVENTS = _gdRows([
  { id: 'halloween', label: 'Trick or treat', from: '10-15', to: '11-05', icon: 'moon', blurb: 'Lantern pumpkins and jack-o’-lanterns: the garden glows after dark.' },
  { id: 'harvest-home', label: 'Harvest home', from: '09-15', to: '10-14', icon: 'wheat', blurb: 'Market prices are up a fifth, and hay bales are in the shop.' },
  { id: 'winter-lights', label: 'Winter lights', from: '12-01', to: '01-06', icon: 'sparkles', blurb: 'Frost roses and festive lights for the darkest weeks.' },
  { id: 'spring-bloom', label: 'Spring bloom', from: '03-20', to: '04-30', icon: 'flower-2', blurb: 'Cherry blossom seeds and painted eggs in the shop.' },
  { id: 'midsummer', label: 'Midsummer', from: '06-14', to: '06-28', icon: 'sun', blurb: 'Long days: plants grow a quarter faster.' },
]);

/* ---------- lookups ---------- */
function gardenPlant(id) { return _GD_PLANT.get(String(id)) || null; }
function gardenDecor(id) { return _GD_DECOR.get(String(id)) || null; }
function gardenVisitor(id) { return _GD_VISITOR.get(String(id)) || null; }
function gardenTile(id) { return _GD_TILE.get(String(id)) || null; }
function gardenArea(id) { return id === 'lawn' ? GARDEN_LAWN : (_GD_AREA.get(String(id)) || null); }
function gardenTool(id) { return _GD_TOOL.get(String(id)) || null; }
/** Any catalogue entry by id, with its kind ('plant' | 'decor' | 'visitor' | 'tile' | 'area' | 'tool'). */
function gardenDef(id) {
  const p = gardenPlant(id); if (p) return { kind: 'plant', def: p };
  const d = gardenDecor(id); if (d) return { kind: 'decor', def: d };
  const v = gardenVisitor(id); if (v) return { kind: 'visitor', def: v };
  const t = gardenTool(id); if (t) return { kind: 'tool', def: t };
  const a = gardenArea(id); if (a) return { kind: 'area', def: a };
  const g = gardenTile(id); if (g) return { kind: 'tile', def: g };
  return null;
}

/* ---------- small pure helpers ---------- */
function gardenHash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** A seeded random number generator (mulberry32): the same seed gives the same numbers on every device. */
function gardenRand(seed) {
  let a = (typeof seed === 'number' ? seed : gardenHash(seed)) >>> 0;
  return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const _GD_SOUTH_ZONES = /^(Australia\/|Pacific\/(Auckland|Chatham|Fiji|Tongatapu)|America\/(Argentina|Sao_Paulo|Santiago|Montevideo|Asuncion|La_Paz|Lima)|Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Maseru|Mbabane)|Antarctica\/)/;
/** Is this time zone south of the equator (the seasons swap)? */
function gardenSouthern(zone) { return _GD_SOUTH_ZONES.test(String(zone || '')); }
/** The season of an ISO day: meteorological (spring Mar-May...), swapped in the southern hemisphere. */
function gardenSeasonOf(iso, south) {
  const m = Number(String(iso || '').slice(5, 7)) || 1;
  const s = m >= 3 && m <= 5 ? 0 : m >= 6 && m <= 8 ? 1 : m >= 9 && m <= 11 ? 2 : 3;
  return GARDEN_SEASONS[south ? (s + 2) % 4 : s];
}
/** The garden events running on a day (ids). */
function gardenEventsOn(iso) {
  const md = String(iso || '').slice(5, 10);
  return GARDEN_EVENTS.filter(e => (e.from <= e.to ? md >= e.from && md <= e.to : md >= e.from || md <= e.to)).map(e => e.id);
}
function gardenInSeason(def, season) { return !!def && Array.isArray(def.seasons) && def.seasons.includes(season); }
/** The stage (0..4) a plant reaches after `hours` of effective growth. */
function gardenStageAt(def, hours) {
  const g = GARDEN_GROW[(def && def.grow) || 'medium'] || GARDEN_GROW.medium;
  let s = 0; for (let i = 0; i < 4; i++) if (hours >= g[i]) s = i + 1;
  return s;
}
/** Hours of effective growth a plant needs to reach a stage. */
function gardenHoursFor(def, stage) {
  const g = GARDEN_GROW[(def && def.grow) || 'medium'] || GARDEN_GROW.medium;
  return stage <= 0 ? 0 : g[Math.min(4, stage) - 1];
}
function gardenStageName(def, stage) {
  const c = GARDEN_CATS[(def && def.cat) || 'flower'] || GARDEN_CATS.flower;
  if (def && def.yield && stage >= 4 && (def.cat === 'tree' || def.cat === 'fruit')) return 'Ready to pick';
  return c.stages[Math.max(0, Math.min(4, stage | 0))];
}
/**
 * Why something cannot be bought or used now ('' = it can). ctx {level, season, events: [ids], ach: Set|[] of
 * achievement ids, ribbons: Set|[] of ribbon ids}. `find` items are never sold: they say how they are found.
 */
function gardenLockOf(def, ctx) {
  if (!def) return 'Unknown';
  ctx = ctx || {};
  const has = (s, id) => !!s && (s instanceof Set ? s.has(id) : Array.isArray(s) ? s.includes(id) : !!s[id]);
  const u = def.unlock || null;
  if (u && u.find) return def.special === 'heart' ? 'Grows from your garden’s history' : 'Found, not sold';
  if (u && u.ach && !has(ctx.ach, u.ach)) return 'Earn an achievement';
  if (u && u.ribbon && !has(ctx.ribbons, u.ribbon)) { const r = GARDEN_RIBBONS.find(x => x.id === u.ribbon); return 'Ribbon: ' + (r ? r.label : u.ribbon); }
  if (u && u.event && !(ctx.events || []).includes(u.event)) { const e = GARDEN_EVENTS.find(x => x.id === u.event); return 'Event: ' + (e ? e.label : u.event); }
  if (u && u.season && ctx.season !== u.season) return GARDEN_SEASON_LABEL[u.season] + ' only';
  if ((def.lv || 1) > (ctx.level || 1)) return 'Garden level ' + def.lv;
  return '';
}
/** The area a cell belongs to ('lawn' when no area claims it, or the area is not open yet at that level). */
function gardenAreaAt(x, y, level) {
  for (const a of GARDEN_AREAS) if (x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h) {
    // a plot is sections and trails now (94-garden-lands-0table.js), unless you bought it whole, when it answers as it always did. An open trail is lawn to everything else: you walk on it, nothing grows on it.
    if (a.buy && !_GD_LAND.has(a.id) && typeof gardenLandCell === 'function') { const c = gardenLandCell(x, y); if (c) return level == null || _GD_LAND.has(c.id) ? (c.plot ? c.id : 'lawn') : 'locked:' + c.id; }
    return level == null || (a.buy ? _GD_LAND.has(a.id) : (level || 1) >= a.lv) ? a.id : 'locked:' + a.id;
  }
  return 'lawn';
}
/** Is this cell open water (the pond's or the lake's)? A pier stands over water but is not water to walk on. */
function gardenIsWater(x, y) {
  if (typeof gardenLandWaterAt === 'function') { const q = gardenLandWaterAt(x, y); if (q !== null) return q && !gardenPropWalk(x, y); }
  for (const a of GARDEN_AREAS) { const w = a.water; if (w && x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h) return !gardenPropWalk(x, y); }
  return false;
}
/** Which water a cell is: '' (not water), 'pond', or the lake's depth: 'shallow', 'mid', 'deep' (by rows from the shore). */
function gardenWaterZone(x, y) {
  if (typeof gardenLandWaterAt === 'function') { const q = gardenLandWaterAt(x, y); if (q !== null) return q ? 'pond' : ''; }
  for (const a of GARDEN_AREAS) {
    const w = a.water; if (!w || x < w.x || x >= w.x + w.w || y < w.y || y >= w.y + w.h) continue;
    if (!a.fishing) return 'pond';
    const d = y - w.y;
    return d <= 1 ? 'shallow' : d <= 3 ? 'mid' : 'deep';
  }
  return '';
}
/** The fixed prop covering a cell (the pier, the tackle shop...), or null. */
function gardenPropAt(x, y) {
  if (typeof gardenLandPropAt === 'function') { const q = gardenLandPropAt(x, y); if (q) return q; }
  for (const p of GARDEN_PROPS) if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h && (!p.needs || _GD_WORKS.has(p.needs))) return p;
  return null;
}
/** What a prop does to your feet: 'full', 'soft' or 'none' (see the table). */
function gardenPropCol(p) { return !p ? 'none' : p.col === 'none' || p.col === 'soft' || p.col === 'full' ? p.col : p.walk ? 'none' : 'full'; }
/** Walkable prop cell (the pier boards)? */
function gardenPropWalk(x, y) { const p = gardenPropAt(x, y); return !!(p && p.walk); }
/** Can this plant (or decoration) go at x, y (its top-left cell) at this level? '' = yes, else why not (one short line). */
function gardenCellOk(def, x, y, level, kind) {
  const W = GARDEN_WORLD;
  const fw = kind === 'decor' ? def.w || 1 : def.fp || 1, fh = kind === 'decor' ? def.h || 1 : def.fp || 1;
  if (x < 0 || y < 0 || x + fw > W.cols || y + fh > W.rows) return 'Off the edge of the garden';
  for (let dy = 0; dy < fh; dy++) for (let dx = 0; dx < fw; dx++) { const pr = gardenPropAt(x + dx, y + dy); if (pr) return `${pr.name} is there`; }
  let area = null;
  for (let dy = 0; dy < fh; dy++) for (let dx = 0; dx < fw; dx++) {
    const a = gardenAreaAt(x + dx, y + dy, level);
    if (a.startsWith('locked:')) { const ar = gardenArea(a.slice(7)); return ar.buy ? `${ar.name}: buy this land first` : `${ar.name} opens at garden level ${ar.lv}`; }
    if (typeof gardenLandPathAt === 'function' && gardenLandPathAt(x + dx, y + dy) && !(kind === 'decor' && def.layer === 'ground')) return kind === 'decor' ? 'Keep the path clear' : 'That is a path: plants go in the beds';
    if (kind !== 'decor') {
      if (area && a !== area) return 'Straddles two areas';
      area = a;
      const water = gardenIsWater(x + dx, y + dy);
      if (def.cat === 'water' && !water) return 'Pond plants grow in the water';
      if (def.cat !== 'water' && water) return 'Only pond plants grow in the water';
    } else if (gardenIsWater(x + dx, y + dy) && !(def.id === 'boardwalk')) return 'Not in the water (a boardwalk can go there)';
  }
  if (kind === 'decor') { if (def.areas && !def.areas.includes(area)) return 'Not here'; return ''; }
  const ar = gardenArea(area);
  const landCell = typeof gardenLandCell === 'function' && ar && ar.buy && !ar.plot ? gardenLandCell(x, y) : null;   // (a plot you own whole also grows what its sections do)
  const ok = def.areas ? def.areas.includes(area) : ar && (ar.cats.includes(def.cat) || !!(landCell && landCell.plot && landCell.cats.includes(def.cat)));
  if (!ok) {
    const where = (def.areas || (GARDEN_CATS[def.cat] || {}).areas || []).map(id => gardenArea(id)).filter(Boolean).map(a2 => a2.name.toLowerCase());
    return area === 'lawn' ? 'Plants grow in the beds, not the lawn' : `${def.name} grows in the ${where.slice(0, 2).join(' or ')}`;
  }
  return '';
}
/** The daily garden tasks for a day: 3, the same on every device (the level only widens the pool). */
function gardenPickDaily(iso, level) {
  const pool = GARDEN_DAILY.filter(t => (t.lv || 1) <= (level || 1));
  const rnd = gardenRand('gd-daily|' + iso), out = [], fams = new Set();
  const left = pool.slice();
  while (out.length < 3 && left.length) {
    const t = left.splice(Math.floor(rnd() * left.length), 1)[0];
    const fam = t.fact; if (fams.has(fam)) continue;
    fams.add(fam); out.push(t);
  }
  return out;
}
/** The weekly garden quests for the week starting weekFrom: 3, the same on every device. */
function gardenPickQuests(weekFrom, level) {
  const pool = GARDEN_QUESTS.filter(t => !t.season && (t.lv || 1) <= (level || 1));
  const rnd = gardenRand('gd-quest|' + weekFrom), left = pool.slice(), out = [];
  while (out.length < 3 && left.length) out.push(left.splice(Math.floor(rnd() * left.length), 1)[0]);
  return out;
}
/** The bouquet a set of stems makes: flowers [{id, variant}] -> a GARDEN_BOUQUETS row (or null under 3 stems). */
function gardenBouquetOf(flowers) {
  const list = (flowers || []).filter(f => f && gardenPlant(f.id));
  if (list.length < 3) return null;
  for (const b of GARDEN_BOUQUETS) {
    if (list.length < b.n) continue;
    const [k, arg] = b.rule.split(':');
    const ids = list.map(f => f.id);
    if (k === 'any') return b;
    if (k === 'all' && ids.every(id => arg.split(',').includes(id))) return b;
    if (k === 'has' && ids.some(id => arg.split(',').includes(id))) return b;
    if (k === 'cat' && ids.every(id => gardenPlant(id).cat === arg)) return b;
    if (k === 'colours') { const cols = new Set(list.map(f => { const p = gardenPlant(f.id); return (p.look.v && p.look.v[f.variant | 0]) || p.look.c; })); if (cols.size >= Number(arg)) return b; }
  }
  return null;
}

/* ---------- the art contract ---------- */
const GARDEN_ART = _gdF({
  unit: 64,
  kinds: _gdF(['plant', 'decor', 'visitor', 'tile', 'crop', 'seed', 'tool', 'bouquet']),
  classes: _gdF(['gda-sway', 'gda-flutter', 'gda-glow', 'gda-ripple', 'gda-flicker', 'gda-spin', 'gda-bob', 'gda-blink']),
  sizes: _gdF(['s', 'm', 'l']),
  tods: _gdF(['dawn', 'day', 'dusk', 'night']),
});
/**
 * The box an art fragment is drawn in, in art units (anchor at the bottom centre): {x, y, w, h} for a viewBox.
 * Plants: the footprint's width and look.h cells of height (+ a margin); decorations: their footprint and look.h;
 * visitors, crops, seeds, tools and bouquets: one unit cell; tiles: one cell seen from above (64 x 40).
 */
function gardenArtBox(kind, id) {
  const U = 64;
  if (kind === 'plant') { const p = gardenPlant(id), fp = (p && p.fp) || 1, h = Math.max(0.5, (p && p.look.h) || 0.7); return { x: -U / 2 * fp - 6, y: -U * h - 14, w: U * fp + 12, h: U * h + 22 }; }
  // integrate 2.18 (agent garden-art's note): a flat decoration fills its footprint's depth (40 art units a row, like the
  // tiles), so a 2 x 2 pond reaches about -72; the box is at least that tall or the shop's icon cuts its far edge off
  if (kind === 'decor') { const d = gardenDecor(id), w = (d && d.w) || 1, fh = (d && d.h) || 1, up = Math.max(U * Math.max(0.45, (d && d.look.h) || 0.6), 40 * fh - 4); return { x: -U / 2 * w - 6, y: -up - 16, w: U * w + 12, h: up + 24 }; }
  if (kind === 'tile') return { x: -U / 2, y: -40, w: U, h: 40 };
  return { x: -U / 2, y: -U + 4, w: U, h: U };
}

/* ---------- snapshots (what a friend may see of your garden; agent 'garden-social' sends them) ----------
   {v, lv, season, areas: [open area ids], plants: [[id, x, y, stage, variant, flags]], decor: [[id, x, y, r, variant]],
    heart: 0..6 (the old oak's size), at}. flags: 1 thirsty, 2 overgrown, 4 ripe. Ids only from these tables, numbers
   only within bounds: no names, no text, no times beyond `at`. gardenSnapshotClean drops anything else. */
const GARDEN_SNAPSHOT_MAX = _gdF({ plants: 400, decor: 300, bytes: 24000 });
function gardenSnapshotClean(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const W = GARDEN_WORLD, int = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
  const out = { v: 1, cv: int(raw.cv, 0, 9) || 0, lv: int(raw.lv, 1, 99) || 1, season: GARDEN_SEASONS.includes(raw.season) ? raw.season : 'summer', areas: [], plants: [], decor: [], heart: int(raw.heart, 0, 6) || 0, at: int(raw.at, 0, 8.64e15) || 0 };
  { const wx = int(raw.wx, 1, 2); if (wx) out.wx = wx; }   // 2.28: their rain (1) or snow (2) now
  { const tz = int(raw.tz, -840, 840), sr = int(raw.sr, 0, 1439), ss = int(raw.ss, 0, 1439); if (tz !== null) { out.tz = tz; if (sr !== null && ss !== null) { out.sr = sr; out.ss = ss; } } }   // 2.28: their time zone, so a visit has their light
  if (Array.isArray(raw.areas)) for (const a of raw.areas.slice(0, 12)) if (_GD_AREA.has(a) && !out.areas.includes(a)) out.areas.push(a);
  if (Array.isArray(raw.wk)) out.wk = raw.wk.slice(0, 12).filter(x => typeof x === 'string' && /^[a-z0-9-]{1,32}$/.test(x));   // 2.38: what they have built for the lake (ids; one this version does not know is ignored)
  if (Array.isArray(raw.tk)) out.tk = raw.tk.slice(0, 24).filter(x => typeof x === 'string' && /^[a-z0-9-]{1,32}$/.test(x));   // 2.23: ids of tricks; the page ignores any it does not know
  if (Array.isArray(raw.plants)) for (const p of raw.plants.slice(0, GARDEN_SNAPSHOT_MAX.plants)) {
    if (!Array.isArray(p) || !_GD_PLANT.has(p[0])) continue;
    const x = int(p[1], 0, W.cols - 1), y = int(p[2], 0, W.rows - 1);
    if (x === null || y === null) continue;
    out.plants.push([p[0], x, y, int(p[3], 0, 4) || 0, int(p[4], 0, 7) || 0, int(p[5], 0, 15) || 0]);
  }
  if (Array.isArray(raw.decor)) for (const d of raw.decor.slice(0, GARDEN_SNAPSHOT_MAX.decor)) {
    if (!Array.isArray(d) || !_GD_DECOR.has(d[0])) continue;
    const x = int(d[1], 0, W.cols - 1), y = int(d[2], 0, W.rows - 1);
    if (x === null || y === null) continue;
    out.decor.push([d[0], x, y, int(d[3], 0, 3) || 0, int(d[4], 0, 7) || 0]);
  }
  // 2.22: the showcase (the tank and the bug case): ids from the fish and bug tables, sizes in bounds (94-garden-fish-0catalog.js)
  if (typeof gardenLandsClean === 'function') gardenLandsClean(raw, out);   // the sections and features they have (94-garden-lands-0table.js); an older app drops these
  if (raw.sh && typeof gardenShowClean === 'function') { const sh = gardenShowClean(raw.sh); if (sh) out.sh = sh; }
  if (raw.sp && typeof gardenSpecClean === 'function') { const sp = gardenSpecClean(raw.sp); if (sp) out.sp = sp; }   // their best specimens (94-garden-fish-0variants.js)
  if (raw.ca && typeof gardenCatchWireClean === 'function') { const ca = gardenCatchWireClean(raw.ca); if (ca) out.ca = ca; }   // the lake: what it shows to friends
  return out;
}

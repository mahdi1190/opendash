/* ============================================================
   GARDEN, the land (the tables). The owner, 1 Nov 2026: "all of the purchasable land is WAY TOO BIG ... split into way more paths and sections that go up and down not just across". Then:
   "apply it not to the new bits of garden but already existing garden bits too ... the main bit is the center of the world, expand in all directions". PURE: tables and small functions,
   nothing drawn at load and no DOM or state, so Node can evaluate it after the catalogue (lib/friends/garden.mjs, lib/agent-engine.mjs). In plain words: docs/dev/GARDEN_PLAN.md.

   THE WORLD is one map, one character a cell, in regions (GARDEN_LAND_MAPS). The old garden is the middle (x 12-39, y 8-18), with the lane running right through the world under it (y 19-20)
   and the lake below (x 12-39, y 21-37). North is the hill, east the old orchard, west the kitchen fields, and south, round the lake on both sides, the marsh.
     a digit or sign     a trail: a path that opens with your level. You walk on it; nothing grows on it
     a letter            a section: a small piece of land, free at its level in the old garden (buy: 0), bought with coins everywhere else
     #                   thicket, rock or reeds: nobody walks there; trees stand in it (gardenLandTrees)
     GARDEN_LAND_KINDS     the kinds of land: {tile, cats (what grows), grow (growth x), always (always in season), pool (it is water), green (mown grass: things stand on it, nothing grows)}
     GARDEN_LAND_TRAILS    {id, ch, name, lv, from: the trail it leads on from ('' = the lane)}
     GARDEN_LAND_SECTIONS  {id, region, plot, ch, name, kind, lv, buy, via: the trail its door is on ('' = the lane), fam: the old area it counts as (a plant that only grows in the meadow), cells, x, y, w, h}
     GARDEN_LAND_FEATURES  things you build in a section: {id, name, sec, x, y, w, h, door, lv, cost, does, ...}; the engine: 94-garden-lands-1core.js
     GARDEN_LAND_CURIOS, GARDEN_LAND_SKY    what you can collect
   Check any change to a map with a throwaway script before it ships: every row the right width, every section in one piece and touching its `via`, every trail in one piece and touching its `from`.

   Ids are stable, like every id in the garden. GARDEN_WORLD.v says which world a save or a snapshot is in: 94-garden-lands-1core.js moves an old save over once, and a snapshot from another world is not drawn.
   FRIENDS. `areas` in a snapshot stays at most 12 ids of GARDEN_AREAS. The land goes beside it, in `ls` (sections you bought), `lf` (features built), `lc` (curios found, and the old key), `lz` (stars logged),
   `lr` (garden stars) and `wv` (the world). THE OWNER'S RULE: whatever you buy or find shows in the world, and a friend sees it. So everything here has a drawing (94-garden-lands-2art.js); nothing is only a number.
   ============================================================ */
const GARDEN_LAND_KINDS = _gdF({
  bed: _gdF({ name: 'Flower bed', tile: 'soil', icon: 'flower-2', edge: 'stone', cats: _gdF(['flower', 'wild', 'herb', 'fruit', 'tree', 'succulent']) }),
  patch: _gdF({ name: 'Veg patch', tile: 'tilled', icon: 'carrot', edge: 'log', cats: _gdF(['veg', 'herb', 'fruit']) }),
  green: _gdF({ name: 'The green', tile: 'grass', icon: 'fence', green: 1, cats: _gdF([]), says: 'Mown grass, for seats and everything else.' }),
  pondedge: _gdF({ name: 'The pond', tile: 'pond-edge', icon: 'waves', cats: _gdF(['water', 'flower', 'wild', 'tree']) }),
  glass: _gdF({ name: 'Greenhouse', tile: 'glasshouse', icon: 'warehouse', always: 1, cats: _gdF(['exotic', 'succulent', 'veg', 'flower', 'herb', 'fruit', 'tree']), says: 'Always summer inside.' }),
  meadow: _gdF({ name: 'Meadow', tile: 'long-grass', icon: 'flower', cats: _gdF(['wild', 'flower', 'tree', 'herb']) }),
  dell: _gdF({ name: 'Shady dell', tile: 'forest', icon: 'leaf', cats: _gdF(['flower', 'wild', 'herb']) }),
  herb: _gdF({ name: 'Herb terrace', tile: 'soil', icon: 'leaf', cats: _gdF(['herb', 'flower', 'succulent']) }),
  rock: _gdF({ name: 'Rock garden', tile: 'sand', icon: 'mountain', cats: _gdF(['succulent', 'herb', 'wild']) }),
  berry: _gdF({ name: 'Fruit bed', tile: 'soil', icon: 'cherry', cats: _gdF(['fruit', 'herb', 'flower']) }),
  orchard: _gdF({ name: 'Orchard row', tile: 'orchard-grass', icon: 'trees', cats: _gdF(['tree', 'fruit', 'wild', 'flower']) }),
  wood: _gdF({ name: 'Little wood', tile: 'forest', icon: 'trees', cats: _gdF(['tree', 'wild', 'herb', 'fruit']) }),
  veg: _gdF({ name: 'Veg plot', tile: 'tilled', icon: 'carrot', cats: _gdF(['veg', 'herb', 'fruit']) }),
  rich: _gdF({ name: 'Rich black soil', tile: 'tilled', icon: 'carrot', grow: 1.15, cats: _gdF(['veg', 'fruit', 'herb']), says: 'Things grow a little faster here.' }),
  nursery: _gdF({ name: 'Tree nursery', tile: 'orchard-grass', icon: 'trees', grow: 1.3, cats: _gdF(['tree', 'fruit']), says: 'Trees and fruit grow much faster here.' }),
  suntrap: _gdF({ name: 'Sun trap', tile: 'glasshouse', icon: 'sparkles', always: 1, cats: _gdF(['flower', 'veg', 'herb', 'fruit', 'succulent', 'exotic']), says: 'Always in season, like the greenhouse.' }),
  reed: _gdF({ name: 'Reedy bank', tile: 'pond-edge', icon: 'waves', cats: _gdF(['flower', 'wild', 'tree']) }),
  pool: _gdF({ name: 'Pool', tile: 'pond-water', icon: 'waves', pool: 1, cats: _gdF(['water']), says: 'Open water: pond plants only.' }),
  exotic: _gdF({ name: 'Warm glade', tile: 'wild-ground', icon: 'sparkles', always: 1, cats: _gdF(['exotic', 'succulent', 'flower']), says: 'Exotics grow out of doors here.' }),
});
/* The regions. plot: the old plot's id, for what the older parts of the app call it. theme: how its thickets are drawn. */
const GARDEN_LAND_MAPS = _gdF({
  core: _gdF({ x: 12, y: 8, plot: 'core', theme: 'shrub', rows: _gdF([
    'AAAAA#BBBB,,CCC0DDDDD#PPPPPP',
    'AAAAAABBB,,CCCC0DDDDDDPPPPPP',
    'GGGGA,,,,,IIII00EEEEEEPPPPPP',
    'GGGG,,KKKKIII00LLLLLLLPPPPPP',
    'MMM55KKKKKK0000_____LLL___QQ',
    'MMM5OOOOOOO0TTTTTTT_______QQ',
    'RR55OOOOOOO0TTTTTTT_WW#HHHHQ',
    'RR5UUUUUUU00VVVV____WW#HHHHQ',
    '555UUUUUU00XXXXX_YYYYYYHHHHZ',
    'aa5bbbbb000XXXXX_YYYYccccZZZ',
    'aa5bbbbbb0ddddee_ffffccccZZZ']) }),
  north: _gdF({ x: 12, y: 0, plot: 'hill', wild: 1, theme: 'rock', rows: _gdF([
    'AAAAAAAA#CCCCCCCC#DDDDDDD###',
    'AAAA33333CC3333CC#3333DDD###',
    'BBBB3EEE3333FF33333GG333####',
    'BBBB222EEEFFFFGGGGGGGGG34444',
    'BBBHHH2222FFFF########KKKKKK',
    'BBBHIIIII21111MMMMMMM#KKKKKK',
    'HHHHIIII#LLLL111JJJJJ#######',
    'HHHHIIII#LLNNNN1OOOOO#######']) }),
  east: _gdF({ x: 40, y: 0, plot: 'grove', wild: 1, theme: 'oak', rows: _gdF([
    '############', '############', '############',
    '44444888####', 'PPPPPP88RRRR', 'QQQQQQ8RRRRR', 'QQQ8888SSSSS', 'TTT8UUUUSSSS', 'TTT777UUUVVV',
    'WWWWW7VVVVVV', 'WWWW77YYYVVV', 'ZZZZ7YYY#XXX', 'ZZZ66##999XX', 'aaa6bbbbb9XX', 'aa66eebbb9XX', 'aa6eeeee99cc', 'dd66eeeff9cc', 'ddd6hhhff9gg', 'ddd6hhhff9gg']) }),
  west: _gdF({ x: 0, y: 0, plot: 'field', wild: 1, theme: 'hedge', rows: _gdF([
    '###bbb%ccddd', 'bbbbb%%cccdd', 'bbbbb%cccddd', '##&&&&&&&&##',
    'MMMMMMMM#&zz', 'MMMMMMMM&&zz', 'MMMMMMMM&zzz', 'MMMMMMMM&&yy', 'MMMMMMMM#&yy', 'xxxxxvvv&&yy', 'xxxxxvvv&yyy',
    'rrrr*****uuu', 'rrrrr*uuuuuu', 'qqqqq+ssssss', 'qq++++ooooss', 'mm+oooooon##', 'mm++nnnnnnll', 'jjj+kkkkkkll', 'jjj+kkkkkkll']) }),
  swest: _gdF({ x: 0, y: 21, plot: 'marsh', wild: 1, theme: 'reed', rows: _gdF([
    'aaaappppp=bb', 'aaaappppp==b', 'hhhhttttt#=b', 'hhhh=======b', 'kkkkkkk#=ddd', 'kkkkk##==ddd', 'ffffff==#eee', 'ffffff=#eeee', 'gggggg====ee',
    'gggg##iii=jj', 'llll##iii=jj', 'llll======jj', 'llnnnnn=mmmm', '##nnnn==mmmm', 'qqqqqq=ooo##', 'qqqqq==ooo##', 'qqqqq=rrrrr#']) }),
  seast: _gdF({ x: 40, y: 21, plot: 'marsh', wild: 1, theme: 'reed', rows: _gdF([
    '###cc@vvv###', '##ccc@@vv###', '####ww@@v###', '###www#@xxxx', '###www@@xxxx', '####zz@##xxx', '####zz@@####', '###zzz#@yyyy', '###zzz@@yyyy',
    '######@##yyy', '###iii@@####', '###iii#@kkkk', '####uu@@kkkk', '####uu@###kk', '###mmm@@####', '###mmm#@tttt', '#######@tttt']) }),
  south: _gdF({ x: 0, y: 38, plot: 'marsh', wild: 1, theme: 'reed', rows: _gdF([
    'aaaaa$bbbbbbbb###cccccc#####dddddd####eeeeeeee#@ffff',
    'aaaaa$^^^bbbbb^^^^^^^^cc#####^^^^^^^^eeeeeee^^^@ffff',
    'gggggggg^^^^^^^hhhhhh^^^^^^^^^iiiiii^^^^^^^^^jjjjjjj',
    'ggggggggkkk!hhhhhhhhhmmmmmmmmmiiiiiinnnnnnnnnjjjjjjj',
    'ooooooooooo!!!!!!!!rrrrrrrrr!!!!!!!!!!!ssssssvvvvvvv',
    '#####oooooottttttt!!!!!!!!!!!uuuuuuuuu!!!!!!!vvvvvvv']) }),
});
/* A trail's level is when its gate opens. `from` is the way to it, so a trail never opens before the one that leads to it. Outside the old garden the level here is only a note of the first plan: the zones below decide. */
const _GLD_TRAIL_ROWS = ([
  { id: 'lt-heart', ch: '0', name: 'The heart path', lv: 1, from: '' },
  { id: 'lt-cottage', ch: '5', name: 'Cottage path', lv: 1, from: '' },
  { id: 'lt-pondway', ch: '_', name: 'Pond path', lv: 1, from: '' },
  { id: 'lt-orchard', ch: ',', name: 'Orchard steps', lv: 5, from: 'lt-cottage' },
  { id: 'lt-bramble', ch: '1', name: 'Bramble path', lv: 2, from: 'lt-heart' },
  { id: 'lt-foxglove', ch: '2', name: 'Foxglove steps', lv: 5, from: 'lt-bramble' },
  { id: 'lt-ridge', ch: '3', name: 'Ridge walk', lv: 9, from: 'lt-foxglove' },
  { id: 'lt-link', ch: '4', name: 'Over the top', lv: 12, from: 'lt-ridge' },
  { id: 'lt-apple', ch: '6', name: 'Apple walk', lv: 6, from: '' },
  { id: 'lt-pear', ch: '7', name: 'Pear steps', lv: 11, from: 'lt-apple' },
  { id: 'lt-wall', ch: '8', name: 'Old wall walk', lv: 15, from: 'lt-pear' },
  { id: 'lt-cider', ch: '9', name: 'Cider lane', lv: 8, from: '' },
  { id: 'lt-carrot', ch: '+', name: 'Carrot row', lv: 3, from: '' },
  { id: 'lt-bean', ch: '*', name: 'Bean walk', lv: 8, from: 'lt-carrot' },
  { id: 'lt-cabbage', ch: '&', name: 'Cabbage steps', lv: 13, from: 'lt-bean' },
  { id: 'lt-deep', ch: '%', name: 'Deep rows', lv: 17, from: 'lt-cabbage' },
  { id: 'lt-furrow', ch: '=', name: 'West shore path', lv: 6, from: '' },
  { id: 'lt-reed', ch: '@', name: 'East shore path', lv: 9, from: '' },
  { id: 'lt-board', ch: '$', name: 'The boardwalk', lv: 7, from: 'lt-furrow' },
  { id: 'lt-heron', ch: '^', name: 'South shore walk', lv: 14, from: 'lt-board' },
  { id: 'lt-willow', ch: '!', name: 'Willow ways', lv: 18, from: 'lt-heron' },
]);
/* ---------- the zones ----------
   The owner, 1 Nov 2026: "further from the centre costs more and needs a higher level ... gates and zones locked ... we should only see we can buy stuff when that zone itself is unlocked". Every cell of the world is in one zone,
   worked out by how far it is from the square, and a path is never in an earlier zone than the way to it. Everything in a zone opens with its gate: its paths, and its land to buy. It is all in this one table:
     n, id, name      the zone ('zn-<n>' is in the open set when it is open, and is the answer to "what is locked here")
     lv               the garden level that opens it
     far              the cells beyond the square (GARDEN_ZONE_SQUARE) that this zone reaches to
     coin             what a square of land costs here (GARDEN_ZONE_COST: dearer kinds of land, and the most squares a piece is charged for)
     lake             the lake is open down to this row. Past it the water is locked: no casts and no fish
   Nothing new goes in a snapshot: a garden's zones come from its level and what it owns, so a friend's garden shows THEIR zones by itself. */
const GARDEN_ZONES = _gdRows([
  { n: 0, id: 'zn-0', name: 'The square', lv: 1, far: 0, coin: 0, lake: 28, zone: 1, cats: _gdF([]) },
  { n: 1, id: 'zn-1', name: 'Near land', lv: 3, far: 3, coin: 10, lake: 28, zone: 1, cats: _gdF([]) },
  { n: 2, id: 'zn-2', name: 'Middle land', lv: 6, far: 7, coin: 18, lake: 31, zone: 1, cats: _gdF([]) },
  { n: 3, id: 'zn-3', name: 'Far land', lv: 10, far: 12, coin: 30, lake: 34, zone: 1, cats: _gdF([]) },
  { n: 4, id: 'zn-4', name: 'Wild land', lv: 14, far: 18, coin: 48, lake: 36, zone: 1, cats: _gdF([]) },
  { n: 5, id: 'zn-5', name: 'The world’s edge', lv: 18, far: 99, coin: 75, lake: 38, zone: 1, cats: _gdF([]) },
]);
const GARDEN_ZONE_SQUARE = _gdF({ x0: 10, x1: 42, y0: 8, y1: 21 });   // (edges of cells: the lane's two rows and x 10 to 41 are in it)
const GARDEN_ZONE_COST = _gdF({ most: 14, walled: 2, kinds: _gdF({ pool: 1.4, rich: 1.2, suntrap: 1.6, exotic: 1.5, nursery: 1.2 }) });
function gardenZoneFar(x, y) { const Q = GARDEN_ZONE_SQUARE, dx = Math.max(Q.x0 - x, x - Q.x1, 0), dy = Math.max(Q.y0 - y, y - Q.y1, 0); return Math.hypot(dx, dy); }
function _gldZoneOfFar(d) { for (const z of GARDEN_ZONES) if (d <= z.far) return z.n; return GARDEN_ZONES.length - 1; }
/* Which zone each cell is in, from the maps alone (this runs before the rows below are made, so their levels and prices can come from it). A path's cells only ever go up in zone, walking out from its mouth. */
const _GLD_ZP = (function () {
  const C = GARDEN_WORLD.cols, R = GARDEN_WORLD.rows, ring = new Int8Array(C * R), trailOf = new Array(C * R).fill(null), byCh = new Map(_GLD_TRAIL_ROWS.map(t => [t.ch, t])), core = new Set(), top = GARDEN_ZONES.length - 1;
  const at = (x, y) => y * C + x, inside = (x, y) => x >= 0 && y >= 0 && x < C && y < R;
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) ring[at(x, y)] = _gldZoneOfFar(gardenZoneFar(x + 0.5, y + 0.5));
  for (const [id, M] of Object.entries(GARDEN_LAND_MAPS)) M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) { const i = at(M.x + dx, M.y + dy), t = byCh.get(row[dx]); if (t) trailOf[i] = t; if (id === 'core') { ring[i] = 0; core.add(i); } } });
  const isLane = (x, y) => y === 19 || y === 20, base = new Map(), adj = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const t of _GLD_TRAIL_ROWS) {
    const cells = []; for (let i = 0; i < C * R; i++) if (trailOf[i] === t) cells.push(i);
    if (cells.every(i => core.has(i))) { base.set(t.id, 0); continue; }
    const parent = t.from ? _GLD_TRAIL_ROWS.find(q => q.id === t.from) : null, seen = new Set(), queue = [];
    let b = 1e9;
    for (const i of cells) { const x = i % C, y = (i - x) / C; for (const [a, c] of adj) if (inside(x + a, y + c) && (parent ? trailOf[at(x + a, y + c)] === parent : isLane(x + a, y + c))) { b = Math.min(b, ring[at(x + a, y + c)] + (parent ? 1 : 0)); if (!seen.has(i)) { seen.add(i); queue.push(i); } } }
    if (b === 1e9) { b = 1; queue.push(cells[0]); seen.add(cells[0]); }
    b = Math.min(top, Math.max(b, 1));
    base.set(t.id, b);
    for (const i of queue) ring[i] = Math.max(b, ring[i]);
    while (queue.length) {
      const i = queue.shift(), x = i % C, y = (i - x) / C;
      for (const [a, c] of adj) { if (!inside(x + a, y + c)) continue; const j = at(x + a, y + c); if (trailOf[j] !== t || seen.has(j)) continue; seen.add(j); ring[j] = Math.min(top, Math.max(ring[i], ring[j], b)); queue.push(j); }
    }
  }
  return { ring, base };
})();
const GARDEN_LAND_TRAILS = _gdRows(_GLD_TRAIL_ROWS.map(t => { const b = _GLD_ZP.base.get(t.id); return Object.assign({ trail: 1 }, t, b ? { lv: GARDEN_ZONES[b].lv, zn: b } : { zn: 0 }); }));
/** The zone a cell is in (a number). */
function gardenZoneOf(x, y) { const W = GARDEN_WORLD; return x >= 0 && y >= 0 && x < W.cols && y < W.rows ? _GLD_ZP.ring[y * W.cols + x] : 0; }
/** The zone's row, for a number. */
function gardenZone(n) { return GARDEN_ZONES[Math.max(0, Math.min(GARDEN_ZONES.length - 1, n | 0))]; }
/** What locks this path or lane cell, in the garden on screen: '' when it is open, else the zone's id. */
function gardenZoneLockAt(x, y) { const n = gardenZoneOf(x, y); return n && !_GD_LAND.has('zn-' + n) ? 'zn-' + n : ''; }
/** The lake is open down to this row, in the garden on screen: the open zones say, and a pier you have built always has water round it. */
function gardenLakeOpenTo() {
  let to = GARDEN_ZONES[0].lake;
  for (const z of GARDEN_ZONES) if (_GD_LAND.has(z.id)) to = Math.max(to, z.lake);
  return Math.min(GARDEN_ZONES[GARDEN_ZONES.length - 1].lake, Math.max(to, 28 + gardenPierMore()));
}
/** The same from a set of what is open (the drawing, the page). */
function gardenLakeOpenToOf(open) {
  let to = GARDEN_ZONES[0].lake;
  for (const z of GARDEN_ZONES) if (open.has(z.id)) to = Math.max(to, z.lake);
  return Math.min(GARDEN_ZONES[GARDEN_ZONES.length - 1].lake, Math.max(to, 28 + gardenPierMore()));
}
/** The first zone whose opening would open this row of the lake. */
function gardenLakeZoneOfRow(y) { for (const z of GARDEN_ZONES) if (y < z.lake) return z; return GARDEN_ZONES[GARDEN_ZONES.length - 1]; }
/* The old garden's sections: free, each at its own level. [map character, id, name, kind, level, via, the old area it counts as]. */
const _GLD_CORE_ROWS = [
  ['O', 'lc-front-bed', 'Front bed', 'bed', 1, '0', 'bed'], ['U', 'lc-cottage-bed', 'Cottage bed', 'bed', 1, '5', 'bed'], ['K', 'lc-rose-corner', 'Rose corner', 'bed', 2, '5', 'bed'],
  ['T', 'lc-the-green', 'The green', 'green', 1, '0', ''], ['X', 'lc-band-green', 'Bandstand green', 'green', 1, '0', ''], ['I', 'lc-well-green', 'Well green', 'green', 1, '0', ''], ['L', 'lc-fountain-green', 'Fountain green', 'green', 1, '0', ''],
  ['V', 'lc-little-green', 'Little green', 'green', 1, '0', ''], ['c', 'lc-shore-green', 'Shore green', 'green', 1, '', ''], ['d', 'lc-shop-green', 'Shop green', 'green', 1, '0', ''], ['e', 'lc-gate-patch', 'Gate patch', 'green', 1, '_', ''], ['f', 'lc-notice-green', 'Notice green', 'green', 1, '_', ''],
  ['M', 'lc-bean-rows', 'Bean rows', 'patch', 3, '5', 'veg'], ['R', 'lc-salad-patch', 'Salad patch', 'patch', 3, '5', 'veg'], ['a', 'lc-cabbage-corner', 'Cabbage corner', 'patch', 3, '5', 'veg'], ['b', 'lc-long-beds', 'Long beds', 'patch', 3, '5', 'veg'],
  ['Q', 'lc-deer-corner', 'Deer corner', 'wood', 4, '_', 'woods'], ['W', 'lc-bracken-dip', 'Bracken dip', 'wood', 4, '_', 'woods'], ['Y', 'lc-old-logs', 'The old logs', 'wood', 4, '_', 'woods'], ['Z', 'lc-badger-bank', 'Badger bank', 'wood', 4, '', 'woods'],
  ['A', 'lc-old-apple', 'The old apple', 'orchard', 5, ',', 'orchard'], ['B', 'lc-pear-corner', 'Pear corner', 'orchard', 5, ',', 'orchard'], ['G', 'lc-plum-row', 'Plum row', 'orchard', 5, ',', 'orchard'],
  ['P', 'lc-pond', 'The pond', 'pondedge', 7, '_', 'pond'], ['H', 'lc-glasshouse', 'The greenhouse', 'glass', 9, '_', 'greenhouse'],
  ['C', 'lc-poppy-bank', 'Poppy bank', 'meadow', 12, '0', 'meadow'], ['D', 'lc-long-meadow', 'Long meadow', 'meadow', 12, '0', 'meadow'], ['E', 'lc-daisy-strip', 'Moon daisy strip', 'meadow', 12, '0', 'meadow'],
];
/* [region, map character, id, name, kind, level, coins, via (a trail's character, '' = on the lane), needs?]. Early ones are on the lane and cheap; coins come at up to 120 a day (GARDEN_ECON.dayCap), so the late ones are days of it each. */
const _GLD_SECTION_ROWS = [
  ['north', 'O', 'ls-clover-corner', 'Clover corner', 'meadow', 2, 30, '1'], ['north', 'N', 'ls-buttercup-bank', 'Buttercup bank', 'meadow', 2, 40, '1'], ['north', 'M', 'ls-sunny-doorstep', 'Sunny doorstep', 'herb', 3, 60, '1'], ['north', 'L', 'ls-blackbird-corner', 'Blackbird corner', 'berry', 3, 70, '1'],
  ['north', 'I', 'ls-foxglove-strip', 'Foxglove strip', 'dell', 5, 90, '2'], ['north', 'H', 'ls-fern-hollow', 'Fern hollow', 'dell', 5, 100, '2'], ['north', 'J', 'ls-warm-stones', 'Warm stones', 'rock', 6, 140, '1'], ['north', 'B', 'ls-thyme-terrace', 'Thyme terrace', 'herb', 6, 150, '2'],
  ['north', 'E', 'ls-bee-bank', 'Bee bank', 'meadow', 9, 220, '3'], ['north', 'F', 'ls-orchid-slope', 'Orchid slope', 'meadow', 9, 240, '3'], ['north', 'G', 'ls-rabbit-warren', 'Rabbit warren', 'meadow', 10, 260, '3'], ['north', 'A', 'ls-skylark-top', 'Skylark top', 'meadow', 10, 300, '3'],
  ['north', 'C', 'ls-long-view', 'The long view', 'rock', 11, 330, '3'], ['north', 'K', 'ls-cowslip-rise', 'Cowslip rise', 'meadow', 12, 260, '4'], ['north', 'D', 'ls-high-pasture', 'High pasture', 'meadow', 12, 380, '3'],
  ['east', 'g', 'ls-gate-pear', 'Gate pear', 'orchard', 4, 60, ''], ['east', 'f', 'ls-windfall', 'Windfall corner', 'orchard', 4, 80, ''], ['east', 'h', 'ls-crab-row', 'Crab apple row', 'orchard', 5, 110, ''], ['east', 'd', 'ls-old-plum', 'The old plum', 'orchard', 5, 120, ''],
  ['east', 'e', 'ls-apple-row', 'Apple row', 'orchard', 6, 170, '6'], ['east', 'a', 'ls-medlar-strip', 'Medlar strip', 'orchard', 7, 150, '6'], ['east', 'b', 'ls-cherry-row', 'Cherry row', 'orchard', 8, 210, '6'], ['east', 'c', 'ls-cider-nook', 'Cider nook', 'orchard', 8, 180, '9'], ['east', 'Z', 'ls-hazel-copse', 'Hazel copse', 'wood', 8, 220, '6'],
  ['east', 'Y', 'ls-damson-dip', 'Damson dip', 'orchard', 11, 300, '7'], ['east', 'V', 'ls-walnut-shade', 'Walnut shade', 'wood', 11, 310, '7'], ['east', 'X', 'ls-nursery', 'The nursery', 'nursery', 12, 380, '9'], ['east', 'W', 'ls-bluebell-wood', 'Bluebell wood', 'dell', 12, 360, '7'],
  ['east', 'T', 'ls-ivy-corner', 'Ivy corner', 'dell', 13, 400, '7'], ['east', 'U', 'ls-espalier', 'The espalier', 'berry', 15, 520, '8'], ['east', 'S', 'ls-walled-garden', 'The walled garden', 'suntrap', 15, 1200, '8', 'key:old'],
  ['east', 'P', 'ls-owl-wood', 'Owl wood', 'wood', 16, 640, '8'], ['east', 'Q', 'ls-sun-terrace', 'Sun terrace', 'suntrap', 16, 900, '8'], ['east', 'R', 'ls-beech-top', 'Beech top', 'wood', 17, 720, '8'],
  ['west', 'j', 'ls-first-furrow', 'First furrow', 'veg', 3, 40, ''], ['west', 'k', 'ls-allot-row', 'Allotment row', 'veg', 3, 90, ''], ['west', 'l', 'ls-bean-corner', 'Bean corner', 'veg', 4, 80, ''], ['west', 'm', 'ls-onion-bed', 'Onion bed', 'veg', 4, 90, '+'], ['west', 'n', 'ls-salad-strip', 'Salad strip', 'veg', 4, 70, '+'],
  ['west', 'o', 'ls-pumpkin-nook', 'Pumpkin nook', 'rich', 6, 150, '+'], ['west', 'q', 'ls-potato-ground', 'Potato ground', 'rich', 8, 240, '+'], ['west', 's', 'ls-seedling-rows', 'Seedling rows', 'veg', 8, 150, '+'], ['west', 'r', 'ls-bean-beds', 'Bean beds', 'veg', 8, 200, '*'], ['west', 'u', 'ls-hop-garden', 'Hop garden', 'veg', 9, 230, '*'],
  ['west', 'v', 'ls-herb-wall', 'Herb wall', 'herb', 13, 360, '&'], ['west', 'x', 'ls-black-soil', 'Black soil', 'rich', 13, 420, '*'], ['west', 'y', 'ls-pea-sticks', 'Pea sticks', 'veg', 13, 380, '&'], ['west', 'M', 'ls-maze-ground', 'The maze ground', 'meadow', 13, 700, '&'],
  ['west', 'z', 'ls-market-beds', 'Market beds', 'rich', 14, 560, '&'], ['west', 'b', 'ls-giant-veg', 'Giant veg ground', 'rich', 18, 900, '%'], ['west', 'd', 'ls-deep-loam', 'Deep loam', 'rich', 18, 780, '&'], ['west', 'c', 'ls-prize-beds', 'The prize beds', 'rich', 20, 1100, '%'],
  ['swest', 'a', 'ls-frog-steps', 'Frog steps', 'reed', 4, 70, ''], ['swest', 'b', 'ls-kingcup', 'Kingcup corner', 'reed', 5, 100, ''], ['swest', 'p', 'ls-strawberry-bank', 'Strawberry bank', 'berry', 6, 140, '='], ['swest', 't', 'ls-rhubarb-patch', 'Rhubarb patch', 'berry', 7, 170, '='],
  ['swest', 'h', 'ls-snipe-rough', 'Snipe rough', 'reed', 7, 130, '='], ['swest', 'd', 'ls-willow-foot', 'Willow foot', 'reed', 7, 160, '='], ['swest', 'f', 'ls-lily-pool', 'Lily pool', 'pool', 7, 220, '='], ['swest', 'e', 'ls-dragonfly-bank', 'Dragonfly bank', 'reed', 8, 170, '='], ['swest', 'j', 'ls-sedge-isle', 'Sedge isle', 'reed', 8, 190, '='], ['swest', 'k', 'ls-alder-carr', 'Alder carr', 'wood', 8, 210, '='],
  ['swest', 'l', 'ls-tiny-isle', 'Tiny isle', 'reed', 9, 110, '='], ['swest', 'i', 'ls-reed-isle', 'Reed isle', 'reed', 9, 130, '='], ['swest', 'g', 'ls-marigold-bank', 'Marigold bank', 'reed', 9, 190, '='], ['swest', 'm', 'ls-otter-holt', 'Otter holt', 'wood', 10, 240, '='], ['swest', 'n', 'ls-deep-pool', 'Deep pool', 'pool', 10, 320, '='],
  ['swest', 'q', 'ls-heronry', 'The heronry', 'wood', 12, 360, '='], ['swest', 'r', 'ls-clear-pool', 'Clear pool', 'pool', 14, 520, '='], ['swest', 'o', 'ls-moon-pool', 'Moon pool', 'pool', 16, 900, '='],
  ['seast', 'c', 'ls-bulrush-edge', 'Bulrush edge', 'reed', 5, 120, ''], ['seast', 'v', 'ls-gull-rest', 'Gull rest', 'rock', 9, 150, '@'], ['seast', 'w', 'ls-otter-run', 'Otter run', 'wood', 10, 230, '@'], ['seast', 'i', 'ls-sandy-spit', 'Sandy spit', 'rock', 11, 240, '@'], ['seast', 'y', 'ls-lark-marsh', 'Lark marsh', 'meadow', 12, 320, '@'],
  ['seast', 'k', 'ls-hazel-isle', 'Hazel isle', 'wood', 12, 300, '@'], ['seast', 'u', 'ls-sedge-pool', 'Sedge pool', 'pool', 12, 280, '@'], ['seast', 'm', 'ls-moorhen-bank', 'Moorhen bank', 'reed', 13, 340, '@'], ['seast', 't', 'ls-bittern-reach', 'Bittern reach', 'reed', 13, 380, '@'], ['seast', 'x', 'ls-far-willows', 'Far willows', 'wood', 15, 480, '@'], ['seast', 'z', 'ls-stone-pool', 'Stone pool', 'pool', 17, 760, '@'],
  ['south', 'a', 'ls-boat-bank', 'Boat bank', 'reed', 7, 150, '$'], ['south', 'b', 'ls-wader-flats', 'Wader flats', 'reed', 8, 200, '$'], ['south', 'g', 'ls-cockle-bank', 'Cockle bank', 'rock', 9, 240, '$'], ['south', 'f', 'ls-spit-end', 'Spit end', 'rock', 10, 250, '@'],
  ['south', 'c', 'ls-heron-isle', 'Heron isle', 'reed', 14, 420, '^'], ['south', 'd', 'ls-iris-bed', 'Iris bed', 'reed', 15, 500, '^'], ['south', 'e', 'ls-far-shore', 'The far shore', 'meadow', 15, 520, '^'], ['south', 'n', 'ls-windy-flats', 'Windy flats', 'rock', 16, 620, '^'], ['south', 'j', 'ls-ness-wood', 'Ness wood', 'wood', 17, 700, '^'],
  ['south', 'h', 'ls-mist-meadow', 'Mist meadow', 'meadow', 18, 720, '^'], ['south', 'm', 'ls-silver-birches', 'Silver birches', 'wood', 18, 700, '^'], ['south', 'i', 'ls-exotic-glade', 'Exotic glade', 'exotic', 19, 1000, '^'], ['south', 'k', 'ls-hermit-corner', 'Hermit corner', 'exotic', 20, 1200, '^'],
  ['south', 'r', 'ls-sallow-carr', 'Sallow carr', 'wood', 19, 800, '!'], ['south', 't', 'ls-ferny-way', 'Ferny way', 'dell', 19, 780, '!'], ['south', 'u', 'ls-rush-hollow', 'Rush hollow', 'reed', 19, 820, '!'], ['south', 'o', 'ls-last-bank', 'The last bank', 'reed', 20, 900, '!'], ['south', 's', 'ls-otter-beach', 'Otter beach', 'rock', 20, 1000, '!'], ['south', 'v', 'ls-world-end', 'The world’s end', 'meadow', 22, 1500, '!'],
];
/* The cell grid: what each cell of the world is. */
const _GLD_GRID = new Array(GARDEN_WORLD.cols * GARDEN_WORLD.rows).fill(null);
const _GLD_TRAIL_BY_CH = new Map(GARDEN_LAND_TRAILS.map(t => [t.ch, t]));
const _GLD_LANE = _gdF({ id: 'lane', lane: 1, name: 'The lane' });
const GARDEN_LAND_THICKET = _gdF({ id: 'lt-thicket', solid: 1, name: 'The thicket', lv: 999 });
function _gldCellsOf(region, ch) { const M = GARDEN_LAND_MAPS[region], out = []; M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) if (row[dx] === ch) out.push([M.x + dx, M.y + dy]); }); return out; }
function _gldSectionRow(region, ch, id, name, kind, lv, buy, via, needs, fam) {
  const K = GARDEN_LAND_KINDS[kind], cells = _gldCellsOf(region, ch), xs = cells.map(c => c[0]), ys = cells.map(c => c[1]), x = Math.min(...xs), y = Math.min(...ys);
  const r = { id, region, plot: GARDEN_LAND_MAPS[region].plot, ch, name, kind, lv, buy, viaCh: via, via: via ? _GLD_TRAIL_BY_CH.get(via).id : '', needs: needs || '', fam: fam || '', cells: _gdF(cells), x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1, tile: K.tile, cats: K.cats, icon: K.icon, blurb: K.says || K.name };
  if (K.always) r.always = 1; if (K.grow) r.grow = K.grow; if (K.pool) r.pool = 1; if (K.green) r.green = 1;
  return r;
}
/* A piece of land to buy: its zone is how far out it lies, and never before the way to it. Its price is its squares at that zone's price (the row's own level and coins were the first plan, kept only as notes). */
function _gldZonedRow(region, ch, id, name, kind, lv, buy, via, needs) {
  const r = _gldSectionRow(region, ch, id, name, kind, lv, buy, via, needs), at = (x, y) => y * GARDEN_WORLD.cols + x, n0 = r.cells.reduce((sum, [x, y]) => sum + gardenZoneFar(x + 0.5, y + 0.5), 0) / r.cells.length;
  let n = Math.max(1, _gldZoneOfFar(n0));
  const viaRow = via ? _GLD_TRAIL_BY_CH.get(via) : null;
  if (viaRow) n = Math.max(n, viaRow.zn);
  // and the cell you knock at must be open by then: the nearest on its way
  let best = 1e9, door = 0; const mx = r.x + r.w / 2, my = r.y + r.h / 2;
  for (const [x, y] of r.cells) for (const [a, c] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const q = x + a, w = y + c; if (q < 0 || w < 0 || q >= GARDEN_WORLD.cols || w >= GARDEN_WORLD.rows) continue; const onLane = w === 19 || w === 20, onVia = viaRow ? _gldTrailCh(q, w) === via : onLane; if (!onVia) continue; const d = Math.hypot(q + 0.5 - mx, w + 0.5 - my); if (d < best) { best = d; door = _GLD_ZP.ring[at(q, w)]; } }
  n = Math.min(GARDEN_ZONES.length - 1, Math.max(n, door));
  const Z = GARDEN_ZONES[n], C = GARDEN_ZONE_COST, price = Z.coin * Math.min(C.most, r.cells.length) * (C.kinds[kind] || 1) * (needs ? C.walled : 1);
  return Object.assign(r, { lv: Z.lv, buy: Math.max(5, Math.round(price / 5) * 5), zn: n });
}
function _gldTrailCh(x, y) { for (const M of Object.values(GARDEN_LAND_MAPS)) { const row = M.rows[y - M.y]; if (row && x >= M.x && x < M.x + row.length) return row[x - M.x]; } return ''; }
const GARDEN_LAND_SECTIONS = _gdRows(_GLD_CORE_ROWS.map(([ch, id, name, kind, lv, via, fam]) => Object.assign(_gldSectionRow('core', ch, id, name, kind, lv, 0, via, '', fam), { zn: 0 })).concat(_GLD_SECTION_ROWS.map(r => _gldZonedRow(...r))));
const _GLD_ROW = new Map();
for (let y = 19; y <= 20; y++) for (let x = 0; x < GARDEN_WORLD.cols; x++) _GLD_GRID[y * GARDEN_WORLD.cols + x] = _GLD_LANE;
for (const M of Object.values(GARDEN_LAND_MAPS)) M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) { const t = row[dx] === '#' ? GARDEN_LAND_THICKET : _GLD_TRAIL_BY_CH.get(row[dx]); if (t) _GLD_GRID[(M.y + dy) * GARDEN_WORLD.cols + M.x + dx] = t; } });
for (const t of GARDEN_LAND_TRAILS) _GLD_ROW.set(t.id, t);
for (const s of GARDEN_LAND_SECTIONS) { _GLD_ROW.set(s.id, s); _GD_AREA.set(s.id, s); for (const [x, y] of s.cells) _GLD_GRID[y * GARDEN_WORLD.cols + x] = s; }
for (const t of GARDEN_LAND_TRAILS) _GD_AREA.set(t.id, t);   // (so a 'locked:' answer can be looked up like any other)
_GD_AREA.set(GARDEN_LAND_THICKET.id, GARDEN_LAND_THICKET);
for (const z of GARDEN_ZONES) _GD_AREA.set(z.id, z);   // (a 'locked:zn-2' answer is looked up the same way, and says its own name and level)
/* The gates: wherever a path or the lane crosses into a further zone. {id, n (the zone it opens), x, y (the cell it stands at, on the far side), dx, dy (the way through), h (cells across, for the lane), door (the cell you knock at)}. */
const GARDEN_ZONE_GATES = (function () {
  const out = [], W = GARDEN_WORLD, walk = (x, y) => { const c = gardenLandCell(x, y); return !!c && !c.solid && (!!c.lane || !!c.trail); };
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    if (!walk(x, y)) continue;
    const n = gardenZoneOf(x, y); if (!n) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ix = x - dx, iy = y - dy; if (!walk(ix, iy) || gardenZoneOf(ix, iy) >= n) continue;
      const lane = !!gardenLandCell(x, y).lane && !!gardenLandCell(ix, iy).lane;
      if (lane && y === 20) continue;   // one gate right across the lane, from its top row
      if (out.some(g => g.n === n && Math.abs(g.x - x) + Math.abs(g.y - y) <= 1)) continue;   // (a corner of a path: one gate is enough)
      out.push(Object.freeze({ id: 'zg-' + x + '-' + y, n, x, y, dx, dy, h: lane ? 2 : 1, door: Object.freeze({ x: ix, y: iy }) }));
    }
  }
  return Object.freeze(out);
})();
const _GLD_GATE = new Map(GARDEN_ZONE_GATES.map(g => [g.id, g]));
function gardenZoneGate(id) { return _GLD_GATE.get(String(id)) || null; }
/** What a cell is: a section's row, a trail's row, the lane, the thicket, or null (the lake). */
function gardenLandCell(x, y) { const W = GARDEN_WORLD; return x >= 0 && y >= 0 && x < W.cols && y < W.rows ? _GLD_GRID[y * W.cols + x] : null; }
function gardenLandIsTrail(r) { return !!r && !!r.trail; }
function gardenLandRow(id) { return _GLD_ROW.get(String(id)) || null; }
/** The cell you stand on to knock at a section: on its trail or the lane, the one nearest its middle, and never where a building stands. Worked out once. */
const _GLD_DOORS = new Map();
function gardenLandDoor(s) {
  if (_GLD_DOORS.has(s.id)) return _GLD_DOORS.get(s.id);
  let best = null, bd = 1e9;
  const mx = s.x + s.w / 2, my = s.y + s.h / 2;
  for (const [x, y] of s.cells) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const cx = x + dx, cy = y + dy, c = gardenLandCell(cx, cy);
    if (!(s.via ? (c && c.id === s.via) : (c && c.lane))) continue;
    if (GARDEN_PROPS.some(p => gardenPropCol(p) === 'full' && cx >= p.x && cx < p.x + p.w && cy >= p.y && cy < p.y + p.h)) continue;
    const d = Math.hypot(cx + 0.5 - mx, cy + 0.5 - my);
    if (d < bd) { bd = d; best = { x: cx, y: cy, fx: x, fy: y }; }
  }
  _GLD_DOORS.set(s.id, best);
  return best;
}

/* ---------- things you build ----------
   does: 'collect' (every `per` you take `give`), 'post', 'machine', and the rest by name in 94-garden-lands-1core.js. per: 'day' | '2day' | 'week' | 'season'; tod: only at that time of day.
   sec: the section it stands in ('' = on the lane, at its own x, y). The spot in the section is worked out below (world cells: only the ones on the lane and the maze are written here). col: what it does to your feet. */
const _GLD_FEATURE_ROWS = [
  { id: 'lf-post-lane', name: 'Way post on the lane', art: 'post', does: 'post', sec: '', x: 37, y: 19, w: 1, h: 1, door: { x: 37, y: 20 }, col: 'soft', lv: 2, cost: 30, tall: 1.5, icon: 'milestone', blurb: 'Build two way posts and you can hop between them.' },
  { id: 'lf-well', name: 'Village well', art: 'well', does: 'collect', per: 'day', give: { dew: 2 }, verb: 'Draw a bucket', dew: 2, sec: 'lc-well-green', w: 1, h: 1, col: 'soft', lv: 2, cost: 40, tall: 1.4, icon: 'droplets', blurb: 'Draw a bucket once a day: two more cans of water.' },
  { id: 'lf-barrel', name: 'Rain barrel', art: 'barrel', does: 'barrel', sec: 'lc-well-green', w: 1, h: 1, col: 'soft', lv: 3, cost: 60, tall: 1.1, water: 3, icon: 'droplets', blurb: 'Three more cans of water every day.' },
  { id: 'lf-stone', name: 'Lucky stone', art: 'stone', does: 'collect', per: 'day', give: { coins: [3, 10] }, verb: 'Knock on the stone', sec: 'lc-band-green', w: 1, h: 1, col: 'soft', lv: 3, cost: 50, tall: 0.9, icon: 'coins', blurb: 'Knock on it once a day. A few coins always fall out, nobody knows why.' },
  { id: 'lf-worms', name: 'Worm bin', art: 'worms', does: 'collect', per: '2day', give: { i: { fertiliser: 1 } }, verb: 'Take the fertiliser', sec: 'lc-long-beds', w: 1, h: 1, col: 'soft', lv: 4, cost: 80, tall: 0.9, icon: 'recycle', blurb: 'A bag of free fertiliser every two days.' },
  { id: 'lf-arch', name: 'Seasons arch', art: 'arch', does: 'collect', per: 'season', give: { season: 1, x: 10 }, verb: 'Take this season’s seed', sec: 'lc-fountain-green', w: 2, h: 1, col: 'none', lv: 5, cost: 120, tall: 1.9, icon: 'flower', blurb: 'Changes with the year, and leaves you a free seed each season.' },
  { id: 'lf-boots', name: 'Stout boots', art: 'boots', does: 'boots', sec: '', x: 17, y: 19, w: 1, h: 1, door: { x: 17, y: 20 }, col: 'none', lv: 5, cost: 150, tall: 0.7, icon: 'footprints', blurb: 'You walk a good bit faster everywhere. They stand by the shops when you are not in them.' },
  { id: 'lf-scarecrow', name: 'Scarecrow', art: 'scarecrow', does: 'scarecrow', sec: 'ls-allot-row', w: 1, h: 1, col: 'soft', lv: 6, cost: 140, tall: 1.7, grow: 1.1, r: 4, icon: 'wheat', blurb: 'Plants near it grow a tenth faster. Dresses for the season.' },
  { id: 'lf-stars', name: 'Garden stars board', art: 'stars', does: 'stars', sec: 'lc-shore-green', w: 1, h: 1, col: 'soft', lv: 6, cost: 120, tall: 1.6, icon: 'star', blurb: 'Rates your garden out of five stars and pays for each one. Friends can read it.' },
  { id: 'lf-bandstand', name: 'Bandstand', art: 'bandstand', does: 'collect', per: 'day', give: { x: 5 }, verb: 'Listen a while', sec: 'lc-band-green', w: 2, h: 1, col: 'full', lv: 6, cost: 300, tall: 2, icon: 'music', blurb: 'The middle of the village. Stop and listen once a day for a little experience.' },
  { id: 'lf-skeps', name: 'Bee skeps', art: 'skeps', does: 'collect', per: '2day', give: { i: { honey: 1 }, x: 2 }, verb: 'Take the honey', sec: 'ls-foxglove-strip', w: 1, h: 1, col: 'soft', lv: 6, cost: 160, tall: 1.1, icon: 'flower', blurb: 'Old straw hives: a jar of honey every two days.' },
  { id: 'lf-help', name: 'Help wanted board', art: 'help', does: 'help', sec: 'lc-shore-green', w: 1, h: 1, col: 'soft', lv: 7, cost: 150, tall: 1.6, icon: 'flag', blurb: 'A neighbour asks for something you grow, once a week, and pays well for it.' },
  { id: 'lf-kettle', name: 'Jam kettle', art: 'kettle', does: 'machine', input: 'fruit', n: 5, hours: 24, mult: 2.5, sec: 'ls-windfall', w: 1, h: 1, col: 'soft', lv: 7, cost: 220, tall: 1.1, icon: 'cherry', blurb: 'Five pieces of fruit, a day on the stove, and it sells for much more.' },
  { id: 'lf-windmill', name: 'The windmill', art: 'windmill', does: 'collect', per: 'day', give: { coins: [6, 14] }, verb: 'Sell the flour', sec: 'ls-sunny-doorstep', w: 2, h: 1, col: 'full', lv: 7, cost: 380, tall: 3.2, icon: 'wheat', blurb: 'Up on the hill, where you can see it from the village. A little flour money every day.' },
  { id: 'lf-rack', name: 'Drying rack', art: 'rack', does: 'machine', input: 'herb', n: 5, hours: 48, mult: 3, sec: 'ls-thyme-terrace', w: 1, h: 1, col: 'soft', lv: 8, cost: 260, tall: 1.3, icon: 'leaf', blurb: 'Five bunches of herbs, two days in the air, three times the price.' },
  { id: 'lf-swap', name: 'Seed swap shelf', art: 'shelf', does: 'swap', sec: 'ls-cider-nook', w: 1, h: 1, col: 'soft', lv: 8, cost: 180, tall: 1.4, icon: 'sprout', blurb: 'Once a day, leave five common seeds and take a better one.' },
  { id: 'lf-post-field', name: 'Way post in the fields', art: 'post', does: 'post', sec: 'ls-seedling-rows', w: 1, h: 1, col: 'soft', lv: 8, cost: 100, tall: 1.5, icon: 'milestone', blurb: 'Hop here from any other way post.' },
  { id: 'lf-rill', name: 'Spring rill', art: 'rill', does: 'rill', sec: 'ls-potato-ground', w: 1, h: 1, col: 'none', lv: 9, cost: 320, tall: 0.5, r: 4, icon: 'waves', blurb: 'A little spring: everything planted near it is watered every morning.' },
  { id: 'lf-fountain', name: 'Village fountain', art: 'fountain', does: 'collect', per: 'day', give: { coins: [5, 15] }, verb: 'Pick up the wishes', sec: 'lc-the-green', w: 2, h: 1, col: 'full', lv: 9, cost: 450, tall: 1.5, icon: 'waves', blurb: 'People throw coins in it. Nobody will mind if you tidy a few away each day.' },
  { id: 'lf-post-hill', name: 'Way post on the hill', art: 'post', does: 'post', sec: 'ls-orchid-slope', w: 1, h: 1, col: 'soft', lv: 9, cost: 120, tall: 1.5, icon: 'milestone', blurb: 'Hop here from any other way post.' },
  { id: 'lf-post-marsh', name: 'Way post on the marsh', art: 'post', does: 'post', sec: 'ls-marigold-bank', w: 1, h: 1, col: 'soft', lv: 9, cost: 120, tall: 1.5, icon: 'milestone', blurb: 'Hop here from any other way post.' },
  { id: 'lf-lamps', name: 'Lantern walk', art: 'lampbox', does: 'lamps', sec: 'lc-band-green', w: 1, h: 1, col: 'soft', lv: 10, cost: 240, tall: 1, icon: 'lamp', blurb: 'Lamps along the lane that come on at dusk. Friends see them too.' },
  { id: 'lf-museum', name: 'Little museum', art: 'museum', does: 'museum', sec: 'lc-the-green', w: 2, h: 1, col: 'full', lv: 10, cost: 500, tall: 2.2, icon: 'landmark', blurb: 'Show the curios you dig up, and be paid as the collection grows. Friends can look in.' },
  { id: 'lf-post-grove', name: 'Way post in the orchards', art: 'post', does: 'post', sec: 'ls-walnut-shade', w: 1, h: 1, col: 'soft', lv: 11, cost: 150, tall: 1.5, icon: 'milestone', blurb: 'Hop here from any other way post.' },
  { id: 'lf-lookout', name: 'Lookout tower', art: 'lookout', does: 'lookout', per: 'day', sec: 'ls-long-view', w: 2, h: 1, col: 'full', lv: 11, cost: 300, tall: 3, icon: 'eye', blurb: 'Climb up and see the whole of your land. Friends can climb it too.' },
  { id: 'lf-dew', name: 'Dew stone', art: 'dew', does: 'collect', per: 'day', tod: 'dawn', give: { dew: 5, x: 3 }, verb: 'Gather the dew', sec: 'ls-fern-hollow', w: 1, h: 1, col: 'soft', lv: 11, cost: 260, tall: 0.8, dew: 5, icon: 'droplets', blurb: 'Go there at dawn: five more cans of water for the day.' },
  { id: 'lf-oak', name: 'Savings oak', art: 'oak', does: 'oak', sec: 'ls-bluebell-wood', w: 1, h: 1, col: 'soft', lv: 12, cost: 400, tall: 2, icon: 'coins', blurb: 'Bury coins at its roots. In a week they come back with a little more.' },
  { id: 'lf-maze', name: 'Hedge maze', art: 'maze', does: 'maze', sec: 'ls-maze-ground', x: 0, y: 4, w: 8, h: 5, door: { x: 2, y: 3 }, col: 'full', lv: 14, cost: 900, tall: 1, icon: 'trees', blurb: 'A little maze with a chest in the middle, full again every week. Friends can get lost in it.' },
  { id: 'lf-observatory', name: 'Observatory', art: 'observatory', does: 'observatory', per: 'day', tod: 'night', sec: 'ls-high-pasture', w: 2, h: 1, col: 'full', lv: 15, cost: 1400, tall: 2.6, icon: 'star', blurb: 'At night, log the stars you can see. Twelve to find in all.' },
  { id: 'lf-moon', name: 'Moon stone', art: 'moon', does: 'collect', per: 'day', tod: 'night', give: { i: { fertiliser: 1 }, x: 2 }, verb: 'Take the moon water', sec: 'ls-otter-holt', w: 1, h: 1, col: 'soft', lv: 16, cost: 1100, tall: 1.2, icon: 'sparkles', blurb: 'Only at night: it gathers water that feeds a plant like fertiliser, and it glows.' },
  { id: 'lf-circle', name: 'Stone circle', art: 'circle', does: 'collect', per: 'season', give: { x: 150, i: { 'seed:*rare': 1 } }, verb: 'Stand in the circle', sec: 'ls-mist-meadow', w: 3, h: 1, col: 'none', lv: 20, cost: 2400, tall: 1.3, icon: 'mountain', blurb: 'Stand in it once each season for a big share of experience and a rare seed.' },
];
/* The spot for each one in its section: the first row of cells wide enough with somewhere to stand below, kept clear of the others. */
// prizes for finishing a region's page in the book (94-garden-regions-*): nothing to buy, only to earn. World cells: thicket beside a trail, or the far ends of the lane, away from the shops.
_GLD_FEATURE_ROWS.push(
  { id: 'lf-rg-garden', name: 'The gardeners’ flag', art: 'rg-garden', does: 'prize', prize: 'garden', sec: '', x: 34, y: 14, w: 1, h: 1, door: { x: 34, y: 13 }, col: 'soft', lv: 1, cost: 0, tall: 2, icon: 'flag', blurb: 'For finding everything that lives in the main garden.' },
  { id: 'lf-rg-lake', name: 'The anglers’ board', art: 'rg-lake', does: 'prize', prize: 'lake', sec: '', x: 11, y: 20, w: 1, h: 1, door: { x: 10, y: 20 }, col: 'soft', lv: 1, cost: 0, tall: 1.8, icon: 'fish', blurb: 'For finding everything that lives in the lake.' },
  { id: 'lf-rg-hill', name: 'The hill flag', art: 'rg-hill', does: 'prize', prize: 'hill', sec: '', x: 29, y: 1, w: 1, h: 1, door: { x: 30, y: 1 }, col: 'soft', lv: 1, cost: 0, tall: 2, icon: 'flag', blurb: 'For finding everything that lives on the north hill.' },
  { id: 'lf-rg-orchards', name: 'The cider press', art: 'rg-orchards', does: 'prize', prize: 'orchards', sec: '', x: 46, y: 2, w: 1, h: 1, door: { x: 46, y: 3 }, col: 'soft', lv: 1, cost: 0, tall: 1.6, icon: 'apple', blurb: 'For finding everything that lives in the east orchards.' },
  { id: 'lf-rg-fields', name: 'The corn stook', art: 'rg-fields', does: 'prize', prize: 'fields', sec: '', x: 5, y: 19, w: 1, h: 1, door: { x: 5, y: 20 }, col: 'soft', lv: 1, cost: 0, tall: 1.5, icon: 'wheat', blurb: 'For finding everything that lives in the west fields.' },
  { id: 'lf-rg-marsh', name: 'The heron post', art: 'rg-marsh', does: 'prize', prize: 'marsh', sec: '', x: 47, y: 26, w: 1, h: 1, door: { x: 46, y: 26 }, col: 'soft', lv: 1, cost: 0, tall: 1.9, icon: 'waves', blurb: 'For finding everything that lives in the south marsh.' },
);
const GARDEN_LAND_FEATURES = (function () {
  const used = new Set(), key = (x, y) => x + ',' + y;
  for (const f of _GLD_FEATURE_ROWS) if (f.x != null && f.does !== 'maze') { used.add(key(f.x, f.y)); used.add(key(f.door.x, f.door.y)); }
  const place = (f) => {
    if (f.x != null) return f;
    const s = _GLD_ROW.get(f.sec), cells = s.cells.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]), inSec = (x, y) => gardenLandCell(x, y) === s;
    for (const [x, y] of cells) {
      let ok = true;
      for (let k = 0; k < f.w; k++) if (!inSec(x + k, y) || used.has(key(x + k, y))) ok = false;
      if (!ok) continue;
      const below = gardenLandCell(x, y + 1);
      if (!below || below.solid || used.has(key(x, y + 1)) || !(below === s || below.trail || below.lane)) continue;
      if (GARDEN_PROPS.some(p => x >= p.x && x < p.x + p.w && y + 1 >= p.y && y + 1 < p.y + p.h)) continue;   // (not with its door against a shop)
      for (let k = 0; k < f.w; k++) used.add(key(x + k, y));
      used.add(key(x, y + 1));
      return Object.assign({}, f, { x, y, door: { x, y: y + 1 } });
    }
    return f;   // (the throwaway check says if one has no spot; it is then not drawn or built)
  };
  return _gdMovable(_GLD_FEATURE_ROWS.map(place).map(f => { const q = f.sec ? _GLD_ROW.get(f.sec) : null; return q && q.lv > f.lv ? Object.assign({}, f, { lv: q.lv }) : f; }));   // (never before the zone it stands in)
})();
const _GLD_FEAT = new Map(GARDEN_LAND_FEATURES.map(f => [f.id, f]));
function gardenLandFeature(id) { return _GLD_FEAT.get(String(id)) || null; }
/* The maze, one character a cell over its footprint: # is hedge, C the chest. Gate at the top, from the Cabbage steps. */
const GARDEN_LAND_MAZE = _gdF(['##.#####', '#...#.C#', '###.#.##', '#.....##', '########']);
const GARDEN_LAND_OFFICE = ({ id: 'land-office', name: 'Land office', x: 24, y: 19, w: 3, h: 1, door: _gdF({ x: 25, y: 20 }), act: 'lands', kind: 'lf-office', tall: 2.4, verb: 'look at the land', blurb: 'What you can buy and build, and what is still to come.' });
const GARDEN_LAND_LAMPS = _gdF([4, 8, 44, 47, 50]);   // x along the lane's north edge, out where there are no shops
/* Your finds, laid out on a table on the lane from the first one you dig up, until a museum takes them in. */
const GARDEN_LAND_FINDS = ({ id: 'land-finds', name: 'Your finds', x: 40, y: 19, w: 2, h: 1, col: 'soft', walk: 0, act: 'lf', lf: 'land-finds', door: _gdF({ x: 40, y: 20 }), kind: 'lf-finds', tall: 1, blurb: 'What has turned up so far.' });
const GARDEN_LAND_KEY_ID = 'old-key';

/* ---------- what is on the map for everyone ----------
   The owner: "make sure the new garden looks good, populated, lots of cool features, stone paths, plazas, unique easter eggs". A new garden is a place before you plant anything. These stand on thicket,
   the mown green or a path (col 'none' on a path), so they take no room from plots and block nothing. The same for every garden, so a friend sees them with no field in a snapshot.
   say: what you find when you go up to it. egg: a small secret, once each: {c: coins, x: experience, curio: 1, tod: only then, verb, found: what it says}. World cells. */
/* Where you could not stand to look at a sight: inside a shop, or inside a feature once it is built. */
function _gldDoorTaken(x, y) {
  const inside = (p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + (p.h || 1);
  if (inside(GARDEN_LAND_OFFICE)) return true;
  for (const p of GARDEN_PROPS) if (!p.walk && (p.col || 'full') === 'full' && inside(p)) return true;
  for (const f of GARDEN_LAND_FEATURES) if (f.x != null && f.col === 'full' && inside(f)) return true;
  return false;
}
const GARDEN_LAND_SIGHTS = _gdMovable([
  // the middle
  { id: 'ld-cross', art: 'cross', name: 'The market cross', x: 24, y: 11, col: 'soft', tall: 1.6, say: 'Worn smooth by hundreds of hands. There is a small slot in the base.', egg: { verb: 'Feel in the slot', c: 4, found: 'Somebody left four coins in the slot, a long time ago.' } },
  { id: 'ld-sign-c', art: 'finger', name: 'The signpost', x: 26, y: 12, col: 'none', tall: 1.5, say: 'North: the hill. East: the orchards. West: the fields. South: round the lake. One arm is blank.', egg: { verb: 'Read the blank arm', c: 1, found: 'In very small letters: “You are here.” Someone has taped a coin to it.' } },
  { id: 'ld-bench-a', art: 'seat', name: 'The bench by the square', x: 29, y: 11, w: 2, col: 'soft', tall: 0.8, say: 'Warm from the sun. Good for watching nothing happen.', egg: { verb: 'Look at the carving', x: 5, found: 'A heart, two initials and a date you cannot read. Good for them.' } },
  { id: 'ld-bench-b', art: 'seat', name: 'The shore bench', x: 35, y: 18, w: 2, col: 'soft', tall: 0.8, say: 'You can just see the lake from here.' },
  { id: 'ld-lamp-a', art: 'lamp', name: 'An old lamp', x: 31, y: 11, col: 'none', tall: 1, say: 'Somebody still comes and lights it.' },
  { id: 'ld-lamp-b', art: 'lamp', name: 'An old lamp', x: 27, y: 16, col: 'none', tall: 1, say: 'Somebody still comes and lights it.' },
  { id: 'ld-box-a', art: 'topiary', name: 'A clipped box', x: 17, y: 8, col: 'full', tall: 1, say: 'Possibly a duck. Possibly a teapot.' },
  { id: 'ld-box-b', art: 'topiary', name: 'A clipped box', x: 33, y: 8, col: 'full', tall: 1, say: 'Definitely the same teapot.' },
  { id: 'ld-statue', art: 'statue', name: 'The old gardener', x: 34, y: 15, col: 'full', tall: 2, say: 'A stone man with a stone trowel, looking at the greenhouse as if it owes him money.', egg: { verb: 'Look under the trowel', curio: 1, found: 'Something was pushed in under the trowel' } },
  { id: 'ld-arch-n', art: 'gate', name: 'The north gate', x: 27, y: 9, col: 'none', tall: 1.9, say: 'The way up to the hill starts here.' },
  // north: the hill
  { id: 'ld-stones', art: 'stones', name: 'The hill stones', x: 28, y: 4, w: 4, col: 'full', tall: 1.2, say: 'Nobody knows who stood them up. There are five, or six, depending on when you count.', egg: { verb: 'Count them', tod: 'night', c: 12, found: 'After dark there are six. You count again and there are five, and twelve coins on the grass.', soon: 'Five stones. People say to count them after dark.' } },
  { id: 'ld-cairn', art: 'cairn', name: 'The cairn', x: 26, y: 4, col: 'full', tall: 0.9, say: 'Everyone who comes this way adds a stone.', egg: { verb: 'Add a stone', x: 5, found: 'You add a stone. You feel better for it.' } },
  { id: 'ld-tower', art: 'tower', name: 'The old watchtower', x: 35, y: 7, w: 3, col: 'full', tall: 2.4, say: 'Half of a tower. The other half is the wall round the pond.', egg: { verb: 'Try the loose brick', curio: 1, found: 'A brick comes out, and behind it' } },
  // east: the orchards
  { id: 'ld-chapel', art: 'chapel', name: 'The ruined chapel', x: 43, y: 2, w: 3, col: 'full', tall: 2.4, say: 'No roof, and apple trees in the aisle.', egg: { verb: 'Pull the old rope', c: 8, found: 'The bell has not rung for a hundred years, and does not ring now. Eight coins fall out of it.' } },
  { id: 'ld-stump', art: 'stump', name: 'A great stump', x: 47, y: 2, col: 'full', tall: 0.7, say: 'It must have been the biggest tree for miles. There is a very small door in it.', egg: { verb: 'Knock on the small door', c: 7, found: 'A very small voice says “not today, thank you”. Seven very small coins are pushed out.' } },
  { id: 'ld-orchard-wall', art: 'wall', name: 'The orchard wall', x: 45, y: 12, w: 2, col: 'full', tall: 0.6, say: 'Dry stone, and older than the trees.', egg: { verb: 'Look on top', c: 3, found: 'One sock, and three coins in the sock. Nobody has come back for it.' } },
  { id: 'ld-arch-e', art: 'gate', name: 'The orchard gate', x: 43, y: 18, col: 'none', tall: 1.9, say: 'The way up into the orchards.' },
  // west: the fields
  { id: 'ld-barn', art: 'barn', name: 'The old barn', x: 0, y: 0, w: 3, col: 'full', tall: 2.2, say: 'Full of things somebody will definitely need one day.' },
  { id: 'ld-hay', art: 'hay', name: 'The haystack', x: 10, y: 15, w: 2, col: 'full', tall: 1, say: 'A great heap of hay. You could look through it, if you had all afternoon.', egg: { verb: 'Look through it', curio: 1, found: 'You look all afternoon, and there really is something in the haystack' } },
  { id: 'ld-field-wall', art: 'wall', name: 'The field wall', x: 0, y: 3, w: 2, col: 'full', tall: 0.6, say: 'It keeps nothing in and nothing out, and it has been doing so for a long time.' },
  { id: 'ld-cart', art: 'cart', name: 'A broken cart', x: 10, y: 3, w: 2, col: 'full', tall: 0.9, say: 'One wheel has gone somewhere better.', egg: { verb: 'Look under the seat', c: 6, found: 'A dry old purse, with six coins and a shopping list. Mostly onions.' } },
  { id: 'ld-arch-w', art: 'gate', name: 'The field gate', x: 3, y: 18, col: 'none', tall: 1.9, say: 'The way into the fields.' },
  // south: the marsh and the far shore
  { id: 'ld-lighthouse', art: 'lighthouse', name: 'The little lighthouse', x: 35, y: 38, col: 'full', tall: 3.2, say: 'Far too small, on a lake far too small to need it. Somebody keeps it painted.', egg: { verb: 'Climb up and light it', tod: 'night', c: 15, found: 'You light it. Over the water, somebody blinks a lamp back. There are fifteen coins on the sill.', soon: 'It is not dark yet. It only wants lighting at night.' } },
  { id: 'ld-hull', art: 'hull', name: 'An upturned boat', x: 15, y: 38, w: 2, col: 'full', tall: 0.8, say: 'Somebody meant to come back and mend it.', egg: { verb: 'Look underneath', curio: 1, found: 'It is dry underneath, and something has been kept here' } },
  { id: 'ld-temple', art: 'temple', name: 'The folly', x: 25, y: 39, w: 3, col: 'full', tall: 1.7, say: 'A ruin somebody built on purpose, to look at from across the lake.', egg: { verb: 'Read the stone', c: 10, found: 'It says: “I was going to finish this.” Ten coins lie in the groove.' } },
  { id: 'ld-house', art: 'summer', name: 'The summer house', x: 4, y: 30, w: 2, col: 'full', tall: 1.5, say: 'For sitting in on the three warm days a year.', egg: { verb: 'Sit a while', x: 8, found: 'You sit a while. It is one of the three warm days, whatever the weather says.' } },
  { id: 'ld-hide', art: 'hide', name: 'The bird hide', x: 1, y: 43, w: 2, col: 'full', tall: 0.9, say: 'A slot to look through, and a long list of birds in pencil.' },
  { id: 'ld-boathouse', art: 'boathouse', name: 'The boathouse', x: 40, y: 21, w: 3, col: 'full', tall: 1.6, say: 'Nothing in it but the smell of boats.' },
  { id: 'ld-bridge', art: 'bridge', name: 'The little bridge', x: 46, y: 30, col: 'none', tall: 0.4, say: 'Over the brook on its way to the lake.' },
  { id: 'ld-arch-sw', art: 'gate', name: 'The west shore gate', x: 9, y: 21, col: 'none', tall: 1.9, say: 'Round the lake, the long way.' },
  // small places of their own: north
  { id: 'ld-falls', art: 'falls', name: 'The little falls', x: 38, y: 7, w: 2, col: 'full', tall: 2, say: 'It comes down off the hill and runs into the pond. You can hear it from the green.', egg: { verb: 'Look behind the water', curio: 1, found: 'There is a dry ledge behind the falls, and on it' } },
  { id: 'ld-grotto', art: 'grotto', name: 'The mossy grotto', x: 33, y: 7, w: 2, col: 'full', tall: 1.4, say: 'Ferns, a drip of water and a cold breath of air.', egg: { verb: 'Reach inside', c: 9, found: 'Your fingers find a little heap of coins, left for luck. You leave one and take nine.' } },
  { id: 'ld-hut', art: 'shepherd', name: 'The shepherd’s hut', x: 33, y: 5, col: 'full', tall: 1.4, say: 'On iron wheels, and it has not moved in years. The kettle is still on the stove.', egg: { verb: 'Look in the window', x: 6, found: 'A chair, a kettle, and a dog’s bowl with the name worn off. You feel you have met them.' } },
  { id: 'ld-folly', art: 'folly', name: 'The hilltop folly', x: 37, y: 1, w: 2, col: 'full', tall: 2.6, say: 'A tower with no stairs, put up to look nice from the village. It does.' },
  { id: 'ld-beacon', art: 'beacon', name: 'The old beacon', x: 29, y: 0, col: 'full', tall: 1.3, say: 'An iron basket on a post, for sending news a long way.', egg: { verb: 'Light it', tod: 'night', c: 11, found: 'It catches at once. Far off, somebody lights another. Eleven coins were left in the ash.', soon: 'Nobody would see it by day. Come back after dark.' } },
  { id: 'ld-warren', art: 'warren', name: 'The warren bank', x: 32, y: 4, col: 'full', tall: 0.5, say: 'More holes than bank. Something thumps twice underground when you stop.' },
  // east
  { id: 'ld-ring', art: 'ring', name: 'The ring of old trees', x: 48, y: 1, w: 4, col: 'full', tall: 1.8, say: 'Five huge trunks in a perfect ring. Nobody planted them on purpose, surely.', egg: { verb: 'Stand in the middle', x: 8, found: 'It goes very quiet. When you step out, it has been a bit longer than you thought.' } },
  { id: 'ld-hollow', art: 'hollow', name: 'The hollow oak', x: 41, y: 2, col: 'full', tall: 2.2, say: 'Big enough for a child to stand in. Somebody once did: there is a shelf.', egg: { verb: 'Feel along the shelf', curio: 1, found: 'Tucked at the back of the shelf' } },
  { id: 'ld-treehouse', art: 'treehouse', name: 'The treehouse', x: 44, y: 0, w: 2, col: 'full', tall: 2.8, say: 'The ladder has lost its bottom rungs, so the owner must be grown up by now.', egg: { verb: 'Pull the string', c: 5, found: 'A tin comes down on a pulley. A note says “password?” and there are five coins under it.' } },
  { id: 'ld-clamp', art: 'clamp', name: 'The charcoal clamp', x: 51, y: 3, col: 'full', tall: 0.8, say: 'A great turf mound, long gone cold. It still smells of smoke.' },
  { id: 'ld-barrels', art: 'barrels', name: 'Cider square', x: 48, y: 11, col: 'full', tall: 1, say: 'A small paved square, a stack of barrels and the smell of last autumn.', egg: { verb: 'Knock on the barrels', c: 6, found: 'Empty, empty, empty, and one that goes clink. Six coins.' } },
  // west
  { id: 'ld-pump', art: 'pump', name: 'Pump square', x: 8, y: 8, col: 'full', tall: 1.3, say: 'Everyone in the fields comes here for water and news.', egg: { verb: 'Work the handle', x: 5, found: 'It coughs, thinks about it, and gives you a very good cup of water.' } },
  { id: 'ld-boles', art: 'boles', name: 'The bee boles', x: 8, y: 4, col: 'full', tall: 1.2, say: 'Little niches in an old wall, made for straw hives before anybody can remember.' },
  // south and round the lake
  { id: 'ld-wish', art: 'wish', name: 'The wishing well', x: 46, y: 28, col: 'full', tall: 1.5, say: 'A small square, an old well, and a very long way down.', egg: { verb: 'Make a wish', c: 7, found: 'You drop nothing, because you have no need. Something drops seven coins back up.' } },
  { id: 'ld-mill', art: 'mill', name: 'The watermill', x: 40, y: 31, w: 3, col: 'full', tall: 1.9, say: 'The wheel stopped when the brook moved over. It has been waiting ever since.', egg: { verb: 'Look in the old sacks', curio: 1, found: 'Under the sacks, in the flour dust' } },
  { id: 'ld-rope', art: 'rope', name: 'The rope bridge', x: 46, y: 34, col: 'none', tall: 0.6, say: 'It sways more than the brook deserves.' },
  { id: 'ld-labyrinth', art: 'turf', name: 'The turf labyrinth', x: 42, y: 37, w: 3, col: 'full', tall: 0.2, say: 'A spiral cut in the grass, worn by feet. You can only walk it one way.', egg: { verb: 'Walk it', x: 7, found: 'You walk all the way in and all the way out. Nothing has changed, and yet.' } },
  { id: 'ld-smoke', art: 'smoke', name: 'The eel smokehouse', x: 48, y: 35, w: 3, col: 'full', tall: 1.5, say: 'A black little shed. Nothing has been smoked here for a long while, and yet.' },
  { id: 'ld-icehouse', art: 'ice', name: 'The ice house', x: 10, y: 35, w: 2, col: 'full', tall: 1, say: 'A turf dome with a very thick door. In summer it still breathes cold.', egg: { verb: 'Open the door a crack', c: 8, found: 'Cold air, the smell of straw, and a purse someone kept very safe. Eight coins.' } },
  { id: 'ld-frog', art: 'frogstone', name: 'The frog stone', x: 7, y: 25, col: 'full', tall: 0.8, say: 'A big stone that somebody thought looked like a frog, and helped along a bit.', egg: { verb: 'Sit and listen', tod: 'dusk', c: 6, found: 'At dusk every frog on the marsh starts up at once, and stops when you stand. Six coins on the stone.', soon: 'It only makes sense at dusk, people say.' } },
  { id: 'ld-churn', art: 'churn', name: 'The milk stand', x: 9, y: 23, col: 'full', tall: 0.9, say: 'Two churns, still waiting to be collected.' },
  { id: 'ld-driftwood', art: 'drift', name: 'The driftwood arch', x: 0, y: 34, w: 2, col: 'full', tall: 1.4, say: 'Somebody has been building this from what the marsh gives up, for years.' },
  { id: 'ld-sunk', art: 'sunken', name: 'The sunken pool', x: 30, y: 18, w: 2, col: 'full', tall: 0.2, say: 'Three stone steps down to a square of still water, right behind the shops. Everyone forgets it is there.', egg: { verb: 'Look in the water', c: 3, found: 'Three old coins on the bottom, and your own face looking pleased.' } },
  { id: 'ld-picnic', art: 'picnic', name: 'The picnic table', x: 33, y: 12, w: 2, col: 'soft', tall: 0.8, say: 'Somebody has carved a draughts board in the top.' },
  { id: 'ld-mile', art: 'mile', name: 'The milestone', x: 1, y: 19, col: 'soft', tall: 0.8, say: 'It says “0” on both sides. This is as far as anyone measured.', egg: { verb: 'Read the back', c: 2, found: 'On the back, small: “Well done for checking.” Two coins.' } },
  { id: 'ld-arch-se', art: 'gate', name: 'The east shore gate', x: 46, y: 23, col: 'none', tall: 1.9, say: 'Round the lake, the other long way.' },
].map(d => { const w = d.w || 1, r = Object.assign({ w: 1, h: 1, walk: 0, act: 'lf', kind: 'ld-' + d.art, blurb: d.say }, d, { lf: d.id });
  // where you stand to look at it: right there if it is a path, else the nearest ground beside it
  let best = null, bd = 1e9; for (let yy = d.y - 2; yy <= d.y + 3; yy++) for (let xx = d.x - 3; xx <= d.x + w + 2; xx++) { const c = gardenLandCell(xx, yy); if (!c || c.solid || c.pool || _gldDoorTaken(xx, yy) || c.fam === 'pond' && !(yy === 8 || yy === 11) || (xx >= d.x && xx < d.x + w && yy === d.y && d.col !== 'none')) continue; const n = Math.hypot(xx - d.x - w / 2 + 0.5, (yy - d.y - 0.5) * 0.9) + (c.trail || c.lane || c.green ? 0 : 0.6); if (n < bd) { bd = n; best = { x: xx, y: yy }; } }
  r.door = best || { x: d.x, y: d.y + 1 };
  return r; }));
/* The small paved squares, [x, y, rx, ry] in px for the last two (world cells); the brooks, as points they run through, ending in water or under a bridge. */
const GARDEN_LAND_SQUARES = _gdF([[48.5, 12.5, 40, 16], [8.5, 9.5, 34, 15], [46.5, 29.5, 34, 15], [27, 6.5, 34, 13], [36.5, 40.5, 40, 13], [9.5, 24.5, 34, 13], [5.5, 39.5, 30, 13], [30.5, 12.5, 30, 12]]);
const GARDEN_LAND_BROOKS = _gdF([
  _gdF([[38.6, 7.2], [38.2, 7.8], [37.4, 8.3], [37.6, 8.9], [37, 9.4]]),   // the little falls to the pond
  _gdF([[48.6, 30.7], [47.5, 30.2], [46.5, 30.5], [45.5, 30.9], [44.5, 30.3], [43.5, 30.7], [42.5, 30.3], [41.5, 30.8], [40.5, 30.4], [39.5, 30.5]]),   // past the mill to the lake
  _gdF([[49.5, 34.6], [48.5, 34.2], [47.5, 34.7], [46.5, 34.4], [45.6, 34.6]]),   // under the rope bridge to the sedge pool
]);
const _GLD_SIGHT = new Map(GARDEN_LAND_SIGHTS.map(d => [d.id, d]));
function gardenLandSight(id) { return _GLD_SIGHT.get(String(id)) || null; }

/* ---------- what you can collect ---------- */
const GARDEN_LAND_CURIOS = _gdRows([
  ['clay-pipe', 'Clay pipe', 'Someone sat here a long time ago.'], ['farthing', 'Old farthing', 'A wren on one side, worn nearly smooth.'], ['blue-bottle', 'Blue bottle', 'Tiny, cobalt and unbroken.'], ['sea-shell', 'Fossil shell', 'A long way from the sea.'],
  ['arrowhead', 'Flint arrowhead', 'Still sharp after all this time.'], ['token', 'Garden token', 'Good for one pint of something.'], ['tin-soldier', 'Tin soldier', 'Lost in a very old battle on the lawn.'], ['thimble', 'Silver thimble', 'It fits your little finger.'],
  ['marble', 'Glass marble', 'A twist of blue inside.'], ['horseshoe', 'Horseshoe', 'Hang it the right way up.'], ['ammonite', 'Ammonite', 'A perfect stone spiral.'], ['pot-shard', 'Painted pot shard', 'Half a bird on it.'],
  ['bird-ring', 'Bird ring', 'A tiny numbered ring. Where did it fly?'], ['stopper', 'Glass stopper', 'The bottle is still out there.'], ['button', 'Brass button', 'With an anchor on it.'], ['lead-seal', 'Lead seal', 'From a bale of cloth.'],
  ['bell', 'Little bell', 'It still rings.'], ['spoon', 'Bent spoon', 'Somebody was digging with it.'], ['key-tag', 'Copper key tag', 'It says 7. Seven what?'], ['dice', 'Bone dice', 'It always lands on four.'],
].map(([id, name, blurb]) => ({ id, name, blurb })));
const GARDEN_LAND_SKY = _gdRows([['plough', 'The Plough'], ['orion', 'Orion'], ['cassiopeia', 'Cassiopeia'], ['swan', 'The Swan'], ['lyre', 'The Lyre'], ['great-bear', 'The Great Bear'], ['lion', 'The Lion'], ['twins', 'The Twins'], ['bull', 'The Bull'], ['eagle', 'The Eagle'], ['crown', 'The Northern Crown'], ['hare', 'The Hare']].map(([id, name]) => ({ id, name })));
const GARDEN_LAND_MILESTONES = _gdF({ curios: _gdF([[5, 100], [10, 200], [15, 400], [20, 800]]), sky: _gdF([[6, 300], [12, 800]]), stars: _gdF([[1, 100], [2, 200], [3, 300], [4, 500], [5, 800]]) });
const GARDEN_LAND_STAR_AT = _gdF([12, 35, 70, 120, 180]);   // garden points for each star (gardenLandStars)
const GARDEN_LAND_SEASON_SEED = _gdF({ spring: 'tulip', summer: 'sunflower', autumn: 'pumpkin', winter: 'snowdrop' });
const GARDEN_LAND_FORAGE = _gdF({ spring: _gdF({ item: 'crop:primrose', name: 'primroses' }), summer: _gdF({ item: 'crop:strawberry', name: 'wild strawberries' }), autumn: _gdF({ item: 'crop:bramble', name: 'brambles' }), winter: _gdF({ item: 'crop:holly', name: 'a sprig of holly' }) });
const GARDEN_LAND_WILD = _gdF(['meadow', 'dell', 'wood', 'orchard', 'reed']);   // kinds where things can be foraged

/* ---------- what is open ---------- */
/**
 * Everything open in a garden, from what its owner has: own = ids (sections, features). Trails, and the old garden's free sections, open by level, each only once the way to it is open;
 * a section you bought always opens the way to it, so nothing you own can be stuck behind a gate if your level ever drops (an Undo, another device).
 */
function gardenLandsOpen(level, own) {
  const out = new Set(own || []);
  for (const z of GARDEN_ZONES) if ((level || 1) >= z.lv) out.add(z.id);
  for (const t of GARDEN_LAND_TRAILS) if ((level || 1) >= t.lv && (!t.from || out.has(t.from))) out.add(t.id);
  const walkBack = (id) => { let t = gardenLandRow(id), g = 0; while (t && g++ < 9) { out.add(t.id); t = t.from ? gardenLandRow(t.from) : null; } };
  for (const s of GARDEN_LAND_SECTIONS) {
    if (!s.buy && (level || 1) >= s.lv && (!s.via || out.has(s.via))) out.add(s.id);
    if (out.has(s.id) && s.via) walkBack(s.via);
  }
  // what you own keeps its zone open, and the zones on the way to it (land from before the zones, a path opened early with pegs): nothing you own is ever behind a gate
  let upto = 0;
  for (const id of out) { const q = gardenLandRow(id); if (q && q.zn) upto = Math.max(upto, q.zn); }
  for (let n = 1; n <= upto; n++) out.add('zn-' + n);
  return out;
}
/** A snapshot's land: {areas (for the scene and the walking: GARDEN_AREAS rows, sections, trails, features), land (what goes in gardenLandSet)}. */
function gardenLandsOfSnap(snap) {
  const areas = (snap.areas || []).filter(id => { const a = gardenArea(id); return a && !gardenLandRow(id) && !a.buy; }), own = (snap.ls || []).concat(snap.lf || []);
  if (Array.isArray(snap.lc) && snap.lc.length) own.push('finds');
  const open = gardenLandsOpen(snap.lv, own);
  return { areas: [...new Set(areas.concat([...open]))], land: [...open] };
}
/** What a snapshot may say about land: ids from these tables, numbers in bounds. Called by gardenSnapshotClean. */
function gardenLandsClean(raw, out) {
  if (Array.isArray(raw.ls)) out.ls = raw.ls.slice(0, 130).filter(id => typeof id === 'string' && gardenLandRow(id) && !!gardenLandRow(id).plot);
  if (Array.isArray(raw.lf)) out.lf = raw.lf.slice(0, 50).filter(id => typeof id === 'string' && !!gardenLandFeature(id));
  if (Array.isArray(raw.lc)) out.lc = raw.lc.slice(0, GARDEN_LAND_CURIOS.length + 1).filter(id => id === GARDEN_LAND_KEY_ID || GARDEN_LAND_CURIOS.some(c => c.id === id));
  if (Array.isArray(raw.lz)) out.lz = raw.lz.slice(0, GARDEN_LAND_SKY.length).filter(id => GARDEN_LAND_SKY.some(c => c.id === id));
  { const k = Number(raw.lr); if (Number.isInteger(k) && k > 0 && k <= 5) out.lr = k; }
}

/* ---------- what stands in the world ---------- */
const _GLD_PROPS = { key: null, built: [], at: new Map() };
function _gldMazeRects(f) {
  // the hedge as one box a run, so a row of hedge is one wall, and the chest as its own prop
  const out = [];
  GARDEN_LAND_MAZE.forEach((row, dy) => {
    let x0 = -1;
    for (let dx = 0; dx <= row.length; dx++) {
      const hedge = row[dx] === '#';
      if (hedge && x0 < 0) x0 = dx;
      if (!hedge && x0 >= 0) { out.push({ id: f.id + '-h' + dy + '-' + x0, name: f.name, x: f.x + x0, y: f.y + dy, w: dx - x0, h: 1, col: 'full', walk: 0 }); x0 = -1; }
    }
    const c = row.indexOf('C');
    if (c >= 0) out.push({ id: 'lf-chest', name: 'The maze chest', x: f.x + c, y: f.y + dy, w: 1, h: 1, col: 'soft', act: 'lf', lf: 'lf-chest', door: { x: f.x + c - 1, y: f.y + dy }, tall: 0.8, kind: 'lf-chest', blurb: 'Full again every week.' });
  });
  return out;
}
/** The rows of GARDEN_PROPS' shape that stand now: the land office and what has been built in the garden on screen. Rebuilt when the land changes (gardenLandSet). */
function gardenLandProps() { if (_GLD_PROPS.key === null) _gldPropsRebuild(); return _GLD_PROPS.built; }
function _gldPropsRebuild() {
  const built = [GARDEN_LAND_OFFICE, ...GARDEN_LAND_SIGHTS];
  if (_GD_LAND.has('finds') && !_GD_LAND.has('lf-museum')) built.push(GARDEN_LAND_FINDS);
  for (const f of GARDEN_LAND_FEATURES) {
    if (f.x == null || !_GD_LAND.has(f.id)) continue;
    if (f.does === 'maze') { built.push(..._gldMazeRects(f)); continue; }
    built.push({ id: f.id, name: f.name, x: f.x, y: f.y, w: f.w, h: f.h, col: f.col, walk: 0, act: 'lf', lf: f.id, door: f.door, kind: 'lf-' + f.art, tall: f.tall, blurb: f.blurb });
  }
  if (typeof gardenDesignLandProps === 'function') built.push(...gardenDesignLandProps());   // what you made in the designer: a small box at its foot, and nothing goes on top of it
  const at = new Map();
  for (const p of built) for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) at.set(x + ',' + y, p);
  _GLD_PROPS.built = built; _GLD_PROPS.at = at; _GLD_PROPS.key = 1;
}
function gardenLandPropsReset() { _GLD_PROPS.key = null; }
/** The land's prop on a cell, or null (gardenPropAt asks this first). */
function gardenLandPropAt(x, y) { if (_GLD_PROPS.key === null) _gldPropsRebuild(); return _GLD_PROPS.at.get(x + ',' + y) || null; }
/** Every prop there is now, for the code that goes through them all (the feet, the clicks, the fading): GARDEN_PROPS and the land's. */
function gardenPropsNow() { return GARDEN_PROPS.concat(gardenLandProps()); }

/* ---------- water, paths, and how things grow ---------- */
/** A cell of the land: is it water? null: the lake and the pond, which gardenIsWater knows from their own rectangles. */
function gardenLandWaterAt(x, y) {
  const c = gardenLandCell(x, y); if (!c) return null;
  if (c.solid && typeof gardenRegionWaterAt === 'function' && gardenRegionWaterAt(x, y)) return true;   // a region's own water, on the thicket (94-garden-regions-0table.js)
  if (c.fam === 'pond') return null;
  return !!c.pool;
}
/** A trail's cell: it stays clear, for walking (gardenCellOk). */
function gardenLandPathAt(x, y) { return gardenLandIsTrail(gardenLandCell(x, y)); }
/** How much faster a plant grows here (the kind of land, a scarecrow), and is it always in season. */
function gardenLandGrow(x, y) {
  const c = gardenLandCell(x, y); let k = c && c.plot && c.grow ? c.grow : 1;
  if (_GD_LAND.has('lf-scarecrow')) { const f = gardenLandFeature('lf-scarecrow'); if (Math.abs(x - f.x) <= f.r && Math.abs(y - f.y) <= f.r) k *= f.grow; }
  return k;
}
function gardenLandAlways(x, y) { const c = gardenLandCell(x, y); return !!(c && c.always); }
/** The whole cost of the land, for the numbers in docs/dev/GARDEN_PLAN.md. */
function gardenLandTotals() { return { sections: GARDEN_LAND_SECTIONS.length, trails: GARDEN_LAND_TRAILS.length, features: GARDEN_LAND_FEATURES.length, land: GARDEN_LAND_SECTIONS.reduce((n, s) => n + s.buy, 0), built: GARDEN_LAND_FEATURES.reduce((n, f) => n + f.cost, 0) }; }
/** Where the trees stand in the thickets: every so many cells, the same every time. For the drawing and nothing else. */
function gardenLandTrees() {
  const out = [], taken = new Set();
  for (const d of GARDEN_LAND_SIGHTS) for (let k = -1; k <= d.w; k++) taken.add((d.x + k) + ',' + d.y);
  // a tree is about three rows tall: nothing stands in the rows just in front of something you would want to see
  const front = (p) => { const w = Math.ceil(p.w || 1), h = Math.ceil(p.h || 1), x0 = Math.floor(p.x); for (let k = -1; k <= w; k++) for (let dy = 0; dy < 3; dy++) taken.add((x0 + k) + ',' + (Math.floor(p.y) + h + dy)); };
  for (const d of GARDEN_LAND_SIGHTS) if ((d.tall || 1) >= 0.5 && d.art !== 'bridge') front(d);
  for (const g of GARDEN_ZONE_GATES) front(g);
  for (const f of GARDEN_LAND_FEATURES) if (f.x != null && f.does !== 'maze') front(f);
  for (const p of GARDEN_PROPS) if (!p.walk && p.kind && p.y < 21) front(p);
  front(GARDEN_LAND_OFFICE); front(GARDEN_LAND_FINDS);
  for (const [rid, M] of Object.entries(GARDEN_LAND_MAPS)) M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) if (row[dx] === '#' && gardenHash(rid + dx + ',' + dy) % 5 === 0 && !taken.has((M.x + dx) + ',' + (M.y + dy)) && !(typeof gardenRegionWaterAt === 'function' && gardenRegionWaterAt(M.x + dx, M.y + dy))) out.push({ x: M.x + dx, y: M.y + dy, theme: M.theme }); });
  return out;
}

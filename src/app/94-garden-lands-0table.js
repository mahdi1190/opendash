/* ============================================================
   GARDEN, the land (the tables). The owner, 1 Nov 2026: "all of the purchasable land is WAY TOO BIG ... split into way more paths and sections that go up and
   down not just across, different kinds of lands ... we can still buy stuff but not entire plots, maybe certain features within unlockable lands". PURE: tables and
   small functions, nothing drawn at load and no DOM or state, so Node can evaluate it after the catalogue (lib/friends/garden.mjs, lib/agent-engine.mjs).
   What each thing is and costs, in plain words: docs/dev/GARDEN_PLAN.md.

   The four big plots of GARDEN_AREAS (hill, grove, field, marsh) stay where they are, in that table, under the same ids. Each is now drawn out as a map below, one
   character a cell: a digit or sign is a trail (a path that opens with your level), a letter is a section (a small piece of land you buy, from a level).
     GARDEN_LAND_KINDS     the kinds of land: {tile, cats (what grows), grow (growth x), always (always in season), pool (it is water)}
     GARDEN_LAND_TRAILS    {id, ch, name, lv, from: the trail it leads on from ('' = the lane)}
     GARDEN_LAND_SECTIONS  {id, plot, ch, name, kind, lv, buy, via: the trail its door is on ('' = the lane), needs?, cells, door, x, y, w, h}
     GARDEN_LAND_FEATURES  things you build in a section: {id, name, sec, x, y, w, h, door, lv, cost, does, ...}; the engine: 94-garden-lands-1core.js
     GARDEN_LAND_CURIOS, GARDEN_LAND_SKY    what you can collect

   SAVED GAMES. Someone who bought a whole plot has 'land:hill' in their ledger: that row keeps working and is never sold again. For them every cell of the plot
   answers as the old plot did (gardenAreaAt -> 'hill': the old plants' rules, no fences, no path keeping them off a cell, the marsh's whole pool), and every section in
   it counts as theirs. Section ids, trail ids and feature ids are stable, like every id in the garden: never rename or reuse one.
   FRIENDS. `areas` in a snapshot stays at most 12 ids of GARDEN_AREAS: an older app reads it and sees a plot as open if any of it is yours. The real answer goes in
   `ls` (sections, and a whole plot's id if you have one), `lf` (features built), `lc` (curios found, and the old key), `lz` (stars logged), `lr` (garden stars), which an older app drops.
   THE OWNER'S RULE: whatever you buy or find shows in the world, and a friend sees it. So everything here has a drawing (94-garden-lands-2art.js) and goes in those fields; nothing is only a number.
   ============================================================ */
const GARDEN_LAND_KINDS = _gdF({
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
/* The plots, one character a cell. Every cell of a plot is a section or a trail; check any change with a throwaway script before it ships (every section touches its `via`, every trail its `from`). */
const GARDEN_LAND_MAPS = _gdF({
  hill: _gdF({ x: 28, y: 0, rows: _gdF([
    'AAAAAACCCCCCDDDD', 'AAAAAA333CCCDDDD', 'AAA3333E33333DDD', 'BBB3EEEEFFFF3GGG', 'BBB3EEEEFFFF3GGG', 'BBB22222FFFF4444', 'HHHHIII222JJJKKK', 'HHHHIIIII2JJJKKK', 'LLLLLL1111JJJKKK', 'LLLL111MMMNNNOOO', 'LLLL1MMMMMNNNOOO']) }),
  grove: _gdF({ x: 44, y: 0, rows: _gdF([
    'PPPPPQQQQQQRRRRR', 'PPPPQQQQQ8888SSS', 'TTT8888888UU8SSS', 'T4777777VVUU8SSS', 'T4WWWWW7VVUU8XXX', '44WWWWW777YYYXXX', 'ZZZZaaaaa7YYYXXX', 'ZZZZaa6666bbb9cc', 'dddd666eeebbb9cc', 'dddd6eeeeefff9gg', 'dddd6hhhhhfff9gg']) }),
  field: _gdF({ x: 28, y: 13, rows: _gdF([
    'jjj+kkkkkkkk=lll', 'jjj+kkkkkkkk=lll', 'mmm+nnnnnooo=lll', 'mmm++++nnnoo=ppp', 'qqqqqq++++oo=ppp', 'qqqqqrrrr*ss====', 'qqqqqrrrr*sstttt', 'vvvvv*****sstttt', 'vv****xxxxxzzzzz', 'vv&xxxxyyyyzzzzz', 'vv&xxxxyyyyzzzzz',
    'vv&&&&&&&&&&&zzz', 'MMMMMMMMbbbb%ddd', 'MMMMMMMMbbbb%ddd', 'MMMMMMMMcccc%ddd', 'MMMMMMMMcccc%ddd', 'MMMMMMMMcccc%ddd']) }),
  marsh: _gdF({ x: 44, y: 13, rows: _gdF([
    'aaaa$bbbbbbb@ccc', 'aaaa$bbbbbbb@ccc', 'dddd$$$$$eee@ccc', 'dddfffff$eee@ggg', 'hhhfffff$iii@ggg', '===jjjjj$iii@ggg', 'kkkjjjjj$lll@mmm', 'kkknnnnn$$$$@mmm', 'kkknnnnnoooo@mmm', 'pppnnnnnoooo@qqq',
    'ppp!rrrr^^^^@qqq', 'ppp!rrrr^sss@qqq', 'ttt!rrrr^sss@qqq', 'ttt!!!!!^^^^@vvv', 'www!uuuuxxxx@vvv', 'www!uuuuxxxx@vvv', 'www!yyyyzzzz@vvv']) }),
});
/* A trail's level is when its gate opens. `from` is the way to it, so a trail never opens before the one that leads to it. */
const GARDEN_LAND_TRAILS = _gdRows([
  { id: 'lt-bramble', ch: '1', name: 'Bramble path', lv: 2, from: '' },
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
  { id: 'lt-furrow', ch: '=', name: 'Long furrow', lv: 6, from: '' },
  { id: 'lt-board', ch: '$', name: 'The boardwalk', lv: 7, from: '' },
  { id: 'lt-reed', ch: '@', name: 'Reed causeway', lv: 9, from: '' },
  { id: 'lt-heron', ch: '^', name: 'Heron walk', lv: 14, from: 'lt-reed' },
  { id: 'lt-willow', ch: '!', name: 'Willow ways', lv: 18, from: 'lt-heron' },
]);
/* [plot, map character, id, name, kind, level, coins, via (a trail's character, '' = on the lane), needs?]. Early ones are on the lane and cheap; coins come at up to 120 a day (GARDEN_ECON.dayCap), so the late ones are days of it each. */
const _GLD_SECTION_ROWS = [
  ['hill', 'O', 'ls-clover-corner', 'Clover corner', 'meadow', 2, 30, ''], ['hill', 'N', 'ls-buttercup-bank', 'Buttercup bank', 'meadow', 2, 40, ''], ['hill', 'M', 'ls-sunny-doorstep', 'Sunny doorstep', 'herb', 3, 60, ''], ['hill', 'L', 'ls-blackbird-corner', 'Blackbird corner', 'berry', 3, 70, ''],
  ['hill', 'I', 'ls-foxglove-strip', 'Foxglove strip', 'dell', 5, 90, '1'], ['hill', 'H', 'ls-fern-hollow', 'Fern hollow', 'dell', 5, 100, '2'], ['hill', 'J', 'ls-warm-stones', 'Warm stones', 'rock', 6, 140, '1'], ['hill', 'B', 'ls-thyme-terrace', 'Thyme terrace', 'herb', 6, 150, '2'],
  ['hill', 'E', 'ls-bee-bank', 'Bee bank', 'meadow', 9, 220, '3'], ['hill', 'F', 'ls-orchid-slope', 'Orchid slope', 'meadow', 9, 240, '3'], ['hill', 'G', 'ls-rabbit-warren', 'Rabbit warren', 'meadow', 10, 260, '3'], ['hill', 'A', 'ls-skylark-top', 'Skylark top', 'meadow', 10, 300, '3'],
  ['hill', 'C', 'ls-long-view', 'The long view', 'rock', 11, 330, '3'], ['hill', 'K', 'ls-cowslip-rise', 'Cowslip rise', 'meadow', 12, 260, '4'], ['hill', 'D', 'ls-high-pasture', 'High pasture', 'meadow', 12, 380, '3'],
  ['grove', 'g', 'ls-gate-pear', 'Gate pear', 'orchard', 4, 60, ''], ['grove', 'f', 'ls-windfall', 'Windfall corner', 'orchard', 4, 80, ''], ['grove', 'h', 'ls-crab-row', 'Crab apple row', 'orchard', 5, 110, ''], ['grove', 'd', 'ls-old-plum', 'The old plum', 'orchard', 5, 120, ''],
  ['grove', 'e', 'ls-apple-row', 'Apple row', 'orchard', 6, 170, '6'], ['grove', 'a', 'ls-medlar-strip', 'Medlar strip', 'orchard', 7, 150, '6'], ['grove', 'b', 'ls-cherry-row', 'Cherry row', 'orchard', 8, 210, '6'], ['grove', 'c', 'ls-cider-nook', 'Cider nook', 'orchard', 8, 180, '9'],
  ['grove', 'Y', 'ls-damson-dip', 'Damson dip', 'orchard', 11, 300, '7'], ['grove', 'V', 'ls-walnut-shade', 'Walnut shade', 'wood', 11, 310, '7'], ['grove', 'X', 'ls-nursery', 'The nursery', 'nursery', 12, 380, '9'], ['grove', 'W', 'ls-bluebell-wood', 'Bluebell wood', 'dell', 12, 360, '7'],
  ['grove', 'Z', 'ls-hazel-copse', 'Hazel copse', 'wood', 13, 400, '4'], ['grove', 'T', 'ls-ivy-corner', 'Ivy corner', 'dell', 13, 400, '4'], ['grove', 'U', 'ls-espalier', 'The espalier', 'berry', 15, 520, '8'], ['grove', 'S', 'ls-walled-garden', 'The walled garden', 'suntrap', 15, 1200, '8', 'key:old'],
  ['grove', 'P', 'ls-owl-wood', 'Owl wood', 'wood', 16, 640, '8'], ['grove', 'Q', 'ls-sun-terrace', 'Sun terrace', 'suntrap', 16, 900, '8'], ['grove', 'R', 'ls-beech-top', 'Beech top', 'wood', 17, 720, '8'],
  ['field', 'j', 'ls-first-furrow', 'First furrow', 'veg', 3, 40, ''], ['field', 'k', 'ls-allot-row', 'Allotment row', 'veg', 3, 90, ''], ['field', 'l', 'ls-bean-corner', 'Bean corner', 'veg', 4, 80, ''], ['field', 'm', 'ls-onion-bed', 'Onion bed', 'veg', 4, 90, '+'], ['field', 'n', 'ls-salad-strip', 'Salad strip', 'veg', 4, 70, '+'],
  ['field', 'o', 'ls-pumpkin-nook', 'Pumpkin nook', 'rich', 6, 150, '+'], ['field', 'p', 'ls-strawberry-bank', 'Strawberry bank', 'berry', 6, 140, '='], ['field', 't', 'ls-rhubarb-patch', 'Rhubarb patch', 'berry', 7, 170, '='],
  ['field', 'q', 'ls-potato-ground', 'Potato ground', 'rich', 8, 240, '+'], ['field', 'r', 'ls-bean-beds', 'Bean beds', 'veg', 8, 200, '*'], ['field', 's', 'ls-seedling-rows', 'Seedling rows', 'veg', 8, 150, '*'],
  ['field', 'v', 'ls-herb-wall', 'Herb wall', 'herb', 13, 360, '&'], ['field', 'x', 'ls-black-soil', 'Black soil', 'rich', 13, 420, '&'], ['field', 'y', 'ls-pea-sticks', 'Pea sticks', 'veg', 13, 380, '&'], ['field', 'M', 'ls-maze-ground', 'The maze ground', 'meadow', 13, 700, '&'],
  ['field', 'z', 'ls-market-beds', 'Market beds', 'rich', 14, 560, '&'], ['field', 'b', 'ls-giant-veg', 'Giant veg ground', 'rich', 18, 900, '%'], ['field', 'd', 'ls-deep-loam', 'Deep loam', 'rich', 18, 780, '%'], ['field', 'c', 'ls-prize-beds', 'The prize beds', 'rich', 20, 1100, '%'],
  ['marsh', 'a', 'ls-frog-steps', 'Frog steps', 'reed', 4, 70, ''], ['marsh', 'c', 'ls-kingcup', 'Kingcup corner', 'reed', 5, 100, ''], ['marsh', 'b', 'ls-bulrush-edge', 'Bulrush edge', 'reed', 5, 120, ''],
  ['marsh', 'h', 'ls-snipe-rough', 'Snipe rough', 'reed', 7, 130, '='], ['marsh', 'd', 'ls-willow-foot', 'Willow foot', 'reed', 7, 160, '$'], ['marsh', 'f', 'ls-lily-pool', 'Lily pool', 'pool', 7, 220, '$'], ['marsh', 'e', 'ls-dragonfly-bank', 'Dragonfly bank', 'reed', 8, 170, '$'], ['marsh', 'j', 'ls-sedge-isle', 'Sedge isle', 'reed', 8, 190, '$'], ['marsh', 'k', 'ls-alder-carr', 'Alder carr', 'wood', 8, 210, '='],
  ['marsh', 'l', 'ls-tiny-isle', 'Tiny isle', 'reed', 9, 110, '$'], ['marsh', 'i', 'ls-reed-isle', 'Reed isle', 'reed', 9, 130, '$'], ['marsh', 'g', 'ls-marigold-bank', 'Marigold bank', 'reed', 9, 190, '@'], ['marsh', 'm', 'ls-otter-holt', 'Otter holt', 'wood', 10, 240, '@'], ['marsh', 'n', 'ls-deep-pool', 'Deep pool', 'pool', 10, 320, '$'],
  ['marsh', 'q', 'ls-heronry', 'The heronry', 'wood', 12, 360, '@'], ['marsh', 'r', 'ls-clear-pool', 'Clear pool', 'pool', 14, 520, '^'], ['marsh', 's', 'ls-heron-isle', 'Heron isle', 'reed', 14, 420, '^'], ['marsh', 'x', 'ls-iris-bed', 'Iris bed', 'reed', 15, 500, '^'], ['marsh', 'v', 'ls-far-willows', 'Far willows', 'wood', 15, 480, '@'],
  ['marsh', 'o', 'ls-moon-pool', 'Moon pool', 'pool', 16, 900, '$'], ['marsh', 'z', 'ls-stone-pool', 'Stone pool', 'pool', 17, 760, '@'], ['marsh', 'p', 'ls-silver-birches', 'Silver birches', 'wood', 18, 700, '!'], ['marsh', 't', 'ls-mist-meadow', 'Mist meadow', 'meadow', 18, 720, '!'],
  ['marsh', 'u', 'ls-exotic-glade', 'Exotic glade', 'exotic', 19, 1000, '!'], ['marsh', 'w', 'ls-hermit-corner', 'Hermit corner', 'exotic', 20, 1200, '!'], ['marsh', 'y', 'ls-last-bank', 'The last bank', 'reed', 20, 900, '!'],
];
/* The cell grid: what each cell of a plot is. */
const _GLD_GRID = new Array(GARDEN_WORLD.cols * GARDEN_WORLD.rows).fill(null);
const _GLD_TRAIL_BY_CH = new Map(GARDEN_LAND_TRAILS.map(t => [t.ch, t]));
function _gldCellsOf(pred) { const out = []; for (const [plot, M] of Object.entries(GARDEN_LAND_MAPS)) M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) if (pred(plot, row[dx])) out.push([M.x + dx, M.y + dy]); }); return out; }
const GARDEN_LAND_SECTIONS = _gdRows(_GLD_SECTION_ROWS.map(([plot, ch, id, name, kind, lv, buy, via, needs]) => {
  const K = GARDEN_LAND_KINDS[kind], cells = _gldCellsOf((p, c) => p === plot && c === ch);
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]), x = Math.min(...xs), y = Math.min(...ys);
  const r = { id, plot, ch, name, kind, lv, buy, viaCh: via, via: via ? _GLD_TRAIL_BY_CH.get(via).id : '', needs: needs || '', cells: _gdF(cells), x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1, tile: K.tile, cats: K.cats, icon: K.icon, blurb: K.says || K.name };
  if (K.always) r.always = 1; if (K.grow) r.grow = K.grow; if (K.pool) r.pool = 1;
  return r;
}));
const _GLD_ROW = new Map();
for (const t of GARDEN_LAND_TRAILS) { _GLD_ROW.set(t.id, t); for (const [x, y] of _gldCellsOf((p, c) => c === t.ch)) _GLD_GRID[y * GARDEN_WORLD.cols + x] = t; }
for (const s of GARDEN_LAND_SECTIONS) { _GLD_ROW.set(s.id, s); _GD_AREA.set(s.id, s); for (const [x, y] of s.cells) _GLD_GRID[y * GARDEN_WORLD.cols + x] = s; }
for (const t of GARDEN_LAND_TRAILS) _GD_AREA.set(t.id, t);   // (so a 'locked:' answer can be looked up like any other)
/** What a cell of the plots is: a section's row, a trail's row, or null (not in a plot). */
function gardenLandCell(x, y) { const W = GARDEN_WORLD; return x >= 0 && y >= 0 && x < W.cols && y < W.rows ? _GLD_GRID[y * W.cols + x] : null; }
function gardenLandIsTrail(r) { return !!r && !r.plot; }
function gardenLandRow(id) { return _GLD_ROW.get(String(id)) || null; }
const _GLD_LANE = _gdF({ y0: 11, y1: 12, x0: 28 });
/** The cell you stand on to knock at a section: on its trail or the lane, the one nearest its middle. Worked out once. */
const _GLD_DOORS = new Map();
function gardenLandDoor(s) {
  if (_GLD_DOORS.has(s.id)) return _GLD_DOORS.get(s.id);
  let best = null, bd = 1e9;
  const mx = s.x + s.w / 2, my = s.y + s.h / 2;
  for (const [x, y] of s.cells) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const cx = x + dx, cy = y + dy, c = gardenLandCell(cx, cy);
    const ok = s.via ? (c && c.id === s.via) : (cy >= _GLD_LANE.y0 && cy <= _GLD_LANE.y1 && cx >= _GLD_LANE.x0);
    if (!ok) continue;
    const d = Math.hypot(cx + 0.5 - mx, cy + 0.5 - my);
    if (d < bd) { bd = d; best = { x: cx, y: cy, fx: x, fy: y }; }
  }
  _GLD_DOORS.set(s.id, best);
  return best;
}

/* ---------- things you build ----------
   does: 'collect' (every `per` you take `give`), 'post', 'machine', and the rest by name in 94-garden-lands-1core.js. per: 'day' | '2day' | 'week' | 'season'; tod: only at that time of day.
   sec: the section it stands in ('' = on the lane). col: what it does to your feet. */
const GARDEN_LAND_FEATURES = _gdRows([
  { id: 'lf-post-lane', name: 'Way post on the lane', art: 'post', does: 'post', sec: '', x: 33, y: 11, w: 1, h: 1, door: { x: 33, y: 12 }, col: 'soft', lv: 2, cost: 30, tall: 1.5, icon: 'milestone', blurb: 'Build two way posts and you can hop between them.' },
  { id: 'lf-barrel', name: 'Rain barrel', art: 'barrel', does: 'barrel', sec: 'ls-clover-corner', x: 42, y: 9, w: 1, h: 1, door: { x: 42, y: 10 }, col: 'soft', lv: 3, cost: 60, tall: 1.1, water: 3, icon: 'droplets', blurb: 'Three more cans of water every day.' },
  { id: 'lf-stone', name: 'Lucky stone', art: 'stone', does: 'collect', per: 'day', give: { coins: [3, 10] }, verb: 'Knock on the stone', sec: 'ls-buttercup-bank', x: 39, y: 9, w: 1, h: 1, door: { x: 39, y: 10 }, col: 'soft', lv: 3, cost: 50, tall: 0.9, icon: 'coins', blurb: 'Knock on it once a day. A few coins always fall out, nobody knows why.' },
  { id: 'lf-worms', name: 'Worm bin', art: 'worms', does: 'collect', per: '2day', give: { i: { fertiliser: 1 } }, verb: 'Take the fertiliser', sec: 'ls-first-furrow', x: 29, y: 13, w: 1, h: 1, door: { x: 29, y: 14 }, col: 'soft', lv: 4, cost: 80, tall: 0.9, icon: 'recycle', blurb: 'A bag of free fertiliser every two days.' },
  { id: 'lf-arch', name: 'Seasons arch', art: 'arch', does: 'collect', per: 'season', give: { season: 1, x: 10 }, verb: 'Take this season’s seed', sec: 'ls-sunny-doorstep', x: 35, y: 9, w: 2, h: 1, door: { x: 35, y: 10 }, col: 'none', lv: 5, cost: 120, tall: 1.9, icon: 'flower', blurb: 'Changes with the year, and leaves you a free seed each season.' },
  { id: 'lf-boots', name: 'Stout boots', art: 'boots', does: 'boots', sec: '', x: 32, y: 11, w: 1, h: 1, door: { x: 32, y: 12 }, col: 'none', lv: 5, cost: 150, tall: 0.7, icon: 'footprints', blurb: 'You walk a good bit faster everywhere. They stand by the land office door when you are not in them.' },
  { id: 'lf-scarecrow', name: 'Scarecrow', art: 'scarecrow', does: 'scarecrow', sec: 'ls-allot-row', x: 36, y: 13, w: 1, h: 1, door: { x: 36, y: 14 }, col: 'soft', lv: 6, cost: 140, tall: 1.7, grow: 1.1, r: 4, icon: 'wheat', blurb: 'Plants near it grow a tenth faster. Dresses for the season.' },
  { id: 'lf-stars', name: 'Garden stars board', art: 'stars', does: 'stars', sec: 'ls-sunny-doorstep', x: 37, y: 9, w: 1, h: 1, door: { x: 37, y: 10 }, col: 'soft', lv: 6, cost: 120, tall: 1.6, icon: 'star', blurb: 'Rates your garden out of five stars and pays for each one. Friends can read it.' },
  { id: 'lf-skeps', name: 'Bee skeps', art: 'skeps', does: 'collect', per: '2day', give: { i: { honey: 1 }, x: 2 }, verb: 'Take the honey', sec: 'ls-foxglove-strip', x: 34, y: 6, w: 1, h: 1, door: { x: 34, y: 7 }, col: 'soft', lv: 6, cost: 160, tall: 1.1, icon: 'flower', blurb: 'Old straw hives: a jar of honey every two days.' },
  { id: 'lf-help', name: 'Help wanted board', art: 'help', does: 'help', sec: 'ls-onion-bed', x: 29, y: 15, w: 1, h: 1, door: { x: 29, y: 16 }, col: 'soft', lv: 7, cost: 150, tall: 1.6, icon: 'flag', blurb: 'A neighbour asks for something you grow, once a week, and pays well for it.' },
  { id: 'lf-kettle', name: 'Jam kettle', art: 'kettle', does: 'machine', input: 'fruit', n: 5, hours: 24, mult: 2.5, sec: 'ls-windfall', x: 55, y: 9, w: 1, h: 1, door: { x: 55, y: 10 }, col: 'soft', lv: 7, cost: 220, tall: 1.1, icon: 'cherry', blurb: 'Five pieces of fruit, a day on the stove, and it sells for much more.' },
  { id: 'lf-rack', name: 'Drying rack', art: 'rack', does: 'machine', input: 'herb', n: 5, hours: 48, mult: 3, sec: 'ls-thyme-terrace', x: 29, y: 3, w: 1, h: 1, door: { x: 29, y: 4 }, col: 'soft', lv: 8, cost: 260, tall: 1.3, icon: 'leaf', blurb: 'Five bunches of herbs, two days in the air, three times the price.' },
  { id: 'lf-swap', name: 'Seed swap shelf', art: 'shelf', does: 'swap', sec: 'ls-cider-nook', x: 58, y: 7, w: 1, h: 1, door: { x: 58, y: 8 }, col: 'soft', lv: 8, cost: 180, tall: 1.4, icon: 'sprout', blurb: 'Once a day, leave five common seeds and take a better one.' },
  { id: 'lf-post-field', name: 'Way post in the field', art: 'post', does: 'post', sec: 'ls-seedling-rows', x: 38, y: 18, w: 1, h: 1, door: { x: 38, y: 19 }, col: 'soft', lv: 8, cost: 100, tall: 1.5, icon: 'milestone', blurb: 'Hop here from any other way post.' },
  { id: 'lf-rill', name: 'Spring rill', art: 'rill', does: 'rill', sec: 'ls-potato-ground', x: 30, y: 18, w: 1, h: 1, door: { x: 30, y: 19 }, col: 'none', lv: 9, cost: 320, tall: 0.5, r: 4, icon: 'waves', blurb: 'A little spring: everything planted near it is watered every morning.' },
  { id: 'lf-post-hill', name: 'Way post on the hill', art: 'post', does: 'post', sec: 'ls-orchid-slope', x: 37, y: 3, w: 1, h: 1, door: { x: 37, y: 4 }, col: 'soft', lv: 9, cost: 120, tall: 1.5, icon: 'milestone', blurb: 'Hop here from any other way post.' },
  { id: 'lf-post-marsh', name: 'Way post on the marsh', art: 'post', does: 'post', sec: 'ls-marigold-bank', x: 58, y: 16, w: 1, h: 1, door: { x: 58, y: 17 }, col: 'soft', lv: 9, cost: 120, tall: 1.5, icon: 'milestone', blurb: 'Hop here from any other way post.' },
  { id: 'lf-lamps', name: 'Lantern walk', art: 'lampbox', does: 'lamps', sec: 'ls-blackbird-corner', x: 31, y: 8, w: 1, h: 1, door: { x: 31, y: 9 }, col: 'soft', lv: 10, cost: 240, tall: 1, icon: 'lamp', blurb: 'Lamps along the lane that come on at dusk. Friends see them too.' },
  { id: 'lf-museum', name: 'Little museum', art: 'museum', does: 'museum', sec: 'ls-apple-row', x: 51, y: 8, w: 2, h: 1, door: { x: 51, y: 9 }, col: 'full', lv: 10, cost: 500, tall: 2.2, icon: 'landmark', blurb: 'Show the curios you dig up, and be paid as the collection grows. Friends can look in.' },
  { id: 'lf-post-grove', name: 'Way post in the grove', art: 'post', does: 'post', sec: 'ls-walnut-shade', x: 52, y: 3, w: 1, h: 1, door: { x: 52, y: 4 }, col: 'soft', lv: 11, cost: 150, tall: 1.5, icon: 'milestone', blurb: 'Hop here from any other way post.' },
  { id: 'lf-lookout', name: 'Lookout tower', art: 'lookout', does: 'lookout', per: 'day', sec: 'ls-long-view', x: 36, y: 0, w: 2, h: 1, door: { x: 36, y: 1 }, col: 'full', lv: 11, cost: 300, tall: 3, icon: 'eye', blurb: 'Climb up and see the whole of your land. Friends can climb it too.' },
  { id: 'lf-dew', name: 'Dew stone', art: 'dew', does: 'collect', per: 'day', tod: 'dawn', give: { dew: 5, x: 3 }, verb: 'Gather the dew', sec: 'ls-fern-hollow', x: 29, y: 6, w: 1, h: 1, door: { x: 29, y: 7 }, col: 'soft', lv: 11, cost: 260, tall: 0.8, dew: 5, icon: 'droplets', blurb: 'Go there at dawn: five more cans of water for the day.' },
  { id: 'lf-oak', name: 'Savings oak', art: 'oak', does: 'oak', sec: 'ls-bluebell-wood', x: 49, y: 4, w: 1, h: 1, door: { x: 49, y: 5 }, col: 'soft', lv: 12, cost: 400, tall: 2, icon: 'coins', blurb: 'Bury coins at its roots. In a week they come back with a little more.' },
  { id: 'lf-maze', name: 'Hedge maze', art: 'maze', does: 'maze', sec: 'ls-maze-ground', x: 28, y: 25, w: 8, h: 5, door: { x: 30, y: 24 }, col: 'full', lv: 14, cost: 900, tall: 1, icon: 'trees', blurb: 'A little maze with a chest in the middle, full again every week. Friends can get lost in it.' },
  { id: 'lf-observatory', name: 'Observatory', art: 'observatory', does: 'observatory', per: 'day', tod: 'night', sec: 'ls-high-pasture', x: 41, y: 0, w: 2, h: 1, door: { x: 41, y: 1 }, col: 'full', lv: 15, cost: 1400, tall: 2.6, icon: 'star', blurb: 'At night, log the stars you can see. Twelve to find in all.' },
  { id: 'lf-moon', name: 'Moon stone', art: 'moon', does: 'collect', per: 'day', tod: 'night', give: { i: { fertiliser: 1 }, x: 2 }, verb: 'Take the moon water', sec: 'ls-marigold-bank', x: 59, y: 18, w: 1, h: 1, door: { x: 58, y: 18 }, col: 'soft', lv: 16, cost: 1100, tall: 1.2, icon: 'sparkles', blurb: 'Only at night: it gathers water that feeds a plant like fertiliser, and it glows.' },
  { id: 'lf-circle', name: 'Stone circle', art: 'circle', does: 'collect', per: 'season', give: { x: 150, i: { 'seed:*rare': 1 } }, verb: 'Stand in the circle', sec: 'ls-mist-meadow', x: 44, y: 25, w: 3, h: 1, door: { x: 45, y: 26 }, col: 'none', lv: 20, cost: 2400, tall: 1.3, icon: 'mountain', blurb: 'Stand in it once each season for a big share of experience and a rare seed.' },
]);
const _GLD_FEAT = new Map(GARDEN_LAND_FEATURES.map(f => [f.id, f]));
function gardenLandFeature(id) { return _GLD_FEAT.get(String(id)) || null; }
/* The maze, one character a cell over its footprint: # is hedge, C the chest. Gate at the top, from the Cabbage steps. */
const GARDEN_LAND_MAZE = _gdF(['##.#####', '#...#.C#', '###.#.##', '#.....##', '########']);
const GARDEN_LAND_OFFICE = _gdF({ id: 'land-office', name: 'Land office', x: 29, y: 11, w: 3, h: 1, door: _gdF({ x: 30, y: 12 }), act: 'lands', kind: 'lf-office', tall: 2.4, verb: 'look at the land', blurb: 'What you can buy and build, and what is still to come.' });
const GARDEN_LAND_LAMPS = _gdF([36, 41, 46, 51, 56]);   // x along the lane's north edge
/* Your finds, laid out on a table on the lane from the first one you dig up, until a museum takes them in. */
const GARDEN_LAND_FINDS = _gdF({ id: 'land-finds', name: 'Your finds', x: 34, y: 11, w: 2, h: 1, col: 'soft', walk: 0, act: 'lf', lf: 'land-finds', door: _gdF({ x: 34, y: 12 }), kind: 'lf-finds', tall: 1, blurb: 'What has turned up so far.' });
const GARDEN_LAND_KEY_ID = 'old-key';

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
 * Everything open in a garden, from what its owner has: own = ids (a whole plot, sections, features). Trails open by level, each only once the one before it is open; a section
 * you have always opens the way to it, so nothing you own can be stuck behind a gate if your level ever drops (an Undo, another device).
 */
function gardenLandsOpen(level, own) {
  const out = new Set(own || []);
  for (const t of GARDEN_LAND_TRAILS) if ((level || 1) >= t.lv && (!t.from || out.has(t.from))) out.add(t.id);
  const walkBack = (id) => { let t = gardenLandRow(id), g = 0; while (t && g++ < 9) { out.add(t.id); t = t.from ? gardenLandRow(t.from) : null; } };
  for (const s of GARDEN_LAND_SECTIONS) {
    if (out.has(s.plot)) { out.add(s.id); continue; }
    if (out.has(s.id) && s.via) walkBack(s.via);
  }
  return out;
}
/** A snapshot's land: {areas (for the scene and the walking: GARDEN_AREAS rows, sections, trails, features), land (what goes in gardenLandSet)}. No `ls`: an older friend, whose plots are whole. */
function gardenLandsOfSnap(snap) {
  const base = (snap.areas || []).filter(id => { const a = gardenArea(id); return a && !gardenLandRow(id); });
  let areas = base; const own0 = [];
  if (Array.isArray(snap.lc) && snap.lc.length) own0.push('finds');
  if (Array.isArray(snap.ls)) { const whole = new Set(snap.ls); areas = base.filter(id => { const a = gardenArea(id); return !(a && a.buy) || whole.has(id); }); }
  const own = areas.filter(id => { const a = gardenArea(id); return a && a.buy; }).concat(snap.ls || [], snap.lf || [], own0);
  const open = gardenLandsOpen(snap.lv, own);
  return { areas: [...new Set(areas.concat([...open]))], land: [...open] };
}
/** What a snapshot may say about land: ids from these tables, numbers in bounds. Called by gardenSnapshotClean. */
function gardenLandsClean(raw, out) {
  if (Array.isArray(raw.ls)) out.ls = raw.ls.slice(0, 90).filter(id => typeof id === 'string' && (gardenLandRow(id) ? !!gardenLandRow(id).plot : !!GARDEN_LAND_MAPS[id]));
  if (Array.isArray(raw.lf)) out.lf = raw.lf.slice(0, 40).filter(id => typeof id === 'string' && !!gardenLandFeature(id));
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
  const built = [GARDEN_LAND_OFFICE];
  if (_GD_LAND.has('finds') && !_GD_LAND.has('lf-museum')) built.push(GARDEN_LAND_FINDS);
  for (const f of GARDEN_LAND_FEATURES) {
    if (f.x == null || !_GD_LAND.has(f.id)) continue;
    if (f.does === 'maze') { built.push(..._gldMazeRects(f)); continue; }
    built.push({ id: f.id, name: f.name, x: f.x, y: f.y, w: f.w, h: f.h, col: f.col, walk: 0, act: 'lf', lf: f.id, door: f.door, kind: 'lf-' + f.art, tall: f.tall, blurb: f.blurb });
  }
  const at = new Map();
  for (const p of built) for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) at.set(x + ',' + y, p);
  _GLD_PROPS.built = built; _GLD_PROPS.at = at; _GLD_PROPS.key = 1;
}
function gardenLandPropsReset() { _GLD_PROPS.key = null; }
/** The land's prop on a cell, or null (gardenPropAt asks this first). */
function gardenLandPropAt(x, y) { if (_GLD_PROPS.key === null) _gldPropsRebuild(); return _GLD_PROPS.at.get(x + ',' + y) || null; }
/** Every prop there is now, for the code that goes through them all (the feet, the clicks, the fading): GARDEN_PROPS and the land's. */
function gardenPropsNow() { return GARDEN_PROPS.concat(gardenLandProps()); }

/* ---------- water ---------- */
/** A cell of a plot: is it water? null: not in a plot, or a plot you own whole (its old pool rules, gardenIsWater goes on as it always did). */
function gardenLandWaterAt(x, y) {
  const c = gardenLandCell(x, y); if (!c) return null;
  const plot = c.plot || _gldTrailPlot(x, y);
  if (_GD_LAND.has(plot)) return null;
  return !!c.pool;
}
function _gldTrailPlot(x, y) { return (x < 44 ? (y < 11 ? 'hill' : 'field') : (y < 11 ? 'grove' : 'marsh')); }
/** Which old plot a cell is in, by where it is. */
function gardenLandPlotAt(x, y) { return gardenLandCell(x, y) ? _gldTrailPlot(x, y) : ''; }
/** An open trail's cell you do not own whole: it stays clear, for walking (gardenCellOk). */
function gardenLandPathAt(x, y) { const c = gardenLandCell(x, y); return !!c && !c.plot && !_GD_LAND.has(_gldTrailPlot(x, y)); }
/** How much faster a plant grows here (the kind of land, a scarecrow), and is it always in season. */
function gardenLandGrow(x, y) {
  const c = gardenLandCell(x, y); let k = c && c.plot && c.grow ? c.grow : 1;
  if (_GD_LAND.has('lf-scarecrow')) { const f = gardenLandFeature('lf-scarecrow'); if (Math.abs(x - f.x) <= f.r && Math.abs(y - f.y) <= f.r) k *= f.grow; }
  return k;
}
function gardenLandAlways(x, y) { const c = gardenLandCell(x, y); return !!(c && c.always); }
/** The whole cost of the land, for the numbers in docs/dev/GARDEN_PLAN.md. */
function gardenLandTotals() { return { sections: GARDEN_LAND_SECTIONS.length, trails: GARDEN_LAND_TRAILS.length, features: GARDEN_LAND_FEATURES.length, land: GARDEN_LAND_SECTIONS.reduce((n, s) => n + s.buy, 0), built: GARDEN_LAND_FEATURES.reduce((n, f) => n + f.cost, 0) }; }

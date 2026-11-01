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
/* A trail's level is when its gate opens. `from` is the way to it, so a trail never opens before the one that leads to it. */
const GARDEN_LAND_TRAILS = _gdRows([
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
].map(t => Object.assign({ trail: 1 }, t)));
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
const GARDEN_LAND_SECTIONS = _gdRows(_GLD_CORE_ROWS.map(([ch, id, name, kind, lv, via, fam]) => _gldSectionRow('core', ch, id, name, kind, lv, 0, via, '', fam)).concat(_GLD_SECTION_ROWS.map(r => _gldSectionRow(...r))));
const _GLD_ROW = new Map();
for (let y = 19; y <= 20; y++) for (let x = 0; x < GARDEN_WORLD.cols; x++) _GLD_GRID[y * GARDEN_WORLD.cols + x] = _GLD_LANE;
for (const M of Object.values(GARDEN_LAND_MAPS)) M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) { const t = row[dx] === '#' ? GARDEN_LAND_THICKET : _GLD_TRAIL_BY_CH.get(row[dx]); if (t) _GLD_GRID[(M.y + dy) * GARDEN_WORLD.cols + M.x + dx] = t; } });
for (const t of GARDEN_LAND_TRAILS) _GLD_ROW.set(t.id, t);
for (const s of GARDEN_LAND_SECTIONS) { _GLD_ROW.set(s.id, s); _GD_AREA.set(s.id, s); for (const [x, y] of s.cells) _GLD_GRID[y * GARDEN_WORLD.cols + x] = s; }
for (const t of GARDEN_LAND_TRAILS) _GD_AREA.set(t.id, t);   // (so a 'locked:' answer can be looked up like any other)
_GD_AREA.set(GARDEN_LAND_THICKET.id, GARDEN_LAND_THICKET);
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
  return _gdRows(_GLD_FEATURE_ROWS.map(place));
})();
const _GLD_FEAT = new Map(GARDEN_LAND_FEATURES.map(f => [f.id, f]));
function gardenLandFeature(id) { return _GLD_FEAT.get(String(id)) || null; }
/* The maze, one character a cell over its footprint: # is hedge, C the chest. Gate at the top, from the Cabbage steps. */
const GARDEN_LAND_MAZE = _gdF(['##.#####', '#...#.C#', '###.#.##', '#.....##', '########']);
const GARDEN_LAND_OFFICE = _gdF({ id: 'land-office', name: 'Land office', x: 24, y: 19, w: 3, h: 1, door: _gdF({ x: 25, y: 20 }), act: 'lands', kind: 'lf-office', tall: 2.4, verb: 'look at the land', blurb: 'What you can buy and build, and what is still to come.' });
const GARDEN_LAND_LAMPS = _gdF([3, 8, 41, 46, 50]);   // x along the lane's north edge, out where there are no shops
/* Your finds, laid out on a table on the lane from the first one you dig up, until a museum takes them in. */
const GARDEN_LAND_FINDS = _gdF({ id: 'land-finds', name: 'Your finds', x: 40, y: 19, w: 2, h: 1, col: 'soft', walk: 0, act: 'lf', lf: 'land-finds', door: _gdF({ x: 40, y: 20 }), kind: 'lf-finds', tall: 1, blurb: 'What has turned up so far.' });
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
 * Everything open in a garden, from what its owner has: own = ids (sections, features). Trails, and the old garden's free sections, open by level, each only once the way to it is open;
 * a section you bought always opens the way to it, so nothing you own can be stuck behind a gate if your level ever drops (an Undo, another device).
 */
function gardenLandsOpen(level, own) {
  const out = new Set(own || []);
  for (const t of GARDEN_LAND_TRAILS) if ((level || 1) >= t.lv && (!t.from || out.has(t.from))) out.add(t.id);
  const walkBack = (id) => { let t = gardenLandRow(id), g = 0; while (t && g++ < 9) { out.add(t.id); t = t.from ? gardenLandRow(t.from) : null; } };
  for (const s of GARDEN_LAND_SECTIONS) {
    if (!s.buy && (level || 1) >= s.lv && (!s.via || out.has(s.via))) out.add(s.id);
    if (out.has(s.id) && s.via) walkBack(s.via);
  }
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

/* ---------- water, paths, and how things grow ---------- */
/** A cell of the land: is it water? null: the lake and the pond, which gardenIsWater knows from their own rectangles. */
function gardenLandWaterAt(x, y) {
  const c = gardenLandCell(x, y); if (!c) return null;
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
  const out = [];
  for (const [rid, M] of Object.entries(GARDEN_LAND_MAPS)) M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) if (row[dx] === '#' && gardenHash(rid + dx + ',' + dy) % 5 === 0) out.push({ x: M.x + dx, y: M.y + dy, theme: M.theme }); });
  return out;
}

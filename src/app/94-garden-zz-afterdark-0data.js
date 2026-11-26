/* ============================================================
   AFTER DARK, the tables (FUN-ROADMAP Phase 8, "After dark"). Plain data only: the kit (94-garden-zz-afterdark-1kit.js) and each part
   (2moon, 3sky, 4moths, 5stars, 6rain, 7trails, apages) read these. Nothing here names a place: every happening says only what KIND of
   ground or thing it stands at ('grass', 'tree', 'bank' ...), and the kit finds those in whatever layout is loaded.

     AD_MOONS     the thirteen named moons. mo: the northern month whose full moon it is (south of the equator the names move six
                  months, as the seasons do; the moon itself is the real one). Blue: a second full moon in one calendar month.
                  parts: what happens on its nights, in view: [{ at (a kind of spot), n (at most this many in view), art (a drawing of
                  _AD_ART in 2moon), glow, pick (picked up once a night; the first time ever it is the moon's keepsake), spawn (a
                  creature of the life engine, your own garden only: friends see it through the host's creatures) }]
     AD_KEEPS     new keepsakes (the life book's rows: one each, for good; existing shapes only)
     AD_SAYINGS   old weather sayings, each with the sign the game shows for it and what tomorrow must be for it to be said
     AD_SHROOMS   what grows under the trees the morning after rain, and what Mother Thistle says about each
     AD_GLADES    where a glow trail ends
   ============================================================ */
const AD_MOONS = Object.freeze([
  Object.freeze({ id: 'snow', mo: 1, name: 'The Snow Moon', tint: 0xe6eef8, css: '#e6eef8', keep: 'ad-snow-hair', line: 'The white stag came down to the open grass, and left a silver hair on a fence.', hint: 'The first full moon of the year. Look along the fences.',
    parts: Object.freeze([{ at: 'grass', n: 1, spawn: 'white-stag', art: 'tracks' }, { at: 'edge', n: 1, art: 'hair', pick: 1, or: 'grass' }]) }),
  Object.freeze({ id: 'candle', mo: 2, name: 'The Candle Moon', tint: 0xf6e2b0, css: '#f6e2b0', keep: 'ad-candle-wick', line: 'A candle in a jar on every doorstep, for anyone walking home late.', hint: 'In the deep of winter. Every doorstep.',
    parts: Object.freeze([{ at: 'home', n: 4, art: 'candle', glow: 'warm', pick: 1, or: 'grass' }]) }),
  Object.freeze({ id: 'hare', mo: 3, name: 'The Hare Moon', tint: 0xeee4d0, css: '#eee4d0', keep: 'ad-hare-whisker', line: 'Two hares stood up and boxed on the grass, and bolted when you came close.', hint: 'Early spring, out on the open grass.',
    parts: Object.freeze([{ at: 'grass', n: 1, art: 'hares', pick: 1, bolt: 3 }]) }),
  Object.freeze({ id: 'frog', mo: 4, name: 'The Frog Moon', tint: 0xd8f0d0, css: '#d8f0d0', keep: 'ad-frog-pebble', line: 'Every still pond sang. The frogs had found a pebble that sang with them.', hint: 'Spring nights, by still water.',
    parts: Object.freeze([{ at: 'bank', n: 3, spawn: 'frog', art: 'croak', sound: 'croak' }, { at: 'bank', n: 1, art: 'pebble', pick: 1, or: 'grass' }]) }),
  Object.freeze({ id: 'blossom', mo: 5, name: 'The Blossom Moon', tint: 0xf8dce8, css: '#f8dce8', keep: 'ad-blossom-petal', line: 'Petals came down from the trees glowing, and did not stop until morning.', hint: 'Late spring, under the trees.',
    parts: Object.freeze([{ at: 'tree', n: 6, art: 'petals', glow: 'pink' }, { at: 'tree', n: 1, art: 'petal', pick: 1, or: 'grass' }]) }),
  Object.freeze({ id: 'honey', mo: 6, name: 'The Honey Moon', tint: 0xf8e2a0, css: '#f8e2a0', keep: 'ad-honey-drop', gift: Object.freeze({ honey: 1 }), line: 'Glow-worms lit every hedge, and somebody left a drop of honey out for the moon.', hint: 'Midsummer. Along the edges of things.',
    parts: Object.freeze([{ at: 'tree', n: 3, spawn: 'firefly', art: 'worms', glow: 'green' }, { at: 'edge', n: 1, art: 'honey', pick: 1, or: 'tree' }]) }),
  Object.freeze({ id: 'lamp', mo: 7, name: 'The Lamp Moon', tint: 0xe8eef8, css: '#e8eef8', keep: 'ad-lamp-scale', event: 'lamp-moon', line: 'The fish came up to look at it. Rings on all the still water, all night.', hint: 'High summer, on still water.',
    parts: Object.freeze([{ at: 'still', n: 4, art: 'rings' }, { at: 'bank', n: 1, art: 'scale', pick: 1, or: 'grass' }]) }),
  Object.freeze({ id: 'glow', mo: 8, name: 'The Glow Moon', tint: 0xe0f8c8, css: '#e0f8c8', keep: 'ad-glow-lamp', trail: 2, line: 'The glow-worms lit a trail twice as long as on any other night.', hint: 'Late summer. Follow the little lights.',
    parts: Object.freeze([{ at: 'grass', n: 3, art: 'worms', glow: 'green' }, { at: 'grass', n: 1, art: 'lampworm', pick: 1 }]) }),
  Object.freeze({ id: 'harvest', mo: 9, name: 'The Harvest Moon', tint: 0xf6c678, css: '#f6c678', keep: 'ad-harvest-pip', line: 'Every fruit tree let one fruit go in the moonlight, for whoever found it.', hint: 'Autumn, under the fruit trees.',
    parts: Object.freeze([{ at: 'fruit', n: 4, art: 'fruit', pick: 1, each: 1, or: 'tree' }]) }),
  Object.freeze({ id: 'kettle', mo: 10, name: 'The Kettle Moon', tint: 0xf0d8b8, css: '#f0d8b8', keep: 'ad-kettle-mug', feet: 1, line: 'A warm mug on the doorstep of every home where somebody lives. Drink it and you walk on air.', hint: 'Autumn evenings, at the doors of the vale’s folk.',
    parts: Object.freeze([{ at: 'lived', n: 4, art: 'mug', glow: 'warm', pick: 1, each: 1, or: 'home' }]) }),
  Object.freeze({ id: 'owl', mo: 11, name: 'The Owl Moon', tint: 0xdce4f0, css: '#dce4f0', keep: 'ad-owl-feather', line: 'The owls called from every tall tree, and one of them dropped a feather for you.', hint: 'Late autumn. Listen at the tall trees.',
    parts: Object.freeze([{ at: 'tall', n: 2, art: 'owl', sound: 'hoot' }, { at: 'tall', n: 1, art: 'feather', pick: 1, or: 'tree' }]) }),
  Object.freeze({ id: 'frost', mo: 12, name: 'The Frost Moon', tint: 0xe8f4ff, css: '#e8f4ff', keep: 'ad-frost-star', aurora: 2, line: 'Frost on every blade of grass, and more stars in the water than in the sky.', hint: 'The darkest month, on the open grass.',
    parts: Object.freeze([{ at: 'grass', n: 5, art: 'frost' }, { at: 'grass', n: 1, art: 'froststar', pick: 1 }]) }),
]);
const AD_MOON_BLUE = Object.freeze({ id: 'blue', mo: 0, name: 'The Blue Moon', tint: 0x9ec4ff, css: '#9ec4ff', keep: 'ad-blue-scale', blue: 1, line: 'A second full moon in one month. Everything blue glowed, and a blue moth came to every sheet.', hint: 'Once in a blue moon. Really.',
  parts: Object.freeze([{ at: 'grass', n: 3, art: 'bluelight', glow: 'blue' }, { at: 'grass', n: 1, art: 'bluescale', pick: 1 }]) });
const AD_MOON_IDS = Object.freeze(AD_MOONS.map(r => r.id).concat('blue'));
/** New keepsakes. kind: the life book's shape (gardenKeepsakeSvg); hint: the Field Journal's clue while it is still to find. */
const AD_KEEPS = Object.freeze([
  ['ad-snow-hair', 'A Snow Moon hair', '#e8eef4', 'spine', 'Under the first full moon of the year.'],
  ['ad-candle-wick', 'A Candle Moon wick', '#f2e4c0', 'note', 'On a doorstep, under a winter full moon.'],
  ['ad-hare-whisker', 'A Hare Moon whisker', '#d8cbb0', 'spine', 'Where the hares box, early in spring.'],
  ['ad-frog-pebble', 'A singing pebble', '#7aa87a', 'stone', 'By still water, when the frogs sing to the moon.'],
  ['ad-blossom-petal', 'A moonlit petal', '#f4c8d8', 'dust', 'Under a tree, when the petals glow.'],
  ['ad-honey-drop', 'A drop of moon honey', '#f2c040', 'drop', 'Midsummer’s full moon, along a hedge.'],
  ['ad-lamp-scale', 'A moonlit scale', '#d8e0ec', 'dust', 'When the fish come up to look at the moon.'],
  ['ad-glow-lamp', 'A glow-worm’s lamp', '#c8f07a', 'drop', 'Late in summer, at the end of the little lights.'],
  ['ad-harvest-pip', 'A harvest pip', '#a86a34', 'acorn', 'Under a fruit tree, at the harvest’s full moon.'],
  ['ad-kettle-mug', 'A Kettle Moon mug', '#8a5a3a', 'drop', 'On a doorstep where somebody lives, in October.'],
  ['ad-owl-feather', 'An Owl Moon feather', '#b8a890', '', 'Under a tall tree, when the owls call.'],
  ['ad-frost-star', 'A Frost Moon star', '#dff0ff', 'star', 'On the frosted grass, in the darkest month.'],
  ['ad-blue-scale', 'A Blue Moon scale', '#6a9aee', 'dust', 'Once in a blue moon.'],
  ['ad-vale-thread', 'A thread of the vale lights', '#8ae8b0', 'spine', 'On a night when the sky turns green.'],
  ['ad-comet-dust', 'Comet dust', '#f0f4ff', 'dust', 'Under a comet. One comes a year.'],
  ['ad-star-stone', 'A star stone', '#c8b0e8', 'stone', 'Where a star came down in the night.'],
  ['ad-jar-glow', 'A jar of glow', '#d8f48a', 'drop', 'At the end of a glow trail: a ring where moths dance.'],
  ['ad-pool-pebble', 'A star-pool pebble', '#8aa0c8', 'stone', 'At the end of a glow trail: a pool full of stars.'],
  ['ad-lantern-ribbon', 'A lantern ribbon', '#e86a5a', 'spine', 'At the end of a glow trail: a tree with lanterns in it.'],
  ['ad-fairy-dust', 'Fairy dust', '#f4e0ff', 'dust', 'Stand inside a ring of mushrooms at dusk.'],
  ['ad-shaggy-ink', 'A shaggy ink cap', '#e8e4dc', 'shroom', 'Under the trees, the morning after rain.'],
  ['ad-puffball', 'A puffball', '#f2ecdc', 'fluff', 'Under the trees, the morning after rain.'],
  ['ad-rainbow-red', 'A red rainbow scale', '#e8504e', 'dust', 'Where a rainbow really touches the ground.'],
  ['ad-rainbow-orange', 'An orange rainbow scale', '#f09a3e', 'dust', 'Where a rainbow really touches the ground.'],
  ['ad-rainbow-yellow', 'A yellow rainbow scale', '#f2d44a', 'dust', 'Where a rainbow really touches the ground.'],
  ['ad-rainbow-green', 'A green rainbow scale', '#62b85a', 'dust', 'Where a rainbow really touches the ground.'],
  ['ad-rainbow-blue', 'A blue rainbow scale', '#4a8ae0', 'dust', 'Where a rainbow really touches the ground.'],
  ['ad-rainbow-indigo', 'An indigo rainbow scale', '#5a5ac8', 'dust', 'Where a rainbow really touches the ground.'],
  ['ad-rainbow-violet', 'A violet rainbow scale', '#9a5ac0', 'dust', 'Where a rainbow really touches the ground.'],
].map(([id, name, c, kind, hint]) => Object.freeze(Object.assign({ id, name, c, hint }, kind ? { kind } : {}))));
const AD_RAINBOW = Object.freeze(['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']);
/** Old weather sayings. sign: what the game shows (2: by kind or terrain, 6rain draws it); when: what tomorrow (or today) must be;
 *  season / tod: when the sign can be seen. Every one is true to the forecast the garden goes by. */
const AD_SAYINGS = Object.freeze([
  Object.freeze({ id: 'gulls', words: 'Gulls on the green, rain will be seen.', sign: 'gulls', when: 'wet', tod: ['dawn', 'day'], note: 'Gulls come inland to the open grass when bad weather is on its way.' }),
  Object.freeze({ id: 'swallows-high', words: 'Swallows fly high, the day will be dry.', sign: 'swallows-high', when: 'fair', season: ['spring', 'summer'], tod: ['day', 'dusk'], note: 'In fine air the flies go up, and the swallows go after them.' }),
  Object.freeze({ id: 'swallows-low', words: 'Swallows fly low, the rain’s on the go.', sign: 'swallows-low', when: 'wet', season: ['spring', 'summer'], tod: ['day', 'dusk'], note: 'Damp air keeps the flies low over the grass, and the swallows with them.' }),
  Object.freeze({ id: 'dew', words: 'Dew on the grass, no rain will pass.', sign: 'dew', when: 'fair-today', tod: ['dawn'], note: 'A clear night leaves dew. Clouds keep it away.' }),
  Object.freeze({ id: 'moon-ring', words: 'A ring round the moon, rain will come soon.', sign: 'moon-ring', when: 'wet', tod: ['night'], note: 'High thin cloud makes the ring. It comes before the rain.' }),
  Object.freeze({ id: 'red-night', words: 'Red water at night, the next day is bright.', sign: 'red-dusk', when: 'fair', tod: ['dusk'], note: 'The still water takes the sunset’s red when the sky to the west is clear.' }),
  Object.freeze({ id: 'red-morning', words: 'Red water at dawn, take your coat in the morn.', sign: 'red-dawn', when: 'wet-today', tod: ['dawn'], note: 'Red at sunrise means the clear sky has already gone past.' }),
  Object.freeze({ id: 'clear-moon', words: 'Clear moon, frost soon.', sign: 'clear-moon', when: 'frost', season: ['winter', 'autumn'], tod: ['night'], note: 'No cloud to keep the warmth in: the ground goes white by morning.' }),
  Object.freeze({ id: 'webs', words: 'Webs on the hedge at break of day, the rain will keep away.', sign: 'webs', when: 'fair-today', season: ['summer', 'autumn'], tod: ['dawn'], note: 'Spiders do not bother building when rain is coming.' }),
  Object.freeze({ id: 'seven', words: 'Rain before seven, fine by eleven.', sign: 'early-rain', when: 'early-rain', tod: ['dawn', 'day'], note: 'An early shower often blows through by the middle of the morning.' }),
]);
/** What grows under the trees the morning after rain. say: Mother Thistle sorting it for you. */
const AD_SHROOMS = Object.freeze([
  Object.freeze({ id: 'field', name: 'Field mushroom', sort: 'pot', item: 'crop:field-mushroom', w: 5, cap: '#f2eadc', gill: '#a87a6a', stem: '#f6f0e4', say: 'For the pot, dear. A little butter, a little pepper. Nothing else.' }),
  Object.freeze({ id: 'ink', name: 'Shaggy ink cap', sort: 'look', keep: 'ad-shaggy-ink', w: 2, cap: '#ece6dc', gill: '#4a4040', stem: '#f4f0e8', tall: 1, say: 'Just for looking at. By tomorrow it will have turned itself to ink.' }),
  Object.freeze({ id: 'puff', name: 'Puffball', sort: 'look', keep: 'ad-puffball', w: 2, cap: '#f4eee0', gill: '#d8ccb4', stem: '#f4eee0', round: 1, say: 'Just for looking at. Give it a squeeze and it smokes at you.' }),
  Object.freeze({ id: 'agaric', name: 'Fly agaric', sort: 'leave', w: 2, cap: '#d8402e', gill: '#f6eedc', stem: '#f6f0e4', spots: 1, say: 'Leave that one alone, dear. Pretty as a picture and twice as wicked.' }),
]);
/** Where a glow trail ends: one of these, by the night's seed. keep: found there the first time. */
const AD_GLADES = Object.freeze([
  Object.freeze({ id: 'moths', name: 'The moth ring', keep: 'ad-jar-glow', line: 'A ring in the grass where the moths dance in the dark.', moth: 1 }),
  Object.freeze({ id: 'pool', name: 'The star pool', keep: 'ad-pool-pebble', line: 'A little still pool that shows the stars at your feet.' }),
  Object.freeze({ id: 'lanterns', name: 'The lantern tree', keep: 'ad-lantern-ribbon', line: 'An old tree with lanterns tied in its branches. Nobody will say who ties them.' }),
]);
/* numbers: moth sheets (M3), falling stars (M4), mushrooms (M5), glow trails (M6) */
const AD_SHEET = Object.freeze({ every: 3, cap: 4, max: 6, garden: 8, near: 6 });   // a moth every 3 minutes after dusk, 4 a sheet (+1 night-scented plant near, +1 full moon), at most 6 a sheet and 8 in all
const AD_FALL = Object.freeze({ odds: 6, reach: 30, days: 7, bloom: 2, seed: 3 });   // one night in 6; within 30 cells of the arrival point; the scorch lasts 7 days, flowers from day 2, a seed from day 3
const AD_SHROOM = Object.freeze({ every: 9, show: 6, autumn: 8, ring: 3, hold: 5 });   // one tree in 9 has a cluster; at most 6 drawn in view (8 in autumn); a ring one morning in 3; 5 seconds in it
const AD_TRAIL = Object.freeze({ step: 0.7, min: 8, max: 22, reach: 34, trees: 3, glade: 4 });

/* ============================================================
   GARDEN, fishing and bug catching: THE CATALOGUE (2.22). PURE: tables and small functions, no DOM, no state; Node
   evaluates it after 94-garden-0catalog.js (lib/friends/garden.mjs), like the garden catalogue itself.

   User request, 30 Oct 2026: "a fishing mini game ... similar to stardew valley ... collect fish, trade them / gift them
   to other people, showcase them somehow, upgrades to fishing rods ... bug collecting too ... I want the player to always
   be in the garden and the fishing mini game to be connected to it."

     GARDEN_FISH       38 fish and 9 finds (junk and treasure): where, when, how hard, how big, what they are worth
     GARDEN_BUGS       33 bugs: where they live, when they come out, how jumpy, how they sit
     GARDEN_RODS       five rods (the bamboo one is yours; the golden one is a ribbon prize)
     GARDEN_NETS       four nets (the hand net is yours; the golden one is a ribbon prize)
     GARDEN_BAITS      bait you can bring along; GARDEN_BOBBERS: floats you unlock by catching
     GARDEN_CATCH_ECON what the market will pay for, the XP a day from fish, the showcase sizes
     GARDEN_TRADES     the order board: three requests a day, paid in goods (the same on every device)

   Every id is stable and unique, saved in the state and sent to friends: never rename or reuse one.

   ITEMS in the bag (the garden ledger's item map): fish:<id>-<q> (q 0..3: plain, good, fine, perfect), bug:<id>,
   gear:<rod-or-net-id> (owned for good), bait:<id>, bobber:<id>. The record of what you have ever caught (best size,
   how many, the first day) is state.garden.fl / .bl, so selling or gifting a fish never loses your log.

   ART (94-garden-fish-1art.js): the look {s: shape, c, c2, c3, p: pattern} is all the drawing needs.
   ============================================================ */
function _gfF(id, name, zone, rarity, diff, beh, cm, price, look, more) {
  const m = more || {};
  return Object.freeze(Object.assign({ id, name, cat: 'fish', zone: Object.freeze(zone), rarity, diff, beh, cm: Object.freeze(cm), price, look: Object.freeze(look), tod: Object.freeze(m.tod || []), seasons: Object.freeze(m.seasons || []), rain: m.rain || 0, lv: m.lv || 1, blurb: m.blurb || '' }));
}
function _gfJ(id, name, cat, price, look, blurb, more) {
  return Object.freeze(Object.assign({ id, name, cat, zone: Object.freeze(['shallow', 'mid', 'deep', 'pond']), rarity: cat === 'junk' ? 'common' : 'uncommon', diff: 0, beh: 'smooth', cm: Object.freeze([10, 30]), price, look: Object.freeze(look), tod: Object.freeze([]), seasons: Object.freeze([]), rain: 0, lv: 1, blurb }, more || {}));
}
/* zone: 'pond' the garden pond; 'shallow', 'mid', 'deep' the lake by rows from the shore (gardenWaterZone).
   diff 1..10 how hard the fish is to hold; beh how it swims in the reel (smooth, dart, floater, sinker, mixed). */
const GARDEN_FISH = Object.freeze([
  /* --- the pond --- */
  _gfF('goldfish', 'Goldfish', ['pond'], 'common', 2, 'smooth', [8, 22], 5, { s: 'fancy', c: '#f08a2a', c2: '#ffc15a', c3: '#d85a1a', p: 'none' }, { blurb: 'Round, orange and unbothered.' }),
  _gfF('bitterling', 'Bitterling', ['pond'], 'common', 2, 'dart', [4, 9], 4, { s: 'slim', c: '#9ab4c8', c2: '#e8d8c8', c3: '#d85a6a', p: 'stripe' }, { blurb: 'Tiny and shimmery, with a rosy flush.' }),
  _gfF('comet-goldfish', 'Comet goldfish', ['pond'], 'uncommon', 3, 'smooth', [14, 30], 11, { s: 'fancy', c: '#f2b13a', c2: '#fff0c2', c3: '#e07a1a', p: 'belly' }, { blurb: 'A long, streaming tail like a comet.' }),
  _gfF('golden-orfe', 'Golden orfe', ['pond'], 'uncommon', 4, 'dart', [20, 45], 14, { s: 'slim', c: '#e8a83a', c2: '#fbe3a0', c3: '#c8761a', p: 'belly' }, { blurb: 'Glints gold in the shallows.' }),
  _gfF('orange-koi', 'Orange koi', ['pond'], 'uncommon', 4, 'smooth', [30, 60], 22, { s: 'koi', c: '#f4f0e6', c2: '#f08a2a', c3: '#f4f0e6', p: 'patches' }, { blurb: 'A ceremonial fish in an ordinary pond.' }),
  _gfF('weather-loach', 'Weather loach', ['pond'], 'uncommon', 4, 'mixed', [15, 28], 13, { s: 'eel', c: '#b49a6a', c2: '#d8c8a0', c3: '#6a5a3a', p: 'speckle' }, { tod: ['dusk', 'night'], blurb: 'Wriggles about before it rains.', rain: 1 }),
  _gfF('kohaku-koi', 'Kohaku koi', ['pond'], 'rare', 5, 'smooth', [40, 75], 45, { s: 'koi', c: '#fbf7ee', c2: '#d8301a', c3: '#fbf7ee', p: 'patches' }, { lv: 4, blurb: 'Red on white, like a flag of a very calm country.' }),
  _gfF('ghost-koi', 'Ghost koi', ['pond'], 'epic', 6, 'floater', [45, 80], 95, { s: 'koi', c: '#c8d8e4', c2: '#9ab4cc', c3: '#e8f0f6', p: 'speckle' }, { tod: ['night'], lv: 6, blurb: 'A pale shape that is not quite there.' }),
  _gfF('emperor-koi', 'Emperor koi', ['pond'], 'legendary', 8, 'dart', [60, 95], 260, { s: 'koi', c: '#f2c432', c2: '#fff0a0', c3: '#d8941a', p: 'speckle' }, { lv: 9, blurb: 'Gold from nose to tail. The pond is proud of it.' }),
  /* --- the lake, shallows --- */
  _gfF('minnow', 'Minnow', ['shallow'], 'common', 1, 'dart', [5, 10], 3, { s: 'slim', c: '#8aa4b4', c2: '#e8e4d4', c3: '#4a5a64', p: 'stripe' }, { blurb: 'A silver flicker by your feet.' }),
  _gfF('stickleback', 'Stickleback', ['shallow', 'pond'], 'common', 1, 'dart', [4, 8], 3, { s: 'slim', c: '#7a8a5a', c2: '#e86a3a', c3: '#4a5a34', p: 'belly' }, { blurb: 'Tiny, spiky and fiercely proud.' }),
  _gfF('gudgeon', 'Gudgeon', ['shallow'], 'common', 2, 'smooth', [8, 16], 4, { s: 'slim', c: '#a49a6a', c2: '#e4dcb8', c3: '#5a5236', p: 'spots' }, { blurb: 'Hugs the gravel.' }),
  _gfF('roach', 'Roach', ['shallow', 'mid'], 'common', 2, 'smooth', [12, 30], 6, { s: 'round', c: '#9ab4c0', c2: '#f4f0e6', c3: '#e8503a', p: 'belly' }, { blurb: 'Silver sides and red eyes.' }),
  _gfF('perch', 'Perch', ['shallow', 'mid'], 'common', 3, 'mixed', [15, 40], 9, { s: 'round', c: '#6a8a4a', c2: '#e8d878', c3: '#d84a2a', p: 'bars' }, { blurb: 'Striped like a little tiger.' }),
  _gfF('rudd', 'Rudd', ['shallow'], 'uncommon', 3, 'smooth', [15, 35], 10, { s: 'round', c: '#c8a85a', c2: '#fbe8b8', c3: '#e83a2a', p: 'belly' }, { blurb: 'Gold flanks and fire-red fins.' }),
  _gfF('pumpkinseed', 'Pumpkinseed', ['shallow'], 'uncommon', 3, 'dart', [10, 20], 12, { s: 'round', c: '#e8a83a', c2: '#fbe08a', c3: '#2f8aa8', p: 'spots' }, { seasons: ['spring', 'summer'], blurb: 'Dressed for a party in orange and turquoise.' }),
  _gfF('signal-crayfish', 'Signal crayfish', ['shallow'], 'uncommon', 3, 'sinker', [8, 16], 12, { s: 'crayfish', c: '#a8402a', c2: '#d8704a', c3: '#f4e8d8', p: 'none' }, { tod: ['dusk', 'night'], blurb: 'Not a fish. Rather cross about it.' }),
  /* --- the lake, middle --- */
  _gfF('bream', 'Common bream', ['mid'], 'common', 3, 'smooth', [25, 55], 12, { s: 'flat', c: '#b4a468', c2: '#e8dcb0', c3: '#7a6a3a', p: 'belly' }, { blurb: 'Tall, flat and bronze.' }),
  _gfF('chub', 'Chub', ['mid'], 'common', 3, 'mixed', [25, 55], 10, { s: 'slim', c: '#8a9a6a', c2: '#e4e0c8', c3: '#c8502a', p: 'belly' }, { blurb: 'Fat-headed and bold.' }),
  _gfF('carp', 'Common carp', ['mid'], 'common', 4, 'smooth', [35, 90], 16, { s: 'carp', c: '#9a8a4a', c2: '#e0cf8a', c3: '#6a5a2a', p: 'scales' }, { blurb: 'A long-lived heavyweight.' }),
  _gfF('tench', 'Tench', ['mid'], 'uncommon', 4, 'sinker', [30, 60], 22, { s: 'carp', c: '#5a7a4a', c2: '#a8b878', c3: '#3a5434', p: 'none' }, { tod: ['dawn', 'dusk'], blurb: 'Olive green, slimy and serene: the doctor fish.' }),
  _gfF('mirror-carp', 'Mirror carp', ['mid'], 'uncommon', 5, 'smooth', [40, 95], 26, { s: 'carp', c: '#b09a5a', c2: '#ecdca0', c3: '#6a5a2a', p: 'mirror' }, { blurb: 'A few huge scales, like dropped coins.' }),
  _gfF('barbel', 'Barbel', ['mid'], 'uncommon', 5, 'dart', [40, 90], 28, { s: 'slim', c: '#8a7a4a', c2: '#d8cc9a', c3: '#4a3e22', p: 'barbels' }, { blurb: 'Whiskers feel along the bottom.' }),
  _gfF('rainbow-trout', 'Rainbow trout', ['mid'], 'uncommon', 5, 'dart', [30, 65], 30, { s: 'slim', c: '#9ab4a8', c2: '#f4ecd8', c3: '#e0507a', p: 'stripe' }, { tod: ['dawn', 'dusk'], blurb: 'A pink stripe along each side.', rain: 1 }),
  _gfF('brown-trout', 'Brown trout', ['mid'], 'uncommon', 5, 'dart', [30, 70], 32, { s: 'slim', c: '#a08a56', c2: '#f0e4c0', c3: '#7a2a1a', p: 'spots' }, { tod: ['dawn', 'dusk'], blurb: 'Red spots with pale halos.' }),
  _gfF('eel', 'European eel', ['mid'], 'uncommon', 5, 'mixed', [45, 100], 30, { s: 'eel', c: '#4a4a3a', c2: '#c8c09a', c3: '#2a2a22', p: 'none' }, { tod: ['dusk', 'night'], blurb: 'Slippery, secret and ancient.' }),
  _gfF('grayling', 'Grayling', ['mid'], 'rare', 6, 'floater', [30, 50], 55, { s: 'slim', c: '#8a9aa8', c2: '#d8dce0', c3: '#7a4a9a', p: 'sail' }, { seasons: ['autumn', 'winter'], lv: 4, blurb: 'The lady of the stream, with her sail.' }),
  _gfF('pike', 'Northern pike', ['mid', 'deep'], 'rare', 6, 'dart', [50, 120], 60, { s: 'pike', c: '#5a7a3a', c2: '#c8d098', c3: '#e0d878', p: 'spots' }, { seasons: ['autumn', 'winter', 'spring'], lv: 3, blurb: 'A long green ambusher with a smile full of teeth.' }),
  _gfF('zander', 'Zander', ['mid', 'deep'], 'rare', 6, 'mixed', [45, 90], 58, { s: 'pike', c: '#8a9a7a', c2: '#e4e4cc', c3: '#4a5a3a', p: 'bars' }, { tod: ['dusk', 'night'], lv: 4, blurb: 'Glassy eyes made for the dark.' }),
  _gfF('catfish', 'Channel catfish', ['mid', 'deep'], 'rare', 6, 'sinker', [40, 110], 52, { s: 'cat', c: '#7a8a8a', c2: '#d8dcd4', c3: '#3a4448', p: 'barbels' }, { lv: 3, blurb: 'Eight whiskers and no hurry.', rain: 1 }),
  /* --- the lake, deep --- */
  _gfF('lake-trout', 'Lake trout', ['deep'], 'rare', 7, 'dart', [55, 110], 80, { s: 'slim', c: '#6a8a8a', c2: '#e4eae4', c3: '#d8e0c8', p: 'spots' }, { lv: 5, blurb: 'Cold-water silver from the deep.' }),
  _gfF('golden-mirror-carp', 'Golden mirror carp', ['deep'], 'rare', 7, 'smooth', [50, 100], 95, { s: 'carp', c: '#e0b43a', c2: '#fff0b0', c3: '#a8761a', p: 'mirror' }, { lv: 5, blurb: 'A mirror carp that swallowed the sun.' }),
  _gfF('sturgeon', 'Lake sturgeon', ['deep'], 'epic', 8, 'sinker', [100, 280], 170, { s: 'sturgeon', c: '#6a7a7a', c2: '#d8dccc', c3: '#a8b0a0', p: 'scutes' }, { seasons: ['spring', 'autumn'], lv: 7, blurb: 'A living fossil with armour plates.' }),
  _gfF('wels-catfish', 'Wels catfish', ['deep'], 'epic', 8, 'sinker', [120, 260], 190, { s: 'cat', c: '#4a5a4a', c2: '#c8c8a8', c3: '#2a342a', p: 'barbels' }, { tod: ['dusk', 'night'], lv: 8, blurb: 'The biggest thing in the lake. Probably.' }),
  _gfF('lantern-angler', 'Lantern angler', ['deep'], 'epic', 7, 'floater', [20, 60], 140, { s: 'angler', c: '#3a3a5a', c2: '#7a6aa8', c3: '#ffe27a', p: 'none' }, { tod: ['night'], lv: 6, blurb: 'Carries its own lamp.' }),
  _gfF('ghost-pike', 'Ghost pike', ['deep'], 'epic', 8, 'dart', [70, 130], 160, { s: 'pike', c: '#c8d8e4', c2: '#f0f6fa', c3: '#9ab4c8', p: 'speckle' }, { seasons: ['winter'], lv: 8, blurb: 'Pale as frost, quick as a thought.' }),
  _gfF('moonfish', 'Moonfish', ['deep'], 'legendary', 9, 'floater', [40, 80], 320, { s: 'round', c: '#dfe6f2', c2: '#fbfdff', c3: '#a8b8da', p: 'glow' }, { tod: ['night'], lv: 10, blurb: 'A silver disc that rises with the moon.' }),
  _gfF('sunburst-fish', 'Sunburst fish', ['deep'], 'legendary', 9, 'dart', [40, 75], 320, { s: 'round', c: '#f4a22a', c2: '#ffe17a', c3: '#e8501a', p: 'glow' }, { tod: ['day'], seasons: ['summer'], lv: 10, blurb: 'Catches the light and keeps it.' }),
  _gfF('old-whiskers', 'Old Whiskers', ['deep'], 'legendary', 10, 'mixed', [180, 300], 480, { s: 'cat', c: '#5a4a3a', c2: '#d8c8a0', c3: '#2a2018', p: 'barbels' }, { tod: ['dawn', 'dusk'], rain: 1, lv: 12, blurb: 'Everybody has a story about this one. Few have the fish.' }),
  /* --- finds: junk and treasure --- */
  _gfJ('old-boot', 'Old boot', 'junk', 1, { s: 'boot', c: '#7a5a3a', c2: '#4a3a2a' }, 'Somebody lost this, and not recently.'),
  _gfJ('tin-can', 'Tin can', 'junk', 1, { s: 'can', c: '#b8bcc0', c2: '#8a9094' }, 'It still has half a label.'),
  _gfJ('driftwood', 'Driftwood', 'junk', 2, { s: 'wood', c: '#b49a74', c2: '#8a7450' }, 'Smooth as a bone, good for the garden.'),
  _gfJ('lake-weed', 'Lake weed', 'junk', 1, { s: 'weed', c: '#4a8a4a', c2: '#2f6a3a' }, 'A slippery green tangle.'),
  _gfJ('glass-float', 'Glass float', 'treasure', 35, { s: 'orb', c: '#5ab4c8', c2: '#d8f0f4' }, 'A fishing float from far away, still bright.'),
  _gfJ('old-key', 'Old key', 'treasure', 28, { s: 'key', c: '#c8a23a', c2: '#8a6a1a' }, 'It opens something. Probably not anything here.'),
  _gfJ('pearl', 'Lake pearl', 'treasure', 55, { s: 'orb', c: '#f4eee4', c2: '#cfc6d8' }, 'A freshwater pearl, creamy and perfect.'),
  _gfJ('coin-purse', 'Coin purse', 'treasure', 0, { s: 'purse', c: '#a8743a', c2: '#e8c24a' }, 'It clinks. Open it for the coins.', { opens: 1 }),
  _gfJ('message-bottle', 'Message in a bottle', 'treasure', 0, { s: 'bottle', c: '#7ab48a', c2: '#f4ecd0' }, 'A note and a seed packet. Open it.', { opens: 1 }),
]);
const _GF_FISH = new Map(GARDEN_FISH.map(f => [f.id, f]));
const GARDEN_FISH_ONLY = Object.freeze(GARDEN_FISH.filter(f => f.cat === 'fish'));
const GARDEN_FISH_ZONES = Object.freeze({
  pond: Object.freeze({ label: 'The pond', icon: 'waves', blurb: 'Still water behind the flowers.' }),
  shallow: Object.freeze({ label: 'Lake shallows', icon: 'waves', blurb: 'Clear water close to the shore.' }),
  mid: Object.freeze({ label: 'Open water', icon: 'waves', blurb: 'Cast a little further out.' }),
  deep: Object.freeze({ label: 'Deep water', icon: 'waves', blurb: 'Past the end of the pier. Bring a better rod.' }),
});
/** Quality of a catch, 0..3: how the game words and stars it. */
const GARDEN_QUALITY = Object.freeze([
  Object.freeze({ id: 0, label: 'Plain', stars: '', mult: 1, col: '#8a8f86' }),
  Object.freeze({ id: 1, label: 'Good', stars: '★', mult: 1.25, col: '#3f8f5a' }),
  Object.freeze({ id: 2, label: 'Fine', stars: '★★', mult: 1.6, col: '#3a6fc4' }),
  Object.freeze({ id: 3, label: 'Perfect', stars: '★★★', mult: 2.2, col: '#c98a12' }),
]);

/* ---------- bugs ----------
   hab: where it lives (flower, lawn, ground, tree, water, light, woods); skit 1..5: how easily it bolts when you come near;
   rest: how it sits (perch: lands on a flower or leaf and flits; hover: hangs in the air; crawl: walks on the ground). */
function _gbB(id, name, shape, rarity, hab, skit, rest, price, look, more) {
  const m = more || {};
  return Object.freeze({ id, name, cat: 'bug', shape, rarity, hab: Object.freeze(hab), skit, rest, price, look: Object.freeze(Object.assign({ s: shape }, look)), tod: Object.freeze(m.tod || ['dawn', 'day', 'dusk']), seasons: Object.freeze(m.seasons || []), rain: m.rain || 0, lv: m.lv || 1, size: m.size || 1, blurb: m.blurb || '' });
}
const GARDEN_BUGS = Object.freeze([
  /* butterflies and bees */
  _gbB('cabbage-white', 'Cabbage white', 'butterfly', 'common', ['flower', 'lawn'], 2, 'perch', 4, { c: '#f4f4ea', c2: '#2a2a2a', c3: '#e8e4c8', p: 'dots' }, { seasons: ['spring', 'summer', 'autumn'], blurb: 'A white flutter over the veg patch.' }),
  _gbB('small-tortoiseshell', 'Small tortoiseshell', 'butterfly', 'common', ['flower'], 2, 'perch', 6, { c: '#e8782a', c2: '#2a1a14', c3: '#2f5aa8', p: 'edge' }, { seasons: ['spring', 'summer', 'autumn'], blurb: 'Orange with blue beads along its edges.' }),
  _gbB('brimstone', 'Brimstone', 'butterfly', 'uncommon', ['flower'], 3, 'perch', 11, { c: '#eef06a', c2: '#c8cc3a', c3: '#e88a2a', p: 'leaf' }, { seasons: ['spring', 'summer'], blurb: 'Shaped like a leaf. It might be the first butterfly.' }),
  _gbB('orange-tip', 'Orange tip', 'butterfly', 'uncommon', ['flower'], 3, 'perch', 12, { c: '#fafaf2', c2: '#f08a1a', c3: '#6a8a5a', p: 'tip' }, { seasons: ['spring'], blurb: 'Only the males wear the orange.' }),
  _gbB('red-admiral', 'Red admiral', 'butterfly', 'uncommon', ['flower', 'tree'], 3, 'perch', 14, { c: '#2a2220', c2: '#d8301a', c3: '#f4f4ea', p: 'band' }, { seasons: ['summer', 'autumn'], blurb: 'Black velvet with a scarlet sash.' }),
  _gbB('peacock-butterfly', 'Peacock butterfly', 'butterfly', 'uncommon', ['flower'], 3, 'perch', 15, { c: '#b83a2a', c2: '#2a2a5a', c3: '#f4d86a', p: 'eyes' }, { seasons: ['spring', 'summer', 'autumn'], blurb: 'Four eyes on its wings to frighten the birds.' }),
  _gbB('painted-lady', 'Painted lady', 'butterfly', 'uncommon', ['flower'], 3, 'perch', 14, { c: '#e8944a', c2: '#2a1a14', c3: '#f4eee0', p: 'dots' }, { seasons: ['summer'], blurb: 'Flies thousands of miles for a flower.' }),
  _gbB('swallowtail', 'Swallowtail', 'butterfly', 'rare', ['flower', 'woods'], 4, 'perch', 40, { c: '#f2dc5a', c2: '#1a1a1a', c3: '#3a6fc4', p: 'tails' }, { seasons: ['summer'], lv: 3, size: 1.25, blurb: 'Big, yellow and elegant, with a pair of tails.' }),
  _gbB('monarch', 'Monarch', 'butterfly', 'rare', ['flower', 'woods'], 4, 'perch', 42, { c: '#f08a1a', c2: '#1a1a1a', c3: '#f8f4e8', p: 'veins' }, { seasons: ['summer', 'autumn'], lv: 3, size: 1.2, blurb: 'Orange stained glass on the wing.' }),
  _gbB('purple-emperor', 'Purple emperor', 'butterfly', 'epic', ['woods', 'tree'], 5, 'perch', 110, { c: '#5a3a8a', c2: '#e8e4f4', c3: '#f4f4ea', p: 'band' }, { seasons: ['summer'], lv: 6, size: 1.3, blurb: 'Lives up in the oak tops and comes down for the shine.' }),
  _gbB('blue-morpho', 'Blue morpho', 'butterfly', 'legendary', ['woods'], 5, 'perch', 280, { c: '#2f8af0', c2: '#14246a', c3: '#8ad0ff', p: 'sheen' }, { seasons: ['summer'], tod: ['day'], lv: 9, size: 1.5, blurb: 'It flashes electric blue and vanishes.' }),
  _gbB('honeybee', 'Honeybee', 'bee', 'common', ['flower'], 2, 'hover', 5, { c: '#f2b82a', c2: '#2a2218', c3: '#e8f0f4' }, { seasons: ['spring', 'summer', 'autumn'], tod: ['day'], blurb: 'Busy, and entirely dependable.' }),
  _gbB('bumblebee', 'Bumblebee', 'bee', 'common', ['flower'], 2, 'hover', 6, { c: '#f4d03a', c2: '#2a2218', c3: '#f4ecd8', p: 'fur' }, { seasons: ['spring', 'summer', 'autumn'], tod: ['day'], size: 1.1, blurb: 'Round, fuzzy and somehow airborne.' }),
  /* beetles and crawlers */
  _gbB('ladybird', 'Seven-spot ladybird', 'ladybird', 'common', ['flower', 'lawn', 'ground'], 1, 'crawl', 6, { c: '#e0301f', c2: '#1a1a1a' }, { seasons: ['spring', 'summer', 'autumn'], blurb: 'Counting its spots: seven.' }),
  _gbB('ground-beetle', 'Ground beetle', 'beetle', 'common', ['ground', 'lawn'], 1, 'crawl', 4, { c: '#26304a', c2: '#5a7ac8', c3: '#14182a' }, { tod: ['dusk', 'night'], blurb: 'Hunts slugs under the leaves.' }),
  _gbB('cardinal-beetle', 'Cardinal beetle', 'beetle', 'uncommon', ['flower', 'woods'], 2, 'crawl', 12, { c: '#e0301f', c2: '#3a1a14', c3: '#1a1a1a' }, { seasons: ['spring', 'summer'], blurb: 'Red as a cardinal’s robe.' }),
  _gbB('rose-chafer', 'Rose chafer', 'beetle', 'uncommon', ['flower'], 2, 'crawl', 16, { c: '#4aa86a', c2: '#d8c84a', c3: '#2a5a3a', p: 'metal' }, { seasons: ['summer'], tod: ['day'], blurb: 'Metallic green. It loves the roses.' }),
  _gbB('stag-beetle', 'Stag beetle', 'stag', 'rare', ['woods', 'ground'], 3, 'crawl', 55, { c: '#3a2418', c2: '#6a3a22', c3: '#2a180e' }, { seasons: ['summer'], tod: ['dusk', 'night'], lv: 3, size: 1.4, blurb: 'Antlers on its jaws and a very slow temper.' }),
  _gbB('snail', 'Garden snail', 'snail', 'common', ['ground', 'lawn'], 1, 'crawl', 3, { c: '#b48a56', c2: '#8a6030', c3: '#d8c8a8' }, { rain: 1, tod: ['dawn', 'dusk', 'night'], blurb: 'Taking its house for a walk.' }),
  _gbB('caterpillar', 'Caterpillar', 'caterpillar', 'common', ['flower', 'tree'], 1, 'crawl', 4, { c: '#7ac24a', c2: '#e8d84a', c3: '#2a5a2a' }, { seasons: ['spring', 'summer'], blurb: 'Eating its way to something grander.' }),
  _gbB('stick-insect', 'Stick insect', 'stick', 'rare', ['woods', 'tree'], 2, 'crawl', 48, { c: '#8a7a4a', c2: '#a89a64', c3: '#5a4e2a' }, { lv: 4, size: 1.3, blurb: 'You looked right at it and saw a twig.' }),
  _gbB('garden-spider', 'Garden spider', 'spider', 'common', ['tree', 'flower'], 1, 'crawl', 5, { c: '#b88a4a', c2: '#f4e8c8', c3: '#5a3a1a', p: 'cross' }, { seasons: ['summer', 'autumn'], blurb: 'A cross on its back and a web by the gate.' }),
  /* hoppers */
  _gbB('grasshopper', 'Meadow grasshopper', 'hopper', 'common', ['lawn', 'flower'], 3, 'perch', 6, { c: '#7ab43a', c2: '#c8d86a', c3: '#4a7a2a' }, { seasons: ['summer', 'autumn'], tod: ['day'], blurb: 'One huge leap and it is gone.' }),
  _gbB('field-cricket', 'Field cricket', 'hopper', 'common', ['lawn', 'ground'], 3, 'crawl', 7, { c: '#3a2a1a', c2: '#7a5a34', c3: '#2a1a10' }, { seasons: ['summer', 'autumn'], tod: ['dusk', 'night'], blurb: 'It sings in the dark by rubbing its wings.' }),
  _gbB('cicada', 'Cicada', 'cicada', 'rare', ['woods', 'tree'], 4, 'perch', 46, { c: '#4a6a3a', c2: '#e8f0e0', c3: '#1a2a14' }, { seasons: ['summer'], tod: ['day'], lv: 4, size: 1.25, blurb: 'The loudest thing in the whole wood.' }),
  _gbB('praying-mantis', 'Praying mantis', 'mantis', 'rare', ['flower', 'lawn'], 4, 'perch', 50, { c: '#7ab43a', c2: '#c8e07a', c3: '#4a7a2a' }, { seasons: ['summer', 'autumn'], tod: ['day'], lv: 4, size: 1.35, blurb: 'Perfectly still, hands together, thinking about lunch.' }),
  /* water */
  _gbB('pond-skater', 'Pond skater', 'skater', 'common', ['water'], 2, 'hover', 4, { c: '#4a4a3a', c2: '#8a8a6a', c3: '#2a2a22' }, { seasons: ['spring', 'summer', 'autumn'], tod: ['day'], blurb: 'Walks on water and does not mention it.' }),
  _gbB('damselfly', 'Azure damselfly', 'dragonfly', 'uncommon', ['water', 'flower'], 4, 'perch', 20, { c: '#3a9ae8', c2: '#1a1a2a', c3: '#dff0fa', p: 'slim' }, { seasons: ['summer'], tod: ['day'], blurb: 'A blue needle with glass wings.' }),
  _gbB('emperor-dragonfly', 'Emperor dragonfly', 'dragonfly', 'rare', ['water'], 5, 'perch', 62, { c: '#2f8ad8', c2: '#3a9a4a', c3: '#e4f4fa', p: 'big' }, { seasons: ['summer'], tod: ['day'], lv: 4, size: 1.5, blurb: 'Patrols the water like it signed for it.' }),
  /* the night */
  _gbB('firefly', 'Firefly', 'firefly', 'uncommon', ['lawn', 'woods', 'light'], 2, 'hover', 22, { c: '#3a3a2a', c2: '#ffe25a', c3: '#e8503a' }, { seasons: ['summer'], tod: ['dusk', 'night'], blurb: 'A small lantern that blinks.' }),
  _gbB('hawk-moth', 'Hummingbird hawk-moth', 'moth', 'uncommon', ['flower', 'light'], 4, 'hover', 24, { c: '#8a7a64', c2: '#e88a2a', c3: '#e8e0d0', p: 'fur' }, { seasons: ['summer', 'autumn'], tod: ['dusk', 'night'], blurb: 'Hovers at the flower and drinks.' }),
  _gbB('tiger-moth', 'Garden tiger moth', 'moth', 'rare', ['light', 'flower'], 3, 'perch', 52, { c: '#8a4a2a', c2: '#f4ecd8', c3: '#d8301a', p: 'tiger' }, { seasons: ['summer'], tod: ['dusk', 'night'], lv: 4, blurb: 'Loud brown patterns and hidden red.' }),
  _gbB('luna-moth', 'Luna moth', 'moth', 'epic', ['light', 'woods'], 3, 'perch', 120, { c: '#b4e0a4', c2: '#e4f4d8', c3: '#8a5a9a', p: 'tails' }, { seasons: ['summer', 'spring'], tod: ['night'], lv: 6, size: 1.45, blurb: 'Pale green wings with long tails, drawn by lantern light.' }),
]);
const _GF_BUG = new Map(GARDEN_BUGS.map(b => [b.id, b]));

/* ---------- gear ---------- */
function _gfG(id, kind, tier, name, price, lv, st, blurb, more) { return Object.freeze(Object.assign({ id, kind, tier, name, price, lv, st: Object.freeze(st), blurb }, more || {})); }
/* A rod: range (cells you can cast), bar (the catch bar's share of the reel track), line (how slowly the catch slips away while
   you miss: lower is kinder), bite (seconds of wait you shave off), react (extra seconds to strike), q (the best quality it lands). */
const GARDEN_RODS = Object.freeze([
  _gfG('rod-1', 'rod', 1, 'Bamboo rod', 0, 1, { range: 3, bar: 0.2, line: 1, bite: 0, react: 0, q: 1 }, 'A bit of bamboo, some string and plenty of hope.', { own: 1 }),
  _gfG('rod-2', 'rod', 2, 'Fibreglass rod', 80, 3, { range: 4, bar: 0.24, line: 0.9, bite: 0.8, react: 0.1, q: 2 }, 'Springy and light. It reaches one cell further.'),
  _gfG('rod-3', 'rod', 3, 'Carbon rod', 240, 6, { range: 6, bar: 0.28, line: 0.8, bite: 1.6, react: 0.2, q: 2 }, 'Stiff and quick. It reaches out to where the big shadows swim.'),
  _gfG('rod-4', 'rod', 4, 'Master rod', 620, 9, { range: 8, bar: 0.33, line: 0.7, bite: 2.4, react: 0.3, q: 3 }, 'Hand-built, and it reaches the deep water from the pier.'),
  _gfG('rod-5', 'rod', 5, 'Golden rod', 0, 1, { range: 10, bar: 0.38, line: 0.6, bite: 3.2, react: 0.4, q: 3 }, 'It glitters, and the fish seem to want to meet it.', { ribbon: 'master-angler' }),
]);
const GARDEN_NETS = Object.freeze([
  _gfG('net-1', 'net', 1, 'Hand net', 0, 1, { reach: 1.1, swing: 0.55, luck: 0 }, 'A mesh bag on a stick.', { own: 1 }),
  _gfG('net-2', 'net', 2, 'Butterfly net', 70, 3, { reach: 1.5, swing: 0.45, luck: 0.06 }, 'Light and wide. Butterflies hate it.'),
  _gfG('net-3', 'net', 3, 'Long-handled net', 210, 8, { reach: 2, swing: 0.38, luck: 0.12 }, 'Reaches dragonflies on their reed.'),
  _gfG('net-4', 'net', 4, 'Golden net', 0, 1, { reach: 2.5, swing: 0.3, luck: 0.2 }, 'The bugs seem to hold still for it.', { ribbon: 'entomologist' }),
]);
/* Bait is eaten when a fish bites, if you pick it. lure: fish notice it from further off, and nibble less; rare: shy fish are keener to come; night: more so at night (94-garden-fish-6school.js). */
const GARDEN_BAITS = Object.freeze([
  _gfG('worm', 'bait', 0, 'Worms', 0, 1, { lure: 0, rare: 0 }, 'Free and wriggly. A fish has to swim close to notice.', { own: 1 }),
  _gfG('dough', 'bait', 1, 'Bread dough', 3, 1, { lure: 1.6, rare: 0 }, 'Fish notice it from further away.', { pack: 5 }),
  _gfG('maggot', 'bait', 1, 'Maggots', 5, 3, { lure: 0.8, rare: 0.12 }, 'Shy fish are keener to come.', { pack: 5 }),
  _gfG('glow-lure', 'bait', 2, 'Glow lure', 14, 6, { lure: 0.8, rare: 0.18, night: 1 }, 'Seen from afar, and at night the shy ones come for it.', { pack: 3 }),
  _gfG('chum', 'bait', 1, 'Fish chum', 8, 2, { lure: 0.4, rare: 0.05, chum: 1 }, 'Goes in with your cast, and brings a fish up near your float.', { pack: 3 }),
  _gfG('golden-fly', 'bait', 3, 'Golden fly', 40, 9, { lure: 1.2, rare: 0.35 }, 'Even the great fish cannot resist it.', { pack: 2 }),
]);
/* Floats for the line: unlocked by catching, chosen in the tackle shop; they change how the bobber looks and nothing else. */
const GARDEN_BOBBERS = Object.freeze([
  Object.freeze({ id: 'cork', name: 'Cork float', c: '#f4f0e6', c2: '#d8301a', unlock: 'start', hint: 'Yours from the start.' }),
  Object.freeze({ id: 'duck', name: 'Rubber duck', c: '#f4d03a', c2: '#e8782a', unlock: 'fish:5', hint: 'Catch 5 fish.' }),
  Object.freeze({ id: 'star', name: 'Starlight float', c: '#7a6ac8', c2: '#ffe27a', unlock: 'species:10', hint: 'Catch 10 kinds of fish.' }),
  Object.freeze({ id: 'frog', name: 'Frog float', c: '#5fb43a', c2: '#f4f0b0', unlock: 'fish:60', hint: 'Catch 60 fish.' }),
  Object.freeze({ id: 'lantern', name: 'Lantern float', c: '#e8503a', c2: '#ffd86a', unlock: 'rare:3', hint: 'Catch 3 rare fish.' }),
  Object.freeze({ id: 'gold', name: 'Golden float', c: '#f2c432', c2: '#fff0a0', unlock: 'species:30', hint: 'Catch 30 kinds of fish.' }),
]);
/* What you build for the lake (kind 'lake', owned for good like a rod, in order of a chain's tier where they need one another). Mid and late game: the first ones change what you can reach, the later ones what swims there.
   Fish start few and grow with your level (94-garden-fish-6school.js, _gfsWant); these add to that, never by much. */
const GARDEN_WORKS = Object.freeze([
  _gfG('pier-2', 'lake', 2, 'Longer pier', 350, 3, { adds: 'Pier 4 cells longer' }, 'New planks out over the middle of the lake, towards the bigger fish.', { icon: 'waves' }),
  _gfG('pier-3', 'lake', 3, 'Deep-water pier', 900, 7, { adds: 'Pier 4 cells longer again' }, 'All the way out, to where the fins are.', { icon: 'waves', needs: 'pier-2' }),
  _gfG('fish-feeder', 'lake', 1, 'Fish feeder', 120, 2, { adds: 'One more fish in the shallows and open water' }, 'A little drum that scatters feed each morning.', { icon: 'fish' }),
  _gfG('reed-beds', 'lake', 1, 'Bed of reeds', 300, 4, { adds: 'One more fish in deep water, and shy fish come more readily' }, 'Somewhere for the big ones to feel safe.', { icon: 'leaf' }),
  _gfG('fishing-station', 'lake', 1, 'Fishing station', 500, 6, { adds: 'Bigger bar, and longer to strike' }, 'A proper seat, a rod rest and somewhere to put your tea.', { icon: 'armchair' }),
  _gfG('night-lantern', 'lake', 1, 'Night lantern', 250, 5, { adds: 'Night fish come more readily, and one more at night' }, 'A lamp on a pole, and everything that likes the dark comes to look.', { icon: 'lamp' }),
  _gfG('pool-stock', 'lake', 1, 'Bucket of young fish', 400, 7, { adds: 'One more fish in each pond' }, 'A bucket of young fish for your still water.', { icon: 'droplets' }),
]);
const _GF_GEAR = new Map(GARDEN_RODS.concat(GARDEN_NETS, GARDEN_BAITS, GARDEN_WORKS).map(x => [x.id, x]));

/* ---------- the economy: calm, never a farm ---------- */
const GARDEN_CATCH_ECON = Object.freeze({
  xpFish: 30,                                           // fish a day that earn XP: fishing has no limit (2.34), levelling from it has
  marketFish: 90, marketBugs: 50, afterCap: 0.2,        // coins the market pays a day for fish and for bugs; past it, a fifth
  showFish: 6, showBugs: 9, bagMax: 400,                // the showcase tank holds 6 fish and the case 9 bugs
  giftMax: 3,                                           // catches you can put in one parcel a day, per friend
  strike: 1.3,                                          // seconds you have to strike
});

/* ---------- lookups ---------- */
function gardenFishDef(id) { return _GF_FISH.get(String(id)) || null; }
function gardenBugDef(id) { return _GF_BUG.get(String(id)) || null; }
function gardenGearDef(id) { return _GF_GEAR.get(String(id)) || null; }
function gardenBobberDef(id) { return GARDEN_BOBBERS.find(b => b.id === id) || GARDEN_BOBBERS[0]; }
function gardenQuality(q) { return GARDEN_QUALITY[Math.max(0, Math.min(3, Math.floor(Number(q) || 0)))]; }
/** 'fish:carp-2' -> {id:'carp', q:2}, else null. */
function gardenFishParse(key) {
  const m = /^fish:([a-z0-9-]+)-([0-3])$/.exec(String(key || ''));
  return m && _GF_FISH.has(m[1]) ? { id: m[1], q: Number(m[2]) } : null;
}
function gardenFishKey(id, q) { return `fish:${id}-${Math.max(0, Math.min(3, Math.floor(Number(q) || 0)))}`; }
function gardenBugKey(id) { return 'bug:' + id; }

/* ---------- rolling a catch ---------- */
/** Is this fish about right now? ctx {zone, tod, season, rain, level, rare (bait bonus 0..1), gold (the golden fly), night (a glow lure)}. */
function gardenFishFits(f, ctx) {
  if (!f.zone.includes(ctx.zone)) return false;
  if (f.lv > (ctx.level || 1)) return false;
  if (f.tod.length && !f.tod.includes(ctx.tod)) return false;
  if (f.seasons.length && !f.seasons.includes(ctx.season)) return false;
  return true;
}
/** The odds: {id: weight} for every fish and find that can bite here, now. Rarer fish count for more with better bait. */
function gardenFishOdds(ctx) {
  const out = [];
  const rareBoost = 1 + (ctx.rare || 0) * 3;
  for (const f of GARDEN_FISH) {
    if (f.cat === 'fish' && !gardenFishFits(f, ctx)) continue;
    if (f.cat !== 'fish' && !f.zone.includes(ctx.zone)) continue;
    let w = (GARDEN_RARITY[f.rarity] || GARDEN_RARITY.common).weight;
    if (f.rarity !== 'common') w *= rareBoost;
    if (f.cat !== 'fish') w = f.cat === 'junk' ? 6 : 4;      // finds are a small part of what bites
    if (f.rain && ctx.rain) w *= 2.4;
    if (ctx.night && f.tod.includes('night')) w *= 1.6;
    if (ctx.tod === 'night' && f.tod.length && !f.tod.includes('night') && f.cat === 'fish') w *= 0.5;
    out.push([f.id, w]);
  }
  return out;
}
/** Pick by weight with a seeded random. */
function gardenFishPick(odds, rnd) {
  let sum = 0; for (const [, w] of odds) sum += w;
  let r = rnd() * sum;
  for (const [id, w] of odds) { r -= w; if (r <= 0) return id; }
  return odds.length ? odds[odds.length - 1][0] : 'minnow';
}
/** How big (cm), 0..1 share of the range, biased up by a good rod and a perfect reel. */
function gardenFishSize(f, rnd, bonus) {
  const t = Math.min(1, Math.pow(rnd(), 1.5) * 0.85 + (bonus || 0));
  return Math.round(f.cm[0] + (f.cm[1] - f.cm[0]) * t);
}
/** What a fish of this size and quality is worth at the market. */
function gardenFishValue(id, cm, q) {
  const f = gardenFishDef(id); if (!f) return 0;
  if (f.cat !== 'fish') return f.price;
  const span = Math.max(1, f.cm[1] - f.cm[0]), t = Math.max(0, Math.min(1, ((Number(cm) || f.cm[0]) - f.cm[0]) / span));
  return Math.max(1, Math.round(f.price * (0.75 + 0.5 * t) * gardenQuality(q).mult));
}
/** A bug is worth its price; a rarer one pinned in a case is worth the same. */
function gardenBugValue(id) { const b = gardenBugDef(id); return b ? b.price : 0; }
/** The three requests of the order board for a day: {fish, n, c (coins), item}; the same on every device. */
function gardenTradesFor(iso, level) {
  const rnd = gardenRand('gd-trades|' + iso);
  // only things you can go and get on any day: no night, season or legendary fish, no pond fish before the pond opens
  const pool = GARDEN_FISH_ONLY.filter(f => f.lv <= (level || 1) && !f.tod.length && !f.seasons.length && f.rarity !== 'epic' && f.rarity !== 'legendary' && f.zone.some(z => z !== 'pond' || (level || 1) >= 7));
  const bugs = GARDEN_BUGS.filter(b => b.lv <= (level || 1) && !b.seasons.length && !b.rain && b.tod.includes('day') && b.rarity !== 'epic' && b.rarity !== 'legendary');
  const out = [], used = new Set();
  const gifts = [{ i: { 'bait:maggot': 3 } }, { i: { fertiliser: 3 } }, { i: { 'bait:dough': 5 } }, { i: { 'seed:*uncommon': 1 } }, { i: { 'bait:glow-lure': 2 } }];
  for (let k = 0; k < 3; k++) {
    const wantBug = k === 2 && bugs.length;
    const list = wantBug ? bugs : pool;
    if (!list.length) break;
    let d = list[Math.floor(rnd() * list.length)];
    for (let t = 0; t < 8 && used.has(d.id); t++) d = list[Math.floor(rnd() * list.length)];
    used.add(d.id);
    const n = wantBug ? 1 + Math.floor(rnd() * 2) : d.rarity === 'common' ? 2 + Math.floor(rnd() * 2) : 1;
    const g = gifts[Math.floor(rnd() * gifts.length)];
    const value = (wantBug ? d.price : d.price) * n;
    out.push({ id: 'o' + k, kind: wantBug ? 'bug' : 'fish', want: d.id, n, c: Math.round(value * 1.5) + 6, i: g.i, who: ['The cook', 'A naturalist', 'The ferryman', 'A schoolchild', 'The vicar', 'A baker'][Math.floor(rnd() * 6)] });
  }
  return out;
}

/* ---------- the showcase and the wire (what friends see; every id from these tables, every number in bounds) ---------- */
/**
 * Clean a received showcase: {f: [[fishId, q, cm]], b: [bugId], rod: 1..5, net: 1..4, t: title id}. Anything unknown is dropped.
 * Returns {f, b, rod, net} or null when empty.
 */
function gardenShowClean(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const E = GARDEN_CATCH_ECON, int = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
  const f = [], b = [];
  if (Array.isArray(raw.f)) for (const x of raw.f.slice(0, E.showFish)) {
    if (!Array.isArray(x)) continue;
    const def = gardenFishDef(x[0]); if (!def || def.cat !== 'fish') continue;
    const q = int(x[1], 0, 3), cm = int(x[2], 1, 400);
    if (q === null || cm === null) continue;
    f.push([def.id, q, cm]);
  }
  if (Array.isArray(raw.b)) for (const id of raw.b.slice(0, E.showBugs)) if (gardenBugDef(id) && !b.includes(id)) b.push(id);
  const rod = int(raw.rod, 1, 5) || 0, net = int(raw.net, 1, 4) || 0;
  if (!f.length && !b.length && !rod && !net) return null;
  return { f, b, rod, net };
}
/** A short key for a showcase (the art cache and change detection). */
function gardenShowSig(show) { return show ? gardenHash(JSON.stringify([show.f || [], show.b || []])).toString(36) : ''; }

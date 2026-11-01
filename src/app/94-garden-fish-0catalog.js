/* ============================================================
   GARDEN, fishing and bug catching: THE CATALOGUE (2.22). PURE: tables and small functions, no DOM, no state; Node
   evaluates it after 94-garden-0catalog.js (lib/friends/garden.mjs), like the garden catalogue itself.

   User request, 30 Oct 2026: "a fishing mini game ... similar to stardew valley ... collect fish, trade them / gift them
   to other people, showcase them somehow, upgrades to fishing rods ... bug collecting too ... I want the player to always
   be in the garden and the fishing mini game to be connected to it."

     GARDEN_FISH       about 300 fish and 9 finds (junk and treasure): where, when, how hard, how big, what they are worth
     GARDEN_BUGS       about 300 bugs: where they live, when they come out, how jumpy, how they sit
     needs             on any fish or bug, optional: world things decide whether it can APPEAR (gardenFishFits, gardenBugFits: tod, season, rain, moon, zone, spot, level,
                       decor, plant, event, chance), setup things whether it will COME TO YOUR LINE (gardenFishLacks: rod, reel, line, hook, bait) or into your net (net).
                       gardenCatchNeedsWords(def) writes the how-to-catch lines from this very data, so the dictionary cannot disagree with the game
     GARDEN_RODS       five rods (the bamboo one is yours; the golden one is a ribbon prize)
     GARDEN_NETS       four nets (the hand net is yours; the golden one is a ribbon prize)
     GARDEN_BAITS      bait you can bring along; GARDEN_BOBBERS: floats you unlock by catching
     GARDEN_CATCH_ECON what the market will pay for, the XP a day from fish, the showcase sizes
     GARDEN_TRADES     the order board: three requests a day, paid in goods (the same on every device)

   Every id is stable and unique, saved in the state and sent to friends: never rename or reuse one.

   ITEMS in the bag (the garden ledger's item map): fish:<id>-<q> (q 0..3: plain, good, fine, perfect), bug:<id>,
   gear:<rod-or-net-id> (owned for good), bait:<id>, bobber:<id>. The record of what you have ever caught (best size,
   how many, the first day) is state.garden.fl / .bl, so selling or gifting a fish never loses your log.

   ART (94-garden-fish-1art.js): the look {s: shape, c, c2, c3, p: pattern; optional t: tail, d: back fin, m: mouth, x: extra, k: [long, tall], w: wing} is all the drawing needs.
   ============================================================ */
function _gfF(id, name, zone, rarity, diff, beh, cm, price, look, more) {
  const m = more || {};
  return Object.freeze(Object.assign({ id, name, cat: 'fish', zone: Object.freeze(zone), rarity, diff, beh, cm: Object.freeze(cm), price, look: Object.freeze(look), tod: Object.freeze(m.tod || []), seasons: Object.freeze(m.seasons || []), rain: m.rain || 0, lv: m.lv || 1, blurb: m.blurb || '' }, m.needs ? { needs: Object.freeze(m.needs) } : {}));
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
  _gfF('emperor-koi', 'Emperor koi', ['pond'], 'legendary', 8, 'dart', [60, 95], 260, { s: 'koi', c: '#f2c432', c2: '#fff0a0', c3: '#d8941a', p: 'speckle' }, { needs: { chance: 12 }, lv: 9, blurb: 'Gold from nose to tail. The pond is proud of it.' }),
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
  _gfF('moonfish', 'Moonfish', ['deep'], 'legendary', 9, 'floater', [40, 80], 320, { s: 'round', c: '#dfe6f2', c2: '#fbfdff', c3: '#a8b8da', p: 'glow' }, { needs: { chance: 12 }, tod: ['night'], lv: 10, blurb: 'A silver disc that rises with the moon.' }),
  _gfF('sunburst-fish', 'Sunburst fish', ['deep'], 'legendary', 9, 'dart', [40, 75], 320, { s: 'round', c: '#f4a22a', c2: '#ffe17a', c3: '#e8501a', p: 'glow' }, { needs: { chance: 12 }, tod: ['day'], seasons: ['summer'], lv: 10, blurb: 'Catches the light and keeps it.' }),
  _gfF('old-whiskers', 'Old Whiskers', ['deep'], 'legendary', 10, 'mixed', [180, 300], 480, { s: 'cat', c: '#5a4a3a', c2: '#d8c8a0', c3: '#2a2018', p: 'barbels' }, { needs: { chance: 12 }, tod: ['dawn', 'dusk'], rain: 1, lv: 12, blurb: 'Everybody has a story about this one. Few have the fish.' }),
  /*@more-fish*/
  _gfF('crucian-carp', 'Crucian carp', ['pond'], 'common', 1, 'floater', [10, 35], 10, { s: 'carp', c: '#976c3e', c2: '#d4c08f', c3: '#4e3c0d', p: 'none', k: [1.05, 1.1] }, { lv: 3, blurb: 'A round little carp that thrives on neglect.' }),
  _gfF('sunbleak', 'Sunbleak', ['pond'], 'common', 1, 'dart', [4, 9], 6, { s: 'herring', c: '#91b1b7', c2: '#eaeae7', c3: '#5c637b', p: 'belly', k: [1, 0.96] }, { lv: 4, blurb: 'Small enough to lose in a teaspoon.' }),
  _gfF('fantail', 'Fantail', ['pond'], 'common', 2, 'undefined', [8, 18], 6, { s: 'fancy', c: '#d55413', c2: '#e9ba65', c3: '#9f0e00', p: 'none', t: undefined, d: 'low', k: [0.81, 0.72] }, { lv: 2, blurb: 'All tail and no plans.' }),
  _gfF('guppy', 'Guppy', ['pond'], 'common', 1, 'smooth', [3, 6], 6, { s: 'goby', c: '#91b1e2', c2: '#f4d7af', c3: '#dc5570', p: 'ombre', t: 'fan', k: [1.03, 0.93] }, { lv: 2, blurb: 'Tiny, and dressed for three different parties.' }),
  _gfF('medaka', 'Medaka', ['pond'], 'common', 1, 'dart', [3, 5], 5, { s: 'herring', c: '#dccfbd', c2: '#f0f0db', c3: '#b69d7d', p: 'none', d: 'low', k: [0.9, 0.74] }, { lv: 2, blurb: 'A rice-field fish with enormous optimism.' }),
  _gfF('rosy-minnow', 'Rosy minnow', ['pond'], 'common', 1, 'dart', [4, 8], 5, { s: 'slim', c: '#c9658d', c2: '#dfcdd2', c3: '#a32d48', p: 'stripe', t: undefined, d: undefined, k: [0.88, 0.7] }, { lv: 3, blurb: 'Blushes at everything.' }),
  _gfF('pond-loach', 'Pond loach', ['pond'], 'common', 1, 'sinker', [12, 24], 8, { s: 'loach', c: '#817749', c2: '#ccbd96', c3: '#553b2c', p: 'speckle', t: 'lyre', d: 'spines', k: [0.98, 0.99] }, { lv: 2, blurb: 'Lives in the mud and reports back on it.' }),
  _gfF('freshwater-shrimp', 'Freshwater shrimp', ['pond'], 'common', 1, 'undefined', [2, 5], 7, { s: 'shrimp', c: '#b9d7e0', c2: '#e3e4df', c3: '#7f9eaf', p: 'none' }, { lv: 4, blurb: 'Mostly legs, and all of them busy.' }),
  _gfF('smooth-newt', 'Smooth newt', ['pond'], 'common', 1, 'floater', [6, 11], 7, { s: 'newt', c: '#789244', c2: '#dfda9e', c3: '#4e4d2d', p: 'spots' }, { seasons: ['spring', 'summer'], lv: 2, blurb: 'Walks along the bottom like it owns the deeds.' }),
  _gfF('mosquitofish', 'Mosquitofish', ['pond'], 'common', 2, 'undefined', [3, 6], 6, { s: 'goby', c: '#b59f7a', c2: '#e2cbab', c3: '#6c6e38', p: 'none', d: undefined, k: [0.88, 0.73] }, { lv: 2, blurb: 'Eats its own weight in gnats. You are welcome.' }),
  _gfF('golden-tench', 'Golden tench', ['pond'], 'uncommon', 3, 'undefined', [20, 45], 18, { s: 'carp', c: '#ce9f25', c2: '#e4e39e', c3: '#a47300', p: 'none', d: undefined, k: [0.88, 0.86] }, { lv: 4, blurb: 'A tench that got dressed up for the occasion.' }),
  _gfF('shubunkin', 'Shubunkin', ['pond'], 'uncommon', 4, 'undefined', [10, 25], 15, { s: 'fancy', c: '#70b9de', c2: '#e5f1fa', c3: '#3c84c3', p: 'patches', d: undefined, k: [0.81, 0.85] }, { lv: 3, blurb: 'Calico, and cross about being called a goldfish.' }),
  _gfF('black-moor', 'Black moor', ['pond'], 'uncommon', 3, 'undefined', [8, 18], 14, { s: 'fancy', c: '#1b233e', c2: '#686691', c3: '#121a1b', p: 'none', t: 'veil', d: 'low', k: [0.85, 0.73] }, { lv: 5, blurb: 'Velvet black with permanently surprised eyes.' }),
  _gfF('sarasa-comet', 'Sarasa comet', ['pond'], 'uncommon', 3, 'smooth', [14, 30], 20, { s: 'fancy', c: '#ffefe8', c2: '#e13e24', c3: '#171c22', p: 'patches', t: 'round', k: [1.04, 1.03] }, { lv: 4, blurb: 'A comet with a red-and-white paint job.' }),
  _gfF('utsuri-koi', 'Utsuri koi', ['pond'], 'uncommon', 3, 'undefined', [30, 60], 19, { s: 'koi', c: '#3a3e44', c2: '#95a49a', c3: '#26131a', p: 'patches', t: undefined, d: undefined, k: [0.83, 0.69] }, { lv: 4, blurb: 'Black lacquer with a splash of something bright.' }),
  _gfF('paradise-fish', 'Paradise fish', ['pond'], 'uncommon', 3, 'smooth', [6, 11], 13, { s: 'tall', c: '#cf4e2c', c2: '#e1c558', c3: '#7b0c50', p: 'bars', k: [1.04, 0.97] }, { lv: 4, blurb: 'Striped, combative and very pleased with itself.' }),
  _gfF('betta', 'Betta', ['pond'], 'uncommon', 3, 'smooth', [5, 8], 13, { s: 'fancy', c: '#2a62bd', c2: '#aec5ed', c3: '#1c3084', p: 'ombre', t: 'veil', d: 'sail', k: [0.98, 1.02] }, { lv: 8, blurb: 'Fights its own reflection and claims the win.' }),
  _gfF('cherry-shrimp', 'Cherry shrimp', ['pond'], 'uncommon', 3, 'smooth', [2, 4], 15, { s: 'shrimp', c: '#c82a3f', c2: '#f9abb9', c3: '#841a17', p: 'none' }, { lv: 5, blurb: 'A very small, very red emergency.' }),
  _gfF('neon-tetra', 'Neon tetra', ['pond'], 'uncommon', 3, 'dart', [3, 5], 12, { s: 'herring', c: '#082347', c2: '#78d2da', c3: '#f23b80', p: 'neon', d: 'low', k: [0.95, 1.04] }, { tod: ['dusk', 'night'], lv: 5, blurb: 'Someone left the light on.' }),
  _gfF('swordtail', 'Swordtail', ['pond'], 'uncommon', 3, 'undefined', [6, 12], 17, { s: 'goby', c: '#e24c01', c2: '#e1b268', c3: '#971a00', p: 'stripe', t: 'whip', d: 'low', k: [0.86, 0.86] }, { lv: 5, blurb: 'Carries its sword behind it, which is safer.' }),
  _gfF('great-crested-newt', 'Great crested newt', ['pond'], 'uncommon', 4, 'mixed', [10, 16], 16, { s: 'newt', c: '#242331', c2: '#897d7b', c3: '#11120a', p: 'spots', x: 'frill' }, { tod: ['dusk', 'night'], seasons: ['spring', 'summer'], lv: 3, blurb: 'A tiny dragon, and it knows.' }),
  _gfF('teacup-carp', 'Teacup carp', ['pond'], 'uncommon', 3, 'undefined', [5, 12], 13, { s: 'carp', c: '#eec0a8', c2: '#fff2e6', c3: '#d87579', p: 'none', t: undefined, d: 'low', k: [0.93, 0.81] }, { lv: 5, blurb: 'Fits in a teacup and insists on one.' }),
  _gfF('silver-dollar', 'Silver dollar', ['pond'], 'uncommon', 3, 'smooth', [10, 20], 18, { s: 'disc', c: '#cdceda', c2: '#e4ece6', c3: '#8da6a8', p: 'none', k: [0.95, 1.04] }, { lv: 4, blurb: 'Round, bright and spends all day floating about.' }),
  _gfF('sticklefin', 'Sticklefin', ['pond'], 'uncommon', 3, 'smooth', [8, 16], 17, { s: 'round', c: '#3b5d29', c2: '#adbc6f', c3: '#1d3716', p: 'bars', d: 'spines', k: [0.99, 0.89] }, { lv: 8, blurb: 'Half fish, half hedgehog, all opinions.' }),
  _gfF('butterfly-koi', 'Butterfly koi', ['pond'], 'rare', 5, 'undefined', [30, 70], 57, { s: 'koi', c: '#f09220', c2: '#ffe69b', c3: '#dd6019', p: 'patches', t: 'veil', d: 'sail', k: [0.82, 0.72] }, { lv: 9, blurb: 'Long fins like a slow wave goodbye.' }),
  _gfF('showa-koi', 'Showa koi', ['pond'], 'rare', 5, 'mixed', [40, 75], 54, { s: 'koi', c: '#ede3d9', c2: '#cd3200', c3: '#040002', p: 'bands', t: 'fan', d: 'sail', k: [1.04, 0.94] }, { lv: 8, blurb: 'Black, red and white, and very much in charge.' }),
  _gfF('asagi-koi', 'Asagi koi', ['pond'], 'rare', 6, 'undefined', [35, 70], 56, { s: 'koi', c: '#72bbe0', c2: '#e7f2fd', c3: '#3e70c5', p: 'lace', d: undefined, k: [0.92, 0.65] }, { lv: 5, blurb: 'Blue net on its back and a red blush below.' }),
  _gfF('platinum-koi', 'Platinum koi', ['pond'], 'rare', 6, 'dart', [40, 80], 50, { s: 'koi', c: '#cbcad1', c2: '#e2e8dc', c3: '#a0a2b3', p: 'none', k: [0.93, 0.91] }, { lv: 8, blurb: 'Plain white metal, polished by nobody.' }),
  _gfF('lionhead', 'Lionhead', ['pond'], 'rare', 6, 'dart', [10, 20], 44, { s: 'fancy', c: '#e77f11', c2: '#eccb83', c3: '#bf4d0a', p: 'none', x: 'crown', d: 'twin', k: [0.97, 0.95] }, { lv: 10, blurb: 'Wearing a hat it grew itself.' }),
  _gfF('angelfish', 'Angelfish', ['pond'], 'rare', 5, 'undefined', [10, 18], 54, { s: 'tall', c: '#c2cbd5', c2: '#e3f1ea', c3: '#97a3a3', p: 'bars', t: 'lyre', d: undefined, k: [0.81, 0.78] }, { lv: 9, needs: { bait: ['dough', 'berry'] }, blurb: 'Tall, thin and looks down on you.' }),
  _gfF('oscar', 'Oscar', ['pond'], 'rare', 5, 'smooth', [20, 35], 51, { s: 'chunky', c: '#272e2d', c2: '#827f82', c3: '#000806', p: 'eye', d: undefined, k: [0.86, 0.66] }, { lv: 12, needs: { bait: ['maggot', 'shrimp'] }, blurb: 'Recognises you. Does not approve.' }),
  _gfF('terrapin', 'Terrapin', ['pond'], 'rare', 6, 'sinker', [15, 28], 41, { s: 'turtle', c: '#134a2f', c2: '#82aa6f', c3: '#051407', p: 'none' }, { rain: 1, lv: 9, blurb: 'Takes the bait slowly, and regrets nothing.' }),
  _gfF('pond-jelly', 'Pond jelly', ['pond'], 'rare', 5, 'floater', [2, 6], 42, { s: 'jelly', c: '#d3ede6', c2: '#f3f2f2', c3: '#84b5ca', p: 'none' }, { seasons: ['summer'], lv: 8, needs: { rain: false }, blurb: 'A freshwater jellyfish. Yes, really.' }),
  _gfF('albino-catfish', 'Albino catfish', ['pond'], 'rare', 5, 'sinker', [25, 55], 45, { s: 'cat', c: '#d2ccb2', c2: '#f1e6dd', c3: '#ac9b73', p: 'none', t: 'whip', k: [1.03, 0.93] }, { tod: ['night'], lv: 10, blurb: 'Pink eyes and a very pale outlook.' }),
  _gfF('pearl-gourami', 'Pearl gourami', ['pond'], 'rare', 5, 'undefined', [8, 14], 50, { s: 'tall', c: '#a983d1', c2: '#e6caf1', c3: '#604b9c', p: 'lace', t: 'lyre', d: undefined, k: [0.83, 0.69] }, { lv: 9, blurb: 'Dressed in lace and long feelers.' }),
  _gfF('lily-sprite', 'Lily sprite', ['pond'], 'rare', 5, 'smooth', [5, 10], 52, { s: 'goby', c: '#67c08b', c2: '#c8e7dc', c3: '#1a8456', p: 'stars', k: [0.93, 1.01] }, { lv: 6, needs: { spot: 'lily-pads' }, blurb: 'Hides under a lily pad and giggles.' }),
  _gfF('fountain-darter', 'Fountain darter', ['pond'], 'rare', 5, 'dart', [6, 14], 42, { s: 'needle', c: '#52b1cf', c2: '#d0fbeb', c3: '#1d808f', p: 'stripe', d: 'twin', k: [0.94, 0.94] }, { lv: 7, needs: { decor: 'fountain' }, blurb: 'Only stays where the water is singing.' }),
  _gfF('discus', 'Discus', ['pond'], 'epic', 7, 'undefined', [12, 20], 138, { s: 'disc', c: '#156f77', c2: '#b3e0d6', c3: '#054350', p: 'rings', d: undefined, k: [0.91, 0.77] }, { lv: 8, needs: { bait: ['shrimp', 'golden-fly'] }, blurb: 'A dinner plate with a very high opinion of itself.' }),
  _gfF('tancho-koi', 'Tancho koi', ['pond'], 'epic', 7, 'smooth', [40, 80], 119, { s: 'koi', c: '#e9fbfa', c2: '#ffffff', c3: '#bdc3ce', p: 'tip', k: [0.94, 0.98] }, { tod: ['dawn'], lv: 12, needs: { rod: 3 }, blurb: 'Pure white, with one red sun on its head.' }),
  _gfF('axolotl', 'Axolotl', ['pond'], 'epic', 7, 'undefined', [15, 25], 118, { s: 'newt', c: '#e39d9a', c2: '#e2e4d8', c3: '#b8676b', p: 'none', x: 'frill' }, { tod: ['night'], lv: 8, needs: { bait: ['maggot', 'shrimp'] }, blurb: 'Smiles at everything. Never grew up, never will.' }),
  _gfF('snapping-turtle', 'Snapping turtle', ['pond'], 'epic', 7, 'sinker', [30, 50], 128, { s: 'turtle', c: '#355014', c2: '#7a8941', c3: '#1c1c09', p: 'none' }, { tod: ['night'], lv: 14, needs: { hook: 'hook-large' }, blurb: 'Mind your fingers. And your rod.' }),
  _gfF('porcelain-koi', 'Porcelain koi', ['pond'], 'epic', 7, 'smooth', [45, 85], 122, { s: 'koi', c: '#def3fc', c2: '#f5ffff', c3: '#86bfdc', p: 'stars', k: [1.04, 1.03] }, { seasons: ['winter'], lv: 14, needs: { rain: false }, blurb: 'Looks as if it would chip if you spoke sharply.' }),
  _gfF('wishing-fish', 'Wishing fish', ['pond'], 'epic', 7, 'smooth', [15, 30], 143, { s: 'round', c: '#d8c733', c2: '#e2e6a4', c3: '#ab9c0f', p: 'glow', t: 'fan', d: 'low', k: [1.03, 1] }, { lv: 11, needs: { decor: 'wishing-well', moon: ['full'] }, blurb: 'Grants nothing, but looks as though it might.' }),
  _gfF('clockwork-koi', 'Clockwork koi', ['pond'], 'legendary', 9, 'undefined', [50, 90], 310, { s: 'koi', c: '#c8923b', c2: '#edcba7', c3: '#7b621d', p: 'scales', t: undefined, d: undefined, k: [0.92, 0.68] }, { tod: ['dawn'], lv: 12, needs: { moon: ['new'], bait: ['golden-fly'], reel: 'reel-gold', chance: 12 }, blurb: 'It ticks. Nobody remembers winding it.' }),
  _gfF('old-gran', 'Old Gran', ['pond'], 'legendary', 9, 'undefined', [80, 120], 392, { s: 'carp', c: '#5e7542', c2: '#bbbf88', c3: '#2c3f1e', p: 'mirror', d: undefined, k: [0.92, 0.87] }, { seasons: ['autumn'], lv: 19, needs: { rod: 4, bait: ['berry'], chance: 12, rain: true }, blurb: 'Was in this pond before the pond was.' }),
  _gfF('dace', 'Dace', ['shallow'], 'common', 2, 'dart', [10, 22], 8, { s: 'slim', c: '#9caac1', c2: '#f5f8f2', c3: '#527171', p: 'belly', d: 'low', k: [0.85, 0.86] }, { lv: 1, blurb: 'Quick and silver, and gone before you say so.' }),
  _gfF('bleak', 'Bleak', ['shallow'], 'common', 3, 'dart', [8, 15], 7, { s: 'herring', c: '#cacfc9', c2: '#ebe0dd', c3: '#a097af', p: 'stripe', t: 'lyre', k: [0.99, 0.99] }, { lv: 1, blurb: 'A sad name for a cheerful little fish.' }),
  _gfF('ruffe', 'Ruffe', ['shallow'], 'common', 2, 'smooth', [8, 15], 6, { s: 'round', c: '#beb287', c2: '#f6eac5', c3: '#8b7048', p: 'speckle', d: 'spines', t: 'fork', k: [0.94, 1.01] }, { lv: 5, blurb: 'A small perch with a large sense of grievance.' }),
  _gfF('bullhead', 'Bullhead', ['shallow'], 'common', 3, 'smooth', [6, 12], 6, { s: 'goby', c: '#917856', c2: '#c7bf8e', c3: '#514128', p: 'dapple', t: 'fork', k: [0.95, 1.01] }, { lv: 4, blurb: 'All head, and it sits very still.' }),
  _gfF('stone-loach', 'Stone loach', ['shallow'], 'common', 3, 'sinker', [6, 12], 6, { s: 'loach', c: '#ab9b73', c2: '#d8dcba', c3: '#776946', p: 'saddle', t: 'lyre', k: [1.01, 0.96] }, { lv: 2, blurb: 'Looks exactly like the gravel. That is the plan.' }),
  _gfF('spined-loach', 'Spined loach', ['shallow'], 'common', 2, 'sinker', [6, 12], 7, { s: 'loach', c: '#f7e4c8', c2: '#f6f1e7', c3: '#bdb78d', p: 'spots', t: 'fork', d: 'sail', k: [0.99, 1.09] }, { lv: 4, blurb: 'Dotted in a neat line, as if ruled.' }),
  _gfF('sand-goby', 'Sand goby', ['shallow'], 'common', 2, 'smooth', [5, 9], 7, { s: 'goby', c: '#b8aa70', c2: '#dbcdae', c3: '#6f6343', p: 'speckle', d: 'sail', k: [1, 0.96] }, { lv: 3, blurb: 'Buries itself, then peeps.' }),
  _gfF('silver-bream', 'Silver bream', ['shallow'], 'common', 2, 'undefined', [12, 28], 8, { s: 'flat', c: '#839ba1', c2: '#dcd5d2', c3: '#4d5d62', p: 'none', d: 'low', k: [0.87, 0.76] }, { lv: 2, blurb: 'A bream that takes more care of itself.' }),
  _gfF('bluegill', 'Bluegill', ['shallow'], 'common', 2, 'smooth', [10, 22], 9, { s: 'round', c: '#79b0ed', c2: '#e4f5ff', c3: '#307bbd', p: 'bars', d: undefined, k: [0.89, 0.74] }, { lv: 3, blurb: 'Blue cheeks, as if it held its breath.' }),
  _gfF('shiner', 'Shiner', ['shallow'], 'common', 3, 'dart', [5, 12], 6, { s: 'herring', c: '#6b8992', c2: '#d9dde7', c3: '#3f4146', p: 'neon', t: undefined, d: undefined, k: [0.83, 0.69] }, { lv: 4, blurb: 'Spends its days showing off to nobody.' }),
  _gfF('sculpin', 'Sculpin', ['shallow'], 'common', 2, 'undefined', [5, 13], 6, { s: 'goby', c: '#526c48', c2: '#afca8e', c3: '#344620', p: 'dapple', d: 'spines', k: [0.88, 0.67] }, { lv: 3, blurb: 'An unlikely face, but a kind one.' }),
  _gfF('elver', 'Elver', ['shallow'], 'common', 2, 'mixed', [6, 14], 6, { s: 'eel', c: '#c5ede5', c2: '#faf2ff', c3: '#8ab0c6', p: 'none' }, { seasons: ['spring'], lv: 3, blurb: 'A very small eel with very big travel plans.' }),
  _gfF('tadpole-fish', 'Tadpole fish', ['shallow'], 'common', 2, 'smooth', [3, 6], 6, { s: 'goby', c: '#3f333b', c2: '#9a9990', c3: '#161d26', p: 'none', d: 'twin', k: [0.95, 0.95] }, { seasons: ['spring'], lv: 3, blurb: 'It looks unfinished, because it is.' }),
  _gfF('fathead-minnow', 'Fathead minnow', ['shallow'], 'common', 2, 'mixed', [4, 8], 6, { s: 'goby', c: '#76834d', c2: '#d3d79e', c3: '#4c5321', p: 'bars', k: [0.95, 0.95] }, { lv: 3, blurb: 'Its head is, to be fair, quite fat.' }),
  _gfF('river-limpet-fish', 'River limpet fish', ['shallow'], 'common', 3, 'sinker', [4, 9], 6, { s: 'loach', c: '#54575a', c2: '#aeb3b7', c3: '#1b2d2f', p: 'none', d: 'sail', k: [0.95, 1.08] }, { lv: 2, blurb: 'Clings to a stone and refuses to discuss it.' }),
  _gfF('ide', 'Ide', ['shallow'], 'uncommon', 5, 'dart', [25, 45], 21, { s: 'slim', c: '#b09443', c2: '#edd4aa', c3: '#68542c', p: 'belly', k: [1.02, 1.03] }, { lv: 6, blurb: 'Grand and golden when the sun catches it.' }),
  _gfF('rock-bass', 'Rock bass', ['shallow'], 'uncommon', 5, 'smooth', [12, 25], 17, { s: 'chunky', c: '#893f16', c2: '#d0966e', c3: '#421000', p: 'spots', d: undefined, k: [0.86, 0.86] }, { lv: 3, blurb: 'Red eyes and a stubborn streak.' }),
  _gfF('crappie', 'Crappie', ['shallow'], 'uncommon', 4, 'mixed', [15, 30], 17, { s: 'flat', c: '#747c6e', c2: '#c1bfb8', c3: '#463741', p: 'speckle', t: 'round', k: [0.93, 1.01] }, { tod: ['dawn', 'dusk'], lv: 4, blurb: 'Unfair name. Lovely fish.' }),
  _gfF('yellow-perch', 'Yellow perch', ['shallow'], 'uncommon', 5, 'smooth', [15, 30], 17, { s: 'round', c: '#d6c52d', c2: '#eaeca7', c3: '#a89505', p: 'bars', k: [0.99, 0.99] }, { lv: 3, blurb: 'A perch in a sunny mood.' }),
  _gfF('smelt', 'Smelt', ['shallow'], 'uncommon', 5, 'dart', [10, 20], 15, { s: 'herring', c: '#c3cad6', c2: '#d8ecea', c3: '#73a2b7', p: 'none', k: [0.95, 1.04] }, { seasons: ['winter', 'spring'], lv: 3, blurb: 'Smells of cucumber. Really.' }),
  _gfF('darter', 'Darter', ['shallow'], 'uncommon', 5, 'dart', [5, 10], 18, { s: 'needle', c: '#e96520', c2: '#ffd87e', c3: '#b42304', p: 'bars', d: undefined, k: [0.86, 0.79] }, { lv: 6, blurb: 'Shoots off, stops, looks smug, repeats.' }),
  _gfF('vairone', 'Vairone', ['shallow'], 'uncommon', 4, 'dart', [8, 15], 13, { s: 'slim', c: '#737b8d', c2: '#d7dbd9', c3: '#314352', p: 'stripe', k: [1.01, 1.09] }, { lv: 4, blurb: 'A dark stripe and an Italian accent.' }),
  _gfF('rainbow-shiner', 'Rainbow shiner', ['shallow'], 'uncommon', 4, 'dart', [6, 10], 17, { s: 'herring', c: '#94b5e4', c2: '#ffe8a7', c3: '#e04975', p: 'ombre', d: 'low', k: [0.81, 0.72] }, { rain: 1, lv: 4, blurb: 'It has not picked a colour and sees no need.' }),
  _gfF('sunfish', 'Sunfish', ['shallow'], 'uncommon', 4, 'smooth', [10, 22], 18, { s: 'round', c: '#d9811e', c2: '#f3ce90', c3: '#c75406', p: 'rings', t: 'whip', k: [0.98, 0.99] }, { seasons: ['summer'], lv: 8, blurb: 'Round as a coin, and about as bright.' }),
  _gfF('longear', 'Longear', ['shallow'], 'uncommon', 5, 'smooth', [8, 18], 17, { s: 'round', c: '#1696af', c2: '#aff3e3', c3: '#0f5e82', p: 'stripe', d: 'low', k: [0.88, 0.64] }, { seasons: ['summer'], lv: 6, blurb: 'Its ear-flap is its pride and joy.' }),
  _gfF('musk-turtle', 'Musk turtle', ['shallow'], 'uncommon', 5, 'sinker', [7, 13], 15, { s: 'turtle', c: '#7d6541', c2: '#b3ac8e', c3: '#3d2e13', p: 'none' }, { rain: 1, lv: 3, blurb: 'Small, smelly and well-meaning.' }),
  _gfF('mud-crab', 'Mud crab', ['shallow'], 'uncommon', 5, 'sinker', [5, 10], 17, { s: 'crab', c: '#715d3e', c2: '#bca48a', c3: '#46260f', p: 'none' }, { tod: ['dusk', 'night'], lv: 3, blurb: 'Walks sideways out of every conversation.' }),
  _gfF('fairy-shrimp', 'Fairy shrimp', ['shallow'], 'uncommon', 4, 'undefined', [2, 4], 13, { s: 'shrimp', c: '#48bac2', c2: '#dbeff2', c3: '#287396', p: 'none' }, { seasons: ['spring'], lv: 5, needs: { rain: true }, blurb: 'Swims on its back and sees no problem.' }),
  _gfF('reed-pipefish', 'Reed pipefish', ['shallow'], 'uncommon', 4, 'dart', [12, 25], 16, { s: 'needle', c: '#5e7345', c2: '#b0c57e', c3: '#2c3d20', p: 'none', d: undefined, k: [0.86, 0.73] }, { lv: 7, needs: { spot: 'reed-bank' }, blurb: 'Looks like a reed. Is very proud of this.' }),
  _gfF('weed-goby', 'Weed goby', ['shallow'], 'uncommon', 4, 'undefined', [5, 10], 13, { s: 'goby', c: '#38b153', c2: '#b9efbe', c3: '#126636', p: 'none', t: undefined, d: undefined, k: [0.81, 0.78] }, { lv: 5, needs: { spot: 'weed-bed' }, blurb: 'Green on green on green.' }),
  _gfF('mayfly-nymph-eater', 'Mayfly nymph-eater', ['shallow'], 'uncommon', 4, 'dart', [15, 30], 19, { s: 'slim', c: '#627f32', c2: '#c9c78c', c3: '#393f1e', p: 'spots', t: undefined, d: undefined, k: [0.84, 0.72] }, { tod: ['dusk'], seasons: ['spring', 'summer'], lv: 7, blurb: 'Keeps very good time with the mayflies.' }),
  _gfF('pebble-fish', 'Pebble fish', ['shallow'], 'uncommon', 4, 'smooth', [4, 9], 17, { s: 'goby', c: '#85837c', c2: '#dce4cf', c3: '#585852', p: 'speckle', t: 'whip', k: [1.03, 0.93] }, { lv: 5, blurb: 'You thought it was a pebble. It thought so too.' }),
  _gfF('dawn-dace', 'Dawn dace', ['shallow'], 'uncommon', 4, 'dart', [12, 22], 15, { s: 'slim', c: '#e8b9ab', c2: '#fff7e1', c3: '#d2837c', p: 'ombre', d: undefined, k: [0.81, 0.65] }, { tod: ['dawn'], lv: 4, blurb: 'Only about at first light, in pink.' }),
  _gfF('lantern-minnow', 'Lantern minnow', ['shallow'], 'rare', 6, 'dart', [6, 12], 38, { s: 'herring', c: '#dad140', c2: '#eee3a5', c3: '#ad9107', p: 'glow', d: undefined, k: [0.86, 0.83] }, { tod: ['night'], lv: 7, needs: { bait: ['glow-lure'] }, blurb: 'A very small lamp with a very small job.' }),
  _gfF('bowfin', 'Bowfin', ['shallow'], 'rare', 7, 'floater', [40, 70], 57, { s: 'hump', c: '#153f1d', c2: '#84b371', c3: '#071d09', p: 'eye', d: 'low', t: 'lyre', k: [0.98, 1.05] }, { tod: ['dusk', 'night'], lv: 9, blurb: 'Older than the dinosaurs and just as polite.' }),
  _gfF('rainbow-darter', 'Rainbow darter', ['shallow'], 'rare', 6, 'dart', [5, 9], 43, { s: 'needle', c: '#7ba1c2', c2: '#f3c68e', c3: '#c73568', p: 'bands', t: 'whip', k: [1.01, 0.93] }, { seasons: ['spring'], lv: 11, blurb: 'Wears every colour at once and gets away with it.' }),
  _gfF('jewel-cichlid', 'Jewel cichlid', ['shallow'], 'rare', 6, 'undefined', [10, 16], 49, { s: 'chunky', c: '#cc2442', c2: '#f3b2b4', c3: '#73141a', p: 'spots', t: undefined, d: undefined, k: [0.84, 0.82] }, { lv: 6, needs: { bait: ['shrimp', 'cricket'] }, blurb: 'Red, with a scatter of tiny sapphires.' }),
  _gfF('spotted-gar-pup', 'Spotted gar pup', ['shallow'], 'rare', 6, 'dart', [25, 45], 47, { s: 'needle', c: '#baa36b', c2: '#dddcbe', c3: '#715d3e', p: 'spots', d: undefined, k: [0.91, 0.77] }, { seasons: ['summer'], lv: 10, blurb: 'All nose, and growing into it.' }),
  _gfF('blue-crayfish', 'Blue crayfish', ['shallow'], 'rare', 7, 'sinker', [8, 14], 45, { s: 'crayfish', c: '#1442b1', c2: '#adbae1', c3: '#05205f', p: 'none' }, { tod: ['night'], rain: 1, lv: 6, blurb: 'Bright blue and furious about it.' }),
  _gfF('fiddler-crab', 'Fiddler crab', ['shallow'], 'rare', 6, 'sinker', [4, 8], 53, { s: 'crab', c: '#f77354', c2: '#f6e1c7', c3: '#b4432b', p: 'none' }, { tod: ['day'], seasons: ['summer'], lv: 9, blurb: 'One big claw, waved at everyone.' }),
  _gfF('seahorse-of-the-reeds', 'Seahorse of the reeds', ['shallow'], 'rare', 7, 'undefined', [8, 15], 45, { s: 'seahorse', c: '#efde46', c2: '#f9fcb8', c3: '#c2b223', p: 'none' }, { lv: 12, needs: { spot: 'reed-bank', bait: ['shrimp'] }, blurb: 'It should not be here. Nobody has told it.' }),
  _gfF('glass-catfish', 'Glass catfish', ['shallow'], 'rare', 6, 'dart', [6, 12], 45, { s: 'slim', c: '#cae8e4', c2: '#f4f5f9', c3: '#8fc0c5', p: 'ghost', d: undefined, k: [0.9, 0.71] }, { tod: ['dusk'], lv: 5, blurb: 'You can see right through it. It has nothing to hide.' }),
  _gfF('silver-arowana-pup', 'Silver arowana pup', ['shallow'], 'rare', 6, 'dart', [25, 45], 52, { s: 'torpedo', c: '#94b3b5', c2: '#edece5', c3: '#5e6075', p: 'scales', t: 'lyre', d: 'low', k: [0.83, 0.69] }, { lv: 5, needs: { bait: ['cricket', 'moth-fly'] }, blurb: 'Looks up all day, waiting for a beetle to fall.' }),
  _gfF('mud-puppy', 'Mud puppy', ['shallow'], 'rare', 6, 'floater', [20, 35], 54, { s: 'newt', c: '#785e36', c2: '#c3a583', c3: '#38271c', p: 'spots' }, { tod: ['night'], lv: 11, needs: { rain: true }, blurb: 'Barks, they say. Nobody has heard it.' }),
  _gfF('frog-mouth', 'Frog-mouth', ['shallow'], 'rare', 7, 'floater', [12, 20], 50, { s: 'goby', c: '#334f22', c2: '#6e8145', c3: '#191600', p: 'dapple', d: 'spines', k: [0.98, 1.05] }, { lv: 6, needs: { bait: ['frog-lure'] }, blurb: 'Most of it is mouth. The rest is patience.' }),
  _gfF('reef-butterflyfish', 'Reef butterflyfish', ['shallow'], 'rare', 6, 'smooth', [10, 18], 40, { s: 'tall', c: '#eddc4f', c2: '#f7fbc1', c3: '#c0b117', p: 'eye', k: [0.96, 0.98] }, { tod: ['day'], seasons: ['summer'], lv: 8, blurb: 'Lost, cheerful and a long way from any reef.' }),
  _gfF('cold-spring-char', 'Cold spring char', ['shallow'], 'epic', 8, 'dart', [20, 40], 158, { s: 'torpedo', c: '#2d61bc', c2: '#bbccf4', c3: '#1f2f82', p: 'stars', d: undefined, k: [0.88, 0.67] }, { seasons: ['winter', 'spring'], lv: 14, needs: { spot: 'cold-spring' }, blurb: 'Only stays where the water comes up cold.' }),
  _gfF('pufferfish', 'Pufferfish', ['shallow'], 'epic', 8, 'undefined', [10, 25], 153, { s: 'puffer', c: '#f3d953', c2: '#fdf7c4', c3: '#b1ad1a', p: 'spots', d: undefined, k: [0.84, 0.85] }, { lv: 11, needs: { hook: 'hook-barbless' }, blurb: 'Do not startle it. It will only get rounder.' }),
  _gfF('lionfish', 'Lionfish', ['shallow'], 'epic', 8, 'undefined', [20, 35], 156, { s: 'chunky', c: '#f47657', c2: '#feddc1', c3: '#b1472e', p: 'zebra', d: 'spines', x: 'spikes', k: [0.9, 0.71] }, { tod: ['dusk'], lv: 13, needs: { hook: 'hook-small' }, blurb: 'A tiger in a feather boa.' }),
  _gfF('ghost-shrimp', 'Ghost shrimp', ['shallow'], 'epic', 9, 'dart', [4, 9], 121, { s: 'shrimp', c: '#bed5ec', c2: '#ebedf2', c3: '#9abac4', p: 'ghost' }, { tod: ['night'], lv: 12, needs: { moon: ['new'] }, blurb: 'You can see its breakfast.' }),
  _gfF('golden-crab', 'Golden crab', ['shallow'], 'epic', 8, 'sinker', [8, 14], 143, { s: 'crab', c: '#e3b633', c2: '#f9e6ad', c3: '#b9751e', p: 'none' }, { seasons: ['summer'], lv: 13, needs: { rain: false }, blurb: 'Walks sideways, and it glitters.' }),
  _gfF('silk-gourami', 'Silk gourami', ['shallow'], 'epic', 9, 'undefined', [12, 20], 126, { s: 'tall', c: '#d67ba1', c2: '#ffe3e7', c3: '#b13260', p: 'ombre', t: 'lyre', d: undefined, k: [0.87, 0.8] }, { lv: 15, needs: { line: 'line-silk' }, blurb: 'Moves like a scarf in a slow breeze.' }),
  _gfF('sprite-of-the-shallows', 'Sprite of the shallows', ['shallow'], 'legendary', 9, 'dart', [10, 16], 308, { s: 'seahorse', c: '#5dcb8f', c2: '#c8e5d3', c3: '#267f5d', p: 'glow' }, { tod: ['dawn'], seasons: ['spring'], lv: 14, needs: { moon: ['full'], spot: 'reed-bank', chance: 14 }, blurb: 'Everyone has seen it once. Nobody twice.' }),
  _gfF('little-tom-thumb', 'Little Tom Thumb', ['shallow'], 'legendary', 9, 'floater', [1, 2], 371, { s: 'goby', c: '#eaba2b', c2: '#ffe9ba', c3: '#ab7916', p: 'mirror', k: [0.93, 0.91] }, { lv: 17, needs: { hook: 'hook-small', line: 'line-silk', bait: ['maggot'], chance: 4 }, blurb: 'The smallest record in the book, and the hardest.' }),
  _gfF('asp', 'Asp', ['mid'], 'common', 2, 'dart', [30, 70], 10, { s: 'slim', c: '#717d8d', c2: '#d5ded8', c3: '#304a55', p: 'belly', k: [0.98, 0.89] }, { lv: 5, blurb: 'Hunts on the surface with a splash and no manners.' }),
  _gfF('silver-carp', 'Silver carp', ['mid'], 'common', 2, 'smooth', [40, 90], 12, { s: 'carp', c: '#8aa19e', c2: '#d9d2da', c3: '#3f4e5e', p: 'none', k: [1.05, 0.94] }, { lv: 3, blurb: 'Jumps at loud noises, and most other things.' }),
  _gfF('grass-carp', 'Grass carp', ['mid'], 'common', 3, 'dart', [40, 90], 11, { s: 'carp', c: '#60723c', c2: '#b2c48b', c3: '#2e3c18', p: 'scales', k: [1.02, 1] }, { lv: 4, blurb: 'A vegetarian with enormous muscles.' }),
  _gfF('nase', 'Nase', ['mid'], 'common', 2, 'dart', [25, 45], 11, { s: 'slim', c: '#938e84', c2: '#d5d9d7', c3: '#504957', p: 'none', t: 'lyre', d: undefined, k: [0.89, 0.7] }, { lv: 2, blurb: 'A flat nose, used for scraping and for looking down.' }),
  _gfF('vimba', 'Vimba', ['mid'], 'common', 2, 'dart', [25, 40], 10, { s: 'slim', c: '#367594', c2: '#cdeeea', c3: '#23526a', p: 'ombre', t: undefined, d: undefined, k: [0.82, 0.82] }, { lv: 4, blurb: 'Blue-backed and goes about in crowds.' }),
  _gfF('common-shad', 'Common shad', ['mid'], 'common', 2, 'dart', [25, 50], 11, { s: 'herring', c: '#9eb9b9', c2: '#edeae1', c3: '#53667a', p: 'spots', d: 'sail', k: [1.01, 0.93] }, { lv: 3, blurb: 'Comes in with the spring, full of bones and news.' }),
  _gfF('lake-herring', 'Lake herring', ['mid'], 'common', 3, 'dart', [20, 35], 8, { s: 'herring', c: '#668a92', c2: '#d4dee6', c3: '#3a4245', p: 'none', d: undefined, k: [0.9, 0.8] }, { lv: 4, blurb: 'A herring that took a wrong turn long ago.' }),
  _gfF('golden-shiner', 'Golden shiner', ['mid'], 'common', 2, 'dart', [10, 25], 7, { s: 'herring', c: '#bb8a33', c2: '#e0d8a0', c3: '#835a16', p: 'none', k: [0.98, 0.99] }, { lv: 2, blurb: 'Golden, gregarious and good with people.' }),
  _gfF('white-sucker', 'White sucker', ['mid'], 'common', 2, 'undefined', [25, 50], 12, { s: 'carp', c: '#787775', c2: '#cfc3c7', c3: '#354832', p: 'none', m: 'tube', t: undefined, d: undefined, k: [0.9, 0.67] }, { lv: 2, blurb: 'Its lips do all the work.' }),
  _gfF('redhorse', 'Redhorse', ['mid'], 'common', 3, 'floater', [30, 60], 11, { s: 'carp', c: '#9a5c1e', c2: '#e6ae8e', c3: '#6a2209', p: 'ombre', k: [1.03, 1] }, { lv: 3, blurb: 'A red tail, and a very good nose.' }),
  _gfF('roach-bream', 'Roach-bream', ['mid'], 'common', 3, 'smooth', [20, 40], 11, { s: 'flat', c: '#ad8a54', c2: '#f4d19a', c3: '#654a27', p: 'belly', d: 'sail', k: [0.97, 0.89] }, { lv: 4, blurb: 'Could not decide. Its parents could.' }),
  _gfF('blue-bream', 'Blue bream', ['mid'], 'common', 2, 'undefined', [20, 35], 9, { s: 'flat', c: '#60a6cc', c2: '#cbeae0', c3: '#2c70b1', p: 'none', d: undefined, k: [0.85, 0.69] }, { lv: 3, blurb: 'Thin as a plate, and just as blue.' }),
  _gfF('crucian-giant', 'Crucian giant', ['mid'], 'common', 3, 'smooth', [30, 55], 10, { s: 'hump', c: '#ae8b4c', c2: '#e0d2a6', c3: '#655b30', p: 'none', t: 'whip', d: 'low', k: [1.02, 0.9] }, { lv: 2, blurb: 'A crucian that never stopped eating.' }),
  _gfF('wide-mouth', 'Wide-mouth', ['mid'], 'common', 3, 'undefined', [25, 50], 12, { s: 'chunky', c: '#7b8e4c', c2: '#e2d5a6', c3: '#3c4920', p: 'none', d: 'low', k: [0.89, 0.7] }, { lv: 2, blurb: 'Comes with its own bucket.' }),
  _gfF('largemouth-bass', 'Largemouth bass', ['mid'], 'uncommon', 5, 'undefined', [30, 70], 22, { s: 'chunky', c: '#315143', c2: '#96be8e', c3: '#0e2f1a', p: 'stripe', t: undefined, d: undefined, k: [0.9, 0.71] }, { lv: 6, needs: { bait: ['frog-lure', 'spinner', 'worm'] }, blurb: 'Everything is lunch until proven otherwise.' }),
  _gfF('smallmouth-bass', 'Smallmouth bass', ['mid'], 'uncommon', 5, 'mixed', [25, 55], 21, { s: 'chunky', c: '#9e8147', c2: '#f0d698', c3: '#6a522c', p: 'bars', d: 'low', k: [0.94, 0.98] }, { lv: 6, blurb: 'Fights three times its size, every time.' }),
  _gfF('walleye', 'Walleye', ['mid'], 'uncommon', 4, 'smooth', [35, 75], 25, { s: 'pike', c: '#ae8447', c2: '#e0e1a1', c3: '#66592f', p: 'saddle', t: 'whip', k: [1, 1.12] }, { tod: ['dusk', 'night'], lv: 7, blurb: 'Eyes like cat’s eyes on a dark road.' }),
  _gfF('burbot', 'Burbot', ['mid'], 'uncommon', 4, 'sinker', [30, 70], 23, { s: 'cat', c: '#90694f', c2: '#d1bc92', c3: '#504620', p: 'dapple', k: [1.04, 0.9] }, { tod: ['night'], seasons: ['winter'], lv: 4, blurb: 'A freshwater cod, and it likes the winter best.' }),
  _gfF('vendace', 'Vendace', ['mid'], 'uncommon', 4, 'dart', [15, 30], 19, { s: 'herring', c: '#daedee', c2: '#f1f5f7', c3: '#adb2df', p: 'belly', t: 'fork', k: [1.02, 1.13] }, { seasons: ['autumn', 'winter'], lv: 4, blurb: 'A rare little lake fish from the last ice age.' }),
  _gfF('whitefish', 'Whitefish', ['mid'], 'uncommon', 4, 'dart', [30, 55], 20, { s: 'slim', c: '#dbdbec', c2: '#fcffff', c3: '#b0b3ba', p: 'none', t: 'lyre', d: 'low', k: [0.82, 0.88] }, { lv: 5, needs: { bait: ['maggot'] }, blurb: 'Pale, tidy and very particular.' }),
  _gfF('sea-trout', 'Sea trout', ['mid'], 'uncommon', 5, 'dart', [40, 80], 27, { s: 'torpedo', c: '#5a747a', c2: '#bed4c6', c3: '#2e2c42', p: 'spots', d: undefined, k: [0.92, 0.81] }, { tod: ['night'], rain: 1, lv: 6, blurb: 'A brown trout that has seen the world.' }),
  _gfF('atlantic-salmon', 'Atlantic salmon', ['mid'], 'uncommon', 4, 'dart', [50, 110], 30, { s: 'torpedo', c: '#a3b8ba', c2: '#e7f1ea', c3: '#596a7e', p: 'spots', k: [0.98, 1.08] }, { seasons: ['autumn'], rain: 1, lv: 5, blurb: 'Came a long way. Would like a word.' }),
  _gfF('sockeye', 'Sockeye', ['mid'], 'uncommon', 4, 'dart', [40, 75], 25, { s: 'torpedo', c: '#ad0a22', c2: '#dea19d', c3: '#6a0013', p: 'tip', d: undefined, k: [0.88, 0.77] }, { seasons: ['autumn'], lv: 7, blurb: 'Goes bright red when it means business.' }),
  _gfF('brook-char', 'Brook char', ['mid'], 'uncommon', 5, 'dart', [25, 50], 20, { s: 'slim', c: '#124121', c2: '#8cae6c', c3: '#052411', p: 'stars', d: undefined, k: [0.92, 0.74] }, { lv: 6, needs: { spot: 'cold-spring' }, blurb: 'Green, dotted with tiny stars.' }),
  _gfF('goldeye', 'Goldeye', ['mid'], 'uncommon', 4, 'dart', [25, 40], 19, { s: 'herring', c: '#cdcedc', c2: '#eedfed', c3: '#8ba8cd', p: 'none', k: [1.02, 0.96] }, { tod: ['dusk'], lv: 5, blurb: 'Big gold eyes, made for dusk.' }),
  _gfF('golden-perch', 'Golden perch', ['mid'], 'uncommon', 5, 'undefined', [30, 55], 22, { s: 'chunky', c: '#cba815', c2: '#e1d8a4', c3: '#a16800', p: 'none', t: 'lyre', d: undefined, k: [0.92, 0.68] }, { seasons: ['summer'], lv: 6, blurb: 'Shines like a brass door knob.' }),
  _gfF('peacock-bass', 'Peacock bass', ['mid'], 'uncommon', 4, 'mixed', [30, 65], 22, { s: 'chunky', c: '#f3de53', c2: '#fdfcc4', c3: '#b19e1a', p: 'eye', k: [1.03, 1.03] }, { seasons: ['summer'], lv: 4, needs: { bait: ['spinner', 'frog-lure'] }, blurb: 'Wears an eye on its tail in case you are behind it.' }),
  _gfF('pacu', 'Pacu', ['mid'], 'uncommon', 4, 'undefined', [30, 60], 19, { s: 'disc', c: '#2a2727', c2: '#8f8185', c3: '#020115', p: 'none', d: undefined, k: [0.9, 0.87] }, { lv: 5, needs: { bait: ['berry', 'dough'] }, blurb: 'Has teeth like a person, and uses them on nuts.' }),
  _gfF('red-bellied-piranha', 'Red-bellied piranha', ['mid'], 'uncommon', 5, 'smooth', [15, 30], 20, { s: 'disc', c: '#798694', c2: '#d2dae8', c3: '#383e47', p: 'belly', m: 'teeth', d: 'low', k: [0.99, 0.96] }, { lv: 3, needs: { bait: ['maggot', 'shrimp'] }, blurb: 'Far more nervous than the films say.' }),
  _gfF('snakehead', 'Snakehead', ['mid'], 'uncommon', 4, 'mixed', [40, 90], 24, { s: 'eel', c: '#4e5134', c2: '#899758', c3: '#1f2d10', p: 'saddle' }, { tod: ['dusk'], rain: 1, lv: 8, blurb: 'Can walk a short way on land. Please do not ask it to.' }),
  _gfF('lake-lamprey', 'Lake lamprey', ['mid'], 'uncommon', 4, 'mixed', [25, 50], 23, { s: 'eel', c: '#666d73', c2: '#cbd6c7', c3: '#2d4348', p: 'none', m: 'tube' }, { tod: ['night'], lv: 8, blurb: 'No jaws, plenty of ideas.' }),
  _gfF('bonytail', 'Bonytail', ['mid'], 'uncommon', 5, 'dart', [30, 60], 21, { s: 'needle', c: '#7c5a38', c2: '#bdad7c', c3: '#3b331b', p: 'none', t: 'lyre', d: 'low', k: [0.87, 0.63] }, { lv: 6, blurb: 'Thin at both ends and nervous in the middle.' }),
  _gfF('weed-bed-pike', 'Weed-bed pike', ['mid'], 'uncommon', 4, 'mixed', [40, 80], 24, { s: 'pike', c: '#229e4d', c2: '#a3dca2', c3: '#00581e', p: 'dapple', t: 'lyre', d: 'spines', k: [0.99, 1.09] }, { lv: 5, needs: { spot: 'weed-bed' }, blurb: 'Hangs in the weed like a green plank.' }),
  _gfF('log-perch', 'Log perch', ['mid'], 'uncommon', 4, 'smooth', [15, 30], 17, { s: 'round', c: '#916a4d', c2: '#c7c699', c3: '#504330', p: 'saddle', d: 'low', k: [0.9, 0.8] }, { lv: 5, needs: { spot: 'sunken-log' }, blurb: 'Turns over stones. Lives near old logs.' }),
  _gfF('storm-trout', 'Storm trout', ['mid'], 'uncommon', 4, 'dart', [30, 65], 22, { s: 'slim', c: '#2d3e4c', c2: '#9da2b7', c3: '#e1d465', p: 'stars', d: 'twin', k: [0.96, 1.08] }, { lv: 4, needs: { rain: true }, blurb: 'Only rises when the sky goes dark.' }),
  _gfF('rainy-day-chub', 'Rainy day chub', ['mid'], 'uncommon', 5, 'floater', [25, 50], 21, { s: 'hump', c: '#246f83', c2: '#bbd3d9', c3: '#103256', p: 'none', k: [0.97, 1.11] }, { lv: 3, needs: { rain: true }, blurb: 'Fat, wet and thoroughly happy.' }),
  _gfF('sunny-bream', 'Sunny bream', ['mid'], 'uncommon', 5, 'undefined', [20, 40], 20, { s: 'flat', c: '#e38c0e', c2: '#f3c562', c3: '#cc4207', p: 'rings', d: 'low', k: [0.83, 0.69] }, { tod: ['day'], lv: 3, needs: { rain: false }, blurb: 'Only comes up when it is bright and dry.' }),
  _gfF('fog-eye', 'Fog-eye', ['mid'], 'uncommon', 5, 'dart', [25, 50], 22, { s: 'slim', c: '#c7dbe5', c2: '#eafff7', c3: '#a4afc0', p: 'ghost', d: 'low', k: [0.87, 0.83] }, { lv: 6, needs: { event: 'fog' }, blurb: 'Nobody sees it clearly, including itself.' }),
  _gfF('harvest-carp', 'Harvest carp', ['mid'], 'uncommon', 4, 'undefined', [40, 80], 22, { s: 'carp', c: '#9e510e', c2: '#d5a254', c3: '#5f1200', p: 'scales', d: undefined, k: [0.89, 0.87] }, { seasons: ['autumn'], lv: 4, blurb: 'Fattens on whatever falls in, in autumn.' }),
  _gfF('primrose-rudd', 'Primrose rudd', ['mid'], 'uncommon', 5, 'smooth', [20, 35], 17, { s: 'round', c: '#70b53d', c2: '#dfdb97', c3: '#d06f86', p: 'ombre', d: 'low', k: [0.96, 1.08] }, { seasons: ['spring'], lv: 3, blurb: 'Comes up with the first warm week.' }),
  _gfF('tigerfish', 'Tigerfish', ['mid'], 'rare', 7, 'dart', [40, 80], 54, { s: 'torpedo', c: '#8aa39e', c2: '#e3dcce', c3: '#405562', p: 'stripe', m: 'teeth', k: [0.95, 0.88] }, { lv: 7, needs: { line: 'line-wire', bait: ['spinner', 'spoon'] }, blurb: 'Teeth on the outside. Terrible at hiding it.' }),
  _gfF('striped-bass', 'Striped bass', ['mid'], 'rare', 6, 'dart', [50, 100], 56, { s: 'torpedo', c: '#6b7b93', c2: '#d9e4e8', c3: '#3e4343', p: 'stripe', d: undefined, k: [0.91, 0.77] }, { lv: 5, needs: { rod: 2 }, blurb: 'Stripes as straight as a ruled page.' }),
  _gfF('muskellunge', 'Muskellunge', ['mid'], 'rare', 7, 'undefined', [70, 130], 64, { s: 'pike', c: '#79804b', c2: '#d6d49d', c3: '#505523', p: 'bars', t: undefined, d: 'low', k: [0.91, 0.71] }, { lv: 8, needs: { line: 'line-wire', bait: ['spinner', 'spoon'] }, blurb: 'The fish of ten thousand casts. Bring a sandwich.' }),
  _gfF('golden-dorado', 'Golden dorado', ['mid'], 'rare', 6, 'dart', [50, 100], 64, { s: 'torpedo', c: '#e3ae2a', c2: '#fffaac', c3: '#ba8718', p: 'scales', k: [0.97, 1.02] }, { tod: ['day'], seasons: ['summer'], lv: 7, needs: { bait: ['spinner'] }, blurb: 'A gold bar with a temper.' }),
  _gfF('kokanee', 'Kokanee', ['mid'], 'rare', 6, 'dart', [25, 50], 59, { s: 'torpedo', c: '#de5a4b', c2: '#e8c1b5', c3: '#9b2a0d', p: 'none', d: 'low', k: [0.86, 0.76] }, { seasons: ['autumn'], lv: 10, blurb: 'A salmon that never saw the sea and does not mind.' }),
  _gfF('steelhead', 'Steelhead', ['mid'], 'rare', 6, 'dart', [50, 100], 62, { s: 'torpedo', c: '#8bb1e4', c2: '#ffd7b1', c3: '#d75a75', p: 'stripe', t: 'fan', k: [1.01, 0.96] }, { rain: 1, lv: 11, needs: { reel: 'reel-spin' }, blurb: 'A rainbow trout that went to sea and came back hard.' }),
  _gfF('arctic-char', 'Arctic char', ['mid'], 'rare', 6, 'dart', [40, 75], 47, { s: 'torpedo', c: '#e87f63', c2: '#fcd8c0', c3: '#ba3a25', p: 'spots', d: undefined, k: [0.92, 0.87] }, { seasons: ['winter'], lv: 9, blurb: 'Red belly, cold heart.' }),
  _gfF('golden-trout', 'Golden trout', ['mid'], 'rare', 7, 'dart', [25, 50], 60, { s: 'slim', c: '#da8d19', c2: '#f5d365', c3: '#d93300', p: 'spots', k: [0.97, 0.92] }, { lv: 12, needs: { spot: 'cold-spring', rod: 2 }, blurb: 'Lives high up, and only for the view.' }),
  _gfF('paddlefish-pup', 'Paddlefish pup', ['mid'], 'rare', 7, 'undefined', [40, 90], 63, { s: 'paddle', c: '#686d7e', c2: '#cdd6d2', c3: '#303341', p: 'none', t: 'lyre', d: 'low', k: [0.85, 0.86] }, { seasons: ['spring'], lv: 8, blurb: 'A very long nose for a very small brain.' }),
  _gfF('clown-loach', 'Clown loach', ['mid'], 'rare', 6, 'sinker', [12, 30], 42, { s: 'loach', c: '#d8860d', c2: '#e7c687', c3: '#c55506', p: 'bands', t: 'lyre', d: 'spines', k: [0.96, 0.92] }, { lv: 9, needs: { bait: ['maggot'] }, blurb: 'Plays dead for fun. Please check twice.' }),
  _gfF('electric-catfish', 'Electric catfish', ['mid'], 'rare', 6, 'sinker', [30, 70], 52, { s: 'cat', c: '#cbb88e', c2: '#eedccc', c3: '#82724c', p: 'dapple', d: 'sail', k: [0.93, 1.1] }, { tod: ['night'], lv: 6, needs: { hook: 'hook-barbless' }, blurb: 'Mild shock. Mostly to your dignity.' }),
  _gfF('moon-gazer', 'Moon-gazer', ['mid'], 'rare', 6, 'smooth', [25, 45], 56, { s: 'round', c: '#d6edf6', c2: '#f7feff', c3: '#a9b2d2', p: 'stars', d: undefined, k: [0.9, 0.67] }, { tod: ['night'], lv: 5, needs: { moon: ['waxing', 'full'] }, blurb: 'Faces up all night, on nights with a moon.' }),
  _gfF('new-moon-bream', 'New moon bream', ['mid'], 'rare', 6, 'dart', [25, 45], 46, { s: 'flat', c: '#061128', c2: '#5e6272', c3: '#000302', p: 'none', k: [0.97, 0.95] }, { tod: ['night'], lv: 6, needs: { moon: ['new'] }, blurb: 'Only about when there is no moon to see it by.' }),
  _gfF('old-log-barbel', 'Old-log barbel', ['mid'], 'rare', 6, 'dart', [50, 90], 63, { s: 'slim', c: '#8b763d', c2: '#d2be83', c3: '#57470d', p: 'saddle', d: undefined, k: [0.85, 0.86] }, { lv: 9, needs: { spot: 'sunken-log', bait: ['maggot', 'worm'] }, blurb: 'Has lived under the same log since before you.' }),
  _gfF('comet-trout', 'Comet trout', ['mid'], 'rare', 6, 'dart', [30, 55], 46, { s: 'slim', c: '#0f2448', c2: '#7fd3da', c3: '#e43c6c', p: 'neon', d: undefined, k: [0.84, 0.79] }, { tod: ['night'], lv: 5, needs: { event: 'meteor' }, blurb: 'A bright line through dark water, then nothing.' }),
  _gfF('cricket-chaser', 'Cricket-chaser', ['mid'], 'rare', 6, 'smooth', [20, 40], 42, { s: 'round', c: '#b55f2c', c2: '#ecc55d', c3: '#612109', p: 'spots', d: undefined, k: [0.82, 0.78] }, { seasons: ['summer', 'autumn'], lv: 8, needs: { bait: ['cricket'] }, blurb: 'Jumps for anything that chirps.' }),
  _gfF('spoon-nosed-sucker', 'Spoon-nosed sucker', ['mid'], 'rare', 6, 'smooth', [35, 60], 60, { s: 'paddle', c: '#9d8032', c2: '#cfc88c', c3: '#543b17', p: 'speckle', t: 'whip', k: [1.02, 1] }, { lv: 9, needs: { bait: ['spoon'] }, blurb: 'Its nose is the same shape as the lure it loves.' }),
  _gfF('berry-roach', 'Berry roach', ['mid'], 'rare', 6, 'smooth', [15, 30], 48, { s: 'round', c: '#a22668', c2: '#faaac1', c3: '#631644', p: 'rings', d: 'spines', k: [0.96, 0.92] }, { seasons: ['autumn'], lv: 8, needs: { bait: ['berry'] }, blurb: 'Tastes of hedgerows, they say. Please do not check.' }),
  _gfF('garfish', 'Garfish', ['mid'], 'rare', 6, 'dart', [40, 90], 49, { s: 'needle', c: '#32b052', c2: '#bee6c9', c3: '#0d6a38', p: 'stripe', m: 'teeth', d: 'low', k: [0.94, 0.94] }, { tod: ['day'], lv: 8, blurb: 'Green bones and a beak full of pins.' }),
  _gfF('sturgeon-pup', 'Sturgeon pup', ['mid'], 'rare', 6, 'sinker', [40, 80], 51, { s: 'sturgeon', c: '#45605b', c2: '#b4bcb7', c3: '#212230', p: 'scutes', k: [0.94, 0.88] }, { seasons: ['spring', 'autumn'], lv: 9, blurb: 'A small fossil, already serious.' }),
  _gfF('blood-red-rudd', 'Blood-red rudd', ['mid'], 'epic', 8, 'smooth', [25, 45], 142, { s: 'round', c: '#d12944', c2: '#f8b7b6', c3: '#78191c', p: 'ombre', k: [1.02, 1.06] }, { lv: 9, needs: { event: 'blood-moon' }, blurb: 'Comes up when the moon goes the wrong colour.' }),
  _gfF('tiger-trout', 'Tiger trout', ['mid'], 'epic', 9, 'dart', [30, 70], 117, { s: 'slim', c: '#d98f13', c2: '#e7dd9d', c3: '#110306', p: 'tiger', t: 'lyre', k: [1.04, 1] }, { lv: 11, needs: { rod: 3, bait: ['spinner', 'moth-fly'] }, blurb: 'Part brown trout, part brook, entirely bad-tempered.' }),
  _gfF('dragon-carp', 'Dragon carp', ['mid'], 'epic', 8, 'smooth', [60, 110], 168, { s: 'carp', c: '#1c8c3e', c2: '#a8d7b5', c3: '#005b24', p: 'mirror', k: [0.93, 0.94] }, { seasons: ['summer'], lv: 15, needs: { reel: 'reel-bait' }, blurb: 'Its scales look like old armour, because they are.' }),
  _gfF('crown-bass', 'Crown bass', ['mid'], 'epic', 9, 'undefined', [50, 90], 115, { s: 'chunky', c: '#18213b', c2: '#65798e', c3: '#0e132a', p: 'stars', x: 'crown', d: 'spines', t: undefined, k: [0.9, 0.77] }, { lv: 8, needs: { hook: 'hook-large' }, blurb: 'A jewelled crown of spines. Nobody crowned it.' }),
  _gfF('paper-fish', 'Paper fish', ['mid'], 'epic', 8, 'smooth', [20, 40], 158, { s: 'flat', c: '#eeefcd', c2: '#fffbeb', c3: '#c9ad91', p: 'lace', t: 'fan', k: [1.03, 1.03] }, { lv: 14, needs: { line: 'line-silk', rain: false }, blurb: 'So thin you could post it.' }),
  _gfF('festival-fish', 'Festival fish', ['mid'], 'epic', 8, 'smooth', [25, 45], 133, { s: 'fancy', c: '#90b3e9', c2: '#f3d9a0', c3: '#dc477a', p: 'bands', t: 'veil', d: undefined, k: [0.85, 0.63] }, { lv: 10, needs: { event: 'festival' }, blurb: 'Turns up in its best, whenever there is a party.' }),
  _gfF('spawning-silverside', 'Spawning silverside', ['mid'], 'epic', 8, 'dart', [20, 35], 115, { s: 'herring', c: '#c2dcdc', c2: '#eee5e5', c3: '#95a1cd', p: 'mirror', d: 'low', k: [0.84, 0.66] }, { lv: 13, needs: { event: 'spawning' }, blurb: 'You only ever see it when they all come at once.' }),
  _gfF('iron-bream', 'Iron bream', ['mid'], 'epic', 9, 'undefined', [40, 70], 153, { s: 'flat', c: '#8c9386', c2: '#d9d6d0', c3: '#4a5347', p: 'scales', d: undefined, k: [0.91, 0.87] }, { lv: 15, needs: { hook: 'hook-large', line: 'line-braid' }, blurb: 'Rings when it hits the net.' }),
  _gfF('sunset-salmon', 'Sunset salmon', ['mid'], 'epic', 8, 'dart', [60, 110], 139, { s: 'torpedo', c: '#ec5d32', c2: '#ffc667', c3: '#832f6b', p: 'ombre', k: [1.03, 0.97] }, { tod: ['dusk'], seasons: ['autumn'], lv: 8, needs: { reel: 'reel-spin' }, blurb: 'The colour of the last ten minutes of the day.' }),
  _gfF('wanderer', 'Wanderer', ['mid'], 'legendary', 9, 'dart', [80, 140], 300, { s: 'torpedo', c: '#000621', c2: '#2f365a', c3: '#e4cc93', p: 'stars', k: [1.03, 0.97] }, { tod: ['night'], lv: 15, needs: { event: 'meteor', reel: 'reel-gold', chance: 10 }, blurb: 'Has swum every river. Stops here only for a meteor.' }),
  _gfF('the-duchess', 'The Duchess', ['mid'], 'legendary', 9, 'smooth', [70, 110], 286, { s: 'koi', c: '#c1a1ea', c2: '#e9e8f5', c3: '#7854b6', p: 'lace', d: 'spines', k: [1.05, 1.13] }, { tod: ['dusk'], seasons: ['spring'], lv: 12, needs: { line: 'line-silk', hook: 'hook-gold', chance: 10 }, blurb: 'Accepts only silk line and a gold hook. Naturally.' }),
  _gfF('king-of-the-weed', 'King of the Weed', ['mid'], 'legendary', 9, 'smooth', [120, 190], 309, { s: 'pike', c: '#2aaf5e', c2: '#c0edc9', c3: '#19652c', p: 'tiger', x: 'crown', d: 'low', k: [1.01, 0.93] }, { lv: 16, needs: { spot: 'weed-bed', line: 'line-wire', reel: 'reel-bait', chance: 10 }, blurb: 'Wears a crown of pondweed and an expression.' }),
  _gfF('lake-whitefish', 'Lake whitefish', ['deep'], 'common', 3, 'dart', [40, 75], 11, { s: 'slim', c: '#e1ecf1', c2: '#fffcff', c3: '#9fb1e1', p: 'none', t: undefined, d: 'low', k: [0.86, 0.7] }, { lv: 3, blurb: 'A big pale fish who keeps to itself.' }),
  _gfF('deepwater-sculpin', 'Deepwater sculpin', ['deep'], 'common', 4, 'smooth', [15, 30], 8, { s: 'goby', c: '#4b5164', c2: '#b0bab8', c3: '#122839', p: 'speckle', d: 'spines', t: 'whip', k: [0.95, 0.98] }, { lv: 4, blurb: 'Ugly in a way you come to love.' }),
  _gfF('blue-catfish', 'Blue catfish', ['deep'], 'common', 4, 'sinker', [50, 120], 11, { s: 'cat', c: '#2d708a', c2: '#afd4e1', c3: '#05384b', p: 'none', d: undefined, k: [0.89, 0.83] }, { lv: 5, blurb: 'Slate blue and enormous, with a calm manner.' }),
  _gfF('black-bream', 'Black bream', ['deep'], 'common', 3, 'mixed', [30, 60], 11, { s: 'flat', c: '#433336', c2: '#93a295', c3: '#1a1e21', p: 'none', d: 'spines', k: [0.96, 1.11] }, { lv: 3, blurb: 'Dark as a coal-hole, and about as chatty.' }),
  _gfF('lake-chub', 'Lake chub', ['deep'], 'common', 3, 'floater', [30, 55], 11, { s: 'hump', c: '#6d7076', c2: '#cfc9bf', c3: '#3f4134', p: 'none', k: [0.97, 1.05] }, { lv: 4, blurb: 'Bigger than a chub has any right to be.' }),
  _gfF('bigmouth-buffalo', 'Bigmouth buffalo', ['deep'], 'common', 3, 'dart', [50, 100], 10, { s: 'hump', c: '#ab8540', c2: '#f2e19b', c3: '#625525', p: 'scales', d: 'spines', k: [1.04, 0.94] }, { lv: 3, blurb: 'Big, slow and always grazing.' }),
  _gfF('freshwater-drum', 'Freshwater drum', ['deep'], 'common', 3, 'undefined', [40, 85], 11, { s: 'hump', c: '#9eb6ba', c2: '#ede8e2', c3: '#53647b', p: 'none', d: undefined, k: [0.86, 0.83] }, { lv: 4, blurb: 'Grunts. Yes, out loud.' }),
  _gfF('deep-roach', 'Deep roach', ['deep'], 'common', 3, 'smooth', [25, 45], 10, { s: 'round', c: '#b5baca', c2: '#d8dedc', c3: '#7da2bb', p: 'none', d: 'sail', k: [1.05, 0.91] }, { lv: 6, blurb: 'A roach that has never seen the sun.' }),
  _gfF('cisco', 'Cisco', ['deep'], 'common', 3, 'dart', [25, 45], 11, { s: 'herring', c: '#74afeb', c2: '#e9fcf3', c3: '#4079bb', p: 'none', d: undefined, k: [0.92, 0.81] }, { lv: 3, blurb: 'Silver, sociable and always on the move.' }),
  _gfF('giant-bream', 'Giant bream', ['deep'], 'common', 3, 'undefined', [50, 85], 12, { s: 'flat', c: '#a39045', c2: '#ead89f', c3: '#70502d', p: 'scales', d: undefined, k: [0.93, 0.88] }, { lv: 5, blurb: 'A bream the size of a tea tray.' }),
  _gfF('lake-sturgeon-pup', 'Lake sturgeon pup', ['deep'], 'common', 4, 'sinker', [50, 90], 11, { s: 'sturgeon', c: '#8b907e', c2: '#e2dcd0', c3: '#484b51', p: 'none', d: 'low', k: [0.87, 0.83] }, { lv: 3, blurb: 'Looks old on the day it hatches.' }),
  _gfF('mekong-carp', 'Mekong carp', ['deep'], 'uncommon', 5, 'smooth', [80, 180], 39, { s: 'carp', c: '#a1b3b2', c2: '#f0faef', c3: '#576576', p: 'scales', t: 'round', k: [0.99, 0.92] }, { lv: 9, needs: { rod: 2 }, blurb: 'Could carry you, if it wanted. It does not.' }),
  _gfF('goonch', 'Goonch', ['deep'], 'uncommon', 6, 'sinker', [80, 170], 35, { s: 'cat', c: '#816b4f', c2: '#d7bf92', c3: '#554532', p: 'dapple', d: undefined, k: [0.81, 0.88] }, { tod: ['dusk', 'night'], lv: 7, blurb: 'A river-monster face and a shy disposition.' }),
  _gfF('giant-snakehead', 'Giant snakehead', ['deep'], 'uncommon', 5, 'mixed', [80, 130], 28, { s: 'eel', c: '#1f4227', c2: '#84af72', c3: '#002013', p: 'saddle' }, { lv: 5, blurb: 'Guards its young and your bait.' }),
  _gfF('sea-lamprey', 'Sea lamprey', ['deep'], 'uncommon', 6, 'mixed', [50, 90], 28, { s: 'eel', c: '#4b5063', c2: '#b0b9b7', c3: '#132b26', p: 'rings', m: 'tube' }, { tod: ['night'], lv: 7, blurb: 'Smiles with its whole face. Do not smile back.' }),
  _gfF('burbot-king', 'Burbot king', ['deep'], 'uncommon', 6, 'sinker', [60, 110], 27, { s: 'cat', c: '#324821', c2: '#6d8e44', c3: '#182400', p: 'lace', t: undefined, d: undefined, k: [0.83, 0.75] }, { tod: ['night'], seasons: ['winter'], lv: 7, blurb: 'Lays its eggs under ice, in the dark, on purpose.' }),
  _gfF('siamese-carp', 'Siamese carp', ['deep'], 'uncommon', 6, 'smooth', [70, 150], 33, { s: 'carp', c: '#1794ab', c2: '#b0f1df', c3: '#116181', p: 'mirror', d: undefined, k: [0.92, 0.65] }, { lv: 7, blurb: 'Ate the whole aquarium and moved here.' }),
  _gfF('freshwater-stingray', 'Freshwater stingray', ['deep'], 'uncommon', 6, 'floater', [40, 90], 24, { s: 'ray', c: '#ada86b', c2: '#dad4b1', c3: '#938351', p: 'spots' }, { lv: 4, needs: { hook: 'hook-barbless' }, blurb: 'Flat as a doormat, with one thing to say.' }),
  _gfF('deep-lake-trout', 'Deep lake trout', ['deep'], 'uncommon', 6, 'dart', [60, 110], 26, { s: 'torpedo', c: '#24697e', c2: '#bbccd5', c3: '#113054', p: 'spots', k: [0.93, 0.97] }, { lv: 4, needs: { rod: 2 }, blurb: 'Cold-water silver, in no hurry at all.' }),
  _gfF('kaluga-pup', 'Kaluga pup', ['deep'], 'uncommon', 5, 'sinker', [80, 150], 35, { s: 'sturgeon', c: '#3c4452', c2: '#8c9bb0', c3: '#dcde6e', p: 'none', d: undefined, k: [0.86, 0.7] }, { lv: 6, blurb: 'It has a lot of growing to do.' }),
  _gfF('giant-barb', 'Giant barb', ['deep'], 'uncommon', 5, 'mixed', [70, 150], 33, { s: 'carp', c: '#d3a055', c2: '#f8eec1', c3: '#9b7022', p: 'scales', t: 'round', k: [1, 0.93] }, { lv: 6, blurb: 'Scales the size of your palm.' }),
  _gfF('drop-off-bass', 'Drop-off bass', ['deep'], 'uncommon', 5, 'smooth', [50, 90], 22, { s: 'chunky', c: '#1b2743', c2: '#686a80', c3: '#11191d', p: 'saddle', d: 'low', k: [1, 0.96] }, { lv: 6, needs: { spot: 'drop-off' }, blurb: 'Waits on the very edge of the deep for dinner.' }),
  _gfF('wreck-perch', 'Wreck perch', ['deep'], 'uncommon', 6, 'dart', [40, 80], 22, { s: 'chunky', c: '#7c3c17', c2: '#c3945a', c3: '#4a0d00', p: 'bands', t: 'whip', k: [0.93, 0.88] }, { lv: 4, needs: { spot: 'old-wreck' }, blurb: 'Lives in the old wreck and thinks of it as home.' }),
  _gfF('anchor-crab', 'Anchor crab', ['deep'], 'uncommon', 5, 'sinker', [15, 30], 18, { s: 'crab', c: '#50616c', c2: '#b5b4c0', c3: '#2c3741', p: 'none' }, { tod: ['night'], lv: 5, blurb: 'Holds on to anything. Has held on to worse.' }),
  _gfF('giant-crayfish', 'Giant crayfish', ['deep'], 'uncommon', 5, 'sinker', [25, 50], 22, { s: 'crayfish', c: '#63222d', c2: '#c67d8e', c3: '#3d031c', p: 'none' }, { tod: ['night'], lv: 8, blurb: 'Tasmania’s finest, unexpectedly here.' }),
  _gfF('arapaima', 'Arapaima', ['deep'], 'rare', 7, 'dart', [120, 280], 67, { s: 'torpedo', c: '#e95a36', c2: '#fbd061', c3: '#813172', p: 'ombre', t: 'lyre', d: 'sail', k: [0.95, 1.04] }, { lv: 8, needs: { rod: 3, line: 'line-braid' }, blurb: 'Gulps air and scares grown adults.' }),
  _gfF('alligator-gar', 'Alligator gar', ['deep'], 'rare', 7, 'dart', [120, 260], 84, { s: 'needle', c: '#6b7633', c2: '#c8cb84', c3: '#2d361f', p: 'spots', m: 'teeth', k: [0.96, 0.95] }, { lv: 12, needs: { line: 'line-wire' }, blurb: 'A log with a great many teeth.' }),
  _gfF('giant-gourami', 'Giant gourami', ['deep'], 'rare', 7, 'undefined', [60, 110], 66, { s: 'hump', c: '#8d6f35', c2: '#dfc487', c3: '#593f1a', p: 'bars', d: undefined, k: [0.92, 0.71] }, { lv: 10, needs: { bait: ['berry', 'dough'] }, blurb: 'A big soft face. A big soft fish.' }),
  _gfF('paddlefish', 'Paddlefish', ['deep'], 'rare', 7, 'smooth', [100, 220], 65, { s: 'paddle', c: '#59647d', c2: '#becdd1', c3: '#363f41', p: 'none', k: [0.97, 0.92] }, { seasons: ['spring'], lv: 8, needs: { rod: 3 }, blurb: 'A nose like a canoe paddle and no idea why.' }),
  _gfF('electric-eel', 'Electric eel', ['deep'], 'rare', 7, 'mixed', [100, 200], 74, { s: 'eel', c: '#1c2428', c2: '#8c8a7e', c3: '#080e13', p: 'stars' }, { tod: ['night'], lv: 10, needs: { hook: 'hook-barbless' }, blurb: 'Please do not lick the line.' }),
  _gfF('lungfish', 'Lungfish', ['deep'], 'rare', 8, 'mixed', [70, 140], 64, { s: 'eel', c: '#887849', c2: '#c9b7a1', c3: '#5d412f', p: 'dapple' }, { lv: 12, needs: { rain: false, reel: 'reel-bait' }, blurb: 'Can sit out a drought in a mud cocoon.' }),
  _gfF('bull-shark', 'Bull shark', ['deep'], 'rare', 8, 'mixed', [120, 220], 76, { s: 'shark', c: '#425063', c2: '#b1c0bf', c3: '#1e2638', p: 'none' }, { lv: 9, needs: { bait: ['deep-jig', 'chum'], rod: 3 }, blurb: 'Should not be in fresh water. Mention it to it.' }),
  _gfF('vampire-fish', 'Vampire fish', ['deep'], 'rare', 7, 'dart', [40, 110], 61, { s: 'torpedo', c: '#dfdeee', c2: '#ffffff', c3: '#9ebde2', p: 'none', m: 'teeth', d: 'low', k: [0.92, 0.78] }, { tod: ['night'], lv: 7, blurb: 'Two very long teeth, and a very long grudge.' }),
  _gfF('moonlit-ray', 'Moonlit ray', ['deep'], 'rare', 7, 'floater', [60, 130], 52, { s: 'ray', c: '#141c41', c2: '#6967ac', c3: '#f3d76a', p: 'stars' }, { tod: ['night'], lv: 5, needs: { moon: ['full'] }, blurb: 'Glides under the moon like a slow thought.' }),
  _gfF('deep-jelly', 'Deep jelly', ['deep'], 'rare', 8, 'floater', [10, 30], 42, { s: 'jelly', c: '#b299d6', c2: '#efe0f6', c3: '#7f51ba', p: 'glow' }, { tod: ['night'], lv: 11, needs: { rain: false }, blurb: 'A slow pulse of light in the dark.' }),
  _gfF('giant-squid-pup', 'Giant squid pup', ['deep'], 'rare', 7, 'floater', [30, 70], 47, { s: 'squid', c: '#e876a2', c2: '#fedee8', c3: '#ad3e5e', p: 'none' }, { lv: 10, needs: { bait: ['shrimp', 'deep-jig'] }, blurb: 'It has not been told it is a freshwater fish.' }),
  _gfF('mola', 'Mola', ['deep'], 'rare', 7, 'floater', [80, 180], 61, { s: 'mola', c: '#7e726d', c2: '#c0bebf', c3: '#3c4743', p: 'none' }, { tod: ['day'], seasons: ['summer'], lv: 11, blurb: 'A huge head that forgot its body.' }),
  _gfF('oarfish', 'Oarfish', ['deep'], 'rare', 7, 'mixed', [150, 300], 82, { s: 'eel', c: '#7f97ac', c2: '#e3ddd4', c3: '#4a5d5c', p: 'ombre' }, { seasons: ['winter'], lv: 8, needs: { rod: 3 }, blurb: 'The ribbon that started all the sea stories.' }),
  _gfF('beluga-pup', 'Beluga pup', ['deep'], 'rare', 7, 'sinker', [100, 200], 79, { s: 'sturgeon', c: '#d9dfe1', c2: '#e5f0e3', c3: '#aeaacd', p: 'none', t: 'lyre', d: undefined, k: [0.91, 0.68] }, { seasons: ['spring', 'autumn'], lv: 12, blurb: 'It will be the biggest fish in here, given a century.' }),
  _gfF('wreck-eel', 'Wreck eel', ['deep'], 'rare', 8, 'mixed', [80, 160], 64, { s: 'eel', c: '#303942', c2: '#9592a1', c3: '#1d131b', p: 'saddle' }, { lv: 7, needs: { spot: 'old-wreck', bait: ['deep-jig'] }, blurb: 'Comes out of the porthole only for a meaty jig.' }),
  _gfF('abyss-angler', 'Abyss angler', ['deep'], 'rare', 8, 'smooth', [25, 60], 46, { s: 'angler', c: '#14152d', c2: '#576676', c3: '#000006', p: 'none', t: 'whip', k: [1, 1.09] }, { tod: ['night'], lv: 10, needs: { bait: ['glow-lure'] }, blurb: 'A small lamp, a very large mouth.' }),
  _gfF('storm-ray', 'Storm ray', ['deep'], 'rare', 7, 'floater', [80, 160], 72, { s: 'ray', c: '#374b5e', c2: '#929bb4', c3: '#d7d165', p: 'rings' }, { lv: 8, needs: { event: 'storm' }, blurb: 'Only comes up to see the lightning.' }),
  _gfF('bone-fish', 'Bone fish', ['deep'], 'rare', 8, 'smooth', [40, 90], 54, { s: 'skel', c: '#e9e1cb', c2: '#fff1eb', c3: '#9ea36f', p: 'none' }, { tod: ['night'], lv: 5, needs: { moon: ['new'] }, blurb: 'Nothing left but the idea of a fish. Still hungry.' }),
  _gfF('sawfish', 'Sawfish', ['deep'], 'epic', 10, 'mixed', [200, 380], 150, { s: 'shark', c: '#c2b485', c2: '#efe0cb', c3: '#8e8258', p: 'none', x: 'saw' }, { lv: 12, needs: { reel: 'reel-deep', line: 'line-wire' }, blurb: 'A chainsaw on the front of a shark. Nobody asked.' }),
  _gfF('beluga-sturgeon', 'Beluga sturgeon', ['deep'], 'epic', 10, 'sinker', [200, 380], 143, { s: 'sturgeon', c: '#e1dae0', c2: '#edebe2', c3: '#a1bacc', p: 'scutes', d: undefined, k: [0.83, 0.75] }, { seasons: ['spring', 'autumn'], lv: 15, needs: { rod: 4, reel: 'reel-deep' }, blurb: 'Older than your grandparents and twice as grumpy.' }),
  _gfF('mekong-giant-catfish', 'Mekong giant catfish', ['deep'], 'epic', 9, 'sinker', [180, 300], 161, { s: 'cat', c: '#808183', c2: '#e2dacd', c3: '#525256', p: 'none', k: [1.04, 1.13] }, { lv: 13, needs: { rod: 4, line: 'line-braid' }, blurb: 'No teeth, no whiskers to speak of, no need.' }),
  _gfF('giant-freshwater-ray', 'Giant freshwater ray', ['deep'], 'epic', 9, 'floater', [180, 380], 164, { s: 'ray', c: '#90784f', c2: '#d1b792', c3: '#504120', p: 'none' }, { lv: 15, needs: { hook: 'hook-large', reel: 'reel-deep' }, blurb: 'Wider than a door, and just as hard to lift.' }),
  _gfF('coelacanth', 'Coelacanth', ['deep'], 'epic', 10, 'mixed', [120, 200], 151, { s: 'hump', c: '#213cae', c2: '#a5b5de', c3: '#001b5c', p: 'stars', d: 'sail', k: [0.95, 1.08] }, { tod: ['night'], lv: 9, needs: { rod: 4, bait: ['deep-jig'] }, blurb: 'Extinct, according to everybody but itself.' }),
  _gfF('goblin-shark', 'Goblin shark', ['deep'], 'epic', 9, 'mixed', [150, 300], 163, { s: 'shark', c: '#d9aaa5', c2: '#eddbce', c3: '#c46464', p: 'none', m: 'teeth' }, { tod: ['night'], lv: 14, needs: { bait: ['chum', 'deep-jig'] }, blurb: 'Its jaw comes out to meet you.' }),
  _gfF('black-dragon-eel', 'Black dragon eel', ['deep'], 'epic', 9, 'mixed', [120, 260], 159, { s: 'eel', c: '#270d05', c2: '#d8470a', c3: '#e29912', p: 'lace', x: 'frill' }, { tod: ['night'], seasons: ['winter'], lv: 11, blurb: 'A low fire in deep water.' }),
  _gfF('pale-leviathan-pup', 'Pale leviathan pup', ['deep'], 'epic', 9, 'mixed', [150, 280], 183, { s: 'shark', c: '#c7d1e9', c2: '#f4feff', c3: '#a4bac5', p: 'ghost' }, { lv: 14, needs: { event: 'fog', rod: 3 }, blurb: 'You can see where it has been.' }),
  _gfF('frost-pike', 'Frost pike', ['deep'], 'epic', 9, 'undefined', [90, 160], 164, { s: 'pike', c: '#ceddea', c2: '#f0e1ed', c3: '#76a9c9', p: 'stars', t: 'lyre', d: 'low', k: [0.93, 0.65] }, { tod: ['dawn'], seasons: ['winter'], lv: 15, needs: { line: 'line-wire' }, blurb: 'Bites the line and the line goes cold.' }),
  _gfF('golden-sturgeon', 'Golden sturgeon', ['deep'], 'epic', 9, 'sinker', [150, 280], 163, { s: 'sturgeon', c: '#ce9616', c2: '#eee398', c3: '#a56f04', p: 'scutes', t: undefined, d: undefined, k: [0.89, 0.67] }, { seasons: ['summer'], lv: 14, needs: { reel: 'reel-gold' }, blurb: 'Armour plate, polished by no one.' }),
  _gfF('sun-ray', 'Sun ray', ['deep'], 'epic', 10, 'floater', [80, 150], 144, { s: 'ray', c: '#eda82e', c2: '#fde183', c3: '#eb4912', p: 'glow' }, { tod: ['day'], seasons: ['summer'], lv: 8, needs: { rain: false }, blurb: 'Glows like a skylight in the deep.' }),
  _gfF('black-swan-mussel-cracker', 'Black swan mussel-cracker', ['deep'], 'epic', 9, 'undefined', [70, 120], 166, { s: 'chunky', c: '#12121f', c2: '#454d34', c3: '#e8a024', p: 'none', t: undefined, d: undefined, k: [0.86, 0.83] }, { lv: 12, needs: { hook: 'hook-large', bait: ['shrimp'] }, blurb: 'Eats shells, and the noise carries.' }),
  _gfF('ghost-squid', 'Ghost squid', ['deep'], 'epic', 10, 'floater', [40, 90], 140, { s: 'squid', c: '#cfcee5', c2: '#f2f2f6', c3: '#97b7c0', p: 'ghost' }, { tod: ['night'], lv: 11, needs: { moon: ['new'], bait: ['glow-lure'] }, blurb: 'A clear shape, then an ink cloud, then nothing.' }),
  _gfF('wreck-king', 'Wreck king', ['deep'], 'epic', 9, 'undefined', [100, 180], 162, { s: 'hump', c: '#ba7133', c2: '#f1c2a3', c3: '#763b21', p: 'mirror', d: 'low', k: [0.91, 0.77] }, { lv: 11, needs: { spot: 'old-wreck', reel: 'reel-deep' }, blurb: 'Rules the old wreck, and has the scars.' }),
  _gfF('storm-eel', 'Storm eel', ['deep'], 'epic', 9, 'mixed', [120, 240], 141, { s: 'eel', c: '#4c5f61', c2: '#a7aecb', c3: '#ebe079', p: 'neon' }, { lv: 13, needs: { event: 'storm', line: 'line-wire' }, blurb: 'It comes up with the lightning, and looks like it.' }),
  _gfF('sunken-knight', 'Sunken knight', ['deep'], 'epic', 10, 'sinker', [120, 220], 169, { s: 'sturgeon', c: '#718486', c2: '#d5e4e7', c3: '#2f4c4b', p: 'mirror', d: 'low', k: [1.01, 1.12] }, { lv: 13, needs: { spot: 'drop-off', hook: 'hook-large' }, blurb: 'Plated head to tail. Has never once retreated.' }),
  _gfF('meteor-fish', 'Meteor fish', ['deep'], 'epic', 9, 'dart', [70, 130], 138, { s: 'torpedo', c: '#d54e11', c2: '#e9b362', c3: '#a00c00', p: 'glow', d: 'spines', k: [1.01, 1.09] }, { tod: ['night'], lv: 14, needs: { event: 'meteor' }, blurb: 'Fell in, they say, and has been cross ever since.' }),
  _gfF('the-bishop', 'The Bishop', ['deep'], 'legendary', 10, 'floater', [200, 330], 309, { s: 'mola', c: '#d6e7f0', c2: '#f7f7ff', c3: '#aab1d0', p: 'lace' }, { tod: ['night'], lv: 14, needs: { moon: ['new'], rod: 5, reel: 'reel-deep', chance: 12 }, blurb: 'A vast pale disc that drifts past at new moon, blessing nothing.' }),
  _gfF('leviathan', 'Leviathan', ['deep'], 'legendary', 10, 'mixed', [300, 400], 387, { s: 'shark', c: '#283037', c2: '#6b6c80', c3: '#090e26', p: 'scales' }, { tod: ['night'], lv: 13, needs: { moon: ['full'], reel: 'reel-deep', line: 'line-wire', hook: 'hook-gold', bait: ['deep-jig'], chance: 30, rain: true }, blurb: 'The lake has a floor. This has been seen below it.' }),
  _gfF('great-grey-ghost', 'Great Grey Ghost', ['deep'], 'legendary', 10, 'mixed', [240, 380], 329, { s: 'shark', c: '#c2e0da', c2: '#eff8f4', c3: '#9eafc7', p: 'ghost' }, { lv: 12, needs: { event: 'fog', rod: 5, line: 'line-braid', chance: 14 }, blurb: 'You will know the fin. You will not forget it.' }),
  _gfF('the-crimson-queen', 'The Crimson Queen', ['deep'], 'legendary', 10, 'floater', [220, 380], 326, { s: 'ray', c: '#bb131f', c2: '#e2a1a6', c3: '#630010', p: 'ombre' }, { lv: 19, needs: { event: 'blood-moon', reel: 'reel-gold', bait: ['golden-fly'], chance: 14 }, blurb: 'A red wing under a red moon.' }),
  _gfF('kraken-of-the-lake', 'Kraken of the Lake', ['deep'], 'legendary', 10, 'floater', [150, 300], 407, { s: 'squid', c: '#4c224e', c2: '#ba84bd', c3: '#27002f', p: 'rings' }, { tod: ['night'], seasons: ['winter'], lv: 19, needs: { hook: 'hook-large', line: 'line-wire', bait: ['deep-jig'], chance: 14 }, blurb: 'Eight arms and a very long memory.' }),
  _gfF('old-sun', 'Old Sun', ['deep'], 'legendary', 10, 'floater', [180, 300], 346, { s: 'mola', c: '#e38b19', c2: '#e9d164', c3: '#cc4200', p: 'glow' }, { tod: ['day'], seasons: ['summer'], lv: 17, needs: { rain: false, moon: ['full'], bait: ['golden-fly'], chance: 18 }, blurb: 'Comes up at noon on the longest days, to be admired.' }),
  _gfF('ironclad', 'Ironclad', ['deep'], 'legendary', 10, 'sinker', [250, 400], 333, { s: 'sturgeon', c: '#28292f', c2: '#839084', c3: '#000005', p: 'scutes', k: [1.04, 1.1] }, { lv: 13, needs: { spot: 'old-wreck', hook: 'hook-large', reel: 'reel-deep', rod: 4, chance: 14 }, blurb: 'Has straightened every hook it ever met.' }),
  _gfF('the-frost-maiden', 'The Frost Maiden', ['deep'], 'legendary', 10, 'mixed', [120, 200], 358, { s: 'fancy', c: '#d0e4f4', c2: '#fcffff', c3: '#8dc5e8', p: 'stars', t: 'fork', d: 'sail', k: [1.02, 1.06] }, { tod: ['dawn'], seasons: ['winter'], lv: 14, needs: { line: 'line-silk', spot: 'cold-spring', chance: 14 }, blurb: 'Trails ice in her veil, in the coldest dark.' }),
  _gfF('lantern-grandfather', 'Lantern Grandfather', ['deep'], 'legendary', 10, 'undefined', [120, 220], 334, { s: 'angler', c: '#0a092a', c2: '#202d6c', c3: '#e0cf87', p: 'stars', t: undefined, d: 'low', k: [0.92, 0.78] }, { tod: ['night'], lv: 14, needs: { moon: ['new'], bait: ['glow-lure'], rod: 4, chance: 14 }, blurb: 'He has been holding that lamp for a very long time.' }),
  _gfF('thunderback', 'Thunderback', ['deep'], 'legendary', 10, 'sinker', [250, 380], 431, { s: 'cat', c: '#4a5064', c2: '#afbcc2', c3: '#eaeb80', p: 'bands', t: undefined, d: undefined, k: [0.81, 0.81] }, { lv: 18, needs: { event: 'storm', rod: 5, reel: 'reel-deep', chance: 14 }, blurb: 'Whiskers like cables. It comes up in the worst of the weather.' }),
  _gfF('golden-emperor-carp', 'Golden Emperor Carp', ['deep'], 'legendary', 10, 'undefined', [200, 340], 431, { s: 'carp', c: '#e0ba31', c2: '#fff2b4', c3: '#b77e0a', p: 'mirror', d: undefined, k: [0.93, 0.81] }, { lv: 18, needs: { event: 'festival', bait: ['golden-fly'], hook: 'hook-gold', chance: 14 }, blurb: 'There is a whole religion, somewhere.' }),
  _gfF('common-goby', 'Common goby', ['shallow'], 'common', 2, 'floater', [4, 8], 6, { s: 'goby', c: '#d1b08b', c2: '#e9dcd1', c3: '#887e49', p: 'bars', k: [1.04, 1.1] }, { lv: 2, blurb: 'Perches on a stone and looks important.' }),
  _gfF('ninespine', 'Ninespine', ['shallow'], 'common', 2, 'dart', [4, 7], 6, { s: 'slim', c: '#4c6d3e', c2: '#b3bf8d', c3: '#2e482b', p: 'none', d: 'spines', k: [0.86, 0.83] }, { lv: 2, blurb: 'It has counted. Nine.' }),
  _gfF('barbless-dace', 'Barbless dace', ['shallow'], 'common', 2, 'dart', [8, 16], 8, { s: 'herring', c: '#8f848e', c2: '#dcdcd8', c3: '#4d594f', p: 'belly', t: 'lyre', d: 'low', k: [0.93, 0.78] }, { lv: 5, blurb: 'Nothing to hide, nothing to hook on.' }),
  _gfF('pond-smelt', 'Pond smelt', ['pond'], 'common', 1, 'dart', [6, 12], 7, { s: 'herring', c: '#d3eae8', c2: '#fdf7fd', c3: '#83c2c9', p: 'none', k: [1.05, 0.97] }, { lv: 2, blurb: 'Pale and polite, and it smells faintly of melon.' }),
  _gfF('golden-loach', 'Golden loach', ['pond'], 'uncommon', 3, 'sinker', [8, 16], 15, { s: 'loach', c: '#cea126', c2: '#eed893', c3: '#a56400', p: 'none', d: undefined, k: [0.81, 0.68] }, { lv: 5, blurb: 'Bright as a lost earring in the mud.' }),
  _gfF('marble-hatchet', 'Marble hatchet', ['pond'], 'uncommon', 3, 'smooth', [4, 7], 17, { s: 'tall', c: '#f8ebce', c2: '#f7f8ec', c3: '#bea992', p: 'dapple', t: 'round', d: 'twin', k: [1.03, 1] }, { lv: 5, blurb: 'Shaped like an axe, and frightened of everything.' }),
  _gfF('tiger-barb', 'Tiger barb', ['shallow'], 'uncommon', 4, 'smooth', [5, 10], 16, { s: 'round', c: '#efa924', c2: '#f2ebb6', c3: '#271d16', p: 'zebra', d: 'sail', k: [0.94, 0.98] }, { lv: 7, blurb: 'Small, stripy and looking for trouble.' }),
  _gfF('zebra-danio', 'Zebra danio', ['shallow'], 'uncommon', 4, 'dart', [3, 6], 17, { s: 'herring', c: '#75b3e9', c2: '#e0f7fd', c3: '#417db9', p: 'zebra', t: 'round', k: [1, 0.89] }, { lv: 4, blurb: 'Never once stopped moving.' }),
  _gfF('harlequin-rasbora', 'Harlequin rasbora', ['pond'], 'uncommon', 3, 'floater', [3, 6], 16, { s: 'goby', c: '#e46041', c2: '#eec6aa', c3: '#a2341b', p: 'bands', t: 'fan', k: [1.04, 1.13] }, { lv: 4, blurb: 'A neat black wedge on a copper coat.' }),
  _gfF('silver-mullet', 'Silver mullet', ['mid'], 'common', 2, 'dart', [25, 55], 10, { s: 'torpedo', c: '#899da0', c2: '#e2d6d0', c3: '#3e5f60', p: 'none', t: 'lyre', d: 'sail', k: [0.96, 1.08] }, { lv: 2, blurb: 'Leaps for joy, or possibly fleas.' }),
  _gfF('blue-tilapia', 'Blue tilapia', ['mid'], 'common', 2, 'undefined', [20, 40], 9, { s: 'chunky', c: '#447492', c2: '#c6ede9', c3: '#1c5168', p: 'bars', d: undefined, k: [0.88, 0.83] }, { lv: 4, blurb: 'Looks after its young in its mouth.' }),
  _gfF('black-crappie', 'Black crappie', ['mid'], 'uncommon', 5, 'undefined', [15, 30], 20, { s: 'flat', c: '#3a3240', c2: '#959896', c3: '#122119', p: 'dapple', t: undefined, d: undefined, k: [0.88, 0.67] }, { tod: ['dawn', 'dusk'], lv: 6, blurb: 'Dotted all over as if by a careless brush.' }),
  _gfF('spotted-sucker', 'Spotted sucker', ['mid'], 'uncommon', 4, 'smooth', [25, 50], 20, { s: 'carp', c: '#d2d0be', c2: '#e6f1dc', c3: '#ac9e6a', p: 'spots', m: 'tube', d: 'low', k: [0.9, 0.84] }, { lv: 5, blurb: 'Neat rows of spots, and very tidy habits.' }),
  _gfF('copper-redhorse', 'Copper redhorse', ['mid'], 'rare', 7, 'smooth', [50, 90], 58, { s: 'hump', c: '#974d30', c2: '#e3b48c', c3: '#682c0a', p: 'mirror', d: undefined, k: [0.86, 0.66] }, { lv: 12, needs: { bait: ['worm', 'maggot'] }, blurb: 'A rare old thing with a head like a kettle.' }),
  _gfF('lake-ghost', 'Lake ghost', ['deep'], 'uncommon', 5, 'dart', [50, 90], 26, { s: 'slim', c: '#d2deed', c2: '#eaf5f2', c3: '#99adc5', p: 'ghost', t: 'fan', d: 'low', k: [0.97, 0.98] }, { tod: ['night'], lv: 8, blurb: 'Everyone calls it something else.' }),
  _gfF('silver-oarlet', 'Silver oarlet', ['deep'], 'uncommon', 5, 'mixed', [60, 120], 29, { s: 'eel', c: '#cdced7', c2: '#eedfe8', c3: '#8ba8c7', p: 'none' }, { lv: 6, blurb: 'A strip of tin foil that swims.' }),
  _gfF('bluefin-giant', 'Bluefin giant', ['deep'], 'rare', 7, 'dart', [150, 300], 76, { s: 'torpedo', c: '#1847a7', c2: '#a6b2e0', c3: '#0a146e', p: 'ombre', t: 'fork', k: [0.96, 0.88] }, { lv: 11, needs: { reel: 'reel-deep', rod: 3 }, blurb: 'No business being in a lake, and no plans to leave.' }),
  _gfF('deep-sea-hatchet', 'Deep-sea hatchet', ['deep'], 'rare', 7, 'mixed', [20, 45], 52, { s: 'tall', c: '#0e0827', c2: '#515971', c3: '#000004', p: 'neon', k: [1.03, 1.13] }, { tod: ['night'], lv: 12, needs: { bait: ['glow-lure'] }, blurb: 'A silver axe-head with a light on.' }),
  _gfF('tiger-shark', 'Tiger shark', ['deep'], 'epic', 9, 'mixed', [180, 350], 181, { s: 'shark', c: '#606c7c', c2: '#cfc8d8', c3: '#27433b', p: 'tiger' }, { tod: ['dusk'], lv: 12, needs: { bait: ['chum', 'deep-jig'], line: 'line-wire' }, blurb: 'Will eat a tin can, and has.' }),
  /*@end-fish*/
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
  return Object.freeze(Object.assign({ id, name, cat: 'bug', shape, rarity, hab: Object.freeze(hab), skit, rest, price, look: Object.freeze(Object.assign({ s: shape }, look)), tod: Object.freeze(m.tod || ['dawn', 'day', 'dusk']), seasons: Object.freeze(m.seasons || []), rain: m.rain || 0, lv: m.lv || 1, size: m.size || 1, blurb: m.blurb || '' }, m.needs ? { needs: Object.freeze(m.needs) } : {}));
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
  _gbB('blue-morpho', 'Blue morpho', 'butterfly', 'legendary', ['woods'], 5, 'perch', 280, { c: '#2f8af0', c2: '#14246a', c3: '#8ad0ff', p: 'sheen' }, { needs: { chance: 30 }, seasons: ['summer'], tod: ['day'], lv: 9, size: 1.5, blurb: 'It flashes electric blue and vanishes.' }),
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
  /*@more-bugs*/
  _gbB('large-white', 'Large white', 'butterfly', 'common', ['flower', 'lawn'], 1, 'perch', 4, { c: '#d6e9df', c2: '#030800', c3: '#e6e2df', p: 'tip' }, { seasons: ['spring', 'summer'], lv: 1, blurb: 'Eats your cabbages and looks innocent.' }),
  _gbB('green-veined-white', 'Green-veined white', 'butterfly', 'common', ['flower', 'lawn'], 1, 'perch', 3, { c: '#efeee8', c2: '#5fb14c', c3: '#fffcfc', p: 'veins' }, { seasons: ['spring', 'summer'], lv: 2, blurb: 'Delicate pencil lines on every wing.' }),
  _gbB('meadow-brown', 'Meadow brown', 'butterfly', 'common', ['lawn', 'flower'], 2, 'perch', 4, { c: '#6e401d', c2: '#df770d', c3: '#aca491', p: 'eyes' }, { seasons: ['summer'], lv: 1, blurb: 'The most ordinary butterfly, and quietly lovely.' }),
  _gbB('gatekeeper', 'Gatekeeper', 'butterfly', 'common', ['flower'], 1, 'perch', 4, { c: '#f7851b', c2: '#71633f', c3: '#f4cda2', p: 'edge' }, { seasons: ['summer'], lv: 2, blurb: 'Keeps to the hedge and watches who comes in.' }),
  _gbB('ringlet', 'Ringlet', 'butterfly', 'common', ['lawn', 'woods'], 1, 'perch', 3, { c: '#532d1b', c2: '#c1926d', c3: '#281f16', p: 'ring' }, { seasons: ['summer'], lv: 2, blurb: 'Dark as cocoa, with little rings of light.' }),
  _gbB('speckled-wood', 'Speckled wood', 'butterfly', 'common', ['woods', 'tree'], 1, 'perch', 4, { c: '#5e3d2c', c2: '#dde5e0', c3: '#b2a48f', p: 'spots' }, { seasons: ['spring', 'summer', 'autumn'], lv: 4, blurb: 'Sunlight through leaves, in butterfly form.' }),
  _gbB('wall-brown', 'Wall brown', 'butterfly', 'common', ['ground', 'lawn'], 1, 'perch', 5, { c: '#f88c18', c2: '#72553c', c3: '#f5d49f', p: 'check' }, { seasons: ['spring', 'summer'], lv: 2, blurb: 'Sunbathes on the path and leaves when you arrive.' }),
  _gbB('small-heath', 'Small heath', 'butterfly', 'common', ['lawn'], 2, 'perch', 4, { c: '#c6bd81', c2: '#e9e0be', c3: '#937b57' }, { seasons: ['spring', 'summer'], lv: 5, blurb: 'Small, tan and always just over there.' }),
  _gbB('comma', 'Comma', 'butterfly', 'common', ['flower', 'tree'], 1, 'perch', 4, { c: '#af5a24', c2: '#d7ac4e', c3: '#560f02', w: 'scallop', p: 'edge' }, { seasons: ['spring', 'summer', 'autumn'], lv: 2, blurb: 'Its wings look torn on purpose. It is a style.' }),
  _gbB('holly-blue', 'Holly blue', 'butterfly', 'common', ['flower', 'tree'], 1, 'perch', 4, { c: '#70bbe9', c2: '#f1f0f3', c3: '#c5daef', p: 'glass' }, { seasons: ['spring', 'summer'], lv: 4, blurb: 'A scrap of sky that came down for the holly.' }),
  _gbB('common-blue', 'Common blue', 'butterfly', 'common', ['lawn', 'flower'], 2, 'perch', 5, { c: '#3560c1', c2: '#f5ece6', c3: '#9db3db', p: 'edge' }, { seasons: ['summer'], lv: 5, blurb: 'Blue above, freckled below. Rarely common.' }),
  _gbB('small-copper', 'Small copper', 'butterfly', 'common', ['lawn', 'flower'], 1, 'perch', 5, { c: '#db5514', c2: '#0c0400', c3: '#eea187', p: 'check' }, { seasons: ['summer', 'autumn'], lv: 4, blurb: 'A bright little coin on the thistle.' }),
  _gbB('skipper', 'Skipper', 'butterfly', 'common', ['lawn'], 2, 'perch', 4, { c: '#f7a229', c2: '#fcd99a', c3: '#cf5b21', w: 'long' }, { seasons: ['summer'], lv: 3, blurb: 'Holds its wings like a small plane.' }),
  _gbB('marbled-white', 'Marbled white', 'butterfly', 'uncommon', ['lawn', 'flower'], 2, 'perch', 13, { c: '#f1f0e1', c2: '#1e2415', c3: '#fffef6', p: 'marble' }, { seasons: ['summer'], lv: 5, size: 1.02, blurb: 'Not a white. Looks like a chessboard in a storm.' }),
  _gbB('clouded-yellow', 'Clouded yellow', 'butterfly', 'uncommon', ['lawn', 'flower'], 2, 'perch', 11, { c: '#f2c636', c2: '#211e1a', c3: '#efedae', p: 'edge' }, { seasons: ['summer', 'autumn'], lv: 3, size: 1.02, needs: { plant: 'clover' }, blurb: 'Blown in from the south, and fast.' }),
  _gbB('dark-green-fritillary', 'Dark green fritillary', 'butterfly', 'uncommon', ['flower', 'woods'], 2, 'perch', 15, { c: '#f38f23', c2: '#825932', c3: '#f0c295', p: 'check' }, { seasons: ['summer'], lv: 3, size: 1.02, needs: { plant: 'thistle' }, blurb: 'Fast and fond of thistles.' }),
  _gbB('silver-washed-fritillary', 'Silver-washed fritillary', 'butterfly', 'uncommon', ['woods', 'flower'], 2, 'perch', 13, { c: '#ac6024', c2: '#edba5e', c3: '#6d2216', w: 'scallop', p: 'check' }, { seasons: ['summer'], lv: 7, size: 1.02, blurb: 'Silver streaks you only see underneath.' }),
  _gbB('grayling', 'Grayling', 'butterfly', 'uncommon', ['ground'], 2, 'perch', 12, { c: '#baa379', c2: '#d2ceaa', c3: '#72613a', p: 'eyes' }, { seasons: ['summer'], lv: 5, size: 1.02, blurb: 'Sits on bare ground and tilts into the sun.' }),
  _gbB('brown-argus', 'Brown argus', 'butterfly', 'uncommon', ['lawn'], 2, 'perch', 15, { c: '#401000', c2: '#ae8a52', c3: '#160700', p: 'edge' }, { seasons: ['summer'], lv: 3, size: 1.02, blurb: 'Brown, with orange beads along the hem.' }),
  _gbB('adonis-blue', 'Adonis blue', 'butterfly', 'uncommon', ['lawn', 'flower'], 2, 'perch', 14, { c: '#138698', c2: '#8cd6d4', c3: '#004e6b', p: 'edge' }, { seasons: ['summer'], lv: 5, size: 1.02, blurb: 'So blue it looks plugged in.' }),
  _gbB('green-hairstreak', 'Green hairstreak', 'butterfly', 'uncommon', ['tree', 'flower'], 3, 'perch', 14, { c: '#199c47', c2: '#d9dad3', c3: '#95c0ab' }, { seasons: ['spring'], lv: 8, size: 1.02, blurb: 'The only green butterfly, and it folds up to hide.' }),
  _gbB('purple-hairstreak', 'Purple hairstreak', 'butterfly', 'uncommon', ['tree', 'woods'], 2, 'perch', 13, { c: '#5e1358', c2: '#5cabd6', c3: '#a58e9e', p: 'sheen' }, { seasons: ['summer'], lv: 7, size: 1.02, blurb: 'Lives at the very top of the oak.' }),
  _gbB('swallow-prominent', 'Swallow prominent', 'moth', 'uncommon', ['light', 'tree'], 3, 'perch', 12, { c: '#d6d8ba', c2: '#f5ddcf', c3: '#b1967e', p: 'tails' }, { tod: ['dusk', 'night'], seasons: ['spring', 'summer'], lv: 4, size: 1.02, blurb: 'Pale and tailed, and only ever in lamp light.' }),
  _gbB('glanville-fritillary', 'Glanville fritillary', 'butterfly', 'uncommon', ['lawn'], 2, 'perch', 10, { c: '#df510f', c2: '#100010', c3: '#dcae7f', p: 'check' }, { seasons: ['spring'], lv: 5, size: 1.02, blurb: 'Named after a lady people said was mad.' }),
  _gbB('duke-of-burgundy', 'Duke of Burgundy', 'butterfly', 'uncommon', ['flower', 'woods'], 3, 'perch', 15, { c: '#614330', c2: '#d27a0b', c3: '#b4a690', p: 'check' }, { seasons: ['spring'], lv: 4, size: 1.02, blurb: 'Very small for a duke.' }),
  _gbB('wood-white', 'Wood white', 'butterfly', 'uncommon', ['woods'], 2, 'perch', 15, { c: '#f0fbe1', c2: '#1d1a16', c3: '#fff4f6', w: 'long' }, { seasons: ['spring', 'summer'], lv: 5, size: 1.02, blurb: 'Floats as if it had forgotten something.' }),
  _gbB('large-skipper', 'Large skipper', 'butterfly', 'uncommon', ['lawn'], 3, 'perch', 13, { c: '#fc932b', c2: '#ffdf9d', c3: '#d56513', w: 'long', p: 'check' }, { seasons: ['summer'], lv: 4, size: 1.02, blurb: 'All wing muscle and urgent business.' }),
  _gbB('lavender-blue', 'Lavender blue', 'butterfly', 'uncommon', ['flower'], 3, 'perch', 15, { c: '#c2a2df', c2: '#f9ede5', c3: '#decdf9', p: 'glass' }, { seasons: ['summer'], lv: 8, size: 1.02, needs: { plant: 'lavender' }, blurb: 'Comes only to lavender, and smells wonderful.' }),
  _gbB('thistle-lady', 'Thistle lady', 'butterfly', 'uncommon', ['flower'], 3, 'perch', 14, { c: '#d46249', c2: '#100a05', c3: '#e7a49b', p: 'spots' }, { seasons: ['summer'], lv: 6, size: 1.02, needs: { plant: 'thistle' }, blurb: 'A painted lady cousin who loves a thistle.' }),
  _gbB('rainy-day-ringlet', 'Rainy-day ringlet', 'butterfly', 'uncommon', ['lawn', 'flower'], 3, 'perch', 12, { c: '#0f0a2c', c2: '#dcdfd8', c3: '#7f8e90', p: 'ring' }, { seasons: ['summer'], rain: 1, lv: 8, size: 1.02, blurb: 'The only butterfly that likes the rain.' }),
  _gbB('sunflower-emperor', 'Sunflower emperor', 'butterfly', 'rare', ['flower'], 4, 'perch', 44, { c: '#da950e', c2: '#12000f', c3: '#ebc090', p: 'band' }, { seasons: ['summer'], lv: 8, size: 1.12, needs: { plant: 'sunflower' }, blurb: 'Sits on a sunflower like a small throne.' }),
  _gbB('camberwell-beauty', 'Camberwell beauty', 'butterfly', 'rare', ['tree', 'woods'], 3, 'perch', 48, { c: '#661933', c2: '#f3d83e', c3: '#c29cac', p: 'edge' }, { seasons: ['autumn', 'spring'], lv: 9, size: 1.12, blurb: 'A dark wine wing with a pale hem. A rare visitor.' }),
  _gbB('queen-of-spain', 'Queen of Spain', 'butterfly', 'rare', ['flower', 'lawn'], 4, 'perch', 36, { c: '#e0881a', c2: '#030706', c3: '#f0c383', p: 'check' }, { seasons: ['summer', 'autumn'], lv: 6, size: 1.12, blurb: 'Silver spots below, royal manners above.' }),
  _gbB('large-tortoiseshell', 'Large tortoiseshell', 'butterfly', 'rare', ['tree', 'woods'], 3, 'perch', 36, { c: '#d25a13', c2: '#030a00', c3: '#e5a786', p: 'edge' }, { seasons: ['spring', 'summer'], lv: 7, size: 1.12, blurb: 'Thought lost from these islands. Quietly came back.' }),
  _gbB('long-tailed-blue', 'Long-tailed blue', 'butterfly', 'rare', ['flower'], 3, 'perch', 37, { c: '#3359c8', c2: '#fdede2', c3: '#9abcdf', p: 'tails' }, { seasons: ['summer', 'autumn'], lv: 9, size: 1.12, blurb: 'Tiny tails to fool a bird into biting the wrong end.' }),
  _gbB('julia', 'Julia', 'butterfly', 'rare', ['flower', 'woods'], 3, 'perch', 40, { c: '#e34d0c', c2: '#00000c', c3: '#e1af7f', w: 'long' }, { lv: 7, size: 1.12, needs: { plant: 'passion-flower' }, blurb: 'Long wings, long life, drinks passion flowers.' }),
  _gbB('owl-butterfly', 'Owl butterfly', 'butterfly', 'rare', ['woods'], 4, 'perch', 51, { c: '#371500', c2: '#b0875f', c3: '#0d0c00', w: 'wide', p: 'eyes' }, { tod: ['dusk'], lv: 8, size: 1.12, blurb: 'Flash the wing and it is an owl.' }),
  _gbB('glasswing', 'Glasswing', 'butterfly', 'rare', ['woods', 'flower'], 3, 'perch', 40, { c: '#caefe4', c2: '#1c1b16', c3: '#eef0f7', w: 'long', p: 'glass' }, { tod: ['dawn', 'dusk'], lv: 9, size: 1.12, blurb: 'You can read through it. Please do not.' }),
  _gbB('zebra-longwing', 'Zebra longwing', 'butterfly', 'rare', ['flower', 'woods'], 4, 'perch', 44, { c: '#030f0f', c2: '#d4b62a', c3: '#8b8584', w: 'long', p: 'stripe' }, { lv: 8, size: 1.12, needs: { plant: 'passion-flower' }, blurb: 'Sleeps in a gang and keeps the same bed.' }),
  _gbB('birdwing', 'Birdwing', 'butterfly', 'epic', ['woods', 'tree'], 5, 'perch', 89, { c: '#2fb151', c2: '#171421', c3: '#abd4b5', w: 'wide', p: 'band' }, { tod: ['day'], seasons: ['summer'], lv: 9, size: 1.25, blurb: 'As big as a small bird, and aware of it.' }),
  _gbB('atlas-eyed-monarch', 'Atlas-eyed monarch', 'butterfly', 'epic', ['woods', 'flower'], 5, 'perch', 109, { c: '#d64d09', c2: '#120900', c3: '#e9ae7c', w: 'wide', p: 'eyes' }, { seasons: ['autumn'], lv: 11, size: 1.25, blurb: 'Crosses oceans for one good flower.' }),
  _gbB('golden-swallowtail', 'Golden swallowtail', 'butterfly', 'epic', ['flower', 'woods'], 4, 'perch', 101, { c: '#d0961e', c2: '#e5df98', c3: '#e9c898', p: 'tails' }, { seasons: ['summer'], lv: 12, size: 1.25, needs: { plant: 'golden-sunflower' }, blurb: 'Comes out for the golden sunflower only.' }),
  _gbB('sunset-morpho', 'Sunset morpho', 'butterfly', 'epic', ['woods'], 5, 'perch', 102, { c: '#e75f38', c2: '#72bdde', c3: '#febead', p: 'sheen' }, { tod: ['dusk'], seasons: ['summer'], lv: 13, size: 1.25, needs: { moon: ['waxing'] }, blurb: 'The colours change as it turns. Hold your breath.' }),
  _gbB('frost-wing', 'Frost wing', 'butterfly', 'epic', ['woods', 'tree'], 5, 'perch', 109, { c: '#d9f6f7', c2: '#181514', c3: '#e4f7f2', p: 'glass' }, { seasons: ['winter'], rain: 1, lv: 11, size: 1.25, blurb: 'Flies in the snow. It has not been told not to.' }),
  _gbB('pearl-empress', 'Pearl empress', 'butterfly', 'legendary', ['flower', 'woods'], 5, 'perch', 244, { c: '#d3cccf', c2: '#1e5dbc', c3: '#dbe7e9', p: 'ring' }, { tod: ['night'], seasons: ['winter'], lv: 19, size: 1.4, needs: { plant: 'frost-rose', moon: ['full'], chance: 30 }, blurb: 'Comes to a frost rose by a full moon, once in a long while.' }),
  _gbB('rainbow-emperor', 'Rainbow emperor', 'butterfly', 'legendary', ['woods', 'flower'], 5, 'perch', 224, { c: '#90afe8', c2: '#122411', c3: '#c5e0ed', p: 'ombre' }, { seasons: ['spring'], rain: 1, lv: 12, size: 1.4, needs: { plant: 'rainbow-tulip', chance: 30 }, blurb: 'Comes for the rainbow tulip, in the rain, after a bad week.' }),
  _gbB('silver-y', 'Silver Y', 'moth', 'common', ['flower', 'light'], 1, 'perch', 4, { c: '#898b8e', c2: '#e0d7cb', c3: '#5c4b4f' }, { tod: ['dusk', 'night'], seasons: ['summer', 'autumn'], lv: 1, blurb: 'Has a little silver Y on each wing, for no reason given.' }),
  _gbB('large-yellow-underwing', 'Large yellow underwing', 'moth', 'common', ['light', 'lawn'], 2, 'perch', 4, { c: '#756232', c2: '#e8c943', c3: '#c9b5aa', p: 'band' }, { tod: ['night'], seasons: ['summer'], lv: 5, blurb: 'Dull on top. Then it opens.' }),
  _gbB('brimstone-moth', 'Brimstone moth', 'moth', 'common', ['light', 'tree'], 2, 'perch', 3, { c: '#e6db4d', c2: '#fffabe', c3: '#b9b014' }, { tod: ['night'], seasons: ['spring', 'summer'], lv: 5, blurb: 'A flake of yellow in the torchlight.' }),
  _gbB('angle-shades', 'Angle shades', 'moth', 'common', ['light', 'lawn'], 2, 'perch', 4, { c: '#cb6b83', c2: '#603d1f', c3: '#e6a7c4', p: 'band' }, { tod: ['night'], seasons: ['autumn'], lv: 3, blurb: 'Folded like a dead leaf with very good tailoring.' }),
  _gbB('common-footman', 'Common footman', 'moth', 'common', ['light'], 2, 'perch', 4, { c: '#7b727c', c2: '#c8cbc6', c3: '#38423a' }, { tod: ['night'], seasons: ['summer'], lv: 3, blurb: 'Grey, narrow and always on duty.' }),
  _gbB('december-moth', 'December moth', 'moth', 'common', ['light', 'tree'], 2, 'perch', 3, { c: '#3a3638', c2: '#eff6e0', c3: '#b0aaab', p: 'fur' }, { tod: ['night'], seasons: ['winter'], lv: 3, blurb: 'A furry coat, and out in December on purpose.' }),
  _gbB('winter-moth', 'Winter moth', 'moth', 'common', ['light', 'tree'], 2, 'perch', 5, { c: '#ccaf8b', c2: '#efe7c8', c3: '#84814c' }, { tod: ['dusk', 'night'], seasons: ['winter'], lv: 5, blurb: 'Flies when nothing else will.' }),
  _gbB('buff-tip', 'Buff-tip', 'moth', 'uncommon', ['tree', 'light'], 2, 'perch', 13, { c: '#bac09a', c2: '#71633e', c3: '#e0cfc2' }, { tod: ['night'], seasons: ['summer'], lv: 3, size: 1.02, blurb: 'Looks exactly like a snapped birch twig.' }),
  _gbB('burnet', 'Burnet', 'moth', 'uncommon', ['flower', 'lawn'], 3, 'perch', 11, { c: '#081a26', c2: '#ce1601', c3: '#8c859a', p: 'spots' }, { tod: ['day'], seasons: ['summer'], lv: 8, size: 1.02, blurb: 'Black and red, flying by day like a warning.' }),
  _gbB('cinnabar', 'Cinnabar', 'moth', 'uncommon', ['flower', 'lawn'], 3, 'perch', 11, { c: '#222c36', c2: '#d32812', c3: '#a696ab', p: 'band' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 6, size: 1.02, blurb: 'Poison-red, and proud.' }),
  _gbB('elephant-hawk-moth', 'Elephant hawk-moth', 'moth', 'uncommon', ['flower', 'light'], 3, 'perch', 12, { c: '#c25c89', c2: '#519035', c3: '#ddadb5', p: 'band' }, { tod: ['dusk', 'night'], seasons: ['summer'], lv: 6, size: 1.02, blurb: 'Pink and green, like a boiled sweet in a hurry.' }),
  _gbB('privet-hawk-moth', 'Privet hawk-moth', 'moth', 'uncommon', ['light', 'tree'], 2, 'perch', 11, { c: '#f0a2bc', c2: '#21151b', c3: '#ffdee8', p: 'stripe' }, { tod: ['night'], seasons: ['summer'], lv: 7, size: 1.02, blurb: 'Stripy as a stick of rock.' }),
  _gbB('peppered-moth', 'Peppered moth', 'moth', 'uncommon', ['tree', 'light'], 3, 'perch', 13, { c: '#ede7d3', c2: '#2e2323', c3: '#898976', p: 'speckle' }, { tod: ['night'], seasons: ['summer'], lv: 6, size: 1.02, blurb: 'Changed its coat when the soot came. Then back.' }),
  _gbB('merveille-du-jour', 'Merveille du jour', 'moth', 'uncommon', ['tree', 'light'], 3, 'perch', 13, { c: '#88b48d', c2: '#274c32', c3: '#e1f0c2', p: 'speckle' }, { tod: ['night'], seasons: ['autumn'], lv: 6, size: 1.02, blurb: 'Lichen-green: the marvel of the day, at night.' }),
  _gbB('old-lady', 'Old lady', 'moth', 'uncommon', ['tree', 'light'], 3, 'perch', 13, { c: '#351203', c2: '#ae854d', c3: '#1f0400' }, { tod: ['night'], seasons: ['summer'], lv: 8, size: 1.02, blurb: 'Large, dark and comes indoors uninvited.' }),
  _gbB('red-underwing', 'Red underwing', 'moth', 'uncommon', ['tree', 'light'], 2, 'perch', 10, { c: '#86918d', c2: '#d93010', c3: '#d0c4c4', p: 'band' }, { tod: ['night'], seasons: ['autumn'], lv: 3, size: 1.02, blurb: 'Grey bark, then a flash of red petticoat.' }),
  _gbB('herald', 'Herald', 'moth', 'uncommon', ['woods', 'tree'], 3, 'perch', 15, { c: '#bd5729', c2: '#f4be5a', c3: '#692e06', p: 'edge' }, { tod: ['night'], seasons: ['autumn', 'winter'], lv: 6, size: 1.02, needs: { decor: 'potting-shed' }, blurb: 'Announces autumn, then sleeps in your shed.' }),
  _gbB('scarlet-tiger', 'Scarlet tiger', 'moth', 'rare', ['flower', 'light'], 4, 'perch', 47, { c: '#0a0d0d', c2: '#c11509', c3: '#7d8383', p: 'tiger' }, { tod: ['day'], seasons: ['summer'], lv: 8, size: 1.12, blurb: 'Flies by day in a very loud coat.' }),
  _gbB('lappet', 'Lappet', 'moth', 'rare', ['tree', 'light'], 4, 'perch', 45, { c: '#834012', c2: '#c09061', c3: '#521600', p: 'fur' }, { tod: ['night'], seasons: ['summer'], lv: 12, size: 1.12, blurb: 'Exactly like a bunch of dead leaves.' }),
  _gbB('puss-moth', 'Puss moth', 'moth', 'rare', ['tree', 'light'], 4, 'perch', 40, { c: '#d8daee', c2: '#01060b', c3: '#ecede9', p: 'fur' }, { tod: ['night'], seasons: ['spring', 'summer'], lv: 8, size: 1.12, blurb: 'Soft, white and a cat in every way that counts.' }),
  _gbB('deaths-head-hawk-moth', 'Death’s-head hawk-moth', 'moth', 'rare', ['light', 'flower'], 3, 'perch', 52, { c: '#261d24', c2: '#e3c124', c3: '#88969a', p: 'fur' }, { tod: ['night'], seasons: ['autumn'], lv: 11, size: 1.12, needs: { moon: ['new'] }, blurb: 'A skull on its back, and it squeaks.' }),
  _gbB('emperor-moth', 'Emperor moth', 'moth', 'rare', ['flower', 'woods'], 3, 'perch', 40, { c: '#ab8dc8', c2: '#d37707', c3: '#c8bde6', p: 'eyes' }, { tod: ['day'], seasons: ['spring'], lv: 7, size: 1.12, blurb: 'Four great eyes, out in the spring sun.' }),
  _gbB('atlas-moth', 'Atlas moth', 'moth', 'epic', ['woods', 'light'], 5, 'perch', 100, { c: '#a4512a', c2: '#f9ecec', c3: '#d2ac9a', p: 'eyes' }, { tod: ['night'], seasons: ['summer'], lv: 11, size: 1.25, needs: { moon: ['waxing', 'full'] }, blurb: 'As big as a hand, and has no mouth at all.' }),
  _gbB('comet-moth', 'Comet moth', 'moth', 'epic', ['woods', 'light'], 4, 'perch', 121, { c: '#dbd138', c2: '#c81a0d', c3: '#eed993', p: 'tails' }, { tod: ['night'], seasons: ['summer'], lv: 14, size: 1.25, needs: { event: 'meteor' }, blurb: 'Tails longer than the rest of it put together.' }),
  _gbB('lantern-moth', 'Lantern moth', 'moth', 'epic', ['light'], 4, 'perch', 130, { c: '#da8912', c2: '#070f06', c3: '#ebc893' }, { tod: ['night'], lv: 14, size: 1.25, needs: { decor: 'paper-lanterns' }, blurb: 'It will only come to a paper lantern.' }),
  _gbB('ghost-moth', 'Ghost moth', 'moth', 'epic', ['lawn', 'light'], 5, 'perch', 96, { c: '#e5ecf6', c2: '#231914', c3: '#f9ffff' }, { tod: ['dusk'], seasons: ['summer'], lv: 15, size: 1.25, needs: { moon: ['full'] }, blurb: 'Hovers in one spot at dusk, and that is the whole act.' }),
  _gbB('the-moonlit-bride', 'The Moonlit Bride', 'moth', 'legendary', ['light', 'woods'], 5, 'perch', 330, { c: '#d5edfa', c2: '#2a6fd0', c3: '#f2f2f9', p: 'tails' }, { tod: ['night'], seasons: ['summer'], lv: 18, size: 1.4, needs: { moon: ['full'], decor: 'string-lights', chance: 40 }, blurb: 'Drifts down to your lanterns at a full moon, and only then.' }),
  _gbB('red-tailed-bumblebee', 'Red-tailed bumblebee', 'bee', 'common', ['flower'], 1, 'hover', 4, { c: '#222229', c2: '#c5120a', c3: '#999b8a', p: 'fur' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 1, blurb: 'A velvet jacket with a bright red bottom.' }),
  _gbB('white-tailed-bumblebee', 'White-tailed bumblebee', 'bee', 'common', ['flower'], 1, 'hover', 4, { c: '#d5b72e', c2: '#dceacd', c3: '#e6d98e', p: 'fur' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 2, blurb: 'Has mislaid the rest of its stripes.' }),
  _gbB('mining-bee', 'Mining bee', 'bee', 'common', ['ground', 'flower'], 1, 'hover', 4, { c: '#cc9344', c2: '#633017', c3: '#e9e5bb' }, { tod: ['day'], seasons: ['spring'], lv: 2, blurb: 'Digs a tiny volcano in your lawn.' }),
  _gbB('leafcutter-bee', 'Leafcutter bee', 'bee', 'common', ['flower', 'tree'], 2, 'hover', 4, { c: '#879185', c2: '#d49227', c3: '#d2c9bf' }, { tod: ['day'], seasons: ['summer'], lv: 5, needs: { plant: 'rose' }, blurb: 'Cuts neat circles from your roses and flies off with them.' }),
  _gbB('common-wasp', 'Common wasp', 'wasp', 'common', ['flower', 'ground'], 1, 'hover', 4, { c: '#0f0200', c2: '#d5c623', c3: '#818885' }, { tod: ['day'], seasons: ['summer', 'autumn'], lv: 1, blurb: 'Would like a word about your jam.' }),
  _gbB('hoverfly', 'Hoverfly', 'fly', 'common', ['flower'], 1, 'hover', 4, { c: '#252423', c2: '#ebd432', c3: '#989a98', p: 'stripe' }, { tod: ['day'], seasons: ['spring', 'summer', 'autumn'], lv: 1, size: 0.8, blurb: 'Dressed up as a wasp. Fools nobody for long.' }),
  _gbB('bluebottle', 'Bluebottle', 'fly', 'common', ['ground', 'lawn'], 2, 'hover', 4, { c: '#1d44a9', c2: '#050b00', c3: '#84a7d4', p: 'metal' }, { seasons: ['spring', 'summer', 'autumn'], lv: 3, size: 0.8, blurb: 'Finds you, wherever you put the sandwich.' }),
  _gbB('greenbottle', 'Greenbottle', 'fly', 'common', ['lawn', 'flower'], 1, 'hover', 5, { c: '#1b9c48', c2: '#0d070c', c3: '#97bfab', p: 'metal' }, { seasons: ['summer'], lv: 2, size: 0.8, blurb: 'A tiny flying emerald with appalling habits.' }),
  _gbB('house-fly', 'House fly', 'fly', 'common', ['lawn', 'ground'], 2, 'hover', 4, { c: '#859287', c2: '#121316', c3: '#d0cac1' }, { seasons: ['spring', 'summer', 'autumn'], lv: 5, size: 0.8, blurb: 'It has been everywhere, and it would like to tell you.' }),
  _gbB('crane-fly', 'Crane fly', 'crane', 'common', ['lawn', 'light'], 1, 'hover', 4, { c: '#af9d7c', c2: '#dcc8ad', c3: '#7c6f3d' }, { tod: ['dusk', 'night'], seasons: ['autumn'], lv: 4, blurb: 'Daddy long legs. Leaves a leg behind as a tip.' }),
  _gbB('gnat', 'Gnat', 'fly', 'common', ['water', 'lawn'], 2, 'hover', 4, { c: '#82808b', c2: '#24171a', c3: '#b3c0b1' }, { tod: ['dusk'], seasons: ['spring', 'summer'], lv: 3, size: 0.8, blurb: 'There are a thousand more behind it.' }),
  _gbB('mosquito', 'Mosquito', 'crane', 'common', ['water', 'light'], 1, 'hover', 4, { c: '#131015', c2: '#f0f9e9', c3: '#9b9b9f', p: 'stripe' }, { tod: ['dusk', 'night'], seasons: ['summer'], lv: 4, blurb: 'You will have heard it first.' }),
  _gbB('horsefly', 'Horsefly', 'fly', 'uncommon', ['lawn', 'woods'], 3, 'hover', 11, { c: '#878e85', c2: '#141015', c3: '#d2c6bf', p: 'stripe' }, { seasons: ['summer'], lv: 4, size: 0.82, blurb: 'Rainbow eyes, and it does not ask first.' }),
  _gbB('bee-fly', 'Bee-fly', 'bee', 'uncommon', ['flower'], 3, 'hover', 13, { c: '#b27f39', c2: '#3f2903', c3: '#e5d59e', p: 'fur' }, { tod: ['day'], seasons: ['spring'], lv: 4, size: 1.02, blurb: 'A flying pom-pom with a long, long nose.' }),
  _gbB('drone-fly', 'Drone fly', 'fly', 'uncommon', ['flower'], 3, 'hover', 13, { c: '#bd8b34', c2: '#4a2100', c3: '#dac9aa', p: 'stripe' }, { tod: ['day'], seasons: ['summer', 'autumn'], lv: 4, size: 0.82, blurb: 'Honey-coloured, and hovers like it means it.' }),
  _gbB('hornet', 'Hornet', 'wasp', 'uncommon', ['tree', 'woods'], 3, 'hover', 15, { c: '#ad602b', c2: '#f9c75d', c3: '#6d321a' }, { seasons: ['summer', 'autumn'], lv: 5, size: 1.02, blurb: 'Large and calm, unless you are a wasp.' }),
  _gbB('wood-wasp', 'Wood wasp', 'wasp', 'uncommon', ['woods', 'tree'], 2, 'hover', 14, { c: '#020001', c2: '#ddc425', c3: '#898587', p: 'stripe' }, { seasons: ['summer'], lv: 7, size: 1.02, blurb: 'Looks terrifying. Only interested in pine.' }),
  _gbB('ichneumon', 'Ichneumon', 'wasp', 'uncommon', ['woods', 'flower'], 3, 'hover', 13, { c: '#a4521e', c2: '#e1a16e', c3: '#5d2313' }, { seasons: ['summer'], lv: 6, size: 1.02, blurb: 'Long legs, long feelers, a long list of hosts.' }),
  _gbB('ruby-tailed-wasp', 'Ruby-tailed wasp', 'wasp', 'uncommon', ['tree', 'ground'], 3, 'hover', 14, { c: '#b41e30', c2: '#468f3c', c3: '#dc8790', p: 'metal' }, { tod: ['day'], seasons: ['summer'], lv: 4, size: 1.02, blurb: 'A tiny jewel with a shocking home life.' }),
  _gbB('potter-wasp', 'Potter wasp', 'wasp', 'uncommon', ['ground', 'flower'], 3, 'hover', 15, { c: '#201e1c', c2: '#f1da38', c3: '#928f8e' }, { seasons: ['summer'], lv: 8, size: 1.02, needs: { decor: 'terracotta-pots' }, blurb: 'Makes tiny clay pots, and they are lovely.' }),
  _gbB('honey-queen', 'Honey queen', 'bee', 'rare', ['flower'], 4, 'hover', 52, { c: '#e9b63b', c2: '#ffe6b5', c3: '#ab7a14', p: 'fur' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 12, size: 1.12, needs: { decor: 'beehive' }, blurb: 'She rarely leaves. A beehive helps.' }),
  _gbB('violet-carpenter-bee', 'Violet carpenter bee', 'bee', 'rare', ['flower', 'tree'], 3, 'hover', 43, { c: '#6d3da2', c2: '#000701', c3: '#ac99d2', p: 'metal' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 7, size: 1.12, blurb: 'Big, purple and sounds like a small van.' }),
  _gbB('orchid-bee', 'Orchid bee', 'bee', 'rare', ['flower', 'woods'], 4, 'hover', 42, { c: '#158e4c', c2: '#eae0d7', c3: '#92cb9e', p: 'metal' }, { seasons: ['summer'], lv: 12, size: 1.12, needs: { plant: 'orchid' }, blurb: 'Polished green, and collects perfume.' }),
  _gbB('giant-hornet', 'Giant hornet', 'wasp', 'epic', ['woods', 'tree'], 5, 'hover', 94, { c: '#ec5d14', c2: '#131921', c3: '#feba99', p: 'band' }, { seasons: ['summer', 'autumn'], lv: 13, size: 1.25, needs: { net: 3 }, blurb: 'As long as your thumb. Please use the good net.' }),
  _gbB('golden-bee', 'Golden bee', 'bee', 'epic', ['flower'], 5, 'hover', 102, { c: '#eeb73b', c2: '#f9e3ad', c3: '#f2d4a0', p: 'fur' }, { tod: ['day'], seasons: ['summer'], lv: 13, size: 1.25, needs: { decor: 'bee-skep' }, blurb: 'Comes only to a bee skep at the height of summer.' }),
  _gbB('queen-of-the-hive', 'Queen of the Hive', 'bee', 'legendary', ['flower'], 5, 'hover', 325, { c: '#d8a116', c2: '#d8d490', c3: '#dcbe8f', p: 'fur' }, { tod: ['dawn'], seasons: ['spring'], lv: 16, size: 1.4, needs: { decor: 'beehive', moon: ['full'], chance: 30 }, blurb: 'Everyone is looking for her, including the hive.' }),
  _gbB('two-spot-ladybird', 'Two-spot ladybird', 'ladybird', 'common', ['flower', 'lawn'], 1, 'crawl', 3, { c: '#d03414', c2: '#191818', c3: '#ef999b', p: 'spots2' }, { seasons: ['spring', 'summer', 'autumn'], lv: 1, blurb: 'Two spots, and a much quieter life.' }),
  _gbB('fourteen-spot-ladybird', 'Fourteen-spot ladybird', 'ladybird', 'common', ['flower', 'lawn'], 1, 'crawl', 4, { c: '#d4c22e', c2: '#030600', c3: '#e5cf8e', p: 'spots14' }, { seasons: ['spring', 'summer'], lv: 2, blurb: 'Yellow, square-spotted, and doing its best.' }),
  _gbB('pine-ladybird', 'Pine ladybird', 'ladybird', 'common', ['tree'], 1, 'crawl', 4, { c: '#0f0105', c2: '#c61d01', c3: '#81878c', p: 'spots2' }, { seasons: ['spring', 'summer', 'autumn'], lv: 3, blurb: 'Black with two commas, and lives up a pine.' }),
  _gbB('harlequin-ladybird', 'Harlequin ladybird', 'ladybird', 'common', ['flower', 'tree'], 1, 'crawl', 4, { c: '#f49018', c2: '#25191c', c3: '#f2c8a2', p: 'spots14' }, { seasons: ['autumn', 'winter', 'summer'], lv: 4, blurb: 'No two the same. Comes in for winter.' }),
  _gbB('dor-beetle', 'Dor beetle', 'beetle', 'common', ['ground', 'woods'], 1, 'crawl', 4, { c: '#121127', c2: '#2453ca', c3: '#82808b', p: 'metal' }, { tod: ['dusk'], seasons: ['summer', 'autumn'], lv: 4, blurb: 'A dark, shiny, deeply thoughtful dung beetle.' }),
  _gbB('rove-beetle', 'Rove beetle', 'earwig', 'common', ['ground'], 1, 'crawl', 5, { c: '#36383a', c2: '#ebf9e2', c3: '#acacad' }, { tod: ['dusk', 'night'], lv: 3, blurb: 'Curls up its tail like a small scorpion.' }),
  _gbB('click-beetle', 'Click beetle', 'beetle', 'common', ['lawn', 'ground'], 1, 'crawl', 5, { c: '#8f3519', c2: '#cc9969', c3: '#481b00' }, { seasons: ['spring', 'summer'], lv: 3, blurb: 'Lay it on its back. It flips with a click.' }),
  _gbB('soldier-beetle', 'Soldier beetle', 'longhorn', 'common', ['flower'], 1, 'crawl', 4, { c: '#882e14', c2: '#050406', c3: '#b69e84' }, { seasons: ['summer'], lv: 5, blurb: 'Red, on every hogweed, on patrol.' }),
  _gbB('violet-ground-beetle', 'Violet ground beetle', 'beetle', 'common', ['ground'], 1, 'crawl', 3, { c: '#6c31b4', c2: '#001000', c3: '#aba2cf', p: 'metal' }, { tod: ['night'], lv: 4, blurb: 'Black, with a purple hem, running late.' }),
  _gbB('mint-beetle', 'Mint beetle', 'beetle', 'common', ['flower'], 1, 'crawl', 3, { c: '#34a756', c2: '#f4fae2', c3: '#9ccfbe', p: 'metal' }, { seasons: ['summer'], lv: 5, needs: { plant: 'mint' }, blurb: 'Comes for the mint and matches it.' }),
  _gbB('rosemary-beetle', 'Rosemary beetle', 'beetle', 'common', ['flower'], 1, 'crawl', 5, { c: '#4c2a94', c2: '#518a32', c3: '#a98ebb', p: 'stripe' }, { seasons: ['spring', 'summer', 'autumn'], lv: 5, needs: { plant: 'rosemary' }, blurb: 'Stripy as a boiled sweet.' }),
  _gbB('pollen-beetle', 'Pollen beetle', 'beetle', 'common', ['flower'], 1, 'crawl', 4, { c: '#6f7c6a', c2: '#11000f', c3: '#b9b0b6' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 3, blurb: 'Very small and very dusty.' }),
  _gbB('vine-weevil', 'Vine weevil', 'weevil', 'common', ['ground', 'flower'], 1, 'crawl', 4, { c: '#25302b', c2: '#e4e3db', c3: '#9c948c' }, { tod: ['night'], lv: 4, blurb: 'A long nose, and your pot plants are in danger.' }),
  _gbB('nut-weevil', 'Nut weevil', 'weevil', 'common', ['tree'], 1, 'crawl', 4, { c: '#c0af7c', c2: '#f8e8ce', c3: '#8c7e4e' }, { seasons: ['autumn'], lv: 3, blurb: 'That nose is longer than its whole body.' }),
  _gbB('acorn-weevil', 'Acorn weevil', 'weevil', 'common', ['tree', 'woods'], 1, 'crawl', 4, { c: '#623f27', c2: '#d7dfd3', c3: '#b6a68a', p: 'speckle' }, { seasons: ['autumn'], lv: 5, blurb: 'Drills acorns with its absurd face.' }),
  _gbB('wasp-beetle', 'Wasp beetle', 'longhorn', 'uncommon', ['tree', 'flower'], 1, 'crawl', 15, { c: '#142215', c2: '#efd239', c3: '#9c989f', p: 'band' }, { tod: ['day'], seasons: ['summer'], lv: 3, size: 1.02, blurb: 'Dressed as a wasp and walks like one, too.' }),
  _gbB('musk-beetle', 'Musk beetle', 'longhorn', 'uncommon', ['tree', 'woods'], 2, 'crawl', 12, { c: '#538d31', c2: '#e3d78b', c3: '#a1caa1', p: 'metal' }, { seasons: ['summer'], lv: 4, size: 1.02, blurb: 'Green and smells of old-fashioned perfume.' }),
  _gbB('minotaur-beetle', 'Minotaur beetle', 'rhino', 'uncommon', ['ground', 'woods'], 1, 'crawl', 11, { c: '#100c29', c2: '#2263cb', c3: '#7f8b89' }, { seasons: ['spring', 'autumn'], lv: 3, size: 1.02, blurb: 'Three horns, and a family to feed.' }),
  _gbB('oil-beetle', 'Oil beetle', 'beetle', 'uncommon', ['ground'], 2, 'crawl', 15, { c: '#0c1826', c2: '#1452bf', c3: '#90829a' }, { seasons: ['spring'], lv: 6, size: 1.02, blurb: 'Big, soft and blue-black, and very slow.' }),
  _gbB('green-tiger-beetle', 'Green tiger beetle', 'beetle', 'uncommon', ['ground'], 1, 'crawl', 14, { c: '#659f51', c2: '#eaf29e', c3: '#b3dcac', p: 'spots' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 7, size: 1.02, blurb: 'The fastest legs in the book, and it knows.' }),
  _gbB('cockchafer', 'Cockchafer', 'scarab', 'uncommon', ['tree', 'light'], 1, 'crawl', 14, { c: '#836442', c2: '#edf8e1', c3: '#c2b7a5', p: 'fur' }, { tod: ['dusk', 'night'], seasons: ['spring'], lv: 3, size: 1.02, blurb: 'Bumbles into your window on May evenings.' }),
  _gbB('glow-worm', 'Glow-worm', 'firefly', 'uncommon', ['lawn', 'woods'], 2, 'hover', 12, { c: '#433345', c2: '#ebd830', c3: '#a4a8a2' }, { tod: ['night'], seasons: ['summer'], lv: 3, size: 1.02, blurb: 'A beetle, in fact, with a lamp on.' }),
  _gbB('burying-beetle', 'Burying beetle', 'beetle', 'uncommon', ['ground'], 2, 'crawl', 12, { c: '#201121', c2: '#ef871d', c3: '#929793', p: 'band' }, { tod: ['night'], seasons: ['summer'], lv: 6, size: 1.02, blurb: 'Black and orange, a tidy undertaker.' }),
  _gbB('tortoise-beetle', 'Tortoise beetle', 'shield', 'uncommon', ['flower'], 1, 'crawl', 15, { c: '#56b14c', c2: '#f0eeae', c3: '#b9d8a7' }, { seasons: ['summer'], lv: 3, size: 1.02, blurb: 'Hides everything under its own little roof.' }),
  _gbB('lily-beetle', 'Lily beetle', 'beetle', 'uncommon', ['flower'], 2, 'crawl', 13, { c: '#d62913', c2: '#151923', c3: '#f6a89d' }, { seasons: ['spring', 'summer'], lv: 8, size: 1.02, needs: { plant: 'lily' }, blurb: 'Bright red, and your lilies know it.' }),
  _gbB('red-headed-cardinal', 'Red-headed cardinal', 'beetle', 'uncommon', ['woods', 'flower'], 2, 'crawl', 14, { c: '#e76c17', c2: '#231324', c3: '#fab9a0' }, { seasons: ['spring', 'summer'], lv: 8, size: 1.02, blurb: 'Bright red, and lives under the bark.' }),
  _gbB('longhorn-timberman', 'Longhorn timberman', 'longhorn', 'rare', ['woods', 'tree'], 2, 'crawl', 45, { c: '#d0c3c2', c2: '#1b1b1a', c3: '#6c7a65', p: 'speckle' }, { seasons: ['winter', 'spring'], lv: 11, size: 1.12, blurb: 'Its feelers are four times its length. Good luck.' }),
  _gbB('rhinoceros-beetle', 'Rhinoceros beetle', 'rhino', 'rare', ['woods', 'ground'], 3, 'crawl', 39, { c: '#412a1d', c2: '#cf9d66', c3: '#2b1c18' }, { tod: ['dusk', 'night'], seasons: ['summer'], lv: 6, size: 1.12, blurb: 'One great horn, and a very calm stare.' }),
  _gbB('scarab', 'Scarab', 'scarab', 'rare', ['ground', 'flower'], 3, 'crawl', 49, { c: '#dab836', c2: '#fae3a7', c3: '#f4da9e', p: 'metal' }, { tod: ['day'], seasons: ['summer'], lv: 12, size: 1.12, blurb: 'The Egyptians thought it rolled the sun.' }),
  _gbB('jewel-beetle', 'Jewel beetle', 'beetle', 'rare', ['tree', 'flower'], 2, 'crawl', 35, { c: '#b61330', c2: '#528c30', c3: '#c99190', p: 'metal' }, { tod: ['day'], seasons: ['summer'], lv: 5, size: 1.12, blurb: 'A jewel with legs, but you cannot wear it.' }),
  _gbB('hercules-beetle', 'Hercules beetle', 'rhino', 'rare', ['woods'], 2, 'crawl', 40, { c: '#eddc43', c2: '#1e2417', c3: '#fff5b0', p: 'metal' }, { tod: ['night'], seasons: ['summer'], lv: 9, size: 1.12, needs: { moon: ['waxing', 'full'] }, blurb: 'Can lift a great deal more than you. Do not make it.' }),
  _gbB('rainbow-scarab', 'Rainbow scarab', 'scarab', 'rare', ['ground', 'woods'], 2, 'crawl', 41, { c: '#aa0c20', c2: '#469a34', c3: '#d38f98', p: 'metal' }, { seasons: ['summer'], rain: 1, lv: 11, size: 1.12, blurb: 'Every colour of a puddle with oil on it.' }),
  _gbB('giraffe-weevil', 'Giraffe weevil', 'weevil', 'rare', ['woods', 'tree'], 2, 'crawl', 40, { c: '#c72d3e', c2: '#201822', c3: '#ef969e' }, { tod: ['day'], seasons: ['summer'], lv: 9, size: 1.12, blurb: 'A neck, for no sensible reason.' }),
  _gbB('sawyer-beetle', 'Sawyer beetle', 'longhorn', 'rare', ['woods', 'tree'], 2, 'crawl', 45, { c: '#47281d', c2: '#caa36f', c3: '#321f06' }, { tod: ['night'], seasons: ['summer'], lv: 11, size: 1.12, blurb: 'You can hear it chewing from outside the log.' }),
  _gbB('ember-beetle', 'Ember beetle', 'beetle', 'epic', ['ground'], 3, 'crawl', 88, { c: '#270a00', c2: '#ca1808', c3: '#888f87', p: 'metal' }, { tod: ['night'], lv: 8, size: 1.25, needs: { decor: 'fire-pit' }, blurb: 'Glows faintly near a fire pit.' }),
  _gbB('goliath-beetle', 'Goliath beetle', 'scarab', 'epic', ['woods'], 4, 'crawl', 116, { c: '#dfdfda', c2: '#080b0d', c3: '#ddede7', p: 'band' }, { tod: ['day'], seasons: ['summer'], lv: 9, size: 1.25, needs: { net: 3 }, blurb: 'Heavy as a plum, and flies. Somehow.' }),
  _gbB('golden-stag', 'Golden stag', 'stag', 'epic', ['woods', 'tree'], 3, 'crawl', 106, { c: '#e0ae3b', c2: '#f5e2a0', c3: '#f9e0a0', p: 'metal' }, { tod: ['night'], seasons: ['summer'], lv: 8, size: 1.25, needs: { moon: ['full'] }, blurb: 'Antlers of old gold, and a very slow temper.' }),
  _gbB('titan-longhorn', 'Titan longhorn', 'longhorn', 'epic', ['woods'], 4, 'crawl', 96, { c: '#432f14', c2: '#d1a273', c3: '#2e1113' }, { tod: ['night'], seasons: ['summer'], lv: 15, size: 1.25, needs: { net: 3 }, blurb: 'A beetle you could mistake for a small dog.' }),
  _gbB('mirror-beetle', 'Mirror beetle', 'beetle', 'epic', ['flower'], 3, 'crawl', 121, { c: '#e5ddf0', c2: '#2575da', c3: '#edf8ff', p: 'metal' }, { tod: ['dawn'], seasons: ['spring'], lv: 14, size: 1.25, needs: { rain: false }, blurb: 'It reflects your net coming. Please be sneaky.' }),
  _gbB('violin-beetle', 'Violin beetle', 'shield', 'epic', ['woods', 'tree'], 3, 'crawl', 128, { c: '#4a2a21', c2: '#cd9074', c3: '#341d07' }, { tod: ['night'], rain: 1, lv: 12, size: 1.25, blurb: 'Shaped like a violin, and flat as one too.' }),
  _gbB('king-stag', 'King Stag', 'stag', 'legendary', ['woods', 'tree'], 5, 'crawl', 263, { c: '#282343', c2: '#ce2613', c3: '#98a6a7' }, { tod: ['night'], seasons: ['summer'], lv: 18, size: 1.4, needs: { moon: ['new'], net: 3, chance: 40 }, blurb: 'The great one. It comes to the old woods under a new moon.' }),
  _gbB('sun-scarab', 'Sun Scarab', 'scarab', 'legendary', ['ground', 'flower'], 5, 'crawl', 286, { c: '#fd9a22', c2: '#152116', c3: '#f9daa3', p: 'metal' }, { tod: ['day'], seasons: ['summer'], lv: 18, size: 1.4, needs: { rain: false, moon: ['full'], chance: 40 }, blurb: 'It rolls something bright, and will not say what.' }),
  _gbB('lesser-stag', 'Lesser stag', 'stag', 'common', ['woods', 'ground'], 1, 'crawl', 3, { c: '#1e2d32', c2: '#e8d8da', c3: '#948c90' }, { tod: ['dusk', 'night'], seasons: ['summer'], lv: 3, blurb: 'A stag beetle without the airs.' }),
  _gbB('woodlouse', 'Woodlouse', 'woodlouse', 'common', ['ground', 'woods'], 1, 'crawl', 4, { c: '#94938e', c2: '#161c12', c3: '#c9c6c5' }, { lv: 1, blurb: 'Has fourteen legs, and thinks you are too bright.' }),
  _gbB('pill-bug', 'Pill bug', 'woodlouse', 'common', ['ground'], 1, 'crawl', 4, { c: '#485b6c', c2: '#1465c8', c3: '#ab9faa' }, { lv: 3, blurb: 'Rolls up, and that is the plan, start to finish.' }),
  _gbB('black-ant', 'Black ant', 'ant', 'common', ['ground', 'lawn'], 1, 'crawl', 4, { c: '#374046', c2: '#f6f4e1', c3: '#ad9fa4' }, { seasons: ['spring', 'summer', 'autumn'], lv: 1, size: 0.75, blurb: 'You will never see just one.' }),
  _gbB('red-ant', 'Red ant', 'ant', 'common', ['ground', 'lawn'], 1, 'crawl', 5, { c: '#8e2e0d', c2: '#000d08', c3: '#bb9b8e' }, { seasons: ['spring', 'summer', 'autumn'], lv: 2, size: 0.75, blurb: 'Quick to take offence.' }),
  _gbB('earwig', 'Earwig', 'earwig', 'common', ['ground', 'flower'], 1, 'crawl', 3, { c: '#3c2106', c2: '#aa8658', c3: '#110000' }, { tod: ['dusk', 'night'], seasons: ['summer', 'autumn'], lv: 2, blurb: 'Wonderful mother. Never been in an ear.' }),
  _gbB('centipede', 'Centipede', 'centipede', 'common', ['ground'], 1, 'crawl', 4, { c: '#a04726', c2: '#d29e7f', c3: '#5a3109' }, { tod: ['night'], lv: 4, blurb: 'Nowhere near a hundred. Fifteen pairs.' }),
  _gbB('millipede', 'Millipede', 'centipede', 'common', ['ground'], 1, 'crawl', 4, { c: '#212a34', c2: '#deba1f', c3: '#988e95', p: 'stripe' }, { tod: ['dusk', 'night'], lv: 4, blurb: 'Nowhere near a thousand either.' }),
  _gbB('garden-slug', 'Garden slug', 'slug', 'common', ['ground', 'lawn'], 1, 'crawl', 4, { c: '#4a2a26', c2: '#cd9063', c3: '#341d0c' }, { tod: ['dawn', 'dusk', 'night'], rain: 1, lv: 2, blurb: 'Would like to discuss your lettuces.' }),
  _gbB('earthworm', 'Earthworm', 'worm', 'common', ['ground', 'lawn'], 1, 'crawl', 4, { c: '#d87491', c2: '#f8e4df', c3: '#b23c62' }, { rain: 1, lv: 1, size: 0.95, blurb: 'Comes up when it rains. A gardener’s best friend.' }),
  _gbB('banded-snail', 'Banded snail', 'snail', 'common', ['ground', 'flower'], 1, 'crawl', 4, { c: '#e2cc40', c2: '#674c2b', c3: '#e0d49b', p: 'stripe' }, { rain: 1, lv: 5, blurb: 'No two have the same stripes.' }),
  _gbB('cockroach', 'Cockroach', 'roach', 'common', ['ground'], 1, 'crawl', 4, { c: '#3b2006', c2: '#be8658', c3: '#110204' }, { tod: ['night'], lv: 4, blurb: 'Would survive you, and it has made its peace with that.' }),
  _gbB('silverfish', 'Silverfish', 'centipede', 'common', ['ground'], 1, 'crawl', 4, { c: '#81858f', c2: '#d8e6cd', c3: '#545a51' }, { tod: ['night'], lv: 4, blurb: 'Eats the glue in your books. Not the words.' }),
  _gbB('flat-backed-spider', 'Flat-backed spider', 'spider', 'common', ['tree', 'ground'], 1, 'crawl', 4, { c: '#d2b582', c2: '#f5eebf', c3: '#8a7358' }, { lv: 5, blurb: 'Lives in every crack, quietly.' }),
  _gbB('money-spider', 'Money spider', 'spider', 'common', ['lawn', 'flower'], 1, 'crawl', 5, { c: '#2d2521', c2: '#e2e5de', c3: '#8f8998' }, { seasons: ['summer', 'autumn'], lv: 1, blurb: 'Land on you, and you are rich, they say.' }),
  _gbB('wolf-spider', 'Wolf spider', 'spider', 'common', ['ground'], 1, 'crawl', 4, { c: '#cbab87', c2: '#eee4c4', c3: '#827959', p: 'speckle' }, { seasons: ['spring', 'summer'], lv: 3, blurb: 'Hunts on foot, and carries her babies.' }),
  _gbB('harvestman', 'Harvestman', 'spider', 'common', ['tree', 'ground'], 1, 'crawl', 3, { c: '#765537', c2: '#6b4b26', c3: '#acb0a3' }, { tod: ['dusk', 'night'], seasons: ['autumn'], lv: 4, blurb: 'Not a spider at all. Eight very long reasons to be confused.' }),
  _gbB('aphid', 'Aphid', 'mite', 'common', ['flower'], 1, 'crawl', 4, { c: '#73d3af', c2: '#e9f9ea', c3: '#3b9765' }, { seasons: ['spring', 'summer'], lv: 1, size: 0.7, blurb: 'There will be more by teatime.' }),
  _gbB('red-spider-mite', 'Red spider mite', 'mite', 'common', ['flower', 'tree'], 1, 'crawl', 4, { c: '#b71222', c2: '#e8949c', c3: '#5e020f' }, { seasons: ['summer'], lv: 2, size: 0.7, blurb: 'Too small to see, and not too small to net, somehow.' }),
  _gbB('velvet-mite', 'Velvet mite', 'mite', 'uncommon', ['ground'], 2, 'crawl', 13, { c: '#d0233f', c2: '#f7b1b1', c3: '#78171b', p: 'fur' }, { rain: 1, lv: 4, size: 0.71, blurb: 'A tiny red velvet cushion, out after rain.' }),
  _gbB('leopard-slug', 'Leopard slug', 'slug', 'uncommon', ['ground', 'woods'], 1, 'crawl', 14, { c: '#cdcdb9', c2: '#181012', c3: '#7e6e72', p: 'spots' }, { tod: ['night'], rain: 1, lv: 5, size: 1.02, blurb: 'A very handsome slug, and I mean that.' }),
  _gbB('tiger-slug', 'Tiger slug', 'slug', 'uncommon', ['ground'], 1, 'crawl', 12, { c: '#edd94a', c2: '#1e221f', c3: '#fff2b7', p: 'stripe' }, { tod: ['dusk', 'night'], rain: 1, lv: 3, size: 1.02, blurb: 'Yellow and black, and moving very slowly at you.' }),
  _gbB('roman-snail', 'Roman snail', 'snail', 'uncommon', ['ground', 'flower'], 1, 'crawl', 14, { c: '#d9cdb8', c2: '#edeed6', c3: '#b4a07c' }, { seasons: ['spring', 'summer'], rain: 1, lv: 7, size: 1.02, blurb: 'Big enough for a small Roman dinner. Let it go.' }),
  _gbB('glass-snail', 'Glass snail', 'snail', 'uncommon', ['ground', 'woods'], 2, 'crawl', 13, { c: '#d0eae8', c2: '#182212', c3: '#e0eeff' }, { rain: 1, lv: 6, size: 1.02, blurb: 'You can see through its house.' }),
  _gbB('pseudoscorpion', 'Pseudoscorpion', 'scorpion', 'uncommon', ['ground', 'woods'], 1, 'crawl', 14, { c: '#a2432c', c2: '#d4af6f', c3: '#5c2e0f' }, { tod: ['night'], lv: 3, size: 1.02, blurb: 'A scorpion no bigger than a comma.' }),
  _gbB('yellow-tailed-scorpion', 'Yellow-tailed scorpion', 'scorpion', 'uncommon', ['ground'], 2, 'crawl', 13, { c: '#353543', c2: '#e8d13b', c3: '#acaea5' }, { tod: ['night'], seasons: ['summer'], lv: 8, size: 1.02, blurb: 'It lives in the old wall, and stays there.' }),
  _gbB('cross-striped-earwig', 'Cross-striped earwig', 'earwig', 'uncommon', ['ground'], 2, 'crawl', 13, { c: '#e6d02e', c2: '#0d100f', c3: '#e3d49b', p: 'stripe' }, { seasons: ['summer'], lv: 8, size: 1.02, blurb: 'An earwig in football colours.' }),
  _gbB('wasp-spider', 'Wasp spider', 'spider', 'uncommon', ['lawn', 'flower'], 1, 'crawl', 14, { c: '#d8c22e', c2: '#070600', c3: '#e9d08e', p: 'stripe' }, { seasons: ['summer', 'autumn'], lv: 7, size: 1.02, blurb: 'Stripy as a wasp and hangs in a zigzag web.' }),
  _gbB('crab-spider', 'Crab spider', 'spider', 'uncommon', ['flower'], 2, 'crawl', 12, { c: '#d7c533', c2: '#e1e4a5', c3: '#aa9a0f' }, { seasons: ['summer'], lv: 8, size: 1.02, needs: { plant: 'daisy' }, blurb: 'Turns yellow on a yellow flower and waits.' }),
  _gbB('jumping-spider', 'Jumping spider', 'spider', 'uncommon', ['tree', 'ground'], 2, 'crawl', 11, { c: '#202823', c2: '#eae8df', c3: '#978c99', p: 'speckle' }, { tod: ['day'], lv: 8, size: 1.02, blurb: 'Turns to look at you with all its eyes.' }),
  _gbB('nursery-web-spider', 'Nursery web spider', 'spider', 'uncommon', ['flower', 'lawn'], 1, 'crawl', 13, { c: '#afa26d', c2: '#dccdb4', c3: '#7c6044' }, { seasons: ['summer'], lv: 3, size: 1.02, blurb: 'Carries a silk parcel, like a very proud mother.' }),
  _gbB('raft-spider', 'Raft spider', 'spider', 'rare', ['water'], 2, 'crawl', 37, { c: '#522b14', c2: '#c09067', c3: '#271d0f', p: 'stripe' }, { seasons: ['summer'], lv: 9, size: 1.12, blurb: 'Sits on the water with its toes in, fishing.' }),
  _gbB('tarantula', 'Tarantula', 'spider', 'rare', ['ground', 'woods'], 3, 'crawl', 38, { c: '#542d23', c2: '#cd9f6c', c3: '#2a0e0c', p: 'fur' }, { tod: ['night'], seasons: ['summer'], lv: 12, size: 1.12, blurb: 'Eight furry legs, mostly shy.' }),
  _gbB('peacock-spider', 'Peacock spider', 'spider', 'rare', ['lawn', 'flower'], 3, 'crawl', 39, { c: '#88b4d8', c2: '#152023', c3: '#d2e5f2', p: 'ombre' }, { tod: ['day'], seasons: ['spring'], lv: 6, size: 1.12, blurb: 'It dances with its bottom, and it is the best dancer you know.' }),
  _gbB('golden-orb-weaver', 'Golden orb weaver', 'spider', 'rare', ['tree', 'woods'], 3, 'crawl', 40, { c: '#c79f27', c2: '#e7df99', c3: '#e1c18f', p: 'stripe' }, { seasons: ['summer', 'autumn'], lv: 8, size: 1.12, blurb: 'Spins real gold silk, and sits in the middle of it.' }),
  _gbB('stalk-eyed-fly', 'Stalk-eyed fly', 'fly', 'rare', ['woods', 'water'], 3, 'hover', 37, { c: '#d12c42', c2: '#151712', c3: '#cb8d92' }, { rain: 1, lv: 9, size: 0.9, blurb: 'Its eyes are on stalks. So are the arguments.' }),
  _gbB('emperor-scorpion', 'Emperor scorpion', 'scorpion', 'epic', ['woods', 'ground'], 4, 'crawl', 91, { c: '#1a2338', c2: '#3772d1', c3: '#9fa7b0', p: 'metal' }, { tod: ['night'], lv: 11, size: 1.25, needs: { moon: ['full'] }, blurb: 'Glows blue in moonlight, and quite likes it.' }),
  _gbB('giant-centipede', 'Giant centipede', 'centipede', 'epic', ['ground', 'woods'], 3, 'crawl', 99, { c: '#f06225', c2: '#211111', c3: '#eeaf99', p: 'stripe' }, { tod: ['night'], rain: 1, lv: 10, size: 1.25, needs: { net: 3 }, blurb: 'Forty-two legs, and it uses them all at you.' }),
  _gbB('velvet-worm', 'Velvet worm', 'worm', 'epic', ['woods'], 4, 'crawl', 116, { c: '#642260', c2: '#cd99e6', c3: '#291236', p: 'fur' }, { tod: ['night'], rain: 1, lv: 9, size: 1.19, blurb: 'Older than insects, and shoots glue.' }),
  _gbB('ghost-slug', 'Ghost slug', 'slug', 'epic', ['ground'], 3, 'crawl', 114, { c: '#dde1e3', c2: '#100009', c3: '#dbeff0' }, { tod: ['night'], rain: 1, lv: 8, size: 1.25, needs: { moon: ['new'] }, blurb: 'Pale as a candle, and only comes at new moon.' }),
  _gbB('the-old-snail', 'The Old Snail', 'snail', 'legendary', ['ground', 'woods'], 5, 'crawl', 258, { c: '#4f6935', c2: '#e2b92d', c3: '#b6c0a8', p: 'ring' }, { tod: ['night'], seasons: ['spring'], rain: 1, lv: 16, size: 1.4, needs: { moon: ['full'], chance: 40 }, blurb: 'A shell older than the house. It is going somewhere.' }),
  _gbB('bush-cricket', 'Bush cricket', 'katydid', 'common', ['lawn', 'flower'], 2, 'perch', 4, { c: '#66b241', c2: '#7c5542', c3: '#b3d5ae' }, { tod: ['dusk', 'night'], seasons: ['summer', 'autumn'], lv: 3, blurb: 'Its feelers are longer than your finger.' }),
  _gbB('oak-bush-cricket', 'Oak bush cricket', 'katydid', 'common', ['tree'], 2, 'perch', 4, { c: '#83e0a8', c2: '#7e5436', c3: '#c1e9e1' }, { tod: ['dusk', 'night'], seasons: ['summer', 'autumn'], lv: 3, blurb: 'Sings by drumming its foot. On the oak.' }),
  _gbB('field-grasshopper', 'Field grasshopper', 'hopper', 'common', ['lawn'], 1, 'perch', 4, { c: '#c9ae85', c2: '#f6efcb', c3: '#818146' }, { seasons: ['summer', 'autumn'], lv: 1, blurb: 'Brown, and bounces away with confidence.' }),
  _gbB('common-froghopper', 'Common froghopper', 'hopper', 'common', ['flower', 'lawn'], 2, 'perch', 4, { c: '#332402', c2: '#ac8260', c3: '#1e0600' }, { seasons: ['spring', 'summer'], lv: 5, blurb: 'The spit on your lavender is its doing.' }),
  _gbB('house-cricket', 'House cricket', 'hopper', 'common', ['ground', 'light'], 2, 'perch', 3, { c: '#b77f35', c2: '#442a00', c3: '#d4d2ab' }, { tod: ['night'], lv: 3, blurb: 'Lives by the fire and sings about it.' }),
  _gbB('mole-cricket', 'Mole cricket', 'roach', 'uncommon', ['ground'], 1, 'crawl', 15, { c: '#2e1f12', c2: '#b1854f', c3: '#180000', p: 'fur' }, { tod: ['night'], seasons: ['spring', 'summer'], rain: 1, lv: 5, size: 1.02, blurb: 'Digs with shovels for hands.' }),
  _gbB('great-green-bush-cricket', 'Great green bush cricket', 'katydid', 'uncommon', ['lawn', 'tree'], 3, 'perch', 13, { c: '#209445', c2: '#e0e7d0', c3: '#88bc97' }, { tod: ['dusk', 'night'], seasons: ['summer'], lv: 4, size: 1.02, blurb: 'Long as your thumb, and it does bite.' }),
  _gbB('speckled-bush-cricket', 'Speckled bush cricket', 'katydid', 'uncommon', ['flower', 'lawn'], 3, 'perch', 15, { c: '#44962e', c2: '#6f4f2f', c3: '#a7be9e', p: 'speckle' }, { seasons: ['summer'], lv: 6, size: 1.02, blurb: 'Peppered with tiny black dots.' }),
  _gbB('leafhopper', 'Leafhopper', 'hopper', 'uncommon', ['flower', 'lawn'], 3, 'perch', 12, { c: '#098897', c2: '#8de4cb', c3: '#03406e', p: 'stripe' }, { tod: ['day'], seasons: ['summer'], lv: 6, size: 1.02, blurb: 'Bright as paint, and gone with a click.' }),
  _gbB('rose-leafhopper', 'Rose leafhopper', 'hopper', 'uncommon', ['flower'], 3, 'perch', 11, { c: '#e8efd6', c2: '#fff4eb', c3: '#c3ad85' }, { seasons: ['summer'], lv: 8, size: 1.02, needs: { plant: 'rose' }, blurb: 'Comes to roses, leaves pale little dots.' }),
  _gbB('treehopper', 'Treehopper', 'hopper', 'uncommon', ['tree'], 3, 'perch', 13, { c: '#129d3d', c2: '#0f000e', c3: '#8fc5a4' }, { seasons: ['summer'], lv: 6, size: 1.02, blurb: 'Its back looks like a thorn.' }),
  _gbB('thorn-bug', 'Thorn bug', 'hopper', 'rare', ['tree', 'woods'], 4, 'perch', 51, { c: '#373a38', c2: '#d03710', c3: '#adaeab' }, { seasons: ['summer'], lv: 10, size: 1.12, needs: { plant: 'rose' }, blurb: 'Sits on a rose stem, pretending. Pretty convincingly.' }),
  _gbB('locust', 'Locust', 'hopper', 'rare', ['lawn'], 4, 'perch', 52, { c: '#cfbc8e', c2: '#f2e0cc', c3: '#877a50', p: 'band' }, { tod: ['day'], seasons: ['summer', 'autumn'], lv: 12, size: 1.12, blurb: 'Alone, it is rather nice. Alone, please.' }),
  _gbB('lantern-fly', 'Lantern fly', 'cicada', 'rare', ['tree', 'woods'], 4, 'perch', 42, { c: '#f8e543', c2: '#db2724', c3: '#f6eeb3' }, { seasons: ['summer'], lv: 12, size: 1.12, blurb: 'It has a great painted lantern where its nose should be.' }),
  _gbB('periodical-cicada', 'Periodical cicada', 'cicada', 'epic', ['tree', 'woods'], 5, 'perch', 109, { c: '#242b2d', c2: '#bd1204', c3: '#9b8e8e' }, { tod: ['day'], seasons: ['summer'], lv: 11, size: 1.25, needs: { chance: 3 }, blurb: 'Sleeps underground for seventeen years, then shouts.' }),
  _gbB('rainbow-grasshopper', 'Rainbow grasshopper', 'hopper', 'epic', ['lawn', 'woods'], 4, 'perch', 92, { c: '#80b7e4', c2: '#171622', c3: '#cad3e8', p: 'stripe' }, { tod: ['day'], seasons: ['summer'], lv: 12, size: 1.25, needs: { rain: false }, blurb: 'Painted in every colour by somebody in a hurry.' }),
  _gbB('singing-cicada-queen', 'Singing Cicada Queen', 'cicada', 'legendary', ['woods', 'tree'], 5, 'perch', 260, { c: '#d4a827', c2: '#dfd398', c3: '#d8c58c' }, { tod: ['dusk'], seasons: ['summer'], lv: 17, size: 1.4, needs: { moon: ['full'], decor: 'wind-chimes', chance: 40 }, blurb: 'Comes out of the ground once. You will hear it first.' }),
  _gbB('giant-walking-stick', 'Giant walking stick', 'stick', 'uncommon', ['woods', 'tree'], 2, 'crawl', 13, { c: '#5cad4c', c2: '#725137', c3: '#bed1a4' }, { seasons: ['summer'], lv: 8, size: 1.33, blurb: 'It has been on that branch all week. So have you.' }),
  _gbB('thorny-stick', 'Thorny stick', 'stick', 'uncommon', ['tree'], 1, 'crawl', 12, { c: '#8e6c51', c2: '#83623f', c3: '#c3c2ba', p: 'speckle' }, { lv: 5, size: 1.33, blurb: 'A stick with spines and a very low profile.' }),
  _gbB('leaf-insect', 'Leaf insect', 'leaf', 'rare', ['tree', 'woods'], 3, 'perch', 44, { c: '#148e46', c2: '#dee8da', c3: '#90c6aa' }, { seasons: ['summer'], lv: 9, size: 1.34, blurb: 'A leaf with legs. Do not put it in the compost.' }),
  _gbB('dead-leaf-mantis', 'Dead leaf mantis', 'leaf', 'rare', ['woods'], 4, 'perch', 39, { c: '#aa6532', c2: '#f6b664', c3: '#6a220c' }, { seasons: ['autumn'], lv: 6, size: 1.34, blurb: 'An autumn leaf with terrible intentions.' }),
  _gbB('orchid-mantis', 'Orchid mantis', 'mantis', 'rare', ['flower'], 4, 'perch', 46, { c: '#d2627f', c2: '#4c963f', c3: '#d8b3bf' }, { seasons: ['summer'], lv: 6, size: 1.46, needs: { plant: 'orchid' }, blurb: 'Looks like an orchid. Bees should be more careful.' }),
  _gbB('ghost-mantis', 'Ghost mantis', 'mantis', 'rare', ['woods', 'tree'], 4, 'perch', 40, { c: '#807b47', c2: '#805441', c3: '#cbc0b3' }, { tod: ['dusk'], lv: 8, size: 1.46, blurb: 'Crumpled, brown and looks already dead. Tactics.' }),
  _gbB('flower-mantis', 'Flower mantis', 'mantis', 'uncommon', ['flower'], 3, 'perch', 11, { c: '#f1e0cf', c2: '#fbfae4', c3: '#b6af90' }, { seasons: ['summer'], lv: 6, size: 1.33, needs: { plant: 'daisy' }, blurb: 'Sits in the daisies with its hands together.' }),
  _gbB('moss-mantis', 'Moss mantis', 'mantis', 'uncommon', ['tree', 'woods'], 2, 'perch', 12, { c: '#4a5b33', c2: '#9cad6d', c3: '#18250e' }, { seasons: ['spring', 'summer'], lv: 5, size: 1.33, blurb: 'You have walked past it four times.' }),
  _gbB('giant-stick', 'Giant stick', 'stick', 'epic', ['woods'], 4, 'crawl', 126, { c: '#3c592e', c2: '#daa11d', c3: '#a4b48f' }, { tod: ['night'], lv: 11, size: 1.63, needs: { net: 3 }, blurb: 'Long as your arm, and just as quiet.' }),
  _gbB('devils-flower-mantis', 'Devil’s flower mantis', 'mantis', 'epic', ['flower', 'woods'], 5, 'perch', 89, { c: '#b297e6', c2: '#fa8d1c', c3: '#e3d7eb' }, { tod: ['day'], seasons: ['summer'], lv: 9, size: 1.63, blurb: 'Holds up its arms and flashes. It works on you, too.' }),
  _gbB('the-walking-branch', 'The Walking Branch', 'stick', 'legendary', ['woods', 'tree'], 5, 'crawl', 238, { c: '#7e6043', c2: '#694f28', c3: '#b3b696' }, { tod: ['night'], seasons: ['autumn'], lv: 17, size: 1.82, needs: { moon: ['new'], net: 3, chance: 40 }, blurb: 'The oldest stick in the woods. It may be a tree.' }),
  _gbB('water-boatman', 'Water boatman', 'boatman', 'common', ['water'], 2, 'hover', 4, { c: '#927c49', c2: '#7d5644', c3: '#c8c2b6' }, { seasons: ['spring', 'summer', 'autumn'], lv: 1, blurb: 'Rows along upside down, and sees nothing odd.' }),
  _gbB('backswimmer', 'Backswimmer', 'boatman', 'common', ['water'], 1, 'hover', 4, { c: '#e3d1bf', c2: '#e2dedd', c3: '#a9a46e', p: 'stripe' }, { seasons: ['spring', 'summer'], lv: 4, blurb: 'Rows on its back and bites when lifted.' }),
  _gbB('whirligig', 'Whirligig', 'boatman', 'common', ['water'], 2, 'hover', 4, { c: '#182740', c2: '#3576da', c3: '#9d95a3', p: 'metal' }, { tod: ['day'], seasons: ['summer'], lv: 5, blurb: 'Spins in circles all day and is very happy.' }),
  _gbB('mayfly', 'Mayfly', 'mayfly', 'common', ['water', 'light'], 2, 'hover', 3, { c: '#edecd4', c2: '#f7f1e9', c3: '#c8aa83' }, { tod: ['dusk'], seasons: ['spring', 'summer'], lv: 5, blurb: 'It has one day. Do not hold it up.' }),
  _gbB('caddis-fly', 'Caddis fly', 'mayfly', 'common', ['water', 'light'], 2, 'hover', 5, { c: '#836a47', c2: '#835942', c3: '#cdc0b0', p: 'fur' }, { tod: ['dusk', 'night'], seasons: ['spring', 'summer'], lv: 3, blurb: 'As a child it built a house out of pebbles.' }),
  _gbB('pond-olive', 'Pond olive', 'mayfly', 'common', ['water'], 1, 'hover', 4, { c: '#65ba92', c2: '#d0e9d7', c3: '#2d7e5d' }, { seasons: ['spring', 'summer'], lv: 2, blurb: 'Trout have whole opinions about this one.' }),
  _gbB('beautiful-demoiselle', 'Beautiful demoiselle', 'dragonfly', 'uncommon', ['water', 'flower'], 2, 'perch', 15, { c: '#243fa3', c2: '#010e02', c3: '#8ca7d2', p: 'slim' }, { tod: ['day'], seasons: ['summer'], lv: 5, size: 1.22, blurb: 'Metallic blue, and dances to get attention.' }),
  _gbB('banded-demoiselle', 'Banded demoiselle', 'dragonfly', 'uncommon', ['water'], 3, 'perch', 15, { c: '#26a0b0', c2: '#aae7e3', c3: '#0b5871', p: 'band' }, { tod: ['day'], seasons: ['summer'], lv: 8, size: 1.22, blurb: 'A dark band on every wing, and a flutter.' }),
  _gbB('large-red-damselfly', 'Large red damselfly', 'dragonfly', 'uncommon', ['water', 'flower'], 2, 'perch', 12, { c: '#bb0a26', c2: '#000b0b', c3: '#ce899b', p: 'slim' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 7, size: 1.22, blurb: 'Red as a pin, and the first one of spring.' }),
  _gbB('common-darter', 'Common darter', 'dragonfly', 'uncommon', ['water', 'lawn'], 3, 'perch', 11, { c: '#e15101', c2: '#080e0d', c3: '#deaf86' }, { tod: ['day'], seasons: ['summer', 'autumn'], lv: 6, size: 1.22, blurb: 'Rests on your warm path, and leaves when you look.' }),
  _gbB('broad-bodied-chaser', 'Broad-bodied chaser', 'dragonfly', 'uncommon', ['water'], 2, 'perch', 11, { c: '#5baeda', c2: '#dabf1f', c3: '#b0cce0', p: 'big' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 7, size: 1.22, blurb: 'Fat, blue and very sure of itself.' }),
  _gbB('brown-hawker', 'Brown hawker', 'dragonfly', 'uncommon', ['water', 'woods'], 2, 'perch', 12, { c: '#401e00', c2: '#ae8451', c3: '#150000', p: 'big' }, { tod: ['dusk'], seasons: ['summer'], lv: 5, size: 1.22, blurb: 'Amber wings, and an evening patrol.' }),
  _gbB('great-diving-beetle', 'Great diving beetle', 'boatman', 'rare', ['water'], 3, 'hover', 35, { c: '#290e00', c2: '#100603', c3: '#8a7e83' }, { tod: ['night'], rain: 1, lv: 5, size: 1.12, blurb: 'Gold-edged, and will take on a fish.' }),
  _gbB('water-scorpion', 'Water scorpion', 'scorpion', 'rare', ['water'], 2, 'crawl', 43, { c: '#866850', c2: '#7b5e3e', c3: '#d1c3a7' }, { seasons: ['summer'], lv: 7, size: 1.12, blurb: 'Breathes through its tail and lurks.' }),
  _gbB('giant-water-bug', 'Giant water bug', 'roach', 'rare', ['water'], 3, 'crawl', 38, { c: '#443714', c2: '#d29473', c3: '#2f1812' }, { tod: ['night'], seasons: ['summer'], lv: 12, size: 1.12, blurb: 'Dad carries the eggs on his back. Respect.' }),
  _gbB('silver-water-beetle', 'Silver water beetle', 'boatman', 'rare', ['water'], 3, 'hover', 40, { c: '#cccde2', c2: '#2165cd', c3: '#d4e8e1', p: 'metal' }, { seasons: ['spring', 'summer'], lv: 7, size: 1.12, needs: { rain: false }, blurb: 'Takes down a silver bubble to breathe.' }),
  _gbB('golden-ringed-dragonfly', 'Golden-ringed dragonfly', 'dragonfly', 'rare', ['water', 'woods'], 4, 'perch', 44, { c: '#e8db45', c2: '#241c11', c3: '#faf5b2', p: 'big' }, { tod: ['day'], seasons: ['summer'], lv: 10, size: 1.34, blurb: 'Black and gold, like an expensive pen.' }),
  _gbB('ruby-meadowhawk', 'Ruby meadowhawk', 'dragonfly', 'rare', ['water', 'lawn'], 3, 'perch', 35, { c: '#ac1422', c2: '#ddd9d6', c3: '#d49297' }, { seasons: ['autumn'], lv: 5, size: 1.34, needs: { rain: false }, blurb: 'A red dart over the dry grass.' }),
  _gbB('norfolk-hawker', 'Norfolk hawker', 'dragonfly', 'rare', ['water'], 4, 'perch', 45, { c: '#5ba041', c2: '#715841', c3: '#bedcb1', p: 'big' }, { seasons: ['summer'], lv: 12, size: 1.34, needs: { decor: 'mini-pond' }, blurb: 'Green eyes and very particular about water.' }),
  _gbB('glass-lacewing', 'Glass lacewing', 'lacewing', 'common', ['flower', 'light'], 1, 'perch', 4, { c: '#7ad3aa', c2: '#e5ffef', c3: '#2e9c63', p: 'glass' }, { tod: ['dusk', 'night'], seasons: ['summer'], lv: 4, blurb: 'Gold eyes and wings like a stained window.' }),
  _gbB('green-lacewing', 'Green lacewing', 'lacewing', 'common', ['flower', 'tree'], 2, 'perch', 4, { c: '#1f9a4f', c2: '#dfd7da', c3: '#87c2a1' }, { seasons: ['spring', 'summer'], lv: 5, blurb: 'Eats greenfly by the hundred, looking fragile.' }),
  _gbB('antlion', 'Antlion', 'lacewing', 'uncommon', ['ground', 'light'], 2, 'perch', 12, { c: '#c3b47c', c2: '#f0dfc2', c3: '#8f824f' }, { tod: ['night'], seasons: ['summer'], lv: 5, size: 1.02, blurb: 'Its children dig the funnel. It just flutters.' }),
  _gbB('owlfly', 'Owlfly', 'lacewing', 'rare', ['woods', 'light'], 3, 'perch', 43, { c: '#e7d64d', c2: '#181f22', c3: '#faf4a9', p: 'eyes' }, { tod: ['dusk'], seasons: ['summer'], lv: 7, size: 1.12, blurb: 'Clubbed feelers and a very awake stare.' }),
  _gbB('spoonwing', 'Spoonwing', 'lacewing', 'epic', ['flower'], 5, 'perch', 102, { c: '#7daeeb', c2: '#f4f0ed', c3: '#bcddee', p: 'tails' }, { tod: ['day'], seasons: ['summer'], lv: 13, size: 1.25, blurb: 'Two long spoons trail behind every wing.' }),
  _gbB('blue-emperor', 'Blue emperor', 'dragonfly', 'epic', ['water'], 4, 'perch', 110, { c: '#2557ba', c2: '#171119', c3: '#a1bbe6', p: 'big' }, { tod: ['day'], seasons: ['summer'], lv: 12, size: 1.5, needs: { net: 3 }, blurb: 'Patrols the whole lake and answers to nobody.' }),
  _gbB('giant-petaltail', 'Giant petaltail', 'dragonfly', 'epic', ['water', 'woods'], 5, 'perch', 111, { c: '#3c3a38', c2: '#efd630', c3: '#9daeab', p: 'big' }, { tod: ['dawn'], seasons: ['summer'], lv: 13, size: 1.5, blurb: 'An old family. Older than flowers.' }),
  _gbB('silver-mayfly', 'Silver mayfly', 'mayfly', 'epic', ['water'], 5, 'hover', 120, { c: '#dbe4f2', c2: '#2674d3', c3: '#f7faff', p: 'ring' }, { tod: ['dusk'], lv: 13, size: 1.25, needs: { event: 'spawning' }, blurb: 'The whole lake rises for it on one still evening.' }),
  _gbB('the-dragon-king', 'The Dragon King', 'dragonfly', 'legendary', ['water'], 5, 'perch', 224, { c: '#3f2517', c2: '#e23322', c3: '#a0958c', p: 'big' }, { tod: ['dawn'], seasons: ['summer'], lv: 12, size: 1.68, needs: { moon: ['full'], net: 3, chance: 40 }, blurb: 'Older than fish. Comes at dawn when the moon is full.' }),
  _gbB('pyralis-firefly', 'Pyralis firefly', 'firefly', 'common', ['lawn', 'woods'], 2, 'hover', 4, { c: '#2d2b23', c2: '#e0b330', c3: '#8e8b96' }, { tod: ['dusk', 'night'], seasons: ['summer'], lv: 3, blurb: 'Draws a little J in the air, one after another.' }),
  _gbB('blue-ghost-firefly', 'Blue ghost firefly', 'firefly', 'uncommon', ['woods'], 3, 'hover', 11, { c: '#1e2426', c2: '#235fbc', c3: '#95889c', p: 'ring' }, { tod: ['night'], seasons: ['summer'], lv: 8, size: 1.02, blurb: 'A pale blue glow, and it does not blink.' }),
  _gbB('lamp-post-beetle', 'Lamp-post beetle', 'beetle', 'common', ['light'], 1, 'crawl', 4, { c: '#994725', c2: '#20111f', c3: '#dbb3a6' }, { tod: ['night'], seasons: ['summer'], lv: 2, blurb: 'Always found under the one you need.' }),
  _gbB('lantern-bug', 'Lantern bug', 'mite', 'uncommon', ['light'], 1, 'crawl', 14, { c: '#f0a12d', c2: '#1d1221', c3: '#ffdc96', p: 'ring' }, { tod: ['night'], seasons: ['summer', 'autumn'], lv: 7, size: 0.71, needs: { decor: 'lantern' }, blurb: 'A tiny speck with a tiny lamp.' }),
  _gbB('fairy-light-fly', 'Fairy-light fly', 'fly', 'uncommon', ['light'], 3, 'hover', 15, { c: '#69a7d7', c2: '#e0e9d8', c3: '#a9c6dd', p: 'ring' }, { tod: ['night'], lv: 8, size: 0.82, needs: { decor: 'string-lights' }, blurb: 'Comes for your string lights and stays till morning.' }),
  _gbB('toadstool-sprite', 'Toadstool sprite', 'ant', 'rare', ['light', 'woods'], 2, 'crawl', 52, { c: '#5fc28b', c2: '#c21302', c3: '#b3cfc8', p: 'ring' }, { tod: ['night'], lv: 11, size: 0.84, needs: { decor: 'toadstool-lamps' }, blurb: 'Lives by the toadstool lamps, and glows green.' }),
  _gbB('glowcap-beetle', 'Glowcap beetle', 'beetle', 'rare', ['flower'], 2, 'crawl', 42, { c: '#6fbc9c', c2: '#010c00', c3: '#add9c0', p: 'ring' }, { tod: ['night'], lv: 5, size: 1.12, needs: { plant: 'glowcap' }, blurb: 'It smells a glowcap from a long way off.' }),
  _gbB('moonflower-moth', 'Moonflower moth', 'moth', 'rare', ['flower', 'light'], 3, 'perch', 45, { c: '#d1dad7', c2: '#115dc1', c3: '#d9e0ea', p: 'ring' }, { tod: ['night'], seasons: ['summer'], lv: 11, size: 1.12, needs: { plant: 'moonflower' }, blurb: 'Comes to the moonflower when it opens at night.' }),
  _gbB('starlit-firefly', 'Starlit firefly', 'firefly', 'epic', ['woods', 'light'], 4, 'hover', 103, { c: '#182231', c2: '#fbd236', c3: '#8f98aa', p: 'ring' }, { tod: ['night'], lv: 14, size: 1.25, needs: { event: 'meteor' }, blurb: 'You will see it only on a night of shooting stars.' }),
  _gbB('red-moon-cricket', 'Red moon cricket', 'katydid', 'epic', ['lawn', 'woods'], 4, 'perch', 106, { c: '#ae1d29', c2: '#07090d', c3: '#d68689' }, { tod: ['night'], lv: 8, size: 1.25, needs: { event: 'blood-moon' }, blurb: 'It sings when the moon goes the colour of a warning.' }),
  _gbB('pumpkin-beetle', 'Pumpkin beetle', 'beetle', 'uncommon', ['ground'], 2, 'crawl', 15, { c: '#d77e1d', c2: '#f1cb8f', c3: '#c44d01' }, { seasons: ['autumn'], lv: 8, size: 1.02, needs: { decor: 'carved-pumpkin' }, blurb: 'It lives in your carved pumpkin. No rent.' }),
  _gbB('scarecrows-friend', 'Scarecrow’s friend', 'hopper', 'uncommon', ['lawn'], 2, 'perch', 15, { c: '#b9642a', c2: '#fabd64', c3: '#642119' }, { seasons: ['summer', 'autumn'], lv: 3, size: 1.02, needs: { decor: 'scarecrow' }, blurb: 'It sits on the scarecrow. Neither has said why.' }),
  _gbB('leaf-pile-earwig', 'Leaf-pile earwig', 'earwig', 'uncommon', ['ground'], 1, 'crawl', 15, { c: '#b16034', c2: '#f2b95a', c3: '#722111' }, { seasons: ['autumn'], lv: 3, size: 1.02, needs: { decor: 'leaf-pile' }, blurb: 'There is always one more in the leaf pile.' }),
  _gbB('compost-worm', 'Compost worm', 'worm', 'common', ['ground'], 1, 'crawl', 4, { c: '#c41f35', c2: '#f5fae9', c3: '#ec9daa', p: 'stripe' }, { lv: 2, size: 0.95, needs: { decor: 'compost-bin' }, blurb: 'Turning your scraps into something better, one bite at a time.' }),
  _gbB('hedgehog-flea', 'Hedgehog flea', 'mite', 'uncommon', ['ground'], 2, 'crawl', 12, { c: '#432f26', c2: '#d1a270', c3: '#2e110f' }, { lv: 8, size: 0.71, needs: { decor: 'hedgehog-house' }, blurb: 'It came with the hedgehog. Please do not mention it to the hedgehog.' }),
  _gbB('bee-hotel-guest', 'Bee hotel guest', 'bee', 'uncommon', ['flower', 'tree'], 3, 'hover', 12, { c: '#6c766b', c2: '#d29532', c3: '#b6bfb7' }, { tod: ['day'], seasons: ['spring', 'summer'], lv: 4, size: 1.02, needs: { decor: 'bug-hotel' }, blurb: 'Checked in, and has not left a review.' }),
  _gbB('well-spider', 'Well spider', 'spider', 'rare', ['water', 'ground'], 3, 'crawl', 48, { c: '#202835', c2: '#63797f', c3: '#161a24' }, { lv: 10, size: 1.12, needs: { decor: 'wishing-well' }, blurb: 'Lives down the wishing well, and hears everything.' }),
  _gbB('fountain-fly', 'Fountain fly', 'crane', 'uncommon', ['water'], 3, 'hover', 15, { c: '#66a2d8', c2: '#dde5da', c3: '#a5d1db' }, { tod: ['day'], seasons: ['summer'], lv: 6, size: 1.02, needs: { decor: 'fountain' }, blurb: 'Dances in the spray for no pay at all.' }),
  _gbB('snow-flea', 'Snow flea', 'mite', 'common', ['ground', 'woods'], 1, 'crawl', 4, { c: '#1b2e39', c2: '#3868d2', c3: '#9f98ad' }, { seasons: ['winter'], lv: 3, size: 0.7, blurb: 'Hops about on the snow. Lets the side down in summer.' }),
  _gbB('snow-scorpionfly', 'Snow scorpionfly', 'mayfly', 'common', ['ground', 'woods'], 2, 'hover', 4, { c: '#292b24', c2: '#ded7e0', c3: '#8a8b96' }, { seasons: ['winter'], lv: 3, blurb: 'Walks across snow like a small dark mistake.' }),
  _gbB('winter-gnat', 'Winter gnat', 'fly', 'common', ['lawn', 'water'], 2, 'hover', 3, { c: '#93898c', c2: '#e0e2d5', c3: '#51494d' }, { tod: ['day'], seasons: ['winter'], lv: 5, size: 0.8, blurb: 'They dance in the low sun, in the cold.' }),
  _gbB('winter-ladybird', 'Winter ladybird', 'ladybird', 'common', ['tree', 'ground'], 1, 'crawl', 4, { c: '#fa8d1c', c2: '#161720', c3: '#f7c08e', p: 'spots2' }, { seasons: ['winter'], lv: 2, blurb: 'Asleep in your window frame, mostly.' }),
  _gbB('frost-beetle', 'Frost beetle', 'beetle', 'uncommon', ['ground', 'woods'], 2, 'crawl', 11, { c: '#d8eef6', c2: '#172313', c3: '#e3f0ff', p: 'metal' }, { seasons: ['winter'], lv: 8, size: 1.02, blurb: 'A tiny blue-white shine under the snow.' }),
  _gbB('ice-worm', 'Ice worm', 'worm', 'rare', ['ground'], 2, 'crawl', 42, { c: '#cadada', c2: '#e1e6e5', c3: '#71b6ca' }, { tod: ['dawn'], seasons: ['winter'], lv: 5, size: 1.06, blurb: 'It would melt if you held it. Please be quick.' }),
  _gbB('yule-moth', 'Yule moth', 'moth', 'rare', ['light'], 4, 'perch', 38, { c: '#bd0c1e', c2: '#e4dfdf', c3: '#d18f96', p: 'fur' }, { tod: ['night'], seasons: ['winter'], lv: 12, size: 1.12, needs: { decor: 'festive-lights' }, blurb: 'Comes to the festive lights, in its best.' }),
  _gbB('snow-queen', 'Snow Queen', 'moth', 'legendary', ['light', 'woods'], 5, 'perch', 316, { c: '#d7e9e3', c2: '#1356bf', c3: '#eae2f0', p: 'tails' }, { tod: ['night'], seasons: ['winter'], lv: 13, size: 1.4, needs: { moon: ['full'], plant: 'christmas-rose', chance: 40 }, blurb: 'She lands where the frost is thickest, at the full moon.' }),
  _gbB('festival-cricket', 'Festival cricket', 'hopper', 'epic', ['lawn'], 5, 'perch', 113, { c: '#6ea6c3', c2: '#10000e', c3: '#b9c6e0', p: 'stripe' }, { lv: 15, size: 1.25, needs: { event: 'festival' }, blurb: 'It only comes out for a party, and leaves before the washing up.' }),
  _gbB('storm-beetle', 'Storm beetle', 'beetle', 'epic', ['ground', 'woods'], 3, 'crawl', 90, { c: '#425768', c2: '#efc73d', c3: '#b1bfc6', p: 'metal' }, { lv: 10, size: 1.25, needs: { event: 'storm' }, blurb: 'Comes out as the thunder starts, and shines for it.' }),
  _gbB('fog-moth', 'Fog moth', 'moth', 'epic', ['light', 'woods'], 4, 'perch', 103, { c: '#b3bed8', c2: '#0c0f00', c3: '#dce0df' }, { lv: 14, size: 1.25, needs: { event: 'fog' }, blurb: 'You can only see it in the mist. It may be the mist.' }),
  /*@end-bugs*/
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
/* ---------- the moon: the same on every device, worked out from the day alone ---------- */
const GF_MOON = Object.freeze({ month: 29.530588, new0: 947182440000, edge: 1.85 });   // a synodic month in days; a new moon (6 Jan 2000, 18:14 UTC); how many days either side counts as new or full
function _gfMoonAge(iso) {
  const t = Date.parse(String(iso || '').slice(0, 10) + 'T12:00:00Z'); if (!Number.isFinite(t)) return 7;   // clock-ok: the day it was asked about
  const M = GF_MOON.month, d = (t - GF_MOON.new0) / 86400000;
  return ((d % M) + M) % M;
}
/** 'new' | 'waxing' | 'full' | 'waning' for a day ('YYYY-MM-DD'). About 3.7 days of each month are new, and 3.7 full. */
function gardenMoonPhase(isoDay) {
  const age = _gfMoonAge(isoDay), M = GF_MOON.month, E = GF_MOON.edge;
  return age < E || age > M - E ? 'new' : Math.abs(age - M / 2) < E ? 'full' : age < M / 2 ? 'waxing' : 'waning';
}
/** How many days until that phase comes round (0: it is that now). */
function gardenMoonIn(isoDay, phase) {
  const t = Date.parse(String(isoDay || '').slice(0, 10) + 'T12:00:00Z'); if (!Number.isFinite(t)) return 0;   // clock-ok: counting from that day
  for (let i = 0; i < 31; i++) if (gardenMoonPhase(new Date(t + i * 86400000).toISOString().slice(0, 10)) === phase) return i;
  return 0;
}

/* ---------- can it appear? ---------- */
function _gfList(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
/** The world things of a `needs`. ctx {tod, season, rain, level, moon, spot, decor(id), plant(id), event(id)}. Something this build has no way to tell yet (no spots, no events) is not asked for. */
function _gfWorldOk(n, ctx) {
  if (!n) return true;
  if (n.tod && !_gfList(n.tod).includes(ctx.tod)) return false;
  if (n.season && !_gfList(n.season).includes(ctx.season)) return false;
  if (n.zone && ctx.zone && !_gfList(n.zone).includes(ctx.zone)) return false;
  if (n.level && n.level > (ctx.level || 1)) return false;
  if (n.rain === true && !ctx.rain) return false;
  if (n.rain === false && ctx.rain) return false;
  if (n.moon && ctx.moon && !_gfList(n.moon).includes(ctx.moon)) return false;
  if (n.spot && ctx.spot !== undefined && ctx.spot !== n.spot) return false;
  if (n.decor && ctx.decor && !ctx.decor(n.decor)) return false;
  if (n.plant && ctx.plant && !ctx.plant(n.plant)) return false;
  if (n.event && ctx.event && !ctx.event(n.event)) return false;
  return true;
}
/** How narrow its window is: the narrower, the more it counts while the window is open (so a fish that needs a full moon really does turn up at one). */
function _gfTight(d) {
  const n = d.needs || {}, tl = d.tod.length, sl = d.seasons.length;
  return (tl && tl < 3 ? (tl === 1 ? 2 : 1) : 0) + (sl && sl < 3 ? (sl === 1 ? 2 : 1) : 0) + (n.rain === true ? 2 : 0) + (n.moon ? (_gfList(n.moon).length === 1 ? 3 : 1) : 0) + (n.spot ? 1 : 0) + (n.decor || n.plant ? 1 : 0) + (n.event ? 4 : 0);
}
/** How much it counts in a roll, its rarity first. Kinds you have not caught yet count for more, so a long book can be finished. */
function _gfWeight(d, ctx) {
  let w = (GARDEN_RARITY[d.rarity] || GARDEN_RARITY.common).weight;
  w *= 1 + 0.6 * _gfTight(d);
  if (d.needs && d.needs.chance) w *= d.needs.chance;
  if (ctx.caught && !ctx.caught(d.id)) w *= 2.5;
  return w;
}
/** Is this fish about right now? ctx {zone, tod, season, rain, level, rare (bait bonus 0..1), gold (the golden fly), night (a glow lure), moon, spot, decor, event, caught}. */
function gardenFishFits(f, ctx) {
  if (!f.zone.includes(ctx.zone)) return false;
  if (f.lv > (ctx.level || 1)) return false;
  if (f.tod.length && !f.tod.includes(ctx.tod)) return false;
  if (f.seasons.length && !f.seasons.includes(ctx.season)) return false;
  return _gfWorldOk(f.needs, ctx);
}
/** Is this bug about right now? ctx as for a fish, plus plant(id). Without a season of its own a bug sleeps through the winter. It keeps to its weather: one with `rain` comes only in the wet, the rest go in out of it (bar those at a light). */
function gardenBugFits(b, ctx) {
  if (b.lv > (ctx.level || 1)) return false;
  if (!b.tod.includes(ctx.tod)) return false;
  if (b.seasons.length ? !b.seasons.includes(ctx.season) : ctx.season === 'winter') return false;
  if (b.rain ? !ctx.rain : ctx.rain && !b.hab.includes('light')) return false;
  return _gfWorldOk(b.needs, ctx);
}
function gardenBugWeight(b, ctx) { return _gfWeight(b, ctx); }
/** The odds: {id: weight} for every fish and find that can bite here, now. Rarer fish count for more with better bait. */
function gardenFishOdds(ctx) {
  const out = [];
  const rareBoost = 1 + (ctx.rare || 0) * 3;
  for (const f of GARDEN_FISH) {
    if (f.cat === 'fish' && !gardenFishFits(f, ctx)) continue;
    if (f.cat !== 'fish' && !f.zone.includes(ctx.zone)) continue;
    let w = f.cat === 'fish' ? _gfWeight(f, ctx) : 0;
    if (f.rarity !== 'common') w *= rareBoost;
    if (f.cat !== 'fish') w = f.cat === 'junk' ? 6 : 4;      // finds are a small part of what bites
    if (f.rain && ctx.rain) w *= 2.4;
    if (ctx.night && f.tod.includes('night')) w *= 1.6;
    if (ctx.tod === 'night' && f.tod.length && !f.tod.includes('night') && f.cat === 'fish') w *= 0.5;
    out.push([f.id, w]);
  }
  return out;
}
/* ---------- will it come to your line? ---------- */
/** What your setup lacks for this fish, in plain words ([]: it will come). setup {rod (tier or id), reel, line, hook, bait} as gardenTackleInUse gives them. Tackle this build does not sell yet is not asked for. */
function gardenFishLacks(def, setup) {
  const n = def && def.needs, s = setup || {}, out = [];
  if (!n) return out;
  if (n.rod) { const r = gardenGearDef(s.rod), t = r ? r.tier : Number(s.rod) || 1; if (t < n.rod) out.push(`It wants ${_gfRodWords(n.rod)}.`); }
  for (const k of ['reel', 'line', 'hook']) {
    const want = n[k] ? gardenGearDef(n[k]) : null; if (!want) continue;
    const got = gardenGearDef(s[k]);
    if (!(got && (got.id === want.id || (k === 'reel' && got.tier >= want.tier)))) out.push(`It wants ${_gfTackleName(n[k])}.`);
  }
  const baits = _gfList(n.bait);
  if (baits.length && baits.some(id => gardenGearDef(id)) && !baits.includes(s.bait)) out.push(`It only takes ${_gfOr(baits.map(_gfTackleName))}.`);
  return out;
}

/* ---------- how to catch it: every line written from the data above ---------- */
const _GF_TACKLE_WORDS = Object.freeze({ 'reel-basic': 'the basic reel', 'reel-spin': 'the spinning reel', 'reel-bait': 'the baitcasting reel', 'reel-deep': 'the deep-water reel', 'reel-gold': 'the golden reel', 'line-mono': 'plain line', 'line-braid': 'braided line', 'line-wire': 'wire line', 'line-silk': 'silk line', 'hook-small': 'a small hook', 'hook-large': 'a large hook', 'hook-barbless': 'a barbless hook', 'hook-gold': 'the golden hook', cricket: 'crickets', shrimp: 'shrimp', spinner: 'a spinner', 'frog-lure': 'a frog lure', 'moth-fly': 'a moth fly', 'deep-jig': 'a deep jig', spoon: 'a spoon lure', berry: 'berries' });
const _GF_EVENT_WORDS = Object.freeze({ frenzy: 'a feeding frenzy', fog: 'a morning fog', storm: 'a thunderstorm', meteor: 'a meteor shower', 'blood-moon': 'a blood moon', festival: 'a lake festival', spawning: 'the spawning run' });
const _GF_SPOT_WORDS = Object.freeze({ 'reed-bank': 'the reed bank', 'sunken-log': 'the sunken log', 'weed-bed': 'the weed bed', 'drop-off': 'the drop-off', 'old-wreck': 'the old wreck', 'cold-spring': 'the cold spring', 'lily-pads': 'the lily pads' });
const _GF_TOD_WORDS = Object.freeze({ dawn: 'dawn', day: 'daytime', dusk: 'dusk', night: 'night' });
const _GF_HAB_WORDS = Object.freeze({ flower: 'flowers in bloom', lawn: 'the lawn', ground: 'bare ground', tree: 'grown trees', water: 'the water’s edge', light: 'a garden light at night', woods: 'the woods' });
function _gfOr(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' or ' + a[a.length - 1]; }
function _gfAnA(w) { return /^(the|a|an|some) /.test(w) ? w : (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w; }
function _gfTackleName(id) { const d = gardenGearDef(id); return d ? (d.kind === 'bait' ? d.name.toLowerCase() : _gfAnA(d.name.toLowerCase())) : (_GF_TACKLE_WORDS[id] || id.replace(/-/g, ' ')); }
function _gfRodWords(tier) { const r = GARDEN_RODS.find(x => x.tier === tier); return r ? _gfAnA(r.name.toLowerCase()) + (tier < GARDEN_RODS.length ? ' or better' : '') : 'a better rod'; }
function _gfNetWords(tier) { const r = GARDEN_NETS.find(x => x.tier === tier); return r ? _gfAnA(r.name.toLowerCase()) + (tier < GARDEN_NETS.length ? ' or better' : '') : 'a better net'; }
function _gfThingName(id) { const d = gardenDecor(id) || gardenGearDef(id); return d ? _gfAnA(d.name.toLowerCase()) : id.replace(/-/g, ' '); }
function _gfPlantName(id) { const p = gardenPlant(id); return p ? p.name.toLowerCase() : id.replace(/-/g, ' '); }
const _GF_FIGHT = Object.freeze({ smooth: 'it pulls steadily', dart: 'it darts about', floater: 'it drifts up and down', sinker: 'it dives for the bottom', mixed: 'it does a bit of everything' });
/** The how-to-catch lines as rows: {k: what it is about, label, text}. */
function gardenCatchNeedsRows(def) {
  if (!def) return [];
  const n = def.needs || {}, rows = [], add = (k, label, text) => rows.push({ k, label, text }), bug = def.cat === 'bug';
  const tod = _gfList(n.tod).length ? _gfList(n.tod) : def.tod, sea = _gfList(n.season).length ? _gfList(n.season) : def.seasons;
  if (bug) add('where', 'Where', 'Look near ' + _gfOr(def.hab.map(h => _GF_HAB_WORDS[h] || h)) + '.');
  else if (def.cat === 'fish') add('where', 'Where', _gfOr(def.zone.map(z => (GARDEN_FISH_ZONES[z] || {}).label || z)) + (def.zone.includes('deep') ? ': far out, past the end of the pier.' : def.zone.includes('mid') ? ': cast a little way out.' : def.zone.includes('pond') ? ' (it opens at garden level 7).' : ': close to the shore.'));
  else { add('where', 'Where', 'It can turn up in any water, at any time.'); return rows; }
  if (n.spot) add('spot', 'Spot', 'Only at ' + (_GF_SPOT_WORDS[n.spot] || n.spot.replace(/-/g, ' ')) + '.');
  if (n.plant) add('plant', 'Grow', 'It only comes to ' + _gfPlantName(n.plant) + ' in flower, so grow some.');
  if (n.decor) add('decor', 'Build', 'Only if you have ' + _gfThingName(n.decor) + ' in your garden.');
  const allDay = !tod.length || tod.length >= 4 || (bug && tod.length === 3 && !tod.includes('night'));
  add('when', 'When', allDay ? (bug ? 'Any time it is light.' : 'Any time of day.') : 'Only at ' + _gfOr(tod.map(t => _GF_TOD_WORDS[t] || t)) + '.');
  add('season', 'Season', sea.length ? 'Only in ' + _gfOr(sea) + '.' : bug ? 'Any time but winter.' : 'All year.');
  if (n.rain === true || (bug && def.rain)) add('rain', 'Weather', sea.length === 1 && sea[0] === 'winter' ? 'Only when it rains or snows.' : 'Only when it rains.');
  else if (n.rain === false) add('rain', 'Weather', 'Only when it is dry.');
  else if (def.rain) add('rain', 'Weather', 'Any, but it comes far more often in the rain.');
  else if (bug && !def.hab.includes('light')) add('rain', 'Weather', 'Only when it is dry.');
  if (n.moon) add('moon', 'Moon', 'Only at ' + _gfOr(_gfList(n.moon).map(p => (p === 'full' || p === 'new' ? p + ' moon' : 'a ' + p + ' moon'))) + '.');
  if (n.event) add('event', 'Event', 'Only during ' + (_GF_EVENT_WORDS[n.event] || n.event.replace(/-/g, ' ')) + '.');
  const lv = Math.max(def.lv || 1, n.level || 1);
  if (lv > 1) add('level', 'Level', 'From garden level ' + lv + '.');
  if (bug) {
    if (n.net) add('net', 'Net', 'You need ' + _gfNetWords(n.net) + '.');
    add('fight', 'How', def.skit >= 4 ? 'Very jumpy. Hold Shift to creep up, and swing from as far as you can.' : def.skit === 3 ? 'A bit jumpy. Hold Shift to creep up on it.' : 'Easy. Walk up slowly and swing.');
    return rows;
  }
  if (n.rod) add('rod', 'Rod', 'You need ' + _gfRodWords(n.rod) + '.');
  if (n.reel) add('reel', 'Reel', 'You need ' + _gfTackleName(n.reel) + '.');
  if (n.line) add('line', 'Line', 'You need ' + _gfTackleName(n.line) + '.');
  if (n.hook) add('hook', 'Hook', 'You need ' + _gfTackleName(n.hook) + '.');
  add('bait', 'Bait', _gfList(n.bait).length ? 'It only takes ' + _gfOr(_gfList(n.bait).map(_gfTackleName)) + '.' : 'Anything will do, even worms.');
  const d = def.diff || 1;
  add('fight', 'The fight', (d <= 3 ? 'Gentle' : d <= 5 ? 'Steady' : d <= 7 ? 'Hard' : 'Very hard') + ': ' + (_GF_FIGHT[def.beh] || _GF_FIGHT.smooth) + '.');
  return rows;
}
/** The how-to-catch lines in plain words, for anyone to show. */
function gardenCatchNeedsWords(def) { return gardenCatchNeedsRows(def).map(r => r.label + ': ' + r.text); }
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
  const pool = GARDEN_FISH_ONLY.filter(f => f.lv <= (level || 1) && !f.needs && !f.tod.length && !f.seasons.length && (f.rarity === 'common' || f.rarity === 'uncommon') && f.zone.some(z => z !== 'pond' || (level || 1) >= 7));
  const bugs = GARDEN_BUGS.filter(b => b.lv <= (level || 1) && !b.needs && !b.seasons.length && !b.rain && b.tod.includes('day') && b.rarity !== 'epic' && b.rarity !== 'legendary');
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

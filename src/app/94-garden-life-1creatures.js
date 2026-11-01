/* ============================================================
   GARDEN LIFE, the creatures (2.23): THE registry. One row is one creature and needs no engine code. docs/dev/GARDEN.md section 17 has the recipe.

     id, name         id is what the book saves. An id that is also in GARDEN_VISITORS takes over from that visitor's still drawing in the world.
     group            'insect' | 'bird' | 'animal' | 'pond': the Nature book's shelves
     rarity           common, uncommon, rare, epic, legendary: how often it is picked, and what finding it pays (GL_ECON)
     art              [kit, params] (94-garden-life-0kit.js); clips (optional) replaces named clips
     habitat          'air' | 'ground' | 'water': how it gets about (the first three keys of how it arrives, moves and collides)
     alt, speed, foot flying height (px), cells a second, feet width (cells)
     when             {seasons, tod, weather: ['clear' | 'rain' | 'wet' | 'snow']}: leave a key out for "any". boost: {wet: 4} multiplies the odds after rain
     needs            {near: [selectors]}: one of these within reach of where you are looking; all: [selectors]: every one of these somewhere in the garden
     selectors        'bloom', 'plant', 'tree', 'ripe', 'cat:<decor or plant category>', 'effect:<decor behaviour>', 'id:<id>', 'prop', 'prop:<kind>', 'decor', 'water'
     start            'in-place' fades in on its spot (a cat already asleep on a wall) instead of arriving from outside your view; needs the `on` of its land-on
     count, max       how many come at once [min, max]; how many of it at most in the garden
     light            {c, r, x, y}: it shines: a glow painted above the night
     tags             words other rows can chase or be scared by
     behaviours       names from GARDEN_LIFE_BEHAVIOURS (94-garden-life-2behave.js), or [name, {params}]
     react            what a click does: {clip, mark ('heart' | 'note' | 'bang' | 'zzz' | 'spark'), sound ('chirp' | 'croak' | ...), hop, flee, gift (a keepsake id), chance}
     book             {hint (where and when, in plain words), blurb (once found)}

   Nothing here runs at load but plain data: engine code reads these rows and never asks for an id.
   ============================================================ */
const _GL_SHY_AIR = ['startled-by-player', 'startled-by-pet'];
const _GL_PERCHES = ['bloom', 'cat:seat', 'cat:fence', 'cat:ornament', 'cat:planter', 'cat:structure'];
const _GL_BIRD_PERCHES = ['cat:fence', 'cat:seat', 'cat:ornament', 'cat:structure', 'effect:birds', 'tree', 'prop'];
const _GL_FLYER = (on, extra) => ['fly-with-curves', ['land-on', { on: on || _GL_PERCHES }], 'perch-and-preen', ..._GL_SHY_AIR, 'leave-when-over', ...(extra || [])];

const GARDEN_CREATURES = Object.freeze([
  /* ---------- butterflies ---------- */
  { id: 'cabbage-white', name: 'Cabbage white', group: 'insect', rarity: 'common', tags: ['butterfly'], habitat: 'air', alt: 34, speed: 1.2, count: [1, 2], max: 3,
    art: ['butterfly', { fore: '#f7f5ea', hind: '#efecd4', edge: '#55524a', marks: 'tips', k: 0.82 }], when: { seasons: ['spring', 'summer', 'autumn'], tod: ['day'], weather: ['clear', 'wet'] },
    behaviours: _GL_FLYER(), react: { mark: 'heart', gift: 'white-wing-scale', chance: 0.4 },
    book: { hint: 'Sunny days, spring to autumn. Settles on flowers, benches and fences.', blurb: 'A white butterfly with an eye on the cabbages.' } },
  { id: 'peacock-butterfly', name: 'Peacock butterfly', group: 'insect', rarity: 'uncommon', tags: ['butterfly'], habitat: 'air', alt: 38, speed: 1.15, max: 2,
    art: ['butterfly', { fore: '#b83a2a', hind: '#a23224', edge: '#35181a', marks: 'eyes', k: 0.95 }], when: { seasons: ['spring', 'summer', 'autumn'], tod: ['day'], weather: ['clear'] }, needs: { near: ['bloom', 'cat:seat', 'cat:fence'] },
    behaviours: _GL_FLYER(), react: { mark: 'heart', gift: 'peacock-scale', chance: 0.35 },
    book: { hint: 'A sunny day and something in bloom or a place to sit.', blurb: 'Four great eyes on its wings to startle the birds.' } },
  { id: 'red-admiral', name: 'Red admiral', group: 'insect', rarity: 'uncommon', tags: ['butterfly'], habitat: 'air', alt: 40, speed: 1.3, max: 2,
    art: ['butterfly', { fore: '#26211f', hind: '#2f2826', edge: '#0f0b0a', band: '#e2442b', marks: 'band', k: 0.95 }], when: { seasons: ['summer', 'autumn'], tod: ['day', 'dusk'], weather: ['clear'] },
    behaviours: _GL_FLYER(), react: { mark: 'heart' }, book: { hint: 'Late summer and autumn afternoons.', blurb: 'Loves late flowers and fallen fruit.' } },
  { id: 'brimstone', name: 'Brimstone', group: 'insect', rarity: 'rare', tags: ['butterfly'], habitat: 'air', alt: 36, speed: 1.1, max: 1,
    art: ['butterfly', { fore: '#f0e15e', hind: '#e6d94e', edge: '#8a8a30', marks: 'veins', k: 0.92 }], when: { seasons: ['spring'], tod: ['day'], weather: ['clear'] },
    behaviours: _GL_FLYER(), react: { mark: 'heart' }, book: { hint: 'The first warm days of spring.', blurb: 'The butter-coloured one: some say it gave butterflies their name.' } },

  /* ---------- 2.40: hens, wherever a coop stands (docs/dev/HUNDRED_PLAY.md) ---------- */
  { id: 'hen', name: 'Hen', group: 'bird', rarity: 'common', tags: ['bird'], habitat: 'ground', speed: 0.5, foot: 0.12, count: [1, 3], max: 3,
    art: ['bird', { body: '#b5763e', belly: '#e8c898', wing: '#8a5430', head: '#b5763e', beak: '#e8b83c', k: 0.95, tail: 8 }], when: { tod: ['dawn', 'day', 'dusk'] }, needs: { near: ['effect:coop'] },
    behaviours: [['peck', { weight: 1 }], ['wander', { pause: [2, 6], range: 3 }], ['startled-by-pet', { r: 0.9 }], 'leave-when-over'], react: { mark: 'note', sound: 'chirp' },
    book: { hint: 'Comes with a hen coop.', blurb: 'Looks at everything as if it owes her money.' } },
  /* ---------- bees and small things ---------- */
  { id: 'honeybee', name: 'Honeybee', group: 'insect', rarity: 'common', tags: ['bee'], habitat: 'air', alt: 16, speed: 1.6, count: [1, 3], max: 4,
    art: ['bee', { band: '#f2b01e', pollen: '#f2c84a', k: 0.8 }], when: { seasons: ['spring', 'summer', 'autumn'], tod: ['day'], weather: ['clear'] }, needs: { near: ['bloom', 'effect:hive'] },
    behaviours: [['follow-scent', { scent: ['bloom', 'effect:hive'], hover: true }], 'leave-when-over'], react: { mark: 'note', sound: 'buzz', gift: 'drop-of-honey', chance: 0.3 },
    book: { hint: 'Comes wherever flowers bloom. A beehive helps.', blurb: 'Busy, busy: visits one flower after another and never lands for long.' } },
  { id: 'bumblebee', name: 'Bumblebee', group: 'insect', rarity: 'uncommon', tags: ['bee'], habitat: 'air', alt: 14, speed: 1.05, max: 2,
    art: ['bee', { band: '#f2c43a', tail: '#f6f2ea', fuzz: true, k: 0.86 }], when: { seasons: ['spring', 'summer'], tod: ['day', 'dawn'], weather: ['clear', 'wet'] }, needs: { near: ['bloom'] },
    behaviours: [['follow-scent', { scent: ['bloom'], hover: true }], 'leave-when-over'], react: { mark: 'note', sound: 'buzz' },
    book: { hint: 'Flowers in bloom, spring and summer.', blurb: 'Round, furry and not in any hurry.' } },
  { id: 'ladybird', name: 'Ladybird', group: 'insect', rarity: 'common', tags: [], habitat: 'air', alt: 20, speed: 0.75, max: 2,
    art: ['ladybird', { k: 0.8 }], when: { seasons: ['spring', 'summer', 'autumn'], tod: ['day'] }, needs: { near: ['plant', 'effect:bugs'] },
    behaviours: [['land-on', { on: ['plant', 'effect:bugs', 'cat:planter'] }], ['perch-and-preen', { clip: 'walk', dur: [8, 20] }], 'fly-with-curves', ['startled-by-player', { r: 0.9 }], 'leave-when-over'], react: { mark: 'heart', gift: 'lucky-spot', chance: 0.3 },
    book: { hint: 'On the leaves of almost anything, on a nice day.', blurb: 'Flies away home when it has had enough of you.' } },
  { id: 'dragonfly', name: 'Dragonfly', group: 'pond', rarity: 'uncommon', tags: [], habitat: 'air', alt: 26, speed: 2.8, max: 2,
    art: ['dragonfly', { k: 0.82 }], when: { seasons: ['spring', 'summer', 'autumn'], tod: ['day'], weather: ['clear'] }, needs: { near: ['water', 'prop:reeds'] },
    behaviours: [['dart', { over: 'water' }], ['land-on', { on: ['prop:reeds', 'cat:water', 'prop:boat'], weight: 0.5 }], ['perch-and-preen', { dur: [3, 8] }], 'startled-by-player', 'leave-when-over'], react: { mark: 'spark' },
    book: { hint: 'Over water on a sunny day: the lake, the pond, the reeds.', blurb: 'Stops dead in the air, then is somewhere else.' } },
  { id: 'moth', name: 'Moth', group: 'insect', rarity: 'common', tags: [], habitat: 'air', alt: 30, speed: 1.1, count: [1, 2], max: 3,
    art: ['moth', { c: '#bcab8e', k: 0.82 }], when: { tod: ['dusk', 'night'], seasons: ['spring', 'summer', 'autumn'] }, needs: { near: ['effect:light'] },
    behaviours: [['orbit', { around: ['effect:light'], r: 0.8 }], ['land-on', { on: ['effect:light'], weight: 0.6 }], ['perch-and-preen', { dur: [3, 9] }], 'leave-when-over'], react: { mark: 'spark', gift: 'moth-dust', chance: 0.3 },
    book: { hint: 'Round a lamp or lantern, after dark.', blurb: 'Goes round and round the light, and bumps into it, and does not learn.' } },
  { id: 'firefly', name: 'Firefly', group: 'insect', rarity: 'uncommon', tags: [], habitat: 'air', alt: 22, speed: 0.55, count: [3, 6], max: 7,
    art: ['firefly', { k: 0.8 }], light: { c: '#e8f26a', r: 15, x: -2.4, y: -3.6 }, when: { tod: ['dusk', 'night'], seasons: ['spring', 'summer', 'autumn'], weather: ['clear', 'wet'] }, needs: { near: ['bloom', 'plant', 'water'] },
    behaviours: [['orbit', { around: ['bloom', 'plant'], r: 1.6, slow: true }], 'leave-when-over'], react: { mark: 'spark', sound: 'twinkle' },
    book: { hint: 'A warm evening, near flowers.', blurb: 'Little lanterns, all going about their own business.' } },

  /* ---------- birds ---------- */
  { id: 'robin', name: 'Robin', group: 'bird', rarity: 'common', tags: ['bird'], habitat: 'air', alt: 46, speed: 2.8, max: 2,
    art: ['bird', { body: '#8b7355', belly: '#efe6d4', wing: '#6e5a42', head: '#8b7355', bib: '#e2662a', beak: '#2e241c', k: 0.86 }], when: { tod: ['dawn', 'day', 'dusk'] },
    behaviours: [['land-on', { on: _GL_BIRD_PERCHES }], ['perch-and-preen', { dur: [5, 14], clips: ['rest', 'preen', 'alert', 'rest'] }], 'fly-with-curves', ['peck', { weight: 0.8 }], ..._GL_SHY_AIR, 'leave-when-over'], react: { mark: 'note', sound: 'chirp', gift: 'robin-feather', chance: 0.45 },
    book: { hint: 'All year, wherever there is a perch. Bold for a bird.', blurb: 'Comes close when you dig, in case of worms.' } },
  { id: 'blue-tit', name: 'Blue tit', group: 'bird', rarity: 'common', tags: ['bird'], habitat: 'air', alt: 44, speed: 3, count: [1, 2], max: 3,
    art: ['bird', { body: '#7f9a6a', belly: '#f2dc62', wing: '#4f7cb0', head: '#f4f2e8', cap: '#3f78bc', beak: '#26221e', k: 0.72, tail: 7 }], when: { tod: ['dawn', 'day'] },
    behaviours: [['land-on', { on: _GL_BIRD_PERCHES }], ['perch-and-preen', { dur: [3, 9], clips: ['rest', 'alert', 'preen'] }], 'fly-with-curves', ..._GL_SHY_AIR, 'leave-when-over'], react: { mark: 'note', sound: 'chirp', gift: 'blue-feather', chance: 0.4 },
    book: { hint: 'Any day. Trees, fences, the bird feeder.', blurb: 'Never still. Hangs upside down if it thinks you are watching.' } },
  { id: 'blackbird', name: 'Blackbird', group: 'bird', rarity: 'uncommon', tags: ['bird'], habitat: 'air', alt: 50, speed: 2.7, max: 1,
    art: ['bird', { body: '#2c2826', belly: '#3a3532', wing: '#1f1c1a', head: '#2c2826', beak: '#ec9a20', leg: '#4a3a2e', k: 0.98, tail: 10 }], when: { tod: ['dawn', 'dusk', 'day'] },
    behaviours: [['land-on', { on: _GL_BIRD_PERCHES }], ['perch-and-preen', { dur: [5, 12], clips: ['rest', 'alert', 'rest', 'preen'] }], ['peck', { weight: 1.4 }], 'fly-with-curves', ..._GL_SHY_AIR, 'leave-when-over'], react: { mark: 'note', sound: 'song', gift: 'black-feather', chance: 0.3 },
    book: { hint: 'Dawn and dusk. Listens at the lawn for worms.', blurb: 'The best singer in the street and he knows it.' } },

  /* ---------- on the ground ---------- */
  { id: 'snail', name: 'Snail', group: 'animal', rarity: 'common', tags: [], habitat: 'ground', speed: 0.09, foot: 0.08, max: 2, start: 'in-place',
    art: ['snail', { k: 0.72 }], when: { tod: ['dawn', 'day', 'dusk', 'night'], seasons: ['spring', 'summer', 'autumn'], boost: { wet: 5 } }, needs: { near: ['cat:planter', 'plant', 'cat:ornament', 'cat:fence'] },
    behaviours: [['land-on', { on: ['cat:planter', 'cat:ornament', 'cat:fence'], climb: true }], ['perch-and-preen', { dur: [12, 30] }], ['wander', { pause: [3, 7], range: 2 }], ['startled-by-player', { r: 0.8, action: 'hide' }], 'leave-when-over'], react: { clip: 'hide', mark: 'heart', gift: 'snail-shell', chance: 0.3 },
    book: { hint: 'After rain. Climbs pots and ornaments, very slowly.', blurb: 'In no rush at all. Goes in when you say hello.' } },
  { id: 'hedgehog', name: 'Hedgehog', group: 'animal', rarity: 'uncommon', tags: [], habitat: 'ground', speed: 0.55, foot: 0.22, max: 1,
    art: ['hedgehog', { k: 0.82 }], when: { tod: ['dusk', 'night'], seasons: ['spring', 'summer', 'autumn'] },
    behaviours: [['follow-scent', { scent: ['ripe', 'effect:hedgehog', 'cat:seasonal', 'plant'], sniff: true }], ['wander', { pause: [2, 4], range: 4 }], ['startled-by-player', { r: 1.3, action: 'hide' }], ['startled-by-pet', { r: 1.8, action: 'hide' }], 'leave-when-over'], react: { clip: 'hide', mark: 'heart', gift: 'hedgehog-spine', chance: 0.4 },
    book: { hint: 'At dusk, spring to autumn. A leaf pile or a hedgehog house brings one sooner.', blurb: 'Snuffles along the beds. Rolls up, then forgets why.' } },
  { id: 'next-door-cat', name: 'Next door’s cat', group: 'animal', rarity: 'uncommon', tags: ['cat'], habitat: 'ground', speed: 0.7, foot: 0.25, max: 1, start: 'in-place',
    art: ['quad', { coat: '#d8924a', belly: '#f4e6cc', dark: '#a0602c', saddle: '#c07a36', len: 14, h: 11, legH: 7, tail: 'whip', tip: '#f4e6cc', k: 0.9, snout: 1.12, muzzle: '#f4e6cc' }], when: { tod: ['day', 'dusk', 'dawn'], weather: ['clear'] }, needs: { near: ['cat:fence', 'cat:seat', 'prop'] },
    behaviours: [['land-on', { on: ['cat:fence', 'cat:seat', 'prop:stall', 'prop:board'], leap: true }], ['sleep', { dur: [24, 70] }], ['chase', { tag: 'butterfly', r: 3, weight: 0.5 }], ['wander', { pause: [2, 6], range: 5 }], ['notice-player', { mark: 'heart', sound: 'purr' }], ['startled-by-pet', { r: 2 }], 'leave-when-over'], react: { clip: 'react', mark: 'heart', sound: 'purr', gift: 'cat-whisker', chance: 0.3 },
    book: { hint: 'Naps on walls, fences and benches when the sun is out.', blurb: 'Not your cat. Nobody has told the cat.' } },
  { id: 'squirrel', name: 'Squirrel', group: 'animal', rarity: 'uncommon', tags: [], habitat: 'ground', speed: 1.9, foot: 0.2, max: 1,
    art: ['squirrel', { k: 0.88 }], when: { tod: ['dawn', 'day'], seasons: ['spring', 'autumn', 'winter', 'summer'], boost: { autumn: 2 } },
    behaviours: [['hop', { range: 3 }], ['land-on', { on: ['tree', 'cat:fence'], leap: true }], ['perch-and-preen', { dur: [3, 9], clips: ['rest', 'preen', 'alert'] }], ['peck', { weight: 0.8 }], ['startled-by-player', { r: 2 }], ['startled-by-pet', { r: 2.6 }], 'leave-when-over'], react: { clip: 'react', mark: 'note', gift: 'acorn', chance: 0.5 },
    book: { hint: 'Daytime, mostly autumn, wherever there are trees or a fence.', blurb: 'Has hidden a thousand nuts and remembers forty.' } },
  { id: 'rabbit', name: 'Rabbit', group: 'animal', rarity: 'uncommon', tags: ['prey'], habitat: 'ground', speed: 1.4, foot: 0.2, max: 2,
    art: ['rabbit', { k: 0.84 }], when: { tod: ['dawn', 'dusk'] },
    behaviours: [['hop', { range: 3 }], ['peck', { weight: 1.2 }], ['burrow', { weight: 0.5 }], ['startled-by-player', { r: 2.2 }], ['startled-by-pet', { r: 3 }], 'leave-when-over'], react: { clip: 'react', mark: 'heart', gift: 'rabbit-fluff', chance: 0.3 },
    book: { hint: 'First and last light, nibbling something it should not.', blurb: 'Goes down one hole and comes up another.' } },
  { id: 'frog', name: 'Frog', group: 'pond', rarity: 'common', tags: [], habitat: 'ground', speed: 1.2, foot: 0.16, max: 2, start: 'in-place',
    art: ['frog', { k: 0.9 }], when: { seasons: ['spring', 'summer', 'autumn'], boost: { wet: 3 } }, needs: { near: ['water', 'cat:water'] },
    behaviours: [['land-on', { on: ['cat:water'], leap: true, weight: 1.5, reach: 5 }], ['perch-and-preen', { dur: [5, 14] }], ['hop', { range: 2.2, nearWater: true }], ['swim', { speed: 0.5, dur: [5, 12] }], ['notice-player', { mark: 'note', sound: 'croak', clip: 'react' }], ['startled-by-player', { r: 1.1, action: 'dive' }], ['startled-by-pet', { r: 1.8, action: 'dive' }], 'leave-when-over'], react: { clip: 'react', hop: true, mark: 'note', sound: 'croak', gift: 'smooth-pebble', chance: 0.4 },
    book: { hint: 'By the lake or the pond. Lily pads if you have them. Loves rain.', blurb: 'Sits. Sits some more. Then, all at once, is not there.' } },
  { id: 'mallard', name: 'Mallard', group: 'pond', rarity: 'common', tags: [], habitat: 'water', speed: 0.45, foot: 0.3, max: 2, start: 'in-place',
    art: ['duck', { k: 0.92, collar: '#f4f2e8' }], when: { tod: ['dawn', 'day', 'dusk'] }, needs: { near: ['water'] },
    behaviours: [['swim', { speed: 0.45, dur: [8, 20] }], ['peck', { weight: 0.7 }], ['startled-by-pet', { r: 2.5, action: 'paddle' }], 'leave-when-over'], react: { clip: 'react', mark: 'note', sound: 'quack', gift: 'green-feather', chance: 0.35 },
    book: { hint: 'On the lake, most of the day.', blurb: 'Serene on top. Going like the clappers underneath.' } },
  { id: 'fox', name: 'Fox', group: 'animal', rarity: 'rare', tags: ['hunter'], habitat: 'ground', speed: 1.15, foot: 0.3, max: 1,
    art: ['quad', { coat: '#cf6c33', belly: '#f4ecdc', dark: '#2a2220', saddle: '#b85c2a', len: 22, h: 13, legH: 10, tail: 'brush', k: 0.92, snout: 1.7, sock: '#2a2220' }], when: { tod: ['dawn', 'dusk'], seasons: ['spring', 'summer', 'autumn', 'winter'] },
    behaviours: [['wander', { pause: [3, 7], range: 6, sniff: true }], ['follow-scent', { scent: ['cat:seasonal', 'ripe', 'tree'], sniff: true }], ['chase', { tag: 'prey', r: 4, weight: 0.7 }], ['startled-by-player', { r: 3 }], ['startled-by-pet', { r: 3 }], 'leave-when-over'], react: { clip: 'react', mark: 'bang', flee: true, gift: 'fox-hair', chance: 0.6 },
    book: { hint: 'Rare, at first light or last. Walks through and does not stop for long.', blurb: 'Knows your garden better than you do.' } },

  /* ---------- the guests that surprises bring (rarity legendary, come only through an easter egg: egg: true) ---------- */
  { id: 'otter', name: 'Otter', group: 'pond', rarity: 'epic', egg: true, tags: [], habitat: 'ground', speed: 0.9, foot: 0.25, max: 1,
    art: ['quad', { coat: '#6a4a30', belly: '#d8c4a0', dark: '#46301e', len: 21, h: 9, legH: 4, tail: 'long', earKind: 'round', k: 0.96, snout: 1.15 }], when: {}, needs: { near: ['water'] },
    behaviours: [['wander', { pause: [2, 5], range: 4 }], ['swim', { speed: 0.9, dur: [6, 14] }], ['notice-player', { mark: 'heart' }], 'leave-when-over'], react: { clip: 'react', mark: 'heart', gift: 'otter-stone', chance: 1 },
    book: { hint: 'A seat, a pond and a lamp, all in one garden, and an evening to enjoy them.', blurb: 'Came for the lamp. Stayed for the bench.' } },
  { id: 'black-cat', name: 'A very black cat', group: 'animal', rarity: 'rare', egg: true, tags: ['cat'], habitat: 'ground', speed: 0.8, foot: 0.25, max: 1,
    art: ['quad', { coat: '#201c20', belly: '#2c2830', dark: '#141014', saddle: '#2c2830', muzzle: '#2c2830', len: 14, h: 11, legH: 7, tail: 'whip', k: 0.9, snout: 1.12 }], when: {},
    behaviours: [['wander', { pause: [2, 5], range: 6 }], ['notice-player', { mark: 'bang' }], 'leave-when-over'], react: { clip: 'react', mark: 'spark', sound: 'purr', gift: 'black-whisker', chance: 1 },
    book: { hint: 'Friday the thirteenth. It crosses your path.', blurb: 'Good luck or bad? It is not telling.' } },
  { id: 'bat', name: 'Pipistrelle', group: 'animal', rarity: 'rare', egg: true, tags: ['bat'], habitat: 'air', alt: 70, speed: 3.2, max: 3,
    art: ['bat', { k: 0.82 }], when: { tod: ['dusk', 'night'] },
    behaviours: [['dart', {}], 'leave-when-over'], react: { mark: 'bang' }, book: { hint: 'Round Halloween, once it is getting dark.', blurb: 'A mouse with ideas.' } },
  { id: 'white-stag', name: 'The white stag', group: 'animal', rarity: 'legendary', egg: true, tags: [], habitat: 'ground', speed: 0.8, foot: 0.4, max: 1,
    art: ['quad', { coat: '#f2eee4', belly: '#fffdf6', dark: '#cfc8b6', saddle: '#e8e2d2', muzzle: '#fffdf6', len: 26, h: 17, legH: 18, neckUp: 1.05, tail: 'short', antlers: '#d8cfba', k: 1, snout: 1.25 }], when: {},
    behaviours: [['wander', { pause: [4, 9], range: 5, sniff: true }], ['startled-by-player', { r: 3 }], 'leave-when-over'], react: { clip: 'react', mark: 'spark', flee: true, gift: 'silver-hair', chance: 1 },
    book: { hint: 'Nobody can say. Some say a misty dawn.', blurb: 'You saw it. Nobody will believe you.' } },
  { id: 'moon-moth', name: 'Moon moth', group: 'insect', rarity: 'legendary', egg: true, tags: [], habitat: 'air', alt: 34, speed: 0.8, max: 1,
    art: ['moth', { c: '#bfe8c4', c2: '#6ea87e', spot: '#7a4a8a', tails: true, k: 1.15 }], light: { c: '#cdf2d2', r: 26, y: -8 }, when: {},
    behaviours: [['orbit', { around: ['effect:light', 'bloom', 'plant'], r: 1.1, slow: true }], ['land-on', { on: ['effect:light', 'bloom'], weight: 0.5 }], ['perch-and-preen', { dur: [6, 14] }], 'leave-when-over'], react: { mark: 'spark', sound: 'twinkle', gift: 'moon-dust', chance: 1 },
    book: { hint: 'A rare, still night. Pale as the moon.', blurb: 'Lives a week and spends it being beautiful.' } },
]);
const GL_CREATURE = new Map(GARDEN_CREATURES.map(c => [c.id, c]));
/** Does the life engine draw this visitor? (The world then skips its still drawing.) */
function gardenLifeOwns(id) { return GL_CREATURE.has(id); }

/* ---------- keepsakes: the small gifts creatures drop. One row each; you keep one of each, for good. They are worth nothing but the finding. ---------- */
function _glTuft(c) { return GART.P(c, 'M-7 -1C-3 -5 3 -6 8 -8C6 -3 1 -0.6 -4 -0.4z') + GART.S(GART.dk(c, 0.3), 0.5, 'M-7 -1Q0 -3 8 -8'); }
const GARDEN_KEEPSAKES = Object.freeze([
  { id: 'robin-feather', name: 'Robin’s feather', c: '#e2662a' }, { id: 'blue-feather', name: 'Blue feather', c: '#3f78bc' }, { id: 'black-feather', name: 'Glossy black feather', c: '#2c2826' }, { id: 'green-feather', name: 'Green feather', c: '#2f6a4a' },
  { id: 'white-wing-scale', name: 'A dusting of white', c: '#ece8d4', kind: 'dust' }, { id: 'peacock-scale', name: 'A scale with an eye', c: '#34489e', kind: 'dust' }, { id: 'moth-dust', name: 'Moth dust', c: '#bcab8e', kind: 'dust' }, { id: 'moon-dust', name: 'Moon dust', c: '#bfe8c4', kind: 'dust' },
  { id: 'drop-of-honey', name: 'A drop of honey', c: '#e8a81e', kind: 'drop' }, { id: 'lucky-spot', name: 'A lucky spot', c: '#d8232c', kind: 'drop' },
  { id: 'snail-shell', name: 'An empty shell', c: '#b77a42', kind: 'shell' }, { id: 'smooth-pebble', name: 'A smooth pebble', c: '#9aa4a0', kind: 'stone' }, { id: 'otter-stone', name: 'The otter’s favourite stone', c: '#6c7c88', kind: 'stone' },
  { id: 'hedgehog-spine', name: 'A hedgehog’s spine', c: '#6a5240', kind: 'spine' }, { id: 'cat-whisker', name: 'A cat’s whisker', c: '#d8cfba', kind: 'spine' }, { id: 'black-whisker', name: 'A very black whisker', c: '#201c20', kind: 'spine' }, { id: 'silver-hair', name: 'A silver hair', c: '#d8dce0', kind: 'spine' },
  { id: 'acorn', name: 'A forgotten acorn', c: '#9a6a34', kind: 'acorn' }, { id: 'rabbit-fluff', name: 'Rabbit fluff', c: '#efe6d4', kind: 'fluff' }, { id: 'fox-hair', name: 'A fox’s hair', c: '#cf6c33', kind: 'spine' },
  { id: 'wish-star', name: 'A wished-on star', c: '#fff1a8', kind: 'star' }, { id: 'bottle-note', name: 'A note from a bottle', c: '#f2ead0', kind: 'note' }, { id: 'clover', name: 'A four-leaf clover', c: '#4f9a4a', kind: 'clover' }, { id: 'toadstool-cap', name: 'A fairy’s toadstool', c: '#c8453a', kind: 'shroom' },
]);
const GL_KEEPSAKE = new Map(GARDEN_KEEPSAKES.map(k => [k.id, k]));
/** A keepsake's little picture (feet at 0,0, about 16 across). One line per shape, so a new keepsake with an old shape is one row. */
function gardenKeepsakeSvg(k) {
  const A = GART, c = k.c || '#c8a24a', shadow = A.P('#000000', A.ell(0, 0.4, 6, 1.5), 0.14);
  const shapes = {
    dust() { return A.P(c, A.circ(-3, -4, 1.3) + A.circ(1, -7, 1.1) + A.circ(3.6, -3, 1.5) + A.circ(-0.6, -1.8, 0.9)) + A.P('#ffffff', A.circ(1, -7, 0.45) + A.circ(3.6, -3, 0.5), 0.8); },
    drop() { return A.P(c, 'M0 -9C2 -6 4 -4.4 4 -2.6A4 2.8 0 0 1 -4 -2.6C-4 -4.4 -2 -6 0 -9z') + _glShine(-1.4, -3.4, 0.9, 1.3, 0.6); },
    shell() { return A.P(c, A.circ(0, -4.2, 4.3)) + A.S(A.dk(c, 0.35), 0.9, 'M-1 -4.6C0 -5.8 2 -5 1.6 -3.6C1.2 -2 -2 -2 -2.8 -3.8C-3.8 -6 -1.8 -8 0.8 -7.4'); },
    stone() { return A.P(c, A.ell(0, -2.8, 5, 3.2)) + _glShine(-1.6, -4, 1.8, 0.9, 0.45); },
    spine() { return A.S(c, 1.1, 'M-6 -1.4Q0 -3 6 -6'); },
    acorn() { return A.P(c, A.ell(0, -3.8, 3, 3.6)) + A.P(A.dk(c, 0.35), 'M-3.6 -5.4Q0 -9 3.6 -5.4Q0 -6.6 -3.6 -5.4z') + A.S(A.dk(c, 0.35), 0.9, 'M0 -7.4V-9'); },
    fluff() { return A.P(c, A.circ(-1.6, -3, 2.6) + A.circ(1.8, -3.6, 2.4) + A.circ(0, -5.2, 2.2)); },
    star() { return A.P(c, A.star(0, -5, 5, 5, 2.2)) + A.P('#ffffff', A.star(0, -5, 5, 2.2, 1), 0.7); },
    note() { return A.P(c, A.rect(-5, -7.4, 10, 7)) + A.S(A.dk(c, 0.4), 0.6, 'M-3.4 -5.6h6.8M-3.4 -3.8h6.8M-3.4 -2h4'); },
    clover() { return A.S('#3a7a3a', 0.9, 'M0 0V-4') + A.P(c, A.circ(-2.1, -6, 2) + A.circ(2.1, -6, 2) + A.circ(-2.1, -3.2, 2) + A.circ(2.1, -3.2, 2)); },
    shroom() { return A.P('#f2e8d4', A.rect(-1.4, -4, 2.8, 4)) + A.P(c, 'M-5 -3.6Q-5 -8.6 0 -8.6Q5 -8.6 5 -3.6z') + A.P('#ffffff', A.circ(-2, -5.4, 0.9) + A.circ(1.8, -6.4, 0.8)); },
  };
  return shadow + (shapes[k.kind] ? shapes[k.kind]() : _glTuft(c));
}

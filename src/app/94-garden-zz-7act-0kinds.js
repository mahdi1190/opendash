/* ============================================================
   AFFORDANCES: WHAT ANY KIND OF THING OFFERS (20 Nov 2026). The owner: "all of the animations should be generalizable and not for certain
   regions ... we want to make sure it's easy to change / add new areas and not have things break."

   Nothing here names a place. Things are FOUND (94-garden-zz-7act-0scan.js reads whatever the layout and the garden have placed) and each
   is given the affordances of its KIND. A new bench anywhere, on any layout, is sat on; a lighthouse anywhere has its ladder.

   GARDEN_KINDS[kind] = {
     name      words for the prompt ('the bench')
     arts      the painter's kind of drawing that makes a thing this kind (a landmark row's `art`, a fixed prop's `kind`)
     decor     placed decoration ids of this kind; effects: decoration effect kinds of this kind (any decoration you sit on is a seat)
     words     words in an id that make an unknown thing this kind (a layout's new 'vseat-3' row is a bench)
     species   the tree species (a painted tree's own `sp`, whoever drew it) that are this kind; '*' any other tree. A tree's moves also
               need its trunk stout enough (an act's big: the trunk's width in cells)
     acts      [{ act (GARDEN_ACTS id), name?, stand [u, dy], deg, seat, edge, reach, pri, noProp, needs, at, art, drawn, top, loft, side, big }]
                 wade: the stand point is in shallow water on purpose (under falls).
     stand: where you stand. u is a share of the thing's own width from its middle (so a bench twice as long puts you at the same
                 place along it), dy cells in front of its foot line (negative: on or behind it). deg the way you face (0 east, 90 south,
                 180 west, -90 north) for a thing whose front faces the camera; a thing laid with `front` turned round turns both.
                 at + art: a part this branch draws on the thing (a ladder up a lighthouse's side), at [u, dy] like stand; drawn: false when the
                 thing's own painter draws it. needs: { season, time ('day' | 'night'), level, owns (a gear id), winter }
                 A part (at) and its stand point are placed on the thing AS ITS PAINTER DREW IT, never on the layout's footprint: u is a
                 share of the drawn width (the native world's record of the picture, else the painter's own box, else dw below), from the
                 drawn foot's middle. A layout that makes the barn's footprint wider leaves its ladder on the barn's wall.
     levels    upper floors you walk on (94-garden-zz-7act-3height.js): [{ id, name, at [x, y] (the floor's middle on the ground, in H, the
               player's height, from the drawn foot), h (how high it is, in H), shape { ring: [rx, ry, inner rx, inner ry] } or { rect: [x0, y0,
               x1, y1] } (where the feet may go, in H round its middle), minus [{ rect } | { ell: [x, y, rx, ry] }] (the trunk, a house on it),
               core [rx, y] (a lamp room: you are behind it, drawn under the thing, when your feet are behind y and within rx of the middle),
               sit (a level of one spot: the pose you take there), ways [{ by: 'ladder', art (drawn by the world; none: the painter's own),
               loft, name, foot [x, y] (where you start up, in H from the drawn foot), top [x, y] (where you step off, in H from the middle) }] }]
               A way may instead be { by: 'stair', inside: true, door: { w, h, up } }: a stair inside the thing; you go in at its door (drawn
               standing open, w by h in H, its sill up from the foot), out of sight, and rise out of the stair head at the top, drawn behind the
               thing so its own wall hides your legs. What stands in front of the floor is drawn again over your legs as you pass it:
               rail { ring: [rx, ry] } or { line: [x0, x1, y] }, h, post, post0, gap, color (posts and rails, in H round the middle), or
               front { poly: [[x, y], ...] (the painter's own outline, in H from the drawn foot), fill, line, lineTo } (battlements, a parapet).
               The shape is where the FEET go, kept in from the drawn edge by half a body, so the whole figure stays over the floor as drawn.
               boards: a landing the world draws (a loft's): the back of its boards, in H, when it lies behind the feet's shape.
               tools/affordance-audit.mjs checks every way's foot is walkable and reachable on any layout.
     dw        the drawn width in cells when nothing else says (a painter that draws the thing at its own fixed size)
     paint     a fixed thing's painter (GardenPaintedProps: 'seat' the bench, 'wish' the well, 'board', 'post', 'tripod', 'fountain', 'lamp',
               'sundial', 'postbox'): a row of layout data of this kind (`things`) is drawn by that painter where the row puts it, blocks the
               feet like a small prop and is used like any other: a new bench in a layout needs no code
     art       the drawing of a placeable thing (94-garden-zz-7act-2world.js _GAW_ART): a thing of this kind is placed in the layout's data
     place     true: a thing placed through layout data (assets/garden/vale-things.json, or a layout's own `things`), not drawn by a painter
     w, h      a placeable thing's footprint in cells when its row gives none
     pet       the pets' word for it (PET_LIFE rows' `at`: 'bench', 'well', 'fire' ...); drink: a pet drinks there; warm: a pet warms itself;
     noPerch   a pet never stands on top of it; top / petSeat: px up where a perched / sat pet's feet go
     solid     what the audit expects of its ground: 'free' (you walk on it) or 'block'
     onPath    a placed thing of this kind may stand on a path or paved yard (a busker's pitch in a square); every other placed kind is
               moved off paths, paving, water, what stops the feet and other things (94-garden-zz-7act-0scan.js _gksPlaceFault)
     ground    where a placed thing of this kind must lie ('water-edge': on the bank's lip, water just in front): a row that a re-laid
               layout leaves elsewhere is moved to the nearest such ground within 4 cells (gardenKindSnap), never left in the water
   }
   GARDEN_TERRAIN[type] = { acts, pets }: what ground of that type offers, read from the layout's cells (94-garden-zz-7act-0scan.js
     gardenTerrainAt): no coordinates anywhere.
   Pure data and pure functions above the line: tools/affordance-audit.mjs evaluates this file as it is, on any layout's json.
   ============================================================ */
const GARDEN_KINDS = Object.freeze({
  /* seats */
  bench: { name: 'the bench', arts: ['seat'], paint: 'seat', w: 1.75, h: 0.4, decor: [], words: ['bench', 'seat', 'settle', 'pew'], acts: [{ act: 'sit', stand: [-0.25, -0.16], deg: 90, seat: 0.36 }, { act: 'sit', stand: [0.25, -0.16], deg: 90, seat: 0.36 }], pet: 'bench', top: 28, petSeat: 15 },   // two places along it (a friend sits beside you, never on you)   // seat: the seat's height as drawn, a share of the figure's height
  seat: { name: 'the seat', effects: ['sit'], decor: ['bench', 'stone-bench', 'driftwood-seat', 'deckchair', 'bistro-set', 'picnic-blanket', 'gazebo', 'dc-tea-table'], acts: [{ act: 'sit', stand: [0, 0.06], deg: 90, seat: 0.45 }], pet: 'bench' },
  chair: { name: 'the chair', decor: ['play-chair'], words: ['chair'], acts: [{ act: 'sit', stand: [0, 0.06], deg: 90, seat: 0.45 }], pet: 'chair' },
  swing: { name: 'the swing', decor: ['swing-seat'], words: ['swing'], acts: [{ act: 'sit', stand: [0, 0.06], deg: 90, seat: 0.45 }], pet: 'swing' },
  hammock: { name: 'the hammock', decor: ['hammock'], words: ['hammock'], acts: [{ act: 'sit', stand: [0, 0.06], deg: 90, seat: 0.45 }], pet: 'swing' },
  picnic: { name: 'the picnic rug', arts: ['picnic'], words: ['picnic'], pet: 'bench', top: 22, petSeat: 22 },
  stump: { name: 'the stump', arts: ['stump'], words: ['stump'], acts: [{ act: 'sit', at: [-0.35, 0], drawn: false, stand: [-0.35, -0.02], deg: 90, seat: 0.5 }], pet: 'stump', top: 24, petSeat: 24 },   // on the fallen log its painter lays against the stump's left side (u: a share of the stump as drawn), legs down its front
  'log-seat': { name: 'the log', art: 'logseat', place: true, w: 1.8, h: 0.4, acts: [{ act: 'sit', stand: [-0.25, 0.12], deg: 90, seat: 0.42 }, { act: 'sit', stand: [0.25, 0.12], deg: 90, seat: 0.42 }], pet: 'stump', solid: 'block' },   // a log laid by a fire to sit on
  'log-pile': { name: 'the log pile', decor: ['log-pile', 'rw-orn-logs'], words: ['logpile', 'logstack', 'woodpile', 'logs'], pet: 'stump' },
  /* water you work, wish in or drink from */
  pump: { name: 'the pump', arts: ['pump'], decor: ['water-pump'], words: ['pump'], acts: [{ act: 'pump', stand: [-0.74, 0.12], deg: 0, edge: true }], pet: 'pump', drink: true },   // side on at the lever's end
  well: { name: 'the wishing well', arts: ['wish'], paint: 'wish', w: 1.4, h: 0.8, words: ['well', 'wish'], acts: [{ act: 'wish', stand: [0, 0.95], deg: -90, reach: 3.2 }], pet: 'well', drink: true },
  'garden-well': { name: 'the well', decor: ['wishing-well'], effects: ['wish'], acts: [{ act: 'wish', stand: [0, 0.5], deg: -90 }], pet: 'well', drink: true },
  'village-well': { name: 'the well', arts: ['well'], pet: 'well', drink: true },   // a well with its own use (draw a bucket): the pets drink there
  trough: { name: 'the trough', arts: ['churn'], decor: ['water-butt', 'dc-milk-churns'], words: ['trough', 'churn'], pet: 'trough', drink: true },
  bath: { name: 'the bird bath', arts: ['fountain'], paint: 'fountain', w: 1.2, h: 0.6, decor: ['bird-bath', 'fountain', 'mini-pond'], words: ['fountain', 'birdbath'], pet: 'bath', drink: true },
  /* fire */
  campfire: { name: 'the campfire', art: 'fire', place: true, w: 1, h: 0.4, acts: [{ act: 'warm', stand: [0, -0.68], deg: 90 }], pet: 'fire', warm: true, noPerch: true, solid: 'block' },   // back from the ring of stones, the flames clear of your feet
  fire: { name: 'the fire', arts: ['clamp'], decor: ['fire-pit', 'dc-clay-oven', 'dc-cauldron'], words: ['fire', 'firepit', 'firering', 'bonfire', 'campfire', 'brazier', 'beacon', 'soupcamp', 'firecamp', 'hearth'], pet: 'fire', warm: true, noPerch: true },
  /* things that ring, play or chime */
  chapel: { name: 'the chapel bell', arts: ['chapel'], words: ['chapel'], acts: [{ act: 'bell', stand: [0, 0.6], deg: -90 }], pet: 'bell' },
  bell: { name: 'the bell', art: 'bell', place: true, words: ['bell'], acts: [{ act: 'bell', stand: [0, 0.6], deg: -90 }], pet: 'bell' },   // a ship's bell on a post (no drawing yet: offers nothing until one is drawn)
  chime: { name: 'the wind chimes', decor: ['wind-chimes', 'can-chimes'], words: ['chime', 'chimes'], pet: 'chime' },
  'music-box': { name: 'the music box', art: 'musicbox', place: true, decor: ['dc-gramophone'], words: ['music', 'gramophone'], pet: 'music' },
  // a band's pitch (music, 20 Nov): four places, each one player's, each with its own instrument (the fiddle on its stool, the squeezebox on a
  // crate, the tin whistle in the open case, the frame drum by a sack); whoever plays at once adds a part to one tune (94-garden-zz-7act-3music.js)
  busker: { name: 'the band’s pitch', art: 'busker', place: true, onPath: true, w: 2.6, h: 0.45, acts: [{ act: 'play', name: 'the fiddle', stand: [-0.36, 0.5], deg: 90, music: 0 }, { act: 'squeeze', name: 'the squeezebox', stand: [-0.12, 0.62], deg: 90, music: 1 }, { act: 'whistle', name: 'the tin whistle', stand: [0.12, 0.62], deg: 90, music: 2 }, { act: 'drum', name: 'the drum', stand: [0.36, 0.5], deg: 90, music: 3 }], pet: 'music', solid: 'block' },
  /* to read */
  'notice-board': { name: 'the notices', arts: ['board', 'lakeboard', 'cider-board'], paint: 'board', w: 1.6, h: 0.4, words: ['board', 'notice', 'noticeboard'], acts: [{ act: 'read', stand: [0, 0.6], deg: 90 }], pet: 'board' },
  signpost: { name: 'the sign', arts: ['finger'], paint: 'post', w: 0.6, h: 0.3, decor: ['signpost', 'welcome-sign'], words: ['sign', 'signpost', 'finger'], acts: [{ act: 'read', stand: [0, 0.6], deg: 90 }], pet: 'board', top: 40 },
  milestone: { name: 'the milestone', arts: ['mile'], words: ['mile', 'milestone'], acts: [{ act: 'read', stand: [0, 0.6], deg: 90 }], pet: 'board', top: 26, petSeat: 26 },
  /* to look through or pose at */
  telescope: { name: 'the telescope', art: 'scope', place: true, words: ['scope', 'telescope', 'spyglass'], w: 0.8, h: 0.3, acts: [{ act: 'look', stand: [-0.39, 0.06], deg: 0, noProp: true }], pet: 'board', solid: 'block' },   // side on at the eyepiece
  camera: { name: 'the camera', arts: ['tripod'], paint: 'tripod', w: 0.6, h: 0.3, words: ['camera', 'tripod'], acts: [{ act: 'photo', stand: [-0.3, 1.25], deg: 90 }] },
  /* walls to lean on, things to climb */
  wall: { name: 'the wall', arts: ['wall'], decor: ['stone-wall', 'dc-old-wall'], words: ['wall'], acts: [{ act: 'lean', stand: [-0.25, 0.03], deg: 90, pri: 1.2, edge: true }], pet: 'wall', top: 24, petSeat: 24 },   // back to it, right against it; its prompt before a tree's beside it
  stones: { name: 'the stones', arts: ['stones'], words: ['stones', 'standing'], pet: 'wall' },
  lighthouse: { name: 'the lighthouse', arts: ['lighthouse'], decor: ['dc-lighthouse'], words: ['lighthouse'], pet: 'lighthouse', dw: 3.82,
    // the gallery round the lamp room, all the way round, up a long iron ladder on the tower's face (its painter draws the deck and rail)
    levels: [{ id: 'gallery', name: 'the gallery', at: [0, 0], h: 5, shape: { ring: [0.45, 0.235, 0.37, 0.12] }, core: [0.42, 0], rail: { ring: [0.664, 0.265], h: 0.36, post: 0.106, post0: -0.652, mid: false }, ways: [{ by: 'ladder', art: 'ladder', name: 'the lighthouse ladder', foot: [0.34, 0.1], top: [0.34, 0.16] }] }] },
  treehouse: { name: 'the treehouse', arts: ['treehouse'], words: ['treehouse'], pet: 'treehouse',
    // the deck of planks round the trunk, up the painter's own rope ladder: along the rail, in front of the trunk, to the house's door
    levels: [{ id: 'deck', name: 'the treehouse deck', at: [-0.29, 0], h: 2.59, shape: { rect: [-1.3, -0.14, 1.26, 0.12] }, minus: [{ rect: [0.1, -0.3, 1.4, -0.03] }, { ell: [0, -0.08, 0.38, 0.09] }], rail: { line: [-1.45, 1.4, 0.167], h: 0.434, post: 0.2896, post0: -1.4, gap: [-1.27, -0.8], color: '#9a7a54', postW: 2.6, railW: 2.6, mid: false }, ways: [{ by: 'ladder', name: 'the treehouse ladder', foot: [-1.34, 0.12], top: [-1.05, 0.06] }] }] },
  // the old watchtower: up the stair inside it (in at the door, out at the top) to the walk behind its battlements, the west half (the
  // east half is tumbled, a rowan in the gap). front: the battlements, drawn again over your legs as you pass behind them (its painter's
  // own crest, in H from the drawn foot)
  tower: { name: 'the old tower', arts: ['tower'], words: ['watchtower'], pet: 'wall',
    levels: [{ id: 'top', name: 'the tower top', at: [-0.75, -0.1], h: 6.49, shape: { rect: [-0.56, -0.47, 0.4, -0.1] }, minus: [{ rect: [0.1, -0.22, 0.5, 0.1] }],   // (the feet's: half a body in from the west wall's face and the back wall, short of where the crest tumbles at 0.6; kept back from the low broken crest to the east)
      front: { poly: [[-1.545, -6.467], [-1.545, -7.0], [-1.159, -7.0], [-1.159, -6.71], [-0.869, -6.71], [-0.869, -7.046], [-0.483, -7.046], [-0.434, -6.66], [-0.145, -6.515], [0.05, -6.42], [0.05, -6.37], [-1.545, -6.37]], fill: '#a39d8b', line: '#cbc5b1', lineTo: 9 },
      ways: [{ by: 'stair', inside: true, name: 'the tower stair', foot: [0, 0.4], top: [0.25, -0.3], door: { w: 0.63, h: 1.25, up: 0.385 } }] }] },
  hollow: { name: 'the hollow tree', arts: ['hollow'], words: ['hollow'], pet: 'tree' },   // (the pets treat it as a tree: the treehouse's peek needs a window it has not got)
  barn: { name: 'the barn', arts: ['barn'], words: ['barn'], pet: 'hay',
    // the hay loft: a landing of boards out from the loft door up its side, a rail along its front, the ladder up through the rail's gap
    // (the world draws ladder, door and landing from these numbers: rail.own)
    levels: [{ id: 'loft', name: 'the hay loft', at: [1.25, 0.27], h: 1.37, shape: { rect: [-0.07, 0.22, 0.36, 0.52] }, boards: 0.07,
      rail: { line: [-0.33, 0.63, 0.6], h: 0.32, post: 0.24, post0: -0.33, gap: [-0.21, 0.21], color: '#7a5a36', postW: 1.6, railW: 1.9, mid: false, own: true },
      ways: [{ by: 'ladder', art: 'ladder', loft: true, name: 'the hay loft ladder', foot: [1.25, 0.32], top: [0, 0.45] }] }] },
  hay: { name: 'the hay', arts: ['hay'], decor: ['hay-bale'], words: ['hay', 'haybale'], pet: 'hay', top: 38, petSeat: 38 },
  /* water's things */
  pier: { name: 'the pier end', words: ['pier', 'jetty', 'landing'], acts: [{ act: 'dangle', stand: [0, -0.3], deg: 90, pierEnd: true }], pet: 'pier', noPerch: true, solid: 'free' },   // the end of the pier as far as it is built today
  boat: { name: 'the boat', arts: ['boat'], words: ['boat', 'dinghy'], acts: [{ act: 'row', stand: [0.72, 0.2], deg: 180, boat: true, needs: { owns: 'gear:rowing-boat' } }], noPerch: true },   // your own rowing boat takes you out
  falls: { name: 'the falls', arts: ['falls'], words: ['falls', 'waterfall', 'cascade'], acts: [{ act: 'shower', stand: [0, 0.4], deg: 90, reach: 3.4, wade: true }], pet: 'falls', calmsWater: 5 },   // white water near it: no skimming, no ducks
  'fishing-bank': { name: 'the bank', place: true, ground: 'water-edge', w: 1.2, h: 0.3, acts: [{ act: 'fishsit', byFront: { s: 'fishsitfront', e: 'fishsitfront', w: 'fishsitfront' }, stand: [-0.5, 0], deg: 90, edge: true }, { act: 'fishsit', byFront: { s: 'fishsitfront', e: 'fishsitfront', w: 'fishsitfront' }, stand: [0.5, 0], deg: 90, edge: true }], solid: 'free' },   // a worn grassy bank, room for two, legs over the water (its own grass is the seat: nothing drawn). Its front is the water's side, whichever way the shore runs (gardenKindSnap): back to you on a north shore, facing you or side on elsewhere
  rill: { name: 'the spring', arts: ['rill'], words: ['rill', 'spring'], drink: true, noPerch: true },
  reeds: { name: 'the reeds', arts: ['reeds'], words: ['reeds', 'reed'], noPerch: true },
  bridge: { name: 'the bridge', arts: ['bridge'], words: ['bridge'], noPerch: true, solid: 'free' },
  post: { name: 'the post', arts: ['post'], words: ['post', 'mooring'], noPerch: true },
  /* to kick, carry or play with */
  ball: { name: 'the ball', art: 'ball', place: true, w: 0.4, h: 0.2, acts: [{ act: 'kick', stand: [0, -0.3], deg: 90, kick: 'ball' }], pet: 'ball', solid: 'free' },
  'leaf-pile': { name: 'the leaf pile', art: 'leaves', place: true, decor: ['leaf-pile'], w: 1, h: 0.3, acts: [{ act: 'kick', stand: [0, -0.32], deg: 90, kick: 'leaves', needs: { season: 'autumn' } }], pet: 'leaves', solid: 'free' },
  basket: { name: 'the basket', art: 'basket', place: true, decor: ['apple-crate'], w: 0.5, h: 0.2, acts: [{ act: 'carry', stand: [0, 0.36], deg: 90, carry: 'basket' }], pet: 'bed' },
  log: { name: 'the log', art: 'log', place: true, w: 0.8, h: 0.2, acts: [{ act: 'carry', stand: [0, 0.36], deg: 90, carry: 'log' }] },
  /* trees, by what the tree IS (its species, from whichever painter drew it: the walker's trunk list carries it) and its own size:
     a fruit tree is shaken wherever it grows; any tree with a trunk stout enough (big: the trunk's width in cells) is climbed and hidden
     behind, in a wood, a village or on a fell alike; every tree is napped under. A layout or painter that plants a new species needs no code. */
  'fruit-tree': { name: 'the fruit tree', species: ['apple', 'pear', 'perry', 'plum', 'damson', 'gage', 'cherry', 'quince', 'medlar', 'crab', 'fig', 'mulberry', 'cider', 'pippin', 'fruit'], acts: [{ act: 'shake', stand: [0, 0.32], deg: -90 }, { act: 'hide', stand: [-0.02, -0.1], side: 1, edge: true, deg: 90, cells: true, big: 0.3 }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], alt: [[-0.9, 0.45], [0.95, 0.9], [-0.95, 0.9]], deg: 90, cells: true }], pet: 'tree' },
  tree: { name: 'the tree', species: ['*'], acts: [{ act: 'climbtree', stand: [0, 0.3], deg: -90, big: 0.3, edge: true }, { act: 'hide', stand: [-0.02, -0.1], side: 1, edge: true, deg: 90, cells: true, big: 0.28 }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], alt: [[-0.9, 0.45], [0.95, 0.9], [-0.95, 0.9]], deg: 90, cells: true }], pet: 'tree' },
  /* things pets go to (no move of yours yet) */
  ladder: { name: 'the ladder', words: ['ladder'], noPerch: true },   // a ladder standing on its own (a ladder up a building is that building's part)
  'standing-tree': { name: 'the tree', words: ['tree', 'birch', 'oak', 'ash', 'beech', 'rowan', 'alder', 'willow', 'pine', 'yew', 'holly', 'hawthorn', 'chestnut', 'sapling', 'elder', 'lime'], noPerch: true },   // a tree a painter drew as a thing: its moves come from its trunk (the walker's trunk list)
  sundial: { name: 'the sundial', arts: ['sundial'], paint: 'sundial', w: 0.8, h: 0.4, words: ['sundial', 'dial'], pet: 'board', top: 30 },
  postbox: { name: 'the post box', arts: ['postbox'], paint: 'postbox', w: 0.6, h: 0.3, words: ['postbox', 'letterbox', 'mailbox'], noPerch: true },
  maypole: { name: 'the maypole', decor: ['dc-maypole'], words: ['maypole'], pet: 'maypole' },
  mill: { name: 'the mill', arts: ['mill', 'windmill'], decor: ['play-mill', 'windmill'], words: ['mill', 'windmill'], pet: 'mill' },
  stall: { name: 'the stall', arts: ['stall', 'shop', 'tackle'], words: ['stall', 'shop'], pet: 'stall' },
  maze: { name: 'the maze', arts: ['turf', 'maze'], decor: ['box-hedge'], words: ['maze', 'labyrinth', 'turf'], pet: 'maze', noPerch: true },
  'pet-bed': { name: 'the pet bed', art: 'petbed', place: true, words: ['petbed', 'pet-bed', 'pet-basket'], pet: 'bed' },
  slide: { name: 'the slide', art: 'slide', place: true, words: ['slide'], pet: 'slide' },
  sunken: { name: 'the sunken garden', arts: ['sunk', 'sunken'], words: ['sunk'], noPerch: true },
  rope: { name: 'the rope', arts: ['rope'], words: ['rope'], noPerch: true },
  person: { name: 'someone', arts: ['angler'], words: ['angler'], noPerch: true },
  // homes of the vale's folk (94-garden-folk-0rules.js): small homes are placed through layout data (assets/garden/vale-folk.json) and
  // painted into their ground (94-garden-folk-2art.js): a door in a bank with a worn step, a mat and a pipe chimney; a holt in the roots
  // at a water edge. Nobody's home offers you a move of its own: knocking is the folk's (94-garden-folk-4run.js)
  burrow: { name: 'the burrow', art: 'burrow', place: true, w: 2.2, h: 0.5, solid: 'block', noPerch: true, home: true },
  holt: { name: 'the holt', art: 'holt', place: true, w: 2.1, h: 0.45, solid: 'block', noPerch: true, home: true },
  nest: { name: 'the nest', place: true, w: 1, h: 0.4, noPerch: true, home: true },
  tent: { name: 'the tent', place: true, w: 1.6, h: 0.6, solid: 'block', noPerch: true, home: true },
  finds: { name: 'your finds', arts: ['finds', 'museum'], words: ['finds', 'museum'], noPerch: true },
  lamp: { name: 'the lamp', arts: ['lamp', 'lampbox'], paint: 'lamp', w: 0.5, h: 0.3, decor: ['lantern'], words: ['lamp'], top: 33 },
  /* known, nothing to do yet: listed so the audit does not call them unknown */
  scenery: { name: 'the rock', words: ['stone', 'rock', 'boulder', 'block', 'bollard', 'buoy', 'shingle', 'haze', 'ruin', 'crutch', 'posternpier', 'gatepier', 'plinth', 'crate', 'crates', 'pots', 'net', 'anchor', 'face', 'hatch', 'fence', 'baskets', 'sacks', 'barrel', 'barrels', 'hurdle', 'gap', 'water', 'brick', 'hedge', 'oldman', 'wallend', 'foot', 'weir', 'haze'], noPerch: true },   // the land's own stones and the harbour's clutter: nothing to do
  building: { name: 'the building', arts: ['hall', 'oldhouse', 'summer', 'boathouse', 'hide', 'smoke', 'shepherd', 'ice', 'grotto', 'temple', 'folly', 'hull', 'lectern', 'smoker', 'bench', 'cross', 'statue', 'topiary', 'gate', 'cairn', 'barrels', 'boles', 'beacon', 'warren', 'ring', 'frogstone', 'drift', 'cart', 'office', 'thatched-cottage', 'arch', 'bandstand', 'barrel', 'boots', 'circle', 'dew', 'help', 'kettle', 'lookout', 'moon', 'oak', 'observatory', 'rack', 'rg-fields', 'rg-garden', 'rg-hill', 'rg-lake', 'rg-marsh', 'rg-orchards', 'scarecrow', 'shelf', 'skeps', 'stars', 'stone', 'worms', 'chest'],
    words: ['house', 'hut', 'cottage', 'hall', 'office', 'tower', 'shed', 'folly', 'temple', 'grotto', 'icehouse', 'hide', 'beacon', 'cairn', 'cross', 'statue', 'journal', 'barrels', 'boles', 'warren', 'ring', 'frog', 'driftwood', 'hull', 'smoker', 'craft', 'press', 'bothy', 'toposcope', 'gate', 'box', 'arch', 'lamp', 'clamp', 'smoke', 'woodshed', 'quince', 'pippin', 'woodhut', 'oldhouse', 'labyrinth', 'boathouse', 'chapel', 'sunk'] },
});
/** Ground, read from the layout's own cells: what each type offers you and your pet. */
const GARDEN_TERRAIN = Object.freeze({
  'water-edge': { acts: [{ act: 'feed', name: 'the ducks' }, { act: 'skim', name: 'still water', calm: true }], pets: ['drink', 'paddle', 'fish-watch'] },   // (they take turns: do one and the other is offered)
  deep: { acts: [{ act: 'swim', name: 'the water' }], pets: ['swim'] },
  'open-grass': { acts: [{ act: 'lie' }, { act: 'nap' }, { act: 'angel', needs: { season: 'winter' } }], pets: ['roll', 'nap', 'dig', 'chase'] },   // short grass with open sky above
  sand: { acts: [{ act: 'lie' }, { act: 'nap' }], pets: ['dig', 'roll'] },
  snow: { acts: [{ act: 'angel' }], pets: ['roll', 'snow'] },
  slope: { acts: [], pets: ['roll'] },   // ground you walk on that rises (gardenRiseAt): a cell's `slope`, or a walkable 'hill'/'slope' landform
  puddle: { acts: [], pets: ['puddle'], after: 'rain' },   // open soil or grass after rain
  path: { acts: [], pets: [] },
});
/** Anywhere on open ground (the moves wheel). */
const GARDEN_ACT_GROUND = Object.freeze(['lie', 'nap', 'laugh', 'throwstick', 'rub']);
/** Every kind's pets word -> the kinds that count as it (built once). */
const GARDEN_KIND_BY_PET = Object.freeze(Object.entries(GARDEN_KINDS).reduce((o, [k, v]) => { if (v.pet) (o[v.pet] || (o[v.pet] = [])).push(k); return o; }, {}));
const _GK_ART = new Map(), _GK_DECOR = new Map(), _GK_EFFECT = new Map(), _GK_SPECIES = [], _GK_WORDS = [];
for (const [k, v] of Object.entries(GARDEN_KINDS)) {
  for (const a of v.arts || []) if (!_GK_ART.has(a)) _GK_ART.set(a, k);
  for (const d of v.decor || []) if (!_GK_DECOR.has(d)) _GK_DECOR.set(d, k);
  for (const e of v.effects || []) if (!_GK_EFFECT.has(e)) _GK_EFFECT.set(e, k);
  for (const t of v.species || []) if (t !== '*') _GK_SPECIES.push([t, k]);
  if (k !== 'building') for (const w of v.words || []) _GK_WORDS.push([w, k]);
}
for (const w of GARDEN_KINDS.building.words) _GK_WORDS.push([w, 'building']);   // (last: a 'bench-house' is a bench before it is a house)
/** The kind of a thing: { kind (a layout or player's own word), art (its painter's drawing), decor (a decoration id), effect, id }.
 *  '' when nothing says (the audit lists it; it offers nothing and never breaks anything). */
function gardenKindOf(t) {   // t.head: only the last word counts (a painter's 'chapel stone' is a stone, not a chapel)
  if (!t) return '';
  if (t.kind && GARDEN_KINDS[t.kind]) return t.kind;
  const art = String(t.art || '').replace(/^l[df]-/, '');
  if (art && _GK_ART.has(art)) return _GK_ART.get(art);
  if (t.decor && _GK_DECOR.has(t.decor)) return _GK_DECOR.get(t.decor);
  if (t.effect && _GK_EFFECT.has(t.effect)) return _GK_EFFECT.get(t.effect);
  if (t.tree != null) return gardenTreeKind(t.tree);
  const id = String(t.id || '').toLowerCase().split('|')[0].replace(/^(ld|lf|dc|ga|rw)-/, '').replace(/-\d+$/, '');
  const toks = id.split(/[^a-z]+/).filter(w => w.length > 1), flat = toks.join('');
  // the last word names the thing ('jetty-post' is a post, 'quince-house' a house), then a word inside one ('woodbench', 'vseat')
  for (const [w, k] of _GK_WORDS) if (flat === w) return k;
  // (a word's end names the thing: 'vseat' is a seat, 'beaconfire' a fire; a word's start only for a long word: 'ringbirch' is no ring)
  for (const tk of (t.head ? toks.slice(-1) : toks.slice().reverse())) { for (const [w, k] of _GK_WORDS) if (tk === w) return k; for (const [w, k] of _GK_WORDS) if (w.length >= 4 && tk.length > w.length && tk.endsWith(w)) return k; for (const [w, k] of _GK_WORDS) if (w.length >= 6 && tk.length > w.length && tk.startsWith(w)) return k; }
  return '';
}
/** A painted tree's kind from its species (any painter's name for it: 'apple', 'tree.green-birch', 'pine'), never from who drew it:
 *  a kind whose `species` names a word of it, else the kind with '*' (any tree). A trunk list's rock (a pass's boulder) is no tree: ''. */
function gardenTreeKind(sp) {
  const toks = String(sp || '').toLowerCase().replace(/^tree\./, '').split(/[^a-z]+/).filter(Boolean);
  if (toks.some(w => /^(rock|boulder|stone|stones|wall|hedge|falls|water|post)$/.test(w))) return '';   // (nor a hedge bank, a wall's course or a falling sheet of water: blocks in the same list, no tree)
  for (const w of toks) for (const [s, k] of _GK_SPECIES) if (w === s) return k;
  for (const [k, v] of Object.entries(GARDEN_KINDS)) if ((v.species || []).includes('*')) return k;
  return '';
}
/** Turn a vector laid out for a front facing the camera (90) round to a thing whose front faces `front` degrees. */
function _gkTurn(dx, dy, front) {
  const a = ((front == null ? 90 : front) - 90) * Math.PI / 180; if (!a) return [dx, dy];
  const c = Math.cos(a), s = Math.sin(a); return [dx * c - dy * s, dx * s + dy * c];
}
/** What a thing offers, placed: [{ act, name, x, y (the thing, or the part), stand {x, y}, deg, ...its act row }]. t: { id, kind, x, y (its
 *  foot's middle, cells), w (its width, cells), front }. Pure: the audit calls it on any layout. */
function gardenKindSpots(t) {
  const K = GARDEN_KINDS[t.kind]; if (!K || !K.acts) return [];
  const w = t.w || K.w || 1, out = [];
  K.acts.forEach((a, i) => {
    const sx = a.cells ? a.stand[0] : a.stand[0] * w, [ox, oy] = _gkTurn(sx, a.stand[1], t.front);
    const p = a.at ? _gkTurn(a.at[0] * w, a.at[1], t.front) : [0, 0];
    const fr = t.front == null ? 90 : ((t.front % 360) + 360) % 360, side = fr > 225 && fr < 315 ? 'n' : fr >= 45 && fr <= 135 ? 's' : fr > 135 && fr <= 225 ? 'w' : 'e';
    const act = a.byFront && a.byFront[side] ? a.byFront[side] : a.act;   // (a move whose pose depends on which way the thing faces: sat on a north bank, back to you; on a south bank, facing you)
    out.push(Object.assign({}, a, { act, kind: t.kind, i, name: a.name || K.name, x: t.x + p[0], y: t.y + p[1], stand: { x: t.x + ox, y: t.y + oy }, deg: a.deg == null ? null : a.deg + ((t.front == null ? 90 : t.front) - 90) }));
  });
  return out;
}
/** Does a spot's `needs` hold now? ctx: { season, night, level, has(id) -> n }. */
function gardenKindNeedsOk(needs, ctx) {
  if (!needs) return true; ctx = ctx || {};
  if (needs.season && ctx.season && ctx.season !== needs.season) return false;
  if (needs.winter && ctx.season && ctx.season !== 'winter') return false;
  if (needs.time === 'night' && ctx.night === false) return false;
  if (needs.time === 'day' && ctx.night === true) return false;
  if (needs.level && ctx.level != null && ctx.level < needs.level) return false;
  return true;   // (owning a thing is asked when you use it: the prompt says where to get one)
}
/** A placed thing's foot moved to the ground its kind needs (K.ground), within 4 cells: { x, y, moved, front } or null when there is none.
 *  'water-edge': the foot on the bank's lip with the water just in front, on ANY side: front is the way it faces (the water): -90 north,
 *  90 south (towards you), 0 east, 180 west. A row's own `front` is kept when that side has water. wet(x, y) -> is it water there.
 *  Pure: the game and the audit both call it. */
function gardenKindSnap(kind, x, y, w, wet, front) {
  const K = GARDEN_KINDS[kind]; if (!K || K.ground !== 'water-edge') return { x, y, moved: false };
  const hw = (w || K.w || 1) / 2, D = [[-90, 0, -1], [90, 0, 1], [0, 1, 0], [180, -1, 0]];
  const want = front == null ? null : ((Math.round(front) % 360) + 540) % 360 - 180;
  const order = want == null ? D : D.slice().sort((a, b) => (a[0] === want ? -1 : 0) - (b[0] === want ? -1 : 0));
  // along the shore (px, py) the thing's width, the water out in front (dx, dy): dry under it, wet half a cell out and further out
  const ok = (px, py, d) => { const ax = -d[2], ay = d[1], q = (s, o) => [px + ax * hw * s + d[1] * o, py + ay * hw * s + d[2] * o]; return !wet(...q(0, 0)) && !wet(...q(-1, 0)) && !wet(...q(1, 0)) && wet(...q(0, 0.5)) && wet(...q(-1, 0.5)) && wet(...q(1, 0.5)) && wet(...q(0, 1.6)); };
  for (const d of order) if (ok(x, y, d)) return { x, y, moved: false, front: d[0] };
  let best = null;
  // the row's own side first (a bank the layout says faces north stays on a north shore when there is one within reach), then any side
  for (const set of want == null ? [D] : [D.filter(d => d[0] === want), D]) { let bd = 4.01; for (let dy = -4; dy <= 4; dy += 0.1) for (let dx = -4; dx <= 4; dx += 0.25) { const dd = Math.hypot(dx, dy); if (dd >= bd) continue; for (const d of set) if (ok(x + dx, y + dy, d)) { bd = dd; best = { x: x + dx, y: y + dy, moved: true, front: d[0], d }; break; } } if (best) break; }
  if (best) { const d = best.d; let k = 0; while (k < 25 && !wet(best.x + d[1] * (k * 0.02 + 0.14), best.y + d[2] * (k * 0.02 + 0.14))) k++; best.x = Math.round((best.x + d[1] * k * 0.02) * 100) / 100; best.y = Math.round((best.y + d[2] * k * 0.02) * 100) / 100; delete best.d; }   // (right up to the lip)
  return best;
}
/** Which way the ground you walk on rises at (x, y), read from the layout's own data, never a region's name: { x, y, hill } a unit vector
 *  uphill, or null on the flat. Pure: the game (gardenTerrainUp) and the audit both call it. cellAt(x, y) -> the layout's cell.
 *  - a cell's own `slope` (true: up to the north as the camera sees it, or [dx, dy]);
 *  - inside a landform you can walk on (not col 'full') whose kind or id says hill or slope: its own `slope` ([dx, dy]) if it has one,
 *    else up towards its middle.
 *  A mountain, a cliff, a scarp or a wall that stops the feet is no slope: the ground beside it is painted flat, on either side. */
function gardenRiseAt(D, cellAt, x, y) {
  let c = null; try { c = cellAt(x, y); } catch (e) { c = null; }
  if (c && c.slope) { const v = Array.isArray(c.slope) ? c.slope : [0, -1], l = Math.hypot(v[0], v[1]) || 1; return { x: v[0] / l, y: v[1] / l, hill: true }; }
  for (const L of (D && D.landforms) || []) {
    const P = L.polygon; if (L.col === 'full' || !Array.isArray(P) || P.length < 3 || !/hill|slope|rise|brae|bank/i.test(String(L.kind || '') + ' ' + String(L.id || ''))) continue;
    let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1] || 1e-9) + a[0]) inside = !inside; }
    if (!inside) continue;
    if (Array.isArray(L.slope)) { const l = Math.hypot(L.slope[0], L.slope[1]) || 1; return { x: L.slope[0] / l, y: L.slope[1] / l, hill: true }; }
    let mx = 0, my = 0; for (const q of P) { mx += q[0]; my += q[1]; } mx /= P.length; my /= P.length;
    const l = Math.hypot(mx - x, my - y); return l > 0.5 ? { x: (mx - x) / l, y: (my - y) / l, hill: true } : null;
  }
  return null;
}
/** Can a thing of this kind placed through layout data be seen? Its own drawing (art, and the drawings table has it when one is given),
 *  a painter that draws it (paint), or ground it is made of (a bank). Pure: the game (with _GAW_ART) and the audit (the same table) ask. */
function gardenKindDrawable(kind, arts) {
  const K = GARDEN_KINDS[kind]; if (!K) return false;
  if (K.paint || K.ground) return true;
  if (!K.art) return false;
  return arts ? !!(arts[K.art] || (typeof VALE_FOLK_ART !== 'undefined' && VALE_FOLK_ART[K.art])) : true;   // (the folk's small homes: 94-garden-folk-2art.js)
}
/** Do two things' boxes meet AS DRAWN? Each is { foot middle x, foot y, width w, height h } in cells; a drawing reaches a little past its
 *  footprint every way (a fire's ring of stones and its shadow below its foot, a log's ends), so a margin keeps them apart. Pure. */
const GARDEN_DRAWN_MARGIN = 0.25;
function gardenKindBoxesMeet(x, y, w, h, ox, oy, ow, oh) {
  const m = GARDEN_DRAWN_MARGIN;
  return x + w / 2 + m > ox - ow / 2 && x - w / 2 - m < ox + ow / 2 && y + m > oy - oh && y - h - m < oy + m;
}
/** Is (x, y) on a garden plot of the layout (D.sectionCells: the land a player opens and plants, with its drawn edge of dry stone, hedge or
 *  kerb), or within m cells of one's edge? A placed thing is never laid on someone's plot or on its wall. Pure: the game and the audit ask. */
const _gkSec = { D: null, set: null };
function gardenPlotNear(D, x, y, m) {
  if (!D || !D.sectionCells) return false;
  if (_gkSec.D !== D) { const set = new Set(); for (const cells of Object.values(D.sectionCells)) for (const c of cells || []) if (Array.isArray(c)) set.add(c[0] + ',' + c[1]); _gkSec.D = D; _gkSec.set = set; }
  const S = _gkSec.set, r = m || 0;
  for (const [dx, dy] of [[0, 0], [-r, 0], [r, 0], [0, -r], [0, r], [-r, -r], [r, -r], [-r, r], [r, r]]) if (S.has(Math.floor(x + dx) + ',' + Math.floor(y + dy))) return true;
  return false;
}

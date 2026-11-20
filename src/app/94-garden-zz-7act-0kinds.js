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
     trunks    the tree painters (_gwPaintedTrunks src) whose trees are this kind
     acts      [{ act (GARDEN_ACTS id), name?, stand [u, dy], deg, seat, edge, reach, pri, noProp, needs, at, art, drawn, top, loft, side, big }]
                 wade: the stand point is in shallow water on purpose (under falls).
     stand: where you stand. u is a share of the thing's own width from its middle (so a bench twice as long puts you at the same
                 place along it), dy cells in front of its foot line (negative: on or behind it). deg the way you face (0 east, 90 south,
                 180 west, -90 north) for a thing whose front faces the camera; a thing laid with `front` turned round turns both.
                 at + art: a part this branch draws on the thing (a ladder up a lighthouse's side), at [u, dy] like stand; drawn: false when the
                 thing's own painter draws it. needs: { season, time ('day' | 'night'), level, owns (a gear id), winter }
     art       the drawing of a placeable thing (94-garden-zz-7act-2world.js _GAW_ART): a thing of this kind is placed in the layout's data
     place     true: a thing placed through layout data (assets/garden/vale-things.json, or a layout's own `things`), not drawn by a painter
     w, h      a placeable thing's footprint in cells when its row gives none
     pet       the pets' word for it (PET_LIFE rows' `at`: 'bench', 'well', 'fire' ...); drink: a pet drinks there; warm: a pet warms itself;
     noPerch   a pet never stands on top of it; top / petSeat: px up where a perched / sat pet's feet go
     solid     what the audit expects of its ground: 'free' (you walk on it) or 'block'
   }
   GARDEN_TERRAIN[type] = { acts, pets }: what ground of that type offers, read from the layout's cells (94-garden-zz-7act-0scan.js
     gardenTerrainAt): no coordinates anywhere.
   Pure data and pure functions above the line: tools/affordance-audit.mjs evaluates this file as it is, on any layout's json.
   ============================================================ */
const GARDEN_KINDS = Object.freeze({
  /* seats */
  bench: { name: 'the bench', arts: ['seat'], decor: [], words: ['bench', 'seat', 'settle', 'pew'], acts: [{ act: 'sit', stand: [0, -0.16], deg: 90, seat: 0.36 }], pet: 'bench', top: 28, petSeat: 15 },   // seat: the seat's height as drawn, a share of the figure's height
  seat: { name: 'the seat', effects: ['sit'], decor: ['bench', 'stone-bench', 'driftwood-seat', 'deckchair', 'bistro-set', 'picnic-blanket', 'gazebo', 'dc-tea-table'], acts: [{ act: 'sit', stand: [0, 0.06], deg: 90, seat: 0.45 }], pet: 'bench' },
  chair: { name: 'the chair', decor: ['play-chair'], words: ['chair'], acts: [{ act: 'sit', stand: [0, 0.06], deg: 90, seat: 0.45 }], pet: 'chair' },
  swing: { name: 'the swing', decor: ['swing-seat'], words: ['swing'], acts: [{ act: 'sit', stand: [0, 0.06], deg: 90, seat: 0.45 }], pet: 'swing' },
  hammock: { name: 'the hammock', decor: ['hammock'], words: ['hammock'], acts: [{ act: 'sit', stand: [0, 0.06], deg: 90, seat: 0.45 }], pet: 'swing' },
  picnic: { name: 'the picnic rug', arts: ['picnic'], words: ['picnic'], pet: 'bench', top: 22, petSeat: 22 },
  stump: { name: 'the stump', arts: ['stump'], words: ['stump'], acts: [{ act: 'sit', stand: [-0.1, 0.45], deg: 90, seat: 0.9 }], pet: 'stump', top: 24, petSeat: 24 },   // up on the top, legs down the front
  'log-seat': { name: 'the log', art: 'logseat', place: true, w: 1.8, h: 0.4, acts: [{ act: 'sit', stand: [0, 0.12], deg: 90, seat: 0.42 }], pet: 'stump', solid: 'block' },   // a log laid by a fire to sit on
  'log-pile': { name: 'the log pile', decor: ['log-pile', 'rw-orn-logs'], words: ['logpile'], pet: 'stump' },
  /* water you work, wish in or drink from */
  pump: { name: 'the pump', arts: ['pump'], decor: ['water-pump'], words: ['pump'], acts: [{ act: 'pump', stand: [-0.74, 0.12], deg: 0, edge: true }], pet: 'pump', drink: true },   // side on at the lever's end
  well: { name: 'the wishing well', arts: ['wish'], words: ['well', 'wish'], acts: [{ act: 'wish', stand: [0.45, 0.95], deg: -90, reach: 3.2 }], pet: 'well', drink: true },
  'garden-well': { name: 'the well', decor: ['wishing-well'], effects: ['wish'], acts: [{ act: 'wish', stand: [0, 0.5], deg: -90 }], pet: 'well', drink: true },
  'village-well': { name: 'the well', arts: ['well'], pet: 'well', drink: true },   // a well with its own use (draw a bucket): the pets drink there
  trough: { name: 'the trough', arts: ['churn'], decor: ['water-butt', 'dc-milk-churns'], words: ['trough', 'churn'], pet: 'trough', drink: true },
  bath: { name: 'the bird bath', arts: ['fountain'], decor: ['bird-bath', 'fountain', 'mini-pond'], words: ['fountain', 'birdbath'], pet: 'bath', drink: true },
  /* fire */
  campfire: { name: 'the campfire', art: 'fire', place: true, w: 1, h: 0.4, acts: [{ act: 'warm', stand: [0, -0.68], deg: 90 }], pet: 'fire', warm: true, noPerch: true, solid: 'block' },   // back from the ring of stones, the flames clear of your feet
  fire: { name: 'the fire', arts: ['clamp'], decor: ['fire-pit', 'dc-clay-oven', 'dc-cauldron'], words: ['firepit', 'brazier'], pet: 'fire', warm: true, noPerch: true },
  /* things that ring, play or chime */
  chapel: { name: 'the chapel bell', arts: ['chapel'], words: ['chapel'], acts: [{ act: 'bell', stand: [0, 0.6], deg: -90 }], pet: 'bell' },
  bell: { name: 'the bell', art: 'bell', place: true, words: ['bell'], acts: [{ act: 'bell', stand: [0, 0.6], deg: -90 }], pet: 'bell' },   // a ship's bell on a post (no drawing yet: offers nothing until one is drawn)
  chime: { name: 'the wind chimes', decor: ['wind-chimes', 'can-chimes'], words: ['chime', 'chimes'], pet: 'chime' },
  'music-box': { name: 'the music box', art: 'musicbox', place: true, decor: ['dc-gramophone'], words: ['music', 'gramophone'], pet: 'music' },
  busker: { name: 'the fiddle', art: 'busker', place: true, w: 1.2, h: 0.4, acts: [{ act: 'play', stand: [0.75, 0.25], deg: 90 }], pet: 'music', solid: 'block' },   // a stool, an open fiddle case with a few coins, the fiddle on the stool
  /* to read */
  'notice-board': { name: 'the notices', arts: ['board', 'lakeboard', 'cider-board'], words: ['board', 'notice', 'noticeboard'], acts: [{ act: 'read', stand: [0, 0.6], deg: 90 }], pet: 'board' },
  signpost: { name: 'the sign', arts: ['finger'], decor: ['signpost', 'welcome-sign'], words: ['sign', 'signpost', 'finger'], acts: [{ act: 'read', stand: [0, 0.6], deg: 90 }], pet: 'board', top: 40 },
  milestone: { name: 'the milestone', arts: ['mile'], words: ['mile', 'milestone'], acts: [{ act: 'read', stand: [0, 0.6], deg: 90 }], pet: 'board', top: 26, petSeat: 26 },
  /* to look through or pose at */
  telescope: { name: 'the telescope', art: 'scope', place: true, w: 0.8, h: 0.3, acts: [{ act: 'look', stand: [-0.39, 0.06], deg: 0, noProp: true }], pet: 'board', solid: 'block' },   // side on at the eyepiece
  camera: { name: 'the camera', arts: ['tripod'], words: ['camera', 'tripod'], acts: [{ act: 'photo', stand: [-0.3, 1.25], deg: 90 }] },
  /* walls to lean on, things to climb */
  wall: { name: 'the wall', arts: ['wall'], decor: ['stone-wall', 'dc-old-wall'], words: ['wall'], acts: [{ act: 'lean', stand: [-0.25, 0.03], deg: 90, pri: 1.2, edge: true }], pet: 'wall', top: 24, petSeat: 24 },   // back to it, right against it; its prompt before a tree's beside it
  stones: { name: 'the stones', arts: ['stones'], words: ['stones', 'standing'], pet: 'wall' },
  lighthouse: { name: 'the lighthouse', arts: ['lighthouse'], decor: ['dc-lighthouse'], words: ['lighthouse'], pet: 'lighthouse',
    acts: [{ act: 'ladder', name: 'the lighthouse ladder', at: [0.22, 0.13], art: 'ladder', stand: [0.22, 0.16], deg: -90, noProp: true }] },   // a ladder up its side to a plank landing with a rail
  treehouse: { name: 'the treehouse', arts: ['treehouse'], words: ['treehouse'], pet: 'treehouse',
    acts: [{ act: 'ladderhi', name: 'the treehouse ladder', at: [0.175, 0.2], drawn: false, stand: [0.175, 0.23], deg: -90, noProp: true, edge: true }] },   // (the treehouse's own painter draws its ladder)
  hollow: { name: 'the hollow tree', arts: ['hollow'], words: ['hollow'], pet: 'treehouse' },
  barn: { name: 'the barn', arts: ['barn'], words: ['barn'], pet: 'hay',
    acts: [{ act: 'ladderlo', name: 'the hay loft ladder', at: [0.3667, 0.37], art: 'ladder', top: 96, loft: true, stand: [0.3667, 0.4], deg: -90, noProp: true, edge: true }] },
  hay: { name: 'the hay', arts: ['hay'], decor: ['hay-bale'], words: ['hay', 'haybale'], pet: 'hay', top: 38, petSeat: 38 },
  /* water's things */
  pier: { name: 'the pier end', words: ['pier', 'jetty'], acts: [{ act: 'dangle', stand: [0, -0.3], deg: 90, pierEnd: true }], pet: 'pier', noPerch: true, solid: 'free' },   // the end of the pier as far as it is built today
  boat: { name: 'the boat', arts: ['boat'], words: ['boat', 'dinghy'], acts: [{ act: 'row', stand: [0.72, 0.2], deg: 180, boat: true, needs: { owns: 'gear:rowing-boat' } }], noPerch: true },   // your own rowing boat takes you out
  falls: { name: 'the falls', arts: ['falls'], words: ['falls', 'waterfall', 'cascade'], acts: [{ act: 'shower', stand: [0, 0.4], deg: 90, reach: 3.4, wade: true }], pet: 'falls', calmsWater: 5 },   // white water near it: no skimming, no ducks
  'fishing-bank': { name: 'the bank', place: true, w: 1.2, h: 0.3, acts: [{ act: 'fishsit', stand: [-0.5, 0], deg: -90, edge: true }, { act: 'fishsit', stand: [0.5, 0], deg: -90, edge: true }], solid: 'free' },   // a worn grassy bank, room for two, legs over the water (its own grass is the seat: nothing drawn)
  rill: { name: 'the spring', arts: ['rill'], words: ['rill', 'spring'], drink: true, noPerch: true },
  reeds: { name: 'the reeds', arts: ['reeds'], words: ['reeds', 'reed'], noPerch: true },
  bridge: { name: 'the bridge', arts: ['bridge'], words: ['bridge'], noPerch: true, solid: 'free' },
  post: { name: 'the post', arts: ['post'], words: ['post', 'mooring'], noPerch: true },
  /* to kick, carry or play with */
  ball: { name: 'the ball', art: 'ball', place: true, w: 0.4, h: 0.2, acts: [{ act: 'kick', stand: [0, -0.3], deg: 90, kick: 'ball' }], pet: 'ball', solid: 'free' },
  'leaf-pile': { name: 'the leaf pile', art: 'leaves', place: true, decor: ['leaf-pile'], w: 1, h: 0.3, acts: [{ act: 'kick', stand: [0, -0.32], deg: 90, kick: 'leaves', needs: { season: 'autumn' } }], pet: 'leaves', solid: 'free' },
  basket: { name: 'the basket', art: 'basket', place: true, decor: ['apple-crate'], w: 0.5, h: 0.2, acts: [{ act: 'carry', stand: [0, 0.36], deg: 90, carry: 'basket' }], pet: 'bed' },
  log: { name: 'the log', art: 'log', place: true, w: 0.8, h: 0.2, acts: [{ act: 'carry', stand: [0, 0.36], deg: 90, carry: 'log' }] },
  /* trees, by the painter that drew them (the walker's trunk list) */
  'fruit-tree': { name: 'the fruit tree', trunks: ['orchard'], acts: [{ act: 'shake', stand: [0, 0.32], deg: -90 }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90, cells: true }], pet: 'tree' },
  'climbable-tree': { name: 'the tree', trunks: ['wood'], acts: [{ act: 'climbtree', stand: [0, 0.3], deg: -90, big: 0.3 }, { act: 'hide', stand: [-0.02, -0.1], side: 1, edge: true, deg: 90, cells: true }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90, cells: true }], pet: 'tree' },
  tree: { name: 'the tree', trunks: ['village'], acts: [{ act: 'hide', stand: [-0.02, -0.1], side: 1, edge: true, deg: 90, cells: true }, { act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90, cells: true }], pet: 'tree' },
  'fell-tree': { name: 'the tree', trunks: ['fells'], acts: [{ act: 'nap', name: 'under the tree', stand: [0.9, 0.45], deg: 90, cells: true }], pet: 'tree' },
  /* things pets go to (no move of yours yet) */
  maypole: { name: 'the maypole', decor: ['dc-maypole'], words: ['maypole'], pet: 'maypole' },
  mill: { name: 'the mill', arts: ['mill', 'windmill'], decor: ['play-mill', 'windmill'], words: ['mill', 'windmill'], pet: 'mill' },
  stall: { name: 'the stall', arts: ['stall', 'shop', 'tackle'], words: ['stall', 'shop'], pet: 'stall' },
  maze: { name: 'the maze', arts: ['turf', 'maze'], decor: ['box-hedge'], words: ['maze', 'labyrinth', 'turf'], pet: 'maze', noPerch: true },
  'pet-bed': { name: 'the pet bed', art: 'petbed', place: true, words: ['petbed', 'pet-bed', 'pet-basket'], pet: 'bed' },
  slide: { name: 'the slide', art: 'slide', place: true, words: ['slide'], pet: 'slide' },
  sunken: { name: 'the sunken garden', arts: ['sunk', 'sunken'], words: ['sunk'], noPerch: true },
  rope: { name: 'the rope', arts: ['rope'], words: ['rope'], noPerch: true },
  person: { name: 'someone', arts: ['angler'], words: ['angler'], noPerch: true },
  finds: { name: 'your finds', arts: ['finds', 'museum'], words: ['finds', 'museum'], noPerch: true },
  lamp: { name: 'the lamp', arts: ['lamp', 'lampbox'], decor: ['lantern'], words: ['lamp'], top: 33 },
  /* known, nothing to do yet: listed so the audit does not call them unknown */
  building: { name: 'the building', arts: ['hall', 'oldhouse', 'summer', 'boathouse', 'hide', 'tower', 'smoke', 'shepherd', 'ice', 'grotto', 'temple', 'folly', 'hull', 'postbox', 'lectern', 'smoker', 'bench', 'sundial', 'cross', 'statue', 'topiary', 'gate', 'cairn', 'barrels', 'boles', 'beacon', 'warren', 'ring', 'frogstone', 'drift', 'cart', 'office', 'thatched-cottage', 'arch', 'bandstand', 'barrel', 'boots', 'circle', 'dew', 'help', 'kettle', 'lookout', 'moon', 'oak', 'observatory', 'rack', 'rg-fields', 'rg-garden', 'rg-hill', 'rg-lake', 'rg-marsh', 'rg-orchards', 'scarecrow', 'shelf', 'skeps', 'stars', 'stone', 'worms', 'chest'],
    words: ['house', 'hut', 'cottage', 'hall', 'office', 'tower', 'shed', 'folly', 'temple', 'grotto', 'icehouse', 'hide', 'beacon', 'cairn', 'cross', 'statue', 'sundial', 'journal', 'barrels', 'boles', 'warren', 'ring', 'frog', 'driftwood', 'hull', 'smoker', 'craft', 'press', 'bothy', 'toposcope', 'gate', 'box', 'arch', 'lamp', 'clamp', 'smoke', 'woodshed', 'quince', 'pippin', 'woodhut', 'oldhouse', 'labyrinth', 'boathouse', 'chapel', 'sunk'] },
});
/** Ground, read from the layout's own cells: what each type offers you and your pet. */
const GARDEN_TERRAIN = Object.freeze({
  'water-edge': { acts: [{ act: 'feed', name: 'the ducks' }, { act: 'skim', name: 'still water', calm: true }], pets: ['drink', 'paddle', 'fish-watch'] },   // (they take turns: do one and the other is offered)
  deep: { acts: [{ act: 'swim', name: 'the water' }], pets: ['swim'] },
  'open-grass': { acts: [{ act: 'lie' }, { act: 'nap' }, { act: 'angel', needs: { season: 'winter' } }], pets: ['roll', 'nap', 'dig', 'chase'] },   // short grass with open sky above
  sand: { acts: [{ act: 'lie' }, { act: 'nap' }], pets: ['dig', 'roll'] },
  snow: { acts: [{ act: 'angel' }], pets: ['roll', 'snow'] },
  slope: { acts: [], pets: ['roll'] },   // (no layout has slope cells yet: a `slope` on a cell, or a 'slope'/'hill' landform, makes one)
  puddle: { acts: [], pets: ['puddle'], after: 'rain' },   // open soil or grass after rain
  path: { acts: [], pets: [] },
});
/** Anywhere on open ground (the moves wheel). */
const GARDEN_ACT_GROUND = Object.freeze(['lie', 'nap', 'laugh', 'throwstick', 'rub']);
/** Every kind's pets word -> the kinds that count as it (built once). */
const GARDEN_KIND_BY_PET = Object.freeze(Object.entries(GARDEN_KINDS).reduce((o, [k, v]) => { if (v.pet) (o[v.pet] || (o[v.pet] = [])).push(k); return o; }, {}));
const _GK_ART = new Map(), _GK_DECOR = new Map(), _GK_EFFECT = new Map(), _GK_TRUNK = new Map(), _GK_WORDS = [];
for (const [k, v] of Object.entries(GARDEN_KINDS)) {
  for (const a of v.arts || []) if (!_GK_ART.has(a)) _GK_ART.set(a, k);
  for (const d of v.decor || []) if (!_GK_DECOR.has(d)) _GK_DECOR.set(d, k);
  for (const e of v.effects || []) if (!_GK_EFFECT.has(e)) _GK_EFFECT.set(e, k);
  for (const t of v.trunks || []) _GK_TRUNK.set(t, k);
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
  if (t.trunk && _GK_TRUNK.has(t.trunk)) return _GK_TRUNK.get(t.trunk);
  const id = String(t.id || '').toLowerCase().replace(/^(ld|lf|dc|ga|rw)-/, '').replace(/-\d+$/, '');
  const toks = id.split(/[^a-z]+/).filter(Boolean), flat = toks.join('');
  // the last word names the thing ('jetty-post' is a post, 'quince-house' a house), then a word inside one ('woodbench', 'vseat')
  for (const [w, k] of _GK_WORDS) if (flat === w) return k;
  for (const tk of (t.head ? toks.slice(-1) : toks.slice().reverse())) { for (const [w, k] of _GK_WORDS) if (tk === w) return k; for (const [w, k] of _GK_WORDS) if (w.length >= 4 && tk.length > w.length && (tk.endsWith(w) || tk.startsWith(w))) return k; }
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
    out.push(Object.assign({}, a, { kind: t.kind, i, name: a.name || K.name, x: t.x + p[0], y: t.y + p[1], stand: { x: t.x + ox, y: t.y + oy }, deg: a.deg == null ? null : a.deg + ((t.front == null ? 90 : t.front) - 90) }));
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

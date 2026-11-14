// The scene factory's ARCHETYPES (docs/dev/SCENE_FACTORY.md 3): each one is distilled from a scene at the bar (Fleet Pond 2,
// Manchester Albert Square, Castlefield Basin) and owns what made it good: the camera (eye, lens, horizon), the leading line to the
// subject, the framing on both sides, the dressed near band, a mover in the far band in the first seconds and life in the near-mid
// band. It takes a SHORT brief and emits a v3 spec (79-world-0core.js validates it, worldBuild fills it). Placement is frame-relative
// (frame.mjs): framing reaches into the view by a share of its width, the subject stands on a third, so nothing lands outside the view.
//
//   ARCHETYPES                    { id: { id, gold, summary, kit, brief: { key: doc }, checks, build(brief, E) -> { spec, meta, plan, notes } } }
//   archetypeSpec(id, brief, E)   -> { spec, meta, plan, notes, archetype }   (E: the engine handle, for object sizes; optional)
//   archetypeList()               -> [{ id, gold, summary }]
// plan (what the gold-relative checks read, goldcheck.mjs): { subject: { id, kind: 'landmark'|'building'|'entity' }, lead: [[x, z]...],
//   framing: [entity ids], far: life id, near: life ids }
// PURE apart from E: no files, no clock. The same brief and seed give the same spec.
import { frameCam, at, xAt, ground } from './frame.mjs';
import { LANDMARKS } from './scaffold.mjs';

const r1 = (v) => Math.round(v * 10) / 10;
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
function rngOf(seed) { let a = (Number(seed) || 7) * 2654435761 >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// the drawn width of an object: a tree's sprite canopy is about 0.9 of its library spread (measured on the Yateley Green drafts: a
// horse chestnut at 9 m placed by its full spread showed only its corner; by 0.6 of it, at 11 m, it covered half the frame)
const widthOf = (E, obj, d = 8) => { let w = d; try { const i = E && E.worldObjectInfo ? E.worldObjectInfo(obj) : null; if (i && i.size && Number.isFinite(i.size.w)) w = i.size.w; } catch { w = d; } return /^tree\./.test(obj) ? w * 0.9 : w; };
/** The height of a landmark brief in metres (to keep its top inside the frame): a model by its size, a generated great church by its plan. */
function heightOf(E, Lm) {
  if (!Lm) return 20;
  if (Lm.obj) { let h = 20; try { const i = E && E.worldObjectInfo ? E.worldObjectInfo(Lm.obj) : null; if (i && i.size && Number.isFinite(i.size.h)) h = i.size.h; } catch { h = 20; } return h * ((Lm.model && Number(Lm.model.size)) || 1) * (Lm.model && Lm.model.opts && Lm.model.opts.crown === 'spire' ? 1.3 : 1); }
  const k = Math.max(0.45, Math.min(2.2, (Number(Lm.w) || 34) / 30));
  if ((Lm.style || 'gothic-minster') === 'gothic-minster') return ({ 'central-spire': 90, 'west-tower': 54 }[Lm.crown] || 78) * k;
  return (Number(Lm.storeys) || 4) * 4.2 + (Lm.crown ? 22 : 2);
}
/** An organic outline round a centre: n points, radii rx/rz, a seeded wobble. */
function blob(cx, cz, rx, rz, n, rnd, wob = 0.14) { const out = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 - wob + rnd() * wob * 2; out.push([r1(cx + Math.cos(a) * rx * k), r1(cz + Math.sin(a) * rz * k)]); } return out; }

/** The brief, normalised: what every archetype reads. */
export function briefOf(o = {}) {
  const lat = Number(o.lat), lon = Number(o.lon);
  if (!o.slug || !/^[a-z0-9][a-z0-9-]*$/.test(String(o.slug))) throw new Error('brief: slug (lower-case letters, digits, dashes)');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('brief: --lat and --lon are numbers');
  // seeds from 10000 up ask the fill for its cell-seeded streams (79-world-1fill.js WORLD_FILL_CELL_SEED_MIN): an edit then reshuffles
  // far less of the fill. A smaller --seed keeps the one stream (the scenes made before, reviewed on it)
  const slug = String(o.slug), seed = Number.isFinite(Number(o.seed)) && o.seed !== true && o.seed != null ? Math.round(Number(o.seed)) : 10000 + (Math.abs(slug.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 8999);
  return Object.assign({}, o, { slug, lat, lon, alt: Number(o.alt) || 60, seed, place: String(o.place || slug), region: o.region || 'uk',
    heading: Number.isFinite(Number(o.heading)) ? Number(o.heading) : null, county: o.county || null, town: o.town || null,
    side: o.side === 'left' ? 'left' : 'right', landmark: o.landmark || null, far: o.far || null, trees: o.trees || null });
}
const metaOf = (b, a, extra) => Object.assign({ id: b.slug + '-1-w3', label: b.label || `${b.place} (world)`, site: b.site || b.place, mood: b.mood || 'calm', colour: b.colour || 'green',
  tags: ['uk', b.slug, a.id, 'world-v3'], liveSky: { lat: b.lat, lon: b.lon }, ukPlace: b.ukPlace || b.slug.replace(/-\d+$/, ''), county: b.county || 'uk', ukTown: b.town || b.place.split(',')[0], ukView: b.view || a.id, archetype: a.id }, extra || {});
const mirror = (side) => (side === 'left' ? -1 : 1);

/* ============================================================
   boardwalk-wetland (gold: Fleet Pond 2). A boardwalk (or a shore path to a fishing deck) leads from the foot of the frame through
   wet carr and a reed bed (the marsh generator) to a deck at the reed edge; the open water beyond; on the far shore a mover in the first
   seconds (a timetabled train on its embankment, traffic on a causeway road, or walkers on a shore path); carr trees frame both
   sides close to the lens; waterfowl, a heron, a kingfisher, a birdwatcher who walks to the deck and looks.
   brief: trees 'carr' (alder, willow, birch) | 'heath' (Scots pine, birch, oak); far 'rail' | 'road' | 'path'; side: the walk
   bends to the 'right' (default) or 'left'; deck (m, 14-24); farZ (m, the far shore line, 120-260); landmark: an optional far
   building { style, crown, storeys } on the far shore third.
   ============================================================ */
function boardwalkWetland(b, E) {
  const rnd = rngOf(b.seed), s = mirror(b.side), cam0 = { eye: 2.4, fov: 66, horizon: 400, heading: b.heading == null ? 8 : b.heading, water: -0.1 };
  const cam = frameCam(cam0), notes = [];
  const deck = Math.max(14, Math.min(24, Number(b.deck) || 19)), farZ = Math.max(120, Math.min(260, Number(b.farZ) || 196)), slope = (rnd() - 0.5) * 0.08;
  const farLine = (x) => r1(farZ + slope * x), toe = (x) => farLine(x) - 15.5;
  const heath = b.trees === 'heath';
  // the walk: straight off the frame's foot, a gentle drift to one side, the deck at the reed edge
  const walk = [[0.2, 1.0], [0.2, 5], [0.4 * s, 7.4], [0.6 * s, 10], [0.9 * s, 12.4], [1.6 * s, deck * 0.77], [2.1 * s, deck * 0.9], [2.6 * s, deck]].map(([x, z]) => [r1(x), r1(z)]);
  // the water: a bay at the deck, the open pond to the far shore; a stream crossing the walk in front when b.stream (default on for carr)
  const stream = b.stream != null ? !!b.stream && b.stream !== 'false' : !heath;
  const zs = deck * 0.45;   // where the stream crosses
  const near = stream
    ? [[14, zs + 0.9], [11.4, zs + 0.5], [8.8, zs + 1.1], [6.2, zs + 0.5], [3.9, zs + 0.9], [2.2, zs + 0.1], [-0.2, zs - 0.2], [-2.4, zs - 0.4], [-4.0, zs + 0.6], [-5.0, zs + 2.6]]
    : [[-2.2, deck * 0.62], [-3.2, deck * 0.7]];
  const left = [[-5.8, deck * 0.74], [-6.6, deck * 0.87], [-7.2, deck], [-7.6, deck * 1.15], [-8.4, deck * 1.3], [-8.4, deck * 1.6], [-11, deck * 2], [-20, deck * 2.3], [-40, deck * 2.6], [-80, deck * 2.9], [-150, deck * 3.3], [-300, deck * 4.5]];
  const right = [[300, deck * 4.5], [120, deck * 3.2], [60, deck * 2.7], [30, deck * 2.4], [14, deck * 2.15], [8, deck * 1.9], [5.6, deck * 1.63], [3.4, deck * 1.46], [3.1, deck * 1.34], [2.6, deck * 1.21], [1.8, deck * 1.08], [0.6, deck * 0.97], [-0.2, deck * 0.84], [-0.6, deck * 0.72], [-0.4, deck * 0.62]];
  const back = stream ? [[1.6, zs + 3.3], [3.3, zs + 3.8], [5.1, zs + 3.2], [7.0, zs + 2.8], [9.1, zs + 3.1], [11.3, zs + 2.5], [14, zs + 2.4]] : [];
  const flip = (p) => [r1(p[0] * s), r1(p[1])];
  let poly = near.concat(left, [[-300, toe(-300)], [300, toe(300)]], right, back).map(flip);
  if (s < 0) poly = poly.reverse();
  const surfaces = [
    { id: 'carr-l', kind: 'grass', poly: [[-120, 0.5], [0, 0.5], [0, 12], [-6, 14], [-8, deck * 1.27], [-120, deck * 1.27]].map(p => [p[0], r1(p[1])]) },
    { id: 'carr-r', kind: 'grass', poly: rect(0, 0.5, 120, r1(deck * 1.58)) },
    { id: 'pond', kind: 'water', water: 'pond', shallow: 1.0, poly },
    { id: 'reeds-l', kind: 'reeds', poly: [[-80, deck * 1.16], [-12, deck * 1.1], [-8.6, deck * 1.26], [-9.4, deck * 1.53], [-9.8, deck * 1.76], [-12.6, deck * 2.03], [-21, deck * 2.35], [-40, deck * 2.66], [-80, deck * 2.98], [-150, deck * 3.4], [-150, deck * 1.26]].map(p => [r1(p[0] * s), r1(p[1])]) },
    { id: 'reeds-r', kind: 'reeds', poly: [[3.6, deck * 1.35], [9, deck * 1.29], [30, deck * 1.32], [70, deck * 1.58], [150, deck * 2.1], [150, deck * 3.3], [120, deck * 3.29], [60, deck * 2.77], [30, deck * 2.45], [14, deck * 2.19], [8.2, deck * 1.93], [5.8, deck * 1.65], [3.6, deck * 1.5]].map(p => [r1(p[0] * s), r1(p[1])]) },
    { id: 'reeds-n', kind: 'reeds', poly: [[-300, farLine(-300) - 22], [300, farLine(300) - 22], [300, farLine(300) - 6], [-300, farLine(-300) - 6]] },
    { id: 'far-shore', kind: 'grass', poly: [[-300, farLine(-300) - 6], [300, farLine(300) - 6], [300, farLine(300) + 60], [-300, farLine(-300) + 60]] },
  ];
  const life = [];
  const ground = { features: [] };
  const far = b.far || (heath ? 'path' : 'rail');
  if (far === 'rail') {
    surfaces.push({ id: 'railway', kind: 'rail', path: [[-320, farLine(-320)], [320, farLine(320)]], width: 9 });
    ground.features.push({ id: 'emb', kind: 'embankment', path: [[-420, farLine(-420)], [420, farLine(420)]], width: 30, h: 2.0 });
    life.push({ id: 'far', who: 'train', on: 'railway', every: '2min', mix: { 'rail.train-mainline': 1 } });
  } else if (far === 'road') {
    surfaces.push({ id: 'causeway', kind: 'road', path: [[-320, farLine(-320)], [320, farLine(320)]], width: 6 });
    ground.features.push({ id: 'emb', kind: 'embankment', path: [[-420, farLine(-420)], [420, farLine(420)]], width: 22, h: 1.4 });
    life.push({ id: 'far', who: 'cars', on: 'causeway', rate: '4/min' });
  } else {
    surfaces.push({ id: 'shore-path', kind: 'path', path: [[-320, farLine(-320) + 2], [-60, farLine(-60) + 1], [60, farLine(60) + 2.5], [320, farLine(320) + 1]], width: 2.2 });
    life.push({ id: 'far', who: 'walkers', on: 'shore-path', rate: '6/min', mix: { stroll: 0.4, 'dog-walker': 0.35, jogger: 0.25 }, edges: ['W', 'E'] });
  }
  // the carr: framing trees close to the lens on both sides (frame-relative: they reach into the view), then the side woods
  const sp = heath ? ['tree.pool-pine', 'tree.pool-birch', 'tree.pond-oak', 'tree.pond-pine'] : ['tree.pond-alder', 'tree.pond-willow', 'tree.pond-birch', 'tree.pond-oak'];
  const ent = [], framing = [];
  const frameTree = (id, obj, side, z, reach) => { const w = widthOf(E, obj); const p = at(cam, { frame: side, z, w, reach }); ent.push({ id, obj, at: p, framed: true }); framing.push(id); };
  frameTree('frame-l', sp[0], s > 0 ? 'left' : 'right', 5, 0.2);
  frameTree('frame-r', sp[0], s > 0 ? 'right' : 'left', 6, 0.16);
  frameTree('frame-l2', sp[1], s > 0 ? 'left' : 'right', 12, 0.14);
  frameTree('frame-r2', sp[2], s > 0 ? 'right' : 'left', 14, 0.12);
  const sides = [[sp[2], -14, deck], [sp[0], -22, deck * 1.15], [sp[1], -31, deck * 1.05], [sp[2], -45, deck * 1.2], [sp[0], 22, deck * 1.1], [sp[1], 34, deck], [sp[2], 52, deck * 0.95], [sp[3], 70, deck * 0.9], [heath ? 'tree.pine-veteran' : 'tree.pond-wood', -70, deck * 1.26]];
  for (const [obj, x, z] of sides) ent.push({ obj, at: [r1(x * s + (rnd() - 0.5) * 3), r1(z + (rnd() - 0.5) * 2)] });
  // the far shore's trees (lineside), the far reeds, the near-band dressing
  const farTrees = heath ? ['tree.far-pine', 'tree.far-birch', 'tree.far-pine'] : ['tree.far-birch', 'tree.far-broad', 'tree.far-birch'];
  for (let x = -240, i = 0; x <= 240; x += 30, i++) ent.push({ obj: farTrees[i % 3], at: [r1(x + (i % 2) * 9), r1(farLine(x) + 12 + (i % 3) * 4)] });
  ent.push({ cluster: 'plant.reed', on: 'reeds-l', n: 90, seed: b.seed + 21 }, { cluster: 'plant.reed', on: 'reeds-r', n: 80, seed: b.seed + 22 }, { cluster: 'plant.reed', on: 'reeds-n', n: 90, seed: b.seed + 23 },
    { cluster: heath ? 'plant.bracken' : 'plant.fern', on: 'carr-l', n: 26, seed: b.seed + 25 }, { cluster: heath ? 'plant.bracken' : 'plant.fern', on: 'carr-r', n: 22, seed: b.seed + 26 },
    { cluster: 'plant.grass-long', on: 'carr-l', n: 40, seed: b.seed + 27 }, { cluster: 'plant.grass-long', on: 'carr-r', n: 30, seed: b.seed + 37 },
    { cluster: heath ? 'plant.ling-heather' : 'plant.shrub', on: s > 0 ? 'carr-r' : 'carr-l', n: 12, seed: b.seed + 28 },
    { cluster: 'water.lily', on: 'pond', n: 14, seed: b.seed + 30 }, { cluster: 'ground.leaf-litter', on: 'carr-l', n: 18, seed: b.seed + 31 });
  // an optional landmark on the far shore, on the third away from the walk's drift
  const landmarks = [], buildings = [];
  let subject = { id: 'fen-deck', kind: 'surface' };
  if (b.landmark && typeof b.landmark === 'object') {
    const p = at(cam, { third: s > 0 ? 'left' : 'right', z: farZ + 30 });
    if (b.landmark.obj) { landmarks.push({ id: 'landmark', obj: b.landmark.obj, at: p, src: b.landmark.src || b.place, model: b.landmark.model }); subject = { id: 'landmark', kind: 'landmark' }; }
    else { const w = b.landmark.w || 16, d = b.landmark.d || 10; buildings.push({ id: 'landmark', foot: rect(r1(p[0] - w / 2), r1(p[1]), r1(p[0] + w / 2), r1(p[1] + d)), storeys: b.landmark.storeys || 2, style: b.landmark.style || 'stone-cottage', crown: b.landmark.crown, landmark: true, src: b.landmark.src || b.place }); subject = { id: 'landmark', kind: 'building' }; }
  }
  life.unshift(
    { id: 'walkers', who: 'walkers', on: 'fen-walk', rate: '3/min', mix: { stroll: 0.6, birdwatcher: 0.2, 'dog-walker': 0.2 }, edges: ['S'] },
    { id: 'watcher', who: 'visit', on: 'fen-walk', mix: { birdwatcher: 1 }, rate: '1/4min', edges: ['S'], goals: [{ go: 'fen-deck' }, { do: 'look', for: [30, 90] }, { leave: 'S' }] });
  life.push({ who: 'heron', count: 1, on: 'pond', state: 'wade' }, { who: 'kingfisher', count: 1, goals: [{ do: 'perch', for: [20, 60] }, { do: 'dive', for: [1, 2] }, { do: 'perch', for: [20, 60] }] },
    { who: 'coot', count: heath ? 3 : 6, on: 'pond' }, { who: 'mallard', count: 6, on: 'pond' }, { who: 'mute-swan', count: 2, on: 'pond', group: 'pair' }, { who: 'grebe', count: 2, on: 'pond' });
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt, region: b.region }, camera: cam0, surfaces,
    marsh: [{ id: 'fen', walk, width: 2.4, seed: b.seed + 4, from: stream ? r1(zs + 3) : r1(deck * 0.55), reach: 9.5, open: 0.5, density: 1, platform: { size: [3.6, 4.4], bench: true } }],
    entities: ent, ground, life, backdrop: { style: heath ? 'heath' : 'woodland' }, seed: b.seed };
  if (landmarks.length) spec.landmarks = landmarks;
  if (buildings.length) spec.buildings = buildings;
  if (stream) notes.push(`a stream crosses the walk at ${r1(zs)} m (the marsh lays a short footbridge)`);
  return { spec, plan: { subject, lead: walk, framing, far: 'far', near: ['walkers', 'watcher'] }, notes };
}

/* ============================================================
   village-green (the bar: a diagonal path, the church on a third, framing chestnuts; the weak scaffold green fixed). A path crosses
   the green on a diagonal from the frame's foot to the churchyard gate; the parish church (the model, with its yard, lychgate, yews
   and headstones) stands on a third beyond the lane; a pond on the other third with reeds and ducks; houses along the lane round
   the far side; big trees frame both sides; benches on the path; cars and a cyclist pass on the lane in the first seconds.
   brief: landmark { stone: honey | grey-limestone | ironstone | red-sandstone | flint, crown: parapet | spire } (default flint, parapet);
   side: the church on the 'right' (default) or 'left' third; houses: a building style (default stone-cottage); pond: false to leave it out.
   ============================================================ */
function villageGreen(b, E) {
  const rnd = rngOf(b.seed), s = mirror(b.side), cam0 = { eye: 1.7, fov: 64, horizon: 470, heading: b.heading == null ? 20 : b.heading };
  const cam = frameCam(cam0), notes = [];
  const lane = 82, houses = b.houses || 'stone-cottage';
  // the church on a third beyond the lane: the scaffold's parish-church recipe (yard, wall, lychgate, yews, headstones)
  const cx = r1(at(cam, { third: s > 0 ? 'right' : 'left', z: lane + 26 })[0]);
  const P = { church: rect(r1(cx - 15), lane + 7, r1(cx + 15), lane + 18) };
  const L = b.landmark && typeof b.landmark === 'object' ? b.landmark : {};
  const church = LANDMARKS['parish-church'](P, L.stone || 'flint');
  if (L.crown) church.landmarks[0].model.opts.crown = L.crown;
  church.landmarks[0].src = L.src || `${b.place}: the parish church across the green`;
  const gate = church.surfaces[0].path[0];   // the churchyard path's start on the lane
  // the diagonal: from the frame's foot on the other side, across the green to the gate
  const foot = ground(cam, s > 0 ? 560 : 1040, 899);
  const lead = [[r1(foot.x), r1(Math.max(1, foot.z))], [r1(foot.x * 0.6 + gate[0] * 0.4 - 4 * s), 16], [r1(foot.x * 0.3 + gate[0] * 0.7 - 2 * s), 38], [r1(gate[0] - 1 * s), r1(lane - 6)], [gate[0], r1(lane - 1)]];
  const surfaces = [
    { id: 'green', kind: 'grass', poly: rect(-190, 0.5, 190, lane + 40) },
    { id: 'lane', kind: 'road', path: [[-190, lane + 1], [-60, lane + 2.5], [60, lane - 0.5], [190, lane + 1.5]], width: 4.6 },
    { id: 'walk', kind: 'path', path: lead, width: 1.8 },
    { id: 'lane-walk', kind: 'pavement', path: [[-190, lane - 2.4], [-60, lane - 0.9], [60, lane - 3.9], [190, lane - 1.9]], width: 1.8 },
  ].concat(church.surfaces);
  // the pond on the other third, mid band
  const life = [];
  if (b.pond !== false && b.pond !== 'false') {
    // in the open between the path and the framing tree, in front of the green's trees (the fill rings a pond with trees: keep it near)
    const pc = at(cam, { third: s > 0 ? 'left' : 'right', z: 24 });
    surfaces.push({ id: 'pond', kind: 'water', water: 'pond', shallow: 0.45, poly: blob(r1(pc[0] - 3 * s), pc[1], 11, 5, 16, rnd) });
    life.push({ who: 'mallard', count: 5, on: 'pond' }, { who: 'moorhen', count: 1, on: 'pond' });
  }
  // houses along the lane's far side, broken for the churchyard (the lane's length runs from x = -190)
  const skip = [[cx - 22 + 190, cx + 22 + 190]];
  const rowsOf = (id, along, side, len, cuts, extra) => { const out = []; let cur = 0, k = 0; for (const [a, c] of cuts.slice().sort((p, q) => p[0] - q[0])) { if (a - cur >= 10) out.push(Object.assign({ id: id + (k++ ? '-' + k : ''), along, side, style: houses, storeys: [1, 2], from: r1(cur), to: r1(a), shops: false }, extra)); cur = Math.max(cur, c); } if (len - cur >= 10) out.push(Object.assign({ id: id + (k++ ? '-' + k : ''), along, side, style: houses, storeys: [1, 2], from: r1(cur), to: r1(len), shops: false }, extra)); return out; };
  const buildings = rowsOf('far', 'lane', 'left', 380, skip, { depth: [6, 9] });
  // framing: a big chestnut close on the path's side, an oak further in on the church's side, mid trees on the green's edges
  const ent = [], framing = [];
  const ft = (id, obj, side, z, reach) => { const p = at(cam, { frame: side, z, w: widthOf(E, obj, 20), reach }); ent.push({ id, obj, at: p, framed: true }); framing.push(id); };
  ft('frame-l', 'tree.horse-chestnut', s > 0 ? 'left' : 'right', 12, 0.16);
  ft('frame-r', 'tree.green-oak', s > 0 ? 'right' : 'left', 16, 0.15);
  ent.push({ obj: 'tree.green-birch', at: at(cam, { third: s > 0 ? 'left' : 'right', z: 62 }) }, { obj: 'tree.green-oak', at: [r1(-110 * s), 70] }, { obj: 'tree.green-chestnut', at: [r1(120 * s), 64] },
    { obj: 'tree.green-birch', at: [r1(60 * s), 58] });
  // benches beside the diagonal, facing the green; a bin; the near band: long grass and daisies at the foot of the frame
  const pb = (t) => { const i = Math.min(lead.length - 2, Math.floor(t * (lead.length - 1))), u = t * (lead.length - 1) - i, p = lead[i], q = lead[i + 1]; return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]; };
  const b2 = pb(0.62), lp = pb(0.5);
  // one lamp on the path (the fill's lighting rule L4 otherwise stands a lamp post at the lens)
  ent.push({ id: 'path-lamp', obj: 'street.lamppost', at: [r1(lp[0] + 1.6 * s), r1(lp[1])] });
  // one bench by the path (the kit's fill adds its own; two of ours stacked in depth read as a row of benches)
  ent.push({ id: 'bench-2', obj: 'street.bench', at: [r1(b2[0] - 2.4 * s), r1(b2[1])], facing: s > 0 ? 90 : 270 },
    { cluster: 'plant.grass-long', on: 'green', n: 30, seed: b.seed + 3 }, { cluster: 'plant.daisies', on: 'green', n: 40, seed: b.seed + 4 }, { cluster: 'ground.leaf-litter', on: 'green', n: 10, seed: b.seed + 5 });
  ent.push(...church.entities);
  life.unshift(
    { id: 'walkers', who: 'walkers', on: 'walk', rate: '4/min', mix: { stroll: 0.35, 'dog-walker': 0.3, family: 0.15, elderly: 0.2 }, edges: ['S', 'N'] },
    { id: 'sitter', who: 'visit', on: 'walk', rate: '1/3min', mix: { elderly: 0.5, stroll: 0.5 }, edges: ['S'], goals: [{ sit: 'bench-2', for: [40, 120] }, { leave: 'S' }] },
    { id: 'far', who: 'walkers', on: 'lane-walk', rate: '6/min', mix: { stroll: 0.4, 'dog-walker': 0.3, elderly: 0.3 }, edges: ['W', 'E'] },
    { id: 'cars', who: 'cars', on: 'lane', rate: '3/min' });
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt, region: b.region, style: 'village-green' }, camera: cam0, surfaces, lines: church.lines, buildings, entities: ent, landmarks: church.landmarks,
    life, backdrop: { style: b.backdrop || 'farmland' }, seed: b.seed };
  return { spec, plan: { subject: { id: 'church', kind: 'landmark' }, lead, framing, far: 'far', near: ['walkers', 'sitter'] }, notes };
}

/* ============================================================
   canal-basin (gold: Castlefield Basin). The basin's water runs up the middle of the frame from the foot to a footbridge on the
   mid band (the leading line); a stone quay on one side with warehouses by an `along` rule, a towpath and a strip of grass on the
   other; narrowboats moored along both quays near and mid; a railway viaduct (the model) across the far band; walkers on both
   sides, a narrowboat cruising in, waterfowl.
   brief: side: the warehouses on the 'left' (default) or 'right'; houses: the warehouse style (default mill); viaduct: false to leave it
   out; bridge: the footbridge's distance (m, 40-80); backdrop (default city-victorian).
   ============================================================ */
function canalBasin(b, E) {
  const rnd = rngOf(b.seed), s = b.side === 'right' ? -1 : 1, cam0 = { eye: 1.7, fov: 62, horizon: 520, heading: b.heading == null ? 96 : b.heading, water: -0.7 };
  const cam = frameCam(cam0), notes = [];
  const bz = Math.max(40, Math.min(80, Number(b.bridge) || 58));
  const W = (z) => r1(6 + 9 * Math.exp(-z / 60));   // the basin's half width: wide at the wharf, narrowing up the cut
  const cl = (z) => r1(Math.sin(z / 90) * 4);      // its centre line wanders
  const zs = [8.6, 20, 32, 50, 70, 95, 120, 150, 180, 220, 260, 320, 420];
  const L = zs.map(z => [r1(cl(z) - W(z)), z]), R = zs.map(z => [r1(cl(z) + W(z)), z]);
  const basin = L.concat(R.slice().reverse());
  const q = s > 0 ? L : R, t = s > 0 ? R : L, qs = s > 0 ? -1 : 1;   // the quay side and the towpath side
  const surfaces = [
    { id: 'wharf', kind: 'plaza', poly: rect(-22, 0.5, 22, 8.8) },
    { id: 'quay', kind: 'plaza', poly: q.map(p => [p[0], p[1]]).concat(q.slice().reverse().map(p => [r1(p[0] + qs * 9), p[1]])) },
    { id: 'tow', kind: 'towpath', poly: t.map(p => [p[0], p[1]]).concat(t.slice().reverse().map(p => [r1(p[0] - qs * 4), p[1]])) },
    { id: 'green', kind: 'grass', poly: t.map(p => [r1(p[0] - qs * 4), p[1]]).concat([[r1(-qs * 90), 420], [r1(-qs * 90), 6]]) },
    { id: 'basin', kind: 'water', water: 'canal', shallow: 0.6, poly: basin },
  ];
  // the bridge on the mid band, the subject of the view: a hump-backed brick canal bridge (the library's elevation, seen face-on up the
  // basin) with its deck raised to the hump. A bare bridge-deck surface at the water's level had walkers crossing as if on the water,
  // and the subject read as 3 % of the frame (trial basin, 14 Nov)
  const bw = W(bz) + 3;
  surfaces.push({ id: 'bridge', kind: 'bridge-deck', path: [[r1(cl(bz) - bw), bz], [r1(cl(bz) + bw), bz]], width: 2.6, over: 'water', y: 2.4 });
  // warehouses along the quay's back edge (a line 9 m out from the water)
  const back = q.map(p => [r1(p[0] + qs * 9.5), p[1]]);
  surfaces.push({ id: 'quay-back', kind: 'pavement', path: back, width: 1.6 });
  const buildings = [{ id: 'warehouses', along: 'quay-back', side: s > 0 ? 'left' : 'right', style: b.houses || 'mill', storeys: [4, 6], from: 8, to: 300, depth: [14, 22], shops: false }];
  const ent = [], framing = [];
  // moored narrowboats along both quays, near and mid (the model, seeded liveries)
  // along the side quays only, clear of the wharf and the footbridge (near either, the engine lays a boat along it: broadside
  // across the basin, the leading line blocked; trial basin, 14 Nov)
  // a narrowboat is 18 m long: its centre 30 m out keeps its stern clear of the wharf (at 22 m its bow lay on the paving)
  const boats = [[q, 31, 0.6], [t, 36, -0.6], [q, bz + 24, 0.6], [t, bz + 34, -0.6]].filter(([, z]) => Math.abs(z - bz) > 14);
  boats.forEach(([side, z, inset], i) => { const p = side[Math.max(0, zs.findIndex(v => v >= z))]; ent.push({ id: 'moored-' + (i + 1), obj: 'boat.narrowboat', at: [r1(p[0] + (side === q ? -qs : qs) * 1.4), z], attach: 'water', facing: 0, model: { seed: b.seed + i * 7 } }); });   // bow up the basin (facing 0: along +z)
  // the viaduct across the far band
  if (b.viaduct !== false && b.viaduct !== 'false') ent.push({ id: 'viaduct', obj: 'structure.viaduct', at: [r1(cl(170)), 170], facing: 90, attach: 'water', model: { livery: 'soot-grey', seed: b.seed, size: 2.4, opts: { kind: 'arcade' } } });
  // framing: a plane tree on the towpath side close in, a lamp and bollards on the quay side
  // (on land: the basin is ~28 m wide at the wharf, so a tree framed at 9 m stood on its water; the trunk goes 3 m beyond the towpath)
  const fz = 16, tw = widthOf(E, 'tree.plane-avenue', 23), edgeAt = (z) => cl(z) + (s > 0 ? 1 : -1) * W(z);
  const fp0 = at(cam, { frame: s > 0 ? 'right' : 'left', z: fz, w: tw, reach: 0.18 });
  const fp = [r1(s > 0 ? Math.max(fp0[0], edgeAt(fz) + 7) : Math.min(fp0[0], edgeAt(fz) - 7)), fz];
  ent.push({ id: 'frame-tree', obj: 'tree.plane-avenue', at: fp, framed: true }); framing.push('frame-tree');
  const lp = at(cam, { frame: s > 0 ? 'left' : 'right', z: 7, w: 1, show: 0.9 });
  ent.push({ id: 'frame-lamp', obj: 'street.lamppost', at: lp, framed: true }); framing.push('frame-lamp');
  for (const z of [30, 60, 90]) ent.push({ obj: 'tree.plane-avenue', at: [r1(t[zs.findIndex(v => v >= z)][0] - qs * 6), z] });
  // quay bollards 1 m back from the quay edge AT their own depth (the edge at 20 m put the first one on the water)
  for (let i = 0; i < 4; i++) { const z = 12 + i * 7; ent.push({ obj: 'street.bollard', at: [r1(cl(z) + qs * (W(z) + 1) + (rnd() - 0.5) * 0.4), z] }); }
  // the wharf's edge: bollards along the water, a planter and a bench (the near band of a basin is stone, dressed, not bare)
  // (none on the centre line: a 1 m post there was a dark blob in the middle of the near band, SCENE_LESSONS K; Gas Street draft 2)
  for (let x = -12; x <= 12; x += 6) { const bx = x + (rnd() - 0.5); if (Math.abs(bx) > 4) ent.push({ obj: 'street.bollard', at: [r1(bx), 7.6] }); }
  ent.push({ obj: 'structure.mcr-planter', at: [r1(qs * 14), 5], variant: 0 }, { obj: 'street.bench', at: [r1(qs * 9), 6.2], facing: 0 });
  ent.push({ obj: 'street.bench', at: [r1(-qs * 8), 4], facing: 0 }, { cluster: 'plant.grass-long', on: 'green', n: 30, seed: b.seed + 9 }, { cluster: 'ground.leaf-litter', on: 'tow', n: 10, seed: b.seed + 10 });
  const life = [
    { id: 'walkers', who: 'walkers', on: 'tow', rate: '6/min', mix: { stroll: 0.4, 'dog-walker': 0.2, jogger: 0.15, couple: 0.25 }, edges: ['S', 'N'] },
    { id: 'quayside', who: 'walkers', on: 'quay', rate: '4/min', mix: { stroll: 0.5, commuter: 0.3, couple: 0.2 }, edges: ['S', 'N'] },
    { id: 'far', who: 'walkers', on: 'bridge', rate: '5/min', mix: { stroll: 0.6, commuter: 0.4 } },
    // no boat under way: the one cruising narrowboat passed at the lens and filled 40 % of the frame (Gas Street draft 1); the moored boats are the basin's
    { who: 'mallard', count: 4, on: 'basin' }, { who: 'mute-swan', count: 2, on: 'basin', group: 'pair' }, { who: 'gulls', count: 3 },
  ];
  // the urban kit (stone quays, no reed fringe in the basin); 'canal' is the towpath-in-fields kit
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt, region: b.region, style: b.kit || 'river-city' }, camera: cam0, surfaces, buildings, entities: ent, life,
    backdrop: { style: b.backdrop || 'city-victorian' }, seed: b.seed };
  spec.landmarks = [{ id: 'bridge-arch', obj: b.bridgeObj || 'structure.bridge-brick', at: [r1(cl(bz)), bz], facing: 90, attach: 'water', src: b.bridgeSrc || `${b.place}: the bridge across the basin` }];
  return { spec, plan: { subject: { id: 'bridge-arch', kind: 'landmark' }, lead: zs.map(z => [cl(z), z]), framing, far: 'far', near: ['walkers', 'quayside'] }, notes };
}

/* ============================================================
   civic-square-facade (gold: Manchester, Albert Square). A square seen corner-on: the landmark's facade at three-quarters across
   a third, the square in front, a street of tall buildings receding along the other side (the leading line), a statue framing one
   side close in and a lamp the other, tree pits with benches and bins, a tram (or buses) crossing the far side, people crossing.
   brief: landmark { style (default gothic-minster), crown (default twin-towers), storeys, w, d } or { obj, model }; houses: the side
   street's style (default georgian); tram: false for buses on a road; side: the landmark on the 'right' (default) or 'left' third.
   ============================================================ */
function civicSquare(b, E) {
  // Albert Square's own camera (horizon 660 of 900, a 76 degree lens): the trial's horizon at 600 left 0.22 of sky against the gold's 0.39
  const rnd = rngOf(b.seed), s = mirror(b.side), cam0 = { eye: 1.65, fov: 76, horizon: 660, heading: b.heading == null ? 52 : b.heading };
  const cam = frameCam(cam0), notes = [];
  const Lm = b.landmark && typeof b.landmark === 'object' ? b.landmark : {};
  // the landmark on the third, turned 35 degrees so its front is seen at three-quarters, far enough that its top keeps 8 % of the
  // frame above it (the trial minster at 140 m ran its towers into the top of the frame)
  const zL = r1(Math.max(Number(Lm.z) || 120, cam.f * (heightOf(E, Lm) - cam0.eye) / (cam0.horizon - 72)));
  const c = at(cam, { third: s > 0 ? 'right' : 'left', z: zL });
  const w = Lm.w || 44, d = Lm.d || 24, a = -35 * s * Math.PI / 180;
  const rot = ([x, z]) => [r1(c[0] + x * Math.cos(a) - z * Math.sin(a)), r1(c[1] + x * Math.sin(a) + z * Math.cos(a))];
  const foot = [[-w / 2, 0], [w / 2, 0], [w / 2, d], [-w / 2, d]].map(rot);
  const buildings = [], landmarks = [];
  let subject;
  if (Lm.obj) { landmarks.push({ id: 'landmark', obj: Lm.obj, at: c, src: Lm.src || b.place, model: Lm.model }); subject = { id: 'landmark', kind: 'landmark' }; }
  else { buildings.push({ id: 'landmark', foot, storeys: Lm.storeys || 3, style: Lm.style || 'gothic-minster', crown: Lm.crown || 'twin-towers', landmark: true, front: 0, src: Lm.src || `${b.place}: the civic landmark` }); subject = { id: 'landmark', kind: 'building' }; }
  // the receding street on the other side: its building line is the leading line to the far end of the square
  const sx = (z) => r1(-s * (14 + z * 0.18));
  const street = [[sx(4), 4], [sx(60), 60], [sx(140), 140], [sx(240), 240]];
  // the square: paving (a civic square) or a lawn (a cathedral close: `ground: grass`), out to the far side's line
  const tz = r1(Math.min(112, zL - 30)), lawn = b.ground === 'grass';
  const surfaces = [
    // (a lawn only out to the side street's pavement: a 130 x 108 m lawn's fill cost 735 statics and a 1.8 s build, Salisbury draft 1)
    { id: 'square', kind: lawn ? 'grass' : 'plaza', poly: lawn ? [[r1(sx(0.5) + s * 3), 0.5], [r1(s * 60), 0.5], [r1(s * 66), r1(tz - 4)], [r1(sx(tz) + s * 3), r1(tz - 4)]] : [[-60, 0.5], [60, 0.5], [70, r1(tz - 4)], [-70, r1(tz - 4)]] },
    { id: 'pave', kind: 'pavement', path: street, width: 4 },
    { id: 'front', kind: 'pavement', poly: [foot[0], foot[1], [r1(foot[1][0] + 6 * Math.sin(a)), r1(foot[1][1] - 6 * Math.cos(a))], [r1(foot[0][0] + 6 * Math.sin(a)), r1(foot[0][1] - 6 * Math.cos(a))]] },
  ];
  const hs = typeof b.rows === 'string' && /^\d+-\d+$/.test(b.rows) ? b.rows.split('-').map(Number) : [4, 6];
  buildings.push({ id: 'street', along: 'pave', side: s > 0 ? 'left' : 'right', style: b.houses || 'georgian', storeys: hs, from: 6, to: lawn ? 140 : 236, depth: [14, 20], shops: !lawn });
  // the tram (or the buses, or the cars of a close) along the far side of the square
  const far = b.far === 'cars' ? 'cars' : b.tram === false || b.tram === 'false' || b.far === 'buses' ? 'buses' : 'tram';
  surfaces.push({ id: 'line', kind: far === 'tram' ? 'tram' : 'road', path: [[-260, tz + 8], [260, tz - 8]], width: 9 }, { id: 'pave-far', kind: 'pavement', path: [[-260, tz + 2], [260, tz - 14]], width: 3.4 });
  // statue framing one side, lamp the other; tree pits with benches and bins down the square
  const ent = [], framing = [];
  if (b.frame === 'tree') { const tw = widthOf(E, 'tree.green-oak', 20); ent.push({ id: 'frame-statue', obj: 'tree.green-oak', at: at(cam, { frame: s > 0 ? 'left' : 'right', z: 12, w: tw, reach: 0.14 }), framed: true }); }
  else ent.push({ id: 'frame-statue', obj: 'street.mcr-statue', at: at(cam, { frame: s > 0 ? 'left' : 'right', z: 6, w: 2.6, show: 0.85 }), framed: true });
  framing.push('frame-statue');
  ent.push({ id: 'frame-lamp', obj: 'street.lamppost', at: at(cam, { frame: s > 0 ? 'right' : 'left', z: 6.5, w: 2, show: 0.9 }), framed: true }); framing.push('frame-lamp');
  const pits = [];
  // a lawn has a path across it from the frame's foot to the landmark's front (the visitors' way, a second leading line) and two
  // specimen trees; the tree pits are a paved square's (on a lawn they made a wall of foliage over the side street, Salisbury draft 1)
  if (lawn) {
    const fm = [r1((foot[0][0] + foot[1][0]) / 2 - 8 * Math.sin(a)), r1((foot[0][1] + foot[1][1]) / 2 + 8 * Math.cos(a))];
    surfaces.push({ id: 'walk', kind: 'path', path: [[r1(-s * 2), -2], [r1(-s * 1), 8], [r1(fm[0] * 0.35), r1(fm[1] * 0.35)], [r1(fm[0] * 0.7), r1(fm[1] * 0.7)], fm], width: 2.4 });
    ent.push({ obj: 'tree.green-oak', at: [r1(s * 52), 88] });   // (a chestnut on the street side hid the houses with the framing oak)
  }
  for (const z of lawn ? [] : [20, 35, 50]) {
    const x = r1(sx(z) + s * 8);
    pits.push({ id: 'pit-' + z, kind: 'grass', poly: rect(r1(x - 1), z - 1, r1(x + 1), z + 1) });
    ent.push({ obj: 'tree.plane-avenue', at: [x, z] }, { obj: 'street.bench', at: [r1(x + s * 3), z], facing: s > 0 ? 90 : 270 }, { obj: 'street.mcr-bin', at: [r1(x + s * 2), r1(z + 3)] });
  }
  surfaces.push(...pits);
  for (const z of [30, 70, 110]) ent.push({ obj: 'street.lamppost', at: [r1(c[0] - s * 30 + (rnd() - 0.5) * 6), z] });
  ent.push({ obj: 'street.bollard', at: [-3, 40] }, { obj: 'street.bollard', at: [-1.5, 40.6] }, { obj: 'street.bollard', at: [0, 41.2] }, { cluster: 'ground.leaves', on: 'square', n: 14, seed: b.seed + 2 });
  const life = [
    lawn ? { id: 'walkers', who: 'walkers', on: 'walk', rate: '8/min', mix: { stroll: 0.4, couple: 0.2, family: 0.15, elderly: 0.15, 'dog-walker': 0.1 }, edges: ['S'] }
      : { id: 'walkers', who: 'walkers', on: 'square', rate: '10/min', mix: { stroll: 0.3, commuter: 0.2, shopper: 0.15, student: 0.1, couple: 0.1, family: 0.05, buggy: 0.05, 'elderly-walker': 0.05 } },
    lawn ? { id: 'lookers', who: 'visit', on: 'walk', rate: '1/min', mix: { stroll: 0.5, couple: 0.5 }, edges: ['S'], goals: [{ go: [r1(s * 6), 26] }, { do: 'look', for: [20, 60] }, { leave: 'S' }] } : undefined,
    { id: 'street', who: 'walkers', on: 'pave', rate: '5/min' },
    { id: 'far', who: far, on: 'line', every: far === 'tram' ? '3min' : undefined, rate: far === 'buses' ? '2/min' : far === 'cars' ? '3/min' : undefined },
    { id: 'farwalk', who: 'walkers', on: 'pave-far', rate: '4/min' },
    lawn ? undefined : { who: 'pigeons', count: 8, on: 'square' },
  ].filter(Boolean).map(l => { for (const k of Object.keys(l)) if (l[k] === undefined) delete l[k]; return l; });
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt, region: b.region, style: 'civic-square' }, camera: cam0, surfaces, buildings, entities: ent, life,
    backdrop: { style: b.backdrop || 'city-victorian' }, seed: b.seed };
  if (landmarks.length) spec.landmarks = landmarks;
  notes.push(`the landmark ${zL} m out on the ${s > 0 ? 'right' : 'left'} third (its top inside the frame); the square ${lawn ? 'a lawn' : 'paved'}, ${far} on its far side`);
  return { spec, plan: { subject, lead: street, framing, far: 'far', near: lawn ? ['walkers', 'lookers'] : ['walkers'] }, notes };
}

/* ============================================================
   medieval-lane (gold: Norwich, Elm Hill; York, the Shambles). A cobbled lane between rows of old fronts that lean over it, climbing
   to its head, where a great church stands above the roofs. What the gold lanes lacked is fixed here: the camera is turned off the
   lane's axis (bearing to a third), so the vista gap and the landmark in it stand on a THIRD, not dead centre, and the near row on the
   far side of the turn frames the view; the lane kinks a little in the middle (no ruler-straight lane); the head opens onto a cross
   street with its own walkers (the far mover) and the landmark beyond, turned to show its front at three-quarters; visitors stop at the
   shop windows in the near-mid band.
   brief: side: the landmark on the 'right' (default) or 'left' third; landmark { style (gothic-minster), crown (twin-towers |
   central-spire | west-tower), w, d, storeys, z (its distance), turn (degrees) } or { obj, model, facing } (a church model);
   houses: a style or a list of styles mixed along the rows (timber-framed); rise: metres the lane climbs (6); length: the lane (m, 100);
   width (m, 6); kit: cobbled-lane | old-town-lane; backdrop (town-low).
   ============================================================ */
function medievalLane(b, E) {
  const s = mirror(b.side), cam0 = { eye: 1.7, fov: 60, horizon: 600, heading: b.heading == null ? 0 : b.heading };
  const cam = frameCam(cam0), notes = [];
  // a short lane (70 m) opening into a square: in a 100 m lane the landmark at the head was a slot of one tower (Steep Hill drafts 2, 3)
  const L = Math.max(45, Math.min(160, Number(b.length) || 70)), W = Math.max(4, Math.min(9, Number(b.width) || 6)), rise = Number.isFinite(Number(b.rise)) ? Number(b.rise) : 6;
  // the lane's axis: the bearing of the landmark's third (so the vista gap and the landmark stand on the third)
  const beta = s * Math.atan((3200 / 3 - 800) / cam.f), d = [Math.sin(beta), Math.cos(beta)], n = [Math.cos(beta), -Math.sin(beta)];
  const P = (u, v) => [r1(u * d[0] + v * n[0]), r1(u * d[1] + v * n[1])];
  // the lane: a slight kink away from the landmark in its middle (back on the axis at the head)
  const kink = -s * Math.min(1.6, W * 0.25);
  const us = [-8, 0, L * 0.2, L * 0.4, L * 0.6, L * 0.8, L];
  const lane = us.map(u => P(u, u <= 0 ? 0 : kink * Math.sin(Math.PI * u / L)));
  const cross = [P(L, -90), P(L, 90)];
  const Lm = b.landmark && typeof b.landmark === 'object' ? b.landmark : {};
  // far enough that its top clears the frame's top by 8 % (a first Steep Hill draft at 190 m cut both west towers at the top); its body
  // turned outward (toward the frame's edge), so the front stands on the third and the nave recedes behind the row
  const Dtop = cam.f * (heightOf(E, Lm) + rise - cam0.eye) / (cam0.horizon - 72);
  const D = Math.max(L + 40, Number(Lm.z) || L + 100, Dtop), turn = Number.isFinite(Number(Lm.turn)) ? Number(Lm.turn) : s * 12;
  const c = P(D, 0), theta = beta * 180 / Math.PI + turn, a = -theta * Math.PI / 180;
  // the lane widens into a little square at its head (a market place before the gate), its houses lower: the vista gap opens there
  // so the whole front of the landmark shows above the roofs (Steep Hill draft 2: one tower in a 6 m slot, the other behind the row)
  const uh = r1(L * 0.62), headW = W + Math.max(0, Number.isFinite(Number(b.head)) ? Number(b.head) : 8);
  const headPath = [P(uh, kink * Math.sin(Math.PI * uh / L)), P(L, 0)];
  const surfaces = [
    { id: 'lane', kind: 'plaza', path: lane, width: W },
    { id: 'head', kind: 'plaza', path: headPath, width: headW },
    { id: 'cross', kind: 'pavement', path: cross, width: 6 },
    // the open ground at the head (a close, a churchyard, a green) between the cross street and the landmark
    { id: 'close', kind: 'grass', poly: [P(L + 4, -70), P(L + 4, 70), P(D + 90, 70), P(D + 90, -70)] },
    { id: 'close-walk', kind: 'path', path: [P(L + 3, 0), P(D - 30, 0)], width: 3 },
  ];
  const buildings = [], landmarks = [], ent = [];
  let subject;
  if (Lm.obj) {
    landmarks.push({ id: 'landmark', obj: Lm.obj, at: c, facing: Number.isFinite(Number(Lm.facing)) ? Number(Lm.facing) : r1(theta + 90), src: Lm.src || `${b.place}: the church at the head of the lane`, model: Lm.model });
    subject = { id: 'landmark', kind: 'landmark' };
  } else {
    const w = Lm.w || 34, dd = Lm.d || 110;
    const rot = ([x, z]) => [r1(c[0] + x * Math.cos(a) - z * Math.sin(a)), r1(c[1] + x * Math.sin(a) + z * Math.cos(a))];
    buildings.push({ id: 'landmark', foot: [[-w / 2, 0], [w / 2, 0], [w / 2, dd], [-w / 2, dd]].map(rot), storeys: Lm.storeys || 4, style: Lm.style || 'gothic-minster', crown: Lm.crown || 'twin-towers', landmark: true, front: 0, src: Lm.src || `${b.place}: the great church at the head of the lane` });
    subject = { id: 'landmark', kind: 'building' };
  }
  // the rows: each side in runs of 10-26 m, the styles mixed along it; the first fronts are shops (A-boards and baskets come with them)
  const styles = Array.isArray(b.houses) ? b.houses : typeof b.houses === 'string' ? b.houses.split(',').map(x => x.trim()).filter(Boolean) : ['timber-framed'];
  const rnd = rngOf(b.seed);
  // at the lens only the RICH lane fronts (jettied timber, colour-washed plaster, thatch: shops, signs, baskets); a stone or brick front
  // there is a plain wall the height of the frame (Steep Hill draft 3: honey stone at the lens, 41 % of the frame one blank house)
  const RICH = ['timber-framed', 'tudor-colourwash', 'tudor-thatch'], rich = styles.filter(x => RICH.includes(x));
  const LANE_SHOPS = Array.isArray(b.shops) ? b.shops : ['books', 'gift', 'tea', 'cheese', 'antiques', 'bakery', 'florist', 'clothes'];
  for (const side of ['left', 'right']) {
    let u = 0.5, k = 0;
    while (u < uh - 3) {
      // narrow plots at the lens (one house there filled 43 % of the frame), longer runs beyond
      const run = Math.min(uh - 1 - u, k === 0 ? 7 : 10 + Math.floor(rnd() * 16));
      const st = u < L * 0.3 && rich.length ? rich[(k + (side === 'left' ? 0 : 1)) % rich.length] : styles[(k + (side === 'left' ? 0 : 1)) % styles.length];
      if (run < 5) break;
      // the first fronts are the lane's shops (wares behind the glass, a sign over the door); then houses
      buildings.push({ id: `${side[0]}-${k}`, along: 'lane', side, style: st, storeys: [2, 3], from: r1(u), to: r1(u + run), gap: -0.55, shops: k < 2 ? LANE_SHOPS : false });
      u += run + 0.6; k++;
    }
    // round the little square at the head: lower houses (two storeys)
    buildings.push({ id: `${side[0]}-head`, along: 'head', side, style: styles[(k + 1) % styles.length], storeys: [2, 2], from: 1, to: r1(L - uh - 2), gap: -0.55, shops: false });
  }
  // the cross street's far side, broken for the vista (the landmark shows through)
  const gapV = Math.max(headW / 2 + 4, (Lm.w || 34) * 0.5 * L / D + 6);
  buildings.push({ id: 'end-a', along: 'cross', side: 'left', style: styles[0], storeys: [2, 3], from: 0, to: r1(90 - gapV), depth: [8, 10] },
    { id: 'end-b', along: 'cross', side: 'left', style: styles[styles.length - 1], storeys: [2, 3], from: r1(90 + gapV), to: 180, depth: [8, 10] });
  // trees in the close behind the cross street (the head is green, not a wall), a lantern post at the gate
  for (const [u, v] of [[L + 22, -26], [L + 30, 24], [L + 50, -40], [L + 46, 38]]) ent.push({ obj: 'tree.green-oak', at: P(u, v) });
  // a visitor stops at a shop window on the side the eye passes first
  const shopAt = P(L * 0.22, -s * (W / 2 - 0.8));
  const life = [
    { id: 'walkers', who: 'walkers', on: 'lane', rate: '8/min', mix: { stroll: 0.45, couple: 0.25, family: 0.1, elderly: 0.1, chat: 0.1 }, edges: ['S', 'N'] },
    { id: 'browser', who: 'visit', on: 'lane', rate: '1/min', mix: { stroll: 0.5, couple: 0.5 }, edges: ['S'], goals: [{ go: shopAt }, { do: 'look', for: [15, 40] }, { leave: 'N' }] },
    { id: 'far', who: 'walkers', on: 'cross', rate: '4/min', mix: { stroll: 0.5, 'dog-walker': 0.2, couple: 0.3 }, edges: ['W', 'E'] },
    { id: 'close', who: 'walkers', on: 'close-walk', rate: '2/min', mix: { stroll: 0.6, couple: 0.4 } },
  ];
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt, region: b.region, style: b.kit || 'cobbled-lane' }, camera: cam0,
    ground: { features: [{ id: 'hill', kind: 'slope', path: lane.slice(1), width: 360, h: rise, fade: 40 }] },
    surfaces, buildings, entities: ent, life, backdrop: { style: b.backdrop || 'town-low' }, seed: b.seed };
  if (!rise) delete spec.ground;
  if (landmarks.length) spec.landmarks = landmarks;
  notes.push(`the lane is turned ${r1(beta * 180 / Math.PI)} degrees off the view axis (the vista on the ${s > 0 ? 'right' : 'left'} third); the landmark ${r1(D)} m ahead`);
  return { spec, plan: { subject, lead: lane.slice(1), framing: [], far: 'far', near: ['walkers', 'browser'] }, notes };
}

/* ============================================================
   harbour-under-cliff (gold: Whitby harbour, the town stacked up the cliff with the abbey on top). Whitby's own frame is frontal: the
   far shore a band across the view, no leading line, a lamp on one side only, the near band a bare quay. Fixed here: the camera
   stands at the inner corner of a harbour basin between two quays; the LEFT quay's edge (or the right, mirrored) runs from the frame's
   foot to the far shore (the leading line), fishing boats moored along it, its harbour-front houses framing that side; a short quay
   finger on the other side carries a lamp and a moored yacht (framing); across the water the beach or quay, the far shore's houses,
   then the cliff (a rock face with a cliff-top terrace, or a green slope with lanes of houses stepping up it) and the landmark on the
   cliff top on a THIRD; walkers on the far beach are the far mover; the near quay is dressed and lived in.
   brief: side: the landmark on the 'right' (default) or 'left' third; cliff: 'rock' (a face with houses on top; default) | 'slope'
   (lanes stepping up a green bank); h: the cliff (m, 14-40); rock: limestone | sandstone | granite | slate | chalk; houses: the quay
   and lane style (pantile-cottage); top: the cliff-top terrace style (seafront-regency); landmark { obj, model, facing } (default the
   parish-church model with a spire) or { style, crown, storeys, w, d }; far: m to the far shore (90-170); beach: false for a quay.
   ============================================================ */
function harbourUnderCliff(b, E) {
  const s = mirror(b.side), cam0 = { eye: 3, fov: 64, horizon: 470, heading: b.heading == null ? 0 : b.heading, water: -2.4 };
  const cam = frameCam(cam0), notes = [], rnd = rngOf(b.seed);
  const zf = Math.max(90, Math.min(170, Number(b.far) || 120)), H = Math.max(14, Math.min(40, Number(b.h) || 22));
  const slope = b.cliff === 'slope', beach = b.beach !== false && b.beach !== 'false';
  const X = (x) => r1(x * s);   // authored for the quay on the LEFT of a right-hand landmark (s = 1); mirrored for 'left'
  // the leading quay edge: from the frame's foot just right of centre to the far shore left of centre
  const edge = (z) => 1.2 - (z - 8) * 0.2;
  const ez = [0.5, 8, 20, 35, 55, 75, r1(zf - 14)];
  const quayEdge = ez.map(z => [r1(edge(z)), z]);
  const quay = quayEdge.concat([[-240, r1(zf - 14)], [-240, 0.5]]);
  // the finger quay on the other side, at the frame's edge (its lamp and its yacht frame the view)
  const fx0 = 6.2, fz1 = 24;
  const finger = [[fx0, 0.5], [60, 0.5], [60, 6], [fx0 + 5.5, 6], [fx0 + 5.5, fz1], [fx0, fz1]];
  const wl = r1(zf - (beach ? 12 : 2));
  const harbour = [[r1(edge(8)), 6.4], [fx0, 6.4], [fx0, fz1 + 1], [fx0 + 5.5, fz1 + 1], [fx0 + 5.5, 6], [400, 6], [400, wl], [r1(edge(wl)), wl]].concat(quayEdge.filter(p => p[1] > 8 && p[1] < wl).reverse().map(p => [r1(p[0] + 0.2), p[1]]));
  const surfaces = [
    { id: 'quay', kind: 'plaza', poly: quay.map(p => [X(p[0]), p[1]]) },
    { id: 'finger', kind: 'plaza', poly: finger.map(p => [X(p[0]), p[1]]) },
    { id: 'harbour', kind: 'water', water: 'harbour', shallow: 1.2, poly: harbour.map(p => [X(p[0]), p[1]]) },
  ];
  if (beach) surfaces.push({ id: 'beach', kind: 'sand', poly: [[X(r1(edge(wl))), wl], [X(400), wl], [X(400), r1(zf + 1)], [X(-240), r1(zf + 1)], [X(-240), wl]] });
  // the harbour-front houses along the back of the leading quay (they face the water and frame that side of the view)
  const back = ez.slice(1).map(z => [X(r1(edge(z) - 13)), z]);
  surfaces.push({ id: 'quay-back', kind: 'pavement', path: back, width: 2 });
  const style = b.houses || 'pantile-cottage', top = b.top || 'seafront-regency';
  const buildings = [{ id: 'quay-row', along: 'quay-back', side: s > 0 ? 'left' : 'right', style, storeys: [2, 3], from: 4, to: 400, depth: [7, 10], shops: ['cafe', 'gift', 'fishmonger', 'ice_cream'] }];
  // the far shore: the street along the foot of the cliff, its houses; the cliff; the cliff-top lane and its terrace
  const zs = r1(zf + 3);
  surfaces.push({ id: 'shore-st', kind: 'pavement', path: [[X(-260), zs], [X(-60), r1(zs + 1.5)], [X(80), r1(zs - 1)], [X(320), zs]], width: 5 });
  const ground = { features: [] };
  const zc = r1(zf + 18), zt = r1(zc + 10);
  if (slope) {
    ground.features.push({ id: 'bank', kind: 'embankment', path: [[X(-320), r1(zc + 70)], [X(320), r1(zc + 70)]], width: 150, h: H });
    surfaces.push({ id: 'cliff', kind: 'grass', poly: [[X(-320), r1(zc - 2)], [X(320), r1(zc - 2)], [X(320), r1(zc + 160)], [X(-320), r1(zc + 160)]] });
  } else {
    ground.features.push({ id: 'cliff', kind: 'cliff', path: [[X(-340), r1(zc + 6)], [X(-120), zc], [X(40), r1(zc + 3)], [X(200), r1(zc - 2)], [X(360), r1(zc + 4)]], h: H, high: 'far', rock: b.rock || 'limestone', rough: 1.1, scree: { w: 6, h: 2 }, rim: { w: 2, h: 0.8 }, fade: 30 });
    surfaces.push({ id: 'cliff-top', kind: 'grass', poly: [[X(-340), r1(zc + 14)], [X(360), r1(zc + 14)], [X(360), r1(zc + 220)], [X(-340), r1(zc + 220)]] });
  }
  // rows only across the frame's width at their depth, plus a margin (600 m rows built 189 houses, most out of view: 1.8 s)
  const span = (z, x0) => { const half = z * 800 / cam.f + 36; return [r1(Math.max(0, -x0 - half)), r1(-x0 + half)]; };
  const [sf, st] = span(zs, -260);
  buildings.push({ id: 'shore-row', along: 'shore-st', side: s > 0 ? 'left' : 'right', style, storeys: [2, 3], from: sf, to: st, depth: [7, 9], shops: false });
  // the yards between the shore houses and the cliff foot are paved (on grass the fill planted a wood there, over the houses)
  surfaces.push({ id: 'shore-yards', kind: 'plaza', poly: [[X(-260), r1(zs + 3)], [X(320), r1(zs + 3)], [X(320), r1(zc + 1)], [X(-260), r1(zc + 1)]] });
  // the landmark on the cliff top on the landmark's third, behind the terrace (its tower or spire above the roofs)
  const Lm = b.landmark && typeof b.landmark === 'object' ? b.landmark : { obj: 'structure.parish-church', model: { livery: 'grey-limestone', size: 1.25, seed: 5, opts: { crown: 'spire', era: 'perpendicular' } } };
  const zl = r1(zc + (slope ? 58 : 40)), lp = at(cam, { third: s > 0 ? 'right' : 'left', z: zl });
  // lanes up the slope (Whitby) or the terrace along the cliff top (Tenby); each row broken in front of the landmark (a terrace there
  // hid all but its spire: the build demoted it to scenery, C4)
  const lanes = slope ? [12, 26, 40] : [16], gapHalf = Lm.obj ? 24 : (Lm.w || 30) / 2 + 8;
  lanes.forEach((dz, i) => {
    const z = r1(zc + dz), id = 'lane-' + i, x0 = X(-300), cut = Math.abs(lp[0] - x0), [lf, lt] = span(z, -300);
    surfaces.push({ id, kind: 'path', path: [[X(-300), z], [X(-100), r1(z + 1.5)], [X(100), r1(z - 1)], [X(300), z]], width: 2.6 });
    const row = { along: id, side: s > 0 ? 'left' : 'right', style: slope ? style : top, storeys: slope ? [2, 3] : [3, 4], depth: slope ? [5, 7] : [9, 12], shops: false };
    buildings.push(Object.assign({ id: id + '-a', from: lf, to: r1(cut - gapHalf) }, row), Object.assign({ id: id + '-b', from: r1(cut + gapHalf), to: lt }, row));
  });
  const landmarks = [], ent = [], framing = [];
  let subject;
  if (Lm.obj) { landmarks.push({ id: 'landmark', obj: Lm.obj, at: lp, facing: Number.isFinite(Number(Lm.facing)) ? Number(Lm.facing) : 90, src: Lm.src || `${b.place}: the church above the harbour`, model: Lm.model }); subject = { id: 'landmark', kind: 'landmark' }; }
  else { const w = Lm.w || 30, d = Lm.d || 14; buildings.push({ id: 'landmark', foot: rect(r1(lp[0] - w / 2), lp[1], r1(lp[0] + w / 2), r1(lp[1] + d)), storeys: Lm.storeys || 1, h: Lm.h, style: Lm.style || 'gothic-ruin', crown: Lm.crown || 'abbey', landmark: true, src: Lm.src || `${b.place}: the landmark on the cliff` }); subject = { id: 'landmark', kind: 'building' }; }
  // the lamp on the finger quay (framing), its yacht; the fishing boats along the leading quay; dinghies on their moorings
  ent.push({ id: 'frame-lamp', obj: 'street.lamppost', at: [X(fx0 + 1.2), 13], framed: true }); framing.push('frame-lamp');
  // the yacht alongside the finger near the lens (off its end the engine laid it broadside across the end), the fishing boats from 32 m
  ent.push({ id: 'yacht', obj: 'boat.yacht', at: [X(fx0 - 2.2), 14], facing: 0, attach: 'water', model: { seed: b.seed + 3 } });
  [[32, 0], [50, 1], [70, 2]].forEach(([z, i]) => ent.push({ id: 'moored-' + i, obj: 'boat.fishing-boat', at: [X(r1(edge(z) + 3.2)), z], facing: s > 0 ? 348 : 12, attach: 'water', model: { seed: b.seed + 11 * i } }));
  // dinghies on their moorings, at least 7 m apart
  const moor = [];
  for (let i = 0, tries = 0; moor.length < 5 && tries < 60; tries++, i++) { const p = [r1(10 + rnd() * 60), r1(40 + rnd() * (wl - 50))]; if (moor.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 7)) moor.push(p); }
  moor.forEach((p, i) => ent.push({ obj: 'boat.dinghy', at: [X(p[0]), p[1]], facing: r1(rnd() * 360), attach: 'water', model: { seed: b.seed + 40 + i } }));
  // the near quay's dressing: a bench facing the water, bollards along the edge, a lifebuoy
  ent.push({ id: 'bench-q', obj: 'street.bench', at: [X(r1(edge(16) - 3.5)), 16], facing: s > 0 ? 80 : 280 });
  for (const z of [12, 20, 30, 38]) ent.push({ obj: 'street.bollard', at: [X(r1(edge(z) - 0.8)), z] });
  ent.push({ obj: 'street.bollard', at: [X(fx0 + 0.8), 18] }, { obj: 'street.bollard', at: [X(fx0 + 0.8), 9] });
  const life = [
    { id: 'walkers', who: 'walkers', on: 'quay', rate: '12/min', mix: { stroll: 0.4, family: 0.2, couple: 0.2, 'dog-walker': 0.1, chat: 0.1 }, edges: ['S', 'N'] },
    { id: 'sitter', who: 'visit', on: 'quay', rate: '1/2min', mix: { elderly: 0.6, couple: 0.4 }, edges: ['S'], goals: [{ sit: 'bench-q', for: [40, 120] }, { leave: 'S' }] },
    { id: 'far', who: 'walkers', on: beach ? 'beach' : 'shore-st', rate: '3/min', mix: { stroll: 0.4, family: 0.3, 'dog-walker': 0.3 }, edges: ['W', 'E'] },
    { id: 'shore', who: 'walkers', on: 'shore-st', rate: '2/min', mix: { stroll: 0.6, couple: 0.4 }, edges: ['W', 'E'] },
    { who: 'gulls', count: 6 },
  ];
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt, region: b.region, style: 'quayside' }, camera: cam0, ground, surfaces, buildings, entities: ent, life,
    backdrop: { style: b.backdrop || 'town-low' }, seed: b.seed };
  if (landmarks.length) spec.landmarks = landmarks;
  notes.push(`the leading quay runs from the frame's foot to the ${slope ? 'slope' : 'cliff'} at ${zf} m; the landmark ${zl} m out on the ${s > 0 ? 'right' : 'left'} third`);
  return { spec, plan: { subject, lead: quayEdge.slice(1).map(p => [X(p[0]), p[1]]), framing, far: 'far', near: ['walkers', 'sitter'] }, notes };
}

/* ============================================================
   waterfront-civic (gold: Liverpool, the Pier Head). A promenade along the water's edge seen along its length: the river wall and its
   railing run from the frame's foot into the distance (the leading line Liverpool's frame missed: its wall entered at 60 % of the
   height), the water and its boats on one side, the civic frontage receding on the other, fanned out by the turn of the view; the
   landmark (a lighthouse, a tower, the great civic building) on the land-side THIRD, sized so its top stays in the frame; a lamp
   standard on the river wall and a plane tree on the plaza frame the two sides close in (Liverpool had neither); benches facing the
   water and tubs dress the near band; people stop at the railing to look out, sit, cross; buses on the road are the far mover. An
   optional BANK raises the land side behind the promenade into a terrace (a hoe, an esplanade on a cliff) with the landmark on its top.
   brief: side: the land and the landmark on the 'right' (default) or 'left'; landmark { obj, model, z } (default the lighthouse model)
   or { style, crown, storeys, w, d, z }; houses: the frontage style (baroque-civic) or a list; storeys: [a, b] of the frontage;
   back: m from the river wall to the frontage (70); bank: m the land rises behind the promenade (0); ground: plaza | grass (the land
   between); boats: yachts | ferries; water: estuary | sea | river | harbour; backdrop (estuary).
   ============================================================ */
function waterfrontCivic(b, E) {
  const s = mirror(b.side), cam0 = { eye: 1.7, fov: 74, horizon: 520, heading: b.heading == null ? 0 : b.heading, water: -2.4 };
  const cam = frameCam(cam0), notes = [], rnd = rngOf(b.seed);
  const X = (x) => r1(x * s);   // authored with the water on the LEFT (s = 1)
  const wall = (z) => r1(-1.6 - z * 0.09);   // the river wall: from the frame's foot just left of centre, receding a little to the left
  const bank = Math.max(0, Math.min(30, Number(b.bank) || 0)), back = Math.max(40, Math.min(160, Number(b.back) || 70));
  // to 420 m (the wall is 4 px above the horizon there); to 700 m the fill of the land and the water cost 0.7 s of a 1 s build
  const zsW = [-60, 0.5, 6, 20, 60, 140, 260, 420];
  const wpts = zsW.map(z => [wall(z), z]);
  const surfaces = [
    { id: 'water', kind: 'water', water: b.water || 'estuary', shallow: 2, poly: [[X(-1400), -60]].concat(wpts.map(p => [X(p[0]), p[1]]), [[X(-1400), 420]]) },
    { id: 'prom', kind: 'pavement', poly: wpts.map(p => [X(p[0]), p[1]]).concat(wpts.slice().reverse().map(p => [X(r1(p[0] + 9)), p[1]])) },
    { id: 'land', kind: b.ground === 'grass' ? 'grass' : 'plaza', poly: wpts.map(p => [X(r1(p[0] + 9)), p[1]]).concat(wpts.slice().reverse().map(p => [X(r1(p[0] + back - 8)), p[1]])) },
  ];
  // the road in front of the frontage (its buses are the far mover) and the frontage's pavement
  const road = [[X(r1(wall(-60) + back - 4)), -60], [X(r1(wall(420) + back - 4)), 420]], pave = [[X(r1(wall(-60) + back + 3)), -60], [X(r1(wall(420) + back + 3)), 420]];
  surfaces.push({ id: 'road', kind: 'road', path: road, width: 8 }, { id: 'pave', kind: 'pavement', path: pave, width: 4 });
  const ground = { features: [] };
  // the bank: a broad flat-topped ridge whose near ramp (a quarter of its width) climbs from the promenade's back to the terrace
  if (bank > 0) { const ramp = Math.max(30, back * 0.6), cx = (z) => r1(wall(z) + 10 + ramp * 2); ground.features.push({ id: 'bank', kind: 'embankment', path: [[X(cx(-200)), -200], [X(cx(900)), 900]], width: r1(ramp * 4), h: bank }); }
  // the frontage: grand buildings along the road, receding (the fan)
  const styles = Array.isArray(b.houses) ? b.houses : typeof b.houses === 'string' ? b.houses.split(',').map(x => x.trim()).filter(Boolean) : ['baroque-civic'];
  const st = Array.isArray(b.storeys) ? b.storeys : [4, 6];
  const buildings = [];
  let u = 70;
  // about 250 m of frontage (beyond that a house is a few pixels; 600 m of rows built 87 houses: 1.95 s)
  styles.forEach((style, i) => { const len = i === styles.length - 1 ? Math.max(60, 250 - (u - 70)) : 60 + Math.floor(rnd() * 40); buildings.push({ id: 'front-' + i, along: 'pave', side: s > 0 ? 'right' : 'left', style, storeys: st, from: u, to: u + len, depth: [14, 22], shops: false }); u += len + 6; });
  // the landmark on the land side's third, far enough that its top keeps 8 % of the frame above it. The default lighthouse has no
  // keeper's cottage (a tower on a promenade stands alone): the model draws one unless u('cottage') >= 0.8 of the seed it hashes from
  // the entity id 'landmark' and model.seed (79-world-4models.js), which seed 23 gives
  const Lm = b.landmark && typeof b.landmark === 'object' ? b.landmark : { obj: 'structure.lighthouse', model: { livery: 'white-red', size: 1, seed: 23 } };
  const zl0 = Number(Lm.z) || 80, zl = r1(Math.max(zl0, cam.f * (heightOf(E, Lm) + bank - cam0.eye) / (cam0.horizon - 72)));
  const lp = at(cam, { third: s > 0 ? 'right' : 'left', z: zl });
  const landmarks = [], ent = [], framing = [];
  let subject;
  if (Lm.obj) { landmarks.push({ id: 'landmark', obj: Lm.obj, at: lp, facing: Number.isFinite(Number(Lm.facing)) ? Number(Lm.facing) : r1(270 * s), src: Lm.src || `${b.place}: the landmark on the waterfront`, model: Lm.model }); subject = { id: 'landmark', kind: 'landmark' }; }
  else { const w = Lm.w || 50, d = Lm.d || 40; buildings.push({ id: 'landmark', foot: rect(r1(lp[0] - w / 2), lp[1], r1(lp[0] + w / 2), r1(lp[1] + d)), storeys: Lm.storeys || 7, style: Lm.style || 'baroque-civic', crown: Lm.crown || 'great-dome', landmark: true, src: Lm.src || `${b.place}: the civic landmark` }); subject = { id: 'landmark', kind: 'building' }; }
  // the river wall's railing (open nowhere: the promenade has no steps here)
  const lines = [{ id: 'rail', kind: 'railing', path: zsW.slice(1).map(z => [X(r1(wall(z) + 0.5)), z]) }];
  // framing: on the water side a yacht moored broadside at the frame's edge, its mast just inside it (a lamp on the wall cannot reach the
  // edge: at 6 m it stood at 40 % of the width, a pole down the middle of the frame); a lamp standard on the wall further along (thin);
  // a plane tree on the land side
  ent.push({ id: 'frame-yacht', obj: 'boat.yacht', at: at(cam, { frame: s > 0 ? 'left' : 'right', z: 15, w: 9, show: 0.62 }), facing: 90, attach: 'water', framed: true, model: { seed: b.seed + 5 } }); framing.push('frame-yacht');
  ent.push({ id: 'wall-lamp', obj: 'street.lamppost', at: [X(r1(wall(16) + 1.2)), 16] });
  ent.push({ id: 'frame-tree', obj: 'tree.plane-avenue', at: at(cam, { frame: s > 0 ? 'right' : 'left', z: 13, w: widthOf(E, 'tree.plane-avenue', 23), reach: 0.14 }), framed: true }); framing.push('frame-tree');
  // benches facing the water along the promenade's back, a bin, tubs; the lookout point at the railing
  for (const [z, id] of [[11, 'bench-1'], [24, 'bench-2']]) ent.push({ id, obj: 'street.bench', at: [X(r1(wall(z) + 7.6)), z], facing: r1(270 * s) });
  ent.push({ obj: 'street.mcr-bin', at: [X(r1(wall(15) + 8)), 15] }, { obj: 'plant.rph-flower-tub', at: [X(r1(wall(9) + 8.4)), 9] }, { obj: 'plant.rph-flower-tub', at: [X(r1(wall(30) + 8.4)), 30] });
  const look = [X(r1(wall(17) + 1.3)), 17];
  // boats on the water: yachts on their moorings, or ferries under way far out
  const boats = b.boats === 'ferries' ? [['boat.trip-boat', -60, 160], ['boat.river-ferry', -140, 320]] : [['boat.yacht', -40, 90], ['boat.yacht', -70, 150], ['boat.yacht', -30, 210], ['boat.trip-boat', -110, 260]];
  boats.forEach(([obj, dx, z], i) => ent.push({ obj, at: [X(r1(wall(z) + dx)), z], facing: r1((rnd() - 0.5) * 60 + (i % 2 ? 180 : 0)), attach: 'water', model: { seed: b.seed + 9 * i } }));
  const life = [
    { id: 'walkers', who: 'walkers', on: 'prom', rate: '16/min', mix: { stroll: 0.4, couple: 0.2, family: 0.15, 'dog-walker': 0.1, jogger: 0.15 }, edges: ['S', 'N'] },
    { id: 'lookers', who: 'visit', on: 'prom', rate: '1/min', mix: { stroll: 0.5, couple: 0.5 }, edges: ['S'], goals: [{ go: look }, { do: 'look', for: [20, 50] }, { leave: 'N' }] },
    { id: 'sitter', who: 'visit', on: 'prom', rate: '1/2min', mix: { elderly: 0.6, couple: 0.4 }, edges: ['S'], goals: [{ sit: 'bench-2', for: [40, 120] }, { leave: 'S' }] },
    { id: 'land', who: 'walkers', on: 'land', rate: '3/min', mix: { stroll: 0.5, family: 0.3, couple: 0.2 } },
    { id: 'far', who: 'buses', on: 'road', rate: '2/min' }, { who: 'cars', on: 'road', rate: '4/min' },
    { who: 'gulls', count: 6 },
  ];
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt, region: b.region, style: 'waterfront-city' }, camera: cam0, surfaces, lines, buildings, entities: ent, life,
    backdrop: { style: b.backdrop || 'estuary' }, seed: b.seed };
  if (bank) spec.ground = ground;
  if (landmarks.length) spec.landmarks = landmarks;
  notes.push(`the river wall leads from the frame's foot into the vista; the landmark ${zl} m out on the ${s > 0 ? 'right' : 'left'} third${bank ? `, on a ${bank} m bank` : ''}`);
  return { spec, plan: { subject, lead: wpts.slice(1).map(p => [X(p[0]), p[1]]), framing, far: 'far', near: ['walkers', 'lookers', 'sitter'] }, notes };
}

/* ============================================================
   edge-over-valley (gold: Stanage Edge above the Hope Valley). On the top of a moor at the shoulder of a valley: the rock (a tor of
   stacked blocks, or a crag) on the right THIRD with a path through the heather leading to it, the land falling away on the left into
   a valley of walled fields with a hamlet and its church tower, the far side rising to a ridge; boulders and a lone thorn frame the
   two sides; ponies or sheep graze the near-mid band, walkers go to the rock and on along the moor (the far mover), a buzzard turns
   over the valley. Stanage's valley expanded to a 710 KB spec and a 4-5 s build; this one asks the same generator for less (six rows
   of larger fields, walls only on the near slope, eight woods, a hamlet of nine), authors its near carpet, and turns the fill off.
   brief: tor: m (the mound under the stacked blocks, 3-8); torZ: m (40-90); drop: m to the valley floor
   (120-300); grazers: ponies | sheep | cattle; houses: the hamlet's style (stone-cottage); church: false to leave the hamlet's
   church out; trees: the lone tree beside the path (tree.hawthorn); backdrop (upland). The valley falls to the LEFT (side 'right' only).
   ============================================================ */
function edgeOverValley(b, E) {
  const s = 1, cam0 = { eye: 1.7, fov: 68, horizon: 420, heading: b.heading == null ? 0 : b.heading };
  const cam = frameCam(cam0), notes = [], rnd = rngOf(b.seed);
  if (b.side === 'left') notes.push('edge-over-valley: side left is not built yet (the valley generator falls to the left); drawn with the rock on the right');
  const torH = Math.max(3, Math.min(8, Number(b.tor) || 4)), torZ = Math.max(40, Math.min(90, Number(b.torZ) || 55));
  const drop = Math.max(120, Math.min(300, Number(b.drop) || 190));
  const T = at(cam, { third: 'right', z: torZ });
  // the valley (worldValley, expanded by the build): s metres downhill to the LEFT, u along the contour (ahead). The slope starts at the lens
  // (shoulder 0): with a 70 m shoulder the eye 1.7 m up saw a sliver of fields at the horizon and nothing of the valley (draft 1)
  // the contours run 22 degrees right of the view (bearing 22: the valley falls to their left, so ahead-left): straight ahead the far side lay
  // off the frame's left edge (a flat plain beyond the slope, draft 4); at -22 the land fell left and BACK (draft 5, the valley hidden)
  const vb = Number.isFinite(Number(b.bearing)) ? Number(b.bearing) : 22, th = vb * Math.PI / 180, vc = [Math.sin(th), Math.cos(th)], vf = [-vc[1], vc[0]];
  const vat = (sv, u) => [r1(sv * vf[0] + u * vc[0]), r1(sv * vf[1] + u * vc[1])];
  const valley = {
    seed: b.seed % 997, bearing: vb, drop, fall: 900, floor: 520, shoulder: 0, noise: 0.8, far: { rise: r1(drop * 1.1), run: 1000 },
    fields: { from: 160, to: 2600, u: [-500, 3200], rows: 6, cell: 420, wallsTo: 900, cross: false },
    woods: { n: 8, s: [300, 1900], u: [0, 3000], size: [70, 200], obj: ['tree.far-broad', 'tree.distant', 'tree.far-birch'], density: 0.0003 },
    farms: { n: 4, lamps: 2 }, lanes: true,
    hamlet: { at: [1180, 1500], houses: 9, spread: 60, style: b.houses || 'stone-cottage', lamps: 3 },
  };
  // the tor: a low mound with big jointed blocks stacked on it (the block model's 'stack' and 'block' forms, set 10 m apart so no two
  // footprints meet); a crag arc read as one smooth boulder (draft 1)
  const ground = { features: [{ id: 'tor-mound', kind: 'bank', path: [[r1(T[0] - 14), r1(T[1] + 3)], [r1(T[0] + 14), r1(T[1] + 3)]], width: 40, h: torH }] };
  const surfaces = [
    { id: 'moor', kind: 'heath', poly: [vat(40, -400), vat(40, 4000), vat(-1200, 4000), vat(-1200, -400)] },
    // the near carpet in the frame's two bottom corners, the mid moor between the lens and the tor (where the grazers are)
    { id: 'near-l', kind: 'heath', poly: [[-9, 0.5], [-1.4, 0.5], [-1.4, 10], [-9, 10]] },
    { id: 'near-r', kind: 'heath', poly: [[3, 0.5], [13, 0.5], [13, 11], [3, 11]] },
    { id: 'mid', kind: 'heath', poly: [[-26, 12], [34, 12], [40, 46], [-30, 46]] },
    // ONE path from behind the lens past the tor's foot and on along the moor beyond the walk grid's far edge (300 m): a population on a
    // path enters and leaves where it meets the frame's edges, and a path that stopped at the tor (with the ridge a second surface) gave
    // its walkers one edge only: they spawned and left on the spot (draft 3, no far mover)
    { id: 'path', kind: 'path', path: [[0.6, -4], [0.8, 4], [2.6, 14], [r1(T[0] * 0.55), r1(torZ * 0.55)], [r1(T[0] - 6), r1(torZ - 14)], [r1(T[0] - 12), r1(torZ + 25)], [r1(T[0] - 16), r1(torZ + 110)], [r1(T[0] - 20), 290], [r1(T[0] - 24), 420]], width: 1.6 },
  ];
  const ent = [], framing = [], taken = [];
  const blk = (id, x, z, size, seed, livery, form, framed, facing) => {
    const e = { obj: 'rock.gritstone-block', at: [r1(x), r1(z)], facing: facing == null ? r1(rnd() * 360) : facing, model: { size, seed, livery } };
    if (form) e.model.opts = { form };
    if (id) e.id = id;
    if (framed) { e.framed = true; framing.push(id); }
    ent.push(e); taken.push([x, z, 1.6 * size]);
  };
  const free = (x, z, r) => taken.every(([a, c, q]) => Math.hypot(a - x, c - z) > q + r);
  const tor = [[0, 0, 4.2, 'stack'], [-12, 1, 3.2, 'stack'], [12, 1.5, 3.0, 'block'], [-6, 11, 3.4, 'block'], [6.5, 11.5, 3.6, 'stack']];
  tor.forEach(([dx, dz, sz, form], i) => blk(i ? null : 'tor-top', T[0] + dx, T[1] + dz, sz, 31 + i * 7, i % 2 ? 'buff' : 'weathered', form, false, r1((rnd() - 0.5) * 30 + (i % 2) * 180)));
  // clitter: fallen blocks on the mound's slopes and below it, never touching
  for (let i = 0, k = 0; i < 40 && k < 10; i++) { const x = T[0] + (rnd() - 0.5) * 50, z = T[1] - 8 - rnd() * 14, sz = 0.5 + rnd() * 0.6; if (free(x, z, 1.6 * sz)) { blk(null, x, z, sz, 80 + i, rnd() < 0.5 ? 'weathered' : 'buff'); k++; } }
  // framing: a big boulder cut by the right edge close in; a lone wind-bent thorn on the valley side
  // (a 1.6 block at 8 m stayed below the frame's middle: no frame; a 2.6 'stack' at 7 m rises past it)
  const fr = at(cam, { frame: 'right', z: 7, w: 6.5, show: 0.5 });
  blk('frame-r', fr[0], fr[1], 2.6, 5, 'weathered', 'stack', true);
  const thorn = b.trees || 'tree.hawthorn';
  ent.push({ id: 'frame-l', obj: thorn, at: at(cam, { frame: 'left', z: 9, w: widthOf(E, thorn, 7), reach: 0.2 }), framed: true }); framing.push('frame-l');
  // the carpets (authored: the fill is off)
  for (const [id, k] of [['near-l', 0], ['near-r', 1]]) ent.push({ cluster: 'plant.ling-heather', on: id, n: 46, seed: b.seed + 51 + k, gap: 0.22 }, { cluster: 'plant.bilberry', on: id, n: 14, seed: b.seed + 53 + k, gap: 0.4 },
    { cluster: 'plant.grass-long', on: id, n: 10, seed: b.seed + 55 + k, gap: 0.6 }, { cluster: 'plant.rph-short-grass', on: id, n: 70, seed: b.seed + 57 + k, gap: 0.1 });
  ent.push({ cluster: 'plant.ling-heather', on: 'mid', n: 90, seed: b.seed + 61, gap: 1.1 }, { cluster: 'plant.bracken', on: 'mid', n: 34, seed: b.seed + 62, gap: 1.8 }, { cluster: 'plant.grass-long', on: 'mid', n: 30, seed: b.seed + 63, gap: 1.4 },
    { cluster: 'plant.bracken', on: 'moor', n: 30, seed: b.seed + 58, gap: 5 }, { cluster: 'plant.ling-heather', on: 'moor', n: 40, seed: b.seed + 59, gap: 4 });
  const landmarks = [];
  if (b.church !== false && b.church !== 'false') landmarks.push({ id: 'church', obj: 'structure.parish-church', at: vat(1180, 1560), facing: 90, src: `${b.place}: the church tower in the valley below`, model: { livery: 'grey-limestone', size: 1.3, opts: { crown: 'parapet', era: 'perpendicular' } } });
  const graze = b.grazers || 'ponies';
  const life = [
    { id: 'walkers', who: 'walkers', on: 'path', rate: '2/min', mix: { stroll: 0.3, brisk: 0.3, couple: 0.2, 'dog-walker': 0.2 }, edges: ['near', 'far'] },
    { id: 'visit', who: 'visit', on: 'path', rate: '1/2min', mix: { stroll: 0.5, couple: 0.5 }, edges: ['near'], goals: [{ go: [r1(T[0] - 7), r1(torZ - 14)] }, { do: 'look', for: [20, 50] }, { leave: 'near' }] },
    { id: 'far', who: 'walkers', on: 'path', rate: '2/min', mix: { brisk: 0.5, couple: 0.3, 'dog-walker': 0.2 }, edges: ['far', 'near'] },
    { id: 'grazers', who: graze, count: graze === 'sheep' ? 6 : 5, on: 'mid' },
    { who: 'bird.buzzard-flight', count: 1 }, { who: 'bird.small-flight', count: 2 },
  ];
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt || 380, region: b.region, style: 'moor' }, camera: cam0, valley, ground, surfaces, entities: ent, life,
    backdrop: { style: b.backdrop || 'upland' }, fill: false, seed: b.seed };
  if (landmarks.length) spec.landmarks = landmarks;
  notes.push(`the tor (blocks on a ${torH} m mound) at ${torZ} m on the right third; the valley falls ${drop} m on the left from the lens`);
  return { spec, plan: { subject: { id: 'tor-top', kind: 'entity' }, lead: surfaces[4].path.slice(1, 6), framing, far: 'far', near: ['walkers', 'visit', 'grazers'] }, notes };
}

export const ARCHETYPES = Object.freeze({
  'boardwalk-wetland': { id: 'boardwalk-wetland', gold: 'fleet-pond-2-w3', goldPlan: { subject: { id: 'fen-deck', kind: 'surface' } }, kit: 'pond', build: boardwalkWetland,
    summary: 'a boardwalk through carr and reeds to a deck; open water; a far-shore mover; carr framing both sides; waterfowl and a birdwatcher',
    brief: { trees: 'carr | heath', far: 'rail | road | path', side: 'right | left (the walk drifts)', deck: 'm (14-24)', farZ: 'm (120-260)', stream: 'true | false', landmark: '{ style, crown, storeys } or { obj } on the far shore' },
    checks: { sky: [0.08, 0.42], lead: true, framing: 2, farMover: 60, nearLife: 1 } },
  'village-green': { id: 'village-green', gold: 'hampshire-yateley-green-1-w3', goldPlan: { subject: { kind: 'landmark' } }, kit: 'village-green', build: villageGreen,
    summary: 'a diagonal path across a green to the parish church on a third; a pond on the other; houses along the lane; framing trees; cars on the lane',
    brief: { side: 'right | left (the church third)', landmark: '{ stone: flint | honey | grey-limestone | ironstone | red-sandstone, crown: parapet | spire }', houses: 'building style', pond: 'false to leave it out', backdrop: 'farmland | woodland | downs' },
    checks: { sky: [0.12, 0.45], lead: true, framing: 2, farMover: 60, nearLife: 1 } },
  'canal-basin': { id: 'canal-basin', gold: 'greater-manchester-castlefield-basin-w3', goldPlan: { subject: { obj: 'structure.mcf-merchants-bridge', kind: 'entity' } }, kit: 'canal', build: canalBasin,
    summary: 'the basin up the middle to a footbridge; warehouses along one quay, a towpath on the other; moored narrowboats; a viaduct across the far band',
    brief: { side: 'left | right (the warehouses)', houses: 'warehouse style (mill)', viaduct: 'false to leave it out', bridge: 'm (40-80)', backdrop: 'city-victorian | city-manchester-towers | town-low' },
    checks: { sky: [0.1, 0.45], lead: true, framing: 2, farMover: 40, nearLife: 1 } },
  'civic-square-facade': { id: 'civic-square-facade', gold: 'greater-manchester-manchester-centre-1-w3', goldPlan: { subject: { kind: 'landmark' } }, kit: 'civic-square', build: civicSquare,
    summary: 'a square corner-on: the landmark facade at three-quarters on a third, a receding street, statue and lamp framing, tree pits, a tram across the far side',
    brief: { side: 'right | left (the landmark third)', landmark: '{ style, crown, storeys, w, d, z } or { obj, model }', houses: 'the side street style (georgian)', rows: "the side street's storeys 'a-b' (4-6)", tram: 'false for buses', far: 'tram | buses | cars', ground: 'plaza | grass (a close)', frame: 'statue | tree' },
    checks: { sky: [0.1, 0.45], lead: true, framing: 2, farMover: 60, nearLife: 2 } },
  'medieval-lane': { id: 'medieval-lane', gold: 'norwich-elm-hill-1-w3', goldPlan: { subject: { kind: 'landmark' } }, kit: 'cobbled-lane', build: medievalLane,
    summary: 'a cobbled lane between leaning old fronts, climbing to a great church above the roofs on a third; visitors at the windows, walkers across the head',
    brief: { side: 'right | left (the landmark third)', landmark: '{ style: gothic-minster, crown: twin-towers | central-spire | west-tower, w, d, storeys, z, turn } or { obj, model, facing }', houses: 'a style or styles, comma separated (timber-framed)', rise: 'm the lane climbs (6)', length: 'm (100)', width: 'm (6)', kit: 'cobbled-lane | old-town-lane' },
    checks: { sky: [0.02, 0.3], lead: true, framing: 2, farMover: 60, nearLife: 2 } },
  'harbour-under-cliff': { id: 'harbour-under-cliff', gold: 'whitby-harbour-1-w3', goldPlan: { subject: { kind: 'building', id: 'st-marys' } }, kit: 'quayside', build: harbourUnderCliff,
    summary: 'a harbour basin from its inner corner: a quay edge leading to the far shore, boats along it, the town and its cliff across the water, the landmark on the cliff top on a third',
    brief: { side: 'right | left (the landmark third)', cliff: 'rock | slope', h: 'm (14-40)', rock: 'limestone | sandstone | granite | slate | chalk', houses: 'quay and shore style (pantile-cottage)', top: 'cliff-top terrace style (seafront-regency)', landmark: '{ obj, model, facing } or { style, crown, storeys, w, d }', far: 'm to the far shore (90-170)', beach: 'false for a quay' },
    checks: { sky: [0.1, 0.5], lead: true, framing: 2, farMover: 60, nearLife: 2 } },
  'waterfront-civic': { id: 'waterfront-civic', gold: 'liverpool-pier-head-1-w3', goldPlan: { subject: { kind: 'building', id: 'liver' } }, kit: 'waterfront-city', build: waterfrontCivic,
    summary: 'a promenade along the water seen along its length: the river wall leading in, boats on the water, the civic frontage fanned out, the landmark on the land-side third, a lamp and a plane tree framing',
    brief: { side: 'right | left (the land and the landmark)', landmark: '{ obj, model, z } or { style, crown, storeys, w, d, z }', houses: 'frontage style(s) (baroque-civic)', storeys: '[a, b]', back: 'm wall to frontage (70)', bank: 'm the land rises (0)', ground: 'plaza | grass', boats: 'yachts | ferries', water: 'estuary | sea | river | harbour' },
    checks: { sky: [0.15, 0.55], lead: true, framing: 2, farMover: 60, nearLife: 2 } },
  'edge-over-valley': { id: 'edge-over-valley', gold: 'peak-stanage-edge-1-w3', goldPlan: { subject: { kind: 'entity', id: 'cap-1' } }, kit: 'moor', build: edgeOverValley,
    summary: 'on a moor at the shoulder of a valley: a tor on the right third with a path to it, the valley of walled fields, a hamlet and church below on the left, grazers and walkers, a buzzard',
    brief: { tor: 'm the mound under the stacked blocks (3-8)', torZ: 'm (40-90)', bearing: 'degrees the contours run right of the view (22: the valley opens ahead-left)', drop: 'm (120-300)', grazers: 'ponies | sheep | cattle', houses: "the hamlet's style (stone-cottage)", church: 'false', trees: 'the lone tree (tree.hawthorn)', backdrop: 'upland' },
    checks: { sky: [0.15, 0.6], lead: true, framing: 2, farMover: 60, nearLife: 1 } },
});
export function archetypeList() { return Object.values(ARCHETYPES).map(a => ({ id: a.id, gold: a.gold, summary: a.summary, brief: a.brief })); }

/** A spec from a brief through an archetype. */
export function archetypeSpec(id, brief, E) {
  const a = ARCHETYPES[id];
  if (!a) throw new Error(`unknown archetype '${id}'. Archetypes: ${Object.keys(ARCHETYPES).join(', ')}`);
  const b = briefOf(brief);
  const r = a.build(b, E);
  const meta = metaOf(b, a, { setting: a.summary });
  return { spec: r.spec, meta, plan: r.plan, notes: r.notes || [], archetype: a, brief: b };
}

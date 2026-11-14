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
  // the footbridge on the mid band: a deck across the basin (bridge-deck over water), the subject of the view
  const bw = W(bz) + 3;
  surfaces.push({ id: 'bridge', kind: 'bridge-deck', path: [[r1(cl(bz) - bw), bz], [r1(cl(bz) + bw), bz]], width: 2.6, over: 'water' });
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
  const fz = 9, tw = widthOf(E, 'tree.plane-avenue', 23);
  const fp = at(cam, { frame: s > 0 ? 'right' : 'left', z: fz, w: tw, reach: 0.18 });
  ent.push({ id: 'frame-tree', obj: 'tree.plane-avenue', at: fp, framed: true }); framing.push('frame-tree');
  const lp = at(cam, { frame: s > 0 ? 'left' : 'right', z: 7, w: 1, show: 0.9 });
  ent.push({ id: 'frame-lamp', obj: 'street.lamppost', at: lp, framed: true }); framing.push('frame-lamp');
  for (const z of [30, 60, 90]) ent.push({ obj: 'tree.plane-avenue', at: [r1(t[zs.findIndex(v => v >= z)][0] - qs * 6), z] });
  for (let i = 0; i < 4; i++) ent.push({ obj: 'street.bollard', at: [r1(q[1][0] + qs * 1 + (rnd() - 0.5)), r1(12 + i * 7)] });
  // the wharf's edge: bollards along the water, a planter and a bench (the near band of a basin is stone, dressed, not bare)
  for (let x = -12; x <= 12; x += 6) ent.push({ obj: 'street.bollard', at: [r1(x + (rnd() - 0.5)), 7.6] });
  ent.push({ obj: 'structure.mcr-planter', at: [r1(qs * 14), 5], variant: 0 }, { obj: 'street.bench', at: [r1(qs * 9), 6.2], facing: 0 });
  ent.push({ obj: 'street.bench', at: [r1(-qs * 8), 4], facing: 0 }, { cluster: 'plant.grass-long', on: 'green', n: 30, seed: b.seed + 9 }, { cluster: 'ground.leaf-litter', on: 'tow', n: 10, seed: b.seed + 10 });
  const life = [
    { id: 'walkers', who: 'walkers', on: 'tow', rate: '6/min', mix: { stroll: 0.4, 'dog-walker': 0.2, jogger: 0.15, couple: 0.25 }, edges: ['S', 'N'] },
    { id: 'quayside', who: 'walkers', on: 'quay', rate: '4/min', mix: { stroll: 0.5, commuter: 0.3, couple: 0.2 }, edges: ['S', 'N'] },
    { id: 'far', who: 'walkers', on: 'bridge', rate: '5/min', mix: { stroll: 0.6, commuter: 0.4 } },
    { id: 'boat', who: 'narrowboat-cruising', count: 1, on: 'basin' },
    { who: 'mallard', count: 4, on: 'basin' }, { who: 'mute-swan', count: 2, on: 'basin', group: 'pair' }, { who: 'gulls', count: 3 },
  ];
  // the urban kit (stone quays, no reed fringe in the basin); 'canal' is the towpath-in-fields kit
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt, region: b.region, style: b.kit || 'river-city' }, camera: cam0, surfaces, buildings, entities: ent, life,
    backdrop: { style: b.backdrop || 'city-victorian' }, seed: b.seed };
  return { spec, plan: { subject: { id: 'bridge', kind: 'surface' }, lead: zs.map(z => [cl(z), z]), framing, far: 'far', near: ['walkers', 'quayside'] }, notes };
}

/* ============================================================
   civic-square-facade (gold: Manchester, Albert Square). A square seen corner-on: the landmark's facade at three-quarters across
   a third, the square in front, a street of tall buildings receding along the other side (the leading line), a statue framing one
   side close in and a lamp the other, tree pits with benches and bins, a tram (or buses) crossing the far side, people crossing.
   brief: landmark { style (default gothic-minster), crown (default twin-towers), storeys, w, d } or { obj, model }; houses: the side
   street's style (default georgian); tram: false for buses on a road; side: the landmark on the 'right' (default) or 'left' third.
   ============================================================ */
function civicSquare(b, E) {
  const rnd = rngOf(b.seed), s = mirror(b.side), cam0 = { eye: 1.65, fov: 72, horizon: 600, heading: b.heading == null ? 52 : b.heading };
  const cam = frameCam(cam0), notes = [];
  const Lm = b.landmark && typeof b.landmark === 'object' ? b.landmark : {};
  // the landmark across the right third at 85-110 m, turned 35 degrees so its front is seen at three-quarters
  const c = at(cam, { third: s > 0 ? 'right' : 'left', z: Lm.z || 140 });
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
  const surfaces = [
    { id: 'square', kind: 'plaza', poly: [[-60, 0.5], [60, 0.5], [70, 108], [-70, 108]] },
    { id: 'pave', kind: 'pavement', path: street, width: 4 },
    { id: 'front', kind: 'pavement', poly: [foot[0], foot[1], [r1(foot[1][0] + 6 * Math.sin(a)), r1(foot[1][1] - 6 * Math.cos(a))], [r1(foot[0][0] + 6 * Math.sin(a)), r1(foot[0][1] - 6 * Math.cos(a))]] },
  ];
  buildings.push({ id: 'street', along: 'pave', side: s > 0 ? 'left' : 'right', style: b.houses || 'georgian', storeys: [4, 6], from: 6, to: 236, depth: [14, 20], shops: true });
  // the tram (or bus) line across the far side of the square
  const tz = 112, far = b.tram === false || b.tram === 'false' ? 'buses' : 'tram';
  surfaces.push({ id: 'line', kind: far === 'tram' ? 'tram' : 'road', path: [[-260, tz + 8], [260, tz - 8]], width: 9 }, { id: 'pave-far', kind: 'pavement', path: [[-260, tz + 2], [260, tz - 14]], width: 3.4 });
  // statue framing one side, lamp the other; tree pits with benches and bins down the square
  const ent = [], framing = [];
  ent.push({ id: 'frame-statue', obj: 'street.mcr-statue', at: at(cam, { frame: s > 0 ? 'left' : 'right', z: 6, w: 2.6, show: 0.85 }), framed: true }); framing.push('frame-statue');
  ent.push({ id: 'frame-lamp', obj: 'street.lamppost', at: at(cam, { frame: s > 0 ? 'right' : 'left', z: 6.5, w: 2, show: 0.9 }), framed: true }); framing.push('frame-lamp');
  const pits = [];
  for (const z of [20, 35, 50]) {
    const x = r1(sx(z) + s * 8);
    pits.push({ id: 'pit-' + z, kind: 'grass', poly: rect(r1(x - 1), z - 1, r1(x + 1), z + 1) });
    ent.push({ obj: 'tree.plane-avenue', at: [x, z] }, { obj: 'street.bench', at: [r1(x + s * 3), z], facing: s > 0 ? 90 : 270 }, { obj: 'street.mcr-bin', at: [r1(x + s * 2), r1(z + 3)] });
  }
  surfaces.push(...pits);
  for (const z of [30, 70, 110]) ent.push({ obj: 'street.lamppost', at: [r1(c[0] - s * 30 + (rnd() - 0.5) * 6), z] });
  ent.push({ obj: 'street.bollard', at: [-3, 40] }, { obj: 'street.bollard', at: [-1.5, 40.6] }, { obj: 'street.bollard', at: [0, 41.2] }, { cluster: 'ground.leaves', on: 'square', n: 14, seed: b.seed + 2 });
  const life = [
    { id: 'walkers', who: 'walkers', on: 'square', rate: '10/min', mix: { stroll: 0.3, commuter: 0.2, shopper: 0.15, student: 0.1, couple: 0.1, family: 0.05, buggy: 0.05, 'elderly-walker': 0.05 } },
    { id: 'street', who: 'walkers', on: 'pave', rate: '5/min' },
    { id: 'far', who: far, on: 'line', every: far === 'tram' ? '3min' : undefined, rate: far === 'buses' ? '2/min' : undefined },
    { id: 'farwalk', who: 'walkers', on: 'pave-far', rate: '4/min' },
    { who: 'pigeons', count: 8, on: 'square' },
  ].map(l => { for (const k of Object.keys(l)) if (l[k] === undefined) delete l[k]; return l; });
  const spec = { v: 3, place: { lat: b.lat, lon: b.lon, alt: b.alt, region: b.region, style: 'civic-square' }, camera: cam0, surfaces, buildings, entities: ent, life,
    backdrop: { style: b.backdrop || 'city-victorian' }, seed: b.seed };
  if (landmarks.length) spec.landmarks = landmarks;
  return { spec, plan: { subject, lead: street, framing, far: 'far', near: ['walkers'] }, notes };
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
    brief: { side: 'right | left (the landmark third)', landmark: '{ style, crown, storeys, w, d } or { obj, model }', houses: 'the side street style (georgian)', tram: 'false for buses' },
    checks: { sky: [0.1, 0.45], lead: true, framing: 2, farMover: 60, nearLife: 2 } },
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

// `node tools/world.mjs new <slug> --setting <kit> --place "<name>" --lat <n> --lon <n> --view "<words>" [--landmarks=a,b:style]`
// writes src/app/79-world-zscene-<slug>.js: a short v3 spec built from a KIT RECIPE (docs/dev/NEW_SCENE_GUIDE.md).
// PURE data in, text out (the tool writes the file). The layouts are plausible, not map-accurate: the engine's kit supplies the fill,
// the framing, the edges, the backdrop and the seasons; the building styles and models supply the recognisable parts.
//
//   a recipe = a layout FAMILY for a kit: where the ground, the water, the roads and the rows of houses go, and the SLOTS that a landmark may take
//   a landmark = a named thing (church-tower, pub, pond, pier, lighthouse ...) that fills a slot with a building style or a model
// To add a landmark: one entry in LANDMARKS. To add a family: one function in FAMILIES and the kits it serves in KIT_FAMILY.

const r1 = (v) => Math.round(v * 10) / 10;
const HEADINGS = { north: 0, northeast: 45, east: 90, southeast: 135, south: 180, southwest: 225, west: 270, northwest: 315, ne: 45, se: 135, sw: 225, nw: 315, n: 0, e: 90, s: 180, w: 270 };

/** The kits and the family each one lays out as. */
export const KIT_FAMILY = Object.freeze({
  'village-green': 'green', park: 'green', pond: 'green', canal: 'water-edge', 'river-city': 'water-edge', quayside: 'water-edge', 'waterfront-city': 'water-edge',
  coast: 'coast', 'terraced-street': 'street', 'old-town-lane': 'street', 'civic-square': 'street',
  moor: 'open', heath: 'open', woodland: 'open', farmland: 'open', downs: 'open', dale: 'open',
});
/** The building style a kit's houses take unless --houses says otherwise. */
const KIT_HOUSES = { 'village-green': 'stone-cottage', park: 'georgian', pond: 'stone-cottage', canal: 'victorian-terrace', 'river-city': 'mill', quayside: 'pantile-cottage', 'waterfront-city': 'baroque-civic',
  coast: 'georgian', 'terraced-street': 'victorian-terrace', 'old-town-lane': 'timber-framed', 'civic-square': 'georgian', farmland: 'stone-cottage', dale: 'stone-cottage' };

/** Words in --view: a compass word is the heading; a few intent words set the eye height and the field of view. */
export function viewCamera(view, family) {
  const w = String(view || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  let heading = 0, eye = family === 'coast' ? 3.2 : 1.7, fov = 64, horizon = family === 'coast' ? 470 : 560;
  for (const k of w) if (k in HEADINGS) heading = HEADINGS[k];
  if (w.some(k => /^(high|above|cliff|hill|bridge|balcony|tower)$/.test(k))) { eye = 8; horizon = 500; }
  if (family === 'coast') fov = 70;
  if (w.some(k => /^(wide|panorama|panoramic|sweeping)$/.test(k))) fov = 76;
  if (w.some(k => /^(close|tight|narrow|detail)$/.test(k))) fov = 56;
  return { eye, fov, horizon, heading };
}

/** A pond outline: an irregular ellipse. */
function blob(cx, cz, rx, rz, n, seed) {
  const out = []; let s = seed || 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 0.86 + rnd() * 0.28; out.push([r1(cx + Math.cos(a) * rx * k), r1(cz + Math.sin(a) * rz * k)]); }
  return out;
}
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

/**
 * The landmarks. Each is (slotInfo, style) -> { buildings, entities, surfaces, ground, lines, life, reserve: { <slot>: true } }.
 * A building landmark has `landmark: true` (the fill never plants across its face) and a `src` (what it stands for).
 */
export const LANDMARKS = {
  'church-tower': (P, style) => {
    const [x0, z0] = P.church[0], [x1] = P.church[1], zw = z0 - 5, xm = r1((x0 + x1) / 2 - 4);
    return { at: 'church', buildings: [{ id: 'church', foot: P.church, storeys: 1, h: 16, landmark: true, style: style || 'parish-church', crown: 'squat-tower', src: 'the parish church: a long low nave and a square tower' }],
      // the churchyard: a low wall along the front with a gap for the gate, yews and headstones between the wall and the nave
      lines: [{ id: 'churchyard-wall', kind: 'wall', stone: /cotswold/.test(style || '') ? '#b99c68' : undefined, path: [[r1(x0 - 5), zw], [r1(x1 + 5), zw]], gaps: [{ at: [xm, zw], w: 2.4 }] }],
      entities: [{ obj: 'plant.rph-church-shrub', at: [r1(x1 + 1), r1(zw + 2)], id: 'yard-shrub-1' },
        { obj: 'street.rph-headstone', at: [r1(xm + 5), r1(zw + 2.6)], id: 'stones-1' }, { obj: 'street.rph-headstone', at: [r1(xm - 6), r1(zw + 3.4)], id: 'stones-2' }] };
  },
  pub: (P, style) => ({ at: 'pub', buildings: [{ id: 'pub', foot: P.pub, storeys: 2, landmark: true, style: style || 'stone-cottage', src: 'the village pub: a bigger house facing the green' }],
    surfaces: [{ id: 'pub-front', kind: 'pavement', path: P.pubFront, width: 3.2 }], entities: [{ obj: 'street.pub-sign', at: P.pubSign, facing: P.pubSignFacing, id: 'pub-sign' }] }),
  pond: (P) => ({ surfaces: [{ id: 'pond', kind: 'water', water: 'pond', poly: P.pond, shallow: 0.45 }], life: [{ who: 'mallard', count: 6, on: 'pond' }, { who: 'moorhen', count: 1, on: 'pond' }] }),
  pier: (P) => ({ entities: [{ obj: 'structure.pier', at: P.pier, facing: P.pierFacing, attach: 'water', id: 'pier', model: { size: 0.85 } }] }),
  lighthouse: (P) => ({ entities: [{ obj: 'structure.lighthouse', at: P.lighthouse, id: 'lighthouse', model: { livery: 'white-red' } }], ground: [{ kind: 'embankment', path: P.headland, width: 180, h: 12 }] }),
  'beach-huts': (P) => ({ entities: P.huts.map((at, i) => ({ obj: 'building.beach-huts', at, facing: 270, id: 'huts-' + (i + 1) })) }),
  minster: (P) => ({ at: 'church', buildings: [{ id: 'minster', foot: P.church, storeys: 4, landmark: true, style: 'gothic-minster', crown: 'twin-towers', src: 'the minster' }] }),
  abbey: (P) => ({ at: 'church', buildings: [{ id: 'abbey', foot: P.church, storeys: 1, h: 28, landmark: true, style: 'gothic-ruin', crown: 'abbey', src: 'the ruined abbey' }] }),
  bridge: (P) => ({ buildings: [{ id: 'bridge', foot: P.bridge, storeys: 1, h: 8, landmark: true, style: 'swing-bridge', src: 'the swing bridge' }] }),
};
/** Who may take which slot, by family. */
const FAMILY_LANDMARKS = { green: ['church-tower', 'pub', 'pond', 'minster'], coast: ['pier', 'lighthouse', 'beach-huts'], 'water-edge': ['bridge', 'church-tower', 'abbey', 'minster'], street: ['minster', 'church-tower', 'pub'], open: ['church-tower'] };

/** A row of houses along a surface, broken around the stretches in `skip` ([from, to] in metres along the surface). */
function rows(id, along, side, style, len, skip, extra) {
  const cuts = (skip || []).slice().sort((a, b) => a[0] - b[0]), out = []; let cur = 0, k = 0;
  const add = (a, b) => { if (b - a >= 8) out.push(Object.assign({ id: id + (k++ ? '-' + k : ''), along, side, style, storeys: [1, 2], from: r1(a), to: r1(b), shops: false }, extra || {})); };
  for (const [a, b] of cuts) { if (a > cur) add(cur, a); cur = Math.max(cur, b); }
  if (cur < len) add(cur, len);
  return out;
}

const FAMILIES = {
  /** A green with a lane round it and houses on three sides; the church and the pub on the far side, a pond near the left. */
  green(o) {
    const far = 78;
    const P = { church: rect(6, far + 7, 36, far + 18), pub: rect(-48, far + 6, -28, far + 16), pubSign: [-37, far - 5], pubFront: [[-52, far - 5], [-22, far - 5]], pubSignFacing: 0, pond: blob(-26, 40, 20, 9, 14, 11) };
    const surfaces = [
      { id: 'green', kind: 'grass', poly: rect(-190, 1, 190, far + 40) },
      { id: 'lane', kind: 'road', path: [[-190, far], [-60, far + 2], [60, far - 1], [190, far + 1]], width: 4.2 },
      { id: 'lane-l', kind: 'road', path: [[-96, 1], [-98, 40], [-96, far]], width: 4 },
      { id: 'lane-r', kind: 'road', path: [[96, 1], [98, 40], [96, far]], width: 4 },
      { id: 'walk', kind: 'path', path: [[8, 1], [12, 28], [14, 54], [16, far]], width: 1.8 },
    ];
    // the lane's length runs from x = -190: a stretch at x is `x + 190` along it
    const skip = []; if (o.landmarks.includes('church-tower') || o.landmarks.includes('minster')) skip.push([2 + 190, 40 + 190]);
    if (o.landmarks.includes('pub')) skip.push([-52 + 190, -24 + 190]);
    const buildings = rows('far', 'lane', 'left', o.houses, 380, skip, { depth: [6, 8] })
      .concat(rows('west', 'lane-l', 'left', o.houses, far + 4, [], { depth: [6, 8] }), rows('east', 'lane-r', 'right', o.houses, far + 4, [], { depth: [6, 8] }));
    const entities = [{ obj: 'street.bench', at: [14.2, 32], facing: 270, id: 'bench-1' }];
    const life = [{ who: 'walkers', on: 'walk', rate: '3/min', mix: { stroll: 0.4, 'dog-walker': 0.3, family: 0.15, elderly: 0.15 }, edges: ['S', 'N'] }];
    return { P, surfaces, buildings, entities, life, lines: [], ground: [], setting: 'a green with a lane round it and houses on three sides' };
  },
  /** A promenade along a beach: hotels on the land side, huts on the sand, the sea on the right, a headland at the far end. */
  coast(o) {
    const P = { pier: [57, 119], pierFacing: 40, lighthouse: [120, 520], headland: [[50, 560], [260, 560]], huts: [[11, 22], [11, 36], [11, 50]] };
    const surfaces = [
      { id: 'prom', kind: 'pavement', path: [[0, 1], [-1, 160], [3, 330], [8, 560]], width: 8 },
      { id: 'sand', kind: 'sand', poly: [[5, 1], [30, 1], [38, 600], [14, 600]] },
      { id: 'sea', kind: 'water', water: 'sea', poly: [[26, 1], [900, 1], [900, 440], [36, 440]], shallow: 1.5 },
      { id: 'headland', kind: 'grass', poly: [[40, 440], [400, 440], [400, 700], [30, 700]] },
      { id: 'front', kind: 'plaza', poly: [[-20, 1], [-4, 1], [-3, 560], [-17, 560]] },
      { id: 'town', kind: 'road', path: [[-23, 1], [-24, 160], [-21, 330], [-18, 560]], width: 5 },
    ];
    const buildings = rows('hotels', 'town', 'left', o.houses, 600, [], { storeys: [3, 4], depth: [10, 14] }).map(b => Object.assign(b, { from: 44 }));
    const lines = [{ id: 'sea-rail', kind: 'railing', path: [[4.6, 1], [3.6, 160], [7.6, 330], [12.6, 560]] }];
    const entities = [{ obj: 'street.bench', at: [3, 24], facing: 90, id: 'bench-1' }, { obj: 'street.lamppost', at: [4.3, 44], id: 'lamp-1' }, { obj: 'street.lamppost', at: [3.9, 100], id: 'lamp-2' }];
    const life = [{ who: 'walkers', on: 'prom', rate: '7/min', mix: { stroll: 0.4, family: 0.25, 'dog-walker': 0.2, couple: 0.15 }, edges: ['S', 'N'] }, { who: 'gulls', count: 8 }];
    return { P, surfaces, buildings, entities, life, lines, ground: [], setting: 'a promenade along a beach, the sea on the right' };
  },
  /** A quay or towpath along water, houses on the far bank. */
  'water-edge'(o) {
    const P = { church: rect(-40, 150, -12, 162), bridge: rect(60, 100, 112, 108) };
    const surfaces = [
      { id: 'walk', kind: 'plaza', poly: rect(-170, 1, 170, 14) },
      { id: 'water', kind: 'water', water: o.kit === 'canal' ? 'canal' : 'river', poly: rect(-400, 14, 400, 110), shallow: 1 },
      { id: 'far-bank', kind: 'pavement', path: [[-400, 112], [400, 112]], width: 5 },
    ];
    const buildings = rows('far', 'far-bank', 'left', o.houses, 800, o.landmarks.includes('church-tower') ? [[360, 420]] : [], { storeys: [2, 4], depth: [8, 12] });
    const entities = [{ obj: 'boat.dinghy', at: [-40, 40], facing: 90 }, { obj: 'boat.narrowboat', at: [30, 60], facing: 90 }];
    const life = [{ who: 'walkers', on: 'walk', rate: '6/min', mix: { stroll: 0.5, chat: 0.2, family: 0.15, 'dog-walker': 0.15 }, edges: ['W', 'E'] }, { who: 'mallard', count: 5, on: 'water' }];
    return { P, surfaces, buildings, entities, life, lines: [], ground: [], setting: 'a quay with water and houses on the far bank' };
  },
  /** A street seen along its length, houses both sides, a cross street at the end. */
  street(o) {
    const P = { church: rect(-18, 150, 18, 190) };
    const surfaces = [{ id: 'street', kind: 'plaza', path: [[0, -6], [0, 60], [3, 100], [3, 130]], width: o.kit === 'old-town-lane' ? 3.8 : 6 },
      { id: 'cross', kind: 'pavement', path: [[-40, 130], [40, 130]], width: 5 }];
    const buildings = [].concat(rows('west', 'street', 'left', o.houses, 134, [], { storeys: [2, 3] }), rows('east', 'street', 'right', o.houses, 134, [], { storeys: [2, 3] }));
    const life = [{ who: 'walkers', on: 'street', rate: '8/min', mix: { stroll: 0.6, chat: 0.15, couple: 0.25 }, edges: ['S', 'N'] }];
    return { P, surfaces, buildings, entities: [], life, lines: [], ground: [], setting: 'a street seen along its length, houses on both sides' };
  },
  /** Open country: a path, walls, a few trees, grazing. */
  open(o) {
    const P = { church: rect(60, 180, 88, 191) };
    const surfaces = [{ id: 'field', kind: 'grass', poly: rect(-400, 1, 400, 400) }, { id: 'path', kind: 'path', path: [[8, 1], [14, 60], [4, 140], [10, 260]], width: 1.8 }];
    const lines = [{ id: 'wall-w', kind: 'wall', path: [[-30, 8], [-34, 140], [-26, 280]] }, { id: 'wall-e', kind: 'wall', path: [[50, 8], [46, 140], [52, 280]] }];
    const life = [{ who: 'walkers', on: 'path', rate: '2/min', mix: { stroll: 0.4, brisk: 0.3, 'dog-walker': 0.3 }, edges: ['S'] }, { who: 'sheep', count: 6 }];
    return { P, surfaces, buildings: [], entities: [], life, lines, ground: [], setting: 'open country with a path and walls' };
  },
};

/** "church-tower:cotswold-church,pub:cotswold-stone,pond" -> [{ kind, style }] */
export function parseLandmarks(s) {
  return String(s || '').split(',').map(x => x.trim()).filter(Boolean).map(x => { const [kind, style] = x.split(':'); return { kind, style: style || null }; });
}

/**
 * The spec for a new place: { spec, meta, notes } (notes: what the recipe could not do, e.g. an unknown landmark).
 * a: { slug, kit, place, lat, lon, view, landmarks, houses, county, town, seed }
 */
export function scaffoldSpec(a) {
  const kit = a.kit, family = KIT_FAMILY[kit];
  if (!family) throw new Error(`unknown --setting '${kit}'. Kits: ${Object.keys(KIT_FAMILY).join(', ')}`);
  const lm = parseLandmarks(a.landmarks), notes = [];
  const houses = a.houses || KIT_HOUSES[kit] || 'stone-cottage';
  const R = FAMILIES[family]({ kit, houses, landmarks: lm.map(l => l.kind) });
  const out = { surfaces: R.surfaces.slice(), buildings: R.buildings.slice(), entities: R.entities.slice(), life: R.life.slice(), lines: R.lines.slice(), ground: R.ground.slice() };
  for (const l of lm) {
    const make = LANDMARKS[l.kind];
    if (!make || !(FAMILY_LANDMARKS[family] || []).includes(l.kind)) { notes.push(`landmark '${l.kind}' has no recipe for the '${family}' layout (known: ${(FAMILY_LANDMARKS[family] || []).join(', ')}): ask for it, see docs/dev/NEW_SCENE_GUIDE.md`); continue; }
    const m = make(R.P, l.style);
    for (const k of ['surfaces', 'buildings', 'entities', 'life', 'lines']) if (m[k]) out[k] = out[k].concat(m[k]);
    if (m.ground) out.ground = out.ground.concat(m.ground);
  }
  const cam = viewCamera(a.view, family);
  const lat = Number(a.lat), lon = Number(a.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('--lat and --lon are numbers');
  const spec = { v: 3, place: { lat, lon, alt: Number(a.alt) || 60, region: a.region || 'uk', style: kit }, camera: cam };
  if (out.ground.length) spec.ground = { features: out.ground };
  spec.surfaces = out.surfaces;
  if (out.lines.length) spec.lines = out.lines;
  if (out.buildings.length) spec.buildings = out.buildings;
  if (out.entities.length) spec.entities = out.entities;
  spec.life = out.life;
  spec.seed = Number(a.seed) || (Math.abs(String(a.slug).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 90) + 3;
  const slug = String(a.slug);
  const meta = { id: slug + '-1-w3', label: `${a.place} (world)`, site: a.place, mood: a.mood || 'calm', colour: a.colour || 'slate',
    tags: ['uk', slug, kit, 'world-v3'], liveSky: { lat, lon }, ukPlace: slug, county: a.county || 'uk', ukTown: a.town || a.place.split(',')[0], ukView: 'world-engine', setting: R.setting };
  return { spec, meta, notes, family };
}

/** The text of src/app/79-world-zscene-<slug>-1.js: one line a thing, so the spec reads like the exemplars. */
export function scaffoldSource(a) {
  const { spec, meta, notes, family } = scaffoldSpec(a);
  const j = (v) => JSON.stringify(v);
  const list = (arr, ind) => '[\n' + arr.map(x => ind + '  ' + j(x)).join(',\n') + '\n' + ind + ']';
  const lines = [];
  lines.push(`/* WORLD SCENE (format v3) world-test / ${meta.id}: ${a.place}. Scaffolded by \`node tools/world.mjs new ${a.slug} --setting ${a.kit}\` (layout family '${family}', ${meta.setting}).`);
  lines.push(`   View: ${String(a.view || 'default').replace(/\*\//g, '* /')}. A FIRST DRAFT: edit the lists below, then render and read docs/dev/NEW_SCENE_GUIDE.md section 5. PURE; hidden dev pack 'world-test'. */`);
  lines.push('(function () {', "  if (typeof worldAdd !== 'function') return;", `  worldAdd('world-test', ${j(meta)}, {`);
  lines.push(`    v: 3, place: ${j(spec.place)},`, `    camera: ${j(spec.camera)},`);
  if (spec.ground) lines.push(`    ground: ${j(spec.ground)},`);
  lines.push('    surfaces: ' + list(spec.surfaces, '    ') + ',');
  if (spec.lines) lines.push('    lines: ' + list(spec.lines, '    ') + ',');
  if (spec.buildings) lines.push('    buildings: ' + list(spec.buildings, '    ') + ',');
  if (spec.entities) lines.push('    entities: ' + list(spec.entities, '    ') + ',');
  lines.push('    life: ' + list(spec.life, '    ') + ',', `    seed: ${spec.seed},`, '  });', '})();');
  return { text: lines.join('\n') + '\n', notes, id: meta.id, file: `79-world-zscene-${a.slug}-1.js`, spec };
}

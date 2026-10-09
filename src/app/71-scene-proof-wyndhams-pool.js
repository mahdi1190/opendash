/* ============================================================
   PROOF SCENE: Wyndham's Pool, Yateley Common, at dusk (docs/dev/SCENE_ENGINE_V2.md; composed BY HAND on the v2 engine).
   The view: from the east bank of the pool, looking west-south-west across the water into the low sun. A wooded heathland
   pond ringed by Scots pine and silver birch: a pine headland on the left, a reedy birch promontory on the right, the far
   shore's pines with the sun going down through them, heather, gorse and bracken on the banks, lilies, a small timber
   anglers' platform in the near left.
   The life: a grey heron stalking the shallows by the reeds and STABBING at fish; a kingfisher that sits on the
   platform's post, flash-dives, splashes and comes back; swallows skimming the water (spring to early autumn); after real
   dusk, pipistrelles hawking over the water and mist drifting on it; coots and mallards; fish rising.
   The objects of its own are in 70-scene-lib-proof-wyndhams-pool.js; the item is registered in
   72-anim-pack-proof-wyndhams-pool.js. sceneProofWyndhamsPool() returns the scene data (pure; built once per item).
   ============================================================ */
function sceneProofWyndhamsPool() {
  const R2 = v => Math.round(v * 100) / 100, R1 = v => Math.round(v * 10) / 10;
  const rnd = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  /** A closed Catmull-Rom loop through control points [x, d], every ~step metres, with a seeded wobble (natural edges). */
  const loop = (pts, step, wob, seed) => {
    const r = rnd(seed), out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n], e = pts[(i + 2) % n];
      const k = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t, cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
        const x = cr(a[0], b[0], c[0], e[0]), d = cr(a[1], b[1], c[1], e[1]), w = wob * Math.min(1, d / 25);
        out.push([R2(x + (r() - 0.5) * w), R2(d + (r() - 0.5) * w * 0.6)]);
      }
    }
    return out;
  };
  /** An open Catmull-Rom line through [x, d] points. */
  const line = (pts, step) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], e = pts[Math.min(pts.length - 1, i + 2)];
      const k = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / step));
      for (let j = 0; j < k; j++) { const t = j / k, t2 = t * t, t3 = t2 * t, cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3); out.push([R2(cr(a[0], b[0], c[0], e[0])), R2(cr(a[1], b[1], c[1], e[1]))]); }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  /** A fringe polygon along a shore line: from the line, `w` metres out to its left (side -1) or right (side 1), ragged. */
  const fringe = (pts, w, side, seed) => {
    const r = rnd(seed), L = line(pts, 1.2), out = [];
    for (let i = 0; i < L.length; i++) {
      const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)], tx = b[0] - a[0], td = b[1] - a[1], m = Math.hypot(tx, td) || 1;
      const nx = -td / m * side, nd = tx / m * side, ww = w * (0.55 + r() * 0.7) * Math.min(1, L[i][1] / 12 + 0.4);
      out.push([R2(L[i][0] + nx * ww), R2(L[i][1] + nd * ww)]);
    }
    return L.concat(out.reverse());
  };

  // ---- the camera: the east bank, eye height, looking WSW into the evening sun
  const camera = { eye: 1.65, fov: 66, horizon: 430, heading: 236, lat: 51.3316, lon: -0.8221, alt: 76, water: -0.08 };
  const f = 800 / Math.tan(33 * Math.PI / 180), H = camera.horizon;
  const PX = (x, d) => 800 + f * x / d, PY = (d, h) => H + f * (camera.eye - (h || 0)) / d;   // a ground point on screen
  const WY = d => H + f * (camera.eye - camera.water) / d;                                        // the waterline row at depth d

  // ---- the pool: one irregular loop (metres; x right of the view axis, d ahead)
  const SHORE = [
    [-7.4, 10.6], [-4.6, 8.9], [-2.1, 8.1], [0.7, 7.8], [3.0, 8.4], [4.6, 9.9], [5.6, 12.5], [6.3, 16.4], [8.6, 19.8], [12.2, 22.4], [16.4, 25.8],
    [22.5, 33.5], [30.5, 45], [38, 63], [46, 86], [52, 108], [45, 123], [31, 130], [15, 127], [3, 134], [-9, 127], [-23, 121], [-37, 116],
    [-51, 108], [-55, 97], [-44, 87], [-31, 77], [-25, 65], [-25.5, 53], [-20.5, 42], [-15.4, 31.5], [-11.8, 22.5], [-9.4, 15.6],
  ];
  const pool = loop(SHORE, 2.2, 0.9, 7);

  const data = {
    id: 'wyndhams-pool', v: 2, at: 'dusk', season: 'auto', setting: 'natural', signage: false, weather: 'live', atmos: 'auto', cover: 'auto', particles: 'season',
    view: { lat: 51.3316, lon: -0.8221 }, camera,
    kits: ['temperate', 'water', 'birds', 'animals'],
    sky: { stars: 220, clouds: { n: 5, y: [50, 300], speed: 4 }, sunR: 24, moonR: 18 },
    palette: {
      base: { tl: ['#7d9088', '#5a6e60', '#3e4e40', '#6a7a52'], heath: ['#7e7652', '#5c5236'], bank: ['#7a8650', '#56602e'], path: ['#c8b48a', '#a8916a'], wood: ['#4e4a30', '#3a3624'], reedbed: ['#8e9658', '#68703c'], hill: ['#46553e', '#3a4834'] },
      spring: { tl: ['#82968a', '#5e7462', '#405440', '#7e9058'] },
      autumn: { tl: ['#8a8a78', '#6a6a50', '#46482e', '#9a7e46'], heath: ['#86704c', '#5e4a30'], bank: ['#868450', '#5e5a32'], reedbed: ['#a89a5e', '#80723e'], wood: ['#5a4a30', '#40341f'], hill: ['#54563a', '#454a32'] },
      winter: { tl: ['#868a8e', '#62686a', '#44494a', '#74706a'], heath: ['#7c7466', '#5a5244'], bank: ['#7a7c66', '#5a5c4a'], reedbed: ['#a49c80', '#7e765c'], hill: ['#4a5048', '#3c423a'] },
    },
    surfaces: [
      { id: 'land', kind: 'heath', rest: true },
      { id: 'far-wood', kind: 'wood', poly: [[-420, 118], [-60, 112], [-30, 124], [10, 130], [40, 126], [58, 108], [60, 60], [420, 40], [420, 700], [-420, 700]] },
      { id: 'headland', kind: 'wood', poly: loop([[-60, 22], [-13, 23], [-17, 33], [-22.5, 44], [-27, 54], [-27, 66], [-34, 78], [-48, 88], [-58, 99], [-90, 104], [-140, 60]], 2.5, 1.2, 11) },
      { id: 'bank-near', kind: 'bank', poly: loop([[-11, 4.2], [7, 4.2], [7.2, 9.6], [4.4, 8.6], [2.6, 7.6], [0.4, 7.0], [-2.4, 7.4], [-5.2, 8.4], [-8, 10.2], [-11, 12]], 0.8, 0.5, 13) },
      { id: 'path', kind: 'path', path: line([[0.6, 3.9], [-0.9, 4.8], [-2.6, 5.9], [-4.4, 7.0], [-6.4, 8.4], [-8.8, 10.4], [-11.5, 13.5]], 0.7), width: 1.0 },
      { id: 'reeds-right', kind: 'bank', poly: fringe([[4.4, 9.4], [5.5, 12.4], [6.2, 16.2], [8.5, 19.6], [12.1, 22.2], [16.4, 25.6], [22.4, 33.2]], 1.6, -1, 21) },
      { id: 'bank-open', kind: 'bank', poly: loop([[-1.2, 7.1], [2.2, 7.4], [4.2, 8.4], [3.4, 6.4], [1.2, 5.6], [-0.8, 6.0]], 0.5, 0.3, 17) },
      { id: 'reeds-near', kind: 'bank', poly: fringe([[-7.3, 10.5], [-6.3, 9.8], [-5.3, 9.3]], 0.7, -1, 19) },
      { id: 'reeds-left', kind: 'bank', poly: fringe([[-9.6, 15.9], [-11.9, 22.6], [-15.5, 31.6], [-20.6, 42.2], [-25.2, 53]], 1.4, 1, 23) },
      { id: 'reeds-far-r', kind: 'bank', poly: fringe([[52, 109], [45.5, 123.5], [31, 130.6], [20, 128.4]], 3, -1, 25) },
      { id: 'reeds-far-l', kind: 'bank', poly: fringe([[-12, 127.6], [-23, 121.6], [-37, 116.6], [-50, 109]], 3, -1, 27) },
    ],
    water: [{ id: 'pool', kind: 'pond', poly: pool, edge: 'natural', mirror: 0.8, ripple: 0.18, clarity: 0.12, base: ['#7a8c96', '#4a6470', '#26383c'] }],
    ground: [],
    place: [], scatter: [], actors: [], flocks: [],
  };
  const P = data.place, S = data.scatter, A = data.actors;
  // ---- the woods behind the far shore: layered, lobed canopies with flat-topped Scots pines standing out of them (pixel fills,
  // painted far to near; never a straight band: every lobe has its own width, height and kind)
  const canopy = (base, seed, hMin, hMax, pine, foot) => {
    const r = rnd(seed);
    let d = `M-170 ${foot}V${base}`, x = -170;
    while (x < 1770) {
      const w = 14 + r() * 40, h = hMin + Math.pow(r(), 1.6) * (hMax - hMin), y1 = base - h;
      if (r() < pine) {   // a Scots pine: a bare trunk, then a flat, ragged umbrella crown
        const cw = 16 + r() * 22, ch = 6 + r() * 7, tx = x + w / 2, ty = y1 - 14 - r() * 26;
        d += `L${R1(tx - 1.2)} ${R1(y1 + 4)}L${R1(tx - 1.2)} ${R1(ty + ch * 0.6)}Q${R1(tx - cw)} ${R1(ty + ch)} ${R1(tx - cw * 0.7)} ${R1(ty)}Q${R1(tx - cw * 0.3)} ${R1(ty - ch)} ${R1(tx + cw * 0.1)} ${R1(ty - ch * 0.6)}Q${R1(tx + cw * 0.8)} ${R1(ty - ch * 0.9)} ${R1(tx + cw)} ${R1(ty + ch * 0.3)}Q${R1(tx + cw * 0.6)} ${R1(ty + ch)} ${R1(tx + 1.2)} ${R1(ty + ch * 0.6)}L${R1(tx + 1.2)} ${R1(y1 + 4)}`;
      } else d += `Q${R1(x + w * 0.1)} ${R1(y1 - h * 0.25)} ${R1(x + w * 0.5)} ${R1(y1 - h * 0.3)}Q${R1(x + w * 0.95)} ${R1(y1 - h * 0.2)} ${R1(x + w)} ${R1(base - h * (0.3 + r() * 0.5))}`;
      x += w * (0.6 + r() * 0.35);
    }
    return d + `L1770 ${base}V${foot}Z`;
  };
  data.ground.push(
    { layer: 'horizon', d: canopy(H - 30, 81, 10, 34, 0.12, H + 6), fill: { lin: [[0, '@tl.0'], [1, '@tl.1']], y1: H - 70, y2: H + 6 } },
    { layer: 'far', d: canopy(H - 12, 82, 6, 30, 0.22, H + 10), fill: { lin: [[0, '@tl.1'], [1, '@tl.2']], y1: H - 50, y2: H + 10 } },
    { layer: 'far', d: canopy(H + 2, 83, 4, 22, 0.08, H + 14), fill: { lin: [[0, '@tl.3'], [1, '@tl.2']], y1: H - 30, y2: H + 14 } });
  const tree = (obj, x, d, k, o) => P.push(Object.assign({ obj, at: [x, d], k, anim: false }, o || {}));

  // ---- the far shore (d 120 to 175): pines in groups and singles, birch between; one group stands in the evening sun
  tree('tree.pool-pine', 36, 140, 1.05, { variant: 0 }); tree('tree.pool-pine', 42.5, 151, 0.9, { variant: 1, flip: true }); tree('tree.pool-pine', 47, 136, 0.8, { variant: 2 });
  tree('tree.birch-heath', 29, 134, 0.9, { variant: 1 }); tree('tree.pool-pine', 55, 162, 1.1, { variant: 0, flip: true });
  tree('tree.pool-pine', -5, 144, 1.2, { variant: 1 }); tree('tree.pond-wood', -12, 140, 1.1, { variant: 2 }); tree('tree.birch-heath', 3, 139, 0.85, { variant: 2 });
  tree('tree.pond-birch', 22, 132, 0.7, { variant: 1 }); tree('tree.pond-wood', -30, 146, 1.35, { variant: 1, flip: true }); tree('tree.birch-heath', 17, 146, 1.1, { variant: 0, flip: true });
  tree('tree.pool-pine', -34, 128, 1, { variant: 2 }); tree('tree.birch-heath', -26, 125, 0.75, { variant: 0, flip: true });
  tree('tree.pool-pine', 70, 120, 1, { variant: 0 }); tree('tree.birch-heath', 62, 112, 0.8, { variant: 1 });
  tree('tree.pool-pine', 24, 215, 1.3, { variant: 1 }); tree('tree.pond-wood', -2, 190, 1.2, { variant: 3 }); tree('tree.pool-pine', -26, 236, 1.25, { variant: 2 });
  tree('tree.pond-wood', -50, 172, 1.1, { variant: 0 }); tree('tree.birch-heath', -40, 140, 0.8, { variant: 2, flip: true }); tree('tree.pool-pine', -62, 150, 1.1, { variant: 1, flip: true });
  tree('tree.pond-oak', -20, 138, 0.8, { variant: 1 }); tree('tree.pond-oak', 58, 140, 0.9, { variant: 0, flip: true }); tree('tree.birch-heath', 12, 137, 0.6, { variant: 0 });
  tree('tree.pond-wood', 84, 186, 1.2, { variant: 1 }); tree('tree.birch-heath', 44, 160, 0.7, { variant: 1, flip: true });
  S.push({ obj: { 'tree.far-pine': 3, 'tree.far-birch': 2, 'tree.pond-wood': 2 }, on: 'far-wood', d: [175, 520], n: 70, dist: 'ground', cluster: { centres: 9, spread: 22 }, gap: 'foot', k: [0.75, 1.25], seed: 31, anim: false, species: 1 });
  S.push({ obj: { 'plant.gorse': 2, 'plant.heather': 3 }, on: 'far-wood', d: [118, 175], n: 60, dist: 'ground', cluster: { centres: 6, spread: 6 }, k: [0.8, 1.3], seed: 32, anim: false, species: 1 });

  // ---- the pine headland on the left (d 40 to 100): tall Scots pines, a birch, holly beneath
  tree('tree.pool-pine', -37, 55, 1.05, { variant: 0 });
  tree('tree.pool-pine', -30.5, 63, 0.95, { variant: 1, flip: true });
  tree('tree.pool-pine', -36, 77, 0.85, { variant: 2 });
  tree('tree.pool-pine', -52, 92, 1.1, { variant: 1 });
  tree('tree.birch-heath', -24.5, 43.5, 0.9, { variant: 0 });
  tree('tree.birch-heath', -28, 49, 0.7, { variant: 2, flip: true });
  P.push({ obj: 'plant.holly', at: [-28, 58], k: 1 }, { obj: 'plant.holly', at: [-33, 70], k: 0.9, flip: true });
  S.push({ obj: { 'plant.bracken': 3, 'plant.fern': 1, 'plant.gorse': 1 }, on: 'headland', d: [24, 95], n: 40, dist: 'ground', cluster: { centres: 5, spread: 3 }, k: [0.8, 1.2], seed: 33, anim: false, species: 1 });

  // ---- the birch promontory on the right (d 10 to 35): birches at different depths, gorse and heather at their feet
  tree('tree.birch-heath', 15.8, 23.4, 1.1, { variant: 1 });
  tree('tree.pool-birch', 12.4, 19.2, 0.75, { variant: 2, flip: true });
  tree('tree.pool-pine', 25.5, 31.4, 0.9, { variant: 2 });
  tree('tree.birch-heath', 32.6, 40.3, 0.8, { variant: 0 });
  P.push({ obj: 'plant.gorse', at: [9.6, 15.4], k: 1.1 }, { obj: 'plant.gorse', at: [11.2, 17.6], k: 0.8, flip: true }, { obj: 'plant.gorse', at: [18.5, 23.4], k: 1.2 });

  // ---- reeds and bulrushes hugging the water, in clumps with gaps
  S.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, on: 'reeds-right', d: [8, 40], n: 70, dist: 'ground', cluster: { centres: 5, spread: 1.1 }, k: [0.75, 1.15], seed: 41, anim: 'strip', species: 1 });
  S.push({ obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, on: 'reeds-left', d: [14, 60], n: 42, dist: 'ground', cluster: { centres: 4, spread: 1.4 }, k: [0.75, 1.1], seed: 42, anim: 'strip', species: 1 });
  S.push({ obj: { 'plant.reed': 3, 'plant.grass-long': 1 }, on: 'reeds-near', d: [8.5, 11.5], n: 8, dist: 'ground', cluster: { centres: 2, spread: 0.3 }, k: [0.4, 0.7], seed: 44, anim: 'strip', species: 1 });
  S.push({ obj: { 'plant.reed': 2, 'plant.bulrush': 1 }, on: ['reeds-far-r', 'reeds-far-l'], d: [100, 140], n: 60, dist: 'ground', cluster: { centres: 6, spread: 3 }, k: [0.8, 1.2], seed: 43, anim: false, species: 1 });

  // ---- the near bank: heather and bracken in clumps, grass, a fallen birch, flowers thinning off the path, the platform
  S.push({ obj: { 'plant.heather': 6, 'plant.bracken': 1, 'plant.grass-long': 2, 'plant.grass': 3 }, on: ['bank-near', 'land'], avoid: ['path', 'bank-open'], d: [4.3, 16], n: 190, dist: 'screen', cluster: { centres: 7, spread: 0.7 }, gap: 'foot', k: [0.5, 1.35], seed: 51, anim: false, species: 1 });
  S.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, on: 'bank-open', d: [5, 9], n: 26, dist: 'screen', cluster: { centres: 4, spread: 0.5 }, k: [0.45, 0.8], seed: 53, anim: false, species: 1 });
  S.push({ obj: { 'plant.heather': 4, 'plant.gorse': 1, 'plant.grass': 2 }, on: 'land', d: [9, 40], n: 80, dist: 'screen', cluster: { centres: 6, spread: 2 }, gap: 'foot', k: [0.8, 1.2], seed: 52, anim: false, species: 1 });
  { // wild flowers and short grass along the path, thinning as they leave it
    const r = rnd(61), pl = line([[0.6, 3.9], [-0.9, 4.8], [-2.6, 5.9], [-4.4, 7.0], [-6.4, 8.4]], 0.35);
    for (let i = 0; i < pl.length - 1; i++) for (const side of [-1, 1]) {
      const off = 0.75 + Math.pow(r(), 1.8) * 2.2;
      if (r() > 1.15 - off * 0.35 || pl[i][1] < 4.5) continue;
      const a = pl[i], b = pl[i + 1], tx = b[0] - a[0], td = b[1] - a[1], m = Math.hypot(tx, td) || 1, q = [R2(a[0] - td / m * off * side), R2(a[1] + tx / m * off * side)];
      if (q[1] < 4.4 || q[1] > 7.6 || PX(q[0], q[1]) < -60 || PX(q[0], q[1]) > 1660) continue;
      P.push({ obj: r() < 0.55 ? 'plant.wildflowers' : 'plant.grass', at: q, k: R2(0.6 + r() * 0.5), variant: Math.floor(r() * 3), anim: false });
    }
  }
  P.push({ obj: 'ground.log', at: [2.6, 6.4], k: 1, variant: 1 });
  P.push({ obj: 'plant.bracken', at: [-2.75, 4.45], k: 1.25, anim: { sway: { k: 0.8 } } }, { obj: 'plant.bracken', at: [3.1, 5.6], k: 0.9, anim: false });
  P.push({ obj: 'plant.grass-long', at: [-1.2, 4.4], k: 1.1 }, { obj: 'plant.grass-long', at: [2.2, 4.5], k: 1, flip: true });
  P.push({ obj: 'structure.wp-bivvy', at: [-27.5, 125.5], k: 1, fix: true });
  const PLAT = { x: -9.1, d: 14 };
  P.push({ obj: 'structure.wp-angler-platform', at: [PLAT.x, PLAT.d], k: 1, fix: true });

  // ---- on the water: lilies in loose rafts, fish rising
  { const r = rnd(71); [[-5.6, 13.5, 7], [-3.2, 17, 5], [-7.5, 22, 6], [3.2, 16.5, 4], [8, 58, 4], [-14, 70, 5]].forEach(([x, d, n], g) => { for (let i = 0; i < n; i++) P.push({ obj: 'water.lily', at: [R2(x + (r() - 0.5) * d * 0.09), R2(d + (r() - 0.5) * d * 0.12)], k: R2(0.8 + r() * 0.6), variant: Math.floor(r() * 3), anim: false }); }); }
  P.push({ obj: 'water.fish-ring', at: [-2, 38], k: 1.4, seed: 5, anim: { flicker: { period: 5.2 } } }, { obj: 'water.fish-ring', at: [14, 72], k: 1.6, variant: 1, seed: 9, anim: { flicker: { period: 7.4 } } });

  // ---- the heron: stalking the shallows in front of the right-hand reeds, stabbing as it goes
  A.push({ obj: 'bird.wp-heron-stalk', ground: [[4.3, 11.9], [3.5, 12.3], [2.6, 12.8], [1.7, 13.1]], speedM: 0.06, loop: 'pingpong', k: 1.15, seed: 3, offset: 0.2 });
  // ---- coots and a pair of mallards
  A.push({ obj: 'bird.coot', ground: [[-12, 44], [-2, 48], [6, 46]], speedM: 0.22, loop: 'pingpong', seed: 11, offset: 0.3 });
  A.push({ obj: 'bird.coot', ground: [[18, 84], [4, 90]], speedM: 0.18, loop: 'pingpong', seed: 12, offset: 0.7 });
  A.push({ obj: 'bird.mallard', ground: [[22, 62], [10, 66], [2, 64]], speedM: 0.25, loop: 'pingpong', seed: 13, offset: 0.1 });
  A.push({ obj: 'bird.mallard', ground: [[23.2, 63], [11.2, 67.2], [3.2, 65.2]], speedM: 0.25, loop: 'pingpong', variant: 1, seed: 14, offset: 0.1 });

  // ---- the kingfisher: three actors on one clock (perched, flight, splash), timed so each shows only in its moment
  {
    const sP = f * 0.8 / PLAT.d / 80, ax = PX(PLAT.x, PLAT.d), ay = PY(PLAT.d);
    const post = [R1(ax + 291.5 * sP), R1(ay - 92 * sP)];      // the post top (the bird's feet)
    const pc = [post[0] + 1, post[1] - 7];                        // the flying bird's centre when it leaves the post
    const wd = 13.2, W = [R1(post[0] + 46), R1(WY(wd))];          // where it hits the water
    const vF = 420, vP = 2, vR = 60;                              // units per second: the flight, the perched bird, the ring
    const len = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
    // the flight: hidden above the post (out of sight: any row above it draws at scale 0), down, a curving dive, under water, back up
    const hide = [pc[0], pc[1] - 6], dwellUp = 2 * (hide[1] + 1600);
    const dive = [[pc[0], pc[1]], [pc[0] + 10, pc[1] + 14], [pc[0] + 24, pc[1] + 40], [W[0] - 6, W[1] - 22], [W[0], W[1]]];
    const under = [[W[0] + 1, W[1] + 3], [W[0] + 1, W[1] + 80], [W[0] + 1, W[1] + 3]];
    const back = [[W[0], W[1]], [W[0] - 4, W[1] - 26], [pc[0] + 34, pc[1] + 18], [pc[0] + 12, pc[1] + 2], [pc[0], pc[1]]];
    const flight = [hide, [hide[0], -1600], hide, ...dive, ...under, ...back, hide];
    const T = len(flight) / vF;
    const tLeave = (dwellUp + 6) / vF, tHit = (dwellUp + 6 + len(dive)) / vF, tBack = (len(flight) - 6) / vF;
    const sF = 0.82;
    A.push({ obj: 'bird.kingfisher-flight', layer: 'fore', path: flight, speed: vF, loop: 'loop', s: 1, sByY: [[pc[1] - 0.6, 0.001], [pc[1] - 0.1, sF], [W[1] + 1.5, sF], [W[1] + 2.5, 0.001]], seed: 21, offset: 0 });
    // the perched bird: sits from the moment it is back until it leaves again (a 0.1-unit tremor keeps it on its path)
    const visT = T - (tBack - tLeave), sit = [];
    for (let i = 0, n = Math.max(2, Math.round(visT * vP / 0.1)); i <= n; i++) sit.push([post[0], R2(post[1] - (i % 2) * 0.1)]);
    const away = (tBack - tLeave) * vP;
    const perch = sit.concat([[post[0], post[1] + away / 2], [post[0], post[1] + 0.06]]);
    const sK = R2(f * 0.17 / PLAT.d / 26 * 1.5);
    A.push({ obj: 'bird.wp-kingfisher-perch', layer: 'fore', path: perch, speed: R2(len(perch) / T), loop: 'loop', s: 1, sByY: [[post[1], sK], [post[1] + 0.05, 0.001]], seed: 22, offset: R2(((-tBack / T) % 1 + 1) % 1) });
    // the splash: rings grow from the moment it hits, then fade (the 'fade' loop fades the end of its path)
    const grow = [], gN = Math.round(1.4 * vR / 0.6);
    for (let i = 0; i <= gN; i++) grow.push([R2(W[0] + (i % 2) * 0.6), R2(W[1] + 0.6 * i / gN)]);
    const ringPath = [[W[0], W[1] + 0.7]].concat([[W[0], W[1] + 0.7 + (T - 1.4) * vR / 2]], [[W[0], W[1] + 0.7]], grow);
    const tGrow = (len(ringPath) - len(grow)) / (len(ringPath) / T);
    A.push({ obj: 'water.wp-dive-ring', layer: 'fore', path: ringPath, speed: R2(len(ringPath) / T), loop: 'fade', s: 1, sByY: [[W[1], 0.3], [W[1] + 0.6, 1.25], [W[1] + 0.68, 0.001]], seed: 23, offset: R2((((tGrow - tHit) / T) % 1 + 1) % 1) });
  }

  // ---- swallows skimming low over the water (spring to early autumn: the object draws nothing in winter)
  const sw = (pts, sp, s, v, off, seed) => A.push({ obj: 'bird.wp-swallow', layer: 'near', path: pts.map(p => [p[0], p[1]]), speed: sp, loop: 'fade', s, variant: v, seed, offset: off });
  sw([[-140, 548], [180, 572], [420, 538], [640, 590], [860, 556], [1060, 600], [1300, 566], [1760, 584]], 310, 0.8, 0, 0.1, 31);
  sw([[1760, 512], [1420, 530], [1180, 498], [960, 524], [700, 492], [440, 520], [200, 486], [-160, 508]], 280, 0.62, 1, 0.55, 32);
  sw([[-160, 470], [260, 486], [520, 462], [780, 480], [1040, 458], [1400, 474], [1760, 462]], 240, 0.48, 0, 0.8, 33);

  // ---- after dusk: pipistrelles hawking over the water and along the trees (drawn only after real dusk; none in winter)
  const bat = (cx, cy, rx, ry, sp, s, v, seed) => {
    const r = rnd(seed), pts = [];
    for (let i = 0; i <= 22; i++) { const a = i / 22 * Math.PI * 2; pts.push([R1(cx + Math.cos(a) * rx * (0.7 + r() * 0.5)), R1(cy + Math.sin(a * 2) * ry * (0.6 + r() * 0.6))]); }
    pts[22] = pts[0];
    A.push({ obj: 'animal.wp-bat', layer: 'mid', path: pts, speed: sp, loop: 'loop', s, variant: v, seed, offset: R2(r()) });
  };
  bat(560, 380, 260, 70, 150, 0.9, 0, 41); bat(980, 330, 220, 90, 170, 0.8, 1, 42); bat(1280, 420, 180, 60, 140, 1, 0, 43); bat(300, 300, 160, 80, 160, 0.75, 1, 44); bat(760, 460, 300, 40, 180, 1.1, 0, 45);

  // ---- after dusk: mist lying on the water (drawn only after real dusk and before dawn): long banks that lie still (baked),
  // and two small wisps that drift across them. Every wisp hangs below row 440, above the water (see sky.wp-mist)
  P.push({ obj: 'sky.wp-mist', x: 560, y: 440, s: 0.95, layer: 'mid', variant: 0, pin: true, anim: false },
    { obj: 'sky.wp-mist', x: 1180, y: 440, s: 1.05, layer: 'mid', variant: 1, flip: true, pin: true, anim: false },
    { obj: 'sky.wp-mist', x: 820, y: 440, s: 1.1, layer: 'near', variant: 2, pin: true, anim: false });
  [[[-60, 440], [1660, 440], 9, 1, 3], [[1640, 440], [-40, 440], 7, 1.15, 4]]
    .forEach(([a, b, sp, s, v], i) => A.push({ obj: 'sky.wp-mist', layer: i ? 'near' : 'mid', path: [a, b], speed: sp, loop: 'pingpong', s, variant: v, seed: 51 + i, offset: R2(0.2 + i * 0.37) }));

  // ---- framing: a Scots pine bough over the top left
  P.push({ obj: 'tree.wp-pine-bough', x: -36, y: -22, s: 0.92, layer: 'front', pin: true, anim: { sway: { k: 1 } } });
  return typeof sceneFromRecipe === 'function' ? sceneFromRecipe(data) : data;
}

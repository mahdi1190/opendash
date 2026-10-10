/* ============================================================
   SCENE LIBRARY: sheffield-kelham (docs/dev/SCENE_ENGINE_V2.md), the shared ground plans, building styles and own objects of
   the four Kelham Island views (71-scene-uk-north-sheffield-kelham.js). PURE: data, sceneBuildingStyleDefine and
   sceneObjDefine calls only; every build runs lazily.

   Kelham Island, Sheffield: the island between the River Don and the goit (the mill race cut in the Middle Ages to drive the
   town's corn mill), the cradle of the city's steel and cutlery trades. Kelham Island Museum (the old tramway power station,
   with the River Don Engine in its own tall house), Victorian cutlery and file works of red brick with stone dressings and
   tall square chimneys, most now flats, the Fat Cat and the other ale houses on Alma Street, Cornish Place (the great Britannia
   metal works on the river at Ball Street bridge), the Green Lane Works gateway with its clock turret, the riverside walk
   along the Don with its weirs, herons, dippers and goosanders.
     https://www.simt.co.uk/kelham-island-museum   https://historicengland.org.uk (Green Lane Works gateway, Cornish Place)

   The views (each a different real viewpoint, ground metres: x to the right of the view axis, d forward):
     v1  from Ball Street bridge, looking along the Don to the weir, Cornish Place on the left bank, the riverside walk right
     v2  on the museum's goit bank, looking along the goit to the River Don Engine house and the museum's chimney
     v3  Alma Street at the Fat Cat: the corner pub, the brewery, works converted to flats, the chimney over the roofs
     v4  Green Lane at the Works gateway: the arch and its clock turret, the long works range, the street busy with life

   Building styles (for data.buildings, the generator 19): kelham-works (the cutlery and file works, smoke-dark red brick,
   rows of small-paned workshop windows, stone bands, taking-in doors) and kelham-flats (the newer brick-and-glass blocks).
   Objects of their own (klm-):
     landmark.klm-chimney        a tall square tapering works chimney, oversailing courses, a stone cap, iron bands
     plant.klm-sycamore-bough    a sycamore bough over the top of the frame (palmate leaves in three tones, bare twigs in winter)
     structure.klm-bessemer      the Bessemer converter outside the museum, tilted on its trunnions between iron standards
   Drawn in each camera's perspective (SCENE_KLM_DRAW, placed as pieces by the scene file):
     fatCat    the Fat Cat ale house: its front and gable end, the pub front, sashes, stacks, tables, a blank board
     gateway   the Green Lane Works gateway: the carriage arch, paired columns, attic, clock turret and cupola
     hall      the River Don Engine house: a tall brick hall, round-arched windows, oculus gables, a slate roof
   ============================================================ */
const SCENE_KLM = Object.freeze({
  /** A seeded LCG. */
  rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); },
  /** An open Catmull-Rom line through [x, d] points, every ~step metres. */
  line(pts, step) {
    const R2 = v => Math.round(v * 100) / 100, out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], e = pts[Math.min(pts.length - 1, i + 2)];
      const k = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / step));
      for (let j = 0; j < k; j++) { const t = j / k, t2 = t * t, t3 = t2 * t, cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3); out.push([R2(cr(a[0], b[0], c[0], e[0])), R2(cr(a[1], b[1], c[1], e[1]))]); }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  },
  /** Offset a polyline o metres to its right (negative: left), in (x, d). */
  offset(L, o) {
    const R2 = v => Math.round(v * 100) / 100;
    return L.map((p, i) => { const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)], tx = b[0] - a[0], td = b[1] - a[1], m = Math.hypot(tx, td) || 1; return [R2(p[0] + td / m * o), R2(p[1] - tx / m * o)]; });
  },
  /** The camera's projection: [X, Y] of ground (x, d) at height h. */
  proj(cam) { const f = 800 / Math.tan(cam.fov * Math.PI / 360), x0 = cam.x0 || 800; return { f, p: (x, d, h) => [x0 + f * x / d, cam.horizon + f * (cam.eye - (h || 0)) / d] }; },
  /** A far hillside of Sheffield (screen units): a ridge line with rows of terraces stepping up it and trees between. */
  hill(base, top, seed) {
    const R1 = v => Math.round(v * 10) / 10, r = SCENE_KLM.rnd(seed);
    let d = `M-170 ${base}`;
    for (let x = -170; x <= 1770; x += 40) d += `L${x} ${R1(top + Math.sin(x / 260 + seed) * 14 + Math.sin(x / 90) * 4 + r() * 3)}`;
    return d + `L1770 ${base}Z`;
  },

  // ---- v1: Ball Street bridge, looking east-south-east down the Don to the weir; Cornish Place on the left bank
  v1: Object.freeze({
    camera: { eye: 1.7, fov: 64, horizon: 395, x0: 930, heading: 112, lat: 53.3906, lon: -1.4719, water: -2.6 },
    river: [[6, 2], [4, 30], [-1, 60], [-10, 100], [-26, 150], [-50, 210], [-90, 300]],
    width: 24,
    weir: [[-14, 50], [10, 40]],
  }),
  // ---- v2: the goit bank on the museum island, looking north-west along the goit to the River Don Engine house
  v2: Object.freeze({
    camera: { eye: 1.65, fov: 66, horizon: 430, heading: 305, lat: 53.3894, lon: -1.4729, water: -1.6 },
    goit: [[-4.5, 2], [-4.2, 25], [-3.4, 50], [-1.5, 80], [2, 120], [6, 170]],
    width: 6.5,
  }),
  // ---- v3: Alma Street at the Fat Cat, looking west along the street (the brewery and the works flats beyond)
  v3: Object.freeze({
    camera: { eye: 1.65, fov: 48, horizon: 520, x0: 660, heading: 300, lat: 53.3897, lon: -1.4712 },
    dir: [0.643, 0.766], c0: [-4.56, 8.52],   // Alma Street, straight in plan: through c0, along dir (40 degrees right of the axis)
  }),
  // ---- v4: Green Lane at the Works gateway, looking south-west along Green Lane (the gateway on the right)
  v4: Object.freeze({
    camera: { eye: 1.65, fov: 58, horizon: 610, x0: 960, heading: 228, lat: 53.3911, lon: -1.4741 },
    dir: [-0.643, 0.766], c0: [8.15, 12.06],   // Green Lane, straight in plan: through c0, along dir (40 degrees left of the axis)
  }),
});

/* ---------- building styles of the place ---------- */
(function () {
  if (typeof sceneBuildingStyleDefine !== 'function') return;
  // a Victorian cutlery or file works: red brick (smoke-dark), three or four storeys of many small-paned windows (the workshops
  // needed light), stone sills and heads, a slate roof, string courses, a taking-in door and hoist
  sceneBuildingStyleDefine('kelham-works', {
    label: 'Sheffield cutlery works', eras: [1820, 1900], regions: ['uk', 'north'], grouping: 'block', layout: 'grid',
    storeys: [3, 4], storeyH: [3.6, 3.3], frontage: [18, 50], depth: [9, 14], roof: 'pitched-side', pitch: 26,
    wall: { cols: ['#8a3e2c', '#7a3828', '#94482e', '#6e3426'], grime: '#2a2220', texture: 'brick', mortar: '#a89a84' },
    roofMat: { cols: ['#3a4048', '#444a52', '#3e3e44'], kind: 'slate' },
    dress: { cols: ['#c2b498', '#b0a284'] },
    win: { type: 'metal', panes: [4, 3], w: 1.3, hk: 0.6, sill: 0.9, head: 'flat', recess: 0.18, lintelCol: 'dress', frames: ['#2a2e30', '#3a3226', '#e8e2d2'], glass: ['#2a343c', '#303a42', '#26303a'] },
    door: { w: 1.3, h: 2.5, fan: false, panels: 0, recess: 0.25, cols: ['#2a3a30', '#3a2a1e', '#1e2a3a'] },
    grid: { col: 2.7, margin: 0.7, loading: true, doorCol: '#2a3a30' },
    chimney: { where: 'none' },
    bands: [{ storey: 1, h: 0.25, col: '#b4a68a' }, { storey: 2, h: 0.18, col: '#6a2e22' }, { storey: 3, h: 0.18, col: '#6a2e22' }],
    sideWindows: true,
    details: { downpipe: 0.9, alarm: 0, boxes: 0, ivy: 0.15 },
    night: { on: 0.55, curtain: 0.3, tv: 0.1 },
  });
  // the newer flats among them: brick and dark-framed glass, five or six storeys, balconies, a flat roof
  sceneBuildingStyleDefine('kelham-flats', {
    label: 'Kelham brick-and-glass flats', eras: [2000, 2025], regions: ['uk', 'north'], grouping: 'block', layout: 'grid',
    storeys: [5, 6], storeyH: [3.4, 3.0], frontage: [18, 40], depth: [12, 16], roof: 'flat', parapet: 0.6,
    wall: { cols: ['#7a4434', '#5e3a30', '#8e5a44', '#4a4440'], grime: '#2a2826', texture: 'brick', mortar: '#9a8e80' },
    roofMat: { cols: ['#3a3c40'], kind: 'felt' },
    dress: { cols: ['#2a2c30', '#3a3c40'] },
    win: { type: 'metal', panes: [1, 2], w: 1.9, hk: 0.72, sill: 0.4, head: 'flat', recess: 0.25, lintelCol: 'dress', frames: ['#26282c', '#3a3a3e'], glass: ['#2e3a46', '#36424e', '#2a3440'] },
    door: { w: 1.6, h: 2.6, fan: false, panels: 0, recess: 0.3, cols: ['#26282c'] },
    grid: { col: 3.2, margin: 0.9, loading: false, doorCol: '#26282c' },
    chimney: { where: 'none' },
    bands: [{ storey: 1, h: 0.3, col: '#2a2c30' }],
    sideWindows: true,
    details: { downpipe: 0.2, alarm: 0, boxes: 0.6, ivy: 0 },
    night: { on: 0.7, curtain: 0.4, tv: 0.2 },
  });
})();

/* ---------- objects ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = (v) => Math.round(v * 10) / 10;

  /* landmark.klm-chimney: a works chimney, square and tapering, about 38 m (anchor: the foot, centre). Brick with darker
     smoke-stained top, oversailing courses and a stone cap, iron bands, a lightning conductor; one variant has a stepped
     plinth with a blank stone panel. */
  sceneObjDefine({
    id: 'landmark.klm-chimney', category: 'landmark', size: [80, 760], variants: 2, seasonal: true, flippable: true,
    real: { h: 38 },
    palette: {
      base: { brick: ['#8a3e2c', '#6e3024', '#a85a3e', '#3a2420'], stone: ['#c8bca0', '#9a8e74'], iron: ['#2a2626'] },
      spring: { brick: ['#8e402e', '#703226', '#ac5c40', '#3a2420'] },
      summer: { brick: ['#8a3e2c', '#6e3024', '#a85a3e', '#3a2420'] },
      autumn: { brick: ['#863c2a', '#6a2e22', '#a2563a', '#382220'] },
      winter: { brick: ['#7e3a2a', '#642c22', '#985238', '#342220'], stone: ['#e8ecee', '#b0aa98'] },
    },
    parts: ['body'], reflect: true, shadow: { rx: 30, ry: 6, h: 700 },
    tags: ['uk', 'sheffield', 'chimney', 'works', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Kelham Island views: a Sheffield works chimney',
    build(v, rnd, ctx) {
      const b = [], H = 740, w0 = 34, w1 = 20;
      const X = (t, s) => R(s * (w0 + (w1 - w0) * t));
      // the shaft: a lit left face and a shaded right face (square in plan, seen corner-on a little)
      b.push({ f: '@brick.0', d: `M${-w0} 0L${-w1} ${-H}L${R(w1 * 0.2)} ${-H}L${R(w0 * 0.2)} 0Z` });
      b.push({ f: '@brick.1', d: `M${R(w0 * 0.2)} 0L${R(w1 * 0.2)} ${-H}L${w1} ${-H}L${w0} 0Z` });
      // smoke stain down from the top
      b.push({ f: '@brick.3', d: `M${-w1 - 1} ${-H}L${-w1 - 3} ${-H + 160}Q0 ${-H + 200} ${w1 + 3} ${-H + 140}L${w1 + 1} ${-H}Z`, op: 0.55 });
      // brick courses (a few dark lines) and iron bands
      let c = '', ib = '';
      for (let i = 1; i < 40; i++) { const t = i / 40, y = R(-H * t); c += `M${-X(t, 1)} ${y}H${X(t, 1)}`; }
      for (let i = 1; i < 8; i++) { const t = i / 8.6, y = R(-H * t); ib += `M${-X(t, 1) - 1} ${y}H${X(t, 1) + 1}`; }
      b.push({ s: '@brick.1', w: 1, d: c, op: 0.5, detail: true }, { s: '@iron.0', w: 2.6, d: ib, op: 0.85 });
      // oversailing courses and the cap
      b.push({ f: '@brick.2', d: `M${-w1 - 6} ${-H + 30}h${2 * w1 + 12}v-12h${-2 * w1 - 12}z` });
      b.push({ f: '@brick.1', d: `M${-w1 - 4} ${-H + 18}h${2 * w1 + 8}v-18h${-2 * w1 - 8}z` });
      b.push({ f: '@stone.0', d: `M${-w1 - 8} ${-H}h${2 * w1 + 16}v-10h${-2 * w1 - 16}z` }, { f: '@stone.1', d: `M${-w1 - 8} ${-H}h${2 * w1 + 16}v-3h${-2 * w1 - 16}z` });
      b.push({ s: '@iron.0', w: 1.4, d: `M${w1 - 4} ${-H - 10}v-26` });
      if (v === 1) {
        b.push({ f: '@brick.1', d: `M${-w0 - 6} 0v-60h${2 * w0 + 12}v60z` }, { f: '@stone.0', d: `M${-w0 - 8} -60h${2 * w0 + 16}v-6h${-2 * w0 - 16}z` });
        b.push({ f: '@stone.1', d: `M-14 -46h28v-10h-28z`, op: 0.8 });
      }
      return { body: b };
    },
  });

  /* plant.klm-sycamore-bough: a sycamore bough reaching into the top of the frame from the left edge (anchor: where it leaves
     the edge; flip it for the right), the limb and its twigs tapered, palmate five-lobed leaves in hanging clusters in three
     tones (one path each, light on the bytes), bare in winter with fat green buds. */
  sceneObjDefine({
    id: 'plant.klm-sycamore-bough', category: 'plant', size: [760, 420], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 4, l: 8, w: 4 },
    palette: {
      base:   { bark: ['#3a3430', '#55493e', '#6e6252'], leaf: ['#2e4a24', '#44662e', '#6a8a3c'] },
      spring: { leaf: ['#4a7a2a', '#6a9a36', '#9ac050'] },
      summer: { leaf: ['#284420', '#3a5e2a', '#5a7e36'] },
      autumn: { leaf: ['#8a6a24', '#b08a2e', '#d0a83c'] },
      winter: { bark: ['#2e2a26', '#4a423a', '#625a4e'], leaf: ['#4a5a2a', '#5a6a30', '#6a7a3a'] },
    },
    parts: ['limb', 'leaves'],
    anim: { sway: { part: 'leaves', pivot: [0, 0], deg: 1.2 } },
    reflect: false, shadow: false,
    tags: ['uk', 'sycamore', 'frame', 'kit:temperate', 'kit:urban', 'role:frame', 'class:air'],
    credit: 'drawn for the Kelham Island views: a sycamore bough over the top of the frame',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { limb: [], leaves: [] };
      const F = (n) => Math.round(n * 10) / 10;
      // a tapered limb along a polyline: the left edge out, the right edge back
      const limb = (pts, w0, w1) => {
        const L = [], Rr = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], m = Math.hypot(tx, ty) || 1, w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
          L.push([pts[i][0] - ty / m * w, pts[i][1] + tx / m * w]); Rr.push([pts[i][0] + ty / m * w, pts[i][1] - tx / m * w]);
        }
        return 'M' + L.concat(Rr.reverse()).map(p => F(p[0]) + ' ' + F(p[1])).join('L') + 'Z';
      };
      const main = v === 0 ? [[-20, 20], [80, 70], [170, 96], [260, 102], [350, 128], [450, 132], [540, 118], [640, 124], [720, 112]] : [[-20, -10], [90, 48], [180, 70], [270, 112], [370, 126], [470, 160], [570, 166], [660, 186], [730, 182]];
      out.limb.push({ f: '@bark.1', d: limb(main, 46, 8) }, { f: '@bark.0', d: limb(main.map(([x, y]) => [x, y + 6]), 20, 3), op: 0.6 });
      const tips = [];
      for (let i = 1; i < main.length - 1; i++) {
        const [x, y] = main[i], n = i % 2 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const dx = 40 + rnd() * 70, dy = (k ? 1 : -0.4) * (50 + rnd() * 80), tw = [[x, y], [x + dx * 0.5, y + dy * 0.45 + 10], [x + dx, y + dy]];
          out.limb.push({ f: '@bark.2', d: limb(tw, 9, 2) });
          tips.push(tw[2], tw[1]);
        }
      }
      tips.push(main[main.length - 1], main[main.length - 2]);
      if (season === 'winter') {
        // the bare twigs: a fan of fine shoots from every tip, fat green buds at their ends
        let tw = '', bud = '';
        for (const [x, y] of tips) for (let k = 0; k < 4; k++) { const a = Math.PI * (0.15 + rnd() * 0.7) * (rnd() < 0.3 ? -1 : 1), L = 18 + rnd() * 26, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L; tw += `M${F(x)} ${F(y)}Q${F((x + ex) / 2 + (rnd() - 0.5) * 8)} ${F((y + ey) / 2)} ${F(ex)} ${F(ey)}`; bud += `M${F(ex - 2)} ${F(ey)}L${F(ex)} ${F(ey - 4)}L${F(ex + 2)} ${F(ey)}Z`; }
        out.limb.push({ s: '@bark.2', w: 1.6, d: tw, cap: 'round' }, { f: '@leaf.2', d: bud });
        return out;
      }
      // the leaves: palmate, five lobes, hanging in clusters round each tip; three tones in three paths
      const leaf = (x, y, a, s) => {
        // the stem point, then five lobe tips fanned about the axis a with notches between (a sycamore's palmate leaf)
        const P = (ang, r) => F(x + Math.cos(ang) * r) + ' ' + F(y + Math.sin(ang) * r), pts = [P(a + Math.PI, s * 0.2)];
        const fan = [-1.5, -0.75, 0, 0.75, 1.5], len = [0.62, 0.9, 1, 0.9, 0.62];
        for (let i = 0; i < 5; i++) { pts.push(P(a + fan[i], s * len[i])); if (i < 4) pts.push(P(a + (fan[i] + fan[i + 1]) / 2, s * 0.62)); }
        return 'M' + pts.join('L') + 'Z';
      };
      const tone = ['', '', ''];
      const n = season === 'autumn' ? 6 : 8;
      for (const [tx, ty] of tips) {
        for (let j = 0; j < n; j++) {
          const x = tx + (rnd() - 0.5) * 70, y = ty + (rnd() - 0.2) * 60, a = Math.PI / 2 + (rnd() - 0.5) * 1.6, s = 13 + rnd() * 9, k = y < ty ? (rnd() < 0.6 ? 2 : 1) : (rnd() < 0.6 ? 0 : 1);
          tone[k] += leaf(x, y, a, s);
        }
      }
      out.leaves.push({ f: '@leaf.0', d: tone[0] }, { f: '@leaf.1', d: tone[1] }, { f: '@leaf.2', d: tone[2] });
      return out;
    },
  });
  /* structure.klm-bessemer: the Bessemer converter that stands outside Kelham Island Museum (one of the last in Britain): a
     great pear-shaped steel vessel lined with firebrick, tilted on its trunnions between two cast-iron standards, its nose
     turned up and over, riveted bands round its belly, on a low stone plinth (anchor: the foot, centre; about 5.5 m tall). */
  sceneObjDefine({
    id: 'structure.klm-bessemer', category: 'structure', size: [300, 310], variants: 1, seasonal: true, flippable: true,
    real: { h: 5.5, l: 5.5, w: 3.5 },
    palette: {
      base: { steel: ['#5e4a3e', '#3a302a', '#8a6a52', '#a8744a'], iron: ['#2a2a2c', '#4a4a50'], stone: ['#b8ab8e', '#948a72'], rust: ['#9a5a2e', '#b4703a'] },
      spring: { steel: ['#604c40', '#3c322c', '#8c6c54', '#aa764c'] },
      summer: { steel: ['#5e4a3e', '#3a302a', '#8e6e54', '#ac784c'] },
      autumn: { steel: ['#5c483c', '#382e28', '#886850', '#a67248'] },
      winter: { steel: ['#58463a', '#362c26', '#84644e', '#a06e46'], stone: ['#e6eaec', '#b4ae9c'] },
    },
    parts: ['body'], reflect: false, shadow: { rx: 130, ry: 14, h: 260 },
    tags: ['uk', 'sheffield', 'steel', 'museum', 'kit:urban', 'role:landmark', 'class:structure'],
    credit: 'drawn for the Kelham Island views: the Bessemer converter outside the museum',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [];
      // the plinth and the two standards (A-frames of cast iron) carrying the trunnions
      b.push({ f: '@stone.1', d: 'M-150 0V-22H150V0Z' }, { f: '@stone.0', d: 'M-150 -22H150V-28H-150Z' });
      if (season === 'winter') b.push({ f: '#f2f5f7', d: 'M-150 -26H150V-30H-150Z' });
      for (const sx of [-1, 1]) b.push({ f: '@iron.0', d: `M${sx * 118} -28L${sx * 96} -168L${sx * 84} -168L${sx * 62} -28Z` }, { f: '@iron.1', d: `M${sx * 112} -28L${sx * 94} -150L${sx * 88} -150L${sx * 78} -28Z`, op: 0.6 }, { f: '@iron.0', d: sceneD.circ(sx * 90, -170, 16) }, { f: '@iron.1', d: sceneD.circ(sx * 90, -170, 7) });
      // the vessel: a pear tilted to the right, the nose up and over to the left, a lit flank and a shaded flank
      b.push({ f: '@steel.0', d: 'M-78 -120C-92 -190 -60 -258 -10 -270C18 -276 30 -262 36 -246C70 -238 96 -200 92 -150C88 -96 52 -64 4 -62C-40 -62 -70 -84 -78 -120Z' });
      b.push({ f: '@steel.2', d: 'M-70 -124C-82 -186 -54 -248 -12 -260C-30 -232 -46 -190 -40 -140C-36 -104 -20 -80 0 -70C-34 -72 -62 -92 -70 -124Z', op: 0.75 });
      b.push({ f: '@steel.1', d: 'M40 -236C72 -224 92 -192 88 -150C84 -104 54 -72 12 -66C44 -90 60 -130 58 -172C56 -200 50 -222 40 -236Z', op: 0.8 });
      // the nose and its mouth (a dark ring), a rust bloom
      b.push({ f: '@steel.0', d: 'M-10 -270C-4 -296 20 -306 40 -296L50 -262C36 -248 18 -250 0 -258Z' }, { f: '#141010', d: sceneD.ell(46, -282, 12, 20) }, { f: '@steel.3', d: sceneD.ell(43, -282, 14, 22), op: 0.4 });
      b.push({ f: '@rust.0', d: 'M-50 -110C-40 -90 -10 -80 20 -84C0 -96 -30 -100 -50 -110Z', op: 0.6 }, { f: '@rust.1', d: sceneD.ell(30, -200, 14, 8), op: 0.35 });
      // the trunnion ring and riveted bands round the belly
      b.push({ s: '@iron.0', w: 9, d: 'M-86 -166C-40 -150 40 -150 94 -170' }, { s: '@steel.3', w: 2, d: 'M-86 -172C-40 -156 40 -156 94 -176', op: 0.6 });
      let rv = ''; for (let i = 0; i < 16; i++) { const t = i / 15, x = -80 + t * 168, y = -168 + Math.sin(t * Math.PI) * 14 - t * 4; rv += sceneD.circ(R(x), R(y), 2.2); }
      b.push({ f: '@steel.3', d: rv, op: 0.8 });
      b.push({ s: '@steel.1', w: 3, d: 'M-76 -112C-30 -96 40 -98 84 -120M-60 -222C-20 -238 30 -240 60 -228', op: 0.7 });
      if (season === 'winter') b.push({ f: '#f2f5f7', d: 'M-60 -246C-30 -268 10 -276 34 -262C10 -262 -30 -256 -60 -246Z', op: 0.9 });
      return { body: b };
    },
  });
})();

/* ---------- facades in a camera's perspective (pieces: 71-scene-uk-north-sheffield-kelham.js _klmPiece) ----------
   SCENE_KLM_DRAW.facade(cam, a, b): a wall plane on the ground line a -> b (metres [x, d]), its outward side toward the camera:
   p(s, z, o) -> [X, Y] (s metres along from a, z up, o out toward the camera), poly / line / rect -> absolute paths,
   arch(s0, s1, z0, zSpring) and circle(sc, zc, r) -> points. Then the drawings: fatCat(F, season), gateway(F, season),
   hall(cam, foot, eave, ridge, season): each -> [shape] in absolute screen units. */
const SCENE_KLM_DRAW = (function () {
  const R1 = v => Math.round(v * 10) / 10;
  const facade = (cam, a, b) => {
    const f = 800 / Math.tan(cam.fov * Math.PI / 360), x0 = cam.x0 || 800;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, ud = (b[1] - a[1]) / L;
    let nx = ud, nd = -ux;
    const mx = (a[0] + b[0]) / 2, md = (a[1] + b[1]) / 2;
    if (nx * -mx + nd * -md < 0) { nx = -nx; nd = -nd; }
    const p = (s, z, o) => { const x = a[0] + ux * s + nx * (o || 0), d = Math.max(0.5, a[1] + ud * s + nd * (o || 0)); return [x0 + f * x / d, cam.horizon + f * (cam.eye - z) / d]; };
    const pts = (list) => list.map(q => { const r = p(q[0], q[1], q[2]); return R1(r[0]) + ' ' + R1(r[1]); });
    const poly = (list) => 'M' + pts(list).join('L') + 'Z';
    const line = (list) => 'M' + pts(list).join('L');
    const rect = (s0, s1, z0, z1, o) => poly([[s0, z0, o], [s1, z0, o], [s1, z1, o], [s0, z1, o]]);
    const arch = (s0, s1, z0, zs, o, n) => { const c = (s0 + s1) / 2, r = (s1 - s0) / 2, k = n || 10, out = [[s0, z0, o], [s1, z0, o]]; for (let i = 0; i <= k; i++) { const t = i / k * Math.PI; out.push([c + Math.cos(t) * r, zs + Math.sin(t) * r, o]); } return out; };
    const circle = (sc, zc, r, o, n) => { const out = [], k = n || 16; for (let i = 0; i < k; i++) { const t = i / k * Math.PI * 2; out.push([sc + Math.cos(t) * r, zc + Math.sin(t) * r, o]); } return out; };
    return { p, poly, line, rect, arch, circle, len: L, f, a, b, n: [nx, nd] };
  };
  const winter = (season) => season === 'winter';

  /** The Fat Cat: a plain two-storey Victorian ale house of red brick (s 0 to 11.5 m), its pub front painted dark green with
   *  gilt lining, the door in the middle under a lamp, sashes over, a slate roof with a stack at each end, a blank hanging
   *  board on its bracket at the corner, tables and benches outside, hanging baskets in spring and summer. */
  const fatCat = (F, season) => {
    const sh = [], W = 11.5, E = 7.4, Dp = 9;
    // the gable end down the side street (s 0, back into the block): brick, a stack on the gable, two windows a floor
    const side = (z0, z1, o0, o1) => F.poly([[0, z0, o0], [0, z0, o1], [0, z1, o1], [0, z1, o0]]);
    sh.push({ f: '#7a3224', d: F.poly([[0, 0, 0], [0, 0, -Dp], [0, E, -Dp], [0, E + 2.6, -4.2], [0, E, 0]]) });
    let sb = ''; for (let z = 0.6; z < E; z += 0.45) sb += F.line([[0, z, 0], [0, z, -Dp]]);
    sh.push({ s: '#5e2418', w: 0.7, d: sb, op: 0.35 });
    let sg = '', ss = '';
    for (const [o0, o1] of [[-2.2, -3.3], [-5.6, -6.7]]) { ss += side(0.85, 2.9, o0 + 0.1, o1 - 0.1) + side(4.25, 6.45, o0 + 0.1, o1 - 0.1); sg += side(0.95, 2.8, o0, o1) + side(4.35, 6.35, o0, o1); }
    sh.push({ f: '#c4b89a', d: ss }, { f: '#2c343c', d: sg, glow: 'window' });
    sh.push({ f: '#c4b89a', d: F.poly([[0, E - 0.05, 0.1], [0, E + 2.75, -4.2], [0, E - 0.05, -Dp - 0.1], [0, E + 0.2, -Dp - 0.1], [0, E + 2.95, -4.2], [0, E + 0.2, 0.1]]) });
    sh.push({ f: '#8a3a28', d: F.rect(0, W, 0, E) });
    let bk = ''; for (let z = 3.9; z < E; z += 0.45) bk += F.line([[0, z], [W, z]]);
    sh.push({ s: '#6a2a1e', w: 0.7, d: bk, op: 0.35 });
    // the roof: slate rising back from the eaves to the ridge, a stack at each end with pots
    sh.push({ f: winter(season) ? '#dfe4e8' : '#3e424a', d: F.poly([[0, E, 0], [W, E, 0], [W, E + 2.6, -4.2], [0, E + 2.6, -4.2]]) });
    if (!winter(season)) { let sl = ''; for (let k = 1; k < 7; k++) { const t = k / 7; sl += F.line([[0, E + 2.6 * t, -4.2 * t], [W, E + 2.6 * t, -4.2 * t]]); } sh.push({ s: '#2e3238', w: 0.8, d: sl, op: 0.6 }); }
    for (const sc of [0.2, W - 1.6]) sh.push({ f: '#7a3426', d: F.rect(sc, sc + 1.4, E + 1.4, E + 4.2, -2.4) }, { f: '#c4b89a', d: F.rect(sc - 0.1, sc + 1.5, E + 4.2, E + 4.45, -2.4) }, { f: '#8a5038', d: F.rect(sc + 0.2, sc + 0.5, E + 4.45, E + 5, -2.4) + F.rect(sc + 0.8, sc + 1.1, E + 4.45, E + 4.9, -2.4) });
    sh.push({ f: '#c4b89a', d: F.rect(-0.1, W + 0.1, E - 0.25, E, 0.08) });
    // first floor: five sashes, stone sills and heads, glazing bars; lit after dusk
    let bars = '', stone = '', sash = '';
    const glass = [];
    for (let i = 0; i < 5; i++) {
      const c = 1.3 + i * 2.22, s0 = c - 0.55, s1 = c + 0.55;
      stone += F.rect(s0 - 0.12, s1 + 0.12, 4.15, 4.3, 0.06) + F.rect(s0 - 0.1, s1 + 0.1, 6.35, 6.6, 0.04);
      sash += F.rect(s0, s1, 4.3, 6.35);
      glass.push({ f: '#2c343c', d: F.rect(s0 + 0.08, s1 - 0.08, 4.38, 5.25) + F.rect(s0 + 0.08, s1 - 0.08, 5.38, 6.27), glow: 'window' });
      bars += F.line([[c, 4.38], [c, 6.27]]);
    }
    sh.push({ f: '#c4b89a', d: stone }, { f: '#ece6d6', d: sash }, ...glass, { s: '#ece6d6', w: 1.2, d: bars });
    // the pub front: painted, a cornice with gilt line, four big windows, the door with its fanlight, the lamp
    sh.push({ f: '#1e3a2c', d: F.rect(0, W, 0, 3.3, 0.12) }, { f: '#2a4a38', d: F.rect(-0.1, W + 0.1, 3.3, 3.75, 0.2) }, { f: '#c8a040', d: F.rect(0.1, W - 0.1, 3.42, 3.5, 0.21) });
    let pw = '', pb = '';
    const pg = [];
    for (const [s0, s1] of [[0.5, 2.5], [2.8, 4.8], [6.7, 8.7], [9.0, 11.0]]) { pw += F.rect(s0, s1, 0.7, 2.9, 0.13); pg.push({ f: '#2a3038', d: F.rect(s0 + 0.12, s1 - 0.12, 0.82, 2.78, 0.13), glow: 'window' }); pb += F.line([[(s0 + s1) / 2, 0.82, 0.13], [(s0 + s1) / 2, 2.78, 0.13]]) + F.line([[s0 + 0.12, 2.2, 0.13], [s1 - 0.12, 2.2, 0.13]]); }
    sh.push({ f: '#d8cfb4', d: pw }, ...pg, { s: '#d8cfb4', w: 1, d: pb });
    sh.push({ f: '#d8cfb4', d: F.rect(5.05, 6.45, 0, 2.95, 0.13) }, { f: '#16261e', d: F.rect(5.2, 6.3, 0, 2.3, 0.1) }, { f: '#2a3038', d: F.rect(5.25, 6.25, 2.4, 2.85, 0.13), glow: 'window' });
    sh.push({ f: '#1a1a1c', d: F.poly([[5.6, 3.1, 0.6], [6.0, 3.1, 0.6], [5.95, 3.45, 0.6], [5.65, 3.45, 0.6]]) }, { f: '#fff0c0', d: F.poly([[5.66, 3.15, 0.62], [5.94, 3.15, 0.62], [5.9, 3.4, 0.62], [5.7, 3.4, 0.62]]), glow: 'window' });
    // the bracket and its blank board at the corner (no lettering)
    sh.push({ s: '#1a1a1c', w: 1.6, d: F.line([[0.3, 5.3, 0], [0.3, 5.3, 1.2]]) }, { f: '#1e3a2c', d: F.poly([[0.3, 5.15, 0.35], [0.3, 5.15, 1.15], [0.3, 4.1, 1.15], [0.3, 4.1, 0.35]]) }, { s: '#c8a040', w: 1, d: F.poly([[0.3, 5.05, 0.42], [0.3, 5.05, 1.08], [0.3, 4.2, 1.08], [0.3, 4.2, 0.42]]) });
    // tables and benches on the pavement, a pint on each table
    let tops = '', legs = '', pints = '';
    for (const s0 of [0.9, 8.1]) {
      tops += F.poly([[s0, 0.75, 1.3], [s0 + 2.2, 0.75, 1.3], [s0 + 2.2, 0.75, 2.1], [s0, 0.75, 2.1]]) + F.poly([[s0, 0.45, 0.9], [s0 + 2.2, 0.45, 0.9], [s0 + 2.2, 0.45, 1.15], [s0, 0.45, 1.15]]) + F.poly([[s0, 0.45, 2.25], [s0 + 2.2, 0.45, 2.25], [s0 + 2.2, 0.45, 2.5], [s0, 0.45, 2.5]]);
      legs += F.line([[s0 + 0.2, 0, 1.7], [s0 + 0.2, 0.75, 1.7]]) + F.line([[s0 + 2.0, 0, 1.7], [s0 + 2.0, 0.75, 1.7]]);
      pints += F.rect(s0 + 0.6, s0 + 0.72, 0.75, 0.93, 1.7) + F.rect(s0 + 1.5, s0 + 1.62, 0.75, 0.93, 1.6);
    }
    sh.push({ s: '#3a2a20', w: 2.2, d: legs }, { f: '#6a5038', d: tops }, { f: '#b8781e', d: pints });
    // hanging baskets either side of the door in spring and summer
    if (season === 'spring' || season === 'summer') {
      let bs = '', fl = '', ch = '';
      for (const c of [3.9, 7.6]) {
        const q = F.p(c, 3.05, 0.45), r = Math.abs(F.p(c, 0, 0.45)[1] - F.p(c, 0.4, 0.45)[1]);
        ch += F.line([[c, 3.75, 0.2], [c, 3.3, 0.45]]);
        bs += `M${R1(q[0] - r)} ${R1(q[1])}Q${R1(q[0])} ${R1(q[1] + r * 1.6)} ${R1(q[0] + r)} ${R1(q[1])}Z`;
        fl += `M${R1(q[0] - r * 0.9)} ${R1(q[1] + r * 0.1)}L${R1(q[0] - r * 0.4)} ${R1(q[1] + r * 0.6)}L${R1(q[0] - r * 0.8)} ${R1(q[1] + r * 0.9)}ZM${R1(q[0] + r * 0.2)} ${R1(q[1] + r * 0.3)}L${R1(q[0] + r * 0.8)} ${R1(q[1] + r * 0.5)}L${R1(q[0] + r * 0.4)} ${R1(q[1] + r * 1.0)}Z`;
      }
      sh.push({ s: '#1a1a1c', w: 0.8, d: ch }, { f: '#3e6a30', d: bs }, { f: '#d8486a', d: fl });
    }
    return sh;
  };

  /** The Green Lane Works gateway (1860): a triumphal arch of ashlar in the works' street front: the round-headed carriage
   *  arch with its keystone, paired columns either side on pedestals, an entablature and attic over, and on top the clock
   *  turret: a square clock stage (a plain dial, hands at ten past ten, no numerals) and a lead cupola with a ball finial.
   *  s 0 to 10 m along the street; the works' brick range runs on either side (drawn by the generator). */
  const gateway = (F, season) => {
    const sh = [], st = '#cdbf9c', st2 = '#b2a482', st3 = '#e0d4b4', dk = '#2a2420';
    sh.push({ f: st, d: F.rect(0, 10, 0, 8.2, 0.3) });
    // the arch opening, dark, the yard glimpsed through it; its voussoirs and keystone
    sh.push({ f: dk, d: F.poly(F.arch(3, 7, 0, 4.4, 0.3, 14)) });
    sh.push({ f: '#5a5248', d: F.poly(F.arch(3.6, 6.4, 0, 4.4, -6, 10)), op: 0.8 });
    let vs = ''; for (let i = 1; i < 10; i++) { const t = i / 10 * Math.PI; vs += F.line([[5 + Math.cos(t) * 2, 4.4 + Math.sin(t) * 2, 0.31], [5 + Math.cos(t) * 2.55, 4.4 + Math.sin(t) * 2.55, 0.31]]); }
    sh.push({ s: st2, w: 1.2, d: vs }, { f: st3, d: F.poly([[4.7, 6.3, 0.34], [5.3, 6.3, 0.34], [5.4, 7.1, 0.34], [4.6, 7.1, 0.34]]) });
    // paired columns on pedestals either side (lit face, shaded side), capitals and bases, fluting
    for (const c of [1.0, 2.2, 7.8, 9.0]) {
      sh.push({ f: st2, d: F.rect(c - 0.45, c + 0.45, 0, 1.4, 0.55) }, { f: st3, d: F.rect(c - 0.32, c + 0.2, 1.4, 6.7, 0.65) }, { f: st2, d: F.rect(c + 0.2, c + 0.32, 1.4, 6.7, 0.62) });
      sh.push({ f: st3, d: F.rect(c - 0.48, c + 0.48, 6.7, 7.2, 0.7) }, { f: st2, d: F.rect(c - 0.4, c + 0.4, 1.4, 1.6, 0.7) });
      let fl = ''; for (const k of [-0.18, 0, 0.12]) fl += F.line([[c + k, 1.7, 0.66], [c + k, 6.6, 0.66]]);
      sh.push({ s: st2, w: 0.8, d: fl, op: 0.7 });
    }
    // the entablature (architrave, frieze, cornice) and the attic
    sh.push({ f: st2, d: F.rect(-0.1, 10.1, 7.2, 7.5, 0.72) }, { f: st, d: F.rect(-0.1, 10.1, 7.5, 8.1, 0.7) }, { f: st3, d: F.rect(-0.3, 10.3, 8.1, 8.45, 0.85) }, { f: st2, d: F.rect(-0.3, 10.3, 8.45, 8.55, 0.85) });
    sh.push({ f: st, d: F.rect(1.2, 8.8, 8.55, 9.8, 0.4) }, { f: st3, d: F.rect(1.0, 9.0, 9.8, 10.05, 0.5) });
    if (winter(season)) sh.push({ f: '#f2f5f7', d: F.rect(-0.3, 10.3, 8.45, 8.6, 0.86) + F.rect(1.0, 9.0, 10.0, 10.15, 0.5) });
    // the clock stage: a square tower, the dial and its hands, a cornice; then the cupola and its ball finial
    sh.push({ f: st, d: F.rect(3.7, 6.3, 10.05, 12.6, 0.2) }, { f: st2, d: F.rect(3.55, 6.45, 12.6, 12.9, 0.3) });
    sh.push({ f: '#f2ecd8', d: F.poly(F.circle(5, 11.3, 0.85, 0.24, 20)), glow: 'window' }, { s: '#1e1c1a', w: 1.2, d: F.poly(F.circle(5, 11.3, 0.85, 0.25, 20)) });
    sh.push({ s: '#1e1c1a', w: 1.6, d: F.line([[5, 11.3, 0.26], [4.45, 11.55, 0.26]]) + F.line([[5, 11.3, 0.26], [5.65, 11.65, 0.26]]), cap: 'round' });
    let tk = ''; for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; tk += F.line([[5 + Math.cos(t) * 0.72, 11.3 + Math.sin(t) * 0.72, 0.26], [5 + Math.cos(t) * 0.8, 11.3 + Math.sin(t) * 0.8, 0.26]]); }
    sh.push({ s: '#1e1c1a', w: 0.8, d: tk });
    const dome = []; for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI; dome.push([5 + Math.cos(t) * 1.15, 12.9 + Math.sin(t) * 1.5, 0]); }
    sh.push({ f: winter(season) ? '#e8ecee' : '#5a6a6e', d: F.poly([[3.85, 12.9, 0]].concat(dome, [[6.15, 12.9, 0]])) }, { f: '#7a8a8c', d: F.poly([[4.2, 12.95, 0.05], [4.7, 14.1, 0.05], [5, 14.4, 0.05], [4.6, 13.1, 0.05]]), op: 0.6 });
    sh.push({ f: '#3a3a3a', d: F.rect(4.93, 5.07, 14.4, 15.2, 0) }, { f: '#b89a48', d: F.poly(F.circle(5, 15.35, 0.18, 0, 10)) });
    // the stone's weathering: dark streaks down from the cornice
    let wx = ''; for (const s0 of [0.4, 3.2, 6.6, 9.5]) wx += F.poly([[s0, 7.2, 0.73], [s0 + 0.3, 7.2, 0.73], [s0 + 0.2, 5.2, 0.73], [s0 + 0.1, 5.2, 0.73]]);
    sh.push({ f: '#6a604e', d: wx, op: 0.35 });
    return sh;
  };

  /** A tall brick hall (the River Don Engine house): the walls that face the eye with tall round-arched windows between
   *  pilaster strips, a stone plinth and string course, the gable ends with an oculus and stone coping, a slate roof (the
   *  planes that face the eye). foot: 4 corners [x, d], foot[0] -> foot[1] a gable end; eave and ridge in metres. */
  const hall = (cam, foot, eave, ridge, season, o) => {
    o = o || {};
    const sh = [], cx = foot.reduce((s, p) => s + p[0], 0) / 4, cd = foot.reduce((s, p) => s + p[1], 0) / 4, walls = [];
    for (let i = 0; i < 4; i++) {
      const a = foot[i], b = foot[(i + 1) % 4], F = facade(cam, a, b), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if ((F.n[0] * (mid[0] - cx) + F.n[1] * (mid[1] - cd)) <= 0) continue;   // the side facing the eye is the inside
      walls.push({ F, gable: i % 2 === 0, mid });
    }
    walls.sort((p, q) => Math.hypot(q.mid[0], q.mid[1]) - Math.hypot(p.mid[0], p.mid[1]));
    for (const w of walls) {
      const F = w.F, L = F.len, z1 = eave;
      sh.push({ f: w.gable ? (o.brick || '#8e4030') : (o.brick2 || '#7a3628'), d: F.poly(w.gable ? [[0, 0], [L, 0], [L, z1], [L / 2, ridge], [0, z1]] : [[0, 0], [L, 0], [L, z1], [0, z1]]) });
      let bk = ''; for (let z = 1.2; z < z1; z += 0.6) bk += F.line([[0, z], [L, z]]);
      sh.push({ s: '#5a2418', w: 0.6, d: bk, op: 0.3 });
      sh.push({ f: '#b4a484', d: F.rect(-0.05, L + 0.05, 0, 1.0, 0.08) }, { f: '#c4b494', d: F.rect(-0.05, L + 0.05, z1 - 0.5, z1 - 0.2, 0.1) });
      const n = w.gable ? 3 : Math.max(3, Math.round(L / 4.2)), bay = L / n;
      let fr = '', pil = '', bars = '';
      const gl = [];
      for (let k = 0; k < n; k++) {
        const c = bay * (k + 0.5), ww = Math.min(2.6, bay * 0.55), s0 = c - ww / 2, s1 = c + ww / 2, zt = z1 - 1.6 - ww / 2;
        fr += F.poly(F.arch(s0 - 0.18, s1 + 0.18, 1.9, zt, 0.05, 10));
        gl.push({ f: '#2a323a', d: F.poly(F.arch(s0, s1, 2.0, zt, 0.04, 10)), glow: 'window' });
        for (const t of [0.33, 0.67]) bars += F.line([[s0 + ww * t, 2.0, 0.05], [s0 + ww * t, zt + ww / 2 * Math.sin(Math.acos(Math.abs(t - 0.5) * 2)), 0.05]]);
        for (let zz = 3.2; zz < zt; zz += 1.4) bars += F.line([[s0, zz, 0.05], [s1, zz, 0.05]]);
        if (k > 0) pil += F.rect(bay * k - 0.35, bay * k + 0.35, 1.0, z1 - 0.5, 0.12);
      }
      sh.push({ f: o.pil || '#9a4836', d: pil }, { f: '#c4b494', d: fr }, ...gl, { s: '#c4b494', w: 0.9, d: bars, op: 0.9 });
      if (w.gable) {
        const zc = z1 + (ridge - z1) * 0.42;
        sh.push({ f: '#c4b494', d: F.poly(F.circle(L / 2, zc, 1.0, 0.06, 18)) }, { f: '#2a323a', d: F.poly(F.circle(L / 2, zc, 0.75, 0.07, 18)), glow: 'window' });
        sh.push({ f: '#c4b494', d: F.poly([[-0.2, z1 - 0.1, 0.12], [L / 2, ridge + 0.25, 0.12], [L + 0.2, z1 - 0.1, 0.12], [L + 0.2, z1 + 0.3, 0.12], [L / 2, ridge + 0.6, 0.12], [-0.2, z1 + 0.3, 0.12]]) });
      }
    }
    // the roof planes facing the eye: the long sides (foot[1] -> foot[2] and foot[3] -> foot[0]), drawn first (behind the gables)
    const roof = [], half = Math.hypot(foot[1][0] - foot[0][0], foot[1][1] - foot[0][1]) / 2;
    for (const [a, b] of [[foot[1], foot[2]], [foot[3], foot[0]]]) {
      const F = facade(cam, a, b), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if ((F.n[0] * (mid[0] - cx) + F.n[1] * (mid[1] - cd)) <= 0) continue;
      roof.push({ f: winter(season) ? '#e2e7ea' : '#454a52', d: F.poly([[0, eave, 0.2], [F.len, eave, 0.2], [F.len, ridge, -half], [0, ridge, -half]]) });
      if (!winter(season)) { let sl = ''; for (let k = 1; k < 8; k++) { const t = k / 8; sl += F.line([[0, eave + (ridge - eave) * t, 0.2 - (half + 0.2) * t], [F.len, eave + (ridge - eave) * t, 0.2 - (half + 0.2) * t]]); } roof.push({ s: '#30343a', w: 0.7, d: sl, op: 0.5 }); }
    }
    return roof.concat(sh);
  };
  return { facade, fatCat, gateway, hall };
})();

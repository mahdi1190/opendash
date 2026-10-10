/* ============================================================
   SCENE LIBRARY: sheffield-parks (docs/dev/SCENE_ENGINE_V2.md), the ground-plan helpers and own objects of the four
   Sheffield parks views (71-scene-uk-north-sheffield-parks.js). PURE: data and sceneObjDefine calls only.

   Four real viewpoints, composed by hand:
     v1  the Botanical Gardens: up the main lawn to the three curvilinear glass pavilions on their terrace
     v2  Endcliffe Park: on the Porter Brook bank by the stepping stones, the cafe on the far bank, the brook running away
     v3  Weston Park: from the lawn by the bandstand to the park gates, Western Bank's buses, the museum and Firth Court
     v4  Ringinglow: the Round House at the city's edge and the road out over the moor to the gritstone edges of the Peak

   Objects of their own (lit from the LEFT; anchor the middle of the front foot; no lettering, no logos, no crests):
     landmark.shp-pavilions        the 1836 glass pavilions: three curvilinear roofs, the linking houses, stone piers, terrace
     landmark.shp-weston-museum    Weston Park Museum (the Mappin gallery front): sandstone, an Ionic loggia, attic balustrade
     landmark.shp-firth-court      the University's 1905 red-brick Firth Court: the gate tower, ogee-capped turrets, oriels
     landmark.shp-round-house      the Ringinglow Round House: the octagonal toll house, embattled, with its cottage
     building.shp-park-cafe        a gritstone park cafe with a serving hatch, its awning and the tables out front
     structure.shp-bandstand       Weston Park's octagonal bandstand: cast-iron columns, an ogee roof and finial
     structure.shp-gate-piers      stone gate piers with ball finials and iron gates (v0), a railed dwarf wall (v1, v2)
     structure.shp-stepping-stone  a squared gritstone stepping stone, wet at its foot (4 variants)
     structure.shp-weir            a low stone weir across a brook, white water spilling over (animated)
     plant.shp-border              a herbaceous border clump: tulips, then delphiniums and roses, asters, winter seedheads
     vehicle.shp-bus               a Yorkshire double-decker in two plain liveries (no operator marks)
   Ground metres: x to the right of the view axis, d forward.
   ============================================================ */
const SCENE_SHP = Object.freeze({
  /** A seeded LCG. */
  rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); },
  /** The camera's projection: [X, Y] of ground (x, d) at height h. */
  proj(cam) { const f = 800 / Math.tan(cam.fov * Math.PI / 360), x0 = cam.x0 || 800; return { f, p: (x, d, h) => [x0 + f * x / d, cam.horizon + f * (cam.eye - (h || 0)) / d] }; },
  /** A closed Catmull-Rom loop through [x, d] points with a seeded wobble growing with depth (natural edges). */
  loop(pts, step, wob, seed) {
    const R2 = v => Math.round(v * 100) / 100, r = SCENE_SHP.rnd(seed), out = [], n = pts.length;
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
  },
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
  /** Two banks of a stream along a centreline of [x, d, width] points -> a closed polygon (left bank out, right bank back). */
  stream(pts, seed) {
    const r = SCENE_SHP.rnd(seed), L = [], Rt = [], R2 = v => Math.round(v * 100) / 100;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], td = b[1] - a[1], m = Math.hypot(tx, td) || 1;
      const nx = -td / m, nd = tx / m, w = pts[i][2] / 2;
      L.push([R2(pts[i][0] + nx * w * (0.9 + r() * 0.2)), R2(pts[i][1] + nd * w * (0.9 + r() * 0.2))]);
      Rt.push([R2(pts[i][0] - nx * w * (0.9 + r() * 0.2)), R2(pts[i][1] - nd * w * (0.9 + r() * 0.2))]);
    }
    return L.concat(Rt.reverse());
  },
  /** A far skyline of hills as one filled path (screen units): a smooth ridge through [X, Y] control points, with seeded
   *  small bumps (walls, trees, rocks) every few units; closed down to `foot`. */
  ridge(pts, foot, seed, bump) {
    const R1 = v => Math.round(v * 10) / 10, r = SCENE_SHP.rnd(seed);
    let d = `M-170 ${foot}L${R1(pts[0][0])} ${R1(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(2, Math.round((x1 - x0) / 9));
      for (let j = 1; j <= n; j++) { const t = j / n, s = (1 - Math.cos(t * Math.PI)) / 2, b = bump ? (r() - 0.5) * bump : 0; d += `L${R1(x0 + (x1 - x0) * t)} ${R1(y0 + (y1 - y0) * s + b)}`; }
    }
    return d + `L1770 ${foot}Z`;
  },
  /** A far treeline as one filled path (screen units): lobed crowns between base and base - h. */
  trees(base, seed, hMin, hMax, foot, x0, x1) {
    const R1 = v => Math.round(v * 10) / 10, r = SCENE_SHP.rnd(seed);
    x0 = x0 == null ? -170 : x0; x1 = x1 == null ? 1770 : x1;
    let d = `M${x0} ${foot}V${base}`, x = x0;
    while (x < x1) {
      const w = 12 + r() * 34, h = hMin + Math.pow(r(), 1.4) * (hMax - hMin), y1 = base - h;
      d += `Q${R1(x + w * 0.05)} ${R1(y1 - h * 0.2)} ${R1(x + w * 0.5)} ${R1(y1 - h * 0.28)}Q${R1(x + w * 0.95)} ${R1(y1 - h * 0.18)} ${R1(x + w)} ${R1(base - h * (0.35 + r() * 0.45))}`;
      x += w * (0.62 + r() * 0.3);
    }
    return d + `L${x1} ${base}V${foot}Z`;
  },
});

(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1, rect = SD.rect, ell = SD.ell, circ = SD.circ, poly = SD.poly;
  const R = v => Math.round(v * 10) / 10;
  const SNOW = '#eef2f6';
  const define = def => SD.define(Object.assign({ seasonal: true, shapeBySeason: true }, def));
  const wash = (cx, cy, r, d, op, col) => ({ f: { rad: [[0, col || '@flood', op], [1, col || '@flood', 0]], cx, cy, r }, d });
  /** Stone coursing lines over a wall from x0 to x1 between y0 (top) and y1 (foot), every `step`, with staggered perpends. */
  const coursing = (r, x0, x1, y0, y1, step, perp) => {
    let d = '';
    for (let y = y1 - step, k = 0; y > y0 + 1; y -= step, k++) {
      d += `M${f1(x0)} ${f1(y)}H${f1(x1)}`;
      if (perp) for (let x = x0 + (k % 2 ? perp / 2 : 0) + r() * 3; x < x1 - 2; x += perp * (0.7 + r() * 0.6)) d += `M${f1(x)} ${f1(y)}v${f1(step)}`;
    }
    return d;
  };
  /** The seasonal greens at the foot of a building (shrubs and a strip of grass), palette slot veg (VEG below). */
  const VEG = { spring: { veg: ['#6f9a4a', '#4f7a36', '#9cc06a'] }, summer: { veg: ['#4a7a34', '#365e28', '#74a04a'] }, autumn: { veg: ['#a07a36', '#7a5628', '#c89a48'] }, winter: { veg: ['#6a705e', '#4e5648', '#8a8e7e'] } };
  const withVeg = pal => { const o = Object.assign({}, pal); for (const k of ['spring', 'summer', 'autumn', 'winter']) o[k] = Object.assign({}, VEG[k], pal[k] || {}); return o; };
  const foot = (b, r, x0, x1, h) => {
    h = h || 5; b.push(['@veg.1', rect(x0, -h, x1 - x0, h)]);
    for (let x = x0 + 6; x < x1 - 6; x += 16 + r() * 22) { const w = 8 + r() * 10; b.push(['@veg.' + (r() < 0.5 ? 0 : 2), SD.blob(r, x, -h - w * 0.35, w, w * 0.65, 7, 0.35)]); }
  };
  /** Window cells [[x, y, w, h]] spread over n glow groups (a seeded share lit at dusk). */
  const glowCells = (b, r, cells, n, slot, extra) => {
    const g = SD.winGroups ? SD.winGroups(r, cells, n) : [cells.map(c => rect(...c)).join('')];
    for (const d of g) if (d) b.push(Object.assign({ f: slot, d, glow: 'window' }, extra || {}));
  };

  /* =======================================================================================
     landmark.shp-pavilions: the Botanical Gardens' glass pavilions (B. B. Taylor, 1836; restored 2003). Three pavilions on
     a raised stone terrace, each a tall glazed front between stone piers under a cornice, and a curvilinear glass roof
     springing from it: the middle one the largest, its bell roof rising to a ridge lantern; low glazed linking houses
     between them under gently curved roofs. Inside: palms, tree ferns, climbers. The glass lights warm at dusk.
     ======================================================================================= */
  define({
    id: 'landmark.shp-pavilions', category: 'landmark', size: [1000, 190], variants: 1, flippable: false,
    real: { h: 15, l: 96, w: 14 },
    palette: withVeg({
      base: { stone: ['#d6c8a6', '#b8a882', '#8e7f60', '#eadfc4'], glass: ['#8eaab4', '#c4d8de', '#5e7a86', '#e6f0f0'], frame: ['#f0f0ea', '#c8ccc6', '#7e8a88'],
        plant: ['#2e6a3a', '#4a8a46', '#1e4a2a', '#7aa85a'], palm: ['#2a5a32', '#3e7a40'], flood: '#ffe2a6', dark: ['#3a4448'] },
      winter: { plant: ['#2a5a34', '#3e7440', '#1a4026', '#6a9450'] },
    }),
    night: { glow: { window: '#ffe2a0', lamp: '#ffe8b8' }, on: 0.9 },
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.25, 1], period: 7 } },
    shadow: { rx: 480, ry: 14, h: 150 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'botanical gardens', 'glasshouse', 'pavilion', 'kit:temperate', 'class:landmark'],
    credit: 'drawn for the Sheffield parks views: the Botanical Gardens pavilions (stylised, from photographs)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [], glint = [], lit = [];
      const T = -14;   // the terrace top (the pavilions stand on it)
      // the terrace: a long ashlar plinth, its coping and the steps down to the lawn in front of each pavilion
      b.push(['@stone.1', rect(-500, T, 1000, 14)], ['@stone.3', rect(-504, T - 3, 1008, 4)], { detail: true, s: '@stone.2', w: 0.7, op: 0.5, d: coursing(r, -500, 500, T, 0, 5, 26) });
      // the pavilions [centre, half width, glazed wall height, roof rise] and the linking houses between them
      const P = [[-345, 92, 62, 48], [0, 118, 74, 90], [345, 92, 62, 48]];
      const links = [[-253, -118, 50, 16], [118, 253, 50, 16]];
      // a glazed wall with stone piers, cornice and a dark plinth; plants seen through the glass; returns the glass cells
      const wall = (x0, x1, H, piers, big) => {
        const top = T - H;
        b.push({ f: { lin: [[0, '@glass.1'], [0.55, '@glass.0'], [1, '@glass.2']], x1: 0, y1: top, x2: 0, y2: T }, d: rect(x0, top, x1 - x0, H) });
        // the planting inside, lit at dusk with the glass
        const n = Math.round((x1 - x0) / 18);
        for (let i = 0; i < n; i++) { const x = x0 + 8 + (i + r() * 0.6) * (x1 - x0 - 16) / n, hh = H * (0.3 + r() * 0.5); b.push({ f: '@plant.' + (i % 4), d: SD.blob(r, x, T - hh * 0.55, 7 + r() * 8, hh * 0.45, 7, 0.45), op: 0.75, detail: true }); }
        if (big) for (const px of [x0 + (x1 - x0) * 0.3, x0 + (x1 - x0) * 0.68]) {
          // a palm through the glass: a stem and a crown of fronds
          const top2 = T - H * 0.95;
          b.push({ detail: true, s: '@palm.0', w: 3, d: `M${f1(px)} ${T}Q${f1(px + 4)} ${f1(T - H * 0.5)} ${f1(px + 2)} ${f1(top2)}`, op: 0.8 });
          let fr = ''; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.48, L = 18 + r() * 10; fr += SD.leaf(px + 2, top2, a, L, 4); }
          b.push({ f: '@palm.1', d: fr, op: 0.8, detail: true });
        }
        // the panes light at dusk, a seeded share of them (the bars and piers stay dark over them)
        const cells = [];
        for (let x = x0; x < x1 - 1; x += 14) if (r() < 0.85) cells.push([x + 0.5, top + 0.5, Math.min(13.2, x1 - x - 1), H - 8]);
        glowCells(b, r, cells, 3, '@glass.3', { op: 0.12 });
        // glazing bars: slim verticals every 7 units, two transoms
        let bars = '';
        for (let x = x0 + 7; x < x1; x += 7) bars += `M${f1(x)} ${f1(top)}V${T}`;
        for (const k of [0.38, 0.72]) bars += `M${f1(x0)} ${f1(top + H * k)}H${f1(x1)}`;
        b.push({ detail: true, s: '@frame.0', w: 0.9, d: bars, op: 0.9 });
        // stone piers (lit face left, shade right), each with a capital and a base
        const step = (x1 - x0) / piers;
        for (let i = 0; i <= piers; i++) {
          const x = x0 + i * step, w = (i === 0 || i === piers) ? 9 : 6;
          b.push(['@stone.0', rect(x - w / 2, top, w, H)], { f: '@stone.2', d: rect(x + w / 2 - 2, top, 2, H), op: 0.6 }, ['@stone.3', rect(x - w / 2 - 1.5, top, w + 3, 3)], ['@stone.1', rect(x - w / 2 - 1, T - 4, w + 2, 4)]);
        }
        // the entablature: architrave, frieze and a cornice that steps out
        b.push(['@stone.0', rect(x0 - 4, top - 9, x1 - x0 + 8, 9)], ['@stone.3', rect(x0 - 6, top - 12, x1 - x0 + 12, 3.4)], { f: '@stone.2', d: rect(x0 - 4, top - 1.6, x1 - x0 + 8, 1.6), op: 0.7 });
        // the low stone dado under the glass
        b.push(['@stone.1', rect(x0, T - 7, x1 - x0, 7)]);
        glint.push({ f: '#ffffff', d: `M${f1(x0 + 10)} ${f1(top + 4)}l9 0l-16 ${f1(H * 0.5)}l-9 0z`, op: 0.28 });
        return top - 12;
      };
      // a curvilinear glass roof from the cornice line: a bell section across, glazing ribs converging, purlins
      const roof = (cx, hw, y0, rise, lantern) => {
        const prof = []; for (let i = 0; i <= 24; i++) { const t = -1 + i / 12, u = Math.abs(t); prof.push([cx + t * hw, y0 - rise * Math.pow(1 - u * u, 0.62) * (1 - 0.08 * u)]); }
        const outline = 'M' + prof.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
        b.push({ f: { lin: [[0, '@glass.3'], [0.4, '@glass.1'], [1, '@glass.0']], x1: cx - hw * 0.6, y1: y0 - rise, x2: cx + hw * 0.4, y2: y0 }, d: outline });
        b.push({ f: '@glass.2', d: 'M' + prof.slice(12).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + `L${f1(cx)} ${f1(y0)}z`, op: 0.28 });
        // ribs: from the eaves to the crown, the outer ones following the curve
        let ribs = '';
        for (let k = -6; k <= 6; k++) { const t = k / 6.5, x = cx + t * hw, u = Math.abs(t), yt = y0 - rise * Math.pow(1 - u * u, 0.62) * (1 - 0.08 * u); ribs += `M${f1(x)} ${f1(y0)}Q${f1(x + (cx - x) * 0.1)} ${f1((y0 + yt) / 2)} ${f1(x + (cx - x) * 0.04)} ${f1(yt)}`; }
        b.push({ detail: true, s: '@frame.0', w: 1.1, d: ribs, op: 0.95 });
        // purlins: curved bands round the roof
        let pur = '';
        for (const q of [0.25, 0.5, 0.72, 0.88]) { const yy = y0 - rise * q, ww = hw * Math.sqrt(Math.max(0, 1 - Math.pow(q / (1 - 0.0), 1 / 0.62))) * 1.0; pur += `M${f1(cx - ww)} ${f1(yy + 2)}Q${f1(cx)} ${f1(yy - 3)} ${f1(cx + ww)} ${f1(yy + 2)}`; }
        b.push({ detail: true, s: '@frame.1', w: 0.8, d: pur, op: 0.8 });
        b.push({ detail: true, s: '@frame.0', w: 2, d: 'M' + prof.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') });
        if (lantern) {
          // the ridge lantern and its finial
          const ly = y0 - rise;
          b.push(['@frame.1', rect(cx - 14, ly - 10, 28, 11)], { f: '@glass.1', d: rect(cx - 12, ly - 9, 24, 8), glow: 'window' }, ['@frame.0', `M${cx - 17} ${f1(ly - 10)}Q${cx} ${f1(ly - 22)} ${cx + 17} ${f1(ly - 10)}z`], ['@frame.2', rect(cx - 1, ly - 30, 2, 10)], ['@frame.0', circ(cx, ly - 31, 2.4)]);
        }
        glint.push({ f: '#ffffff', d: `M${f1(cx - hw * 0.55)} ${f1(y0 - rise * 0.5)}q${f1(hw * 0.2)} ${f1(-rise * 0.35)} ${f1(hw * 0.5)} ${f1(-rise * 0.45)}l2 4q${f1(-hw * 0.3)} ${f1(rise * 0.12)} ${f1(-hw * 0.44)} ${f1(rise * 0.45)}z`, op: 0.35 });
        if (season === 'winter') b.push({ f: SNOW, d: 'M' + prof.slice(5, 20).map(p => f1(p[0]) + ' ' + f1(p[1] - 1.5)).join('L') + 'L' + prof.slice(5, 20).reverse().map(p => f1(p[0]) + ' ' + f1(p[1] + 3.5)).join('L') + 'z', op: 0.85 });
      };
      // the linking houses first (they stand back a little), then the pavilions
      for (const [x0, x1, H, rise] of links) {
        const y0 = wall(x0, x1, H, 6, false);
        const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 + 4;
        b.push({ f: { lin: [[0, '@glass.3'], [1, '@glass.0']], x1: 0, y1: y0 - rise, x2: 0, y2: y0 }, d: `M${f1(cx - hw)} ${f1(y0)}Q${f1(cx - hw * 0.8)} ${f1(y0 - rise * 1.2)} ${f1(cx)} ${f1(y0 - rise)}Q${f1(cx + hw * 0.8)} ${f1(y0 - rise * 1.2)} ${f1(cx + hw)} ${f1(y0)}z` });
        let rb = ''; for (let x = cx - hw + 8; x < cx + hw; x += 8) rb += `M${f1(x)} ${f1(y0)}l0 ${f1(-rise * 0.8)}`;
        b.push({ detail: true, s: '@frame.0', w: 0.8, d: rb, op: 0.8 });
        if (season === 'winter') b.push({ f: SNOW, d: `M${f1(cx - hw * 0.8)} ${f1(y0 - rise * 0.75)}Q${f1(cx)} ${f1(y0 - rise * 1.2)} ${f1(cx + hw * 0.8)} ${f1(y0 - rise * 0.75)}l0 3Q${f1(cx)} ${f1(y0 - rise * 0.95)} ${f1(cx - hw * 0.8)} ${f1(y0 - rise * 0.7)}z`, op: 0.85 });
      }
      P.forEach(([cx, hw, H, rise], i) => {
        const y0 = wall(cx - hw, cx + hw, H, i === 1 ? 10 : 8, true);
        roof(cx, hw + 6, y0, rise, i === 1);
        // the doorway at the centre of each pavilion: a taller bay, double glazed doors, a lamp over them
        b.push(['@stone.0', rect(cx - 14, T - H, 28, H)], { f: '@dark.0', d: rect(cx - 10, T - 36, 20, 36) }, { f: '@glass.1', d: rect(cx - 8.6, T - 34, 7.6, 32) + rect(cx + 1, T - 34, 7.6, 32), glow: 'window' });
        b.push(['@stone.3', `M${cx - 16} ${T - 36}h32l-4 -6h-24z`]);
        // the steps down from the terrace to the lawn
        for (let k = 0; k < 3; k++) b.push([k % 2 ? '@stone.1' : '@stone.3', rect(cx - 30 - k * 6, T + 2 + k * 4, 60 + k * 12, 4)]);
        lit.push(wash(cx, T, 50, rect(cx - 50, T - 30, 100, 44), 0.35));
      });
      foot(b, r, -500, 500, 3);
      // urns on the terrace coping between the pavilions
      for (const x of [-440, -253, -118, 118, 253, 440]) b.push(['@stone.0', `M${x - 5} ${T - 3}h10l-2 -3h-6zM${x - 6} ${T - 6}q6 -14 12 0z`], { f: '@stone.2', d: `M${x + 1} ${T - 6}q3 -9 5 0z`, op: 0.6 });
      return { body: b, glint, lit };
    },
  });

  /* =======================================================================================
     landmark.shp-weston-museum: Weston Park Museum seen from the park, the Mappin gallery front (1887): a long sandstone
     front, a recessed loggia of six Ionic columns at its centre between two end pavilions with pilasters and blind panels,
     a full entablature and a balustraded attic, a flight of steps. Sheffield sandstone weathered dark in its joints.
     ======================================================================================= */
  define({
    id: 'landmark.shp-weston-museum', category: 'landmark', size: [640, 220], variants: 1, flippable: false,
    real: { h: 16, l: 52, w: 20 },
    palette: withVeg({
      base: { stone: ['#cbb894', '#a8946e', '#7a6a4c', '#e2d4b2'], roof: ['#5a5e62', '#3e4246'], glass: ['#2e3a40', '#5a6a72'], flood: '#ffe0a8' },
      winter: { stone: ['#c4b494', '#a08e6c', '#76664a', '#dccfae'] },
    }),
    night: { glow: { window: '#ffdc94', lamp: '#ffe8b8' }, on: 0.8 },
    parts: ['body', 'lit'],
    shadow: { rx: 300, ry: 12, h: 200 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'museum', 'gallery', 'classical', 'kit:urban', 'class:landmark'],
    credit: 'drawn for the Sheffield parks views: Weston Park Museum, the gallery front (stylised)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [], lit = [];
      const W = 300, base = -16, top = -170;
      // the plinth and steps
      b.push(['@stone.1', rect(-W - 6, base, 2 * W + 12, 16)], { detail: true, s: '@stone.2', w: 0.6, op: 0.5, d: coursing(r, -W - 6, W + 6, base, 0, 5, 30) });
      for (let k = 0; k < 4; k++) b.push([k % 2 ? '@stone.1' : '@stone.3', rect(-110 - k * 8, base + k * 4, 220 + k * 16, 4)]);
      // the main block, ashlar coursing, a lit face to the left and the shadowed right return
      b.push({ f: { lin: [[0, '@stone.3'], [0.5, '@stone.0'], [1, '@stone.1']], x1: -W, y1: 0, x2: W, y2: 0 }, d: rect(-W, top, 2 * W, base - top) });
      b.push({ detail: true, s: '@stone.2', w: 0.55, op: 0.4, d: coursing(r, -W, W, top, base, 8, 34) });
      // the end pavilions: pilasters, a blind panel with an aedicule (a niche, no statue), a window below
      for (const sx of [-1, 1]) {
        const x0 = sx < 0 ? -W : W - 150, x1 = x0 + 150;
        b.push({ f: '@stone.3', d: rect(x0, top - 6, 150, base - top + 6), op: 0.35 });
        for (const px of [x0 + 6, x0 + 40, x1 - 46, x1 - 12]) b.push(['@stone.0', rect(px, top + 8, 7, base - top - 8)], { f: '@stone.2', d: rect(px + 5, top + 8, 2, base - top - 8), op: 0.55 });
        const cx = (x0 + x1) / 2;
        b.push({ f: '@stone.2', d: rect(cx - 26, top + 34, 52, 64), op: 0.35 }, ['@stone.3', `M${cx - 32} ${top + 34}h64l-32 -16z`], { f: '@stone.2', d: `M${cx - 14} ${top + 92}V${top + 58}q14 -18 28 0V${top + 92}z`, op: 0.6 });
        glowCells(b, r, [[cx - 16, top + 112, 32, 26]], 1, '@glass.0');
        b.push({ detail: true, s: '@stone.3', w: 2, d: `M${cx - 18} ${top + 140}h36` });
      }
      // the loggia: a dark recess, six Ionic columns (shaft, entasis shading, volutes), doors and windows behind
      const lx0 = -150, lx1 = 150;
      b.push({ f: '@stone.2', d: rect(lx0, top + 30, lx1 - lx0, base - top - 30) }, { f: '@glass.0', d: rect(lx0 + 6, top + 36, lx1 - lx0 - 12, 4), op: 0.4 });
      const cells = [];
      for (let i = 0; i < 5; i++) { const x = lx0 + 16 + i * 56; cells.push([x + 8, top + 62, 26, 36], [x + 8, top + 108, 26, base - top - 112]); }
      glowCells(b, r, cells, 3, '@glass.1');
      for (let i = 0; i < 6; i++) {
        const x = lx0 + 6 + i * 56.5, w = 15;
        b.push(['@stone.3', rect(x, top + 38, w, base - top - 42)], { f: '@stone.1', d: rect(x + w - 5, top + 38, 5, base - top - 42), op: 0.8 });
        let fl = ''; for (let k = 3; k < w - 2; k += 3) fl += `M${x + k} ${top + 42}V${base - 6}`;
        b.push({ detail: true, s: '@stone.1', w: 0.6, d: fl, op: 0.5 }, ['@stone.0', rect(x - 3, base - 6, w + 6, 6)]);
        b.push(['@stone.0', rect(x - 4, top + 32, w + 8, 6)], ['@stone.3', ell(x - 2, top + 36, 4, 4) + ell(x + w + 2, top + 36, 4, 4)], { detail: true, s: '@stone.2', w: 0.8, d: `M${x - 2} ${top + 36}m-2 0a2 2 0 1 0 4 0M${x + w + 2} ${top + 36}m-2 0a2 2 0 1 0 4 0`, op: 0.7 });
      }
      // the entablature right across, the attic with its balustrade, the roof behind
      b.push(['@stone.3', rect(-W - 4, top, 2 * W + 8, 10)], ['@stone.0', rect(-W - 4, top + 10, 2 * W + 8, 18)], { f: '@stone.2', d: rect(-W - 4, top + 26, 2 * W + 8, 2), op: 0.7 });
      let dent = ''; for (let x = -W; x < W; x += 6) dent += rect(x, top + 10, 3, 3);
      b.push({ f: '@stone.2', d: dent, op: 0.55 }, ['@stone.3', rect(-W - 8, top - 4, 2 * W + 16, 5)]);
      b.push(['@roof.1', `M${-W + 20} ${top - 30}L${-W + 50} ${top - 46}H${W - 50}L${W - 20} ${top - 30}z`]);
      b.push(['@stone.0', rect(-W, top - 30, 2 * W, 26)], ['@stone.3', rect(-W - 3, top - 33, 2 * W + 6, 4)]);
      let bal = ''; for (let x = -W + 10; x < W - 6; x += 9) bal += `M${x} ${top - 8}q-3 -5 0 -9q3 -2 0 -7`;
      b.push({ detail: true, s: '@stone.2', w: 3, d: bal, op: 0.7 }, ['@stone.1', rect(-W, top - 8, 2 * W, 4)]);
      for (const x of [-W, -150, 150, W - 14]) b.push(['@stone.0', rect(x, top - 32, 14, 28)]);
      if (season === 'winter') b.push({ f: SNOW, d: rect(-W - 3, top - 36, 2 * W + 6, 3) + `M${-W + 50} ${top - 46}H${W - 50}l-6 6H${-W + 56}z` + rect(-W - 8, top - 6, 2 * W + 16, 2), op: 0.9 });
      foot(b, r, -W - 6, -140, 6); foot(b, r, 140, W + 6, 6);
      // lamps either side of the steps
      for (const x of [-124, 124]) b.push(['@roof.1', rect(x - 1.5, base - 30, 3, 30)], { f: '@glass.1', d: rect(x - 5, base - 40, 10, 10), glow: 'window' });
      lit.push(wash(0, base - 60, 220, rect(-W, top, 2 * W, base - top), 0.38), wash(0, base, 140, rect(-160, base - 80, 320, 80), 0.4));
      return { body: b, lit };
    },
  });

  /* =======================================================================================
     landmark.shp-firth-court: the University of Sheffield's Firth Court (1905, E. M. Gibbs): red brick with buff stone
     dressings, a four-storey gate tower with the entrance arch and a canted oriel, octagonal corner turrets under ogee lead
     caps, mullioned and transomed windows, shaped gables on the ranges either side, a stone parapet.
     ======================================================================================= */
  define({
    id: 'landmark.shp-firth-court', category: 'landmark', size: [720, 300], variants: 1, flippable: false,
    real: { h: 24, l: 66, w: 16 },
    palette: withVeg({
      base: { brick: ['#a4503a', '#86402e', '#c06a4e', '#6a3022'], stone: ['#dccaa0', '#b8a47c', '#8a7a58'], roof: ['#4a4e56', '#33363c', '#5a6a6e'],
        lead: ['#6e7a7c', '#4e585a', '#9aa8a8'], glass: ['#2a343c', '#4e5e68'], flood: '#ffe0a8' },
    }),
    night: { glow: { window: '#ffd98a', lamp: '#ffe6a8' }, on: 0.8 },
    parts: ['body', 'lit'],
    shadow: { rx: 340, ry: 12, h: 260 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'university', 'red brick', 'tower', 'kit:urban', 'class:landmark'],
    credit: 'drawn for the Sheffield parks views: Firth Court, University of Sheffield (stylised, no lettering or arms)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [], lit = [];
      const cells = [];
      /** a mullioned and transomed window: stone surround, lights split by mullions, a transom */
      const win = (x, y, w, h, lights) => {
        b.push(['@stone.0', rect(x - 2.5, y - 2.5, w + 5, h + 5)]);
        cells.push([x, y, w, h]);
        let m = ''; for (let i = 1; i < lights; i++) m += `M${f1(x + i * w / lights)} ${y}v${h}`;
        if (h > 18) m += `M${x} ${f1(y + h * 0.33)}h${w}`;
        return m;
      };
      let mull = '';
      // the ranges either side: three storeys with shaped gables
      for (const sx of [-1, 1]) {
        const x0 = sx < 0 ? -350 : 70, x1 = sx < 0 ? -70 : 350, top = -150;
        b.push({ f: { lin: [[0, '@brick.2'], [0.5, '@brick.0'], [1, '@brick.1']], x1: x0, y1: 0, x2: x1, y2: 0 }, d: rect(x0, top, x1 - x0, 150) });
        let crs = ''; for (let y = -6; y > top; y -= 6) crs += `M${x0} ${y}H${x1}`;
        b.push({ detail: true, s: '@brick.3', w: 0.4, op: 0.35, d: crs });
        // string courses
        for (const y of [-52, -100, top]) b.push(['@stone.0', rect(x0 - 2, y - 3, x1 - x0 + 4, 4)]);
        // shaped gables (Dutch-ish), two per range
        for (const gx of [x0 + (x1 - x0) * 0.27, x0 + (x1 - x0) * 0.73]) {
          b.push(['@brick.0', `M${f1(gx - 40)} ${top}V${top - 18}q8 0 10 -10q2 -12 10 -14V${top - 54}h40v12q8 2 10 14q2 10 10 10V${top}z`]);
          b.push(['@stone.0', `M${f1(gx - 42)} ${top - 18}h6q8 0 10 -10q2 -12 10 -14V${top - 56}h44v14q8 2 10 14q2 10 10 10h6v3h-8q-8 0-10 -10q-3-12-11-14V${top - 53}h-38v12q-8 2-11 14q-2 10-10 10h-8z`]);
          mull += win(gx - 10, top - 44, 20, 22, 2);
          if (season === 'winter') b.push({ f: SNOW, d: rect(gx - 22, top - 58, 44, 3), op: 0.9 });
        }
        // the roof behind the parapet
        b.push(['@roof.1', `M${x0 + 4} ${top - 3}L${x0 + 20} ${top - 26}H${x1 - 20}L${x1 - 4} ${top - 3}z`]);
        if (season === 'winter') b.push({ f: SNOW, d: `M${x0 + 18} ${top - 24}H${x1 - 18}l-3 5H${x0 + 21}z`, op: 0.9 });
        b.push(['@stone.1', rect(x0 - 3, top - 6, x1 - x0 + 6, 6)]);
        // windows: three rows of three-light windows
        const n = 5, step = (x1 - x0) / n;
        for (let i = 0; i < n; i++) {
          const wx = x0 + i * step + step / 2 - 14;
          mull += win(wx, -44, 28, 30, 3) + win(wx, -92, 28, 32, 3) + win(wx, -140, 28, 30, 3);
        }
        // chimneys
        for (const cx of [x0 + 30, x1 - 34]) b.push(['@brick.1', rect(cx, top - 50, 12, 28)], ['@stone.0', rect(cx - 2, top - 52, 16, 4)]);
      }
      // the gate tower: four storeys, buttressed, the entrance arch, a canted oriel above, the parapet and turrets
      const tx0 = -70, tx1 = 70, tt = -232;
      b.push({ f: { lin: [[0, '@brick.2'], [0.45, '@brick.0'], [1, '@brick.1']], x1: tx0, y1: 0, x2: tx1, y2: 0 }, d: rect(tx0, tt, tx1 - tx0, -tt) });
      let crs = ''; for (let y = -6; y > tt; y -= 6) crs += `M${tx0} ${y}H${tx1}`;
      b.push({ detail: true, s: '@brick.3', w: 0.4, op: 0.35, d: crs });
      for (const y of [-74, -134, -186]) b.push(['@stone.0', rect(tx0 - 2, y, tx1 - tx0 + 4, 4)]);
      // the entrance: a four-centred stone arch, a dark passage, the doors
      b.push(['@stone.0', `M-30 0V-46Q-30 -66 0 -70Q30 -66 30 -46V0z`], ['@glass.0', `M-22 0V-44Q-22 -60 0 -62Q22 -60 22 -44V0z`], { f: '@glass.1', d: rect(-16, -40, 32, 40), op: 0.6, glow: 'window' });
      // the oriel: a canted bay of lights over the arch, corbelled out
      b.push(['@stone.1', `M-36 -78h72l-10 -10h-52z`], ['@stone.0', rect(-36, -132, 72, 54)]);
      mull += win(-30, -126, 60, 42, 5);
      b.push({ f: '@stone.2', d: rect(22, -132, 14, 54), op: 0.35 });
      mull += win(-24, -178, 48, 34, 4);
      // the top stage: twin lancets and a crenellated parapet
      mull += win(-30, -222, 22, 28, 2) + win(8, -222, 22, 28, 2);
      let cren = ''; for (let x = tx0 - 4; x < tx1 + 2; x += 12) cren += rect(x, tt - 10, 7, 10);
      b.push(['@stone.0', rect(tx0 - 4, tt - 3, tx1 - tx0 + 8, 5)], ['@stone.0', cren]);
      if (season === 'winter') b.push({ f: SNOW, d: rect(tx0 - 4, tt - 4, tx1 - tx0 + 8, 2), op: 0.9 });
      // the octagonal turrets at the tower's corners, each with an ogee lead cap and a finial
      for (const cx of [tx0 - 4, tx1 + 4]) {
        const w = 22, top = tt - 30;
        b.push(['@brick.0', rect(cx - w / 2, top, w, -top)], { f: '@brick.1', d: rect(cx + w / 2 - 7, top, 7, -top), op: 0.7 }, { f: '@brick.2', d: rect(cx - w / 2, top, 5, -top), op: 0.5 });
        for (const y of [-74, -134, -186, top + 8]) b.push(['@stone.0', rect(cx - w / 2 - 1, y, w + 2, 4)]);
        mull += win(cx - 3, -110, 6, 18, 1) + win(cx - 3, -168, 6, 16, 1) + win(cx - 3, top + 16, 6, 14, 1);
        b.push(['@lead.0', `M${cx - w / 2 - 2} ${top}C${cx - w / 2 - 4} ${top - 14} ${cx - 2} ${top - 18} ${cx - 1} ${top - 34}h2C${cx + 2} ${top - 18} ${cx + w / 2 + 4} ${top - 14} ${cx + w / 2 + 2} ${top}z`]);
        b.push({ f: '@lead.2', d: `M${cx - w / 2} ${top - 2}C${cx - w / 2 - 2} ${top - 12} ${cx - 4} ${top - 18} ${cx - 1} ${top - 30}C${cx - 6} ${top - 16} ${cx - w / 2 + 2} ${top - 12} ${cx - w / 2 + 4} ${top - 2}z`, op: 0.6 });
        b.push(['@lead.1', rect(cx - 0.8, top - 46, 1.6, 14)], ['@lead.1', circ(cx, top - 47, 2)]);
        if (season === 'winter') b.push({ f: SNOW, d: `M${cx - w / 2} ${top - 3}C${cx - w / 2 - 2} ${top - 10} ${cx - 6} ${top - 14} ${cx - 4} ${top - 18}l3 2C${cx - 5} ${top - 12} ${cx - w / 2 + 2} ${top - 9} ${cx - w / 2 + 3} ${top - 2}z`, op: 0.85 });
      }
      foot(b, r, -356, -36, 5); foot(b, r, 36, 356, 5);
      let ivy = ''; for (let i = 0; i < 26; i++) ivy += SD.blob(r, -340 + r() * 40, -10 - r() * 120, 6 + r() * 6, 5 + r() * 4, 6, 0.4);
      b.push({ f: '@veg.1', d: ivy, op: 0.9 });
      glowCells(b, r, cells, 4, '@glass.0');
      let refl = ''; for (const [x, y, w, h] of cells) refl += rect(x + 1, y + 1, w * 0.3, h * 0.35);
      b.push({ f: '@glass.1', d: refl, op: 0.4 }, { detail: true, s: '@stone.0', w: 1.6, d: mull });
      lit.push(wash(0, -60, 120, rect(-60, -140, 120, 140), 0.4), wash(0, -10, 80, rect(-50, -80, 100, 80), 0.5));
      return { body: b, lit };
    },
  });

  /* =======================================================================================
     landmark.shp-round-house: the Round House at Ringinglow (1778), the octagonal turnpike toll house at the crossroads on
     the edge of the moor: three storeys of gritstone, three faces seen, small windows with stone heads, an embattled
     parapet, a central chimney stack; a lower stone cottage built on behind (v0 seen from the city side).
     ======================================================================================= */
  define({
    id: 'landmark.shp-round-house', category: 'landmark', size: [300, 230], variants: 1, flippable: false,
    real: { h: 12, l: 15, w: 8 },
    palette: withVeg({
      base: { grit: ['#9a8a6a', '#7a6c52', '#5a503e', '#b4a684'], roof: ['#4e4a44', '#3a3632', '#6a645a'], glass: ['#2a3034', '#4e5a60'], door: '#3a4a3e', flood: '#ffdca0',
        moss: ['#6a7a3a', '#4e5e2e'] },
      winter: { moss: ['#7a7a5a', '#5e5e46'] },
    }),
    night: { glow: { window: '#ffd98a', lamp: '#ffe6a8' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 130, ry: 10, h: 200 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'peak', 'toll house', 'gritstone', 'kit:temperate', 'class:landmark'],
    credit: 'drawn for the Sheffield parks views: the Round House, Ringinglow (stylised)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [], lit = [], cells = [];
      const H = 182, a = 40, side = 26;   // the front face half-width, the side faces' projected width
      // the cottage behind, to the right: a long low gritstone range with a stone-slate roof and two chimneys
      b.push(['@grit.1', rect(40, -82, 110, 82)], { detail: true, s: '@grit.2', w: 0.6, op: 0.5, d: coursing(r, 40, 150, -82, 0, 7, 18) });
      b.push(['@roof.0', 'M34 -80L60 -112H140L156 -80z'], { f: '@roof.2', d: 'M34 -80L60 -112H70L44 -80z', op: 0.6 });
      b.push(['@grit.2', rect(76, -126, 12, 18)], ['@grit.2', rect(132, -122, 12, 14)]);
      cells.push([100, -60, 16, 20], [126, -60, 16, 20]);
      b.push({ f: '@door', d: rect(64, -40, 16, 40) });
      if (season === 'winter') b.push({ f: SNOW, d: 'M60 -112H140l3 4H57z', op: 0.9 });
      // the octagon: the left face (lit), the front face, the right face (in shade)
      const faces = [[-a - side, -a, '@grit.3'], [-a, a, '@grit.0'], [a, a + side, '@grit.2']];
      for (const [x0, x1, f] of faces) {
        b.push([f, rect(x0, -H, x1 - x0, H)]);
        b.push({ detail: true, s: '@grit.2', w: 0.6, op: 0.5, d: coursing(r, x0, x1, -H, 0, 8, 16) });
        // quoins at the angles
        let q = ''; for (let y = -8, k = 0; y > -H; y -= 12, k++) q += rect(x1 - (k % 2 ? 5 : 8), y - 10, k % 2 ? 5 : 8, 10);
        b.push({ f: '@grit.3', d: q, op: 0.45 });
      }
      // storey bands, windows with stone heads and sills on each face, the door on the front
      for (const y of [-64, -128]) b.push(['@grit.3', rect(-a - side, y, 2 * (a + side), 4)]);
      for (const [x0, x1] of faces) {
        const cx = (x0 + x1) / 2, w = Math.min(18, (x1 - x0) * 0.5);
        for (const y of [-112, -176]) { cells.push([cx - w / 2, y, w, 26]); b.push(['@grit.3', rect(cx - w / 2 - 3, y - 4, w + 6, 4) + rect(cx - w / 2 - 2, y + 26, w + 4, 3)]); }
      }
      cells.push([-34, -48, 16, 22], [18, -48, 16, 22], [-a - side + 8, -48, 14, 20], [a + 8, -48, 14, 20]);
      b.push({ f: '@door', d: 'M-9 0V-44q9 -8 18 0V0z' }, ['@grit.3', 'M-12 -44q12 -12 24 0h-3q-9 -8 -18 0z']);
      glowCells(b, r, cells, 3, '@glass.0');
      let bars = ''; for (const [x, y, w, h] of cells) bars += `M${f1(x + w / 2)} ${y}v${h}M${x} ${f1(y + h / 2)}h${w}`;
      b.push({ detail: true, s: '@grit.3', w: 1.2, d: bars, op: 0.9 });
      // the angles of the octagon: dark arrises down each corner, the side faces' parapet stepping back
      b.push({ detail: true, s: '@grit.2', w: 2.2, d: `M${-a} 0V${-H}M${a} 0V${-H}`, op: 0.8 }, { f: '#000000', d: rect(a, -H, side, H), op: 0.3 }, { f: '#000000', d: rect(a + side * 0.55, -H, side * 0.45, H), op: 0.12 }, { f: '#ffffff', d: rect(-a - side, -H, side, H), op: 0.16 },
        // the far arrises of the side faces, so the eight-sided plan reads (a square tower otherwise)
        { detail: true, s: '@grit.2', w: 1.6, d: `M${-a - side} 0V${-H}M${a + side} 0V${-H}`, op: 0.9 });
      // the embattled parapet round the top
      b.push(['@grit.3', `M${-a - side - 3} ${-H + 2}L${-a} ${-H - 4}H${a}L${a + side + 3} ${-H + 2}V${-H + 6}L${a} ${-H + 1}H${-a}L${-a - side - 3} ${-H + 6}z`]);
      let cren = ''; for (let x = -a - side - 3; x < a + side; x += 13) cren += rect(x, -H - 16, 8, 12);
      b.push(['@grit.0', cren], { f: '@grit.2', d: cren, op: 0.25 });
      // the central chimney stack rising out of the roof behind the parapet
      b.push(['@grit.1', rect(-8, -H - 40, 16, 36)], ['@grit.3', rect(-10, -H - 42, 20, 4)], ['@roof.1', rect(-6, -H - 48, 4, 6) + rect(2, -H - 47, 4, 5)]);
      // through-stones and individual quoins, lintels; a drystone wall running off left with a gate and a stone stile
      for (const [x0, x1] of faces) for (let y = -20; y > -H + 10; y -= 24) b.push({ f: '@grit.3', d: rect(x1 - 7, y - 10, 7, 10), op: 0.55 }, { f: '@grit.2', d: rect(x0, y - 4, 4, 4), op: 0.35 });
      for (let i = 0; i < 9; i++) { const x = -150 + i * 9; b.push(['@grit.' + (i % 3 === 0 ? 1 : 2), SD.blob(r, x, -14 - (i % 2) * 3, 7, 6, 6, 0.3)]); }
      for (let i = 0; i < 8; i++) { const x = -146 + i * 10; b.push(['@grit.' + (i % 2 ? 3 : 1), SD.blob(r, x, -26, 6, 5, 6, 0.3)]); }
      b.push(['@grit.3', rect(-156, -36, 82, 5)], ['@roof.1', rect(-170, -40, 4, 40)], ['@grit.1', rect(-104, -18, 10, 18)]);
      // moss and weathering low on the walls
      b.push({ f: '@moss.0', d: `M${-a - side} 0V-10q20 -4 40 2q30 -6 60 0q20 -4 ${2 * (a + side) - 100} 2V0z`, op: 0.5 });
      foot(b, r, -a - side - 20, 160, 4);
      if (season === 'winter') b.push({ f: SNOW, d: cren.replace(/h8v12h-8z/g, 'h8v3h-8z') + rect(-a - side - 3, -H - 5, 2 * (a + side) + 6, 2), op: 0.9 });
      lit.push(wash(-10, -40, 80, rect(-a - side, -110, 2 * (a + side), 110), 0.35));
      return { body: b, lit };
    },
  });

  /* =======================================================================================
     building.shp-park-cafe: a park cafe in coursed gritstone with a stone-slate roof, a wide serving hatch under a striped
     awning (v0 green, v1 red), a glazed door, a menu board without words, picnic tables and a planter out front.
     ======================================================================================= */
  define({
    id: 'building.shp-park-cafe', category: 'building', size: [360, 160], variants: 2, flippable: true,
    real: { h: 6.2, l: 14, w: 7 },
    palette: withVeg({
      base: { grit: ['#a8987a', '#857660', '#5e5444', '#c4b694'], roof: ['#55524c', '#3e3c38', '#6e6a62'], glass: ['#2a3438', '#56666e'], awn: ['#2e6a4a', '#b83a32'],
        awn2: '#f2eee2', wood: ['#7a5a3a', '#5a4028'], flower: ['#d0503e', '#e8c040', '#c86aa0'], leaf: ['#4a7a34', '#365e28'], flood: '#ffdca0', board: '#2a2e2c' },
      autumn: { flower: ['#c8642c', '#d0a030', '#a04a3a'] }, winter: { flower: ['#7a6a5a', '#8a7a68', '#6a5a4a'], leaf: ['#5a6a4e', '#4a5440'] },
    }),
    night: { glow: { window: '#ffd690', lamp: '#ffe6a8' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 170, ry: 10, h: 130 }, reflect: true,
    tags: ['uk', 'uk-yorkshire', 'park', 'cafe', 'gritstone', 'signature', 'kit:temperate', 'kit:urban', 'role:building-near', 'class:building'],
    credit: 'drawn for the Sheffield parks views: a gritstone park cafe (no lettering)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [], lit = [];
      b.push({ f: { lin: [[0, '@grit.3'], [1, '@grit.1']], x1: -150, y1: 0, x2: 150, y2: 0 }, d: rect(-150, -96, 300, 96) });
      b.push({ detail: true, s: '@grit.2', w: 0.6, op: 0.5, d: coursing(r, -150, 150, -96, 0, 7, 20) });
      // the roof: stone slates in courses, a gable chimney
      b.push(['@roof.0', 'M-162 -94L-120 -146H120L162 -94z'], { f: '@roof.2', d: 'M-162 -94L-120 -146H-104L-146 -94z', op: 0.6 });
      let sl = ''; for (let y = -100; y > -146; y -= 7) { const k = (y + 94) / -52; sl += `M${f1(-162 + 42 * k)} ${y}H${f1(162 - 42 * k)}`; }
      b.push({ detail: true, s: '@roof.1', w: 0.8, d: sl, op: 0.6 }, ['@grit.1', rect(96, -164, 16, 30)], ['@grit.3', rect(94, -166, 20, 4)]);
      if (season === 'winter') b.push({ f: SNOW, d: 'M-158 -96L-120 -144H120L158 -96l-4 2L118 -138H-118L-154 -94z', op: 0.9 });
      // the serving hatch and its striped awning, the door, a window
      b.push({ f: '@glass.0', d: rect(-110, -70, 110, 40) }, { f: '@glass.1', d: rect(-106, -66, 102, 32), glow: 'window' }, ['@wood.0', rect(-114, -32, 118, 6)]);
      const ac = v ? '@awn.1' : '@awn.0';
      let st = ''; for (let x = -120; x < 10; x += 26) st += `M${x} -86h13l4 18h-13z`;
      b.push([ac, 'M-120 -86H10l8 18H-114z'], ['@awn2', st]);
      let sc = ''; for (let x = -114; x < 18; x += 13) sc += `M${x} -68q6.5 7 13 0`;
      b.push({ f: ac, d: sc + 'L-114 -68z' });
      b.push(['@grit.3', rect(26, -78, 40, 78)], { f: '@glass.0', d: rect(30, -74, 32, 74) }, { f: '@glass.1', d: rect(33, -70, 26, 40), glow: 'window' });
      b.push(['@grit.3', rect(86, -74, 44, 40)], { f: '@glass.1', d: rect(90, -70, 36, 32), glow: 'window' }, { detail: true, s: '@grit.3', w: 1.4, d: 'M108 -70v32M90 -54h36' });
      // a lamp by the door, the menu board (a plain dark board with chalk scribble lines, no letters)
      b.push({ f: '@glass.1', d: rect(68, -88, 8, 10), glow: 'window' }, ['@board', rect(-150, -54, 26, 40)], ['@wood.1', rect(-152, -56, 30, 3)], { detail: true, s: '#e8e4d8', w: 0.8, op: 0.5, d: 'M-146 -46h16M-146 -40h12M-146 -34h18M-146 -26h10' });
      foot(b, r, -160, -112, 4); foot(b, r, 70, 160, 4);
      // two picnic tables and a planter out front
      for (const tx of [-70, 50]) b.push(['@wood.0', rect(tx - 36, -26, 72, 5)], ['@wood.1', rect(tx - 44, -12, 88, 4)], { detail: true, s: '@wood.1', w: 3, d: `M${tx - 26} -22L${tx - 34} 0M${tx + 26} -22L${tx + 34} 0` });
      b.push(['@wood.1', rect(124, -22, 36, 22)]);
      for (let i = 0; i < 9; i++) b.push(['@leaf.' + (i % 2), SD.blob(r, 128 + i * 3.6, -26 - r() * 6, 6, 5, 6, 0.4)]);
      if (season !== 'winter') for (let i = 0; i < 12; i++) b.push({ f: '@flower.' + (i % 3), d: circ(128 + r() * 30, -30 - r() * 8, 1.8) });
      lit.push(wash(-50, -40, 130, rect(-150, -96, 300, 110), 0.4));
      return { body: b, lit };
    },
  });

  /* =======================================================================================
     structure.shp-bandstand: an octagonal Victorian bandstand on a stone base: slim cast-iron columns with brackets, a
     frieze of ironwork, an ogee roof with a finial; painted green and cream. Lamps round the eaves at dusk.
     ======================================================================================= */
  define({
    id: 'structure.shp-bandstand', category: 'structure', size: [220, 200], variants: 1, flippable: false,
    real: { h: 8.5, l: 9, w: 9 },
    palette: withVeg({ base: { stone: ['#c8b894', '#9a8a6a'], iron: ['#2e5a46', '#1e3e30', '#4a7a62'], cream: ['#ece6d2', '#c8c0a6'], roof: ['#3e5a52', '#2a403a', '#6a8a80'], gold: '#c8a040', flood: '#ffe2a6' } }),
    night: { glow: { lamp: '#ffe6a8' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 100, ry: 8, h: 140 }, reflect: false,
    tags: ['uk', 'park', 'bandstand', 'victorian', 'kit:temperate', 'kit:urban', 'role:building-near', 'class:structure'],
    credit: 'drawn for the Sheffield parks views: the Weston Park bandstand (stylised)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [], lit = [];
      b.push(['@stone.0', 'M-96 0V-22H96V0z'], ['@stone.1', 'M40 0V-22H96V0z'], ['@stone.1', rect(-100, -26, 200, 5)]);
      for (let k = 0; k < 3; k++) b.push(['@stone.' + (k % 2), rect(-20 - k * 6, -2 + k * 0, 40 + k * 12, 0)]);
      foot(b, r, -120, -90, 4); foot(b, r, 90, 120, 4);
      b.push(['@stone.1', rect(-22, -8, 44, 8)], ['@stone.0', rect(-26, -2, 52, 4)]);
      // the columns (five seen across the octagon), a rail between them
      const cols = [-86, -46, 0, 46, 86];
      for (const x of cols) b.push(['@iron.0', rect(x - 2.2, -116, 4.4, 92)], ['@iron.2', rect(x - 2.2, -116, 1.4, 92)], ['@iron.0', rect(x - 4, -30, 8, 5)]);
      b.push({ detail: true, s: '@iron.0', w: 1.6, d: 'M-86 -40H86M-86 -50H86' });
      let rl = ''; for (let x = -84; x < 86; x += 5) rl += `M${x} -50v10`;
      b.push({ detail: true, s: '@iron.1', w: 0.9, d: rl });
      // brackets and the frieze under the eaves
      let br = ''; for (const x of cols) br += `M${x - 16} -116q14 0 16 -14q2 14 16 14`;
      b.push({ detail: true, s: '@iron.0', w: 1.6, d: br }, ['@cream.0', rect(-100, -134, 200, 8)]);
      let fr = ''; for (let x = -96; x < 98; x += 8) fr += circ(x, -130, 2.2);
      b.push({ f: '@iron.1', d: fr, op: 0.7 });
      // the ogee roof, ribbed, and its finial
      b.push(['@roof.0', 'M-106 -134C-90 -150 -40 -152 -24 -168C-12 -180 -6 -190 0 -196C6 -190 12 -180 24 -168C40 -152 90 -150 106 -134z']);
      b.push({ f: '@roof.2', d: 'M-106 -134C-90 -150 -40 -152 -24 -168C-12 -180 -6 -190 0 -196C-4 -184 -10 -174 -18 -164C-34 -150 -70 -146 -80 -134z', op: 0.5 });
      b.push({ detail: true, s: '@roof.1', w: 1, op: 0.7, d: 'M-60 -136C-40 -150 -14 -166 0 -194M60 -136C40 -150 14 -166 0 -194M0 -134V-194' });
      b.push(['@gold', rect(-1, -212, 2, 18)], ['@gold', circ(0, -212, 3)]);
      if (season === 'winter') b.push({ f: SNOW, d: 'M-100 -138C-84 -150 -40 -152 -24 -168C-12 -180 -6 -190 0 -194C4 -188 8 -180 18 -170C-6 -168 -50 -150 -96 -134z', op: 0.9 });
      // lamps at the eaves (lit at dusk)
      for (const x of cols) b.push({ f: '@cream.0', d: circ(x, -122, 3), glow: 'window' });
      lit.push(wash(0, -120, 120, rect(-106, -200, 212, 200), 0.3));
      return { body: b, lit };
    },
  });

  /* =======================================================================================
     structure.shp-gate-piers: (v0) a pair of tall ashlar gate piers with moulded caps and ball finials, iron gates open back
     against them and a lamp on each; (v1, v2) a dwarf wall in coursed stone with spear-headed iron railings, a pier at
     each end (v2 longer). Anchor: the middle of the foot.
     ======================================================================================= */
  define({
    id: 'structure.shp-gate-piers', category: 'structure', size: [420, 170], variants: 3, flippable: true,
    real: { h: 4.2, l: 10, w: 1 },
    palette: withVeg({ base: { stone: ['#c4b08a', '#9e8c68', '#6e6048', '#dccaa4'], iron: ['#1e2a26', '#3a4a44'], gold: '#b89a48', glass: '#4e5a60', moss: ['#5a6a3a'] } }),
    night: { glow: { lamp: '#ffe6a8' }, on: 0.9 },
    parts: ['body'],
    shadow: { rx: 200, ry: 6, h: 110 }, reflect: false,
    tags: ['uk', 'park', 'gates', 'railings', 'kit:urban', 'kit:temperate', 'role:edge', 'class:structure'],
    credit: 'drawn for the Sheffield parks views: park gate piers and railings',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [];
      const pier = (x, h, w) => {
        b.push({ f: { lin: [[0, '@stone.3'], [0.6, '@stone.0'], [1, '@stone.1']], x1: x - w / 2, y1: 0, x2: x + w / 2, y2: 0 }, d: rect(x - w / 2, -h, w, h) });
        b.push({ detail: true, s: '@stone.2', w: 0.6, op: 0.5, d: coursing(r, x - w / 2, x + w / 2, -h, 0, 10, 0) });
        b.push(['@stone.3', rect(x - w / 2 - 4, -h - 6, w + 8, 6)], ['@stone.0', rect(x - w / 2 - 2, -h - 10, w + 4, 4)], ['@stone.0', circ(x, -h - 20, w * 0.3)], { f: '@stone.2', d: SD.ell(x + w * 0.1, -h - 18, w * 0.2, w * 0.24), op: 0.4 });
        if (season === 'winter') b.push({ f: SNOW, d: rect(x - w / 2 - 4, -h - 8, w + 8, 3) + SD.ell(x, -h - 26, w * 0.24, 4), op: 0.9 });
      };
      const rails = (x0, x1, y0, h) => {
        let d = ''; for (let x = x0 + 4; x < x1 - 2; x += 7) d += `M${f1(x)} ${y0}v${-h}`;
        let tips = ''; for (let x = x0 + 4; x < x1 - 2; x += 7) tips += `M${f1(x - 2)} ${y0 - h}l2 -6l2 6z`;
        b.push({ detail: true, s: '@iron.0', w: 1.8, d }, { f: '@iron.0', d: tips }, { detail: true, s: '@iron.0', w: 2.2, d: `M${x0} ${y0 - 6}H${x1}M${x0} ${y0 - h + 6}H${x1}` });
      };
      foot(b, r, -214, -172, 4); foot(b, r, 172, 214, 4);
      if (v === 0) {
        // the gates folded back, the piers, lamps on brackets
        for (const sx of [-1, 1]) {
          const x0 = sx * 70, x1 = sx * 150;
          let g = ''; for (let k = 0; k <= 8; k++) { const x = x0 + (x1 - x0) * k / 8; g += `M${f1(x)} 0V${f1(-120 - Math.sin(k / 8 * Math.PI) * 14)}`; }
          b.push({ detail: true, s: '@iron.0', w: 2, d: g + `M${x0} -10H${x1}M${x0} -60H${x1}` }, { detail: true, s: '@gold', w: 1.4, d: `M${x0} -60h${x1 - x0}`, op: 0.6 });
          rails(sx < 0 ? -210 : 168, sx < 0 ? -168 : 210, -18, 70);
          b.push(['@stone.1', rect(sx < 0 ? -210 : 168, -18, 42, 18)]);
        }
        pier(-160, 130, 26); pier(160, 130, 26);
        for (const x of [-160, 160]) b.push(['@iron.0', `M${x - 2} -168v-14h4v14z`], { f: '@glass', d: rect(x - 6, -196, 12, 14), glow: 'window' }, ['@iron.0', `M${x - 8} -196h16l-8 -8z`]);
      } else {
        const L = v === 1 ? 180 : 200;
        b.push(['@stone.0', rect(-L, -24, 2 * L, 24)], ['@stone.3', rect(-L - 2, -28, 2 * L + 4, 5)], { detail: true, s: '@stone.2', w: 0.6, op: 0.5, d: coursing(r, -L, L, -24, 0, 8, 22) });
        b.push({ f: '@moss.0', d: `M${-L} 0v-6q${L / 2} -4 ${L} 0q${L / 2} 4 ${L} -2V0z`, op: 0.45 });
        rails(-L + 18, L - 18, -28, 64);
        pier(-L + 9, 96, 18); pier(L - 9, 96, 18);
      }
      return { body: b };
    },
  });

  /* =======================================================================================
     structure.shp-stepping-stone: a squared gritstone block set in the brook bed, its flat top worn pale, darker and wet
     at the waterline, a little moss (4 variants of size and wear). Anchor: the middle at the water surface.
     ======================================================================================= */
  define({
    id: 'structure.shp-stepping-stone', category: 'structure', size: [120, 70], variants: 4, flippable: true,
    real: { h: 0.55, l: 0.95, w: 0.8 },
    palette: { base: { grit: ['#a49478', '#7e7058', '#55493a', '#c4b698'], wet: ['#3e3a32'], moss: ['#5e7a34', '#4a6028'], foam: '#eef6f4' },
      winter: { moss: ['#6a7450', '#56603e'] } },
    parts: ['body', 'foam'], anim: { flicker: { part: 'foam', op: [0.3, 0.9], period: 1.6 } },
    shadow: false, reflect: true,
    tags: ['uk', 'stepping stones', 'brook', 'gritstone', 'kit:temperate', 'kit:water', 'role:rock', 'class:rock'],
    credit: 'drawn for the Sheffield parks views: a stepping stone in the Porter Brook',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [], foam = [];
      const w = [96, 86, 104, 78][v], h = [52, 46, 58, 44][v], tw = w * 0.86, tilt = (r() - 0.5) * 6;
      // the block: a lit front face, the shaded right face, the worn top
      const top = -h, front = [[-w / 2, 6], [-w / 2 + 2, top + 12 + tilt], [w / 2 - 12, top + 12 - tilt], [w / 2 - 10, 8]];
      b.push(['@grit.1', poly(front)]);
      b.push(['@grit.2', poly([[w / 2 - 12, top + 12 - tilt], [w / 2, top + 4 - tilt], [w / 2 + 1, 2], [w / 2 - 10, 8]])]);
      b.push(['@grit.3', poly([[-w / 2 + 2, top + 12 + tilt], [-w / 2 + 12, top + tilt], [-w / 2 + 12 + tw, top - tilt], [w / 2, top + 4 - tilt], [w / 2 - 12, top + 12 - tilt]])]);
      b.push({ f: '@grit.0', d: SD.ell(-2, top + 6, tw * 0.32, 4), op: 0.45 });
      // chisel marks and cracks; the dark wet band and moss at the waterline
      b.push({ detail: true, s: '@grit.2', w: 0.8, op: 0.6, d: `M${f1(-w / 2 + 10)} ${f1(top + 24)}l12 3M${f1(-6)} ${f1(top + 20)}l4 18M${f1(w / 4)} ${f1(top + 30)}l-8 6` });
      b.push({ f: '@wet.0', d: `M${-w / 2} 6L${-w / 2 + 1} -12Q0 -8 ${w / 2 - 10} -14L${w / 2 + 1} -10L${w / 2 + 1} 2L${w / 2 - 10} 8z`, op: 0.7 });
      b.push({ f: '@moss.' + (v % 2), d: SD.blob(r, -w / 4, -12, w * 0.22, 5, 6, 0.4), op: 0.85 });
      if (season === 'winter') b.push({ f: SNOW, d: SD.ell(0, top + 4, tw * 0.4, 4), op: 0.85 });
      // the water breaking round its upstream side
      foam.push({ f: '@foam', d: `M${-w / 2 - 14} 4q10 -8 20 -2q12 -8 24 0q14 -6 ${w - 10} 2q-20 6 -34 2q-14 4 -30 0z`, op: 0.7 }, { f: '@foam', d: SD.ell(w / 2 + 6, 6, 10, 2.4), op: 0.5 });
      return { body: b, foam };
    },
  });

  /* =======================================================================================
     structure.shp-weir: a low stepped stone weir across a brook (the Porter Brook's old mill weirs): the sill, the white
     water sheeting over it and churning below (animated). Anchor: the middle of the sill at the lower water level.
     ======================================================================================= */
  define({
    id: 'structure.shp-weir', category: 'structure', size: [560, 60], variants: 1, flippable: true, seasonal: false, shapeBySeason: false,
    real: { h: 0.8, l: 9, w: 2 },
    palette: { base: { grit: ['#8a7c62', '#5e5444', '#a89878'], foam: ['#f4faf8', '#cfe2e2'], water: ['#6a8a88', '#4e6e6c'], moss: ['#4e6a2e'] } },
    parts: ['body', 'foam', 'spray'],
    anim: { flicker: { part: 'spray', op: [0.35, 1], period: 1.2 } },
    shadow: false, reflect: false,
    tags: ['uk', 'weir', 'brook', 'kit:temperate', 'kit:water', 'role:edge', 'class:structure'],
    credit: 'drawn for the Sheffield parks views: a mill weir on the Porter Brook',
    build(v, r) {
      const b = [], foam = [], spray = [];
      b.push(['@grit.1', 'M-280 -2L-270 -26H270L280 -2z'], ['@grit.2', rect(-272, -30, 544, 5)], { f: '@moss.0', d: 'M-276 -8q60 -6 120 -2q80 -6 160 0q70 -4 270 2V-2H-276z', op: 0.5 });
      let blocks = ''; for (let x = -268; x < 268; x += 22 + r() * 10) blocks += `M${f1(x)} -26v24`;
      b.push({ detail: true, s: '@grit.1', w: 0.8, d: blocks, op: 0.6 });
      // the sheet of water over the sill (glassy), the white water below
      b.push({ f: { lin: [[0, '@water.0', 0.8], [1, '@foam.1', 0.9]], x1: 0, y1: -34, x2: 0, y2: -4 }, d: 'M-272 -32H272L276 -6H-276z' });
      let streaks = ''; for (let x = -266; x < 266; x += 7 + r() * 6) streaks += `M${f1(x)} -30q1 12 ${f1(2 + r() * 2)} 24`;
      foam.push({ detail: true, s: '@foam.0', w: 1.2, d: streaks, op: 0.7 });
      foam.push({ f: '@foam.0', d: SD.ell(-160, -2, 120, 7) + SD.ell(40, -1, 150, 8) + SD.ell(210, -2, 80, 6), op: 0.85 });
      let sp = ''; for (let i = 0; i < 40; i++) sp += SD.ell(-270 + r() * 540, -6 - r() * 8, 3 + r() * 6, 1.6 + r() * 2);
      spray.push({ f: '@foam.0', d: sp, op: 0.8 });
      return { body: b, foam, spray };
    },
  });

  /* =======================================================================================
     plant.shp-border: a clump of a herbaceous border: tulips and wallflowers in spring; delphinium spires, phlox and roses
     in summer; Michaelmas daisies, sedum and rudbeckia in autumn; cut back to brown seedheads and box in winter.
     ======================================================================================= */
  define({
    id: 'plant.shp-border', category: 'plant', size: [140, 90], variants: 4, flippable: true,
    real: { h: 1.2, l: 1.8, w: 1.2 },
    palette: {
      base: { leaf: ['#4a7a34', '#365e28', '#6e9a48'], stem: '#4a6a30', fl: ['#6a7ad0', '#e4a0c0', '#f2d04a', '#a05ab8'] },
      spring: { leaf: ['#5e8a3a', '#46702c', '#86b050'], fl: ['#e0583a', '#f0c030', '#e88aa0', '#f4f0e0'] },
      summer: { fl: ['#5a6ad0', '#e48ab8', '#f4e07a', '#9a5ac0'] },
      autumn: { leaf: ['#6a7a34', '#4e5e2a', '#8a8a44'], fl: ['#9a7ad0', '#d0784a', '#e8b030', '#b04a5a'] },
      winter: { leaf: ['#5a6248', '#3e4a34', '#7a7a5a'], stem: '#7a6a4a', fl: ['#8a7058', '#6a5a46', '#a08a6a', '#5e4e3e'] },
    },
    parts: ['body', 'heads'], anim: { sway: { part: 'heads', pivot: [0, 0], deg: 1.6 } },
    shadow: { rx: 60, ry: 5, h: 50 }, reflect: false,
    tags: ['uk', 'garden', 'border', 'flowers', 'kit:temperate', 'kit:urban', 'role:shrub', 'class:shrub'],
    credit: 'drawn for the Sheffield parks views: a herbaceous border',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', b = [], heads = [];
      // the leafy mound: overlapping leaf sprays (not discs), darker inside, a lit rim to the upper left
      let L0 = '', L1 = '', L2 = '';
      for (let i = 0; i < 16; i++) {
        const x = -58 + r() * 116, y = -4 - r() * 26 * (1 - Math.abs(x) / 90), a = -Math.PI / 2 + (r() - 0.5) * 2.2, len = 9 + r() * 9, d = SD.leaf(x, y, a, len, len * 0.34);
        if (y < -18 && x < 10) L2 += d; else if (r() < 0.55) L1 += d; else L0 += d;
      }
      b.push({ f: '@leaf.1', d: SD.blob(r, 0, -10, 52, 12, 9, 0.4) }, { f: '@leaf.1', d: L1 }, { f: '@leaf.0', d: L0 }, { f: '@leaf.2', d: L2 });
      // the flowering stems: each kind with its own head
      let stems = '', leafs = ''; const fl = ['', '', '', ''];
      const n = season === 'winter' ? 8 : 11;
      for (let i = 0; i < n; i++) {
        const x = -54 + r() * 108, tall = season === 'summer' && (i + v) % 3 === 0, h = (tall ? 62 : 30) + r() * 20, lean = (r() - 0.5) * 12;
        const tx = x + lean, ty = -10 - h;
        stems += `M${f1(x)} -10Q${f1(x + lean * 0.2)} ${f1(-10 - h * 0.6)} ${f1(tx)} ${f1(ty)}`;
        if (season !== 'winter') leafs += SD.leaf(x + lean * 0.15, -10 - h * 0.35, -Math.PI / 2 + (r() < 0.5 ? -0.8 : 0.8), 8 + r() * 4, 2.4);
        const k = (i + v) % 4;
        if (season === 'spring') fl[k] += `M${f1(tx - 3.4)} ${f1(ty + 3)}Q${f1(tx - 4)} ${f1(ty - 6)} ${f1(tx - 1.2)} ${f1(ty - 7)}L${f1(tx)} ${f1(ty - 4)}L${f1(tx + 1.2)} ${f1(ty - 7)}Q${f1(tx + 4)} ${f1(ty - 6)} ${f1(tx + 3.4)} ${f1(ty + 3)}Q${f1(tx)} ${f1(ty + 5)} ${f1(tx - 3.4)} ${f1(ty + 3)}z`;
        else if (tall) { for (let j = 0; j < 6; j++) { const w = 3.6 - j * 0.4; fl[k] += SD.ell(tx + (j % 2 ? 1.2 : -1.2), ty + j * 4.4, w, w * 0.8); } }
        else if (season === 'winter') fl[k] += SD.ell(tx, ty, 2.2, 3) + `M${f1(tx)} ${f1(ty - 3)}l-3 -4M${f1(tx)} ${f1(ty - 3)}l3 -4`;
        else if (season === 'autumn') { for (let j = 0; j < 5; j++) fl[k] += circ(tx + (r() - 0.5) * 7, ty + (r() - 0.5) * 4, 1.6 + r()); }
        else { const rr = 2 + r() * 1.4; for (let j = 0; j < 3; j++) { const a2 = j / 3 * Math.PI * 2; fl[k] += circ(tx + Math.cos(a2) * rr, ty + Math.sin(a2) * rr * 0.8, rr * 0.8); } }
      }
      heads.push({ detail: true, s: '@stem', w: 1.2, d: stems });
      if (leafs) heads.push({ f: '@leaf.2', d: leafs });
      fl.forEach((d, i) => { if (d) heads.push({ f: '@fl.' + i, d }); });
      if (season === 'summer' || season === 'spring') heads.push({ f: '#ffffff', d: fl[(v + 1) % 4] ? fl[(v + 1) % 4].split('z').slice(0, 3).join('z') + 'z' : '', op: 0.25 });
      return { body: b, heads };
    },
  });

  /* =======================================================================================
     vehicle.shp-bus: a Yorkshire double-decker (generic, no operator names, numbers or logos): v0 a deep-purple body with a
     pale lilac lower band; v1 white with a blue skirt and an orange swoosh at the back. Faces right; parts as the city kit.
     ======================================================================================= */
  define({
    id: 'vehicle.shp-bus', category: 'vehicle', size: [370, 160], variants: 2, seasonal: false, shapeBySeason: false, flippable: true,
    real: { h: 4.4, l: 11, w: 2.55 },
    parts: ['wheels', 'body', 'lit'],
    palette: { base: { body: ['#4a2a6a', '#f2f2f0'], body2: ['#33204a', '#d4d6d8'], band: ['#b8a0d8', '#2a5aa8'], swoosh: ['#d07ac0', '#e8862a'], glass: ['#20282e', '#4e6070', '#8aa0b0'], dark: '#181c20',
      tyre: '#1a1b1d', rim: ['#a8acb0', '#5a5e62'], head: '#f4f2e6', tailL: '#b8282a', blind: '#2a2418', beam: '#fff2c8', tailg: '#ff3a2a' } },
    night: { glow: { window: '#fff0c8', lamp: '#ffd27a' }, on: 0.9 },
    anim: { bob: { part: 'body', dy: 0.7, period: 0.8 } },
    shadow: { rx: 180, ry: 9, h: 150 },
    tags: ['uk', 'uk-yorkshire', 'city', 'street', 'bus', 'double-decker', 'traffic', 'kit:urban', 'kit:vehicles', 'role:vehicle'],
    credit: 'drawn for the Sheffield parks views: a generic double-decker, no operator branding',
    build(v) {
      const body = [], wheels = [], lit = [], L = 350, x0 = -L / 2, x1 = L / 2, H = 150, rw = 15;
      const B = '@body.' + v, B2 = '@body2.' + v;
      body.push([B, `M${x0} -14V${-H + 10}q0 -10 10 -10H${x1 - 14}q14 0 14 14V-14z`], [B2, rect(x0, -30, L, 16)], ['@dark', rect(x0, -16, L, 4)]);
      body.push(['@band.' + v, rect(x0, v ? -36 : -40, L, v ? 8 : 12)]);
      body.push({ f: '@swoosh.' + v, d: `M${x0} ${-H + 30}q60 10 80 70q6 20 10 46H${x0}z`, op: 0.85 });
      // window bands on both decks, glazing bars, the staircase window
      body.push(['@dark', rect(x0 + 8, -H + 12, L - 24, 42)], ['@dark', rect(x0 + 8, -88, L - 62, 46)]);
      for (let i = 0; i < 7; i++) body.push({ f: '@glass.0', d: rect(x0 + 11 + i * 46.5, -H + 15, 43, 36), glow: 'window' });
      for (let i = 0; i < 6; i++) body.push({ f: '@glass.0', d: rect(x0 + 11 + i * 46.5, -85, 43, 40), glow: 'window' });
      for (let i = 0; i < 7; i++) body.push({ f: '@glass.2', d: `M${x0 + 14 + i * 46.5} ${-H + 17}h14l-14 18z`, op: 0.22 });
      // the front: windscreen, a plain lit destination panel, headlamps; the doors
      body.push(['@dark', `M${x1 - 16} ${-H + 10}h10q6 0 6 8V-40h-16z`], { f: '@glass.1', d: `M${x1 - 14} -86h10V-44h-10z`, glow: 'window' }, { f: '@glass.1', d: `M${x1 - 14} ${-H + 14}h10v38h-10z`, glow: 'window' });
      body.push({ f: '@blind', d: rect(x1 - 14, -96, 12, 8), glow: 'lamp' }, { f: '@head', d: rect(x1 - 6, -36, 6, 6), glow: 'lamp' }, ['@tailL', rect(x0, -54, 3, 16)]);
      for (const dx of [x1 - 52, x0 + 150]) body.push(['@dark', rect(dx, -84, 30, 56)], { f: '@glass.1', d: rect(dx + 2, -82, 12, 46), glow: 'window' }, { f: '@glass.1', d: rect(dx + 16, -82, 12, 46), glow: 'window' });
      // wheel arches and wheels
      for (const wx of [x1 - 62, x0 + 92]) {
        body.push(['@dark', `M${wx - 19} -12a19 19 0 0 1 38 0z`]);
        wheels.push(['@tyre', circ(wx, -rw, rw)], ['@rim.0', circ(wx, -rw, rw * 0.62)], ['@rim.1', circ(wx, -rw, rw * 0.3)]);
      }
      lit.push({ f: { lin: [[0, '@beam', 0.45], [1, '@beam', 0]], x1: x1, y1: 0, x2: x1 + 90, y2: 0 }, d: `M${x1} -36L${x1 + 90} -56L${x1 + 90} -8z` }, { f: { rad: [[0, '@tailg', 0.5], [1, '@tailg', 0]], cx: x0, cy: -46, r: 16 }, d: ell(x0, -46, 16, 12) });
      return { wheels, body, lit };
    },
  });
})();

/* ---------- v4 (Ringinglow): the camera, the road and its drystone walls drawn in this camera's perspective ----------
   SCENE_SHP_V4: the camera, the road's centreline x(d), the wall runs. structure.shp-moor-wall: one variant per wall piece
   (near to far along each run), each anchored at its NEAR foot (pixels, pinned) so the depth sort puts the sheep, walkers and
   cyclists in front of or behind each piece. Walls are gritstone, 1.3 m, with a row of rounded coping stones. */
const SCENE_SHP_V4 = (function () {
  const camera = { eye: 2.6, fov: 64, horizon: 384, heading: 262, lat: 53.3608, lon: -1.5466 };
  const J = SCENE_SHP.proj(camera), f = J.f, proj = J.p;
  // Ringinglow Road out onto the moor: straight past the Round House, then bending gently left as it climbs
  const roadX = d => 5.2 - Math.min(d, 160) * 0.035 - (d > 160 ? Math.pow(d - 160, 2) / 3000 : 0);
  const dMin = f * camera.eye / (900 - camera.horizon) * 0.9;
  // wall runs: [x, d] points (metres); the road walls follow the verge, the field walls run off across the in-bye
  const along = (off, d0, d1) => { const out = []; for (let d = d0; d <= d1 * 1.0001; d *= 1.32) out.push([Math.round((roadX(d) + off) * 100) / 100, Math.round(d * 100) / 100]); return out; };
  const across = (d, x0, x1) => { const out = [], n = Math.max(2, Math.ceil(Math.abs(x1 - x0) / (d * 0.3))); for (let i = 0; i <= n; i++) out.push([Math.round((x0 + (x1 - x0) * i / n) * 100) / 100, Math.round((d + (x1 - x0) * i / n * 0.04) * 100) / 100]); return out; };
  const runs = [
    along(-7.4, 9, 60), along(-7.4, 70, 520),          // the left (south) wall, broken by the side road at the crossroads
    along(4.6, 12, 34), along(4.6, 58, 520),            // the right (north) wall, broken by the Round House's yard
    across(70, roadX(70) - 7.4, -90), across(150, roadX(150) - 7.4, -220), across(260, roadX(260) - 7.4, -320),
    across(96, roadX(96) + 4.6, 120), across(190, roadX(190) + 4.6, 260),
  ];
  const pieces = [];
  runs.forEach((run, ri) => { for (let i = 0; i < run.length - 1; i++) pieces.push({ run: ri, a: run[i], b: run[i + 1] }); });
  return { camera, f, proj, roadX, runs, pieces, dMin };
})();
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const W = SCENE_SHP_V4, proj = W.proj, f = W.f, SD = sceneDraw;
  const R = v => Math.round(v * 10) / 10;
  const H = 1.3, T = 0.55;   // the wall's height and its thickness at the top
  for (const wid of ['structure.shp-moor-wall', 'structure.shp-field-wall']) sceneObjDefine({
    id: wid, category: 'structure', size: [400, 120], variants: W.pieces.length, seasonal: true, shapeBySeason: true, flippable: false,
    real: { h: 1.3, l: 4, w: 0.6 },
    palette: {
      base: { grit: ['#7e766a', '#5e584e', '#9a9282', '#45413a', '#b0a898'], moss: ['#6a7a3a', '#56662e'], lichen: '#c8c49a' },
      autumn: { moss: ['#7a7a3a', '#5e5e2e'] }, winter: { moss: ['#6a6e56', '#545846'] },
    },
    parts: ['body'], shadow: false, reflect: false,
    tags: ['uk', 'peak', 'drystone', 'wall', 'moor', 'row', 'kit:temperate', 'role:edge', 'class:structure'],
    credit: 'drawn for the Sheffield parks views: the drystone walls out of Ringinglow, in the camera\'s perspective',
    build(v, rnd, ctx) {
      const pc = W.pieces[v], season = (ctx && ctx.season) || 'summer', b = [];
      if (!pc) return { body: b };
      const [a, c] = pc.a[1] <= pc.b[1] ? [pc.a, pc.b] : [pc.b, pc.a];
      const o = proj(a[0], a[1], 0);
      const P = (x, d, h) => { const p = proj(x, d, h); return [R(p[0] - o[0]), R(p[1] - o[1])]; };
      // the face toward the road (or toward us), the top, a darker end face where a run stops
      const n = [-(c[1] - a[1]), c[0] - a[0]], m = Math.hypot(n[0], n[1]) || 1, nx = n[0] / m * T / 2, nd = n[1] / m * T / 2;
      const faceSide = (a[0] * nx + a[1] * nd) < 0 ? 1 : -1;   // the side that faces the camera
      const ox = nx * faceSide, od = nd * faceSide;
      const face = [P(a[0] + ox, a[1] + od, 0), P(c[0] + ox, c[1] + od, 0), P(c[0] + ox, c[1] + od, H), P(a[0] + ox, a[1] + od, H)];
      const top = [P(a[0] + ox, a[1] + od, H), P(c[0] + ox, c[1] + od, H), P(c[0] - ox, c[1] - od, H + 0.05), P(a[0] - ox, a[1] - od, H + 0.05)];
      const poly = pts => 'M' + pts.map(p => p[0] + ' ' + p[1]).join('L') + 'Z';
      b.push({ f: '@grit.1', d: poly(face) }, { f: '@grit.2', d: poly(top) });
      // courses and stones: lines at heights along the face, joints staggered; larger near, fewer far
      const near = f / a[1], courses = near > 60 ? 6 : near > 20 ? 4 : near > 6 ? 2 : 0;
      let crs = '', jt = '', light = '';
      for (let k = 1; k <= courses; k++) {
        const h = H * k / (courses + 1) + (rnd() - 0.5) * 0.06, p0 = P(a[0] + ox, a[1] + od, h), p1 = P(c[0] + ox, c[1] + od, h);
        crs += `M${p0[0]} ${p0[1]}L${p1[0]} ${p1[1]}`;
        const nj = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.45 * Math.min(1, near / 40)));
        for (let j = 0; j < nj; j++) {
          const u = (j + 0.3 + rnd() * 0.4) / nj, x = a[0] + (c[0] - a[0]) * u + ox, d = a[1] + (c[1] - a[1]) * u + od;
          const q0 = P(x, d, h - H / (courses + 1)), q1 = P(x, d, h);
          jt += `M${q0[0]} ${q0[1]}L${q1[0]} ${q1[1]}`;
          if (near > 30 && rnd() < 0.35) { const q2 = P(x + (c[0] - a[0]) * 0.1, d + (c[1] - a[1]) * 0.1, h - 0.04); light += `M${q1[0]} ${q1[1]}L${q2[0]} ${q2[1]}`; }
        }
      }
      if (crs) b.push({ detail: true, s: '@grit.3', w: near > 60 ? 1.4 : 0.9, d: crs, op: 0.75 }, { detail: true, s: '@grit.3', w: near > 60 ? 1.2 : 0.8, d: jt, op: 0.6 });
      if (light) b.push({ detail: true, s: '@grit.4', w: 1.2, d: light, op: 0.6 });
      // the coping: a row of rounded stones on edge along the top
      if (near > 4) {
        let cp = '';
        const nc = Math.max(2, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.5));
        for (let j = 0; j < nc; j++) {
          const u0 = j / nc, u1 = (j + 0.95) / nc, x0 = a[0] + (c[0] - a[0]) * u0, d0 = a[1] + (c[1] - a[1]) * u0, x1 = a[0] + (c[0] - a[0]) * u1, d1 = a[1] + (c[1] - a[1]) * u1;
          const hh = 0.1 + rnd() * 0.08, p0 = P(x0, d0, H), p1 = P(x1, d1, H), pt = P((x0 + x1) / 2, (d0 + d1) / 2, H + hh);
          cp += `M${p0[0]} ${p0[1]}Q${R(2 * pt[0] - (p0[0] + p1[0]) / 2)} ${R(2 * pt[1] - (p0[1] + p1[1]) / 2)} ${p1[0]} ${p1[1]}Z`;
        }
        b.push({ f: '@grit.0', d: cp }, { detail: true, s: '@grit.3', w: near > 60 ? 0.9 : 0.6, d: cp, op: 0.5 });
        if (season === 'winter') b.push({ f: '#eef2f6', d: cp, op: 0.55 });
      }
      // moss and lichen low on the face; tufts at its foot
      const m0 = P(a[0] + ox, a[1] + od, 0), m1 = P(c[0] + ox, c[1] + od, 0), m2 = P(c[0] + ox, c[1] + od, 0.25 + rnd() * 0.2), m3 = P(a[0] + ox, a[1] + od, 0.3);
      b.push({ f: '@moss.' + (v % 2), d: poly([m0, m1, m2, m3]), op: 0.6 });
      if (near > 25) { let lc = ''; for (let j = 0; j < 3; j++) { const u = rnd(), h = 0.4 + rnd() * 0.7, q = P(a[0] + (c[0] - a[0]) * u + ox, a[1] + (c[1] - a[1]) * u + od, h); lc += SD.ell(q[0], q[1], Math.max(0.8, near * 0.06), Math.max(0.6, near * 0.04)); } b.push({ f: '@lichen', d: lc, op: 0.5 }); }
      return { body: b };
    },
  });
})();

/* ---------- framing: a park tree's bough over the top of the frame and its trunk up the frame's edge (light: few long paths) ----------
   plant.shp-bough   a lime or sycamore bough reaching in from the top corner (anchor: top-left, screen units): one tapering limb,
                     a few twigs, leaf masses as lobed clusters in three tones (spring fresh, summer deep, autumn gold, winter bare)
   tree.shp-trunk    a mature beech / sycamore trunk rising out of the bottom of the frame (anchor: the foot): smooth grey bark
                     with a lit edge, a root flare, a cut limb's scar, moss on the shaded side; a branch fork leaving the top */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1;
  /** A tapering limb along points (screen units): width w0 at the start to w1 at the end. */
  const limb = (pts, w0, w1) => {
    const L = [], Rr = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], m = Math.hypot(tx, ty) || 1, w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
      L.push([pts[i][0] - ty / m * w, pts[i][1] + tx / m * w]); Rr.push([pts[i][0] + ty / m * w, pts[i][1] - tx / m * w]);
    }
    return 'M' + L.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'L' + Rr.reverse().map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
  };
  sceneObjDefine({
    id: 'plant.shp-bough', category: 'plant', size: [760, 420], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 4 },
    palette: {
      base: { bark: ['#4a4036', '#62564a'], leaf: ['#3e6a2e', '#55843a', '#78a24c'] },
      spring: { leaf: ['#5e8a2e', '#7aa83a', '#a2c858'] }, summer: { leaf: ['#355e28', '#4a7a32', '#6a9a44'] },
      autumn: { leaf: ['#a0702a', '#c8902e', '#e0b84a'] }, winter: { leaf: ['#5a4e40', '#6a5e4e', '#7a6e5e'] },
    },
    parts: ['limb', 'leaves'], anim: { sway: { part: 'leaves', pivot: [0, 0], deg: 1.2 } },
    reflect: false, shadow: false,
    tags: ['uk', 'tree', 'frame', 'kit:temperate', 'role:sky', 'class:air'],
    credit: 'drawn for the Sheffield parks views: a park tree bough (framing)',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', limbP = [], leaves = [];
      const main = v ? [[-20, -10], [140, 40], [300, 70], [460, 96], [640, 110]] : [[-20, 10], [160, 30], [320, 58], [480, 70], [700, 64]];
      limbP.push({ f: '@bark.0', d: limb(main, 34, 6) }, { f: '@bark.1', d: limb(main.map(p => [p[0], p[1] - 6]), 10, 2), op: 0.6 });
      const twigs = [];
      for (let i = 1; i < main.length; i++) for (let k = 0; k < 2; k++) {
        const [x, y] = main[i], a = (k ? 1.2 : 0.3) + (r() - 0.5) * 0.6, L = 60 + r() * 70;
        twigs.push([[x - 30, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L + 10]]);
      }
      let tw = ''; for (const t of twigs) tw += limb(t, 5, 1.2);
      limbP.push({ f: '@bark.0', d: tw });
      if (season === 'winter') {
        let fine = ''; for (const t of twigs) { const [x, y] = t[2]; for (let j = 0; j < 4; j++) { const a = r() * Math.PI, L = 18 + r() * 24; fine += `M${f1(x)} ${f1(y)}l${f1(Math.cos(a) * L)} ${f1(Math.sin(a) * L)}`; } }
        limbP.push({ s: '@bark.0', w: 1.2, d: fine, op: 0.8, cap: 'round' });
        return { limb: limbP, leaves };
      }
      // leaf sprays: pointed leaves hanging along each twig and in fans at its tip, three tones (the lit ones to the upper left)
      const tones = ['', '', ''], keep = season === 'autumn' ? 0.6 : 1;
      for (const t of twigs) {
        const [x0, y0] = t[0], [x1, y1] = t[2];
        for (let j = 0; j < 22; j++) {
          if (r() > keep) continue;
          const u = 0.25 + 0.75 * r(), x = x0 + (x1 - x0) * u + (r() - 0.5) * 30, y = y0 + (y1 - y0) * u + (r() - 0.2) * 24;
          const a = Math.PI / 2 + (r() - 0.5) * 2.2, L = 16 + r() * 12, d = SD.leaf(x, y, a, L, L * 0.42);
          tones[y < y0 + (y1 - y0) * 0.4 && x < x1 ? 2 : r() < 0.55 ? 1 : 0] += d;
        }
      }
      leaves.push({ f: '@leaf.0', d: tones[0] }, { f: '@leaf.1', d: tones[1] }, { f: '@leaf.2', d: tones[2] });
      return { limb: limbP, leaves };
    },
  });
  sceneObjDefine({
    id: 'tree.shp-trunk', category: 'tree', size: [320, 980], variants: 2, seasonal: false, shapeBySeason: false, flippable: true,
    real: { h: 12 },
    palette: {
      base: { bark: ['#6e6a62', '#58544e', '#8e8a80', '#42403c'], moss: ['#5a7a34', '#47622a'], ivy: ['#2e4a26', '#3e5e30'] },
      winter: { moss: ['#6a7450', '#56603e'] },
    },
    parts: ['trunk'], reflect: false, shadow: false,
    tags: ['uk', 'tree', 'frame', 'trunk', 'kit:temperate', 'role:tree', 'class:air'],
    credit: 'drawn for the Sheffield parks views: a near beech trunk (framing)',
    build(v, r, ctx) {
      const t = [], season = (ctx && ctx.season) || 'summer';
      const lean = v ? 22 : -12, w0 = 150, w1 = 96, top = -720;
      const L = [[-w0 / 2 - 50, 0], [-w0 / 2 - 8, -50], [-w0 / 2 + lean * 0.3, -380], [-w1 / 2 + lean, top]], Rr = [[w1 / 2 + lean, top], [w0 / 2 + lean * 0.3, -380], [w0 / 2 + 8, -50], [w0 / 2 + 54, 0]];
      const path = 'M' + L.concat(Rr).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
      t.push({ f: { lin: [[0, '@bark.2'], [0.3, '@bark.0'], [1, '@bark.3']], x1: -w0 / 2, y1: 0, x2: w0 / 2, y2: 0 }, d: path });
      // the fork: two limbs leaving the top of the frame
      const limbA = 'M' + f1(-w1 / 2 + lean) + ' ' + top + 'Q' + f1(-w1 + lean) + ' ' + (top - 140) + ' ' + f1(-w1 * 1.2 + lean) + ' ' + (top - 260) + 'L' + f1(-w1 * 0.55 + lean) + ' ' + (top - 260) + 'Q' + f1(-w1 * 0.3 + lean) + ' ' + (top - 120) + ' ' + f1(lean) + ' ' + (top + 10) + 'z';
      const limbB = 'M' + f1(lean - 6) + ' ' + (top + 10) + 'Q' + f1(w1 * 0.4 + lean) + ' ' + (top - 120) + ' ' + f1(w1 * 0.9 + lean) + ' ' + (top - 260) + 'L' + f1(w1 * 1.4 + lean) + ' ' + (top - 260) + 'Q' + f1(w1 * 0.9 + lean) + ' ' + (top - 100) + ' ' + f1(w1 / 2 + lean) + ' ' + top + 'z';
      t.push({ f: '@bark.0', d: limbA }, { f: '@bark.1', d: limbB });
      // bark: long fissures and plates, lit on the left edge, shade on the right
      let fis = ''; for (let i = 0; i < 22; i++) { const x = -w0 / 2 + 14 + r() * (w0 - 28), y = -20 - r() * 660, h = 40 + r() * 110, lx = lean * (-y / 720) * 0.6; fis += 'M' + f1(x + lx) + ' ' + f1(y) + 'q' + f1((r() - 0.5) * 8) + ' ' + f1(-h * 0.5) + ' ' + f1((r() - 0.5) * 6) + ' ' + f1(-h); }
      t.push({ detail: true, s: '@bark.3', w: 3, d: fis, op: 0.5, cap: 'round' });
      t.push({ f: '#ffffff', d: 'M' + f1(-w0 / 2 - 8) + ' -50L' + f1(-w0 / 2 + lean * 0.3) + ' -380L' + f1(-w1 / 2 + lean) + ' ' + top + 'L' + f1(-w1 / 2 + lean + 12) + ' ' + top + 'L' + f1(-w0 / 2 + lean * 0.3 + 14) + ' -380L' + f1(-w0 / 2 + 8) + ' -50z', op: 0.14 });
      t.push({ f: '@moss.0', d: 'M' + f1(w0 / 2 + 54) + ' 0L' + f1(w0 / 2 + 8) + ' -50L' + f1(w0 / 2 + lean * 0.3 - 4) + ' -320L' + f1(w0 / 2 + lean * 0.3 - 30) + ' -300L' + f1(w0 / 2 - 22) + ' -40L' + f1(w0 / 2 + 10) + ' 0z', op: 0.55 });
      t.push({ f: '@bark.3', d: SD.ell(lean * 0.4 + 10, -460, 16, 21), op: 0.6 }, { f: '@bark.2', d: SD.ell(lean * 0.4 + 8, -462, 9, 13), op: 0.6 });
      // ivy climbing the shaded side: a stem and clumps of three-lobed leaves (evergreen)
      let stem = '', iv0 = '', iv1 = ''; let x = w0 / 2 - 20, y = -10;
      for (let i = 0; i < 14; i++) {
        const nx = w0 / 2 - 30 + (r() - 0.5) * 40 + lean * (-y / 720) * 0.5, ny = y - 30 - r() * 20;
        stem += 'M' + f1(x) + ' ' + f1(y) + 'Q' + f1((x + nx) / 2 + 10) + ' ' + f1((y + ny) / 2) + ' ' + f1(nx) + ' ' + f1(ny); x = nx; y = ny;
        for (let j = 0; j < 2; j++) { const lx = x + (r() - 0.5) * 30, ly = y + (r() - 0.5) * 18, sz = 8 + r() * 5, a = r() * Math.PI * 2; const d = SD.leaf(lx, ly, a, sz * 1.4, sz) + SD.leaf(lx, ly, a + 1.2, sz, sz * 0.7) + SD.leaf(lx, ly, a - 1.2, sz, sz * 0.7); if (r() < 0.5) iv0 += d; else iv1 += d; }
      }
      t.push({ s: '@bark.3', w: 2, d: stem, op: 0.7, cap: 'round' }, { f: '@ivy.0', d: iv0 }, { f: '@ivy.1', d: iv1 });
      return { trunk: t };
    },
  });
})();

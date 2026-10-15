/* ============================================================
   SCENE LIBRARY: sheffield-centre (docs/dev/SCENE_ENGINE_V2.md), the ground plans and own objects of the four Sheffield
   city-centre views (71-scene-uk-north-sheffield-centre.js; the pack 72-anim-pack-uk-north-sheffield-centre.js).
   PURE: data and sceneObjDefine calls only.

   The views (each a different real viewpoint, composed by hand):
     v1  the Peace Gardens from their south steps, looking north up the Holberry Cascades to the Goodwin Fountain and the Town Hall
     v2  Millennium Square, looking east at the long glass side of the Winter Garden, St Paul's Tower rising beside it
     v3  Sheaf Square from the top of Howard Street, looking east down the Cutting Edge to the station and Park Hill on its hill
     v4  a Park Hill deck, looking west over the tram on the hillside, the station and the city to the western hills

   Objects of their own (an improved copy of the northern landmarks of 70-scene-lib-north.js, plus new ones):
     landmark.shc-town-hall        the 1897 Town Hall: rusticated ground floor, the carved frieze, the corner tower, Vulcan on top
     landmark.shc-winter-garden    the larch-and-glass Winter Garden, its long side (v0) and its parabolic end (v1)
     landmark.shc-st-pauls-tower   St Paul's Tower, the slim white residential tower on its glass podium
     landmark.shc-station          the Midland station's stone front: the arcade of the 1905 porte-cochere between pavilions
     landmark.shc-park-hill        Park Hill flats on their hill (colour panels of the refurbished block, the brick of the rest)
     landmark.shc-cathedral        the Cathedral: its crossing tower and short spire (small, far, for the skyline)
     landmark.shc-gallery          the Millennium Gallery's white portal frames over its glass front
     water.shc-jet                 one jet of the Goodwin Fountain (3 heights); flickers, its crown bobs, lit from below at night
     structure.shc-cutting-edge    the Cutting Edge (stainless steel, water running down it), drawn in v3's perspective, in pieces
     structure.shc-deck            the Park Hill deck parapet and column framing v4 (screen units, pinned)
     tree.shc-plane-bough          a near London plane, mottled trunk up the frame edge, a bough over the top (framing)
     vehicle.shc-supertram (+ -front, -rear)  the Supertram, three sections, blue with the orange and red band (no logos)
   No lettering, no logos, no crests. Ground metres: x to the right of the view axis, d forward.
   ============================================================ */
const SCENE_SHC = Object.freeze({
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
  /** A strip polygon of width w along a centreline (ground metres). */
  strip(pts, w) {
    const L = SCENE_SHC.line(pts, 2.5), a = [], b = [];
    for (let i = 0; i < L.length; i++) {
      const p = L[Math.max(0, i - 1)], q = L[Math.min(L.length - 1, i + 1)], tx = q[0] - p[0], td = q[1] - p[1], m = Math.hypot(tx, td) || 1;
      const r1 = v => Math.round(v * 10) / 10;
      a.push([r1(L[i][0] - td / m * w / 2), r1(L[i][1] + tx / m * w / 2)]); b.push([r1(L[i][0] + td / m * w / 2), r1(L[i][1] - tx / m * w / 2)]);
    }
    return a.concat(b.reverse());
  },
  /** An ellipse polygon (ground metres). */
  oval(cx, cd, rx, rd, n) { const out = []; n = n || 28; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; out.push([Math.round((cx + Math.cos(a) * rx) * 100) / 100, Math.round((cd + Math.sin(a) * rd) * 100) / 100]); } return out; },
  /** The camera's projection: [X, Y] of ground (x, d) at height h. */
  proj(cam) { const f = 800 / Math.tan(cam.fov * Math.PI / 360), x0 = cam.x0 || 800; return { f, p: (x, d, h) => [x0 + f * x / d, cam.horizon + f * (cam.eye - (h || 0)) / d] }; },
  /** Paving joints in perspective (screen units, one path of thin quads): cross joints every sd metres and long joints every sx
   *  metres over [x0, x1] x [d0, d1], joint w metres wide; joints closer than 3 units on screen are left out (they would fill in). */
  paving(cam, x0, x1, d0, d1, sx, sd, w) {
    const J = SCENE_SHC.proj(cam), p = J.p, f = J.f, R1 = v => Math.round(v * 10) / 10, out = [];
    const quad = (a, b, c, e) => 'M' + [a, b, c, e].map(q => R1(q[0]) + ' ' + R1(q[1])).join('L') + 'Z';
    for (let d = d0; d <= d1; d += sd) { if (f * cam.eye * sd / (d * d) < 3) break; out.push(quad(p(x0, d), p(x1, d), p(x1, d + w), p(x0, d + w))); }
    for (let x = x0; x <= x1; x += sx) { let dEnd = d0; while (dEnd < d1 && f * sx / dEnd > 3) dEnd += 1; if (dEnd > d0) out.push(quad(p(x, d0), p(x + w, d0), p(x + w, dEnd), p(x, dEnd))); }
    return out.join('');
  },
  /** A far ridge as one filled path (screen units) from row `foot` up: a smooth skyline through [X, Y] control points. */
  ridge(pts, foot) {
    const L = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; for (let j = 0; j < 8; j++) { const t = j / 8, u = (1 - Math.cos(t * Math.PI)) / 2; L.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * u]); } }
    L.push(pts[pts.length - 1]);
    return 'M' + L.map(p => Math.round(p[0]) + ' ' + Math.round(p[1] * 10) / 10).join('L') + `L${Math.round(L[L.length - 1][0])} ${foot}L${Math.round(L[0][0])} ${foot}Z`;
  },
  /** Roofs and chimneys speckled along a ridge (a hillside of terraces, screen units): returns paths for walls, roofs, windows. */
  terraces(seed, pts, n, hMin, hMax) {
    const r = SCENE_SHC.rnd(seed), at = (X) => { for (let i = 0; i < pts.length - 1; i++) if (X >= pts[i][0] && X <= pts[i + 1][0]) { const t = (X - pts[i][0]) / (pts[i + 1][0] - pts[i][0]), u = (1 - Math.cos(t * Math.PI)) / 2; return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u; } return pts[pts.length - 1][1]; };
    let wall = '', roof = '', win = '';
    for (let i = 0; i < n; i++) {
      const X = Math.round(pts[0][0] + r() * (pts[pts.length - 1][0] - pts[0][0])), Y = Math.round(at(X) + 1 + r() * (hMax - hMin) * 2.5), w = Math.round(3 + r() * 9), h = Math.round(hMin + r() * (hMax - hMin));
      wall += `M${X} ${Y}h${w}v${-h}h${-w}z`;
      roof += `M${X} ${Y - h}h${w}l-1 ${-Math.max(1, Math.round(h * 0.45))}h${2 - w}z`;
      if (r() < 0.6) win += `M${X + 1} ${Math.round(Y - h * 0.6)}h1v1h-1z`;
    }
    return { wall, roof, win };
  },

  // ---- v3: Sheaf Square from the top of Howard Street; the Cutting Edge curves from the near right down to Sheaf Street
  v3: Object.freeze({
    camera: { eye: 4.6, fov: 66, horizon: 404, heading: 104, lat: 53.37855, lon: -1.46565, water: -0.25 },
    // the sculpture's foot, near to far (its face looks to the left, toward the square), and its height along it
    edge: [[7.4, 12.5], [8.2, 18], [8.4, 24], [7.6, 30], [6.0, 36], [3.8, 42], [1.2, 48], [-1.6, 54], [-4.2, 60], [-6.4, 66]],
    height: (u) => 2.2 + 3.8 * Math.sin(Math.min(1, u * 1.25) * Math.PI * 0.62),
  }),
});

/* ---------- the Cutting Edge in v3's perspective: one variant per 2.5 m piece, anchored at the piece's near foot ---------- */
const SCENE_SHC_EDGE = (function () {
  const P = SCENE_SHC.v3, C = P.camera, J = SCENE_SHC.proj(C), f = J.f, proj = J.p;
  const dense = SCENE_SHC.line(P.edge, 0.1), arc = [0];
  for (let i = 1; i < dense.length; i++) arc.push(arc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const L = arc[arc.length - 1];
  const at = (s) => {
    s = Math.max(0, Math.min(L, s));
    let i = 1;
    while (i < arc.length - 1 && arc[i] < s) i++;
    const a = dense[i - 1], b = dense[i], u = (s - arc[i - 1]) / Math.max(1e-6, arc[i] - arc[i - 1]);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  };
  const pieces = [];
  for (let s = 0; s < L - 0.05; s += 5.5) pieces.push([s, Math.min(L, s + 5.5)]);
  const placements = (id) => pieces.map((pc, i) => {
    const q = at(pc[0]), a = proj(q[0], q[1], 0);
    return { obj: id, variant: i, x: Math.round(a[0] * 10) / 10, y: Math.round(a[1] * 10) / 10, s: 1, pin: true, layer: q[1] < 15 ? 'fore' : 'near', shadow: false, anim: false };
  });
  return { P, C, f, proj, at, L, pieces, placements };
})();

(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1, rect = SD.rect, ell = SD.ell, poly = SD.poly;
  const R = (v) => Math.round(v * 10) / 10;
  const NIGHT = { glow: { window: '#ffd98a', lamp: '#ffe6a8' }, on: 0.8 };
  const SNOW = '#eef2f6';
  const snow = (season, d, op) => (season === 'winter' ? { f: SNOW, d, op: op || 0.92 } : null);
  const wash = (cx, cy, r, d, op, col) => ({ f: { rad: [[0, col || '@flood', op], [1, col || '@flood', 0]], cx, cy, r }, d });
  const courses = (x0, y0, w, h, step) => Array.from({ length: Math.max(0, Math.floor(h / step)) }, (_, i) => `M${f1(x0)} ${f1(y0 + (i + 1) * step)}h${f1(w)}`).join('');
  const GREEN = {
    veg: { spring: ['#6f9a4a', '#4f7a36', '#9cc06a'], summer: ['#4a7a34', '#365e28', '#74a04a'], autumn: ['#a07a36', '#7a5628', '#c89a48'], winter: ['#66705e', '#4e5648', '#848c7a'] },
  };
  const pal = (base, extra) => Object.assign({ base }, SD.seasons(Object.assign({}, GREEN, extra || {})));
  const define = def => SD.define(Object.assign({ night: NIGHT, seasonal: true, shapeBySeason: true }, def));
  /** Window cells split into n glow groups (a seeded share lit at dusk), with a day reflection on each. */
  function windows(b, r, cells, n, glass, refl, arch) {
    const g = Array.from({ length: n }, () => ''); let rf = '';
    for (const [x, y, w, h] of cells) {
      const d = arch ? `M${f1(x)} ${f1(y + h)}V${f1(y + w * 0.5)}Q${f1(x + w / 2)} ${f1(y - w * 0.18)} ${f1(x + w)} ${f1(y + w * 0.5)}V${f1(y + h)}z` : rect(x, y, w, h);
      g[Math.floor(r() * n) % n] += d;
      rf += rect(x + w * 0.1, y + h * 0.08, w * 0.34, h * 0.42);
    }
    for (const d of g) if (d) b.push({ f: glass, d, glow: 'window' });
    if (rf && refl) b.push({ f: refl, d: rf, op: 0.28, detail: true });
  }

  /* =======================================================================================
     landmark.shc-town-hall: the Town Hall (E. W. Mountford, 1897) in Stoke Hall sandstone, seen from the Peace Gardens:
     the tower at the left (entrance arch, tall lights, the balcony, the clock stage, the open belfry, the cupola and Vulcan),
     the long front to the right: a rusticated ground floor of round-headed windows, the carved frieze of the city's trades,
     the tall pedimented windows of the council floor, the balustrade, the slate roof with its gabled pavilions and dormers.
     10 units a metre. Anchor: the middle of the frontage at the ground. The clock hands turn.
     ======================================================================================= */
  define({
    id: 'landmark.shc-town-hall', category: 'landmark', size: [800, 690], variants: 1, flippable: false,
    real: { h: 69, l: 80 },
    palette: pal({ stone: ['#d8c79e', '#b8a47a', '#ecdfbe', '#8e7c58', '#c8b48a'], roof: ['#5a6470', '#444c56', '#7a848e'], glass: ['#33404c', '#5e7080', '#c8d6e0'], bronze: ['#4e5a3e', '#76845a', '#2e3826'], clock: ['#f2ecd8', '#2a2a2a', '#b89a4a'], door: ['#3a2a20', '#5a4030'], flood: '#ffe2a8' },
      { stone: { winter: ['#cfc0a0', '#ad9c7c', '#e2d6bc', '#86765a', '#bcac8c'] } }),
    parts: ['body', 'hands', 'lit'], anim: { spin: { part: 'hands', pivot: [-315, -505], period: 60 } },
    shadow: { rx: 380, ry: 14, h: 260 },
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'civic', 'victorian', 'clock-tower', 'kit:urban'],
    credit: 'drawn for the Sheffield centre views: Sheffield Town Hall from the Peace Gardens (stylised; no lettering or arms)',
    build(v, r, ctx) {
      const b = [], hands = [], lit = [], season = ctx.season;
      const X0 = -262, X1 = 400, TX = -315, TW = 52;
      // ---- the long front: plinth, rusticated ground floor, frieze, council floor, entablature, balustrade
      b.push(['@stone.3', rect(X0, -10, X1 - X0, 10)]);
      b.push({ f: { lin: [[0, '@stone.2'], [0.55, '@stone.0'], [1, '@stone.4']], x1: X0, y1: 0, x2: X1, y2: 0 }, d: rect(X0, -196, X1 - X0, 186) });
      b.push(['@stone.1', rect(X0, -74, X1 - X0, 64), 0.55]);
      b.push({ s: '@stone.3', w: 0.7, op: 0.5, d: courses(X0, -74, X1 - X0, 64, 8), detail: true });
      // the bays: a projecting pavilion at the middle and at the right end (they step forward: a lit and a shaded side)
      const pav = [[40, 92], [330, 70]];
      for (const [px, pw] of pav) {
        b.push(['@stone.2', rect(px - pw / 2, -214, pw, 204)], ['@stone.1', rect(px + pw / 2 - 6, -214, 6, 204), 0.8], ['@stone.4', rect(px - pw / 2, -214, 4, 204), 0.6]);
      }
      // the frieze (the carved band of the city's trades: little figures at work, as a busy relief)
      b.push(['@stone.2', rect(X0, -92, X1 - X0, 18)], ['@stone.3', rect(X0, -76, X1 - X0, 2.4)], ['@stone.3', rect(X0, -93, X1 - X0, 2)]);
      let fr = '';
      for (let x = X0 + 4; x < X1 - 6; x += 9 + r() * 5) { const h = 9 + r() * 4; fr += `M${f1(x)} -77v${f1(-h)}a2.2 2.2 0 1 1 3 0l1.6 ${f1(h * 0.5)}l-1.6 ${f1(h * 0.5)}z`; }
      b.push({ f: '@stone.4', d: fr, op: 0.9, detail: true });
      // ground floor: round-headed windows in pairs between rusticated piers
      const cellsG = [], cellsU = [];
      const bayW = 34;
      for (let x = X0 + 14; x < X1 - 20; x += bayW) {
        if (Math.abs(x + 10 - 40) < 40 || Math.abs(x + 10 - 330) < 30) continue;
        cellsG.push([x, -62, 18, 44]);
        cellsU.push([x, -158, 18, 56]);
      }
      // the pavilions: a great round-arched doorway (middle) and triple windows
      b.push(['@stone.4', `M14 -10V-58Q40 -92 66 -58V-10z`], ['@door.0', `M20 -10V-56Q40 -84 60 -56V-10z`], { f: '@glass.0', d: `M24 -56Q40 -78 56 -56z`, glow: 'window' });
      cellsG.push([306, -62, 16, 44], [338, -62, 16, 44]);
      for (const [px] of pav) for (const dx of [-26, -8, 10]) cellsU.push([px + dx + (px === 330 ? 3 : 0), -166, 14, 66]);
      for (const [x, y, w, h] of cellsG) b.push(['@stone.3', `M${f1(x - 3)} ${f1(y + h + 2)}V${f1(y + w * 0.5)}Q${f1(x + w / 2)} ${f1(y - w * 0.4)} ${f1(x + w + 3)} ${f1(y + w * 0.5)}V${f1(y + h + 2)}z`, 0.7]);
      windows(b, r, cellsG, 3, '@glass.0', '@glass.2', true);
      // council floor: tall mullion-and-transom windows with alternating pediments
      cellsU.forEach(([x, y, w, h], i) => {
        b.push(['@stone.3', rect(x - 3, y - 3, w + 6, h + 7), 0.55], ['@stone.2', rect(x - 4, y + h + 2, w + 8, 3)]);
        b.push({ f: '@stone.2', detail: true, d: i % 2 ? `M${f1(x - 5)} ${f1(y - 4)}Q${f1(x + w / 2)} ${f1(y - 14)} ${f1(x + w + 5)} ${f1(y - 4)}z` : `M${f1(x - 5)} ${f1(y - 4)}L${f1(x + w / 2)} ${f1(y - 14)}L${f1(x + w + 5)} ${f1(y - 4)}z` });
      });
      windows(b, r, cellsU, 4, '@glass.0', '@glass.2');
      b.push({ s: '@stone.2', w: 1.2, d: cellsU.map(([x, y, w, h]) => `M${f1(x + w / 2)} ${f1(y)}v${f1(h)}M${f1(x)} ${f1(y + h * 0.3)}h${f1(w)}`).join(''), detail: true });
      // pilasters between the bays of the council floor
      let pil = '';
      for (let x = X0 + 6; x < X1; x += bayW) pil += rect(x, -170, 3.6, 74);
      b.push({ f: '@stone.2', d: pil, op: 0.85 });
      // entablature, balustrade, urns
      b.push(['@stone.2', rect(X0 - 2, -184, X1 - X0 + 4, 12)], ['@stone.3', rect(X0 - 2, -173, X1 - X0 + 4, 2)], ['@stone.0', rect(X0, -198, X1 - X0, 14)]);
      b.push({ s: '@stone.3', w: 1.4, op: 0.75, detail: true, d: Array.from({ length: Math.floor((X1 - X0) / 7) }, (_, i) => `M${X0 + 4 + i * 7} -196v10`).join('') });
      b.push(['@stone.2', rect(X0 - 2, -201, X1 - X0 + 4, 4)]);
      for (let x = X0 + 30; x < X1; x += 68) b.push({ f: '@stone.2', d: `M${x - 3} -201v-9q3 -6 6 0v9z`, detail: true });
      // the roof: slate, steep, with the pavilions' gables and the dormers between
      const roofD = poly([[X0 + 4, -201], [X0 + 26, -262], [X1 - 26, -262], [X1 - 4, -201]]);
      b.push({ f: { lin: [[0, '@roof.2'], [1, '@roof.0']], x1: 0, y1: -262, x2: 0, y2: -201 }, d: roofD });
      b.push({ s: '@roof.1', w: 0.6, op: 0.45, d: courses(X0 + 20, -262, X1 - X0 - 40, 60, 5), detail: true });
      b.push(['@roof.1', rect(X0 + 26, -266, X1 - X0 - 52, 4)]);
      for (const [px, pw] of pav) {
        const top = -300;
        b.push(['@stone.0', `M${px - pw / 2} -201V-246L${px - pw / 2 + 8} -252L${px - pw / 2 + 14} -262Q${px - pw / 4} -268 ${px - 8} ${top + 12}L${px} ${top}L${px + 8} ${top + 12}Q${px + pw / 4} -268 ${px + pw / 2 - 14} -262L${px + pw / 2 - 8} -252L${px + pw / 2} -246V-201z`]);
        b.push(['@stone.1', `M${px + 4} ${top + 6}L${px + 8} ${top + 12}Q${px + pw / 4} -268 ${px + pw / 2 - 14} -262L${px + pw / 2 - 8} -252L${px + pw / 2} -246V-201H${px + 4}z`, 0.35]);
        b.push({ f: '@glass.0', d: `M${px - 9} -212V-246Q${px} -260 ${px + 9} -246V-212z`, glow: 'window' }, { s: '@stone.2', w: 1.2, d: `M${px} -212V-252M${px - 9} -230h18` });
        b.push(['@stone.2', `M${px - 2} ${top}v-14h4v14z`], ['@stone.2', ell(px, top - 16, 3, 3)]);
        b.push(snow(season, `M${px - pw / 2 + 14} -262Q${px - pw / 4} -268 ${px - 8} ${top + 12}L${px} ${top}L${px + 8} ${top + 12}Q${px + pw / 4} -268 ${px + pw / 2 - 14} -262L${px + pw / 2 - 18} -260Q${px + pw / 4} -264 ${px + 6} ${top + 16}L${px} ${top + 6}L${px - 6} ${top + 16}Q${px - pw / 4} -264 ${px - pw / 2 + 18} -260z`, 0.8));
      }
      for (const dx of [-210, -150, -90, 130, 190, 250]) {
        b.push(['@stone.0', `M${dx - 9} -204V-232L${dx} -244L${dx + 9} -232V-204z`], { f: '@glass.0', d: rect(dx - 5, -230, 10, 20), glow: 'window' });
        b.push(snow(season, `M${dx - 10} -232L${dx} -245L${dx + 10} -232L${dx + 6} -232L${dx} -240L${dx - 6} -232z`, 0.85));
      }
      // tall chimneys and a small fleche on the ridge
      for (const cx of [-120, 210]) b.push(['@stone.1', rect(cx - 5, -290, 10, 30)], ['@stone.2', rect(cx - 7, -292, 14, 4)]);
      b.push(['@roof.1', `M118 -262l4 -26l4 26z`], ['@bronze.0', rect(121, -300, 2, 14)]);
      b.push(snow(season, poly([[X0 + 6, -203], [X0 + 26, -262], [X1 - 26, -262], [X1 - 6, -203], [X1 - 14, -203], [X1 - 30, -254], [X0 + 30, -254], [X0 + 14, -203]]), 0.72));
      // ---- the tower
      const tl = TX - TW, tr = TX + TW;
      b.push({ f: { lin: [[0, '@stone.2'], [0.6, '@stone.0'], [1, '@stone.1']], x1: tl, y1: 0, x2: tr, y2: 0 }, d: rect(tl, -470, 2 * TW, 470) });
      b.push({ s: '@stone.3', w: 0.6, op: 0.4, d: courses(tl, -470, 2 * TW, 470, 9), detail: true });
      b.push(['@stone.2', rect(tl - 4, -470, 8, 470)], ['@stone.1', rect(tr - 6, -470, 8, 470), 0.9]);
      // the entrance arch and porch
      b.push(['@stone.2', `M${TX - 34} -6V-70Q${TX} -116 ${TX + 34} -70V-6z`], ['@door.0', `M${TX - 24} -6V-68Q${TX} -100 ${TX + 24} -68V-6z`]);
      b.push({ f: '@glass.0', d: `M${TX - 20} -70Q${TX} -94 ${TX + 20} -70z`, glow: 'lamp' }, ['@door.1', rect(TX - 2, -66, 4, 60)]);
      b.push(['@stone.3', rect(TX - 40, -6, 80, 6)]);
      // tall lights up the shaft, string courses
      for (const [y, h] of [[-200, 70], [-310, 80], [-400, 50]]) {
        b.push({ f: '@glass.0', d: `M${TX - 12} ${y + h}V${y + 8}Q${TX - 6} ${y - 2} ${TX} ${y + 8}Q${TX + 6} ${y - 2} ${TX + 12} ${y + 8}V${y + h}z`, glow: 'window' }, { s: '@stone.2', w: 1.4, d: `M${TX} ${y + 6}v${h - 6}` });
        b.push(['@stone.2', rect(tl - 2, y + h + 6, 2 * TW + 4, 4)]);
      }
      b.push(['@stone.2', rect(tl - 2, -134, 2 * TW + 4, 5)]);
      // the balcony and its balustrade below the clock stage
      b.push(['@stone.2', rect(tl - 8, -474, 2 * TW + 16, 8)], ['@stone.0', rect(tl - 6, -486, 2 * TW + 12, 12)]);
      b.push({ s: '@stone.3', w: 1.2, op: 0.8, detail: true, d: Array.from({ length: 16 }, (_, i) => `M${tl - 2 + i * 7} -485v10`).join('') });
      // the clock stage: recessed, a face on the front, corner turrets
      b.push(['@stone.0', rect(tl + 4, -546, 2 * TW - 8, 60)], ['@stone.1', rect(tr - 18, -546, 14, 60), 0.6]);
      for (const cx of [tl + 4, tr - 4]) b.push(['@stone.2', rect(cx - 6, -560, 12, 76)], ['@stone.2', `M${cx - 7} -560L${cx} -578L${cx + 7} -560z`]);
      b.push(['@stone.2', ell(TX, -505, 25, 25)], ['@clock.2', ell(TX, -505, 23, 23)], { f: '@clock.0', d: ell(TX, -505, 21, 21), glow: 'lamp' });
      b.push({ s: '@clock.1', w: 1.1, d: Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `M${f1(TX + Math.cos(a) * 17)} ${f1(-505 + Math.sin(a) * 17)}L${f1(TX + Math.cos(a) * 20)} ${f1(-505 + Math.sin(a) * 20)}`; }).join('') });
      hands.push({ s: '@clock.1', w: 2.4, d: `M${TX} -505L${TX} -521M${TX} -505L${TX + 11} -505` });
      // the open belfry: an arcade of columns under a cornice
      b.push(['@stone.2', rect(tl, -552, 2 * TW, 6)], ['@roof.1', rect(tl + 10, -600, 2 * TW - 20, 48)]);
      for (let i = 0; i < 5; i++) { const cx = tl + 12 + i * (2 * TW - 24) / 4; b.push(['@stone.0', rect(cx - 3.5, -600, 7, 48)]); }
      b.push({ f: '@glass.1', d: rect(tl + 16, -596, 2 * TW - 32, 30), op: 0.15, glow: 'lamp' });
      b.push(['@stone.2', rect(tl - 4, -608, 2 * TW + 8, 8)], ['@stone.0', rect(tl + 6, -620, 2 * TW - 12, 12)]);
      // the cupola, its lantern, the figure of Vulcan on the top (hammer down, arm raised)
      b.push(['@roof.0', `M${tl + 14} -620Q${TX} -666 ${tr - 14} -620z`], ['@roof.2', `M${tl + 20} -622Q${TX - 14} -652 ${TX - 4} -658Q${TX - 20} -640 ${tl + 26} -622z`, 0.6]);
      b.push(['@stone.2', rect(TX - 7, -672, 14, 14)], ['@stone.0', rect(TX - 9, -676, 18, 4)]);
      b.push(['@bronze.0', `M${TX - 3} -676l-1 -10l-3 -9l2 -5l2 -6a3 3 0 1 1 4 0l2 6l6 -4l1 2l-6 6l1 10l-2 10z`], ['@bronze.1', `M${TX - 2} -700l1 -4h2l-1 4z`, 0.8]);
      b.push({ s: '@bronze.2', w: 1.4, d: `M${TX - 5} -690l-6 9M${TX - 12} -682l3 -3` });
      b.push(snow(season, `M${tl + 14} -620Q${TX} -666 ${tr - 14} -620L${tr - 22} -620Q${TX} -656 ${tl + 22} -620z`, 0.85), snow(season, rect(tl - 6, -488, 2 * TW + 12, 3), 0.9));
      // ---- night: floodlit stone (warm washes on the tower and the front), lit clock
      lit.push(wash(TX, -300, 330, rect(tl - 4, -700, 2 * TW + 8, 700), 0.4), wash(60, -120, 300, rect(X0, -300, X1 - X0, 300), 0.3), wash(330, -120, 140, rect(250, -300, 150, 300), 0.25));
      return { body: b, hands, lit };
    },
  });

  /* =======================================================================================
     landmark.shc-winter-garden: the Winter Garden (2003): glulam larch arches (weathered silver-gold) and glass, 70 m long and
     22 m high. v0 the long side (the arches stand as ribs; the vault shoulders curve down at each end; the glass shows the
     planting inside: Norfolk Island pines, tree ferns, palms), v1 the parabolic end with its door. 10 units a metre.
     ======================================================================================= */
  define({
    id: 'landmark.shc-winter-garden', category: 'landmark', size: [780, 250], variants: 2, flippable: false,
    real: { h: 25, l: 78 },
    palette: pal({ glass: ['#7e98a8', '#a8bfcc', '#d6e4ec', '#4c6270'], larch: ['#b89a6c', '#8e7452', '#d2b88c', '#6a5640'], plant: ['#2e5a34', '#3e6e3a', '#5a8a46', '#1e4028', '#7aa858'], stone: ['#c8c0b0', '#a29a8a'], dark: ['#26302e'], flood: '#ffe8b8' },
      { glass: { winter: ['#8a9ca8', '#b0c0ca', '#dce6ec', '#56687a'] } }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.25, 1], period: 6 } },
    shadow: { rx: 380, ry: 12, h: 200 },
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'glasshouse', 'garden', 'symmetric', 'kit:urban'],
    credit: 'drawn for the Sheffield centre views: the Winter Garden (stylised)',
    build(v, r, ctx) {
      const b = [], g = [], lit = [], season = ctx.season;
      if (v === 0) {
        const W = 370, H = 222, sh = 112;
        const top = (x) => { const a = Math.abs(x); if (a <= W - sh) return -H; const t = (a - (W - sh)) / sh; return -H + (H - 70) * (1 - Math.sqrt(Math.max(0, 1 - t * t))); };
        const outline = []; for (let x = -W; x <= W; x += 6) outline.push([x, top(x)]);
        const outD = 'M' + [[-W, 0]].concat(outline, [[W, 0]]).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
        // the planting inside: tall pines and palms, tree ferns, a dense understorey
        b.push({ f: '@dark.0', d: outD, op: 0.9 });
        for (let i = 0; i < 26; i++) { const x = -W + 30 + r() * (2 * W - 60), hh = 40 + r() * (H - 70); b.push(['@plant.' + Math.floor(r() * 4), SD.blob(r, x, -hh * 0.5 - 6, 18 + r() * 22, hh * 0.5, 9, 0.45)]); }
        for (const x of [-210, -40, 120, 260]) { b.push(['@plant.3', rect(x - 2, -H + 40, 4, H - 40)]); for (let k = 0; k < 7; k++) { const y = -H + 44 + k * 20, w = 12 + k * 6; b.push(['@plant.' + (k % 2 ? 0 : 1), `M${x - w} ${y + 8}L${x} ${y - 6}L${x + w} ${y + 8}z`]); } }
        for (let i = 0; i < 9; i++) { const x = -W + 40 + r() * (2 * W - 80), y = -30 - r() * 60; for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.45; b.push({ f: '@plant.4', d: SD.leaf(x, y, a, 30, 6), op: 0.9 }); } }
        b.push(['@plant.1', 'M' + Array.from({ length: 40 }, (_, i) => { const x = -W + i * (2 * W / 39); return f1(x) + ' ' + f1(-16 - 10 * Math.abs(Math.sin(i * 1.3))); }).join('L') + `L${W} 0L${-W} 0z`]);
        // the glass skin over it, paler up the vault (the sky in it), then the panes, the larch ribs and their arches
        b.push({ f: { lin: [[0, '@glass.2', 0.78], [0.45, '@glass.1', 0.5], [1, '@glass.0', 0.3]], x1: 0, y1: -H, x2: 0, y2: 0 }, d: outD });
        b.push({ f: '@glass.1', d: outD, op: 0.22, glow: 'window' });
        let bars = '';
        for (let y = -20; y > -H; y -= 22) { let xx = W; while (xx > 0 && top(xx) > y) xx -= 2; bars += `M${f1(-xx)} ${y}H${f1(xx)}`; }
        b.push({ s: '@larch.1', w: 1, op: 0.7, d: bars });
        const ribs = [];
        for (let x = -W; x <= W + 0.1; x += 37) ribs.push(x);
        for (const x of ribs) {
          const t = top(x);
          b.push({ f: '@larch.1', d: rect(x - 3.4, t, 6.8, -t) }, { f: '@larch.2', d: rect(x - 3.4, t, 2.4, -t), op: 0.8 });
        }
        b.push({ s: '@larch.0', w: 6, d: 'M' + outline.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') });
        b.push({ s: '@larch.2', w: 2, d: 'M' + outline.map(p => f1(p[0]) + ' ' + f1(p[1] + 2)).join('L'), op: 0.8 });
        b.push(snow(season, 'M' + outline.map(p => f1(p[0]) + ' ' + f1(p[1] - 3)).join('L') + 'L' + outline.slice().reverse().map(p => f1(p[0]) + ' ' + f1(p[1] + 2)).join('L') + 'z', 0.85));
        // the plinth, the glazed doors in the middle with a steel canopy
        b.push(['@stone.0', rect(-W - 4, -8, 2 * W + 8, 8)], ['@stone.1', rect(-W - 4, -2, 2 * W + 8, 2)]);
        b.push(['@dark.0', rect(-30, -44, 60, 36)], { f: '@glass.2', d: rect(-26, -40, 24, 32), glow: 'lamp' }, { f: '@glass.2', d: rect(2, -40, 24, 32), glow: 'lamp' }, ['@stone.1', rect(-40, -50, 80, 6)]);
        g.push({ f: '#ffffff', d: `M-170 ${-H + 8}l26 0l-60 150l-26 0z`, op: 0.3 }, { f: '#ffffff', d: `M150 ${-H + 6}l18 0l-50 130l-18 0z`, op: 0.25 }, { f: '#ffffff', d: `M-${W - 30} -110l14 0l-30 80l-14 0z`, op: 0.2 });
        lit.push(wash(0, -100, 400, outD, 0.55));
      } else {
        const Wd = 150, Ht = 228, P = (x) => -Ht * (1 - (x / Wd) * (x / Wd));
        const outer = []; for (let i = 0; i <= 30; i++) { const x = -Wd + i * (2 * Wd / 30); outer.push([x, P(x)]); }
        const outD = 'M' + outer.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
        b.push({ f: '@dark.0', d: outD, op: 0.9 });
        for (let i = 0; i < 12; i++) { const x = -110 + r() * 220, hh = 40 + r() * 140; b.push(['@plant.' + Math.floor(r() * 4), SD.blob(r, x, -hh * 0.5, 16 + r() * 18, hh * 0.5, 8, 0.4)]); }
        b.push({ f: { lin: [[0, '@glass.2', 0.75], [1, '@glass.0', 0.32]], x1: 0, y1: -Ht, x2: 0, y2: 0 }, d: outD }, { f: '@glass.1', d: outD, op: 0.2, glow: 'window' });
        for (let x = -Wd; x < Wd; x += 15) b.push({ s: '@larch.1', w: 1.2, d: `M${f1(x)} 0V${f1(P(x))}` });
        for (let k = 1; k <= 8; k++) { const y = -k * 24, xx = Wd * Math.sqrt(Math.max(0, 1 + y / Ht)); b.push({ s: '@larch.1', w: 1, op: 0.8, d: `M${f1(-xx)} ${y}H${f1(xx)}` }); }
        for (const k of [1, 0.88, 0.76]) { const pts = []; for (let i = 0; i <= 30; i++) { const x = (-Wd + i * (2 * Wd / 30)) * k; pts.push([x, -Ht * k * (1 - (x / (Wd * k)) ** 2)]); } b.push({ s: k === 1 ? '@larch.0' : '@larch.2', w: k === 1 ? 7 : 3, op: k === 1 ? 1 : 0.8, d: 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') }); }
        b.push(snow(season, 'M' + outer.slice(6, 25).map(p => f1(p[0]) + ' ' + f1(p[1] - 3)).join('L') + 'L' + outer.slice(6, 25).reverse().map(p => f1(p[0]) + ' ' + f1(p[1] + 3)).join('L') + 'z', 0.85));
        b.push(['@stone.0', rect(-Wd - 6, -6, 2 * Wd + 12, 6)], ['@dark.0', rect(-22, -48, 44, 42)], { f: '@glass.2', d: rect(-18, -44, 36, 38), glow: 'lamp' });
        g.push({ f: '#ffffff', d: `M-60 -170l12 0l-36 120l-12 0z`, op: 0.3 });
        lit.push(wash(0, -60, 170, outD, 0.5));
      }
      return { body: b, glint: g, lit };
    },
  });

  /* =======================================================================================
     landmark.shc-st-pauls-tower: St Paul's Tower (2010), 32 storeys, the city's tallest: a slim slab in white panels with a
     glazed corner, a stepped crown, on a two-storey glass podium of shops and cafes. 10 units a metre.
     ======================================================================================= */
  define({
    id: 'landmark.shc-st-pauls-tower', category: 'landmark', size: [260, 1030], variants: 1, flippable: false,
    real: { h: 103, l: 26 },
    palette: pal({ white: ['#eceee9', '#cdd2d0', '#f8f9f6', '#a6aeae'], glass: ['#40566a', '#6e8aa0', '#b8ccd8', '#2a3a48'], dark: ['#2a3036'], flood: '#e8f0ff' }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.3, 1], period: 7 } },
    shadow: { rx: 120, ry: 10, h: 900 },
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'tower', 'residential', 'kit:urban'],
    credit: "drawn for the Sheffield centre views: St Paul's Tower (stylised)",
    build(v, r, ctx) {
      const b = [], g = [], lit = [];
      const L = -110, Rr = 110, base = -64, fh = 29.5, n = 31, top = base - n * fh;
      // podium: two glass storeys, a canopy, a darker plinth
      b.push(['@dark.0', rect(-130, -64, 260, 64)], { f: '@glass.1', d: rect(-124, -58, 248, 50), glow: 'lamp' }, ['@white.1', rect(-134, -66, 268, 6)]);
      b.push({ s: '@dark.0', w: 2, d: Array.from({ length: 9 }, (_, i) => `M${-124 + i * 31} -58v50`).join('') });
      // the shaft: white panel bands with the window rows between; the glazed corner on the right
      b.push({ f: { lin: [[0, '@white.2'], [0.6, '@white.0'], [1, '@white.1']], x1: L, y1: 0, x2: Rr, y2: 0 }, d: rect(L, top, Rr - L, base - top) });
      const cells = [];
      for (let j = 0; j < n; j++) {
        const y = base - (j + 1) * fh + 6;
        for (let i = 0; i < 6; i++) cells.push([L + 8 + i * 25, y, 19, fh - 13]);
      }
      windows(b, r, cells, 5, '@glass.0', '@glass.2');
      // the glazed corner: a full-height glass strip, its balconies
      b.push({ f: { lin: [[0, '@glass.2'], [1, '@glass.3']], x1: 0, y1: top, x2: 0, y2: base }, d: rect(Rr - 52, top, 52, base - top) });
      windows(b, r, Array.from({ length: n }, (_, j) => [Rr - 48, base - (j + 1) * fh + 3, 44, fh - 6]), 4, '@glass.0', null);
      b.push({ s: '@white.3', w: 1.2, d: Array.from({ length: n }, (_, j) => `M${Rr - 52} ${f1(base - j * fh)}h52`).join('') });
      b.push(['@white.3', rect(Rr - 54, top, 3, base - top), 0.8], ['@white.3', rect(L, top, 3, base - top), 0.5]);
      // the crown: stepped white frames, a lit fin
      b.push(['@white.0', rect(L + 6, top - 26, Rr - L - 12, 26)], ['@white.1', rect(L + 24, top - 46, Rr - L - 60, 20)], ['@dark.0', rect(L + 30, top - 40, Rr - L - 72, 12)]);
      b.push({ f: '@glass.2', d: rect(L + 34, top - 38, Rr - L - 80, 8), glow: 'lamp' });
      g.push({ f: '#ffffff', d: `M${Rr - 40} ${top + 20}l14 0l-14 260l-14 0z`, op: 0.35 }, { f: '#ffffff', d: `M${Rr - 30} ${top + 420}l10 0l-12 200l-10 0z`, op: 0.25 });
      lit.push(wash(0, top - 30, 120, rect(L, top - 50, Rr - L, 80), 0.5));
      return { body: b, glint: g, lit };
    },
  });

  /* =======================================================================================
     landmark.shc-station: the Midland station's stone front on Sheaf Street (1870, the porte-cochere 1905): a long arcade of
     round arches (glass behind, the booking hall lit at night) under a balustraded parapet, two-storey pavilions with hipped
     slate roofs at each end, the trainshed's glazed roof showing above. 10 units a metre.
     ======================================================================================= */
  define({
    id: 'landmark.shc-station', category: 'landmark', size: [1120, 200], variants: 1, flippable: false,
    real: { h: 20, l: 112 },
    palette: pal({ stone: ['#cdb88e', '#a8946a', '#e2d2ac', '#7c6a4c'], roof: ['#56606a', '#3e464e', '#7a848e'], glass: ['#3a4856', '#6e8090', '#b8c8d4'], shed: ['#8a9aa4', '#c4d0d6'], dark: ['#2a2622'], flood: '#ffe2a8' }),
    parts: ['body', 'lit'],
    shadow: { rx: 540, ry: 10, h: 150 },
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'station', 'victorian', 'kit:urban'],
    credit: 'drawn for the Sheffield centre views: Sheffield station, the Sheaf Street front (stylised; no lettering)',
    build(v, r, ctx) {
      const b = [], lit = [], season = ctx.season;
      // the trainshed roof behind (glazed ridge-and-furrow)
      b.push(['@shed.0', rect(-520, -168, 1040, 40)]);
      for (let x = -520; x < 520; x += 40) b.push(['@shed.1', `M${x} -150L${x + 20} -170L${x + 40} -150z`, 0.8]);
      // the arcade
      const A0 = -360, A1 = 360, n = 13, aw = (A1 - A0) / n;
      b.push({ f: { lin: [[0, '@stone.2'], [1, '@stone.0']], x1: A0, y1: 0, x2: A1, y2: 0 }, d: rect(A0, -112, A1 - A0, 112) });
      b.push({ s: '@stone.3', w: 0.6, op: 0.45, d: courses(A0, -112, A1 - A0, 112, 9), detail: true });
      const cells = [];
      for (let i = 0; i < n; i++) {
        const x = A0 + i * aw + 6, w = aw - 12;
        b.push(['@stone.3', `M${f1(x - 3)} 0V-52Q${f1(x + w / 2)} ${-52 - w * 0.62} ${f1(x + w + 3)} -52V0z`, 0.8]);
        cells.push([x, -80, w, 80]);
      }
      windows(b, r, cells, 3, '@glass.0', '@glass.2', true);
      b.push({ s: '@stone.3', w: 1.2, op: 0.6, d: cells.map(([x, y, w]) => `M${f1(x + w / 2)} -60v60M${f1(x)} -40h${f1(w)}`).join(''), detail: true });
      for (let i = 0; i <= n; i++) b.push(['@stone.2', rect(A0 + i * aw - 4, -100, 8, 100)]);
      b.push(['@stone.2', rect(A0 - 4, -118, A1 - A0 + 8, 10)], ['@stone.0', rect(A0, -134, A1 - A0, 16)], ['@stone.2', rect(A0 - 4, -138, A1 - A0 + 8, 4)]);
      b.push({ s: '@stone.3', w: 1.6, op: 0.7, d: Array.from({ length: Math.floor((A1 - A0) / 8) }, (_, i) => `M${A0 + 4 + i * 8} -133v13`).join('') });
      for (let x = A0; x <= A1; x += aw * 2) b.push(['@stone.2', `M${f1(x - 4)} -138v-10h8v10z`]);
      // the pavilions at each end and the middle block
      for (const [cx, w] of [[-440, 160], [440, 160]]) {
        const x0 = cx - w / 2;
        b.push({ f: { lin: [[0, '@stone.2'], [1, '@stone.0']], x1: x0, y1: 0, x2: x0 + w, y2: 0 }, d: rect(x0, -146, w, 146) }, ['@stone.1', rect(x0 + w - 8, -146, 8, 146), 0.6]);
        b.push({ s: '@stone.3', w: 0.6, op: 0.4, d: courses(x0, -146, w, 146, 9), detail: true });
        const c2 = [];
        for (let i = 0; i < 4; i++) { c2.push([x0 + 16 + i * 36, -128, 18, 40]); c2.push([x0 + 16 + i * 36, -64, 18, 46]); }
        for (const [x, y, ww, h] of c2) b.push(['@stone.3', rect(x - 3, y - 4, ww + 6, h + 8), 0.5]);
        windows(b, r, c2, 3, '@glass.0', '@glass.2');
        b.push(['@stone.2', rect(x0 - 3, -150, w + 6, 6)], ['@stone.2', rect(x0 - 3, -78, w + 6, 4)]);
        b.push(['@roof.0', poly([[x0 + 2, -150], [x0 + 24, -190], [x0 + w - 24, -190], [x0 + w - 2, -150]])], ['@roof.1', poly([[x0 + w - 50, -190], [x0 + w - 24, -190], [x0 + w - 2, -150], [x0 + w - 30, -150]]), 0.6]);
        b.push(['@stone.1', rect(x0 + 30, -204, 12, 22)], ['@stone.1', rect(x0 + w - 42, -204, 12, 22)]);
        b.push(snow(season, poly([[x0 + 4, -152], [x0 + 24, -190], [x0 + w - 24, -190], [x0 + w - 4, -152], [x0 + w - 12, -152], [x0 + w - 28, -184], [x0 + 28, -184], [x0 + 12, -152]]), 0.75));
      }
      b.push(snow(season, rect(A0, -140, A1 - A0, 3), 0.9));
      lit.push(wash(0, -60, 520, rect(A0, -140, A1 - A0, 140), 0.38), wash(-440, -80, 120, rect(-520, -200, 160, 200), 0.25), wash(440, -80, 120, rect(360, -200, 160, 200), 0.25));
      return { body: b, lit };
    },
  });

  /* =======================================================================================
     landmark.shc-park-hill: Park Hill (1961) on its hill above the station: the long deck-access slab whose roofline stays
     level while the ground falls, so it is 4 storeys at the top of the hill and 13 at the foot. The concrete frame, the wide
     beams of the decks every third floor; the refurbished block's anodised panels graded red to orange to yellow to green,
     the rest in its original graded brick. The hill under it: grass, trees, the path. 4 units a metre (250 m by 80 m).
     ======================================================================================= */
  define({
    id: 'landmark.shc-park-hill', category: 'landmark', size: [1000, 330], variants: 1, flippable: false,
    real: { h: 82, l: 250 },
    palette: pal({ concrete: ['#c9c3b6', '#a39d90', '#ddd8cc', '#7e786e'], panel: ['#c8402a', '#e0702a', '#e8b030', '#a8c040', '#6aa848'], brick: ['#8a4a34', '#a8643e', '#c08a52', '#6e3a2a'], glass: ['#2e3a44', '#5a6a78'], hill: ['#5e8a3e', '#4a7232', '#7aa452'], tree: ['#2e5a2a', '#3e6e34', '#5a8840'], path: ['#b8b0a0'], flood: '#ffe4b0' },
      { hill: { autumn: ['#7e8a42', '#646e34', '#9aa452'], winter: ['#76806a', '#5e6856', '#8e9682'] }, tree: { autumn: ['#8a5a26', '#b07a30', '#c89a3e'], winter: ['#5a5248', '#6a6258', '#7a7268'] } }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.3, 1], period: 8 } },
    shadow: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'brutalist', 'housing', 'kit:urban'],
    credit: 'drawn for the Sheffield centre views: Park Hill flats on their hill (stylised)',
    build(v, r, ctx) {
      const b = [], g = [], lit = [], season = ctx.season;
      const X0 = -470, X1 = 470, roof = -318, fh = 12;
      const ground = (x) => -96 - 112 * (x - X0) / (X1 - X0) - 8 * Math.sin((x - X0) / 140);
      // the hill: the slope down to the station, trees in clumps, a path zig-zagging up
      const hill = [[-500, 0]]; for (let x = -500; x <= 500; x += 20) hill.push([x, ground(Math.max(X0, Math.min(X1, x))) + 6]); hill.push([500, 0]);
      b.push({ f: { lin: [[0, '@hill.2'], [1, '@hill.1']], x1: 0, y1: -220, x2: 0, y2: 0 }, d: poly(hill) });
      b.push({ s: '@path.0', w: 2.4, d: 'M-380 -6L-180 -40L-330 -64L-60 -100L-200 -120L90 -150', op: 0.8 });
      // the slab: frame, then infill per storey, then the deck beams
      const top = []; for (let x = X0; x <= X1; x += 10) top.push([x, roof]);
      const slab = poly([[X0, roof]].concat([[X1, roof]], Array.from({ length: 95 }, (_, i) => { const x = X1 - i * 10; return [x, ground(x)]; })));
      b.push(['@concrete.0', slab]);
      const split = 30, runsBy = {}, I = Math.round;
      const colAt = (x, y) => { const gy = ground(x + 5); if (y >= gy - 2) return null; const k = (y - roof) / (fh * 13); return (x < split ? '@panel.' + Math.max(0, Math.min(4, Math.floor((1 - k) * 5))) : '@brick.' + Math.max(0, Math.min(3, Math.floor(k * 3.6)))) + '|' + ((x > -140 && x < 40) ? 's' : 'n'); };
      for (let y = roof + 3; y < -96; y += fh) {
        let run = null, x0 = X0;
        const flush = (xe) => { if (run) runsBy[run] = (runsBy[run] || '') + `M${x0} ${I(y)}h${xe - x0}v${(fh - 3.4).toFixed(1)}h${x0 - xe}z`; };
        for (let x = X0; x <= X1; x += 10) { const k = x < X1 ? colAt(x, y) : null; if (k !== run) { flush(x); run = k; x0 = x; } }
      }
      for (const [key, d] of Object.entries(runsBy)) { const [col, shade] = key.split('|'); b.push({ f: col, d, op: shade === 's' ? 0.82 : 1 }); }
      const wins = ['', '', '', ''];
      for (let x = X0; x < X1; x += 10) { const gy = ground(x + 5); for (let y = roof + 3; y < gy - 2; y += fh) if (r() < 0.26) wins[Math.floor(r() * 4)] += `M${x + (r() < 0.5 ? 2 : 5)} ${I(y + 2)}h3v${fh - 6}h-3z`; }
      for (const d of wins) if (d) b.push({ f: '@glass.0', d, glow: 'window' });
      let beams = '';
      for (let y = roof; y < -96; y += fh * 3) { let xEnd = X1; while (xEnd > X0 && ground(xEnd) < y + 4) xEnd -= 5; if (xEnd > X0) beams += rect(X0, y, xEnd - X0, 3.2); }
      b.push({ f: '@concrete.2', d: beams }, ['@concrete.2', rect(X0, roof - 4, X1 - X0, 5)]);
      let cols = ''; for (let x = X0; x <= X1; x += 10) cols += `M${x} ${roof}V${f1(ground(x))}`;
      b.push({ s: '@concrete.3', w: 1.1, d: cols, op: 0.7 });
      // the block bends (the slab turns: a shaded run) and the lift towers
      b.push(['@concrete.3', rect(-142, roof, 4, ground(-142) - roof), 0.6], ['@concrete.3', rect(38, roof, 4, ground(38) - roof), 0.6]);
      for (const x of [-330, -60, 230]) b.push(['@concrete.0', rect(x - 7, roof - 22, 14, ground(x) - roof + 22)], ['@concrete.1', rect(x + 3, roof - 22, 4, ground(x) - roof + 22), 0.7]);
      b.push(snow(season, rect(X0, roof - 6, X1 - X0, 3), 0.9));
      // trees on the hill in front, in clumps (not in a line)
      let twig = '', trunk = ''; const crowns = ['', '', ''];
      const clumps = [[-480, -40, 5], [-400, -70, 4], [-250, -84, 6], [-120, -96, 4], [20, -132, 5], [160, -160, 6], [300, -180, 4], [420, -196, 5]];
      for (const [cx, cy, n] of clumps) for (let i = 0; i < n; i++) {
        const x = cx + (r() - 0.5) * 70, y = cy + 12 + r() * 50, s = 9 + r() * 10;
        if (season === 'winter') { const X = Math.round(x), Y = Math.round(y), S2 = Math.round(s); twig += `M${X} ${Y}v${-S2}l${-Math.round(s * 0.7)} ${-S2}M${X} ${Y - S2}l${Math.round(s * 0.6)} ${-S2}M${X} ${Y - S2}v${-S2}`; }
        else crowns[Math.floor(r() * 3)] += SD.blob(r, x, y - s, s, s * 1.1, 7, 0.35);
      }
      if (twig) b.push({ s: '@tree.0', w: 1.4, d: twig, op: 0.8 });
      crowns.forEach((d, i) => { if (d) b.push(['@tree.' + i, d]); });
      g.push({ f: '#ffffff', d: rect(X0 + 10, roof + 4, 180, 2), op: 0.3 });
      lit.push(wash(0, -200, 500, slab, 0.18));
      return { body: b, glint: g, lit };
    },
  });

  /* landmark.shc-cathedral: the Cathedral, small and far for the skyline: the nave, the crossing tower and its short spire. */
  define({
    id: 'landmark.shc-cathedral', category: 'landmark', size: [400, 480], variants: 1, flippable: false,
    real: { h: 48, l: 40 },
    palette: pal({ stone: ['#a89a80', '#857862', '#c4b89e'], roof: ['#55606a', '#3e464e'], glass: ['#334050'], flood: '#ffe2a8' }),
    parts: ['body', 'lit'], shadow: false,
    tags: ['landmark', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'cathedral', 'gothic', 'kit:urban'],
    credit: 'drawn for the Sheffield centre views: Sheffield Cathedral (stylised, small)',
    build(v, r, ctx) {
      const b = [], lit = [];
      b.push(['@stone.0', rect(-190, -120, 380, 120)], ['@roof.0', poly([[-194, -120], [-170, -170], [190, -170], [194, -120]])]);
      for (let x = -170; x < 180; x += 34) b.push({ f: '@glass.0', d: `M${x} -20V-80Q${x + 8} -96 ${x + 16} -80V-20z`, glow: 'window' }, ['@stone.2', rect(x + 22, -118, 6, 118)]);
      b.push(['@stone.0', rect(-36, -300, 72, 300)], ['@stone.1', rect(14, -300, 22, 300), 0.7], ['@stone.2', rect(-40, -306, 80, 8)]);
      for (let x = -40; x <= 36; x += 19) b.push(['@stone.2', `M${x} -306v-12l2 -6l2 6v12z`]);
      b.push({ f: '@glass.0', d: `M-10 -220V-270Q0 -286 10 -270V-220z`, glow: 'window' });
      b.push(['@roof.0', `M-26 -306L0 -470L26 -306z`], ['@roof.1', `M0 -470L26 -306H6z`, 0.6]);
      b.push(snow(ctx.season, poly([[-170, -170], [190, -170], [184, -160], [-164, -160]]), 0.85));
      lit.push(wash(0, -250, 220, rect(-60, -480, 120, 480), 0.4));
      return { body: b, lit };
    },
  });

  /* landmark.shc-gallery: the Millennium Gallery's front: tall white concrete portal frames over a long glass wall. */
  define({
    id: 'landmark.shc-gallery', category: 'landmark', size: [640, 160], variants: 1, flippable: false,
    real: { h: 16, l: 64 },
    palette: pal({ white: ['#eeeee8', '#cfd0ca', '#a8aaa4'], glass: ['#3c4c5a', '#6a8090', '#c0d0da'], dark: ['#2a3034'], flood: '#fff0d0' }),
    parts: ['body', 'lit'], shadow: { rx: 300, ry: 10, h: 120 },
    tags: ['landmark', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'gallery', 'modern', 'kit:urban'],
    credit: 'drawn for the Sheffield centre views: the Millennium Gallery front (stylised; no lettering)',
    build(v, r, ctx) {
      const b = [], lit = [];
      b.push(['@dark.0', rect(-320, -110, 640, 110)]);
      const cells = []; for (let x = -312; x < 312; x += 26) cells.push([x, -102, 22, 94]);
      windows(b, r, cells, 3, '@glass.1', '@glass.2');
      b.push({ s: '@dark.0', w: 1.4, d: Array.from({ length: 4 }, (_, i) => `M-320 ${-24 - i * 22}h640`).join('') });
      for (let x = -320; x <= 320; x += 80) b.push(['@white.0', rect(x - 6, -156, 12, 156)], ['@white.2', rect(x + 2, -156, 4, 156), 0.6]);
      b.push(['@white.0', rect(-326, -160, 652, 16)], ['@white.1', rect(-326, -146, 652, 4)], ['@white.1', rect(-326, -116, 652, 8)]);
      b.push(snow(ctx.season, rect(-326, -163, 652, 4), 0.9));
      lit.push(wash(0, -60, 340, rect(-320, -116, 640, 116), 0.4));
      return { body: b, lit };
    },
  });

  /* water.shc-jet: one jet of the Goodwin Fountain rising from the granite (v0 1.8 m, v1 3 m, v2 4.4 m tall), the crown of
     falling drops; the column flickers and the crown bobs; the in-ground light under it glows at night. */
  define({
    id: 'water.shc-jet', category: 'water', size: [40, 150], variants: 3, flippable: true, seasonal: false, shapeBySeason: false,
    real: { h: 4.6 },
    night: { glow: { lamp: '#d8ecff' }, on: 1 },
    palette: { base: { water: ['#b8d6e6', '#e8f4fa', '#ffffff', '#86aec4'], lamp: ['#cfe6ff'] } },
    parts: ['jet', 'crown'], anim: { flicker: { part: 'jet', op: [0.65, 1], period: 1.3 }, bob: { part: 'crown', dy: 3, period: 0.9 } },
    shadow: false, reflect: true,
    tags: ['uk', 'sheffield', 'fountain', 'water', 'row', 'kit:urban', 'role:street', 'class:air'],
    credit: 'drawn for the Sheffield centre views: a jet of the Goodwin Fountain',
    build(v, r) {
      const H = [58, 96, 142][v] || 96, jet = [], crown = [];
      jet.push({ f: { lin: [[0, '@water.2', 0.95], [0.7, '@water.0', 0.75], [1, '@water.3', 0.4]], x1: 0, y1: -H, x2: 0, y2: 0 }, d: `M-3.2 0Q-1.8 ${-H * 0.55} -0.6 ${-H}h1.2Q1.8 ${-H * 0.55} 3.2 0z` });
      jet.push({ f: '@water.2', d: `M-0.8 -2Q-0.4 ${-H * 0.5} 0 ${-H + 2}l0.6 0Q0.2 ${-H * 0.5} 0.4 -2z`, op: 0.8 });
      jet.push({ f: '@lamp.0', d: ell(0, -1, 4, 1.4), glow: 'lamp', op: 0.8 });
      let drops = '';
      for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.4, l = 4 + r() * 10; drops += ell(Math.cos(a) * l, -H + 4 + Math.abs(Math.sin(a)) * 2 + r() * 10, 1.2, 1.6); }
      crown.push({ f: '@water.1', d: SD.blob(r, 0, -H + 2, 7, 4, 7, 0.5), op: 0.75 }, { f: '@water.2', d: drops, op: 0.8 });
      crown.push({ f: '@water.1', d: ell(0, -1.5, 9, 2.2), op: 0.45 });
      return { jet, crown };
    },
  });

  /* water.shc-bubbler: a low bubbling jet on the near side of the Goodwin Fountain's basin (a foaming dome a foot high). */
  define({
    id: 'water.shc-bubbler', category: 'water', size: [40, 30], variants: 2, flippable: true, seasonal: false, shapeBySeason: false,
    real: { h: 0.45 },
    night: { glow: { lamp: '#d8ecff' }, on: 1 },
    palette: { base: { water: ['#b8d6e6', '#e8f4fa', '#ffffff', '#86aec4'], lamp: ['#cfe6ff'] } },
    parts: ['body', 'foam'], anim: { bob: { part: 'foam', dy: 1.5, period: 0.7 } },
    shadow: false, reflect: true,
    tags: ['uk', 'sheffield', 'fountain', 'water', 'row', 'kit:urban', 'role:street', 'class:air'],
    credit: 'drawn for the Sheffield centre views: a low jet of the Goodwin Fountain',
    build(v, r) {
      const h = v ? 22 : 16, body = [], foam = [];
      body.push({ f: '@water.0', d: ell(0, -1, 14, 3), op: 0.6 }, { f: '@lamp.0', d: ell(0, -1, 4, 1.4), glow: 'lamp', op: 0.7 });
      foam.push({ f: '@water.1', d: `M-9 -1Q-7 ${-h} 0 ${-h - 2}Q7 ${-h} 9 -1z`, op: 0.8 }, { f: '@water.2', d: SD.blob(r, 0, -h * 0.75, 5, 4, 6, 0.5), op: 0.85 });
      return { body, foam };
    },
  });

  /* building.shc-hills: a hill ridge in the distance as one sprite (screen units; pinned at the frame's foot-centre of its band):
     the ridge's fill in the season's colours, its trees in dark dots, the terraces of houses along it (lit windows at night).
     v0 Crookes and Walkley's ridge (v4), v1 the nearer slope below it (v4), v2 Norfolk Park's ridge (v3), v3 the Peak moors (v4). */
  const HILLS = [
    { foot: 390, pts: [[-160, 330], [160, 322], [460, 334], [760, 318], [1060, 326], [1360, 314], [1760, 326]], houses: 110, h: [2, 5], tone: 0, seed: 91 },
    { foot: 400, pts: [[-160, 346], [240, 340], [640, 348], [1040, 338], [1440, 346], [1760, 340]], houses: 80, h: [2, 4], tone: 1, seed: 92 },
    { foot: 420, pts: [[440, 296], [520, 296], [860, 282], [1180, 290], [1500, 276], [1760, 288]], houses: 100, h: [3, 6], tone: 1, seed: 77 },
    { foot: 380, pts: [[-160, 300], [200, 310], [520, 296], [820, 306], [1100, 292], [1400, 304], [1760, 298]], houses: 0, h: [0, 0], tone: 2, seed: 93 },
  ];
  define({
    id: 'building.shc-hills', category: 'building', size: [1920, 160], variants: HILLS.length, flippable: false,
    real: { h: 60 },
    palette: pal({ wall: ['#a49684', '#94887a'], roof: ['#5e6066', '#6a5a50'], glass: ['#3a4048'] }, {
      hill: { spring: ['#7e9a76', '#6e8c64', '#90a0ae'], summer: ['#728e6a', '#62805a', '#8a9aaa'], autumn: ['#8a8e66', '#7a7e58', '#949aa6'], winter: ['#8a9088', '#7a8278', '#a0a8b4'] },
      wood: { spring: ['#4e6e44'], summer: ['#425e3a'], autumn: ['#6e5a3a'], winter: ['#5e5a52'] },
    }),
    night: { glow: { window: '#ffd28a' }, on: 0.6 },
    parts: ['body'], shadow: false, reflect: false,
    tags: ['uk', 'sheffield', 'hills', 'skyline', 'kit:urban', 'role:building-far', 'class:air'],
    credit: "drawn for the Sheffield centre views: Sheffield's hills and their terraces",
    build(v, r) {
      const H = HILLS[v], I = Math.round, ox = 800, oy = H.foot, b = [];
      const at = (X) => { const P = H.pts; for (let i = 0; i < P.length - 1; i++) if (X >= P[i][0] && X <= P[i + 1][0]) { const t = (X - P[i][0]) / (P[i + 1][0] - P[i][0]), u = (1 - Math.cos(t * Math.PI)) / 2; return P[i][1] + (P[i + 1][1] - P[i][1]) * u; } return P[P.length - 1][1]; };
      const xa = H.pts[0][0], xb = H.pts[H.pts.length - 1][0], span = xb - xa;
      let ridge = `M${xa - ox} 0`; for (let X = xa; X <= xb; X += 20) ridge += `L${X - ox} ${I(at(X) - oy)}`; ridge += `L${xb - ox} 0z`;
      b.push({ f: '@hill.' + H.tone, d: ridge });
      // woods along the ridge in dots and clumps
      let wood = '';
      for (let i = 0; i < Math.round(70 * span / 1920); i++) { const X = xa + 6 + r() * (span - 12), y = at(X) - oy + 1 + r() * 10, w = 2 + r() * 5; wood += `M${I(X - ox - w)} ${I(y)}q${I(w)} ${-I(w * 1.4)} ${I(w * 2)} 0z`; }
      b.push({ f: '@wood.0', d: wood, op: H.tone === 2 ? 0.35 : 0.8 });
      if (H.houses) {
        let wall = '', roof = ''; const win = ['', '', ''];
        for (let i = 0; i < H.houses; i++) {
          const X = I(xa + 6 + r() * (span - 18)), Y = I(at(X) - oy + 1 + r() * (H.h[1] - H.h[0]) * 2.5), w = I(3 + r() * 9), h = I(H.h[0] + r() * (H.h[1] - H.h[0]));
          wall += `M${X - ox} ${Y}h${w}v${-h}h${-w}z`; roof += `M${X - ox} ${Y - h}h${w}l-1 ${-Math.max(1, I(h * 0.45))}h${2 - w}z`;
          if (r() < 0.7) win[Math.floor(r() * 3)] += `M${X - ox + 1} ${I(Y - h * 0.6)}h1v1h-1z`;
        }
        b.push({ f: '@wall.' + (H.tone ? 1 : 0), d: wall }, { f: '@roof.0', d: roof });
        for (const d of win) if (d) b.push({ f: '@glass.0', d, glow: 'window' });
      }
      return { body: b };
    },
  });

  /* tree.shc-plane-bough: a near London plane rising up the left edge of the frame (anchor: the foot, screen units): its
     camouflage bark (olive, cream and grey patches), a bough over the top, palmate leaves in sprays (spring fresh, summer deep,
     autumn yellow-brown and thinning, winter bare with the seed balls hanging). Framing only. */
  sceneObjDefine({
    id: 'tree.shc-plane-bough', category: 'tree', size: [620, 1000], variants: 1, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 14 },
    palette: {
      base: { bark: ['#5e5a44', '#8a8466', '#c4bc98', '#6e7458'], leaf: ['#2e4e24', '#3e6430', '#5a803e', '#7a9c50'], ball: ['#5a4a30', '#7a6440'] },
      spring: { leaf: ['#4a7a2a', '#64963a', '#86b24c', '#a8ca68'] },
      summer: { leaf: ['#2a4a22', '#38602c', '#50783a', '#6e9248'] },
      autumn: { leaf: ['#7a6a2a', '#a8862e', '#c4a040', '#8a5a26'] },
      winter: { bark: ['#5a5848', '#827e6a', '#b4ae94', '#686c5a'] },
    },
    parts: ['trunk', 'leaves'], anim: { sway: { part: 'leaves', pivot: [240, -880], deg: 1 } },
    reflect: false, shadow: false,
    tags: ['uk', 'plane', 'frame', 'kit:urban', 'role:frame', 'class:air'],
    credit: 'drawn for the Sheffield centre views: a London plane, close to',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { trunk: [], leaves: [] }, I = Math.round;
      const palm = (x, y, ang, L) => {
        // a palmate leaf: the stalk end, the right lobe, a notch, the middle lobe's tip, a notch, the left lobe (relative integer moves)
        const P = [[0, 0], [0.55, 0.62], [0.62, 0.22], [1, 0], [0.62, -0.22], [0.55, -0.62]], c = Math.cos(ang), sn = Math.sin(ang);
        const pts = P.map(([u, w]) => [I(x + (c * u - sn * w) * L), I(y + (sn * u + c * w) * L)]);
        let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) d += `l${pts[i][0] - pts[i - 1][0]} ${pts[i][1] - pts[i - 1][1]}`; return d + 'z';
      };
      const leafI = (x, y, ang, len, w) => { const c = Math.cos(ang), sn = Math.sin(ang), nx = -sn * w, ny = c * w, mx = x + c * len * 0.45, my = y + sn * len * 0.45; return `M${I(x)} ${I(y)}Q${I(mx + nx)} ${I(my + ny)} ${I(x + c * len)} ${I(y + sn * len)}Q${I(mx - nx)} ${I(my - ny)} ${I(x)} ${I(y)}z`; };
      const limb = (pts, w0, w1) => {
        const L = [], Rr = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
          L.push([pts[i][0] - dy / m * w, pts[i][1] + dx / m * w]); Rr.push([pts[i][0] + dy / m * w, pts[i][1] - dx / m * w]);
        }
        return 'M' + L.concat(Rr.reverse()).map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z';
      };
      const spine = [[30, 30], [40, -160], [56, -360], [70, -560], [80, -760], [86, -1020]];
      out.trunk.push({ f: '@bark.0', d: limb(spine, 120, 80) }, { f: '@bark.1', d: limb(spine.map(([x, y]) => [x + 14, y]), 74, 46), op: 0.9 });
      // the plane's camouflage: cream and olive plates flaking off
      const plates = ['', ''];
      for (let i = 0; i < 40; i++) { const t = rnd(), y = 10 - t * 1000, x = 34 + t * 54 + (rnd() - 0.5) * (90 - t * 40), w = 10 + rnd() * 18; plates[rnd() < 0.55 ? 0 : 1] += SD.blob(rnd, x, y, w, w * 1.3, 6, 0.5); }
      out.trunk.push({ f: '@bark.2', d: plates[0], op: 0.85 }, { f: '@bark.3', d: plates[1], op: 0.85 });
      const bough = [[76, -700], [160, -770], [270, -820], [380, -846], [500, -850], [640, -860]];
      out.trunk.push({ f: '@bark.1', d: limb(bough, 36, 8) });
      const subs = [[[220, -800], [250, -720], [270, -660]], [[340, -838], [380, -770], [400, -720]], [[460, -848], [520, -790]], [[150, -762], [170, -690]]];
      subs.forEach(s => out.trunk.push({ f: '@bark.1', d: limb(s, 9, 2) }));
      const anchors = [];
      for (const s of [bough.slice(1)].concat(subs)) for (const p of s) anchors.push(p);
      for (let i = 0; i < 6; i++) { const t = rnd(); anchors.push([120 + t * 500, -790 - t * 60 + (rnd() - 0.5) * 30]); }
      let twig = '', strings = ''; const balls = ['', ''], lv = ['', '', '', ''];
      for (const [ax, ay] of anchors) {
        const tx = ax + (rnd() - 0.4) * 50, ty = ay + 30 + rnd() * 70;
        twig += `M${R(ax)} ${R(ay)}Q${R((ax + tx) / 2 + 6)} ${R(ay + 6)} ${R(tx)} ${R(ty)}`;
        if (rnd() < 0.45) { const by = ty + 8 + rnd() * 16; strings += `M${R(tx)} ${R(ty)}V${R(by)}`; balls[rnd() < 0.5 ? 0 : 1] += SD.circ(tx, by + 4, 4.2); }
        if (season === 'winter') continue;
        const n = season === 'autumn' ? 4 : 7;
        for (let j = 0; j < n; j++) {
          const u = j / n, lx = ax + (tx - ax) * u + (rnd() - 0.5) * 30, ly = ay + (ty - ay) * u + (rnd() - 0.5) * 18 + 6, s = 12 + rnd() * 9, a = Math.PI / 2 + (rnd() - 0.5) * 1.6;
          lv[Math.floor(rnd() * 4)] += palm(lx, ly, a, s * 1.5);
        }
      }
      out.trunk.push({ s: '@bark.0', w: 1.6, d: twig }, { s: '@ball.0', w: 0.8, d: strings }, { f: '@ball.0', d: balls[0] }, { f: '@ball.1', d: balls[1] });
      lv.forEach((d, i) => { if (d) out.leaves.push({ f: '@leaf.' + i, d }); });
      return out;
    },
  });

  /* structure.shc-deck: the Park Hill deck framing v4 (screen units, 1600 wide; anchor: the bottom centre of the frame): the
     concrete parapet across the foot of the frame with its steel rail, a pot of herbs and a geranium, a bike against it, the
     board-marked concrete column at the right edge and the soffit of the deck above across the top. */
  sceneObjDefine({
    id: 'structure.shc-deck', category: 'structure', size: [1600, 900], variants: 1, seasonal: true, shapeBySeason: true, flippable: false,
    real: { h: 3 },
    palette: {
      base: { conc: ['#a8a296', '#8a8478', '#c4beb2', '#6a655c', '#5a564e'], rail: ['#3c4448', '#6a7478'], pot: ['#b0603a', '#8a4a2c'], leaf: ['#3e6a2e', '#5a8a3a', '#7aa84a'], bloom: ['#d83a3a', '#f0d040'], bike: ['#2a4a7a', '#1c1e20'] },
      autumn: { leaf: ['#5a6a2e', '#7a7a3a', '#a08a3a'], bloom: ['#c84a2a', '#d8a030'] },
      winter: { leaf: ['#3a4a32', '#4a5a3a', '#5a6a46'], bloom: ['#7a6a5a', '#8a8070'], conc: ['#a4a098', '#86827a', '#c2beb6', '#68645c', '#585650'] },
    },
    night: { glow: { lamp: '#ffe6b0' }, on: 1 },
    parts: ['body'], reflect: false, shadow: false,
    tags: ['uk', 'sheffield', 'park-hill', 'frame', 'kit:urban', 'role:frame', 'class:air'],
    credit: 'drawn for the Sheffield centre views: a Park Hill deck, its parapet and column',
    build(v, rnd, ctx) {
      const season = ctx.season, b = [];
      // the parapet: its top falls a little to the right (perspective along the deck)
      const yL = -168, yR = -132;
      b.push({ f: { lin: [[0, '@conc.2'], [1, '@conc.1']], x1: 0, y1: -170, x2: 0, y2: 0 }, d: `M-800 ${yL}L800 ${yR}V0H-800z` });
      let board = ''; for (let i = 0; i < 9; i++) { const k = i / 9; board += `M-800 ${R(yL + 26 + i * 16)}L800 ${R(yR + 26 + i * 16 * (1 - k * 0.02))}`; }
      b.push({ s: '@conc.3', w: 1, d: board, op: 0.35, detail: true });
      for (let i = 0; i < 70; i++) { const x = -800 + rnd() * 1600, y = -140 + rnd() * 130; b.push({ f: '@conc.' + (rnd() < 0.5 ? 3 : 2), d: SD.ell(x, y, 2 + rnd() * 5, 1 + rnd() * 2), op: 0.3, detail: true }); }
      b.push({ f: '@conc.2', d: `M-800 ${yL - 10}L800 ${yR - 8}L800 ${yR + 6}L-800 ${yL + 6}z` }, { f: '@conc.0', d: `M-800 ${yL + 6}L800 ${yR + 6}L800 ${yR + 14}L-800 ${yL + 14}z`, op: 0.8 });
      if (season === 'winter') b.push({ f: '#f2f5f7', d: `M-800 ${yL - 14}L800 ${yR - 12}L800 ${yR - 6}L-800 ${yL - 6}z`, op: 0.9 });
      // the steel rail on posts
      let posts = ''; for (let x = -780; x <= 780; x += 130) { const y = yL + (yR - yL) * (x + 800) / 1600; posts += `M${x} ${R(y - 10)}V${R(y - 64)}`; }
      b.push({ s: '@rail.0', w: 5, d: posts }, { s: '@rail.0', w: 7, d: `M-800 ${yL - 66}L800 ${yR - 62}` }, { s: '@rail.1', w: 2, d: `M-800 ${yL - 69}L800 ${yR - 65}`, op: 0.8 });
      // pots on the parapet (left) and a bike leaning on it (right)
      for (const [x, s] of [[-560, 1], [-500, 0.8], [-430, 1.1]]) {
        const y = yL + (yR - yL) * (x + 800) / 1600 - 8;
        b.push({ f: '@pot.0', d: `M${x - 22 * s} ${R(y - 36 * s)}h${44 * s}l-6 ${36 * s}h${-32 * s}z` }, { f: '@pot.1', d: SD.rect(x - 22 * s, y - 36 * s, 44 * s, 6 * s) });
        for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2; b.push({ f: '@leaf.' + Math.floor(rnd() * 3), d: SD.leaf(x, y - 34 * s, a, (26 + rnd() * 16) * s, 8 * s) }); }
        if (season !== 'winter' && s !== 0.8) for (let k = 0; k < 5; k++) b.push({ f: '@bloom.' + (s > 1 ? 0 : 1), d: SD.circ(x + (rnd() - 0.5) * 40 * s, y - 60 * s - rnd() * 16 * s, 5 * s) });
      }
      const bx = 420, by = yL + (yR - yL) * (bx + 800) / 1600 + 30;
      b.push({ s: '@bike.1', w: 6, d: `M${bx - 70} ${by}a46 46 0 1 0 0.1 0M${bx + 90} ${by}a46 46 0 1 0 0.1 0`, op: 0.95 }, { s: '@bike.0', w: 7, d: `M${bx - 70} ${by + 46}L${bx} ${by - 30}L${bx + 90} ${by + 46}M${bx} ${by - 30}L${bx + 70} ${by - 30}L${bx + 90} ${by + 46}M${bx} ${by - 30}L${bx - 10} ${by - 56}M${bx + 70} ${by - 30}l10 -40` }, { s: '@bike.1', w: 6, d: `M${bx - 26} ${by - 56}h36M${bx + 64} ${by - 72}h30` });
      // the column at the right edge and the deck soffit across the top
      b.push({ f: { lin: [[0, '@conc.1'], [1, '@conc.4']], x1: 640, y1: 0, x2: 800, y2: 0 }, d: `M660 -900H800V${yR}H680z` }, { f: '@conc.3', d: `M660 -900L680 ${yR}H690L672 -900z`, op: 0.6 });
      b.push({ f: { lin: [[0, '@conc.4'], [1, '@conc.3']], x1: 0, y1: -900, x2: 0, y2: -820 }, d: 'M-800 -900H800V-834L-800 -812z' }, { f: '@conc.1', d: 'M-800 -812L800 -834V-826L-800 -804z', op: 0.9 });
      b.push({ f: '@rail.1', d: SD.rect(-200, -828, 70, 10), glow: 'lamp' });
      return { body: b };
    },
  });

  /* structure.shc-cutting-edge: the Cutting Edge (2006): a curving wall of brushed stainless steel, water sheeting down its face
     into the channel at its foot, drawn in v3's perspective one 2.5 m piece per variant (anchored at the piece's near foot). */
  (function () {
    const E = SCENE_SHC_EDGE, P = E.P, proj = E.proj, f = E.f;
    sceneObjDefine({
      id: 'structure.shc-cutting-edge', category: 'structure', size: [400, 400], variants: E.pieces.length, seasonal: true, shapeBySeason: true, flippable: false,
      real: { h: 6 },
      palette: {
        base: { steel: ['#6e787e', '#b4bec4', '#e4eaec', '#3e464c', '#8e989e'], water: ['#dff0f8', '#ffffff'], stone: ['#9a948a', '#7a756c'] },
        winter: { steel: ['#6a7278', '#acb4ba', '#e0e6e8', '#3a4248', '#8a9298'] },
      },
      night: { glow: { lamp: '#d8eaff' }, on: 1 },
      parts: ['body', 'sheen'], anim: { flicker: { part: 'sheen', op: [0.45, 1], period: 2.6 } },
      reflect: true, shadow: false,
      tags: ['uk', 'sheffield', 'sculpture', 'steel', 'water', 'row', 'kit:urban', 'role:street', 'class:structure'],
      credit: 'drawn for the Sheffield centre views: the Cutting Edge, Sheaf Square (stylised)',
      build(v, rnd, ctx) {
        const out = { body: [], sheen: [] }, [s0, s1] = E.pieces[v], n = 6;
        const pts = []; for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n, q = E.at(s); pts.push([q[0], q[1], P.height(s / E.L)]); }
        const o = proj(pts[0][0], pts[0][1], 0);
        const S = (p, h) => { const a = proj(p[0], p[1], h); return [R(a[0] - o[0]), R(a[1] - o[1])]; };
        const face = 'M' + pts.map(p => S(p, 0).join(' ')).join('L') + 'L' + pts.slice().reverse().map(p => S(p, p[2]).join(' ')).join('L') + 'Z';
        // the face: brushed steel, the sky bright in its upper half, the square darker in its lower half
        const yTop = Math.min(...pts.map(p => S(p, p[2])[1])), yBot = Math.max(...pts.map(p => S(p, 0)[1]));
        out.body.push({ f: { lin: [[0, '@steel.2'], [0.25, '@steel.1'], [0.55, '@steel.4'], [0.8, '@steel.0'], [1, '@steel.3']], x1: 0, y1: yTop, x2: 0, y2: yBot }, d: face });
        // the panel joints and the brushed grain
        { const a = S(pts[0], 0), b = S(pts[0], pts[0][2]); out.body.push({ s: '@steel.3', w: Math.max(0.6, f * 0.025 / pts[0][1]), d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, op: 0.3 }); }
        // a band of the square's reflection across the lower face (darker), a bright streak of sky above it
        out.body.push({ f: '@steel.3', d: 'M' + pts.map(p => S(p, p[2] * 0.38).join(' ')).join('L') + 'L' + pts.slice().reverse().map(p => S(p, p[2] * 0.26).join(' ')).join('L') + 'Z', op: 0.35 });
        // the top edge (a rolled lip catching the sky) and the channel at the foot
        out.body.push({ s: '@steel.2', w: Math.max(1, f * 0.08 / pts[0][1]), d: 'M' + pts.map(p => S(p, p[2]).join(' ')).join('L') });
        const footOut = pts.map(p => [p[0] - 0.9, p[1] - 0.25]);
        out.body.push({ f: '@stone.0', d: 'M' + pts.map(p => S(p, 0.05).join(' ')).join('L') + 'L' + footOut.slice().reverse().map(p => S(p, 0.05).join(' ')).join('L') + 'Z' });
        out.body.push({ f: '@stone.1', d: 'M' + footOut.map(p => S(p, 0.05).join(' ')).join('L') + 'L' + footOut.slice().reverse().map(p => S(p, -0.25).join(' ')).join('L') + 'Z', op: 0.9 });
        // the water sheeting down the face: thin bright runs, and the in-ground lights along the foot
        let runs = '';
        for (let i = 0; i < 2; i++) { const t = rnd(), k = Math.floor(t * n), u = t * n - k, a = pts[k], b = pts[Math.min(n, k + 1)], p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u], h0 = p[2] * (0.6 + rnd() * 0.35); const q0 = S(p, h0), q1 = S(p, 0.05); runs += `M${q0[0]} ${q0[1]}L${q1[0]} ${q1[1]}`; }
        out.sheen.push({ s: '@water.1', w: Math.max(0.5, f * 0.03 / pts[0][1]), d: runs, op: 0.4 });
        out.sheen.push({ f: '@water.0', d: 'M' + pts.map(p => S(p, p[2] * 0.12).join(' ')).join('L') + 'L' + pts.slice().reverse().map(p => S(p, 0.05).join(' ')).join('L') + 'Z', op: 0.25 });
        const lamp = S(pts[3], 0.08), lr = Math.max(0.6, f * 0.08 / pts[3][1]);
        out.body.push({ f: '@water.0', d: SD.ell(lamp[0], lamp[1], lr, lr * 0.35), glow: 'lamp', op: 0.5 });
        if (ctx.season === 'winter') out.body.push({ f: '#f2f6f8', d: 'M' + pts.map(p => S(p, p[2]).join(' ')).join('L') + 'L' + pts.slice().reverse().map(p => S(p, p[2] - 0.08).join(' ')).join('L') + 'Z', op: 0.8 });
        return out;
      },
    });
  })();

  /* vehicle.shc-supertram (+ -front, -rear): the Supertram, three sections; blue, the orange and red band along the skirt and
     sweeping up the cab ends, grey doors, the pantograph on the middle section (no logos, no fleet numbers). Faces right. */
  const TRAM_PAL = { base: { blue: ['#1d3c86', '#152c64', '#2c56b0'], orange: ['#f08a1c'], red: ['#d8302a'], grey: ['#c8ccd0', '#8a9096'], win: ['#1e2a36', '#3a4a58', '#a8bccb'], dark: ['#2a2e32', '#16181a'], lamp: ['#fff6d8', '#e83a2a'] } };
  define({
    id: 'vehicle.shc-supertram', category: 'vehicle', size: [760, 130], variants: 1, seasonal: false, shapeBySeason: false, flippable: true,
    real: { h: 3.6, l: 35 },
    palette: TRAM_PAL,
    views: { front: 'vehicle.shc-supertram-front', rear: 'vehicle.shc-supertram-rear' },
    parts: ['body', 'wheels'], anim: { bob: { part: 'body', dy: 0.5, period: 0.8 } },
    shadow: { rx: 360, ry: 8, h: 60 },
    tags: ['uk', 'north', 'sheffield', 'tram', 'transport', 'kit:vehicles', 'kit:urban', 'role:vehicle'],
    credit: 'drawn for the Sheffield centre views: the Supertram (generic, no logos)',
    build(v, r) {
      const b = [], wheels = [], secs = 3, L = 250, H = 118, total = secs * L, x0 = -total / 2;
      for (let s = 0; s < secs; s++) {
        const x = x0 + s * L + (s ? 3 : 0), w = L - (s ? 3 : 0), last = s === secs - 1, first = s === 0;
        const body = last ? `M${x} -16V${-H}H${x + w - 30}Q${x + w} ${-H + 4} ${x + w} ${-H + 44}V-16z` : first ? `M${x + w} -16V${-H}H${x + 30}Q${x} ${-H + 4} ${x} ${-H + 44}V-16z` : rect(x, -H, w, H - 16);
        b.push({ f: { lin: [[0, '@blue.2'], [0.4, '@blue.0'], [1, '@blue.1']], x1: 0, y1: -H, x2: 0, y2: -16 }, d: body });
        b.push({ f: '@orange.0', d: rect(x + (first ? 2 : 0), -42, w - (first || last ? 2 : 0), 7) }, { f: '@red.0', d: rect(x + (first ? 2 : 0), -35, w - (first || last ? 2 : 0), 6) });
        b.push({ f: '@win.1', d: rect(x + (first ? 34 : 6), -H + 14, w - (first || last ? 40 : 12), 42) });
        const cells = []; for (let k = 0; k < Math.floor((w - (first || last ? 44 : 16)) / 24); k++) cells.push([x + (first ? 36 : 8) + k * 24, -H + 16, 20, 38]);
        windows(b, r, cells, 2, '@win.0', '@win.2');
        for (const dx of [0.3, 0.72]) b.push({ f: '@grey.0', d: rect(x + w * dx - 10, -H + 12, 20, H - 28) }, { f: '@win.0', d: rect(x + w * dx - 8, -H + 16, 7, 40), glow: 'window' }, { f: '@win.0', d: rect(x + w * dx + 1, -H + 16, 7, 40), glow: 'window' });
        if (s < secs - 1) b.push(['@dark.0', rect(x + w - 1, -H + 6, 5, H - 22)]);
        wheels.push(['@dark.0', rect(x + 24, -16, 54, 12)], ['@dark.0', rect(x + w - 78, -16, 54, 12)]);
        for (const wx of [x + 36, x + 66, x + w - 66, x + w - 36]) wheels.push(['@dark.1', ell(wx, -7, 7, 7)]);
      }
      // the cab ends: the band sweeps up, the windscreen, lamps
      const xe = x0 + total;
      b.push({ f: '@orange.0', d: `M${xe - 60} -42L${xe - 4} -78L${xe} -66L${xe - 40} -35z` }, { f: '@red.0', d: `M${xe - 40} -35L${xe} -66V-50L${xe - 20} -29z` });
      b.push({ f: '@orange.0', d: `M${x0 + 60} -42L${x0 + 4} -78L${x0} -66L${x0 + 40} -35z` }, { f: '@red.0', d: `M${x0 + 40} -35L${x0} -66V-50L${x0 + 20} -29z` });
      b.push({ f: '@win.0', d: `M${xe - 2} ${-H + 48}V${-H + 12}Q${xe - 14} ${-H + 6} ${xe - 28} ${-H + 8}V${-H + 48}z`, glow: 'window' });
      const mid = x0 + L * 1.5;
      b.push(['@dark.0', rect(mid - 34, -H - 6, 68, 6)], { s: '@dark.0', w: 1.8, d: `M${mid - 22} ${-H - 6}L${mid + 8} ${-H - 28}L${mid - 14} ${-H - 46}M${mid - 28} ${-H - 46}h28` });
      b.push({ f: '@lamp.0', d: ell(xe - 6, -24, 3.6, 2.4), glow: 'lamp' }, { f: '@lamp.1', d: ell(x0 + 6, -24, 3, 2), glow: 'lamp' });
      return { body: b, wheels };
    },
  });
  for (const [id, rear] of [['vehicle.shc-supertram-front', false], ['vehicle.shc-supertram-rear', true]]) {
    define({
      id, category: 'vehicle', size: [90, 130], variants: 1, seasonal: false, shapeBySeason: false, flippable: false,
      real: { h: 3.6, l: 2.65 },
      palette: TRAM_PAL, parts: ['body'], shadow: { rx: 44, ry: 6, h: 60 },
      tags: ['uk', 'north', 'sheffield', 'tram', 'transport', rear ? 'rear view' : 'front view', 'kit:vehicles', 'kit:urban', 'role:vehicle'],
      credit: 'drawn for the Sheffield centre views: the Supertram, end on',
      build() {
        const b = [];
        b.push({ f: { lin: [[0, '@blue.2'], [1, '@blue.1']], x1: 0, y1: -118, x2: 0, y2: -10 }, d: 'M-42 -10V-96Q-42 -118 -20 -118H20Q42 -118 42 -96V-10z' });
        b.push({ f: '@win.0', d: 'M-34 -62V-96Q-34 -110 -18 -110H18Q34 -110 34 -96V-62z', glow: 'window' }, { f: '@win.2', d: 'M-30 -66l10 -38h6l-10 38z', op: 0.35 });
        b.push({ f: '@dark.0', d: rect(-20, -108, 40, 8) }, { f: '@orange.0', d: 'M-42 -46H42V-38H-42z' }, { f: '@red.0', d: 'M-42 -38H42V-31H-42z' });
        b.push({ f: '@dark.1', d: rect(-40, -14, 80, 6) }, { f: rear ? '@lamp.1' : '@lamp.0', d: ell(-28, -22, 5, 3.4), glow: 'lamp' }, { f: rear ? '@lamp.1' : '@lamp.0', d: ell(28, -22, 5, 3.4), glow: 'lamp' });
        b.push({ s: '@dark.0', w: 1.6, d: 'M-14 -118L0 -134L14 -118M-18 -134h36' });
        return { body: b };
      },
    });
  }
})();

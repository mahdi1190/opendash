/* ============================================================
   SCENE LIBRARY: proof-fleet-pond (docs/dev/SCENE_ENGINE_V2.md), the shared ground plan of the hand-composed
   Fleet Pond scene (71-scene-proof-fleet-pond.js). PURE: data only at load.

   Fleet Pond Local Nature Reserve, Fleet, Hampshire: the largest freshwater lake in the county, with wide
   Phragmites reedbeds, raised boardwalks and viewing platforms, alder and willow carr, and the South Western
   main line on its embankment along the north shore. The camera stands on the boardwalk at the south-west
   reedbed, looking north-north-west across the open water to the railway.
   Ground metres: x to the right of the view axis, d forward.
   ============================================================ */
const SCENE_PROOF_FLEET_POND = Object.freeze({
  camera: { eye: 2.0, fov: 62, horizon: 440, heading: 340, lat: 51.2889, lon: -0.8262, water: -0.5 },
  // the boardwalk's centreline, near to far, and the viewing platform at its end (ground metres)
  deck: [[0.15, 2.6], [-0.1, 5], [-0.55, 8], [-1.3, 11], [-2.35, 14.5], [-3.6, 18], [-4.9, 21.5], [-6.1, 24.6]],
  deckW: 1.5,
  platform: [[-8.7, 24.0], [-5.1, 22.7], [-3.5, 26.9], [-7.1, 28.5]],
  // the near reed edge (the water's left shore), near to far
  reedEdge: [[1.0, 2.4], [0.78, 5.0], [0.34, 8.0], [-0.4, 11.0], [-1.45, 14.5], [-2.7, 18.0], [-4.0, 21.0], [-5.4, 23.0], [-8.4, 28.6],
    [-10.4, 30.6], [-11.6, 34.5], [-15.0, 40.5], [-20.5, 45.5], [-26.5, 49.5], [-33, 53.5], [-42, 56.5], [-52, 59], [-66, 60.5], [-82, 62.5], [-110, 62]],
  // a strip of sedge and grass along the left of the walk, kept low so the walk and the platform read from the camera
  cut: [[-0.6, 2.4], [-0.85, 5], [-1.3, 8], [-2.05, 11], [-3.1, 14.5], [-4.35, 18], [-5.65, 21.5], [-7.4, 24.0],
    [-8.9, 24.0], [-7.3, 21.5], [-5.9, 18], [-4.6, 14.5], [-3.5, 11], [-2.75, 8], [-2.25, 5], [-2.05, 2.4]],
  // the far shore (the foot of the north reedbed), left to right
  farShore: [[-110, 62], [-96, 67], [-84, 63.5], [-70, 66], [-61, 72], [-52, 69], [-44, 67.5], [-36, 72], [-27, 76], [-21, 73], [-14, 72.5],
    [-8, 77], [-1, 80], [5, 76.5], [11, 75.5], [17, 80], [23, 85], [30, 83], [37, 81.5], [44, 86], [52, 90], [60, 87], [68, 89], [78, 90]],
  // the alder and willow carr on the right, a tongue that closes the bay to the east (from the shore, round its tip, back)
  carr: [[36, 34], [27, 38], [21, 42], [19.5, 46], [23, 49.5], [29, 55], [34, 62], [42, 70], [52, 78], [66, 86], [78, 90]],
  // the railway on its embankment along the north shore
  rail: [[-320, 59.6], [-160, 78.8], [0, 98], [160, 117.2], [320, 136.4]],
  railD: (x) => 98 + 0.12 * x,
});

/* ---------- the boardwalk and its viewing platform, drawn in the camera's own perspective ----------
   structure.proof-fleet-boardwalk: one variant per 2 m length of the walk (near to far), and the last variant the platform.
   Each variant is anchored at its NEAR centre on the deck (the platform: at its FAR corner, so a figure standing on it draws
   over its deck), so the scene places it in pixels (pin) and the depth sort puts the reeds in front of or behind each piece.
   Weathered oak planks across, a dark fascia on the water side, posts every 2 m with a top and a mid rail on both sides. */
const SCENE_PROOF_FLEET_WALK = (function () {
  const P = SCENE_PROOF_FLEET_POND, C = P.camera, f = 800 / Math.tan(C.fov * Math.PI / 360);
  const proj = (x, d, h) => [800 + f * x / d, C.horizon + f * (C.eye - (h || 0)) / d];
  // the centreline, Catmull-Rom through the deck points, resampled every 0.1 m of arc
  const pts = P.deck, dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 40; k++) {
      const t = k / 40, t2 = t * t, t3 = t2 * t;
      const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(pts[pts.length - 1].slice());
  const arc = [0];
  for (let i = 1; i < dense.length; i++) arc.push(arc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const L = arc[arc.length - 1];
  /** The deck point at arc length s: [x, d, nx, nd] (n: the unit normal to the right of travel). */
  const at = (s) => {
    s = Math.max(0, Math.min(L, s));
    let i = 1;
    while (i < arc.length - 1 && arc[i] < s) i++;
    const a = dense[i - 1], b = dense[i], u = (s - arc[i - 1]) / Math.max(1e-6, arc[i] - arc[i - 1]);
    const tx = b[0] - a[0], td = b[1] - a[1], m = Math.hypot(tx, td) || 1;
    return [a[0] + tx * u, a[1] + td * u, td / m, -tx / m];
  };
  // the first visible piece starts a little below the frame (d 4.6); pieces of 2 m to the platform
  let s0 = 0;
  while (s0 < L && at(s0)[1] < 4.6) s0 += 0.1;
  const pieces = [];
  for (let s = s0; s < L - 0.05; s += 2) pieces.push([s, Math.min(L, s + 2)]);
  return { f, proj, at, L, pieces, w: P.deckW };
})();
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const W = SCENE_PROOF_FLEET_WALK, P = SCENE_PROOF_FLEET_POND, proj = W.proj, f = W.f;
  const R = (v) => Math.round(v * 10) / 10;
  const poly = (pts, o) => 'M' + pts.map(p => R(p[0] - o[0]) + ' ' + R(p[1] - o[1])).join('L') + 'Z';
  const line = (pts, o) => 'M' + pts.map(p => R(p[0] - o[0]) + ' ' + R(p[1] - o[1])).join('L');
  const side = (q, sgn, w) => [q[0] + q[2] * sgn * w / 2, q[1] + q[3] * sgn * w / 2];
  /** A rail band along ground points (x, d) between heights h0 and h1. */
  const band = (g, h0, h1, o) => poly(g.map(p => proj(p[0], p[1], h1)).concat(g.slice().reverse().map(p => proj(p[0], p[1], h0))), o);
  /** A post at ground (x, d): wm metres wide, from below the deck edge to h. */
  const post = (x, d, h, wm, o) => { const a = proj(x, d, -0.12), b = proj(x, d, h), hw = Math.max(0.6, f * wm / d) / 2; return poly([[b[0] - hw, b[1]], [b[0] + hw, b[1]], [a[0] + hw, a[1]], [a[0] - hw, a[1]]], o); };
  function piece(out, s0, s1, rnd, season) {
    const n = Math.max(3, Math.round((s1 - s0) / 0.25)), C = [];
    for (let i = 0; i <= n; i++) C.push(W.at(s0 + (s1 - s0) * i / n));
    const Lg = C.map(q => side(q, -1, W.w)), Rg = C.map(q => side(q, 1, W.w));
    const o = proj(C[0][0], C[0][1], 0);
    // the shadow under the deck and its fascia (seen on the right of a walk that runs off to the left)
    out.body.push({ f: '#1d2418', d: poly(Rg.map(p => proj(p[0] + 0.05, p[1], -0.12)).concat(Rg.slice().reverse().map(p => proj(p[0] + 0.12, p[1], -0.46))), o), op: 0.55 });
    out.body.push({ f: '@wood.0', d: band(Rg, -0.2, 0, o) });
    out.body.push({ f: '@wood.4', d: band(Rg, -0.2, -0.12, o), op: 0.6 });
    // the deck: a light weathered top shading darker toward the far end, then the planks
    const top = poly(Lg.map(p => proj(p[0], p[1], 0)).concat(Rg.slice().reverse().map(p => proj(p[0], p[1], 0))), o);
    const yN = proj(C[0][0], C[0][1], 0)[1] - o[1], yF = proj(C[n][0], C[n][1], 0)[1] - o[1];
    out.body.push({ f: { lin: [[0, '@wood.2'], [1, '@wood.1']], x1: 0, y1: yF, x2: 0, y2: yN }, d: top });
    const planks = Math.round((s1 - s0) / 0.15), gaps = [];
    for (let i = 0; i <= planks; i++) {
      const q = W.at(s0 + (s1 - s0) * i / planks), a = proj(...side(q, -1, W.w), 0), b = proj(...side(q, 1, W.w), 0), dd = q[1];
      if (f * 0.15 / dd > 2.2 && i < planks) {
        // single planks, weathered unevenly (near pieces only)
        const q2 = W.at(s0 + (s1 - s0) * (i + 1) / planks), c = proj(...side(q2, 1, W.w), 0), e = proj(...side(q2, -1, W.w), 0);
        const r = rnd();
        if (r < 0.45) out.body.push({ f: r < 0.2 ? '@wood.3' : '@wood.0', d: poly([a, b, c, e], o), op: 0.18 + 0.2 * rnd(), detail: true });
        if (season === 'autumn' && rnd() < 0.22) { const u = 0.15 + 0.7 * rnd(), lx = a[0] + (b[0] - a[0]) * u, ly = a[1] + (b[1] - a[1]) * u, rr = f * 0.06 / dd; out.body.push({ f: '@leaf.' + Math.floor(rnd() * 3), d: sceneD.ell(lx - o[0], ly - o[1] - rr * 0.3, rr, rr * 0.45), detail: true }); }
      }
      if (f * 0.15 / dd > 1.1) gaps.push([a, b]);
    }
    if (gaps.length) out.body.push({ s: '@wood.4', w: Math.max(0.4, f * 0.012 / C[0][1]), d: gaps.map(g => line(g, o)).join(''), op: 0.5 });
    if (season === 'winter') out.body.push({ f: '#eef2f4', d: top, op: 0.22 });
    // the edge boards along both sides of the top
    out.body.push({ s: '@wood.4', w: Math.max(0.5, f * 0.03 / C[0][1]), d: line(Lg.map(p => proj(p[0], p[1], 0)), o), op: 0.7 });
    out.body.push({ s: '@wood.3', w: Math.max(0.5, f * 0.03 / C[0][1]), d: line(Rg.map(p => proj(p[0], p[1], 0)), o), op: 0.9 });
    // posts (one at the piece's start, both sides) and the two rails
    for (const [g, lit] of [[Lg, 0], [Rg, 1]]) {
      out.body.push({ f: lit ? '@post.1' : '@post.0', d: post(g[0][0], g[0][1], 1.06, 0.1, o) });
      out.body.push({ f: '@rail.0', d: band(g, 0.47, 0.53, o) });
      out.body.push({ f: lit ? '@rail.1' : '@rail.0', d: band(g, 0.96, 1.04, o) });
      out.body.push({ f: '@rail.2', d: band(g, 1.02, 1.04, o), op: 0.8, detail: true });
      if (season === 'winter') out.body.push({ f: '#f4f7f8', d: band(g, 1.035, 1.05, o), op: 0.7, detail: true });
    }
  }
  function platform(out, rnd, season) {
    const Q = P.platform, o = proj(Q[3][0], Q[3][1], 0);
    const pr = (p, h) => proj(p[0], p[1], h);
    // shadow, fascia on the near and right sides, the deck, planks along its length
    out.body.push({ f: '#1d2418', d: poly([pr(Q[0], -0.12), pr(Q[1], -0.12), pr(Q[2], -0.12), pr([Q[2][0] + 0.2, Q[2][1]], -0.46), pr([Q[1][0] + 0.2, Q[1][1]], -0.46), pr([Q[0][0] + 0.2, Q[0][1]], -0.46)], o), op: 0.5 });
    out.body.push({ f: '@wood.0', d: poly([pr(Q[0], 0), pr(Q[1], 0), pr(Q[1], -0.22), pr(Q[0], -0.22)], o) });
    out.body.push({ f: '@wood.4', d: poly([pr(Q[1], 0), pr(Q[2], 0), pr(Q[2], -0.22), pr(Q[1], -0.22)], o) });
    const top = poly(Q.map(p => pr(p, 0)), o);
    out.body.push({ f: { lin: [[0, '@wood.2'], [1, '@wood.1']], x1: 0, y1: 0, x2: 0, y2: pr(Q[1], 0)[1] - o[1] }, d: top });
    const gaps = [];
    for (let i = 1; i < 22; i++) { const u = i / 22, a = [Q[0][0] + (Q[3][0] - Q[0][0]) * u, Q[0][1] + (Q[3][1] - Q[0][1]) * u], b = [Q[1][0] + (Q[2][0] - Q[1][0]) * u, Q[1][1] + (Q[2][1] - Q[1][1]) * u]; gaps.push([pr(a, 0), pr(b, 0)]); }
    out.body.push({ s: '@wood.4', w: 0.6, d: gaps.map(g => line(g, o)).join(''), op: 0.5 });
    if (season === 'winter') out.body.push({ f: '#eef2f4', d: top, op: 0.25 });
    // the rails on the three open sides (the near side joins the walk), posts at the corners and the middles
    for (const [a, b, lit] of [[Q[1], Q[2], 1], [Q[2], Q[3], 1], [Q[3], Q[0], 0]]) {
      const g = [0, 0.5, 1].map(u => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
      for (const p of g) out.body.push({ f: lit ? '@post.1' : '@post.0', d: post(p[0], p[1], 1.08, 0.12, o) });
      out.body.push({ f: '@rail.0', d: band(g, 0.47, 0.53, o) });
      out.body.push({ f: lit ? '@rail.1' : '@rail.0', d: band(g, 0.97, 1.05, o) });
      if (season === 'winter') out.body.push({ f: '#f4f7f8', d: band(g, 1.04, 1.06, o), op: 0.7, detail: true });
    }
  }
  sceneObjDefine({
    id: 'structure.proof-fleet-boardwalk',
    category: 'structure',
    size: [400, 220],
    variants: W.pieces.length + 1,
    seasonal: true,
    shapeBySeason: true,
    flippable: false,
    palette: {
      base:   { wood: ['#5a4a38', '#a39276', '#8a7a62', '#b8a888', '#3e3226'], post: ['#4e3e2e', '#7a6650'], rail: ['#7a6a54', '#a8977a', '#c8b898'], leaf: ['#c0702a', '#e0a040', '#8a4a1e'] },
      autumn: { wood: ['#4a3c2c', '#8a7a62', '#6e604c', '#9c8a6c', '#30261c'], rail: ['#6a5a46', '#94846a', '#b4a484'] },
      winter: { wood: ['#5a544a', '#aaa498', '#8e887c', '#c4beb0', '#3e3a32'], post: ['#4e4840', '#7a746a'], rail: ['#7e786c', '#aca698', '#d8d4ca'] },
    },
    parts: ['body'],
    reflect: true,
    shadow: false,
    tags: ['uk', 'boardwalk', 'nature-reserve', 'reedbed', 'kit:temperate', 'kit:water', 'role:street', 'class:structure'],
    credit: 'drawn for the Fleet Pond scene: the reserve boardwalk and viewing platform',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { body: [] };
      if (v < W.pieces.length) piece(out, W.pieces[v][0], W.pieces[v][1], rnd, season);
      else platform(out, rnd, season);
      return out;
    },
  });
})();

/* ---------- the scene's own life: the render pass 'proof-fleet-pond' (V2 13.1 movers stage) ----------
   What the library hooks cannot do, drawn on the canvas each frame as movers sorted into the right depth group, in the live
   grade (sceneColour), each with its reflection where it stands on the water. Every pose is a pure function of t (stills and
   captures are deterministic). At t = 6.5 s (the gallery still) the heron lifts a fish, the kingfisher flies home with one
   and the grebes are mid head-shake.
     heron       an 18 s hunt along the reed edge: four slow wading steps (rings where each foot goes down), the freeze with the
                 neck drawn forward, the stab (splash and rings), a fish lifted and swallowed (a bulge down the neck), a shake,
                 then scanning; it pages back and forth along the shallows over the cycles. Day and night (herons hunt at dusk).
     kingfisher  a 26 s cycle on a dead alder stake in the near shallows: perched with head bobs, the plunge (a blue streak),
                 the splash crown and rings, the whirring flight home with a fish, the fish beaten and swallowed. Daylight only.
     grebes      a great crested grebe pair: slow drift, then the head-shaking ceremony face to face (crests up, ruffs fanned),
                 and one dives and comes up again further on.
     swallows    spring and summer days: five swallows skimming the water, dipping to drink (a ring where each touches).
     bats        dusk and night from spring to autumn: pipistrelles flickering over the reed edge.
     mist        dawn and early morning (and faintly at dusk): soft banks drifting over the open water.
     rises       fish rising in the open water now and then (rings).
   The pass is defined lazily (the registry, 78-scene-0pass.js, loads after the 72 files): the pack's scene thunk calls
   sceneProofFleetPondPass() before it returns the data. It applies only to this scene (C.id 'proof-fleet-pond'). */
function sceneProofFleetPondPass() {
  if (sceneProofFleetPondPass.done) return true;
  if (typeof sceneRenderPassDefine !== 'function') return false;
  const P = SCENE_PROOF_FLEET_POND, CAM = P.camera, f = 800 / Math.tan(CAM.fov * Math.PI / 360), HW = CAM.water;
  const proj = (x, d, h) => [800 + f * x / d, CAM.horizon + f * (CAM.eye - h) / d];
  const TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v)), ss = (a, b, v) => { const u = cl((v - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const lerp = (a, b, u) => a + (b - a) * u, frac = (v) => v - Math.floor(v);
  // the live grade, memoised per light
  let LC = null, cmap = new Map();
  const col = (L, hex) => { if (L !== LC) { LC = L; cmap = new Map(); } let v = cmap.get(hex); if (!v) { v = typeof sceneColour === 'function' && L ? sceneColour(hex, { L }) : hex; cmap.set(hex, v); } return v; };
  const groupOf = (env, d) => {
    let li = 0;
    try { li = typeof sceneDepthBand === 'function' ? sceneDepthBand(env.cam, d) : 0; } catch (e) { li = 0; }
    const g = env.layerOfGroup ? env.layerOfGroup[li] : null;
    return g == null ? (env.groups || []).length - 1 : g;
  };
  const ell = (c, x, y, rx, ry, rot) => { c.beginPath(); c.ellipse(x, y, Math.max(1e-4, rx), Math.max(1e-4, ry), rot || 0, 0, TAU); };
  // ---- rings on the water (scene units; foreshortened by the depth) ----
  function ring(c, L, x, d, age, rMax, op) {
    if (age < 0 || age > 1.6) return 0;
    const p = proj(x, d, HW), k = f / d, sq = (CAM.eye - HW) / d, n = 2;
    for (let i = 0; i < n; i++) {
      const a = age - i * 0.28;
      if (a <= 0) continue;
      const r = rMax * Math.sqrt(a / 1.6) * k;
      c.globalAlpha = op * (1 - a / 1.6) * (i ? 0.6 : 1);
      c.strokeStyle = col(L, '#eef4f6'); c.lineWidth = Math.max(0.5, k * 0.012);
      ell(c, p[0], p[1], r, r * sq); c.stroke();
    }
    c.globalAlpha = 1;
    return n;
  }
  function splash(c, L, x, d, age, size) {
    if (age < 0 || age > 0.7) return 0;
    const p = proj(x, d, HW), k = f / d * size;
    c.fillStyle = col(L, '#f4f8fa');
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * 2.2, v0 = 1.2 + 0.5 * ((i * 37) % 5) / 5, t = age;
      const X = p[0] + Math.sin(a) * v0 * 0.25 * t * k * 3, Y = p[1] - (v0 * t - 4.9 * t * t) * k * 0.22;
      if (Y > p[1] + 1) continue;
      c.globalAlpha = 0.9 * (1 - age / 0.7);
      ell(c, X, Y, 0.012 * k, 0.018 * k); c.fill();
    }
    c.globalAlpha = 0.55 * (1 - age / 0.7);
    ell(c, p[0], p[1] - 0.02 * k, 0.07 * k, 0.03 * k); c.fill();
    c.globalAlpha = 1;
    return 10;
  }
  // ---- the heron (local metres: u forward, v up; the feet on the water at v 0) ----
  const HER = { a: [3.6, 12.2], b: [1.9, 12.8], T: 18, off: 4.5, step: 0.16 };
  function heronAt(t) {
    const T = HER.T, w = t + HER.off, cyc = Math.floor(w / T), u = w - cyc * T;
    const steps = cl(Math.floor(u / 1.75), 0, 4), sp = u < 7 ? frac(u / 1.75) : 0, moving = u < 7 ? ss(0, 0.55, sp) : 1;
    const along = cyc * 4 * HER.step + (Math.min(steps, 4) + (u < 7 ? moving : 0)) * HER.step;
    const Lp = Math.hypot(HER.b[0] - HER.a[0], HER.b[1] - HER.a[1]), q = ((along % (2 * Lp)) + 2 * Lp) % (2 * Lp), back = q > Lp, s = back ? 2 * Lp - q : q;
    const x = lerp(HER.a[0], HER.b[0], s / Lp), d = lerp(HER.a[1], HER.b[1], s / Lp);
    const fwd = back ? 1 : -1;                                    // screen facing: a to b runs right to left
    const ext = u < 7 ? 0.1 : u < 9.7 ? ss(7, 8.6, u) : u < 12.6 ? 0.6 : 0.6 * (1 - ss(12.6, 14, u));
    const strike = u < 9.7 ? 0 : u < 10.05 ? ss(9.7, 10.05, u) : u < 10.4 ? 1 : u < 11.2 ? 1 - ss(10.4, 11.2, u) : 0;
    const success = (cyc % 3) !== 1;
    const fish = success && u >= 10.4 && u < 11.95;
    const up = u < 11.2 ? 0 : u < 12.6 ? Math.sin(Math.PI * cl((u - 11.2) / 1.4, 0, 1)) : 0;
    const gulp = success && u >= 11.95 && u < 12.7 ? (u - 11.95) / 0.75 : -1;
    const look = u >= 14 ? Math.sin((u - 14) * 1.6) * 0.18 : u >= 12.6 && u < 13.4 ? Math.sin((u - 12.6) * 30) * 0.12 * (1 - (u - 12.6) / 0.8) : 0;
    const legPhase = u < 7 ? sp : 0, legSwap = steps % 2;
    return { x, d, fwd, u, ext, strike, fish, up, gulp, look, legPhase, legSwap, moving: u < 7, stepIdx: steps, cyc, success };
  }
  function heronDraw(c, L, H, refl) {
    const g = (h) => col(L, h);
    // legs
    const lift = H.moving ? Math.sin(Math.PI * cl(H.legPhase / 0.55, 0, 1)) : 0;
    const fA = H.moving ? lerp(-0.09, 0.09, ss(0, 0.55, H.legPhase)) : 0.06, fB = H.moving ? lerp(0.09, -0.09, ss(0, 0.55, H.legPhase)) : -0.05;
    const legs = H.legSwap ? [[fB, 0, 0], [fA, lift, 1]] : [[fA, lift, 1], [fB, 0, 0]];
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [fu, lv, near] of legs) {
      c.strokeStyle = g(near ? '#a8924a' : '#86763e'); c.lineWidth = 0.022;
      c.beginPath(); c.moveTo(0.0, 0.47); c.lineTo(fu * 0.5 - 0.035, 0.24 + lv * 0.06); c.lineTo(fu, Math.max(0, lv * 0.11)); c.stroke();
      if (lv > 0.05) { c.beginPath(); c.moveTo(fu, lv * 0.11); c.lineTo(fu + 0.05, lv * 0.11 - 0.01); c.stroke(); }
    }
    // tail, body, wing, primaries, shoulder, breast plumes
    c.fillStyle = g('#6a737a'); c.beginPath(); c.moveTo(-0.24, 0.6); c.lineTo(-0.37, 0.53); c.lineTo(-0.22, 0.52); c.closePath(); c.fill();
    c.fillStyle = g('#929ba1'); ell(c, -0.03, 0.6, 0.25, 0.115, 0.17); c.fill();
    c.fillStyle = g('#747d84'); ell(c, -0.07, 0.635, 0.2, 0.07, 0.2); c.fill();
    c.fillStyle = g('#353b40'); ell(c, -0.2, 0.575, 0.09, 0.035, 0.12); c.fill();
    if (!refl) { c.fillStyle = g('#b9c1c6'); ell(c, -0.02, 0.665, 0.16, 0.022, 0.2); c.fill(); }
    c.fillStyle = g('#24282c'); ell(c, 0.15, 0.645, 0.035, 0.03, 0); c.fill();
    c.fillStyle = g('#dfe3e3'); ell(c, 0.16, 0.56, 0.05, 0.075, -0.3); c.fill();
    // the neck: rest S, drawn forward, the stab, the head up to swallow
    const S = [0.15, 0.67];
    let Hd = [lerp(0.15, 0.4, H.ext), lerp(0.96, 0.8, H.ext)], C1 = [lerp(0.29, 0.25, H.ext), lerp(0.74, 0.72, H.ext)], C2 = [lerp(0.04, 0.33, H.ext), lerp(0.86, 0.8, H.ext)], ang = lerp(0, -0.18, H.ext);
    if (H.strike > 0) { const s = H.strike; Hd = [lerp(Hd[0], 0.58, s), lerp(Hd[1], 0.1, s)]; C1 = [lerp(C1[0], 0.3, s), lerp(C1[1], 0.52, s)]; C2 = [lerp(C2[0], 0.47, s), lerp(C2[1], 0.3, s)]; ang = lerp(ang, -1.2, s); }
    if (H.up > 0) { const s = H.up; Hd = [lerp(Hd[0], 0.22, s), lerp(Hd[1], 1.02, s)]; C1 = [lerp(C1[0], 0.26, s), lerp(C1[1], 0.78, s)]; C2 = [lerp(C2[0], 0.2, s), lerp(C2[1], 0.92, s)]; ang = lerp(ang, 0.85, s); }
    ang += H.look;
    c.strokeStyle = g('#e6e9ea'); c.lineWidth = 0.062;
    c.beginPath(); c.moveTo(S[0], S[1]); c.bezierCurveTo(C1[0], C1[1], C2[0], C2[1], Hd[0], Hd[1]); c.stroke();
    if (!refl) {
      // the black streaks down the front of the neck
      c.strokeStyle = g('#2c3034'); c.lineWidth = 0.011; c.setLineDash([0.03, 0.025]);
      c.beginPath(); c.moveTo(S[0] + 0.03, S[1] + 0.01); c.bezierCurveTo(C1[0] + 0.03, C1[1], C2[0] + 0.025, C2[1] - 0.02, lerp(C2[0], Hd[0], 0.5) + 0.02, lerp(C2[1], Hd[1], 0.5) - 0.02); c.stroke(); c.setLineDash([]);
      if (H.gulp >= 0) {
        const tt = 1 - H.gulp, bx = Math.pow(1 - tt, 3) * S[0] + 3 * Math.pow(1 - tt, 2) * tt * C1[0] + 3 * (1 - tt) * tt * tt * C2[0] + tt * tt * tt * Hd[0];
        const by = Math.pow(1 - tt, 3) * S[1] + 3 * Math.pow(1 - tt, 2) * tt * C1[1] + 3 * (1 - tt) * tt * tt * C2[1] + tt * tt * tt * Hd[1];
        c.fillStyle = g('#dfe2e3'); ell(c, bx + 0.012, by, 0.042, 0.03, 0); c.fill();
      }
    }
    // the head: white, the black crown and crest plumes, the dagger bill, the eye; a fish crosswise in the bill
    c.save(); c.translate(Hd[0], Hd[1]); c.rotate(ang);
    c.strokeStyle = g('#1e2226'); c.lineWidth = 0.008;
    c.beginPath(); c.moveTo(-0.02, 0.018); c.quadraticCurveTo(-0.1, 0.03, -0.15, -0.005 + Math.sin(H.u * 2) * 0.006); c.stroke();
    c.beginPath(); c.moveTo(-0.02, 0.012); c.quadraticCurveTo(-0.09, 0.015, -0.13, -0.02); c.stroke();
    c.fillStyle = g('#eef0f0'); ell(c, 0, 0, 0.052, 0.036, 0); c.fill();
    c.fillStyle = g('#1e2226'); ell(c, -0.008, 0.02, 0.045, 0.014, 0.1); c.fill();
    c.fillStyle = g('#d3a23a'); c.beginPath(); c.moveTo(0.035, 0.014); c.lineTo(0.19, 0.0); c.lineTo(0.035, -0.016); c.closePath(); c.fill();
    if (!refl) {
      c.fillStyle = g('#e8c46a'); c.beginPath(); c.moveTo(0.035, -0.002); c.lineTo(0.19, 0.0); c.lineTo(0.035, -0.016); c.closePath(); c.fill();
      c.fillStyle = g('#f2d24a'); ell(c, 0.018, 0.006, 0.008, 0.008, 0); c.fill();
      c.fillStyle = '#101010'; ell(c, 0.019, 0.006, 0.004, 0.004, 0); c.fill();
    }
    if (H.fish) {
      const wig = Math.sin(H.u * 26) * 0.35;
      c.save(); c.translate(0.15, 0); c.rotate(Math.PI / 2 + wig);
      c.fillStyle = g('#b8c4cc'); ell(c, 0, 0, 0.055, 0.016, 0); c.fill();
      c.fillStyle = g('#eef3f5'); ell(c, 0.004, -0.006, 0.045, 0.007, 0); c.fill();
      c.fillStyle = g('#8a979f'); c.beginPath(); c.moveTo(-0.05, 0); c.lineTo(-0.075, 0.016); c.lineTo(-0.075, -0.016); c.closePath(); c.fill();
      c.restore();
    }
    c.restore();
    return 18;
  }
  function heronMover(env, t) {
    const H = heronAt(t), L = env.Lnow || env.L, p = proj(H.x, H.d, HW), k = f / H.d;
    return { y: p[1], d: H.d, draw(c) {
      const vs = env.vs, ox = env.ox, oy = env.oy;
      let n = 0;
      // the reflection: the same bird mirrored in the water, darker and softer, a little ripple
      const rip = Math.sin(t * 2.3) * 0.4;
      c.setTransform(vs * k * H.fwd, 0, 0, vs * k * 0.92, ox + vs * (p[0] + rip), oy + vs * p[1]);
      c.globalAlpha = 0.3; n += heronDraw(c, L, H, true); c.globalAlpha = 1;
      // rings: each foot set down, and the stab
      c.setTransform(vs, 0, 0, vs, ox, oy);
      if (H.moving) for (let i = 0; i <= H.stepIdx; i++) { const age = H.u - (i * 1.75 + 0.55); if (age > 0) n += ring(c, L, H.x, H.d, age, 0.28, 0.5); }
      if (H.u > 9.95) { n += ring(c, L, H.x + H.fwd * 0.58, H.d - 0.05, H.u - 9.95, 0.55, 0.75); n += splash(c, L, H.x + H.fwd * 0.58, H.d - 0.05, H.u - 9.97, 1); }
      // the bird
      c.setTransform(vs * k * H.fwd, 0, 0, -vs * k, ox + vs * p[0], oy + vs * p[1]);
      n += heronDraw(c, L, H, false);
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      return n;
    } };
  }
  // ---- the kingfisher on its stake ----
  const KF = { stake: [4.2, 8.8], top: 0.74, dive: [5.4, 10.6], T: 26, off: 5.0 };
  const bez = (a, b, cc, u) => [0, 1, 2].map(i => (1 - u) * (1 - u) * a[i] + 2 * (1 - u) * u * cc[i] + u * u * b[i]);
  function kfAt(t) {
    const w = t + KF.off, cyc = Math.floor(w / KF.T), u = w - cyc * KF.T;
    const perch = [KF.stake[0] - 0.01, KF.stake[1], KF.top + 0.035], wat = [KF.dive[0], KF.dive[1], HW];
    let pos = perch, ang = 0, mode = 'perch', fish = false, wing = 0, hide = false;
    if (u >= 10.25 && u < 10.75) { const s = Math.pow((u - 10.25) / 0.5, 1.7); pos = bez(perch, wat, [4.5, 9.3, 1.3], s); mode = 'dive'; }
    else if (u >= 10.75 && u < 11.15) { pos = wat; hide = true; mode = 'under'; }
    else if (u >= 11.15 && u < 11.95) { const s = ss(11.15, 11.95, u); pos = bez(wat, perch, [5.6, 9.6, 1.5], s); mode = 'fly'; fish = true; wing = Math.sin(u * 70); }
    else if (u >= 11.95 && u < 13.8) { fish = true; }
    if (mode === 'dive' || mode === 'fly') {
      const e = 0.01, a = mode === 'dive' ? bez(perch, wat, [4.5, 9.3, 1.3], Math.max(0, Math.pow((u - 10.25) / 0.5, 1.7) - e)) : bez(wat, perch, [5.6, 9.6, 1.5], Math.max(0, ss(11.15, 11.95, u) - e));
      const pa = proj(a[0], a[1], a[2]), pb = proj(pos[0], pos[1], pos[2]);
      ang = Math.atan2(-(pb[1] - pa[1]), Math.abs(pb[0] - pa[0]) + 1e-6);
    }
    const bob = mode === 'perch' && u > 13.8 ? Math.max(0, Math.sin(u * 3.1)) * 0.25 : 0;
    const beat = u >= 11.95 && u < 13.8 ? Math.max(0, Math.sin((u - 11.95) * 7)) * 0.9 : 0;
    return { u, pos, ang, mode, fish, wing, hide, bob, beat, fwd: mode === 'fly' ? 1 : -1 };
  }
  function kfDraw(c, L, K, refl) {
    const g = (h) => col(L, h);
    c.save(); c.rotate(K.ang);
    if (K.mode === 'fly') { c.fillStyle = g('#1b6e9e'); c.save(); c.scale(1, 0.25 + 0.75 * Math.abs(K.wing)); ell(c, -0.005, 0.03 * Math.sign(K.wing || 1), 0.06, 0.035, 0); c.fill(); c.restore(); }
    c.fillStyle = g('#1f5f8c'); c.beginPath(); c.moveTo(-0.045, 0.004); c.lineTo(-0.085, -0.006); c.lineTo(-0.045, -0.012); c.closePath(); c.fill();
    c.fillStyle = g('#2a8fc6'); ell(c, -0.005, 0.0, 0.05, 0.026, 0); c.fill();
    c.fillStyle = g('#e57a32'); ell(c, 0.004, -0.011, 0.04, 0.016, 0); c.fill();
    if (!refl) { c.fillStyle = g('#5fe0f6'); ell(c, -0.02, 0.012, 0.03, 0.006, 0.05); c.fill(); }
    c.save(); c.translate(0.042, 0.012); c.rotate(-K.beat * 0.6 + K.bob * 0.4);
    c.fillStyle = g('#2a8fc6'); ell(c, 0, 0, 0.025, 0.023, 0); c.fill();
    c.fillStyle = g('#e57a32'); ell(c, 0.006, -0.008, 0.012, 0.007, 0); c.fill();
    if (!refl) { c.fillStyle = g('#f4f1e6'); ell(c, 0.012, -0.016, 0.008, 0.005, 0); c.fill(); c.fillStyle = '#101010'; ell(c, 0.011, 0.004, 0.0035, 0.0035, 0); c.fill(); }
    c.fillStyle = g('#1a1a1c'); c.beginPath(); c.moveTo(0.02, 0.006); c.lineTo(0.072, -0.002); c.lineTo(0.02, -0.006); c.closePath(); c.fill();
    if (K.fish) { c.fillStyle = g('#c4ced4'); ell(c, 0.07, -0.004, 0.022, 0.006, 0.25 + Math.sin(K.u * 30) * 0.2); c.fill(); }
    c.restore();
    if (K.mode === 'perch' && !refl) { c.strokeStyle = g('#c4402a'); c.lineWidth = 0.006; c.beginPath(); c.moveTo(0.0, -0.022); c.lineTo(0.004, -0.035); c.stroke(); }
    c.restore();
    return 12;
  }
  function stakeDraw(c, L, refl) {
    const g = (h) => col(L, h);
    c.fillStyle = g(refl ? '#2a2620' : '#4a4034'); c.beginPath();
    c.moveTo(-0.035, -0.1); c.lineTo(-0.02, KF.top * 0.55 - HW); c.lineTo(-0.01, KF.top - HW); c.lineTo(0.025, KF.top - HW + 0.01); c.lineTo(0.03, 0.4); c.lineTo(0.04, -0.1); c.closePath(); c.fill();
    c.strokeStyle = g(refl ? '#2a2620' : '#5a4e40'); c.lineWidth = 0.018; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0.0, 0.62); c.quadraticCurveTo(0.12, 0.74, 0.2, 0.86); c.stroke();
    c.lineWidth = 0.009; c.beginPath(); c.moveTo(0.14, 0.78); c.lineTo(0.2, 0.76); c.stroke();
    if (!refl) { c.fillStyle = g('#7a6c58'); c.beginPath(); c.moveTo(-0.01, KF.top - HW); c.lineTo(0.025, KF.top - HW + 0.01); c.lineTo(0.02, 0.3); c.lineTo(0.005, 0.3); c.closePath(); c.fill(); }
    return 3;
  }
  function kfMovers(env, t) {
    const L = env.Lnow || env.L, K = kfAt(t), out = [];
    const sb = proj(KF.stake[0], KF.stake[1], HW), ks = f / KF.stake[1];
    const day = !L || (L.dark || 0) < 0.55;
    out.push({ y: sb[1], d: KF.stake[1], draw(c) {
      const vs = env.vs, ox = env.ox, oy = env.oy;
      let n = 0;
      // the stake and its reflection (the water level is the stake's foot: local v 0 at the water)
      c.setTransform(vs * ks, 0, 0, vs * ks * 0.9, ox + vs * sb[0], oy + vs * sb[1]); c.globalAlpha = 0.35; n += stakeDraw(c, L, true); c.globalAlpha = 1;
      c.setTransform(vs * ks, 0, 0, -vs * ks, ox + vs * sb[0], oy + vs * sb[1]); n += stakeDraw(c, L, false);
      if (!day) { c.setTransform(1, 0, 0, 1, 0, 0); return n; }
      c.setTransform(vs, 0, 0, vs, ox, oy);
      if (K.u >= 10.7) { n += splash(c, L, KF.dive[0], KF.dive[1], K.u - 10.72, 0.7); n += ring(c, L, KF.dive[0], KF.dive[1], K.u - 10.72, 0.5, 0.8); }
      if (!K.hide) {
        const kk = f / K.pos[1], bp = proj(K.pos[0], K.pos[1], K.pos[2]);
        if (K.mode === 'dive') {
          // the blue streak behind the plunge
          const a = proj(KF.stake[0], KF.stake[1], KF.top + 0.04);
          const gr = c.createLinearGradient(a[0], a[1], bp[0], bp[1]); gr.addColorStop(0, 'rgba(60,170,230,0)'); gr.addColorStop(1, 'rgba(70,190,240,0.55)');
          c.strokeStyle = gr; c.lineWidth = 0.03 * kk; c.lineCap = 'round'; c.beginPath(); c.moveTo(lerp(a[0], bp[0], 0.45), lerp(a[1], bp[1], 0.45)); c.lineTo(bp[0], bp[1]); c.stroke(); n++;
        }
        const dir = K.mode === 'fly' ? 1 : -1;
        c.setTransform(vs * kk * dir, 0, 0, -vs * kk, ox + vs * bp[0], oy + vs * bp[1]);
        n += kfDraw(c, L, K, false);
      }
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      return n;
    } });
    return out;
  }
  // ---- the great crested grebes ----
  const GR = { a: [3.0, 23.6], b: [3.9, 23.9], T: 16, off: 3.5 };
  function grebeDraw(c, L, G, refl) {
    const g = (h) => col(L, h), disp = G.disp;
    c.lineCap = 'round';
    c.fillStyle = g('#5e4e3e'); ell(c, -0.02, 0.05, 0.2, 0.055, 0.04); c.fill();
    c.fillStyle = g('#a88a66'); ell(c, 0.0, 0.03, 0.16, 0.03, 0); c.fill();
    c.fillStyle = g('#f0ede6'); ell(c, 0.12, 0.05, 0.06, 0.04, 0); c.fill();
    const hx = lerp(0.14, 0.12, disp), hy = lerp(0.27, 0.38, disp);
    c.strokeStyle = g('#efece5'); c.lineWidth = 0.04; c.beginPath(); c.moveTo(0.12, 0.06); c.quadraticCurveTo(0.16, 0.16, hx, hy); c.stroke();
    if (!refl) { c.strokeStyle = g('#4a3c30'); c.lineWidth = 0.012; c.beginPath(); c.moveTo(0.1, 0.08); c.quadraticCurveTo(0.135, 0.18, hx - 0.016, hy - 0.01); c.stroke(); }
    c.save(); c.translate(hx, hy); c.scale(G.shake, 1);
    if (disp > 0.2) { c.fillStyle = g('#a84e22'); ell(c, -0.005, -0.012, 0.035 + 0.03 * disp, 0.03 + 0.012 * disp, 0); c.fill(); c.fillStyle = g('#2a2018'); ell(c, -0.01, -0.03, 0.03 + 0.025 * disp, 0.012, 0); c.fill(); }
    c.fillStyle = g('#f2efe8'); ell(c, 0.004, 0, 0.032, 0.022, 0); c.fill();
    c.fillStyle = g('#1e1a16'); ell(c, -0.004, 0.017, 0.03, 0.01, 0); c.fill();
    c.beginPath(); c.moveTo(-0.02, 0.02); c.lineTo(-0.03, 0.02 + 0.03 * (0.4 + disp)); c.lineTo(-0.005, 0.024); c.closePath(); c.fill();
    c.fillStyle = g('#d48e86'); c.beginPath(); c.moveTo(0.028, 0.006); c.lineTo(0.075, 0.0); c.lineTo(0.028, -0.004); c.closePath(); c.fill();
    c.restore();
    return 10;
  }
  function grebeMovers(env, t) {
    const L = env.Lnow || env.L, w = t + GR.off, cyc = Math.floor(w / GR.T), u = w - cyc * GR.T, out = [];
    const disp = u < 5 ? 0 : u < 5.6 ? ss(5, 5.6, u) : u < 11 ? 1 : u < 11.8 ? 1 - ss(11, 11.8, u) : 0;
    const gap = lerp(1.1, 0.55, disp);
    for (let i = 0; i < 2; i++) {
      const facing = disp > 0.4 ? (i ? -1 : 1) : (Math.sin(cyc * 1.7 + i) > 0 ? 1 : -1);
      const cx = lerp(GR.a[0], GR.b[0], 0.5) + Math.sin(t * 0.07 + 1) * 0.4, cd = lerp(GR.a[1], GR.b[1], 0.5) + Math.sin(t * 0.05) * 0.3;
      const x = cx + (i ? 0.5 : -0.5) * gap, d = cd + (i ? 0.12 : -0.08);
      // one of the pair dives in the quiet part of every other cycle: down (a ring), gone, up again further on
      let alpha = 1, dx = 0;
      if (i === 1 && cyc % 2 === 0 && u > 12.2) { const v = u - 12.2; alpha = v < 0.25 ? 1 - v / 0.25 : v < 3.2 ? 0 : Math.min(1, (v - 3.2) / 0.3); dx = v >= 3.2 ? 0.9 * (1 - ss(3.2, 3.8, v)) : 0; }
      const shake = disp > 0.6 ? (Math.sin(u * 9 + i * 1.3) > 0 ? 1 : -1) * (0.55 + 0.45 * Math.abs(Math.sin(u * 9 + i * 1.3))) : 1;
      const G = { disp, shake, x: x + dx, d, facing };
      const p = proj(G.x, d, HW), k = f / d, bob = Math.sin(t * 2.2 + i) * 0.006;
      out.push({ y: p[1], d, draw(c) {
        const vs = env.vs, ox = env.ox, oy = env.oy;
        let n = 0;
        c.setTransform(vs, 0, 0, vs, ox, oy);
        if (i === 1 && cyc % 2 === 0 && u > 12.2) { n += ring(c, L, x, d, u - 12.25, 0.45, 0.7); n += ring(c, L, x + 0.9, d, u - 15.4 + 0 * 1, 0.4, 0.6); }
        if (alpha > 0.02) {
          c.globalAlpha = 0.3 * alpha; c.setTransform(vs * k * G.facing, 0, 0, vs * k * 0.9, ox + vs * p[0], oy + vs * p[1]); n += grebeDraw(c, L, G, true);
          c.globalAlpha = alpha; c.setTransform(vs * k * G.facing, 0, 0, -vs * k, ox + vs * p[0], oy + vs * (p[1] + bob * k)); n += grebeDraw(c, L, G, false);
        }
        c.globalAlpha = 1; c.setTransform(1, 0, 0, 1, 0, 0);
        return n;
      } });
    }
    return out;
  }
  // ---- swallows over the water (spring and summer days) ----
  function swallowMovers(env, t, C) {
    const L = env.Lnow || env.L, out = [];
    if ((L && (L.dark || 0) > 0.45) || (C.season !== 'summer' && C.season !== 'spring')) return out;
    for (let i = 0; i < 5; i++) {
      const at = (tt) => [-3 + 12 * Math.sin(0.27 * tt + i * 1.7) + 4 * Math.sin(0.71 * tt + i), 28 + 13 * Math.sin(0.19 * tt + i * 2.3), HW + 0.18 + 2.4 * Math.pow(0.5 + 0.5 * Math.sin(0.45 * tt + i * 1.1), 1.8)];
      const q = at(t), q2 = at(t + 0.05), p = proj(q[0], q[1], q[2]), p2 = proj(q2[0], q2[1], q2[2]), k = f / q[1];
      const dir = p2[0] >= p[0] ? 1 : -1, flap = Math.sin(t * 19 + i * 2);
      // the last touch on the water: when the sine was at its lowest
      const tk = (-Math.PI / 2 - i * 1.1) / 0.45, per = TAU / 0.45, last = tk + Math.floor((t - tk) / per) * per, wq = at(last);
      out.push({ y: p[1] + 0.001 * i, d: q[1], draw(c) {
        const vs = env.vs, ox = env.ox, oy = env.oy, g = (h) => col(L, h);
        let n = ring(c, L, wq[0], wq[1], t - last, 0.3, 0.6);
        c.setTransform(vs * k * dir, 0, 0, -vs * k, ox + vs * p[0], oy + vs * p[1]);
        c.fillStyle = g('#1c2433');
        ell(c, 0, 0, 0.06, 0.014, 0); c.fill();
        c.beginPath(); c.moveTo(-0.05, 0.002); c.lineTo(-0.12, -0.012); c.lineTo(-0.07, 0.0); c.lineTo(-0.12, 0.01); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(0.02, 0.004); c.lineTo(-0.05, 0.16 * flap); c.lineTo(-0.01, 0.004); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(0.02, -0.002); c.lineTo(-0.07, -0.13 * flap - 0.02); c.lineTo(-0.012, -0.004); c.closePath(); c.fill();
        c.fillStyle = g('#b4442a'); ell(c, 0.05, 0.0, 0.01, 0.008, 0); c.fill();
        c.setTransform(1, 0, 0, 1, 0, 0);
        return n + 5;
      } });
    }
    return out;
  }
  // ---- bats at dusk and by night (spring to autumn) ----
  function batMovers(env, t, C) {
    const L = env.Lnow || env.L, out = [];
    if (!L || (L.dark || 0) < 0.3 || C.season === 'winter') return out;
    for (let i = 0; i < 4; i++) {
      const x = -4 + i * 3.5 + 4 * Math.sin(0.9 * t + i * 2.1) + 1.4 * Math.sin(3.3 * t + i), d = 13 + i * 2.5 + 4 * Math.sin(0.63 * t + i * 1.3);
      const h = 4.6 + 1.3 * Math.sin(1.27 * t + i) + 0.4 * Math.sin(5.3 * t + i * 2), p = proj(x, d, h), k = f / d, flap = Math.sin(t * 24 + i * 3);
      out.push({ y: proj(x, d, HW)[1], d, draw(c) {
        const vs = env.vs, ox = env.ox, oy = env.oy;
        c.setTransform(vs * k, 0, 0, -vs * k, ox + vs * p[0], oy + vs * p[1]);
        c.fillStyle = '#14100e';
        ell(c, 0, 0, 0.025, 0.014, 0); c.fill();
        for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(0, 0.005); c.lineTo(sg * 0.06, 0.05 * flap + 0.01); c.lineTo(sg * 0.11, 0.03 * flap - 0.005); c.lineTo(sg * 0.075, -0.004); c.lineTo(sg * 0.04, 0.0); c.closePath(); c.fill(); }
        c.setTransform(1, 0, 0, 1, 0, 0);
        return 3;
      } });
    }
    return out;
  }
  // ---- the trains' reflections in the open water (lit windows at night): the flow's own sprite, mirrored about the water
  // level under the track, clipped to the lake, softened; the far reeds and the shore stay in front ----
  let waterClip = null, waterClipD = null;
  function trainReflMovers(env, t) {
    const L = env.Lnow || env.L, out = [], C = env.C, w = C.water && C.water[0];
    if (!w || typeof env.sprite !== 'function') return out;
    for (const a of env.flowNow || []) {
      if (a.kind !== 'train' && !/train/.test(a.o || '')) continue;
      const yw = proj(a.x, a.d, HW)[1];
      out.push({ y: yw, d: Math.max(55, a.d - 30), draw(c) {
        const vs = env.vs, ox = env.ox, oy = env.oy, b = 2 ** (Math.ceil(Math.log2(Math.max(1e-3, a.s)) * 2) / 2);
        const sp = env.sprite({ o: a.o, v: a.v || 0, part: '*', scale: b * vs, litGlow: !!(L && L.windows), haze: 0 });
        if (!sp || !sp.c) return 0;
        if (waterClipD !== w.d) { waterClipD = w.d; try { waterClip = new Path2D(w.d); } catch (e) { waterClip = null; } }
        c.save();
        c.setTransform(vs, 0, 0, vs, ox, oy);
        if (waterClip) c.clip(waterClip);
        const night = L ? (L.dark || 0) : 0;
        c.globalAlpha = (0.32 + 0.4 * night) * (a.alpha == null ? 1 : a.alpha);
        // six horizontal slices, each shifted by its own ripple: the mirror breaks up as it nears the camera
        c.setTransform(vs * a.s * (a.flip ? -1 : 1), 0, 0, -vs * a.s * 0.85, vs * a.X + ox, vs * (2 * yw - a.Y) + oy);
        const n = 6, ch = sp.c.height / n, lh = sp.h / n;
        for (let j = 0; j < n; j++) {
          const off = Math.sin(t * 2.1 + j * 1.3 + a.x * 0.1) * (0.8 + (n - 1 - j) * 0.9) / Math.max(0.05, a.s);
          c.drawImage(sp.c, 0, j * ch, sp.c.width, ch, sp.x0 + off, sp.y0 + j * lh, sp.w, lh);
        }
        c.restore();
        c.globalAlpha = 1;
        return n;
      } });
    }
    return out;
  }
  // ---- fish rising in the open water ----
  const RISES = [[6.5, 30, 0], [-6, 40, 3.1], [12, 44, 6.3], [1.5, 55, 4.4], [-10, 33, 7.7]];
  function riseMovers(env, t) {
    const L = env.Lnow || env.L, out = [];
    for (const [x, d, o] of RISES) {
      const per = 9.5 + o, age = frac((t + o * 1.7) / per) * per;
      if (age > 1.8) continue;
      out.push({ y: proj(x, d, HW)[1], d, draw(c) { c.setTransform(env.vs, 0, 0, env.vs, env.ox, env.oy); const n = ring(c, L, x, d, age, 0.6, 0.65) + (age < 0.3 ? splash(c, L, x, d, age, 0.4) : 0); c.setTransform(1, 0, 0, 1, 0, 0); return n; } });
    }
    return out;
  }
  // ---- mist banks over the water (dawn and morning, faintly at dusk) ----
  let mistSprite = null;
  const mistImg = () => {
    if (mistSprite) return mistSprite;
    const w = 256, h = 48;
    let cv = null;
    try { cv = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : document.createElement('canvas'); } catch (e) { return null; }
    cv.width = w; cv.height = h;
    const x = cv.getContext('2d'); x.setTransform(1, 0, 0, h / w, 0, 0);
    const gr = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, w, w);
    mistSprite = cv;
    return cv;
  };
  function mistMovers(env, t, C) {
    const L = env.Lnow || env.L, out = [];
    if (!L) return out;
    const tod = L.tod || 'day', se = C.season;
    const k0 = tod === 'dawn' ? 1 : tod === 'morning' ? 0.7 : tod === 'dusk' || tod === 'evening' ? 0.45 : tod === 'night' ? 0.25 : 0;
    const amt = k0 * (se === 'autumn' || se === 'winter' ? 1 : se === 'spring' ? 0.8 : 0.6) * (L.rain ? 0.4 : 1);
    if (amt < 0.05) return out;
    const img = mistImg();
    if (!img) return out;
    const banks = [[-30, 60, 46, 0.9], [10, 52, 40, 1], [40, 70, 50, 0.8], [-10, 38, 28, 0.85], [22, 30, 22, 0.7], [-22, 26, 18, 0.6], [5, 80, 60, 0.9]];
    banks.forEach(([x0, d, wm, a], i) => {
      const x = x0 + ((t * (0.35 + 0.1 * i) + i * 13) % 90) - 45, p = proj(x, d, HW + 0.4), k = f / d;
      out.push({ y: proj(x, d, HW)[1] + 0.5, d, draw(c) {
        c.setTransform(env.vs, 0, 0, env.vs, env.ox, env.oy);
        c.globalAlpha = amt * a * 0.5;
        const wpx = wm * k, hpx = Math.max(6, 2.2 * k);
        c.drawImage(img, p[0] - wpx / 2, p[1] - hpx / 2, wpx, hpx);
        c.globalAlpha = 1; c.setTransform(1, 0, 0, 1, 0, 0);
        return 1;
      } });
    });
    return out;
  }
  try { sceneRenderPassDefine({
    id: 'proof-fleet-pond',
    order: { movers: 60, stats: 60, default: 60 },
    applies(C) { return !!(C && C.id === 'proof-fleet-pond'); },
    movers(env, grp, t, push) {
      const C = env.C, gi = (env.groups || []).indexOf(grp);
      if (env._pfpT !== t || !env._pfpList) {
        env._pfpT = t;
        const all = [heronMover(env, t)].concat(kfMovers(env, t), grebeMovers(env, t), swallowMovers(env, t, C), batMovers(env, t, C), riseMovers(env, t), mistMovers(env, t, C), trainReflMovers(env, t));
        for (const m of all) m.gi = groupOf(env, m.d);
        env._pfpList = all;
      }
      for (const m of env._pfpList) if (m.gi === gi) push({ kind: 'custom', y: m.y, draw: m.draw });
      return 0;
    },
    stats(env) { return { movers: env._pfpList ? env._pfpList.length : 0 }; },
  }); } catch (e) { return false; }   // the registry is not loaded yet (its consts): the next call defines it
  sceneProofFleetPondPass.done = true;
  return true;
}

/* ---------- plant.proof-fleet-bough: an alder bough hanging into the top-left corner, the foreground frame ----------
   Drawn in screen units for the front layer (anchor: where the branch leaves the frame's left edge, top-left), the leaves in
   drooping sprays that sway on the wind (one hook, one part). Spring: fresh green with catkins; summer: deep green; autumn:
   yellowing and thinner with the cones showing; winter: bare twigs, purple catkins and last year's cones. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = (v) => Math.round(v * 10) / 10;
  sceneObjDefine({
    id: 'plant.proof-fleet-bough',
    category: 'plant',
    size: [560, 330],
    variants: 1,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base:   { bark: ['#3a3128', '#56483a', '#6e5e4c'], leaf: ['#2e4a26', '#3e6030', '#5a7e3e', '#7a9c4e'], cone: ['#3a2a20', '#5a4030'], catkin: ['#6a4a4a', '#8a6458'] },
      spring: { leaf: ['#3e6a2a', '#5a8a36', '#7fae48', '#a4c860'], catkin: ['#8a6a3a', '#b08a48'] },
      summer: { leaf: ['#24401f', '#335a28', '#4c7434', '#6e9446'] },
      autumn: { leaf: ['#4a5a26', '#7a7a2e', '#a88a36', '#c8a040'] },
    },
    parts: ['branch', 'leaves'],
    anim: { sway: { part: 'leaves', pivot: [0, 40], deg: 1.2 } },
    reflect: false,
    shadow: false,
    tags: ['uk', 'alder', 'frame', 'kit:temperate', 'role:frame', 'class:shrub'],
    credit: 'drawn for the Fleet Pond scene: a common alder (Alnus glutinosa) bough',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { branch: [], leaves: [] };
      // the branch: a tapering limb from the left edge, two side branches, twigs (each a filled taper)
      const limb = (pts, w0, w1, f) => {
        const L = [], Rr = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
          const w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
          L.push([pts[i][0] - dy / m * w, pts[i][1] + dx / m * w]); Rr.push([pts[i][0] + dy / m * w, pts[i][1] - dx / m * w]);
        }
        out.branch.push({ f, d: 'M' + L.concat(Rr.reverse()).map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z' });
      };
      const main = [[-30, 22], [60, 32], [150, 50], [240, 76], [320, 106], [395, 142], [460, 182], [505, 224]];
      limb(main, 34, 5, '@bark.0');
      limb(main.map(([x, y]) => [x, y - 4]), 14, 2, '@bark.1');
      const sides = [[[120, 44], [172, 96], [206, 156], [220, 214]], [[262, 84], [304, 138], [322, 196]], [[352, 120], [418, 112], [480, 96], [530, 92]], [[80, 36], [112, 84], [120, 140]], [[430, 160], [470, 150], [520, 150]]];
      sides.forEach((s, i) => limb(s, 10 - i, 2, '@bark.' + (i % 2)));
      // twigs and the spray anchors along the limbs
      const anchors = [];
      const along = (pts, n) => { for (let i = 1; i <= n; i++) { const u = i / (n + 1), k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))), t = u * (pts.length - 1) - k; anchors.push([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t]); } };
      along(main.slice(1), 12); sides.forEach(s => along(s, 4));
      for (const [ax, ay] of anchors) {
        const tx = ax + (rnd() - 0.3) * 30, ty = ay + 26 + rnd() * 40;
        out.branch.push({ s: '@bark.2', w: 1.4, d: `M${R(ax)} ${R(ay)}Q${R((ax + tx) / 2 + 6)} ${R(ay + 4)} ${R(tx)} ${R(ty)}`, cap: 'round' });
        if (season !== 'summer' && rnd() < 0.5) {
          // cones (old ones in every season but summer) and catkins in winter and spring
          out.branch.push({ f: '@cone.' + (rnd() < 0.5 ? 0 : 1), d: sceneD.ell(tx + 2, ty + 5, 3.2, 4.6) });
          if (season === 'winter' || season === 'spring') out.branch.push({ s: '@catkin.' + (rnd() < 0.5 ? 0 : 1), w: 2.6, cap: 'round', d: `M${R(tx - 4)} ${R(ty)}q-2 9 1 17` });
        }
        if (season === 'winter') continue;
        // a drooping spray of rounded alder leaves (fewer in autumn), darker inside, lit at the edges
        const n = season === 'autumn' ? 6 : 10;
        for (let j = 0; j < n; j++) {
          const u = j / n, lx = ax + (tx - ax) * u + (rnd() - 0.5) * 18, ly = ay + (ty - ay) * u + (rnd() - 0.5) * 10 + 6;
          const a = Math.PI + (rnd() - 0.5) * 1.6, len = 13 + rnd() * 9, tone = j < n / 2 ? Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3);
          out.leaves.push({ f: '@leaf.' + tone, d: sceneD.leaf(lx, ly, a, len, len * 0.42) });
          if (rnd() < 0.3) out.leaves.push({ f: '@leaf.3', d: sceneD.leaf(lx + 1, ly - 1, a, len * 0.6, len * 0.2), op: 0.6, detail: true });
        }
      }
      return out;
    },
  });
})();

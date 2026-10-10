/* ============================================================
   SCENE LIBRARY: canal views (docs/dev/SCENE_ENGINE_V2.md), the shared ground plans and the in-perspective objects of the
   four Basingstoke Canal at Fleet views (71-scene-uk-south-east-basingstoke-canal-fleet-1..4.js). PURE: data and
   sceneObjDefine calls at load; the recipes are built lazily by sceneCanalViewV2(id).

   The Basingstoke Canal crosses Fleet on its long lock-free summit pound: about 12 m of still green water, a gravel towpath
   on one bank, oak, alder, willow and birch over both, Fleet's back gardens down to the offside, low brick arch road bridges
   (Reading Road, Pondtail) with the towpath under them, narrowboats moored at the wharves and the canal society's trip boat.
   Every view is a CURVING cut seen at an angle (never the symmetric one-point corridor of the old views).

   Like the Fleet Pond proof, the things that must sit exactly in the camera's perspective are drawn FROM the camera:
   - boat.canal-view-boat: narrowboats and a wide-beam trip boat, true 3D boxes (hull, counter, cabin, roof clutter, cratch,
     portholes that light at dusk, mooring lines), in pieces of a few metres so each piece mirrors about its own waterline
     and the reeds sort in front of or behind it;
   - structure.canal-view-bridge: a brick arch road bridge across the cut (voussoirs, string course, coping, ivy, the dark
     barrel with the towpath ledge under it), the arch open so the reach beyond shows through;
   - structure.canal-view-parapet: the parapet we lean on (the view from Reading Road bridge).
   Framing foreground (screen units, the front layer): plant.canal-view-fronds (weeping willow curtain) and
   plant.canal-view-bough (an oak bough). Bank flora: plant.canal-view-loosestrife (purple loosestrife) and
   plant.canal-view-meadowsweet. Ground metres: x to the right of the view axis, d forward, h up from the towpath.
   ============================================================ */
const SCENE_CANAL_VIEWS = (function () {
  /** Catmull-Rom through pts (uniform), n samples a span. */
  const spline = (pts, n) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  };
  function mk(id, V) {
    const C = V.camera, f = 800 / Math.tan(C.fov * Math.PI / 360), x0 = C.x0 || 800, W = C.water;
    const proj = (x, d, h) => [x0 + f * x / d, C.horizon + f * (C.eye - h) / d];
    const dense = spline(V.path, 30), arc = [0];
    for (let i = 1; i < dense.length; i++) arc.push(arc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const L = arc[arc.length - 1];
    /** The centreline at arc s: [x, d, tx, td] (t the unit tangent, away from the camera). */
    const at = (s) => {
      s = Math.max(0, Math.min(L, s));
      let lo = 1, hi = arc.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (arc[m] < s) lo = m + 1; else hi = m; }
      const a = dense[lo - 1], b = dense[lo], u = (s - arc[lo - 1]) / Math.max(1e-6, arc[lo] - arc[lo - 1]);
      const tx = b[0] - a[0], td = b[1] - a[1], m = Math.hypot(tx, td) || 1;
      return [a[0] + tx * u, a[1] + td * u, tx / m, td / m];
    };
    /** The arc length nearest depth d (the path runs away from the camera). */
    const sAtD = (d) => { for (let i = 1; i < dense.length; i++) if (dense[i][1] >= d) return arc[i - 1] + (arc[i] - arc[i - 1]) * (d - dense[i - 1][1]) / Math.max(1e-6, dense[i][1] - dense[i - 1][1]); return L; };
    /** A line offset o metres to the RIGHT of the centreline (negative: left), from arc s0 to s1, every step metres. */
    const line = (o, s0, s1, step) => {
      const out = [], a = Math.max(0, s0 == null ? 0 : s0), b = Math.min(L, s1 == null ? L : s1), st = step || 2;
      for (let s = a; s < b; s += st) { const q = at(s); out.push([q[0] + q[3] * o, q[1] - q[2] * o]); }
      const q = at(b); out.push([q[0] + q[3] * o, q[1] - q[2] * o]);
      return out.map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);
    };
    /** A strip between offsets o0 and o1 (metres right of the centre), arc s0..s1: a ground polygon. */
    const band = (o0, o1, s0, s1, step) => line(o0, s0, s1, step).concat(line(o1, s0, s1, step).reverse());
    return Object.assign({ id }, V, { f, x0, W, proj, dense, at, sAtD, L, line, band });
  }
  // ---- the four views ----
  const views = {
    // 1: from the parapet of Reading Road bridge, looking WSW down the wharf: boats moored nose to tail on the towpath side,
    // the trip boat coming up the cut, the gardens of Fleet on the offside, the reach bending away right then left
    'fleet-canal-1': mk('fleet-canal-1', {
      camera: { eye: 5.6, fov: 66, horizon: 380, heading: 240, lat: 51.2806, lon: -0.8395, water: -0.5 },
      path: [[-3.2, 0.5], [-3.6, 15], [-4.6, 35], [-4.2, 60], [-1, 90], [5, 125], [9.5, 165], [8, 215], [-1, 270], [-18, 350], [-48, 450], [-90, 560]],
      width: 12, tow: 'left', towW: 2.8,
      boats: [
        { s: 15, o: -4.5, len: 19, liv: 0, smoke: true, roof: 'logs' },
        { s: 35, o: -4.5, len: 17, liv: 1, roof: 'solar' },
        { s: 72, o: -4.5, len: 20, liv: 2, smoke: true, roof: 'pots', rev: true },
        { s: 73, o: -4.4, len: 15, liv: 4, roof: 'bike' },
        { s: 66, o: 1.4, len: 21, liv: 5, trip: true, rev: true },
        { s: 118, o: 4.4, len: 18, liv: 3, roof: 'pots', smoke: true },
        { s: 162, o: 4.3, len: 18, liv: 0 },
      ],
      parapet: { a: [-0.82, 1.12], b: [0.98, 1.3] },
    }),
    // 2: on the towpath by the moorings near Pondtail, the canal on the left sweeping away right: a moored boat close
    // alongside, its stove smoking; reeds and alder carr on the offside, a heron in the margin, the trip boat far down
    'fleet-canal-2': mk('fleet-canal-2', {
      camera: { eye: 1.65, fov: 64, horizon: 468, heading: 215, lat: 51.2905, lon: -0.8228, water: -0.45 },
      path: [[-8.6, 1], [-6.9, 10], [-4.6, 20], [-1.5, 35], [3, 55], [7.5, 85], [9, 120], [6, 165], [-2, 230], [-15, 320], [-37, 420]],
      width: 12, tow: 'right', towW: 3.0,
      boats: [
        { s: 9, o: 4.55, len: 19, liv: 3, smoke: true, roof: 'logs' },
        { s: 29.5, o: 4.5, len: 18, liv: 1, roof: 'pots' },
        { s: 49, o: 4.45, len: 16, liv: 2, smoke: true },
        { s: 104, o: 0.2, len: 21, liv: 5, trip: true, rev: true },
      ],
    }),
    // 3: the wooded cutting toward Malthouse Bridge, autumn: a tunnel of oak and alder over a curving cut, the brick arch
    // ahead with its ring of reflection, a boat moored on the offside, a kingfisher on a branch over the water
    'fleet-canal-3': mk('fleet-canal-3', {
      camera: { eye: 1.75, fov: 60, horizon: 455, heading: 215, lat: 51.2752, lon: -0.8505, water: -0.45 },
      path: [[6.4, 1], [7, 12], [7.6, 25], [6.5, 40], [2.5, 58], [-4, 78], [-12, 100], [-22, 128], [-36, 165], [-55, 220]],
      width: 11, tow: 'right', towW: 2.6, offHedge: false,
      boats: [
        { s: 30, o: 3.8, len: 18, liv: 2, smoke: true, roof: 'logs' },
        { s: 49.5, o: 3.7, len: 15, liv: 4 },
      ],
      bridge: { s: 70, T: 7, span: 7.6, uc: 1.2, crown: 3.4, deck: 4.7, half: 20 },
    }),
    // 4: evening at Pondtail, looking west into the low sun: Pondtail Bridge's brick arch with the towpath under it, the back
    // gardens of Fleet down to the offside with boats moored below them, lit windows at real dusk
    'fleet-canal-4': mk('fleet-canal-4', {
      camera: { eye: 1.65, fov: 48, horizon: 500, heading: 250, lat: 51.2917, lon: -0.8174, water: -0.45 },
      path: [[7.2, 1], [6.8, 15], [6.3, 35], [7.3, 60], [6, 90], [1, 130], [-8, 180], [-24, 250], [-45, 330]],
      width: 12, tow: 'left', towW: 2.8,
      boats: [
        { s: 12, o: 4.5, len: 18, liv: 1, roof: 'pots', smoke: true },
        { s: 31.5, o: 4.45, len: 12, liv: 0, roof: 'solar' },
        { s: 66, o: 4.4, len: 17, liv: 3, smoke: true },
      ],
      bridge: { s: 49, T: 7.5, span: 8, uc: -1.8, crown: 3.5, deck: 4.9, half: 22 },
    }),
  };
  // ---- the boat pieces (one object variant each): a piece every ~3.5 m near, fewer far ----
  const boatPieces = [], bridges = [], parapets = [];
  for (const id of Object.keys(views)) {
    const V = views[id];
    V.boatIdx = [];
    (V.boats || []).forEach((B, bi) => {
      const q = V.at(B.s), d = q[1], n = d < 30 ? Math.ceil(B.len / 4) : d < 70 ? Math.ceil(B.len / 6) : d < 140 ? 2 : 1;
      for (let k = 0; k < n; k++) { if (Math.min(V.at(B.rev ? B.s - B.len * (k + 1) / n : B.s + B.len * k / n)[1], d) < 3) continue; V.boatIdx.push(boatPieces.length); boatPieces.push({ id, bi, a0: B.len * k / n, a1: B.len * (k + 1) / n }); }
    });
    if (V.bridge) { V.bridgeIdx = bridges.length; bridges.push(id); }
    if (V.parapet) { V.parapetIdx = parapets.length; parapets.push(id); }
  }
  /** The boat's frame: its stern on the centreline offset, its heading along the cut (rev: bow toward the camera). */
  function boatFrame(V, B) {
    const beam = B.trip ? 3.1 : 2.08;
    const q = V.at(B.s), qb = V.at(B.rev ? B.s - B.len : B.s + B.len);
    const sx = q[0] + q[3] * B.o, sd = q[1] - q[2] * B.o, bx = qb[0] + qb[3] * B.o, bd = qb[1] - qb[2] * B.o;
    const m = Math.hypot(bx - sx, bd - sd) || 1, hx = (bx - sx) / m, hd = (bd - sd) / m;
    // local (a along the heading from the stern, b to the boat's right, h above the water) to ground metres
    const P = (a, b, h) => [sx + a * hx + b * hd, sd + a * hd - b * hx, V.W + h];
    return { beam, P, hx, hd, len: B.len };
  }
  /**
   * (lock, 10 Oct) a piece's anchor: the waterline on the hull side NEAREST the camera (the lowest waterline row on the screen),
   * in the middle of the slice. The engine draws a floater down to that row and mirrors it about it, so the reflection starts
   * exactly where the visible hull meets the water (the centreline sat behind the near side: a gap and a doubled hull).
   */
  function pieceAnchor(V, pc) {
    const B = V.boats[pc.bi], F = boatFrame(V, B), at = (a, sg) => { const g = F.P(a, sg * F.beam / 2, 0); return { g, p: V.proj(g[0], g[1], g[2]) }; };
    // the near side: the one whose waterline is lower on the screen in the middle of the slice
    const mid = (pc.a0 + pc.a1) / 2, sg = at(mid, 1).p[1] >= at(mid, -1).p[1] ? 1 : -1;
    // the anchor: the LOWEST end of that waterline in the slice (nothing of the hull hangs below the engine's waterline clip);
    // slope: the waterline's screen slope, so the engine mirrors about the true (perspective) waterline, not a level row
    const e0 = at(pc.a0, sg), e1 = at(pc.a1, sg), lo = e0.p[1] >= e1.p[1] ? e0 : e1, dx = e1.p[0] - e0.p[0];
    // a piece seen nearly end-on (its waterline steeper than 0.35 on the screen) mirrors level: the shear extrapolated past the
    // side's few pixels stretched its bow into a long streak down the water
    const t = Math.abs(dx) > 0.5 ? (e1.p[1] - e0.p[1]) / dx : 0;
    return { g: lo.g, p: lo.p, slope: Math.abs(t) > 0.35 ? 0 : t };
  }
  return { views, boatPieces, bridges, parapets, boatFrame, pieceAnchor, spline };
})();

/* ---------- boat.canal-view-boat: narrowboats and the trip boat, in the camera's own perspective ----------
   One variant per piece (SCENE_CANAL_VIEWS.boatPieces): a slice of one boat, a0..a1 metres from the stern, anchored at the
   centreline waterline in the middle of the slice (pixels, pinned): the engine mirrors each piece about its own waterline
   and sorts it among the reeds and birds by that row. Faces are culled by their normals (only what faces the camera is
   drawn), far to near. Liveries (no names or lettering): 0 green and gold, 1 maroon and cream, 2 navy and gold, 3 red oxide
   and black, 4 blue and cream; 5 the trip boat (cream cabin, long windows, green hull). */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const CV = SCENE_CANAL_VIEWS, R = (v) => Math.round(v * 10) / 10;
  const LIV = [
    { cab: '#2f5a46', cabD: '#22443a', trim: '#e9c86a', panel: '#b0402a', hull: '#1c2224', roof: '#4a3e34', ports: 'round' },
    { cab: '#6a2a2e', cabD: '#4e1e22', trim: '#efe2c4', panel: '#2f5a46', hull: '#22262a', roof: '#3a3028', ports: 'round' },
    { cab: '#22304a', cabD: '#182438', trim: '#e9c86a', panel: '#9a2a2a', hull: '#1c2224', roof: '#5a4a3a', ports: 'round' },
    { cab: '#8a3a26', cabD: '#5e2818', trim: '#1e1e1e', panel: '#e0c890', hull: '#1a1c1e', roof: '#3a342e', ports: 'square' },
    { cab: '#2a5a8a', cabD: '#1e4466', trim: '#f2ead4', panel: '#f2ead4', hull: '#22262a', roof: '#4a4440', ports: 'square' },
    { cab: '#efe6d0', cabD: '#c8bea6', trim: '#6a2a2e', panel: '#2f5a46', hull: '#24463a', roof: '#d8d2c4', ports: 'trip' },
  ];
  /** A polygon in local metres (a, b, h) projected, relative to the anchor o. */
  function builder(V, F, o) {
    const pr = (a, b, h) => { const g = F.P(a, b, h); return V.proj(g[0], g[1], g[2]); };
    const poly = (pts) => 'M' + pts.map(p => { const s = pr(p[0], p[1], p[2]); return R(s[0] - o[0]) + ' ' + R(s[1] - o[1]); }).join('L') + 'Z';
    const path = (pts) => 'M' + pts.map(p => { const s = pr(p[0], p[1], p[2]); return R(s[0] - o[0]) + ' ' + R(s[1] - o[1]); }).join('L');
    // visible: the face's outward normal (na along the boat, nb across, nh up) points toward the camera
    const seen = (c, na, nb, nh) => {
      const g = F.P(c[0], c[1], c[2]), Nx = na * F.hx + nb * F.hd, Nd = na * F.hd - nb * F.hx;
      return Nx * g[0] + Nd * g[1] + nh * (g[2] - V.camera.eye) < 0;
    };
    const dist = (c) => { const g = F.P(c[0], c[1], c[2]); return Math.hypot(g[0], g[1], g[2] - V.camera.eye); };
    const k = (c) => V.f / F.P(c[0], c[1], c[2])[1];   // units a metre there
    return { pr, poly, path, seen, dist, k };
  }
  function boat(v, rnd, season) {
    const pc = CV.boatPieces[v], V = CV.views[pc.id], B = V.boats[pc.bi], F = CV.boatFrame(V, B), Lv = LIV[B.liv] || LIV[0];
    const L = B.len, hb = F.beam / 2, trip = !!B.trip, GW = trip ? 0.62 : 0.55, RF = trip ? 2.15 : 1.82, cb = hb - 0.08, ct = cb - 0.1;
    const C0 = trip ? 2.2 : 1.5, C1 = trip ? L - 4.2 : L - 3.4, BOW = L - 2.6;
    const o = CV.pieceAnchor(V, pc).p;
    const G = builder(V, F, o), faces = [], top = [], smoke = [];
    const inP = (a) => a >= pc.a0 - 1e-6 && a < pc.a1 + 1e-6;
    const clip = (a0, a1) => [Math.max(a0, pc.a0), Math.min(a1, pc.a1)];
    const face = (pts, n, fill, extra) => { const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]); if (G.seen(c, n[0], n[1], n[2])) faces.push({ c, z: G.dist(c), d: G.poly(pts), f: fill, extra }); };
    const bowB = (a) => (a <= BOW ? hb : hb * Math.sqrt(Math.max(0, 1 - Math.pow((a - BOW) / (L - BOW), 2))));
    const sheer = (a) => (a <= BOW ? GW : GW + 0.28 * Math.pow((a - BOW) / (L - BOW), 2));
    // ---- the hull: sides in slices (the bow sweep), the stern counter, the gunwale and rubbing strakes
    const [h0, h1] = clip(0, L), steps = Math.max(1, Math.ceil((h1 - h0) / 0.9));
    for (let i = 0; i < steps && h1 > h0; i++) {
      const a = h0 + (h1 - h0) * i / steps, b = h0 + (h1 - h0) * (i + 1) / steps;
      for (const sg of [-1, 1]) {
        const ba = bowB(a) * sg, bb = bowB(b) * sg;
        const nb = sg * (b <= BOW ? 1 : 0.7), na = b <= BOW ? 0 : 0.7;
        face([[a, ba, -0.04], [b, bb, -0.04], [b, bb, sheer(b)], [a, ba, sheer(a)]], [na, nb, 0], '@hull.' + B.liv, [
          { f: '@gun.' + B.liv, d: G.poly([[a, ba, sheer(a) - 0.1], [b, bb, sheer(b) - 0.1], [b, bb, sheer(b)], [a, ba, sheer(a)]]) },
          { s: '@strake', w: Math.max(0.5, G.k([a, ba, 0.3]) * 0.03), d: G.path([[a, ba, 0.28], [b, bb, 0.28]]), op: 0.7, detail: true },
          { f: '@wl', d: G.poly([[a, ba, -0.04], [b, bb, -0.04], [b, bb, 0.06], [a, ba, 0.06]]), op: 0.55 },
        ]);
      }
    }
    if (inP(0)) face([[0, -hb, -0.04], [0, hb, -0.04], [0, hb, GW], [0, -hb, GW]], [-1, 0, 0], '@hull.' + B.liv, [{ f: '@gun.' + B.liv, d: G.poly([[0, -hb, GW - 0.1], [0, hb, GW - 0.1], [0, hb, GW], [0, -hb, GW]]) }]);
    // the decks: the stern deck, the well deck, the foredeck (seen from above)
    const deck = (a0, a1, fill) => { const [p, q] = clip(a0, a1); if (q > p) face([[p, -bowB(p), sheer(p)], [q, -bowB(q), sheer(q)], [q, bowB(q), sheer(q)], [p, bowB(p), sheer(p)]], [0, 0, 1], fill); };
    deck(0, C0, '@deck'); deck(C1, BOW, '@deck'); deck(BOW, L, '@deck');
    // ---- the cabin
    const [c0, c1] = clip(C0, C1);
    if (c1 > c0) {
      for (const sg of [-1, 1]) {
        const ext = [];
        // coachlines and the painted panels along the side
        ext.push({ s: '@trim.' + B.liv, w: Math.max(0.5, G.k([c0, sg * cb, 1]) * 0.035), d: G.path([[c0, sg * cb, GW + 0.14], [c1, sg * cb, GW + 0.14]]) + G.path([[c0, sg * (ct + 0.01), RF - 0.17], [c1, sg * (ct + 0.01), RF - 0.17]]) });
        if (!trip) for (let a = C0 + 0.6; a < C1 - 0.8; a += 4.2) {
          const [p, q] = clip(a, Math.min(a + 3.4, C1 - 0.6));
          if (q - p < 0.3) continue;
          ext.push({ f: '@panel.' + B.liv, op: 0.2, d: G.poly([[p, sg * cb, GW + 0.24], [q, sg * cb, GW + 0.24], [q, sg * (ct + 0.02), RF - 0.27], [p, sg * (ct + 0.02), RF - 0.27]]) });
        }
        // the windows: brass portholes, square windows, or the trip boat's long saloon windows
        if (Lv.ports === 'trip') {
          for (let a = C0 + 0.5; a < C1 - 0.6; a += 1.5) {
            const [p, q] = clip(a, a + 1.25);
            if (q - p < 0.2) continue;
            ext.push({ f: '@glass', glow: 'window', d: G.poly([[p, sg * (cb - 0.03), 1.05], [q, sg * (cb - 0.03), 1.05], [q, sg * (ct + 0.03), 1.85], [p, sg * (ct + 0.03), 1.85]]) });
          }
        } else {
          for (let a = C0 + 1.1, i = 0; a < C1 - 0.7; a += Lv.ports === 'round' ? 1.15 : 1.9, i++) {
            if (!inP(a)) continue;
            if (Lv.ports === 'round') {
              const ring = [], glass = [];
              for (let j = 0; j < 10; j++) { const t = j / 10 * Math.PI * 2; ring.push([a + Math.cos(t) * 0.16, sg * (cb - 0.02), 1.32 + Math.sin(t) * 0.16]); glass.push([a + Math.cos(t) * 0.11, sg * (cb - 0.03), 1.32 + Math.sin(t) * 0.11]); }
              ext.push({ f: '@trim.' + (B.liv === 3 ? 0 : B.liv), d: G.poly(ring), detail: true }, { f: '@glass', glow: 'window', d: G.poly(glass) });
            } else ext.push({ f: '@glass', glow: 'window', d: G.poly([[a - 0.36, sg * (cb - 0.03), 1.12], [a + 0.36, sg * (cb - 0.03), 1.12], [a + 0.36, sg * (ct + 0.02), 1.55], [a - 0.36, sg * (ct + 0.02), 1.55]]) });
          }
        }
        face([[c0, sg * cb, GW], [c1, sg * cb, GW], [c1, sg * ct, RF], [c0, sg * ct, RF]], [0, sg, 0.1], '@cab.' + B.liv, ext);
      }
      // the roof (a slight crown), its handrails
      face([[c0, -ct, RF], [c1, -ct, RF], [c1, 0, RF + 0.05], [c0, 0, RF + 0.05]], [0, -0.15, 1], '@roof.' + B.liv);
      face([[c0, 0, RF + 0.05], [c1, 0, RF + 0.05], [c1, ct, RF], [c0, ct, RF]], [0, 0.15, 1], '@roof.' + B.liv);
    }
    // the cabin's back (the doors and the slide) and its front (the front doors to the well)
    if (inP(C0)) face([[C0, -cb, GW], [C0, cb, GW], [C0, ct, RF], [C0, -ct, RF]], [-1, 0, 0], '@cabD.' + B.liv, [
      { f: '@cab.' + B.liv, d: G.poly([[C0, -0.36, GW + 0.06], [C0, -0.02, GW + 0.06], [C0, -0.02, RF - 0.08], [C0, -0.36, RF - 0.08]]) },
      { f: '@cab.' + B.liv, d: G.poly([[C0, 0.02, GW + 0.06], [C0, 0.36, GW + 0.06], [C0, 0.36, RF - 0.08], [C0, 0.02, RF - 0.08]]) },
      { f: '@panel.' + B.liv, op: 0.85, d: G.poly([[C0, -0.3, GW + 0.5], [C0, -0.08, GW + 0.5], [C0, -0.08, RF - 0.25], [C0, -0.3, RF - 0.25]]), detail: true },
      { f: '@panel.' + B.liv, op: 0.85, d: G.poly([[C0, 0.08, GW + 0.5], [C0, 0.3, GW + 0.5], [C0, 0.3, RF - 0.25], [C0, 0.08, RF - 0.25]]), detail: true },
    ]);
    if (inP(C1)) face([[C1, cb, GW], [C1, -cb, GW], [C1, -ct, RF], [C1, ct, RF]], [1, 0, 0], '@cabD.' + B.liv);
    // the cratch (a triangular board over the bow well, its sheeted cover back to the cabin roof)
    if (!trip && inP(BOW - 0.1)) {
      const A = BOW - 0.1, ap = [A, 0, RF - 0.1];
      face([[A, -hb * 0.85, GW], [A, hb * 0.85, GW], ap], [1, 0, 0.1], '@cratch.' + B.liv, [{ s: '@trim.' + B.liv, w: Math.max(0.5, G.k(ap) * 0.03), d: G.path([[A, -hb * 0.6, GW + 0.15], [A, 0, RF - 0.3], [A, hb * 0.6, GW + 0.15]]), detail: true }]);
      for (const sg of [-1, 1]) face([[A, sg * hb * 0.85, GW], [C1, sg * ct, RF], ap], [0, sg, 0.6], '@sheet.' + B.liv);
      face([[C1, -ct * 0.4, RF], [C1, ct * 0.4, RF], ap], [0, 0, 1], '@sheet.' + B.liv);
    }
    // the trip boat: an open foredeck with a rail, a canopy line
    if (trip && inP(C1 + 0.5)) for (const sg of [-1, 1]) top.push({ s: '@trim.' + B.liv, w: Math.max(0.5, G.k([C1, sg * hb, 1]) * 0.03), d: G.path([[C1, sg * (hb - 0.1), GW + 0.85], [BOW, sg * (hb - 0.1), GW + 0.85], [L - 0.4, sg * 0.3, GW + 1.05]]) });
    // ---- the tiller and the rudder post at the stern (brass)
    if (inP(0.2)) top.push({ s: '@brass', w: Math.max(0.6, G.k([0.2, 0, GW]) * 0.05), cap: 'round', d: G.path([[0.25, 0, GW], [0.18, 0, GW + 0.7], [-0.15, 0.05, GW + 0.95], [-0.7, 0.12, GW + 0.9]]) });
    // ---- the roof: chimney, pots, the plank and pole, logs, a solar panel, a bike, mushroom vents
    const onRoof = (a) => inP(a) && a > C0 && a < C1;
    if (!trip) {
      const ch = C1 - 1.4;
      if (onRoof(ch)) {
        const b0 = G.pr(ch, 0.35, RF), b1 = G.pr(ch, 0.35, RF + 0.62), w = Math.max(1, G.k([ch, 0.35, RF]) * 0.075);
        top.push({ f: '@stove', d: `M${R(b0[0] - o[0] - w)} ${R(b0[1] - o[1])}L${R(b1[0] - o[0] - w)} ${R(b1[1] - o[1])}L${R(b1[0] - o[0] + w)} ${R(b1[1] - o[1])}L${R(b0[0] - o[0] + w)} ${R(b0[1] - o[1])}Z` });
        top.push({ f: '@brass', d: `M${R(b1[0] - o[0] - w * 1.3)} ${R(b1[1] - o[1])}h${R(w * 2.6)}v${R(w * 0.9)}h${R(-w * 2.6)}Z`, detail: true });
        if (B.smoke) {
          const kk = G.k([ch, 0.35, RF]);
          for (let i = 0; i < 5; i++) smoke.push({ f: '@smoke', op: 0.5 - i * 0.08, d: sceneD.ell(b1[0] - o[0] - i * 0.3 * kk, b1[1] - o[1] - (0.25 + i * 0.45) * kk, (0.16 + i * 0.13) * kk, (0.12 + i * 0.1) * kk) });
        }
      }
      // the plank and the boat pole along the roof
      const [p0, p1] = clip(C0 + 1.2, C1 - 2.4);
      if (p1 > p0) top.push({ f: '@plank', d: G.poly([[p0, -0.55, RF + 0.04], [p1, -0.55, RF + 0.04], [p1, -0.3, RF + 0.06], [p0, -0.3, RF + 0.06]]) }, { s: '@pole', w: Math.max(0.5, G.k([p0, -0.15, RF]) * 0.035), d: G.path([[p0, -0.15, RF + 0.1], [p1, -0.15, RF + 0.1]]) });
      const roof = B.roof || 'pots';
      if (roof === 'solar') { const [s0, s1] = clip(C0 + 3.5, C0 + 6.8); if (s1 > s0) top.push({ f: '@solar', d: G.poly([[s0, 0.0, RF + 0.1], [s1, 0.0, RF + 0.1], [s1, 0.62, RF + 0.08], [s0, 0.62, RF + 0.08]]) }, { s: '@trim.' + B.liv, w: 0.6, op: 0.5, detail: true, d: G.path([[s0, 0.31, RF + 0.1], [s1, 0.31, RF + 0.1]]) }); }
      if (roof === 'logs') for (let i = 0; i < 3; i++) { const a = C0 + 4 + i * 0.9; if (onRoof(a)) { const c = G.pr(a, 0.25, RF + 0.14), kk = G.k([a, 0.25, RF]); top.push({ f: '@log.' + (i % 2), d: sceneD.ell(c[0] - o[0], c[1] - o[1], 0.3 * kk, 0.09 * kk) }); } }
      if (roof === 'bike') { const a = C0 + 4.5; if (onRoof(a)) { const kk = G.k([a, 0.3, RF]), c = G.pr(a, 0.3, RF + 0.36); top.push({ s: '@stove', w: Math.max(0.6, 0.03 * kk), d: sceneD.circ(c[0] - o[0] - 0.42 * kk, c[1] - o[1] + 0.1 * kk, 0.3 * kk) + sceneD.circ(c[0] - o[0] + 0.42 * kk, c[1] - o[1] + 0.1 * kk, 0.3 * kk) + `M${R(c[0] - o[0] - 0.42 * kk)} ${R(c[1] - o[1] + 0.1 * kk)}l${R(0.4 * kk)} ${R(-0.3 * kk)}l${R(0.44 * kk)} ${R(0.3 * kk)}` }); } }
      // pots on the roof (flowering in spring and summer; bare in winter)
      for (const [a, b] of [[C0 + 0.6, 0.45], [C0 + 0.95, -0.4], [C1 - 0.6, -0.3]]) {
        if (!onRoof(a)) continue;
        const kk = G.k([a, b, RF]), c = G.pr(a, b, RF);
        top.push({ f: '@pot', d: `M${R(c[0] - o[0] - 0.1 * kk)} ${R(c[1] - o[1])}L${R(c[0] - o[0] - 0.13 * kk)} ${R(c[1] - o[1] - 0.16 * kk)}L${R(c[0] - o[0] + 0.13 * kk)} ${R(c[1] - o[1] - 0.16 * kk)}L${R(c[0] - o[0] + 0.1 * kk)} ${R(c[1] - o[1])}Z` });
        if (season !== 'winter') top.push({ f: '@bloom.0', d: sceneD.ell(c[0] - o[0], c[1] - o[1] - 0.21 * kk, 0.17 * kk, 0.09 * kk), detail: false }, { f: '@bloom.1', d: sceneD.circ(c[0] - o[0] - 0.05 * kk, c[1] - o[1] - 0.25 * kk, 0.045 * kk) + sceneD.circ(c[0] - o[0] + 0.07 * kk, c[1] - o[1] - 0.23 * kk, 0.04 * kk), detail: true });
      }
      for (const a of [C0 + 2.6, C1 - 3]) if (onRoof(a)) { const kk = G.k([a, -0.05, RF]), c = G.pr(a, -0.05, RF + 0.08); top.push({ f: '@brass', d: sceneD.ell(c[0] - o[0], c[1] - o[1], 0.12 * kk, 0.05 * kk), detail: true }); }
    } else if (onRoof(C0 + 1)) {
      // the trip boat's canopy roof edge
      const [p0, p1] = clip(C0, C1);
      top.push({ s: '@trim.' + B.liv, w: Math.max(0.5, G.k([p0, 0, RF]) * 0.04), d: G.path([[p0, -ct, RF], [p1, -ct, RF]]) + G.path([[p0, ct, RF], [p1, ct, RF]]) });
    }
    // ---- mooring lines to pins on the bank (moored boats only: the bank side is the offset's sign)
    if (!trip && Math.abs(B.o) > 3.5) {
      const sg = B.o > 0 ? 1 : -1, sb = B.rev ? -sg : sg;
      for (const a of [0.15, L - 0.4]) {
        if (!inP(a)) continue;
        const bank = F.P(a + (a < 1 ? -1.4 : 1.4), sb * (hb + 1.5), 0 - V.W), p = V.proj(bank[0], bank[1], 0);
        const s0 = G.pr(a, sb * hb * 0.7, sheer(a)), mx = (s0[0] + p[0]) / 2, my = Math.max(s0[1], p[1]) + 0.12 * G.k([a, 0, 0]);
        top.push({ s: '@rope', w: Math.max(0.5, G.k([a, 0, 0]) * 0.02), d: `M${R(s0[0] - o[0])} ${R(s0[1] - o[1])}Q${R(mx - o[0])} ${R(my - o[1])} ${R(p[0] - o[0])} ${R(p[1] - o[1])}` });
      }
    }
    // a button fender at the stern and the bow
    if (inP(0)) { const kk = G.k([0, 0, 0]), c = G.pr(-0.08, 0, 0.18); top.push({ f: '@fender', d: sceneD.ell(c[0] - o[0], c[1] - o[1], 0.22 * kk, 0.14 * kk) }); }
    faces.sort((p, q) => q.z - p.z);
    const body = [];
    for (const fc of faces) { body.push({ f: fc.f, d: fc.d }); if (fc.extra) body.push(...fc.extra); }
    body.push(...top);
    return { body, smoke };
  }
  sceneObjDefine({
    id: 'boat.canal-view-boat', category: 'boat', size: [600, 300], variants: Math.max(1, CV.boatPieces.length),
    seasonal: true, shapeBySeason: true, flippable: false,
    real: { h: 2, l: 18, w: 2.1 },
    palette: {
      base: {
        cab: LIV.map(l => l.cab), cabD: LIV.map(l => l.cabD), trim: LIV.map(l => l.trim), panel: LIV.map(l => l.panel), hull: LIV.map(l => l.hull),
        roof: LIV.map(l => l.roof), gun: ['#3a3e40', '#3a3e40', '#3a3e40', '#2a2a2a', '#3a3e40', '#e0d8c4'], cratch: ['#2a3a2a', '#3a2a20', '#22304a', '#2a2420', '#22304a'],
        sheet: ['#3a4a3a', '#4a3a30', '#2e3a50', '#3a3430', '#2e3a50'], deck: '#4a3e34', strake: '#5a6a6e', wl: '#141a1a', glass: '#4a5a62', brass: '#d8b058',
        stove: '#26262a', smoke: '#e8e8ec', plank: '#8a6a48', pole: '#6a5a4a', solar: '#1e2a44', log: ['#7a5a3a', '#5a4030'], pot: '#a0522d',
        bloom: ['#3f7a34', '#e05a6a'], rope: '#d8cdb8', fender: '#2a2622',
      },
      spring: { bloom: ['#4a8a3a', '#f0c0d0'] },
      autumn: { bloom: ['#6a5a2a', '#e0a040'], roof: LIV.map(l => l.roof) },
      winter: { bloom: ['#4a4a3a', '#6a6058'] },
    },
    night: { glow: { window: '#ffd68a' }, on: 0.85 },
    parts: ['body', 'smoke'],
    anim: { flicker: { part: 'smoke', op: [0.35, 0.85], period: 6 } }, shadow: false,
    // (lock, 10 Oct) the engine's water pass mirrors a floater about its waterline; a perspective piece's waterline is sloped
    waterSlope(v) { const pc = CV.boatPieces[v]; return pc ? CV.pieceAnchor(CV.views[pc.id], pc).slope : 0; },
    // (fix, 10 Oct) the pieces of one boat are ONE thing on the water: the engine composites the group and mirrors it once,
    // column by column, about the hull's true near-side waterline (each slice mirrored on its own gave a staircase of hulls)
    waterGroup(v) { const pc = CV.boatPieces[v]; return pc ? pc.id + ':' + pc.bi : null; },
    waterLine(v) {
      const pc = CV.boatPieces[v]; if (!pc) return null;
      const V = CV.views[pc.id], B = V.boats[pc.bi], F = CV.boatFrame(V, B), A = CV.pieceAnchor(V, pc), o = A.p;
      const mid = (pc.a0 + pc.a1) / 2, side = (a, sg) => { const g = F.P(a, sg * F.beam / 2, 0); return V.proj(g[0], g[1], g[2]); };
      const sg = side(mid, 1)[1] >= side(mid, -1)[1] ? 1 : -1, e0 = side(pc.a0, sg), e1 = side(pc.a1, sg);
      return [[e0[0] - o[0], e0[1] - o[1]], [e1[0] - o[0], e1[1] - o[1]]];
    },
    tags: ['uk', 'canal', 'narrowboat', 'boat', 'perspective', 'kit:water', 'kit:boats', 'role:boat', 'class:boat'],
    credit: 'drawn for the Basingstoke Canal views: narrowboats and the trip boat in the camera\'s perspective',
    build(v, rnd, ctx) { return boat(v, rnd, (ctx && ctx.season) || 'summer'); },
  });
})();

/* ---------- structure.canal-view-bridge: a brick arch road bridge across the cut, in the camera's own perspective ----------
   The near face (a hump-backed parapet line, brick courses, a string course, stone coping, the voussoir ring) with the arch
   OPEN (a hole by winding), the barrel's visible soffit and jambs, the towpath ledge under it, the shade on the water in the
   barrel, ivy on the wings. Anchored at the ground under the middle of the arch on the near face (the engine mirrors it
   about that waterline). B: { s (arc of the bridge's middle), T (thickness), span, uc (the arch's centre, metres right of
   the canal's centre), crown and deck (heights above the towpath), half (the face's half length) }. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const CV = SCENE_CANAL_VIEWS, R = (v) => Math.round(v * 10) / 10;
  function bridge(v, rnd, season) {
    const V = CV.views[CV.bridges[v]], B = V.bridge, W = V.W, hw = V.width / 2;
    const q = V.at(B.s), tx = q[2], td = q[3], nx = td, nd = -tx;   // t along the cut, n across it (to the right)
    const near = [q[0] - tx * B.T / 2, q[1] - td * B.T / 2], far = [q[0] + tx * B.T / 2, q[1] + td * B.T / 2];
    const G = (u, h, back) => { const b = back ? far : near; return V.proj(b[0] + nx * u, b[1] + nd * u, h); };
    const ao = G(B.uc, 0), o = ao;
    const pt = (p) => R(p[0] - o[0]) + ' ' + R(p[1] - o[1]);
    const poly = (pts) => 'M' + pts.map(pt).join('L') + 'Z';
    const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], r = pts[(i + 1) % pts.length]; a += p[0] * r[1] - r[0] * p[1]; } return a / 2; };
    const Rb = B.span / 2, hs = W + 0.7, hc = B.crown, top = (u) => Math.max(1.1, B.deck - 0.0042 * u * u);
    const archH = (u) => hs + (hc - hs) * Math.sqrt(Math.max(0, 1 - Math.pow((u - B.uc) / Rb, 2)));
    const ground = (u) => (Math.abs(u) < hw ? W : 0);
    const N = 22, archPts = (back, grow) => { const out = []; for (let i = 0; i <= N; i++) { const t = Math.PI * (1 - i / N), u = B.uc + Math.cos(t) * (Rb + grow), h = hs + Math.sin(t) * (hc - hs + grow); out.push(G(u, h, back)); } return out; };
    const body = [], ivy = [];
    // the barrel first (behind the face): the soffit strips that face the camera, the far opening left open
    const cam = V.camera, nearM = [near[0], near[1]], farM = [far[0], far[1]];
    for (let i = 0; i < N; i++) {
      const t0 = Math.PI * (1 - i / N), t1 = Math.PI * (1 - (i + 1) / N), tm = (t0 + t1) / 2;
      const u = B.uc + Math.cos(tm) * Rb, h = hs + Math.sin(tm) * (hc - hs);
      // the inward normal (toward the arch's axis) against the view ray at the strip's middle
      const gx = (nearM[0] + farM[0]) / 2 + nx * u, gd = (nearM[1] + farM[1]) / 2 + nd * u;
      const Nx = -Math.cos(tm) * nx, Nd = -Math.cos(tm) * nd, Nh = -Math.sin(tm);
      if (Nx * gx + Nd * gd + Nh * (h - cam.eye) >= 0) continue;
      const a0 = [B.uc + Math.cos(t0) * Rb, hs + Math.sin(t0) * (hc - hs)], a1 = [B.uc + Math.cos(t1) * Rb, hs + Math.sin(t1) * (hc - hs)];
      body.push({ f: i % 2 ? '@soffit.0' : '@soffit.1', d: poly([G(a0[0], a0[1]), G(a1[0], a1[1]), G(a1[0], a1[1], 1), G(a0[0], a0[1], 1)]) });
    }
    // the jambs (the abutments' inner faces) from the springing down to the water or the ledge
    for (const sg of [-1, 1]) {
      const u = B.uc + sg * Rb, gx = (nearM[0] + farM[0]) / 2 + nx * u, gd = (nearM[1] + farM[1]) / 2 + nd * u;
      if ((-sg * nx) * gx + (-sg * nd) * gd >= 0) continue;
      body.push({ f: '@soffit.0', d: poly([G(u, ground(u)), G(u, hs), G(u, hs, 1), G(u, ground(u), 1)]) });
    }
    // the towpath ledge through the arch and the shade on the water in the barrel
    const wl = Math.max(B.uc - Rb, -hw), wr = Math.min(B.uc + Rb, hw);
    body.push({ f: '@shade', op: 0.55, d: poly([G(wl, W + 0.01), G(wr, W + 0.01), G(wr, W + 0.01, 1), G(wl, W + 0.01, 1)]) });
    for (const [ua, ub] of [[B.uc - Rb, -hw], [hw, B.uc + Rb]]) if (ub > ua) {
      body.push({ f: '@ledge.0', d: poly([G(ua, 0), G(ub, 0), G(ub, 0, 1), G(ua, 0, 1)]) });
      body.push({ f: '@ledge.1', d: poly([G(ub, 0), G(ub, W), G(ub, W, 1), G(ub, 0, 1)]) });
    }
    // the near face: the outline (parapet top over a hump, the ground below), with the arch as a hole of opposite winding
    const us = []; for (let u = -B.half; u <= B.half + 1e-6; u += 1) us.push(u);
    const outline = us.map(u => G(u, top(u))).concat(us.slice().reverse().map(u => G(u, ground(u))).flatMap((p, i, a) => [p]));
    // the steps down at the water's edges
    const bottom = []; for (let i = us.length - 1; i >= 0; i--) { const u = us[i]; bottom.push(G(u, ground(u))); if (i > 0 && ground(u) !== ground(us[i - 1])) bottom.push(G(u, ground(us[i - 1]))); }
    const outer = us.map(u => G(u, top(u))).concat(bottom);
    const hole = [G(B.uc - Rb, Math.max(ground(B.uc - Rb), W))].concat(archPts(0, 0)).concat([G(B.uc + Rb, Math.max(ground(B.uc + Rb), W))]);
    const holeOrdered = Math.sign(area(hole)) === Math.sign(area(outer)) ? hole.slice().reverse() : hole;
    void outline;
    const faceD = poly(outer) + poly(holeOrdered);
    body.push({ f: { lin: [[0, '@brick.1'], [0.6, '@brick.0'], [1, '@brick.2']], x1: 0, y1: R(G(B.uc, B.deck)[1] - o[1]), x2: 0, y2: R(G(B.uc, W)[1] - o[1]) }, d: faceD });
    // weathering: darker streaks from the water line up and under the string course
    body.push({ f: '@brick.3', op: 0.35, d: poly(us.map(u => G(u, ground(u) + 0.55)).concat(us.slice().reverse().map(u => G(u, ground(u))))) + poly(holeOrdered) });
    // brick courses (near and large enough only), broken by the arch
    const kNear = V.f / near[1];
    if (kNear * 0.3 > 2.4) {
      let dd = '';
      for (let h = W + 0.3; h < B.deck - 0.2; h += 0.3) {
        const segs = [];
        const uL = -B.half, uR = B.half;
        const archGap = h > W && h < hc + 0.5 ? (h <= hs ? [B.uc - Rb - 0.5, B.uc + Rb + 0.5] : h < hc + 0.45 ? (() => { const r = (Rb + 0.45) * Math.sqrt(Math.max(0, 1 - Math.pow((h - hs) / (hc - hs + 0.45), 2))); return [B.uc - r, B.uc + r]; })() : null) : null;
        const ok = (u) => h < top(u) - 0.18 && h > ground(u) + 0.05;
        let run = null;
        for (let u = uL; u <= uR + 1e-6; u += 0.5) {
          const inGap = archGap && u > archGap[0] && u < archGap[1];
          if (ok(u) && !inGap) { if (!run) run = [u, u]; else run[1] = u; } else if (run) { segs.push(run); run = null; }
        }
        if (run) segs.push(run);
        for (const [a, b] of segs) if (b > a) { const p = G(a, h), r = G(b, h); dd += `M${pt(p)}L${pt(r)}`; }
      }
      if (dd) body.push({ s: '@mortar', w: Math.max(0.5, kNear * 0.018), op: 0.45, d: dd, detail: true });
    }
    // the voussoir ring (a lighter band round the arch) and its radial joints
    const ringO = archPts(0, 0.48), ringI = archPts(0, 0);
    body.push({ f: '@brick.4', d: poly(ringO.concat(ringI.slice().reverse())) });
    if (kNear * 0.3 > 2) { let dd = ''; for (let i = 1; i < N; i++) dd += `M${pt(ringI[i])}L${pt(ringO[i])}`; body.push({ s: '@mortar', w: Math.max(0.5, kNear * 0.02), op: 0.55, d: dd, detail: true }); }
    // a keystone, the string course and the stone coping along the parapet
    body.push({ f: '@stone.0', d: poly([G(B.uc - 0.22, hc - 0.02), G(B.uc + 0.22, hc - 0.02), G(B.uc + 0.28, hc + 0.55), G(B.uc - 0.28, hc + 0.55)]) });
    const sc = Math.min(B.deck - 1.0, hc + 0.75), scU = us.filter(u => top(u) > sc + 0.3);
    if (scU.length > 1) body.push({ f: '@stone.1', d: poly(scU.map(u => G(u, sc + 0.12)).concat(scU.slice().reverse().map(u => G(u, sc)))) });
    body.push({ f: '@stone.0', d: poly(us.map(u => G(u, top(u) + 0.06)).concat(us.slice().reverse().map(u => G(u, top(u) - 0.16)))) });
    // the coping's top (seen from above when the eye is higher than the parapet)
    body.push({ f: '@stone.2', d: poly(us.map(u => G(u, top(u) + 0.06)).concat(us.slice().reverse().map(u => { const b = near; return V.proj(b[0] + nx * u + tx * 0.4, b[1] + nd * u + td * 0.4, top(u) + 0.06); }))) });
    // the pilasters at the arch's shoulders (slightly proud brick piers)
    for (const sg of [-1, 1]) { const u = B.uc + sg * (Rb + 1.1); body.push({ f: '@brick.2', op: 0.55, d: poly([G(u - 0.35, ground(u)), G(u + 0.35, ground(u)), G(u + 0.35, top(u) - 0.2), G(u - 0.35, top(u) - 0.2)]) }); }
    // ivy on the wings and trailing over the parapet (thin in winter)
    // two or three clumps, each many small lobes climbing from the ground (fewer, darker in winter)
    const clumps = [[-B.half + 2 + rnd() * 3, 0.85], [B.uc + Rb + 2.2 + rnd() * 2, 0.6], [B.half - 1.5 - rnd() * 3, 0.95]];
    for (const [cu, hk] of clumps) {
      const nL = season === 'winter' ? 22 : 46, hmax = (top(cu) - ground(cu)) * hk;
      let dd = ['', '', ''];
      for (let i = 0; i < nL; i++) {
        const t = Math.pow(rnd(), 0.8), h = ground(cu) + t * hmax, spread = (1 - t * 0.6) * 1.6, u = cu + (rnd() - 0.5) * 2 * spread;
        const p = G(u, h), r = (0.11 + rnd() * 0.1) * kNear;
        dd[Math.floor(rnd() * 3)] += sceneD.ell(p[0] - o[0], p[1] - o[1], r, r * 0.8);
      }
      dd.forEach((d, j) => { if (d) ivy.push({ f: '@ivy.' + j, d }); });
    }
    return { body, ivy };
  }
  sceneObjDefine({
    id: 'structure.canal-view-bridge', category: 'structure', size: [900, 400], variants: Math.max(1, CV.bridges.length),
    seasonal: true, shapeBySeason: true, flippable: false, real: { h: 5, l: 40, w: 7 },
    palette: {
      base: { brick: ['#9a5a40', '#a8664a', '#7a4434', '#4a2a22', '#b0705a'], mortar: '#d8c8b0', stone: ['#d4ccb8', '#bcb2a0', '#e2dccc'], soffit: ['#3a2a24', '#4a342c'],
        ledge: ['#6a6052', '#4a4238'], shade: '#10181a', ivy: ['#24401f', '#335a28', '#4c7434'] },
      autumn: { ivy: ['#3a3a1f', '#5a4a24', '#4c5a2a'] },
      winter: { brick: ['#8e5a46', '#9a6650', '#704434', '#4a2e26', '#a87060'], ivy: ['#2a3a26', '#34482c', '#405a34'] },
    },
    parts: ['body', 'ivy'], shadow: false,
    tags: ['uk', 'canal', 'bridge', 'brick', 'perspective', 'kit:water', 'kit:temperate', 'role:landmark', 'class:structure'],
    credit: 'drawn for the Basingstoke Canal views: the brick arch road bridges (Malthouse, Pondtail) in the camera\'s perspective',
    build(v, rnd, ctx) { return bridge(v, rnd, (ctx && ctx.season) || 'summer'); },
  });
})();

/* ---------- structure.canal-view-parapet: the parapet of the bridge we lean on (front layer, pinned) ----------
   The coping's top and its inner face from a to b (ground metres; the parapet top just under the eye), in the camera's
   perspective; the anchor is the screen's bottom-left so the depth sort puts it in front of everything. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const CV = SCENE_CANAL_VIEWS, R = (v) => Math.round(v * 10) / 10;
  sceneObjDefine({
    id: 'structure.canal-view-parapet', category: 'structure', size: [1600, 200], variants: Math.max(1, CV.parapets.length),
    seasonal: true, shapeBySeason: true, flippable: false, real: { h: 1.1, l: 20, w: 0.5 },
    palette: { base: { brick: ['#8a4a36', '#6e3a2c', '#a05a42'], stone: ['#cfc6b4', '#a89e8c', '#e4ddcf'], moss: ['#5a6a34', '#7a8a44'] },
      winter: { moss: ['#6a7458', '#8a9478'] } },
    parts: ['body'], shadow: false,
    tags: ['uk', 'bridge', 'parapet', 'frame', 'kit:temperate', 'role:frame', 'class:shrub'],   // (round 2) class shrub, like the other frames: the frame we lean on casts no shadow (a structure's sheared silhouette fell across the sky)
    credit: 'drawn for the Basingstoke Canal views: the parapet of Reading Road bridge',
    build(v, rnd) {
      const V = CV.views[CV.parapets[v]], Pp = V.parapet, H = V.camera.eye - 0.55, o = [0, 900];
      const A = Pp.a, B = Pp.b, n = 24, body = [];
      const at = (u, dn, h) => { const x = A[0] + (B[0] - A[0]) * u, d = A[1] + (B[1] - A[1]) * u; const L = Math.hypot(B[0] - A[0], B[1] - A[1]); const nx = -(B[1] - A[1]) / L, nd = (B[0] - A[0]) / L; const q = V.proj(x + nx * dn, d + nd * dn, h); return [Math.max(-120, Math.min(1720, q[0])), Math.min(990, q[1])]; };   // (round 2) kept inside the frame's margin: a face reaching 1400 units below the frame broke the sprite (a grey wedge over the sky and a dull film over the water)
      const P = (p) => R(p[0] - o[0]) + ' ' + R(p[1] - o[1]);
      const strip = (dn0, dn1, h0, h1) => { const a = [], b = []; for (let i = 0; i <= n; i++) { a.push(at(i / n, dn0, h0)); b.push(at(i / n, dn1, h1)); } return 'M' + a.map(P).join('L') + 'L' + b.reverse().map(P).join('L') + 'Z'; };
      // the inner face (brick) below the coping, down out of the frame
      body.push({ f: '@brick.0', d: strip(0, 0, H - 0.08, H - 1.2) });
      // courses on the inner face
      let dd = ''; for (let h = H - 0.3; h > H - 1.2; h -= 0.075 * 4) { const pts = []; for (let i = 0; i <= n; i++) pts.push(at(i / n, 0, h)); dd += 'M' + pts.map(P).join('L'); }
      body.push({ s: '@brick.1', w: 1.2, op: 0.6, d: dd });
      // the coping: its front edge and its top, slightly weathered, moss in the joints
      body.push({ f: '@stone.1', d: strip(0, 0, H + 0.02, H - 0.1) });
      body.push({ f: '@stone.0', d: strip(0, 0.24, H + 0.02, H + 0.02) });
      for (let i = 0; i < 9; i++) { const u = (i + 0.3 + rnd() * 0.4) / 9, a = at(u, 0, H + 0.02), b = at(u, 0.24, H + 0.02); body.push({ s: '@stone.1', w: 1.4, op: 0.7, d: `M${P(a)}L${P(b)}` }); }
      for (let i = 0; i < 16; i++) { const u = rnd(), a = at(u, 0.04 + rnd() * 0.18, H + 0.02), r = 3 + rnd() * 6; body.push({ f: '@moss.' + (i % 2), op: 0.6, d: sceneD.ell(a[0] - o[0], a[1] - o[1], r, r * 0.4) }); }
      body.push({ f: '@stone.2', op: 0.5, d: strip(0.18, 0.24, H + 0.025, H + 0.025) });
      return { body };
    },
  });
})();

/* ---------- framing plants (screen units, front layer, pinned) ----------
   plant.canal-view-fronds: a weeping willow's curtain hanging into the frame from the top edge (anchor: top-left of the
   curtain), long whips of narrow leaves on the wind; spring lime with catkins, summer green, autumn yellow, winter bare
   golden twigs. plant.canal-view-bough: an oak bough reaching in from the left edge (anchor: where it leaves the edge), lobed
   leaves in sprays, acorns in autumn, bare in winter. Flip either for the other side. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = (v) => Math.round(v * 10) / 10;
  sceneObjDefine({
    id: 'plant.canal-view-fronds', category: 'plant', size: [700, 520], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 6, l: 6, w: 3 },
    palette: {
      base: { twig: ['#6a5a3a', '#8a7444', '#a08a50'], leaf: ['#4a6a2a', '#5e8436', '#7aa048', '#9ab85a'], catkin: '#d8c860' },
      spring: { leaf: ['#7a9a34', '#94b440', '#b0cc58', '#c8dc78'] },
      summer: { leaf: ['#3e5e26', '#557a32', '#6e9640', '#8aae50'] },
      autumn: { leaf: ['#5e6a2a', '#8c8e34', '#c0ae44', '#dcc860'] },
      winter: { twig: ['#8a6a30', '#a8843a', '#c09a48'] },
    },
    parts: ['twigs', 'leaves'],
    anim: { sway: { part: 'leaves', pivot: [300, 0], deg: 1.4 } }, shadow: false,
    tags: ['uk', 'willow', 'frame', 'canal', 'kit:temperate', 'role:frame', 'class:shrub'],
    credit: 'drawn for the Basingstoke Canal views: a weeping willow curtain',
    build(v, rnd, ctx) {
      // (round 2) the whips hang DOWN: soft tapering ribbons of leaf (a darker body under the leaves), the narrow willow leaves
      // lying close along each whip, alternate, shortening to the tip; whips in bunches from the side shoots of a drooping limb,
      // longest under the middle of the limb, all drifting a little on the same breeze (no bead curtain, no chevrons)
      const season = (ctx && ctx.season) || 'summer', out = { twigs: [], leaves: [] }, winter = season === 'winter';
      const W = v ? 520 : 680, nB = v ? 7 : 9;
      const I = Math.round, lf = (x, y, ux, uy, len, w) => { const tx = x + ux * len, ty = y + uy * len, mx = x + ux * len * 0.45, my = y + uy * len * 0.45, nx = -uy * w, ny = ux * w; return `M${I(x)} ${I(y)}Q${I(mx + nx)} ${I(my + ny)} ${I(tx)} ${I(ty)}Q${I(mx - nx)} ${I(my - ny)} ${I(x)} ${I(y)}Z`; };   // whole units: a leaf is 20 to 30 long
      const limbY = (x) => 14 + Math.sin(Math.min(1, Math.max(0, x / W)) * Math.PI) * 16 - Math.max(0, x / W) * 70;   // in from the left edge, up and out of the top of the frame
      // the limb across the top (tapering out of the frame edge) and the side shoots the bunches hang from
      const top = [], bot = [];
      for (let i = 0; i <= 12; i++) { const x = -50 + (W + 40) * i / 12, y = limbY(x), w = 30 * (1 - i / 15); top.push([x, y - w / 2]); bot.push([x, y + w / 2]); }
      out.twigs.push({ f: '@twig.0', d: 'M' + top.concat(bot.reverse()).map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z' });
      out.twigs.push({ s: '@twig.2', w: 2.2, op: 0.6, cap: 'round', d: 'M' + top.slice(0, 10).map(p => R(p[0]) + ' ' + R(p[1] + 3)).join('L'), detail: true });
      let shoots = '', whips = '', body = '', cat = '';
      const leaves = ['', '', '', ''], wind = 0.1 + (v ? 0.04 : 0);
      for (let b = 0; b < nB; b++) {
        const bt = (b + 0.25 + rnd() * 0.5) / nB, bx = -20 + bt * (W + 10), by = limbY(bx) + 6;
        const sx = bx + (rnd() - 0.3) * 50, sy = by + 14 + rnd() * 22;
        shoots += `M${R(bx)} ${R(by)}Q${R((bx + sx) / 2)} ${R(by - 4)} ${R(sx)} ${R(sy)}`;
        const env = Math.pow(Math.sin(Math.PI * Math.min(0.97, Math.max(0.05, bt))), 0.6), nW = 3 + Math.floor(rnd() * 2) + (env > 0.7 ? 1 : 0);
        for (let k = 0; k < nW; k++) {
          const ax = sx + (rnd() - 0.5) * 34, ay = sy + (rnd() - 0.5) * 10, L = (130 + (v ? 250 : 360) * env) * (0.55 + rnd() * 0.5);
          const ex = ax + wind * L + (rnd() - 0.5) * 22, ey = ay + L, cx = ax + (rnd() - 0.5) * 10, cy = ay + L * 0.55;
          const P = (t) => { const u = 1 - t; return [u * u * ax + 2 * u * t * cx + t * t * ex, u * u * ay + 2 * u * t * cy + t * t * ey]; };
          const Tg = (t) => { const dx = 2 * (1 - t) * (cx - ax) + 2 * t * (ex - cx), dy = 2 * (1 - t) * (cy - ay) + 2 * t * (ey - cy), m = Math.hypot(dx, dy) || 1; return [dx / m, dy / m]; };
          whips += `M${R(ax)} ${R(ay)}Q${R(cx)} ${R(cy)} ${R(ex)} ${R(ey)}`;
          const back = rnd() < 0.35;   // a whip in the shade behind the others: the darker tones only
          if (winter) continue;
          // the soft body: a ribbon swelling out of the stem to about 12 units, tapering to a point
          const ns = 7, Lp = [], Rp = [];
          for (let i = 0; i <= ns; i++) { const t = i / ns, p = P(t), g = Tg(t), w = 6 * Math.min(1, 0.25 + t * 6) * (1 - t) * (1 - t * 0.3) + 0.5; Lp.push([p[0] - g[1] * w, p[1] + g[0] * w]); Rp.push([p[0] + g[1] * w, p[1] - g[0] * w]); }
          body += 'M' + Lp.concat(Rp.reverse()).map(p => Math.round(p[0]) + ' ' + Math.round(p[1])).join('L') + 'Z';
          // the leaves: alternate, lying close along the whip (15 to 30 degrees out), shortening and thinning to the tip
          const step = season === 'autumn' ? 10.5 : 8.5, nL = Math.floor(L * 0.92 / step);
          for (let j = 0; j < nL; j++) {
            if (season === 'autumn' && rnd() < 0.22) continue;
            const t = 0.03 + 0.95 * j / nL, p = P(t), g = Tg(t), sd = j % 2 ? 1 : -1, sp = (0.3 + rnd() * 0.32) * sd * (1 - t * 0.4);
            const ux = g[0] * Math.cos(sp) - g[1] * Math.sin(sp), uy = g[0] * Math.sin(sp) + g[1] * Math.cos(sp), len = (31 - 17 * t) * Math.min(1, 0.45 + t * 8) * (0.8 + rnd() * 0.35);
            const tone = back ? (rnd() < 0.55 ? 0 : 1) : sd < 0 ? (rnd() < 0.6 ? 3 : 2) : (rnd() < 0.55 ? 1 : rnd() < 0.5 ? 2 : 0);
            leaves[tone] += lf(p[0] + sd * 1.5 * (1 - t), p[1], ux, uy, len, len * 0.15);
          }
          if (season === 'spring' && rnd() < 0.6) { const p = P(0.3 + rnd() * 0.4); cat += sceneD.ell(p[0] + 3, p[1], 2, 6); }
        }
      }
      out.leaves.push({ s: '@twig.1', w: 3, cap: 'round', d: shoots });
      // the whips sway with their leaves (one part, so the leaves never part from their stems)
      out.leaves.push({ s: winter ? '@twig.2' : '@twig.1', w: winter ? 1.8 : 1.1, cap: 'round', op: winter ? 0.95 : 0.8, d: whips });
      if (body) out.leaves.push({ f: '@leaf.0', op: 0.7, d: body });
      leaves.forEach((d, i) => { if (d) out.leaves.push({ f: '@leaf.' + i, d, op: i === 3 ? 0.95 : 1 }); });
      if (cat) out.leaves.push({ f: '@catkin', d: cat, detail: true });
      return out;
    },
  });
  sceneObjDefine({
    id: 'plant.canal-view-bough', category: 'plant', size: [620, 360], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 4, l: 8, w: 4 },
    palette: {
      base: { bark: ['#3a3128', '#56483a', '#6e5e4c'], leaf: ['#2e4a26', '#3e6030', '#5a7e3e', '#7a9c4e'], acorn: ['#8a6a30', '#5a4a2a'] },
      spring: { leaf: ['#5a8a2a', '#7aa63a', '#98c050', '#b8d470'] },
      summer: { leaf: ['#26421f', '#355c28', '#4e7634', '#6e9446'] },
      autumn: { leaf: ['#7a5a1e', '#a0702a', '#c08a34', '#8a8a34'] },
    },
    parts: ['branch', 'leaves'],
    anim: { sway: { part: 'leaves', pivot: [0, 40], deg: 1.1 } }, shadow: false,
    tags: ['uk', 'oak', 'frame', 'canal', 'kit:temperate', 'role:frame', 'class:shrub'],
    credit: 'drawn for the Basingstoke Canal views: a pedunculate oak (Quercus robur) bough',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { branch: [], leaves: [] };
      const limb = (pts, w0, w1, f) => {
        const L = [], Rr = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
          L.push([pts[i][0] - dy / m * w, pts[i][1] + dx / m * w]); Rr.push([pts[i][0] + dy / m * w, pts[i][1] - dx / m * w]);
        }
        out.branch.push({ f, d: 'M' + L.concat(Rr.reverse()).map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z' });
      };
      // oak limbs are crooked: a zig-zag main limb and elbowed side branches
      const main = v ? [[-30, 60], [70, 40], [150, 70], [230, 52], [310, 90], [380, 80], [450, 120]] : [[-30, 30], [80, 52], [160, 30], [250, 66], [330, 58], [420, 98], [520, 104], [590, 140]];
      limb(main, 40, 6, '@bark.0'); limb(main.map(([x, y]) => [x, y - 5]), 15, 2, '@bark.1');
      const sides = v ? [[[150, 70], [190, 130], [180, 190]], [[310, 90], [350, 150], [400, 170]], [[230, 52], [270, 10], [330, -10]]] : [[[160, 30], [210, 90], [200, 160], [240, 210]], [[330, 58], [370, 130], [420, 160]], [[250, 66], [300, 20], [380, 4]], [[420, 98], [470, 60], [540, 50]]];
      sides.forEach((s, i) => limb(s, 13 - i, 2, '@bark.' + (i % 2)));
      const anchors = [];
      for (const s of [main.slice(1)].concat(sides)) for (let i = 1; i < s.length; i++) { const a = s[i - 1], b = s[i]; for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3; anchors.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
      for (const [ax, ay] of anchors) {
        if (season === 'winter') { out.branch.push({ s: '@bark.2', w: 1.3, cap: 'round', d: `M${R(ax)} ${R(ay)}l${R((rnd() - 0.4) * 34)} ${R(10 + rnd() * 30)}` }); continue; }
        const n = season === 'autumn' ? 4 : 7, cx = ax + (rnd() - 0.3) * 30, cy = ay + 14 + rnd() * 26;
        for (let j = 0; j < n; j++) {
          const lx = cx + (rnd() - 0.5) * 42, ly = cy + (rnd() - 0.5) * 30, r = 9 + rnd() * 6, tone = j < n / 2 ? Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3);
          out.leaves.push({ f: '@leaf.' + tone, d: sceneD.lobed(rnd, R(lx), R(ly), R(r * 0.7), R(r), 5, 0.35) });
        }
        if (season === 'autumn' && rnd() < 0.35) out.leaves.push({ f: '@acorn.0', d: sceneD.ell(cx, cy + 12, 3.6, 4.6) + sceneD.ell(cx + 7, cy + 14, 3.2, 4.2) }, { f: '@acorn.1', d: sceneD.ell(cx, cy + 8.5, 4, 2.2) + sceneD.ell(cx + 7, cy + 10.5, 3.6, 2) });
      }
      return out;
    },
  });
})();

/* ---------- bank flora: purple loosestrife and meadowsweet, the summer colour of the Basingstoke Canal's margins ----------
   plant.canal-view-loosestrife: a clump of upright spikes, magenta in summer, rusty seed spikes in autumn, dry brown stalks
   in winter, fresh green shoots in spring. plant.canal-view-meadowsweet: a clump with frothy cream heads (summer), brown
   seed heads after. Anchor: the middle of the clump's foot. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = (v) => Math.round(v * 10) / 10;
  sceneObjDefine({
    id: 'plant.canal-view-loosestrife', category: 'plant', size: [90, 150], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 1.3, l: 0.6, w: 0.6 },
    palette: {
      base: { stem: ['#3e5a2a', '#55743a'], leaf: ['#3a5a2a', '#4e7236'], spike: ['#b03a8a', '#d058a8', '#8a2a6a'] },
      spring: { spike: ['#5a8a3a', '#6e9a46', '#4a7a32'] },
      autumn: { stem: ['#6a5a34', '#7a6a40'], leaf: ['#7a5a2a', '#946a30'], spike: ['#8a4a3a', '#a0604a', '#6a3a2a'] },
      winter: { stem: ['#6a5644', '#806a54'], leaf: ['#6a5644', '#806a54'], spike: ['#5a4434', '#6e5644', '#4a3a2a'] },
    },
    parts: ['body'], anim: { sway: { part: 'body', pivot: [0, 0], deg: 2.2 } }, shadow: false,
    tags: ['uk', 'canal', 'wetland', 'wildflower', 'loosestrife', 'kit:temperate', 'kit:water', 'role:edge', 'class:shrub'],
    credit: 'drawn for the Basingstoke Canal views: purple loosestrife (Lythrum salicaria)',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', body = [], n = 5 + v * 2;
      for (let i = 0; i < n; i++) {
        const x = (i - n / 2) * 9 + (rnd() - 0.5) * 6, h = 95 + rnd() * 50, lean = (rnd() - 0.5) * 22, tx = x + lean, ty = -h;
        body.push({ s: '@stem.' + (i % 2), w: 2, cap: 'round', d: `M${R(x)} 0Q${R(x + lean * 0.3)} ${R(-h * 0.5)} ${R(tx)} ${R(ty)}` });
        if (season !== 'winter') for (let j = 0; j < 4; j++) { const t = 0.2 + j * 0.13, px = x + lean * t * t, py = -h * t; body.push({ f: '@leaf.' + (j % 2), d: sceneD.leaf(px, py, Math.PI * (j % 2 ? 0.15 : 0.85), 14, 4) }); }
        // the spike: whorls of flowers up the top third
        let dd = '';
        for (let j = 0; j < 9; j++) { const t = 0.62 + j * 0.042, px = x + lean * t * t, py = -h * t, r = (season === 'spring' ? 1.6 : 3.4) * (1 - j * 0.06); dd += sceneD.ell(px + (j % 2 ? 1.2 : -1.2), py, r, r * 0.9); }
        body.push({ f: '@spike.' + (i % 3), d: dd });
      }
      return { body };
    },
  });
  sceneObjDefine({
    id: 'plant.canal-view-meadowsweet', category: 'plant', size: [90, 120], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 1.0, l: 0.6, w: 0.6 },
    palette: {
      base: { stem: ['#4a6a30', '#5e7e3a'], leaf: ['#3a5e2a', '#507a36'], head: ['#f2ead2', '#e4d8b4', '#fffaea'] },
      spring: { head: ['#7a9a4a', '#8aaa56', '#9ab866'] },
      autumn: { stem: ['#6a5a34', '#7a6a40'], leaf: ['#6a6a2e', '#84743a'], head: ['#9a7a4a', '#7a5a34', '#b08a5a'] },
      winter: { stem: ['#6a5644', '#806a54'], leaf: ['#6a5644', '#806a54'], head: ['#6a5040', '#5a4434', '#7a6050'] },
    },
    parts: ['body'], anim: { sway: { part: 'body', pivot: [0, 0], deg: 2 } }, shadow: false,
    tags: ['uk', 'canal', 'wetland', 'wildflower', 'meadowsweet', 'kit:temperate', 'kit:water', 'role:edge', 'class:shrub'],
    credit: 'drawn for the Basingstoke Canal views: meadowsweet (Filipendula ulmaria)',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', body = [], n = 5 + v * 2;
      for (let i = 0; i < n; i++) {
        const x = (i - n / 2) * 10 + (rnd() - 0.5) * 6, h = 70 + rnd() * 40, lean = (rnd() - 0.5) * 18, tx = x + lean, ty = -h;
        body.push({ s: '@stem.' + (i % 2), w: 1.8, cap: 'round', d: `M${R(x)} 0Q${R(x + lean * 0.3)} ${R(-h * 0.5)} ${R(tx)} ${R(ty)}` });
        if (season !== 'winter') body.push({ f: '@leaf.' + (i % 2), d: sceneD.leaf(x + lean * 0.1, -h * 0.25, Math.PI * (i % 2 ? 0.1 : 0.9), 22, 7) });
        let d0 = '', d1 = '';
        for (let j = 0; j < 16; j++) { const px = tx + (rnd() - 0.5) * 20, py = ty + (rnd() - 0.65) * 9, r = 1.2 + rnd() * 1.6; if (j % 2) d1 += sceneD.circ(px, py, r); else d0 += sceneD.circ(px, py, r); }
        body.push({ s: '@stem.1', w: 1, op: 0.8, d: `M${R(tx)} ${R(ty)}l-8 -3M${R(tx)} ${R(ty)}l8 -4M${R(tx)} ${R(ty)}l1 -7` }, { f: '@head.1', op: 0.9, d: d0 }, { f: '@head.' + (i % 2 ? 0 : 2), d: d1 });
      }
      return { body };
    },
  });
})();

/* ---------- the recipes ----------
   sceneCanalViewV2(id): the v2 recipe of one view, built from its ground plan above: the canal (a channel from the dense
   centreline), the towpath and its verge, the offside bank and its reedy fringe, gardens or woods behind, the hedges and the
   tree lines as clustered scatter (no rows), hand-placed hero trees, the boats and the bridge in pieces, waterfowl, the
   towpath's walkers and cyclists as flows, the framing foreground. PURE. */
function sceneCanalViewV2(id) {
  const V = SCENE_CANAL_VIEWS.views[id];
  if (!V) return null;
  const T = V.tow === 'right' ? 1 : -1, hw = V.width / 2, tw = V.towW;   // T: the towpath's side (+1 right of the cut)
  const o = (m) => T * m;   // an offset on the towpath side; -o(m) on the offside
  const r1 = (v) => Math.round(v * 10) / 10;
  const L = V.L;
  const side = (a, b) => (T > 0 ? [a, b] : [-b, -a]);   // [o0, o1] ordered for band(): a..b metres out on the towpath side
  const offs = (a, b) => (T > 0 ? [-b, -a] : [a, b]);   // a..b metres out on the offside
  const band = (ab, s0, s1, step) => V.band(ab[0], ab[1], s0, s1, step);
  // the cut as TWO regions, the near reach and the far one (each region mirrors its own nearest 600 placements: one long region
  // would spend them all on the near bank's flowers and lose the boats and the bridge down the reach)
  // ONE region (a split shows its cut as a bank across the water); the counts below are kept lean so the boats and the bridge
  // stay inside the 600 placements a region mirrors (nearest first)
  const water = [{ id: 'canal', kind: 'canal', path: V.line(0, 0, L, 2), width: V.width, edge: 'natural', rings: true }]   // (round 2) clear green near, lighter far (toward the sky it mirrors at a grazing angle);
  const S = { land: 'wood' };
  const surfaces = [
    { id: 'land', kind: 'grass', rest: true },
    { id: 'hedge', kind: 'verge', poly: band(side(hw + 0.55 + tw, hw + tw + 5), 0, L) },
    { id: 'beyond-t', kind: id === 'fleet-canal-1' ? 'meadow' : 'wood', poly: band(side(hw + tw + 5, hw + tw + 90), 0, L, 4) },
    { id: 'tow', kind: 'towpath', path: V.line(T * (hw + 0.55 + tw / 2), 0, L, 2), width: tw },
    { id: 'tow-mid', kind: 'verge', path: V.line(T * (hw + 0.55 + tw / 2 + 0.1), 0, L, 2), width: 0.32 },
    { id: 'lip-t', kind: 'bank', poly: band(side(hw - 0.05, hw + 0.58), 0, L) },
    { id: 'bank-o', kind: 'bank', poly: band(offs(hw - 0.05, hw + 3.2), 0, L) },
    { id: 'reeds-o', kind: 'bank', poly: band(offs(hw - 0.05, hw + 1.3), 0, L) },
  ];
  // the offside: gardens (views 1 and 4) or wood
  const gardens = id === 'fleet-canal-1' || id === 'fleet-canal-4';
  if (gardens) surfaces.push({ id: 'gardens', kind: 'garden', poly: band(offs(hw + 3.2, hw + 32), 6, Math.min(L, id === 'fleet-canal-1' ? 150 : 140), 3) });
  surfaces.push({ id: 'wood-o', kind: 'wood', poly: band(offs(hw + (gardens ? 32 : 3.2), hw + 110), 0, L, 4) });
  void S;
  const place = [], scatter = [], actors = [];
  // ---- the boats and the bridge, in pieces (pixel placements, pinned, their layer from their depth)
  const layerOf = (d) => (d < 15 ? 'fore' : d < 50 ? 'near' : d < 200 ? 'mid' : 'far');
  for (const v of V.boatIdx) {
    const pc = SCENE_CANAL_VIEWS.boatPieces[v], B = V.boats[pc.bi], A = SCENE_CANAL_VIEWS.pieceAnchor(V, pc), g = A.g, p = A.p;
    place.push({ obj: 'boat.canal-view-boat', variant: v, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: layerOf(g[1]), shadow: false, anim: B.smoke ? undefined : false });
  }
  if (V.bridge) {
    const B = V.bridge, q = V.at(B.s), nx = q[3], nd = -q[2], nearX = q[0] - q[2] * B.T / 2 + nx * B.uc, nearD = q[1] - q[3] * B.T / 2 + nd * B.uc, p = V.proj(nearX, nearD, 0);
    place.push({ obj: 'structure.canal-view-bridge', variant: V.bridgeIdx, x: r1(p[0]), y: r1(p[1]), s: 1, pin: true, layer: layerOf(nearD), shadow: false, anim: false });
  }
  if (V.parapet) place.push({ obj: 'structure.canal-view-parapet', variant: V.parapetIdx, x: 0, y: 900, s: 1, pin: true, layer: 'front', shadow: false, anim: false });
  // ---- per view: the hand-placed life and the framing
  const VIEW = SCENE_CANAL_VIEW_LIFE[id];
  if (VIEW) VIEW({ V, T, hw, tw, place, scatter, actors, surfaces, side, offs, band, L });
  // ---- the common cover: the towpath hedge, the verges, the offside reeds and flora, the tree lines (clustered)
  const towTrees = id === 'fleet-canal-3' ? { 'tree.bank-oak': 4, 'tree.pond-oak': 2, 'tree.bank-birch': 2, 'tree.bank-alder': 1 } : { 'tree.bank-oak': 3, 'tree.pond-oak': 2, 'tree.bank-birch': 2, 'tree.bank-alder': 2, 'tree.hawthorn': 1 };
  const offTrees = { 'tree.pond-alder': 3, 'tree.bank-willow': 2, 'tree.bank-alder': 2, 'tree.pond-oak': 2, 'tree.bank-birch': 1 };
  scatter.push(
    // the towpath hedge: hawthorn, blackthorn, bramble, in clumps with gaps (never a wall)
    { obj: { 'plant.towpath-hedge': 4, 'plant.hedgerow-blackberry': 2, 'plant.holly': 1 }, on: ['hedge'], d: [26, 220], n: 50, dist: 'screen', cluster: { centres: 14, spread: 6 }, seed: 31, anim: false, k: [0.75, 1.25] },
    { obj: { 'plant.grass-long': 3, 'plant.grass': 2, 'plant.wildflowers': 2, 'plant.canal-view-meadowsweet': 2, 'plant.bracken': 1 }, on: ['hedge'], d: [3.5, 90], n: 90, dist: 'ground', cluster: { centres: 10, spread: 9 }, seed: 32, anim: false, k: [0.7, 1.2] },
    // the towpath's grassy lip by the water, sedge and loosestrife
    { obj: { 'plant.grass-long': 4, 'plant.canal-view-loosestrife': 2, 'plant.bulrush': 1, 'plant.grass': 2 }, on: ['lip-t'], d: [5, 140], n: 90, dist: 'ground', cluster: { centres: 12, spread: 6 }, seed: 33, anim: false, k: [0.7, 1.15] },
    // the offside: a reedy fringe in stands, loosestrife and meadowsweet, sedge on the bank
    { obj: { 'plant.reed': 6, 'plant.bulrush': 2, 'plant.canal-view-loosestrife': 2 }, on: ['reeds-o'], d: [9, 260], n: 240, dist: 'ground', cluster: { centres: 18, spread: 7 }, seed: 34, anim: 'strip', shadow: false, k: [0.75, 1.2], tint: { col: '#8a7a40', k: [0, 0.1] } },
    { obj: { 'plant.grass-long': 3, 'plant.canal-view-meadowsweet': 2, 'plant.wildflowers': 1, 'plant.canal-view-loosestrife': gardens ? 1 : 0, 'plant.bulrush': gardens ? 1 : 0 }, on: ['bank-o'], avoid: ['reeds-o'], d: [3, 200], n: gardens ? 130 : 90, dist: 'ground', cluster: { centres: 12, spread: 7 }, seed: 35, anim: false, k: [0.7, 1.2] },
    { obj: { 'plant.towpath-hedge': 3, 'plant.hedgerow-blackberry': 1, 'plant.holly': 1 }, on: ['bank-o'], avoid: ['reeds-o'], d: [V.offHedge === false ? 60 : gardens ? 34 : 16, 200], n: V.offHedge === false ? 20 : gardens ? 26 : 50, dist: 'screen', cluster: { centres: 8, spread: 6 }, seed: 39, anim: false, k: [0.75, 1.2] },
    // the tree lines: groups and singles along both banks, the woods behind
    { obj: towTrees, on: ['beyond-t', 'hedge'], d: [17, 320], n: id === 'fleet-canal-1' ? 26 : 46, dist: 'ground', cluster: { centres: 9, spread: 7 }, gap: 'foot', seed: 36, anim: false, k: [0.75, 1.25] },
    { obj: offTrees, on: V.offHedge === false ? ['wood-o'] : ['bank-o', 'wood-o'], avoid: ['reeds-o'], d: [16, 320], n: 50, dist: 'ground', cluster: { centres: 10, spread: 7 }, gap: 'foot', seed: 37, anim: false, k: [0.75, 1.25] },
    { obj: { 'tree.bank-oak': 3, 'tree.pond-oak': 2, 'tree.bank-birch': 2, 'tree.bank-alder': 2 }, on: ['wood-o', 'beyond-t', 'land'], d: [70, 260], n: 80, dist: 'ground', cluster: { centres: 14, spread: 14 }, gap: 'foot', seed: 40, anim: false, k: [0.8, 1.3] },
    { obj: { 'tree.far-broad': 3, 'tree.far-birch': 2, 'tree.far-pine': 1 }, on: ['wood-o', 'beyond-t', 'land'], d: [220, 1400], n: 190, dist: 'ground', cluster: { centres: 16, spread: 50 }, seed: 38, anim: false, shadow: false },
    { obj: { 'tree.bank-oak': 2, 'tree.pond-oak': 2, 'tree.bank-alder': 2, 'tree.bank-willow': 1, 'tree.bank-birch': 1 }, on: ['wood-o', 'beyond-t', 'bank-o', 'hedge'], d: [140, 420], n: 50, dist: 'ground', seed: 44, anim: false, k: [0.85, 1.3] },
    // the towpath itself: grass tufts down its middle and edges, a few stones (a worn gravel track, not a flat band)
    { obj: { 'plant.grass': 5, 'plant.daisies': 2 }, on: ['tow-mid'], d: [2, 50], n: 34, dist: 'ground', cluster: { centres: 9, spread: 10 }, seed: 43, anim: false, k: [0.8, 1.3] },
    // (round 2) the towpath's litter: drifts of fallen leaves under the trees (no stones: a stone on the walking line is a blocker)
    { obj: { 'ground.leaves': 3, 'ground.leaf-litter': 2 }, on: ['tow'], d: [2.5, 70], n: 26, dist: 'ground', cluster: { centres: 7, spread: 5 }, seed: 45, anim: false, k: [0.7, 1.25] },
  );
  // (round 2) water lilies in rafts along the offside margin (the Basingstoke Canal's still summit pound is full of them)
  const uOff = T > 0 ? 0.06 : 0.94, lr = (n) => { const x = Math.sin(n * 12.9898 + id.charCodeAt(id.length - 1) * 78.233) * 43758.5453; return x - Math.floor(x); };   // a seeded hash per view
  for (let i = 0, d = 10 + lr(1) * 6; i < 5 && d < 75; i++, d += 7 + lr(i + 2) * 12) {
    for (let j = 0; j < 1 + Math.floor(lr(i * 7 + 3) * 2.5); j++) place.push({ obj: 'water.lily', on: 'canal', k: 2.2, d: r1(d + j * 0.9 + lr(i * 11 + j) * 0.8), u: Math.round((uOff + (T > 0 ? 1 : -1) * (0.02 + lr(i * 5 + j) * 0.09)) * 100) / 100, variant: (i + j) % 3 });
  }
  const cam = Object.assign({}, V.camera);
  const data = {
    v: 2, id,
    view: { lat: cam.lat, lon: cam.lon },
    camera: cam,
    at: id === 'fleet-canal-4' ? 'sunset' : 'afternoon', season: 'auto', setting: 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season',
    kits: ['temperate', 'water', 'birds', 'people'],
    surfaces, water, place, scatter, actors,
    flows: [],
  };
  if (V.relief) data.ground = { relief: V.relief };
  sceneCanalViewMovers(data, V, T, hw, tw);
  return data;
}

/* ---------- the movers: every swimmer and walker is a sceneBehave preset built from ground metres (kept in the water and
   clear of the boats, on the towpath and round its obstacles, sized for its depth, in the right layer). A view's life pushes
   markers { behave: 'actors' | 'pair' | 'walkWithDog', obj, preset, o: [offset...] | tow: true, s: [arc...], ... }: o metres
   right of the canal's centre at arc s (or the towpath's walking line, tow), resolved here once the data has its camera. */
function sceneCanalViewMovers(data, V, T, hw, tw) {
  if (typeof sceneBehave === 'undefined') { data.actors = data.actors.filter(a => !a.behave); return; }
  // a cyclist on every towpath (was a flow: flows walk the surface's centre, through moored boats' footprints and towpath stones)
  data.actors.push({ behave: 'actors', obj: 'person.cyclist', preset: 'brisk', speedM: 4.2, acts: false, tow: true, s: [3, ({ 'fleet-canal-1': 60, 'fleet-canal-3': 34 })[data.id] || 90], seed: 77, offset: 0.5 });
  const landData = Object.assign({}, data, { place: data.place.filter(p => !/^boat./.test(p.obj)) });
  const out = [];
  for (const a of data.actors) {
    if (!a.behave) { out.push(a); continue; }
    const s = a.s, o = a.tow ? s.map(() => T * (hw + 0.55 + tw / 2 + 0.35)) : a.o;
    const route = a.tow ? V.line(o[0], Math.min(s[0], s[1]), Math.max(s[0], s[1]), 3) : s.map((q, i) => { const p = V.at(q); return [Math.round((p[0] + p[3] * o[i]) * 100) / 100, Math.round((p[1] - p[2] * o[i]) * 100) / 100]; });
    if (a.tow && s[0] > s[1]) route.reverse();
    // (lock, 10 Oct: a dog walker routed past the camera rendered GIANT, cut by the frame and faceless) a walker never comes
    // nearer than the depth where a 1.7 m figure fills 45 % of the frame while on screen: the route ends there (the engine
    // turns it into a there-and-back) or runs on off the frame's side
    if (a.tow) {
      const near = (q) => { const p = V.proj(q[0], q[1], 0); return V.f * 1.7 / Math.max(0.1, q[1]) > 0.45 * 900 && p[0] > -80 && p[0] < 1680; };
      while (route.length > 2 && near(route[route.length - 1])) route.pop();
      while (route.length > 2 && near(route[0])) route.shift();
    }
    const spec = Object.assign({}, a, { route });
    for (const k of ['behave', 'o', 's', 'tow']) delete spec[k];
    // a moored boat floats beside the towpath and never blocks a walker (as the engine has it); sceneBehave's obstacle for a pinned
    // boat piece is its screen box laid on the ground, which spills over the towpath and pushed the walkers into the hedge
    const r = sceneBehave[a.behave](a.tow ? landData : data, spec);
    out.push(...(Array.isArray(r) ? r : [r]));
  }
  data.actors = out;
}

/* ---------- the life and framing of each view (hand-placed, ground metres) ---------- */
const SCENE_CANAL_VIEW_LIFE = {
  'fleet-canal-1'({ V, place, scatter, actors, surfaces }) {
    // houses at the bottom of the gardens' far end and the gardens' life: fences, a willow, a summerhouse-lawn
    for (const [x, d, v] of [[24, 32, 0], [27, 52, 1], [30, 78, 2], [33, 104, 0], [36, 128, 1]]) place.push({ obj: 'building.cottage', at: [x, d], variant: v, face: 'left' });
    for (const [x, d] of [[11.5, 24], [12.5, 44], [13, 66], [15, 92]]) place.push({ obj: 'structure.fence', at: [x, d], variant: 1 });
    scatter.push({ obj: { 'plant.hedge': 2, 'plant.shrub': 1, 'plant.towpath-hedge': 1, 'plant.wildflowers': 3, 'plant.daisies': 2 }, on: ['gardens'], d: [8, 140], n: 40, dist: 'screen', cluster: { centres: 12, spread: 6 }, seed: 51, anim: false, k: [0.7, 1.2] });   // (round 2) no azalea domes or berry hedges on the lawns
    scatter.push({ obj: { 'tree.bank-willow': 2, 'tree.bank-alder': 1, 'tree.bank-birch': 2, 'tree.pond-oak': 1 }, on: ['gardens'], d: [14, 150], n: 12, dist: 'ground', cluster: { centres: 5, spread: 10 }, gap: 'foot', seed: 52, anim: false, k: [0.8, 1.15] });
    // hero trees: a great willow on the offside by the bridge, an oak over the wharf
    place.push({ obj: 'tree.canal-willow', at: [12, 36], k: 1.1, variant: 1 }, { obj: 'tree.canal-oak', at: [-14.5, 26], k: 1.1, variant: 0 }, { obj: 'tree.canal-oak', at: [-16, 50], k: 1.05, variant: 2, flip: true });
    place.push({ obj: 'plant.canal-view-fronds', x: 1680, y: -40, s: 1.05, pin: true, layer: 'front', shadow: false, flip: true, variant: 0 });
    // waterfowl: a swan pair gliding up the reach, mallards, a moorhen in the offside reeds, a coot
    // (motion) the swan pair in the clear water between the moored boats and the trip boat's line, a pair of mallards near the bridge
    actors.push({ behave: 'actors', obj: 'bird.swan', o: [-1.4, -1.9, -1.2], s: [58, 42, 24], seed: 3 }, { behave: 'actors', obj: 'bird.swan', o: [-0.6, -1.1, -0.4], s: [60, 44, 26], seed: 4, variant: 1, offset: 0.03 });
    actors.push({ behave: 'actors', obj: 'bird.mallard', k: 1.22, o: [1.0, 1.8, 0.6], s: [26, 32, 38], seed: 5 }, { behave: 'actors', obj: 'bird.mallard', k: 1.22, o: [1.6, 2.4, 1.2], s: [26.6, 32.6, 38.6], seed: 6, variant: 1, offset: 0.01 });
    // the towpath (left): a stroller, a dog walker, a jogger, an older walker, a walker with an off-lead dog
    actors.push({ behave: 'actors', obj: 'person.walker', preset: 'stroll', tow: true, s: [4, 80], seed: 11, variant: 1, offset: 0.1 },
      { behave: 'actors', obj: 'person.dog-walker', preset: 'dog-walker', tow: true, s: [75, 4], seed: 12, offset: 0.4 },
      { behave: 'actors', obj: 'person.jogger', preset: 'jogger', tow: true, s: [4, 95], seed: 13, offset: 0.7 },
      { behave: 'actors', obj: 'person.walker', preset: 'elderly', tow: true, s: [50, 6], seed: 14, variant: 6, offset: 0.2 },
      { behave: 'walkWithDog', walker: 'person.walker', tow: true, s: [60, 8], seed: 16, variant: 4, dogVariant: 1, offset: 0.55 });
    // (round 2) the near offside: the garden bottoms meet the water in reed, loosestrife and meadowsweet, a birch and an alder
    // at the lawn's edge; a canoeist paddling up the cut (the canal is a canoe trail)
    scatter.push({ obj: { 'plant.reed': 4, 'plant.canal-view-loosestrife': 3, 'plant.bulrush': 1, 'plant.canal-view-meadowsweet': 2 }, on: ['reeds-o', 'bank-o'], d: [9, 40], n: 70, dist: 'ground', cluster: { centres: 6, spread: 4 }, seed: 53, anim: false, k: [1.0, 1.5] });
    place.push({ obj: 'tree.bank-birch', at: [15, 19], k: 0.95 }, { obj: 'tree.bank-alder', at: [17.5, 29], k: 0.85 });
    actors.push({ behave: 'actors', obj: 'person.kayaker', preset: 'swan', speedM: 0.9, acts: false, o: [3.2, 3.5, 3.3], s: [18, 30, 40], seed: 9 });   // up the offside of the cut, clear of the trip boat
    place.push({ obj: 'bird.moorhen', on: 'canal', d: 30, u: 0.92 }, { obj: 'bird.coot', on: 'canal', d: 84, u: 0.7 });
    void surfaces; void V;
  },
  'fleet-canal-2'({ place, scatter, actors }) {
    actors.push({ behave: 'actors', obj: 'bird.wp-heron-stalk', preset: 'heron-stalk', o: [-5.3, -5.4, -5.3], s: [25, 26.2, 27.4], seed: 29 });   // (motion) stalking the margin, long freezes and a strike (a still placement swung its legs on the spot)
    place.push({ obj: 'bird.proof-duckling', on: 'canal', d: 17.4, u: 0.31 }, { obj: 'bird.proof-duckling', on: 'canal', d: 17.9, u: 0.35, variant: 1 }, { obj: 'bird.moorhen', on: 'canal', d: 40, u: 0.15 });
    actors.push({ behave: 'actors', obj: 'bird.swan', o: [-2.6, -1.8, -2.8], s: [40, 28, 18], seed: 21 }, { behave: 'actors', obj: 'bird.swan', o: [-1.4, -0.4, -1.6], s: [46, 34, 24], seed: 22, variant: 1, offset: 0.2 });
    actors.push({ behave: 'actors', obj: 'bird.mallard', k: 1.22, o: [-1.6, -0.6, -2.2], s: [8, 11, 14], seed: 23 }, { behave: 'actors', obj: 'bird.mallard', k: 1.22, o: [-1.0, 0, -1.6], s: [8.6, 11.6, 14.6], seed: 24, variant: 1, offset: 0.01 });
    actors.push({ behave: 'actors', obj: 'person.walker', preset: 'stroll', tow: true, s: [3, 70], seed: 25, variant: 2, offset: 0.15 },
      { behave: 'actors', obj: 'person.dog-walker', preset: 'dog-walker', tow: true, s: [70, 3], seed: 26, offset: 0.5 },
      { behave: 'actors', obj: 'person.jogger', preset: 'jogger', tow: true, s: [3, 90], seed: 27, offset: 0.8 },
      { behave: 'walkWithDog', walker: 'person.walker', tow: true, s: [60, 10], seed: 28, variant: 3, dogVariant: 1, offset: 0.85 });
    // hero trees: an old alder leaning over the offside, an oak behind the towpath hedge on the right
    place.push({ obj: 'tree.pond-alder', at: [-19, 22], k: 1.15 }, { obj: 'tree.canal-willow', at: [-17, 40], k: 1.1, variant: 0 }, { obj: 'tree.canal-oak', at: [12, 27], k: 1.1, variant: 1 }, { obj: 'tree.canal-oak', at: [11.5, 42], k: 1.0, variant: 0, flip: true });
    // the foreground: tall loosestrife, meadowsweet and reed by the towpath at the bottom right (a frame), the willow curtain top left
    scatter.push({ obj: { 'plant.canal-view-loosestrife': 3, 'plant.canal-view-meadowsweet': 2, 'plant.grass-long': 3, 'plant.reed': 1 }, on: ['hedge', 'lip-t'], d: [2.2, 6], n: 46, dist: 'screen', cluster: { centres: 3, spread: 22 }, seed: 61, anim: false, k: [0.9, 1.2] });
    place.push({ obj: 'plant.canal-view-fronds', x: -40, y: -14, s: 1.1, pin: true, layer: 'front', shadow: false, anim: undefined });
  },
  'fleet-canal-3'({ place, scatter, actors }) {
    actors.push({ behave: 'actors', obj: 'bird.wp-heron-stalk', preset: 'heron-stalk', o: [-4.8, -4.9, -4.8], s: [40, 41.2, 42.4], seed: 39 });
    place.push({ obj: 'bird.moorhen', on: 'canal', d: 36, u: 0.9 });
    actors.push({ behave: 'actors', obj: 'bird.swan', o: [-1.6, -2.4, -1.4], s: [46, 32, 18], seed: 31 }, { behave: 'actors', obj: 'bird.swan', o: [-0.7, -1.5, -0.5], s: [48, 34, 20], seed: 32, variant: 1, offset: 0.04 });
    actors.push({ behave: 'actors', obj: 'bird.mallard', k: 1.22, o: [-2.6, -1.6, -3], s: [7, 10, 13], seed: 33 }, { behave: 'actors', obj: 'bird.mallard', k: 1.22, o: [-2, -1, -2.4], s: [7.6, 10.6, 13.6], seed: 34, variant: 1, offset: 0.01 });
    actors.push({ behave: 'actors', obj: 'person.walker', preset: 'stroll', tow: true, s: [3, 36], seed: 35, variant: 5, offset: 0.2 },
      { behave: 'walkWithDog', walker: 'person.walker', tow: true, s: [4, 34], seed: 36, variant: 1, dogVariant: 0, offset: 0.6 });
    scatter.push({ obj: { 'plant.grass': 3, 'plant.grass-long': 2, 'plant.wildflowers': 1, 'plant.daisies': 1 }, on: ['bank-o'], avoid: ['reeds-o'], d: [4, 40], n: 50, dist: 'screen', seed: 73, anim: false, k: [0.8, 1.2] });
    // (lock, 10 Oct) the pinned kingfisher was removed: its twig sat ON the open water (a bird floating on a stick, as big as the
    // swan beyond it); a perch needs a real snag or branch placed in ground metres first
    // hero trees: big oaks on the towpath side making the tunnel, an alder and a birch on the offside
    place.push({ obj: 'tree.canal-oak', at: [-14, 22], k: 1.25, variant: 2 }, { obj: 'tree.canal-oak', at: [-12, 36], k: 1.15, variant: 1, flip: true }, { obj: 'tree.bank-birch', at: [-16, 48], k: 1.1 }, { obj: 'tree.pond-alder', at: [17.5, 24], k: 1.25 }, { obj: 'tree.canal-oak', at: [19, 40], k: 1.15, variant: 0 }, { obj: 'tree.bank-alder', at: [13, 64], k: 1.1 });
    scatter.push({ obj: { 'plant.reed': 5, 'plant.bulrush': 2, 'plant.canal-view-loosestrife': 1, 'plant.grass-long': 2 }, on: ['reeds-o', 'bank-o'], d: [2.5, 30], n: 70, dist: 'screen', cluster: { centres: 4, spread: 26 }, seed: 72, anim: false, k: [0.8, 1.2] });
    scatter.push({ obj: { 'plant.bracken': 3, 'plant.fern': 2, 'plant.grass-long': 2 }, on: ['beyond-t', 'wood-o'], d: [6, 90], n: 70, dist: 'screen', cluster: { centres: 14, spread: 8 }, seed: 71, anim: false, k: [0.75, 1.2] });
    place.push({ obj: 'plant.canal-view-bough', x: -30, y: -10, s: 1.2, pin: true, layer: 'front', shadow: false });
  },
  'fleet-canal-4'({ place, scatter, actors }) {
    for (const [x, d, v] of [[21, 52, 1], [24, 72, 0], [23, 96, 2], [20, 118, 1], [14, 138, 0]]) place.push({ obj: 'building.cottage', at: [x, d], variant: v, face: 'left' });
    scatter.push({ obj: { 'plant.hedge': 2, 'plant.shrub': 1, 'plant.towpath-hedge': 1, 'plant.wildflowers': 3, 'plant.daisies': 2 }, on: ['gardens'], d: [8, 140], n: 40, dist: 'screen', cluster: { centres: 12, spread: 6 }, seed: 81, anim: false, k: [0.7, 1.2] });
    scatter.push({ obj: { 'tree.bank-willow': 2, 'tree.bank-alder': 1, 'tree.bank-birch': 2 }, on: ['gardens'], d: [14, 150], n: 10, dist: 'ground', cluster: { centres: 4, spread: 10 }, gap: 'foot', seed: 82, anim: false, k: [0.8, 1.15] });
    place.push({ obj: 'tree.canal-oak', at: [-10, 21], k: 1.0, variant: 1, flip: true }, { obj: 'tree.bank-birch', at: [-10.5, 36], k: 0.8 });   // (round 3) out from behind the oak's crown (there only its bare white limbs showed, as sticks in the sky)
    actors.push({ behave: 'actors', obj: 'bird.swan', o: [-0.4, 0.2, -0.6], s: [40, 26, 15], seed: 41 }, { behave: 'actors', obj: 'bird.swan', o: [-1.6, -1.0, -1.8], s: [44, 30, 18], seed: 42, variant: 1, offset: 0.12 });
    actors.push({ behave: 'actors', obj: 'bird.mallard', k: 1.22, o: [-0.8, 0.2, -1.2], s: [5, 8, 11], seed: 43 }, { behave: 'actors', obj: 'bird.mallard', k: 1.22, o: [-0.2, 0.8, -0.6], s: [5.6, 8.6, 11.6], seed: 44, variant: 1, offset: 0.01 });
    actors.push({ behave: 'actors', obj: 'person.walker', preset: 'stroll', tow: true, s: [3, 70], seed: 45, variant: 2, offset: 0.1 },
      { behave: 'actors', obj: 'person.dog-walker', preset: 'dog-walker', tow: true, s: [66, 3], seed: 46, offset: 0.45 },
      { behave: 'actors', obj: 'person.walker', preset: 'elderly', tow: true, s: [40, 4], seed: 47, variant: 6, offset: 0.75 });
    place.push({ obj: 'plant.canal-view-fronds', x: 1660, y: -30, s: 1.05, pin: true, layer: 'front', shadow: false, flip: true, variant: 1 });
    scatter.push({ obj: { 'plant.reed': 4, 'plant.bulrush': 2, 'plant.canal-view-loosestrife': 2, 'plant.grass-long': 2 }, on: ['lip-t', 'hedge'], d: [2.2, 9], n: 60, dist: 'screen', cluster: { centres: 3, spread: 20 }, seed: 83, anim: false, k: [0.9, 1.2] });
    scatter.push({ obj: { 'plant.canal-view-meadowsweet': 2, 'plant.grass-long': 3, 'plant.bracken': 1, 'plant.wildflowers': 2, 'plant.canal-view-loosestrife': 1 }, on: ['hedge'], d: [2.4, 12], n: 70, dist: 'screen', cluster: { centres: 4, spread: 30 }, seed: 84, anim: false, k: [0.85, 1.2] });
  },
};

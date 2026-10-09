/* ============================================================
   SCENE LIBRARY: fleet-pond-views (docs/dev/SCENE_ENGINE_V2.md), the shared ground plans and own objects of the four
   Fleet Pond views (71-scene-uk-south-east-fleet-pond-v1..v4.js). PURE: data and sceneObjDefine calls only.

   Fleet Pond Local Nature Reserve, Fleet, Hampshire. Each view is a different real viewpoint, composed by hand:
     v1  Sandy Bay on the north shore, looking south across the whole pond (pines, the sandy beach, geese, dinghies)
     v2  the Gelvert stream boardwalk in the south-west carr, looking north down the stream to the pond and the main line
     v3  the heath knoll above the west reedbed at sunrise, looking east down a sandy path over the reeds to the water
     v4  the sailing club's pontoon on the east shore at sunset, looking west along the pontoon into the low sun

   Objects of their own (drawn in the camera's perspective where they must be, like the proof's boardwalk):
     structure.fpv-walk-v2       the Gelvert boardwalk, one variant per 2 m piece, the last the viewing platform
     structure.fpv-walk-v4       the club pontoon (low, floating, no handrails, black floats), pieces, then finger pontoons
     tree.fpv-alder-trunk        a near alder trunk with ivy rising up the left edge of the frame (foreground framing)
     plant.fpv-willow-fronds     weeping willow fronds hanging into the top of the frame (yellow twigs in winter)
     building.fpv-sailing-hut    the sailing club's timber clubhouse with a veranda and a burgee on its flagpole
     boat.fpv-dinghy-moored      a dinghy moored or on its trolley, sails down: a bare mast, a cover, its burgee
   Ground metres: x to the right of the view axis, d forward.
   ============================================================ */
const SCENE_FPV = Object.freeze({
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
  /** A closed Catmull-Rom loop through [x, d] control points, with a seeded wobble growing with depth (natural edges). */
  loop(pts, step, wob, seed) {
    const R2 = v => Math.round(v * 100) / 100, r = SCENE_FPV.rnd(seed), out = [], n = pts.length;
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
  /** A ragged fringe polygon along a line: from the line, about w metres out to its left (side -1) or right (side 1). */
  fringe(pts, w, side, seed) {
    const R2 = v => Math.round(v * 100) / 100, r = SCENE_FPV.rnd(seed), L = SCENE_FPV.line(pts, 1.2), out = [];
    for (let i = 0; i < L.length; i++) {
      const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)], tx = b[0] - a[0], td = b[1] - a[1], m = Math.hypot(tx, td) || 1;
      const nx = -td / m * side, nd = tx / m * side, ww = w * (0.55 + r() * 0.7);
      out.push([R2(L[i][0] + nx * ww), R2(L[i][1] + nd * ww)]);
    }
    return L.concat(out.reverse());
  },
  /** A far treeline as one filled path (screen units): lobed broadleaf crowns, flat-topped Scots pines standing out of them and
   *  now and then a birch's narrow crown; from row `base` up, closed down to `foot`. Every lobe has its own width and height. */
  canopy(base, seed, hMin, hMax, pine, foot, birch) {
    const R1 = v => Math.round(v * 10) / 10, r = SCENE_FPV.rnd(seed);
    let d = `M-170 ${foot}V${base}`, x = -170;
    while (x < 1770) {
      const w = 14 + r() * 40, h = hMin + Math.pow(r(), 1.6) * (hMax - hMin), y1 = base - h, k = r();
      if (k < pine) {
        // (round 2) a Scots pine as it stands out of a far wood: a short bare stem above the broadleaves, an irregular crown
        // about as deep as it is wide (two or three lumps on its flat top, a ragged underside with a hanging clump), often a
        // lower tier off one side, leaning a little: not a disc on a stick
        const s = 0.75 + r() * 0.6, cw = (6 + r() * 6) * s, ch = (7 + r() * 6) * s, sh = (2 + r() * 6) * s, tx = x + w / 2, ln = (r() - 0.5) * 3;
        const cb = y1 - sh, ct = cb - ch, tw = 0.8 + 0.4 * s, side = r() < 0.5 ? -1 : 1, tier = sh > 3.5 && r() < 0.75, P = (X, Y) => `${R1(X)} ${R1(Y)}`;
        // the lower tier: up the left of the stem (sg -1) or down its right (sg 1)
        const tierAt = (sg) => {
          const yb = cb + sh * 0.5, e = cw * (0.7 + r() * 0.2), lo = [tx + sg * tw, yb + 1.6], hi = [tx + sg * tw, yb - 2.4];
          return sg < 0 ? `L${P(...lo)}Q${P(tx - e, yb + 2.2)} ${P(tx - e * 1.05, yb - 1.2)}Q${P(tx - e * 0.6, yb - 4.2)} ${P(...hi)}`
            : `L${P(...hi)}Q${P(tx + e * 0.6, yb - 4.2)} ${P(tx + e * 1.05, yb - 1.2)}Q${P(tx + e, yb + 2.2)} ${P(...lo)}`;
        };
        d += `L${P(tx - tw, y1 + 4)}` + (tier && side < 0 ? tierAt(-1) : '') + `L${P(tx - tw * 0.6 + ln, cb + 1)}`
          + `Q${P(tx - cw * 0.3 + ln, cb + ch * 0.3)} ${P(tx - cw * 0.6 + ln, cb + ch * 0.06)}Q${P(tx - cw * 1.05 + ln, cb + ch * 0.12)} ${P(tx - cw + ln, cb - ch * 0.3)}`
          + `Q${P(tx - cw * 1.12 + ln, cb - ch * 0.75)} ${P(tx - cw * 0.55 + ln, ct + ch * 0.12)}Q${P(tx - cw * 0.28 + ln, ct - ch * 0.14)} ${P(tx + ln * 1.2, ct + ch * 0.06)}`
          + `Q${P(tx + cw * 0.35 + ln, ct - ch * 0.2)} ${P(tx + cw * 0.72 + ln, ct + ch * 0.18)}Q${P(tx + cw * 1.12 + ln, cb - ch * 0.5)} ${P(tx + cw * 0.86 + ln, cb - ch * 0.1)}`
          + `Q${P(tx + cw * 0.5 + ln, cb + ch * 0.14)} ${P(tx + tw * 0.6 + ln, cb + 1)}` + (tier && side > 0 ? tierAt(1) : '') + `L${P(tx + tw, y1 + 4)}`;
      } else if (k < pine + (birch || 0)) {
        const tx = x + w / 2, ty = y1 - h * 0.5;
        d += `L${R1(tx - 5)} ${R1(y1 + 2)}Q${R1(tx - 6)} ${R1(ty + 4)} ${R1(tx)} ${R1(ty)}Q${R1(tx + 6)} ${R1(ty + 4)} ${R1(tx + 5)} ${R1(y1 + 2)}`;
      } else d += `Q${R1(x + w * 0.1)} ${R1(y1 - h * 0.25)} ${R1(x + w * 0.5)} ${R1(y1 - h * 0.3)}Q${R1(x + w * 0.95)} ${R1(y1 - h * 0.2)} ${R1(x + w)} ${R1(base - h * (0.3 + r() * 0.5))}`;
      x += w * (0.6 + r() * 0.35);
    }
    return d + `L1770 ${base}V${foot}Z`;
  },
  /** A ring with holes cut in it (round 2): each hole joined to the ring's nearest vertex by a zero-width slit and wound the
   *  other way, so an even-odd or non-zero fill and the engine's point-in-polygon both leave it out (reed islands in a water
   *  region). Only for far holes: a slit is an edge, and an edge look would draw along it. */
  keyhole(ring, holes) {
    const area = (P) => P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0), sg = Math.sign(area(ring));
    let out = ring.map(p => p.slice());
    for (const h0 of holes) {
      const h = Math.sign(area(h0)) === sg ? h0.slice().reverse() : h0.slice();
      let bi = 0, bd = Infinity;
      out.forEach((p, i) => { const dd = Math.hypot(p[0] - h[0][0], p[1] - h[0][1]); if (dd < bd) { bd = dd; bi = i; } });
      out = out.slice(0, bi + 1).concat(h.map(p => p.slice()), [h[0].slice(), out[bi].slice()], out.slice(bi + 1));
    }
    return out;
  },
  /** The camera's projection: [X, Y] of ground (x, d) at height h. */
  proj(cam) { const f = 800 / Math.tan(cam.fov * Math.PI / 360), x0 = cam.x0 || 800; return { f, p: (x, d, h) => [x0 + f * x / d, cam.horizon + f * (cam.eye - (h || 0)) / d] }; },

  // ---- v2: the Gelvert stream boardwalk (south-west carr), looking north down the stream to the pond and the main line
  v2: Object.freeze({
    // (round 2) the water 0.2 m under the carr floor (was 0.45): the main line's foot then stands on the water's far row, so the
    // water pass mirrors the trains (a mover more than 2 units above a region's top is not considered)
    camera: { eye: 2.4, fov: 66, horizon: 400, heading: 8, lat: 51.2853, lon: -0.8266, water: -0.2 },
    // the boardwalk: on from the camera, a bridge over the stream, on through the sedge to the platform over the stream mouth
    deck: [[0.1, 2.4], [0.2, 5], [0.5, 7.5], [1.0, 10], [1.5, 12.6], [1.9, 15.2], [2.0, 17.6], [1.4, 19.4]],
    deckW: 1.3,
    platform: [[-2.0, 19.4], [1.8, 18.8], [2.3, 23.0], [-1.5, 23.6]],
    rails: true,
    // the stream: from the carr on the right, under the walk, meandering forward-left to its mouth in the reeds
    stream: [[12, 8.2], [7.4, 8.8], [4.0, 9.6], [1.1, 10.9], [-1.4, 13], [-3.6, 16.5], [-4.6, 21], [-5.6, 26.5], [-7.2, 32], [-9.2, 38]],
    // the main line along the far (north) shore: d = rail0 + slope * x
    rail0: 200, slope: 0.3,
  }),

  // ---- v4: the sailing club's pontoon on the east shore at sunset, looking west along it into the sun
  v4: Object.freeze({
    camera: { eye: 1.75, fov: 64, horizon: 452, heading: 278, lat: 51.2876, lon: -0.8124, water: -0.32 },
    deck: [[0.2, 2.4], [0.0, 5], [-0.4, 9], [-1.0, 14], [-1.7, 19], [-2.4, 24], [-3.0, 28]],
    deckW: 2.0,
    platform: null,
    rails: false,
    // finger pontoons off the main one (left side), near to far: [s along the walk, length, side]
    fingers: [[9, 4.2, -1], [15, 4.2, -1], [21, 4.2, -1], [14, 3.2, 1]],
  }),
});

/* ---------- the perspective boardwalk / pontoon (v2, v4) ----------
   structure.fpv-walk-<v>: one variant per 2 m piece of the deck (near to far), then the platform (v2) or the finger pontoons
   (v4). Each piece is anchored at its NEAR centre on the deck (pixels, pinned) so the depth sort puts the reeds in front of or
   behind each piece; platforms and fingers at their FAR corner, so a figure or a boat beside them draws over the deck. */
const SCENE_FPV_WALK = (function () {
  const make = (P) => {
    const C = P.camera, J = SCENE_FPV.proj(C), f = J.f, proj = J.p;
    const dense = SCENE_FPV.line(P.deck, 0.1), arc = [0];
    for (let i = 1; i < dense.length; i++) arc.push(arc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const L = arc[arc.length - 1];
    const at = (s) => {
      s = Math.max(0, Math.min(L, s));
      let i = 1;
      while (i < arc.length - 1 && arc[i] < s) i++;
      const a = dense[i - 1], b = dense[i], u = (s - arc[i - 1]) / Math.max(1e-6, arc[i] - arc[i - 1]);
      const tx = b[0] - a[0], td = b[1] - a[1], m = Math.hypot(tx, td) || 1;
      return [a[0] + tx * u, a[1] + td * u, td / m, -tx / m];
    };
    const dMin = f * C.eye / (900 - C.horizon) * 0.95;
    let s0 = 0;
    while (s0 < L && at(s0)[1] < dMin) s0 += 0.1;
    const pieces = [];
    for (let s = s0; s < L - 0.05; s += 2) pieces.push([s, Math.min(L, s + 2)]);
    // the extra decks: the platform (v2) or the finger pontoons (v4), each a 4-point poly [near-left, near-right, far-right, far-left]
    const extras = [];
    if (P.platform) extras.push(P.platform);
    for (const [s, len, side] of P.fingers || []) {
      const q = at(s), w = 0.9, nx = q[2] * side, nd = q[3] * side, tx = -q[3], td = q[2];   // tx, td: along the walk
      const e = P.deckW / 2, b0 = [q[0] + nx * e, q[1] + nd * e], b1 = [q[0] + nx * (e + len), q[1] + nd * (e + len)];
      extras.push([[b0[0] - tx * w / 2, b0[1] - td * w / 2], [b1[0] - tx * w / 2, b1[1] - td * w / 2], [b1[0] + tx * w / 2, b1[1] + td * w / 2], [b0[0] + tx * w / 2, b0[1] + td * w / 2]]);
    }
    /** The pixel placements of the pieces and extras (for the scene's place list). */
    const placements = (id) => {
      const out = pieces.map((pc, i) => {
        const q = at(pc[0]), a = proj(q[0], q[1], 0);
        return { obj: id, variant: i, x: Math.round(a[0] * 10) / 10, y: Math.round(a[1] * 10) / 10, s: 1, pin: true, layer: q[1] < 15 ? 'fore' : 'near', shadow: false, anim: false };
      });
      extras.forEach((Q, j) => {
        const far = Q.reduce((m, p) => (proj(p[0], p[1], 0)[1] < proj(m[0], m[1], 0)[1] ? p : m), Q[0]), a = proj(far[0], far[1], 0);
        out.push({ obj: id, variant: pieces.length + j, x: Math.round(a[0] * 10) / 10, y: Math.round(a[1] * 10) / 10, s: 1, pin: true, layer: far[1] < 15 ? 'fore' : 'near', shadow: false, anim: false });
      });
      return out;
    };
    return { P, C, f, proj, at, L, pieces, extras, placements, w: P.deckW };
  };
  return { v2: make(SCENE_FPV.v2), v4: make(SCENE_FPV.v4) };
})();
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = (v) => Math.round(v * 10) / 10;
  const define = (key, W) => {
    const P = W.P, proj = W.proj, f = W.f, HW = P.camera.water, rails = !!P.rails;
    const poly = (pts, o) => 'M' + pts.map(p => R(p[0] - o[0]) + ' ' + R(p[1] - o[1])).join('L') + 'Z';
    const line = (pts, o) => 'M' + pts.map(p => R(p[0] - o[0]) + ' ' + R(p[1] - o[1])).join('L');
    const side = (q, sgn, w) => [q[0] + q[2] * sgn * w / 2, q[1] + q[3] * sgn * w / 2];
    const band = (g, h0, h1, o) => poly(g.map(p => proj(p[0], p[1], h1)).concat(g.slice().reverse().map(p => proj(p[0], p[1], h0))), o);
    const post = (x, d, h0, h, wm, o) => { const a = proj(x, d, h0), b = proj(x, d, h), hw = Math.max(0.6, f * wm / d) / 2; return poly([[b[0] - hw, b[1]], [b[0] + hw, b[1]], [a[0] + hw, a[1]], [a[0] - hw, a[1]]], o); };
    /** The side faces of a deck edge that look toward the camera: a band from h0 to h1 under each visible run. */
    const sideBands = (Lg, Rg, h0, h1, o, fill, op, out) => {
      for (const [g, sgn] of [[Lg, -1], [Rg, 1]]) {
        let run = [];
        const flush = () => { if (run.length > 1) out.push({ f: fill, d: band(run, h0, h1, o), op }); run = []; };
        for (let i = 0; i < g.length - 1; i++) {
          const a = g[i], b = g[i + 1], tx = b[0] - a[0], td = b[1] - a[1], nx = td * sgn, nd = -tx * sgn;
          if (-(a[0] * nx + a[1] * nd) > 0) { if (!run.length) run.push(a); run.push(b); } else flush();
        }
        flush();
      }
    };
    function piece(out, s0, s1, rnd, season) {
      const n = Math.max(3, Math.round((s1 - s0) / 0.25)), Cn = [];
      for (let i = 0; i <= n; i++) Cn.push(W.at(s0 + (s1 - s0) * i / n));
      const Lg = Cn.map(q => side(q, -1, W.w)), Rg = Cn.map(q => side(q, 1, W.w));
      const o = proj(Cn[0][0], Cn[0][1], 0);
      if (!rails) {
        // a floating pontoon: black floats down to the water, the timber fascia above them
        sideBands(Lg, Rg, HW - 0.04, -0.2, o, '@float.0', 1, out.body);
        sideBands(Lg, Rg, HW - 0.04, HW + 0.03, o, '@float.1', 0.7, out.body);
      } else {
        // piles down to the water under each piece's start (they read only where the walk crosses open water)
        for (const g of [Lg, Rg]) out.body.push({ f: '@post.0', d: post(g[0][0], g[0][1], HW - 0.05, -0.15, 0.12, o) });
      }
      sideBands(Lg, Rg, -0.2, 0, o, '@wood.0', 1, out.body);
      sideBands(Lg, Rg, -0.2, -0.13, o, '@wood.4', 0.55, out.body);
      const top = poly(Lg.map(p => proj(p[0], p[1], 0)).concat(Rg.slice().reverse().map(p => proj(p[0], p[1], 0))), o);
      const yN = proj(Cn[0][0], Cn[0][1], 0)[1] - o[1], yF = proj(Cn[n][0], Cn[n][1], 0)[1] - o[1];
      out.body.push({ f: { lin: [[0, '@wood.2'], [1, '@wood.1']], x1: 0, y1: yF, x2: 0, y2: yN }, d: top });
      const planks = Math.round((s1 - s0) / 0.15), gaps = [];
      for (let i = 0; i <= planks; i++) {
        const q = W.at(s0 + (s1 - s0) * i / planks), a = proj(...side(q, -1, W.w), 0), b = proj(...side(q, 1, W.w), 0), dd = q[1];
        if (f * 0.15 / dd > 2.2 && i < planks) {
          const q2 = W.at(s0 + (s1 - s0) * (i + 1) / planks), c = proj(...side(q2, 1, W.w), 0), e = proj(...side(q2, -1, W.w), 0), r = rnd();
          if (r < 0.45) out.body.push({ f: r < 0.2 ? '@wood.3' : '@wood.0', d: poly([a, b, c, e], o), op: 0.16 + 0.2 * rnd(), detail: true });
          if (season === 'autumn' && rnd() < 0.18) { const u = 0.15 + 0.7 * rnd(), lx = a[0] + (b[0] - a[0]) * u, ly = a[1] + (b[1] - a[1]) * u, rr = f * 0.06 / dd; out.body.push({ f: '@leaf.' + Math.floor(rnd() * 3), d: sceneD.ell(lx - o[0], ly - o[1] - rr * 0.3, rr, rr * 0.45), detail: true }); }
          if (!rails && rnd() < 0.08) { const u = 0.2 + 0.6 * rnd(), lx = a[0] + (b[0] - a[0]) * u, ly = a[1] + (b[1] - a[1]) * u, rr = f * 0.12 / dd; out.body.push({ f: '@moss.0', d: sceneD.ell(lx - o[0], ly - o[1] - rr * 0.2, rr, rr * 0.35), op: 0.5, detail: true }); }
        }
        if (f * 0.15 / dd > 1.1) gaps.push([a, b]);
      }
      if (gaps.length) out.body.push({ s: '@wood.4', w: Math.max(0.4, f * 0.012 / Cn[0][1]), d: gaps.map(g => line(g, o)).join(''), op: 0.5 });
      if (season === 'winter') out.body.push({ f: '#eef2f4', d: top, op: 0.2 });
      out.body.push({ s: '@wood.4', w: Math.max(0.5, f * 0.03 / Cn[0][1]), d: line(Lg.map(p => proj(p[0], p[1], 0)), o), op: 0.7 });
      out.body.push({ s: '@wood.3', w: Math.max(0.5, f * 0.03 / Cn[0][1]), d: line(Rg.map(p => proj(p[0], p[1], 0)), o), op: 0.9 });
      if (rails) {
        for (const [g, lit] of [[Lg, 0], [Rg, 1]]) {
          out.body.push({ f: lit ? '@post.1' : '@post.0', d: post(g[0][0], g[0][1], -0.12, 1.06, 0.1, o) });
          out.body.push({ f: '@rail.0', d: band(g, 0.47, 0.53, o) });
          out.body.push({ f: lit ? '@rail.1' : '@rail.0', d: band(g, 0.96, 1.04, o) });
          out.body.push({ f: '@rail.2', d: band(g, 1.02, 1.04, o), op: 0.8, detail: true });
          if (season === 'winter') out.body.push({ f: '#f4f7f8', d: band(g, 1.035, 1.05, o), op: 0.7, detail: true });
        }
      } else {
        // cleats and a mooring ring now and then, and the low kerb boards
        for (const g of [Lg, Rg]) {
          out.body.push({ f: '@wood.3', d: band(g, 0, 0.06, o), op: 0.8 });
          if (rnd() < 0.5) { const p = g[Math.floor(g.length / 2)], a = proj(p[0], p[1], 0.1), w = f * 0.18 / p[1]; out.body.push({ f: '@metal.0', d: sceneD.rect(a[0] - o[0] - w / 2, a[1] - o[1], w, Math.max(0.6, w * 0.3)) }); }
        }
      }
    }
    function deck(out, Q, rnd, season, hasRails) {
      const far = Q.reduce((m, p) => (proj(p[0], p[1], 0)[1] < proj(m[0], m[1], 0)[1] ? p : m), Q[0]), o = proj(far[0], far[1], 0);
      const pr = (p, h) => proj(p[0], p[1], h);
      const faceRun = (h0, h1, fill, op) => {
        for (let i = 0; i < 4; i++) {
          const a = Q[i], b = Q[(i + 1) % 4], tx = b[0] - a[0], td = b[1] - a[1];
          for (const sgn of [-1, 1]) {
            const nx = td * sgn, nd = -tx * sgn, mx = (a[0] + b[0]) / 2, md = (a[1] + b[1]) / 2;
            // outward: away from the polygon's centre
            const cx = Q.reduce((s, p) => s + p[0], 0) / 4, cd = Q.reduce((s, p) => s + p[1], 0) / 4;
            if ((mx - cx) * nx + (md - cd) * nd <= 0) continue;
            if (-(mx * nx + md * nd) <= 0) continue;
            out.body.push({ f: fill, d: band([a, b], h0, h1, o), op });
          }
        }
      };
      if (!hasRails) { faceRun(HW - 0.04, -0.2, '@float.0', 1); }
      faceRun(-0.22, 0, '@wood.0', 1);
      const top = poly(Q.map(p => pr(p, 0)), o);
      out.body.push({ f: { lin: [[0, '@wood.2'], [1, '@wood.1']], x1: 0, y1: 0, x2: 0, y2: Math.max(...Q.map(p => pr(p, 0)[1])) - o[1] }, d: top });
      const gaps = [], nG = Math.max(6, Math.round(Math.hypot(Q[3][0] - Q[0][0], Q[3][1] - Q[0][1]) / 0.17));
      for (let i = 1; i < nG; i++) { const u = i / nG, a = [Q[0][0] + (Q[3][0] - Q[0][0]) * u, Q[0][1] + (Q[3][1] - Q[0][1]) * u], b = [Q[1][0] + (Q[2][0] - Q[1][0]) * u, Q[1][1] + (Q[2][1] - Q[1][1]) * u]; gaps.push([pr(a, 0), pr(b, 0)]); }
      out.body.push({ s: '@wood.4', w: 0.6, d: gaps.map(g => line(g, o)).join(''), op: 0.5 });
      if (season === 'winter') out.body.push({ f: '#eef2f4', d: top, op: 0.22 });
      if (hasRails) {
        for (const [a, b, lit] of [[Q[1], Q[2], 1], [Q[2], Q[3], 1], [Q[3], Q[0], 0]]) {
          const g = [0, 0.5, 1].map(u => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
          for (const p of g) out.body.push({ f: lit ? '@post.1' : '@post.0', d: post(p[0], p[1], -0.12, 1.08, 0.12, o) });
          out.body.push({ f: '@rail.0', d: band(g, 0.47, 0.53, o) });
          out.body.push({ f: lit ? '@rail.1' : '@rail.0', d: band(g, 0.97, 1.05, o) });
          if (season === 'winter') out.body.push({ f: '#f4f7f8', d: band(g, 1.04, 1.06, o), op: 0.7, detail: true });
        }
        // a bench along the far rail
        const a = Q[2], b = Q[3], m0 = [a[0] + (b[0] - a[0]) * 0.25, a[1] + (b[1] - a[1]) * 0.25 - 0.4], m1 = [a[0] + (b[0] - a[0]) * 0.75, a[1] + (b[1] - a[1]) * 0.75 - 0.4];
        out.body.push({ f: '@wood.3', d: band([m0, m1], 0.42, 0.48, o) }, { f: '@wood.0', d: band([m0, m1], 0.62, 0.8, o), op: 0.9 });
        for (const p of [m0, m1]) out.body.push({ f: '@post.0', d: post(p[0], p[1], 0, 0.45, 0.06, o) });
      } else {
        out.body.push({ f: '@wood.3', d: band([Q[1], Q[2]], 0, 0.06, o), op: 0.8 });
      }
    }
    const pal = {
      base:   { wood: ['#5a4a38', '#a39276', '#8a7a62', '#b8a888', '#3e3226'], post: ['#4e3e2e', '#7a6650'], rail: ['#7a6a54', '#a8977a', '#c8b898'], leaf: ['#c0702a', '#e0a040', '#8a4a1e'], float: ['#1c1e20', '#2e3436'], metal: ['#8a8e92'], moss: ['#5a6a3a'] },
      autumn: { wood: ['#4a3c2c', '#8a7a62', '#6e604c', '#9c8a6c', '#30261c'], rail: ['#6a5a46', '#94846a', '#b4a484'] },
      winter: { wood: ['#5a544a', '#aaa498', '#8e887c', '#c4beb0', '#3e3a32'], post: ['#4e4840', '#7a746a'], rail: ['#7e786c', '#aca698', '#d8d4ca'], moss: ['#4e5648'] },
    };
    if (!rails) {
      // the pontoon: grey composite-and-timber decking, paler than the reserve's oak boardwalk
      pal.base.wood = ['#5e5850', '#b4aa98', '#9a907e', '#c8bea8', '#3e3a34'];
      pal.autumn = { wood: ['#56504a', '#a69c8a', '#8c8272', '#bab09a', '#36322c'] };
    }
    sceneObjDefine({
      id: 'structure.fpv-walk-' + key,
      category: 'structure',
      size: [400, 220],
      variants: W.pieces.length + W.extras.length,
      seasonal: true,
      shapeBySeason: true,
      flippable: false,
      palette: pal,
      parts: ['body'],
      reflect: true,
      shadow: false,
      tags: ['uk', rails ? 'boardwalk' : 'pontoon', 'nature-reserve', 'kit:temperate', 'kit:water', 'role:street', 'class:structure'],
      credit: rails ? 'drawn for the Fleet Pond views: the Gelvert stream boardwalk and its platform' : 'drawn for the Fleet Pond views: the sailing club pontoon',
      build(v, rnd, ctx) {
        const season = (ctx && ctx.season) || 'summer', out = { body: [] };
        if (v < W.pieces.length) piece(out, W.pieces[v][0], W.pieces[v][1], rnd, season);
        else deck(out, W.extras[v - W.pieces.length], rnd, season, rails);
        return out;
      },
    });
  };
  define('v2', SCENE_FPV_WALK.v2);
  define('v4', SCENE_FPV_WALK.v4);
})();

/* ---------- the views' own objects: framing, the clubhouse, moored dinghies ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = (v) => Math.round(v * 10) / 10;
  const rndOf = seed => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  /** A tapering limb along points as a filled outline. */
  const limb = (pts, w0, w1) => {
    const L = [], Rr = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
      const w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
      L.push([pts[i][0] - dy / m * w, pts[i][1] + dx / m * w]); Rr.push([pts[i][0] + dy / m * w, pts[i][1] - dx / m * w]);
    }
    return 'M' + L.concat(Rr.reverse()).map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z';
  };

  /* tree.fpv-alder-trunk: a near alder trunk rising up the left edge of the frame (anchor: the foot, bottom-left, screen units),
     leaning a little in, with ivy climbing it, a mossy root plate, one bough reaching over the top and leaf sprays hanging from
     it (alder: rounded leaves; spring fresh with catkins, autumn yellowing and thin, winter bare with cones and purple catkins). */
  sceneObjDefine({
    id: 'tree.fpv-alder-trunk', category: 'tree', size: [520, 1000], variants: 1, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 14 },
    palette: {
      base:   { bark: ['#2e2a24', '#423a30', '#5a5044', '#6e6a5a'], lichen: ['#8a9a78', '#a8b494'], moss: ['#4a6a2a', '#6a8a3a'], ivy: ['#1e3a1e', '#2e522a', '#4a6e3a'], leaf: ['#2e4a26', '#3e6030', '#5a7e3e', '#7a9c4e'], cone: ['#3a2a20', '#5a4030'], catkin: ['#6a4a4a', '#8a6458'] },
      spring: { leaf: ['#3e6a2a', '#5a8a36', '#7fae48', '#a4c860'], catkin: ['#8a6a3a', '#b08a48'], moss: ['#5a7e2e', '#7a9e3e'] },
      summer: { leaf: ['#24401f', '#335a28', '#4c7434', '#6e9446'] },
      autumn: { leaf: ['#4a5a26', '#7a7a2e', '#a88a36', '#c8a040'], moss: ['#5a6a2a', '#7a7a3a'] },
      winter: { bark: ['#2a2824', '#3e3830', '#56504a', '#6a6860'], moss: ['#4a5a30', '#5a6a3a'], ivy: ['#1a301c', '#283e24', '#3a5230'] },
    },
    parts: ['trunk', 'leaves'],
    anim: { sway: { part: 'leaves', pivot: [200, -900], deg: 1 } },
    reflect: false, shadow: false,
    tags: ['uk', 'alder', 'frame', 'carr', 'kit:temperate', 'role:frame', 'class:air'],
    credit: 'drawn for the Fleet Pond views: a common alder (Alnus glutinosa) in the carr, close to',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { trunk: [], leaves: [] };
      // the trunk: wide at the root plate, leaning in a little, out of the top of the frame
      const spine = [[40, 30], [52, -120], [70, -300], [88, -480], [104, -660], [116, -840], [124, -1020]];
      out.trunk.push({ f: '@bark.0', d: limb(spine, 150, 92) });
      out.trunk.push({ f: '@bark.1', d: limb(spine.map(([x, y]) => [x + 22, y]), 80, 46), op: 0.85 });
      out.trunk.push({ f: '@bark.2', d: limb(spine.map(([x, y]) => [x + 40, y]), 22, 12), op: 0.55 });
      // the bark's fissures (alder: dark, square-cracked) and lichen patches
      let fis = '';
      for (let i = 0; i < 46; i++) { const t = rnd(), y = 20 - t * 1030, x = 40 + t * 84 + (rnd() - 0.5) * (130 - t * 50); fis += `M${R(x)} ${R(y)}l${R((rnd() - 0.5) * 4)} ${R(-14 - rnd() * 30)}`; }
      out.trunk.push({ s: '@bark.0', w: 2.4, d: fis, op: 0.8, cap: 'round', detail: true });
      let lich = '';
      for (let i = 0; i < 14; i++) { const t = rnd(), y = -60 - t * 900, x = 30 + t * 84 + (rnd() - 0.6) * 70; lich += sceneD.ell(x, y, 6 + rnd() * 10, 3 + rnd() * 5); }
      out.trunk.push({ f: '@lichen.0', d: lich, op: 0.55, detail: true });
      // the root plate: moss over the roots, sprawling into the bottom edge
      out.trunk.push({ f: '@bark.0', d: 'M-40 40C-30 0 0 -10 20 -30L120 -40C150 -10 200 10 240 40Z' });
      out.trunk.push({ f: '@moss.0', d: 'M-40 40C-20 6 10 -4 30 -18C60 -6 90 -20 120 -26C150 -6 190 14 240 40Z', op: 0.9 });
      out.trunk.push({ f: '@moss.1', d: 'M-10 30C10 10 40 4 60 -4C90 4 120 0 150 6C170 16 190 24 200 32Z', op: 0.7, detail: true });
      // ivy up the trunk: a climbing stem, three-lobed leaves in clumps (evergreen)
      let ivyS = '', ivy0 = '', ivy1 = '', ivy2 = '';
      let x = 70, y = 0;
      for (let i = 0; i < 26; i++) {
        const nx = 60 + (i / 26) * 70 + (rnd() - 0.5) * 50, ny = y - 30 - rnd() * 14;
        ivyS += `M${R(x)} ${R(y)}Q${R((x + nx) / 2 + (rnd() - 0.5) * 20)} ${R((y + ny) / 2)} ${R(nx)} ${R(ny)}`;
        x = nx; y = ny;
        for (let j = 0; j < 3; j++) {
          const lx = x + (rnd() - 0.5) * 34, ly = y + (rnd() - 0.5) * 20, s = 7 + rnd() * 6, a = rnd() * Math.PI * 2;
          const d = sceneD.leaf(lx, ly, a, s * 1.4, s) + sceneD.leaf(lx, ly, a + 1.1, s, s * 0.7) + sceneD.leaf(lx, ly, a - 1.1, s, s * 0.7);
          const k = rnd(); if (k < 0.4) ivy0 += d; else if (k < 0.8) ivy1 += d; else ivy2 += d;
        }
      }
      out.trunk.push({ s: '@bark.1', w: 2, d: ivyS, op: 0.8, cap: 'round' }, { f: '@ivy.0', d: ivy0 }, { f: '@ivy.1', d: ivy1 }, { f: '@ivy.2', d: ivy2, op: 0.9 });
      // a bough reaching right over the top of the frame, its twigs and sprays
      const bough = [[110, -760], [190, -810], [290, -850], [390, -870], [470, -868], [540, -880]];
      out.trunk.push({ f: '@bark.0', d: limb(bough, 40, 8) });
      const sub = [[[240, -830], [280, -760], [300, -700]], [[360, -862], [420, -800], [440, -740]], [[180, -806], [200, -740]]];
      sub.forEach(s => out.trunk.push({ f: '@bark.1', d: limb(s, 10, 2) }));
      const anchors = [];
      for (const s of [bough.slice(1)].concat(sub)) for (let i = 0; i < s.length; i++) anchors.push(s[i]);
      for (let i = 0; i < 10; i++) { const t = rnd(); anchors.push([150 + t * 380, -820 - t * 50 + (rnd() - 0.5) * 30]); }
      for (const [ax, ay] of anchors) {
        const tx = ax + (rnd() - 0.4) * 40, ty = ay + 40 + rnd() * 60;
        out.trunk.push({ s: '@bark.2', w: 1.6, d: `M${R(ax)} ${R(ay)}Q${R((ax + tx) / 2 + 6)} ${R(ay + 6)} ${R(tx)} ${R(ty)}`, cap: 'round' });
        if (season !== 'summer' && rnd() < 0.5) {
          out.trunk.push({ f: '@cone.' + (rnd() < 0.5 ? 0 : 1), d: sceneD.ell(tx + 2, ty + 5, 3.4, 4.8) });
          if (season === 'winter' || season === 'spring') out.trunk.push({ s: '@catkin.' + (rnd() < 0.5 ? 0 : 1), w: 2.8, cap: 'round', d: `M${R(tx - 4)} ${R(ty)}q-2 10 1 19` });
        }
        if (season === 'winter') continue;
        const n = season === 'autumn' ? 6 : 11;
        for (let j = 0; j < n; j++) {
          const u = j / n, lx = ax + (tx - ax) * u + (rnd() - 0.5) * 22, ly = ay + (ty - ay) * u + (rnd() - 0.5) * 14 + 6;
          const a = Math.PI + (rnd() - 0.5) * 1.6, len = 15 + rnd() * 10, tone = j < n / 2 ? Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3);
          out.leaves.push({ f: '@leaf.' + tone, d: sceneD.leaf(lx, ly, a, len, len * 0.5) });
        }
      }
      return out;
    },
  });

  /* plant.fpv-willow-fronds: weeping willow fronds hanging into the top of the frame from a limb out of shot (anchor: top-left,
     screen units). Long whips of narrow leaves that sway; spring fresh yellow-green, summer green, autumn yellow and thinning,
     winter bare golden-yellow whips (the weeping willow's winter colour). */
  sceneObjDefine({
    id: 'plant.fpv-willow-fronds', category: 'plant', size: [760, 460], variants: 1, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 4 },
    palette: {
      base:   { twig: ['#6a5a38', '#8a7a48'], leaf: ['#4a6a2a', '#6a8a36', '#8aa848', '#a8c060'], bark: ['#3a3226', '#54483a'] },
      spring: { leaf: ['#7a9a2e', '#9ab83a', '#b8d050', '#d4e070'], twig: ['#8a8a3a', '#aaa848'] },
      summer: { leaf: ['#3e5e2a', '#557a32', '#6e9440', '#8aae52'] },
      autumn: { leaf: ['#8a8a2a', '#b0a032', '#d0b83e', '#e4cc5a'], twig: ['#8a7a3a', '#a8964a'] },
      winter: { twig: ['#b8962e', '#d4b040'] },
    },
    parts: ['limb', 'whips'],
    anim: { sway: { part: 'whips', pivot: [380, 0], deg: 1.6 } },
    reflect: false, shadow: false,
    tags: ['uk', 'willow', 'frame', 'kit:temperate', 'role:frame', 'class:air'],
    credit: 'drawn for the Fleet Pond views: weeping willow fronds',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { limb: [], whips: [] };
      out.limb.push({ f: '@bark.0', d: limb([[-40, -10], [120, 18], [280, 40], [420, 52], [560, 48], [700, 30]], 36, 8) });
      out.limb.push({ f: '@bark.1', d: limb([[-40, -14], [120, 14], [280, 36], [420, 48]], 12, 4), op: 0.7 });
      let wd = '';
      const leaves = ['', '', '', ''];
      for (let i = 0; i < 70; i++) {
        const t = rnd(), ax = -30 + t * 720, ay = 10 + Math.sin(t * Math.PI) * 44 - t * 10, len = 140 + rnd() * 300 * (1 - Math.abs(t - 0.4)), sw = (rnd() - 0.4) * 40;
        const ex = ax + sw, ey = ay + len;
        wd += `M${R(ax)} ${R(ay)}Q${R(ax + sw * 0.2)} ${R(ay + len * 0.5)} ${R(ex)} ${R(ey)}`;
        if (season === 'winter') continue;
        const nL = season === 'autumn' ? Math.round(len / 18) : Math.round(len / 9);
        for (let j = 0; j < nL; j++) {
          const u = 0.12 + 0.88 * j / nL, lx = ax + sw * u * u + (rnd() - 0.5) * 6, ly = ay + len * u;
          const a = Math.PI / 2 + (rnd() - 0.5) * 1.2 + (rnd() < 0.5 ? 0.5 : -0.5), L = 12 + rnd() * 8;
          leaves[Math.min(3, Math.floor(rnd() * 4))] += sceneD.leaf(lx, ly, a, L, L * 0.22);
        }
      }
      out.whips.push({ s: '@twig.' + (season === 'winter' ? 1 : 0), w: season === 'winter' ? 1.8 : 1.2, d: wd, cap: 'round' });
      leaves.forEach((d, i) => { if (d) out.whips.push({ f: '@leaf.' + i, d }); });
      return out;
    },
  });

  /* building.fpv-sailing-hut: the sailing club's clubhouse, a single-storey timber hut with a shallow pitched roof, a veranda on
     posts facing the water, the club board, a flagpole with the burgee (anchor: the middle of its front foot; faces the viewer
     side-on, the water to the left). Its windows light from dusk. */
  sceneObjDefine({
    id: 'building.fpv-sailing-hut', category: 'building', size: [420, 260], variants: 1, seasonal: true, flippable: true,
    real: { h: 7.5, l: 12, w: 6 },
    palette: {
      base: { board: ['#3e5a4e', '#2e463c', '#56766a'], trim: ['#e8e4d8', '#c8c2b2'], roof: ['#3a3a3e', '#56565c'], glass: ['#5a6a74', '#2a3238'], post: ['#e8e4d8'], flag: ['#c8302a', '#f4f2ec', '#1e3a6a'], deck: ['#7a6a54', '#5a4c3c'], window: '#33404a' },
      winter: { roof: ['#d8dcdc', '#b8bcbe'] },
    },
    night: { glow: { window: '#ffd690' }, on: 0.95 },
    parts: ['body', 'flag'],
    anim: { sway: { part: 'flag', pivot: [178, -244], deg: 6 } },
    shadow: { rx: 200, ry: 12, h: 140 }, reflect: true,
    tags: ['uk', 'sailing', 'clubhouse', 'lake', 'kit:temperate', 'kit:water', 'role:building', 'class:building'],
    credit: 'drawn for the Fleet Pond views: the sailing club hut',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', body = [], flag = [];
      // the hut: weatherboarded walls, the boards' lines, white trim, a shallow pitched roof with overhang
      body.push({ f: '@board.0', d: 'M-180 0V-120H150V0Z' });
      let bl = ''; for (let y = -112; y < 0; y += 9) bl += `M-180 ${y}H150`;
      body.push({ s: '@board.1', w: 1.4, d: bl, op: 0.7 });
      body.push({ f: '@board.2', d: 'M-180 -120H150V-112H-180Z', op: 0.6 });
      body.push({ f: '@roof.0', d: 'M-196 -118L-150 -170H120L166 -118Z' }, { f: '@roof.1', d: 'M-196 -118L-150 -170H-130L-176 -118Z', op: 0.7 });
      if (season === 'winter') body.push({ f: '#f4f6f6', d: 'M-192 -122L-150 -168H118L160 -122Z', op: 0.85 });
      body.push({ f: '@trim.0', d: 'M-198 -120H168V-114H-198Z' });
      // windows (lit after dusk) and the double doors to the veranda
      for (const x of [-160, -110, -60, 60, 110]) {
        body.push({ f: '@trim.0', d: `M${x - 3} -98h40v52h-40z` });
        body.push({ f: '@window', d: `M${x} -95h34v46h-34z`, glow: 'window' });
        body.push({ f: '@trim.1', d: `M${x + 16} -95h2v46h-2zM${x} -73h34v2h-34z` });
      }
      body.push({ f: '@trim.0', d: 'M-8 -104h56v104h-56z' }, { f: '@glass.1', d: 'M-4 -100h22v100h-22zM22 -100h22v100h-22z', glow: 'window' });
      // the club board over the doors
      body.push({ f: '@trim.0', d: 'M-50 -134h140v14h-140z' }, { f: '@board.1', d: 'M-44 -130h128v6h-128z', op: 0.6 });
      // the veranda: a deck on posts, a rail, steps down
      body.push({ f: '@deck.1', d: 'M-196 6H170V14H-196Z' }, { f: '@deck.0', d: 'M-196 0H170V6H-196Z' });
      for (const x of [-190, -100, -10, 80, 162]) body.push({ f: '@post.0', d: `M${x} -118h5v118h-5z` });
      body.push({ f: '@post.0', d: 'M-196 -38H170V-34H-196Z' });
      let bal = ''; for (let x = -192; x < 168; x += 12) bal += `M${x} -34V0`;
      body.push({ s: '@post.0', w: 1.6, d: bal, op: 0.85 });
      // the flagpole beside the hut and its burgee (the flag part sways)
      body.push({ f: '@post.0', d: 'M176 14h4v-262h-4z' }, { f: '@post.0', d: sceneD.circ(178, -250, 4) });
      flag.push({ f: '@flag.0', d: 'M180 -244L232 -232L180 -220Z' }, { f: '@flag.1', d: 'M180 -238L206 -232L180 -226Z' });
      return { body, flag };
    },
  });

  /* boat.fpv-dinghy-moored: a sailing dinghy with its sails down, moored on the water or on its launching trolley ashore
     (v0 white hull, blue cover; v1 red hull, grey cover; v2 a varnished hull on its trolley, mast up; v3 a white hull, mast
     down, upturned on the hard). Anchor: the waterline (v0, v1) or the ground (v2, v3) at the middle of the hull, faces right. */
  sceneObjDefine({
    id: 'boat.fpv-dinghy-moored', category: 'boat', size: [170, 250], variants: 4, seasonal: false, flippable: true,
    real: { h: 7, l: 4.2, w: 1.6 },
    palette: { base: { hull: ['#f2f0ea', '#b8322a', '#b8834e', '#e8e6e0'], hullD: ['#c4c2bc', '#86241e', '#8a5e36', '#bcbab4'], cover: ['#2a4a78', '#6a7078', '#2a4a78', '#6a7078'], spar: '#c8ccd0', rope: '#e8e2d2', boot: '#1e2a3a', trolley: ['#7a7e84', '#3a3e44'], burgee: '#c8302a', furl: '#ece8de', wake: '#eefaf6' } },
    anim: { paddle: { dy: 1, deg: 1.6, period: 3.6 } },
    reflect: true, float: { level: 0, beam: 0.8 },
    tags: ['uk', 'sailing', 'dinghy', 'moored', 'lake', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'drawn for the Fleet Pond views: club dinghies, sails down',
    build(v) {
      const body = [], ashore = v >= 2, lift = ashore ? -26 : 0;
      if (v === 3) {
        // upturned on the hard: the hull bottom up, the mast and boom alongside
        body.push({ f: '@hull.3', d: 'M-80 -4Q-76 -34 -40 -38H70Q84 -30 82 -4Z' }, { f: '@hullD.3', d: 'M-80 -4Q-76 -16 -60 -18H76Q82 -12 82 -4Z', op: 0.9 });
        body.push({ s: '@spar', w: 3, d: 'M-84 2H96' }, { f: '@trolley.1', d: 'M-60 0h8v-6h-8zM40 0h8v-6h-8z' });
        return { body };
      }
      const H = v % 4;
      if (ashore) {
        // the trolley: a frame, two wheels, the handle
        body.push({ s: '@trolley.0', w: 3, d: 'M-50 -22L-30 -6H40L58 -22M-30 -6L-70 -2' }, { f: '@trolley.1', d: sceneD.circ(-24, -6, 7) + sceneD.circ(36, -6, 7) });
      }
      // the hull, the boot top stripe, the cover over the cockpit, mast and boom with the sail furled on it
      body.push({ f: `@hull.${H}`, d: `M-74 ${lift - 14}Q-70 ${lift + 2} -40 ${lift + 2}H54Q76 ${lift - 2} 80 ${lift - 16}Z` });
      body.push({ f: `@hullD.${H}`, d: `M-72 ${lift - 6}Q-66 ${lift + 2} -40 ${lift + 2}H54Q72 ${lift - 1} 78 ${lift - 8}Z`, op: 0.8 });
      body.push({ f: '@boot', d: `M-74 ${lift - 14}H80L79 ${lift - 11}H-73Z`, op: 0.85 });
      // (round 2) the boom is stowed down on the cover, the sail bagged in the cockpit: no furled sail held up on the boom (it
      // read, with its reflection, as a lozenge floating apart from the hull); the cover is a low tent over the boom
      body.push({ f: `@cover.${H}`, d: `M-60 ${lift - 14}Q-52 ${lift - 26} -20 ${lift - 29}L10 ${lift - 31}Q48 ${lift - 26} 64 ${lift - 14}Z` });
      body.push({ s: '@hullD.' + H, w: 1.2, op: 0.5, d: `M-40 ${lift - 15}Q-30 ${lift - 22} -22 ${lift - 27}M30 ${lift - 15}Q34 ${lift - 22} 40 ${lift - 26}`, detail: true });
      body.push({ s: '@spar', w: 3, d: `M8 ${lift - 26}V${lift - 228}` }, { s: '@spar', w: 2.6, d: `M8 ${lift - 32}L-58 ${lift - 26}` });
      body.push({ s: '@rope', w: 0.8, op: 0.8, d: `M8 ${lift - 220}L76 ${lift - 16}M8 ${lift - 220}L-70 ${lift - 14}`, detail: true });
      body.push({ f: '@burgee', d: `M9 ${lift - 228}l12 3l-12 3z` });
      if (!ashore) {
        // the hull sits IN the water: a dark contact line along the waterline, a little ripple off the bow and stern
        body.push({ f: '#1c2a32', op: 0.35, d: sceneD.ell(3, 1.5, 80, 2.6) });
        body.push({ s: '@wake', w: 1.2, op: 0.35, d: 'M-92 4h18M80 4h16', detail: true });
      }
      return { body };
    },
  });
})();

/* ---------- (round 2) v1's landmark: the fallen pine in the shallows off Sandy Bay, and the cormorants that use it ----------
   tree.fpv-fallen-pine: a Scots pine blown down off the top of the beach, lying out across the shallows at one depth (it fell
   straight out from the shore, so it lies across the view): the root plate standing on the sand at the left, the trunk running
   right down into the water, its bark half gone to silver, dead branch stubs sticking up and the last of the crown's twigs
   poking out of the water at the far end; three cormorants on it, one holding its wings out to dry, one upright on a stub, one
   hunched near the end (cormorants roost and dry on Fleet Pond's dead wood all year).
   Units: 100 to the metre; anchor (0, 0): the ground under the trunk's middle at the beach's level; the water surface 12 below
   (the pond 0.12 m under the sand), so the water pass mirrors it about its own waterline. The birds are part of the drawing
   (their reflections come with it). */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = (v) => Math.round(v * 10) / 10, WL = 12;
  const pts = (P) => 'M' + P.map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z';
  /** The trunk: u 0 at the root (x -280), 1 at the top (x 280); its axis height and radius in units. */
  const X = (u) => -280 + 560 * u, axis = (u) => -(24 - 32 * u), rad = (u) => 25 - 16 * u;
  /** A dead branch as a tapering quad: from (x, y) at angle a (radians, 0 = right, -pi/2 = up), length L, width w. */
  const stub = (x, y, a, L, w) => {
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, nx = -Math.sin(a), ny = Math.cos(a);
    return pts([[x + nx * w / 2, y + ny * w / 2], [ex + nx * w * 0.15, ey + ny * w * 0.15], [ex - nx * w * 0.15, ey - ny * w * 0.15], [x - nx * w / 2, y - ny * w / 2]]);
  };
  /** A cormorant (feet at x, y; facing right unless fl -1): pose 0 wings held out, 1 upright, 2 hunched. */
  const cormorant = (out, x, y, pose, fl) => {
    const P = (a) => a.map(([px, py]) => [x + fl * px, y + py]);
    if (pose === 0) {
      // the wings out to dry: two broad ragged wings either side of the upright body
      out.push({ f: '@bird.1', d: pts(P([[-2, -44], [-16, -56], [-34, -58], [-46, -50], [-50, -36], [-44, -38], [-46, -28], [-38, -31], [-38, -22], [-30, -27], [-8, -30]])) });
      out.push({ f: '@bird.1', d: pts(P([[4, -44], [18, -57], [36, -60], [48, -52], [52, -38], [46, -40], [48, -29], [40, -32], [40, -23], [32, -28], [8, -30]])) });
      out.push({ s: '@bird.2', w: 1.2, op: 0.6, d: `M${R(x - fl * 30)} ${R(y - 52)}l${R(-fl * 10)} 16M${R(x - fl * 20)} ${R(y - 54)}l${R(-fl * 6)} 22M${R(x + fl * 32)} ${R(y - 54)}l${R(fl * 10)} 16M${R(x + fl * 22)} ${R(y - 55)}l${R(fl * 6)} 22`, detail: true });
    }
    const hunch = pose === 2 ? 8 : 0;
    // the tail braced down on the perch, the body, the neck in its S and the head, the hooked bill, the white cheek and throat
    out.push({ f: '@bird.0', d: pts(P([[-4, -10], [-14, 2], [-10, 3], [2, -8]])) });
    out.push({ f: '@bird.0', d: pts(P([[-7, -6], [-9, -24], [-6, -40 + hunch], [2, -46 + hunch], [9, -40 + hunch], [9, -22], [5, -6], [0, -2]])) });
    out.push({ f: '@bird.2', d: pts(P([[2, -44 + hunch], [8, -38 + hunch], [8, -24], [5, -30], [3, -40 + hunch]])), op: 0.5 });
    const nb = pose === 2 ? [[2, -44], [6, -46], [8, -42], [3, -38]] : [[2, -44], [5, -54], [3, -60], [6, -66], [12, -66], [11, -60], [9, -54], [8, -44]];
    out.push({ f: '@bird.0', d: pts(P(nb.map(([a, b]) => [a, b + hunch]))) });
    const hx = pose === 2 ? 8 : 9, hy = (pose === 2 ? -46 : -66) + hunch;
    out.push({ f: '@bird.0', d: sceneD.ell(x + fl * hx, y + hy, 5.4, 4.6) });
    out.push({ f: '@bill', d: pts(P([[hx + 3, hy - 1.5], [hx + 15, hy - 0.5], [hx + 16, hy + 1.8], [hx + 14, hy + 0.6], [hx + 3, hy + 1.6]])) });
    out.push({ f: '@face', d: sceneD.ell(x + fl * (hx + 1.5), y + hy + 2.6, 3.4, 2.2), op: 0.95 });
    out.push({ f: '@gular', d: sceneD.ell(x + fl * (hx + 4.5), y + hy + 0.6, 1.8, 1.4) });
    out.push({ f: '#e8f0e0', d: sceneD.circ(x + fl * (hx + 2.2), y + hy - 1.2, 0.9) });
    // the feet gripping the wood
    out.push({ s: '@bird.0', w: 2.2, d: `M${R(x - fl * 2)} ${R(y - 6)}l${R(-fl * 2)} 6M${R(x + fl * 3)} ${R(y - 6)}l${R(fl * 2)} 6`, cap: 'round' });
  };
  sceneObjDefine({
    id: 'tree.fpv-fallen-pine', category: 'tree', size: [720, 200], box: [-340, -170, 380, 22], variants: 1, seasonal: true, flippable: false,
    real: { h: 1.7, l: 6.2, w: 1.6 },
    palette: {
      base: { bark: ['#4e4036', '#6e5a48', '#8e7a66'], silver: ['#a8a296', '#8a857a', '#c4beb2'], orange: ['#a8603a', '#c47a4a'], root: ['#5a4632', '#3a2e22', '#7a6448'], sand: ['#c8b48a', '#a8946c'], algae: ['#3e4a2a', '#56623a'], twig: ['#6e665a', '#4e483e'], ripple: '#e8f2f4',
        bird: ['#1a1b1c', '#26282a', '#5a5238'], bill: '#8a7a5a', face: '#ece6d6', gular: '#d8a440' },
      winter: { silver: ['#b4aea4', '#948e84', '#d4d0c8'], sand: ['#c4b89c', '#a49a80'] },
    },
    parts: ['wood', 'birds'],
    reflect: true, shadow: false,
    tags: ['uk', 'pond', 'dead-wood', 'fallen-tree', 'perch', 'cormorant', 'landmark', 'kit:water', 'kit:birds', 'class:water', 'role:landmark'],
    credit: 'drawn for the Fleet Pond views: a fallen pine in the shallows of Sandy Bay, with cormorants (Phalacrocorax carbo)',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', wood = [], birds = [];
      // the root plate on the sand: the torn-up disc of roots and peaty sand, seen nearly edge-on (the trunk runs across the
      // view), so a lumpy mound taller than wide, sand and peat clinging to it, broken roots hanging off its top and sides
      const plate = [];
      for (let i = 0; i <= 18; i++) {
        const t = i / 18, a = Math.PI * (1 + t), w = 34 + 10 * Math.sin(t * Math.PI), rr = 0.82 + rnd() * 0.3;
        plate.push([-296 + Math.cos(a) * w * rr * (t > 0.5 ? 1.1 : 1), 6 + Math.sin(a) * 92 * rr * (0.7 + 0.3 * Math.sin(t * Math.PI))]);
      }
      wood.push({ f: '@root.1', d: pts(plate) });
      wood.push({ f: '@root.0', d: pts(plate.map(([x, y]) => [-296 + (x + 296) * 0.78 + 5, 6 + (y - 6) * 0.86])), op: 0.9 });
      wood.push({ f: '@sand.1', d: pts([[-318, 4], [-314, -22], [-300, -40], [-286, -30], [-276, -44], [-266, -16], [-262, 4]]), op: 0.85 });
      wood.push({ f: '@sand.0', d: pts([[-310, 4], [-304, -14], [-292, -22], [-280, -12], [-270, 4]]), op: 0.7 });
      wood.push({ f: '@sand.0', d: 'M-346 9Q-326 -6 -300 -4Q-268 -8 -240 9Z' });
      let rt = '';
      for (let i = 0; i < 11; i++) {
        const t = i / 10, x0 = -322 + t * 52 + (rnd() - 0.5) * 6, y0 = -62 - Math.sin(t * Math.PI) * 18 + rnd() * 8, sx = (t - 0.5) * 34 + (rnd() - 0.5) * 10, L = 18 + rnd() * 22;
        rt += `M${R(x0)} ${R(y0)}q${R(sx * 0.6)} ${R(-L * 0.4)} ${R(sx)} ${R(-L * 0.2 + 10)}`;
      }
      for (let i = 0; i < 5; i++) { const side = i % 2 ? 1 : -1, y0 = -50 + i * 9; rt += `M${R(-296 + side * 34)} ${R(y0)}q${R(side * 12)} ${R(2)} ${R(side * 16)} ${R(16 + rnd() * 10)}`; }
      wood.push({ s: '@root.2', w: 3.6, d: rt, cap: 'round' });
      wood.push({ s: '@root.1', w: 1.6, d: rt, cap: 'round', op: 0.5, detail: true });
      wood.push({ f: '@silver.1', d: sceneD.ell(-288, -18, 4.4, 3.2) + sceneD.ell(-304, -50, 3.4, 2.6) + sceneD.ell(-282, -66, 2.8, 2.2), op: 0.9, detail: true });
      // the trunk: its top line and its underside (cut at the water: the rest is under it)
      const n = 28, top = [], bot = [];
      for (let i = 0; i <= n; i++) { const u = i / n, x = X(u) + (rnd() - 0.5) * 2, bump = (rnd() - 0.5) * 2.4 + (u < 0.1 ? (0.1 - u) * 60 : 0); top.push([x, axis(u) - rad(u) - bump]); bot.push([x, Math.min(WL, axis(u) + rad(u))]); }
      wood.push({ f: '@bark.0', d: pts(top.concat(bot.slice().reverse())) });
      // the round of the trunk: dark below, the bark's brown, then silver where the bark has gone, the light along the top
      const band = (k0, k1) => { const a = [], b = []; for (let i = 0; i <= n; i++) { const u = i / n; a.push([top[i][0], axis(u) - rad(u) * k0 - (top[i][1] - (axis(u) - rad(u))) * (k0 > 0.9 ? 1 : 0)]); b.push([top[i][0], Math.min(WL, axis(u) - rad(u) * k1)]); } return pts(a.concat(b.reverse())); };
      wood.push({ f: '@bark.1', d: band(0.98, -0.45), op: 0.9 });
      wood.push({ f: '@silver.1', d: band(0.95, 0.05), op: 0.85 });
      wood.push({ f: '@silver.0', d: band(0.9, 0.5), op: 0.9 });
      // knots where branches broke off, dark
      let kn = '';
      for (let i = 0; i < 7; i++) { const u = 0.15 + rnd() * 0.75; kn += sceneD.ell(X(u), axis(u) - rad(u) * (rnd() * 0.5), 3 + rnd() * 3, 2 + rnd() * 2); }
      wood.push({ f: '@bark.0', d: kn, op: 0.8 });
      let pl = '';
      for (let i = 0; i < 18; i++) { const u = 0.35 + rnd() * 0.6, x = X(u), y = axis(u) - rad(u) * (0.2 + rnd() * 0.6), w = 8 + rnd() * 14; pl += `M${R(x)} ${R(y)}l${R(w)} ${R(-1 - rnd())}l-2 ${R(4 + rnd() * 3)}l${R(-w + 2)} 1z`; }
      wood.push({ f: '@orange.0', d: pl, op: 0.75 });
      // the bark's long cracks, the dark wet band at the water and the algae on it
      let cr = '';
      for (let i = 0; i < 16; i++) { const u = rnd() * 0.95, x = X(u), y = axis(u) - rad(u) * (rnd() * 0.8); cr += `M${R(x)} ${R(y)}l${R(18 + rnd() * 30)} ${R((rnd() - 0.5) * 2)}`; }
      wood.push({ s: '@bark.0', w: 1.6, d: cr, op: 0.7, detail: true });
      wood.push({ f: '@silver.1', d: pts(top.concat(top.slice().reverse().map(([x, y]) => [x, y + 3]))), op: 0.5 });
      const wet = [];
      for (let i = 0; i <= n; i++) { const u = i / n, b = Math.min(WL, axis(u) + rad(u)); wet.push([X(u), Math.max(axis(u) - rad(u), b - 7)]); }
      wood.push({ f: '@algae.0', d: pts(wet.concat(bot.slice().reverse())), op: 0.85 });
      // the dead branches: stubs angling up (some broken short); the crown's last twigs out of the water at the end
      const stubs = [[0.18, -1.9, 46, 7], [0.3, -1.25, 70, 7], [0.42, -1.75, 92, 6.4], [0.47, -2.5, 38, 5], [0.58, -1.1, 54, 5.4], [0.7, -2.0, 62, 5], [0.8, -1.5, 40, 4], [0.86, -2.4, 52, 3.6]];
      for (const [u, a, L, w] of stubs) {
        const x = X(u), y = axis(u) - rad(u) * 0.7;
        wood.push({ f: '@silver.' + (rnd() < 0.5 ? 1 : 0), d: stub(x, y, a, L, w) });
        wood.push({ f: '@silver.2', d: stub(x - 1, y, a, L * 0.9, w * 0.35), op: 0.6, detail: true });
        if (L > 50) { const fx = x + Math.cos(a) * L * 0.6, fy = y + Math.sin(a) * L * 0.6; wood.push({ f: '@silver.1', d: stub(fx, fy, a + 0.7, L * 0.35, w * 0.45) }); }
      }
      let tw = '';
      for (let i = 0; i < 16; i++) { const x = 230 + rnd() * 120, h = 10 + rnd() * 40, lean = (rnd() - 0.3) * 20; tw += `M${R(x)} ${WL}q${R(lean * 0.4)} ${R(-h * 0.6)} ${R(lean)} ${R(-h)}`; if (rnd() < 0.6) tw += `M${R(x + lean * 0.5)} ${R(WL - h * 0.5)}l${R(6 + rnd() * 6)} ${R(-6 - rnd() * 8)}`; }
      wood.push({ s: '@twig.0', w: 2, d: tw, cap: 'round' });
      if (season === 'winter') wood.push({ f: '#f2f4f4', d: pts(top.concat(top.slice().reverse().map(([x, y]) => [x, y + 2.4]))), op: 0.7 });
      // where it meets the water: light ripple lines along it and round the twigs
      let rp = '';
      for (let i = 0; i < 12; i++) { const x = -240 + i * 52 + rnd() * 20; rp += `M${R(x)} ${WL + 1.5}h${R(18 + rnd() * 18)}M${R(x + 10)} ${WL + 5}h${R(10 + rnd() * 14)}`; }
      wood.push({ s: '@ripple', w: 1.2, d: rp, op: 0.4, detail: true });
      // the cormorants: drying its wings on the trunk, upright on the tall stub, hunched near the end
      cormorant(birds, X(0.6), axis(0.6) - rad(0.6) + 2, 0, 1);
      const sa = stubs[2], sx = X(sa[0]) + Math.cos(sa[1]) * sa[2] * 0.96, sy = axis(sa[0]) - rad(sa[0]) * 0.7 + Math.sin(sa[1]) * sa[2] * 0.96;
      cormorant(birds, sx, sy + 1, 1, -1);
      cormorant(birds, X(0.83), axis(0.83) - rad(0.83) + 2, 2, 1);
      return { wood, birds };
    },
  });
})();

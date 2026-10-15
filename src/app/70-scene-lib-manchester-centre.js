/* ============================================================
   SCENE LIBRARY: manchester-centre (docs/dev/SCENE_ENGINE_V2.md), the ground plans and the in-perspective landmarks of the
   four Manchester civic-quarter views (71-scene-uk-north-manchester-centre.js). PURE: data and sceneObjDefine calls only.

   Manchester's civic heart: Albert Square and St Peter's Square, a hundred metres apart, and Deansgate one block west.
     v1  Albert Square from its south-west corner, looking north-east at Waterhouse's Town Hall front, the clock tower
         and the Albert Memorial; Princess Street leads away on the left (the Christmas markets fill the square in Dec)
     v2  St Peter's Square from the south-east, looking north-west: the Central Library rotunda and its portico, the
         Town Hall Extension behind, the Cenotaph and St Peter's Cross, Metrolink trams at the four-platform stop
     v3  St Peter's Square from the library steps, looking south-west over the tram stop to the Midland Hotel on Peter
         Street, One St Peter's Square on the left, trams running out along Lower Mosley Street
     v4  Deansgate at the John Rylands Library, from the east pavement looking west across the road: the red sandstone
         Gothic front, buses, cyclists, the lunchtime crowd
   Like the Fleet Pond and canal views, the landmarks are drawn FROM the camera: footprints in ground metres (x right of the
   view axis, d forward, h up), every wall, roof, window and pinnacle projected through the view's own camera, so the
   buildings sit in true perspective (no elevation sprites stuck on at an angle). Every object is a pinned pixel placement
   anchored at its nearest ground point, so the depth sort is right; shading is by face normal (lit from the left and the
   front); lit windows are glow shapes (the engine lights a share of them after dusk). No lettering, no logos, no arms.
   ============================================================ */
const SCENE_MCR = (function () {
  const R1 = v => Math.round(v * 10) / 10;
  const rnd = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const hx = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join(''); };
  // the key light: from the left, a little from the front, high (all faces graded by it; the engine adds the real sun's mood)
  const LD = (() => { const v = [-0.62, -0.42, 0.66], m = Math.hypot(...v); return v.map(c => c / m); })();
  const shadeBy = (col, n) => { const k = n[0] * LD[0] + n[1] * LD[1] + n[2] * LD[2]; return k >= 0 ? mix(col, '#fff6e4', 0.16 * k) : mix(col, '#1a1c24', 0.42 * -k); };
  function cam(c) {
    const f = 800 / Math.tan(c.fov * Math.PI / 360), x0 = c.x0 || 800;
    return { c, f, p: (x, d, h) => [x0 + f * x / d, c.horizon + f * (c.eye - (h || 0)) / d], px: (m, d) => f * m / d };
  }
  /** A pen: shapes relative to the screen anchor o, through camera C. */
  function pen(C, o) {
    const S = [], E = C.c.eye;
    const P = (x, d, h) => { const q = C.p(x, d, h); return [q[0] - o[0], q[1] - o[1]]; };
    const ps = q => R1(q[0]) + ' ' + R1(q[1]);
    // every polygon is clipped to the frame (plus a margin), so a building running off the screen makes no huge sprite
    const X0 = -40 - o[0], X1 = 1640 - o[0], Y0 = -40 - o[1], Y1 = 940 - o[1];
    const clipEdge = (pts, inside, cut) => { const out = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length], a = inside(p), b = inside(q); if (a) out.push(p); if (a !== b) out.push(cut(p, q)); } return out; };
    const lerpX = (x) => (p, q) => { const t = (x - p[0]) / (q[0] - p[0]); return [x, p[1] + (q[1] - p[1]) * t]; };
    const lerpY = (y) => (p, q) => { const t = (y - p[1]) / (q[1] - p[1]); return [p[0] + (q[0] - p[0]) * t, y]; };
    const clipFrame = (pts) => {
      let P2 = pts;
      P2 = clipEdge(P2, p => p[0] >= X0, lerpX(X0)); if (P2.length < 3) return null;
      P2 = clipEdge(P2, p => p[0] <= X1, lerpX(X1)); if (P2.length < 3) return null;
      P2 = clipEdge(P2, p => p[1] >= Y0, lerpY(Y0)); if (P2.length < 3) return null;
      P2 = clipEdge(P2, p => p[1] <= Y1, lerpY(Y1)); return P2.length < 3 ? null : P2;
    };
    const path = (pts) => { const c = clipFrame(pts); return c ? 'M' + c.map(ps).join('L') + 'Z' : ''; };
    const add = (f, d, x) => { if (d) S.push(Object.assign({ f, d }, x || {})); };
    /** A line segment clipped to the frame (Liang-Barsky): 'M..L..' or ''. */
    const seg = (p, q) => {
      let t0 = 0, t1 = 1; const dx = q[0] - p[0], dy = q[1] - p[1];
      for (const [pp, qq] of [[-dx, p[0] - X0], [dx, X1 - p[0]], [-dy, p[1] - Y0], [dy, Y1 - p[1]]]) {
        if (pp === 0) { if (qq < 0) return ''; continue; }
        const r = qq / pp; if (pp < 0) { if (r > t1) return ''; if (r > t0) t0 = r; } else { if (r < t0) return ''; if (r < t1) t1 = r; }
      }
      return 'M' + ps([p[0] + dx * t0, p[1] + dy * t0]) + 'L' + ps([p[0] + dx * t1, p[1] + dy * t1]);
    };
    const poly3 = (pts, f, x) => add(f, path(pts.map(p => P(p[0], p[1], p[2]))), x);
    /** the normal of a 3D polygon ([x, d, h]) turned away from the interior point c; visible from the eye? */
    const face = (pts, c) => {
      const a = pts[0], b = pts[1], e = pts[2];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const m = Math.hypot(...n) || 1; n = n.map(q => q / m);
      const mid = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
      if (c && (n[0] * (mid[0] - c[0]) + n[1] * (mid[1] - c[1]) + n[2] * (mid[2] - c[2])) < 0) n = n.map(q => -q);
      const vis = n[0] * -mid[0] + n[1] * -mid[1] + n[2] * (E - mid[2]) > 0;
      return { n, vis, mid };
    };
    /** A wall plane on the ground edge a -> b (listed left to right as seen, so its normal faces the eye). */
    const wall = (a, b) => {
      const ex = b[0] - a[0], ed = b[1] - a[1], L = Math.hypot(ex, ed) || 1, u = [ex / L, ed / L], n = [u[1], -u[0]];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], vis = n[0] * -mid[0] + n[1] * -mid[1] > 0;
      const at = (s, z, off) => [a[0] + u[0] * s + n[0] * (off || 0), a[1] + u[1] * s + n[1] * (off || 0), z];
      const scr = (s, z, off) => { const w = at(s, z, off); return P(w[0], w[1], w[2]); };
      const dAt = s => a[1] + u[1] * s;
      return { a, b, L, u, n, vis, at, scr, dAt, n3: [n[0], n[1], 0], px: (m, s) => C.f * m / Math.max(1, dAt(s == null ? L / 2 : s)) };
    };
    const quad = (W, s0, z0, s1, z1, f, off, x) => add(f, path([W.scr(s0, z0, off), W.scr(s1, z0, off), W.scr(s1, z1, off), W.scr(s0, z1, off)]), x);
    /** An arched opening on a wall: kind 'point' (lancet), 'round', 'seg', 'flat', 'tudor'; z1 = the apex. */
    const archPts = (W, s0, s1, z0, z1, kind, off) => {
      const w = s1 - s0, c = (s0 + s1) / 2, out = [W.scr(s0, z0, off)];
      const spring = kind === 'flat' ? z1 : kind === 'round' ? z1 - w / 2 : kind === 'seg' ? z1 - w * 0.18 : kind === 'tudor' ? z1 - w * 0.3 : z1 - w * 0.75;
      out.push(W.scr(s0, spring, off));
      if (kind !== 'flat') {
        const N = W.px(w) > 14 ? 8 : 4;
        for (let i = 1; i < N; i++) {
          const t = i / N;
          let s, z;
          if (kind === 'round') { const a = Math.PI * (1 - t); s = c + Math.cos(a) * w / 2; z = spring + Math.sin(a) * w / 2; }
          else if (kind === 'seg' || kind === 'tudor') { s = s0 + w * t; z = spring + (z1 - spring) * Math.sin(Math.PI * t); }
          else { const a = t < 0.5 ? t * 2 : (1 - t) * 2; s = s0 + w * t; z = spring + (z1 - spring) * Math.sin(a * Math.PI / 2); }
          out.push(W.scr(s, z, off));
        }
      }
      out.push(W.scr(s1, spring, off), W.scr(s1, z0, off));
      return out;
    };
    const arch = (W, s0, s1, z0, z1, kind, f, off, x) => add(f, path(archPts(W, s0, s1, z0, z1, kind, off)), x);
    /** A prism on a convex footprint (CCW, [x, d]) from h0 to h1: the faces that look at the eye, shaded; returns them. */
    const prism = (foot, h0, h1, col, x) => {
      const c = [foot.reduce((s, p) => s + p[0], 0) / foot.length, foot.reduce((s, p) => s + p[1], 0) / foot.length, (h0 + h1) / 2], out = [];
      for (let i = 0; i < foot.length; i++) {
        const a = foot[i], b = foot[(i + 1) % foot.length], pts = [[a[0], a[1], h0], [b[0], b[1], h0], [b[0], b[1], h1], [a[0], a[1], h1]];
        const F = face(pts, c);
        if (F.vis) { poly3(pts, shadeBy(col, F.n), x); out.push({ a, b, n: F.n }); }
      }
      if (h1 < E) poly3(foot.map(p => [p[0], p[1], h1]), shadeBy(col, [0, 0, 1]), x);
      return out;
    };
    /** A pyramid (or a spire) on a convex footprint at h0 to an apex [x, d, h]: the faces that look at the eye. */
    const pyramid = (foot, h0, apex, col, x) => {
      const c = [apex[0], apex[1], h0 + (apex[2] - h0) * 0.25];
      for (let i = 0; i < foot.length; i++) {
        const a = foot[i], b = foot[(i + 1) % foot.length], pts = [[a[0], a[1], h0], [b[0], b[1], h0], apex];
        const F = face(pts, c);
        if (F.vis) poly3(pts, shadeBy(col, F.n), x);
      }
    };
    /** A slim pinnacle (a shaft and a crocketed spirelet) at ground point (x, d) from h0 to h1, w metres wide (screen-built). */
    const pinnacle = (x, d, h0, h1, w, col, crockets) => {
      const b = P(x, d, h0), t = P(x, d, h1), hw = Math.max(0.5, C.f * w / d / 2), sh = (b[1] - t[1]) * 0.42;
      add(shadeBy(col, [-0.6, -0.6, 0]), `M${R1(b[0] - hw)} ${R1(b[1])}L${R1(b[0] - hw)} ${R1(b[1] - sh)}L${R1(b[0])} ${R1(t[1])}L${R1(b[0] + hw)} ${R1(b[1] - sh)}L${R1(b[0] + hw)} ${R1(b[1])}Z`);
      add(shadeBy(col, [0.6, -0.6, 0]), `M${R1(b[0])} ${R1(b[1])}L${R1(b[0])} ${R1(t[1])}L${R1(b[0] + hw)} ${R1(b[1] - sh)}L${R1(b[0] + hw)} ${R1(b[1])}Z`, { op: 0.8 });
      if (crockets && hw > 1.6) {
        let dd = '';
        for (let i = 1; i < 4; i++) { const y = b[1] - sh - (b[1] - sh - t[1]) * i / 4, k = hw * (1 - i / 4) + 0.6; dd += `M${R1(b[0] - k - 0.8)} ${R1(y)}l${R1(0.8)} ${R1(-1.2)}M${R1(b[0] + k + 0.8)} ${R1(y)}l${R1(-0.8)} ${R1(-1.2)}`; }
        add(null, dd, { s: mix(col, '#ffffff', 0.2), w: 0.7, detail: true });
      }
    };
    return { S, P, ps, path, seg, add, poly3, face, wall, quad, arch, archPts, prism, pyramid, pinnacle, f: C.f, eye: E, C };
  }
  /** Windows of one storey band on wall W in n bays: each bay a pair of lights (or one), with hood and mullion; glass in 3
   *  random groups (each a glow shape), the reveals dark. o: { s0, s1, bays, z0, z1, kind, lights, glass, frame, rnd, gap } */
  function windows(G, W, o) {
    const r = o.rnd, bays = o.bays, bw = (o.s1 - o.s0) / bays, groups = ['', '', ''], frames = [], tracery = [];
    const kind = o.kind || 'point', lights = o.lights || 2, gap = o.gap == null ? 0.32 : o.gap;
    for (let i = 0; i < bays; i++) {
      if (o.skip && o.skip(i)) continue;
      const c = o.s0 + bw * (i + 0.5), ww = Math.min(bw * (o.fill || 0.56), o.maxW || 4), s0 = c - ww / 2, s1 = c + ww / 2;
      const px = W.px(ww, c);
      if (px < 2.4) { groups[Math.floor(r() * 3)] += G.path([W.scr(s0, o.z0), W.scr(s1, o.z0), W.scr(s1, o.z1), W.scr(s0, o.z1)]); continue; }
      // the reveal (a dark frame round the opening) and the hood mould
      frames.push(G.path(G.archPts(W, s0 - 0.18, s1 + 0.18, o.z0 - 0.15, o.z1 + 0.22, kind)));
      if (lights > 1 && px > 7) {
        const lw = (ww - gap * (lights - 1)) / lights;
        for (let j = 0; j < lights; j++) {
          const a = s0 + j * (lw + gap), top = kind === 'point' ? o.z1 - (o.z1 - o.z0) * 0.12 : o.z1 - (kind === 'flat' ? 0 : 0.1);
          groups[Math.floor(r() * 3)] += G.path(G.archPts(W, a, a + lw, o.z0, top, kind === 'flat' ? 'flat' : kind === 'round' ? 'round' : 'point'));
        }
        if (px > 16 && kind === 'point') { const tc = W.scr(c, o.z1 - ww * 0.28); tracery.push(`M${R1(tc[0] - W.px(ww * 0.13, c))} ${R1(tc[1])}a${R1(W.px(ww * 0.13, c))} ${R1(W.px(ww * 0.13, c))} 0 1 0 0.1 0`); }
        if (o.transom && px > 9) { const zt = o.z0 + (o.z1 - o.z0) * o.transom; tracery.push(G.seg(W.scr(s0, zt), W.scr(s1, zt))); }
      } else groups[Math.floor(r() * 3)] += G.path(G.archPts(W, s0, s1, o.z0, o.z1, kind));
    }
    if (frames.length) G.add(o.frame, frames.join(''), { detail: true });
    groups.forEach(d => G.add(o.glass, d, { glow: 'window' }));
    if (tracery.length) G.add(null, tracery.join(''), { s: o.frame, w: 0.9, detail: true });
    // a sill line under the band
    if (W.px(1) > 2) G.add(o.trim, G.path([W.scr(o.s0, o.z0 - 0.35, 0.08), W.scr(o.s1, o.z0 - 0.35, 0.08), W.scr(o.s1, o.z0 - 0.1, 0.08), W.scr(o.s0, o.z0 - 0.1, 0.08)]), { detail: true });
  }
  /** Horizontal bands (string courses) on a wall at heights zs, t metres deep. */
  function bands(G, W, s0, s1, zs, t, col) { let d = ''; for (const z of zs) d += G.path([W.scr(s0, z), W.scr(s1, z), W.scr(s1, z + t), W.scr(s0, z + t)]); G.add(col, d); }
  /** Vertical buttresses (lighter strips standing off the wall) at s positions from z0 to z1, w wide, stepped tops. */
  function buttresses(G, W, ss, z0, z1, w, col, side) {
    let d = '', dS = '';
    for (const s of ss) {
      d += G.path([W.scr(s - w / 2, z0, 0.5), W.scr(s + w / 2, z0, 0.5), W.scr(s + w / 2, z1 - 0.6, 0.5), W.scr(s, z1, 0.5), W.scr(s - w / 2, z1 - 0.6, 0.5)]);
      const e = side < 0 ? s - w / 2 : s + w / 2;
      dS += G.path([W.scr(e, z0, 0), W.scr(e, z0, 0.5), W.scr(e, z1 - 0.6, 0.5), W.scr(e, z1 - 0.6, 0)]);
    }
    G.add(col, d); G.add(mix(col, '#1a1c24', 0.3), dS, { detail: true });
  }
  /** The surface texture of an ashlar wall: faint coursing lines every h metres (only when they are at least 3 px apart). */
  function coursing(G, W, s0, s1, z0, z1, h, col) {
    if (W.px(h) < 3) return;
    let d = '';
    for (let z = z0 + h; z < z1; z += h) d += G.seg(W.scr(s0, z), W.scr(s1, z));
    G.add(null, d, { s: col, w: 0.5, op: 0.35, detail: true });
  }
  /** A gable standing in the wall plane from s0 to s1 above z0, apex at z1: coped edges, a finial, a window. */
  function gable(G, W, s0, s1, z0, z1, col, o) {
    const c = (s0 + s1) / 2;
    G.add(shadeBy(col, W.n3), G.path([W.scr(s0, z0), W.scr(s1, z0), W.scr(c, z1)]));
    G.add(o.trim, G.path([W.scr(s0 - 0.3, z0), W.scr(c, z1 + 0.4), W.scr(s1 + 0.3, z0), W.scr(s1 - 0.4, z0), W.scr(c, z1 - 0.3), W.scr(s0 + 0.4, z0)]));
    const t = W.scr(c, z1), hw = Math.max(0.6, W.px(0.35, c));
    G.add(o.trim, `M${R1(t[0] - hw)} ${R1(t[1])}L${R1(t[0])} ${R1(t[1] - W.px(2.2, c))}L${R1(t[0] + hw)} ${R1(t[1])}Z`);
    if (o.win) G.arch(W, c - (s1 - s0) * 0.13, c + (s1 - s0) * 0.13, z0 + 0.6, z0 + (z1 - z0) * 0.62, 'point', o.glass, 0, { glow: 'window' });
  }
  /** A pitched roof behind wall W (from s0 to s1), dp metres deep, eaves at ze, ridge at zr; hipped ends if hip. */
  function roof(G, W, s0, s1, dp, ze, zr, col, hip) {
    const inset = hip ? Math.min(dp / 2, (s1 - s0) / 2) : 0;
    const A = W.at(s0, ze), B = W.at(s1, ze), A2 = W.at(s0 + inset, zr, -dp / 2), B2 = W.at(s1 - inset, zr, -dp / 2);
    const Ab = W.at(s0, ze, -dp), Bb = W.at(s1, ze, -dp), c = W.at((s0 + s1) / 2, ze, -dp / 2);
    const planes = [[A, B, B2, A2], [Bb, Ab, A2, B2]];
    if (hip) planes.push([B, Bb, B2], [Ab, A, A2]);
    for (const pl of planes) { const F = G.face(pl, c); if (F.vis) G.poly3(pl, shadeBy(col, F.n)); }
    if (!hip) for (const [p, q, t] of [[A, Ab, A2], [Bb, B, B2]]) { const F = G.face([p, q, t], c); if (F.vis) G.poly3([p, q, t], shadeBy(mix(col, '#9a8a6a', 0.6), F.n)); }
    // slate courses on the front plane (only when wide on screen)
    if (W.px(1) > 4) { let d = ''; for (let k = 1; k < 6; k++) { const t = k / 6; const p = W.at(s0 + inset * t, ze + (zr - ze) * t, -dp / 2 * t), q = W.at(s1 - inset * t, ze + (zr - ze) * t, -dp / 2 * t); d += G.seg(G.P(p[0], p[1], p[2]), G.P(q[0], q[1], q[2])); } G.add(null, d, { s: mix(col, '#000000', 0.25), w: 0.6, op: 0.5, detail: true }); }
  }
  /** Paving pattern as ground fills (layer by depth): lines along direction a ([x, d] unit) from t0 to t1, one at each offset
   *  in offs across it (direction b), w metres wide, from the origin o. Cut in 3 m pieces so each lands in its depth band. */
  function paving(cv, o, a, b, t0, t1, offs, w, col, clip) {
    const C = cam(cv), band = d => d < 15 ? 'fore' : d < 50 ? 'near' : d < 200 ? 'mid' : 'far', by = {};
    const dMin = C.f * cv.eye / (900 - cv.horizon) * 0.9, R0 = v => Math.round(v);
    for (const k of offs) {
      // walk the line in 2 m steps; a run of steps in one band (and inside the clip) is ONE straight quad
      let run = null;
      const flush = () => {
        if (!run) return;
        const P = (tt, e) => [o[0] + a[0] * tt + b[0] * (k + e), o[1] + a[1] * tt + b[1] * (k + e)];
        const q = [P(run.t0, -w / 2), P(run.t1, -w / 2), P(run.t1, w / 2), P(run.t0, w / 2)];
        by[run.l] = (by[run.l] || '') + 'M' + q.map(p => { const z = C.p(p[0], p[1], 0); return R0(z[0]) + ' ' + R0(z[1]); }).join('L') + 'Z';
        run = null;
      };
      for (let t = t0; t < t1; t += 2) {
        const te = Math.min(t1, t + 2), mx = o[0] + a[0] * (t + te) / 2 + b[0] * k, md = o[1] + a[1] * (t + te) / 2 + b[1] * k;
        const ok = md > dMin && (!clip || clip(mx, md)) && Math.abs(mx) < md * 1.2 + 4;
        const l = ok ? band(md) : null;
        if (run && (l !== run.l)) flush();
        if (l) { if (!run) run = { l, t0: t, t1: te }; else run.t1 = te; }
      }
      flush();
    }
    return Object.keys(by).map(l => ({ layer: l, d: by[l], fill: col }));
  }
  /** The scene palette of the civic quarter's hard ground by season: warm pale stone in summer, leaf-brown in autumn, wet
   *  blue-grey in winter, fresh in spring (the granite and the setts read the season and the weather). */
  function palette() {
    const S = {
      spring: { plaza: ['#bdb7aa', '#979185'], pavement: ['#b2ada2', '#8c877c'], platform: ['#b0aca2', '#8a867c'], road: ['#5e6064', '#46484c'], tramway: ['#8c8a86', '#6a6864'], lawn: ['#7aa04e', '#5a8236'] },
      summer: { plaza: ['#d2c6ae', '#aa9e86'], pavement: ['#c6bba6', '#a0957e'], platform: ['#c2b8a6', '#9a9080'], road: ['#646262', '#4c4a48'], tramway: ['#9a9284', '#787062'], lawn: ['#8aa848', '#6a8a32'] },
      autumn: { plaza: ['#ae9a78', '#866e50'], pavement: ['#a8946e', '#806a4c'], platform: ['#aa9a7e', '#847056'], road: ['#5c544c', '#443c34'], tramway: ['#8a8070', '#685e50'], lawn: ['#8a9448', '#6a7232'] },
      winter: { plaza: ['#9ea2a6', '#787c82'], pavement: ['#989ca2', '#72767c'], platform: ['#9a9ea2', '#74787e'], road: ['#4c5258', '#363c42'], tramway: ['#7c8288', '#5a6066'], lawn: ['#7a8a6a', '#5e6c50'] },
    };
    // tone: the hard ground's own variation, a few steps off the plaza colour (worn pale, newer dark, wet, warm sandstone)
    const mixc = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); return '#' + [16, 8, 0].map(k => Math.round(((A >> k) & 255) + (((B >> k) & 255) - ((A >> k) & 255)) * t).toString(16).padStart(2, '0')).join(''); };
    const T = {}; for (const k in S) { const p0 = S[k].plaza[0], p1 = S[k].plaza[1]; T[k] = [mixc(p0, '#ffffff', 0.1), mixc(p0, '#3a3026', 0.1), mixc(p0, p1, 0.4), mixc(p0, '#9a7040', 0.12)]; }
    for (const k in S) S[k].tone = T[k];
    return Object.assign({ base: S.summer }, S);
  }
  /** Pigeons in clusters (feral and wood pigeons mixed, sized and tinted apart), at ground points from at(cx, cd). */
  function pigeons(seed, clusters, at) {
    const r = rnd(seed), out = [], taken = [];
    for (const [cx, cd, n, sp] of clusters) for (let i = 0; i < n; i++) {
      const u = r(), obj = u < 0.56 ? 'bird.pigeon-feral' : 'bird.pigeon';
      let x = 0, d = 0, ok = false;
      for (let k = 0; k < 8 && !ok; k++) { x = cx + (r() - 0.5) * (sp || 3); d = cd + (r() - 0.5) * (sp || 3) * 0.6; ok = taken.every(q => Math.hypot(q[0] - x, (q[1] - d) * 0.6) > Math.max(0.55, Math.abs(d) * 0.014)); }
      if (!ok) continue;
      taken.push([x, d]);
      out.push({ obj, at: at(Math.round(x * 100) / 100, Math.round(d * 100) / 100),
        k: Math.round((0.7 + r() * 0.75) * 100) / 100, variant: Math.floor(r() * 3), flip: r() < 0.5, tint: ['#4a4a52', Math.round(r() * 16) / 100] });
    }
    return out;
  }
  return { R1, rnd, mix, shadeBy, cam, pen, windows, bands, buttresses, coursing, gable, roof, paving, palette, pigeons };
})();

/* ---------- the view geometry (shared by the objects and the scene files) ---------- */
const SCENE_MCR_VIEWS = ({
  // v1 Albert Square: the Town Hall front from the square's south-west corner. TH: the facade line, north end to south end
  // (left to right on screen); 110 m long, the clock tower at its middle; the Albert Memorial 30 m out in front of the tower.
  v1: Object.freeze({
    camera: { eye: 1.65, fov: 76, horizon: 662, heading: 52, lat: 53.47905, lon: -2.24640 },
    thN: [-8, 194], thS: [84, 100],
  }),
});

/* ---------- landmark.mcr-town-hall-v1: Waterhouse's Albert Square front, in the v1 camera ----------
   The 1877 Gothic front of Spinkwell sandstone: three storeys of paired lancets between buttresses, a row of gables at the
   eaves with steep grey slate behind, the corner pavilions (Princess Street and Lloyd Street) with their steep pyramid roofs
   and turrets, and the 87 m clock tower over the main entrance: the shaft with its tall lancets, the clock stage, the open
   belfry, the corner pinnacles and the spire. The return along Princess Street shows on the left. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCR, V = SCENE_MCR_VIEWS.v1, C = M.cam(V.camera);
  const STONE = '#a99070', TRIM = '#c9b48c', DARK = '#4a3e30', SLATE = '#4e585c', GLASS = '#26303a', LEAD = '#4a5658';
  const N = V.thN, S = V.thS, L = Math.hypot(S[0] - N[0], S[1] - N[1]);
  const anchor = C.p(S[0], S[1], 0);
  function build(v, r) {
    const G = M.pen(C, anchor), W = G.wall(N, S), u = W.u, n = W.n;
    const EAVE = 22, RIDGE = 31, TS = L / 2, TW = 13;
    // the Princess Street return (the north end, running back from N): a wall seen at a grazing angle
    const back = [N[0] - n[0] * 40, N[1] - n[1] * 40];
    const Wr = G.wall(back, N);
    if (Wr.vis) {
      G.add(M.shadeBy(STONE, Wr.n3), G.path([Wr.scr(0, 0), Wr.scr(40, 0), Wr.scr(40, EAVE), Wr.scr(0, EAVE)]));
      M.windows(G, Wr, { s0: 2, s1: 38, bays: 7, z0: 2, z1: 5.4, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM });
      M.windows(G, Wr, { s0: 2, s1: 38, bays: 7, z0: 8, z1: 13.6, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, transom: 0.6 });
      M.windows(G, Wr, { s0: 2, s1: 38, bays: 7, z0: 15.6, z1: 19.6, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM });
      M.roof(G, Wr, 0, 40, 14, EAVE, RIDGE, SLATE, false);
    }
    // the main front: the long roof first (behind the gables), then the wall
    M.roof(G, W, 0, L, 16, EAVE, RIDGE + 1, SLATE, false);
    // dormer lucarnes on the slate (little gabled windows)
    for (let s = 6; s < L - 6; s += 7.3) {
      if (Math.abs(s - TS) < TW * 0.8 || s < 14 || s > L - 14) continue;
      const a = W.at(s - 0.9, EAVE + 4.5, -4.5), b = W.at(s + 0.9, EAVE + 4.5, -4.5), t = W.at(s, EAVE + 6.6, -4.5), a0 = W.at(s - 0.9, EAVE + 2.6, -3.6), b0 = W.at(s + 0.9, EAVE + 2.6, -3.6);
      G.poly3([a0, b0, b, t, a], M.mix(STONE, '#000000', 0.1));
      G.poly3([W.at(s - 0.45, EAVE + 2.9, -3.62), W.at(s + 0.45, EAVE + 2.9, -3.62), W.at(s + 0.45, EAVE + 4.7, -3.62), W.at(s - 0.45, EAVE + 4.7, -3.62)], GLASS, { glow: 'window' });
    }
    // ridge cresting and the roof's fleches (two small lead spirelets)
    for (const s of [L * 0.22, L * 0.78]) { const p = W.at(s, RIDGE + 1, -8); G.pinnacle(p[0], p[1], RIDGE + 1, RIDGE + 9, 1.1, LEAD, false); }
    // the wall
    G.add(M.shadeBy(STONE, W.n3), G.path([W.scr(0, 0), W.scr(L, 0), W.scr(L, EAVE), W.scr(0, EAVE)]));
    M.coursing(G, W, 0, L, 1.2, EAVE, 0.62, DARK);
    G.add(M.mix(STONE, '#2a2418', 0.35), G.path([W.scr(0, 0), W.scr(L, 0), W.scr(L, 1.3), W.scr(0, 1.3)]));
    M.bands(G, W, 0, L, [6.6, 14.6, 20.6], 0.35, M.shadeBy(TRIM, W.n3));
    // the bays: windows by storey (the tower and the pavilions skip them)
    const bays = 15, skip = i => { const c = (i + 0.5) * L / bays; return Math.abs(c - TS) < TW / 2 + 1; };
    M.windows(G, W, { s0: 0, s1: L, bays, z0: 1.9, z1: 5.6, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, skip });
    M.windows(G, W, { s0: 0, s1: L, bays, z0: 8.0, z1: 13.8, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, skip, transom: 0.62, fill: 0.62 });
    M.windows(G, W, { s0: 0, s1: L, bays, z0: 15.6, z1: 19.8, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, skip });
    const bs = []; for (let i = 0; i <= bays; i++) { const s = i * L / bays; if (Math.abs(s - TS) > TW / 2 + 0.5) bs.push(s); }
    M.buttresses(G, W, bs, 0, EAVE + 1.4, 0.9, M.shadeBy(TRIM, W.n3), -1);
    // the gables along the eaves (every other bay), each with a lancet
    for (let i = 1; i < bays - 1; i += 2) { const s0 = i * L / bays + 0.5, s1 = (i + 1) * L / bays - 0.5; if (Math.abs((s0 + s1) / 2 - TS) < TW) continue; M.gable(G, W, s0, s1, EAVE, EAVE + 6.5, STONE, { trim: M.shadeBy(TRIM, W.n3), glass: GLASS, win: true }); }
    // a parapet of little pinnacles along the eave between the gables
    for (let i = 0; i <= bays; i++) { const s = i * L / bays; if (Math.abs(s - TS) < TW / 2 + 1) continue; const p = W.at(s, EAVE, 0.5); G.pinnacle(p[0], p[1], EAVE + 1.2, EAVE + 4.2, 0.55, TRIM, true); }
    // the corner pavilions: proud blocks at each end, a steep pyramid roof, four turrets
    for (const [s0, s1] of [[0, 11], [L - 11, L]]) {
      const p0 = W.at(s0, 0, 1.2), p1 = W.at(s1, 0, 1.2), p2 = W.at(s1, 0, -11), p3 = W.at(s0, 0, -11);
      const foot = [[p0[0], p0[1]], [p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]]];
      G.prism(foot, 0, 26, STONE);
      const Wp = G.wall(foot[0], foot[1]);
      M.coursing(G, Wp, 0, 11, 1.2, 26, 0.62, DARK);
      M.bands(G, Wp, 0, 11, [6.6, 14.6, 20.6, 25.4], 0.35, M.shadeBy(TRIM, Wp.n3));
      M.windows(G, Wp, { s0: 0.5, s1: 10.5, bays: 2, z0: 1.9, z1: 5.6, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM });
      M.windows(G, Wp, { s0: 0.5, s1: 10.5, bays: 2, z0: 8, z1: 13.8, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, transom: 0.62, lights: 3, fill: 0.72 });
      M.windows(G, Wp, { s0: 0.5, s1: 10.5, bays: 2, z0: 15.6, z1: 19.8, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM });
      M.windows(G, Wp, { s0: 2, s1: 9, bays: 1, z0: 21.4, z1: 24.6, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, lights: 3, fill: 0.8 });
      const cx = foot.reduce((s, p) => s + p[0], 0) / 4, cd = foot.reduce((s, p) => s + p[1], 0) / 4;
      G.pyramid(foot, 26, [cx, cd, 43], SLATE);
      for (const p of foot) G.pinnacle(p[0], p[1], 24, 33, 1.2, TRIM, true);
      G.pinnacle(cx, cd, 42, 47, 0.5, LEAD, false);
    }
    // the clock tower: proud of the front by 3 m, 13 m square, the shaft to 52 m, the clock stage, belfry, spire to 87 m
    const t0 = W.at(TS - TW / 2, 0, 3), t1 = W.at(TS + TW / 2, 0, 3), t2 = W.at(TS + TW / 2, 0, -TW + 3), t3 = W.at(TS - TW / 2, 0, -TW + 3);
    const TF = [[t0[0], t0[1]], [t1[0], t1[1]], [t2[0], t2[1]], [t3[0], t3[1]]];
    G.prism(TF, 0, 62, STONE);
    const Wt = G.wall(TF[0], TF[1]), Wl = G.wall(TF[3], TF[0]);
    for (const [Wx, len] of [[Wt, TW], [Wl, TW]]) {
      if (!Wx.vis) continue;
      M.coursing(G, Wx, 0, len, 1.2, 62, 0.62, DARK);
      M.bands(G, Wx, 0, len, [8.5, 22.6, 36, 45.6, 52.4, 61.2], 0.45, M.shadeBy(TRIM, Wx.n3));
      M.buttresses(G, Wx, [0.5, len - 0.5], 0, 60, 1.0, M.shadeBy(TRIM, Wx.n3), Wx === Wt ? -1 : 1);
      M.windows(G, Wx, { s0: 2, s1: len - 2, bays: 1, z0: 25, z1: 34.5, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, lights: 2, fill: 0.5, transom: 0.5 });
      M.windows(G, Wx, { s0: 2, s1: len - 2, bays: 3, z0: 38, z1: 44, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, lights: 1, fill: 0.5 });
      // the clock face (a circle on the wall plane) at 56 m
      const cs = len / 2, cz = 56.8, rr = 3.2, ring = [], dial = [];
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ring.push(Wx.scr(cs + Math.cos(a) * (rr + 0.5), cz + Math.sin(a) * (rr + 0.5), 0.1)); dial.push(Wx.scr(cs + Math.cos(a) * rr, cz + Math.sin(a) * rr, 0.12)); }
      G.add(M.shadeBy(TRIM, Wx.n3), G.path(ring));
      G.add('#e9e2cc', G.path(dial), { glow: 'lamp' });
      let tk = '';
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, p = Wx.scr(cs + Math.cos(a) * rr * 0.82, cz + Math.sin(a) * rr * 0.82, 0.13), q = Wx.scr(cs + Math.cos(a) * rr * 0.97, cz + Math.sin(a) * rr * 0.97, 0.13); tk += 'M' + G.ps(p) + 'L' + G.ps(q); }
      const hc = Wx.scr(cs, cz, 0.14), hm = Wx.scr(cs + rr * 0.1, cz + rr * 0.78, 0.14), hh = Wx.scr(cs + rr * 0.45, cz + rr * 0.15, 0.14);
      tk += 'M' + G.ps(hc) + 'L' + G.ps(hm) + 'M' + G.ps(hc) + 'L' + G.ps(hh);
      G.add(null, tk, { s: '#24201c', w: Math.max(0.6, Wx.px(0.22)) });
    }
    // the main entrance arch at the tower's foot, the oriel balcony over it
    if (Wt.vis) {
      G.arch(Wt, 3.4, TW - 3.4, 0, 8.2, 'point', DARK);
      G.arch(Wt, 4.2, TW - 4.2, 0, 7.4, 'point', '#2a221c', 0, { glow: 'window' });
      G.add(M.shadeBy(TRIM, Wt.n3), G.path([Wt.scr(2.5, 9.6, 0.9), Wt.scr(TW - 2.5, 9.6, 0.9), Wt.scr(TW - 2.5, 10.6, 0.9), Wt.scr(2.5, 10.6, 0.9)]));
      M.windows(G, Wt, { s0: 2.5, s1: TW - 2.5, bays: 1, z0: 11, z1: 19.6, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, lights: 3, fill: 0.8, transom: 0.55 });
    }
    // the belfry: a slightly set-back stage of open lancets to 70 m, corner pinnacles, then the spire
    const tc = [(TF[0][0] + TF[2][0]) / 2, (TF[0][1] + TF[2][1]) / 2];
    const inset = (k) => TF.map(p => [tc[0] + (p[0] - tc[0]) * k, tc[1] + (p[1] - tc[1]) * k]);
    const BF = inset(0.82);
    G.prism(BF, 62, 70.5, STONE);
    const Wb = G.wall(BF[0], BF[1]), Wb2 = G.wall(BF[3], BF[0]);
    for (const Wx of [Wb, Wb2]) if (Wx.vis) { M.windows(G, Wx, { s0: 0.8, s1: Wx.L - 0.8, bays: 2, z0: 62.8, z1: 69.4, kind: 'point', rnd: () => 0.99, glass: '#1c1814', frame: DARK, trim: TRIM, lights: 1, fill: 0.62 }); }
    for (const p of TF) G.pinnacle(p[0], p[1], 60, 74, 1.6, TRIM, true);
    const SP = inset(0.6);
    G.pyramid(SP, 70.5, [tc[0], tc[1], 86], LEAD);
    for (const p of inset(0.7)) G.pinnacle(p[0], p[1], 70, 77, 0.9, TRIM, true);
    // the spire's lucarnes and the finial
    { const Ws = G.wall(SP[0], SP[1]); if (Ws.vis) { const q = Ws.at(Ws.L / 2, 72, 0.3); G.pinnacle(q[0], q[1], 71, 76, 1.2, LEAD, false); } }
    G.pinnacle(tc[0], tc[1], 85, 88.5, 0.35, '#8a7a4a', false);
    return { body: G.S };
  }
  sceneObjDefine({
    id: 'landmark.mcr-town-hall-v1', category: 'landmark', size: [1400, 700], variants: 1, seasonal: false, flippable: false, detailPx: 300,
    palette: { base: {} }, parts: ['body'], shadow: false, real: { h: 87, l: 110, w: 60 },
    night: { glow: { window: '#ffd98a', lamp: '#fff2c8' }, on: 0.55 },
    tags: ['uk', 'manchester', 'landmark', 'signature', 'place:uk/manchester', 'gothic', 'clock-tower', 'perspective', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Manchester civic-quarter views: Manchester Town Hall (Alfred Waterhouse, 1877) from Albert Square, in the camera\'s perspective',
    build(v, r) { return build(v, r); },
  });
})();

/* ---------- landmark.mcr-albert-memorial: Thomas Worthington's 1867 Gothic canopy over the statue of Prince Albert ----------
   A ciborium on stepped plinths: four clustered piers, a pointed arch and a crocketed gable on each face, corner pinnacles,
   a tall spire with lucarnes; the white marble prince standing under it. Drawn in the camera of the view it is in (v). */
const SCENE_MCR_MEMORIAL = [];
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCR;
  const STONE = '#9c8c74', TRIM = '#b8aa8e', DARK = '#3a3028', GRANITE = '#7a3e36', LEAD = '#4a5256';
  function build(v) {
    const spec = SCENE_MCR_MEMORIAL[v]; if (!spec) return { body: [] };
    const C = M.cam(spec.camera), [cx, cd] = spec.at, rot = spec.rot || 0, A = C.p(cx, cd, 0);
    const G = M.pen(C, A);
    const sq = (hw) => { const pts = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]]; return pts.map(([a, b]) => [cx + a * Math.cos(rot) - b * Math.sin(rot), cd + a * Math.sin(rot) + b * Math.cos(rot)]); };
    // the steps: three granite and stone plinths
    G.prism(sq(5.2), 0, 0.5, '#9a8e7a'); G.prism(sq(4.5), 0.5, 1.0, '#a89c86'); G.prism(sq(3.8), 1.0, 2.2, STONE);
    const F = sq(3.0), base = 2.2, spring = 7.6, apex = 10.6, gTop = 13.4;
    // the statue inside (drawn before the front piers so they frame it)
    const s = C.p(cx, cd, 2.2), k = C.f / cd;
    G.add('#ece8e0', `M${M.R1(s[0] - A[0] - 0.45 * k)} ${M.R1(s[1] - A[1])}L${M.R1(s[0] - A[0] - 0.55 * k)} ${M.R1(s[1] - A[1] - 1.9 * k)}Q${M.R1(s[0] - A[0])} ${M.R1(s[1] - A[1] - 2.3 * k)} ${M.R1(s[0] - A[0] + 0.55 * k)} ${M.R1(s[1] - A[1] - 1.9 * k)}L${M.R1(s[0] - A[0] + 0.45 * k)} ${M.R1(s[1] - A[1])}Z`);
    G.add('#ece8e0', `M${M.R1(s[0] - A[0] - 0.22 * k)} ${M.R1(s[1] - A[1] - 2.2 * k)}a${M.R1(0.22 * k)} ${M.R1(0.26 * k)} 0 1 0 0.1 0Z`);
    G.add('#c8c2b6', `M${M.R1(s[0] - A[0])} ${M.R1(s[1] - A[1])}L${M.R1(s[0] - A[0] + 0.45 * k)} ${M.R1(s[1] - A[1])}L${M.R1(s[0] - A[0] + 0.55 * k)} ${M.R1(s[1] - A[1] - 1.9 * k)}Z`, { op: 0.6 });
    // the canopy's faces: each visible side a wall with its arch cut out (an even-odd hole), the gable above
    const c3 = [cx, cd, 8];
    for (let i = 0; i < 4; i++) {
      const a = F[i], b = F[(i + 1) % 4], W = G.wall(a, b);
      if (!W.vis) continue;
      const L = W.L, outer = [W.scr(0, base), W.scr(L, base), W.scr(L, gTop - 2.4), W.scr(0, gTop - 2.4)];
      const hole = G.archPts(W, 1.0, L - 1.0, base, apex - 0.6, 'point').reverse();
      G.add(M.shadeBy(STONE, W.n3), 'M' + outer.map(G.ps).join('L') + 'Z' + 'M' + hole.map(G.ps).join('L') + 'Z');
      // the clustered granite shafts at the arch's jambs and the moulded arch ring
      G.add(GRANITE, G.path([W.scr(0.7, base), W.scr(1.05, base), W.scr(1.05, spring, 0.1), W.scr(0.7, spring, 0.1)]));
      G.add(GRANITE, G.path([W.scr(L - 1.05, base), W.scr(L - 0.7, base), W.scr(L - 0.7, spring, 0.1), W.scr(L - 1.05, spring, 0.1)]));
      const ringO = G.archPts(W, 0.7, L - 0.7, spring - 0.01, apex - 0.2, 'point', 0.05), ringI = G.archPts(W, 1.0, L - 1.0, spring, apex - 0.6, 'point', 0.05);
      G.add(M.shadeBy(TRIM, W.n3), 'M' + ringO.slice(1, -1).map(G.ps).join('L') + 'L' + ringI.slice(1, -1).reverse().map(G.ps).join('L') + 'Z');
      // the gable: crocketed, a rose in it
      M.gable(G, W, 0.2, L - 0.2, gTop - 2.4, gTop + 1.4, STONE, { trim: M.shadeBy(TRIM, W.n3), glass: DARK, win: false });
      const rc = W.scr(L / 2, gTop - 0.6, 0.1), rr = Math.max(0.8, W.px(0.75, L / 2));
      G.add(DARK, `M${M.R1(rc[0] - rr)} ${M.R1(rc[1])}a${M.R1(rr)} ${M.R1(rr)} 0 1 0 ${M.R1(rr * 2)} 0a${M.R1(rr)} ${M.R1(rr)} 0 1 0 ${M.R1(-rr * 2)} 0Z`);
      // the frieze of shields under the gable (plain, no arms)
      let fr = ''; for (let j = 1; j < 6; j++) { const p = W.scr(L * j / 6, gTop - 3.4, 0.08), w = Math.max(0.6, W.px(0.22, L / 2)); fr += `M${M.R1(p[0] - w)} ${M.R1(p[1] - w)}h${M.R1(2 * w)}v${M.R1(w * 1.4)}l${M.R1(-w)} ${M.R1(w * 0.8)}l${M.R1(-w)} ${M.R1(-w * 0.8)}Z`; }
      G.add(M.mix(TRIM, '#8a6a3a', 0.25), fr, { detail: true });
    }
    // the roof behind the gables and the spire with its lucarnes
    G.pyramid(F, gTop - 2.4, [cx, cd, gTop + 1.6], LEAD);
    G.pyramid(sq(1.5), gTop + 0.6, [cx, cd, 21.5], STONE);
    for (let i = 0; i < 4; i++) { const a = F[i], b = F[(i + 1) % 4], m = [(a[0] + b[0]) / 2 * 0.55 + cx * 0.45, (a[1] + b[1]) / 2 * 0.55 + cd * 0.45]; G.pinnacle(m[0], m[1], gTop + 0.8, gTop + 3.6, 0.6, TRIM, true); }
    for (const p of F) G.pinnacle(p[0], p[1], base, gTop + 2.6, 0.95, TRIM, true);
    G.pinnacle(cx, cd, 21, 22.8, 0.3, '#8a7a4a', false);
    void c3;
    return { body: G.S };
  }
  sceneObjDefine({
    id: 'landmark.mcr-albert-memorial', category: 'landmark', size: [260, 420], variants: 4, seasonal: false, flippable: false, detailPx: 300,
    palette: { base: {} }, parts: ['body'], shadow: false, real: { h: 21.5, l: 10.4, w: 10.4 },
    tags: ['uk', 'manchester', 'landmark', 'memorial', 'gothic', 'perspective', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Manchester civic-quarter views: the Albert Memorial, Albert Square (Thomas Worthington, 1867), in the camera\'s perspective',
    build(v) { return build(v); },
  });
})();

/* ---------- where each view's Albert Memorial stands (variant = index) ---------- */
(function () {
  const V = SCENE_MCR_VIEWS.v1, N = V.thN, S = V.thS, L = Math.hypot(S[0] - N[0], S[1] - N[1]), u = [(S[0] - N[0]) / L, (S[1] - N[1]) / L], n = [u[1], -u[0]];
  const t = [N[0] + u[0] * L * 0.3, N[1] + u[1] * L * 0.3];
  SCENE_MCR_MEMORIAL[0] = { camera: V.camera, at: [Math.round((t[0] + n[0] * 62) * 10) / 10, Math.round((t[1] + n[1] * 62) * 10) / 10], rot: Math.atan2(u[1], u[0]) };
})();

/* ---------- generated-building styles of the civic quarter (19.3): Victorian commercial palazzi and red-brick warehouses ---------- */
(function () {
  if (typeof sceneBuildingStyleDefine !== 'function') return;
  sceneBuildingStyleDefine('mcr-palazzo', {
    label: 'Manchester Victorian commercial palazzo', eras: [1850, 1900], regions: ['uk', 'north'], grouping: 'block', layout: 'grid',
    storeys: [4, 6], storeyH: [4.6, 4.0, 3.6], frontage: [14, 26], depth: [14, 20], roof: 'flat', parapet: 1.2,
    wall: { cols: ['#b8a07e', '#a89070', '#c2ac88', '#9c8466'], grime: '#3a3228', texture: 'stone', mortar: '#d8ccb4',
      alt: { cols: ['#9a4a34', '#a4523a', '#8e4430'], texture: 'brick', chance: 0.45 } },
    roofMat: { cols: ['#4a5258', '#525a60'], kind: 'slate' },
    dress: { cols: ['#d8ccb0', '#cfc2a4'] },
    win: { type: 'sash', panes: [1, 1], w: 1.3, hk: 0.62, sill: 0.9, head: 'round', recess: 0.18, frames: ['#e8e2d4', '#2e3236', '#5a3a2a'], glass: ['#2c3640', '#323c46', '#283038'] },
    door: { w: 1.6, h: 3.0, fan: true, panels: 2, recess: 0.3, cols: ['#2a2a2a', '#3a2a1e', '#1f2f3a'] },
    grid: { col: 3.1, margin: 1.0, loading: false },
    chimney: { where: 'none' },
    bands: [{ storey: 1, h: 0.35, col: '#d8ccb0' }, { storey: 2, h: 0.2, col: '#d0c4a8' }, { storey: 4, h: 0.3, col: '#d8ccb0' }],
    shop: { always: true, cols: ['#1f2a34', '#2a2a2a', '#3a2a1e', '#1f3a34', '#5a1f24'] },
    sideWindows: true, quoins: true,
    details: { downpipe: 0.4, alarm: 0, boxes: 0, ivy: 0 },
    night: { on: 0.4, curtain: 0, tv: 0 },
  });
})();

/* ---------- street furniture and the market (elevation objects: they face the camera well enough at any angle) ----------
   street.mcr-statue            a bronze worthy on a granite pedestal (v0 standing, one arm out; v1 seated; v2 robed, standing)
   structure.mcr-market-chalet  a Christmas market chalet: timber, a steep roof, a fir garland, fairy lights, the lit hatch
   tree.mcr-xmas-tree           the market's big Christmas tree, lights and baubles (lit at dusk) */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCR, R = M.R1;
  const ell = (cx, cy, rx, ry) => `M${R(cx - rx)} ${R(cy)}a${R(rx)} ${R(ry)} 0 1 0 ${R(2 * rx)} 0a${R(rx)} ${R(ry)} 0 1 0 ${R(-2 * rx)} 0Z`;
  sceneObjDefine({
    id: 'street.mcr-statue', category: 'street', size: [110, 250], variants: 3, seasonal: false, flippable: true,
    palette: { base: { granite: ['#8a8480', '#6e6862', '#a49e96'], bronze: ['#4a5446', '#36403a', '#6e7c66', '#26302a'] } },
    parts: ['body'], shadow: { rx: 50, ry: 8, h: 240 }, real: { h: 6.2, l: 2.6 },
    tags: ['uk', 'manchester', 'statue', 'memorial', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester civic-quarter views: the Victorian statues of Albert Square (no likeness, no inscription)',
    build(v) {
      const b = [];
      // the pedestal: granite steps, a moulded plinth, the die with a raised panel and a bronze wreath, the cornice
      b.push({ f: '@granite.1', d: 'M-48 0V-12H48V0Z' }, { f: '@granite.0', d: 'M-42 -12V-22H42V-12Z' }, { f: '@granite.2', d: 'M-42 -22V-24H42V-22Z' },
        { f: '@granite.0', d: 'M-34 -24Q-34 -30 -30 -32V-96H30V-32Q34 -30 34 -24Z' }, { f: '@granite.1', d: 'M12 -24V-96H30V-32Q34 -30 34 -24Z', op: 0.55 },
        { f: '@granite.2', d: 'M-22 -38V-84H22V-38Z', op: 0.4 }, { f: '@granite.1', d: 'M-22 -38V-84H-20V-40H22V-38Z', op: 0.6 },
        { f: '@bronze.0', d: 'M-10 -62a10 10 0 1 0 20 0a10 10 0 1 0 -20 0ZM-6 -62a6 6 0 1 1 12 0a6 6 0 1 1 -12 0Z' }, { f: '@bronze.2', d: 'M-9 -64q4 -8 10 -8q-6 3 -8 9Z', op: 0.6 },
        { f: '@granite.2', d: 'M-37 -96V-101H37V-96Z' }, { f: '@granite.0', d: 'M-34 -101V-106H34V-101Z' }, { f: '@granite.1', d: 'M-31 -106V-111H31V-106Z' });
      if (v === 1) {
        b.push({ f: '@bronze.1', d: 'M-26 -110V-150Q-26 -160 -18 -162H-6V-128H20V-110Z' },
          { f: '@bronze.0', d: 'M-14 -110L-10 -134Q-10 -142 -2 -144H18Q24 -142 22 -134L24 -112L16 -110L14 -130H2L-2 -110Z' },
          { f: '@bronze.0', d: 'M-16 -136Q-20 -170 -6 -184Q4 -190 12 -182Q20 -168 16 -136Z' },
          { f: '@bronze.2', d: 'M-10 -150Q-12 -172 -4 -180Q-8 -160 -6 -142Z', op: 0.6 },
          { f: '@bronze.0', d: ell(2, -194, 9, 11) }, { f: '@bronze.3', d: 'M-6 -200Q2 -208 10 -200Q6 -204 -6 -200Z', op: 0.6 },
          { f: '@bronze.0', d: 'M14 -160Q30 -150 24 -138L18 -136Q22 -148 10 -152Z' });
      } else {
        const robe = v === 2;
        if (!robe) b.push({ f: '@bronze.3', d: 'M-15 -111h12v-4h-12zM3 -111h13v-4h-13z' }, { f: '@bronze.1', d: 'M-12 -114L-10 -146H-1L-3 -114ZM4 -114L1 -146H10L13 -114Z' }, { f: '@bronze.2', d: 'M-11 -116L-9 -144H-6L-8 -116Z', op: 0.5 },
          { f: '@bronze.0', d: 'M-17 -136L-13 -176Q-11 -188 0 -190Q11 -188 14 -178L16 -150L18 -134Q8 -128 0 -132Q-8 -128 -17 -136Z' }, { f: '@bronze.1', d: 'M-2 -186L4 -150L1 -132Q8 -128 18 -134L16 -150L14 -178Q11 -188 2 -190Z', op: 0.65 },
          { f: '@bronze.2', d: 'M-13 -140L-10 -174Q-8 -184 -2 -186L-8 -140Z', op: 0.55 }, { f: '@bronze.3', d: 'M-2 -184L0 -150M-4 -176l3 -2', op: 0.7 }, { f: '@bronze.1', d: 'M-14 -176Q-22 -160 -18 -146L-13 -147Q-15 -160 -9 -172Z' });
        else b.push({ f: '@bronze.0', d: 'M-20 -110L-14 -172Q-12 -186 0 -188Q12 -186 14 -172L22 -110Z' });
        b.push({ f: '@bronze.0', d: 'M-1 -110L-1 -110Z' },
          { f: '@bronze.2', d: robe ? 'M-14 -114L-9 -170Q-6 -180 0 -182L-4 -114Z' : 'M-12 -150L-14 -176Q-10 -184 -2 -186L-6 -150Z', op: 0.55 },
          { f: '@bronze.1', d: robe ? 'M6 -112L10 -168L20 -112Z' : 'M4 -146L8 -180L14 -176L12 -146Z', op: 0.7 },
          { f: '@bronze.0', d: ell(0, -198, 8, 10) }, { f: '@bronze.3', d: 'M-7 -202Q0 -212 8 -202Q4 -206 -7 -202Z', op: 0.6 });
        if (v === 0) b.push({ f: '@bronze.0', d: 'M12 -180L34 -194L36 -190L16 -172Z' }, { f: '@bronze.0', d: ell(37, -193, 3, 3) });
        else b.push({ f: '@bronze.1', d: 'M-16 -160L-24 -150L-14 -144L-8 -156Z' });
      }
      b.push({ f: '#5a7a6a', d: 'M-8 -96L-6 -60L-4 -96ZM10 -96L11 -70L13 -96Z', op: 0.3 });
      return { body: b };
    },
  });
  sceneObjDefine({
    id: 'structure.mcr-market-chalet', category: 'structure', detailPx: 60, size: [240, 190], variants: 4, seasonal: false, flippable: true,
    palette: { base: { wood: ['#7a5232', '#5e3e26', '#9a6a40'], roof: ['#3e3a36', '#2a2826'], fir: ['#2e4a2a', '#24402a', '#3e6036'],
      lights: '#ffe7a0', red: '#a02a2a', goods: ['#c86a3a', '#e8c070', '#7a3a6a', '#3a6a8a', '#d8d0c0'], hatch: '#ffd88a', canvas: '#e8dcc0' } },
    parts: ['body'], shadow: false, real: { h: 3.8, l: 4.2, w: 2.6 },
    night: { glow: { window: '#ffd88a', lamp: '#fff0b8' }, on: 1 },
    tags: ['uk', 'manchester', 'market', 'christmas', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester civic-quarter views: a Christmas market chalet (no lettering)',
    build(v, r) {
      const b = [], lit = [];
      b.push({ f: '@wood.0', d: 'M-100 0V-110H100V0Z' });
      let planks = ''; for (let y = -104; y < 0; y += 9) planks += `M-100 ${y}H100`;
      b.push({ s: '@wood.1', w: 1, d: planks, op: 0.6, detail: true });
      b.push({ f: '@hatch', d: 'M-78 -46V-96H78V-46Z', glow: 'window' }, { f: '@wood.2', d: 'M-86 -40V-48H86V-40Z' });
      for (let i = 0; i < 14; i++) { const x = -74 + i * 11 + r() * 3, h = 6 + r() * 10; b.push({ f: '@goods.' + Math.floor(r() * 5), d: `M${R(x)} -48V${R(-48 - h)}H${R(x + 8)}V-48Z`, detail: true }); }
      if (v % 2) b.push({ f: '@goods.4', d: 'M-70 -96V-80H-40V-96ZM40 -96V-82H70V-96Z', op: 0.8 });
      b.push({ f: '@roof.0', d: 'M-118 -104L0 -176L118 -104L108 -98L0 -164L-108 -98Z' }, { f: '@wood.1', d: 'M-108 -98L0 -164L108 -98Z' });
      b.push({ f: '@wood.2', d: 'M-20 -128H20V-112H-20Z' });
      let gar = ''; for (let x = -104; x <= 104; x += 8) gar += ell(x, -100 + Math.sin(x * 0.08) * 2, 7, 5);
      b.push({ f: '@fir.0', d: gar });
      b.push({ f: '@red', d: ell(-60, -96, 4, 4) + ell(0, -96, 4, 4) + ell(60, -96, 4, 4) });
      let fl = ''; for (let x = -100; x <= 100; x += 10) fl += ell(x, -94 + Math.abs(Math.sin((x + 100) / 40 * Math.PI)) * 5, 1.6, 1.6);
      lit.push({ f: '@lights', d: fl, glow: 'lamp' });
      b.push({ f: '@lights', d: fl, op: 0.7, detail: true });
      if (v >= 2) b.push({ f: '@canvas', d: 'M-90 -96L-96 -84H96L90 -96Z' }, { f: '@red', d: 'M-96 -84L-90 -78L-78 -84L-66 -78L-54 -84L-42 -78L-30 -84L-18 -78L-6 -84L6 -78L18 -84L30 -78L42 -84L54 -78L66 -84L78 -78L90 -84L96 -84Z', op: 0.85 });
      if (v === 0) b.push({ f: '@fir.1', d: 'M86 -6L104 -60L122 -6Z' }, { f: '@fir.0', d: 'M90 -40L104 -84L118 -40Z' }, { f: '@wood.1', d: 'M96 0V-8H112V0Z' });
      return { body: b.concat(lit) };
    },
  });
  sceneObjDefine({
    id: 'tree.mcr-xmas-tree', category: 'tree', size: [200, 520], variants: 1, seasonal: false, flippable: false,
    palette: { base: { fir: ['#1f3a26', '#2a4a2e', '#365e38'], lights: '#ffe6a0', bauble: ['#c0302a', '#e0b040', '#e8e4dc'], trunk: '#4a3424' } },
    parts: ['body', 'lit'], shadow: false, real: { h: 15, l: 6 },
    night: { glow: { lamp: '#fff0b8' }, on: 1 },
    tags: ['uk', 'christmas', 'fir', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester civic-quarter views: the Christmas market tree',
    build(v, r) {
      const b = [], lit = [];
      b.push({ f: '@trunk', d: 'M-10 0V-40H10V0Z' }, { f: '#5a4a3a', d: 'M-30 0V-26H30V0Z' });
      for (let i = 0; i < 7; i++) {
        const y0 = -30 - i * 66, w = 96 - i * 12, h = 110;
        b.push({ f: '@fir.' + (i % 2), d: `M${-w} ${y0}Q${-w * 0.4} ${y0 - 14} 0 ${y0 - h}Q${w * 0.4} ${y0 - 14} ${w} ${y0}Q0 ${y0 + 12} ${-w} ${y0}Z` });
        b.push({ f: '@fir.2', d: `M${-w * 0.9} ${y0 - 2}Q${-w * 0.4} ${y0 - 14} 0 ${y0 - h}Q${-w * 0.2} ${y0 - 30} ${-w * 0.9} ${y0 - 2}Z`, op: 0.5 });
      }
      let L = ''; const B = ['', '', ''];
      for (let i = 0; i < 90; i++) { const t = r(), y = -40 - t * 440, w = (1 - t) * 86, x = (r() - 0.5) * 2 * w; L += ell(x, y, 2, 2); if (i % 3 === 0) B[(i / 3) % 3] += ell(x + 4, y + 6, 4, 4); }
      B.forEach((d, i) => d && b.push({ f: '@bauble.' + i, d }));
      b.push({ f: '@lights', d: L, op: 0.6 });
      const star = 'M0 -508L5 -496L18 -496L8 -488L12 -476L0 -484L-12 -476L-8 -488L-18 -496L-5 -496Z';
      lit.push({ f: '@lights', d: L, glow: 'lamp' }, { f: '@lights', d: star, glow: 'lamp' });
      b.push({ f: '#e0b040', d: star });
      return { body: b, lit };
    },
  });
})();

/* ============================================================
   St Peter's Square (v2) and Peter Street (v3): the Central Library rotunda, the Town Hall Extension, the Cenotaph, the
   Midland Hotel, the tram stop. Every landmark here is drawn in the camera of the view it stands in: SCENE_MCR_SPEC[id][v]
   = { camera, ... } (the variant is the index), filled below for each view that shows it.
   ============================================================ */
/** The nearest corner of a footprint (the anchor of a projected landmark: the build and the placement both use it). */
function SCENE_MCR_NEAR(F) { return F.reduce((m, p) => (p[1] < m[1] ? p : m), F[0]); }
const SCENE_MCR_SPEC = { library: [], extension: [], cenotaph: [], midland: [], tower: [], glass: [], rylands: [] };
(function () {
  const V = SCENE_MCR_VIEWS;
  // v2: St Peter's Square from the corner of One St Peter's Square, looking north-west across the tram stop
  const c2 = { eye: 1.65, fov: 74, horizon: 615, heading: 318, lat: 53.47720, lon: -2.24210 };
  SCENE_MCR_SPEC.library[0] = { camera: c2, at: [-20, 98], r: 24, face: [0.32, -0.95] };
  SCENE_MCR_SPEC.extension[0] = { camera: c2, foot: [[14, 104], [48, 96], [92, 104]], depth: 22 };
  SCENE_MCR_SPEC.cenotaph[0] = { camera: c2, at: [6, 47], rot: 0.1 };
  SCENE_MCR_SPEC.tower[0] = { camera: c2, at: [34, 205] };
  // v3: from the library's portico steps, looking south-west over the stop to the Midland Hotel on Peter Street
  const c3 = { eye: 2.6, fov: 72, horizon: 585, heading: 214, lat: 53.47790, lon: -2.24420 };
  SCENE_MCR_SPEC.midland[0] = { camera: c3, foot: [[-4, 76], [72, 68], [76, 132], [0, 140]], corner: true };
  SCENE_MCR_SPEC.glass[0] = { camera: c3, foot: [[-62, 30], [-30, 30], [-28, 64], [-60, 64]], h: 58 };
  // v2's left: the Midland's Peter Street corner far off between the library and the edge of the frame
  SCENE_MCR_SPEC.midland[1] = { camera: c2, foot: [[-150, 120], [-92, 165], [-120, 200], [-178, 156]], corner: true };
  Object.assign(V, { v2: Object.freeze({ camera: c2 }), v3: Object.freeze({ camera: c3 }) });
})();
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCR, R = M.R1;
  const PORTLAND = '#cdc6b2', PDARK = '#7a7464', LEAD = '#6e7a72', GLASS = '#2a343e', SLATE = '#4c5458';

  /* ---------- landmark.mcr-central-library: E. Vincent Harris's 1934 rotunda, Portland stone ----------
     The rusticated ground storey, the giant Tuscan colonnade round the drum (the reading-room windows between the columns),
     the entablature, the recessed attic, the shallow lead dome; the two-storey Corinthian portico with its steps toward the
     square. The drum is sampled every 5 degrees; columns every 10, sorted far to near. */
  function library(v) {
    const S = SCENE_MCR_SPEC.library[v]; if (!S) return { body: [] };
    const C = M.cam(S.camera), [cx, cd] = S.at, r = S.r, fa = Math.atan2(S.face[1], S.face[0]);
    const near = [cx + Math.cos(fa) * r, cd + Math.sin(fa) * r], A = C.p(near[0], near[1] - 6, 0), G = M.pen(C, A), P = G.P;
    const ring = (rad, h, a) => [cx + Math.cos(a) * rad, cd + Math.sin(a) * rad, h];
    const seen = (a) => { const nx = Math.cos(a), nd = Math.sin(a), px = cx + nx * r, pd = cd + nd * r; return nx * -px + nd * -pd > 0; };
    const N = 72, step = Math.PI * 2 / N, arcs = [];
    for (let i = 0; i < N; i++) { const a = i * step; if (seen(a + step / 2)) arcs.push(a); }
    const band = (rad, h0, h1, col, x) => {
      for (const a of arcs) { const n = [Math.cos(a + step / 2), Math.sin(a + step / 2), 0]; G.poly3([ring(rad, h0, a), ring(rad, h0, a + step), ring(rad, h1, a + step), ring(rad, h1, a)], M.shadeBy(col, n), x); }
    };
    const line = (rad, h) => { let d = ''; for (const a of arcs) { const p = P(...ring(rad, h, a)), q = P(...ring(rad, h, a + step)); d += `M${R(p[0])} ${R(p[1])}L${R(q[0])} ${R(q[1])}`; } return d; };
    // the dome first (it rises behind the attic): the convex hull of its rings
    { const pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6, h = 27.6 + 6.4 * Math.sin(t * Math.PI / 2), rad = (r - 2.6) * Math.cos(t * Math.PI / 2) + 0.4; for (let i = 0; i < 48; i++) pts.push(P(...ring(rad, h, i / 48 * Math.PI * 2))); }
      pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
      for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (const p of pts.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
      const hull = lo.slice(0, -1).concat(hi.slice(0, -1)), top = P(cx, cd, 34), bot = P(cx, cd, 27.6);
      G.add({ lin: [[0, M.mix(LEAD, '#ffffff', 0.18)], [1, M.mix(LEAD, '#000000', 0.2)]], x1: R(top[0] - 120), y1: R(top[1]), x2: R(top[0] + 160), y2: R(bot[1]) }, 'M' + hull.map(G.ps).join('L') + 'Z');
      // the dome's ribs: meridians from the base ring to the crown, only the near ones
      let rib = ''; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; if (!seen(a)) continue; const q = []; for (let k = 0; k <= 5; k++) { const t = k / 5; q.push(P(...ring((r - 2.6) * Math.cos(t * Math.PI / 2) + 0.4, 27.6 + 6.4 * Math.sin(t * Math.PI / 2), a))); } rib += 'M' + q.map(G.ps).join('L'); }
      G.add(null, rib, { s: M.mix(LEAD, '#000000', 0.3), w: 0.8, op: 0.55, detail: true });
    }
    // the plinth storey (rusticated), the recessed wall of the colonnade, the attic
    band(r + 0.4, 0, 8.2, M.mix(PORTLAND, '#b8b0a0', 0.4));
    G.add(null, [1.2, 2.4, 3.6, 4.8, 6.0, 7.2].map(h => line(r + 0.42, h)).join(''), { s: PDARK, w: 0.9, op: 0.45, detail: true });
    band(r - 1.4, 8.2, 22, M.mix(PORTLAND, '#9a9484', 0.25));
    // windows: the plinth's small square ones and the tall reading-room lights between the columns (glass in 3 groups)
    const gl = ['', '', ''], cols = [];
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2 + Math.PI / 36; if (!seen(a)) continue;
      const w = 0.045, k = i % 3;
      gl[k] += G.path([P(...ring(r - 1.38, 11, a - w)), P(...ring(r - 1.38, 11, a + w)), P(...ring(r - 1.38, 19.5, a + w)), P(...ring(r - 1.38, 19.5, a - w))]);
      gl[(k + 1) % 3] += G.path([P(...ring(r + 0.42, 3.4, a - 0.035)), P(...ring(r + 0.42, 3.4, a + 0.035)), P(...ring(r + 0.42, 5.8, a + 0.035)), P(...ring(r + 0.42, 5.8, a - 0.035))]);
    }
    gl.forEach(d => G.add(GLASS, d, { glow: 'window' }));
    // the giant columns (every 10 degrees), far to near: shaft, base, capital
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; if (!seen(a)) continue; const p = ring(r, 0, a); cols.push([a, Math.hypot(p[0], p[1])]); }
    cols.sort((x, y) => y[1] - x[1]);
    for (const [a] of cols) {
      const n = [Math.cos(a), Math.sin(a), 0], hw = 0.6 / r, rc = r;
      G.poly3([ring(rc, 8.6, a - hw), ring(rc, 8.6, a + hw), ring(rc, 21, a + hw * 0.88), ring(rc, 21, a - hw * 0.88)], M.shadeBy(PORTLAND, n));
      G.poly3([ring(rc, 8.6, a), ring(rc, 8.6, a + hw), ring(rc, 21, a + hw * 0.88), ring(rc, 21, a)], M.shadeBy(M.mix(PORTLAND, '#706a5c', 0.3), [n[1], -n[0], 0]), { op: 0.5 });
      G.poly3([ring(rc + 0.15, 8.2, a - hw * 1.4), ring(rc + 0.15, 8.2, a + hw * 1.4), ring(rc + 0.15, 8.8, a + hw * 1.4), ring(rc + 0.15, 8.8, a - hw * 1.4)], M.shadeBy(PORTLAND, n));
      G.poly3([ring(rc + 0.15, 20.8, a - hw * 1.3), ring(rc + 0.15, 20.8, a + hw * 1.3), ring(rc + 0.15, 21.6, a + hw * 1.5), ring(rc + 0.15, 21.6, a - hw * 1.5)], M.shadeBy(PORTLAND, n));
    }
    // the entablature, the cornice line, the attic and its little windows
    band(r + 0.3, 21.6, 24, PORTLAND);
    G.add(null, line(r + 0.32, 22.4) + line(r + 0.32, 23.4), { s: PDARK, w: 0.8, op: 0.5, detail: true });
    band(r + 0.8, 24, 24.6, M.mix(PORTLAND, '#ffffff', 0.15));
    band(r - 0.8, 24.6, 27.8, M.mix(PORTLAND, '#a8a292', 0.2));
    // the portico: a two-storey Corinthian temple front on a podium of steps, six columns, the entablature and attic
    const fx = Math.cos(fa), fd = Math.sin(fa), tx = -fd, td = fx, o0 = [cx + fx * (r - 2), cd + fd * (r - 2)], depth = 7.5, W = 26;
    const pt = (s, out, h) => [o0[0] + tx * s + fx * out, o0[1] + td * s + fd * out, h];
    const block = (s0, s1, o0_, o1_, h0, h1, col) => G.prism([[pt(s0, o1_)[0], pt(s0, o1_)[1]], [pt(s1, o1_)[0], pt(s1, o1_)[1]], [pt(s1, o0_)[0], pt(s1, o0_)[1]], [pt(s0, o0_)[0], pt(s0, o0_)[1]]].reverse().map(p => p), h0, h1, col);
    // steps (three) and the podium
    block(-W / 2 - 3, W / 2 + 3, 0, depth + 3.4, 0, 0.6, '#c8c2b2'); block(-W / 2 - 2, W / 2 + 2, 0, depth + 2.4, 0.6, 1.2, '#ccc6b6'); block(-W / 2 - 1, W / 2 + 1, 0, depth + 1.4, 1.2, 1.8, '#d0cab8');
    // the back wall of the portico (the doors and the windows over them)
    const Wb = G.wall([pt(-W / 2, 0.5)[0], pt(-W / 2, 0.5)[1]], [pt(W / 2, 0.5)[0], pt(W / 2, 0.5)[1]]);
    const wA = Wb.vis ? Wb : G.wall([pt(W / 2, 0.5)[0], pt(W / 2, 0.5)[1]], [pt(-W / 2, 0.5)[0], pt(-W / 2, 0.5)[1]]);
    G.add(M.mix(PORTLAND, '#3a362e', 0.55), G.path([wA.scr(0, 1.8), wA.scr(W, 1.8), wA.scr(W, 22), wA.scr(0, 22)]));
    for (const s of [W * 0.3, W * 0.5, W * 0.7]) { G.add('#2a2219', G.path([wA.scr(s - 1.1, 1.8), wA.scr(s + 1.1, 1.8), wA.scr(s + 1.1, 5.6), wA.scr(s - 1.1, 5.6)]), { glow: 'window' }); G.add(GLASS, G.path([wA.scr(s - 0.8, 8.4), wA.scr(s + 0.8, 8.4), wA.scr(s + 0.8, 12.6), wA.scr(s - 0.8, 12.6)]), { glow: 'window' }); }
    // the columns of the portico (two rows: the front six and the two returns), far to near
    const pc = []; for (let i = 0; i < 6; i++) pc.push(pt(-W / 2 + 1.6 + i * (W - 3.2) / 5, depth)); pc.push(pt(-W / 2 + 1.6, depth * 0.45), pt(W / 2 - 1.6, depth * 0.45));
    pc.sort((p, q) => Math.hypot(q[0], q[1]) - Math.hypot(p[0], p[1]));
    for (const p of pc) {
      const b = P(p[0], p[1], 1.8), t = P(p[0], p[1], 20.6), k = C.f / Math.hypot(p[0], p[1]), w = 0.65 * k;
      G.add(M.shadeBy(PORTLAND, [-0.6, -0.8, 0]), `M${R(b[0] - w)} ${R(b[1])}L${R(t[0] - w * 0.86)} ${R(t[1])}L${R(t[0] + w * 0.86)} ${R(t[1])}L${R(b[0] + w)} ${R(b[1])}Z`);
      G.add(M.mix(PORTLAND, '#6a6456', 0.35), `M${R(b[0] + w * 0.25)} ${R(b[1])}L${R(t[0] + w * 0.2)} ${R(t[1])}L${R(t[0] + w * 0.86)} ${R(t[1])}L${R(b[0] + w)} ${R(b[1])}Z`, { op: 0.6 });
      if (w > 2) { let fl = ''; for (const f of [-0.5, 0, 0.5]) fl += `M${R(b[0] + w * f)} ${R(b[1] - 2)}L${R(t[0] + w * f * 0.86)} ${R(t[1] + 2)}`; G.add(null, fl, { s: PDARK, w: 0.6, op: 0.35, detail: true }); }
      G.add(M.mix(PORTLAND, '#ffffff', 0.2), `M${R(t[0] - w * 1.25)} ${R(t[1])}L${R(t[0] - w * 0.9)} ${R(t[1] + w * 1.2)}L${R(t[0] + w * 0.9)} ${R(t[1] + w * 1.2)}L${R(t[0] + w * 1.25)} ${R(t[1])}Z`);
      G.add(M.shadeBy(PORTLAND, [-0.6, -0.8, 0]), `M${R(b[0] - w * 1.3)} ${R(b[1])}V${R(b[1] - w * 0.6)}H${R(b[0] + w * 1.3)}V${R(b[1])}Z`);
    }
    // the entablature and the attic over the portico
    block(-W / 2, W / 2, 0, depth + 0.6, 20.6, 23.4, PORTLAND);
    block(-W / 2 + 0.3, W / 2 - 0.3, 0, depth + 0.9, 23.4, 24.0, M.mix(PORTLAND, '#ffffff', 0.2));
    { const Wf = G.wall([pt(-W / 2, depth + 0.6)[0], pt(-W / 2, depth + 0.6)[1]], [pt(W / 2, depth + 0.6)[0], pt(W / 2, depth + 0.6)[1]]); const Wx = Wf.vis ? Wf : null;
      if (Wx) { M.bands(G, Wx, 0, W, [21.4, 22.6], 0.18, PDARK); } }
    return { body: G.S };
  }
  sceneObjDefine({
    id: 'landmark.mcr-central-library', category: 'landmark', size: [900, 520], variants: 2, seasonal: false, flippable: false, detailPx: 300,
    palette: { base: {} }, parts: ['body'], shadow: false, real: { h: 34, l: 50, w: 50 },
    night: { glow: { window: '#ffdc9a' }, on: 0.6 },
    tags: ['uk', 'manchester', 'landmark', 'signature', 'library', 'rotunda', 'classical', 'perspective', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Manchester civic-quarter views: Manchester Central Library (E. Vincent Harris, 1934), in the camera\'s perspective',
    build(v) { return library(v); },
  });

  /* ---------- landmark.mcr-town-hall-extension: Harris's 1938 Extension, Portland stone, tall Gothic-tinged window strips,
     a steep slate roof with dormers; the front bends round the square in three planes. ---------- */
  function extension(v) {
    const S = SCENE_MCR_SPEC.extension[v]; if (!S) return { body: [] };
    const C = M.cam(S.camera), F = S.foot, A = C.p(F[1][0], F[1][1], 0), G = M.pen(C, A), r = M.rnd(91 + v);
    const H = 30, RH = 40;
    for (let i = 0; i < F.length - 1; i++) {
      const W = G.wall(F[i], F[i + 1]); if (!W.vis) continue;
      M.roof(G, W, 0, W.L, S.depth, H, RH, SLATE, false);
      for (let s = 3; s < W.L - 2; s += 5.2) { const a = W.at(s, H + 3.2, -3.2); const b = W.at(s + 1.6, H + 3.2, -3.2); G.poly3([[a[0], a[1], H + 2], [b[0], b[1], H + 2], [b[0], b[1], H + 4.6], [a[0], a[1], H + 4.6]], GLASS, { glow: 'window' }); }
      G.add(M.shadeBy(PORTLAND, W.n3), G.path([W.scr(0, 0), W.scr(W.L, 0), W.scr(W.L, H), W.scr(0, H)]));
      M.coursing(G, W, 0, W.L, 0.5, H, 0.7, PDARK);
      G.add(M.mix(PORTLAND, '#4a4438', 0.3), G.path([W.scr(0, 0), W.scr(W.L, 0), W.scr(W.L, 4.4), W.scr(0, 4.4)]));
      // the tall window strips: lancet-headed, running up through four storeys between plain piers
      const bays = Math.max(3, Math.round(W.L / 4.2));
      M.windows(G, W, { s0: 0.6, s1: W.L - 0.6, bays, z0: 1.2, z1: 3.9, kind: 'flat', rnd: r, glass: GLASS, frame: M.mix(PORTLAND, '#5a5446', 0.5), trim: PORTLAND, lights: 1, fill: 0.5 });
      M.windows(G, W, { s0: 0.6, s1: W.L - 0.6, bays, z0: 6, z1: 26.5, kind: 'point', rnd: r, glass: GLASS, frame: M.mix(PORTLAND, '#5a5446', 0.4), trim: PORTLAND, lights: 2, fill: 0.46, gap: 0.2 });
      // the spandrel bars across the window strips at each floor
      let sp = ''; for (const z of [10.4, 14.6, 18.8, 23]) for (let b = 0; b < bays; b++) { const c = 0.6 + (W.L - 1.2) * (b + 0.5) / bays, w = Math.min((W.L - 1.2) / bays * 0.46, 4) / 2; sp += G.path([W.scr(c - w, z, 0.05), W.scr(c + w, z, 0.05), W.scr(c + w, z + 0.6, 0.05), W.scr(c - w, z + 0.6, 0.05)]); }
      G.add(M.shadeBy(PORTLAND, W.n3), sp, { detail: true });
      M.bands(G, W, 0, W.L, [H - 1.2], 0.6, M.mix(PORTLAND, '#ffffff', 0.15));
    }
    return { body: G.S };
  }
  sceneObjDefine({
    id: 'landmark.mcr-town-hall-extension', category: 'landmark', size: [900, 360], variants: 1, seasonal: false, flippable: false, detailPx: 300,
    palette: { base: {} }, parts: ['body'], shadow: false, real: { h: 40, l: 90, w: 22 },
    night: { glow: { window: '#ffdc9a' }, on: 0.45 },
    tags: ['uk', 'manchester', 'landmark', 'civic', 'perspective', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Manchester civic-quarter views: the Town Hall Extension (E. Vincent Harris, 1938), in the camera\'s perspective',
    build(v) { return extension(v); },
  });

  /* ---------- landmark.mcr-town-hall-tower-far: the Town Hall's clock tower seen far off over the roofs (v2) ---------- */
  sceneObjDefine({
    id: 'landmark.mcr-town-hall-tower-far', category: 'landmark', size: [140, 500], variants: 1, seasonal: false, flippable: false, detailPx: 300,
    palette: { base: {} }, parts: ['body'], shadow: false, real: { h: 87, l: 13, w: 13 },
    night: { glow: { window: '#ffd98a', lamp: '#fff2c8' }, on: 0.4 },
    tags: ['uk', 'manchester', 'landmark', 'clock-tower', 'perspective', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Manchester civic-quarter views: the Town Hall clock tower over the roofs',
    build(v) {
      const S = SCENE_MCR_SPEC.tower[v]; if (!S) return { body: [] };
      const C = M.cam(S.camera), [x, d] = S.at, A = C.p(x, d, 0), G = M.pen(C, A), STONE = '#a99070', TRIM = '#c9b48c';
      const sq = (hw) => [[x - hw, d - hw], [x + hw, d - hw], [x + hw, d + hw], [x - hw, d + hw]];
      G.prism(sq(6.5), 30, 62, STONE); G.prism(sq(5.4), 62, 70.5, STONE);
      const W = G.wall(sq(6.5)[0], sq(6.5)[1]);
      const cc = W.scr(6.5, 56.8, 0.1), rr = Math.max(1, W.px(3.2));
      G.add('#e9e2cc', `M${R(cc[0] - rr)} ${R(cc[1])}a${R(rr)} ${R(rr)} 0 1 0 ${R(2 * rr)} 0a${R(rr)} ${R(rr)} 0 1 0 ${R(-2 * rr)} 0Z`, { glow: 'lamp' });
      M.windows(G, W, { s0: 1, s1: 12, bays: 2, z0: 62.8, z1: 69.4, kind: 'point', rnd: () => 0.99, glass: '#1c1814', frame: '#4a3e30', trim: TRIM, lights: 1, fill: 0.62 });
      G.pyramid(sq(3.9), 70.5, [x, d, 86], '#4a5658');
      for (const p of sq(6.5)) G.pinnacle(p[0], p[1], 60, 74, 1.6, TRIM, false);
      G.pinnacle(x, d, 85, 88.5, 0.35, '#8a7a4a', false);
      return { body: G.S };
    },
  });

  /* ---------- landmark.mcr-cenotaph: Lutyens's 1924 Cenotaph, Portland stone ----------
     The stepped pylon with the shrouded effigy on its bier on top, the two obelisks either side with their urns, the Stone
     of Remembrance in front; poppy wreaths at its foot. Projected boxes in the view's camera. */
  sceneObjDefine({
    id: 'landmark.mcr-cenotaph', category: 'landmark', size: [300, 260], variants: 1, seasonal: false, flippable: false, detailPx: 300,
    palette: { base: {} }, parts: ['body'], shadow: false, real: { h: 9.8, l: 16, w: 6 },
    tags: ['uk', 'manchester', 'landmark', 'memorial', 'cenotaph', 'perspective', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Manchester civic-quarter views: the Manchester Cenotaph (Sir Edwin Lutyens, 1924), in the camera\'s perspective',
    build(v) {
      const S = SCENE_MCR_SPEC.cenotaph[v]; if (!S) return { body: [] };
      const C = M.cam(S.camera), [x, d] = S.at, ro = S.rot || 0, A = C.p(x, d - 4, 0), G = M.pen(C, A);
      const at = (a, b) => [x + a * Math.cos(ro) - b * Math.sin(ro), d + a * Math.sin(ro) + b * Math.cos(ro)];
      const box = (a0, a1, b0, b1, h0, h1, col) => G.prism([at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)], h0, h1, col || '#bdb4a0');
      // the platform (paved, three steps), then back to front: the obelisks, the pylon, the Stone of Remembrance
      box(-9, 9, -5, 4, 0, 0.3, '#bdb6a6'); box(-8.4, 8.4, -4.4, 3.4, 0.3, 0.6, '#c6bfae');
      for (const s of [-6.6, 6.6]) {
        box(s - 0.9, s + 0.9, 0.2, 1.6, 0.6, 1.4); box(s - 0.6, s + 0.6, 0.35, 1.45, 1.4, 7.6);
        const p = at(s, 0.9); G.pyramid([at(s - 0.6, 0.35), at(s + 0.6, 0.35), at(s + 0.6, 1.45), at(s - 0.6, 1.45)], 7.6, [p[0], p[1], 8.6], PORTLAND);
        const u = C.p(p[0], p[1], 8.6), k = C.f / p[1]; G.add('#c8b890', `M${R(u[0] - A[0] - 0.3 * k)} ${R(u[1] - A[1])}q${R(0.3 * k)} ${R(-0.9 * k)} ${R(0.6 * k)} 0Z`);
      }
      box(-1.8, 1.8, 0, 2.4, 0.6, 1.6); box(-1.5, 1.5, 0.2, 2.2, 1.6, 7.4); box(-1.7, 1.7, 0.1, 2.3, 7.4, 8.0);
      box(-1.1, 1.1, 0.5, 1.9, 8.0, 8.9, '#e2dccc');
      { const p = at(0, 1.2), u = C.p(p[0], p[1], 8.9), k = C.f / p[1]; G.add('#e8e2d2', `M${R(u[0] - A[0] - 1.0 * k)} ${R(u[1] - A[1])}Q${R(u[0] - A[0])} ${R(u[1] - A[1] - 0.9 * k)} ${R(u[0] - A[0] + 1.0 * k)} ${R(u[1] - A[1])}Z`); }
      // the Stone of Remembrance in front
      box(-2.0, 2.0, -3.6, -2.4, 0.6, 0.9, '#c6bfae'); box(-1.8, 1.8, -3.5, -2.5, 0.9, 1.75, '#ddd6c4');
      // poppy wreaths leaning on the pylon's foot
      for (const s of [-1.2, 0, 1.2]) { const p = at(s, -0.05), u = C.p(p[0], p[1], 1.0), k = C.f / p[1], rr = 0.38 * k; G.add('#b0202a', `M${R(u[0] - A[0] - rr)} ${R(u[1] - A[1])}a${R(rr)} ${R(rr)} 0 1 0 ${R(2 * rr)} 0a${R(rr)} ${R(rr)} 0 1 0 ${R(-2 * rr)} 0ZM${R(u[0] - A[0] - rr * 0.5)} ${R(u[1] - A[1])}a${R(rr * 0.5)} ${R(rr * 0.5)} 0 1 1 ${R(rr)} 0a${R(rr * 0.5)} ${R(rr * 0.5)} 0 1 1 ${R(-rr)} 0Z`); G.add('#2a4a2a', `M${R(u[0] - A[0] - rr * 0.15)} ${R(u[1] - A[1] + rr * 0.6)}h${R(rr * 0.3)}v${R(rr * 0.9)}h${R(-rr * 0.3)}Z`); }
      return { body: G.S };
    },
  });

  /* ---------- landmark.mcr-midland-hotel: Charles Trubshaw's 1903 Midland Hotel, red brick and brown terracotta ----------
     Six storeys and the attic: banded red brick and buff-brown terracotta, segmental and arched windows in pairs, oriel bays,
     the corner turrets with their domed tops, the green-slate mansard with dormers. Walls from the footprint (CCW). */
  sceneObjDefine({
    id: 'landmark.mcr-midland-hotel', category: 'landmark', size: [1200, 480], variants: 2, seasonal: false, flippable: false, detailPx: 300,
    palette: { base: {} }, parts: ['body'], shadow: false, real: { h: 34, l: 120, w: 70 },
    night: { glow: { window: '#ffd38a', lamp: '#ffe6b0' }, on: 0.62 },
    tags: ['uk', 'manchester', 'landmark', 'hotel', 'edwardian', 'terracotta', 'perspective', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Manchester civic-quarter views: the Midland Hotel (Charles Trubshaw, 1903), in the camera\'s perspective',
    build(v) {
      const S = SCENE_MCR_SPEC.midland[v]; if (!S) return { body: [] };
      const C = M.cam(S.camera), F = S.foot, near = SCENE_MCR_NEAR(F), A = C.p(near[0], near[1], 0), G = M.pen(C, A), r = M.rnd(71 + v);
      const BRICK = '#9a3e2c', TERRA = '#b07a52', TDARK = '#6a4430', ROOF = '#4e6058', H = 27, RH = 34;
      const walls = [];
      for (let i = 0; i < F.length; i++) { const W = G.wall(F[i], F[(i + 1) % F.length]); if (W.vis) walls.push(W); }
      for (const W of walls) {
        M.roof(G, W, 0, W.L, 12, H, RH, ROOF, true);
        for (let s = 4; s < W.L - 4; s += 6.4) { const a = W.at(s, H, -2.6), b = W.at(s + 2, H, -2.6); G.poly3([[a[0], a[1], H + 1.2], [b[0], b[1], H + 1.2], [b[0], b[1], H + 3.6], [a[0], a[1], H + 3.6]], M.mix(TERRA, '#000000', 0.15)); G.poly3([W.at(s + 0.4, H + 1.6, -2.62), W.at(s + 1.6, H + 1.6, -2.62), W.at(s + 1.6, H + 3.2, -2.62), W.at(s + 0.4, H + 3.2, -2.62)], GLASS, { glow: 'window' }); }
        G.add(M.shadeBy(BRICK, W.n3), G.path([W.scr(0, 0), W.scr(W.L, 0), W.scr(W.L, H), W.scr(0, H)]));
        // terracotta: the ground storey, the bands at each floor, the cornice
        G.add(M.shadeBy(TERRA, W.n3), G.path([W.scr(0, 0), W.scr(W.L, 0), W.scr(W.L, 5.4), W.scr(0, 5.4)]));
        M.bands(G, W, 0, W.L, [9.4, 13.2, 17, 20.8], 0.5, M.shadeBy(TERRA, W.n3));
        M.bands(G, W, 0, W.L, [H - 1.6], 1.6, M.shadeBy(M.mix(TERRA, '#ffffff', 0.1), W.n3));
        M.coursing(G, W, 0, W.L, 5.4, H - 1.6, 0.3, '#5a2418');
        const bays = Math.max(3, Math.round(W.L / 3.6));
        M.windows(G, W, { s0: 0.5, s1: W.L - 0.5, bays, z0: 1, z1: 4.6, kind: 'round', rnd: r, glass: GLASS, frame: TDARK, trim: TERRA, lights: 1, fill: 0.62 });
        for (const z of [6.2, 10.2, 14, 17.8, 21.6]) M.windows(G, W, { s0: 0.5, s1: W.L - 0.5, bays, z0: z, z1: z + 2.7, kind: z > 21 ? 'round' : 'seg', rnd: r, glass: GLASS, frame: TDARK, trim: TERRA, lights: 2, fill: 0.56, gap: 0.22 });
        // oriel bays (terracotta, two storeys) every few bays and pilasters between groups
        const ss = []; for (let s = 9; s < W.L - 6; s += 18) ss.push(s);
        for (const s of ss) {
          for (const [z0, z1] of [[9.6, 17]]) {
            const e = W.scr(s - 1.8, z0, 0.9), f = W.scr(s + 1.8, z0, 0.9), g = W.scr(s + 1.8, z1, 0.9), hh = W.scr(s - 1.8, z1, 0.9);
            G.add(M.shadeBy(TERRA, W.n3), G.path([e, f, g, hh]));
            G.add(GLASS, G.path([W.scr(s - 1.3, z0 + 0.8, 0.92), W.scr(s + 1.3, z0 + 0.8, 0.92), W.scr(s + 1.3, z0 + 3, 0.92), W.scr(s - 1.3, z0 + 3, 0.92)]) + G.path([W.scr(s - 1.3, z0 + 4.4, 0.92), W.scr(s + 1.3, z0 + 4.4, 0.92), W.scr(s + 1.3, z0 + 6.6, 0.92), W.scr(s - 1.3, z0 + 6.6, 0.92)]), { glow: 'window' });
          }
        }
        M.buttresses(G, W, ss.map(s => s + 6).filter(s => s < W.L - 2), 5.4, H - 1.6, 0.8, M.shadeBy(TERRA, W.n3), -1);
      }
      // the corner turrets: round towers proud of the corners, banded, with domed caps and finials
      if (S.corner) for (let i = 0; i < F.length; i++) {
        const p = F[i], d0 = Math.hypot(p[0], p[1]); if (d0 > Math.min(...F.map(q => Math.hypot(q[0], q[1]))) + 40) continue;
        const rr = 3.4, ring = (rad, h, a) => [p[0] + Math.cos(a) * rad, p[1] + Math.sin(a) * rad, h];
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, b = a + Math.PI / 8, n = [Math.cos(a + Math.PI / 16), Math.sin(a + Math.PI / 16), 0]; if (n[0] * -p[0] + n[1] * -p[1] <= 0) continue; G.poly3([ring(rr, 0, a), ring(rr, 0, b), ring(rr, H + 4, b), ring(rr, H + 4, a)], M.shadeBy(k % 4 ? BRICK : TERRA, n)); }
        { const bc = G.P(p[0], p[1], H + 4), k = C.f / Math.hypot(p[0], p[1]), rx = rr * k * 1.08, ry = 4.2 * k;
          G.add({ lin: [[0, M.mix(ROOF, '#ffffff', 0.25)], [1, M.mix(ROOF, '#000000', 0.15)]], x1: R(bc[0] - rx), y1: 0, x2: R(bc[0] + rx), y2: 0 }, `M${R(bc[0] - rx)} ${R(bc[1])}C${R(bc[0] - rx)} ${R(bc[1] - ry * 1.3)} ${R(bc[0] + rx)} ${R(bc[1] - ry * 1.3)} ${R(bc[0] + rx)} ${R(bc[1])}Z`);
          G.add(M.shadeBy(TERRA, [-0.5, -0.8, 0]), `M${R(bc[0] - rx * 1.1)} ${R(bc[1] + 0.8 * k)}H${R(bc[0] + rx * 1.1)}V${R(bc[1])}H${R(bc[0] - rx * 1.1)}Z`); }
        G.pinnacle(p[0], p[1], H + 7.6, H + 10.5, 0.4, '#8a7a4a', false);
        const Wt = G.wall([p[0] - rr, p[1] - rr * 0.2], [p[0] + rr, p[1] - rr * 0.2]);
        for (const z of [6.2, 10.2, 14, 17.8, 21.6, 25.4]) G.add(GLASS, G.path([Wt.scr(rr - 0.6, z, 0.2), Wt.scr(rr + 0.6, z, 0.2), Wt.scr(rr + 0.6, z + 2.4, 0.2), Wt.scr(rr - 0.6, z + 2.4, 0.2)]), { glow: 'window' });
      }
      // the entrance canopy on Peter Street (a glazed iron canopy) over the nearest wall
      { const W = walls[0]; if (W) { const s = W.L * 0.5; G.add('#2e3438', G.path([W.scr(s - 6, 4.6, 2.8), W.scr(s + 6, 4.6, 2.8), W.scr(s + 6, 5.2, 0), W.scr(s - 6, 5.2, 0)])); G.add('#ffe2a8', G.path([W.scr(s - 5.6, 4.3, 2.4), W.scr(s + 5.6, 4.3, 2.4), W.scr(s + 5.6, 4.6, 2.4), W.scr(s - 5.6, 4.6, 2.4)]), { glow: 'lamp' }); } }
      return { body: G.S };
    },
  });

  /* ---------- building.mcr-glass-tower: One St Peter's Square (2014): a glass and pale-metal office slab, fins and spandrels ---------- */
  sceneObjDefine({
    id: 'building.mcr-glass-tower', category: 'building', size: [600, 700], variants: 1, seasonal: false, flippable: false, detailPx: 300,
    palette: { base: {} }, parts: ['body'], shadow: false, real: { h: 58, l: 32, w: 56 },
    night: { glow: { window: '#f4f0dc' }, on: 0.5 },
    tags: ['uk', 'manchester', 'office', 'glass', 'modern', 'perspective', 'kit:urban', 'role:building-near', 'class:building'],
    credit: 'drawn for the Manchester civic-quarter views: One St Peter\'s Square, in the camera\'s perspective',
    build(v) {
      const S = SCENE_MCR_SPEC.glass[v]; if (!S) return { body: [] };
      const C = M.cam(S.camera), F = S.foot, near = SCENE_MCR_NEAR(F), A = C.p(near[0], near[1], 0), G = M.pen(C, A), H = S.h;
      for (let i = 0; i < F.length; i++) {
        const W = G.wall(F[i], F[(i + 1) % F.length]); if (!W.vis) continue;
        G.add({ lin: [[0, M.shadeBy('#6a8296', W.n3)], [1, M.shadeBy('#3e5266', W.n3)]], x1: 0, y1: R(W.scr(0, H)[1]), x2: 0, y2: R(W.scr(0, 0)[1]) }, G.path([W.scr(0, 0), W.scr(W.L, 0), W.scr(W.L, H), W.scr(0, H)]));
        // the sky reflected in the upper glass, lit floors in three groups, the fins and the floor slabs
        const g = ['', '', '']; for (let z = 5; z < H - 1; z += 3.6) for (let s = 0; s < W.L - 0.1; s += 1.5) if ((s * 7 + z) % 3 < 2.2) g[Math.floor((s * 13 + z * 3) % 3)] += G.path([W.scr(s + 0.1, z + 0.4), W.scr(s + 1.4, z + 0.4), W.scr(s + 1.4, z + 3.2), W.scr(s + 0.1, z + 3.2)]);
        g.forEach(d => G.add(M.shadeBy('#34485a', W.n3), d, { glow: 'window', op: 0.85 }));
        let fins = ''; for (let s = 0; s <= W.L; s += 1.5) fins += G.seg(W.scr(s, 4.4, 0.15), W.scr(s, H, 0.15));
        G.add(null, fins, { s: '#c8ccd0', w: Math.max(0.6, W.px(0.18)), op: 0.8 });
        let sl = ''; for (let z = 4.4; z < H; z += 3.6) sl += G.path([W.scr(0, z, 0.1), W.scr(W.L, z, 0.1), W.scr(W.L, z + 0.5, 0.1), W.scr(0, z + 0.5, 0.1)]);
        G.add(M.shadeBy('#d8dcde', W.n3), sl);
        G.add('#2a3036', G.path([W.scr(0, 0), W.scr(W.L, 0), W.scr(W.L, 4.4), W.scr(0, 4.4)]));
        G.add('#fff0c8', G.path([W.scr(1, 0.3), W.scr(W.L - 1, 0.3), W.scr(W.L - 1, 3.6), W.scr(1, 3.6)]), { glow: 'window', op: 0.5 });
      }
      return { body: G.S };
    },
  });

  /* ---------- small things of the tram stop and the square (elevation objects) ----------
     street.mcr-tram-shelter   the Metrolink platform canopy: slim grey posts, a glass roof, a lit timetable panel, a bench
     street.mcr-peters-cross   St Peter's Cross: the stone cross on its stepped base marking the old church */
  sceneObjDefine({
    id: 'street.mcr-tram-shelter', category: 'street', size: [420, 170], variants: 2, seasonal: false, flippable: true,
    palette: { base: { steel: ['#5a6268', '#3a4046', '#8a9298'], glass: '#a8c0cc', panel: '#f0f4f2', seat: '#6a6e72', yellow: '#f2c81a' } },
    parts: ['body', 'lit'], shadow: false, real: { h: 3.4, l: 8.4 },
    night: { glow: { lamp: '#f6f6ea' }, on: 1 },
    tags: ['uk', 'manchester', 'tram', 'shelter', 'platform', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester civic-quarter views: a Metrolink platform canopy (no lettering)',
    build(v) {
      const b = [], lit = [];
      b.push({ f: '@steel.1', d: 'M-196 0V-160H-188V0ZM188 0V-160H196V0ZM-6 0V-160H6V0Z' });
      b.push({ f: '@glass', d: 'M-208 -160L-200 -170H200L208 -160Z', op: 0.75 }, { f: '@steel.0', d: 'M-208 -160H208V-154H-208Z' });
      b.push({ f: '@glass', d: 'M-186 -150H-10V-30H-186Z', op: 0.35 }, { s: '@steel.2', w: 2, d: 'M-186 -150H-10V-30H-186Z' });
      b.push({ f: '@seat', d: 'M20 -40H120V-34H20ZM28 -34V0H32V-34ZM108 -34V0H112V-34Z' });
      b.push({ f: '@steel.1', d: 'M140 -120H176V-40H140Z' }, { f: '@panel', d: 'M144 -116H172V-58H144Z' }, { f: '@yellow', d: 'M144 -116H172V-108H144Z' });
      lit.push({ f: '@panel', d: 'M144 -116H172V-58H144Z', glow: 'lamp' }, { f: '@panel', d: 'M-196 -156H196V-153H-196Z', glow: 'lamp' });
      if (v === 1) b.push({ f: '@yellow', d: 'M-200 -10H200V0H-200Z', op: 0.9 });
      return { body: b, lit };
    },
  });
  sceneObjDefine({
    id: 'street.mcr-peters-cross', category: 'street', size: [90, 230], variants: 1, seasonal: false, flippable: false,
    palette: { base: { stone: ['#9a9286', '#7a7266', '#b4ac9e'] } },
    parts: ['body'], shadow: { rx: 40, ry: 6, h: 220 }, real: { h: 6.4, l: 2.6 },
    tags: ['uk', 'manchester', 'cross', 'memorial', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester civic-quarter views: St Peter\'s Cross, marking the site of St Peter\'s Church',
    build() {
      return { body: [{ f: '@stone.1', d: 'M-42 0V-12H42V0Z' }, { f: '@stone.0', d: 'M-34 -12V-24H34V-12Z' }, { f: '@stone.0', d: 'M-14 -24V-44H14V-24Z' },
        { f: '@stone.0', d: 'M-7 -44V-152H-26V-168H-7V-206Q0 -214 7 -206V-168H26V-152H7V-44Z' }, { f: '@stone.1', d: 'M2 -44V-206Q5 -210 7 -206V-168H26V-160H7V-44Z', op: 0.6 },
        { f: '@stone.2', d: 'M-12 -170a12 12 0 1 0 24 0a12 12 0 1 0 -24 0ZM-8 -170a8 8 0 1 1 16 0a8 8 0 1 1 -16 0Z', op: 0.8 }] };
    },
  });
})();

/* ---------- structure.mcr-planter: a raised granite planter of the new squares: a low bench edge, grasses, shrubs, seasonal
   flowers, a small multi-stem birch in v1 (seasonal: bare twigs in winter, gold in autumn) ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = SCENE_MCR.R1;
  const ell = (cx, cy, rx, ry) => `M${R(cx - rx)} ${R(cy)}a${R(rx)} ${R(ry)} 0 1 0 ${R(2 * rx)} 0a${R(rx)} ${R(ry)} 0 1 0 ${R(-2 * rx)} 0Z`;
  sceneObjDefine({
    id: 'structure.mcr-planter', category: 'structure', size: [440, 320], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    palette: {
      base: { granite: ['#9c968c', '#7a746a', '#bab4a8'], wood: ['#a07a50', '#7a5a38'], leaf: ['#4a6e34', '#3a5a2a', '#6a8e48'], grass: ['#8a9a5a', '#6a7a40'], bloom: ['#c84a6a', '#e8d070', '#8a5ac0'], bark: ['#e8e2d8', '#3a3430'] },
      autumn: { leaf: ['#a0782e', '#7a5a26', '#c8983a'], grass: ['#b49a5a', '#8a7440'], bloom: ['#c8642c', '#a03a2a', '#e0a040'] },
      winter: { leaf: ['#4a5640', '#3a4434', '#5a6450'], grass: ['#a89a74', '#8a7c58'], bloom: ['#6a6058', '#5a5048', '#7a7068'] },
      spring: { leaf: ['#6a9a44', '#4e7a34', '#9cc06a'], bloom: ['#f0d040', '#e8e8e0', '#c070c0'] },
    },
    parts: ['body'], shadow: false, real: { h: 3.6, l: 7 },
    tags: ['uk', 'planter', 'square', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester civic-quarter views: a raised planter with a timber bench edge',
    build(v, r, ctx) {
      const b = [], se = (ctx && ctx.season) || 'summer';
      // the multi-stem birch (v1) behind the planting
      if (v === 1) {
        // a multi-stem birch: four white stems with black lenticels, forking into fine branches; leaves in small loose
        // sprays at the branch tips (no blob), gold in autumn, bare purple-brown twigs in winter
        const stems = [[-34, -16, 6], [-14, 8, 7], [8, -6, 6], [26, 22, 5]], tips = [];
        let st = '', mk = '', br = '';
        for (const [x, lean, w] of stems) {
          const tx = x + lean, ty = -250 + Math.abs(lean) * 1.5;
          st += `M${x - w / 2} -40L${R(tx - 1)} ${R(ty)}L${R(tx + 1)} ${R(ty)}L${x + w / 2} -40Z`;
          for (let k = 0; k < 6; k++) { const t = 0.15 + r() * 0.7, mx = x + (tx - x) * t, my = -40 + (ty + 40) * t; mk += `M${R(mx - w * 0.4)} ${R(my)}h${R(w * (0.3 + r() * 0.4))}v${R(1.4 + r())}h${R(-w * 0.5)}Z`; }
          for (let k = 0; k < 5; k++) { const t = 0.45 + r() * 0.5, mx = x + (tx - x) * t, my = -40 + (ty + 40) * t, dx = (r() < 0.5 ? -1 : 1) * (18 + r() * 34), dy = -14 - r() * 40; br += `M${R(mx)} ${R(my)}q${R(dx * 0.4)} ${R(dy * 0.7)} ${R(dx)} ${R(dy)}`; tips.push([mx + dx, my + dy]); }
          tips.push([tx, ty]);
        }
        b.push({ f: '@bark.0', d: st }, { f: '@bark.1', d: mk, op: 0.85 }, { f: null, s: '#7a6a62', w: 1.6, d: br });
        if (se !== 'winter') {
          const ds = ['', '', ''];
          for (const [cx, cy] of tips) for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.7) * 26; ds[Math.floor(r() * 3)] += ell(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.7 + 6), Math.round(3.4 + r() * 2.6), Math.round(2.4 + r() * 1.6)); }
          ds.forEach((d, i) => b.push({ f: '@leaf.' + i, d }));
        } else {
          let tw = ''; for (const [cx, cy] of tips) for (let i = 0; i < 6; i++) tw += `M${R(cx)} ${R(cy)}l${R((r() - 0.5) * 30)} ${R(-4 - r() * 18)}`;
          b.push({ f: null, s: '#5a4448', w: 0.8, d: tw, op: 0.8 });
        }
      }
      // the planting: grasses, shrubs, flowers
      const sh = ['', '', '']; for (let i = 0; i < 26; i++) { const x = -190 + r() * 380; sh[i % 3] += ell(x, -46 - r() * 14, 14 + r() * 14, 10 + r() * 8); }
      sh.forEach((d, i) => b.push({ f: '@leaf.' + i, d }));
      let gr = ''; for (let i = 0; i < 40; i++) { const x = -196 + r() * 392, h = 18 + r() * 26; gr += `M${R(x)} -40q${R((r() - 0.5) * 10)} ${R(-h * 0.6)} ${R((r() - 0.5) * 14)} ${R(-h)}`; }
      b.push({ f: null, s: '@grass.0', w: 2, d: gr }, { f: null, s: '@grass.1', w: 1.4, d: gr.replace(/q/g, 'q'), op: 0.5 });
      const fl = ['', '', '']; for (let i = 0; i < 40; i++) fl[i % 3] += ell(-180 + r() * 360, -54 - r() * 18, 2.6, 2.6);
      fl.forEach((d, i) => b.push({ f: '@bloom.' + i, d }));
      // the granite box with its timber bench edge
      b.push({ f: '@granite.0', d: 'M-210 0V-44H210V0Z' }, { f: '@granite.1', d: 'M-210 0V-10H210V0Z', op: 0.6 }, { f: '@granite.2', d: 'M-212 -44V-48H212V-44Z' });
      let slats = ''; for (let i = 0; i < 4; i++) slats += `M-200 ${-36 + i * 6}H200V${-32 + i * 6}H-200Z`;
      b.push({ f: '@wood.0', d: slats }, { f: '@wood.1', d: 'M-200 -36H200V-34H-200Z', op: 0.6 });
      return { body: b };
    },
  });
})();

/* ---------- structure.mcr-portico-column: one of the library portico's giant columns seen close from its steps (framing; a
   pinned front-layer piece: the fluted Portland shaft, the base on its plinth, the edge of the next step) ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  sceneObjDefine({
    id: 'structure.mcr-portico-column', category: 'structure', size: [260, 1000], variants: 1, seasonal: false, flippable: true,
    palette: { base: { stone: ['#d2cbb8', '#b4ad9a', '#e6e0d0', '#8e8876'] } },
    parts: ['body'], shadow: false, real: { h: 18, l: 2 },
    tags: ['uk', 'manchester', 'column', 'portico', 'framing', 'kit:urban', 'role:structure', 'class:structure'],
    credit: 'drawn for the Manchester civic-quarter views: a column of the Central Library portico, close to',
    build() {
      const b = [];
      // the plinth block and the base mouldings
      b.push({ f: '@stone.1', d: 'M-130 0V-60H130V0Z' }, { f: '@stone.0', d: 'M-120 -60V-84H120V-60Z' }, { f: '@stone.2', d: 'M-112 -84Q-112 -100 -96 -100H96Q112 -100 112 -84Z' }, { f: '@stone.0', d: 'M-100 -100V-114H100V-100Z' });
      // the shaft with entasis, lit on the left, its flutes
      b.push({ f: { lin: [[0, '@stone.2'], [0.45, '@stone.0'], [1, '@stone.3']], x1: -92, y1: 0, x2: 92, y2: 0 }, d: 'M-92 -114Q-96 -560 -80 -1000H80Q96 -560 92 -114Z' });
      let fl = ''; for (let i = -5; i <= 5; i++) { const x = i * 15; fl += `M${x} -120Q${x * 1.04} -560 ${x * 0.87} -1000`; }
      b.push({ f: null, s: '@stone.3', w: 2.2, d: fl, op: 0.35 });
      b.push({ f: '@stone.3', d: 'M40 -114Q46 -560 38 -1000H80Q96 -560 92 -114Z', op: 0.35 });
      // the edge of the next step at the foot (the steps we stand on)
      b.push({ f: '@stone.0', d: 'M-400 30V0H400V30Z' }, { f: '@stone.1', d: 'M-400 36V30H400V36Z' });
      return { body: b };
    },
  });
})();

/* ---------- v4: Deansgate at the John Rylands Library ----------
   The camera on Deansgate's east pavement, looking south-west across the road at an angle: Deansgate runs from the near
   left to the far right, the library's red sandstone front along its far (west) side. Ground metres of the view: u along
   the road (toward the far right), n across it (toward the far side); P(t, k) = n * k + u * t. */
(function () {
  const c4 = { eye: 1.65, fov: 80, horizon: 680, heading: 214, lat: 53.48055, lon: -2.24730 };
  const u = [Math.SQRT1_2, Math.SQRT1_2], n = [-Math.SQRT1_2, Math.SQRT1_2];
  const P = (t, k) => [Math.round((n[0] * k + u[0] * t) * 100) / 100, Math.round((n[1] * k + u[1] * t) * 100) / 100];
  SCENE_MCR_VIEWS.v4 = Object.freeze({ camera: c4, u, n, P, road: 14, roadW: 12, front: 24.5 });
  SCENE_MCR_SPEC.rylands[0] = { camera: c4, a: P(28, 24.5), b: P(70, 24.5) };
})();
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCR;
  /* landmark.mcr-john-rylands: Basil Champneys's 1900 library, Penrith red sandstone Gothic. The two wings of tall traceried
     windows between buttresses and pinnacles under a pierced parapet; the centre: the deep entrance arch, the great oriel
     window and its gable between two pinnacled towers; the steep lead roofs behind. Walls in the v4 camera. */
  sceneObjDefine({
    id: 'landmark.mcr-john-rylands', category: 'landmark', size: [700, 700], variants: 1, seasonal: false, flippable: false, detailPx: 300,
    palette: { base: {} }, parts: ['body'], shadow: false, real: { h: 34, l: 42, w: 2 },   // w: the motion blocker's depth at its pinned front corner (an oblique view: a deeper box would spill over Deansgate)
    night: { glow: { window: '#ffd28a', lamp: '#ffe6b0' }, on: 0.5 },
    tags: ['uk', 'manchester', 'landmark', 'signature', 'library', 'gothic', 'sandstone', 'perspective', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Manchester civic-quarter views: the John Rylands Library, Deansgate (Basil Champneys, 1900), in the camera\'s perspective',
    build(v) {
      const S = SCENE_MCR_SPEC.rylands[v]; if (!S) return { body: [] };
      const C = M.cam(S.camera), A = C.p(S.a[0], S.a[1], 0), G = M.pen(C, A), W = G.wall(S.a, S.b), L = W.L, r = M.rnd(55);
      const RED = '#9a5444', TRIM = '#b87260', DARK = '#3e1e18', LEAD = '#5a6266', GLASS = '#2a2c34';
      const EAVE = 19, c0 = 13, c1 = 29;   // the centre block from s 15 to 27
      // the wings' bodies first (their flanks show over the lower neighbour on the left), then the steep roofs, then the walls
      for (const [s0, s1] of [[0, c0], [c1, L]]) { const q = [W.at(s0, 0, 0), W.at(s1, 0, 0), W.at(s1, 0, -12), W.at(s0, 0, -12)]; G.prism(q.map(p => [p[0], p[1]]), 0, EAVE, RED); }
      M.roof(G, W, 0, c0, 12, EAVE, EAVE + 5.5, LEAD, true);
      M.roof(G, W, c1, L, 12, EAVE, EAVE + 5.5, LEAD, true);
      for (const [s0, s1] of [[0, c0], [c1, L]]) {
        G.add(M.shadeBy(RED, W.n3), G.path([W.scr(s0, 0), W.scr(s1, 0), W.scr(s1, EAVE), W.scr(s0, EAVE)]));
        M.coursing(G, W, s0, s1, 1, EAVE, 0.5, DARK);
        G.add(M.mix(RED, '#2a1410', 0.3), G.path([W.scr(s0, 0), W.scr(s1, 0), W.scr(s1, 1.6), W.scr(s0, 1.6)]));
        const bays = Math.round((s1 - s0) / 3.4);
        M.windows(G, W, { s0, s1, bays, z0: 2.4, z1: 6, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, lights: 2, fill: 0.6 });
        M.windows(G, W, { s0, s1, bays, z0: 8.4, z1: 16.6, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, lights: 3, fill: 0.7, transom: 0.55 });
        M.bands(G, W, s0, s1, [7.2, 17.6], 0.4, M.shadeBy(TRIM, W.n3));
        const bs = []; for (let i = 0; i <= bays; i++) bs.push(s0 + i * (s1 - s0) / bays);
        M.buttresses(G, W, bs, 0, EAVE + 1.2, 0.8, M.shadeBy(TRIM, W.n3), -1);
        // the pierced parapet and its pinnacles
        let pp = ''; for (let s = s0 + 0.4; s < s1 - 0.4; s += 0.8) pp += G.path(G.archPts(W, s, s + 0.5, EAVE + 0.4, EAVE + 1.3, 'point', 0.3));
        G.add(M.shadeBy(TRIM, W.n3), G.path([W.scr(s0, EAVE, 0.3), W.scr(s1, EAVE, 0.3), W.scr(s1, EAVE + 1.6, 0.3), W.scr(s0, EAVE + 1.6, 0.3)]));
        G.add(DARK, pp, { op: 0.75 });
        for (const s of bs) { const p = W.at(s, 0, 0.5); G.pinnacle(p[0], p[1], EAVE + 1.2, EAVE + 4.6, 0.6, TRIM, true); }
      }
      // the centre block: proud by 1.6 m, the great gable to 29 m, the oriel window, the entrance arch, two towers to 34 m
      const p0 = W.at(c0, 0, 1.6), p1 = W.at(c1, 0, 1.6), p2 = W.at(c1, 0, -0.1), p3 = W.at(c0, 0, -0.1);
      const CF = [[p0[0], p0[1]], [p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]]];
      // the gable roof behind the gable, first
      { const a = W.at(c0 + 2.5, 22, 1.6), b = W.at(c1 - 2.5, 22, 1.6), t = W.at((c0 + c1) / 2, 30, 1.6), ab = W.at(c0 + 2.5, 22, -12), bb = W.at(c1 - 2.5, 22, -12), tb = W.at((c0 + c1) / 2, 30, -12);
        for (const pl of [[a, t, tb, ab], [t, b, bb, tb]]) { const F = G.face(pl, W.at((c0 + c1) / 2, 22, -5)); if (F.vis) G.poly3(pl, M.shadeBy(LEAD, F.n)); } }
      G.prism(CF, 0, 22, RED);
      const Wc = G.wall(CF[0], CF[1]), Lc = Wc.L;
      M.coursing(G, Wc, 0, Lc, 1, 22, 0.5, DARK);
      M.gable(G, Wc, 2.5, Lc - 2.5, 22, 29.5, RED, { trim: M.shadeBy(TRIM, Wc.n3), glass: GLASS, win: true });
      // the entrance: a deep moulded arch with its doors, statues' niches either side (empty, no figures)
      G.arch(Wc, 3.2, Lc - 3.2, 0, 7.4, 'point', M.shadeBy(TRIM, Wc.n3));
      G.arch(Wc, 3.8, Lc - 3.8, 0, 6.8, 'point', DARK);
      G.arch(Wc, 4.6, Lc - 4.6, 0, 5.6, 'point', '#2a1a14', 0, { glow: 'window' });
      // the oriel: a canted bay of tall lights over the arch
      { const s0 = 3.4, s1 = Lc - 3.4, z0 = 8.6, z1 = 20.6, o = 1.2;
        G.add(M.shadeBy(TRIM, Wc.n3), G.path([Wc.scr(s0, z0 - 0.8), Wc.scr(s1, z0 - 0.8), Wc.scr(s1 - 0.6, z0 - 1.8, o * 0.6), Wc.scr(s0 + 0.6, z0 - 1.8, o * 0.6)]));
        G.add(M.shadeBy(RED, Wc.n3), G.path([Wc.scr(s0, z0 - 0.8, o), Wc.scr(s1, z0 - 0.8, o), Wc.scr(s1, z1, o), Wc.scr(s0, z1, o)]));
        M.windows(G, { ...Wc, scr: (s, z, off) => Wc.scr(s, z, (off || 0) + o) }, { s0, s1, bays: 4, z0, z1: z1 - 0.8, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, lights: 2, fill: 0.8, transom: 0.5, gap: 0.15 });
        let tr = ''; for (const z of [11.6, 15.6]) tr += 'M' + G.ps(Wc.scr(s0, z, o + 0.05)) + 'L' + G.ps(Wc.scr(s1, z, o + 0.05)); G.add(null, tr, { s: TRIM, w: Math.max(0.8, Wc.px(0.25)) }); }
      // the two towers at the centre block's corners: square, buttressed, the belfry lights, the pinnacled tops
      for (const sT of [0.2, Lc - 0.2]) {
        const q = Wc.at(sT, 0, -0.4), tw = 1.7, ux = Wc.u, nx = Wc.n;
        const T = [[q[0] - ux[0] * tw + nx[0] * tw, q[1] - ux[1] * tw + nx[1] * tw], [q[0] + ux[0] * tw + nx[0] * tw, q[1] + ux[1] * tw + nx[1] * tw], [q[0] + ux[0] * tw - nx[0] * tw, q[1] + ux[1] * tw - nx[1] * tw], [q[0] - ux[0] * tw - nx[0] * tw, q[1] - ux[1] * tw - nx[1] * tw]];
        const faces = G.prism(T, 0, 31, RED);
        for (const f of faces) { const Wt = G.wall(f.a, f.b); M.coursing(G, Wt, 0, Wt.L, 1, 30, 0.5, DARK); M.bands(G, Wt, 0, Wt.L, [7.2, 17.6, 22.4, 29.2], 0.35, M.shadeBy(TRIM, Wt.n3)); M.windows(G, Wt, { s0: 0.8, s1: Wt.L - 0.8, bays: 1, z0: 23.4, z1: 28.6, kind: 'point', rnd: () => 0.5, glass: '#1c1210', frame: DARK, trim: TRIM, lights: 2, fill: 0.7 }); M.windows(G, Wt, { s0: 0.8, s1: Wt.L - 0.8, bays: 1, z0: 9, z1: 15, kind: 'point', rnd: r, glass: GLASS, frame: DARK, trim: TRIM, lights: 1, fill: 0.4 }); }
        for (const p of T) G.pinnacle(p[0], p[1], 29, 34.5, 0.8, TRIM, true);
        const cx = (T[0][0] + T[2][0]) / 2, cd = (T[0][1] + T[2][1]) / 2;
        G.pyramid(T.map(p => [cx + (p[0] - cx) * 0.7, cd + (p[1] - cd) * 0.7]), 30, [cx, cd, 35.5], LEAD);
        G.pinnacle(cx, cd, 35, 37, 0.25, '#8a7a4a', false);
      }
      return { body: G.S };
    },
  });
})();

/* ---------- structure.mcr-market-hut: the market's other stalls: a gabled bar hut with a lit gallery front (v0, v1) or a
   round-topped food stall with a striped awning (v2, v3); fairy lights, greenery ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = SCENE_MCR.R1;
  const ell = (cx, cy, rx, ry) => `M${R(cx - rx)} ${R(cy)}a${R(rx)} ${R(ry)} 0 1 0 ${R(2 * rx)} 0a${R(rx)} ${R(ry)} 0 1 0 ${R(-2 * rx)} 0Z`;
  sceneObjDefine({
    id: 'structure.mcr-market-hut', category: 'structure', detailPx: 60, size: [300, 230], variants: 4, seasonal: false, flippable: true,
    palette: { base: { wood: ['#5e3e26', '#44301e', '#8a5e38'], roof: ['#2e3a2e', '#24302a'], fir: ['#2e4a2a', '#3e6036'], lights: '#ffe7a0', warm: '#ffcf80', stripe: ['#b02a2a', '#ece4d4'], steam: '#f4f0ea' } },
    parts: ['body'], shadow: false, real: { h: 4.6, l: 6.2, w: 3 },
    night: { glow: { window: '#ffcf80', lamp: '#fff0b8' }, on: 1 },
    tags: ['uk', 'manchester', 'market', 'christmas', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester civic-quarter views: a Christmas market bar and food stall (no lettering)',
    build(v, r) {
      const b = [], lit = [];
      if (v < 2) {
        b.push({ f: '@wood.1', d: 'M-140 0V-130H140V0Z' }, { f: '@warm', d: 'M-124 -40V-116H124V-40Z', glow: 'window' });
        let posts = ''; for (let x = -124; x <= 124; x += 31) posts += `M${x - 3} -40V-116H${x + 3}V-40Z`; b.push({ f: '@wood.0', d: posts });
        b.push({ f: '@wood.2', d: 'M-136 -34V-44H136V-34Z' }, { f: '@roof.0', d: 'M-156 -126L0 -220L156 -126L144 -120L0 -206L-144 -120Z' }, { f: '@wood.0', d: 'M-144 -120L0 -206L144 -120Z' });
        b.push({ f: '@fir.1', d: 'M-14 -150L0 -196L14 -150Z' }, { f: '@lights', d: ell(0, -196, 3, 3) });
        // figures at the bar (dark shapes against the light), steam off the mulled wine
        let ppl = ''; for (let i = 0; i < 5; i++) { const x = -100 + i * 48 + r() * 10; ppl += ell(x, -60, 7, 8) + `M${x - 9} -40V-52Q${x} -60 ${x + 9} -52V-40Z`; } b.push({ f: '#2a2420', d: ppl, op: 0.85 });
        b.push({ f: '@steam', d: 'M-40 -130q-6 -14 4 -22q8 -8 0 -18q14 8 6 20q-6 10 4 20Z', op: 0.35 });
      } else {
        b.push({ f: '@wood.0', d: 'M-120 0V-100H120V0Z' }, { f: '@warm', d: 'M-100 -44V-90H100V-44Z', glow: 'window' }, { f: '@wood.2', d: 'M-108 -38V-46H108V-38Z' });
        let st = ''; for (let i = 0; i < 12; i++) { const x0 = -132 + i * 22; st += `M${x0} -100L${x0 + 11} -100L${x0 + 11} -150Q${x0 + 5} -160 ${x0} -150Z`; }
        b.push({ f: '@stripe.1', d: 'M-132 -100V-150Q0 -200 132 -150V-100Z' }, { f: '@stripe.0', d: st, op: 0.9 }, { f: '@stripe.0', d: 'M-136 -100L-128 -90H128L136 -100Z' });
        b.push({ f: '@steam', d: 'M20 -160q-8 -16 4 -24q10 -10 0 -20q16 10 6 22q-6 10 4 22Z', op: 0.35 });
      }
      let fl = ''; for (let x = -130; x <= 130; x += 13) fl += ell(x, (v < 2 ? -122 : -98) + Math.abs(Math.sin((x + 130) / 52 * Math.PI)) * 6, 1.8, 1.8);
      b.push({ f: '@lights', d: fl, op: 0.7, detail: true }); lit.push({ f: '@lights', d: fl, glow: 'lamp' });
      let gar = ''; for (let x = -130; x <= 130; x += 9) gar += ell(x, v < 2 ? -128 : -104, 7, 5);
      b.push({ f: '@fir.0', d: gar });
      return { body: b.concat(lit) };
    },
  });
})();

/* ---------- pass 2 (the review: the views were too empty): the ground's tonal variation, the near life from behaviour presets,
   and the street furniture and street trees the squares and pavements really have ----------
   SCENE_MCR_FILL.tone(cv, o)     irregular patches of the hard ground's own variation (worn, newer, wet, stained), by depth band
   SCENE_MCR_FILL.life(data, sp)  ground movers from sceneBehave presets at their real size (stride-matched walk, pauses,
                                  out and back so nothing teleports): [{ obj, preset, route: [[x, d], ...], seed, offset, variant }] */
const SCENE_MCR_FILL = Object.freeze({
  tone(cv, o) {
    const C = SCENE_MCR.cam(cv), r = SCENE_MCR.rnd(o.seed || 1), by = {}, band = d => d < 15 ? 'fore' : d < 50 ? 'near' : d < 200 ? 'mid' : 'far';
    const dMin = C.f * cv.eye / (900 - cv.horizon) * 0.95, R0 = v => Math.round(v);
    const [x0, x1, d0, d1] = o.box, cols = o.cols || ['@tone.0', '@tone.1', '@tone.2', '@tone.3'], w = o.w || [1, 1, 1, 1];
    const tw = w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < o.n; i++) {
      // depth sampled so patches spread evenly on SCREEN (more per metre near the camera)
      const t = r(), d = d0 * Math.pow(d1 / d0, t), x = x0 + (x1 - x0) * r();
      if (d < dMin || Math.abs(x) > d * 1.25 + 4 || (o.clip && !o.clip(x, d))) continue;
      // a run of 1 to 4 slabs (a replaced patch, a worn or wet run) along x: each slab 0.6 to 1.2 m by two thirds of that,
      // growing with depth so the far ground does not turn to noise
      const sx = (o.size || 1) * (0.6 + r() * 0.6) * Math.max(1, d / 16), sd = sx * (0.55 + r() * 0.2), nr = 1 + Math.floor(r() * 4), pts = [];
      const x0r = x - sx * nr / 2;
      for (let j = 0; j < nr; j++) { const a0 = x0r + j * sx + 0.04 * sx, a1 = x0r + (j + 1) * sx - 0.04 * sx, dj = d + (r() < 0.3 ? sd * (r() < 0.5 ? -1 : 1) : 0); pts.push([[a0, dj], [a1, dj], [a1, dj + sd * 0.92], [a0, dj + sd * 0.92]]); }
      if (pts.some(q => q.some(p => p[1] < dMin || (o.clip && !o.clip(p[0], p[1]))))) continue;
      let u = r() * tw, ci = 0; while (ci < w.length - 1 && u > w[ci]) { u -= w[ci]; ci++; }
      const key = band(d) + '|' + cols[ci];
      for (const q of pts) by[key] = (by[key] || '') + 'M' + q.map(p => { const z = C.p(p[0], p[1], 0); return R0(z[0]) + ' ' + R0(z[1]); }).join('L') + 'Z';
    }
    return Object.keys(by).map(k => { const [layer, fill] = k.split('|'); return { layer, d: by[k], fill }; });
  },
  life(data, specs) {
    const B = typeof sceneBehave !== 'undefined' ? sceneBehave : null, out = [];
    for (const s of specs) {
      const G = B ? B.preset(s.preset || B.presetFor(s.obj)) : null;
      const a = { obj: s.obj, ground: s.route, loop: 'pingpong', seed: s.seed };
      const speedM = s.speedM || (G ? G.speedM : 0);
      if (speedM) a.speedM = speedM;
      for (const key of ['variant', 'k', 'offset']) if (s[key] != null) a[key] = s[key];
      const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(s.obj, s.variant | 0, 'summer') : null;
      if (B && G && G.stepM && sh && (sh.anim || []).some(h => h.kind === 'walk')) a.anim = { walk: Object.assign({ period: B.stride(G, speedM) }, G.deg ? { deg: G.deg } : {}) };
      out.push(a);
    }
    return out;
  },
});

/* street.mcr-bin          the city-centre litter bin: a black cylinder, the gold bands, the domed hood (v1 a pair: the
                           recycling bin beside it)
   street.mcr-cycle-stand  a run of Sheffield stands (v0 two stands one bike, v1 three stands two bikes, v2 an empty pair)
   street.mcr-totem        a wayfinding monolith: the slim dark slab, the pale map panel, the coloured head band (no lettering)
   tree.mcr-street-tree    a planted street tree (plane or lime) in its grille: a mottled trunk, an open limb frame with sky
                           between, small leaf sprays at the twig ends; gold in autumn, bare with seed balls in winter */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1;
  SD.define({
    id: 'street.mcr-bin', category: 'street', size: [90, 110], variants: 2, seasonal: false, flippable: true,
    real: { h: 1.05, w: 0.6 }, shadow: { rx: 18, ry: 4, h: 100 },
    palette: { base: { bin: ['#1e2124', '#33383c', '#121416'], gold: ['#b89a4a', '#8a7234'], rec: ['#2a4a6a', '#3a5e82'] } },
    parts: ['body'], tags: ['uk', 'manchester', 'litter-bin', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester civic-quarter views: the black and gold city-centre litter bin',
    build(v) {
      const b = [];
      const one = (x, body, hi) => {
        b.push({ f: body, d: `M${x - 17} 0V-74Q${x - 17} -80 ${x - 14} -82H${x + 14}Q${x + 17} -80 ${x + 17} -74V0Z` },
          { f: hi, d: `M${x - 13} -2V-74H${x - 7}V-2Z`, op: 0.55 },
          { f: '@gold.0', d: `M${x - 17} -64V-70H${x + 17}V-64Z` }, { f: '@gold.1', d: `M${x - 17} -8V-12H${x + 17}V-8Z` },
          { f: body, d: `M${x - 19} -80Q${x} -98 ${x + 19} -80Z` }, { f: '@bin.2', d: `M${x - 9} -84H${x + 9}V-80H${x - 9}Z` },
          { f: '@gold.0', d: SD.circ(x, -92, 2.2) });
      };
      if (v === 1) { one(-22, '@rec.0', '@rec.1'); one(22, '@bin.0', '@bin.1'); } else one(0, '@bin.0', '@bin.1');
      return { body: b };
    },
  });
  SD.define({
    id: 'street.mcr-cycle-stand', category: 'street', size: [260, 90], variants: 3, seasonal: false, flippable: true,
    real: { h: 1.0, w: 3.2 }, shadow: { rx: 110, ry: 6, h: 60 },
    palette: { base: { steel: ['#4a5056', '#7a8288'], frame: ['#2a5a8a', '#b83a2e', '#2e6a44', '#1e1e20'], tyre: ['#1c1c1e'], metal: ['#a0a6ac'] } },
    parts: ['body'], tags: ['uk', 'cycle-stand', 'bicycle', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester civic-quarter views: Sheffield stands with bikes locked to them',
    build(v, r) {
      const b = [], n = v === 1 ? 3 : 2, xs = []; for (let i = 0; i < n; i++) xs.push((i - (n - 1) / 2) * 76);
      const bike = (x, col) => {
        const R = 19, y = -R, w1 = x - 36, w2 = x + 36;
        b.push({ s: '@tyre.0', w: 3.6, d: SD.circ(w1, y, R) + SD.circ(w2, y, R) });
        b.push({ s: '@metal.0', w: 0.7, op: 0.6, d: `M${w1 - R + 3} ${y}h${2 * R - 6}M${w1} ${y - R + 3}v${2 * R - 6}M${w2 - R + 3} ${y}h${2 * R - 6}M${w2} ${y - R + 3}v${2 * R - 6}` });
        b.push({ s: col, w: 3.4, d: `M${w1} ${y}L${x - 5} ${y - 2}L${x + 20} ${y - 30}L${x - 10} ${y - 30}L${w1} ${y}M${x - 5} ${y - 2}L${x - 12} ${y - 36}M${x + 20} ${y - 30}L${w2} ${y}M${x + 20} ${y - 30}L${x + 18} ${y - 42}` });
        b.push({ f: '#1e1e20', d: `M${x - 20} ${y - 39}h16v4h-16z` }, { s: '#2a2a2c', w: 2.6, d: `M${x + 10} ${y - 42}h16` });
      };
      xs.forEach((x, i) => {
        b.push({ s: '@steel.0', w: 5, d: `M${x - 26} 0V-58Q${x - 26} -76 ${x - 8} -76H${x + 8}Q${x + 26} -76 ${x + 26} -58V0` }, { s: '@steel.1', w: 1.4, op: 0.6, d: `M${x - 27.5} -4V-58Q${x - 27.5} -77 ${x - 8} -77.5` });
        if ((v === 0 && i === 0) || (v === 1 && i !== 1)) bike(x + 4, ['@frame.0', '@frame.1', '@frame.2', '@frame.3'][Math.floor(r() * 4)]);
      });
      return { body: b };
    },
  });
  SD.define({
    id: 'street.mcr-totem', category: 'street', size: [70, 260], variants: 2, seasonal: false, flippable: true,
    real: { h: 2.5, w: 0.6 }, shadow: { rx: 22, ry: 4, h: 240 },
    palette: { base: { slab: ['#2c3034', '#40464c', '#1c1f22'], map: ['#e6e2d6', '#c6d0b8', '#a8c0cc', '#d8c890'], head: ['#c8a22e', '#2e7a6a'] } },
    parts: ['body'], tags: ['uk', 'manchester', 'wayfinding', 'sign', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester civic-quarter views: a city-centre wayfinding monolith (no lettering)',
    build(v, r) {
      const b = [{ f: '@slab.0', d: 'M-22 0V-250H22V0Z' }, { f: '@slab.1', d: 'M-22 0V-250H-16V0Z', op: 0.7 }, { f: '@slab.2', d: 'M14 0V-250H22V0Z', op: 0.6 },
        { f: '@head.' + v, d: 'M-22 -250V-232H22V-250Z' }, { f: '@map.0', d: 'M-16 -222V-118H16V-222Z' }];
      b.push({ f: '@map.1', d: 'M-12 -210h10v12h-10z' }, { f: '@map.2', d: 'M-16 -150Q-4 -160 4 -146T16 -140V-136Q2 -142 -4 -152T-16 -146Z' });
      let blk = ''; for (let i = 0; i < 9; i++) blk += SD.rect(-14 + (i % 3) * 10, -194 + Math.floor(i / 3) * 14, 7, 9);
      b.push({ f: '#9a968a', d: blk, op: 0.6 });
      b.push({ s: '@head.' + v, w: 2, d: 'M-10 -132L-6 -170L6 -180L8 -214' }, { f: '#c84a3a', d: SD.circ(-6, -170, 2.6) });
      let ln = ''; for (let i = 0; i < 4; i++) ln += SD.rect(-14, -104 + i * 12, 20 + r() * 8, 3);
      b.push({ f: '#c8c4b8', d: ln, op: 0.55 });
      return { body: b };
    },
  });
  SD.define({
    id: 'tree.mcr-street-tree', category: 'tree', size: [340, 520], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 10, w: 7 },
    palette: {
      base: { bark: ['#6a6656', '#a49c84', '#c8c0a6', '#4a463c'], leaf: ['#3e6a2e', '#5a8a3a', '#7aa84a', '#2e5224'], grate: ['#2a2a2c'], ball: ['#6a5a3a'] },
      spring: { leaf: ['#5a8a34', '#7aac44', '#9ccc5e', '#467026'] },
      summer: { leaf: ['#3a6428', '#548436', '#72a046', '#2a4c20'] },
      autumn: { leaf: ['#a06a26', '#c8903a', '#e0b858', '#7a4e22'] },
      winter: { leaf: ['#6a6656'] },
    },
    parts: ['trunk', 'crown'], anim: { sway: { part: 'crown', amp: 1.2, period: 6.1 } },
    tags: ['uk', 'manchester', 'tree', 'street-tree', 'plane', 'kit:urban', 'kit:temperate', 'role:tree', 'class:tree'],
    credit: 'drawn for the Manchester civic-quarter views: a planted street tree in its grille',
    build(v, r, ctx) {
      const season = ctx.season, trunk = [], crown = [], tH = 170 + v * 22, lean = (r() - 0.5) * 12;
      trunk.push({ f: '@bark.0', d: `M-11 0C-10 ${-tH * 0.4} ${-7 + lean * 0.5} ${-tH * 0.8} ${-5 + lean} ${-tH}L${5 + lean} ${-tH}C${7 + lean * 0.5} ${-tH * 0.8} 10 ${-tH * 0.4} 11 0z` });
      let mott = ''; for (let i = 0; i < 12; i++) { const y = -10 - r() * (tH - 20), x = (r() - 0.5) * 12 + lean * (-y / tH); mott += SD.ell(Math.round(x), Math.round(y), Math.round(2 + r() * 3), Math.round(4 + r() * 6)); }
      trunk.push({ f: '@bark.2', d: mott, op: 0.7, detail: true }, { f: '@bark.3', d: `M3 0C4 ${-tH * 0.4} ${3 + lean * 0.5} ${-tH * 0.8} ${2 + lean} ${-tH}L${5 + lean} ${-tH}C${7 + lean * 0.5} ${-tH * 0.8} 10 ${-tH * 0.4} 11 0z`, op: 0.45 });
      trunk.push({ f: '@grate.0', d: 'M-40 0h80v5h-80z' }, { s: '#4a4a4c', w: 1, op: 0.7, d: 'M-36 1.5h72M-36 3.5h72' });
      const tops = [], nodes = [], limbs = ['', '', '', ''];
      const grow = (x, y, a, len, k) => {
        const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
        limbs[3 - k] += `M${f1(x)} ${f1(y)}Q${f1((x + x2) / 2 + (r() - 0.5) * len * 0.3)} ${f1((y + y2) / 2)} ${f1(x2)} ${f1(y2)}`;
        nodes.push([x2, y2, k]);
        if (k <= 0) { tops.push([x2, y2]); return; }
        const n = r() < 0.15 ? 3 : 2;
        for (let i = 0; i < n; i++) grow(x2, y2, a * 0.75 + (i - (n - 1) / 2) * (0.45 + r() * 0.3) + (r() - 0.5) * 0.3, len * (0.62 + r() * 0.16), k - 1);
      };
      const nl = 4 + (v % 2);
      for (let i = 0; i < nl; i++) grow(lean, -tH + i * 8, (i - (nl - 1) / 2) * 0.42 + (r() - 0.5) * 0.3, 74 + r() * 34, 3);
      [5, 3.4, 2.2, 1.3].forEach((w, i) => crown.push(Object.assign({ s: '@bark.0', w, d: limbs[i] }, i === 3 ? { detail: true } : null)));
      if (season === 'winter') {
        crown.push({ s: '@bark.0', w: 0.8, op: 0.7, detail: true, d: SD.twigs(r, tops.map(p => [p[0], p[1], (r() - 0.5) * 1.4, 16 + r() * 10]), 2, 0.5) });
        let balls = ''; for (let i = 0; i < 16; i++) { const p = tops[Math.floor(r() * tops.length)]; balls += SD.circ(p[0] + (r() - 0.5) * 16, p[1] + 6 + r() * 10, 2.4); }
        crown.push({ f: '@ball.0', d: balls });
        return { trunk, crown };
      }
      const tones = ['', '', '', ''], dens = season === 'autumn' ? 0.75 : season === 'spring' ? 0.7 : 1;
      const cluster = (x, y, n, R) => {
        for (let i = 0; i < n * dens; i++) {
          const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R, lx = x + Math.cos(a) * rr, ly = y + Math.sin(a) * rr * 0.8, L = 16 + r() * 10;
          const t = ly > y + R * 0.35 ? 3 : r() < 0.35 ? 0 : r() < 0.65 ? 1 : 2;
          tones[t] += SD.leaf(Math.round(lx), Math.round(ly), Math.round((-Math.PI / 2 + (r() - 0.5) * 2.6) * 10) / 10, Math.round(L), Math.round(L * 0.55));
        }
      };
      for (const [x, y] of tops) cluster(x, y, 4 + Math.floor(r() * 2), 30);
      for (const [x, y, k] of nodes) if (k === 1 && r() < 0.5) cluster(x, y, 2, 20);
      crown.push({ f: '@leaf.3', d: tones[3] }, { f: '@leaf.0', d: tones[0] }, { f: '@leaf.1', d: tones[1], detail: true }, { f: '@leaf.2', d: tones[2], detail: true });
      if (season === 'autumn') { let fallen = ''; for (let i = 0; i < 14; i++) fallen += SD.leaf(-44 + r() * 88, -1 + r() * 4, (r() - 0.5) * 3, 6, 2.6); trunk.push({ f: '@leaf.2', d: fallen }); }
      return { trunk, crown };
    },
  });
})();

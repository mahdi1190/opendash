/* ============================================================
   SCENE ENGINE v2: STEEL TRUSS BRIDGES for the procedural building generator (70-scene-gen-0building.js; the faces and the `mesh`
   element are 70-scene-gen-3ruin.js). PURE: functions and consts only. Private names: _scbr. The STYLE (data) is
   70-scene-gen-style-swing-bridge.js.

   A road bridge over a harbour or a river, built ONCE for any town (Whitby, Goole, Selby, Preston Brook, a dock entrance):
     TRUSSES     a line of lattice on each side of the deck: bottom chord, a top chord that is a straight line or a camel back rising
                 to the middle (a swing bridge's two arms), verticals at a fixed panel length and alternating diagonals, each member a
                 thin quad; both trusses are see-through, so the far one shows through the near one
     DECK        the carriageway with its edge girder (a plain fascia) and a camber; the deck's top is a face of its own
     PIER        a central pier (the pivot of a swing bridge: a broad drum of masonry down to the water) and abutments at both ends
     CABIN       a small control house on the deck over the pivot, with a low hipped roof (a swing bridge has one)
   The footprint's front edge is one side of the bridge: s runs along it, t across the deck. Heights: the deck top is at `deck` metres
   above the ground the footprint stands on (the quay), the piers go down to the water. No lettering, no flags, no signs.
   ============================================================ */

/** The members of one truss as polygons in the wall-local (s, z): chords, verticals, diagonals. -> [{ pts, solid, tone }] */
function _scbrTruss(L, o) {
  const z0 = o.z0, th = o.chord || 0.34, polys = [], top = s => o.top0 + (o.top1 - o.top0) * Math.pow(1 - Math.abs(2 * s / L - 1), 1.35) + z0;
  const add = pts => polys.push({ pts, solid: true, tone: 0, rect: null });
  add([[0, z0], [L, z0], [L, z0 + th], [0, z0 + th]]);                       // the bottom chord
  const n = Math.max(2, Math.round(L / (o.panel || 3.2))), seg = [];
  for (let i = 0; i <= n; i++) seg.push(L * i / n);
  // the top chord: a strip along the curve (a short polyline: each piece a quad)
  const m = Math.max(6, n * 2);
  for (let i = 0; i < m; i++) { const a = L * i / m, b = L * (i + 1) / m; add([[a, top(a) - th], [b, top(b) - th], [b, top(b)], [a, top(a)]]); }
  const vw = o.vert || 0.24, dw = o.diag || 0.2;
  for (let i = 0; i <= n; i++) { const s = seg[i]; add([[s - vw / 2, z0 + th], [s + vw / 2, z0 + th], [s + vw / 2, top(s) - th], [s - vw / 2, top(s) - th]]); }
  for (let i = 0; i < n; i++) {
    const a = seg[i], b = seg[i + 1], up = i % 2 === 0;
    const xa = up ? a : b, xb = up ? b : a;   // alternate the lean: a Warren lattice
    const ya = z0 + th, yb = top(xb) - th, w = dw / 2;
    add([[xa - w, ya], [xa + w, ya], [xb + w, yb], [xb - w, yb]]);
  }
  return polys;
}
/** The faces of a box (a pier, an abutment, a cabin) as a prism over the plan rectangle [s0, s1] x [t0, t1], z0..z1. */
function _scbrBox(P, sp, rnd, col, s0, s1, t0, t1, z0, z1, steps, cap) {
  const spec = { c: [(s0 + s1) / 2, (t0 + t1) / 2], w: s1 - s0, d: t1 - t0, z0, h: z1, cap: cap || 'flat' };
  return _scruBlock(spec, P, sp, rnd, col, steps || 3);
}
/** The style's build hook: a truss bridge on the footprint (front edge: one side; s along it). -> model */
function _scbrBuild(b, sp, foot, modelFn, opt, view) {
  const st = sp.style, cfg = st.bridge || {};
  if (foot.length !== 4) return modelFn(b, sp, foot);
  foot = _scruLongFront(foot, view);
  sp.season = (opt && opt.season) || 'summer';
  const a = foot[0], c = foot[1], W = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, u = [(c[0] - a[0]) / W, (c[1] - a[1]) / W], v = [-u[1], u[0]];
  const D = Math.max(2.5, (foot[3][0] - a[0]) * v[0] + (foot[3][1] - a[1]) * v[1]);
  const P = (s, t) => [a[0] + u[0] * s + v[0] * t, a[1] + u[1] * s + v[1] * t];
  const rnd = sceneRnd(sceneHash('bridge|' + sp.seed + '|' + W.toFixed(1) + '|' + D.toFixed(1)));
  const deck = cfg.deck == null ? 0.6 : cfg.deck, water = b.water != null ? b.water : (cfg.water == null ? -3.2 : cfg.water);
  const steel = cfg.steel || '#5b6870', stone = cfg.stone || '#8d8a80', road = cfg.road || '#4a4c50', roof = cfg.roof || '#5a5f66';
  const cap = opt && opt.tierCap != null ? opt.tierCap : 3, steps = cap >= 2 ? 4 : 3;
  const groups = [];
  const rise = Math.min(cfg.rise == null ? 1.8 : cfg.rise, 3);
  const H = deck + (cfg.depth || 3.5) + rise;
  // the two trusses (each a pair of faces: one plane, seen from both sides)
  const trussOf = (t, from, to) => {
    const A = P(from, t), B = P(to, t), L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const polys = _scbrTruss(L, { z0: deck + 0.45, top0: cfg.depth || 3.5, top1: (cfg.depth || 3.5) + rise, panel: cfg.panel || 3.0 });
    return { faces: [_scruFace(A, B, 0.5, +1, polys, [], steel, sp, deck, H, rnd), _scruFace(A, B, 0.5, -1, polys, [], steel, sp, deck, H, rnd)], c: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] };
  };
  groups.push(trussOf(0.35, 0, W), trussOf(D - 0.35, 0, W));
  // the deck: its top (one polygon), and a fascia on each side
  const top = [P(0, 0), P(W, 0), P(W, D), P(0, D)].map(p => [p[0], deck, p[1]]);
  const pl0 = _scbgWallPlane(P(0, 0), P(W, 0));
  groups.push({ c: P(W / 2, D / 2), faces: [{ poly: top.slice().reverse(), n: [0, 1, 0], part: 'wall', role: 'deck', edge: 0, col: road, plane: pl0, elems: [], dark: 0.0, layout: () => ({ elems: [], blocks: [] }) }] });
  const fascia = (t, s0, s1) => { const A = P(s0, t), B = P(s1, t), L = Math.hypot(B[0] - A[0], B[1] - A[1]); const poly = { pts: [[0, deck - 1.1], [L, deck - 1.1], [L, deck], [0, deck]], solid: true, tone: 0, rect: null };
    return { faces: [_scruFace(A, B, 0.2, +1, [poly], [], _scbgDark(steel, 0.1), sp, deck - 1.1, deck, rnd), _scruFace(A, B, 0.2, -1, [poly], [], _scbgDark(steel, 0.1), sp, deck - 1.1, deck, rnd)], c: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] }; };
  groups.push(fascia(0, 0, W), fascia(D, 0, W));
  // the pivot pier (a drum of masonry down to the water), the abutments, the control cabin
  const pw = Math.min(W * 0.2, 9), pd = Math.min(D * 1.3, D + 3);
  groups.push(_scbrBox(P, sp, rnd, stone, W / 2 - pw / 2, W / 2 + pw / 2, D / 2 - pd / 2, D / 2 + pd / 2, water - 0.4, deck - 1.1, steps));
  groups.push(_scbrBox(P, sp, rnd, stone, -2.2, 0.4, -0.6, D + 0.6, water - 0.4, deck - 0.05, steps));
  groups.push(_scbrBox(P, sp, rnd, stone, W - 0.4, W + 2.2, -0.6, D + 0.6, water - 0.4, deck - 0.05, steps));
  const cw = Math.min(5.6, W * 0.12), cd = Math.min(D * 0.62, 4.4);
  groups.push(_scbrBox(P, sp, rnd, _scbgLight(stone, 0.15), W / 2 - cw / 2, W / 2 + cw / 2, D / 2 - cd / 2, D / 2 + cd / 2, deck, deck + 3.1, steps));
  groups.push(_scbrBox(P, sp, rnd, roof, W / 2 - cw / 2 - 0.35, W / 2 + cw / 2 + 0.35, D / 2 - cd / 2 - 0.35, D / 2 + cd / 2 + 0.35, deck + 3.1, deck + 3.5, steps));
  const dist = g => view && !view.ortho ? Math.hypot(g.c[0], g.c[1]) : g.c[1];
  groups.sort((p, q) => dist(q) - dist(p));
  const faces = []; for (const g of groups) faces.push(...g.faces);
  const Hm = H + 0.4;
  return { faces, blocks: [], E: Hm, E0: Hm, H: Hm, W, Dp: D, quad: true, Q: (s, t, z) => { const p = P(s * W, t * D); return [p[0], z, p[1]]; }, roofZ: () => Hm, zs: sp.zs, roof: 'bridge' };
}
function _scbrResolve(sp, b) {
  const H = Number.isFinite(b && b.h) && b.h > 2 ? b.h : sp.zs[sp.zs.length - 1];
  sp.hs = [H]; sp.zs = [0, H]; sp.storeys = 1; sp.ruinH = H;
}
const _SCBR_HOOKS = Object.freeze({ resolve: _scbrResolve, build: _scbrBuild });

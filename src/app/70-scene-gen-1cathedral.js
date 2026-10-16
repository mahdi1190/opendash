/* ============================================================
   SCENE ENGINE v2: the CATHEDRAL generator (docs/dev/WORLD_ENGINE.md 14.2; docs/dev/SCENE_LESSONS.md L). PURE. Private names: _sccd.
   Functions and consts only, nothing expensive at load. The STYLE (data) is 70-scene-gen-style-gothic-minster.js.

   A great church in the Gothic style, built ONCE for any minster or cathedral (York, Lincoln, Lichfield, Canterbury ...): a building's
   `crown` picks a PLAN, the footprint gives the west front (its front edge, the width the front is drawn at) and the length.
     PLANS    'twin-towers' (two west towers, a lantern tower over the crossing; York, Lincoln), 'central-spire' (a tall spire over the
              crossing, no west towers; Salisbury), 'west-tower' (one great west tower and a short nave; a town church). Dimensions
              follow the front's width (30 m = a minster) so a smaller church is the same church smaller.
     PARTS    the WEST FRONT (two towers and between them the nave gable: a deep pointed portal under a canopy, a great west window with
              tracery, a gallery of statue niches, a crenellated rake and a finial), the towers (stages of windows, blind arcading,
              string courses, a louvred belfry, a crenellated parapet and four crocketed pinnacles), buttresses that step in as they
              rise, the NAVE and its aisles (a bay of pointed window under a buttress, a clerestory above, lead roofs), the TRANSEPTS
              (gable ends with their lancets), the CROSSING TOWER and the CHOIR.
     FIT      pale limestone, lead roofs, glass that glows after dusk, a floodlit stone at night (the style's night.flood). Every part
              is a face on its own plane with its elements in metres on it (the generator's own vocabulary plus the gothic kinds
              registered here), so the elevation and the projected view draw the same church, and detail follows the size on screen.
     CARE     no religious symbol, no flag, no name or number: pinnacles, finials and a plain cross-free skyline.
   Registered through the generator's extension points (_scbgElemKinds). The model is a list of CROWN stacks (the civic crowns' drawing
   path, 70-scene-gen-1civic.js: far to near, faces in order, solids of revolution), so a church that is a dozen separate masses is
   drawn in the right order whatever way the eye looks at it.

     sceneCathedralPlans() -> [name]                         the plan names
     sceneCathedralParts(W, D, plan) -> { parts, top, towers, ... }   the masses of a plan in metres (pure; the tests read it)
   ============================================================ */
const _SCCD_PLANS = Object.freeze({
  'twin-towers': Object.freeze({ west: 'twin', westH: 60, central: 'lantern', centralH: 72, transept: true, pinnacle: 5.8 }),
  'central-spire': Object.freeze({ west: 'none', westH: 0, central: 'spire', centralH: 46, transept: true, pinnacle: 4.2, spireH: 38 }),
  'west-tower': Object.freeze({ west: 'single', westH: 48, central: 'none', centralH: 0, transept: false, pinnacle: 4.4 }),
});
function sceneCathedralPlans() { return Object.keys(_SCCD_PLANS); }
const _sccdClamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** The masses of a plan in metres, in the church's own frame (s along the west front, t away from it, z up). Pure. */
function sceneCathedralParts(W, D, planName) {
  const P = _SCCD_PLANS[planName] || _SCCD_PLANS['twin-towers'], k = _sccdClamp(W / 30, 0.45, 2.2);
  const tw = P.west === 'none' ? W * 0.26 : _sccdClamp(W * 0.29, 5, 14), td = tw * 1.12;          // a west tower's width and depth (the aisle's width under it)
  const aisleEave = 13.5 * k, naveEave = 22 * k, naveW = W - 2 * tw, rise = Math.tan(52 * Math.PI / 180) * naveW / 2;
  const crossW = Math.max(naveW + 2 * k, 8), nave = P.transept || P.central !== 'none' ? D * 0.6 : D;
  const tc = Math.max(td + 8, nave), choir = P.transept || P.central !== 'none' ? D : null;
  const towers = [];
  if (P.west === 'twin') towers.push({ s0: 0, s1: tw, t0: 0, t1: td, h: P.westH * k, id: 'west-l' }, { s0: W - tw, s1: W, t0: 0, t1: td, h: P.westH * k, id: 'west-r' });
  else if (P.west === 'single') { const ww = Math.min(W * 0.6, tw * 1.7), s0 = (W - ww) / 2; towers.push({ s0, s1: s0 + ww, t0: 0, t1: ww * 1.05, h: P.westH * k, id: 'west' }); }
  const cs0 = (W - crossW) / 2;
  const central = P.central === 'none' ? null : { s0: cs0, s1: cs0 + crossW, t0: tc, t1: tc + crossW, h: P.centralH * k, kind: P.central, id: 'crossing' };
  return { plan: P, k, W, D, tw, td, aisleEave, naveEave, naveRidge: naveEave + rise, naveW, crossW, tc, towers, central,
    transept: P.transept ? { s0: -W * 0.55, s1: W * 1.55, t0: tc, t1: tc + crossW, eave: 21 * k } : null, choirEnd: choir,
    top: Math.max(P.westH * k, central ? central.h + (P.spireH || 0) * k : 0, naveEave + rise) + P.pinnacle * k };
}

/* ---------- small geometry ---------- */
/** The outline of a pointed (two-centred) arch opening in wall coordinates: straight jambs, then two arcs meeting at the apex. */
function _sccdArchPts(s, w, z, h, m, rise) {
  const r = rise != null ? rise : Math.min(h * 0.6, w * 0.87), zs = z + h - r, R = (w * w / 4 + r * r) / w, xc = s + w - R, am = Math.atan2(r, R - w / 2);
  const pts = [[s, z], [s + w, z], [s + w, zs]];
  for (let i = 1; i <= m; i++) { const a = am * i / m; pts.push([xc + R * Math.cos(a), zs + R * Math.sin(a)]); }
  for (let i = m - 1; i >= 1; i--) { const a = am * i / m; pts.push([s + w - (xc + R * Math.cos(a) - s), zs + R * Math.sin(a)]); }
  pts.push([s, zs]);
  return pts;
}
const _sccdSeason = (ctx, c) => _scbgSeasonal(c, ctx.season);
const _sccdSun = (face, ctx, c, k) => _scbgDark(c, _scbgFaceShade(face, ctx) * (k == null ? 0.5 : k));

/* ---------- elements (drawn on a wall plane: s along, z up, metres) ---------- */
// a pointed window: moulding ring, glass (glowing after dusk) or louvres, tracery bars and a head light, a sill
_scbgElemKinds.gwin = function (e, face, ctx, T) {
  const { view, sink, sp } = ctx, pl = face.plane, dress = sp.dress, m = T >= 2 ? 4 : 2;
  const open = _scbgMap(pl, view, _sccdArchPts(e.s, e.w, e.z, e.h, m, e.rise), 0);
  if (!open) return;
  if (T >= 1) {
    const sur = _scbgMap(pl, view, _sccdArchPts(e.s - 0.3, e.w + 0.6, e.z - 0.12, e.h + 0.55, m, e.rise != null ? e.rise + 0.3 : null), 0.05);
    if (sur) sink.add(2, { f: _sccdSeason(ctx, _sccdSun(face, ctx, _scbgLight(dress, 0.1), 0.45)), d: _scbgPath(sur), op: 1, part: 'body' });
  }
  const gl = e.louvre ? null : 'window';
  sink.add(4, { f: e.louvre ? '#262c35' : _scbgMix(sp.glass, '#9fb0c0', 0.1), d: _scbgPath(open), op: 1, part: 'body', glow: gl || undefined, theta: gl ? (e.theta == null ? 0.0625 : e.theta) : undefined });
  if (T < 2) return;
  const bars = [], bar = (sa, za, w, h) => { const p = _scbgRect(pl, view, sa, za, w, h, -0.05); if (p) bars.push(_scbgPath(p)); };
  const r = e.rise != null ? e.rise : Math.min(e.h * 0.6, e.w * 0.87), zs = e.z + e.h - r;
  if (e.louvre) {
    for (let z = e.z + 0.5; z < zs + r * 0.25; z += 0.55) bar(e.s + 0.12, z, e.w - 0.24, 0.14);
    if (bars.length) sink.add(5, { f: '#59626f', d: bars.join(''), op: 0.85, part: 'body', detail: true });
    return;
  }
  const nm = Math.max(1, Math.min(4, Math.round(e.w / 0.9) - 1));
  for (let i = 1; i <= nm; i++) bar(e.s + e.w * i / (nm + 1) - 0.05, e.z, 0.1, zs - e.z + r * 0.5);
  bar(e.s, e.z + (zs - e.z) * 0.5, e.w, 0.09);
  if (zs - e.z > 3) bar(e.s, e.z + (zs - e.z) * 0.82, e.w, 0.09);
  if (T >= 3 && e.w > 1.2) { const c = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.push([e.s + e.w / 2 + e.w * 0.16 * Math.cos(a), zs + r * 0.42 + e.w * 0.16 * Math.sin(a)]); } const p = _scbgMap(pl, view, c, -0.05); if (p) bars.push(_scbgPath(p)); }
  if (bars.length) sink.add(5, { f: _sccdSun(face, ctx, _scbgLight(dress, 0.1), 0.5), d: bars.join(''), op: 0.95, part: 'body' });
  if (T >= 3) { const sill = _scbgRect(pl, view, e.s - 0.2, e.z - 0.2, e.w + 0.4, 0.2, 0.1); if (sill) sink.add(6, { f: _sccdSun(face, ctx, _scbgLight(dress, 0.12), 0.5), d: _scbgPath(sill), op: 1, part: 'body' }); }
};
// a blind arcade: a row of pointed recesses in a band of the wall
_scbgElemKinds.garc = function (e, face, ctx, T) {
  if (T < 1) return;
  const { view, sink, sp } = ctx, pl = face.plane, n = Math.max(1, e.n | 0), cw = (e.s1 - e.s0) / n, segs = [], light = [];
  for (let i = 0; i < n; i++) {
    const s = e.s0 + cw * i + cw * 0.1, w = cw * 0.8, p = _scbgMap(pl, view, _sccdArchPts(s, w, e.z0, e.z1 - e.z0, T >= 2 ? 3 : 1), 0.01);
    if (p) segs.push(_scbgPath(p));
    if (T >= 2) { const sh = _scbgRect(pl, view, s + w * 0.5 - 0.05, e.z0, 0.1, (e.z1 - e.z0) * 0.62, 0.06); if (sh) light.push(_scbgPath(sh)); }
  }
  if (segs.length) sink.add(2, { f: _sccdSeason(ctx, _scbgDark(sp.wall, 0.34)), d: segs.join(''), op: 0.6, part: 'body' });
  if (light.length) sink.add(3, { f: _sccdSeason(ctx, _scbgLight(sp.dress, 0.05)), d: light.join(''), op: 0.8, part: 'body', detail: true });
};
// a crenellated parapet: a band, then a merlon every step above it (drawn above z, so it breaks the wall's top edge)
_scbgElemKinds.gcren = function (e, face, ctx, T) {
  const { view, sink, sp } = ctx, pl = face.plane, col = _sccdSeason(ctx, _sccdSun(face, ctx, _scbgLight(sp.dress, 0.04), 0.5)), step = e.step || 1.5, base = e.base == null ? 0.45 : e.base;
  const b = _scbgRect(pl, view, e.s0, e.z, e.s1 - e.s0, base, 0.12);
  if (b) sink.add(5, { f: col, d: _scbgPath(b), op: 1, part: 'body' });
  const segs = [], gaps = [];
  if (T >= 1 || (e.s1 - e.s0) / step < 24) for (let s = e.s0 + step * 0.25; s < e.s1 - step * 0.5; s += step) { const p = _scbgRect(pl, view, s, e.z + base, step * 0.55, e.h || 0.9, 0.12); if (p) segs.push(_scbgPath(p)); }
  if (segs.length) sink.add(5, { f: col, d: segs.join(''), op: 1, part: 'body' });
  void gaps;
};
// the rake of a gable: a coping band up both slopes, small crenels along it, a finial at the apex
_scbgElemKinds.grake = function (e, face, ctx, T) {
  const { view, sink, sp } = ctx, pl = face.plane, col = _sccdSeason(ctx, _sccdSun(face, ctx, _scbgLight(sp.dress, 0.06), 0.5)), mid = (e.s0 + e.s1) / 2, th = e.th || 0.8;
  for (const [a, za, b, zb] of [[e.s0, e.z0, mid, e.z1], [mid, e.z1, e.s1, e.z0]]) {
    const p = _scbgMap(pl, view, [[a, za], [b, zb], [b, zb + th], [a, za + th]], 0.12);
    if (p) sink.add(5, { f: col, d: _scbgPath(p), op: 1, part: 'body' });
  }
  if (T >= 1) {
    const segs = [], n = Math.max(3, Math.round((mid - e.s0) / 1.3));
    for (let i = 0; i < n; i++) for (const sd of [-1, 1]) {
      const u = (i + 0.5) / n, s = mid + sd * (mid - e.s0) * (1 - u) , z = e.z1 + (e.z0 - e.z1) * (1 - u) * 1 - (e.z0 - e.z1) * 0 + (e.z1 - e.z0) * 0;
      void z;
      const zz = e.z0 + (e.z1 - e.z0) * u + th, p = _scbgMap(pl, view, [[s - 0.25 * sd, zz], [s + 0.25 * sd, zz + 0.1], [s + 0.25 * sd, zz + 0.9], [s - 0.25 * sd, zz + 0.8]], 0.12);
      if (p) segs.push(_scbgPath(p));
    }
    if (segs.length) sink.add(5, { f: col, d: segs.join(''), op: 1, part: 'body' });
  }
  const f = _scbgMap(pl, view, [[mid - 0.55, e.z1 + th * 0.5], [mid + 0.55, e.z1 + th * 0.5], [mid + 0.12, e.z1 + th + 3.6], [mid - 0.12, e.z1 + th + 3.6]], 0.14);
  if (f) sink.add(6, { f: col, d: _scbgPath(f), op: 1, part: 'body' });
};
// a deep pointed portal: nested arches getting darker inward, plank doors, a gabled canopy over it
_scbgElemKinds.gportal = function (e, face, ctx, T) {
  const { view, sink, sp } = ctx, pl = face.plane, dress = sp.dress, rings = T >= 1 ? 3 : 1;
  for (let i = 0; i < rings; i++) {
    const inset = i * Math.min(0.5, e.w * 0.1), p = _scbgMap(pl, view, _sccdArchPts(e.s + inset, e.w - 2 * inset, 0, e.h - inset * 1.2, T >= 2 ? 4 : 2), 0.06 - i * 0.04);
    if (p) sink.add(2 + i, { f: i === rings - 1 ? '#3a2c22' : _sccdSeason(ctx, _scbgMix(_sccdSun(face, ctx, dress, 0.4), '#14181e', 0.18 + 0.2 * i)), d: _scbgPath(p), op: 1, part: 'body' });
  }
  if (T >= 2) {
    const pk = [], dw = e.w - 2 * Math.min(0.5, e.w * 0.1) * 2;
    for (let i = 1; i < 5; i++) { const q = _scbgRect(pl, view, e.s + e.w / 2 - dw / 2 + dw * i / 5 - 0.03, 0.1, 0.06, e.h * 0.55, -0.1); if (q) pk.push(_scbgPath(q)); }
    const mid = _scbgRect(pl, view, e.s + e.w / 2 - 0.08, 0, 0.16, e.h * 0.62, 0.02);
    if (mid) pk.push(_scbgPath(mid));
    if (pk.length) sink.add(6, { f: '#1c140e', d: pk.join(''), op: 0.8, part: 'body', detail: true });
  }
  if (T >= 1) {
    const zt = e.h + 0.2, mid = e.s + e.w / 2, hw = e.w * 0.62, c = _sccdSun(face, ctx, _scbgLight(dress, 0.08), 0.5);
    for (const sd of [-1, 1]) { const p = _scbgMap(pl, view, [[mid + sd * hw, zt - 0.3], [mid, zt + e.w * 0.95], [mid, zt + e.w * 0.95 + 0.5], [mid + sd * (hw + 0.4), zt - 0.3]], 0.2); if (p) sink.add(6, { f: _sccdSeason(ctx, c), d: _scbgPath(p), op: 1, part: 'body' }); }
  }
};
// a gallery of statue niches: a row of small pointed recesses, each with a lighter figure
_scbgElemKinds.gniches = function (e, face, ctx, T) {
  if (T < 1) return;
  const { view, sink, sp } = ctx, pl = face.plane, n = Math.max(2, e.n | 0), cw = (e.s1 - e.s0) / n, segs = [], fig = [];
  for (let i = 0; i < n; i++) {
    const s = e.s0 + cw * i + cw * 0.18, w = cw * 0.64, p = _scbgMap(pl, view, _sccdArchPts(s, w, e.z, e.h, 2, w * 0.7), 0.04);
    if (p) segs.push(_scbgPath(p));
    if (T >= 2) { const f = _scbgRect(pl, view, s + w * 0.32, e.z + 0.15, w * 0.36, e.h * 0.55, 0.08); if (f) fig.push(_scbgPath(f)); }
  }
  if (segs.length) sink.add(2, { f: _sccdSeason(ctx, _scbgDark(sp.wall, 0.4)), d: segs.join(''), op: 0.75, part: 'body' });
  if (fig.length) sink.add(3, { f: _sccdSeason(ctx, _scbgLight(sp.dress, 0.15)), d: fig.join(''), op: 0.9, part: 'body', detail: true });
};
// buttress strips on a wall (the real stepped buttresses are blocks; this is the shadow line of each and the caps of its steps)
_scbgElemKinds.gbutt = function (e, face, ctx, T) {
  const { view, sink, sp } = ctx, pl = face.plane, col = _sccdSeason(ctx, _sccdSun(face, ctx, _scbgLight(sp.dress, 0.05), 0.5)), segs = [];
  for (const s of e.at) {
    const p = _scbgRect(pl, view, s - e.w / 2, e.z0, e.w, e.z1 - e.z0, 0.08); if (p) segs.push(_scbgPath(p));
    if (T >= 1) for (const [zc, k] of [[e.z0 + (e.z1 - e.z0) * 0.55, 1.5], [e.z0 + (e.z1 - e.z0) * 0.82, 1.28], [e.z1, 1.1]]) { const q = _scbgRect(pl, view, s - e.w / 2 * k, zc, e.w * k, 0.3, 0.1); if (q) segs.push(_scbgPath(q)); }
  }
  if (segs.length) sink.add(3, { f: col, d: segs.join(''), op: 0.9, part: 'body' });
};

/* ---------- the church's frame and its masses ---------- */
/** The church's own frame on the footprint: LP(s, t) -> [x, d]; u along the west front, v away from it. */
function _sccdFrame(foot) {
  const a = foot[0], b = foot[1], d = foot[3], W = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, D = Math.hypot(d[0] - a[0], d[1] - a[1]) || 1;
  const u = [(b[0] - a[0]) / W, (b[1] - a[1]) / W], v = [(d[0] - a[0]) / D, (d[1] - a[1]) / D];
  return { W, D, u, v, LP: (s, t) => [a[0] + u[0] * s + v[0] * t, a[1] + u[1] * s + v[1] * t] };
}
const _SCCD_DIR = ['W', 'R', 'E', 'L'];   // the faces of a box from _scbgBlockFaces: the west front (-v), the right side (+u), the east (+v), the left side (-u)
/** A box of the church (s0..s1, t0..t1, z0..z1): its faces tagged with their direction and a crown record around them. */
function _sccdBox(F, s0, s1, t0, t1, z0, z1, col, topCol, fill) {
  const fs = _scbgBlockFaces([F.LP(s0, t0), F.LP(s1, t0), F.LP(s1, t1), F.LP(s0, t1)], z0, z1, col, topCol || null, 'wall');
  fs.forEach((f, i) => { if (i < 4) { f.dir = _SCCD_DIR[i]; f.edge = i; f.role = 'wall'; f.layout = null; f.len = f.plane.len; if (fill) f.elems = fill(f.dir, f.plane.len, f) || []; } else if (f.role === 'top') f.part = 'roof'; });
  return fs;
}
/** A gabled roof over s0..s1 x t0..t1 from the eave zE to the ridge zR; ridge along t ('t') or along s ('s'). -> { roofs, gables } */
function _sccdGable(F, s0, s1, t0, t1, zE, zR, axis, sp, wallCol, fillGable) {
  const roofs = [], gables = [], P = (s, t, z) => { const q = F.LP(s, t); return [q[0], z, q[1]]; }, rc = sp.roofCol;
  if (axis === 't') {
    const m = (s0 + s1) / 2;
    roofs.push({ poly: [P(s0, t0, zE), P(s0, t1, zE), P(m, t1, zR), P(m, t0, zR)] }, { poly: [P(s1, t1, zE), P(s1, t0, zE), P(m, t0, zR), P(m, t1, zR)] });
    for (const [t, dir] of [[t0, 'W'], [t1, 'E']]) {
      const a = F.LP(dir === 'W' ? s0 : s1, t), b = F.LP(dir === 'W' ? s1 : s0, t), pl = _scbgWallPlane(a, b);
      gables.push({ poly: [P(dir === 'W' ? s0 : s1, t, 0), P(dir === 'W' ? s1 : s0, t, 0), P(dir === 'W' ? s1 : s0, t, zE), P(m, t, zR), P(dir === 'W' ? s0 : s1, t, zE)], n: pl.N, part: 'wall', role: 'gable', plane: pl, col: wallCol, dir, edge: dir === 'W' ? 0 : 2, elems: fillGable ? fillGable(dir, pl.len, zE, zR) : [] });
    }
  } else {
    const m = (t0 + t1) / 2;
    roofs.push({ poly: [P(s0, t0, zE), P(s1, t0, zE), P(s1, m, zR), P(s0, m, zR)] }, { poly: [P(s1, t1, zE), P(s0, t1, zE), P(s0, m, zR), P(s1, m, zR)] });
    for (const [s, dir] of [[s0, 'L'], [s1, 'R']]) {
      const a = F.LP(s, dir === 'L' ? t1 : t0), b = F.LP(s, dir === 'L' ? t0 : t1), pl = _scbgWallPlane(a, b);
      gables.push({ poly: [P(s, dir === 'L' ? t1 : t0, 0), P(s, dir === 'L' ? t0 : t1, 0), P(s, dir === 'L' ? t0 : t1, zE), P(s, m, zR), P(s, dir === 'L' ? t1 : t0, zE)], n: pl.N, part: 'wall', role: 'gable', plane: pl, col: wallCol, dir, edge: dir === 'L' ? 3 : 1, elems: fillGable ? fillGable(dir, pl.len, zE, zR) : [] });
    }
  }
  for (const r of roofs) { r.n = _scbgNormal(r.poly); r.part = 'roof'; r.role = 'roof'; r.col = rc; r.elems = []; }
  return { roofs, gables };
}
/** The pinnacle at a corner: a slender shaft with a small cap and a crocketed spire (solids of revolution). -> ops */
function _sccdPinnacle(F, sp, s, t, z, h, w) {
  const fs = _sccdBox(F, s - w / 2, s + w / 2, t - w / 2, t + w / 2, z, z + h * 0.42, _scbgLight(sp.wall, 0.04), _scbgLight(sp.dress, 0.1));
  const c = F.LP(s, t);
  return [{ t: 'faces', faces: fs }, { t: 'rev', c, prof: [[w * 0.62, z + h * 0.42], [w * 0.5, z + h * 0.62], [w * 0.2, z + h * 0.92], [0, z + h]], seg: 4, rot: Math.PI / 4, col: _scbgLight(sp.dress, 0.04), part: 'body', light: 0.18, dark: 0.45 }];
}
/** A stepped buttress: two blocks, the upper one smaller, against a wall. dirNormal gives the side it stands out to. */
function _sccdButtress(F, sp, s, t, ds, dt, z1, w) {
  const col = _scbgLight(sp.wall, 0.02), out = [];
  out.push(..._sccdBox(F, s - ds * w * 0.5, s + ds * w * 0.5, t - dt * w * 0.5, t + dt * w * 0.5, 0, z1 * 0.58, col, _scbgLight(sp.dress, 0.06)));
  out.push(..._sccdBox(F, s - ds * w * 0.36, s + ds * w * 0.36, t - dt * w * 0.36, t + dt * w * 0.36, z1 * 0.5, z1, col, _scbgLight(sp.dress, 0.08)));
  return out;
}

/* ---------- the elements of the masses ---------- */
const _sccdTheta = (sp, k) => ((sp.seed * 7 + k * 13) % 8) / 8 * 0.7 + 0.03;   // the lit pattern of the glass at night: most panes warm, a few dark
/** A tower's face: plinth, windows in stages, string courses, blind arcading, a louvred belfry, parapet. (Heights follow the tower's own.) */
function _sccdTowerFace(sp, len, H, dir, k, front) {
  const el = [{ k: 'tex', s0: 0, s1: len, z0: 0, z1: H }], u = H / 60;
  el.push({ k: 'band', s0: 0, s1: len, z0: 0, z1: 2.2 * u, col: _scbgDark(sp.wall, 0.12), layer: 2, o: 0.05 });
  for (const zc of [0.37, 0.67]) el.push({ k: 'band', s0: -0.05, s1: len + 0.05, z0: H * zc, z1: H * zc + 0.55 * u, col: _scbgLight(sp.dress, 0.06), layer: 3, o: 0.12 });
  el.push({ k: 'gbutt', at: [0.5, len - 0.5], w: 0.9, z0: 0, z1: H * 0.93, hm: 14 * u });
  const wl = Math.min(2.4 * u + 0.4, len * 0.34), nWin = len > 6 ? 2 : 1;
  for (let i = 0; i < nWin; i++) {
    const cx = nWin === 1 ? len / 2 : len * (0.3 + 0.4 * i);
    el.push({ k: 'gwin', s: cx - wl / 2, w: wl, z: H * 0.08, h: H * 0.2, hm: 11 * u, theta: _sccdTheta(sp, k + i) });                                  // lower stage
    el.push({ k: 'gwin', s: cx - wl * 0.34, w: wl * 0.68, z: H * 0.4, h: H * 0.2, hm: 9 * u, theta: _sccdTheta(sp, k + i + 3) });                      // middle stage
    el.push({ k: 'gwin', s: cx - wl * 0.5, w: wl, z: H * 0.7, h: H * 0.2, louvre: true, hm: 10 * u });                                                // the belfry, louvred
  }
  el.push({ k: 'garc', s0: 0.9, s1: len - 0.9, z0: H * 0.31, z1: H * 0.36, n: Math.max(3, Math.round(len / 1.6)), hm: 8 * u });
  el.push({ k: 'garc', s0: 0.9, s1: len - 0.9, z0: H * 0.6, z1: H * 0.65, n: Math.max(3, Math.round(len / 1.6)), hm: 8 * u });
  el.push({ k: 'band', s0: -0.05, s1: len + 0.05, z0: H - 1.6 * u, z1: H - 0.9 * u, col: _scbgLight(sp.dress, 0.08), layer: 3, o: 0.14 });
  el.push({ k: 'gcren', s0: -0.05, s1: len + 0.05, z: H - 0.9 * u, h: 1.1 * u, step: 1.4 * Math.max(0.5, u), hm: 8 * u });
  el.push({ k: 'flood', s0: 0, s1: len, z0: 0, z1: H });
  void dir; void front;
  return el;
}
/** The nave gable between the west towers: the great west window, the portal, the niches, the rake. */
function _sccdFrontGable(sp, len, zE, zR, k) {
  const el = [{ k: 'tex', s0: 0, s1: len, z0: 0, z1: zE }], cx = len / 2, ww = Math.min(len * 0.5, 6.4 * Math.max(0.6, zE / 22));
  el.push({ k: 'band', s0: 0, s1: len, z0: 0, z1: 1.6, col: _scbgDark(sp.wall, 0.12), layer: 2, o: 0.05 });
  el.push({ k: 'gportal', s: cx - ww * 0.32, w: ww * 0.64, h: zE * 0.36, hm: 10 });
  el.push({ k: 'gniches', s0: 0.8, s1: len - 0.8, z: zE * 0.4, h: 1.9, n: Math.max(5, Math.round(len / 1.5)), hm: 5 });
  el.push({ k: 'gwin', s: cx - ww / 2, w: ww, z: zE * 0.5, h: zE * 0.86 - zE * 0.5 + (zR - zE) * 0.5, rise: ww * 0.95, hm: 14, theta: 0.04 });
  el.push({ k: 'band', s0: -0.05, s1: len + 0.05, z0: zE * 0.455, z1: zE * 0.455 + 0.5, col: _scbgLight(sp.dress, 0.06), layer: 3, o: 0.12 });
  el.push({ k: 'gcren', s0: -0.05, s1: len + 0.05, z: zE - 0.1, h: 0.0001, step: 99, base: 0.3 });
  el.push({ k: 'grake', s0: -0.4, s1: len + 0.4, z0: zE - 0.1, z1: zR, th: 0.9, hm: 8 });
  el.push({ k: 'flood', s0: 0, s1: len, z0: 0, z1: zE });
  void k;
  return el;
}
/** A long side wall of the aisles or the choir: pointed windows in bays, buttresses, a parapet. */
function _sccdSideFace(sp, len, h, k, clerestory) {
  const el = [{ k: 'tex', s0: 0, s1: len, z0: 0, z1: h }], bay = 5.4 * Math.max(0.6, h / 13.5), n = Math.max(1, Math.round(len / bay)), bw = len / n, at = [];
  el.push({ k: 'band', s0: 0, s1: len, z0: 0, z1: 1.3, col: _scbgDark(sp.wall, 0.1), layer: 2, o: 0.05 });
  for (let i = 0; i <= n; i++) at.push(bw * i);
  el.push({ k: 'gbutt', at, w: Math.min(1.1, bw * 0.2), z0: 0, z1: h, hm: 8 });
  for (let i = 0; i < n; i++) {
    const w = Math.min(bw * 0.44, 2.4);
    if (clerestory) el.push({ k: 'gwin', s: bw * (i + 0.5) - w / 2, w, z: h * 0.36, h: h * 0.5, hm: 8, theta: _sccdTheta(sp, k + i) });
    else el.push({ k: 'gwin', s: bw * (i + 0.5) - w / 2, w, z: h * 0.2, h: h * 0.66, hm: 8, theta: _sccdTheta(sp, k + i) });
  }
  el.push({ k: 'gcren', s0: 0, s1: len, z: h, h: 0.9, step: 1.6, hm: 6 });
  el.push({ k: 'flood', s0: 0, s1: len, z0: 0, z1: h });
  return el;
}

/* ---------- the model ---------- */
function _sccdResolve(sp, b) {
  const r = sceneRnd(sceneHash('cathedral|' + sp.seed));
  sp.cathedral = { plan: _SCCD_PLANS[sp.crown] ? sp.crown : 'twin-towers', warm: r() };
  sp.dress = _scbgMix(sp.dress, sp.wall, 0.25);
}
function _sccdBuild(b, sp, foot, modelFn, opt, view) {
  const F = _sccdFrame(foot), part = sceneCathedralParts(F.W, F.D, sp.cathedral ? sp.cathedral.plan : 'twin-towers'), stone = sp.wall, ctop = _scbgLight(sp.dress, 0.1), P = part.plan;
  const crowns = [], dist = (c) => (view && view.ortho ? 0 : Math.hypot(c[0], c[1]));
  const add = (ops, c, top) => { crowns.push({ ops, c, top, behind: false }); void dist; };
  const centre = (s0, s1, t0, t1) => F.LP((s0 + s1) / 2, (t0 + t1) / 2);
  const fz = (z) => z;
  // the west towers (and a single one)
  for (const T of part.towers) {
    const H = T.h, fs = _sccdBox(F, T.s0, T.s1, T.t0, T.t1, 0, H, stone, ctop, (dir, len) => dir === 'E' ? [] : _sccdTowerFace(sp, len, H, dir, T.s0, dir === 'W'));
    const ops = [{ t: 'faces', faces: fs }];
    const pw = Math.max(0.7, 0.04 * (T.s1 - T.s0) * 2.2), ph = P.pinnacle * part.k;
    for (const [s, t] of [[T.s0 + pw * 0.7, T.t0 + pw * 0.7], [T.s1 - pw * 0.7, T.t0 + pw * 0.7], [T.s0 + pw * 0.7, T.t1 - pw * 0.7], [T.s1 - pw * 0.7, T.t1 - pw * 0.7]]) ops.push(..._sccdPinnacle(F, sp, s, t, H + 0.1, ph, pw));
    // the corner buttresses of the front, stepping in as they rise (the two outer corners and the two where the nave meets the tower)
    const bf = [];
    for (const [s, ds] of [[T.s0 + 0.0, 1], [T.s1 - 0.0, 1]]) bf.push(..._sccdButtress(F, sp, s, T.t0 - 0.35, 1.5, 1, H * 0.78, 1.5));
    ops.push({ t: 'faces', faces: bf });
    add(ops, centre(T.s0, T.s1, T.t0, T.t1), H + ph);
  }
  // the nave and its aisles, from the west front to the crossing
  const tw = part.tw, td = part.td, W = F.W, tc = part.tc, nS0 = P.west === 'none' ? tw : tw, nS1 = W - nS0;
  {
    const naveFs = _sccdBox(F, nS0, nS1, 0, tc, 0, part.naveEave, stone, null, (dir, len) => dir === 'W' ? [] : dir === 'E' ? [] : _sccdSideFace(sp, len, part.naveEave, 11, true));
    const front = naveFs.shift();   // the west face is replaced by the gable wall below
    void front;
    const g = _sccdGable(F, nS0, nS1, 0, tc, part.naveEave, part.naveRidge, 't', sp, stone, (dir, len, zE, zR) => dir === 'W' ? _sccdFrontGable(sp, len, zE, zR, 3) : []);
    const ops = [{ t: 'faces', faces: [...g.gables.filter(x => x.dir === 'W'), ...naveFs.filter(f => f.dir !== 'W'), ...g.roofs] }];
    add(ops, centre(nS0, nS1, 0, tc), part.naveRidge);
  }
  // the aisles
  const aisleFill = (dir, len) => dir === 'W' || dir === 'E' ? (dir === 'W' && P.west === 'none' ? _sccdFrontFace(sp, len, part.aisleEave) : []) : (dir === 'L' || dir === 'R' ? _sccdSideFace(sp, len, part.aisleEave, 5, false) : []);
  for (const [a, b] of [[0, nS0], [nS1, W]]) {
    const fs = _sccdBox(F, a, b, P.west === 'twin' ? td : 0, tc, 0, part.aisleEave, stone, null, aisleFill);
    const roof = { poly: a === 0 ? [F.LP(a, td), F.LP(a, tc), F.LP(b, tc), F.LP(b, td)] : [F.LP(b, tc), F.LP(b, td), F.LP(a, td), F.LP(a, tc)] };
    // the lean-to roof: from the outer eave up to the clerestory foot (no tower: from the front)
    const hi = part.aisleEave + 3 * part.k, lo = part.aisleEave, t0 = P.west === 'twin' ? td : 0, p3 = (s, t, z) => { const q = F.LP(s, t); return [q[0], z, q[1]]; };
    const poly = a === 0 ? [p3(a, t0, lo), p3(a, tc, lo), p3(b, tc, hi), p3(b, t0, hi)] : [p3(b, tc, lo), p3(b, t0, lo), p3(a, t0, hi), p3(a, tc, hi)];
    void roof;
    const rf = { poly, n: _scbgNormal(poly), part: 'roof', role: 'roof', col: sp.roofCol, elems: [] };
    add([{ t: 'faces', faces: [...fs.filter(f => f.part === 'wall'), rf] }], centre(a, b, t0, tc), lo);
  }
  // the crossing: transepts and the central tower
  const T0 = part.transept, C = part.central;
  if (T0) {
    const fillT = (dir, len) => dir === 'W' || dir === 'E' ? _sccdSideFace(sp, len, T0.eave, 31, true) : [];
    const fs = _sccdBox(F, T0.s0, T0.s1, T0.t0, T0.t1, 0, T0.eave, stone, null, fillT);
    const g = _sccdGable(F, T0.s0, T0.s1, T0.t0, T0.t1, T0.eave, T0.eave + part.k * 9, 's', sp, stone, (dir, len, zE, zR) => _sccdEndGable(sp, len, zE, zR, dir));
    add([{ t: 'faces', faces: [...g.gables.filter(x => x), ...fs.filter(f => f.dir === 'W' || f.dir === 'E'), ...g.roofs] }], centre(T0.s0, T0.s1, T0.t0, T0.t1), T0.eave + part.k * 9);
  }
  if (C) {
    const H = C.h, fs = _sccdBox(F, C.s0, C.s1, C.t0, C.t1, 0, H, stone, ctop, (dir, len) => _sccdTowerFace(sp, len, H, dir, 40, false));
    const ops = [{ t: 'faces', faces: fs }];
    const pw = 1.1 * part.k, ph = P.pinnacle * part.k;
    if (C.kind === 'spire') {
      const cc = F.LP((C.s0 + C.s1) / 2, (C.t0 + C.t1) / 2), r = (C.s1 - C.s0) * 0.5;
      ops.push({ t: 'rev', c: cc, prof: [[r * 0.98, H], [r * 0.6, H + P.spireH * part.k * 0.5], [r * 0.22, H + P.spireH * part.k * 0.85], [0, H + P.spireH * part.k]], seg: 8, rot: Math.PI / 8, col: _scbgMix(sp.roofCol, sp.dress, 0.35), part: 'roof', light: 0.18, dark: 0.45 });
    } else for (const [s, t] of [[C.s0 + pw * 0.8, C.t0 + pw * 0.8], [C.s1 - pw * 0.8, C.t0 + pw * 0.8], [C.s0 + pw * 0.8, C.t1 - pw * 0.8], [C.s1 - pw * 0.8, C.t1 - pw * 0.8]]) ops.push(..._sccdPinnacle(F, sp, s, t, H + 0.1, ph, pw));
    add(ops, centre(C.s0, C.s1, C.t0, C.t1), H + (C.kind === 'spire' ? P.spireH * part.k : ph));
  }
  // the choir, from the crossing to the east end
  if (part.choirEnd && C) {
    const t0 = C.t1, ce = part.naveEave * 0.95, fs = _sccdBox(F, nS0 - tw * 0.1, nS1 + tw * 0.1, t0, F.D, 0, ce, stone, null, (dir, len) => dir === 'L' || dir === 'R' ? _sccdSideFace(sp, len, ce, 17, true) : dir === 'E' ? _sccdEastEnd(sp, len, ce) : []);
    const g = _sccdGable(F, nS0 - tw * 0.1, nS1 + tw * 0.1, t0, F.D, ce, ce + (part.naveRidge - part.naveEave) * 0.95, 't', sp, stone, null);
    add([{ t: 'faces', faces: [...fs.filter(f => f.part === 'wall'), ...g.gables.filter(x => x.dir === 'E'), ...g.roofs] }], centre(nS0, nS1, t0, F.D), ce);
  }
  void fz;
  const top = crowns.reduce((m, c) => Math.max(m, c.top), 0);
  return { faces: [], blocks: [], E: part.naveEave, E0: part.naveEave, H: top, W: F.W, Dp: F.D, quad: true, Q: () => [0, 0, 0], roofZ: () => part.naveEave, zs: sp.zs, roof: 'gable', crowns, cathedral: part };
}
/** The east end of the choir: a great east window and a row of lancets under the gable. */
function _sccdEastEnd(sp, len, h) {
  const el = [{ k: 'tex', s0: 0, s1: len, z0: 0, z1: h }, { k: 'gbutt', at: [0.6, len - 0.6], w: 1.1, z0: 0, z1: h, hm: 8 }];
  el.push({ k: 'gwin', s: len / 2 - len * 0.2, w: len * 0.4, z: h * 0.3, h: h * 0.6, hm: 12, theta: 0.05 }, { k: 'gcren', s0: 0, s1: len, z: h, h: 0.9, step: 1.6, hm: 6 }, { k: 'flood', s0: 0, s1: len, z0: 0, z1: h });
  return el;
}
/** A transept's gable end: a rose-like great window over a row of lancets, a rake. */
function _sccdEndGable(sp, len, zE, zR, dir) {
  const el = [{ k: 'tex', s0: 0, s1: len, z0: 0, z1: zE }, { k: 'gbutt', at: [0.7, len - 0.7], w: 1.2, z0: 0, z1: zE, hm: 8 }];
  const n = 5, w = Math.min(1.8, len / (n * 1.9));
  for (let i = 0; i < n; i++) el.push({ k: 'gwin', s: len * (i + 0.5) / n - w / 2, w, z: zE * 0.12, h: zE * 0.42, hm: 8, theta: _sccdTheta(sp, i + (dir === 'L' ? 0 : 5)) });
  el.push({ k: 'gwin', s: len / 2 - Math.min(len * 0.22, 3), w: Math.min(len * 0.44, 6), z: zE * 0.62, h: zE * 0.5 + (zR - zE) * 0.7, rise: Math.min(len * 0.44, 6) * 0.8, hm: 10, theta: 0.04 });
  el.push({ k: 'grake', s0: -0.3, s1: len + 0.3, z0: zE - 0.1, z1: zR, th: 0.8, hm: 8 }, { k: 'flood', s0: 0, s1: len, z0: 0, z1: zE });
  return el;
}
/** A plain west end of an aisle (a church with no west towers). */
function _sccdFrontFace(sp, len, h) {
  const el = [{ k: 'tex', s0: 0, s1: len, z0: 0, z1: h }], w = Math.min(len * 0.5, 2.2);
  el.push({ k: 'gwin', s: len / 2 - w / 2, w, z: h * 0.25, h: h * 0.6, hm: 8, theta: 0.1 }, { k: 'gcren', s0: 0, s1: len, z: h, h: 0.9, step: 1.6, hm: 6 }, { k: 'flood', s0: 0, s1: len, z0: 0, z1: h });
  return el;
}
const _SCCD_HOOKS = Object.freeze({ resolve: _sccdResolve, build: _sccdBuild });

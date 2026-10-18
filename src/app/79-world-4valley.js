/* ============================================================
   WORLD ENGINE (scene format v3): A VALLEY SEEN FROM A HILLSIDE (18 Oct, the Peak District edge: "a valley below with a hamlet,
   patchwork fields and a distant ridge"). PURE classic script, private prefix _wvl. Nothing runs at load.

   The ground of a view from the shoulder of a hill is a long slope falling away to a valley floor and rising to a far ridge. The
   relief grid is the only way to say that (a `bank` only goes up), and a field mosaic with its walls, a hamlet and a few woods is a
   hundred polygons nobody should type. `worldValley` makes all of it from a dozen numbers, seeded, in camera metres:

     worldValley({ seed, bearing, drop, fall, floor, far: { rise, run }, shoulder, noise,
                   fields: { from, to, u: [u0, u1], rows, cell, kinds, walls, wallsTo, cross (false: no walls down the slope between fields: seen along their length from a hillside they draw no pixels) },
                   hamlet: { at: [s, u], houses, style, spread, lamps }, woods: { n, ... } }) -> {
       ground: { relief },                      the relief grid (x by log depth) for `spec.ground` (features such as a cliff go beside it)
       surfaces: [...], lines: [...],           the field mosaic (kinds grass / field, each its own id so each takes its own tone) and its walls
       buildings: [...], entities: [...],       the hamlet (cottages) and the woods (`woods: { n, s: [from, to], u, size, obj (an id or a list: one kind per wood, in turn), density }`: surfaces of kind grass with a cluster of trees each)
       at(s, u) -> [x, z], sOf(x, z), uOf(x, z), height(x, z)      the frame of the valley: s is metres DOWNHILL from the camera, u metres
                                                along the contour (away from the camera, +u is `bearing` degrees right of straight ahead)
     }

   bearing: the direction the contours run, degrees from straight ahead (+ right); the valley falls to the LEFT of it.
   drop: the height of the camera above the valley floor; fall: the horizontal run of the hillside; floor: the width of the flat floor;
   far: { rise, run } the opposite hillside; shoulder: metres of near-level ground before the slope steepens; noise: spurs and cloughs
   (0 is a plane, 1 the default, 2 a rough hill). The spec asks for none of this per place: a valley is a few numbers.
   ============================================================ */
function _wvlHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wvlRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const _wvlSm = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
/** Smooth 1-D value noise in [-1, 1] on a lattice (seeded). */
function _wvlN1(seed, x) {
  const i = Math.floor(x), t = x - i, u = t * t * (3 - 2 * t), v = k => (_wvlHash(seed + '|' + k) % 20001) / 10000 - 1;
  return v(i) + (v(i + 1) - v(i)) * u;
}
/** Smooth 2-D value noise in [-1, 1]. */
function _wvlN2(seed, x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz), v = (a, b) => (_wvlHash(seed + '|' + a + '|' + b) % 20001) / 10000 - 1;
  return (v(ix, iz) * (1 - ux) + v(ix + 1, iz) * ux) * (1 - uz) + (v(ix, iz + 1) * (1 - ux) + v(ix + 1, iz + 1) * ux) * uz;
}
const _wvlR = (v, n) => { const k = Math.pow(10, n == null ? 1 : n); return Math.round(v * k) / k; };

function worldValley(o) {
  o = o || {};
  const seed = String(o.seed == null ? 1 : o.seed), th = (Number.isFinite(o.bearing) ? o.bearing : 0) * Math.PI / 180;
  const c = [Math.sin(th), Math.cos(th)], f = [-c[1], c[0]];                       // along the contour; downhill (to the left of it)
  const drop = Number.isFinite(o.drop) ? Math.max(5, o.drop) : 200, fall = Number.isFinite(o.fall) ? Math.max(100, o.fall) : 2000, floor = Number.isFinite(o.floor) ? Math.max(0, o.floor) : 400;
  const far = Object.assign({ rise: 0.8 * drop, run: 1600 }, o.far || {}), shoulder = Number.isFinite(o.shoulder) ? Math.max(0, o.shoulder) : 0, conc = Number.isFinite(o.concave) ? Math.max(1, o.concave) : 1.5, up = Object.assign({ grade: 0.06, run: 60, tail: 0.03 }, o.up || {}), K = Number.isFinite(o.noise) ? Math.max(0, o.noise) : 1;
  const sOf = (x, z) => x * f[0] + z * f[1], uOf = (x, z) => x * c[0] + z * c[1], at = (s, u) => [_wvlR(s * f[0] + u * c[0]), _wvlR(s * f[1] + u * c[1])];
  // the hillside's profile along the fall line: level on the shoulder, a convex roll over onto the slope (a gentle gradient at the camera,
  // steeper below), the flat floor, then the far hillside
  const profile = (sw) => {
    if (sw < 0) return up.grade * Math.min(-sw, up.run) + up.tail * Math.max(0, -sw - up.run);          // uphill of the camera: the steep slope under an edge, then the moor
    const t = (sw - shoulder) / fall;
    if (t < 0) return 0;
    // concave: steepest at the top and flattening toward the floor, so the eye on the shoulder sees the whole slope down to the valley (a profile
    // that steepens below the eye hides everything under the roll-over)
    if (t <= 1) return -drop * (1 - Math.pow(1 - t, conc));
    const t2 = (sw - shoulder - fall - floor) / far.run;
    return -drop + (t2 > 0 ? far.rise * _wvlSm(t2) : 0);
  };
  // spurs and cloughs: the contours wander along the valley (a long swell, a medium bulge, a short wrinkle), and the hillside has hummocks
  // (small mounds and hollows, strongest near the camera where they read)
  const height = (x, z) => {
    const s = sOf(x, z), u = uOf(x, z), d = Math.hypot(x, z);
    const roll = K * (o.roll == null ? 1 : o.roll) * _wvlSm(1 - Math.abs(s - 60) / 500) * (3.2 * _wvlN1(seed + 'r1', u / 260) + 1.4 * _wvlN1(seed + 'r2', u / 95));      // the moor rolls along its length: crests that hide the ground behind them
    const warp = K * (30 * _wvlN1(seed + 'w1', u / 900) + 22 * _wvlN1(seed + 'w2', u / 260) + 14 * _wvlN1(seed + 'w3', u / 80));
    const wob = K * (0.55 * _wvlN2(seed + 'h1', x / 48, z / 48) + 0.12 * _wvlN2(seed + 'h2', x / 20, z / 20)) * _wvlSm((d - 120) / 200) * Math.max(0, 1 - d / 900) + K * 3 * _wvlN2(seed + 'h3', x / 110, z / 110) * Math.max(0, 1 - d / 2500);
    const end = o.end && Number.isFinite(o.end.rise) ? o.end.rise * _wvlSm((u - (Number.isFinite(o.end.at) ? o.end.at : 4200)) / (Number.isFinite(o.end.run) ? o.end.run : 1600)) : 0;        // the valley closes in the far distance (a moor beyond the last field)
    return profile(s + warp * _wvlSm((s - 120) / 400)) + wob + roll * _wvlSm((d - 60) / 200) + end;
  };
  // ---- the relief grid: columns along x, rows in log depth (the v2 grid the camera reads)
  const x0 = Number.isFinite(o.x0) ? o.x0 : -3000, x1 = Number.isFinite(o.x1) ? o.x1 : 700, d0 = Number.isFinite(o.d0) ? o.d0 : 3, d1 = Number.isFinite(o.d1) ? o.d1 : 6000;
  const nx = Math.max(33, Math.min(321, o.nx | 0 || 321)), nd = Math.max(33, Math.min(401, o.nd | 0 || 300)), hh = new Array(nx * nd);
  for (let j = 0; j < nd; j++) {
    const d = d0 * Math.pow(d1 / d0, j / (nd - 1));
    for (let i = 0; i < nx; i++) hh[j * nx + i] = _wvlR(height(x0 + (x1 - x0) * i / (nx - 1), d), 2);
  }
  const out = { ground: { relief: { x: [x0, x1], d: [d0, d1], nx, nd, h: hh } }, surfaces: [], lines: [], buildings: [], entities: [], at, sOf, uOf, height, drop };
  const rng = _wvlRng(_wvlHash(seed + '|fields')), wallStone = typeof o.wallStone === 'string' ? o.wallStone : '#716a5e';
  // ---- the field mosaic: rows along the contours (walled), each cut across into fields of its own size; kinds alternate so every
  // field is its own polygon with its own id (the terrain gives each a tone of its own)
  const F = o.fields;
  if (F && typeof F === 'object') {
    const s0 = Number.isFinite(F.from) ? F.from : 0.2 * fall, s1 = Number.isFinite(F.to) ? F.to : shoulder + fall + floor * 0.5, uA = (F.u || [-300, 3000])[0], uB = (F.u || [-300, 3000])[1];
    const rows = Math.max(2, F.rows | 0 || 7), cell = Number.isFinite(F.cell) ? F.cell : 280, kinds = Array.isArray(F.kinds) && F.kinds.length ? F.kinds : ['field'];
    // row edges, wider toward the floor (the enclosures of the valley bottom are bigger and straighter than the intake fields)
    const edges = [s0];
    for (let i = 1; i <= rows; i++) edges.push(edges[i - 1] + (s1 - s0) / rows * (0.65 + 0.7 * rng()) * (1 + 0.15 * i / rows));
    const sc = (s1 - s0) / edges[rows]; for (let i = 0; i <= rows; i++) edges[i] = s0 + (edges[i] - s0) * sc;
    let n = 0, wl = 0;
    const wallPts = (sa, ua, sb, ub) => {
      const L = Math.hypot(sb - sa, ub - ua), m = Math.max(1, Math.round(L / 120)), P = [];
      for (let i = 0; i <= m; i++) { const t = i / m, jit = i === 0 || i === m ? 0 : (rng() - 0.5) * 14; P.push(at(sa + (sb - sa) * t + jit * (ub - ua) / L, ua + (ub - ua) * t - jit * (sb - sa) / L)); }
      return P;
    };
    for (let r = 0; r < rows; r++) {
      const sa0 = edges[r], sb0 = edges[r + 1], wob = (u) => 22 * _wvlN1(seed + 'row' + r, u / 420) * Math.min(1, (sb0 - sa0) / 140);
      // the row's walls along the contour (one polyline per row's lower edge; the first row's upper edge is the intake wall of the moor)
      const wallsTo = Number.isFinite(F.wallsTo) ? F.wallsTo : Infinity;                       // a wall under a pixel wide at a few kilometres draws nothing: the field tones are the boundary there
      if (F.walls !== false) {
        const along = (s, id) => { if (s > wallsTo) return; const P = []; for (let u = uA; u <= uB + 1; u += 150) P.push(at(s + wob(u) * 0.8, u)); out.lines.push({ id, kind: 'wall', stone: wallStone, path: P }); wl++; };
        if (r === 0) along(sa0, 'intake'); along(sb0, 'row-' + r);
      }
      let u = uA + rng() * cell * 0.4, prev = uA;
      while (u < uB) {
        const w = cell * (0.45 + 1.1 * rng()), ue = Math.min(uB, u + w), sa = sa0 + wob(u), sb = sb0 + wob(u), sa2 = sa0 + wob(ue), sb2 = sb0 + wob(ue);
        const kind = kinds[Math.floor(rng() * kinds.length)], mid = (u + ue) / 2;
        const ptsA = [at(sa, u), at(sa2, ue), at(sb2, ue), at(sb, u)];
        out.surfaces.push({ id: 'fld-' + r + '-' + n++, kind, poly: ptsA });
        if (F.walls !== false && F.cross !== false && sa <= wallsTo && u > uA + 1) out.lines.push({ id: 'xw-' + r + '-' + n, kind: 'wall', stone: wallStone, path: wallPts(sa, u, sb, u) });
        prev = ue; u = ue + (F.gap || 0);
        void mid;
      }
    }
    out.fieldRows = edges;
  }
  // ---- woods: irregular blocks of trees along the valley (a clough, a hanging wood, the river's alders): each a surface of its own with a cluster of trees
  const Wd = o.woods;
  if (Wd && typeof Wd === 'object') {
    const wr = _wvlRng(_wvlHash(seed + '|woods')), n = Math.max(1, Wd.n | 0 || 8), sA = (Wd.s || [800, 2200])[0], sB = (Wd.s || [800, 2200])[1], uA = (Wd.u || [-300, 3500])[0], uB = (Wd.u || [-300, 3500])[1], sz = Wd.size || [80, 220];
    for (let i = 0; i < n; i++) {
      const cs = sA + (sB - sA) * wr(), cu = uA + (uB - uA) * wr(), a = sz[0] + (sz[1] - sz[0]) * wr(), b = a * (0.4 + 0.9 * wr()), poly = [];
      for (let k = 0; k < 8; k++) { const th = k / 8 * Math.PI * 2, rr = 0.7 + 0.4 * wr(); poly.push(at(cs + Math.cos(th) * a * 0.5 * rr, cu + Math.sin(th) * b * 0.5 * rr)); }
      const id = 'wood-' + i; out.surfaces.push({ id, kind: 'grass', poly });
      const objs = Array.isArray(Wd.obj) && Wd.obj.length ? Wd.obj : [Wd.obj || 'tree.far-broad'];
      // (trees: false: the terrain draws the wood as a canopy of crowns, 4terrain _wtrValleyOps; far trees as sprites read as lollipops)
      if (Wd.trees !== false) out.entities.push({ cluster: objs[i % objs.length], on: id, n: Math.max(6, Math.round((Wd.density || 0.0035) * a * b)), seed: 100 + i });
    }
  }
  // ---- the hamlet: a cluster of stone cottages and a farm along a lane, with a church tower (footprints only; a style gives the stone)
  const Hm = o.hamlet;
  if (Hm && typeof Hm === 'object' && Array.isArray(Hm.at)) {
    const hr = _wvlRng(_wvlHash(seed + '|hamlet')), n = Math.max(2, Hm.houses | 0 || 9), style = Hm.style || 'stone-cottage', spread = Number.isFinite(Hm.spread) ? Hm.spread : 90;
    let placed = 0;
    for (let i = 0; i < n * 3 && placed < n; i++) {
      const du = (hr() - 0.5) * 2 * spread * 1.4, ds = (hr() - 0.5) * 2 * spread * 0.7, w = 8 + hr() * 7, dpt = 5.5 + hr() * 3, big = hr() < 0.18;
      const cs = Hm.at[0] + ds, cu = Hm.at[1] + du;
      if (out.buildings.some(b => Math.hypot(b._s - cs, b._u - cu) < 26)) continue;
      const ww = big ? w * 1.5 : w, face = hr() < 0.5;                                               // the ridge runs along the contour or down the slope
      const p = face ? [[cs - dpt / 2, cu - ww / 2], [cs + dpt / 2, cu - ww / 2], [cs + dpt / 2, cu + ww / 2], [cs - dpt / 2, cu + ww / 2]] : [[cs - ww / 2, cu - dpt / 2], [cs + ww / 2, cu - dpt / 2], [cs + ww / 2, cu + dpt / 2], [cs - ww / 2, cu + dpt / 2]];
      const b = { id: 'hm-' + placed, foot: p.map(q => at(q[0], q[1])), storeys: big ? 3 : hr() < 0.35 ? 1 : 2, roof: 'pitched', style };
      Object.defineProperty(b, '_s', { value: cs, enumerable: false }); Object.defineProperty(b, '_u', { value: cu, enumerable: false });
      out.buildings.push(b); placed++;
    }
    // lamps along the lane (lit at night through the world's own light pass: a hamlet two kilometres off is a handful of warm points and their glow)
    const nl = Number.isFinite(Hm.lamps) ? Hm.lamps | 0 : 0;
    for (let i = 0; i < nl && i < out.buildings.length; i++) { const b = out.buildings[Math.floor(i * out.buildings.length / nl)]; out.entities.push({ obj: 'street.lamppost', id: 'hm-lamp-' + i, at: at(b._s + 7.5, b._u + 3), attach: 'ground' }); }
  }
  // ---- farms: a farmhouse and its barn here and there among the fields (footprints only; the style gives the stone)
  const Fm = o.farms;
  if (Fm && typeof Fm === 'object' && F && typeof F === 'object') {
    const fr = _wvlRng(_wvlHash(seed + '|farms')), n = Math.max(1, Fm.n | 0 || 6), sA = (Number.isFinite(F.from) ? F.from : 300) + 120, sB = (Number.isFinite(F.to) ? F.to : 2000) - 150, uA = (F.u || [-300, 3000])[0] + 200, uB = (F.u || [-300, 3000])[1] - 200;
    let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) {
      const cs = sA + (sB - sA) * fr(), cu = uA + (uB - uA) * fr();
      if (Hm && Array.isArray(Hm.at) && Math.hypot(cs - Hm.at[0], cu - Hm.at[1]) < 380) continue;
      if (out.buildings.some(b => b._s != null && Math.hypot(b._s - cs, b._u - cu) < 260)) continue;
      const rot = fr() < 0.5, box = (s0, u0, ds, du) => { const p = rot ? [[s0 - ds, u0 - du], [s0 + ds, u0 - du], [s0 + ds, u0 + du], [s0 - ds, u0 + du]] : [[s0 - du, u0 - ds], [s0 + du, u0 - ds], [s0 + du, u0 + ds], [s0 - du, u0 + ds]]; return p.map(q => at(q[0], q[1])); };
      const hb = { id: 'farm-' + k + '-h', foot: box(cs, cu, 3, 5), storeys: 2, roof: 'pitched', style: Fm.style || 'stone-cottage' };
      const bb = { id: 'farm-' + k + '-b', foot: box(cs + (rot ? 0 : 15), cu + (rot ? 15 : 0), 4.5, 9), storeys: 1, roof: 'pitched', style: Fm.style || 'stone-cottage' };
      for (const b of [hb, bb]) { Object.defineProperty(b, '_s', { value: cs, enumerable: false }); Object.defineProperty(b, '_u', { value: cu, enumerable: false }); out.buildings.push(b); }
      k++;
    }
  }
  // ---- lanes: one along the valley through the hamlet, one climbing from it up the hillside to the moor gate (tracks between the walls)
  const Lw = o.lanes;
  if (Lw && Hm && Array.isArray(Hm.at)) {
    const uA = (F && F.u ? F.u[0] : -300), uB = (F && F.u ? F.u[1] : 3000), along = [];
    for (let u = uA; u <= uB + 1; u += 120) along.push(at(Hm.at[0] + 25 + 60 * _wvlN1(seed + 'lane', u / 700) * (u === Hm.at[1] ? 0 : 1), u));
    out.surfaces.push({ id: 'lane-0', kind: 'track', path: along, width: 4 });
    const up = [], s1 = F && Number.isFinite(F.from) ? F.from + 30 : 300;
    for (let i = 0; i <= 8; i++) { const t = i / 8, sv = Hm.at[0] + (s1 - Hm.at[0]) * t; up.push(at(sv, Hm.at[1] + 170 + 140 * Math.sin(t * Math.PI * 2.2) * (1 - t * 0.3) + 120 * t)); }
    out.surfaces.push({ id: 'lane-1', kind: 'track', path: up, width: 3.5 });
  }
  return out;
}

/**
 * A spec with a `valley` key (the numbers worldValley takes) with the valley made: its relief becomes ground.relief, its fields, walls, woods and hamlet are added after
 * the authored surfaces, lines, buildings and entities (the authored ones first, so a surface drawn later in a spec wins: the fields over the moor polygon). The key goes.
 * Called by the validator and the build, so the spec file holds twenty numbers instead of a hundred thousand.
 */
function worldSpecExpand(spec) {
  if (!spec || typeof spec !== 'object' || !spec.valley || typeof spec.valley !== 'object') return spec;
  const V = worldValley(spec.valley), out = Object.assign({}, spec);
  delete out.valley;
  out.ground = Object.assign({}, spec.ground || {}, { relief: V.ground.relief });
  out.surfaces = (Array.isArray(spec.surfaces) ? spec.surfaces : []).concat(V.surfaces);
  out.lines = (Array.isArray(spec.lines) ? spec.lines : []).concat(V.lines);
  out.buildings = (Array.isArray(spec.buildings) ? spec.buildings : []).concat(V.buildings);
  out.entities = V.entities.concat(Array.isArray(spec.entities) ? spec.entities : []);
  return out;
}

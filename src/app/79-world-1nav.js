// World engine: navigation (docs/dev/WORLD_ENGINE.md 3; requirements A2, A3, C2, W3, F1).
//
// Pure (Node + browser). Turns a World's surfaces and static solids into per-layer grids that movers can never leave:
// walk / graze / swim / wade / drive grids, raised walk levels ('walk@1', 'walk@2' ...) and 1D rail lines. Each cell carries a
// cost (0 = never) and a clearance (metres to the nearest solid or off-layer ground), so a mover of radius r may only stand
// where clear >= r: solids are cut out and widened by the mover's radius by construction, and a boat keeps its half-beam off
// the banks. A near-camera band (moverNear: depth < f * h / 405) is off limits unless the caller says the mover is `framed`.
//
// TWO GRIDS per layer, joined at z = 60 m (3.1): 0.5 m cells from the camera to 60 m and 2 m cells from 60 to 300 m, both
// clipped to the widest frame (21:9) plus a margin, so the near grid is NEVER coarsened (narrow diagonal paths stay
// connected) and a wide world stays cheap. Cells have one index space: near cells first (0 .. N0 - 1), then far cells. In
// the far grid the clearance is measured from the cell centre, linear surfaces (path + width) are painted along their whole
// centre line (so a 2.6 m towpath stays connected at 2 m cells) and every far cell has an ANCHOR, a legal point inside it
// that movers steer to (the cell centre, or the nearest point of the path band).
//
// LEVELS (W3): a deck (an entity's deck, or a walk surface with `y`) more than a step (0.6 m) above the ground beneath is
// its own walk layer 'walk@<n>'; nothing under it is blocked (a bridge deck is overhead to the towpath, the canal and the
// road below). Levels are joined only by stairs and ramps (surfaces `kind: 'stairs' | 'ramp'`, `from`, `to`: cells shared by
// both layers, the height interpolated along them) and, for decks within 1.2 m of the ground beside them, by landings
// (a step aboard a moored boat). `bridge-deck` surfaces never cut what is beneath them.
//
//   worldNavBuild(world, o?) -> Nav
//   worldNavLayer(nav, layer) -> Layer { layer, cell, w, h, ox, oz (the near grid), far, N0, N, data, clear, nearZ, seam, y }
//                                | { layer: 'rail', lines }
//   worldNavOk(nav, layer, x, z, r, framed) -> bool          (the one legality test; everything else uses it)
//   worldNavCell(nav, layer, x, z) -> cell index | -1;  worldNavCellXZ(nav, layer, k) -> [x, z] (the anchor)
//   worldNavY(nav, layer, x, z) -> metres                     (walking height: ground, low deck, level, stairs; water level)
//   worldNavSurfaceId(nav, layer, x, z) -> surface id | 'deck:<id>' | null
//   worldNavComponents(nav, layer, r) -> { comp: Int32Array, sizes }   (connected parts, cached)
//   worldNavLevels(nav) -> [{ layer, y, id }];  worldNavPortals(nav) -> [{ kind, a, b, id, pairs: [[ax, az, bx, bz]] }]
//   worldFlowField(nav, layer, goal, r, framed) -> Field     (lazy, cached, <= 32 per nav; Dial's bucket queue)
//   worldFlowDir(field, x, z) -> [dx, dz] | null             (unit direction downhill, looking ahead along the field)
//   worldFlowTarget(field, x, z) -> [tx, tz, k] | null        (the point it steers at, planned from cell k: callers may reuse it
//                                                             while they stay in cell k, so line checks run once per cell)
//   worldFlowDist(field, x, z) -> metres-ish cost | Infinity (0 on the goal)
//   worldPath(nav, layer, from, to, r, framed) -> [[x, z], ...] | null   (A* capped at 2,000 expansions, string-pulled; a
//                                                                         failed search returns null: the CALLER backs off)
//   worldStep(nav, layer, pos, vel, r, dt, framed) -> [x, z]  (clamped slide; never returns a forbidden point)
//   worldSpawnCells(nav, layer, r) -> [{ x, z, i, edge: 'W' | 'E' | 'N' | 'S' | 'cover' | 'door', hidden }]
//
// Goals for flow fields: [x, z] | { x, z } | an edge letter ('N' far, 'S' near, 'E' right, 'W' left, 'cover', 'door', 'any',
// and the aliases far / near / right / left) | { key, cells: [k ...] } | { key, surface: id } (every cell of a surface).
//
// World input (worldBuild): { cam, surfaces: [{ id, kind, poly | path + width, shallow, open, y, from, to, level }],
// entities: [{ id, obj, cls, x, z, y, foot, size | height, solidity, static, open, deck: { poly, y }, attach }] }.
// Gates (cls 'gate') are solid unless open: true. Hedges are solid to walkers. Weirs are solid to swimmers.

const WORLD_NAV_LAYERS = ['walk', 'graze', 'swim', 'wade', 'drive', 'rail'];
const WORLD_NAV_RADIUS = { walk: 0.25, graze: 0.3, swim: 0.15, wade: 0.2, drive: 1.0, rail: 0 };
// the tallest typical user of a layer, for the near band (an adult up to 1.9 m, K8)
const WORLD_NAV_HEIGHT = { walk: 1.9, graze: 1.4, swim: 0.6, wade: 1.0, drive: 1.8, rail: 3.8 };
/** near / far cell (m), the seam and the far limit (z, m), side margin (m), the widest frame aspect, a step and a landing (m). */
const WORLD_NAV_GRID = Object.freeze({ near: 0.5, far: 2, seam: 60, max: 300, pad: 14, aspect: 21 / 9, step: 0.6, landing: 1.2 });
const WORLD_NAV_FLOWCAP = 32;
const WORLD_NAV_ASTARCAP = 2000;
// surface kind -> { layer: cost x10 }
const _WNAV_KIND = {
  path: { walk: 10 }, pavement: { walk: 10 }, towpath: { walk: 10 }, plaza: { walk: 10 }, boardwalk: { walk: 10 },
  'bridge-deck': { walk: 10 }, deck: { walk: 10 }, platform: { walk: 10 }, stairs: { walk: 11 }, ramp: { walk: 10 },
  crossing: { walk: 12, drive: 10 },
  grass: { walk: 16, graze: 10 }, heath: { walk: 16, graze: 10 }, field: { walk: 16, graze: 10 }, sand: { walk: 16, graze: 10 },
  road: { drive: 10 }, water: { swim: 10 }, reeds: { wade: 10 }, bed: { wade: 10 },
};
const _WNAV_WALKKINDS = { path: 1, pavement: 1, towpath: 1, plaza: 1, boardwalk: 1, 'bridge-deck': 1, deck: 1, platform: 1 };
const _WNAV_EDGE_ALIAS = { far: 'N', near: 'S', right: 'E', left: 'W' };

function _wnavClamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function _wnavInPoly(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function _wnavSegDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L > 0 ? _wnavClamp(((x - ax) * dx + (z - az) * dz) / L, 0, 1) : 0;
  const ex = ax + t * dx - x, ez = az + t * dz - z;
  return Math.sqrt(ex * ex + ez * ez);
}
/** The nearest point of a polyline to (x, z): [px, pz, distance, arc length]. */
function _wnavNearOnPath(P, x, z) {
  let best = [P[0][0], P[0][1], Math.hypot(x - P[0][0], z - P[0][1]), 0], acc = 0;
  for (let i = 1; i < P.length; i++) {
    const ax = P[i - 1][0], az = P[i - 1][1], dx = P[i][0] - ax, dz = P[i][1] - az, L2 = dx * dx + dz * dz, L = Math.sqrt(L2);
    const t = L2 > 0 ? _wnavClamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1) : 0, px = ax + t * dx, pz = az + t * dz, d = Math.hypot(x - px, z - pz);
    if (d < best[2]) best = [px, pz, d, acc + t * L];
    acc += L;
  }
  return best;
}
/** Distance from a point to a polygon given as a flat [x0, z0, x1, z1, ...] array; 0 inside. */
function _wnavPolyDistF(P, x, z) {
  const n = P.length; let c = false, best = Infinity;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    const ax = P[j], az = P[j + 1], bx = P[i], bz = P[i + 1];
    if ((bz > z) !== (az > z) && x < (ax - bx) * (z - bz) / (az - bz) + bx) c = !c;
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    let t = L > 0 ? ((x - ax) * dx + (z - az) * dz) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + t * dx - x, ez = az + t * dz - z, d = ex * ex + ez * ez;
    if (d < best) best = d;
  }
  return c ? 0 : Math.sqrt(best);
}
/** Distance from a point to a shape ({ poly } or { path, width }); 0 inside. */
function _wnavShapeDist(s, x, z) {
  if (s.poly) {
    if (_wnavInPoly(s.poly, x, z)) return 0;
    let d = Infinity; const p = s.poly;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) d = Math.min(d, _wnavSegDist(x, z, p[j][0], p[j][1], p[i][0], p[i][1]));
    return d;
  }
  let d = Infinity; const p = s.path;
  if (p.length === 1) return Math.max(0, Math.hypot(x - p[0][0], z - p[0][1]) - (s.width || 0) / 2);
  for (let i = 1; i < p.length; i++) d = Math.min(d, _wnavSegDist(x, z, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]));
  return Math.max(0, d - (s.width || 0) / 2);
}
function _wnavContains(s, x, z) { return s.poly ? _wnavInPoly(s.poly, x, z) : _wnavShapeDist(s, x, z) <= 0; }
function _wnavBBox(s) {
  const pts = s.poly || s.path, pad = s.poly ? 0 : (s.width || 0) / 2;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  return [x0 - pad, z0 - pad, x1 + pad, z1 + pad];
}
function _wnavCentroid(s) { const b = _wnavBBox(s); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
/** An entity's footprint polygon: its derived `foot`, else a box / disc from its size, rotated by facing. */
function _wnavFoot(e) {
  if (Array.isArray(e.foot) && e.foot.length >= 3) return e.foot;
  const sz = e.size || {}, w = sz.w || e.w || 0.6, d = sz.d || e.d || w;
  const a = (e.facing || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [e.x + u * c + v * s, e.z - u * s + v * c]);
}
function _wnavIsGate(e) { return e.cls === 'gate' || /(^|[.\-])gate([.\-]|$)/.test(String(e.obj || '')) && !/gateway|gatehouse|lock-gate/.test(String(e.obj || '')); }
function _wnavIsSolid(e) {
  if (e.static === false) return false;
  if (_wnavIsGate(e)) return e.open !== true;
  return e.solidity === 'solid';
}
function _wnavAttachKind(e) { const s = String(e.attach || ''); const i = s.indexOf(':'); return i < 0 ? s : s.slice(0, i); }
function _wnavAttachRef(e) { const s = String(e.attach || ''); const i = s.indexOf(':'); return i < 0 ? null : s.slice(i + 1); }

function _wnavCam(world) {
  const c = world.cam || world.camera || {};
  const fov = c.fov || 62, x0 = Number.isFinite(c.x0) ? c.x0 : 800;
  const f = c.f || 800 / Math.tan(fov * Math.PI / 360);
  const ext = (900 * WORLD_NAV_GRID.aspect - 1600) / 2;                 // the widest frame shows this much more each side
  const eye = c.eye || 1.65, horizon = Number.isFinite(c.horizon) ? c.horizon : 470;
  return { f, x0, W: 1600, H: 900, eye, horizon, tanL: (x0 + ext) / f, tanR: (1600 - x0 + ext) / f, tanL0: x0 / f, tanR0: (1600 - x0) / f,
    dMin: Number.isFinite(c.dMin) ? c.dMin : f * eye / Math.max(1, 900 - horizon), raw: c };
}
function _wnavGroundY(cam, x, z) {
  if (typeof sceneGroundHeight === 'function' && cam && cam.raw && cam.raw.relief !== undefined) {
    const h = sceneGroundHeight(cam.raw, x, z); if (typeof h === 'number' && isFinite(h)) return h;
  }
  return 0;
}

/* ---------- the two grids ---------- */
/** The near and far grids of an extent [x0, z0, x1, z1] (world metres), clipped to the widest frame plus the margin. */
function _wnavMakeGrids(ext, cam, o) {
  const G = WORLD_NAV_GRID, seam = G.seam, pad = G.pad, nc = G.near, fc = G.far;
  const zA = Math.max(0, ext[1]), zB = Math.min(ext[3], G.max);
  const out = { seam, near: null, far: null, N0: 0, N: 0 };
  const clipX = (z) => [Math.max(ext[0], -(z * cam.tanL + pad)), Math.min(ext[2], z * cam.tanR + pad)];
  const noFar = o && o.single;
  if (zA < seam || noFar) {
    const zTop = noFar ? zB : Math.min(zB, seam);
    const [xa, xb] = clipX(noFar ? zB : Math.min(zTop, seam));
    const ox = Math.floor(xa / fc) * fc, oz = Math.floor(zA / nc) * nc;
    const hasFar = !noFar && zB > seam;
    const zEnd = hasFar ? seam + 2 : zTop;                                   // 2 m of dead rows past the seam (clearance only)
    const w = Math.max(1, Math.ceil((xb - ox) / nc)), h = Math.max(1, Math.ceil((zEnd - oz) / nc));
    const hLive = hasFar ? Math.max(0, Math.round((seam - oz) / nc)) : h;
    out.near = { ox, oz, w, h, hLive, cell: nc, off: 0 };
    out.N0 = w * h;
  }
  if (zB > seam && !noFar) {
    const [xa, xb] = clipX(zB);
    const ox = Math.floor(xa / fc) * fc, oz = seam - fc;                     // row 0 (58 .. 60 m) is dead: clearance only
    const w = Math.max(1, Math.ceil((xb - ox) / fc)), h = Math.max(2, Math.ceil((zB - oz) / fc));
    out.far = { ox, oz, w, h, cell: fc, off: out.N0 };
  }
  out.N = out.N0 + (out.far ? out.far.w * out.far.h : 0);
  return out;
}

/** Call put(k) for every cell of one grid whose centre lies in a shape: scanline fill for polygons, per-segment for paths. */
function _wnavFill(s, g, put) {
  const w = g.w, h = g.h, cell = g.cell, ox = g.ox, oz = g.oz;
  if (s.poly) {
    const p = s.poly, xs = [];
    const b = _wnavBBox(s);
    const j0 = Math.max(0, Math.floor((b[1] - oz) / cell)), j1 = Math.min(h - 1, Math.ceil((b[3] - oz) / cell));
    for (let j = j0; j <= j1; j++) {
      const z = oz + (j + 0.5) * cell; xs.length = 0;
      for (let i = 0, k = p.length - 1; i < p.length; k = i++) {
        const zi = p[i][1], zk = p[k][1];
        if ((zi > z) !== (zk > z)) xs.push(p[i][0] + (z - zi) * (p[k][0] - p[i][0]) / (zk - zi));
      }
      xs.sort((u, v) => u - v);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        const i0 = Math.max(0, Math.ceil((xs[q] - ox) / cell - 0.5)), i1 = Math.min(w - 1, Math.ceil((xs[q + 1] - ox) / cell - 0.5) - 1);
        for (let i = i0; i <= i1; i++) put(j * w + i);
      }
    }
    return;
  }
  const P = s.path, hw = (s.width || 0) / 2;
  for (let n = 1; n < P.length; n++) {
    const a = P[n - 1], c = P[n];
    const i0 = Math.max(0, Math.floor((Math.min(a[0], c[0]) - hw - ox) / cell)), i1 = Math.min(w - 1, Math.ceil((Math.max(a[0], c[0]) + hw - ox) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(a[1], c[1]) - hw - oz) / cell)), j1 = Math.min(h - 1, Math.ceil((Math.max(a[1], c[1]) + hw - oz) / cell));
    for (let j = j0; j <= j1; j++) {
      const z = oz + (j + 0.5) * cell;
      for (let i = i0; i <= i1; i++) if (_wnavSegDist(ox + (i + 0.5) * cell, z, a[0], a[1], c[0], c[1]) <= hw) put(j * w + i);
    }
  }
}
/** Every cell of a grid a path's centre line passes through (a grid traversal: 4-connected by construction), so a narrow
 *  linear feature stays connected at 2 m cells. */
function _wnavSuper(P, g, put) {
  const cell = g.cell;
  for (let n = 1; n < P.length; n++) {
    const ax = (P[n - 1][0] - g.ox) / cell, az = (P[n - 1][1] - g.oz) / cell, bx = (P[n][0] - g.ox) / cell, bz = (P[n][1] - g.oz) / cell;
    let i = Math.floor(ax), j = Math.floor(az);
    const ti = Math.floor(bx), tj = Math.floor(bz), dx = bx - ax, dz = bz - az, si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1;
    const tdx = dx ? Math.abs(1 / dx) : Infinity, tdz = dz ? Math.abs(1 / dz) : Infinity;
    let tmx = dx ? ((dx > 0 ? i + 1 : i) - ax) / dx : Infinity, tmz = dz ? ((dz > 0 ? j + 1 : j) - az) / dz : Infinity;
    const visit = (ii, jj) => { if (ii >= 0 && jj >= 0 && ii < g.w && jj < g.h) put(jj * g.w + ii); };
    visit(i, j);
    for (let guard = 0; (i !== ti || j !== tj) && guard < 100000; guard++) {
      if (Math.abs(tmx - tmz) < 1e-9) { visit(i + si, j); visit(i, j + sj); i += si; j += sj; tmx += tdx; tmz += tdz; }
      else if (tmx < tmz) { i += si; tmx += tdx; } else { j += sj; tmz += tdz; }
      if (tmx > 1 + 1e-9 && tmz > 1 + 1e-9 && (i !== ti || j !== tj)) break;
      visit(i, j);
    }
  }
}
/** Squared Euclidean distance transform (Felzenszwalb) over a w x h grid; seeds are cells with f = 0. */
function _wnavEDT(f, w, h) {
  const INF = 1e20, n = Math.max(w, h), d = new Float64Array(n), v = new Int32Array(n), zz = new Float64Array(n + 1), g = new Float64Array(n);
  const pass = (base, stride, len) => {
    for (let q = 0; q < len; q++) g[q] = f[base + q * stride];
    let k = 0; v[0] = 0; zz[0] = -INF; zz[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = ((g[q] + q * q) - (g[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= zz[k]) { k--; s = ((g[q] + q * q) - (g[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; zz[k] = s; zz[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (zz[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + g[p]; }
    for (let q = 0; q < len; q++) f[base + q * stride] = d[q];
  };
  for (let x = 0; x < w; x++) pass(x, w, h);
  for (let y = 0; y < h; y++) pass(y * w, 1, w);
  return f;
}
/** Distance from every cell centre (or anchor, ax / az) of one grid to the nearest solid shape (exact within 1.5 m; beyond, a lower bound). */
function _wnavSolidDist(shapes, g, ax, az) {
  const w = g.w, h = g.h, cell = g.cell, ox = g.ox, oz = g.oz, N = w * h;
  const sd = new Float32Array(N).fill(Infinity);
  for (const s of shapes) {
    const b = _wnavBBox(s), R = 1.5 + cell, P = s.poly ? Float64Array.from(s.poly.flat()) : null;
    if (b[2] + R < ox || b[0] - R > ox + w * cell || b[3] + R < oz || b[1] - R > oz + h * cell) continue;
    const i0 = _wnavClamp(Math.floor((b[0] - R - ox) / cell), 0, w - 1), i1 = _wnavClamp(Math.ceil((b[2] + R - ox) / cell), 0, w - 1);
    const j0 = _wnavClamp(Math.floor((b[1] - R - oz) / cell), 0, h - 1), j1 = _wnavClamp(Math.ceil((b[3] + R - oz) / cell), 0, h - 1);
    for (let j = j0; j <= j1; j++) {
      const z = oz + (j + 0.5) * cell;
      if (s.poly) { for (let i = i0; i <= i1; i++) { const k = j * w + i, d = ax ? _wnavPolyDistF(P, ax[k], az[k]) : _wnavPolyDistF(P, ox + (i + 0.5) * cell, z); if (d < sd[k]) sd[k] = d; } }
      else for (let i = i0; i <= i1; i++) { const k = j * w + i, d = ax ? _wnavShapeDist(s, ax[k], az[k]) : _wnavShapeDist(s, ox + (i + 0.5) * cell, z); if (d < sd[k]) sd[k] = d; }
    }
  }
  // every footprint point lies within cell * 0.7072 of a seed centre, so (centre distance - that) never overestimates
  const f = new Float64Array(N);
  for (let k = 0; k < N; k++) f[k] = sd[k] < cell * 0.7072 ? 0 : 1e20;
  _wnavEDT(f, w, h);
  for (let k = 0; k < N; k++) if (sd[k] > 1.5) sd[k] = Math.max(1.5, Math.sqrt(f[k]) * cell - cell * 0.7072);
  return sd;
}

/**
 * One family of layers over one pair of grids. spec: { layers: [names], owners: [shapes painted in order, each with a `kind`
 * (later wins) or a `costs` map], extra: [{ shape, costs, y }] painted on top WITHOUT changing the owner (low decks, overhead
 * decks), solids: { ground: [shapes], wet: [shapes] }, shallow(owner) -> metres, levelY(owner) -> y }.
 */
function _wnavFamily(G, spec, cam) {
  const grids = [G.near, G.far].filter(Boolean), N = G.N;
  const own = new Int16Array(N).fill(-1), xown = new Int16Array(N).fill(-1);
  const anchorX = G.far ? new Float32Array(G.far.w * G.far.h) : null, anchorZ = G.far ? new Float32Array(G.far.w * G.far.h) : null;
  const rL = 0.4;                                                           // anchors keep this far inside a path's band
  for (const g of grids) {
    const isFar = g === G.far;
    if (isFar) for (let q = 0; q < g.w * g.h; q++) { anchorX[q] = g.ox + (q % g.w + 0.5) * g.cell; anchorZ[q] = g.oz + (Math.floor(q / g.w) + 0.5) * g.cell; }
    spec.owners.forEach((s, si) => {
      const put = (q) => {
        own[g.off + q] = si;
        if (isFar) {
          const cx = g.ox + (q % g.w + 0.5) * g.cell, cz = g.oz + (Math.floor(q / g.w) + 0.5) * g.cell;
          if (s.path) {
            const nr = _wnavNearOnPath(s.path, cx, cz), lim = Math.max(0, (s.width || 0) / 2 - rL);
            if (nr[2] <= lim) { anchorX[q] = cx; anchorZ[q] = cz; }
            else { const t = nr[2] > 1e-9 ? lim / nr[2] : 0; anchorX[q] = nr[0] + (cx - nr[0]) * t; anchorZ[q] = nr[1] + (cz - nr[1]) * t; }
          } else { anchorX[q] = cx; anchorZ[q] = cz; }
        }
      };
      _wnavFill(s, g, put);
      if (isFar && s.path) _wnavSuper(s.path, g, put);
    });
    (spec.extra || []).forEach((x, xi) => {
      const put = (q) => { xown[g.off + q] = xi; };
      _wnavFill(x.shape, g, put);
      if (isFar && x.shape.path) _wnavSuper(x.shape.path, g, put);
    });
  }
  // a far cell near a small solid (a bench on a towpath) anchors where it is clearest of it, inside its own surface
  if (G.far) {
    const F = G.far, all = spec.solids.ground.concat(spec.solids.wet.filter(w => spec.solids.ground.indexOf(w) < 0)), S = _wnavFarSolids(F, all);
    if (S) for (let q = 0; q < F.w * F.h; q++) {
      if (S.start[q] === S.start[q + 1]) continue;
      const k = F.off + q, o = own[k], xo = xown[k], sh = xo >= 0 ? spec.extra[xo].shape : o >= 0 ? spec.owners[o] : null;
      if (!sh) continue;
      const inside = (x, z) => sh.path ? _wnavNearOnPath(sh.path, x, z)[2] <= Math.max(0, (sh.width || 0) / 2 - rL) : _wnavInPoly(sh.poly, x, z);
      const L0 = { farSol: S, far: F, N0: F.off };
      let bx = anchorX[q], bz = anchorZ[q], bd = _wnavFarSolidDist(L0, k, bx, bz);
      const x0 = F.ox + (q % F.w) * F.cell, z0 = F.oz + Math.floor(q / F.w) * F.cell;
      for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) {
        const x = x0 + (a + 0.5) * F.cell / 5, z = z0 + (b + 0.5) * F.cell / 5;
        if (!inside(x, z)) continue;
        const d = _wnavFarSolidDist(L0, k, x, z);
        if (d > bd + 0.05) { bd = d; bx = x; bz = z; }
      }
      anchorX[q] = bx; anchorZ[q] = bz;
    }
  }
  const sdG = {}, sdW = {}, wat = {};
  for (const g of grids) {
    const key = g === G.far ? 'f' : 'n';
    // far cells measure from their anchors (a legal point of a narrow path), near cells from their centres
    const ax = g === G.far ? anchorX : null, az = g === G.far ? anchorZ : null;
    sdG[key] = _wnavSolidDist(spec.solids.ground, g, ax, az);
    sdW[key] = spec.solids.wet === spec.solids.ground ? sdG[key] : _wnavSolidDist(spec.solids.wet, g, ax, az);
    // water depth-from-edge (wade = the shallow margin)
    const n = g.w * g.h, f = new Float64Array(n);
    for (let q = 0; q < n; q++) { const o = own[g.off + q]; f[q] = o >= 0 && spec.owners[o].kind === 'water' ? 1e20 : 0; }
    _wnavEDT(f, g.w, g.h);
    wat[key] = f;
  }
  const layers = {};
  for (const Ln of spec.layers) {
    const data = new Uint8Array(N), clear = new Float32Array(N), y = new Float64Array(N).fill(NaN);
    for (const g of grids) {
      const key = g === G.far ? 'f' : 'n', far = g === G.far, n = g.w * g.h, off = g.off, cell = g.cell;
      const sd = (Ln === 'swim' || Ln === 'wade') ? sdW[key] : sdG[key];
      const d = new Uint8Array(n);
      for (let q = 0; q < n; q++) {
        const o = own[off + q];
        if (o >= 0) {
          const s = spec.owners[o], kd = s.costs || _WNAV_KIND[s.kind];
          if (kd && kd[Ln]) d[q] = kd[Ln];
          if (Ln === 'wade' && s.kind === 'water') {
            const sh = spec.shallow(s);
            if (Math.sqrt(wat[key][q]) * cell - cell / 2 <= sh) d[q] = 10;
          }
          if (spec.levelY) { const yy = spec.levelY(s, Ln); if (yy != null) y[off + q] = yy; }
        }
        const xo = xown[off + q];
        if (xo >= 0) { const x = spec.extra[xo]; if (x.costs[Ln]) { d[q] = x.costs[Ln]; if (x.y != null) y[off + q] = x.y; } }
      }
      // edge distance: off-layer cells are seeds
      const f = new Float64Array(n);
      for (let q = 0; q < n; q++) f[q] = d[q] && sd[q] > 0 ? 1e20 : 0;
      _wnavEDT(f, g.w, g.h);
      const deadRow = far ? 1 : g.hLive;
      for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
        const q = j * g.w + i, k = off + q;
        const dead = far ? j < deadRow : j >= deadRow;
        if (dead || !d[q] || sd[q] <= 0) { data[k] = 0; clear[k] = 0; continue; }
        // the edge of the layer: near, a whole cell off the nearest off-layer centre (any point of the cell then keeps r minus a
        // few cm); far, from the anchor (cell centre semantics). A cell of a narrow path (stairs, a boardwalk) measures from the
        // path's own band, so a 1.2 m stair stays walkable at 0.5 m cells
        let edge = far ? Math.sqrt(f[q]) * cell - cell * 0.5 : Math.sqrt(f[q]) * cell - cell;
        if (!far && edge < 0.6) {
          const o = own[k], sh = o >= 0 ? spec.owners[o] : null;
          if (sh && sh.path && xown[k] < 0) {
            const nr = _wnavNearOnPath(sh.path, g.ox + (i + 0.5) * cell, g.oz + (j + 0.5) * cell);
            edge = Math.max(edge, Math.min((sh.width || 0) / 2 - nr[2], Math.sqrt(f[q]) * cell - cell * 0.5));
          }
        }
        const inner = far ? sd[q] : sd[q] - cell * 0.7072;
        const c = Math.max(0, Ln === 'wade' ? inner : Math.min(inner, edge));
        data[k] = d[q]; clear[k] = c;
      }
    }
    layers[Ln] = { data, clear, y, farSol: G.far ? _wnavFarSolids(G.far, (Ln === 'swim' || Ln === 'wade') ? spec.solids.wet : spec.solids.ground) : null };
  }
  return { own, xown, anchorX, anchorZ, layers };
}

/** Per far cell, the solid shapes within 1.5 m of it (CSR lists): far points are checked against them exactly. */
const _wnavFarSolMemo = new WeakMap();
function _wnavFarSolids(F, shapes) {
  if (!shapes || !shapes.length) return null;
  let byF = _wnavFarSolMemo.get(shapes);
  if (byF && byF.F === F) return byF.r;
  const n = F.w * F.h, lists = new Map(), R = 1.5;
  shapes.forEach((sh, si) => {
    const b = _wnavBBox(sh);
    const i0 = Math.max(0, Math.floor((b[0] - R - F.ox) / F.cell)), i1 = Math.min(F.w - 1, Math.floor((b[2] + R - F.ox) / F.cell));
    const j0 = Math.max(1, Math.floor((b[1] - R - F.oz) / F.cell)), j1 = Math.min(F.h - 1, Math.floor((b[3] + R - F.oz) / F.cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const q = j * F.w + i; if (!lists.has(q)) lists.set(q, []); lists.get(q).push(si); }
  });
  if (!lists.size) return null;
  const start = new Int32Array(n + 1), idx = [];
  for (let q = 0; q < n; q++) { start[q] = idx.length; const l = lists.get(q); if (l) for (const v of l) idx.push(v); }
  start[n] = idx.length;
  const r = { start, idx: Int32Array.from(idx), shapes, flat: shapes.map(sh => sh.poly ? Float64Array.from(sh.poly.flat()) : null) };
  _wnavFarSolMemo.set(shapes, { F, r });
  return r;
}
/**
 * A point in a far cell (2 m) is legal only where the surface really there (the topmost of the surfaces round its cell, later
 * ones winning as in the painting) is on the layer, at the point and a mover's radius round it (so a soft edge onto a verge
 * stays open and a hard one onto water does not), and clear of the solids near it: the coarse cells route, this point test
 * keeps a dog off the canal beside a towpath and a boat's half-beam off the far bank.
 */
function _wnavOnLayerAt(L, x, z, fam) {
  const k = _wnavIdx(L, x, z);
  if (k < 0) return false;
  if (k < L.N0) return L.data[k] > 0;
  const F = L.far, q = k - F.off, i = q % F.w, j = (q - i) / F.w;
  let top = -1;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const ii = i + di, jj = j + dj; if (ii < 0 || jj < 1 || ii >= F.w || jj >= F.h) continue;
    const kk = F.off + jj * F.w + ii, o = L.own[kk], xo = L.xown ? L.xown[kk] : -1;
    if (xo >= 0 && L.xshapes && L.xshapes[xo] && L.xshapes[xo].costs[fam] && _wnavContains(L.xshapes[xo].shape, x, z)) return true;
    if (o > top && _wnavContains(L.shapes[o], x, z)) top = o;
  }
  if (top < 0) return false;
  const S = L.shapes[top], kd = S.costs || _WNAV_KIND[S.kind];
  return !!(kd && kd[fam]);
}
function _wnavFarPointOk(L, k, x, z, r) {
  if (_wnavFarSolidDist(L, k, x, z) < r) return false;
  const fam = L.layer.split('@')[0];
  if (!L.shapes || fam === 'wade') return true;
  if (!_wnavOnLayerAt(L, x, z, fam)) return false;
  const rr = Math.min(r, 0.9);
  return _wnavOnLayerAt(L, x + rr, z, fam) && _wnavOnLayerAt(L, x - rr, z, fam) && _wnavOnLayerAt(L, x, z + rr, fam) && _wnavOnLayerAt(L, x, z - rr, fam);
}
/** Exact solid clearance of a point in a far cell (Infinity when no solid is near). */
function _wnavFarSolidDist(L, k, x, z) {
  const S = L.farSol; if (!S || k < L.N0) return Infinity;
  const q = k - L.far.off, a = S.start[q], b = S.start[q + 1];
  let d = Infinity;
  for (let i = a; i < b; i++) { const si = S.idx[i], sh = S.shapes[si], dd = S.flat[si] ? _wnavPolyDistF(S.flat[si], x, z) : _wnavShapeDist(sh, x, z); if (dd < d) d = dd; }
  return d;
}
/** A layer record over grids G. */
function _wnavLayerRec(name, G, data, clear, y, cam, extra) {
  const n = G.near, F = G.far, fam = name.split('@')[0];
  // the near band: where the tallest user would fill 45 % of the frame, and never so near that its feet (its waterline) are
  // below the frame's bottom edge (a half mover at the lens)
  const yb = fam === 'swim' || fam === 'wade' ? (extra && Number.isFinite(extra.baseY) ? extra.baseY : 0) : 0;
  const nearZ = Math.max(cam.f * (WORLD_NAV_HEIGHT[fam] || 1.9) / 405, cam.f * (cam.eye - yb) / Math.max(1, cam.H - cam.horizon) + 0.3);
  const L = Object.assign({ layer: name, cell: n ? n.cell : WORLD_NAV_GRID.far, w: n ? n.w : 0, h: n ? n.h : 0, ox: n ? n.ox : 0, oz: n ? n.oz : 0,
    hLive: n ? n.hLive : 0, far: F ? Object.assign({}, F) : null, N0: G.N0, N: G.N, seam: G.seam, data, clear, y,
    nearZ, tanL: cam.tanL, tanR: cam.tanR, okc: new Map() }, extra || {});
  return L;
}

/** Build the navigation map of a World (section 3.1). o: { single: true } = one 0.5 m grid (tests of small worlds only). */
function worldNavBuild(world, o) {
  o = o || {};
  const cam = _wnavCam(world);
  const surfaces = (world.surfaces || []).filter(s => s && ((Array.isArray(s.poly) && s.poly.length >= 3) || (Array.isArray(s.path) && s.path.length >= 2)));
  const ents = (world.entities || []).filter(e => e && Number.isFinite(e.x) && Number.isFinite(e.z));
  const step = WORLD_NAV_GRID.step;
  const waterLevel = (s) => (s && Number.isFinite(s.level) ? s.level : (Number.isFinite(cam.raw.water) ? cam.raw.water : (Number.isFinite(world.waterY) ? world.waterY : 0)));

  // ---- classify: ground owners, low extras (walk added without changing the owner), raised levels, portals ----
  const owners = [], extra = [], levels = [], portalSurfs = [];
  for (const s of surfaces) {
    if (s.kind === 'stairs' || s.kind === 'ramp') { portalSurfs.push(s); continue; }
    if (s.kind === 'hedge' || s.kind === 'gate' || s.kind === 'weir') continue;                // solids (below), not ground
    const c = _wnavCentroid(s), g0 = _wnavGroundY(cam, c[0], c[1]);
    const hasY = Number.isFinite(s.y);
    if (s.kind === 'bridge-deck' || (hasY && _WNAV_WALKKINDS[s.kind])) {
      const dy = hasY ? s.y - g0 : 0;
      if (hasY && dy > step) { levels.push({ id: s.id, kind: 'surface', shapes: [s], y: s.y, dy, src: s }); continue; }
      if (s.kind === 'bridge-deck') { extra.push({ shape: s, costs: { walk: 10 }, y: hasY ? s.y : null, id: s.id }); continue; }   // overhead: never an owner
    }
    owners.push(s);
  }
  // entity decks: low -> merged into the ground walk layer (the host's solid gives way); over an authored walk surface ->
  // the same structure (merged); raised -> its own level (its host is solid on the ground)
  const lowHosts = new Set(), raisedHosts = new Map();
  for (const e of ents) {
    if (!e.deck || !Array.isArray(e.deck.poly) || e.deck.poly.length < 3) continue;
    const g0 = _wnavGroundY(cam, e.x, e.z), dy = (Number.isFinite(e.deck.y) ? e.deck.y : g0) - g0;
    const shape = { poly: e.deck.poly };
    // share of the deck over authored walk surfaces (paths, boardwalks, decks): it IS that surface
    let over = 0, tot = 0; const b = _wnavBBox(shape);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const x = b[0] + (b[2] - b[0]) * (i + 0.5) / 5, z = b[1] + (b[3] - b[1]) * (j + 0.5) / 5;
      if (!_wnavInPoly(e.deck.poly, x, z)) continue;
      tot++; if (owners.some(s => _WNAV_WALKKINDS[s.kind] && _wnavContains(s, x, z))) over++;
    }
    if (dy <= step || (tot && over / tot >= 0.5)) { lowHosts.add(e); extra.push({ shape, costs: { walk: 10 }, y: Number.isFinite(e.deck.y) ? e.deck.y : null, id: 'deck:' + (e.id || e.obj), host: e.id || null }); }
    else { const lv = { id: e.id || e.obj, kind: 'deck', shapes: [shape], y: e.deck.y, dy, host: e }; levels.push(lv); raisedHosts.set(e, lv); }
  }
  // solids
  const ground = [], wet = [], onLevel = new Map();
  for (const e of ents) {
    if (!_wnavIsSolid(e)) continue;
    const ak = _wnavAttachKind(e);
    if (ak === 'air' || ak === 'wall') continue;                                           // up on a wall or in the air: blocks nothing below
    if (ak === 'deck') {
      const ref = _wnavAttachRef(e), lv = levels.find(l => l.host && (l.host.id === ref));
      if (lv) { if (!onLevel.has(lv)) onLevel.set(lv, []); onLevel.get(lv).push({ poly: _wnavFoot(e), ent: e }); continue; }
    }
    const sh = { poly: _wnavFoot(e), ent: e };
    wet.push(sh);
    if (!lowHosts.has(e)) ground.push(sh);                                                 // a low deck replaces its host's solid for walkers
  }
  // extruded buildings are solid to everything that walks, swims or drives: their footprints cut the ground like any solid (a house standing proud
  // of a lane's edge by 30 cm, a terrace beside a pavement): people never walk through a wall the extruder drew (SCENE_LESSONS K)
  for (const b of world.buildings || []) if (b && Array.isArray(b.foot) && b.foot.length >= 3) { const sh = { poly: b.foot }; wet.push(sh); ground.push(sh); }
  for (const s of surfaces) {
    if (s.kind === 'hedge' && s.open !== true) ground.push({ poly: s.poly, path: s.path, width: s.width });
    if (s.kind === 'gate' && s.open !== true) ground.push({ poly: s.poly, path: s.path, width: s.width });
    if (s.kind === 'weir') wet.push({ poly: s.poly, path: s.path, width: s.width });
  }

  // ---- ground grids ----
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const s of owners.concat(extra.map(x => x.shape))) { const b = _wnavBBox(s); x0 = Math.min(x0, b[0]); z0 = Math.min(z0, b[1]); x1 = Math.max(x1, b[2]); z1 = Math.max(z1, b[3]); }
  if (!isFinite(x0)) { x0 = -1; x1 = 1; z0 = 0; z1 = 1; }
  const G = _wnavMakeGrids([x0, z0, x1, Math.max(z1, z0 + 1)], cam, o);
  const fam = _wnavFamily(G, {
    layers: ['walk', 'graze', 'swim', 'wade', 'drive'], owners, extra,
    solids: { ground, wet: wet.length === ground.length && wet.every((w, i) => w === ground[i]) ? ground : wet },
    shallow: s => (s.shallow == null ? 0.5 : s.shallow),
    levelY: (s, Ln) => (Ln === 'swim' || Ln === 'wade') ? (s.kind === 'water' ? waterLevel(s) : null) : (Ln === 'walk' && Number.isFinite(s.y) ? s.y : null),
  }, cam);
  const layers = {};
  for (const Ln of ['walk', 'graze', 'swim', 'wade', 'drive']) {
    const r = fam.layers[Ln];
    layers[Ln] = _wnavLayerRec(Ln, G, r.data, r.clear, r.y, cam, { own: fam.own, xown: fam.xown, anchorX: fam.anchorX, anchorZ: fam.anchorZ, level: 0, levelY: null, farSol: r.farSol, baseY: waterLevel(null), shapes: owners, xshapes: extra });
  }
  // wade y and swim y where there is no owner level: the base water level
  for (const Ln of ['swim', 'wade']) { const L = layers[Ln], b = waterLevel(null); for (let k = 0; k < L.N; k++) if (L.data[k] && !(L.y[k] === L.y[k])) L.y[k] = b; }

  // ---- raised levels ----
  const levelRecs = [{ layer: 'walk', y: null, id: 'ground' }];
  levels.forEach((lv, li) => {
    const name = 'walk@' + (li + 1);
    const shapes = lv.shapes.slice();
    const stairs = portalSurfs.filter(s => _wnavStairJoins(s, lv, levels));
    let lx0 = Infinity, lx1 = -Infinity, lz0 = Infinity, lz1 = -Infinity;
    for (const s of shapes.concat(stairs)) { const b = _wnavBBox(s); lx0 = Math.min(lx0, b[0]); lz0 = Math.min(lz0, b[1]); lx1 = Math.max(lx1, b[2]); lz1 = Math.max(lz1, b[3]); }
    const LG = _wnavMakeGrids([lx0 - 1, lz0 - 1, lx1 + 1, lz1 + 1], cam, o);
    const lvOwners = shapes.map(s => ({ poly: s.poly, path: s.path, width: s.width, costs: { walk: 10 }, y: lv.y, kind: 'deck' }))
      .concat(stairs.map(s => ({ poly: s.poly, path: s.path, width: s.width, costs: { walk: 11 }, kind: 'stairs', stair: s })));
    const lf = _wnavFamily(LG, {
      layers: ['walk'], owners: lvOwners,
      extra: [], solids: { ground: onLevel.get(lv) || [], wet: onLevel.get(lv) || [] }, shallow: () => 0,
      levelY: (s) => (s.kind === 'deck' ? lv.y : null),
    }, cam);
    const L = _wnavLayerRec(name, LG, lf.layers.walk.data, lf.layers.walk.clear, lf.layers.walk.y, cam,
      { own: lf.own, xown: lf.xown, anchorX: lf.anchorX, anchorZ: lf.anchorZ, level: li + 1, levelY: lv.y, levelId: lv.id, host: lv.host ? lv.host.id || null : null, owners: shapes.map(() => lv.id), farSol: lf.layers.walk.farSol, shapes: lvOwners, xshapes: [] });
    layers[name] = L;
    lv.layer = name;
    levelRecs.push({ layer: name, y: lv.y, id: lv.id, host: L.host });
  });
  // stairs and ramps on the ground layer: painted into the ground walk layer too when one end is the ground
  const portals = [];
  for (const s of portalSurfs) {
    const ends = _wnavStairEnds(s, levels, cam);
    for (const e of ends) if (!e.level) _wnavPaint(layers.walk, s, 11);
    if (ends.length === 2) portals.push({ kind: s.kind, id: s.id, a: ends[0].level ? ends[0].level.layer : 'walk', b: ends[1].level ? ends[1].level.layer : 'walk', surface: s, ends });
  }
  // stair heights (both layers): interpolated from the lower to the upper end along the stair
  for (const p of portals) for (const Ln of [p.a, p.b]) {
    const L = layers[Ln]; if (!L) continue;
    _wnavCells(L, p.surface, k => { L.y[k] = _wnavStairY(p, _wnavCX(L, k), _wnavCZ(L, k), cam); });
  }
  // landings: a deck within a landing height of the ground beside it (a step aboard)
  for (const lv of levels) {
    if (!lv.layer || !(lv.dy <= WORLD_NAV_GRID.landing)) continue;
    const L = layers[lv.layer], pairs = [];
    for (let k = 0; k < L.N; k++) {
      if (!L.data[k] || L.clear[k] < 0.2) continue;
      const x = _wnavCX(L, k), z = _wnavCZ(L, k);
      let best = null, bd = 2.3;
      for (let a = 0; a < 8; a++) {
        const ang = a * Math.PI / 4;
        for (const rr of [0.6, 1.0, 1.4, 1.8, 2.2]) {
          const gx = x + Math.cos(ang) * rr, gz = z + Math.sin(ang) * rr;
          if (worldNavOk({ layers }, 'walk', gx, gz, 0.25)) { if (rr < bd) { bd = rr; best = [gx, gz]; } break; }
        }
      }
      if (best && !pairs.some(p => Math.hypot(p[2] - x, p[3] - z) < 1.0)) pairs.push([best[0], best[1], x, z]);
    }
    if (pairs.length) portals.push({ kind: 'landing', id: lv.id, a: 'walk', b: lv.layer, pairs });
  }
  for (const p of portals) if (!p.pairs) {
    // shared stair cells: the pairs are the cells themselves (both layers legal there)
    const L = layers[p.b] || layers[p.a], pairs = [];
    _wnavCells(L, p.surface, k => { const x = _wnavCX(L, k), z = _wnavCZ(L, k); if (worldNavOk({ layers }, p.a, x, z) && worldNavOk({ layers }, p.b, x, z)) pairs.push([x, z, x, z]); });
    p.pairs = pairs;
  }
  layers.rail = { layer: 'rail', lines: surfaces.filter(s => (s.kind === 'rail' || s.kind === 'tram') && s.path).map(s => ({ id: s.id, kind: s.kind, path: s.path, width: s.width || 0 })) };
  return { layers, cam, world, flows: new Map(), solids: ground, wetSolids: wet, ents, surfaces, owners, extra, levels: levelRecs, portals, waterLevel };
}
function _wnavPaint(L, s, cost) {
  _wnavCells(L, s, k => { if (!L.data[k]) { L.data[k] = cost; L.clear[k] = Math.max(L.clear[k], 0.3); } });
}
/** Call fn(k) for every cell of a layer whose anchor / centre lies in the shape. */
function _wnavCells(L, s, fn) {
  const grids = [];
  if (L.N0) grids.push({ ox: L.ox, oz: L.oz, w: L.w, h: L.hLive, cell: L.cell, off: 0 });
  if (L.far) grids.push(L.far);
  for (const g of grids) _wnavFill(s, g, q => fn(g.off + q));
}
/** Does a stair / ramp surface join this level? (its from / to name the level, or an end of it touches the level's shapes). */
function _wnavStairJoins(s, lv) {
  const ids = [s.from, s.to].filter(v => v != null).map(String);
  if (ids.length && ids.some(id => id === lv.id || (lv.host && (lv.host.id === id)) || (lv.src && lv.src.id === id))) return true;
  if (ids.length >= 2) return false;
  const pts = s.path ? [s.path[0], s.path[s.path.length - 1]] : s.poly;
  return pts.some(p => lv.shapes.some(sh => _wnavShapeDist(sh, p[0], p[1]) < 1.2));
}
/** The two ends of a stair: [{ level | null (ground), x, z, y }], lower first. */
function _wnavStairEnds(s, levels, cam) {
  const pts = s.path ? [s.path[0], s.path[s.path.length - 1]] : (() => { const b = _wnavBBox(s); return (b[2] - b[0]) > (b[3] - b[1]) ? [[b[0], (b[1] + b[3]) / 2], [b[2], (b[1] + b[3]) / 2]] : [[(b[0] + b[2]) / 2, b[1]], [(b[0] + b[2]) / 2, b[3]]]; })();
  const byId = (id) => levels.find(l => l.id === String(id) || (l.host && l.host.id === String(id)) || (l.src && l.src.id === String(id))) || null;
  const named = [s.from, s.to].map(v => (v == null || v === 'ground' ? null : byId(v)));
  const ends = pts.map((p, i) => {
    let level = (s.from != null || s.to != null) ? named[i] : null;
    if (s.from == null && s.to == null) level = levels.find(l => l.shapes.some(sh => _wnavShapeDist(sh, p[0], p[1]) < 1.2)) || null;
    const y = level ? level.y : _wnavGroundY(cam, p[0], p[1]);
    return { level, x: p[0], z: p[1], y };
  });
  return ends.sort((a, b) => a.y - b.y);
}
function _wnavStairY(p, x, z) {
  const a = p.ends[0], b = p.ends[1];
  if (p.surface.path) {
    const nr = _wnavNearOnPath(p.surface.path, x, z); let L = 0;
    for (let i = 1; i < p.surface.path.length; i++) L += Math.hypot(p.surface.path[i][0] - p.surface.path[i - 1][0], p.surface.path[i][1] - p.surface.path[i - 1][1]);
    let t = L > 0 ? nr[3] / L : 0;
    const first = p.surface.path[0];
    if (Math.hypot(first[0] - a.x, first[1] - a.z) > Math.hypot(first[0] - b.x, first[1] - b.z)) t = 1 - t;
    return a.y + (b.y - a.y) * t;
  }
  const da = Math.hypot(x - a.x, z - a.z), db = Math.hypot(x - b.x, z - b.z);
  return a.y + (b.y - a.y) * (da / Math.max(1e-6, da + db));
}

function worldNavLayer(nav, layer) { return nav && nav.layers[layer] || null; }
function worldNavLevels(nav) { return nav && nav.levels ? nav.levels.slice() : []; }
function worldNavPortals(nav) { return nav && nav.portals ? nav.portals : []; }

/* ---------- cells: one index space over the two grids ---------- */
function _wnavR(layer, r) { return r == null ? (WORLD_NAV_RADIUS[String(layer).split('@')[0]] || 0.25) : r; }
function _wnavIdx(L, x, z) {
  const F = L.far;
  if (F && z >= L.seam) {
    const i = Math.floor((x - F.ox) / F.cell), j = Math.floor((z - F.oz) / F.cell);
    return i < 0 || j < 1 || i >= F.w || j >= F.h ? -1 : F.off + j * F.w + i;
  }
  if (!L.N0) return -1;
  const i = Math.floor((x - L.ox) / L.cell), j = Math.floor((z - L.oz) / L.cell);
  return i < 0 || j < 0 || i >= L.w || j >= L.hLive ? -1 : j * L.w + i;
}
/** The anchor of a cell (near: the centre; far: a legal point inside it). */
function _wnavCX(L, k) {
  if (k >= L.N0) { const F = L.far, q = k - F.off; return L.anchorX ? L.anchorX[q] : F.ox + (q % F.w + 0.5) * F.cell; }
  return L.ox + (k % L.w + 0.5) * L.cell;
}
function _wnavCZ(L, k) {
  if (k >= L.N0) { const F = L.far, q = k - F.off; return L.anchorZ ? L.anchorZ[q] : F.oz + (Math.floor(q / F.w) + 0.5) * F.cell; }
  return L.oz + (Math.floor(k / L.w) + 0.5) * L.cell;
}
/** The geometric centre z of a cell (the near band test). */
function _wnavGZ(L, k) {
  if (k >= L.N0) { const F = L.far, q = k - F.off; return F.oz + (Math.floor(q / F.w) + 0.5) * F.cell; }
  return L.oz + (Math.floor(k / L.w) + 0.5) * L.cell;
}
function _wnavCellOk(L, k, r, framed) {
  if (!L.data[k] || L.clear[k] < r) return false;
  if (!framed && k < L.N0 && _wnavGZ(L, k) - L.cell / 2 < L.nearZ) return false;   // the whole cell lies beyond the near band
  return true;
}
/** The ok mask of a layer for a radius (cached). */
function _wnavOkMask(L, r, framed) {
  const key = Math.round(r * 100) + (framed ? 'f' : '');
  let m = L.okc.get(key);
  if (m) return m;
  m = new Uint8Array(L.N);
  for (let k = 0; k < L.N; k++) m[k] = _wnavCellOk(L, k, r, framed) ? 1 : 0;
  L.okc.set(key, m);
  return m;
}
function worldNavCell(nav, layer, x, z) { const L = nav && nav.layers[layer]; return L && L.data ? _wnavIdx(L, x, z) : -1; }
function worldNavCellXZ(nav, layer, k) { const L = nav && nav.layers[layer]; return L && L.data && k >= 0 && k < L.N ? [_wnavCX(L, k), _wnavCZ(L, k)] : null; }

function _wnavRailNear(lines, x, z) {
  let best = null;
  for (const l of lines) for (let i = 1; i < l.path.length; i++) {
    const a = l.path[i - 1], b = l.path[i], dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1;
    const t = _wnavClamp(((x - a[0]) * dx + (z - a[1]) * dz) / L, 0, 1), px = a[0] + t * dx, pz = a[1] + t * dz, d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) best = { d, x: px, z: pz, line: l };
  }
  return best;
}

/** Is a point legal for a mover of radius r on this layer? (The single legality rule.) */
function worldNavOk(nav, layer, x, z, r, framed) {
  const L = nav && nav.layers[layer]; if (!L) return false;
  if (layer === 'rail') { const n = _wnavRailNear(L.lines, x, z); return !!n && n.d <= Math.max(1e-6, (n.line.width || 0) / 2 + 1e-6); }
  const k = _wnavIdx(L, x, z);
  r = _wnavR(layer, r);
  return k >= 0 && _wnavCellOk(L, k, r, framed) && (k < L.N0 || _wnavFarPointOk(L, k, x, z, r));
}
/** Walking height at a point of a layer: water level (swim, wade), a level or stair height, a low deck, else the ground. */
function worldNavY(nav, layer, x, z) {
  const L = nav && nav.layers[layer];
  if (L && L.data) {
    const k = _wnavIdx(L, x, z);
    // a deck merged into the ground: its height exactly inside its outline (not by cell), the ground beside it
    if (k >= 0 && !L.level && nav.extra && nav.extra.length && layer === 'walk') {
      for (const kk of [k, k - 1, k + 1, k - L.w, k + L.w]) {
        const xo = kk >= 0 && kk < L.N ? L.xown[kk] : -1;
        if (xo < 0) continue;
        const X = nav.extra[xo];
        if (X && X.y != null && X.shape.poly && _wnavInPoly(X.shape.poly, x, z)) return X.y;
      }
      if (L.xown[k] >= 0) { const o = L.own[k], s = o >= 0 ? nav.owners[o] : null; return s && Number.isFinite(s.y) ? s.y : _wnavGroundY(nav.cam, x, z); }
    }
    if (k >= 0) { const y = L.y[k]; if (y === y) return y; }
    if (L.levelY != null) return L.levelY;
  }
  if (layer === 'swim' || layer === 'wade') return nav && nav.waterLevel ? nav.waterLevel(null) : 0;
  return _wnavGroundY(nav ? nav.cam : null, x, z);
}
/** The surface (or deck) under a point of a layer, from the nav's owner map (O(1)). */
function worldNavSurfaceId(nav, layer, x, z) {
  const L = nav && nav.layers[layer]; if (!L || !L.data) return null;
  const k = _wnavIdx(L, x, z); if (k < 0) return null;
  if (L.level) return L.levelId;
  const xo = L.xown[k]; if (xo >= 0 && nav.extra[xo] && nav.extra[xo].costs[layer]) return nav.extra[xo].id || null;
  const o = L.own[k]; return o >= 0 && nav.owners[o] ? nav.owners[o].id || null : null;
}

/* ---------- graph: neighbours across the two grids ---------- */
const _WNAV_NK = new Int32Array(32), _WNAV_NW = new Int32Array(32);
/** Neighbours of cell k on mask ok: fills NK / NW (integer costs: (c0 + c1) x metres x 2), returns the count. No corner cutting. */
function _wnavNb(L, k, ok, NK, NW) {
  let n = 0; const d = L.data, c0 = d[k];
  if (k < L.N0) {
    const w = L.w, i = k % w, j = (k - i) / w, hL = L.hLive;
    const oL = i > 0 && ok[k - 1], oR = i < w - 1 && ok[k + 1], oD = j > 0 && ok[k - w], oU = j < hL - 1 && ok[k + w];
    let kk;
    if (oL) { kk = k - 1; NK[n] = kk; NW[n++] = c0 + d[kk]; }
    if (oR) { kk = k + 1; NK[n] = kk; NW[n++] = c0 + d[kk]; }
    if (oD) { kk = k - w; NK[n] = kk; NW[n++] = c0 + d[kk]; }
    if (oU) { kk = k + w; NK[n] = kk; NW[n++] = c0 + d[kk]; }
    if (oL && oD) { kk = k - w - 1; if (ok[kk]) { NK[n] = kk; NW[n++] = ((c0 + d[kk]) * 1.41421 + 0.5) | 0; } }
    if (oR && oD) { kk = k - w + 1; if (ok[kk]) { NK[n] = kk; NW[n++] = ((c0 + d[kk]) * 1.41421 + 0.5) | 0; } }
    if (oL && oU) { kk = k + w - 1; if (ok[kk]) { NK[n] = kk; NW[n++] = ((c0 + d[kk]) * 1.41421 + 0.5) | 0; } }
    if (oR && oU) { kk = k + w + 1; if (ok[kk]) { NK[n] = kk; NW[n++] = ((c0 + d[kk]) * 1.41421 + 0.5) | 0; } }
    if (j === hL - 1 && L.far) {                                            // the seam: up into the far grid (the cell above and its sides)
      const F = L.far, x = L.ox + (i + 0.5) * L.cell, z = L.oz + (j + 0.5) * L.cell, I = Math.floor((x - F.ox) / F.cell), fz = F.oz + 1.5 * F.cell;
      for (let I2 = I - 1; I2 <= I + 1; I2++) {
        if (I2 < 0 || I2 >= F.w) continue;
        kk = F.off + F.w + I2; if (!ok[kk]) continue;
        NK[n] = kk; NW[n++] = ((c0 + d[kk]) * Math.hypot(F.ox + (I2 + 0.5) * F.cell - x, fz - z) + 0.5) | 0;
      }
    }
    return n;
  }
  const F = L.far, w = F.w, q = k - F.off, i = q % w, j = (q - i) / w;
  const oL = i > 0 && ok[k - 1], oR = i < w - 1 && ok[k + 1], oD = j > 1 && ok[k - w], oU = j < F.h - 1 && ok[k + w];
  let kk;
  if (oL) { kk = k - 1; NK[n] = kk; NW[n++] = (c0 + d[kk]) * 4; }
  if (oR) { kk = k + 1; NK[n] = kk; NW[n++] = (c0 + d[kk]) * 4; }
  if (oD) { kk = k - w; NK[n] = kk; NW[n++] = (c0 + d[kk]) * 4; }
  if (oU) { kk = k + w; NK[n] = kk; NW[n++] = (c0 + d[kk]) * 4; }
  if (oL && oD) { kk = k - w - 1; if (ok[kk]) { NK[n] = kk; NW[n++] = ((c0 + d[kk]) * 5.65685 + 0.5) | 0; } }
  if (oR && oD) { kk = k - w + 1; if (ok[kk]) { NK[n] = kk; NW[n++] = ((c0 + d[kk]) * 5.65685 + 0.5) | 0; } }
  if (oL && oU) { kk = k + w - 1; if (ok[kk]) { NK[n] = kk; NW[n++] = ((c0 + d[kk]) * 5.65685 + 0.5) | 0; } }
  if (oR && oU) { kk = k + w + 1; if (ok[kk]) { NK[n] = kk; NW[n++] = ((c0 + d[kk]) * 5.65685 + 0.5) | 0; } }
  if (j === 1 && L.N0) {                                                    // the seam: down into the near grid's top live row (under it and its sides)
    const jn = L.hLive - 1, fx = F.ox + (i + 0.5) * F.cell, fz = F.oz + 1.5 * F.cell, zn = L.oz + (jn + 0.5) * L.cell;
    const per = Math.round(F.cell / L.cell), i0 = Math.round((F.ox + (i - 1) * F.cell - L.ox) / L.cell);
    for (let s = 0; s < per * 3; s++) {
      const ii = i0 + s;
      if (ii < 0 || ii >= L.w) continue;
      kk = jn * L.w + ii; if (!ok[kk]) continue;
      NK[n] = kk; NW[n++] = ((c0 + d[kk]) * Math.hypot(L.ox + (ii + 0.5) * L.cell - fx, zn - fz) + 0.5) | 0;
    }
  }
  return n;
}

/* ---------- flow fields (Dial's bucket queue over integer costs) ---------- */
const _WNAV_BUCKETS = [];
for (let b = 0; b < 256; b++) _WNAV_BUCKETS.push([]);
function _wnavEdgeOf(goal) { const g = _WNAV_EDGE_ALIAS[goal] || goal; return g; }
/** Goal -> list of seed cell indices. */
function _wnavGoalCells(nav, L, layer, goal, r, framed, ok) {
  if (goal && goal.cells) return goal.cells.filter(k => k >= 0 && k < L.N && ok[k]);
  if (goal && goal.surface != null) {
    const out = [];
    for (let k = 0; k < L.N; k++) if (ok[k] && _wnavOwnerId(nav, L, k) === goal.surface) out.push(k);
    return out;
  }
  if (typeof goal === 'string') {
    const e = _wnavEdgeOf(goal);
    return worldSpawnCells(nav, layer, r).filter(c => e === 'any' || c.edge === e).map(c => c.i).filter(k => ok[k]);
  }
  const x = Array.isArray(goal) ? goal[0] : goal.x, z = Array.isArray(goal) ? goal[1] : goal.z;
  const k = _wnavIdx(L, x, z);
  if (k >= 0 && ok[k]) return [k];
  return _wnavNearestOk(L, ok, x, z, 3);
}
function _wnavOwnerId(nav, L, k) {
  if (L.level) return L.levelId;
  const xo = L.xown[k]; if (xo >= 0 && nav.extra[xo] && nav.extra[xo].costs[L.layer]) return nav.extra[xo].id;
  const o = L.own[k]; return o >= 0 && nav.owners[o] ? nav.owners[o].id : null;
}
/** The nearest legal cell to (x, z) within R metres: [k] or []. */
function _wnavNearestOk(L, ok, x, z, R) {
  let best = -1, bd = Infinity;
  const scan = (g) => {
    if (!g || !g.w) return;
    const hh = g.off ? g.h : L.hLive, n = Math.ceil(R / g.cell), ci = Math.floor((x - g.ox) / g.cell), cj = Math.floor((z - g.oz) / g.cell);
    for (let j = Math.max(g.off ? 1 : 0, cj - n); j <= Math.min(hh - 1, cj + n); j++) for (let i = Math.max(0, ci - n); i <= Math.min(g.w - 1, ci + n); i++) {
      const k = g.off + j * g.w + i; if (!ok[k]) continue;
      const d = (_wnavCX(L, k) - x) ** 2 + (_wnavCZ(L, k) - z) ** 2; if (d < bd && d <= R * R) { bd = d; best = k; }
    }
  };
  if (L.N0) scan({ ox: L.ox, oz: L.oz, w: L.w, h: L.hLive, cell: L.cell, off: 0 });
  scan(L.far);
  return best >= 0 ? [best] : [];
}
/** A cached flow field (Dijkstra from the goal over the layer, 8-neighbour, no corner cutting, across the seam). */
function worldFlowField(nav, layer, goal, r, framed) {
  const L = nav && nav.layers[layer]; if (!L || !L.data) return null;
  r = _wnavR(layer, r);
  const gk = goal && goal.key != null ? 'k:' + goal.key : JSON.stringify(goal);
  const key = layer + '|' + Math.round(r * 100) + '|' + (framed ? 1 : 0) + '|' + gk;
  const hit = nav.flows.get(key);
  if (hit) { nav.flows.delete(key); nav.flows.set(key, hit); return hit; }
  const ok = _wnavOkMask(L, r, framed), N = L.N, INF = 0x3fffffff;
  const dist = new Int32Array(N).fill(INF);
  const seeds = _wnavGoalCells(nav, L, layer, goal, r, framed, ok);
  const B = _WNAV_BUCKETS, NK = _WNAV_NK, NW = _WNAV_NW;
  for (const b of B) b.length = 0;
  let cnt = 0;
  for (const k of seeds) { if (dist[k] !== 0) { dist[k] = 0; B[0].push(k); cnt++; } }
  let cur = 0, empty = 0;
  while (cnt > 0) {
    const bk = B[cur & 255];
    if (!bk.length) { cur++; if (++empty > 512) break; continue; }
    empty = 0;
    const k = bk.pop(); cnt--;
    if (dist[k] !== cur) continue;
    const n = _wnavNb(L, k, ok, NK, NW);
    for (let q = 0; q < n; q++) {
      const kk = NK[q], nd = cur + NW[q];
      if (nd < dist[kk]) { dist[kk] = nd; B[nd & 255].push(kk); cnt++; }
    }
  }
  const field = { layer, r, framed: !!framed, goal, L, grid: L, dist, ok, seeds, la: null, key };
  nav.flows.set(key, field);
  if (nav.flows.size > WORLD_NAV_FLOWCAP) nav.flows.delete(nav.flows.keys().next().value);
  return field;
}

/** Next cell index downhill from k in a field, or -1. */
function _wnavDown(f, k) {
  const L = f.L, n = _wnavNb(L, k, f.ok, _WNAV_NK, _WNAV_NW);
  let best = -1, bd = f.dist[k];
  for (let q = 0; q < n; q++) { const kk = _WNAV_NK[q]; if (f.dist[kk] < bd) { bd = f.dist[kk]; best = kk; } }
  return best;
}
/** The look-ahead cell of k: the furthest cell down the field (<= 10 steps, 6 m) still in a straight legal line (memoised). */
function _wnavLook(f, k) {
  if (!f.la) { f.la = new Int32Array(f.L.N).fill(-2); }
  const m = f.la[k];
  if (m !== -2) return m;
  const L = f.L, ax = _wnavCX(L, k), az = _wnavCZ(L, k);
  let c = k, best = -1;
  for (let s = 0; s < 10; s++) {
    const nx = _wnavDown(f, c); if (nx < 0) break;
    const bx = _wnavCX(L, nx), bz = _wnavCZ(L, nx);
    if (Math.hypot(bx - ax, bz - az) > 6) break;
    if (best >= 0 && !_wnavLineOk(L, f.ok, ax, az, bx, bz)) break;
    best = nx; c = nx;
    if (f.dist[nx] === 0) break;
  }
  f.la[k] = best;
  return best;
}
/** Unit direction to follow the field from (x, z); null at the goal or where the goal is unreachable. */
function worldFlowDir(field, x, z) {
  const t = worldFlowTarget(field, x, z);
  if (!t) return null;
  const dx = t[0] - x, dz = t[1] - z, D = Math.hypot(dx, dz) || 1;
  return [dx / D, dz / D];
}
/**
 * The point to steer at from (x, z) down the field: [tx, tz, k] (k = the cell it was planned from), or null at the goal or
 * where the goal is unreachable. A caller may keep steering at the same point while it stays in cell k (the life sim does:
 * the line checks then run once per cell, not once per tick; worldStep keeps every step legal regardless).
 */
function worldFlowTarget(field, x, z) {
  const L = field.L || field.grid, k = _wnavIdx(L, x, z);
  if (k < 0 || field.dist[k] >= 0x3fffffff || field.dist[k] === 0) return null;
  // the look-ahead is planned from the cell's anchor: from where the mover really is, it must be in a clear line too, else
  // the next cell down, else back to this cell's anchor first
  L._lineR = field.r;
  let n = _wnavLook(field, k);
  if (n >= 0 && !_wnavLineOk(L, field.ok, x, z, _wnavCX(L, n), _wnavCZ(L, n))) n = -1;
  if (n < 0) {
    n = _wnavDown(field, k);
    if (n < 0) return null;
    if (!_wnavLineOk(L, field.ok, x, z, _wnavCX(L, n), _wnavCZ(L, n))) {
      // another downhill neighbour in a clear line (a 2 m cell whose steepest neighbour lies behind a bench), else back to
      // this cell's anchor first
      const m = _wnavNb(L, k, field.ok, _WNAV_NK, _WNAV_NW), down = [];
      for (let q = 0; q < m; q++) { const kk = _WNAV_NK[q]; if (kk !== n && field.dist[kk] < field.dist[k]) down.push(kk); }
      down.sort((p, q) => field.dist[p] - field.dist[q]);
      let alt = -1;
      for (const kk of down) if (_wnavLineOk(L, field.ok, x, z, _wnavCX(L, kk), _wnavCZ(L, kk))) { alt = kk; break; }
      if (alt >= 0) n = alt;
      else {
        const ax = _wnavCX(L, k), az = _wnavCZ(L, k), d0 = Math.hypot(ax - x, az - z);
        if (d0 > 0.05) return [ax, az, k];
      }
    }
  }
  let tx = _wnavCX(L, n), tz = _wnavCZ(L, n);
  if (Math.hypot(tx - x, tz - z) < 0.05) { const n2 = _wnavDown(field, n); if (n2 < 0) return null; tx = _wnavCX(L, n2); tz = _wnavCZ(L, n2); }
  return [tx, tz, k];
}
/** The field's cost at a point (0 on the goal; Infinity where the goal cannot be reached from there). */
function worldFlowDist(field, x, z) {
  const L = field.L || field.grid, k = _wnavIdx(L, x, z);
  if (k < 0) return Infinity;
  const d = field.dist[k];
  return d >= 0x3fffffff ? Infinity : d;
}

/* ---------- straight lines and A* ---------- */
/** Is the straight segment legal on mask ok? Visits every cell it touches (sampled at a quarter of the finest cell, corners included). */
function _wnavLineOk(L, ok, ax, az, bx, bz) {
  // a quarter of a near cell; beyond the seam worldStep's own 0.2 m sub-step (a line this passes, a mover can walk)
  const far = L.far && az >= L.seam && bz >= L.seam, len = Math.hypot(bx - ax, bz - az), stepL = far ? 0.2 : (L.N0 ? L.cell : (L.far ? L.far.cell : L.cell)) * 0.25;
  const n = Math.max(1, Math.ceil(len / stepL));
  let last = -2;
  const r = L._lineR || 0.25;
  for (let s = 0; s <= n; s++) {
    const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n, k = _wnavIdx(L, x, z);
    if (k >= L.N0 && k >= 0 && !_wnavFarPointOk(L, k, x, z, r)) return false;
    if (k === last) continue;
    if (k < 0 || !ok[k]) return false;
    if (last >= 0 && k !== last) {
      // a diagonal hop between cells of one grid: both side cells must be legal too (no corner cutting)
      const k1 = _wnavIdx(L, x, az + (bz - az) * (s - 1) / n), k2 = _wnavIdx(L, ax + (bx - ax) * (s - 1) / n, z);
      if (k1 !== k && k1 !== last && (k1 < 0 || !ok[k1])) return false;
      if (k2 !== k && k2 !== last && (k2 < 0 || !ok[k2])) return false;
    }
    last = k;
  }
  return true;
}
function _wnavPull(L, ok, cells) {
  const pts = cells.map(k => [_wnavCX(L, k), _wnavCZ(L, k)]);
  if (pts.length <= 2) return pts;
  const out = [pts[0]]; let a = 0;
  while (a < pts.length - 1) {
    let b = Math.min(pts.length - 1, a + 40);
    while (b > a + 1 && !_wnavLineOk(L, ok, pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--;
    out.push(pts[b]); a = b;
  }
  return out;
}
// binary min-heap on (key Float64, value Int32), reused
function _wnavHeap(cap) {
  let kk = new Float64Array(cap), vv = new Int32Array(cap), n = 0;
  return {
    get size() { return n; },
    clear() { n = 0; },
    push(key, val) {
      if (n === kk.length) { const k2 = new Float64Array(n * 2), v2 = new Int32Array(n * 2); k2.set(kk); v2.set(vv); kk = k2; vv = v2; }
      let i = n++;
      while (i > 0) { const p = (i - 1) >> 1; if (kk[p] <= key) break; kk[i] = kk[p]; vv[i] = vv[p]; i = p; }
      kk[i] = key; vv[i] = val;
    },
    pop() {
      const top = vv[0], key = kk[--n], val = vv[n];
      let i = 0;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && kk[c + 1] < kk[c]) c++; if (kk[c] >= key) break; kk[i] = kk[c]; vv[i] = vv[c]; i = c; }
      kk[i] = key; vv[i] = val;
      return top;
    },
  };
}
const _WNAV_HEAP = _wnavHeap(1024);
/**
 * A path of waypoints (string-pulled) from `from` to `to`, or null when unreachable within 2,000 expansions. A failed search
 * is never retried by the engine every tick: the caller backs off (2.2, 3.2). No flow field is built here.
 */
function worldPath(nav, layer, from, to, r, framed) {
  const L = nav && nav.layers[layer]; if (!L || !L.data) return null;
  r = _wnavR(layer, r);
  const ok = _wnavOkMask(L, r, framed);
  const s = _wnavGoalCells(nav, L, layer, from, r, framed, ok)[0], t = _wnavGoalCells(nav, L, layer, to, r, framed, ok)[0];
  if (s == null || t == null) return null;
  const tx = _wnavCX(L, t), tz = _wnavCZ(L, t);
  const gs = new Map(), came = new Map(), closed = new Set(), heap = _WNAV_HEAP;
  heap.clear();
  // a weighted heuristic (the cost of the cheaper of the two ends per metre): fast across open ground, near-optimal on paths
  const per = 3 * Math.max(10, Math.min(L.data[s], L.data[t])), hEst = k => Math.hypot(_wnavCX(L, k) - tx, _wnavCZ(L, k) - tz) * per;
  gs.set(s, 0); heap.push(hEst(s), s);
  let exp = 0, found = s === t;
  while (heap.size && !found) {
    const k = heap.pop(); if (closed.has(k)) continue; closed.add(k);
    if (k === t) { found = true; break; }
    if (++exp > WORLD_NAV_ASTARCAP) break;
    const gk = gs.get(k), n = _wnavNb(L, k, ok, _WNAV_NK, _WNAV_NW);
    for (let q = 0; q < n; q++) {
      const kk = _WNAV_NK[q]; if (closed.has(kk)) continue;
      const nd = gk + _WNAV_NW[q];
      const old = gs.get(kk);
      if (old === undefined || nd < old) { gs.set(kk, nd); came.set(kk, k); heap.push(nd + hEst(kk), kk); }
    }
  }
  if (!found) return null;
  const cells = [t]; let c = t;
  while (c !== s) { c = came.get(c); cells.push(c); }
  cells.reverse();
  return _wnavPull(L, ok, cells);
}

/**
 * Integrate one step with a clamped slide: the result is always a legal point. A step that would enter a forbidden cell
 * slides along the edge (x only, then z only) or stays put. Long steps are sub-stepped. If `pos` itself is illegal (should not
 * happen), the nearest legal cell within 3 m is returned.
 */
function worldStep(nav, layer, pos, vel, r, dt, framed) {
  const L = nav.layers[layer];
  if (layer === 'rail') {
    const n = _wnavRailNear(L.lines, pos[0] + vel[0] * dt, pos[1] + vel[1] * dt);
    return n ? [n.x, n.z] : [pos[0], pos[1]];
  }
  if (!L || !L.data) return [pos[0], pos[1]];
  r = _wnavR(layer, r);
  let x = pos[0], z = pos[1];
  const okAt = (px, pz) => { const k = _wnavIdx(L, px, pz); return k >= 0 && _wnavCellOk(L, k, r, framed) && (k < L.N0 || _wnavFarPointOk(L, k, px, pz, r)); };
  if (!okAt(x, z)) {
    const c = _wnavNearestOk(L, _wnavOkMask(L, r, framed), x, z, 3)[0];
    return c == null ? [x, z] : [_wnavCX(L, c), _wnavCZ(L, c)];
  }
  const dx = vel[0] * dt, dz = vel[1] * dt, D = Math.hypot(dx, dz);
  const n = Math.max(1, Math.ceil(D / 0.2));
  const sx = dx / n, sz = dz / n;
  for (let s = 0; s < n; s++) {
    if (okAt(x + sx, z + sz)) { x += sx; z += sz; }
    else if (sx && okAt(x + sx, z)) x += sx;
    else if (sz && okAt(x, z + sz)) z += sz;
    else break;
  }
  return [x, z];
}

/** Connected parts of a layer at a radius (4-neighbour across the seam), cached: { comp: Int32Array (-1 = not ok), sizes }. */
function worldNavComponents(nav, layer, r) {
  const L = nav && nav.layers[layer]; if (!L || !L.data) return null;
  r = _wnavR(layer, r);
  L.compc = L.compc || new Map();
  const key = Math.round(r * 100);
  if (L.compc.has(key)) return L.compc.get(key);
  const ok = _wnavOkMask(L, r, false), comp = new Int32Array(L.N).fill(-1), sizes = [], stack = [];
  for (let k0 = 0; k0 < L.N; k0++) {
    if (!ok[k0] || comp[k0] >= 0) continue;
    const c = sizes.length; let size = 0; comp[k0] = c; stack.push(k0);
    while (stack.length) {
      const q = stack.pop(); size++;
      const n = _wnavNb(L, q, ok, _WNAV_NK, _WNAV_NW);
      for (let i = 0; i < n; i++) { const m = _WNAV_NK[i]; if (comp[m] < 0) { comp[m] = c; stack.push(m); } }
    }
    sizes.push(size);
  }
  const res = { comp, sizes };
  L.compc.set(key, res);
  return res;
}

/* ---------- spawn cells (A3, C2) ---------- */
/**
 * Spawn cells (4.4): legal cells just OUTSIDE the widest frame's sides ('W' / 'E', a 3 m band beyond a body's width), the
 * first row BEYOND the near band ('S'; hidden when that row is below the frame's bottom edge), the far end of the layer ('N'),
 * behind cover (a wide solid nearer the camera that hides a mover's whole height), and building doors ('door').
 * `hidden` says whether a mover appearing there is out of sight (else the renderer fades it in: agents carry `born`).
 */
function worldSpawnCells(nav, layer, r) {
  const L = nav && nav.layers[layer]; if (!L) return [];
  if (layer === 'rail') return L.lines.flatMap(l => [{ x: l.path[0][0], z: l.path[0][1], i: -1, edge: 'S', line: l.id, hidden: true }, { x: l.path[l.path.length - 1][0], z: l.path[l.path.length - 1][1], i: -1, edge: 'N', line: l.id, hidden: true }]);
  if (!L.data) return [];
  r = _wnavR(layer, r);
  const key = layer + '|' + Math.round(r * 100);
  nav.spawnCache = nav.spawnCache || new Map();
  if (nav.spawnCache.has(key)) return nav.spawnCache.get(key);
  const cam = nav.cam, out = [], eye = cam.eye, hm = WORLD_NAV_HEIGHT[layer.split('@')[0]] || 1.9;
  const ok = _wnavOkMask(L, r, false);
  const body = 0.6 + r, band = 3 + L.cell;
  const covers = (layer === 'swim' || layer === 'wade' ? nav.wetSolids : nav.solids).filter(s => s.ent).map(s => {
    const e = s.ent, ht = e.height || (e.size && e.size.h) || 2;
    let a0 = Infinity, a1 = -Infinity, zf = 0, zn = Infinity, x0 = Infinity, x1 = -Infinity;
    for (const p of s.poly) { const a = Math.atan2(p[0], Math.max(0.01, p[1])); a0 = Math.min(a0, a); a1 = Math.max(a1, a); zf = Math.max(zf, p[1]); zn = Math.min(zn, p[1]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
    const pad = (a1 - a0) * 0.1;
    return { a0: a0 + pad, a1: a1 - pad, zf, zn, ht, wide: Math.max(x1 - x0, zf - zn) };
  }).filter(c => c.ht >= 1.2 && c.a1 > c.a0 && c.wide >= 1.5 && c.zn > 0.5);
  let zMax = 0;
  for (let k = 0; k < L.N; k++) if (ok[k]) zMax = Math.max(zMax, _wnavGZ(L, k));
  const zFar = Math.max(0.75 * zMax, cam.f * hm / 30);
  for (let k = 0; k < L.N; k++) {
    if (!ok[k]) continue;
    const x = _wnavCX(L, k), z = _wnavCZ(L, k), gz = _wnavGZ(L, k), cell = k < L.N0 ? L.cell : L.far.cell;
    const xl = -z * cam.tanL, xr = z * cam.tanR;
    let edge = null, hidden = true;
    if (x < xl - body) { if (x >= xl - body - band) edge = 'W'; }
    else if (x > xr + body) { if (x <= xr + body + band) edge = 'E'; }
    else if (gz - cell / 2 - L.nearZ < Math.max(1.0, cell * 2) && k < L.N0) {
      // the near row: only where a mover stands wholly inside the frame (a cell across a frame edge is no spawn cell)
      if (x > -z * cam.tanL0 + body && x < z * cam.tanR0 - body) { edge = 'S'; hidden = z < cam.dMin; }
    }
    else if (gz >= zFar && _wnavEndsAway(L, ok, x, gz, cell)) { edge = 'N'; hidden = cam.f * hm / z < 12; }
    else {
      const a = Math.atan2(x, z);
      for (const c of covers) if (a > c.a0 && a < c.a1 && z > c.zf + r && z < c.zf + 15 && (c.ht - eye) / c.zn >= (hm - eye) / z) { edge = 'cover'; break; }
    }
    if (edge) out.push({ x, z, i: k, edge, hidden });
  }
  // doors: the front of every building (kb doors when known), on a legal cell within 1.5 m
  if (layer === 'walk') {
    for (const e of nav.ents) {
      const kb = typeof worldKb === 'function' ? _wnavKb(e.obj) : null;
      const isB = (kb && (kb.cls === 'building' || Array.isArray(kb.doors))) || e.cls === 'building';
      if (!isB) continue;
      const pts = _wnavDoors(e, kb);
      for (const p of pts) {
        const c = _wnavNearestOk(L, ok, p[0], p[1], 1.5)[0];
        if (c != null && !out.some(o => o.i === c && o.edge === 'door')) out.push({ x: _wnavCX(L, c), z: _wnavCZ(L, c), i: c, edge: 'door', hidden: true, host: e.id || null });
      }
    }
  }
  nav.spawnCache.set(key, out);
  return out;
}
/** Does the layer end just beyond this cell (away from the camera)? */
function _wnavEndsAway(L, ok, x, gz, cell) { const k = _wnavIdx(L, x, gz + cell); return k < 0 || !ok[k]; }
function _wnavKb(id) { try { return worldKb(id) || null; } catch (e) { return null; } }
/** Door points of a building: kb doors (local [u, v]: u along its facing, v to its right), else the middle of its front face. */
function _wnavDoors(e, kb) {
  const f = (Number.isFinite(e.facing) ? e.facing : 90) * Math.PI / 180, hx = Math.sin(f), hz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  const sz = e.size || {}, len = sz.w || 6;
  if (kb && Array.isArray(kb.doors) && kb.doors.length) return kb.doors.filter(p => Array.isArray(p) && p.length >= 2).map(p => [e.x + p[0] * hx + p[1] * rx, e.z + p[0] * hz + p[1] * rz]);
  // the front is the face its facing points to (K3: a building faces its street); the door just outside the middle of it
  return [[e.x + hx * (len / 2 + 0.4), e.z + hz * (len / 2 + 0.4)]];
}

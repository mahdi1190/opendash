// World engine module B: navigation (WORLD_ENGINE.md section 3, interface 8.2).
//
// Pure (Node + browser). Turns a World's surfaces and static solids into per-layer grids that movers can never
// leave: walk / graze / swim / wade / drive grids plus 1D rail lines. Each grid cell carries a cost (0 = never)
// and a clearance (metres from the cell centre to the nearest solid or off-layer ground), so a mover of radius r
// may only stand where clear >= r: solids are cut out and widened by the mover's radius by construction, and a
// boat keeps its half-beam off the banks. A near-camera band (moverNear: depth < f * h / 405) is off limits
// unless the caller says the mover is `framed`.
//
//   worldNavBuild(world) -> Nav
//   worldNavLayer(nav, layer) -> Grid { layer, w, h, cell, ox, oz, data, clear, nearZ } | { layer: 'rail', lines }
//   worldNavOk(nav, layer, x, z, r, framed) -> bool          (the one legality test; everything else uses it)
//   worldFlowField(nav, layer, goal, r, framed) -> Field     (lazy, cached, <= 32 per nav)
//   worldFlowDir(field, x, z) -> [dx, dz] | null             (unit direction downhill; null at the goal / unreachable)
//   worldPath(nav, layer, from, to, r, framed) -> [[x, z], ...] | null   (A* capped at 2,000 expansions, string-pulled;
//                                                                         falls back to a flow field past the cap)
//   worldStep(nav, layer, pos, vel, r, dt, framed) -> [x, z]  (clamped slide; never returns a forbidden point)
//   worldSpawnCells(nav, layer, r) -> [{ x, z, i, edge: 'W' | 'E' | 'N' | 'S' | 'cover' }]
//
// World input (from module A, worldBuild): { cam, surfaces: [{ id, kind, poly | path + width, shallow, open }],
// entities: [{ id, obj, cls, x, z, foot, size|height, solidity, static, open, deck: { poly, y } }] }.
// Gates (cls 'gate' or an obj id naming a gate) are solid unless open: true. Hedges are solid to walkers.
// Weirs are solid to swimmers.

const WORLD_NAV_LAYERS = ['walk', 'graze', 'swim', 'wade', 'drive', 'rail'];
const WORLD_NAV_RADIUS = { walk: 0.25, graze: 0.3, swim: 0.15, wade: 0.2, drive: 1.0, rail: 0 };
const WORLD_NAV_HEIGHT = { walk: 1.75, graze: 1.2, swim: 0.4, wade: 1.0, drive: 1.6, rail: 3.8 };   // tallest typical user, for the near band
// (clearance is exact within 1.5 m of a solid and a guaranteed lower bound beyond, so any radius is safe)
const WORLD_NAV_MAXCELLS = 260000;      // cell cap per layer; a bigger world gets a coarser cell
const WORLD_NAV_FLOWCAP = 32;
const WORLD_NAV_ASTARCAP = 2000;
// surface kind -> { layer: cost x10 }
const _WNAV_KIND = {
  path: { walk: 10 }, pavement: { walk: 10 }, towpath: { walk: 10 }, plaza: { walk: 10 }, boardwalk: { walk: 10 },
  'bridge-deck': { walk: 10 }, deck: { walk: 10 }, crossing: { walk: 12, drive: 10 },
  grass: { walk: 16, graze: 10 }, heath: { walk: 16, graze: 10 }, field: { walk: 16, graze: 10 }, sand: { walk: 16, graze: 10 },
  road: { drive: 10 }, water: { swim: 10 }, reeds: { wade: 10 }, bed: { wade: 10 },
};

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
  if (p.length === 1) return Math.hypot(x - p[0][0], z - p[0][1]) - (s.width || 0) / 2;
  for (let i = 1; i < p.length; i++) d = Math.min(d, _wnavSegDist(x, z, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]));
  return Math.max(0, d - (s.width || 0) / 2);
}
function _wnavBBox(s) {
  const pts = s.poly || s.path, pad = s.poly ? 0 : (s.width || 0) / 2;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  return [x0 - pad, z0 - pad, x1 + pad, z1 + pad];
}
/** An entity's footprint polygon: its derived `foot`, else a box / disc from its size, rotated by facing. */
function _wnavFoot(e) {
  if (Array.isArray(e.foot) && e.foot.length >= 3) return e.foot;
  const sz = e.size || {}, w = sz.w || e.w || 0.6, d = sz.d || e.d || w;
  const a = (e.facing || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [e.x + u * c + v * s, e.z - u * s + v * c]);
}
function _wnavIsGate(e) { return e.cls === 'gate' || /(^|[.\-])gate([.\-]|$)/.test(String(e.obj || '')); }
function _wnavIsSolid(e) {
  if (e.static === false) return false;
  if (_wnavIsGate(e)) return e.open !== true;
  return e.solidity === 'solid';
}

/** Call put(k) for every cell whose centre lies in a shape: scanline fill for polygons, per-segment for paths. */
function _wnavFill(s, w, h, cell, ox, oz, put) {
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
  for (let n = 0; n < P.length; n++) {
    const a = P[Math.max(0, n - 1)], c = P[n];
    if (n === 0 && P.length > 1) continue;
    const i0 = Math.max(0, Math.floor((Math.min(a[0], c[0]) - hw - ox) / cell)), i1 = Math.min(w - 1, Math.ceil((Math.max(a[0], c[0]) + hw - ox) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(a[1], c[1]) - hw - oz) / cell)), j1 = Math.min(h - 1, Math.ceil((Math.max(a[1], c[1]) + hw - oz) / cell));
    for (let j = j0; j <= j1; j++) {
      const z = oz + (j + 0.5) * cell;
      for (let i = i0; i <= i1; i++) if (_wnavSegDist(ox + (i + 0.5) * cell, z, a[0], a[1], c[0], c[1]) <= hw) put(j * w + i);
    }
  }
}

/** Squared Euclidean distance transform (Felzenszwalb) over a w x h grid; seeds are cells with f = 0. */
function _wnavEDT(f, w, h) {
  const INF = 1e20, n = Math.max(w, h), d = new Float64Array(n), v = new Int32Array(n), zz = new Float64Array(n + 1), g = new Float64Array(n);
  const pass = (get, set, len) => {
    for (let q = 0; q < len; q++) g[q] = get(q);
    let k = 0; v[0] = 0; zz[0] = -INF; zz[1] = INF;
    const sx = (q, p) => ((g[q] + q * q) - (g[p] + p * p)) / (2 * q - 2 * p);
    for (let q = 1; q < len; q++) {
      let s = sx(q, v[k]);
      while (s <= zz[k]) { k--; s = sx(q, v[k]); }
      k++; v[k] = q; zz[k] = s; zz[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (zz[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + g[p]; }
    for (let q = 0; q < len; q++) set(q, d[q]);
  };
  for (let x = 0; x < w; x++) pass(q => f[q * w + x], (q, val) => { f[q * w + x] = val; }, h);
  for (let y = 0; y < h; y++) pass(q => f[y * w + q], (q, val) => { f[y * w + q] = val; }, w);
  return f;
}

function _wnavCam(world) {
  const c = world.cam || world.camera || {};
  const fov = c.fov || 62, W = c.x0 ? c.x0 * 2 : 1600;
  return { f: c.f || (W / 2) / Math.tan(fov * Math.PI / 360), x0: c.x0 || W / 2, W, eye: c.eye || 1.65 };
}

/** Build the navigation map of a World (section 3.1). */
function worldNavBuild(world) {
  const surfaces = (world.surfaces || []).filter(s => s && (s.poly || s.path));
  const ents = world.entities || [];
  const cam = _wnavCam(world);
  // extent: all surfaces, clamped to the moving world (0 .. 300 m)
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const s of surfaces) { const b = _wnavBBox(s); x0 = Math.min(x0, b[0]); z0 = Math.min(z0, b[1]); x1 = Math.max(x1, b[2]); z1 = Math.max(z1, b[3]); }
  if (!isFinite(x0)) { x0 = -1; x1 = 1; z0 = 0; z1 = 1; }
  z0 = Math.max(0, z0); z1 = _wnavClamp(z1, z0 + 1, 300);
  let cell = 0.5;
  while (Math.ceil((x1 - x0) / cell) * Math.ceil((z1 - z0) / cell) > WORLD_NAV_MAXCELLS) cell *= 2;
  const w = Math.max(1, Math.ceil((x1 - x0) / cell)), h = Math.max(1, Math.ceil((z1 - z0) / cell)), N = w * h;
  const ox = x0, oz = z0;
  // owner surface per cell (later overrides earlier)
  const owner = new Int16Array(N).fill(-1);
  surfaces.forEach((s, si) => _wnavFill(s, w, h, cell, ox, oz, k => { owner[k] = si; }));
  // solid shapes per layer family
  const ground = [], wet = [];
  const decks = [];
  for (const e of ents) {
    if (e.deck && e.deck.poly) decks.push({ poly: e.deck.poly, host: e });
    if (!_wnavIsSolid(e)) continue;
    const sh = { poly: _wnavFoot(e), ent: e };
    wet.push(sh);
    if (!(e.deck && e.deck.poly)) ground.push(sh);   // a host's own deck replaces its solid for walkers
  }
  for (const s of surfaces) {
    if (s.kind === 'hedge' || (s.kind === 'gate' && s.open !== true)) ground.push({ poly: s.poly, path: s.path, width: s.width });
    if (s.kind === 'weir') wet.push({ poly: s.poly, path: s.path, width: s.width });
  }
  const solidDist = shapes => {
    const sd = new Float32Array(N).fill(Infinity);
    for (const s of shapes) {
      const b = _wnavBBox(s), R = 1.5 + cell, P = s.poly ? Float64Array.from(s.poly.flat()) : null;   // exact within 1.5 m; beyond, a guaranteed lower bound from an EDT
      const i0 = _wnavClamp(Math.floor((b[0] - R - ox) / cell), 0, w - 1), i1 = _wnavClamp(Math.ceil((b[2] + R - ox) / cell), 0, w - 1);
      const j0 = _wnavClamp(Math.floor((b[1] - R - oz) / cell), 0, h - 1), j1 = _wnavClamp(Math.ceil((b[3] + R - oz) / cell), 0, h - 1);
      for (let j = j0; j <= j1; j++) {
        const z = oz + (j + 0.5) * cell;
        if (s.poly) {
          for (let i = i0; i <= i1; i++) { const k = j * w + i, d = _wnavPolyDistF(P, ox + (i + 0.5) * cell, z); if (d < sd[k]) sd[k] = d; }
        } else for (let i = i0; i <= i1; i++) { const k = j * w + i, d = _wnavShapeDist(s, ox + (i + 0.5) * cell, z); if (d < sd[k]) sd[k] = d; }
      }
    }
    // every footprint point lies within cell * 0.7072 of a seed centre, so (centre distance - that) never overestimates
    const f = new Float64Array(N);
    for (let k = 0; k < N; k++) f[k] = sd[k] < cell * 0.7072 ? 0 : 1e20;
    _wnavEDT(f, w, h);
    for (let k = 0; k < N; k++) if (sd[k] > 1.5) sd[k] = Math.max(1.5, Math.sqrt(f[k]) * cell - cell * 0.7072);
    return sd;
  };
  const sdGround = solidDist(ground), sdWet = wet.length === ground.length ? sdGround : solidDist(wet);
  // water depth-from-edge for wade (shallow margin per water surface)
  const water = new Float64Array(N);
  for (let k = 0; k < N; k++) water[k] = owner[k] >= 0 && surfaces[owner[k]].kind === 'water' ? 1e20 : 0;
  _wnavEDT(water, w, h);
  const layers = {};
  for (const L of WORLD_NAV_LAYERS) {
    if (L === 'rail') continue;
    const data = new Uint8Array(N);
    for (let k = 0; k < N; k++) {
      const o = owner[k]; if (o < 0) continue;
      const s = surfaces[o], kd = _WNAV_KIND[s.kind];
      if (kd && kd[L]) data[k] = kd[L];
      if (L === 'wade' && s.kind === 'water') {
        const sh = s.shallow == null ? 0.5 : s.shallow;
        if (Math.sqrt(water[k]) * cell - cell / 2 <= sh) data[k] = 10;
      }
    }
    if (L === 'walk') for (const dk of decks) _wnavFill(dk, w, h, cell, ox, oz, k => { data[k] = 10; });
    const sd = (L === 'swim' || L === 'wade') ? sdWet : sdGround;
    // edge distance: off-layer cells (and the outside of the grid) are seeds
    const f = new Float64Array(N);
    for (let k = 0; k < N; k++) f[k] = data[k] && sd[k] > 0 ? 1e20 : 0;
    _wnavEDT(f, w, h);
    const clear = new Float32Array(N);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!data[k] || sd[k] <= 0) { data[k] = 0; clear[k] = 0; continue; }
      // conservative for ANY point in the cell: the seed cell's half-width and this cell's half-diagonal come off
      const edge = Math.sqrt(f[k]) * cell - cell * 1.2072, inner = sd[k] - cell * 0.7072;
      // waders stand in a thin margin: only solids bound them (the deep-water / bank side is harmless)
      clear[k] = Math.max(0, L === 'wade' ? inner : Math.min(inner, edge));
    }
    const nearZ = cam.f * WORLD_NAV_HEIGHT[L] / 405;
    layers[L] = { layer: L, w, h, cell, ox, oz, data, clear, nearZ };
  }
  layers.rail = { layer: 'rail', lines: surfaces.filter(s => (s.kind === 'rail' || s.kind === 'tram') && s.path).map(s => ({ id: s.id, path: s.path })) };
  return { layers, cam, world, flows: new Map(), solids: ground, wetSolids: wet, ents };
}

function worldNavLayer(nav, layer) { return nav && nav.layers[layer] || null; }

function _wnavR(layer, r) { return r == null ? WORLD_NAV_RADIUS[layer] : r; }
function _wnavCellOk(g, k, r, framed) {
  if (!g.data[k] || g.clear[k] < r) return false;
  if (!framed && g.oz + (Math.floor(k / g.w) + 0.5) * g.cell < g.nearZ) return false;
  return true;
}
function _wnavIdx(g, x, z) {
  const i = Math.floor((x - g.ox) / g.cell), j = Math.floor((z - g.oz) / g.cell);
  return i < 0 || j < 0 || i >= g.w || j >= g.h ? -1 : j * g.w + i;
}
function _wnavRailNear(lines, x, z) {
  let best = null;
  for (const l of lines) for (let i = 1; i < l.path.length; i++) {
    const a = l.path[i - 1], b = l.path[i], dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1;
    const t = _wnavClamp(((x - a[0]) * dx + (z - a[1]) * dz) / L, 0, 1), px = a[0] + t * dx, pz = a[1] + t * dz, d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) best = { d, x: px, z: pz };
  }
  return best;
}

/** Is a point legal for a mover of radius r on this layer? (The single legality rule.) */
function worldNavOk(nav, layer, x, z, r, framed) {
  const g = nav.layers[layer]; if (!g) return false;
  if (layer === 'rail') { const n = _wnavRailNear(g.lines, x, z); return !!n && n.d < 1e-6; }
  const k = _wnavIdx(g, x, z);
  return k >= 0 && _wnavCellOk(g, k, _wnavR(layer, r), framed);
}

// binary min-heap on (key Float32, value Int32), reused
function _wnavHeap(cap) {
  let kk = new Float64Array(cap), vv = new Int32Array(cap), n = 0;
  return {
    get size() { return n; },
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
    topKey() { return kk[0]; },
  };
}
const _WNAV_NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

/** Goal -> list of seed cell indices. goal: [x, z] | { x, z } | 'N' | 'S' | 'E' | 'W' | { cells: [k...] }. */
function _wnavGoalCells(nav, g, layer, goal, r, framed) {
  if (goal && goal.cells) return goal.cells.filter(k => _wnavCellOk(g, k, r, framed));
  if (typeof goal === 'string') return worldSpawnCells(nav, layer, r).filter(c => c.edge === goal).map(c => c.i);
  const x = Array.isArray(goal) ? goal[0] : goal.x, z = Array.isArray(goal) ? goal[1] : goal.z;
  const k = _wnavIdx(g, x, z);
  if (k >= 0 && _wnavCellOk(g, k, r, framed)) return [k];
  // nearest legal cell within 3 m (a bench is solid; its goal is the cell beside it)
  let best = -1, bd = Infinity; const R = Math.ceil(3 / g.cell), ci = Math.floor((x - g.ox) / g.cell), cj = Math.floor((z - g.oz) / g.cell);
  for (let j = cj - R; j <= cj + R; j++) for (let i = ci - R; i <= ci + R; i++) {
    if (i < 0 || j < 0 || i >= g.w || j >= g.h) continue;
    const kk = j * g.w + i; if (!_wnavCellOk(g, kk, r, framed)) continue;
    const d = (i - ci) * (i - ci) + (j - cj) * (j - cj); if (d < bd) { bd = d; best = kk; }
  }
  return best >= 0 ? [best] : [];
}

/** A cached flow field (Dijkstra from the goal over the layer, 8-neighbour, no corner cutting). */
function worldFlowField(nav, layer, goal, r, framed) {
  const g = nav.layers[layer]; if (!g || !g.data) return null;
  r = _wnavR(layer, r);
  const key = layer + '|' + r + '|' + (framed ? 1 : 0) + '|' + JSON.stringify(goal);
  const hit = nav.flows.get(key);
  if (hit) { nav.flows.delete(key); nav.flows.set(key, hit); return hit; }
  const N = g.w * g.h, dist = new Float64Array(N).fill(Infinity), heap = _wnavHeap(N >> 2);
  const ok = new Uint8Array(N), w = g.w, h = g.h, data = g.data, clear = g.clear;
  const jNear = framed ? 0 : Math.max(0, Math.ceil((g.nearZ - g.oz) / g.cell - 0.5));
  for (let k = jNear * w; k < N; k++) ok[k] = data[k] && clear[k] >= r ? 1 : 0;
  const seeds = _wnavGoalCells(nav, g, layer, goal, r, framed);
  for (const k of seeds) { dist[k] = 0; heap.push(0, k); }
  const D = Math.SQRT2 * 0.05;
  while (heap.size) {
    const d0 = heap.topKey(), k = heap.pop();
    if (d0 > dist[k]) continue;
    const i = k % w, c0 = data[k];
    const hasL = i > 0, hasR = i < w - 1, hasU = k >= w, hasD = k < N - w;
    const okL = hasL && ok[k - 1], okR = hasR && ok[k + 1], okU = hasU && ok[k - w], okD = hasD && ok[k + w];
    let kk, nd;
    if (okL) { kk = k - 1; nd = d0 + (c0 + data[kk]) * 0.05; if (nd < dist[kk]) { dist[kk] = nd; heap.push(nd, kk); } }
    if (okR) { kk = k + 1; nd = d0 + (c0 + data[kk]) * 0.05; if (nd < dist[kk]) { dist[kk] = nd; heap.push(nd, kk); } }
    if (okU) { kk = k - w; nd = d0 + (c0 + data[kk]) * 0.05; if (nd < dist[kk]) { dist[kk] = nd; heap.push(nd, kk); } }
    if (okD) { kk = k + w; nd = d0 + (c0 + data[kk]) * 0.05; if (nd < dist[kk]) { dist[kk] = nd; heap.push(nd, kk); } }
    if (okL && okU) { kk = k - w - 1; if (ok[kk]) { nd = d0 + (c0 + data[kk]) * D; if (nd < dist[kk]) { dist[kk] = nd; heap.push(nd, kk); } } }
    if (okR && okU) { kk = k - w + 1; if (ok[kk]) { nd = d0 + (c0 + data[kk]) * D; if (nd < dist[kk]) { dist[kk] = nd; heap.push(nd, kk); } } }
    if (okL && okD) { kk = k + w - 1; if (ok[kk]) { nd = d0 + (c0 + data[kk]) * D; if (nd < dist[kk]) { dist[kk] = nd; heap.push(nd, kk); } } }
    if (okR && okD) { kk = k + w + 1; if (ok[kk]) { nd = d0 + (c0 + data[kk]) * D; if (nd < dist[kk]) { dist[kk] = nd; heap.push(nd, kk); } } }
  }
  const field = { layer, r, framed: !!framed, goal, grid: g, dist, ok, seeds };
  nav.flows.set(key, field);
  if (nav.flows.size > WORLD_NAV_FLOWCAP) nav.flows.delete(nav.flows.keys().next().value);
  return field;
}

/** Next cell index downhill from k in a field, or -1. */
function _wnavDown(f, k) {
  const g = f.grid, w = g.w, i = k % w, j = (k - i) / w;
  let best = -1, bd = f.dist[k];
  for (let n = 0; n < 8; n++) {
    const di = _WNAV_NB[n][0], dj = _WNAV_NB[n][1], ii = i + di, jj = j + dj;
    if (ii < 0 || jj < 0 || ii >= w || jj >= g.h) continue;
    const kk = jj * w + ii; if (!f.ok[kk]) continue;
    if (di && dj && (!f.ok[j * w + ii] || !f.ok[jj * w + i])) continue;
    if (f.dist[kk] < bd) { bd = f.dist[kk]; best = kk; }
  }
  return best;
}
/** Unit direction to follow the field from (x, z); null at the goal or where the goal is unreachable. */
function worldFlowDir(field, x, z) {
  const g = field.grid, k = _wnavIdx(g, x, z);
  if (k < 0 || !isFinite(field.dist[k]) || field.dist[k] === 0) return null;
  const n = _wnavDown(field, k); if (n < 0) return null;
  const tx = g.ox + (n % g.w + 0.5) * g.cell, tz = g.oz + (Math.floor(n / g.w) + 0.5) * g.cell, L = Math.hypot(tx - x, tz - z) || 1;
  return [(tx - x) / L, (tz - z) / L];
}

/** Straight segment legal for the layer? Visits EVERY cell the segment touches (grid traversal, corners included). */
function _wnavLine(g, ax, az, bx, bz, r, framed) {
  let i = Math.floor((ax - g.ox) / g.cell), j = Math.floor((az - g.oz) / g.cell);
  const ti = Math.floor((bx - g.ox) / g.cell), tj = Math.floor((bz - g.oz) / g.cell);
  const ok = (ii, jj) => ii >= 0 && jj >= 0 && ii < g.w && jj < g.h && _wnavCellOk(g, jj * g.w + ii, r, framed);
  if (!ok(i, j)) return false;
  const dx = bx - ax, dz = bz - az, si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1;
  const tdx = dx ? Math.abs(g.cell / dx) : Infinity, tdz = dz ? Math.abs(g.cell / dz) : Infinity;
  let tmx = dx ? ((g.ox + (i + (dx > 0 ? 1 : 0)) * g.cell) - ax) / dx : Infinity;
  let tmz = dz ? ((g.oz + (j + (dz > 0 ? 1 : 0)) * g.cell) - az) / dz : Infinity;
  for (let guard = 0; (i !== ti || j !== tj) && guard < 100000; guard++) {
    if (Math.abs(tmx - tmz) < 1e-12) {   // through a corner: both side cells must be legal too
      if (!ok(i + si, j) || !ok(i, j + sj)) return false;
      i += si; j += sj; tmx += tdx; tmz += tdz;
    } else if (tmx < tmz) { i += si; tmx += tdx; } else { j += sj; tmz += tdz; }
    if (tmx > 1 + 1e-9 && tmz > 1 + 1e-9 && (i !== ti || j !== tj)) break;
    if (!ok(i, j)) return false;
  }
  return true;
}
function _wnavPull(g, cells, r, framed) {
  const pts = cells.map(k => [g.ox + (k % g.w + 0.5) * g.cell, g.oz + (Math.floor(k / g.w) + 0.5) * g.cell]);
  if (pts.length <= 2) return pts;
  const out = [pts[0]]; let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !_wnavLine(g, pts[a][0], pts[a][1], pts[b][0], pts[b][1], r, framed)) b--;
    out.push(pts[b]); a = b;
  }
  return out;
}

/** A path of cell-centre waypoints (string-pulled) from `from` to `to`, or null when unreachable. */
function worldPath(nav, layer, from, to, r, framed) {
  const g = nav.layers[layer]; if (!g || !g.data) return null;
  r = _wnavR(layer, r);
  const s = _wnavGoalCells(nav, g, layer, from, r, framed)[0], t = _wnavGoalCells(nav, g, layer, to, r, framed)[0];
  if (s == null || t == null) return null;
  const w = g.w, ti = t % w, tj = (t - ti) / w, gs = new Map(), came = new Map(), heap = _wnavHeap(256), closed = new Set();
  const hEst = k => { const i = k % w, j = (k - i) / w, dx = Math.abs(i - ti), dy = Math.abs(j - tj); return (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)); };
  gs.set(s, 0); heap.push(hEst(s), s);
  let exp = 0, found = s === t;
  while (heap.size && !found) {
    const k = heap.pop(); if (closed.has(k)) continue; closed.add(k);
    if (k === t) { found = true; break; }
    if (++exp > WORLD_NAV_ASTARCAP) break;
    const i = k % w, j = (k - i) / w, gk = gs.get(k);
    for (let n = 0; n < 8; n++) {
      const di = _WNAV_NB[n][0], dj = _WNAV_NB[n][1], ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= w || jj >= g.h) continue;
      const kk = jj * w + ii; if (closed.has(kk) || !_wnavCellOk(g, kk, r, framed)) continue;
      if (di && dj && (!_wnavCellOk(g, j * w + ii, r, framed) || !_wnavCellOk(g, jj * w + i, r, framed))) continue;
      const nd = gk + _WNAV_NB[n][2] * (g.data[k] + g.data[kk]) * 0.05;
      if (nd < (gs.has(kk) ? gs.get(kk) : Infinity)) { gs.set(kk, nd); came.set(kk, k); heap.push(nd + hEst(kk), kk); }
    }
  }
  let cells;
  if (found) {
    cells = [t]; let c = t;
    while (c !== s) { c = came.get(c); cells.push(c); }
    cells.reverse();
  } else {
    // past the cap: follow a (cached) flow field to the target cell
    const f = worldFlowField(nav, layer, { cells: [t] }, r, framed);
    if (!isFinite(f.dist[s])) return null;
    cells = [s]; let c = s;
    while (c !== t) { c = _wnavDown(f, c); if (c < 0) return null; cells.push(c); }
  }
  return _wnavPull(g, cells, r, framed);
}

/**
 * Integrate one step with a clamped slide: the result is always a legal point. A step that would enter a
 * forbidden cell slides along the edge (x only, then z only) or stays put. Long steps are sub-stepped.
 * If `pos` itself is illegal (should not happen), the nearest legal cell centre within 3 m is returned.
 */
function worldStep(nav, layer, pos, vel, r, dt, framed) {
  const g = nav.layers[layer];
  if (layer === 'rail') {
    const n = _wnavRailNear(g.lines, pos[0] + vel[0] * dt, pos[1] + vel[1] * dt);
    return n ? [n.x, n.z] : [pos[0], pos[1]];
  }
  r = _wnavR(layer, r);
  let x = pos[0], z = pos[1];
  const okAt = (px, pz) => { const k = _wnavIdx(g, px, pz); return k >= 0 && _wnavCellOk(g, k, r, framed); };
  if (!okAt(x, z)) {
    const c = _wnavGoalCells(nav, g, layer, [x, z], r, framed)[0];
    return c == null ? [x, z] : [g.ox + (c % g.w + 0.5) * g.cell, g.oz + (Math.floor(c / g.w) + 0.5) * g.cell];
  }
  const dx = vel[0] * dt, dz = vel[1] * dt, L = Math.hypot(dx, dz);
  const n = Math.max(1, Math.ceil(L / (g.cell * 0.4)));
  const sx = dx / n, sz = dz / n;
  for (let s = 0; s < n; s++) {
    if (okAt(x + sx, z + sz)) { x += sx; z += sz; }
    else if (sx && okAt(x + sx, z)) x += sx;
    else if (sz && okAt(x, z + sz)) z += sz;
    else break;
  }
  return [x, z];
}

/**
 * Spawn cells (4.4): legal cells at the frame's side edges (just outside the view cone), at the far and near
 * ends of the grid, or behind cover (a solid nearer the camera whose top hides a mover's top).
 */
function worldSpawnCells(nav, layer, r) {
  const g = nav.layers[layer]; if (!g) return [];
  if (layer === 'rail') return g.lines.flatMap(l => [{ x: l.path[0][0], z: l.path[0][1], i: -1, edge: 'S', line: l.id }, { x: l.path[l.path.length - 1][0], z: l.path[l.path.length - 1][1], i: -1, edge: 'N', line: l.id }]);
  r = _wnavR(layer, r);
  const key = layer + '|' + r;
  nav.spawnCache = nav.spawnCache || new Map();
  if (nav.spawnCache.has(key)) return nav.spawnCache.get(key);
  const cam = nav.cam, out = [], margin = 1.0, eye = cam.eye, hm = WORLD_NAV_HEIGHT[layer];
  const covers = (layer === 'swim' || layer === 'wade' ? nav.wetSolids : nav.solids).filter(s => s.ent).map(s => {
    const e = s.ent, ht = e.height || (e.size && e.size.h) || 2;
    let a0 = Infinity, a1 = -Infinity, zf = 0, zn = Infinity;
    for (const p of s.poly) { const a = Math.atan2(p[0], Math.max(0.01, p[1])); a0 = Math.min(a0, a); a1 = Math.max(a1, a); zf = Math.max(zf, p[1]); zn = Math.min(zn, p[1]); }
    const pad = (a1 - a0) * 0.1;
    return { a0: a0 + pad, a1: a1 - pad, zf, zn, ht };
  }).filter(c => c.ht >= 1.2 && c.a1 > c.a0);
  const half = (cam.W / 2) / cam.f;   // tan of the half field of view
  for (let j = 0; j < g.h; j++) {
    const z = g.oz + (j + 0.5) * g.cell;
    for (let i = 0; i < g.w; i++) {
      const k = j * g.w + i; if (!_wnavCellOk(g, k, r, false)) continue;
      const x = g.ox + (i + 0.5) * g.cell;
      let edge = null;
      const lim = z * half;
      if (x <= -lim + margin) edge = 'W';
      else if (x >= lim - margin) edge = 'E';
      else if (j === g.h - 1 || (j + 1 < g.h && !g.data[k + g.w] && z > 0.8 * (g.oz + g.h * g.cell))) edge = 'N';
      else if (j === 0 || (z - g.nearZ) < g.cell * 1.5) edge = 'S';
      else {
        const a = Math.atan2(x, z);
        for (const c of covers) if (a > c.a0 && a < c.a1 && z > c.zf + r && z < c.zf + 15 && (c.ht - eye) / c.zn >= (hm - eye) / z) { edge = 'cover'; break; }
      }
      if (edge) out.push({ x, z, i: k, edge });
    }
  }
  nav.spawnCache.set(key, out);
  return out;
}

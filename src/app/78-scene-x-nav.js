/* ============================================================
   SCENE ENGINE v2 + v3 systems: the WALKABLE MAP (merge package "crowd", 15 Oct). PURE: constants and functions only, no DOM at
   load (it is part of the Node registry load: tools/lib/anim-sources.mjs SCENE_FILE_RE). Every call into another module goes
   through a typeof guard. Never calls a world* function at runtime: the code below is COPIED from the v3 world engine
   (src/app/79-world-1nav.js) and adapted to the v2 scene's own motion world (sceneMotionWorld, 70-scene-1ground.js), so v2
   does not depend on code that is changing under it.

   What it is. A clearance grid per mover kind over a box of ground metres (x across, d forward): a cell is OK when the v2
   motion rules accept the mover's centre there (_scgrWhyNot: on its water or walkable ground, clear of hulls, walls, fences,
   gates, trunks and benches, the body radii already added), and every cell carries a SIGNED distance in metres to the
   nearest cell of the other kind (an exact Euclidean distance transform, _wnavEDT). Cells are 0.5 m to 60 m deep and 2 m
   beyond (two grids, joined at 60 m), never coarser near the camera: a 2.6 m towpath stays connected.

     sceneXNavGrid(W, N, box)          -> { near, far, N } the grids of one mover kind (N: _scgrMoverNeeds) over box
                                          [x0, d0, x1, d1]; memoised per W and key
     sceneXNavSd(nav, x, d)            -> the signed clearance in metres at (x, d) (bilinear; > 0 inside, < 0 outside; outside
                                          the box: +Infinity, as the motion rules never fault what is outside the frame)
     sceneXNavOk(nav, x, d, r)         -> is a mover centre legal here with r metres of clearance (r 0: the cell rule)
     sceneXNavPath(W, N, a, b, o)      -> [[x, d], ...] (string-pulled, a excluded, b included) or null: A* over a grid round the
                                          segment a-b, capped at SCENE_X_NAV.cap expansions (copied from worldPath + _wnavPull +
                                          _wnavHeap); a failed search is memoised and never retried
     sceneXNavLayerOf(cls, id)         -> 'walk' | 'swim' | 'wade' | 'graze' | null (the crowd's layer of a mover class)
     sceneXNavFor(C, layer, box)       -> the grid of a compiled scene's layer (walk: a person; swim: a duck; wade: a heron)
     sceneXNavOn(C)                    -> false when the off switch is set (window.__sceneOpts.x.nav === false or crowd === false,
                                          C.x.nav === false, env SCENE_X=off)
   Private names: _scxn*.
   ============================================================ */
const SCENE_X_NAV = Object.freeze({ near: 0.5, far: 2, seam: 60, max: 300, cap: 2000, maxCells: 160000, pad: 4 });
const _scxnClamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** The off switches (crowd and nav share them): window.__sceneOpts.x.<key> === false, C.x.<key> === false, env SCENE_X=off|<key>=off. */
function _scxnSwitch(key, C) {
  try {
    if (C && C.x && C.x[key] === false) return false;
    if (typeof window !== 'undefined' && window.__sceneOpts && window.__sceneOpts.x && window.__sceneOpts.x[key] === false) return false;
    if (typeof process !== 'undefined' && process.env && process.env.SCENE_X) {
      const v = String(process.env.SCENE_X);
      if (v === 'off' || new RegExp('(^|,)' + key + '=off(,|$)').test(v)) return false;
    }
  } catch (e) { /* no switches */ }
  return true;
}
/** The A* fallback's switch: off by the switches, and for a plain v1 scene (no fx opt-in: its frames stay pixel-identical, V2 14.1). */
function sceneXNavOn(C) {
  if (C && C.v !== 2 && !(C.fx && typeof C.fx === 'object' && Object.keys(C.fx).some(k => C.fx[k] === 2))) return false;
  return _scxnSwitch('nav', C) && _scxnSwitch('crowd', C);
}

/** Squared Euclidean distance transform in cells (Felzenszwalb), in place: f is 0 at seeds, 1e20 elsewhere. COPIED from _wnavEDT (79-world-1nav.js). */
function _scxnEDT(f, w, h) {
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

/** Why a mover centre may not be at (x, d) ('' = fine): the v2 motion rules (70-scene-1ground.js), else nothing is faulted. */
function _scxnWhy(W, N, x, d) {
  if (!(d > 0.3)) return 'behind';
  return typeof _scgrWhyNot === 'function' ? _scgrWhyNot(W, N, x, d) : '';
}
/** One uniform grid: ok (Uint8Array) and sd (Float32Array, signed metres) over [ox, oz] + w x h cells of `cell` metres. */
function _scxnGrid(W, N, ox, oz, w, h, cell) {
  const n = w * h, ok = new Uint8Array(n);
  for (let j = 0; j < h; j++) { const d = oz + (j + 0.5) * cell; for (let i = 0; i < w; i++) ok[j * w + i] = _scxnWhy(W, N, ox + (i + 0.5) * cell, d) ? 0 : 1; }
  // signed distance: inside, the distance to the nearest bad cell; outside, minus the distance to the nearest good one (both less
  // half a cell, so the boundary sits between the two cells)
  const fb = new Float64Array(n), fg = new Float64Array(n);
  let anyBad = false, anyOk = false;
  for (let k = 0; k < n; k++) { if (ok[k]) { fb[k] = 1e20; fg[k] = 0; anyOk = true; } else { fb[k] = 0; fg[k] = 1e20; anyBad = true; } }
  if (anyBad) _scxnEDT(fb, w, h);
  if (anyOk) _scxnEDT(fg, w, h);
  const sd = new Float32Array(n);
  for (let k = 0; k < n; k++) sd[k] = ok[k] ? (anyBad ? Math.sqrt(fb[k]) * cell - cell / 2 : 1e6) : -(anyOk ? Math.sqrt(fg[k]) * cell - cell / 2 : 1e6);
  return { ox, oz, w, h, cell, ok, sd, n };
}
const _scxnMemo = new WeakMap();
const _scxnKey = (N) => [N.mode, N.cls, Math.round(N.rx * 100), Math.round(N.rd * 100), Math.round(N.inset * 100), (N.kinds || []).join(',')].join('|');
/**
 * The grids of one mover kind over box [x0, d0, x1, d1] (ground metres): 0.5 m cells to 60 m, 2 m cells from 60 to 300 m. The near
 * grid grows its cell only if the box would need more than SCENE_X_NAV.maxCells (a box this big is a scene mistake; logged by
 * the caller through nav.coarse). Memoised per W (the motion world) and per needs + box.
 */
function sceneXNavGrid(W, N, box) {
  if (!W || !N || !N.mode || !Array.isArray(box)) return null;
  const G = SCENE_X_NAV, x0 = Math.floor(box[0] - G.pad), x1 = Math.ceil(box[2] + G.pad);
  const d0 = Math.max(0.5, Math.floor(box[1] - G.pad)), d1 = Math.min(G.max, Math.ceil(box[3] + G.pad));
  const key = _scxnKey(N) + '|' + [x0, d0, x1, d1].join(',');
  let per = _scxnMemo.get(W);
  if (!per) { per = new Map(); _scxnMemo.set(W, per); }
  if (per.has(key)) return per.get(key);
  let near = null, far = null, coarse = false;
  const wx = Math.max(1, x1 - x0);
  if (d0 < G.seam) {
    let cell = G.near;
    const top = Math.min(d1, G.seam);
    while (Math.ceil(wx / cell) * Math.ceil((top - d0) / cell) > G.maxCells) { cell *= 2; coarse = true; }
    near = _scxnGrid(W, N, x0, d0, Math.ceil(wx / cell), Math.max(1, Math.ceil((top - d0) / cell)), cell);
  }
  if (d1 > G.seam) {
    const fz = Math.max(d0, G.seam);
    let cell = G.far;
    while (Math.ceil(wx / cell) * Math.ceil((d1 - fz) / cell) > G.maxCells) { cell *= 2; coarse = true; }
    far = _scxnGrid(W, N, x0, fz, Math.ceil(wx / cell), Math.max(1, Math.ceil((d1 - fz) / cell)), cell);
  }
  const nav = { near, far, N, W, box: [x0, d0, x1, d1], coarse, seam: G.seam };
  per.set(key, nav);
  return nav;
}
/** The grid of a depth (the near one below the seam). */
const _scxnPick = (nav, d) => (nav.near && (d < nav.seam || !nav.far) ? nav.near : nav.far || nav.near);
/** Signed clearance (metres) at (x, d): bilinear over the cell centres; +Infinity outside the grids (never faulted there). */
function sceneXNavSd(nav, x, d) {
  if (!nav) return Infinity;
  const g = _scxnPick(nav, d);
  if (!g) return Infinity;
  const fx = (x - g.ox) / g.cell - 0.5, fz = (d - g.oz) / g.cell - 0.5;
  if (fx < -0.5 || fz < -0.5 || fx > g.w - 0.5 || fz > g.h - 0.5) return Infinity;
  const i0 = _scxnClamp(Math.floor(fx), 0, g.w - 1), j0 = _scxnClamp(Math.floor(fz), 0, g.h - 1), i1 = Math.min(g.w - 1, i0 + 1), j1 = Math.min(g.h - 1, j0 + 1);
  const u = _scxnClamp(fx - i0, 0, 1), v = _scxnClamp(fz - j0, 0, 1), s = g.sd;
  return (s[j0 * g.w + i0] * (1 - u) + s[j0 * g.w + i1] * u) * (1 - v) + (s[j1 * g.w + i0] * (1 - u) + s[j1 * g.w + i1] * u) * v;
}
/** Is a mover centre legal at (x, d) with r metres of clearance? (r 0: inside an OK area; outside the grids always.) */
function sceneXNavOk(nav, x, d, r) {
  const s = sceneXNavSd(nav, x, d);
  return s >= (r || 0);
}

/* ---------- A* (copied from worldPath, _wnavPull, _wnavHeap and _wnavLineOk in 79-world-1nav.js; one uniform grid) ---------- */
/** A binary min-heap on (key Float64, value Int32), reused. COPIED from _wnavHeap. */
function _scxnHeap(cap) {
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
const _scxnCX = (g, k) => g.ox + ((k % g.w) + 0.5) * g.cell;
const _scxnCZ = (g, k) => g.oz + (Math.floor(k / g.w) + 0.5) * g.cell;
const _scxnIdx = (g, x, d) => { const i = Math.floor((x - g.ox) / g.cell), j = Math.floor((d - g.oz) / g.cell); return i < 0 || j < 0 || i >= g.w || j >= g.h ? -1 : j * g.w + i; };
/** Is the straight segment legal on the grid (every cell it touches OK, no corner cutting)? Adapted from _wnavLineOk. */
function _scxnLineOk(g, ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / (g.cell * 0.25)));
  let last = -2;
  for (let s = 0; s <= n; s++) {
    const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n, k = _scxnIdx(g, x, z);
    if (k === last) continue;
    if (k < 0 || !g.ok[k]) return false;
    if (last >= 0) {
      const k1 = _scxnIdx(g, x, az + (bz - az) * (s - 1) / n), k2 = _scxnIdx(g, ax + (bx - ax) * (s - 1) / n, z);
      if (k1 !== k && k1 !== last && (k1 < 0 || !g.ok[k1])) return false;
      if (k2 !== k && k2 !== last && (k2 < 0 || !g.ok[k2])) return false;
    }
    last = k;
  }
  return true;
}
/** String pulling: the farthest visible cell from each kept one (up to 40 ahead). COPIED from _wnavPull. */
function _scxnPull(g, pts) {
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  let a = 0;
  while (a < pts.length - 1) {
    let b = Math.min(pts.length - 1, a + 40);
    while (b > a + 1 && !_scxnLineOk(g, pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--;
    out.push(pts[b]); a = b;
  }
  return out;
}
/** The nearest OK cell to (x, d) within R metres, or -1. Adapted from _wnavNearestOk. */
function _scxnNearestOk(g, x, d, R) {
  let best = -1, bd = Infinity;
  const n = Math.ceil(R / g.cell), ci = Math.floor((x - g.ox) / g.cell), cj = Math.floor((d - g.oz) / g.cell);
  for (let j = Math.max(0, cj - n); j <= Math.min(g.h - 1, cj + n); j++) for (let i = Math.max(0, ci - n); i <= Math.min(g.w - 1, ci + n); i++) {
    const k = j * g.w + i; if (!g.ok[k]) continue;
    const dd = (_scxnCX(g, k) - x) ** 2 + (_scxnCZ(g, k) - d) ** 2;
    if (dd < bd && dd <= R * R) { bd = dd; best = k; }
  }
  return best;
}
const _SCXN_HEAP = _scxnHeap(1024);
const _scxnPaths = new WeakMap();
/**
 * A legal way from a to b for a mover of needs N in the motion world W: [[x, d], ...] string-pulled (a excluded, b included), or
 * null. One uniform grid round the segment (0.5 m cells up to 60 m deep, coarser farther, padded by max(6 m, 40 % of the
 * length)); 8 neighbours, no corner cutting; a weighted heuristic (1.3) as v3's; at most SCENE_X_NAV.cap expansions. A failed
 * search is memoised (never retried). o: { cap, pad, around: [x0, d0, x1, d1] (a box the grid must also cover: the blocker in the way) }.
 */
function sceneXNavPath(W, N, a, b, o) {
  o = o || {};
  if (!W || !N || !N.mode || !a || !b) return null;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), pad = o.pad != null ? o.pad : Math.max(6, 0.4 * len);
  const ar = Array.isArray(o.around) ? o.around : null;
  const dMax = Math.max(a[1], b[1], ar ? ar[3] : 0) + pad, cell0 = dMax <= SCENE_X_NAV.seam ? SCENE_X_NAV.near : dMax <= 120 ? 1 : SCENE_X_NAV.far;
  const x0 = Math.min(a[0], b[0], ar ? ar[0] : Infinity) - pad, x1 = Math.max(a[0], b[0], ar ? ar[2] : -Infinity) + pad;
  const z0 = Math.max(0.5, Math.min(a[1], b[1], ar ? ar[1] : Infinity) - pad), z1 = dMax;
  let cell = cell0;
  while (Math.ceil((x1 - x0) / cell) * Math.ceil((z1 - z0) / cell) > 60000) cell *= 2;
  const key = _scxnKey(N) + '|' + [a[0], a[1], b[0], b[1]].map(v => Math.round(v * 100)).join(',') + '|' + cell;
  let memo = _scxnPaths.get(W);
  if (!memo) { memo = new Map(); _scxnPaths.set(W, memo); }
  if (memo.has(key)) { const m = memo.get(key); return m ? m.map(p => p.slice()) : null; }
  const g = _scxnGrid(W, N, x0, z0, Math.ceil((x1 - x0) / cell), Math.ceil((z1 - z0) / cell), cell);
  let s = _scxnIdx(g, a[0], a[1]), t = _scxnIdx(g, b[0], b[1]);
  if (s < 0 || !g.ok[s]) s = _scxnNearestOk(g, a[0], a[1], 2);
  if (t < 0 || !g.ok[t]) t = _scxnNearestOk(g, b[0], b[1], 2);
  let out = null;
  if (s >= 0 && t >= 0) {
    const tx = _scxnCX(g, t), tz = _scxnCZ(g, t), hEst = (k) => Math.hypot(_scxnCX(g, k) - tx, _scxnCZ(g, k) - tz) * 1.3;
    const gs = new Map(), came = new Map(), closed = new Set(), heap = _SCXN_HEAP, cap = o.cap || SCENE_X_NAV.cap;
    heap.clear(); gs.set(s, 0); heap.push(hEst(s), s);
    let exp = 0, found = s === t;
    const w = g.w, ok = g.ok, c = g.cell, dg = c * Math.SQRT2;
    while (heap.size && !found) {
      const k = heap.pop();
      if (closed.has(k)) continue;
      closed.add(k);
      if (k === t) { found = true; break; }
      if (++exp > cap) break;
      const i = k % w, j = (k - i) / w, gk = gs.get(k);
      const oL = i > 0 && ok[k - 1], oR = i < w - 1 && ok[k + 1], oD = j > 0 && ok[k - w], oU = j < g.h - 1 && ok[k + w];
      const nb = [];
      if (oL) nb.push([k - 1, c]); if (oR) nb.push([k + 1, c]); if (oD) nb.push([k - w, c]); if (oU) nb.push([k + w, c]);
      if (oL && oD && ok[k - w - 1]) nb.push([k - w - 1, dg]); if (oR && oD && ok[k - w + 1]) nb.push([k - w + 1, dg]);
      if (oL && oU && ok[k + w - 1]) nb.push([k + w - 1, dg]); if (oR && oU && ok[k + w + 1]) nb.push([k + w + 1, dg]);
      for (const [kk, wt] of nb) {
        if (closed.has(kk)) continue;
        const nd = gk + wt, old = gs.get(kk);
        if (old === undefined || nd < old) { gs.set(kk, nd); came.set(kk, k); heap.push(nd + hEst(kk), kk); }
      }
    }
    if (found) {
      const cells = [t];
      let q = t;
      while (q !== s) { q = came.get(q); cells.push(q); }
      cells.reverse();
      // the exact ends (the start and goal points, not their cell centres) when the grid sees them
      const pts = cells.map(k => [_scxnCX(g, k), _scxnCZ(g, k)]);
      pts[0] = [a[0], a[1]]; pts[pts.length - 1] = [b[0], b[1]];
      out = _scxnPull(g, pts).slice(1).map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);
    }
  }
  memo.set(key, out);
  return out ? out.map(p => p.slice()) : null;
}

/* ---------- the layers of a compiled scene ---------- */
/** The crowd layer of a mover: walk (people, cyclists, dogs), graze (grazers, ground birds), swim (water birds, boats), wade (herons). */
function sceneXNavLayerOf(cls, id) {
  id = String(id || '');
  if (/kayak|canoe|paddleboard|rower|rowing|sailor|swimmer|punt/.test(id)) return 'swim';   // people afloat
  if (cls === 'person' || cls === 'cyclist' || cls === 'animal-dog') return 'walk';
  if (cls === 'animal-graze' || cls === 'animal' || cls === 'bird-ground') return 'graze';
  if (cls === 'bird-water') return /heron|egret|stork|crane|wader|curlew|kingfisher/.test(id) ? 'wade' : 'swim';
  if (cls === 'boat') return 'swim';
  return null;
}
const _SCXN_REP = { walk: 'person.walker', graze: 'animal.dog', swim: 'bird.mallard', wade: 'bird.heron' };
/**
 * The grid of one layer of a compiled scene over box (ground metres): walk is judged as a person, graze as a dog-sized animal,
 * swim as a duck, wade as a heron (the representative's needs, _scgrMoverNeeds). null without the motion world.
 */
function sceneXNavFor(C, layer, box) {
  if (typeof sceneMotionWorld !== 'function' || typeof _scgrMoverNeeds !== 'function') return null;
  const W = sceneMotionWorld(C);
  if (!W || !box) return null;
  let N;
  try { N = _scgrMoverNeeds(W, _SCXN_REP[layer] || 'person.walker', layer === 'swim' ? [] : [[0, 10], [1, 10]]); } catch (e) { return null; }
  if (layer === 'swim') N = Object.assign({}, N, { mode: 'water', kinds: ['water'] });
  if (layer === 'wade') N = Object.assign({}, N, { mode: 'mixed' });
  // a walker steps onto a grass verge or a field edge to let someone pass (a thin verge down a towpath's middle is not a wall)
  if (layer === 'graze' || layer === 'walk') N = Object.assign({}, N, { mode: 'land', kinds: (N.kinds || []).concat(['verge', 'field'].filter(k => !(N.kinds || []).includes(k))) });
  return sceneXNavGrid(W, N, box);
}

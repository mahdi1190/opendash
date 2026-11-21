/* ============================================================
   THE FOLK'S PATHS (npcs-PLAN 3.5, the answer to "weird paths"). Villagers walk like people: on lanes, over bridges, through gates,
   never diagonally across beds or through the lawn when a lane goes there. The player keeps the free walk; this is for the folk only.

   COST FIELD. One cost per cell from the walking grid and the layout's cells: road, plaza or lane 1.0, sand 1.4, grass 1.8, a bed, a plot
   or a water edge 3.0, blocked Infinity (so is a closed region: nobody walks through land you have not opened). Built again only when
   the walking grid changes, in two slices (two frames).
   SLICED A*. A resumable search with pooled typed arrays: at most VFP_SLICE cells a slice, VFP_MS ms a frame while you walk and more when
   you stand. Paths are kept (an LRU of VFP_CACHE, keyed by the grid and both ends' cells), so a villager's daily legs are found once.
   SMOOTHING. String-pulled only along cells no dearer than the dearer end (a lane route keeps to the lane, a grass route may cross grass).
   gardenFolkPathAsk(a, b, cb)  -> asks for a way from a to b (cells); cb(points | null) runs when it is found (maybe this frame)
   gardenFolkPathPump(ms)       -> works on the waiting searches for at most ms (the runner calls it each frame)
   gardenFolkCost(x, y)         -> the field's cost at a point (Infinity: nobody walks there)
   ============================================================ */
const VFP_SLICE = 1500, VFP_CACHE = 2000;
const _vfp = { key: '', cost: null, tier: null, build: null, jobs: [], cache: new Map(), cur: null, pool: null, stats: { found: 0, cells: 0, ms: 0, slices: 0, maxSlice: 0 } };
function _vfpGridKey() {
  const g = typeof _gwGridNow === 'function' ? _gwGridNow(true) : null; if (!g) return '';
  if (g !== _vfp.gridObj) { _vfp.gridObj = g; _vfp.gridN = (_vfp.gridN || 0) + 1; }
  let areas = ''; try { areas = (gardenHere().areas || []).length; } catch (e) { areas = ''; }
  return _vfp.gridN + '|' + areas;
}
function _vfpZoneOpen(x, y, areas) { try { const z = gardenIslandZoneAt(x, y); return !z || areas.includes('zn-' + z); } catch (e) { return true; } }
/** One slice of the field's build: half the rows. Returns true when the field is whole. */
function _vfpBuildSlice() {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows, key = _vfpGridKey();
  if (!key) return false;
  if (_vfp.key === key && _vfp.cost) return true;
  if (!_vfp.build || _vfp.build.key !== key) {
    let areas = []; try { areas = gardenHere().areas || []; } catch (e) { areas = []; }
    _vfp.build = { key, y: 0, cost: new Float32Array(C * R), tier: new Uint8Array(C * R), grid: _gwGridNow(true), areas };
  }
  const B = _vfp.build, t0 = performance.now(), y1 = Math.min(R, B.y + Math.ceil(R / 2));
  for (let y = B.y; y < y1; y++) for (let x = 0; x < C; x++) {
    const i = y * C + x;
    if ((B.grid.hard || B.grid)[i] || B.grid[i] || !_vfpZoneOpen(x, y, B.areas)) { B.cost[i] = Infinity; B.tier[i] = 9; continue; }
    let c = null; try { c = gardenIslandBaseCell(x, y); } catch (e) { c = null; }
    // (a bed first: a planted bed laid over the plaza's setts is a bed, not paving; Hollin walked over the oak's flower bed as if it
    // were the plaza. Grass dear enough that a lane round is taken over a cut across the lawn up to two and a half times as long.)
    let k = 2.6, t = 3;
    if (c && (c.reservation === 'plot' || c.plot || c.bed || _vfpBedAt(x + 0.5, y + 0.5))) { k = 6; t = 4; }
    else if (c && (c.route || (typeof _plStoneAt === 'function' && _plStoneAt(x + 0.5, y + 0.5)))) { k = 1; t = 1; }
    else if (c && c.beach) { k = 1.6; t = 2; }
    B.cost[i] = k; B.tier[i] = t;
  }
  // a water edge costs more (folk keep off the very lip of a bank)
  B.y = y1;
  if (B.y < R) { _vfp.stats.ms += performance.now() - t0; return false; }
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const i = y * C + x; if (B.cost[i] === Infinity || B.tier[i] === 1) continue;
    let wet = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < C && ny < R && B.cost[ny * C + nx] === Infinity && typeof gardenIsWater === 'function' && gardenIsWater(nx, ny)) wet = true; }
    if (wet) { B.cost[i] = 3; B.tier[i] = 4; }
  }
  _vfp.cost = B.cost; _vfp.tier = B.tier; _vfp.key = key; _vfp.build = null; _vfp.cache.clear(); _vfp.stats.ms += performance.now() - t0;
  return true;
}
/** A planted bed at a point (a flower bed, a herb bed, a veg bed: anything painted as soil and plants), from the layout's own bed
 *  shapes (anchors named *bed*, a plaza's lawn and what is planted in it). Folk walk round beds, never over them. */
function _vfpBedAt(x, y) {
  try {
    const P = gardenIslandData().presentation || {};
    if (!_vfp.beds) { _vfp.beds = []; const D = gardenIslandData(), An = D.anchors || {}; for (const k of Object.keys(An)) { const b = An[k]; if (/bed/i.test(k) && b && Number.isFinite(b.x) && Number.isFinite(b.w)) _vfp.beds.push({ x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + (b.h || 1) }); } for (const k of ['beds', 'flowerBeds', 'plantings']) { const L = P[k]; for (const b of Array.isArray(L) ? L : L && typeof L === 'object' ? Object.values(L) : []) if (b && Number.isFinite(b.x) && Number.isFinite(b.y)) _vfp.beds.push({ x0: b.x, y0: b.y, x1: b.x + (b.w || 1), y1: b.y + (b.h || 1) }); } }
    for (const b of _vfp.beds) if (x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1) return true;
    // a plaza's own lawn and the beds planted in it (the green's lawn round the oak, its flower ring): walked round on the setts
    if (!_vfp.lawns) { _vfp.lawns = []; for (const pz of P.plazas || []) if (Array.isArray(pz.lawn) && pz.lawn.length > 2) _vfp.lawns.push(pz.lawn); }
    for (const L of _vfp.lawns) { let inn = false; for (let i = 0, j = L.length - 1; i < L.length; j = i++) { const [xi, yi] = L[i], [xj, yj] = L[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inn = !inn; } if (inn) return true; }
  } catch (e) { /* none */ }
  return typeof gardenFolkBedHook === 'function' ? !!gardenFolkBedHook(x, y) : false;
}
function gardenFolkCost(x, y) { const W = GARDEN_WORLD, cx = Math.floor(x), cy = Math.floor(y); if (!_vfp.cost || cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) return Infinity; return _vfp.cost[cy * W.cols + cx]; }
function gardenFolkTier(x, y) { const W = GARDEN_WORLD, cx = Math.floor(x), cy = Math.floor(y); if (!_vfp.tier || cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) return 9; return _vfp.tier[cy * W.cols + cx]; }
/** The nearest cell anyone can walk to from a point (the start or end of a leg may be on a seat's edge or a door step). */
function _vfpNearOpen(x, y) {
  const W = GARDEN_WORLD, cx = Math.floor(x), cy = Math.floor(y);
  for (let r = 0; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W.cols || ny >= W.rows) continue;
    if (_vfp.cost[ny * W.cols + nx] !== Infinity) return ny * W.cols + nx;
  }
  return -1;
}
function _vfpPool() {
  const n = GARDEN_WORLD.cols * GARDEN_WORLD.rows;
  if (!_vfp.pool || _vfp.pool.n !== n) _vfp.pool = { n, g: new Float32Array(n), f: new Float32Array(n), came: new Int32Array(n), stamp: new Uint32Array(n), closed: new Uint32Array(n), heap: new Int32Array(n * 4), run: 0 };
  return _vfp.pool;
}
function gardenFolkPathAsk(a, b, cb) {
  const W = GARDEN_WORLD, key = Math.floor(a.x) + ',' + Math.floor(a.y) + '>' + Math.floor(b.x) + ',' + Math.floor(b.y);
  if (_vfp.cost && _vfp.cache.has(_vfp.key + '|' + key)) { const hit = _vfp.cache.get(_vfp.key + '|' + key); _vfp.cache.delete(_vfp.key + '|' + key); _vfp.cache.set(_vfp.key + '|' + key, hit); cb(hit ? _vfpEnds(hit, a, b) : null); return; }
  for (const j of _vfp.jobs) if (j.key === key) { j.cbs.push(cb); return; }
  _vfp.jobs.push({ key, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, cbs: [cb], pri: 0 });
  void W;
}
/** A kept path's points with this leg's own ends (the cells are shared; the exact stand points are not). */
function _vfpEnds(pts, a, b) { const out = pts.slice(); if (out.length) { out[out.length - 1] = { x: b.x, y: b.y }; } else out.push({ x: b.x, y: b.y }); return out; }
function _vfpStart(job) {
  const W = GARDEN_WORLD, C = W.cols, P = _vfpPool(), s = _vfpNearOpen(job.a.x, job.a.y), g = _vfpNearOpen(job.b.x, job.b.y);
  P.run++; if (P.run > 4e9) { P.run = 1; P.stamp.fill(0); P.closed.fill(0); }
  job.s = s; job.goal = g; job.hn = 0; job.done = s < 0 || g < 0; job.found = -1;
  if (job.done) return;
  const gx = g % C, gy = (g - gx) / C;
  job.h = (i) => { const x = i % C, y = (i - x) / C; return Math.hypot((x - gx) * W.cellW, (y - gy) * W.cellH) / 48; };
  P.stamp[s] = P.run; P.g[s] = 0; P.came[s] = -1; P.f[s] = job.h(s); job.hn = 0; _vfpPush(P, job, s);
}
function _vfpPush(P, job, i) { let k = job.hn++; P.heap[k] = i; while (k > 0) { const p = (k - 1) >> 1; if (P.f[P.heap[p]] <= P.f[P.heap[k]]) break; const t = P.heap[p]; P.heap[p] = P.heap[k]; P.heap[k] = t; k = p; } }
function _vfpPop(P, job) { const top = P.heap[0], last = P.heap[--job.hn]; if (job.hn > 0) { P.heap[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < job.hn && P.f[P.heap[l]] < P.f[P.heap[m]]) m = l; if (r < job.hn && P.f[P.heap[r]] < P.f[P.heap[m]]) m = r; if (m === k) break; const t = P.heap[m]; P.heap[m] = P.heap[k]; P.heap[k] = t; k = m; } } return top; }
/** Up to n cells of the current search. True when it is finished (found, or nothing more to try). */
function _vfpStep(job, n) {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows, P = _vfpPool(), cost = _vfp.cost;
  let k = 0;
  while (job.hn > 0 && k++ < n) {
    const cur = _vfpPop(P, job);
    if (P.closed[cur] === P.run) continue; P.closed[cur] = P.run;
    if (cur === job.goal) { job.found = cur; return true; }
    const cx = cur % C, cy = (cur - cx) / C;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
      const ni = ny * C + nx, c = cost[ni]; if (c === Infinity || P.closed[ni] === P.run) continue;
      if (dx && dy && (cost[cy * C + nx] === Infinity || cost[ny * C + cx] === Infinity)) continue;   // no corner cutting
      const step = Math.hypot(dx * W.cellW, dy * W.cellH) / 48 * (c + cost[cur]) / 2, ng = P.g[cur] + step;
      if (P.stamp[ni] !== P.run || ng < P.g[ni]) { P.stamp[ni] = P.run; P.g[ni] = ng; P.came[ni] = cur; P.f[ni] = ng + job.h(ni); _vfpPush(P, job, ni); }
    }
  }
  _vfp.stats.cells += k;
  return job.hn <= 0;
}
/** Cells to points, string-pulled within the dearer end's tier so a lane keeps to the lane, then a light corner rounding. */
function _vfpPoints(job) {
  const W = GARDEN_WORLD, C = W.cols, P = _vfpPool(), cells = [];
  for (let i = job.found; i >= 0; i = P.came[i]) { cells.push(i); if (i === job.s) break; }
  cells.reverse();
  const pt = (i) => ({ x: (i % C) + 0.5, y: Math.floor(i / C) + 0.5 });
  const clear = (a, b, tmax) => {
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 3));
    for (let i = 1; i < n; i++) { const t = i / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t; if (gardenFolkTier(x, y) > tmax) return false; if (typeof _gwFree === 'function' && !_gwFree(x, y)) return false; }
    return true;
  };
  // a pulled line may only cross ground as dear as the cells the search itself went over between its ends: a route that kept to the
  // lane is never straightened across the grass beside it (the old rule allowed the dearer END's tier, so a leg from the plaza to a well
  // on the lawn went straight across the lawn: the owner's "weird paths")
  const raw = cells.map(pt), out = []; let at = { x: job.a.x, y: job.a.y }, i = 0;
  const clearUpTo = (a, k0, k1) => { let tm = 0; for (let k = k0; k <= k1; k++) { const tt = gardenFolkTier(raw[k].x, raw[k].y); if (tt > tm) tm = tt; } return clear(a, raw[k1], tm); };
  while (i < raw.length) { let j = Math.min(raw.length - 1, i + 24); while (j > i && !clearUpTo(at, i, j)) j--; out.push(raw[j]); at = raw[j]; i = j + 1; }
  // round the corners a little: a turn is taken as an arc, not a pivot
  const sm = [];
  for (let k = 0; k < out.length; k++) {
    const p = out[k], a = out[k - 1], b = out[k + 1];
    if (a && b) { const q1 = { x: p.x + (a.x - p.x) * 0.22, y: p.y + (a.y - p.y) * 0.22 }, q2 = { x: p.x + (b.x - p.x) * 0.22, y: p.y + (b.y - p.y) * 0.22 }; if ((typeof _gwFree !== 'function' || (_gwFree(q1.x, q1.y) && _gwFree(q2.x, q2.y)))) { sm.push(q1, q2); continue; } }
    sm.push(p);
  }
  if (sm.length) sm[sm.length - 1] = { x: job.b.x, y: job.b.y }; else sm.push({ x: job.b.x, y: job.b.y });
  return sm;
}
function gardenFolkPathPump(ms) {
  if (!_vfp.cost || _vfp.key !== _vfpGridKey()) { _vfpBuildSlice(); return; }
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    if (!_vfp.cur) { _vfp.cur = _vfp.jobs.sort((a, b) => b.pri - a.pri).shift() || null; if (!_vfp.cur) return; _vfpStart(_vfp.cur); }
    const job = _vfp.cur, s0 = performance.now();
    const fin = job.done || _vfpStep(job, VFP_SLICE);
    const sl = performance.now() - s0; _vfp.stats.slices++; if (sl > _vfp.stats.maxSlice) _vfp.stats.maxSlice = sl;
    if (!fin) continue;
    _vfp.cur = null;
    const pts = job.found >= 0 ? _vfpPoints(job) : null;
    _vfp.cache.set(_vfp.key + '|' + job.key, pts);
    if (_vfp.cache.size > VFP_CACHE) _vfp.cache.delete(_vfp.cache.keys().next().value);
    _vfp.stats.found++;
    for (const cb of job.cbs) { try { cb(pts ? _vfpEnds(pts, job.a, job.b) : null); } catch (e) { console.error('[folk path]', e); } }
  }
  _vfp.stats.ms += performance.now() - t0;
}
/** For the audit and the collision view: how the paths are doing. */
function gardenFolkPathStats() { return Object.assign({ waiting: _vfp.jobs.length + (_vfp.cur ? 1 : 0), kept: _vfp.cache.size, field: !!_vfp.cost }, _vfp.stats); }

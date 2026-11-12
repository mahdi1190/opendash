/* Pond and pool contours are shared game geometry. Tables and the displayed
 * water-cell predicates are read directly; no renderer or model is created. */
const _gardenOtherWaters = (function () {
  'use strict';
  const resident = { key: null, source: null, bundle: null }, variants = new Map(), detached = new Map();
  function setKey(set) {
    if (!set) return '0'; let sum = 0, xor = 0;
    for (const value of set) { const text = String(value); let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); sum = sum + h >>> 0; xor ^= h; }
    return set.size + ':' + sum + ':' + (xor >>> 0);
  }
  function area(points) { let value = 0; for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; value += a.x * b.y - b.x * a.y; } return value / 2; }
  function inside(x, y, points) { let on = false; for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const a = points[i], b = points[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) on = !on; } return on; }
  function bounds(points) { let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity; for (const p of points) { x = Math.min(x, p.x); y = Math.min(y, p.y); right = Math.max(right, p.x); bottom = Math.max(bottom, p.y); } return { x, y, width: right - x, height: bottom - y }; }
  function contour(points) {
    const rounded = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i], a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length], da = Math.hypot(a.x - p.x, a.y - p.y), db = Math.hypot(b.x - p.x, b.y - p.y), radius = Math.min(25, da * .4, db * .4);
      const from = { x: p.x + (a.x - p.x) * radius / da, y: p.y + (a.y - p.y) * radius / da }, to = { x: p.x + (b.x - p.x) * radius / db, y: p.y + (b.y - p.y) * radius / db };
      for (let step = 0; step <= 4; step++) { const t = step / 4, u = 1 - t; rounded.push({ x: u * u * from.x + 2 * u * t * p.x + t * t * to.x, y: u * u * from.y + 2 * u * t * p.y + t * t * to.y }); }
    }
    const sampled = [];
    for (let i = 0; i < rounded.length; i++) { const a = rounded[i], b = rounded[(i + 1) % rounded.length], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 25)); for (let j = 0; j < steps; j++) { const t = j / steps; sampled.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); } }
    return sampled.map((p, i) => {
      const a = sampled[(i + sampled.length - 1) % sampled.length], b = sampled[(i + 1) % sampled.length], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
      const wave = .5 + .29 * Math.sin(p.x * .017 + p.y * .013) + .15 * Math.cos(p.x * .038 - p.y * .021), reach = Math.min(15, 10 / Math.max(.7, Math.abs(dx) / length)), inset = 1.5 + Math.max(0, wave) * reach;
      return { x: p.x - dy / length * inset, y: p.y + dx / length * inset };
    });
  }
  // Only complete compact pools get a broader, asymmetric shore. Every
  // wet-cell centre remains water; cut-outs and channels use contour().
  // This runs only when the existing bitmap/signature cache is rebuilt.
  function compactPond(points, bitmap) {
    if (points.length !== 4 || area(points) <= 0) return null;
    const W = GARDEN_WORLD, box = bounds(points), x0 = box.x / W.cellW, y0 = (box.y - W.sky) / W.cellH, cols = box.width / W.cellW, rows = box.height / W.cellH;
    if (![x0, y0, cols, rows].every(Number.isInteger) || cols < 2 || rows < 2 || cols > 8 || rows > 8 || cols * rows < 8 || Math.max(cols, rows) / Math.min(cols, rows) > 3.5) return null;
    if (points.some(p => (p.x !== box.x && p.x !== box.x + box.width) || (p.y !== box.y && p.y !== box.y + box.height))) return null;
    // A rectangular outside loop can still surround an island or a bridge.
    // Check the actual wet mask before changing any part of its outline.
    for (let y = y0; y < y0 + rows; y++) for (let x = x0; x < x0 + cols; x++) if (!bitmap[y * W.cols + x]) return null;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2, rx = box.width / 2 - Math.min(5, W.cellW * .08), ry = box.height / 2 - Math.min(5, W.cellH * .08);
    // The two shore waves shrink by at most .07. Choose the softest curve
    // that contains even the corner cell centres under that full shrink.
    const nx = (box.width / 2 - W.cellW / 2) / (rx * .93), ny = (box.height / 2 - W.cellH / 2) / (ry * .93);
    let power = 2.6;
    while (power < 8 && nx ** power + ny ** power > .94) power = Math.min(8, power + .4);
    if (nx ** power + ny ** power > .94) return null;
    const phase = (x0 * .73 + y0 * 1.17 + cols * .37 + rows * .61) % (Math.PI * 2), steps = Math.max(48, Math.min(96, Math.ceil((box.width + box.height) / 32) * 4)), result = [];
    for (let i = 0; i < steps; i++) {
      const angle = i * Math.PI * 2 / steps, c = Math.cos(angle), s = Math.sin(angle), radial = (Math.abs(c) ** power + Math.abs(s) ** power) ** (-1 / power);
      const shore = 1 - .044 * (1 + Math.sin(angle + phase)) / 2 - .026 * (1 + Math.sin(angle * 3 - phase * .7)) / 2;
      result.push({ x: cx + c * rx * radial * shore, y: cy + s * ry * radial * shore });
    }
    // Chords are contained by the wet rectangle. Keep the original contour
    // if numerical sampling could lose any authoritative wet-cell centre.
    if (result.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < box.x || p.y < box.y || p.x > box.x + box.width || p.y > box.y + box.height) || area(result) <= 0) return null;
    for (let y = y0; y < y0 + rows; y++) for (let x = x0; x < x0 + cols; x++) if (!inside((x + .5) * W.cellW, W.sky + (y + .5) * W.cellH, result)) return null;
    return result;
  }
  function loopsOf(bitmap) {
    const W = GARDEN_WORLD, edges = new Map(), at = (x, y) => x >= 0 && y >= 0 && x < W.cols && y < W.rows && bitmap[y * W.cols + x];
    const add = (x, y, xx, yy) => { const key = x + ',' + y; let list = edges.get(key); if (!list) edges.set(key, list = []); list.push([xx, yy]); };
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) if (at(x, y)) { if (!at(x, y - 1)) add(x, y, x + 1, y); if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1); if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1); if (!at(x - 1, y)) add(x, y + 1, x, y); }
    const loops = [];
    while (edges.size) {
      const start = edges.keys().next().value; let key = start, points = [], guard = bitmap.length * 8;
      do { const p = key.split(',').map(Number); points.push({ x: p[0] * W.cellW, y: W.sky + p[1] * W.cellH }); const list = edges.get(key); if (!list || !list.length) break; const next = list.pop(); if (!list.length) edges.delete(key); key = next.join(','); } while (key !== start && guard-- > 0);
      if (points.length < 3) continue;
      points = points.filter((p, i, all) => { const a = all[(i + all.length - 1) % all.length], b = all[(i + 1) % all.length]; return (p.x - a.x) * (b.y - p.y) !== (p.y - a.y) * (b.x - p.x); });
      if (points.length >= 3) loops.push(compactPond(points, bitmap) || contour(points));
    }
    return loops;
  }
  function detachedWalk(model, options) {
    const moves = new Map((model && model.dz && model.dz.m || []).map(row => [row[0], row])), cells = new Set();
    for (const row of [...options.walkCells || [], ...options.iceCells || []]) cells.add(Array.isArray(row) ? row[0] + ',' + row[1] : String(row));
    const works = new Set(options.workIds || []);
    for (const prop of GARDEN_PROPS) {
      if (!prop.walk || prop.needs && !works.has(prop.needs)) continue;
      const base = typeof gardenDesignBase === 'function' ? gardenDesignBase(prop.id) : null, move = moves.get(prop.id), x = move ? move[1] : base ? base.x : prop.x, y = move ? move[2] : base ? base.y : prop.y;
      for (let yy = Math.floor(y); yy < y + prop.h; yy++) for (let xx = Math.floor(x); xx < x + prop.w; xx++) cells.add(xx + ',' + yy);
    }
    return cells;
  }
  function build(bitmap, signature) {
    const W = GARDEN_WORLD, stage = loopsOf(bitmap), holes = stage.filter(loop => area(loop) <= 0), shapes = [];
    if (W.v >= 4) {
      // Paint and foot probes share the authored smooth shore. Boards and ice
      // keep their independent walk cover; enclosed dry islands retain holes.
      const basins = gardenIslandData().freshwater.filter(basin => Array.isArray(basin.boundary));
      if (basins.length) {
        stage.splice(0, stage.length, ...basins.map(basin => {
          const ring = basin.boundary.map(p => ({ x: p[0] * W.cellW, y: W.sky + p[1] * W.cellH }));
          return area(ring) < 0 ? ring.reverse() : ring;
        }), ...holes);
      }
    }
    for (const outer of stage.filter(loop => area(loop) > 0)) {
      const points = outer.map(p => ({ x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH })), inner = holes.filter(hole => inside(hole[0].x, hole[0].y, outer)).map(loop => loop.map(p => ({ x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH }))), box = bounds(points);
      const shape = { id: 'other-water:' + Math.floor(box.x) + ':' + Math.floor(box.y), points, holes: inner, bounds: box, areas: [] };
      shape.contains = (x, y) => Number.isFinite(x) && Number.isFinite(y) && x >= box.x && y >= box.y && x <= box.x + box.width && y <= box.y + box.height && inside(x, y, points) && !inner.some(hole => inside(x, y, hole));
      const ids = new Set();
      for (let y = Math.max(0, Math.floor(box.y)); y < Math.min(W.rows, Math.ceil(box.y + box.height)); y++) for (let x = Math.max(0, Math.floor(box.x)); x < Math.min(W.cols, Math.ceil(box.x + box.width)); x++) if (bitmap[y * W.cols + x] && shape.contains(x + .5, y + .5)) {
        const land = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null; if (land) { ids.add(land.id); if (land.fam) ids.add(land.fam); }
        for (const area of GARDEN_AREAS) { const water = area.water; if (water && x >= water.x && y >= water.y && x < water.x + water.w && y < water.y + water.h) ids.add(area.id); }
        const region = typeof _grgWaterOfCell === 'function' ? _grgWaterOfCell(x, y) : null; if (region) ids.add(region.id);
      }
      shape.areas = [...ids].sort(); shape.area = shape.areas.includes('pond') ? 'pond' : shape.areas[0] || ''; shapes.push(shape);
    }
    return { shapes, loops: stage, signature };
  }
  function bundle(model, options) {
    options = options || {}; const W = GARDEN_WORLD, isDetached = !!options.detached, visit = typeof _gdv !== 'undefined' && _gdv.on;
    const source = visit ? _gdv.clean : typeof state !== 'undefined' && state ? state.garden : null;
    const key = isDetached ? JSON.stringify([model && model.dz || null, options.workIds || [], options.walkCells || [], options.iceCells || []]) : [visit ? _gdv.fid + ':' + _gdv.rev : 'home', typeof _gd !== 'undefined' ? _gd.rev : 0, typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0, setKey(typeof _GD_WORKS === 'undefined' ? null : _GD_WORKS), setKey(typeof _GD_WALK_EXTRA === 'undefined' ? null : _GD_WALK_EXTRA), setKey(typeof _GD_ICE === 'undefined' ? null : _GD_ICE)].join('|');
    if (!isDetached && resident.bundle && resident.key === key && resident.source === source) return resident.bundle;
    if (isDetached && detached.has(key)) return detached.get(key);
    const bitmap = new Uint8Array(W.cols * W.rows), walk = isDetached ? detachedWalk(model, options) : null, island = typeof gardenIslandActive === 'function' && gardenIslandActive(); let signature = '';
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
      const land = typeof gardenLandWaterAt === 'function' ? gardenLandWaterAt(x, y) : null;
      if (island ? gardenIslandOceanCell(x, y) : x >= 12 && x < 40 && y >= 21 && y < 38 && land === null) continue;
      const wet = isDetached ? (land === null ? GARDEN_AREAS.some(area => { const water = area.water; return water && x >= water.x && y >= water.y && x < water.x + water.w && y < water.y + water.h; }) : land) && !walk.has(x + ',' + y) : gardenIsWater(x, y);
      if (wet) { const index = y * W.cols + x; bitmap[index] = 1; signature += index + ','; }
    }
    let result = resident.bundle && resident.bundle.signature === signature ? resident.bundle : variants.get(signature); if (!result) { result = build(bitmap, signature); variants.set(signature, result); if (variants.size > 12) variants.delete(variants.keys().next().value); }
    if (isDetached) { detached.set(key, result); if (detached.size > 12) detached.delete(detached.keys().next().value); }
    else Object.assign(resident, { key, source, bundle: result });
    return result;
  }
  /** While the garden is out of sight (inside a room), measure its other waters
   * again in short slices after a save, so coming back out finds them ready
   * instead of scanning every cell in one long task. */
  let warm = null;
  function homeKey() { return ['home', typeof _gd !== 'undefined' ? _gd.rev : 0, typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0, setKey(typeof _GD_WORKS === 'undefined' ? null : _GD_WORKS), setKey(typeof _GD_WALK_EXTRA === 'undefined' ? null : _GD_WALK_EXTRA), setKey(typeof _GD_ICE === 'undefined' ? null : _GD_ICE)].join('|'); }
  function prepare() {
    if (typeof _gdv !== 'undefined' && _gdv.on) return;
    const source = typeof state !== 'undefined' && state ? state.garden : null, key = homeKey();
    if (resident.bundle && resident.key === key && resident.source === source || warm && warm.key === key && warm.source === source) return;
    const W = GARDEN_WORLD, job = warm = { key, source, y: 0, bitmap: new Uint8Array(W.cols * W.rows), signature: '', island: typeof gardenIslandActive === 'function' && gardenIslandActive() };
    const step = () => {
      if (warm !== job) return;
      if (homeKey() !== job.key || (typeof state !== 'undefined' && state ? state.garden : null) !== job.source) { warm = null; return; }
      const until = performance.now() + 5;
      for (; job.y < W.rows; job.y++) {
        if (performance.now() > until) { setTimeout(step, 0); return; }
        const y = job.y;
        for (let x = 0; x < W.cols; x++) {
          const land = typeof gardenLandWaterAt === 'function' ? gardenLandWaterAt(x, y) : null;
          if (job.island ? gardenIslandOceanCell(x, y) : x >= 12 && x < 40 && y >= 21 && y < 38 && land === null) continue;
          if (gardenIsWater(x, y)) { const index = y * W.cols + x; job.bitmap[index] = 1; job.signature += index + ','; }
        }
      }
      warm = null;
      let result = resident.bundle && resident.bundle.signature === job.signature ? resident.bundle : variants.get(job.signature);
      if (!result) { result = build(job.bitmap, job.signature); variants.set(job.signature, result); if (variants.size > 12) variants.delete(variants.keys().next().value); }
      Object.assign(resident, { key: job.key, source: job.source, bundle: result });
    };
    setTimeout(step, 0);
  }
  return { shapes: (model, options) => bundle(model, options).shapes, loops: (model, options) => bundle(model, options).loops, prepare };
})();
function gardenOtherWaterShapes(model, options) { return _gardenOtherWaters.shapes(model, options); }
function gardenOtherWaterLoops(model, options) { return _gardenOtherWaters.loops(model, options); }
function gardenOtherWaterContains(x, y) { return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < GARDEN_WORLD.cols && y < GARDEN_WORLD.rows && gardenOtherWaterShapes().some(shape => (typeof gardenShorePrepared === 'function' ? gardenShorePrepared(shape) : shape).contains(x, y)); }

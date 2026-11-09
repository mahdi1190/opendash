/* One physical lake for the picture, feet and fishing. Saved coordinates stay
 * where they are: occupied old-water footprints extend attached shore coves.
 * Everything here is derived, read-only game data; it never builds a model. */
const _gardenLakeShape = { key: '', signature: '', baseSignature: '', base: null, model: null, source: null, context: null, value: null, serial: 0 };
const _gardenLakeSceneShapes = new Map();
const _gardenShoreEdges = new WeakMap();
/** Prepared, renderer-independent contour queries. Edge buckets contain only
 * the segments crossing a cell, so a foot never scans the whole lake. */
function gardenShorePrepared(shape) {
  let prepared = _gardenShoreEdges.get(shape); if (prepared) return prepared;
  const cells = new Map(), edges = [];
  for (const points of [shape.points, ...(shape.holes || [])]) for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], edge = { ax: a.x, ay: a.y, bx: b.x, by: b.y };
    const index = edges.push(edge) - 1;
    for (let y = Math.floor(Math.min(a.y, b.y)); y <= Math.floor(Math.max(a.y, b.y)); y++) for (let x = Math.floor(Math.min(a.x, b.x)); x <= Math.floor(Math.max(a.x, b.x)); x++) { const key = x + ',' + y; let list = cells.get(key); if (!list) { list = []; cells.set(key, list); } list.push(index); }
  }
  const W = GARDEN_WORLD, reference = new Uint8Array(W.cols * W.rows), bounds = shape.bounds;
  for (let y = Math.max(0, Math.floor(bounds.y)); y <= Math.min(W.rows - 1, Math.floor(bounds.y + bounds.height)); y++) for (let x = Math.max(0, Math.floor(bounds.x)); x <= Math.min(W.cols - 1, Math.floor(bounds.x + bounds.width)); x++) reference[y * W.cols + x] = shape.contains(x + .500000123, y + .500000321) ? 1 : 0;
  const contains = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < bounds.x || y < bounds.y || x > bounds.x + bounds.width || y > bounds.y + bounds.height) return false;
    const cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) return shape.contains(x, y);
    let inside = !!reference[cy * W.cols + cx]; const list = cells.get(cx + ',' + cy); if (!list) return inside;
    const sx = cx + .500000123, sy = cy + .500000321, dx = x - sx, dy = y - sy, length = dx * dx + dy * dy; if (length < 1e-20) return inside;
    // Only crossings between this cell's cached reference point and the query
    // can change parity. Vertex crossings use the same half-open rule as a ray.
    for (const index of list) { const e = edges[index], ax = e.ax - sx, ay = e.ay - sy, bx = e.bx - sx, by = e.by - sy, a = dx * ay - dy * ax, b = dx * by - dy * bx; if ((a > 0) === (b > 0)) continue; const u = a / (a - b), t = ((ax + (bx - ax) * u) * dx + (ay + (by - ay) * u) * dy) / length; if (t > 0 && t <= 1) inside = !inside; }
    return inside;
  };
  prepared = { shape, cells, edges, contains }; _gardenShoreEdges.set(shape, prepared); return prepared;
}
function _gardenShoreSegment(edge, cx, cy, x, y, rx, ry, out) {
  // Clip the edge to this uncovered cell before measuring in elliptical-foot
  // space. Pier/ice/island cells remain independent walkable overlays.
  let lo = 0, hi = 1; const dx = edge.bx - edge.ax, dy = edge.by - edge.ay;
  if (Math.abs(dx) < 1e-12) { if (edge.ax < cx || edge.ax > cx + 1) return false; }
  else { const a = (cx - edge.ax) / dx, b = (cx + 1 - edge.ax) / dx; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); }
  if (Math.abs(dy) < 1e-12) { if (edge.ay < cy || edge.ay > cy + 1) return false; }
  else { const a = (cy - edge.ay) / dy, b = (cy + 1 - edge.ay) / dy; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); }
  if (lo > hi) return false;
  const ax = (edge.ax + dx * lo - x) / rx, ay = (edge.ay + dy * lo - y) / ry, vx = dx * (hi - lo) / rx, vy = dy * (hi - lo) / ry;
  const t = Math.max(0, Math.min(1, -(ax * vx + ay * vy) / (vx * vx + vy * vy || 1))), px = ax + vx * t, py = ay + vy * t, distance = px * px + py * py;
  if (distance < out.distance) { out.distance = distance; out.qx = x + px * rx; out.qy = y + py * ry; out.edge = edge; }
  return distance < 1 - 1e-8;
}
/** Exact lake/ellipse clearance, in cells. `inside` keeps boats in liquid;
 * cover is a cached cell mask for piers, ice and existing island/path rules.
 * The outward normal is in stage pixels, ready for tangential sliding. */
function gardenShoreFootProbe(shape, x, y, rx, ry, inside, cover, out) {
  out = out || {}; out.free = true; out.distance = Infinity; out.nx = out.ny = 0; out.side = 1; out.edge = null;
  const W = GARDEN_WORLD, prepared = gardenShorePrepared(shape); rx = Math.max(.001, rx); ry = Math.max(.001, ry);
  const bounds = shape.bounds; if (bounds && (x + rx < bounds.x || x - rx > bounds.x + bounds.width || y + ry < bounds.y || y - ry > bounds.y + bounds.height)) { out.free = !inside; return out; }
  for (let cy = Math.floor(y - ry); cy <= Math.floor(y + ry); cy++) for (let cx = Math.floor(x - rx); cx <= Math.floor(x + rx); cx++) {
    const qx = Math.max(cx + 1e-8, Math.min(cx + 1 - 1e-8, x)), qy = Math.max(cy + 1e-8, Math.min(cy + 1 - 1e-8, y)), d = ((qx - x) / rx) ** 2 + ((qy - y) / ry) ** 2;
    if (d >= 1) continue;
    const covered = cover ? !!cover[cy * W.cols + cx] : gardenPropWalk(cx, cy);
    if (covered) { if (inside) out.free = false; continue; }
    if (!!prepared.contains(qx, qy) !== !!inside) out.free = false;
    const list = prepared.cells.get(cx + ',' + cy); if (!list) continue;
    for (const index of list) if (_gardenShoreSegment(prepared.edges[index], cx, cy, x, y, rx, ry, out)) out.free = false;
  }
  if (out.edge) {
    let nx = x - out.qx, ny = y - out.qy;
    if (Math.abs(nx) + Math.abs(ny) < 1e-10) { nx = out.edge.by - out.edge.ay; ny = out.edge.ax - out.edge.bx; }
    const contains = prepared.contains(x, y); out.side = contains === !!inside ? 1 : -1; if (out.side < 0) { nx = -nx; ny = -ny; }
    nx /= rx * rx * W.cellW; ny /= ry * ry * W.cellH; const n = Math.hypot(nx, ny) || 1; out.nx = nx / n; out.ny = ny / n;
  }
  return out;
}
function gardenWaterFootProbe(x, y, rx, ry, inside, out) {
  const shape = _gardenLakeShape.value || gardenLakeGeometry(), grid = typeof _gw !== 'undefined' && _gw.grid;
  return gardenShoreFootProbe(shape, x, y, rx, ry, inside, grid && grid.shore === shape ? grid.waterCover : null, out);
}
function _gardenLakeContext() {
  const visit = typeof _gdv !== 'undefined' && _gdv.on, source = visit ? _gdv.clean : typeof state !== 'undefined' && state ? state.garden : null;
  const rev = typeof _gd !== 'undefined' ? _gd.rev : 0, designRev = typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0, visitRev = visit ? _gdv.rev : 0, fid = visit ? _gdv.fid : '', fishing = typeof _gw !== 'undefined' && _gw.fishing, activeLine = !!(fishing && fishing.state !== 'idle' && fishing.state !== 'land'), schoolAt = typeof _gfs !== 'undefined' ? _gfs.last : 0, hostAt = typeof _gfs !== 'undefined' ? _gfs.hostAt : 0, previous = _gardenLakeShape.context;
  if (previous && previous.source === source && previous.visit === visit && previous.rev === rev && previous.designRev === designRev && previous.visitRev === visitRev && previous.fid === fid && previous.fishing === fishing && previous.activeLine === activeLine && previous.schoolAt === schoolAt && previous.hostAt === hostAt) return previous;
  const lines = [], seen = new Set(), line = (x, y) => { if (!Number.isFinite(x) || !Number.isFinite(y) || x < 12 || x >= 40 || y < 21 || y >= 38) return; const id = x + ',' + y; if (!seen.has(id)) { seen.add(id); lines.push({ x, y }); } };
  // A line already out when the engine changes, or from an older host, keeps
  // its water. New casts inside the outline do not change the shore at all.
  if (activeLine) line(fishing.bx, fishing.by);
  if (typeof _gfs !== 'undefined') for (const fish of _gfs.list.values()) if (fish.to != null && fish.st >= 1 && fish.st <= 4) line(fish.tx, fish.ty);
  lines.sort((a, b) => a.x - b.x || a.y - b.y);
  const key = (visit ? 'visit:' + fid + ':' + visitRev : 'home') + ':' + rev + ':' + designRev + ':lines:' + lines.map(p => p.x + ',' + p.y).join(';');
  return _gardenLakeShape.context = { visit, source, key, lines, rev, designRev, visitRev, fid, fishing, activeLine, schoolAt, hostAt };
}
function _gardenLakeGuards(model, context) {
  const out = [], seen = new Set();
  const add = (x, y, w, h, pad) => {
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0 || x >= 40 || y >= 38 || x + w <= 12 || y + h <= 21) return;
    const p = pad == null ? .14 : pad, box = { x0: Math.max(12, x - p), y0: Math.max(21, y - p), x1: Math.min(40, x + w + p), y1: Math.min(38, y + h + p) }, key = [box.x0, box.y0, box.x1, box.y1].map(n => n.toFixed(3)).join(',');
    if (!seen.has(key)) { seen.add(key); out.push(box); }
  };
  const plant = row => { const array = Array.isArray(row), def = array ? gardenPlant(row[0]) : row.def || gardenPlant(row.p || row.id); if (def) add(array ? row[1] : row.x, array ? row[2] : row.y, def.fp || 1, def.fp || 1); };
  const decor = row => { const array = Array.isArray(row), def = array ? gardenDecor(row[0]) : row.def || gardenDecor(row.d || row.id); if (def) add(array ? row[1] : row.x, array ? row[2] : row.y, def.w || 1, def.h || 1); };
  if (model) { for (const row of model.plants || []) plant(row); for (const row of model.decor || []) decor(row); }
  else if (context.visit) {
    const current = _gdv.memo || context.source;
    for (const row of current && current.plants || []) plant(row);
    for (const row of current && current.decor || []) decor(row);
  } else {
    for (const row of Object.values(context.source && context.source.plants || {})) if (row) plant(row);
    for (const row of Object.values(context.source && context.source.decor || {})) if (row) decor(row);
  }
  // Current prop rows already carry the displayed home/visit design. Read
  // them directly, avoiding gardenPropsNow -> land/model lookup recursion.
  for (const prop of GARDEN_PROPS) add(prop.x, prop.y, prop.w || 1, prop.h || 1, .18);
  if (typeof GARDEN_SPOTS !== 'undefined') for (const spot of GARDEN_SPOTS) { const rx = Math.min(1.25, spot.r * .7), ry = Math.min(.8, spot.r * .42); add(spot.x - rx, spot.y - ry, rx * 2, ry * 2, .08); }
  // The boarding point remains water even when the boat sits in a new cove.
  if (typeof GARDEN_CATCH_CELLS !== 'undefined') { const p = GARDEN_CATCH_CELLS.boatIn; add(p.x - .25, p.y - .25, .5, .5, .12); }
  out.sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0 || a.x1 - b.x1 || a.y1 - b.y1); return out;
}
function _gardenLakeBuild(guards) {
  const cx = 25.8, cy = 29.15, count = 240, tau = Math.PI * 2, angles = [], radii = [], limits = [];
  const angleDistance = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const rayBox = (dx, dy, box) => {
    let enter = -Infinity, leave = Infinity;
    for (const [v, lo, hi] of [[dx, box.x0 - cx, box.x1 - cx], [dy, box.y0 - cy, box.y1 - cy]]) {
      if (Math.abs(v) < 1e-10) { if (lo > 0 || hi < 0) return 0; continue; }
      const a = lo / v, b = hi / v; enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
    }
    return leave > Math.max(0, enter) ? leave : 0;
  };
  // Include protected corners as knots, so a saved footprint can never be
  // shaved off between regular samples at a very shallow shoreline angle.
  for (let i = 0; i < count; i++) angles.push(i / count * tau);
  for (const box of guards) for (const x of [box.x0, box.x1]) for (const y of [box.y0, box.y1]) angles.push((Math.atan2(y - cy, x - cx) + tau) % tau);
  angles.sort((a, b) => a - b);
  for (let i = angles.length - 1; i > 0; i--) if (angles[i] - angles[i - 1] < 1e-7) angles.splice(i, 1);
  const boundary = { x0: 12, y0: 21, x1: 40, y1: 38 };
  for (const angle of angles) {
    const dx = Math.cos(angle), dy = Math.sin(angle), limit = rayBox(dx, dy, boundary), west = angleDistance(angle, 3.65), east = angleDistance(angle, .12);
    const shape = 1 + Math.sin(angle * 3 + .6) * .052 + Math.cos(angle * 5 - .4) * .032 - Math.exp(-west * west / .07) * .12 - Math.exp(-east * east / .065) * .105;
    let radius = shape / Math.hypot(dx / 13.2, dy / 8.25);
    for (const guard of guards) radius = Math.max(radius, rayBox(dx, dy, guard) + .035);
    radii.push(Math.min(limit, radius)); limits.push(limit);
  }
  // A smooth upper envelope rounds preservation lobes without ever shrinking
  // their protected water. Angular neighbourhoods are bounded, cached work.
  const grown = radii.slice();
  for (let i = 0; i < angles.length; i++) for (let step = 1; step <= 14; step++) for (const sign of [-1, 1]) {
    const j = (i + sign * step + angles.length) % angles.length, d = Math.abs(angleDistance(angles[i], angles[j])); if (d > .17) continue;
    grown[i] = Math.max(grown[i], Math.min(limits[i], radii[j] - (d / .17) ** 2 * 3.2));
  }
  const points = angles.map((a, i) => ({ x: cx + Math.cos(a) * grown[i], y: cy + Math.sin(a) * grown[i] })), cells = new Uint8Array(GARDEN_WORLD.cols * GARDEN_WORLD.rows);
  const contains = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 12 || x >= 40 || y < 21 || y >= 38) return false;
    const dx = x - cx, dy = y - cy; if (Math.abs(dx) + Math.abs(dy) < 1e-9) return true;
    const angle = (Math.atan2(dy, dx) + tau) % tau; let lo = 0, hi = angles.length;
    while (lo < hi) { const mid = lo + hi >> 1; if (angles[mid] <= angle) lo = mid + 1; else hi = mid; }
    const a = points[(lo - 1 + points.length) % points.length], b = points[lo % points.length], ax = a.x - cx, ay = a.y - cy, bx = b.x - cx, by = b.y - cy;
    return ax * by - ay * bx + 1e-8 >= dx * (by - ay) - dy * (bx - ax);
  };
  for (let y = 21; y < 38; y++) for (let x = 12; x < 40; x++) cells[y * GARDEN_WORLD.cols + x] = contains(x + .5, y + .5) ? 1 : 0;
  return { revision: ++_gardenLakeShape.serial, points, holes: [], bounds: { x: Math.min(...points.map(p => p.x)), y: Math.min(...points.map(p => p.y)), width: Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)), height: Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)) }, contains, cellContains: (x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 12 && x < 40 && y >= 21 && y < 38 && !!cells[y * GARDEN_WORLD.cols + x]; } };
}
/** Grid coordinates. Pass an existing model when drawing; predicates use the
 * same resident result. Never call gardenHere/gardenModel from this path. */
function gardenLakeGeometry(model, options) {
  if (gardenIslandActive()) return gardenIslandOceanGeometry();
  const context = _gardenLakeContext(), cache = _gardenLakeShape;
  if (options && options.detached) {
    const guards = _gardenLakeGuards(model, context), signature = guards.map(b => [b.x0, b.y0, b.x1, b.y1].join(',')).join(';'); let value = _gardenLakeSceneShapes.get(signature);
    if (!value) { value = _gardenLakeBuild(guards); _gardenLakeSceneShapes.set(signature, value); if (_gardenLakeSceneShapes.size > 8) _gardenLakeSceneShapes.delete(_gardenLakeSceneShapes.keys().next().value); } return value;
  }
  if (cache.value && cache.key === context.key && cache.source === context.source && (!model || model === cache.model)) return cache.value;
  const guards = _gardenLakeGuards(model, context), baseSignature = guards.map(b => [b.x0, b.y0, b.x1, b.y1].join(',')).join(';');
  if (!cache.base || cache.baseSignature !== baseSignature) { cache.base = _gardenLakeBuild(guards); cache.baseSignature = baseSignature; }
  for (const p of context.lines) if (!cache.base.contains(p.x, p.y)) guards.push({ x0: Math.max(12, p.x - .8), y0: Math.max(21, p.y - .8), x1: Math.min(40, p.x + .8), y1: Math.min(38, p.y + .8) });
  const signature = guards.map(b => [b.x0, b.y0, b.x1, b.y1].join(',')).join(';');
  if (!cache.value || cache.signature !== signature) { cache.value = signature === baseSignature ? { ...cache.base, revision: ++cache.serial } : _gardenLakeBuild(guards); cache.signature = signature; }
  cache.key = context.key; cache.source = context.source; cache.model = model || null; return cache.value;
}
/** Exact continuous water for a float or a swimming point. Existing cell
 * rules continue to use their integer cell and the same shape's centre. */
function gardenWaterContainsPoint(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x >= GARDEN_ROOM_X) { const w = typeof _grwByCell === 'function' ? _grwByCell(x, y) : null; if (!w) return false; const p = _grwRoomPt(w, x, y); return _grwIn(w, p.x, p.y); }
  const cx = Math.floor(x), cy = Math.floor(y);
  if (gardenIslandActive()) {
    if (x < 0 || y < 0 || x >= GARDEN_WORLD.cols || y >= GARDEN_WORLD.rows || gardenPropWalk(cx, cy)) return false;
    return gardenIslandOceanContains(x, y) || typeof gardenOtherWaterContains === 'function' && gardenOtherWaterContains(x, y);
  }
  if (x >= 12 && x < 40 && y >= 21 && y < 38) {
    const lake = gardenLakeGeometry(), land = typeof gardenLandWaterAt === 'function' ? gardenLandWaterAt(cx, cy) : null;
    if (gardenPropWalk(cx, cy) || lake.cellContains(cx, cy) && land === false) return false;
    if (lake.contains(x, y)) return true;
    if (lake.cellContains(cx, cy)) return false;
    if (typeof gardenOtherWaterContains === 'function') return gardenOtherWaterContains(x, y);
    if (land !== null) return !!land;
    return false;
  }
  if (typeof gardenOtherWaterContains === 'function') return !gardenPropWalk(cx, cy) && gardenOtherWaterContains(x, y);
  if (typeof gardenLandWaterAt === 'function') { const q = gardenLandWaterAt(cx, cy); if (q !== null) return !!q && !gardenPropWalk(cx, cy); }
  return gardenIsWater(cx, cy);
}

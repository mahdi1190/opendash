/* ============================================================
   WORLD ENGINE, package "sense": the placement solver (docs/dev/WORLD_ENGINE.md 12; requirements P1-P4, K1-K4, K7, K9).
   PURE classic script (Node and browser); nothing runs at load except constants. Private prefix _wpl.

   The engine knows what is weird, whatever the scene says: after the entities are built (worldBuild, 0core) the solver checks
   every one against the knowledge of its class and repairs the world so it renders plainer, never wrong. Every action is
   logged as { id, obj, action, rule, reason, from, to, by: 'sense' } (U2).

     worldPlaceProbe(world, x, z) -> Probe { x, z, surface, kind, tags, y, ground, water, level, inWater, waterDist (< 0 inside
                                     water: how deep into it; > 0 on land: how far to it), bankDist, bankDir, pathDist, pathHalf,
                                     pathDir, path, laneDir, onRail, railDir, deck, under, solid }: what is at a ground point
     worldPlaceOk(world, e, x, z, facing) -> { ok, reason, attach }: could entity e stand there (habitat over its whole
                                     footprint where the class needs it, no walking line, no overlap, no building or wall)
     worldPlaceAdd(world, e, why)  -> ent | null: build, orient and place a new entity through the same rules (the fill uses it)
     worldPlace(world)             -> log: the 7 steps of 12.2, in order:
        1 care and region (K9, K7)  2 parents (K4)  3 habitat snap (P1, K1)  4 orientation (K3)  5 overlaps and clearance (P2)
        6 walking lines, gate and bridge approaches (P3)  7 no rows or grids unless real (P4)

   Knowledge: worldKb (kb package) through typeof guards; until it is loaded (or where it is silent) the class table below.
   Spatial queries go through the systems' worldGrid (typeof, self-tested) or a local hash grid: never all pairs (G3).
   One entity that throws is dropped and logged; the rest are placed (G8).
   ============================================================ */

/** Habitat modes of the fallback class table (K1). */
const _WPL_HAB = Object.freeze({
  boat: 'water-whole', duck: 'water-bank', coot: 'water-bank', swan: 'water-bank', goose: 'water-bank', gull: 'water-bank', grebe: 'water', fish: 'water',
  heron: 'wader', person: 'walk', dog: 'walk', cyclist: 'walk-drive', grazer: 'graze', animal: 'graze', vehicle: 'road', train: 'rail', tram: 'rail',
  tree: 'soil', shrub: 'soil', hedge: 'soil', reed: 'margin', cover: 'any', rock: 'any', bird: 'any', 'rail-kit': 'any',
  bench: 'furniture', lamp: 'furniture', street: 'furniture', post: 'post', building: 'land', fence: 'land', gate: 'land',
  walkway: 'free', structure: 'free', landmark: 'free', weir: 'free', air: 'free', 'bird-air': 'free', kingfisher: 'free', bough: 'free', frond: 'free',
});
/** Classes whose whole footprint must satisfy the habitat (boats inside the water, cars on the road, buildings off water). */
const _WPL_WHOLE = Object.freeze(['boat', 'vehicle', 'building', 'train', 'tram', 'tree', 'reed', 'rock']);   // reeds and stones: the whole stand in the margin (bug 11)
/** Orientation rules of the fallback table (K3) and the tolerance within which the author's facing stands. */
const _WPL_ORIENT = Object.freeze({ boat: ['bank', 20], vehicle: ['lane', 30], train: ['rail', 12], tram: ['rail', 12], bench: ['path', 45], gate: ['fence', 15], building: ['street', 45] });
/** Natural classes: never in rows or grids unless declared (P4). */
const _WPL_NATURAL = Object.freeze(['tree', 'shrub', 'reed', 'cover', 'rock', 'duck', 'coot', 'swan', 'goose', 'grebe', 'grazer', 'animal', 'bird', 'heron']);
/** Passable things that still never stand inside a solid (a hull, a mill, a wall, a trunk): plants, people and animals. */
const _WPL_NOT_INSIDE = Object.freeze(['shrub', 'reed', 'duck', 'coot', 'swan', 'goose', 'grebe', 'grazer', 'animal', 'bird', 'heron', 'person', 'dog', 'cyclist', 'fish']);
/** Classes drawn at true scale that become giants near the lens: kept out of the near band unless framed (A10, C2). */
const _WPL_NEAR_BAND = Object.freeze(['person', 'dog', 'cyclist', 'grazer', 'animal', 'duck', 'coot', 'swan', 'goose', 'grebe', 'heron', 'bird', 'gull',
  // props are no framing either: a bollard, a post or a bin at the lens is a dark blob filling the frame's corner
  'post', 'bench', 'lamp', 'street', 'gate', 'rock', 'vehicle',
  // ... nor is a shop's A-board (class signage), a parasol or a cafe table: the same dark blob in a lane's near corner
  'signage', 'umbrella', 'cafe-table']);
const _WPL_FILL_BAND = Object.freeze(['signage', 'umbrella', 'cafe-table']);
const _WPL_PROPS = Object.freeze(['post', 'bench', 'lamp', 'street', 'gate', 'rock', 'vehicle', 'signage', 'umbrella', 'cafe-table']);
/** Classes that never stand on a walking line (P3). */
const _WPL_OFFLINE = Object.freeze(['tree', 'shrub', 'reed', 'hedge', 'fence', 'rock', 'bench', 'lamp', 'post', 'street', 'building', 'vehicle', 'structure', 'gate']);
/** Parents (K4) when kb has none: a bough by its tree, willow fronds by a willow. */
const _WPL_PARENT = Object.freeze({ bough: { cls: ['tree'], reach: 8 }, frond: { cls: ['tree'], reach: 6, re: /willow/ } });
const _WPL_KIND_TAGS = Object.freeze({
  path: ['walk', 'paving'], pavement: ['walk', 'paving'], towpath: ['walk', 'paving'], plaza: ['walk', 'paving'], boardwalk: ['walk', 'deck'], 'bridge-deck': ['walk', 'deck'],
  deck: ['walk', 'deck'], platform: ['walk', 'paving', 'deck'], stairs: ['walk'], ramp: ['walk'], crossing: ['walk', 'road'],
  grass: ['grass', 'soil', 'walk'], heath: ['grass', 'soil', 'walk', 'heath'], field: ['grass', 'soil', 'walk', 'field'], sand: ['sand', 'walk'],
  road: ['road', 'road-lane'], water: ['water'], rail: ['rail'], tram: ['tram', 'rail'], reeds: ['reeds', 'water-margin', 'wet', 'soil'], bed: ['soil', 'bed'],
  hedge: ['hedge'], weir: ['weir'], bare: ['grass', 'soil', 'walk', 'bare'],
});
/** Walks laid over the water (a boardwalk, a jetty): the water runs on beneath them, so they are no bank (bug 11). */
const _WPL_OVER_WATER = Object.freeze(['boardwalk', 'deck', 'bridge-deck', 'jetty', 'pontoon']);
const _WPL_LINE_SOLID = Object.freeze(['wall', 'fence', 'railing', 'hedge']);
const _WPL_KEEP_R = 1.5;          // gate and bridge approaches kept clear (m)
/** The water margin (bug 11): how far into the water margin plants may stand (its shallow shelf plus 1 m, at most 1.5 m from a real bank), and
    how far up the bank the ground counts as wet margin (the core's edge clusters use a 1.5 m band from the region edge). */
const WORLD_MARGIN_MAX = 1.5, _WPL_MARGIN_LAND = 0.5;
const _wplMarginIn = shallow => Math.min(WORLD_MARGIN_MAX, Math.max(0.3, (shallow > 0 ? shallow : 0.5) + 1));
/** Statics that are no framing by themselves: low plants, stones, props. Near the lens they are giants (a bramble filling the
    corner, bug 4) unless the entity is declared framing (framed / framing / auto 'frame'): kept out of the near band by size. */
const _WPL_NEAR_STATIC = Object.freeze(['shrub', 'reed', 'cover', 'hedge', 'flower']);
/** The size a non-framing static may reach on screen: its drawn height at most 44 % of the frame (the people's 45 % near band of
    SCENE_LESSONS, with a margin; a hedge or fence line running past the lens is exempt from the height while it stays small),
    its box at most 17 % of it. The invariant checker's nearStatic rule (79-world-9inv.js) judges the same with 45 % / 20 %. */
const WORLD_NEAR_STATIC = Object.freeze({ h: 0.44, area: 0.17 });
const _WPL_LINE_HALF = 0.6;       // the walking line: the central 1.2 m of a path (P3)

/* ---------- geometry helpers ---------- */
function _wplBox(poly) { let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const p of poly) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; } return [x0, z0, x1, z1]; }
function _wplRadius(poly, x, z) { let r = 0; for (const p of poly) r = Math.max(r, Math.hypot(p[0] - x, p[1] - z)); return r; }
/** The quad of a segment widened by half on each side (and extended by `ext` at both ends). */
function _wplQuad(a, b, half, ext) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9, tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, nx = -tz * half, nz = tx * half, ex = tx * (ext || 0), ez = tz * (ext || 0);
  return [[a[0] - ex + nx, a[1] - ez + nz], [b[0] + ex + nx, b[1] + ez + nz], [b[0] + ex - nx, b[1] + ez - nz], [a[0] - ex - nx, a[1] - ez - nz]];
}
/** Convex hull (monotone chain) of a point list. */
function _wplHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
/** A path cut into runs by its gaps ([[s0, s1]] arc lengths). */
function _wplRuns(path, gaps) {
  if (!Array.isArray(gaps) || !gaps.length) return [path];
  const runs = []; let cur = [path[0]], s = 0;
  const inGap = v => gaps.some(g => v > g[0] && v < g[1]);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.5));
    for (let k = 1; k <= n; k++) {
      const t = k / n, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], v = s + L * t;
      if (inGap(v)) { if (cur.length >= 2) runs.push(cur); cur = []; } else cur.push(q);
    }
    s += L;
  }
  if (cur.length >= 2) runs.push(cur);
  return runs;
}
const _wplSd = (s, x, z) => Array.isArray(s.poly) ? (_wcInPoly(s.poly, x, z) ? -_wcPolyEdgeDist(s.poly, x, z) : _wcPolyEdgeDist(s.poly, x, z)) : _wcLineDist(s.path, x, z) - s.width / 2;
/** The direction (a facing, 0..180) of the boundary of s nearest to (x, z). */
function _wplEdgeDir(s, x, z) {
  if (Array.isArray(s.path)) { const n = _wcLineNear(s.path, x, z); return n ? _wcFace(Math.atan2(n.dir[0], n.dir[1]) / _WC_DEG) % 180 : null; }
  let best = Infinity, dir = null;
  for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) {
    const d = _wcSegDist(x, z, s.poly[j], s.poly[i]);
    if (d < best) { best = d; dir = _wcFace(Math.atan2(s.poly[i][0] - s.poly[j][0], s.poly[i][1] - s.poly[j][1]) / _WC_DEG) % 180; }
  }
  return dir;
}

/* ---------- the spatial index (G3): the systems' worldGrid when it answers like one, else a local hash grid ---------- */
function _wplGridLocal(cell) {
  const cells = new Map(), items = new Map();
  const span = (x, z, r) => [Math.floor((x - r) / cell), Math.floor((z - r) / cell), Math.floor((x + r) / cell), Math.floor((z + r) / cell)];
  const g = {
    add(id, x, z, r) {
      g.remove(id);
      const s = span(x, z, r); items.set(id, s);
      for (let i = s[0]; i <= s[2]; i++) for (let j = s[1]; j <= s[3]; j++) { const k = i + ',' + j; let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(id); }
    },
    remove(id) {
      const s = items.get(id); if (!s) return;
      for (let i = s[0]; i <= s[2]; i++) for (let j = s[1]; j <= s[3]; j++) { const a = cells.get(i + ',' + j); if (!a) continue; const q = a.indexOf(id); if (q >= 0) a.splice(q, 1); }
      items.delete(id);
    },
    move(id, x, z, r) { g.add(id, x, z, r); },
    query(x, z, r, fn) {
      const s = span(x, z, r), seen = new Set();
      for (let i = s[0]; i <= s[2]; i++) for (let j = s[1]; j <= s[3]; j++) { const a = cells.get(i + ',' + j); if (a) for (const id of a.slice()) if (!seen.has(id)) { seen.add(id); fn(id); } }
    },
  };
  return g;
}
function _wplGrid(cell) {
  if (typeof worldGrid === 'function') {
    try {
      const g = worldGrid(cell);
      if (g && typeof g.add === 'function' && typeof g.remove === 'function' && typeof g.query === 'function') {
        let hit = false, gone = true;
        // an item of radius 2 at the origin must answer a small query 1.4 m away (radius-aware), and be gone once removed
        g.add('__wpl', 0, 0, 2); g.query(1, 1, 0.1, id => { if (id === '__wpl') hit = true; });
        g.remove('__wpl'); g.query(1, 1, 0.1, id => { if (id === '__wpl') gone = false; });
        if (hit && gone) return g;
      }
    } catch (e) { /* the local grid */ }
  }
  return _wplGridLocal(cell);
}

/* ---------- the per-world preparation (surfaces never change during placement; entities do) ---------- */
function _wplPrep(world) {
  const S = Array.isArray(world.surfaces) ? world.surfaces : [];
  if (world._wpl && world._wpl.S === S && world._wpl.n === S.length) return world._wpl;
  const raised = s => (_wcNum(s.y) && s.y > 0) || WORLD_JOIN_KINDS.includes(s.kind);
  const ground = S.filter(s => !raised(s)).map(s => ({ s, box: s.poly ? _wplBox(s.poly) : (b => [b[0] - s.width / 2, b[1] - s.width / 2, b[2] + s.width / 2, b[3] + s.width / 2])(_wplBox(s.path)) }));
  const P = {
    S, n: S.length, ground,
    waters: ground.filter(g => g.s.kind === 'water'),
    walkLines: ground.filter(g => Array.isArray(g.s.path) && WORLD_SURFACE_KINDS[g.s.kind] === 'walk').map(g => ({ s: g.s, half: g.s.width / 2, line: Math.min(_WPL_LINE_HALF, g.s.width / 2), box: g.box })),
    roads: ground.filter(g => g.s.kind === 'road' && Array.isArray(g.s.path)),
    rails: S.filter(s => (s.kind === 'rail' || s.kind === 'tram') && Array.isArray(s.path)),
    raisedS: S.filter(raised),
    streets: ground.filter(g => Array.isArray(g.s.path) && ['road', 'pavement', 'path', 'towpath', 'plaza'].includes(g.s.kind)),
    obstacles: [], keep: [], grid: null, solidIds: new Map(),
  };
  // static obstacles: building footprints, wall / fence / railing / hedge lines (gaps open), hedge surfaces
  (world.buildings || []).forEach((b, i) => { if (Array.isArray(b.foot) && b.foot.length >= 3) P.obstacles.push({ id: 'building:' + (b.id || i), kind: 'building', poly: _wplHull(b.foot) }); });
  (world.lines || []).forEach((l, i) => {
    if (!_WPL_LINE_SOLID.includes(l.kind) || !Array.isArray(l.path)) return;
    for (const run of _wplRuns(l.path, l.gaps)) for (let k = 1; k < run.length; k++) P.obstacles.push({ id: `line:${l.id || i}:${k}`, kind: 'line', line: l.kind, poly: _wplQuad(run[k - 1], run[k], (l.width || 0.3) / 2, 0) });
  });
  for (const g of ground) if (g.s.kind === 'hedge' && !g.s.open) {
    if (g.s.path) for (let k = 1; k < g.s.path.length; k++) P.obstacles.push({ id: `hedge:${g.s.id}:${k}`, kind: 'line', line: 'hedge', poly: _wplQuad(g.s.path[k - 1], g.s.path[k], g.s.width / 2, 0) });
    else P.obstacles.push({ id: 'hedge:' + g.s.id, kind: 'line', line: 'hedge', poly: _wplHull(g.s.poly) });
  }
  for (const o of P.obstacles) o.box = _wplBox(o.poly);
  P.banks = _wplBankSegs(P.waters);
  Object.defineProperty(world, '_wpl', { value: P, writable: true, configurable: true, enumerable: false });
  return P;
}
/**
 * The banks of the water (bug 11): the outline pieces of every water region (about 1 m each) whose outside is not water. An edge
 * two water regions share (a pond and the cut beside its boardwalk) is open water, never a bank: before, reeds snapped to the
 * margin of that seam stood in the middle of the pond. -> { segs: [[ax, az, bx, bz]], grid: Map(cell -> [i]), cell }
 */
const _WPL_BANK_CELL = 4, _WPL_BANK_R = 8;   // banks are searched within 8 m (the margin, a hull touching the bank, a wader)
function _wplBankSegs(waters) {
  const segs = [], grid = new Map(), cell = _WPL_BANK_CELL;
  const outline = s => {
    if (Array.isArray(s.poly)) return s.poly;
    const Pt = s.path, hw = s.width / 2, L = [], R = [];
    for (let i = 0; i < Pt.length; i++) {
      const a = Pt[Math.max(0, i - 1)], b = Pt[Math.min(Pt.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1;
      L.push([Pt[i][0] - dz / n * hw, Pt[i][1] + dx / n * hw]); R.push([Pt[i][0] + dz / n * hw, Pt[i][1] - dx / n * hw]);
    }
    return L.concat(R.reverse());
  };
  const inWater = (x, z, self) => waters.some(g => g.s !== self && _wplIn(g.box, x, z) && _wcSurfContains(g.s, x, z));
  for (const g of waters) {
    const ring = outline(g.s);
    if (!Array.isArray(ring) || ring.length < 3) continue;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!(L > 1e-6)) continue;
      const n = Math.max(1, Math.ceil(L / 1)), tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
      let run = null;
      const flush = () => {
        if (!run) return;
        const id = segs.length, r0 = run;
        segs.push(r0); run = null;
        // the cells along the segment (sampled every half cell)
        const len = Math.hypot(r0[2] - r0[0], r0[3] - r0[1]), k = Math.max(1, Math.ceil(len / (cell / 2))), keys = new Set();
        for (let t = 0; t <= k; t++) { const px = r0[0] + (r0[2] - r0[0]) * t / k, pz = r0[1] + (r0[3] - r0[1]) * t / k; keys.add(Math.floor(px / cell) + ',' + Math.floor(pz / cell)); }
        for (const key of keys) { let arr = grid.get(key); if (!arr) grid.set(key, arr = []); arr.push(id); }
      };
      // the outward normal: the side of the edge away from the region (tested, not assumed from the winding)
      for (let k = 0; k < n; k++) {
        const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], q = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n];
        const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        let nx = -tz, nz = tx;
        if (_wcSurfContains(g.s, m[0] + nx * 0.25, m[1] + nz * 0.25)) { nx = -nx; nz = -nz; }
        if (inWater(m[0] + nx * 0.3, m[1] + nz * 0.3, g.s)) { flush(); continue; }   // the other side is water too: a seam, not a bank
        if (!run) run = [p[0], p[1], q[0], q[1]]; else { run[2] = q[0]; run[3] = q[1]; }   // contiguous bank pieces of one edge: one segment
      }
      flush();
    }
  }
  return { segs, grid, cell };
}
/** The nearest bank piece to (x, z) within R metres: { d, dir } (dir: the bank's facing, 0..180), or null. */
function _wplBankNear(P, x, z, R) {
  const B = P.banks;
  if (!B || !B.segs.length) return null;
  let best = null;
  const c0 = Math.floor((x - R) / B.cell), c1 = Math.floor((x + R) / B.cell), d0 = Math.floor((z - R) / B.cell), d1 = Math.floor((z + R) / B.cell), seen = new Set();
  for (let i = c0; i <= c1; i++) for (let j = d0; j <= d1; j++) for (const id of B.grid.get(i + ',' + j) || []) {
    if (seen.has(id)) continue; seen.add(id);
    const s = B.segs[id], d = _wcSegDist(x, z, [s[0], s[1]], [s[2], s[3]]);
    if (!best || d < best.d) best = { d, s };
  }
  if (!best || best.d > R) return null;
  return { d: best.d, dir: _wcFace(Math.atan2(best.s[2] - best.s[0], best.s[3] - best.s[1]) / _WC_DEG) % 180 };
}
/** The entities of a kind (with decks, fences), cached until an entity is added or removed (moves keep the same records). */
function _wplEntList(world, P, key, pick) {
  const E = Array.isArray(world.entities) ? world.entities : [], c = P.lists || (P.lists = {});
  const hit = c[key];
  if (hit && hit.arr === E && hit.n === E.length) return hit.list;
  const list = E.filter(e => e && pick(e));
  c[key] = { arr: E, n: E.length, list };
  return list;
}
const _wplTags = kind => {
  if (typeof worldKbSurfaceTags === 'function') { try { const t = worldKbSurfaceTags(kind || 'bare'); if (Array.isArray(t) && t.length) return t.slice(); } catch (e) { /* the table */ } }
  return (_WPL_KIND_TAGS[kind || 'bare'] || _WPL_KIND_TAGS.bare).slice();
};
const _wplIn = (box, x, z, pad) => x >= box[0] - (pad || 0) && x <= box[2] + (pad || 0) && z >= box[1] - (pad || 0) && z <= box[3] + (pad || 0);

/**
 * What is at a ground point (12.1). The knowledge base judges habitats and orientations from probes; it never reads the spec.
 * o.orient: also the bearings the orientation rules read (toPath, toWater, toRoad, fenceDir; K3).
 */
function worldPlaceProbe(world, x, z, o) {
  const P = _wplPrep(world);
  let surface = null, gi = -1;
  for (let i = P.ground.length - 1; i >= 0; i--) { const g = P.ground[i]; if (_wplIn(g.box, x, z) && _wcSurfContains(g.s, x, z)) { surface = g.s; gi = i; break; } }
  const kind = surface ? surface.kind : null, inWater = kind === 'water';
  // water distance: inside, how far to land (the region's edge or a later land surface over it); outside, how far to water
  let waterDist = Infinity, bankDir = null, shallow = 0.5;
  if (inWater) {
    shallow = surface.shallow || 0.5;
    // how far to land: the nearest real bank (an edge shared with another water region is no bank, bug 11), else the region's edge
    let d = -_wplSd(surface, x, z); bankDir = _wplEdgeDir(surface, x, z);
    // (the nearest bank is never nearer than the region's own edge: search only when that edge is within reach)
    if (P.banks && P.banks.segs.length && d < _WPL_BANK_R) { const bn = _wplBankNear(P, x, z, _WPL_BANK_R); if (bn) { d = bn.d; bankDir = bn.dir; } else d = _WPL_BANK_R; }
    for (let i = gi + 1; i < P.ground.length; i++) { const g = P.ground[i]; if (g.s.kind === 'water' || _WPL_OVER_WATER.includes(g.s.kind) || !_wplIn(g.box, x, z, d)) continue; const sd = _wplSd(g.s, x, z); if (sd < d) { d = sd; bankDir = _wplEdgeDir(g.s, x, z); } }
    waterDist = -Math.max(0, d);
  } else {
    for (const g of P.waters) {
      if (!_wplIn(g.box, x, z, Math.min(waterDist, 60))) continue;
      const sd = _wplSd(g.s, x, z);
      if (sd >= 0 && sd < waterDist) { waterDist = sd; bankDir = _wplEdgeDir(g.s, x, z); }
      else if (sd < 0 && surface) { const cov = -_wplSd(surface, x, z); if (cov < waterDist) { waterDist = cov; bankDir = _wplEdgeDir(surface, x, z); } }   // land laid over the water (a towpath)
    }
  }
  // paths, lanes, rails
  let pathDist = Infinity, pathHalf = 0, pathDir = null, path = null, pathLine = 0;
  for (const w of P.walkLines) {
    if (!_wplIn(w.box, x, z, Math.min(pathDist, 30))) continue;
    const n = _wcLineNear(w.s.path, x, z);
    if (n && n.d < pathDist) { pathDist = n.d; pathHalf = w.half; pathLine = w.line; pathDir = _wcFace(Math.atan2(n.dir[0], n.dir[1]) / _WC_DEG); path = w.s.id; }
  }
  let laneDir = null, roadDir = null, roadSide = null;
  if (kind === 'road' && Array.isArray(surface.path)) {
    laneDir = _wcLaneFacing(surface.path, x, z);
    const n = _wcLineNear(surface.path, x, z);
    if (n) { roadDir = _wcFace(Math.atan2(n.dir[0], n.dir[1]) / _WC_DEG); roadSide = n.side > 0 ? 1 : -1; }
  }
  let onRail = null, railDir = null;
  for (const r of P.rails) { const n = _wcLineNear(r.path, x, z); if (n && n.d <= (r.width || 3) / 2 + 0.75) { onRail = r.id; railDir = _wcFace(Math.atan2(n.dir[0], n.dir[1]) / _WC_DEG); break; } }
  // decks (entity decks, raised surfaces) and overhead spans
  let deck = null, under = null;
  for (const e of _wplEntList(world, P, 'decks', q => !!q.deck)) {
    if (!e.deck || e._wplDropped || !_wcInPoly(e.deck.poly, x, z)) continue;
    if (!deck || e.deck.y > deck.y) deck = { id: e.id, y: e.deck.y, host: e.id, entity: true };
    if (e.deck.y >= WORLD_OVERHEAD_Y && (!under || e.deck.y < under.y)) under = { id: e.id, y: e.deck.y };
  }
  for (const s of P.raisedS) {
    if (!_wcSurfContains(s, x, z)) continue;
    const y = worldSurfaceY(s, x, z);
    if (!deck || y > deck.y) deck = { id: s.id, y, surface: true };
    if (s.overhead && (!under || y < under.y)) under = { id: s.id, y };
  }
  let solid = null;
  for (const o of P.obstacles) if (_wplIn(o.box, x, z) && _wcInPoly(o.poly, x, z)) { solid = { id: o.id, kind: o.kind, line: o.line || null }; break; }
  const level = inWater ? _wcWaterLevel(world.cam, surface) : null, gy = world.cam ? sceneGroundHeight(world.cam, x, z) : 0;
  // a deck high over the local ground or water is a span overhead (W3): what is below stands under it, not on it
  if (deck && deck.y - (inWater ? level : gy) >= WORLD_OVERHEAD_Y) { if (!under || deck.y < under.y) under = { id: deck.id, y: deck.y }; deck = null; }
  const tags = _wplTags(kind);
  // a walk, paving or road beside the water is that, not its bank: a log, a reed or a shrub never stands on a towpath (K1, P3)
  if (!inWater && waterDist <= 3 && !tags.includes('walk') && !tags.includes('paving') && !tags.includes('road')) tags.push('bank');
  // the margin (15 Oct audit, bug 11): reeds, waders and posts stand where the water is shallow, at most WORLD_MARGIN_MAX
  // (1.2 m) from the bank line, never out in open water; on land the last half metre of soft ground at the water is wet margin
  if (inWater && -waterDist <= _wplMarginIn(shallow)) tags.push('water-margin');
  if (!inWater && waterDist <= _WPL_MARGIN_LAND && !tags.includes('paving') && !tags.includes('road') && !tags.includes('rail') && (tags.includes('soil') || tags.includes('grass'))) {
    if (!tags.includes('wet')) tags.push('wet');
    if (!tags.includes('water-margin')) tags.push('water-margin');
  }
  if (pathDist <= pathHalf) tags.push('path');
  if (pathDist <= pathLine) tags.push('path-line');
  if ((tags.includes('grass') || tags.includes('soil')) && !tags.includes('path') && pathDist <= pathHalf + 1.5) tags.push('grass-edge');
  if (deck) tags.push('deck');
  if (under) tags.push('under');
  if (onRail) tags.push('rail');
  if (solid) tags.push(solid.kind === 'building' ? 'roof' : solid.line === 'hedge' ? 'hedge' : 'wall');
  const out = { x, z, surface: surface ? surface.id : null, kind, tags, y: inWater ? level : gy, ground: gy, water: inWater ? surface.id : null, level, inWater, shallow,
    waterDist, bankDist: Math.abs(waterDist), bankDir, pathDist, pathHalf, pathDir, path, laneDir, roadDir, roadSide, onRail, railDir, deck, under, solid,
    place: world.place || null, calm: inWater ? surface.hint !== 'breezy' : undefined };
  if (o && o.orient) Object.assign(out, _wplOrientFields(world, P, x, z, inWater));
  return out;
}
/** The bearings K3 reads: to the nearest path (benches), water (the view), street (buildings) and the fence line direction (gates). */
function _wplOrientFields(world, P, x, z, inWater) {
  const out = {};
  let best = null;
  for (const w of P.walkLines) { const n = _wcLineNear(w.s.path, x, z); if (n && n.d <= w.half + 8 && (!best || n.d < best.d)) best = n; }
  if (best && best.d > 0.05) out.toPath = _wcBearing([x, z], [best.x, best.z]);
  if (!inWater) {
    let wb = null;
    for (const g of P.waters) {
      const s = g.s;
      if (s.poly) { for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) { const d = _wcSegDist(x, z, s.poly[j], s.poly[i]); if (d <= 40 && (!wb || d < wb.d)) wb = { d, a: s.poly[j], b: s.poly[i] }; } }
      else { const n = _wcLineNear(s.path, x, z); if (n && n.d - s.width / 2 <= 40 && (!wb || n.d - s.width / 2 < wb.d)) wb = { d: n.d - s.width / 2, pt: [n.x, n.z] }; }
    }
    if (wb) {
      let pt = wb.pt;
      if (!pt) { const L2 = (wb.b[0] - wb.a[0]) ** 2 + (wb.b[1] - wb.a[1]) ** 2 || 1, t = Math.max(0, Math.min(1, ((x - wb.a[0]) * (wb.b[0] - wb.a[0]) + (z - wb.a[1]) * (wb.b[1] - wb.a[1])) / L2)); pt = [wb.a[0] + t * (wb.b[0] - wb.a[0]), wb.a[1] + t * (wb.b[1] - wb.a[1])]; }
      out.toWater = _wcBearing([x, z], pt);
    }
  }
  let st = null;
  for (const g of P.streets) { const n = _wcLineNear(g.s.path, x, z); if (n && n.d <= 30 && (!st || n.d < st.d)) st = n; }
  if (st && st.d > 0.5) out.toRoad = _wcBearing([x, z], [st.x, st.z]);
  let fb = null;
  const lines = (world.lines || []).filter(l => _WPL_LINE_SOLID.includes(l.kind) && Array.isArray(l.path)).map(l => l.path)
    .concat(P.ground.filter(g => g.s.kind === 'hedge' && g.s.path).map(g => g.s.path))
    .concat(_wplEntList(world, P, 'fences', q => q.cls === 'fence').filter(q => !q._wplDropped && Array.isArray(q.foot) && q.foot.length === 4).map(q => { const f = q.foot; return [[(f[0][0] + f[3][0]) / 2, (f[0][1] + f[3][1]) / 2], [(f[1][0] + f[2][0]) / 2, (f[1][1] + f[2][1]) / 2]]; }));
  for (const pth of lines) { const n = _wcLineNear(pth, x, z); if (n && n.d <= 1.5 && (!fb || n.d < fb.d)) fb = n; }
  if (fb) { out.fenceDir = _wcFace(Math.atan2(fb.dir[0], fb.dir[1]) / _WC_DEG); out.fenceDist = fb.d; out.fencePt = [fb.x, fb.z]; }
  return out;
}

/* ---------- knowledge: kb first, the class table as the fallback ---------- */
function _wplInfo(e) { return worldObjectInfo(e.obj); }
function _wplMode(info, e) {
  if (e.landmark) return 'free';
  const id = String(e.obj);
  if (/(^|[.-])(lily|lilies|lily-pad|fish-ring|ring)(-|$)/.test(id)) return 'water';
  if (/planter|tub|(^|[.-])pot(-|$)|(^|[.-])bin(-|$)/.test(id)) return 'furniture';
  let m = _WPL_HAB[info.cls] || 'any';
  const att = e._src && e._src.attach ? _wcAttachKind(e._src.attach) : null;
  if (m === 'water-bank' && att === 'water') m = 'water';
  return m;
}
/** Is a probe legal for a mode? A reason (string) when not. */
function _wplHabFallback(mode, p, info) {
  const t = p.tags, has = k => t.includes(k);
  const solidOk = info.cls === 'fence' || info.cls === 'gate' || info.cls === 'hedge';
  if (p.solid && !solidOk && mode !== 'free') return p.solid.kind === 'building' ? 'inside a building' : 'inside a wall, fence or hedge';
  switch (mode) {
    case 'free': return null;
    case 'water-whole': return p.inWater ? (p.waterDist <= -0.05 ? null : 'touches the bank') : 'not on water';
    case 'water': return p.inWater ? null : 'not on water';
    case 'water-bank': return p.inWater ? null : (has('bank') && !has('road') && !has('rail') && !has('hedge') && !has('weir')) ? null : 'neither on water nor on its bank';
    case 'wader': return (p.inWater && -p.waterDist <= p.shallow + 1) || has('reeds') || (!p.inWater && has('bank') && !has('road')) ? null : 'not at a water margin';
    case 'walk': return has('deck') || (has('walk') && !p.inWater && !has('rail') && !has('hedge') && !has('weir')) ? null : 'not on a walkable surface';
    case 'walk-drive': return (has('walk') || has('road')) && !p.inWater ? null : 'not on a path or a road';
    case 'graze': return (has('grass') || has('soil') || has('heath') || has('field')) && !has('paving') && !p.inWater ? null : 'not on grass';
    case 'road': return has('road') || has('tram') ? null : 'not on a road';
    case 'rail': return p.onRail ? null : 'not on a rail line';
    case 'soil': return p.inWater ? 'in the water' : has('paving') || has('path') ? 'on paving or a path' : has('road') || has('rail') || has('weir') || has('hedge') && info.cls !== 'hedge' ? 'not on soil' : (has('grass') || has('soil') || has('reeds') || has('bed') || has('sand')) ? null : 'not on soil';
    case 'margin': return (p.inWater && -p.waterDist <= p.shallow + 1.5) || has('reeds') || has('bed') || has('wet') || (!p.inWater && p.waterDist <= 2 && !has('paving') && !has('road')) ? null : 'not at a water margin or on wet ground';
    case 'furniture': return p.inWater ? 'in the water' : has('road') && !has('walk') ? 'on a road' : has('rail') || has('weir') || has('hedge') ? 'not on paving or grass' : null;
    case 'post': return has('road') && !has('walk') ? 'on a road' : has('rail') || has('weir') ? 'not on paving, grass or water' : null;
    case 'land': return p.inWater ? 'in the water' : has('road') && !has('walk') ? 'on a road' : has('rail') || has('weir') ? 'on a rail line or a weir' : null;
    case 'any': return null;
    default: return null;
  }
}
/** kb's verdict on a probe (the anchor) or an array of probes (the whole footprint): null = legal, a reason, or undefined (no kb). */
function _wplKbHab(info, p) {
  if (typeof worldKbHabitatOk !== 'function' || !info.kb || !info.kb.habitat) return undefined;
  try { const r = worldKbHabitatOk(info.kb, p); if (r === true || (r && r.ok === true)) return null; if (r === false || (r && r.ok === false)) return (r && r.reason) || 'not in its habitat (K1)'; } catch (e) { /* the table */ }
  return undefined;
}
/** Sample points of a footprint: the anchor, or (whole) the corners, edge points every <= 2.5 m and the centre. */
function _wplSamples(foot, x, z, whole) {
  if (!whole || !Array.isArray(foot) || foot.length < 3) return [[x, z]];
  const out = [[x, z]], c = _wcCentroid(foot);
  for (let i = 0; i < foot.length; i++) {
    const a = foot[i], b = foot[(i + 1) % foot.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 2.5));
    for (let k = 0; k < n; k++) { const t = k / n, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; out.push([q[0] + (c[0] - q[0]) * 0.002, q[1] + (c[1] - q[1]) * 0.002]); }
  }
  return out;
}
/** The habitat verdict of entity e (its descriptor) at (x, z) with facing: null when legal, else a reason. */
function _wplHabitat(world, e, info, x, z, facing) {
  const mode = _wplMode(info, e);
  if (mode === 'free') return null;
  const att = e._src && e._src.attach ? _wcAttachKind(e._src.attach) : null;
  if (att === 'air' || att === 'wall') return null;
  const whole = _WPL_WHOLE.includes(info.cls) || !!(info.kb && info.kb.habitat && info.kb.habitat.inset != null);
  const foot = _wcFoot(info, x, z, facing), samples = _wplSamples(foot, x, z, whole), probes = samples.map(([sx, sz]) => worldPlaceProbe(world, sx, sz));
  // a water bird put on land (not told to swim) is grazing: kb's habitat has a pose for that (K1: ducks and swans graze the bank)
  const H = info.kb && info.kb.habitat;
  if (H && H.alt && Array.isArray(H.alt.graze) && att !== 'water') for (const p of probes) if (!p.inWater) p.pose = 'graze';
  const anchor = probes[0], useKb = _wplKbHab(info, anchor);
  const roofOk = info.cls === 'building' || (info.kb && info.kb.habitat && (info.kb.habitat.on || []).includes('roof'));
  if (useKb !== undefined) {   // kb: the anchor (water things keep inset + half their width), then the whole footprint as one array
    if (useKb) return useKb;
    if (whole && probes.length > 1) { const r = _wplKbHab(info, probes.slice(1)); if (r) return r; }
    for (const p of probes) if (p.solid && p.solid.kind === 'building' && !roofOk) return 'inside a building';
    return null;
  }
  for (const p of probes) { const r = _wplHabFallback(mode, p, info); if (r) return r; }
  return null;
}
/** The attachment an entity takes at a legal spot (its explicit one when that still holds). */
function _wplAttachAt(world, e, info, x, z) {
  const src = e._src || {}, att = src.attach ? _wcAttachKind(src.attach) : null;
  if (att && att !== 'water' && att !== 'ground') return src.attach;
  const p = worldPlaceProbe(world, x, z);
  if (p.inWater && info.attachOk.includes('water')) return 'water';
  // a low deck over the spot (a platform, a boardwalk, a boat's deck; never a span overhead) is where a walker stands
  if (p.deck && info.attachOk.includes('deck') && att !== 'ground') return 'deck:' + p.deck.id;
  if (att === 'water') return info.attachOk.includes('ground') ? 'ground' : 'water';
  if (att === 'ground') return 'ground';
  return info.attachOk.includes('ground') ? 'ground' : info.attachOk[0];
}

/* ---------- solids and the walking lines ---------- */
const _wplIsSolid = e => e.solidity === 'solid' && !/^(deck|wall|air):?/.test(String(e.attach || '')) && !e._wplDropped;
function _wplSolidGrid(world) {
  const P = _wplPrep(world);
  if (P.grid) return P.grid;
  const g = _wplGrid(4);
  P.grid = g; P.solidIds = new Map(); P.obstacleIds = new Map();
  for (const o of P.obstacles) { const c = _wcCentroid(o.poly); g.add(o.id, c[0], c[1], _wplRadius(o.poly, c[0], c[1])); P.obstacleIds.set(o.id, o); }
  for (const e of world.entities || []) if (e && Array.isArray(e.foot) && _wcNum(e.x) && _wplIsSolid(e)) { g.add(e.id, e.x, e.z, _wplRadius(e.foot, e.x, e.z)); P.solidIds.set(e.id, e); }
  return g;
}
function _wplGridAdd(world, e) {
  const P = _wplPrep(world), g = _wplSolidGrid(world);
  if (!_wplIsSolid(e) || !Array.isArray(e.foot)) return;
  g.add(e.id, e.x, e.z, _wplRadius(e.foot, e.x, e.z)); P.solidIds.set(e.id, e);
}
function _wplGridRemove(world, e) { const P = _wplPrep(world); if (P.grid && P.solidIds.has(e.id)) { P.grid.remove(e.id); P.solidIds.delete(e.id); } }
/** The solids (entities and static obstacles) a footprint overlaps by more than 5 cm: [{ id, sat, landmark, ent }]. */
function _wplOverlaps(world, e, foot, info) {
  const P = _wplPrep(world), g = _wplSolidGrid(world), out = [], c = _wcCentroid(foot), r = _wplRadius(foot, c[0], c[1]);
  const lineOk = info && (info.cls === 'fence' || info.cls === 'gate' || info.cls === 'hedge');
  g.query(c[0], c[1], r + 0.5, id => {
    if (id === e.id) return;
    const o = P.solidIds.get(id), ob = o ? null : P.obstacleIds.get(id);
    if (o) { if (o._wplDropped || o.host === e.id || e.host === o.id) return; const s = _wcSat(o.foot, foot); if (s && s.depth > 0.05) out.push({ id, sat: s, landmark: !!o.landmark, ent: o }); }
    else if (ob) { if (lineOk && ob.kind === 'line') return; const s = _wcSat(ob.poly, foot); if (s && s.depth > 0.05) out.push({ id, sat: s, landmark: true, static: true }); }
  });
  return out;
}
/** Does a footprint cross a walking line (P3)? The path id, or null. */
function _wplOnLine(world, foot) {
  const P = _wplPrep(world), b = _wplBox(foot);
  for (const w of P.walkLines) {
    if (b[2] < w.box[0] || b[0] > w.box[2] || b[3] < w.box[1] || b[1] > w.box[3]) continue;
    const pth = w.s.path;
    for (let k = 1; k < pth.length; k++) {
      const q = _wplQuad(pth[k - 1], pth[k], w.line, k === 1 || k === pth.length - 1 ? 0 : w.line), qb = _wplBox(q);
      if (b[2] < qb[0] || b[0] > qb[2] || b[3] < qb[1] || b[1] > qb[3]) continue;
      const s = _wcSat(q, foot);
      if (s && s.depth > 0.01) return w.s.id;
    }
  }
  return null;
}
function _wplInKeep(world, e, foot) {
  const P = _wplPrep(world);
  for (const k of P.keep) { if (k.owner === e.id) continue; for (const p of foot.concat([[e.x, e.z]])) if (Math.hypot(p[0] - k.x, p[1] - k.z) < k.r) return k; }
  return null;
}
// ... and any other solid static (a fallen log is class 'cover': it lay across the towpath, 15 Oct audit); walkways, weirs and boats
// are where people walk or float, never moved off a walking line
const _wplOffline = (info, e) => !e.landmark && e.blocks !== true && (_WPL_OFFLINE.includes(info.cls) || (info.solidity === 'solid' && !['walkway', 'weir', 'boat', 'landmark', 'rail-kit', 'train', 'tram'].includes(info.cls))) && !/^(deck|wall|air)/.test(String(e.attach || ''));

/* ---------- the near band for statics (bug 4): a non-framing plant at the lens is a giant blob over the frame ---------- */
const _wplFramed = e => !!(e && (e.framed === true || e.framing === true || e.auto === 'frame' || e.landmark));
/** The screen box [X0, Y0, X1, Y1] of entity e if it stood at (x, z) with facing (appearance's worldScreenBox when loaded). */
function _wplScreenBox(world, e, info, x, z, facing) {
  const cam = world.cam, f = _wcNum(facing) ? facing : (_wcNum(e.facing) ? e.facing : 90), foot = _wcFoot(info, x, z, f);
  const y = /^water/.test(String(e.attach || '')) && _wcNum(e.y) ? e.y : sceneGroundHeight(cam, x, z), h = _wcNum(e.height) && e.height > 0 ? e.height : info.size.h;
  if (typeof worldScreenBox === 'function') {
    try { const r = worldScreenBox({ obj: e.obj, variant: e.variant, x, z, y, facing: f, foot, height: h, attach: e.attach, cls: info.cls }, cam); if (r && Array.isArray(r.box) && r.box.every(_wcNum)) return r.box; } catch (err) { /* the prism */ }
  }
  let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
  for (const p of foot.concat([[x, z]])) {
    const d = Math.max(0.3, p[1]), k = cam.f / d, X = (_wcNum(cam.x0) ? cam.x0 : 800) + k * p[0];
    X0 = Math.min(X0, X); X1 = Math.max(X1, X); Y0 = Math.min(Y0, cam.horizon + k * (cam.eye - y - h)); Y1 = Math.max(Y1, cam.horizon + k * (cam.eye - y));
  }
  return [X0, Y0, X1, Y1];
}
/**
 * Would e be a giant at (x, z) (bug 4)? A non-framing low static (shrub, reed, cover, hedge, flower) drawn taller than 55 % of the
 * frame or covering more than 18 % of it (WORLD_NEAR_STATIC) is a blob at the lens. -> a reason, or null. Framed entities pass.
 */
function _wplGiant(world, e, info, x, z, facing) {
  const cam = world.cam;
  if (!cam || !_wcNum(cam.f) || _wplFramed(e) || !_WPL_NEAR_STATIC.includes(info.cls) || /^(air|wall|deck)/.test(String(e.attach || ''))) return null;
  const W = 1600, H = 900, big = Math.max(info.size.h, info.size.w, info.size.d);
  if (cam.f * big / Math.max(0.3, z - big) < 0.3 * H) return null;   // far enough: cheap out
  const b = _wplScreenBox(world, e, info, x, z, facing);
  const vis = Math.max(0, Math.min(W, b[2]) - Math.max(0, b[0])) * Math.max(0, Math.min(H, b[3]) - Math.max(0, b[1])) / (W * H);
  if (vis <= 0) return null;   // wholly off the frame: nothing to see
  const hS = (b[3] - b[1]) / H;
  if (hS > WORLD_NEAR_STATIC.h && !(['hedge', 'fence'].includes(info.cls) && vis <= WORLD_NEAR_STATIC.area)) return `${Math.round(hS * 100)} % of the frame tall at ${_wcR3(z)} m from the lens`;
  if (vis > WORLD_NEAR_STATIC.area) return `covers ${Math.round(vis * 100)} % of the frame at ${_wcR3(z)} m from the lens`;
  return null;
}

/** Could entity e stand at (x, z) with facing? Habitat over the footprint, no walking line, no overlap, no kept approach. */
/** The depth in front of which a shop's A-board, a parasol or a cafe table (the classes the fill places with no near band of their own) would be a dark blob at the lens: where a 1.3 m thing is about 12 % of the frame (step 3b's rule, TR3); 0 for anything else. The kits' low near dressing (bins, tubs, planters) keeps its own tier. */
function _wplPropBand(world, e, info) {
  const cam = world && world.cam;
  if (!cam || !_wcNum(cam.f) || !(cam.f > 0) || !(_WPL_FILL_BAND.includes(info.cls) || _WPL_FILL_BAND.includes(((typeof worldKb === 'function' && worldKb(e.obj)) || {}).cls)) || e.landmark || e.framed || e.framing || e.auto === 'frame' || /^(air|wall)/.test(String(e.attach))) return 0;
  const hRef = Math.max(info.size.h, _wcNum(e.height) ? e.height : 0), foot = _wcNum(cam.eye) && _wcNum(cam.horizon) && cam.horizon < 900 ? cam.f * Math.max(0.2, cam.eye - (_wcNum(e.y) ? e.y : cam.relief && typeof sceneGroundHeight === 'function' ? sceneGroundHeight(cam, e.x, e.z) : 0)) / (900 - cam.horizon) + 0.3 : 0;   // (the ground under it: a thing on a plateau 36 m up is not 36 m below the eye)
  return Math.max(cam.f * Math.min(hRef, 1.3) / 110, foot);
}
function worldPlaceOk(world, e, x, z, facing) {
  try {
    const info = e && worldObjectInfo(e.obj);
    if (!info) return { ok: false, reason: 'no descriptor for ' + (e && e.obj) };
    if (!_wcNum(x) || !_wcNum(z)) return { ok: false, reason: 'no position' };
    // the fill's furniture obeys the near band too (SCENE_LESSONS K: a prop at the lens is a blob in the corner of the frame)
    const nb = _wplPropBand(world, e, info);
    if (nb > 0 && z < nb) return { ok: false, reason: 'in the near band of the lens (a prop nearer than ' + (Math.round(nb * 10) / 10) + ' m fills the corner of the frame)', rule: 'nearBand' };
    const f = _wcNum(facing) ? facing : (_wcNum(e.facing) ? e.facing : 90), foot = _wcFoot(info, x, z, f);
    if (_wplOffline(info, e)) { const line = _wplOnLine(world, foot); if (line) return { ok: false, reason: 'on the walking line of ' + line, rule: 'blocksPath' }; }
    const hab = _wplHabitat(world, e, info, x, z, f);
    if (hab) return { ok: false, reason: hab, rule: 'badAttach' };
    const giant = _wplGiant(world, e, info, x, z, f);
    if (giant) return { ok: false, reason: 'a giant at the lens: ' + giant, rule: 'nearBand' };
    const solidLike = info.solidity === 'solid' && !(info.cls === 'gate' && e.open === true);
    if (solidLike && !e.landmark) {
      const ov = _wplOverlaps(world, e, foot, info);
      if (ov.length) return { ok: false, reason: 'overlaps ' + ov[0].id, rule: 'overlap' };
      // nor over a person, an animal or a plant already standing there (a bench never lands on a walker)
      const P = _wplPrep(world), b = _wplBox(foot);
      for (const o of _wplEntList(world, P, 'notInside', q => _WPL_NOT_INSIDE.includes(q.cls) && !/^(deck|wall|air)/.test(String(q.attach || ''))))
        if (o !== e && !o._wplDropped && o.x >= b[0] && o.x <= b[2] && o.z >= b[1] && o.z <= b[3] && _wcInPoly(foot, o.x, o.z)) return { ok: false, reason: 'would cover ' + o.id, rule: 'overlap' };
    }
    if ((solidLike || _wplOffline(info, e)) && !e.landmark) { const k = _wplInKeep(world, Object.assign({}, e, { x, z }), foot); if (k) return { ok: false, reason: 'blocks ' + k.why, rule: 'blocksPath' }; }
    if (!solidLike && _WPL_NOT_INSIDE.includes(info.cls) && !/^(deck|wall|air)/.test(String(e.attach || ''))) {   // a reed inside a hull, a walker inside a wall
      const P = _wplPrep(world); let inside = null;
      _wplSolidGrid(world).query(x, z, 0.1, id => { const o = P.solidIds.get(id), ob = o ? null : P.obstacleIds.get(id); if ((o && o.id !== e.id && !o._wplDropped && _wcInPoly(o.foot, x, z)) || (ob && ob.kind === 'building' && _wcInPoly(ob.poly, x, z))) inside = id; });
      if (inside) return { ok: false, reason: 'inside ' + inside, rule: 'overlap' };
    }
    return { ok: true, reason: null, attach: _wplAttachAt(world, e, info, x, z) };
  } catch (err) { return { ok: false, reason: 'threw: ' + String(err && err.message || err), rule: 'buildError' }; }
}

/* ---------- moving, turning and dropping entities (children follow their host) ---------- */
function _wplRebuild(world, e, x, z, facing, attach) {
  const info = worldObjectInfo(e.obj), src = e._src || { obj: e.obj, variant: e.variant, id: e.id };
  const entry = Object.assign({}, src, { at: [_wcR3(x), _wcR3(z)], facing: _wcFace(facing) });
  if (attach !== undefined) { if (attach == null) delete entry.attach; else entry.attach = attach; }
  const wasSolid = _wplPrep(world).solidIds.has(e.id);
  if (wasSolid) _wplGridRemove(world, e);
  const fresh = _wcEntity(world, entry, info, world.season || 'summer');
  for (const k of ['x', 'z', 'y', 'facing', 'foot', 'attach', 'host', 'deck', 'waterline', 'lights', 'solidity']) e[k] = fresh[k];
  Object.defineProperty(e, '_src', { value: entry, writable: true, configurable: true, enumerable: false });
  if (_wplPrep(world).grid) _wplGridAdd(world, e);
}
function _wplMove(world, e, x, z, facing, attach) {
  const dx = x - e.x, dz = z - e.z, df = _wcNum(facing) ? facing - e.facing : 0, ox = e.x, oz = e.z;
  _wplRebuild(world, e, x, z, _wcNum(facing) ? facing : e.facing, attach);
  if (world._wplMoved) world._wplMoved.add(e.id);   // re-checked by the solver's final step
  // children on its deck or wall follow (G2 at load): offset rotated with the host
  const a = df * _WC_DEG, cs = Math.cos(a), sn = Math.sin(a);
  for (const c of world.entities) {
    if (c === e || c.host !== e.id || c._wplDropped) continue;
    const ux = c.x - ox, uz = c.z - oz, rx = ux * cs + uz * sn, rz = -ux * sn + uz * cs;
    _wplRebuild(world, c, ox + dx + rx, oz + dz + rz, c.facing + df);
  }
}
function _wplDrop(world, e, log, rule, reason) {
  if (e._wplDropped) return;
  Object.defineProperty(e, '_wplDropped', { value: true, writable: true, configurable: true, enumerable: false });
  _wplGridRemove(world, e);
  log.push({ id: e.id, obj: e.obj, action: 'drop', rule, reason, from: [e.x, e.z], to: null, by: 'sense' });
  for (const c of world.entities) if (c !== e && !c._wplDropped && (c.host === e.id || c.parent === e.id)) _wplDrop(world, c, log, c.host === e.id ? rule : 'orphan', `its ${c.host === e.id ? 'host' : 'parent'} ${e.id} was dropped`);
}
/** The nearest legal spot within radius R (a spiral over rings, 12 angles each), trying the given facings at each. */
function _wplSpiral(world, e, R, facings, test) {
  const rings = [];
  for (let r = 0.25; r <= R + 1e-9; r = r < 1 ? r + 0.25 : r < 4 ? r + 0.5 : r + 1) rings.push(r);
  const start = _wcHash(e.id) % 12;
  for (const r of rings) {
    const n = r < 1 ? 8 : 12;
    for (let k = 0; k < n; k++) {
      const a = ((k + start) / n) * Math.PI * 2, x = e.x + Math.cos(a) * r, z = e.z + Math.sin(a) * r;
      for (const f of facings) { const ok = test(x, z, f); if (ok) return Object.assign({ x, z, facing: f }, ok); }
    }
  }
  return null;
}
const _wplHalf = info => Math.max(info.size.w, info.size.d) / 2;
const _wplLogMove = (log, e, action, rule, reason, from) => log.push({ id: e.id, obj: e.obj, action, rule, reason, from, to: [e.x, e.z], by: 'sense' });

/* ---------- K3: the facing a class's rule asks for at a spot ---------- */
function _wplOrientRule(info) {
  const kb = info.kb && typeof info.kb.orient === 'string' ? info.kb.orient : null;
  if (kb && kb !== 'free') return [kb === 'view' ? 'path' : kb, kb === 'lane' ? 30 : kb === 'rail' ? 12 : kb === 'bank' ? 20 : kb === 'fence' ? 15 : 45];
  return _WPL_ORIENT[info.cls] || null;
}
/** { facing, snap?: [x, z] } the rule asks for at (x, z), or null when the rule has nothing to say there. */
function _wplOrientTarget(world, e, info, rule, x, z) {
  const p = worldPlaceProbe(world, x, z, { orient: true }), near = (dir, cur) => dir == null ? null : (_wcAngDiff(dir, cur) <= _wcAngDiff(dir + 180, cur) ? _wcFace(dir) : _wcFace(dir + 180));
  if (typeof worldKbOrient === 'function' && info.kb && typeof info.kb.orient === 'string') {
    try {
      const r = worldKbOrient(info.kb, p);
      if (r && (r.rule === 'free' || info.kb.orient === 'free')) return null;
      const f = _wcNum(r) ? r : r && _wcNum(r.facing) ? r.facing : null;
      if (f != null) {
        const out = { facing: r && r.either ? near(f, e.facing) : _wcFace(f), tol: r && _wcNum(r.tol) ? r.tol : null };
        if (rule[0] === 'fence' && p.fencePt && p.fenceDist > 0.3) out.snap = p.fencePt;
        return out;
      }
      if (r && typeof r === 'object') return null;   // kb has a rule but nothing to apply here
    } catch (err) { /* the table */ }
  }
  const kind = rule[0];
  if (kind === 'bank') return p.bankDir != null && p.bankDist <= 25 ? { facing: near(p.bankDir, e.facing) } : null;
  if (kind === 'lane') return p.laneDir != null ? { facing: p.laneDir } : null;
  if (kind === 'rail') return p.railDir != null ? { facing: near(p.railDir, e.facing) } : null;
  if (kind === 'path') {   // benches face the path, else the view over water (front-facing: facing is where the sitter looks)
    const P = _wplPrep(world); let best = null;
    for (const w of P.walkLines) { const n = _wcLineNear(w.s.path, x, z); if (n && n.d <= w.half + 6 && (!best || n.d < best.d)) best = n; }
    if (best && best.d > 0.05) return { facing: _wcBearing([x, z], [best.x, best.z]) };
    if (best) return { facing: near(_wcFace(Math.atan2(best.dir[0], best.dir[1]) / _WC_DEG + 90), e.facing) };
    let wb = null;
    for (const g of P.waters) { const s = g.s; if (s.poly) for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) { const d = _wcSegDist(x, z, s.poly[j], s.poly[i]); if (d <= 30 && (!wb || d < wb.d)) wb = { d, a: s.poly[j], b: s.poly[i] }; } }
    if (wb) { const L = Math.hypot(wb.b[0] - wb.a[0], wb.b[1] - wb.a[1]) || 1, t = Math.max(0, Math.min(1, ((x - wb.a[0]) * (wb.b[0] - wb.a[0]) + (z - wb.a[1]) * (wb.b[1] - wb.a[1])) / (L * L))); return { facing: _wcBearing([x, z], [wb.a[0] + t * (wb.b[0] - wb.a[0]), wb.a[1] + t * (wb.b[1] - wb.a[1])]) }; }
    return null;
  }
  if (kind === 'street') {
    const P = _wplPrep(world); let best = null;
    for (const g of P.streets) { const n = _wcLineNear(g.s.path, x, z); if (n && n.d <= 30 && (!best || n.d < best.d)) best = n; }
    return best && best.d > 0.5 ? { facing: _wcBearing([x, z], [best.x, best.z]) } : null;
  }
  if (kind === 'fence') {   // gates sit in their fence line: along the nearest wall, fence, railing or hedge within 1.5 m
    const P = _wplPrep(world); let best = null;
    const lines = (world.lines || []).filter(l => _WPL_LINE_SOLID.includes(l.kind) && Array.isArray(l.path)).map(l => l.path)
      .concat(P.ground.filter(g => g.s.kind === 'hedge' && g.s.path).map(g => g.s.path))
      .concat((world.entities || []).filter(o => o.cls === 'fence' && o !== e && !o._wplDropped && Array.isArray(o.foot)).map(o => { const f = o.foot; return [[(f[0][0] + f[3][0]) / 2, (f[0][1] + f[3][1]) / 2], [(f[1][0] + f[2][0]) / 2, (f[1][1] + f[2][1]) / 2]]; }));
    for (const pth of lines) { const n = _wcLineNear(pth, x, z); if (n && n.d <= 1.5 && (!best || n.d < best.d)) best = n; }
    if (!best) return null;
    return { facing: near(_wcFace(Math.atan2(best.dir[0], best.dir[1]) / _WC_DEG), e.facing), snap: best.d > 0.3 ? [best.x, best.z] : null };
  }
  return null;
}

/* ---------- the solver (12.2) ---------- */
function worldPlace(world) {
  const log = [];
  if (!world || !Array.isArray(world.entities)) return log;
  if (!Array.isArray(world.log)) world.log = [];
  const P = _wplPrep(world);
  P.grid = null;   // a fresh index for this run
  const live = () => world.entities.filter(e => !e._wplDropped);
  const guard = (e, fn) => { try { fn(); } catch (err) { _wplDrop(world, e, log, 'buildError', 'the solver threw on it: ' + String(err && err.message || err)); } };
  const infoOf = e => worldObjectInfo(e.obj);
  // entities whose record is broken (no descriptor, no position) are dropped first (G8)
  for (const e of world.entities) if (!e || !infoOf(e) || !_wcNum(e.x) || !_wcNum(e.z) || !Array.isArray(e.foot)) {
    if (e && typeof e === 'object') _wplDrop(world, e, log, 'buildError', 'the entity record is incomplete');
  }

  // 1. care and region (K9, K7)
  for (const e of live()) guard(e, () => {
    const care = _wcCareOf(e.obj);
    if (care) { _wplDrop(world, e, log, 'careRule', care); return; }
    const info = infoOf(e);
    if (typeof worldKbRegionOk === 'function' && info.kb) {
      const r = worldKbRegionOk(info.kb, world.place || {});
      if (r === false || (r && r.ok === false)) {
        const swap = r && typeof r.swap === 'string' && worldObjectInfo(r.swap) && !_wcCareOf(r.swap) ? r.swap : null;
        if (swap) {   // the local equivalent (a Supertram for a tram elsewhere, a UK bus for a school bus)
          const from = e.obj;
          Object.defineProperty(e, '_src', { value: Object.assign({}, e._src || {}, { obj: swap }), writable: true, configurable: true, enumerable: false });
          e.obj = swap; e.cls = worldObjectInfo(swap).cls; e.height = worldObjectInfo(swap).size.h; e.size = worldObjectInfo(swap).size;
          _wplRebuild(world, e, e.x, e.z, e.facing);
          log.push({ id: e.id, obj: swap, action: 'default', rule: 'regionInvalid', reason: (r.reason || 'not of this region') + ': swapped for the local one (K7)', from, to: swap, by: 'sense' });
        } else _wplDrop(world, e, log, 'regionInvalid', (r && r.reason) || 'does not belong in this region (K7)');
      }
    }
  });

  // 2. parents (K4): every attached class finds its parent within reach, else is re-attached nearer or dropped
  const trees = () => live().filter(o => o.cls === 'tree');
  for (const e of live()) guard(e, () => {
    const info = infoOf(e), kp = info.kb && info.kb.parent && Array.isArray(info.kb.parent.cls) ? info.kb.parent : null, rule = kp || _WPL_PARENT[info.cls];
    if (!rule) return;
    if ((rule.optional || rule.self) && !e.parent) return;   // a lamppost is its own post: a parent only when one is named
    const reach = _wcNum(rule.reach) ? rule.reach : 8, re = rule.re || (rule.match ? new RegExp(rule.match) : null);
    const legal = o => o !== e && !o._wplDropped && (rule.cls.includes(o.cls) || (!!o.kcls && rule.cls.includes(o.kcls))) && (!re || re.test(o.obj));
    // within reach, on the same side, at a plausible height, the trunk in frame or just outside it: kb's worldKbParentOk, else distance and side
    const within = o => {
      if (kp && typeof worldKbParentOk === 'function') { try { const r = worldKbParentOk(info.kb, e, o, { cam: world.cam }); if (r && typeof r.ok === 'boolean') return r.ok; } catch (err) { /* distance */ } }
      return Math.hypot(o.x - e.x, o.z - e.z) <= reach && !(rule.side === 'same' && Math.abs(o.x) > 0.5 && Math.abs(e.x) > 0.5 && Math.sign(o.x) !== Math.sign(e.x));
    };
    const cands = (rule.cls.includes('tree') ? trees() : live()).filter(legal).map(o => ({ o, d: Math.hypot(o.x - e.x, o.z - e.z) })).sort((a, b) => a.d - b.d);
    const named = e.parent ? world.entities.find(o => o.id === e.parent) : null;
    if (named && legal(named) && within(named)) return;
    const best = cands.find(c => within(c.o));
    if (best) { if (e.parent) log.push({ id: e.id, obj: e.obj, action: 'reattach', rule: 'orphan', reason: `its parent ${e.parent} is not a legal parent in reach; re-attached to ${best.o.id}`, from: e.parent, to: best.o.id, by: 'sense' }); e.parent = best.o.id; return; }
    const near = cands.find(c => c.d <= reach * 2 && !(rule.side === 'same' && Math.abs(c.o.x) > 0.5 && Math.abs(e.x) > 0.5 && Math.sign(c.o.x) !== Math.sign(e.x)));
    if (near) {   // within twice the reach: re-attach and bring it within reach of the trunk
      const k = (near.d - reach * 0.7) / near.d, from = [e.x, e.z], f0 = [e.x, e.z];
      _wplMove(world, e, e.x + (near.o.x - e.x) * k, e.z + (near.o.z - e.z) * k, e.facing);
      if (within(near.o)) {
        e.parent = near.o.id;
        log.push({ id: e.id, obj: e.obj, action: 'reattach', rule: 'orphan', reason: `no parent in reach: re-attached to ${near.o.id} and moved within its reach`, from, to: [e.x, e.z], by: 'sense' });
        return;
      }
      _wplMove(world, e, f0[0], f0[1], e.facing);
    }
    if (rule.optional || rule.self) { log.push({ id: e.id, obj: e.obj, action: 'reattach', rule: 'orphan', reason: `its parent ${e.parent} is not in reach: it stands on its own`, from: e.parent, to: null, by: 'sense' }); delete e.parent; return; }
    _wplDrop(world, e, log, 'orphan', `${info.cls} with no ${re ? re.source + ' ' : ''}${rule.cls.join(' or ')} in reach (K4)`);
  });

  // 3. habitat snap (P1, K1): the whole footprint where the class needs it; the nearest legal spot within max(2 m, half its size), else drop
  for (const e of live()) guard(e, () => {
    const info = infoOf(e);
    if (e.landmark || _wplMode(info, e) === 'free') return;
    const src = e._src || {}, att = src.attach ? _wcAttachKind(src.attach) : null, ref = src.attach ? _wcAttachRef(src.attach) : null;
    if (att === 'air' || att === 'wall') return;
    if (att === 'deck' && ref) {   // on a host's deck or a raised surface: stay on it, snap onto it, else come down to the ground
      const host = world.entities.find(o => o.id === ref && !o._wplDropped), surf = !host ? (world.surfaces || []).find(s => s.id === ref) : null;
      const poly = host ? (host.deck ? host.deck.poly : host.foot) : surf && surf.poly ? surf.poly : null;
      const on = (x, z) => host ? _wcInPoly(poly, x, z) || (!host.deck && Math.hypot(x - host.x, z - host.z) <= Math.max(0.5, (infoOf(host).r || 0.3) * 1.5)) : surf ? _wcSurfContains(surf, x, z) : false;
      if (on(e.x, e.z)) return;
      const from = [e.x, e.z], spot = (host || surf) ? _wplSpiral(world, e, Math.max(2, _wplHalf(info)), [e.facing], (x, z) => on(x, z) ? { attach: src.attach } : null) : null;
      if (spot) { _wplMove(world, e, spot.x, spot.z, e.facing); _wplLogMove(log, e, 'snap', 'badAttach', `off the deck of ${ref}: snapped onto it`, from); return; }
      _wplRebuild(world, e, e.x, e.z, e.facing, null);
      log.push({ id: e.id, obj: e.obj, action: 'reattach', rule: 'badAttach', reason: `not on the deck of ${ref}: comes down to the ground`, from: src.attach, to: e.attach, by: 'sense' });
    }
    if (att === 'rail' && ref) {
      const line = (world.surfaces || []).find(s => s.id === ref);
      if (line && line.path) {
        const n = _wcLineNear(line.path, e.x, e.z);
        if (n.d <= (line.width || 3) / 2 + 0.75) return;
        if (n.d <= Math.max(2, _wplHalf(info))) { const from = [e.x, e.z]; _wplMove(world, e, n.x, n.z, e.facing); _wplLogMove(log, e, 'snap', 'badAttach', `off its line ${ref}: snapped onto it`, from); return; }
        _wplDrop(world, e, log, 'badAttach', `${_wcR3(n.d)} m off its line ${ref}`); return;
      }
    }
    // the attachment it takes where it stands (a duck on the bank stands on the ground; a walker over water on the deck)
    const settleAttach = (reasonOk) => {
      const s2 = e._src || {}, explicit = s2.attach && !['water', 'ground'].includes(_wcAttachKind(s2.attach));
      if (explicit) return;
      const a = _wplAttachAt(world, e, info, e.x, e.z);
      if (a === e.attach) return;
      const from = e.attach;
      _wplRebuild(world, e, e.x, e.z, e.facing, a === info.attachOk[0] ? null : a);
      if (reasonOk && from !== e.attach) log.push({ id: e.id, obj: e.obj, action: 'reattach', rule: 'badAttach', reason: `stands ${a === 'water' ? 'in the water' : a.startsWith('deck') ? 'on the deck of ' + _wcAttachRef(a) : 'on the ground'} where it was put`, from, to: e.attach, by: 'sense' });
    };
    // a tree, bench, hedge ... across a walking line is P3's to move beside the path (step 6), not a habitat snap
    if (_wplOffline(info, e) && _wplOnLine(world, e.foot)) return;
    const why = _wplHabitat(world, e, info, e.x, e.z, e.facing);
    if (!why) { settleAttach(true); return; }
    const rule = _wplOrientRule(info), R = Math.max(2, _wplHalf(info)), from = [e.x, e.z], f0 = e.facing;
    // at each candidate: its own facing, else the facing its rule asks for there (a boat parallel to that bank)
    const spot = _wplSpiral(world, e, R, [f0], (x, z) => {
      if (!_wplHabitat(world, e, info, x, z, f0)) return { facing: f0 };
      if (!rule) return null;
      const t = _wplOrientTarget(world, e, info, rule, x, z);
      return t && _wcAngDiff(t.facing, f0) > 1 && !_wplHabitat(world, e, info, x, z, t.facing) ? { facing: t.facing } : null;
    });
    if (spot) {
      _wplMove(world, e, spot.x, spot.z, spot.facing);
      settleAttach(false);
      _wplLogMove(log, e, 'snap', 'badAttach', `${why}: moved ${_wcR3(Math.hypot(e.x - from[0], e.z - from[1]))} m to the nearest legal spot`, from);
      if (_wcAngDiff(spot.facing, f0) > 1) log.push({ id: e.id, obj: e.obj, action: 'rotate', rule: 'orient', reason: 'turned to fit there (K3)', from: f0, to: e.facing, by: 'sense' });
      return;
    }
    _wplDrop(world, e, log, 'badAttach', `${why}, and no legal spot within ${_wcR3(R)} m`);
  });

  // 3b. the near band (A10, C2): a person or animal nearer than the depth where it would fill 45 % of the frame is a giant at
  //     the lens; it moves back along its line of sight (the same place on screen, at its true size) or is dropped
  //     ... and (bug 4) a non-framing low static (a bramble, a shrub, a reed stand) that would fill the frame's corner as a blob
  const cam = world.cam;
  const nearFix = (e) => {
    const info = infoOf(e);
    if (e.landmark || e.framed || /^(air|wall)/.test(String(e.attach))) return;
    let band = 0, why = null;
    if (_WPL_NEAR_BAND.includes(info.cls)) {
      // the drawn box (the art's own margins, a tall adult of K8's range) runs up to ~10 % over the class height: keep that margin
      // ... and its foot is in the frame (a thing whose foot is below the bottom edge is a cut blob: the near band of the nav map)
      const foot = _wcNum(cam.eye) && _wcNum(cam.horizon) && cam.horizon < 900 ? cam.f * Math.max(0.2, cam.eye - (_wcNum(e.y) ? e.y : 0)) / (900 - cam.horizon) + 0.3 : 0;
      // a person or animal is a giant when it would fill 45 % of the frame; an inanimate prop (a bollard, a post, a bin, a bench) is a dark
      // blob in the frame's corner when it fills even a quarter of it, whatever its real height (a 5 m lamp is thin: it is the 1.3 m a
      // blob is made of): such a prop keeps to where a 1.3 m thing is about 20 % of the frame
      const prop = _WPL_PROPS.includes(info.cls), hRef = Math.max(info.size.h, _wcNum(e.height) ? e.height : 0);
      band = Math.max(prop ? cam.f * Math.min(hRef, 1.3) / 180 : cam.f * hRef * 1.1 / 405, foot);
      if (!(e.z < band)) return;
      why = `${_wcR3(e.z)} m from the lens it would be a giant (the near band ends at ${_wcR3(band)} m)`;
    } else {
      // a low static (a bramble, a shrub, a reed clump) at the lens: a blob, not a frame (bug 4)
      const g = _wplGiant(world, e, info, e.x, e.z, e.facing);
      if (!g) return;
      why = `${info.cls} ${g}: a blob, not a frame (bug 4)`;
    }
    const from = [e.x, e.z], z0 = Math.max(0.3, e.z), z1 = Math.max(band + 0.3, e.z + 0.5);
    // (bug 5) a thing placed beside a line (a towpath, a bank) first slides back ALONG that line, and no candidate may come
    // nearer the water or leave the path it stood on: down the camera ray a towpath-edge bollard landed on the canal edge
    let p0 = null;
    try { p0 = worldPlaceProbe(world, e.x, e.z); } catch (err) { p0 = null; }
    const landed = p0 && !p0.inWater && Number.isFinite(p0.waterDist);
    const lineTags = p0 ? (p0.tags || []).filter(t => t === 'path' || t === 'towpath' || t === 'bank') : [];
    const keep = (x, z) => {
      if (!landed && !lineTags.length) return true;
      let p = null;
      try { p = worldPlaceProbe(world, x, z); } catch (err) { return false; }
      if (landed && !(p.waterDist >= Math.min(p0.waterDist, 0.6) - 0.05)) return false;
      return lineTags.every(t => (p.tags || []).includes(t));
    };
    // (people and animals keep their place on screen: they move down their line of sight, A10; things set by a line slide along it)
    const mover = /^(person|animal|bird|dog|duck|swan|goose|coot|heron|gull|grebe|cyclist|grazer)$/.test(String(info.cls)) || /^(person|animal|bird)\./.test(String(e.obj));
    const dir = !mover && p0 ? (p0.pathDir != null && p0.pathDist <= (p0.pathHalf || 0) + 1.5 ? p0.pathDir : landed && p0.waterDist <= 3 ? p0.bankDir : null) : null;
    if (dir != null) {
      const ux = Math.sin(dir * _WC_DEG), uz = Math.cos(dir * _WC_DEG), sg = uz >= 0 ? 1 : -1;
      for (let k = 0; k < 40; k++) {
        const t = sg * (0.5 + k * 0.5), x = e.x + ux * t, z = e.z + uz * t;
        if (z < band + 0.3) continue;
        if (keep(x, z) && worldPlaceOk(world, e, x, z, e.facing).ok) { _wplMove(world, e, x, z, e.facing); _wplLogMove(log, e, 'move', 'nearBand', `${why}: moved back along its line`, from); return; }
      }
    }
    for (let k = 0; k < 24; k++) {
      const z = z1 + k * 0.5;
      for (const x of [e.x * z / z0, e.x]) {
        if (Math.abs(x - e.x) > 30) continue;
        if (keep(x, z) && worldPlaceOk(world, e, x, z, e.facing).ok) { _wplMove(world, e, x, z, e.facing); _wplLogMove(log, e, 'move', 'nearBand', `${why}: moved back`, from); return; }
      }
    }
    _wplDrop(world, e, log, 'nearBand', `${why}, with no legal spot behind it`);
  };
  if (cam && _wcNum(cam.f) && cam.f > 0) for (const e of live()) guard(e, () => nearFix(e));
  // every later move is re-checked at the end (step 8: order-independent, bug 4 / 5)
  const moved = new Set();
  Object.defineProperty(world, '_wplMoved', { value: moved, writable: true, configurable: true, enumerable: false });

  // 3c. terrain hides things (W2): an entity wholly behind a nearer rise of the ground (a house on the plateau behind the face of a hill)
  //     is not in the picture; it is dropped and logged, never drawn floating in the sky above the slope
  if (cam && cam.relief && typeof sceneGroundHeight === 'function' && _wcNum(cam.f) && cam.f > 0 && _wcNum(cam.horizon)) for (const e of live()) guard(e, () => {
    if (e.backdrop || !(e.z > 1) || /^(air|wall|water)/.test(String(e.attach)) || _wcNum(e.waterline)) return;
    const info = infoOf(e), x0 = _wcNum(cam.x0) ? cam.x0 : 800, top = (_wcNum(e.y) ? e.y : sceneGroundHeight(cam, e.x, e.z)) + Math.max(0.3, _wcNum(e.height) ? e.height : info.size.h);
    // the entity's top on the screen, and the highest rim of the ground nearer than it along that column
    const Y = cam.horizon + cam.f * (cam.eye - top) / e.z, X = x0 + cam.f * e.x / e.z;
    let rim = Infinity;
    for (let k = 1; k <= 40; k++) {
      const d = e.z * (1 - k / 41), xd = (X - x0) * d / cam.f;
      if (d < 0.5) break;
      rim = Math.min(rim, cam.horizon + cam.f * (cam.eye - sceneGroundHeight(cam, xd, d)) / d);
    }
    if (Y > rim + 3) _wplDrop(world, e, log, 'terrain', `hidden behind a nearer rise of the ground (its top is ${_wcR3(Y - rim)} px below the rim): it would float in the sky above the slope`);
  });

  // 4. orientation (K3): boats parallel to the bank, cars along their lane (UK left), trains on the rails, benches face the path
  //    or the view, gates in their fence line, buildings to their street; the author's facing stands when it already fits
  for (const e of live()) guard(e, () => {
    const info = infoOf(e), rule = _wplOrientRule(info);
    if (!rule || e.landmark || /^(air|wall)/.test(String(e.attach))) return;
    if (_wplOffline(info, e) && _wplOnLine(world, e.foot)) return;   // P3 (step 6) moves and turns it beside the path
    const t = _wplOrientTarget(world, e, info, rule, e.x, e.z);
    if (!t) return;
    const off = _wcAngDiff(t.facing, e.facing), from = e.facing, fromAt = [e.x, e.z], tol = _wcNum(t.tol) ? t.tol : rule[1];
    const snapTo = t.snap && Math.hypot(t.snap[0] - e.x, t.snap[1] - e.z) > 0.3 ? t.snap : null;
    if (off <= tol && !snapTo) return;
    const x = snapTo ? snapTo[0] : e.x, z = snapTo ? snapTo[1] : e.z, face = off <= tol ? e.facing : t.facing;
    if (!_wplHabitat(world, e, info, x, z, face)) {
      _wplMove(world, e, x, z, face);
      if (snapTo) _wplLogMove(log, e, 'snap', 'orient', 'set into its fence line (K3)', fromAt);
      if (_wcAngDiff(face, from) > 0.5) log.push({ id: e.id, obj: e.obj, action: 'rotate', rule: 'orient', reason: `${rule[0] === 'lane' ? 'turned to drive on the left of its lane' : rule[0] === 'bank' ? 'turned parallel to the bank' : rule[0] === 'rail' ? 'turned along the rails' : rule[0] === 'path' ? 'turned to face the path or the view' : rule[0] === 'fence' ? 'turned into its fence line' : 'turned to face its street'} (K3, ${_wcR3(off)} degrees off)`, from, to: e.facing, by: 'sense' });
      return;
    }
    const spot = _wplSpiral(world, e, Math.max(2, _wplHalf(info)), [face], (sx, sz, f) => _wplHabitat(world, e, info, sx, sz, f) ? null : { attach: undefined });
    if (spot) {
      _wplMove(world, e, spot.x, spot.z, face);
      _wplLogMove(log, e, 'move', 'orient', `turned by its rule (K3, ${_wcR3(off)} degrees off) and moved to fit`, fromAt);
      log.push({ id: e.id, obj: e.obj, action: 'rotate', rule: 'orient', reason: 'turned by its rule (K3)', from, to: e.facing, by: 'sense' });
    }
  });

  // keep-clear zones (P2, P3): both sides of an open gate, both ends of a bridge or boardwalk
  P.keep = [];
  for (const e of live()) {
    const info = infoOf(e);
    if (info.cls === 'gate' && e.solidity === 'passable') {
      const f = (e.facing + 90) * _WC_DEG;
      for (const sg of [1, -1]) P.keep.push({ x: e.x + Math.sin(f) * 1.1 * sg, z: e.z + Math.cos(f) * 1.1 * sg, r: 0.9, owner: e.id, why: 'the approach to gate ' + e.id });
    }
    if (info.cls === 'walkway' && e.deck && info.size.w >= 4) {
      const f = e.facing * _WC_DEG, h = info.size.w / 2 + 0.8;
      for (const sg of [1, -1]) { const x = e.x + Math.sin(f) * h * sg, z = e.z + Math.cos(f) * h * sg; if (!worldPlaceProbe(world, x, z).inWater) P.keep.push({ x, z, r: _WPL_KEEP_R, owner: e.id, why: 'the approach to ' + e.id }); }
    }
  }
  for (const s of P.raisedS) if (s.kind === 'bridge-deck' && Array.isArray(s.path)) for (const q of [s.path[0], s.path[s.path.length - 1]]) P.keep.push({ x: q[0], z: q[1], r: _WPL_KEEP_R, owner: s.id, why: 'the approach to ' + s.id });

  // 5. overlaps and clearance (P2): solid footprints never intersect. Landmarks first (immovable), then authored, then generated;
  //    the later (or the much smaller) one is pushed apart, else moved within reach, else dropped
  _wplSolidGrid(world);
  for (const id of [...P.solidIds.keys()]) { P.grid.remove(id); P.solidIds.delete(id); }   // re-enter them in order
  const order = live().filter(_wplIsSolid).sort((a, b) => (b.landmark ? 1 : 0) - (a.landmark ? 1 : 0) || (a.auto ? 1 : 0) - (b.auto ? 1 : 0) || (a.cluster ? 1 : 0) - (b.cluster ? 1 : 0));
  const area = e => Math.abs(_wcPolyArea(e.foot));
  const settle = (e) => {
    const info = infoOf(e), from = [e.x, e.z];
    const free = (x, z, f) => { const ok = worldPlaceOk(world, e, x, z, f); return ok.ok ? ok : null; };
    for (let it = 0; it < 3; it++) {
      const ov = _wplOverlaps(world, e, e.foot, info);
      if (!ov.length) return true;
      const o = ov[0], nx = o.sat.nx, nz = o.sat.nz, d = o.sat.depth + 0.06, x = e.x + nx * d, z = e.z + nz * d;
      if (free(x, z, e.facing)) { _wplMove(world, e, x, z, e.facing); _wplLogMove(log, e, 'move', 'overlap', `overlapped ${o.id} by ${_wcR3(o.sat.depth)} m: pushed apart`, from); return true; }
      break;
    }
    const spot = _wplSpiral(world, e, Math.max(2, _wplHalf(info)), [e.facing], free);
    if (spot) { _wplMove(world, e, spot.x, spot.z, e.facing); _wplLogMove(log, e, 'move', 'overlap', `overlapped another solid: moved ${_wcR3(Math.hypot(e.x - from[0], e.z - from[1]))} m to a free spot`, from); return true; }
    return false;
  };
  for (const e of order) guard(e, () => {
    if (e._wplDropped) return;
    const info = infoOf(e);
    if (e.landmark) { _wplGridAdd(world, e); return; }
    const ov = _wplOverlaps(world, e, e.foot, info);
    if (!ov.length) { _wplGridAdd(world, e); return; }
    // the much smaller earlier one moves instead (a tree trunk out of a later building's way), never a landmark
    const small = ov.find(o => !o.landmark && o.ent && area(o.ent) < area(e) * 0.5);
    if (small && ov.length === 1) {
      _wplGridAdd(world, e);
      _wplGridRemove(world, small.ent);
      if (settle(small.ent)) _wplGridAdd(world, small.ent); else _wplDrop(world, small.ent, log, 'overlap', `overlaps ${e.id} and has no free spot within reach`);
      return;
    }
    if (settle(e)) _wplGridAdd(world, e); else _wplDrop(world, e, log, 'overlap', `overlaps ${ov[0].id} and has no free spot within reach`);
  });
  // passable things (reeds, shrubs, people, animals) never stand inside a hull, a building, a wall or a bench
  for (const e of live()) guard(e, () => {
    const info = infoOf(e);
    if (info.solidity === 'solid' || !_WPL_NOT_INSIDE.includes(info.cls) || /^(air|wall|deck)/.test(String(e.attach))) return;
    let inside = null;
    _wplSolidGrid(world).query(e.x, e.z, 0.1, id => { const o = P.solidIds.get(id), ob = o ? null : P.obstacleIds.get(id); if ((o && o !== e && !o._wplDropped && _wcInPoly(o.foot, e.x, e.z)) || (ob && ob.kind === 'building' && _wcInPoly(ob.poly, e.x, e.z))) inside = id; });
    if (!inside) return;
    const from = [e.x, e.z], spot = _wplSpiral(world, e, Math.max(2, _wplHalf(info)), [e.facing], (x, z, f) => { const ok = worldPlaceOk(world, e, x, z, f); return ok.ok ? ok : null; });
    if (spot) { _wplMove(world, e, spot.x, spot.z, e.facing); _wplLogMove(log, e, 'move', 'overlap', `stood inside ${inside}: moved out`, from); }
    else _wplDrop(world, e, log, 'overlap', `stands inside ${inside} with no free spot within reach`);
  });

  // 6. paths clear (P3): nothing stands on a walking line; closed gates across a path open; gate and bridge approaches stay clear
  for (const e of live()) guard(e, () => {
    const info = infoOf(e);
    if (!_wplOffline(info, e)) return;
    const line = _wplOnLine(world, e.foot), keep = !line && (info.solidity === 'solid' || _WPL_OFFLINE.includes(info.cls)) ? _wplInKeep(world, e, e.foot) : null;
    if (!line && !keep) return;
    if (info.cls === 'gate' && line) {
      if (e.solidity !== 'passable') {
        Object.defineProperty(e, '_src', { value: Object.assign({}, e._src || {}, { open: true }), writable: true, configurable: true, enumerable: false });
        _wplGridRemove(world, e); e.solidity = 'passable';
        log.push({ id: e.id, obj: e.obj, action: 'default', rule: 'blocksPath', reason: `a closed gate across ${line}: it stands open`, from: 'closed', to: 'open', by: 'sense' });
      }
      return;
    }
    const from = [e.x, e.z], free = (x, z, f) => { const ok = worldPlaceOk(world, e, x, z, f); return ok.ok ? ok : null; };
    let spot = null;
    if (line) {   // sideways off the path, on the side it stands (else the other); turned to fit beside the path when needed
      const s = P.walkLines.find(w => w.s.id === line), n = _wcLineNear(s.s.path, e.x, e.z), nx = -n.dir[1], nz = n.dir[0];
      const along = _wcFace(Math.atan2(n.dir[0], n.dir[1]) / _WC_DEG), side = n.side >= 0 ? -1 : 1;
      const ext = f => { const ft = _wcFoot(info, 0, 0, f); return Math.max(...ft.map(p => Math.abs(p[0] * nx + p[1] * nz))); };   // half its width across the path
      const rule = _wplOrientRule(info);
      outer: for (const sg of [side, -side]) {
        const lookBack = _wcBearing([nx * sg, nz * sg], [0, 0]);   // a front-facing thing looks back at the path
        const probeAt = s.half + ext(e.facing) + 0.12, t = rule ? _wplOrientTarget(world, e, info, rule, n.x + nx * probeAt * sg, n.z + nz * probeAt * sg) : null;
        const faces = (rule ? [t && t.facing, info.front ? lookBack : along, e.facing] : [e.facing, along]).filter((f, k, a) => _wcNum(f) && a.findIndex(q => _wcNum(q) && _wcAngDiff(q, f) < 0.5) === k);
        for (const f of faces) for (const extra of [0.12, 0.5, 1.1]) {
          const off = s.half + ext(f) + extra, x = n.x + nx * off * sg, z = n.z + nz * off * sg;
          const ok = free(x, z, f); if (ok) { spot = { x, z, facing: f }; break outer; }
        }
      }
    }
    if (!spot) spot = _wplSpiral(world, e, Math.max(2, _wplHalf(info)) + (line ? 2 : 0), [e.facing], free);
    if (spot) {
      const f0 = e.facing; _wplMove(world, e, spot.x, spot.z, spot.facing);
      _wplLogMove(log, e, 'move', 'blocksPath', line ? `stood on the walking line of ${line}: moved to its edge` : `blocked ${keep.why}: moved clear`, from);
      if (_wcAngDiff(f0, e.facing) > 0.5) log.push({ id: e.id, obj: e.obj, action: 'rotate', rule: 'blocksPath', reason: info.front ? 'turned to face the path from beside it (K3)' : 'turned along the path to fit beside it', from: f0, to: e.facing, by: 'sense' });
      return;
    }
    _wplDrop(world, e, log, 'blocksPath', line ? `stands on the walking line of ${line} with no room beside it` : `blocks ${keep.why} with no room to move`);
  });

  // 7. no rows or grids (P4): a detector over authored and clustered natural placements jitters any that are not declared real
  const groups = new Map();
  for (const e of live()) {
    const info = infoOf(e), g = info.kb && info.kb.group && info.kb.group.kind;
    const natural = _WPL_NATURAL.includes(info.cls) && !['traffic', 'nose-tail', 'row'].includes(g);
    if (!natural || e.landmark || e.row || e.auto || /^(air|wall|deck)/.test(String(e.attach))) continue;
    const k = info.kcls || info.cls; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e);
  }
  for (const [, list] of groups) {
    if (list.length < 4) continue;
    let rows = [];
    try { rows = _wplRowMembers(list); } catch (err) { rows = []; }
    for (const { e, d: sp } of rows) guard(e, () => {
      if (e._wplDropped) return;
      const info = infoOf(e), rnd = _wcRng(_wcHash('jitter|' + e.id + '|' + (world.seed | 0))), from = [e.x, e.z];
      for (let k = 0; k < 6; k++) {
        const a = rnd() * Math.PI * 2, d = Math.min(6, sp * (0.25 + rnd() * 0.2)) * (1 - k * 0.12), x = e.x + Math.cos(a) * d, z = e.z + Math.sin(a) * d;
        if (worldPlaceOk(world, e, x, z, e.facing).ok) { _wplMove(world, e, x, z, e.facing); _wplLogMove(log, e, 'jitter', 'gridRow', `in an even row or grid of ${info.cls} (P4): jittered ${_wcR3(d)} m`, from); return; }
      }
    });
  }

  // 8. the final check (order-independent, bugs 4 and 5): whatever steps 4-7 moved or turned is checked again against its habitat
  //    (K1) and the near band (A10, C2, bug 4); a move never leaves a thing where no step would have put it. Snapped back within
  //    reach, else moved back along its line of sight, else dropped.
  Object.defineProperty(world, '_wplMoved', { value: null, writable: true, configurable: true, enumerable: false });
  for (const e of live()) guard(e, () => {
    if (e.landmark) return;
    const info = infoOf(e);
    if (moved.has(e.id) && _wplMode(info, e) !== 'free' && !/^(air|wall|deck)/.test(String(e.attach || ''))) {
      const why = _wplHabitat(world, e, info, e.x, e.z, e.facing);
      if (why) {
        const from = [e.x, e.z], spot = _wplSpiral(world, e, Math.max(2, _wplHalf(info)), [e.facing], (x, z, f) => { const ok = worldPlaceOk(world, e, x, z, f); return ok.ok ? ok : null; });
        if (spot) { _wplMove(world, e, spot.x, spot.z, e.facing); _wplLogMove(log, e, 'snap', 'badAttach', `moved by a later rule onto a wrong spot (${why}): snapped back`, from); }
        else { _wplDrop(world, e, log, 'badAttach', `moved by a later rule onto a wrong spot (${why}) with no legal spot near`); return; }
      }
    }
    if (cam && _wcNum(cam.f) && cam.f > 0) nearFix(e);
  });

  world.entities = world.entities.filter(e => !e._wplDropped);
  for (const r of log) world.log.push(r);
  return log;
}
/** The members of rows (>= 4 collinear, evenly spaced) and grids (4 equal neighbours at right angles) in a group (P4). */
function _wplRowMembers(list) {
  const g = _wplGridLocal(8), byId = new Map(), out = new Map();
  for (const e of list) { g.add(e.id, e.x, e.z, 0); byId.set(e.id, e); }
  const near = (e, k) => {
    const res = [];
    for (let r = 4; r <= 64 && res.length < k; r *= 2) { res.length = 0; g.query(e.x, e.z, r, id => { const o = byId.get(id); if (o !== e) { const d = Math.hypot(o.x - e.x, o.z - e.z); if (d <= r) res.push({ o, d }); } }); }
    return res.sort((a, b) => a.d - b.d).slice(0, k);
  };
  const interior = new Map();
  for (const e of list) {
    const nn = near(e, 4);
    if (nn.length < 2) continue;
    const [a, b] = nn, ang = Math.acos(Math.max(-1, Math.min(1, ((a.o.x - e.x) * (b.o.x - e.x) + (a.o.z - e.z) * (b.o.z - e.z)) / (a.d * b.d)))) / _WC_DEG;
    const even = Math.abs(a.d - b.d) / Math.max(a.d, b.d) < 0.1 && a.d > 0.2;
    // collinear: the middle point within 0.35 m of the line through its two neighbours
    const lx = b.o.x - a.o.x, lz = b.o.z - a.o.z, L = Math.hypot(lx, lz) || 1, res = Math.abs((e.x - a.o.x) * lz - (e.z - a.o.z) * lx) / L;
    if (even && ang > 165 && res < 0.35) interior.set(e, [a.o, b.o, a.d]);
    else if (nn.length >= 4 && even && Math.abs(nn[3].d - nn[0].d) / nn[3].d < 0.08) {
      const dirs = nn.map(n => Math.atan2(n.o.x - e.x, n.o.z - e.z) / _WC_DEG).sort((p, q) => p - q), gaps = dirs.map((d, i) => ((dirs[(i + 1) % 4] - d) + 360) % 360);
      if (gaps.every(q => Math.abs(q - 90) < 8)) interior.set(e, [nn[0].o, nn[1].o, nn[0].d]);
    }
  }
  // a row is >= 2 linked interior points (>= 4 members); a grid >= 2 interior points too
  for (const [e, [a, b, d]] of interior) {
    if (!(interior.has(a) || interior.has(b))) continue;
    for (const m of [e, a, b]) if (!out.has(m)) out.set(m, d);
  }
  return [...out].map(([e, d]) => ({ e, d }));
}

/** Build, orient and place one new entity through the solver's rules (the fill, the tools). why: an action ('fill' | 'dress' | 'frame' | 'edge') or { action, rule, reason, by, snap }. */
function worldPlaceAdd(world, e, why) {
  try {
    if (!world || !e || typeof e !== 'object' || !Array.isArray(world.entities)) return null;
    const w = typeof why === 'string' ? (['fill', 'dress', 'frame', 'edge', 'snap', 'move'].includes(why) ? { action: why } : { action: 'fill', reason: why }) : (why || {});
    const action = w.action || 'fill', by = w.by || (['fill', 'dress', 'frame', 'edge'].includes(action) ? 'kb' : 'sense');
    const obj = e.obj, info = worldObjectInfo(obj);
    if (!info || _wcCareOf(obj)) return null;
    const at = _wcPt(e.at) ? e.at : (_wcNum(e.x) && _wcNum(e.z) ? [e.x, e.z] : null);
    if (!at) return null;
    const entry = { obj, at: [_wcR3(at[0]), _wcR3(at[1])] };
    for (const k of ['facing', 'variant', 'attach', 'y', 'open', 'blocks', 'framed', 'row', 'parent']) if (e[k] != null) entry[k] = e[k];
    const ent = _wcEntity(world, entry, info, world.season || 'summer');
    let id = e.id || `${action}:${obj}@${entry.at[0]},${entry.at[1]}`, k = 2;
    const ids = new Set(world.entities.map(o => o.id));
    while (ids.has(id)) id = (e.id || `${action}:${obj}@${entry.at[0]},${entry.at[1]}`) + '#' + (k++);
    ent.id = id; ent.auto = e.auto || (action === 'dress' ? 'edge' : action);
    if (e.framed) ent.framed = true;
    // K3 when the facing was left out
    const rule = _wplOrientRule(info);
    if (rule && e.facing == null) { const t = _wplOrientTarget(world, ent, info, rule, ent.x, ent.z); if (t) _wplRebuild(world, ent, ent.x, ent.z, t.facing); }
    let ok = worldPlaceOk(world, ent, ent.x, ent.z, ent.facing);
    if (!ok.ok && w.snap !== false) {
      const spot = _wplSpiral(world, ent, Math.max(1, Math.min(2, _wplHalf(info))), [ent.facing], (x, z, f) => { const r = worldPlaceOk(world, ent, x, z, f); return r.ok ? r : null; });
      if (!spot) return null;
      _wplRebuild(world, ent, spot.x, spot.z, ent.facing);
      ok = worldPlaceOk(world, ent, ent.x, ent.z, ent.facing);
    }
    if (!ok.ok) return null;
    if (ok.attach && ok.attach !== ent.attach && !entry.attach) _wplRebuild(world, ent, ent.x, ent.z, ent.facing, ok.attach === 'ground' ? null : ok.attach);
    world.entities.push(ent);
    if (_wplPrep(world).grid) _wplGridAdd(world, ent);
    if (Array.isArray(world.log) && w.log !== false) world.log.push({ id: ent.id, obj, action, rule: w.rule || 'fill', reason: w.reason || 'auto-placed', from: null, to: [ent.x, ent.z], by });
    return ent;
  } catch (err) { return null; }
}

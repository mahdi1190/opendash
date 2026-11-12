/* ============================================================
   GARDEN, the world you walk in (2.22). User request, 30 Oct 2026: "I want the player to always be in the garden ... you can
   move the player around with click" and "the controls are shit". You are IN the garden: your profile's figure (the one the scenes
   use) stands on the grass, walks where you click, and your pet follows. The camera follows you (or shows the whole garden).

     gardenWorldPainted(m)         after every paint of the stage: put the player, the pet and the camera back (the page calls it)
     gardenWorldStart(root) / gardenWorldStop()     the loop (one requestAnimationFrame, paused with the tab)
     gardenWorldClick(it, cell, ev, m)   a click on the stage: true when the world took it. You just click what you want: a building or a board
                                       (you walk to its door and it opens), a bug (you creep up and net it), the water (you cast), the ground (you walk there)
   gardenWorldHover(ev, cell, it)      what is under the pointer: {kind: 'prop' | 'bug' | 'water', text}, for the status line and the cursor
   gardenGoToProp(id)                  walk to a building's door and go in
     gardenWorldKey(ev, down)      WASD and the arrows walk, Space / E do the thing in front of you, + - Fit the camera
     gardenWalkToPoint(pt, then)   walk to a point (free movement: a straight line round whatever is in the way, not cell to cell), then `then`
   gardenWalkTo(cell, then)      the same for the middle of a cell
     gardenWalkable(x, y)          can you stand here?
     gardenWorldFace(cell)         turn to face a cell (the tools use this: you look at what you water)

   The player is a node inside the objects layer, put in depth order by its row (data-z), so you walk behind trees and in front of
   flowers. Everything that moves is driven by this loop and written as attributes, so the scene's own patching (which only
   touches plants, decorations and visitors) never restarts it. Reduced motion: you still walk (it is how the garden works), but
   without the bob, the camera glide or the pet's trot.
   ============================================================ */
const _gw = {
  on: false, raf: 0, last: 0, svg: null, root: null, box: null, ro: null,
  px: GARDEN_WORLD.start.x + 0.5, py: GARDEN_WORLD.start.y + 0.5, face: 1, speed: 0, moving: false, sneak: false,
  path: [], then: null, goal: null,
  node: null, body: '', bodyKey: '', fig: { idle: '', walk: '' },
  z: -1, pet: null, petSvg: '', petKey: '',
  cam: { x: 0, y: 0, w: 0, h: 0, vh: 0, mode: 'follow', init: false, dirty: true },
  keys: new Set(), grid: null, gridKey: '', saveT: 0, size: { w: 0, h: 0 },
};
const GW_SPEED = Object.freeze({ walk: 215, sneak: 92, run: 300 });   // pixels of stage a second (a cell is 48 x 30 of them)
const GW_ZOOMS = Object.freeze([230, 290, 360, 450, 560, 690, 860, 1040]);   // how many stage units tall the window shows (2.23: two more steps: the world is bigger)
const GW_SCALE = 0.74;                                                // the figure's size: 70 units tall -> about 52 px
const GW_PET_SCALE = 0.5;                                             // your pet, drawn at two thirds of the size the garden uses for a wandering one: it comes up to your knee

/* ---------- the grid you walk on ---------- */
/** You walk through what you plant, so a full bed never walls you off: only a tree that has grown past a seedling stands in the way (its trunk, below). */
function gardenPlantBlocks(p) { return !!(p && p.def && p.def.cat === 'tree' && p.stage >= 2); }
/*
 * What has collisions, and how big (2.28; the owner, 31 Oct 2026: "collisions are weird in the garden ... rethink what has collisions and how big they are").
 * Three sizes, so a flower pot is not a wall:
 *   'none'  you walk through or over it: flat things (a picnic blanket), things you walk under (an arch, a pergola) or that hang (string lights, bunting)
 *   'soft'  a small box where it stands: a lantern, a bird bath, a gnome. About half a cell wide and a third deep at its base, so you slip past it
 *   'full'  the whole footprint, like a wall: fences, walls, hedges, benches and seats (you walk up to sit), a fountain, a shed
 * Trees block their trunk only (a small box at the foot), so the leaves are for walking behind. A catalogue row may say `col: 'none' | 'soft' | 'full'`
 * for itself. Soft boxes are not in the cell grid the routes are planned on (a cell with a lantern in it is still a cell you cross), only in what the
 * feet are tested against (_gwFree, gardenWorldFree), so you go round them instead of the route avoiding the whole cell.
 */
const GARDEN_COL_NONE = new Set(['picnic-blanket', 'sprinkler', 'solar-lights', 'toadstool-lamps', 'string-lights', 'paper-lanterns', 'festive-lights', 'bunting', 'rose-arch', 'pergola',
  'painted-eggs', 'leaf-pile', 'hanging-basket', 'wind-chimes', 'stone-frog', 'old-watering-can', 'bait-bucket']);
const GARDEN_COL_FULL = new Set(['picket-fence', 'wattle-fence', 'box-hedge', 'stone-wall', 'iron-railings', 'bamboo-screen', 'bench', 'stone-bench', 'swing-seat', 'hammock', 'deckchair', 'bistro-set',
  'driftwood-seat', 'fountain', 'mini-pond', 'wishing-well', 'potting-shed', 'gazebo', 'cold-frame', 'aquarium', 'trophy-board']);
/** 'none' | 'soft' | 'full' for a decoration (unknown ones are soft: a small box is the safe middle). */
function gardenDecorCol(def) {
  if (!def) return 'full';
  if (def.col === 'none' || def.col === 'soft' || def.col === 'full') return def.col;
  if (GARDEN_COL_NONE.has(def.id)) return 'none';
  if (GARDEN_COL_FULL.has(def.id) || (def.effect && def.effect.kind === 'sit')) return 'full';
  return 'soft';
}
/** The boxes the feet are tested against besides the cell grid: [{x0, y0, x1, y1}] in cells, and which cells each touches. */
function _gwBuildSolids(m) {
  const list = [], at = new Map();
  const add = (x0, y0, x1, y1) => {
    const r = { x0, y0, x1, y1 }; list.push(r);
    for (let cy = Math.floor(y0); cy <= Math.floor(y1 - 1e-6); cy++) for (let cx = Math.floor(x0); cx <= Math.floor(x1 - 1e-6); cx++) { const k = cx + ',' + cy; (at.get(k) || at.set(k, []).get(k)).push(r); }
  };
  for (const p of m.plants) {
    if (!gardenPlantBlocks(p)) continue;
    const fp = p.fp || 1, cx = p.x + fp / 2, foot = p.y + fp - 0.08, w = fp > 1 ? 0.5 : 0.4, d = fp > 1 ? 0.32 : 0.28;
    add(cx - w / 2, foot - d, cx + w / 2, foot);   // the trunk: the leaves are for walking behind
  }
  for (const dc of m.decor) {
    const def = dc.def; if (!def || def.layer === 'ground' || gardenDecorCol(def) !== 'soft') continue;
    const w = def.w || 1, h = def.h || 1, cx = dc.x + w / 2, foot = dc.y + h - 0.08, bw = Math.min(w, 2) * 0.5, d = 0.28 + (h > 1 ? 0.3 : 0);
    add(cx - bw / 2, foot - d, cx + bw / 2, foot);
  }
  for (const p of gardenPropsNow()) {
    if (p.needs && !gardenWorkOwned(p.needs)) continue;
    if (gardenPropCol(p) !== 'soft') continue;
    const cx = p.x + p.w / 2, foot = p.y + p.h - 0.08, bw = Math.min(p.w, 2) * 0.5, d = 0.28;
    add(cx - bw / 2, foot - d, cx + bw / 2, foot);   // a lectern, a camera, a post box: a small box at the base, so there is room beside it
  }
  return { list, at };
}
/** Do feet (half width fx, half depth fy, in cells) at x, y touch one of the boxes? */
function _gwSolidHit(x, y, fx, fy) {
  const S = _gw.solids; if (!S || !S.list.length) return false;
  for (let cy = Math.floor(y - fy); cy <= Math.floor(y + fy); cy++) for (let cx = Math.floor(x - fx); cx <= Math.floor(x + fx); cx++) {
    const rs = S.at.get(cx + ',' + cy); if (!rs) continue;
    for (const r of rs) if (x + fx > r.x0 && x - fx < r.x1 && y + fy > r.y0 && y - fy < r.y1) return true;
  }
  return false;
}
function _gwBuildGrid(m) {
  const W = GARDEN_WORLD, g = new Uint8Array(W.cols * W.rows), otherWater = new Uint8Array(g.length), waterCover = new Uint8Array(g.length), shore = typeof gardenLakeGeometry === 'function' ? gardenLakeGeometry(m) : null;
  const lvl = m.level.level;
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    let blocked = false;
    const a = gardenAreaAt(x, y, lvl);
    if (a.startsWith('locked:')) blocked = true;                     // behind the little fence
    const pr = gardenPropAt(x, y), pc = pr ? gardenPropCol(pr) : '';
    if (pc === 'full') blocked = true;                                // (a shop is a wall; a lectern is a box, the mooring post, the reeds and the boat nothing: _gwBuildSolids)
    const water = (!pr || pc === 'none' && !pr.walk) && gardenIsWater(x, y);
    if (water && !(shore && shore.cellContains(x, y))) otherWater[y * W.cols + x] = 1;
    const land = typeof gardenLandWaterAt === 'function' ? gardenLandWaterAt(x, y) : null;
    if (gardenPropWalk(x, y) || shore && shore.cellContains(x, y) && land === false) waterCover[y * W.cols + x] = 1;
    const c = m.occ.get(x + ',' + y);
    if (c && c.decor) { const d = gardenDecorById(m, c.decor); if (!d || gardenDecorCol(d.def) === 'full') blocked = true; }   // (a seat is full: you walk up to it to sit)
    // (a tree's trunk and a small decoration are boxes, not cells: _gwBuildSolids)
    g[y * W.cols + x] = blocked ? 1 : 0;
  }
  g.hard = g.slice(); g.otherWater = otherWater; g.waterCover = waterCover; g.shore = shore; g.otherShapes = typeof gardenOtherWaterShapes === 'function' ? gardenOtherWaterShapes(m) : null; g.model = m; g.anchors = new Map(); g.probe = {}; g.contact = {};
  g.otherBuckets = new Map(); g.noShapes = [];
  if (g.otherShapes) for (const shape of g.otherShapes) { const b = shape.bounds; if (!b) continue; for (let y = Math.max(0, Math.floor(b.y - 1)); y <= Math.min(W.rows - 1, Math.ceil(b.y + b.height + 1)); y++) for (let x = Math.max(0, Math.floor(b.x - 1)); x <= Math.min(W.cols - 1, Math.ceil(b.x + b.width + 1)); x++) { const index = y * W.cols + x; let list = g.otherBuckets.get(index); if (!list) { list = []; g.otherBuckets.set(index, list); } list.push(shape); } }
  return g;
}
function _gwRouteSetSame(a, b) { if (!a || a.size !== b.size) return false; for (const value of b) if (!a.has(value)) return false; return true; }
function _gwRouteState() {
  const old = _gw.routeState, way = typeof _wdi !== 'undefined' && !!_wdi.open, decks = gardenPierDeckSignature();
  const land = old && _gwRouteSetSame(old.land, _GD_LAND), works = old && _gwRouteSetSame(old.works, _GD_WORKS), walk = old && _gwRouteSetSame(old.walk, _GD_WALK_EXTRA), ice = old && _gwRouteSetSame(old.ice, _GD_ICE);
  if (old && land && works && walk && ice && old.way === way && old.decks === decks) return old;
  return _gw.routeState = { land: land ? old.land : new Set(_GD_LAND), works: works ? old.works : new Set(_GD_WORKS), walk: walk ? old.walk : new Set(_GD_WALK_EXTRA), ice: ice ? old.ice : new Set(_GD_ICE), way, decks };
}
function _gwRouteArraySame(a, b) { if (a === b) return true; if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
function _gwRoutePointsSame(a, b) { if (a === b) return true; if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false; return true; }
function _gwRouteShapeSame(a, b) {
  if (a === b) return true;
  if (!a || !b || !_gwRoutePointsSame(a.points, b.points)) return false;
  const ah = a.holes || [], bh = b.holes || []; if (ah.length !== bh.length) return false;
  for (let i = 0; i < ah.length; i++) if (!_gwRoutePointsSame(ah[i], bh[i])) return false;
  return true;
}
function _gwRoutePhysicalSame(saved, grid, solids, state) {
  if (!saved || saved.state.walk !== state.walk || saved.state.ice !== state.ice || saved.state.way !== state.way) return false;
  const old = saved.grid;
  if (!_gwRouteArraySame(old.hard, grid.hard) || !_gwRouteArraySame(old.otherWater, grid.otherWater) || !_gwRouteArraySame(old.waterCover, grid.waterCover) || !_gwRouteShapeSame(old.shore, grid.shore)) return false;
  const a = old.otherShapes, b = grid.otherShapes;
  if (a !== b) { if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!_gwRouteShapeSame(a[i], b[i])) return false; }
  const aa = saved.solids.list, bb = solids.list; if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i].x0 !== bb[i].x0 || aa[i].y0 !== bb[i].y0 || aa[i].x1 !== bb[i].x1 || aa[i].y1 !== bb[i].y1) return false;
  return true;
}
function _gwRouteSourceInputs(m) {
  // The land/zone and regional-water tables are fixed. Their live switches
  // are in routeState and the canonical contours; the remaining mutable
  // inputs are prop footprints, trunk/soft boxes and full-decor occupancy.
  // Compare exact values, not a model revision or a lossy geometry hash.
  const values = [m.level.level, m.visit ? 'visit:' + m.visit.fid : 'home'];
  let start = values.length, count = 0; values.push(0);
  for (const p of m.plants) if (gardenPlantBlocks(p)) { values.push(p.x, p.y, p.fp || 1); count++; }
  values[start] = count; start = values.length; count = 0; values.push(0);
  const decorCols = new Map();
  for (const d of m.decor) {
    const def = d.def, col = gardenDecorCol(def); if (!decorCols.has(d.uid)) decorCols.set(d.uid, col);
    if (!def || def.layer === 'ground' || col !== 'soft') continue;
    values.push(d.x, d.y, def.w || 1, def.h || 1); count++;
  }
  values[start] = count;
  const props = gardenPropsNow(); values.push(GARDEN_PROPS.length, props.length);
  for (const p of props) values.push(p.x, p.y, p.w, p.h, gardenPropCol(p), !!p.walk, p.needs || '', !p.needs || gardenWorkOwned(p.needs));
  start = values.length; count = 0; values.push(0);
  // Read the actual occupancy used by _gwBuildGrid, including its unknown
  // decoration fallback and first-occupant semantics for overlapping rows.
  for (const [cell, occupant] of m.occ) if (occupant && occupant.decor && (decorCols.get(occupant.decor) || 'full') === 'full') { values.push(cell); count++; }
  values[start] = count;
  return values;
}
function _gwGrid(m, groundOnly) {
  if (_gw.boat && !groundOnly) return _gwContinuousBoatGrid(m);
  const mm = m || gardenHere(), shore = typeof gardenLakeGeometry === 'function' ? gardenLakeGeometry(mm) : null, otherShapes = typeof gardenOtherWaterShapes === 'function' ? gardenOtherWaterShapes(mm) : null, state = _gwRouteState();
  const key = (mm.visit ? mm.visit.key : _gd.memoKey) + '|' + mm.level.level + '|' + (typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0) + '|' + (shore && shore.revision || 0) + '|' + gardenPierDeckSignature();
  if (!_gw.grid || _gw.gridKey !== key || _gw.grid.model !== mm || _gw.grid.routeState !== state || _gw.grid.otherShapes !== otherShapes) {
    const saved = _gw.routeSnapshot, inputs = _gwRouteSourceInputs(mm);
    const stats = _gw.routeGridStats || (_gw.routeGridStats = { coarseBuilds: 0, preparations: 0, reused: 0, boatPreparations: 0, preflightChecks: 0, preflightReused: 0 }); stats.preflightChecks++;
    if (saved && saved.state === state && saved.grid.shore === shore && saved.grid.otherShapes === otherShapes && _gwRouteArraySame(saved.inputs, inputs)) {
      _gw.grid = saved.grid; _gw.solids = saved.solids; _gw.grid.model = mm; _gw.gridKey = key; stats.preflightReused++; stats.reused++;
      return _gw.grid;
    }
    const grid = _gwBuildGrid(mm), solids = _gwBuildSolids(mm); stats.coarseBuilds++;
    // Model clocks, watering and Design paint invalidate presentation too. Keep
    // the prepared shoreline anchors when every physical input is unchanged,
    // even if a scene sync cleared the active grid and its soft-box index.
    if (_gwRoutePhysicalSame(saved, grid, solids, state)) {
      _gw.grid = saved.grid; _gw.solids = saved.solids;
      Object.assign(_gw.grid, { model: mm, shore: grid.shore, otherShapes: grid.otherShapes, otherBuckets: grid.otherBuckets });
      saved.state = state; saved.inputs = inputs; stats.reused++;
    } else {
      _gw.grid = grid; _gw.solids = solids; grid.routeRevision = ++stats.preparations;
      _gwPrepareRouteGrid(grid); _gw.routeSnapshot = { grid, solids, state, inputs };
    }
    _gw.grid.routeState = state; _gw.gridKey = key;
  }
  _gw.grid.model = mm;
  return _gw.grid;
}
function gardenWorldRouteGridStatus() {
  const stats = _gw.routeGridStats || {};
  return { coarseBuilds: stats.coarseBuilds || 0, preparations: stats.preparations || 0, reused: stats.reused || 0, preflightChecks: stats.preflightChecks || 0, preflightReused: stats.preflightReused || 0, boatPreparations: stats.boatPreparations || 0, physicalRevision: _gw.grid && _gw.grid.routeRevision || 0, anchors: _gw.grid && _gw.grid.anchors ? _gw.grid.anchors.size : 0 };
}
function _gwContinuousBoatGrid(m) {
  const land = _gwGrid(m || gardenHere(), true), to = gardenLakeOpenTo(), key = land.routeRevision + '|boat:' + to;
  if (_gw.boatGrid && _gw.boatGridKey === key && _gw.boatGrid.landGrid === land) { _gw.boatGrid.model = land.model; return _gw.boatGrid; }
  const grid = new Uint8Array(land.length); Object.assign(grid, { hard: land.hard, otherWater: land.otherWater, waterCover: land.waterCover, shore: land.shore, otherShapes: land.otherShapes, otherBuckets: land.otherBuckets, noShapes: land.noShapes, landGrid: land, model: land.model, anchors: new Map(), probe: {}, contact: {}, liquid: true, waterTo: to });
  _gwPrepareRouteGrid(grid); _gw.routeGridStats.boatPreparations++; _gw.boatGrid = grid; _gw.boatGridKey = key; return grid;
}
function _gwHardFeet(grid, x, y, fx, fy) {
  const W = GARDEN_WORLD, x0 = Math.floor(x - fx), x1 = Math.floor(x + fx), y0 = Math.floor(y - fy), y1 = Math.floor(y + fy);
  if (x0 < 0 || y0 < 0 || x1 >= W.cols || y1 >= W.rows) return false;
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if ((grid.hard || grid)[cy * W.cols + cx]) return false;
  return true;
}
function _gwGridFeet(grid, x, y, fx, fy) {
  if (!_gwHardFeet(grid, x, y, fx, fy)) return false;
  if (grid.liquid && y + fy >= grid.waterTo) return false;
  if (!grid.liquid && !grid.otherShapes && grid.otherWater) { const W = GARDEN_WORLD; for (let cy = Math.floor(y - fy); cy <= Math.floor(y + fy); cy++) for (let cx = Math.floor(x - fx); cx <= Math.floor(x + fx); cx++) if (grid.otherWater[cy * W.cols + cx]) return false; }
  if (grid.shore && !gardenShoreFootProbe(grid.shore, x, y, fx, fy, !!grid.liquid, grid.waterCover, grid.probe).free) return false;
  if (!grid.liquid && grid.otherShapes) for (const shape of _gwOtherShoreCandidates(grid, x, y, fx, fy)) if (!gardenShoreFootProbe(shape, x, y, fx, fy, false, grid.waterCover, grid.probe).free) return false;
  return true;
}
function _gwOtherShoreCandidates(grid, x, y, fx, fy) { return fx > 1 || fy > 1 || !grid.otherBuckets ? grid.otherShapes || grid.noShapes : grid.otherBuckets.get(Math.floor(y) * GARDEN_WORLD.cols + Math.floor(x)) || grid.noShapes; }
function _gwWaterProbe(grid, x, y, fx, fy) {
  const result = grid.contact; result.free = true; result.distance = Infinity; result.edge = null; result.nx = result.ny = 0; result.side = 1;
  const inspect = shape => { const p = gardenShoreFootProbe(shape, x, y, fx, fy, !!grid.liquid, grid.waterCover, grid.probe); if (!p.free) { result.free = false; if (p.distance < result.distance) { result.distance = p.distance; result.edge = p.edge; result.nx = p.nx; result.ny = p.ny; result.side = p.side; } } };
  if (grid.shore) inspect(grid.shore);
  if (!grid.liquid && grid.otherShapes) for (const shape of _gwOtherShoreCandidates(grid, x, y, fx, fy)) inspect(shape);
  return result;
}
function _gwPrepareRouteGrid(grid) {
  const W = GARDEN_WORLD, candidate = (x, y) => _gwGridFeet(grid, x, y, GW_FOOT.x, GW_FOOT.y) && !_gwSolidHit(x, y, GW_FOOT.x, GW_FOOT.y) && (grid.liquid || gardenWonderWalkFine(x, y, GW_FOOT.y));
  const offsets = [.5, .25, .75, .08, .92];
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const index = y * W.cols + x; grid[index] = 1;
    if (grid.hard[index] || !grid.liquid && !grid.otherShapes && grid.otherWater[index]) continue;
    if (candidate(x + .5, y + .5)) { grid[index] = 0; continue; }
    // Curved banks can leave usable dry ground in a centre-water cell. Keep a
    // real free anchor there rather than sending routes through a wet centre.
    const near = shape => { const b = shape.bounds; return b && x + 1 >= b.x && x <= b.x + b.width && y + 1 >= b.y && y <= b.y + b.height; };
    if (!(grid.shore && near(grid.shore)) && !(grid.otherShapes && _gwOtherShoreCandidates(grid, x + .5, y + .5, .5, .5).some(near))) { if (!grid.liquid) grid[index] = 0; continue; }
    search: for (const dy of offsets) for (const dx of offsets) if (candidate(x + dx, y + dy)) { grid[index] = 0; grid.anchors.set(index, { x: x + dx, y: y + dy }); break search; }
  }
}
function _gwCellPoint(cell, grid) { grid = grid || _gwGridNow(); return grid.anchors && grid.anchors.get(cell.y * GARDEN_WORLD.cols + cell.x) || { x: cell.x + .5, y: cell.y + .5 }; }
/** The grid, without working out the garden for every point tested (a walk tests hundreds a frame; this was a tenth of a core): the same one until the garden saves, the designer moves something, or a moment has passed. */
function _gwGridNow(groundOnly) {
  // A walk, a route and every creature share the same collision snapshot for a
  // simulation step. Checking the clock and rebuilding its revision string for
  // every corner of every foot made route sampling needlessly expensive.
  if (_gw.boat && !groundOnly) return _gwContinuousBoatGrid(null);
  if (_gw.frameActive && _gw.frameGrid && _gw.frameGrid === _gw.grid && _gw.frameRev === _gd.rev && _gw.frameWorks === _GD_WORKS_REV) return _gw.frameGrid;
  // Read the resident revision here; do not derive the shoreline for every
  // corner sampled by a route. _gwGrid resolves it when this memo expires.
  const shoreRev = typeof _gardenLakeShape !== 'undefined' && _gardenLakeShape.value ? _gardenLakeShape.value.revision : 0;
  const t = performance.now(), rev = _gd.rev + '|' + _gdv.on + '|' + (typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0) + '|' + shoreRev + '|' + _GD_WALK_EXTRA.size + '|' + _GD_ICE.size + '|' + gardenPierDeckSignature();
  if (_gw.gq && _gw.gq === _gw.grid && _gw.gqRev === rev && t - _gw.gqAt < 250) {
    if (_gw.frameActive) { _gw.frameGrid = _gw.gq; _gw.frameRev = _gd.rev; _gw.frameWorks = _GD_WORKS_REV; }
    return _gw.gq;
  }
  _gw.gq = _gwGrid(gardenHere(), true); _gw.gqRev = rev; _gw.gqAt = t;
  if (_gw.frameActive) { _gw.frameGrid = _gw.gq; _gw.frameRev = _gd.rev; _gw.frameWorks = _GD_WORKS_REV; }
  return _gw.gq;
}
/** Four corners use one map lookup, including when a route probes hundreds of points. */
function _gwFootCells(x, y, fx, fy, groundOnly) { return _gwGridFeet(_gwGridNow(groundOnly), x, y, fx, fy); }
function gardenWalkable(x, y) {
  const W = GARDEN_WORLD;
  if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) return false;
  return !_gwGridNow(true)[y * W.cols + x];
}
/** Every cell you can get to from where you stand (a flood over the same grid the routes use), so the cursor can tell you before you click. */
function _gwReach() {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows, grid = _gwGrid(gardenHere());
  const sx = Math.max(0, Math.min(C - 1, Math.floor(_gw.px))), sy = Math.max(0, Math.min(R - 1, Math.floor(_gw.py)));
  if (_gw.reach && _gw.reachGrid === grid && _gw.reach[sy * C + sx]) return _gw.reach;
  const seen = new Uint8Array(C * R), stack = [sy * C + sx];
  seen[stack[0]] = 1;
  while (stack.length) {
    const i = stack.pop(), x = i % C, y = (i - x) / C;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
      const j = ny * C + nx; if (seen[j] || grid[j]) continue;
      seen[j] = 1; stack.push(j);
    }
  }
  _gw.reach = seen; _gw.reachGrid = grid;
  return seen;
}
function gardenReachable(x, y) {
  const W = GARDEN_WORLD; if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) return false;
  return !!_gwReach()[y * W.cols + x];
}
function _gwNearestFree(x, y, maxR) {
  // the nearest walkable cell to (x, y), by rings (the click was on a plant, a bench, the water...)
  const W = GARDEN_WORLD, grid = _gwGridNow(); let best = null, bd = 1e9;
  for (let r = 0; r <= (maxR || 8); r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const cx = x + dx, cy = y + dy;
      if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows || grid[cy * W.cols + cx]) continue;
      const d = Math.hypot(dx * W.cellW, dy * W.cellH) + (cy < y ? 6 : 0);   // a little prefer the near side
      if (d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    if (best) return best;
  }
  return best;
}

/* ---------- free movement: feet are a small oval, not a cell ---------- */
const GW_FOOT = Object.freeze({ x: 0.2, y: 0.12 });   // half the width and depth of your feet, in cells
const GW_ACC = 1100;                                  // pixels a second, a second: how quickly you get going and stop
const GW_CLEAR = 0.07;                                // planning keeps this much (cells) of room round corners, so a route never scrapes one
/** Can the feet be here? Only the cells the oval touches count, so you can stand tight against a bench and slip past a plant. `m` fattens the feet (route planning). */
function _gwFree(x, y, m) {
  const fx = GW_FOOT.x + (m || 0), fy = GW_FOOT.y + (m || 0);
  return _gwFootCells(x, y, fx, fy)
    && !_gwSolidHit(x, y, fx, fy) && gardenWonderWalkFine(x, y, fy, m);   // (over the lake: the island's shape and the line of stones, not whole cells)
}
/** Can the feet go in a straight line from a to b? (`m`: with that much room to spare.) Sampled finer than a corner can hide in. */
function _gwLos(a, b, m) {
  const W = GARDEN_WORLD, n = Math.max(1, Math.ceil(Math.hypot((b.x - a.x) * W.cellW, (b.y - a.y) * W.cellH) / 3));
  for (let i = 1; i <= n; i++) { const t = i / n; if (!_gwFree(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, m)) return false; }
  return true;
}
/**
 * Move the feet by (dx, dy) cells without ever stopping dead on something: the whole step if it is open, else each axis on its own
 * (slide along the wall), else step sideways a few pixels round the corner that caught the feet. Returns whether they moved.
 */
function _gwMoveBy(dx, dy) {
  const W = GARDEN_WORLD, x0 = _gw.px, y0 = _gw.py;
  const shore = _gwShoreSlide(x0, y0, dx, dy, GW_FOOT.x, GW_FOOT.y, _gwFree, _gwGridNow(), _gw.shoreMove || (_gw.shoreMove = {}));
  if (shore.shore) { _gw.px = shore.x; _gw.py = shore.y; return shore.moved; }
  let x = x0, y = y0;
  if (_gwFree(x0 + dx, y0 + dy)) { x += dx; y += dy; }
  else {
    if (dx && _gwFree(x0 + dx, y0)) x = x0 + dx;
    if (dy && _gwFree(x, y0 + dy)) y = y0 + dy;
    if (x === x0 && y === y0) {
      const horiz = Math.abs(dx * W.cellW) >= Math.abs(dy * W.cellH), stepPx = Math.hypot(dx * W.cellW, dy * W.cellH);
      const unit = horiz ? 1 / W.cellH : 1 / W.cellW;   // one pixel across the way we are going, in cells
      // the smallest sideways offset (2 .. 24 px: far enough to round a small box head-on) that lets the step go on; walk toward it a step at a time, so it never jitters
      search: for (let k = 1; k <= 12; k++) for (const s of [1, -1]) {
        const full = s * k * 2 * unit, part = s * Math.min(k * 2, Math.max(1, stepPx)) * unit, whole = Math.abs(part) >= Math.abs(full) - 1e-9;
        const ax = horiz ? x0 + dx : x0 + full, ay = horiz ? y0 + full : y0 + dy;   // sideways by the whole offset and on
        if (!_gwFree(ax, ay)) continue;
        const bx = horiz ? (whole ? ax : x0) : x0 + part, by = horiz ? y0 + part : (whole ? ay : y0);
        if (_gwFree(bx, by)) { x = bx; y = by; break search; }
      }
    }
  }
  if (x === x0 && y === y0) return false;
  _gw.px = x; _gw.py = y; return true;
}
/** Sweep to contact, then project the remaining stage velocity onto the bank
 * tangent. Obstacles keep their old box handling; no axis jitter at a curve. */
function _gwShoreSlide(x, y, dx, dy, fx, fy, free, grid, out) {
  out = out || {}; out.x = x; out.y = y; out.moved = false; out.shore = false; out.blockedCorner = false;
  if ((!grid.shore && !grid.otherShapes) || free(x + dx, y + dy) || !free(x, y)) return out;
  const probe = _gwWaterProbe(grid, x + dx, y + dy, fx, fy);
  if (probe.free) return out;
  if (!probe.edge && grid.waterCover[Math.floor(y) * GARDEN_WORLD.cols + Math.floor(x)]) return out;
  const W = GARDEN_WORLD, count = Math.max(1, Math.ceil(Math.hypot(dx * W.cellW, dy * W.cellH) / 3)), vx = dx / count, vy = dy / count, skin = .025;
  let px = x, py = y, blocked = false; out.shore = true;
  for (let step = 0; step < count; step++) {
    if (free(px + vx, py + vy)) { px += vx; py += vy; continue; }
    let lo = 0, hi = 1;
    for (let i = 0; i < 10; i++) { const t = (lo + hi) / 2; if (free(px + vx * t, py + vy * t)) lo = t; else hi = t; }
    const cx = px + vx * lo, cy = py + vy * lo, hit = _gwWaterProbe(grid, px + vx * (hi + .0001), py + vy * (hi + .0001), fx, fy);
    if (!hit.edge) { px = cx; py = cy; break; }
    const nx = hit.nx, ny = hit.ny;
    let sx = vx * (1 - lo) * W.cellW, sy = vy * (1 - lo) * W.cellH; const inward = Math.min(0, sx * nx + sy * ny);
    sx -= nx * inward; sy -= ny * inward;
    if (Math.hypot(sx, sy) < 1e-5) { px = cx; py = cy; blocked = true; break; }
    let tx = cx + (sx + nx * skin) / W.cellW, ty = cy + (sy + ny * skin) / W.cellH;
    // A tangent can enter a concave offset bank a fraction of a pixel later.
    // Project its endpoint onto the same elliptical clearance, rather than
    // repeatedly bisecting a zero-length step and resetting walking speed.
    for (let iteration = 0; iteration < 4; iteration++) {
      const p = _gwWaterProbe(grid, tx, ty, fx, fy); if (p.free || !p.edge) break;
      if (nx * p.nx + ny * p.ny < .9) {
        const ux = vx * W.cellW, uy = vy * W.cellH, a = Math.min(0, ux * nx + uy * ny), b = Math.min(0, ux * p.nx + uy * p.ny);
        const alongA = (ux - nx * a) * p.nx + (uy - ny * a) * p.ny, alongB = (ux - p.nx * b) * nx + (uy - p.ny * b) * ny;
        // If neither face's tangent is allowed by the other face, the closest
        // admissible velocity is zero. Skin corrections must not walk a cape.
        if (alongA < -1e-7 && alongB < -1e-7) { blocked = true; out.blockedCorner = true; break; }
      }
      const radius = Math.hypot(fx * W.cellW * p.nx, fy * W.cellH * p.ny), amount = Math.max(skin, (1 - p.side * Math.sqrt(p.distance)) * radius + skin);
      tx += p.nx * amount / W.cellW; ty += p.ny * amount / W.cellH;
    }
    if (blocked) { px = cx; py = cy; break; }
    if (free(tx, ty)) { px = tx; py = ty; }
    else { px = cx; py = cy; break; }
  }
  if (blocked && Math.hypot((px - x) * W.cellW, (py - y) * W.cellH) < .03) return out;
  out.x = px; out.y = py; out.moved = Math.abs(px - x) + Math.abs(py - y) > 1e-7; return out;
}
/** Shared continuous bank sliding for land pets and grounded wildlife. */
function gardenWorldSlide(x, y, dx, dy, r, out) {
  const radius = r == null ? .1 : r, free = (px, py) => gardenWorldFree(px, py, radius), grid = _gwGridNow(true);
  out = _gwShoreSlide(x, y, dx, dy, radius, radius, free, grid, out);
  if (out.shore) return out;
  if (free(x + dx, y + dy)) { out.x = x + dx; out.y = y + dy; }
  else { if (free(x + dx, y)) out.x = x + dx; if (free(out.x, y + dy)) out.y = y + dy; }
  out.moved = Math.abs(out.x - x) + Math.abs(out.y - y) > 1e-7; return out;
}
/** The feet are inside something (a plant grew where you stood, a decoration was put down): glide out to the nearest open ground. */
function _gwPushOut(dt) {
  if (_gwFree(_gw.px, _gw.py)) {
    if (_gw.replan) { _gw.replan = false; _gw.repaths = 0; if (!_gwRepath()) { _gw.path = []; _gw.then = null; } }
    return false;
  }
  let f = _gwNearestFreePt(_gw.px, _gw.py, 3);
  if (!f) { const c = _gwNearestFree(Math.floor(_gw.px), Math.floor(_gw.py), 10) || _gwNearestFree(GARDEN_WORLD.start.x, GARDEN_WORLD.start.y, 30); f = c ? _gwCellPoint(c) : null; }
  if (!f) return false;   // nowhere to stand at all: nothing to do but let you move
  const W = GARDEN_WORLD, dxp = (f.x - _gw.px) * W.cellW, dyp = (f.y - _gw.py) * W.cellH, d = Math.hypot(dxp, dyp), step = 230 * dt;
  _gw.spd = 0; if (_gw.path.length) _gw.replan = true;   // a walk in progress carries on from the new spot once the feet are clear
  if (d <= step) { _gw.px = f.x; _gw.py = f.y; }
  else { _gw.px += dxp / d * step / W.cellW; _gw.py += dyp / d * step / W.cellH; }
  if (Math.abs(dxp) > 4) _gw.face = dxp > 0 ? 1 : -1;
  return true;
}
/** The way ahead is shut (it changed, or the feet were clipped): plan a new way to where you were going. False when there is none. */
function _gwRepath() {
  const g = _gw.goal; if (!g || (_gw.repaths = (_gw.repaths || 0) + 1) > 4) return false;
  const tgt = _gwFree(g.x, g.y) ? g : _gwNearestFreePt(g.x, g.y, 3); if (!tgt) return false;
  const route = _gwRoute({ x: _gw.px, y: _gw.py }, tgt); if (!route) return false;
  _gw.path = route; _gw.goal = tgt; return true;
}
/** The free point nearest to (x, y) (a click on a plant, a bench, the water...), or null. */
function _gwNearestFreePt(x, y, maxR) {
  const W = GARDEN_WORLD, R = maxR || 3;
  let best = null, bd = 1e9;
  for (let dy = -R; dy <= R; dy += 0.25) for (let dx = -R; dx <= R; dx += 0.25) {
    const d = Math.hypot(dx * W.cellW, dy * W.cellH) + (dy < 0 ? 4 : 0);
    if (d >= bd || !_gwFree(x + dx, y + dy)) continue;
    bd = d; best = { x: x + dx, y: y + dy };
  }
  return best;
}
/** A stable frontier for the two route searches. Each cell has one live slot;
 * lowering its cost updates that slot rather than scanning or queuing copies.
 * Equal costs keep first-in order, as in the earlier array frontier. */
function _gwPathFrontier(cost, capacity) {
  const heap = new Int32Array(capacity), positions = new Int32Array(capacity).fill(-1), order = new Uint32Array(capacity);
  let length = 0, serial = 0;
  const before = (a, b) => cost[a] < cost[b] || cost[a] === cost[b] && order[a] < order[b];
  const swap = (a, b) => { const value = heap[a]; heap[a] = heap[b]; heap[b] = value; positions[heap[a]] = a; positions[heap[b]] = b; };
  return {
    get length() { return length; },
    lower(cell) {
      let at = positions[cell];
      if (at < 0) { at = length++; heap[at] = cell; positions[cell] = at; order[cell] = ++serial; }
      while (at) { const parent = (at - 1) >> 1; if (!before(heap[at], heap[parent])) break; swap(at, parent); at = parent; }
    },
    take() {
      const cell = heap[0], last = heap[--length]; positions[cell] = -1;
      if (length) {
        heap[0] = last; positions[last] = 0; let at = 0;
        for (;;) { const left = at * 2 + 1; if (left >= length) break; const right = left + 1, child = right < length && before(heap[right], heap[left]) ? right : left; if (!before(heap[child], heap[at])) break; swap(at, child); at = child; }
      }
      return cell;
    },
  };
}
/** The cells A* goes through, eight ways, no cutting corners (raw: every cell; else string-pulled by cell). null when there is no way. */
function gardenPath(from, to, raw) {
  const W = GARDEN_WORLD, C = W.cols, R = W.rows, grid = _gwGrid(gardenHere());
  const sx = Math.max(0, Math.min(C - 1, Math.floor(from.x))), sy = Math.max(0, Math.min(R - 1, Math.floor(from.y)));
  const tx = to.x, ty = to.y;
  if (sx === tx && sy === ty) return [];
  const idx = (x, y) => y * C + x, came = new Int32Array(C * R).fill(-1), gs = new Float32Array(C * R).fill(1e9), closed = new Uint8Array(C * R);
  const hcost = (x, y) => Math.hypot((x - tx) * W.cellW, (y - ty) * W.cellH) / 40;
  gs[idx(sx, sy)] = 0;
  const f = new Float32Array(C * R).fill(1e9), open = _gwPathFrontier(f, C * R); f[idx(sx, sy)] = hcost(sx, sy); open.lower(idx(sx, sy));
  const free = (x, y) => x >= 0 && y >= 0 && x < C && y < R && !grid[idx(x, y)];
  let guard = 0;
  while (open.length && guard++ < 4000) {
    const cur = open.take();
    if (cur === idx(tx, ty)) break;
    closed[cur] = 1;
    const cx = cur % C, cy = (cur - cx) / C;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue;   // no corner cutting
      const ni = idx(nx, ny); if (closed[ni]) continue;
      if (grid.anchors && (grid.anchors.has(cur) || grid.anchors.has(ni)) && !_gwLos(_gwCellPoint({ x: cx, y: cy }, grid), _gwCellPoint({ x: nx, y: ny }, grid))) continue;
      const step = Math.hypot(dx * W.cellW, dy * W.cellH) / 40, ng = gs[cur] + step;
      if (ng < gs[ni]) { gs[ni] = ng; came[ni] = cur; f[ni] = ng + hcost(nx, ny); open.lower(ni); }
    }
  }
  const goal = idx(tx, ty);
  if (came[goal] < 0) return null;
  const cells = []; for (let c = goal; c >= 0 && c !== idx(sx, sy); c = came[c]) cells.push({ x: c % C, y: (c - (c % C)) / C });
  cells.reverse();
  if (raw) return cells;
  const out = []; let at = { x: sx, y: sy };
  for (let i = 0; i < cells.length; i++) {
    const nxt = cells[i + 1];
    if (nxt && _gwLineClear(at, nxt, grid)) continue;
    out.push(cells[i]); at = cells[i];
  }
  return out;
}
function _gwLineClear(a, b, grid) {
  if (grid.anchors && grid.anchors.size) return _gwLos(_gwCellPoint(a, grid), _gwCellPoint(b, grid));
  const W = GARDEN_WORLD, n = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 4);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = Math.floor(a.x + 0.5 + (b.x - a.x) * t), y = Math.floor(a.y + 0.5 + (b.y - a.y) * t);
    if (x < 0 || y < 0 || x >= W.cols || y >= W.rows || grid[y * W.cols + x]) return false;
  }
  return true;
}
/** The way from one point to another: [waypoints] ending exactly at `to`, as straight as it can be, or null. */
function _gwRoute(from, to) {
  { const way = gardenWonderWayRoute(from, to); if (way) return way; }   // over the stones to the island: along the line of them
  if (_gwLos(from, to, GW_CLEAR) || _gwLos(from, to)) return [{ x: to.x, y: to.y }];
  const raw = gardenPath(from, { x: Math.floor(to.x), y: Math.floor(to.y) }, true);
  if (raw === null) return null;
  const grid = _gwGridNow(), pts = raw.map(c => _gwCellPoint(c, grid)); pts.push({ x: to.x, y: to.y });
  const out = []; let at = { x: from.x, y: from.y }, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !_gwLos(at, pts[j], GW_CLEAR)) j--;
    out.push(pts[j]); at = pts[j]; i = j + 1;
  }
  // the cell route runs through the middle of each cell, and a small box (a lectern, a lantern) can stand right there: any leg the feet cannot take is planned again, finely, round it
  const fixed = []; at = { x: from.x, y: from.y };
  for (const p of out) {
    if (_gwLos(at, p)) fixed.push(p); else fixed.push(..._gwMend(at, p));
    at = p;
  }
  return fixed;
}
/** The points to walk from a to b when a small box stands in the straight leg: straight up to it, a fine way round it (_gwLocalPath), then on. Always ends at b. */
function _gwMend(a, b) {
  const out = []; let at = a;
  for (let round = 0; round < 4; round++) {
    if (_gwLos(at, b)) { out.push(b); return out; }
    const steps = Math.max(2, Math.ceil(Math.hypot(b.x - at.x, b.y - at.y) / 0.0625));
    const q = (i) => ({ x: at.x + (b.x - at.x) * i / steps, y: at.y + (b.y - at.y) * i / steps });
    let t1 = 0, t2 = steps;
    for (let i = 1; i <= steps; i++) { const p = q(i); if (!_gwFree(p.x, p.y)) { t1 = i; break; } }
    if (!t1) { out.push(b); return out; }
    for (let i = t1 + 1; i <= steps; i++) { const p = q(i); if (_gwFree(p.x, p.y, 0.08)) { t2 = i; break; } }
    const p0 = q(Math.max(0, t1 - 2)), p1 = t2 >= steps ? b : q(t2), way = _gwLocalPath(p0, p1);
    if (!way) { out.push(b); return out; }
    if (t1 > 2) out.push(p0);
    out.push(...way); at = p1;
    if (p1 === b) return out;
  }
  out.push(b); return out;
}
/** The way round a small box between a and b (a few cells apart at most): A* on a lattice of an eighth of a cell, half a cell or so either side, string-pulled. null when there is none (or it takes too long). */
function _gwLocalPath(a, b) {
  const S = 0.125, pad = 0.6, x0 = Math.min(a.x, b.x) - pad, y0 = Math.min(a.y, b.y) - pad, t0 = Date.now();   // clock-ok: a time budget
  const nx = Math.ceil((Math.abs(b.x - a.x) + 2 * pad) / S) + 1, ny = Math.ceil((Math.abs(b.y - a.y) + 2 * pad) / S) + 1;
  if (nx * ny > 2500) return null;
  const sI = Math.round((a.x - x0) / S), sJ = Math.round((a.y - y0) / S), gI = Math.round((b.x - x0) / S), gJ = Math.round((b.y - y0) / S);
  const id = (i, j) => j * nx + i, memo = new Int8Array(nx * ny);   // 0 not looked at, 1 open, 2 not
  const free = (i, j) => { if (i < 0 || j < 0 || i >= nx || j >= ny) return false; const k = id(i, j); if (!memo[k]) memo[k] = _gwFree(x0 + i * S, y0 + j * S) ? 1 : 2; return memo[k] === 1; };
  const g = new Float32Array(nx * ny).fill(1e9), came = new Int32Array(nx * ny).fill(-1), done = new Uint8Array(nx * ny), costs = new Float64Array(nx * ny).fill(1e9), open = _gwPathFrontier(costs, nx * ny);
  const start = id(sI, sJ); g[start] = 0; costs[start] = Math.hypot(sI - gI, sJ - gJ); open.lower(start);
  let guard = 0, end = -1;
  while (open.length && guard++ < 1200) {
    if ((guard & 63) === 0 && Date.now() - t0 > 15) return null;   // clock-ok: a time budget; the leg then stays as it was
    const cur = open.take(); if (done[cur]) continue; done[cur] = 1;
    const ci = cur % nx, cj = (cur - ci) / nx;
    if (Math.abs(ci - gI) <= 1 && Math.abs(cj - gJ) <= 1) { end = cur; break; }
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj; if (!free(ni, nj)) continue;
      if (di && dj && (!free(ci + di, cj) || !free(ci, cj + dj))) continue;   // no corner cutting
      const k = id(ni, nj); if (done[k]) continue;
      const ng = g[cur] + Math.hypot(di, dj);
      if (ng < g[k]) { g[k] = ng; came[k] = cur; costs[k] = g[k] + Math.hypot(ni - gI, nj - gJ); open.lower(k); }
    }
  }
  if (end < 0) return null;
  const nodes = []; for (let k = end; k >= 0 && k !== id(sI, sJ); k = came[k]) nodes.push({ x: x0 + (k % nx) * S, y: y0 + ((k - k % nx) / nx) * S });
  nodes.reverse(); nodes.push({ x: b.x, y: b.y });
  const out = []; let at = { x: a.x, y: a.y }, i = 0;
  while (i < nodes.length) {
    let j = nodes.length - 1;
    while (j > i && !_gwLos(at, nodes[j], GW_CLEAR) && !_gwLos(at, nodes[j])) j--;
    out.push(nodes[j]); at = nodes[j]; i = j + 1;
  }
  return out;
}
/** Walk to a point (cells, fractions allowed); the nearest free one when it is blocked. `then(arrived)` runs on arrival. Returns whether there is a way. */
function gardenWalkToPoint(pt, then, o) {
  if (window.GardenNative && GardenNative.world() && !GardenNative.inRoom()) return GardenNative.world().walkTo(pt, then, o);
  o = o || {};
  // wherever you tell yourself to go, you stop creeping after the bug (its own chase passes net: true); the chase used to pull you back
  if (!o.net && _gw.netting && _gw.netting.state === 'chase') _gw.netting = null;
  const tgt = _gwFree(pt.x, pt.y) ? { x: pt.x, y: pt.y } : _gwNearestFreePt(pt.x, pt.y, o.radius || 3);
  if (!tgt) { _gw.path = []; _gw.then = null; return false; }
  const route = _gwRoute({ x: _gw.px, y: _gw.py }, tgt);
  if (route === null) { _gw.path = []; _gw.then = null; return false; }
  _gw.path = route; _gw.then = then || null; _gw.goal = tgt; _gw.sneak = !!o.sneak; _gw.replan = false;
  if (typeof gardenLiveWalked === 'function') gardenLiveWalked(tgt);   // friends here see where you are going
  _gw.repaths = 0; _gw.blockT = 0;
  _gwRouteShow(!!then);
  if (route.length) gardenBubbleClose();
  gardenWalkedOnce();
  if (typeof _gwFishCancelWalkAway === 'function') _gwFishCancelWalkAway();
  if (!route.length && typeof then === 'function') { _gw.then = null; then(true); }
  _gwEnsureLoop();
  return true;
}
function gardenWalkTo(cell, then, o) { return gardenWalkToPoint({ x: cell.x + 0.5, y: cell.y + 0.5 }, then, o); }
function gardenWorldFace(cell) { if (!cell) return; _gwFacePt({ x: cell.x + 0.5, y: cell.y + 0.5 }); }
function _gwFacePt(pt) { const dx = pt.x - (pt.x >= GARDEN_ROOM_X && _grm.me ? gardenRoomMeCell().x : _gw.px); if (Math.abs(dx) > 0.05) _gw.face = dx > 0 ? 1 : -1; _gwBody(); }
/** Where on the stage (in cells, fractions allowed) a pointer event is. */
function _gwPointAt(ev) {
  if (!ev || ev.clientX == null || ev.clientY == null || !_gw.svg) return null;
  if (window.GardenNative && GardenNative.active()) return GardenNative.point(ev.clientX, ev.clientY);
  if (window.GardenPhaser && GardenPhaser.active(_gw.svg)) return GardenPhaser.point(ev.clientX, ev.clientY);
  try {
    const ctm = _gw.svg.getScreenCTM(); if (!ctm) return null;
    const pt = _gw.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(ctm.inverse()), W = GARDEN_WORLD;
    return { x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH };
  } catch (e) { return null; }
}
const _gwVisualPicks = new WeakMap();
/** Hover, tools, doors and pet capture share one hit lookup per pointer event. */
function gardenWorldVisualPick(ev) {
  if (ev && window.GardenNative && GardenNative.active()) return GardenNative.pick(ev.clientX, ev.clientY);
  if (!ev || typeof ev !== 'object' || ev.clientX == null || ev.clientY == null || !window.GardenPhaser || !GardenPhaser.active(_gw.svg)) return null;
  const cached = _gwVisualPicks.get(ev);
  if (cached && cached.svg === _gw.svg && cached.x === ev.clientX && cached.y === ev.clientY) return cached.hit;
  const hit = GardenPhaser.pick(ev.clientX, ev.clientY);
  _gwVisualPicks.set(ev, { svg: _gw.svg, x: ev.clientX, y: ev.clientY, hit });
  return hit;
}

/* ---------- where you are going: a dotted trail and a marker at the end of it (2.23) ---------- */
function _gwRouteG() {
  const layer = _gw.svg && _gw.svg.querySelector('.gd-actors'); if (!layer) return null;
  let g = layer.querySelector(':scope > .gd-route');
  if (!g) {
    g = gardenSceneElement('g'); g.setAttribute('class', 'gd-route');
    g.innerHTML = '<polyline class="gd-route-line" fill="none"/><g class="gd-route-end"><ellipse class="gd-route-pulse" rx="15" ry="6"/><ellipse class="gd-route-ring" rx="9" ry="3.600"/><path class="gd-route-pin" d="M0 -3c-4 -5 -6.500 -8 -6.500 -11.500a6.500 6.500 0 0 1 13 0c0 3.500 -2.500 6.500 -6.500 11.500z"/><circle class="gd-route-dot" cy="-14.500" r="2.400"/></g>';
    layer.insertBefore(g, layer.firstChild);
    _gw.routeEls = { line: g.querySelector('.gd-route-line'), end: g.querySelector('.gd-route-end') };
  }
  return g;
}
function _gwRouteShow(act) {
  const g = _gwRouteG(); if (!g) return;
  g.classList.toggle('is-act', !!act);
  g.classList.toggle('is-on', _gw.path.length > 0);
  _gw.routeOn = _gw.path.length > 0;
  _gwRouteFrame(true);
}
function _gwRouteFrame(force) {
  if (!_gw.routeOn && !force) return;
  const g = _gw.svg && _gw.svg.querySelector('.gd-actors > .gd-route'); if (!g) return;
  if (!_gw.path.length) { if (_gw.routeOn) { _gw.routeOn = false; g.classList.remove('is-on'); } return; }
  const W = GARDEN_WORLD, E = _gw.routeEls;
  if (!E || !E.line.isConnected) { _gw.routeEls = { line: g.querySelector('.gd-route-line'), end: g.querySelector('.gd-route-end') }; }
  // The route beyond the first point is immutable until a waypoint is passed
  // or a replan replaces the array. Only the player's point changes each frame.
  if (_gw.routePath !== _gw.path || _gw.routeLength !== _gw.path.length) {
    _gw.routePath = _gw.path; _gw.routeLength = _gw.path.length;
    _gw.routeTail = _gw.path.map(p => (p.x * W.cellW).toFixed(0) + ',' + (W.sky + p.y * W.cellH).toFixed(0)).join(' ');
  }
  const pts = (_gw.px * W.cellW).toFixed(0) + ',' + (W.sky + _gw.py * W.cellH).toFixed(0) + ' ' + _gw.routeTail;
  if (_gw.routePts !== pts) { _gw.routePts = pts; _gw.routeEls.line.setAttribute('points', pts); }
  const end = _gw.path[_gw.path.length - 1], tf = `translate(${(end.x * W.cellW).toFixed(1)} ${(W.sky + end.y * W.cellH).toFixed(1)})`;
  if (_gw.routeEnd !== tf) { _gw.routeEnd = tf; _gw.routeEls.end.setAttribute('transform', tf); }
}
/* ---------- the figure ---------- */
function _gwFigureInner(walk) {
  let svg = '';
  try {
    if (typeof profileFigureSvg === 'function' && typeof profileGet === 'function') svg = profileFigureSvg(profileGet().avatar, { size: 70, walk: !!walk, uid: 'gwp' + (walk ? 'w' : 'i') });
  } catch (e) { svg = ''; }
  const m = svg && /^<svg[^>]*>([\s\S]*)<\/svg>$/.exec(svg);
  if (m) return m[1];
  // no scene library on this page: a small gardener of our own
  return `<ellipse cx="0" cy="0.6" rx="11" ry="1.8" fill="#000000" opacity="0.14"/><g><rect x="-6" y="-40" width="12" height="26" rx="5" fill="#5a8a5a"/><circle cx="0" cy="-48" r="8" fill="#e8b890"/><path d="M-9 -50q9 -12 18 0z" fill="#c8a24a"/><rect x="-5" y="-14" width="4" height="14" rx="2" fill="#4a5a7a"/><rect x="1" y="-14" width="4" height="14" rx="2" fill="#4a5a7a"/></g>`;
}
function _gwBody() {
  if (!_gw.node) return;
  const moving = _gw.moving && gardenMotionOn();
  const key = (moving ? 'w' : 'i') + (_gw.face > 0 ? 'r' : 'l');
  const inner = _gw.node.querySelector('.gd-pl-in');
  if (!inner) return;
  if (typeof gartPlayerPaint === 'function' && gartPlayerPaint(inner, _gw)) return;   // agent 'garden-art': the storybook gardener, four ways round
  if (!_gw.fig.idle) { _gw.fig.idle = _gwFigureInner(false); _gw.fig.walk = _gwFigureInner(true); }
  if (_gw.bodyKey !== key) { _gw.bodyKey = key; inner.innerHTML = moving ? _gw.fig.walk : _gw.fig.idle; }
  inner.setAttribute('transform', `scale(${_gw.face > 0 ? GW_SCALE : -GW_SCALE} ${GW_SCALE})`);
  // you can always find yourself: a faint copy of the figure is drawn over everything, so a tree or a roof never swallows you
  const xr = _gwXray();
  if (xr) { const xi = xr.firstChild; if (xr._k !== _gw.fig.idle) { xr._k = _gw.fig.idle; xi.innerHTML = _gw.fig.idle; } xi.setAttribute('transform', `scale(${_gw.face > 0 ? GW_SCALE : -GW_SCALE} ${GW_SCALE})`); }
}
/** Make the figures again (the avatar changed, or the wardrobe was opened). */
function gardenWorldRedress() { _gw.fig = { idle: '', walk: '' }; _gw.bodyKey = ''; _gwBody(); }
function _gwXray() {
  if (_gw.xr && _gw.xr.isConnected && _gw.xr.ownerSVGElement === _gw.svg) return _gw.xr;
  const fx = _gw.svg && _gw.svg.querySelector('.gd-ui'); if (!fx) return null;
  let g = fx.querySelector(':scope > .gd-pl-xray');
  if (!g) { g = gardenSceneElement('g'); g.setAttribute('class', 'gd-pl-xray'); g.appendChild(gardenSceneElement('g')); fx.insertBefore(g, fx.firstChild); }
  _gw.xr = g;
  return g;
}
function _gwMakeNode() {
  const NS = 'http://www.w3.org/2000/svg';
  const g = gardenSceneElement('g');
  g.setAttribute('class', 'gd-player'); g.setAttribute('data-live', '1'); g.setAttribute('data-z', String(_gw.py));
  // The Painted village stands the figure in the scenes' soft contact shadow, without the pale halo (94-garden-art-g-paint.js).
  const painted = typeof gardenFigurePaintStyle === 'function' && gardenFigurePaintStyle() && typeof gardenFigureShadowSvg === 'function';
  g.innerHTML = '<g class="gd-pl-sh">' + (painted ? gardenFigureShadowSvg(11, 3.2) : '<ellipse class="gd-pl-halo" cx="0" cy="1" rx="17" ry="6"/><ellipse cx="0" cy="1" rx="12" ry="3.4" fill="#1a2a14" fill-opacity="0.2"/>') + '</g><g class="gd-pl-bob"><g class="gd-pl-in"></g></g>';
  return g;
}

/* ---------- depth: the player and the pet sit in the objects layer by row ---------- */
/*
 * Rows (the owner: "lag everywhere", "stuttery"). Anything that moves used to be taken out of the objects layer and put back whenever it changed row, and one insertion among 800
 * siblings restyled and laid out the whole layer: measured 330 ms on a full garden, several times a second. So the layer now holds one empty <g class="gd-row"> before each new depth,
 * made when the scene changes, and what moves goes in and out of those. A move touches a handful of nodes, whatever the size of the garden.
 * Row i holds what stands at a depth below zs[i] (and at or past zs[i - 1]), which draws things exactly where "before the first thing further forward" did.
 */
function _gwRowsBuild(layer) {
  const old = layer._gwRowMap || new Map(), map = new Map(), zs = [], slots = [], need = [];
  let max = -Infinity;
  for (const el of layer.children) {
    if (el.hasAttribute('data-live')) continue;
    const ez = Number(el.getAttribute('data-z'));
    if (Number.isFinite(ez) && ez > max) { max = ez; need.push([ez, el]); }
  }
  need.push([Infinity, null]);
  for (const [z, before] of need) {
    let g = old.get(z);
    if (!g) { g = gardenSceneElement('g'); g.setAttribute('class', 'gd-row'); g.setAttribute('data-live', '1'); }
    if (before ? before.previousElementSibling !== g : (g.parentNode !== layer || g.nextElementSibling)) layer.insertBefore(g, before);
    map.set(z, g); zs.push(z); slots.push(g);
  }
  layer._gwRowMap = map; layer._gwRows = { zs, slots };
  // a depth nothing stands at any more: what was in its row moves to the right one
  for (const [z, g] of old) {
    if (map.has(z)) continue;
    const kids = [...g.children]; g.remove();
    for (const n of kids) gardenRowPlace(layer, n, Number(n.getAttribute('data-z')) || 0);
  }
  // a new depth between two rows: whoever now belongs in it moves there
  for (const g of slots) for (const n of [...g.children]) gardenRowPlace(layer, n, Number(n.getAttribute('data-z')) || 0);
  return layer._gwRows;
}
/** Put a node in the row it stands in. Nothing happens when it is already there: only a real change of what is in front of it touches the page. */
function gardenRowPlace(layer, node, z) {
  if (node && node._native) { node.target.setDepth(GARDEN_WORLD.sky + z * GARDEN_WORLD.cellH); if (node.parentNode !== layer) layer.appendChild(node); const world = window.GardenNative && GardenNative.world(); if (world) world.depthChanged(); return; }
  // Native depth is independent of SVG document order. Keep the logical actor
  // attached where it was first inserted rather than moving its animated
  // subtree through the DOM whenever its feet cross a row.
  if (node.parentNode && layer.contains(node) && window.GardenPhaser && GardenPhaser.active(layer.ownerSVGElement)) return;
  const R = layer._gwRows || _gwRowsBuild(layer), zs = R.zs;
  let a = 0, b = zs.length - 1;
  while (a < b) { const m = (a + b) >> 1; if (zs[m] > z) b = m; else a = m + 1; }
  const row = R.slots[a];
  let ref = null;
  for (let c = row.firstElementChild; c; c = c.nextElementSibling) { if (c !== node && Number(c.getAttribute('data-z')) > z) { ref = c; break; } }
  if (node.parentNode === row && node.nextElementSibling === ref) return;
  // moving a node starts its CSS animations again from nothing: a walking leg or a beating wing would jump at every row. They carry on from where they were
  const was = node.parentNode && !node.classList.contains('gart-off') && node.getAnimations ? node.getAnimations({ subtree: true }) : null, at = was && was.length ? new Map() : null;
  if (at) for (const a of was) if (a.animationName) at.set(a.effect.target, Object.assign(at.get(a.effect.target) || {}, { [a.animationName]: a.currentTime }));
  row.insertBefore(node, ref);
  if (at) for (const a of node.getAnimations({ subtree: true })) { const t = a.animationName && at.get(a.effect.target); if (t && t[a.animationName] != null) a.currentTime = t[a.animationName]; }
}
/** Reconstruct painter order for a still photo or when returning to SVG. */
function gardenWorldCaptureDepth(svg) {
  const layer = svg && svg.querySelector('.gd-objects'); if (!layer) return;
  const actors = [...layer.querySelectorAll(':scope > .gd-row > [data-live]')];
  if (!actors.length) return;
  _gwRowsBuild(layer);
  for (const actor of actors) gardenRowPlace(layer, actor, Number(actor.getAttribute('data-z')) || 0);
  const keep = new Set(layer._gwRows.slots);
  for (const row of layer.querySelectorAll(':scope > .gd-row')) if (!row.firstChild && !keep.has(row)) row.remove();
}
function _gwPlace(node, z) {
  const layer = _gw.svg && _gw.svg.querySelector('.gd-objects'); if (!layer || !node) return;
  gardenRowPlace(layer, node, z);
}
function _gwApplyNode() {
  const W = GARDEN_WORLD;
  if (!_gw.node) return;
  if (typeof gartPlayerStep === 'function') gartPlayerStep(_gw);   // agent 'garden-art': a compare, redraws only on a turn
  const x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH;
  const tf = `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
  if (_gw.nodeTf !== tf || _gw.node._gwTf !== tf) { _gw.nodeTf = tf; _gw.node._gwTf = tf; _gw.node.setAttribute('transform', tf); _gw.node.setAttribute('data-z', (_gw.py + 0.001).toFixed(2)); const xr = _gwXray(); if (xr) xr.setAttribute('transform', tf); }
  const z = Math.floor(_gw.py * 2);
  if (z !== _gw.z || !_gw.node.parentNode) { _gw.z = z; _gwPlace(_gw.node, _gw.py); }
  const bob = _gw.bobEl && _gw.bobEl.isConnected ? _gw.bobEl : (_gw.bobEl = _gw.node.querySelector('.gd-pl-bob'));
  const bt = _gw.moving && gardenMotionOn() ? `translate(0 ${(-Math.abs(Math.sin(_gw.t * (_gw.sneak ? 7 : 11))) * 1.6).toFixed(2)})` : '';
  if (bob && _gw.bobTf !== bt) { _gw.bobTf = bt; bob.setAttribute('transform', bt); }
}

/* ---------- the camera ---------- */
function _gwSize() {
  // read once and again only when the box changes size: asking the page for it every frame forced a layout every frame
  if (_gw.sizeOk && _gw.size.w) return _gw.size;
  const box = _gw.box || (_gw.root && _gw.root.querySelector('.gd-stagebox'));
  if (box) { _gw.box = box; const w = box.clientWidth, h = box.clientHeight; if (w && h) { _gw.size.w = w; _gw.size.h = h; _gw.sizeOk = true; } }
  return _gw.size;
}
function _gwPrefsNow() { return _gw.frameActive && _gw.framePrefs || _gdpPrefs(); }
function gardenCamMode() { const world = window.GardenNative && GardenNative.world(); return world && world.cameraControls ? world.cameraControls().mode : _gwPrefsNow().cam === 'fit' ? 'fit' : 'follow'; }
function _gwCamZoomIdx() { const p = _gwPrefsNow(); const i = Number(p.zoom); return p.zoom != null && Number.isInteger(i) && i >= 0 && i < GW_ZOOMS.length ? i : _gwCamDefaultIdx(); }
/** Until you choose a zoom: close enough that the gardener stands about 135 px tall (a player's distance, not a map's), but always at least seven cells across (a phone). */
function _gwCamDefaultIdx() {
  const s = _gwSize(), k = s.w + 'x' + s.h;
  if (_gw.zoomKey === k) return _gw.zoomDef;
  if (!s.w || !s.h) return 2;
  const want = Math.max(s.h / (135 / (70 * GW_SCALE)), 7 * GARDEN_WORLD.cellW * s.h / s.w);
  let best = 0; GW_ZOOMS.forEach((z, i) => { if (Math.abs(z - want) < Math.abs(GW_ZOOMS[best] - want)) best = i; });
  _gw.zoomKey = k; _gw.zoomDef = best;
  return best;
}
function gardenCamSet(mode, zoomDelta) {
  if (window.GardenNative && GardenNative.world()) { GardenNative.world().cameraSet(mode, zoomDelta); _gwUpdateCamUi(); return; }
  const p = _gdpPrefs();
  if (zoomDelta) { const i = Math.max(0, Math.min(GW_ZOOMS.length - 1, _gwCamZoomIdx() + zoomDelta)); p.zoom = i; p.cam = 'follow'; }
  else if (mode) p.cam = mode;
  if (typeof saveUI === 'function') saveUI();
  _gw.cam.dirty = true; _gw.cam.snap = false; _gwEnsureLoop(); _gwUpdateCamUi();
}
function _gwCamTarget() {
  const W = GARDEN_WORLD, wpx = W.cols * W.cellW, hpx = W.sky + W.rows * W.cellH, s = _gwSize();
  if (!s.w || !s.h) return null;
  const ar = s.w / s.h;
  if (typeof gardenDesignCam === 'function') { const dc = gardenDesignCam(ar, wpx, hpx); if (dc) return dc; }   // the designer's own view, moved with its own buttons
  // fishing locks the camera onto you and the bobber: close in, and back out again when the line is in
  if (typeof _gwFishBusy === 'function' && _gwFishBusy() && _gw.fishing && _gw.fishing.bx < GARDEN_ROOM_X) {
    const F = _gw.fishing, bx = F.bx * W.cellW, by = W.sky + F.by * W.cellH, fx = _gw.px * W.cellW, fy = W.sky + _gw.py * W.cellH - 30;
    let vh = Math.max(190, Math.abs(by - fy) + 130, (Math.abs(bx - fx) + 170) / ar), vw = vh * ar;
    if (vh > hpx) { vh = hpx; vw = vh * ar; }
    if (vw > wpx) { vw = wpx; vh = vw / ar; }
    return { x: Math.max(0, Math.min(wpx - vw, (bx + fx) / 2 - vw / 2)), y: Math.max(0, Math.min(hpx - vh, (by + fy) / 2 - vh / 2 - 6)), w: vw, h: vh };
  }
  const fit = gardenCamMode() === 'fit';
  let vh = fit ? Math.max(hpx, wpx / ar) : GW_ZOOMS[_gwCamZoomIdx()];
  let vw = vh * ar;
  if (vw > wpx && !fit) { vw = wpx; vh = vw / ar; }
  if (vh > hpx && !fit) { vh = hpx; vw = vh * ar; }
  let x, y;
  if (fit) { x = (wpx - vw) / 2; y = vh > hpx ? hpx - vh : (hpx - vh) / 2; }
  else {
    const fx = _gw.px * W.cellW, fy = W.sky + _gw.py * W.cellH - 20;
    x = Math.max(0, Math.min(wpx - vw, fx - vw / 2)); y = Math.max(0, Math.min(hpx - vh, fy - vh * 0.56));
  }
  return { x, y, w: vw, h: vh };
}
function _gwApplyCam(dt, snap) {
  const svg = _gw.svg; if (!svg) return;
  const t = _gwCamTarget(); if (!t) return;
  const c = _gw.cam;
  c.goal = t;
  // a new view to go to (a zoom, a line cast, a catch): what it will show goes on the page now, before the camera moves, never in sight
  { const gk = (t.w | 0) + ',' + (t.h | 0); if (c.gk !== gk) { c.gk = gk; if (c.init && !_gwCalm.hid && typeof _gartRestItems === 'function') { _gw.restAt = _gw.t; _gartRestItems(svg); } } }
  if (!c.init || snap || !gardenMotionOn()) { c.x = t.x; c.y = t.y; c.w = t.w; c.h = t.h; c.init = true; }
  else { const k = 1 - Math.exp(-dt * 7); c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.w += (t.w - c.w) * k; c.h += (t.h - c.h) * k; }
  const same = Math.abs(t.x - c.x) < 0.05 && Math.abs(t.y - c.y) < 0.05 && Math.abs(t.w - c.w) < 0.05;
  if (same) { c.x = t.x; c.y = t.y; c.w = t.w; c.h = t.h; }
  const vb = `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.w.toFixed(2)} ${c.h.toFixed(2)}`;
  if (svg._gwVb !== vb) { svg._gwVb = vb; svg.setAttribute('viewBox', vb); }
  c.dirty = !same;
}
function _gwUpdateCamUi() {
  const box = _gw.root && _gw.root.querySelector('.gd-camui'); if (!box) return;
  const world = window.GardenNative && GardenNative.world(), controls = world && world.cameraControls ? world.cameraControls() : null, fit = controls ? controls.mode === 'fit' : gardenCamMode() === 'fit';
  const f = box.querySelector('[data-cam="fit"]'); if (f) { f.setAttribute('aria-pressed', fit ? 'true' : 'false'); }
  const i = _gwCamZoomIdx();
  const zi = box.querySelector('[data-cam="in"]'); if (zi) zi.disabled = controls ? !controls.canZoomIn : !fit && i <= 0;
  const zo = box.querySelector('[data-cam="out"]'); if (zo) zo.disabled = controls ? !controls.canZoomOut : !fit && i >= GW_ZOOMS.length - 1;
}
function _gwBuildCamUi(stagebox) {
  if (stagebox.querySelector('.gd-camui')) return;
  const bar = document.createElement('div'); bar.className = 'gd-camui'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Camera');
  const b = (cam, ic, tip, aria) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'gd-cambtn'; e.dataset.cam = cam; e.innerHTML = icon(ic); e.setAttribute('data-tip', tip); e.setAttribute('aria-label', aria); e.onclick = (ev) => { ev.stopPropagation(); if (cam === 'in') gardenCamSet(null, -1); else if (cam === 'out') gardenCamSet(null, 1); else if (cam === 'fit') gardenCamSet(gardenCamMode() === 'fit' ? 'follow' : 'fit'); else if (cam === 'me') { gardenCamSet('follow'); } }; return e; };
  bar.append(b('in', 'plus', 'Closer (+)', 'Closer'), b('out', 'minus', 'Further away (−)', 'Further away'), b('me', 'locate-fixed', 'Back to me (C)', 'Back to me'));
  stagebox.appendChild(bar);
  // the mouse wheel zooms; a pinch or ctrl-wheel too
  stagebox.addEventListener('wheel', (ev) => {
    if (!/^garden(:|$)/.test(String(state.view || '')) || _gw.reel) return;
    if (!_gdp.svg || !_gdp.svg.contains(ev.target)) return;   // the bag and the bubble scroll by themselves
    ev.preventDefault();
    // a notch is one step; a trackpad's little deltas add up to one, rather than racing through them all
    _gw.wheel = (_gw.wheel || 0) + (ev.deltaMode === 1 ? ev.deltaY * 40 : ev.deltaY);
    if (Math.abs(_gw.wheel) < 60) return;
    const dir = _gw.wheel > 0 ? 1 : -1; _gw.wheel = 0;
    gardenCamSet(null, dir);
  }, { passive: false });
}

/* ---------- the loop ---------- */
/*
 * Calm (2.28; the owner, 31 Oct 2026: "optimize it to not consume CPU when it's not open ... graphics"). Measured on this stage: an open, idle garden kept
 * a core about 40% busy, almost all of it painting: 70-odd ambient CSS animations (clouds, leaves, wings, water, pets) each repaint the stage every frame
 * while the scripts take 2%. So when nobody is looking, the ambient motion rests: the window has not had the focus for 8 seconds, or there has been no
 * pointer or key for 90 seconds and nobody is in the garden with you. Any pointer, key or focus wakes it at once; it pauses and resumes in place.
 */
const _gwCalm = { on: false, input: Date.now(), blur: 0, hid: false };   // clock-ok: when you last did something
function _gwCalmSet(on) { if (_gwCalm.on === on) return; _gwCalm.on = on; if (_gw.root) _gw.root.classList.toggle('gd-calm', on); }
/**
 * Indoors (the owner: "all of the extra internal rooms seem to be incredibly slow and laggy"). A room covers the whole window, so once it has faded in the stage under it is taken out of the page's drawing altogether.
 * Measured before this: every pointer move in a room woke the garden and the next look put it back to rest, and flipping that class restyled the whole stage: about 90% of a core, frames down from 160 a second to 20.
 * Only the drawing goes: the loop still looks in twice a second, and the fish clock, the host's answers and friends' messages run on as they were.
 */
function _gwIndoors(on) {
  if (window.GardenPhaser && GardenPhaser.wanted()) GardenPhaser.indoor(on);
  if (!on && _gdp.owed) { _gdp.owed = false; gardenRepaintSoon(); }
  if (_gwCalm.hid === on) return;
  _gwCalm.hid = on; document.body.classList.toggle('gd-room-in', on);   // (on the body: the stage can be rebuilt while you are in a room, and the new one must stay hidden too)
  if (on) { if (typeof petGardenSuspend === 'function') petGardenSuspend(); _gwCalmSet(true); return; }
  _gwCalm.input = Date.now(); _gwCalmSet(false);   // clock-ok: idle time
}
function _gwCalmTick() {
  const t = Date.now(), focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;   // clock-ok: idle time
  if (focused) _gwCalm.blur = 0; else if (!_gwCalm.blur) _gwCalm.blur = t;
  const away = !focused && _gwCalm.blur > 0 && t - _gwCalm.blur > 8000;
  const company = typeof _gll !== 'undefined' && _gll.actors && _gll.actors.size > 0;   // friends here: you are watching them
  const idle = !!(away || (!company && t - _gwCalm.input > 90000));
  _gwCalmSet(idle || _gwCalm.hid);   // (in a room, the stage under it is not being drawn)
  if (_grm.root) _grm.root.classList.toggle('is-calm', idle);
}
if (typeof window !== 'undefined') {
  const wake = () => { _gwCalm.input = Date.now(); if (_gwCalm.hid) { if (_grm.root) _grm.root.classList.remove('is-calm'); return; } if (_gwCalm.on) { _gwCalmSet(false); if (_gw.idleT) { clearTimeout(_gw.idleT); _gw.idleT = 0; } if (typeof _gwEnsureLoop === 'function') _gwEnsureLoop(); } };   // clock-ok: idle time
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, wake, { passive: true, capture: true });
  window.addEventListener('focus', wake);   // (the pets' roaming loop, 97-pets-7roam.js, rests while it is calm too)
}
function _gwEnsureLoop() { if (window.GardenNative && GardenNative.active()) return; if (!_gw.on || _gw.raf || document.hidden || window.GardenPhaser && GardenPhaser.active(_gw.svg)) return; if (_gw.idleT) { clearTimeout(_gw.idleT); _gw.idleT = 0; } _gw.last = 0; _gw.raf = requestAnimationFrame(_gwFrame); }
/** Is anything in the view moving, or about to? Every frame asked for is a frame the whole stage paints, so an idle garden looks up only a few times a second. */
function _gwPace() {
  if (_grm.on || _ee.on) return _gw.reel || (_gw.fishing && _gw.fishing.state !== 'idle') ? 60 : 2;   // indoors: a line in a room's water still runs here, nothing else needs to
  if (_gw.keys.size || _gw.hold || _gw.path.length || _gw.moving || _gw.netting || _gw.reel || _gw.cam.dirty || _gw.routeOn || _gw.pet && _gw.pet.moving) return 60;
  if (_gw.fishing && _gw.fishing.state !== 'idle') return 60;
  if (_gw.bugsBusy) return 30;
  if (typeof _gll !== 'undefined') for (const A of _gll.actors.values()) if (A.fish || A.pose || (A.pp && (A.pp.busy > 0 || A.pp.tx != null))) return 60;   // someone's line, pose or pet in view (94-garden-live-4fx.js)
  for (const S of _gwSprites) if (!S.simulationOnly && S.update && !S.still && (S.quiet || 0) < 0.35 && _gwInView(S.x, S.y, 1.5)) return 30;   // one that has not moved for a moment, or is off screen, does not count
  return 10;
}
/**
 * What moves is taken off the page while it is well out of the view (3.5 cells past the edge, further than the camera goes in a look, so it is always back before you could see it).
 * Only the drawing: what it is doing carries on, so a friend's fish, a pet's errand and the host's decisions are not affected. `o` is whatever keeps its state. True when it is off.
 */
const GW_CULL = 3.5;
function _gwCullBoxView(box, x, y, lift, view) {
  const W = GARDEN_WORLD, margin = GW_CULL * W.cellW;
  // Unknown presentation geometry must remain visible, never become a
  // point-sized substitute for this long authored road.
  if (!view || !Number.isFinite(view.x) || !Number.isFinite(view.y) || !Number.isFinite(view.w) || !Number.isFinite(view.h) || view.w <= 0 || view.h <= 0 || !Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.width) || !Number.isFinite(box.height) || box.width <= 0 || box.height <= 0 || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(lift)) return true;
  const left = x * W.cellW + box.x, top = W.sky + y * W.cellH - lift + box.y;
  if (!Number.isFinite(left + box.width) || !Number.isFinite(top + box.height)) return true;
  return left + box.width > view.x - margin && left < view.x + view.w + margin && top + box.height > view.y - margin && top < view.y + view.h + margin;
}
function gardenCull(o, node, x, y, view) {
  const box = o.id === 'wd-stones' && o.cullBox;
  // Only the stone road opts into body bounds. Existing actors keep their
  // point/goal policy. An explicit photo view uses that actual viewport.
  let off;
  if (box) {
    const lift = o.lift == null ? 0 : o.lift, visible = _gwCullBoxView(box, x, y, lift, view || _gw.cam);
    const goalVisible = !view && _gw.cam.goal && _gwCullBoxView(box, x, y, lift, _gw.cam.goal);
    off = !visible && !goalVisible;
  } else off = !_gwInView(x, y, GW_CULL) && !_gwInCamGoal(x, y);
  if (o._off !== off) { o._off = off; node.classList.toggle('gart-off', off); }
  return off;
}
/** Is this point (cells) in the view the camera is on its way to, zooming or following a catch? (With the margin: it is on the page before the view gets there.) */
function _gwInCamGoal(x, y) {
  const t = _gw.cam.goal, W = GARDEN_WORLD; if (!t) return false;
  const mg = GW_CULL * W.cellW, px = x * W.cellW, py = W.sky + y * W.cellH;
  return px > t.x - mg && px < t.x + t.w + mg && py > t.y - mg && py < t.y + t.h + mg;
}
/** Is this point (cells) on screen, give or take `m` cells? */
function _gwInView(x, y, m) {
  if (x >= GARDEN_ROOM_X) return true;   // a room's water: the room looks after itself
  const c = _gw.cam, W = GARDEN_WORLD, mg = (m || 0) * W.cellW, px = x * W.cellW, py = W.sky + y * W.cellH;
  return px > c.x - mg && px < c.x + c.w + mg && py > c.y - mg && py < c.y + c.h + mg;
}
function _gwFrame(ts, rendererTick) {
  _gw.raf = 0;
  if (window.GardenNative && GardenNative.active()) return;
  if (!rendererTick && window.GardenPhaser && GardenPhaser.active(_gw.svg)) return;
  if (!_gw.on || !_gw.root || !_gw.root.isConnected || !_gw.svg || !_gw.svg.isConnected) { _gw.on = _gw.on && !!_gw.root && _gw.root.isConnected; if (_gw.on) { _gw.raf = requestAnimationFrame(_gwFrame); } return; }
  if (document.hidden) return;
  _gw.frameActive = true; _gw.frameGrid = null;
  try {
  _gw.framePrefs = _gdpPrefs();
  _gwCalmTick();
  const dt = Math.min(0.11, _gw.last ? (ts - _gw.last) / 1000 : 0.016); _gw.last = ts; _gw.t = (_gw.t || 0) + dt;
  const W = GARDEN_WORLD;
  // 1. where you are going: the keys, or the way you clicked (a free line round whatever is in the way, with a soft start and stop)
  let mvx = 0, mvy = 0;
  const k = _gw.keys;
  if (k.has('left')) mvx -= 1; if (k.has('right')) mvx += 1; if (k.has('up')) mvy -= 1; if (k.has('down')) mvy += 1;
  const reeling = !!(_gw.fishing && ['reel', 'bite'].includes(_gw.fishing.state));
  const casting = !!_gw.fishing && _gw.fishing.state !== 'idle';
  const pushed = _gwPushOut(dt);   // standing inside something that grew or was put down: ease out first, then walk on
  const byKeys = !pushed && !!(mvx || mvy) && !casting;   // a line out locks you in: the keys do nothing until it is in (Esc)
  if (_gw.hold && (casting || byKeys)) _gw.hold = null;
  // holding the button for a moment (or dragging): steer straight at the pointer, sliding along whatever is in the way, like the keys do
  const H = _gw.hold;
  if (H && !H.steer && (_gw.t || 0) - H.t0 > 0.28) H.steer = true;
  let direct = byKeys, hpt = null;
  if (H && H.steer && !pushed && !byKeys) { hpt = _gwPointAt({ clientX: H.cx, clientY: H.cy }); direct = !!hpt; }
  let want = 0, ux = 0, uy = 0, sneak = _gw.sneak, tgt = null, dist = 0;
  if (pushed) { /* gliding out */ }
  else if (direct && !byKeys) {
    const dxp = (hpt.x - _gw.px) * W.cellW, dyp = (hpt.y - _gw.py) * W.cellH, d = Math.hypot(dxp, dyp);
    _gw.path = []; _gw.then = null; _gw.replan = false; sneak = false;
    if (_gw.netting && _gw.netting.state === 'chase') _gw.netting = null;
    if (d < 12) direct = false;   // right under the pointer: stand there
    else { ux = dxp / d; uy = dyp / d; want = Math.min(d > 150 ? GW_SPEED.run : GW_SPEED.walk, Math.sqrt(2 * GW_ACC * d) + 34); }
  }
  else if (byKeys) {
    if (casting) _gwFishCancel('You reeled in to walk.');
    _gw.netting = null; _gw.path = []; _gw.then = null; _gw.replan = false;
    sneak = k.has('shift');
    const len = Math.hypot(mvx * W.cellW, mvy * W.cellH); ux = mvx * W.cellW / len; uy = mvy * W.cellH / len;
    want = sneak ? GW_SPEED.sneak : GW_SPEED.walk * _gwWalkBonus();
  } else if (_gw.path.length && !casting) {
    // cut corners: as soon as you can see the waypoint after the next, head for that one (no visiting the middle of cells)
    while (_gw.path.length > 1 && _gwLos({ x: _gw.px, y: _gw.py }, _gw.path[1], GW_CLEAR)) _gw.path.shift();
    tgt = _gw.path[0];
    const dxp = (tgt.x - _gw.px) * W.cellW, dyp = (tgt.y - _gw.py) * W.cellH;
    dist = Math.hypot(dxp, dyp); ux = dxp / (dist || 1); uy = dyp / (dist || 1);
    let rem = dist; for (let i = 1; i < _gw.path.length; i++) rem += Math.hypot((_gw.path[i].x - _gw.path[i - 1].x) * W.cellW, (_gw.path[i].y - _gw.path[i - 1].y) * W.cellH);
    sneak = _gw.sneak;
    want = sneak ? GW_SPEED.sneak : (rem > 170 ? GW_SPEED.run : GW_SPEED.walk) * _gwWalkBonus();
    want = Math.min(want, Math.sqrt(2 * GW_ACC * rem) + 34);   // ease in to the stop
  }
  if (want && typeof gardenPlayWalk === 'function') want *= gardenPlayWalk();   // a dish that gives you light feet (94-garden-play-3cook.js)
  _gw.spd = _gw.spd || 0;
  if (!want) _gw.spd = 0;
  else if (!gardenMotionOn()) _gw.spd = want;
  else { const a = GW_ACC * dt; _gw.spd += Math.max(-a * 1.4, Math.min(a, want - _gw.spd)); }
  if (want && _gw.spd > 3) {
    const step = _gw.spd * dt;
    if (direct) {
      // slide along walls and round corners, never stop on them
      const moved = _gwMoveBy(ux * step / W.cellW, uy * step / W.cellH);
      _gw.moving = moved; if (!moved) _gw.spd = 0;
    } else {
      let arrived = false;
      if (dist <= step) { _gw.px = tgt.x; _gw.py = tgt.y; _gw.path.shift(); arrived = !_gw.path.length; }
      else {
        const px0 = _gw.px, py0 = _gw.py, moved = _gwMoveBy(ux * step / W.cellW, uy * step / W.cellH);
        // how much of the step went the way we are heading: sliding sideways along a wall that is in the way is not getting anywhere
        const gain = moved ? ((_gw.px - px0) * W.cellW * ux + (_gw.py - py0) * W.cellH * uy) / Math.max(step, 0.01) : 0;
        _gw.blockT = gain < 0.35 ? (_gw.blockT || 0) + dt : 0;
        if (!moved || _gw.blockT > 0.25) {
          // the way is shut (something grew, or a corner caught the feet): plan another way to the same place, and stop only if there is none
          _gw.spd = 0; _gw.blockT = 0;
          if (!_gwRepath()) { _gw.path = []; _gw.then = null; }
        }
      }
      _gw.moving = _gw.spd > 3 || arrived;
      if (arrived) { _gw.moving = false; _gw.spd = 0; const th = _gw.then; _gw.then = null; _gwSaveSoon(); if (typeof th === 'function') { try { th(true); } catch (e) { console.error('[garden]', e); } } }
    }
    if (Math.abs(ux) > 0.3) _gw.face = ux > 0 ? 1 : -1;
    _gw.sneak = sneak;
    if (_gw.moving) _gwSaveSoon();
  } else if (_gw.moving) { _gw.moving = false; _gwSaveSoon(); }
  if (pushed) { _gw.moving = true; _gwSaveSoon(); }
  if (_gw.moving !== _gw._wasMoving) { _gw._wasMoving = _gw.moving; _gwBody(); }
  _gwApplyNode();
  _gwRouteFrame();
  if (byKeys && (mvx || mvy)) { gardenWalkedOnce(); if (_gh.bubble) gardenBubbleClose(); if (_gw.routeOn) _gwRouteShow(false); }
  _gwFadeProps();
  // 2. the things that live in the actors layer
  if (typeof _gwFishFrame === 'function') _gwFishFrame(dt);
  if (typeof _gwBugsFrame === 'function') _gwBugsFrame(dt);
  _gwPetFrame(dt);
  _gwSpritesFrame(dt);
  if (typeof gardenLifeVisitFrame === 'function') gardenLifeVisitFrame(ts);
  // 3. the camera
  if (gardenCamMode() === 'fit' ? _gw.cam.dirty : true) _gwApplyCam(dt);
  if (_gw.cam.dirty && !_gwCalm.hid && typeof _gartRestItems === 'function' && _gw.t - (_gw.restAt || 0) > 0.12) { _gw.restAt = _gw.t; _gartRestItems(_gw.svg); }   // what is drawn follows the view
  gardenHudFrame();
  // (something in this frame may have asked for the loop already: a walk begun on arrival, a sprite added. Two chains of frames, the second with dt 0, stop you dead: a step of nothing looks like a wall)
  if (_gw.raf || window.GardenPhaser && GardenPhaser.active(_gw.svg)) return;
  let pace = _gwPace();
  if (_gwCalm.on && pace < 60) pace = 2;   // calm: nobody is looking: look in twice a second (anything you do wakes it, and the next look is then at once)
  if (pace >= 60) _gw.raf = requestAnimationFrame(_gwFrame);
  else if (!_gw.idleT) _gw.idleT = setTimeout(() => { _gw.idleT = 0; if (_gw.on && !_gw.raf && !document.hidden) _gw.raf = requestAnimationFrame(_gwFrame); }, pace >= 30 ? 26 : pace <= 2 ? 500 : 90);
  } finally { _gw.frameActive = false; _gw.frameGrid = null; _gw.framePrefs = null; }
}
/** Equipment changes with a garden revision, rather than every walking frame. */
function _gwWalkBonus() {
  const source = typeof state !== 'undefined' && state ? state.garden : null;
  if (_gw.walkBonusRev !== _gd.rev || _gw.walkBonusSource !== source) {
    _gw.walkBonus = gardenLandWalkK(); _gw.walkBonusRev = _gd.rev; _gw.walkBonusSource = source;
  }
  return _gw.walkBonus;
}
/** A building you walk behind turns see-through, so you never lose yourself behind the shop. */
function _gwFadeProps() {
  const key = Math.floor(_gw.px * 2) + ',' + Math.floor(_gw.py * 2) + ',' + (_gw.svg && _gw.svg._gwFadeGen);
  if (_gw._fadeKey === key || !_gw.svg) return;
  _gw._fadeKey = key;
  // (the nodes are remembered: a search of the stage per building, every half cell walked, was a tenth of the frame)
  const svg = _gw.svg; let els = svg._gwPropEls;
  if (!els || svg._gwPropGen !== svg._gwFadeGen || svg._gwPropN !== svg.querySelector('.gd-objects').childElementCount) {
    els = svg._gwPropEls = new Map(); svg._gwPropGen = svg._gwFadeGen; svg._gwPropN = svg.querySelector('.gd-objects').childElementCount;
    for (const n of svg.querySelectorAll('.gd-prop[data-prop]')) { const id = n.getAttribute('data-prop'); let nodes = els.get(id); if (!nodes) { nodes = []; els.set(id, nodes); } nodes.push(n); }
  }
  for (const p of gardenPropsNow()) {
    if (!p.kind) continue;
    const nodes = els.get(p.id); if (!nodes) continue;
    const tall = p.tall == null ? 2 : p.tall;
    const behind = _gw.px > p.x - 0.4 && _gw.px < p.x + p.w + 0.4 && _gw.py > p.y - tall + 0.7 && _gw.py < p.y + p.h - 0.05;
    for (const n of nodes) if (!!n._gwBehind !== behind) { n._gwBehind = behind; n.classList.toggle('gd-behind', behind); }
  }
}
const GW_POS_KEY = 'opendash.garden.pos'; // exact legacy value is retained for recovery.
function _gwPositionKey() {
  if (GARDEN_WORLD.v < 3) return GW_POS_KEY;
  return typeof GARDEN_WORLD.lh === 'string' && /^[0-9a-f]{24}$/.test(GARDEN_WORLD.lh) ? GW_POS_KEY + '.v' + GARDEN_WORLD.v + '.' + GARDEN_WORLD.lh : null;
}
function _gwOutdoorPosition(p) { return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0 && p.x < GARDEN_WORLD.cols && p.y < GARDEN_WORLD.rows; }
function _gwSaveSoon() {
  if (typeof gardenVisitOn === 'function' && gardenVisitOn()) return;
  const key = _gwPositionKey(); if (!key || !_gwOutdoorPosition({ x: _gw.px, y: _gw.py })) return;
  if (GARDEN_WORLD.v >= 3 && typeof gardenWorldReady === 'function' && !gardenWorldReady()) return;
  _gw.saveDue = performance.now() + 1200; _gw.savePosKey = key;
  _gw.saveX = Math.round(_gw.px * 10) / 10; _gw.saveY = Math.round(_gw.py * 10) / 10;
  if (!_gw.saveT) _gw.saveT = setTimeout(_gwSavePosition, 1200);
}
function _gwSavePosition() {
  _gw.saveT = 0;
  const wait = _gw.saveDue - performance.now();
  if (wait > 1) { _gw.saveT = setTimeout(_gwSavePosition, wait); return; }
  const key = _gwPositionKey(), point = { x: _gw.saveX, y: _gw.saveY };
  if (!key || key !== _gw.savePosKey || !_gwOutdoorPosition(point) || typeof gardenVisitOn === 'function' && gardenVisitOn()) return;
  if (GARDEN_WORLD.v >= 3 && typeof gardenWorldReady === 'function' && !gardenWorldReady()) return;
  const value = GARDEN_WORLD.v >= 3 ? { wv: GARDEN_WORLD.v, lh: GARDEN_WORLD.lh, ...point } : point;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private window: no position persistence */ }
}
function _gwRestorePosition(point) {
  if (!_gwOutdoorPosition(point)) return null; // room sentinel columns remain the room owner's coordinates.
  if (_gwFree(point.x, point.y)) return { x: point.x, y: point.y };
  let best = _gwNearestFreePt(point.x, point.y, 3), distance = best ? ((best.x - point.x) * GARDEN_WORLD.cellW) ** 2 + ((best.y - point.y) * GARDEN_WORLD.cellH) ** 2 : Infinity;
  const grid = _gwGridNow(), W = GARDEN_WORLD;
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    if (grid[y * W.cols + x]) continue;
    const p = _gwCellPoint({ x, y }, grid), d = ((p.x - point.x) * W.cellW) ** 2 + ((p.y - point.y) * W.cellH) ** 2;
    if (d < distance && _gwFree(p.x, p.y)) { best = p; distance = d; }
  }
  return best ? { x: best.x, y: best.y } : null;
}
function _gwSavedPos() {
  if (typeof gardenVisitOn === 'function' && gardenVisitOn()) return null;
  const key = _gwPositionKey(); if (!key) return null;
  if (GARDEN_WORLD.v >= 3 && typeof gardenWorldReady === 'function' && !gardenWorldReady()) return null;
  try {
    const raw = localStorage.getItem(key), current = raw ? JSON.parse(raw) : null;
    if (GARDEN_WORLD.v < 3) return current && Number.isFinite(current.x) && Number.isFinite(current.y) ? current : null;
    const tagged = current && current.wv === GARDEN_WORLD.v && current.lh === GARDEN_WORLD.lh;
    const legacyRaw = tagged ? null : localStorage.getItem(GW_POS_KEY), legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
    const before = tagged ? current : legacy;
    // A raw legacy foot becomes a current foot only after the real new coast,
    // solids and current owned access have accepted or relocated it.
    const point = _gwRestorePosition(before); if (!point) return null;
    _gw.positionLayout = key;
    if (!tagged || point.x !== before.x || point.y !== before.y) {
      const resolution = { wv: GARDEN_WORLD.v, lh: GARDEN_WORLD.lh, ...point, restoredFrom: { kind: tagged ? 'same-layout-obstruction' : 'legacy', x: before.x, y: before.y } };
      try { localStorage.setItem(key, JSON.stringify(resolution)); } catch (e) { /* accepted foot still works without persistence */ } // exact old key is never changed/removed.
    }
    return point;
  } catch (e) { return null; }
}

/* ---------- the pet: it trots after you, sits when you stop, and sits at the pier while you fish ---------- */
function _gwPetSprite() {
  if (typeof window === 'undefined' || typeof window.petGardenSprite !== 'function') return null;
  const m = gardenHere(), key = [m.season, m.tod, !!m.rain.now].join('|');
  if (_gw.petKey === key && _gw.petSvg !== undefined) return _gw.petSvg;
  let list = null;
  try { list = window.petGardenSprite({ season: m.season, tod: m.tod, size: 'm', readOnly: false, rain: !!m.rain.now }); } catch (e) { list = null; }
  if (list && !Array.isArray(list)) list = [list];
  const p = list && list[0];
  _gw.petKey = key; _gw.petSvg = p && typeof p.svg === 'string' && p.svg.length < 40000 ? p.svg : '';
  return _gw.petSvg;
}
function _gwPetFrame(dt) {
  if (typeof petGardenWorldOwns === 'function' && petGardenWorldOwns()) { if (_gw.pet && _gw.pet.node) _gw.pet.node.remove(); _gw.pet = null; return; }   // 97-pets-7roam.js: your pets are out
  const svg = _gwPetSprite();
  const W = GARDEN_WORLD;
  if (!svg) { if (_gw.pet && _gw.pet.node && _gw.pet.node.parentNode) _gw.pet.node.remove(); _gw.pet = null; return; }
  let P = _gw.pet;
  if (!P || !P.node || P.svg !== svg) {
    if (P && P.node && P.node.parentNode) P.node.remove();
    if (_gw.svg) for (const n of _gw.svg.querySelectorAll('.gd-pet-follow')) n.remove();
    const NS = 'http://www.w3.org/2000/svg', g = gardenSceneElement('g');
    g.setAttribute('class', 'gd-pet gd-pet-follow'); g.setAttribute('data-live', '1'); g.setAttribute('data-z', String(_gw.py));
    g.innerHTML = `<g class="gdp-body"><g class="gdp-face"><g transform="scale(${GW_PET_SCALE})">${svg}</g></g></g>`;
    P = _gw.pet = { node: g, svg, x: _gw.px - 1.2, y: _gw.py + 0.2, face: 1, z: -1, moving: false };
  }
  // follow: keep about a cell and a half behind, never on top of you
  const goal = typeof gardenLifePetGoal === 'function' ? gardenLifePetGoal(P, dt) : null;   // it has noticed something (94-garden-life-4react.js): null means carry on following
  const dx = ((goal ? goal.x : _gw.px) - P.x) * W.cellW, dy = ((goal ? goal.y : _gw.py) - P.y) * W.cellH, dist = Math.hypot(dx, dy), want = goal ? goal.near || 14 : 40;
  let mv = false;
  if (dist > want + 10 || (goal && dist > want)) {
    const sp = Math.min((goal && goal.fast ? 240 : _gw.moving ? 260 : 170), dist - want) * dt;
    const nx = P.x + dx / dist * sp / W.cellW, ny = P.y + dy / dist * sp / W.cellH;
    const slide = gardenWorldSlide(P.x, P.y, nx - P.x, ny - P.y, .1, P.shoreMove || (P.shoreMove = {})); P.x = slide.x; P.y = slide.y; mv = slide.moved;
    // caught on a corner: it hops to your heel rather than running on the spot
    P.stuck = mv ? 0 : (P.stuck || 0) + dt;
    if (P.stuck > 0.5) { const f = _gwNearestFreePt(_gw.px - 0.8, _gw.py + 0.2, 2); if (f) { P.x = f.x; P.y = f.y; } P.stuck = 0; }
    if (Math.abs(dx) > 4) P.face = dx > 0 ? 1 : -1;
  }
  if (Math.hypot((_gw.px - P.x) * W.cellW, (_gw.py - P.y) * W.cellH) > 320) { P.x = _gw.px - 1; P.y = _gw.py; }
  P.moving = mv;
  const x = P.x * W.cellW, y = W.sky + P.y * W.cellH;
  const hop = mv && gardenMotionOn() ? -Math.abs(Math.sin(_gw.t * 14)) * 2.2 : 0, tfp = `translate(${x.toFixed(1)} ${(y + hop).toFixed(1)})`;
  if (P.tf !== tfp || !P.node.parentNode) { P.tf = tfp; P.node.setAttribute('transform', tfp); P.node.setAttribute('data-z', (P.y + 0.001).toFixed(2)); }
  if (P.fk !== P.face) { P.fk = P.face; const face = P.node.querySelector('.gdp-face'); if (face) face.setAttribute('transform', P.face < 0 ? 'scale(-1 1)' : ''); }
  const z = Math.floor(P.y * 2); if (z !== P.z || !P.node.parentNode) { P.z = z; _gwPlace(P.node, P.y); }
}

/* ---------- clicks: you just click what you want ---------- */
/**
 * The building, board or box under the pointer: what is actually drawn there, so a click on the lawn beside a roof is a click on the lawn (2.22 used
 * a rectangle `tall` rows high, and the lawn in front of the shop opened the shop). Without a pointer: its footprint.
 */
function _gwPropAtPt(wx, wy, ev) {
  if (ev && (window.GardenNative && GardenNative.active() || window.GardenPhaser && GardenPhaser.active(_gw.svg))) { const hit = gardenWorldVisualPick(ev); if (!hit || !hit.prop) return null; const p = gardenPropsNow().find(x => x.id === hit.prop) || gardenLandSiteProp(hit.prop); return p && p.act ? p : null; }
  if (ev && ev.clientX != null && typeof document.elementFromPoint === 'function') {
    const el = document.elementFromPoint(ev.clientX, ev.clientY), g = el && el.closest ? el.closest('.gd-prop[data-prop]') : null;
    if (g) { const id = g.getAttribute('data-prop'), p = gardenPropsNow().find(x => x.id === id) || gardenLandSiteProp(id); if (p && p.act) return p; }
  }
  for (const p of gardenPropsNow()) { if (p.act && (!p.needs || gardenWorkOwned(p.needs)) && wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + p.h) return p; }
  return null;
}
function _gwOpenProp(p) {
  if (!p) return;
  const go = {
    tackle: () => gardenPopupOpen('catch', { sub: 'tackle', title: 'Tackle shop' }), journal: () => gardenJournalOpen(),
    shop: () => gardenPopupOpen('shop'), basket: () => gardenPopupOpen('basket'), almanac: () => gardenPopupOpen('almanac'), friends: () => gardenPopupOpen('friends'),
    photo: () => { if (typeof gardenPhotoOpen === 'function') gardenPhotoOpen(); }, timelapse: () => { if (typeof gardenTimelapseOpen === 'function') gardenTimelapseOpen(); },
    sail: () => { if (typeof gardenBoatAsk === 'function' && gardenBoatAsk()) return; gardenPopupOpen('sail'); },
    hall: () => gardenPopupOpen('catch', { sub: 'hall', title: 'The lake hall' }), lake: () => gardenPopupOpen('catch', { sub: 'lake', title: 'The lake' }),
    angler: () => { if (typeof wdAnglerTalk === 'function' && wdAnglerTalk(p)) return; gardenPopupOpen('catch', { sub: 'lake', title: 'The old angler' }); },   // he talks first, once a day (94-garden-wonder-1kin.js) smoker: () => gardenPopupOpen('catch', { sub: 'lake', title: 'The smoker' }),
    craft: () => gardenPopupOpen('craft'),
    lands: () => gardenPopupOpen('lands'),
    lf: () => gardenLandPropOpen(p),
  }[p.act];
  if (go && p.door && typeof gardenSfx === 'function') gardenSfx('door');
  if (go) go();
}
/** Walk to a building's door and go in. */
function _gwGoToProp(p) {
  const d = p.door || { x: Math.floor(p.x + p.w / 2), y: p.y + p.h };
  const door = { x: d.x + 0.5, y: d.y + 0.5 };
  if (Math.hypot((door.x - _gw.px) * GARDEN_WORLD.cellW, (door.y - _gw.py) * GARDEN_WORLD.cellH) < 56) { _gw.path = []; _gwOpenProp(p); return; }
  if (!gardenWalkToPoint(door, () => _gwOpenProp(p), { radius: 1.5 })) gameDeny(_gdp.svg && _gdp.svg.querySelector(`.gd-prop[data-prop="${p.id}"]`), { say: 'You cannot get to the door.' });
}
function gardenGoToProp(id) { const p = GARDEN_PROPS.find(x => x.id === id); if (p) _gwGoToProp(p); }
/** Walk to whichever building does this (`act` in GARDEN_PROPS). */
function gardenGoToAct(act) { const p = GARDEN_PROPS.find(x => x.act === act); if (p) _gwGoToProp(p); }
/**
 * What a click here would do: ONE answer, used by the hover (what lights up, the cursor) and by the click and the press, so the
 * highlight never promises something else. {kind: 'prop' | 'seed' | 'bug' | 'plant' | 'decor' | 'land' | 'water' | 'spot' | 'ground' | 'none', ...}.
 * it: the plant or decoration under the pointer ({uid, kind}) or null; cell: the cell or null.
 */
const GW_BUG_PICK = Object.freeze({ open: 0.5, onPlant: 0.2 });   // how near in cells counts as clicking a bug: forgiving on open ground, exact on a plant
/** Tools can reach canonical beds beneath a roof's visual overhang. */
function _gwPlantPickIntent(m, pt) {
  const tool = _gdpTool(), cell = { x: Math.floor(pt.x), y: Math.floor(pt.y) }, W = GARDEN_WORLD;
  if (cell.x < 0 || cell.y < 0 || cell.x >= W.cols || cell.y >= W.rows) return { tool, cell, plant: null, plantTool: false, seed: false, emptyBed: false };
  const plant = _gdpPlantAtCell(m, cell), plantTool = ['water', 'feed', 'trim', 'dig'].includes(tool);
  const seedDef = tool === 'seed' && _gdp.seed ? gardenPlant(_gdp.seed) : null;
  const seed = !!seedDef && !_gdPlaceOk(m, seedDef, cell.x, cell.y, 'plant');
  const area = tool === 'hand' && !plant ? gardenArea(gardenAreaAt(cell.x, cell.y, m.level.level)) : null;
  const emptyBed = !!(area && area.cats && area.cats.length && !m.occ.has(cell.x + ',' + cell.y) && !(m.visit && m.visit.no.plant));
  return { tool, cell, plant, plantTool, seed, emptyBed };
}
function _gwPropOwnsPoint(prop, pt) {
  // An unbuilt site's artwork is its price marker. Its future building
  // footprint is empty ground and must not intercept plants or insects.
  if (prop.site) return false;
  if (pt.x >= prop.x && pt.x < prop.x + (prop.w || 1) && pt.y >= prop.y && pt.y < prop.y + (prop.h || 1)) return true;
  const door = prop.door;
  return !!door && Math.abs(pt.x - door.x - .5) <= .42 && Math.abs(pt.y - door.y - .5) <= .34;
}
function _gwExposedNativeBug(prop, pt) {
  const native = window.GardenNative, world = native && native.active() && native.world();
  if (!world || _gdpTool() !== 'hand' || typeof _gwBugNear !== 'function') return null;
  const bug = _gwBugNear(pt.x, pt.y, GW_BUG_PICK.onPlant), drawing = world.entities.get('prop:' + prop.id), node = bug && bug.node;
  if (!node || !node.isConnected || !node.target.visible || node.target.alpha <= .025 || !drawing) return null;
  // A visible insect can sit in front of a facade or show through its faded
  // overhang. Exact bug clicks keep their contextual net action there too.
  return node.target.depth >= drawing.depth || drawing.behind || drawing.root.alpha <= .45 ? bug : null;
}
function gardenWorldPick(it, cell, ev, m) {
  if (!_gw.on) return { kind: 'none' };
  const raw = _gwPointAt(ev) || (cell ? { x: cell.x + 0.5, y: cell.y + 0.5 } : null);
  if (!raw) return { kind: 'none' };
  // the sky above the garden and the edges are not dead: a click there is a click on the nearest ground
  const WD = GARDEN_WORLD, pt = { x: Math.max(0.2, Math.min(WD.cols - 0.2, raw.x)), y: Math.max(0.2, Math.min(WD.rows - 0.2, raw.y)) };
  const sprite = _gdpTool() === 'hand' ? _gwSpriteAt(raw) : null;   // first, even on a roof: a robin on the shop is the robin, not the shop (a tool in your hand means the plant)
  if (sprite) return { kind: 'sprite', sprite, pt };
  if (ev && (window.GardenNative && GardenNative.active() || window.GardenPhaser && GardenPhaser.active(_gw.svg)) && _gdpTool() === 'hand') { const hit = gardenWorldVisualPick(ev); if (hit && hit.land) return { kind: 'land', land: hit.land, pt, cell }; }
  const prop = _gwPropAtPt(pt.x, pt.y, ev);
  if (prop) { const bug = _gwExposedNativeBug(prop, pt); return bug ? { kind: 'bug', bug, pt } : { kind: 'prop', prop, pt }; }
  if (_gdpTool() === 'seed') return { kind: 'seed', pt };   // planting is its own click (the sweep)
  const c = cell || { x: Math.floor(pt.x), y: Math.floor(pt.y) };
  m = m || gardenHere();
  const plant = it && it.kind === 'plant' ? gardenPlantById(m, it.uid) : _gdpPlantAtCell(m, c);
  // bugs live on flowers: on a plant you have to mean the bug itself, or a bee beside a ripe daisy would keep you from ever picking it
  const bug = typeof _gwBugNear === 'function' ? _gwBugNear(pt.x, pt.y, plant ? GW_BUG_PICK.onPlant : GW_BUG_PICK.open) : null;
  if (bug) return { kind: 'bug', bug, pt };
  const decor = it && it.kind === 'decor' && (!it.ground || _gdpTool() === 'dig') ? gardenDecorById(m, it.uid) : null;   // you walk over a path, but the spade lifts it
  if (plant || decor) return { kind: plant ? 'plant' : 'decor', plant, decor, pt, cell: c };
  const area = gardenAreaAt(c.x, c.y, m.level.level);
  if (area.startsWith('locked:')) return { kind: 'land', land: area.slice(7), pt, cell: c };
  { const sign = ev && ev.target && ev.target.closest ? ev.target.closest('.gd-locksign[data-land]') : null; if (sign) return { kind: 'land', land: sign.getAttribute('data-land'), pt, cell: c }; }   // (a sign stands on the path, in front of what it is about)
  if (gardenIsWater(c.x, c.y)) return { kind: 'water', pt, cell: c };
  const def = gardenArea(area), oc = m.occ.get(c.x + ',' + c.y);
  if (_gdpTool() === 'hand' && def && def.cats && def.cats.length && !oc && !(m.visit && m.visit.no.plant)) return { kind: 'spot', pt, cell: c };   // an empty spot in a bed: it offers planting right there
  return { kind: 'ground', pt, cell: c };
}
/** What is under the pointer: {kind, text} for a building, a bug or the water; null for anything else (plants are the page's own). */
function gardenWorldHover(ev, cell, it) {
  if (!_gw.on) return null;
  _gw.hoverBug = '';
  const k = gardenWorldPick(it || null, cell, ev, gardenHere());
  if (k.kind === 'prop') return { kind: 'prop', id: k.prop.id, text: k.prop.name };
  if (k.kind === 'bug') { _gw.hoverBug = k.bug.key; return { kind: 'bug', text: k.bug.def.name }; }
  if (k.kind === 'water') return { kind: 'water', text: '' };
  return null;
}
/** Walk up to a point and then do something; if you are already there, do it now. Returns false when there is no way there. */
function gardenWalkAct(stand, fn, o) {
  const W = GARDEN_WORLD, near = (o && o.near) || 62;
  if (Math.hypot((stand.x - _gw.px) * W.cellW, (stand.y - _gw.py) * W.cellH) < near) { _gw.path = []; _gwRouteShow(false); if (o && o.face) gardenWorldFace(o.face); fn(); return true; }
  return gardenWalkToPoint(stand, () => { if (o && o.face) gardenWorldFace(o.face); fn(); }, { radius: (o && o.radius) || 3 });
}
/**
 * A click on the stage (from _gdpClick, every mode but Decorate). Returns true when the world handled it.
 * Everything is done by walking up to it: you click what you want and the figure goes and does it (2.23). With nothing special in your hand a
 * ripe plant is picked, a thirsty one watered, a wild one trimmed, a happy one offers its bubble, and an empty spot in a bed offers the seeds that would grow there.
 * it: the item under the pointer ({uid, kind}) or null; cell: the cell or null; ev: the pointer event (its exact point is used).
 */
function gardenWorldClick(it, cell, ev, m) {
  if (!_gw.on || (!cell && !_gwPointAt(ev))) return false;
  const tool = _gdpTool(), at = ev && ev.clientX != null ? { x: ev.clientX, y: ev.clientY } : null;
  if (typeof _gwFishBusy === 'function' && _gwFishBusy()) { return typeof _gwFishClick === 'function' ? _gwFishClick(cell, ev) : true; }   // a line is out: a click reels
  // wherever you click next, you stop creeping after a bug (the chase used to win over your clicks until the bug got away)
  if (_gw.netting && _gw.netting.state === 'chase') _gw.netting = null;
  const k = gardenWorldPick(it, cell, ev, m);
  if (k.kind === 'decor' && tool === 'hand' && typeof gardenBackStep === 'function' && gardenBackStep(k.decor, m || gardenHere())) return true;
  // 1. a building, a board or a box: walk to its door and go in
  if (k.kind === 'prop') { _gwGoToProp(k.prop); return true; }
  if (k.kind === 'seed') return false;   // planting is its own click
  // 2. a bug: creep up on it
  if (k.kind === 'bug') { _gwNetChase(k.bug); return true; }
  if (k.kind === 'sprite') {
    const S = k.sprite;
    if (typeof S.onAim === 'function') S.onAim(S);   // you are coming over to it: it waits for you
    if (typeof S.onClick === 'function') { if (!gardenWalkAct({ x: S.x, y: S.y + 0.6 }, () => S.onClick(S), { radius: 2.5, near: 70 })) gameDeny(null, { at, say: 'You cannot get to it.' }); }
    return true;
  }
  // 3. the water: cast
  if (k.kind === 'water' && typeof gardenFishClickPt === 'function') return gardenFishClickPt(k.pt, m);
  // 4. a plant or a decoration: walk up, then do it
  if (k.kind === 'plant' || k.kind === 'decor') {
    const plant = k.plant, decor = k.decor;
    const stand = plant ? { x: plant.x + plant.fp / 2, y: plant.y + plant.fp + 0.4 } : { x: decor.x + (decor.def.w || 1) / 2, y: decor.y + (decor.def.h || 1) + 0.4 };
    const uid = plant ? plant.uid : decor.uid;
    if (m.visit && plant && gardenVisitCursor(plant, tool) === 'no') { gardenVisitClickNo(plant, tool); return true; }   // your level does not reach it: you are told now, and do not walk over for nothing
    if (!gardenWalkAct(stand, () => _gdpActOn(uid), { face: k.cell, near: plant ? 62 + plant.fp * 20 : 70 })) gameDeny(_ghNodeOf(uid), { at, say: 'You cannot get to it.' });
    return true;
  }
  // 5. land that is not yours
  if (k.kind === 'land') { gardenLandClick(k.land, ev); return true; }
  // 6. an empty spot in a bed, with your hand free: walk over and it offers planting right there
  if (k.kind === 'spot') {
    const c = k.cell;
    if (!gardenWalkAct({ x: c.x + 0.5, y: c.y + 1.3 }, () => gardenSpotBubble(c, gardenHere()), { radius: 2.5, face: c, near: 70 })) gameDeny(null, { at, say: 'You cannot get there.' });
    return true;
  }
  // 7. the ground (or the sky, or the far side of the water): walk to the nearest place you can stand to where you clicked
  if (!gardenWalkToPoint(k.pt, null, { radius: 8 })) gameDeny(null, { at, say: 'You cannot get there.' });
  return true;
}

/* ---------- press and hold: keep walking to the pointer ---------- */
/**
 * Pressing on bare ground starts you walking there (round whatever is in the way, like any click). Hold the button on and, after a moment
 * or as soon as you drag, you steer straight at the pointer and keep going for as long as it is down (the camera follows you, so the same
 * spot on the screen is always a little further on). Letting go while steering stops you; letting go of a quick click does not.
 */
function gardenHoldStart(ev) {
  if (!_gw.on || (typeof _gwFishBusy === 'function' && _gwFishBusy())) return false;
  const pt = _gwPointAt(ev); if (!pt) return false;
  if (_gw.netting && _gw.netting.state === 'chase') _gw.netting = null;
  _gw.hold = { cx: ev.clientX, cy: ev.clientY, x0: ev.clientX, y0: ev.clientY, t0: _gw.t || 0, steer: false };
  if (!gardenWalkToPoint(pt, null, { radius: 8 })) gameDeny({ x: ev.clientX, y: ev.clientY }, { say: 'You cannot get there.' });
  _gwEnsureLoop();
  return true;
}
function gardenHoldMove(ev) {
  const H = _gw.hold; if (!H) return;
  H.cx = ev.clientX; H.cy = ev.clientY;
  if (!H.steer && (Math.abs(H.cx - H.x0) > 6 || Math.abs(H.cy - H.y0) > 6)) H.steer = true;
  _gwEnsureLoop();
}
/** Let go: a quick click carries on to where you clicked; a held one stops you where you are. */
function gardenHoldEnd() {
  const H = _gw.hold; _gw.hold = null;
  if (H && H.steer) { _gw.path = []; _gw.then = null; }
}
const _GW_KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
/** A key on the stage. Returns true when it was a world key (the page then does nothing else with it). */
function gardenWorldKey(ev, down, arrowsOnly) {
  if (!_gw.on) return false;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
  const dir = _GW_KEYMAP[ev.key] && (!arrowsOnly || ev.key.startsWith('Arrow')) ? _GW_KEYMAP[ev.key] : null;
  if (dir) {
    if (down && ev.key === 'W') return false;   // Shift+W is "water everything": W alone walks
    // up lifts the bar while you reel; otherwise it walks
    if (dir === 'up' && _gw.reel) { _gw.reel.hold = !!down; ev.preventDefault(); return true; }
    if (down) { _gw.keys.add(dir); if (ev.shiftKey) _gw.keys.add('shift'); else _gw.keys.delete('shift'); _gwEnsureLoop(); } else _gw.keys.delete(dir);
    ev.preventDefault(); return true;
  }
  if (ev.key === 'Shift') { if (down) _gw.keys.add('shift'); else _gw.keys.delete('shift'); return false; }
  if (!down) { if (ev.key === ' ' || ev.key === 'e' || ev.key === 'E') { if (typeof _gwFishRelease === 'function') _gwFishRelease(); return true; } return false; }
  const k = ev.key;
  if (k === '+' || k === '=') { gardenCamSet(null, -1); ev.preventDefault(); return true; }
  if (k === '-' || k === '_') { gardenCamSet(null, 1); ev.preventDefault(); return true; }
  if (k === 'f' || k === 'F') { gardenCamSet(gardenCamMode() === 'fit' ? 'follow' : 'fit'); ev.preventDefault(); return true; }
  if (k === 'c' || k === 'C') { gardenCamSet('follow'); ev.preventDefault(); return true; }
  if (k === 'q' || k === 'Q') { if (typeof gartEmoteWheel === 'function') gartEmoteWheel(); ev.preventDefault(); return true; }
  if ((k === 'j' || k === 'J') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { if (typeof gardenJournalOpen === 'function') gardenJournalOpen(); ev.preventDefault(); return true; }   // the Field Journal
  if (arrowsOnly) return false;
  if (k === ' ' || k === 'e' || k === 'E') { if (ev.repeat) { ev.preventDefault(); return true; } gardenWorldInteract(); ev.preventDefault(); return true; }
  return false;
}
/** Space / E: do the sensible thing right here: a bite, a door beside you, a bug in reach, a ripe plant, water in front of you. */
function gardenWorldInteract() {
  if (typeof _gwFishBusy === 'function' && _gwFishBusy()) { if (typeof _gwFishPress === 'function') _gwFishPress(); return; }
  const m = gardenHere(), W = GARDEN_WORLD;
  const px = Math.floor(_gw.px), py = Math.floor(_gw.py);
  for (const p of gardenPropsNow()) if (p.act && p.door && Math.abs(p.door.x - px) <= 1 && Math.abs(p.door.y - py) <= 1) { _gwOpenProp(p); return; }
  if (_gh.bubble) { const b = _gh.bubble.el.querySelector('.gd-bub-btn'); if (b) b.click(); return; }
  if (typeof gardenTravellerInteract === 'function' && gardenTravellerInteract()) return;
  if (_gw.bugs && _gw.bugs.size && typeof gardenNetSwing === 'function') { for (const b of _gw.bugs.values()) if (Math.hypot(b.x - _gw.px, (b.y - _gw.py) * 1.4) < gardenNet().st.reach * 1.35) { gardenNetSwing(null); return; } }
  const fx = px + (_gw.face > 0 ? 1 : -1), fy = py;
  const cells = [[fx, fy], [px, py + 1], [px, py - 1], [px + 1, py], [px - 1, py], [fx, fy + 1], [fx, fy - 1]];
  for (const [cx, cy] of cells) {
    if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) continue;
    const c = m.occ.get(cx + ',' + cy), p = c && c.plant ? gardenPlantById(m, c.plant) : null;
    if (p) { _gdpActOn(p.uid); return; }
  }
  if (typeof gardenFishFront === 'function') { for (let r = 1; r <= gardenRod().st.range; r++) for (const dy of [1, 0, -1]) { const x = px + _gw.face * r, y = py + dy; if (x >= 0 && x < W.cols && y >= 0 && y < W.rows && gardenIsWater(x, y)) { gardenFishFront(); return; } } for (let r = 1; r <= gardenRod().st.range; r++) if (py + r < W.rows && gardenIsWater(px, py + r)) { gardenFishFront(); return; } }
  { const s = _ghProject(_gw.px, _gw.py - 1.4), r = _gw.box && _gw.box.getBoundingClientRect(); gameDeny(null, { at: s && r ? { x: r.left + s.x, y: r.top + s.y } : null, silent: true, say: 'Nothing in reach.' }); }
}

/* ---------- the world's API for anything that lives in it (docs/dev/GARDEN.md, "The world API") ---------- */
/** The one collision map, for feet of any size: can something this wide (r, in cells) stand at x, y? */
function gardenWorldFree(x, y, r) {
  const f = r == null ? 0.1 : r;
  return _gwFootCells(x, y, f, f, true) && !_gwSolidHit(x, y, f, f) && gardenWonderWalkFine(x, y, f);
}
function gardenWorldAmphibiousFree(x, y, r) {
  const f = r == null ? .14 : r, grid = _gwGridNow(true);
  if (!_gwHardFeet(grid, x, y, f, f) || _gwSolidHit(x, y, f, f)) return false;
  if (grid.shore && y + f >= gardenLakeOpenTo() && !gardenShoreFootProbe(grid.shore, x, y, f, f, false, grid.waterCover, grid.probe).free) return false;
  const W = GARDEN_WORLD; for (let cy = Math.floor(y - f); cy <= Math.floor(y + f); cy++) for (let cx = Math.floor(x - f); cx <= Math.floor(x + f); cx++) if (grid.otherWater[cy * W.cols + cx] && gardenWaterNo(cx, cy, grid.model)) return false;
  return true;   // a swimmer may straddle dry land and liquid at the bank
}
function gardenWorldNearestFree(x, y, radius, foot) {
  const W = GARDEN_WORLD, R = radius == null ? 3 : radius; let best = null, distance = Infinity;
  for (let dy = -R; dy <= R; dy += .25) for (let dx = -R; dx <= R; dx += .25) { const d = Math.hypot(dx * W.cellW, dy * W.cellH); if (d < distance && gardenWorldFree(x + dx, y + dy, foot == null ? .14 : foot)) { distance = d; best = { x: x + dx, y: y + dy }; } }
  return best;
}
/* How high up a thing's top surface is, as a share of its height, by behaviour (a seat is sat on below the top of its back). A catalogue row can say `perch: 0.8` for itself. */
const GARDEN_SURFACE_BY_EFFECT = Object.freeze({ sit: 0.55 });
/**
 * Everything standing in the garden: [{kind ('plant' | 'decor' | 'prop'), uid, id, name, x, y (top-left cell), w, h, z (the row it is sorted by), height (stage px), top: {x, y (cells), lift (px above the ground)}, node()}].
 * top is where something could land or sit. Flat things (paths, seedlings) are not listed. Worked out on demand: don't call it every frame.
 */
function gardenWorldObjects(mArg) {
  const m = mArg || gardenHere(), out = [], K = 0.75 * GARDEN_WORLD.unit;
  const row = (kind, uid, def, x, y, w, h, hgt, share) => {
    const height = Math.round(hgt * K);
    out.push({ kind, uid, id: def.id, name: def.name, x, y, w, h, z: y + h, height, top: { x: x + w / 2, y: y + h - 0.15, lift: Math.round(height * share) }, node: () => (_gdp.svg && uid ? _gdp.svg.querySelector(`.gd-it[data-uid="${CSS.escape(uid)}"], .gd-prop[data-prop="${CSS.escape(uid)}"]`) : null) });
  };
  for (const p of m.plants) { if (p.stage < 2) continue; const lk = p.def.look || {}; row('plant', p.uid, p.def, p.x, p.y, p.fp, p.fp, (lk.h || 0.7) * (0.4 + p.stage * 0.15), p.def.perch || 0.9); }
  for (const d of m.decor) { if (d.def.layer === 'ground') continue; const lk = d.def.look || {}; row('decor', d.uid, d.def, d.x, d.y, d.def.w || 1, d.def.h || 1, lk.h || 0.6, d.def.perch || (d.def.effect && GARDEN_SURFACE_BY_EFFECT[d.def.effect.kind]) || 0.95); }
  for (const p of GARDEN_PROPS) { if (!p.kind) continue; row('prop', p.id, p, p.x, p.y, p.w, p.h, p.tall == null ? 2 : p.tall, p.perch || 0.9); }
  return out;
}
/**
 * Add something that moves to the world. It is drawn by where its feet are, in with the plants and you, and the loop calls update(dt, sprite) each frame.
 * sprite: {id, svg (markup, its feet at 0,0), x, y (cells), lift (px off the ground), update(dt, s), ground (true: moveBy keeps it on the collision map), foot (its width in cells),
 *          hit (how near a click counts, cells; 0 or none: clicks go through), label, cursor ('hand', ...), onClick(s): you walk up and then this runs}
 * Returns the sprite with moveBy(dx, dy), perch(obj) (on top of a gardenWorldObjects row: it sorts with that thing, so a bird on a fence is hidden by what hides the fence), unperch() and remove().
 */
function gardenWorldAdd(sprite) {
  const S = sprite, W = GARDEN_WORLD;
  S.lift = S.lift || 0; S.z = S.z == null ? null : S.z;
  S.moveBy = (dx, dy) => {
    if (!S.ground) { S.x += dx; S.y += dy; return true; }
    const result = gardenWorldSlide(S.x, S.y, dx, dy, S.foot == null ? .1 : S.foot, S._shoreMove || (S._shoreMove = {}));
    S.x = result.x; S.y = result.y; return result.moved;
  };
  S.perch = (obj) => { S.x = obj.top.x; S.y = obj.top.y; S.lift = obj.top.lift; S.z = obj.z + 0.01; S.on = obj; };
  S.unperch = () => { S.lift = 0; S.z = null; S.on = null; };
  S.remove = () => { if (typeof _gdpSpriteHintChanged === 'function') _gdpSpriteHintChanged(S, true); _gwSprites.delete(S); if (S.node && S.node.remove) S.node.remove(); S.node = null; };
  _gwSprites.add(S);
  void W;
  _gwEnsureLoop();
  return S;
}
const _gwSprites = new Set();
function _gwSpritesFrame(dt) {
  if (typeof gardenTravellersFrame === 'function') gardenTravellersFrame(dt);
  if (!_gwSprites.size || !_gw.svg) return;
  const W = GARDEN_WORLD;
  for (const S of _gwSprites) {
    if (S.simulationOnly) { if (typeof S.update === 'function') { try { S.update(dt, S); } catch (e) { console.error('[garden sprite]', e); S.remove(); } } continue; }
    if (!S.node || !S.node.isConnected) {
      const native = window.GardenNative && GardenNative.active() && GardenNative.world();
      const retained = native && native.rootNode === _gw.svg && native.rootNode.isConnected && native.objectsNode && native.objectsNode.isConnected;
      const g = retained ? gardenSceneElement('g', Object.assign({ class: 'gd-sprite', 'data-live': '1' }, S.nodeAttrs)) : gardenSceneElement('g');
      // Compile native body selectors once in their real scene ancestry. The
      // Classic node still receives its body before the later depth placement.
      if (retained) native.objectsNode.appendChild(g); else { g.setAttribute('class', 'gd-sprite'); g.setAttribute('data-live', '1'); }
      g.innerHTML = S.svg || '';
      S.node = g; S.zk = null; S.tf = null;   // (a new node has no place yet: without this, someone standing still after a redraw sat at the world's top-left corner until they next moved)
    }
    if (typeof S.update === 'function') { try { S.update(dt, S); } catch (e) { console.error('[garden sprite]', e); S.remove(); continue; } }
    if (!S.node) continue;
    const culled = gardenCull(S, S.node, S.x, S.y);
    if (typeof _gdp !== 'undefined' && _gdp.hoverSprite === S) _gdpSpriteHintChanged(S, false);
    if (culled && S.node.parentNode) continue;   // out of the view: it goes on living (update above), and nothing is drawn or moved on the page
    const tf = `translate(${(S.x * W.cellW).toFixed(1)} ${(W.sky + S.y * W.cellH - S.lift).toFixed(1)})`;
    if (S.tf !== tf) { S.tf = tf; S.quiet = 0; S.node.setAttribute('transform', tf); } else S.quiet = (S.quiet || 0) + dt;
    const z = S.z != null ? S.z : S.y, zk = Math.floor(z * 3);
    if (S.zk !== zk || !S.node.parentNode) { S.zk = zk; S.node.setAttribute('data-z', z.toFixed(2)); _gwPlace(S.node, z); }
  }
}
function _gwSpriteAt(pt) {
  const W = GARDEN_WORLD; let best = null, bestDistance = Infinity, bestDepth = -Infinity;
  const visiting = typeof _gl !== 'undefined' && _gl.visit && _gl.visit.svg === _gw.svg && typeof _glVisitSprites !== 'undefined' ? _glVisitSprites : null;
  for (const sprites of visiting ? [_gwSprites, visiting] : [_gwSprites]) for (const S of sprites) {
    if (!S.hit || !S.node || !S.node.isConnected || S._off || S.node._native && (!S.node.target.visible || S.node.target.alpha <= .025)) continue;
    const distance = Math.hypot((S.x - pt.x) * W.cellW, (S.y - (S.lift + (S.hitUp || 0)) / W.cellH - pt.y) * W.cellH) / (S.hit * W.cellW);
    const depth = S.node._native ? S.node.target.depth : S.z == null ? S.y : S.z;
    // Overlapping door proxies and creatures share the numeric picker. Choose
    // the body under the point rather than whichever was registered first.
    if (distance < 1 && (distance < bestDistance || distance === bestDistance && depth > bestDepth)) { best = S; bestDistance = distance; bestDepth = depth; }
  }
  return best;
}
/* ---------- start, stop, paint ---------- */
function gardenWorldStart(root, m) {
  gardenWorldStop(true);
  _gw.on = true; _gw.root = root; _gw.box = root.querySelector('.gd-stagebox'); _gw.cam.init = false; _gw.cam.dirty = true; _gw.t = 0; _gw.sizeOk = false;
  // where you stood: this page's own position if the garden is drawn again (another tab wrote, the state was replaced), else the last one on this device
  const again = !!_gw.placed && (GARDEN_WORLD.v < 3 || _gw.positionLayout === _gwPositionKey());
  const sv = again ? { x: _gw.px, y: _gw.py } : _gwSavedPos();
  if (sv && (again || _gwFree(sv.x, sv.y))) { _gw.px = sv.x; _gw.py = sv.y; }   // (a redraw never moves you: the walk-out below does, if something is in the way)
  else { const f = _gwCellPoint(_gwNearestFree(GARDEN_WORLD.start.x, GARDEN_WORLD.start.y, 8) || GARDEN_WORLD.start); _gw.px = f.x; _gw.py = f.y; }
  // the page being drawn again (another tab wrote, the state was replaced) used to stop a walk in progress: it now carries on
  _gw.positionLayout = _gwPositionKey(); _gw.placed = true; if (!again) { _gw.path = []; _gw.then = null; } _gw.moving = false; _gw.fig = { idle: '', walk: '' }; _gw.bodyKey = ''; _gw.node = null; _gw.pet = null; _gw.keys.clear();
  if (_gw.box) {
    _gwBuildCamUi(_gw.box);
    if (typeof ResizeObserver !== 'undefined') { _gw.ro = new ResizeObserver(() => { _gw.sizeOk = false; _gw.cam.dirty = true; _gw.cam.snap = true; _gwEnsureLoop(); }); _gw.ro.observe(_gw.box); }
    _gw.box.addEventListener('keyup', _gwKeyUp);
    _gw.box.addEventListener('blur', _gwBlur);
  }
  document.addEventListener('keydown', _gwDocKeyDown); document.addEventListener('keyup', _gwDocKeyUp);
  if (!_gw.vis) { _gw.vis = true; document.addEventListener('visibilitychange', () => { if (!document.hidden) { _gw.last = 0; _gwEnsureLoop(); } }); window.addEventListener('blur', _gwBlur); }
  gardenWorldPainted(m || gardenHere());
  _gwUpdateCamUi();
  if (typeof _gwFishResume === 'function') _gwFishResume();   // a line that was out when the garden was drawn again is still out
  _gwEnsureLoop();
}
function _gwKeyUp(ev) { gardenWorldKey(ev, false); }
/* The keys work wherever you are on the garden page (not only when the stage itself has focus): after you click a button or a tool the
   focus is elsewhere, and having to click the garden again before the keys work was the old garden's worst habit. Text fields, buttons,
   menus and dialogs keep their own keys. */
function _gwDocKeyDown(ev) {
  if (!_gw.on || !_gdp.root || !_gdpWorldView() || ev.defaultPrevented || ev.isComposing || _gdpPopOpen()) return;
  const t = ev.target;
  if (t && t.closest && (t.closest('.gd-stagebox') || t.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"], .gd-guide, .modal, .popover, .cmdk, .palette'))) return;
  if (document.querySelector('.gd-guide, .modal-backdrop.is-open, .cmdk.is-open')) return;
  _gdpKey(ev);
}
function _gwDocKeyUp(ev) { if (_gw.on) gardenWorldKey(ev, false); }
function _gwBlur() { _gw.keys.clear(); _gw.hold = null; if (typeof _gwFishRelease === 'function') _gwFishRelease(); }
function gardenWorldStop(keepOn) {
  if (typeof gardenTravellersStop === 'function') gardenTravellersStop(!!keepOn);
  if (!keepOn && window.GardenNative && GardenNative.active()) GardenNative.destroy();
  if (!keepOn && window.GardenPhaser) GardenPhaser.destroy();
  if (_gw.raf) cancelAnimationFrame(_gw.raf);
  if (_gw.idleT) { clearTimeout(_gw.idleT); _gw.idleT = 0; }
  _gw.raf = 0; _gw.hold = null;   // the button's events went with the old stage: nothing would ever let go
  if (_gw.ro) { _gw.ro.disconnect(); _gw.ro = null; }
  if (_gw.box) { _gw.box.removeEventListener('keyup', _gwKeyUp); _gw.box.removeEventListener('blur', _gwBlur); }
  document.removeEventListener('keydown', _gwDocKeyDown); document.removeEventListener('keyup', _gwDocKeyUp);
  // leaving the garden ends your line; the garden only being drawn again (another tab or the server wrote the state) does not
  if (!keepOn && typeof _gwFishReset === 'function') _gwFishReset(); else _gw.fx = null;
  if (typeof _gwBugsReset === 'function') _gwBugsReset();
  gardenBubbleClose();
  if (!keepOn) { gardenMessageClear(); if (typeof gardenPlaySeekStop === 'function') gardenPlaySeekStop(); if (typeof gardenLiveHostGone === 'function') gardenLiveHostGone(); if (typeof gardenLifeStop === 'function') gardenLifeStop(); if (typeof gardenWonderStop === 'function') gardenWonderStop(); _gw.on = false; _gw.routeEls = null; _gw.reach = null; _gw.root = null; _gw.svg = null; _gw.box = null; _gw.node = null; _gw.pet = null; _gw.grid = null; }
}
/** After every paint of the stage: the svg may be a new element (a mount), or the patch may have dropped our nodes. */
function gardenWorldPainted(m) {
  if (window.GardenNative && GardenNative.active()) { GardenNative.sync(m || gardenHere()); return; }
  if (!_gw.on || !_gdp.svg) return;
  if (_gw.svg !== _gdp.svg) { _gw.svg = _gdp.svg; _gw.node = null; _gw.cam.init = false; _gw.cam.dirty = true; if (_gw.pet) { _gw.pet.node = null; _gw.pet = null; } if (typeof _gwBugsReset === 'function') _gwBugsReset(); }
  _gwGrid(m);
  if (!_gw.node || !_gw.node.isConnected) { for (const n of _gw.svg.querySelectorAll('.gd-player')) n.remove(); _gw.node = _gwMakeNode(); _gw.bodyKey = ''; _gwBody(); if (typeof gardenLiveMineRedraw === 'function') gardenLiveMineRedraw(); }
  else for (const n of _gw.svg.querySelectorAll('.gd-player')) if (n !== _gw.node) n.remove();
  // (boxed in by a new plant or decoration? _gwPushOut walks you out in the loop and carries your walk on)
  _gw.z = -1; _gw._fadeKey = ''; _gwApplyNode();
  if (_gw.pet && _gw.pet.node) { _gw.pet.z = -1; _gwPlace(_gw.pet.node, _gw.pet.y); }
  if (typeof _gwBugsSync === 'function') _gwBugsSync(m);
  _gwApplyCam(0.016, !_gw.cam.init);
  if (typeof gardenLifeSync === 'function') gardenLifeSync(m);   // the creatures (94-garden-life-*.js)
  if (typeof gardenWonderSync === 'function') gardenWonderSync(m);   // callers, the island, the sky (94-garden-wonder-*.js)
  if (typeof gardenLiveHostPainted === 'function') gardenLiveHostPainted(m);   // friends in your garden (94-garden-live-3host.js)
  _gwEnsureLoop();
}

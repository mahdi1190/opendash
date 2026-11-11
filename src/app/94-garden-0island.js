/* Canonical island geometry and physical reservations. Pure derived data:
 * no model construction, renderer, save mutation or owner-specific coast. */
const _gardenIslandDerived = { geometry: null, base: null, beachCells: null, ocean: null, sectionZones: null, arrivalRoad: null, routePaths: new WeakMap(), roadJoints: new WeakMap() };
function gardenIslandData() { return GardenIslandLayout.data; }
function gardenIslandActive() { return typeof GardenIslandLayout !== 'undefined' && !!(GardenIslandLayout.data && GardenIslandLayout.data.version >= 3); }
function gardenCanonicalWorld() { const island = typeof GardenIslandCanonicalLayout !== 'undefined' ? GardenIslandCanonicalLayout : GardenIslandLayout; return { wv: island.data.world.v, lh: island.fingerprint }; }
function gardenWorldIsLegacy() { const current = gardenCanonicalWorld(); return GARDEN_WORLD.v !== current.wv || GARDEN_WORLD.lh !== current.lh; }
/** Presentation stays inside the existing broad road reservations. */
function gardenIslandRoadStyle(route) {
  const main = gardenIslandData().version >= 4 && !!route && (route.id === 'harbour-walk' || route.id === 'plaza-loop'), width = Math.max(.5, Number(route && route.widthCells) || 2);
  return { main, name: main ? 'Arrival promenade' : 'Garden path', radius: Math.min(width * (main ? .42 : .24), main ? 1.18 : .64), edgeRadius: Math.min(width * (main ? .47 : .29), main ? 1.3 : .78) };
}
function gardenIslandRoadJoints(route) {
  if (_gardenIslandDerived.roadJoints.has(route)) return _gardenIslandDerived.roadJoints.get(route);
  const style = gardenIslandRoadStyle(route), points = gardenIslandRoutePath(route).points, joints = [];
  if (style.main) for (let i = 4; i < points.length - 1; i += 7) {
    const p = points[i], a = points[i - 1], b = points[i + 1], length = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / length * style.radius * .8, ny = (b.x - a.x) / length * style.radius * .8;
    joints.push(Object.freeze({ x: p.x, y: p.y, a: Object.freeze({ x: p.x + nx, y: p.y + ny }), b: Object.freeze({ x: p.x - nx, y: p.y - ny }) }));
  }
  const result = Object.freeze(joints); _gardenIslandDerived.roadJoints.set(route, result); return result;
}
/** One rounded centreline for both renderers; no route or collider is moved. */
function gardenIslandRoutePath(route) {
  if (_gardenIslandDerived.routePaths.has(route)) return _gardenIslandDerived.routePaths.get(route);
  const input = route.points.map(([x, y]) => ({ x, y })), closed = input.length > 2 && input[0].x === input[input.length - 1].x && input[0].y === input[input.length - 1].y;
  if (closed) input.pop();
  const smooth = [];
  for (let i = 0; i < input.length; i++) {
    const p = input[i], a = input[(i + input.length - 1) % input.length], b = input[(i + 1) % input.length];
    if (!closed && (i === 0 || i === input.length - 1)) { smooth.push(p); continue; }
    const da = Math.hypot(a.x - p.x, a.y - p.y) || 1, db = Math.hypot(b.x - p.x, b.y - p.y) || 1, r = Math.min(.72, da * .32, db * .32);
    const from = { x: p.x + (a.x - p.x) * r / da, y: p.y + (a.y - p.y) * r / da }, to = { x: p.x + (b.x - p.x) * r / db, y: p.y + (b.y - p.y) * r / db };
    for (let j = 0; j <= 5; j++) { const t = j / 5, u = 1 - t; smooth.push({ x: u * u * from.x + 2 * u * t * p.x + t * t * to.x, y: u * u * from.y + 2 * u * t * p.y + t * t * to.y }); }
  }
  if (closed) smooth.push(smooth[0]);
  const points = [];
  for (let i = 1; i < smooth.length; i++) { const a = smooth[i - 1], b = smooth[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / .3)); for (let j = 0; j < steps; j++) points.push(Object.freeze({ x: a.x + (b.x - a.x) * j / steps, y: a.y + (b.y - a.y) * j / steps })); }
  if (smooth.length) points.push(Object.freeze(smooth[smooth.length - 1]));
  const result = Object.freeze({ points: Object.freeze(points), closed }); _gardenIslandDerived.routePaths.set(route, result); return result;
}
/** Visitors arrive at the real wharf and follow the existing village road. */
function gardenIslandArrivalRoad() {
  if (_gardenIslandDerived.arrivalRoad) return _gardenIslandDerived.arrivalRoad;
  const data = gardenIslandData(), harbour = data.routes.find(route => route.id === 'harbour-walk'), plaza = data.routes.find(route => route.id === 'plaza-loop'), pier = data.static.find(prop => prop.id === 'pier');
  if (data.version < 4 || !harbour || !plaza || !pier) return null;
  const entry = Object.freeze({ x: pier.x + pier.w / 2, y: pier.y + pier.h - .75 }), village = Object.freeze({ x: plaza.points[0][0], y: data.world.start.y + 2.5 });
  const points = [[entry.x, entry.y], ...harbour.points.slice().reverse().map(point => point.slice()), [village.x, harbour.points[0][1]], [village.x, village.y]].map(point => Object.freeze(point));
  return _gardenIslandDerived.arrivalRoad = Object.freeze({ id: 'arrival-promenade', name: 'Arrival promenade', widthCells: 2.4, points: Object.freeze(points), entry, village });
}
function gardenIslandStaticRow(row) {
  const data = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data, p = data && data.static.find(p => p.id === row.id);
  if (!p) return row;
  const next = Object.assign({}, row, { x: p.x, y: p.y, w: p.w, h: p.h, col: p.col, walk: p.walk ? 1 : 0 });
  if (p.door) next.door = Object.freeze({ x: p.door.x, y: p.door.y });
  return next;
}
/** Optional decks use the displayed Garden's mechanics identity, never a visitor's ownership. */
function gardenSidePierMechanicsReady(source) {
  const data = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data, mechanics = data && data.mechanics;
  const current = mechanics && mechanics.revision === 2 && GardenIslandLayout.fingerprint === 'cbc9629edd7fb57272e9d21b';
  const earlier = mechanics && mechanics.revision === 1 && mechanics.contract === 'optional-side-pier-walk-cover-v1' && mechanics.predecessorLayout === '94f5b2dbe4dce765cafb2b40' && GardenIslandLayout.fingerprint === 'c34545b986e497d5d9df5d51';
  if (!current && !earlier) return false;
  if (source === undefined) source = typeof state !== 'undefined' && state ? state.garden : null;
  if (!source || source.pending) return false;
  const seen = source.seen, tag = source.visit && source.visit.snap || source;
  return (seen ? Number(seen.world) : Number(tag.wv)) === GARDEN_WORLD.v && (seen ? seen.worldLayout : tag.lh) === GardenIslandLayout.fingerprint;
}
function gardenSidePierLevel(side, extension) {
  const site = gardenIslandActive() && gardenIslandData().reservedSidePiers.find(p => p.side === side);
  return site && Number.isInteger(site.level) ? site.level + (extension ? 3 : 0) : 99;
}
/** Fresh main + owned side rectangles (at most three). Explicit works require an explicit source tag for side decks. */
function gardenPierDecks(works, source) {
  const resident = works === undefined, owned = resident ? _GD_WORKS : works, p = GARDEN_PROPS.find(p => p.id === 'pier');
  const decks = p ? [Object.assign({}, p, { h: p.h + gardenPierMore(owned), side: 'south', col: 'none', walk: 1 })] : [];
  const ready = resident ? _GD_WORKS_SIDE_READY : source !== undefined && gardenSidePierMechanicsReady(source);
  if (!ready || !gardenIslandActive()) return decks;
  for (const side of ['west', 'east']) {
    const id = 'pier-' + side; if (!gardenWorkOwned(id, owned)) continue;
    const site = gardenIslandData().reservedSidePiers.find(p => p.side === side), b = site && site.reserved;
    if (!b || !(b.w >= 3) || !(b.h > 0)) continue;
    const extended = gardenWorkOwned(id + '-2', owned), w = extended ? b.w : 3;
    decks.push({ id, name: side === 'west' ? 'West pier' : 'East pier', side, stage: extended ? 2 : 1, x: side === 'west' ? b.x + b.w - w : b.x, y: b.y, w, h: b.h, col: 'none', walk: 1, needs: id, blurb: 'A quiet place to stand and cast from the shore.' });
  }
  return decks;
}
function _gardenPierDecksNow() { return _GD_PIER_DECKS || (_GD_PIER_DECKS = gardenPierDecks()); }
/** Exact bounded footprint key; resident callers reuse it until the displayed works or mechanics change. */
function gardenPierDeckSignature(works, source) {
  if (works === undefined && _GD_PIER_SIGNATURE) return _GD_PIER_SIGNATURE;
  const decks = works === undefined ? _gardenPierDecksNow() : gardenPierDecks(works, source);
  const key = decks.map(p => [p.id, p.x, p.y, p.w, p.h].join(',')).join(';');
  if (works === undefined) _GD_PIER_SIGNATURE = key;
  return key;
}
function gardenIslandGeometry() {
  if (_gardenIslandDerived.geometry) return _gardenIslandDerived.geometry;
  const data = gardenIslandData();
  return _gardenIslandDerived.geometry = Object.freeze({ revision: GardenIslandLayout.fingerprint, land: data.coast.land, oceanBounds: data.coast.oceanBounds, visualOceanBounds: data.coast.visualOceanBounds, beachWidthPx: data.coast.beachWidthPx, freshwater: data.freshwater });
}
function _gardenIslandInLoop(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const a = points[i], b = points[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; }
  return inside;
}
function gardenIslandLandContains(x, y) { return Number.isFinite(x) && Number.isFinite(y) && gardenIslandGeometry().land.some(points => _gardenIslandInLoop(x, y, points)); }
function gardenIslandOceanContains(x, y) { const W = GARDEN_WORLD; return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < W.cols && y < W.rows && !gardenIslandLandContains(x, y); }
function _gardenIslandRect(x, y, r) { return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h; }
function gardenIslandFreshwaterCell(x, y) { const cx = Math.floor(x) + .5, cy = Math.floor(y) + .5; return gardenIslandGeometry().freshwater.some(p => p.boundary ? _gardenIslandInLoop(cx, cy, p.boundary) : _gardenIslandRect(cx, cy, p.wet)); }
/** Authored frontier regions share the same contours with drawing, walking and visits. */
function gardenIslandRegionForZone(zone) { return (gardenIslandData().regions || []).find(region => region.zone === Number(zone)) || null; }
function _gardenIslandRegionForKnownLand(x, y) { return (gardenIslandData().regions || []).find(region => (region.polygons || []).some(points => _gardenIslandInLoop(x, y, points))) || null; }
function gardenIslandRegionAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !gardenIslandLandContains(x, y)) return null;
  return _gardenIslandRegionForKnownLand(x, y);
}
/** Explicit host/open sets keep visitor and server access independent of the local owner. */
function gardenIslandRegionOpen(region, open) { return !region || !region.zone || !!open && (open instanceof Set ? open.has('zn-' + region.zone) : Array.isArray(open) && open.includes('zn-' + region.zone)); }
function gardenIslandCoastDistance(x, y) {
  const W = GARDEN_WORLD; let distance = Infinity;
  for (const points of gardenIslandGeometry().land) for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length], ax = a[0] * W.cellW, ay = a[1] * W.cellH, dx = (b[0] - a[0]) * W.cellW, dy = (b[1] - a[1]) * W.cellH, t = Math.max(0, Math.min(1, ((x * W.cellW - ax) * dx + (y * W.cellH - ay) * dy) / (dx * dx + dy * dy || 1))); distance = Math.min(distance, Math.hypot(x * W.cellW - ax - dx * t, y * W.cellH - ay - dy * t)); }
  return distance;
}
function _gardenIslandOnRoute(x, y, route) {
  if (!route.points) return false;
  const radius2 = (route.widthCells * .5) ** 2;
  for (let i = 1; i < route.points.length; i++) { const a = route.points[i - 1], b = route.points[i], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1))); if ((x - a[0] - dx * t) ** 2 + (y - a[1] - dy * t) ** 2 <= radius2) return true; }
  return false;
}
/** Exact cell-centre beach membership, prepared once from every coast segment.
 * Bounding boxes only select candidates. The final anisotropic pixel distance
 * and <= boundary comparison are identical to gardenIslandCoastDistance. */
function _gardenIslandBeachCells() {
  if (_gardenIslandDerived.beachCells) return _gardenIslandDerived.beachCells;
  const W = GARDEN_WORLD, radius = gardenIslandData().coast.beachWidthPx, cells = new Uint8Array(W.cols * W.rows);
  for (const points of gardenIslandGeometry().land) for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], ax = a[0] * W.cellW, ay = a[1] * W.cellH, bx = b[0] * W.cellW, by = b[1] * W.cellH, dx = (b[0] - a[0]) * W.cellW, dy = (b[1] - a[1]) * W.cellH;
    // Keep the bounds conservative: boundary and winding never decide membership here.
    const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - radius) / W.cellW)), x1 = Math.min(W.cols - 1, Math.ceil((Math.max(ax, bx) + radius) / W.cellW));
    const y0 = Math.max(0, Math.floor((Math.min(ay, by) - radius) / W.cellH)), y1 = Math.min(W.rows - 1, Math.ceil((Math.max(ay, by) + radius) / W.cellH));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const index = y * W.cols + x; if (cells[index]) continue;
      const cx = x + .5, cy = y + .5, t = Math.max(0, Math.min(1, ((cx * W.cellW - ax) * dx + (cy * W.cellH - ay) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(cx * W.cellW - ax - dx * t, cy * W.cellH - ay - dy * t) <= radius) cells[index] = 1;
    }
  }
  return _gardenIslandDerived.beachCells = cells;
}
function _gardenIslandBase() {
  if (_gardenIslandDerived.base) return _gardenIslandDerived.base;
  const W = GARDEN_WORLD, data = gardenIslandData(), cells = new Array(W.cols * W.rows), beachCells = _gardenIslandBeachCells();
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const cx = x + .5, cy = y + .5, land = gardenIslandLandContains(cx, cy), ocean = !land, freshwater = land && gardenIslandFreshwaterCell(x, y), beach = land && !freshwater && !!beachCells[y * W.cols + x];
    const route = land && data.routes.find(r => _gardenIslandOnRoute(cx, cy, r)), prop = data.static.find(p => _gardenIslandRect(cx, cy, p));
    const apron = land && data.static.find(p => p.apron && _gardenIslandRect(cx, cy, p.apron)), rear = land && data.static.find(p => p.rearEnvelope && _gardenIslandRect(cx, cy, p.rearEnvelope));
    const side = data.reservedSidePiers.find(p => _gardenIslandRect(cx, cy, p.reserved) || _gardenIslandRect(cx, cy, p.apron));
    const district = land && data.districts.find(d => (d.areas || [d.bounds]).some(b => _gardenIslandRect(cx, cy, b)));
    const region = land && _gardenIslandRegionForKnownLand(cx, cy), landform = land && (data.landforms || []).find(form => form.polygon && _gardenIslandInLoop(cx, cy, form.polygon));
    const reservation = landform ? 'landform' : prop ? 'static' : apron ? 'apron' : route ? 'route' : rear ? 'facade' : side ? 'future-pier' : '';
    cells[y * W.cols + x] = Object.freeze({ inside: true, land, ocean, freshwater, beach, region: region && region.id || '', regionZone: region && region.zone || 0, solid: !!(landform && landform.col === 'full'), landformId: landform && landform.id || '', route: route && route.id || '', routePublic: !!(route && route.public), routeLevel: route && route.level || 1, routeZone: route && route.zone || 0, gateId: route && route.gateId || '', reserved: !!reservation, reservation, staticId: prop && prop.id || '', reason: landform ? landform.name || 'A rocky outcrop stands here' : prop ? prop.id + ' stands here' : apron ? 'Keep the doorway clear' : route ? 'Keep the path clear' : rear ? 'Keep the space behind the building clear' : side ? 'Reserved for a later pier' : '', district: district && district.id || '', districtLevel: district && district.level || 1 });
  }
  return _gardenIslandDerived.base = cells;
}
function gardenIslandBaseCell(x, y) { const W = GARDEN_WORLD; x = Math.floor(x); y = Math.floor(y); return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < W.cols && y < W.rows ? _gardenIslandBase()[y * W.cols + x] : null; }
function gardenIslandOceanCell(x, y) { const cell = gardenIslandBaseCell(x, y); return !!(cell && cell.ocean); }
function _gardenIslandRouteZone(cell, x, y) { const gate = cell.gateId && gardenIslandData().gates.find(g => g.id === cell.gateId); return gate && ((x - gate.x - .5) * gate.dx + (y - gate.y - .5) * gate.dy < 0) ? 0 : cell.routeZone; }
function gardenIslandPublicCell(x, y) { const cell = gardenIslandBaseCell(x, y); return !!(cell && cell.land && !cell.regionZone && !cell.solid && (cell.beach || cell.route && _gardenIslandRouteZone(cell, x + .5, y + .5) === 0 || cell.reservation === 'apron' || cell.reservation === 'facade')); }
function gardenIslandZoneAt(x, y) {
  const cell = gardenIslandBaseCell(x, y); if (!cell) return null;
  // A whole region stays closed, including its beaches, water, paths and doorways.
  if (gardenIslandData().version >= 4 && Array.isArray(gardenIslandData().regions)) return cell.regionZone;
  if (cell.beach) return 0;
  if (cell.route) return _gardenIslandRouteZone(cell, x + .5, y + .5);
  if (cell.reservation === 'apron' || cell.reservation === 'facade') return 0;
  if (!_gardenIslandDerived.sectionZones) { const W = GARDEN_WORLD, data = gardenIslandData(), zones = new Int8Array(W.cols * W.rows).fill(-1); for (const [id, points] of Object.entries(data.sectionCells || {})) for (const [cx, cy] of points) zones[cy * W.cols + cx] = data.sectionZones[id] || 0; _gardenIslandDerived.sectionZones = zones; }
  const zone = _gardenIslandDerived.sectionZones[Math.floor(y) * GARDEN_WORLD.cols + Math.floor(x)]; return zone < 0 ? null : zone;
}
function gardenIslandSectionRow(row) {
  const authored = gardenIslandData().sectionCells, cells = authored && authored[row.id] ? authored[row.id].slice() : row.cells.filter(([x, y]) => { const cell = gardenIslandBaseCell(x, y); return cell && cell.land && !cell.beach && !cell.reserved; });
  const next = Object.assign({}, row, { cells: Object.freeze(cells), originalCellCount: row.cells.length, relayoutEmpty: !cells.length });
  if (gardenIslandData().version >= 4) {
    const zone = (gardenIslandData().sectionZones || {})[row.id], region = gardenIslandRegionForZone(zone);
    // Old path characters describe the earlier map. New plots approach the authored open ground.
    next.zn = Number.isInteger(zone) ? zone : 0; next.via = '';
    next.lv = Math.max(row.lv || 1, region && region.level || 1);
  }
  if (cells.length) { const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]); next.x = Math.min(...xs); next.y = Math.min(...ys); next.w = Math.max(...xs) - next.x + 1; next.h = Math.max(...ys) - next.y + 1; }
  return next;
}
function gardenIslandLandRow(x, y, original, lane, lawn) {
  const cell = gardenIslandBaseCell(x, y); if (!cell || cell.ocean) return null;
  if (cell.solid) return GARDEN_LAND_THICKET;
  if (cell.route || cell.reservation === 'apron') return lane;
  return cell.beach || cell.reserved || !original || original.solid || original.trail || original.lane ? lawn : original;
}
function gardenIslandCellInfo(x, y, options) {
  options = options || {};
  const cell = gardenIslandBaseCell(x, y); if (!cell) return { inside: false, land: false, ocean: false, freshwater: false, beach: false, reserved: true, reason: 'Off the edge of the garden', sectionId: '', areaId: '', fam: '', cats: [], owned: false, locked: true, route: '' };
  const row = typeof gardenLandCell === 'function' ? gardenLandCell(Math.floor(x), Math.floor(y)) : null, model = options.model, level = model && model.level && model.level.level || 1, areas = model && model.areas;
  const owns = id => areas ? areas instanceof Set ? areas.has(id) : areas.includes(id) : typeof _GD_LAND !== 'undefined' && _GD_LAND.has(id);
  const section = row && row.plot ? row : null, owned = !section || owns(section.id) || !section.buy && level >= section.lv, zone = gardenIslandZoneAt(Math.floor(x), Math.floor(y)), locked = !!cell.solid || !!(zone && !owns('zn-' + zone)) || !!section && !owned;
  return Object.assign({}, cell, { sectionId: section && section.id || '', areaId: section && section.id || (cell.ocean ? 'lake' : cell.freshwater ? 'pond' : 'lawn'), fam: section && section.fam || '', cats: section && section.cats || [], owned, locked, reason: cell.reason || (locked ? section ? 'This land is not open' : 'This path is not open' : '') });
}
function gardenIslandOceanGeometry() {
  if (_gardenIslandDerived.ocean) return _gardenIslandDerived.ocean;
  const W = GARDEN_WORLD, cells = _gardenIslandBase(), points = [{ x: 0, y: 0 }, { x: W.cols, y: 0 }, { x: W.cols, y: W.rows }, { x: 0, y: W.rows }], holes = gardenIslandGeometry().land.map(loop => loop.map(p => ({ x: p[0], y: p[1] })).reverse());
  return _gardenIslandDerived.ocean = Object.freeze({ revision: GardenIslandLayout.fingerprint, points, holes, bounds: { x: 0, y: 0, width: W.cols, height: W.rows }, contains: gardenIslandOceanContains, cellContains(x, y) { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < W.cols && y < W.rows && cells[y * W.cols + x].ocean; } });
}
function gardenIslandWaterZone(x, y) { if (gardenIslandOceanContains(x, y)) { const d = gardenIslandCoastDistance(x, y); return d <= 60 ? 'shallow' : d <= 120 ? 'mid' : 'deep'; } return gardenIslandFreshwaterCell(x, y) ? 'pond' : ''; }
function gardenIslandPlacementWhy(def, x, y, kind) {
  const cell = gardenIslandBaseCell(x, y); if (!cell) return 'Off the edge of the garden';
  if (cell.reserved && !(kind === 'decor' && def.layer === 'ground' && cell.reservation === 'route')) return cell.reason;
  if (cell.beach && kind !== 'decor') return 'Keep the beach open';
  return '';
}
function gardenIslandDefaultSight(id) { return gardenIslandData().featurePolicy.defaultStaticIds.includes(id); }
function gardenIslandPlantAreasCompatible(def, first, next) { const a = gardenArea(first), b = gardenArea(next); return !!(a && b && !a.green && !b.green && (def.areas ? def.areas.includes(a.fam || a.id) && def.areas.includes(b.fam || b.id) : a.cats && b.cats && a.cats.includes(def.cat) && b.cats.includes(def.cat))); }

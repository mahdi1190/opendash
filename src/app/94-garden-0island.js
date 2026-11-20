/* Canonical island geometry and physical reservations. Pure derived data:
 * no model construction, renderer, save mutation or owner-specific coast. */
const _gardenIslandDerived = { geometry: null, base: null, sightGround: null, beachCells: null, ocean: null, sectionZones: null, arrivalRoad: null, routePaths: new WeakMap(), roadJoints: new WeakMap() };
function gardenIslandData() { return GardenIslandLayout.data; }
function gardenIslandActive() { return typeof GardenIslandLayout !== 'undefined' && !!(GardenIslandLayout.data && GardenIslandLayout.data.version >= 3); }
function gardenCanonicalWorld() { const island = typeof GardenIslandCanonicalLayout !== 'undefined' ? GardenIslandCanonicalLayout : GardenIslandLayout; return { wv: island.data.world.v, lh: island.fingerprint }; }
function gardenWorldIsLegacy() { const current = gardenCanonicalWorld(); return GARDEN_WORLD.v !== current.wv || GARDEN_WORLD.lh !== current.lh; }
/** Presentation stays inside the existing broad road reservations. */
function gardenIslandRoadStyle(route) {
  // Fleetwater Vale tags each route: main road and plazas are cobbles; lanes and trails are garden paths.
  const main = gardenIslandData().version >= 4 && !!route && (route.tier === 'main' || route.tier === 'plaza' || route.id === 'harbour-walk' || route.id === 'plaza-loop'), width = Math.max(.5, Number(route && route.widthCells) || 2);
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
  // The old angler sits on the quay as one of the vale's folk: you walk round him, not onto his lap (hunter, round 3).
  if (data.version === 5 && p.id === 'old-angler' && p.col === 'none') next.col = 'soft';
  else if (data.version >= 5 && p.door === null) next.door = null;   // an explicit removal must not retain a pre-island doorway
  // The v5 well moved to the village but retained a doorway ten cells east.
  // Repair only that authored row; later Designer placements keep their own doors.
  if (data.version === 5 && p.id === 'ld-wish' && p.x === 33 && p.y === 58 && p.w === 1 && p.h === 1 && p.door && p.door.x === 43 && p.door.y === 58) next.door = Object.freeze({ x: p.x, y: p.y + p.h });
  // (2.74: the shore bench stands by the lake walk in the layout itself, vale-village.json, so it needs no move here)
  return next;
}
/** The woodpile's authored anchor and ground contact, shared by paint and feet. */
function gardenIslandLogStack(data) {
  data = data || (gardenIslandActive() ? gardenIslandData() : null);
  const hut = data && data.version >= 5 && (data.static || []).find(p => p.id === 'ld-woodhut');
  if (!hut) return null;
  const W = data.world, x = hut.x + hut.w / 2 + 2.2, y = hut.y + hut.h + .4;
  // The posts and lowest logs occupy the base; the roof is safe to walk behind.
  return { x, y, foot: { x0: x - 36 / W.cellW, y0: y - 8 / W.cellH, x1: x + 36 / W.cellW, y1: y + 2 / W.cellH } };
}
/**
 * The old woodland's wayside lamps: seven old iron lanterns on stone plinths by its paths (the arch, the Hush, the
 * court, the birches, the shore, the ice house, the postern). Each stands on the nearest open grass to its spot, never
 * on a path, water, a building or land for sale. Positions in cells (foot); the painter draws them, the walk treats
 * the plinth as solid and the night lights them. Cached per layout.
 */
const _GD_OLDWOOD_LAMPS = [[21.6, 66.6], [19.1, 69.6], [23.6, 77.1], [18.6, 80.6], [23.4, 85.2], [30.5, 85.6], [34.2, 77.6]];
function gardenIslandOldWoodLamps(data) {
  data = data || (gardenIslandActive() ? gardenIslandData() : null);
  if (!data || data.version < 5 || !(data.regions || []).some(r => r.id === 'southwest-ruins')) return [];
  // (round 3: the Whispering woodland's forks have the same lamps, at the spots its layout names: presentation.woodland.lamps)
  const wood = (data.presentation && data.presentation.woodland && data.presentation.woodland.lamps) || [];
  if (data._oldLamps) return data._oldLamps;
  const ok = (x, y, region) => {
    const c = gardenIslandBaseCell(x, y); if (!c || !c.land || c.freshwater || c.beach || c.route || c.reservation || c.solid || c.region !== region) return false;
    const row = typeof gardenLandCell === 'function' ? gardenLandCell(Math.floor(x), Math.floor(y)) : null;
    return !(row && /^l[sct]-/.test(row.id || ''));
  };
  const out = [];
  // (layout round 3: the old woodland's own file names its lamps, one at every fork and door: presentation.oldwood.lamps)
  const authored = data.presentation && data.presentation.oldwood && data.presentation.oldwood.lamps, spots = Array.isArray(authored) && authored.length ? authored.map(q => [q.x, q.y]) : _GD_OLDWOOD_LAMPS;
  for (const [ax, ay, region] of spots.map(p => [p[0], p[1], 'southwest-ruins']).concat(wood.map(p => [p[0], p[1], 'west-woods']))) {
    let best = null;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = Math.floor(ax) + dx, y = Math.floor(ay) + dy; if (!ok(x, y, region)) continue; const d = Math.hypot(x + .5 - ax, y + .5 - ay); if (!best || d < best.d) best = { x: x + .5, y: y + .7, d }; }
    if (best) out.push({ x: best.x, y: best.y, foot: { x0: best.x - .2, y0: best.y - .22, x1: best.x + .2, y1: best.y + .04 } });
  }
  try { Object.defineProperty(data, '_oldLamps', { value: out, enumerable: false }); } catch (e) { /* frozen layout: recompute */ }
  return out;
}
/** The postern: a gap in the old woodland's east wall where its circuit meets the cottage lane, marked by two stone piers at the path's edges. Cells. */
function gardenIslandPosternPiers(data) {
  data = data || (gardenIslandActive() ? gardenIslandData() : null);
  const sc = data && data.version >= 5 && ((data.presentation && data.presentation.shortcuts) || []).find(s => s.id === 'postern');
  if (!sc || !sc.at) return [];
  return [[sc.at[0] + .3, sc.at[1] - 1.05], [sc.at[0] + .55, sc.at[1] + 1.25]].map(([x, y]) => ({ x, y, foot: { x0: x - .28, y0: y - .34, x1: x + .28, y1: y + .14 } }));   // (village fix round 1: as deep as the pier stands on the ground, so the feet stop at its stones and never stand on its foot)
}
/** Optional decks use the displayed Garden's mechanics identity, never a visitor's ownership. */
function gardenSidePierMechanicsReady(source) {
  const data = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data, mechanics = data && data.mechanics;
  const current = mechanics && (data.version >= 5 && mechanics.revision >= 3 || mechanics.revision === 2 && GardenIslandLayout.fingerprint === 'cbc9629edd7fb57272e9d21b');
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
function _gardenIslandFreshwaterTest(G, cx, cy) { return G.freshwater.some(p => p.boundary ? _gardenIslandInLoop(cx, cy, p.boundary) : _gardenIslandRect(cx, cy, p.wet)); }
/** Meet the two authored approaches at their banks, including a route junction
 * at a crossing. This is derived once and is shared by paint and remote feet. */
function _gardenIslandCrossingRouteSpan(c, water, halfWidth) {
  const D = gardenIslandData(), W = GARDEN_WORLD, route = (D.routes || []).find(r => r.id === c.along);
  if (!route || !route.points || route.points.length < 2) return null;
  let points = gardenIslandRoutePath(route).points.slice();
  for (const end of [0, 1]) {
    const joint = end ? points[points.length - 1] : points[0];
    if (Math.hypot(joint.x - c.x, joint.y - c.y) > 1.5) continue;
    const near = end ? points[points.length - 2] : points[1], dx = near.x - joint.x, dy = near.y - joint.y;
    let best = null;
    for (const other of D.routes || []) {
      if (other === route || !other.points || other.points.length < 2) continue;
      const path = gardenIslandRoutePath(other).points;
      for (const reverse of [false, true]) {
        const p = reverse ? path[path.length - 1] : path[0], q = reverse ? path[path.length - 2] : path[1];
        if (Math.hypot(p.x - joint.x, p.y - joint.y) > .02) continue;
        const dot = (dx * (q.x - p.x) + dy * (q.y - p.y)) / (Math.hypot(dx, dy) * Math.hypot(q.x - p.x, q.y - p.y) || 1);
        if (!best || dot < best.dot) best = { dot, path: reverse ? path.slice().reverse() : path.slice() };
      }
    }
    if (best) points = end ? points.concat(best.path.slice(1)) : best.path.slice(1).reverse().concat(points);
  }
  const cum = [0]; let closest = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    cum.push(cum[i - 1] + length);
    const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / (length * length || 1))), d = Math.hypot(a.x + dx * t - c.x, a.y + dy * t - c.y);
    if (!closest || d < closest.d) closest = { d, s: cum[i - 1] + length * t };
  }
  const length = cum[cum.length - 1], at = s => {
    s = Math.max(0, Math.min(length, s)); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const a = points[i - 1], b = points[i], t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }, wet = p => _gardenIslandFreshwaterTest(gardenIslandGeometry(), p.x, p.y) || gardenIslandInPolygon(p.x, p.y, water);
  let centre = null;
  for (let d = 0; d <= 2.5 && centre === null; d += .1) for (const sign of [-1, 1]) {
    const s = closest.s + d * sign; if (s >= 0 && s <= length && wet(at(s))) { centre = s; break; }
  }
  if (centre === null) return null;
  const bank = sign => {
    for (let d = .08; d <= 9; d += .08) {
      const s = centre + d * sign; if (s < 0 || s > length) return null;
      if (!wet(at(s))) return Math.max(0, Math.min(length, s + sign * .38));
    }
    return null;
  };
  let sa = bank(-1), sb = bank(1); if (sa === null || sb === null) return null;
  // Both corners of each landing must reach dry bank, not just its centre.
  for (let pass = 0; pass < 18; pass++) {
    const a = at(sa), b = at(sb), dx = (b.x - a.x) * W.cellW, dy = (b.y - a.y) * W.cellH, n = Math.hypot(dx, dy) || 1;
    const dry = p => [-1, 0, 1].every(sign => { const corner = { x: p.x - dy / n * halfWidth * sign / W.cellW, y: p.y + dx / n * halfWidth * sign / W.cellH }; return gardenIslandLandContains(corner.x, corner.y) && !wet(corner); });
    const da = dry(a), db = dry(b);
    if (da && db) return { a: { x: a.x * W.cellW, y: W.sky + a.y * W.cellH }, b: { x: b.x * W.cellW, y: W.sky + b.y * W.cellH } };
    if (!da) sa = Math.max(0, sa - .1); if (!db) sb = Math.min(length, sb + .1);
  }
  return null;
}
/** Fleet Falls' drawn water, in world cells, for the painters (presentation only):
 * the lip sits on the gorge line where the river reaches the scarp top (falls.y),
 * and the sheet lands straight below it in the Mere, so the river visibly feeds
 * the falls. null before v5 or when the layout has no gorge. */
function gardenFallsWater(data) {
  const D = data || (typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data), pres = D && D.version >= 5 && D.presentation, F = pres && pres.falls, line = pres && pres.rivers && pres.rivers.gorge && pres.rivers.gorge.line;
  if (!F || !F.pool || !line || line.length < 2) return null;
  let lx = NaN;
  for (let i = 1; i < line.length; i++) { const a = line[i - 1], b = line[i]; if ((a[1] - F.y) * (b[1] - F.y) <= 0 && a[1] !== b[1]) { lx = a[0] + (b[0] - a[0]) * (F.y - a[1]) / (b[1] - a[1]); break; } }
  if (!Number.isFinite(lx)) return null;
  return { lip: { x: lx, y: F.y }, foot: { x: lx + .15, y: F.pool[1] } };
}
/** Retained river water and the precise standing surfaces crossing it. */
function gardenIslandCrossingGeometry() {
  if (_gardenIslandDerived.crossings) return _gardenIslandDerived.crossings;
  const D = gardenIslandData(), W = GARDEN_WORLD, pres = D.presentation || {}, result = [];
  if (D.version < 5) return _gardenIslandDerived.crossings = result;
  const cell = p => ({ x: p.x / W.cellW, y: (p.y - W.sky) / W.cellH });
  for (const c of pres.crossings || []) {
    const river = pres.rivers && pres.rivers[c.over]; if (!river || !river.line || river.line.length < 2) continue;
    const cells = river.line, cum = [0]; for (let i = 1; i < cells.length; i++) cum.push(cum[i - 1] + Math.hypot(cells[i][0] - cells[i - 1][0], cells[i][1] - cells[i - 1][1]));
    const Ln = { cells, cum, len: cum[cum.length - 1] };
    const at = s => { s = Math.max(0, Math.min(Ln.len, s)); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const a = cells[i - 1], b = cells[i], len = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / len; return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / len, ty: (b[1] - a[1]) / len }; };
    let n0 = null; for (let s = 0; s <= Ln.len; s += .1) { const p = at(s), d = Math.hypot(p.x - c.x, p.y - c.y); if (!n0 || d < n0.d) n0 = { s, d }; }
    // Read the original basin centres, not the augmented base-cell table.
    const wet = s => { const p = at(s), x = Math.floor(p.x) + .5, y = Math.floor(p.y) + .5; return gardenIslandLandContains(x, y) && _gardenIslandFreshwaterTest(gardenIslandGeometry(), x, y); };
    let s0 = n0.s, s1 = n0.s; for (let k = 0; k < 40 && s0 > 0 && !wet(s0); k++) s0 -= .15; for (let k = 0; k < 40 && s1 < Ln.len && !wet(s1); k++) s1 += .15;
    s0 = Math.max(0, s0 - .7); s1 = Math.min(Ln.len, s1 + .7);
    const hw = river.halfWidth || 1, left = [], right = [];
    for (let s = s0; s <= s1 + 1e-6; s += .2) { const p = at(s), k = hw * (1 + .06 * Math.sin(s * 3.1)); left.push({ x: p.x - p.ty * k, y: p.y + p.tx * k }); right.push({ x: p.x + p.ty * k, y: p.y - p.tx * k }); }
    // The Millwater hump bridge carries its lane between two parapets: its
    // standing deck is a lane-wide band from bank to bank, as drawn, not the
    // gate's four-cell lock span (which read as a square slab on the river).
    const mid = at(n0.s), span = c.kind === 'footbridge' ? hw + .7 : hw + .15, points = left.concat(right.reverse()), halfWidth = c.kind === 'footbridge' ? 17 : c.kind === 'hump-bridge' ? 24 : c.kind === 'log' ? 19 : c.over === 'brook' ? 25 : 14;   // (round 3: the woodland brook's stones two abreast, wide enough for a friend beside you)
    const approach = _gardenIslandCrossingRouteSpan(c, points, halfWidth);
    const a = approach ? approach.a : { x: (mid.x - mid.ty * span) * W.cellW, y: W.sky + (mid.y + mid.tx * span) * W.cellH }, b = approach ? approach.b : { x: (mid.x + mid.ty * span) * W.cellW, y: W.sky + (mid.y - mid.tx * span) * W.cellH };
    const length = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
    const deckPoint = (t, s) => ({ x: a.x + (b.x - a.x) * t - uy * s, y: a.y + (b.y - a.y) * t + ux * s });
    let support;
    if (c.kind === 'hump-bridge' && !approach) {
      const gate = (D.gates || []).find(g => g.id === c.gateId), ends = gate && gate.crossSpan;
      const depth = ends && ends.length === 2 ? Math.hypot((ends[1][0] - ends[0][0]) * W.cellW, (ends[1][1] - ends[0][1]) * W.cellH) / 2 : 0;
      if (!depth) continue;
      support = [{ x: c.x - 74 / W.cellW, y: c.y - depth / W.cellH }, { x: c.x + 74 / W.cellW, y: c.y - depth / W.cellH }, { x: c.x + 74 / W.cellW, y: c.y + depth / W.cellH }, { x: c.x - 74 / W.cellW, y: c.y + depth / W.cellH }];
    } else {
      support = [cell(deckPoint(0, -halfWidth)), cell(deckPoint(1, -halfWidth)), cell(deckPoint(1, halfWidth)), cell(deckPoint(0, halfWidth))];
    }
    const count = Math.max(3, Math.round(length / 21));
    result.push({ id: 'crossing-water:' + c.id, crossing: c, over: c.over, kind: c.kind, points, support, holes: [support], mid, span: { Ln, n0, s0, s1 }, a, b, length, halfWidth, deckPoint, stones: { count, alongRadius: .5 * length / count, acrossRadius: halfWidth } });
  }
  return _gardenIslandDerived.crossings = result;
}
function gardenIslandInPolygon(x, y, points) {
  let on = false; for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const a = points[i], b = points[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) on = !on; } return on;
}
function gardenIslandFreshwaterContains(x, y) {
  const crossings = gardenIslandCrossingGeometry();
  if (crossings.some(c => gardenIslandInPolygon(x, y, c.support))) return false;
  return _gardenIslandFreshwaterTest(gardenIslandGeometry(), x, y) || crossings.some(c => gardenIslandInPolygon(x, y, c.points));
}
/** Boundary of water minus support, including supports which meet the bank.
 * Clip boundary segments at every crossing; an open-ended deck is not an
 * enclosed island, so its landward edges must never become water collisions. */
function gardenIslandWaterEdges(points, holes) {
  const loops = [points, ...holes], result = [], wet = (x, y) => gardenIslandInPolygon(x, y, points) && !holes.some(h => gardenIslandInPolygon(x, y, h));
  for (let li = 0; li < loops.length; li++) { const loop = loops[li];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dy = b.y - a.y, ts = [0, 1];
      for (let lj = 0; lj < loops.length; lj++) if (lj !== li) { const other = loops[lj]; for (let j = 0; j < other.length; j++) {
        const c = other[j], d = other[(j + 1) % other.length], ex = d.x - c.x, ey = d.y - c.y, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-12) continue;
        const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / den, u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / den;
        if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
      } }
      ts.sort((a, b) => a - b);
      const len = Math.hypot(dx, dy); if (!len) continue;
      for (let k = 1; k < ts.length; k++) { const lo = ts[k - 1], hi = ts[k]; if (hi - lo < 1e-10) continue; const t = (lo + hi) / 2, x = a.x + dx * t, y = a.y + dy * t, nx = -dy / len * 1e-7, ny = dx / len * 1e-7;
        if (wet(x + nx, y + ny) === wet(x - nx, y - ny)) continue;
        result.push({ ax: a.x + dx * lo, ay: a.y + dy * lo, bx: a.x + dx * hi, by: a.y + dy * hi });
      }
    }
  }
  return result;
}
/** Is a cell's centre in a lake or pond? Answered once per cell and kept (a gate opening asks for every cell several times over). */
function gardenIslandFreshwaterCell(x, y) {
  const G = gardenIslandGeometry(), W = GARDEN_WORLD, ix = Math.floor(x), iy = Math.floor(y);
  if (!(ix >= 0 && iy >= 0 && ix < W.cols && iy < W.rows)) return gardenIslandFreshwaterContains(ix + .5, iy + .5);
  let c = _gardenIslandDerived.freshCells; if (!c || c.g !== G || c.cols !== W.cols || c.m.length !== W.cols * W.rows) c = _gardenIslandDerived.freshCells = { g: G, cols: W.cols, m: new Uint8Array(W.cols * W.rows) };
  const i = iy * W.cols + ix; let v = c.m[i]; if (!v) v = c.m[i] = gardenIslandFreshwaterContains(ix + .5, iy + .5) ? 1 : 2;
  return v === 1;
}
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
// A route covers its shape (a plaza: the square, the terrace, the quay) and its centreline out to the local half width
// (route.widths, one per point, from the hand-authored village; otherwise widthCells). Same rule as tools/garden-vale-layout.mjs.
function _gardenIslandOnRoute(x, y, route) {
  if (!route.points) return false;
  if (route.shape && _gardenIslandInLoop(x, y, route.shape)) return true;
  const widths = Array.isArray(route.widths) && route.widths.length === route.points.length ? route.widths : null, radius2 = (route.widthCells * .5) ** 2;
  for (let i = 1; i < route.points.length; i++) { const a = route.points[i - 1], b = route.points[i], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1))), d2 = (x - a[0] - dx * t) ** 2 + (y - a[1] - dy * t) ** 2; if (d2 <= (widths ? ((widths[i - 1] + (widths[i] - widths[i - 1]) * t) * .5) ** 2 : radius2)) return true; }
  return false;
}
/** The route's full width (cells) at the point of its centreline nearest x, y: route.widths where authored, else widthCells. */
function gardenIslandRouteWidthAt(route, x, y) {
  const P = route && route.points, Wd = route && Array.isArray(route.widths) && route.widths.length === P.length ? route.widths : null; if (!P || !Wd) return Number(route && route.widthCells) || 2;
  let best = Infinity, w = Wd[0];
  for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1))), d = (x - a[0] - dx * t) ** 2 + (y - a[1] - dy * t) ** 2; if (d < best) { best = d; w = Wd[i - 1] + (Wd[i] - Wd[i - 1]) * t; } }
  return w;
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
/* A sight's own ground. The layout put small plots right behind or beside some sights (the wishing well inside a 'Lv 3'
 * fence, a walled plot among the hill stones, a wall into the shepherd's hut's wheels, a hedge into the folly). No plot
 * takes the cells a sight's picture stands over: its footprint, the columns its picture spans, as many rows behind as its
 * height reaches (up to three) and the row in front where you stand to look at it; a plot left smaller than the layout's
 * smallest (2 x 2) is withdrawn, so the region's layout redesign can give it a place of its own. The reach is each sight's painted box
 * in px from the middle of its foot ([left, top, right], the art rows in 94-garden-paint-terrain-5sights.js and
 * 94-garden-paint-zsights*.js). Presentation, walking and buying only: the layout file and its identity are unchanged. */
const GARDEN_SIGHT_REACH = Object.freeze({ 'ld-barn': [-92, -176, 96], 'ld-barrels': [-42, -84, 56], 'ld-beacon': [-34, -134, 36], 'ld-boathouse': [-84, -190, 86], 'ld-boles': [-70, -60, 72], 'ld-cairn': [-42, -96, 46], 'ld-chapel': [-84, -204, 84], 'ld-churn': [-34, -56, 34], 'ld-clamp': [-52, -44, 66], 'ld-cross': [-34, -120, 36], 'ld-driftwood': [-62, -108, 62], 'ld-folly': [-52, -272, 54], 'ld-frog': [-44, -54, 46], 'ld-grotto': [-82, -128, 84], 'ld-hide': [-76, -100, 80], 'ld-hollow': [-104, -246, 106], 'ld-house': [-62, -140, 64], 'ld-hull': [-60, -58, 62], 'ld-hut': [-70, -138, 72], 'ld-icehouse': [-66, -84, 66], 'ld-labyrinth': [-74, -66, 76], 'ld-lighthouse': [-46, -274, 48], 'ld-mile': [-24, -50, 64], 'ld-mill': [-134, -224, 92], 'ld-oldhouse': [-64, -146, 64], 'ld-orchard-wall': [-64, -72, 66], 'ld-pump': [-66, -94, 68], 'ld-ring': [-46, -70, 48], 'ld-smoke': [-80, -156, 82], 'ld-statue': [-32, -118, 58], 'ld-stones': [-112, -104, 118], 'ld-stump': [-72, -92, 74], 'ld-sunk': [-56, -42, 56], 'ld-tower': [-84, -250, 86], 'ld-treehouse': [-130, -262, 126], 'ld-warren': [-80, -46, 82], 'ld-wish': [-36, -96, 36], 'ld-woodhut': [-74, -180, 76] });
function gardenIslandSightGround() {
  if (_gardenIslandDerived.sightGround) return _gardenIslandDerived.sightGround;
  const data = gardenIslandData(), W = data.world, out = new Set();
  if (data.version >= 5) for (const p of data.static || []) {
    const b = GARDEN_SIGHT_REACH[p.id]; if (!b || p.col === 'none') continue;
    const w = p.w || 1, h = p.h || 1, mid = (p.x + w / 2) * W.cellW;
    const c0 = Math.min(p.x, Math.floor((mid + b[0] + 4) / W.cellW)), c1 = Math.max(p.x + w - 1, Math.floor((mid + b[2] - 4) / W.cellW)), back = Math.max(1, Math.min(3, Math.ceil(-b[1] / W.cellH - .6)));
    for (let y = p.y - back; y <= p.y + h; y++) for (let x = c0; x <= c1; x++) out.add(x + ',' + y);
  }
  // and a gate's crossing, two cells on along the way either side: the Cloudbreak stair climbed into a locked plot's wall
  // (or, where the fells drew none, an invisible wall) at its head, a hedged plot stood against its foot (hunter, round 3)
  if (data.version >= 5) for (const g of data.gates || []) {
    const sp = g.crossSpan; if (!sp || !sp.length) continue;
    const xs = sp.map(p => p[0]), ys = sp.map(p => p[1]), ax = g.dx ? 2 : 0, ay = g.dy ? 2 : 0;
    for (let y = Math.floor(Math.min(...ys)) - ay; y <= Math.floor(Math.max(...ys)) + ay; y++) for (let x = Math.floor(Math.min(...xs)) - ax; x <= Math.floor(Math.max(...xs)) + ax; x++) out.add(x + ',' + y);
  }
  return _gardenIslandDerived.sightGround = out;
}
function gardenIslandSectionRow(row) {
  const authored = gardenIslandData().sectionCells, ground = gardenIslandSightGround();
  let cells = authored && authored[row.id] ? authored[row.id].slice() : row.cells.filter(([x, y]) => { const cell = gardenIslandBaseCell(x, y); return cell && cell.land && !cell.beach && !cell.reserved; });
  if (ground.size && cells.some(([x, y]) => ground.has(x + ',' + y))) { cells = cells.filter(([x, y]) => !ground.has(x + ',' + y)); if (cells.length < ((gardenIslandData().allotmentPolicy || {}).minimumCells || 4)) cells = []; }   // (a plot is 2 x 2 at least: what is left of one that crowded a sight is not offered; owned, it stays in the land book)
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
function gardenIslandWaterZone(x, y) { if (gardenIslandOceanContains(x, y)) { const d = gardenIslandCoastDistance(x, y); return d <= 60 ? 'shallow' : d <= 120 ? 'mid' : 'deep'; } return gardenIslandFreshwaterContains(x, y) ? 'pond' : ''; }
function gardenIslandPlacementWhy(def, x, y, kind) {
  const cell = gardenIslandBaseCell(x, y); if (!cell) return 'Off the edge of the garden';
  if (cell.reserved && !(kind === 'decor' && def.layer === 'ground' && cell.reservation === 'route')) return cell.reason;
  if (cell.beach && kind !== 'decor') return 'Keep the beach open';
  return '';
}
function gardenIslandDefaultSight(id) { return gardenIslandData().featurePolicy.defaultStaticIds.includes(id); }
function gardenIslandPlantAreasCompatible(def, first, next) { const a = gardenArea(first), b = gardenArea(next); return !!(a && b && !a.green && !b.green && (def.areas ? def.areas.includes(a.fam || a.id) && def.areas.includes(b.fam || b.id) : a.cats && b.cats && a.cats.includes(def.cat) && b.cats.includes(def.cat))); }

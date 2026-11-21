/* Full saved plants and decorations that were put away during a relayout.
   Their original records stay in the garden; restoring is a move, not a purchase. */
function gardenPendingModel(nowArg) {
  const now = nowArg || _gdNow(), today = _gdDayOf(now), south = _gdSouth(), season = gardenSeasonOf(today, south), rain = _gdRain(now), wallet = gardenWallet();
  return { worldPending: true, now, today, south, season, tod: _gdTod(now, season), events: gardenEventsOn(today), rain, wallet, level: wallet.level,
    areas: [], plants: [], decor: [], occ: new Map(), visitors: [], blooms: 0, ripe: 0, thirsty: 0, trees: 0, cats: {}, heart: 0, totalDone: 0,
    water: { cap: 0, bonus: 0, used: 0, left: 0, raining: !!rain.now } };
}
function gardenStoredItem(kind, uid, m) {
  if (!m || m.visit || (kind !== 'plant' && kind !== 'decor')) return null;
  const raw = _gdG()[kind === 'plant' ? 'plants' : 'decor'][uid];
  if (!raw || raw._packed !== 3) return null;
  const def = kind === 'plant' ? gardenPlant(raw.p) : gardenDecor(raw.d);
  if (!def) return null;
  const item = { uid, kind, def, x: raw.x, y: raw.y, packed: true, fp: def.fp || 1, r: (Number(raw.r) || 0) & 3, v: Number(raw.v) || 0, at: raw.at || 0 };
  if (kind === 'plant') Object.assign(item, _gdPlantState(raw, def, { now: m.now, A: _gdAct(), rain: m.rain, season: m.season, events: m.events, decorList: m.decor, g: _gdG() }));
  return item;
}
function gardenPlacementItem(m, kind, uid) {
  return (kind === 'decor' ? gardenDecorById(m, uid) : gardenPlantById(m, uid)) || gardenStoredItem(kind, uid, m);
}
// Only metadata is indexed: growth/care is derived when an item is shown or restored.
// One current garden/revision is retained, including the actual map identities.
const _gardenStoredIndexCache = { garden: null, rev: -1, plants: null, decor: null, value: null };
const _gardenStoredEmptyIndex = Object.freeze({ rows: Object.freeze([]), signature: '[]' });
function gardenStoredIndex(m) {
  if (!m || m.visit) return _gardenStoredEmptyIndex;
  const g = _gdG(), c = _gardenStoredIndexCache;
  if (c.garden === g && c.rev === _gd.rev && c.plants === g.plants && c.decor === g.decor) return c.value;
  const rows = [];
  for (const kind of ['plant', 'decor']) for (const uid of Object.keys(g[kind === 'plant' ? 'plants' : 'decor'])) {
    const raw = g[kind === 'plant' ? 'plants' : 'decor'][uid];
    if (!raw || raw._packed !== 3) continue;
    const def = kind === 'plant' ? gardenPlant(raw.p) : gardenDecor(raw.d);
    if (def) rows.push({ kind, uid, def });
  }
  rows.sort((a, b) => a.def.name.localeCompare(b.def.name) || a.uid.localeCompare(b.uid));
  c.garden = g; c.rev = _gd.rev; c.plants = g.plants; c.decor = g.decor;
  c.value = { rows, signature: JSON.stringify(rows.map(x => [x.kind, x.uid, x.def.name])) };
  return c.value;
}
function gardenStoredItems(m, start, limit) {
  const rows = gardenStoredIndex(m).rows, from = Math.max(0, Math.floor(Number(start) || 0));
  const count = limit === undefined ? rows.length : Math.max(0, Math.floor(Number(limit) || 0)), out = [];
  for (let i = from; i < Math.min(rows.length, from + count); i++) {
    const row = rows[i], item = gardenStoredItem(row.kind, row.uid, m); if (item) out.push(item);
  }
  return out;
}

// A built structure remains earned when put away. Only deliberate placements
// contribute art or collisions; the owner's positions travel with the snapshot.
const _gardenFeaturePlacementState = { signature: '', rows: new Map() };
function gardenFeatureWire() {
  if (GARDEN_WORLD.v < 3) return [];
  const out = [], saved = _gdG().wd || {};
  for (const f of GARDEN_LAND_FEATURES) {
    const p = saved['feature.place.' + f.id];
    if (!gardenLandOwnsFeature(f.id) || !Array.isArray(p) || p[0] !== 3 || !Number.isInteger(p[1]) || !Number.isInteger(p[2])) continue;
    if (p[1] >= 0 && p[2] >= 0 && p[1] + (f.w || 1) <= GARDEN_WORLD.cols && p[2] + (f.h || 1) <= GARDEN_WORLD.rows) out.push([f.id, p[1], p[2]]);
  }
  return out;
}
function gardenFeatureSet(rows) {
  if (GARDEN_WORLD.v < 3) return;
  const next = [];
  for (const p of rows || []) {
    if (!Array.isArray(p) || !_GD_LAND.has(p[0])) continue;
    const f = GARDEN_LAND_FEATURES.find(r => r.id === p[0]);
    if (!f || !Number.isInteger(p[1]) || !Number.isInteger(p[2]) || p[1] < 0 || p[2] < 0 || p[1] + (f.w || 1) > GARDEN_WORLD.cols || p[2] + (f.h || 1) > GARDEN_WORLD.rows) continue;
    next.push([p[0], p[1], p[2]]);
  }
  next.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  const signature = JSON.stringify(next);
  if (signature === _gardenFeaturePlacementState.signature) return;
  _gardenFeaturePlacementState.signature = signature;
  _gardenFeaturePlacementState.rows = new Map(next.map(p => [p[0], p]));
  gardenLandPropsReset();
}
function gardenFeatureIsSetOut(id) { return GARDEN_WORLD.v < 3 || _gardenFeaturePlacementState.rows.has(id); }
function gardenFeatureRow(f) {
  if (!f || GARDEN_WORLD.v < 3) return f;
  const p = _gardenFeaturePlacementState.rows.get(f.id); if (!p) return null;
  const dx = f.door ? f.door.x - f.x : Math.floor((f.w || 1) / 2), dy = f.door ? f.door.y - f.y : f.h || 1;
  return Object.assign({}, f, { x: p[1], y: p[2], door: { x: p[1] + dx, y: p[2] + dy } });
}
/** Nothing overlaps (the owner): what a set-out thing's picture covers round its footprint must be clear ground. The
 *  footprint alone was checked, so the windmill went up inside a great tree, the observatory over the drowned cellar's
 *  pool, the bandstand inside a locked hedge plot and a way post on a fence corner (art director and hunter, round 3).
 *  The ring is as wide as the picture's own foot (its art row's box) and one cell deep in front and behind. */
/** A standing thing's painted box in world px, [x0, y0, x1, y1]: its art row's box from the middle of its foot, else its footprint and height. */
function _gardenPictureBox(id, x, y, w, h, tall) {
  const W = GARDEN_WORLD, A = window.GardenPaintedMarks && GardenPaintedMarks.ART, b = A && A[id] && A[id].box, cx = (x + w / 2) * W.cellW, foot = (y + h) * W.cellH;
  return b ? [cx + b[0] * .9, foot + b[1] * .92, cx + b[2] * .9, foot] : [x * W.cellW, foot - Math.max(1, tall || 1) * 56, (x + w) * W.cellW, foot];
}
function _gardenFeatureClearWhy(f, x, y, m) {
  const W = GARDEN_WORLD, w = f.w || 1, h = f.h || 1, A = window.GardenPaintedMarks && GardenPaintedMarks.ART, art = A && A[f.id];
  const half = art && art.box ? Math.max(-art.box[0], art.box[2]) / W.cellW : w / 2 + .3, reach = Math.max(1, Math.ceil(half - w / 2 - .2));
  const lv = m && m.level ? m.level.level : 1, statics = (typeof gardenIslandData === 'function' && gardenIslandData().static) || [];
  // never on a path (a footprint on the lane put the observatory across it), never in a gate's crossing (a prize board stood in the forest arch)
  for (let cy = y; cy < y + h; cy++) for (let cx = x; cx < x + w; cx++) { const base = typeof gardenIslandBaseCell === 'function' ? gardenIslandBaseCell(cx, cy) : null; if (base && (base.route || base.reservation === 'apron')) return 'Keep the path clear'; }
  for (const g of (typeof GARDEN_ZONE_GATES !== 'undefined' ? GARDEN_ZONE_GATES : [])) { if (!g.crossSpan) continue; const xs = g.crossSpan.map(p => p[0]), ys = g.crossSpan.map(p => p[1]); if (x + w > Math.min(...xs) - 2.5 && x < Math.max(...xs) + 2.5 && y + h > Math.min(...ys) - 2.5 && y < Math.max(...ys) + 2.5) return 'Too close to the gate'; }
  // a tall picture covers the ground behind it as well: a windmill went up in front of a scarecrow, its sails over it
  const up = art && art.box ? 1 + Math.floor(Math.max(0, -art.box[1] - 60) / W.cellH / 2) : 1;
  // no tree stands in it or just in front of it (the windmill inside a great tree, the savings oak and the hill flag lost
  // under the wood's canopy), and no tall building in front hides it (the bandstand behind the land office's roof)
  // (a trunk is a box {x0, y0, x1, y1}: this read t.x and t.y, which a box has not, so an orchard tree's crown stood in
  // front of the bandstand: art director, round 3. A crown is about three cells across, so its trunk keeps 1.5 cells off.)
  if (typeof _gwPaintedTrunks === 'function') { let feet = []; try { feet = _gwPaintedTrunks(true) || []; } catch (e) { /* no painted trees yet */ } for (const t of feet) { const tx = (t.x0 + t.x1) / 2, ty = t.y1; if (tx > x - reach - 1.5 && tx < x + w + reach + 1.5 && ty > y - up && ty < y + h + 3.5) return 'Too close to a tree'; } }
  if (typeof GardenPaintWood !== 'undefined' && GardenPaintWood && GardenPaintWood.standing) { const trees = GardenPaintWood.standing() || []; for (const t of trees) if (!t.thicket && t.cx > x - reach - 1.2 && t.cx < x + w + reach + 1.2 && t.cy > y - up - 1 && t.cy < y + h + 3) return 'Too close to a tree'; }
  // nor on a village square's setts (the hill flag and the observatory went up on the green)
  { const plazas = (typeof gardenIslandData === 'function' && gardenIslandData().presentation && gardenIslandData().presentation.plazas) || []; for (let cy = y; cy < y + h; cy++) for (let cx = x; cx < x + w; cx++) for (const p of plazas) if (p.rx && p.ry && Math.pow((cx + .5 - p.x) / (p.rx + .6), 2) + Math.pow((cy + .5 - p.y) / (p.ry + .6), 2) <= 1) return 'Keep the square clear'; }
  // no picture over another: the observatory and the museum went up right behind the watermill (the mill's roof over
  // their doors, the dome seeming to sit on the mill), the heron post against the observatory's wall (round 3). Each
  // standing thing's painted box, the sights' and the other things you have set out, must not cross this one's.
  { const me = _gardenPictureBox(f.id, x, y, w, h, f.tall), name = s => String(s.name || (typeof gardenLandSight === 'function' && gardenLandSight(s.id) || {}).name || 'something').replace(/^The /, 'the ');
    const cross = o => Math.min(me[2], o[2]) - Math.max(me[0], o[0]) > 8 && Math.min(me[3], o[3]) - Math.max(me[1], o[1]) > 8;
    for (const s of statics) { if (s.id === f.id || s.col === 'none' && !(s.tall >= 1.5)) continue; const o = _gardenPictureBox(s.id, s.x, s.y, s.w || 1, s.h || 1, s.tall); if (cross(o)) return (s.y + (s.h || 1) > y + h ? 'Too close behind ' : 'Too close to ') + name(s); }
    for (const g of (typeof GARDEN_LAND_FEATURES !== 'undefined' ? GARDEN_LAND_FEATURES : [])) { if (g.id === f.id || !gardenFeatureIsSetOut(g.id)) continue; const r = gardenFeatureRow(g); if (!r || r.x == null) continue; const o = _gardenPictureBox(g.id, r.x, r.y, r.w || 1, r.h || 1, r.tall); if (cross(o)) return 'Too close to ' + String(g.name || 'something').replace(/^The /, 'the ').toLowerCase(); }
  }
  // nothing found standing (the painters' drawn things too: the vale's own well) under or right against it, and never a second of
  // the same kind close by (a friend's village well went up beside the vale's own, two identical wells side by side: critic, 21 Nov)
  if (typeof gardenAffordThings === 'function') {
    let kind = ''; try { kind = typeof gardenKindOf === 'function' ? gardenKindOf({ id: f.id, art: f.art || '' }) : ''; } catch (e) { kind = ''; }
    let things = []; try { things = gardenAffordThings() || []; } catch (e) { things = []; }
    const cx = x + w / 2, fy = y + h;
    for (const o of things) {
      if (!o || o.id === f.id || !Number.isFinite(o.x) || !Number.isFinite(o.y)) continue;
      const hw = (o.w || 1) / 2 + w / 2 + reach + .4;
      if (Math.abs(o.x - cx) < hw && o.y > y - 1.2 - (up - 1) && o.y - (o.h || 1) < fy + 1.2) return `Too close to ${String(o.name || 'something').replace(/^The /, 'the ')}`;
      const K = typeof GARDEN_KINDS !== 'undefined' ? GARDEN_KINDS : {}, pet = kind && K[kind] && !/^(tree|board|wall|bench)$/.test(K[kind].pet || '') && K[kind].pet;   // (a well is a well, a village well or a wishing one; only kinds with a use of their own count: a lucky stone read as a 'building' and no cottage could have one near it)
      if (pet && (o.kind === kind || K[o.kind] && K[o.kind].pet === pet) && Math.hypot(o.x - cx, (o.y - fy) * 1.3) < 7) return `There is ${String(o.name || 'one').replace(/^the /i, 'a ')} close by already`;
    }
  }
  // never on a painted flower border or other planting a painter has laid in the ground (a friend's village well went up on the high street's border: critic, 21 Nov)
  { const GP = typeof window !== 'undefined' && window.GardenGroundPlanting; if (GP && GP.has) for (let cy = y - 1; cy <= y + h; cy++) for (let cx = x - 1; cx <= x + w; cx++) if (GP.has(cx, cy)) return 'Keep the flower border clear'; }
  // never on the beds you grow in (the lookout's legs and the fountain's basin stood on the starter bed: hunter, round 3),
  // nor at the end of a bridge or stepping stones (a rain barrel stood on the little bridge's landing)
  for (let cy = y - 1; cy <= y + h; cy++) for (let cx = x - reach; cx < x + w + reach; cx++) { const row = typeof gardenLandCell === 'function' ? gardenLandCell(cx, cy) : null; if (row && row.plot && row.cats && row.cats.length) return 'Keep the growing beds for planting'; }
  { const P = typeof gardenIslandData === 'function' && gardenIslandData().presentation, A = typeof gardenIslandData === 'function' && gardenIslandData().anchors; if (A && A.bed && x + w + reach > A.bed.x - .5 && x - reach < A.bed.x + A.bed.w + .5 && y + h > A.bed.y - 1 && y - 1 < A.bed.y + A.bed.h) return 'Keep the growing beds for planting';
    for (const c of (P && P.crossings) || []) if (Math.hypot(c.x - (x + w / 2), (c.y - (y + h / 2)) * 1.4) < 3.2 + w / 2) return 'Too close to the bridge'; }
  for (let cy = y - up; cy < y - 1; cy++) for (let cx = x - reach; cx < x + w + reach; cx++) {
    if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) continue;
    const pr = gardenPropAt(cx, cy); if (pr && pr.id !== f.id) return `Too close to ${String(pr.name || 'something').replace(/^The /, 'the ')}`;
    const c = m && m.occ ? m.occ.get(cx + ',' + cy) : null; if (c && c.decor) return 'Too close to something you have put out';
  }
  for (let cy = y - 1; cy <= y + h; cy++) for (let cx = x - reach; cx < x + w + reach; cx++) {
    if (cx >= x && cx < x + w && cy >= y && cy < y + h) continue;   // (the footprint itself: _gdPlaceOk)
    if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) return 'Too near the edge of the garden';
    { const c = m && m.occ ? m.occ.get(cx + ',' + cy) : null; if (c && c.decor) return 'Too close to something you have put out'; }   // (the bandstand went up against the maypole)
    if (String(gardenAreaAt(cx, cy, lv)).startsWith('locked:')) return 'Too close to land that is not yours yet';
    // a tall thing set right at a road's edge in front of it stood over the road (the observatory on the west lane): a cell clear behind it
    if (cy === y - 1 && art && art.box && -art.box[1] > 70 && typeof gardenIslandBaseCell === 'function') { const base = gardenIslandBaseCell(cx, cy); if (base && base.route) return 'Too close to the path behind it'; }
    const pr = gardenPropAt(cx, cy); if (pr && pr.id !== f.id) return `Too close to ${String(pr.name || 'something').replace(/^The /, 'the ')}`;
    const st = statics.find(s => cx >= s.x - 1 && cx < s.x + (s.w || 1) + 1 && cy >= s.y && cy < s.y + (s.h || 1)); if (st) return 'Too close to something that stands there';
    if (typeof _gwFree === 'function' && !_gwFree(cx + .5, cy + .5) && !(typeof gardenIsWater === 'function' && gardenIsWater(cx, cy))) return 'Too close to something in the way';
  }
  return '';
}
function gardenFeaturePlaceWhy(f, x, y, m) {
  const why = _gdPlaceOk(m, { id: f.id, w: f.w || 1, h: f.h || 1, layer: 'main' }, x, y, 'decor') || _gardenFeatureClearWhy(f, x, y, m);
  if (why) return why;
  const dx = f.door ? f.door.x - f.x : Math.floor((f.w || 1) / 2), dy = f.door ? f.door.y - f.y : f.h || 1;
  const door = { x: x + dx + .5, y: y + dy + .5 };
  if (door.x < 0 || door.y < 0 || door.x >= GARDEN_WORLD.cols || door.y >= GARDEN_WORLD.rows || gardenWaterContainsPoint(door.x, door.y)) return 'Keep a dry entrance clear';
  const c = m.occ.get(Math.floor(door.x) + ',' + Math.floor(door.y));
  if (c && (c.plant || c.decor)) return 'Keep the entrance clear';
  if (typeof _gwFree === 'function' && !_gwFree(door.x, door.y)) return 'Keep a reachable entrance clear';
  if (typeof _gwRoute === 'function' && typeof _gw !== 'undefined' && _gw.box && !Array.isArray(_gwRoute({ x: _gw.px, y: _gw.py }, door))) return 'Keep a reachable entrance clear';
  return '';
}
/** Set a built thing out near you, or near `near` ({x, y}: where a friend who built it here is standing, 94-garden-live-3host.js). A visitor's own page asks the host instead. */
function gardenFeatureSetNearby(id, near) {
  const m = gardenHere(); if (m.visit) return _gdNo('Only the garden owner can set this out');
  if (m.worldPending) return _gdNo('The garden update needs to finish first');
  const f = GARDEN_LAND_FEATURES.find(r => r.id === id);
  if (!f || !gardenLandOwnsFeature(id)) return _gdNo('Build this first');
  if (gardenFeatureIsSetOut(id)) return { ok: true, msg: '' };
  const from = near && Number.isFinite(near.x) && Number.isFinite(near.y) ? { x: near.x + .5, y: near.y + .5 } : typeof _gw !== 'undefined' && Number.isFinite(_gw.px) ? { x: _gw.px, y: _gw.py } : GARDEN_WORLD.start;
  const w = f.w || 1, h = f.h || 1, candidates = [], R = near && Number.isFinite(near.r) ? Math.max(2, Math.min(14, near.r)) : 6;   // (r: how far to look; a friend's build looks wider round them before anywhere else)
  for (let y = Math.max(0, Math.floor(from.y) - R - h); y <= Math.min(GARDEN_WORLD.rows - h, Math.ceil(from.y) + R); y++) for (let x = Math.max(0, Math.floor(from.x) - R - w); x <= Math.min(GARDEN_WORLD.cols - w, Math.ceil(from.x) + R); x++) {
    if (from.x >= x - .3 && from.x <= x + w + .3 && from.y >= y - .3 && from.y <= y + h + .3) continue;
    const distance = Math.hypot((x + w / 2 - from.x) * GARDEN_WORLD.cellW, (y + h / 2 - from.y) * GARDEN_WORLD.cellH);
    if (distance <= R * GARDEN_WORLD.cellW) candidates.push({ x, y, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
  const spot = candidates.find(p => !gardenFeaturePlaceWhy(f, p.x, p.y, m));
  if (!spot) return _gdNo('Walk to a larger clear space, then try setting it out nearby');
  const key = 'feature.place.' + id, mark = _gdMark([['wd', key]]);
  _gdG().wd[key] = [3, spot.x, spot.y];
  const result = _gdDone('Set out ' + f.name.toLowerCase(), 'setting out ' + f.name.toLowerCase(), mark, { icon: f.icon });
  gardenModel(); return result;
}
function gardenFeaturePutAway(id) {
  const m = gardenHere(); if (m.visit) return _gdNo('Only the garden owner can put this away');
  if (m.worldPending) return _gdNo('The garden update needs to finish first');
  const f = GARDEN_LAND_FEATURES.find(r => r.id === id), key = 'feature.place.' + id;
  if (!f || !gardenLandOwnsFeature(id)) return _gdNo('That structure is not yours');
  if (!_gdG().wd[key]) return { ok: true, msg: '' };
  const mark = _gdMark([['wd', key]]); delete _gdG().wd[key];
  const result = _gdDone('Put away ' + f.name.toLowerCase(), 'putting away ' + f.name.toLowerCase(), mark, { icon: f.icon });
  gardenModel(); return result;
}


// A discovered place can be brought back deliberately, without resetting the
// room, its gifts or any earlier finds. The saved pair is one atomic wd value.
const _gardenSightPlacementState = { signature: '', rows: new Map() };
function gardenSightKnown(id) {
  if (!GARDEN_SIGHT_PLACE_IDS.includes(id)) return false;
  const seen = _gdG().seen;
  const room = GARDEN_ROOM_SIGHT_ROOMS[id];
  return !!seen['lde.' + id] || !!seen['pl.explore.' + id] || !!(room && seen['pl.rm.' + room + '.f']);
}
function gardenSightWire() {
  if (GARDEN_WORLD.v < 3) return [];
  const out = [], saved = _gdG().wd || {};
  for (const id of GARDEN_SIGHT_PLACE_IDS) {
    const p = saved['sight.place.' + id];
    if (gardenSightKnown(id) && Array.isArray(p) && p.length === 3 && p[0] === 3) out.push([id, p[1], p[2]]);
  }
  return gardenSightPlacementsClean(out);
}
function gardenSightSet(rows) {
  if (GARDEN_WORLD.v < 3) return;
  const next = gardenSightPlacementsClean(rows); next.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  const signature = JSON.stringify(next); if (signature === _gardenSightPlacementState.signature) return;
  _gardenSightPlacementState.signature = signature; _gardenSightPlacementState.rows = new Map(next.map(row => [row[0], row])); gardenLandPropsReset();
}
function gardenSightIsSetOut(id) { return GARDEN_WORLD.v >= 3 && _gardenSightPlacementState.rows.has(id); }
function gardenSightRow(row) {
  if (!row || GARDEN_WORLD.v < 3 || gardenIslandDefaultSight(row.id)) return row;
  const p = _gardenSightPlacementState.rows.get(row.id); if (!p) return null;
  return Object.assign({}, row, { x: p[1], y: p[2], door: { x: p[1] + Math.floor((row.w || 1) / 2), y: p[2] + (row.h || 1) } });
}
function gardenSightSetNearby(id) {
  const m = gardenHere(); if (m.visit) return _gdNo('Only the garden owner can set this out');
  if (m.worldPending) return _gdNo('The garden update needs to finish first');
  if (typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on) return _gdNo('Step outside before setting out a place');
  const source = GARDEN_LAND_SIGHTS.find(row => row.id === id);
  if (!source || !gardenSightKnown(id)) return _gdNo('Discover this place first');
  if (gardenSightIsSetOut(id)) return { ok: true, msg: '' };
  // The old sight may have had a doorway many cells away. A restored place
  // receives a clear entrance beside its new footprint, never an old coordinate.
  const def = Object.assign({}, source, { door: { x: source.x + Math.floor((source.w || 1) / 2), y: source.y + (source.h || 1) } });
  const from = near && Number.isFinite(near.x) && Number.isFinite(near.y) ? { x: near.x + .5, y: near.y + .5 } : typeof _gw !== 'undefined' && Number.isFinite(_gw.px) ? { x: _gw.px, y: _gw.py } : GARDEN_WORLD.start;
  const w = def.w || 1, h = def.h || 1, candidates = [];
  for (let y = Math.max(0, Math.floor(from.y) - 6 - h); y <= Math.min(GARDEN_WORLD.rows - h, Math.ceil(from.y) + 6); y++) for (let x = Math.max(0, Math.floor(from.x) - 6 - w); x <= Math.min(GARDEN_WORLD.cols - w, Math.ceil(from.x) + 6); x++) {
    if (from.x >= x - .3 && from.x <= x + w + .3 && from.y >= y - .3 && from.y <= y + h + .3) continue;
    const distance = Math.hypot((x + w / 2 - from.x) * GARDEN_WORLD.cellW, (y + h / 2 - from.y) * GARDEN_WORLD.cellH);
    if (distance <= 6 * GARDEN_WORLD.cellW) candidates.push({ x, y, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
  const spot = candidates.find(p => !gardenFeaturePlaceWhy(def, p.x, p.y, m));
  if (!spot) return _gdNo('Walk to a larger clear space, then try setting it out nearby');
  const key = 'sight.place.' + id, mark = _gdMark([['wd', key]]); _gdG().wd[key] = [3, spot.x, spot.y];
  const result = _gdDone('Set out ' + source.name.toLowerCase(), 'setting out ' + source.name.toLowerCase(), mark, { icon: 'door-open' }); gardenModel(); return result;
}
function gardenSightPutAway(id) {
  const m = gardenHere(); if (m.visit) return _gdNo('Only the garden owner can put this away');
  if (m.worldPending) return _gdNo('The garden update needs to finish first');
  if (typeof _grm !== 'undefined' && _grm.on || typeof _ee !== 'undefined' && _ee.on) return _gdNo('Step outside before putting away a place');
  const key = 'sight.place.' + id; if (!gardenSightKnown(id)) return _gdNo('That place has not been discovered');
  if (!_gdG().wd[key]) return { ok: true, msg: '' };
  const mark = _gdMark([['wd', key]]); delete _gdG().wd[key];
  const result = _gdDone('Put away this place', 'putting away a discovered place', mark, { icon: 'door-open' }); gardenModel(); return result;
}

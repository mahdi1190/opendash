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
function gardenFeaturePlaceWhy(f, x, y, m) {
  const why = _gdPlaceOk(m, { id: f.id, w: f.w || 1, h: f.h || 1, layer: 'main' }, x, y, 'decor');
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
function gardenFeatureSetNearby(id) {
  const m = gardenHere(); if (m.visit) return _gdNo('Only the garden owner can set this out');
  if (m.worldPending) return _gdNo('The garden update needs to finish first');
  const f = GARDEN_LAND_FEATURES.find(r => r.id === id);
  if (!f || !gardenLandOwnsFeature(id)) return _gdNo('Build this first');
  if (gardenFeatureIsSetOut(id)) return { ok: true, msg: '' };
  const from = typeof _gw !== 'undefined' && Number.isFinite(_gw.px) ? { x: _gw.px, y: _gw.py } : GARDEN_WORLD.start;
  const w = f.w || 1, h = f.h || 1, candidates = [];
  for (let y = Math.max(0, Math.floor(from.y) - 6 - h); y <= Math.min(GARDEN_WORLD.rows - h, Math.ceil(from.y) + 6); y++) for (let x = Math.max(0, Math.floor(from.x) - 6 - w); x <= Math.min(GARDEN_WORLD.cols - w, Math.ceil(from.x) + 6); x++) {
    if (from.x >= x - .3 && from.x <= x + w + .3 && from.y >= y - .3 && from.y <= y + h + .3) continue;
    const distance = Math.hypot((x + w / 2 - from.x) * GARDEN_WORLD.cellW, (y + h / 2 - from.y) * GARDEN_WORLD.cellH);
    if (distance <= 6 * GARDEN_WORLD.cellW) candidates.push({ x, y, distance });
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
  return !!seen['lde.' + id] || !!(room && seen['pl.rm.' + room + '.f']);
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
  const from = typeof _gw !== 'undefined' && Number.isFinite(_gw.px) ? { x: _gw.px, y: _gw.py } : GARDEN_WORLD.start;
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

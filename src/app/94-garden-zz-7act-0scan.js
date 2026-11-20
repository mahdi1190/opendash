/* ============================================================
   AFFORDANCES, FOUND (20 Nov 2026): whatever is placed gets its kind's affordances (94-garden-zz-7act-0kinds.js). Nothing is listed by
   name: at garden start, and whenever the layout, the opened land or what is placed changes, everything standing is read again:
     the layout's fixed things and landmarks (gardenLandProps, island static), the things placed through layout data (the layout's own
     `things`, and assets/garden/vale-things.json: window.GardenValeThings), what the painters drew with a foot (GardenPaintVale.feet), the
     decorations placed in this garden (yours, or the one you visit).
   gardenAffordThings()            every thing found: [{ id, kind ('' = unknown: offers nothing), x, y (foot middle), w, h, front, src, name, static }]
   gardenAffordNear(kinds, x, y, R) the nearest found thing of a kind (or a list of kinds, or a pets word with pet: true) within R cells
   gardenAffordOfPet(word)          every thing a pet counts as `word` ('bench', 'well', 'fire' ...)
   gardenTerrainAt(x, y)            the ground's type there, read from the layout's cells: 'deep' 'water' 'sand' 'snow' 'path' 'slope' 'open-grass'
                                    'ground' or '' (off the land)
   gardenTerrainNear(type, x, y, R) the nearest cell of that type: { x, y } or null
   ============================================================ */
const _gks = { key: null, list: [], t: 0, unknown: [], orphans: new Set(), moved: new Map() };
/** Things placed through layout data: the layout's own `things` win over the shared file's rows of the same id. */
function gardenThingsPlaced() {
  const out = new Map();
  try { const T = typeof window !== 'undefined' && window.GardenValeThings; for (const r of (T && T.things) || []) if (r && r.id) out.set(r.id, r); } catch (e) { /* none */ }
  try { for (const r of gardenIslandData().things || []) if (r && r.id) out.set(r.id, r); } catch (e) { /* none */ }
  return [...out.values()];
}
function _gksKey() {
  let m = null; try { m = gardenHere(); } catch (e) { return 'none'; }
  let lp = 0; try { lp = gardenLandProps().length; } catch (e) { lp = 0; }
  let feet = ''; try { feet = typeof GardenPaintVale !== 'undefined' && GardenPaintVale && GardenPaintVale.feetSig ? GardenPaintVale.feetSig() : ''; } catch (e) { feet = ''; }
  let id = ''; try { id = gardenIslandData().id; } catch (e) { id = ''; }
  let wr = 0; try { const w = window.GardenNative && GardenNative.world(); wr = w && w.waterAt && w.waterAt(0, 0) !== null ? 1 : 0; } catch (e) { wr = 0; }   // (the water is painted: a bank is laid on it again)
  let sol = 0; try { sol = typeof _gw !== 'undefined' && _gw.solids ? _gw.solids.list.length : 0; } catch (e) { sol = 0; }   // (what blocks walking is known: a placed thing is checked against it again)
  let lv = 0; try { lv = _gksLevel(); } catch (e) { lv = 0; }   // (a thing kept for a later level comes back when you reach it)
  let ar = ''; try { ar = typeof _GD_LAND !== 'undefined' && _GD_LAND ? _GD_LAND.size : ''; } catch (e) { ar = ''; }
  return [id, sol, wr, lv, ar, _gksGridRev(), m.visit ? m.visit.key : 'me', (m.decor || []).length, (m.decor || []).reduce((h, d) => (h * 31 + Math.round(d.x * 7 + d.y * 131)) | 0, 0), (m.areas || []).length, lp, feet, typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0, gardenThingsPlaced().length].join('|');
}
/** The garden's level as a number (the model keeps { level, ... }). */
function _gksLevel() { try { const L = gardenModel().level; return Number(L && typeof L === 'object' ? L.level : L) || 0; } catch (e) { return 0; } }
/** A number that changes whenever the walker's map of what stops the feet is rebuilt (land opened, a thing built). */
const _gksGrid = { obj: null, n: 0 };
function _gksGridRev() { const g = typeof _gw !== 'undefined' && _gw ? _gw.grid : null; if (g && g !== _gksGrid.obj) { _gksGrid.obj = g; _gksGrid.n++; } return _gksGrid.n; }
/** Every thing standing now, with its kind. Rebuilt when the key changes (looked at at most twice a second). */
function gardenAffordThings() {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (_gks.key !== null && now - _gks.t < 500) return _gks.list;
  _gks.t = now;
  const key = _gksKey(); if (key === _gks.key) return _gks.list;
  _gks.key = key;
  const list = [], seen = new Set(); _gks.orphans = new Set(); _gks.moved = new Map();
  const push = (t) => { if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.y) || seen.has(t.src + ':' + t.id)) return; seen.add(t.src + ':' + t.id); list.push(t); };
  const sightArt = new Map(); try { for (const s of GARDEN_LAND_SIGHTS) sightArt.set(s.id, s.art); } catch (e) { /* none */ }
  const live = new Map(); try { for (const p of GARDEN_PROPS) live.set(p.id, p); } catch (e) { /* none */ }
  // 1. landmarks and the land's built things, where they stand now
  const landIds = new Set();
  let stat = []; try { stat = gardenIslandData().static || []; } catch (e) { stat = []; }
  const statById = new Map(stat.map(r => [r.id, r]));
  try { for (const p0 of gardenLandProps()) { landIds.add(p0.id); const p = statById.get(p0.id) || p0, art = p0.art || sightArt.get(p0.id) || p0.kind; push({ id: p0.id, kind: gardenKindOf({ id: p0.id, art, kind: p.kind && GARDEN_KINDS[p.kind] ? p.kind : '' }), art: String(art || ''), x: p.x + (p.w || 1) / 2, y: p.y + (p.h || 1), w: p.w || 1, h: p.h || 1, front: p.front, src: 'land', static: true, name: p0.name, tall: p0.tall }); } } catch (e) { /* none */ }   // (the layout's row is where it stands; the land's row says what it is)
  // 2. the layout's fixed things (the shops, the pier, the boat ...): the live row's place when the garden moved one
  for (const r0 of stat) {
    if (landIds.has(r0.id)) continue;
    const r = live.get(r0.id) || r0, art = (live.get(r0.id) || {}).kind || sightArt.get(r0.id) || r0.art || '';
    push({ id: r0.id, kind: gardenKindOf({ id: r0.id, art, kind: r0.kind }), art: String(art), x: r.x + (r.w || 1) / 2, y: r.y + (r.h || 1), w: r.w || 1, h: r.h || 1, front: r0.front, src: 'layout', static: true, name: r.name, needs: r.needs || null, tall: r.tall });
  }
  // 3. placed through layout data (a ball, a log seat, a campfire, a telescope ...)
  const level = _gksLevel() || 99;
  for (const r of gardenThingsPlaced()) {
    if (!r.kind || !GARDEN_KINDS[r.kind]) { push({ id: r.id, kind: '', x: Number(r.x), y: Number(r.y), w: Number(r.w) || 1, h: Number(r.h) || 1, src: 'thing' }); continue; }
    if (r.level && level < r.level) continue;
    try { if (typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(Math.floor(r.x), Math.floor(r.y))) continue; } catch (e) { /* open */ }
    const K = GARDEN_KINDS[r.kind];
    if (!gardenKindDrawable(r.kind, typeof _GAW_ART !== 'undefined' ? _GAW_ART : null)) { _gks.orphans.add(r.id + ' (kind ' + r.kind + ' has no drawing to place: left out, nothing invisible is used)'); continue; }
    let x = Number(r.x), y = Number(r.y);
    if (r.on) { const a = list.find(t => t.id === r.on && t.static); if (!a) { _gks.orphans.add(r.id); continue; } const at = Array.isArray(r.at) ? r.at : [0, 0]; x = a.x + (Number(at[0]) || 0); y = a.y + (Number(at[1]) || 0); }   // (placed against a fixed thing: when the layout moves it, this goes with it)
    let front = r.front;
    if (K.ground) { const sn = gardenKindSnap(r.kind, x, y, Number(r.w) || K.w, _gksWetDrawn, r.front); if (!sn) { _gks.orphans.add(r.id + ' (no ' + K.ground + ' near)'); continue; } x = sn.x; y = sn.y; if (sn.front != null) front = sn.front; }   // (a bank stays on the bank whatever the layout did round it)
    else {   // nothing overlaps (rule 12): a row a re-laid layout leaves on a path, a wall, a building, the water or another thing is moved
      const w0 = Number(r.w) || K.w || 1, h0 = Number(r.h) || K.h || 1, why = _gksPlaceFault(K, x, y, w0, h0, list, r.id);
      if (why) { const q = _gksPlaceNear(K, x, y, w0, h0, list, r.id); if (!q) { _gks.orphans.add(r.id + ' (' + why + ', no clear ground within 3 cells: left out)'); continue; } _gks.moved.set(r.id, { from: [x, y], to: [q.x, q.y], why }); x = q.x; y = q.y; }
    }
    push({ id: r.id, kind: r.kind, x, y, w: Number(r.w) || K.w || 1, h: Number(r.h) || K.h || 1, front, src: 'thing', name: r.name, season: r.season || '', drawn: r.drawn, art: K.art || '' });
  }
  // 4. what a painter drew with a foot (the maypole on the green): only things of a kind something is done with
  try { if (typeof GardenPaintVale !== 'undefined' && GardenPaintVale && GardenPaintVale.feet) for (const f of GardenPaintVale.feet()) { const nm = String(f.src || '').replace(/^painted /, '').split('|')[0], k = gardenKindOf({ id: nm, head: true }); if (k === 'building' || k === 'scenery') continue;   /* (a painted thing of no known kind is found too, kind '': it offers nothing and is listed in _gks.unknown) */ push({ id: 'painted:' + nm + ':' + Math.round(f.x0 * 10) + ',' + Math.round(f.y1 * 10), kind: k, x: (f.x0 + f.x1) / 2, y: f.y1, w: Math.max(0.4, f.x1 - f.x0), h: Math.max(0.2, f.y1 - f.y0), src: 'painted', name: nm }); } } catch (e) { /* no painter */ }
  // 4b. the clutter a painter stands from the layout alone (a quay's bench, crates, pots): found by its own word, like any painted thing
  try { if (typeof gardenIslandHarbourThings === 'function') for (const h of gardenIslandHarbourThings()) { const k = gardenKindOf({ id: h.key, head: true }); if (!k || k === 'building' || k === 'scenery') continue; const x0 = h.foot[0], x1 = h.foot[2]; if (list.some(t => t.src === 'painted' && t.kind === k && Math.abs(t.x - (x0 + x1) / 2) < 0.6 && Math.abs(t.y - h.foot[3]) < 0.6)) continue; push({ id: 'painted:' + h.key + ':' + Math.round(x0 * 10) + ',' + Math.round(h.foot[3] * 10), kind: k, x: (x0 + x1) / 2, y: h.foot[3], w: Math.max(0.4, x1 - x0), h: Math.max(0.2, h.foot[3] - h.foot[1]), src: 'painted', name: GARDEN_KINDS[k].name }); } } catch (e) { /* no harbour */ }
  // 5. decorations placed in this garden
  try { for (const d of gardenHere().decor || []) { const def = d.def || {}; if (def.layer === 'ground') continue; const w = def.w || 1, h = def.h || 1; push({ id: d.uid, kind: gardenKindOf({ decor: def.id, effect: def.effect && def.effect.kind, id: def.id }), x: d.x + w / 2, y: d.y + h, w, h, src: 'decor', name: def.name ? 'the ' + String(def.name).toLowerCase() : '', decor: def.id }); } } catch (e) { /* none */ }
  _gks.list = list; _gks.unknown = list.filter(t => !t.kind).map(t => t.src + ':' + t.id);
  // a placed thing moved aside once the walker knew what stops the feet: the world draws it again where it now lies
  const placedSig = list.filter(t => t.src === 'thing').map(t => t.id + '@' + t.x + ',' + t.y).join('|');
  if (_gks.placedSig != null && _gks.placedSig !== placedSig) { _gks.rev = (_gks.rev || 0) + 1; setTimeout(() => { try { if (typeof GardenNative !== 'undefined' && GardenNative.sync) GardenNative.sync(); } catch (e) { /* drawn next time */ } }, 0); }
  _gks.placedSig = placedSig;
  if (_gks.unknown.length && _gks.said !== _gks.unknown.join()) { _gks.said = _gks.unknown.join(); try { console.info('[garden] things of no known kind (they offer nothing; give them a kind in the layout or a word in GARDEN_KINDS): ' + _gks.unknown.join(', ')); } catch (e) { /* no console */ } }
  return list;
}
/** Why a placed thing may not lie with its foot's middle at (x, y), w by h cells, or '' when it may: the same ground rule for every kind.
 *  Not on the water, a path, road or paved yard (a kind with onPath, a busker's pitch, may stand on setts), not on what stops the feet
 *  (a building, a wall, a rock, a tree's trunk, a painted thing: the walker's own map), not on another thing found standing. */
function _gksPlaceFault(K, x, y, w, h, list, self) {
  const hw = w / 2, cy = y - h / 2, pts = [[x, y - 0.06], [x - hw * 0.85, y - 0.06], [x + hw * 0.85, y - 0.06], [x, y - h * 0.9]];
  for (const [px, py] of pts) if (_gksWet(px, py)) return 'in the water';
  if (!K.onPath) for (const [px, py] of pts) { let c = null; try { c = gardenIslandBaseCell(px, py); } catch (e) { c = null; } if (c && c.route) return 'on a path (' + c.route + ')'; }
  try { const D = gardenIslandData(); for (const [px, py] of pts) if (gardenPlotNear(D, px, py, 0.45)) return 'on a garden plot or its wall'; } catch (e) { /* no plots */ }
  const walker = typeof _gw !== 'undefined' && _gw && _gw.grid && _gw.solids;   // (before the walker has its map, only the layout's own cells are read)
  // (the layout's own cells: a building's footprint or rock; never the walker's whole map, which also shuts land not yet opened)
  for (const [px, py] of pts) { let c = null; try { c = gardenIslandBaseCell(px, py); } catch (e) { c = null; } if (!c || !c.land) return 'off the land'; if (c.staticId && c.staticId !== self) { let st = null; try { st = (gardenIslandData().static || []).find(q => q.id === c.staticId); } catch (e) { st = null; } if (st && (st.col || 'full') === 'full' && !st.walk) return 'on ' + c.staticId; } if (c.solid) return 'on rock or a wall'; }
  try { if (walker) { const S = _gw.solids, tag = '[thing:' + self + ']', x0 = x - hw - 0.2, x1 = x + hw + 0.2, y0 = y - h - 0.2, y1 = y + 0.25;   /* (a little room all round: a fire's ring was drawn against a wall's end) */ for (let gy = Math.floor(y0); gy <= Math.floor(y1); gy++) for (let gx = Math.floor(x0); gx <= Math.floor(x1); gx++) for (const r of S.at.get(gx + ',' + gy) || []) { if (String(r.src).includes(tag)) continue; if (x1 > r.x0 && x0 < r.x1 && y1 > r.y0 && y0 < r.y1 && (!r.form || typeof _gwFormHitsBox !== 'function' || _gwFormHitsBox(r.form, x0, y0, x1, y1))) return 'on ' + (r.src || 'something solid'); } } } catch (e) { /* no walker yet */ }
  for (const o of list) { if (o.id === self || o.src === 'decor') continue; if (gardenKindBoxesMeet(x, y, w, h, o.x, o.y, o.w || 1, o.h || 1)) return 'on ' + o.id; }   // (as drawn: a fire's ring of stones and its shadow reach past its foot)
  // (and a little room past its edge: a walled yard's dry-stone rim is painted along its outline, so a thing just outside would lie on it)
  if (!K.onPath) for (const [px, py] of pts.concat([[x - hw - 0.45, y - 0.1], [x + hw + 0.45, y - 0.1], [x, y + 0.4], [x, y - h - 0.45]])) if (typeof _plStoneAt === 'function' && _plStoneAt(px, py)) return 'on paving';
  // where you stand to use it is open ground on the same side of any wall (a fire with its warming spot over a wall is no use)
  if (walker && K.acts) { const kid = Object.keys(GARDEN_KINDS).find(k => GARDEN_KINDS[k] === K); for (const sp of gardenKindSpots({ kind: kid, x, y, w })) { if (sp.pierEnd || sp.wade || sp.boat) continue; for (let i = 1; i <= 4; i++) { const qx = x + (sp.stand.x - x) * i / 4, qy = y - 0.05 + (sp.stand.y - y + 0.05) * i / 4; if (_gksSolidAt(qx, qy, self)) return 'its standing spot is behind something solid'; } try { if (typeof gardenReachableFromArrival === 'function' && !gardenReachableFromArrival(Math.floor(sp.stand.x), Math.floor(sp.stand.y))) return 'its standing spot cannot be walked to from the arrival point (shut in)'; } catch (e) { /* no map */ }   /* (from the arrival point, never from where the player stands: in a boat everything would be shut in) */ } }
  return '';
}
/** Is (x, y) inside something that stops the feet (the walker's boxes and wall outlines), other than the thing itself? */
function _gksSolidAt(x, y, self) {
  try { const S = _gw.solids, tag = '[thing:' + self + ']'; for (const r of S.at.get(Math.floor(x) + ',' + Math.floor(y)) || []) { if (String(r.src).includes(tag)) continue; if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1 && (!r.form || typeof _gwFormHitsBox !== 'function' || _gwFormHitsBox(r.form, x - 0.05, y - 0.05, x + 0.05, y + 0.05))) return true; } } catch (e) { return false; }
  return false;
}
/** The nearest spot within 3 cells where the thing may lie (_gksPlaceFault), or null. */
function _gksPlaceNear(K, x, y, w, h, list, self) {
  for (let r = 0.35; r <= 3.01; r += 0.35) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + r, qx = Math.round((x + Math.cos(a) * r) * 100) / 100, qy = Math.round((y + Math.sin(a) * r * 0.75) * 100) / 100; if (!_gksPlaceFault(K, qx, qy, w, h, list, self)) return { x: qx, y: qy }; }
  return null;
}
/** Bumped when a placed thing lies somewhere new (the stage's cache key: 94-garden-4page.js), so the world draws it there. */
function gardenAffordRev() { return _gks.rev || 0; }
/** Rebuild on the next look (the layout or the land changed). */
function gardenAffordReset() { _gks.key = null; _gks.t = 0; }
/** The pets' word for a thing -> every found thing it counts as. */
function gardenAffordOfPet(word) {
  const kinds = new Set(GARDEN_KIND_BY_PET[word] || []);
  return gardenAffordThings().filter(t => kinds.has(t.kind) && !(t.season && _gksSeason() && t.season !== _gksSeason()));
}
function _gksSeason() { try { return gardenModel().season || ''; } catch (e) { return ''; } }
/** The nearest found thing of a kind (a kind id, a list of them, or { pet: word }) within R cells of (x, y), or null. */
function gardenAffordNear(kinds, x, y, R) {
  const set = new Set(Array.isArray(kinds) ? kinds : kinds && kinds.pet ? GARDEN_KIND_BY_PET[kinds.pet] || [] : [kinds]);
  let best = null, bd = R == null ? 1e9 : R;
  for (const t of gardenAffordThings()) { if (!set.has(t.kind)) continue; const d = Math.hypot(t.x - x, (t.y - y) * 1.3); if (d < bd) { bd = d; best = t; } }
  return best;
}
/* ---------- terrain, from the layout's cells ---------- */
/** Is (x, y) water as it is PAINTED (the native world's water regions), else as the cell model has it. A bank is laid on the drawn
 *  shore, so a re-laid lake whose painted edge is half a cell from the model's never seats you over open water. */
function _gksWetDrawn(x, y) { try { const w = window.GardenNative && GardenNative.world(), v = w && w.waterAt ? w.waterAt(x, y) : null; if (v != null) return !!v || _gksWet(x, y); } catch (e) { /* no world */ } return _gksWet(x, y); }
function _gksWet(x, y) { try { if (typeof gardenWaterContainsPoint === 'function') return !!gardenWaterContainsPoint(x, y); const c = gardenIslandBaseCell(x, y); return !!(c && (c.freshwater || c.ocean)); } catch (e) { return false; } }
/** The ground's type at (x, y): what it offers is GARDEN_TERRAIN[type]. */
function gardenTerrainAt(x, y) {
  let c = null; try { c = gardenIslandBaseCell(x, y); } catch (e) { c = null; }
  if (!c) return '';
  if (_gksWet(x, y)) return _gksWet(x, y - 1.2) && _gksWet(x, y - 2.4) && _gksWet(x + 1.2, y - 1.2) && _gksWet(x - 1.2, y - 1.2) ? 'deep' : 'water';
  if (!c.land) return '';
  if (gardenTerrainUp(x, y)) return 'slope';   // (only ground you walk on that rises: by a wall, a scarp or a mountain the ground is flat grass)
  if (c.beach) return 'sand';
  if (c.route || (typeof _plStoneAt === 'function' && _plStoneAt(x, y))) return 'path';
  if (c.solid || c.staticId || c.reservation) return 'ground';
  if (_gksSeason() === 'winter') return 'snow';
  return 'open-grass';
}
/** Which way the ground rises at (x, y): { x, y, hill } a unit vector uphill, or null on the flat (gardenRiseAt, 94-garden-zz-7act-0kinds.js:
 *  the same pure rule the audit counts slope cells with). Cached per cell for this layout. */
const _gkUp = { id: null, m: new Map() };
function gardenTerrainUp(x, y) {
  let D = null; try { D = gardenIslandData(); } catch (e) { return null; }
  if (_gkUp.id !== D) { _gkUp.id = D; _gkUp.m = new Map(); }
  const cx = Math.floor(x), cy = Math.floor(y), key = cy * 4096 + cx;
  if (_gkUp.m.has(key)) return _gkUp.m.get(key);
  let up = null; try { up = gardenRiseAt(D, (qx, qy) => gardenIslandBaseCell(qx, qy), cx + 0.5, cy + 0.5); } catch (e) { up = null; }
  _gkUp.m.set(key, up);
  return up;
}
/** Water just in front of you, out over the bank: { x, y, deep } or null. */
function gardenTerrainWaterAhead(px, py) {
  if (_gksWet(px, py)) return null;
  for (const dy of [-1.1, -1.8]) if (_gksWet(px, py + dy) && _gksWet(px, py + dy - 1.6)) return { x: px, y: py + dy, deg: -90, deep: _gksWet(px, py + dy - 2.8) && _gksWet(px, py + dy - 4.2) };
  return null;
}
/** The nearest cell of a terrain type within R (cell middles): { x, y } or null. */
function gardenTerrainNear(type, x, y, R) {
  R = R || 6; let best = null, bd = R;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const cx = Math.floor(x) + dx + 0.5, cy = Math.floor(y) + dy + 0.5, d = Math.hypot(cx - x, cy - y); if (d >= bd) continue; if (gardenTerrainAt(cx, cy) === type) { bd = d; best = { x: cx, y: cy }; } }
  return best;
}
/** Somewhere a thing may be laid on the ground (a pet's puddle, its leaves, a fire): grass or soil (a puddle or a hole also on sand), never a
 *  road, water, a building's ground or on top of anything found standing there. The same rule for every prop of the world. */
function gardenTerrainTakes(kind, x, y) {
  const t = gardenTerrainAt(x, y);
  if (t === 'open-grass' || t === 'snow' || t === 'slope') { /* fine */ } else if (t === 'sand') { if (kind !== 'puddle' && kind !== 'hole') return false; } else return false;
  return !gardenAffordOverlap(x, y);
}
/** Is (x, y) on, or just in front of, a found thing's footprint (nothing is laid on top of anything)? */
function gardenAffordOverlap(x, y, pad) {
  const p = pad == null ? 0.25 : pad;
  for (const o of gardenAffordThings()) { if (o.src === 'painted') continue; const hw = (o.w || 1) / 2 + p; if (Math.abs(o.x - x) < hw && y > o.y - (o.h || 1) - p && y < o.y + p + 0.1) return true; }
  return false;
}

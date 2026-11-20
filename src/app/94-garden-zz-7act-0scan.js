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
const _gks = { key: null, list: [], t: 0, unknown: [], orphans: new Set() };
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
  return [id, m.visit ? m.visit.key : 'me', (m.decor || []).length, (m.decor || []).reduce((h, d) => (h * 31 + Math.round(d.x * 7 + d.y * 131)) | 0, 0), (m.areas || []).length, lp, feet, typeof gardenDesignRev === 'function' ? gardenDesignRev() : 0, gardenThingsPlaced().length].join('|');
}
/** Every thing standing now, with its kind. Rebuilt when the key changes (looked at at most twice a second). */
function gardenAffordThings() {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (_gks.key !== null && now - _gks.t < 500) return _gks.list;
  _gks.t = now;
  const key = _gksKey(); if (key === _gks.key) return _gks.list;
  _gks.key = key;
  const list = [], seen = new Set(); _gks.orphans = new Set();
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
  let level = 99; try { level = gardenModel().level || 99; } catch (e) { level = 99; }
  for (const r of gardenThingsPlaced()) {
    if (!r.kind || !GARDEN_KINDS[r.kind]) { push({ id: r.id, kind: '', x: Number(r.x), y: Number(r.y), w: Number(r.w) || 1, h: Number(r.h) || 1, src: 'thing' }); continue; }
    if (r.level && level < r.level) continue;
    try { if (typeof gardenAreaOpenAt === 'function' && !gardenAreaOpenAt(Math.floor(r.x), Math.floor(r.y))) continue; } catch (e) { /* open */ }
    const K = GARDEN_KINDS[r.kind];
    let x = Number(r.x), y = Number(r.y);
    if (r.on) { const a = list.find(t => t.id === r.on && t.static); if (!a) { _gks.orphans.add(r.id); continue; } const at = Array.isArray(r.at) ? r.at : [0, 0]; x = a.x + (Number(at[0]) || 0); y = a.y + (Number(at[1]) || 0); }   // (placed against a fixed thing: when the layout moves it, this goes with it)
    push({ id: r.id, kind: r.kind, x, y, w: Number(r.w) || K.w || 1, h: Number(r.h) || K.h || 1, front: r.front, src: 'thing', name: r.name, season: r.season || '', drawn: r.drawn, art: K.art || '' });
  }
  // 4. what a painter drew with a foot (the maypole on the green): only things of a kind something is done with
  try { if (typeof GardenPaintVale !== 'undefined' && GardenPaintVale && GardenPaintVale.feet) for (const f of GardenPaintVale.feet()) { const nm = String(f.src || '').replace(/^painted /, ''), k = gardenKindOf({ id: nm, head: true }); if (!k || k === 'building') continue; push({ id: 'painted:' + nm + ':' + Math.round(f.x0 * 10) + ',' + Math.round(f.y1 * 10), kind: k, x: (f.x0 + f.x1) / 2, y: f.y1, w: Math.max(0.4, f.x1 - f.x0), h: Math.max(0.2, f.y1 - f.y0), src: 'painted', name: nm }); } } catch (e) { /* no painter */ }
  // 5. decorations placed in this garden
  try { for (const d of gardenHere().decor || []) { const def = d.def || {}; if (def.layer === 'ground') continue; const w = def.w || 1, h = def.h || 1; push({ id: d.uid, kind: gardenKindOf({ decor: def.id, effect: def.effect && def.effect.kind, id: def.id }), x: d.x + w / 2, y: d.y + h, w, h, src: 'decor', name: def.name ? 'the ' + String(def.name).toLowerCase() : '', decor: def.id }); } } catch (e) { /* none */ }
  _gks.list = list; _gks.unknown = list.filter(t => !t.kind).map(t => t.src + ':' + t.id);
  return list;
}
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
function _gksWet(x, y) { try { if (typeof gardenWaterContainsPoint === 'function') return !!gardenWaterContainsPoint(x, y); const c = gardenIslandBaseCell(x, y); return !!(c && (c.freshwater || c.ocean)); } catch (e) { return false; } }
/** The ground's type at (x, y): what it offers is GARDEN_TERRAIN[type]. */
function gardenTerrainAt(x, y) {
  let c = null; try { c = gardenIslandBaseCell(x, y); } catch (e) { c = null; }
  if (!c) return '';
  if (_gksWet(x, y)) return _gksWet(x, y - 1.2) && _gksWet(x, y - 2.4) && _gksWet(x + 1.2, y - 1.2) && _gksWet(x - 1.2, y - 1.2) ? 'deep' : 'water';
  if (!c.land) return '';
  if (c.slope || (c.landformId && /slope|hill/i.test(c.landformId))) return 'slope';
  if (c.beach) return 'sand';
  if (c.route || (typeof _plStoneAt === 'function' && _plStoneAt(x, y))) return 'path';
  if (c.solid || c.staticId || c.reservation) return 'ground';
  if (_gksSeason() === 'winter') return 'snow';
  return 'open-grass';
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

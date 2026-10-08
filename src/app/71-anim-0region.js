/* ============================================================
   ANIMATION REGIONS, the generic framework. PURE classic script (no DOM, no fetches, nothing looked up
   online).

   LOAD ORDER (read this before writing a region file). The build concatenates src/app/*.js by name into ONE
   script scope (build.mjs; tools/lib/anim-sources.mjs animRegistryFiles() lists the animation files in exactly that
   order and tests/region-framework.test.mjs evaluates them in it). A top-level const is usable only after its file has
   loaded; function declarations are hoisted. This file's name sorts it BEFORE every other 71-anim-* file, so a region
   config may call animRegionDefine() while it loads. But region configs and scene files sort before (71-anim-asia*,
   71-anim-region-*) or after (71-anim-us*) the library and the registry, so at load time they may use ONLY this file's
   names: touching the registry's or the library's consts (ANIM_SLOTS ...) from a config or a scene file throws
   "Cannot access ... before initialization" and the app's script dies. Calling their functions later, inside a function
   that runs after load, is fine. Every file shares that one scope, so a scene file wraps its code in an IIFE,
   (function () { const K = animSceneKit(); ... })();, or its consts clash with the next scene file's
   ("Identifier 'K' has already been declared").

   A REGION is a part of the world with its own full-screen openings and small symbols, played only where the
   user is (the US, Asia, and every region added since). A region is DATA, never logic:

     src/app/71-anim-region-<id>.js            the config: animRegionDefine({...}) over the region's tables
     src/app/71-anim-region-<id>-scenes-N.js   full-screen scenes: animRegionSceneAdd('<id>', {key, ...})
     src/app/72-anim-pack-<id>-<group>.js      one pack per group: const B = REGION.builder('<group>'); ...
   (the legacy US and Asia files, 71-anim-us.js and 71-anim-asia.js, are thin configs over this file.)

   The config (animRegionDefine(cfg)):
     id          'asia'      lower-case letters and digits; the region's packs are named '<id>-<group>'
     name        'Asia'      human name
     over        'Asia'      the opening sequence's caption prefix ("Welcome to Kyoto" over "Asia")
     unitWord    'country'   what a unit is called ('state', 'country'...): the item kind value and the scene key prefix
     units       { JP: ['Japan', 'east'] }                     code -> [name, group]
     places      [['tokyo', 'Tokyo', 'JP', 35.68, 139.69, 'big']]   [id, name, unit code, lat, lon, kind]
                 kind: 'big' (a signature opening) | 'small' (a symbol) | '' (an anchor: only tells which unit a position is in)
     unitKm      300         beyond this from every row a position is in no unit of this region
     placeKm     { big: 50, small: 30 }   how close counts as "in" a big city / a small one (the default)
     travelId    (row) => row[0] + '-' + countryCode.toLowerCase()   the travel city id of a row: the travel tables' id
                 ('seattle-us', 'tokyo-jp'); the default uses the same country hook and unit-code fallback as the items
     worldTravel ['tokyo-jp']   travel city ids the world pack draws: while travelling there the region matches nothing.
                 EVERY city of the world pack (72-anim-pack-world.js) that a row of the region maps to must be listed, or
                 the region's city art beats the world pack's landmark (tests/region-framework.test.mjs and
                 region.check({ worldCities }) enforce it)
     elsewhere   ['TX']      units with art elsewhere (their own pack): lookups know them, where() returns null
     pseudo      { DC: {id, name, kind, group?} }   special units with no unit art of their own: one fixed place
     placeKinds  ['big', 'small']   the kinds b.place() may build (Asia: ['small']; its big cities come from scenes)
     fields      item field names: { kind, unit, place, size, signature } (defaults '<id>Kind', '<id><Unit>', ...)
     tags        { root, unit, city }   the first tags of every item (defaults id, '<id>-<unitWord>', '<id>-city')
     priority    { unit: 1, city: 1.2 }
     keys        { unit, unitName }   property names in place() / where() results (defaults 'unit', 'unitName')
     country     the ISO country code of an item: a string, or (unit) => code; default the unit code itself
     extra       (unit) => ({...})   more fields for every item (the US adds state)
     complete    true | false   a region still being drawn (the scaffold of tools/anim-pack.mjs new writes false) has its COVERAGE
                 tests reported as todo (every unit has its art, no starter rows left ...); the structural ones (sound tables, no
                 overlap, unique travel ids, no dead art) always run. Set true when `node tools/anim-pack.mjs status <id> --strict`
                 passes (`status <id> --declare-complete` does it): the coverage tests then fail hard. Default true: a config
                 that does not say is a finished region (the US and Asia).
   The region: where(ctx), locate(ctx), place(ctx), unitOf(ctx), nearestRow(ctx), builder(group), sceneAdd(entry), scenes, check(),
   travelId(row), worldTravel, elsewhere, travelRow(city), unitKm, placeKm, complete, countryOf(unit).

   Where the user is (ctx.city is the travel city while away, else ctx.lat / ctx.lon, the weather town):
     travel     ctx.city = travelId(row) of a place row; ids in worldTravel return no match. ONLY travelRow(ctx.city) is used: a
                travel city that is not a row of the region matches nothing at all (the region plays nothing for that trip), so
                every travel city of the region's countries that should open needs a row (`status` lists the ones without)
     home       a big or small place within its radius gives the PLACE; any row (anchors too) within unitKm
                gives the UNIT (nearest row wins, so right beside a border it can be the neighbour). A row the travel tables
                lack is still reached from home: the weather town's position decides, no travel id is involved
   Items carry <fields.kind>: unitWord | 'city', <fields.unit> (the unit code), for a city <fields.place> and
   <fields.size>, and for a unit <fields.signature>; priority 1 (unit) and 1.2 (city): a festival or the birthday
   (priority 2+) still wins the day.

   REGIONS MUST NOT OVERLAP. No row of a region may sit inside another region's reach (unitKm of its nearest
   row): tests/region-framework.test.mjs checks every region against every other, and region.check() names each such row
   (BORDER CASE: a town just across a border from a neighbour region, e.g. a row 70 km from Asia's Jayapura row, cannot be a row
   of the region on the other side while Asia reaches 300 km: leave it without a row, drop it, or lower the neighbour's unitKm
   after running both regions' tests). Two reaches can still overlap
   between rows; there the region whose nearest row is NEARER wins. region.locate(ctx) returns {km, where}, the
   distance to that nearest row (0 for a travel match); animRegionsWhere(ctx) lists every region that matches
   nearest first (ties in definition order); animRegionWhere(ctx) is its first entry. A unit with art elsewhere
   (elsewhere) still claims its position: a farther region cannot take it, the lists are empty there. The opening
   sequence takes the entry whose region owns the opening it picked (a farther region's art can be picked in the
   overlap). Item when() rules stay per region.
   TABLES are read ONCE, when animRegionDefine() runs: the lookups work on that snapshot, so finish the tables
   (units, places) before defining; check() reports a table edited afterwards.
   Guide: docs/dev/ANIMATION_PACKS.md ("Regions"). Gate: tests/region-framework.test.mjs.
   ============================================================ */
/** Every registered region, in definition order (file-name order). */
const ANIM_REGIONS = [];
/** Scenes per region id: { regionId: { key: entry } }. They live here, not in the region, so a scene file may register
 * before its region's config has loaded ('...-scenes-N.js' sorts before '....js' in a file name). */
const _ANIM_REGION_SCENES = Object.create(null);
/** How often each scene key was registered, per region id, for the keys registered more than once: { regionId: { key: count } }. The last registration wins, so a duplicate silently hides the earlier scene: region.check() reports it. */
const _ANIM_REGION_DUPES = Object.create(null);
/** Ids the other pack families own: no region may take them (a region owns the packs named '<id>-*'). */
const _AR_RESERVED = ['uk', 'texas', 'world', 'core', 'seasons', 'sky', 'moments', 'rewards', 'mine'];
/** Words a unit may not be called: they are the framework's own kinds ('place' and 'city' name places in scene keys and item kinds, 'big' and 'small' the place kinds, 'signature' and 'element' what a unit draws). */
const _AR_RESERVED_WORDS = ['place', 'city', 'big', 'small', 'signature', 'element'];
/** The placeholder country of the scaffold (tools/anim-pack.mjs new): "XX" is the ISO user-assigned code, never a real country. */
const _AR_PLACEHOLDER_COUNTRY = 'XX';
const _arKm = (la1, lo1, la2, lo2) => {
  const r = Math.PI / 180, dl = (la2 - la1) * r, dg = (lo2 - lo1) * r;
  const a = Math.sin(dl / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dg / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};
const _arHasPos = (ctx) => !!ctx && ctx.lat != null && ctx.lon != null && isFinite(ctx.lat) && isFinite(ctx.lon);
const _arHas = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const _arSceneKey = /^[a-z]+:[^:\s]+$/;
function _arScenesOf(id) { return _ANIM_REGION_SCENES[id] || (_ANIM_REGION_SCENES[id] = {}); }
function _arSceneStore(regionId, e) {
  if (!e || typeof e !== 'object' || typeof e.key !== 'string' || !_arSceneKey.test(e.key)) throw new Error('region ' + regionId + ' scene: key "<unit word>:<CODE>" or "place:<id>"');
  const scenes = _arScenesOf(regionId);
  if (_arHas(scenes, e.key)) { const d = _ANIM_REGION_DUPES[regionId] || (_ANIM_REGION_DUPES[regionId] = {}); d[e.key] = (d[e.key] || 1) + 1; }
  scenes[e.key] = e;
}

/** The region with this id, or null. */
function animRegion(id) { return ANIM_REGIONS.find(r => r.id === id) || null; }
/** True when a pack id belongs to the region (the packs of a region are named '<id>-<group>'). */
function animRegionOwns(regionId, packId) { packId = String(packId || ''); return packId === regionId || packId.startsWith(regionId + '-'); }
/** Register a full-screen scene for a region: animRegionSceneAdd('asia', {key: 'country:JP', label, site, colour, mood, season, tags, svg}). Works before or after the region is defined. */
function animRegionSceneAdd(regionId, e) { _arSceneStore(String(regionId), e); }
/** Upgrades per region id (docs/dev/SCENE_ENGINE.md 16.2): { regionId: { key: up } }, and the keys upgraded more than once. */
const _ANIM_REGION_UPGRADES = Object.create(null);
const _ANIM_REGION_UPGRADE_DUPES = Object.create(null);
/**
 * Upgrade a hand-drawn region scene to a composed one, keeping its identity (16.2):
 * animRegionSceneUpgrade('asia', 'place:singapore', { state: 'draft' | 'live', archetype, landmarks: [...], scene: () => sceneFromArchetype(...) }).
 * Works before or after the region is defined. The scene thunk runs only when the item is shown, linted or sheeted.
 * draft: the app keeps the (retrofitted) legacy art and the item gains upgrade: {state, archetype, landmarks, scene} (the tools show it with --upgrades).
 * live: the item becomes composed (same id, fields, label, site, tags, when), with legacySvg = the old art; it is not retrofitted.
 */
function animRegionSceneUpgrade(regionId, key, up) {
  regionId = String(regionId);
  if (typeof key !== 'string' || !_arSceneKey.test(key)) throw new Error('region ' + regionId + ' upgrade: key "<unit word>:<CODE>" or "place:<id>"');
  if (!up || typeof up !== 'object' || (up.state !== 'draft' && up.state !== 'live')) throw new Error('region ' + regionId + ' upgrade ' + key + ': state is draft or live');
  if (typeof up.scene !== 'function' && !(up.scene && typeof up.scene === 'object')) throw new Error('region ' + regionId + ' upgrade ' + key + ': scene is a thunk () => data (or the data)');
  const ups = _ANIM_REGION_UPGRADES[regionId] || (_ANIM_REGION_UPGRADES[regionId] = {});
  if (_arHas(ups, key)) { const d = _ANIM_REGION_UPGRADE_DUPES[regionId] || (_ANIM_REGION_UPGRADE_DUPES[regionId] = {}); d[key] = (d[key] || 1) + 1; }
  ups[key] = up;
}
/**
 * The upgrade registered for (id, key) applied to a full item (16.2). LIVE: the item becomes composed (the same identity, its art
 * kept as legacySvg, never retrofitted; view.lat / view.lon default to sky). Otherwise retro(it) runs (the region's or the pack's
 * retrofit) and a DRAFT adds item.upgrade. Regions call it from finishFull; a pack that is not a region (Texas, 16.2 last bullet)
 * registers with animRegionSceneUpgrade(<its pack id>, key, up) and calls it where it builds its full items.
 */
function animSceneUpgradeFinish(id, key, it, sky, retro) {
  const up = (_ANIM_REGION_UPGRADES[id] || {})[key];
  if (up && up.state === 'live') {
    const legacySvg = it.svg, thunk = typeof up.scene === 'function' ? up.scene : () => up.scene;
    // view.lat / view.lon default to the scene's own position
    const scene = () => { const d = thunk(); if (d && sky) { d.view = d.view || {}; if (!Number.isFinite(d.view.lat)) d.view.lat = sky.lat; if (!Number.isFinite(d.view.lon)) d.view.lon = sky.lon; } return d; };
    const out = Object.assign(it, { composed: true, rich: true, full: true, scene, legacySvg, reduced: 'static',
      upgrade: { state: 'live', archetype: up.archetype || null, landmarks: (up.landmarks || []).slice() } });
    delete out.retro;
    out.svg = (o) => sceneSvg(out, o);
    return out;
  }
  it = retro(it);
  if (up) it.upgrade = { state: 'draft', archetype: up.archetype || null, landmarks: (up.landmarks || []).slice(), scene: up.scene };
  return it;
}
/**
 * Where in every region the user is, for the opening sequence: one entry per region that matches, NEAREST first
 * (km = the distance to that region's nearest row, 0 for a travel match; ties in definition order), each
 * {region, over, km, id, name, kind, <keys.unit>, <keys.unitName>} (id '' = only the unit is known).
 * A region whose nearest row is a unit with art elsewhere (elsewhere) claims the position without matching: the
 * list stops there, so a farther region cannot take it.
 */
function animRegionsWhere(ctx) {
  const claims = [];
  ANIM_REGIONS.forEach((r, order) => { const m = r.locate(ctx); if (m) claims.push({ r, order, m }); });
  claims.sort((a, b) => a.m.km - b.m.km || a.order - b.order);
  const out = [];
  for (const c of claims) {
    if (!c.m.where) break;
    out.push(Object.assign({ region: c.r.id, over: c.r.over, km: c.m.km }, c.m.where));
  }
  return out;
}
/** Where in any region the user is: the nearest match of animRegionsWhere(ctx) (ties: the region defined first), or null. */
function animRegionWhere(ctx) { return animRegionsWhere(ctx)[0] || null; }

/**
 * Define a region from its config (see the header). Returns the region object and registers it in ANIM_REGIONS.
 * Throws on a config that cannot work (no id, duplicate id, no tables); table mistakes are listed by region.check().
 */
function animRegionDefine(cfg) {
  const bad = (m) => { throw new Error('animRegionDefine' + (cfg && cfg.id ? ' ' + cfg.id : '') + ': ' + m); };
  if (!cfg || typeof cfg !== 'object') bad('a config object is needed');
  const id = cfg.id;
  if (typeof id !== 'string' || !/^[a-z][a-z0-9]*$/.test(id)) bad('id: lower-case letters and digits');
  if (_AR_RESERVED.includes(id)) bad('id ' + id + ' belongs to another pack family');
  if (ANIM_REGIONS.some(r => r.id === id)) bad('already defined');
  const unitWord = cfg.unitWord || 'unit';
  if (!/^[a-z]+$/.test(unitWord) || _AR_RESERVED_WORDS.includes(unitWord)) bad('unitWord: one lower-case word ("state", "country"), not one of ' + _AR_RESERVED_WORDS.join(', ') + ' (the framework\'s own kinds)');
  const units = cfg.units, places = cfg.places;
  if (!units || typeof units !== 'object' || Array.isArray(units)) bad('units: { CODE: [name, group] }');
  if (!Array.isArray(places)) bad('places: [[id, name, unit, lat, lon, kind], ...]');
  const unitKm = cfg.unitKm;
  if (!(typeof unitKm === 'number' && unitKm > 0)) bad('unitKm: the distance (km) beyond which a position is in no unit');
  const placeKm = Object.assign({ big: 50, small: 30 }, cfg.placeKm);
  if (cfg.complete != null && typeof cfg.complete !== 'boolean') bad('complete: true or false (a region still being drawn is false)');
  const complete = cfg.complete !== false;   // a config that does not say is a finished region: the US and Asia keep every hard gate
  const cap = unitWord[0].toUpperCase() + unitWord.slice(1);
  const F = Object.assign({ kind: id + 'Kind', unit: id + cap, place: id + 'Place', size: id + 'Size', signature: id + 'Signature' }, cfg.fields);
  const T = Object.assign({ root: id, unit: id + '-' + unitWord, city: id + '-city' }, cfg.tags);
  const P = Object.assign({ unit: 1, city: 1.2 }, cfg.priority);
  const K = Object.assign({ unit: 'unit', unitName: 'unitName' }, cfg.keys);
  if (K.unit === K.unitName || [K.unit, K.unitName].some(k => ['id', 'name', 'kind', 'region', 'over', 'km'].includes(k))) bad('keys: unit and unitName must be two names other than id, name, kind, region, over, km');
  const placeKinds = Array.isArray(cfg.placeKinds) ? cfg.placeKinds : ['big', 'small'];
  // the retrofit (7.3): {} (default) = on with SCENE_RETRO_DEFAULTS, an object of overrides, or false
  const retrofit = cfg.retrofit === false ? false : Object.assign({}, cfg.retrofit || {});
  // selection (9.4): { rule: 'dense', params, kinds: ['station', 'area'] }; without it the region behaves exactly as before
  const select = cfg.select && typeof cfg.select === 'object' ? Object.assign({ rule: 'nearest', params: {}, kinds: [] }, cfg.select) : null;
  const rowKinds = ['', 'big', 'small'].concat(select && Array.isArray(select.kinds) ? select.kinds : []);
  const pseudo = Object.assign({}, cfg.pseudo);
  const elsewhere = Object.freeze(Array.isArray(cfg.elsewhere) ? cfg.elsewhere.slice() : []);
  const worldTravel = Object.freeze(Array.isArray(cfg.worldTravel) ? cfg.worldTravel.slice() : []);
  const worldSet = new Set(worldTravel);
  const countryOf = typeof cfg.country === 'function' ? cfg.country : typeof cfg.country === 'string' ? () => cfg.country : (u) => u;
  // The travel tables' city id ('seattle-us', 'tokyo-jp'): the row id and the lower-case country code, the country read as the items read it.
  const travelIdHook = typeof cfg.travelId === 'function' ? cfg.travelId : (p) => p[0] + '-' + countryOf(p[2]).toLowerCase();
  /** The travel city id of a row, or '' when the hook cannot make one (a malformed row: check() reports it, the lookups skip it). */
  const travelIdOf = (p) => { try { const t = travelIdHook(p); return typeof t === 'string' ? t : ''; } catch (e) { return ''; } };
  const extraOf = typeof cfg.extra === 'function' ? cfg.extra : () => null;
  const itemFields = (u) => { const c = countryOf(u); return Object.assign({ region: [c], country: c }, extraOf(u)); };
  const groups = [...new Set(Object.values(units).map(u => u && u[1]))];
  const scenes = _arScenesOf(id);

  // The tables are read ONCE, here: the lookups work on this snapshot of the rows (check() reports a table edited afterwards).
  const rows = places.filter(p => Array.isArray(p) && p.length >= 6);   // a malformed row is skipped here and reported by check()
  const rowsAtDefine = places.slice();
  const rowById = new Map(), travel = new Map();
  for (const p of rows) {
    if (!rowById.has(p[0])) rowById.set(p[0], p);
    const t = travelIdOf(p);
    if (t && !travel.has(t)) travel.set(t, p);
  }
  const unitRow = (u) => _arHas(units, u) ? units[u] : null;
  /** The place row a travel city id names, or null (also null for the ids the world pack draws). */
  const travelRow = (city) => worldSet.has(String(city)) ? null : travel.get(String(city)) || null;
  const obj = (p) => p ? { id: p[0], name: p[1], [K.unit]: p[2], kind: p[5] } : null;
  /** A unit (or a pseudo unit) belongs to a group; a pseudo unit without a group belongs to every one. */
  const inGroup = (u, group) => unitRow(u) ? units[u][1] === group : _arHas(pseudo, u) ? !pseudo[u].group || pseudo[u].group === group : false;

  /** The art place (a big or small place) for a ctx, {id, name, <keys.unit>, kind} or null. Travel wins. */
  function place(ctx) {
    if (!ctx) return null;
    if (ctx.city) { const p = travelRow(ctx.city); return p && p[5] ? obj(p) : null; }
    if (!_arHasPos(ctx)) return null;
    let best = null, bd = Infinity;
    for (const p of rows) {
      if (!p[5]) continue;
      const d = _arKm(ctx.lat, ctx.lon, p[3], p[4]);
      if (d <= placeKm[p[5]] && d < bd) { bd = d; best = p; }
    }
    return obj(best);
  }
  const NO_UNIT = { u: '', km: Infinity, row: null };
  /** The nearest row: {u: its unit code, km: the distance to it, row}, NO_UNIT when none is in reach. A travel match is km 0. */
  function nearest(ctx) {
    if (!ctx) return NO_UNIT;
    if (ctx.city) { const p = travelRow(ctx.city); return p ? { u: p[2], km: 0, row: p } : NO_UNIT; }
    if (!_arHasPos(ctx)) return NO_UNIT;
    let best = '', bd = unitKm, bp = null;
    for (const p of rows) { const d = _arKm(ctx.lat, ctx.lon, p[3], p[4]); if (d < bd) { bd = d; best = p[2]; bp = p; } }
    return best ? { u: best, km: bd, row: bp } : NO_UNIT;
  }
  /** The unit code for a ctx ('' = not in this region, or travelling somewhere that is not one of its places). Nearest row wins. */
  function unitOf(ctx) { return nearest(ctx).u; }
  /** The nearest row within unitKm of a ctx: {id, unit, km} (a travel match is km 0), or null. What check() names when two regions overlap. */
  function nearestRow(ctx) { const n = nearest(ctx); return n.u ? { id: n.row[0], unit: n.u, km: n.km } : null; }
  /**
   * The match the opening sequence works with: {km, where} or null (not in this region). km is the distance to the nearest row (0 for a
   * travel match), what animRegionsWhere() ranks the regions by. where is {id, name, <keys.unit>, <keys.unitName>, kind}: a place wins,
   * else the unit; null for a unit with art elsewhere (the position is claimed, nothing is opened).
   */
  function locate(ctx) {
    const { u, km } = nearest(ctx);
    if (!u) return null;
    if (_arHas(pseudo, u)) { const s = pseudo[u]; return { km, where: { id: s.id, name: s.name, [K.unit]: u, [K.unitName]: s.name, kind: s.kind } }; }
    if (!unitRow(u)) return null;
    if (elsewhere.includes(u)) return { km, where: null };
    const p = place(ctx), nm = units[u][0];
    return { km, where: p && p[K.unit] === u ? Object.assign({ [K.unitName]: nm }, p) : { id: '', name: nm, [K.unit]: u, [K.unitName]: nm, kind: '' } };
  }
  /** For the opening sequence: where in the region, {id, name, <keys.unit>, <keys.unitName>, kind} or null. A place wins, else the unit. */
  function where(ctx) { const m = locate(ctx); return m ? m.where : null; }
  /** The scene registered for a unit or a place, or null. A unit scene's key is '<unitWord>:<CODE>' ('unit:<CODE>' also works). */
  const sceneFor = (kind, ref) => (kind === 'place' ? scenes['place:' + ref] : scenes[unitWord + ':' + ref] || scenes['unit:' + ref]) || null;
  function sceneAdd(e) { _arSceneStore(id, e); }
  /** The scene's own position (liveSky) for a scene key: a place's row; a unit's first big row, else the mean of its rows. */
  function liveSkyOf(key) {
    const [kind, ref] = String(key).split(':');
    if (kind === 'place') { const p = rowById.get(ref); return p ? { lat: p[3], lon: p[4] } : null; }
    const mine = rows.filter(p => p[2] === ref);
    if (!mine.length) return null;
    const big = mine.find(p => p[5] === 'big');
    if (big) return { lat: big[3], lon: big[4] };
    return { lat: Math.round(mine.reduce((n, p) => n + p[3], 0) / mine.length * 1e4) / 1e4, lon: Math.round(mine.reduce((n, p) => n + p[4], 0) / mine.length * 1e4) / 1e4 };
  }
  const upgradesOf = () => _ANIM_REGION_UPGRADES[id] || {};
  /** The upgrades of this region for the tools: [{ key, state, archetype, landmarks }]. */
  function upgrades() { return Object.keys(upgradesOf()).sort().map(key => { const u = upgradesOf()[key]; return { key, state: u.state, archetype: u.archetype || null, landmarks: (u.landmarks || []).slice() }; }); }
  /**
   * A full item made from a scene entry gets the live sky, then either its LIVE upgrade (composed, same identity) or the
   * retrofit overlay (7.3, 16.2). A draft upgrade only adds item.upgrade.
   */
  function finishFull(it, key) {
    if (!it || !it.full || typeof it.svg !== 'function') return it;
    const sky = liveSkyOf(key);
    if (sky && !it.liveSky) it.liveSky = sky;
    return animSceneUpgradeFinish(id, key, it, sky, (x) => {
      const entryRetro = x.retro;
      if (typeof sceneRetrofit === 'function' && retrofit !== false && entryRetro !== false) return sceneRetrofit(x, Object.assign({}, retrofit, entryRetro || {}));
      delete x.retro;
      return x;
    });
  }
  const _selCache = new WeakMap();
  /**
   * Which place plays, by the region's selection rule (9.4): a Result {kind, id, ids?, km, reason} or null. Cached per (ctx, minute).
   * The input: ctx.fix / ctx.track / ctx.seen when the page supplies them (in memory only), else a coarse fix from ctx.lat / ctx.lon (at 0: never an arrival).
   */
  function selectFor(ctx) {
    if (!select || typeof sceneSelect !== 'function' || !ctx) return null;
    const now = Number.isFinite(ctx.now) ? ctx.now : (typeof Clock !== 'undefined' && Clock.now ? Clock.now() : Date.now()); // clock-ok: pure fallback
    const minute = Math.floor(now / 60000);
    const c = _selCache.get(ctx);
    if (c && c.minute === minute) return c.res;
    const kinds = new Set(select.kinds || []);
    const placesIn = rows.filter(p => p[5]).map(p => ({ id: p[0], name: p[1], kind: kinds.has(p[5]) ? p[5] : 'station', lat: p[3], lon: p[4], unit: p[2], lines: [] }));
    const fix = ctx.fix && Number.isFinite(ctx.fix.lat) ? ctx.fix : _arHasPos(ctx) ? { lat: +ctx.lat, lon: +ctx.lon, acc: 1000, at: 0 } : null;
    if (!fix || !nearest({ lat: fix.lat, lon: fix.lon }).u) { _selCache.set(ctx, { minute, res: null }); return null; }   // not in this region at all
    const unitRows = Object.keys(units).map(u => { const s = liveSkyOf(unitWord + ':' + u); return s ? { id: u, lat: s.lat, lon: s.lon } : null; }).filter(Boolean);
    const slot = Math.floor((now % 86400000) / (60000 * ((select.params && select.params.rotateMin) || 60)));
    const res = sceneSelect(select.rule, { now, places: placesIn, units: unitRows, fix, track: Array.isArray(ctx.track) ? ctx.track : [], seen: ctx.seen || {}, params: select.params || {}, seed: Math.floor(now / 86400000) + ':' + slot });
    _selCache.set(ctx, { minute, res });
    return res;
  }

  /**
   * A builder for a pack file of one group: const B = REGION.builder('east');
   *   B.unit('JP', 'signature' | 'element', {id, label, colour, svg ...})   a signature is upgraded to the full-screen scene
   *                                   registered for the unit, if any; an element is the unit's small symbol
   *   B.element('JP', {...})          B.unit('JP', 'element', {...})
   *   B.place('kyoto', {...})         a place's item: big = opening (upgraded to its scene when there is one), small = symbol
   *   B.scenes()                      every registered scene of this group becomes its full-screen opening item
   * Then animRegisterPack(B.pack({id: '<region id>-<group>', name, description})): B.pack throws on any other id. Ids, labels, tags,
   * priorities and the when() rule are filled in; an item id used twice throws at the call.
   */
  function builder(group) {
    if (!groups.includes(group)) throw new Error(id + ' pack: no group "' + group + '" (groups: ' + groups.join(', ') + ')');
    const items = [], ids = new Set();
    /** Every item goes through here: a second item with the same id would make the whole pack fail to register, silently, so it throws at the call site. */
    const push = (it, key) => {
      if (key) it = finishFull(it, key);
      if (ids.has(it.id)) throw new Error(id + ' pack ' + group + ': duplicate item id "' + it.id + '" (every item id is used once per pack; a scene registered for a unit or a place already makes "<unit>-signature" / "<place>-skyline" unless it has its own id)');
      ids.add(it.id); items.push(it);
    };
    const base = { mood: 'neutral', intensity: 'subtle', theme: 'any', season: 'any', reduced: 'static', priority: P.unit };
    const dense = !!select && select.rule !== 'nearest';
    const unitWhen = dense ? (u) => (day, ctx) => { const s = selectFor(ctx); return !!s && s.kind === 'borough' && s.id === u; } : (u) => (day, ctx) => unitOf(ctx) === u;
    const placeWhen = dense ? (pid) => (day, ctx) => { const s = selectFor(ctx); return !!s && s.id === pid; } : (pid) => (day, ctx) => { const q = place(ctx); return !!q && q.id === pid; };
    const upgrade = (o, sc) => sc ? Object.assign({}, o, sc, { id: o.id, full: true, tags: (o.tags || []).concat(sc.tags || []) }) : o;
    const unitTags = (nm, u, last) => [T.root, T.unit, nm.toLowerCase(), u.toLowerCase(), last];
    const cityTags = (p) => [T.root, T.city, p[1].toLowerCase(), p[2].toLowerCase(), p[5]];
    function unit(u, kind, o) {
      const nm = unitRow(u);
      if (!nm || nm[1] !== group) throw new Error(id + ' pack ' + group + ': ' + u + ' is not a ' + group + ' ' + unitWord);
      if (kind !== 'signature' && kind !== 'element') throw new Error(id + ' pack: kind ' + kind);
      if (!o || typeof o.id !== 'string') throw new Error(id + ' pack ' + group + ': ' + u + ' ' + kind + ' needs an id');
      const sig = kind === 'signature';
      const sc = sig ? sceneFor(unitWord, u) : null;
      o = upgrade(o, sc);
      push(Object.assign({}, base, itemFields(u), { slot: sig ? 'opening' : 'symbol', [F.kind]: unitWord, [F.unit]: u, [F.signature]: sig, when: unitWhen(u) },
        o, { id: u.toLowerCase() + '-' + o.id, label: o.label + ', ' + nm[0], tags: unitTags(nm[0], u, kind).concat(o.tags || []) }), sc ? sc.key : null);
    }
    function placeItem(pid, o) {
      const p = rowById.get(pid);
      if (!p || !p[5] || !placeKinds.includes(p[5])) throw new Error(id + ' pack: ' + pid + ' is not ' + (placeKinds.length === 1 ? 'a ' + placeKinds[0] + ' art place' : 'an art place'));
      if (!inGroup(p[2], group)) throw new Error(id + ' pack ' + group + ': ' + pid + ' belongs to another group');
      if (!o || typeof o.id !== 'string') throw new Error(id + ' pack ' + group + ': ' + pid + ' needs an id');
      const big = p[5] === 'big';
      const sc = big ? sceneFor('place', pid) : null;
      o = upgrade(o, sc);
      push(Object.assign({}, base, itemFields(p[2]), { slot: big ? 'opening' : 'symbol', [F.kind]: 'city', [F.unit]: p[2], [F.place]: pid, [F.size]: p[5], priority: P.city, when: placeWhen(pid) },
        o, { id: pid + '-' + o.id, label: o.label + ', ' + p[1], tags: cityTags(p).concat(o.tags || []) }), sc ? 'place:' + pid : null);
    }
    function scenesToItems() {
      for (const key of Object.keys(scenes).sort()) {
        const e = scenes[key];
        const [kind, ref] = key.split(':');
        if (kind === unitWord || kind === 'unit') {
          const nm = unitRow(ref);
          if (!nm || nm[1] !== group) continue;
          push(Object.assign({}, base, itemFields(ref), { slot: 'opening', full: true, [F.kind]: unitWord, [F.unit]: ref, [F.signature]: true, when: unitWhen(ref) },
            e, { key: undefined, id: ref.toLowerCase() + '-' + (e.id || 'signature'), label: e.label + ', ' + nm[0], tags: unitTags(nm[0], ref, 'signature').concat(e.tags || []) }), key);
        } else if (kind === 'place') {
          const p = rowById.get(ref);
          if (!p || p[5] !== 'big' || !inGroup(p[2], group)) continue;
          push(Object.assign({}, base, itemFields(p[2]), { slot: 'opening', full: true, [F.kind]: 'city', [F.unit]: p[2], [F.place]: ref, [F.size]: 'big', priority: P.city, when: placeWhen(ref) },
            e, { key: undefined, id: ref + '-' + (e.id || 'skyline'), label: e.label + ', ' + p[1], tags: cityTags(p).concat(e.tags || []) }), key);
        }
      }
    }
    return {
      items, region, group, unit, element(u, o) { unit(u, 'element', o); }, place: placeItem, scenes: scenesToItems,
      pack(m) {
        const want = id + '-' + group;   // a region owns the packs named '<id>-<group>': the opening's "Welcome to" looks the pick's pack up by it
        if (!m || m.id !== want) throw new Error(id + ' pack ' + group + ': the pack id must be "' + want + '" (animRegionOwns), not ' + JSON.stringify(m && m.id));
        return Object.assign({ version: '1.0.0', css: animSceneCss(), items }, m);
      },
    };
  }

  /** The scene keys registered more than once: [[key, count], ...]. */
  function sceneDuplicates() { return Object.entries(_ANIM_REGION_DUPES[id] || {}); }

  /** The travel city ids the world pack draws, read live from the registry (animPack is the registry's; it is only called when check() runs, after every file has loaded), or null when there is no world pack to ask. */
  function liveWorldCities() {
    try {
      if (typeof animPack !== 'function') return null;
      const w = animPack('world');
      return w && Array.isArray(w.items) ? [...new Set(w.items.map(i => i.city).filter(Boolean))] : null;
    } catch (e) { return null; }
  }
  /**
   * Rows of this region inside ANOTHER region's reach, and rows of another region inside this one's (the overlap rule: tests/region-framework.test.mjs
   * fails on either): [{other, otherName, row, unit, otherRow, otherUnit, lat, lon, km, reach, myReach, direction}]. direction: 'in' (my row, their reach),
   * 'out' (their row, my reach; row is theirs) or 'both' (the same two rows lie inside each other's reach: one entry, not two).
   */
  function overlaps() {
    const found = [], at = (p) => ({ lat: p[3], lon: p[4] });
    for (const o of ANIM_REGIONS) {
      if (o === region || !o.nearestRow) continue;
      const mine = [];
      for (const p of rows) {
        if (!_arHasPos(at(p))) continue;
        const n = o.nearestRow(at(p));
        if (n) mine.push({ other: o.id, otherName: o.name, row: p[0], unit: p[2], otherRow: n.id, otherUnit: n.unit, lat: p[3], lon: p[4], km: n.km, reach: o.unitKm, myReach: unitKm, direction: 'in' });
      }
      for (const q of o.places) {
        if (!Array.isArray(q) || q.length < 6 || !_arHasPos(at(q))) continue;
        const n = nearestRow(at(q));
        if (!n) continue;
        const twin = mine.find(v => v.row === n.id && v.otherRow === q[0]);   // my row n.id is inside their reach and their row q[0] inside mine: one overlap
        if (twin) twin.direction = 'both';
        else found.push({ other: o.id, otherName: o.name, row: q[0], unit: q[2], otherRow: n.id, otherUnit: n.unit, lat: q[3], lon: q[4], km: n.km, reach: unitKm, myReach: o.unitKm, direction: 'out' });
      }
      found.push(...mine);
    }
    return found;
  }
  /** The sentence check() prints for one overlap (actionable: what is wrong, and the ways out). */
  function overlapMessage(v) {
    const km = Math.round(v.km), pos = v.row + ' (' + v.unit + ', ' + v.lat + ', ' + v.lon + ')';
    if (v.direction === 'both') return 'overlap: ' + pos + ' and ' + v.other + '\'s row ' + v.otherRow + ' are ' + km + ' km apart, each inside the other\'s reach (' + v.other + ' ' + v.reach + ' km, this region ' + v.myReach + ' km), so both claim the positions between them (a BORDER CASE when one of them is a town just across a border: the nearer row wins there). Fix it one way: move or drop one of the two rows (the one on the wrong side of the border), or lower ' + v.other + '\'s unitKm or ' + id + '\'s (then run the tests of both regions), or, if the place belongs to ' + v.otherName + ', add it to ' + v.other + '\'s own tables instead of here';
    if (v.direction === 'in') return 'overlap: ' + pos + ' is ' + km + ' km from ' + v.other + '\'s row ' + v.otherRow + ', inside its reach of ' + v.reach + ' km, so ' + v.other + ' claims the positions beside this row (a BORDER CASE when it is a town just across a border: the neighbour wins there). Fix it one way: move or drop the row, or lower ' + v.other + '\'s unitKm (then run the tests of both regions), or, if the place belongs to ' + v.otherName + ', add it to ' + v.other + '\'s own tables instead of here';
    return 'overlap: ' + v.other + '\'s row ' + pos + ' is ' + km + ' km from this region\'s row ' + v.otherRow + ', inside its reach of ' + v.reach + ' km, so this region would claim the positions beside ' + v.other + '\'s row. Fix it one way: lower ' + id + '\'s unitKm (now ' + v.reach + '; then run the tests of both regions), or move or drop ' + v.otherRow + ', the row that reaches it';
  }

  /**
   * Table and scene mistakes, as a list of sentences ([] = sound). The tests call it for every region.
   * check({ worldCities: [...] }) also lists every travel city the world pack draws that a row of this region maps to
   * and worldTravel does not name (the region's city art would beat the world pack's landmark for a traveller there); without the option the
   * list is read live from the world pack when the registry has one (pass { worldCities: [] } to skip it).
   * Rows inside another region's reach, and other regions' rows inside this one's, are listed as 'overlap: ...' (see overlaps()).
   */
  function check(opts) {
    const out = [], seen = new Set(), travelSeen = new Map(), anchored = new Set();
    if (places.length !== rowsAtDefine.length || places.some((p, i) => p !== rowsAtDefine[i])) out.push('places: the table changed after animRegionDefine (' + rowsAtDefine.length + ' rows then, ' + places.length + ' now); the lookups use it as it was defined');
    for (const p of places) {
      if (!Array.isArray(p) || p.length < 6) { out.push('a place row needs [id, name, unit, lat, lon, kind]: ' + JSON.stringify(p)); continue; }
      const [pid, name, u, lat, lon, kind] = p;
      if (typeof pid !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pid)) out.push(pid + ': the id is lower-case letters, digits and dashes');
      if (seen.has(pid)) out.push(pid + ': duplicate id'); seen.add(pid);
      if (!name || typeof name !== 'string') out.push(pid + ': no name');
      if (!unitRow(u) && !_arHas(pseudo, u)) out.push(pid + ': ' + u + ' is not in units');
      if (!(typeof lat === 'number' && lat >= -90 && lat <= 90 && typeof lon === 'number' && lon >= -180 && lon <= 180)) out.push(pid + ': lat / lon out of range');
      if (!rowKinds.includes(kind)) out.push(pid + ': kind is ' + rowKinds.filter(Boolean).join(', ') + ' or ""');
      anchored.add(u);
      const t = travelIdOf(p);
      if (!t) out.push(pid + ': no travel id (the travelId hook threw or returned no string for this row)');
      else if (travelSeen.has(t)) out.push(pid + ': travel id ' + t + ' is also ' + travelSeen.get(t)); else travelSeen.set(t, pid);
    }
    for (const u of Object.keys(units)) {
      if (!Array.isArray(units[u]) || typeof units[u][0] !== 'string' || typeof units[u][1] !== 'string') out.push(u + ': a unit is [name, group]');
      if (!anchored.has(u)) out.push(u + ': no place row (every ' + unitWord + ' needs at least one anchor row, or no position is ever in it)');
    }
    for (const u of Object.keys(pseudo)) if (!pseudo[u] || !pseudo[u].id || !pseudo[u].name || !pseudo[u].kind) out.push(u + ': a pseudo unit is {id, name, kind}');
    for (const u of elsewhere) if (!unitRow(u)) out.push('elsewhere ' + u + ' is not in units');
    for (const t of worldTravel) if (!travel.has(t)) out.push('worldTravel ' + t + ': no place has that travel id');
    const worldCities = opts && Array.isArray(opts.worldCities) ? opts.worldCities : liveWorldCities() || [];
    for (const c of worldCities) if (travel.has(c) && !worldSet.has(c)) out.push('worldTravel: the world pack draws ' + c + ' and ' + travel.get(c)[0] + ' maps to it, but it is not listed (a traveller there would get this region\'s art, not the world pack\'s)');
    for (const v of overlaps()) out.push(overlapMessage(v));
    const dupes = sceneDuplicates();
    for (const [key, n] of dupes) out.push('DUPLICATE SCENE KEY ' + key + ' (registered ' + n + ' times; the last registration wins and hides the others: two scene files draw the same key, keep one)');
    // starter data: the scaffold's placeholder country 'XX' (a region whose units are not countries) makes every item's region ['XX'] and every travel id end in -xx, so travel matching can never work
    const xxIds = [...travel.keys()].filter(t => /-xx$/.test(t));
    const countryOr = (u) => { try { return countryOf(u); } catch (e) { return ''; } };
    if (Object.keys(units).some(u => countryOr(u) === _AR_PLACEHOLDER_COUNTRY) || xxIds.length) out.push('starter: the country is still the placeholder XX' + (xxIds.length ? ' (' + xxIds.length + ' of the travel ids end in -xx, for example ' + xxIds[0] + ')' : '') + ': set country: \'<ISO 3166-1 alpha-2 code>\' in the config (items carry it as their region, and a travel id is <place id>-<country code>)');
    for (const key of Object.keys(upgradesOf())) if (!_arHas(scenes, key)) out.push('upgrade ' + key + ': no scene entry has this key (an upgrade replaces a registered hand-drawn scene; register the scene or fix the key)');
    for (const [key, n] of Object.entries(_ANIM_REGION_UPGRADE_DUPES[id] || {})) out.push('DUPLICATE UPGRADE ' + key + ' (registered ' + n + ' times; keep one upgrade file per scene)');
    for (const key of Object.keys(scenes)) {
      if (!_arSceneKey.test(key)) { out.push(key + ': a scene key is "' + unitWord + ':<CODE>" or "place:<id>"'); continue; }
      const [kind, ref] = key.split(':');
      if (kind === 'place') { const p = rowById.get(ref); if (!p || p[5] !== 'big') out.push(key + ': a scene is for a big place'); }
      else if (kind === unitWord || kind === 'unit') { if (!unitRow(ref)) out.push(key + ': not a ' + unitWord); }
      else out.push(key + ': a scene key starts with "' + unitWord + ':", "unit:" or "place:"');
    }
    return out;
  }

  const region = { id, name: cfg.name || id, over: cfg.over || cfg.name || id, unitWord, units, places, groups, keys: K, fields: F, tags: T, priority: P, scenes, place, unitOf, nearestRow, where, locate, builder, sceneAdd, sceneDuplicates, check, overlaps, upgrades, select: selectFor, retrofit, liveSkyOf, travelRow, travelId: travelIdOf, countryOf: (u) => { try { return String(countryOf(u)); } catch (e) { return ''; } }, worldTravel, elsewhere, unitKm, placeKm: Object.freeze(Object.assign({}, placeKm)), complete, owns: (packId) => animRegionOwns(id, packId) };
  ANIM_REGIONS.push(region);
  return region;
}

/* ---------- the full-screen scene kit (1600 x 900 openings, sliced to fill any screen) ----------
   Same toolkit as the Texas scenes (71-anim-texas-scenes.js), shared by every region (the US, Asia and the ones
   added since; usSceneKit() / usSceneCss() in 71-anim-us.js are aliases). animSceneKit() returns the
   helpers (U fresh gradient ids, lin/linU/radU gradients, mv a moving group, ridge, canopy, cloud, streak, haze, rays,
   sun, stars, birds, shimmer, puffs, dots, lit, finish ...); animSceneCss() the motion classes (x-usdrift, x-uspar,
   x-usglide, x-usflap, x-usshim, x-uspuff, x-usmove, x-usbob, x-usglow, x-usrise, x-ussway, x-ussway2, x-usspin,
   x-usflag, x-usflicker, x-uslift, x-usfall) and the evening grade (.us-tint, .us-lit, .us-lamps, .us-star). */
function animSceneKit() {
    let _n = 0;
    const U = () => 'us' + (++_n).toString(36);                     // a gradient id, unique per render
    const R = (v) => Math.round(v);
    const rnd = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
    const stops = (a) => a.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
    const lin = (id, a) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops(a)}</linearGradient>`;
    const linU = (id, a, x1, y1, x2, y2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(a)}</linearGradient>`;
    const radU = (id, a, cx, cy, r) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(a)}</radialGradient>`;
    const st = (o) => Object.entries(o).map(([k, v]) => k === 'to' ? `transform-box:view-box;transform-origin:${v}` : `--${k}:${v}`).join(';');
    /** A moving group: x-<cls> with its own timing (--ad duration, --d delay, --dx/--dy travel, to: transform origin). */
    const mv = (cls, o, inner) => `<g class="x-${cls}"${o ? ` style="${st(o)}"` : ''}>${inner}</g>`;
    const full = (fill, y) => `<rect y="${y || 0}" width="1600" height="${900 - (y || 0)}" fill="${fill}"/>`;
    const star5 = (cx, cy, Ro, ri) => { const p = []; for (let i = 0; i < 10; i++) { const a = (-90 + 36 * i) * Math.PI / 180, q = i % 2 ? ri : Ro; p.push(`${R(cx + q * Math.cos(a))} ${R(cy + q * Math.sin(a))}`); } return 'M' + p.join('L') + 'z'; };
    /** A smooth ridge from x -160 to 1760 (room to drift), filled down to the foot. */
    const ridge = (fill, y, amp, n, seed, foot) => {
      const r = rnd(seed), p = [];
      for (let i = 0; i <= n; i++) p.push([-160 + i * (1920 / n), y - r() * amp]);
      let d = `M-160 ${foot || 900}V${R(p[0][1])}`;
      for (let i = 1; i <= n; i++) d += `Q${R(p[i - 1][0])} ${R(p[i - 1][1])} ${R((p[i - 1][0] + p[i][0]) / 2)} ${R((p[i - 1][1] + p[i][1]) / 2)}`;
      return `<path fill="${fill}" d="${d}L1760 ${R(p[n][1])}V${foot || 900}z"/>`;
    };
    /** A line of tree crowns of uneven size along y. */
    const canopy = (fill, y, amp, seed, x0, x1, foot) => {
      const r = rnd(seed); let x = x0 == null ? -160 : x0, d = `M${x} ${foot || 900}V${y}`;
      const end = x1 == null ? 1760 : x1;
      while (x < end) { const w = 26 + r() * 64, h = 8 + r() * amp, j = r() * 10 - 5; d += `c${R(w * 0.1)} ${-R(h * 1.4)} ${R(w * 0.9)} ${-R(h * 1.4)} ${R(w)} ${R(j)}`; x += w; }
      return `<path fill="${fill}" d="${d}V${foot || 900}H${x0 == null ? -160 : x0}z"/>`;
    };
    /** A flat-topped mesa: stepped, sheer sides. */
    const mesa = (x, y, w, h, fill, top, cap) => `<path fill="${fill}" d="M${x} ${y + h}V${y + h * 0.35}l${R(w * 0.04)} ${-R(h * 0.12)}h${R(w * 0.1)}l${R(w * 0.03)} ${-R(h * 0.23)}h${R(w * 0.66)}l${R(w * 0.03)} ${R(h * 0.2)}h${R(w * 0.1)}l${R(w * 0.04)} ${R(h * 0.15)}V${y + h}z"/>`
      + `<path fill="${top}" d="M${x + R(w * 0.14)} ${R(y + h * 0.23)}h${R(w * 0.72)}l${-R(w * 0.01)} ${R(h * 0.06)}h${-R(w * 0.7)}z"/>` + (cap || '');
    const cloud = (x, y, s, tone, op, dur, del, top) => {
      const g = U(), r = rnd(R(x * 7 + y)), shape = Math.abs(Math.round(x+y+(del||0)))%3; let puffsD = '';
      // Broad banks, tall cumulus and broken small puffs have different profiles.
      // The original light and drift supplied by each drawing remain authoritative.
      const n=shape===2?4:6, stretch=shape===0?1.4:shape===1?.78:1;
      for (let i = 0; i < n; i++) { const px=x+(-120+i*240/(n-1)+r()*20)*s*stretch, pr=(25+r()*43)*s*(shape===1&&i===2?1.85:1); puffsD+=`<ellipse cx="${R(px)}" cy="${R(y-pr*(shape===0?.3:.63))}" rx="${R(pr*(shape===0?1.6:1))}" ry="${R(pr*(shape===0?.58:1))}"/>`; }
      return `<defs>${linU(g, [[0, top || '#fff'], [0.55, top || '#fff'], [1, tone]], 0, R(y - 110 * s), 0, R(y + 24 * s))}</defs>`
        + mv('usdrift', { ad: (dur || 46) + 's', d: -(del || 0) + 's', dx: R(60 + s * 40) + 'px' }, `<g opacity="${op || 0.92}" fill="url(#${g})"><ellipse cx="${x}" cy="${y}" rx="${R((shape===0?230:shape===1?134:170)*s)}" ry="${R(19*s)}"/>${puffsD}</g>`);
    };
    const streak = (x, y, w, col, op, dur) => mv('usdrift', { ad: (dur || 60) + 's', dx: '90px' }, `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${R(w / 22) + 3}" fill="${col}" opacity="${op || 0.5}"/><ellipse cx="${R(x + w * 0.3)}" cy="${y + 10}" rx="${R(w * 0.6)}" ry="${R(w / 30) + 2}" fill="${col}" opacity="${(op || 0.5) * 0.7}"/>`);
    const haze = (y, h, col, op) => { const g = U(); return `<defs>${linU(g, [[0, col, 0], [0.5, col, op || 0.6], [1, col, 0]], 0, y, 0, y + h)}</defs><rect x="-200" y="${y}" width="2000" height="${h}" fill="url(#${g})"/>`; };
    const rays = (x, y, len, col, op) => { const g = U(); let d = ''; const r = rnd(R(x + y)); for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + r() * 0.3, b = a + 0.025 + r() * 0.07; d += `M${x} ${y}L${R(x + Math.cos(a) * len)} ${R(y + Math.sin(a) * len)}L${R(x + Math.cos(b) * len)} ${R(y + Math.sin(b) * len)}z`; }
      return `<defs>${radU(g, [[0, col, op || 0.4], [1, col, 0]], x, y, len)}</defs><g class="x-usspin" style="--ad:40s;transform-box:view-box;transform-origin:${x}px ${y}px"><path fill="url(#${g})" d="${d}"/></g>`; };
    const sun = (x, y, r, core, halo, rise) => { const g = U(); return `<defs>${radU(g, [[0, halo, 0.85], [0.35, halo, 0.35], [1, halo, 0]], x, y, r * 6)}</defs>`
      + mv(rise ? 'usrise' : 'usglow', { ad: rise ? '9s' : '6s' }, `<circle cx="${x}" cy="${y}" r="${r * 6}" fill="url(#${g})"/><circle cx="${x}" cy="${y}" r="${r}" fill="${core}"/>`); };
    const tint = () => `<rect class="us-tint" width="1600" height="900"/>`;
    /** Darkened edges and the evening grade (the dark theme, tod-dusk, tod-night). */
    const finish = (op) => { const g = U(); return `<defs><radialGradient id="${g}" cx=".5" cy=".46" r=".75">${stops([[0.55, '#0b0d22', 0], [1, '#0b0d22', op || 0.38]])}</radialGradient></defs><rect width="1600" height="900" fill="url(#${g})"/>` + tint(); };
    const stars = (seed, n, y1) => { const r = rnd(seed); let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${R(r() * 1600)}" cy="${R(r() * (y1 || 300))}" r="${(1 + r() * 1.6).toFixed(1)}"/>`; return `<g class="us-star" fill="#fff">${o}</g>`; };
    const birds = (seed, n, x, y, col, size, dx) => {
      const r = rnd(seed); let o = '';
      for (let i = 0; i < n; i++) {
        const s = (size || 1) * (0.7 + r() * 0.6), bx = R(x + r() * 260 - 130), by = R(y + r() * 120 - 60);
        const pose=(seed+i)%3, wing=pose===0?`M${bx-R(20*s)} ${by-R(5*s)}q${R(10*s)} ${-R(15*s)} ${R(20*s)} ${R(5*s)}q${R(10*s)} ${-R(20*s)} ${R(22*s)} ${-R(4*s)}`:pose===1?`M${bx-R(23*s)} ${by-R(8*s)}l${R(18*s)} ${R(9*s)}q${R(6*s)} ${R(4*s)} ${R(13*s)} 0l${R(17*s)} ${-R(12*s)}`:`M${bx-R(25*s)} ${by+R(2*s)}q${R(14*s)} ${-R(8*s)} ${R(25*s)} 0q${R(12*s)} ${-R(11*s)} ${R(26*s)} ${-R(3*s)}`;
        o += mv('usglide', { ad: R(16 + r() * 10) + 's', d: -R(r() * 14) + 's', dx: (dx || 520) + 'px', dy: R(-40 + r() * 60) + 'px' },
          mv('usflap', { ad: (0.5 + r() * 0.4).toFixed(2) + 's', d: -(r()).toFixed(2) + 's' },
            `<path fill="none" stroke="${col}" stroke-width="${(2.7*s).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" d="${wing}M${bx} ${by-2}l${R(2*s)} ${R(6*s)}"/>`));
      }
      return o;
    };
    const shimmer = (seed, n, x0, x1, y0, y1, col, w) => {
      const r = rnd(seed); let o = '';
      for (let i = 0; i < n; i++) {
        const y = y0 + r() * (y1 - y0), k = (y - y0) / Math.max(1, y1 - y0), len = R((w || 40) * (0.5 + k) * (0.6 + r() * 0.8));
        o += `<rect class="x-usshim" style="--ad:${(2 + r() * 2.6).toFixed(1)}s;--d:-${(r() * 3).toFixed(1)}s" x="${R(x0 + r() * (x1 - x0))}" y="${R(y)}" width="${len}" height="${R(2 + k * 3)}" rx="2" fill="${col}"/>`;
      }
      return o;
    };
    const puffs = (x, y, n, col, size, dx, dur, dy, sc) => {
      let o = '';
      for (let i = 0; i < n; i++) o += `<circle class="x-uspuff" style="--ad:${dur || 3.6}s;--d:-${((dur || 3.6) * i / n).toFixed(2)}s;--dx:${dx || -120}px${dy ? `;--dy:${dy}px` : ''}${sc ? `;--sc:${sc}` : ''}" cx="${x}" cy="${y}" r="${R((size || 30) * (0.8 + (i % 3) * 0.15))}" fill="${col}"/>`;
      return o;
    };
    /** Dots along a line (a string of lamps or a carpet of city lights): a round-capped dashed stroke. */
    const dots = (d, col, w, gap, cls, extra) => `<path class="${cls || ''}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="0 ${gap}" d="${d}"${extra || ''}/>`;
    const lit = (x, y, w, h) => `<rect class="us-lit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${R(Math.min(w, h) / 5)}"/>`;
  return { U, R, rnd, stops, lin, linU, radU, st, mv, full, star5, ridge, canopy, mesa, cloud, streak, haze, rays, sun, tint, finish, stars, birds, shimmer, puffs, dots, lit };
}
/** The css the full scenes need (every region pack adds it to its own, B.pack() does). */
function animSceneCss() {
  const A = '.anim-scene .x-';
  return [
    '.anim-scene.ap-full .us-tint { fill: #4a4f94; mix-blend-mode: multiply; opacity: 0; pointer-events: none; }',
    '.anim-scene.ap-full .us-lit { fill: #ffd27a; stroke: #ffd27a; opacity: 0; }',
    '.anim-scene.ap-full .us-lamps { opacity: 0; }',
    '.anim-scene.ap-full .us-star { opacity: 0; }',
    '[data-theme="dark"] .anim-scene.ap-full .us-tint, .anim-scene.ap-full.tod-dusk .us-tint { opacity: .6; }',
    '.anim-scene.ap-full.tod-night .us-tint { opacity: .85; }',
    '[data-theme="dark"] .anim-scene.ap-full :is(.us-lit, .us-lamps), .anim-scene.ap-full.tod-dusk :is(.us-lit, .us-lamps), .anim-scene.ap-full.tod-night :is(.us-lit, .us-lamps) { opacity: .92; }',
    '[data-theme="dark"] .anim-scene.ap-full .us-star, .anim-scene.ap-full.tod-night .us-star { opacity: .8; }',
    'html .anim-scene.ap-full:is(.tod-day, .tod-dawn) :is(.us-tint, .us-lit, .us-lamps, .us-star) { opacity: 0; }',
    A + 'usdrift { --an: ap-usdrift; --ad: 46s; }', A + 'uspar { --an: ap-usdrift; --ad: 30s; }', A + 'usglide { --an: ap-usglide; --ad: 18s; --ae: linear; }',
    A + 'usflap { --an: ap-usflap; --ad: .7s; }', A + 'usshim { --an: ap-usshim; --ad: 3s; }', A + 'uspuff { --an: ap-uspuff; --ad: 3.6s; --ae: cubic-bezier(.2, .6, .4, 1); }',
    A + 'usmove { --an: ap-usmove; --ad: 24s; --ae: linear; }', A + 'usbob { --an: ap-usbob; --ad: 3s; }', A + 'usglow { --an: ap-usglow; --ad: 6s; }',
    A + 'usrise { --an: ap-usrise; --ad: 9s; --ai: 1; --ae: cubic-bezier(.2, .7, .3, 1); }', A + 'ussway { --an: ap-ussway; --ad: 4s; }', A + 'ussway2 { --an: ap-ussway2; --ad: 6s; }',
    A + 'usspin { --an: ap-usspin; --ad: 40s; --ae: linear; }', A + 'usflag { --an: ap-usflag; --ad: 2s; }', A + 'usflicker { --an: ap-usflicker; --ad: .22s; }',
    A + 'uslift { --an: ap-uslift; --ad: 14s; --ai: 1; --ae: cubic-bezier(.5, 0, .7, .6); }', A + 'usfall { --an: ap-usfall; --ad: 10s; --ae: linear; }',
    '@keyframes ap-usdrift { 0%, 100% { transform: translateX(calc(var(--dx, 80px) * -1)); } 50% { transform: translateX(var(--dx, 80px)); } }',
    '@keyframes ap-usglide { 0% { transform: translate(calc(var(--dx, 500px) * -.5), 0); opacity: 0; } 10%, 85% { opacity: 1; } 100% { transform: translate(calc(var(--dx, 500px) * .5), var(--dy, -30px)); opacity: 0; } }',
    '@keyframes ap-usflap { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(-.35); } }',
    '@keyframes ap-usshim { 0%, 100% { opacity: .1; transform: translateX(-8px); } 50% { opacity: .9; transform: translateX(8px); } }',
    '@keyframes ap-uspuff { 0% { transform: translate(0, 0) scale(.35); opacity: 0; } 12% { opacity: .95; } 100% { transform: translate(var(--dx, -120px), var(--dy, -260px)) scale(var(--sc, 2.6)); opacity: 0; } }',
    '@keyframes ap-usmove { from { transform: translateX(calc(var(--dx, 400px) * -.5)); } to { transform: translateX(calc(var(--dx, 400px) * .5)); } }',
    '@keyframes ap-usbob { 0%, 100% { transform: translateY(calc(var(--dy, 5px) * -1)); } 50% { transform: translateY(var(--dy, 5px)); } }',
    '@keyframes ap-usglow { 0%, 100% { opacity: .82; transform: scale(.97); } 50% { opacity: 1; transform: scale(1.04); } }',
    '@keyframes ap-usrise { from { transform: translateY(90px); opacity: .6; } to { transform: none; opacity: 1; } }',
    '@keyframes ap-ussway { 0%, 100% { transform: skewX(-3deg); } 50% { transform: skewX(3deg); } }',
    '@keyframes ap-ussway2 { 0%, 100% { transform: rotate(-.8deg); } 50% { transform: rotate(.8deg); } }',
    '@keyframes ap-usspin { to { transform: rotate(1turn); } }',
    '@keyframes ap-usflag { 0%, 100% { transform: skewY(0) scaleX(1); } 50% { transform: skewY(-4deg) scaleX(.94); } }',
    '@keyframes ap-usflicker { 0%, 100% { transform: scaleY(1); opacity: .95; } 50% { transform: scaleY(1.18); opacity: .8; } }',
    '@keyframes ap-uslift { from { transform: translateY(0); } to { transform: translateY(-620px); } }',
    '@keyframes ap-usfall { 0% { transform: translate(0, -20px) rotate(0); opacity: 0; } 10%, 85% { opacity: 1; } 100% { transform: translate(var(--dx, 80px), 640px) rotate(380deg); opacity: 0; } }',
  ].join('\n');
}

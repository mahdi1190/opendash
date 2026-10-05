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
   The region: where(ctx), locate(ctx), place(ctx), unitOf(ctx), builder(group), sceneAdd(entry), scenes, check(),
   travelId(row), worldTravel, elsewhere, travelRow(city).

   Where the user is (ctx.city is the travel city while away, else ctx.lat / ctx.lon, the weather town):
     travel     ctx.city = travelId(row) of a place row; ids in worldTravel return no match
     home       a big or small place within its radius gives the PLACE; any row (anchors too) within unitKm
                gives the UNIT (nearest row wins, so right beside a border it can be the neighbour)
   Items carry <fields.kind>: unitWord | 'city', <fields.unit> (the unit code), for a city <fields.place> and
   <fields.size>, and for a unit <fields.signature>; priority 1 (unit) and 1.2 (city): a festival or the birthday
   (priority 2+) still wins the day.

   REGIONS MUST NOT OVERLAP. No row of a region may sit inside another region's reach (unitKm of its nearest
   row): tests/region-framework.test.mjs checks every region against every other. Two reaches can still overlap
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
/** Ids the other pack families own: no region may take them (a region owns the packs named '<id>-*'). */
const _AR_RESERVED = ['uk', 'texas', 'world', 'core', 'seasons', 'sky', 'moments', 'rewards', 'mine'];
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
  _arScenesOf(regionId)[e.key] = e;
}

/** The region with this id, or null. */
function animRegion(id) { return ANIM_REGIONS.find(r => r.id === id) || null; }
/** True when a pack id belongs to the region (the packs of a region are named '<id>-<group>'). */
function animRegionOwns(regionId, packId) { packId = String(packId || ''); return packId === regionId || packId.startsWith(regionId + '-'); }
/** Register a full-screen scene for a region: animRegionSceneAdd('asia', {key: 'country:JP', label, site, colour, mood, season, tags, svg}). Works before or after the region is defined. */
function animRegionSceneAdd(regionId, e) { _arSceneStore(String(regionId), e); }
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
  if (!/^[a-z]+$/.test(unitWord) || unitWord === 'place') bad('unitWord: one lower-case word ("state", "country"), not "place"');
  const units = cfg.units, places = cfg.places;
  if (!units || typeof units !== 'object' || Array.isArray(units)) bad('units: { CODE: [name, group] }');
  if (!Array.isArray(places)) bad('places: [[id, name, unit, lat, lon, kind], ...]');
  const unitKm = cfg.unitKm;
  if (!(typeof unitKm === 'number' && unitKm > 0)) bad('unitKm: the distance (km) beyond which a position is in no unit');
  const placeKm = Object.assign({ big: 50, small: 30 }, cfg.placeKm);
  const cap = unitWord[0].toUpperCase() + unitWord.slice(1);
  const F = Object.assign({ kind: id + 'Kind', unit: id + cap, place: id + 'Place', size: id + 'Size', signature: id + 'Signature' }, cfg.fields);
  const T = Object.assign({ root: id, unit: id + '-' + unitWord, city: id + '-city' }, cfg.tags);
  const P = Object.assign({ unit: 1, city: 1.2 }, cfg.priority);
  const K = Object.assign({ unit: 'unit', unitName: 'unitName' }, cfg.keys);
  if (K.unit === K.unitName || [K.unit, K.unitName].some(k => ['id', 'name', 'kind', 'region', 'over', 'km'].includes(k))) bad('keys: unit and unitName must be two names other than id, name, kind, region, over, km');
  const placeKinds = Array.isArray(cfg.placeKinds) ? cfg.placeKinds : ['big', 'small'];
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
  const NO_UNIT = { u: '', km: Infinity };
  /** The nearest row: {u: its unit code, km: the distance to it}, NO_UNIT when none is in reach. A travel match is km 0. */
  function nearest(ctx) {
    if (!ctx) return NO_UNIT;
    if (ctx.city) { const p = travelRow(ctx.city); return p ? { u: p[2], km: 0 } : NO_UNIT; }
    if (!_arHasPos(ctx)) return NO_UNIT;
    let best = '', bd = unitKm;
    for (const p of rows) { const d = _arKm(ctx.lat, ctx.lon, p[3], p[4]); if (d < bd) { bd = d; best = p[2]; } }
    return best ? { u: best, km: bd } : NO_UNIT;
  }
  /** The unit code for a ctx ('' = not in this region, or travelling somewhere that is not one of its places). Nearest row wins. */
  function unitOf(ctx) { return nearest(ctx).u; }
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
    const push = (it) => {
      if (ids.has(it.id)) throw new Error(id + ' pack ' + group + ': duplicate item id "' + it.id + '" (every item id is used once per pack; a scene registered for a unit or a place already makes "<unit>-signature" / "<place>-skyline" unless it has its own id)');
      ids.add(it.id); items.push(it);
    };
    const base = { mood: 'neutral', intensity: 'subtle', theme: 'any', season: 'any', reduced: 'static', priority: P.unit };
    const unitWhen = (u) => (day, ctx) => unitOf(ctx) === u;
    const placeWhen = (pid) => (day, ctx) => { const q = place(ctx); return !!q && q.id === pid; };
    const upgrade = (o, sc) => sc ? Object.assign({}, o, sc, { id: o.id, full: true, tags: (o.tags || []).concat(sc.tags || []) }) : o;
    const unitTags = (nm, u, last) => [T.root, T.unit, nm.toLowerCase(), u.toLowerCase(), last];
    const cityTags = (p) => [T.root, T.city, p[1].toLowerCase(), p[2].toLowerCase(), p[5]];
    function unit(u, kind, o) {
      const nm = unitRow(u);
      if (!nm || nm[1] !== group) throw new Error(id + ' pack ' + group + ': ' + u + ' is not a ' + group + ' ' + unitWord);
      if (kind !== 'signature' && kind !== 'element') throw new Error(id + ' pack: kind ' + kind);
      if (!o || typeof o.id !== 'string') throw new Error(id + ' pack ' + group + ': ' + u + ' ' + kind + ' needs an id');
      const sig = kind === 'signature';
      o = upgrade(o, sig ? sceneFor(unitWord, u) : null);
      push(Object.assign({}, base, itemFields(u), { slot: sig ? 'opening' : 'symbol', [F.kind]: unitWord, [F.unit]: u, [F.signature]: sig, when: unitWhen(u) },
        o, { id: u.toLowerCase() + '-' + o.id, label: o.label + ', ' + nm[0], tags: unitTags(nm[0], u, kind).concat(o.tags || []) }));
    }
    function placeItem(pid, o) {
      const p = rowById.get(pid);
      if (!p || !p[5] || !placeKinds.includes(p[5])) throw new Error(id + ' pack: ' + pid + ' is not ' + (placeKinds.length === 1 ? 'a ' + placeKinds[0] + ' art place' : 'an art place'));
      if (!inGroup(p[2], group)) throw new Error(id + ' pack ' + group + ': ' + pid + ' belongs to another group');
      if (!o || typeof o.id !== 'string') throw new Error(id + ' pack ' + group + ': ' + pid + ' needs an id');
      const big = p[5] === 'big';
      o = upgrade(o, big ? sceneFor('place', pid) : null);
      push(Object.assign({}, base, itemFields(p[2]), { slot: big ? 'opening' : 'symbol', [F.kind]: 'city', [F.unit]: p[2], [F.place]: pid, [F.size]: p[5], priority: P.city, when: placeWhen(pid) },
        o, { id: pid + '-' + o.id, label: o.label + ', ' + p[1], tags: cityTags(p).concat(o.tags || []) }));
    }
    function scenesToItems() {
      for (const key of Object.keys(scenes).sort()) {
        const e = scenes[key];
        const [kind, ref] = key.split(':');
        if (kind === unitWord || kind === 'unit') {
          const nm = unitRow(ref);
          if (!nm || nm[1] !== group) continue;
          push(Object.assign({}, base, itemFields(ref), { slot: 'opening', full: true, [F.kind]: unitWord, [F.unit]: ref, [F.signature]: true, when: unitWhen(ref) },
            e, { key: undefined, id: ref.toLowerCase() + '-' + (e.id || 'signature'), label: e.label + ', ' + nm[0], tags: unitTags(nm[0], ref, 'signature').concat(e.tags || []) }));
        } else if (kind === 'place') {
          const p = rowById.get(ref);
          if (!p || p[5] !== 'big' || !inGroup(p[2], group)) continue;
          push(Object.assign({}, base, itemFields(p[2]), { slot: 'opening', full: true, [F.kind]: 'city', [F.unit]: p[2], [F.place]: ref, [F.size]: 'big', priority: P.city, when: placeWhen(ref) },
            e, { key: undefined, id: ref + '-' + (e.id || 'skyline'), label: e.label + ', ' + p[1], tags: cityTags(p).concat(e.tags || []) }));
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

  /**
   * Table and scene mistakes, as a list of sentences ([] = sound). The tests call it for every region.
   * check({ worldCities: [...] }) also lists every travel city the world pack draws that a row of this region maps to
   * and worldTravel does not name (the region's city art would beat the world pack's landmark for a traveller there).
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
      if (!['', 'big', 'small'].includes(kind)) out.push(pid + ': kind is big, small or ""');
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
    for (const c of (opts && Array.isArray(opts.worldCities) ? opts.worldCities : [])) if (travel.has(c) && !worldSet.has(c)) out.push('worldTravel: the world pack draws ' + c + ' and ' + travel.get(c)[0] + ' maps to it, but it is not listed (a traveller there would get this region\'s art, not the world pack\'s)');
    for (const key of Object.keys(scenes)) {
      if (!_arSceneKey.test(key)) { out.push(key + ': a scene key is "' + unitWord + ':<CODE>" or "place:<id>"'); continue; }
      const [kind, ref] = key.split(':');
      if (kind === 'place') { const p = rowById.get(ref); if (!p || p[5] !== 'big') out.push(key + ': a scene is for a big place'); }
      else if (kind === unitWord || kind === 'unit') { if (!unitRow(ref)) out.push(key + ': not a ' + unitWord); }
      else out.push(key + ': a scene key starts with "' + unitWord + ':", "unit:" or "place:"');
    }
    return out;
  }

  const region = { id, name: cfg.name || id, over: cfg.over || cfg.name || id, unitWord, units, places, groups, keys: K, fields: F, tags: T, priority: P, scenes, place, unitOf, where, locate, builder, sceneAdd, check, travelRow, travelId: travelIdOf, worldTravel, elsewhere, owns: (packId) => animRegionOwns(id, packId) };
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
      const g = U(), r = rnd(R(x * 7 + y)); let puffsD = '';
      for (let i = 0; i < 6; i++) { const px = x - 120 * s + i * 48 * s + r() * 20 * s, pr = (34 + r() * 40) * s * (i === 2 || i === 3 ? 1.35 : 1); puffsD += `<circle cx="${R(px)}" cy="${R(y - pr * 0.55)}" r="${R(pr)}"/>`; }
      return `<defs>${linU(g, [[0, top || '#fff'], [0.55, top || '#fff'], [1, tone]], 0, R(y - 110 * s), 0, R(y + 24 * s))}</defs>`
        + mv('usdrift', { ad: (dur || 46) + 's', d: -(del || 0) + 's', dx: R(60 + s * 40) + 'px' }, `<g opacity="${op || 0.92}" fill="url(#${g})"><ellipse cx="${x}" cy="${y}" rx="${R(170 * s)}" ry="${R(26 * s)}"/>${puffsD}</g>`);
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
        o += mv('usglide', { ad: R(16 + r() * 10) + 's', d: -R(r() * 14) + 's', dx: (dx || 520) + 'px', dy: R(-40 + r() * 60) + 'px' },
          mv('usflap', { ad: (0.5 + r() * 0.4).toFixed(2) + 's', d: -(r()).toFixed(2) + 's' },
            `<path fill="none" stroke="${col}" stroke-width="${(3.2 * s).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" d="M${bx - R(18 * s)} ${by}q${R(9 * s)} ${-R(10 * s)} ${R(18 * s)} 0q${R(9 * s)} ${-R(10 * s)} ${R(18 * s)} 0"/>`));
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

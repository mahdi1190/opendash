/* ============================================================
   WORLD ENGINE (scene format v3), module A: the core (docs/dev/WORLD_ENGINE.md 1, 5, 8.1). PURE classic script: no DOM,
   nothing runs at load except constants, so Node tests evaluate it exactly as the page does (tools/lib/world/load.mjs).

   A scene describes a WORLD in metres, never a picture. This file owns:
     worldObjectInfo(id)            -> Desc | null: the world descriptor of a library object (true size, footprint, solidity,
                                       legal attachments, sink, views, deck, seasonal). No descriptor: the object cannot be placed.
     worldValidate(spec, o)         -> { ok, errors: [{ path, rule, msg, fix }] }: closed keys at every level, rule ids
                                       (WORLD_RULES). o.views: the other views of the same place (the `templated` rule).
     worldTemplated(specs)          -> errors: the cross-view layout uniqueness rule on its own.
     worldBuild(spec, { season })   -> World { cam, surfaces, entities, life, backdrop, seed, problems }: every derived value
                                       (y, foot, height, solidity, deck, waterline, lights) computed here, never authored.
     worldSurfaceAt(world, x, z)    -> the surface under a ground point (decks first, later surfaces win, solids cut water)
     worldFrontZ(foot, x)           -> the nearest z of a footprint polygon at column x (Infinity outside its x span; the
                                       polygon's minimum z when x is null)
     worldAdd(pack, meta, spec)     -> registers a VALID spec through sceneAdd with data { v: 3, spec }; an invalid one is not
                                       registered (worldAddProblems() lists why)
     worldPopulationDefine(name, p) -> extends WORLD_POPULATIONS (life module C adds its own population names)
   ============================================================ */
const WORLD_RULES = Object.freeze(['badVersion', 'badType', 'badValue', 'unknownKey', 'screenOrLookField', 'seasonPinned', 'missingField', 'dupId',
  'unknownSize', 'unknownVariant', 'badAttach', 'overlap', 'blocksPath', 'badSurface', 'unknownSurface', 'unknownWho', 'unreachable',
  'emptyBackground', 'unknownBackdrop', 'landmarkSrc', 'templated']);
/** Keys that describe a picture or a look, never a world: refused anywhere in a spec. */
const WORLD_LOOK_KEYS = Object.freeze(['X', 'Y', 'px', 's', 'scale', 'layer', 'flip', 'tint', 'shadow', 'reflect', 'light', 'grade', 'mirror', 'ripple',
  'glint', 'clarity', 'colour', 'color', 'exposure', 'ambient', 'k', 'z-index', 'zIndex', 'band', 'pixel']);
const WORLD_SURFACE_KINDS = Object.freeze({
  path: 'walk', pavement: 'walk', towpath: 'walk', plaza: 'walk', boardwalk: 'walk', 'bridge-deck': 'walk', deck: 'walk',
  grass: 'graze', heath: 'graze', field: 'graze', sand: 'graze',
  road: 'drive', crossing: 'walk', water: 'swim', rail: 'rail', tram: 'rail', reeds: 'wade', bed: 'wade', hedge: 'solid', weir: 'solid',
});
const WORLD_WATER_KINDS = Object.freeze(['pond', 'lake', 'canal', 'river', 'sea', 'harbour', 'puddle']);
const WORLD_BACKDROPS = Object.freeze(['heath', 'woodland', 'downs', 'farmland', 'town-low', 'city-victorian', 'city-sheffield-hills', 'city-manchester-towers', 'canal-wooded', 'coast']);
const WORLD_EDGES = Object.freeze(['N', 'S', 'E', 'W']);
/** Which surface kinds make a nav layer exist (3.1). */
const WORLD_LAYER_KINDS = Object.freeze({
  walk: ['path', 'pavement', 'towpath', 'plaza', 'boardwalk', 'bridge-deck', 'deck', 'crossing', 'grass', 'heath', 'field', 'sand'],
  graze: ['grass', 'heath', 'field', 'sand'], swim: ['water'], wade: ['water', 'reeds', 'bed'], drive: ['road'], rail: ['rail', 'tram'], air: null,
});
/** Life populations (5.1 `who`): name -> { layer, obj }. Module C extends this with worldPopulationDefine. An object id also works as `who`. */
const WORLD_POPULATIONS = {
  walkers: { layer: 'walk', obj: 'person.walker' }, visit: { layer: 'walk', obj: 'person.walker' }, crowd: { layer: 'walk', obj: 'person.walker' },
  crowds: { layer: 'walk', obj: 'person.walker' }, 'dog-walkers': { layer: 'walk', obj: 'person.dog-walker' }, boater: { layer: 'walk', obj: 'person.walker' },
  cyclists: { layer: 'drive', obj: 'person.cyclist' }, cars: { layer: 'drive', obj: 'vehicle.car' }, buses: { layer: 'drive', obj: 'vehicle.bus' },
  mallard: { layer: 'swim', obj: 'bird.mallard' }, 'mute-swan': { layer: 'swim', obj: 'bird.swan' }, swan: { layer: 'swim', obj: 'bird.swan' },
  coot: { layer: 'swim', obj: 'bird.coot' }, moorhen: { layer: 'swim', obj: 'bird.moorhen' }, goosander: { layer: 'swim', obj: 'bird.mallard' },
  grebe: { layer: 'swim', obj: 'bird.grebe' }, goose: { layer: 'graze', obj: 'bird.goose' }, heron: { layer: 'wade', obj: 'bird.heron' },
  kingfisher: { layer: 'air', obj: 'bird.kingfisher' }, gulls: { layer: 'air', obj: 'bird.gull' }, pigeons: { layer: 'walk', obj: 'bird.pigeon' },
  'narrowboat-cruising': { layer: 'swim', obj: 'boat.narrowboat' }, train: { layer: 'rail', obj: 'rail.train' }, tram: { layer: 'rail', obj: 'vehicle.supertram' },
  cattle: { layer: 'graze', obj: 'animal.cattle' }, ponies: { layer: 'graze', obj: 'animal.pony' }, sheep: { layer: 'graze', obj: 'animal.sheep' },
  deer: { layer: 'graze', obj: 'animal.deer' }, rabbits: { layer: 'graze', obj: 'animal.rabbit' },
};
function worldPopulationDefine(name, p) { if (!/^[a-z0-9-]+$/.test(String(name)) || !p || !WORLD_LAYER_KINDS.hasOwnProperty(p.layer)) throw new Error('worldPopulationDefine: bad ' + name); WORLD_POPULATIONS[name] = Object.assign({}, p); }

/* ---------- small maths ---------- */
const _WC_DEG = Math.PI / 180;
const _wcNum = v => typeof v === 'number' && Number.isFinite(v);
const _wcObjOf = v => v != null && typeof v === 'object' && !Array.isArray(v);
const _wcPt = p => Array.isArray(p) && p.length === 2 && _wcNum(p[0]) && _wcNum(p[1]);
const _wcR3 = v => Math.round(v * 1000) / 1000;
function _wcRng(seed) { let a = (seed >>> 0) || 0x9e3779b9; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function _wcInPoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function _wcSegDist(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L)) : 0;
  return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz);
}
function _wcLineDist(path, x, z) { let d = Infinity; for (let i = 1; i < path.length; i++) d = Math.min(d, _wcSegDist(x, z, path[i - 1], path[i])); return d; }
function _wcPolyArea(p) { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return a / 2; }
/** The penetration depth of two convex polygons (separating axis), 0 when apart. */
function _wcPenetration(A, B) {
  let best = Infinity;
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = -(b[1] - a[1]), nz = b[0] - a[0], L = Math.hypot(nx, nz);
    if (!L) continue;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of A) { const v = (q[0] * nx + q[1] * nz) / L; a0 = Math.min(a0, v); a1 = Math.max(a1, v); }
    for (const q of B) { const v = (q[0] * nx + q[1] * nz) / L; b0 = Math.min(b0, v); b1 = Math.max(b1, v); }
    const o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return 0;
    best = Math.min(best, o);
  }
  return best === Infinity ? 0 : best;
}
/** The nearest z of a footprint at column x (2.3 rule 3); Infinity when x is outside its span; the polygon's min z when x is null. */
function worldFrontZ(foot, x) {
  if (!Array.isArray(foot) || !foot.length) return Infinity;
  if (x == null) return Math.min(...foot.map(p => p[1]));
  let z = Infinity;
  for (let i = 0, j = foot.length - 1; i < foot.length; j = i++) {
    const [x1, z1] = foot[j], [x2, z2] = foot[i];
    if (x < Math.min(x1, x2) || x > Math.max(x1, x2)) continue;
    z = Math.min(z, x1 === x2 ? Math.min(z1, z2) : z1 + (z2 - z1) * (x - x1) / (x2 - x1));
  }
  return z;
}

/* ---------- object descriptors (1.3) ---------- */
/** The world class of a library object, from its id and its v2 class. */
function _wcClass(id, c2) {
  const t = String(id);
  if (c2 === 'person') return 'person';
  if (c2 === 'cyclist') return 'cyclist';
  if (c2 === 'boat') return 'boat';
  if (c2 === 'train') return 'train';
  if (c2 === 'tram') return 'tram';
  if (c2 === 'car' || c2 === 'bus' || c2 === 'bike' || c2 === 'tractor') return 'vehicle';
  if (/^(animal|bird)\./.test(t)) {
    if (c2 === 'bird-air' || c2 === 'air') return 'bird-air';
    if (/kingfisher/.test(t)) return 'kingfisher';
    if (/heron|egret/.test(t)) return 'heron';
    if (/swan/.test(t)) return 'swan';
    if (/goose/.test(t)) return 'goose';
    if (/coot|moorhen/.test(t)) return 'coot';
    if (/grebe/.test(t)) return 'grebe';
    if (/mallard|duck|teal|wigeon|pochard|tufted|mandarin|goosander/.test(t)) return 'duck';
    if (/gull|cormorant/.test(t)) return 'gull';
    if (c2 === 'animal-dog' || /dog/.test(t)) return 'dog';
    if (c2 === 'animal-graze' || /cattle|cow|pony|sheep|horse|deer|donkey|lamb/.test(t)) return 'grazer';
    if (/trout|fish/.test(t)) return 'fish';
    return /^bird\./.test(t) ? 'bird' : 'animal';
  }
  if (c2 === 'air') return 'air';
  if (c2 === 'tree') return 'tree';
  if (c2 === 'shrub') return /reed|bulrush|rush|sedge/.test(t) ? 'reed' : /hedge/.test(t) ? 'hedge' : 'shrub';
  if (c2 === 'cover' || c2 === 'bird-water') return 'cover';
  if (c2 === 'rock') return 'rock';
  if (c2 === 'rail') return /platform/.test(t) ? 'walkway' : 'rail-kit';
  if (c2 === 'structure' || c2 === 'landmark') {
    if (/weir/.test(t)) return 'weir';
    if (/gate/.test(t) && !/gateway|gatehouse|lock-gate/.test(t)) return 'gate';
    if (c2 === 'structure' && /boardwalk|jetty|pontoon|platform|causeway|stepping|footbridge|bridge/.test(t)) return 'walkway';
    if (c2 === 'landmark' && /boardwalk|jetty|pontoon|pier|causeway|footbridge|bridge|viaduct/.test(t)) return 'walkway';
    if (/fence|wall|railing|palisade/.test(t)) return 'fence';
    return c2;
  }
  if (c2 === 'building') return 'building';
  if (/bench|picnic/.test(t)) return 'bench';
  if (/lamp/.test(t)) return 'lamp';
  if (/bollard|post\b|post-|sign/.test(t)) return 'post';
  return 'street';
}
/** Per class: footprint shape, solidity, legal attachments (first = default), floats (sinks to its waterline). */
const WORLD_CLASS_INFO = Object.freeze({
  person: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'deck'] }, cyclist: { foot: 'box', solidity: 'passable', attachOk: ['ground'] },
  dog: { foot: 'box', solidity: 'passable', attachOk: ['ground', 'deck'] },
  duck: { foot: 'box', solidity: 'passable', attachOk: ['water', 'ground', 'deck'], floats: true }, coot: { foot: 'box', solidity: 'passable', attachOk: ['water', 'ground'], floats: true },
  grebe: { foot: 'box', solidity: 'passable', attachOk: ['water'], floats: true }, swan: { foot: 'box', solidity: 'passable', attachOk: ['water', 'ground'], floats: true },
  goose: { foot: 'box', solidity: 'passable', attachOk: ['ground', 'water'], floats: true }, heron: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'water', 'deck'] },
  kingfisher: { foot: 'disc', solidity: 'passable', attachOk: ['deck', 'air'], perch: true }, gull: { foot: 'box', solidity: 'passable', attachOk: ['ground', 'water', 'deck', 'air'], floats: true },
  bird: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'deck', 'air'], perch: true }, 'bird-air': { foot: 'disc', solidity: 'passable', attachOk: ['air'] },
  fish: { foot: 'box', solidity: 'passable', attachOk: ['water'] }, grazer: { foot: 'box', solidity: 'passable', attachOk: ['ground'] }, animal: { foot: 'box', solidity: 'passable', attachOk: ['ground'] },
  air: { foot: 'disc', solidity: 'passable', attachOk: ['air'] },
  boat: { foot: 'box', solidity: 'solid', attachOk: ['water'], floats: true }, train: { foot: 'box', solidity: 'solid', attachOk: ['rail'] }, tram: { foot: 'box', solidity: 'solid', attachOk: ['rail'] },
  vehicle: { foot: 'box', solidity: 'solid', attachOk: ['ground'] },
  tree: { foot: 'disc', solidity: 'solid', attachOk: ['ground'] }, shrub: { foot: 'disc', solidity: 'passable', attachOk: ['ground'] },
  reed: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'water'] }, hedge: { foot: 'box', solidity: 'solid', attachOk: ['ground'] },
  cover: { foot: 'disc', solidity: 'passable', attachOk: ['ground', 'water'] }, rock: { foot: 'disc', solidity: 'solid', attachOk: ['ground', 'water'] },
  building: { foot: 'box', solidity: 'solid', attachOk: ['ground'] }, landmark: { foot: 'box', solidity: 'solid', attachOk: ['ground', 'water'] },
  structure: { foot: 'box', solidity: 'solid', attachOk: ['ground', 'water'] }, walkway: { foot: 'box', solidity: 'walkable', attachOk: ['ground', 'water'] },
  weir: { foot: 'box', solidity: 'solid', attachOk: ['water'] }, gate: { foot: 'box', solidity: 'solid', attachOk: ['ground'] },
  fence: { foot: 'box', solidity: 'solid', attachOk: ['ground'] }, 'rail-kit': { foot: 'box', solidity: 'passable', attachOk: ['ground'] },
  bench: { foot: 'box', solidity: 'solid', attachOk: ['ground', 'deck'] }, lamp: { foot: 'disc', solidity: 'solid', attachOk: ['ground', 'deck', 'wall'] },
  post: { foot: 'disc', solidity: 'solid', attachOk: ['ground', 'water', 'deck'] }, street: { foot: 'box', solidity: 'solid', attachOk: ['ground', 'deck', 'wall'] },
});
/** Gaps: objects whose real size is only a class guess get one here (metres), or they cannot be placed. */
const WORLD_SIZE_GAPS = Object.freeze({});
const _wcInfoMemo = new Map();
const _WC_VIEWS = ['q-front', 'front', 'q-back', 'back'];
function worldObjectInfo(id) {
  if (typeof id !== 'string') return null;
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  const hit = _wcInfoMemo.get(id);
  if (hit && hit.def === def) return hit.r;
  let r = null;
  if (def) {
    let real = typeof sceneObjReal === 'function' ? sceneObjReal(id) : null;
    if (WORLD_SIZE_GAPS[id]) real = Object.assign({ src: 'gap' }, WORLD_SIZE_GAPS[id]);
    if (real && real.h > 0 && real.src !== 'class') {
      const c2 = typeof sceneObjClass === 'function' ? sceneObjClass(id) : 'street', cls = _wcClass(id, c2), ci = WORLD_CLASS_INFO[cls] || WORLD_CLASS_INFO.street;
      const mv = typeof sceneMoverSize === 'function' ? sceneMoverSize(id) : null;
      // movers keep the v2 real size classes (a duck 0.35 m, a person 1.7 m); everything else its real table size
      const h = mv && mv.size ? mv.h : real.h, l = Math.max(0.05, real.l || h), w = Math.max(0.05, real.w || Math.min(l, h) * 0.6);
      let foot = ci.foot, solidity = ci.solidity;
      if (cls === 'street' && (h < 1 || w < 0.3)) solidity = 'passable';
      // what floats: the object units below the waterline (sceneMoverSize sink) in metres
      const sink = ci.floats && mv && mv.top > 0 ? _wcR3(mv.sink * h / mv.top) : 0;
      let deck = null;
      if (cls === 'walkway') deck = { poly: [[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], y: _wcR3(h > 3 ? h * 0.55 : Math.min(h, 1.2)) };
      else if (cls === 'boat' && h < 6 && l > 5) deck = { poly: [[-l * 0.4, -w * 0.4], [l * 0.4, -w * 0.4], [l * 0.4, w * 0.4], [-l * 0.4, w * 0.4]], y: _wcR3(h * 0.8) };
      // the trunk of a tree, the post of a lamp: a small solid disc; the plant's spread is passable
      const rad = cls === 'tree' ? Math.max(0.2, 0.025 * h) : (cls === 'lamp' || cls === 'post') ? Math.min(0.15, Math.max(0.05, Math.min(w, l) / 2)) : Math.max(0.05, Math.min(l, w) / 2);
      const views = Array.isArray(def.views) ? def.views.slice() : ['side'].concat(_WC_VIEWS.filter(v => sceneObj(id + '-' + v)));
      r = Object.freeze({ id, cls, size: Object.freeze({ w: _wcR3(l), d: _wcR3(w), h: _wcR3(h) }), foot: foot === 'disc' ? 'disc' : 'box', r: _wcR3(rad), solidity,
        attachOk: Object.freeze(ci.attachOk.slice()), floats: !!ci.floats, perch: !!ci.perch, sink, views: Object.freeze(views), deck: deck && Object.freeze(deck),
        variants: Math.max(1, def.variants | 0), variantNames: Array.isArray(def.variantNames) ? def.variantNames.slice() : null,
        seasonal: def.seasonal !== false, src: real.src });
    }
  }
  _wcInfoMemo.set(id, { def, r });
  return r;
}
/** The world footprint of a descriptor at (x, z) with facing (degrees, 0 = away, 90 = right): a convex polygon. */
function _wcFoot(info, x, z, facing) {
  const f = (_wcNum(facing) ? facing : 0) * _WC_DEG, hx = Math.sin(f), hz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  if (info.foot === 'disc') { const out = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; out.push([_wcR3(x + info.r * Math.cos(a)), _wcR3(z + info.r * Math.sin(a))]); } return out; }
  const L = info.size.w / 2, W = info.size.d / 2;
  return [[-L, -W], [L, -W], [L, W], [-L, W]].map(([u, v]) => [_wcR3(x + u * hx + v * rx), _wcR3(z + u * hz + v * rz)]);
}
function _wcLocalToWorld(poly, x, z, facing) {
  const f = (_wcNum(facing) ? facing : 0) * _WC_DEG, hx = Math.sin(f), hz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  return poly.map(([u, v]) => [_wcR3(x + u * hx + v * rx), _wcR3(z + u * hz + v * rz)]);
}

/* ---------- the validator (5.2) ---------- */
const _WC_KEYS = {
  top: ['v', 'place', 'camera', 'ground', 'surfaces', 'entities', 'landmarks', 'life', 'backdrop', 'seed'],
  place: ['lat', 'lon', 'alt', 'region'],
  camera: ['eye', 'fov', 'horizon', 'heading', 'x0', 'lat', 'lon', 'alt', 'water', 'preset'],
  ground: ['relief'], relief: ['x', 'd', 'nx', 'nd', 'h', 'src'],
  surface: ['id', 'kind', 'water', 'poly', 'path', 'width', 'shallow', 'level', 'obj', 'open'],
  entity: ['id', 'obj', 'at', 'facing', 'attach', 'variant', 'y', 'open', 'blocks', 'framed'],
  cluster: ['cluster', 'on', 'edge', 'n', 'seed', 'gap', 'variant'],
  landmark: ['id', 'obj', 'at', 'facing', 'src', 'variant', 'attach'],
  life: ['id', 'who', 'on', 'rate', 'count', 'every', 'mix', 'edges', 'goals', 'group', 'state', 'framed'],
  goal: ['go', 'do', 'for', 'wander', 'follow', 'meet', 'leave'],
  backdrop: ['style', 'skyline'], skyline: ['obj', 'bearing', 'dist', 'src'],
};
const _WC_FIX = {
  unknownKey: 'remove the key; the v3 format has closed key sets (WORLD_ENGINE.md 5.2)',
  screenOrLookField: 'remove it: screen position, scale, layer, light, shadow and reflection are derived by the engine',
  seasonPinned: 'remove it: the season comes from the live sky', unknownSize: 'use a library object with a real size (SCENE_REAL_SIZE or WORLD_SIZE_GAPS)',
  unknownVariant: 'use a variant the object has', badAttach: 'move it onto a surface its class may use, or change attach', overlap: 'move the two solids apart',
  blocksPath: 'move it off the path or set blocks: true', unreachable: 'give the population a surface of its layer and reachable targets',
  emptyBackground: 'add backdrop: { style }', unknownBackdrop: 'use one of WORLD_BACKDROPS', landmarkSrc: 'add src: where the landmark\'s position comes from',
  templated: 'move the camera (>= 25 degrees or >= 30 m) and recompose the layout', dupId: 'make ids unique', unknownSurface: 'refer to a surface id that exists',
  unknownWho: 'use a population name (WORLD_POPULATIONS) or a library object id', badSurface: 'give poly (>= 3 points) or path (>= 2 points) + width',
  badVersion: 'set v: 3', badType: 'use the documented type', badValue: 'use a value in range', missingField: 'add the field',
};
function _wcErr(errs, path, rule, msg) { errs.push({ path, rule, msg, fix: _WC_FIX[rule] || '' }); }
/** Closed keys of one object + the look-key ban. */
function _wcKeys(errs, o, allowed, path) {
  if (!_wcObjOf(o)) { _wcErr(errs, path, 'badType', path + ' must be an object'); return false; }
  for (const k of Object.keys(o)) {
    if (WORLD_LOOK_KEYS.includes(k)) _wcErr(errs, path + '.' + k, 'screenOrLookField', `${k} is a screen or look field`);
    else if (k === 'season' || k === 'seasons') _wcErr(errs, path + '.' + k, 'seasonPinned', 'a scene cannot pin its season');
    else if (!allowed.includes(k)) _wcErr(errs, path + '.' + k, 'unknownKey', `unknown key ${k}`);
  }
  return true;
}
function _wcSurfContains(s, x, z) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return _wcInPoly(s.poly, x, z);
  if (Array.isArray(s.path) && s.path.length >= 2 && s.width > 0) return _wcLineDist(s.path, x, z) <= s.width / 2;
  return false;
}
function _wcSurfOk(s) {
  if (Array.isArray(s.poly)) return s.poly.length >= 3 && s.poly.every(_wcPt) && Math.abs(_wcPolyArea(s.poly)) > 1e-6 && s.path == null;
  if (Array.isArray(s.path)) return s.path.length >= 2 && s.path.every(_wcPt) && _wcNum(s.width) && s.width > 0;
  return false;
}
/** The surface of a spec under (x, z), later surfaces win (no entities: the validator's view). */
function _wcSpecSurfAt(surfs, x, z) { for (let i = surfs.length - 1; i >= 0; i--) if (_wcSurfOk(surfs[i]) && _wcSurfContains(surfs[i], x, z)) return surfs[i]; return null; }
function _wcAttachKind(a) { const s = String(a || ''); const i = s.indexOf(':'); return i < 0 ? s : s.slice(0, i); }
function _wcAttachRef(a) { const s = String(a || ''); const i = s.indexOf(':'); return i < 0 ? null : s.slice(i + 1); }
function _wcPopOf(who) {
  if (WORLD_POPULATIONS.hasOwnProperty(who)) return WORLD_POPULATIONS[who];
  const info = worldObjectInfo(who);
  if (!info) return null;
  const k = info.attachOk[0];
  const layer = info.cls === 'heron' ? 'wade' : k === 'water' ? 'swim' : k === 'rail' ? 'rail' : k === 'air' ? 'air' : info.cls === 'grazer' ? 'graze' : (info.cls === 'vehicle' || info.cls === 'cyclist') ? 'drive' : 'walk';
  return { layer, obj: who };
}

function worldValidate(spec, o = {}) {
  const errs = [];
  if (!_wcKeys(errs, spec, _WC_KEYS.top, 'spec')) return { ok: false, errors: errs };
  if (spec.v !== 3) _wcErr(errs, 'spec.v', 'badVersion', 'v must be 3');
  if (spec.seed != null && !Number.isInteger(spec.seed)) _wcErr(errs, 'spec.seed', 'badType', 'seed must be an integer');
  if (spec.place != null && _wcKeys(errs, spec.place, _WC_KEYS.place, 'place')) {
    for (const k of ['lat', 'lon', 'alt']) if (spec.place[k] != null && !_wcNum(spec.place[k])) _wcErr(errs, 'place.' + k, 'badType', k + ' must be a number');
  }
  if (spec.camera == null) _wcErr(errs, 'camera', 'missingField', 'camera is required');
  else if (_wcKeys(errs, spec.camera, _WC_KEYS.camera, 'camera')) {
    for (const k of ['eye', 'fov', 'horizon', 'heading', 'x0', 'lat', 'lon', 'alt', 'water']) if (spec.camera[k] != null && !_wcNum(spec.camera[k])) _wcErr(errs, 'camera.' + k, 'badType', k + ' must be a number');
    if (_wcNum(spec.camera.eye) && spec.camera.eye <= 0) _wcErr(errs, 'camera.eye', 'badValue', 'eye must be above the ground');
    if (_wcNum(spec.camera.fov) && (spec.camera.fov < 10 || spec.camera.fov > 150)) _wcErr(errs, 'camera.fov', 'badValue', 'fov 10..150');
  }
  if (spec.ground != null && _wcKeys(errs, spec.ground, _WC_KEYS.ground, 'ground') && spec.ground.relief != null) _wcKeys(errs, spec.ground.relief, _WC_KEYS.relief, 'ground.relief');

  // surfaces
  const surfs = Array.isArray(spec.surfaces) ? spec.surfaces : [], sIds = new Map();
  if (spec.surfaces != null && !Array.isArray(spec.surfaces)) _wcErr(errs, 'surfaces', 'badType', 'surfaces must be a list');
  surfs.forEach((s, i) => {
    const p = `surfaces[${i}]`;
    if (!_wcKeys(errs, s, _WC_KEYS.surface, p)) return;
    if (typeof s.id !== 'string' || !s.id) _wcErr(errs, p + '.id', 'missingField', 'a surface needs an id');
    else if (sIds.has(s.id)) _wcErr(errs, p + '.id', 'dupId', 'duplicate surface id ' + s.id);
    else sIds.set(s.id, s);
    if (!WORLD_SURFACE_KINDS.hasOwnProperty(s.kind)) _wcErr(errs, p + '.kind', 'badValue', 'unknown surface kind ' + s.kind);
    if (!_wcSurfOk(s)) _wcErr(errs, p, 'badSurface', 'a surface needs poly (>= 3 points, non-zero area) or path (>= 2 points) + width > 0, not both');
    if (s.kind === 'water') {
      if (!WORLD_WATER_KINDS.includes(s.water)) _wcErr(errs, p + '.water', 'badValue', 'water must be one of ' + WORLD_WATER_KINDS.join(', '));
      if (s.shallow != null && !(_wcNum(s.shallow) && s.shallow >= 0)) _wcErr(errs, p + '.shallow', 'badValue', 'shallow is metres >= 0');
      if (s.level != null && !_wcNum(s.level)) _wcErr(errs, p + '.level', 'badType', 'level is metres');
    } else for (const k of ['water', 'shallow', 'level']) if (s[k] != null) _wcErr(errs, p + '.' + k, 'unknownKey', k + ' is only for water surfaces');
    if (s.obj != null && !worldObjectInfo(s.obj)) _wcErr(errs, p + '.obj', 'unknownSize', 'no world descriptor for ' + s.obj);
    if (s.open != null && (s.kind !== 'hedge' || typeof s.open !== 'boolean')) _wcErr(errs, p + '.open', 'badValue', 'open is a boolean on a hedge (a gap)');
  });

  // entities and landmarks
  const ents = [], eIds = new Map();
  const listOf = (key) => { if (spec[key] != null && !Array.isArray(spec[key])) { _wcErr(errs, key, 'badType', key + ' must be a list'); return []; } return spec[key] || []; };
  const placed = [...listOf('entities').map((e, i) => ({ e, p: `entities[${i}]`, lm: false })), ...listOf('landmarks').map((e, i) => ({ e, p: `landmarks[${i}]`, lm: true }))];
  for (const { e, p, lm } of placed) {
    if (!_wcObjOf(e)) { _wcErr(errs, p, 'badType', 'an entity is an object'); continue; }
    if (!lm && e.cluster != null) {
      _wcKeys(errs, e, _WC_KEYS.cluster, p);
      const info = worldObjectInfo(e.cluster);
      if (!info) _wcErr(errs, p + '.cluster', 'unknownSize', 'no world descriptor for ' + e.cluster);
      if (!sIds.has(e.on)) _wcErr(errs, p + '.on', 'unknownSurface', 'no surface ' + e.on);
      else if (info) {
        const sk = sIds.get(e.on).kind, onWater = sk === 'water';
        if (onWater ? !info.attachOk.includes('water') : !info.attachOk.includes('ground')) _wcErr(errs, p + '.on', 'badAttach', `${e.cluster} (${info.cls}) cannot stand on ${sk}`);
      }
      if (!(Number.isInteger(e.n) && e.n > 0 && e.n <= 2000)) _wcErr(errs, p + '.n', 'badValue', 'n is an integer 1..2000');
      if (e.seed != null && !Number.isInteger(e.seed)) _wcErr(errs, p + '.seed', 'badType', 'seed is an integer');
      if (e.edge != null && typeof e.edge !== 'boolean') _wcErr(errs, p + '.edge', 'badType', 'edge is a boolean');
      if (e.gap != null && !(_wcNum(e.gap) && e.gap >= 0)) _wcErr(errs, p + '.gap', 'badValue', 'gap is metres >= 0');
      continue;
    }
    _wcKeys(errs, e, lm ? _WC_KEYS.landmark : _WC_KEYS.entity, p);
    if (lm && (typeof e.src !== 'string' || !e.src.trim())) _wcErr(errs, p + '.src', 'landmarkSrc', 'a landmark carries src');
    if (e.id != null) {
      if (typeof e.id !== 'string' || !e.id) _wcErr(errs, p + '.id', 'badType', 'id is a string');
      else if (eIds.has(e.id) || sIds.has(e.id)) _wcErr(errs, p + '.id', 'dupId', 'duplicate id ' + e.id);
      else eIds.set(e.id, e);
    }
    const info = typeof e.obj === 'string' ? worldObjectInfo(e.obj) : null;
    if (typeof e.obj !== 'string') _wcErr(errs, p + '.obj', 'missingField', 'obj is required');
    else if (!info) _wcErr(errs, p + '.obj', 'unknownSize', 'no world descriptor for ' + e.obj);
    if (!_wcPt(e.at)) { _wcErr(errs, p + '.at', 'badValue', 'at is [x, z] in metres'); continue; }
    if (!(e.at[1] > 0)) _wcErr(errs, p + '.at', 'badValue', 'z must be > 0 (in front of the camera)');
    if (e.facing != null && !_wcNum(e.facing)) _wcErr(errs, p + '.facing', 'badType', 'facing is degrees');
    if (e.variant != null && info) {
      const ok = (Number.isInteger(e.variant) && e.variant >= 0 && e.variant < info.variants) || (typeof e.variant === 'string' && info.variantNames && info.variantNames.includes(e.variant));
      if (!ok) _wcErr(errs, p + '.variant', 'unknownVariant', `${e.obj} has no variant ${JSON.stringify(e.variant)}`);
    }
    for (const k of ['open', 'blocks', 'framed']) if (e[k] != null && typeof e[k] !== 'boolean') _wcErr(errs, p + '.' + k, 'badType', k + ' is a boolean');
    if (!info) continue;
    const ak = e.attach == null ? null : _wcAttachKind(e.attach), kind = ak || info.attachOk[0];
    if (e.attach != null && (typeof e.attach !== 'string' || !['ground', 'water', 'deck', 'rail', 'air', 'wall'].includes(ak) || ((ak === 'deck' || ak === 'rail' || ak === 'wall') !== !!_wcAttachRef(e.attach)))) {
      _wcErr(errs, p + '.attach', 'badValue', 'attach is ground | water | deck:<host> | rail:<surface> | air | wall:<host>'); continue;
    }
    if (e.y != null) {
      if (kind !== 'air' && kind !== 'wall') _wcErr(errs, p + '.y', 'screenOrLookField', 'y is derived for grounded, floating and decked things');
      else if (!_wcNum(e.y) || e.y < 0) _wcErr(errs, p + '.y', 'badValue', 'y is metres above the ground');
    } else if (kind === 'air' || kind === 'wall') _wcErr(errs, p + '.y', 'missingField', kind + ' needs y (metres above the ground)');
    const kindOk = kind === 'deck' ? (info.attachOk.includes('deck') || info.perch) : info.attachOk.includes(kind);
    if (!kindOk) { _wcErr(errs, p + '.attach', 'badAttach', `${e.obj} (${info.cls}) cannot attach to ${kind}; legal: ${info.attachOk.join(', ')}`); continue; }
    ents.push({ e, p, info, kind, ref: _wcAttachRef(e.attach) });
  }
  // attachment against the surface (or host) under it
  for (const it of ents) {
    const { e, p, info, kind, ref } = it, [x, z] = e.at, s = _wcSpecSurfAt(surfs, x, z);
    if (kind === 'water') { if (!s || s.kind !== 'water') _wcErr(errs, p + '.at', 'badAttach', `${e.obj} attaches to water but stands on ${s ? s.kind : 'bare ground'}`); }
    else if (kind === 'ground') {
      if (s && (s.kind === 'water' || s.kind === 'weir') && !(info.cls === 'heron' || info.cls === 'reed')) _wcErr(errs, p + '.at', 'badAttach', `${e.obj} stands on the ground but (${x}, ${z}) is ${s.kind}`);
      else if (s && (s.kind === 'rail' || s.kind === 'tram') && !['rail-kit', 'post', 'lamp'].includes(info.cls)) _wcErr(errs, p + '.at', 'badAttach', `${e.obj} stands on the ${s.kind} line`);
    } else if (kind === 'rail' && !ref) {
      if (!surfs.some(q => (q.kind === 'rail' || q.kind === 'tram') && _wcSurfOk(q) && _wcSurfContains(q.path ? Object.assign({}, q, { width: Math.max(q.width || 0, 4) }) : q, x, z)))
        _wcErr(errs, p + '.at', 'badAttach', `${e.obj} runs on rails only and (${x}, ${z}) is on no rail`);
    } else if (kind === 'rail') {
      const rs = sIds.get(ref);
      if (!rs) _wcErr(errs, p + '.attach', 'unknownSurface', 'no surface ' + ref);
      else if (rs.kind !== 'rail' && rs.kind !== 'tram') _wcErr(errs, p + '.attach', 'badAttach', `${ref} is ${rs.kind}, not a rail`);
      else if (!_wcSurfContains(rs.path ? Object.assign({}, rs, { width: Math.max(rs.width || 0, 4) }) : rs, x, z)) _wcErr(errs, p + '.at', 'badAttach', `${e.obj} is off the line ${ref}`);
    } else if (kind === 'deck' || kind === 'wall') {
      const host = eIds.get(ref), hi = host && worldObjectInfo(host.obj);
      if (!host || !hi) _wcErr(errs, p + '.attach', 'unknownSurface', 'no host entity ' + ref);
      else if (kind === 'wall' && !['building', 'structure', 'landmark', 'fence'].includes(hi.cls)) _wcErr(errs, p + '.attach', 'badAttach', `${ref} (${hi.cls}) has no wall`);
      else if (kind === 'deck') {
        if (hi.deck) { if (!_wcInPoly(_wcLocalToWorld(hi.deck.poly, host.at[0], host.at[1], host.facing), x, z)) _wcErr(errs, p + '.at', 'badAttach', `${e.obj} is off the deck of ${ref}`); }
        else if (!(info.perch && hi.solidity === 'solid')) _wcErr(errs, p + '.attach', 'badAttach', `${ref} (${hi.cls}) has no deck`);
        else if (!_wcInPoly(_wcFoot(hi, host.at[0], host.at[1], host.facing), x, z) && Math.hypot(x - host.at[0], z - host.at[1]) > Math.max(0.5, hi.r * 1.5)) _wcErr(errs, p + '.at', 'badAttach', `${e.obj} is not on its perch ${ref}`);
      }
    }
  }
  // solids: no overlaps, no blocked paths
  const solids = ents.filter(it => it.info.solidity === 'solid' && !(it.e.open === true && it.info.cls === 'gate') && it.kind !== 'deck' && it.kind !== 'wall' && it.kind !== 'air')
    .map(it => Object.assign(it, { foot: _wcFoot(it.info, it.e.at[0], it.e.at[1], it.e.facing) }));
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i], b = solids[j];
    if (Math.abs(a.e.at[1] - b.e.at[1]) > (a.info.size.w + a.info.size.d + b.info.size.w + b.info.size.d)) continue;
    const pen = _wcPenetration(a.foot, b.foot);
    if (pen > 0.05) _wcErr(errs, b.p, 'overlap', `${b.e.obj} overlaps ${a.e.obj} (${a.p}) by ${_wcR3(pen)} m`);
  }
  for (const s of surfs) {
    if (!_wcSurfOk(s) || !Array.isArray(s.path) || WORLD_SURFACE_KINDS[s.kind] !== 'walk') continue;
    for (const it of solids) {
      if (it.e.blocks === true) continue;
      let blocked = false;
      for (let k = 1; k < s.path.length && !blocked; k++) {
        const a = s.path[k - 1], b = s.path[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!L) continue;
        const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, nx = -tz, nz = tx;
        for (let t = 0; t <= L && !blocked; t += 0.25) {
          const cx = a[0] + tx * t, cz = a[1] + tz * t;
          let all = true;
          for (let q = -2; q <= 2 && all; q++) { const o2 = q / 2 * (s.width / 2 - 0.01); if (!_wcInPoly(it.foot, cx + nx * o2, cz + nz * o2)) all = false; }
          if (all) blocked = true;
        }
      }
      if (blocked) _wcErr(errs, it.p, 'blocksPath', `${it.e.obj} covers the whole width of ${s.id}`);
    }
  }

  // life
  const layerHas = (layer) => layer === 'air' || surfs.some(s => (WORLD_LAYER_KINDS[layer] || []).includes(s.kind)) || (layer === 'walk' && ents.some(it => it.info.deck));
  listOf('life').forEach((L, i) => {
    const p = `life[${i}]`;
    if (!_wcKeys(errs, L, _WC_KEYS.life, p)) return;
    const pop = typeof L.who === 'string' ? _wcPopOf(L.who) : null;
    if (!pop) { _wcErr(errs, p + '.who', 'unknownWho', 'unknown population ' + L.who); return; }
    if (!layerHas(pop.layer)) _wcErr(errs, p, 'unreachable', `${L.who} lives on the ${pop.layer} layer and the scene has no surface for it`);
    if (L.on != null) {
      const s = sIds.get(L.on);
      if (!s) _wcErr(errs, p + '.on', 'unknownSurface', 'no surface ' + L.on);
      else if (pop.layer !== 'air' && !(WORLD_LAYER_KINDS[pop.layer] || []).includes(s.kind)) _wcErr(errs, p + '.on', 'unreachable', `${L.who} (${pop.layer}) cannot use ${s.id} (${s.kind})`);
    }
    if (L.rate != null && !(typeof L.rate === 'string' && /^\d+(\.\d+)?\/(\d+(\.\d+)?)?(s|min|h)$/.test(L.rate))) _wcErr(errs, p + '.rate', 'badValue', 'rate is like 6/min or 1/3min');
    if (L.every != null && !(typeof L.every === 'string' && /^\d+(\.\d+)?(s|min|h)$/.test(L.every))) _wcErr(errs, p + '.every', 'badValue', 'every is like 6min');
    if (L.count != null && !(Number.isInteger(L.count) && L.count > 0 && L.count <= 200)) _wcErr(errs, p + '.count', 'badValue', 'count is 1..200');
    if (L.rate == null && L.count == null && L.every == null) _wcErr(errs, p, 'missingField', 'a population needs rate, count or every');
    if (L.mix != null && !(_wcObjOf(L.mix) && Object.values(L.mix).every(v => _wcNum(v) && v >= 0))) _wcErr(errs, p + '.mix', 'badValue', 'mix is { style: share }');
    if (L.edges != null && !(Array.isArray(L.edges) && L.edges.length && L.edges.every(x => WORLD_EDGES.includes(x)))) _wcErr(errs, p + '.edges', 'badValue', 'edges are N, S, E, W');
    if (L.goals != null) {
      if (!Array.isArray(L.goals)) { _wcErr(errs, p + '.goals', 'badType', 'goals is a list'); return; }
      L.goals.forEach((g, k) => {
        const gp = `${p}.goals[${k}]`;
        if (!_wcKeys(errs, g, _WC_KEYS.goal, gp)) return;
        const verbs = ['go', 'do', 'wander', 'follow', 'meet', 'leave'].filter(v => g[v] != null);
        if (verbs.length !== 1) { _wcErr(errs, gp, 'badValue', 'a goal has exactly one verb'); return; }
        const tgt = g[verbs[0]];
        if (verbs[0] === 'go' && !(_wcPt(tgt) || eIds.has(tgt) || sIds.has(tgt) || WORLD_EDGES.includes(tgt))) _wcErr(errs, gp + '.go', 'unreachable', 'no target ' + JSON.stringify(tgt));
        if (verbs[0] === 'wander' && !sIds.has(tgt)) _wcErr(errs, gp + '.wander', 'unreachable', 'no surface ' + tgt);
        if (verbs[0] === 'leave' && !(WORLD_EDGES.includes(tgt) || tgt === 'cover')) _wcErr(errs, gp + '.leave', 'badValue', 'leave N, S, E, W or cover');
        if ((verbs[0] === 'follow' || verbs[0] === 'meet') && typeof tgt !== 'string') _wcErr(errs, gp, 'badType', 'follow / meet name an id');
        if (g.for != null && !(_wcNum(g.for) || (Array.isArray(g.for) && g.for.length === 2 && g.for.every(_wcNum) && g.for[0] <= g.for[1]))) _wcErr(errs, gp + '.for', 'badValue', 'for is seconds or [min, max]');
      });
    }
  });

  // backdrop (2.7)
  if (spec.backdrop == null) _wcErr(errs, 'backdrop', 'emptyBackground', 'backdrop is required (no empty backgrounds)');
  else if (_wcKeys(errs, spec.backdrop, _WC_KEYS.backdrop, 'backdrop')) {
    if (!WORLD_BACKDROPS.includes(spec.backdrop.style)) _wcErr(errs, 'backdrop.style', 'unknownBackdrop', 'unknown backdrop style ' + spec.backdrop.style);
    if (spec.backdrop.skyline != null) {
      if (!Array.isArray(spec.backdrop.skyline)) _wcErr(errs, 'backdrop.skyline', 'badType', 'skyline is a list');
      else spec.backdrop.skyline.forEach((k, i) => {
        const p = `backdrop.skyline[${i}]`;
        if (!_wcKeys(errs, k, _WC_KEYS.skyline, p)) return;
        if (!worldObjectInfo(k.obj)) _wcErr(errs, p + '.obj', 'unknownSize', 'no world descriptor for ' + k.obj);
        if (!_wcNum(k.bearing)) _wcErr(errs, p + '.bearing', 'badValue', 'bearing is degrees');
        if (!(_wcNum(k.dist) && k.dist > 0)) _wcErr(errs, p + '.dist', 'badValue', 'dist is metres > 0');
        if (typeof k.src !== 'string' || !k.src.trim()) _wcErr(errs, p + '.src', 'landmarkSrc', 'a skyline entry carries src');
      });
    }
  }
  if (Array.isArray(o.views) && o.views.length && !errs.length) for (const er of worldTemplated([spec, ...o.views])) if (er.path.startsWith('views[0]')) errs.push(er);
  return { ok: errs.length === 0, errors: errs };
}

/* ---------- templated layouts across a place's views (5.2) ---------- */
function _wcSignature(spec) {
  const w = worldBuild(spec, { validate: false }), out = new Set();
  for (const e of w.entities) {
    const P = sceneProject(w.cam, e.x, e.z, e.y);
    if (!(P.X >= 0 && P.X < 1600 && P.Y >= 0 && P.Y < 900)) continue;
    out.add(`${Math.floor(P.X / (1600 / 6))},${Math.floor(P.Y / 150)}:${e.cls}`);
  }
  return out;
}
function worldTemplated(specs) {
  const errs = [], sigs = specs.map(_wcSignature);
  const pos = s => { const p = s.place || {}, c = s.camera || {}; return [_wcNum(p.lat) ? p.lat : c.lat, _wcNum(p.lon) ? p.lon : c.lon]; };
  for (let i = 0; i < specs.length; i++) for (let j = i + 1; j < specs.length; j++) {
    const a = pos(specs[i]), b = pos(specs[j]);
    const hd = Math.abs(((((specs[i].camera || {}).heading || 0) - ((specs[j].camera || {}).heading || 0)) % 360 + 540) % 360 - 180);
    const dm = _wcNum(a[0]) && _wcNum(b[0]) ? Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * Math.cos(a[0] * _WC_DEG)) : Infinity;
    if (hd < 25 && dm < 30) _wcErr(errs, `views[${i}]`, 'templated', `views ${i} and ${j}: cameras differ by ${_wcR3(hd)} degrees and ${_wcR3(dm)} m`);
    const A = sigs[i], B = sigs[j]; let inter = 0; for (const t of A) if (B.has(t)) inter++;
    const uni = A.size + B.size - inter, dist = uni ? 1 - inter / uni : 0;
    if (dist < 0.35) _wcErr(errs, `views[${i}]`, 'templated', `views ${i} and ${j}: layout signatures differ by ${_wcR3(dist)} (< 0.35)`);
  }
  return errs;
}

/* ---------- the world (1.2) ---------- */
function _wcWaterLevel(cam, s) { return s && _wcNum(s.level) ? s.level : (cam && _wcNum(cam.water) ? cam.water : 0); }
/** Lights from the library glow parts ('lit'), in world metres about the anchor. */
const _wcLightMemo = new Map();
function _wcLights(info, x, y, z, facing, season) {
  const key = info.id + '|' + season;
  let rel = _wcLightMemo.get(key);
  if (!rel) {
    rel = [];
    let sh = null;
    if (typeof sceneObjShapes === 'function') { try { sh = sceneObjShapes(info.id, 0, season || 'summer'); } catch (e) { sh = null; } }
    const mv = typeof sceneMoverSize === 'function' ? sceneMoverSize(info.id) : null, top = mv && mv.top > 0 ? mv.top : 64, k = info.size.h / top;
    const lit = sh && sh.parts && sh.parts.lit;
    if (Array.isArray(lit) && typeof scenePathBox === 'function') for (const q of lit) {
      const b = q && q.d ? scenePathBox(q.d, q.m) : null; if (!b) continue;
      rel.push({ u: ((b[0] + b[2]) / 2) * k, y: -((b[1] + b[3]) / 2) * k, r: Math.max(0.2, Math.max(b[2] - b[0], b[3] - b[1]) * k / 2), col: typeof q.fill === 'string' ? q.fill : '#ffd27a' });
    }
    _wcLightMemo.set(key, rel);
  }
  const f = (_wcNum(facing) ? facing : 90) * _WC_DEG, hx = Math.sin(f), hz = Math.cos(f), kind = info.cls === 'lamp' ? 'lamp' : info.cls === 'train' || info.cls === 'tram' ? 'signal' : 'window';
  return rel.map(l => ({ x: _wcR3(x + l.u * hx), y: _wcR3(y + l.y), z: _wcR3(z + l.u * hz), r: _wcR3(l.r), col: l.col, kind }));
}
function _wcSurfRecord(s) {
  const r = { id: s.id, kind: s.kind, layer: WORLD_SURFACE_KINDS[s.kind] || null };
  if (Array.isArray(s.poly)) r.poly = s.poly.map(p => [p[0], p[1]]);
  if (Array.isArray(s.path)) { r.path = s.path.map(p => [p[0], p[1]]); r.width = s.width; }
  if (s.kind === 'water') { r.water = s.water; r.shallow = _wcNum(s.shallow) ? s.shallow : 0.5; }
  if (s.level != null) r.level = s.level;
  if (s.obj) r.obj = s.obj;
  if (s.kind === 'hedge') r.open = s.open === true;
  return r;
}
function _wcEntity(world, e, info, season) {
  const cam = world.cam, [x, z] = e.at, ak = e.attach ? _wcAttachKind(e.attach) : info.attachOk[0], ref = e.attach ? _wcAttachRef(e.attach) : null;
  const g = sceneGroundHeight(cam, x, z);
  let y = g, waterline = null, hostId = null;
  if (ak === 'water') {
    const s = world.surfaces.slice().reverse().find(q => q.kind === 'water' && _wcSurfContains(q, x, z)) || null, wl = _wcWaterLevel(cam, s);
    waterline = wl; y = info.floats ? _wcR3(wl - info.sink) : wl;
  } else if (ak === 'deck') {
    const host = world.entities.find(h => h.id === ref);
    hostId = ref; y = host ? (host.deck ? host.deck.y : host.y + host.height) : g;
  } else if (ak === 'air' || ak === 'wall') { y = g + (_wcNum(e.y) ? e.y : 0); if (ak === 'wall') hostId = ref; }
  else if (info.cls === 'heron' || info.cls === 'reed' || info.cls === 'post' || info.cls === 'walkway' || info.cls === 'structure' || info.cls === 'landmark' || info.cls === 'rock') {
    const s = world.surfaces.slice().reverse().find(q => _wcSurfContains(q, x, z));
    if (s && s.kind === 'water') { waterline = _wcWaterLevel(cam, s); y = info.cls === 'walkway' ? waterline : waterline; }
  }
  const facing = _wcNum(e.facing) ? e.facing : 90, open = e.open === true;
  const ent = { id: e.id || null, obj: e.obj, cls: info.cls, variant: e.variant == null ? null : e.variant, x, z, y: _wcR3(y), facing,
    foot: _wcFoot(info, x, z, facing), height: info.size.h, size: info.size, solidity: info.cls === 'gate' && open ? 'passable' : info.solidity,
    attach: ak + (ref ? ':' + ref : ''), host: hostId, deck: null, waterline: waterline == null ? null : _wcR3(waterline), lights: null, static: true,
    seasonal: info.seasonal, blocks: e.blocks === true, framed: e.framed === true };
  if (info.deck) ent.deck = { poly: _wcLocalToWorld(info.deck.poly, x, z, facing), y: _wcR3(y + info.deck.y) };
  ent.lights = _wcLights(info, x, ent.y, z, facing, season);
  return ent;
}
function _wcCluster(world, c, info, idx, season, solids) {
  const s = world.surfaces.find(q => q.id === c.on); if (!s) return [];
  const rnd = _wcRng(((c.seed | 0) * 7919 + idx * 104729 + (world.seed | 0)) >>> 0);
  // bounds of the surface
  const pts = s.poly || s.path, xs = pts.map(p => p[0]), zs = pts.map(p => p[1]), pad = s.path ? s.width / 2 : 0;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, z0 = Math.max(0.5, Math.min(...zs) - pad), z1 = Math.max(...zs) + pad;
  const gap = _wcNum(c.gap) ? c.gap : 0, edgeBand = 1.5, out = [];
  const nearEdge = (x, z) => {
    if (s.path) return _wcLineDist(s.path, x, z) >= s.width / 2 - edgeBand;
    let d = Infinity; for (let i = 0, j = s.poly.length - 1; i < s.poly.length; j = i++) d = Math.min(d, _wcSegDist(x, z, s.poly[j], s.poly[i])); return d <= edgeBand;
  };
  // clustered scatter: seeds, then members around them (never a grid)
  const seeds = []; const nSeeds = Math.max(1, Math.round(Math.sqrt(c.n)));
  for (let tries = 0; seeds.length < nSeeds && tries < nSeeds * 200; tries++) {
    const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
    if (_wcSurfContains(s, x, z) && (!c.edge || nearEdge(x, z))) seeds.push([x, z]);
  }
  if (!seeds.length) return out;
  const spread = Math.max(0.6, Math.sqrt(Math.max(1, (x1 - x0) * (z1 - z0)) / Math.max(1, c.n)) * 1.2);
  for (let tries = 0; out.length < c.n && tries < c.n * 60; tries++) {
    const sd = seeds[Math.floor(rnd() * seeds.length)], a = rnd() * Math.PI * 2, r = spread * Math.sqrt(-2 * Math.log(Math.max(1e-6, rnd()))) * 0.7;
    const x = _wcR3(sd[0] + Math.cos(a) * r), z = _wcR3(sd[1] + Math.sin(a) * r * 1.5);
    if (!(z > 0.5) || worldSurfaceAt({ surfaces: world.surfaces }, x, z) !== s || (c.edge && !nearEdge(x, z))) continue;   // where a later surface covers it, not here
    if (gap > 0 && out.some(o => Math.hypot(o.x - x, o.z - z) < gap)) continue;
    const foot = _wcFoot(info, x, z, 90);
    if (info.solidity === 'solid' && solids.some(f => _wcPenetration(f, foot) > 0.05)) continue;
    const variant = c.variant != null ? c.variant : Math.floor(rnd() * info.variants);
    const e = _wcEntity(world, { obj: c.cluster, at: [x, z], facing: rnd() < 0.5 ? 90 : 270, attach: s.kind === 'water' ? 'water' : 'ground', variant }, info, season);
    e.id = `${c.on}-${c.cluster}-${idx}-${out.length}`;
    if (info.solidity === 'solid') solids.push(e.foot);
    out.push(e);
  }
  return out;
}
/**
 * The world of a v3 spec (1.2): { cam, surfaces, entities, life, backdrop, seed, place, problems }. Every derived value is set here:
 * y from the attachment (sceneGroundHeight, the water level less the descriptor's sink, a host's deck), the footprint from the
 * descriptor rotated by facing, height, solidity, deck, waterline, lights. Clusters expand into entities (seeded, clustered).
 * The spec is validated first (o.validate === false skips it); its errors are the world's problems.
 */
function worldBuild(spec, o = {}) {
  const season = o.season || 'summer';
  const problems = o.validate === false ? [] : worldValidate(spec).errors;
  const cam = sceneCamera({ camera: Object.assign({}, spec.camera || {}), ground: spec.ground });
  const world = { v: 3, cam, place: Object.assign({}, spec.place || {}), seed: spec.seed | 0, season,
    surfaces: (Array.isArray(spec.surfaces) ? spec.surfaces : []).filter(s => _wcObjOf(s) && _wcSurfOk(s)).map(_wcSurfRecord),
    entities: [], life: (Array.isArray(spec.life) ? spec.life : []).map(L => Object.assign({}, L, { pop: _wcPopOf(L.who) })),
    backdrop: _wcObjOf(spec.backdrop) ? JSON.parse(JSON.stringify(spec.backdrop)) : null, problems };
  const all = [...(Array.isArray(spec.entities) ? spec.entities : []), ...(Array.isArray(spec.landmarks) ? spec.landmarks.map(l => Object.assign({ landmark: true }, l)) : [])];
  // hosts first (an attached thing reads its host's deck), clusters last (they avoid the placed solids)
  const placed = all.filter(e => _wcObjOf(e) && e.cluster == null && _wcPt(e.at) && worldObjectInfo(e.obj));
  const isAtt = e => /^(deck|wall):/.test(String(e.attach || ''));
  for (const e of [...placed.filter(e => !isAtt(e)), ...placed.filter(isAtt)]) {
    const ent = _wcEntity(world, e, worldObjectInfo(e.obj), season);
    if (e.landmark) { ent.landmark = true; ent.src = e.src || null; }
    world.entities.push(ent);
  }
  const solids = world.entities.filter(e => e.solidity === 'solid').map(e => e.foot);
  all.forEach((c, i) => { if (_wcObjOf(c) && c.cluster != null && worldObjectInfo(c.cluster)) world.entities.push(..._wcCluster(world, c, worldObjectInfo(c.cluster), i, season, solids)); });
  return world;
}
/** The surface under a ground point: a host's deck first, then the surfaces (later wins); a solid footprint cuts water. */
function worldSurfaceAt(world, x, z) {
  if (!world) return null;
  const ents = Array.isArray(world.entities) ? world.entities : [];
  for (const e of ents) if (e.deck && _wcInPoly(e.deck.poly, x, z)) return { id: 'deck:' + (e.id || e.obj), kind: 'deck', layer: 'walk', host: e.id, y: e.deck.y, poly: e.deck.poly };
  const surfs = Array.isArray(world.surfaces) ? world.surfaces : [];
  for (let i = surfs.length - 1; i >= 0; i--) {
    const s = surfs[i];
    if (!_wcSurfContains(s, x, z)) continue;
    if (s.kind === 'water' && ents.some(e => e.solidity === 'solid' && e.attach !== 'air' && _wcInPoly(e.foot, x, z))) continue;
    return s;
  }
  return null;
}

/* ---------- registration ---------- */
const _wcAddProblems = [];
/** Register a v3 scene: valid -> sceneAdd(pack, meta, { v: 3, spec }); invalid -> not registered, errors kept (the old version stays). */
function worldAdd(pack, meta, spec) {
  const r = worldValidate(spec);
  if (!r.ok) { _wcAddProblems.push({ pack, id: meta && meta.id, errors: r.errors }); return null; }
  const m = Object.assign({}, meta);
  if (!m.liveSky && spec.place && _wcNum(spec.place.lat) && _wcNum(spec.place.lon)) m.liveSky = { lat: spec.place.lat, lon: spec.place.lon };
  sceneAdd(pack, m, { v: 3, spec });
  // the still (SVG: reduced motion, small tiles, no canvas) of a v3 item is the v2 SVG of its derived statics (F: worldHostData);
  // sceneSvg itself only knows v1 / v2 data
  const list = typeof _scPacks === 'object' ? _scPacks[pack] : null, it = list && list[list.length - 1];
  if (it && it.id === m.id) {
    it.world = 3; it.worldSpec = spec;
    // the item's scene data is the DERIVED v2 data (F: worldHostData), so every v2 path (the host's live canvas, the prebaked
    // player, the bake cache, sceneSvg, the tools) draws it as it is; worldHostData also registers the world for the
    // 'world-life' pass, whose life sim starts off the cold-load path in a page (never in Node: the tools run their own sim)
    if (typeof worldHostData === 'function') {
      let d = null;
      it.scene = () => d || (d = worldHostData(spec, { id: m.id, sim: typeof document === 'undefined' ? false : undefined }));
    }
    it.svg = (o) => {
      if (typeof worldHostData !== 'function' || typeof sceneSvg !== 'function') return '';
      const season = (o && o.season) || it.sceneSeason || it.ukSeason || (typeof sceneSeason === 'function' && o && o.sky && Number.isFinite(o.sky.ms) ? sceneSeason(o.sky.ms, spec.place && spec.place.lat) : null) || 'summer';
      return sceneSvg(worldHostData(spec, { id: m.id, season, sim: false }), Object.assign({}, o, { season }));
    };
  }
  return true;
}
function worldAddProblems() { return _wcAddProblems.slice(); }

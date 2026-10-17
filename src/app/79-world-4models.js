/* ============================================================
   WORLD ENGINE v3.1, package appearance: PARAMETRIC MODELS (docs/dev/WORLD_MODELS.md; the user, 16 Oct: "we want models for
   everything repeatable"). Private names: _wmd. PURE classic script (Node + browser): nothing runs at load but constants; the
   registry is created on first use, so a model file that sorts before this one can define its model at load.

   A MODEL is a small generator that builds REAL geometry (hull, cabin, mast, wheel, frame, lamp head, canopy) from a few
   parameters, drawn correctly from any angle (faces culled by facing, parts sorted far to near), coloured by material (the look
   package grades it by season, light and weather), lit by the scene sun with lit windows and lamps at night, sitting in the
   water at its waterline with a bob where it floats (and mirrored by the water pass like any hull), with a true ground footprint
   and size for the engine. The renderer asks the registry once (worldExtrudeHull, 79-world-4extrude.js; the frame record,
   79-world-5frame.js): an entity whose object id has a model is drawn by it; none, or a failed build, falls back to the sprite.

   API
     worldModelDefine(id, def) -> def        register a model. def: {
         ids: [object ids | 'prefix*' | RegExp]   the library objects it draws; sampleObj?: the object the sheet and the checks stand in
         name?, float?: bool (sits at the waterline, bobs; the hull starts there and is never cut),
         dims?(info, ent) -> { L, B, H }          the size at scale 1 in metres (default: the library object's size)
         params?(ent, o, p) -> { ...overrides }   livery, size, age, seed, anything the build reads (default: from ent.model)
         liveries?: [ { name, ...colours } ] | { name: {...} } | () => those     palettes; p.livery is the chosen entry
         sunLit?: bool (default true: faces carry their normal and the scene sun tones them), bob?: { heave, roll, pitch } | false,
         solidity?: 'solid' | 'passable' | ..., footprint?(p) -> [[a, l]], samples?: [ { livery, size, age, seed } ] (the sheet),
         build(p, h) -> { height, footprint?, lights?, extra?, faces? } | void
       }
     worldModelFor(objId) -> def | null      worldModelHas(objId) -> bool      worldModelIds() -> [model id]
     worldModelGet(id) -> def | null         worldModelRemove(id) -> bool (scratch models of tests)
     worldModelList() -> [{ id, name, ids, float, liveries, samples }]
     worldModelParams(ent, o) -> p           seed, season, size, L, B, H, age, livery, variant, facing, moving, t ... (pure)
     worldModelBuild(ent, cam, o) -> prim | null    the prim worldExtrudeDraw draws ({ kind: 'hull', model: true, faces, foot, zKey,
                                             height, box, ... }); never throws (o.strict rethrows; worldModelError() is the last one)
     worldModelBuildWith(id, ent, cam, o)    the same with a named model (a registered model id)
     worldModelCheck(id, o) -> { ok, problems, stats }   the conformance run: 8 angles x 3 eyes x seasons x with and without a time:
                                             builds, finite faces, known materials, a face budget, a footprint, determinism, no clones
     worldModelFit(ent, info, model)         the entity's own size, height, footprint from the model parameters (the engine's core
                                             calls it for an entity that carries `model`)
     worldModelSpecCheck(model) -> string | null   the spec check of an entity's `model` key
     worldModelSizeOf(objId, model) -> { w, d, h } | null
     worldModelOutline(o) -> { outline, half, R }  a plan outline for hulls and bodies (round / transom / pointed ends)
     worldModelShade(hex, k), worldModelMix(a, b, t), worldModelAge(hex, age, kind)   colour helpers
   The builder context `h` (what build(p, h) gets) is documented in WORLD_MODELS.md and built by _wmdKit below.
   ============================================================ */
var _wmdS;   // the registry (var: hoisted, so an earlier file's worldModelDefine finds the slot and later this file's body leaves it)
function _wmdState() { return _wmdS || (_wmdS = { defs: new Map(), memo: new Map(), err: null }); }
const WORLD_MODEL_KEYS = Object.freeze(['livery', 'size', 'age', 'seed', 'opts']);
const WORLD_MODEL_ROLES_SEAL = Object.freeze(['hull', 'cabin', 'roof', 'cover', 'gunwale', 'deck', 'body', 'wall']);
const WORLD_MODEL_LIT = Object.freeze({ glass: '#ffd48a', curtain: '#f2b25e', lamp: '#ffe2a0' });

/* ---------- the registry ---------- */
function worldModelDefine(id, def) {
  if (typeof id !== 'string' || !id || !def || typeof def !== 'object') throw new Error('worldModelDefine(id, def): a model id and a definition');
  if (typeof def.build !== 'function') throw new Error(`model ${id}: build(p, h) is required`);
  const ids = Array.isArray(def.ids) ? def.ids : def.ids != null ? [def.ids] : [];
  if (!ids.length || ids.some(x => !(typeof x === 'string' && x) && !(x instanceof RegExp))) throw new Error(`model ${id}: ids is a list of object ids, 'prefix*' globs or RegExps`);
  const S = _wmdState();
  const d = Object.assign({}, def, { id, ids: ids.slice(), name: def.name || id, float: !!def.float });
  S.defs.set(id, d);
  S.memo.clear();
  return d;
}
function worldModelFor(objId) {
  if (typeof objId !== 'string') return null;
  const S = _wmdState();
  if (S.memo.has(objId)) return S.memo.get(objId);
  let hit = null;
  // an exact id beats a glob beats a RegExp; the later definition wins a tie
  for (const rank of [0, 1, 2]) {
    for (const d of S.defs.values()) {
      for (const x of d.ids) {
        const ok = rank === 0 ? x === objId : rank === 1 ? typeof x === 'string' && x.endsWith('*') && x !== objId && objId.startsWith(x.slice(0, -1)) : x instanceof RegExp && x.test(objId);
        if (ok) hit = d;
      }
    }
    if (hit) break;
  }
  S.memo.set(objId, hit);
  return hit;
}
/** Remove a model (tests and tools that define scratch models). */
function worldModelRemove(id) { const S = _wmdState(); const ok = S.defs.delete(id); S.memo.clear(); return ok; }
function worldModelHas(objId) { return !!worldModelFor(objId); }
/** A model that is not a hull falls back to the object's sprite when its build fails (worldExtrudeHull must not draw it as an art hull). */
function worldModelSpriteOnly(objId) { const d = worldModelFor(objId); return !!d && !d.float && d.hullFallback !== true; }
function worldModelIds() { return [..._wmdState().defs.keys()]; }
/** The registered definition of a model id (not an object id: worldModelFor). */
function worldModelGet(id) { return _wmdState().defs.get(id) || null; }
function worldModelList() {
  return [..._wmdState().defs.values()].map(d => ({ id: d.id, name: d.name, ids: d.ids.map(String), float: d.float, liveries: _wmdLiveries(d).map((l, i) => l.name || String(i)), samples: Array.isArray(d.samples) ? d.samples : [] }));
}
/** The error of the last failed build (null when none): a failed build falls back to the sprite, so the cause is kept here. */
function worldModelError() { return _wmdState().err; }
function _wmdLiveries(def) {
  const L = typeof def.liveries === 'function' ? def.liveries() : def.liveries;
  if (Array.isArray(L)) return L;
  if (L && typeof L === 'object') return Object.keys(L).map(k => Object.assign({ name: k }, L[k]));
  return [];
}

/* ---------- colour helpers ---------- */
const _wmdRgb = (hex) => { const n = parseInt(String(hex).slice(1), 16); return Number.isFinite(n) && String(hex).length === 7 ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [128, 128, 128]; };
const _wmdHex = (c) => '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
const _wmdC = (v) => Math.max(0, Math.min(255, Math.round(v)));
function worldModelShade(hex, k) { return _wexShade(hex, k); }
function worldModelMix(a, b, t) { const A = _wmdRgb(a), B = _wmdRgb(b), u = Math.max(0, Math.min(1, t)); return _wmdHex(A.map((v, i) => _wmdC(v + (B[i] - v) * u))); }
/**
 * Weathering by age (0 new .. 1 old). kind: 'paint' fades to a chalky grey and darkens; 'metal' rusts; 'timber' silvers; 'fabric'
 * bleaches; 'stone' darkens and greens a little; anything else behaves as paint. Pure and deterministic.
 */
function worldModelAge(hex, age, kind) {
  const a = Math.max(0, Math.min(1, Number(age) || 0));
  if (a <= 0.001) return hex;
  const T = { paint: ['#8d8a82', 0.34, 0.93], metal: ['#7d4c2c', 0.42, 0.9], timber: ['#8f8c85', 0.5, 0.92], fabric: ['#d3cbb8', 0.4, 0.97], stone: ['#6f7466', 0.3, 0.88] }, t = T[kind] || T.paint;
  return _wexShade(worldModelMix(hex, t[0], t[1] * a), 1 - (1 - t[2]) * a);
}

/* ---------- parameters ---------- */
function _wmdU(seed, key) { return (_wexHash(seed + '|' + key) % 100000) / 100000; }
/** The model key of an entity spec checked: a string naming the first problem, or null. */
function worldModelSpecCheck(m) {
  if (m == null) return null;
  if (typeof m !== 'object' || Array.isArray(m)) return 'model is an object { livery, size, age, seed, opts }';
  for (const k of Object.keys(m)) if (!WORLD_MODEL_KEYS.includes(k)) return `model.${k} is not a model key (${WORLD_MODEL_KEYS.join(', ')})`;
  if (m.livery != null && !(typeof m.livery === 'string' || (Number.isInteger(m.livery) && m.livery >= 0))) return 'model.livery is a name or an index';
  if (m.size != null) {
    if (_wexNum(m.size)) { if (!(m.size >= 0.2 && m.size <= 5)) return 'model.size is a scale between 0.2 and 5'; }
    else if (m.size && typeof m.size === 'object') { for (const k of Object.keys(m.size)) if (!['l', 'w', 'h'].includes(k) || !(_wexNum(m.size[k]) && m.size[k] > 0 && m.size[k] < 400)) return 'model.size is a scale or { l, w, h } metres'; }
    else return 'model.size is a scale or { l, w, h } metres';
  }
  if (m.age != null && !(_wexNum(m.age) && m.age >= 0 && m.age <= 1)) return 'model.age is 0 (new) .. 1 (old)';
  if (m.seed != null && !Number.isInteger(m.seed)) return 'model.seed is an integer';
  if (m.opts != null && (typeof m.opts !== 'object' || Array.isArray(m.opts) || Object.values(m.opts).some(v => !['string', 'number', 'boolean'].includes(typeof v)))) return 'model.opts is an object of strings, numbers and booleans';
  return null;
}
/** The parameters of an entity's model: see the header. Pure. */
function worldModelParams(ent, o, defIn) {
  o = o || {};
  if (!ent) return null;
  const def = defIn || worldModelFor(ent.obj);
  if (!def) return null;
  const m = ent.model && typeof ent.model === 'object' ? ent.model : {};
  const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(ent.obj) : null, sz = info && info.size ? info.size : null;
  const variant = ent.variant | 0;
  const idKey = String(ent.id != null ? ent.id : ent.obj + '@' + ent.x + ',' + ent.z);
  const seed = _wexHash(idKey + '|' + variant + (Number.isInteger(m.seed) ? '|s' + m.seed : ''));
  // size: the library's, or the model's own (dims), then the scene's scale or metres
  let L = 1, B = 0.6, H = 1;
  const d0 = typeof def.dims === 'function' ? def.dims(info, ent) : null;
  if (d0 && _wexNum(d0.L)) { L = d0.L; B = _wexNum(d0.B) ? d0.B : L * 0.3; H = _wexNum(d0.H) ? d0.H : L * 0.3; }
  else if (sz) { L = info.front ? sz.d : sz.w; B = info.front ? sz.w : sz.d; H = sz.h; }
  let scale = 1;
  if (_wexNum(m.size)) { scale = m.size; L *= scale; B *= scale; H *= scale; }
  else if (m.size && typeof m.size === 'object') {
    const kx = _wexNum(m.size.l) ? m.size.l / L : null;
    if (_wexNum(m.size.l)) L = m.size.l;
    if (_wexNum(m.size.w)) B = m.size.w; else if (kx) B *= kx;
    if (_wexNum(m.size.h)) H = m.size.h; else if (kx) H *= kx;
    scale = kx || 1;
  }
  const an = ent.anim, sp = Math.hypot(ent.vx || 0, ent.vz || 0), moving = sp > 0.05;
  const facing = moving ? Math.atan2(ent.vx, ent.vz) * 180 / Math.PI : _wexNum(ent.facing) ? ent.facing : 90;
  // the animation clock: the caller's (o.t), else an agent's own (a cruising boat is rebuilt every frame); none for a baked static
  const t = _wexNum(o.t) ? o.t : ent.static === false && an && _wexNum(an.t) ? an.t + (_wexNum(an.phase) ? an.phase * 5 : 0) : null;
  const p = { model: def.id, obj: ent.obj, seed, variant, season: o.season || ent.season || 'summer', size: scale, L, B, H, info,
    age: _wexNum(m.age) ? Math.max(0, Math.min(1, m.age)) : _wexNum(def.age) ? def.age : 0.1 + 0.55 * _wmdU(seed, 'age'),
    liveryKey: m.livery != null ? m.livery : null, opts: m.opts && typeof m.opts === 'object' ? Object.assign({}, m.opts) : {},
    moving, speed: sp, facing, t, static: ent.static !== false, sea: _wexNum(o.sea) ? Math.max(0, Math.min(2, o.sea)) : null };
  if (typeof def.params === 'function') {
    const x = def.params(ent, o, p);
    if (x && typeof x === 'object') Object.assign(p, x);
  }
  // the livery: a name, an index, the def's own pick (params), else seeded
  const LV = _wmdLiveries(def);
  if (LV.length) {
    let k = p.liveryKey, i = -1;
    if (typeof k === 'string') i = LV.findIndex(l => l.name === k);
    else if (Number.isInteger(k)) i = k % LV.length;
    if (i < 0) i = _wexHash(seed + '|livery') % LV.length;
    p.livery = LV[i]; p.liveryIndex = i; p.liveryName = LV[i].name || String(i);
  } else { p.livery = null; p.liveryIndex = null; p.liveryName = null; }
  return p;
}
/** The size { w, d, h } of an object's model with a scene's `model` key (null: no model). */
function worldModelSizeOf(objId, model) {
  const def = worldModelFor(objId);
  if (!def) return null;
  const p = worldModelParams({ obj: objId, x: 0, z: 1, id: null, model: model || null }, {}, def);
  return p ? { w: _wexR(p.L, 3), d: _wexR(p.B, 3), h: _wexR(p.H, 3) } : null;
}
/**
 * The entity's own size, height and footprint from its model parameters (a scene that says { obj: 'boat.ferry', model: { size: 1.3 } }
 * gets a 1.3 x larger footprint for the nav grid, the solver and the occlusion order). Sets ent.size, ent.height, ent.foot, ent.model.
 */
function worldModelFit(ent, info, model) {
  if (!ent || !model || typeof model !== 'object') return null;
  const def = worldModelFor(ent.obj);
  if (!def) return null;
  ent.model = Object.assign({}, model);
  const p = worldModelParams(Object.assign({}, ent, { model }), {}, def);
  if (!p) return null;
  ent.size = Object.freeze({ w: _wexR(p.L, 3), d: _wexR(p.B, 3), h: _wexR(p.H, 3) });
  ent.height = _wexR(p.H, 3);
  const f = (_wexNum(ent.facing) ? ent.facing : 0) * Math.PI / 180, hx = Math.sin(f), hz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  const poly = typeof def.footprint === 'function' ? def.footprint(p) : [[-p.L / 2, -p.B / 2], [p.L / 2, -p.B / 2], [p.L / 2, p.B / 2], [-p.L / 2, p.B / 2]];
  ent.foot = poly.map(([u, v]) => [_wexR(ent.x + u * hx + v * rx, 3), _wexR(ent.z + u * hz + v * rz, 3)]);
  return ent;
}

/* ---------- shapes ---------- */
/**
 * A plan outline (a, l): from the stern's tip round the right side to the stem and back down the left, closed. o: { L, B,
 * bowLen (default 0.2 L), bowPow (the stem's curve: 1 straight, 1.9 a sweep), sternLen, stern: 'round' | 'transom' | 'point',
 * step (metres between straight-side points), n (points per curved end) }. Returns { outline, half(a), R (the right side only) }.
 */
function worldModelOutline(o) {
  o = o || {};
  const L = o.L || 10, B = o.B || 3, hb = B / 2, s0 = -L / 2, bowA = L / 2;
  const bowLen = Math.min(L * 0.45, o.bowLen != null ? o.bowLen : 0.2 * L), pw = o.bowPow || 1.9, sternLen = Math.min(L * 0.4, o.sternLen != null ? o.sternLen : 0.07 * L);
  const stern = o.stern || 'round', n = Math.max(3, o.n || 8), step = o.step || Math.max(1, L / 8);
  const half = (a) => {
    if (a > bowA - bowLen) { const u = (a - (bowA - bowLen)) / bowLen; return hb * (1 - Math.pow(Math.min(1, Math.max(0, u)), pw)); }
    if (a < s0 + sternLen && sternLen > 1e-6) {
      const u = (s0 + sternLen - a) / sternLen;
      return stern === 'point' ? hb * Math.max(0, 1 - u) : stern === 'transom' ? hb * (1 - 0.18 * u) : hb * Math.sqrt(Math.max(0, 1 - u * u));
    }
    return hb;
  };
  const R = [];
  if (stern === 'round' && sternLen > 1e-6) for (let k = 0; k <= 5; k++) { const th = k / 5 * Math.PI / 2; R.push([s0 + sternLen * (1 - Math.cos(th)), hb * Math.sin(th)]); }
  else R.push([s0, stern === 'point' ? 0 : half(s0)]);
  if (stern !== 'round' && sternLen > 1e-6) for (let k = 1; k <= 3; k++) { const a = s0 + sternLen * k / 3; R.push([a, half(a)]); }
  for (let a = s0 + sternLen + step; a < bowA - bowLen - 0.3 * step; a += step) R.push([a, hb]);
  for (let k = 0; k <= n; k++) { const a = bowA - bowLen + bowLen * k / n; R.push([a, half(a)]); }
  const outline = R.concat(R.slice(1, -1).reverse().map(([a, l]) => [a, -l]));
  // a transom stern is closed by the last point meeting its mirror: when the end has a width, the first and last points are the corners
  return { outline, half, R };
}

/** The swell motion of a moored floater from its idle bob: about four times the heave and three times the roll and pitch, a touch slower. */
function _wmdMoorOf(b) {
  b = b && typeof b === 'object' ? b : {};
  return { heave: (b.heave == null ? 0.01 : b.heave) * 4, roll: (b.roll == null ? 0.006 : b.roll) * 3, pitch: (b.pitch == null ? 0.0015 : b.pitch) * 3, period: (b.period == null ? 3.6 : b.period) * 1.15 };
}
/** Does the model of this object rock when it lies moored in a swell (a floater with a bob)? */
function worldModelRocks(objId) {
  const def = typeof worldModelFor === 'function' ? worldModelFor(objId) : null;
  return !!(def && def.float && def.bob !== false);
}
/* ---------- the builder context ---------- */
function _wmdKit(def, p, ent, cam, o) {
  const near = _wexNear(cam), y0 = _wexNum(ent.y) ? ent.y : 0;
  const base = def.float && _wexNum(ent.waterline) ? Math.max(y0, ent.waterline) : y0;
  const fr = p.facing * Math.PI / 180, ax = Math.sin(fr), az = Math.cos(fr), rx = az, rz = -ax;
  const pose = { heave: 0, roll: 0, pitch: 0 };
  // model (a along the facing, l across to the right, y up from the base) -> camera metres; y is relative to the base
  const PA = (a, l, y) => [ent.x + ax * a + rx * l, y + pose.heave + l * pose.roll + a * pose.pitch, ent.z + az * a + rz * l];
  const P = (a, l, y) => PA(a, l, base + y);
  const h = { cam, ent, o, p, def, base, near, pose, P, PA, ax, az, rx, rz, floats: !!def.float, eyeY: cam.eye - base,
    waterline: def.float && _wexNum(ent.waterline) ? ent.waterline : null, lights: [], sealRoles: new Set(WORLD_MODEL_ROLES_SEAL) };
  h.centre = P(0, 0, p.H / 2);
  // ---- seeded streams: rnd() is the model's own sequence; u(key) a separate stream per key (adding one never shifts another) ----
  const rng = (() => { let a = p.seed || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  h.rnd = rng;
  h.u = (key) => _wmdU(p.seed, key);
  h.between = (a, b) => a + (b - a) * rng();
  h.chance = (q) => rng() < q;
  h.pick = (arr) => arr[Math.floor(rng() * arr.length) % arr.length];
  h.aboard = h.u('aboard');   // a seeded share of models has someone about: their windows light after dusk
  // ---- level of detail: pixels a feature of m metres spans at the nearest point ----
  h.lod = (zMin) => { h.zMin = Math.max(near, zMin); h.px = m => cam.f * m / h.zMin; h.fine = h.px(0.1) >= 1.5; h.finer = h.px(0.05) >= 1.5; };
  h.lod(Math.min(...[[-p.L / 2, 0], [p.L / 2, 0], [0, p.B / 2], [0, -p.B / 2], [0, 0]].map(([a, l]) => P(a, l, 0)[2])));
  // ---- the bob (a floater, when a time is given) ----
  h.bob = (spec) => {
    if (p.t == null) return;
    const b = Object.assign({ heave: 0.01, roll: 0.006, pitch: 0.0015, period: 3.6 }, spec || {}), k = (p.moving ? 1.8 : 1) * (_wexNum(b.k) ? b.k : 1), ph = h.u('bob1') * Math.PI * 2, ph2 = h.u('bob2') * Math.PI * 2;
    pose.heave = k * b.heave * Math.sin(p.t * 2 * Math.PI / b.period + ph);
    pose.roll = k * b.roll * Math.sin(p.t * 2 * Math.PI / (b.period * 1.3) + ph2);
    pose.pitch = b.pitch * Math.sin(p.t * 2 * Math.PI / (b.period * 1.47) + ph * 0.6);
  };
  // a floater MOORED in open water (the caller gives the sea state, o.sea: the frame's live statics, never a baked one) rocks in the swell:
  // the def's `moor` { heave, roll, pitch, period } (metres, radians, seconds), else its idle bob scaled up (a dinghy's 3 cm is a swell's 12);
  // scaled by the sea (about 0.1 in a flat calm, 1 in a fresh breeze) so a calm day is still
  if (def.float && def.bob !== false) {
    if (p.sea != null && p.t != null) h.bob(Object.assign({}, def.moor || _wmdMoorOf(def.bob), { k: p.sea }));
    else h.bob(def.bob);
  }
  // ---- parts: faces are emitted into the current part; parts draw by layer, then far to near ----
  const parts = [];
  let cur = null, count = 0;
  const FACE_CAP = def.faceCap || 2500;
  h.part = (name, po) => {
    po = po || {};
    let q = parts.find(x => x.name === name);
    if (!q) { q = { name, layer: _wexNum(po.layer) ? po.layer : 0, key: _wexNum(po.key) ? po.key : null, faces: [], n: 0, sx: 0, sy: 0, sz: 0 }; parts.push(q); }
    else { if (_wexNum(po.layer)) q.layer = po.layer; if (_wexNum(po.key)) q.key = po.key; }
    cur = q;
    return q.faces;
  };
  h.part('body');
  const push = (fc, c) => { if (count >= FACE_CAP) return null; count++; cur.faces.push(fc); cur.n++; cur.sx += c[0]; cur.sy += c[1]; cur.sz += c[2]; return fc; };
  const zOf = pts3 => pts3.reduce((s, q) => s + q[2], 0) / pts3.length;
  const cOf = pts3 => [0, 1, 2].map(i => pts3.reduce((s, q) => s + q[i], 0) / pts3.length);
  /** The outward normal (camera frame) of a model-frame direction [da, dl, dy]. */
  h.nOf = (d) => { const L = Math.hypot(d[0], d[1], d[2]) || 1; return [(ax * d[0] + rx * d[1]) / L, d[2] / L, (az * d[0] + rz * d[1]) / L]; };
  const sunN = (n) => (n && def.sunLit !== false ? { n: [_wexR(n[0], 2), _wexR(n[1], 2), _wexR(n[2], 2)], sun: 1 } : null);
  const skyShade = (hex, n) => def.light === 'flat' ? hex : _wexShade(hex, _wexLit(n));
  /**
   * A face (3D points): culled by its outward normal (pointing away from `inside`, a 3D point inside the solid; h.centre when
   * undefined; null: a flat piece drawn from both sides, never culled; 'two': two-sided but shaded toward the eye), shaded by
   * the soft sky, and carrying its normal for the sun.
   */
  h.face = (pts3, hex, mat, role, inside, extra) => {
    let n = null, sn = null;
    const c = cOf(pts3);
    if (extra && extra.shadeN) { sn = extra.shadeN; extra = Object.assign({}, extra); delete extra.shadeN; }   // shade (and sun-tone) by this normal: a smooth cloth
    if (inside !== null) {
      n = _wexNewell(pts3);
      if (inside === 'two') { if (n[0] * -c[0] + n[1] * (cam.eye - c[1]) + n[2] * -c[2] < 0) n = n.map(v => -v); }
      else {
        const ref = inside || h.centre;
        if (n[0] * (c[0] - ref[0]) + n[1] * (c[1] - ref[1]) + n[2] * (c[2] - ref[2]) < 0) n = n.map(v => -v);
        if (!_wexSees(cam, n, c)) return null;
      }
    }
    const pts = _wexProjPoly(cam, pts3);
    if (!pts) return null;
    if (n && sn) n = sn;
    const fc = Object.assign({ pts, hex: n ? skyShade(hex, n) : hex, mat: _wmdMat(mat), role, z: _wexR(zOf(pts3), 3) }, h.sealRoles.has(role) ? { seal: true } : null, sunN(n), extra || {});
    return push(fc, c);
  };
  /** A line in 3D (a rope, a rail, a stay, a tiller): its width in metres, drawn at its own depth. */
  h.line = (pts3, wM, hex, mat, role, extra) => {
    const q = pts3.filter(v => v[2] >= near);
    if (q.length < 2) return null;
    const z = zOf(q);
    return push(Object.assign({ line: true, pts: q.map(v => _wexP(cam, v[0], v[2], v[1]).map(x => _wexR(x, 2))), w: _wexR(Math.max(0.5, cam.f * wM / z), 2), hex, mat: _wmdMat(mat), role, z: _wexR(z, 3) }, extra || {}), cOf(q));
  };
  /** A disc facing the eye (a fender, a pot plant, a vent cap, a lamp glass); k squashes it. */
  h.disc = (c3, r, hex, mat, role, k, extra) => {
    if (c3[2] < near) return null;
    const q = _wexP(cam, c3[0], c3[2], c3[1]), rp = cam.f * r / c3[2], ry = rp * (k || 1), pts = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; pts.push([_wexR(q[0] + Math.cos(a) * rp, 2), _wexR(q[1] + Math.sin(a) * ry, 2)]); }
    return push(Object.assign({ pts, hex, mat: _wmdMat(mat), role, z: _wexR(c3[2], 3) }, extra || {}), c3);
  };
  /** A box (a0..a1 along, l0..l1 across, ya..yb up from the base): its seen sides, then its top. */
  h.box = (a0, a1, l0, l1, ya, yb, hex, top, mat, role, extra) => {
    const ins = P((a0 + a1) / 2, (l0 + l1) / 2, (ya + yb) / 2);
    h.face([P(a0, l0, ya), P(a1, l0, ya), P(a1, l0, yb), P(a0, l0, yb)], hex, mat, role, ins, extra);
    h.face([P(a0, l1, ya), P(a1, l1, ya), P(a1, l1, yb), P(a0, l1, yb)], hex, mat, role, ins, extra);
    h.face([P(a0, l0, ya), P(a0, l1, ya), P(a0, l1, yb), P(a0, l0, yb)], hex, mat, role, ins, extra);
    h.face([P(a1, l0, ya), P(a1, l1, ya), P(a1, l1, yb), P(a1, l0, yb)], hex, mat, role, ins, extra);
    h.face([P(a0, l0, yb), P(a1, l0, yb), P(a1, l1, yb), P(a0, l1, yb)], top || hex, mat, role, ins, extra);
  };
  /**
   * A solid between two plan outlines of equal length (a, l) at heights y0 and y1: its seen sides, then its cap (cap: a colour,
   * false for none). prism = one outline at both heights; a tapered cabin, a funnel, a tower is a frustum.
   */
  h.frustum = (plan0, y0, plan1, y1, hex, o2) => {
    o2 = o2 || {};
    const n = plan0.length, mat = o2.mat || 'paint', role = o2.role || 'body';
    const ma = plan0.reduce((s, q) => s + q[0], 0) / n, ml = plan0.reduce((s, q) => s + q[1], 0) / n;
    const ins = o2.inside || P(ma, ml, (y0 + y1) / 2);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      h.face([P(plan0[i][0], plan0[i][1], y0), P(plan0[j][0], plan0[j][1], y0), P(plan1[j][0], plan1[j][1], y1), P(plan1[i][0], plan1[i][1], y1)], hex, mat, role, ins, o2.extra);
    }
    if (o2.cap !== false) h.face(plan1.map(([a, l]) => P(a, l, y1)), typeof o2.cap === 'string' ? o2.cap : hex, mat, role, ins, o2.extra);
  };
  h.prism = (plan, y0, y1, hex, o2) => h.frustum(plan, y0, plan, y1, hex, o2);
  /** The regular polygon of n facets, radius r, at (a, l): for cylinders and cones. */
  h.ngon = (a, l, r, n, rot) => { const out = []; for (let k = 0; k < n; k++) { const th = (rot || 0) + k / n * Math.PI * 2; out.push([a + Math.cos(th) * r, l + Math.sin(th) * r]); } return out; };
  const facets = r => { const pxr = h.px(r); return pxr < 3 ? 6 : pxr < 12 ? 8 : 12; };
  /** A vertical cylinder or cone frustum (r0 at y0, r1 at y1): a lamp post, a funnel, a barrel, a chimney, a mast step. */
  h.cyl = (a, l, y0, y1, r0, r1, hex, o2) => { o2 = o2 || {}; const n = o2.n || facets(Math.max(r0, r1)); h.frustum(h.ngon(a, l, r0, n), y0, h.ngon(a, l, r1 == null ? r0 : r1, n), y1, hex, o2); };
  /** A tube between two model points (a, l, y), radius r: a boom, a pipe, a tyre, a log, a roll. */
  h.tube = (p0, p1, r, hex, mat, role, o2) => {
    o2 = o2 || {};
    const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], Ld = Math.hypot(d[0], d[1], d[2]) || 1e-9;
    d[0] /= Ld; d[1] /= Ld; d[2] /= Ld;
    const ref = Math.abs(d[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    const cr = (x, y) => [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
    let u = cr(d, ref); const lu = Math.hypot(u[0], u[1], u[2]) || 1; u = u.map(v => v / lu);
    const v = cr(d, u), n = o2.n || facets(r), ring0 = [], ring1 = [];
    for (let k = 0; k < n; k++) {
      const th = (k + 0.5) / n * Math.PI * 2, c = Math.cos(th) * r, s = Math.sin(th) * r, off = [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s];
      ring0.push(P(p0[0] + off[0], p0[1] + off[1], p0[2] + off[2])); ring1.push(P(p1[0] + off[0], p1[1] + off[1], p1[2] + off[2]));
    }
    const ins = P((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2);
    for (let k = 0; k < n; k++) { const j = (k + 1) % n; h.face([ring0[k], ring0[j], ring1[j], ring1[k]], hex, mat, role, ins, o2.extra); }
    if (o2.cap !== false) { h.face(ring1, o2.capHex || hex, mat, role, ins, o2.extra); h.face(ring0, o2.capHex || hex, mat, role, ins, o2.extra); }
  };
  /**
   * A wheel at (a, l, y) of radius r in the vertical plane along the facing (o.axis 'l', the default: a cart, a bicycle, a pram)
   * or across it (axis 'a'): a tyre of width o.w, a rim, spokes on the side the eye sees, and a hub.
   */
  h.wheel = (a, l, y, r, o2) => {
    o2 = o2 || {};
    const w = o2.w || r * 0.22, tyre = o2.tyre || '#1d1d1f', rim = o2.rim || '#9a9ea3', ax2 = o2.axis === 'a' ? 'a' : 'l';
    const e0 = ax2 === 'l' ? [a, l - w / 2, y] : [a - w / 2, l, y], e1 = ax2 === 'l' ? [a, l + w / 2, y] : [a + w / 2, l, y];
    if (o2.tyreOn !== false) h.tube(e0, e1, r, tyre, 'metal', 'tyre', { n: o2.n || Math.max(10, facets(r) * 2), cap: false });
    // the sides: a rim disc and spokes on the side facing the eye
    const side = ax2 === 'l' ? [0, 1, 0] : [1, 0, 0], eyeSide = h.sees(side, [a, l, y]) ? 1 : -1;
    const off = (w / 2 + 0.004) * eyeSide, nn = Math.max(10, facets(r) * 2), ringAt = (rr) => { const pts = []; for (let k = 0; k < nn; k++) { const th = k / nn * Math.PI * 2, c = Math.cos(th) * rr, s = Math.sin(th) * rr; pts.push(ax2 === 'l' ? P(a + c, l + off, y + s) : P(a + off, l + c, y + s)); } return pts; };
    h.face(ringAt(r * 0.86), o2.disc || rim, 'metal', 'rim', null, o2.extra);
    if (h.px(r) >= 6) {
      const sp = o2.spokes || 8;
      for (let k = 0; k < sp; k++) { const th = k / sp * Math.PI * 2, c = Math.cos(th), s = Math.sin(th); h.line([ax2 === 'l' ? P(a, l + off * 1.2, y) : P(a + off * 1.2, l, y), ax2 === 'l' ? P(a + c * r * 0.84, l + off * 1.2, y + s * r * 0.84) : P(a + off * 1.2, l + c * r * 0.84, y + s * r * 0.84)], Math.max(0.004, r * 0.025), o2.spoke || '#6c7075', 'metal', 'spoke'); }
    }
    h.disc(ax2 === 'l' ? P(a, l + off * 1.3, y) : P(a + off * 1.3, l, y), r * 0.12, '#55595e', 'metal', 'hub', 1);
  };
  /** A gable roof over a box: a0..a1 x l0..l1 at eave height yE, ridge yR along the facing (ridge 'a') or across (ridge 'l'). */
  h.gable = (a0, a1, l0, l1, yE, yR, hex, o2) => {
    o2 = o2 || {};
    const ov = o2.over || 0, mat = o2.mat || 'slate', role = o2.role || 'roof', alongA = o2.ridge !== 'l';
    const E = alongA ? [l0, l1] : [a0, a1], R = alongA ? [a0, a1] : [l0, l1], m = (E[0] + E[1]) / 2, slope = (yR - yE) / ((E[1] - E[0]) / 2 || 1);
    const at = (r, e, y) => alongA ? P(r, e, y) : P(e, r, y);
    const e0 = E[0] - ov, e1 = E[1] + ov, r0 = R[0] - ov, r1 = R[1] + ov, yo = yE - ov * slope;
    const ins = alongA ? P((a0 + a1) / 2, m, yE - 1) : P(m, (l0 + l1) / 2, yE - 1);
    h.face([at(r0, e0, yo), at(r1, e0, yo), at(r1, m, yR), at(r0, m, yR)], hex, mat, role, ins, o2.extra);
    h.face([at(r0, e1, yo), at(r1, e1, yo), at(r1, m, yR), at(r0, m, yR)], hex, mat, role, ins, o2.extra);
    for (const r of [R[0], R[1]]) h.face([at(r, E[0], yE), at(r, E[1], yE), at(r, m, yR)], o2.end || hex, o2.endMat || 'render', 'gable', ins, o2.extra);
  };
  /** A hipped roof (a pyramid when the plan is square) over a0..a1 x l0..l1 at eave yE, apex or ridge at yR. */
  h.hip = (a0, a1, l0, l1, yE, yR, hex, o2) => {
    o2 = o2 || {};
    const mat = o2.mat || 'tile', role = o2.role || 'roof', ins = P((a0 + a1) / 2, (l0 + l1) / 2, yE - 1);
    const lm = (l0 + l1) / 2, inset = Math.min((l1 - l0) / 2, (a1 - a0) / 2), ra = a0 + inset, rb = a1 - inset;
    h.face([P(a0, l0, yE), P(a1, l0, yE), P(rb, lm, yR), P(ra, lm, yR)], hex, mat, role, ins, o2.extra);
    h.face([P(a0, l1, yE), P(a1, l1, yE), P(rb, lm, yR), P(ra, lm, yR)], hex, mat, role, ins, o2.extra);
    h.face([P(a0, l0, yE), P(a0, l1, yE), P(ra, lm, yR)], hex, mat, role, ins, o2.extra);
    h.face([P(a1, l0, yE), P(a1, l1, yE), P(rb, lm, yR)], hex, mat, role, ins, o2.extra);
  };
  /**
   * A cloth with a belly (a sail, an awning, a flag, a tarpaulin): its four corners in order round the cloth ([a, l, y] each; a
   * triangle repeats a corner), the belly in metres (toward o.side +1 / -1 of the cloth's normal), cut into nu x nv cells.
   * Two-sided, shaded toward the eye; o.stripe: [hexA, hexB] alternates the cells along the first edge (an awning).
   */
  h.cloth = (c, belly, hex, o2) => {
    o2 = o2 || {};
    const mat = o2.mat || 'fabric', role = o2.role || 'cloth';
    const [p00, p10, p11, p01] = c;
    const d3 = (A, B) => Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
    // cells by size on screen (about one cell per 16 px, 2 to 10 along each edge) unless the caller says
    const wU = (d3(p00, p10) + d3(p01, p11)) / 2, wV = (d3(p00, p01) + d3(p10, p11)) / 2, cells = (m) => Math.max(2, Math.min(10, Math.ceil(h.px(m) / 16)));
    const nu = o2.nu || cells(wU), nv = o2.nv || Math.max(1, cells(wV) - 1);
    const e1 = [p10[0] - p00[0], p10[1] - p00[1], p10[2] - p00[2]], e2 = [p01[0] - p00[0], p01[1] - p00[1], p01[2] - p00[2]];
    let N = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const ln = Math.hypot(N[0], N[1], N[2]) || 1; N = N.map(v => v / ln * (o2.side < 0 ? -1 : 1));
    const Q = (u, v) => {
      const k = belly * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      return [0, 1, 2].map(i => (1 - u) * (1 - v) * p00[i] + u * (1 - v) * p10[i] + u * v * p11[i] + (1 - u) * v * p01[i] + N[i] * k);
    };
    // the cloth's own mean normal, toward the eye: cells are shaded by a blend of theirs and this one, so a belly reads as a soft
    // curve, never as facets (the paper-triangle look)
    const mid = Q(0.5, 0.5), mc = P(mid[0], mid[1], mid[2]);
    let Nc = h.nOf(N);
    if (Nc[0] * -mc[0] + Nc[1] * (cam.eye - mc[1]) + Nc[2] * -mc[2] < 0) Nc = Nc.map(v => -v);
    const dup = (A, B) => d3(A, B) < 1e-6;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const u0 = i / nu, u1 = (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv, q = [Q(u0, v0), Q(u1, v0), Q(u1, v1), Q(u0, v1)];
      const pts3 = q.filter((v, k) => !dup(v, q[(k + 1) % 4])).map(v => P(v[0], v[1], v[2]));
      if (pts3.length < 3) continue;
      let nn = _wexNewell(pts3);
      if (nn[0] * -mc[0] + nn[1] * (cam.eye - mc[1]) + nn[2] * -mc[2] < 0) nn = nn.map(v => -v);
      const bl = nn.map((v, k) => v * 0.3 + Nc[k] * 0.7), lb = Math.hypot(bl[0], bl[1], bl[2]) || 1;
      h.face(pts3, o2.stripe ? o2.stripe[i % 2] : hex, mat, role, 'two', Object.assign({ shadeN: bl.map(v => v / lb) }, o2.extra || null));
    }
    // seams: thin darker lines across the cloth (a sail's panels, an awning's ribs), only where they can be seen
    if (o2.seams && h.fine) for (let k = 1; k <= o2.seams; k++) {
      const v = k / (o2.seams + 1), pts = [];
      for (let i = 0; i <= nu; i++) { const q = Q(i / nu, v); pts.push(P(q[0], q[1], q[2])); }
      h.line(pts, 0.012, _wexShade(hex, 0.8), mat, role + '-seam');
    }
  };
  /** A rail run along a plan path [[a, l]...] at y (the foot), height hgt: a top rail, optional mid rail and posts every `post` m. */
  h.rail = (path, y, hgt, hex, o2) => {
    o2 = o2 || {};
    const mat = o2.mat || 'metal', role = o2.role || 'rail', w = o2.w || 0.03;
    h.line(path.map(([a, l]) => P(a, l, y + hgt)), w, hex, mat, role);
    if (o2.mid) h.line(path.map(([a, l]) => P(a, l, y + hgt * 0.5)), w * 0.8, hex, mat, role);
    const step = o2.post || 1.2;
    if (h.px(step) < 4 && o2.post == null) return;
    let acc = 0;
    for (let i = 0; i < path.length; i++) {
      const pt = path[i];
      const put = (a, l) => h.line([P(a, l, y), P(a, l, y + hgt)], w * 0.9, hex, mat, role);
      if (i === 0) put(pt[0], pt[1]);
      else {
        const q = path[i - 1], seg = Math.hypot(pt[0] - q[0], pt[1] - q[1]);
        for (let s = step - acc; s < seg; s += step) put(q[0] + (pt[0] - q[0]) * s / seg, q[1] + (pt[1] - q[1]) * s / seg);
        acc = (acc + seg) % step;
        if (i === path.length - 1) put(pt[0], pt[1]);
      }
    }
  };
  /** A mast at (a, l) from y0 to y1 (o.rake: metres aft at the top), with o.stays [[a, l, y]...] run from its head and shrouds from the spreaders. */
  h.mast = (a, l, y0, y1, o2) => {
    o2 = o2 || {};
    const r = o2.r || 0.05, hex = o2.hex || '#cfc7b6', rake = o2.rake || 0, top = P(a - rake, l, y1), foot = P(a, l, y0);
    h.line([foot, top], r * 2, hex, 'timber', 'mast');
    if (o2.spreader != null) {
      const ys = y0 + (y1 - y0) * o2.spreader, w = o2.spreadW || 0.5, pm = P(a - rake * o2.spreader, l, ys);
      h.line([P(a - rake * o2.spreader, l - w, ys), P(a - rake * o2.spreader, l + w, ys)], r * 1.2, hex, 'timber', 'spreader');
      for (const sg of [-1, 1]) h.line([top, P(a - rake * o2.spreader, l + sg * w, ys), P(a + (o2.chain || 0.1), l + sg * (o2.chainL || w * 1.3), 0.15)], 0.012, '#7d8186', 'metal', 'shroud');
      void pm;
    }
    for (const s of o2.stays || []) h.line([top, P(s[0], s[1], s[2])], 0.012, '#7d8186', 'metal', 'stay');
  };
  /**
   * Decals on a surface mapped by fn(u, v, off) -> a 3D point (off: metres proud of the surface): rect, ring and a row of
   * windows. Faces are two-sided: the caller only decorates surfaces that face the eye (h.sees). o.normal: the surface's outward
   * direction [da, dl, dy] (sky shade and the sun's normal).
   */
  h.surface = (fn, o2) => {
    o2 = o2 || {};
    const nrm = o2.normal ? h.nOf(o2.normal) : null, lit = nrm ? _wexLit(nrm) : 1;
    const S = hex => (nrm ? _wexShade(hex, lit) : hex), ex = (e) => Object.assign({}, nrm ? sunN(nrm) : null, e || null);
    const D = {
      rect: (u0, u1, v0, v1, hex, mat, role, off, extra) => h.face([fn(u0, v0, off || 0.006), fn(u1, v0, off || 0.006), fn(u1, v1, off || 0.006), fn(u0, v1, off || 0.006)], S(hex), mat, role, null, ex(extra)),
      ring: (uc, vc, r, hex, mat, role, off, extra, arc) => {
        const pts = [];
        if (arc) for (let k = 0; k <= 7; k++) { const th = arc[0] + (arc[1] - arc[0]) * k / 7; pts.push(fn(uc + Math.cos(th) * r, vc + Math.sin(th) * r, off || 0.006)); }
        else for (let k = 0; k < 12; k++) { const th = k / 12 * Math.PI * 2; pts.push(fn(uc + Math.cos(th) * r, vc + Math.sin(th) * r, off || 0.006)); }
        return h.face(pts, S(hex), mat, role, null, ex(extra));
      },
      /** A row of windows along u at height v: { u0, u1, v, step, kind 'port' | 'rect', r, w, h, glass, trim, curtain, gaps, dark (share unlit) }. */
      windows: (w) => {
        const out = [], gaps = w.gaps || [], step = w.step || (w.kind === 'port' ? 0.95 : 1.55), dark = w.dark == null ? 0.18 : w.dark;
        for (let u = w.u0; u < w.u1; u += step) {
          if (gaps.some(([g0, g1]) => u > g0 && u < g1)) continue;
          const fx = h.litFx(rng() < dark), cf = { theta: fx.theta, lit: WORLD_MODEL_LIT.curtain };
          if (w.kind === 'port') {
            const r = w.r || 0.12;
            D.ring(u, w.v, r * 1.35, w.trim || '#c9a24a', 'metal', 'brass', 0.01);
            out.push(D.ring(u, w.v, r, w.glass || '#9fb3bd', 'glass', 'window', 0.012, fx));
            if (w.curtain && h.fine) { D.ring(u, w.v, r, w.curtain, 'fabric', 'curtain', 0.014, cf, [Math.PI * 0.7, Math.PI * 1.3]); D.ring(u, w.v, r, w.curtain, 'fabric', 'curtain', 0.014, cf, [-Math.PI * 0.3, Math.PI * 0.3]); }
          } else {
            const ww = w.w || 0.3, hh = w.h || 0.2;
            if (w.trim) D.rect(u - ww - 0.03, u + ww + 0.03, w.v - hh - 0.03, w.v + hh + 0.03, w.trim, 'paint', 'frame', 0.01);
            out.push(D.rect(u - ww, u + ww, w.v - hh, w.v + hh, w.glass || '#9fb3bd', 'glass', 'window', 0.012, fx));
            if (w.curtain && h.fine) { const open = 0.3 + 0.2 * rng(); D.rect(u - ww, u - ww + ww * open, w.v - hh, w.v + hh, w.curtain, 'fabric', 'curtain', 0.014, cf); D.rect(u + ww - ww * open, u + ww, w.v - hh, w.v + hh, w.curtain, 'fabric', 'curtain', 0.014, cf); }
          }
        }
        return out;
      },
    };
    return D;
  };
  /** The lit-glass extra of a pane: dark panes never light; the rest light after dusk when someone is about (h.aboard, seeded). */
  h.litFx = (dark, col) => ({ theta: _wexR(dark ? 2 : h.aboard, 3), lit: col || WORLD_MODEL_LIT.glass, halo: true });
  /** A lamp (glass globe, signal, cabin light) at (a, l, y) of radius r: lit after dusk (always, theta 0) with a glow; also a world light for the engine. */
  h.lamp = (a, l, y, r, o2) => {
    o2 = o2 || {};
    const c = P(a, l, y), on = o2.theta != null ? o2.theta : 0;
    const fc = h.disc(c, r, o2.off || '#d9d2b8', 'glass', 'lamp', 1, { theta: on, lit: o2.col || WORLD_MODEL_LIT.lamp, halo: o2.halo !== false });
    h.lights.push({ x: _wexR(c[0], 3), y: _wexR(c[1], 3), z: _wexR(c[2], 3), r: _wexR(r, 3), col: o2.col || WORLD_MODEL_LIT.lamp, kind: o2.kind || 'lamp' });
    return fc;
  };
  /** A soft contact shadow on the ground under a0..a1 x l0..l1 (a dark ellipse on the ground plane, drawn first). */
  h.contactShadow = (a0, a1, l0, l1, alpha) => {
    const keep = cur; h.part('shadow', { layer: -10 });
    const am = (a0 + a1) / 2, lm = (l0 + l1) / 2, ra = (a1 - a0) / 2 * 1.1, rl = (l1 - l0) / 2 * 1.1, pts = [];
    for (let k = 0; k < 14; k++) { const th = k / 14 * Math.PI * 2; pts.push(P(am + Math.cos(th) * ra, lm + Math.sin(th) * rl, 0.01)); }
    h.face(pts, '#1c2420', 'soil', 'shadow', null, { alpha: alpha == null ? 0.28 : alpha });
    cur = keep;
  };
  /** The outward sides of a hull from a plan outline: yTop a number or (a, l) -> y; returns the seen edges [[a1, l1, a2, l2]] (for strakes). */
  h.hullSides = (outline, yBot, yTop, hex, mat, role, o2) => {
    const top = typeof yTop === 'function' ? yTop : () => yTop, seen = [];
    for (let i = 0; i < outline.length; i++) {
      const [a1, l1] = outline[i], [a2, l2] = outline[(i + 1) % outline.length];
      const kb = o2 && _wexNum(o2.keel) ? o2.keel : 1;   // the half-width at the base relative to the top: a V or rounded hull is narrower at the water than at the deck
      if (h.face([P(a1, l1 * kb, yBot), P(a2, l2 * kb, yBot), P(a2, l2, top(a2, l2)), P(a1, l1, top(a1, l1))], hex, mat || 'paint', role || 'hull', (o2 && o2.inside) || h.centre)) seen.push([a1, l1, a2, l2]);
    }
    return seen;
  };
  /** A horizontal-ish surface over an outline whose height varies with a (a deck, a gunwale top): drawn from above only when the eye is above it. */
  h.deck = (outline, yOf, hex, mat, role) => h.face(outline.map(([a, l]) => P(a, l, typeof yOf === 'function' ? yOf(a, l) : yOf)), hex, mat || 'timber', role || 'deck', null);
  // ---- facing tests ----
  /** The distance from the eye to a model point. */
  h.depth = (a, l, y) => { const q = P(a, l, y); return Math.hypot(q[0], q[1] - cam.eye, q[2]); };
  /** Does a face with outward direction d = [da, dl, dy] (model frame) at the model point at = [a, l, y] face the eye? */
  h.sees = (d, at) => _wexSees(cam, h.nOf(d), P(at[0], at[1], at[2]));
  /** Is the eye above the model height y (from the base)? */
  h.above = (y) => h.eyeY > y + pose.heave;
  h.shade = _wexShade;
  h.mix = worldModelMix;
  /** A colour aged by this model's age (kind: paint | metal | timber | fabric | stone). */
  h.aged = (hex, kind, k) => worldModelAge(hex, Math.min(1, p.age * (k == null ? 1 : k)), kind);
  h.parts = parts;
  h._count = () => count;
  return h;
}
function _wmdMat(m) {
  if (typeof WORLD_MATERIALS === 'object' && WORLD_MATERIALS && typeof m === 'string' && !WORLD_MATERIALS[m]) return 'paint';
  return m || 'paint';
}

/* ---------- build ---------- */
/** The model drawn for an entity (see the header); null when the object has no model or the build failed or drew nothing. */
function worldModelBuild(ent, cam, o) {
  if (!ent || typeof ent.obj !== 'string') return null;
  const def = worldModelFor(ent.obj);
  return def ? _wmdRun(def, ent, cam, o) : null;
}
function worldModelBuildWith(id, ent, cam, o) {
  const def = _wmdState().defs.get(id);
  return def ? _wmdRun(def, ent, cam, o) : null;
}
function _wmdRun(def, ent, cam, o) {
  o = o || {};
  const S = _wmdState();
  if (!cam || !_wexNum(cam.f)) return null;
  try {
    const p = worldModelParams(ent, o, def), h = _wmdKit(def, p, ent, cam, o);
    const res = def.build(p, h) || {};
    // the faces: the builder's own order, else its parts by layer then far to near
    let faces;
    if (Array.isArray(res.faces)) faces = res.faces;
    else {
      const ordered = h.parts.filter(q => q.faces.length).map((q, i) => ({ q, i, key: q.key != null ? q.key : Math.hypot(q.sx / q.n, q.sy / q.n - cam.eye, q.sz / q.n) }));
      ordered.sort((A, B) => A.q.layer - B.q.layer || B.key - A.key || A.i - B.i);
      faces = [].concat(...ordered.map(x => x.q.faces));
    }
    faces = faces.filter(fc => fc && fc.pts && fc.pts.length >= 2);
    if (!faces.length) return null;
    let bx = null;
    for (const fc of faces) bx = _wexBox(fc.pts, bx);
    const poly = Array.isArray(res.footprint) ? res.footprint : typeof def.footprint === 'function' ? def.footprint(p) : [[-p.L / 2, -p.B / 2], [p.L / 2, -p.B / 2], [p.L / 2, p.B / 2], [-p.L / 2, p.B / 2]];
    const foot = poly.map(([a, l]) => { const q = h.P(a, l, 0); return [_wexR(q[0], 3), _wexR(q[2], 3)]; });
    const height = _wexNum(res.height) ? res.height : p.H;
    const lights = (res.lights || h.lights || []).filter(Boolean);
    const sunLit = def.sunLit !== false && faces.some(fc => fc.n);
    return Object.assign({ end: null, strips: [], side: 1, id: ent.id != null ? ent.id : null, kind: 'hull', model: true, modelId: def.id, noCut: def.float === true, ent: ent.id != null ? ent.id : null,
      obj: ent.obj, variant: ent.variant == null ? null : ent.variant, faces, foot, zKey: _wexR(Math.min(...foot.map(q => q[1])), 3), height: _wexR(height, 3),
      waterline: h.waterline != null ? _wexR(h.base, 3) : null, pose: p.t != null && (h.pose.heave || h.pose.roll || h.pose.pitch) ? { heave: _wexR(h.pose.heave, 4), roll: _wexR(h.pose.roll, 5), pitch: _wexR(h.pose.pitch, 5) } : null, livery: p.liveryIndex, liveryName: p.liveryName, seed: p.seed, age: _wexR(p.age, 3), lights, sunLit,
      windows: faces.filter(fc => fc.role === 'window').length, box: bx.map(v => _wexR(v, 1)), solidity: def.solidity || 'solid', art: { box: [0, 0, 1, 1], size: [1, 1], repeat: 0 } }, res.extra || null);
  } catch (e) {
    S.err = { model: def.id, obj: ent && ent.obj, message: String((e && e.message) || e), stack: e && e.stack ? String(e.stack).split('\n').slice(0, 4).join('\n') : null };
    if (o.strict) throw e;
    return null;
  }
}

/* ---------- the conformance check (tests/world-models.test.mjs runs it over every registered model; world.mjs models --check) ---------- */
/**
 * Builds a model from 8 angles x 3 eyes x 2 distances x the seasons, with and without a time, and reports what is wrong: no
 * build (null), non-finite coordinates, an unknown material, a colour that is not '#rrggbb', more faces than the budget, an empty
 * footprint, a second build that differs (not deterministic), a model whose instances are all clones, a slow build.
 * o: { obj (the object id to stand in), cam (a camera), seasons, budget (faces, 1600), ms (a build budget, 40) }.
 */
function worldModelCheck(id, o) {
  o = o || {};
  const def = worldModelGet(id) || worldModelFor(id);
  if (!def) return { ok: false, problems: ['no model ' + id], stats: {} };
  const problems = [], seen = new Set(), say = (m) => { if (!seen.has(m) && problems.length < 40) { seen.add(m); problems.push(m); } };
  const obj = o.obj || def.sampleObj || def.ids.find(x => typeof x === 'string' && !x.endsWith('*')) || null;
  const mkCam = (eye) => (typeof sceneCamera === 'function' ? sceneCamera({ camera: { eye, fov: 64, horizon: 468, heading: 0 } }) : null);
  const budget = o.budget || 1600, msMax = o.ms || 40, wl = -0.45;
  const base = { obj, x: 0, y: def.float ? wl - 0.05 : 0, waterline: def.float ? wl : null, variant: 0, static: true };
  const p0 = worldModelParams(Object.assign({ id: 'chk-0', z: 12 }, base), {}, def);
  if (!p0) return { ok: false, problems: ['no parameters (is the object known? pass o.obj)'], stats: {} };
  const dim = Math.max(p0.L, p0.B, p0.H, 0.4), z0 = Math.max(5, 2.4 * dim);
  let nBuilt = 0, maxFaces = 0, maxMs = 0, nullAt = 0;
  const mats = typeof WORLD_MATERIALS === 'object' ? WORLD_MATERIALS : null;
  const seasons = o.seasons || ['summer', 'winter'];
  for (const eye of [0.5, 1.65, 6]) {
    const cam = mkCam(eye);
    if (!cam) { say('no camera (sceneCamera is not loaded)'); break; }
    for (const z of [z0, z0 * 0.45]) for (let k = 0; k < 8; k++) for (const season of seasons) for (const t of [null, 4.2]) {
      const ent = Object.assign({}, base, { id: 'chk-' + k, z, facing: k * 45 });
      const t0 = Date.now();
      let prim = null;
      try { prim = worldModelBuildWith(def.id, ent, cam, { season, strict: true, t }); } catch (e) { say('build threw: ' + String(e && e.message || e).slice(0, 160)); continue; }
      let ms = Date.now() - t0;
      // a slow build is measured again (the quietest of three rounds judges it): a loaded machine is not a slow model
      for (let r = 0; r < 3 && ms > msMax; r++) { const t1 = Date.now(); try { worldModelBuildWith(def.id, ent, cam, { season, t }); } catch (err) { /* reported above */ } ms = Math.min(ms, Date.now() - t1); }
      if (ms > maxMs) maxMs = ms;
      if (!prim) { nullAt++; continue; }
      nBuilt++;
      if (prim.faces.length > maxFaces) maxFaces = prim.faces.length;
      for (const fc of prim.faces) {
        if (!fc.pts.every(q => Number.isFinite(q[0]) && Number.isFinite(q[1]))) say('a face has non-finite coordinates (' + fc.role + ')');
        if (!(typeof fc.hex === 'string' && /^#[0-9a-f]{6}$/i.test(fc.hex))) say('a face colour is not #rrggbb: ' + fc.hex + ' (' + fc.role + ')');
        if (mats && !mats[fc.mat]) say('unknown material ' + fc.mat + ' (' + fc.role + ')');
        if (typeof fc.role !== 'string' || !fc.role) say('a face has no role');
      }
      if (!prim.box.every(Number.isFinite)) say('the box is not finite');
    }
  }
  if (!nBuilt) say('the model drew nothing from any of the views (it must draw from every angle: a prim or a fall back to the sprite only on a failed build)');
  if (nullAt > 0 && nBuilt) say('the model drew nothing from ' + nullAt + ' views of ' + (nBuilt + nullAt));
  if (maxFaces > budget) say('more faces than the budget: ' + maxFaces + ' > ' + budget + ' (use h.lod / h.fine to drop small detail by distance)');
  if (maxMs > msMax) say('a build took ' + maxMs + ' ms (budget ' + msMax + ' ms)');
  // determinism, and the instances differ (no clones)
  const cam = mkCam(1.65);
  if (cam) {
    const sig = (e) => { try { const r = worldModelBuildWith(def.id, e, cam, { season: 'summer', strict: true }); return r ? JSON.stringify(r.faces.map(fc => [fc.pts, fc.hex])) : 'null'; } catch (err) { return 'err'; } };
    const e1 = Object.assign({}, base, { id: 'chk-d', z: z0, facing: 40 });
    if (sig(e1) !== sig(e1)) say('not deterministic: two builds of one entity differ');
    const sigs = new Set();
    for (let k = 0; k < 8; k++) sigs.add(sig(Object.assign({}, base, { id: 'chk-v' + k, z: z0, facing: 40 })));
    if (sigs.size < 3) say('instances are clones: 8 entities with different ids made ' + sigs.size + ' different pictures (seed a livery, an age, details: h.rnd, h.pick, p.livery)');
  }
  // a scene's size must change the model (a build that hard-codes metres ignores it)
  if (cam) {
    const e0 = Object.assign({}, base, { id: 'chk-s', z: z0, facing: 40 });
    try {
      const a = worldModelBuildWith(def.id, e0, cam, { strict: true }), b = worldModelBuildWith(def.id, Object.assign({}, e0, { model: { size: 1.5 } }), cam, { strict: true });
      if (a && b) { const ext = (q) => Math.max(q.box[2] - q.box[0], q.box[3] - q.box[1]); if (!(ext(b) > ext(a) * 1.25)) say('the size parameter is ignored: a 1.5 x model is not larger on screen (build from p.L, p.B, p.H or p.size)'); }
    } catch (err) { say('build threw at size 1.5: ' + String(err && err.message || err).slice(0, 120)); }
  }
  const f0 = p0.L * p0.B;
  if (!(f0 > 0)) say('the footprint has no area (dims L x B)');
  return { ok: !problems.length, problems, stats: { built: nBuilt, maxFaces, maxMs, L: p0.L, B: p0.B, H: p0.H } };
}

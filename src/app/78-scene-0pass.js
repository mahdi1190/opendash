/* ============================================================
   SCENE ENGINE v2: the render-pass registry (docs/dev/SCENE_ENGINE_V2.md 13.1; builder B).
   Loaded first of the 78-scene files; pure at load (only functions and one array), so Node tests load it too.

   The canvas renderer (78-scene-canvas.js) keeps the v1 machinery and calls the PASSES at named hook
   points; each v2 feature (water, shadows, atmosphere, weather, flows) is a pass in its own file, so
   no builder edits another's file.

     sceneRenderPassDefine({ id, order, applies(C), key(L, C), spriteKey(L, C, req), prebake(env),
       sprite(env, cx, req), ground(env, layer, gx), layer(env, layer, gx, when), group(env, grp),
       frameGroup(env, grp, ctx, t, below), movers(env, grp, t, push), framePost(env, ctx, t),
       relight(env, L), stats(env) })
     sceneRenderPasses(stage, C)     the passes that apply to C and have that stage, in order
     sceneRenderPassList()           every defined pass (ids and orders), for tests and stats
     sceneRenderIsV2(C)              a v2 compiled scene, or a v1 scene that opted into an effect (fx, 14.2)
     sceneRenderPassKey(L, C)        the pass keys joined ('' when no pass applies): sceneLightKey appends it for v2

   `order` is a number, or an object by stage ({ prebake: 20, sprite: 10, 'layer:under': 20, 'layer:over': 40, ... }) with an
   optional `default`. Stage names: prebake, sprite, ground, layer (called twice per layer: when 'under' and 'over'; the
   order keys 'layer:under' and 'layer:over' sort them separately), group, frameGroup, movers, framePost, relight, stats.
   A pass that throws is reported once (console.warn) and skipped for the rest of that bake: a bad pass never blanks a scene.
   v1 scenes: no pass applies unless the scene opts in (C.fx), so the v1 bake and frame paths are untouched.
   ============================================================ */
const _scpsPasses = [];
const SCENE_PASS_STAGES = Object.freeze(['prebake', 'sprite', 'ground', 'layer', 'group', 'frameGroup', 'movers', 'framePost', 'relight', 'stats']);
const _SCPS_ID_RE = /^[a-z][a-z0-9-]{0,30}$/;

/** Define (or replace, by id) a render pass. Returns the pass. */
function sceneRenderPassDefine(p) {
  if (!p || !_SCPS_ID_RE.test(p.id || '')) throw new Error('sceneRenderPassDefine: bad id ' + (p && p.id));
  if (typeof p.applies !== 'function') throw new Error('sceneRenderPassDefine ' + p.id + ': applies(C) is required');
  const i = _scpsPasses.findIndex(q => q.id === p.id);
  if (i >= 0) _scpsPasses.splice(i, 1, p); else _scpsPasses.push(p);
  return p;
}
/** The order of a pass at a stage (a number, or by stage). */
function _scpsOrder(p, stage) {
  const o = p.order;
  if (typeof o === 'number') return o;
  if (o && typeof o === 'object') {
    if (Number.isFinite(o[stage])) return o[stage];
    const base = String(stage).split(':')[0];
    if (Number.isFinite(o[base])) return o[base];
    if (Number.isFinite(o.default)) return o.default;
  }
  return 50;
}
/** A v2 compiled scene, or a v1 one that opted into a v2 effect (fx: { water: 2, shadows: 2, ... }). */
function sceneRenderIsV2(C) {
  if (!C) return false;
  if (C.v === 2) return true;
  const fx = C.fx;
  return !!(fx && typeof fx === 'object' && Object.keys(fx).some(k => fx[k] === 2));
}
/**
 * The passes for a stage ('layer:under' and 'layer:over' sort the layer stage by those order keys), that apply to C, in
 * order (then by id, so the order is total). A pass applies only when sceneRenderIsV2(C) and its own applies(C) say so.
 */
function sceneRenderPasses(stage, C) {
  if (!sceneRenderIsV2(C)) return [];
  const fn = String(stage).split(':')[0];
  const out = [];
  for (const p of _scpsPasses) {
    if (typeof p[fn] !== 'function') continue;
    let ok = false;
    try { ok = !!p.applies(C); } catch (e) { ok = false; }
    if (ok) out.push(p);
  }
  return out.sort((a, b) => _scpsOrder(a, stage) - _scpsOrder(b, stage) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
function sceneRenderPassList() { return _scpsPasses.map(p => ({ id: p.id, order: p.order, stages: SCENE_PASS_STAGES.filter(s => typeof p[s] === 'function') })); }
/** The light-key part of the passes that apply (each pass's key(L, C), joined); '' for v1 scenes. */
function sceneRenderPassKey(L, C) {
  if (!sceneRenderIsV2(C)) return '';
  const parts = [];
  for (const p of _scpsPasses.slice().sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (typeof p.key !== 'function') continue;
    let ok = false;
    try { ok = !!p.applies(C); } catch (e) { ok = false; }
    if (!ok) continue;
    try { const k = p.key(L, C); if (k != null && k !== '') parts.push(p.id + ':' + k); } catch (e) { /* no key */ }
  }
  return parts.join(',');
}
/** The sprite-key part of the passes that apply (each pass's spriteKey(L, C, req), joined). */
function sceneRenderSpriteKey(L, C, req) {
  let out = '';
  for (const p of sceneRenderPasses('spriteKey', C)) {
    try { const k = p.spriteKey(L, C, req); if (k != null && k !== '') out += '|' + p.id + ':' + k; } catch (e) { /* no key */ }
  }
  return out;
}
/**
 * Run one stage of the passes on an env (the canvas renderer's bake or frame): each pass's time and draws go into
 * env.passStats[id] ({ bakeMs, frameMs, draws }); a pass that throws is reported once and skipped for this env.
 * Returns the draws reported (a stage function may return a number of draws).
 */
function sceneRunPasses(env, stage, args, frame) {
  const list = env && env.passes ? env.passes[stage] || (env.passes[stage] = sceneRenderPasses(stage, env.C)) : sceneRenderPasses(stage, env && env.C);
  if (!list.length) return 0;
  const fn = String(stage).split(':')[0], now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
  let draws = 0;
  for (const p of list) {
    if (env.broken && env.broken.has(p.id)) continue;
    const a = now();
    let r = 0;
    try {
      r = p[fn].apply(p, [env].concat(args || []));
      if (typeof r === 'number' && r > 0) draws += r; else r = 0;
    } catch (e) {
      r = 0;
      if (env.broken) env.broken.add(p.id);
      if (typeof console !== 'undefined') console.warn('scene pass ' + p.id + ' (' + stage + ') failed:', e && e.message);
    }
    if (env.passStats) {
      const s = env.passStats[p.id] || (env.passStats[p.id] = { bakeMs: 0, frameMs: 0, frames: 0, draws: 0, frame: -1 });
      if (frame) {
        if (s.frame !== env.frameNo) { s.frame = env.frameNo; s.frames++; s.draws = 0; }
        s.frameMs += now() - a; s.draws += r;
      } else s.bakeMs += now() - a;
    }
  }
  return draws;
}

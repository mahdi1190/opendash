/* ============================================================
   WORLD ENGINE v3, module F: the host (docs/dev/WORLD_ENGINE.md 2.1, 7, 8.6).
   The v3 renderer. A v3 item's world (A: worldBuild) is turned into the v2 scene form the existing engine already
   renders well (ground, water, static shadows and reflections, haze, live sky, seasons, weather, night lights,
   the sprite cache and the bake), with EVERY static given in world metres (`at`, `fix`: nothing to snap, nothing
   in pixels). The movers come from the life sim (C: worldLifeInit / worldLifeTick / worldAgents) through one
   render pass ('world-life', 78-scene-0pass.js registry): each agent is projected by the camera every frame,
   scaled from its descriptor, faced from its velocity, slotted into the depth group of its true depth and
   occluded by the nearer statics of that group (the renderer's occluder redraw). D's worldFrameOrder is used
   as the debug invariant (worldHostOrderCheck; `world motion` and `world perf` run it).
   The still (SVG, reduced motion, small tiles) is the v2 SVG path over the same derived data: statics only.
   PURE part: worldHostWorld, worldHostV2Data, worldHostAgents, worldHostSim (Node and browser).
   BROWSER part (guarded): the pass and worldRendererFor(item, canvas, o) -> { start, stop, setTime, stats, still, ... }.
   Every A-E function is reached through typeof guards: a missing module removes its feature, never the scene.
   ============================================================ */

/** The v3 spec of an item, a data object, a thunk or a spec. */
function worldHostSpec(x) {
  if (x && x.worldSpec && x.worldSpec.v === 3) return x.worldSpec;   // a worldAdd item (its scene is the derived v2 data)
  let d = x;
  if (d && typeof d === 'object' && d.scene !== undefined && !d.surfaces) d = d.scene;
  if (typeof d === 'function') d = typeof sceneData === 'function' ? sceneData({ scene: d }) : d();
  if (d && d.v === 3 && d.spec) return d.spec;
  if (d && d.v === 3) return d;
  return null;
}

const _WH5_R = (v) => Math.round(v * 100) / 100;

/**
 * The world of a spec: A's worldBuild when loaded, else a minimal world from the spec's own entries (entities with
 * `at`, landmarks), enough to draw the statics. o: { season }.
 */
function worldHostWorld(spec, o) {
  o = o || {};
  if (typeof worldBuild === 'function') {
    try { const w = worldBuild(spec, { season: o.season }); if (w) return w; } catch (e) { /* the minimal world below */ }
  }
  const entities = [];
  let n = 0;
  for (const e of [].concat(spec.entities || [], spec.landmarks || [])) {
    if (!e || !e.obj || !Array.isArray(e.at)) continue;
    entities.push({ id: e.id || 'e' + (n++), obj: e.obj, variant: e.variant, x: e.at[0], z: e.at[1], y: Number.isFinite(e.y) ? e.y : 0,
      facing: e.facing || 0, attach: e.attach || 'ground', static: true, height: null, foot: null, minimal: true });
  }
  return { cam: null, surfaces: spec.surfaces || [], entities, life: spec.life || [], backdrop: spec.backdrop || null, seed: spec.seed || 1, problems: [{ rule: 'noCore', msg: 'worldBuild not loaded: minimal world' }], minimal: true };
}

// v3 surface kinds -> the v2 surface kinds the ground compile paints (3.1 of SCENE_ENGINE_V2)
const WORLD_HOST_KIND_V2 = Object.freeze({ path: 'path', pavement: 'pavement', towpath: 'towpath', plaza: 'plaza', boardwalk: 'bridge', 'bridge-deck': 'bridge',
  deck: 'bridge', grass: 'grass', heath: 'heath', field: 'field', sand: 'sand', road: 'road', rail: 'rail', tram: 'tramway', reeds: 'reedbed', bed: 'garden',
  hedge: 'verge', weir: 'edge' });
// v3 water kinds -> v2 water kinds
const WORLD_HOST_WATER_V2 = Object.freeze({ pond: 'pond', lake: 'lake', canal: 'canal', river: 'river', sea: 'sea', harbour: 'harbour', puddle: 'pond' });

/**
 * The v2 scene data that draws a world's statics (the bake): camera and place from the spec, surfaces and water as
 * geometry and kind only (the water lock: colour, mirror and ripple from the kind), every static entity as a ground
 * placement in metres with `fix` (the world is already validated: nothing is snapped or refused), clusters A did not
 * expand as clustered scatter, the backdrop bands (E) as far placements. The id carries the live world (the pass).
 * o: { id, season, world }.
 */
function worldHostV2Data(spec, o) {
  o = o || {};
  const world = o.world || worldHostWorld(spec, o);
  const P = spec.place || {}, cam0 = spec.camera || {};
  const camera = Object.assign({}, cam0);
  if (camera.lat == null && Number.isFinite(P.lat)) camera.lat = P.lat;
  if (camera.lon == null && Number.isFinite(P.lon)) camera.lon = P.lon;
  if (camera.alt == null && Number.isFinite(P.alt)) camera.alt = P.alt;
  const style = spec.backdrop && spec.backdrop.style;
  const urban = /^(city|town)/.test(style || '');
  const data = { v: 2, id: o.id || spec.id || 'world', view: { lat: camera.lat, lon: camera.lon }, camera, at: 'afternoon', season: 'auto',
    setting: urban ? 'urban' : 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'season',
    surfaces: [{ id: 'world-rest', kind: urban ? 'plot' : 'grass', rest: true }], water: [], place: [], scatter: [], actors: [], flows: [], world3: true };
  for (const s of spec.surfaces || []) {
    if (!s || !s.id) continue;
    const geo = s.poly ? { poly: s.poly } : s.path ? { path: s.path, width: s.width || 2 } : null;
    if (!geo) continue;
    if (s.kind === 'water') { data.water.push(Object.assign({ id: s.id, kind: WORLD_HOST_WATER_V2[s.water] || 'pond' }, geo)); continue; }
    data.surfaces.push(Object.assign({ id: s.id, kind: WORLD_HOST_KIND_V2[s.kind] || 'grass' }, geo));
    // a hedge surface carries its own hedge object along it (clustered, never a wall)
    if (s.kind === 'hedge') data.scatter.push({ obj: s.obj || 'plant.towpath-hedge', on: [s.id], n: Math.max(6, Math.round((s.path ? _wh5Len(s.path) : 40) / 2)), dist: 'ground', cluster: { centres: 8, spread: 4 }, seed: 17, anim: false });
  }
  // the statics: A has validated and placed them, so the v2 compile must not judge or snap them again. Each goes in as a
  // pinned placement at the camera's projection of its world anchor, its scale from its real height (the descriptor), its
  // mirror from its facing; the compile infers its depth back from the foot row (haze, shadow, reflection and order by depth).
  const cam = world.cam || (typeof sceneCamera === 'function' ? sceneCamera({ camera }) : null);
  const ents = (world.entities || []).filter(e => e && e.static !== false && e.obj);
  if (cam) for (const e of ents) data.place.push(...worldHostPlace(cam, e));
  // clusters the core did not expand (the spec's { cluster, on, n, seed } entries): v2's clustered Poisson scatter
  if (world.minimal) for (const e of spec.entities || []) {
    if (!e || !e.cluster) continue;
    const obj = typeof e.cluster === 'string' ? e.cluster : e.cluster;
    data.scatter.push({ obj, on: [e.on].filter(Boolean), n: e.n || 20, dist: 'ground', cluster: { centres: Math.max(2, Math.round((e.n || 20) / 8)), spread: e.edge ? 2.5 : 6 }, seed: e.seed || 1, anim: false });
  }
  // the backdrop bands (E): far entities in metres, placed the same way
  if (typeof worldBackdrop === 'function' && cam) {
    try { for (const b of worldBackdrop(world, cam, o.season || 'summer') || []) if (b && b.obj && Number.isFinite(b.x) && b.z > 0) data.place.push(...worldHostPlace(cam, b)); } catch (e) { /* no bands: the v2 distant hills remain */ }
  }
  return data;
}
/**
 * The v2 placement of one world entity: [] when it is behind the camera or has no drawing. Pure. cam: a v2 camera.
 * { obj, variant, x, y, s, pin: true, flip, layer } with x, y the projected anchor (scene units) and s = (f / z) x real h / drawn h.
 */
function worldHostPlace(cam, e) {
  if (!(e.z > 0.3) || typeof sceneProject !== 'function') return [];
  // the view from the facing against the line of sight (4.3): 5 drawn views + mirrors; a missing view keeps the side view
  const v = worldHostViewOf(e.facing || 0, e.x, e.z), obj = _wh5ViewObj(e.obj, v.view);
  const def = typeof sceneObj === 'function' ? sceneObj(obj) : null;
  if (!def || !def.size) return [];
  const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(e.obj) : null;
  const hM = (Number.isFinite(e.height) && e.height > 0 ? e.height : null) || (info && info.size && info.size.h) || _wh5RealH(e.obj);
  const P = sceneProject(cam, e.x, e.z, Number.isFinite(e.y) ? e.y : null), s = (cam.f / e.z) * hM / def.size[1];
  if (P.X < -2000 || P.X > 3600) return [];
  const p = { obj, x: Math.round(P.X * 10) / 10, y: Math.round(P.Y * 10) / 10, s: Math.round(s * 1e4) / 1e4, pin: true, anim: false };
  if (e.variant != null && Number.isInteger(e.variant)) p.variant = e.variant;
  if (v.mirror) p.flip = true;
  return [p];
}
function _wh5Len(path) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); return L; }

/* ---------- the life sim (pure) ---------- */
const WORLD_HOST_SIM_HZ = 15, WORLD_HOST_WARM_S = 90;
/**
 * A life sim for a world: C's life over B's nav, ticked at a fixed 15 Hz (10 under the governor) so any time t is
 * reproducible from the seed (stills and captures warm up 90 s, 4.4). Returns null when B or C is not loaded.
 */
function worldHostSim(world, o) {
  o = o || {};
  if (typeof worldNavBuild !== 'function' || typeof worldLifeInit !== 'function' || typeof worldLifeTick !== 'function' || typeof worldAgents !== 'function') return null;
  let nav = null, life = null;
  const t0 = Number.isFinite(o.t0) ? o.t0 : 0;
  try { nav = worldNavBuild(world); life = worldLifeInit(world, nav, t0); } catch (e) { return { error: String(e && e.message || e), agents: () => [], to() {}, t: 0 }; }
  const sim = { nav, life, t: 0, hz: WORLD_HOST_SIM_HZ, tickMs: [], ticks: 0, cur: null };
  const snap = () => { try { return worldAgents(life) || []; } catch (e) { return []; } };
  sim.cur = snap();
  /** Advance to time t (seconds since the start of the sim; never backwards). Bounded per call (a hidden tab does not spin). */
  sim.to = (t, maxSteps, step) => {
    const dt = step || 1 / sim.hz;
    let n = 0;
    while (sim.t + dt <= t && n < (maxSteps || 30)) {
      const a = typeof performance !== 'undefined' ? performance.now() : Date.now();
      worldLifeTick(life, dt);
      sim.cur = snap();
      sim.t += dt; n++; sim.ticks++;
      const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - a;
      sim.tickMs.push(ms); if (sim.tickMs.length > 240) sim.tickMs.shift();
    }
    if (sim.t + dt <= t) sim.t = t;   // far behind (a background tab): jump, the agents are where the last tick put them
  };
  /** The agents at t (C interpolates between its own ticks; nothing is extrapolated here, so no drawn position is ever illegal). */
  sim.agents = (t) => { sim.to(t); return sim.cur || []; };
  // the warm-up (4.4): seed + scene time, a fixed 0.25 s step over 90 s, so a still or a capture is the same every time
  if (o.warm !== false) sim.to(o.warm || WORLD_HOST_WARM_S, 1e6, 0.25);
  sim.base = sim.t;
  return sim;
}

/**
 * The screen records of agents (pure): { a, o, v, X, Y, s, flip, d, layer, view } with the object of the agent's view
 * (5 drawn views + mirrors), the scale from the descriptor's real height (never a knob), the foot row from the camera.
 * cam: a v2 camera (sceneCamera / C.cam). Agents behind the camera or off the frame are dropped.
 */
function worldHostAgents(agents, cam, o) {
  o = o || {};
  const out = [];
  if (!cam || typeof sceneProject !== 'function') return out;
  for (const a of agents || []) {
    if (!a || !(a.z > 0.3)) continue;
    const obj = _wh5ViewObj(a.obj, a.view);
    const def = typeof sceneObj === 'function' ? sceneObj(obj) : null;
    if (!def || !def.size) continue;
    const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(a.obj) : null;
    const hM = (info && info.size && info.size.h) || _wh5RealH(a.obj);
    // the near band (3.2: nav forbids it; a giant at the lens is never drawn even if a module let one through)
    if (a.z < cam.f * hM / 405 && !a.framed) { if (o.dropped) o.dropped.near++; continue; }
    const p = sceneProject(cam, a.x, a.z, Number.isFinite(a.y) ? a.y : null);
    const s = (cam.f / Math.max(0.3, a.z)) * hM / def.size[1];
    if (p.X < -200 || p.X > 1800 || p.Y < -200) continue;
    out.push({ a, id: a.id, o: obj, v: a.variant == null ? 0 : a.variant, X: p.X, Y: p.Y, s, flip: !!a.mirror, d: a.z, layer: _wh5LayerOf(cam, a.z, o.layers),
      view: a.view || 'side', alpha: 1, kind: a.cls, moving: Math.hypot(a.vx || 0, a.vz || 0) > 0.05, phase: a.phase || 0 });
  }
  out.sort((p, q) => q.d - p.d);
  return out;
}
/**
 * The drawn view of a thing facing `facing` (world degrees, 0 = away from the camera, 90 = right) standing at (x, z):
 * rel = facing - bearing of the line of sight; back < 22.5, q-back < 67.5, side < 112.5, q-front < 157.5, else front;
 * mirror when it faces left of the sight line (side views face right). Pure.
 */
function worldHostViewOf(facing, x, z) {
  const bearing = Math.atan2(x, Math.max(1e-3, z)) * 180 / Math.PI;
  let rel = ((facing - bearing) % 360 + 540) % 360 - 180;   // -180..180
  const mirror = rel < 0, a = Math.abs(rel);
  const view = a < 22.5 ? 'back' : a < 67.5 ? 'q-back' : a < 112.5 ? 'side' : a < 157.5 ? 'q-front' : 'front';
  return { view, mirror: view === 'back' || view === 'front' ? false : mirror, rel };
}
function _wh5ViewObj(obj, view) {
  if (!view || view === 'side') return obj;
  const def = typeof sceneObj === 'function' ? sceneObj(obj) : null;
  const links = (def && def.views) || (typeof SCENE_OBJ_VIEWS !== 'undefined' && SCENE_OBJ_VIEWS[obj]) || null;
  const k = links && (links[view] || (view === 'back' && links.rear) || (view === 'q-front' && links.q));
  const id = k && (typeof k === 'string' ? k : k.o || k.obj);
  return id && (typeof sceneObj !== 'function' || sceneObj(id)) ? id : obj;
}
function _wh5RealH(obj) {
  try { if (typeof _scflReal === 'function') { const r = _scflReal(obj); if (r && r.h) return r.h; } } catch (e) { /* default */ }
  return /^bird\./.test(obj) ? 0.4 : /^(boat|vehicle)\./.test(obj) ? 2 : /^animal\.dog/.test(obj) ? 0.55 : 1.7;
}
function _wh5LayerOf(cam, d, layers) {
  const bands = (cam && cam.bands) || [];
  for (const b of bands) if (b.d0 != null && d >= b.d0 && (b.d1 == null || d < b.d1)) return b.i;
  return layers != null ? layers - 1 : null;
}

/* ---------- the live worlds the pass draws (keyed by the derived data's id) ---------- */
const _wh5Live = new Map();
/** Register a world for the pass; returns the derived v2 data the v2 renderer bakes. o: { id, season, sim (false: statics only), t0 }. */
function worldHostData(spec, o) {
  o = o || {};
  const id = (o.id || spec.id || 'world') + '~w3';
  const world = worldHostWorld(spec, o);
  const data = worldHostV2Data(spec, Object.assign({}, o, { id, world }));
  const rec = { id, spec, world, data, sim: null, stats: { agents: 0, draws: 0, frames: 0, tickMs: 0, governor: 0, simInitMs: 0 }, govern: 0, };
  _wh5Live.set(id, rec);
  // the life sim (nav + populations + the 90 s warm-up) is built OFF the cold-load path in a page: the statics bake and show
  // first, the movers walk in when it is ready (o.sync: now, for stills, captures, tools and Node)
  const init = () => {
    if (_wh5Live.get(id) !== rec || rec.sim) return;
    const a = typeof performance !== 'undefined' ? performance.now() : Date.now();
    rec.sim = worldHostSim(world, { t0: o.t0, warm: o.warm });
    rec.stats.simInitMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - a);
    rec.simAt = null;
  };
  if (o.sim === false) { /* statics only */ }
  else if (o.sync || typeof document === 'undefined') init();
  else if (typeof requestIdleCallback === 'function') requestIdleCallback(init, { timeout: 1500 }); else setTimeout(init, 300);
  return data;
}
function worldHostLive(id) { return _wh5Live.get(id) || null; }

/* ---------- the browser part ---------- */
if (typeof sceneRenderPassDefine === 'function') {
  const blob = { c: null };
  const blobOf = () => {
    if (blob.c || typeof document === 'undefined') return blob.c;
    const c = document.createElement('canvas'); c.width = 64; c.height = 16;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 8, 0, 32, 8, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.setTransform(1, 0, 0, 0.25, 0, 6); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (blob.c = c);
  };
  const bucket = (s) => 2 ** (Math.ceil(Math.log2(Math.max(1e-3, s)) * 2) / 2);
  const now = (env, t) => {
    const rec = _wh5Live.get(env.C && env.C.id);
    if (!rec || !rec.sim) return null;
    if (env._wh5t === t) return env._wh5now;
    env._wh5t = t;
    // the governor (v2 13.2 order first; then agents x 0.7, then the sim at 10 Hz)
    const lvl = env.gov ? env.gov.level : 0;
    rec.sim.hz = lvl >= 5 ? 10 : WORLD_HOST_SIM_HZ;
    if (rec.simAt == null) rec.simAt = t;   // the sim's clock starts when it is ready (its warm-up already put everyone in place)
    let list = worldHostAgents(rec.sim.agents(rec.sim.base + Math.max(0, t - rec.simAt)), env.cam || env.C.cam, { layers: (env.C.layers || []).length });
    if (lvl >= 4) list = list.filter((a, i) => (i % 10) < 7);
    rec.stats.govern = lvl;
    rec.stats.agents = list.length; rec.stats.frames++;
    rec.stats.tickMs = rec.sim.tickMs.length ? rec.sim.tickMs.reduce((x, y) => x + y, 0) / rec.sim.tickMs.length : 0;
    env._wh5now = list;
    return list;
  };
  const groupOf = (env, a) => {
    const lg = env.layerOfGroup || [], gi = a.layer != null ? lg[a.layer] : null;
    return gi != null ? gi : Math.max(0, (env.groups || []).length - 1);
  };
  sceneRenderPassDefine({
    id: 'world-life',
    order: { frameGroup: 26, movers: 55, default: 55 },
    applies(C) { return !!(C && _wh5Live.has(C.id)); },
    frameGroup(env, grp, ctx, t) {
      // contact shadows of the grounded agents of this group (floaters get the water's rings instead)
      const list = now(env, t);
      if (!list) return 0;
      const gi = (env.groups || []).indexOf(grp), c = blobOf();
      if (!c) return 0;
      let n = 0;
      for (const a of list) {
        if (groupOf(env, a) !== gi || a.a.layer === 'swim' || a.a.layer === 'wade' || a.a.layer === 'air' || a.kind === 'boat') continue;
        const w = Math.max(6, a.s * 40), h = w * 0.25;
        ctx.globalAlpha = env.Lnow && env.Lnow.dark > 0.7 ? 0.5 : 1;
        ctx.setTransform(env.vs, 0, 0, env.vs, env.ox, env.oy);
        ctx.drawImage(c, a.X - w / 2, a.Y - h / 2, w, h); n++;
      }
      ctx.globalAlpha = 1;
      return n;
    },
    movers(env, grp, t, push) {
      const list = now(env, t);
      if (!list) return 0;
      const gi = (env.groups || []).indexOf(grp), season = env.C.season;
      for (const a of list) {
        if (groupOf(env, a) !== gi) continue;
        push({ kind: 'custom', y: a.Y, agent: a, draw(ctx) {
          let sp = null;
          try { sp = env.sprite({ o: a.o, v: a.v, part: '*', season, haze: 0, tint: null, scale: bucket(a.s) * env.vs, flip: false, cls: null }); if (sp && env.keep) env.keep(sp); } catch (e) { sp = null; }
          if (!sp || !sp.c) return 0;
          const bob = a.moving && a.kind !== 'boat' ? Math.abs(Math.sin(2 * Math.PI * (t * 1.6 + a.phase))) * 0.8 * a.s : 0;
          ctx.globalAlpha = a.alpha;
          ctx.setTransform(env.vs * a.s * (a.flip ? -1 : 1), 0, 0, env.vs * a.s, env.vs * a.X + env.ox, env.vs * (a.Y - bob) + env.oy);
          ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
          ctx.globalAlpha = 1;
          const rec = _wh5Live.get(env.C.id); if (rec) rec.stats.draws++;
          return 1;
        } });
      }
      return 0;
    },
    stats(env) { const rec = _wh5Live.get(env.C && env.C.id); return rec ? Object.assign({}, rec.stats) : {}; },
  });
}

/**
 * The v3 renderer (8.6): the same surface as the v2 renderer (start, stop, setTime, stats, still, resize, setLight,
 * frame, snapshot, destroy). item: a v3 item ({ scene: { v: 3, spec } }), a data object or a spec. canvas: a canvas
 * (null: the SVG still only). o: the v2 renderer's options (+ season, sim: false).
 */
function worldRendererFor(item, canvas, o) {
  o = o || {};
  const spec = worldHostSpec(item);
  if (!spec) throw new Error('not a v3 scene');
  const season = o.season || (typeof sceneSeason === 'function' && o.sky && Number.isFinite(o.sky.ms) ? sceneSeason(o.sky.ms, spec.place && spec.place.lat) : null) || 'summer';
  const data = worldHostData(spec, { id: (item && item.id) || spec.id, season, sim: o.sim, sync: !!o.still });
  const rec = _wh5Live.get(data.id);
  const svgStill = (so) => (typeof sceneSvg === 'function' ? sceneSvg(data, Object.assign({ season }, o, so || {}, { renderer: 'svg' })) : '');
  if (!canvas || typeof sceneRendererCreate !== 'function' || (typeof sceneCanvasSupported === 'function' && !sceneCanvasSupported())) {
    return { kind: 'svg', start() {}, stop() {}, setTime() {}, stats: () => ({ world: rec.stats, svg: true }), still: svgStill, destroy() { _wh5Live.delete(data.id); }, data };
  }
  const r = sceneRendererCreate(canvas, data, Object.assign({}, o, { season }));
  const api = Object.create(r);
  Object.assign(api, {
    kind: 'canvas', data, world: rec.world,
    /** Jump the scene clock: the sim advances deterministically to t (seconds after the warm-up). */
    setTime(t) { if (rec.sim) { rec.simAt = 0; rec.sim.to(rec.sim.base + Math.max(0, t), 1e6); } r.frame(t); },
    still(so) { return svgStill(so); },
    stats() {
      const s = r.stats();
      s.world = Object.assign({}, rec.stats, { minimal: !!rec.world.minimal, problems: (rec.world.problems || []).length, sim: !!rec.sim, simError: rec.sim && rec.sim.error || null });
      return s;
    },
    destroy() { r.destroy(); _wh5Live.delete(data.id); },
  });
  return api;
}

/**
 * The order invariant for one frame (tests and `world motion`): D's worldFrameOrder over A's statics and the agents
 * at t; returns the violations (2.3 item 5; must be 0). Pure.
 */
function worldHostOrderCheck(world, agents, cam) {
  if (typeof worldChunks !== 'function' || typeof worldFrameOrder !== 'function' || typeof worldOrderCheck !== 'function') return null;
  // footprints that reach behind the lens (a long boat alongside the camera) are clipped at the near plane: only what is in front draws
  const zMin = Math.max(0.3, (cam.dMin || 1) * 0.5);
  const proj = { f: cam.f, project: (x, z, y) => { const p = sceneProject(cam, x, Math.max(zMin, z), y); return [p.X, p.Y]; } };
  const chunks = worldChunks(world, null, proj);
  const ag = (agents || []).map(a => Object.assign({}, a, { static: false, height: a.height || 1.7 }));
  return worldOrderCheck(worldFrameOrder(chunks, ag, proj));
}

/* ============================================================
   WORLD ENGINE v3, package render: the host (docs/dev/WORLD_ENGINE.md 2.1, 2.8, 11.3; requirements R3-R5, M8, F4, G10, T2).
   A v3 item's scene data is DERIVED v2 data: the v2 renderer draws the base layer (sky, clouds, ground surfaces, base water,
   weather) and the world compositor (79-world-5frame.js, pass 'world-frame') draws every static and every agent in true
   depth order on top. So the LIVE data carries no statics (R1: no baked layer merges near and far); the STILL data (SVG:
   reduced motion, small tiles, tools) keeps them as v2 placements in metres (F4).
     worldHostSpec(x)                    the v3 spec of an item, data, thunk or spec (v 3 and 3.1)
     worldHostWorld(spec, o)             the world (sense: worldBuild; else a minimal world) + hedge dressing
     worldHostV2Data(spec, o)            the derived v2 data; o.statics === false: the live form (no statics)
     worldHostData(spec, o)              the data an item's scene is: live (registers the live record) or, with o.sim === false /
                                         o.still, the still form (memoised; never touches the live record: G10)
     worldHostDriver(world, o)           the life of a world: the systems runner (worldRun) when it drives agents, else the
                                         life sim (worldHostSim); fixed whole ticks, so the agents at scene time t are a function
                                         of seed, date and t (R4); interpolated between ticks
     worldHostClock(o)                   the scene clock: starts at the first visible frame (R5), never moves during hidden
                                         preparation, pauses when hidden and resumes without a jump (M8), restarts when the host
                                         restarts its clock (the scene is shown now)
     worldHostAt(rec, t, flags)          -> { tau, agents, ready }: the agents a frame draws (the pass calls it)
     worldHostLive(id)                   the live record of a data id
     worldRendererFor(item, canvas, o)   the v3 renderer for the player's data.v === 3 route (v2 renderer + the passes)
   Every other package is reached through typeof guards: a missing package removes a feature, never the scene. The scene's
   time of day and date come from the light the host gives the renderer (the live clock in the app, a fixed moment in
   previews: T2); nothing here reads the wall clock for scene time.
   ============================================================ */

const _wh5IsV3 = (v) => Number(v) >= 3 && Number(v) < 4;
/** The v3 spec of an item, a data object, a thunk or a spec. */
function worldHostSpec(x) {
  if (x && x.worldSpec && _wh5IsV3(x.worldSpec.v)) return x.worldSpec;   // a worldAdd item (its scene is the derived v2 data)
  let d = x;
  if (d && typeof d === 'object' && d.scene !== undefined && !d.surfaces) d = d.scene;
  if (typeof d === 'function') d = typeof sceneData === 'function' ? sceneData({ scene: d }) : d();
  if (d && d.world3 && d.$spec && _wh5IsV3(d.$spec.v)) return d.$spec;   // derived data carries its spec
  if (d && _wh5IsV3(d.v) && d.spec) return d.spec;
  if (d && _wh5IsV3(d.v)) return d;
  return null;
}

const _WH5_R = (v) => Math.round(v * 100) / 100;

/**
 * The world of a spec: sense's worldBuild when loaded, else a minimal world from the spec's own entries (entities with
 * `at`, landmarks), enough to draw the statics. Then the hedge dressing (a hedge surface nothing dresses gets its hedge,
 * logged). o: { season }.
 */
const _wh5WorldMemo = new Map();   // spec text + season -> the built world (three kept): the second mount of a scene (G12: warm load) clones it, never rebuilds it
function _wh5Sig(spec, season) { try { return String(season || '') + '|' + JSON.stringify(spec); } catch (e) { return null; } }
function worldHostWorld(spec, o) {
  o = o || {};
  let world = null;
  if (typeof worldBuild === 'function') {
    const sig = typeof structuredClone === 'function' ? _wh5Sig(spec, o.season) : null, memo = sig ? _wh5WorldMemo.get(sig) : null;
    if (memo) { try { world = structuredClone(memo); } catch (e) { world = null; } }
    if (!world) {
      try { world = worldBuild(spec, { season: o.season }) || null; } catch (e) { world = null; }
      if (world && sig) {
        try { _wh5WorldMemo.set(sig, structuredClone(world)); while (_wh5WorldMemo.size > 3) _wh5WorldMemo.delete(_wh5WorldMemo.keys().next().value); } catch (e) { /* not cloneable: built each time */ }
      }
    }
  }
  if (!world) {
    const entities = [];
    let n = 0;
    for (const e of [].concat(spec.entities || [], spec.landmarks || [])) {
      if (!e || !e.obj || !Array.isArray(e.at)) continue;
      entities.push({ id: e.id || 'e' + (n++), obj: e.obj, variant: e.variant, x: e.at[0], z: e.at[1], y: Number.isFinite(e.y) ? e.y : 0,
        facing: e.facing || 0, attach: e.attach || 'ground', static: true, height: null, foot: null, minimal: true });
    }
    world = { cam: null, surfaces: spec.surfaces || [], entities, life: spec.life || [], backdrop: spec.backdrop || null, seed: spec.seed || 1, problems: [{ rule: 'noCore', msg: 'worldBuild not loaded: minimal world' }], minimal: true };
  }
  if (!world.minimal) { try { _wh5Hedges(world); } catch (e) { /* no dressing: the hedge strip stays plain */ } }
  return world;
}

/**
 * A hedge surface is solid ground drawn as a hedge (1.4). Where nothing in the world already stands on it (the fill may
 * dress it), its hedge is laid along it as world entities: sections of the library hedge end to end, seeded jitter, never a
 * grid; each is logged as a dressing (U2).
 */
function _wh5Hedges(world) {
  const cam = world.cam;
  if (!cam || typeof sceneObj !== 'function') return;
  for (const s of world.surfaces || []) {
    if (!s || s.kind !== 'hedge' || !Array.isArray(s.path) || s.path.length < 2) continue;
    const obj = s.obj && sceneObj(s.obj) ? s.obj : 'plant.towpath-hedge';
    if (!sceneObj(obj)) continue;
    const near = (e) => {
      if (!e || e.static === false || !/hedge(?!row)/.test(String(e.obj || '')) && e.cls !== 'hedge') return false;
      return _wh5LineDist(s.path, e.x, e.z) <= (s.width || 1.2) / 2 + 0.5;
    };
    if ((world.entities || []).some(near)) continue;
    const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(obj) : null;
    const L = info && info.size ? info.size.w : 3, D = info && info.size ? info.size.d : 1.2, H = info && info.size ? info.size.h : 2.2;
    const step = Math.max(0.8, L * 0.72), rnd = _wh5Rng((world.seed | 0) * 7907 + _wh5Hash(s.id || 'hedge'));
    const nv = info && info.variants ? info.variants : 1;
    let n = 0;
    for (let i = 1; i < s.path.length; i++) {
      const [ax, az] = s.path[i - 1], [bx, bz] = s.path[i], len = Math.hypot(bx - ax, bz - az);
      if (!(len > 0.01)) continue;
      const ux = (bx - ax) / len, uz = (bz - az) / len, bearing = Math.atan2(ux, uz) * 180 / Math.PI;
      for (let u = (n ? rnd() * step * 0.5 : 0); u < len; u += step * (0.85 + rnd() * 0.3)) {
        const off = (rnd() - 0.5) * Math.max(0, (s.width || 1.2) - D) * 0.8;
        const x = ax + ux * u - uz * off, z = az + uz * u + ux * off;
        if (!(z > 0.5)) continue;
        const facing = ((bearing + 90) % 360 + 360) % 360, y = typeof sceneGroundHeight === 'function' ? sceneGroundHeight(cam, x, z) : 0;
        const id = 'hedge-' + s.id + '-' + (n++);
        world.entities.push({ id, obj, cls: 'hedge', variant: Math.floor(rnd() * nv), x: _WH5_R(x), z: _WH5_R(z), y: Math.round(y * 1000) / 1000, facing,
          foot: _wh5Box(x, z, L, D, facing), height: H, size: { w: L, d: D, h: H }, solidity: 'solid', attach: 'ground', host: null, deck: null,
          waterline: null, lights: [], static: true, seasonal: true, auto: 'dress', on: s.id });
      }
    }
    if (n && Array.isArray(world.log)) world.log.push({ id: s.id, obj, action: 'dress', rule: 'hedgeSurface', reason: 'hedge surface laid with ' + n + ' sections', by: 'render' });
  }
}
function _wh5Box(x, z, w, d, facing) {
  const r = (facing || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  // local x across (width), local z along the facing; facing 0 = away from the camera
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([lx, lz]) => [_WH5_R(x + lz * s + lx * c), _WH5_R(z + lz * c - lx * s)]);
}
function _wh5LineDist(path, x, z) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx - x, az + t * dz - z));
  }
  return best;
}
function _wh5Hash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wh5Rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// v3 surface kinds -> the v2 surface kinds the ground compile paints (3.1 of SCENE_ENGINE_V2)
const WORLD_HOST_KIND_V2 = Object.freeze({ path: 'path', pavement: 'pavement', towpath: 'towpath', plaza: 'plaza', boardwalk: 'bridge', 'bridge-deck': 'bridge',
  deck: 'bridge', platform: 'pavement', stairs: 'pavement', ramp: 'pavement', grass: 'grass', heath: 'heath', field: 'field', sand: 'sand', road: 'road', rail: 'rail', tram: 'tramway', reeds: 'reedbed', bed: 'garden',
  hedge: 'verge', weir: 'edge' });
// v3 water kinds -> v2 water kinds
const WORLD_HOST_WATER_V2 = Object.freeze({ pond: 'pond', lake: 'lake', canal: 'canal', river: 'river', sea: 'sea', harbour: 'harbour', puddle: 'pond', estuary: 'river' });

/**
 * The v2 scene data of a world. Always: camera and place from the spec, surfaces and water as geometry and kind only (the
 * water lock: colour, mirror and ripple from the kind). With statics (the default: the SVG still, tools and Node): every
 * static entity as a pinned ground placement in metres and the backdrop bands as far placements (the world is already
 * placed: nothing is judged or snapped again). o.statics === false (the live canvas): no statics at all; the compositor draws
 * them. o: { id, season, world, statics }.
 */
/** A closed outline simplified (Douglas-Peucker, tol metres): the roughened outlines of the build carry a point every metre or less; the v2 base needs the shape. */
function _wh5Simplify(P, tol) {
  const n = P.length;
  if (n <= 24) return P;
  const keep = new Uint8Array(n);
  const dist = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz; if (!L) return Math.hypot(p[0] - a[0], p[1] - a[1]); const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
  // split the ring at its two farthest-apart points, then recurse on each half
  let i0 = 0, i1 = 0, best = -1;
  for (let i = 1; i < n; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > best) { best = d; i1 = i; } }
  keep[i0] = 1; keep[i1] = 1;
  const stack = [[i0, i1], [i1, n]];
  while (stack.length) {
    const [a, b] = stack.pop(), A = P[a], B = P[b % n];
    let m = -1, md = tol;
    for (let i = a + 1; i < b; i++) { const d = dist(P[i], A, B); if (d > md) { md = d; m = i; } }
    if (m >= 0) { keep[m] = 1; stack.push([a, m], [m, b]); }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(P[i]);
  return out.length >= 3 ? out : P;
}
function worldHostV2Data(spec, o) {
  o = o || {};
  const world = o.world || worldHostWorld(spec, o), statics = o.statics !== false;
  const P = spec.place || {}, cam0 = spec.camera || {};
  const camera = Object.assign({}, cam0);
  if (camera.lat == null && Number.isFinite(P.lat)) camera.lat = P.lat;
  if (camera.lon == null && Number.isFinite(P.lon)) camera.lon = P.lon;
  if (camera.alt == null && Number.isFinite(P.alt)) camera.alt = P.alt;
  const style = (spec.backdrop && spec.backdrop.style) || P.style;
  const urban = /^(city|town)/.test(style || '');
  const data = { v: 2, id: o.id || spec.id || 'world', view: { lat: camera.lat, lon: camera.lon }, camera, at: 'afternoon', season: 'auto',
    // particles 'none' (audit 15 Oct, bug 12): the v2 seasonal screen particles (petals, summer motes that glow as fireflies at
    // night, autumn leaves from an empty sky) belong to no tree or chimney (M3, K7); a world's particles come from the world
    setting: urban ? 'urban' : 'natural', atmos: 'auto', weather: 'live', cover: 'auto', particles: 'none',
    surfaces: [{ id: 'world-rest', kind: urban ? 'plot' : 'grass', rest: true }], water: [], place: [], scatter: [], actors: [], flows: [], world3: true };
  // a far shore that is the world's own (the estuary's low line of roofs, cranes and trees in haze, 79-world-4backdrop.js) is not painted
  // again by the v2 backdrop: its UK woodland band was a wall of green trees along the whole far shore of the Mersey (user, 16 Oct)
  if (world && world.backdrop && typeof WORLD_BACKDROP_STYLES === 'object' && WORLD_BACKDROP_STYLES[world.backdrop.style] && WORLD_BACKDROP_STYLES[world.backdrop.style].own) data.backdrop = 'none';   // a style with `own: true` (estuary, upland) is the world's own far ground
  // the terrain (W2) is drawn by the world (79-world-4terrain.js): the v2 base keeps its flat ground, so it needs no relief
  // the spec rides along (not enumerable: the bake cache and JSON never see it) so worldHostSpec finds it from the data
  try { Object.defineProperty(data, '$spec', { value: spec, enumerable: false }); } catch (e) { /* frozen */ }
  // the BUILT world's outlines (a reed bed's, a pond's shore: roughened by the natural-edge pass of the build, 79-world-0core.js
  // _wcNaturalEdge): the v2 base draws the bank band and the ground along them, never along the ruled polygon the scene authored
  // (the dark straight band along an island's front at the Fleet Pond, 16 Oct)
  const built = new Map();
  for (const q of (world && world.surfaces) || []) if (q && q.id != null && Array.isArray(q.poly) && q.poly.length >= 3) built.set(String(q.id), _wh5Simplify(q.poly, 0.12));
  for (const s of spec.surfaces || []) {
    if (!s || !s.id) continue;
    const bp = s.poly && built.get(String(s.id));
    const geo = s.poly ? { poly: bp || s.poly } : s.path ? { path: s.path, width: s.width || 2 } : null;
    if (!geo) continue;
    if (s.kind === 'water') {
      // the bank by the place (P5): a town river, canal or dock is walled in stone (a quay face down to the water), a deep cut too;
      // a country pond or river keeps its natural margin. A surface's own `edge` (geometry, allowed by the water lock) wins.
      const wk = WORLD_HOST_WATER_V2[s.water] || 'pond', lvl = Number.isFinite(s.level) ? s.level : Number.isFinite(cam0.water) ? cam0.water : 0;
      const edge = typeof s.edge === 'string' ? s.edge : wk === 'harbour' ? 'quay' : (urban && (wk === 'river' || wk === 'canal')) || (wk === 'river' && lvl <= -1) ? 'quay' : undefined;
      data.water.push(Object.assign({ id: s.id, kind: wk }, edge ? { edge } : {}, geo));
      continue;
    }
    data.surfaces.push(Object.assign({ id: s.id, kind: WORLD_HOST_KIND_V2[s.kind] || 'grass' }, geo));
  }
  if (!statics) return data;
  // the statics: placed by the world, so the v2 compile must not judge or snap them again. Each goes in as a pinned placement
  // at the camera's projection of its world anchor, its scale from its real height (the descriptor), its view from its facing.
  const cam = world.cam || (typeof sceneCamera === 'function' ? sceneCamera({ camera }) : null);
  const ents = (world.entities || []).filter(e => e && e.static !== false && e.obj);
  if (cam) for (const e of ents) data.place.push(...worldHostPlace(cam, e));
  // a minimal world (no core): the clusters it could not expand, as v2 clustered scatter; hedge surfaces as hedge scatter
  if (world.minimal) for (const e of spec.entities || []) {
    if (!e || !e.cluster) continue;
    data.scatter.push({ obj: e.cluster, on: [e.on].filter(Boolean), n: e.n || 20, dist: 'ground', cluster: { centres: Math.max(2, Math.round((e.n || 20) / 8)), spread: e.edge ? 2.5 : 6 }, seed: e.seed || 1, anim: false });
  }
  if (world.minimal) for (const s of spec.surfaces || []) {
    if (s && s.kind === 'hedge' && s.id) data.scatter.push({ obj: s.obj || 'plant.towpath-hedge', on: [s.id], n: Math.max(6, Math.round((s.path ? _wh5Len(s.path) : 40) / 2)), dist: 'ground', cluster: { centres: 8, spread: 4 }, seed: 17, anim: false });
  }
  // the backdrop bands (look): far entities in metres, placed the same way
  if (typeof worldBackdrop === 'function' && cam) {
    try { for (const b of worldBackdrop(world, cam, o.season || 'summer') || []) if (b && b.obj && Number.isFinite(b.x) && b.z > 0) data.place.push(...worldHostPlace(cam, b)); } catch (e) { /* no bands: the v2 distant hills remain */ }
  }
  return data;
}
/**
 * The v2 placement of one world entity: [] when it is behind the camera or has no drawing. Pure. cam: a v2 camera.
 * { obj, variant, x, y, s, pin: true, flip, anim: false } with x, y the projected anchor (scene units) and s = (f / z) x real h / drawn h.
 */
function worldHostPlace(cam, e) {
  if (!(e.z > 0.3) || typeof sceneProject !== 'function') return [];
  // the view from the facing against the line of sight (4.3): 5 drawn views + mirrors; a missing view keeps the side view
  const v = worldHostViewOf(e.facing || 0, e.x, e.z), obj = _wh5ViewObj(e.obj, v.view);
  const def = typeof sceneObj === 'function' ? sceneObj(obj) : null;
  if (!def || !def.size) return [];
  const hM = _wh5HeightOf(e);
  const P = sceneProject(cam, e.x, e.z, Number.isFinite(e.y) ? e.y : null), s = (cam.f / e.z) * hM / def.size[1];
  if (P.X < -2000 || P.X > 3600) return [];
  const p = { obj, x: Math.round(P.X * 10) / 10, y: Math.round(P.Y * 10) / 10, s: Math.round(s * 1e4) / 1e4, pin: true, anim: false };
  if (e.variant != null && Number.isInteger(e.variant)) p.variant = e.variant;
  if (v.mirror) p.flip = true;
  return [p];
}
/** The real height of a world entity or agent (metres): its own, the descriptor's, else the v2 size table. */
function _wh5HeightOf(e) {
  if (Number.isFinite(e.height) && e.height > 0) return e.height;
  if (Number.isFinite(e.h) && e.h > 0) return e.h;
  const info = typeof worldObjectInfo === 'function' ? worldObjectInfo(e.obj) : null;
  return (info && info.size && info.size.h) || _wh5RealH(e.obj);
}
function _wh5Len(path) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); return L; }

/* ---------- the life of a world: a deterministic driver (R4) ---------- */
const WORLD_HOST_SIM_HZ = 15, WORLD_HOST_WARM_S = 90;
/**
 * The life sim of a world (life package: worldNavBuild, worldLifeInit, worldLifeTick, worldAgents), ticked in WHOLE fixed
 * steps only, so the state after n ticks depends on the seed and n alone. The warm-up (4.4: seed + scene time, a fixed
 * 0.25 s step over 90 s) is the life package's own init; when an init does not warm, it is done here. o: { nav (reuse a
 * built nav: a reset costs only the warm-up), warm (false: none) }. Returns null when the life package is not loaded.
 * The returned sim: { nav, life, hz, step, ticks, tick(), snapshot(), base, error? }.
 */
function worldHostSim(world, o) {
  o = o || {};
  if (typeof worldNavBuild !== 'function' || typeof worldLifeInit !== 'function' || typeof worldLifeTick !== 'function' || typeof worldAgents !== 'function') return null;
  let nav = o.nav || null, life = null;
  const bad = (e) => ({ error: String(e && e.message || e), nav, life: null, hz: WORLD_HOST_SIM_HZ, step: 1 / WORLD_HOST_SIM_HZ, ticks: 0, tickMs: [], tick() {}, snapshot: () => [], base: [] });
  const lo = { warm: o.warm !== false };
  if (Number.isFinite(o.ms)) lo.ms = o.ms;
  if (o.ctx || world.time || world.ctx) lo.ctx = o.ctx || world.time || world.ctx;
  try { if (!nav) nav = worldNavBuild(world); life = worldLifeInit(world, nav, 0, lo); } catch (e) { return bad(e); }
  if (o.warm !== false && !(life && life.t >= 1)) {
    try { for (let s = 0; s < WORLD_HOST_WARM_S; s += 0.25) worldLifeTick(life, 0.25); } catch (e) { return bad(e); }
  }
  const step = life && life.step > 0 ? life.step : 1 / WORLD_HOST_SIM_HZ;
  const sim = { kind: 'sim', nav, life, hz: 1 / step, step, ticks: 0, tickMs: [], error: null };
  sim.snapshot = () => { try { return worldAgents(life) || []; } catch (e) { return []; } };   // worldAgents makes fresh records on every call
  sim.tick = () => {
    const a = _wh5Now();
    try { worldLifeTick(life, step); } catch (e) { sim.error = String(e && e.message || e); }
    sim.ticks++;
    sim.tickMs.push(_wh5Now() - a); if (sim.tickMs.length > 240) sim.tickMs.shift();
  };
  sim.base = sim.snapshot();
  return sim;
}
const _wh5Now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());   // profiling only, never scene time

/**
 * The driver of a world's life (11.3). The systems runner (worldRun, systems package) drives every system the registry has
 * (time, wind, water, anim, attach, lod, light ...) in WHOLE fixed ticks (runner.advance), never by frame time. The agents
 * come from the runner's own life system when it has one (world.agents after its init), else from the life sim
 * (worldHostSim), ticked on its own exact schedule inside the same ticks and handed to the runner as world.agents, so the
 * other systems see them. With no runner: the life sim alone. No life package: statics only (null).
 * The scene time t is one tick ahead of floor(t * hz) and the agents are interpolated between the two last ticks: the agents
 * at t are a pure function of the world (seed, date) and t (R4). o: { nav, warm, ms (the date and time of the time context),
 * deterministic (budgets never act: stills, captures, frame records) }.
 *   driver.at(t) -> agents (t never runs backwards on one driver: a reset builds a new one)
 */
function worldHostDriver(world, o) {
  o = o || {};
  let R = null;
  if (typeof worldRun === 'function') {
    try { R = worldRun(world, { ms: Number.isFinite(o.ms) ? o.ms : undefined, deterministic: o.deterministic !== false, quiet: true }); } catch (e) { R = null; }
    if (R && typeof R.advance !== 'function') R = null;
  }
  // the runner's own life systems (life package: worldLifeOf(world), made by their init)
  const lifeOfWorld = () => { try { return typeof worldLifeOf === 'function' ? worldLifeOf(world) : null; } catch (e) { return null; } };
  // ... only while every life system of the runner is alive (one that threw at init is disabled: the life sim drives instead)
  const lifeSysOk = () => { try { const st = R.stats().systems.filter(q => /^life/.test(q.id)); return st.length > 0 && st.every(q => q.enabled); } catch (e) { return false; } };
  const own = !!(R && lifeOfWorld() && typeof worldAgents === 'function' && lifeSysOk());
  if (own && !Array.isArray(world.agents) && Array.isArray(lifeOfWorld().agents)) world.agents = lifeOfWorld().agents;
  const sim = own ? null : worldHostSim(world, { nav: o.nav || world.nav || null, warm: o.warm, ms: o.ms });
  if (sim && sim.nav && !world.nav) world.nav = sim.nav;
  if (!R && !sim) return null;
  const hz = R ? (typeof WORLD_TICK_HZ === 'number' && WORLD_TICK_HZ > 0 ? WORLD_TICK_HZ : 30) : sim.hz;
  const d = { kind: R ? (own ? 'run' : 'run+sim') : 'sim', runner: R, sim, nav: world.nav || (sim && sim.nav) || null, hz, step: 1 / hz, ticks: 0, simTicks: 0, tickMs: [], error: null };
  const lifeOf = () => (own ? lifeOfWorld() : sim && sim.life);
  d.snapshot = () => {
    let list;
    try {
      if (own) list = worldAgents(lifeOfWorld()) || [];   // fresh records on every call
      else list = sim ? sim.snapshot() : [];
    } catch (e) { d.error = String(e && e.message || e); return []; }
    // the opacity without the ghost pass (the draw floors a visible figure's ghost at 0.85, never its fade: WORLD_FLICKER.md 3)
    const gk = typeof WORLD_LIFE_GHOST === 'object' && WORLD_LIFE_GHOST && Number.isFinite(WORLD_LIFE_GHOST.fade) ? WORLD_LIFE_GHOST.fade : 0.55;
    for (const a of list) {
      if (!a || !Number.isFinite(a.alpha)) continue;
      const g = a.ghost > 0 ? 1 - gk * a.ghost : 1;
      a.alphaNoGhost = a.ghost > 0 && a.alpha >= g - 1e-9 ? 1 : a.alpha;
    }
    return list;
  };
  d.tick = () => {
    const a = _wh5Now();
    d.ticks++;
    if (sim) {
      // the life sim on its own exact schedule (15 Hz inside 30 Hz ticks): whole steps only
      const need = Math.floor(d.ticks * sim.hz / hz + 1e-9);
      while (d.simTicks < need) { sim.tick(); d.simTicks++; }
      if (R && sim.life) world.agents = sim.life.agents;
    }
    if (R) { try { R.advance(1 / hz); } catch (e) { d.error = String(e && e.message || e); } }
    d.tickMs.push(_wh5Now() - a); if (d.tickMs.length > 240) d.tickMs.shift();
  };
  if (sim && R && sim.life) world.agents = sim.life.agents;
  d.life = lifeOf;
  d.base = d.snapshot();
  d.tau = 0; d.prev = d.base; d.cur = d.base; d.done = 0;
  // the life's own steps (WORLD_FLICKER.md 3): the life sim steps at 15 Hz inside the 30 Hz ticks, so what it alone sets (opacity,
  // velocity, the gait, the state) changes every other tick. Those are presented from the last two LIFE steps, never from two ticks
  // (two ticks of one step held the opacity still, then it jumped by a fifteenth of a fade); positions are the life's own interpolation.
  const lifeT = () => { try { const L = lifeOf(); return L && Number.isFinite(L.t) ? L.t : null; } catch (e) { return null; } };
  d.step = { lt: lifeT(), T0: null, T1: 0, S0: null, S1: _wh5ById(d.base) };
  const stepOf = (snap) => {
    const lt = lifeT();
    if (lt == null || lt === d.step.lt) return;
    const st = d.step;
    st.lt = lt; st.T0 = st.T1; st.T1 = d.done / d.hz; st.S0 = st.S1; st.S1 = _wh5ById(snap);
  };
  // the next tick count for scene time t: one ahead of floor(t * hz), so t lies between prev and cur. o.cap: at most this many ticks now
  // (a live frame: WORLD_HOST_SUBSTEPS; the scene time then waits for the life, it never jumps); d.tau is the time shown
  d.at = (t, o) => {
    t = Math.max(0, Number(t) || 0);
    const cap = o && o.cap > 0 ? o.cap : Infinity;
    let k = t * d.hz, need = Math.floor(k + 1e-9) + 1, n = 0;
    while (d.done < need && n < cap) { d.prev = d.cur; d.tick(); d.cur = d.snapshot(); d.done++; n++; stepOf(d.cur); }
    if (d.done < need) { t = Math.max(d.tau, (d.done - 1e-3) / d.hz); k = t * d.hz; need = d.done; }
    d.tau = t;
    const out = _wh5Lerp(d.prev, d.cur, Math.max(0, Math.min(1, k - (need - 1))));
    return _wh5Steps(out, d.step, t, 1 / d.hz);
  };
  /** The date and time of the time context (a new light in the app; T2). */
  d.setTime = (ms) => { if (R && typeof R.setTime === 'function' && Number.isFinite(ms)) { try { R.setTime(ms); } catch (e) { /* keep */ } } };
  d.stop = () => { if (R && typeof R.stop === 'function') { try { R.stop(); } catch (e) { /* gone */ } } };
  return d;
}
/**
 * Agents between two snapshots by id (al 0: the previous tick, 1: the latest): interface I3 (docs/dev/WORLD_FLICKER.md 3). Every
 * presented scalar is interpolated (positions, height on one layer, velocity, speed, opacity, the gait weight walkK; headings, facing and
 * phases the short way round); the DISCRETE fields (state, pose, clip, view, loco, layer, host ...) come from the tick nearer in time, so a
 * frame never shows one tick's state beside the other tick's position. One that only exists in cur is drawn where it is (it just
 * spawned; its opacity comes up from 0 over the life step: _wh5Steps).
 */
const _wh5LerpMemo = { prev: null, cur: null, outC: null, outP: null, P: null };   // the clones of one pair of ticks live for every frame between them
// scalars interpolated as they are, and the angles and phases interpolated the short way round (period)
const _WH5_LERP = ['vx', 'vz', 'speed', 'alpha', 'alphaNoGhost', 'ghost', 'walkK'];
const _WH5_WRAP = [['heading', 2 * Math.PI], ['facing', 360], ['phase', 1], ['gaitPhase', 1]];
function _wh5Mix(p, c, al, period) {
  if (!Number.isFinite(p)) return c;
  if (!Number.isFinite(c)) return p;
  if (!period) return p + (c - p) * al;
  let d = (c - p) % period;
  if (d > period / 2) d -= period; else if (d < -period / 2) d += period;
  const v = (p + d * al) % period;
  return v < 0 ? v + period : v;
}
function _wh5Lerp(prev, cur, al) {
  if (prev === cur) return cur.map(a => ({ ...a }));
  // the objects are made once per pair of ticks (a crowd of 60 cloned 45 fields each frame was the biggest cost of Kelham's frame after the sprites)
  // and only their scalars move from frame to frame: the clones of cur (al >= 0.5) and of prev (al < 0.5, by cur's order) for the discrete fields
  const M = _wh5LerpMemo;
  if (!(M.prev === prev && M.cur === cur && M.outC && M.outC.length === cur.length)) {
    M.prev = prev; M.cur = cur; M.P = new Map(); for (const q of prev) M.P.set(q.id, q);
    M.outC = cur.map(c => ({ ...c })); M.outP = new Array(cur.length);   // (prev's clones: made when a frame first needs them)
    const c0 = cur[0] || {};
    M.keys = _WH5_LERP.filter(k => k in c0); M.wrap = _WH5_WRAP.filter(([k]) => k in c0);
  }
  const P = M.P, near = al >= 0.5, out = new Array(cur.length), keys = M.keys, wrap = M.wrap;
  for (let i = 0; i < cur.length; i++) {
    const c = cur[i], p = P.get(c.id);
    let a = M.outC[i];
    if (!near && p) a = M.outP[i] || (M.outP[i] = { ...p });
    out[i] = a;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) {
      a.x = p.x + (c.x - p.x) * al; a.z = p.z + (c.z - p.z) * al;
      // the height only between two ticks on one layer: a bird that lands (air -> walk) is drawn on the ground in its walk pose,
      // never hovering half-way down in it (the real-frame run's 'floating' pigeons of the Pier Head, merge of 15 Oct)
      if (Number.isFinite(p.y) && Number.isFinite(c.y) && p.layer === c.layer) a.y = p.y + (c.y - p.y) * al; else a.y = near ? c.y : p.y;
      for (let j = 0; j < keys.length; j++) { const k = keys[j]; a[k] = _wh5Mix(p[k], c[k], al, 0); }
      for (let j = 0; j < wrap.length; j++) { const k = wrap[j][0]; a[k] = _wh5Mix(p[k], c[k], al, wrap[j][1]); }
      // the footprint moves with the body: two long vehicles passing within a tick are ordered by where they are drawn, not where they were
      const f = near ? c.foot : p.foot || c.foot, fx = near ? c.x : p.x, fz = near ? c.z : p.z;
      if (Array.isArray(f)) { const dx = a.x - fx, dz = a.z - fz; a.foot = f.map(q => (Array.isArray(q) ? [q[0] + dx, q[1] + dz] : q)); }
    } else { a.x = c.x; a.z = c.z; a.y = c.y; if (Array.isArray(c.foot)) a.foot = c.foot; }
  }
  return out;
}
function _wh5ById(list) { const m = new Map(); for (const a of list || []) if (a && a.id != null) m.set(a.id, a); return m; }
// what the life sim alone sets at its own steps (15 Hz): presented from the last two life steps (_wh5Steps), the discrete ones with them
const _WH5_STEP_LERP = ['alpha', 'alphaNoGhost', 'ghost', 'walkK', 'vx', 'vz', 'speed'];
const _WH5_STEP_WRAP = [['gaitPhase', 1], ['heading', 2 * Math.PI], ['facing', 360], ['phase', 1]];
const _WH5_STEP_DISCRETE = ['state', 'pose', 'clip', 'view', 'mirror', 'loco', 'gait', 'gaitName', 'lookAt', 'stepping', 'squeeze', 'wants', 'intent', 'leaving'];
/**
 * The life's step-level scalars of the agents a frame draws (WORLD_FLICKER.md 3): the life sim steps every other tick of the runner, so
 * the scalars it alone sets would hold for one tick and then jump. They are laid on a line through the two last life steps, late by one
 * tick less than a step (so the line is always between two KNOWN steps and continuous across them): u = (t - T1 + 1 tick) / step. The
 * discrete fields of those steps switch at u = 0.5 with them. A new agent (not in the earlier step) comes up from opacity 0 over the
 * step. st: the driver's { T0, T1, S0, S1 }; tick: the driver's tick (s).
 */
function _wh5Steps(out, st, t, tick) {
  if (!st || !st.S0 || !st.S1 || !(st.T1 > st.T0)) return out;
  const step = st.T1 - st.T0, u = Math.max(0, Math.min(1, (t - st.T1 + tick) / step));
  if (u >= 1) return out;
  for (const a of out) {
    const s1 = st.S1.get(a.id);
    if (!s1) continue;
    const s0 = st.S0.get(a.id);
    if (!s0) { if (Number.isFinite(s1.alpha)) a.alpha = s1.alpha * u; continue; }
    for (const k of _WH5_STEP_LERP) if (Number.isFinite(s1[k]) && Number.isFinite(s0[k])) a[k] = s0[k] + (s1[k] - s0[k]) * u;
    for (const [k, per] of _WH5_STEP_WRAP) if (Number.isFinite(s1[k]) && Number.isFinite(s0[k])) a[k] = _wh5Mix(s0[k], s1[k], u, per);
    if (u < 0.5) for (const k of _WH5_STEP_DISCRETE) if (k in s0) a[k] = s0[k];
  }
  return out;
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
    const hM = _wh5HeightOf({ obj: a.obj, h: a.h });
    // the near band (3.2: nav forbids it; a giant at the lens is never drawn even if a module let one through)
    if (a.z < cam.f * hM / 405 && !a.framed) { if (o.dropped) o.dropped.near++; continue; }
    const p = sceneProject(cam, a.x, a.z, Number.isFinite(a.y) ? a.y : null);
    const s = (cam.f / Math.max(0.3, a.z)) * hM / def.size[1];
    if (p.X < -200 || p.X > 1800 || p.Y < -200) continue;
    out.push({ a, id: a.id, o: obj, v: a.variant == null ? 0 : a.variant, X: p.X, Y: p.Y, s, flip: !!a.mirror, d: a.z, layer: _wh5LayerOf(cam, a.z, o.layers),
      view: a.view || 'side', alpha: Number.isFinite(a.alpha) ? Math.max(0, Math.min(1, a.alpha)) : 1, kind: a.cls, moving: Math.hypot(a.vx || 0, a.vz || 0) > 0.05, phase: a.phase || 0 });
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
  const links = (def && def.views && !Array.isArray(def.views) && def.views) || (typeof SCENE_OBJ_VIEWS !== 'undefined' && SCENE_OBJ_VIEWS[obj]) || null;
  const k = links && (links[view] || (view === 'back' && links.rear) || (view === 'q-front' && links.q));
  let id = k && (typeof k === 'string' ? k : k.o || k.obj);
  if (!id && typeof sceneObj === 'function' && sceneObj(obj + '-' + view)) id = obj + '-' + view;
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

/* ---------- the scene clock (R5, M8) ---------- */
const WORLD_HOST_MAX_DT = 0.25;            // a frame later than this is a pause (offscreen, held): resume without a jump
// a slow frame advances the scene by at most this (2 ticks of the fixed step): without the cap a frame that took 200 ms owed 6 ticks of
// every system, which made the next frame slower still (140 ms a frame at a 4x throttle, 90 ms of it the catch-up). The scene then runs
// slower than real time on a machine that cannot keep 10 frames a second, instead of spending its frames on catching up.
const WORLD_HOST_CATCHUP = 2 / 30;
/**
 * The scene clock of a live world: scene seconds (tau) since the scene was first SHOWN. frame(key, t, flags) takes the host
 * time t of a frame (seconds; key: the renderer's bake) and returns tau:
 *   - flags.still: 0 (a still is the base moment, the clock is untouched);
 *   - flags.warming / flags.hidden / flags.capture (hidden preparation, a hidden tab, a still or snapshot drawn into another canvas):
 *     the clock neither starts nor moves (R5, M8);
 *   - the first visible frame starts it at 0; each next one moves it by the host's step;
 *   - a step over WORLD_HOST_MAX_DT is a pause (offscreen, held, a background tab): one nominal frame, no jump (M8);
 *   - a step over WORLD_HOST_CATCHUP (a slow frame) moves the scene by WORLD_HOST_CATCHUP only (slower than real time, never a spiral);
 *   - a step back (the host restarted ITS clock: the opening's welcome, the bake cache's still at t = 0) REBASES: the scene time goes
 *     on from where it is (WORLD_FLICKER.md 1). Until 14 Nov it restarted at 0 and the life went back to its base, so every person
 *     jumped back to where they stood seconds before and froze while the life was built again;
 *   - another renderer drawing the same world at once only shows the moment (one clock per world, G10); a renderer that draws after
 *     the owner stopped takes the clock over where it is (rebased, never a jump).
 * The clock never runs backwards on its own: only pin() sets an earlier time (tools), and worldHostAt then resets the life for real.
 * pin(t): tools and captures put the clock at t; frames drawn at t confirm it, frames at any other host time leave it alone (R4).
 * o: { now } (tests).
 */
function worldHostClock(o) {
  o = o || {};
  const now = typeof o.now === 'function' ? o.now : _wh5Now;
  const c = { tau: 0, started: false, owner: null, lastT: 0, lastWall: -1e12, restarts: 0, rebases: 0, pauses: 0, pinned: false };
  c.frame = (key, t, f) => {
    f = f || {};
    if (f.still) return 0;
    if (!Number.isFinite(t)) return c.tau;
    // pinned (tools, captures): the scene time is the one pinned. A frame drawn at the pinned time confirms it; a stray frame of the
    // host at ITS time (a relight, a resize, a media-query change redraws at t = 0) never moves the clock, so it can never send the
    // life back to its base in the middle of a capture
    if (c.pinned) { if (Math.abs(t - c.pinT) < 1e-6) c.tau = Math.max(0, t); c.started = true; return c.tau; }
    if (f.warming || f.hidden || f.capture) return c.tau;
    const w = now();
    if (!c.started) { c.started = true; c.owner = key; c.lastT = t; c.lastWall = w; c.tau = 0; return 0; }
    const d = t - c.lastT;
    if (key !== c.owner) {
      // another bake key: the same renderer after a re-bake (its host time runs on: it takes over and moves the clock), another renderer
      // of the same world while the owner draws (its own host time: it shows the moment and never moves the clock twice), or one that
      // draws after the owner stopped (it takes the clock over where it is: rebased)
      if (w - c.lastWall < 500 && Math.abs(d) > WORLD_HOST_MAX_DT) return c.tau;
      if (w - c.lastWall >= 500) { c.owner = key; c.lastT = t; c.lastWall = w; c.rebases++; return c.tau; }
    }
    if (d < -WORLD_HOST_MAX_DT) { c.restarts++; c.rebases++; }   // the host restarted its clock: rebased (the scene time goes on)
    else if (d > WORLD_HOST_MAX_DT) { c.tau += 1 / 60; c.pauses++; }
    else if (d > 0) c.tau += d > WORLD_HOST_CATCHUP ? WORLD_HOST_CATCHUP : d;
    c.owner = key; c.lastT = t; c.lastWall = w;
    return c.tau;
  };
  c.pin = (t) => { c.pinned = true; c.started = true; c.pinT = Number(t) || 0; c.tau = Math.max(0, c.pinT); return c.tau; };
  c.unpin = () => { c.pinned = false; };
  return c;
}
// a live frame advances the life by at most this many whole ticks (WORLD_ENGINE.md 11.3): a driver behind its clock catches up over a few
// frames and the clock waits for it (slower for a moment, never a jump of the whole crowd)
const WORLD_HOST_SUBSTEPS = 8;

/* ---------- the live worlds the passes draw (keyed by the derived data's id) ---------- */
const _wh5Live = new Map();
const _wh5Still = new Map();
/** Is the world compositor (79-world-5frame.js) loaded and registered? Then the live data carries no statics. */
function _wh5Compositor() { return typeof worldFramePassOn === 'function' && !!worldFramePassOn(); }
/**
 * The scene data of a v3 spec (what a worldAdd item's scene is). o: { id, season, sim (false: the still), still, sync (build
 * the life now: stills, captures, tools and Node), t0 }.
 * - The still (o.sim === false or o.still): the derived data WITH statics (F4), memoised per id and season; it never touches
 *   the live record, so drawing a tile or an SVG never re-rolls a playing scene (G10).
 * - The live data: registered once per id and spec; a second call (a re-render, live sync, a task save) returns the same
 *   data and keeps the same world, life and clock (G10). With the compositor loaded it carries no statics (R1).
 */
function worldHostData(spec, o) {
  o = o || {};
  const base = o.id || spec.id || 'world';
  if (o.sim === false || o.still === true) {
    const key = base + '|' + (o.season || '');
    const hit = _wh5Still.get(key);
    if (hit && _wh5SameSpec(hit.spec, spec)) return hit.data;
    const world = worldHostWorld(spec, o);
    const data = worldHostV2Data(spec, Object.assign({}, o, { id: base + '~w3s', world, statics: true }));
    if (_wh5Still.size > 64) _wh5Still.clear();
    _wh5Still.set(key, { spec, data });
    return data;
  }
  const id = base + '~w3';
  const old = _wh5Live.get(id);
  if (old && _wh5SameSpec(old.spec, spec)) {
    if (o.sync && !old.driver) _wh5Init(old);
    return old.data;
  }
  const world = worldHostWorld(spec, o);
  const comp = _wh5Compositor() && !world.minimal;
  const data = worldHostV2Data(spec, Object.assign({}, o, { id, world, statics: !comp }));
  const rec = { id, spec, world, data, compositor: comp, driver: null, clock: worldHostClock(), resetting: null, frame: {}, noLife: o.sim === 'none', lastUsed: _wh5Now(),
    stats: { agents: 0, draws: 0, frames: 0, tickMs: 0, governor: 0, simInitMs: 0, resets: 0 } };
  _wh5Live.set(id, rec);
  // the life (nav + populations + the warm-up) is built OFF the cold-load path in a page. With the compositor it is built inside the
  // world bake's hidden slices (79-world-5frame.js: worldHostEnsureLife), so a scene is never ready without its people and they never pop
  // in all at once after it shows (WORLD_FLICKER.md 1); idle time builds it only if no bake has by then. Without the compositor: idle
  // time, as before. (o.sync: now, for stills, captures, tools and Node)
  if (rec.noLife) { /* statics only */ }
  else if (o.sync || typeof document === 'undefined') _wh5Init(rec);
  else _wh5Idle(() => _wh5Init(rec), comp ? 4000 : 1500);
  _wh5Sweep();
  return data;
}
/**
 * Build the life of a live record now if it has none (the world bake calls it in a hidden slice; a renderer that has no bake of its own
 * may call it before its first frame). Returns whether the record has a driver. rec: a live record or its data id.
 */
function worldHostEnsureLife(rec) {
  if (typeof rec === 'string') rec = _wh5Live.get(rec);
  if (!rec || rec.noLife) return !!(rec && rec.driver);
  if (!rec.driver) _wh5Init(rec);
  return !!rec.driver;
}
// live records nobody drew for this long let go of their bake products (a renderer that still holds a bake keeps its own; the next bake
// of an idle one rebuilds them): a page that showed many openings over a day no longer keeps every one's bitmaps (WORLD_FLICKER.md 8)
const WORLD_HOST_IDLE_MS = 10 * 60000;
let _wh5SweptAt = 0;
function _wh5Sweep() {
  const now = _wh5Now();
  if (now - _wh5SweptAt < 30000) return;
  _wh5SweptAt = now;
  for (const r of _wh5Live.values()) {
    if (!(now - (r.lastUsed || 0) > WORLD_HOST_IDLE_MS) || !r.frame) continue;
    if (r.frame.cache && r.frame.cache.size) r.frame.cache.clear();
    _wh5ClearMem(r);
    r.frame.groundPlan = null;
  }
}
function _wh5SameSpec(a, b) {
  if (a === b) return true;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
}
const _wh5Idle = (fn, timeout) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: timeout || 1000 }) : setTimeout(fn, 50));
function _wh5Init(rec, nav) {
  if (_wh5Live.get(rec.id) !== rec || (rec.driver && !nav) || rec.noLife) return;
  const a = _wh5Now();
  // a driver built again over the same world (a reset) needs the world's life state gone first, or the life systems' init keeps the old
  // life (its init returns early on world._wlfLife) and the 'reset' only re-labels the present as the base
  if (rec.driver || rec.lifeBuilt) worldHostResetLife(rec.world);
  try { rec.driver = worldHostDriver(rec.world, { nav: nav || null }); } catch (e) { rec.driver = null; rec.stats.simError = String(e && e.message || e); }
  rec.lifeBuilt = true;
  rec.stats.simInitMs = Math.round(_wh5Now() - a);
}
function worldHostLive(id) { return _wh5Live.get(id) || null; }
/** Forget the agents' draw memory of a live record (every renderer's: 79-world-5frame.js _wfrMemOf). */
function _wh5ClearMem(rec) {
  const f = rec && rec.frame;
  if (!f) return;
  if (f.agents) f.agents.clear();
  if (f.mems) for (const m of f.mems.values()) m.clear();
}
// the state the systems runner and its systems keep on a world (79-world-0sys.js _wsySlot, the life, wind, particles, light and attach
// systems); the world's own build (entities, surfaces, nav, camera, time) is left alone
const _WH5_LIFE_KEYS = ['_wlfLife', 'sim', 'agents', 'runner', 'bus', '_wsyRng', '_wsyAttach', '_wsyLod', '_wsyTimeS', '_wpt', '_wwd', '_wlLight'];
/**
 * A REAL reset of a world's life (WORLD_FLICKER.md 1): everything the runner and the life systems keep on the world is dropped (the life,
 * its agents, the systems' rngs and attach links, wind, particles, the light system, appearance's per-world animation state), so the next
 * driver starts from the seed exactly as the first one did (R4). Its nav (static) is kept. Returns the world.
 */
function worldHostResetLife(world) {
  if (!world || typeof world !== 'object') return world;
  for (const k of _WH5_LIFE_KEYS) { try { delete world[k]; } catch (e) { try { world[k] = undefined; } catch (e2) { /* frozen */ } } }
  world.t = 0; world.tick = 0;
  try { if (typeof _wanWorlds !== 'undefined' && _wanWorlds && typeof _wanWorlds.delete === 'function') _wanWorlds.delete(world); } catch (e) { /* no animation state */ }
  return world;
}
/**
 * Tools and captures: put a live world back at its base moment NOW (its life again from its seed, the clock pinned at 0), so the
 * next frames at t = 0, 0.5, 1 ... run the same loop from the start on every cell (R4). A page never does this on its own (its
 * clock never runs backwards); a capture does. Returns whether the driver is there.
 */
function worldHostRewind(id) {
  const rec = typeof id === 'string' ? _wh5Live.get(id) : id;
  if (!rec) return false;
  const nav = (rec.driver && rec.driver.nav) || rec.world.nav || null;
  try { if (rec.driver && typeof rec.driver.stop === 'function') rec.driver.stop(); } catch (e) { /* gone */ }
  rec.driver = null; rec.resetting = null;
  worldHostResetLife(rec.world);
  _wh5Init(rec, nav);
  _wh5ClearMem(rec);   // the draw memory of the old life (views, scale buckets, dissolves)
  if (rec.clock && typeof rec.clock.pin === 'function') rec.clock.pin(0);
  return !!rec.driver;
}

/**
 * The agents a frame draws (the passes call it). rec: a live record (or its data id); t: the host's frame time (seconds);
 * flags: { key (the renderer's bake), warming, hidden, still, capture ('still': a still kept with a bake or a background renderer's frame:
 * the base moment, the clock untouched; true / 'snap': a snapshot drawn into another canvas: the moment the clock is at, the clock
 * untouched), sync (build the life now if there is none) }. Returns { tau, agents, ready }.
 * The clock never runs backwards on its own (worldHostClock), so a live frame never resets the life. Only a tool that pins an earlier
 * time does: the life is then reset for real and run to that time at once (R4).
 */
function worldHostAt(rec, t, f) {
  f = f || {};
  if (typeof rec === 'string') rec = _wh5Live.get(rec);
  if (!rec) return { tau: 0, agents: [], ready: false };
  rec.lastUsed = _wh5Now();
  _wh5Sweep();
  const hidden = !!f.hidden || (f.hidden == null && typeof document !== 'undefined' && !!document.hidden);
  const still = !!f.still || f.capture === 'still';
  if (!rec.driver && f.sync && !rec.noLife) _wh5Init(rec);
  let tau = rec.clock.frame(f.key || 'k', t, { warming: f.warming, hidden, still, capture: !!f.capture });
  const d = rec.driver;
  if (!d) return { tau, agents: [], ready: !!rec.noLife };
  if (still) return { tau: 0, agents: d.base.map(a => ({ ...a })), ready: true };
  rec.resetting = null;
  if (tau + 1e-9 < d.tau) {
    if (rec.clock.pinned || f.sync || typeof document === 'undefined') {
      // a tool put the clock at an earlier moment: the life again from its seed (a real reset), run to tau now
      rec.stats.resets++;
      rec.stats.lastReset = { tau: tau, driverTau: d.tau, t: t, warming: !!f.warming, key: typeof f.key === 'object' ? 'env' : String(f.key), pinned: !!rec.clock.pinned };   // why (tools read it)
      const nav = d.nav || null;
      try { if (typeof d.stop === 'function') d.stop(); } catch (e) { /* gone */ }
      rec.driver = null; worldHostResetLife(rec.world); _wh5Init(rec, nav);
      _wh5ClearMem(rec);
    } else { tau = d.tau; rec.clock.tau = tau; }   // (cannot happen on a live clock; if it ever does, the life is shown where it is)
  }
  const D = rec.driver;
  if (!D) return { tau, agents: [], ready: false };
  let agents = [];
  // a live frame runs at most WORLD_HOST_SUBSTEPS ticks; a pinned clock (tools: an exact moment) and a sync frame run all of them
  const cap = rec.clock.pinned || f.sync || typeof document === 'undefined' ? 0 : WORLD_HOST_SUBSTEPS;
  try { agents = D.at(tau, cap ? { cap } : undefined); } catch (e) { agents = []; rec.stats.simError = String(e && e.message || e); }
  if (D.tau + 1e-9 < tau && !rec.clock.pinned) { tau = D.tau; rec.clock.tau = tau; rec.stats.held = (rec.stats.held || 0) + 1; }   // the clock waits for the life
  rec.stats.agents = agents.length; rec.stats.frames++;
  rec.stats.tickMs = D.tickMs && D.tickMs.length ? D.tickMs.reduce((x, y) => x + y, 0) / D.tickMs.length : 0;
  return { tau, agents, ready: true };
}

/* ---------- without the compositor: the agents through the v2 movers (a fallback; the live data then keeps its statics) ---------- */
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
  const recOf = (env) => { const r = _wh5Live.get(env.C && env.C.id); return r && !r.compositor ? r : null; };
  const now = (env, t) => {
    const rec = recOf(env);
    if (!rec) return null;
    if (env._wh5t === t && env._wh5now) return env._wh5now;
    env._wh5t = t;
    const st = worldHostAt(rec, t, { key: env, warming: !!env.warming, still: !!env.still, capture: env.capture || (env.background ? 'still' : undefined) });
    const list = worldHostAgents(st.agents, env.cam || env.C.cam, { layers: (env.C.layers || []).length });
    // (the governor never thins the people here: until 14 Nov level 4 dropped every tenth by its place in the list, which shifts whenever
    // anyone arrives or leaves, so people popped in and out; WORLD_FLICKER.md 7)
    rec.stats.govern = env.gov ? env.gov.level : 0;
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
    applies(C) { return !!recOf({ C }); },
    frameGroup(env, grp, ctx, t) {
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
          ctx.globalAlpha = a.alpha;
          ctx.setTransform(env.vs * a.s * (a.flip ? -1 : 1), 0, 0, env.vs * a.s, env.vs * a.X + env.ox, env.vs * a.Y + env.oy);
          ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
          ctx.globalAlpha = 1;
          const rec = recOf(env); if (rec) rec.stats.draws++;
          return 1;
        } });
      }
      return 0;
    },
    stats(env) { const rec = recOf(env); return rec ? Object.assign({}, rec.stats) : {}; },
  });
}

/**
 * The v3 renderer (the player's data.v === 3 route): the same surface as the v2 renderer (start, stop, setTime, stats,
 * still, resize, setLight, frame, snapshot, destroy). item: a v3 item ({ scene: { v: 3, spec } }), a data object or a spec.
 * canvas: a canvas (null: the SVG still only). o: the v2 renderer's options (+ season, sim).
 */
function worldRendererFor(item, canvas, o) {
  o = o || {};
  const spec = worldHostSpec(item);
  if (!spec) throw new Error('not a v3 scene');
  const season = o.season || (typeof sceneSeason === 'function' && o.sky && Number.isFinite(o.sky.ms) ? sceneSeason(o.sky.ms, spec.place && spec.place.lat) : null) || 'summer';
  const id = (item && item.id) || spec.id;
  const svgStill = (so) => (typeof sceneSvg === 'function' ? sceneSvg(worldHostData(spec, { id, season, sim: false }), Object.assign({ season }, o, so || {}, { renderer: 'svg' })) : '');
  if (!canvas || typeof sceneRendererCreate !== 'function' || (typeof sceneCanvasSupported === 'function' && !sceneCanvasSupported())) {
    const data = worldHostData(spec, { id, season, sim: false });
    return { kind: 'svg', start() {}, stop() {}, setTime() {}, stats: () => ({ svg: true }), still: svgStill, destroy() {}, data };
  }
  const data = worldHostData(spec, { id, season, sync: !!o.still });
  const rec = _wh5Live.get(data.id);
  const r = sceneRendererCreate(canvas, data, Object.assign({}, o, { season }));
  const api = Object.create(r);
  Object.assign(api, {
    kind: 'canvas', data, world: rec ? rec.world : null,
    /** Put the scene clock at t (seconds of scene time; tools and captures): frames then show exactly t (R4). */
    setTime(t) { if (rec) rec.clock.pin(t); r.frame(t); },
    still(so) { return svgStill(so); },
    stats() {
      const s = r.stats();
      s.world = rec ? Object.assign({}, rec.stats, { compositor: rec.compositor, minimal: !!rec.world.minimal, problems: (rec.world.problems || []).length, sim: !!rec.driver, driver: rec.driver ? rec.driver.kind : null,
        simError: rec.driver && rec.driver.error || null, tau: rec.clock.tau, restarts: rec.clock.restarts }) : null;
      return s;
    },
    destroy() { r.destroy(); },
  });
  return api;
}

/**
 * The order invariant for one frame (tests and `world motion`): D's worldFrameOrder over the world's statics and the agents
 * at t; returns the violations (2.3 item 5; must be 0). Pure.
 */
function worldHostOrderCheck(world, agents, cam) {
  if (typeof worldChunks !== 'function' || typeof worldFrameOrder !== 'function' || typeof worldOrderCheck !== 'function') return null;
  // footprints that reach behind the lens (a long boat alongside the camera) are clipped at the near plane: only what is in front draws
  const zMin = Math.max(0.3, (cam.dMin || 1) * 0.5);
  const proj = { f: cam.f, project: (x, z, y) => { const p = sceneProject(cam, x, Math.max(zMin, z), y); return [p.X, p.Y]; } };
  const chunks = worldChunks(world, null, proj);
  // (as the frame does, 5frame: an agent on a host's deck is attached to it, so it draws after the host)
  const ag = (agents || []).map(a => Object.assign({}, a, { static: false, height: a.height || 1.7, attach: a.attach || (a.host ? 'deck:' + a.host : null) }));
  return worldOrderCheck(worldFrameOrder(chunks, ag, proj));
}

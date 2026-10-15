/* ============================================================
   SCENE LIBRARY: motion behaviours (presets a scene author picks by NAME). PURE: functions and consts only, nothing runs
   at load; every engine function it calls (sceneCamera, sceneProject, sceneObj, sceneObjReal, sceneObjShapes, sceneRnd,
   sceneDepthBand) is looked up when called, so the load order does not matter.

   WHY. Hand-made movers went wrong in the same few ways: ducks floating above the water or swimming through boats and
   reeds, dog walkers walking through walls, fences and gates, people and animals too small for their distance, a duck
   drawn in front of the boardwalk it is behind (its layer), legs swinging while a mover slid on the spot, instant turns
   and teleports. A behaviour builds the mover FROM GROUND METRES so none of that can happen by construction:

   sceneBehave.actor(data, spec)    -> one actor (the v1 pixel form: a TIMED path, sByY, layer, seed, anim) for data.actors
   sceneBehave.actors(data, spec)   -> [actor, ...companions] (a dabbling duck is two actors: the swimmer and the up-ended duck)
   sceneBehave.pair(data, spec)     -> [a, b] two people walking side by side who stop, turn to each other and chat
   sceneBehave.walkWithDog(data, spec) -> [walker, dog] a walker and an off-lead dog that trots ahead, stops to sniff, catches up
   sceneBehave.meet(data, specA, specB, o) -> [a, b] two walkers on crossing routes who arrive at the crossing together, stop,
                                    face each other and chat, then go on (one clock: the same cycle, offsets aligned)
   sceneBehave.states(data, spec)   -> the deterministic states a route gets (below): [{ s, state, at, face }] (for tools and tests)
   sceneBehave.route(data, pts, o)  -> the cleaned route in metres (kept on water / on walkable ground, round obstacles)
   sceneBehave.layerFor(data, pts, o) -> the layer id that draws a mover on that route behind what is nearer, over what is farther
   sceneBehave.lint(data)           -> [{ rule, sev, i, obj, msg, fix }] the motion problems of a scene's actors and placements
   sceneBehave.hooks(name, o)       -> [AnimHook] the idle and gait hooks of a preset (the object library builds return them as $anim)
   sceneBehave.stride(gait, speedM) -> the walk hook's period for a gait at a speed, so a foot never slides (2 steps a cycle)
   sceneBehave.syncSeed(obj, v, seed) -> a seed whose walk hooks share one phase (the legs and the swinging arm of a walker)
   sceneBehave.PRESETS              the gaits and behaviours by name (below); sceneBehave.names() lists them

   spec (actor): { obj, preset, route: [[x, d], ...] (ground metres, as data.place `at`), variant, seed, k (size factor, 1),
     speedM (override), loop: 'out-back' (default: there and back, no teleport) | 'loop' (a closed route) | 'through' (both ends
     off-screen: walks across and comes round again unseen), offset (0..1 of the cycle), layer (forced), avoid: [obstacle],
     acts: false (no pauses) | [names] (override the preset's), h (metres above the ground), anim (extra hook overrides) }
   obstacle: { at: [x, d], r } | { poly: [[x, d], ...] } | { line: [[x, d], ...], w } ; every data.place item of class boat,
     structure, building or street with a ground position is an obstacle automatically (a fence, wall or gate: a line).

   PRESETS (by name; aliases in brackets):
     people   stroll, brisk, jogger, child, elderly, dog-walker (stroll with sniff stops), chat (used by pair)
     dogs     dog-trot (off lead: trots, sniffs, catches up)
     water    duck (paddle, look, preen and dabble stops), swan (a slow glide, long drifts), goose-swim, coot (busy, short
              dives), grebe (dives: hidden under for a few seconds), moorhen (jerky, head-bobbing)
     ground   goose-graze (a step, a crop of grass, a look up), heron-stalk (slow steps, long freezes), cattle-graze, pony-graze,
              sheep-graze, deer (wary: freezes and looks)
   STATES (merge package "crowd", 15 Oct: the v3 brains' sit / view / chat goals, 79-world-2brains.js, as DATA in the timed path:
   seeded, no runtime state, nothing for the author to do):
     view   a person's look stop within 6 m of water faces the water for the whole stop (instead of looking back and forth); the
            stop keeps its place and its seconds, so the timeline (and every other mover's) is unchanged
     sit    spec.sit: { at: [x, d] (within 3 m of the route), obj ('person.bench-sitter'), variant, w }: the walker steps to the seat
            and is replaced for the stop by the seated figure, which brings its own seat, then steps back to its route. Not
            automatic: the library's benches (street.bench) are FRONT views and its seated people SIDE views with their own
            bench, so a seated figure drawn over a placed bench would show two benches; a scene asks for it where it wants one
     chat   spec.stops: [{ at: [x, d], act: 'chat', w, face }]: a stop at a set place; meet() builds two of them
   Every water preset floats at the water's level (a per-water level as the compile has it) and keeps half a body length
   off every bank and boat; every ground preset stays on walkable surfaces. Starts and stops ease over preset.easeM metres;
   corners are rounded (no instant turns); out-and-back routes turn round with a pause (no teleport); the walk hook's period
   comes from the stride, and it stops (sceneActorAt's go) while the mover waits.
   ============================================================ */
const sceneBehave = (function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R1 = v => Math.round(v * 10) / 10, R2 = v => Math.round(v * 100) / 100, R3 = v => Math.round(v * 1000) / 1000;
  /* the engine, looked up lazily (classic scripts share one scope; Node's registry bundle puts them on its global) */
  const E = {
    cam: (data) => (typeof sceneCamera === 'function' ? sceneCamera(data) : null),
    proj: (cam, x, d, h) => (typeof sceneProject === 'function' ? sceneProject(cam, x, d, h) : { X: cam.x0 + cam.f / d * x, Y: cam.horizon + cam.f / d * (cam.eye - (h || 0)), k: cam.f / d }),
    gh: (cam, x, d) => (typeof sceneGroundHeight === 'function' ? sceneGroundHeight(cam, x, d) : 0),
    obj: (id) => (typeof sceneObj === 'function' ? sceneObj(id) : null),
    real: (id) => (typeof sceneObjReal === 'function' ? sceneObjReal(id) : { h: 1, l: 1, w: 0.5 }),
    shapes: (id, v) => (typeof sceneObjShapes === 'function' ? sceneObjShapes(id, v || 0, 'summer') : null),
    cls: (id) => (typeof sceneObjClass === 'function' ? sceneObjClass(id) : String(id).split('.')[0]),
    rnd: (seed) => (typeof sceneRnd === 'function' ? sceneRnd(seed) : (() => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); })()),
    hash: (s) => (typeof sceneHash === 'function' ? sceneHash(s) : String(s).split('').reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261)),
    band: (cam, d) => (typeof sceneDepthBand === 'function' ? sceneDepthBand(cam, d) : 0),
  };

  /* ---------- the presets ---------- */
  // speedM: metres a second; stepM: one step (a walk hook cycle is two); deg / bob: the walk hook's swing and bob; easeM: the
  // metres over which a start or a stop eases; corner: the rounding radius in metres; pause: { every: [m, m] metres between
  // stops, wait: [s, s], acts: [...] }; floats: on water; ground: the surfaces it may use ('walk' | 'graze' | 'bank')
  const ACTS = ['look', 'look-back', 'phone', 'sniff', 'chat', 'preen', 'dabble', 'dive', 'graze', 'freeze', 'strike', 'rest'];
  const P = {
    stroll: { cls: 'person', speedM: 1.15, stepM: 0.66, deg: 20, arm: 16, bob: 1.3, easeM: 0.9, corner: 1.2, ground: 'walk', pause: { every: [10, 22], wait: [1.6, 4], acts: ['look', 'look', 'phone', 'rest'] } },
    brisk: { cls: 'person', speedM: 1.6, stepM: 0.8, deg: 25, arm: 22, bob: 1.6, easeM: 0.7, corner: 1.0, ground: 'walk', pause: { every: [30, 60], wait: [0.8, 1.8], acts: ['look', 'phone'] } },
    jogger: { cls: 'person', speedM: 2.9, stepM: 1.1, deg: 28, arm: 0, bob: 2.2, easeM: 1.6, corner: 2.0, ground: 'walk', pause: null },
    child: { cls: 'person', speedM: 1.05, stepM: 0.42, deg: 26, arm: 22, bob: 1.8, easeM: 0.4, corner: 0.6, ground: 'walk', pause: { every: [4, 10], wait: [0.6, 2.2], acts: ['look', 'look-back', 'rest'] } },
    elderly: { cls: 'person', speedM: 0.8, stepM: 0.48, deg: 13, arm: 8, bob: 0.8, easeM: 1.2, corner: 1.5, ground: 'walk', pause: { every: [8, 16], wait: [2.5, 6], acts: ['rest', 'look'] } },
    'dog-walker': { cls: 'person', speedM: 1.05, stepM: 0.62, deg: 20, arm: 0, bob: 1.3, easeM: 0.8, corner: 1.2, ground: 'walk', pause: { every: [6, 14], wait: [2, 5], acts: ['sniff', 'sniff', 'look'] } },
    chat: { cls: 'person', speedM: 1.0, stepM: 0.6, deg: 18, arm: 14, bob: 1.2, easeM: 0.9, corner: 1.2, ground: 'walk', pause: { every: [12, 24], wait: [5, 11], acts: ['chat'] } },
    'dog-trot': { cls: 'animal-dog', speedM: 1.5, stepM: 0.42, deg: 14, bob: 1.2, easeM: 0.5, corner: 0.6, ground: 'walk', pause: { every: [5, 12], wait: [1.2, 3.5], acts: ['sniff', 'look'] } },
    duck: { cls: 'bird-water', floats: true, speedM: 0.32, easeM: 0.8, corner: 1.4, pause: { every: [3, 8], wait: [2, 6], acts: ['look', 'preen', 'dabble', 'look'] } },
    swan: { cls: 'bird-water', floats: true, speedM: 0.26, easeM: 1.6, corner: 3, pause: { every: [6, 14], wait: [3, 8], acts: ['look', 'preen'] } },
    'goose-swim': { cls: 'bird-water', floats: true, speedM: 0.3, easeM: 1.2, corner: 2, pause: { every: [5, 10], wait: [2, 5], acts: ['look'] } },
    coot: { cls: 'bird-water', floats: true, speedM: 0.42, easeM: 0.4, corner: 0.8, pause: { every: [2, 5], wait: [1, 3], acts: ['look', 'dive'] } },
    grebe: { cls: 'bird-water', floats: true, speedM: 0.35, easeM: 0.6, corner: 1.2, pause: { every: [4, 9], wait: [3, 6], acts: ['dive', 'look'] } },
    moorhen: { cls: 'bird-water', floats: true, speedM: 0.36, easeM: 0.3, corner: 0.6, pause: { every: [1.5, 4], wait: [0.8, 2.4], acts: ['look', 'look'] } },
    'goose-graze': { cls: 'bird-ground', speedM: 0.25, stepM: 0.18, easeM: 0.1, corner: 0.4, ground: 'graze', pause: { every: [0.4, 1.2], wait: [2, 5], acts: ['graze', 'graze', 'look'] } },
    'heron-stalk': { cls: 'bird-water', wades: true, speedM: 0.16, stepM: 0.3, easeM: 0.15, corner: 0.5, pause: { every: [0.3, 0.9], wait: [2.5, 8], acts: ['freeze', 'freeze', 'strike'] } },
    'cattle-graze': { cls: 'animal-graze', speedM: 0.3, stepM: 0.55, deg: 6, bob: 0.6, easeM: 0.3, corner: 1, ground: 'graze', pause: { every: [0.6, 2], wait: [6, 16], acts: ['graze', 'graze', 'look'] } },
    'pony-graze': { cls: 'animal-graze', speedM: 0.35, stepM: 0.6, deg: 7, bob: 0.7, easeM: 0.3, corner: 1, ground: 'graze', pause: { every: [0.6, 2.5], wait: [5, 12], acts: ['graze', 'graze', 'look'] } },
    'sheep-graze': { cls: 'animal-graze', speedM: 0.3, stepM: 0.35, deg: 8, bob: 0.6, easeM: 0.2, corner: 0.6, ground: 'graze', pause: { every: [0.4, 1.5], wait: [3, 9], acts: ['graze', 'look'] } },
    deer: { cls: 'animal', speedM: 0.5, stepM: 0.5, deg: 10, bob: 0.8, easeM: 0.3, corner: 0.8, ground: 'graze', pause: { every: [1, 4], wait: [2, 7], acts: ['freeze', 'look', 'graze'] } },
  };
  const ALIAS = { walker: 'stroll', walk: 'stroll', run: 'jogger', runner: 'jogger', kid: 'child', old: 'elderly', dog: 'dog-trot', mallard: 'duck', 'goose-water': 'goose-swim',
    goose: 'goose-graze', heron: 'heron-stalk', cattle: 'cattle-graze', cow: 'cattle-graze', pony: 'pony-graze', sheep: 'sheep-graze' };
  const preset = (name) => P[name] || P[ALIAS[name]] || null;
  /** A sensible preset for an object id (person.jogger -> jogger, bird.swan -> swan ...). */
  function presetFor(obj) {
    const id = String(obj || '');
    const table = [[/jogger|runner/, 'jogger'], [/dog-walker/, 'dog-walker'], [/family|child/, 'child'], [/^person\./, 'stroll'], [/^animal\.dog/, 'dog-trot'],
      [/swan/, 'swan'], [/goose-flight/, null], [/goose/, 'goose-swim'], [/coot/, 'coot'], [/grebe/, 'grebe'], [/moorhen/, 'moorhen'], [/mallard|duck/, 'duck'],
      [/heron/, 'heron-stalk'], [/cattle|longhorn|cow/, 'cattle-graze'], [/pony|donkey|horse/, 'pony-graze'], [/sheep/, 'sheep-graze'], [/deer/, 'deer']];
    for (const [re, p] of table) if (re.test(id)) return p;
    return null;
  }
  /** The walk hook period for a gait at a speed: one cycle is two steps, so the feet keep pace with the ground (no sliding). */
  function stride(gait, speedM) {
    const g = typeof gait === 'string' ? preset(gait) : gait;
    const st = (g && g.stepM) || 0.66, sp = speedM || (g && g.speedM) || 1.2;
    return R2(clamp(2 * st / Math.max(0.05, sp), 0.3, 4));
  }

  /* ---------- object hooks: the idle and gait presets of the object library ---------- */
  // Every hook uses the engine's kinds (SCENE_ANIM_KINDS). A part may be in ONE hook only (the renderers draw a part once per
  // hook), so a preset moves the body with one hook and the head, tail or arm with others. 'turn' with a hold is the cheap
  // one-sided motion (a look, a dip, a hop): still for `hold` of the period, then out and back.
  function hooks(name, o) {
    o = o || {};
    const T = (part, pivot, deg, period, hold) => ({ kind: 'turn', part, pivot, deg, period, hold });
    switch (name) {
      // a walking person: the legs (the flow renderer's walk hook: the FIRST walk hook) and the near arm swinging against the far
      // leg about the shoulder; the arm's hook shares the legs' phase for actors built here (syncSeed)
      case 'person-walk': return [
        { kind: 'walk', parts: ['legB', 'legA'], pivot: o.hip || [0, -31.5], deg: o.deg || 22, period: o.period || 0.9, bob: o.bob == null ? 1.4 : o.bob },
        { kind: 'walk', parts: ['armA'], pivot: o.shoulder || [1, -51], deg: o.arm || 16, period: o.period || 0.9, bob: 0 }];
      // a swimmer: the body rocks gently about the waterline (the wake part stays on the water); the head looks round and dips
      case 'swimmer': return [{ kind: 'paddle', parts: ['body'], dy: o.dy == null ? 0.5 : o.dy, deg: o.rock || 1.2, period: o.period || 2.8 },
        T('head', o.neck || [12, -14], o.look || 16, o.lookPeriod || 7, 0.55)];
      case 'swan': return [{ kind: 'paddle', parts: ['body'], dy: 0.3, deg: 0.6, period: 4.2 }, T('head', o.neck || [22, -14], 9, 11, 0.62)];
      // dabbling (the up-ended duck): the body rocks harder as the feet kick
      case 'dabble': return [{ kind: 'paddle', parts: ['body'], dy: 0.8, deg: 4, period: 1.1 }];
      // a goose on the bank: the head down to crop, up to look (one-sided dips), the body still
      case 'graze-bird': return [T('head', o.neck || [18, -14], o.deg || 24, o.period || 3.2, 0.35)];
      // the heron: still for a long time, then the neck shoots forward and down (the strike) and comes back
      case 'heron': return [T('head', o.neck || [10, -84], o.deg || 30, o.period || 9, 0.9)];
      // the kingfisher: bobs on its perch (body and head together: a one-sided lift about a far pivot, nearly a pure translation)
      case 'kingfisher': return [{ kind: 'turn', parts: ['body', 'head'], pivot: [-120, 0], deg: -1.3, period: 2.6, hold: 0.55 }];
      // a small perched bird: a hop (body and head: a one-sided lift, a tiny turn about a pivot far behind), the tail flicks
      case 'songbird': return [{ kind: 'turn', parts: ['body', 'head'], pivot: [-160, 2], deg: -0.8, period: o.hop || 2.2, hold: 0.72 }, T('tail', o.tail || [-8, -6], 20, 1.3, 0.4)];
      // a pigeon on the ground: the head nods forward with each step
      case 'pigeon': return [T('head', o.neck || [6, -14], 22, 0.9, 0.3)];
      // grazing beasts: the head dips to the grass and comes up (cropping), the tail swishes at flies (one-sided flicks)
      case 'graze': return [T('head', o.neck, o.deg || 12, o.period || 4.5, 0.45)].concat(o.tail ? [T('tail', o.tail, o.swish || 20, o.swishPeriod || 3.6, 0.55)] : []);
      // a dog: the legs trot (the first walk hook), the tail wags, the head dips to sniff
      case 'dog': return [{ kind: 'walk', parts: ['legsNear', 'legsFar'], pivot: o.hip || [0, -16], deg: o.deg || 16, period: o.period || 0.5, bob: o.bob == null ? 1.2 : o.bob },
        T('tail', o.tail || [-18, -22], 22, 0.42, 0.1), T('head', o.neck || [20, -24], 16, 6.5, 0.7)];
      default: return [];
    }
  }

  /* ---------- geometry in ground metres ---------- */
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  function inPoly(p, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / ((b[1] - a[1]) || 1e-9) + a[0]) c = !c;
    }
    return c;
  }
  function nearestOnSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, u = L ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L, 0, 1) : 0;
    return [a[0] + dx * u, a[1] + dy * u];
  }
  function polyEdgeDist(p, poly) {
    let best = Infinity, q = null;
    for (let i = 0; i < poly.length; i++) { const r = nearestOnSeg(p, poly[i], poly[(i + 1) % poly.length]), dd = dist(p, r); if (dd < best) { best = dd; q = r; } }
    return { d: best, q };
  }
  function polyLineDist(p, line) {
    let best = Infinity, q = null;
    for (let i = 1; i < line.length; i++) { const r = nearestOnSeg(p, line[i - 1], line[i]), dd = dist(p, r); if (dd < best) { best = dd; q = r; } }
    return { d: best, q };
  }
  /** A strip (centreline + width) as a polygon. */
  function stripPoly(path, w) {
    const L = [], Rr = [];
    for (let i = 0; i < path.length; i++) {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      L.push([path[i][0] + nx * w / 2, path[i][1] + ny * w / 2]); Rr.push([path[i][0] - nx * w / 2, path[i][1] - ny * w / 2]);
    }
    return L.concat(Rr.reverse());
  }
  /** The water regions of a scene in metres: [{ id, poly, level, dFar }]. */
  function waters(data, cam) {
    const out = [];
    for (const w of data.water || []) {
      const poly = Array.isArray(w.poly) ? w.poly : Array.isArray(w.path) ? stripPoly(w.path, w.width || 8) : null;
      if (!poly || poly.length < 3) continue;
      const dNear = Math.max(0.5, Math.min(...poly.map(p => p[1])));
      out.push({ id: w.id, poly, dFar: Math.max(...poly.map(p => p[1])), level: (cam ? cam.water || 0 : 0) + (cam && cam.relief ? E.gh(cam, 0, dNear) : 0) });
    }
    return out;
  }
  const WALK = new Set(['parking', 'driveway', 'track', 'pavement', 'plaza', 'platform', 'path', 'towpath', 'cycleway', 'steps', 'bridge', 'grass', 'lawn', 'park', 'meadow', 'heath', 'wood', 'garden', 'bank', 'beach', 'sand', 'shingle', 'rock']);
  const GRAZE = new Set(['field', 'meadow', 'heath', 'grass', 'park', 'verge', 'bank', 'lawn']);
  /** The surfaces of a scene in metres, nearest declared last (a later surface wins where they overlap, as in the compile). */
  function surfaces(data) {
    const out = [];
    for (const s of data.surfaces || []) {
      const poly = Array.isArray(s.poly) ? s.poly : Array.isArray(s.path) ? stripPoly(s.path, s.width || 3) : null;
      out.push({ id: s.id, kind: s.kind, poly, rest: !!s.rest || (!poly && !s.band), band: s.band || null });
    }
    return out;
  }
  function surfaceAt(S, p) {
    let hit = null;
    for (const s of S) {
      if (s.poly ? inPoly(p, s.poly) : s.band ? p[1] >= s.band[0] && p[1] <= s.band[1] : false) hit = s;
    }
    return hit || S.find(s => s.rest) || null;
  }
  const FENCE_RE = /fence|wall|gate|hedge|railing|stile|barrier|bollard/;
  /** The obstacles of a scene in metres: boats, structures, buildings and street furniture placed on the ground, plus extra. */
  function obstacles(data, extra) {
    const out = [];
    for (const o of extra || []) out.push(o);
    for (const p of data.place || []) {
      if (!p || !p.obj) continue;
      const cls = E.cls(p.obj);
      if (!['boat', 'structure', 'building', 'street'].includes(cls)) continue;
      const at = Array.isArray(p.at) ? p.at : (Number.isFinite(p.d) && Number.isFinite(p.x) && !p.pin ? [p.x, p.d] : null);
      if (!at && cls === 'boat' && Number.isFinite(p.x) && Number.isFinite(p.y)) {
        // a boat drawn as a pixel placement (a perspective piece): the ground under the lower half of its screen box, at the water
        const cam = E.cam(data), def = E.obj(p.obj), sh = E.shapes(p.obj, p.variant | 0);
        if (!cam || !def || !sh || !Number.isFinite(cam.f)) continue;
        const sc = p.s || 1, b = sh.box, fl = !!p.flip, x0 = fl ? p.x - b[2] * sc : p.x + b[0] * sc, x1 = fl ? p.x - b[0] * sc : p.x + b[2] * sc;
        const yb = p.y + b[3] * sc, yt = p.y + b[1] * sc, ym = yb - 0.45 * (yb - yt), lev = cam.water || 0;
        const gp = (X, Y) => { const d = depthOfY(cam, Y, lev); return [(X - cam.x0) * d / cam.f, d]; };
        if (yb > cam.horizon + 1 && ym > cam.horizon + 1) out.push({ poly: [gp(x0, yb), gp(x1, yb), gp(x1, ym), gp(x0, ym)], obj: p.obj });
        continue;
      }
      if (!at) continue;
      const r = E.real(p.obj), def = E.obj(p.obj), tags = (def && def.tags || []).join(' ') + ' ' + p.obj;
      if (FENCE_RE.test(tags) && r.l > 1.2) {
        const h = Number.isFinite(p.heading) ? p.heading * Math.PI / 180 : 0, c = Math.cos(h), s = Math.sin(h);
        out.push({ line: [[at[0] - c * r.l / 2, at[1] - s * r.l / 2], [at[0] + c * r.l / 2, at[1] + s * r.l / 2]], w: Math.max(0.3, r.w), obj: p.obj, gate: /gate/.test(tags) && !!p.open });
      } else out.push({ at, r: Math.max(0.3, cls === 'boat' ? Math.max(r.l, r.w) / 2 : Math.min(2.5, Math.max(r.l, r.w) / 2)), obj: p.obj });
    }
    return out.filter(o => !o.gate);
  }
  /** How far p is inside an obstacle (> 0: inside or within margin m), and the way out. */
  function obstaclePush(p, o, m) {
    if (o.at) { const dd = dist(p, o.at), need = o.r + m; if (dd >= need) return null; const u = dd > 1e-6 ? [(p[0] - o.at[0]) / dd, (p[1] - o.at[1]) / dd] : [1, 0]; return [o.at[0] + u[0] * need, o.at[1] + u[1] * need]; }
    if (o.poly) {
      const e = polyEdgeDist(p, o.poly), inside = inPoly(p, o.poly);
      if (!inside && e.d >= m) return null;
      const v = [p[0] - e.q[0], p[1] - e.q[1]], l = Math.hypot(v[0], v[1]) || 1, sgn = inside ? -1 : 1;
      return [e.q[0] + sgn * v[0] / l * m, e.q[1] + sgn * v[1] / l * m];
    }
    if (o.line) { const e = polyLineDist(p, o.line), need = (o.w || 0.3) / 2 + m; if (e.d >= need) return null; const v = [p[0] - e.q[0], p[1] - e.q[1]], l = Math.hypot(v[0], v[1]) || 1; return [e.q[0] + v[0] / l * need, e.q[1] + v[1] / l * need]; }
    return null;
  }
  function segHitsLine(a, b, line) {
    const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    for (let i = 1; i < line.length; i++) {
      const c = line[i - 1], d = line[i];
      if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return true;
    }
    return false;
  }
  /** Resample a polyline every `step` metres. */
  function resample(pts, step) {
    const out = [pts[0].slice()];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = dist(a, b), n = Math.max(1, Math.ceil(l / step));
      for (let j = 1; j <= n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    return out;
  }
  /** Keep a point every `step` metres and at every real bend (over 25 degrees): a short timed path. */
  function thin(pts, step) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    let run = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      run += dist(pts[i - 1], pts[i]);
      const a = out[out.length - 1], b = pts[i], c = pts[i + 1], t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      let turn = Math.abs(t2 - t1); if (turn > Math.PI) turn = 2 * Math.PI - turn;
      if (run >= step || turn > 0.44) { out.push(b); run = 0; }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  /** Round the corners (Chaikin, twice): no instant turns. Keeps the end points. */
  function roundCorners(pts, n) {
    let p = pts;
    for (let k = 0; k < (n || 2); k++) {
      if (p.length < 3) return p;
      const o = [p[0]];
      for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; if (i > 0) o.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]); if (i < p.length - 2) o.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); }
      o.push(p[p.length - 1]); p = o;
    }
    return p;
  }
  /**
   * The cleaned route (ground metres): each point kept on its medium (water for floaters, walkable or grazing ground for the rest),
   * pushed out of every obstacle by margin metres, detoured round fences and walls a segment would cross, then rounded.
   * o: { floats, ground: 'walk' | 'graze', margin, avoid, obj }. Returns { pts, problems }.
   */
  function route(data, pts, o) {
    o = o || {};
    const cam = E.cam(data), W = waters(data, cam), S = surfaces(data), OB = obstacles(data, o.avoid), problems = [];
    const r = o.obj ? E.real(o.obj) : { l: 0.5, w: 0.3 }, margin = o.margin != null ? o.margin : (o.floats ? Math.max(0.3, r.l / 2 + 0.2) : Math.max(0.25, r.w / 2 + 0.15));
    let P0 = resample(pts.map(p => [p[0], p[1]]), 0.5);
    const okGround = (p) => {
      if (o.floats) return W.some(w => inPoly(p, w.poly) && polyEdgeDist(p, w.poly).d >= margin);
      if (o.wades) return W.some(w => inPoly(p, w.poly) && polyEdgeDist(p, w.poly).d <= 3) || (!W.some(w => inPoly(p, w.poly)));
      // any declared surface under the point that allows it (a thin verge down a towpath's middle does not stop a walker)
      const OK = o.ground === 'graze' ? GRAZE : WALK, hits = S.filter(q => q.poly && inPoly(p, q.poly));
      if (W.some(w => inPoly(p, w.poly))) return hits.some(q => q.kind === 'bridge');
      if (hits.some(q => OK.has(q.kind))) return true;
      if (hits.length) return false;
      const s = surfaceAt(S, p);
      return !s || OK.has(s.kind);
    };
    const fixMedium = (p) => {
      if (okGround(p)) return p;
      if (o.floats) {
        // into the nearest water, margin metres in from its edge
        let best = null;
        for (const w of W) {
          const e = polyEdgeDist(p, w.poly), inside = inPoly(p, w.poly), c = w.poly.reduce((s, q) => [s[0] + q[0] / w.poly.length, s[1] + q[1] / w.poly.length], [0, 0]);
          for (let k = 1; k <= 24; k++) {
            const u = k / 24, q = inside ? [p[0] + (c[0] - p[0]) * u * 0.6, p[1] + (c[1] - p[1]) * u * 0.6] : [e.q[0] + (c[0] - e.q[0]) * u * 0.6, e.q[1] + (c[1] - e.q[1]) * u * 0.6];
            if (inPoly(q, w.poly) && polyEdgeDist(q, w.poly).d >= margin) { const dd = dist(p, q); if (!best || dd < best.d) best = { q, d: dd }; break; }
          }
        }
        return best ? best.q : p;
      }
      // the nearest acceptable point on a small spiral (ground movers)
      for (let rad = 0.5; rad <= 12; rad += 0.5) for (let a = 0; a < 16; a++) { const q = [p[0] + Math.cos(a * Math.PI / 8) * rad, p[1] + Math.sin(a * Math.PI / 8) * rad]; if (q[1] > 0.5 && okGround(q)) return q; }
      return p;
    };
    let moved = 0;
    P0 = P0.map(p => { let q = fixMedium(p); for (const ob of OB) { const z = obstaclePush(q, ob, o.floats ? margin : 0.2); if (z) q = fixMedium(z); } if (dist(p, q) > 0.05) moved++; return q; });
    if (moved) problems.push({ rule: 'route', sev: 'info', msg: `${moved} route point(s) moved onto ${o.floats ? 'open water' : 'walkable ground'} or round an obstacle` });
    // detour round lines (fences, walls) the route still crosses: go round the nearer end
    for (const ob of OB) if (ob.line) {
      for (let i = 1; i < P0.length; i++) if (segHitsLine(P0[i - 1], P0[i], ob.line)) {
        const ends = [ob.line[0], ob.line[ob.line.length - 1]], e = ends.reduce((b, q) => (dist(P0[i], q) + dist(P0[i - 1], q) < dist(P0[i], b) + dist(P0[i - 1], b) ? q : b));
        const c = ob.line.reduce((s, q) => [s[0] + q[0] / ob.line.length, s[1] + q[1] / ob.line.length], [0, 0]), v = [e[0] - c[0], e[1] - c[1]], l = Math.hypot(v[0], v[1]) || 1;
        const round = [e[0] + v[0] / l * 0.8, e[1] + v[1] / l * 0.8];
        P0.splice(i, 0, round); i++;
        problems.push({ rule: 'route', sev: 'info', msg: `detoured round ${ob.obj || 'a barrier'}` });
      }
    }
    // a segment that still leaves the water (a peninsula between two water points): bend it through its midpoint
    if (o.floats) for (let i = 1; i < P0.length; i++) { const m = [(P0[i - 1][0] + P0[i][0]) / 2, (P0[i - 1][1] + P0[i][1]) / 2]; if (!okGround(m)) { const q = fixMedium(m); if (dist(q, m) > 0.05) { P0.splice(i, 0, q); i++; } } }
    // rounding cuts corners: push the rounded points out of the obstacles again (twice: neighbours can push back)
    let out = roundCorners(thin(P0.filter((p, i) => !i || dist(p, P0[i - 1]) > 0.05), o.step || 1.4), 2);
    // short chords (resampled each round: a push spreads neighbours along the arc), so none cuts through a boat
    for (let k = 0; k < (OB.length ? 4 : 0); k++) out = resample(out, 0.9).map(p => { let q = p; for (const ob of OB) { const z = obstaclePush(q, ob, o.floats ? margin : 0.2); if (z) q = z; } return q; });
    const bad = out.filter(p => !okGround(p)).length;
    if (bad) problems.push({ rule: o.floats ? 'offWater' : 'offGround', sev: 'warn', msg: `${bad} of ${out.length} route points are still off ${o.floats ? 'the water' : 'walkable ground'}`, fix: 'move the route' });
    return { pts: out, problems, margin };
  }

  /* ---------- layers ---------- */
  const bandIds = (cam) => (cam && cam.bands ? cam.bands.map(b => b.id) : ['horizon', 'far', 'mid', 'near', 'fore', 'front']);
  const depthOfY = (cam, Y, h) => cam.f * (cam.eye - (h || 0)) / Math.max(0.5, Y - cam.horizon);
  /** The screen boxes [x0, y0, x1, y1, d, layerIndex] of the static placements of a scene (pinned and ground ones). */
  function staticBoxes(data, cam) {
    const ids = bandIds(cam), out = [];
    for (const p of data.place || []) {
      if (!p || !p.obj) continue;
      const def = E.obj(p.obj); if (!def) continue;
      const sh = E.shapes(p.obj, p.variant | 0), box = (sh && sh.box) || [-(def.size[0] / 2), -def.size[1], def.size[0] / 2, 0];
      let X, Y, s, d;
      if (Array.isArray(p.at) || (Number.isFinite(p.d) && Number.isFinite(p.x) && !p.pin && !Number.isFinite(p.y))) {
        const at = Array.isArray(p.at) ? p.at : [p.x, p.d], pr = E.proj(cam, at[0], at[1], null), r = E.real(p.obj);
        X = pr.X; Y = pr.Y; d = at[1]; s = (p.k || 1) * pr.k * r.h / Math.max(1, def.size[1]);
      } else if (Number.isFinite(p.x) && Number.isFinite(p.y)) { X = p.x; Y = p.y; s = p.s || 1; d = depthOfY(cam, Y, p.reflect ? cam.water : 0); }
      else continue;
      const li = p.layer ? ids.indexOf(p.layer) : E.band(cam, d);
      const fl = !!p.flip, x0 = fl ? X - box[2] * s : X + box[0] * s, x1 = fl ? X - box[0] * s : X + box[2] * s;
      out.push([x0, Y + box[1] * s, x1, Y + box[3] * s, d, li < 0 ? E.band(cam, d) : li, p.obj]);
    }
    return out;
  }
  /**
   * The layer that draws a mover on a route right: the movers of a layer draw over ALL of that layer's still objects, under
   * every nearer layer. So the best layer has every overlapping still object that is NEARER than the mover in a LATER layer and
   * every farther one in this or an earlier layer; floaters never go under their water's own layer (it would paint over them).
   * pts: ground metres; o: { obj, variant, k, h, floats, level }. Returns { layer, conflicts, scores }.
   */
  function layerFor(data, pts, o) {
    o = o || {};
    const cam = E.cam(data), ids = bandIds(cam), def = E.obj(o.obj), sh = def ? E.shapes(o.obj, o.variant | 0) : null;
    const box = (sh && sh.box) || [-20, -40, 20, 0], r = o.obj ? E.real(o.obj) : { h: 1 };
    const stat = staticBoxes(data, cam);
    const samples = pts.filter((p, i) => i % Math.max(1, Math.floor(pts.length / 24)) === 0);
    let minL = 0;
    if (o.floats) { const W = waters(data, cam); for (const w of W) if (samples.some(p => inPoly(p, w.poly))) minL = Math.max(minL, E.band(cam, Math.max(w.dNear || 0, w.dFar * 0.999))); }
    else {
      // the ground under its feet is painted in the layer of its own depth band: a mover in an earlier layer is painted over
      for (const p of samples) { const pr = E.proj(cam, p[0], p[1], null); if (pr.Y < 900 + 40 && pr.X > -200 && pr.X < 1800) minL = Math.max(minL, E.band(cam, p[1])); }
    }
    const scores = ids.map(() => 0);
    for (const p of samples) {
      const pr = E.proj(cam, p[0], p[1], o.floats ? (o.level || cam.water || 0) : null), s = (o.k || 1) * pr.k * r.h / Math.max(1, def ? def.size[1] : 64);
      const mb = [pr.X + box[0] * s, pr.Y + box[1] * s, pr.X + box[2] * s, pr.Y + box[3] * s];
      for (const b of stat) {
        // a real overlap only: over a third of the mover's own box (a big still box's empty corner beside it does not count)
        const ox = Math.min(b[2], mb[2]) - Math.max(b[0], mb[0]), oy = Math.min(b[3], mb[3]) - Math.max(b[1], mb[1]);
        if (ox <= 0 || oy <= 0 || ox * oy < 0.33 * (mb[2] - mb[0]) * (mb[3] - mb[1])) continue;
        const tol = Math.max(0.3, 0.18 * p[1]), nearer = b[4] < p[1] - tol, farther = b[4] > p[1] + tol;   // side by side (a moored boat beside the towpath) is neither
        for (let L = 0; L < ids.length; L++) if ((nearer && b[5] <= L) || (farther && b[5] > L)) scores[L]++;
      }
    }
    for (let L = 0; L < minL; L++) scores[L] += 1e6;
    // only the bands the route spans (one either side): a walker 20 m away never goes to the far layer
    const ds = pts.map(p => p[1]), lo = E.band(cam, Math.max(...ds)) - 1, hi = E.band(cam, Math.min(...ds)) + 1;
    for (let L = 0; L < ids.length; L++) if (L < lo || L > hi) scores[L] += 1e5;
    const dMed = pts.map(p => p[1]).sort((a, b) => a - b)[Math.floor(pts.length / 2)] || 10;
    const home = clamp(E.band(cam, dMed), minL, ids.length - 1);
    let best = home;
    for (let L = 0; L < ids.length; L++) if (scores[L] < scores[best] || (scores[L] === scores[best] && Math.abs(L - home) < Math.abs(best - home))) best = L;
    return { layer: ids[best], conflicts: scores[best], scores };
  }

  /* ---------- the phase-locked seed ---------- */
  /**
   * The engine gives each hook of an actor its own phase (sceneRnd(seed * 7 + 3), one draw per hook). A walker's arm hook must
   * share the legs' phase, so this finds the nearest seed (from `seed` up) whose walk hooks draw phases within 0.012 of each
   * other. Objects with one walk hook return the seed unchanged.
   */
  function syncSeed(obj, v, seed) {
    const sh = E.shapes(obj, v | 0), hs = sh ? sh.anim : [];
    const walks = hs.map((h, i) => (h.kind === 'walk' ? i : -1)).filter(i => i >= 0);
    if (walks.length < 2) return seed >>> 0;
    const s0 = (seed >>> 0) || 1;
    for (let s = s0; s < s0 + 20000; s++) {
      const r = E.rnd(s * 7 + 3), ph = hs.map(h => { if (Array.isArray(h.k)) r(); return r(); });
      const p0 = ph[walks[0]];
      if (walks.every(i => { const d = Math.abs(ph[i] - p0); return Math.min(d, 1 - d) < 0.012; })) return s;
    }
    return s0;
  }

  /* ---------- the timeline ---------- */
  const between = (rnd, ab) => ab[0] + rnd() * (ab[1] - ab[0]);
  function cumulative(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + dist(pts[i - 1], pts[i])); return c; }
  /**
   * The actor(s) of a behaviour. See the file header for spec. Returns [main, ...companions] in the v1 actor form: a timed pixel
   * path [X, Y, wait, face, dur] (every leg timed in seconds from metres, so the speed is right at every depth), sByY from the
   * object's real height at each point's depth, its layer, a phase-locked seed and the walk hook's stride period.
   */
  function actors(data, spec) {
    spec = spec || {};
    const name = spec.preset || presetFor(spec.obj) || 'stroll', G = Object.assign({}, preset(name) || P.stroll);
    if (spec.speedM) G.speedM = spec.speedM;
    const cam = E.cam(data);
    if (!cam) throw new Error('sceneBehave.actor: the scene needs a v2 camera (camera.eye / fov / horizon)');
    const def = E.obj(spec.obj);
    if (!def) throw new Error('sceneBehave.actor: unknown object ' + spec.obj);
    const seed0 = spec.seed != null ? spec.seed >>> 0 : E.hash((data.id || 'scene') + '|' + spec.obj + '|' + JSON.stringify(spec.route));
    const rnd = E.rnd(seed0 * 31 + 7), floats = !!G.floats, real = E.real(spec.obj), v = spec.variant | 0;
    const k = (spec.k || 1) * (spec.k ? 1 : 0.96 + 0.08 * rnd());
    const rt = route(data, spec.route || [[-2, 10], [2, 10]], { floats, wades: G.wades, ground: G.ground, avoid: spec.avoid, obj: spec.obj });
    let pts = rt.pts;
    const loop = spec.loop || 'out-back';
    // the stops: every `every` metres a pause with an act (a look round, a phone check, a sniff, a dabble ...)
    const acts = spec.acts === false || !G.pause ? null : (Array.isArray(spec.acts) ? spec.acts : G.pause.acts);
    const W0 = waters(data, cam);
    const levelAt = (p) => { if (!floats) return E.gh(cam, p[0], p[1]) + (spec.h || 0); const w = W0.find(q => inPoly(p, q.poly)); return (w ? w.level : cam.water || 0) + ((def.float && Number.isFinite(def.float.level)) ? def.float.level : 0); };
    const scaleAt = (p) => { const pr = E.proj(cam, p[0], p[1], levelAt(p)); return { X: pr.X, Y: pr.Y, s: k * pr.k * real.h / Math.max(1, def.size[1]) }; };
    // there and back (no teleport): the route, a turn-round pause, the route reversed
    let legsM = pts;
    if (loop === 'out-back') legsM = pts.concat(pts.slice(0, -1).reverse());
    else if (loop === 'loop' && dist(pts[0], pts[pts.length - 1]) > 0.3) legsM = pts.concat([pts[0]]);
    const C = cumulative(legsM), total = C[C.length - 1];
    const stops = [];
    if (acts && acts.length && total > 0.5) {
      let s = between(rnd, G.pause.every) * (0.4 + 0.6 * rnd());
      while (s < total - 0.3) { stops.push({ s, act: acts[Math.floor(rnd() * acts.length)], w: between(rnd, G.pause.wait) }); s += between(rnd, G.pause.every); }
    }
    if (loop === 'out-back') { const half = C[pts.length - 1]; if (!stops.some(q => Math.abs(q.s - half) < 0.6)) stops.push({ s: half, act: 'turn', w: 0.6 + rnd() * (floats ? 2.5 : 1.2) }); stops.sort((a, b) => a.s - b.s); }
    // the states (merge package "crowd"): set stops (meet), a seat (sit) and views of the water; none draws from rnd, so a route
    // without them keeps every stop and every second it had
    const nearestS = (p) => { let best = 0, bd = Infinity; for (let i = 0; i < pts.length; i++) { const dd = dist(pts[i], p); if (dd < bd) { bd = dd; best = i; } } return { s: C[best], d: bd, i: best }; };
    for (const st of Array.isArray(spec.stops) ? spec.stops : []) {
      if (!st || !Array.isArray(st.at)) continue;
      const n = nearestS(st.at);
      if (n.d > 3) continue;
      for (let k = stops.length - 1; k >= 0; k--) if (Math.abs(stops[k].s - n.s) < 1.5 && stops[k].act !== 'turn') stops.splice(k, 1);
      stops.push({ s: n.s, act: st.act || 'chat', w: st.w != null ? +st.w : 8, face: st.face, set: true });
    }
    const seat = G.cls === 'person' ? seatFor(data, spec, pts) : null;
    if (seat) {
      const n = nearestS(seat.at);
      for (let k = stops.length - 1; k >= 0; k--) if (Math.abs(stops[k].s - n.s) < 2 && stops[k].act !== 'turn') stops.splice(k, 1);
      stops.push({ s: n.s, act: 'sit', w: seat.w, seat });
    }
    stops.sort((a, b) => a.s - b.s);
    // the timed path: metres -> screen points, each leg with its seconds (eased near the stops)
    const easeM = G.easeM || 0.5, path = [], tab = [];
    const atS = (s) => { let i = 1; while (i < C.length - 1 && C[i] < s) i++; const u = (s - C[i - 1]) / ((C[i] - C[i - 1]) || 1); return [legsM[i - 1][0] + (legsM[i][0] - legsM[i - 1][0]) * u, legsM[i - 1][1] + (legsM[i][1] - legsM[i - 1][1]) * u]; };
    const speedAt = (s) => {
      let f = 1;
      for (const q of stops) f = Math.min(f, clamp(Math.abs(s - q.s) / easeM, 0, 1));
      if (loop === 'out-back' || loop === 'loop') { f = Math.min(f, 1); } else f = Math.min(f, clamp(s / easeM, 0, 1), clamp((total - s) / easeM, 0, 1));
      return G.speedM * (0.28 + 0.72 * f * f * (3 - 2 * f));
    };
    const marks = [];
    for (let i = 0; i < C.length; i++) marks.push({ s: C[i] });
    for (const q of stops) marks.push({ s: q.s, stop: q });
    marks.sort((a, b) => a.s - b.s || (a.stop ? 1 : -1));
    const hidden = [];   // [t0, t1, point] spans when this mover is out of sight (a dive, a dabble shown by a companion)
    let T = 0, prev = null, dirNow = 1, views = 0, sits = 0;
    const setT = [];   // when each set stop (meet) begins, seconds into the cycle
    const HIDE_Y = 2400;
    const push = (p, wait, face, dur) => { const q = scaleAt(p); path.push([R1(q.X), R1(q.Y), R2(wait || 0), face || 0, dur == null ? null : R3(dur)]); tab.push([R1(q.Y), R3(q.s)]); return q; };
    for (const m of marks) {
      const p = atS(m.s);
      if (!prev) { push(p, 0, 0, null); prev = { s: m.s, p }; continue; }
      const ds = m.s - prev.s;
      if (ds > 0.01) {
        const dur = ds / Math.max(0.03, speedAt((m.s + prev.s) / 2));
        const q0 = scaleAt(prev.p), q1 = scaleAt(p);
        if (Math.abs(q1.X - q0.X) > 0.05) dirNow = q1.X < q0.X ? -1 : 1;
        push(p, 0, 0, dur); T += dur; prev = { s: m.s, p };
      }
      if (m.stop) {
        const q = m.stop, last = path[path.length - 1];
        const fwd = dirNow;
        switch (q.act) {
          case 'look': case 'look-back': case 'chat': case 'freeze': {
            // face round (the facing turns through side-on: sceneActorFacing), hold, face back
            const w1 = q.w * (q.act === 'look-back' ? 0.55 : 0.4), w2 = q.w - w1;
            last[2] = R2(0.3 + q.w * 0.1); T += last[2];
            // view (a v3 brain state): a person's look within 6 m of water faces the water the whole stop (same place, same seconds)
            const vf = (q.act === 'look' || q.act === 'look-back') && G.cls === 'person' && spec.states !== false ? viewFace(cam, W0, atS(m.s), last[0]) : 0;
            if (vf) { path.push([last[0], last[1], R2(q.w), vf, 0]); tab.push([last[1], tab[tab.length - 1][1]]); T += q.w; views++; }
            else if (q.act !== 'freeze' && q.act !== 'chat') { path.push([last[0], last[1], R2(w1), -fwd, 0]); tab.push([last[1], tab[tab.length - 1][1]]); path.push([last[0], last[1], R2(w2), fwd, 0]); tab.push([last[1], tab[tab.length - 1][1]]); T += w1 + w2; }
            else { path.push([last[0], last[1], R2(q.w), q.act === 'chat' ? (q.face || spec.chatFace || fwd) : fwd, 0]); tab.push([last[1], tab[tab.length - 1][1]]); if (q.set) setT.push(R2(T)); T += q.w; }
            break;
          }
          case 'sit': {
            // step to the seat (easy, 0.9 m/s), hidden while the seated figure (a companion, same clock) shows, step back
            const st = q.seat, sp = scaleAt(st.at), back = [last[0], last[1]], dOut = Math.max(0.3, dist(atS(m.s), st.at)), legT = R3(dOut / 0.9);
            path.push([R1(sp.X), R1(sp.Y), 0.3, 0, legT]); tab.push([R1(sp.Y), R3(sp.s)]); T += legT + 0.3;
            const t0 = T;
            path.push([R1(sp.X), HIDE_Y, R2(q.w), fwd, 0]); tab.push([HIDE_Y, 0]);
            path.push([R1(sp.X), R1(sp.Y), 0.3, fwd, 0]); tab.push([R1(sp.Y), R3(sp.s)]);
            hidden.push({ t0, t1: t0 + q.w, X: R1(sp.X), Y: R1(sp.Y), act: 'sit', face: st.face || fwd, s: R3(sp.s), seat: st });
            T += q.w + 0.3;
            path.push([back[0], back[1], 0, fwd, legT]); tab.push([back[1], tab[tab.length - 1][1]]); T += legT;
            sits++;
            break;
          }
          case 'dive': case 'dabble': {
            // out of sight (under the water, or shown by the up-ended companion) for the wait, then back up on the same spot
            last[2] = R2(0.4); T += 0.4;
            const t0 = T, X = last[0], Y = last[1];
            path.push([X, HIDE_Y, R2(q.w), fwd, 0]); tab.push([HIDE_Y, 0]);
            path.push([X, Y, R2(0.6), fwd, 0]); tab.push([Y, tab[tab.length - 3][1]]);
            hidden.push({ t0, t1: t0 + q.w, X, Y, act: q.act, face: fwd, s: tab[tab.length - 1][1] });
            T += q.w + 0.6;
            break;
          }
          default: { last[2] = R2(q.w); last[3] = fwd; T += q.w; }
        }
      }
    }
    // 'through': both ends off-screen: an unseen jump back to the start (a leg of no time)
    if (loop === 'through') { const a = path[0], b = path[path.length - 1], off = (q) => q[0] < -80 || q[0] > 1680; if (off(a) && off(b)) { path.push([a[0], a[1], 0, 0, 0]); tab.push([a[1], tab[0][1]]); } }
    const sTab = [...tab].sort((a, b) => a[0] - b[0]).filter((t, j, arr) => !j || t[0] - arr[j - 1][0] > 0.4);
    if (hidden.length && !sTab.some(t => t[0] === HIDE_Y)) sTab.push([HIDE_Y, 0]);
    // the hidden row must read 0 and the row just under the lowest visible point must still read full size
    if (hidden.length) { const vis = sTab.filter(t => t[0] < HIDE_Y); const lo = vis[vis.length - 1]; sTab.splice(sTab.indexOf(lo) + 1, 0, [R1(lo[0] + 0.5), lo[1]], [HIDE_Y - 1, 0]); }
    const sByY = sTab.length >= 2 ? sTab : [[sTab[0][0], sTab[0][1]], [sTab[0][0] + 1, sTab[0][1]]];
    const layer = spec.layer || layerFor(data, pts, { obj: spec.obj, variant: v, k, floats, level: floats ? levelAt(pts[0]) : 0 }).layer;
    const anim = Object.assign({}, spec.anim || {});
    const hasWalk = (E.shapes(spec.obj, v) || { anim: [] }).anim.some(h => h.kind === 'walk');
    if (hasWalk && G.stepM && !(anim.walk === false)) anim.walk = Object.assign({ period: stride(G, G.speedM) }, G.deg ? { deg: G.deg } : {}, typeof anim.walk === 'object' ? anim.walk : {});
    const seed = syncSeed(spec.obj, v, seed0);
    const pxLen = path.reduce((s, p, i) => s + (i ? Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0), 0);
    const main = { obj: spec.obj, variant: v, path, sByY, speed: R2(Math.max(1, pxLen / Math.max(1, T))), loop: 'loop', offset: spec.offset != null ? spec.offset : R3(rnd()), seed, layer,
      anim: Object.keys(anim).length ? anim : undefined, $behave: Object.assign({ preset: name, cycle: R2(T), problems: rt.problems }, views ? { views } : {}, sits ? { sits } : {}, setT.length ? { setT } : {}) };
    if (!main.anim) delete main.anim;
    const out = [main];
    // companions: the up-ended duck shown while the swimmer is hidden (same cycle, same offset: they stay in step)
    // the seated figure of a sit stop: shown only while the walker is hidden (same cycle, same offset)
    for (const h of hidden) if (h.act === 'sit') {
      const so = h.seat.obj || 'person.bench-sitter', sd = E.obj(so), sr = E.real(so);
      if (!sd) continue;
      const pr = E.proj(cam, h.seat.at[0], h.seat.at[1], E.gh(cam, h.seat.at[0], h.seat.at[1])), ss = R3((spec.k || 1) * pr.k * (sr.h || 1.3) / Math.max(1, sd.size[1]));
      out.push({ obj: so, variant: h.seat.variant != null ? h.seat.variant : v % Math.max(1, sd.variants || 1), path: [[R1(pr.X), HIDE_Y, R2(h.t0), h.face, null], [R1(pr.X), R1(pr.Y), R2(h.t1 - h.t0), h.face, 0], [R1(pr.X), HIDE_Y, R2(Math.max(0.01, T - h.t1)), h.face, 0]],
        sByY: [[R1(pr.Y - 0.5), ss], [R1(pr.Y + 0.5), ss], [HIDE_Y - 1, 0], [HIDE_Y, 0]], speed: 1, loop: 'loop', offset: main.offset, seed: seed + 2, layer, $behave: { preset: name, companion: 'sit' } });
    }
    for (const h of hidden) if (h.act === 'dabble' && def.variants >= 4) {
      const cv = v % 2 + 2;
      out.push({ obj: spec.obj, variant: cv, path: [[h.X, HIDE_Y, R2(h.t0), h.face, null], [h.X, h.Y, R2(h.t1 - h.t0), h.face, 0], [h.X, HIDE_Y, R2(Math.max(0.01, T - h.t1)), h.face, 0]],
        sByY: [[R1(h.Y - 0.5), h.s], [R1(h.Y + 0.5), h.s], [HIDE_Y - 1, 0], [HIDE_Y, 0]], speed: 1, loop: 'loop', offset: main.offset, seed: seed + 1, layer, $behave: { preset: name, companion: 'dabble' } });
    }
    return out;
  }
  const actor = (data, spec) => actors(data, spec)[0];

  /* ---------- states (merge package "crowd", 15 Oct; from the v3 brains, 79-world-2brains.js: view, sit, chat) ---------- */
  /** view: a stop within 6 m of water (not in it) faces the water: -1 | 1 (the screen side of the nearest water), else 0. */
  function viewFace(cam, W0, p, X) {
    if (!cam || !W0 || !W0.length || !p) return 0;
    let best = null;
    for (const w of W0) { if (inPoly(p, w.poly)) return 0; const e = polyEdgeDist(p, w.poly); if (!best || e.d < best.d) best = e; }
    if (!best || best.d > 6) return 0;
    const q = E.proj(cam, best.q[0], best.q[1], null).X;
    return Math.abs(q - X) < 0.5 ? 0 : q < X ? -1 : 1;
  }
  /** sit: the seat a route stops at: spec.sit { at, obj, variant, w } within 3 m of the route (w: seconds, seeded 14-30). */
  function seatFor(data, spec, pts) {
    const st = spec && spec.sit;
    if (!st || !Array.isArray(st.at) || spec.states === false) return null;
    let dmin = Infinity;
    for (const p of pts) dmin = Math.min(dmin, dist(p, st.at));
    if (dmin > 3) return null;
    const u = (E.hash((data.id || 'scene') + '|sit|' + st.at.join(',')) % 1000) / 1000;
    return { at: st.at.slice(0, 2), obj: st.obj || 'person.bench-sitter', variant: st.variant, w: st.w != null ? +st.w : R2(14 + 16 * u), face: st.face };
  }
  /** The states a route gets (tools and tests): [{ s (metres along), state: 'view' | 'sit' | 'chat', at, face }]. */
  function states(data, spec) {
    const a = actor(data, spec), cam = E.cam(data), out = [];
    if (!a || !cam) return out;
    for (let i = 1; i < a.path.length; i++) {
      const p = a.path[i], q = a.path[i - 1];
      if (p[1] >= 2000 && q[1] < 2000) out.push({ i, state: 'sit', at: [q[0], q[1]] });
      else if (p[0] === q[0] && p[1] === q[1] && p[2] > 1 && (p[3] === 1 || p[3] === -1)) out.push({ i, state: 'stop', at: [p[0], p[1]], face: p[3], w: p[2] });
    }
    return out;
  }
  /**
   * meet: two walkers on routes that cross (or pass within 3 m) arrive at the crossing together, stop 0.7 m apart facing each other
   * and chat (seeded 6-12 s; o.wait), then go on. One clock: B's speed is scaled so its cycle matches A's, the shorter cycle is
   * padded with a wait at its end, and B's offset is set so both reach the meeting at the same moment. Without a meeting place
   * (routes more than 3 m apart): two plain actors. -> [a, b]
   */
  function meet(data, a, b, o) {
    o = o || {};
    const cam = E.cam(data);
    const ra = route(data, a.route, { ground: 'walk', obj: a.obj }).pts, rb = route(data, b.route, { ground: 'walk', obj: b.obj }).pts;
    let best = null;
    for (const p of resample(ra, 0.5)) for (const q of resample(rb, 0.5)) { const dd = dist(p, q); if (!best || dd < best.d) best = { p, q, d: dd }; }
    if (!cam || !best || best.d > 3) return [actor(data, a), actor(data, b)];
    // 0.7 m apart (a chatting pair's gap, as pair()), on the line between the two routes (across them where they cross)
    let ux = best.q[0] - best.p[0], ud = best.q[1] - best.p[1], ul = Math.hypot(ux, ud);
    if (ul < 0.05) { const i = Math.max(1, ra.findIndex(p => dist(p, best.p) < 0.6)), t = [ra[i][0] - ra[i - 1][0], ra[i][1] - ra[i - 1][1]], tl = Math.hypot(t[0], t[1]) || 1; ux = -t[1] / tl; ud = t[0] / tl; ul = 1; }
    else { ux /= ul; ud /= ul; }
    const mid = [(best.p[0] + best.q[0]) / 2, (best.p[1] + best.q[1]) / 2], pA = [mid[0] - ux * 0.35, mid[1] - ud * 0.35], pB = [mid[0] + ux * 0.35, mid[1] + ud * 0.35];
    const XA = E.proj(cam, pA[0], pA[1], null).X, XB = E.proj(cam, pB[0], pB[1], null).X, faceA = XB < XA ? -1 : 1, faceB = -faceA;
    const w = o.wait != null ? +o.wait : R2(6 + 6 * ((E.hash((data.id || 'scene') + '|meet|' + mid.map(v => R1(v)).join(',')) % 1000) / 1000));
    const mk = (s, at, face, extra) => actors(data, Object.assign({}, s, { preset: s.preset || 'stroll', acts: s.acts != null ? s.acts : false, stops: [{ at, act: 'chat', w, face }], offset: s.offset != null ? s.offset : 0 }, extra))[0];
    const A = mk(a, [ra.reduce((u, p) => (dist(p, pA) < dist(u, pA) ? p : u))[0], ra.reduce((u, p) => (dist(p, pA) < dist(u, pA) ? p : u))[1]], faceA);
    let spB = b.speedM || (preset(b.preset || 'stroll') || P.stroll).speedM, B = mk(b, rb.reduce((u, p) => (dist(p, pB) < dist(u, pB) ? p : u)), faceB, { speedM: spB });
    for (let k = 0; k < 4 && Math.abs(B.$behave.cycle - A.$behave.cycle) > 0.3; k++) { spB = clamp(spB * B.$behave.cycle / A.$behave.cycle, 0.5, 2.5); B = mk(b, rb.reduce((u, p) => (dist(p, pB) < dist(u, pB) ? p : u)), faceB, { speedM: spB }); }
    // one cycle: pad the shorter with a wait at its last point
    const pad = (M, dt) => { if (dt > 0.005) { const l = M.path[M.path.length - 1]; l[2] = R2((l[2] || 0) + dt); M.$behave.cycle = R2(M.$behave.cycle + dt); } };
    const dT = A.$behave.cycle - B.$behave.cycle;
    pad(B, dT); pad(A, -dT);
    const T = Math.max(A.$behave.cycle, B.$behave.cycle), tA = (A.$behave.setT || [0])[0], tB = (B.$behave.setT || [0])[0];
    A.offset = a.offset != null ? a.offset : R3(((E.hash((data.id || 'scene') + '|meetoff|' + mid.join(',')) % 1000) / 1000));
    B.offset = R3((((A.offset * T + tB - tA) / T) % 1 + 1) % 1);
    A.$behave.meet = { at: pA, with: 1, w }; B.$behave.meet = { at: pB, with: 0, w };
    return [A, B];
  }

  /** Two people side by side (0.7 m apart) on one route: the same stops, where they turn to each other and talk. */
  function pair(data, spec) {
    spec = spec || {};
    const objs = spec.objs || [spec.obj || 'person.walker', spec.obj2 || spec.obj || 'person.walker'], gap = spec.gap || 0.7;
    const base = route(data, spec.route, { ground: 'walk', obj: objs[0], avoid: spec.avoid }).pts;
    const off = (sgn) => base.map((p, i) => { const a = base[Math.max(0, i - 1)], b = base[Math.min(base.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * gap / 2 * sgn, p[1] + dx / l * gap / 2 * sgn]; });
    const seed = spec.seed != null ? spec.seed : E.hash((data.id || 'scene') + '|pair|' + JSON.stringify(spec.route));
    const mk = (o, pts, sgn) => {
      // the same seed for the stops (the timeline), so both stop together; each faces the other while they chat
      const a = actors(data, Object.assign({}, spec, { obj: o, route: pts, preset: spec.preset || 'chat', seed, chatFace: sgn, variant: sgn > 0 ? spec.variant | 0 : (spec.variant2 != null ? spec.variant2 : (spec.variant | 0) + 1), avoid: [] }))[0];
      return a;
    };
    const A = mk(objs[0], off(1), 1), B = mk(objs[1], off(-1), -1);
    // the nearer one faces back toward the farther (on screen: the left one faces right)
    const ax = A.path[0][0], bx = B.path[0][0];
    for (const [M, s] of [[A, ax <= bx ? 1 : -1], [B, ax <= bx ? -1 : 1]]) for (const p of M.path) if (p[2] > 4) p[3] = s;
    B.offset = A.offset;
    return [A, B];
  }

  /**
   * A walker and an off-lead dog: the dog trots ahead by 2 to 6 metres, stops to sniff while the walker passes, then runs to catch
   * up and get ahead again. Both are built on one clock (one cycle, one offset). spec: { walker, dog, route, variant, dogVariant }.
   */
  function walkWithDog(data, spec) {
    spec = spec || {};
    const W = actors(data, Object.assign({}, spec, { obj: spec.walker || 'person.walker', preset: spec.preset || 'stroll' }))[0];
    const cam = E.cam(data), dogObj = spec.dog || 'animal.dog', ddef = E.obj(dogObj), dreal = E.real(dogObj);
    // the walker's position in metres over one cycle, sampled from its route (re-derived: the dog runs on the same cleaned route)
    const rt = route(data, spec.route, { ground: 'walk', obj: dogObj, avoid: spec.avoid }).pts, C = cumulative(rt), L = C[C.length - 1];
    const T = W.$behave.cycle, rnd = E.rnd((W.seed * 13 + 5) >>> 0), dt = 0.25, path = [], tab = [];
    // the walker's distance along at time t: from its timed path's screen X (monotonic along the route outward, then back)
    const wl = []; let acc = 0;
    for (let i = 0; i < W.path.length; i++) { const p = W.path[i]; if (i) acc += (p[4] != null ? p[4] : 0); wl.push([acc, p]); acc += p[2] || 0; wl.push([acc, p]); }
    const half = L, posM = (u) => { const s = u <= half ? u : 2 * half - u; let i = 1; while (i < C.length - 1 && C[i] < s) i++; const f = (s - C[i - 1]) / ((C[i] - C[i - 1]) || 1); return [rt[i - 1][0] + (rt[i][0] - rt[i - 1][0]) * f, rt[i - 1][1] + (rt[i][1] - rt[i - 1][1]) * f]; };
    // the walker's along-distance at t: invert by sampling its timed path (screen X along the route is monotonic out, then back)
    const wAt = (t) => { let k = 0; while (k < wl.length - 1 && wl[k + 1][0] <= t) k++; const a = wl[k], b = wl[Math.min(wl.length - 1, k + 1)], f = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0; return [a[1][0] + (b[1][0] - a[1][0]) * f, a[1][1] + (b[1][1] - a[1][1]) * f]; };
    // screen point -> along metres on the outward route (nearest sample), with the direction (outward first half of the cycle)
    const proj = rt.map(p => { const pr = E.proj(cam, p[0], p[1], null); return [pr.X, pr.Y]; });
    const alongOf = (X, Y) => { let b = 0, bd = Infinity; for (let i = 0; i < proj.length; i++) { const dd = Math.hypot(proj[i][0] - X, proj[i][1] - Y); if (dd < bd) { bd = dd; b = i; } } return C[b]; };
    let u = 0, mode = 'ahead', gapWant = 3 + rnd() * 3, sniffLeft = 0, prevU = null, outward = true;
    const wantSpeed = { ahead: 1.9, sniff: 0, catch: 3.2 };
    for (let t = 0; t <= T + 1e-6; t += dt) {
      const wp = wAt(t), wa = alongOf(wp[0], wp[1]);
      outward = t < T / 2;
      const ahead = outward ? wa + gapWant : wa - gapWant;
      if (mode === 'sniff') { sniffLeft -= dt; if (sniffLeft <= 0) mode = 'catch'; }
      else if (mode === 'ahead' && rnd() < dt / 7 && Math.abs(u - wa) > 1) { mode = 'sniff'; sniffLeft = 1.5 + rnd() * 2.5; }
      else if (mode === 'catch' && Math.abs(u - ahead) < 0.4) { mode = 'ahead'; gapWant = 2 + rnd() * 4; }
      const target = mode === 'sniff' ? u : clamp(ahead, 0, L), sp = mode === 'sniff' ? 0 : wantSpeed[mode];
      const du = clamp(target - u, -sp * dt, sp * dt);
      u = prevU == null ? clamp(ahead, 0, L) : u + du;
      const s = outward ? u : 2 * L - u, p = posM(clamp(s, 0, 2 * L)), pr = E.proj(cam, p[0], p[1], null), sc = (spec.dogK || 1) * pr.k * dreal.h / Math.max(1, ddef.size[1]);
      path.push([R1(pr.X), R1(pr.Y), 0, 0, prevU == null ? null : dt]); tab.push([R1(pr.Y), R3(sc)]);
      prevU = u;
    }
    // drop the duplicate points (a dog standing still: one leg with its seconds) so the path stays short
    const slim = [path[0]];
    for (let i = 1; i < path.length; i++) { const a = slim[slim.length - 1], b = path[i]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) a[2] = R2((a[2] || 0) + (b[4] || 0)); else slim.push(b); }
    const sTab = tab.sort((a, b) => a[0] - b[0]).filter((t, j, arr) => !j || t[0] - arr[j - 1][0] > 0.4);
    const D = { obj: dogObj, variant: spec.dogVariant | 0, path: slim, sByY: sTab.length >= 2 ? sTab : [[sTab[0][0], sTab[0][1]], [sTab[0][0] + 1, sTab[0][1]]], speed: 20, loop: 'loop', offset: W.offset,
      seed: (W.seed + 3) >>> 0, layer: W.layer, anim: { walk: { period: stride(P['dog-trot'], 1.6) } }, $behave: { preset: 'dog-trot', cycle: R2(T) } };
    return [W, D];
  }

  /* ---------- the lint ---------- */
  /** The motion problems of a scene (data, before compile): each actor and each placement of a mover. */
  function lint(data) {
    const out = [], cam = E.cam(data);
    if (!cam || !Number.isFinite(cam.f)) return out;
    const W = waters(data, cam), OB = obstacles(data), ids = bandIds(cam);
    (data.actors || []).forEach((a, i) => {
      if (!a || !a.obj) return;
      const def = E.obj(a.obj); if (!def) return;
      const cls = E.cls(a.obj), floats = cls === 'bird-water' || cls === 'boat', real = E.real(a.obj);
      // ground metres of the route (v2 ground actors) or recovered from the pixel path (v1 form: only where it is drawn, s > 0)
      const sAt = (y) => { const tab = a.sByY; if (!tab || !tab.length) return a.s || 1; if (y <= tab[0][0]) return tab[0][1] * (a.s || 1); for (let j = 1; j < tab.length; j++) if (y <= tab[j][0]) { const [y0, s0] = tab[j - 1], [y1, s1] = tab[j]; return (s0 + (s1 - s0) * (y - y0) / ((y1 - y0) || 1)) * (a.s || 1); } return tab[tab.length - 1][1] * (a.s || 1); };
      let pts = null;
      if (Array.isArray(a.ground)) pts = a.ground.map(p => [p[0], p[1]]);
      else if (Array.isArray(a.path)) {
        const lev = floats ? cam.water || 0 : 0, vis = a.path.filter(p => p[1] > cam.horizon + 1 && sAt(p[1]) > 0.001);
        pts = vis.map(p => { const d = depthOfY(cam, p[1], lev); return [(p[0] - cam.x0) * d / cam.f, d]; });
        // the size check (people, animals, birds): the drawn scale against the real size at that depth, the median along the way
        if (vis.length && /^(person|cyclist|animal|animal-dog|animal-graze|bird-water|bird-ground)$/.test(cls)) {
          const ratios = vis.map(p => sAt(p[1]) / (cam.f / depthOfY(cam, p[1], lev) * real.h / Math.max(1, def.size[1]))).sort((x, y) => x - y), ratio = ratios[Math.floor(ratios.length / 2)];
          if (ratio < 0.8 || ratio > 1.25) out.push({ rule: 'size', sev: 'warn', i, obj: a.obj, msg: `actors[${i}] ${a.obj} is drawn at ${Math.round(ratio * 100)} % of its real size for its depth`, fix: 'build it with sceneBehave.actor (sByY from the real size), or fix sByY' });
        }
      }
      if (!pts || pts.length < 2) return;
      const wader = /heron|egret|wader|stork/.test(a.obj + ' ' + (def.tags || []).join(' '));
      if (floats && !wader) {
        const off = pts.filter(p => !W.some(w => inPoly(p, w.poly)));
        if (off.length) out.push({ rule: 'offWater', sev: 'error', i, obj: a.obj, msg: `actors[${i}] ${a.obj}: ${off.length} of ${pts.length} route points are not on the water (on a bank, in the reeds or under a boardwalk)`, fix: 'route it with sceneBehave.actor (kept half a body length inside the water)' });
      }
      const m = floats ? real.w / 2 : 0.15;   // the body itself inside the obstacle (a near pass is fine)
      const hit = OB.find(o => pts.some(p => obstaclePush(p, o, m)) || (o.line && pts.some((p, j) => j && segHitsLine(pts[j - 1], p, o.line))));
      if (hit) out.push({ rule: 'blocked', sev: 'error', i, obj: a.obj, msg: `actors[${i}] ${a.obj} passes through ${hit.obj || 'an obstacle'}`, fix: 'route it with sceneBehave.actor (round obstacles), or move it' });
      if (a.loop === 'loop' && Array.isArray(a.path) && a.path.length > 1) {
        const p0 = a.path[0], p1 = a.path[a.path.length - 1], on = (q) => q[0] > -40 && q[0] < 1640 && q[1] < 900;
        if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 30 && on(p0) && on(p1) && !(p1[4] === 0)) out.push({ rule: 'teleport', sev: 'warn', i, obj: a.obj, msg: `actors[${i}] ${a.obj} loops from its last point back to its first in view (a jump of ${Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]))} px)`, fix: "loop: 'pingpong', close the route, or take both ends off-screen" });
      }
      const L = layerFor(data, pts, { obj: a.obj, variant: a.variant, floats, level: cam.water || 0 });
      const have = a.layer || ids[E.band(cam, Math.min(...pts.map(p => p[1])))];
      const hi = ids.indexOf(have);
      if (hi >= 0 && L.scores[hi] >= 2 && L.scores[hi] - L.conflicts >= 2) out.push({ rule: 'layer', sev: 'warn', i, obj: a.obj, msg: `actors[${i}] ${a.obj} in layer '${have}' is drawn over nearer things or under farther ones (${L.scores[hi]} overlaps; '${L.layer}' has ${L.conflicts})`, fix: `layer: '${L.layer}'` });
    });
    (data.place || []).forEach((p, i) => {
      if (!p || !p.obj || p.anim === false || (p.anim && p.anim.walk === false)) return;
      const sh = E.shapes(p.obj, p.variant | 0);
      if (sh && sh.anim.some(h => h.kind === 'walk')) out.push({ rule: 'walkOnSpot', sev: 'warn', i, obj: p.obj, msg: `place[${i}] ${p.obj} is a still placement of a walking object: its legs swing on the spot`, fix: 'anim: { walk: false } (standing), or make it an actor (sceneBehave.actor)' });
    });
    return out;
  }

  const names = () => Object.keys(P);
  return Object.freeze({ PRESETS: P, ACTS, preset, presetFor, names, stride, hooks, syncSeed, route, layerFor, actor, actors, pair, walkWithDog, meet, states, lint,
    _geo: { staticBoxes, inPoly, polyEdgeDist, stripPoly, waters, surfaces, obstacles, resample, roundCorners } });
})();

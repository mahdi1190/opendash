/* ============================================================
   SCENE ENGINE v2: THE SCENE EDITOR (docs/dev/SCENE_ENGINE_V2.md 23; builder H). A DEVELOPER tool.
   Settings > Animations > Animation gallery shows "Edit scene" on composed items only when the dev route
   (server/routes/scene-editor.mjs) answers GET /api/scene-editor/status with 200: the server was started with
   OPENDASH_SCENE_EDITOR=1 in a developer checkout. Otherwise nothing here runs and the gallery is unchanged.

   The editor opens over the gallery: the scene plays through the normal host (78-scene-host.js) on a 16:9 stage,
   with an overlay canvas (the ground grid, the surfaces, the water, the flows' lanes, one handle per placement) and
   side panels (placement, add, placements, camera, environment, problems). It edits the RECIPE (V2 16.1) read from
   GET /api/scene-editor/recipe and saves it back with POST (the server validates, refuses stale versions with 409
   and writes atomically). Nothing is saved until Save is pressed.

   Pure helpers (no DOM; tests/scene-editor.test.mjs runs them in a VM):
     sceneEditorCamera(scene)                       -> cam { eye, fov, horizon, heading, x0, f, t, dMin, dMax, water }   (A's sceneCamera when loaded)
     sceneEditorProject(cam, x, d, h)               -> { X, Y, k }       (A's sceneProject when the camera came from A)
     sceneEditorUnproject(cam, X, Y)                -> { x, d } | null   (null above the horizon)
     sceneEditorGrid(cam)                           -> [[X0, Y0, X1, Y1, w]]   ground lines every 5 m near (to 50 m), 25 m far (to 400 m)
     sceneEditorSurfaces(scene, cam)                -> the stand-in surface geometry in ground metres (rest, band, poly, path strips, beside, water)
     sceneEditorSurfaceAt(scene, cam, x, d)         -> { id, kind, water } | null   (the LAST surface that holds the point; water first)
     sceneEditorClass(id)                           -> the placement class (A's sceneObjClass when loaded; V2 4.3)
     sceneEditorValidAt(scene, cam, id, x, d, { C }) -> { ok, cls, kinds, at, snap: { x, d, m } | null, exempt }   the class rule (V2 4.4, 4.5)
     sceneEditorPlaceGround(scene, cam, p)          -> { x, d } | null   the ground point of a placement (at; on + d + u; on + along; a pixel one inferred)
     sceneEditorApply(rec, op)                      -> a NEW recipe (never mutates): move, nudge, add, delete, swap, set, camera, env
     sceneEditorHistory(max = 100)                  -> { push, undo, redo, canUndo, canRedo, clear }   snapshots of the recipe
     sceneEditorDiff(a, b)                          -> { moved, added, removed, changed, camera, env }   the save summary
     sceneEditorPreviewData(scene, { season })      -> the scene data the stage plays: the recipe's own data when the v2 compile (A)
                                                       is loaded; until then a v1 stand-in (surfaces and water as projected fills,
                                                       ground placements as pixel ones at their projected scale), so the editor
                                                       works before A lands and the drawing matches the handles.
   Page:
     sceneEditorAvailable()                         -> Promise<boolean>  (the status route answered 200; asked once per page)
     sceneEditorOpen(ref, { label, returnFocus })   -> opens the editor for a recipe ref ('<pack>/<id>')
     sceneEditorClose()

   Callees (V2 26.10), each behind a typeof guard: A sceneCamera, sceneProject, sceneUnproject, sceneObjClass, sceneObjReal,
   sceneSurfaceAt, sceneSurfaceNearest, SCENE_PLACE_RULES, sceneFromRecipe; G SCENE_CAMERA_PRESETS / sceneCompositionSetups,
   sceneCompositionOf; C sceneHostSet; E sceneCredits. Without them the editor degrades (stand-ins, or the panel says so).
   Every text from a recipe, an object id or a server message is escaped (esc) before innerHTML. Private names: _sced.
   ============================================================ */
const _sced = (function () {
  const W = 1600, H = 900;
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const clone = o => JSON.parse(JSON.stringify(o));
  const escHtml = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const BIG = 6000;

  /* ---------- the class rules (V2 4.4, 4.5): stand-ins for A's tables ---------- */
  const WALK = ['pavement', 'plaza', 'platform', 'path', 'towpath', 'cycleway', 'steps', 'bridge', 'grass', 'lawn', 'park', 'garden', 'heath', 'meadow', 'wood', 'bank', 'beach', 'sand', 'shingle', 'rock', 'parking', 'driveway', 'track'];
  const PLANT = ['grass', 'lawn', 'park', 'verge', 'field', 'meadow', 'heath', 'wood', 'garden', 'bank'];
  const BUILD = ['plot', 'grass', 'lawn', 'park', 'field', 'garden', 'verge', 'meadow', 'heath'];
  const LAND = ['road', 'parking', 'driveway', 'track', 'pavement', 'plaza', 'platform', 'path', 'towpath', 'cycleway', 'steps', 'bridge', 'rail', 'tramway', 'grass', 'lawn', 'park', 'verge', 'field', 'meadow', 'heath', 'wood', 'garden', 'bank', 'reedbed', 'beach', 'sand', 'shingle', 'rock', 'mud', 'edge', 'rooftop', 'plot'];
  const RULES = {
    car: ['road', 'parking', 'driveway', 'tramway', 'track'], bus: ['road', 'tramway'], tram: ['tramway', 'rail'], train: ['rail'],
    bike: ['road', 'cycleway', 'path', 'towpath', 'park'], cyclist: ['road', 'cycleway', 'path', 'towpath', 'park'], tractor: ['field', 'track', 'road'],
    boat: ['water'], person: WALK, 'animal-graze': ['field', 'meadow', 'heath', 'grass', 'park', 'lawn', 'verge'], 'animal-dog': WALK, animal: WALK.concat(['field', 'verge', 'reedbed']),
    'bird-water': ['water', 'bank', 'reedbed', 'mud', 'beach', 'grass', 'sand', 'shingle'], 'bird-ground': WALK.concat(['rooftop', 'edge', 'field', 'verge', 'mud', 'road']),
    tree: PLANT, shrub: PLANT.concat(['reedbed']), cover: LAND, street: ['pavement', 'plaza', 'platform', 'path', 'towpath', 'park'], rail: ['rail', 'platform'],
    building: BUILD, structure: BUILD.concat(['plaza', 'bank', 'pavement', 'platform']), landmark: BUILD.concat(['plaza', 'bank', 'pavement', 'platform']),
    rock: ['grass', 'lawn', 'park', 'verge', 'field', 'meadow', 'heath', 'wood', 'garden', 'bank', 'reedbed', 'beach', 'sand', 'shingle', 'mud', 'rock', 'path', 'track'],
  };
  const SNAP = { person: 2, cyclist: 2, bike: 2, car: 3, bus: 3, tram: 3, train: 3, tractor: 3, boat: 3, 'animal-graze': 3, 'animal-dog': 3, animal: 3, 'bird-water': 3, 'bird-ground': 3, shrub: 3, cover: 3, rock: 3, tree: 4, street: 1.5, rail: 1.5, building: 6, structure: 6, landmark: 0 };
  // footprint (length x width, metres) of the handle ellipse, and the stand-in real heights (A's sceneObjReal wins)
  const FOOT = { car: [4.4, 1.8], bus: [11, 2.5], tram: [30, 2.6], train: [40, 2.8], tractor: [4, 2.2], boat: [18, 2.1], bike: [1.8, 0.6], cyclist: [1.8, 0.6], person: [0.6, 0.5], tree: [5, 5], shrub: [1.5, 1.5], building: [10, 8], structure: [6, 4], landmark: [20, 15], street: [1.2, 0.6], 'animal-graze': [2, 0.8] };
  const REAL_BY_CAT = { person: 1.72, vehicle: 1.5, boat: 1.9, tree: 15, plant: 0.6, ground: 0.25, rock: 1, water: 0.4, bird: 0.4, animal: 1.1, building: 9, street: 1.1, rail: 3.8, structure: 6, prop: 1, landmark: 30 };
  const REAL_BY_ID = { 'vehicle.bus-double-decker': 4.4, 'vehicle.tractor': 2.8, 'vehicle.taxi-black': 1.55, 'street.lamp': 5.5, 'street.lamppost': 5.5, 'street.bench': 0.85, 'street.bollard': 1, 'bird.swan': 0.8, 'bird.mallard': 0.35, 'tree.oak': 18, 'tree.birch': 15, 'tree.pine': 20, 'tree.plane-avenue': 24, 'plant.grass': 0.35, 'plant.gorse': 1.4, 'plant.reed': 1.8, 'building.terrace': 9 };
  const SURF_COL = {
    road: '#5c5f63', parking: '#63666a', driveway: '#8a7f72', track: '#8b7a5a', pavement: '#a9a69e', plaza: '#b3aa9a', platform: '#a8a49a', path: '#b8a582', towpath: '#a89a78',
    cycleway: '#8a4a40', steps: '#a5a198', bridge: '#8c8478', rail: '#6f655a', tramway: '#5f6266', grass: '#6f8f45', lawn: '#74964a', park: '#6f8f45', verge: '#728a48',
    field: '#9a9a52', meadow: '#7f9a4c', heath: '#7d6a4a', wood: '#4f5f34', garden: '#6c8c44', bank: '#6c7a44', reedbed: '#8a8a50', beach: '#d8c89a', sand: '#d8c89a',
    shingle: '#a8a090', rock: '#8a8580', mud: '#6a5a44', edge: '#9a958c', rooftop: '#7a7470', plot: '#8a8070', water: '#4f86a0',
  };
  const SEASON_SHIFT = { autumn: ['#a08a40', 0.28], winter: ['#c8ccd0', 0.32], spring: ['#8fbf50', 0.12], summer: null };
  const OVERLAY_COL = { hard: '#ffd166', soft: '#7bd389', water: '#5cc8ff', rail: '#c39bff', other: '#e0e0e0' };
  const HARD = new Set(['road', 'parking', 'driveway', 'pavement', 'plaza', 'platform', 'cycleway', 'steps', 'bridge', 'tramway', 'edge', 'rooftop']);

  /* ---------- the camera and the projection (V2 2.1, 2.2) ---------- */
  function camera(scene) {
    const c = (scene && scene.camera) || {};
    if (typeof sceneCamera === 'function' && scene && scene.camera) {
      try { const a = sceneCamera(scene); if (a && isFinite(a.f)) return Object.assign({}, a, { t: Math.tan((a.fov || 66) * Math.PI / 360), _a: true }); } catch (e) { /* the stand-in below */ }
    }
    const eye = num(c.eye, 1.65), fov = Math.max(10, Math.min(150, num(c.fov, 66))), horizon = num(c.horizon, 470), t = Math.tan(fov * Math.PI / 360), f = 800 / t;
    return { eye, fov, horizon, heading: num(c.heading, 180), x0: num(c.x0, 800), f, t, dMin: f * eye / Math.max(1, H - horizon), dMax: 20000, water: num(c.water, -0.4), lat: c.lat, lon: c.lon };
  }
  function project(cam, x, d, h) {
    if (cam._a && typeof sceneProject === 'function') { try { const p = sceneProject(cam, x, d, h == null ? null : h); if (p && isFinite(p.X)) return p; } catch (e) { /* the flat projection */ } }
    const dd = Math.max(0.05, d);
    return { X: cam.x0 + cam.f * x / dd, Y: cam.horizon + cam.f * (cam.eye - (h || 0)) / dd, k: cam.f / dd };
  }
  function unproject(cam, X, Y) {
    if (cam._a && typeof sceneUnproject === 'function') { try { return sceneUnproject(cam, X, Y); } catch (e) { /* the flat one */ } }
    if (!(Y > cam.horizon + 0.5)) return null;
    const d = cam.f * cam.eye / (Y - cam.horizon);
    return { x: (X - cam.x0) * d / cam.f, d };
  }
  function grid(cam) {
    const out = [], t = cam.t * 1.25, d0 = Math.max(0.5, cam.dMin * 0.95);
    const ds = [];
    for (let d = 5; d <= 50; d += 5) ds.push(d);
    for (let d = 75; d <= 400; d += 25) ds.push(d);
    for (const d of ds) {
      if (d < d0) continue;
      const a = project(cam, -d * t, d), b = project(cam, d * t, d);
      out.push([a.X, a.Y, b.X, b.Y, d <= 50 ? 1 : 2]);
    }
    const along = (x, from, to, w) => {
      const a0 = Math.max(from, d0, Math.abs(x) / t);
      if (a0 >= to) return;
      const a = project(cam, x, a0), b = project(cam, x, to);
      out.push([a.X, a.Y, b.X, b.Y, w]);
    };
    for (let x = -50; x <= 50; x += 5) along(x, 0, 50, 1);
    for (let x = -200; x <= 200; x += 25) along(x, 50, 400, 2);
    return out;
  }

  /* ---------- the surfaces in ground metres (a stand-in for A's compile; V2 3.2, 5.1) ---------- */
  function normal(p, q) { const dx = q[0] - p[0], dd = q[1] - p[1], l = Math.hypot(dx, dd) || 1; return [-dd / l, dx / l]; }   // the LEFT normal facing along p -> q
  function offsetLine(path, o) {
    const n = path.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = i > 0 ? normal(path[i - 1], path[i]) : null, b = i < n - 1 ? normal(path[i], path[i + 1]) : null;
      let m = a && b ? [a[0] + b[0], a[1] + b[1]] : (a || b);
      const l = Math.hypot(m[0], m[1]) || 1; m = [m[0] / l, m[1] / l];
      const cos = a && b ? Math.max(0.35, m[0] * a[0] + m[1] * a[1]) : 1;
      out.push([path[i][0] + m[0] * o / cos, path[i][1] + m[1] * o / cos]);
    }
    return out;
  }
  const okPath = p => Array.isArray(p) && p.length >= 2 && p.every(q => Array.isArray(q) && isFinite(q[0]) && isFinite(q[1]));
  const okPoly = p => Array.isArray(p) && p.length >= 3 && p.every(q => Array.isArray(q) && isFinite(q[0]) && isFinite(q[1]));
  function strip(path, oL, oR) { const L = offsetLine(path, oL), R = offsetLine(path, oR); return L.concat(R.reverse()); }
  const _geoMemo = typeof WeakMap === 'function' ? new WeakMap() : null;
  function surfaces(scene) {
    if (_geoMemo && scene && typeof scene === 'object' && _geoMemo.has(scene)) return _geoMemo.get(scene);
    const out = { list: [], water: [], byId: {} };
    const add = (e, s, isWater) => {
      if (!e || typeof e.id !== 'string') return;
      const g = { id: e.id, kind: isWater ? 'water' : String(e.kind || 'grass'), wkind: isWater ? String(e.kind || 'lake') : null, water: !!isWater, poly: null, rest: false, band: null, centre: null, width: 0, src: e };
      if (!isWater && e.rest) { g.rest = true; g.poly = [[-BIG, 0.05], [BIG, 0.05], [BIG, BIG], [-BIG, BIG]]; }
      else if (Array.isArray(e.band) && e.band.length === 2) { g.band = [num(e.band[0], 0), num(e.band[1], BIG)]; g.poly = [[-BIG, g.band[0]], [BIG, g.band[0]], [BIG, g.band[1]], [-BIG, g.band[1]]]; }
      else if (okPoly(e.poly)) g.poly = e.poly.map(q => [+q[0], +q[1]]);
      else if (okPath(e.path) && num(e.width, 0) > 0) { g.centre = e.path.map(q => [+q[0], +q[1]]); g.width = +e.width; g.poly = strip(g.centre, g.width / 2, -g.width / 2); }
      else if (!isWater && e.beside && out.byId[e.beside] && out.byId[e.beside].centre && num(e.width, 0) > 0) {
        const par = out.byId[e.beside], gap = Math.max(0, num(e.gap, 0)), a = par.width / 2 + gap, b = a + +e.width, sgn = e.side === 'right' ? -1 : 1;
        g.centre = offsetLine(par.centre, sgn * (a + b) / 2); g.width = +e.width;
        g.poly = strip(par.centre, sgn * (sgn > 0 ? b : a), sgn * (sgn > 0 ? a : b));
      }
      if (!g.poly) return;
      (isWater ? out.water : out.list).push(g);
      out.byId[g.id] = g;
    };
    for (const e of Array.isArray(scene && scene.surfaces) ? scene.surfaces : []) add(e, scene, false);
    if (!out.list.some(g => g.rest)) out.list.unshift({ id: '(rest)', kind: 'grass', water: false, rest: true, poly: [[-BIG, 0.05], [BIG, 0.05], [BIG, BIG], [-BIG, BIG]], centre: null, width: 0, src: null, implied: true });
    for (const e of Array.isArray(scene && scene.water) ? scene.water : []) add(e, scene, true);
    if (_geoMemo && scene && typeof scene === 'object') _geoMemo.set(scene, out);
    return out;
  }
  function inPoly(poly, x, d) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], di = poly[i][1], xj = poly[j][0], dj = poly[j][1];
      if ((di > d) !== (dj > d) && x < (xj - xi) * (d - di) / (dj - di) + xi) inside = !inside;
    }
    return inside;
  }
  function surfaceAt(scene, x, d) {
    const G = surfaces(scene);
    for (let i = G.water.length - 1; i >= 0; i--) if (inPoly(G.water[i].poly, x, d)) return { id: G.water[i].id, kind: 'water', water: true, g: G.water[i] };
    for (let i = G.list.length - 1; i >= 0; i--) if (inPoly(G.list[i].poly, x, d)) return { id: G.list[i].id, kind: G.list[i].kind, water: false, g: G.list[i] };
    return null;
  }
  /** The span [x0, x1] of a surface at depth d (its horizontal slice), clamped to the view. */
  function spanAt(g, cam, d) {
    const lim = d * cam.t * 1.2;
    if (g.rest || g.band) return [-lim, lim];
    const xs = [], p = g.poly;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[j], b = p[i];
      if ((a[1] > d) !== (b[1] > d)) xs.push(a[0] + (b[0] - a[0]) * (d - a[1]) / (b[1] - a[1]));
    }
    if (!xs.length) return null;
    return [Math.max(-lim * 4, Math.min(...xs)), Math.min(lim * 4, Math.max(...xs))];
  }
  /** A point at a fraction of a centreline's length: { x, d, n (left normal) }. */
  function alongPath(path, frac, metres) {
    const segs = [];
    let len = 0;
    for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segs.push(l); len += l; }
    let want = metres != null ? Math.max(0, Math.min(len, metres)) : Math.max(0, Math.min(1, frac)) * len;
    for (let i = 1; i < path.length; i++) {
      const l = segs[i - 1];
      if (want <= l || i === path.length - 1) {
        const k = l ? Math.min(1, want / l) : 0;
        return { x: path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k, d: path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k, n: normal(path[i - 1], path[i]) };
      }
      want -= l;
    }
    return null;
  }

  /* ---------- objects: class, real height, scale ---------- */
  function objDef(id) { return typeof sceneObj === 'function' ? sceneObj(id) : null; }
  function objClass(id) {
    if (typeof sceneObjClass === 'function') { try { const c = sceneObjClass(id); if (c) return c; } catch (e) { /* the stand-in */ } }
    const def = objDef(id), tags = (def && def.tags) || [], cat = (def && def.category) || String(id || '').split('.')[0], name = String(id || '').split('.')[1] || '';
    const has = (...t) => t.some(x => tags.includes(x) || name.includes(x));
    const own = tags.find(x => /^class:/.test(x));
    if (own) return own.slice(6);
    if (cat === 'vehicle') { if (has('tram', 'supertram', 'metrolink')) return 'tram'; if (has('bus')) return 'bus'; if (has('tractor')) return 'tractor'; if (has('jet', 'airliner', 'aircraft', 'paraglider', 'glider', 'balloon')) return 'air'; if (has('bike', 'bicycle')) return 'bike'; return 'car'; }
    if (cat === 'rail') return has('train', 'loco', 'coach', 'tube') ? 'train' : 'rail';
    if (cat === 'boat') return 'boat';
    if (cat === 'person') return has('cyclist') ? 'cyclist' : 'person';
    if (cat === 'animal') { if (has('dog')) return 'animal-dog'; if (has('sheep', 'cattle', 'cow', 'pony', 'horse', 'deer', 'donkey', 'goat')) return 'animal-graze'; if (has('butterfly', 'dragonfly', 'bee')) return 'air'; return 'animal'; }
    if (cat === 'bird') { if (has('flight', 'flying', 'kite', 'air')) return 'bird-air'; if (has('water', 'pond', 'canal', 'lake', 'swan', 'duck', 'mallard', 'coot', 'moorhen', 'goose', 'heron', 'grebe')) return 'bird-water'; return 'bird-ground'; }
    if (cat === 'tree') return 'tree';
    if (cat === 'plant') return tags.includes('role:ground') ? 'cover' : 'shrub';
    if (cat === 'ground' || cat === 'water') return 'cover';
    if (cat === 'rock') return 'rock';
    if (cat === 'building') return 'building';
    if (cat === 'street' || cat === 'prop') return 'street';
    if (cat === 'structure') return 'structure';
    if (cat === 'landmark') return 'landmark';
    if (cat === 'sky') return 'air';
    return 'street';
  }
  function kindsFor(cls) {
    if (typeof SCENE_PLACE_RULES !== 'undefined' && SCENE_PLACE_RULES && SCENE_PLACE_RULES[cls]) {
      const r = SCENE_PLACE_RULES[cls], k = Array.isArray(r) ? r : (r.on || r.kinds || r.allow);
      if (r && r.exempt) return null;
      if (Array.isArray(k)) return k;
    }
    return RULES[cls] || null;
  }
  function realH(id) {
    if (typeof sceneObjReal === 'function') { try { const r = sceneObjReal(id); if (r && r.h > 0) return r.h; } catch (e) { /* the stand-in */ } }
    const def = objDef(id);
    if (def && def.real && def.real.h > 0) return def.real.h;
    if (REAL_BY_ID[id]) return REAL_BY_ID[id];
    const cat = (def && def.category) || String(id).split('.')[0];
    return REAL_BY_CAT[cat] || 1.5;
  }
  /** The sprite scale of an object standing at depth d (V2 4.2: s = k * (f / d) * (real.h / size[1])). */
  function scaleFor(id, d, cam, k) {
    const def = objDef(id), hU = def && Array.isArray(def.size) ? def.size[1] : 100;
    return num(k, 1) * (cam.f / Math.max(0.5, d)) * realH(id) / Math.max(4, hU);
  }
  const floats = cls => cls === 'boat' || cls === 'bird-water';

  /* ---------- placements ---------- */
  function placeGround(scene, cam, p) {
    if (!p || typeof p !== 'object') return null;
    if (Array.isArray(p.at) && isFinite(p.at[0]) && isFinite(p.at[1])) return { x: +p.at[0], d: +p.at[1], form: 'at' };
    if (typeof p.on === 'string') {
      const g = surfaces(scene).byId[p.on];
      if (!g) return null;
      if ((p.along != null || p.alongM != null) && g.centre) {
        const a = alongPath(g.centre, num(p.along, 0), p.alongM != null ? +p.alongM : null);
        if (!a) return null;
        const u = num(p.u, 0.5), o = g.width / 2 - u * g.width;
        return { x: a.x + a.n[0] * o, d: a.d + a.n[1] * o, form: 'along', surf: g.id };
      }
      if (isFinite(p.d)) {
        const sp = spanAt(g, cam, +p.d);
        if (!sp) return null;
        return { x: sp[0] + num(p.u, 0.5) * (sp[1] - sp[0]), d: +p.d, form: 'on', surf: g.id };
      }
      return null;
    }
    if (isFinite(p.x) && isFinite(p.y) && !p.pin) {
      const g = unproject(cam, +p.x, +p.y);
      return g ? { x: g.x, d: g.d, form: 'pixel' } : null;
    }
    return null;
  }
  /** Is (x, d) a valid stand for this object? The nearest valid point within the class's snap radius otherwise. */
  function validAt(scene, cam, id, x, d, o) {
    o = o || {};
    const cls = objClass(id), kinds = kindsFor(cls);
    if (!kinds) return { ok: true, cls, kinds: null, at: null, snap: null, exempt: true };
    const C = o.C && o.C.v === 2 ? o.C : null;
    const at = C && typeof sceneSurfaceAt === 'function' ? sceneSurfaceAt(C, x, d) : surfaceAt(scene, x, d);
    const def = objDef(id), beam = def && def.float && def.float.beam ? def.float.beam : (cls === 'boat' ? 2.4 : 0.6);
    const okHere = (px, pd) => {
      if (!(pd > 0.3)) return false;
      const s = C && typeof sceneSurfaceAt === 'function' ? sceneSurfaceAt(C, px, pd) : surfaceAt(scene, px, pd);
      if (!s || !kinds.includes(s.kind)) return false;
      if (cls === 'boat' && s.kind === 'water') {   // inset by half the beam + 0.3 m from every bank (4.4)
        const m = beam / 2 + 0.3;
        for (const [ax, ad] of [[m, 0], [-m, 0], [0, m], [0, -m]]) { const q = surfaceAt(scene, px + ax, pd + ad); if (!q || q.kind !== 'water') return false; }
      }
      return true;
    };
    const ok = okHere(x, d);
    let snap = null;
    const AR = typeof SCENE_PLACE_RULES !== 'undefined' && SCENE_PLACE_RULES ? SCENE_PLACE_RULES[cls] : null;
    const R = o.fix || (AR && AR.fix) ? 0 : AR && isFinite(AR.snap) ? AR.snap : (SNAP[cls] != null ? SNAP[cls] : 3);
    if (!ok && R > 0) {
      if (C && typeof sceneSurfaceNearest === 'function') {
        try { const n = sceneSurfaceNearest(C, x, d, kinds, R); if (n && isFinite(n.x)) snap = { x: n.x, d: n.d, m: n.m != null ? n.m : Math.hypot(n.x - x, n.d - d) }; } catch (e) { /* the search below */ }
      }
      if (!snap) {
        const steps = Math.max(4, Math.round(R / 0.25));
        search: for (let s = 1; s <= steps; s++) {
          const r = R * s / steps, n = 12 + s * 2;
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2, px = x + Math.cos(a) * r, pd = d + Math.sin(a) * r;
            if (okHere(px, pd)) { snap = { x: px, d: pd, m: r }; break search; }
          }
        }
      }
    }
    return { ok, cls, kinds, at: at ? { id: at.id, kind: at.kind } : null, snap, exempt: false, R };
  }

  /* ---------- recipe edits (pure; each returns a NEW recipe) ---------- */
  const GROUND_KEYS = ['on', 'u', 'd', 'along', 'alongM', 'x', 'y', 's'];
  function apply(rec, op) {
    const out = clone(rec), s = out.scene = out.scene || {};
    if (!Array.isArray(s.place)) s.place = [];
    const p = op && op.i != null ? s.place[op.i] : null;
    switch (op && op.op) {
      case 'move':
        if (!p) break;
        if (isFinite(op.x) && isFinite(op.d)) { for (const k of GROUND_KEYS) delete p[k]; delete p.pin; p.at = [r1(op.x), r1(op.d)]; }
        else if (isFinite(op.X) && isFinite(op.Y)) { p.x = Math.round(op.X); p.y = Math.round(op.Y); }
        break;
      case 'nudge':
        if (!p) break;
        if (Array.isArray(p.at)) p.at = [r1(p.at[0] + num(op.dx, 0)), r1(Math.max(0.5, p.at[1] + num(op.dd, 0)))];
        else if (typeof p.on === 'string' && isFinite(p.d)) p.d = r1(Math.max(0.5, p.d + num(op.dd, 0)));
        else if (isFinite(p.x) && isFinite(p.y)) { p.x = Math.round(p.x + num(op.dX, 0)); p.y = Math.round(p.y + num(op.dY, 0)); }
        break;
      case 'add':
        if (op.place && typeof op.place.obj === 'string') s.place.push(clone(op.place));
        break;
      case 'delete':
        if (p) s.place.splice(op.i, 1);
        break;
      case 'swap':
        if (p && typeof op.obj === 'string') { p.obj = op.obj; delete p.variant; }
        break;
      case 'set':
        if (p && op.patch) for (const [k, v] of Object.entries(op.patch)) { if (v == null || v === '') delete p[k]; else p[k] = v; }
        break;
      case 'camera': {
        const c = Object.assign({}, s.camera || {});
        for (const [k, v] of Object.entries(op.patch || {})) {
          if (v == null || v === '') { delete c[k]; continue; }
          c[k] = k === 'horizon' || k === 'x0' || k === 'heading' ? Math.round(v) : k === 'eye' ? r2(v) : k === 'fov' ? r1(v) : v;
        }
        s.camera = c;
        break;
      }
      case 'env':
        if (['at', 'weather', 'season'].includes(op.key)) { if (op.value == null || op.value === '') delete s[op.key]; else s[op.key] = op.value; }
        break;
      default: break;
    }
    return out;
  }
  function history(max) {
    max = max || 100;
    const und = [], red = [];
    return {
      push(state) { und.push(state); if (und.length > max) und.shift(); red.length = 0; },
      undo(cur) { if (!und.length) return cur; red.push(cur); return und.pop(); },
      redo(cur) { if (!red.length) return cur; und.push(cur); return red.pop(); },
      canUndo: () => und.length > 0, canRedo: () => red.length > 0,
      clear() { und.length = 0; red.length = 0; },
      get size() { return und.length; },
    };
  }
  const POS_KEYS = ['at', 'on', 'u', 'd', 'along', 'alongM', 'x', 'y', 's'];
  function diff(a, b) {
    const A = ((a && a.scene && a.scene.place) || []).map(p => ({ p, j: JSON.stringify(p), used: false }));
    const B = ((b && b.scene && b.scene.place) || []).map(p => ({ p, j: JSON.stringify(p), used: false }));
    for (const y of B) { const x = A.find(q => !q.used && q.j === y.j); if (x) { x.used = true; y.used = true; } }
    let moved = 0, changed = 0, added = 0;
    for (const y of B) {
      if (y.used) continue;
      const x = A.find(q => !q.used && q.p.obj === y.p.obj) || A.find(q => !q.used && POS_KEYS.every(k => JSON.stringify(q.p[k]) === JSON.stringify(y.p[k])));
      if (!x) { added++; continue; }
      x.used = true; y.used = true;
      if (POS_KEYS.some(k => JSON.stringify(x.p[k]) !== JSON.stringify(y.p[k]))) moved++; else changed++;
    }
    const removed = A.filter(x => !x.used).length;
    const sa = (a && a.scene) || {}, sb = (b && b.scene) || {};
    const camera = JSON.stringify(sa.camera || null) !== JSON.stringify(sb.camera || null);
    const env = ['at', 'weather', 'season'].some(k => JSON.stringify(sa[k]) !== JSON.stringify(sb[k]));
    const other = JSON.stringify(Object.assign({}, a, { scene: Object.assign({}, sa, { place: 0, camera: 0, at: 0, weather: 0, season: 0 }) })) !== JSON.stringify(Object.assign({}, b, { scene: Object.assign({}, sb, { place: 0, camera: 0, at: 0, weather: 0, season: 0 }) }));
    return { moved, added, removed, changed, camera, env, other, any: !!(moved || added || removed || changed || camera || env || other) };
  }

  /* ---------- the stage's data: the v2 recipe itself, or a v1 stand-in until A's compile lands ---------- */
  /** Does sceneCompile take the v2 branch (A landed AND wired into the core)? Probed once with a tiny v2 scene. */
  let _v2 = null;
  const v2Engine = () => {
    if (_v2 != null) return _v2;
    try {
      const C = typeof sceneCompile === 'function' ? sceneCompile({ v: 1, id: 'sced-probe', view: { lat: 51.5, lon: 0 }, camera: { eye: 1.6, fov: 60, horizon: 470, heading: 180 }, surfaces: [], place: [] }, { season: 'summer', lod: 1 }) : null;
      _v2 = !!(C && C.v === 2 && C.cam);
    } catch (e) { _v2 = false; }
    return _v2;
  };
  const mix = (a, b, t) => {
    const h = c => { const s = String(c).replace('#', ''); const n = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const A = h(a), B = h(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  /** Clip a ground polygon to the view (Sutherland-Hodgman on four half-planes in (x, d)). */
  function clipView(poly, cam, dNear, dFar) {
    const t = cam.t * 1.3;
    const planes = [
      (q) => q[1] - dNear, (q) => dFar - q[1],
      (q) => q[1] * t - q[0], (q) => q[0] + q[1] * t,
    ];
    let pts = poly;
    for (const f of planes) {
      if (!pts.length) break;
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b);
        if (fa >= 0) out.push(a);
        if ((fa >= 0) !== (fb >= 0)) { const k = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
      }
      pts = out;
    }
    return pts;
  }
  /** Densify the far edge so a clipped polygon's projection follows the ground (straight lines stay straight under projection, so
      only the clip matters; this keeps the path small). Returns screen points. */
  function screenPoly(poly, cam, dNear, dFar) {
    const c = clipView(poly, cam, dNear, dFar);
    if (c.length < 3) return null;
    return c.map(q => { const p = project(cam, q[0], q[1]); return [p.X, p.Y]; });
  }
  const pathD = pts => 'M' + pts.map(p => Math.round(p[0] * 10) / 10 + ' ' + Math.round(p[1] * 10) / 10).join('L') + 'Z';
  const BANDS = [['horizon', 800], ['far', 200], ['mid', 50], ['near', 15], ['fore', 0]];
  const bandOf = d => (BANDS.find(b => d >= b[1]) || BANDS[BANDS.length - 1])[0];
  function previewData(scene, o) {
    o = o || {};
    if (v2Engine()) { const s = clone(scene); return typeof sceneFromRecipe === 'function' ? sceneFromRecipe(s) : s; }
    const cam = camera(scene), G = surfaces(scene), season = o.season || (scene.season && scene.season !== 'auto' ? scene.season : 'summer');
    const dNear = Math.max(0.3, cam.dMin * 0.9), dFar = 3000, haze = '#c9d6dc', shift = SEASON_SHIFT[season];
    const paint = (kind) => {
      let c = SURF_COL[kind] || SURF_COL.grass;
      if (shift && !HARD.has(kind) && kind !== 'water' && kind !== 'rail') c = mix(c, shift[0], shift[1]);
      return { lin: [[0, mix(c, haze, 0.38)], [0.35, mix(c, haze, 0.12)], [1, c]], y1: cam.horizon, y2: H };
    };
    const ground = [];
    for (const g of G.list) {
      const pts = screenPoly(g.poly, cam, dNear, dFar);
      if (pts) ground.push({ layer: 'horizon', d: pathD(pts), fill: paint(g.kind), surf: g.id });
    }
    const water = [];
    for (const g of G.water) {
      const pts = screenPoly(g.poly, cam, dNear, dFar);
      if (!pts) continue;
      const ys = pts.map(p => p[1]);
      water.push({ layer: 'horizon', d: pathD(pts), y0: Math.round(Math.min(...ys)), y1: Math.round(Math.max(...ys)), base: ['#86b4c4', '#46849c', '#24546c'], reflect: true, shimmer: 24, lightPath: true });
    }
    const place = [];
    (Array.isArray(scene.place) ? scene.place : []).forEach((p, i) => {
      if (!p || typeof p.obj !== 'string') return;
      const gp = placeGround(scene, cam, p);
      if (!gp || gp.form === 'pixel') { const q = clone(p); delete q.at; delete q.on; if (isFinite(q.x) && isFinite(q.y)) place.push(q); return; }
      const cls = objClass(p.obj);
      if (o.refuse !== false) { const v = validAt(scene, cam, p.obj, gp.x, gp.d, { fix: p.fix }); if (!v.ok && !v.snap && !v.exempt) return; if (!v.ok && v.snap) { gp.x = v.snap.x; gp.d = v.snap.d; } }
      const h = floats(cls) && surfaceAt(scene, gp.x, gp.d)?.kind === 'water' ? cam.water : 0;
      const pr = project(cam, gp.x, gp.d, h);
      const q = { obj: p.obj, x: r1(pr.X), y: r1(pr.Y), s: Math.round(scaleFor(p.obj, gp.d, cam, p.k) * 1000) / 1000, layer: p.layer || bandOf(gp.d), seed: p.seed != null ? p.seed : i + 1 };
      if (p.variant != null) q.variant = p.variant;
      if (p.face === 'left') q.flip = true; else if (p.face === 'right') q.flip = false; else if (p.flip != null) q.flip = !!p.flip;
      if (p.anim != null) q.anim = p.anim;
      if (p.tint) q.tint = p.tint;
      if (p.shadow != null) q.shadow = p.shadow;
      place.push(q);
    });
    const data = { v: 1, id: String(scene.id || 'scene-editor'), view: Object.assign({}, scene.view || {}, { horizon: Math.round(cam.horizon), fov: cam.fov, heading: cam.heading }),
      at: scene.at || 'day', season: scene.season || 'auto', setting: scene.setting || 'mixed', sky: scene.sky != null ? scene.sky : { stars: 140, clouds: { n: 5, y: [40, Math.max(120, cam.horizon - 120)], speed: 5 }, sunR: 24, moonR: 18 },
      layers: [{ id: 'horizon', depth: 0.08, haze: 0.28 }, { id: 'far', depth: 0.2, haze: 0.16 }, { id: 'mid', depth: 0.45, haze: 0.07 }, { id: 'near', depth: 0.75, haze: 0.02 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
      ground, water, place,
      particles: scene.particles || 'season', weather: typeof scene.weather === 'string' ? scene.weather : 'live' };
    if (Array.isArray(scene.actors)) data.actors = scene.actors.filter(a => a && Array.isArray(a.path) && !a.ground && !a.on);
    if (Array.isArray(scene.flocks)) data.flocks = scene.flocks.filter(f => f && Array.isArray(f.area));
    if (o.wx) data.fx = { weather: 2 };
    if (scene.palette) data.palette = scene.palette;
    if (scene.tropic) data.tropic = scene.tropic;
    return data;
  }

  return { W, H, r1, r2, num, clone, escHtml, camera, project, unproject, grid, surfaces, surfaceAt, spanAt, alongPath, clipView, screenPoly, objDef, objClass, kindsFor, realH, scaleFor, floats,
    placeGround, validAt, apply, history, diff, previewData, v2Engine, FOOT, OVERLAY_COL, HARD, SURF_COL };
})();

function sceneEditorCamera(scene) { return _sced.camera(scene); }
function sceneEditorProject(cam, x, d, h) { return _sced.project(cam, x, d, h); }
function sceneEditorUnproject(cam, X, Y) { return _sced.unproject(cam, X, Y); }
function sceneEditorGrid(cam) { return _sced.grid(cam); }
function sceneEditorSurfaces(scene) { return _sced.surfaces(scene); }
function sceneEditorSurfaceAt(scene, cam, x, d) { const s = _sced.surfaceAt(scene, x, d); return s ? { id: s.id, kind: s.kind, water: s.water } : null; }
function sceneEditorClass(id) { return _sced.objClass(id); }
function sceneEditorValidAt(scene, cam, id, x, d, o) { return _sced.validAt(scene, cam, id, x, d, o); }
function sceneEditorPlaceGround(scene, cam, p) { return _sced.placeGround(scene, cam, p); }
function sceneEditorApply(rec, op) { return _sced.apply(rec, op); }
function sceneEditorHistory(max) { return _sced.history(max); }
function sceneEditorDiff(a, b) { return _sced.diff(a, b); }
function sceneEditorPreviewData(scene, o) { return _sced.previewData(scene, o); }

/* ============================================================
   The page: availability, the dialog, the stage, the overlay, the panels.
   ============================================================ */
let _scedAvail = null, _scedCur = null, _scedSeq = 0;
/** Is the editor's dev route on? Asked once per page (a 404 means off: a normal install never shows the button). */
function sceneEditorAvailable() {
  if (_scedAvail) return _scedAvail;
  if (typeof fetch !== 'function' || typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return (_scedAvail = Promise.resolve(false));
  _scedAvail = fetch('/api/scene-editor/status', { headers: { accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : null)).then(j => !!(j && j.enabled)).catch(() => false);
  return _scedAvail;
}
function sceneEditorClose() { if (_scedCur) _scedCur.close(); }

async function _scedJson(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'content-type': 'application/json', accept: 'application/json' } : { accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) { /* not JSON */ }
  return { status: r.status, ok: r.ok, json: j || {} };
}

/** Open the editor for a recipe ref ('<pack>/<id>'). */
async function sceneEditorOpen(ref, o) {
  o = o || {};
  if (typeof document === 'undefined') return null;
  if (_scedCur) _scedCur.close();
  const E = _sced, h = E.escHtml, num = E.num;
  const root = document.createElement('div');
  root.className = 'sced'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Scene editor');
  root.innerHTML = `<div class="sced-head"><b>Scene editor</b><span class="muted sced-ref">${h(ref)}</span><span class="sced-sum muted" role="status" aria-live="polite">Loading…</span>
    <span class="sced-head-acts"></span></div><div class="sced-body"><div class="sced-main"><div class="sced-stage"><div class="sced-hosts"></div><canvas class="sced-ov" tabindex="0"></canvas>
    <div class="sced-msg" hidden></div></div><div class="sced-tools"></div><div class="sced-credits muted"></div></div><aside class="sced-side" aria-label="Scene editor panels"></aside></div>`;
  document.body.appendChild(root);
  const head = root.querySelector('.sced-head-acts'), sum = root.querySelector('.sced-sum'), stage = root.querySelector('.sced-stage'), hosts = root.querySelector('.sced-hosts');
  const ov = root.querySelector('.sced-ov'), msg = root.querySelector('.sced-msg'), tools = root.querySelector('.sced-tools'), side = root.querySelector('.sced-side'), credits = root.querySelector('.sced-credits');
  const reduced = !!(window.Motion && Motion.prefersReduced ? Motion.prefersReduced() : (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches));
  const ed = { ref, rec: null, base: null, version: '', file: '', hist: E.history(100), sel: -1, drag: null, hover: -1, cam: null, C: null, env: { time: null, moment: '', wx: '', season: '' },
    show: { grid: true, surfaces: true, thirds: false, lines: false }, lint: null, server: [], addAt: null, items: [], seq: 0, restageT: 0, closed: false };
  const btn = (label, ic, fn, cls) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + (cls || 'btn-secondary');
    b.innerHTML = (ic && typeof icon === 'function' ? icon(ic, 'i-sm') : '') + `<span>${h(label)}</span>`; b.onclick = fn; return b;
  };
  const say = (text, kind) => { if (typeof toast === 'function') toast(text, kind ? { kind } : undefined); };
  const saveB = btn('Save', 'cloud-check', () => save(), 'btn-primary'), rebuildB = btn('Rebuild page', 'refresh-cw', () => rebuild()), closeB = btn('Close', 'x', () => close(), 'btn-ghost');
  rebuildB.hidden = true; saveB.disabled = true;
  head.append(saveB, rebuildB, closeB);
  const prevFocus = o.returnFocus || document.activeElement;
  function onKeyDoc(e) { if (e.key === 'Escape' && !e.defaultPrevented && root.contains(document.activeElement) && document.activeElement !== ov) { e.preventDefault(); close(); } }
  document.addEventListener('keydown', onKeyDoc, true);
  function close(force) {
    if (ed.closed) return;
    if (!force && ed.rec && E.diff(ed.base, ed.rec).any && !confirm('Close the scene editor? Unsaved changes are lost.')) return;
    ed.closed = true; clearTimeout(ed.restageT);
    document.removeEventListener('keydown', onKeyDoc, true);
    if (ed.ro) ed.ro.disconnect();
    for (const r of ed.items) { try { delete window.__sceneItems[r]; } catch (e) { /* gone */ } }
    root.remove();
    if (_scedCur === api) _scedCur = null;
    if (prevFocus && prevFocus.focus && prevFocus.isConnected) prevFocus.focus();
  }
  const api = { close, ed, root };
  _scedCur = api;

  /* ---------- loading ---------- */
  async function load() {
    let r;
    try { r = await _scedJson('GET', '/api/scene-editor/recipe?ref=' + encodeURIComponent(ref)); }
    catch (e) { showMsg(typeof netErrorMessage === 'function' ? netErrorMessage(e) : String(e && e.message || e)); return false; }
    if (!r.ok) { showMsg(r.json.error || ('The recipe could not be opened (' + r.status + ').')); sum.textContent = ''; return false; }
    ed.rec = r.json.rec; ed.base = r.json.rec; ed.version = r.json.version; ed.file = r.json.file || '';
    root.querySelector('.sced-ref').textContent = ref + (ed.file ? ' · ' + ed.file : '');
    ed.hist.clear();
    return true;
  }
  function showMsg(text) { msg.hidden = !text; msg.textContent = text || ''; }

  /* ---------- the stage: the scene through the normal host; a new host replaces the old once it has baked ---------- */
  function envSky() {
    const v = (ed.rec.scene && ed.rec.scene.view) || {}, lat = num(v.lat, 51.5), lon = num(v.lon, -0.12);
    if (ed.env.time == null || typeof almSceneLight !== 'function') return null;
    const day = new Date(Date.now()).toISOString().slice(0, 10);   // clock-ok: the editor previews today's sun at the scene's place
    const ms = Date.parse(day + 'T00:00:00Z') + ed.env.time * 60000 - lon / 15 * 3600000;
    return almSceneLight(ms, lat, lon, 'UTC');
  }
  function previewSeason() { return ed.env.season || (ed.rec.scene.season && ed.rec.scene.season !== 'auto' ? ed.rec.scene.season : ''); }
  function restage() {
    if (ed.closed || !ed.rec) return;
    const data = E.previewData(ed.rec.scene, { season: previewSeason() || undefined, wx: ed.env.wx || null });
    const meta = Object.assign({}, ed.rec.meta || {}, { id: 'ed' + (++_scedSeq), label: (ed.rec.meta && ed.rec.meta.label) || ref, when: () => false });
    let item;
    try { item = typeof sceneItem === 'function' ? sceneItem(meta, data) : null; } catch (e) { item = null; }
    if (!item) { showMsg('The scene engine is not loaded in this page.'); return; }
    item.ref = 'scene-editor/' + meta.id; item.pack = 'scene-editor';
    window.__sceneItems = window.__sceneItems || {};
    window.__sceneItems[item.ref] = item; ed.items.push(item.ref);
    const sky = envSky(), season = previewSeason();
    const opts = { size: 'fill', live: !reduced, reduced };
    if (sky) { opts.sky = sky; opts.tod = sky.tod; } else opts.lighting = false;
    if (season) opts.season = season;
    let html = typeof animItemHtml === 'function' ? animItemHtml(item, opts) : '';
    if (!/ap-composed/.test(html)) html = `<span class="anim-scene ap-art sz-fill ap-full ap-rich ap-composed${reduced ? ' ap-still' : ' is-live'}" data-anim="${h(item.ref)}"${typeof sceneHostAttrs === 'function' ? sceneHostAttrs(item, opts) : ''}><canvas class="sc-canvas" aria-hidden="true"></canvas></span>`;
    const box = document.createElement('div'); box.className = 'sced-host'; box.setAttribute('data-scene-key', item.ref); box.innerHTML = html;
    hosts.appendChild(box);
    const el = box.querySelector('.ap-composed');
    if (typeof sceneHostScan === 'function') sceneHostScan(box);
    applyEnv(el);
    const t0 = performance.now();
    const swap = () => {
      if (ed.closed) return;
      if (!el.classList.contains('sc-ready') && performance.now() - t0 < 8000) { requestAnimationFrame(swap); return; }
      for (const old of [...hosts.children]) if (old !== box && old.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING) {
        const k = old.getAttribute('data-scene-key'); old.remove();
        setTimeout(() => { if (window.__sceneItems && !hosts.querySelector(`[data-scene-key="${CSS.escape(k)}"]`)) delete window.__sceneItems[k]; }, 3000);
      }
    };
    requestAnimationFrame(swap);
    try { ed.C = typeof sceneCompile === 'function' ? sceneCompile(data, { season: season || 'summer', lod: 1 }) : null; } catch (e) { ed.C = null; }
    ed.data = data;
    if (ed.show.lines) composition();
    drawOverlay(); paintProblems();
  }
  function restageSoon() { clearTimeout(ed.restageT); ed.restageT = setTimeout(restage, 220); }
  /** The preview environment on a host: C's sceneHostSet when loaded; else the host's own attributes (no weather). */
  function applyEnv(el) {
    if (!el) return;
    const sky = envSky(), season = previewSeason();
    if (typeof sceneHostSet === 'function') {
      try { sceneHostSet(el, { at: sky ? sky.ms : (ed.env.moment || ed.rec.scene.at || 'day'), wx: ed.env.wx || null, season: season || null }); return; } catch (e) { /* the attributes below */ }
    }
    if (sky) { el.setAttribute('data-sc-sky', Math.round(sky.ms) + ',' + E.r2(sky.lat) + ',' + E.r2(sky.lon)); el.removeAttribute('data-sc-at'); }
    else { el.setAttribute('data-sc-sky', 'off'); if (ed.env.moment) el.setAttribute('data-sc-at', ed.env.moment); else el.removeAttribute('data-sc-at'); }
    if (season) el.setAttribute('data-sc-season', season); else el.removeAttribute('data-sc-season');
    if (typeof sceneHostRelight === 'function') sceneHostRelight();
  }
  function applyEnvAll() { for (const el of hosts.querySelectorAll('.ap-composed')) applyEnv(el); }

  /* ---------- the overlay ---------- */
  const ctx = ov.getContext('2d');
  function sizeOverlay() {
    const b = stage.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    ov.width = Math.max(1, Math.round(b.width * dpr)); ov.height = Math.max(1, Math.round(b.height * dpr));
    ed.k = ov.width / E.W; ed.cssK = b.width / E.W;
    drawOverlay();
  }
  function handles() {
    const s = ed.rec.scene, cam = ed.cam, out = [];
    // with the v2 compile (A): its problems name the placement (i), and its items carry the resolved ground point (lane, snap)
    const v2 = ed.C && ed.C.v === 2, probs = new Map(), used = new Set();
    const isPlace = (q) => Number.isInteger(q.i) && (typeof q.msg !== 'string' || /^place\[/.test(q.msg)) && !/^(flow|flock|actor|scatter|surface|water|sign)/.test(q.rule || '');
    if (v2) for (const q of ed.C.problems || []) if (isPlace(q) && (q.rule === 'refused' || q.rule === 'snapped' || q.sev === 'warn' || q.sev === 'error')) {
      const was = probs.get(q.i); if (!was || q.rule === 'refused') probs.set(q.i, q);
    }
    const resolved = (p, g) => {
      if (!v2) return null;
      let best = null, bd = 6;
      ed.C.items.forEach((it, j) => {
        if (used.has(j) || !it.g || !(it.o === p.obj || String(it.o).startsWith(p.obj + '-'))) return;
        const dd = Math.hypot(it.g.x - g.x, it.g.d - g.d);
        if (dd < bd) { bd = dd; best = j; }
      });
      if (best == null) return null;
      used.add(best);
      return ed.C.items[best];
    };
    (Array.isArray(s.place) ? s.place : []).forEach((p, i) => {
      if (!p || typeof p.obj !== 'string') return;
      const g = E.placeGround(s, cam, p);
      if (!g) {
        if (isFinite(p.x) && isFinite(p.y)) out.push({ i, p, X: +p.x, Y: +p.y, pixel: true, state: 'pixel' });
        return;
      }
      const cls = E.objClass(p.obj), v = E.validAt(s, cam, p.obj, g.x, g.d, { C: ed.C, fix: p.fix });
      let state = g.form === 'pixel' ? (v.ok || v.exempt ? 'pixel' : 'warn') : v.ok || v.exempt ? 'ok' : v.snap ? 'snapped' : 'refused';
      let gx = g.x, gd = g.d, h = E.floats(cls) && v.at && v.at.kind === 'water' ? cam.water : 0;
      const it = resolved(p, g), q = probs.get(i);
      if (v2) {
        state = q ? (q.rule === 'refused' || q.sev === 'error' ? 'refused' : q.rule === 'snapped' ? 'snapped' : 'warn') : g.form === 'pixel' ? 'pixel' : 'ok';
        if (it && state !== 'refused') { gx = it.g.x; gd = it.g.d; if (it.g.h != null && !(E.floats(cls) && v.at && v.at.kind === 'water')) h = it.g.h; }
      }
      const pr = E.project(cam, gx, gd, h);
      out.push({ i, p, g: { x: gx, d: gd, form: g.form }, cls, v, X: pr.X, Y: pr.Y, k: pr.k, state, form: g.form, prob: q || null });
    });
    return out;
  }
  const STATE_COL = { ok: '#3fcf7f', snapped: '#f5b13d', refused: '#ff5a5f', warn: '#f1d04b', pixel: '#a8b3c2' };
  function surfaceGroup(kind) { return kind === 'water' ? 'water' : kind === 'rail' || kind === 'tramway' ? 'rail' : E.HARD.has(kind) ? 'hard' : 'soft'; }
  function drawOverlay() {
    if (!ed.rec || !ed.cam || !ctx) return;
    const k = ed.k || 1, cam = ed.cam, s = ed.rec.scene;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ov.width, ov.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const lw = 1 / (ed.cssK || 1);
    if (ed.show.grid) {
      ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      for (const l of E.grid(cam)) { ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([6 * lw, 6 * lw]);
      ctx.beginPath(); ctx.moveTo(0, cam.horizon); ctx.lineTo(E.W, cam.horizon); ctx.stroke(); ctx.setLineDash([]);
    }
    if (ed.show.surfaces) {
      const G = E.surfaces(s), dN = Math.max(0.3, cam.dMin * 0.9);
      ctx.font = `${11 * lw}px system-ui, sans-serif`; ctx.textBaseline = 'middle';
      // the compiled geometry when the v2 compile (A) gave it (smoothed strips, banks), else the stand-in's
      let list = G.list.concat(G.water);
      if (ed.C && ed.C.v === 2 && Array.isArray(ed.C.surfaces)) {
        const cs = ed.C.surfaces.filter(q => q && Array.isArray(q.polyM) && q.polyM.length >= 3).map(q => ({ id: q.id, kind: q.kind, poly: q.polyM, rest: !!(G.byId[q.id] && G.byId[q.id].rest) || q.rest, water: false }));
        const cw = (ed.C.water || []).map(w => w && w.v2 && Array.isArray(w.v2.polyM) && w.v2.polyM.length >= 3 ? { id: w.v2.id, kind: 'water', wkind: w.v2.kind, poly: w.v2.polyM, water: true } : null).filter(Boolean);
        if (cs.length || cw.length) list = cs.concat(cw.length ? cw : G.water);
      }
      for (const g of list) {
        if (g.rest) continue;
        const pts = E.screenPoly(g.poly, cam, dN, 3000);
        if (!pts) continue;
        const col = E.OVERLAY_COL[surfaceGroup(g.kind)];
        ctx.lineWidth = 1.6 * lw; ctx.strokeStyle = col; ctx.setLineDash(g.water ? [] : [5 * lw, 3 * lw]);
        ctx.beginPath(); pts.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
        const lab = pts.reduce((a, p) => (p[1] > a[1] ? p : a), pts[0]);
        const mid = pts.filter(p => p[1] > lab[1] - 40);
        const text = g.id + ' · ' + (g.water ? g.wkind : g.kind), tw = ctx.measureText(text).width, pad = tw / 2 + 8 * lw;
        const lx = Math.max(pad, Math.min(E.W - pad, mid.reduce((a, p) => a + p[0], 0) / mid.length)), ly = Math.max(cam.horizon + 12 * lw, Math.min(E.H - 14 * lw, lab[1] - 12 * lw));
        ctx.fillStyle = 'rgba(10,14,20,0.62)';
        ctx.fillRect(lx - tw / 2 - 4 * lw, ly - 8 * lw, tw + 8 * lw, 16 * lw);
        ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(text, lx, ly);
      }
      // the flows' lanes as arrows (D's compiled lanes when loaded; else the declared strip each flow runs on)
      const lanes = [];
      if (ed.C && Array.isArray(ed.C.flows)) for (const f of ed.C.flows) for (const l of f.lanes || []) if (Array.isArray(l.path)) lanes.push(l.dir === -1 || l.dir === 'toward' ? l.path.slice().reverse() : l.path);
      if (!lanes.length) for (const f of Array.isArray(s.flows) ? s.flows : []) { const g = f && G.byId[f.on]; if (g && g.centre) { lanes.push(g.centre); if (f.dir !== 'one') lanes.push(g.centre.slice().reverse()); } }
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2 * lw;
      for (const path of lanes) {
        const pts = [];
        for (let j = 0; j < path.length - 1; j++) for (let q = 0; q < 8; q++) { const a = path[j], b = path[j + 1], t = q / 8; const x = a[0] + (b[0] - a[0]) * t, d = a[1] + (b[1] - a[1]) * t; if (d > cam.dMin * 0.95) pts.push(E.project(cam, x, d)); }
        if (pts.length < 2) continue;
        ctx.beginPath(); pts.forEach((p, j) => (j ? ctx.lineTo(p.X, p.Y) : ctx.moveTo(p.X, p.Y))); ctx.stroke();
        for (let j = 4; j < pts.length; j += 8) { const a = pts[j - 1], b = pts[j], an = Math.atan2(b.Y - a.Y, b.X - a.X), r = 7 * lw; ctx.beginPath(); ctx.moveTo(b.X, b.Y); ctx.lineTo(b.X - r * Math.cos(an - 0.5), b.Y - r * Math.sin(an - 0.5)); ctx.lineTo(b.X - r * Math.cos(an + 0.5), b.Y - r * Math.sin(an + 0.5)); ctx.closePath(); ctx.fill(); }
      }
    }
    if (ed.show.thirds) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = lw; ctx.setLineDash([3 * lw, 5 * lw]); ctx.beginPath();
      for (const x of [E.W / 3, E.W * 2 / 3]) { ctx.moveTo(x, 0); ctx.lineTo(x, E.H); }
      for (const y of [E.H / 3, E.H * 2 / 3]) { ctx.moveTo(0, y); ctx.lineTo(E.W, y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (ed.show.lines && ed.comp) {
      ctx.lineWidth = 2 * lw;
      for (const l of ed.comp.lines || []) {
        if (!l.vp || !l.from) continue;
        ctx.strokeStyle = 'rgba(255,214,102,0.9)'; ctx.beginPath(); ctx.moveTo(l.from[0], l.from[1]); ctx.lineTo(l.vp[0], l.vp[1]); ctx.stroke();
        ctx.fillStyle = 'rgba(255,214,102,0.9)'; ctx.beginPath(); ctx.arc(l.vp[0], l.vp[1], 5 * lw, 0, Math.PI * 2); ctx.fill();
      }
      const sub = ed.comp.subject;
      if (sub && sub.box) { ctx.strokeStyle = 'rgba(92,200,255,0.9)'; ctx.strokeRect(sub.box[0], sub.box[1], sub.box[2] - sub.box[0], sub.box[3] - sub.box[1]); }
    }
    // the handles: a footprint ellipse and a dot at each anchor, coloured by its state
    ed.hs = handles();
    for (const hd of ed.hs) {
      const sel = hd.i === ed.sel, col = STATE_COL[hd.state] || '#fff';
      if (ed.drag && ed.drag.i === hd.i && ed.drag.moved) continue;
      if (!hd.pixel) {
        const fp = E.FOOT[hd.cls] || [1, 1], rx = Math.max(4 * lw, hd.k * fp[0] / 2), ry = Math.max(2 * lw, rx * Math.min(0.5, cam.eye / Math.max(1, hd.g.d) * (fp[1] / fp[0]) * 4 + 0.08));
        ctx.lineWidth = (sel ? 2.5 : 1.4) * lw; ctx.strokeStyle = col; ctx.fillStyle = col;
        ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.ellipse(hd.X, hd.Y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      }
      ctx.fillStyle = col; ctx.strokeStyle = sel ? '#ffffff' : 'rgba(0,0,0,0.6)'; ctx.lineWidth = (sel ? 2.5 : 1.2) * lw;
      ctx.beginPath();
      if (hd.pixel) ctx.rect(hd.X - 5 * lw, hd.Y - 5 * lw, 10 * lw, 10 * lw); else ctx.arc(hd.X, hd.Y, (sel ? 7 : 5.5) * lw, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      if (sel || hd.i === ed.hover) label(hd.p.obj + (hd.state !== 'ok' ? ' · ' + hd.state : ''), hd.X, hd.Y - 16 * lw, col, lw);
    }
    if (ed.drag && ed.drag.moved) drawDrag(lw);
    if (ed.addAt) {
      const p = E.project(cam, ed.addAt.x, ed.addAt.d);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * lw; ctx.beginPath(); ctx.moveTo(p.X - 8 * lw, p.Y); ctx.lineTo(p.X + 8 * lw, p.Y); ctx.moveTo(p.X, p.Y - 8 * lw); ctx.lineTo(p.X, p.Y + 8 * lw); ctx.stroke();
    }
  }
  function label(text, x, y, col, lw) {
    ctx.font = `600 ${12 * lw}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(10,14,20,0.75)'; ctx.fillRect(x - tw / 2 - 5 * lw, y - 9 * lw, tw + 10 * lw, 18 * lw);
    ctx.fillStyle = col; ctx.fillText(text, x, y);
  }
  /** The drag: a ghost of the sprite at the pointer's ground point, green (valid), amber (snaps) or red (refused). */
  function drawDrag(lw) {
    const dr = ed.drag, cam = ed.cam, p = ed.rec.scene.place[dr.i];
    if (!p) return;
    let X = dr.X, Y = dr.Y, s = dr.s0, col = '#a8b3c2', text = '';
    if (dr.ground) {
      const v = dr.v, tgt = v && !v.ok && v.snap ? v.snap : dr.ground;
      const water = v && E.floats(v.cls) && (v.at && v.at.kind === 'water');
      const pr = E.project(cam, tgt.x, tgt.d, water ? cam.water : 0);
      X = pr.X; Y = pr.Y; s = E.scaleFor(p.obj, tgt.d, cam, p.k);
      col = !v || v.ok || v.exempt ? STATE_COL.ok : v.snap ? STATE_COL.snapped : STATE_COL.refused;
      text = !v || v.ok || v.exempt ? (v && v.at ? 'on ' + v.at.id : '') : v.snap ? 'snaps ' + E.r1(v.snap.m) + ' m to ' + (E.surfaceAt(ed.rec.scene, v.snap.x, v.snap.d) || {}).id : 'refused: ' + (v.at ? v.at.kind : 'no ground') + ' (needs ' + (v.kinds || []).slice(0, 4).join(', ') + ')';
      if (v && !v.ok && v.snap) { const q = E.project(cam, dr.ground.x, dr.ground.d); ctx.strokeStyle = col; ctx.lineWidth = 1.5 * lw; ctx.setLineDash([4 * lw, 3 * lw]); ctx.beginPath(); ctx.moveTo(q.X, q.Y); ctx.lineTo(X, Y); ctx.stroke(); ctx.setLineDash([]); }
    } else if (dr.groundless) { col = STATE_COL.refused; text = 'above the horizon: no ground here'; }
    ghost(p, X, Y, s, col);
    ctx.setTransform(ed.k, 0, 0, ed.k, 0, 0);
    ctx.fillStyle = col; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * lw; ctx.beginPath(); ctx.arc(X, Y, 6 * lw, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (text) label(text, X, Y + 22 * lw, col, lw);
  }
  function ghost(p, X, Y, s, col) {
    let R = null;
    try { R = typeof sceneObjShapes === 'function' ? sceneObjShapes(p.obj, p.variant || 0, previewSeason() || 'summer') : null; } catch (e) { R = null; }
    const flip = p.face === 'left' || p.flip === true ? -1 : 1, k = ed.k;
    ctx.save();
    ctx.setTransform(k * s * flip, 0, 0, k * s, k * X, k * Y);
    ctx.globalAlpha = 0.55;
    let n = 0;
    if (R && R.parts) {
      outer: for (const name of R.order || Object.keys(R.parts)) for (const sh of R.parts[name] || []) {
        if (n++ > 900) break outer;
        if (!sh.d || name === 'lit') continue;
        let path; try { path = new Path2D(sh.d); } catch (e) { continue; }
        if (sh.f) { ctx.fillStyle = typeof sh.f === 'string' ? sh.f : '#8a8f96'; ctx.fill(path); }
        else if (sh.s) { ctx.strokeStyle = typeof sh.s === 'string' ? sh.s : '#8a8f96'; ctx.lineWidth = sh.w || 1; ctx.stroke(path); }
      }
    }
    ctx.globalAlpha = 1; ctx.restore();
    if (!R) { ctx.strokeStyle = col; ctx.strokeRect(X - 20, Y - 40, 40, 40); }
  }

  /* ---------- pointer and keyboard ---------- */
  const toScene = (e) => { const b = ov.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * E.W, (e.clientY - b.top) / b.height * E.H]; };
  function hit(X, Y) {
    const r = 14 / (ed.cssK || 1);
    let best = -1, bd = r;
    for (const hd of ed.hs || []) { const dd = Math.hypot(hd.X - X, hd.Y - Y); if (dd <= bd) { bd = dd; best = hd.i; } }
    return best;
  }
  ov.addEventListener('pointerdown', (e) => {
    if (!ed.rec || e.button !== 0) return;
    ov.focus();
    const [X, Y] = toScene(e), i = hit(X, Y);
    if (i < 0) {
      const g = E.unproject(ed.cam, X, Y);
      select(-1);
      ed.addAt = g ? { x: g.x, d: g.d } : null;
      paintAdd(); drawOverlay();
      return;
    }
    select(i);
    const hd = ed.hs.find(q => q.i === i), p = ed.rec.scene.place[i];
    ed.drag = { i, sx: X, sy: Y, X: hd.X, Y: hd.Y, moved: false, pixel: !!hd.pixel && !hd.g, s0: isFinite(p.s) ? +p.s : 1, ground: null, v: null, offX: hd.X - X, offY: hd.Y - Y };
    try { ov.setPointerCapture(e.pointerId); } catch (err) { /* a synthetic pointer */ }
    e.preventDefault();
  });
  ov.addEventListener('pointermove', (e) => {
    if (!ed.rec) return;
    const [X, Y] = toScene(e);
    if (!ed.drag) { const i = hit(X, Y); if (i !== ed.hover) { ed.hover = i; ov.style.cursor = i >= 0 ? 'grab' : 'crosshair'; drawOverlay(); } return; }
    const dr = ed.drag;
    if (!dr.moved && Math.hypot(X - dr.sx, Y - dr.sy) < 3 / (ed.cssK || 1)) return;
    dr.moved = true; ov.style.cursor = 'grabbing';
    dr.X = X + dr.offX; dr.Y = Y + dr.offY;
    if (dr.pixel) { drawOverlay(); return; }
    const g = E.unproject(ed.cam, dr.X, dr.Y);
    dr.ground = g; dr.groundless = !g;
    dr.v = g ? E.validAt(ed.rec.scene, ed.cam, ed.rec.scene.place[dr.i].obj, g.x, g.d, { C: ed.C, fix: ed.rec.scene.place[dr.i].fix }) : null;
    drawOverlay();
  });
  const endDrag = (e) => {
    const dr = ed.drag;
    if (!dr) return;
    ed.drag = null; ov.style.cursor = 'grab';
    try { ov.releasePointerCapture(e.pointerId); } catch (err) { /* released */ }
    if (!dr.moved) { drawOverlay(); return; }
    if (dr.pixel) { commit({ op: 'move', i: dr.i, X: dr.X, Y: dr.Y }); return; }
    const v = dr.v, g = dr.ground;
    if (!g) { say('Refused: above the horizon there is no ground.', 'err'); drawOverlay(); return; }
    if (v.ok || v.exempt) commit({ op: 'move', i: dr.i, x: g.x, d: g.d });
    else if (v.snap) { commit({ op: 'move', i: dr.i, x: v.snap.x, d: v.snap.d }); say(`Snapped ${E.r1(v.snap.m)} m onto an allowed surface.`); }
    else { say(`Refused: a ${v.cls} cannot stand on ${v.at ? v.at.kind : 'that'} (allowed: ${(v.kinds || []).slice(0, 6).join(', ')}).`, 'err'); drawOverlay(); }
  };
  ov.addEventListener('pointerup', endDrag);
  ov.addEventListener('pointercancel', (e) => { ed.drag = null; drawOverlay(); });
  ov.addEventListener('pointerleave', () => { if (!ed.drag && ed.hover !== -1) { ed.hover = -1; drawOverlay(); } });
  ov.addEventListener('keydown', (e) => {
    if (!ed.rec) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (mod && (e.key === 'y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (e.key === 'Escape') { e.preventDefault(); if (ed.sel >= 0 || ed.addAt) { select(-1); ed.addAt = null; paintAdd(); drawOverlay(); } else close(); return; }
    if (ed.sel < 0) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); commit({ op: 'delete', i: ed.sel }); select(-1); return; }
    const step = e.shiftKey ? 1 : 0.25, dirs = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (!dirs[e.key]) return;
    e.preventDefault();
    const p = ed.rec.scene.place[ed.sel], [dx, dd] = dirs[e.key];
    const g = E.placeGround(ed.rec.scene, ed.cam, p);
    if (!g) { const kk = 4 * (e.shiftKey ? 4 : 1); commit({ op: 'nudge', i: ed.sel, dX: dx ? Math.sign(dx) * kk : 0, dY: dd ? -Math.sign(dd) * kk : 0 }); return; }
    if (Array.isArray(p.at) || (typeof p.on === 'string' && isFinite(p.d) && !dx && p.along == null && p.alongM == null)) commit({ op: 'nudge', i: ed.sel, dx, dd });
    else commit({ op: 'move', i: ed.sel, x: g.x + dx, d: g.d + dd });
  });

  /* ---------- edits ---------- */
  function commit(op) {
    const next = E.apply(ed.rec, op);
    if (JSON.stringify(next) === JSON.stringify(ed.rec)) return;
    ed.hist.push(ed.rec); ed.rec = next;
    changed(op.op === 'camera');
  }
  function changed(cameraChanged) {
    ed.cam = E.camera(ed.rec.scene);
    if (ed.sel >= (ed.rec.scene.place || []).length) ed.sel = -1;
    paintSummary(); paintList(); paintInspector(); if (cameraChanged) paintCamera();
    drawOverlay(); restageSoon();
  }
  function undo() { if (!ed.hist.canUndo()) return; ed.rec = ed.hist.undo(ed.rec); changed(true); }
  function redo() { if (!ed.hist.canRedo()) return; ed.rec = ed.hist.redo(ed.rec); changed(true); }
  function select(i) { if (ed.sel === i) return; ed.sel = i; if (i >= 0) ed.addAt = null; paintInspector(); paintList(); paintAdd(); drawOverlay(); }

  /* ---------- save, lint, rebuild ---------- */
  function paintSummary() {
    const d = E.diff(ed.base, ed.rec), parts = [];
    if (d.moved) parts.push(d.moved + ' moved'); if (d.added) parts.push(d.added + ' added'); if (d.removed) parts.push(d.removed + ' removed');
    if (d.changed) parts.push(d.changed + ' changed'); if (d.camera) parts.push('camera'); if (d.env) parts.push('time, weather or season');
    sum.textContent = d.any ? 'Unsaved: ' + (parts.join(', ') || 'changes') : 'No unsaved changes';
    saveB.disabled = !d.any;
    undoB.disabled = !ed.hist.canUndo(); redoB.disabled = !ed.hist.canRedo();
  }
  async function save() {
    const d = E.diff(ed.base, ed.rec);
    if (!d.any) return;
    saveB.disabled = true;
    let r;
    try { r = await _scedJson('POST', '/api/scene-editor/recipe', { ref, version: ed.version, rec: ed.rec }); }
    catch (e) { saveB.disabled = false; say(typeof netErrorMessage === 'function' ? netErrorMessage(e) : 'The save failed.', 'err'); return; }
    if (r.ok) { ed.version = r.json.version; ed.base = ed.rec; ed.server = []; paintSummary(); paintProblems(); rebuildB.hidden = false; say('Saved to ' + (r.json.file || 'the recipe'), 'ok'); return; }
    saveB.disabled = false;
    if (r.status === 409) {
      if (typeof toast === 'function') toast(r.json.error || 'The recipe changed on disk.', { kind: 'err', action: { label: 'Reload it', run: async () => { if (await load()) { ed.cam = E.camera(ed.rec.scene); paintAll(); restage(); } } } });
      return;
    }
    ed.server = Array.isArray(r.json.problems) ? r.json.problems : [{ code: 'ERROR', msg: r.json.error || 'The save was refused (' + r.status + ')' }];
    paintProblems(); say(r.json.error || 'The save was refused.', 'err');
  }
  async function rebuild() {
    rebuildB.disabled = true;
    try {
      const r = await _scedJson('POST', '/api/scene-editor/rebuild', {});
      if (r.ok) { if (typeof toast === 'function') toast('Rebuilt. Reload the page to see the saved scene in the gallery.', { kind: 'ok', action: { label: 'Reload', run: () => location.reload() } }); }
      else say(r.json.error || 'The rebuild failed.', 'err');
    } catch (e) { say(typeof netErrorMessage === 'function' ? netErrorMessage(e) : 'The rebuild failed.', 'err'); }
    rebuildB.disabled = false;
  }
  async function lint() {
    lintB.disabled = true; lintOut.textContent = 'Linting…';
    try {
      const r = await _scedJson('POST', '/api/scene-editor/lint', { rec: ed.rec });
      ed.lint = r.ok ? r.json : { rules: [{ rule: 'error', ok: false, message: r.json.error || ('lint failed (' + r.status + ')') }] };
    } catch (e) { ed.lint = { rules: [{ rule: 'error', ok: false, message: typeof netErrorMessage === 'function' ? netErrorMessage(e) : 'lint failed' }] }; }
    lintB.disabled = false; paintProblems();
  }

  /* ---------- panels ---------- */
  const section = (title, open) => { const d = document.createElement('details'); d.className = 'sced-sec'; d.open = open !== false; d.innerHTML = `<summary>${h(title)}</summary>`; const body = document.createElement('div'); body.className = 'sced-sec-b'; d.appendChild(body); side.appendChild(d); return body; };
  const field = (labelText, control) => { const l = document.createElement('label'); l.className = 'sced-f'; l.innerHTML = `<span>${h(labelText)}</span>`; l.appendChild(control); return l; };
  const numIn = (val, min, max, step, onCommit) => {
    const i = document.createElement('input'); i.type = 'number'; i.className = 'control control-sm'; i.min = min; i.max = max; i.step = step; i.value = val == null ? '' : val;
    i.onchange = () => { const v = i.value === '' ? null : Number(i.value); if (v == null || isFinite(v)) onCommit(v == null ? null : Math.max(min, Math.min(max, v))); };
    return i;
  };
  const sel = (options, val, onPick) => {
    const s = document.createElement('select'); s.className = 'control control-sm';
    for (const [v, t] of options) { const op = document.createElement('option'); op.value = v; op.textContent = t; if (String(v) === String(val == null ? '' : val)) op.selected = true; s.appendChild(op); }
    s.onchange = () => onPick(s.value); return s;
  };
  const insp = section('Placement'), addSec = section('Add here'), listSec = section('Placements', false), camSec = section('Camera'), envSec = section('Time, weather and season'), probSec = section('Problems');
  const undoB = btn('Undo', 'undo-2', () => undo(), 'btn-ghost'), redoB = btn('Redo', 'redo-2', () => redo(), 'btn-ghost');
  const toggles = document.createElement('div'); toggles.className = 'sced-toggles'; toggles.setAttribute('role', 'group'); toggles.setAttribute('aria-label', 'Overlays');
  for (const [key, text] of [['grid', 'Ground grid'], ['surfaces', 'Surfaces and lanes'], ['thirds', 'Thirds'], ['lines', 'Leading lines']]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'apg-filter-btn'; b.textContent = text; b.setAttribute('aria-pressed', ed.show[key] ? 'true' : 'false');
    b.onclick = () => { ed.show[key] = !ed.show[key]; b.setAttribute('aria-pressed', ed.show[key] ? 'true' : 'false'); if (key === 'lines') composition(); drawOverlay(); };
    toggles.appendChild(b);
  }
  const hint = document.createElement('span'); hint.className = 'muted sced-hint';
  hint.textContent = 'Drag a handle to move it on the ground; click the ground to add. Arrows nudge 0.25 m (Shift 1 m), Delete removes, Ctrl+Z / Ctrl+Y undo and redo, Esc deselects.';
  tools.append(undoB, redoB, toggles, hint);
  ov.setAttribute('aria-label', 'Scene placements. Arrow keys move the selected placement on the ground; Delete removes it; Ctrl+Z undoes.');

  function composition() {
    ed.comp = null;
    if (typeof sceneCompositionOf !== 'function' || !ed.C) return;
    try { ed.comp = sceneCompositionOf(ed.C, { data: ed.data }); } catch (e) { ed.comp = null; }
  }
  function paintInspector() {
    insp.replaceChildren();
    const s = ed.rec && ed.rec.scene, p = s && s.place ? s.place[ed.sel] : null;
    if (!p) { insp.innerHTML = '<p class="muted">Select a handle on the stage, or a placement in the list.</p>'; return; }
    const def = E.objDef(p.obj), cls = E.objClass(p.obj), g = E.placeGround(s, ed.cam, p);
    const v = g ? E.validAt(s, ed.cam, p.obj, g.x, g.d, { C: ed.C, fix: p.fix }) : null;
    const info = document.createElement('p'); info.className = 'muted';
    info.textContent = `${cls}${g ? ` · x ${E.r1(g.x)} m, ${E.r1(g.d)} m away` : ' · pixel placement'}${v && v.at ? ' · on ' + v.at.id + ' (' + v.at.kind + ')' : ''}${v && !v.ok && !v.exempt ? (v.snap ? ' · snaps ' + E.r1(v.snap.m) + ' m' : ' · REFUSED here') : ''}`;
    insp.appendChild(info);
    // swap: the same category, role and class
    const role = def && (def.tags || []).find(t => /^role:/.test(t));
    const same = (typeof sceneObjs === 'function' ? sceneObjs() : []).filter(d => d.category === (def ? def.category : p.obj.split('.')[0]) && (!role || (d.tags || []).includes(role)) && E.objClass(d.id) === cls).map(d => d.id).sort();
    if (!same.includes(p.obj)) same.unshift(p.obj);
    insp.appendChild(field('Object', sel(same.map(id => [id, id]), p.obj, (id) => commit({ op: 'swap', i: ed.sel, obj: id }))));
    const nv = def && def.variants > 1 ? def.variants : 1;
    if (nv > 1) insp.appendChild(field('Variant', sel([['', 'auto']].concat(Array.from({ length: nv }, (_, j) => [j, String(j)])), p.variant, (x) => commit({ op: 'set', i: ed.sel, patch: { variant: x === '' ? null : +x } }))));
    insp.appendChild(field('Size factor k', numIn(p.k, 0.3, 3, 0.05, (x) => commit({ op: 'set', i: ed.sel, patch: { k: x == null ? null : E.r2(x) } }))));
    insp.appendChild(field('Facing', sel([['', 'auto'], ['left', 'left'], ['right', 'right'], ['away', 'away'], ['toward', 'toward']], p.face, (x) => commit({ op: 'set', i: ed.sel, patch: { face: x } }))));
    insp.appendChild(field('Animation', sel([['', 'on'], ['off', 'off']], p.anim === false ? 'off' : '', (x) => commit({ op: 'set', i: ed.sel, patch: { anim: x === 'off' ? false : null } }))));
    insp.appendChild(field('Layer', sel([['', 'by depth']].concat(['horizon', 'far', 'mid', 'near', 'fore', 'front'].map(l => [l, l])), p.layer, (x) => commit({ op: 'set', i: ed.sel, patch: { layer: x } }))));
    insp.appendChild(field('Seed', numIn(p.seed, 0, 1e6, 1, (x) => commit({ op: 'set', i: ed.sel, patch: { seed: x == null ? null : Math.round(x) } }))));
    const acts = document.createElement('div'); acts.className = 'sced-row';
    acts.append(btn('Delete', 'trash-2', () => { commit({ op: 'delete', i: ed.sel }); select(-1); }, 'btn-ghost'));
    insp.appendChild(acts);
  }
  function paintList() {
    listSec.replaceChildren();
    const s = ed.rec && ed.rec.scene;
    const list = document.createElement('div'); list.className = 'sced-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Placements');
    const hs = new Map((ed.hs || handles()).map(x => [x.i, x]));
    (s && Array.isArray(s.place) ? s.place : []).forEach((p, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sced-li'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', i === ed.sel ? 'true' : 'false');
      const hd = hs.get(i), st = hd ? hd.state : 'none';
      b.innerHTML = `<span class="sced-dot is-${h(st)}" aria-hidden="true"></span><span>${h(p.obj)}</span><span class="muted">${h(st === 'none' ? '' : st)}</span>`;
      b.onclick = () => { select(i); ov.focus(); };
      list.appendChild(b);
    });
    listSec.appendChild(list);
  }
  function paintAdd() {
    addSec.replaceChildren();
    if (!ed.addAt) { addSec.innerHTML = '<p class="muted">Click the ground on the stage to add an object there.</p>'; return; }
    const s = ed.rec.scene, at = E.surfaceAt(s, ed.addAt.x, ed.addAt.d);
    const kind = at ? at.kind : 'grass';
    const info = document.createElement('p'); info.className = 'muted';
    info.textContent = `${at ? at.id + ' (' + kind + ')' : 'ground'} · x ${E.r1(ed.addAt.x)} m, ${E.r1(ed.addAt.d)} m away. Only objects that may stand here are listed.`;
    addSec.appendChild(info);
    const q = document.createElement('input'); q.type = 'search'; q.className = 'control control-sm'; q.placeholder = 'Filter objects…'; q.setAttribute('aria-label', 'Filter objects');
    const box = document.createElement('div'); box.className = 'sced-palette';
    const PREF = kind === 'water' ? ['boat', 'bird-water', 'rock'] : E.HARD.has(kind) ? ['person', 'car', 'bus', 'tram', 'cyclist', 'bike', 'street', 'animal-dog', 'bird-ground', 'tree', 'shrub']
      : ['tree', 'shrub', 'person', 'animal-graze', 'animal-dog', 'animal', 'bird-ground', 'bird-water', 'street', 'rock', 'tractor', 'building', 'structure', 'cover', 'landmark'];
    const rank = (id) => { const i = PREF.indexOf(E.objClass(id)); return i < 0 ? PREF.length : i; };
    const all = (typeof sceneObjs === 'function' ? sceneObjs() : []).filter(d => { const k = E.kindsFor(E.objClass(d.id)); return k && k.includes(kind); }).map(d => d.id)
      .sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
    const paint = () => {
      box.replaceChildren();
      const f = q.value.trim().toLowerCase(), list = all.filter(id => !f || id.includes(f));
      for (const id of list.slice(0, 80)) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sced-chip'; b.textContent = id;
        b.onclick = () => addHere(id, at);
        box.appendChild(b);
      }
      if (list.length > 80) { const m = document.createElement('span'); m.className = 'muted'; m.textContent = `${list.length - 80} more: type to filter`; box.appendChild(m); }
      if (!list.length) { const m = document.createElement('span'); m.className = 'muted'; m.textContent = 'Nothing in the library may stand on ' + kind + '.'; box.appendChild(m); }
    };
    q.oninput = paint; paint();
    addSec.append(q, box);
  }
  function addHere(id, at) {
    const s = ed.rec.scene, a = ed.addAt;
    const G = E.surfaces(s), g = at && G.byId[at.id];
    let place;
    if (g && !g.rest && !g.band) {
      const sp = E.spanAt(g, ed.cam, a.d);
      place = sp && sp[1] > sp[0] ? { obj: id, on: g.id, d: E.r1(a.d), u: E.r2(Math.max(0, Math.min(1, (a.x - sp[0]) / (sp[1] - sp[0])))) } : { obj: id, at: [E.r1(a.x), E.r1(a.d)] };
    } else place = { obj: id, at: [E.r1(a.x), E.r1(a.d)] };
    commit({ op: 'add', place });
    ed.addAt = null;
    select((ed.rec.scene.place || []).length - 1);
  }
  function paintCamera() {
    camSec.replaceChildren();
    const c = (ed.rec && ed.rec.scene.camera) || {};
    const row = document.createElement('div'); row.className = 'sced-grid2';
    const set = (k) => (v) => commit({ op: 'camera', patch: { [k]: v } });
    row.append(field('Eye (m)', numIn(c.eye, 0.3, 120, 0.05, set('eye'))), field('Field of view', numIn(c.fov, 20, 120, 1, set('fov'))), field('Horizon row', numIn(c.horizon, 120, 820, 1, set('horizon'))),
      field('Heading', numIn(c.heading, 0, 359, 1, set('heading'))), field('Centre column x0', numIn(c.x0, 300, 1300, 1, set('x0'))));
    camSec.appendChild(row);
    const setups = typeof sceneCompositionSetups === 'function' ? sceneCompositionSetups() : (typeof SCENE_CAMERA_PRESETS !== 'undefined' ? Object.values(SCENE_CAMERA_PRESETS).map(P => ({ id: P.id, label: P.label, eye: P.eye, fov: P.fov, horizon: P.horizon })) : []);
    if (setups.length) {
      const pr = document.createElement('div'); pr.className = 'sced-row sced-presets'; pr.setAttribute('role', 'group'); pr.setAttribute('aria-label', 'Camera presets');
      for (const P of setups) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'apg-filter-btn'; b.textContent = P.id; b.setAttribute('data-tip', P.label || P.id); b.setAttribute('aria-pressed', c.preset === P.id ? 'true' : 'false');
        b.onclick = () => {
          let cam = null;
          if (typeof sceneCameraPreset === 'function') { try { cam = sceneCameraPreset(P.id, { heading: c.heading, lat: c.lat, lon: c.lon, alt: c.alt, water: c.water }); } catch (e) { cam = null; } }
          const patch = cam ? { eye: cam.eye, fov: cam.fov, horizon: cam.horizon, preset: P.id } : { eye: P.eye, fov: P.fov, horizon: P.horizon, preset: P.id };
          commit({ op: 'camera', patch });
        };
        pr.appendChild(b);
      }
      camSec.appendChild(pr);
    } else { const m = document.createElement('p'); m.className = 'muted'; m.textContent = 'Camera presets appear when the presets file (70-scene-1camera.js) is loaded.'; camSec.appendChild(m); }
  }
  function paintEnv() {
    envSec.replaceChildren();
    const s = ed.rec.scene, v = s.view || {}, lat = num(v.lat, 51.5), lon = num(v.lon, -0.12);
    const day = new Date(Date.now()).toISOString().slice(0, 10);   // clock-ok: the preview day
    const st = typeof almSunTimes === 'function' ? almSunTimes(day, lat, lon) : null;
    const toMin = ms => Math.round(((ms - Date.parse(day + 'T00:00:00Z')) / 60000 + lon * 4 + 1440) % 1440);
    const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    const out = document.createElement('output'); out.className = 'muted';
    const slider = document.createElement('input'); slider.type = 'range'; slider.min = 0; slider.max = 1439; slider.step = 5; slider.className = 'sced-time';
    slider.value = ed.env.time == null ? 720 : ed.env.time; slider.setAttribute('aria-label', 'Preview time (local solar time at the scene)');
    const sun = st && st.rise != null ? ` · sunrise ${fmt(toMin(st.rise))}, sunset ${fmt(toMin(st.set))}` : '';
    const label = () => { out.textContent = (ed.env.time == null ? (ed.env.moment ? 'Moment: ' + ed.env.moment : 'The authored moment (' + (s.at || 'day') + ')') : fmt(ed.env.time) + ' local solar time, today') + sun; };
    slider.oninput = () => { ed.env.time = +slider.value; label(); };
    slider.onchange = () => { ed.env.time = +slider.value; ed.env.moment = ''; moment.value = ''; label(); applyEnvAll(); };
    label();
    const moments = typeof SCENE_MOMENTS !== 'undefined' ? SCENE_MOMENTS : ['dawn', 'morning', 'day', 'noon', 'afternoon', 'golden', 'sunset', 'dusk', 'night'];
    // a moment previews the AUTHORED moment of that name (the scene's season and place, as an author would save it)
    const moment = sel([['', 'authored (' + (s.at || 'day') + ')']].concat(moments.map(m => [m, m])), ed.env.moment, (m) => {
      ed.env.time = null; ed.env.moment = m || ''; label(); applyEnvAll();
    });
    const saveAt = btn('Save as authored', '', () => { if (ed.env.moment) commit({ op: 'env', key: 'at', value: ed.env.moment }); }, 'btn-ghost');
    const wxOk = typeof sceneHostSet === 'function';
    const wx = sel([['', 'as authored (' + (typeof s.weather === 'string' ? s.weather : s.weather ? s.weather.kind : 'live') + ')'], ['clear', 'clear'], ['rain', 'rain'], ['snow', 'snow'], ['fog', 'fog'], ['frost', 'frost']], ed.env.wx, (x) => { const restageToo = !E.v2Engine() && !!x !== !!ed.env.wx; ed.env.wx = x; if (restageToo) restage(); else applyEnvAll(); });
    wx.disabled = !wxOk;
    const saveWx = btn('Save as authored', '', () => { if (ed.env.wx) commit({ op: 'env', key: 'weather', value: { kind: ed.env.wx } }); }, 'btn-ghost');
    saveWx.disabled = !wxOk;
    const season = sel([['', 'as authored (' + (s.season || 'auto') + ')'], ['spring', 'spring'], ['summer', 'summer'], ['autumn', 'autumn'], ['winter', 'winter']], ed.env.season, (x) => { ed.env.season = x; restage(); });
    const saveSeason = btn('Save as authored', '', () => { if (ed.env.season) commit({ op: 'env', key: 'season', value: ed.env.season }); }, 'btn-ghost');
    envSec.append(field('Time', slider), out, (() => { const r = document.createElement('div'); r.className = 'sced-row'; r.append(field('Moment', moment), saveAt); return r; })(),
      (() => { const r = document.createElement('div'); r.className = 'sced-row'; r.append(field('Weather', wx), saveWx); return r; })(),
      (() => { const r = document.createElement('div'); r.className = 'sced-row'; r.append(field('Season', season), saveSeason); return r; })());
    if (!wxOk) { const m = document.createElement('p'); m.className = 'muted'; m.textContent = 'The weather preview needs the v2 host (sceneHostSet); time and season preview now.'; envSec.appendChild(m); }
    const note = document.createElement('p'); note.className = 'muted'; note.textContent = 'Previews only: nothing here is saved unless you press Save as authored, then Save.'; envSec.appendChild(note);
  }
  const lintB = btn('Lint', '', () => lint(), 'btn-secondary'), lintOut = document.createElement('div');
  lintOut.className = 'sced-lint';
  function paintProblems() {
    probSec.replaceChildren();
    const rows = [];
    for (const p of ed.server || []) rows.push({ sev: 'error', text: (p.code ? p.code + ': ' : '') + (p.msg || p.message || ''), i: null });
    const C = ed.C;
    if (C && C.v === 2 && Array.isArray(C.problems)) for (const p of C.problems) rows.push({ sev: p.sev || 'warn', text: (p.rule ? p.rule + ': ' : '') + (p.msg || '') + (p.fix ? ' (' + p.fix + ')' : ''), i: Number.isInteger(p.i) && (typeof p.msg !== 'string' || /^place\[/.test(p.msg)) ? p.i : null });
    else for (const hd of ed.hs || []) {
      if (hd.state === 'refused') rows.push({ sev: 'error', text: `refused: ${hd.p.obj} on ${hd.v.at ? hd.v.at.kind : 'nothing'} (a ${hd.cls} needs ${(hd.v.kinds || []).slice(0, 5).join(', ')})`, i: hd.i });
      else if (hd.state === 'snapped') rows.push({ sev: 'warn', text: `snapped: ${hd.p.obj} moves ${E.r1(hd.v.snap.m)} m onto ${(E.surfaceAt(ed.rec.scene, hd.v.snap.x, hd.v.snap.d) || {}).kind || 'an allowed surface'}`, i: hd.i });
      else if (hd.state === 'warn') rows.push({ sev: 'warn', text: `pixel placement ${hd.p.obj} stands on ${hd.v.at ? hd.v.at.kind : 'nothing'}: drag it to convert it to a ground placement`, i: hd.i });
    }
    if (ed.lint && Array.isArray(ed.lint.rules)) for (const r of ed.lint.rules) if (!r.ok || r.warn) rows.push({ sev: r.ok ? 'warn' : 'error', text: `${r.group ? r.group + '/' : ''}${r.rule}: ${r.message || r.warn || ''}`, i: Number.isInteger(r.i) ? r.i : null });
    const head = document.createElement('div'); head.className = 'sced-row';
    const n = document.createElement('span'); n.className = 'muted'; n.textContent = rows.length ? `${rows.length} problem${rows.length === 1 ? '' : 's'}` : (ed.lint ? (ed.lint.pass ? 'Lint passes.' : 'No problems listed.') : 'No placement problems.');
    head.append(n, lintB);
    probSec.appendChild(head);
    const list = document.createElement('ul'); list.className = 'sced-probs';
    for (const r of rows.slice(0, 120)) {
      const li = document.createElement('li'); li.className = 'is-' + (r.sev === 'error' ? 'error' : r.sev === 'info' ? 'info' : 'warn');
      if (r.i != null) { const b = document.createElement('button'); b.type = 'button'; b.className = 'sced-link'; b.textContent = r.text; b.onclick = () => { select(r.i); ov.focus(); }; li.appendChild(b); }
      else li.textContent = r.text;
      list.appendChild(li);
    }
    probSec.appendChild(list);
  }
  function paintCredits() {
    credits.textContent = '';
    if (typeof sceneCredits !== 'function') return;
    try { credits.textContent = (sceneCredits(ed.rec) || []).join(' · '); } catch (e) { /* none */ }
  }
  function paintAll() { paintSummary(); paintInspector(); paintList(); paintAdd(); paintCamera(); paintEnv(); paintProblems(); paintCredits(); }

  if (!(await load())) return api;
  ed.cam = E.camera(ed.rec.scene);
  if (typeof ResizeObserver === 'function') { ed.ro = new ResizeObserver(() => sizeOverlay()); ed.ro.observe(stage); }
  sizeOverlay();
  restage();
  composition();
  paintAll();
  ov.focus();
  return api;
}

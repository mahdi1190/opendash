// World engine: life (docs/dev/WORLD_ENGINE.md 3.3, 4, 11; requirements A1-A11, Y4, M6, T1, C2). Pure (Node + browser).
//
// Populations, not paths: a scene says who lives there and the engine spawns, routes, animates the intent of and removes
// every mover. Movement goes ONLY through the navigation module (worldStep / worldFlowField / worldPath / worldNavOk), so a
// mover can never stand on a forbidden cell (walls, hedges, boats, banks, the near band). Floaters and waders have no y of
// their own: y is the water level of their region. Facing comes from world velocity with hysteresis; a still mover keeps its
// heading or turns to its point of interest; heading turns at a class-limited rate (no instant turns).
//
//  - Spawn and despawn only at spawn cells (frame sides just outside the widest frame, the first row beyond the near band,
//    the far end, behind cover, doors) and at stops; a mover appearing on a visible cell fades in (`born`, `alpha`).
//  - Edge and surface goals follow cached flow fields; ad-hoc goals use a short A*; a failed route backs off 2-8 s and
//    then takes another goal (never a search every tick). A stuck mover re-plans, then leaves by the nearest spawn cell.
//  - Goal verbs: go, do, wander, follow, meet, leave, sit (bench capacity, queue), wait then board, enter, fish, feed, view.
//  - Groups move as units (couples, families, friends, a dog within its lead's length; the lead is attached through
//    worldAttach when the systems runtime is loaded). Water birds swim in loose groups, dabble and preen; herons stalk the
//    margins, freeze and strike; perchers use perch points from the knowledge base and fly round building and tree volumes.
//  - Vehicles, trains, trams and boats under way come from 79-world-2traffic.js (lanes on the left, gaps, stops, timetables).
//  - Reactions through an event bus: ducks paddle from a dog at the bank, pigeons lift and settle, passengers board and
//    alight, a heron freezes then strikes, a cyclist rings and passes.
//  - Every agent draws from its own random stream (worldRng(world, 'life', id) when the systems runtime is loaded), ids are
//    stable (population index + ordinal), so adding one agent never reshuffles the others.
//
// Interface (kept for the host and the tools):
//   worldLifeInit(world, nav, t0, opts?) -> Life   (opts: { warm, warmSecs, max, ctx, ms, step }; warm-up 90 s at 0.25 s)
//   worldLifeTick(life, dt)                          (fixed sub-steps, positions interpolated)
//   worldLifeStep(life, dt)                          (one fixed step = the brain, nav and move passes)
//   worldAgents(life) -> [AgentRecord]               { id, cls, who, obj, variant, x, y, z, vx, vz, heading, facing, speed,
//                                                      state, pose, age, h, layer, level, host, group, lookAt, view, mirror,
//                                                      born, leaving, alpha, clip, phase, kind, lead }  (heading in radians,
//                                                      atan2(dx, dz); facing the same in degrees: 0 = away from the camera,
//                                                      90 = right, like entity facings; alpha < 1 while fading in or out)
//   worldLifeOk(life, layer, x, z) -> bool;  worldLifeIsSpawn(life, layer, x, z) -> bool;  worldLifeLeads(life) -> leads
//   worldLifeOf(world) -> the Life the systems runtime drives for a world (or null)
// Life also keeps `events` ([{ t, kind, id, x, z, layer }], capped), `problems` ([{ pop, rule, msg }]) and `bus`.

var WORLD_LIFE_STEP = 1 / 15;
var WORLD_LIFE_WARM = { step: 0.25, secs: 90 };
var WORLD_VIEWS = ['back', 'q-back', 'side', 'q-front', 'front'];
/** Personal space by setting (Y4), metres between people. */
var WORLD_LIFE_SPACE = { rural: 1.2, town: 0.9, city: 0.6 };
/** A11 fallbacks when the knowledge base gives no outfit or breed: outfit palettes (an index the appearance package maps to
 *  colours) and dog breeds (size and coat families). */
var WORLD_LIFE_OUTFITS = 12;
var WORLD_LIFE_BREEDS = ['labrador', 'spaniel', 'collie', 'terrier', 'whippet', 'retriever', 'dachshund', 'shepherd'];

/* ---------- random streams (G4) ---------- */
function worldLifeRng(seed) {
  var s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function _wlfHash(str) { var h = 2166136261 >>> 0, s = String(str); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
/** Does the systems runtime give fresh, deterministic streams (the same key twice -> the same sequence)? */
function _wlfSysRngOk(world) {
  if (typeof worldRng !== 'function') return false;
  try {
    var F = { fresh: true }, a = worldRng(world, 'life', '~probe', F), b = worldRng(world, 'life', '~probe', F), c = worldRng(world, 'life', '~probe2', F);
    var fa = typeof a === 'function' ? a : a && a.next ? function () { return a.next(); } : null;
    var fb = typeof b === 'function' ? b : b && b.next ? function () { return b.next(); } : null;
    var fc = typeof c === 'function' ? c : c && c.next ? function () { return c.next(); } : null;
    if (!fa || !fb || !fc) return false;
    var x = fa(), y = fb(), z = fc();
    return typeof x === 'number' && x >= 0 && x < 1 && x === y && x !== z;
  } catch (e) { return false; }
}
function _wlfStream(life, key) {
  var k = life.t0key + ':' + key;
  if (life.sysRng) {
    try { var r = worldRng(life.world, 'life', k, { fresh: true }); if (typeof r === 'function') return r; if (r && typeof r.next === 'function') return function () { return r.next(); }; } catch (e) { /* own stream */ }
  }
  return worldLifeRng(_wlfHash((life.seed >>> 0) + '|life|' + k));
}
function worldLifeRange(rng, v) { if (Array.isArray(v)) return v[0] + (v[1] - v[0]) * rng(); return +v || 0; }
function worldLifePick(rng, weights) {
  var k, tot = 0;
  for (k in weights) tot += weights[k];
  var r = rng() * tot, last = null;
  for (k in weights) { last = k; r -= weights[k]; if (r <= 0) return k; }
  return last;
}
// '6/min' -> 0.1 per s; '1/3min' -> 1/180; '6min' (every) -> 1/360
function worldLifeRate(s) {
  if (typeof s === 'number') return s;
  var m = /^\s*([\d.]+)\s*\/\s*([\d.]*)\s*(s|sec|min|h)\s*$/.exec(s || '');
  var unit = { s: 1, sec: 1, min: 60, h: 3600 };
  if (m) return +m[1] / ((+m[2] || 1) * unit[m[3]]);
  m = /^\s*([\d.]+)\s*(s|sec|min|h)\s*$/.exec(s || '');
  if (m) return 1 / (+m[1] * unit[m[2]]);
  return 0;
}
/** A load problem, once per population and rule. */
function _wlfProblem(life, p) {
  for (var i = 0; i < life.problems.length; i++) { var q = life.problems[i]; if (q.pop === p.pop && q.rule === p.rule) return; }
  if (life.problems.length < 200) life.problems.push(p);
}
function _wlfClamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function _wlfAng(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

/* ---------- the knowledge base and the core, through typeof guards ---------- */
function _wlfKb(id) { if (typeof worldKb !== 'function' || !id) return null; try { return worldKb(id) || null; } catch (e) { return null; } }
function _wlfInfo(id) { if (typeof worldObjectInfo !== 'function' || !id) return null; try { return worldObjectInfo(id) || null; } catch (e) { return null; } }
function _wlfObjOk(id) { if (!id) return false; if (typeof sceneObj !== 'function') return true; try { return !!sceneObj(id); } catch (e) { return false; } }
/** The setting of a place for densities and personal space: 'city' | 'town' | 'rural'. */
function _wlfPlaceType(world) {
  var p = (world && world.place) || {}, b = (world && world.backdrop) || {};
  var s = String(p.type || p.setting || p.style || b.style || '');
  if (/city|urban|centre|center/.test(s)) return 'city';
  if (/town|village|suburb/.test(s)) return 'town';
  return 'rural';
}
/** A1: how many of a population are out now (worldKbDensity; 1 without the knowledge base or a time context). */
function _wlfDensity(life, who) {
  if (typeof worldKbDensity !== 'function' || !life.ctx) return 1;
  try {
    var d = worldKbDensity(who, life.ctx, life.placeType);
    if (d && typeof d === 'object') d = Number.isFinite(d.density) ? d.density : Number.isFinite(d.share) ? d.share : 1;
    return Number.isFinite(d) ? _wlfClamp(d, 0, 4) : 1;
  } catch (e) { return 1; }
}

/* ---------- who ---------- */
/** A scene `who` (a population name, a brain class or an object id) -> { cls, obj, mix?, road? } or null. */
function worldLifeWhoOf(who) {
  if (who == null) return null;
  if (Object.prototype.hasOwnProperty.call(worldLifeWho, who)) return worldLifeWho[who];
  if (Object.prototype.hasOwnProperty.call(worldBrains, who)) return { cls: who, obj: _wlfDefaultObj(who) };
  // an object id: the population that draws it, else the class of its descriptor
  for (var k in worldLifeWho) { var m = worldLifeWho[k]; if (m && m.obj === who && m.cls) return { cls: m.cls, obj: who, road: m.road }; }
  var kb = _wlfKb(who), info = _wlfInfo(who), c = (kb && kb.cls) || (info && info.cls);
  if (!c) return null;
  var b = WORLD_BRAIN_OF_CLASS[c];
  if ((c === 'vehicle' || c === 'car') && info && info.size && info.size.h > 3) b = 'bus';
  return b ? { cls: b, obj: who, road: b === 'cyclist' ? 'cyclist-road' : undefined } : null;
}
function _wlfDefaultObj(cls) { for (var k in worldLifeWho) { var m = worldLifeWho[k]; if (m && m.cls === cls && m.obj) return m.obj; } return cls; }

/* ---------- nav adapters ---------- */
function worldLifeGrid(life, layer) {
  if (layer in life.grids) return life.grids[layer];
  var g = null;
  if (layer !== 'air' && typeof worldNavLayer === 'function') g = worldNavLayer(life.nav, layer) || null;
  life.grids[layer] = g;
  return g;
}
function worldLifeOk(life, layer, x, z, r) {
  if (layer === 'air') return true;
  if (typeof worldNavOk !== 'function') return false;
  return worldNavOk(life.nav, layer, x, z, r);
}
/**
 * The radius a mover is held to by the navigation: the one its routes are planned for. A dog (0.30 m) and a person were planned for the
 * layer's 0.25 m (the flow fields are shared by every body up to 0.05 m over it) but stepped and tested at their own radius, so a cell
 * a route runs through (clear 0.25 to 0.3) was one the body could not step into: a dog stood pressed against a lifebuoy, going
 * nowhere, on a route that ran through it. A hull keeps its own.
 */
function _wlfNavR(a) {
  if (a.kind === 'boat') return a.r;
  if (a._nrL !== a.layer || a._nrR !== a.r) {
    var d = (typeof WORLD_NAV_RADIUS !== 'undefined' && WORLD_NAV_RADIUS[String(a.layer).split('@')[0]]) || 0.25;
    a._nrL = a.layer; a._nrR = a.r; a._nr = a.r <= d + 0.05 ? d : a.r;
  }
  return a._nr;
}
function _wlfOk(life, a, x, z) { return a.layer === 'air' || (typeof worldNavOk === 'function' && worldNavOk(life.nav, a.layer, x, z, _wlfNavR(a)) && _wlfHullOk(life, a, x, z)); }
/**
 * A long hull (a boat under way) keeps its WHOLE length beyond the layer's near band: the nav map holds its centre, so its near
 * end would otherwise come up to the lens as a giant hull cut by the frame's bottom edge (A10, C2). Spawn cells and goal edges
 * nearer than that are not used by hulls either.
 */
function _wlfHullNear(life, layer, len) {
  if (!(len > 4)) return null;
  var L = typeof worldNavLayer === 'function' ? worldNavLayer(life.nav, layer) : null;
  return L && Number.isFinite(L.nearZ) ? L.nearZ + len / 2 + 0.5 : null;
}
function _wlfHullOk(life, a, x, z) {
  if (a.kind !== 'boat') return true;
  var nz = _wlfHullNear(life, a.layer, a.len);
  if (nz == null) return true;
  // the near end along the heading: only the depth matters for the cut
  var halfZ = Math.abs(Math.cos(a.heading || 0)) * a.len / 2, nz0 = nz - a.len / 2 - 0.5;
  if (!(z - halfZ >= nz0 || z >= a.z)) return false;   // never further into the band (a boat already there may still leave it)
  // the whole keel stays on the water clear of solids too (a moored boat, a bank): the nav map holds only the centre
  // a hull already touching may move only to touch less (it is getting clear), never further in
  return _wlfKeelBad(life, a, x, z, a.heading) <= _wlfKeelBad(life, a, a.x, a.z, a.heading);
}
/** How many points of a hull's keel are not clear at (x, z) and heading h: points every ~1.5 m bow to stern, with the half-beam. */
function _wlfKeelBad(life, a, x, z, h) {
  if (a.kind !== 'boat' || !(a.len > 4) || typeof worldNavOk !== 'function') return 0;
  var n = Math.max(2, Math.ceil(a.len * 0.9 / 1.5)), ux = Math.sin(h || 0), uz = Math.cos(h || 0), bad = 0;
  for (var k = 0; k <= n; k++) {
    var t = (k / n - 0.5) * a.len * 0.9;
    if (Math.abs(t) < 0.5) continue;
    if (!worldNavOk(life.nav, a.layer, x + ux * t, z + uz * t, a.r * 0.85)) bad++;   // the hull narrows to bow and stern
  }
  return bad;
}
function _wlfKeelOk(life, a, x, z, h) { return _wlfKeelBad(life, a, x, z, h) === 0; }
function _wlfHullCells(life, layer, cells, len) {
  var nz = _wlfHullNear(life, layer, len);
  return nz == null ? cells : cells.filter(function (c) { return c.z >= nz; });
}
function worldLifeXZ(p) { if (!p) return null; if (Array.isArray(p)) return [p[0], p[1]]; return [p.x, p.z]; }
function _wlfFlowR(a) {
  var d = (typeof WORLD_NAV_RADIUS !== 'undefined' && WORLD_NAV_RADIUS[String(a.layer).split('@')[0]]) || 0.25;
  var r = a.r <= d + 0.05 ? d : Math.ceil(a.r * 10) / 10;
  // a long hull (a narrowboat is 18 m for 2 m of beam) swings wide at a bend: its route is planned for a wider body than its
  // beam (tier 0, then 1, then its beam alone when the channel is too tight), so the hull is not wedged against a bank where
  // the cut turns
  if (a.kind === 'boat' && a.len > 8) { var tier = a.rTier || 0; if (tier < 2) r = Math.max(r, Math.min(tier ? 2 : 3.2, Math.ceil(a.len * (tier ? 1 : 1.6)) / 10)); }
  return r;
}
/** The water level / deck / ground height under an agent on its layer. */
function worldLifeY(life, a) {
  if (a.layer === 'air') return a.alt;
  if (typeof worldNavY === 'function') return worldNavY(life.nav, a.layer, a.x, a.z);
  if (a.layer === 'swim' || a.layer === 'wade') return worldLifeWaterY(life);
  return 0;
}
function worldLifeWaterY(life) {
  var w = life.world || {};
  if (typeof w.waterY === 'number') return w.waterY;
  if (w.cam && typeof w.cam.water === 'number') return w.cam.water;
  return 0;
}
/** Main components of a layer: those that hold a spawn cell (else the largest), so nothing is put where it cannot leave. */
function _wlfReach(life, layer, r) {
  var key = layer + '|' + r;
  if (life.reach[key] !== undefined) return life.reach[key];
  var res = null, C = typeof worldNavComponents === 'function' ? worldNavComponents(life.nav, layer, r) : null;
  if (C && C.sizes.length) {
    var keep = new Uint8Array(C.sizes.length), any = false;
    var sp = typeof worldSpawnCells === 'function' ? worldSpawnCells(life.nav, layer, r) : [];
    for (var i = 0; i < sp.length; i++) { var c = C.comp[sp[i].i]; if (c >= 0) { keep[c] = 1; any = true; } }
    if (!any) { var best = 0; for (var k = 1; k < C.sizes.length; k++) if (C.sizes[k] > C.sizes[best]) best = k; keep[best] = 1; }
    res = { comp: C.comp, keep: keep };
  }
  life.reach[key] = res;
  return res;
}
function _wlfReachable(life, layer, r, k) { var R = _wlfReach(life, layer, r); return !R || (k >= 0 && R.comp[k] >= 0 && R.keep[R.comp[k]] === 1); }
/** Spawn cells of a layer for a radius, on a surface (if any), at the given edges (aliases and fallbacks), reachable. */
function _wlfSpawnCells(life, layer, r, on, edges) {
  var key = layer + '|' + r + '|' + (on || '') + '|' + (edges ? edges.join(',') : '*');
  if (life.spawnc[key]) return life.spawnc[key];
  var raw = typeof worldSpawnCells === 'function' ? worldSpawnCells(life.nav, layer, r) || [] : [];
  var all = [];
  for (var i = 0; i < raw.length; i++) if (_wlfReachable(life, layer, r, raw[i].i)) all.push(raw[i]);
  var onS = on ? all.filter(function (c) { return _wlfSurfAt(life, layer, c.x, c.z) === on; }) : all;
  if (!onS.length) onS = all;
  var out = onS;
  if (edges && edges.length) {
    var want = {}, E = edges.map(_wlfEdge);
    E.forEach(function (e) { want[e] = 1; });
    out = onS.filter(function (c) { return want[c.edge] || want.any; });
    // the near end of a surface that leaves the frame at a side: its nearest side cells stand for 'S' (and the furthest for 'N')
    var side = onS.filter(function (c) { return c.edge === 'W' || c.edge === 'E'; });
    if (want.S && !out.some(function (c) { return c.edge === 'S'; }) && side.length) {
      var zmin = Math.min.apply(null, side.map(function (c) { return c.z; }));
      out = out.concat(side.filter(function (c) { return c.z <= zmin + 10 && out.indexOf(c) < 0; }));
    }
    if (want.N && !out.some(function (c) { return c.edge === 'N'; }) && side.length) {
      var zmax = Math.max.apply(null, side.map(function (c) { return c.z; }));
      out = out.concat(side.filter(function (c) { return c.z >= zmax - 10 && out.indexOf(c) < 0; }));
    }
    if (!out.length) out = onS;
  }
  life.spawnc[key] = out;
  return out;
}
function _wlfEdge(e) { return ({ far: 'N', near: 'S', right: 'E', left: 'W' })[e] || e; }
function _wlfSurfAt(life, layer, x, z) { return typeof worldNavSurfaceId === 'function' ? worldNavSurfaceId(life.nav, layer, x, z) : null; }
/** Is (x, z) a spawn point of a layer (a nav spawn cell, a stop, a lane or line end, a door)? */
function worldLifeIsSpawn(life, layer, x, z) {
  var g = worldLifeGrid(life, layer), tol = g && g.cell ? Math.max(0.8, g.cell * 1.6) : 1.5;
  if (layer === 'drive' || layer === 'rail') tol = Math.max(tol, 3);                 // vehicles move metres between two looks
  if (g && g.far && z >= g.seam) tol = g.far.cell * 1.6;
  var raw = typeof worldSpawnCells === 'function' && layer !== 'air' ? worldSpawnCells(life.nav, layer) || [] : [];
  for (var i = 0; i < raw.length; i++) if (Math.abs(raw[i].x - x) <= tol && Math.abs(raw[i].z - z) <= tol) return true;
  var ex = life.extraSpawns[layer] || [];
  for (var j = 0; j < ex.length; j++) if (Math.abs(ex[j][0] - x) <= tol && Math.abs(ex[j][1] - z) <= tol) return true;
  return false;
}
function _wlfAddSpawnPoint(life, layer, x, z) {
  var ex = life.extraSpawns[layer] || (life.extraSpawns[layer] = []);
  for (var i = 0; i < ex.length; i++) if (Math.abs(ex[i][0] - x) < 0.5 && Math.abs(ex[i][1] - z) < 0.5) return;
  if (ex.length < 4000) ex.push([x, z]);
}
/** Open, reachable cells of a layer (flat [x, z, ...]), optionally on one surface; residents and wander targets keep out of
 *  the edge zones (the near row and the frame sides: C2) and prefer what the camera sees. */
function _wlfCells(life, layer, r, on) {
  var key = layer + '|' + r + '|' + (on || '');
  if (life.cells[key]) return life.cells[key];
  var L = worldLifeGrid(life, layer), out = [], vis = [];
  if (L && L.data && typeof worldNavCellXZ === 'function') {
    var R = _wlfReach(life, layer, r), cam = life.nav.cam;
    for (var k = 0; k < L.N; k++) {
      if (!L.data[k] || L.clear[k] < r) continue;
      if (R && !(R.comp[k] >= 0 && R.keep[R.comp[k]])) continue;
      var p = worldNavCellXZ(life.nav, layer, k), x = p[0], z = p[1];
      if (z < L.nearZ + 1.5) continue;
      if (on && _wlfSurfAt(life, layer, x, z) !== on) continue;
      var lim0 = z * cam.tanL0, lim1 = z * cam.tanR0;
      if (x < -lim0 - 3 || x > lim1 + 3) continue;                                      // well off the frame sides: never a resident
      if (Math.abs(x + lim0) < 1.2 || Math.abs(x - lim1) < 1.2) continue;              // a half body at the frame edge (C2)
      out.push(x, z);
      if (x > -lim0 + 1 && x < lim1 - 1) vis.push(x, z);
    }
  }
  var res = vis.length >= 8 ? vis : out;
  life.cells[key] = res;
  return res;
}
/** Is this mover, or anyone of its group, in an edge zone? (a group stops only where all of it may stand) */
function _wlfGroupEdge(life, a) {
  if (_wlfInEdgeZone(life, a)) return true;
  if (a.members) for (var i = 0; i < a.members.length; i++) { var m = a.members[i]; if (!m.dead && !m.lead && _wlfInEdgeZone(life, m)) return true; }
  return false;
}
function _wlfInEdgeZone(life, a) {
  if (a.layer === 'air') return false;
  var L = worldLifeGrid(life, a.layer), cam = life.nav.cam; if (!L || !L.data) return false;
  if (a.z < L.nearZ + 1.2) return true;
  var lim0 = a.z * cam.tanL0, lim1 = a.z * cam.tanR0, l2 = a.z * cam.tanL, r2 = a.z * cam.tanR;
  return Math.abs(a.x + lim0) < 1.0 || Math.abs(a.x - lim1) < 1.0 || Math.abs(a.x + l2) < 1.0 || Math.abs(a.x - r2) < 1.0;
}

/* ---------- the event bus (G5): a local bus, forwarded to the world's when the systems runtime has one ---------- */
function _wlfMakeBus(life) {
  var subs = {}, wb = null;
  try { if (typeof worldBus === 'function') wb = worldBus(life.world); else if (life.world && life.world.bus && typeof life.world.bus.emit === 'function') wb = life.world.bus; } catch (e) { wb = null; }
  return {
    on: function (kind, fn) { (subs[kind] || (subs[kind] = [])).push(fn); },
    emit: function (kind, data) {
      var list = subs[kind]; if (list) for (var i = 0; i < list.length; i++) { try { list[i](data); } catch (e) { /* a bad handler never stops the sim */ } }
      if (wb && typeof wb.emit === 'function') { try { wb.emit(kind, data); } catch (e) { /* ignore */ } }
      if (life.evlog.length < 4000) life.evlog.push({ t: life.t, kind: kind, id: data && data.id, x: data && data.x, z: data && data.z });
    },
  };
}

/* ---------- init ---------- */
function worldLifeInit(world, nav, t0, opts) {
  opts = opts || {};
  var seed = ((world && world.seed) | 0);
  var life = {
    world: world, nav: nav, t: 0, t0: Math.floor(t0 || 0), t0key: String(Math.floor(t0 || 0)), seed: seed, grids: {}, spawnc: {}, cells: {}, reach: {},
    agents: [], byId: new Map(), pops: [], acc: 0, alpha: 1, events: [], evlog: [], problems: [], hash: new Map(), extraSpawns: {},
    max: opts.max || 60, step: opts.step || WORLD_LIFE_STEP, seats: new Map(), stops: new Map(), perchTaken: new Map(), leads: [],
    ctx: opts.ctx || (world && (world.time || world.ctx || world.timeCtx)) || null, placeType: _wlfPlaceType(world), flowc: new Map(),
  };
  if (!life.ctx && typeof worldTimeCtx === 'function' && Number.isFinite(opts.ms)) { try { life.ctx = worldTimeCtx(world, opts.ms); } catch (e) { life.ctx = null; } }
  life.space = WORLD_LIFE_SPACE[life.placeType] || 1;
  life.sysRng = _wlfSysRngOk(world);
  life.rng = _wlfStream(life, 'life');
  life.bus = _wlfMakeBus(life);
  life.traffic = null;
  if (typeof worldTraffic === 'function' && nav) { try { life.traffic = worldTraffic(world, nav); } catch (e) { life.traffic = null; _wlfProblem(life, { pop: -1, rule: 'traffic', msg: String(e && e.message || e) }); } }
  _wlfBusHandlers(life);
  if (world && typeof world === 'object' && !world._wlfLife) { world.sim = life; world.agents = life.agents; }
  var pops = (world && world.life) || [];
  for (var p = 0; p < pops.length; p++) {
    try { _wlfPopInit(life, pops[p], p); } catch (e) { _wlfProblem(life, { pop: p, rule: 'error', msg: String(e && e.message || e) }); }
  }
  if (opts.warm !== false) {
    var w = opts.warmSecs != null ? opts.warmSecs : WORLD_LIFE_WARM.secs;
    for (var s = 0; s < w; s += WORLD_LIFE_WARM.step) worldLifeStep(life, WORLD_LIFE_WARM.step);
  }
  life.events.length = 0;
  for (var k = 0; k < life.agents.length; k++) { var a = life.agents[k]; a.px = a.x; a.pz = a.z; }
  return life;
}
/** A new time context (weather, hour): rate populations re-read their density (A1); residents and traffic stay as they are. */
function worldLifeRetime(life, ctx) {
  if (!life) return;
  if (ctx) life.ctx = ctx;
  for (var i = 0; i < life.pops.length; i++) {
    var pop = life.pops[i]; if (!pop.spec.rate) continue;
    pop.dens = _wlfDensity(life, pop.spec.who);
    pop.rate = worldLifeRate(pop.spec.rate) * pop.dens;
  }
}
/** The scene clock (s) the timetables run on. */
function _wlfClock(life) { return life.t0 + life.t; }

function _wlfPopInit(life, spec, idx) {
  var whoDef = worldLifeWhoOf(spec.who);
  var pop = { spec: spec, idx: idx, rng: _wlfStream(life, 'pop' + idx), ord: 0, acc: 0, rate: 0, every: 0, period: 0, offset: 0, k: null, entries: [], on: spec.on || null,
    edges: Array.isArray(spec.edges) && spec.edges.length ? spec.edges.map(_wlfEdge) : null, dens: 1, recent: [] };
  // the mix: authored, else the population's own default, else the population itself
  var mix = spec.mix || (whoDef && whoDef.mix) || null;
  if (!mix) { if (!whoDef) { _wlfProblem(life, { pop: idx, rule: 'unknownWho', msg: 'unknown life who: ' + spec.who }); return; } mix = {}; mix[spec.who] = 1; }
  var onSurf = spec.on ? ((life.world.surfaces || []).find(function (s) { return s.id === spec.on; }) || null) : null;
  var roadish = (onSurf && onSurf.kind === 'road') || (!onSurf && whoDef && whoDef.road && _wlfPopLayer(spec.who) === 'drive');
  for (var key in mix) {
    var m = worldLifeWhoOf(key);
    if (!m || m.mix) { var mm = m && m.mix; if (mm) { for (var k2 in mm) pop.entries.push({ key: k2, w: mix[key] * mm[k2], m: worldLifeWhoOf(k2) }); continue; } _wlfProblem(life, { pop: idx, rule: 'unknownWho', msg: 'unknown life who: ' + key + ' (dropped from the mix)' }); continue; }
    var cls = m.cls;
    if (roadish && m.road) cls = m.road;
    else if (whoDef && whoDef.cls && worldBrains[whoDef.cls] && (worldBrains[whoDef.cls].kind === 'rail' || worldBrains[whoDef.cls].kind === 'lane') && worldBrains[m.cls] && worldBrains[m.cls].kind !== worldBrains[whoDef.cls].kind) cls = whoDef.cls;
    if (!worldBrains[cls]) { _wlfProblem(life, { pop: idx, rule: 'unknownWho', msg: 'no brain for ' + key }); continue; }
    pop.entries.push({ key: key, w: +mix[key] || 0, m: { cls: cls, obj: m.obj || _wlfDefaultObj(cls) } });
  }
  pop.entries = pop.entries.filter(function (e) { return e.m && e.w > 0 && worldBrains[e.m.cls]; });
  if (!pop.entries.length) { _wlfProblem(life, { pop: idx, rule: 'unknownWho', msg: 'nothing to spawn for ' + spec.who }); return; }
  pop.mix = {}; pop.entries.forEach(function (e, i) { pop.mix[i] = e.w; });
  // every entry needs its layer (and a spawn cell when it arrives over time)
  var kinds = {};
  pop.entries = pop.entries.filter(function (e) {
    var b = worldBrains[e.m.cls];
    kinds[b.kind] = 1;
    if (b.kind === 'lane') { if (!life.traffic || !life.traffic.lanes.length) { _wlfProblem(life, { pop: idx, rule: 'noLane', msg: 'no road lane for ' + e.key }); return false; } return true; }
    if (b.kind === 'rail') { if (!life.traffic || !life.traffic.tracks.length) { _wlfProblem(life, { pop: idx, rule: 'noTrack', msg: 'no rail or tram line for ' + e.key }); return false; } return true; }
    if (b.layer === 'air') return true;
    var L = worldLifeGrid(life, b.layer);
    if (!L || !L.data) { _wlfProblem(life, { pop: idx, rule: 'noSpawn', msg: 'no ' + b.layer + ' layer for ' + e.key }); return false; }
    if ((spec.rate || spec.every) && !_wlfSpawnCells(life, b.layer, _wlfFlowR({ layer: b.layer, r: b.r }), null, null).length) { _wlfProblem(life, { pop: idx, rule: 'noSpawn', msg: 'no spawn cell on layer ' + b.layer + ' for ' + e.key }); return false; }
    return true;
  });
  if (!pop.entries.length) return;
  pop.mix = {}; pop.entries.forEach(function (e, i) { pop.mix[i] = e.w; });
  pop.dens = _wlfDensity(life, spec.who);
  if (spec.rate) { pop.rate = worldLifeRate(spec.rate) * pop.dens; pop.acc = pop.rng(); }
  if (spec.every) {
    // T1: a schedule's period divides the loop
    pop.every = 1 / Math.max(1e-6, worldLifeRate(spec.every));
    pop.period = typeof worldLoopPeriod === 'function' ? worldLoopPeriod(pop.every, false) : pop.every;
    pop.offset = Math.floor(pop.rng() * pop.period * 100) / 100;
    pop.k = Math.floor((_wlfClock(life) - pop.offset) / pop.period);
    // rail: a timetable entry per rail entry of the mix
    for (var i = 0; i < pop.entries.length; i++) {
      var e = pop.entries[i], b = worldBrains[e.m.cls];
      if (b.kind !== 'rail' || !life.traffic) continue;
      var info = _wlfInfo(e.m.obj), len = info && info.size ? Math.max(8, info.size.w) : null;
      e.tt = worldTrafficSchedule(life.traffic, { id: 'p' + idx + '-' + i, cls: e.m.cls === 'tram' ? 'tram' : 'train', obj: e.m.obj, every: pop.every / Math.max(1e-6, e.w / _wlfMixTotal(pop)),
        line: onSurf && (onSurf.kind === 'rail' || onSurf.kind === 'tram') ? onSurf.id : null, v: worldLifeRange(pop.rng, b.speed), a: b.accel, dwell: worldLifeRange(pop.rng, b.dwell || [20, 30]), len: len, rng: pop.rng });
      if (!e.tt) _wlfProblem(life, { pop: idx, rule: 'noTrack', msg: 'no line for ' + e.key });
      else pop.period = e.tt.period;
    }
  }
  if (spec.count) {
    var n = Math.round(spec.count * Math.min(1, pop.dens));
    if (pop.dens > 0.15 && n < 1) n = 1;
    _wlfResidents(life, pop, n);
  }
  life.pops.push(pop);
}
function _wlfPopLayer(who) { return typeof WORLD_POPULATIONS !== 'undefined' && WORLD_POPULATIONS[who] ? WORLD_POPULATIONS[who].layer : null; }
function _wlfMixTotal(pop) { var t = 0; for (var k in pop.mix) t += pop.mix[k]; return t || 1; }
function _wlfPickEntry(pop) { return pop.entries[+worldLifePick(pop.rng, pop.mix)]; }

/* ---------- agents ---------- */
function _wlfNewAgent(life, pop, entry, x, z, id, o) {
  o = o || {};
  var b = worldBrains[entry.m.cls], rng = _wlfStream(life, id);
  var a = {
    id: id, pop: pop ? pop.idx : -1, who: entry.key, cls: entry.m.cls, obj: (pop && pop.spec.obj && pop.spec.obj[entry.key]) || entry.m.obj, kind: b.kind, brain: b, rng: rng,
    layer: o.layer || b.layer, level: 0, r: b.r, x: x, z: z, y: 0, alt: 0, px: x, pz: z, vx: 0, vz: 0, heading: rng() * Math.PI * 2, spd: 0, speed: 0,
    state: b.start, st: 0, clip: '', phase: rng(), view: 'side', mirror: false, bucket: 2, host: null, group: null, leader: null, slot: null, members: null,
    lookAt: null, goals: null, gi: 0, gt: 0, route: null, wait: 0, fails: 0, stuckT: 0, replans: 0, leaving: false, dead: false, born: life.t,
    alpha: 1, fadeIn: 0, fadeOut: 0, edge: o.edge || null, resident: !!o.resident, age: b.age || 'adult', gait: 1, lead: null, moving: false, turning: false,
    lastProg: life.t, progX: x, progZ: z, rung: null, yieldT: 0, yieldSide: 0, flee: null, attract: null, hop: null, step: null, seat: null, stop: null,
  };
  a.kb = _wlfKb(a.obj); a.info = _wlfInfo(a.obj);
  if (o.age) a.age = o.age;
  a.gait = worldLifeRange(rng, b.gait || [0.95, 1.05]);
  _wlfSizes(life, a);
  if (a.info && a.info.size && (b.kind === 'boat' || b.kind === 'moored')) { a.r = Math.max(0.6, (a.info.size.d || 2.1) / 2); a.len = a.info.size.w || 18; }
  _wlfEnter(life, a, o.state && b.states[o.state] ? o.state : b.start);
  return a;
}
/** A10: heights per pose and age from the knowledge base (worldKbSize), else the brain's range; one percentile per agent. */
function _wlfSizes(life, a) {
  var b = a.brain, u = _wlfStream(life, a.id + ':size')();
  var get = function (pose) {
    if (a.kb && a.kb.size && typeof worldKbSize === 'function') {        // a descriptor without sizes says nothing: the brain's range
      try { var r = worldKbSize(a.kb, pose, a.age, worldLifeRng(_wlfHash(a.id + ':size:' + life.t0key))); var h = typeof r === 'number' ? r : r && (r.h || r.height); if (Number.isFinite(h) && h > 0.02 && h < 80) return h; } catch (e) { /* the brain's range */ }
    }
    var rg = (b.ages && b.ages[a.age]) || b.h || [1.7, 1.7];
    var hs = rg[0] + (rg[1] - rg[0]) * u;
    if (pose === 'sit') return Math.round(hs * 0.72 * 1000) / 1000;
    return Math.round(hs * 1000) / 1000;
  };
  var p0 = (b.states[b.start] && b.states[b.start].pose) || 'stand';
  if (p0 === 'float' || p0 === 'drive') p0 = 'stand';
  a.pose0 = p0;
  a.hStand = get(p0);
  a.hSit = get('sit');
  if (!(a.hSit < a.hStand)) a.hSit = a.hStand * 0.72;
}
/** A11: a seeded variant (worldKbVariant: liveries, outfits, gaits, breeds) never equal to a group mate's or a neighbour's.
    The candidates are the descriptor's own picks (so liveries and variantWhen still rule); among them the one least worn by
    movers of the same object nearby wins: a group mate or one of avoid (the population's last arrivals) costs most, then each
    look-alike by distance. Before, only the last three arrivals of the same population were avoided, so two populations (or a
    resident and an arrival) walked the towpath side by side as clones. */
function _wlfVariant(life, a, avoid) {
  var n = a.info && a.info.variants ? a.info.variants : 1, cands = [], extras = {}, out = null;
  // every variant the descriptor allows here (its pick enumerated with fixed draws: liveries and variantWhen still rule), in a
  // seeded order (the tie-break)
  for (var t = 0; t < n; t++) {
    var v = null, extra = null;
    if (a.kb && typeof worldKbVariant === 'function') {
      try {
        var fx = (t + 0.5) / n, r = worldKbVariant(a.kb, (life.world && life.world.place) || {}, function () { return fx; }, { ctx: life.ctx });
        if (typeof r === 'number' || typeof r === 'string') v = r;
        else if (r && typeof r === 'object') { v = r.variant != null ? r.variant : null; extra = r; }
      } catch (e) { v = null; }
    }
    if (v == null) v = t;
    if (!Object.prototype.hasOwnProperty.call(extras, String(v))) { extras[String(v)] = extra; cands.push(v); }
  }
  for (var sh = cands.length - 1; sh > 0; sh--) { var sj = Math.floor(a.rng() * (sh + 1)), tmp = cands[sh]; cands[sh] = cands[sj]; cands[sj] = tmp; }
  var best = cands[0];
  if (cands.length > 1) {
    var same = [], L = a.leader, bestS = Infinity;
    for (var i = 0; i < life.agents.length; i++) { var o = life.agents[i]; if (o !== a && !o.dead && o.obj === a.obj && o.variant != null) same.push(o); }
    for (var c = 0; c < cands.length; c++) {
      var sc = avoid && avoid.indexOf(cands[c]) >= 0 ? 4 : 0;
      for (var j = 0; j < same.length; j++) {
        var q = same[j]; if (q.variant !== cands[c]) continue;
        var mate = L && (q === L || q.leader === L);
        sc += mate ? 8 : 1 / (1 + Math.hypot(q.x - a.x, q.z - a.z) / 20);
      }
      if (sc < bestS - 1e-9) { bestS = sc; best = cands[c]; }
    }
  }
  out = { v: best, extra: extras[String(best)] };
  a.variant = out.v;
  if (out.extra) { a.outfit = out.extra.outfit || null; a.breed = out.extra.breed || null; if (Number.isFinite(out.extra.gait)) a.gait *= out.extra.gait; else if (out.extra.gait) a.gaitName = out.extra.gait; }
  // seeded looks the descriptor did not give (A11): an outfit palette, a dog's breed, a named gait; never a group mate's outfit
  var vr = _wlfStream(life, a.id + ':look');
  if (a.outfit == null && (a.kind === 'walker' || a.kind === 'lane') && a.cls !== 'dog' && !a.brain.heavy) {
    // the outfit is drawn (appearance recolours the top), so the look is (object, variant, outfit): never a group mate's outfit,
    // and the least worn among everyone alive in the same object and variant (a clone pair walked Kelham together: same variant,
    // same outfit drawn by chance from 12)
    var taken = [], L = a.leader; if (L) { taken.push(L.outfit); if (L.members) L.members.forEach(function (m) { if (m !== a) taken.push(m.outfit); }); }
    var worn = []; for (var wi = 0; wi < WORLD_LIFE_OUTFITS; wi++) worn.push(0);
    for (var ai = 0; ai < life.agents.length; ai++) { var oa = life.agents[ai]; if (oa !== a && !oa.dead && oa.obj === a.obj && oa.variant === a.variant && oa.outfit != null && oa.outfit >= 0 && oa.outfit < WORLD_LIFE_OUTFITS) worn[oa.outfit] += 1 / (1 + Math.hypot(oa.x - a.x, oa.z - a.z) / 40); }
    for (var ti = 0; ti < taken.length; ti++) if (taken[ti] != null && taken[ti] >= 0 && taken[ti] < WORLD_LIFE_OUTFITS) worn[taken[ti]] += 100;
    var start = Math.floor(vr() * WORLD_LIFE_OUTFITS), bestO = start, bestW = Infinity;
    for (var oq = 0; oq < WORLD_LIFE_OUTFITS; oq++) { var oc = (start + oq) % WORLD_LIFE_OUTFITS; if (worn[oc] < bestW - 1e-9) { bestW = worn[oc]; bestO = oc; } }
    a.outfit = bestO;
  }
  if (a.breed == null && a.cls === 'dog') a.breed = WORLD_LIFE_BREEDS[Math.floor(vr() * WORLD_LIFE_BREEDS.length)];
  if (a.gaitName == null && a.kind === 'walker') a.gaitName = a.gait < 0.95 ? 'easy' : a.gait > 1.05 ? 'brisk' : 'even';
}
function _wlfEnter(life, a, state) {
  var b = a.brain, st = b.states[state];
  if (!st) { state = b.start; st = b.states[state]; }
  a.bs = state; a.st = worldLifeRange(a.rng, st.dur || [3, 6]);
  a.spd = worldLifeRange(a.rng, st.speed || 0) * a.gait; a.clip = st.clip || state;
}
function _wlfStillState(a) {
  var st = a.brain.states[a.bs];
  if (st && st.speed) { var s = st.still || 'idle'; return a.brain.states[s] ? s : (a.brain.states.idle ? 'idle' : s); }
  return a.bs;
}
function _wlfAdd(life, a, x, z) {
  life.agents.push(a); life.byId.set(a.id, a);
  a.y = worldLifeY(life, a);
  _wlfFace(life, a);
  _wlfEvent(life, 'spawn', a);
}
function _wlfEvent(life, kind, a) {
  if (life.events.length < 5000) life.events.push({ t: life.t, kind: kind, id: a.id, x: a.x, z: a.z, layer: a.layer });
  life.bus.emit(kind, { id: a.id, cls: a.cls, x: a.x, z: a.z, layer: a.layer, t: life.t });
}
function _wlfCrowded(life, layer, x, z, d) {
  for (var i = 0; i < life.agents.length; i++) {
    var o = life.agents[i];
    if (!o.dead && o.layer === layer && (o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < d * d) return true;
  }
  return false;
}

/* ---------- residents (count populations): placed once, before any frame ---------- */
function _wlfResidents(life, pop, n) {
  var spec = pop.spec, made = 0, groups = 0;
  while (made < n && groups < n * 3) {
    groups++;
    var entry = _wlfPickEntry(pop), b = worldBrains[entry.m.cls];
    if (b.kind === 'rail' || b.kind === 'lane') { made++; continue; }       // traffic is never a resident
    var gs = 1;
    if (spec.group === 'pair' || (b.group && b.group.kind === 'pair')) gs = 2;
    else if (b.group && b.group.kind === 'loose') { var kbg = _wlfKb(entry.m.obj); var sz = (kbg && kbg.group && kbg.group.size) || b.group.size; gs = Math.round(worldLifeRange(pop.rng, sz)); }
    gs = Math.max(1, Math.min(gs, n - made));
    var lead = null;
    for (var g = 0; g < gs; g++) {
      var a = _wlfPlaceResident(life, pop, entry, lead);
      if (!a) break;
      if (!lead) lead = a; else { a.leader = lead; a.group = lead.id; a.slot = [(pop.rng() - 0.5) * 3, (pop.rng() - 0.5) * 3]; lead.members = lead.members || []; lead.members.push(a); }
      made++;
    }
    if (!lead && groups > n) break;
  }
}
function _wlfPlaceResident(life, pop, entry, near) {
  if (life.agents.length >= life.max) return null;
  var b = worldBrains[entry.m.cls], spec = pop.spec, id = 'p' + pop.idx + '-' + (pop.ord++);
  var x = null, z = null, ok = false, a;
  if (b.kind === 'percher' || b.kind === 'flyer') {
    a = _wlfNewAgent(life, pop, entry, 0, 30, id, { resident: true });
    if (!_wlfAirInit(life, a, pop)) return null;
    _wlfVariant(life, a, null);
    a.goals = spec.goals ? _wlfGoalsNorm(spec.goals) : null;
    _wlfAdd(life, a);
    return a;
  }
  if (b.kind === 'moored') { a = _wlfNewAgent(life, pop, entry, 0, 0, id, { resident: true }); if (!_wlfMoor(life, a, pop)) return null; _wlfVariant(life, a, null); _wlfAdd(life, a); return a; }
  var r = _wlfFlowR({ layer: b.layer, r: b.r }), cells = _wlfCells(life, b.layer, r, spec.on);
  if (!cells.length) cells = _wlfCells(life, b.layer, r, null);
  if (!cells.length) { _wlfProblem(life, { pop: pop.idx, rule: 'noSpawn', msg: 'no room on ' + b.layer + ' for ' + entry.key }); return null; }
  // a resident whose first goal is somewhere (go / sit / view / meet a named entity) starts near it, never at a random cell of
  // its layer (a boater placed in a far field could never reach its boat)
  var pool = cells, anchor = _wlfAnchor(life, spec);
  if (anchor && !near) {
    for (var ri = 0, Rs = [6, 14, 40]; ri < Rs.length; ri++) {
      var close = [];
      for (var ci = 0; ci < cells.length; ci += 2) if (Math.hypot(cells[ci] - anchor[0], cells[ci + 1] - anchor[1]) < Rs[ri]) close.push(cells[ci], cells[ci + 1]);
      if (close.length >= 8) { pool = close; break; }
    }
  }
  for (var tr = 0; tr < 16 && !ok; tr++) {
    if (near) {
      var ang = pop.rng() * Math.PI * 2, rr = 0.8 + pop.rng() * 2.2;
      x = near.x + Math.cos(ang) * rr; z = near.z + Math.sin(ang) * rr;
      ok = worldLifeOk(life, b.layer, x, z, b.r) && !_wlfCrowded(life, b.layer, x, z, b.r * 2 + 0.2);
    } else {
      var c = Math.floor(pop.rng() * pool.length / 2) * 2;
      x = pool[c]; z = pool[c + 1]; ok = !_wlfCrowded(life, b.layer, x, z, b.r * 3 + (b.space || 1) * 1.5);
    }
  }
  if (!ok) return null;
  a = _wlfNewAgent(life, pop, entry, x, z, id, { resident: true, state: _wlfStateAlias(b, spec.state) });
  var mates = near && near.members ? near.members.map(function (m) { return m.variant; }).concat([near.variant]) : near ? [near.variant] : null;
  _wlfVariant(life, a, mates);
  a.goals = spec.goals ? _wlfGoalsNorm(spec.goals) : [{ wander: spec.on || null, 'for': Infinity }];
  _wlfAdd(life, a);
  if (!near && b.group && b.group.members) _wlfGroupSpawn(life, pop, a, true);
  return a;
}
/** Where a population's first placed goal is (the entity a go / sit / view / meet names), or null. */
function _wlfAnchor(life, spec) {
  var gs = spec && spec.goals; if (!gs || !gs.length) return null;
  for (var i = 0; i < gs.length; i++) {
    var g = gs[i], t = g && (g.go != null ? g.go : g.sit != null ? g.sit : g.view != null ? g.view : g.meet != null ? g.meet : null);
    if (typeof t !== 'string') continue;
    var e = _wlfEntity(life, t); if (e && Number.isFinite(e.x) && Number.isFinite(e.z)) return [e.x, e.z];
  }
  return null;
}
function _wlfStateAlias(b, st) { if (!st) return null; if (b.states[st]) return st; var al = WORLD_STATE_ALIAS[st]; return al && b.states[al] ? al : null; }

/* ---------- spawning over time ---------- */
function _wlfSpawnPass(life, dt) {
  var clock = _wlfClock(life);
  for (var p = 0; p < life.pops.length; p++) {
    var pop = life.pops[p];
    if (pop.rate) {
      pop.acc += pop.rate * dt;
      while (pop.acc >= 1) { pop.acc -= 1; _wlfArrive(life, pop, _wlfPickEntry(pop)); }
    }
    if (pop.period) {
      // rail entries run on their timetable; everything else departs on the schedule's beat
      for (var i = 0; i < pop.entries.length; i++) if (pop.entries[i].tt) _wlfRailSync(life, pop, pop.entries[i], clock);
      var hasOther = pop.entries.some(function (e) { return !e.tt && worldBrains[e.m.cls].kind !== 'rail'; });
      if (hasOther) {
        // a scheduled arrival that found no place (a crowded cell, a hull that would not fit) tries again each tick for up to
        // 60 s: a boat every 6 min must not silently miss its loop
        if (pop.pending) {
          if (clock > pop.pending.until) pop.pending = null;
          else if (_wlfArrive(life, pop, pop.pending.entry, { scheduled: pop.pending.k })) pop.pending = null;
        }
        var k = Math.floor((clock - pop.offset) / pop.period);
        while (pop.k < k) {
          pop.k++;
          var others = pop.entries.filter(function (e) { return !e.tt && worldBrains[e.m.cls].kind !== 'rail'; });
          var w = {}; others.forEach(function (e, j) { w[j] = e.w; });
          var ent = others[+worldLifePick(pop.rng, w)];
          if (!_wlfArrive(life, pop, ent, { scheduled: pop.k })) pop.pending = { entry: ent, k: pop.k, until: clock + 60 };
        }
      }
    }
  }
}
/** One arrival of a population (a walker at a spawn cell, a vehicle at its lane's entry, a boat at the channel's end). */
/** Is there room for one more of this kind? Traffic (lanes, rails) has its own share so a busy pavement never starves it. */
function _wlfRoom(life, kind, need) {
  var tr = kind === 'lane' || kind === 'rail', n = 0;
  for (var i = 0; i < life.agents.length; i++) { var k = life.agents[i].kind; if (!life.agents[i].dead && ((k === 'lane' || k === 'rail') === tr)) n++; }
  if (!tr && _wlfCrowdFull(life, need || 1)) return false;
  return n + (need || 1) <= (tr ? Math.max(4, Math.round(life.max * 0.2)) : life.max);
}
/**
 * A crowd never hides the place (SCENE_LESSONS K): the people on foot together cover at most ~7 % of the frame. A person at 6 m is
 * 20 times the area of one at 27 m, so a busy quay seen from its edge is a few people at the lens or a street of them further off,
 * never a wall of giants. Nobody is removed; arrivals wait until the people on screen have left some room.
 */
function _wlfCrowdFull(life, need) {
  var cam = life.world && life.world.cam;
  if (!cam || !(cam.f > 0)) return false;
  var area = 0, n = 0, W = 1600, H = 900;
  for (var i = 0; i < life.agents.length; i++) {
    var a = life.agents[i];
    if (a.dead || a.kind !== 'walker' || a.z < 0.5) continue;
    var hp = cam.f * (a.hStand || 1.7) / a.z;
    area += 0.3 * hp * hp; n++;
  }
  // a group arrives together: its members count as well as the first (each about the average of the people already on screen)
  if (need > 1) { var hm = cam.f * 1.7 / 15; area += (need - 1) * (n ? area / n : 0.3 * hm * hm); }
  return area > 0.07 * W * H;
}
function _wlfArrive(life, pop, entry, o) {
  if (!entry) return null;
  var b = worldBrains[entry.m.cls];
  if (!_wlfRoom(life, b.kind, 1 + (b.group && b.group.members ? b.group.members.length : 0))) return null;
  if (b.kind === 'lane') return _wlfLaneSpawn(life, pop, entry);
  if (b.kind === 'rail') return null;
  if (b.layer === 'air') return null;
  var spec = pop.spec, r = _wlfFlowR({ layer: b.layer, r: b.kind === 'boat' ? _wlfBoatR(entry) : b.r });
  var cand = _wlfHomeCells(life, pop, b.layer, r, _wlfSpawnCells(life, b.layer, r, spec.on, pop.edges));
  if (b.kind === 'boat') { var bi = _wlfInfo(entry.m.obj); cand = _wlfHullCells(life, b.layer, cand, bi && bi.size ? bi.size.w || 18 : 18); }
  if (!cand.length) return null;
  // an edge first (each of the population's edges as often), then a hidden cell of it when there is one (off the frame, below
  // its bottom edge, behind cover); a mover on a visible cell fades in
  var byEdge = {}, names = [];
  cand.forEach(function (c) { if (!byEdge[c.edge]) { byEdge[c.edge] = []; names.push(c.edge); } byEdge[c.edge].push(c); });
  var ec = byEdge[names[Math.floor(pop.rng() * names.length)]];
  var hidden = ec.filter(function (c) { return c.hidden; });
  var pool = hidden.length ? hidden : ec;
  var sp = null;
  for (var t = 0; t < 6 && !sp; t++) {
    var c = pool[Math.floor(pop.rng() * pool.length)];
    if (!_wlfCrowded(life, b.layer, c.x, c.z, Math.max(b.r * 3 + 0.6, b.kind === 'walker' || b.kind === 'runner' ? 3 : 0))) sp = c;
  }
  if (!sp) return null;
  var id = 'p' + pop.idx + '-' + (pop.ord++);
  var a = _wlfNewAgent(life, pop, entry, sp.x, sp.z, id, { edge: sp.edge, state: _wlfStateAlias(b, spec.state) });
  if (b.kind === 'boat') a.r = _wlfBoatR(entry);
  a.fadeIn = sp.hidden ? 0 : 0.6;
  // A11: no clones side by side (the last few arrivals of this population)
  _wlfVariant(life, a, pop.recent.map(function (q) { return q.variant; }));
  pop.recent.push(a); if (pop.recent.length > 3) pop.recent.shift();
  a.goals = spec.goals ? _wlfGoalsNorm(spec.goals) : _wlfCrossGoals(life, pop, a, sp);
  _wlfAddSpawnPoint(life, a.layer, sp.x, sp.z);
  _wlfAdd(life, a);
  _wlfFaceFirst(life, a);
  // a hull that would lie across a solid (a moored boat, the bank) as it sets off does not arrive here (another cell next time)
  if (a.kind === 'boat' && !_wlfKeelOk(life, a, a.x, a.z, a.heading)) { a.dead = true; return null; }
  if (b.group && b.group.members) _wlfGroupSpawn(life, pop, a, false);
  return a;
}
/** A newcomer starts facing where it is going (no turning on the spot at a spawn cell). */
function _wlfFaceFirst(life, a) {
  try { _wlfBrain(life, a, 0); } catch (e) { a.dir = null; }
  if (a.dir) a.heading = Math.atan2(a.dir[0], a.dir[1]);
  a.dir = null;
}
/**
 * The spawn cells a population may use: in the connected part of the layer that holds its surface or its first goal (a
 * visitor to a bench never comes in on the far bank of the canal), and within 120 m of that goal when some are.
 */
function _wlfHomeCells(life, pop, layer, r, cells) {
  var key = layer + '|' + r + '|' + cells.length;
  pop.homec = pop.homec || {};
  if (pop.homec[key]) return pop.homec[key];
  var C = typeof worldNavComponents === 'function' ? worldNavComponents(life.nav, layer, r) : null, out = cells;
  var g0 = pop.spec.goals && pop.spec.goals.length ? _wlfGoalsNorm(pop.spec.goals)[0] : null;
  var tgt = g0 ? (g0.sit != null ? g0.sit : g0.go != null ? g0.go : g0.view != null && typeof g0.view === 'string' ? g0.view : g0.enter != null ? g0.enter : g0.fish != null ? g0.fish : g0.feed != null ? g0.feed : g0.wait != null ? g0.wait : null) : null;
  var probe = { layer: layer, r: r, rng: Math.random, goalOn: null };
  var tc = null;
  if (tgt != null) { var gc = _wlfGoalCells(life, probe, typeof tgt === 'string' && _wlfSurface(life, tgt) && _wlfSurface(life, tgt).kind === 'water' ? null : tgt, layer); if (gc && gc.cells) tc = gc.cells; else if (gc && gc.surface) tc = _wlfSurfaceCells(life, layer, gc.surface); }
  if (!tc && pop.on) tc = _wlfSurfaceCells(life, layer, pop.on);
  if (tgt != null && (!tc || !tc.length) && _wlfSurface(life, tgt) && _wlfSurface(life, tgt).kind === 'water') tc = null;
  if (C && tc && tc.length) {
    var comps = {}; for (var i = 0; i < tc.length; i++) if (C.comp[tc[i]] >= 0) comps[C.comp[tc[i]]] = 1;
    var inC = cells.filter(function (c) { return comps[C.comp[c.i]]; });
    if (inC.length) out = inC;
    if (tgt != null && typeof worldNavCellXZ === 'function') {
      var tp = tc.slice(0, 60).map(function (k) { return worldNavCellXZ(life.nav, layer, k); });
      var dmin = function (c) { var m = Infinity; for (var j = 0; j < tp.length; j++) m = Math.min(m, Math.hypot(c.x - tp[j][0], c.z - tp[j][1])); return m; };
      // not out of the very door it is going in at, and with a few steps to walk; not from the far side of the world
      var some = out.filter(function (c) { return !(c.edge === 'door' && c.host === tgt) && dmin(c) >= 8; });
      if (some.length) out = some;
      var near = out.filter(function (c) { return dmin(c) < 120; });
      if (near.length) out = near;
    }
  }
  pop.homec[key] = out;
  return out;
}
function _wlfSurfaceCells(life, layer, id) {
  var L = worldLifeGrid(life, layer), out = [];
  if (!L || !L.data || typeof worldNavSurfaceId !== 'function') return out;
  for (var k = 0; k < L.N; k += 1) { if (!L.data[k]) continue; var p = worldNavCellXZ(life.nav, layer, k); if (worldNavSurfaceId(life.nav, layer, p[0], p[1]) === id) { out.push(k); if (out.length > 400) break; } }
  return out;
}
function _wlfBoatR(entry) { var info = _wlfInfo(entry.m.obj); return info && info.size ? Math.max(0.6, (info.size.d || 2.1) / 2) : 1.05; }
/**
 * Without authored goals: cross to another edge of the population (one whose cells are at least 15 m from the spawn cell, so
 * nobody leaves where it came in); with none, go out along the surface, stay a while, and come back out by the same edge.
 */
function _wlfCrossGoals(life, pop, a, sp) {
  var edges = pop.edges || ['N', 'S', 'E', 'W'], r = _wlfFlowR(a), cand = [], spEdge = sp.edge;
  for (var i = 0; i < edges.length; i++) {
    var cells = _wlfSpawnCells(life, a.layer, r, pop.on, [edges[i]]);
    if (a.kind === 'boat') cells = _wlfHullCells(life, a.layer, cells, a.len);
    if (!cells.length) continue;
    var near = Infinity;
    for (var j = 0; j < cells.length; j++) near = Math.min(near, Math.hypot(cells[j].x - sp.x, cells[j].z - sp.z));
    if (near < 15) { if (spEdge !== edges[i] && edges.indexOf(spEdge) < 0) spEdge = edges[i]; continue; }
    cand.push(edges[i]);
  }
  if (cand.length) return [{ leave: cand[Math.floor(a.rng() * cand.length)] }];
  return [{ wander: pop.on || null, 'for': worldLifeRange(a.rng, [25, 70]), far: true }, { leave: spEdge }];
}

/* ---------- groups (A7) ---------- */
function _wlfGroupSpawn(life, pop, lead, resident) {
  var G = lead.brain.group, mates = [lead.variant];
  lead.members = lead.members || [];
  for (var i = 0; i < G.members.length; i++) {
    var gm = G.members[i];
    if (gm.p != null && lead.rng() > gm.p) continue;
    if (life.agents.length >= life.max) break;
    var m = worldLifeWhoOf(gm.who); if (!m) continue;
    var b = worldBrains[m.cls]; if (!b) continue;
    var hx = Math.sin(lead.heading), hz = Math.cos(lead.heading);
    var x = lead.x + hz * gm.slot[0] * 0.5 + hx * gm.slot[1] * 0.5, z = lead.z - hx * gm.slot[0] * 0.5 + hz * gm.slot[1] * 0.5;
    // the formation slot, else the slot mirrored, else behind and beside the leader, then nearer: the first free spot (a lane leaves little). Never ON the
    // leader (the old fallback stacked a family on one spot for the whole first second) and never on another mover: no free spot, no member
    var cands = [[x, z], [lead.x - hz * gm.slot[0] * 0.5 + hx * gm.slot[1] * 0.5, lead.z + hx * gm.slot[0] * 0.5 + hz * gm.slot[1] * 0.5]];
    for (var cb = 0, ds = [0.8, 1.3, 1.8]; cb < ds.length; cb++) for (var cs = 0, sd = [0, 0.7, -0.7]; cs < sd.length; cs++) cands.push([lead.x - hx * ds[cb] + hz * sd[cs], lead.z - hz * ds[cb] - hx * sd[cs]]);
    var spot = null;
    for (var ck = 0; ck < cands.length && !spot; ck++) if (worldLifeOk(life, b.layer, cands[ck][0], cands[ck][1], b.r) && !_wlfCrowded(life, b.layer, cands[ck][0], cands[ck][1], (b.r + lead.r) * 0.9)) spot = cands[ck];
    if (!spot) continue;
    x = spot[0]; z = spot[1];
    var f = _wlfNewAgent(life, pop, { key: gm.who, m: { cls: m.cls, obj: m.obj } }, x, z, lead.id + '.' + (i + 1), { edge: lead.edge, resident: resident, age: b.age });
    f.leader = lead; f.group = lead.id; f.slot = gm.slot.slice(); f.goals = []; f.fadeIn = lead.fadeIn; f.heading = lead.heading;
    lead.group = lead.id;
    _wlfVariant(life, f, mates); mates.push(f.variant);
    if (G.kind === 'dog') {
      var len = worldLifeRange(lead.rng, G.lead || [1.5, 2]);
      f.lead = { to: lead.id, len: len }; lead.lead = { to: f.id, len: len };
      var ld = { id: f.id + '-lead', a: lead.id, b: f.id, len: len, cls: 'lead', static: false };
      life.leads.push(ld);
      if (typeof worldAttach === 'function') { try { worldAttach(life.world, ld, f.id, { dx: 0, dy: f.hStand * 0.75, dz: 0.15 }, { to: lead.id, toLocal: { dx: 0.25, dy: lead.hStand * 0.48, dz: 0 } }); } catch (e) { /* the life sim draws it from the two ends */ } }
    }
    lead.members.push(f);
    _wlfAdd(life, f);
    if (!resident) _wlfAddSpawnPoint(life, f.layer, f.x, f.z);
  }
}
/** The world point of a member's formation slot (lateral right, ahead), with single-file fallbacks on narrow ground. */
function _wlfSlotPoint(life, a) {
  var L = a.leader, hx = Math.sin(L.heading), hz = Math.cos(L.heading), rx = hz, rz = -hx;
  var s = a.slot, cands = [[s[0], s[1]], [s[0] * 0.5, s[1] - 0.6], [0, -0.9 - Math.abs(s[0])], [0, -1.6]];
  // a slot that falls in an edge zone (a half body at the frame side, C2) is passed over while another fits
  var firstOk = null;
  for (var i = 0; i < cands.length; i++) {
    var x = L.x + rx * cands[i][0] + hx * cands[i][1], z = L.z + rz * cands[i][0] + hz * cands[i][1];
    if (!_wlfOk(life, a, x, z)) continue;
    if (!_wlfInEdgeZone(life, { layer: a.layer, x: x, z: z })) return [x, z];
    if (!firstOk) firstOk = [x, z];
  }
  return firstOk || [L.x - hx * 0.8, L.z - hz * 0.8];
}

/* ---------- goals (A4) ---------- */
function _wlfGoalsNorm(goals) {
  var out = [];
  for (var i = 0; i < goals.length; i++) {
    var g = goals[i], n = goals[i + 1];
    if (!g || typeof g !== 'object') continue;
    if (g.go != null && n && n['do'] === 'sit' && typeof g.go === 'string') { out.push({ sit: g.go, 'for': n['for'] }); i++; continue; }
    if (g.go != null && n && n['do'] === 'fish') { out.push({ fish: g.go, 'for': n['for'] }); i++; continue; }
    if (g.go != null && n && (n['do'] === 'look' || n['do'] === 'view')) { out.push({ go: g.go }); out.push({ view: g.go, 'for': n['for'], here: true }); i++; continue; }
    out.push(g);
  }
  return out;
}
function _wlfGoal(a) { return a.goals ? a.goals[a.gi] || null : null; }
function _wlfNextGoal(life, a) { a.gi++; a.gt = 0; a.route = null; a.fails = 0; a.lookAt = null; a.gdur = null; }
function _wlfLeave(life, a, edge) { a.goals = [{ leave: edge || 'any' }]; a.gi = 0; a.gt = 0; a.route = null; a.leaving = true; a.fails = 0; a.lookAt = null; a.gdur = null; }
/** A failed route: stand and back off 2-8 s (never a search every tick); after three, give the goal up. */
function _wlfFail(life, a) {
  a.fails++; a.route = null;
  if (_wlfInEdgeZone(life, a)) {
    // never idle in an edge zone (C2): give the goal up now; leaving, go out by the nearest spawn cell
    var g0 = _wlfGoal(a);
    if (g0 && g0.leave != null) { if (g0.leave !== 'any') g0.leave = 'any'; else if (a.fails > 3 && worldLifeIsSpawn(life, a.layer, a.x, a.z)) _wlfDespawnAt(life, a); }
    else _wlfNextGoal(life, a);
    return;
  }
  a.wait = life.t + 2 + 6 * a.rng();
  // a place it cannot reach (a boat's deck from a bank with no landing) is given up on the second failure, not the third: a mover
  // that "wants" something unreachable is a statue with an excuse
  var gq = _wlfGoal(a);
  if (a.fails >= 2 && gq && gq.go != null && typeof gq.go === 'string' && !gq.leave) { _wlfNextGoal(life, a); return; }
  if (a.fails >= 3) {
    var g = _wlfGoal(a);
    if (g && g.leave && g.leave !== 'any') g.leave = 'any';
    else if (g && g.leave) { a.fails = 0; a.wait = life.t + 4; }
    else _wlfNextGoal(life, a);
  }
}
function _wlfEntity(life, id) { var ents = (life.world && life.world.entities) || []; for (var i = 0; i < ents.length; i++) if (ents[i].id === id) return ents[i]; return null; }
function _wlfSurface(life, id) { var s = (life.world && life.world.surfaces) || []; for (var i = 0; i < s.length; i++) if (s[i].id === id) return s[i]; return null; }
/** The walk layer an entity's deck makes (raised levels), or null. */
function _wlfLevelOf(life, entOrId) {
  var id = typeof entOrId === 'string' ? entOrId : entOrId && entOrId.id;
  var lv = typeof worldNavLevels === 'function' ? worldNavLevels(life.nav) : [];
  for (var i = 0; i < lv.length; i++) if (lv[i].id === id || (lv[i].host && lv[i].host === id)) return lv[i].layer;
  return null;
}
/** Seed cells of a goal on a layer: { key, cells } for a flow field. */
function _wlfGoalCells(life, a, tgt, layer) {
  var L = worldLifeGrid(life, layer); if (!L || !L.data) return null;
  if (tgt && typeof tgt === 'object' && !Array.isArray(tgt) && tgt.key) return tgt;
  var r = _wlfFlowR(a), ok = function (x, z) { return worldLifeOk(life, layer, x, z, r); };
  var cell = function (x, z) { return typeof worldNavCell === 'function' ? worldNavCell(life.nav, layer, x, z) : -1; };
  if (Array.isArray(tgt)) { var pc = _wlfNearCells(life, layer, r, tgt[0], tgt[1], 3); if (!pc.length) pc = _wlfNearCells(life, layer, r, tgt[0], tgt[1], 12); return { key: 'pt:' + tgt[0] + ',' + tgt[1], cells: pc }; }
  if (typeof tgt !== 'string') return null;
  var e = _wlfEntity(life, tgt);
  if (e) {
    // the cells round the entity's footprint (a bench is solid: its goal is the ground beside it)
    var cells = [], foot = Array.isArray(e.foot) && e.foot.length ? e.foot : typeof _wnavFoot === 'function' && e.size ? _wnavFoot(e) : [[e.x, e.z]];
    for (var i = 0; i < foot.length; i++) {
      var p = foot[i], q = foot[(i + 1) % foot.length];
      for (var t = 0; t <= 1; t += 0.25) {
        var x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t, dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz) || 1;
        for (var rr = 0.4; rr <= 2.9; rr += 0.5) { var gx = x + dx / d * rr, gz = z + dz / d * rr; if (ok(gx, gz)) { var k = cell(gx, gz); if (k >= 0 && cells.indexOf(k) < 0) cells.push(k); break; } }
      }
    }
    if (!cells.length) { var big = e.size ? Math.max(e.size.w || 0, e.size.d || 0) / 2 + 2 : 4; cells = _wlfNearCells(life, layer, r, e.x, e.z, big); }
    return { key: 'ent:' + tgt, cells: cells };
  }
  var s = _wlfSurface(life, tgt);
  if (s) return { key: 'surf:' + tgt, surface: tgt };
  var e2 = _wlfEdge(tgt);
  if (/^(N|S|E|W|cover|door|any)$/.test(e2)) {
    var on = a.goalOn !== undefined ? a.goalOn : null;
    var sc = _wlfSpawnCells(life, layer, r, on, e2 === 'any' ? null : [e2]);
    return { key: 'edge:' + e2 + '|' + (on || ''), cells: sc.map(function (c) { return c.i; }) };
  }
  var ag = life.byId.get(tgt);
  if (ag) return { key: 'pt:' + Math.round(ag.x) + ',' + Math.round(ag.z), cells: _wlfNearCells(life, layer, r, ag.x, ag.z, 3) };
  return null;
}
function _wlfNearCells(life, layer, r, x, z, R) {
  var L = worldLifeGrid(life, layer); if (!L || !L.data || typeof worldNavCell !== 'function') return [];
  var best = -1, bd = Infinity;
  for (var dz = -R; dz <= R; dz += L.cell) for (var dx = -R; dx <= R; dx += L.cell) {
    var px = x + dx, pz = z + dz;
    if (!worldLifeOk(life, layer, px, pz, r)) continue;
    var k = worldNavCell(life.nav, layer, px, pz); if (!_wlfReachable(life, layer, r, k)) continue;
    var d = dx * dx + dz * dz; if (d < bd) { bd = d; best = k; }
  }
  return best >= 0 ? [best] : [];
}
/** Route an agent to a target with a cached flow field. Returns 'go' (a.dir set), 'here' (arrived), or 'fail'. */
function _wlfFlowTo(life, a, tgt, layer) {
  layer = layer || a.layer;
  var key = layer + '|' + (typeof tgt === 'string' ? tgt : tgt && tgt.key ? tgt.key : JSON.stringify(tgt)) + '|' + (a.goalOn || '');
  if (!a.route || a.route.key !== key) {
    var gc = _wlfGoalCells(life, a, tgt, layer);
    if (!gc || (gc.cells && !gc.cells.length)) return 'fail';
    var f = typeof worldFlowField === 'function' ? worldFlowField(life.nav, layer, gc, _wlfFlowR(a)) : null;
    if (!f || !f.seeds.length) return 'fail';
    // a hull that cannot reach its goal for the wider body is planned again for a narrower one (see _wlfFlowR)
    while (a.kind === 'boat' && (a.rTier || 0) < 2 && !isFinite(worldFlowDist(f, a.x, a.z))) {
      a.rTier = (a.rTier || 0) + 1;
      gc = _wlfGoalCells(life, a, tgt, layer); if (!gc || (gc.cells && !gc.cells.length)) return 'fail';
      f = worldFlowField(life.nav, layer, gc, _wlfFlowR(a));
      if (!f || !f.seeds.length) return 'fail';
    }
    a.route = { key: key, field: f };
  }
  var fd = a.route.field, R = a.route;
  var d = worldFlowDist(fd, a.x, a.z);
  if (d === 0) return 'here';
  if (!isFinite(d)) return 'fail';
  // the steering point is planned once per cell (its line checks are the costly part); worldStep keeps every step legal
  var k = typeof worldNavCell === 'function' ? worldNavCell(life.nav, layer, a.x, a.z) : -1;
  if (!(R.tk === k && k >= 0 && R.tp && Math.hypot(R.tp[0] - a.x, R.tp[1] - a.z) > 0.3)) {
    var tp = typeof worldFlowTarget === 'function' ? worldFlowTarget(fd, a.x, a.z) : null;
    if (!tp) {
      var dir0 = worldFlowDir(fd, a.x, a.z);
      if (!dir0) return d < 40 ? 'here' : 'fail';
      R.tp = null; R.tk = -1; a.dir = dir0; a.distLeft = d; return 'go';
    }
    R.tp = tp; R.tk = k;
  }
  var dx = R.tp[0] - a.x, dz = R.tp[1] - a.z, dl = Math.hypot(dx, dz);
  if (dl < 1e-6) { R.tk = -1; return d < 40 ? 'here' : 'fail'; }
  a.dir = [dx / dl, dz / dl]; a.distLeft = d;
  return 'go';
}
/** Route to an ad-hoc point (A*, short, backs off on failure). */
function _wlfPathTo(life, a, x, z) {
  if (a.route && a.route.px === x && a.route.pz === z && a.route.failT) { if (life.t < a.route.failT) return 'fail'; a.route = null; }
  if (!a.route || a.route.px !== x || a.route.pz !== z) {
    var direct = typeof _wnavLineOk === 'function' && Math.hypot(x - a.x, z - a.z) < 14 && _wlfLine(life, a, a.x, a.z, x, z);
    var path = direct ? [[x, z]] : (typeof worldPath === 'function' ? worldPath(life.nav, a.layer, [a.x, a.z], [x, z], _wlfFlowR(a)) : null);
    if (!path) { a.route = { px: x, pz: z, failT: life.t + 2 + 6 * a.rng() }; return 'fail'; }
    a.route = { px: x, pz: z, path: path, pi: 0 };
  }
  var p = a.route.path;
  while (a.route.pi < p.length - 1 && Math.hypot(p[a.route.pi][0] - a.x, p[a.route.pi][1] - a.z) < Math.max(0.4, a.r * 2)) a.route.pi++;
  var w = p[Math.min(a.route.pi, p.length - 1)], dx = w[0] - a.x, dz = w[1] - a.z, d = Math.hypot(dx, dz);
  var last = p[p.length - 1], dl = Math.hypot(last[0] - a.x, last[1] - a.z);
  if (dl < Math.max(0.35, a.r * 1.5) && a.route.pi >= p.length - 1) return 'here';
  if (d < 1e-6) return 'here';
  a.dir = [dx / d, dz / d]; a.distLeft = dl * 40;
  return 'go';
}
function _wlfLine(life, a, ax, az, bx, bz) {
  var L = worldLifeGrid(life, a.layer); if (!L || !L.data || typeof _wnavOkMask !== 'function') return false;
  return _wnavLineOk(L, _wnavOkMask(L, _wlfFlowR(a), false), ax, az, bx, bz);
}
/** A wander target: near the agent (or the far part of its surface), on its component, in view. */
function _wlfWanderTarget(life, a, on, far) {
  var cells = _wlfCells(life, a.layer, _wlfFlowR(a), on);
  if (!cells.length) cells = _wlfCells(life, a.layer, _wlfFlowR(a), null);
  if (!cells.length) return null;
  var best = null, bs = -Infinity, tried = 0;
  // only places the mover can reach from where it is (a heron on the near margin of a canal never picks the far margin: a walk
  // that cannot be made fails, backs off and leaves it standing for the rest of the loop)
  var Cc = typeof worldNavComponents === 'function' ? worldNavComponents(life.nav, a.layer, _wlfFlowR(a)) : null;
  var ka = Cc && typeof worldNavCell === 'function' ? worldNavCell(life.nav, a.layer, a.x, a.z) : -1, ca = ka >= 0 ? Cc.comp[ka] : -1;
  for (var t = 0; t < 24 && tried < 8; t++) {
    var c = Math.floor(a.rng() * cells.length / 2) * 2, x = cells[c], z = cells[c + 1], d = Math.hypot(x - a.x, z - a.z);
    if (ca >= 0) { var kc = worldNavCell(life.nav, a.layer, x, z); if (kc < 0 || Cc.comp[kc] !== ca) continue; }
    tried++;
    var score = far ? d : (d < 3 ? -10 : -Math.abs(d - (a.kind === 'swimmer' ? 6 : 12)));
    if (score > bs) { bs = score; best = [x, z]; }
  }
  return best;
}

/* ---------- benches (sit, capacity, queue) ---------- */
function _wlfSeats(life, ent) {
  var k = ent.id || ent.obj;
  if (life.seats.has(k)) return life.seats.get(k);
  var kb = _wlfKb(ent.obj), sz = ent.size || (_wlfInfo(ent.obj) || {}).size || { w: 1.8, d: 0.6, h: 0.85 };
  var n = kb && Number.isFinite(kb.seats) ? kb.seats : kb && Number.isFinite(kb.capacity) ? kb.capacity : Math.max(1, Math.min(4, Math.round((sz.w || 1.8) / 0.6)));
  var f = (Number.isFinite(ent.facing) ? ent.facing : 180) * Math.PI / 180, fx = Math.sin(f), fz = Math.cos(f), ax = fz, az = -fx;
  var span = Math.max(0.5, (sz.w || 1.8) - 0.5), seats = [];
  for (var i = 0; i < n; i++) {
    var u = n === 1 ? 0 : -span / 2 + span * i / (n - 1);
    var sx = ent.x + ax * u, sz2 = ent.z + az * u, off = (sz.d || 0.6) / 2 + 0.45, stand = [sx + fx * off, sz2 + fz * off];
    // where one stands up to is a legal spot (a bench on a quay edge faces the water: the stand-up step walked the sitter into the harbour);
    // else behind the bench, else beside it
    if (typeof worldNavOk === 'function' && life.nav && !worldNavOk(life.nav, 'walk', stand[0], stand[1], 0.28)) {
      // the nearest legal spot round the seat, in front first, then behind, then to the sides, outward to 2.2 m (a bench's solid ring is about 1 m)
      var dirs = [[fx, fz], [-fx, -fz], [ax, az], [-ax, -az], [fx + ax, fz + az], [fx - ax, fz - az], [-fx + ax, -fz + az], [-fx - ax, -fz - az]], found = null;
      for (var rr = off; rr <= 2.2 && !found; rr += 0.25) for (var q = 0; q < dirs.length && !found; q++) {
        var dl = Math.hypot(dirs[q][0], dirs[q][1]) || 1, cx = sx + dirs[q][0] / dl * rr, cz = sz2 + dirs[q][1] / dl * rr;
        if (worldNavOk(life.nav, 'walk', cx, cz, 0.28)) found = [cx, cz];
      }
      if (found) stand = found;
    }
    seats.push({ i: i, x: sx, z: sz2, ax: stand[0], az: stand[1], by: null, facing: f });
  }
  var rec = { ent: ent, seats: seats, queue: [] };
  life.seats.set(k, rec);
  return rec;
}
function _wlfIsBench(ent) {
  if (!ent) return false;
  var kb = _wlfKb(ent.obj);
  if (kb && (kb.cls === 'bench' || Number.isFinite(kb.seats) || Number.isFinite(kb.capacity))) return true;
  return ent.cls === 'bench';
}
function _wlfReleaseSeat(life, a) { if (a.seat) { if (a.seat.by === a.id) a.seat.by = null; a.seat = null; } }

/* ---------- the brain pass: states and goals ---------- */
function _wlfBrain(life, a, dt) {
  a.dir = null; a.st -= dt; a.gt += dt; a.distLeft = null;
  if (a.fadeOut) return;
  if (a.kind === 'lane' || a.kind === 'rail' || a.kind === 'moored') return;
  if (a.step || a.hop) return;                                                 // a step aboard / down, a sit, a hop in progress
  if (a.layer === 'air' || a.kind === 'percher' || a.kind === 'flyer') { _wlfAirBrain(life, a, dt); return; }
  // reactions take over for a while (M6)
  if (a.flee && life.t < a.flee.until) {
    var fx = a.x - a.flee.x, fz = a.z - a.flee.z, fd = Math.hypot(fx, fz) || 1; a.dir = [fx / fd, fz / fd];
    var mvs = a.brain.states.swim ? 'swim' : a.brain.states.walk ? 'walk' : a.brain.states.stalk ? 'stalk' : null;
    if (mvs && a.bs !== mvs) _wlfEnter(life, a, mvs);
    a.spd = Math.max(a.spd, 0.65 * a.gait); a.st = Math.max(a.st, 0.5);
    return;
  }
  a.flee = null;
  if (a.leader && !a.leader.dead) { _wlfFollowBrain(life, a, dt); return; }
  if (a.leader && a.leader.dead) { a.leader = null; if (!a.resident) _wlfLeave(life, a, null); else a.goals = [{ wander: null, 'for': Infinity }]; }
  if (a.attract && life.t < a.attract.until) { var ax2 = a.attract.x - a.x, az2 = a.attract.z - a.z, ad = Math.hypot(ax2, az2); if (ad > 1.6) { a.dir = [ax2 / ad, az2 / ad]; if (!a.spd) _wlfEnter(life, a, a.brain.states.swim ? 'swim' : a.bs); return; } a.attract = null; }
  if (a.wait > life.t && _wlfInEdgeZone(life, a)) a.wait = 0;                // never backing off in an edge zone (C2)
  if (a.wait > life.t) { if (a.brain.states[a.bs] && a.brain.states[a.bs].speed) _wlfEnter(life, a, _wlfStillState(a)); a.st = Math.max(a.st, 0.2); return; }
  var g = _wlfGoal(a);
  if (!g) {
    if (a.resident && a.goals && a.goals.length) { a.gi = 0; g = _wlfGoal(a); }
    else if (a.resident) { a.goals = [{ wander: null, 'for': Infinity }]; a.gi = 0; g = _wlfGoal(a); }
    else { if (!a.leaving) _wlfLeave(life, a, null); g = _wlfGoal(a); }
  }
  if (!g) return;
  var b = a.brain;
  // the state machine runs under the goal: idle / look / dabble ... come and go; a goal's own state holds while it lasts
  if (g['do'] != null) {
    var want = _wlfStateAlias(b, g['do']) || g['do'];
    if (a.bs !== want || a.gdur == null) { if (b.states[want]) _wlfEnter(life, a, want); a.gdur = worldLifeRange(a.rng, g['for'] != null ? g['for'] : [3, 8]); a.st = a.gdur; }
    if (a.st <= 0) { a.gdur = null; _wlfNextGoal(life, a); }
    return;
  }
  // a goal that owns the state (seated, queuing, fishing, feeding, viewing, waiting at a stop) is never interrupted by the
  // state machine; on the way to it, the state machine gives only short pauses
  var owned = !!a.host || a.bs === 'wait' || a.bs === 'fish' || a.bs === 'feed' || ((g.sit != null || g.view != null) && !(b.states[a.bs] && b.states[a.bs].speed) && a.gdur != null);
  if (a.st <= 0 && !owned) {
    var st = b.states[a.bs], nx = st && st.next ? worldLifePick(a.rng, st.next) : b.start;
    if (a.bs === 'chat' || a.bs === 'sit') nx = b.states.walk ? 'walk' : b.start;
    var directed = g.wander === undefined && g['do'] == null;
    if (directed && b.states[nx] && !b.states[nx].speed && a.rng() > 0.25) nx = _wlfMovingState(a);
    // C2: nobody stops in the edge zones (the near row, the frame sides) unless the goal says so
    if (b.states[nx] && !b.states[nx].speed && (_wlfGroupEdge(life, a) || a.leaving)) nx = b.states.walk ? 'walk' : b.states.swim ? 'swim' : b.states.stalk ? 'stalk' : b.states.ride ? 'ride' : nx;
    if (a.kind === 'wader' && nx === 'freeze') a.lookAt = _wlfWaterAhead(life, a);
    if (a.kind === 'wader' && nx === 'strike') { var wp = a.lookAt || _wlfWaterAhead(life, a); if (wp) life.bus.emit('strike', { id: a.id, x: wp[0], z: wp[1], t: life.t }); }
    _wlfEnter(life, a, nx);
    if (directed && b.states[a.bs] && !b.states[a.bs].speed) a.st = Math.min(a.st, 2.5);
  }
  if (g.sit != null) return _wlfSitGoal(life, a, g, dt);
  if (g.wait != null || g.board != null) return _wlfWaitGoal(life, a, g, dt);
  if (g.enter != null) return _wlfEnterGoal(life, a, g);
  if (g.fish != null || g.feed != null) return _wlfBankGoal(life, a, g, dt);
  if (g.view != null) return _wlfViewGoal(life, a, g, dt);
  if (g.leave != null) {
    a.leaving = true;
    if (String(a.layer).indexOf('walk@') === 0 && !_wlfSpawnCells(life, a.layer, _wlfFlowR(a), null, null).length) { if (_wlfToLevel(life, a, 'walk') === 'fail') _wlfFail(life, a); return; }
    var res = _wlfFlowTo(life, a, g.leave === 'any' ? 'any' : g.leave);
    if (res === 'here') { _wlfDespawnAt(life, a); return; }
    if (res === 'fail') { _wlfFail(life, a); return; }
    _wlfKeepMoving(life, a);
    return;
  }
  if (g.go != null || g.meet != null || g.follow != null) {
    var tgt = g.go != null ? g.go : g.meet != null ? g.meet : g.follow;
    if (g.follow != null) { var fa = life.byId.get(g.follow); if (!fa || fa.dead) { _wlfNextGoal(life, a); return; } if (Math.hypot(fa.x - a.x, fa.z - a.z) < 1.5) return; }
    // walk levels: a raised deck is reached through its stairs or landing; anything else is on the ground level
    var lv = typeof tgt === 'string' ? _wlfLevelOf(life, tgt) : null, fam = String(a.layer).split('@')[0];
    var tl = lv || (fam === 'walk' ? 'walk' : a.layer);
    if (fam === 'walk' && tl !== a.layer) { if (_wlfToLevel(life, a, tl) === 'fail') _wlfFail(life, a); return; }
    var r2 = lv ? 'here' : _wlfFlowTo(life, a, tgt);
    if (r2 === 'here') {
      if (g.meet != null) { _wlfNextGoal(life, a); _wlfEnter(life, a, b.states.chat ? 'chat' : _wlfStillState(a)); var mo = life.byId.get(g.meet); a.lookAt = mo ? [mo.x, mo.z] : null; return; }
      if (g.follow != null) return;
      _wlfNextGoal(life, a); return;
    }
    if (r2 === 'fail') { _wlfFail(life, a); return; }
    _wlfKeepMoving(life, a);
    return;
  }
  if (g.wander !== undefined) {
    var lim = g['for'] == null ? Infinity : (a.gdur != null ? a.gdur : (a.gdur = worldLifeRange(a.rng, g['for'])));
    if (a.gt > lim) { a.gdur = null; _wlfNextGoal(life, a); return; }
    var stt = b.states[a.bs];
    // nobody idles in an edge zone (C2): a flock's leader grazing half out of the frame ends its pause now, it does not wait it out
    if ((!stt || !stt.speed) && a.st > 0.3 && !a.host && _wlfGroupEdge(life, a)) a.st = 0.3;
    if (!stt || !stt.speed) { a.route = a.route && a.route.path ? a.route : null; return; }    // idle / dabble / graze: still
    if (!a.route || !a.route.path) {
      var tp = _wlfWanderTarget(life, a, g.wander, g.far);
      if (!tp) { _wlfFail(life, a); return; }
      a.route = null;
      var rr = _wlfPathTo(life, a, tp[0], tp[1]);
      if (rr === 'fail') { _wlfFail(life, a); return; }
    }
    var res2 = _wlfPathTo(life, a, a.route.px, a.route.pz);
    if (res2 === 'here') { a.route = null; if (g.far) { _wlfEnter(life, a, b.states.look ? 'look' : _wlfStillState(a)); a.lookAt = [a.x + Math.sin(a.heading) * 20, a.z + Math.cos(a.heading) * 20]; } return; }
    if (res2 === 'fail') { _wlfFail(life, a); return; }
    return;
  }
  _wlfNextGoal(life, a);
}
/** A mover with somewhere to go walks (never stands on the spot pretending to walk). */
function _wlfKeepMoving(life, a) {
  var st = a.brain.states[a.bs];
  if (st && st.speed) return;
  if (a.leaving || _wlfInEdgeZone(life, a) || a.st <= 0) {
    var mv = a.brain.states.walk ? 'walk' : a.brain.states.swim ? 'swim' : a.brain.states.stalk ? 'stalk' : a.brain.states.ride ? 'ride' : a.brain.states.cruise ? 'cruise' : null;
    if (mv) _wlfEnter(life, a, mv);
  } else a.dir = null;
}
function _wlfDespawnAt(life, a) {
  // on a visible cell: fade out over 0.6 s first (no popping)
  var L = worldLifeGrid(life, a.layer), cam = life.nav.cam, hidden = true;
  if (L && cam) {
    var onScreen = a.x > -a.z * cam.tanL - 0.5 && a.x < a.z * cam.tanR + 0.5, below = a.z < cam.dMin, tiny = cam.f * (a.hStand || 1.7) / Math.max(1, a.z) < 12;
    hidden = !onScreen || below || tiny;
  }
  if (!hidden) {
    if (!a.fadeOut) { a.fadeOut = life.t; a.leaving = 'fade'; if (a.members) a.members.forEach(function (m) { if (!m.dead && !m.fadeOut && Math.hypot(m.x - a.x, m.z - a.z) < 3) { m.fadeOut = life.t; m.leaving = 'fade'; } }); }
    return;
  }
  _wlfDespawn(life, a);
}
function _wlfDespawn(life, a) {
  if (a.dead) return;
  a.dead = true; _wlfReleaseSeat(life, a);
  if (a.layer !== 'air') _wlfAddSpawnPoint(life, a.layer, a.x, a.z);
  _wlfEvent(life, a.boarded ? 'board' : 'leave', a);
  // the group goes with its leader when it is at the edge too
  if (a.members) for (var i = 0; i < a.members.length; i++) { var m = a.members[i]; if (!m.dead && !m.fadeOut && Math.hypot(m.x - a.x, m.z - a.z) < 3) { _wlfAddSpawnPoint(life, m.layer, m.x, m.z); m.dead = true; _wlfReleaseSeat(life, m); _wlfEvent(life, 'leave', m); } }
}
/** Off one walk level onto another: through a stair (shared cells) or a landing (a step aboard). */
function _wlfToLevel(life, a, layer) {
  var ps = typeof worldNavPortals === 'function' ? worldNavPortals(life.nav) : [], best = null;
  for (var i = 0; i < ps.length; i++) {
    var p = ps[i];
    if (!((p.a === a.layer && p.b === layer) || (p.b === a.layer && p.a === layer))) continue;
    for (var j = 0; j < p.pairs.length; j++) {
      var pr = p.pairs[j], from = p.a === a.layer ? [pr[0], pr[1]] : [pr[2], pr[3]], to = p.a === a.layer ? [pr[2], pr[3]] : [pr[0], pr[1]];
      var d = Math.hypot(from[0] - a.x, from[1] - a.z);
      if (!best || d < best.d) best = { d: d, from: from, to: to, p: p };
    }
  }
  if (!best) return 'fail';
  var res = best.d < 0.6 ? 'here' : _wlfFlowTo(life, a, best.from);
  if (res === 'fail') return 'fail';
  if (res === 'here') {
    // at the portal: a landing is an eased step aboard (or ashore); a stair is shared ground, the layer simply changes
    if (best.p.kind === 'landing') { a.step = { t0: life.t, dur: 0.8, x0: a.x, z0: a.z, x1: best.to[0], z1: best.to[1], layer: layer }; a.host = best.p.id; }
    else { a.layer = layer; }
    a.route = null;
    return 'go';
  }
  _wlfKeepMoving(life, a);
  return 'go';
}
function _wlfWaterAhead(life, a) {
  for (var d = 0.6; d <= 2.4; d += 0.6) for (var s = -1; s <= 1; s++) {
    var h = a.heading + s * 0.6, x = a.x + Math.sin(h) * d, z = a.z + Math.cos(h) * d;
    if (worldLifeOk(life, 'swim', x, z, 0.05)) return [x, z];
  }
  return [a.x + Math.sin(a.heading) * 1.2, a.z + Math.cos(a.heading) * 1.2];
}
function _wlfSitGoal(life, a, g, dt) {
  var ent = _wlfEntity(life, g.sit);
  if (!ent || !_wlfIsBench(ent)) { var r0 = _wlfFlowTo(life, a, g.sit); if (r0 === 'here') { _wlfNextGoal(life, a); } else if (r0 === 'fail') _wlfFail(life, a); else _wlfKeepMoving(life, a); return; }
  var B = _wlfSeats(life, ent), bid = ent.id || ent.obj;
  if (a.host === bid && a.seat) {
    // seated: the bench's facing, no leg motion, for the goal's time; then stand up off the bench (eased)
    if (a.bs !== 'sit') { _wlfEnter(life, a, a.brain.states.sit ? 'sit' : 'idle'); a.bs = 'sit'; a.gdur = worldLifeRange(a.rng, g['for'] != null ? g['for'] : [20, 60]); a.st = a.gdur; life.bus.emit('sit', { id: a.id, x: a.x, z: a.z, bench: ent.id }); }
    a.lookAt = [a.x + Math.sin(a.seat.facing) * 10, a.z + Math.cos(a.seat.facing) * 10];
    if (a.st <= 0) { a.step = { t0: life.t, dur: Math.max(0.6, Math.hypot(a.seat.ax - a.x, a.seat.az - a.z) / 1.1), x0: a.x, z0: a.z, x1: a.seat.ax, z1: a.seat.az, layer: a.layer, stand: true }; life.bus.emit('stand', { id: a.id, x: a.x, z: a.z }); }
    return;
  }
  if (!a.seat) {
    // far away: walk to the bench; a seat is taken only on arrival (first come, first seated)
    if (Math.hypot(a.x - ent.x, a.z - ent.z) > 6) { var rf = _wlfFlowTo(life, a, g.sit); if (rf === 'fail') _wlfFail(life, a); else if (rf === 'go') _wlfKeepMoving(life, a); return; }
    var free = B.seats.filter(function (q) { return !q.by; });
    if (!free.length) {
      // full: queue standing beside the bench for a while, then give up (Y4 queues)
      if (B.queue.indexOf(a.id) < 0) { B.queue.push(a.id); a.queueT = life.t; }
      if (life.t - a.queueT > 20) { B.queue.splice(B.queue.indexOf(a.id), 1); _wlfNextGoal(life, a); return; }
      var qi = B.queue.indexOf(a.id), fx = Math.sin(B.seats[0].facing), fz = Math.cos(B.seats[0].facing);
      var qx = ent.x + fx * 1.8 + fz * (qi + 1) * 0.9, qz = ent.z + fz * 1.8 - fx * (qi + 1) * 0.9;
      if (!a.qcells || a.qi !== qi) { a.qcells = _wlfNearCells(life, a.layer, _wlfFlowR(a), qx, qz, 2); a.qi = qi; }
      var rq = a.qcells.length ? _wlfFlowTo(life, a, { key: 'benchq:' + bid + ':' + qi, cells: a.qcells }) : 'here';
      if (rq === 'go') { _wlfKeepMoving(life, a); return; }
      a.dir = null; a.lookAt = [ent.x, ent.z];
      if (a.brain.states[a.bs] && a.brain.states[a.bs].speed) _wlfEnter(life, a, _wlfStillState(a));
      a.bs = 'wait'; a.st = Math.max(a.st, 1);
      return;
    }
    var qpos = B.queue.indexOf(a.id); if (qpos >= 0) B.queue.splice(qpos, 1);
    free.sort(function (p, q) { return Math.hypot(p.ax - a.x, p.az - a.z) - Math.hypot(q.ax - a.x, q.az - a.z); });
    a.seat = free[0]; a.seat.by = a.id; a.qcells = null;
    if (a.bs === 'wait') _wlfEnter(life, a, a.brain.start);
  }
  var sk = 'seat:' + bid + ':' + a.seat.i;
  if (!a.seat.cells) a.seat.cells = _wlfNearCells(life, a.layer, _wlfFlowR(a), a.seat.ax, a.seat.az, 1.6);
  var res = a.seat.cells.length ? _wlfFlowTo(life, a, { key: sk, cells: a.seat.cells }) : _wlfFlowTo(life, a, g.sit);
  if (res === 'here' || Math.hypot(a.seat.ax - a.x, a.seat.az - a.z) < 0.5) {
    a.step = { t0: life.t, dur: Math.max(0.6, Math.hypot(a.seat.x - a.x, a.seat.z - a.z) / 1.1), x0: a.x, z0: a.z, x1: a.seat.x, z1: a.seat.z, layer: a.layer, sit: bid };
    a.host = bid;
    return;
  }
  if (res === 'fail') { _wlfReleaseSeat(life, a); _wlfFail(life, a); return; }
  _wlfKeepMoving(life, a);
}
function _wlfStopById(life, id) {
  var T = life.traffic; if (!T) return null;
  for (var i = 0; i < T.stops.length; i++) if (T.stops[i].id === id || id === 'any') return T.stops[i];
  return null;
}
function _wlfWaitGoal(life, a, g, dt) {
  var st = a.stop || _wlfStopById(life, g.wait != null ? g.wait : (a.lastStop || 'any'));
  if (!st) { _wlfNextGoal(life, a); return; }
  a.stop = st; a.lastStop = st.id;
  if (a.boardTo) {
    var v = life.byId.get(a.boardTo);
    if (!v || v.dead || v.departed) { a.boardTo = null; return; }
    var door = _wlfDoorOf(life, v, st), res = _wlfPathTo(life, a, door[0], door[1]);
    if (res === 'here' || Math.hypot(door[0] - a.x, door[1] - a.z) < 1.6 || res === 'fail') { a.boarded = true; _wlfQueueLeave(st, a); _wlfAddSpawnPoint(life, a.layer, a.x, a.z); _wlfDespawn(life, a); }
    else if (!(a.brain.states[a.bs] && a.brain.states[a.bs].speed)) _wlfEnter(life, a, _wlfMovingState(a));
    return;
  }
  // far away: a flow field to the stop; there, the queue: the first free slot, shuffling forward as people board (Y4)
  if (Math.hypot(st.x - a.x, st.z - a.z) > 10) {
    if (!st.cells) st.cells = _wlfNearCells(life, a.layer, _wlfFlowR(a), st.x, st.z, 4);
    var rf = st.cells.length ? _wlfFlowTo(life, a, { key: 'stop:' + st.id, cells: st.cells }) : 'fail';
    if (rf === 'fail') { _wlfFail(life, a); return; }
    if (rf === 'go') { _wlfKeepMoving(life, a); return; }
  }
  if (st.waiting.indexOf(a.id) < 0) st.waiting.push(a.id);
  var qi = st.waiting.indexOf(a.id), slot = st.slots[Math.min(qi, st.slots.length - 1)];
  var res2 = _wlfPathTo(life, a, slot[0], slot[1]);
  if (res2 === 'here' || res2 === 'fail' || Math.hypot(slot[0] - a.x, slot[1] - a.z) < 0.4) {
    a.dir = null; a.lookAt = [a.x + st.face[0] * 10 - (st.on.pts ? 0 : 0), a.z + st.face[1] * 10];
    if (a.bs !== 'wait') { a.bs = 'wait'; a.clip = 'idle'; a.spd = 0; a.st = 1e9; }
    if (res2 === 'fail') a.wait = life.t + 1;
  } else if (!(a.brain.states[a.bs] && a.brain.states[a.bs].speed)) _wlfEnter(life, a, _wlfMovingState(a));   // shuffle up the queue
}
function _wlfQueueLeave(st, a) { var i = st.waiting.indexOf(a.id); if (i >= 0) st.waiting.splice(i, 1); }
function _wlfDoorOf(life, v, st) { return st ? st.door : [v.x, v.z]; }
function _wlfEnterGoal(life, a, g) {
  var b = _wlfEntity(life, g.enter);
  var res = b ? _wlfFlowTo(life, a, g.enter) : _wlfFlowTo(life, a, 'door');
  if (res === 'here') { a.entered = true; _wlfAddSpawnPoint(life, a.layer, a.x, a.z); life.bus.emit('enter', { id: a.id, x: a.x, z: a.z, door: g.enter }); _wlfDespawn(life, a); return; }
  if (res === 'fail') { _wlfFail(life, a); return; }
  _wlfKeepMoving(life, a);
}
/** fish / feed: go to the bank by the water, face it, and stay; feeding draws ducks and swans (M6). */
function _wlfBankGoal(life, a, g, dt) {
  if (!a.bank) {
    var water = g.fish != null ? g.fish : g.feed, s = _wlfSurface(life, water), e = _wlfEntity(life, water);
    // a swim (an entity) is where it is; on a water surface: feeding goes where the birds are, fishing near the angler, and
    // both on THAT water's bank, in view
    var ref = e ? [e.x, e.z] : g.feed != null ? (_wlfBirdsAt(life, a, s ? water : null) || [a.x, a.z]) : [a.x, a.z];
    a.bank = _wlfBankSpot(life, a, ref, s && s.kind === 'water' ? water : null);
    if (!a.bank) { _wlfFail(life, a); return; }
  }
  var res = _wlfPathTo(life, a, a.bank[0], a.bank[1]);
  if (res === 'go') { _wlfKeepMoving(life, a); return; }
  if (res === 'fail') { a.bank = null; _wlfFail(life, a); return; }
  var stName = g.fish != null ? 'fish' : 'feed';
  if (a.bs !== stName) { a.bs = stName; a.clip = stName; a.spd = 0; a.gdur = worldLifeRange(a.rng, g['for'] != null ? g['for'] : [40, 120]); a.st = a.gdur; }
  a.lookAt = [a.bank[2], a.bank[3]];
  if (g.feed != null && (!a.fedT || life.t - a.fedT > 2)) { a.fedT = life.t; life.bus.emit('feed', { id: a.id, x: a.bank[2], z: a.bank[3], r: 25, t: life.t }); }
  if (a.st <= 0) { a.bank = null; _wlfEnter(life, a, a.brain.start); _wlfNextGoal(life, a); }
}
function _wlfCentroid(s) { var p = s.poly || s.path, x = 0, z = 0; for (var i = 0; i < p.length; i++) { x += p[i][0]; z += p[i][1]; } return [x / p.length, z / p.length]; }
/** A walkable cell within 1.6 m of open water, near a reference point: [x, z, waterX, waterZ]. */
function _wlfBankSpot(life, a, ref, waterId) {
  var cells = _wlfCells(life, a.layer, _wlfFlowR(a), null), best = null, bd = Infinity;
  for (var c = 0; c < cells.length; c += 2) {
    var x = cells[c], z = cells[c + 1], d = Math.hypot(x - ref[0], z - ref[1]);
    if (d >= bd) continue;
    for (var k = 0; k < 8; k++) {
      var an = k * Math.PI / 4, wx = x + Math.cos(an) * 1.6, wz = z + Math.sin(an) * 1.6;
      if (worldLifeOk(life, 'swim', wx, wz, 0.1) && (!waterId || _wlfSurfAt(life, 'swim', wx, wz) === waterId)) { bd = d; best = [x, z, wx, wz]; break; }
    }
  }
  return best;
}
/** Where the water birds that come to food are (the middle of the nearest few on that water), or null. */
function _wlfBirdsAt(life, a, waterId) {
  var pts = [];
  for (var i = 0; i < life.agents.length; i++) {
    var o = life.agents[i];
    if (o.dead || !o.brain.react || !o.brain.react.feed || o.layer !== 'swim') continue;
    if (waterId && _wlfSurfAt(life, 'swim', o.x, o.z) !== waterId) continue;
    pts.push([Math.hypot(o.x - a.x, o.z - a.z), o.x, o.z]);
  }
  if (!pts.length) return null;
  pts.sort(function (p, q) { return p[0] - q[0]; });
  var n = Math.min(3, pts.length), x = 0, z = 0;
  for (var j = 0; j < n; j++) { x += pts[j][1]; z += pts[j][2]; }
  return [x / n, z / n];
}
function _wlfViewGoal(life, a, g, dt) {
  var tgt = g.view, p = null;
  if (Array.isArray(tgt)) p = tgt;
  else if (typeof tgt === 'number') { var hb = tgt * Math.PI / 180; p = [a.x + Math.sin(hb) * 30, a.z + Math.cos(hb) * 30]; }
  else { var e = _wlfEntity(life, tgt), s = _wlfSurface(life, tgt); p = e ? [e.x, e.z] : s ? _wlfCentroid(s) : null; }
  if (g.here || !p) p = p && !g.here ? p : [a.x + Math.sin(a.heading) * 25, a.z + Math.cos(a.heading) * 25];
  if (!g.here && !a.viewAt) {
    // a spot to view from: the nearest walkable cell 3-12 m from the point of interest
    var cells = _wlfCells(life, a.layer, _wlfFlowR(a), null), best = null, bd = Infinity;
    for (var c = 0; c < cells.length; c += 2) { var d = Math.hypot(cells[c] - p[0], cells[c + 1] - p[1]), sc = Math.abs(d - 6) + Math.hypot(cells[c] - a.x, cells[c + 1] - a.z) * 0.05; if (d >= 2.5 && sc < bd) { bd = sc; best = [cells[c], cells[c + 1]]; } }
    a.viewAt = best || [a.x, a.z];
  }
  if (a.viewAt && !g.here) {
    var res = _wlfPathTo(life, a, a.viewAt[0], a.viewAt[1]);
    if (res === 'go') { _wlfKeepMoving(life, a); return; }
    if (res === 'fail') { a.viewAt = null; _wlfFail(life, a); return; }
  }
  if (a.bs !== 'look' || a.gdur == null) { _wlfEnter(life, a, a.brain.states.look ? 'look' : _wlfStillState(a)); a.gdur = worldLifeRange(a.rng, g['for'] != null ? g['for'] : [10, 40]); a.st = a.gdur; a.viewPoi = p; }
  a.lookAt = a.viewPoi || p;
  if (a.st <= 0) { a.viewAt = null; a.viewPoi = null; a.gdur = null; _wlfEnter(life, a, a.brain.start); _wlfNextGoal(life, a); }
}
/** Group members keep their slot round the leader; they stop when it stops and look where it looks (A7). */
function _wlfFollowBrain(life, a, dt) {
  var L = a.leader;
  if (L.step && L.step.sit) { a.lookAt = [L.x, L.z]; }
  if (a.lead) {                                                              // a dog: roams within its lead round the walker
    // held up (wanting to move, not moving) for half a second, or at an edge of the frame: a new spot near the walker
    if (a.dir && a.speed < 0.05) { a.heldT = (a.heldT || 0) + dt; if (a.heldT > 0.5) { a.roam = null; a.heldT = 0; a.roamNear = true; } } else a.heldT = 0;
    if (_wlfInEdgeZone(life, a) && a.roam && life.t + 1.5 < a.roam.until) { a.roam.until = life.t; a.roamNear = true; }
    if (!a.roam || life.t > a.roam.until) {
      var ang = a.rng() * Math.PI * 2, rr = Math.max(0.65, a.lead.len * (a.roamNear ? 0.2 + 0.2 * a.rng() : 0.35 + 0.5 * a.rng()));   // never a spot inside the walker
      a.roam = { dx: Math.cos(ang) * rr, dz: Math.sin(ang) * rr, until: life.t + 2 + a.rng() * 3 }; a.roamNear = false;
    }
    var tx = L.x + a.roam.dx, tz = L.z + a.roam.dz;
    if (!_wlfOk(life, a, tx, tz)) { var sp = _wlfSlotPoint(life, a); tx = sp[0]; tz = sp[1]; }
    var dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
    if (d < 0.25 && _wlfInEdgeZone(life, a)) {
      // never sniffing half out of the frame: back in towards the middle, beside the walker
      a.roam = null; var inX = L.x - Math.sign(L.x || 1) * 0.7;
      if (_wlfOk(life, a, inX, L.z)) { tx = inX; tz = L.z; } else { tx = L.x; tz = L.z; }
      dx = tx - a.x; dz = tz - a.z; d = Math.hypot(dx, dz);
      if (d < 0.05) { dx = -Math.sign(a.x || 1); dz = 0; d = 1; }
    }
    if (d < 0.25) { a.dir = null; if (a.bs === 'walk') _wlfEnter(life, a, 'sniff'); a.st = Math.max(a.st, 0.5); return; }
    if (a.bs !== 'walk') _wlfEnter(life, a, 'walk');
    a.dir = [dx / d, dz / d]; a.spd = _wlfClamp(L.speed + d * 0.9, 0.6, 2.6);
    // a post, a bench or a bollard between the dog and its spot: round it by a route (the straight line pressed the dog against it for good)
    if (d > 0.5 && !_wlfLine(life, a, a.x, a.z, tx, tz)) { var rq = _wlfPathTo(life, a, Math.round(tx * 2) / 2, Math.round(tz * 2) / 2); if (rq !== 'go') { a.dir = [dx / d, dz / d]; } }
    return;
  }
  if (a.kind === 'swimmer' || a.kind === 'wader' || (a.brain.group && (a.brain.group.kind === 'loose' || a.brain.group.kind === 'pair'))) return _wlfLooseBrain(life, a, dt);
  var p = _wlfSlotPoint(life, a), dx2 = p[0] - a.x, dz2 = p[1] - a.z, d2 = Math.hypot(dx2, dz2);
  var lst = L.brain.states[L.bs], lmoving = lst && lst.speed && L.speed > 0.1;
  if (!lmoving && d2 < 0.3 && _wlfInEdgeZone(life, a)) {
    // the leader stopped with this member's slot across a frame edge: the other side of the leader, or just behind it
    var alt = [[L.x - (p[0] - L.x), L.z - (p[1] - L.z)], [L.x - Math.sin(L.heading) * 0.9, L.z - Math.cos(L.heading) * 0.9], [L.x - Math.sign(L.x || 1) * 0.8, L.z]];
    var found = false;
    for (var ai = 0; ai < alt.length; ai++) if (_wlfOk(life, a, alt[ai][0], alt[ai][1]) && !_wlfInEdgeZone(life, { layer: a.layer, x: alt[ai][0], z: alt[ai][1] })) { p = alt[ai]; found = true; break; }
    if (!found && !L.host && !L.step) { L.st = 0; L.gdur = L.gdur != null && L.bs !== 'sit' ? 0 : L.gdur; }   // no room: the group walks on
    dx2 = p[0] - a.x; dz2 = p[1] - a.z; d2 = Math.hypot(dx2, dz2);
  }
  if (d2 < 0.3 && !lmoving) {
    a.dir = null;
    var still = L.bs === 'chat' && a.brain.states.chat ? 'chat' : a.brain.states.idle ? 'idle' : _wlfStillState(a);
    if (a.bs !== still) _wlfEnter(life, a, still);
    a.st = Math.max(a.st, 0.5);
    a.lookAt = L.bs === 'chat' ? [L.x, L.z] : L.lookAt;
    return;
  }
  var mv = a.brain.states.walk ? 'walk' : a.brain.states.swim ? 'swim' : a.brain.start;
  if (a.bs !== mv) _wlfEnter(life, a, mv);
  a.lookAt = null;
  if (d2 < 0.05) { a.dir = null; return; }
  a.dir = [dx2 / d2, dz2 / d2];
  // catching up its slot at a stride, not a sprint: a leader's pace plus what the gap asks, never more than half as much again and a step
  a.spd = _wlfClamp(Math.max(L.speed, 0.3) + (d2 - 0.2) * 1.2, 0, Math.min((a.brain.states[mv].speed ? a.brain.states[mv].speed[1] : 1.5) * 1.5, Math.max(L.speed, 0.5) * 1.5 + 0.35));
  // a post or a bench between the member and its slot: round it by a route
  if (d2 > 0.8 && d2 <= 6 && !_wlfLine(life, a, a.x, a.z, p[0], p[1])) { var rm = _wlfPathTo(life, a, Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2); if (rm !== 'go') a.dir = [dx2 / d2, dz2 / d2]; }
  if (d2 > 6) { var res = _wlfPathTo(life, a, p[0], p[1]); if (res === 'fail') a.dir = [dx2 / d2, dz2 / d2]; }
}

/** A loose group (ducks, geese, pigeons) or a pair (swans): each keeps its own states and drifts round the leader. */
function _wlfLooseBrain(life, a, dt) {
  var L = a.leader, b = a.brain, R = b.group && b.group.kind === 'pair' ? 1.4 : 3.2;
  var edge = _wlfInEdgeZone(life, a);
  if (a.st <= 0) { var st = b.states[a.bs]; _wlfEnter(life, a, st && st.next ? worldLifePick(a.rng, st.next) : b.start); }
  var far = Math.hypot(L.x - a.x, L.z - a.z);
  var stt = b.states[a.bs];
  // never dabbling or preening half out of the frame (C2): a member at an edge keeps swimming, in towards the group
  if ((far > R * 2.2 || edge) && !(stt && stt.speed)) { var mv = b.states.swim ? 'swim' : b.states.walk ? 'walk' : b.start; _wlfEnter(life, a, mv); stt = b.states[a.bs]; }
  if (!stt || !stt.speed) return;
  if (!a.roam || life.t > a.roam.until) { var ang = a.rng() * Math.PI * 2, rr = R * (0.3 + 0.7 * a.rng()); a.roam = { dx: Math.cos(ang) * rr, dz: Math.sin(ang) * rr, until: life.t + 4 + a.rng() * 6 }; }
  var tx = L.x + a.roam.dx, tz = L.z + a.roam.dz;
  if (!_wlfOk(life, a, tx, tz) || _wlfInEdgeZone(life, { layer: a.layer, x: tx, z: tz })) { tx = L.x; tz = L.z; a.roam = null; }
  var dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
  if (d < 0.3 && edge && !_wlfInEdgeZone(life, L)) { a.roam = null; return; }
  if (d < 0.3) { a.roam = null; if (!edge) _wlfEnter(life, a, _wlfStillState(a)); else { var inX = a.x - Math.sign(a.x || 1) * 2; if (_wlfOk(life, a, inX, a.z)) a.dir = [-Math.sign(a.x || 1), 0]; } return; }
  if (d > 5 && !_wlfLine(life, a, a.x, a.z, tx, tz)) { if (_wlfPathTo(life, a, tx, tz) !== 'go') a.dir = null; }
  else a.dir = [dx / d, dz / d];
  if (far > R * 2) a.spd = Math.max(a.spd, (stt.speed[1] || 0.5) * 1.3);
}

/* ---------- air: perchers and flyers (A8) ---------- */
/** Perch points from the knowledge base (worldKb(id).perch: [[u, y, v]] in the entity's frame, u along its facing, v to its
 *  right); without the knowledge base, by world class (posts, lamps, fences, walkways, trees, buildings). */
function _wlfPerches(life) {
  if (life._perches) return life._perches;
  var out = [], ents = (life.world && life.world.entities) || [], kbOn = typeof worldKb === 'function';
  for (var i = 0; i < ents.length; i++) {
    var e = ents[i], pts = null;
    if (kbOn) { var kb = _wlfKb(e.obj); pts = kb && Array.isArray(kb.perch) ? kb.perch : null; }
    else pts = _wlfPerchByClass(e);
    if (!pts || !pts.length) continue;
    var f = (Number.isFinite(e.facing) ? e.facing : 90) * Math.PI / 180, hx = Math.sin(f), hz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
    for (var j = 0; j < pts.length; j++) {
      var p = pts[j]; if (!Array.isArray(p) || p.length < 2) continue;
      var u = p[0] || 0, y = p.length > 2 ? p[1] : p[1], v = p.length > 2 ? p[2] : 0;
      out.push({ id: (e.id || e.obj) + '#' + j, host: e.id || null, x: e.x + u * hx + v * rx, z: e.z + u * hz + v * rz, y: (Number.isFinite(e.y) ? e.y : 0) + y, cls: e.cls });
    }
  }
  life._perches = out;
  return out;
}
function _wlfPerchByClass(e) {
  var sz = e.size || {}, h = e.height || sz.h || 1, w = sz.w || 1, d = sz.d || 1;
  switch (e.cls) {
    case 'post': case 'lamp': return [[0, h, 0]];
    case 'fence': case 'gate': return [[-w * 0.45, h, 0], [w * 0.45, h, 0]];
    case 'walkway': { var dy = e.deck && Number.isFinite(e.deck.y) ? e.deck.y - (e.y || 0) : Math.min(h, 1.2); return [[-w * 0.45, dy + 1, d * 0.45], [w * 0.45, dy + 1, -d * 0.45]]; }
    case 'tree': return [[w * 0.3, h * 0.45, 0], [-w * 0.25, h * 0.55, d * 0.2]];
    case 'building': return [[0, h, 0], [w * 0.3, h * 0.92, 0]];
    case 'bench': return [[0, h, 0]];
    default: return null;
  }
}
function _wlfNearWater(life, x, z, R) {
  for (var rr = 0.5; rr <= R; rr += 0.75) for (var k = 0; k < 8; k++) { var an = k * Math.PI / 4; if (worldLifeOk(life, 'swim', x + Math.cos(an) * rr, z + Math.sin(an) * rr, 0.05)) return [x + Math.cos(an) * rr, z + Math.sin(an) * rr]; }
  return null;
}
/** The perches a bird may use (kingfisher: low, by the water; others: high). */
function _wlfBirdPerches(life, a) {
  var P = _wlfPerches(life), rule = a.brain.perch || {}, out = [];
  for (var i = 0; i < P.length; i++) {
    var p = P[i];
    if (rule.maxY != null && p.y > rule.maxY) continue;
    if (rule.nearWater != null) { var w = _wlfNearWater(life, p.x, p.z, rule.nearWater); if (!w) continue; p.water = w; }
    out.push(p);
  }
  return out;
}
function _wlfAirInit(life, a, pop) {
  if (a.kind === 'percher') {
    var ps = _wlfBirdPerches(life, a).filter(function (p) { return !life.perchTaken.has(p.id); });
    if (!ps.length) { _wlfProblem(life, { pop: pop.idx, rule: 'noPerch', msg: a.who + ' needs a perch point (a post, branch, rail or roof by the water)' }); return false; }
    var hp = ps[Math.floor(pop.rng() * ps.length)];
    a.perch = hp; a.home = hp; life.perchTaken.set(hp.id, a.id);
    a.x = hp.x; a.z = hp.z; a.alt = hp.y; a.layer = 'air'; a.px = a.x; a.pz = a.z;
    return true;
  }
  // a flyer circles above every volume within its circle
  var cells = _wlfCells(life, 'swim', 0.15, null); if (!cells.length) cells = _wlfCells(life, 'walk', 0.25, null);
  var cx = 0, cz = 40;
  if (cells.length) { var c = Math.floor(pop.rng() * cells.length / 2) * 2; cx = cells[c]; cz = Math.max(20, cells[c + 1]); }
  var R = 12 + pop.rng() * 20, top = _wlfTopIn(life, cx, cz, R + 4);
  a.circle = { x: cx, z: cz, R: R, w: (pop.rng() < 0.5 ? -1 : 1) * (0.12 + pop.rng() * 0.1) };
  a.alt = Math.max(worldLifeRange(pop.rng, a.brain.alt || [14, 30]), top + 5);
  var ang = pop.rng() * Math.PI * 2; a.circle.a = ang;
  a.x = cx + Math.cos(ang) * R; a.z = cz + Math.sin(ang) * R; a.layer = 'air'; a.px = a.x; a.pz = a.z;
  return true;
}
/** Building and tree volumes (flight round them, A8): { x, z, r, y0, y1, poly? }. */
function _wlfVolumes(life) {
  if (life._vols) return life._vols;
  var out = [], ents = (life.world && life.world.entities) || [];
  for (var i = 0; i < ents.length; i++) {
    var e = ents[i], sz = e.size || {}, h = e.height || sz.h || 0, y0 = Number.isFinite(e.y) ? e.y : 0;
    if (e.cls === 'tree') { var cr = Math.max(0.8, Math.min(sz.w || 4, sz.d || 4) / 2 * 0.85); out.push({ x: e.x, z: e.z, r: cr, y0: y0 + h * 0.3, y1: y0 + h }); out.push({ x: e.x, z: e.z, r: Math.max(0.3, e.r || 0.3), y0: y0, y1: y0 + h * 0.4 }); continue; }
    if (h < 2 || !(e.cls === 'building' || e.cls === 'landmark' || e.cls === 'structure' || e.cls === 'walkway' || e.cls === 'boat' || e.solidity === 'solid')) continue;
    var foot = e.foot || [[e.x, e.z]], rr = 0;
    for (var j = 0; j < foot.length; j++) rr = Math.max(rr, Math.hypot(foot[j][0] - e.x, foot[j][1] - e.z));
    out.push({ x: e.x, z: e.z, r: Math.max(0.5, rr), y0: y0, y1: y0 + h, poly: foot.length >= 3 ? foot : null });
  }
  life._vols = out;
  return out;
}
function _wlfTopIn(life, x, z, R) { var V = _wlfVolumes(life), t = 0; for (var i = 0; i < V.length; i++) if (Math.hypot(V[i].x - x, V[i].z - z) < R + V[i].r) t = Math.max(t, V[i].y1); return t; }
function _wlfInVol(v, x, y, z) {
  if (y < v.y0 - 0.3 || y > v.y1 + 0.3) return false;
  if (Math.hypot(x - v.x, z - v.z) > v.r + 0.3) return false;
  if (!v.poly) return true;
  var c = false, p = v.poly; for (var i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  return c;
}
/** The first volume a straight flight from A to B enters (sampled every 0.4 m), or null. */
function _wlfFlightHit(life, A, B, skip) {
  var V = _wlfVolumes(life), L = Math.hypot(B[0] - A[0], B[2] - A[2], B[1] - A[1]), n = Math.max(1, Math.ceil(L / 0.4));
  for (var s = 1; s < n; s++) {
    var t = s / n, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t, z = A[2] + (B[2] - A[2]) * t;
    for (var i = 0; i < V.length; i++) if (V[i] !== skip && _wlfInVol(V[i], x, y, z)) return V[i];
  }
  return null;
}
/** A flight from A to B ([x, y, z]) round building and tree volumes: over a low one, else round its side. */
function _wlfFlightPlan(life, A, B, maxAlt) {
  var hit = _wlfFlightHit(life, A, B);
  if (!hit) return [B];
  var over = hit.y1 + 1.2;
  if (over <= maxAlt) { var W1 = [A[0], over, A[2]], W2 = [B[0], over, B[2]]; if (!_wlfFlightHit(life, A, W1) && !_wlfFlightHit(life, W1, W2) && !_wlfFlightHit(life, W2, B)) return [W1, W2, B]; }
  var dx = B[0] - A[0], dz = B[2] - A[2], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, ux = dx / L, uz = dz / L;
  var pts = hit.poly || [[hit.x + hit.r, hit.z], [hit.x - hit.r, hit.z], [hit.x, hit.z + hit.r], [hit.x, hit.z - hit.r]];
  var best = null;
  for (var s = -1; s <= 1; s += 2) {
    // how far the volume reaches to this side of the line, and its extent along it
    var off = 0, t0 = Infinity, t1 = -Infinity;
    for (var i = 0; i < pts.length; i++) { var px = pts[i][0] - A[0], pz = pts[i][1] - A[2], o = (px * nx + pz * nz) * s, t = px * ux + pz * uz; off = Math.max(off, o); t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
    var d = off + 1.5, y = Math.max(A[1], B[1]);
    var W1 = [A[0] + ux * (t0 - 1.5) + nx * s * d, y, A[2] + uz * (t0 - 1.5) + nz * s * d], W2 = [A[0] + ux * (t1 + 1.5) + nx * s * d, y, A[2] + uz * (t1 + 1.5) + nz * s * d];
    if (!_wlfFlightHit(life, A, W1) && !_wlfFlightHit(life, W1, W2) && !_wlfFlightHit(life, W2, B)) { var len = Math.hypot(W1[0] - A[0], W1[2] - A[2]) + Math.hypot(W2[0] - W1[0], W2[2] - W1[2]) + Math.hypot(B[0] - W2[0], B[2] - W2[2]); if (!best || len < best.len) best = { len: len, plan: [W1, W2, B] }; }
  }
  return best ? best.plan : null;
}
function _wlfAirBrain(life, a, dt) {
  var b = a.brain;
  if (a.kind === 'flyer') { a.bs = 'fly'; return; }
  var g = _wlfGoal(a);
  if (g && g['do'] != null && b.states[g['do']] && !a.flight) {
    if (a.bs !== g['do'] || a.gdur == null) { _wlfEnter(life, a, g['do']); a.gdur = worldLifeRange(a.rng, g['for'] != null ? g['for'] : [5, 20]); a.st = a.gdur; }
    if (a.st <= 0) { a.gdur = null; a.gi = (a.gi + 1) % a.goals.length; a.gt = 0; }
  } else if (a.st <= 0 && !a.flight) {
    var st = b.states[a.bs];
    _wlfEnter(life, a, st && st.next ? worldLifePick(a.rng, st.next) : b.start);
  }
  if (a.bs === 'fly' && !a.flight) {
    var ps = _wlfBirdPerches(life, a).filter(function (p) { var by = life.perchTaken.get(p.id); return (!by || by === a.id) && p !== a.perch; });
    if (!ps.length) { _wlfEnter(life, a, 'perch'); return; }
    var to = ps[Math.floor(a.rng() * ps.length)];
    var plan = _wlfFlightPlan(life, [a.x, a.alt, a.z], [to.x, to.y, to.z], 6);
    if (!plan) { _wlfEnter(life, a, 'perch'); a.st = 3; return; }
    if (a.perch) life.perchTaken.delete(a.perch.id);
    life.perchTaken.set(to.id, a.id);
    a.flight = { pts: plan, i: 0, to: to }; a.spd = worldLifeRange(a.rng, b.states.fly.speed);
    life.bus.emit('lift', { id: a.id, x: a.x, z: a.z });
  }
  if (a.bs === 'dive' && !a.diveT) {
    var w = a.perch && (a.perch.water || _wlfNearWater(life, a.perch.x, a.perch.z, 3));
    if (!w) { _wlfEnter(life, a, 'perch'); return; }
    a.diveT = { t0: life.t, dur: Math.max(0.8, a.st), w: w };
  }
}

/* ---------- the move pass ---------- */
function _wlfMove(life, a, dt) {
  var ox = a.x, oz = a.z;
  if (a.kind === 'lane' || a.kind === 'rail') return;                            // traffic moves these
  if (a.kind === 'moored') { a.vx = 0; a.vz = 0; a.speed = 0; _wlfFace(life, a); return; }
  // every path that moves a mover keeps the SHOWN velocity (what the records and the animation read): a bird in a hop, a flight or a step
  // aboard was drawn flying while its shown velocity was still the 0 of the moment before (pigeons 'flying' while still)
  if (a.layer === 'air' && !a.hop) { _wlfAirMove(life, a, dt); _wlfShownV(a, dt); _wlfFace(life, a); return; }
  if (a.step) { _wlfStepMove(life, a, dt); _wlfShownV(a, dt); _wlfFace(life, a); return; }
  if (a.hop) { _wlfHopMove(life, a, dt); _wlfShownV(a, dt); _wlfFace(life, a); return; }
  if (a.fadeOut) {
    if (life.t - a.fadeOut >= 0.6) { _wlfDespawn(life, a); return; }
    a.vx = 0; a.vz = 0; a.speed = 0; _wlfFace(life, a); return;
  }
  var dir = a.dir, b = a.brain;
  var want = dir ? a.spd : 0;
  if (dir && !want) { var mv = b.states.walk || b.states.swim || b.states.stalk || b.states.ride || b.states.cruise; if (mv && mv.speed && (a.leaving || a.leader)) want = Math.max(0.4, worldLifeRange(a.rng, mv.speed) * a.gait); }
  // boats: the middle of the channel at walking pace; wakes (A9)
  if (a.kind === 'boat' && dir && typeof worldTrafficBoatSteer === 'function') dir = worldTrafficBoatSteer(life.nav, a.layer, a.x, a.z, dir, a.r, { meet: _wlfBoatMeet(life, a) });
  // arrive: ease into a stop (Y4)
  if (dir && want > 0 && a.distLeft != null && a.distLeft < 50 && !a.leaving && !a.leader) want *= Math.max(0.35, a.distLeft / 50);
  if (a.members && want > 0) for (var mi = 0; mi < a.members.length; mi++) { var mm = a.members[mi]; if (mm.lead && !mm.dead && Math.hypot(mm.x - a.x, mm.z - a.z) > mm.lead.len * 0.9) { want *= 0.2; break; } }   // a taut lead: the walker waits for its dog
  var wantRaw = want;
  if (dir && want > 0) { dir = _wlfSteer(life, a, dir, want); want *= a.slow; }   // a queue eases off; being held up still counts as wanting to move (stuck)
  if (dir && want > 0 && a.kind === 'walker' && _wlfPinchYield(life, a, dir)) { want = 0; a.slow = 0; }   // waits at the mouth of a gap for the one coming through it
  // the walker steps aside for a ringing cyclist (keeps to its left)
  if (dir && a.yieldT > life.t) { var lx = -dir[1], lz = dir[0], nx0 = dir[0] + lx * 0.6 * a.yieldSide, nz0 = dir[1] + lz * 0.6 * a.yieldSide, nl = Math.hypot(nx0, nz0) || 1; dir = [nx0 / nl, nz0 / nl]; }
  // turn rate: 180 degrees in brain.turn seconds; slow down while turning (no instant turns)
  var cur = a.heading, des = dir ? Math.atan2(dir[0], dir[1]) : cur;
  var diff = _wlfAng(des - cur), maxd = Math.PI / b.turn * dt;
  if (diff > maxd) diff = maxd; else if (diff < -maxd) diff = -maxd;
  a.heading = _wlfAng(cur + diff);
  // a hull never swings into a solid (its sides sweep as it turns): it keeps its heading until the turn is clear
  if (a.kind === 'boat' && diff && _wlfKeelBad(life, a, a.x, a.z, a.heading) > _wlfKeelBad(life, a, a.x, a.z, cur)) a.heading = cur;
  var rem = Math.abs(_wlfAng(des - a.heading));
  var spd = dir ? want * Math.max(0, Math.cos(Math.min(rem, Math.PI / 2))) : 0;
  // ease the speed (M7: never instant)
  var accel = a.kind === 'boat' ? 0.25 : 2.5;
  a.v = a.v == null ? spd : (a.v < spd ? Math.min(spd, a.v + accel * dt) : Math.max(spd, a.v - accel * 1.6 * dt));
  a.turning = !!dir && rem > Math.PI / 4;
  if (a.v > 0 && dir) {
    var vx = Math.sin(a.heading) * a.v, vz = Math.cos(a.heading) * a.v;
    var np = typeof worldStep === 'function' ? worldStep(life.nav, a.layer, [a.x, a.z], [vx, vz], _wlfNavR(a), dt) : [a.x + vx * dt, a.z + vz * dt];
    if (np && _wlfOk(life, a, np[0], np[1])) { a.x = np[0]; a.z = np[1]; }
    // held up or slid off the planned line: the steering point is planned again next tick (from where it really is)
    if (a.route && a.route.tk != null && Math.hypot(a.x - ox, a.z - oz) < a.v * dt * 0.7) a.route.tk = -1;
  }
  // the sidestep: a shuffle to one side to let a mover by (the other side when that cell is forbidden)
  if (dir && a.sideV > 0.01 && a.kind === 'walker') {
    var sd = a.sideDir, st2 = a.sideV * dt, sdx = a.sideX * sd * st2, sdz = a.sideZ * sd * st2;
    if (!_wlfTryAt(life, a, a.x + sdx, a.z + sdz)) _wlfTryAt(life, a, a.x - sdx, a.z - sdz);
  }
  // the dog stays within its lead (A7)
  if (a.lead && a.leader && !a.leader.dead) _wlfLeash(life, a, dt);
  a.vx = (a.x - ox) / dt; a.vz = (a.z - oz) / dt; a.speed = Math.hypot(a.vx, a.vz);
  _wlfShownV(a, dt);
  a.y = worldLifeY(life, a);
  if (a.kind === 'boat' && a.speed > 0.2 && (!a.wakeT || life.t - a.wakeT >= 1)) { a.wakeT = life.t; life.bus.emit('wake', { id: a.id, x: a.x, z: a.z, heading: a.heading * 180 / Math.PI, speed: a.speed, beam: a.r * 2, len: a.len || 18, t: life.t }); }
  _wlfStuck(life, a, wantRaw, dt);
  _wlfFace(life, a);
}
/**
 * The velocity the records SHOW (the animation, the facing and the checkers read it): the real ground velocity, low-passed over
 * 0.2 s, so a one-tick spike (a sidestep, a leash, a push) never flips a walk cycle or a view, and a stop eases (M7). The
 * steering and the goals use the real one (a.vx, a.vz).
 */
function _wlfShownV(a, dt) {
  var k = 1 - Math.exp(-dt / 0.2);
  if (a.svx == null) { a.svx = a.vx; a.svz = a.vz; return; }
  a.svx += (a.vx - a.svx) * k; a.svz += (a.vz - a.svz) * k;
  if (Math.hypot(a.svx, a.svz) < 0.03 && Math.hypot(a.vx, a.vz) < 0.03) { a.svx = 0; a.svz = 0; }
}
function _wlfBoatMeet(life, a) {
  for (var i = 0; i < life.agents.length; i++) { var o = life.agents[i]; if (o !== a && o.kind === 'boat' && !o.dead && Math.hypot(o.x - a.x, o.z - a.z) < 40 && (o.vx * a.vx + o.vz * a.vz) < 0) return true; }
  return false;
}
/**
 * Steering (Y4): seek the route direction, separate from neighbours within personal space, avoid by a velocity obstacle, keep to
 * the LEFT of an oncoming mover (UK) so two walkers pass side by side, and ease off behind something close ahead in the lane
 * (a queue). Sets a.slow, the share of the wanted speed that is safe now (1 = free). The hard floor under all of this is
 * _wlfSeparate: whatever the steering does, two movers never overlap.
 */
function _wlfSteer(life, a, dir, spd) {
  a.slow = 1; a.sideV = 0;
  if (a.brain.heavy || a.layer === 'air') return dir;
  var vx = dir[0] * spd, vz = dir[1] * spd, ax = 0, az = 0, sx = 0, sz = 0, n = 0, ns = 0, kx = 0, kz = 0, nk = 0, hitF = Infinity;
  var ps = (a.brain.space || 1) * life.space * (a.kind === 'swimmer' ? 0.6 : 0.5);
  var rgx = dir[1], rgz = -dir[0];                                   // the right-hand side of the heading (x right, z away)
  var cx = Math.floor(a.x / 2), cz = Math.floor(a.z / 2);
  for (var ix = -1; ix <= 1; ix++) for (var iz = -1; iz <= 1; iz++) {
    var bk = life.hash.get((cx + ix + 4096) * 8192 + (cz + iz + 4096));
    if (!bk) continue;
    for (var j = 0; j < bk.length; j++) {
      var o = bk[j];
      if (o === a || o.layer !== a.layer || o.dead || o === a.leader || o.leader === a || (a.group && o.group === a.group)) continue;
      var rx = o.x - a.x, rz = o.z - a.z, dd = Math.hypot(rx, rz);
      // queue: something close ahead in my lane is a bumper (an oncoming one only when it is dead ahead)
      // oncoming is judged by where the other WANTS to go (its planned direction), not by the velocity it has: two walkers met head on
      // in a gap both stand still, each sees a standing obstacle, neither is 'oncoming' and both wait nose to nose (a deadlock that only a squeeze breaks)
      var ovx = o.vx, ovz = o.vz;
      if (o.dir && o.spd > 0.2 && o.kind === 'walker' && !o.step && !o.fadeOut) { ovx = o.dir[0] * o.spd; ovz = o.dir[1] * o.spd; }
      var fwd = rx * dir[0] + rz * dir[1], lat = rx * rgx + rz * rgz, rs = a.r + o.r, onc = (ovx * dir[0] + ovz * dir[1]) < -0.2;
      // squeezing past (a lane too narrow for two): an oncoming or standing mover is neither queued behind nor swerved round, it is
      // passed shoulder to shoulder; only one going my way (slower) is still followed
      if ((a.squeeze > life.t || o.squeeze > life.t) && (onc || (ovx * dir[0] + ovz * dir[1]) < 0.2 * spd)) continue;
      if (fwd > 0 && fwd < rs + 1 && Math.abs(lat) < (onc ? rs * 0.6 : rs + 0.1)) a.slow = Math.min(a.slow, _wlfClamp((fwd - rs - 0.05) / 0.9, onc ? 0.3 : 0, 1));   // an oncoming one is passed, not waited for
      // a sidestep (people shuffle aside whatever their forward speed): away from the other's side of my line; dead on, to my left
      // (UK) for an oncoming mover and to my right (overtaking) for one going my way slower, or standing
      if (fwd > 0 && fwd < rs + 1.6 && Math.abs(lat) < rs + 0.35 && fwd < hitF && (onc || (o.speed || 0) < spd * 0.8)) {
        hitF = fwd;
        a.sideDir = lat > 0.15 ? -1 : lat < -0.15 ? 1 : onc ? -1 : 1;                       // -1 = to my left, +1 = to my right
        a.sideV = Math.min(0.9, (rs + 0.35 - Math.abs(lat)) * 1.6 + 0.2);
        a.sideX = rgx; a.sideZ = rgz;
      }
      // keep left: an oncoming mover in my way (within a body or so of my line, up to 8 m ahead) is passed on my left side
      if (onc && fwd > 0 && fwd < 8 && Math.abs(lat) < rs + 1 && nk < 4) { var kw = (1 - fwd / 8) * 1.1; kx -= rgx * kw; kz -= rgz * kw; nk++; }
      // separation (personal space)
      var minD = a.r + o.r + ps;
      if (dd < minD && dd > 1e-4 && ns < 6) { var w0 = (minD - dd) / minD; sx -= rx / dd * w0; sz -= rz / dd * w0; ns++; }
      if (n >= 6) continue;
      var rvx = o.vx - vx, rvz = o.vz - vz, rr = a.r + o.r + 0.15, vv = rvx * rvx + rvz * rvz;
      var tca = vv > 1e-6 ? -(rx * rvx + rz * rvz) / vv : 0;
      if (tca < 0) tca = 0;
      if (tca > 1.5) continue;
      var mx = rx + rvx * tca, mz = rz + rvz * tca, md = Math.hypot(mx, mz);
      if (md >= rr) continue;
      n++;
      var w = (rr - md) / rr * (1.5 - tca) / 1.5 * (o.brain.heavy ? 3 : 1);
      var px = -mx, pz = -mz;
      if (md < 1e-3) { px = -dir[1]; pz = dir[0]; }                    // dead on: to my left (UK)
      var pl = Math.hypot(px, pz) || 1;
      ax += px / pl * w; az += pz / pl * w;
    }
  }
  if (!n && !ns && !nk) return dir;
  var nx = dir[0] + ax * 1.5 + sx * 0.8 + kx, nz = dir[1] + az * 1.5 + sz * 0.8 + kz, l = Math.hypot(nx, nz);
  if (l < 1e-6) return dir;
  nx /= l; nz /= l;
  // never steer backwards against the route (keeps progress)
  if (nx * dir[0] + nz * dir[1] < 0) { var tx = -dir[1], tz = dir[0], sgn = (nx * tx + nz * tz) >= 0 ? 1 : -1; nx = (dir[0] * 0.2 + tx * sgn); nz = (dir[1] * 0.2 + tz * sgn); var l2 = Math.hypot(nx, nz); nx /= l2; nz /= l2; }
  return [nx, nz];
}
/**
 * The watchdog: a mover with somewhere to go that makes no headway for 10 s is retired (it fades out and is logged), never left
 * standing in the scene. The steering, the stuck handler and the goals all try first; this is the net under them, so a geometry
 * nobody foresaw (a pinched bend, a wedged hull, an unreachable goal) can make a scene emptier, never wrong.
 */
var WORLD_LIFE_WATCHDOG_S = 10;
function _wlfWatchdog(life, a) {
  if (a.fadeOut || _wlfIntent(a) !== 'travel' || (a.yieldPinch != null && life.t - a.yieldPinch < 0.5)) { a.wdT = life.t; a.wdX = a.x; a.wdZ = a.z; return; }
  if (a.wdT == null || Math.hypot(a.x - a.wdX, a.z - a.wdZ) > 0.6) { a.wdT = life.t; a.wdX = a.x; a.wdZ = a.z; return; }
  if (life.t - a.wdT > WORLD_LIFE_WATCHDOG_S) {
    _wlfProblem(life, { pop: a.pop, rule: 'stuckRetired', msg: a.id + ' (' + a.cls + ') made no headway for ' + WORLD_LIFE_WATCHDOG_S + ' s at ' + a.x.toFixed(1) + ', ' + a.z.toFixed(1) + ': retired' });
    a.fadeOut = life.t;
  }
}
/* ---------- hard personal space (Y4): movers on one layer never overlap ---------- */
/** The floor under the soft steering: after every move pass, two movers on one layer and level that overlap are pushed apart
 *  (a standing or seated one gives way less than a walking one; one wedged against a wall gives its share to the other).
 *  Pairs of one group (a couple, a dog and its walker, a flock) keep a closer floor. Never into a forbidden cell. */
var WORLD_LIFE_BODY = 1.2;           // the floor between two unrelated people is 1.2 x the sum of their radii (shoulder room)
var WORLD_LIFE_PUSH_MAX = 0.2;       // metres a mover is pushed in one pass
function _wlfMass(a) {
  if (a.step || a.bs === 'sitting' || a.bs === 'freeze' || a.bs === 'strike' || a.bs === 'fish') return Infinity;
  return (a.speed || 0) > 0.25 ? 1 : 2.2;
}
function _wlfTryAt(life, a, x, z) { if (_wlfOk(life, a, x, z)) { a.x = x; a.z = z; return true; } return false; }
function _wlfRelated(a, o) { return a.leader === o || o.leader === a || (a.group && (a.group === o.id || a.group === o.group)) || (o.group && o.group === a.id); }
/** One pair: returns 1 when something moved. */
function _wlfPair(life, a, o) {
  var dx = o.x - a.x, dz = o.z - a.z, d = Math.hypot(dx, dz);
  var rel = _wlfRelated(a, o);
  var sq = (a.squeeze > life.t || o.squeeze > life.t);                                // passing in a lane too narrow for two
  // in a lane a body wide (one that stalled for 2.5 s) the pair turns sideways and brushes past, the sprites overlapping for a step or two
  // two PEOPLE of one group (a couple, a family) walk shoulder to shoulder, never through each other (0.96 x their radii: the
  // drawn figures just touch); a dog at heel or a flock keeps the closer group floor (merge of 15 Oct: uk-rebuild's crowd check
  // found couples drawn 0.3 m apart, half inside each other)
  var people = rel && /^person\./.test(String(a.obj || '')) && /^person\./.test(String(o.obj || ''));
  // a person who is standing still has no swing to make room for: somebody passing a viewer on a narrow boardwalk keeps shoulder width, not 1.2 x
  var stander = a.kind === 'walker' && o.kind === 'walker' && ((a.speed || 0) < 0.2 || (o.speed || 0) < 0.2);
  var minD = (a.r + o.r) * (rel ? (people ? 0.96 : 0.6) : sq ? 0.25 : (a.kind === 'walker' && o.kind === 'walker' && !stander ? WORLD_LIFE_BODY : 1));
  if (d >= minD) return 0;
  // shoulder room only where there is room for it: in a gap between two solids (a bollard and a bench 1.6 m apart: the legal centres
  // lie 0.75 m apart, less than the 1.2 x floor) two people pass at their shoulder width, never pushed back along the lane for ever
  if (!rel && !sq && minD > (a.r + o.r) && d >= (a.r + o.r) && a.kind === 'walker' && o.kind === 'walker' && (_wlfOneBody(life, a) || _wlfOneBody(life, o))) return 0;
  var ma = _wlfMass(a), mo = _wlfMass(o);
  if (ma === Infinity && mo === Infinity) return 0;
  var wa = mo === Infinity ? 1 : ma === Infinity ? 0 : mo / (ma + mo), wo = 1 - wa;
  // dead on (or the same spot): a deterministic side, so two movers never both stay and never both go the same way
  if (d < 1e-3) { var an = (_wlfHash(a.id + '|' + o.id) % 6283) / 1000; dx = Math.cos(an); dz = Math.sin(an); d = 1; }
  var nx = dx / d, nz = dz / d, pen = Math.min(minD - Math.min(d, minD), WORLD_LIFE_PUSH_MAX * 2);
  // a head-on pair (the push is along the lane) is also nudged sideways, each to its own left (UK), so it can never lock
  var sgn = _wlfHash(a.id + '|' + o.id) % 2 ? 1 : -1;
  var lx = -nz * sgn * 0.5, lz = nx * sgn * 0.5, l = Math.hypot(nx + lx, nz + lz) || 1, ux = (nx + lx) / l, uz = (nz + lz) / l;
  var pa = Math.min(WORLD_LIFE_PUSH_MAX, pen * wa), po = Math.min(WORLD_LIFE_PUSH_MAX, pen * wo), moved = 0;
  var ax = a.x, az = a.z, bx = o.x, bz = o.z;
  if (pa > 1e-4) {
    if (_wlfTryAt(life, a, ax - ux * pa, az - uz * pa) || _wlfTryAt(life, a, ax - nx * pa, az - nz * pa)) moved = 1;
    else if (wo > 0) po = Math.min(WORLD_LIFE_PUSH_MAX, po + pa);                      // wedged: the other gives way instead
  }
  if (po > 1e-4) { if (_wlfTryAt(life, o, bx + ux * po, bz + uz * po) || _wlfTryAt(life, o, bx + nx * po, bz + nz * po)) moved = 1; }
  if (!moved) { a.squeezed = life.t; o.squeezed = life.t; }                            // nothing could give: the stuck logic re-plans
  return moved;
}
function _wlfSeparate(life) {
  var A = life.agents, h = new Map(), L = [], i, j, k;
  for (i = 0; i < A.length; i++) {
    var a = A[i];
    if (a.dead || a.layer === 'air' || a.kind === 'lane' || a.kind === 'rail' || a.kind === 'boat' || a.kind === 'moored' || a.hop || a.host) continue;
    a._si = L.length; L.push(a);
    k = (Math.floor(a.x / 2) + 4096) * 8192 + (Math.floor(a.z / 2) + 4096);
    var b = h.get(k); if (!b) { b = []; h.set(k, b); } b.push(a);
  }
  if (L.length < 2) return;
  for (var it = 0; it < 6; it++) {
    var moved = 0;
    for (i = 0; i < L.length; i++) {
      var p = L[i], cx = Math.floor(p.x / 2), cz = Math.floor(p.z / 2);
      for (var ix = -1; ix <= 1; ix++) for (var iz = -1; iz <= 1; iz++) {
        var bk = h.get((cx + ix + 4096) * 8192 + (cz + iz + 4096)); if (!bk) continue;
        for (j = 0; j < bk.length; j++) { var o = bk[j]; if (o._si > p._si && o.layer === p.layer) moved += _wlfPair(life, p, o); }
      }
    }
    if (!moved) break;
  }
  for (i = 0; i < L.length; i++) L[i].y = worldLifeY(life, L[i]);
}
function _wlfLeash(life, a, dt) {
  var L = a.leader, len = a.lead.len, dx = a.x - L.x, dz = a.z - L.z, d = Math.hypot(dx, dz);
  if (d <= len) return;
  // the lead pulls the dog in at most 6 m/s (0.4 m a tick: a dog is not teleported), round what is in the way: the navigation's own
  // step slides along a solid, so a dog on the far side of a post is drawn round it, not through it
  var pull = Math.min(d - len * 0.97, 6 * dt), ux = -dx / d, uz = -dz / d, np = null;
  if (typeof worldStep === 'function') { np = worldStep(life.nav, a.layer, [a.x, a.z], [ux * pull / dt, uz * pull / dt], _wlfNavR(a), dt); if (np && _wlfOk(life, a, np[0], np[1])) { a.x = np[0]; a.z = np[1]; } }
  else _wlfTryAt(life, a, a.x + ux * pull, a.z + uz * pull);
  // still past the end of its lead (blocked): the walker waits (taut lead, _wlfMove), the dog is not snapped; only a dog that is far past
  // it (an obstacle the step cannot slide round) is put on the nearest open point of the lead, never onto its walker
  dx = a.x - L.x; dz = a.z - L.z; d = Math.hypot(dx, dz) || 1;
  if (d > len * 1.6) {
    var cands = [len * 0.97, len * 0.85, len * 0.7, len * 0.55];
    for (var k = 0; k < cands.length; k++) { var x = L.x + dx / d * cands[k], z = L.z + dz / d * cands[k]; if (_wlfOk(life, a, x, z)) { a.x = x; a.z = z; break; } }
  }
}
/** A step aboard, a step off, sitting down and standing up: eased over the step's time, with the layer and host switched. */
function _wlfStepMove(life, a, dt) {
  var s = a.step, t = Math.min(1, (life.t - s.t0) / s.dur), e = t * t * (3 - 2 * t), ox = a.x, oz = a.z;
  a.x = s.x0 + (s.x1 - s.x0) * e; a.z = s.z0 + (s.z1 - s.z0) * e;
  var from = worldNavY(life.nav, a.layer, s.x0, s.z0), to = worldNavY(life.nav, s.layer, s.x1, s.z1);
  a.y = from + (to - from) * e;
  a.vx = (a.x - ox) / dt; a.vz = (a.z - oz) / dt; a.speed = Math.hypot(a.vx, a.vz);
  if (s.x1 !== s.x0 || s.z1 !== s.z0) { var des = Math.atan2(s.x1 - s.x0, s.z1 - s.z0); if (!s.sit && !s.stand) { var dd = _wlfAng(des - a.heading), mx = Math.PI / a.brain.turn * dt; a.heading = _wlfAng(a.heading + _wlfClamp(dd, -mx, mx)); } }
  if (s.sit && a.seat) { var df = _wlfAng(a.seat.facing - a.heading), mx2 = Math.PI / a.brain.turn * dt; a.heading = _wlfAng(a.heading + _wlfClamp(df, -mx2, mx2)); }
  if (t >= 1) {
    a.step = null; a.stepEnd = life.t;
    if (s.sit) { a.x = s.x1; a.z = s.z1; a.bs = 'sitting'; a.gdur = null; return; }      // the sit goal takes it from here
    if (s.stand) { a.host = null; _wlfReleaseSeat(life, a); _wlfEnter(life, a, a.brain.start); _wlfNextGoal(life, a); a.y = worldLifeY(life, a); return; }
    a.layer = s.layer; a.host = null; a.route = null;
    if (!_wlfOk(life, a, a.x, a.z)) { var p = worldStep(life.nav, a.layer, [a.x, a.z], [0, 0], _wlfNavR(a), dt); a.x = p[0]; a.z = p[1]; }
    a.y = worldLifeY(life, a);
  }
}
function _wlfHopMove(life, a, dt) {
  var h = a.hop, t = Math.min(1, (life.t - h.t0) / h.dur), ox = a.x, oz = a.z;
  a.x = h.x0 + (h.x1 - h.x0) * t; a.z = h.z0 + (h.z1 - h.z0) * t;
  a.alt = h.y0 + Math.sin(Math.PI * t) * h.up;
  a.y = a.alt; a.vx = (a.x - ox) / dt; a.vz = (a.z - oz) / dt; a.speed = Math.hypot(a.vx, a.vz);
  if (t >= 1) { a.hop = null; a.layer = a.homeLayer || 'walk'; a.y = worldLifeY(life, a); _wlfEnter(life, a, a.brain.states.graze ? 'graze' : a.brain.start); life.bus.emit('settle', { id: a.id, x: a.x, z: a.z }); }
}
function _wlfAirMove(life, a, dt) {
  var ox = a.x, oz = a.z;
  if (a.kind === 'flyer') {
    var C = a.circle; C.a += C.w * dt * (a.spd / 6 + 0.5);
    a.x = C.x + Math.cos(C.a) * C.R; a.z = C.z + Math.sin(C.a) * C.R; a.heading = Math.atan2(a.x - ox, a.z - oz);
  } else if (a.flight) {
    var F = a.flight, w = F.pts[F.i], dx = w[0] - a.x, dy = w[1] - a.alt, dz = w[2] - a.z, d = Math.hypot(dx, dy, dz), s = Math.min(d, a.spd * dt);
    if (d > 1e-6) { a.x += dx / d * s; a.alt += dy / d * s; a.z += dz / d * s; if (Math.hypot(dx, dz) > 1e-3) a.heading = Math.atan2(dx, dz); }
    if (d - s < 0.05) { F.i++; if (F.i >= F.pts.length) { a.perch = F.to; a.flight = null; _wlfEnter(life, a, 'perch'); a.x = F.to.x; a.z = F.to.z; a.alt = F.to.y; } }
  } else if (a.diveT) {
    var D = a.diveT, t = (life.t - D.t0) / D.dur, k = Math.sin(Math.PI * _wlfClamp(t, 0, 1)), h = a.perch;
    a.x = h.x + (D.w[0] - h.x) * k; a.z = h.z + (D.w[1] - h.z) * k;
    a.alt = h.y + (worldNavY(life.nav, 'swim', D.w[0], D.w[1]) - h.y) * k;
    if (t >= 1) { a.diveT = null; a.x = h.x; a.z = h.z; a.alt = h.y; _wlfEnter(life, a, 'perch'); life.bus.emit('splash', { id: a.id, x: D.w[0], z: D.w[1] }); }
  } else if (a.perch) { a.x = a.perch.x; a.z = a.perch.z; a.alt = a.perch.y; }
  a.vx = (a.x - ox) / dt; a.vz = (a.z - oz) / dt; a.speed = Math.hypot(a.vx, a.vz); a.y = a.alt;
}
/** Stuck (no progress for 2.5 s while wanting to move): re-plan, then sidestep, then leave by the nearest spawn cell. */
function _wlfStuck(life, a, want, dt) {
  // waiting at the mouth of a gap for someone to come through is a courtesy, not a jam
  if (a.yieldPinch != null && life.t - a.yieldPinch < 0.3) { a.lastProg = life.t; a.progX = a.x; a.progZ = a.z; a.stuckT = 0; return; }
  // one that is held at an edge of the frame (a queue behind someone waiting for a bench, a yield) is never left standing there half in the picture
  // (C2): it wants to go on, so it counts as stuck, and it gives up and leaves at once instead of waiting out the stages
  var held = !!a.dir && !a.resident && !a.leader && a.kind === 'walker' && !a.step && !a.seat && _wlfInEdgeZone(life, a);
  if (held && want <= 0.05) want = 0.2;
  if (want > 0.05 && a.dir) {
    if (Math.hypot(a.x - a.progX, a.z - a.progZ) > 0.4) { a.progX = a.x; a.progZ = a.z; a.lastProg = life.t; a.stuckT = 0; a.replans = Math.max(0, a.replans - 0.02); return; }
    a.stuckT = life.t - a.lastProg;
  } else { a.lastProg = life.t; a.progX = a.x; a.progZ = a.z; a.stuckT = 0; return; }
  if (held && a.stuckT > 1.0 && Math.hypot(a.vx || 0, a.vz || 0) < 0.1) {
    a.lastProg = life.t; a.progX = a.x; a.progZ = a.z; a.replans = 0; a.stuckOut = true;
    var eb = a.edge && /^(N|S|E|W|cover|door)$/.test(a.edge) && !(a.goals && a.goals[a.gi] && a.goals[a.gi].leave === a.edge) ? a.edge : 'any';
    _wlfLeave(life, a, eb); a.goalOn = null;
    return;
  }
  if (a.stuckT > 2.5) {
    a.lastProg = life.t; a.progX = a.x; a.progZ = a.z; a.replans++;
    var edgeZ = _wlfInEdgeZone(life, a);                     // never stand still in an edge zone (C2): re-plan at once
    // never stop in the lane to wait: a mover that stands still IS the next blockage (a jam feeds itself). First a new plan, at once;
    // then the later arrival of a knot turns back the way it came (the knot unwinds from its edges); only then a short pause.
    var back2 = a.edge && /^(N|S|E|W|cover|door)$/.test(a.edge) && !(a.goals && a.goals[a.gi] && a.goals[a.gi].leave === a.edge) ? a.edge : null;
    if (a.replans <= 1) { a.route = null; }
    else if (a.replans <= 2 && back2 && !a.resident && !a.leader && !a.members && a.kind === 'walker' && _wlfLater(life, a)) { _wlfLeave(life, a, back2); a.goalOn = null; a.replans = 0; }
    else if (a.replans <= 2 && a.kind === 'walker' && _wlfOneBody(life, a)) { a.route = null; a.squeeze = life.t + 3; }   // a one-person lane: turn sideways and pass shoulder to shoulder
    else if (a.replans <= 2) { a.route = null; if (!edgeZ) { a.wait = life.t + 1 + a.rng() * 2; if (a.brain.states[a.bs] && a.brain.states[a.bs].speed) _wlfEnter(life, a, _wlfStillState(a)); } }
    else {
      a.replans = 0; a.stuckOut = true;
      if (a.resident) { a.route = null; a.gi++; a.wait = life.t + 1; }
      else { var back = a.edge && /^(N|S|E|W|cover|door)$/.test(a.edge) && !(a.goals && a.goals[a.gi] && a.goals[a.gi].leave === a.edge) ? a.edge : 'any'; _wlfLeave(life, a, back); a.goalOn = null; }
    }
  }
}
/**
 * Is this mover in a lane a body wide (a boardwalk, a gap between solids): no legal spot a shoulder's width to either side of its way?
 * Only there do two people turn sideways and brush past (squeeze); on a towpath, a quay or a plaza they step round (merge of 15 Oct:
 * uk-rebuild's motion check caught a walker squeezing through an idle family on the Pier Head's plaza).
 */
function _wlfOneBody(life, a) {
  return _wlfOneBodyAt(life, a, a.x, a.z, a.dir || [Math.sin(a.heading || 0), Math.cos(a.heading || 0)]);
}
/** The same at a point: no legal spot a shoulder's width to either side of the way (dir) there. */
function _wlfOneBodyAt(life, a, x, z, dir) {
  var lx = -dir[1], lz = dir[0], w = (a.r || 0.25) * 2 + 0.25;
  for (var sg = -1; sg <= 1; sg += 2) if (_wlfOk(life, a, x + lx * w * sg, z + lz * w * sg)) return false;
  return true;
}
/**
 * A gap two people cannot pass in (a one-body gap: a bollard and a bench 1.6 m apart, a doorway, a boardwalk): when a person is
 * coming through it the other way, the one NEARER to the gap goes first and the other waits at its mouth, a metre or so short of
 * it, never in it (two in the gap stood nose to nose until a squeeze put them through each other). A wait lasts 6 s at most; a
 * group waits with its leader. Returns true when this mover waits now.
 */
var WORLD_LIFE_PINCH_WAIT_S = 6;
function _wlfPinchYield(life, a, dir) {
  if (a.kind !== 'walker' || a.layer === 'air' || a.step || a.squeeze > life.t || a.fadeOut) return false;
  // a decision lasts a fifth of a second (the scan of the neighbours and of the gap is the dearest thing a walker does in a tick)
  if (a._pyT != null && life.t - a._pyT < 0.2 && life.t >= a._pyT) { if (a._pyRes) a.yieldPinch = life.t; return a._pyRes; }
  a._pyT = life.t; a._pyRes = _wlfPinchYield0(life, a, dir);
  return a._pyRes;
}
function _wlfPinchYield0(life, a, dir) {
  if (typeof worldNavSlot !== 'function') return false;
  // the gap first (a few reads of the navigation's slot mask: it is rare): none within 2.6 m ahead, or already in it, nothing to wait for
  if (worldNavSlot(life.nav, a.layer, a.x, a.z)) { a.pinchT0 = null; return false; }
  var k = 0.5, gx = 0, gz = 0, found = false;
  for (; k <= 2.6; k += 0.4) { gx = a.x + dir[0] * k; gz = a.z + dir[1] * k; if (worldNavSlot(life.nav, a.layer, gx, gz)) { found = true; break; } }
  if (!found) { a.pinchT0 = null; return false; }
  // somebody coming through it the other way (within 7 m ahead, in my lane)
  var o0 = null, fw0 = Infinity;
  _wlfNearXZ(life, a.x, a.z, 7, function (o) {
    if (o === a || o.kind !== 'walker' || o.layer !== a.layer || o.dead || o.step || o.fadeOut || o === a.leader || o.leader === a || (a.group && o.group === a.group)) return;
    var ox = o.vx, oz = o.vz;
    if (o.dir && o.spd > 0.2) { ox = o.dir[0] * o.spd; oz = o.dir[1] * o.spd; }
    var os = Math.hypot(ox, oz); if (os < 0.2) return;
    var rx = o.x - a.x, rz = o.z - a.z, fwd = rx * dir[0] + rz * dir[1], lat = rx * dir[1] - rz * dir[0];
    if (fwd < 0.4 || fwd > 7 || Math.abs(lat) > 1.1 || (ox * dir[0] + oz * dir[1]) > -0.3 * os) return;
    if (fwd < fw0) { fw0 = fwd; o0 = o; }
  });
  if (!o0 || fw0 < k - 0.2) { a.pinchT0 = null; return false; }
  // the nearer to the gap goes first (a tie: the earlier arrival)
  var dO = Math.hypot(o0.x - gx, o0.z - gz), tie = Math.abs(dO - k) < 0.5;
  if (dO < k - 0.5 || (tie && (o0.born < a.born || (o0.born === a.born && o0.id < a.id)))) {
    if (k > 1.5) return false;                                        // not at the mouth yet: walk up to it
    if (a.pinchT0 == null) a.pinchT0 = life.t;
    if (life.t - a.pinchT0 > WORLD_LIFE_PINCH_WAIT_S) return false;   // waited long enough: go and meet it (a squeeze if it comes to that)
    a.yieldPinch = life.t;
    return true;
  }
  a.pinchT0 = null;
  return false;
}
/** Did this mover arrive after a neighbour within 2.5 m that is held up too (the later one of a knot gives way)? */
function _wlfLater(life, a) {
  for (var i = 0; i < life.agents.length; i++) {
    var o = life.agents[i];
    if (o === a || o.dead || o.layer !== a.layer || Math.hypot(o.x - a.x, o.z - a.z) > 2.5) continue;
    if (o.born < a.born || (o.born === a.born && o.id < a.id)) return true;
  }
  return false;
}
/** Still actions shown in the shared vocabulary (the clip keeps the action: a heron's freeze and strike, a dog's sniff). */
var _WLF_SHOW = { freeze: 'look', strike: 'look', sniff: 'look', hop: 'fly', sitting: 'sit' };
/** The brain's first moving state (what a mover held up by nothing shows while it moves). */
function _wlfMovingState(a) {
  var S = a.brain.states;
  if (S.walk && S.walk.speed) return 'walk';
  for (var k in S) if (S[k].speed) return k;
  return a.bs;
}
/**
 * What the mover is DOING, never what a timer says (M1 with appearance): a moving mover shows a moving state, a still one a
 * still state; seated movers sit; vehicles drive or stand. Sets a.state, a.pose, a.h, a.clip, a.facing.
 */
function _wlfPresent(life, a) {
  var S = a.brain.states, st = S[a.bs] || {}, moving = (a.speed || 0) > 0.05, state;
  if (a.kind === 'lane' || a.kind === 'rail') state = moving ? (a.bs === 'stopped' ? _wlfMovingState(a) : a.bs) : 'stopped';
  else if (a.kind === 'moored') state = 'moored';
  else if (a.hop) state = 'fly';
  else if (a.step && a.step.sit) state = 'sit';
  else if (a.step && a.step.stand) state = 'idle';
  else if (moving && !st.speed && a.bs !== 'fly' && a.bs !== 'dive') state = _wlfMovingState(a);
  else if (!moving && st.speed && a.layer !== 'air') state = _wlfStillState(a);
  else state = a.bs;
  if (a.turning && moving && a.layer !== 'air' && a.kind !== 'lane' && a.kind !== 'rail') state = 'turn';
  if (_WLF_SHOW[state]) state = _WLF_SHOW[state];
  a.state = state;
  var ss = S[a.bs] && !S[a.bs].speed && state === _WLF_SHOW[a.bs] ? S[a.bs] : (S[state] || st);
  a.pose = state === 'sit' ? 'sit' : (ss.pose || (a.layer === 'air' ? 'fly' : a.pose0 || 'stand'));
  a.h = a.pose === 'sit' ? a.hSit : a.hStand;
  a.clip = ss.clip || state;
  a.facing = ((a.heading * 180 / Math.PI) % 360 + 360) % 360;
}
/** A5: facing from the actual velocity against the view ray (5 views + mirrors, 15 degrees of hysteresis); still: the heading. */
function _wlfFace(life, a) {
  _wlfPresent(life, a);
  var sp = Math.hypot(a.vx, a.vz);
  var hx = sp > 0.05 ? a.vx / sp : Math.sin(a.heading), hz = sp > 0.05 ? a.vz / sp : Math.cos(a.heading);
  var rl = Math.hypot(a.x, a.z) || 1, rx = a.x / rl, rz = a.z / rl;
  var dot = rx * hx + rz * hz, crs = rx * hz - rz * hx;
  var ang = Math.atan2(-crs, dot) * 180 / Math.PI, abs = Math.abs(ang);
  if (a.brain.views === 'side') { a.view = 'side'; a.bucket = 2; if (abs > 15 && abs < 165) a.mirror = ang < 0; return; }
  var b = a.bucket, lo = b * 45 - 22.5 - 15, hi = b * 45 + 22.5 + 15;
  if (abs < lo || abs > hi) b = Math.round(abs / 45);
  a.bucket = b; a.view = WORLD_VIEWS[b];
  if (abs > 15 && abs < 165) a.mirror = ang < 0;
}
/** A still mover turns to its point of interest (A5) at its turn rate; one that wants to move (held up a moment, or turning
    to set off) never: the two turns fought each tick and held it facing away from its way, at no speed, for good. */
function _wlfLookTurn(life, a, dt) {
  if (!a.lookAt || a.speed > 0.05 || a.dir || a.step || a.layer === 'air') return;       // one that wants to go turns to its way, never back to what it was looking at
  var des = Math.atan2(a.lookAt[0] - a.x, a.lookAt[1] - a.z), diff = _wlfAng(des - a.heading), mx = Math.PI / a.brain.turn * dt;
  a.heading = _wlfAng(a.heading + _wlfClamp(diff, -mx, mx));
}

/* ---------- traffic glue ---------- */
function _wlfLaneSpawn(life, pop, entry) {
  var T = life.traffic; if (!T) return null;
  var spec = pop.spec, lanes = T.lanes.filter(function (l) { return !spec.on || l.road === spec.on; });
  if (!lanes.length) lanes = T.lanes;
  if (!lanes.length) return null;
  var lane = lanes[Math.floor(pop.rng() * lanes.length)], b = worldBrains[entry.m.cls], info = _wlfInfo(entry.m.obj);
  var len = info && info.size ? Math.max(1.6, info.size.w) : (b.kind === 'lane' && entry.m.cls === 'bus' ? 11 : 4.2);
  var h0 = Math.max(info && info.size ? info.size.h : 0, b.h ? b.h[1] : 1.6), span = worldTrafficSpan(T, lane, h0, len);
  if (span.blocked || span.s1 - span.s0 < len * 2) return null;
  // the entry must be clear (a gap behind the last vehicle on the lane)
  for (var i = 0; i < life.agents.length; i++) { var o = life.agents[i]; if (!o.dead && o.lane === lane.id && o.s - o.len / 2 < span.s0 + len / 2 + WORLD_TRAFFIC.s0 + 3) return null; }
  var id = 'p' + pop.idx + '-' + (pop.ord++), p = worldTrafficLaneAt(lane, span.s0);
  var a = _wlfNewAgent(life, pop, entry, p.x, p.z, id, { edge: 'lane' });
  a.lane = lane.id; a.laneRef = lane; a.s = span.s0; a.len = len; a.span = span; a.v = 0; a.v0 = worldLifeRange(a.rng, b.speed || [8, 12]) * a.gait; a.s0 = entry.m.cls === 'bus' ? 3 : 2.5;
  a.v = a.v0 * 0.85; a.kerb = b.kerb ? lane.kerb : 0;
  a.fadeIn = span.fadeIn ? 0.6 : 0;
  if (b.stops) { var st = lane.stops.find(function (q) { return q.s > a.s + 5 && q.stop.kind === 'bus'; }); if (st) a.stopAt = { s: st.s, dwell: worldLifeRange(a.rng, b.dwell || [10, 20]), stop: st.stop, until: null, done: false }; }
  _wlfVariant(life, a, pop.recent.map(function (q) { return q.variant; }));
  pop.recent.push(a); if (pop.recent.length > 3) pop.recent.shift();
  _wlfLanePlace(life, a);
  _wlfAddSpawnPoint(life, a.layer, a.x, a.z);
  _wlfAdd(life, a);
  return a;
}
function _wlfLanePlace(life, a) {
  var p = worldTrafficLaneAt(a.laneRef, a.s), ox = a.x, oz = a.z;
  a.x = p.x - p.tz * a.kerb; a.z = p.z + p.tx * a.kerb;
  a.heading = Math.atan2(p.tx, p.tz);
  a.y = worldLifeY(life, a);
  return [ox, oz];
}
function _wlfTrafficPass(life, dt) {
  var T = life.traffic; if (!T) return;
  var vehs = [];
  for (var i = 0; i < life.agents.length; i++) { var a = life.agents[i]; if (!a.dead && a.kind === 'lane') vehs.push(a); }
  if (vehs.length) {
    worldTrafficStep(T, vehs, dt, { t: life.t,
      pedOn: function (c) { return _wlfPedOn(life, c); },
      onArrive: function (v, st) { v.dwelling = true; life.bus.emit('arrive', { id: v.id, stop: st.id, x: v.x, z: v.z, t: life.t }); _wlfAlight(life, v, st); },
      onDepart: function (v, st) { v.dwelling = false; life.bus.emit('depart', { id: v.id, stop: st.id, x: v.x, z: v.z, t: life.t }); } });
    for (var j = 0; j < vehs.length; j++) {
      var v = vehs[j], o = _wlfLanePlace(life, v);
      v.vx = (v.x - o[0]) / dt; v.vz = (v.z - o[1]) / dt; v.speed = v.v; v.bs = v.v < 0.2 ? 'stopped' : v.brain.start;
      _wlfFace(life, v);
      if (v.s >= v.span.s1) {
        v.s = v.span.s1; _wlfLanePlace(life, v);
        if (v.span.fadeOut && !v.fadeOut) v.fadeOut = life.t;
        if (!v.span.fadeOut || life.t - v.fadeOut >= 0.6) { _wlfAddSpawnPoint(life, v.layer, v.x, v.z); _wlfDespawn(life, v); }
      }
    }
  }
}
function _wlfPedOn(life, c) {
  var s = c.shape;
  if (typeof _wtrInShape !== 'function') return false;
  for (var i = 0; i < life.agents.length; i++) {
    var a = life.agents[i]; if (a.dead || a.layer !== 'walk') continue;
    if (_wtrInShape(s, a.x, a.z) || _wtrInShape(s, a.x + a.vx * 1.2, a.z + a.vz * 1.2)) return true;
  }
  return false;
}
/** A bus or tram at its stop: 0-2 passengers get off and walk away (they appear at the door, hidden by the vehicle). */
function _wlfAlight(life, v, st) {
  var pop = life.pops[v.pop]; if (!pop || !st) return;
  var n = Math.floor(v.rng() * 3);
  for (var i = 0; i < n && life.agents.length < life.max; i++) {
    var p = st.door; if (!worldLifeOk(life, 'walk', p[0], p[1])) { var c = _wlfNearCells(life, 'walk', 0.25, p[0], p[1], 2.5); if (!c.length) return; p = worldNavCellXZ(life.nav, 'walk', c[0]); }
    var e = { key: 'alight', m: { cls: v.rng() < 0.5 ? 'brisk' : 'stroll', obj: 'person.walker' } };
    var a = _wlfNewAgent(life, pop, e, p[0], p[1], v.id + '.a' + i, { edge: 'stop' });
    _wlfVariant(life, a, null);
    a.goals = [{ leave: 'any' }];
    _wlfAddSpawnPoint(life, 'walk', p[0], p[1]);
    _wlfAdd(life, a);
    life.bus.emit('alight', { id: a.id, from: v.id, x: a.x, z: a.z });
  }
}
/** Rail entries: the trains of a timetable at the scene clock (T1); each departure is one agent with a stable id. */
function _wlfRailSync(life, pop, entry, clock) {
  var list = worldTrafficRailAt(life.traffic, entry.tt, clock), seen = {};
  for (var i = 0; i < list.length; i++) {
    var r = list[i], id = 'p' + pop.idx + '-' + entry.tt.id.split('-').pop() + 'k' + r.k;
    seen[id] = 1;
    var a = life.byId.get(id);
    if (!a) {
      if (!_wlfRoom(life, 'rail')) continue;
      a = _wlfNewAgent(life, pop, entry, r.x, r.z, id, { edge: 'line' });
      a.len = entry.tt.len; a.track = r.track.id; a.kind = 'rail'; a.layer = 'rail';
      _wlfVariant(life, a, null);
      a.x = r.x; a.z = r.z; a.px = r.x; a.pz = r.z; a.heading = r.heading;
      _wlfAddSpawnPoint(life, 'rail', r.x, r.z);
      _wlfAdd(life, a);
      if (life.t > 0) a.born = life.t;
    }
    var ox = a.x, oz = a.z;
    a.x = r.x; a.z = r.z; a.heading = r.heading; a.s = r.s; a.v = r.v; a.speed = r.v; a.bs = r.state === 'stopped' ? 'stopped' : 'drive';
    a.vx = (a.x - ox) / life.step; a.vz = (a.z - oz) / life.step; a.y = worldNavY(life.nav, 'walk', a.x, a.z);
    a.tt = { k: r.k, t0: r.t0 };
    if (r.state === 'stopped' && !a.arrived) { a.arrived = true; var stp = r.track.stops && r.track.stops[0] ? r.track.stops[0].stop : null; life.bus.emit('arrive', { id: a.id, stop: stp ? stp.id : null, x: a.x, z: a.z, t: life.t }); if (stp) _wlfAlight(life, a, stp); }
    if (r.state !== 'stopped' && a.arrived && !a.departedEv) { a.departedEv = true; life.bus.emit('depart', { id: a.id, x: a.x, z: a.z, t: life.t }); }
    _wlfFace(life, a);
  }
  for (var j = 0; j < life.agents.length; j++) {
    var b = life.agents[j];
    if (!b.dead && b.kind === 'rail' && b.pop === pop.idx && b.track && !seen[b.id] && b.id.indexOf('p' + pop.idx + '-' + entry.tt.id.split('-').pop() + 'k') === 0) { _wlfAddSpawnPoint(life, 'rail', b.x, b.z); _wlfDespawn(life, b); }
  }
}
/** Moored boats: alongside a bank, parallel to it, the whole hull in the water; never moving (A9). */
function _wlfMoor(life, a, pop) {
  var r = a.r, cells = _wlfCells(life, 'swim', _wlfFlowR(a), pop.spec.on || null), L = worldLifeGrid(life, 'swim');
  if (!cells.length || !L) return false;
  for (var t = 0; t < 40; t++) {
    var c = Math.floor(pop.rng() * cells.length / 2) * 2, x = cells[c], z = cells[c + 1], k = worldNavCell(life.nav, 'swim', x, z);
    if (k < 0 || L.clear[k] > r + 0.8) continue;                                   // alongside: close to a bank
    // the bank direction: across the clearance gradient
    var g1 = worldNavCell(life.nav, 'swim', x + 1, z), g2 = worldNavCell(life.nav, 'swim', x - 1, z), g3 = worldNavCell(life.nav, 'swim', x, z + 1), g4 = worldNavCell(life.nav, 'swim', x, z - 1);
    var gx = (g1 >= 0 ? L.clear[g1] : 0) - (g2 >= 0 ? L.clear[g2] : 0), gz = (g3 >= 0 ? L.clear[g3] : 0) - (g4 >= 0 ? L.clear[g4] : 0);
    var head = Math.atan2(gz, -gx), hx = Math.sin(head), hz = Math.cos(head), half = (a.len || 18) / 2 * 0.95, ok = true;
    for (var s = -half; s <= half && ok; s += 1) ok = worldLifeOk(life, 'swim', x + hx * s, z + hz * s, r * 0.9);
    if (!ok || _wlfCrowded(life, 'swim', x, z, half + 1)) continue;
    a.x = x; a.z = z; a.px = x; a.pz = z; a.heading = pop.rng() < 0.5 ? head : _wlfAng(head + Math.PI); a.layer = 'swim';
    return true;
  }
  _wlfProblem(life, { pop: pop.idx, rule: 'noMooring', msg: 'no bank long enough to moor ' + a.who });
  return false;
}

/* ---------- reactions (M6) ---------- */
function _wlfBusHandlers(life) {
  life.bus.on('scare', function (e) {
    _wlfNearXZ(life, e.x, e.z, e.r || 6, function (o) {
      if (o.brain.react && o.brain.react.flee && (o.layer === 'swim' || o.layer === 'wade') && Math.hypot(o.x - e.x, o.z - e.z) < o.brain.react.flee) {
        if (!o.flee) o.fleeN = (o.fleeN || 0) + 1;
        o.flee = { x: e.x, z: e.z, until: life.t + 3 + o.rng() * 2 }; o.route = null;
      }
    });
  });
  life.bus.on('feed', function (e) {
    _wlfNearXZ(life, e.x, e.z, e.r || 25, function (o) { if (o.brain.react && o.brain.react.feed && o.layer === 'swim' && !o.flee) { o.attract = { x: e.x, z: e.z, until: life.t + 3 }; o.route = null; } });
  });
  life.bus.on('arrive', function (e) {
    if (!e.stop) return;
    for (var i = 0; i < life.agents.length; i++) { var a = life.agents[i]; if (!a.dead && a.stop && a.stop.id === e.stop && a.bs === 'wait') a.boardTo = e.id; }
  });
  life.bus.on('depart', function (e) { var v = life.byId.get(e.id); if (v) v.departed = true; });
  life.bus.on('ring', function (e) { var w = life.byId.get(e.to); if (w && !w.dead) { w.yieldT = life.t + 3; w.yieldSide = 1; } });
}
function _wlfNearXZ(life, x, z, R, fn) {
  var c0 = Math.floor((x - R) / 2), c1 = Math.floor((x + R) / 2), d0 = Math.floor((z - R) / 2), d1 = Math.floor((z + R) / 2);
  for (var cx = c0; cx <= c1; cx++) for (var cz = d0; cz <= d1; cz++) {
    var bk = life.hash.get((cx + 4096) * 8192 + (cz + 4096)); if (!bk) continue;
    for (var i = 0; i < bk.length; i++) if (!bk[i].dead) fn(bk[i]);
  }
}
/** Per tick: dogs at the bank scare water birds, pigeons lift from walkers, cyclists ring (engine-scripted, never hand-timed). */
function _wlfReactions(life, dt) {
  for (var i = 0; i < life.agents.length; i++) {
    var a = life.agents[i]; if (a.dead || !a.brain.react) continue;
    var R = a.brain.react;
    if (R.scareWater && a.speed > 0.2 && (!a.scareT || life.t - a.scareT > 0.5)) {
      a.scareT = life.t;
      var birds = false;
      _wlfNearXZ(life, a.x, a.z, 7, function (o) { if (!birds && o.brain.react && o.brain.react.flee && (o.layer === 'swim' || o.layer === 'wade')) birds = true; });
      if (birds && _wlfNearWater(life, a.x, a.z, 2.5)) life.bus.emit('scare', { id: a.id, by: a.id, x: a.x, z: a.z, r: 6, t: life.t });
    }
    if (R.lift && !a.hop && a.layer !== 'air') {
      var hit = null;
      _wlfNearXZ(life, a.x, a.z, R.lift, function (o) { if (!hit && o !== a && o.layer === 'walk' && o.kind === 'walker' && o.brain.react !== R && o.cls !== 'pigeon' && o.speed > 0.3 && Math.hypot(o.x - a.x, o.z - a.z) < R.lift) hit = o; });
      if (hit) _wlfLift(life, a, hit);
    }
    if (R.ring && a.speed > 1) {
      var hx = Math.sin(a.heading), hz = Math.cos(a.heading);
      _wlfNearXZ(life, a.x + hx * 4, a.z + hz * 4, 5, function (o) {
        if (o === a || o.layer !== a.layer || o.kind !== 'walker' || o.cls === 'cyclist' || o.cls === 'dog' || (a.rung && a.rung[o.id])) return;
        var rx = o.x - a.x, rz = o.z - a.z, d = Math.hypot(rx, rz);
        if (d < 1 || d > 8 || (rx * hx + rz * hz) / d < 0.8) return;
        a.rung = a.rung || {}; a.rung[o.id] = 1;
        life.bus.emit('ring', { id: a.id, by: a.id, to: o.id, x: a.x, z: a.z, t: life.t });
      });
    }
  }
}
/** A pigeon lifts (a short flight away from whoever came through) and settles again on open ground nearby. */
function _wlfLift(life, a, o) {
  var dx = a.x - o.x, dz = a.z - o.z, d = Math.hypot(dx, dz) || 1, best = null;
  for (var t = 0; t < 8 && !best; t++) {
    var ang = Math.atan2(dx, dz) + (a.rng() - 0.5) * 1.6, rr = 2.5 + a.rng() * 4, x = a.x + Math.sin(ang) * rr, z = a.z + Math.cos(ang) * rr;
    if (worldLifeOk(life, a.layer, x, z, a.r) && z > (worldLifeGrid(life, a.layer) || { nearZ: 0 }).nearZ + 1.2) best = [x, z];
  }
  if (!best) return;
  a.homeLayer = a.layer; a.layer = 'air';
  a.hop = { t0: life.t, dur: 0.9 + a.rng() * 0.6, x0: a.x, z0: a.z, x1: best[0], z1: best[1], y0: worldNavY(life.nav, a.homeLayer, a.x, a.z), up: 0.8 + a.rng() * 0.8 };
  a.bs = 'fly'; a.clip = 'fly';
  // the lift-off already moves: the first tick of the hop has the hop's speed, so a bird in the air is never drawn flying while it is 'still' (animStill)
  a.vx = (best[0] - a.x) / a.hop.dur; a.vz = (best[1] - a.z) / a.hop.dur; a.speed = Math.hypot(a.vx, a.vz); a.svx = a.vx; a.svz = a.vz;   // a bird takes off at once: the shown velocity too
  life.bus.emit('lift', { id: a.id, x: a.x, z: a.z, by: o.id });
}

/* ---------- one fixed step: the brain, nav and move passes ---------- */
function _wlfHashBuild(life) {
  var h = life.hash;
  h.forEach(function (v) { v.length = 0; });
  for (var i = 0; i < life.agents.length; i++) {
    var a = life.agents[i]; if (a.dead) continue;
    var k = (Math.floor(a.x / 2) + 4096) * 8192 + (Math.floor(a.z / 2) + 4096), b = h.get(k);
    if (!b) { b = []; h.set(k, b); }
    b.push(a);
  }
}
/** brain phase: the clock, arrivals, reactions, states and goals. */
function _wlfPassBrain(life, dt) {
  life.t += dt;
  _wlfSpawnPass(life, dt);
  _wlfHashBuild(life);
  _wlfReactions(life, dt);
  var A = life.agents;
  for (var i = 0; i < A.length; i++) {
    var a = A[i]; if (a.dead) continue;
    a.px = a.x; a.pz = a.z;
    a.phase = (a.phase + dt * (0.5 + (a.speed || 0))) % 1;
    try { _wlfBrain(life, a, dt); } catch (e) { a.dir = null; _wlfProblem(life, { pop: a.pop, rule: 'error', msg: a.id + ': ' + (e && e.message) }); }
  }
}
/** nav phase: routes are built lazily by the brain; here a still mover turns to its point of interest. */
function _wlfPassNav(life, dt) {
  var A = life.agents;
  for (var i = 0; i < A.length; i++) { var a = A[i]; if (!a.dead) _wlfLookTurn(life, a, dt); }
}
/** move phase: steering, integration, traffic, and the departed are dropped. */
function _wlfPassMove(life, dt) {
  var A = life.agents;
  for (var i = 0; i < A.length; i++) {
    var a = A[i]; if (a.dead) continue;
    try { _wlfMove(life, a, dt); } catch (e) { a.vx = 0; a.vz = 0; if (!a.moveErr) { a.moveErr = 1; _wlfProblem(life, { pop: a.pop, rule: 'error', msg: a.id + ' move: ' + (e && e.message) }); } }
  }
  for (var wi = 0; wi < A.length; wi++) if (!A[wi].dead) _wlfWatchdog(life, A[wi]);
  try { _wlfSeparate(life); } catch (e) { _wlfProblem(life, { pop: -1, rule: 'error', msg: 'separate: ' + (e && e.message) }); }
  // the lead is never longer than it is: the last word, after the pushes of the separation pass
  for (var li = 0; li < A.length; li++) { var dg = A[li]; if (!dg.dead && dg.lead && dg.leader && !dg.leader.dead) _wlfLeash(life, dg, dt); }
  _wlfTrafficPass(life, dt);
  var w = 0;
  for (var k = 0; k < A.length; k++) { if (!A[k].dead) A[w++] = A[k]; else life.byId.delete(A[k].id); }
  A.length = w;
  if (life.leads.length) life.leads = life.leads.filter(function (l) { return life.byId.has(l.a) && life.byId.has(l.b); });
}
function worldLifeStep(life, dt) {
  _wlfPassBrain(life, dt);
  _wlfPassNav(life, dt);
  _wlfPassMove(life, dt);
}
function worldLifeTick(life, dt) {
  if (!(dt > 0)) return;
  life.acc += Math.min(dt, 0.5);
  var n = 0;
  while (life.acc >= life.step && n < 8) { worldLifeStep(life, life.step); life.acc -= life.step; n++; }
  if (n === 8) life.acc = 0;
  life.alpha = life.acc / life.step;
}

/* ---------- the agent records ---------- */
function worldAgents(life) {
  var out = [], al = life.alpha;
  for (var i = 0; i < life.agents.length; i++) {
    var a = life.agents[i];
    var x = a.px + (a.x - a.px) * al, z = a.pz + (a.z - a.pz) * al;
    if (a.layer !== 'air' && !a.host && a.kind !== 'lane' && a.kind !== 'rail' && !worldLifeOk(life, a.layer, x, z)) { x = a.x; z = a.z; }
    var st = a.brain.states[a.bs] || {};
    var state = a.state, pose = a.pose;
    var alpha = 1;
    if (a.fadeIn) alpha = Math.min(alpha, _wlfClamp((life.t - a.born) / a.fadeIn, 0, 1));
    if (a.fadeOut) alpha = Math.min(alpha, _wlfClamp(1 - (life.t - a.fadeOut) / 0.6, 0, 1));
    var deg = ((a.heading * 180 / Math.PI) % 360 + 360) % 360;
    var shown = a.svx != null && a.kind !== 'lane' && a.kind !== 'rail';
    out.push({ id: a.id, cls: a.cls, who: a.who, obj: a.obj, variant: a.variant == null ? null : a.variant, x: x, y: a.y, z: z, vx: shown ? a.svx : a.vx, vz: shown ? a.svz : a.vz,
      heading: a.heading, facing: deg, speed: shown ? Math.hypot(a.svx, a.svz) : a.speed || 0, state: state, pose: pose, age: a.age, h: a.h, layer: a.layer,
      level: a.layer.indexOf('@') > 0 ? +a.layer.split('@')[1] : 0, host: a.host, group: a.group, lookAt: a.lookAt, view: a.view, mirror: a.mirror,
      born: a.born, leaving: a.leaving || false, alpha: alpha, clip: a.clip || st.clip, phase: a.phase, kind: a.kind, lead: a.lead, edge: a.edge,
      outfit: a.outfit == null ? null : a.outfit, breed: a.breed || null, gait: a.gait, gaitName: a.gaitName || null, len: a.len || null, framed: false,
      r: a.r, intent: _wlfIntent(a), squeeze: !!(a.squeeze > life.t), stepping: !!a.step || (a.stepEnd != null && life.t - a.stepEnd < 0.6), leader: a.leader ? a.leader.id : null, resident: !!a.resident,
      wants: !!(a.dir && a.spd > 0) });
  }
  return out;
}
/**
 * The crowd check (Y4, A2, A11) over one frame of agent records (worldAgents), for the motion tool, the invariants and tests.
 * mem: an object kept between frames by the caller (the streaks); t: the scene time. Returns [{ rule, a, b, t, msg }]:
 *   overlap   two bodies on the walk layer closer than 0.85 x their radii (people 0.28 m, others 0.15 m), group mates too;
 *   standoff  two walkers that both want to move stand still within 1.2 m of each other for over 6 s (nose to nose; the
 *             stuck handler re-plans at 3 s);
 *   clone     two people with the same object and variant within 3 m, going the same way (or both still), for over 8 s.
 * Movers fading in or out, seated, aboard a host, lanes and rails are left out. Each streak is reported once.
 */
function worldLifeCrowdCheck(agents, mem, t) {
  mem = mem || {}; t = +t || 0;
  var out = [], live = {}, P = [];
  for (var i = 0; i < (agents || []).length; i++) {
    var a = agents[i];
    if (!a || !a.layer || String(a.layer).split('@')[0] !== 'walk' || a.host || a.kind === 'lane' || a.kind === 'rail') continue;
    if (a.alpha != null && a.alpha < 1) continue;
    if (a.pose === 'sit' || a.state === 'sit') continue;
    P.push(a);
  }
  var person = function (a) { return /^person./.test(a.obj || '') || a.kind === 'walker' && a.cls !== 'dog' && a.cls !== 'pigeon'; };
  var body = function (a) { return person(a) ? 0.28 : 0.15; };                     // a dog at heel may brush a leg
  var streak = function (k, limit, rule, a, b, msg) {
    live[k] = 1;
    if (mem[k] == null) mem[k] = { t0: t, done: false };
    if (!mem[k].done && t - mem[k].t0 > limit) { mem[k].done = true; out.push({ rule: rule, a: a.id, b: b.id, t: t, msg: msg + ' for ' + (t - mem[k].t0).toFixed(1) + ' s' }); }
  };
  for (i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
    var p = P[i], q = P[j], d = Math.hypot(p.x - q.x, p.z - q.z);
    if (d > 3.2 || p.layer !== q.layer) continue;
    // a dog at heel on its own walker's lead walks by the walker's legs: through it only nearer than life's group floor (0.6 x their
    // radii; merge of 15 Oct: main's leash keeps a dog at heel, uk-rebuild's kept it 0.65 m off); a dog snapped onto its walker still is one
    var heel = (p.lead && q.id === p.leader) || (q.lead && p.id === q.leader);
    var floor = heel && Number.isFinite(p.r) && Number.isFinite(q.r) ? 0.57 * (p.r + q.r) : 0.85 * (body(p) + body(q));   // (5 % under the floor: its rounding)
    if (d < floor) out.push({ rule: 'overlap', a: p.id, b: q.id, t: t, msg: p.id + ' and ' + q.id + ' are ' + d.toFixed(2) + ' m apart (bodies through each other)' });
    var key = p.id < q.id ? p.id + '|' + q.id : q.id + '|' + p.id;
    if (p.wants && q.wants && (p.speed || 0) < 0.05 && (q.speed || 0) < 0.05 && d < 1.2) streak('s:' + key, 6, 'standoff', p, q, p.id + ' and ' + q.id + ' both want to move and stand ' + d.toFixed(2) + ' m apart');
    if (person(p) && p.obj === q.obj && p.variant != null && p.variant === q.variant && (p.outfit == null || q.outfit == null || p.outfit === q.outfit) && d < 3) {
      var vp = Math.hypot(p.vx || 0, p.vz || 0), vq = Math.hypot(q.vx || 0, q.vz || 0);
      var same = (vp < 0.2 && vq < 0.2) || (vp >= 0.2 && vq >= 0.2 && ((p.vx || 0) * (q.vx || 0) + (p.vz || 0) * (q.vz || 0)) > 0.5 * vp * vq);
      if (same) streak('c:' + key, 8, 'clone', p, q, p.id + ' and ' + q.id + ' look the same (' + p.obj + ' #' + p.variant + ') side by side');
    }
  }
  for (var k in mem) if (!live[k]) delete mem[k];
  return out;
}
/**
 * What a mover is trying to do, for the checkers (invariants `stuck`, `personalSpace`): 'travel' (it has somewhere to go and
 * should be getting there: a route goal, leaving, a vehicle or a boat under way) or 'stay' (seated, queuing, viewing,
 * idling inside its goal, moored, aboard, in the air). A mover with travel intent that stops for ten seconds is stuck,
 * whatever pose it is drawn in.
 */
function _wlfIntent(a) {
  if (a.dead || a.kind === 'moored' || a.layer === 'air' || a.host || a.step) return 'stay';
  if (a.kind === 'lane' || a.kind === 'rail') return a.bs === 'stopped' ? 'stay' : 'travel';
  if (a.flee || a.leaving) return 'travel';
  var g = a.goals ? a.goals[a.gi] || null : null;
  if (!g) return a.kind === 'boat' ? 'travel' : 'stay';
  return g.go != null || g.leave != null || g.follow != null || g.meet != null ? 'travel' : 'stay';
}
/** The dog leads: [{ id, a: walker id, b: dog id, len, ax, ay, az, bx, by, bz }] (the hand to the collar). */
function worldLifeLeads(life) {
  var out = [];
  for (var i = 0; i < life.leads.length; i++) {
    var l = life.leads[i], A = life.byId.get(l.a), B = life.byId.get(l.b); if (!A || !B) continue;
    out.push({ id: l.id, a: l.a, b: l.b, len: l.len, ax: A.x, ay: A.y + A.hStand * 0.48, az: A.z, bx: B.x, by: B.y + B.hStand * 0.75, bz: B.z });
  }
  return out;
}

/* ---------- the systems runtime (Y1, Y2): life registers its brain, nav and move systems ---------- */
/** The Life a world's systems drive (created by the 'life-brain' system's init). */
function worldLifeOf(world) { return world && world._wlfLife || null; }
function _wlfSysInit(world) {
  if (!world || world._wlfLife) return;
  try {
    var nav = world.nav || (typeof worldNavBuild === 'function' ? worldNavBuild(world) : null);
    if (!nav) return;
    world.nav = nav;
    var ctx = world.time || world.ctx || null;
    world._wlfLife = worldLifeInit(world, nav, Number.isFinite(world.t0) ? world.t0 : 0, { ctx: ctx });
    world.sim = world._wlfLife; world.agents = world._wlfLife.agents;
  } catch (e) { world._wlfLife = null; }
}
(function () {
  if (typeof worldSystem !== 'function') return;
  var life = function (world) { if (world && !world._wlfLife) _wlfSysInit(world); return world && world._wlfLife; };
  try {
    worldSystem({ id: 'life', phase: 'brain', rate: 15, budgetMs: 0.6, components: { read: ['transform', 'desc'], write: ['brain'] },
      init: function (world) { _wlfSysInit(world); }, update: function (world, dt) { var L = life(world); if (L) _wlfPassBrain(L, dt); },
      // A1: a change of weather (or the hour band) re-reads the densities; nothing already out is removed
      onEvent: { weather: function (world, e) { var L = life(world); if (L) worldLifeRetime(L, (e && e.ctx) || world.time || null); } } });
    worldSystem({ id: 'life-nav', phase: 'nav', rate: 15, budgetMs: 0.4, components: { read: ['brain', 'transform'], write: ['brain'] },
      update: function (world, dt) { var L = life(world); if (L) _wlfPassNav(L, dt); } });
    worldSystem({ id: 'life-move', phase: 'move', rate: 15, budgetMs: 0.5, components: { read: ['brain'], write: ['transform', 'agents'] },
      update: function (world, dt) { var L = life(world); if (L) { _wlfPassMove(L, dt); world.agents = L.agents; } },
      degrade: function (level, world) { var L = world && world._wlfLife; if (L) L.max = Math.round(60 * [1, 0.85, 0.7, 0.5][Math.max(0, Math.min(3, level | 0))]); } });
  } catch (e) { /* the runner refused: the host still drives worldLifeTick */ }
})();

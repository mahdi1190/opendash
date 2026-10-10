// World engine v3, module C (life): characters, populations, goals, avoidance.
// docs/dev/WORLD_ENGINE.md sections 3.3, 4, 8.3. Pure (Node + browser). Movement goes ONLY through
// module B (worldStep / worldPath / worldNavLayer / worldSpawnCells), and every step is re-checked
// against the agent's layer, so an agent can never stand on a forbidden cell (walls, hedges, boats,
// banks). Floaters have no y of their own: y is the water level. Facing comes from world velocity with
// hysteresis; heading turns at a class-limited rate (no instant turns). Agents appear and vanish only
// on spawn cells (frame edges or behind cover); residents are placed once at init, before any frame.
//
// Interface:
//   worldLifeInit(world, nav, t0, opts?) -> Life     (deterministic: seed + floor(t0); warm-up 90 s at 0.25 s)
//   worldLifeTick(life, dt)                           (fixed 1/15 s sub-steps, positions interpolated)
//   worldAgents(life) -> [{ id, cls, obj, variant, x, y, z, vx, vz, state, clip, phase, view, mirror, host, h }]
//   worldLifeOk(life, layer, x, z) -> bool            (the layer check every step must pass)
// Life also keeps `events` ([{ t, kind: 'spawn' | 'leave', id, x, z }], capped) and `problems`.

var WORLD_LIFE_STEP = 1 / 15;
var WORLD_LIFE_WARM = { step: 0.25, secs: 90 };
var WORLD_VIEWS = ['back', 'q-back', 'side', 'q-front', 'front'];

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
function worldLifeRange(rng, v) {
  if (Array.isArray(v)) return v[0] + (v[1] - v[0]) * rng();
  return +v || 0;
}
function worldLifePick(rng, weights) {
  var k, tot = 0;
  for (k in weights) tot += weights[k];
  var r = rng() * tot;
  for (k in weights) { r -= weights[k]; if (r <= 0) return k; }
  return k;
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

// ---- nav adapters (module B owns the grids; we only read them) ----
function worldLifeGrid(life, layer) {
  if (layer in life.grids) return life.grids[layer];
  var g = null;
  if (layer !== 'air' && typeof worldNavLayer === 'function') g = worldNavLayer(life.nav, layer) || null;
  life.grids[layer] = g;
  return g;
}
function worldLifeOk(life, layer, x, z) {
  if (layer === 'air') return true;
  var g = worldLifeGrid(life, layer);
  if (!g) return false;
  var i = Math.floor((x - g.ox) / g.cell), j = Math.floor((z - g.oz) / g.cell);
  if (i < 0 || j < 0 || i >= g.w || j >= g.h) return false;
  if (!g.data[j * g.w + i]) return false;
  // integration: B's single legality rule (clearance for the layer's default radius, the near band), not just the cost
  return typeof worldNavOk === 'function' && g.clear ? worldNavOk(life.nav, layer, x, z) : true;
}
/**
 * The cells of a layer an agent may be given as a place or a target (integration): legal by B's rule AND in a component
 * that a spawn cell reaches (else the largest), so a resident is never put, and a wanderer never sent, into a pocket it
 * cannot leave (the "walks on the spot forever" bug). Memoised per layer: Uint8Array, 1 = usable.
 */
function worldLifeReach(life, layer) {
  life.reach = life.reach || {};
  if (layer in life.reach) return life.reach[layer];
  var g = worldLifeGrid(life, layer), out = null;
  if (g && g.w && g.h && g.data) {
    var n = g.w * g.h, ok = new Uint8Array(n), comp = new Int32Array(n).fill(-1), sizes = [], i, j, k;
    for (j = 0; j < g.h; j++) for (i = 0; i < g.w; i++) ok[j * g.w + i] = worldLifeOk(life, layer, g.ox + (i + 0.5) * g.cell, g.oz + (j + 0.5) * g.cell) ? 1 : 0;
    var stack = [];
    for (k = 0; k < n; k++) {
      if (!ok[k] || comp[k] >= 0) continue;
      var c = sizes.length, size = 0; comp[k] = c; stack.push(k);
      while (stack.length) {
        var q = stack.pop(), qi = q % g.w, qj = (q - qi) / g.w; size++;
        var nb = [qi > 0 ? q - 1 : -1, qi < g.w - 1 ? q + 1 : -1, qj > 0 ? q - g.w : -1, qj < g.h - 1 ? q + g.w : -1];
        for (var t = 0; t < 4; t++) { var m = nb[t]; if (m >= 0 && ok[m] && comp[m] < 0) { comp[m] = c; stack.push(m); } }
      }
      sizes.push(size);
    }
    var keep = new Uint8Array(sizes.length);
    var sp = typeof worldSpawnCells === 'function' ? (worldSpawnCells(life.nav, layer) || []) : [];
    var any = false;
    for (var s = 0; s < sp.length; s++) {
      var p = worldLifeXZ(sp[s]); if (!p) continue;
      var si = Math.floor((p[0] - g.ox) / g.cell), sj = Math.floor((p[1] - g.oz) / g.cell);
      if (si < 0 || sj < 0 || si >= g.w || sj >= g.h) continue;
      var sc = comp[sj * g.w + si]; if (sc >= 0) { keep[sc] = 1; any = true; }
    }
    if (!any && sizes.length) { var best = 0; for (k = 1; k < sizes.length; k++) if (sizes[k] > sizes[best]) best = k; keep[best] = 1; }
    out = new Uint8Array(n);
    for (k = 0; k < n; k++) out[k] = comp[k] >= 0 && keep[comp[k]] ? 1 : 0;
  }
  life.reach[layer] = out;
  return out;
}
function worldLifeXZ(p) {
  if (!p) return null;
  if (Array.isArray(p)) return [p[0], p[1]];
  return [p.x, p.z];
}
function worldLifeSpawns(life, layer) {
  if (life.spawns[layer]) return life.spawns[layer];
  var out = [], g = worldLifeGrid(life, layer);
  var raw = typeof worldSpawnCells === 'function' && layer !== 'air' ? worldSpawnCells(life.nav, layer) || [] : [];
  for (var n = 0; n < raw.length; n++) {
    var c = raw[n], p;
    if (typeof c === 'number' && g) p = [g.ox + ((c % g.w) + 0.5) * g.cell, g.oz + (Math.floor(c / g.w) + 0.5) * g.cell];
    else p = worldLifeXZ(c);
    if (!p || !worldLifeOk(life, layer, p[0], p[1])) continue;
    var edge = c && c.edge;
    if (!edge && g) {
      var x0 = g.ox, z0 = g.oz, x1 = g.ox + g.w * g.cell, z1 = g.oz + g.h * g.cell, tol = 2 * g.cell + 0.01;
      edge = p[1] - z0 < tol ? 'S' : z1 - p[1] < tol ? 'N' : p[0] - x0 < tol ? 'W' : x1 - p[0] < tol ? 'E' : 'cover';
    }
    out.push({ x: p[0], z: p[1], edge: edge || 'cover' });
  }
  life.spawns[layer] = out;
  return out;
}
function worldLifeIsSpawn(life, layer, x, z) {
  var s = worldLifeSpawns(life, layer), g = worldLifeGrid(life, layer), tol = g ? g.cell * 1.5 : 1;
  for (var i = 0; i < s.length; i++) if (Math.abs(s[i].x - x) <= tol && Math.abs(s[i].z - z) <= tol) return true;
  return false;
}
// all open cells of a layer, optionally on one surface (for wander targets and resident placement)
function worldLifeCells(life, layer, on) {
  var key = layer + '|' + (on || '');
  if (life.cells[key]) return life.cells[key];
  var g = worldLifeGrid(life, layer), out = [];
  var reach = g ? worldLifeReach(life, layer) : null;
  if (g) for (var j = 0; j < g.h; j++) for (var i = 0; i < g.w; i++) {
    if (!g.data[j * g.w + i]) continue;
    if (reach && !reach[j * g.w + i]) continue;
    var x = g.ox + (i + 0.5) * g.cell, z = g.oz + (j + 0.5) * g.cell;
    if (on && typeof worldSurfaceAt === 'function') {
      var s = worldSurfaceAt(life.world, x, z);
      if (s && s.id !== on && layer !== 'wade') continue;
    }
    out.push(x, z);
  }
  life.cells[key] = out;
  return out;
}
function worldLifeWaterY(life) {
  var w = life.world || {};
  if (typeof w.waterY === 'number') return w.waterY;
  if (w.cam && typeof w.cam.water === 'number') return w.cam.water;
  return 0;
}
function worldLifeY(life, a) {
  var L = a.layer;
  if (L === 'swim' || L === 'wade') return worldLifeWaterY(life);    // floaters and waders: the water level, never authored
  if (L === 'air') return a.alt;
  if (typeof worldSurfaceAt === 'function') {
    var s = worldSurfaceAt(life.world, a.x, a.z);
    if (s && typeof s.y === 'number') return s.y;                      // decks, bridges, boardwalks
  }
  if (typeof sceneGroundHeight === 'function' && life.world && life.world.cam) {
    var h = sceneGroundHeight(life.world.cam, a.x, a.z);
    if (typeof h === 'number' && isFinite(h)) return h;
  }
  return 0;
}

// ---- init ----
function worldLifeInit(world, nav, t0, opts) {
  opts = opts || {};
  var seed = ((world && world.seed) | 0) * 1000003 + Math.floor(t0 || 0);
  var life = {
    world: world, nav: nav, t: 0, rng: worldLifeRng(seed), grids: {}, spawns: {}, cells: {},
    agents: [], pops: [], nextId: 1, acc: 0, alpha: 1, events: [], problems: [], hash: new Map(),
    max: opts.max || 60, step: opts.step || WORLD_LIFE_STEP,
  };
  var pops = (world && world.life) || [];
  for (var p = 0; p < pops.length; p++) worldLifePopInit(life, pops[p], p);
  if (opts.warm !== false) {
    var w = opts.warmSecs != null ? opts.warmSecs : WORLD_LIFE_WARM.secs;
    for (var s = 0; s < w; s += WORLD_LIFE_WARM.step) worldLifeStep(life, WORLD_LIFE_WARM.step);
  }
  life.events.length = 0;
  for (var k = 0; k < life.agents.length; k++) { var a = life.agents[k]; a.px = a.x; a.pz = a.z; }
  return life;
}
function worldLifeWhoOf(who) {
  var m = worldLifeWho[who];
  if (m) return m;
  if (worldBrains[who]) return { cls: who, obj: who };
  return null;
}
function worldLifePopInit(life, spec, idx) {
  var pop = { spec: spec, idx: idx, rate: spec.rate ? worldLifeRate(spec.rate) : spec.every ? worldLifeRate(spec.every) : 0,
    acc: 0, mix: spec.mix || null };
  if (!pop.mix) {
    var m = worldLifeWhoOf(spec.who);
    if (!m) { life.problems.push({ pop: idx, rule: 'unknownWho', msg: 'unknown life who: ' + spec.who }); return; }
    pop.mix = {}; pop.mix[spec.who] = 1;
  }
  for (var k in pop.mix) {
    var mm = worldLifeWhoOf(k);
    if (!mm) { life.problems.push({ pop: idx, rule: 'unknownWho', msg: 'unknown life who: ' + k }); return; }
    var b = worldBrains[mm.cls];
    if (b.layer !== 'air' && !worldLifeSpawns(life, b.layer).length)
      life.problems.push({ pop: idx, rule: 'noSpawn', msg: 'no spawn cell on layer ' + b.layer + ' for ' + k });
  }
  if (pop.rate) pop.acc = life.rng();          // stagger first arrival
  life.pops.push(pop);
  if (spec.count) {
    var lead = null;
    for (var n = 0; n < spec.count; n++) {
      var a = worldLifeSpawnAgent(life, pop, true, spec.group && lead ? lead : null);
      if (a && spec.group && !lead) lead = a;
    }
  }
}

function worldLifeNewAgent(life, pop, who, x, z) {
  var m = worldLifeWhoOf(who), b = worldBrains[m.cls];
  var a = {
    id: 'a' + (life.nextId++), cls: m.cls, who: who, obj: (pop.spec.obj && pop.spec.obj[who]) || m.obj,
    variant: pop.spec.variant || null, brain: b, layer: b.layer, r: b.r, x: x, z: z, px: x, pz: z, y: 0,
    alt: 0, vx: 0, vz: 0, heading: life.rng() * Math.PI * 2, spd: 0, state: b.start, st: 0, clip: '',
    phase: life.rng(), view: 'side', mirror: false, bucket: 2, host: pop.spec.host || null,
    goals: null, gi: 0, gt: 0, path: null, pi: 0, target: null, leader: null, off: null,
    stuckT: 0, replans: 0, leaving: false, dead: false, pop: pop.idx, perch: null, lastMove: 0,
  };
  worldLifeEnter(life, a, b.start);
  return a;
}
function worldLifeSpawnAgent(life, pop, resident, leader) {
  if (life.agents.length >= life.max) return null;
  var spec = pop.spec, who = worldLifePick(life.rng, pop.mix), m = worldLifeWhoOf(who), b = worldBrains[m.cls];
  var x, z, ok = false, sp = null;
  if (b.layer === 'air') {
    var perches = worldLifePerches(life);
    if (b.perch && !perches.length) { life.problems.push({ pop: pop.idx, rule: 'noPerch', msg: who + ' needs a host entity with a perch point' }); return null; }
    var hp = perches.length ? perches[Math.floor(life.rng() * perches.length)] : { x: 0, z: 30, y: 15 };
    x = hp.x; z = hp.z; ok = true;
    var a0 = worldLifeNewAgent(life, pop, who, x, z);
    a0.alt = hp.y; a0.perch = hp; a0.home = hp;
    life.agents.push(a0); worldLifeEvent(life, 'spawn', a0);
    return a0;
  }
  if (leader) {
    var lo = [leader.x + 0.8, leader.z + 0.4];
    for (var t = 0; t < 8 && !ok; t++) {
      x = lo[0] + (life.rng() - 0.5) * 2; z = lo[1] + (life.rng() - 0.5) * 2;
      ok = worldLifeOk(life, b.layer, x, z) && (!resident || true);
      if (ok && !resident && !worldLifeIsSpawn(life, b.layer, x, z)) ok = false;
    }
    if (!ok) { x = leader.x; z = leader.z; ok = worldLifeOk(life, b.layer, x, z); }
  } else if (resident) {
    var cells = worldLifeCells(life, b.layer, spec.on);
    if (!cells.length) cells = worldLifeCells(life, b.layer, null);
    for (var tr = 0; tr < 12 && cells.length && !ok; tr++) {
      var c = Math.floor(life.rng() * cells.length / 2) * 2;
      x = cells[c]; z = cells[c + 1]; ok = !worldLifeCrowded(life, b.layer, x, z, b.r * 3);
    }
  } else {
    var all = worldLifeSpawns(life, b.layer), cand = all;
    if (spec.edges) cand = all.filter(function (s) { return spec.edges.indexOf(s.edge) >= 0; });
    if (!cand.length) cand = all;
    for (var tt = 0; tt < 6 && cand.length && !ok; tt++) {
      sp = cand[Math.floor(life.rng() * cand.length)];
      x = sp.x; z = sp.z; ok = !worldLifeCrowded(life, b.layer, x, z, b.r * 4 + 0.5);
    }
  }
  if (!ok) return null;
  var a = worldLifeNewAgent(life, pop, who, x, z);
  a.y = worldLifeY(life, a);
  if (leader) { a.leader = leader; a.off = [0.8, -0.6]; }
  // goal list: authored, else residents wander for ever, else cross to another edge and leave
  if (spec.goals) a.goals = spec.goals;
  else if (resident) a.goals = [{ wander: spec.on || null, for: Infinity }];
  else {
    var edges = spec.edges && spec.edges.length ? spec.edges : ['N', 'S', 'E', 'W'];
    var others = edges.filter(function (e) { return !sp || e !== sp.edge; });
    a.goals = [{ leave: (others.length ? others : edges)[Math.floor(life.rng() * (others.length || edges.length))] }];
  }
  if (spec.state && b.states[spec.state]) worldLifeEnter(life, a, spec.state);
  life.agents.push(a);
  worldLifeEvent(life, 'spawn', a);
  // group members (dog with walker): spawn beside the leader
  if (b.group && !leader) for (var g = 0; g < b.group.length; g++) {
    var gm = b.group[g], gb = worldBrains[worldLifeWhoOf(gm.who).cls];
    if (!worldLifeOk(life, gb.layer, x, z)) continue;
    var f = worldLifeNewAgent(life, pop, gm.who, x, z);
    f.leader = a; f.off = gm.off; f.goals = []; f.y = worldLifeY(life, f);
    life.agents.push(f); worldLifeEvent(life, 'spawn', f);
  }
  return a;
}
function worldLifeEvent(life, kind, a) {
  if (life.events.length < 5000) life.events.push({ t: life.t, kind: kind, id: a.id, x: a.x, z: a.z, layer: a.layer });
}
function worldLifeCrowded(life, layer, x, z, d) {
  for (var i = 0; i < life.agents.length; i++) {
    var o = life.agents[i];
    if (o.layer === layer && (o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < d * d) return true;
  }
  return false;
}
function worldLifePerches(life) {
  if (life._perches) return life._perches;
  var out = [], ents = (life.world && life.world.entities) || [];
  for (var i = 0; i < ents.length; i++) {
    var e = ents[i];
    if (e.perch || /post|perch|mooring|stake/.test(e.obj || '')) {
      var p = e.perch || [0, e.height || 1.2];
      out.push({ id: e.id, x: e.x + (p.length > 2 ? p[0] : 0), z: e.z + (p.length > 2 ? p[2] : 0), y: p.length > 2 ? p[1] : p[1] || e.height || 1.2 });
    }
  }
  life._perches = out;
  return out;
}

function worldLifeEnter(life, a, state) {
  var st = a.brain.states[state] || a.brain.states[a.brain.start];
  if (!a.brain.states[state]) state = a.brain.start;
  a.state = state; a.st = worldLifeRange(life.rng, st.dur || [3, 6]);
  a.spd = worldLifeRange(life.rng, st.speed || 0); a.clip = st.clip || state;
}

// ---- goals ----
function worldLifePoint(life, a, tgt) {
  if (Array.isArray(tgt)) return tgt;
  if (typeof tgt === 'string') {
    var ents = (life.world && life.world.entities) || [];
    for (var i = 0; i < ents.length; i++) if (ents[i].id === tgt) {
      // stand in front of the entity (towards the camera), on the agent's layer
      var e = ents[i], best = null, bd = 1e9, cells = worldLifeCells(life, a.layer, null);
      for (var c = 0; c < cells.length; c += 2) {
        var d = (cells[c] - e.x) * (cells[c] - e.x) + (cells[c + 1] - e.z) * (cells[c + 1] - e.z);
        if (d < bd) { bd = d; best = [cells[c], cells[c + 1]]; }
      }
      return best;
    }
    for (var k = 0; k < life.agents.length; k++) if (life.agents[k].id === tgt) return [life.agents[k].x, life.agents[k].z];
  }
  return null;
}
function worldLifeLeaveCell(life, a, edge) {
  var s = worldLifeSpawns(life, a.layer), best = null, bd = 1e18;
  for (var i = 0; i < s.length; i++) {
    if (edge && edge !== 'any' && s[i].edge !== edge) continue;
    var d = (s[i].x - a.x) * (s[i].x - a.x) + (s[i].z - a.z) * (s[i].z - a.z) + life.rng() * 4;
    if (d < bd) { bd = d; best = s[i]; }
  }
  if (!best && edge && edge !== 'any') return worldLifeLeaveCell(life, a, 'any');
  return best;
}
function worldLifeRoute(life, a, to) {
  a.target = to; a.pi = 0;
  a.path = typeof worldPath === 'function' ? worldPath(life.nav, a.layer, [a.x, a.z], to) : [to];
  if (a.path && a.path.length && !Array.isArray(a.path[0])) a.path = a.path.map(worldLifeXZ);
  return !!a.path;
}
function worldLifeGoal(life, a) {
  if (!a.goals) return null;
  return a.goals[a.gi] || null;
}
function worldLifeNextGoal(life, a) { a.gi++; a.gt = 0; a.path = null; a.target = null; }

// returns desired [dx, dz] unit direction (or null to stand still)
function worldLifeDesire(life, a, dt) {
  if (a.leader) {
    var L = a.leader;
    if (L.dead) { if (!a.leaving) worldLifeLeave(life, a, null); a.leader = null; }
    else {
      var hx = Math.sin(L.heading), hz = Math.cos(L.heading);
      var tx = L.x + hx * a.off[1] + hz * a.off[0], tz = L.z + hz * a.off[1] - hx * a.off[0];
      if (!worldLifeOk(life, a.layer, tx, tz)) { tx = L.x - hx * 0.8; tz = L.z - hz * 0.8; }
      var dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
      a.spd = Math.min(Math.max(L.spd * 1.1, 0.4) * Math.min(1, d), 3);
      if (d < 0.15) { a.spd = 0; return null; }
      if (d > 2.5 && (!a.path || a.pi >= a.path.length || a.gt > 1)) { worldLifeRoute(life, a, [tx, tz]); a.gt = 0; }
      a.gt += dt;
      if (d > 2.5 && a.path && a.pi < a.path.length) return worldLifeFollow(a);
      return [dx / d, dz / d];
    }
  }
  var g = worldLifeGoal(life, a);
  if (!g) {
    if (!a.leaving) worldLifeLeave(life, a, null);
    g = worldLifeGoal(life, a);
    if (!g) return null;
  }
  a.gt += dt;
  if (g['do']) {
    if (a.state !== g['do']) { worldLifeEnter(life, a, g['do']); a.st = worldLifeRange(life.rng, g['for'] || a.st); }
    if (a.st <= 0) worldLifeNextGoal(life, a);
    return null;
  }
  var moving = (a.brain.states[a.state] || {}).speed;
  if (g.go || g.leave || g.meet || g.wander !== undefined) {
    if (g.wander !== undefined && a.gt > (g['for'] == null ? Infinity : worldLifeRange(life.rng, g['for']))) { worldLifeNextGoal(life, a); return null; }
    if (!a.target) {
      var to = null;
      if (g.leave) { var c = worldLifeLeaveCell(life, a, g.leave); a.leaving = true; to = c && [c.x, c.z]; }
      else if (g.go || g.meet) to = worldLifePoint(life, a, g.go || g.meet);
      else {
        var cells = worldLifeCells(life, a.layer, g.wander);
        if (!cells.length) cells = worldLifeCells(life, a.layer, null);
        if (cells.length) {
          // nearby wander target (keeps residents local and paths short)
          for (var t = 0; t < 6; t++) {
            var ci = Math.floor(life.rng() * cells.length / 2) * 2;
            to = [cells[ci], cells[ci + 1]];
            if (Math.hypot(to[0] - a.x, to[1] - a.z) < 25) break;
          }
        }
      }
      if (!to || !worldLifeRoute(life, a, to)) {
        a.target = null;
        // integration: no route is never "walk on the spot": stand (idle) after 3 tries, and give up the goal
        a.routeFail = (a.routeFail || 0) + 1;
        if (a.routeFail >= 3 && moving) { a.routeFail = 0; worldLifeEnter(life, a, a.brain.states.idle ? 'idle' : a.brain.start); if (!g.leave) worldLifeNextGoal(life, a); }
        return null;
      }
      a.routeFail = 0;
    }
    var dx2 = a.target[0] - a.x, dz2 = a.target[1] - a.z;
    if (dx2 * dx2 + dz2 * dz2 < 0.36) {
      if (g.leave) { if (worldLifeIsSpawn(life, a.layer, a.x, a.z)) worldLifeDespawn(life, a); else { a.target = null; } return null; }
      if (g.meet) { worldLifeNextGoal(life, a); worldLifeEnter(life, a, 'chat'); return null; }
      if (g.wander !== undefined) { a.target = null; a.path = null; return null; }
      worldLifeNextGoal(life, a); return null;
    }
    if (!moving && !g.leave) return null;
    return worldLifeFollow(a);
  }
  worldLifeNextGoal(life, a);
  return null;
}
function worldLifeFollow(a) {
  var p = a.path;
  if (!p || !p.length) return null;
  while (a.pi < p.length - 1 && Math.hypot(p[a.pi][0] - a.x, p[a.pi][1] - a.z) < Math.max(0.4, a.r * 2)) a.pi++;
  var w = p[Math.min(a.pi, p.length - 1)], dx = w[0] - a.x, dz = w[1] - a.z, d = Math.hypot(dx, dz);
  if (d < 1e-6) return null;
  return [dx / d, dz / d];
}
function worldLifeLeave(life, a, edge) {
  a.goals = [{ leave: edge || 'any' }]; a.gi = 0; a.gt = 0; a.path = null; a.target = null; a.leaving = true;
}
function worldLifeDespawn(life, a) {
  a.dead = true; worldLifeEvent(life, 'leave', a);
}

// ---- local avoidance: uniform spatial hash (2 m), same layer only, VO-lite over 6 neighbours, 1.5 s ----
function worldLifeHashKey(x, z) { return ((Math.floor(x / 2) + 4096) * 8192 + (Math.floor(z / 2) + 4096)); }
function worldLifeHashBuild(life) {
  var h = life.hash;
  h.forEach(function (v) { v.length = 0; });
  for (var i = 0; i < life.agents.length; i++) {
    var a = life.agents[i], k = worldLifeHashKey(a.x, a.z), b = h.get(k);
    if (!b) { b = []; h.set(k, b); }
    b.push(a);
  }
}
function worldLifeAvoid(life, a, dir, spd) {
  if (a.layer === 'air' || a.brain.heavy) return dir;
  var vx = dir[0] * spd, vz = dir[1] * spd, ax = 0, az = 0, n = 0;
  var cx = Math.floor(a.x / 2), cz = Math.floor(a.z / 2);
  for (var ix = -1; ix <= 1 && n < 6; ix++) for (var iz = -1; iz <= 1 && n < 6; iz++) {
    var b = life.hash.get((cx + ix + 4096) * 8192 + (cz + iz + 4096));
    if (!b) continue;
    for (var j = 0; j < b.length && n < 6; j++) {
      var o = b[j];
      if (o === a || o.layer !== a.layer || o.dead || o === a.leader || o.leader === a) continue;
      var rx = o.x - a.x, rz = o.z - a.z, rvx = o.vx - vx, rvz = o.vz - vz;
      var rr = a.r + o.r + 0.15, vv = rvx * rvx + rvz * rvz;
      var tca = vv > 1e-6 ? -(rx * rvx + rz * rvz) / vv : 0;
      if (tca < 0) tca = 0;
      if (tca > 1.5) continue;
      var mx = rx + rvx * tca, mz = rz + rvz * tca, md = Math.hypot(mx, mz);
      if (md >= rr) continue;
      n++;
      var w = (rr - md) / rr * (1.5 - tca) / 1.5 * (o.brain.heavy ? 3 : 1);
      // push sideways, away from the closest-approach point; break symmetry to the right
      var px = -mx, pz = -mz;
      if (md < 1e-3) { px = dir[1]; pz = -dir[0]; }
      var pl = Math.hypot(px, pz) || 1;
      ax += px / pl * w; az += pz / pl * w;
    }
  }
  if (!n) return dir;
  var nx = dir[0] + ax * 1.5, nz = dir[1] + az * 1.5, l = Math.hypot(nx, nz);
  return l > 1e-6 ? [nx / l, nz / l] : dir;
}

// ---- facing: world velocity vs the view ray -> 5 views + mirrors, 15 degree hysteresis ----
function worldLifeFace(a) {
  var sp = Math.hypot(a.vx, a.vz);
  var hx = sp > 0.02 ? a.vx / sp : Math.sin(a.heading), hz = sp > 0.02 ? a.vz / sp : Math.cos(a.heading);
  var rl = Math.hypot(a.x, a.z) || 1, rx = a.x / rl, rz = a.z / rl;
  var dot = rx * hx + rz * hz, crs = rx * hz - rz * hx;     // crs < 0: moving to screen right
  var ang = Math.atan2(-crs, dot) * 180 / Math.PI;           // signed, + = right
  var abs = Math.abs(ang);
  if (a.brain.views === 'side') { a.view = 'side'; a.bucket = 2; if (abs > 15 && abs < 165) a.mirror = ang < 0; return; }
  var b = a.bucket, lo = b * 45 - 22.5 - 15, hi = b * 45 + 22.5 + 15;
  if (abs < lo || abs > hi) b = Math.round(abs / 45);
  a.bucket = b; a.view = WORLD_VIEWS[b];
  if (abs > 15 && abs < 165) a.mirror = ang < 0;
}

// ---- one fixed step ----
function worldLifeStep(life, dt) {
  life.t += dt;
  // populations with a rate
  for (var p = 0; p < life.pops.length; p++) {
    var pop = life.pops[p];
    if (!pop.rate) continue;
    pop.acc += pop.rate * dt;
    while (pop.acc >= 1) { pop.acc -= 1; worldLifeSpawnAgent(life, pop, false, null); }
  }
  worldLifeHashBuild(life);
  var A = life.agents;
  for (var i = 0; i < A.length; i++) {
    var a = A[i];
    if (a.dead) continue;
    a.px = a.x; a.pz = a.z;
    a.phase = (a.phase + dt * (0.5 + a.spd)) % 1;
    a.st -= dt;
    if (a.layer === 'air') { worldLifeAir(life, a, dt); worldLifeFace(a); continue; }
    var g = worldLifeGoal(life, a);
    if (a.st <= 0 && !(g && g['do'])) {
      var st = a.brain.states[a.state];
      var nx = st && st.next ? worldLifePick(life.rng, st.next) : a.brain.start;
      if (a.state === 'chat' || a.state === 'sit') nx = (a.brain.states.walk ? 'walk' : a.brain.start);
      worldLifeEnter(life, a, nx);
    }
    var dir = worldLifeDesire(life, a, dt);
    if (a.dead) continue;
    var want = dir ? a.spd : 0;
    if (a.leaving && dir && want < 0.3) {
      // leaving agents keep walking (no idling forever at the edge)
      var mv = a.brain.states.walk || a.brain.states.swim || a.brain.states.stalk || a.brain.states.graze;
      if (mv && mv.speed) { a.state = a.brain.states.walk ? 'walk' : a.brain.states.swim ? 'swim' : 'stalk'; a.clip = a.brain.states[a.state].clip || a.state; a.spd = Math.max(worldLifeRange(life.rng, mv.speed || 0.5), 0.3); want = a.spd; a.st = 5; }
    }
    if (dir && want > 0) dir = worldLifeAvoid(life, a, dir, want);
    // turn rate: 180 degrees in brain.turn seconds; slow down while turning
    var cur = a.heading, des = dir ? Math.atan2(dir[0], dir[1]) : cur;
    var diff = Math.atan2(Math.sin(des - cur), Math.cos(des - cur));
    var maxd = Math.PI / a.brain.turn * dt;
    if (diff > maxd) diff = maxd; else if (diff < -maxd) diff = -maxd;
    a.heading = cur + diff;
    var rem = Math.abs(Math.atan2(Math.sin(des - a.heading), Math.cos(des - a.heading)));
    var spd = want * Math.max(0, Math.cos(Math.min(rem, Math.PI / 2)));
    a.turning = dir && rem > Math.PI / 4;
    var vx = Math.sin(a.heading) * spd, vz = Math.cos(a.heading) * spd, ox = a.x, oz = a.z;
    if (spd > 0) {
      var np = typeof worldStep === 'function' ? worldLifeXZ(worldStep(life.nav, a.layer, [a.x, a.z], [vx, vz], a.r, dt)) : [a.x + vx * dt, a.z + vz * dt];
      if (np && worldLifeOk(life, a.layer, np[0], np[1])) { a.x = np[0]; a.z = np[1]; }
    }
    a.vx = (a.x - ox) / dt; a.vz = (a.z - oz) / dt;
    a.y = worldLifeY(life, a);
    // stuck detector: speed < 10 % of desired for 3 s -> re-plan; after two re-plans idle, then leave
    var act = Math.hypot(a.vx, a.vz);
    if (want > 0.05 && act < 0.1 * want) a.stuckT += dt; else if (act > 0.3 * want) a.stuckT = Math.max(0, a.stuckT - dt);
    if (a.stuckT > 3) {
      a.stuckT = 0; a.replans++;
      if (a.replans <= 2) { a.path = null; if (a.target) worldLifeRoute(life, a, a.target); if (a.replans === 2) worldLifeEnter(life, a, a.brain.states.idle ? 'idle' : a.brain.start); }
      else { a.stuckOut = true; a.replans = 0; worldLifeLeave(life, a, null); }
    }
    worldLifeFace(a);
  }
  // drop the departed
  var w = 0;
  for (var k = 0; k < A.length; k++) if (!A[k].dead) A[w++] = A[k];
  A.length = w;
}
// flyers and percher-divers: no nav layer; perch at a host's perch point, dive to the water and back
function worldLifeAir(life, a, dt) {
  var ox = a.x, oz = a.z;
  if (a.st <= 0) {
    var st = a.brain.states[a.state];
    worldLifeEnter(life, a, st && st.next ? worldLifePick(life.rng, st.next) : a.brain.start);
    if (a.state === 'fly' && a.brain.perch) {
      var ps = worldLifePerches(life);
      a.perch = ps[Math.floor(life.rng() * ps.length)];
    }
  }
  if (a.brain.perch) {
    var h = a.perch || a.home;
    if (a.state === 'perch') { a.x = h.x; a.z = h.z; a.alt = h.y; }
    else if (a.state === 'dive') { var k = Math.sin(Math.PI * Math.max(0, Math.min(1, a.st / 1.5))); a.alt = h.y + (worldLifeWaterY(life) - h.y) * k; }
    else {
      var dx = h.x - a.x, dz = h.z - a.z, d = Math.hypot(dx, dz), s = Math.min(d, a.spd * dt);
      if (d > 1e-6) { a.x += dx / d * s; a.z += dz / d * s; a.heading = Math.atan2(dx, dz); }
      a.alt = h.y + Math.min(2, d * 0.2);
      if (d < 0.05) worldLifeEnter(life, a, 'perch');
    }
  } else {
    a.heading += 0.15 * dt; a.alt = 20;
    a.x += Math.sin(a.heading) * a.spd * dt; a.z += Math.cos(a.heading) * a.spd * dt;
  }
  a.vx = (a.x - ox) / dt; a.vz = (a.z - oz) / dt; a.y = a.alt;
}

function worldLifeTick(life, dt) {
  if (!(dt > 0)) return;
  life.acc += Math.min(dt, 0.5);
  var n = 0;
  while (life.acc >= life.step && n < 8) { worldLifeStep(life, life.step); life.acc -= life.step; n++; }
  if (n === 8) life.acc = 0;
  life.alpha = life.acc / life.step;
}

function worldAgents(life) {
  var out = [], al = life.alpha;
  for (var i = 0; i < life.agents.length; i++) {
    var a = life.agents[i];
    var x = a.px + (a.x - a.px) * al, z = a.pz + (a.z - a.pz) * al;
    if (!worldLifeOk(life, a.layer, x, z)) { x = a.x; z = a.z; }
    var st = a.brain.states[a.state] || {};
    out.push({ id: a.id, cls: a.cls, obj: a.obj, variant: a.variant, x: x, y: a.y, z: z, vx: a.vx, vz: a.vz,
      state: a.turning ? 'turn' : a.state, clip: a.clip, phase: a.phase, view: a.view, mirror: a.mirror,
      host: a.host, h: st.h || a.brain.h, layer: a.layer });
  }
  return out;
}

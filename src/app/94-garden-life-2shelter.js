/* Rain changes the garden's routines: birds tuck under a lower crown, while
 * small mammals find a dry place by its roots. The ordinary Life authority
 * owns these routes and clips; visitors keep following its creature list. */
const GL_RAIN_REFUGE = Object.freeze({ range: 8, searchGap: 3, retryGap: 6, travel: 25, minHeight: 30, bucket: 8 });
const _glRainWorlds = new WeakMap();
const _glHabitatWorlds = new WeakMap();

/** Connect the catalogue's advertised wildlife to established local habitat.
 * A distinct plant type contributes once: repeating one tree cannot multiply
 * the attraction indefinitely. Eligibility and the director's pacing still win. */
function _glHabitatWeight(def, W) {
  let cache = _glHabitatWorlds.get(W);
  if (!cache || cache.objects !== W.objects) {
    const rows = [];
    for (const o of W.objects) {
      if (o.kind !== 'plant') continue;
      const plant = gardenPlant(o.id);
      if (!plant || !plant.attracts || !(o.stage >= (plant.cat === 'tree' ? 3 : 4))) continue;
      const targets = plant.attracts.filter(id => GL_CREATURE.has(id));
      if (targets.length) rows.push({ id: o.id, x: o.top.x, y: o.top.y, targets });
    }
    const key = rows.map(o => [o.id, o.x, o.y].join(',')).join('|');
    if (cache && cache.key === key) cache.objects = W.objects;
    else {
      const buckets = new Map(), B = GL_RAIN_REFUGE.bucket;
      for (const o of rows) { const at = Math.floor(o.x / B) + ':' + Math.floor(o.y / B); if (!buckets.has(at)) buckets.set(at, []); buckets.get(at).push(o); }
      cache = { objects: W.objects, key, rows, buckets, view: null, builds: (cache ? cache.builds : 0) + 1 };
      _glHabitatWorlds.set(W, cache);
    }
  }
  const v = W.view(), bounds = { x0: Math.floor(v.x0) - 4, y0: Math.floor(v.y0) - 4, x1: Math.ceil(v.x1) + 4, y1: Math.ceil(v.y1) + 4 };
  const key = [bounds.x0, bounds.y0, bounds.x1, bounds.y1].join('|');
  if (!cache.view || cache.view.key !== key) {
    const sources = new Map(), B = GL_RAIN_REFUGE.bucket;
    for (let y = Math.floor(bounds.y0 / B); y <= Math.floor(bounds.y1 / B); y++) for (let x = Math.floor(bounds.x0 / B); x <= Math.floor(bounds.x1 / B); x++) for (const o of cache.buckets.get(x + ':' + y) || []) {
      if (o.x < bounds.x0 || o.x > bounds.x1 || o.y < bounds.y0 || o.y > bounds.y1) continue;
      for (const id of o.targets) { if (!sources.has(id)) sources.set(id, new Set()); sources.get(id).add(o.id); }
    }
    cache.view = { key, factors: new Map([...sources].map(([id, types]) => [id, 1 + Math.min(3, types.size) * .5])) };
  }
  return cache.view.factors.get(def.id) || 1;
}

function _glRainCanopy(o, W) {
  if (!o.tree || o.height < GL_RAIN_REFUGE.minHeight) return false;
  if (W.season !== 'winter') return true;
  const def = gardenPlant(o.id), form = def && def.look && def.look.form;
  return form === 'conifer' || form === 'cone-tree' || form === 'potted-tree' || form === 'olive';
}
function _glRainTrees(W) {
  let cache = _glRainWorlds.get(W);
  if (cache && cache.objects === W.objects && cache.grid === W.grid && cache.season === W.season) return cache;
  const trees = W.objects.filter(o => _glRainCanopy(o, W));
  const key = W.season + '|' + trees.map(o => [o.uid, o.x, o.y, o.w, o.h, o.height, o.top.x, o.top.y].join(',')).join('|');
  // A repaint replaces object rows, even when physical shelter did not change.
  // Fingerprint once for that refresh, never once per creature/frame.
  if (cache && cache.key === key && cache.grid === W.grid) { cache.objects = W.objects; return cache; }
  const buckets = new Map();
  for (const o of trees) { const at = Math.floor(o.top.x / GL_RAIN_REFUGE.bucket) + ':' + Math.floor(o.top.y / GL_RAIN_REFUGE.bucket); if (!buckets.has(at)) buckets.set(at, []); buckets.get(at).push(o); }
  cache = { objects: W.objects, grid: W.grid, season: W.season, key, trees, buckets, builds: (cache ? cache.builds : 0) + 1 };
  _glRainWorlds.set(W, cache); return cache;
}
function _glRainLand(W, x, y) {
  const G = GARDEN_WORLD;
  return x > .4 && y > .4 && x < G.cols - .4 && y < G.rows - .4 && !W.water(x, y)
    && !String(gardenAreaAt(Math.floor(x), Math.floor(y), W.level)).startsWith('locked:');
}
function _glRainSlot(c, o) {
  const used = new Set();
  if (typeof _gl !== 'undefined') for (const other of _gl.list) {
    const s = other !== c && other.cur && other.cur.name === 'rain-refuge' && other.mem.s;
    if (s && s.obj.uid === o.uid) used.add(s.refugeSlot);
  }
  for (let i = 0; i < 3; i++) if (!used.has(i)) return i;
  return null;
}
function _glRainPointOpen(c, x, y, lift) {
  if (typeof _gl === 'undefined') return true;
  for (const other of _gl.list) {
    const s = other !== c && other.cur && other.cur.name === 'rain-refuge' && other.mem.s;
    if (!s || Math.abs(s.lift - lift) > 14) continue;
    const clearance = c.medium === 'air' ? .3 : (c.def.foot || .15) + (other.def.foot || .15) + .08;
    if (_glDist(x, y, s.x, s.y) < clearance) return false;
  }
  return true;
}
function _glRainGroundPoint(c, W, o, slot) {
  const f = c.def.foot == null ? .15 : c.def.foot, cy = o.y + o.h + f + .12, cx = o.top.x;
  const offsets = [0, -.45, .45, -.8, .8], first = slot;
  for (let i = 0; i < offsets.length; i++) {
    const k = offsets[(first + i) % offsets.length];
    const x = cx + k * Math.max(.8, o.w), y = cy;
    if (_glRainLand(W, x, y) && W.free(x, y, f) && _glRainPointOpen(c, x, y, 0)) return { x, y, lift: 0, obj: o };
  }
  // Trees beside a pond can have a dry flank even when the front is water.
  for (const side of [-1, 1]) {
    const x = side < 0 ? o.x - f - .12 : o.x + o.w + f + .12, y = o.top.y;
    if (_glRainLand(W, x, y) && W.free(x, y, f) && _glRainPointOpen(c, x, y, 0)) return { x, y, lift: 0, obj: o };
  }
  return null;
}
function _glRainCandidates(c, W, range) {
  const bird = c.medium === 'air', candidates = [], cache = _glRainTrees(W), B = GL_RAIN_REFUGE.bucket;
  const yRange = range * GARDEN_WORLD.cellW / GARDEN_WORLD.cellH;
  const x0 = Math.floor((c.S.x - range) / B), x1 = Math.floor((c.S.x + range) / B), y0 = Math.floor((c.S.y - yRange) / B), y1 = Math.floor((c.S.y + yRange) / B);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (const o of cache.buckets.get(x + ':' + y) || []) {
    if ((W.taken.get(o.uid) || 0) >= _glCap(o)) continue;
    const d = _glDist(c.S.x, c.S.y, o.top.x, o.top.y);
    if (d > range) continue;
    const slot = _glRainSlot(c, o); if (slot == null) continue;
    const point = bird ? { x: o.top.x + [-.4, .4, 0][slot] * Math.min(1.6, o.w), y: o.top.y, lift: Math.max(10, o.height * (.34 + slot * .04)), obj: o } : _glRainGroundPoint(c, W, o, slot);
    if (!point || !_glRainLand(W, point.x, point.y) || !_glRainPointOpen(c, point.x, point.y, point.lift)) continue;
    point.refugeSlot = slot;
    candidates.push({ point, distance: d });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, 3).map(row => row.point);
}
function _glRainPose(c, clips, index) {
  const names = clips || (c.medium === 'air' ? ['preen', 'rest', 'alert', 'rest'] : ['rest', 'sniff', 'rest']);
  const name = names[index % names.length] || 'rest';
  _glClip(c, c.art.clips[name] != null ? name : 'rest');
}
function _glRainSettle(c, W, p) {
  const M = c.mem, R = c.rainRefuge;
  if (c.medium === 'air') _glSettle(c, M.s);
  else { c.S.lift = 0; c.vx = c.vy = 0; c.bank = 0; c.path = []; }
  M.phase = 'sheltered'; M.pose = 0; M.poseAt = 2; M.clear = 0;
  R.phase = M.phase; R.arrivedAt = c.t; R.point = { x: c.S.x, y: c.S.y, lift: c.S.lift };
  _glRainPose(c, p.clips, M.pose++);
  void W;
}

GARDEN_LIFE_BEHAVIOURS['rain-refuge'] = {
  reflex: true,
  want(c, W, p) {
    if (!W.rain || W.snow || W.still || c.hidden || c.leaving || c.left || c.medium === 'water' || c.calm > 0 || c.scared > 0
      || c.cur && c.cur.name.startsWith('startled-by')) return 0;
    const R = c.rainRefuge || (c.rainRefuge = { phase: 'looking', nextAt: 0 });
    if (c.t < R.nextAt) return 0;
    R.nextAt = c.t + GL_RAIN_REFUGE.searchGap;
    R.candidates = _glRainCandidates(c, W, p.range || GL_RAIN_REFUGE.range);
    return R.candidates.length ? 7 : 0;
  },
  start(c, W, p) {
    const R = c.rainRefuge, M = c.mem;
    M.t = 0; M.phase = 'route'; M.s = null; M.clear = 0;
    const candidates = R && R.candidates || [];
    // A walker first gets down from its old perch through the normal hop.
    // Planning before that hop lands would use the wrong route origin.
    if (c.perched) _glTakeOff(c, W);
    if (c.medium === 'air') {
      M.s = candidates.find(s => W.alive(s.obj) && (W.taken.get(s.obj.uid) || 0) < _glCap(s.obj)) || null;
      if (M.s) { _glReserve(c, W, M.s); _glClip(c, 'fly'); }
    } else { M.phase = c.hop ? 'down' : 'route'; M.candidates = candidates; }
    if (R) { R.phase = M.phase; R.tree = null; R.point = null; }
    void p;
  },
  step(c, W, dt, p) {
    const M = c.mem, R = c.rainRefuge;
    M.t += dt;
    if (!R || c.leaving || c.left) return true;
    if (!W.rain || W.snow) {
      if (!M.clear) { M.clear = .001; _glClip(c, c.art.clips.preen ? 'preen' : 'alert'); }
      M.clear += dt; R.phase = 'weather-cleared';
      return M.clear >= 1.25;
    }
    if (!M.s && c.medium !== 'air') {
      const candidates = M.phase === 'down' ? _glRainCandidates(c, W, p.range || GL_RAIN_REFUGE.range) : M.candidates || [];
      M.phase = 'route';
      for (const s of candidates) {
        if (!W.alive(s.obj) || (W.taken.get(s.obj.uid) || 0) >= _glCap(s.obj) || !W.free(s.x, s.y, c.def.foot) || !_glRainLand(W, s.x, s.y)) continue;
        if (_glRouteTo(c, W, s.x, s.y)) { M.s = s; _glReserve(c, W, s); _glClip(c, 'walk'); break; }
      }
    }
    const s = M.s;
    if (!s || !W.alive(s.obj)) return true;
    const current = W.byUid.get(s.obj.uid);
    if (!current || !_glRainCanopy(current, W) || !_glRainLand(W, s.x, s.y)) return true;
    R.tree = s.obj.uid; R.phase = M.phase;
    if (M.phase !== 'sheltered') {
      if (M.t > GL_RAIN_REFUGE.travel) return true;
      const arrived = c.medium === 'air' ? _glArrive(c, W, dt, s) : _glFollow(c, W, dt, (c.def.speed || .6) * 1.2);
      // A blocked route can finish without reaching its target. Never call
      // that shelter, and never teleport an animal through an obstacle.
      if (arrived && _glDist(c.S.x, c.S.y, s.x, s.y) < .12 && (c.medium !== 'air' || Math.abs(c.S.lift - s.lift) < 2.4)) _glRainSettle(c, W, p);
      else if (arrived && c.medium !== 'air') return true;
      return false;
    }
    if (c.medium !== 'air' && !W.free(c.S.x, c.S.y, c.def.foot)) return true;
    M.poseAt -= dt;
    if (M.poseAt <= 0) { _glRainPose(c, p.clips, M.pose++); M.poseAt = 2 + (Math.sin(c.seed + M.pose * 1.7) + 1) * 1.5; }
    return false;
  },
  stop(c, W) {
    const M = c.mem, R = c.rainRefuge;
    if (c.perched && c.perched === M.s) _glTakeOff(c, W);
    else _glRelease(c, W);
    c.path = [];
    if (R) { R.phase = 'released'; R.nextAt = c.t + GL_RAIN_REFUGE.retryGap; R.candidates = null; }
    _glClip(c, c.medium === 'air' && !c.perched ? 'fly' : 'rest');
  },
};

/** Read-only scene diagnostics; no forced creature, route or brain state. */
function gardenLifeRefugeStatus() {
  const W = typeof _gl !== 'undefined' && _gl.W, cache = W && _glRainWorlds.get(W), habitat = W && _glHabitatWorlds.get(W);
  return { trees: cache ? cache.trees.length : 0, builds: cache ? cache.builds : 0, habitat: habitat ? { plants: habitat.rows.length, builds: habitat.builds, factors: habitat.view ? [...habitat.view.factors] : [] } : null, creatures: typeof _gl === 'undefined' ? [] : [..._gl.list].filter(c => c.rainRefuge).map(c => ({ id: c.id, species: c.def.id, behaviour: c.cur && c.cur.name || '', phase: c.rainRefuge.phase, tree: c.rainRefuge.tree || null, x: c.S.x, y: c.S.y, lift: c.S.lift, clip: c.clip, point: c.rainRefuge.point || null })) };
}

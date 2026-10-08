/* ============================================================
   SCENE ENGINE v2: smarter scatter and seasonal ground cover (docs/dev/SCENE_ENGINE_V2.md 10, 11; builder A).
   PURE classic script: functions and consts only. It calls 70-scene-0core.js and, lazily, 70-scene-1ground.js (the
   camera, surfaces and placement rules) and 70-scene-1real.js. Private names: _scsc.

     sceneScatterV2(G, rule, ri)   a v2 scatter rule (one with no pixel `area`) -> placements in pixel form, each with $v2
                                   (its ground record), already thinned by the LOD. Fields: obj, on, avoid (kinds or ids), d: [d0, d1],
                                   x: [x0, x1], n | density (per 100 m2 for 'ground', per 100 x 100 units for 'screen'), dist
                                   ('ground' | 'screen'), cluster: { centres, spread }, gap: 'foot' | metres, k: [a, b], species: 1,
                                   seed, variant, flip, tint, anim ('strip' | hooks | false), shadow, reflect, layer.
     sceneCoverAuto(G, placed)     seasonal ground cover (10): leaves in autumn (thicker under deciduous crowns), daisies and blossom
                                   petals in spring, long grass and wild flowers in summer, winter tufts; screen-even, cut beyond 60 m
                                   or under 3 units tall, at most 1,500 placements, all static (baked).
     scenePoissonDisk(r, box, minD, accept, o)   Bridson's Poisson-disk sampling (seeded; multiple seeds for disconnected regions)
     sceneScatterNN(points)        the Clark-Evans nearest-neighbour index (1: random, < 1: clustered, > 1: even)
   Candidates are even but never a grid (Poisson disk), clumped when asked (a Thomas process: seeded centres, Gaussian spread,
   20 % unclustered), kept off avoided surfaces and on what the class may stand on (4.4: no shrubs on roads, ever), and their
   footprints never overlap the hand placements' or each other's (gap: 'foot'; cover is exempt).
   ============================================================ */
const SCENE_COVER_MAX = 1500;
const _scscClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _scscR1 = v => Math.round(v * 10) / 10, _scscR2 = v => Math.round(v * 100) / 100, _scscR3 = v => Math.round(v * 1000) / 1000;
/** A weighted pick from 'id' | ['a', 'b'] | { id: w }. */
function _scscPick(r, w) {
  if (typeof w === 'string') return w;
  if (Array.isArray(w)) return w[Math.floor(r() * w.length) % w.length];
  const e = Object.entries(w).filter(([, k]) => k > 0), tot = e.reduce((n, [, k]) => n + k, 0);
  let x = r() * tot;
  for (const [id, k] of e) if ((x -= k) <= 0) return id;
  return e.length ? e[e.length - 1][0] : null;
}
const _scscIds = o => (typeof o === 'string' ? [o] : Array.isArray(o) ? o : Object.keys(o || {}));
/** A standard normal from the seeded stream (Box-Muller). */
function _scscGauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/**
 * Bridson's Poisson-disk sampling in a box [x0, y0, x1, y1] with minimum distance minD, accept(x, y) the valid region (seeded by r).
 * When the active list empties a new seed is tried (up to o.seeds times), so separate pieces of the region all fill.
 * o.max caps the count. Returns [[x, y], ...] in the order they were made.
 */
function scenePoissonDisk(r, box, minD, accept, o) {
  o = o || {};
  const [x0, y0, x1, y1] = box, W = x1 - x0, H = y1 - y0, max = o.max || 5000, k = o.k || 20, cell = minD / Math.SQRT2;
  if (!(W > 0 && H > 0 && minD > 0)) return [];
  const gw = Math.ceil(W / cell) + 1, gh = Math.ceil(H / cell) + 1;
  if (gw * gh > 4e6) return [];
  const grid = new Int32Array(gw * gh).fill(-1), pts = [], active = [];
  const gi = (x, y) => Math.floor((y - y0) / cell) * gw + Math.floor((x - x0) / cell);
  const far = (x, y) => {
    const cx = Math.floor((x - x0) / cell), cy = Math.floor((y - y0) / cell);
    for (let j = Math.max(0, cy - 2); j <= Math.min(gh - 1, cy + 2); j++) for (let i = Math.max(0, cx - 2); i <= Math.min(gw - 1, cx + 2); i++) {
      const q = grid[j * gw + i];
      if (q >= 0 && Math.hypot(pts[q][0] - x, pts[q][1] - y) < minD) return false;
    }
    return true;
  };
  const add = (x, y) => { grid[gi(x, y)] = pts.length; active.push(pts.length); pts.push([x, y]); };
  let seeds = o.seeds || 40;
  const seed = () => { for (let t = 0; t < 60; t++) { const x = x0 + r() * W, y = y0 + r() * H; if (far(x, y) && accept(x, y)) { add(x, y); return true; } } return false; };
  while (pts.length < max && seeds-- > 0) {
    if (!active.length && !seed()) break;
    while (active.length && pts.length < max) {
      const ai = Math.floor(r() * active.length), p = pts[active[ai]];
      let found = false;
      for (let t = 0; t < k; t++) {
        const a = r() * 2 * Math.PI, rad = minD * (1 + r()), x = p[0] + Math.cos(a) * rad, y = p[1] + Math.sin(a) * rad;
        if (x < x0 || x >= x1 || y < y0 || y >= y1 || !far(x, y) || !accept(x, y)) continue;
        add(x, y); found = true; break;
      }
      if (!found) { active[ai] = active[active.length - 1]; active.pop(); }
    }
  }
  return pts;
}
/** The Clark-Evans index of a point set: the mean nearest-neighbour distance over 0.5 / sqrt(density) (box area). */
function sceneScatterNN(points) {
  const n = points.length;
  if (n < 3) return 1;
  const p = points.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0]);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let best = Infinity;
    for (let j = i + 1; j < n && p[j][0] - p[i][0] < best; j++) best = Math.min(best, Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]));
    for (let j = i - 1; j >= 0 && p[i][0] - p[j][0] < best; j--) best = Math.min(best, Math.hypot(p[j][0] - p[i][0], p[j][1] - p[i][1]));
    sum += best;
  }
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]), area = Math.max(1e-9, (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)));
  return (sum / n) / (0.5 / Math.sqrt(n / area));
}

/* ---------- the shared helpers ---------- */
/** Does a surface match a list of kinds or ids? */
const _scscMatch = (s, list) => !!s && list.some(k => k === s.kind || k === s.id || (k === 'grass' && (s.kind === 'lawn' || s.kind === 'park')));
/** The footprint registry: a hash of [x, d, r] in 4 m cells. */
function _scscFeet(G) {
  if (!G.footGrid) { G.footGrid = new Map(); G.footMax = 0; }
  return {
    ok(x, d, r) {
      const reach = r + G.footMax, c0 = Math.floor((x - reach) / 4), c1 = Math.floor((x + reach) / 4), e0 = Math.floor((d - reach) / 4), e1 = Math.floor((d + reach) / 4);
      for (let i = c0; i <= c1; i++) for (let j = e0; j <= e1; j++) for (const f of G.footGrid.get(i + ',' + j) || []) if (Math.hypot(f[0] - x, f[1] - d) < f[2] + r) return false;
      return true;
    },
    add(x, d, r) { if (!(r > 0)) return; const k = Math.floor(x / 4) + ',' + Math.floor(d / 4); (G.footGrid.get(k) || G.footGrid.set(k, []).get(k)).push([x, d, r]); G.footMax = Math.max(G.footMax, r); },
  };
}
/** A hand placement's footprint joins the registry (the core calls this for each resolved ground or inferred pixel placement). */
function sceneScatterFootAdd(G, obj, g, k) {
  if (!g || !(g.d > 0) || typeof _scgrFootR !== 'function') return;
  const cls = typeof sceneObjClass === 'function' ? sceneObjClass(obj) : '';
  if (cls === 'cover' || cls === 'bird-air' || cls === 'air') return;
  _scscFeet(G).add(g.x, g.d, _scgrFootR(obj, k || 1));
}
/** The ground point of a sampling point: metres as they are ('ground'), or unprojected screen units ('screen'). */
const _scscGround = (G, dist, a, b) => (dist === 'screen' ? (typeof sceneUnproject === 'function' ? sceneUnproject(G.cam, a, b) : null) : { x: a, d: b });
/**
 * Turn accepted points into placements in pixel form: the scale from the depth and the real size (s = k f / d real.h / size[1]),
 * the layer from the band, flips and sizes stratified (exactly round(n * flip) mirrored, the k range covered evenly), variants
 * and tints seeded as v1. got: [{ x, d, obj, k }].
 */
function _scscToPlaced(G, rule, ri, got, r, o) {
  const cam = G.cam, out = [];
  if (!got.length) return out;
  const sr = sceneRnd(sceneHash((G.data.id || 'scene') + '|v2strat|' + ri)), fs = rule.flip == null ? 0.5 : rule.flip;
  const byObj = new Map();
  got.forEach((g, i) => { if (!byObj.has(g.obj)) byObj.set(g.obj, []); byObj.get(g.obj).push(i); });
  const flip = new Array(got.length).fill(false), keys = got.map(() => sr());
  for (const idx of byObj.values()) { const nf = Math.round(idx.length * fs); idx.slice().sort((a, b) => keys[a] - keys[b]).forEach((gi, k) => { flip[gi] = k < nf; }); }
  if (Array.isArray(rule.k) && got.length > 1) {
    const o2 = got.map((g, i) => [sr(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    o2.forEach((gi, k) => { got[gi].k = rule.k[0] + (rule.k[1] - rule.k[0]) * (k + sr()) / got.length; });
  }
  const layerOf = (name) => { const l = G.layers.find(x => x.id === name); return l ? l.id : null; };
  for (let i = 0; i < got.length; i++) {
    const g = got[i], def = sceneObj(g.obj);
    if (!def) continue;
    const cls = sceneObjClass(g.obj), real = typeof _scgrReal === 'function' ? _scgrReal(g.obj) : sceneObjReal(g.obj);
    const floats = g.surf && g.surf.kind === 'water' && (cls === 'bird-water' || cls === 'boat' || def.float);
    const w = floats ? G.water.find(q => q.v2.id === g.surf.id) : null, h = floats ? (w ? w.v2.level : cam.water) : sceneGroundHeight(cam, g.x, g.d);
    const P = sceneProject(cam, g.x, g.d, h), s = g.k * P.k * real.h / Math.max(1, def.size[1]);
    const vv = rule.variant === 'random' || rule.variant == null ? Math.floor(r() * (def.variants || 1)) : Array.isArray(rule.variant) ? rule.variant[0] + Math.floor(r() * (rule.variant[1] - rule.variant[0] + 1)) : rule.variant;
    const tk = rule.tint ? [rule.tint.col, rule.tint.k[0] + r() * (rule.tint.k[1] - rule.tint.k[0])] : null;
    const layer = rule.layer && layerOf(rule.layer) ? rule.layer : G.layers[sceneDepthBand(cam, g.d)].id;
    const q = { obj: g.obj, x: _scscR1(P.X), y: _scscR1(P.Y), s: _scscR3(Math.max(0.001, s)), flip: def.flippable === false ? false : flip[i], variant: vv, layer, seed: Math.floor(r() * 1e6), tint: tk,
      strip: rule.anim === 'strip', anim: rule.anim === 'strip' ? false : rule.anim, shadow: o && o.cover ? false : rule.shadow, reflect: o && o.cover ? false : (rule.reflect != null ? rule.reflect : (floats ? true : undefined)) };
    q.$v2 = { g: { x: _scscR2(g.x), d: _scscR2(g.d), h: _scscR2(h), surf: g.surf ? g.surf.id : null, snapped: 0 }, dz: _scscR2(g.d), cls: o && o.cover ? 'cover' : cls, view: 'side', z: cam.horizon + cam.f * cam.eye / g.d, cover: !!(o && o.cover), k: _scscR3(g.k) };
    out.push(q);
  }
  return out;
}

/* ---------- smarter scatter (11) ---------- */
/**
 * A v2 scatter rule -> placements in pixel form (with $v2), thinned by the LOD (a seeded share of n, as v1). Problems (species
 * filled out, an empty rule) go to G.problems.
 */
function sceneScatterV2(G, rule, ri) {
  const cam = G.cam, data = G.data;
  if (!rule || typeof sceneObj !== 'function' || typeof sceneSurfaceAt !== 'function') return [];
  const prob = (rule_, sev, msg, fix) => G.problems.push({ rule: rule_, sev, i: null, scatter: ri, obj: null, at: null, msg, fix });
  let mix = rule.obj;
  const ids = _scscIds(mix).filter(id => sceneObj(id));
  if (!ids.length) { prob('scatter', 'warn', `scatter[${ri}]: no object of it is in the library`, 'obj: a library id or { id: weight }'); return []; }
  if (typeof mix === 'object' && !Array.isArray(mix)) mix = Object.fromEntries(Object.entries(mix).filter(([id, w]) => sceneObj(id) && w > 0));
  else if (Array.isArray(mix)) mix = mix.filter(id => sceneObj(id));
  const r = sceneRnd(sceneHash((data.id || 'scene') + '|' + ri + '|' + (rule.seed | 0)));
  const dist = rule.dist === 'screen' || rule.dist === 'ground' ? rule.dist : (ids.every(id => ['cover', 'shrub'].includes(sceneObjClass(id)) && (typeof _scgrReal === 'function' ? _scgrReal(id).h : 1) < 1) ? 'screen' : 'ground');
  const on = rule.on == null ? null : [].concat(rule.on), avoid = rule.avoid == null ? [] : [].concat(rule.avoid);
  const dr = Array.isArray(rule.d) ? [Math.max(cam.dMin * 0.95, +rule.d[0] || 0), Math.min(+rule.d[1] || 400, 20000)] : [cam.dMin * 0.95, 200];
  const xr = Array.isArray(rule.x) ? [+rule.x[0], +rule.x[1]] : null;
  if (!(dr[1] > dr[0])) return [];
  // species (11): a big rule of one object gains a second species of its kit and role, at a quarter weight
  const nAsk = rule.n != null ? +rule.n : null;
  if (ids.length === 1 && rule.species !== 1 && (nAsk == null || nAsk >= 15) && typeof sceneKitPick === 'function') {
    const def = sceneObj(ids[0]), t = def.tags || [], kits = t.filter(x => x.startsWith('kit:')).map(x => x.slice(4)), role = (t.find(x => x.startsWith('role:')) || '').slice(5), cls = sceneObjClass(ids[0]);
    if (kits.length && role) {
      const w = sceneKitPick(kits, role, { exclude: [ids[0]] });
      for (const id of Object.keys(w)) if (sceneObjClass(id) !== cls) delete w[id];
      const pick = typeof sceneSlotPick === 'function' ? sceneSlotPick(w, (data.id || 'scene') + '|species|' + ri) : Object.keys(w)[0];
      if (pick) {
        mix = { [ids[0]]: 1, [pick]: 0.25 };
        prob('species', 'info', `scatter[${ri}]: ${ids[0]} alone; ${pick} added at a quarter weight (same kit and role)`, 'species: 1 keeps one species');
      }
    }
  }
  // the valid region: in view, in the depth range, on an `on` surface, on no `avoid` one, and allowed for the object's class
  const classes = new Set(_scscIds(mix).map(id => sceneObjClass(id)));
  const surfAt = (x, d) => sceneSurfaceAt(G, x, d);
  const inView = (x, d) => { if (d < dr[0] || d > dr[1]) return false; if (xr && (x < xr[0] || x > xr[1])) return false; const X = cam.x0 + cam.f * x / d; return X > -150 && X < 1750; };
  const validFor = (x, d, cls) => {
    if (!inView(x, d)) return null;
    const s = surfAt(x, d);
    if (!s) return null;
    if (on && !_scscMatch(s, on)) return null;
    if (avoid.length && _scscMatch(s, avoid)) return null;
    if (cls && typeof scenePlaceAllowed === 'function' && !scenePlaceAllowed(cls, s, rule, {})) return null;
    return s;
  };
  const anyValid = (x, d) => { for (const c of classes) if (validFor(x, d, c)) return true; return false; };
  // the sampling box and the valid area (Monte Carlo), then the Poisson radius for about n points
  let box;
  if (dist === 'screen') {
    const yTop = cam.horizon + cam.f * cam.eye / dr[1], yBot = Math.min(905, cam.horizon + cam.f * cam.eye / dr[0]);
    box = [-150, yTop, 1750, yBot];
  } else {
    const xl = (-150 - cam.x0) / cam.f * dr[1], xh = (1750 - cam.x0) / cam.f * dr[1];
    box = [xr ? Math.max(xl, xr[0]) : xl, dr[0], xr ? Math.min(xh, xr[1]) : xh, dr[1]];
  }
  if (!(box[2] > box[0] && box[3] > box[1])) return [];
  const acc = (a, b) => { const g = _scscGround(G, dist, a, b); return !!g && anyValid(g.x, g.d); };
  const mc = sceneRnd(sceneHash((data.id || 'scene') + '|mc|' + ri));
  let hits = 0;
  const trials = 500;
  for (let t = 0; t < trials; t++) if (acc(box[0] + mc() * (box[2] - box[0]), box[1] + mc() * (box[3] - box[1]))) hits++;
  const area = (box[2] - box[0]) * (box[3] - box[1]) * hits / trials;
  if (!hits) { prob('scatterEmpty', 'warn', `scatter[${ri}]: no place in view where ${_scscIds(mix).join(', ')} may stand${on ? ' on ' + on.join(', ') : ''}`, 'check on, avoid and d'); return []; }
  const unit = dist === 'screen' ? 10000 : 100;
  let n = nAsk != null ? nAsk : Math.round((rule.density || 1) * area / unit);
  n = Math.min(3000, Math.max(0, n | 0));
  if (!n) return [];
  const minD = Math.sqrt(0.5 * area / n);
  // candidates: Poisson disk, or a Thomas process (clusters) with a smaller minimum distance
  let cand;
  if (rule.cluster && (rule.cluster.centres | 0) > 0) {
    const cr = sceneRnd(sceneHash((data.id || 'scene') + '|cl|' + ri + '|' + (rule.seed | 0)));
    const centres = [];
    for (let t = 0; t < 400 && centres.length < (rule.cluster.centres | 0); t++) { const a = box[0] + cr() * (box[2] - box[0]), b = box[1] + cr() * (box[3] - box[1]); if (acc(a, b)) centres.push([a, b]); }
    const spread = +rule.cluster.spread || (dist === 'screen' ? 40 : 6), rMin = minD * 0.3;
    const pts = [], grid = new Map(), cell = Math.max(1e-3, rMin);
    const farOk = (a, b) => { const cx = Math.floor(a / cell), cy = Math.floor(b / cell); for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) for (const q of grid.get(i + ',' + j) || []) if (Math.hypot(q[0] - a, q[1] - b) < rMin) return false; return true; };
    const push = (a, b) => { pts.push([a, b]); const k = Math.floor(a / cell) + ',' + Math.floor(b / cell); (grid.get(k) || grid.set(k, []).get(k)).push([a, b]); };
    const want = Math.round(n * 1.6);
    for (let t = 0; t < want * 30 && pts.length < want; t++) {
      let a, b;
      if (centres.length && cr() < 0.8) { const c = centres[Math.floor(cr() * centres.length)]; a = c[0] + _scscGauss(cr) * spread; b = c[1] + _scscGauss(cr) * spread * (dist === 'screen' ? 0.45 : 1); }
      else { a = box[0] + cr() * (box[2] - box[0]); b = box[1] + cr() * (box[3] - box[1]); }
      if (a < box[0] || a > box[2] || b < box[1] || b > box[3] || !farOk(a, b) || !acc(a, b)) continue;
      push(a, b);
    }
    cand = pts;
  } else cand = scenePoissonDisk(r, box, minD, acc, { max: Math.round(n * 2.5) + 20 });
  // a seeded order, then accept until n: the class rule for the object picked, footprints (gap: 'foot' or metres)
  const ord = cand.map(p => [r(), p]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const feet = _scscFeet(G), gap = rule.gap, got = [];
  const kOf = (cls) => (Array.isArray(rule.k) ? rule.k[0] + r() * (rule.k[1] - rule.k[0]) : (typeof _scgrDefaultK === 'function' ? _scgrDefaultK(cls, r) : 1));
  for (const p of ord) {
    if (got.length >= n) break;
    const g = _scscGround(G, dist, p[0], p[1]);
    if (!g) continue;
    const obj = _scscPick(r, mix), cls = sceneObjClass(obj), s = validFor(g.x, g.d, cls);
    if (!s) continue;
    const k = kOf(cls), def = sceneObj(obj), real = typeof _scgrReal === 'function' ? _scgrReal(obj) : sceneObjReal(obj);
    if (cam.f * real.h * k / g.d < 0.8) continue;   // under a unit tall: nothing to draw
    const fr = gap === 'foot' ? _scgrFootR(obj, k) : Number.isFinite(gap) ? +gap / 2 : 0;
    if (fr > 0 && !feet.ok(g.x, g.d, fr)) continue;
    if (fr > 0 && cls !== 'cover') feet.add(g.x, g.d, fr);
    got.push({ x: g.x, d: g.d, obj, k, surf: s, def });
  }
  if (got.length < n * 0.6 && n >= 10) prob('scatterThin', 'info', `scatter[${ri}]: ${got.length} of ${n} placed (the room on its surfaces, or the gaps)`, 'lower n, widen d or on');
  // LOD: a seeded share, as v1
  const keep = Math.max(0, Math.round(got.length * G.lod)), pick = sceneRnd(sceneHash((data.id || 'scene') + '|lod|' + ri));
  const kept = keep >= got.length ? got : got.map(g => [pick(), g]).sort((a, b) => a[0] - b[0]).slice(0, keep).map(x => x[1]);
  return _scscToPlaced(G, rule, ri, kept, r);
}

/* ---------- seasonal ground cover (10) ---------- */
/** The cover of each season: [{ obj, on: { kind: weight }, under?: tag, edge?, tint }]. Objects missing from the library are skipped. */
const SCENE_COVER_RULES = Object.freeze({
  autumn: [{ obj: 'ground.leaf-litter', on: 'leaves', under: 'deciduous', cover: 0.07, tint: { col: '#7a4a20', k: [0, 0.1] } }],
  winter: [{ obj: 'plant.grass-long', on: { grass: 0.6, park: 0.4, heath: 1, field: 0.5, verge: 1, meadow: 0.8 }, cover: 0.05, tint: { col: '#a09878', k: [0, 0.1] } }],
  spring: [{ obj: 'plant.daisies', on: { grass: 1, park: 1, lawn: 0.8, verge: 0.8, meadow: 1 }, cover: 0.05, tint: { col: '#ffffff', k: [0, 0.08] } },
    { obj: 'ground.petals', on: { grass: 1, park: 1, lawn: 1, path: 1, pavement: 1, plaza: 1, garden: 1 }, under: 'blossom', only: true, cover: 0.2 }],
  summer: [{ obj: 'plant.grass-long', on: { verge: 1, meadow: 1, field: 0.35, bank: 1, park: 0.25, grass: 0.12 }, edge: ['park', 'grass', 'field'], cover: 0.1, tint: { col: '#b0a060', k: [0, 0.1] } },
    { obj: 'plant.wildflowers', on: { meadow: 0.4, verge: 0.3, bank: 0.2 }, cover: 0.06 }],
});
/**
 * Seasonal ground cover (10): data.cover 'auto' (the v2 default) | false | { density }. Screen-even candidates over the ground below
 * the horizon, each kept by its surface's weight (autumn: the kind's leaves factor), three times as thick within the crown of a
 * deciduous tree (autumn leaves) or under a blossom tree (spring petals); cut beyond 60 m and where the object would be under
 * 3 units tall. At most 1,500, all static. placed: the scene's placements so far (pixel form with $v2), for the crowns.
 */
function sceneCoverAuto(G, placed) {
  const cam = G.cam, data = G.data, cv = data.cover == null ? 'auto' : data.cover;
  if (cv === false || cv === 'none' || typeof sceneObj !== 'function' || typeof sceneSurfaceAt !== 'function') { G.coverAuto = false; return []; }
  const density = cv && typeof cv === 'object' && Number.isFinite(cv.density) ? _scscClamp(cv.density, 0, 3) : 1;
  const rules = (SCENE_COVER_RULES[G.season] || []).filter(c => sceneObj(c.obj));
  if (!rules.length || !density) return [];
  // the crowns: trees placed so far, by tag (deciduous: not pine / cedar / palm; blossom: the blossom tag or a cherry)
  const crowns = { deciduous: [], blossom: [] };
  for (const q of placed || []) {
    const v = q.$v2;
    if (!v || !v.g || v.cls !== 'tree') continue;
    const def = sceneObj(q.obj), t = (def && def.tags) || [], real = typeof _scgrReal === 'function' ? _scgrReal(q.obj) : { h: 15 };
    const rad = Math.max(2, 0.3 * real.h * (v.k || 1));
    if (!t.includes('evergreen') && !t.includes('conifer') && !/pine|cedar|palm|holly/.test(q.obj)) crowns.deciduous.push([v.g.x, v.g.d, rad]);
    if (t.includes('blossom') || /cherry|blossom/.test(q.obj)) crowns.blossom.push([v.g.x, v.g.d, rad]);
  }
  const under = (tag, x, d) => (crowns[tag] || []).some(c => Math.hypot(c[0] - x, c[1] - d) < c[2]);
  const dFar = Math.min(60, cam.dMax), yTop = cam.horizon + cam.f * cam.eye / dFar, yBot = 905;
  const r = sceneRnd(sceneHash((data.id || 'scene') + '|cover|' + G.season));
  const out = [], feetPts = [];
  rules.forEach((c, ci) => {
    if (c.only && !(crowns[c.under] || []).length) return;
    const real = typeof _scgrReal === 'function' ? _scgrReal(c.obj) : sceneObjReal(c.obj), def = sceneObj(c.obj);
    // the depth where the object is 3 units tall (k ~ 1): nothing farther
    const dCut = Math.min(dFar, cam.f * real.h * 0.85 / 3);
    if (dCut <= cam.dMin) return;
    const yCut = cam.horizon + cam.f * cam.eye / dCut, box = [-150, Math.max(yTop, yCut), 1750, yBot];
    const weight = (s) => { if (!s) return 0; if (c.on === 'leaves') { const K = typeof SCENE_SURFACE_KINDS === 'object' ? SCENE_SURFACE_KINDS[s.kind] : null; return K && s.kind !== 'water' && ['grass', 'park', 'lawn', 'path', 'towpath', 'pavement', 'plaza', 'verge', 'wood', 'garden', 'bank', 'meadow'].includes(s.kind) ? Math.min(1, K.leaves) : 0; } return c.on[s.kind] || 0; };
    const minD = 9 / Math.sqrt(density);
    const cand = scenePoissonDisk(r, box, minD, () => true, { max: 6000 });
    const ord = cand.map(p => [r(), p]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const got = [];
    const cap = Math.round(SCENE_COVER_MAX * Math.min(1, density) * (G.lod == null ? 1 : G.lod) / rules.length);
    for (const p of ord) {
      if (got.length >= cap) break;
      const g = sceneUnproject(cam, p[0], p[1]);
      if (!g || g.d > dCut || g.d < cam.dMin * 0.9) continue;
      const s = sceneSurfaceAt(G, g.x, g.d);
      let w = weight(s);
      if (!w) continue;
      const u = c.under ? under(c.under, g.x, g.d) : false;
      if (c.only && !u) continue;
      // the edge of a park or field (summer's long grass): within 2.5 m of its boundary, three times as thick
      let edge = false;
      if (c.edge && s && c.edge.includes(s.kind) && typeof _scgrEntry === 'function' && typeof _scgrEdgeDist === 'function') { const e = _scgrEntry(G, s.id); if (e) edge = _scgrEdgeDist(e.poly, g.x, g.d) < 2.5; }
      // an even LOOK, not an even count: the share of the ground each kind covers (c), so near pieces (big on screen) are
      // fewer than far ones; three times as much within a deciduous crown or along a park's edge
      const k = 0.7 + 0.6 * r(), sc = cam.f * real.h * k / g.d;
      if (sc < 3) continue;
      const objArea = Math.max(1, sc * sc * def.size[0] / def.size[1] * 0.55), candArea = minD * minD / 0.7;
      const cover = (c.cover || 0.08) * w * ((c.under === 'deciduous' && u) || edge ? 3 : 1);
      if (r() >= Math.min(1, cover * candArea / objArea)) continue;
      got.push({ x: g.x, d: g.d, obj: c.obj, k, surf: s, def });
    }
    out.push(..._scscToPlaced(G, { obj: c.obj, flip: 0.5, tint: c.tint, variant: 'random', anim: false }, 'cover' + ci, got, r, { cover: true }));
  });
  const kept = out.slice(0, SCENE_COVER_MAX);
  G.stats.coverItems = kept.length;
  return kept;
}
/**
 * Wind strips for a v2 rule's placements (the v1 strip, 6.3, per layer): 140-unit columns, one strip per (layer, column), the
 * items as compiled items (the core maps them to indices after its sort).
 */
function sceneScatterStrips(made, rule) {
  const w = 140, groups = new Map(), out = [];
  for (const it of made) { const k = it.layer + '|' + Math.floor((it.x + 160) / w); (groups.get(k) || groups.set(k, []).get(k)).push(it); }
  for (const [k, list] of groups) {
    const c = +k.split('|')[1];
    out.push({ layer: list[0].layer, x0: -160 + c * w, x1: -160 + (c + 1) * w, y0: Math.min(...list.map(i => i.y)), y1: Math.max(...list.map(i => i.y)), items: list, amp: rule.amp || 1 });
  }
  return out;
}

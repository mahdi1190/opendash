/* ============================================================
   WORLD ENGINE (scene format v3.1), package look: GROUND DETAIL (docs/dev/WORLD_ENGINE.md 12.3 'Surfaces', 14.3; requirements P5,
   P6, Q5, QP4, C6). Private prefix _wgd. PURE (Node + browser): only frozen data and functions at load; the camera maths
   (sceneProject, sceneGroundHeight) and the kits (worldKit, worldFillStyle) are reached through typeof guards when called.

   Every visible ground surface comes out TEXTURED by default, in true perspective, so no flat slab is left: paving gets its
   joints, courses, kerb edges and tone; setts their small grid; gravel paths and towpaths their specks, ruts, frayed edges and
   damp patches; lawns mowing stripes, tussock ticks and tone; heath and woodland floors their drifts and litter; roads their
   gutters, repairs and cracks; sand its ripples. A water region whose level lies below the ground shows its CHANNEL WALLS: a
   quay is dressed stone (courses, staggered joints, coping, a wet algae band at the waterline, stains, weeds, ladders and
   rings), a natural bank is earth (a grass fringe overhang, roots, stones, the wet band). Nothing here is per scene: the look of
   each surface comes from its kind and the place's style kit (kit.look), the texture is seeded and foreshortens with depth (Q5).

     WORLD_GROUND_LOOKS                      the looks and their parameters (joint sizes, densities, tones)
     worldGroundLookOf(world, s)             -> the look id of a surface (null: it dresses itself: water, reeds, hedges, rails)
     worldGroundDetail(world, cam, o)        -> { groups: [{ surf, look, clip, holes, marks }], walls: [{ water, look, runs }], stats }
                                                in scene units (the 1600 x 900 frame of the camera); marks are
                                                { t: 'line' | 'poly' | 'dot', pts | x, y, rx, ry, w, a, c: 'dark' | 'light' | hex }
     worldGroundTextured(world, cam, x, z, o)-> { look, textured, limit } at a ground point (the critic's measure: is the
                                                surface there textured at that depth?)
     worldChannelWalls(world, cam, o)        -> [{ water, look, edge, runs: [{ scr, zNear, zFar, courses }] }] the visible
                                                channel wall faces of every sunken water region (the critic's bare-channel check)
     worldGroundDetailDraw(ctx, plan, o)     -> draws the surface marks (o.part 'marks') or the channel walls ('walls') on a 2D
                                                context. o: { vs, ox, oy, colour(mat, hex) (look's materials), light (0..1) }
   ============================================================ */

/* ---------- the looks ---------- */
const WORLD_GROUND_LOOKS = Object.freeze({
  flags: Object.freeze({ mat: 'paving', joint: [0.9, 0.6], tone: 0.075, edge: true, cracks: 0.04 }),
  setts: Object.freeze({ mat: 'paving', joint: [0.24, 0.16], tone: 0.08, edge: true, cracks: 0, courseEvery: 5 }),
  gravel: Object.freeze({ mat: 'gravel', specks: 1 / 190, ruts: true, fray: true, tone: 0.09, damp: 0.25 }),
  sand: Object.freeze({ mat: 'soil', specks: 1 / 260, ruts: true, fray: true, tone: 0.07, damp: 0.1 }),
  tarmac: Object.freeze({ mat: 'tarmac', tone: 0.05, gutter: true, cracks: 0.06, patches: 0.4, drains: 26 }),
  mown: Object.freeze({ mat: 'grass', stripes: 2.6, ticks: 1 / 260, tone: 0.06 }),
  tussock: Object.freeze({ mat: 'grass', ticks: 1 / 150, clumps: true, tone: 0.085 }),
  heath: Object.freeze({ mat: 'grass', ticks: 1 / 200, heather: true, tone: 0.11 }),
  litter: Object.freeze({ mat: 'soil', ticks: 1 / 300, leaves: true, tone: 0.11 }),
  rows: Object.freeze({ mat: 'grass', ticks: 1 / 320, tone: 0.06 }),
  ripple: Object.freeze({ mat: 'soil', ripples: 1.1, specks: 1 / 400, tone: 0.06 }),
  // channel walls (a sunken water region's banks)
  stone: Object.freeze({ mat: 'stone', wall: true, course: 0.3, joint: 0.62, top: '#8c867b', low: '#625d55', wet: '#3a4236', coping: '#a9a396' }),
  brick: Object.freeze({ mat: 'brick', wall: true, course: 0.15, joint: 0.45, top: '#8e5a46', low: '#6e4436', wet: '#3a3a30', coping: '#a8a090' }),
  earth: Object.freeze({ mat: 'soil', wall: true, earth: true, top: '#6e6046', low: '#5a4e38', wet: '#3a3a2c', fringe: '#55693a' }),
});
// surface kind -> its default look (a kit's look map overrides: kit.look.grass = 'mown', kit.look.path = 'flags' ...)
const _WGD_KIND_LOOK = Object.freeze({ pavement: 'flags', platform: 'flags', driveway: 'setts', crossing: 'flags', plaza: 'setts', steps: 'flags',
  path: 'gravel', towpath: 'gravel', track: 'gravel', cycleway: 'tarmac', road: 'tarmac', tramway: 'tarmac', parking: 'tarmac', plot: 'sand',
  grass: 'tussock', lawn: 'mown', park: 'mown', verge: 'tussock', garden: 'mown', meadow: 'tussock', bank: 'tussock',
  heath: 'heath', wood: 'litter', field: 'rows', sand: 'ripple', beach: 'ripple', shingle: 'ripple', mud: 'litter' });
// the kit look key a surface kind reads (kit.look[<key>])
const _WGD_KIT_KEY = Object.freeze({ pavement: 'paving', platform: 'paving', driveway: 'paving', crossing: 'paving', steps: 'paving', plaza: 'plaza',
  path: 'path', towpath: 'path', track: 'path', grass: 'grass', lawn: 'grass', park: 'grass', verge: 'grass', garden: 'grass', meadow: 'grass', bank: 'grass',
  heath: 'heath', wood: 'wood', field: 'field', sand: 'sand', beach: 'sand', shingle: 'sand' });
const _WGD_SELF = new Set(['water', 'reeds', 'reedbed', 'bed', 'hedge', 'weir', 'rail', 'tram', 'boardwalk', 'bridge-deck', 'deck', 'jetty', 'pontoon', 'stairs', 'ramp']);
// open looks: a mown lawn and a rippled beach are dressed by their texture at half weight (they are meant to be open: a village
// green, a beach), so the fill keeps them open with sparse things rather than a carpet
const WORLD_GROUND_OPEN = Object.freeze(['mown', 'ripple']);
const _WGD_MIN_PX = 2.2;          // the smallest screen spacing a joint or course may have (denser reads as a grey smear)
const _WGD_MARK_CAP = 9000;       // marks per surface (the bake draws them once into a cached layer)

/* ---------- small helpers ---------- */
const _wgdNum = v => typeof v === 'number' && Number.isFinite(v);
function _wgdHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wgdRng(seed) {
  let a = _wgdHash(seed) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const _wgdR = v => Math.round(v * 10) / 10;
function _wgdG(cam, x, z) { return cam.relief && typeof sceneGroundHeight === 'function' ? sceneGroundHeight(cam, x, z) : 0; }
function _wgdP(cam, x, z, y) {
  const d = Math.max(0.05, z), k = cam.f / d, x0 = _wgdNum(cam.x0) ? cam.x0 : 800;
  return [x0 + k * x, cam.horizon + k * (cam.eye - (y == null ? _wgdG(cam, x, z) : y))];
}
const _wgdNear = cam => Math.max(0.35, (cam.dMin || 1) * 0.3);
function _wgdInPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function _wgdSegD(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0; return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); }
function _wgdLineD(P, x, z) { let d = Infinity; for (let i = 1; i < P.length; i++) d = Math.min(d, _wgdSegD(x, z, P[i - 1], P[i])); return d; }
/** The ground polygon of a surface: its own, or its centre line buffered to its width. */
function _wgdPoly(s) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return s.poly;
  if (!Array.isArray(s.path) || s.path.length < 2) return null;
  const P = s.path, hw = (Number(s.width) || 2) / 2, L = [], R = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1;
    L.push([P[i][0] - dz / n * hw, P[i][1] + dx / n * hw]); R.push([P[i][0] + dz / n * hw, P[i][1] - dx / n * hw]);
  }
  return L.concat(R.reverse());
}
function _wgdIn(s, x, z) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return _wgdInPoly(s.poly, x, z);
  if (Array.isArray(s.path) && s.path.length >= 2) return _wgdLineD(s.path, x, z) <= (Number(s.width) || 2) / 2;
  return false;
}
/** A ground polygon on the screen, clipped at the near plane (scene units). */
function _wgdScr(cam, P, y) {
  const near = _wgdNear(cam), out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], ia = a[1] >= near, ib = b[1] >= near;
    if (ia) out.push(_wgdP(cam, a[0], a[1], y));
    if (ia !== ib) { const t = (near - a[1]) / (b[1] - a[1]); out.push(_wgdP(cam, a[0] + (b[0] - a[0]) * t, near, y)); }
  }
  return out.length >= 3 ? out.map(p => [_wgdR(p[0]), _wgdR(p[1])]) : null;
}
function _wgdBox(pts) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; } return [x0, y0, x1, y1]; }
/** The unproject of a screen point onto flat ground (relief: the v2 search). */
function _wgdUn(cam, X, Y) {
  if (typeof sceneUnproject === 'function') { try { return sceneUnproject(cam, X, Y); } catch (e) { /* flat */ } }
  if (!(Y > cam.horizon + 1e-6)) return null;
  const d = cam.f * cam.eye / (Y - cam.horizon);
  return { x: (X - (cam.x0 || 800)) * d / cam.f, d };
}

/* ---------- looks of surfaces ---------- */
/** The kit look map of a world (the fill's style, else the style the fill would choose). */
function _wgdKitLook(world) {
  try {
    const key = (world && world.fillState && world.fillState.style) || (typeof worldFillStyle === 'function' ? worldFillStyle(world) : null);
    const st = key && typeof WORLD_FILL_STYLES === 'object' && WORLD_FILL_STYLES ? WORLD_FILL_STYLES[key] : null;
    return (st && st.look) || {};
  } catch (e) { return {}; }
}
/** The look id of a surface: a surface's own `look`, else the kit's look for its kind, else the kind's default; null when the
    surface dresses itself (water, reeds, hedges, rails, decks). */
function worldGroundLookOf(world, s, kitLook) {
  if (!s || !s.kind || _WGD_SELF.has(s.kind)) return null;
  if (typeof s.look === 'string' && WORLD_GROUND_LOOKS[s.look]) return s.look;
  const K = kitLook || _wgdKitLook(world), key = _WGD_KIT_KEY[s.kind], k = key && K[key];
  if (k && WORLD_GROUND_LOOKS[k] && !WORLD_GROUND_LOOKS[k].wall) return k;
  return _WGD_KIND_LOOK[s.kind] || null;
}
/** The edge look of a water region (what the v2 compile draws as its channel): a quay of stone, a natural earth bank. */
function _wgdEdgeLook(world, s, kitLook) {
  const e = typeof s.edge === 'string' ? s.edge : null, wk = s.water || 'pond', lvl = _wgdLevel(world, s);
  const style = String((world.backdrop && world.backdrop.style) || (world.place && world.place.style) || '');
  const urban = /^(city|town)/.test(style) || /river-city|civic|quayside|terraced/.test(String(world.fillState && world.fillState.style || ''));
  const quay = e === 'quay' || e === 'wall' || e === 'coping' || wk === 'harbour' || (urban && (wk === 'river' || wk === 'canal')) || (wk === 'river' && lvl <= -1);
  if (!quay) return 'earth';
  const k = (kitLook || {}).quay;
  return e === 'wall' ? 'brick' : k && WORLD_GROUND_LOOKS[k] && WORLD_GROUND_LOOKS[k].wall ? k : 'stone';
}
function _wgdLevel(world, s) { const cam = world.cam || {}; return _wgdNum(s.level) ? s.level : _wgdNum(cam.water) ? cam.water : 0; }

/* ---------- surface marks ---------- */
/** Lines across a polygon's frame (u lines every du, v lines every dv), kept where they read on screen; mark helpers. */
function _wgdAxis(P) {
  let best = 0, u = [1, 0];
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L > best) { best = L; u = [dx / L, dz / L]; } }
  return { u, v: [-u[1], u[0]] };
}
/** A world line (a to b, ground) cut into screen strokes where its spacing to the next parallel line (step metres along nrm)
    reads (>= _WGD_MIN_PX); alpha fades in as it gets denser. */
function _wgdLine(cam, out, a, b, nrm, step, base, c, zMax, tag) {
  const near = _wgdNear(cam), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!(L > 0)) return;
  let cur = null;
  const flush = () => { if (cur && cur.pts.length >= 2) out.push(cur); cur = null; };
  const n = Math.max(1, Math.ceil(L / 0.8));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    if (z < near || z > zMax) { flush(); continue; }
    // the spacing to the next parallel line ON SCREEN: the distance from its point to this line's own screen direction (a
    // receding line's points slide along it with depth; that slide is not spacing)
    const p = _wgdP(cam, x, z), q = _wgdP(cam, x + nrm[0] * step, z + nrm[1] * step), e = _wgdP(cam, x + (b[0] - a[0]) / L * 0.2, Math.max(near, z + (b[1] - a[1]) / L * 0.2));
    const ex = e[0] - p[0], ey = e[1] - p[1], el = Math.hypot(ex, ey) || 1, sp = Math.abs((q[0] - p[0]) * ey - (q[1] - p[1]) * ex) / el;
    if (sp < _WGD_MIN_PX) { flush(); continue; }
    const al = base * Math.min(1, (sp - _WGD_MIN_PX) / 5 + 0.25);
    if (!cur) { cur = { t: 'line', pts: [], w: Math.max(0.35, Math.min(1.6, cam.f * 0.018 / z)), a: Math.round(al * 1000) / 1000, c }; if (tag) cur.k = tag; }
    cur.pts.push([_wgdR(p[0]), _wgdR(p[1])]);
  }
  flush();
}
/** Seeded tone patches over a surface (irregular polygons, larger with depth so each reads at 20-60 scene units). */
function _wgdTone(cam, out, s, P, look, rnd, scr, W, H, n) {
  const box = _wgdBox(scr), x0 = Math.max(-40, box[0]), x1 = Math.min(W + 40, box[2]), y0 = Math.max(cam.horizon + 1, box[1]), y1 = Math.min(H, box[3]);
  if (!(x1 > x0 && y1 > y0)) return;
  for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
    const X = x0 + rnd() * (x1 - x0), Y = y0 + rnd() * (y1 - y0), g = _wgdUn(cam, X, Y);
    if (!g || !_wgdIn(s, g.x, g.d) || g.d > 220) continue;
    // a soft, rounded blob (smooth radius noise, never a spiky shard), wider than deep, its size growing with depth
    const R = (0.5 + rnd() * 1.1) * Math.max(0.5, g.d * 0.045), k = 12, pts = [], ph = rnd() * 6.28, ph2 = rnd() * 6.28, e1 = 0.12 + rnd() * 0.12, e2 = 0.06 + rnd() * 0.08;
    for (let j = 0; j < k; j++) { const a = j / k * 6.28, r = R * (1 + e1 * Math.sin(2 * a + ph) + e2 * Math.sin(3 * a + ph2)); const p = _wgdP(cam, g.x + Math.cos(a) * r * 1.6, g.d + Math.sin(a) * r * 0.9); pts.push([_wgdR(p[0]), _wgdR(p[1])]); }
    out.push({ t: 'poly', pts, a: Math.round(look.tone * (0.4 + 0.45 * rnd()) * 1000) / 1000, c: rnd() < 0.55 ? 'dark' : 'light' });
    i++;
  }
}
/** Seeded small marks scattered by screen area (specks, ticks, leaves) inside a surface, where they are at least 0.6 units. */
function _wgdScatter(cam, out, s, look, rnd, scr, W, H, perPx, kind, zMax) {
  const box = _wgdBox(scr), x0 = Math.max(0, box[0]), x1 = Math.min(W, box[2]), y0 = Math.max(cam.horizon + 2, box[1]), y1 = Math.min(H, box[3]);
  if (!(x1 > x0 && y1 > y0)) return;
  const n = Math.min(_WGD_MARK_CAP / 3, Math.round((x1 - x0) * (y1 - y0) * perPx));
  for (let i = 0; i < n; i++) {
    const X = x0 + rnd() * (x1 - x0), Y = y0 + rnd() * (y1 - y0), g = _wgdUn(cam, X, Y);
    if (!g || g.d > zMax || !_wgdIn(s, g.x, g.d)) continue;
    const k = cam.f / g.d;
    if (kind === 'speck') {
      const r = (0.007 + rnd() * 0.016) * k;
      if (r < 0.3) continue;
      out.push({ t: 'dot', x: _wgdR(X), y: _wgdR(Y), rx: Math.round(Math.min(2.6, r) * 100) / 100, ry: Math.round(Math.min(1.8, r * Math.max(0.35, cam.eye / g.d)) * 100) / 100, a: Math.round((0.1 + rnd() * 0.18) * 100) / 100, c: rnd() < 0.62 ? 'dark' : 'light' });
    } else if (kind === 'tick') {
      const h = (0.06 + rnd() * 0.1) * k;
      if (h < 1.2) continue;
      const lean = (rnd() - 0.5) * h * 0.5;
      out.push({ t: 'line', pts: [[_wgdR(X), _wgdR(Y)], [_wgdR(X + lean), _wgdR(Y - Math.min(14, h))]], w: Math.max(0.5, Math.min(1.8, 0.012 * k)), a: 0.28 + rnd() * 0.22, c: rnd() < 0.6 ? 'dark' : 'light' });
    } else if (kind === 'leaf') {
      const r = (0.04 + rnd() * 0.05) * k;
      if (r < 0.5) continue;
      out.push({ t: 'dot', x: _wgdR(X), y: _wgdR(Y), rx: Math.min(5, r), ry: Math.min(3, r * 0.45), a: 0.35 + rnd() * 0.25, c: rnd() < 0.5 ? '#8a5a2c' : '#a87a36' });
    } else if (kind === 'heather') {
      const r = (0.12 + rnd() * 0.2) * k;
      if (r < 0.8) continue;
      out.push({ t: 'dot', x: _wgdR(X), y: _wgdR(Y), rx: Math.min(9, r), ry: Math.min(4, r * 0.35), a: 0.22 + rnd() * 0.18, c: rnd() < 0.5 ? '#5e4a52' : '#4a5a36' });
    }
  }
}
/** The marks of one surface by its look. */
function _wgdSurfaceMarks(world, cam, s, look, L, o) {
  const P = _wgdPoly(s), out = [], W = o.W || 1600, H = o.H || 900;
  if (!P) return out;
  const scr = _wgdScr(cam, P, null);
  if (!scr) return out;
  const b = _wgdBox(scr);
  if (b[2] < -50 || b[0] > W + 50 || b[3] < cam.horizon || b[1] > H) return out;
  const rnd = _wgdRng('gd|' + (s.id || '') + '|' + (world.seed | 0) + '|' + look);
  const area = (Math.min(W, b[2]) - Math.max(0, b[0])) * (Math.min(H, b[3]) - Math.max(cam.horizon, b[1]));
  if (!(area > 40)) return out;
  // tone patches everywhere the surface shows (the far part is never one flat colour)
  _wgdTone(cam, out, s, P, L, rnd, scr, W, H, Math.min(90, Math.round(10 + area / 6000)));
  const strip = Array.isArray(s.path) && s.path.length >= 2 && s.width > 0;
  // joints and courses (flags, setts): across and along the strip, or on the polygon's own axes
  if (L.joint) {
    const [du, dv] = L.joint, zMax = 140;
    if (strip) {
      const path = s.path, hw = s.width / 2;
      let acc = 0;
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], c = path[i], dx = c[0] - a[0], dz = c[1] - a[1], Ls = Math.hypot(dx, dz);
        if (!(Ls > 0)) continue;
        const t = [dx / Ls, dz / Ls], n = [-t[1], t[0]];
        for (let u = Math.ceil(acc / du) * du - acc; u < Ls; u += du) {
          const p = [a[0] + t[0] * u, a[1] + t[1] * u], k = Math.round((acc + u) / du), heavy = L.courseEvery && k % L.courseEvery === 0;
          _wgdLine(cam, out, [p[0] - n[0] * hw, p[1] - n[1] * hw], [p[0] + n[0] * hw, p[1] + n[1] * hw], t, heavy ? du * L.courseEvery : du, heavy ? 0.3 : 0.2, 'dark', zMax, 'joint');
        }
        for (let v = -hw + dv; v < hw - 1e-6; v += dv) _wgdLine(cam, out, [a[0] + n[0] * v, a[1] + n[1] * v], [c[0] + n[0] * v, c[1] + n[1] * v], n, dv, 0.16, 'dark', zMax * 0.4, 'joint-along');
        acc += Ls;
      }
    } else {
      const ax = _wgdAxis(P);
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const p of P) { const u = p[0] * ax.u[0] + p[1] * ax.u[1], v = p[0] * ax.v[0] + p[1] * ax.v[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      const at = (u, v) => [ax.u[0] * u + ax.v[0] * v, ax.u[1] * u + ax.v[1] * v];
      const lim = (n) => n > 2600;   // a vast plaza: every line still drawn, but only where it reads (the spacing rule)
      let k = 0;
      for (let u = Math.ceil(u0 / du) * du; u <= u1 && !lim(out.length); u += du, k++) { const heavy = L.courseEvery && k % L.courseEvery === 0; _wgdLine(cam, out, at(u, v0), at(u, v1), ax.u, heavy ? du * L.courseEvery : du, heavy ? 0.3 : 0.2, 'dark', zMax); }
      for (let v = Math.ceil(v0 / dv) * dv; v <= v1 && !lim(out.length); v += dv) _wgdLine(cam, out, at(u0, v), at(u1, v), ax.v, dv, 0.16, 'dark', zMax * 0.4);
    }
  }
  // kerb and edge lines along the surface's boundary (a light top and a dark joint beside it)
  if (L.edge) {
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length];
      _wgdLine(cam, out, a, c, [0, 0.4], 0.4, 0.32, 'light', 90);
    }
  }
  // gravel: specks, two ruts, frayed edges, damp patches
  if (L.specks) _wgdScatter(cam, out, s, L, rnd, scr, W, H, L.specks, 'speck', 45);
  if (L.ruts && strip && s.width >= 1.6) {
    // two worn wheel and foot lines: soft darker bands either side of a lighter crown (strips in perspective, Q5)
    const off = (e) => s.path.map((p, i) => { const a = s.path[Math.max(0, i - 1)], c = s.path[Math.min(s.path.length - 1, i + 1)], dx = c[0] - a[0], dz = c[1] - a[1], n = Math.hypot(dx, dz) || 1; return [p[0] - dz / n * e, p[1] + dx / n * e]; });
    const band = (e0, e1, a, c) => { const A = off(e0), B = off(e1); for (let i = 1; i < A.length; i++) { const q = [A[i - 1], A[i], B[i], B[i - 1]]; if (Math.min(...q.map(p => p[1])) < _wgdNear(cam) || Math.min(...q.map(p => p[1])) > 80) continue; out.push({ t: 'poly', pts: q.map(p => _wgdP(cam, p[0], p[1])).map(p => [_wgdR(p[0]), _wgdR(p[1])]), a, c }); } };
    for (const e of [-0.24, 0.24]) band(e * s.width - 0.16, e * s.width + 0.16, 0.05, 'dark');
    band(-0.08 * s.width, 0.08 * s.width, 0.045, 'light');
  }
  if (L.fray && strip) {
    // the worn edge: small tongues of grass and soil biting into the path from both sides, seeded along it
    const path = s.path, hw = s.width / 2;
    let acc = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], c = path[i], dx = c[0] - a[0], dz = c[1] - a[1], Ls = Math.hypot(dx, dz);
      if (!(Ls > 0)) continue;
      const t = [dx / Ls, dz / Ls], n = [-t[1], t[0]];
      for (let u = 0; u < Ls; u += 0.35 + rnd() * 0.9) {
        const z = a[1] + t[1] * u;
        if (z < _wgdNear(cam) || z > 40) continue;
        for (const sd of [-1, 1]) {
          if (rnd() < 0.35) continue;
          const bx = a[0] + t[0] * u + n[0] * hw * sd, bz = a[1] + t[1] * u + n[1] * hw * sd, len = 0.12 + rnd() * 0.35, wd = 0.08 + rnd() * 0.25;
          const p0 = _wgdP(cam, bx - t[0] * wd, bz - t[1] * wd), p1 = _wgdP(cam, bx + t[0] * wd, bz + t[1] * wd), p2 = _wgdP(cam, bx - n[0] * len * sd, bz - n[1] * len * sd);
          out.push({ t: 'poly', pts: [p0, p2, p1].map(p => [_wgdR(p[0]), _wgdR(p[1])]), a: 0.55, c: rnd() < 0.7 ? '#5c6e3c' : '#6e5e44' });
        }
      }
      acc += Ls;
    }
  }
  if (L.damp) for (let i = 0, n = Math.round(4 + 8 * L.damp); i < n; i++) _wgdTone(cam, out, s, P, { tone: 0.12 }, rnd, scr, W, H, 1);
  // grass: ticks near (tufts read as grass, not paint), mowing stripes, clumps; heath drifts; woodland litter
  if (L.ticks) _wgdScatter(cam, out, s, L, rnd, scr, W, H, L.ticks, 'tick', 22);
  if (L.heather) _wgdScatter(cam, out, s, L, rnd, scr, W, H, 1 / 900, 'heather', 120);
  if (L.leaves) _wgdScatter(cam, out, s, L, rnd, scr, W, H, 1 / 600, 'leaf', 30);
  if (L.stripes) {
    // mowing stripes along the camera's view (constant x bands), fading with depth
    const xs = P.map(p => p[0]), zs = P.map(p => p[1]), xa = Math.min(...xs), xb = Math.max(...xs), za = Math.max(_wgdNear(cam), Math.min(...zs)), zb = Math.min(90, Math.max(...zs));
    if (zb > za) for (let x = Math.floor(xa / (2 * L.stripes)) * 2 * L.stripes; x < xb; x += 2 * L.stripes) {
      const q = [_wgdP(cam, x, za), _wgdP(cam, x + L.stripes, za), _wgdP(cam, x + L.stripes, zb), _wgdP(cam, x, zb)];
      out.push({ t: 'poly', pts: q.map(p => [_wgdR(p[0]), _wgdR(p[1])]), a: 0.07, c: 'light' });
    }
  }
  if (L.ripples) {
    for (let z = Math.max(_wgdNear(cam), 2), i = 0; z < 60 && i < 400; z += L.ripples * (0.7 + rnd() * 0.6) * Math.max(1, z / 12), i++) {
      const xs = P.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), pts = [];
      for (let x = x0; x <= x1; x += Math.max(0.6, z * 0.06)) if (_wgdIn(s, x, z)) { const p = _wgdP(cam, x, z + Math.sin(x * 1.3 + i) * 0.12 * z / 10); pts.push([_wgdR(p[0]), _wgdR(p[1])]); } else if (pts.length >= 2) { out.push({ t: 'line', pts: pts.splice(0), w: 0.6, a: 0.16, c: 'light' }); } else pts.length = 0;
      if (pts.length >= 2) out.push({ t: 'line', pts, w: 0.6, a: 0.16, c: 'light' });
    }
  }
  // roads: gutters at both edges, repair patches, cracks, drain covers
  if (L.gutter && strip) {
    for (const e of [-0.5, 0.5]) {
      const off = e * s.width - Math.sign(e) * 0.2, path = s.path.map((p, i) => { const a = s.path[Math.max(0, i - 1)], c = s.path[Math.min(s.path.length - 1, i + 1)], dx = c[0] - a[0], dz = c[1] - a[1], n = Math.hypot(dx, dz) || 1; return [p[0] - dz / n * off, p[1] + dx / n * off]; });
      for (let i = 1; i < path.length; i++) _wgdLine(cam, out, path[i - 1], path[i], [1, 0], 0.4, 0.3, 'dark', 120);
    }
  }
  if (L.patches) for (let i = 0; i < 8; i++) _wgdTone(cam, out, s, P, { tone: 0.09 }, rnd, scr, W, H, 1);
  if (L.cracks) {
    const n = Math.round(area * L.cracks / 400);
    for (let i = 0, tries = 0; i < n && tries < n * 4; tries++) {
      const X = Math.max(0, b[0]) + rnd() * (Math.min(W, b[2]) - Math.max(0, b[0])), Y = Math.max(cam.horizon + 2, b[1]) + rnd() * (Math.min(H, b[3]) - Math.max(cam.horizon + 2, b[1])), g = _wgdUn(cam, X, Y);
      if (!g || g.d > 25 || !_wgdIn(s, g.x, g.d)) continue;
      const pts = [[g.x, g.d]];
      let ang = rnd() * 6.28;
      for (let j = 0; j < 3 + Math.floor(rnd() * 3); j++) { ang += (rnd() - 0.5) * 1.4; const q = pts[pts.length - 1], len = 0.15 + rnd() * 0.3; pts.push([q[0] + Math.cos(ang) * len, q[1] + Math.sin(ang) * len]); }
      out.push({ t: 'line', pts: pts.map(q => _wgdP(cam, q[0], Math.max(_wgdNear(cam), q[1]))).map(p => [_wgdR(p[0]), _wgdR(p[1])]), w: Math.max(0.4, Math.min(1.2, cam.f * 0.012 / g.d)), a: 0.4, c: 'dark' });
      i++;
    }
  }
  return out.length > _WGD_MARK_CAP ? out.slice(0, _WGD_MARK_CAP) : out;
}

/* ---------- channel walls ---------- */
/** The bank lines of a water region with their inward (water side) normals: [{ pts, closed }]. */
function _wgdBanks(s) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return [{ pts: s.poly, closed: true }];
  if (!Array.isArray(s.path) || s.path.length < 2) return [];
  const P = s.path, hw = (Number(s.width) || 4) / 2, side = (o) => P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz) || 1; return [p[0] + o * dz / n, p[1] - o * dx / n]; });
  return [{ pts: side(-hw), closed: false }, { pts: side(hw), closed: false }];
}
/**
 * The visible channel wall faces of every water region whose level lies below the ground (see the header). Each run is a stretch
 * of bank whose wall faces the eye: its screen polygon (top edge along the bank, bottom edge along the waterline), its depth
 * range and how far its courses read.
 */
function worldChannelWalls(world, cam, o) {
  o = o || {};
  const out = [];
  try {
    cam = cam || (world && world.cam);
    if (!world || !cam || !_wgdNum(cam.f)) return out;
    const K = o.kitLook || _wgdKitLook(world), near = _wgdNear(cam), surfs = (world.surfaces || []).filter(s => s && s.kind === 'water');
    for (const s of surfs) {
      const lvl = _wgdLevel(world, s);
      if (!(lvl < -0.12)) continue;
      const look = _wgdEdgeLook(world, s, K), L = WORLD_GROUND_LOOKS[look], rec = { water: s.id, look, edge: look === 'earth' ? 'natural' : 'quay', runs: [] };
      for (const bank of _wgdBanks(s)) {
        const P = bank.pts, n = P.length, m = bank.closed ? n : n - 1;
        let run = null;
        const flush = () => { if (run && run.top.length >= 2) rec.runs.push(run); run = null; };
        for (let i = 0; i < m; i++) {
          const a = P[i], b = P[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], Ls = Math.hypot(dx, dz);
          if (!(Ls > 0)) continue;
          // the water side of this edge: the normal whose probe lands in the water
          let nx = -dz / Ls, nz = dx / Ls;
          const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
          if (!_wgdIn(s, mx + nx * 0.3, mz + nz * 0.3)) { nx = -nx; nz = -nz; }
          const steps = Math.max(1, Math.ceil(Ls / Math.max(0.6, Math.min(4, 0.05 * Math.max(1, Math.min(a[1], b[1]))))));
          for (let j = 0; j < steps; j++) {
            const t0 = j / steps, t1 = (j + 1) / steps, p = [a[0] + dx * t0, a[1] + dz * t0], q = [a[0] + dx * t1, a[1] + dz * t1];
            const cx = (p[0] + q[0]) / 2, cz = (p[1] + q[1]) / 2;
            // seen from the eye at the origin: the camera is on the water side of the wall's plane, the piece is in front; an
            // edge where this water meets another water region (two regions sharing a seam) has no wall
            const wetBeyond = surfs.some(w2 => w2 !== s && _wgdIn(w2, cx - nx * 0.4, cz - nz * 0.4));
            const seen = !wetBeyond && nx * -cx + nz * -cz > 0.02 && Math.max(p[1], q[1]) > near && Math.min(p[1], q[1]) < 400;
            if (!seen) { flush(); continue; }
            const pc = p[1] < near ? [p[0] + (q[0] - p[0]) * (near - p[1]) / (q[1] - p[1]), near] : p, qc = q[1] < near ? [q[0] + (p[0] - q[0]) * (near - q[1]) / (p[1] - q[1]), near] : q;
            if (!run) run = { top: [], bot: [], w3: [], zNear: Infinity, zFar: 0, len: 0 };
            if (!run.w3.length) { run.w3.push(pc); run.top.push(_wgdP(cam, pc[0], pc[1], _wgdG(cam, pc[0], pc[1]))); run.bot.push(_wgdP(cam, pc[0], pc[1], lvl)); }
            run.w3.push(qc); run.top.push(_wgdP(cam, qc[0], qc[1], _wgdG(cam, qc[0], qc[1]))); run.bot.push(_wgdP(cam, qc[0], qc[1], lvl));
            run.zNear = Math.min(run.zNear, pc[1], qc[1]); run.zFar = Math.max(run.zFar, pc[1], qc[1]); run.len += Math.hypot(qc[0] - pc[0], qc[1] - pc[1]);
          }
        }
        flush();
      }
      for (const r of rec.runs) {
        r.scr = r.top.concat(r.bot.slice().reverse()).map(p => [_wgdR(p[0]), _wgdR(p[1])]);
        r.level = lvl;
        // courses read to the depth where one course is _WGD_MIN_PX tall on screen
        r.courses = L && L.course ? Math.round(cam.f * L.course / _WGD_MIN_PX) : 0;
      }
      if (rec.runs.length) out.push(rec);
    }
  } catch (e) { /* no walls */ }
  return out;
}
/** The dressing of one wall run (marks in scene units): courses, staggered joints, coping, wet band, stains, weeds, ladders. */
function _wgdWallMarks(world, cam, rec, run, o) {
  const L = WORLD_GROUND_LOOKS[rec.look], out = [], lvl = run.level, near = _wgdNear(cam), rnd = _wgdRng('wall|' + rec.water + '|' + (world.seed | 0) + '|' + Math.round(run.zNear * 10));
  const W3 = run.w3, P = (p, y) => _wgdP(cam, p[0], p[1], y);
  const along = (fn) => { let acc = 0; for (let i = 1; i < W3.length; i++) { const a = W3[i - 1], b = W3[i], Ls = Math.hypot(b[0] - a[0], b[1] - a[1]); fn(a, b, Ls, acc); acc += Ls; } };
  const ground = (p) => _wgdG(cam, p[0], p[1]);
  // the base: the face itself, lighter at the top, the wet band at the waterline darker and green
  out.push({ t: 'poly', pts: run.scr, a: 1, c: L.top, mat: L.mat, grad: [L.top, L.low] });
  const wetH = rec.look === 'earth' ? 0.18 : 0.32;
  const wet = run.top.map((p, i) => P(W3[i], Math.min(ground(W3[i]), lvl + wetH))).concat(run.bot.slice().reverse()).map(p => [_wgdR(p[0]), _wgdR(p[1])]);
  out.push({ t: 'poly', pts: wet, a: 0.85, c: L.wet, mat: L.mat });
  if (L.earth) {
    // a natural bank: the grass fringe hanging over the top, roots, stones at the waterline
    along((a, b, Ls) => {
      for (let u = 0; u < Ls; u += 0.07 + rnd() * 0.16) {
        const t = u / Ls, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
        if (z < near || z > 60) continue;
        // the grass fringe: thin blades leaning over the edge and hanging down the face, irregular in length and lean
        const g = ground([x, z]), k = cam.f / z, h = (0.04 + rnd() * rnd() * 0.22) * k;
        if (h >= 1) {
          const base = P([x, z], g + 0.03), lean = (rnd() - 0.5) * h * 0.6;
          out.push({ t: 'line', pts: [[_wgdR(base[0]), _wgdR(base[1])], [_wgdR(base[0] + lean), _wgdR(base[1] + h * (rnd() < 0.7 ? 1 : -0.5))]], w: Math.max(0.5, Math.min(1.8, 0.013 * k)), a: 0.85, c: rnd() < 0.5 ? '#55693a' : '#6b7e44', mat: 'grass' });
        }
        if (rnd() < 0.08) { const s0 = P([x, z], lvl + 0.04), r = Math.max(0.6, cam.f * (0.06 + rnd() * 0.08) / z); out.push({ t: 'dot', x: _wgdR(s0[0]), y: _wgdR(s0[1]), rx: Math.min(6, r), ry: Math.min(3, r * 0.6), a: 0.8, c: '#7a756a', mat: 'stone' }); }
        if (rnd() < 0.05) { const r0 = P([x, z], g - 0.05), r1 = P([x + 0.1, z], (g + lvl) / 2); out.push({ t: 'line', pts: [r0, r1].map(p => [_wgdR(p[0]), _wgdR(p[1])]), w: Math.max(0.4, cam.f * 0.015 / z), a: 0.5, c: '#3e3426' }); }
      }
    });
    return out;
  }
  // courses: horizontal joints every course height, along the run (they converge with the bank: Q5)
  const top = Math.max(...W3.map(ground));
  for (let y = lvl + L.course; y < top - 0.05; y += L.course) {
    const pts = [];
    for (const p of W3) { if (p[1] > run.courses * 1.3) break; pts.push(P(p, y)); }
    if (pts.length >= 2) out.push({ t: 'line', pts: pts.map(p => [_wgdR(p[0]), _wgdR(p[1])]), w: Math.max(0.35, Math.min(1.4, cam.f * 0.014 / Math.max(near, run.zNear))), a: 0.5, c: 'dark' });
  }
  // staggered vertical joints between the courses, near enough to read
  along((a, b, Ls, acc) => {
    for (let u = Math.ceil(acc / L.joint) * L.joint - acc; u < Ls; u += L.joint) {
      const t = u / Ls, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      if (z < near || cam.f * L.joint / z < _WGD_MIN_PX * 1.6) continue;
      const k = Math.round((acc + u) / L.joint);
      for (let y = lvl + (k % 2 ? 0 : L.course), c = 0; y < top - L.course; y += 2 * L.course, c++) {
        const p0 = P([x, z], y), p1 = P([x, z], y + L.course);
        out.push({ t: 'line', pts: [p0, p1].map(p => [_wgdR(p[0]), _wgdR(p[1])]), w: Math.max(0.35, Math.min(1.2, cam.f * 0.012 / z)), a: 0.42, c: 'dark' });
      }
    }
  });
  // the coping: a light band at the top with its own joints
  const copeH = Math.min(0.22, (top - lvl) * 0.12);
  out.push({ t: 'poly', pts: run.top.map(p => [_wgdR(p[0]), _wgdR(p[1])]).concat(W3.map(p => P(p, ground(p) - copeH)).reverse().map(p => [_wgdR(p[0]), _wgdR(p[1])])), a: 0.9, c: L.coping, mat: L.mat });
  // stains (water and rust streaks from the coping) and weeds (at the waterline and in the joints), ladders and rings
  along((a, b, Ls) => {
    for (let u = rnd() * 4; u < Ls; u += 2.5 + rnd() * 5) {
      const t = u / Ls, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      if (z < near || z > 160) continue;
      const g = ground([x, z]), w = 0.12 + rnd() * 0.35, y1 = lvl + wetH + rnd() * (g - lvl - wetH) * 0.5, tx = (b[0] - a[0]) / Ls, tz = (b[1] - a[1]) / Ls;
      const q = [P([x, z], g - copeH), P([x + tx * w, z + tz * w], g - copeH), P([x + tx * w * 0.6, z + tz * w * 0.6], y1), P([x + tx * w * 0.2, z + tz * w * 0.2], y1)];
      out.push({ t: 'poly', pts: q.map(p => [_wgdR(p[0]), _wgdR(p[1])]), a: 0.22 + rnd() * 0.15, c: rnd() < 0.7 ? 'dark' : '#6a4a32' });
    }
    for (let u = rnd(); u < Ls; u += 0.5 + rnd() * 1.6) {
      const t = u / Ls, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      if (z < near || z > 70) continue;
      const k = cam.f / z, h = (0.08 + rnd() * 0.22) * k;
      if (h < 1.2) continue;
      const atTop = rnd() < 0.35, y = atTop ? ground([x, z]) - copeH : lvl + wetH * (0.4 + rnd() * 0.6), base = P([x, z], y);
      for (let j = 0; j < 3; j++) { const lean = (j - 1) * h * 0.35 + (rnd() - 0.5) * h * 0.2; out.push({ t: 'line', pts: [[_wgdR(base[0]), _wgdR(base[1])], [_wgdR(base[0] + lean), _wgdR(base[1] - h * (atTop ? -0.6 : 1))]], w: Math.max(0.5, Math.min(1.6, 0.014 * k)), a: 0.75, c: rnd() < 0.6 ? '#4f6a34' : '#6a7e3c', mat: 'grass' }); }
    }
    for (let u = 8 + rnd() * 20; u < Ls; u += 28 + rnd() * 30) {
      const t = u / Ls, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, tx = (b[0] - a[0]) / Ls, tz = (b[1] - a[1]) / Ls;
      if (z < near || cam.f * 0.45 / z < 6) continue;
      const g = ground([x, z]);
      if (rnd() < 0.55) {
        // an iron ladder: two rails and rungs from the coping to the water
        for (const o2 of [-0.22, 0.22]) { const p0 = P([x + tx * o2, z + tz * o2], g), p1 = P([x + tx * o2, z + tz * o2], lvl - 0.1); out.push({ t: 'line', pts: [p0, p1].map(p => [_wgdR(p[0]), _wgdR(p[1])]), w: Math.max(0.6, cam.f * 0.03 / z), a: 0.9, c: '#2c2e30', mat: 'metal' }); }
        for (let y = lvl + 0.15; y < g - 0.1; y += 0.3) { const p0 = P([x - tx * 0.22, z - tz * 0.22], y), p1 = P([x + tx * 0.22, z + tz * 0.22], y); out.push({ t: 'line', pts: [p0, p1].map(p => [_wgdR(p[0]), _wgdR(p[1])]), w: Math.max(0.5, cam.f * 0.02 / z), a: 0.85, c: '#2c2e30', mat: 'metal' }); }
      } else {
        // a mooring ring below the coping
        const c0 = P([x, z], g - copeH - 0.18), r = Math.max(0.8, cam.f * 0.07 / z);
        out.push({ t: 'ring', x: _wgdR(c0[0]), y: _wgdR(c0[1]), rx: Math.min(8, r), ry: Math.min(8, r), w: Math.max(0.5, r * 0.3), a: 0.9, c: '#2e2a26', mat: 'metal' });
      }
    }
  });
  return out;
}

/* ---------- the plan ---------- */
/**
 * The ground detail of a world through a camera (see the header). Surfaces are taken in spec order; each group is clipped to its
 * own screen polygon with every LATER overlapping surface (which lies on top of it) cut out. o: { W, H, kitLook }.
 */
function worldGroundDetail(world, cam, o) {
  o = o || {};
  const out = { groups: [], walls: [], stats: { surfaces: 0, marks: 0, walls: 0 } };
  try {
    cam = cam || (world && world.cam);
    if (!world || !cam || !_wgdNum(cam.f) || typeof sceneProject !== 'function' && !_wgdNum(cam.horizon)) return out;
    const K = o.kitLook || _wgdKitLook(world), W = o.W || 1600, H = o.H || 900;
    // the ground no surface covers (the v2 rest: grass in the country, a plot in town) is a surface too, under all the others
    const S = [_wgdRest(world, cam)].concat((world.surfaces || []).filter(s => s && s.kind && !s.backdrop));
    const scrOf = new Map();
    // every surface's ground-level footprint on the screen (water too: its footprint is the channel, walls included), decks at their height
    for (const s of S) { const P = _wgdPoly(s); const q = P && _wgdScr(cam, P, _wgdNum(s.y) ? s.y : null); if (q) scrOf.set(s, q); }
    S.forEach((s, i) => {
      const look = worldGroundLookOf(world, s, K), L = look && WORLD_GROUND_LOOKS[look];
      if (!L || L.wall) return;
      const clip = scrOf.get(s);
      if (!clip) return;
      const bx = _wgdBox(clip), holes = [];
      for (let j = i + 1; j < S.length; j++) {
        const q = scrOf.get(S[j]);
        if (!q) continue;
        const qb = _wgdBox(q);
        if (qb[2] < bx[0] || qb[0] > bx[2] || qb[3] < bx[1] || qb[1] > bx[3]) continue;
        holes.push(q);
      }
      const marks = _wgdSurfaceMarks(world, cam, s, look, L, { W, H });
      if (!marks.length) return;
      out.groups.push({ surf: s.id, kind: s.kind, look, mat: L.mat, clip, holes, marks });
      out.stats.surfaces++; out.stats.marks += marks.length;
    });
    for (const rec of worldChannelWalls(world, cam, { kitLook: K })) {
      const runs = rec.runs.map(r => ({ scr: r.scr, zNear: r.zNear, zFar: r.zFar, courses: r.courses, marks: _wgdWallMarks(world, cam, rec, r, o) }));
      out.walls.push({ water: rec.water, look: rec.look, edge: rec.edge, runs });
      out.stats.walls += runs.length;
    }
  } catch (e) { out.stats.error = String(e && e.message || e); }
  return out;
}
/** The rest of the ground (what no surface covers) as a pseudo surface across the frustum: its kind is the v2 rest's. */
function _wgdRest(world, cam) {
  const style = String((world.backdrop && world.backdrop.style) || (world.place && world.place.style) || '');
  const urban = /^(city|town)/.test(style), K = (typeof WORLD_FILL_STYLES === 'object' && WORLD_FILL_STYLES && WORLD_FILL_STYLES[world.fillState && world.fillState.style]) || null;
  const kind = urban ? 'plot' : (K && K.ground) || 'grass', near = _wgdNear(cam), far = 420, hw = (z) => ((cam.x0 || 800) + 300) * z / cam.f;
  return { id: 'world-rest', kind, rest: true, poly: [[-hw(near), near], [hw(near), near], [hw(far), far], [-hw(far), far]] };
}
/** Is the ground at (x, z) textured by this module at that depth? -> { look, textured, limit } (the critic's measure). */
function worldGroundTextured(world, cam, x, z, o) {
  const S = (world && world.surfaces) || [];
  let s = null;
  for (let i = S.length - 1; i >= 0; i--) if (S[i] && !S[i].backdrop && _wgdIn(S[i], x, z)) { s = S[i]; break; }
  if (!s && cam) s = _wgdRest(world, cam);
  if (!s) return { look: null, textured: false, limit: 0, surf: null };
  if (_WGD_SELF.has(s.kind)) return { look: 'self', textured: true, limit: Infinity, surf: s.id };
  const look = worldGroundLookOf(world, s, o && o.kitLook);
  // tone patches reach 220 m; the finer marks are judged by the bands they show in
  return { look, textured: !!look && z <= 220, limit: look ? 220 : 0, surf: s.id };
}

/* ---------- drawing (browser and any 2D context) ---------- */
/**
 * Draw a plan's surface marks (o.part = 'marks') or channel walls (o.part = 'walls') on a context in scene units transformed by
 * (vs, ox, oy). o.colour(mat, hex) colours a material base (look's materials: season, light, weather, haze); dark and light marks
 * are translucent overlays, so they follow whatever the ground under them is. o.light (0..1, 1 = day) dims the light marks at night.
 */
function worldGroundDetailDraw(ctx, plan, o) {
  o = o || {};
  if (!ctx || !plan) return 0;
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0, light = _wgdNum(o.light) ? Math.max(0, Math.min(1, o.light)) : 1, col = typeof o.colour === 'function' ? o.colour : ((m, h) => h);
  let n = 0;
  const path = (P) => { ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); };
  const paint = (m) => m.c === 'dark' ? 'rgba(20,18,14,' + m.a + ')' : m.c === 'light' ? 'rgba(255,252,240,' + (m.a * (0.3 + 0.7 * light)) + ')' : col(m.mat || 'stone', m.c);
  const draw = (m) => {
    if (m.t === 'poly') {
      ctx.beginPath(); path(m.pts);
      if (m.grad && typeof ctx.createLinearGradient === 'function') {
        let y0 = Infinity, y1 = -Infinity; for (const p of m.pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
        const g = ctx.createLinearGradient(0, y0, 0, Math.max(y0 + 1, y1)); g.addColorStop(0, col(m.mat || 'stone', m.grad[0])); g.addColorStop(1, col(m.mat || 'stone', m.grad[1]));
        ctx.fillStyle = g; ctx.globalAlpha = m.a;
      } else { ctx.fillStyle = paint(m); ctx.globalAlpha = (m.c === 'dark' || m.c === 'light') ? 1 : m.a; }
      ctx.fill(); n++;
    } else if (m.t === 'line') {
      ctx.beginPath(); ctx.moveTo(m.pts[0][0], m.pts[0][1]); for (let i = 1; i < m.pts.length; i++) ctx.lineTo(m.pts[i][0], m.pts[i][1]);
      ctx.strokeStyle = paint(m); ctx.globalAlpha = (m.c === 'dark' || m.c === 'light') ? 1 : m.a; ctx.lineWidth = m.w || 0.6; ctx.stroke(); n++;
    } else if (m.t === 'dot' || m.t === 'ring') {
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') ctx.ellipse(m.x, m.y, Math.max(0.2, m.rx), Math.max(0.2, m.ry), 0, 0, Math.PI * 2); else ctx.rect(m.x - m.rx, m.y - m.ry, 2 * m.rx, 2 * m.ry);
      if (m.t === 'ring') { ctx.strokeStyle = paint(m); ctx.globalAlpha = m.a; ctx.lineWidth = m.w || 0.6; ctx.stroke(); }
      else { ctx.fillStyle = paint(m); ctx.globalAlpha = (m.c === 'dark' || m.c === 'light') ? 1 : m.a; ctx.fill(); }
      n++;
    }
  };
  ctx.save();
  ctx.setTransform(vs, 0, 0, vs, ox, oy);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.part !== 'walls') {
    for (const g of plan.groups || []) {
      ctx.save();
      ctx.beginPath(); path(g.clip); ctx.clip();
      // each hole cut on its own (outside it AND outside the next): overlapping holes never cancel under even-odd
      for (const h of g.holes) { ctx.beginPath(); ctx.rect(-1e4, -1e4, 2e4, 2e4); path(h); ctx.clip('evenodd'); }
      for (const m of g.marks) draw(m);
      ctx.restore();
    }
  }
  if (o.part !== 'marks') {
    for (const w of plan.walls || []) for (const r of w.runs) {
      ctx.save();
      ctx.beginPath(); path(r.scr); ctx.clip();
      for (const m of r.marks) draw(m);
      ctx.restore();
    }
  }
  ctx.restore();
  return n;
}

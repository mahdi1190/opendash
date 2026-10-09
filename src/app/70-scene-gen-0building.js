/* ============================================================
   SCENE ENGINE v2: the procedural building and street generator (docs/dev/SCENE_ENGINE_V2.md 19; builder F). PURE.
   Functions and consts only, no DOM, nothing expensive at load (the style files only register data). Private names: _scbg.

   One model, two views. A building is a footprint (metres, [x, d] on the ground: x right of the camera axis, d forward), a
   storey stack, a roof and a STYLE. The model is a set of planar faces in metres (walls, gables, roof planes, bays,
   porches, canopies, chimneys) with the facade ELEMENTS (windows, doors, shopfronts, bands, textures) laid out in metres on
   each wall plane. A view turns metres into screen units:
     elevation  orthographic, front-on, SCENE_GEN_UPM units per metre: a library object (sceneBuildingObject)
     projected  the v2 camera (2.2): X = x0 + f x / d, Y = horizon + f (eye - h) / d; faces culled by their outward normal
                against the eye, clipped at the near plane (sceneBuildingProject -> a `direct` record, 12 / 13.2)
   Straight lines stay straight under both views, so every element is drawn by mapping its corners (arches by a few points).

   API
     SCENE_GEN_UPM (20), SCENE_GEN_MAX_SHAPES (900), SCENE_GEN_TIERS ([6, 14, 30]), SCENE_GEN_NIGHT (night colours by glow
     kind), SCENE_GEN_SHOP_WORDS (the generic fascia words, at most 40; never a brand)
     sceneBuildingStyleDefine(id, style)    register a style (data plus small layout hooks; one 70-scene-gen-style-<id>.js each)
     sceneBuildingStyle(id), sceneBuildingStyles() -> [{ id, label, eras, regions, grouping }]
     sceneBuildingTier(storeyPx) -> 0..3    the detail tier of a storey that tall on screen (19.3)
     sceneBuildingResolve(b)                the seeded spec of one building (colours, choices): what makes no two alike
     sceneBuildingObject(params) -> id      ELEVATION mode: registers building.gen-<style>-<hash8> lazily (memoised)
     sceneBuildingObjectSigns(params, place, signage) -> [sign]   the fascia sign of a shop object placed at {x, y, s, layer}
     sceneBuildingProject(b, cam, ctx) -> direct | null   PROJECTED mode: { shapes, lit, snow, glow, box, foot, h, eave, src,
                                            n, dz, dc, anchor, smoke, signs, tier }
     sceneBuildingShadow(b, sunG, sunTan, cam) -> [[X, Y], ...] | null   the screen polygon of the prism's shadow (6.2)
     sceneBuildingShadowGround(b, sunG, sunTan) -> [[x, d], ...] | null  the same on the ground, in metres
     sceneStreetExpand(rule, C, cam, data) -> [building]   buildings along a strip's edge (19.4)
     sceneGenExpand(data, C, cam) -> { items, buildings, problems, signs }   the compile hook (12, stage 4)
     sceneBuildingAsObject(b, cam, ctx) -> { obj, x, y, s, d } | null   a projected building as a one-off library object
                                            (building.genp-<hash8>) for renderers without the direct hook (v1, previews)
     sceneGenPreview(data, opt) -> v1 scene data   a PREVIEW of a v2 street recipe through the v1 renderers (surfaces as
                                            ground fills, buildings as objects, ground placements by depth); tools and demos
                                            only, until the v2 compile (A) and the direct hook (B) land

   The direct record (13.2): shapes = [{ f, d, op, part, glow?, theta?, detail? }] in draw order, screen units. A shape with
   `glow` (a kind of SCENE_GEN_NIGHT, also given as direct.glow) is a window pane: after dusk it is drawn ungraded in its
   night colour when theta < the window share (7.3), else in its day paint. lit = shapes drawn only after dusk, ungraded
   (shop interiors, a lit core, canopy lamps). snow = roof planes, ledges and sills, drawn at op * snowDepth (8.3). smoke =
   chimney tops [[X, Y]] for later smoke (cut list). No brands, flags, religious symbols or house numbers anywhere.
   ============================================================ */
const SCENE_GEN_UPM = 20;
const SCENE_GEN_MAX_SHAPES = 900;
const SCENE_GEN_TIERS = Object.freeze([6, 14, 30]);
const SCENE_GEN_NIGHT = Object.freeze({ window: '#ffd98a', curtain: '#efae5c', tv: '#b6cdf2', shop: '#fff0cc', core: '#fff4dc', lamp: '#ffe2a0' });
const SCENE_GEN_SHOP_WORDS = Object.freeze({
  bakery: 'Bakery', cafe: 'Cafe', books: 'Books', butcher: 'Butcher', florist: 'Florist', greengrocer: 'Greengrocer', hardware: 'Hardware',
  newsagent: 'Newsagent', chemist: 'Chemist', deli: 'Deli', barber: 'Barber', hairdresser: 'Hair Salon', bicycle: 'Cycles', antiques: 'Antiques',
  gallery: 'Gallery', tailor: 'Tailor', shoes: 'Shoes', clothes: 'Clothing', toys: 'Toys', gift: 'Gifts', stationery: 'Stationery', fishmonger: 'Fish',
  cheese: 'Cheese', wine: 'Wine', tea: 'Tea Room', ice_cream: 'Ice Cream', laundry: 'Launderette', post_office: 'Post Office', convenience: 'Stores',
  optician: 'Optician', jewellery: 'Jeweller', music: 'Music', pub: 'Inn', restaurant: 'Restaurant', takeaway: 'Takeaway', charity: 'Charity Shop',
  furniture: 'Furniture', pets: 'Pet Shop', bookmaker: 'Bookmaker', estate_agent: 'Lettings',
});

/* ---------- small helpers (metres, colours, paths) ---------- */
const _scbgD2R = Math.PI / 180;
const _scbgR1 = v => Math.round(v * 10) / 10;
const _scbgCl = (v, a, b) => Math.max(a, Math.min(b, v));
const _scbgHx = c => { let s = String(c || '#000000').replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const _scbgHex = a => '#' + a.map(v => _scbgCl(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
function _scbgMix(a, b, t) { if (!t) return a; const A = _scbgHx(a), B = _scbgHx(b), k = _scbgCl(t, 0, 1); return _scbgHex(A.map((v, i) => v + (B[i] - v) * k)); }
const _scbgDark = (c, k) => _scbgMix(c, '#14181e', k);
const _scbgLight = (c, k) => _scbgMix(c, '#ffffff', k);
const _scbgPath = pts => 'M' + pts.map(p => _scbgR1(p[0]) + ' ' + _scbgR1(p[1])).join('L') + 'Z';
const _scbgAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const _scbgMul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const _scbgDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const _scbgCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const _scbgNorm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** The unit normal of a planar 3D polygon (Newell), pointing up for a roof (n[1] >= 0) unless `keep`. */
function _scbgNormal(poly, keep) {
  let n = [0, 0, 0];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  n = _scbgNorm(n);
  return !keep && n[1] < 0 ? _scbgMul(n, -1) : n;
}
const _scbgArea2 = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
/** Convex hull of [x, y] points (monotone chain), counter-clockwise. */
function _scbgHull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** Clip a 3D polygon ([x, h, d]) to d >= near (Sutherland-Hodgman, one plane). */
function _scbgClipNear(poly, near) {
  if (!(near > -Infinity) || poly.every(p => p[2] >= near)) return poly;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ia = a[2] >= near, ib = b[2] >= near;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]); }
  }
  return out.length >= 3 ? out : null;
}
/** Clip a convex screen polygon by a convex screen polygon (both [[X, Y]]); null when nothing is left. */
function _scbgClip2(subject, clip) {
  let out = subject;
  const s = _scbgArea2(clip) >= 0 ? 1 : -1;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length], inp = out; out = [];
    const side = p => s * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0;
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length], ip = side(p), iq = side(q);
      if (ip) out.push(p);
      if (ip !== iq) { const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]), d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]), t = d1 / ((d1 - d2) || 1e-9); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
  }
  return out.length >= 3 ? out : null;
}

/* ---------- styles (19.3) ---------- */
const _scbgStyles = new Map();
const _SCBG_ROOFS = ['gable', 'hip', 'mansard', 'flat', 'butterfly', 'pitched-side'];
/** Register a style: DATA (materials, windows, doors, roofs, chimneys, shopfronts, seasons, night) plus small layout hooks. */
function sceneBuildingStyleDefine(id, style) {
  if (!/^[a-z0-9-]{2,30}$/.test(String(id || ''))) throw new Error('sceneBuildingStyleDefine: bad id ' + id);
  if (!style || typeof style !== 'object' || !style.label) throw new Error('sceneBuildingStyleDefine ' + id + ': a style needs a label');
  if (style.roof && !_SCBG_ROOFS.includes(style.roof)) throw new Error('sceneBuildingStyleDefine ' + id + ': unknown roof ' + style.roof);
  _scbgStyles.set(id, Object.assign({ id }, style));
  return _scbgStyles.get(id);
}
function sceneBuildingStyle(id) { return _scbgStyles.get(id) || null; }
/** The registered styles: [{ id, label, eras, regions, grouping }], by id (F's style names for the composer, 26.10). */
function sceneBuildingStyles() {
  return [..._scbgStyles.values()].sort((a, b) => (a.id < b.id ? -1 : 1)).map(s => ({ id: s.id, label: s.label, eras: s.eras || null, regions: s.regions || ['uk'], grouping: s.grouping || 'detached' }));
}
/** The detail tier for a storey `storeyPx` units tall on screen (19.3): 0 tone bands, 1 plain windows, 2 frames, bars, sills and lintels, 3 coursing, panels, fanlights. */
function sceneBuildingTier(storeyPx) { const T = SCENE_GEN_TIERS; return storeyPx < T[0] ? 0 : storeyPx < T[1] ? 1 : storeyPx < T[2] ? 2 : 3; }

/* ---------- the seeded spec of one building ---------- */
const _SCBG_SEASON_TINT = { spring: ['#f6f2e2', 0.03], summer: ['#fff0d2', 0.05], autumn: ['#6a4e30', 0.07], winter: ['#76808c', 0.11] };
const _scbgSeasonal = (c, season) => { const t = _SCBG_SEASON_TINT[season] || null; return t ? _scbgMix(c, t[0], t[1]) : c; };
const _scbgPickW = (r, w) => { if (typeof w === 'string') return w; if (Array.isArray(w)) return w[Math.floor(r() * w.length) % w.length]; const e = Object.entries(w || {}).filter(x => x[1] > 0); if (!e.length) return null; const tot = e.reduce((n, x) => n + x[1], 0); let x = r() * tot; for (const [k, v] of e) if ((x -= v) <= 0) return k; return e[e.length - 1][0]; };
const _scbgRange = (r, a, def) => Array.isArray(a) ? a[0] + r() * (a[1] - a[0]) : (a == null ? def : a);
const _scbgInt = (r, a, def) => Array.isArray(a) ? a[0] + Math.floor(r() * (a[1] - a[0] + 1)) : (a == null ? def : a);
/**
 * The seeded spec of a building b ({ style, seed, storeys, frontage, depth, roof, party, shop, door, ... }): every random choice
 * comes from sceneRnd(sceneHash('bg|' + style + '|' + seed)) in a FIXED order, so the same b is always the same building and
 * another seed is another house (door colour, wear, lit pattern, chimney pots, bay or flat front, small additions).
 */
function sceneBuildingResolve(b) {
  b = b || {};
  const st = sceneBuildingStyle(b.style) || sceneBuildingStyle('victorian-terrace') || { id: 'plain', label: 'Plain' };
  const seed = (Number(b.seed) || 0) >>> 0, r = sceneRnd(sceneHash('bg|' + st.id + '|' + seed));
  const w = st.wall || {}, rf = st.roofMat || {}, dr = st.door || {}, win = st.win || {}, nt = st.night || {}, dt = st.details || {};
  const storeys = _scbgCl(Math.round(b.storeys || _scbgInt(r, st.storeys, 2)), 1, 40);
  const sh = st.storeyH || [3, 2.8];
  const hs = []; for (let i = 0; i < storeys; i++) hs.push(Array.isArray(sh) ? (sh[Math.min(i, sh.length - 1)]) : sh);
  const zs = [0]; for (const h of hs) zs.push(zs[zs.length - 1] + h);
  const grime = w.grime || '#3a3530';
  const wear = 0.05 + r() * 0.10;
  const wallBase = _scbgPickW(r, w.cols || ['#9a5a40']);
  const sp = {
    style: st, id: st.id, seed, storeys, hs, zs,
    frontage: b.frontage || _scbgRange(r, st.frontage, 6),
    depth: b.depth || _scbgRange(r, st.depth, 9),
    roof: _SCBG_ROOFS.includes(b.roof) ? b.roof : (st.roof || 'pitched-side'),
    pitch: (b.pitch || st.pitch || 35),
    parapet: b.parapet != null ? b.parapet : (st.parapet || 0),
    wear,
    wall: _scbgMix(wallBase, grime, wear),
    wall2: null,
    mortar: w.mortar || _scbgLight(wallBase, 0.35),
    tex: w.texture || 'brick',
    roofCol: _scbgPickW(r, rf.cols || ['#4a5058']),
    dress: _scbgPickW(r, (st.dress && st.dress.cols) || ['#e8e2d4']),
    frame: _scbgPickW(r, win.frames || ['#f2efe6']),
    glass: _scbgPickW(r, win.glass || ['#34414e', '#3a4654', '#2f3b47']),
    door: _scbgPickW(r, dr.cols || ['#1f3a5a', '#5a1f24', '#24462e', '#1d1f22', '#6a5a3a', '#3d4f6a']),
    pots: _scbgInt(r, (st.chimney && st.chimney.pots) || [1, 4], 2),
    bay: !!(st.bay && st.bay.kind && r() < (st.bay.chance == null ? 1 : st.bay.chance) && b.bays !== false && b.bays !== 0),
    doorSide: b.door === 'left' || b.door === 'right' || b.door === 'centre' ? b.door : (r() < 0.5 ? 'left' : 'right'),
    pipe: r() < (dt.downpipe == null ? 0.7 : dt.downpipe) ? (r() < 0.5 ? 'left' : 'right') : null,
    alarm: r() < (dt.alarm == null ? 0.3 : dt.alarm),
    boxes: r() < (dt.boxes == null ? 0.4 : dt.boxes),
    ivy: r() < (dt.ivy || 0),
    porch: r() < (dt.porch || 0),
    curtain: nt.curtain == null ? 0.35 : nt.curtain,
    tv: nt.tv == null ? 0.1 : nt.tv,
    on: nt.on == null ? 0.6 : nt.on,
    ivySide: r() < 0.5 ? 'left' : 'right',
    extra: r(),                 // a free draw for the style's own hooks (an engine-house chimney, a Dutch gable ...)
    extra2: r(),
    party: b.party || st.party || 'none',
    shop: b.shop && typeof b.shop === 'object' ? b.shop : (b.shop === true || (st.shop && st.shop.always && b.shop !== false) ? { kind: _scbgPickW(r, Object.keys(SCENE_GEN_SHOP_WORDS)) } : null),
    shopCol: _scbgPickW(r, (st.shop && st.shop.cols) || ['#1f3a34', '#5a1f24', '#1d2a44', '#3a2a1e', '#2a2a2a', '#4a5a2a', '#6a2a3a']),
    corner: !!b.corner,
  };
  // later draws (appended so the earlier choices never move): a wall alternative (stucco for brick), the upper-wall
  // finish, the roof among the style's options, a Dutch gable
  if (w.alt && r() < (w.alt.chance || 0.3)) { sp.wall = _scbgMix(_scbgPickW(r, w.alt.cols), grime, wear * 0.6); sp.tex = w.alt.texture || sp.tex; sp.alt = true; } else r();
  if (Array.isArray(w.upper)) { const u = w.upper[Math.floor(r() * w.upper.length) % w.upper.length]; sp.upper = u; sp.wall2 = _scbgMix(_scbgPickW(r, u.cols), grime, wear * 0.7); }
  else { sp.upper = w.upper || null; r(); r(); }
  if (Array.isArray(st.roofs) && !_SCBG_ROOFS.includes(b.roof)) sp.roof = _scbgPickW(r, st.roofs); else r();
  sp.dutch = !!st.dutch && r() < st.dutch;
  sp.rnd = sceneRnd(sceneHash('bg|' + st.id + '|' + seed + '|layout'));   // the layout's own stream (window lights, flints, bricks)
  return sp;
}

/* ---------- views: metres -> screen ---------- */
function _scbgCamOf(cam) {
  cam = cam || {};
  const fov = Number.isFinite(cam.fov) ? cam.fov : 66, f = Number.isFinite(cam.f) ? cam.f : 800 / Math.tan(fov * _scbgD2R / 2);
  const horizon = Number.isFinite(cam.horizon) ? cam.horizon : 470, eye = Number.isFinite(cam.eye) ? cam.eye : 1.65;
  return { fov, f, horizon, eye, x0: Number.isFinite(cam.x0) ? cam.x0 : 800, heading: cam.heading || 0, dMin: f * eye / Math.max(1, 900 - horizon) };
}
function _scbgPersp(cam) {
  const c = _scbgCamOf(cam), near = Math.max(0.4, c.dMin * 0.25);
  return { ortho: false, cam: c, near, eye: c.eye,
    P: w => [c.x0 + c.f * w[0] / Math.max(near * 0.999, w[2]), c.horizon + c.f * (c.eye - w[1]) / Math.max(near * 0.999, w[2])],
    sees: (n, w) => n[0] * -w[0] + n[1] * (c.eye - w[1]) + n[2] * -w[2] > 1e-6,
    px: (hm, w) => c.f * hm / Math.max(near, w[2]) };
}
function _scbgOrtho(upm) {
  return { ortho: true, near: -Infinity, eye: 1.65, P: w => [w[0] * upm, -w[1] * upm], sees: n => n[2] < -1e-6, px: hm => hm * upm };
}

/* ---------- the model: footprint, walls, roof, protrusions ---------- */
/** Footprint [[x, d]] counter-clockwise with the front edge first. front: the edge index in the input order. */
function _scbgFoot(foot, front) {
  let P = foot.map(p => [Number(p[0]), Number(p[1])]);
  if (P.length > 2 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 1e-6) P.pop();
  let fi = Number.isInteger(front) ? ((front % P.length) + P.length) % P.length : -1;
  if (_scbgArea2(P) < 0) { const n = P.length; P = P.slice().reverse(); if (fi >= 0) fi = (n - 2 - fi + n) % n; }
  if (fi < 0) {
    // the default front: the edge whose outward normal looks most toward the camera (the origin)
    let best = -Infinity;
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ex = b[0] - a[0], ed = b[1] - a[1], L = Math.hypot(ex, ed) || 1, nx = ed / L, nd = -ex / L, mx = (a[0] + b[0]) / 2, md = (a[1] + b[1]) / 2, k = (nx * -mx + nd * -md) / (Math.hypot(mx, md) || 1) + L * 1e-4; if (k > best) { best = k; fi = i; } }
  }
  return P.slice(fi).concat(P.slice(0, fi));
}
/** A wall plane from ground edge a -> b (outward normal to the right of a -> b in (x, d), counter-clockwise footprints). */
function _scbgWallPlane(a, b) {
  const ex = b[0] - a[0], ed = b[1] - a[1], L = Math.hypot(ex, ed) || 1;
  return { O: [a[0], 0, a[1]], U: [ex / L, 0, ed / L], V: [0, 1, 0], N: [ed / L, 0, -ex / L], len: L };
}
const _scbgOn = (pl, s, z, o) => [pl.O[0] + pl.U[0] * s + pl.N[0] * (o || 0) + pl.V[0] * z, pl.O[1] + pl.U[1] * s + pl.N[1] * (o || 0) + pl.V[1] * z, pl.O[2] + pl.U[2] * s + pl.N[2] * (o || 0) + pl.V[2] * z];

/**
 * The faces of a building: { faces: [{ poly, n, col, part, role, plane, edge, elems, layer }], blocks: [...], E, H, zs, quad }.
 * Walls first (each with its plane), then the roof planes, then protrusions (each a small convex block of faces).
 */
function _scbgModel(b, sp, foot) {
  const st = sp.style, n = foot.length, E0 = sp.zs[sp.zs.length - 1], par = sp.parapet || 0, quad = n === 4;
  const faces = [], blocks = [];
  const W = Math.hypot(foot[1][0] - foot[0][0], foot[1][1] - foot[0][1]);
  const Dp = quad ? Math.hypot(foot[3][0] - foot[0][0], foot[3][1] - foot[0][1]) : 0;
  const Q = (s, t, z) => { const [p0, p1, p2, p3] = foot; return [(1 - s) * (1 - t) * p0[0] + s * (1 - t) * p1[0] + s * t * p2[0] + (1 - s) * t * p3[0], z, (1 - s) * (1 - t) * p0[1] + s * (1 - t) * p1[1] + s * t * p2[1] + (1 - s) * t * p3[1]]; };
  let roof = sp.roof;
  if (!quad && roof !== 'flat') roof = 'ring';
  // a free-standing block much deeper than its front (an OSM warehouse whose front is its short end): the ridge runs along the
  // length, gables at the ends (integration, 8 Oct: Merchant's Warehouse drew a 10 m gable along its 50 m side). Terraces keep
  // the ridge parallel to the street (their party walls carry the gables).
  // The same for a gable roof on a block much wider than deep (OSM's roof:shape=gabled has its ridge along the longest side).
  if (quad && !/left|right|both/.test(sp.party || '')) {
    if (roof === 'pitched-side' && Dp > W * 1.25) roof = 'gable';
    else if (roof === 'gable' && W > Dp * 1.25 && !sp.dutch) roof = 'pitched-side';
  }
  const tp = Math.tan(sp.pitch * _scbgD2R);
  let H = E0, roofZ = () => E0, tops = null;   // tops: per wall edge, extra vertices above the eave (gables) as [[s, z], ...] in edge order
  const E = E0 + (roof === 'flat' ? par : 0), wallE = E + (roof === 'flat' ? 0 : par);
  const roofFaces = [];
  if (quad) {
    tops = [[], [], [], []];
    if (roof === 'pitched-side') {
      const R = tp * Dp / 2; H = E + R;
      roofFaces.push([Q(0, 0, E), Q(1, 0, E), Q(1, 0.5, H), Q(0, 0.5, H)], [Q(1, 1, E), Q(0, 1, E), Q(0, 0.5, H), Q(1, 0.5, H)]);
      tops[1] = [Q(1, 0.5, H)]; tops[3] = [Q(0, 0.5, H)];
      roofZ = (s, t) => H - R * Math.abs(t - 0.5) * 2;
    } else if (roof === 'gable') {
      const R = Math.min(tp * W / 2, W * 0.9); H = E + R;
      roofFaces.push([Q(0, 0, E), Q(0.5, 0, H), Q(0.5, 1, H), Q(0, 1, E)], [Q(1, 0, E), Q(1, 1, E), Q(0.5, 1, H), Q(0.5, 0, H)]);
      tops[0] = [Q(0.5, 0, H)]; tops[2] = [Q(0.5, 1, H)];
      if (sp.dutch) {
        // a Dutch gable: curved shoulders, an upright neck and a small pediment above the roof line (front and back walls)
        const prof = [[0.1, 0.3], [0.17, 0.52], [0.26, 0.66], [0.3, 0.7], [0.3, 1.08], [0.36, 1.1], [0.5, 1.22], [0.64, 1.1], [0.7, 1.08], [0.7, 0.7], [0.74, 0.66], [0.83, 0.52], [0.9, 0.3]];
        tops[0] = prof.slice().reverse().map(([u, k]) => Q(u, 0, E + R * k));
        tops[2] = prof.map(([u, k]) => Q(u, 1, E + R * k));
      }
      roofZ = (s) => H - R * Math.abs(s - 0.5) * 2;
    } else if (roof === 'hip') {
      if (W >= Dp) {
        const R = tp * Dp / 2, r = Math.min(0.49, 0.5 * Dp / W); H = E + R;
        roofFaces.push([Q(0, 0, E), Q(1, 0, E), Q(1 - r, 0.5, H), Q(r, 0.5, H)], [Q(1, 1, E), Q(0, 1, E), Q(r, 0.5, H), Q(1 - r, 0.5, H)], [Q(1, 0, E), Q(1, 1, E), Q(1 - r, 0.5, H)], [Q(0, 1, E), Q(0, 0, E), Q(r, 0.5, H)]);
        roofZ = (s, t) => Math.min(H, E + R * Math.min(Math.min(t, 1 - t) * 2, Math.min(s, 1 - s) / r));
      } else {
        const R = tp * W / 2, r = Math.min(0.49, 0.5 * W / Dp); H = E + R;
        roofFaces.push([Q(0, 0, E), Q(1, 0, E), Q(0.5, r, H)], [Q(1, 1, E), Q(0, 1, E), Q(0.5, 1 - r, H)], [Q(1, 0, E), Q(1, 1, E), Q(0.5, 1 - r, H), Q(0.5, r, H)], [Q(0, 1, E), Q(0, 0, E), Q(0.5, r, H), Q(0.5, 1 - r, H)]);
        roofZ = (s, t) => Math.min(H, E + R * Math.min(Math.min(s, 1 - s) * 2, Math.min(t, 1 - t) / r));
      }
    } else if (roof === 'mansard') {
      const m = Math.min(0.9, 0.2 * Math.min(W, Dp)), Rm = Math.min(2.6, m * 2.9), ms = m / W, mt = m / Dp; H = E + Rm + 0.4;
      const lo = [Q(0, 0, E), Q(1, 0, E), Q(1, 1, E), Q(0, 1, E)], hi = [Q(ms, mt, E + Rm), Q(1 - ms, mt, E + Rm), Q(1 - ms, 1 - mt, E + Rm), Q(ms, 1 - mt, E + Rm)];
      for (let i = 0; i < 4; i++) roofFaces.push([lo[i], lo[(i + 1) % 4], hi[(i + 1) % 4], hi[i]]);
      const c = Q(0.5, 0.5, H);
      for (let i = 0; i < 4; i++) roofFaces.push([hi[i], hi[(i + 1) % 4], c]);
      roofZ = () => E + Rm;
    } else if (roof === 'butterfly') {
      const R = Math.tan(10 * _scbgD2R) * Dp / 2; H = E + R;
      roofFaces.push([Q(0, 0, E + R), Q(1, 0, E + R), Q(1, 0.5, E), Q(0, 0.5, E)], [Q(1, 1, E + R), Q(0, 1, E + R), Q(0, 0.5, E), Q(1, 0.5, E)]);
      roofZ = (s, t) => E + R * Math.abs(t - 0.5) * 2;
    } else {
      roofFaces.push([Q(0, 0, E), Q(1, 0, E), Q(1, 1, E), Q(0, 1, E)]);
      roofZ = () => E;
    }
  } else if (roof === 'ring') {
    const cx = foot.reduce((s, p) => s + p[0], 0) / n, cd = foot.reduce((s, p) => s + p[1], 0) / n;
    const rmin = Math.min(...foot.map(p => Math.hypot(p[0] - cx, p[1] - cd)));
    const R = Math.min(tp * rmin * 0.6, 6); H = E + R;
    const top = foot.map(p => [cx + (p[0] - cx) * 0.4, H, cd + (p[1] - cd) * 0.4]);
    for (let i = 0; i < n; i++) roofFaces.push([[foot[i][0], E, foot[i][1]], [foot[(i + 1) % n][0], E, foot[(i + 1) % n][1]], top[(i + 1) % n], top[i]]);
    roofFaces.push(top);
  } else {
    roofFaces.push(foot.map(p => [p[0], E, p[1]]));
  }
  // walls (party walls: blank brick; the neighbour usually hides them)
  for (let i = 0; i < n; i++) {
    const a = foot[i], c = foot[(i + 1) % n], pl = _scbgWallPlane(a, c);
    const wallTop = roof === 'butterfly' && quad ? (i === 0 || i === 2 ? E + (H - E) : null) : null;
    const zTop = wallTop != null ? wallTop : wallE;
    const poly = [[a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], zTop, c[1]]];
    if (tops && tops[i] && tops[i].length) poly.push(...tops[i]);
    if (roof === 'butterfly' && quad && (i === 1 || i === 3)) poly.push(Q(i === 1 ? 1 : 0, 0.5, E));
    poly.push([a[0], roof === 'butterfly' && quad && (i === 1 || i === 3) ? E + (H - E) : zTop, a[1]]);
    if (roof === 'butterfly' && quad && (i === 1 || i === 3)) { poly[2] = [c[0], E + (H - E), c[1]]; }
    const role = i === 0 ? 'front' : quad && i === 2 ? 'back' : quad ? ((i === 1 && /right|both/.test(sp.party)) || (i === 3 && /left|both/.test(sp.party)) ? 'party' : 'side') : 'side';
    faces.push({ poly, n: pl.N, part: 'wall', role, plane: pl, edge: i, col: sp.wall, elems: [] });
  }
  for (const rp of roofFaces) faces.push({ poly: rp, n: _scbgNormal(rp), part: 'roof', role: 'roof', col: sp.roofCol, elems: [] });
  // chimneys: stacks on the party line, the ridge or the ends (quad roofs), each a small block with pots
  const ch = st.chimney || {};
  if (quad && roof !== 'flat' && ch.where !== 'none' && roof !== 'butterfly') {
    const where = ch.where === 'party' ? (/both|left/.test(sp.party) ? ['party-l'] : /right/.test(sp.party) ? ['party-r'] : ['end-l', 'end-r']) : ch.where === 'ridge' ? ['ridge'] : ch.where === 'rear' ? ['rear'] : ['end-l', 'end-r'];
    const cw = (ch.w || 0.45) + 0.28 * sp.pots, cd = ch.d || 0.62, rise = ch.h || 1.0;
    const tc = roof === 'gable' ? 0.62 : 0.5;
    for (const wh of where) {
      if ((wh === 'end-l' || wh === 'end-r') && W < 4) { if (wh === 'end-r') continue; }
      const s = wh === 'party-l' ? 0 : wh === 'party-r' ? 1 : wh === 'end-l' ? (cw / 2 + 0.05) / W : wh === 'end-r' ? 1 - (cw / 2 + 0.05) / W : wh === 'rear' ? 0.7 : 0.33;
      const t = wh === 'rear' ? 0.72 : tc, hs = cw / 2 / W, ht = cd / 2 / Dp;
      const base = [[s - hs, t - ht], [s + hs, t - ht], [s + hs, t + ht], [s - hs, t + ht]];
      const z0 = base.map(([u, v]) => roofZ(_scbgCl(u, 0, 1), _scbgCl(v, 0, 1)) - 0.05);
      const top = Math.max(...z0) + rise + (wh.startsWith('party') || wh === 'ridge' ? 0.25 : 0.1);
      const pts = base.map(([u, v]) => { const q = Q(u, v, 0); return [q[0], q[2]]; });
      blocks.push({ kind: 'stack', foot: pts, z0, z1: top, col: _scbgDark(sp.wall, 0.06), lidCol: _scbgDark(sp.wall, 0.25), pots: sp.pots, cw, potCol: ['#a8553a', '#9a4a32', '#b0603e', '#7a7068'][sp.seed % 4], part: 'roof' });
    }
  }
  // the style's own blocks beside the building (a mill's engine-house chimney)
  if (typeof st.extraBlocks === 'function') for (const bk of st.extraBlocks(sp, { foot, W, Dp, E, H, Q, quad }) || []) blocks.push(bk);
  return { faces, blocks, E: wallE, E0, H: Math.max(H, wallE), W, Dp, quad, Q, roofZ, zs: sp.zs, roof };
}

/* ---------- facade layout: elements in metres on a wall plane (s along, z up) ---------- */
/**
 * The elements of one wall. role 'front' takes the style's layout (house, shops, grid, curtain, brutal, station or the style's own
 * front()), 'side' a simple column of windows (or none), 'back' a plain rear, 'party' nothing but texture.
 */
function _scbgLayout(sp, face, model) {
  const st = sp.style, len = face.plane.len, zs = sp.zs, nS = sp.storeys, out = { elems: [], blocks: [] };
  if (face.role === 'party') { out.elems.push({ k: 'tex', s0: 0, s1: len, z0: 0, z1: model.E }); return out; }
  out.elems.push({ k: 'tex', s0: 0, s1: len, z0: 0, z1: model.E });
  if (sp.wall2 && sp.upper && face.role !== 'back') { const from = sp.upper.from == null ? 1 : sp.upper.from; if (from < nS) out.elems.push({ k: 'panel', s0: 0, s1: len, z0: zs[from] - 0.05, z1: model.E, col: sp.wall2, tex: sp.upper.texture || 'render' }); }
  if (st.quoins && face.role !== 'party') out.elems.push({ k: 'quoins', len, z1: model.E0 });
  if (face.role === 'front') {
    const fn = st.front || _scbgLayouts[st.layout || 'house'] || _scbgLayouts.house;
    fn(sp, face, model, out);
    if (typeof st.frontBlocks === 'function') for (const bk of st.frontBlocks(sp, face, model, out) || []) out.blocks.push(bk);
  } else if (face.role === 'side') {
    const fn = st.side || _scbgLayouts.side;
    fn(sp, face, model, out);
  } else if (face.role === 'back') {
    _scbgLayouts.side(sp, face, model, out, true);
  }
  if (st.plinth !== false && face.role !== 'party') out.elems.push({ k: 'band', s0: 0, s1: len, z0: 0, z1: st.plinth || 0.35, col: _scbgDark(sp.wall, 0.16), layer: 1 });
  if (st.bands) for (const bd of st.bands) { const z = typeof bd.z === 'number' ? bd.z : zs[Math.min(nS, bd.storey || 1)] + (bd.dz || 0); if (z < model.E) out.elems.push({ k: 'band', s0: 0, s1: len, z0: z, z1: z + (bd.h || 0.15), col: bd.col === 'dress' ? sp.dress : bd.col || _scbgLight(sp.wall, 0.25), layer: 2, o: bd.o || 0.02 }); }
  if (model.roof !== 'flat') out.elems.push({ k: 'band', s0: 0, s1: len, z0: model.E0 - 0.22, z1: model.E0, col: _scbgDark(sp.wall, 0.35), layer: 2, op: 0.55 });   // the eave's shadow
  else out.elems.push({ k: 'band', s0: 0, s1: len, z0: model.E - 0.16, z1: model.E, col: st.coping || _scbgLight(sp.dress, 0.1), layer: 2 });
  if (face.role === 'front' && sp.pipe && st.layout !== 'curtain') out.elems.push({ k: 'pipe', s: sp.pipe === 'left' ? 0.12 : len - 0.12, z0: 0.1, z1: model.E0 - 0.1 });
  if (face.role === 'front' && sp.alarm && nS > 1 && /house|shops|undefined/.test(String(st.layout))) out.elems.push({ k: 'alarm', s: sp.doorSide === 'left' ? Math.min(len - 0.5, 1.35) : Math.max(0.15, len - 1.7), z: zs[1] + 0.35, col: ['#e8e4dc', '#c8402e', '#2a5aa0', '#d8a828', '#e8e4dc'][sp.seed % 5] });
  if (face.role === 'front' && sp.ivy && st.layout !== 'curtain') out.elems.push({ k: 'ivy', s: (sp.doorSide === 'centre' ? sp.ivySide : sp.doorSide === 'left' ? 'right' : 'left') === 'left' ? 0 : len - Math.min(2.4, len * 0.4), w: Math.min(2.4, len * 0.4), z0: 0, z1: Math.min(model.E0, zs[Math.min(nS, 2)] + 0.6) });
  return out;
}
/** Column centres for n columns across a wall of length len (with margins m at both ends). */
const _scbgCols = (len, n, m) => { const a = m || 0, w = (len - 2 * a) / n, c = []; for (let i = 0; i < n; i++) c.push(a + w * (i + 0.5)); return { c, w }; };
/** A window element at column centre cx on storey i (style window spec, scaled by the storey's grade). */
function _scbgWin(sp, i, cx, colW, over) {
  const st = sp.style, wn = st.win || {}, zs = sp.zs, hS = zs[i + 1] - zs[i];
  const g = wn.grade ? wn.grade[Math.min(i, wn.grade.length - 1)] : 1;
  const w = Math.min((over && over.w) || wn.w || 0.95, colW * 0.78), h = Math.min(hS * (wn.hk || 0.55) * g, hS - (wn.sill || 0.85) - 0.25);
  const z = zs[i] + (i === 0 ? (wn.sill0 || wn.sill || 0.85) : (wn.sill || 0.85));
  return Object.assign({ k: 'win', s: cx - w / 2, z, w, h: Math.max(0.5, h), type: wn.type || 'sash', panes: wn.panes || [2, 1], head: wn.head || 'flat', recess: wn.recess == null ? 0.12 : wn.recess, storey: i }, over || {}, { w, s: cx - w / 2 });
}
const _scbgLayouts = {
  /** Houses: columns of windows, a door at one end (or the centre), an optional bay on the other columns. */
  house(sp, face, model, out) {
    const st = sp.style, len = face.plane.len, nS = sp.storeys, zs = sp.zs, dr = st.door || {};
    let n = Math.max(1, Math.round(len / (st.colW || 2.5)));
    if (len < 3.2) n = 1;
    const { c, w: colW } = _scbgCols(len, n, st.margin || 0.25);
    const centre = sp.doorSide === 'centre' || (st.doorCentre && n >= 3 && n % 2 === 1);
    const di = centre ? Math.floor(n / 2) : sp.doorSide === 'left' ? 0 : n - 1;
    if (sp.shop) return _scbgLayouts.shops(sp, face, model, out);
    // the door
    const dw = Math.min(dr.w || 0.95, colW * 0.8), dh = Math.min(dr.h || 2.15, zs[1] - 0.45);
    out.elems.push({ k: 'door', s: c[di] - dw / 2, z: dr.step ? 0.15 : 0.02, w: dw, h: dh, fan: !!dr.fan, case: !!dr.case, panels: dr.panels == null ? 4 : dr.panels, recess: dr.recess == null ? 0.18 : dr.recess, canopy: !!(dr.canopy || sp.porch) });
    if ((dr.canopy || sp.porch) && st.porch !== false) out.blocks.push({ kind: 'canopy', s0: c[di] - dw / 2 - 0.35, s1: c[di] + dw / 2 + 0.35, z: zs[1] - 0.15 - (dr.fan ? 0 : 0.2), out: 0.75, col: st.porchCol || sp.roofCol });
    // a bay over the other ground-floor columns (the one beside the door in a narrow house)
    const others = c.map((x, i) => i).filter(i => i !== di);
    if (sp.bay && st.bay && others.length) {
      const bi = others.slice(0, n >= 3 ? others.length : 1);
      const left = Math.min(...bi.map(i => c[i] - colW / 2)), right = Math.max(...bi.map(i => c[i] + colW / 2));
      const bw = Math.min(st.bay.w || 2.4, right - left - 0.2), mid = (left + right) / 2;
      const floors = Math.min(nS, st.bay.floors || 1);
      out.blocks.push({ kind: 'bay', shape: st.bay.kind, s0: mid - bw / 2, s1: mid + bw / 2, depth: st.bay.depth || 0.7, z0: 0, z1: zs[floors] - 0.1, floors, gable: !!st.bay.gable, lid: st.bay.lid || (st.bay.gable ? 'gable' : 'hip') });
      for (let f = floors; f < nS; f++) for (const i of others) out.elems.push(_scbgWin(sp, f, c[i], colW));
      for (let f = 1; f < nS; f++) out.elems.push(_scbgWin(sp, f, c[di], colW, st.overDoor ? { w: st.overDoor } : null));
      return;
    }
    for (let f = 0; f < nS; f++) for (let i = 0; i < n; i++) {
      if (f === 0 && i === di) continue;
      out.elems.push(_scbgWin(sp, f, c[i], colW, i === di && st.overDoor ? { w: st.overDoor } : null));
    }
  },
  /** A parade shop: a shopfront across the ground floor (pilasters, fascia, stall riser, a recessed door), a side door to the flats over. */
  shops(sp, face, model, out) {
    const st = sp.style, len = face.plane.len, nS = sp.storeys, zs = sp.zs, sh = st.shop || {};
    const side = len > 5.4 && nS > 1, dW = 0.95, dS = sp.doorSide === 'left' ? 0.3 : len - 0.3 - dW;
    const s0 = side ? (sp.doorSide === 'left' ? dS + dW + 0.3 : 0) : 0, s1 = side ? (sp.doorSide === 'left' ? len : dS - 0.3) : len;
    if (side) out.elems.push({ k: 'door', s: dS, z: 0.02, w: dW, h: 2.1, fan: true, panels: 2, recess: 0.12 });
    const top = Math.min(zs[1] - 0.15, sh.top || 3.4);
    out.elems.push({ k: 'shop', s: s0 + 0.05, w: s1 - s0 - 0.1, z: 0, h: top, fascia: sh.fascia || 0.62, riser: sh.riser || 0.5, pil: sh.pilaster || 0.32, col: sp.shopCol, kind: sp.shop && sp.shop.kind, sign: sp.shop && sp.shop.sign, brand: !!(sp.shop && sp.shop.brand), awning: sh.awning && sp.extra < 0.5 });
    const n = Math.max(1, Math.round(len / (st.colW || 2.6))), { c, w: colW } = _scbgCols(len, n, 0.3);
    for (let f = 1; f < nS; f++) for (let i = 0; i < n; i++) out.elems.push(_scbgWin(sp, f, c[i], colW));
  },
  /** A regular grid of openings on every storey (mills, warehouses): optional loading-door bay and a cart door. */
  grid(sp, face, model, out) {
    const st = sp.style, len = face.plane.len, nS = sp.storeys, zs = sp.zs, g = st.grid || {};
    const n = Math.max(1, Math.round(len / (g.col || 3.2))), { c, w: colW } = _scbgCols(len, n, g.margin || 0.6);
    const load = g.loading && n >= 3 ? Math.floor(n / 2) - (sp.extra < 0.5 ? 0 : (n > 4 ? 1 : 0)) : -1;
    const door = load >= 0 ? load : Math.floor(n / 2);
    for (let f = 0; f < nS; f++) for (let i = 0; i < n; i++) {
      if (i === load) {
        if (f === 0) out.elems.push({ k: 'door', s: c[i] - 1.1, z: 0.02, w: 2.2, h: Math.min(3.2, zs[1] - 0.4), head: 'seg', col: g.doorCol || '#3a2a1e', panels: 0, planks: true, recess: 0.25 });
        else out.elems.push({ k: 'door', s: c[i] - 0.8, z: zs[f] + 0.05, w: 1.6, h: Math.min(2.2, zs[f + 1] - zs[f] - 0.5), head: 'seg', col: g.doorCol || '#3a2a1e', panels: 0, planks: true, recess: 0.15, loading: true });
        continue;
      }
      if (f === 0 && i === door && load < 0) { out.elems.push({ k: 'door', s: c[i] - 0.6, z: 0.02, w: 1.2, h: 2.4, head: 'seg', panels: 2, recess: 0.2 }); continue; }
      out.elems.push(_scbgWin(sp, f, c[i], colW));
    }
    if (load >= 0) out.elems.push({ k: 'band', s0: c[load] - 0.08, s1: c[load] + 0.08, z0: model.E0 - 0.9, z1: model.E0 - 0.1, col: '#2a2420', layer: 7, o: 0.25 });   // the hoist beam
  },
  /** A curtain wall: glass panels on a mullion and transom grid, spandrels at the floor lines, a podium storey. */
  curtain(sp, face, model, out) {
    const st = sp.style, len = face.plane.len, nS = sp.storeys, zs = sp.zs, g = st.grid || {};
    const n = Math.max(1, Math.round(len / (g.col || 1.5))), mw = len / n;
    for (let f = 0; f < nS; f++) {
      const hS = zs[f + 1] - zs[f], sp0 = f === 0 ? 0 : (g.spandrel || 0.9);
      if (sp0) out.elems.push({ k: 'band', s0: 0, s1: len, z0: zs[f], z1: zs[f] + sp0, col: g.spandrelCol || _scbgDark(sp.wall, 0.2), layer: 1 });
      for (let i = 0; i < n; i++) out.elems.push({ k: 'win', s: i * mw + 0.04, z: zs[f] + sp0, w: mw - 0.08, h: hS - sp0 - 0.04, type: 'curtain', panes: [1, 1], head: 'flat', recess: 0.02, storey: f, glassOnly: true, entrance: f === 0 && Math.abs(i - (n - 1) / 2) < 0.6 });
    }
    out.elems.push({ k: 'grid', s0: 0, s1: len, z0: 0, z1: model.E, n, zs, col: g.mullion || '#8c949c' });
    out.blocks.push({ kind: 'slab', s0: -0.1, s1: len + 0.1, z: zs[1] - 0.05, out: g.canopy || 1.6, th: 0.35, col: g.slab || '#d8dadc' });
    if (st.core !== false) out.elems.push({ k: 'core', s: len * (sp.extra < 0.5 ? 0.2 : 0.7), w: Math.min(3, len * 0.15), z0: zs[1], z1: model.E - 0.2 });
  },
  /** Brutalist: board-marked concrete, deep recessed window strips, a cantilevered upper block, a recessed glazed ground floor. */
  brutal(sp, face, model, out) {
    const st = sp.style, len = face.plane.len, nS = sp.storeys, zs = sp.zs, g = st.grid || {};
    const n = Math.max(1, Math.round(len / (g.col || 2.4))), { c, w: colW } = _scbgCols(len, n, 0.5);
    for (let i = 0; i < n; i++) out.elems.push({ k: 'win', s: c[i] - colW * 0.42, z: 0.3, w: colW * 0.84, h: zs[1] - 0.9, type: 'metal', panes: [2, 1], head: 'flat', recess: 0.35, storey: 0, glassOnly: false });
    out.elems.push({ k: 'door', s: c[Math.floor(n / 2)] - 0.9, z: 0.02, w: 1.8, h: 2.4, panels: 0, glass: true, recess: 0.4 });
    const cant = nS >= 3 ? 1 : 0;
    if (cant) out.blocks.push({ kind: 'cantilever', s0: -0.2, s1: len + 0.2, z0: zs[1] + 0.2, z1: model.E, out: g.cantilever || 1.4, storeys: zs.slice(1), col: _scbgLight(sp.wall, 0.04), cols: n });
    else for (let f = 1; f < nS; f++) for (let i = 0; i < n; i++) out.elems.push(_scbgWin(sp, f, c[i], colW, { type: 'deep', recess: 0.45, w: colW * 0.8 }));
  },
  /** A station building: a long low range with a taller entrance block, tall round-headed booking-hall windows and a canopy. */
  station(sp, face, model, out) {
    const st = sp.style, len = face.plane.len, nS = sp.storeys, zs = sp.zs;
    const n = Math.max(3, Math.round(len / (st.colW || 3))), { c, w: colW } = _scbgCols(len, n, 0.6), mid = Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      if (i === mid || (n > 6 && Math.abs(i - mid) === 1 && sp.extra < 0.5)) { out.elems.push({ k: 'door', s: c[i] - 0.85, z: 0.02, w: 1.7, h: Math.min(3.1, zs[1] - 0.6), head: 'round', panels: 0, glass: true, recess: 0.3, fan: true }); continue; }
      out.elems.push(_scbgWin(sp, 0, c[i], colW, { head: 'round', type: 'sash', panes: [2, 2], h: zs[1] - 1.4, w: Math.min(1.3, colW * 0.6) }));
    }
    for (let f = 1; f < nS; f++) for (let i = 0; i < n; i++) out.elems.push(_scbgWin(sp, f, c[i], colW, { head: 'seg' }));
    out.blocks.push({ kind: 'canopy', s0: 0.2, s1: len - 0.2, z: zs[1] - 0.2, out: st.canopyOut || 3.2, col: st.canopyCol || '#5a6a62', valance: true, posts: Math.max(2, Math.round(len / 6)) });
  },
  /** Side walls: a window per storey in the middle (end-of-terrace gables are often blank: the style says). */
  side(sp, face, model, out, back) {
    const st = sp.style, len = face.plane.len, nS = sp.storeys;
    if (!back && st.sideWindows === false) return;
    if (st.layout === 'curtain') { _scbgLayouts.curtain(sp, face, model, { elems: out.elems, blocks: [] }); return; }
    const n = Math.max(1, Math.round(len / (back ? 3.2 : 4.5))), { c, w: colW } = _scbgCols(len, n, 0.6);
    for (let f = 0; f < nS; f++) for (let i = 0; i < n; i++) { if (!back && (i + f + sp.seed) % 3 === 2) continue; out.elems.push(_scbgWin(sp, f, c[i], colW, st.layout === 'grid' ? null : { w: Math.min(0.8, colW * 0.6), type: back ? 'casement' : (st.win && st.win.type) || 'sash', panes: [1, 1] })); }
  },
};

/* ---------- drawing: elements and faces -> shapes ---------- */
/**
 * The shape sink: shapes are collected per face in layers (0 face, 1 texture, 2 bands and surrounds, 3 reveals, 4 glass, 5 frames
 * and bars, 6 sills and lintels, 7 doors and details), flushed in layer order, same paint merged into one path within a layer
 * (elements of one layer never overlap). Glass is never merged in elevation (each pane switches on alone at night).
 */
function _scbgSink(opt) {
  const shapes = [], lit = [], snow = [];
  let cur = null;
  const api = {
    shapes, lit, snow, count: 0,
    begin() { cur = new Map(); },
    add(layer, sh) {
      if (!sh || !sh.d) return;
      if (sh.part === 'lit') { lit.push(Object.assign({}, sh, { layer })); return; }
      if (sh.part === 'snow') { snow.push(Object.assign({}, sh, { layer })); return; }
      const key = layer + '|' + (sh.part || '') + '|' + (typeof sh.f === 'string' ? sh.f : JSON.stringify(sh.f)) + '|' + (sh.op == null ? 1 : sh.op) + '|' + (sh.glow || '') + '|' + (sh.theta == null ? '' : sh.theta) + '|' + (sh.detail ? 1 : 0);
      const noMerge = sh.glow && opt.ortho;
      let L = cur.get(layer); if (!L) cur.set(layer, (L = new Map()));
      const k = noMerge ? key + '|' + L.size : key;
      const prev = L.get(k);
      if (prev) prev.d += sh.d; else L.set(k, Object.assign({}, sh, { layer }, api.blk ? { blk: true } : null));
    },
    flush() {
      if (!cur) return;
      for (const l of [...cur.keys()].sort((a, b) => a - b)) for (const sh of cur.get(l).values()) shapes.push(sh);
      cur = null;
    },
  };
  return api;
}
/** Draw one face (wall, roof or block face) and its elements through the view. ctx: { view, sp, tierCap, season, sink, light } */
function _scbgDrawFace(face, ctx) {
  const { view, sink } = ctx;
  const clipped = _scbgClipNear(face.poly, view.near);
  if (!clipped) return;
  const pts = clipped.map(view.P), shade = _scbgFaceShade(face, ctx);
  if (ctx.debug && face.part === 'wall' && face.edge != null && face.role !== 'block') ctx.debug.walls.push({ edge: face.edge, role: face.role, poly: pts });
  sink.begin();
  sink.add(0, { f: _scbgSeasonal(_scbgDark(face.col, shade), ctx.season), d: _scbgPath(pts), op: 1, part: face.part === 'roof' ? 'roof' : 'body' });
  if (face.part === 'roof' && ctx.tier(face.poly) >= 2) _scbgRoofTex(face, ctx);
  if (face.part === 'roof') {
    // snow on a roof plane: the plane, its eave edge pulled up a little (the drip line stays dark)
    const n = face.n;
    if (n[1] > 0.2) sink.add(0, { f: '#eef2f6', d: _scbgPath(pts), op: 0.92, part: 'snow' });
  }
  if (face.plane && face.elems && face.elems.length) for (const e of face.elems) _scbgDrawElem(e, face, ctx);
  sink.flush();
}
/** A static form shade from a soft sky light (upper left, toward the camera): side and back faces a little darker. */
function _scbgFaceShade(face, ctx) {
  const n = face.n, Ld = ctx.view.ortho ? [-0.35, 0.6, -0.72] : [-0.4, 0.62, -0.67];
  const k = _scbgDot(n, Ld);
  return face.part === 'roof' ? _scbgCl(0.12 - 0.18 * k, 0, 0.3) : _scbgCl(0.1 - 0.16 * k, 0, 0.28) + (face.dark || 0);
}
function _scbgRoofTex(face, ctx) {
  // slate or tile courses: a few lines parallel to the eave (the first edge of the plane), only near
  const P = face.poly, a = P[0], b = P[1], c = P[P.length - 1], m = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  if (m < 0.5 || P.length < 3) return;
  const n = Math.min(14, Math.floor(m / 0.45)), segs = [];
  for (let i = 1; i < n; i++) {
    const t = i / n, p = _scbgAdd(a, _scbgMul([c[0] - a[0], c[1] - a[1], c[2] - a[2]], t)), q = _scbgAdd(b, _scbgMul([P[2][0] - b[0], P[2][1] - b[1], P[2][2] - b[2]], P.length === 3 ? t * 0 : t));
    if (P.length === 3) continue;
    const up = _scbgMul(_scbgNorm([c[0] - a[0], c[1] - a[1], c[2] - a[2]]), 0.03);
    const quad = [p, q, _scbgAdd(q, up), _scbgAdd(p, up)];
    const cl = _scbgClipNear(quad, ctx.view.near); if (cl) segs.push(_scbgPath(cl.map(ctx.view.P)));
  }
  if (segs.length) ctx.sink.add(1, { f: _scbgDark(face.col, 0.3), d: segs.join(''), op: 0.35, part: 'roof', detail: true });
}
/** Map a wall-local rectangle (s, z, w, h at offset o) to screen points; null when any corner is behind the near plane. */
function _scbgRect(pl, view, s, z, w, h, o) {
  const P = [_scbgOn(pl, s, z, o), _scbgOn(pl, s + w, z, o), _scbgOn(pl, s + w, z + h, o), _scbgOn(pl, s, z + h, o)];
  if (P.some(p => p[2] < view.near)) return null;
  return P.map(view.P);
}
/** The outline of an opening (flat, segmental or round head) as wall-local points. */
function _scbgOpening(e, inset) {
  const i = inset || 0, s = e.s + i, w = e.w - 2 * i, z = e.z + (e.zIn || 0), h = e.h - i;
  if (e.head === 'round') {
    const r = w / 2, zc = z + h - r, pts = [[s, z], [s + w, z]];
    for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI; pts.push([s + r + r * Math.cos(a), zc + r * Math.sin(a)]); }
    return pts;
  }
  if (e.head === 'seg') {
    const rise = Math.min(0.18, w * 0.12), pts = [[s, z], [s + w, z], [s + w, z + h - rise]];
    for (let k = 1; k < 4; k++) { const t = k / 4; pts.push([s + w - w * t, z + h - rise + rise * Math.sin(t * Math.PI)]); }
    pts.push([s, z + h - rise]);
    return pts;
  }
  return [[s, z], [s + w, z], [s + w, z + h], [s, z + h]];
}
const _scbgMap = (pl, view, pts2, o) => { const P = pts2.map(([s, z]) => _scbgOn(pl, s, z, o)); if (P.some(p => p[2] < view.near)) return null; return P.map(view.P); };
/** The tier of an element: the on-screen height of its storey where it stands. */
function _scbgTierAt(ctx, face, e) {
  if (ctx.view.ortho) return Math.min(ctx.tierCap, 3);
  const pl = face.plane, mid = _scbgOn(pl, (e.s != null ? e.s + (e.w || 0) / 2 : ((e.s0 || 0) + (e.s1 || 0)) / 2), e.z || e.z0 || 0, 0);
  const hS = ctx.sp.hs[Math.min(ctx.sp.hs.length - 1, e.storey || 0)] || 3;
  return Math.min(ctx.tierCap, sceneBuildingTier(ctx.view.px(hS, mid)));
}
function _scbgDrawElem(e, face, ctx) {
  const { view, sink, sp, season } = ctx, pl = face.plane, st = sp.style;
  const T = _scbgTierAt(ctx, face, e);
  const wallCol = face.col;
  const add = (layer, pts, f, extra) => { if (pts) sink.add(layer, Object.assign({ f, d: _scbgPath(pts), op: 1, part: 'body' }, extra || {})); };
  switch (e.k) {
    case 'tex': {
      if (T < 3) return;
      _scbgTexture(sp.tex, e, face, ctx, wallCol);
      return;
    }
    case 'panel': {
      add(1, _scbgRect(pl, view, e.s0, e.z0, e.s1 - e.s0, e.z1 - e.z0, 0.005), _scbgSeasonal(_scbgDark(e.col, _scbgFaceShade(face, ctx)), season));
      if (T >= 3 && e.tex) _scbgTexture(e.tex, e, face, ctx, e.col);
      return;
    }
    case 'band': {
      if (T < 1 && (e.z1 - e.z0) < 0.3) return;
      add(e.layer || 2, _scbgRect(pl, view, e.s0, e.z0, e.s1 - e.s0, e.z1 - e.z0, e.o || 0.01), _scbgSeasonal(_scbgDark(e.col, _scbgFaceShade(face, ctx) * 0.6), season), e.op != null ? { op: e.op } : null);
      return;
    }
    case 'rails': {
      if (T < 1) return;
      const segs = [], step = T >= 2 ? 0.13 : 0.4, bw = T >= 2 ? 0.025 : 0.05;
      for (let s = e.s0; s < e.s1; s += step) { if (e.gap && s > e.gap[0] && s < e.gap[0] + e.gap[1]) continue; const p = _scbgRect(pl, view, s, e.z0, bw, e.z1 - e.z0, 0); if (p) segs.push(_scbgPath(p)); }
      const top = _scbgRect(pl, view, e.s0, e.z1 - 0.12, e.s1 - e.s0, 0.035, 0); if (top) segs.push(_scbgPath(top));
      if (segs.length) sink.add(5, { f: '#1c1f22', d: segs.join(''), op: 1, part: 'body' });
      return;
    }
    case 'gate': {
      const g = _scbgRect(pl, view, e.s, 0, e.w, e.z1, 0.01);
      if (!g) return;
      sink.add(3, { f: _scbgDark(face.col, 0.5), d: _scbgPath(g), op: 0.9, part: 'body' });
      if (T >= 2) {
        // a sunrise gate: bars fanning from the bottom centre (or upright pales)
        const segs = [], cs = e.s + e.w / 2;
        if (e.type === 'sunrise') for (let k = 0; k <= 6; k++) { const a = Math.PI * k / 6, tx = cs + Math.cos(a) * e.w * 0.48, tz = 0.12 + Math.sin(a) * (e.z1 - 0.2); const p = _scbgMap(pl, view, [[cs - 0.015, 0.1], [cs + 0.015, 0.1], [tx + 0.015, tz], [tx - 0.015, tz]], 0.02); if (p) segs.push(_scbgPath(p)); }
        else for (let s = e.s + 0.06; s < e.s + e.w - 0.04; s += 0.12) { const p = _scbgRect(pl, view, s, 0.1, 0.04, e.z1 - 0.18, 0.02); if (p) segs.push(_scbgPath(p)); }
        const rail = _scbgRect(pl, view, e.s, e.z1 - 0.1, e.w, 0.05, 0.02); if (rail) segs.push(_scbgPath(rail));
        if (segs.length) sink.add(5, { f: '#2a3a2e', d: segs.join(''), op: 1, part: 'body' });
      }
      return;
    }
    case 'quoins': {
      if (T < 2) return;
      const segs = [], h = 0.3;
      for (let z = 0.35, k = 0; z < e.z1 - 0.2; z += h, k++) for (const [s, w] of [[0, k % 2 ? 0.25 : 0.45], [e.len - (k % 2 ? 0.25 : 0.45), k % 2 ? 0.25 : 0.45]]) { const p = _scbgRect(pl, view, s, z, w, h - 0.03, 0.01); if (p) segs.push(_scbgPath(p)); }
      if (segs.length) sink.add(2, { f: _scbgDark(sp.dress, _scbgFaceShade(face, ctx) * 0.6), d: segs.join(''), op: 1, part: 'body' });
      return;
    }
    case 'pipe': {
      if (T < 2) return;
      add(7, _scbgRect(pl, view, e.s - 0.05, e.z0, 0.1, e.z1 - e.z0, 0.06), '#2a2c30', { detail: true });
      return;
    }
    case 'ivy': {
      // a climbing patch: a ragged crown of leaf clumps over a denser base, from the ground up the wall (bare stems in winter)
      if (T < 1) return;
      const C = { spring: ['#4e7e32', '#6a9a3e'], summer: ['#2c5426', '#3e6a2e'], autumn: ['#8a2e1a', '#b4482a'], winter: ['#5a4a3a', '#6a5a48'] }[season] || ['#2c5426', '#3e6a2e'];
      const r = sceneRnd(sceneHash('ivy|' + sp.seed + '|' + e.s)), H = e.z1 - e.z0, n = Math.max(6, Math.round(e.w / 0.25));
      const top = [];
      for (let k = 0; k <= n; k++) { const u = k / n, h = H * (0.35 + 0.65 * Math.pow(Math.sin(u * Math.PI), 0.6)) * (0.8 + r() * 0.2); top.push([e.s + e.w * u, e.z0 + h], [e.s + e.w * (u + 0.5 / n), e.z0 + h * (0.9 + r() * 0.08)]); }
      top.length = top.length - 1;
      const base = _scbgMap(pl, view, [[e.s, e.z0], [e.s + e.w, e.z0]].concat(top.reverse()), 0.05);
      if (base) add(7, base, C[0], { op: season === 'winter' ? 0.35 : 0.95 });
      if (T >= 2 && season !== 'winter') {
        const segs = [];
        for (let k = 0; k < Math.min(26, n * 3); k++) {
          const cs = e.s + 0.1 + r() * (e.w - 0.2), u = (cs - e.s) / e.w, zmax = H * (0.3 + 0.6 * Math.pow(Math.sin(u * Math.PI), 0.6)), cz = e.z0 + r() * zmax, rr = 0.08 + r() * 0.1;
          const q = _scbgMap(pl, view, [[cs - rr, cz], [cs, cz - rr * 0.8], [cs + rr, cz], [cs, cz + rr]], 0.06); if (q) segs.push(_scbgPath(q));
        }
        if (segs.length) sink.add(7, { f: C[1], d: segs.join(''), op: 0.9, part: 'body', detail: true });
      }
      return;
    }
    case 'alarm': {
      if (T < 2) return;
      const b = _scbgRect(pl, view, e.s, e.z, 0.32, 0.42, 0.08);
      if (b) sink.add(7, { f: e.col, d: _scbgPath(b), op: 1, part: 'body', detail: true });
      return;
    }
    case 'win': return _scbgDrawWin(e, face, ctx, T);
    case 'door': return _scbgDrawDoor(e, face, ctx, T);
    case 'shop': return _scbgDrawShop(e, face, ctx, T);
    case 'grid': {
      if (T < 1) return;
      const segs = [], mw = (e.s1 - e.s0) / e.n, bw = T >= 2 ? 0.08 : 0.12;
      for (let i = 0; i <= e.n; i++) { const p = _scbgRect(pl, view, e.s0 + i * mw - bw / 2, 0, bw, e.z1, 0.03); if (p) segs.push(_scbgPath(p)); }
      for (const z of e.zs) { const p = _scbgRect(pl, view, e.s0, z - bw / 2, e.s1 - e.s0, bw, 0.03); if (p) segs.push(_scbgPath(p)); }
      if (segs.length) sink.add(6, { f: _scbgDark(e.col, _scbgFaceShade(face, ctx)), d: segs.join(''), op: 1, part: 'body' });
      return;
    }
    case 'core': {
      const p = _scbgRect(pl, view, e.s, e.z0, e.w, e.z1 - e.z0, 0.02);
      if (p) sink.add(9, { f: SCENE_GEN_NIGHT.core, d: _scbgPath(p), op: 0.55, part: 'lit' });
      return;
    }
    default: return;
  }
}
/** Wall texture hints at tier 3: brick courses, stone courses and joints, flint knaps, render, pebbledash, board marks, tile-hanging. */
function _scbgTexture(kind, e, face, ctx, col) {
  const { view, sink, sp } = ctx, pl = face.plane, segs = [], r = sceneRnd(sceneHash('tex|' + sp.seed + '|' + face.edge + '|' + kind));
  const s0 = e.s0 != null ? e.s0 : 0, s1 = e.s1 != null ? e.s1 : pl.len, z0 = e.z0 || 0, z1 = e.z1;
  const line = (sa, za, sb, zb, th) => { const p = _scbgMap(pl, view, [[sa, za], [sb, zb], [sb, zb + th], [sa, za + th]], 0.003); if (p) segs.push(_scbgPath(p)); };
  let tone = _scbgDark(col, 0.22), op = 0.32;
  if (kind === 'brick' || kind === 'tile') {
    const step = kind === 'tile' ? 0.18 : 0.3;
    for (let z = z0 + step; z < z1 - 0.05 && segs.length < 40; z += step) line(s0, z, s1, z, 0.022);
    tone = kind === 'tile' ? _scbgDark(col, 0.3) : _scbgLight(sp.mortar, 0.1); op = kind === 'tile' ? 0.4 : 0.28;
  } else if (kind === 'stone') {
    for (let z = z0 + 0.32; z < z1 - 0.05 && segs.length < 60; z += 0.28 + r() * 0.14) {
      line(s0, z, s1, z, 0.03);
      for (let s = s0 + r() * 0.6; s < s1 - 0.2 && segs.length < 60; s += 0.5 + r() * 0.5) line(s, z - 0.25, s + 0.03, z - 0.25, 0.25);
    }
    tone = _scbgDark(col, 0.28); op = 0.4;
  } else if (kind === 'flint') {
    const n = Math.min(70, Math.round((s1 - s0) * (z1 - z0) * 2.2));
    for (let i = 0; i < n; i++) {
      const s = s0 + r() * (s1 - s0 - 0.2), z = z0 + r() * (z1 - z0 - 0.2), a = 0.07 + r() * 0.08, b = 0.06 + r() * 0.06;
      const p = _scbgMap(pl, view, [[s, z + b * 0.5], [s + a * 0.5, z], [s + a, z + b * 0.4], [s + a * 0.6, z + b]], 0.004); if (p) segs.push(_scbgPath(p));
    }
    tone = r() < 0.5 ? '#c9ccc8' : '#d6d4cc'; op = 0.42;
  } else if (kind === 'pebbledash' || kind === 'render' || kind === 'stucco') {
    if (kind === 'stucco') { for (let z = z0 + 0.38; z < Math.min(z1, z0 + 3) - 0.05; z += 0.38) line(s0, z, s1, z, 0.03); tone = _scbgDark(col, 0.18); op = 0.4; }
    else if (kind === 'pebbledash') { const n = Math.min(60, Math.round((s1 - s0) * (z1 - z0) * 1.5)); for (let i = 0; i < n; i++) { const s = s0 + r() * (s1 - s0 - 0.05), z = z0 + r() * (z1 - z0 - 0.05); line(s, z, s + 0.05, z, 0.05); } tone = _scbgDark(col, 0.25); op = 0.35; }
    else return;
  } else if (kind === 'concrete') {
    for (let z = z0 + 0.6; z < z1 - 0.05 && segs.length < 40; z += 0.6) line(s0, z, s1, z, 0.02);
    for (let s = s0 + 1.2; s < s1 - 0.05 && segs.length < 80; s += 1.2) line(s, z0, s + 0.02, z0, z1 - z0);
    tone = _scbgDark(col, 0.2); op = 0.3;
  } else return;
  if (segs.length) sink.add(1, { f: tone, d: segs.join(''), op, part: 'body', detail: true });
}
/** The window kind at night for element e (seeded): 'window' warm, 'curtain' drawn curtains, 'tv' a blue room. */
function _scbgGlowOf(sp, e, face) {
  const r = sceneRnd(sceneHash('glow|' + sp.seed + '|' + (face.edge || 0) + '|' + _scbgR1(e.s) + '|' + _scbgR1(e.z)));
  const a = r(), theta = (Math.floor(r() * 8) + 0.5) / 8;   // 8 buckets, exact in binary (windows merge per bucket)
  return { kind: e.shopGlass ? 'shop' : a < sp.tv ? 'tv' : a < sp.tv + sp.curtain ? 'curtain' : 'window', theta, refl: r() };
}
function _scbgDrawWin(e, face, ctx, T) {
  const { view, sink, sp, season } = ctx, pl = face.plane, st = sp.style, wn = st.win || {};
  const shade = _scbgFaceShade(face, ctx);
  const gl = _scbgGlowOf(sp, e, face), glassCol = _scbgMix(sp.glass, '#9fb0c0', gl.refl * 0.22);
  const outline = _scbgOpening(e);
  if (T === 0) {
    const p = _scbgMap(pl, view, outline, 0);
    if (p && ctx.debug) ctx.debug.windows.push({ edge: face.edge, role: face.role, quad: p, theta: gl.theta, kind: gl.kind, tier: 0 });
    if (p) sink.add(4, { f: glassCol, d: _scbgPath(p), op: 0.85, part: 'body', glow: gl.kind, theta: gl.theta });
    return;
  }
  const open = _scbgMap(pl, view, outline, 0);
  if (!open) return;
  if (ctx.debug) ctx.debug.windows.push({ edge: face.edge, role: face.role, quad: open, theta: gl.theta, kind: gl.kind, tier: T });
  if (T >= 2 && !e.glassOnly) {
    // surround or dressing (stone, brick quoins round flint), then the reveal (the shadowed depth of the opening)
    if (wn.surround || st.surround) { const sur = _scbgMap(pl, view, _scbgOpening(Object.assign({}, e, { s: e.s - 0.1, w: e.w + 0.2, z: e.z - 0.05, h: e.h + 0.17 })), 0.004); if (sur) sink.add(2, { f: _scbgDark(sp.dress, shade * 0.6), d: _scbgPath(sur), op: 1, part: 'body' }); }
    sink.add(3, { f: _scbgDark(_scbgMix(face.col, '#1a1c20', 0.55), shade), d: _scbgPath(open), op: 1, part: 'body' });
  }
  // glass: set back in the reveal, clipped to the opening (perspective shows the reveal on one side)
  let glass = open;
  if (T >= 2 && !view.ortho && e.recess > 0.02) { const g = _scbgMap(pl, view, _scbgOpening(e, 0.02), -e.recess); glass = g ? _scbgClip2(g, open) || open : open; }
  else if (T >= 2 && view.ortho && !e.glassOnly) glass = _scbgMap(pl, view, _scbgOpening(Object.assign({}, e, { h: e.h - 0.06 }), 0.03), 0) || open;
  sink.add(4, { f: glassCol, d: _scbgPath(glass), op: 1, part: 'body', glow: e.shopGlass ? 'shop' : gl.kind, theta: gl.theta });
  if (T >= 3 && e.type !== 'curtain' && !e.glassOnly) {
    // a sky reflection across the upper panes, and curtains at the sides (by day)
    const rf = _scbgMap(pl, view, [[e.s + e.w * 0.1, e.z + e.h * 0.55], [e.s + e.w * 0.55, e.z + e.h * 0.92], [e.s + e.w * 0.85, e.z + e.h * 0.92], [e.s + e.w * 0.3, e.z + e.h * 0.55]], -e.recess * 0.9);
    if (rf) sink.add(5, { f: '#c8d6e2', d: _scbgPath(rf), op: 0.18, part: 'body', detail: true });
    if (gl.kind === 'curtain') { const cw = e.w * 0.18, cc = ['#c9b48a', '#8a5a4a', '#d8d0c0', '#6a7a8a'][sp.seed % 4]; for (const s of [e.s + 0.06, e.s + e.w - 0.06 - cw]) { const p = _scbgMap(pl, view, [[s, e.z + 0.08], [s + cw, e.z + 0.08], [s + cw, e.z + Math.min(e.h - 0.1, e.h * 0.92)], [s, e.z + Math.min(e.h - 0.1, e.h * 0.92)]], -e.recess * 0.8); if (p) sink.add(5, { f: cc, d: _scbgPath(p), op: 0.85, part: 'body', detail: true }); } }
  }
  if (T >= 2 && e.type !== 'curtain') {
    // frame and glazing bars (as thin quads on the glass plane), by window type
    const fr = e.frame || (e.type === 'metal' ? '#2e3236' : sp.frame), o = view.ortho ? 0 : -e.recess * 0.95, segs = [];
    const bar = (sa, za, sb, zb) => { const p = _scbgMap(pl, view, [[sa, za], [sb, za], [sb, zb], [sa, zb]], o); if (p) segs.push(_scbgPath(p)); };
    const s = e.s, z = e.z, w = e.w, h = e.h, t = e.type === 'metal' ? 0.035 : 0.055;
    const top = e.head === 'round' ? h - w / 2 : e.head === 'seg' ? h - 0.12 : h;
    bar(s, z, s + w, z + t); bar(s, z, s + t, z + top); bar(s + w - t, z, s + w, z + top);
    if (e.head === 'flat') bar(s, z + h - t, s + w, z + h);
    const [pc, pr] = e.panes || [2, 1];
    if (e.type === 'sash') {
      const mid = z + top / 2;
      bar(s, mid - 0.04, s + w, mid + 0.04);
      for (let k = 1; k < pc; k++) bar(s + w * k / pc - t / 3, z, s + w * k / pc + t / 3, z + top);
      for (const [za, zb] of [[z, mid], [mid, z + top]]) for (let k = 1; k < pr; k++) { const zz = za + (zb - za) * k / pr; bar(s, zz - t / 3, s + w, zz + t / 3); }
    } else if (e.type === 'leaded') {
      // a casement with a transom; small leaded panes in the upper lights
      const tz = z + top * 0.72;
      bar(s, tz - t / 2, s + w, tz + t / 2);
      for (let k = 1; k < pc; k++) bar(s + w * k / pc - t / 3, z, s + w * k / pc + t / 3, z + top);
      if (T >= 3) { for (let k = 1; k < pc * 2; k++) bar(s + w * k / (pc * 2) - 0.008, tz, s + w * k / (pc * 2) + 0.008, z + top); bar(s, tz + (top - (tz - z)) / 2 - 0.008, s + w, tz + (top - (tz - z)) / 2 + 0.008); }
    } else if (e.type === 'mullion') {
      for (let k = 1; k < pc; k++) { const ms = s + w * k / pc; const p = _scbgMap(pl, view, [[ms - 0.06, z], [ms + 0.06, z], [ms + 0.06, z + top], [ms - 0.06, z + top]], 0.01); if (p) sink.add(6, { f: _scbgDark(sp.dress, shade * 0.6), d: _scbgPath(p), op: 1, part: 'body' }); }
      if (T >= 3) for (let k = 1; k < 3; k++) bar(s, z + top * k / 3 - 0.01, s + w, z + top * k / 3 + 0.01);
    } else {
      for (let k = 1; k < pc; k++) bar(s + w * k / pc - t / 2, z, s + w * k / pc + t / 2, z + top);
      for (let k = 1; k < pr; k++) bar(s, z + top * k / pr - t / 2, s + w, z + top * k / pr + t / 2);
      if (e.type === 'metal' && T >= 3) for (let k = 1; k < 3; k++) bar(s, z + top * (k / 3) * 0.5 + top * 0.5 - 0.012, s + w, z + top * (k / 3) * 0.5 + top * 0.5 + 0.012);
    }
    if (segs.length) sink.add(5, { f: _scbgDark(fr, shade * 0.5), d: segs.join(''), op: 1, part: 'body' });
  }
  if (T >= 2 && !e.glassOnly) {
    // sill and lintel (flat stone, gauged brick, a segmental or round arch of voussoirs)
    const sill = _scbgRect(pl, view, e.s - 0.08, e.z - 0.1, e.w + 0.16, 0.1, 0.06);
    if (sill && wn.sill !== false) { sink.add(6, { f: _scbgDark(sp.dress, shade * 0.5), d: _scbgPath(sill), op: 1, part: 'body' }); sink.add(6, { f: '#eef2f6', d: _scbgPath(_scbgRect(pl, view, e.s - 0.08, e.z - 0.005, e.w + 0.16, 0.05, 0.07) || sill), op: 0.9, part: 'snow' }); }
    if (wn.lintel !== false) {
      let lin = null;
      if (e.head === 'flat') lin = _scbgRect(pl, view, e.s - 0.06, e.z + e.h, e.w + 0.12, wn.lintelH || 0.18, 0.02);
      else { const o1 = _scbgOpening(e), o2 = _scbgOpening(Object.assign({}, e, { s: e.s - 0.14, w: e.w + 0.28, h: e.h + 0.14 })); const top1 = o1.slice(2), top2 = o2.slice(2).reverse(); lin = _scbgMap(pl, view, top1.concat(top2), 0.02); }
      if (lin) sink.add(6, { f: _scbgDark(wn.lintelCol === 'wall' ? _scbgLight(face.col, 0.08) : sp.dress, shade * 0.6), d: _scbgPath(lin), op: 1, part: 'body' });
    }
    if (T >= 3 && sp.boxes && (season === 'spring' || season === 'summer') && e.storey >= 1 && e.storey <= 2 && e.type !== 'metal') {
      const bx = _scbgRect(pl, view, e.s + 0.02, e.z - 0.02, e.w - 0.04, 0.2, 0.12);
      const fl = _scbgMap(pl, view, [[e.s + 0.02, e.z + 0.18], [e.s + e.w * 0.25, e.z + 0.32], [e.s + e.w * 0.5, e.z + 0.24], [e.s + e.w * 0.75, e.z + 0.34], [e.s + e.w - 0.02, e.z + 0.18]], 0.13);
      if (bx) sink.add(7, { f: '#4a3a2a', d: _scbgPath(bx), op: 1, part: 'body', detail: true });
      if (fl) sink.add(7, { f: season === 'spring' ? '#e8c84a' : '#c8384a', d: _scbgPath(fl), op: 1, part: 'body', detail: true });
    }
  }
}
function _scbgDrawDoor(e, face, ctx, T) {
  const { view, sink, sp } = ctx, pl = face.plane, st = sp.style, shade = _scbgFaceShade(face, ctx);
  const outline = _scbgOpening(Object.assign({}, e, { head: e.head || 'flat' }));
  const open = _scbgMap(pl, view, outline, 0);
  if (!open) return;
  if (T >= 2 && e.case) {
    // a doorcase: pilasters and an entablature (Georgian)
    const c = _scbgMap(pl, view, [[e.s - 0.32, e.z], [e.s + e.w + 0.32, e.z], [e.s + e.w + 0.32, e.z + e.h + 0.75], [e.s - 0.32, e.z + e.h + 0.75]], 0.04);
    if (c) sink.add(2, { f: _scbgDark(sp.dress, shade * 0.5), d: _scbgPath(c), op: 1, part: 'body' });
  }
  if (T >= 1) sink.add(3, { f: _scbgDark(_scbgMix(face.col, '#1a1c20', 0.6), shade), d: _scbgPath(open), op: 1, part: 'body' });
  const fanH = e.fan ? Math.min(0.5, e.h * 0.22) : 0, leafH = e.h - fanH - 0.04;
  const o = view.ortho ? 0 : -(e.recess || 0.15);
  const leafPts = _scbgMap(pl, view, [[e.s + 0.04, e.z], [e.s + e.w - 0.04, e.z], [e.s + e.w - 0.04, e.z + leafH], [e.s + 0.04, e.z + leafH]], o);
  let leaf = leafPts ? (view.ortho ? leafPts : _scbgClip2(leafPts, open) || leafPts) : null;
  const col = e.col || sp.door;
  if (e.glass) {
    if (leaf) sink.add(4, { f: _scbgMix(sp.glass, '#9fb0c0', 0.15), d: _scbgPath(leaf), op: 1, part: 'body', glow: 'shop', theta: 0.0625 });
  } else if (leaf) sink.add(7, { f: _scbgDark(col, shade * 0.6), d: _scbgPath(leaf), op: 1, part: 'body' });
  if (e.fan && T >= 1) {
    const fan = _scbgMap(pl, view, e.head === 'round' ? _scbgOpening(Object.assign({}, e, { z: e.z + leafH + 0.04, h: e.h - leafH - 0.04 })) : [[e.s + 0.04, e.z + leafH + 0.04], [e.s + e.w - 0.04, e.z + leafH + 0.04], [e.s + e.w - 0.04, e.z + e.h - 0.03], [e.s + 0.04, e.z + e.h - 0.03]], o);
    if (fan) sink.add(4, { f: _scbgMix(sp.glass, '#9fb0c0', 0.25), d: _scbgPath(fan), op: 1, part: 'body', glow: 'window', theta: 0.1875 });
  }
  if (T >= 3 && leaf && !e.glass) {
    const segs = [];
    if (e.planks) { for (let k = 1; k < 6; k++) { const p = _scbgMap(pl, view, [[e.s + e.w * k / 6 - 0.012, e.z + 0.05], [e.s + e.w * k / 6 + 0.012, e.z + 0.05], [e.s + e.w * k / 6 + 0.012, e.z + leafH - 0.05], [e.s + e.w * k / 6 - 0.012, e.z + leafH - 0.05]], o); if (p) segs.push(_scbgPath(p)); } }
    else if (e.panels) {
      const cols = e.panels >= 4 ? 2 : 1, rows = e.panels >= 4 ? 2 : Math.max(1, e.panels);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const pw = (e.w - 0.2) / cols, ph = (leafH - 0.3) / rows, s = e.s + 0.1 + i * pw + 0.05, z = e.z + 0.15 + j * ph + 0.06;
        const p = _scbgMap(pl, view, [[s, z], [s + pw - 0.1, z], [s + pw - 0.1, z + ph - 0.12], [s, z + ph - 0.12]], o); if (p) segs.push(_scbgPath(p));
      }
    }
    if (segs.length) sink.add(7, { f: _scbgDark(col, 0.28), d: segs.join(''), op: 0.8, part: 'body', detail: true });
    const knob = _scbgMap(pl, view, [[e.s + e.w * 0.78, e.z + 1.0], [e.s + e.w * 0.78 + 0.05, e.z + 1.0], [e.s + e.w * 0.78 + 0.05, e.z + 1.05], [e.s + e.w * 0.78, e.z + 1.05]], o);
    if (knob && !e.planks) sink.add(8, { f: '#c8a850', d: _scbgPath(knob), op: 1, part: 'body', detail: true });
  }
  if (T >= 2 && st.door && st.door.step !== false && !e.loading) { const stp = _scbgRect(pl, view, e.s - 0.1, 0, e.w + 0.2, Math.max(0.05, e.z), 0.25); if (stp && e.z > 0.05) sink.add(7, { f: '#a8a49a', d: _scbgPath(stp), op: 1, part: 'body' }); }
  if (T >= 2 && (e.head || 'flat') === 'flat' && !e.case && !e.glass && !(st.door && st.door.lintel === false)) {
    const lin = _scbgRect(pl, view, e.s - 0.06, e.z + e.h, e.w + 0.12, 0.18, 0.02);
    if (lin) sink.add(6, { f: _scbgDark(sp.dress, shade * 0.6), d: _scbgPath(lin), op: 1, part: 'body' });
  }
}
function _scbgDrawShop(e, face, ctx, T) {
  const { view, sink, sp, season } = ctx, pl = face.plane, shade = _scbgFaceShade(face, ctx), col = e.col;
  const add = (l, pts, f, x) => { if (pts) sink.add(l, Object.assign({ f, d: _scbgPath(pts), op: 1, part: 'body' }, x || {})); };
  const s = e.s, w = e.w, fz = e.h - e.fascia;
  // pilasters, fascia (a board for the sign), stall riser, the shop window, a recessed door
  add(2, _scbgRect(pl, view, s, 0, w, e.h, 0.04), _scbgDark(col, shade * 0.6));
  add(6, _scbgRect(pl, view, s - 0.05, fz, w + 0.1, e.fascia, 0.08), _scbgDark(_scbgMix(col, '#000000', 0.1), shade * 0.4));
  if (T >= 2) add(6, _scbgRect(pl, view, s - 0.1, e.h - 0.08, w + 0.2, 0.1, 0.12), _scbgLight(col, 0.2));
  const gs = s + e.pil, gw = w - 2 * e.pil, dW = Math.min(1.0, gw * 0.3), dS = sp.doorSide === 'left' ? gs + gw - dW - 0.1 : gs + 0.1;
  const glassZ = e.riser, glassH = fz - 0.12 - e.riser;
  const gl = _scbgGlowOf(sp, { s, z: 0 }, face);
  const panes = [[gs, dS - 0.02], [dS + dW + 0.02, gs + gw]].filter(([a, b]) => b - a > 0.2);
  for (const [a, b] of panes) {
    add(3, _scbgRect(pl, view, a, glassZ, b - a, glassH, 0.01), _scbgDark(col, 0.45));
    const g = view.ortho ? _scbgRect(pl, view, a + 0.05, glassZ + 0.05, b - a - 0.1, glassH - 0.1, 0) : _scbgRect(pl, view, a + 0.05, glassZ + 0.05, b - a - 0.1, glassH - 0.1, -0.08);
    add(4, g, _scbgMix(sp.glass, '#a8b8c4', 0.2), { glow: 'shop', theta: gl.theta * 0.5 });
    if (T >= 2) for (let k = 1; k < Math.max(2, Math.round((b - a) / 1.2)); k++) { const m = a + (b - a) * k / Math.max(2, Math.round((b - a) / 1.2)); add(5, _scbgRect(pl, view, m - 0.04, glassZ, 0.08, glassH, 0.02), _scbgDark(col, shade * 0.5)); }
    const lit = _scbgRect(pl, view, a + 0.05, glassZ + 0.05, b - a - 0.1, glassH - 0.1, 0.0);
    if (lit) sink.add(9, { f: { lin: [[0, '#fff2d0', 0.75], [1, '#ffd890', 0.35]], x1: lit[3][0], y1: lit[3][1], x2: lit[0][0], y2: lit[0][1] }, d: _scbgPath(lit), op: 0.8, part: 'lit' });
  }
  add(3, _scbgRect(pl, view, dS, 0.02, dW, fz - 0.15, 0.01), _scbgDark(col, 0.55));
  add(7, _scbgRect(pl, view, dS + 0.05, 0.02, dW - 0.1, fz - 0.3, view.ortho ? 0 : -0.5), _scbgMix(sp.glass, '#9fb0c0', 0.15), { glow: 'shop', theta: 0.0625 });
  if (T >= 3) { const fl = _scbgRect(pl, view, s + e.pil, fz + 0.12, w - 2 * e.pil, e.fascia - 0.24, 0.085); if (fl) add(7, fl, _scbgLight(col, 0.08), { op: 0.5, detail: true }); }
  if (e.awning && T >= 1) {
    const a = _scbgMap(pl, view, [[gs, fz - 0.05], [gs + gw, fz - 0.05], [gs + gw, fz - 0.65], [gs, fz - 0.65]], 0.6);
    if (a) add(8, a, ['#2a5a4a', '#8a2a2a', '#2a3a6a', '#6a5a2a'][sp.seed % 4]);
  }
  // snow on the fascia top
  const sn = _scbgRect(pl, view, s - 0.1, e.h - 0.02, w + 0.2, 0.06, 0.13); if (sn) sink.add(6, { f: '#eef2f6', d: _scbgPath(sn), op: 0.9, part: 'snow' });
  e.fasciaBox = [s + e.pil, fz, w - 2 * e.pil, e.fascia];
  void season;
}

/* ---------- protrusions: bays, canopies, slabs, cantilevers, chimney stacks ---------- */
/** The faces of a convex block: a footprint [[x, d]] (counter-clockwise), bottom heights per corner, a top height. */
function _scbgBlockFaces(foot, z0, z1, col, topCol, part, bottomCol) {
  const faces = [], n = foot.length, zz = Array.isArray(z0) ? z0 : foot.map(() => z0);
  const ccw = _scbgArea2(foot) >= 0 ? foot : foot.slice().reverse(), zc = _scbgArea2(foot) >= 0 ? zz : zz.slice().reverse();
  for (let i = 0; i < n; i++) {
    const a = ccw[i], b = ccw[(i + 1) % n], pl = _scbgWallPlane(a, b);
    if (pl.len < 1e-3) continue;
    faces.push({ poly: [[a[0], zc[i], a[1]], [b[0], zc[(i + 1) % n], b[1]], [b[0], z1, b[1]], [a[0], z1, a[1]]], n: pl.N, part, role: 'block', plane: pl, col, elems: [] });
  }
  if (topCol) faces.push({ poly: ccw.map(p => [p[0], z1, p[1]]), n: [0, 1, 0], part, role: 'top', col: topCol, elems: [] });
  if (bottomCol) faces.push({ poly: ccw.slice().reverse().map((p, i) => [p[0], zc[(n - 1 - i)], p[1]]), n: [0, -1, 0], part, role: 'bottom', col: bottomCol, elems: [] });
  return faces;
}
/** Expand a front-wall block (wall-local s, o, z) into faces with their elements, through the wall plane. */
function _scbgBlock(bk, wall, sp, model) {
  const pl = wall.plane, W = (s, o) => { const p = _scbgOn(pl, s, 0, o); return [p[0], p[2]]; };
  const st = sp.style, faces = [];
  if (bk.kind === 'bay') {
    const d = bk.depth, s0 = bk.s0, s1 = bk.s1, k = bk.shape === 'square' ? 0 : Math.min(d * 0.9, (s1 - s0) * 0.3);
    const arc = [];
    if (bk.shape === 'curved') for (let i = 0; i <= 6; i++) { const a = Math.PI * i / 6; arc.push(W((s0 + s1) / 2 + Math.cos(a) * (s1 - s0) / 2, Math.sin(a) * d)); }
    const base = bk.shape === 'square' ? [W(s0, 0), W(s1, 0), W(s1, d), W(s0, d)] : bk.shape === 'curved' ? arc : [W(s0, 0), W(s1, 0), W(s1 - k, d), W(s0 + k, d)];
    // the bay's faces are walls (with their own windows): the shape is the bay's outline, read back as counter-clockwise from the wall
    const ccw = _scbgArea2(base) >= 0 ? base : base.slice().reverse();
    const fs = _scbgBlockFaces(ccw, bk.z0, bk.z1, sp.wall, null, 'wall');
    for (const f of fs) {
      // skip the face lying on the wall itself
      if (_scbgDot(f.n, pl.N) < -0.9) continue;
      f.role = 'bay'; f.dark = 0.02;
      for (let fl = 0; fl < bk.floors; fl++) {
        const zA = sp.zs[fl], zB = sp.zs[fl + 1] - (fl === bk.floors - 1 ? 0.1 : 0), wl = f.plane.len;
        if (wl < 0.35) continue;
        const ww = Math.max(0.3, wl - 0.22), wz = zA + (fl === 0 ? 0.55 : 0.75);
        f.elems.push({ k: 'win', s: (wl - ww) / 2, z: wz, w: ww, h: Math.max(0.6, zB - wz - 0.45), type: (st.win && st.win.bayType) || (st.win && st.win.type) || 'sash', panes: (st.win && st.win.bayPanes) || [1, 1], head: 'flat', recess: 0.06, storey: fl });
        f.elems.push({ k: 'band', s0: 0, s1: wl, z0: zA + 0.05, z1: zA + 0.45, col: _scbgDark(sp.wall, 0.08), layer: 2 });
      }
      faces.push(f);
    }
    // the bay's lid: a small hipped roof (or a gable over it, Edwardian)
    const zt = bk.z1, ri = 0.45;
    const lidPts = ccw.map(p => [p[0], zt, p[1]]);
    if (bk.lid === 'gable') {
      // a gable over the bay: two slopes on a ridge square to the wall, the gable face flush with the bay's front
      const m = (s0 + s1) / 2, zr = zt + (s1 - s0) * 0.45, dd = d + 0.08, X = (s, o, z) => { const p = W(s, o); return [p[0], z, p[1]]; };
      const L = [X(s0 - 0.1, 0, zt), X(s0 - 0.1, dd, zt), X(m, dd, zr), X(m, 0, zr)], R = [X(m, 0, zr), X(m, dd, zr), X(s1 + 0.1, dd, zt), X(s1 + 0.1, 0, zt)];
      faces.push({ poly: L, n: _scbgNormal(L), part: 'roof', role: 'roof', col: sp.roofCol, elems: [] }, { poly: R, n: _scbgNormal(R), part: 'roof', role: 'roof', col: sp.roofCol, elems: [] });
      const G = [X(s0, dd - 0.02, zt), X(s1, dd - 0.02, zt), X(m, dd - 0.02, zr - 0.12)];
      faces.push({ poly: G, n: [pl.N[0], 0, pl.N[2]], part: 'wall', role: 'gable', col: sp.wall2 || _scbgLight(sp.wall, 0.08), elems: [] });
    } else {
      const top = [W(s0 + 0.05, 0), W(s1 - 0.05, 0)];
      const apex = [[top[0][0], zt + ri, top[0][1]], [top[1][0], zt + ri, top[1][1]]];
      for (let i = 0; i < lidPts.length; i++) {
        const a = lidPts[i], b = lidPts[(i + 1) % lidPts.length];
        const onWall = Math.abs((a[0] - pl.O[0]) * pl.N[0] + (a[2] - pl.O[2]) * pl.N[2]) < 0.02 && Math.abs((b[0] - pl.O[0]) * pl.N[0] + (b[2] - pl.O[2]) * pl.N[2]) < 0.02;
        if (onWall) continue;
        const sa = (a[0] - pl.O[0]) * pl.U[0] + (a[2] - pl.O[2]) * pl.U[2], sb = (b[0] - pl.O[0]) * pl.U[0] + (b[2] - pl.O[2]) * pl.U[2];
        const pa = sa <= (s0 + s1) / 2 ? apex[0] : apex[1], pb = sb <= (s0 + s1) / 2 ? apex[0] : apex[1];
        const poly = pa === pb ? [a, b, pa] : [a, b, pb, pa];
        faces.push({ poly, n: _scbgNormal(poly), part: 'roof', role: 'roof', col: sp.roofCol, elems: [] });
      }
    }
    return faces;
  }
  if (bk.kind === 'canopy') {
    // a lean-to canopy off the wall (a porch hood, a station canopy with a valance and posts)
    const a = W(bk.s0, 0), b = W(bk.s1, 0), c = W(bk.s1, bk.out), d = W(bk.s0, bk.out), zw = bk.z + Math.min(0.6, bk.out * 0.18), zo = bk.z;
    const top = [[a[0], zw, a[1]], [b[0], zw, b[1]], [c[0], zo, c[1]], [d[0], zo, d[1]]];
    faces.push({ poly: top, n: _scbgNormal(top), part: 'roof', role: 'roof', col: bk.col, elems: [] });
    const under = top.slice().reverse().map(p => [p[0], p[1] - 0.06, p[2]]);
    faces.push({ poly: under, n: _scbgMul(_scbgNormal(top), -1), part: 'body', role: 'bottom', col: _scbgDark(bk.col, 0.35), elems: [] });
    if (bk.valance) {
      const vh = 0.55, pl2 = _scbgWallPlane(d, c);
      const n = Math.max(4, Math.round((bk.s1 - bk.s0) / 0.3)), pts = [[d[0], zo, d[1]], [c[0], zo, c[1]]];
      for (let i = n; i >= 0; i--) { const t = i / n, x = d[0] + (c[0] - d[0]) * t, dd = d[1] + (c[1] - d[1]) * t; pts.push([x, zo - (i % 2 ? vh : vh * 0.62), dd]); }
      faces.push({ poly: pts, n: pl2.N, part: 'body', role: 'valance', col: '#e8e4d8', elems: [], flat: true });
      // posts
      for (let i = 0; i < (bk.posts || 2); i++) {
        const s = bk.s0 + 0.3 + (bk.s1 - bk.s0 - 0.6) * (i / Math.max(1, (bk.posts || 2) - 1));
        const pf = [W(s - 0.09, bk.out - 0.35), W(s + 0.09, bk.out - 0.35), W(s + 0.09, bk.out - 0.17), W(s - 0.09, bk.out - 0.17)];
        faces.push(..._scbgBlockFaces(pf, 0, zo - 0.2, '#4a5a52', null, 'body'));
      }
      faces.push({ poly: _scbgCanopyLamp(W, bk), n: pl2.N, part: 'lit', role: 'lamps', col: '#fff1c8', elems: [], flat: true, lit: true });
    }
    return faces;
  }
  if (bk.kind === 'fence') {
    // a front boundary: a low wall, or railings on a plinth, with a gate (a sunrise gate for the 1930s), parallel to the wall
    const a = W(bk.s0, bk.out), c = W(bk.s1, bk.out), pf = _scbgWallPlane(a, c), F = { poly: [[a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], bk.h, c[1]], [a[0], bk.h, a[1]]], n: pf.N, part: 'body', role: 'fence', plane: pf, col: bk.col, elems: [], flat: false };
    if (bk.type === 'railing') { F.poly = [[a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], 0.35, c[1]], [a[0], 0.35, a[1]]]; F.elems.push({ k: 'rails', s0: 0.05, s1: pf.len - 0.05, z0: 0.35, z1: bk.h, gap: bk.gate }); }
    else { F.elems.push({ k: 'band', s0: -0.05, s1: pf.len + 0.05, z0: bk.h - 0.08, z1: bk.h + 0.04, col: _scbgLight(bk.col, 0.15), layer: 2 }); if (bk.gate) F.elems.push({ k: 'gate', s: bk.gate[0], w: bk.gate[1], z1: bk.h + 0.15, type: bk.type }); }
    return [F];
  }
  if (bk.kind === 'pediment') {
    // a gable (pediment) on the wall above the eave, centred; no clock, no lettering
    const m = (bk.s0 + bk.s1) / 2, X = (s, z) => { const p = W(s, 0.05); return [p[0], z, p[1]]; };
    const G = [X(bk.s0, bk.z), X(bk.s1, bk.z), X(m, bk.z + (bk.s1 - bk.s0) * bk.k)];
    const f = { poly: G, n: [pl.N[0], 0, pl.N[2]], part: 'wall', role: 'gable', col: bk.col, elems: [], plane: Object.assign({}, pl, { O: _scbgOn(pl, 0, 0, 0.05) }) };
    f.elems.push({ k: 'win', s: m - 0.55, z: bk.z + 0.4, w: 1.1, h: Math.min(1.4, (bk.s1 - bk.s0) * bk.k * 0.55), head: 'round', type: 'sash', panes: [2, 1], recess: 0.1, storey: 1 });
    const edge = (sa, za, sb, zb) => { const p0 = X(sa, za), p1 = X(sb, zb); return [p0, p1, [p1[0], p1[1] + 0.25, p1[2]], [p0[0], p0[1] + 0.25, p0[2]]]; };
    return [f, { poly: edge(bk.s0 - 0.2, bk.z, m, bk.z + (bk.s1 - bk.s0) * bk.k), n: [pl.N[0], 0, pl.N[2]], part: 'roof', role: 'coping', col: sp.dress, elems: [], flat: true },
      { poly: edge(m, bk.z + (bk.s1 - bk.s0) * bk.k, bk.s1 + 0.2, bk.z), n: [pl.N[0], 0, pl.N[2]], part: 'roof', role: 'coping', col: sp.dress, elems: [], flat: true }];
  }
  if (bk.kind === 'slab') {
    const f = [W(bk.s0, 0), W(bk.s1, 0), W(bk.s1, bk.out), W(bk.s0, bk.out)];
    return _scbgBlockFaces(f, bk.z, bk.z + bk.th, bk.col, _scbgDark(bk.col, 0.1), 'body', _scbgDark(bk.col, 0.3));
  }
  if (bk.kind === 'cantilever') {
    const f = [W(bk.s0, 0), W(bk.s1, 0), W(bk.s1, bk.out), W(bk.s0, bk.out)];
    const fs = _scbgBlockFaces(f, bk.z0, bk.z1, bk.col, null, 'wall', _scbgDark(bk.col, 0.35));
    for (const fc of fs) {
      if (_scbgDot(fc.n, pl.N) < -0.9) continue;
      if (fc.role === 'bottom') { faces.push(fc); continue; }
      fc.role = 'cant';
      const L = fc.plane.len, n = Math.max(1, Math.round(L / ((st.grid && st.grid.col) || 2.4)));
      fc.elems.push({ k: 'tex', s0: 0, s1: L, z0: bk.z0, z1: bk.z1 });
      for (let f = 1; f < sp.storeys; f++) {
        const zA = sp.zs[f], zB = sp.zs[f + 1];
        fc.elems.push({ k: 'band', s0: 0, s1: L, z0: zA + 0.15, z1: zA + 0.85, col: _scbgLight(bk.col, 0.06), layer: 2, o: 0.08 });
        for (let i = 0; i < n; i++) { const cw = L / n; fc.elems.push({ k: 'win', s: cw * i + cw * 0.12, z: zA + 0.95, w: cw * 0.76, h: Math.max(0.6, zB - zA - 1.3), type: 'deep', panes: [2, 1], head: 'flat', recess: 0.45, storey: f }); }
      }
      faces.push(fc);
    }
    return faces;
  }
  return faces;
}
/** The canopy's night lamps: a row of small lit squares under the valance (a 'lit' face). */
function _scbgCanopyLamp(W, bk) {
  const n = Math.max(2, Math.round((bk.s1 - bk.s0) / 3)), pts = [];
  for (let i = 0; i < n; i++) { const s = bk.s0 + (bk.s1 - bk.s0) * (i + 0.5) / n, p = W(s, bk.out - 0.6); pts.push([p[0], bk.z - 0.35, p[1]]); }
  return pts;
}
/** A tapered block (a mill's engine-house chimney): base and top squares, with a dark band near the top. */
function _scbgTower(bk) {
  const [cx, cd] = bk.at, b = bk.base / 2, t = bk.top / 2, faces = [];
  const B = [[cx - b, cd - b], [cx + b, cd - b], [cx + b, cd + b], [cx - b, cd + b]], Tp = [[cx - t, cd - t], [cx + t, cd - t], [cx + t, cd + t], [cx - t, cd + t]];
  for (let i = 0; i < 4; i++) {
    const a = B[i], c = B[(i + 1) % 4], ta = Tp[i], tc = Tp[(i + 1) % 4], pl = _scbgWallPlane(a, c);
    const poly = [[a[0], 0, a[1]], [c[0], 0, c[1]], [tc[0], bk.h, tc[1]], [ta[0], bk.h, ta[1]]], n = _scbgNorm([pl.N[0], (b - t) / bk.h, pl.N[2]]);
    const k = 1 - 1.2 / bk.h, cap = [[a[0] + (ta[0] - a[0]) * k, bk.h * k, a[1] + (ta[1] - a[1]) * k], [c[0] + (tc[0] - c[0]) * k, bk.h * k, c[1] + (tc[1] - c[1]) * k], [tc[0], bk.h, tc[1]], [ta[0], bk.h, ta[1]]];
    faces.push({ poly, n, part: 'body', role: 'tower', col: bk.col, elems: [] }, { poly: cap, n, part: 'body', role: 'tower', col: _scbgDark(bk.col, 0.35), elems: [] });
  }
  return { faces, smoke: [[cx, bk.h, cd]] };
}
/** A chimney stack's faces and its pots. */
function _scbgStack(bk) {
  const faces = _scbgBlockFaces(bk.foot, bk.z0, bk.z1, bk.col, bk.lidCol, 'roof');
  const f = bk.foot, cx = f.reduce((s, p) => s + p[0], 0) / 4, cd = f.reduce((s, p) => s + p[1], 0) / 4;
  const ux = (f[1][0] - f[0][0]), ud = (f[1][1] - f[0][1]), L = Math.hypot(ux, ud) || 1, u = [ux / L, ud / L], v = [-u[1], u[0]];
  const smoke = [];
  for (let i = 0; i < bk.pots; i++) {
    const t = bk.pots === 1 ? 0 : (i / (bk.pots - 1) - 0.5) * (L - 0.32), c = [cx + u[0] * t, cd + u[1] * t], r = 0.11;
    const pf = [[c[0] - u[0] * r - v[0] * r, c[1] - u[1] * r - v[1] * r], [c[0] + u[0] * r - v[0] * r, c[1] + u[1] * r - v[1] * r], [c[0] + u[0] * r + v[0] * r, c[1] + u[1] * r + v[1] * r], [c[0] - u[0] * r + v[0] * r, c[1] - u[1] * r + v[1] * r]];
    faces.push(..._scbgBlockFaces(pf, bk.z1, bk.z1 + 0.42, bk.potCol, _scbgDark(bk.potCol, 0.5), 'roof'));
    smoke.push([c[0], bk.z1 + 0.42, c[1]]);
  }
  return { faces, smoke };
}

/* ---------- the build: model + layout + draw through a view ---------- */
/** Draw a building through a view. Returns the sink plus the smoke anchors, signs (fascia boxes) and the model. */
function _scbgBuild(b, sp, foot, view, opt) {
  const model = _scbgModel(b, sp, foot);
  const ctx = { view, sp, season: opt.season || 'summer', tierCap: opt.tierCap == null ? 3 : opt.tierCap, sink: _scbgSink({ ortho: view.ortho }), debug: opt.debug ? { walls: [], windows: [] } : null };
  const storeyH = sp.hs[Math.min(1, sp.hs.length - 1)] || 3;
  ctx.tier = (poly) => view.ortho ? Math.min(ctx.tierCap, 3) : Math.min(ctx.tierCap, sceneBuildingTier(view.px(storeyH, poly.reduce((a, p) => (p[2] < a[2] ? p : a), poly[0]))));
  const walls = model.faces.filter(f => f.part === 'wall'), roofs = model.faces.filter(f => f.part === 'roof');
  const blockFaces = [], shops = [];
  for (const w of walls) {
    const lay = _scbgLayout(sp, w, model);
    w.elems = lay.elems;
    for (const e of lay.elems) if (e.k === 'shop') shops.push({ e, w });
    if (view.sees(w.n, w.poly[0])) for (const bk of lay.blocks) blockFaces.push({ faces: _scbgBlock(bk, w, sp, model), wall: w });
  }
  // a tier-0 wall: its windows read as a tone band per storey
  const drawFaces = [];
  for (const f of walls) if (view.sees(f.n, f.poly[0])) drawFaces.push(f);
  for (const f of roofs) if (view.sees(f.n, f.poly[0])) drawFaces.push(f);
  // stacks and blocks: far to near (a free-standing tower farther than the building is drawn before it)
  const smoke = [];
  const blocks = [];
  for (const bk of model.blocks) { const s = bk.kind === 'tower' ? _scbgTower(bk) : _scbgStack(bk); blocks.push({ faces: s.faces, dist: _scbgDistOf(s.faces, view), free: bk.kind === 'tower' }); smoke.push(...s.smoke); }
  for (const bf of blockFaces) blocks.push({ faces: bf.faces, dist: _scbgDistOf(bf.faces, view) });
  blocks.sort((a, b) => b.dist - a.dist);
  const hullDist = _scbgDistOf(drawFaces, view);
  const before = blocks.filter(b => b.free && !view.ortho && b.dist > hullDist), after = blocks.filter(b => !before.includes(b));
  const drawBlock = (bl) => {
    ctx.sink.blk = true;
    for (const f of bl.faces) {
      if (f.part === 'lit') {
        // canopy lamps: small lit squares (night only)
        for (const p of f.poly) { const q = view.P(p); if (p[2] < view.near) continue; const r = view.ortho ? 3 : Math.max(0.6, view.px(0.14, p)); ctx.sink.lit.push({ f: SCENE_GEN_NIGHT.lamp, d: _scbgPath([[q[0] - r, q[1] - r], [q[0] + r, q[1] - r], [q[0] + r, q[1] + r], [q[0] - r, q[1] + r]]), op: 1, part: 'lit' }); }
        continue;
      }
      if (f.flat || view.sees(f.n, f.poly[0])) _scbgDrawFace(f, ctx);
    }
    ctx.sink.blk = false;
  };
  for (const bl of before) drawBlock(bl);
  for (const f of drawFaces) _scbgDrawFace(f, ctx);
  for (const bl of after) drawBlock(bl);
  return { sink: ctx.sink, smoke, shops, model, debug: ctx.debug };
}
const _scbgDistOf = (faces, view) => { if (view.ortho) return 0; let s = 0, n = 0; for (const f of faces) for (const p of f.poly) { s += Math.hypot(p[0], p[1] - view.eye, p[2]); n++; } return n ? s / n : 0; };

/* ---------- ELEVATION mode: library objects (19.1) ---------- */
const _scbgObjMemo = new Map();
function _scbgParams(params) {
  const p = Object.assign({}, params || {});
  const st = sceneBuildingStyle(p.style) || sceneBuildingStyle('victorian-terrace');
  const out = { style: st ? st.id : String(p.style || 'victorian-terrace'), seed: (Number(p.seed) || 0) >>> 0 };
  for (const k of ['frontage', 'storeys', 'depth', 'pitch']) if (Number.isFinite(p[k])) out[k] = Math.round(p[k] * 100) / 100;
  for (const k of ['roof', 'party', 'door']) if (typeof p[k] === 'string') out[k] = p[k];
  if (p.shop) out.shop = typeof p.shop === 'object' ? { kind: String(p.shop.kind || 'bakery'), sign: p.shop.sign ? String(p.shop.sign) : undefined, brand: p.shop.brand ? true : undefined } : true;
  if (p.bays === false || p.bays === 0) out.bays = false;
  if (p.snow) out.snow = true;
  if (p.corner) out.corner = true;
  if (Number.isInteger(p.variants)) out.variants = _scbgCl(p.variants, 1, 8);
  return out;
}
/** The elevation drawing of params (variant v adds to the seed), for a season: { parts, real, size, glow } in object-local units. */
function _scbgElevation(p, v, season, tierCap) {
  const b = Object.assign({}, p, { seed: (p.seed + v * 7919) >>> 0 });
  // storeys and frontage come from the BASE seed, so every variant has the same size (real.h is exact)
  const base = sceneBuildingResolve(Object.assign({}, p));
  b.storeys = p.storeys || base.storeys; b.frontage = p.frontage || Math.round(base.frontage * 10) / 10; b.depth = p.depth || Math.round(base.depth * 10) / 10;
  const sp = sceneBuildingResolve(b);
  const W = b.frontage, D = b.depth, foot = [[-W / 2, 0], [W / 2, 0], [W / 2, D], [-W / 2, D]];
  const res = _scbgBuild(b, sp, foot, _scbgOrtho(SCENE_GEN_UPM), { season, tierCap });
  return { res, sp, W, D, H: res.model.H };
}
/**
 * ELEVATION mode (19.1): a facade seen front-on as a library object building.gen-<style>-<hash8>, registered lazily through
 * sceneObjDefine and memoised; the same params always give the same id. Drawn at SCENE_GEN_UPM units per metre, real.h exact,
 * seasonal, parts body / win (the glass: glow) / roof / front (bays, porches, canopies, stacks) / lit / snow (snow only with
 * params.snow, in winter: C's snow-cap pass covers the rest). No v1 ellipse shadow: v2 casts the silhouette (B, 6.2).
 * weight 0, so the archetypes never pick it by kit (the v1 scenes and their compile hashes are untouched).
 */
function sceneBuildingObject(params) {
  const p = _scbgParams(params), key = JSON.stringify(p);
  if (_scbgObjMemo.has(key)) return _scbgObjMemo.get(key);
  const id = 'building.gen-' + p.style.slice(0, 22) + '-' + sceneHash(key).toString(16).padStart(8, '0');
  if (typeof sceneObj === 'function' && sceneObj(id)) { _scbgObjMemo.set(key, id); return id; }
  const probe = _scbgElevation(p, 0, 'summer');
  const st = probe.sp.style, H = probe.H, W = probe.W;
  const variants = p.variants || 4;
  const def = {
    id, category: 'building', size: [Math.max(4, Math.round(W * SCENE_GEN_UPM)), Math.max(4, Math.round(H * SCENE_GEN_UPM))], variants, seasonal: true, shapeBySeason: true,
    flippable: !p.shop && !(st.flippable === false), parts: ['body', 'win', 'roof', 'front', 'lit', 'snow'],
    night: { glow: Object.assign({}, SCENE_GEN_NIGHT), on: probe.sp.on },
    real: { h: Math.round(H * 100) / 100, l: Math.round(W * 100) / 100, w: Math.round(probe.D * 100) / 100 },
    reflect: true, weight: 0, detailPx: 60,
    tags: ['uk', 'kit:urban', 'kit:temperate', 'role:building-mid', 'gen', 'class:building', 'style:' + p.style].concat(p.shop ? ['shop'] : []),
    credit: 'generated: 70-scene-gen-0building.js (' + p.style + ')', gen: p,
    build(v, rnd, ctx) { return _scbgElevationParts(p, v, ctx.season); },
  };
  sceneObjDefine(def);
  _scbgObjMemo.set(key, id);
  return id;
}
function _scbgElevationParts(p, v, season) {
  let tier = 3, out = null;
  for (; tier >= 1; tier--) {
    const el = _scbgElevation(p, v, season, tier);
    out = _scbgPartsOf(el.res.sink, p, season);
    const n = out.body.length + out.win.length + out.roof.length + out.front.length + out.lit.length + out.snow.length;
    if (n <= 600 && JSON.stringify(out).length < 58000) break;
  }
  return out;
}
function _scbgPartsOf(sink, p, season) {
  // body: faces, textures, surrounds, reveals, sills, lintels, doors; win: the glass (glow) and what lies on it (bars, curtains,
  // reflections: layers 4 and 5, inside the openings); roof: roof planes, stacks and what hangs over the glass (awnings)
  // front: everything of the protrusions (bays, porches, canopies, fences, pediments, stacks), after the roof they stand before
  const body = [], win = [], roof = [], front = [];
  for (const sh of sink.shapes) {
    const s = { f: sh.f, d: sh.d, op: sh.op, glow: sh.glow ? (sh.glow === 'core' ? 'window' : sh.glow) : undefined, detail: sh.detail || undefined };
    (sh.blk ? front : sh.part === 'roof' || sh.layer >= 8 ? roof : sh.glow || sh.layer === 4 || sh.layer === 5 ? win : body).push(s);
  }
  const glowN = win.filter(s => s.glow).length + front.filter(s => s.glow).length;
  // a tiny building (a one-room cottage): repeat its panes so the glow rule's four shapes exist (a repeat draws the same pixels)
  const panes = win.concat(front).filter(s => s.glow);
  for (let i = glowN; i < 4 && panes.length; i++) win.push(Object.assign({}, panes[i % panes.length]));
  const lit = sink.lit.map(s => ({ f: s.f, d: s.d, op: s.op }));
  const snow = p.snow && season === 'winter' ? sink.snow.map(s => ({ f: s.f, d: s.d, op: s.op })) : [];
  return { body, win, roof, front, lit, snow };
}
/** The fascia sign of a shop object placed at { x, y, s, layer } (8.3): only with signage, generic words only, never a brand. */
function sceneBuildingObjectSigns(params, place, signage) {
  const p = _scbgParams(params);
  if (!signage || !p.shop || p.shop.brand) return [];
  const text = _scbgSignText(p.shop);
  if (!text) return [];
  const el = _scbgElevation(p, (place && place.variant) | 0, 'summer');
  const sh = el.res.shops[0];
  if (!sh || !sh.e.fasciaBox) return [];
  const [fs, fz, fw, fh] = sh.e.fasciaBox, s = (place && place.s) || 1, W = el.W;
  const x = place.x + (fs - W / 2 + fw / 2) * SCENE_GEN_UPM * s, y = place.y - (fz + fh / 2) * SCENE_GEN_UPM * s;
  return [{ layer: place.layer, x: Math.round(x), y: Math.round(y), w: Math.round(fw * SCENE_GEN_UPM * s * 0.92), h: Math.round(fh * SCENE_GEN_UPM * s * 0.8), text, style: 'fascia', ink: '#f4f1e8', board: '#1d2226' }];
}
/** The generic word for a shop (never its name or brand): the table's word for its kind; a given sign only if it IS one of them. */
function _scbgSignText(shop) {
  if (!shop || shop.brand) return null;
  const words = Object.values(SCENE_GEN_SHOP_WORDS);
  if (shop.sign) { const w = words.find(x => x.toLowerCase() === String(shop.sign).trim().toLowerCase()); if (w) return w; }
  const w = SCENE_GEN_SHOP_WORDS[shop.kind];
  if (!w) return null;
  const t = typeof sceneSignText === 'function' ? sceneSignText(w) : { ok: true, text: w };
  return t.ok ? t.text : null;
}

/* ---------- PROJECTED mode (19.1) ---------- */
/** A building record's footprint (metres), storeys and seed, filled from the style when missing. */
function _scbgFootOf(b) {
  if (Array.isArray(b.foot) && b.foot.length >= 3) return b.foot;
  const W = b.frontage || 6, D = b.depth || 9, x = (b.at && b.at[0]) || 0, d = (b.at && b.at[1]) || 20;
  return [[x - W / 2, d], [x + W / 2, d], [x + W / 2, d + D], [x - W / 2, d + D]];
}
/**
 * PROJECTED mode (19.1): the screen shapes of a building seen through the camera (2.2). b: { foot: [[x, d], ...] metres, storeys
 * or h (eave metres), roof, style, seed, front (the edge with the door), party, shop, door, src }. ctx: { season, snowDepth,
 * signage, tierCap }. Walls whose outward normal faces the eye, then roof planes, then protrusions (bays, porches, canopies,
 * stacks) far to near; windows, doors and details laid out in metres on each wall plane. At most SCENE_GEN_MAX_SHAPES shapes:
 * over that, the detail tier steps down. null when nothing is in front of the camera. walls: the visible wall edges (indices into
 * the counter-clockwise footprint, front first); ctx.debug adds debug: { walls: [{ edge, poly }], windows: [{ edge, quad, theta, tier }] }.
 */
function sceneBuildingProject(b, cam, ctx) {
  ctx = ctx || {};
  if (!b) return null;
  const foot0 = _scbgFootOf(b), sp0 = sceneBuildingResolve(b);
  if (Number.isFinite(b.h) && !b.storeys) {
    const per = sp0.hs[1] || sp0.hs[0] || 3, n = _scbgCl(Math.round((b.h - (sp0.hs[0] - per)) / per), 1, 40);
    if (n !== sp0.storeys) return sceneBuildingProject(Object.assign({}, b, { storeys: n }), cam, ctx);
  }
  const view = _scbgPersp(cam), foot = _scbgFoot(foot0, b.front);
  if (foot.every(p => p[1] < view.near)) return null;
  let tierCap = ctx.tierCap == null ? 3 : ctx.tierCap, res = null;
  for (; tierCap >= 0; tierCap--) {
    res = _scbgBuild(b, sceneBuildingResolve(Object.assign({}, b, { storeys: sp0.storeys })), foot, view, { season: ctx.season, tierCap, debug: !!ctx.debug });
    if (res.sink.shapes.length + res.sink.lit.length + res.sink.snow.length <= SCENE_GEN_MAX_SHAPES) break;
  }
  const sink = res.sink;
  if (!sink.shapes.length) return null;
  const snowDepth = Number(ctx.snowDepth) || 0;
  let shapes = sink.shapes;
  if (snowDepth > 0) shapes = shapes.concat(sink.snow.map(s => Object.assign({}, s, { op: Math.round(s.op * Math.min(1, snowDepth) * 100) / 100 })));
  // box, anchor (the lowest ground point on screen: v1 draw order), depths
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const sh of shapes.concat(sink.lit)) { const t = sh.d.match(/-?\d+(?:\.\d+)?/g) || []; for (let i = 0; i + 1 < t.length; i += 2) { const X = +t[i], Y = +t[i + 1]; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; } }
  const vis = foot.filter(p => p[1] >= view.near);
  const anchorM = vis.reduce((a, p) => (view.P([p[0], 0, p[1]])[1] > view.P([a[0], 0, a[1]])[1] ? p : a), vis[0]);
  const anchor = view.P([anchorM[0], 0, anchorM[1]]).map(_scbgR1);
  const dz = Math.min(...vis.map(p => p[1])), dc = foot.reduce((s, p) => s + p[1], 0) / foot.length;
  const signs = [];
  if (ctx.signage) for (const { e, w } of res.shops) {
    const text = _scbgSignText({ kind: e.kind, sign: e.sign, brand: e.brand });
    if (!text || !e.fasciaBox) continue;
    const mid = _scbgOn(w.plane, e.fasciaBox[0] + e.fasciaBox[2] / 2, 0, 0), ray = _scbgNorm([mid[0], 0, mid[2]]);
    if (-_scbgDot(w.plane.N, ray) < Math.cos(40 * _scbgD2R)) continue;   // too oblique for an upright board
    const q = _scbgRect(w.plane, view, e.fasciaBox[0], e.fasciaBox[1], e.fasciaBox[2], e.fasciaBox[3], 0.09);
    if (!q) continue;
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]), bw = Math.max(...xs) - Math.min(...xs), bh = (Math.max(...ys) - Math.min(...ys));
    if (bh < 6) continue;
    signs.push({ x: Math.round((Math.max(...xs) + Math.min(...xs)) / 2), y: Math.round((Math.max(...ys) + Math.min(...ys)) / 2), w: Math.round(bw * 0.85), h: Math.round(bh * 0.7), text, style: 'fascia', ink: '#f4f1e8', board: '#1d2226', d: Math.round(mid[2] * 10) / 10 });
  }
  const T = res.model;
  return {
    shapes, lit: sink.lit, snow: sink.snow, glow: Object.assign({}, SCENE_GEN_NIGHT), on: sp0.on,
    box: [Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1)], foot, h: Math.round(T.H * 100) / 100, eave: Math.round(T.E * 100) / 100,
    style: sp0.id, roof: T.roof, seed: sp0.seed, src: b.src || 'gen', n: shapes.length + sink.lit.length, tier: tierCap,
    dz: Math.round(dz * 10) / 10, dc: Math.round(dc * 10) / 10, anchor, smoke: res.smoke.filter(p => p[2] >= view.near).map(p => view.P(p).map(_scbgR1)), signs,
    walls: res.model.faces.filter(f => f.part === 'wall' && view.sees(f.n, f.poly[0])).map(f => f.edge),
    debug: res.debug || undefined,
  };
}

/* ---------- shadows (6.2) ---------- */
/** The shadow of a building's prism on the ground, in metres: the footprint swept along sunG * sunTan * (eave + half the roof). */
function sceneBuildingShadowGround(b, sunG, sunTan) {
  if (!b || !Array.isArray(sunG) || !(sunTan > 0) || !Number.isFinite(sunTan)) return null;
  const foot = _scbgFootOf(b);
  let H = Number.isFinite(b.h) ? b.h : null;
  if (H == null) { const sp = sceneBuildingResolve(b); H = sp.zs[sp.zs.length - 1] + (sp.roof === 'flat' ? sp.parapet : 1.6); }
  else if (Number.isFinite(b.eave)) H = (b.h + b.eave) / 2;
  const L = Math.min(12, sunTan) * H, v = [sunG[0] * L, sunG[1] * L];
  return _scbgHull(foot.concat(foot.map(p => [p[0] + v[0], p[1] + v[1]])));
}
/** The screen polygon of the prism's shadow (6.2): the ground polygon clipped at the near plane and projected; null without sun. */
function sceneBuildingShadow(b, sunG, sunTan, cam) {
  const g = sceneBuildingShadowGround(b, sunG, sunTan);
  if (!g) return null;
  const view = _scbgPersp(cam), poly = _scbgClipNear(g.map(p => [p[0], 0, p[1]]), view.near);
  return poly ? poly.map(p => view.P(p).map(_scbgR1)) : null;
}

/* ---------- streets (19.4) ---------- */
/** A strip's centreline and its outer edge offset on one side (the road, plus every strip beside it on that side, plus gaps). */
function _scbgStripOf(data, id, side) {
  const S = (data && data.surfaces) || [], road = S.find(s => s.id === id);
  if (!road) return null;
  let base = road, off = 0, guard = 0;
  // a strip declared beside another: walk up to the strip with the path
  while (base && !Array.isArray(base.path) && base.beside && guard++ < 6) { const parent = S.find(s => s.id === base.beside); if (!parent) break; off += (parent.width || 0) / 2 + (base.gap || 0) + (base.width || 0) / 2; base = parent; }
  if (!base || !Array.isArray(base.path) || base.path.length < 2) return null;
  let edge = (base.width || 7) / 2;
  const sideOf = (s) => s.side === side || (!s.side && side === 'left');
  let cur = base.id; guard = 0;
  while (guard++ < 6) { const next = S.find(s => s.beside === cur && sideOf(s)); if (!next) break; edge += (next.gap || 0) + (next.width || 0); cur = next.id; }
  return { path: base.path, edge, base };
}
/** Arc-length walker on a polyline: at(s) -> { p: [x, d], t: [tx, td] }. */
function _scbgWalker(path) {
  const seg = [], P = path.map(p => [Number(p[0]), Number(p[1])]);
  let L = 0;
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (l > 1e-6) { seg.push({ a: P[i - 1], b: P[i], s0: L, l }); L += l; } }
  const at = (s) => {
    s = _scbgCl(s, 0, L);
    let g = seg[seg.length - 1];
    for (const x of seg) if (s <= x.s0 + x.l) { g = x; break; }
    const u = (s - g.s0) / g.l, t = [(g.b[0] - g.a[0]) / g.l, (g.b[1] - g.a[1]) / g.l];
    return { p: [g.a[0] + (g.b[0] - g.a[0]) * u, g.a[1] + (g.b[1] - g.a[1]) * u], t };
  };
  return { at, len: L };
}
const _SCBG_RUN = { terrace: [4, 10], row: [3, 8], semi: [2, 2], detached: [1, 1], block: [1, 1] };
/**
 * Buildings along the edge of a strip (19.4). rule: { side, along, from, to, style: 'id' | { id: weight }, storeys, frontage,
 * depth, setback, gaps, shops: 'ground' | 'none' | 'corner', seed, roof }. The edge is the strip's (plus the strips beside it
 * on that side, a pavement) plus the setback; buildings follow one another from `from` to `to` metres along the strip: frontages
 * seeded in the range, the style mix weighted with runs (terraces come in rows, semis in pairs), gaps (alleys, driveways)
 * at about `gaps` per building. Returns building records { foot, storeys, style, seed, front: 0, party, shop, roof, src, i }.
 * The 4th argument is the scene data (for the surface declarations); C may carry it as C.data.
 */
function sceneStreetExpand(rule, C, cam, data) {
  rule = rule || {};
  data = data || (C && C.data) || null;
  const side = rule.side === 'right' ? 'right' : 'left', strip = _scbgStripOf(data, rule.along || 'road', side);
  if (!strip) return [];
  const wk = _scbgWalker(strip.path), sg = side === 'left' ? 1 : -1;
  const from = _scbgCl(Number.isFinite(rule.from) ? rule.from : 0, 0, wk.len), to = _scbgCl(Number.isFinite(rule.to) ? rule.to : wk.len, from, wk.len);
  const r = sceneRnd(sceneHash('street|' + (data && data.id) + '|' + (rule.index | 0) + '|' + (rule.seed | 0)));
  const mix = typeof rule.style === 'string' ? { [rule.style]: 1 } : Array.isArray(rule.style) ? Object.fromEntries(rule.style.map(s => [s, 1])) : (rule.style || { 'victorian-terrace': 1 });
  const known = Object.fromEntries(Object.entries(mix).filter(([k]) => sceneBuildingStyle(k)));
  const off = strip.edge + (Number.isFinite(rule.setback) ? rule.setback : 2);
  const gaps = Number.isFinite(rule.gaps) ? rule.gaps : 0.08, shops = rule.shops || 'none';
  const out = [];
  let s = from, run = null, prevStyle = null, idx = 0;
  const normalAt = (q) => { const w = wk.at(q); return { p: w.p, n: [-w.t[1] * sg, w.t[0] * sg] }; };   // left normal = (-td, tx)
  while (s < to - 2 && idx < 400) {
    if (!run || run.left <= 0) {
      const st = prevStyle && r() < 0.35 ? prevStyle : _scbgPickW(r, known);
      if (!st) break;
      const S = sceneBuildingStyle(st), grp = S.grouping || 'detached', rr = _SCBG_RUN[grp] || [1, 1];
      run = { style: st, S, grp, n: rr[0] + Math.floor(r() * (rr[1] - rr[0] + 1)), k: 0,
        storeys: Array.isArray(rule.storeys) ? rule.storeys[0] + Math.floor(r() * (rule.storeys[1] - rule.storeys[0] + 1)) : (rule.storeys || _scbgInt(r, S.storeys, 2)),
        F: _scbgRange(r, rule.frontage || S.frontage, 6), D: _scbgRange(r, rule.depth || S.depth, 9) };
      run.left = run.n; prevStyle = st;
      if (idx > 0 && (run.grp === 'semi' || run.grp === 'detached' || run.grp === 'block')) s += 1.5 + r() * 2;   // a side gap before a detached house
    }
    const F = run.F * (run.grp === 'terrace' || run.grp === 'row' ? 1 + (r() - 0.5) * 0.04 : 1 + (r() - 0.5) * 0.16);
    const shopRoll = r(), gapRoll = r(), gapLen = 1.2 + r() * 2.3, kindRoll = r();
    if (s + F > to + 0.5) break;
    const a = normalAt(s), b = normalAt(s + F), nm = _scbgNorm([a.n[0] + b.n[0], 0, a.n[1] + b.n[1]]), D = run.D;
    const q0 = [a.p[0] + a.n[0] * off, a.p[1] + a.n[1] * off], q1 = [b.p[0] + b.n[0] * off, b.p[1] + b.n[1] * off];
    const q1b = [q1[0] + nm[0] * D, q1[1] + nm[2] * D], q0b = [q0[0] + nm[0] * D, q0[1] + nm[2] * D];
    // counter-clockwise with the street edge first: the outward normal of the front points back toward the strip
    let foot = [q0, q1, q1b, q0b];
    if (_scbgArea2(foot) < 0) foot = [q1, q0, q0b, q1b];
    const first = run.k === 0, last = run.k === run.n - 1;
    let party = 'none';
    if (run.grp === 'terrace' || run.grp === 'row') party = run.n === 1 ? 'none' : first ? 'far' : last ? 'near' : 'both';
    else if (run.grp === 'semi') party = first ? 'far' : 'near';
    // 'near' / 'far' along the street -> left / right as seen from the street (the first footprint corner is the left end)
    const nearIsLeft = foot[0] === q0;
    if (party === 'far') party = nearIsLeft ? 'right' : 'left';
    else if (party === 'near') party = nearIsLeft ? 'left' : 'right';
    const shopOk = run.S.shop && (run.S.shop.always || run.S.shop.allowed);
    const shop = shops === 'none' ? false : shops === 'corner' ? ((first || last) && shopRoll < 0.8) : !!(shopOk && (run.S.shop.always || shopRoll < 0.7));
    const seed = sceneHash('street-b|' + (rule.seed | 0) + '|' + (rule.index | 0) + '|' + idx) % 1e6;
    const rec = { foot: foot.map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]), front: 0, storeys: run.storeys, style: run.style, seed, party, src: 'street', i: idx, along: Math.round(s * 100) / 100, frontage: Math.round(F * 100) / 100, depth: Math.round(D * 100) / 100 };
    if (rule.roof) rec.roof = rule.roof;
    if (shop) rec.shop = { kind: Object.keys(SCENE_GEN_SHOP_WORDS)[Math.floor(kindRoll * Object.keys(SCENE_GEN_SHOP_WORDS).length)] };
    else if (run.S.shop && run.S.shop.always) rec.shop = false;
    const inView = !cam || rec.foot.some(p => { const c = _scbgCamOf(cam); return p[1] > 0.5 && Math.abs(p[0]) < p[1] * Math.tan(c.fov * _scbgD2R / 2) * 1.3 + 12; });
    if (inView) out.push(rec);
    run.k++; run.left--; idx++;
    s += F;
    if (run.left > 0 && gapRoll < gaps) { s += gapLen; run.left = 0; }   // an alley or a driveway ends the row
    else if (run.left <= 0 && gapRoll < gaps) s += gapLen;
  }
  return out;
}

/* ---------- the compile hook (12, stage 4) ---------- */
let _scbgDirectDefined = false;
/** The placeholder object a direct item names (renderers without the direct hook draw nothing for it). */
function _scbgDirectObj() {
  if (_scbgDirectDefined || typeof sceneObjDefine !== 'function') return 'building.gen-direct';
  _scbgDirectDefined = true;
  if (!sceneObj('building.gen-direct')) sceneObjDefine({ id: 'building.gen-direct', category: 'building', size: [4, 4], variants: 1, seasonal: false, flippable: false, weight: 0,
    tags: ['uk', 'kit:urban', 'role:building-mid', 'gen', 'unlit', 'class:building'], parts: ['body'], build: () => ({ body: [{ f: '#000000', d: 'M0 0h1v-1h-1z', op: 0 }] }) });
  return 'building.gen-direct';
}
/**
 * The compile hook (12, stage 4): the buildings of data.buildings (explicit footprints: OSM, the composer, hand-written) and
 * data.streets (sceneStreetExpand), each projected (sceneBuildingProject) into a `direct` placement. Returns { items, buildings,
 * problems, signs }: items are Placed records (v1 fields + g, dz, cls, view, haze null, direct, shade false); buildings are
 * { i (index into items), foot, h, eave, roof, style, seed, src }; signs only with data.signage (8.3). Pure and deterministic.
 */
function sceneGenExpand(data, C, cam) {
  data = data || {};
  cam = cam || (C && C.cam) || data.camera || {};
  const season = (C && C.season) || (data.season && data.season !== 'auto' ? data.season : 'summer');
  const list = [], problems = [];
  (data.buildings || []).forEach((b, i) => list.push(Object.assign({ seed: sceneHash(String(data.id) + '|b|' + i) % 1e6, src: 'data' }, b, { _k: 'b' + i })));
  (data.streets || []).forEach((rule, ri) => { for (const b of sceneStreetExpand(Object.assign({ index: ri }, rule), C, cam, data)) list.push(Object.assign(b, { _k: 's' + ri + '.' + b.i })); });
  const items = [], buildings = [], signs = [];
  const obj = _scbgDirectObj();
  for (const b of list) {
    if (b.style && !sceneBuildingStyle(b.style)) problems.push({ rule: 'genStyle', sev: 'warn', i: -1, obj: 'building', at: null, msg: 'unknown building style ' + b.style + ' (victorian-terrace used)', fix: 'one of ' + sceneBuildingStyles().map(s => s.id).join(', ') });
    const direct = sceneBuildingProject(b, cam, { season, signage: !!data.signage });
    if (!direct) { problems.push({ rule: 'genOffscreen', sev: 'info', i: -1, obj: 'building', at: _scbgFootOf(b)[0], msg: 'a building (' + b._k + ') is not in view', fix: null }); continue; }
    const seed = (Number(b.seed) || 0) >>> 0;
    const it = { o: obj, v: 0, x: direct.anchor[0], y: direct.anchor[1], s: 1, flip: false, layer: typeof sceneDepthBand === 'function' && cam && cam.bands ? sceneDepthBand(cam, direct.dc) : null, haze: null, tint: null,
      season, seed, z: direct.anchor[1], strip: -1, anim: [], glowOn: null, shadow: false, reflect: true, lit: direct.lit.length > 0,
      g: { x: _scbgR1(direct.foot.reduce((s, p) => s + p[0], 0) / direct.foot.length), d: direct.dc, h: 0, surf: null, snapped: 0 }, dz: direct.dc, cls: 'building', view: 'side', direct, shade: false, gen: b._k };
    if (b.subject) it.subject = true;   // the scene's subject (the composer, the editor): the lint and the critic find it
    items.push(it);
    buildings.push({ i: items.length - 1, foot: direct.foot, h: direct.h, eave: direct.eave, roof: direct.roof, style: direct.style, seed, src: b.src || 'gen' });
    if (data.signage) for (const sg of direct.signs) signs.push(Object.assign({ i: items.length - 1 }, sg));
  }
  return { items, buildings, problems, signs };
}

/* ---------- v1 bridge: a projected building as a one-off object; a v2 street preview through the v1 renderers ---------- */
const _scbgAsMemo = new Map();
/**
 * A projected building as a one-off library object building.genp-<hash8> (registered lazily, memoised by building and camera),
 * placed at its anchor with s 1: for renderers without the direct hook (the v1 canvas and SVG renderers, previews and demos).
 * Glass panes are glow shapes (lit by the v1 glowOn share at night); the lit part shows after dusk. -> { obj, x, y, s, d } | null
 */
function sceneBuildingAsObject(b, cam, ctx) {
  ctx = ctx || {};
  const key = JSON.stringify([b, _scbgCamOf(cam), ctx.snowDepth || 0]);
  if (_scbgAsMemo.has(key)) return _scbgAsMemo.get(key);
  const probe = sceneBuildingProject(b, cam, { season: 'summer' });
  if (!probe) { _scbgAsMemo.set(key, null); return null; }
  const id = 'building.genp-' + sceneHash(key).toString(16).padStart(8, '0'), ax = probe.anchor[0], ay = probe.anchor[1];
  if (!sceneObj(id)) {
    sceneObjDefine({ id, category: 'building', size: [Math.max(4, Math.min(2000, probe.box[2] - probe.box[0])), Math.max(4, Math.min(2000, probe.box[3] - probe.box[1]))], variants: 1, seasonal: true, shapeBySeason: true, flippable: false,
      parts: ['body', 'lit'], night: { glow: Object.assign({}, SCENE_GEN_NIGHT), on: probe.on }, weight: 0, tags: ['uk', 'kit:urban', 'role:building-mid', 'gen', 'class:building', 'projected'],
      real: { h: probe.h }, reflect: true,
      build(v, rnd, c) {
        const d = sceneBuildingProject(b, cam, { season: c.season, snowDepth: ctx.snowDepth || 0 });
        const mv = (sh) => ({ f: sh.f && typeof sh.f === 'object' && sh.f.lin ? Object.assign({}, sh.f, { x1: sh.f.x1 - ax, y1: sh.f.y1 - ay, x2: sh.f.x2 - ax, y2: sh.f.y2 - ay }) : sh.f, d: _scbgShift(sh.d, -ax, -ay), op: sh.op, glow: sh.glow || undefined, detail: sh.detail || undefined });
        return { body: d ? d.shapes.map(mv) : [], lit: d ? d.lit.map(mv) : [] };
      } });
  }
  const out = { obj: id, x: ax, y: ay, s: 1, d: probe.dc, dz: probe.dz, box: probe.box };
  _scbgAsMemo.set(key, out);
  return out;
}
/** Shift the numbers of an M / L / Z path (the generator writes only those). */
function _scbgShift(d, dx, dy) {
  let i = 0;
  return String(d).replace(/-?\d+(?:\.\d+)?/g, (m) => _scbgR1(+m + (i++ % 2 === 0 ? dx : dy)) + '');
}
/** Project a ground polygon (metres) to a screen path (clipped at the near plane), or null. */
function _scbgGroundPath(view, poly) {
  const cl = _scbgClipNear(poly.map(p => [p[0], 0, p[1]]), view.near);
  return cl ? _scbgPath(cl.map(view.P)) : null;
}
/** A strip polygon (metres) from a centreline offset to [o0, o1] (left positive). */
function _scbgStripPoly(path, o0, o1) {
  const wk = _scbgWalker(path), n = Math.max(2, Math.ceil(wk.len / 4)), L = [], R = [];
  for (let i = 0; i <= n; i++) { const w = wk.at(wk.len * i / n), nl = [-w.t[1], w.t[0]]; L.push([w.p[0] + nl[0] * o1, w.p[1] + nl[1] * o1]); R.push([w.p[0] + nl[0] * o0, w.p[1] + nl[1] * o0]); }
  return L.concat(R.reverse());
}
const _SCBG_PREVIEW_COLS = { road: ['#5a5e64', '#3e4248'], pavement: ['#b4b0a8', '#9a968e'], plaza: ['#b8b2a6', '#a09a8e'], path: ['#b8a888', '#a08e70'], towpath: ['#b0a080', '#968868'], grass: ['#7a9a4a', '#5a7a34'], lawn: ['#82a24e', '#62823a'], park: ['#7a9a4a', '#5a7a34'], verge: ['#7a9450', '#5e7a3a'], plot: ['#8a8676', '#6e6a5c'], field: ['#9aa058', '#7a8442'], tramway: ['#5a5e64', '#3e4248'], parking: ['#5e6268', '#44484e'], cycleway: ['#8a4a3e', '#6e3a30'] };
/**
 * PREVIEW (tools, demos): a v2 street recipe through the v1 renderers. data: a v2 scene ({ camera, surfaces, streets, buildings,
 * place with at: [x, d] and hM }), opt: { season, sky (the page's live sky, for building shadows), shadows: true }. Surfaces
 * become screen ground fills, buildings one-off objects (sceneBuildingAsObject), ground placements pixel placements scaled by
 * depth. Not the v2 compile: no snapping, water or flows (A, B, D do those).
 */
function sceneGenPreview(data, opt) {
  opt = opt || {};
  const cam = _scbgCamOf(data.camera || {}), view = _scbgPersp(data.camera || {}), season = opt.season || (data.season !== 'auto' && data.season) || 'summer';
  const ground = [], place = [];
  const hz = cam.horizon, fill = (k, d0) => { const c = _SCBG_PREVIEW_COLS[k] || _SCBG_PREVIEW_COLS.grass, w = _scbgSeasonal(c[0], season), n = _scbgSeasonal(c[1], season); return { lin: [[0, _scbgMix(w, '#b8c4cc', 0.3)], [1, n]], x1: 0, y1: hz, x2: 0, y2: 900 }; };
  ground.push({ layer: 'ground', d: `M-160 ${hz}H1760V900H-160Z`, fill: fill(((data.surfaces || []).find(s => s.rest) || {}).kind || 'grass') });
  for (const s of data.surfaces || []) {
    if (s.rest) continue;
    let poly = null;
    if (Array.isArray(s.poly)) poly = s.poly;
    else if (Array.isArray(s.band)) poly = [[-4000, s.band[0]], [4000, s.band[0]], [4000, s.band[1]], [-4000, s.band[1]]];
    else if (Array.isArray(s.path)) poly = _scbgStripPoly(s.path, -(s.width || 7) / 2, (s.width || 7) / 2);
    else if (s.beside) {
      const st = _scbgStripOf(data, s.beside, s.side || 'left');
      if (st) { const inner = (st.base.width || 7) / 2 + (s.gap || 0); const o = s.side === 'right' ? [-(inner + (s.width || 2)), -inner] : [inner, inner + (s.width || 2)]; poly = _scbgStripPoly(st.path, o[0], o[1]); }
    }
    const d = poly ? _scbgGroundPath(view, poly) : null;
    if (d) ground.push({ layer: 'ground', d, fill: fill(s.kind) });
    if (d && s.markings === 'centre' && Array.isArray(s.path)) {
      const wk = _scbgWalker(s.path), segs = [];
      for (let a = 2; a < wk.len - 3; a += 9) { const p = _scbgStripPoly([wk.at(a).p, wk.at(a + 3).p], -0.06, 0.06), q = _scbgGroundPath(view, p); if (q) segs.push(q); }
      if (segs.length) ground.push({ layer: 'ground', d: segs.join(''), fill: '#e8e6dc' });
    }
  }
  const gen = [];
  (data.buildings || []).forEach((b, i) => gen.push(Object.assign({ seed: sceneHash(String(data.id) + '|b|' + i) % 1e6 }, b)));
  (data.streets || []).forEach((rule, ri) => gen.push(...sceneStreetExpand(Object.assign({ index: ri }, rule), null, data.camera, data)));
  // building shadows on the ground (the prism through the page's sun), one darker fill per building
  let L = null;
  if (opt.shadows !== false && opt.sky && typeof sceneLight === 'function') { try { L = sceneLight({ sky: opt.sky }, Object.assign({}, data.view, { horizon: cam.horizon, fov: cam.fov, heading: cam.heading })); } catch (e) { L = null; } }
  if (L && L.alt > 0.5 && L.sun) {
    const rel = (L.sun.rel || 0) * _scbgD2R, sunG = [-Math.sin(rel), -Math.cos(rel)], sunTan = Math.min(12, 1 / Math.tan(L.alt * _scbgD2R));
    const op = _scbgCl(0.42 * (1 - (L.cover || 0) * 0.75) * _scbgCl(L.alt / 3, 0, 1), 0, 0.45), segs = [];
    for (const b of gen) { const p = sceneBuildingShadow(b, sunG, sunTan, data.camera); if (p) segs.push(_scbgPath(p)); }
    if (segs.length && op > 0.02) ground.push({ layer: 'ground', d: segs.join(''), fill: { lin: [[0, '#14202e', op], [1, '#14202e', op]], x1: 0, y1: 0, x2: 0, y2: 900 } });
  }
  for (const b of gen) { const o = sceneBuildingAsObject(b, data.camera, { snowDepth: opt.snowDepth || 0 }); if (o) place.push({ obj: o.obj, x: o.x, y: o.y, s: 1, layer: 'mid', seed: 1 }); }
  for (const p of data.place || []) {
    if (!Array.isArray(p.at) || !(p.at[1] > view.near)) { if (Number.isFinite(p.x)) place.push(p); continue; }
    const def = sceneObj(p.obj);
    if (!def) continue;
    const real = def.real && def.real.h ? def.real.h : (typeof sceneObjReal === 'function' && sceneObjReal(p.obj) && sceneObjReal(p.obj).h) || p.hM || ({ person: 1.72, tree: 12, street: 3, vehicle: 1.5, plant: 0.8 }[def.category] || 2);
    const hM = p.hM || real, P = view.P([p.at[0], 0, p.at[1]]);
    place.push({ obj: p.obj, x: _scbgR1(P[0]), y: _scbgR1(P[1]), s: Math.round(cam.f * hM / p.at[1] / def.size[1] * 1000) / 1000, layer: 'mid', variant: p.variant | 0, flip: !!p.flip, seed: p.seed || 3 });
  }
  return { v: 1, id: data.id || 'gen-preview', view: Object.assign({ lat: 53.38, lon: -1.47 }, data.view || {}, { horizon: cam.horizon, fov: cam.fov, heading: cam.heading }), at: data.at || 'afternoon', season,
    setting: 'urban', particles: 'none', weather: data.weather === 'none' ? 'none' : 'live', sky: data.sky,
    layers: [{ id: 'ground', depth: 0.1, haze: 0 }, { id: 'mid', depth: 0.6, haze: 0 }, { id: 'front', depth: 1, haze: 0 }], ground, place };
}

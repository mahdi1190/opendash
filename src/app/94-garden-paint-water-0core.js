/* Painted nature: the vale's water as composed pictures (Painted village art
 * style), in the opening scenes' flat-vector house style (soft lobed shading lit
 * from the upper left, no outlines; docs/dev/SCENE_LESSONS.md).
 *
 * Everything is driven by the layout (GardenIslandLayout.data): each
 * freshwater basin's smooth boundary, the rivers' centre lines and half widths
 * (presentation.rivers), the falls, the crossings and the isle. Nothing here is
 * placed by hand in world pixels, so a layout change repaints itself.
 *
 * How it stays cheap:
 *  - The still picture (banks, shallows, depth, the far bank's reflection, sky
 *    streaks by time of day, lilies, riffle stones, the weir sill, foam beds)
 *    is described once as a feature list per water, then baked lazily into
 *    512 x 512 world-pixel chunks (canvas textures), one chunk per frame at
 *    most, only near the camera, with an LRU cap on how many are resident.
 *  - Movement is a few live layers over that bake: glints that ride the current
 *    along each river's centre line, twinkles and rising rings on still water,
 *    foam strips that scroll over the weir and riffles, drifting mist. They are
 *    plain images whose position and alpha change; nothing redraws; emitters
 *    off screen are hidden and not updated.
 * Only rendering: cells, walking, fishing and saved rows are untouched. Nothing
 * here runs at load. */
window.GardenPaintWater = (function () {
  'use strict';
  const TEX = 'gpw', BUDGET_MB = 24;   // the still picture's memory bound (the paint kit's layer keeps to it)
  let serialAll = 0;
  const slowest = { ms: 0, what: '' };
  let state = null, lastError = null, tickWorst = 0;
  const ok = f => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };
  function rng(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const P2cache = new Map();
  const P2 = d => { let p = P2cache.get(d); if (!p) { if (P2cache.size > 12000) P2cache.clear(); p = new Path2D(d); P2cache.set(d, p); } return p; };
  const D = () => sceneDraw;

  /* ---------- palettes: the water takes the sky's colour by time of day ---------- */
  // One water for the whole vale: the inland water is the sea's own teal, a little deeper and greener. The hour's colour
  // is laid over the whole view by the light module (paintEvening), so dusk and night keep this water's hue and only
  // change what it reflects (warm sky at dusk, a cool moonlit sky at night): never a slate grey that reads as a road.
  const TOD = {
    day: { water: '#5a9fab', deep: '#367a8c', shallow: '#8ec8bd', sky: '#d4ecea', skyHi: '#f4fbf6', refl: '#466c47', reflDeep: '#365738', glint: '#ffffff', foam: '#f3f8f1', bed: '#b9ad84' },
    dawn: { water: '#5f9fae', deep: '#3a7a8e', shallow: '#97c6bf', sky: '#f4dcc8', skyHi: '#fff2e4', refl: '#4f6a48', reflDeep: '#3e573c', glint: '#fff4e6', foam: '#f6f2ea', bed: '#b4a886' },
    dusk: { water: '#5d9cab', deep: '#38778b', shallow: '#94c4bd', sky: '#f7c39a', skyHi: '#ffe0bc', refl: '#3f5a40', reflDeep: '#304833', glint: '#ffe2b8', foam: '#f4ece2', bed: '#ab9f80' },
    // (night water is dark before the night's blue grade is multiplied over it: a teal under that grade came out a saturated
    //  royal blue, lighter than the land round it, so the night's light and dark ran the wrong way; art director, round 3)
    night: { water: '#304a47', deep: '#20332f', shallow: '#42594f', sky: '#76848c', skyHi: '#a6b2ba', refl: '#16241c', reflDeep: '#0f1a14', glint: '#e4ecff', foam: '#aebcc2', bed: '#4f4c40' },   // (round 2: grey-green, a little darker than the moonlit land; a blue-green teal under the night grade read as royal blue paint)
  };
  const SEASON = {
    summer: { reed: ['#6d8a3e', '#8fa952', '#b4c472'], lily: ['#4f7c3e', '#6f9a4e', '#93b864'], flower: ['#fbfbf4', '#f6c9d6'], bank: '#8a7856', grass: '#6f8e45', moss: '#7d8f4e' },
    spring: { reed: ['#6a9040', '#8db552', '#bcd57c'], lily: ['#548440', '#74a050', '#9cc46a'], flower: ['#fbfbf4'], bank: '#8a7856', grass: '#729a48', moss: '#83984f' },
    autumn: { reed: ['#9a8442', '#c0a258', '#dcc27e'], lily: ['#7a7a3c', '#9a8e48', '#b8a45a'], flower: [], bank: '#86704e', grass: '#86894a', moss: '#8a8a4e' },
    winter: { reed: ['#9a8c6a', '#b8aa86', '#d4c9a8'], lily: [], flower: [], bank: '#837660', grass: '#8a967c', moss: '#8f9a80' },
  };
  function mix(a, b, t) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), c = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t); return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); }
  function palette(tod, season) {
    const T = TOD[tod] || TOD.day, S = SEASON[season] || SEASON.summer, P = Object.assign({}, T, S);
    if (season === 'winter') { P.water = mix(P.water, '#a6b4ba', .35); P.shallow = mix(P.shallow, '#cdd8d8', .35); P.refl = mix(P.refl, '#5d665c', .5); }
    if (season === 'autumn') P.refl = mix(P.refl, '#7a6236', .45);
    // at dawn and dusk the sky's warm light lies on still water more strongly
    P.warm = tod === 'dusk' || tod === 'dawn' ? 1.6 : 1;
    return P;
  }

  /* ---------- the model: every water of the layout, in world px ---------- */
  function kindOf(f) {
    const id = f.id;
    if (id === 'pond') return 'mere';
    if (/^gorge/.test(id)) return 'gorge';
    if (/^river/.test(id)) return 'river';
    if (/^brook/.test(id)) return 'brook';
    if (id === 'tarn') return 'tarn';
    if (id === 'spring') return 'spring';
    return 'pool';
  }
  const FLOW = { gorge: 95, river: 34, brook: 44, mere: 0, tarn: 0, spring: 0, pool: 0 };
  function signedArea(p) { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j].x * p[i].y - p[i].x * p[j].y); return a / 2; }
  function inside(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
  function boundsOf(p, m) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of p) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); } m = m || 0; return { x: x0 - m, y: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m }; }
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  function edgeDist(x, y, p) { let best = Infinity; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[j], b = p[i], dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L)); best = Math.min(best, Math.hypot(a.x + dx * t - x, a.y + dy * t - y)); } return best; }
  /** A polyline in px with its arc length, for glints that ride the current. */
  function line(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)); return { pts, cum, len: cum[cum.length - 1] }; }
  function at(L, s) {
    s = Math.max(0, Math.min(L.len - .001, s)); let lo = 0, hi = L.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.cum[m] <= s) lo = m; else hi = m; }
    const a = L.pts[lo], b = L.pts[lo + 1] || a, seg = (L.cum[lo + 1] - L.cum[lo]) || 1, t = (s - L.cum[lo]) / seg, dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
    return { x: a.x + dx * t, y: a.y + dy * t, tx: dx / n, ty: dy / n, i: lo };
  }
  function nearestOn(L, x, y) { let best = null; for (let i = 0; i < L.pts.length; i++) { const d = Math.hypot(L.pts[i].x - x, L.pts[i].y - y); if (!best || d < best.d) best = { d, s: L.cum[i] }; } return best; }

  // The layout's basins follow the cells, so a river's edge steps; a closed
  // moving average then two rounds of corner cutting turn the steps into a bank.
  function smooth(p) {
    let q = p; const n = q.length; if (n < 6) return q;
    for (let pass = 0; pass < 3; pass++) { const o = []; for (let i = 0; i < q.length; i++) { const a = q[(i - 1 + q.length) % q.length], b = q[i], c = q[(i + 1) % q.length]; o.push({ x: (a.x + b.x * 2 + c.x) / 4, y: (a.y + b.y * 2 + c.y) / 4 }); } q = o; }
    for (let pass = 0; pass < 2; pass++) { const o = []; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; o.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 }, { x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 }); } q = o; }
    // thin points closer than 5 px, so features stay cheap
    const out = [q[0]]; for (const z of q) { const l = out[out.length - 1]; if (Math.hypot(z.x - l.x, z.y - l.y) >= 5) out.push(z); } return out;
  }
  // The woodland brook's water cells stop at every crossing and short of the Mere, so its pieces drew as
  // separate pools (a glassy oval at its mouth). It is drawn whole instead: one ribbon along its line,
  // from the spring to a little way into the Mere, the crossings' bridges and stones standing over it.
  function brookWhole(W, list, riv) {
    const parts = list.filter(f => /^brook/.test(f.id)); if (!riv || !riv.line || riv.line.length < 2 || !parts.length) return list;
    const L = riv.line, hw = riv.halfWidth || .6, cw = W.cellW, ch = W.cellH, left = [], right = [];
    const a = L[L.length - 2], b = L[L.length - 1], tl = Math.hypot((b[0] - a[0]) * cw, (b[1] - a[1]) * ch) || 1;
    const go = 2.4 * cw / tl, line = L.concat([[b[0] + (b[0] - a[0]) * go, b[1] + (b[1] - a[1]) * go]]);   // on into the Mere (2.4 cells' width)
    for (let i = 0; i < line.length; i++) {
      const p = line[Math.max(0, i - 1)], q = line[Math.min(line.length - 1, i + 1)], dx = (q[0] - p[0]) * cw, dy = (q[1] - p[1]) * ch, n = Math.hypot(dx, dy) || 1;
      const k = hw * (cw + ch) / 2 * (1 + .1 * Math.sin(i * 1.7)) * (i === 0 ? .8 : 1), nx = -dy / n * k, ny = dx / n * k, c = line[i];
      left.push([c[0] + nx / cw, c[1] + ny / ch]); right.push([c[0] - nx / cw, c[1] - ny / ch]);
    }
    return [Object.assign({}, parts[0], { id: 'brook', river: 'brook', boundary: left.concat(right.reverse()) })].concat(list.filter(f => !/^brook/.test(f.id)));   // first, so the Mere is drawn over its mouth
  }
  function build(W, data) {
    const cx = c => c * W.cellW, cy = c => W.sky + c * W.cellH, pt = q => ({ x: cx(q[0]), y: cy(q[1]) });
    const pres = data.presentation || {}, rivers = pres.rivers || {};
    const lines = {};
    for (const [id, r] of Object.entries(rivers)) if (r && r.line && r.line.length > 1) lines[id] = Object.assign(line(r.line.map(pt)), { hw: r.halfWidth || 1, cells: r.line, id });
    // Freshwater is still a fishing habitat offshore, but its closed basin
    // must not draw a second bank around a rectangle in the open sea.
    const coast = data.version >= 5 ? ((data.coast && data.coast.land) || []).map(loop => loop.map(pt)) : [];
    const onLand = (x, y) => !coast.length || coast.some(loop => inside(x, y, loop));
    const coastPath = coast.length ? new Path2D() : null, seaMouths = [];
    for (const loop of coast) { coastPath.moveTo(loop[0].x, loop[0].y); for (const p of loop.slice(1)) coastPath.lineTo(p.x, p.y); coastPath.closePath(); }
    if (coast.length) for (const L of Object.values(lines)) {
      for (let i = 1; i < L.pts.length; i++) {
        const a = L.pts[i - 1], b = L.pts[i];
        if (!onLand(a.x, a.y) || onLand(b.x, b.y)) continue;
        let lo = 0, hi = 1;
        for (let k = 0; k < 16; k++) { const t = (lo + hi) / 2; if (onLand(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) lo = t; else hi = t; }
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        seaMouths.push({ id: L.id, x: a.x + (b.x - a.x) * hi, y: a.y + (b.y - a.y) * hi, tx: (b.x - a.x) / len, ty: (b.y - a.y) / len });
      }
    }
    const waters = [];
    // Vale's shared banks already include the river pieces. Crossings paint
    // the connecting water below their boards or stones; no second ribbon is
    // invented across dry land here.
    const basins = data.version >= 5 ? data.freshwater || [] : brookWhole(W, data.freshwater || [], rivers.brook);
    // Keep every basin's fill intact; its neighbours only mask internal shore ink.
    const contours = basins.filter(f => f.boundary && f.boundary.length >= 3).map(f => {
      const boundary = f.boundary.map(pt), pts = data.version >= 5 ? boundary : smooth(boundary);
      return { f, pts, bounds: boundsOf(pts, 0) };
    });
    // Crossing strips join basin mouths too, including the brook's inlet to
    // the Mere. Their shared water contour masks shore ink, never water fill.
    const crossingContours = data.version >= 5 && typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry().map(c => {
      const toPx = p => ({ x: cx(p.x), y: cy(p.y) }), pts = c.points.map(toPx);
      return { pts, holes: (c.holes || []).map(loop => loop.map(toPx)), bounds: boundsOf(pts, 0) };
    }) : [], shoreMasks = contours.concat(crossingContours);
    for (const { f, pts } of contours) {
      // The same frozen derived contour supplies water cells, feet, fish,
      // reflections and this picture. Never smooth it again in the painter.
      const kind = kindOf(f), b = boundsOf(pts, 64), r = rng(hash(f.id));
      const ccw = signedArea(pts) > 0, river = lines[f.river || (kind === 'gorge' ? 'gorge' : kind === 'river' ? 'river' : kind === 'brook' ? 'brook' : '')] || null;
      waters.push({ id: f.id, kind, pts, bounds: b, ccw, river, feats: features(W, f, pts, kind, ccw, river, r, pres, data.version >= 5 ? shoreMasks.filter(c => c.f !== f && hit(c.bounds, b)) : [], onLand) });
    }
    // The world box the layer's chunks sit in.
    let all = null; for (const w of waters) all = all ? { x: Math.min(all.x, w.bounds.x), y: Math.min(all.y, w.bounds.y), x1: Math.max(all.x1, w.bounds.x + w.bounds.w), y1: Math.max(all.y1, w.bounds.y + w.bounds.h) } : { x: w.bounds.x, y: w.bounds.y, x1: w.bounds.x + w.bounds.w, y1: w.bounds.y + w.bounds.h };
    // The sea is painted with the inland water out to its reach offshore (SEA_FADE), so the layer covers the coast too.
    if (coast.length) { const cb0 = boundsOf(coast.flat(), SEA_FADE[1] + 48); all = { x: Math.min(all.x, cb0.x), y: Math.min(all.y, cb0.y), x1: Math.max(all.x1, cb0.x + cb0.w), y1: Math.max(all.y1, cb0.y + cb0.h) }; }
    // A river mouth: where its line leaves the land, with the river's width there (the plume spreads from it).
    const mouths = seaMouths.map(m => { const L = lines[m.id]; return Object.assign({ hw: (L ? L.hw : 1) * (W.cellW + W.cellH) / 2 }, m); });
    return { W, waters, lines, pres, coastPath, coast, mouths, crossings: crossingContours, all };
  }

  /* ---------- the body of the water: one picture for all the inland water at once ---------- */
  // Every basin, crossing strip and brook is one union, so where two basins meet (the Mere and its outlet, the river
  // under a bridge, the brook at its stepping stones) the water is one tone with no seam and no edge. Its colour comes
  // from how far a point lies from the nearest real shore of that union: a sandy bed showing through at the edge,
  // clear shallows, then the open water, and the deep in the middle of the Mere and the river's channel. Measured on a
  // coarse field (FQ world px a step) for each chunk with a margin as wide as the deepest colour reaches, so two chunks
  // agree along their edge, smoothed up and cut by the union's own outline, so the shore stays crisp.
  const FQ = 3, DMAX = 102, SQ = 6, SEA_D = 240, SEA_FADE = [168, 236], MBLUR = 13;
  function orient(pts, outer) { return (signedArea(pts) > 0) === outer ? pts : pts.slice().reverse(); }
  function unionPath(M) {
    const p = new Path2D(), loop = q => { p.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) p.lineTo(q[i].x, q[i].y); p.closePath(); };
    for (const w of M.waters) loop(orient(w.pts, true));
    for (const c of M.crossings) { if (!c.pts || c.pts.length < 3) continue; loop(orient(c.pts, true)); for (const h of c.holes || []) if (h.length > 2) loop(orient(h, false)); }
    return p;
  }
  const rgbOf = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  let fieldMask = null, fieldOut = null, fieldTone = null, fieldSea = null;
  // each water's own character, blended across joins: [shade under trees or peat, extra depth, running]. A woodland brook runs dark
  // under its canopy, a fell tarn is dark and peaty, the open Mere and the river take the sky; running water carries lines along its current.
  const TONE = { mere: [0, 0, 0], river: [.06, .08, .8], brook: [.72, .2, 1], spring: [.6, .14, .3], gorge: [.46, .36, 1], tarn: [.6, .52, 0], pool: [.12, .06, 0] }, SHADE = [44, 84, 74], STONE_WET = [104, 104, 86], PEAT = [44, 40, 28], TB = 17;   // (a wide blend: the peaty tarn turned bright cyan at one hard line where the gorge left it)
  // The open sea far out is the world's own sea fill under this layer (by season); the painted sea fades into it offshore.
  const SEA_BASE = { summer: '#599f9d', spring: '#599f9d', autumn: '#5b9b9a', winter: '#76a8ad' };
  function seaPalette(S) {
    const base = SEA_BASE[S.season] || SEA_BASE.summer, night = S.tod === 'night';
    // (a sea, not a pool: pale clear water over the sand, a green-blue shoal, then a deeper blue band before it opens out into
    //  the world's sea; a single bright mint shoal read as a swimming pool)
    let edge = '#cfe4d4', shoal = '#84c2b2', mid = '#4b98a2', base0 = base;
    if (S.season === 'winter') { edge = mix(edge, '#e2e8e6', .4); shoal = mix(shoal, '#a8c8c8', .45); mid = mix(mid, base, .4); }
    // at night the sea is as dark as the world's own sea is made under it (NIGHT_SEA), so the night grade turns it navy
    if (night) { edge = '#56685e'; shoal = '#38534c'; mid = '#2e4846'; base0 = NIGHT_SEA; }
    return { edge: rgbOf(edge), shoal: rgbOf(shoal), mid: rgbOf(mid), base: rgbOf(base0), sand: rgbOf(night ? '#6e6a58' : '#d6c89a'), wet: '#a8956a', foam: night ? '#b9c6ca' : '#fbfdf6' };
  }
  // the world's own sea under the painted one, at night: a dark veil over its fill (paint() lays it), and the painted sea
  // fades out into the same colour offshore
  const NIGHT_SEA = '#2b4545', NIGHT_VEIL = { col: 0x1b2f30, a: .7 };
  // What the water reflects by the hour (the light module's evening grade is laid over all of it): c0 and c1 the two tones of
  // the clouds' reflections, broad patches lo..hi of a long, low noise; glow a wash of the sky's own colour over open water.
  const SKYR = {
    day: { a: .24, lo: .52, hi: .68, c0: '#eef8f4', c1: '#d2eaee', glow: 0, g: '#ffffff' },
    dawn: { a: .46, lo: .55, hi: .66, c0: '#fde0cc', c1: '#f0c0d0', glow: .1, g: '#a8b4cc' },
    // (soft peach and a dusty rose, not a saturated magenta: one bright pink blob repeated across the sea read as stains)
    dusk: { a: .36, lo: .57, hi: .69, c0: '#f6d4b8', c1: '#dcb4bc', glow: .14, g: '#8f9fc6' },   // (light peach and rose-lilac: a deep gold half-blended into teal read as mud)
    // (a faint moonlit sky: bright cloud reflections made the night's water the brightest thing on the screen)
    night: { a: .22, lo: .57, hi: .7, c0: '#8a98a6', c1: '#6e7e90', glow: .08, g: '#1c2a30' },
  };
  function skyOf(S) { const R = SKYR[S.tod] || SKYR.day; let c0 = R.c0, c1 = R.c1; if (S.season === 'winter') { c0 = mix(c0, '#e4e8ea', .4); c1 = mix(c1, '#d4dce2', .4); } return { a: R.a, lo: R.lo, hi: R.hi, c0: rgbOf(c0), c1: rgbOf(c1), glow: R.glow, g: rgbOf(R.g) }; }
  function fieldCanvas(c, w, h) { if (!c) { c = document.createElement('canvas'); } if (c.width < w) c.width = w; if (c.height < h) c.height = h; return c; }
  // One distance pass over a field: seed[i] = 1 where the distance is 0. Two sweeps of an eight-neighbour chamfer
  // (within a few per cent of the true distance; the same lattice and values in every chunk). Field px.
  const DG = Math.SQRT2;
  function chamfer(seed, gw, gh, D) {
    const n = gw * gh, INF = 1e9; for (let i = 0; i < n; i++) D[i] = seed[i] ? 0 : INF;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const i = y * gw + x; let d = D[i]; if (!d) continue; if (x) d = Math.min(d, D[i - 1] + 1); if (y) { d = Math.min(d, D[i - gw] + 1); if (x) d = Math.min(d, D[i - gw - 1] + DG); if (x < gw - 1) d = Math.min(d, D[i - gw + 1] + DG); } D[i] = d; }
    for (let y = gh - 1; y >= 0; y--) for (let x = gw - 1; x >= 0; x--) { const i = y * gw + x; let d = D[i]; if (!d) continue; if (x < gw - 1) d = Math.min(d, D[i + 1] + 1); if (y < gh - 1) { d = Math.min(d, D[i + gw] + 1); if (x < gw - 1) d = Math.min(d, D[i + gw + 1] + DG); if (x) d = Math.min(d, D[i + gw - 1] + DG); } D[i] = d; }
    return D;
  }
  // a box blur of a w x h field in place (two of them make a soft round kernel); tmp is scratch of the same size
  function boxBlur(A, w, h, r, tmp) {
    const k = 2 * r + 1;
    for (let y = 0; y < h; y++) { const o = y * w; let s = 0; for (let x = -r; x <= r; x++) s += A[o + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { tmp[o + x] = s / k; s += A[o + Math.min(w - 1, x + r + 1)] - A[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { A[y * w + x] = s / k; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
  }
  const CLOSE_R = 16, OPEN_R = 9;   // world px: a land corner jutting into the water is rounded off this far, a water corner this far
  let fieldBufs = null, seaBufs = null;
  function bufs(n) { if (!fieldBufs || fieldBufs.n < n) fieldBufs = { n, a: new Float32Array(n), m: new Uint8Array(n), s: new Uint8Array(n), d: new Float32Array(n), e: new Float32Array(n), f: new Float32Array(n), c: new Float32Array(n) }; return fieldBufs; }
  const scr = {};
  function scratch(name, n, zero) { let a = scr[name]; if (!a || a.length < n) a = scr[name] = new Float32Array(Math.max(n, 4096)); else if (zero) a.fill(0, 0, n); return a; }
  function sbufs(n) { if (!seaBufs || seaBufs.n < n) seaBufs = { n, s: new Uint8Array(n), d: new Float32Array(n), w: new Float32Array(n), m: new Float32Array(n), t: new Float32Array(n) }; return seaBufs; }
  /* The body of the water: one picture for all the water at once, the sea with it. Every basin, crossing strip and brook
   * is one union, and the sea is joined to it, so where two waters meet (the Mere and its outlet, the river under a
   * bridge, the brook at its stepping stones, the river running out into the sea) the water is one tone with no seam and
   * no edge. Its colour comes from how far a point lies from the nearest real shore: a sandy bed showing through at the
   * edge, clear shallows, then the open water, and the deep in the middle of the Mere and the river's channel. The sea
   * has its own: a foam line where it laps the sand, turquoise shallows that widen and narrow along the shore, swell
   * lines, and then the open sea, fading into the world's sea fill offshore. How much of a point's water is sea is read
   * from all the water within a few strides (a wide soft kernel), so a river turns into the sea over its mouth and the
   * line where the coast crosses the river never shows.
   * One op per chunk that holds water (a chunk of dry land holds no picture). Measured on a fine field (FQ world px a
   * step) with a margin as wide as the fresh water's deepest colour reaches, and a coarse one (SQ) for the sea's
   * reach offshore, so two chunks agree along their edge; smoothed up and cut by the water's own outline. */
  function bodyOps(S) {
    const M = S.M, U = unionPath(M), sea = M.coast.length ? seaPath(M) : null, box = S.box, size = 256, q = 8;
    const stages = bodyDraw(S, U, sea), out = [];
    const gw = Math.ceil(box.w / q), gh = Math.ceil(box.h / q), c = document.createElement('canvas'); c.width = gw; c.height = gh;
    const x = c.getContext('2d', { willReadFrequently: true }); x.setTransform(1 / q, 0, 0, 1 / q, -box.x / q, -box.y / q); x.fillStyle = '#fff'; x.fill(U); if (sea) x.fill(sea, 'evenodd');
    const px = x.getImageData(0, 0, gw, gh).data, wetAt = (a, b) => px[(b * gw + a) * 4 + 3] > 8;
    const any = (a0, a1, b0, b1, want) => { a0 = Math.max(0, a0); b0 = Math.max(0, b0); a1 = Math.min(gw, a1); b1 = Math.min(gh, b1); for (let b = b0; b < b1; b++) for (let a = a0; a < a1; a++) if (wetAt(a, b) === want) return true; return false; };
    const cols = Math.ceil(box.w / size), rows = Math.ceil(box.h / size), k = size / q, mw = 4, ml = Math.ceil(SEA_FADE[1] / q);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      // water in the chunk or within a bank's width of it, and (for the open sea) land within the sea's painted reach
      if (!any(i * k - mw, (i + 1) * k + mw, j * k - mw, (j + 1) * k + mw, true)) continue;
      if (sea && !any(i * k - ml, (i + 1) * k + ml, j * k - ml, (j + 1) * k + ml, false)) continue;
      const cxm = box.x + (i + .5) * size, cym = box.y + (j + .5) * size;
      const bb = [cxm - 8, cym - 8, cxm + 8, cym + 8];
      out.push({ bb, seed: 3, tag: 'water body', draw: stages.fields }, { bb, seed: 3, tag: 'water body colour', draw: stages.colour }, { bb, seed: 3, tag: 'water body draw', draw: stages.draw });
    }
    // the reflections, over the water and under its dressing (decor: it makes no chunk of its own)
    out.push({ bb: [box.x, box.y, box.x + box.w, box.y + box.h], seed: 9, decor: true, tag: 'water mirrors', draw: stages.mirrors });
    return out;
  }
  function bodyDraw(S, U, sea) {
    const M = S.M, G = window.GardenPaintGround;
    const noise = G ? G.noise : () => .5, fbm = G ? G.fbm : () => .5, SP = sea ? seaPalette(S) : null, SKY = G ? skyOf(S) : null, FO = SP ? rgbOf(SP.foam) : null;
    const toneOf = (pts, kind, b) => { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)); p.closePath(); const t = TONE[kind] || TONE.pool; return { p, b, fill: 'rgb(' + Math.round(t[0] * 255) + ',' + Math.round(t[1] * 255) + ',' + Math.round(t[2] * 255) + ')' }; };
    // a crossing strip (the water under a bridge or between stepping stones) takes the tone of the water it lies over
    const overOf = c => { const cen = c.pts.reduce((a, q) => ({ x: a.x + q.x / c.pts.length, y: a.y + q.y / c.pts.length }), { x: 0, y: 0 }); let best = null, bd = Infinity; for (const w of M.waters) { if (!hit(w.bounds, { x: c.bounds.x - 40, y: c.bounds.y - 40, w: c.bounds.w + 80, h: c.bounds.h + 80 })) continue; const d = inside(cen.x, cen.y, w.pts) ? 0 : edgeDist(cen.x, cen.y, w.pts); if (d < bd) { bd = d; best = w; } } return best; };
    const tones = M.waters.map(w => toneOf(w.pts, w.kind, w.bounds)).concat(M.crossings.filter(c => c.pts && c.pts.length > 2).map(c => { const w = overOf(c); return w ? toneOf(c.pts, w.kind, { x: c.bounds.x, y: c.bounds.y, w: c.bounds.w, h: c.bounds.h }) : null; }).filter(Boolean));
    // The work is in three stages, each its own op so a bake can stop between them (none is long enough to hold up a frame),
    // and what they find is kept per chunk: the fields and the shore lines are in world px, so a chunk painted again at
    // another sharpness only draws them again.
    const cache = new Map(), CACHE_MAX = 64, keyOf = cb => cb.join(',');
    const keep = (k, e) => { cache.delete(k); cache.set(k, e); if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value); return e; };
    function fields(cb) {
      const x0 = Math.floor((cb[0] - DMAX) / FQ) * FQ, y0 = Math.floor((cb[1] - DMAX) / FQ) * FQ, x1 = Math.ceil((cb[2] + DMAX) / FQ) * FQ, y1 = Math.ceil((cb[3] + DMAX) / FQ) * FQ, gw = (x1 - x0) / FQ, gh = (y1 - y0) / FQ, n = gw * gh;
      // the fine field: fresh water in red, the sea in green (added), so each one's own coverage can be read back
      fieldMask = fieldCanvas(fieldMask, gw, gh); const mx = fieldMask.getContext('2d', { willReadFrequently: true });
      mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.clearRect(0, 0, gw, gh); mx.setTransform(1 / FQ, 0, 0, 1 / FQ, -x0 / FQ, -y0 / FQ); mx.fillStyle = '#f00'; mx.fill(U);
      if (sea) { mx.globalCompositeOperation = 'lighter'; mx.fillStyle = '#0f0'; mx.fill(sea, 'evenodd'); mx.globalCompositeOperation = 'source-over'; }
      const src = mx.getImageData(0, 0, gw, gh).data, T = bufs(n), cov = T.a, m = T.m, sd = T.s, D = T.d, E = T.e, Fv = T.f, sc = T.c;
      let any = false; for (let i = 0; i < n; i++) { const A = src[i * 4 + 3] / 255; cov[i] = src[i * 4] / 255 * A; sc[i] = src[i * 4 + 1] / 255 * A; m[i] = cov[i] > .5 ? 1 : 0; if (m[i] || sc[i] > .5) any = true; }
      if (!any) return { empty: true, stage: 2 };
      // the one outline of all the fresh water: closed (a land corner between two basins is filled with water, round) and then
      // opened (a sharp water corner is rounded off), so no bank meets another at an angle; the sea joins it as it is
      const rc = CLOSE_R / FQ, ro = OPEN_R / FQ;
      chamfer(m, gw, gh, D); for (let i = 0; i < n; i++) sd[i] = D[i] > rc ? 1 : 0;        // land beyond the dilation
      chamfer(sd, gw, gh, D); for (let i = 0; i < n; i++) sd[i] = D[i] > rc ? 0 : 1;        // not closed water
      chamfer(sd, gw, gh, D); for (let i = 0; i < n; i++) sd[i] = D[i] > ro ? 1 : 0;        // eroded water
      chamfer(sd, gw, gh, D); for (let i = 0; i < n; i++) { const w = D[i] <= ro; Fv[i] = Math.min(1, (w === !!m[i] ? cov[i] : w ? 1 : 0) + sc[i]); }   // final, with the true edge's own coverage where it did not move, and the sea added (where the river's outline meets the coast's, their two half-covered edges make one whole: no seam of shore across a river mouth)
      for (let i = 0; i < n; i++) sd[i] = Fv[i] > .5 ? 0 : 1;
      chamfer(sd, gw, gh, D);   // D: how far inside the water, field px
      // only this chunk's own area (and a little round it) is coloured and drawn
      const gx0 = Math.max(0, Math.floor((cb[0] - 6 - x0) / FQ)), gx1 = Math.min(gw, Math.ceil((cb[2] + 6 - x0) / FQ)), gy0 = Math.max(0, Math.floor((cb[1] - 6 - y0) / FQ)), gy1 = Math.min(gh, Math.ceil((cb[3] + 6 - y0) / FQ)), cw = gx1 - gx0, chh = gy1 - gy0;
      // a light 3 x 3 smoothing there, so the shore lines found below run smooth between the field's points
      for (let y = Math.max(0, gy0 - 1); y < Math.min(gh, gy1 + 1); y++) for (let x = Math.max(0, gx0 - 1); x < Math.min(gw, gx1 + 1); x++) { let s = 0, k = 0; for (let j = -1; j <= 1; j++) { const yy = y + j; if (yy < 0 || yy >= gh) continue; for (let q = -1; q <= 1; q++) { const xx = x + q; if (xx < 0 || xx >= gw) continue; const wgt = (j || q) ? (j && q ? 1 : 2) : 4; s += Fv[yy * gw + xx] * wgt; k += wgt; } } E[y * gw + x] = s / k; }
      for (let y = Math.max(0, gy0 - 1); y < Math.min(gh, gy1 + 1); y++) for (let x = Math.max(0, gx0 - 1); x < Math.min(gw, gx1 + 1); x++) Fv[y * gw + x] = E[y * gw + x];
      return { stage: 1, x0, y0, x1, y1, gw, gh, n, gx0, gx1, gy0, gy1, cw, chh, Fv: Fv.slice(0, n), D: D.slice(0, n) };
    }
    function colour(e, cb) {
      const { x0, y0, x1, y1, gw, gh, n, gx0, gx1, gy0, gy1, cw, chh, Fv, D } = e, P = S.P, bed = rgbOf(P.bed), sh = rgbOf(P.shallow), wa = rgbOf(P.water), dp = rgbOf(P.deep);
      // the coarse field for the sea: how far offshore (to the nearest land) and how much of the water round a point is sea
      let Dc = null, Mc = null, sgw = 0, sgh = 0, sx0 = 0, sy0 = 0;
      if (sea) {
        sx0 = Math.floor((cb[0] - SEA_D) / SQ) * SQ; sy0 = Math.floor((cb[1] - SEA_D) / SQ) * SQ; sgw = Math.ceil((cb[2] + SEA_D - sx0) / SQ); sgh = Math.ceil((cb[3] + SEA_D - sy0) / SQ);
        fieldSea = fieldCanvas(fieldSea, sgw, sgh); const qx = fieldSea.getContext('2d', { willReadFrequently: true });
        qx.setTransform(1, 0, 0, 1, 0, 0); qx.globalCompositeOperation = 'source-over'; qx.clearRect(0, 0, sgw, sgh); qx.setTransform(1 / SQ, 0, 0, 1 / SQ, -sx0 / SQ, -sy0 / SQ); qx.fillStyle = '#f00'; qx.fill(U);
        qx.globalCompositeOperation = 'lighter'; qx.fillStyle = '#0f0'; qx.fill(sea, 'evenodd'); qx.globalCompositeOperation = 'source-over';
        const sp = qx.getImageData(0, 0, sgw, sgh).data, sn = sgw * sgh, Q = sbufs(sn); let anySea = false;
        for (let i = 0; i < sn; i++) { const A = sp[i * 4 + 3] / 255, g = sp[i * 4 + 1] / 255 * A; Q.s[i] = A > .5 ? 0 : 1; Q.w[i] = A; Q.m[i] = g; if (g > .02) anySea = true; }
        if (anySea) {
          Dc = chamfer(Q.s, sgw, sgh, Q.d);
          boxBlur(Q.m, sgw, sgh, MBLUR, Q.t); boxBlur(Q.m, sgw, sgh, MBLUR, Q.t); boxBlur(Q.w, sgw, sgh, MBLUR, Q.t); boxBlur(Q.w, sgw, sgh, MBLUR, Q.t);
          for (let i = 0; i < sn; i++) Q.m[i] = Q.w[i] > .004 ? Math.min(1, Q.m[i] / Q.w[i]) : 0;
          Mc = Q.m;
        }
      }
      const samp = (A, wx, wy, far) => { const fx = (wx - sx0) / SQ - .5, fy = (wy - sy0) / SQ - .5, ix = Math.max(0, Math.min(sgw - 2, Math.floor(fx))), iy = Math.max(0, Math.min(sgh - 2, Math.floor(fy))), tx = Math.max(0, Math.min(1, fx - ix)), ty = Math.max(0, Math.min(1, fy - iy)), i = iy * sgw + ix;
        let a = A[i], b = A[i + 1], c = A[i + sgw], d = A[i + sgw + 1]; if (far != null) { a = Math.min(a, far); b = Math.min(b, far); c = Math.min(c, far); d = Math.min(d, far); }
        return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty; };
      const marine = (wx, wy) => Mc ? sstep(.3, .7, samp(Mc, wx, wy)) : 0;
      // each water's tone, blurred so a brook turns into the Mere over a few strides (only this chunk's area)
      fieldTone = fieldCanvas(fieldTone, gw, gh); const tx = fieldTone.getContext('2d', { willReadFrequently: true }); tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, gw, gh); tx.setTransform(1 / FQ, 0, 0, 1 / FQ, -x0 / FQ, -y0 / FQ);
      // (each water's tone reaches a little past its own outline first, so the water of a crossing strip between two waters takes theirs:
      //  left untoned, the brook's stepping stones stood in a paler patch of water with none of the brook's shade)
      const near = tones.filter(t => t.b.x - 40 < x1 && t.b.x + t.b.w + 40 > x0 && t.b.y - 40 < y1 && t.b.y + t.b.h + 40 > y0);
      tx.lineJoin = 'round'; tx.lineWidth = 80; for (const t of near) { tx.strokeStyle = t.fill; tx.stroke(t.p); }
      for (const t of near) { tx.fillStyle = t.fill; tx.fill(t.p); }
      const ty0 = Math.max(0, gy0 - TB), ty1 = Math.min(gh, gy1 + TB), tdat = tx.getImageData(0, 0, gw, gh).data, hS = scratch('hS', n), hD = scratch('hD', n), hR = scratch('hR', n), hW = scratch('hW', n);
      for (let y = ty0; y < ty1; y++) { let sS = 0, sD = 0, sR = 0, sW = 0; const o0 = y * gw; for (let x = gx0 - 2 * TB - 1; x < gx1; x++) { const ad = x + TB, sb = x - TB - 1; if (ad >= 0 && ad < gw) { const q = (o0 + ad) * 4, w8 = tdat[q + 3] / 255; sS += tdat[q] * w8; sD += tdat[q + 1] * w8; sR += tdat[q + 2] * w8; sW += w8; } if (sb >= gx0 - TB - 1 && sb >= 0 && sb < gw) { const q = (o0 + sb) * 4, w8 = tdat[q + 3] / 255; sS -= tdat[q] * w8; sD -= tdat[q + 1] * w8; sR -= tdat[q + 2] * w8; sW -= w8; } if (x >= gx0 && x < gx1) { hS[o0 + x] = sS; hD[o0 + x] = sD; hR[o0 + x] = sR; hW[o0 + x] = sW; } } }
      const cn = cw * chh, tS = scratch('tS', cn, true), tD = scratch('tD', cn, true), tR = scratch('tR', cn, true), DS = scratch('DS', cn, true), MS = scratch('MS', cn, true), DW = scratch('DW', cn, true);
      for (let x = gx0; x < gx1; x++) { let sS = 0, sD = 0, sR = 0, sW = 0; for (let y = gy0 - 2 * TB - 1; y < gy1; y++) { const ad = y + TB, sb = y - TB - 1; if (ad >= ty0 && ad < ty1) { const q = ad * gw + x; sS += hS[q]; sD += hD[q]; sR += hR[q]; sW += hW[q]; } if (sb >= gy0 - TB - 1 && sb >= ty0 && sb < ty1) { const q = sb * gw + x; sS -= hS[q]; sD -= hD[q]; sR -= hR[q]; sW -= hW[q]; } if (y >= gy0 && y < gy1) { const j = (y - gy0) * cw + (x - gx0); tS[j] = sW > .01 ? sS / sW / 255 : 0; tD[j] = sW > .01 ? sD / sW / 255 : 0; tR[j] = sW > .01 ? sR / sW / 255 : 0; } } }
      // the colour of the water by how far it lies from the shore; its alpha is the smoothed outline itself, so the edge
      // is soft for a world pixel and then the wet line and the lap are drawn crisp over it
      const out = document.createElement('canvas'); out.width = cw; out.height = chh; const ox = out.getContext('2d'), img = ox.createImageData(cw, chh), o = img.data;
      for (let y = gy0; y < gy1; y++) { const wy = y0 + (y + .5) * FQ;
        for (let x = gx0; x < gx1; x++) { const i = y * gw + x, tj = (y - gy0) * cw + (x - gx0), j = tj * 4, al = Fv[i]; DS[tj] = -1; DW[tj] = -1; if (al <= .004) { o[j + 3] = 0; continue; }
          const wx = x0 + (x + .5) * FQ, d = Math.min(DMAX, Math.max(0, (D[i] >= 1e8 ? DMAX : D[i]) * FQ - FQ * .5));
          // broad reaches of darker and paler water, and a finer ripple of tone, so no stretch is one flat colour
          const big = fbm(wx / 260, wy / 170, 41) - .5, fine = noise(wx / 46, wy / 30, 57) - .5, run = tR[tj];
          // running water gets to its own colour within a stride of the bank (a brook is not a strip of sandy glass)
          // (the shallows widen and narrow along the shore by a slow noise: a sandy bay here, deep water close in there; one even pale
          //  band all round read as a tub's rim, and along the Mere's straight south shore as a ruled kerb)
          const sv = .45 + 1.1 * noise(wx / 120, wy / 76, 61), dv = d * (1 - (1 - run) * (1 - 1 / sv) * .85);
          const e = sstep(0, 7 - 4 * run, dv), mm = sstep(3 - 2 * run, 24 - 12 * run, dv), k = Math.min(1, Math.max(0, sstep(26, 100, d * (.75 + .5 * (sv - .45) / 1.1)) * .9 + big * .35));
          // (a running bank is wet stone and earth, not a pale sandy rim)
          const bw = run * .65, b0 = bed[0] + (STONE_WET[0] - bed[0]) * bw, b1 = bed[1] + (STONE_WET[1] - bed[1]) * bw, b2 = bed[2] + (STONE_WET[2] - bed[2]) * bw;
          let rr = b0 + (sh[0] - b0) * (.5 + .5 * e), gg = b1 + (sh[1] - b1) * (.5 + .5 * e), bb = b2 + (sh[2] - b2) * (.5 + .5 * e);
          rr += (wa[0] - rr) * mm; gg += (wa[1] - gg) * mm; bb += (wa[2] - bb) * mm;
          const kk = Math.min(1, k + tD[tj] * (1 - k) * sstep(4, 40, d)), shd = tS[tj] * .62 * (.4 + .6 * mm);
          rr += (dp[0] - rr) * kk; gg += (dp[1] - gg) * kk; bb += (dp[2] - bb) * kk;
          rr += (SHADE[0] - rr) * shd; gg += (SHADE[1] - gg) * shd; bb += (SHADE[2] - bb) * shd;
          // a fell tarn's water is stained brown-black by the peat it drains (only the tarn carries this much depth)
          const peat = sstep(.18, .5, tD[tj]) * (1 - run * .5) * (.55 + .2 * mm);   // (the gorge drains the tarn and runs peaty too, a shade lighter: it no longer turns bright cyan at the outlet)
          if (peat > .01) { rr += (PEAT[0] - rr) * peat; gg += (PEAT[1] - gg) * peat; bb += (PEAT[2] - bb) * peat; }
          let lift = 1 + big * .08 + fine * .045;
          // the current: thin pale lines running with the banks, wavering and broken, and darker water between them
          if (run > .04 && d > 2) { const ph = d * .58 + (noise(wx / 64, wy / 64, 91) - .5) * 5.5, ln = Math.max(0, Math.sin(ph)) ** 5, brk = sstep(.42, .68, noise(wx / 24, wy / 24, 93)); lift += run * (ln * brk * .16 - .035 * (1 - ln)) * sstep(2, 9, d); }
          let al2 = Math.min(1, al * 1.25), mS = 0;
          if (Mc) { mS = marine(wx, wy); MS[tj] = mS; const dS = d >= DMAX - 3 ? Math.max(d, samp(Dc, wx, wy, SEA_D / SQ) * SQ - SQ * .5) : d; DS[tj] = dS; DW[tj] = dS + (noise(wx / 58, wy / 40, 111) - .5) * 16 + (noise(wx / 17, wy / 12, 113) - .5) * 3;   // (a swell line wavers as it runs: one that follows a straight shore exactly reads as a streak)
            if (mS > .002) {
              // sand bars and channels: the shallows widen and narrow along the shore, and a finer unevenness on that
              const bar = fbm(wx / 230, wy / 160, 73) - .5, dn = Math.max(0, dS * (1 - bar * .8) + (noise(wx / 40, wy / 28, 79) - .5) * 9);
              const t0 = sstep(0, 10, dn), t1 = sstep(12, 74, dn), t2 = sstep(80, 176, dn), C = SP;
              let sr = C.edge[0] + (C.shoal[0] - C.edge[0]) * t0, sg = C.edge[1] + (C.shoal[1] - C.edge[1]) * t0, sb = C.edge[2] + (C.shoal[2] - C.edge[2]) * t0;
              sr += (C.mid[0] - sr) * t1; sg += (C.mid[1] - sg) * t1; sb += (C.mid[2] - sb) * t1;
              sr += (C.base[0] - sr) * t2; sg += (C.base[1] - sg) * t2; sb += (C.base[2] - sb) * t2;
              const sand = (1 - sstep(0, 6, dn)) * .3; sr += (C.sand[0] - sr) * sand; sg += (C.sand[1] - sg) * sand; sb += (C.sand[2] - sb) * sand;
              // the swell: two soft lighter bands a little way off the sand, the nearer brighter, each with its darker trough to seaward,
              // broken by a long noise into lengths of their own (thin stroked lines here read as dashed road markings)
              { const dw = DW[tj], b1 = sstep(.36, .62, noise(wx / 140, wy / 80, 121)), b2 = sstep(.4, .66, noise(wx / 170, wy / 96, 147)), crest = Math.exp(-(((dw - 22) / 7) ** 2)) * b1 * .17 + Math.exp(-(((dw - 50) / 9) ** 2)) * b2 * .1, trough = Math.exp(-(((dw - 31) / 6) ** 2)) * b1 * .05 + Math.exp(-(((dw - 61) / 7) ** 2)) * b2 * .03, k2 = (1 - t2 * .6);
                sr += (FO[0] - sr) * crest * k2 - sr * trough; sg += (FO[1] - sg) * crest * k2 - sg * trough; sb += (FO[2] - sb) * crest * k2 - sb * trough; }
              const sl = 1 + big * .06 + fine * .03 * (1 - t2);
              rr = rr * lift * (1 - mS) + sr * sl * mS; gg = gg * lift * (1 - mS) + sg * sl * mS; bb = bb * lift * (1 - mS) + sb * sl * mS; lift = 1;
              al2 *= 1 - mS * sstep(SEA_FADE[0], SEA_FADE[1], dS);
            } }
          rr *= lift; gg *= lift; bb *= lift;
          // the sky in the water (SKYR, by the hour): long low reflections of clouds by day, the sunset's gold and rose at dusk,
          // a cool moonlit sky at night; full on open still water and the sea, faint on running water, under trees and in peat
          if (SKY) {
            const open = (1 - mS) * mm * (1 - run * .62) * (1 - tS[tj] * .85) * (1 - tD[tj] * .45) + mS * (DS[tj] >= 0 ? sstep(6, 70, DS[tj]) : 1);
            if (open > .01) {
              const sk = fbm(wx / 300, wy / 62, 131) + (noise(wx / 120, wy / 26, 137) - .5) * .26, cl = sstep(SKY.lo, SKY.hi, sk) * SKY.a * open, hue = sstep(.35, .65, noise(wx / 520, wy / 300, 139));
              const c0 = SKY.c0[0] + (SKY.c1[0] - SKY.c0[0]) * hue, c1 = SKY.c0[1] + (SKY.c1[1] - SKY.c0[1]) * hue, c2 = SKY.c0[2] + (SKY.c1[2] - SKY.c0[2]) * hue, gl = SKY.glow * open;
              if (gl) { rr += (SKY.g[0] - rr) * gl; gg += (SKY.g[1] - gg) * gl; bb += (SKY.g[2] - bb) * gl; }
              rr += (c0 - rr) * cl; gg += (c1 - gg) * cl; bb += (c2 - bb) * cl;
            }
          }
          o[j] = Math.min(255, rr); o[j + 1] = Math.min(255, gg); o[j + 2] = Math.min(255, bb); o[j + 3] = Math.round(al2 * 255);
        } }
      ox.putImageData(img, 0, 0);
      // the shore lines, by marching squares on a field at a level: segments sorted into a few paths by what they are
      // (a still or a running bank, the sea's foam strong, middling or faint), each stroked once, so no beading
      const contour = (get, level, cls) => { const ps = [];
        for (let gy = gy0; gy < gy1 - 1; gy++) for (let gx = gx0; gx < gx1 - 1; gx++) {
          const a0 = get(gx, gy) - level, b0 = get(gx + 1, gy) - level, c0 = get(gx + 1, gy + 1) - level, d0 = get(gx, gy + 1) - level;
          const s = (a0 > 0) + (b0 > 0) + (c0 > 0) + (d0 > 0); if (s === 0 || s === 4) continue;
          const X = x0 + (gx + .5) * FQ, Y = y0 + (gy + .5) * FQ, b = cls(gx, gy, X + FQ / 2, Y + FQ / 2); if (b < 0) continue;
          const cut = [], C4 = [[X, Y, a0], [X + FQ, Y, b0], [X + FQ, Y + FQ, c0], [X, Y + FQ, d0]];
          for (let q = 0; q < 4; q++) { const A = C4[q], Bq = C4[(q + 1) % 4]; if ((A[2] > 0) !== (Bq[2] > 0)) { const t = A[2] / (A[2] - Bq[2]); cut.push(A[0] + (Bq[0] - A[0]) * t, A[1] + (Bq[1] - A[1]) * t); } }
          const p = ps[b] || (ps[b] = new Path2D()); for (let q = 0; q + 3 < cut.length; q += 4) { p.moveTo(cut[q], cut[q + 1]); p.lineTo(cut[q + 2], cut[q + 3]); }
        }
        return ps; };
      const fv = (gx, gy) => Fv[gy * gw + gx], loc = (gx, gy) => (Math.min(chh - 1, gy - gy0)) * cw + Math.min(cw - 1, gx - gx0);
      // 0 a still bank, 1 a running bank, 2 to 4 the sea's lap: strong, middling, faint (by a noise along the shore)
      // still banks change along the shore (a stretch of bare damp earth, then turf down to the water, then stones), so no pond
      // has one even rim; a fell tarn's bank is dark peat (6)
      const shoreCls = (gx, gy, X, Y) => { const ms = Mc ? marine(X, Y) : 0; if (ms > .5) { const v = noise(X / 64, Y / 44, 97); return v > .58 ? 2 : v > .4 ? 3 : 4; } const l = loc(gx, gy); if (tR[l] > .45) return 1; if (tD[l] > .4) return 6; const v = noise(X / 52, Y / 36, 99); return v > .6 ? 0 : v > .38 ? 5 : 7; };
      const outer = contour(fv, .5, shoreCls);
      // swell lines out on the sea: two broken lines a little way off the sand, the nearer one brighter, as if a wave were coming in
      if (Mc) {
        const ds = (gx, gy) => DS[loc(gx, gy)];
        // (kept off the creases where the distance from two shores meets, out of a river mouth or round a spit: a swell line there runs in a V)
        const slope = (gx, gy) => Math.hypot(ds(gx + 1, gy) - ds(gx - 1, gy), ds(gx, gy + 1) - ds(gx, gy - 1)) / (2 * FQ);
        // (and off a shore that turns sharply, round a spit's point: there the line bends into a chevron; the bend of the distance field tells)
        const bend = (gx, gy) => (ds(gx + 2, gy) + ds(gx - 2, gy) + ds(gx, gy + 2) + ds(gx, gy - 2) - 4 * ds(gx, gy)) / (4 * FQ * FQ);
        const dw = (gx, gy) => DW[loc(gx, gy)], swell = (lv, f, cut) => contour(dw, lv, (gx, gy, X, Y) => MS[loc(gx, gy)] > .96 && slope(gx, gy) > .86 && slope(gx + 1, gy + 1) > .86 && Math.abs(bend(gx, gy)) < .022 && noise(X / f, Y / (f * .62), 101 + lv) > cut ? 0 : -1)[0];
        void swell; e.s1 = e.s2 = null;   // (the swell is laid into the colour above, as soft bands)
      }
      // the wet dark line at a fresh water's edge, then the lap: a thin bright line just inside the water, a softer glow beside
      // it (fainter on running water); on the sea a line of foam where the waves run up the sand, thick and thin along the shore
      e.wet = contour(fv, .3, shoreCls); e.lap = contour(fv, .78, shoreCls);
      e.outer = outer; e.canvas = out; e.dst = [x0 + gx0 * FQ, y0 + gy0 * FQ, cw * FQ, chh * FQ]; e.stage = 2; e.Fv = e.D = null;
      return e;
    }
    function paintBody(cx, e) {
      const P = S.P, { outer, s1, s2, wet, lap } = e;
      cx.lineJoin = 'round'; cx.lineCap = 'round';
      // the bank: a damp earth band along a fresh shore (the water is laid over its inner half); the sea's sand only darkens
      // a little where the waves wet it (the shared ground already lays the tide's damp edge on the beach)
      // (by stretch: damp earth (0) and a running bank (1) carry the band; turf (5) only a thin dark seam; stones (7) a grey
      //  gravel margin; peat (6) a dark brown hag edge)
      for (const [b, col, w1, a1, w2, a2] of [[0, P.bank, 24, .24, 12, .4], [1, P.bank, 24, .24, 12, .4], [5, P.bank, 8, .14, 4, .22], [7, '#8e897a', 16, .22, 8, .34], [6, '#3c3226', 22, .34, 10, .5]]) if (outer[b]) { cx.strokeStyle = col; cx.globalAlpha = a1; cx.lineWidth = w1; cx.stroke(outer[b]); cx.globalAlpha = a2; cx.lineWidth = w2; cx.stroke(outer[b]); }
      if (SP) for (const b of [2, 3, 4]) if (outer[b]) { cx.strokeStyle = SP.wet; cx.globalAlpha = .2; cx.lineWidth = 12; cx.stroke(outer[b]); cx.globalAlpha = .22; cx.lineWidth = 5; cx.stroke(outer[b]); }
      cx.globalAlpha = 1;
      cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(e.canvas, e.dst[0], e.dst[1], e.dst[2], e.dst[3]);
      if (s1 || s2) { cx.strokeStyle = SP.foam; if (s1) { cx.globalAlpha = .16; cx.lineWidth = 6; cx.stroke(s1); cx.globalAlpha = .5; cx.lineWidth = 1.7; cx.stroke(s1); } if (s2) { cx.globalAlpha = .32; cx.lineWidth = 1.4; cx.stroke(s2); } cx.globalAlpha = 1; }
      for (const b of [0, 1, 5, 6, 7]) if (wet[b]) { cx.strokeStyle = b === 6 ? '#221c14' : mix(P.bank, '#3e3626', .5); cx.globalAlpha = b === 1 ? .45 : b === 5 ? .4 : .55; cx.lineWidth = b === 1 ? 2.6 : b === 5 ? 2.2 : 3.2; cx.stroke(wet[b]); }
      // (on still water the lap comes and goes along the shore: a whole bright ring round a pond reads as a pool's tiled edge)
      if (lap[0]) { cx.strokeStyle = P.foam; cx.globalAlpha = .14; cx.lineWidth = 6; cx.stroke(lap[0]); cx.globalAlpha = .4; cx.lineWidth = 1.9; cx.stroke(lap[0]); }
      if (lap[7]) { cx.strokeStyle = P.foam; cx.globalAlpha = .1; cx.lineWidth = 5; cx.stroke(lap[7]); cx.globalAlpha = .3; cx.lineWidth = 1.5; cx.stroke(lap[7]); }
      if (lap[5]) { cx.strokeStyle = P.foam; cx.globalAlpha = .07; cx.lineWidth = 5; cx.stroke(lap[5]); cx.globalAlpha = .16; cx.lineWidth = 1.3; cx.stroke(lap[5]); }
      if (lap[6]) { cx.strokeStyle = P.foam; cx.globalAlpha = .1; cx.lineWidth = 1.1; cx.stroke(lap[6]); }
      if (lap[1]) { cx.strokeStyle = P.foam; cx.globalAlpha = .14; cx.lineWidth = 1.2; cx.stroke(lap[1]); }
      if (SP) { cx.strokeStyle = SP.foam; for (const [b, w, a] of [[2, 3.6, .92], [3, 2.6, .66], [4, 1.7, .36]]) if (lap[b]) { cx.globalAlpha = a * .3; cx.lineWidth = w * 3.2; cx.stroke(lap[b]); cx.globalAlpha = a; cx.lineWidth = w; cx.stroke(lap[b]); } }
      cx.globalAlpha = 1;
    }
    const entry = cb => { const k = keyOf(cb); let e = cache.get(k); if (!e) e = keep(k, fields(cb)); else keep(k, e); if (e.stage < 2) colour(e, cb); return e; };
    // Reflections: whatever stands on a shore (trees, cottages, the mill, rocks, boats, the lighthouse, the reeds at the
    // falls) hangs upside down in the still water below it, mirrored about its foot, as the opening scene's water does.
    // The pictures are the world's own: every standing image whose foot lies a little way above the water (the display
    // list, read now and then while the painters finish) is drawn flipped into a small canvas once, darkened towards the
    // water's own colour, faded with depth, broken by the ripples and wavered row by row, and that canvas is laid into the
    // water's chunks under the water's dressing (lilies, stones, reeds stand over it), clipped to the water. Only the
    // pictures are copied: nothing here moves, walks or blocks.
    const REFL_OK = /^(gptree\||gpp\||gdpaint\||gpt-\d|gpv-\d)/, REFL_SKIP = /falls|mill-wheel|mill-lap|^gpw|^gdpaint-g|shaft|mote|dapple|glow|light/;
    const mirrors = [], mirrorIds = new Map(); let mirrorMB = 0;
    function mirrorScan() {
      const MK = S.mask, scene = S.scene; if (!MK || !scene || !scene.children) return [];
      const found = [];
      const visit = (o, d, ox, oy) => {
        if (!o || d > 9) return;
        if ((o.type === 'Image' || o.type === 'Sprite') && o.texture && o.frame && o.frame.cutWidth > 4) {
          const key = String(o.texture.key), h = o.displayHeight, w = Math.abs(o.displayWidth);
          if (REFL_OK.test(key) && !REFL_SKIP.test(key) && o.originY > .66 && o.alpha > .5 && !o.rotation && h > 16 && h < 760 && w < 900) {
            const x = ox + o.x, foot = oy + o.y, x0 = x - o.originX * w, hu = o.originY * h, reach = Math.max(34, Math.min(120, hu * .5));
            // the first point below the foot where the water starts, across the middle of the picture (a corner over the water is not enough)
            let y0 = -1, sea = false;
            for (let k = 0; k <= reach; k += 4) { const yy = foot + k, a = MK.at(x, yy), b = MK.at(x - w * .18, yy), c = MK.at(x + w * .18, yy); if (a && (b || c)) { y0 = yy; sea = !(a & 1); break; } }
            if (y0 >= 0) found.push({ id: key + '@' + Math.round(x) + ',' + Math.round(foot), o, key, x, x0, foot, w, h, hu, y0, sea, flip: (o.scaleX < 0) !== !!o.flipX });
          }
        }
        if (o.list) for (const c of o.list) visit(c, d + 1, ox + (o.type === 'Container' ? o.x || 0 : 0), oy + (o.type === 'Container' ? o.y || 0 : 0));
      };
      for (const c of scene.children.list) visit(c, 0, 0, 0);
      return found;
    }
    // one reflection's picture, made once: flipped, tinted, faded, broken by ripples and wavered
    function mirrorCanvas(m) {
      const P = S.P, fr = m.o.frame, src = fr.source && fr.source.image; if (!src) return null;
      const s = Math.min(1.25, 300 / Math.max(m.w, m.hu)), pad = 4, cw = Math.ceil((m.w + pad * 2) * s), ch = Math.ceil(m.hu * s);
      if (cw < 4 || ch < 4) return null;
      const flat = document.createElement('canvas'); flat.width = cw; flat.height = ch; const f = flat.getContext('2d');
      // the image's rows from its top down to its foot, upside down: the foot's row at the top of this canvas
      f.setTransform(m.flip ? -s : s, 0, 0, -s, m.flip ? cw - pad * s : pad * s, 0);
      f.drawImage(src, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, -m.hu, m.w, m.h);
      f.setTransform(1, 0, 0, 1, 0, 0);
      // still water gives back a darker, cooler picture than the thing itself, taking the water's own colour
      f.globalCompositeOperation = 'source-atop';
      f.globalAlpha = S.tod === 'night' ? .62 : .42; f.fillStyle = P.reflDeep; f.fillRect(0, 0, cw, ch);
      f.globalAlpha = .26; f.fillStyle = P.deep; f.fillRect(0, 0, cw, ch);
      // fading with depth, the far end lost in the water's sky
      f.globalAlpha = 1; f.globalCompositeOperation = 'destination-out';
      const g = f.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, 'rgba(0,0,0,.06)'); g.addColorStop(.45, 'rgba(0,0,0,.3)'); g.addColorStop(1, 'rgba(0,0,0,.92)'); f.fillStyle = g; f.fillRect(0, 0, cw, ch);
      // the ripples: thin gaps across it, more of them and longer farther from the shore
      const q = rng(hash(m.id));
      for (let y = 3 * s; y < ch; y += (2.5 + q() * 4) * s) { const t = y / ch, len = cw * (.2 + q() * .5 + t * .4), x = q() * (cw - len * .5) - len * .25; f.globalAlpha = .25 + t * .45 + q() * .2; f.fillRect(x, y, len, (.6 + q() * .8) * s); }
      f.globalCompositeOperation = 'source-over'; f.globalAlpha = 1;
      // wavered: each band of rows shifted a little sideways, so the edges ripple like a real reflection
      const out = document.createElement('canvas'); out.width = cw; out.height = ch; const o = out.getContext('2d'), band = Math.max(2, Math.round(2.5 * s));
      for (let y = 0; y < ch; y += band) { const t = y / ch, dx = (Math.sin(y / s * .23 + q() * .4) * (.7 + t * 1.6) + Math.sin(y / s * .061) * .6) * s; o.drawImage(flat, 0, y, cw, band, dx, y, cw, band); }
      flat.width = flat.height = 1;
      return { c: out, s, pad };
    }
    // a little each frame (tick): look again for reflections now and then; make the pictures of new ones and repaint their chunks
    S.mirrorKit = {
      step(now) {
        const L = S.layer; if (!L || !L.add) return;
        if (!S.mirrorQueue && now - (S.mirrorAt || -1e9) > ((S.mirrorScans || 0) < 3 ? 2500 : (S.mirrorScans || 0) < 7 ? 6000 : 30000) && (S.mirrorScans || 0) < 9) {
          S.mirrorAt = now; S.mirrorScans = (S.mirrorScans || 0) + 1;
          const list = ok(mirrorScan) || []; S.mirrorQueue = list.filter(m => !mirrorIds.has(m.id)).slice(0, Math.max(0, 140 - mirrors.length));
          if (!S.mirrorQueue.length) S.mirrorQueue = null;
          return;
        }
        const Q = S.mirrorQueue; if (!Q) return;
        const t0 = performance.now();
        while (Q.length && performance.now() - t0 < 4) {
          const m = Q.shift(); if (mirrorIds.has(m.id)) continue; const pic = ok(() => mirrorCanvas(m)); mirrorIds.set(m.id, 1); m.o = null; if (!pic) continue;
          m.pic = pic; m.bb = [m.x0 - pic.pad, m.foot, m.x0 + m.w + pic.pad, m.foot + m.hu]; mirrors.push(m); mirrorMB += pic.c.width * pic.c.height * 4 / 1048576;
          L.add({ bb: m.bb, decor: true, seed: 9, tag: 'water mirror ping', draw() {} });   // (a no-op: it only marks the chunks it touches to be painted again)
        }
        if (!Q.length) S.mirrorQueue = null;
      },
      count: () => mirrors.length, mb: () => +mirrorMB.toFixed(1),
    };
    function drawMirrors(cx, cb) {
      if (!mirrors.length) return;
      const a = S.tod === 'night' ? .5 : S.tod === 'dusk' || S.tod === 'dawn' ? .66 : .78;
      for (const m of mirrors) {
        if (m.bb[2] < cb[0] || m.bb[0] > cb[2] || m.bb[3] < cb[1] || m.bb[1] > cb[3]) continue;
        cx.save(); if (m.sea && sea) cx.clip(sea, 'evenodd'); else cx.clip(U);
        cx.globalAlpha = a * (m.sea ? .55 : 1); cx.drawImage(m.pic.c, m.x0 - m.pic.pad, m.foot, m.w + m.pic.pad * 2, m.hu);
        cx.restore();
      }
      cx.globalAlpha = 1;
    }
    return {
      fields(B, r, cb) { const k = keyOf(cb); if (!cache.has(k)) keep(k, fields(cb)); },
      colour(B, r, cb) { entry(cb); },
      draw(B, r, cb) { const e = entry(cb); if (!e.empty) paintBody(B.cx, e); },
      mirrors(B, r, cb) { drawMirrors(B.cx, cb); },
    };
  }
  // The sea: what this layer paints beyond the coast is let go, hard for the banks, softly for a river's own water,
  // which runs on out into the sea and fades there in a widening plume, so a river mouth opens into the sea with no
  // corner where the coast line crosses it.
  function seaPath(M) { const a = M.all, p = new Path2D(); p.rect(a.x - 400, a.y - 400, a.x1 - a.x + 800, a.y1 - a.y + 800); for (const loop of M.coast) { p.moveTo(loop[0].x, loop[0].y); for (let i = 1; i < loop.length; i++) p.lineTo(loop[i].x, loop[i].y); p.closePath(); } return p; }
  function seaCutOps(S) {
    const M = S.M; if (!M.coast.length) return { hard: null, plume: [] };
    const sea = seaPath(M), a = M.all, bb = [a.x - 8, a.y - 8, a.x1 + 8, a.y1 + 8], PL = 170;
    const hard = { bb, seed: 5, decor: true, tag: 'water sea-cut', draw(B) { const cx = B.cx; cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = '#000'; cx.fill(sea, 'evenodd'); } };
    // the river's own water spreading into the sea from its mouth: a soft pool of its colour over the coast's point,
    // so the line where the land meets the sea across the river is lost in water, then a fan out along the current
    const soft = (cx, x, y, rx, ry, rot, col, stops) => { cx.save(); cx.translate(x, y); cx.rotate(rot); cx.scale(1, ry / rx); const g = cx.createRadialGradient(0, 0, 0, 0, 0, rx), c = rgbOf(col); for (const [t, al] of stops) g.addColorStop(t, `rgba(${c[0]},${c[1]},${c[2]},${al})`); cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, rx, 0, Math.PI * 2); cx.fill(); cx.restore(); };
    const plume = M.mouths.map((m, i) => ({ bb: [m.x - PL * 1.5, m.y - PL * 1.5, m.x + PL * 1.5, m.y + PL * 1.5], seed: 7 + i, tag: 'water mouth', draw(B) {
      const cx = B.cx, P = S.P, rot = Math.atan2(m.ty, m.tx), hw = m.hw; cx.save(); cx.clip(sea, 'evenodd');
      soft(cx, m.x - m.tx * hw * .7, m.y - m.ty * hw * .7, hw * 2.3, hw * 2.3, rot, P.water, [[0, .95], [.45, .85], [.8, .35], [1, 0]]);
      soft(cx, m.x + m.tx * PL * .32, m.y + m.ty * PL * .32, PL * .85, hw * 1.9, rot, P.water, [[0, .7], [.6, .3], [1, 0]]);
      soft(cx, m.x + m.tx * PL * .12, m.y + m.ty * PL * .12, PL * .5, hw * .9, rot, P.deep, [[0, .35], [1, 0]]);
      // the current's silt line, a pale tongue curling off each bank
      cx.translate(m.x, m.y); cx.rotate(rot); cx.globalAlpha = .2; cx.strokeStyle = P.shallow; cx.lineCap = 'round'; cx.lineWidth = 5;
      cx.beginPath(); cx.moveTo(-hw * .4, -hw * 1.05); cx.quadraticCurveTo(PL * .4, -hw * 1.5, PL * .75, -hw * .5); cx.stroke();
      cx.beginPath(); cx.moveTo(-hw * .4, hw * 1.1); cx.quadraticCurveTo(PL * .35, hw * 1.6, PL * .65, hw * .7); cx.stroke();
      cx.restore();
    } }));
    return { hard, plume };
  }

  /* ---------- the still picture of one water, as a list of features ---------- */
  // Each feature: { b: bounds, draw(cx, P, B) } where B is a tiny brush. Random
  // choices are made here, once per water, so every chunk paints the same thing.
  function features(W, f, pts, kind, ccw, river, r, pres, neighbours, onLand) {
    const out = [], loop = pts, n = pts.length, all = boundsOf(pts, 40);
    // Mask only shore paint covered by another basin or crossing strip.
    // Independent clips subtract their union; positive support holes restore
    // dry ground even where a bridge end extends beyond its water contour.
    const shoreClips = (neighbours || []).map(neighbour => {
      const cut = new Path2D(); cut.rect(all.x - 64, all.y - 64, all.w + 128, all.h + 128);
      const ring = (poly, positive) => {
        const points = (signedArea(poly) > 0) === positive ? poly : poly.slice().reverse();
        cut.moveTo(points[0].x, points[0].y); for (let i = 1; i < points.length; i++) cut.lineTo(points[i].x, points[i].y); cut.closePath();
      };
      ring(neighbour.pts, false); for (const hole of neighbour.holes || []) ring(hole, true);
      return cut;
    });
    // Bank garnish belongs to its shoreline root. Reject roots inside joined
    // water after their random choices, so reed tops cannot survive as clipped
    // fragments and true outer-bank details keep their existing placement.
    const shoreCovered = (x, y) => !onLand(x, y) || (neighbours || []).some(neighbour => inside(x, y, neighbour.pts) && !(neighbour.holes || []).some(hole => inside(x, y, hole)));
    let tag = 'bank'; const add = (b, draw) => {
      const mask = shoreClips.length && (tag === 'bank' || tag === 'shallow' || tag === 'lap');
      out.push({ b, tag, draw: mask ? (cx, C, ctx) => { cx.save(); for (const cut of shoreClips) cx.clip(cut); draw(cx, C, ctx); cx.restore(); } : draw });
    };
    // outward normal at each boundary vertex (screen px)
    const norm = i => { const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return ccw ? { x: dy / L, y: -dx / L } : { x: -dy / L, y: dx / L }; };
    const pathOf = () => { const p = new Path2D(); p.moveTo(loop[0].x, loop[0].y); for (let i = 1; i < n; i++) p.lineTo(loop[i].x, loop[i].y); p.closePath(); return p; };
    const P = pathOf(), river_ = kind === 'river' || kind === 'gorge' || kind === 'brook';
    // Routes cut rivers into closed basins. Where retained crossing water
    // actually joins them, closing edges remain fill/clip authority only.
    // The painter's shared span prevents nearby real banks losing their edges.
    let bankP = P;
    const spanOf = window.GardenPaintVale && GardenPaintVale.crossingWaterSpan;
    const mouths = new Set(), bridges = W.v >= 5 && river && spanOf ? (pres.crossings || []).filter(c => ['hump-bridge', 'footbridge', 'stepping-stones'].includes(c.kind) && c.over === river.id).map(c => spanOf(pres, c, gardenIslandBaseCell)).filter(Boolean) : [];
    if (bridges.length) for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], dx = b.x - a.x, dy = b.y - a.y;
      for (let j = 1; j < river.pts.length; j++) {
        const c = river.pts[j - 1], d = river.pts[j], vx = d.x - c.x, vy = d.y - c.y, den = dx * vy - dy * vx;
        if (Math.abs(den) < 1e-8) continue;
        const qx = c.x - a.x, qy = c.y - a.y, t = (qx * vy - qy * vx) / den, u = (qx * dy - qy * dx) / den;
        if (t < 0 || t > 1 || u < 0 || u > 1) continue;
        if (bridges.some(span => {
          const s = span.Ln.cum[j - 1] + u * (span.Ln.cum[j] - span.Ln.cum[j - 1]);
          return s >= span.s0 && s <= span.s1;
        })) { mouths.add(i); break; }
      }
    }
    if (mouths.size) {
      bankP = new Path2D(); const start = (mouths.values().next().value + 1) % n; let pen = false;
      for (let k = 0; k < n; k++) {
        const i = (start + k) % n, a = pts[i], b = pts[(i + 1) % n];
        if (mouths.has(i)) { pen = false; continue; }
        if (!pen) bankP.moveTo(a.x, a.y);
        bankP.lineTo(b.x, b.y); pen = true;
      }
    }
    const big = kind === 'mere' || kind === 'tarn';
    // 1. The bank: a damp earth band outside the water, darker at the waterline (the body paints it now, along the
    //    one outline of all the water; this basin's own band is kept for a painter without the body).
    tag = 'bankband'; add(all, (cx, C) => { cx.lineJoin = 'round'; cx.strokeStyle = C.bank; cx.globalAlpha = .28; cx.lineWidth = river_ ? 22 : 30; cx.stroke(bankP); cx.globalAlpha = .5; cx.lineWidth = river_ ? 12 : 16; cx.stroke(bankP); cx.globalAlpha = .55; cx.strokeStyle = mix(C.bank, '#3e3626', .45); cx.lineWidth = 5; cx.stroke(bankP); cx.globalAlpha = 1; });
    tag = 'bank';
    // pebbles and grass lobes on the land side of the waterline, by the stretch of bank the body paints there (the same
    // noise: stones where it lays a gravel margin, turf where it lays none), so a pond has no even ring of pebbles
    const Gk = window.GardenPaintGround, bankNoise = (x, y) => Gk && Gk.noise ? Gk.noise(x / 52, y / 36, 99) : .5, fell = kind === 'tarn';
    for (let i = 0; i < n; i += 1) {
      const a = pts[i], nn = norm(i), seg = Math.hypot(pts[(i + 1) % n].x - a.x, pts[(i + 1) % n].y - a.y), steps = Math.max(1, Math.round(seg / 12)); if (seg < 12 && r() > seg / 12) continue;
      for (let k = 0; k < steps; k++) {
        const t = k / steps, b = pts[(i + 1) % n], x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, roll = r(), v = river_ ? .5 : bankNoise(x, y), stony = v < .38, turf = v >= .38 && v <= .6;
        const pPeb = fell ? .1 : river_ ? .3 : stony ? .66 : turf ? .05 : .16, pGrass = fell ? .5 : turf ? .62 : stony ? .08 : .3;
        if (roll < pPeb) { const o = 3 + r() * (stony ? 11 : 8), sx = x + nn.x * o, sy = y + nn.y * o, rx = 1.4 + r() * r() * (stony ? 6 : 2.8), d = D().blob(r, sx, sy, rx, rx * .62, 6, .3), d2 = D().ell(sx - rx * .3, sy - rx * .25, rx * .45, rx * .25); const tone = r(); if (!mouths.has(i) && !shoreCovered(x, y)) add({ x: sx - 9, y: sy - 9, w: 18, h: 18 }, (cx, C) => { cx.fillStyle = tone < .35 ? '#8e8674' : tone < .7 ? '#a49b86' : '#bcb39c'; cx.fill(P2(d)); cx.fillStyle = '#ddd6c2'; cx.globalAlpha = .6; cx.fill(P2(d2)); cx.globalAlpha = 1; }); }
        else if (roll < pPeb + pGrass) { const o = (turf ? 4 : 10) + r() * 10, sx = x + nn.x * o, sy = y + nn.y * o, d = D().blob(r, sx, sy, 7 + r() * 9, 3 + r() * 3, 7, .5), light = r() < .5; if (!mouths.has(i) && !shoreCovered(x, y)) add({ x: sx - 18, y: sy - 8, w: 36, h: 16 }, (cx, C) => { cx.globalAlpha = fell ? .6 : .55; cx.fillStyle = fell ? (light ? '#6e5a5e' : '#5a5a3a') : light ? mix(C.grass, '#c8d08a', .25) : C.grass; cx.fill(P2(d)); cx.globalAlpha = 1; }); }
      }
    }
    tag = 'fill';
    // 2. The water: base colour, then depth (paler shallows round the edge, a darker core).
    add(all, (cx, C) => {
      cx.save(); cx.clip(P);
      cx.fillStyle = C.water; cx.fillRect(all.x, all.y, all.w, all.h);
      cx.restore();
    });
    tag = 'deep';
    // the deep: lobed darker water away from the shore
    if (!river_) {
      for (let i = 0; i < (big ? 26 : 8); i++) {
        let x = 0, y = 0, tries = 0; do { x = all.x + r() * all.w; y = all.y + r() * all.h; tries++; } while (tries < 30 && !(inside(x, y, pts) && edgeDist(x, y, pts) > (big ? 70 : 30)));
        if (tries >= 30) continue; const rx = (big ? 70 : 30) + r() * (big ? 90 : 30), d = D().blob(r, x, y, rx, rx * .45, 9, .45);
        add({ x: x - rx, y: y - rx, w: rx * 2, h: rx * 2 }, (cx, C) => { cx.save(); cx.clip(P); cx.globalAlpha = .22; cx.fillStyle = C.deep; cx.fill(P2(d)); cx.restore(); });
      }
    }
    tag = 'channel';
    // a river's channel: the deep line down its middle, wandering a little
    if (river_ && river) {
      const L = river, seg = [], hwx = river.hw * W.cellW * (kind === 'gorge' ? .55 : .5);
      add(all, (cx, C) => {
        cx.save(); cx.clip(P); cx.lineJoin = 'round'; cx.lineCap = 'round';
        const stroke = (w, col, a, dy) => { cx.beginPath(); cx.moveTo(L.pts[0].x, L.pts[0].y + (dy || 0)); for (const q of L.pts) cx.lineTo(q.x, q.y + (dy || 0)); cx.strokeStyle = col; cx.globalAlpha = a; cx.lineWidth = w; cx.stroke(); };
        stroke(hwx * 2.2, C.deep, kind === 'gorge' ? .45 : .28); stroke(hwx * 1.2, C.deep, kind === 'gorge' ? .4 : .26); stroke(hwx * .5, mix(C.deep, '#203040', .3), .2);
        cx.globalAlpha = 1; cx.restore();
      });
      void seg;
    }
    // shallows: wide soft strokes of the shallow colour inside the edge, then a sandy bed showing through
    tag = 'shallow';
    // one stroke per feature, so a bake can stop between them
    for (const [w, a, bed] of (river_ ? [[30, .3], [14, .45]] : [[90, .2], [44, .32], [18, .5]]).concat([[river_ ? 8 : 12, .22, true]])) add(all, (cx, C) => { cx.save(); cx.clip(P); cx.lineJoin = 'round'; cx.strokeStyle = bed ? C.bed : C.shallow; cx.globalAlpha = a; cx.lineWidth = w; cx.stroke(bankP); cx.globalAlpha = 1; cx.restore(); });
    tag = 'refl';
    // 3. The far bank's reflection: wherever the shore lies above the water, its
    //    trees and reeds hang down into it in dark lobes (light from the sky between).
    for (let i = 0, acc = 0; i < n; i++) { acc += Math.hypot(pts[(i + 1) % n].x - pts[i].x, pts[(i + 1) % n].y - pts[i].y); if (acc < (river_ ? 14 : 20)) continue; acc = 0;
      const nn = norm(i); if (nn.y > -.35) continue; const a = pts[i];
      if (r() < (river_ ? .45 : .2)) continue;
      const deep = (river_ ? 10 : 16) + r() * (river_ ? 14 : 34), rx = (river_ ? 10 : 16) + r() * (river_ ? 10 : 22), x = a.x + (r() - .5) * 8, y = a.y + deep * .55;
      const d = D().blob(r, x, y, rx, deep * .62, 8, .45), d2 = D().blob(r, x + (r() - .5) * rx * .5, y - deep * .2, rx * .55, deep * .4, 7, .4);
      if (!mouths.has(i) && !shoreCovered(a.x, a.y)) { void d; void d2; const dx = (r() - .5) * rx * .5; add({ x: x - rx * 1.3 - 4, y: a.y - 6, w: rx * 2.6 + 8, h: deep * 1.8 + 12 }, (cx, C) => {
        // soft, hanging down from the shore: the tree or reed bed above, upside down, fading into the water's own sky
        cx.save(); cx.clip(P); const lobe = (cx0, cy0, rxx, ryy, col, al) => { cx.save(); cx.translate(cx0, cy0); cx.scale(1, ryy / rxx); const g = cx.createRadialGradient(0, -rxx * .35, 0, 0, -rxx * .2, rxx); const c = rgbOf(col); g.addColorStop(0, 'rgba(' + c + ',' + al + ')'); g.addColorStop(.6, 'rgba(' + c + ',' + al * .55 + ')'); g.addColorStop(1, 'rgba(' + c + ',0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, rxx, 0, Math.PI * 2); cx.fill(); cx.restore(); };
        lobe(x, y, rx * 1.25, deep * .9, C.refl, .3); lobe(x + dx, y - deep * .15, rx * .7, deep * .6, C.reflDeep, .26); cx.restore(); }); }
    }
    tag = 'sky';
    // 4. Sky streaks: on still water long horizontal wind lines, on running water
    //    short pale dashes along the current.
    if (!river_) {
      // (a dark fell tarn holds fewer and fainter streaks of sky than the open Mere: a tarn full of them read as stripes)
      for (let i = 0; i < (kind === 'tarn' ? 18 : big ? 40 : 10); i++) {
        let x = 0, y = 0, tries = 0; do { x = all.x + r() * all.w; y = all.y + r() * all.h; tries++; } while (tries < 30 && !(inside(x, y, pts) && edgeDist(x, y, pts) > 18));
        // (each a soft streak, faded at both ends and a little tilted, of its own length and strength: hard-ended white ellipses
        //  in even rows read as stripes painted on glass)
        if (tries >= 30) continue; const rx = 16 + r() * r() * (big ? 110 : 34), ry = .8 + r() * 1.4, hi = r() < .25, tilt = (r() - .5) * .05, k = .55 + r() * .45, off = (r() - .5) * .5;
        add({ x: x - rx, y: y - 6, w: rx * 2, h: 12 }, (cx, C) => { cx.save(); cx.clip(P); cx.translate(x, y); cx.rotate(tilt); const col = rgbOf(hi ? C.skyHi : C.sky), g = cx.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, 'rgba(' + col + ',0)'); g.addColorStop(.5 + off * .5, 'rgba(' + col + ',1)'); g.addColorStop(1, 'rgba(' + col + ',0)'); cx.fillStyle = g;
          const a = (hi ? .46 : .3) * k * (C.warm || 1) * (kind === 'tarn' ? .38 : 1); cx.globalAlpha = a * .35; cx.beginPath(); cx.ellipse(0, .4, rx * 1.05, ry * 2.6, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = a; cx.beginPath(); cx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); cx.fill(); cx.restore(); });
      }
      // a broad pale sky sheen in the open middle (the brightest thing in the picture)
      const c0 = { x: all.x + all.w * .45, y: all.y + all.h * .5 };
      add(all, (cx, C) => { cx.save(); cx.clip(P); const g = cx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, all.w * .42); g.addColorStop(0, C.sky); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.globalAlpha = kind === 'tarn' ? .14 : .28; cx.fillStyle = g; cx.save(); cx.translate(c0.x, c0.y); cx.scale(1, .5); cx.translate(-c0.x, -c0.y); cx.fillRect(all.x, all.y - all.h, all.w, all.h * 3); cx.restore(); cx.restore(); });
    } else if (river) {
      for (let s = r() * 30; s < river.len; s += 16 + r() * 22) {
        const q = at(river, s), lat = (r() - .5) * 1.3 * river.hw, x = q.x - q.ty * lat * W.cellW * .9, y = q.y + q.tx * lat * W.cellH * .9, len = 2.5 + r() * 4, ang = Math.atan2(q.ty, q.tx), hi = r() < .35;   // (short: long pale dashes along a river read as rain)
        if (!onLand(x, y)) continue;
        add({ x: x - len, y: y - len, w: len * 2, h: len * 2 }, (cx, C) => { cx.save(); cx.clip(P); cx.translate(x, y); cx.rotate(ang); cx.globalAlpha = hi ? .36 : .22; cx.fillStyle = hi ? C.skyHi : C.sky; cx.beginPath(); cx.ellipse(0, 0, len, 1.1, 0, 0, Math.PI * 2); cx.fill(); cx.restore(); });
      }
    }
    tag = 'riffle';
    // 5. Riffles and stones on running water: pale chevrons across the current
    //    where it runs shallow, with mossy stones breaking it (more in the gorge).
    if (river_ && river) {
      const rate = kind === 'gorge' ? .55 : kind === 'brook' ? .3 : .16;
      for (let s = 20 + r() * 40; s < river.len; s += 26 + r() * 40) {
        if (r() > rate) continue;
        const q = at(river, s), lat = (r() - .5) * 1.1 * river.hw, x = q.x - q.ty * lat * W.cellW * .8, y = q.y + q.tx * lat * W.cellH * .8;
        if (!inside(x, y, pts) || !onLand(x, y)) continue;
        const rx = (kind === 'gorge' ? 6 : 4) + r() * 7, sd = D().blob(r, x, y, rx, rx * .6, 7, .35), hl = D().blob(r, x - rx * .3, y - rx * .3, rx * .5, rx * .28, 6, .3), moss = D().blob(r, x - rx * .1, y - rx * .45, rx * .6, rx * .22, 6, .5), ang = Math.atan2(q.ty, q.tx), wake = 3 + r() * 5;   // (a short wake: long trailing lines off a pale ring read as jellyfish)
        add({ x: x - 30, y: y - 30, w: 60, h: 60 }, (cx, C) => {
          // the V of white water downstream of the stone, then the stone itself
          cx.save(); cx.translate(x, y); cx.rotate(ang); cx.globalAlpha = .26; cx.strokeStyle = C.foam; cx.lineWidth = 1.1; cx.lineCap = 'round';
          cx.beginPath(); cx.moveTo(rx * .6, -rx * .5); cx.quadraticCurveTo(rx + wake * .5, -rx * .7, rx + wake, -rx * 1.2); cx.moveTo(rx * .6, rx * .5); cx.quadraticCurveTo(rx + wake * .5, rx * .7, rx + wake, rx * 1.2); cx.stroke();
          cx.globalAlpha = .35; cx.fillStyle = C.foam; cx.beginPath(); cx.ellipse(-rx * .9, 0, 2.5, rx * .8, 0, 0, Math.PI * 2); cx.fill(); cx.restore();
          cx.fillStyle = '#6f6a5c'; cx.fill(P2(sd)); cx.globalAlpha = .9; cx.fillStyle = '#9c9580'; cx.fill(P2(hl)); cx.globalAlpha = .8; cx.fillStyle = C.moss; cx.fill(P2(moss)); cx.globalAlpha = 1;
        });
      }
    }
    tag = 'bed';
    // 4b. The bed in the shallows: clusters of pebbles and the odd larger stone seen through clear water a stride inside the
    //     shore, softer and bluer the deeper they lie; now and then one breaks the surface, wet and dark at the waterline.
    //     Thickest on a fell tarn and in running water, fewer on the Mere's open bays. From the basin's own outline.
    if (kind !== 'spring') {
      const per = kind === 'tarn' ? 16 : river_ ? 20 : kind === 'mere' ? 30 : 22, seedB = hash(f.id + 'bed');
      for (let i = 0, acc = 0; i < n; i++) { acc += Math.hypot(pts[(i + 1) % n].x - pts[i].x, pts[(i + 1) % n].y - pts[i].y); if (acc < per) continue; acc = 0;
        if (mouths.has(i) || shoreCovered(pts[i].x, pts[i].y)) continue;
        const gate = ((Math.imul(i + (seedB & 1023), 2246822519) >>> 0) % 100) / 100; if (gate < (kind === 'mere' ? .45 : .25)) continue;
        const a = pts[i], nn = norm(i), stones = [], cnt = 2 + Math.floor(r() * 5);
        for (let k = 0; k < cnt; k++) { const o = 4 + r() * (river_ ? 9 : 15), along = (r() - .5) * 16, x = a.x - nn.x * o - nn.y * along, y = a.y - nn.y * o + nn.x * along, big = r() < (kind === 'tarn' || kind === 'gorge' ? .22 : .1);
          if (!inside(x, y, pts)) continue; const rr = big ? 3.5 + r() * 4 : 1.2 + r() * 2.2; stones.push([x, y, rr, Math.min(1, o / 18), big && o < 9 && r() < .6, r()]); }
        if (!stones.length) continue;
        add({ x: a.x - 32, y: a.y - 32, w: 64, h: 64 }, (cx, C) => { cx.save(); cx.clip(P);
          for (const [x, y, rr, deep, wet, t] of stones) {
            const body = mix(mix(C.bed, t < .5 ? '#4e4a3e' : '#5e5848', .55 + t * .2), C.deep, deep * .5), top = mix(C.bed, C.shallow, .3 + deep * .5);
            cx.globalAlpha = wet ? .95 : .62 - deep * .3; cx.fillStyle = body; cx.beginPath(); cx.ellipse(x, y, rr, rr * .62, 0, 0, Math.PI * 2); cx.fill();
            cx.globalAlpha = wet ? .85 : .28 - deep * .16; cx.fillStyle = wet ? mix(C.bed, '#e8e0c8', .5) : top; cx.beginPath(); cx.ellipse(x - rr * .28, y - rr * .22, rr * .48, rr * .26, 0, 0, Math.PI * 2); cx.fill();
            if (wet) { cx.globalAlpha = .5; cx.strokeStyle = C.foam; cx.lineWidth = .9; cx.beginPath(); cx.ellipse(x, y + rr * .12, rr * 1.15, rr * .7, 0, .15, Math.PI - .15); cx.stroke(); }
          }
          cx.restore(); cx.globalAlpha = 1; });
      }
    }
    tag = 'bar';
    // 4c. Point bars: on the inside of each of the river's bends the current slackens and drops its gravel, a pale shoal
    //     reaching in from the bank with a few stones on it; the outside of the bend keeps its deep water. From the line.
    if ((kind === 'river' || kind === 'brook') && river) {
      const hwp = river.hw * (W.cellW + W.cellH) / 2, step = kind === 'brook' ? 22 : 34;
      for (let s = step + 6; s < river.len - step - 6; s += 12) {
        const a = at(river, s - step), b = at(river, s + step), c = at(river, s), turn = a.tx * b.ty - a.ty * b.tx; if (Math.abs(turn) < .16) continue;
        const side = Math.sign(turn), nx = -c.ty * side, ny = c.tx * side, x = c.x + nx * hwp * .58, y = c.y + ny * hwp * .58; if (!inside(x, y, pts) || !onLand(x, y)) continue;
        const len = step * (1.1 + Math.min(1, Math.abs(turn)) * .8), wid = hwp * (.38 + Math.min(.3, Math.abs(turn) * .3)), ang = Math.atan2(c.ty, c.tx), peb = [];
        for (let k = 0; k < 9; k++) peb.push([(r() - .5) * len * 1.2, (r() - .2) * wid * .8 * -1, 1 + r() * 1.8, r()]);
        add({ x: x - len * 1.4, y: y - len * 1.4, w: len * 2.8, h: len * 2.8 }, (cx, C) => {
          cx.save(); cx.clip(P); cx.translate(x, y); cx.rotate(ang); cx.scale(1, side);
          const bc = rgbOf(mix(C.bed, '#d8cca6', .25)), cy1 = .35 * len / 1.15;
          cx.save(); cx.scale(1, wid / len * 1.15); const g = cx.createRadialGradient(0, cy1, 0, 0, cy1, len);
          g.addColorStop(0, 'rgba(' + bc + ',.55)'); g.addColorStop(.5, 'rgba(' + bc + ',.3)'); g.addColorStop(1, 'rgba(' + bc + ',0)');
          cx.fillStyle = g; cx.beginPath(); cx.arc(0, cy1, len, 0, Math.PI * 2); cx.fill(); cx.restore();
          for (const [px, py, pr, t] of peb) { cx.globalAlpha = .5; cx.fillStyle = t < .5 ? '#7c7462' : '#968c76'; cx.beginPath(); cx.ellipse(px, py + wid * .4, pr, pr * .6, 0, 0, Math.PI * 2); cx.fill(); }
          cx.restore(); cx.globalAlpha = 1; });
        s += step * 2.4;   // one bar a bend
      }
    }
    tag = 'margin';
    // 4d. The river's margins: on its straight reaches the river was one even width between two parallel banks (a drain, not a
    //     lowland river). Every so often, on alternate sides, a bed of reeds and sedge or a gravel shoal reaches out from the
    //     bank into the shallows, so the open water narrows and widens and the banks never run parallel for long. Inside the
    //     water's own outline (nothing to walk on is invented), from the river's line.
    if ((kind === 'river' || kind === 'brook') && river) {
      const hwp = river.hw * (W.cellW + W.cellH) / 2, per = kind === 'brook' ? 96 : 150; let side = r() < .5 ? -1 : 1;
      for (let s = per * (.3 + r() * .5); s < river.len - 40; s += per * (.65 + r() * .7)) {
        side = -side; const c = at(river, s), nx = -c.ty * side, ny = c.tx * side; if (!inside(c.x, c.y, pts) || !onLand(c.x, c.y)) continue;
        // (the bank as painted: the basin's own outline, which is wider than the line's half width on the lower river)
        let bd = 0; for (let d = 4; d < 260; d += 4) if (!inside(c.x + nx * d, c.y + ny * d, pts)) { bd = d - 3; break; } if (bd < 12) continue;
        const bx = c.x + nx * bd, by = c.y + ny * bd; if (!onLand(bx + nx * 6, by + ny * 6) || shoreCovered(bx + nx * 6, by + ny * 6)) continue;
        const reach = bd * (.28 + r() * .24), len = (kind === 'brook' ? 22 : 34) + r() * (kind === 'brook' ? 26 : 50), ang = Math.atan2(c.ty, c.tx), reedy = kind === 'brook' || r() < .62, peb = [], clump = [];
        for (let k = 0; k < 12; k++) peb.push([(r() - .5) * len * 1.3, -r() * reach * .9, .9 + r() * 1.8, r()]);
        if (reedy) { const ids = ['plant.reed', 'plant.proof-fleet-rush', 'plant.bulrush', 'plant.reed']; for (let k = 0, cnt = 4 + Math.floor(r() * 5); k < cnt; k++) { const u = (r() - .5) * len * 1.1, v = -r() * reach * .75; clump.push([bx + Math.cos(ang) * u - Math.sin(ang) * v * side, by + Math.sin(ang) * u + Math.cos(ang) * v * side, ids[Math.floor(r() * ids.length)], r() < .5 ? 0 : 1, 22 + r() * 16]); } clump.sort((p, q) => p[1] - q[1]); }
        add({ x: bx - len * 1.6 - 60, y: by - len * 1.6 - 90, w: len * 3.2 + 120, h: len * 3.2 + 150 }, (cx, C, ctx) => {
          cx.save(); cx.clip(P); cx.translate(bx, by); cx.rotate(ang); cx.scale(1, side);
          // the shallow ground the margin stands in: mud and silt under reeds, pale gravel on a shoal, fading into the water
          const col = rgbOf(reedy ? mix(C.bank, C.grass, .25) : mix(C.bed, '#d8cca6', .3)), cy1 = -reach * .35;
          cx.save(); cx.scale(1, reach / len); const g = cx.createRadialGradient(0, cy1 * len / reach, 0, 0, cy1 * len / reach, len); g.addColorStop(0, 'rgba(' + col + ',' + (reedy ? .7 : .6) + ')'); g.addColorStop(.55, 'rgba(' + col + ',' + (reedy ? .45 : .32) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(0, cy1 * len / reach, len, 0, Math.PI * 2); cx.fill(); cx.restore();
          // a lap of light along its water side
          cx.globalAlpha = .35; cx.strokeStyle = C.foam; cx.lineWidth = 1.2; cx.beginPath(); cx.ellipse(0, -reach * .25, len * .62, reach * .72, 0, Math.PI * 1.15, Math.PI * 1.85); cx.stroke(); cx.globalAlpha = 1;
          if (!reedy) for (const [px, py, pr, t] of peb) { cx.globalAlpha = .55; cx.fillStyle = t < .5 ? '#7c7462' : '#988e78'; cx.beginPath(); cx.ellipse(px, py, pr, pr * .6, 0, 0, Math.PI * 2); cx.fill(); }
          cx.restore(); cx.globalAlpha = 1;
          if (reedy) for (const [x, y, id, v, h] of clump) ctx.stamp(id, v, h, x, y);
        });
        if (reedy) out[out.length - 1].needs = clump.map(q => [q[2], q[3], q[4]]);
      }
    }
    tag = 'crag';
    // 4e. The gorge's own rocks: every so often, from alternate banks, a cluster of wet boulders juts into the stream, with a dark
    //     pool of shade under it and white water wrapped round its upstream side, so the channel narrows and widens and the two
    //     banks never run parallel (one even width between straight banks read as a concrete channel). Inside the water's outline.
    if (kind === 'gorge' && river) {
      let side = r() < .5 ? -1 : 1;
      for (let s = 30 + r() * 40; s < river.len - 24; s += 38 + r() * 56) {
        side = -side; const c = at(river, s), nx = -c.ty * side, ny = c.tx * side; if (!inside(c.x, c.y, pts) || !onLand(c.x, c.y)) continue;
        let bd = 0; for (let d = 3; d < 120; d += 3) if (!inside(c.x + nx * d, c.y + ny * d, pts)) { bd = d - 2; break; } if (bd < 8) continue;
        const reach = bd * (.4 + r() * .35), stones = [], cnt = 3 + Math.floor(r() * 4), bx = c.x + nx * bd, by = c.y + ny * bd, ang = Math.atan2(c.ty, c.tx);
        for (let k = 0; k < cnt; k++) { const v = r(); stones.push([(r() - .5) * 30, -v * reach, 4 + r() * 6 + (1 - v) * 4, r()]); }
        stones.sort((p, q) => q[1] - p[1]);
        add({ x: bx - 60, y: by - 60, w: 120, h: 120 }, (cx, C) => {
          cx.save(); cx.clip(P); cx.translate(bx, by); cx.rotate(ang); cx.scale(1, side);
          const g = cx.createRadialGradient(4, -reach * .5, 0, 4, -reach * .5, 30); g.addColorStop(0, 'rgba(22,34,32,.32)'); g.addColorStop(1, 'rgba(22,34,32,0)'); cx.fillStyle = g; cx.beginPath(); cx.ellipse(6, -reach * .45, 34, reach * .9 + 6, 0, 0, Math.PI * 2); cx.fill();
          for (const [u, v, rr, t] of stones) {
            cx.globalAlpha = .42; cx.fillStyle = '#18221f'; cx.beginPath(); cx.ellipse(u + 2.5, v + 1.5, rr * 1.1, rr * .72, 0, 0, Math.PI * 2); cx.fill();
            cx.globalAlpha = .75; cx.strokeStyle = C.foam; cx.lineWidth = 1.4; cx.lineCap = 'round'; cx.beginPath(); cx.ellipse(u - rr * .25, v, rr * 1.25, rr * .85, 0, Math.PI * .62, Math.PI * 1.38); cx.stroke();
            cx.globalAlpha = .3; cx.lineWidth = 3.2; cx.stroke();
            cx.globalAlpha = 1; cx.fillStyle = t < .5 ? '#4e4a40' : '#5a5548'; cx.beginPath(); cx.ellipse(u, v, rr, rr * .66, (t - .5) * .5, 0, Math.PI * 2); cx.fill();
            cx.globalAlpha = .75; cx.fillStyle = '#8f8772'; cx.beginPath(); cx.ellipse(u - rr * .25, v - rr * .2, rr * .5, rr * .28, 0, 0, Math.PI * 2); cx.fill();
            if (t > .5) { cx.globalAlpha = .7; cx.fillStyle = C.moss; cx.beginPath(); cx.ellipse(u + rr * .1, v - rr * .32, rr * .45, rr * .18, 0, 0, Math.PI * 2); cx.fill(); }
          }
          cx.restore(); cx.globalAlpha = 1; });
      }
    }
    tag = 'rapid';
    // 5b. White water: standing waves across the current every few strides, each a few broken crests bowed downstream, and
    //     foam where the current runs against the bank's stones. The gorge runs white (it falls from the tarn to the falls);
    //     the brook and the river carry fainter, fewer ones. All from the river's line and the basin's own outline.
    if (river_ && river) {
      const G = kind === 'gorge', every = G ? [30, 34] : kind === 'brook' ? [64, 80] : [120, 160], strength = G ? 1 : kind === 'brook' ? .55 : .32, hwp = river.hw * (W.cellW + W.cellH) / 2;
      const rh = j => ((Math.imul((j + (hash(f.id) & 511)) * 374761393, 668265263) >>> 0) % 1000) / 1000, run2 = u => { const k = Math.floor(u), t = u - k, sm = t * t * (3 - 2 * t); return rh(k) * (1 - sm) + rh(k + 1) * sm; };
      for (let s = 12 + r() * every[0]; s < river.len; s += (every[0] + r() * every[1]) * (G ? .55 + r() * 1.3 : 1)) {
        const q = at(river, s), ang = Math.atan2(q.ty, q.tx); if (!inside(q.x, q.y, pts) || !onLand(q.x, q.y)) continue;
        if (G && run2(s / 110) < .46) continue;   // (stretches of smooth dark water between the runs of white)
        const dashes = [], nd = (G ? 4 : 2) + Math.floor(r() * (G ? 4 : 3));
        // (low arcs in a loose row across the current: tightly curled ones read as scribbles)
        for (let k = 0; k < nd; k++) { const len = (G ? 5 : 4) + r() * (G ? 8 : 6); dashes.push([(k / Math.max(1, nd - 1) - .5) * 1.4 * hwp + (r() - .5) * hwp * .25, len, len * (.1 + r() * .14), (.3 + r() * .5) * strength, (r() - .5) * 4]); }
        add({ x: q.x - hwp * 1.6 - 14, y: q.y - hwp * 1.6 - 14, w: hwp * 3.2 + 28, h: hwp * 3.2 + 28 }, (cx, C) => {
          cx.save(); cx.clip(P); cx.translate(q.x, q.y); cx.rotate(ang); cx.lineCap = 'round'; cx.strokeStyle = C.foam;
          for (const [lat, len, bow, a, dx] of dashes) {
            const crest = () => { cx.beginPath(); cx.moveTo(dx - bow, lat - len / 2); cx.quadraticCurveTo(dx + bow, lat, dx - bow, lat + len / 2); cx.stroke(); };
            cx.globalAlpha = a * .3; cx.lineWidth = 3.6; crest(); cx.globalAlpha = a; cx.lineWidth = 1.25; crest();
            // the darker trough just upstream of the crest, so the wave stands up out of the water
            cx.globalAlpha = a * .32; cx.strokeStyle = C.deep; cx.lineWidth = 1.6; cx.save(); cx.translate(-3.2, 0); crest(); cx.restore(); cx.strokeStyle = C.foam;
          }
          cx.restore(); cx.globalAlpha = 1; });
      }
      // foam against the banks: short broken runs just inside the water, by a noise along the shore
      const runs = []; let run = null;
      for (let i = 0, arc = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b.x - a.x, b.y - a.y); arc += L;
        const on = !mouths.has(i) && ((Math.imul(Math.floor(arc / 9) + (hash(f.id) & 255), 2654435761) >>> 0) % 100) / 100 < (G ? .5 : .22) && L > .5;
        if (on) { const nn = norm(i), o = 1.8; if (!run) { run = []; runs.push(run); } run.push([a.x - nn.x * o, a.y - nn.y * o], [b.x - nn.x * o, b.y - nn.y * o]); } else run = null; }
      if (runs.length) add(all, (cx, C) => { cx.save(); cx.clip(P); cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = C.foam;
        for (const [w, a] of [[3.4, .14 * strength], [1.3, .5 * strength]]) { cx.globalAlpha = a; cx.lineWidth = w; cx.beginPath(); for (const rn of runs) { cx.moveTo(rn[0][0], rn[0][1]); for (const p of rn) cx.lineTo(p[0], p[1]); } cx.stroke(); }
        cx.restore(); cx.globalAlpha = 1; });
    }
    tag = 'lily';
    // 6. Lily pads where the water is warm and still (the Mere's east bank, the pools).
    if (kind === 'mere' || kind === 'pool') {
      const cxm = all.x + all.w * (kind === 'mere' ? .78 : .5);
      for (let c = 0; c < (kind === 'mere' ? 9 : 4); c++) {
        let x = 0, y = 0, tries = 0; do { x = cxm + (r() - .5) * all.w * (kind === 'mere' ? .4 : .8); y = all.y + r() * all.h; tries++; } while (tries < 40 && !(inside(x, y, pts) && edgeDist(x, y, pts) < 46 && edgeDist(x, y, pts) > 8));
        if (tries >= 40) continue;
        const pads = []; for (let k = 0; k < 5 + Math.floor(r() * 7); k++) { const px = x + (r() - .5) * 44, py = y + (r() - .5) * 18, pr = 3.5 + r() * 4, rot = r() * 6.28, tone = Math.floor(r() * 3), fl = r() < .25; if (inside(px, py, pts)) pads.push([px, py, pr, rot, tone, fl]); }
        add({ x: x - 30, y: y - 14, w: 60, h: 28 }, (cx, C) => {
          if (!C.lily.length) return;
          for (const [px, py, pr, rot, tone, fl] of pads) {
            cx.globalAlpha = .35; cx.fillStyle = '#2c4434'; cx.beginPath(); cx.ellipse(px + 1, py + 1, pr, pr * .55, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
            cx.fillStyle = C.lily[tone]; cx.beginPath(); cx.ellipse(px, py, pr, pr * .55, 0, rot, rot + Math.PI * 1.82); cx.lineTo(px, py); cx.closePath(); cx.fill();
            cx.fillStyle = C.lily[2]; cx.globalAlpha = .6; cx.beginPath(); cx.ellipse(px - pr * .25, py - pr * .15, pr * .45, pr * .22, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
            if (fl && C.flower.length) { cx.fillStyle = C.flower[Math.floor(px) % C.flower.length]; cx.beginPath(); cx.arc(px + pr * .2, py - pr * .3, 1.8, 0, Math.PI * 2); cx.fill(); cx.fillStyle = '#f2d36a'; cx.beginPath(); cx.arc(px + pr * .2, py - pr * .35, .7, 0, Math.PI * 2); cx.fill(); }
          }
        });
      }
    }
    tag = 'bite';
    // 6b. The still water's edge is not one clean curve: by stretches (a smooth field along the shore) a tussock of sedge on its
    //     own mud, a gravel spit, or on the fell tarn a peat hag with heather on top reaches a little way into the water, with its
    //     own lap of light and a dark wet foot. Inside the water's outline (nothing to walk on is invented), from the outline.
    //     (a pond with one even rim all round read as a tub or a rubber stamp; the Mere's straight south shore as a kerb)
    if (kind === 'mere' || kind === 'pool' || kind === 'tarn') {
      const seedK = hash(f.id + 'bite') & 1023, fieldK = u => { const k = Math.floor(u), t = u - k, sm = t * t * (3 - 2 * t), h = j => ((Math.imul((j + seedK) * 2654435761, 1597334677) >>> 0) % 1000) / 1000; return h(k) * (1 - sm) + h(k + 1) * sm; };
      const per = kind === 'mere' ? 30 : 14, scale = kind === 'mere' ? 140 : 46;
      for (let i = 0, acc = 0, arc = 0; i < n; i++) { const st = Math.hypot(pts[(i + 1) % n].x - pts[i].x, pts[(i + 1) % n].y - pts[i].y); acc += st; arc += st; if (acc < per) continue; acc = 0;
        const v = fieldK(arc / scale); if (v < (kind === 'tarn' ? .4 : kind === 'pool' ? .38 : .5) || mouths.has(i) || shoreCovered(pts[i].x, pts[i].y)) continue;
        const a = pts[i], nn = norm(i), reach = (kind === 'mere' ? 7 : 8) + r() * (kind === 'mere' ? 12 : 14) * v, len = (kind === 'mere' ? 22 : 18) + r() * (kind === 'mere' ? 30 : 24), ang = Math.atan2(nn.x, -nn.y);
        const cx0 = a.x - nn.x * reach * .45, cy0 = a.y - nn.y * reach * .45; if (!inside(cx0, cy0, pts)) continue;
        const sort = kind === 'tarn' ? (r() < .7 ? 'hag' : 'gravel') : r() < .62 ? 'sedge' : r() < .6 ? 'mud' : 'gravel', d = D().blob(r, 0, 0, len / 2, reach * .62, 9, .5), peb = [], tuft = [];
        for (let k = 0; k < (sort === 'gravel' ? 9 : 4); k++) peb.push([(r() - .5) * len * .8, (r() - .5) * reach * .7, .9 + r() * (sort === 'gravel' ? 2.2 : 1.4), r()]);
        if (sort === 'sedge' || sort === 'hag') for (let k = 0; k < 5 + Math.floor(r() * 5); k++) tuft.push([(r() - .5) * len * .75, (r() - .7) * reach * .5, 5 + r() * 7, (r() - .5) * .8, r()]);
        add({ x: a.x - len - 20, y: a.y - len - 30, w: len * 2 + 40, h: len * 2 + 50 }, (cx, C) => {
          cx.save(); cx.clip(P); cx.translate(cx0, cy0); cx.rotate(ang);
          const base = sort === 'hag' ? '#4a3b2a' : sort === 'mud' ? mix(C.bank, '#5a4a32', .3) : sort === 'gravel' ? mix(C.bed, '#9a907a', .4) : mix(C.bank, C.grass, .35);
          // its dark wet foot in the water, then the tussock or spit itself
          cx.globalAlpha = .3; cx.fillStyle = '#1e2c2a'; cx.save(); cx.translate(1.5, 2.5); cx.fill(P2(d)); cx.restore();
          cx.globalAlpha = sort === 'gravel' ? .8 : .95; cx.fillStyle = base; cx.fill(P2(d));
          cx.globalAlpha = .35; cx.fillStyle = sort === 'hag' ? '#6e5a44' : mix(base, '#f0e6c8', .3); cx.save(); cx.translate(-1.5, -1.5); cx.scale(.7, .6); cx.fill(P2(d)); cx.restore();
          for (const [px, py, pr, t] of peb) { cx.globalAlpha = .8; cx.fillStyle = t < .5 ? '#7a7262' : '#a29a84'; cx.beginPath(); cx.ellipse(px, py, pr, pr * .62, 0, 0, Math.PI * 2); cx.fill(); }
          cx.rotate(-ang);
          // tufts stand upright whatever the shore's angle: sedge blades, or heather and moss on a hag
          for (const [px0, py0, h, lean, t] of tuft) { const px = px0 * Math.cos(ang) - py0 * Math.sin(ang), py = px0 * Math.sin(ang) + py0 * Math.cos(ang);
            if (sort === 'hag') { cx.globalAlpha = .9; cx.fillStyle = t < .5 ? '#7a5a6e' : '#5e6e3a'; cx.beginPath(); cx.ellipse(px, py - 1, 3 + h * .3, 1.8 + h * .12, 0, 0, Math.PI * 2); cx.fill(); continue; }
            if (!C.reed || !C.reed.length) continue;
            cx.globalAlpha = .95; cx.strokeStyle = t < .4 ? C.reed[0] : t < .8 ? C.reed[1] : C.reed[2]; cx.lineWidth = 1.1; cx.lineCap = 'round';
            for (let b = -1; b <= 1; b++) { cx.beginPath(); cx.moveTo(px + b, py); cx.quadraticCurveTo(px + b * 1.5 + lean * h * .3, py - h * .6, px + b * 2.4 + lean * h, py - h); cx.stroke(); } }
          cx.rotate(ang);
          // the lap of light along its water side
          cx.globalAlpha = .4; cx.strokeStyle = C.foam; cx.lineWidth = 1.1; cx.beginPath(); cx.ellipse(0, reach * .12, len * .5, reach * .5, 0, Math.PI * .1, Math.PI * .9); cx.stroke();
          cx.restore(); cx.globalAlpha = 1; });
      }
    }
    tag = 'lap';
    // 7. The lap line: a thin bright line just inside the water, a wet dark line just outside.
    add(all, (cx, C) => { cx.lineJoin = 'round'; cx.save(); cx.clip(P); cx.strokeStyle = C.foam; cx.globalAlpha = .55; cx.lineWidth = 3; cx.stroke(bankP); cx.globalAlpha = .25; cx.lineWidth = 8; cx.stroke(bankP); cx.restore(); cx.globalAlpha = 1; });
    tag = 'reeds';
    // 8. Reed beds: clumps of the library's reeds and rushes along still and slow
    //    banks (never in rows), thickest where the design asks (the Mere's west
    //    reed bank, the brook mouth, the estuary).
    if (kind !== 'gorge' && kind !== 'spring') {
      // beds, not a sprinkle: runs of the bank (picked by a smooth field along
      // it) carry dense reeds standing in the shallows, with rushes and
      // loosestrife mixed in; between the beds a single clump now and then.
      const seed = hash(f.id) & 1023, field = i => { const u = i / 9, k = Math.floor(u), t = u - k, s = t * t * (3 - 2 * t), h = j => ((Math.imul((j + seed) * 374761393, 668265263) >>> 0) % 1000) / 1000; return h(k) * (1 - s) + h(k + 1) * s; };
      const bedAt = kind === 'mere' ? .64 : kind === 'river' ? .6 : kind === 'brook' ? .62 : .52;
      for (let i = 0, acc = 0, arc = 0; i < n; i++) { const step = Math.hypot(pts[(i + 1) % n].x - pts[i].x, pts[(i + 1) % n].y - pts[i].y); acc += step; arc += step; if (acc < 26) continue; acc = 0;
        const a = pts[i], nn = norm(i);
        if (kind === 'mere' && a.y < all.y + 40 + all.h * .18) continue;
        const westBank = kind === 'mere' && a.x < all.x + all.w * .32 && a.y > all.y + all.h * .35, estuary = kind === 'river' && a.y > W.sky + 74 * W.cellH;
        const bed = field(arc / (kind === 'pool' ? 34 : 60)) > bedAt - (westBank || estuary ? .3 : 0) && !(kind === 'mere' && nn.y < -.5 && a.x > all.x + all.w * .3 && a.x < all.x + all.w * .55);
        if (!bed && r() > .025) continue;
        const clump = [], cnt = bed ? 6 + Math.floor(r() * 6) : 3, mixIds = estuary ? ['plant.reed', 'plant.reed', 'plant.proof-fleet-reed', 'plant.bulrush'] : westBank ? ['plant.reed', 'plant.bulrush', 'plant.proof-fleet-rush', 'plant.canal-view-loosestrife'] : ['plant.reed', 'plant.proof-fleet-rush', 'plant.reed', 'plant.bulrush'];
        for (let k = 0; k < cnt; k++) { const o = (r() - .62) * 22, along = (r() - .5) * 24, id = mixIds[Math.floor(r() * mixIds.length)]; clump.push([a.x + nn.x * o - nn.y * along, a.y + nn.y * o + nn.x * along, id, r() < .5 ? 0 : 1, 24 + r() * (bed ? 22 : 12)]); }
        clump.sort((p, q) => p[1] - q[1]);
        if (!mouths.has(i) && !shoreCovered(a.x, a.y)) {
          add({ x: a.x - 50, y: a.y - 80, w: 100, h: 110 }, (cx, C, ctx) => { for (const [x, y, id, v, h] of clump) ctx.stamp(id, v, h, x, y); });
          out[out.length - 1].needs = clump.map(q => [q[2], q[3], q[4]]);
        }
      }
    }
    return out;
  }

  /* ---------- library stamps (reeds, lilies) through the Painted village baker ---------- */
  const stamps = new Map();
  const stampKey = (id, v, season, h) => id + '|' + v + '|' + season + '|' + Math.max(12, Math.round(h / 12) * 12);
  function stampCanvas(id, v, season, h) {
    const hq = Math.max(12, Math.round(h / 12) * 12), key = id + '|' + v + '|' + season + '|' + hq; if (stamps.has(key)) return stamps.get(key);
    const GP = window.GardenNativePainted; let s = null;
    if (GP && GP.objectCanvas && typeof sceneObj === 'function' && sceneObj(id)) s = ok(() => GP.objectCanvas(id, v, season, { h: hq }));
    if (s) s.hq = hq;
    if (stamps.size > 200) stamps.clear(); stamps.set(key, s); return s;
  }

  /* ---------- the still picture: one layer that follows the zoom (GardenPaintGround.layer) ---------- */
  // Every feature of every water becomes an op of the shared paint kit's chunked layer, which bakes it at the level the
  // camera needs, in slices off the frame, inside a memory budget. Order matters within a chunk: every water's banks
  // first, then the one body of water, then each water's dressing, the set pieces, the coast cut and the river mouths.
  const SKIP = new Set(['bankband', 'fill', 'deep', 'channel', 'shallow', 'lap']);   // (the body paints these now, for all the water at once)
  function stampCtx(S, cx) { return { stamp(id, v, h, x, y) { const s = stampCanvas(id, v, S.season, h); if (!s) return; const k = (h / s.hq) / 2; cx.drawImage(s.c, x - s.ox * k, y - s.oy * k, s.c.width * k, s.c.height * k); } }; }
  function opOf(S, f, seed) { const b = f.b; return { bb: [b.x, b.y, b.x + b.w, b.y + b.h], seed, tag: 'water ' + (f.tag || 'set piece'), draw(B) { const f0 = performance.now(); f.draw(B.cx, S.P, stampCtx(S, B.cx)); const fd = performance.now() - f0; if (fd > slowest.ms) { slowest.ms = +fd.toFixed(1); slowest.what = f.tag || 'set piece'; } } }; }
  function layerOps(S) {
    const banks = [], dress = []; let seed = 11;
    for (const w of S.M.waters) for (const f of w.feats) { if (SKIP.has(f.tag)) continue; (f.tag === 'bank' ? banks : dress).push(opOf(S, f, seed++)); }
    // (with a coast the body paints the sea as well, so nothing is cut away at the coast and a river needs no plume of its own)
    const ops = banks.concat(bodyOps(S), dress, S.extras.map(e => opOf(S, e, seed++)));
    if (S.M.coast.length) return ops;
    const sea = seaCutOps(S); if (sea.hard) ops.push(sea.hard); return ops.concat(sea.plume);
  }

  /* ---------- a coarse map of where the water is, for the live layers (bit 1 fresh water, bit 2 the sea) ---------- */
  function waterMask(S) {
    const M = S.M, a = M.all, q = 8, x0 = Math.floor(a.x - 400), y0 = Math.floor(a.y - 400), gw = Math.ceil((a.x1 - a.x + 800) / q), gh = Math.ceil((a.y1 - a.y + 800) / q);
    if (gw * gh > 1.2e6) return null;
    const c = document.createElement('canvas'); c.width = gw; c.height = gh; const x = c.getContext('2d', { willReadFrequently: true });
    x.setTransform(1 / q, 0, 0, 1 / q, -x0 / q, -y0 / q); x.fillStyle = '#f00'; x.fill(unionPath(M));
    if (M.coast.length) { x.globalCompositeOperation = 'lighter'; x.fillStyle = '#0f0'; x.fill(seaPath(M), 'evenodd'); }
    const d = x.getImageData(0, 0, gw, gh).data, m = new Uint8Array(gw * gh); for (let i = 0; i < m.length; i++) m[i] = (d[i * 4] > 127 ? 1 : 0) | (d[i * 4 + 1] > 127 ? 2 : 0);
    c.width = c.height = 1;
    const sea0 = M.coast.length ? 2 : 0;
    return { at(wx, wy) { const i = Math.floor((wx - x0) / q), j = Math.floor((wy - y0) / q); return i < 0 || j < 0 || i >= gw || j >= gh ? sea0 : m[j * gw + i]; } };
  }

  /* ---------- live layers ---------- */
  function liveTextures(scene) {
    const make = (key, w, h, draw) => { const k = TEX + '-' + key; if (scene.textures.exists(k)) return k; const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); scene.textures.addCanvas(k, c); return k; };
    return {
      glint: make('glint', 40, 8, (cx, w, h) => { const g = cx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.save(); cx.translate(w / 2, h / 2); cx.scale(1, h / w); cx.translate(-w / 2, -h / 2); cx.fillStyle = g; cx.fillRect(0, -w, w, w * 3); cx.restore(); }),
      spark: make('spark', 12, 12, (cx, w) => { const g = cx.createRadialGradient(6, 6, 0, 6, 6, 6); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.fillRect(0, 0, w, w); cx.fillStyle = 'rgba(255,255,255,.8)'; cx.fillRect(5.5, 1, 1, 10); cx.fillRect(1, 5.5, 10, 1); }),
      ring: make('ring2', 80, 24, (cx) => { cx.lineCap = 'round'; cx.strokeStyle = 'rgba(240,248,246,.75)'; cx.lineWidth = 1.6; for (const [a0, a1] of [[.15, 1.2], [1.6, 2.5], [2.9, 4.1], [4.5, 5.9]]) { cx.beginPath(); cx.ellipse(40, 12, 36, 9, 0, a0, a1); cx.stroke(); } cx.strokeStyle = 'rgba(240,248,246,.4)'; cx.lineWidth = 1.1; for (const [a0, a1] of [[.6, 1.9], [3.4, 4.6]]) { cx.beginPath(); cx.ellipse(40, 12, 24, 6, 0, a0, a1); cx.stroke(); } cx.strokeStyle = 'rgba(40,60,70,.25)'; cx.lineWidth = 1.1; cx.beginPath(); cx.ellipse(40, 13.5, 35, 8.5, 0, .4, 1.3); cx.stroke(); }),
      // (centred in the squashed space, so the puff fades to nothing at every edge: centred at (80, 40) it was cut flat
      //  along its top and every mist puff over the plunge pool showed as a pale rectangle)
      mist: make('mist2', 160, 80, (cx, w, h) => { const g = cx.createRadialGradient(80, 80, 0, 80, 80, 78); g.addColorStop(0, 'rgba(250,252,252,.85)'); g.addColorStop(.45, 'rgba(244,248,248,.4)'); g.addColorStop(1, 'rgba(244,248,248,0)'); cx.save(); cx.scale(1, .5); cx.fillStyle = g; cx.fillRect(0, 0, 160, 160); cx.restore(); }),
      foam: make('foam', 64, 32, (cx) => { const r = rng(77); for (let i = 0; i < 26; i++) { const x = 8 + r() * 48, y = 6 + r() * 20, rr = 2 + r() * 6; const g = cx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, rr, 0, Math.PI * 2); cx.fill(); } }),
      // a strip of white water that tiles along x: the weir and riffle foam scroll this
      // a wave running up the sand: a soft white crescent, brightest along its leading edge, fading back into the sea
      lap: make('lap', 64, 16, (cx) => { const g = cx.createLinearGradient(0, 3, 0, 15); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(2, 9); cx.quadraticCurveTo(32, 1, 62, 9); cx.quadraticCurveTo(32, 18, 2, 9); cx.fill(); const e = cx.createLinearGradient(0, 0, 64, 0); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(.18, 'rgba(0,0,0,0)'); e.addColorStop(.82, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)'); cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = e; cx.fillRect(0, 0, 64, 16); }),
      // a small wave on the open sea: a bright crest, tapered at both ends, over the darker water of its own trough
      crest: make('crest', 48, 14, (cx) => { cx.lineCap = 'round'; const g = (a) => { const l = cx.createLinearGradient(3, 0, 45, 0); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(.32, 'rgba(255,255,255,' + a + ')'); l.addColorStop(.62, 'rgba(255,255,255,' + a + ')'); l.addColorStop(1, 'rgba(255,255,255,0)'); return l; };
        cx.strokeStyle = 'rgba(24,64,80,.7)'; cx.lineWidth = 2.6; cx.beginPath(); cx.moveTo(7, 10.8); cx.quadraticCurveTo(24, 6.2, 42, 10.8); cx.stroke();
        cx.globalCompositeOperation = 'destination-in'; cx.fillStyle = g(1); cx.fillRect(0, 0, 48, 14); cx.globalCompositeOperation = 'source-over';
        cx.strokeStyle = g(.38); cx.lineWidth = 5; cx.beginPath(); cx.moveTo(4, 8); cx.quadraticCurveTo(24, 2.5, 44, 8); cx.stroke();
        cx.strokeStyle = g(1); cx.lineWidth = 2.3; cx.beginPath(); cx.moveTo(4, 7.6); cx.quadraticCurveTo(24, 2.2, 44, 7.6); cx.stroke(); }),
      // a petal or leaf afloat: a pointed oval with a soft shadow on the water under it and a faint midrib (tinted per leaf)
      leaf: make('leaf', 14, 9, (cx) => { const leaf = (dx, dy) => { cx.beginPath(); cx.moveTo(1.5 + dx, 4 + dy); cx.quadraticCurveTo(6.5 + dx, -.5 + dy, 11.5 + dx, 4 + dy); cx.quadraticCurveTo(6.5 + dx, 8.5 + dy, 1.5 + dx, 4 + dy); cx.fill(); };
        cx.fillStyle = 'rgba(16,40,46,.28)'; leaf(1.2, 1.2); cx.fillStyle = '#ffffff'; leaf(0, 0); cx.strokeStyle = 'rgba(0,0,0,.18)'; cx.lineWidth = .6; cx.beginPath(); cx.moveTo(2.5, 4); cx.lineTo(10.5, 4); cx.stroke(); }),
      // a lamp's light lying on the water: a short soft bar, brightest in the middle
      streak: make('streak', 32, 8, (cx, w, h) => { const g = cx.createRadialGradient(16, 4, 0, 16, 4, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.save(); cx.scale(1, .25); cx.fillStyle = g; cx.fillRect(0, 0, 32, 32); cx.restore(); }),
      strip: make('strip', 128, 32, (cx) => { const r = rng(31); for (let i = 0; i < 70; i++) { const x = r() * 128, y = 4 + r() * 24, len = 4 + r() * 18, a = .25 + r() * .6; cx.strokeStyle = 'rgba(255,255,255,' + a + ')'; cx.lineWidth = .8 + r() * 1.8; cx.lineCap = 'round'; for (const ox of [0, -128, 128]) { cx.beginPath(); cx.moveTo(x + ox, y); cx.lineTo(x + ox + len, y + (r() - .5) * 2); cx.stroke(); } } }),
    };
  }
  function emitters(S) {
    const scene = S.scene, T = S.tex, out = [], W = S.W, layer = S.parent, add = im => { im.setDepth(-9585); layer.add(im); return im; };
    // a set piece that must stand in front of a sprite (the falls) goes in the object layer at its own depth
    const put = (im, over) => { if (over != null && S.objects) { S.objects.add(im); im.setDepth(over); S.sortObjects = true; return im; } return add(im); };
    const night = S.tod === 'night', dusk = S.tod === 'dusk' || S.tod === 'dawn', tint = night ? 0xc8d6ff : dusk ? 0xffe0bc : 0xffffff;
    // Glints riding the current down each river's centre line.
    for (const w of S.M.waters) {
      if (!w.river || !FLOW[w.kind]) continue;
      const L = w.river, b = w.bounds, list = [], r = rng(hash(w.id + 'g')), seg = nearestOn(L, b.x + b.w / 2, b.y + b.h / 2);
      // only the stretch of line inside this basin
      let s0 = Infinity, s1 = -Infinity; for (let i = 0; i < L.pts.length; i++) if (inside(L.pts[i].x, L.pts[i].y, w.pts)) { s0 = Math.min(s0, L.cum[i]); s1 = Math.max(s1, L.cum[i]); }
      if (!(s1 > s0)) continue; void seg;
      const count = Math.min(60, Math.round((s1 - s0) / (w.kind === 'gorge' ? 18 : 26)));
      for (let i = 0; i < count; i++) {
        const im = add(scene.add.image(0, 0, T.glint)).setTint(tint).setAlpha(0);
        list.push({ im, s: s0 + r() * (s1 - s0), lat: (r() - .5) * 1.25, life: r(), span: .6 + r() * 1.4, k: .4 + r() * .7, sp: .75 + r() * .5 });
      }
      out.push({ b, list, kind: 'flow', L, s0, s1, w, speed: FLOW[w.kind], update(dt, t) {
        for (const g of this.list) {
          g.life += dt / g.span; g.s += this.speed * g.sp * dt * (1 - Math.abs(g.lat) * .5);
          if (g.life >= 1 || g.s > this.s1) { g.life = 0; g.s = this.s0 + r() * (this.s1 - this.s0); g.lat = (r() - .5) * 1.25; }
          const q = at(this.L, g.s), lat = g.lat * this.L.hw, x = q.x - q.ty * lat * W.cellW * .85, y = q.y + q.tx * lat * W.cellH * .85;
          g.im.setPosition(x, y).setRotation(Math.atan2(q.ty, q.tx)).setScale(g.k * (this.w.kind === 'gorge' ? .46 : .32), g.k * .9).setAlpha(Math.sin(g.life * Math.PI) * (night ? .26 : .4));   // (short and soft: long bright ones read as rain)
        }
      } });
    }
    // Twinkles and rising rings on still water (the Mere, the tarn and the pools).
    for (const w of S.M.waters) {
      if (FLOW[w.kind]) continue;
      const b = w.bounds, r = rng(hash(w.id + 't')), big = w.kind === 'mere' || w.kind === 'tarn', list = [], rings = [];
      const pick = () => { for (let k = 0; k < 30; k++) { const x = b.x + r() * b.w, y = b.y + r() * b.h; if (inside(x, y, w.pts) && edgeDist(x, y, w.pts) > 20) return { x, y }; } return null; };
      for (let i = 0; i < (big ? 46 : 8); i++) { const p = pick(); if (!p) continue; const sp = r() < .4; list.push({ im: add(scene.add.image(p.x, p.y, sp ? T.spark : T.glint)).setTint(tint).setAlpha(0), x: p.x, y: p.y, ph: r() * 6.28, f: .5 + r() * 1.3, k: .3 + r() * .6, sp }); }
      for (let i = 0; i < (big ? 4 : 1); i++) { const p = pick(); if (p) rings.push({ im: add(scene.add.image(p.x, p.y, T.ring)).setAlpha(0), x: p.x, y: p.y, ph: r(), period: 4 + r() * 5, cycle: -1 }); }
      out.push({ b, list, rings, kind: 'still', update(dt, t) {
        for (const g of this.list) { const s = Math.sin(t * g.f + g.ph); g.im.setPosition(g.x + Math.sin(t * .15 + g.ph) * 6, g.y).setScale(g.sp ? g.k * .9 : g.k, g.k * .7).setAlpha(Math.max(0, s) ** 3 * (night ? .45 : .6)); }
        for (const q of this.rings) {
          const phase = t / q.period + q.ph, cycle = Math.floor(phase), f = phase - cycle;
          // Start each ripple at a fresh wet point once per cycle. Repeatedly
          // adding an offset near phase zero made its centre wander onto land.
          if (cycle !== q.cycle) { const p = pick(); if (p) { q.x = p.x; q.y = p.y; } q.cycle = cycle; }
          q.im.setPosition(q.x, q.y).setScale(.15 + f * .9, .15 + f * .8).setAlpha(f < .7 ? (1 - f / .7) * .22 : 0);
        }
      } });
    }
    // The spring wells up: small rings opening one after another over its source, and bubbles rising to break the surface.
    for (const w of S.M.waters) {
      if (w.kind !== 'spring') continue;
      let sx = 0, sy = 0; for (const p of w.pts) { sx += p.x / w.pts.length; sy += p.y / w.pts.length; }
      if (!inside(sx, sy, w.pts)) { const p = w.pts[0]; sx = p.x; sy = p.y; }
      const r = rng(hash(w.id + 'well')), rings = [], list = [];
      for (let i = 0; i < 3; i++) rings.push({ im: add(scene.add.image(sx, sy, T.ring)).setAlpha(0), ph: i / 3 });
      for (let i = 0; i < 7; i++) list.push({ im: add(scene.add.image(sx, sy, T.spark)).setAlpha(0), ph: r(), dx: (r() - .5) * 16, dy: (r() - .5) * 7, per: 1.6 + r() * 1.8 });
      out.push({ b: { x: sx - 60, y: sy - 40, w: 120, h: 80 }, list: list.concat(rings), kind: 'spring', update(dt, t) {
        for (const q of rings) { const f = (t / 3.2 + q.ph) % 1; q.im.setPosition(sx, sy + 1).setScale(.08 + f * .42, .08 + f * .36).setAlpha((1 - f) * (night ? .22 : .34)); }
        for (const g of list) { const f = (t / g.per + g.ph) % 1; g.im.setPosition(sx + g.dx, sy + g.dy - f * 2).setScale(.18 + f * .12).setAlpha(Math.sin(f * Math.PI) ** 2 * (night ? .4 : .7)); }
      } });
    }
    // Drift on still water by the season: a few petals and seed heads in summer, blossom in spring, leaves in autumn, each
    // turning slowly as the breeze carries it across, fading in and out so none is seen to start or stop.
    const DRIFT = { spring: [0xf6cdd8, 0xfbe6ec, 0xf2f2e4], summer: [0xf6f2e2, 0xe8e4c8, 0xf3d8e0], autumn: [0xc8813a, 0xd9a441, 0xa8592c, 0xb89a40] }[S.season];
    if (DRIFT) for (const w of S.M.waters) {
      if (!(w.kind === 'mere' || w.kind === 'pool')) continue;
      const b = w.bounds, r = rng(hash(w.id + 'drift')), list = [], N = w.kind === 'mere' ? (S.season === 'autumn' ? 18 : 12) : 3;
      const pick = () => { for (let k = 0; k < 30; k++) { const x = b.x + r() * b.w, y = b.y + r() * b.h; if (inside(x, y, w.pts) && edgeDist(x, y, w.pts) > 14) return { x, y }; } return null; };
      for (let i = 0; i < N; i++) { const p = pick(); if (!p) continue; list.push({ im: add(scene.add.image(p.x, p.y, T.leaf)).setTint(DRIFT[Math.floor(r() * DRIFT.length)]).setAlpha(0), x: p.x, y: p.y, life: r(), span: 34 + r() * 40, rot: r() * 6.28, spin: (r() - .5) * .25, k: .7 + r() * .5 }); }
      out.push({ b, list, kind: 'drift', update(dt, t) {
        for (const g of this.list) {
          g.life += dt / g.span; g.x += dt * (1.1 + Math.sin(t * .1 + g.rot) * .5); g.y += dt * Math.sin(t * .07 + g.rot * 2) * .35; g.rot += dt * g.spin;
          if (g.life >= 1 || !inside(g.x, g.y, w.pts)) { const p = pick(); g.life = 0; if (p) { g.x = p.x; g.y = p.y; } }
          g.im.setPosition(g.x, g.y).setRotation(g.rot).setScale(g.k).setAlpha(Math.min(1, Math.sin(g.life * Math.PI) * 3) * (night ? .45 : .9));
        }
      } });
    }
    // The sea laps the sand: along every stretch of the real sea shore (never across a river mouth, where the coast's
    // outline runs through water), soft foam runs a stride up the beach and falls back, a wave rolling along the shore.
    if (S.M.coast.length) {
      const fresh = (x, y) => S.M.waters.some(w => x >= w.bounds.x && y >= w.bounds.y && x <= w.bounds.x + w.bounds.w && y <= w.bounds.y + w.bounds.h && inside(x, y, w.pts));
      const sea = (x, y) => !S.M.coast.some(loop => inside(x, y, loop)) && !fresh(x, y), land = (x, y) => S.M.coast.some(loop => inside(x, y, loop)) && !fresh(x, y);
      for (const loop of S.M.coast) {
        const r = rng(hash('lap' + loop.length)), pts = []; let acc = 0, arc = 0;
        for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < .01) continue; const tx = (b.x - a.x) / L, ty = (b.y - a.y) / L;
          for (let u = (26 - acc); u < L; u += 26) { const x = a.x + tx * u, y = a.y + ty * u; let nx = ty, ny = -tx; if (!sea(x + nx * 6, y + ny * 6)) { nx = -nx; ny = -ny; } if (sea(x + nx * 6, y + ny * 6) && land(x - nx * 6, y - ny * 6)) pts.push({ x, y, nx, ny, s: arc + u }); }
          acc = (acc + L) % 26; arc += L; }
        for (let i = 0; i < pts.length; i += 12) {
          const run = pts.slice(i, i + 12), list = []; let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
          for (const p of run) { bx0 = Math.min(bx0, p.x); by0 = Math.min(by0, p.y); bx1 = Math.max(bx1, p.x); by1 = Math.max(by1, p.y);
            list.push({ im: add(scene.add.image(p.x, p.y, T.lap)).setDepth(-9344).setTint(tint).setAlpha(0).setRotation(Math.atan2(-p.nx, p.ny)),   // (over the beach's wet sand, -9346, under every cast shadow)
              p, k: .7 + r() * .55, ph: r() * .25, reach: 4 + r() * 5 }); }
          out.push({ b: { x: bx0 - 20, y: by0 - 20, w: bx1 - bx0 + 40, h: by1 - by0 + 40 }, list, kind: 'lap', update(dt, t) {
            for (const g of this.list) { const w = (Math.sin(t * .85 - g.p.s / 95 + g.ph * 6.28) + 1) / 2, run = w * w * (3 - 2 * w), off = 1.5 + run * g.reach;
              g.im.setPosition(g.p.x - g.p.nx * (off - 3), g.p.y - g.p.ny * (off - 3)).setScale(g.k * (.8 + run * .3), .7 + run * .4).setAlpha((.12 + run * .5) * (night ? .55 : 1)); }
          } });
        }
      }
    }
    // The open sea's own surface, a pool of sprites that follows the camera: small waves that rise, run a little with the wind
    // and fall back, and sparkles of the sun (gold at dusk, the moon's at night). A grid fixed to the world gives each cell at
    // most one, at its own place and time, and only where the sea runs on well clear of any shore (the swell and foam live
    // there); a cell is tested once. Only cells on screen hold a sprite, so its cost does not grow with the sea.
    const MK = S.mask;
    if (MK && S.M.coast.length) {
      const pool = [], NP = 110, cells = new Map(), clear = (x, y, m) => MK.at(x, y) === 2 && MK.at(x - m, y) === 2 && MK.at(x + m, y) === 2 && MK.at(x, y - m * .7) === 2 && MK.at(x, y + m * .7) === 2;
      for (let i = 0; i < NP; i++) pool.push({ im: add(scene.add.image(0, 0, T.crest)).setAlpha(0).setVisible(false), on: false });
      const hc = (a, b, c) => { let h = Math.imul(a * 73856093 ^ b * 19349663 ^ c * 83492791, 2654435761) >>> 0; h ^= h >>> 15; return (h % 100000) / 100000; };
      const crestTint = night ? 0xb4c6e8 : dusk ? 0xffe2c0 : 0xffffff, crestA = night ? .2 : dusk ? .36 : .42, sparkTint = night ? 0xdce6ff : dusk ? 0xffd08a : 0xffffff, sparkA = night ? .5 : dusk ? .85 : .6;
      out.push({ b: { x: -1e6, y: -1e6, w: 2e6, h: 2e6 }, list: pool, kind: 'sea surface', update(dt, t) {
        const v = S.view; if (!v) return; const G = v.w > 1700 ? 256 : v.w > 900 ? 128 : 64, gx0 = Math.floor(v.x / G), gy0 = Math.floor(v.y / G), gx1 = Math.ceil((v.x + v.w) / G), gy1 = Math.ceil((v.y + v.h) / G);
        let n = 0;
        for (let gy = gy0; gy < gy1 && n < NP; gy++) for (let gx = gx0; gx < gx1 && n < NP; gx++) {
          const key = G + ':' + gx + ':' + gy; let c = cells.get(key);
          if (c === undefined) { if (cells.size > 6000) cells.clear(); const cx0 = (gx + .5) * G, cy0 = (gy + .5) * G; c = clear(cx0, cy0, G * .5 + 22) ? { x: cx0, y: cy0, ph: hc(gx, gy, 1), per: 3.2 + hc(gx, gy, 2) * 3.4, sp: hc(gx, gy, 3) < (dusk ? .42 : night ? .3 : .26) } : null; cells.set(key, c); }
          if (!c) continue;
          const u = t / c.per + c.ph, cyc = Math.floor(u), f = u - cyc;
          if (hc(gx, gy, cyc + 11) < .22) continue;   // (now and then a cell rests a cycle, so the sea never shows a grid)
          const g = pool[n++], x = c.x + (hc(gx, gy, cyc + 5) - .5) * G * .9, y = c.y + (hc(gx, gy, cyc + 7) - .5) * G * .9, k = .65 + hc(gx, gy, cyc + 9) * .6;
          if (!g.on) { g.im.setVisible(true); g.on = true; }
          if (c.sp) { const s = Math.max(0, Math.sin(f * Math.PI)) ** 4; if (g.im.texture.key !== T.spark) g.im.setTexture(T.spark); g.im.setTint(sparkTint).setPosition(x, y).setRotation(0).setScale(k * .8, k * .55).setAlpha(s * sparkA); }
          else { const s = Math.sin(f * Math.PI); if (g.im.texture.key !== T.crest) g.im.setTexture(T.crest); g.im.setTint(crestTint).setPosition(x + f * 7, y - f * 1.5).setRotation(-.04).setScale(k * (.7 + f * .45), k * (.8 + s * .25)).setAlpha(s * s * crestA); }
        }
        for (let i = n; i < NP; i++) { const g = pool[i]; if (g.on || g.im.visible) { g.im.setVisible(false); g.on = false; } }
      } });
    }
    // A lamp's light lying on the water at dusk and at night: a column of soft bars that waver, below the lamp as its mirror
    // image would fall (as far under its foot as the light stands above it), only where that falls on water. The lamps are
    // the light module's (the world's light sources); they are read again now and then, as the world builds them.
    if ((night || dusk) && MK) {
      const pool = [], NL = 90, rows = [];
      for (let i = 0; i < NL; i++) pool.push({ im: add(scene.add.image(0, 0, T.streak)).setAlpha(0).setVisible(false).setBlendMode(Phaser.BlendModes.ADD), on: false });
      let seen = -1, readAt = -10;
      const read = () => {
        const Wd = window.GardenNative && GardenNative.world && GardenNative.world(), L = Wd && Wd.lightSources ? Wd.lightSources() : null; if (!L || L.length === seen) return; seen = L.length; rows.length = 0;
        for (const l of L) { if (/falls/.test(String(l.id || ''))) continue;   // (the falls is a landmark with a door, not a lit window)
          const x = +l.x, top = +l.y, foot = Number.isFinite(+l.ground) && l.ground != null ? +l.ground : top + Math.min(60, (+l.height || 40)); if (!Number.isFinite(x) || !Number.isFinite(top)) continue;
          const h = Math.max(14, foot - top), col = typeof l.color === 'number' ? l.color : 0xffd88e, pw = Math.max(0, Math.min(1, +l.intensity || .7));
          // (a light that stands back from the edge, on a quay or a bank, still lays its column down from the waterline in front
          //  of it, fainter the farther back it stands; one with no water within a few strides lays none)
          let y0 = foot + 5; while (y0 < foot + 96 && !(MK.at(x, y0) && MK.at(x - 6, y0) && MK.at(x + 6, y0))) y0 += 4; if (y0 >= foot + 96) continue;
          const back = Math.max(0, Math.min(1, (y0 - foot - 5) / 110));
          for (let k = 0; k < 7; k++) { const y = y0 + k * h * 1.15 / 6; if (MK.at(x, y) && MK.at(x - 6, y) && MK.at(x + 6, y)) rows.push({ x, y, k, col, pw: pw * (1 - back) * (1 - k / 8.5), ph: (x * .07 + top * .03) % 6.28 }); }
          if (rows.length >= NL) break;
        }
      };
      out.push({ b: { x: -1e6, y: -1e6, w: 2e6, h: 2e6 }, list: pool, kind: 'lamp light', update(dt, t) {
        if (t - readAt > 2) { readAt = t; read(); }
        const v = S.view, env = window.GardenNative && GardenNative.lighting && GardenNative.lighting(), day = env && env.environment ? Math.max(0, Math.min(1, +env.environment().daylight || 0)) : (night ? 0 : .4), lit = Math.max(0, Math.min(1, (.62 - day) / .42));
        let n = 0;
        if (v && lit > .02) for (const r of rows) { if (n >= NL) break; if (r.x < v.x - 40 || r.x > v.x + v.w + 40 || r.y < v.y - 40 || r.y > v.y + v.h + 40) continue;
          const g = pool[n++]; if (!g.on) { g.im.setVisible(true); g.on = true; }
          const wob = Math.sin(t * 1.4 + r.ph + r.k * .9), wid = (.32 + r.k * .07) * (1 + .18 * Math.sin(t * 2.1 + r.k * 1.7 + r.ph));
          g.im.setTint(r.col).setPosition(r.x + wob * (1 + r.k * .5), r.y).setScale(wid * 1.25, .85).setAlpha(Math.min(1, r.pw * lit * 1.9 * (.7 + .3 * Math.sin(t * 2.6 + r.k + r.ph))));   // (strong: the night's grade is laid over it)
        }
        for (let i = n; i < NL; i++) { const g = pool[i]; if (g.on || g.im.visible) { g.im.setVisible(false); g.on = false; } }
      } });
    }
    // The moon's path at night: a broken column of pale light lying on the open water, below where the moon stands in the
    // south sky (a little right of the middle of the view, so it moves with you as a reflection does), shimmering; only where
    // the column falls on water (fresh or sea), brightest on the open sea and the Mere, none on running water under trees.
    if (night && MK) {
      const pool = [], NM = 60, hh = (a, b) => { let h = Math.imul(a * 374761393 ^ b * 668265263, 2246822519) >>> 0; h ^= h >>> 13; return (h % 10000) / 10000; };
      for (let i = 0; i < NM; i++) pool.push({ im: add(scene.add.image(0, 0, T.streak)).setAlpha(0).setVisible(false).setBlendMode(Phaser.BlendModes.ADD), on: false });
      out.push({ b: { x: -1e6, y: -1e6, w: 2e6, h: 2e6 }, list: pool, kind: 'moon path', update(dt, t) {
        const v = S.view; let n = 0;
        if (v) { const cx0 = v.x + v.w * .6, step = 7;
          for (let y = Math.floor(v.y / step) * step; y < v.y + v.h && n < NM; y += step) {
            const row = Math.round(y / step), wob = Math.sin(t * .9 + row * .7) * 3 + (hh(row, 3) - .5) * 14, x = cx0 + wob, m = MK.at(x, y); if (!m || !MK.at(x - 10, y) || !MK.at(x + 10, y)) continue;
            const fl = (Math.sin(t * (1.3 + hh(row, 5)) + row * 2.1) + 1) / 2; if (fl < .25) continue;
            const g = pool[n++]; if (!g.on) { g.im.setVisible(true); g.on = true; }
            g.im.setTint(0xd8e2f0).setPosition(x, y).setScale(.5 + hh(row, 7) * 1.1 + fl * .3, .7).setAlpha((m & 2 ? .5 : .38) * fl);
          } }
        for (let i = n; i < NM; i++) { const g = pool[i]; if (g.on || g.im.visible) { g.im.setVisible(false); g.on = false; } }
      } });
    }
    S.sortParent = true;
    // Foam strips: the weir and the falls' landing (scrolling white water).
    for (const fx of S.foams) {
      const ts = fx.noStrip ? null : put(scene.add.tileSprite(fx.x, fx.y, fx.w, 32, T.strip), fx.over).setRotation(fx.ang).setScale(1, fx.h / 32).setAlpha(.85);
      const puffs = []; const r = rng(hash('foam' + fx.x));
      for (let i = 0; i < fx.puffs; i++) puffs.push({ im: put(scene.add.image(fx.x, fx.y, T.foam), fx.over).setAlpha(0), ph: r(), off: (r() - .5) * fx.w * .9 });
      out.push({ b: { x: fx.x - fx.w, y: fx.y - fx.w, w: fx.w * 2, h: fx.w * 2 }, list: (ts ? [{ im: ts }] : []).concat(puffs), kind: 'foam', update(dt, t) {
        if (ts) { ts.tilePositionX = -t * fx.speed; ts.setAlpha(.7 + Math.sin(t * 3.1) * .12); }
        const c = Math.cos(fx.ang), s = Math.sin(fx.ang);
        for (const p of puffs) { const f = (t * .45 + p.ph) % 1, along = p.off, down = f * fx.drift; p.im.setPosition(fx.x + c * along - s * down, fx.y + s * along + c * down).setScale(.5 + f * .9, .4 + f * .5).setAlpha(Math.sin(f * Math.PI) * .7); }
      } });
    }
    // Mist: soft puffs drifting over the falls' pool, and at dawn and dusk over the Mere.
    for (const m of S.mists) {
      const list = [], r = rng(hash('mist' + m.x));
      for (let i = 0; i < m.n; i++) list.push({ im: (m.over != null ? put(scene.add.image(m.x, m.y, T.mist), m.over) : add(scene.add.image(m.x, m.y, T.mist)).setDepth(m.depth || -9584)).setAlpha(0), ph: r(), dx: (r() - .5) * m.rx * 2, dy: (r() - .5) * m.ry * 2, k: .7 + r() * .9, rise: m.rise || 0 });
      out.push({ b: { x: m.x - m.rx - 160, y: m.y - m.ry - 120, w: m.rx * 2 + 320, h: m.ry * 2 + 240 }, list, kind: 'mist', update(dt, t) {
        for (const p of this.list) { const f = (t * m.speed + p.ph) % 1; p.im.setPosition(m.x + p.dx + Math.sin(t * .2 + p.ph * 6) * 20 + f * m.drift, m.y + p.dy - f * p.rise).setScale(p.k * (1 + f * .6), p.k * (1 + f * .3)).setAlpha(Math.sin(f * Math.PI) * m.a); }
      } });
    }
    return out;
  }

  /* White water off a drop (the weir's sill, a step in the gorge), in the drop's own frame: x runs downstream from the brink,
   * y across the channel (-half..half). Held water above it as a soft darker pool, the brink's sky line in broken arcs, then
   * tongues of white water of their own widths and lengths pouring off it, with darker water between them and bubbles
   * drifting away. Nothing has a straight edge: a rectangle of white or of darker water read as a pane of glass. */
  function dropOf(r, half, k) {
    const tongues = [], bubbles = [], brink = [];
    let y = -half * 1.08; while (y < half * 1.08) { const w = half * (.12 + r() * .22); tongues.push([y + w / 2, w * (.42 + r() * .2), (16 + r() * 22) * k, .55 + r() * .4, (r() - .5) * 3]); y += w * (.8 + r() * .5); }
    for (let i = 0; i < 34; i++) { const t = r(); bubbles.push([6 + t * 44 * k, (r() - .5) * 2.1 * half, .8 + r() * 2.2, (1 - t) * (.35 + r() * .45)]); }
    y = -half * 1.05; while (y < half * 1.05) { const l = half * (.1 + r() * .22); brink.push([y, y + l, (r() - .5) * 2]); y += l + half * (.04 + r() * .1); }
    return { tongues, bubbles, brink };
  }
  function paintDrop(c, C, d, half) {
    c.save();
    // the held water: a soft pool of darker, smoother water just above the brink (round-ended, so no edge shows)
    const g0 = c.createRadialGradient(-16, 0, 0, -16, 0, 30); const dc = rgbOf(C.deep); g0.addColorStop(0, 'rgba(' + dc + ',.32)'); g0.addColorStop(.7, 'rgba(' + dc + ',.16)'); g0.addColorStop(1, 'rgba(' + dc + ',0)');
    c.save(); c.scale(1, half * 1.15 / 30); c.fillStyle = g0; c.beginPath(); c.arc(-16, 0, 30, 0, Math.PI * 2); c.fill(); c.restore();
    // the brink catching the sky, broken where the water humps over a stone
    c.lineCap = 'round'; c.strokeStyle = C.skyHi; c.lineWidth = 1.4;
    for (const [y0, y1, dx] of d.brink) { c.globalAlpha = .5; c.beginPath(); c.moveTo(-3 + dx, y0); c.quadraticCurveTo(-5 + dx, (y0 + y1) / 2, -3 + dx, y1); c.stroke(); }
    // the darker water between the tongues, under the white
    c.globalAlpha = .22; c.fillStyle = '#1e3036';
    for (const [y, w] of d.tongues) { c.beginPath(); c.ellipse(5, y + w * 1.15, 6, w * .4, 0, 0, Math.PI * 2); c.fill(); }
    // the tongues of white water, each its own width and length, fading as they spread downstream
    const fc = rgbOf(C.foam);
    for (const [y, w, l, a, dy] of d.tongues) {
      const g = c.createRadialGradient(2, y, 0, 2, y, l); g.addColorStop(0, 'rgba(' + fc + ',' + a + ')'); g.addColorStop(.35, 'rgba(' + fc + ',' + a * .6 + ')'); g.addColorStop(1, 'rgba(' + fc + ',0)');
      c.save(); c.translate(2, y); c.scale(1, w / l); c.translate(-2, -y); c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(2, y, l, -Math.PI / 2, Math.PI / 2); c.fill(); c.restore();
      c.globalAlpha = a * .7; c.fillStyle = C.foam; c.beginPath(); c.ellipse(3, y + dy * .3, 2.4, w * .8, 0, 0, Math.PI * 2); c.fill();
    }
    for (const [x, y, rr, a] of d.bubbles) { c.globalAlpha = a; c.fillStyle = C.foam; c.beginPath(); c.ellipse(x, y, rr * 1.4, rr * .8, 0, 0, Math.PI * 2); c.fill(); }
    c.restore(); c.globalAlpha = 1;
  }

  /* ---------- set pieces the layout names: the weir, the falls' pool ---------- */
  function setPieces(S) {
    const M = S.M, W = S.W, data = S.data, pres = data.presentation || {}, extras = [], foams = [], mists = [];
    const cx = c => c * W.cellW, cy = c => W.sky + c * W.cellH;
    // The weir below the mill wheel: a stone sill across the race, glassy water
    // held above it, white water tumbling off its lip. Driven by the mill static
    // and the river's line (a sill square to the current at the nearest point).
    const mill = (data.static || []).find(s => s.id === 'ld-mill'), river = M.lines.river;
    if (mill && river) {
      const mx = cx(mill.x + mill.w / 2 - .5), my = cy(mill.y + 2.6), near = nearestOn(river, mx, my), q = at(river, near.s + 30), ang = Math.atan2(q.ty, q.tx), nx = -q.ty, ny = q.tx;
      const half = river.hw * Math.hypot(nx * W.cellW, ny * W.cellH) * 1.05, r = rng(hash('weir'));
      const span = (k) => ({ x: q.x + nx * half * k, y: q.y + ny * half * k });
      // (old weathered stones of their own sizes, a few lower ones the river pours through: eleven equal stones in a row and a
      //  straight-edged white band across the river read as a sheet of glass beside a bead necklace; art director, round 3)
      const a = span(-1), b = span(1), stones = []; for (let i = 0; i <= 12; i++) { const t = (i + (r() - .5) * .5) / 12, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, low = r() < .28; stones.push([p.x + (r() - .5) * 3, p.y + (r() - .5) * 3, low ? 3.5 + r() * 2.5 : 5 + r() * 5.5, r(), low]); }
      const drop = dropOf(r, half, 1.15), box = { x: Math.min(a.x, b.x) - 70, y: Math.min(a.y, b.y) - 70, w: Math.abs(b.x - a.x) + 140, h: Math.abs(b.y - a.y) + 140 };
      const clipW = () => { const w = M.waters.find(w => w.id === 'river-3') || M.waters.find(w => w.kind === 'river' && inside(q.x, q.y, w.pts)); return w ? (() => { const p = new Path2D(); p.moveTo(w.pts[0].x, w.pts[0].y); for (const z of w.pts) p.lineTo(z.x, z.y); p.closePath(); return p; })() : null; };
      let clip = null;
      extras.push({ b: box, draw(c, C) {
        clip = clip || clipW(); c.save(); if (clip) c.clip(clip);
        c.save(); c.translate(q.x, q.y); c.rotate(ang); paintDrop(c, C, drop, half); c.restore();
        c.restore();
        // the sill: weathered stones lit from the upper left, a dark wet face downstream, moss on the older ones
        for (const [x, y, rr, t, low] of stones) { c.fillStyle = '#4c483e'; c.beginPath(); c.ellipse(x + 1.5, y + 2.4, rr * 1.02, rr * .6, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = low ? '#7e7866' : t < .5 ? '#a8a08a' : '#99917b'; c.beginPath(); c.ellipse(x, y, rr, rr * (.5 + t * .12), (t - .5) * .4, 0, Math.PI * 2); c.fill(); c.fillStyle = '#d2cab2'; c.globalAlpha = low ? .35 : .7; c.beginPath(); c.ellipse(x - rr * .3, y - rr * .2, rr * .46, rr * .2, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; if (t > .55) { c.fillStyle = C.moss; c.globalAlpha = .7; c.beginPath(); c.ellipse(x + rr * .15, y - rr * .3, rr * .45, rr * .18, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; } if (low) { c.strokeStyle = C.foam; c.globalAlpha = .7; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y - 1, rr * .8, rr * .35, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.globalAlpha = 1; } }
      } });
      foams.push({ x: q.x + q.tx * 16, y: q.y + q.ty * 16, w: half * 1.7, h: 26, ang: ang + Math.PI / 2, speed: 26, puffs: 16, drift: 34, noStrip: true });
      mists.push({ x: q.x + q.tx * 26, y: q.y + q.ty * 26, rx: half * .6, ry: 8, n: 3, a: .22, speed: .06, drift: 18, rise: 10 });
      S.weir = { x: q.x, y: q.y, ang, half };
    }
    // Fleet Falls' plunge pool: churned white water where the sheet lands, foam
    // rafts drifting out into the Mere, spray and mist rising off it.
    const F = pres.falls;
    if (F) {
      const lipX = cx(F.x + F.w / 2), lipY = cy(F.y + (F.h || 3) * .6), fs = (data.static || []).find(s => s.id === 'ld-falls'), fw = data.version >= 5 && typeof gardenFallsWater === 'function' ? gardenFallsWater(data) : null, pool = fw ? { x: cx(fw.foot.x), y: cy(fw.foot.y) } : data.version >= 5 && F.pool ? { x: cx(F.pool[0]), y: cy(F.pool[1]) } : fs ? { x: cx(fs.x + fs.w / 2), y: cy(fs.y + (fs.h || 1)) + 8 } : F.pool ? { x: cx(F.pool[0]), y: cy(F.pool[1]) } : { x: lipX, y: lipY + 60 }, r = rng(hash('falls-pool'));
      const width = F.w * W.cellW * .55, rafts = []; for (let i = 0; i < 46; i++) { const a = r() * Math.PI, d = 20 + r() * 100; rafts.push([pool.x + Math.cos(a) * d * 1.3 * (r() < .5 ? -1 : 1), pool.y + Math.sin(a) * d * .45 + 8, 3 + r() * 8, r()]); }
      extras.push({ b: { x: pool.x - 200, y: pool.y - 120, w: 400, h: 260 }, draw(c, C) {
        const w = M.waters.find(w => w.kind === 'mere'); if (w) { const p = new Path2D(); p.moveTo(w.pts[0].x, w.pts[0].y); for (const z of w.pts) p.lineTo(z.x, z.y); p.closePath(); c.save(); c.clip(p); }
        // the deep green-black of the plunge pool, then rings of churned foam
        const g = c.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, 120); g.addColorStop(0, mix(C.deep, '#1e3a40', .45)); g.addColorStop(.6, C.deep); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); c.translate(pool.x, pool.y); c.scale(1.35, .55); c.translate(-pool.x, -pool.y); c.globalAlpha = .6; c.fillStyle = g; c.beginPath(); c.arc(pool.x, pool.y, 120, 0, Math.PI * 2); c.fill(); c.restore();
        // foam spreading out from the landing: broken arcs of bubbles drifting away, thinning with distance
        c.globalAlpha = 1; c.strokeStyle = C.foam; c.fillStyle = C.foam; c.lineCap = 'round';
        // (loose rafts of bubbles drifting out and thinning, each its own shape: whole or broken rings round the landing read as a target)
        if (false) rafts.forEach(([x, y, rr, t], ri) => { const d = Math.hypot((x - pool.x) / 1.3, (y - pool.y) / .45) / 120, a0 = Math.atan2((y - pool.y) / .45, (x - pool.x) / 1.3), R = Math.max(18, d * 120), q = rng(hash('raft') + ri * 7919);
          const px = pool.x + Math.cos(a0) * R * 1.3, py = pool.y + 6 + Math.sin(a0) * R * .45, ang = Math.atan2(Math.cos(a0) * .45, -Math.sin(a0) * 1.3), al = Math.max(.07, .6 - d * .5), n = 3 + Math.floor(q() * 6);
          c.save(); c.translate(px, py); c.rotate(ang);
          for (let k = 0; k < n; k++) { const bx = (q() - .5) * rr * 3.2, by = (q() - .5) * rr * .7, br = .9 + q() * (2.6 - d * 1.2); c.globalAlpha = al * (.45 + q() * .55); c.beginPath(); c.ellipse(bx, by, br * 1.5, br * .8, 0, 0, Math.PI * 2); c.fill(); }
          c.restore(); });
        // (round 2: no rafts of round bubbles, which read as white coins scattered in a fan) the churned water spreading off the landing:
        // long broken streaks of foam curving away with the current, thinning out, and a pale boil of aerated water under the sheet
        { const q = rng(hash('churn')); c.lineCap = 'round';
          for (let k = 0; k < 34; k++) { const side = q() < .5 ? -1 : 1, d = .15 + q() * .85, a0 = (q() * .9 + .05) * Math.PI, R = 22 + d * 120, px = pool.x + Math.cos(a0) * R * 1.3 * side * (q() < .3 ? -1 : 1), py = pool.y + 6 + Math.sin(a0) * R * .42, len = 8 + q() * 26 * (1 - d * .4);
            c.globalAlpha = (.5 - d * .38) * (.5 + q() * .5); c.strokeStyle = C.foam; c.lineWidth = .8 + q() * 1.6 * (1 - d * .6);
            c.beginPath(); c.moveTo(px - len / 2, py); c.quadraticCurveTo(px, py - 1.5 + q() * 3, px + len / 2, py + (q() - .5) * 3); c.stroke(); } }
        { const g3 = c.createRadialGradient(pool.x, pool.y - 2, 0, pool.x, pool.y - 2, width * 1.5); g3.addColorStop(0, 'rgba(' + rgbOf(C.foam) + ',.55)'); g3.addColorStop(.5, 'rgba(' + rgbOf(C.foam) + ',.2)'); g3.addColorStop(1, 'rgba(' + rgbOf(C.foam) + ',0)'); c.globalAlpha = 1; c.fillStyle = g3; c.save(); c.translate(pool.x, pool.y - 2); c.scale(1, .42); c.beginPath(); c.arc(0, 0, width * 1.5, 0, Math.PI * 2); c.fill(); c.restore(); }
        // (no whole rings drawn round it: three perfect ellipses read as a target; the broken arcs above are the spreading water)
        // (the churn where the sheet lands: several overlapping soft boils, not one white blob)
        const fc = rgbOf(C.foam); for (let k = 0; k < 5; k++) { const ox = (k - 2) * width * .32 + Math.sin(k * 2.3) * 6, oy = -6 + Math.cos(k * 1.7) * 4, rr = width * (.32 + (k % 2) * .14);
          const g2 = c.createRadialGradient(pool.x + ox, pool.y + oy, 0, pool.x + ox, pool.y + oy, rr); g2.addColorStop(0, 'rgba(' + fc + ',.62)'); g2.addColorStop(.55, 'rgba(' + fc + ',.26)'); g2.addColorStop(1, 'rgba(' + fc + ',0)');
          c.globalAlpha = 1; c.fillStyle = g2; c.save(); c.translate(pool.x + ox, pool.y + oy); c.scale(1, .5); c.beginPath(); c.arc(0, 0, rr, 0, Math.PI * 2); c.fill(); c.restore(); }
        if (w) c.restore(); c.globalAlpha = 1;
      } });
      // (puffs only here: a scrolling strip has square ends, and under the falls it showed as a pale rectangle)
      foams.push({ x: pool.x, y: pool.y - 4, w: width * 1.1, h: 22, ang: 0, speed: 38, puffs: 12, drift: 16, over: pool.y + 30, noStrip: true });
      // spray boiling up off the pool in front of the sheet, a veil drifting up its face, and a low mist lying out over the water
      mists.push({ x: pool.x, y: pool.y - 14, rx: width * .45, ry: 8, n: 6, a: .34, speed: .11, drift: 0, rise: 56, over: pool.y + 40 });
      mists.push({ x: pool.x, y: pool.y - 70, rx: width * .3, ry: 36, n: 4, a: .12, speed: .05, drift: 0, rise: 60, over: pool.y + 41 });
      mists.push({ x: pool.x + 30, y: pool.y + 30, rx: width * 1.6, ry: 18, n: 6, a: .26, speed: .03, drift: 70, rise: 4, depth: -9583 });
      S.fallsPool = pool;
    }
    // The gorge tumbles to the falls: over its last stretch above the lip it drops down a few rock steps, each a ledge of
    // wet boulders across the channel with glassy water held above it and white water spilling below, so the falls is the
    // last and tallest of a run of drops. Driven by the gorge's line and the falls' lip (gardenFallsWater).
    const gl = M.lines.gorge, fwl = data.version >= 5 && typeof gardenFallsWater === 'function' ? ok(() => gardenFallsWater(data)) : null;
    if (gl && fwl && fwl.lip) {
      const lip = nearestOn(gl, cx(fwl.lip.x), cy(fwl.lip.y)), r = rng(hash('cascade'));
      for (const back of [44, 104, 176]) {
        const s = lip.s - back; if (s < 30) continue;
        const q = at(gl, s), ang = Math.atan2(q.ty, q.tx), nx = -q.ty, ny = q.tx, half = gl.hw * Math.hypot(nx * W.cellW, ny * W.cellH) * 1.08;
        const wb = M.waters.find(w => w.kind === 'gorge' && inside(q.x, q.y, w.pts)); if (!wb) continue;
        // (a ledge of boulders of their own sizes, not a row, set a little askew across the current)
        // (boulders at the step's ends and the odd one in the stream, the water pouring between: a full row read as stepping stones)
        const drop = dropOf(r, half, .8), skew = (r() - .5) * .5, stones = []; for (let i = 0, nS = 4 + Math.floor(r() * 4); i <= nS; i++) { const t = i / nS - .5; if (Math.abs(t) < .3 ? r() < .7 : r() < .1) continue; stones.push([t * 2 * half + (r() - .5) * 6, (r() - .5) * 7 + t * half * skew, (Math.abs(t) < .3 ? 3 : 4.5) + r() * r() * 7, r()]); }
        let clip = null; const box = { x: q.x - half - 60, y: q.y - half - 60, w: half * 2 + 120, h: half * 2 + 120 };
        extras.push({ b: box, draw(c, C) {
          if (!clip) { clip = new Path2D(); clip.moveTo(wb.pts[0].x, wb.pts[0].y); for (const z of wb.pts) clip.lineTo(z.x, z.y); clip.closePath(); }
          c.save(); c.clip(clip); c.translate(q.x, q.y); c.rotate(ang + skew * .3);
          paintDrop(c, C, drop, half);
          // the ledge itself: wet boulders, lit from the upper left, darker downstream where the water pours off them
          for (const [lat, dx, rr, t] of stones) { const x = dx, y = lat; c.fillStyle = '#2e2b25'; c.beginPath(); c.ellipse(x + 2, y + 1.5, rr, rr * .7, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = t < .5 ? '#55503f' : '#635d4c'; c.beginPath(); c.ellipse(x, y, rr * .9, rr * .62, t - .5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9a927c'; c.globalAlpha = .6; c.beginPath(); c.ellipse(x - rr * .3, y - rr * .22, rr * .42, rr * .22, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
          c.restore();
        } });
      }
    }
    // Morning and evening mist lying on the Mere.
    if (S.tod === 'dawn' || S.tod === 'dusk') { const w = M.waters.find(w => w.kind === 'mere'); if (w) mists.push({ x: w.bounds.x + w.bounds.w / 2, y: w.bounds.y + w.bounds.h / 2, rx: w.bounds.w * .32, ry: w.bounds.h * .25, n: 9, a: .3, speed: .025, drift: 60, rise: 0 }); }
    return { extras, foams, mists };
  }

  function startView(W) { if (typeof _gw === 'undefined' || !Number.isFinite(_gw.px)) return null; const x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH; return { x: x - 700, y: y - 460, w: 1400, h: 920 }; }
  /* ---------- the public face ---------- */
  function wanted() { const GP = window.GardenNativePainted; return !!(GP && GP.wanted && GP.wanted() && GP.ready && GP.ready() && typeof Path2D === 'function' && typeof sceneDraw !== 'undefined'); }
  /** Paint the vale's waters. info: { W, data, season, tod } . parent: the world's root layer (ground lives at depth -9600). */
  function paint(scene, parent, info, objects) {
    clear();
    if (!info || !info.data || !info.data.freshwater) return null;
    const t0 = performance.now();
    const S = state = { scene, parent, objects: objects || null, W: info.W, data: info.data, season: info.season || 'summer', tod: info.tod || 'day', serial: 0, clock: 0, last: null, sortParent: false };
    S.P = palette(S.tod, S.season); S.M = ok(() => build(info.W, info.data)); if (!S.M || !S.M.all) { state = null; return null; }
    const sp = ok(() => setPieces(S)) || { extras: [], foams: [], mists: [] }; S.extras = sp.extras; S.foams = sp.foams; S.mists = sp.mists;
    S.tex = liveTextures(scene); S.mask = ok(() => waterMask(S)); S.em = ok(() => emitters(S)) || [];
    // every reed stamp is drawn now, with the ground, so walking never pays for one
    { const w0 = performance.now(), need = new Set(); for (const w of S.M.waters) for (const f of w.feats) if (f.needs) for (const q of f.needs) need.add(stampKey(q[0], q[1], S.season, q[2]) + '#' + q.join('#')); for (const k of need) { const q = k.split('#').slice(1); stampCanvas(q[0], +q[1], S.season, +q[2]); } S.warmMs = Math.round(performance.now() - w0); S.warmCount = need.size; }
    // the still picture: the paint kit's layer bakes it at the camera's level; the chunks on screen now are baked at once
    // (lazy: false), so the first frame has its water
    const G = window.GardenPaintGround, a = S.M.all, box = { x: Math.floor(a.x / 256) * 256, y: Math.floor(a.y / 256) * 256, w: 0, h: 0 }; box.w = Math.ceil((a.x1 + 200 - box.x) / 256) * 256; box.h = Math.ceil((a.y1 + 200 - box.y) / 256) * 256; S.box = box;
    if (G && G.layer) S.layer = ok(() => G.layer(scene, parent, layerOps(S), { key: TEX + '|' + S.tod + '|' + S.season + '|' + (++serialAll), box, chunk: 256, depth: -9590, budgetMB: BUDGET_MB, slice: 8, lazy: false, minK: 1, maxK: 4 }));
    // at night the world's own sea fill (under everything, at -10010) is veiled dark, the colour the painted sea fades into
    if (S.tod === 'night' && S.M.coast.length) ok(() => { const W = S.W, w = W.cols * W.cellW, h = W.sky + W.rows * W.cellH; S.veil = scene.add.graphics().setDepth(-10005); S.veil.fillStyle(NIGHT_VEIL.col, NIGHT_VEIL.a).fillRect(-3000, -3000, w + 6000, h + 6000); parent.add(S.veil); S.sortParent = true; });
    S.buildMs = Math.round(performance.now() - t0);
    return { destroy: clear };
  }
  function clear() {
    if (!state) return; const S = state; state = null;
    if (S.veil) ok(() => S.veil.destroy());
    if (S.layer) ok(() => S.layer.destroy());
    for (const e of S.em || []) for (const g of e.list || []) g.im.destroy(); for (const e of S.em || []) for (const q of e.rings || []) q.im.destroy();
  }
  /** Each frame: move the live layers in view (the still picture bakes itself on the paint kit's timer). view: world rect {x, y, w, h}. */
  function tick(time, view) {
    const S = state; if (!S || !view) return; const t0 = performance.now();
    const dt = S.last == null ? 0 : Math.min(.08, Math.max(0, (time - S.last) / 1000)); S.last = time;
    const motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(); if (motion) S.clock += dt;
    S.frame = (S.frame || 0) + 1;
    if (S.sortParent && S.parent.sort) { S.parent.sort('depth'); S.sortParent = false; }
    if (S.sortObjects && S.objects && S.objects.sort) { S.objects.sort('depth'); S.sortObjects = false; }
    const pad = { x: view.x - 60, y: view.y - 60, w: view.w + 120, h: view.h + 120 }; S.view = view;
    // the trees on the banks in the still water, once the planting painters have listed their trunks (looked for every 2 s)
    if (S.mirrorKit) ok(() => S.mirrorKit.step(time));
    for (const e of S.em) {
      const vis = hit(e.b, pad);
      if (vis !== e.vis) { e.vis = vis; for (const g of e.list) g.im.setVisible(vis); for (const q of e.rings || []) q.im.setVisible(vis); }
      if (vis) e.update(motion ? dt : 0, S.clock);
    }
    tickWorst = Math.max(tickWorst, performance.now() - t0);
  }
  function memory() {
    const S = state, L = S && S.layer; if (!L) return null;
    return { chunks: L.chunks, resident: L.live, level: L.level, mb: L.MB, capMb: BUDGET_MB, bakeMedianMs: L.median, bakeP95Ms: L.p95, worstChunkMs: L.worstMs, worstSliceMs: L.sliceWorstMs };
  }
  function status() {
    const S = state; let sprites = 0, visible = 0; if (S) for (const e of S.em) { sprites += e.list.length + (e.rings || []).length; if (e.vis) visible += e.list.length + (e.rings || []).length; }
    const pools = S ? S.em.filter(e => e.kind === 'sea surface' || e.kind === 'lamp light').map(e => e.kind + ' ' + e.list.filter(g => g.on).length + '/' + e.list.length) : null;
    return { mirrors: S && S.mirrorKit ? [S.mirrorKit.count(), S.mirrorKit.mb()] : null, slowest, pools, warm: S ? [S.warmCount, S.warmMs] : null, on: !!S, tod: S && S.tod, waters: S ? S.M.waters.length : 0, buildMs: S && S.buildMs, tickWorst: +tickWorst.toFixed(1), sprites, visible, memory: memory(), weir: S && S.weir ? [Math.round(S.weir.x), Math.round(S.weir.y)] : null, mouths: S ? S.M.mouths.map(m => [Math.round(m.x), Math.round(m.y), Math.round(m.hw)]) : null, lastError };
  }
  /** Whether this painter paints the sea surface too (the native water then draws no surf line of its own along the coast). */
  function paintsSea() { return !!(state && state.layer && state.M && state.M.coast.length); }
  /** Whether this painter lays the scenery's reflections into the water (the native world then reflects only what moves). */
  function mirrorsScenery() { return !!(state && state.layer && state.mirrorKit); }
  return { wanted, paint, tick, clear, status, memory, palette, startView, paintsSea, mirrorsScenery, ownsSea: true, get lastError() { return lastError; } };
})();

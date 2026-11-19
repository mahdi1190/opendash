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
    night: { water: '#4f8f9f', deep: '#326c80', shallow: '#78aeab', sky: '#a9c0d6', skyHi: '#e2ecf8', refl: '#2c4434', reflDeep: '#22372b', glint: '#e4ecff', foam: '#d8e2e6', bed: '#8a8470' },
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
  const TONE = { mere: [0, 0, 0], river: [.06, .08, .8], brook: [.72, .26, 1], spring: [.6, .14, .3], gorge: [.3, .16, 1], tarn: [.38, .34, 0], pool: [.12, .06, 0] }, SHADE = [44, 84, 74], STONE_WET = [104, 104, 86], TB = 8;
  // The open sea far out is the world's own sea fill under this layer (by season); the painted sea fades into it offshore.
  const SEA_BASE = { summer: '#599f9d', spring: '#599f9d', autumn: '#5b9b9a', winter: '#76a8ad' };
  function seaPalette(S) {
    const base = SEA_BASE[S.season] || SEA_BASE.summer, night = S.tod === 'night';
    let edge = '#d2ecdc', shoal = '#7dcfc0', mid = '#5cb0b2';
    if (S.season === 'winter') { edge = mix(edge, '#e2e8e6', .4); shoal = mix(shoal, '#a8c8c8', .45); mid = mix(mid, base, .4); }
    if (night) { edge = mix(edge, base, .3); shoal = mix(shoal, base, .25); mid = mix(mid, base, .15); }
    return { edge: rgbOf(edge), shoal: rgbOf(shoal), mid: rgbOf(mid), base: rgbOf(base), sand: rgbOf('#d6c89a'), wet: '#a8956a', foam: night ? '#dfe8ea' : '#fbfdf6' };
  }
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
    return out;
  }
  function bodyDraw(S, U, sea) {
    const M = S.M, G = window.GardenPaintGround;
    const noise = G ? G.noise : () => .5, fbm = G ? G.fbm : () => .5, SP = sea ? seaPalette(S) : null;
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
      const cn = cw * chh, tS = scratch('tS', cn, true), tD = scratch('tD', cn, true), tR = scratch('tR', cn, true), DS = scratch('DS', cn, true), MS = scratch('MS', cn, true);
      for (let x = gx0; x < gx1; x++) { let sS = 0, sD = 0, sR = 0, sW = 0; for (let y = gy0 - 2 * TB - 1; y < gy1; y++) { const ad = y + TB, sb = y - TB - 1; if (ad >= ty0 && ad < ty1) { const q = ad * gw + x; sS += hS[q]; sD += hD[q]; sR += hR[q]; sW += hW[q]; } if (sb >= gy0 - TB - 1 && sb >= ty0 && sb < ty1) { const q = sb * gw + x; sS -= hS[q]; sD -= hD[q]; sR -= hR[q]; sW -= hW[q]; } if (y >= gy0 && y < gy1) { const j = (y - gy0) * cw + (x - gx0); tS[j] = sW > .01 ? sS / sW / 255 : 0; tD[j] = sW > .01 ? sD / sW / 255 : 0; tR[j] = sW > .01 ? sR / sW / 255 : 0; } } }
      // the colour of the water by how far it lies from the shore; its alpha is the smoothed outline itself, so the edge
      // is soft for a world pixel and then the wet line and the lap are drawn crisp over it
      const out = document.createElement('canvas'); out.width = cw; out.height = chh; const ox = out.getContext('2d'), img = ox.createImageData(cw, chh), o = img.data;
      for (let y = gy0; y < gy1; y++) { const wy = y0 + (y + .5) * FQ;
        for (let x = gx0; x < gx1; x++) { const i = y * gw + x, tj = (y - gy0) * cw + (x - gx0), j = tj * 4, al = Fv[i]; DS[tj] = -1; if (al <= .004) { o[j + 3] = 0; continue; }
          const wx = x0 + (x + .5) * FQ, d = Math.min(DMAX, Math.max(0, (D[i] >= 1e8 ? DMAX : D[i]) * FQ - FQ * .5));
          // broad reaches of darker and paler water, and a finer ripple of tone, so no stretch is one flat colour
          const big = fbm(wx / 260, wy / 170, 41) - .5, fine = noise(wx / 46, wy / 30, 57) - .5, run = tR[tj];
          // running water gets to its own colour within a stride of the bank (a brook is not a strip of sandy glass)
          const e = sstep(0, 7 - 4 * run, d), mm = sstep(3 - 2 * run, 24 - 12 * run, d), k = Math.min(1, Math.max(0, sstep(26, 100, d) * .9 + big * .35));
          // (a running bank is wet stone and earth, not a pale sandy rim)
          const bw = run * .65, b0 = bed[0] + (STONE_WET[0] - bed[0]) * bw, b1 = bed[1] + (STONE_WET[1] - bed[1]) * bw, b2 = bed[2] + (STONE_WET[2] - bed[2]) * bw;
          let rr = b0 + (sh[0] - b0) * (.5 + .5 * e), gg = b1 + (sh[1] - b1) * (.5 + .5 * e), bb = b2 + (sh[2] - b2) * (.5 + .5 * e);
          rr += (wa[0] - rr) * mm; gg += (wa[1] - gg) * mm; bb += (wa[2] - bb) * mm;
          const kk = Math.min(1, k + tD[tj] * (1 - k) * sstep(4, 40, d)), shd = tS[tj] * .62 * (.4 + .6 * mm);
          rr += (dp[0] - rr) * kk; gg += (dp[1] - gg) * kk; bb += (dp[2] - bb) * kk;
          rr += (SHADE[0] - rr) * shd; gg += (SHADE[1] - gg) * shd; bb += (SHADE[2] - bb) * shd;
          let lift = 1 + big * .08 + fine * .045;
          // the current: thin pale lines running with the banks, wavering and broken, and darker water between them
          if (run > .04 && d > 2) { const ph = d * .58 + (noise(wx / 64, wy / 64, 91) - .5) * 5.5, ln = Math.max(0, Math.sin(ph)) ** 5, brk = sstep(.42, .68, noise(wx / 24, wy / 24, 93)); lift += run * (ln * brk * .16 - .035 * (1 - ln)) * sstep(2, 9, d); }
          let al2 = Math.min(1, al * 1.25), mS = 0;
          if (Mc) { mS = marine(wx, wy); MS[tj] = mS; const dS = d >= DMAX - 3 ? Math.max(d, samp(Dc, wx, wy, SEA_D / SQ) * SQ - SQ * .5) : d; DS[tj] = dS;
            if (mS > .002) {
              // sand bars and channels: the shallows widen and narrow along the shore, and a finer unevenness on that
              const bar = fbm(wx / 230, wy / 160, 73) - .5, dn = Math.max(0, dS * (1 - bar * .8) + (noise(wx / 40, wy / 28, 79) - .5) * 9);
              const t0 = sstep(0, 10, dn), t1 = sstep(12, 74, dn), t2 = sstep(80, 176, dn), C = SP;
              let sr = C.edge[0] + (C.shoal[0] - C.edge[0]) * t0, sg = C.edge[1] + (C.shoal[1] - C.edge[1]) * t0, sb = C.edge[2] + (C.shoal[2] - C.edge[2]) * t0;
              sr += (C.mid[0] - sr) * t1; sg += (C.mid[1] - sg) * t1; sb += (C.mid[2] - sb) * t1;
              sr += (C.base[0] - sr) * t2; sg += (C.base[1] - sg) * t2; sb += (C.base[2] - sb) * t2;
              const sand = (1 - sstep(0, 6, dn)) * .3; sr += (C.sand[0] - sr) * sand; sg += (C.sand[1] - sg) * sand; sb += (C.sand[2] - sb) * sand;
              const sl = 1 + big * .06 + fine * .03 * (1 - t2);
              rr = rr * lift * (1 - mS) + sr * sl * mS; gg = gg * lift * (1 - mS) + sg * sl * mS; bb = bb * lift * (1 - mS) + sb * sl * mS; lift = 1;
              al2 *= 1 - mS * sstep(SEA_FADE[0], SEA_FADE[1], dS);
            } }
          o[j] = Math.min(255, rr * lift); o[j + 1] = Math.min(255, gg * lift); o[j + 2] = Math.min(255, bb * lift); o[j + 3] = Math.round(al2 * 255);
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
      const shoreCls = (gx, gy, X, Y) => { const ms = Mc ? marine(X, Y) : 0; if (ms > .5) { const v = noise(X / 64, Y / 44, 97); return v > .58 ? 2 : v > .4 ? 3 : 4; } return tR[loc(gx, gy)] > .45 ? 1 : noise(X / 52, Y / 36, 99) > .5 ? 0 : 5; };
      const outer = contour(fv, .5, shoreCls);
      // swell lines out on the sea: two broken lines a little way off the sand, the nearer one brighter, as if a wave were coming in
      if (Mc) {
        const ds = (gx, gy) => DS[loc(gx, gy)];
        // (kept off the creases where the distance from two shores meets, out of a river mouth or round a spit: a swell line there runs in a V)
        const slope = (gx, gy) => Math.hypot(ds(gx + 1, gy) - ds(gx - 1, gy), ds(gx, gy + 1) - ds(gx, gy - 1)) / (2 * FQ);
        // (and off a shore that turns sharply, round a spit's point: there the line bends into a chevron; the bend of the distance field tells)
        const bend = (gx, gy) => (ds(gx + 2, gy) + ds(gx - 2, gy) + ds(gx, gy + 2) + ds(gx, gy - 2) - 4 * ds(gx, gy)) / (4 * FQ * FQ);
        const swell = (lv, f, cut) => contour(ds, lv, (gx, gy, X, Y) => MS[loc(gx, gy)] > .96 && slope(gx, gy) > .86 && slope(gx + 1, gy + 1) > .86 && Math.abs(bend(gx, gy)) < .022 && noise(X / f, Y / (f * .62), 101 + lv) > cut ? 0 : -1)[0];
        const s1 = swell(20, 120, .5), s2 = swell(46, 150, .56), s3 = null;
        e.s1 = s1; e.s2 = s2; void s3;
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
      for (const b of [0, 1, 5]) if (outer[b]) { cx.strokeStyle = P.bank; cx.globalAlpha = .24; cx.lineWidth = 24; cx.stroke(outer[b]); cx.globalAlpha = .4; cx.lineWidth = 12; cx.stroke(outer[b]); }
      if (SP) for (const b of [2, 3, 4]) if (outer[b]) { cx.strokeStyle = SP.wet; cx.globalAlpha = .2; cx.lineWidth = 12; cx.stroke(outer[b]); cx.globalAlpha = .22; cx.lineWidth = 5; cx.stroke(outer[b]); }
      cx.globalAlpha = 1;
      cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(e.canvas, e.dst[0], e.dst[1], e.dst[2], e.dst[3]);
      if (s1 || s2) { cx.strokeStyle = SP.foam; if (s1) { cx.globalAlpha = .16; cx.lineWidth = 6; cx.stroke(s1); cx.globalAlpha = .5; cx.lineWidth = 1.7; cx.stroke(s1); } if (s2) { cx.globalAlpha = .32; cx.lineWidth = 1.4; cx.stroke(s2); } cx.globalAlpha = 1; }
      for (const b of [0, 1, 5]) if (wet[b]) { cx.strokeStyle = mix(P.bank, '#3e3626', .5); cx.globalAlpha = b === 1 ? .45 : .55; cx.lineWidth = b === 1 ? 2.6 : 3.2; cx.stroke(wet[b]); }
      // (on still water the lap comes and goes along the shore: a whole bright ring round a pond reads as a pool's tiled edge)
      if (lap[0]) { cx.strokeStyle = P.foam; cx.globalAlpha = .14; cx.lineWidth = 6; cx.stroke(lap[0]); cx.globalAlpha = .4; cx.lineWidth = 1.9; cx.stroke(lap[0]); }
      if (lap[5]) { cx.strokeStyle = P.foam; cx.globalAlpha = .07; cx.lineWidth = 5; cx.stroke(lap[5]); cx.globalAlpha = .16; cx.lineWidth = 1.3; cx.stroke(lap[5]); }
      if (lap[1]) { cx.strokeStyle = P.foam; cx.globalAlpha = .14; cx.lineWidth = 1.2; cx.stroke(lap[1]); }
      if (SP) { cx.strokeStyle = SP.foam; for (const [b, w, a] of [[2, 3.6, .92], [3, 2.6, .66], [4, 1.7, .36]]) if (lap[b]) { cx.globalAlpha = a * .3; cx.lineWidth = w * 3.2; cx.stroke(lap[b]); cx.globalAlpha = a; cx.lineWidth = w; cx.stroke(lap[b]); } }
      cx.globalAlpha = 1;
    }
    const entry = cb => { const k = keyOf(cb); let e = cache.get(k); if (!e) e = keep(k, fields(cb)); else keep(k, e); if (e.stage < 2) colour(e, cb); return e; };
    return {
      fields(B, r, cb) { const k = keyOf(cb); if (!cache.has(k)) keep(k, fields(cb)); },
      colour(B, r, cb) { entry(cb); },
      draw(B, r, cb) { const e = entry(cb); if (!e.empty) paintBody(B.cx, e); },
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
    // pebbles and grass lobes on the land side of the waterline
    for (let i = 0; i < n; i += 1) {
      const a = pts[i], nn = norm(i), seg = Math.hypot(pts[(i + 1) % n].x - a.x, pts[(i + 1) % n].y - a.y), steps = Math.max(1, Math.round(seg / 12)); if (seg < 12 && r() > seg / 12) continue;
      for (let k = 0; k < steps; k++) {
        const t = k / steps, b = pts[(i + 1) % n], x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, roll = r();
        if (roll < .34) { const o = 4 + r() * 8, sx = x + nn.x * o, sy = y + nn.y * o, rx = 1.6 + r() * 2.6, d = D().blob(r, sx, sy, rx, rx * .62, 6, .3), d2 = D().ell(sx - rx * .3, sy - rx * .25, rx * .45, rx * .25); const tone = r(); if (!mouths.has(i) && !shoreCovered(x, y)) add({ x: sx - 6, y: sy - 6, w: 12, h: 12 }, (cx, C) => { cx.fillStyle = tone < .5 ? '#a49b86' : '#bcb39c'; cx.fill(P2(d)); cx.fillStyle = '#ddd6c2'; cx.globalAlpha = .7; cx.fill(P2(d2)); cx.globalAlpha = 1; }); }
        else if (roll < .62) { const o = 10 + r() * 10, sx = x + nn.x * o, sy = y + nn.y * o, d = D().blob(r, sx, sy, 7 + r() * 9, 3 + r() * 3, 7, .5), light = r() < .5; if (!mouths.has(i) && !shoreCovered(x, y)) add({ x: sx - 18, y: sy - 8, w: 36, h: 16 }, (cx, C) => { cx.globalAlpha = .55; cx.fillStyle = light ? mix(C.grass, '#c8d08a', .25) : C.grass; cx.fill(P2(d)); cx.globalAlpha = 1; }); }
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
      for (let i = 0; i < (big ? 46 : 10); i++) {
        let x = 0, y = 0, tries = 0; do { x = all.x + r() * all.w; y = all.y + r() * all.h; tries++; } while (tries < 30 && !(inside(x, y, pts) && edgeDist(x, y, pts) > 18));
        if (tries >= 30) continue; const rx = 18 + r() * (big ? 80 : 30), ry = .9 + r() * 1.6, hi = r() < .3;
        add({ x: x - rx, y: y - 4, w: rx * 2, h: 8 }, (cx, C) => { cx.save(); cx.clip(P); cx.globalAlpha = (hi ? .5 : .32) * (C.warm || 1) * (kind === 'tarn' ? .55 : 1); cx.fillStyle = hi ? C.skyHi : C.sky; cx.beginPath(); cx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); cx.fill(); cx.restore(); });
      }
      // a broad pale sky sheen in the open middle (the brightest thing in the picture)
      const c0 = { x: all.x + all.w * .45, y: all.y + all.h * .5 };
      add(all, (cx, C) => { cx.save(); cx.clip(P); const g = cx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, all.w * .42); g.addColorStop(0, C.sky); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.globalAlpha = kind === 'tarn' ? .14 : .28; cx.fillStyle = g; cx.save(); cx.translate(c0.x, c0.y); cx.scale(1, .5); cx.translate(-c0.x, -c0.y); cx.fillRect(all.x, all.y - all.h, all.w, all.h * 3); cx.restore(); cx.restore(); });
    } else if (river) {
      for (let s = r() * 30; s < river.len; s += 16 + r() * 22) {
        const q = at(river, s), lat = (r() - .5) * 1.3 * river.hw, x = q.x - q.ty * lat * W.cellW * .9, y = q.y + q.tx * lat * W.cellH * .9, len = 2.5 + r() * 4, ang = Math.atan2(q.ty, q.tx), hi = r() < .35;   // (short: long pale dashes along a river read as rain)
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
        if (!inside(x, y, pts)) continue;
        const rx = (kind === 'gorge' ? 6 : 4) + r() * 7, sd = D().blob(r, x, y, rx, rx * .6, 7, .35), hl = D().blob(r, x - rx * .3, y - rx * .3, rx * .5, rx * .28, 6, .3), moss = D().blob(r, x - rx * .1, y - rx * .45, rx * .6, rx * .22, 6, .5), ang = Math.atan2(q.ty, q.tx), wake = 6 + r() * 9;
        add({ x: x - 30, y: y - 30, w: 60, h: 60 }, (cx, C) => {
          // the V of white water downstream of the stone, then the stone itself
          cx.save(); cx.translate(x, y); cx.rotate(ang); cx.globalAlpha = .4; cx.strokeStyle = C.foam; cx.lineWidth = 1.3; cx.lineCap = 'round';
          cx.beginPath(); cx.moveTo(rx * .6, -rx * .5); cx.quadraticCurveTo(rx + wake * .5, -rx * .7, rx + wake, -rx * 1.2); cx.moveTo(rx * .6, rx * .5); cx.quadraticCurveTo(rx + wake * .5, rx * .7, rx + wake, rx * 1.2); cx.stroke();
          cx.globalAlpha = .35; cx.fillStyle = C.foam; cx.beginPath(); cx.ellipse(-rx * .9, 0, 2.5, rx * .8, 0, 0, Math.PI * 2); cx.fill(); cx.restore();
          cx.fillStyle = '#6f6a5c'; cx.fill(P2(sd)); cx.globalAlpha = .9; cx.fillStyle = '#9c9580'; cx.fill(P2(hl)); cx.globalAlpha = .8; cx.fillStyle = C.moss; cx.fill(P2(moss)); cx.globalAlpha = 1;
        });
      }
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
      const bedAt = kind === 'mere' ? .64 : kind === 'river' ? .6 : kind === 'brook' ? .62 : .6;
      for (let i = 0, acc = 0, arc = 0; i < n; i++) { const step = Math.hypot(pts[(i + 1) % n].x - pts[i].x, pts[(i + 1) % n].y - pts[i].y); acc += step; arc += step; if (acc < 26) continue; acc = 0;
        const a = pts[i], nn = norm(i);
        if (kind === 'mere' && a.y < all.y + 40 + all.h * .18) continue;
        const westBank = kind === 'mere' && a.x < all.x + all.w * .32 && a.y > all.y + all.h * .35, estuary = kind === 'river' && a.y > W.sky + 74 * W.cellH;
        const bed = field(arc / 60) > bedAt - (westBank || estuary ? .3 : 0) && !(kind === 'mere' && nn.y < -.5 && a.x > all.x + all.w * .3 && a.x < all.x + all.w * .55);
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

  /* ---------- live layers ---------- */
  function liveTextures(scene) {
    const make = (key, w, h, draw) => { const k = TEX + '-' + key; if (scene.textures.exists(k)) return k; const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); scene.textures.addCanvas(k, c); return k; };
    return {
      glint: make('glint', 40, 8, (cx, w, h) => { const g = cx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.save(); cx.translate(w / 2, h / 2); cx.scale(1, h / w); cx.translate(-w / 2, -h / 2); cx.fillStyle = g; cx.fillRect(0, -w, w, w * 3); cx.restore(); }),
      spark: make('spark', 12, 12, (cx, w) => { const g = cx.createRadialGradient(6, 6, 0, 6, 6, 6); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.fillRect(0, 0, w, w); cx.fillStyle = 'rgba(255,255,255,.8)'; cx.fillRect(5.5, 1, 1, 10); cx.fillRect(1, 5.5, 10, 1); }),
      ring: make('ring', 80, 24, (cx) => { cx.strokeStyle = 'rgba(240,248,246,.9)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(40, 12, 36, 9, 0, 0, Math.PI * 2); cx.stroke(); cx.strokeStyle = 'rgba(40,60,70,.35)'; cx.lineWidth = 1.2; cx.beginPath(); cx.ellipse(40, 13.5, 35, 8.5, 0, .2, Math.PI - .2); cx.stroke(); }),
      // (centred in the squashed space, so the puff fades to nothing at every edge: centred at (80, 40) it was cut flat
      //  along its top and every mist puff over the plunge pool showed as a pale rectangle)
      mist: make('mist2', 160, 80, (cx, w, h) => { const g = cx.createRadialGradient(80, 80, 0, 80, 80, 78); g.addColorStop(0, 'rgba(250,252,252,.85)'); g.addColorStop(.45, 'rgba(244,248,248,.4)'); g.addColorStop(1, 'rgba(244,248,248,0)'); cx.save(); cx.scale(1, .5); cx.fillStyle = g; cx.fillRect(0, 0, 160, 160); cx.restore(); }),
      foam: make('foam', 64, 32, (cx) => { const r = rng(77); for (let i = 0; i < 26; i++) { const x = 8 + r() * 48, y = 6 + r() * 20, rr = 2 + r() * 6; const g = cx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, rr, 0, Math.PI * 2); cx.fill(); } }),
      // a strip of white water that tiles along x: the weir and riffle foam scroll this
      // a wave running up the sand: a soft white crescent, brightest along its leading edge, fading back into the sea
      lap: make('lap', 64, 16, (cx) => { const g = cx.createLinearGradient(0, 3, 0, 15); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(2, 9); cx.quadraticCurveTo(32, 1, 62, 9); cx.quadraticCurveTo(32, 18, 2, 9); cx.fill(); const e = cx.createLinearGradient(0, 0, 64, 0); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(.18, 'rgba(0,0,0,0)'); e.addColorStop(.82, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)'); cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = e; cx.fillRect(0, 0, 64, 16); }),
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
          q.im.setPosition(q.x, q.y).setScale(.15 + f * .9, .15 + f * .8).setAlpha(f < .7 ? (1 - f / .7) * .3 : 0);
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
      const a = span(-1), b = span(1), stones = []; for (let i = 0; i <= 10; i++) { const t = i / 10, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; stones.push([p.x, p.y, 7 + r() * 3, r()]); }
      const up = 16, down = 34, box = { x: Math.min(a.x, b.x) - 60, y: Math.min(a.y, b.y) - 60, w: Math.abs(b.x - a.x) + 120, h: Math.abs(b.y - a.y) + 120 };
      const clipW = () => { const w = M.waters.find(w => w.id === 'river-3') || M.waters.find(w => w.kind === 'river' && inside(q.x, q.y, w.pts)); return w ? (() => { const p = new Path2D(); p.moveTo(w.pts[0].x, w.pts[0].y); for (const z of w.pts) p.lineTo(z.x, z.y); p.closePath(); return p; })() : null; };
      let clip = null;
      extras.push({ b: box, draw(c, C) {
        clip = clip || clipW(); c.save(); if (clip) c.clip(clip);
        // still water held above the sill: darker, smooth, a bright sky line
        c.save(); c.translate(q.x, q.y); c.rotate(ang);
        c.globalAlpha = .35; c.fillStyle = C.deep; c.fillRect(-up - 30, -half * 1.4, 30, half * 2.8);
        c.globalAlpha = .45; c.fillStyle = C.skyHi; c.fillRect(-10, -half * 1.2, 2, half * 2.4);
        // white water below the sill
        const g = c.createLinearGradient(0, 0, down + 20, 0); g.addColorStop(0, 'rgba(250,252,250,.95)'); g.addColorStop(.4, 'rgba(240,248,246,.55)'); g.addColorStop(1, 'rgba(240,248,246,0)');
        c.globalAlpha = 1; c.fillStyle = g; c.fillRect(4, -half * 1.3, down + 20, half * 2.6);
        c.restore(); c.restore();
        // the sill: dressed stones lit from the upper left, a dark wet face downstream
        for (const [x, y, rr, t] of stones) { c.fillStyle = '#5c584c'; c.beginPath(); c.ellipse(x + 2, y + 3, rr, rr * .6, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = t < .5 ? '#b3ab94' : '#a39b85'; c.beginPath(); c.ellipse(x, y, rr, rr * .55, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#d8d0b8'; c.globalAlpha = .8; c.beginPath(); c.ellipse(x - rr * .3, y - rr * .2, rr * .5, rr * .22, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; if (t > .6) { c.fillStyle = C.moss; c.globalAlpha = .7; c.beginPath(); c.ellipse(x + rr * .2, y - rr * .3, rr * .4, rr * .18, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; } }
      } });
      foams.push({ x: q.x + q.tx * 16, y: q.y + q.ty * 16, w: half * 1.7, h: 26, ang: ang + Math.PI / 2, speed: 26, puffs: 12, drift: 34 });
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
        rafts.forEach(([x, y, rr, t], ri) => { const d = Math.hypot((x - pool.x) / 1.3, (y - pool.y) / .45) / 120, a0 = Math.atan2((y - pool.y) / .45, (x - pool.x) / 1.3), R = Math.max(18, d * 120), q = rng(hash('raft') + ri * 7919);
          const px = pool.x + Math.cos(a0) * R * 1.3, py = pool.y + 6 + Math.sin(a0) * R * .45, ang = Math.atan2(Math.cos(a0) * .45, -Math.sin(a0) * 1.3), al = Math.max(.07, .6 - d * .5), n = 3 + Math.floor(q() * 6);
          c.save(); c.translate(px, py); c.rotate(ang);
          for (let k = 0; k < n; k++) { const bx = (q() - .5) * rr * 3.2, by = (q() - .5) * rr * .7, br = .9 + q() * (2.6 - d * 1.2); c.globalAlpha = al * (.45 + q() * .55); c.beginPath(); c.ellipse(bx, by, br * 1.5, br * .8, 0, 0, Math.PI * 2); c.fill(); }
          c.restore(); });
        // (no whole rings drawn round it: three perfect ellipses read as a target; the broken arcs above are the spreading water)
        const g2 = c.createRadialGradient(pool.x, pool.y - 6, 0, pool.x, pool.y - 6, width * .9); g2.addColorStop(0, 'rgba(255,255,255,.95)'); g2.addColorStop(.6, 'rgba(245,250,248,.5)'); g2.addColorStop(1, 'rgba(245,250,248,0)');
        c.globalAlpha = 1; c.fillStyle = g2; c.save(); c.translate(pool.x, pool.y - 6); c.scale(1, .45); c.beginPath(); c.arc(0, 0, width * .9, 0, Math.PI * 2); c.fill(); c.restore();
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
    S.tex = liveTextures(scene); S.em = ok(() => emitters(S)) || [];
    // every reed stamp is drawn now, with the ground, so walking never pays for one
    { const w0 = performance.now(), need = new Set(); for (const w of S.M.waters) for (const f of w.feats) if (f.needs) for (const q of f.needs) need.add(stampKey(q[0], q[1], S.season, q[2]) + '#' + q.join('#')); for (const k of need) { const q = k.split('#').slice(1); stampCanvas(q[0], +q[1], S.season, +q[2]); } S.warmMs = Math.round(performance.now() - w0); S.warmCount = need.size; }
    // the still picture: the paint kit's layer bakes it at the camera's level; the chunks on screen now are baked at once
    // (lazy: false), so the first frame has its water
    const G = window.GardenPaintGround, a = S.M.all, box = { x: Math.floor(a.x / 256) * 256, y: Math.floor(a.y / 256) * 256, w: 0, h: 0 }; box.w = Math.ceil((a.x1 + 200 - box.x) / 256) * 256; box.h = Math.ceil((a.y1 + 200 - box.y) / 256) * 256; S.box = box;
    if (G && G.layer) S.layer = ok(() => G.layer(scene, parent, layerOps(S), { key: TEX + '|' + S.tod + '|' + S.season + '|' + (++serialAll), box, chunk: 256, depth: -9590, budgetMB: BUDGET_MB, slice: 8, lazy: false, minK: 1, maxK: 4 }));
    S.buildMs = Math.round(performance.now() - t0);
    return { destroy: clear };
  }
  function clear() {
    if (!state) return; const S = state; state = null;
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
    const pad = { x: view.x - 60, y: view.y - 60, w: view.w + 120, h: view.h + 120 };
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
    return { slowest, warm: S ? [S.warmCount, S.warmMs] : null, on: !!S, tod: S && S.tod, waters: S ? S.M.waters.length : 0, buildMs: S && S.buildMs, tickWorst: +tickWorst.toFixed(1), sprites, visible, memory: memory(), weir: S && S.weir ? [Math.round(S.weir.x), Math.round(S.weir.y)] : null, mouths: S ? S.M.mouths.map(m => [Math.round(m.x), Math.round(m.y), Math.round(m.hw)]) : null, lastError };
  }
  /** Whether this painter paints the sea surface too (the native water then draws no surf line of its own along the coast). */
  function paintsSea() { return !!(state && state.layer && state.M && state.M.coast.length); }
  return { wanted, paint, tick, clear, status, memory, palette, startView, paintsSea, ownsSea: true, get lastError() { return lastError; } };
})();

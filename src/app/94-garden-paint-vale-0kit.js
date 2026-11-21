/* Painted vale: the places the other painters left plain, painted as composed
 * pictures in the opening scenes' flat-vector house style (soft shading lit from
 * the upper left, no outlines, lobed natural shapes; docs/dev/SCENE_LESSONS.md):
 * the quay and harbour, the old woodland's ruins, the river crossings, the
 * plazas and the Great Oak, the high orchard's terraces, and the mainland that
 * runs on past the west and north edges.
 *
 * This file is the shared part: palettes, reading the layout, and the front
 * door (GardenPaintVale.paint / tick / clear / status), which GardenPaintNature
 * calls with the water and the woods. The pictures are in 94-garden-paint-vale-1*.js
 * (each adds its painters to GardenPaintVale.parts).
 *
 * Layers, all baked once and cached (nothing redraws while walking):
 *   ground   chunked (GardenPaintTerrainKit.chunked, 256 px, K 1.1, 20 MB budget), at -9346:
 *            over the village ground and the painted water, under every prop;
 *   under    the water in the crossings' gaps, small sprites at -9592, under the
 *            painted rivers (their own banks overlap it, so there is no seam);
 *   mainland chunked at K 0.35, 512 px (it is seen far off; 6 MB budget), at -9268 over the sea;
 *   things   sprites that stand up (walls, boats, crates, trees) in the object
 *            layer, depth = their base line, so the player walks behind them.
 * Chunks bake lazily, a slice of at most 10 ms at a time, nearest the camera
 * first, and far chunks are let go past a texture budget (status().textureMB).
 * Only rendering: cells, walking, picking and saved rows are untouched.
 * Nothing here runs at load. */
window.GardenPaintVale = (function () {
  'use strict';
  const KIT = () => window.GardenPaintTerrainKit;
  const DEPTH = -9346, UNDER = -9592, MAIN_DEPTH = -9268;
  const parts = [], groundSigs = [], softRoutes = new Set();
  let cur = null, heldGround = null, lastError = null, stats = {}, feetNow = [], feetSig = '';
  const memo = new Map();
  const ok = f => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };

  const BASE = {
    sand: '#e3d2a2', sandWet: '#c8b483', sandDk: '#a8946a', shallow: '#93c4bf', sea: '#6d9fb0', seaDk: '#4f8296', foam: '#f2f5ea',
    path: '#d7c294', pathEdge: '#b29a6b', pathWear: '#e5d5ab', stone: '#dcc8a0', stoneLo: '#bea47b', stoneHi: '#eddcb6', kerb: '#9f8560', grout: '#76664d',
    wall: '#b8ae96', wallLo: '#8f866f', wallHi: '#d8cfb6', wallDk: '#5e584a', moss: '#7d8f4e', mossHi: '#a3b06a', ivy: '#3f5e34', ivyHi: '#5f8446',
    wood: '#9a7a54', woodLo: '#6e5438', woodHi: '#c4a478', woodDk: '#4a3a2c', iron: '#2f3336', rope: '#c9b07a',
    river: '#7f93ae', riverDk: '#617796', riverHi: '#c4d3e2', bank: '#8a7a58', soil: '#7d5d40',
    haze: '#b9c6cc', hazeDk: '#9fb0b9', far: '#8ea0a8',
  };
  const PAL = {
    summer: Object.assign({}, BASE, { lawn: '#93ad5f', lawnLo: '#7c9a4e', lawnHi: '#a9bf6c', floor: '#7f8a4e', leaf: ['#3f6534', '#557e40', '#7aa255', '#a5c26e'], flower: ['#f4f0e0', '#f0d24a', '#c79ac0', '#e88a8a'], mainField: ['#a8b86c', '#94ab5c', '#b9c47c', '#c9c48a'] }),
    spring: Object.assign({}, BASE, { lawn: '#8fb35f', lawnLo: '#78a04e', lawnHi: '#a8c66f', floor: '#7d8c4c', leaf: ['#456c36', '#5e8a44', '#86b058', '#b4d27e'], flower: ['#fff8f0', '#f0d24a', '#f4c6d2', '#ffffff'], mainField: ['#a6c06a', '#8fb05a', '#bccb7c', '#d6d68a'] }),
    autumn: Object.assign({}, BASE, { lawn: '#9aa65a', lawnLo: '#848f49', lawnHi: '#b2b66a', floor: '#8a7a46', leaf: ['#6e5a2c', '#9a6a2e', '#c4883a', '#e2b45a'], flower: ['#e8dcc0', '#d8a040', '#a8503a', '#e0c070'], mainField: ['#a8a860', '#98a050', '#b4b070', '#8e9a50', '#c2a868'] }),
    winter: Object.assign({}, BASE, { lawn: '#a6b29a', lawnLo: '#929f87', lawnHi: '#bcc5b0', floor: '#8e8e7c', leaf: ['#4e5e4c', '#66766a', '#8a9888', '#b4c0b4'], flower: ['#f4f6f2', '#e8ecef', '#d8dee2', '#ffffff'], mainField: ['#b2baa6', '#a2ab96', '#c4cab8', '#d6dace'], sand: '#ddd3b6', sandWet: '#c4b897', shallow: '#a2c4c4', sea: '#7a9fab' }),
  };

  function wanted() { return !!(KIT() && window.GardenNativePainted && GardenNativePainted.wanted() && GardenNativePainted.ready() && typeof gardenIslandActive === 'function' && gardenIslandActive() && typeof Path2D === 'function' && typeof sceneDraw !== 'undefined'); }

  /* ---------- reading the layout ---------- */
  function readLayout(W, data, cellAt) {
    const cw = W.cellW, ch = W.cellH, cpt = (x, y) => ({ x: x * cw, y: W.sky + y * ch }), pt = p => cpt(p[0], p[1]);
    const L = { cellAt, soil: cultivatedGround(W, cellAt) };
    const pres = data.presentation || {}, base = (x, y) => gardenIslandBaseCell(x, y);
    // (the outline drawn as a curve through its points: straight runs between them showed as facets and corners along the
    // shore, and the foam followed them: coast fix round 2. Only the picture; walking reads the layout's own outline)
    const coast = ((data.coast && data.coast.land) || []).map(l => smoothLoop(l.map(pt)));
    const mat = (x, y) => { const c = L.cellAt ? L.cellAt(Math.floor(x), Math.floor(y)) : null; return c ? c.material : ''; };
    const statics = data.static || [], stat = id => statics.find(s => s.id === id);
    const routes = new Map((data.routes || []).map(r => [r.id, window.GardenPaintGround && GardenPaintGround.paintRoute ? GardenPaintGround.paintRoute(r) : r]));   // (as painted: see GardenPaintGround.setRouteHook)
    const routePts = id => { const r = routes.get(id); return r && r.points && r.points.length > 1 ? gardenIslandRoutePath(r).points.map(p => cpt(p.x, p.y)) : []; };
    // what a spot is: 'grass' (land the painters may dress), 'path', 'beach', 'water', '' (off the island)
    const kind = (x, y) => {
      const b = base(x, y); if (!b || !b.land) return b && b.ocean ? 'sea' : '';
      if (b.freshwater) return 'water';
      const m = mat(x, y); if (m === 'path') return 'path'; if (b.beach || m === 'beach') return 'beach';
      if (['water', 'lake', 'pool', 'ice', 'ocean'].includes(m)) return 'water';
      return 'grass';
    };
    // the footprints the painters keep clear of (statics with their aprons, one cell round)
    const taken = new Set(); for (const p of statics) for (const b of [p, p.apron].filter(Boolean)) for (let y = Math.floor(b.y) - 1; y <= b.y + b.h; y++) for (let x = Math.floor(b.x) - 1; x <= b.x + b.w; x++) taken.add(x + ',' + y);
    const free = (x, y) => !taken.has(Math.floor(x) + ',' + Math.floor(y));
    const plot = (x, y) => { const c = L.cellAt ? L.cellAt(Math.floor(x), Math.floor(y)) : null; return !!(c && c.row && c.row.plot); };
    return Object.assign(L, { W, D: data, pres, cw, ch, cpt, pt, base, coast, mat, kind, stat, routes, routePts, free, plot });
  }
  // Read the already-built cell table once at repaint, never while walking.
  // Actual soil stays visible through decorative meadow and road overlays.
  function cultivatedGround(W, cellAt) {
    if (!cellAt) return { sig: '0', path: null };
    const kinds = new Set(['bed', 'patch', 'veg', 'rich', 'herb', 'berry']), path = new Path2D(), has = new Set(); let hash = 2166136261, count = 0;
    const bb = [Infinity, Infinity, -Infinity, -Infinity]; path.rect(0, 0, W.cols * W.cellW, W.sky + W.rows * W.cellH);
    for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
      const c = cellAt(x, y); if (!c || !kinds.has(c.material)) continue;
      has.add(x + ',' + y); hash = Math.imul(hash ^ (y * W.cols + x), 16777619); count++;
      const px = x * W.cellW, py = W.sky + y * W.cellH; bb[0] = Math.min(bb[0], px); bb[1] = Math.min(bb[1], py); bb[2] = Math.max(bb[2], px + W.cellW); bb[3] = Math.max(bb[3], py + W.cellH);
    }
    // The soil's outline with its corners rounded as the bed's own edge is (2.74): cut out cell by cell it left a small
    // square of bare lawn at every corner of a bed.
    const next = new Map(), edge = (x0, y0, x1, y1) => { const k = x0 + ',' + y0; let a = next.get(k); if (!a) next.set(k, a = []); a.push([x1, y1]); };
    for (const k of has) { const [x, y] = k.split(',').map(Number);
      if (!has.has(x + ',' + (y - 1))) edge(x, y, x + 1, y); if (!has.has((x + 1) + ',' + y)) edge(x + 1, y, x + 1, y + 1);
      if (!has.has(x + ',' + (y + 1))) edge(x + 1, y + 1, x, y + 1); if (!has.has((x - 1) + ',' + y)) edge(x, y + 1, x, y); }
    for (const [k0, outs] of next) while (outs.length) {
      const start = k0.split(',').map(Number); let loop = [start], cur = start, to = outs.pop(), dir = [to[0] - cur[0], to[1] - cur[1]];
      for (let guard = 0; guard < 20000; guard++) {
        cur = to; if (cur[0] === start[0] && cur[1] === start[1]) break; loop.push(cur);
        const o = next.get(cur[0] + ',' + cur[1]); if (!o || !o.length) break;
        let pick = 0; if (o.length > 1) pick = Math.max(0, o.findIndex(q => q[0] - cur[0] === -dir[1] && q[1] - cur[1] === dir[0]));
        to = o.splice(pick, 1)[0]; dir = [to[0] - cur[0], to[1] - cur[1]];
      }
      loop = loop.filter((p, i) => { const a = loop[(i - 1 + loop.length) % loop.length], b = loop[(i + 1) % loop.length]; return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]); });
      if (loop.length < 4) continue;
      const P = loop.map(p => ({ x: p[0] * W.cellW, y: W.sky + p[1] * W.cellH })), m = P.length, mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), s0 = mid(P[m - 1], P[0]);
      path.moveTo(s0.x, s0.y);
      for (let i = 0; i < m; i++) { const a = P[(i - 1 + m) % m], p = P[i], b = P[(i + 1) % m], q = mid(p, b), rad = Math.min(12, Math.hypot(p.x - a.x, p.y - a.y) / 2, Math.hypot(b.x - p.x, b.y - p.y) / 2); path.arcTo(p.x, p.y, q.x, q.y, rad); path.lineTo(q.x, q.y); }
      path.closePath();
    }
    return { sig: count ? count + ':' + (hash >>> 0) : '0', path: count ? path : null, bb };
  }
  const loopPath = (loops) => { const p = new Path2D(); for (const l of loops) { if (!l.length) continue; p.moveTo(l[0].x, l[0].y); for (let i = 1; i < l.length; i++) p.lineTo(l[i].x, l[i].y); p.closePath(); } return p; };
  const strokePts = (B, pts, col, w, op, dx, dy) => { if (pts.length < 2) return; const p = new Path2D(); p.moveTo(pts[0].x + (dx || 0), pts[0].y + (dy || 0)); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x + (dx || 0), pts[i].y + (dy || 0)); B.s(p, col, w, op); };
  // Match the native road outside the village and its narrower painted road
  // inside. The same ninety-pixel feather makes their shoulders meet gently.
  /** A closed polygon in cells, smoothed (Catmull-Rom) and in px: the shaped plazas (2.74). */
  function shapeLoop(L, poly, n) { const out = [], m = poly.length, k = n || 6; for (let i = 0; i < m; i++) { const p0 = poly[(i - 1 + m) % m], p1 = poly[i], p2 = poly[(i + 1) % m], p3 = poly[(i + 2) % m]; for (let j = 0; j < k; j++) { const t = j / k, t2 = t * t, t3 = t2 * t, f = q => .5 * ((2 * p1[q]) + (-p0[q] + p2[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3); out.push(L.cpt(f(0), f(1))); } } return out; }
  function routeRibbon(L, route, edge) {
    const sampled = gardenIslandRoutePath(route), pts = sampled.points, st = gardenIslandRoadStyle(route), start = L.D.anchors.start, left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], a = pts[i ? i - 1 : sampled.closed ? pts.length - 2 : 0], b = pts[i < pts.length - 1 ? i + 1 : sampled.closed ? 1 : i];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, pxLen = Math.hypot(dx * L.cw, dy * L.ch) || 1, q = L.cpt(p.x, p.y);
      const inset = Math.min((p.x - start.x + 18) * L.cw, (start.x + 19 - p.x) * L.cw, (p.y - start.y + 26) * L.ch, (start.y + 18 - p.y) * L.ch);
      const fade = Math.max(0, Math.min(1, inset / 90)), t = fade * fade * (3 - 2 * fade), radius = edge ? st.edgeRadius : st.radius, half = (st.main ? 20 : 13) + (edge ? 2.5 : 0);
      // an authored route (the village, 2.74) has its own width at every point, the same inside the village ground and out
      const aw = Array.isArray(route.widths) ? gardenIslandRouteWidthAt(route, p.x, p.y) * .46 + (edge ? .06 : 0) : 0;
      const ox = aw ? -dy / len * aw * L.cw : -dy / len * radius * L.cw * (1 - t) - dy * L.ch / pxLen * half * t, oy = aw ? dx / len * aw * L.ch : dx / len * radius * L.ch * (1 - t) + dx * L.cw / pxLen * half * t;
      left.push({ x: q.x + ox, y: q.y + oy }); right.push({ x: q.x - ox, y: q.y - oy });
    }
    return left.concat(right.reverse());
  }
  function groundClips(L) {
    if (L.groundClips) return L.groundClips;
    const W = L.W, kit = KIT(), cuts = [], lanes = [], area = poly => poly.reduce((sum, p, i) => { const q = poly[(i + 1) % poly.length]; return sum + p.x * q.y - q.x * p.y; }, 0);
    const ring = (p, poly, positive) => p.addPath(loopPath([(area(poly) > 0) === positive ? poly : poly.slice().reverse()]));
    const outside = (poly, holes) => {
      const p = new Path2D(); p.rect(-L.cw * 2, -L.ch * 2, (W.cols + 4) * L.cw, W.sky + (W.rows + 4) * L.ch); ring(p, poly, false);
      // Nonzero winding restores support even where its end extends beyond
      // this particular water polygon. Separate cuts keep overlapping rivers wet.
      for (const hole of holes || []) ring(p, hole, true);
      return { bb: kit.bboxOf(poly, 0), path: p };
    };
    const crossings = W.v >= 5 && typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry() : [], supports = crossings.map(c => c.support.map(p => L.cpt(p.x, p.y)));
    for (const f of L.D.freshwater || []) if (f.boundary && f.boundary.length > 2) cuts.push(outside(f.boundary.map(L.pt), supports));
    for (const c of crossings) cuts.push(outside(c.points.map(p => L.cpt(p.x, p.y)), supports));
    for (const route of L.routes.values()) if (route.points && route.points.length > 1 && !softRoutes.has(route.id)) lanes.push(outside(routeRibbon(L, route, true)));   // (a soft route is a worn line painted over the turf: the wash runs on under it)
    // Only the visible doorway forecourt stays bare, rather than a rectangular
    // hole round the building's entire physical reservation.
    for (const prop of L.D.static || []) {
      const a = prop.apron; if (!a || !prop.door) continue;
      const fw = Math.min(2.8, prop.w + .4, a.w - .4), fh = Math.min(1.25, a.h - .2); if (fw <= 0 || fh <= 0) continue;
      const x = Math.max(a.x + .1, Math.min(a.x + a.w - fw - .1, prop.door.x + .5 - fw / 2)), y = Math.max(a.y + .1, Math.min(a.y + a.h - fh - .1, prop.y + prop.h + .1));
      const q = L.cpt(x, y), p = new Path2D(); p.rect(-L.cw * 2, -L.ch * 2, (W.cols + 4) * L.cw, W.sky + (W.rows + 4) * L.ch);
      p.roundRect(q.x, q.y, fw * L.cw, fh * L.ch, 12); lanes.push({ bb: [q.x, q.y, q.x + fw * L.cw, q.y + fh * L.ch], path: p, rule: 'evenodd' });
    }
    // The coast painter uses this exact inward offset for the sand/lawn seam.
    const lawn = L.coast.map(poly => poly.map((p, i) => {
      const a = poly[(i + poly.length - 1) % poly.length], b = poly[(i + 1) % poly.length], al = Math.hypot(p.x - a.x, p.y - a.y) || 1, bl = Math.hypot(b.x - p.x, b.y - p.y) || 1;
      const ax = -(p.y - a.y) / al, ay = (p.x - a.x) / al, bx = -(b.y - p.y) / bl, by = (b.x - p.x) / bl, d = (L.D.coast.beachWidthPx || 0) / Math.max(.25, 1 + ax * bx + ay * by);
      return { x: p.x + (ax + bx) * d, y: p.y + (ay + by) * d };
    }));
    return L.groundClips = { coast: loopPath(L.coast), lawn: loopPath(lawn), cuts, lanes };
  }
  /** Retained continuous ground limits, applied only while a chunk is baked. */
  function clipGround(B, L, cb, meadow, soft) {
    const clips = groundClips(L); B.cx.clip(meadow ? clips.lawn : clips.coast);
    for (const cut of clips.cuts) if (KIT().meets(cut.bb, cb)) B.cx.clip(cut.path);
    if (meadow && !soft) for (const cut of clips.lanes) if (KIT().meets(cut.bb, cb)) B.cx.clip(cut.path, cut.rule || 'nonzero');
    if (L.soil.path && KIT().meets(L.soil.bb, cb)) B.cx.clip(L.soil.path, 'evenodd');
  }
  /** A closed outline as a smooth curve through its own points (Catmull-Rom, a few steps a segment). Picture only. */
  function smoothLoop(pts, steps) {
    const n = pts.length; if (n < 4) return pts; steps = steps || 4; const out = [];
    for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let k = 0; k < steps; k++) { const t = k / steps, t2 = t * t, t3 = t2 * t;
        out.push({ x: .5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: .5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) }); } }
    return out;
  }
  /** Points along a polyline every step px, with the unit tangent. */
  function walk(pts, step) {
    const out = []; let carry = 0;
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y); if (!L) continue; const tx = (b.x - a.x) / L, ty = (b.y - a.y) / L; for (let t = carry; t < L; t += step) out.push({ x: a.x + tx * t, y: a.y + ty * t, tx, ty }); carry = (carry - L) % step; if (carry < 0) carry += step; }
    return out;
  }
  /** A lobed organic outline round a centre (world px): n points, radii rx, ry, ragged by rag. */
  function lobe(r, cx, cy, rx, ry, n, rag) { const out = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (r() - .5) * rag; out.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k }); } return out; }
  /** A capsule round a segment a-b (world px) with radii rx, ry, lobed a little. */
  function capsule(r, a, b, rx, ry, rag) {
    const out = [], n = 28, L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), end = c * ux + s * uy >= 0 ? b : a, k = 1 + (r() - .5) * (rag || .12); out.push({ x: end.x + c * rx * k, y: end.y + s * ry * k }); }
    // a convex hull keeps it one clean shape
    return hull(out);
  }
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y), cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x), lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  /** A continuous meadow wash, then quiet drifts, tufts and flowers. The caller
   *  clips its region; clipGround keeps the whole wash off roads, water and sand.
   *  test(x, y) places details; fade(x, y) feathers into the village ground. */
  function lawn(B, r, L, P, cb, test, fade, o) {
    o = o || {}; const W = L.W, cw = L.cw, ch = L.ch;
    B.cx.save(); clipGround(B, L, cb, true, !!o.soft);   // (soft: the caller fades the roads out itself)
    // (noBase: the shared ground's own kind shows through, painted with its light and shade; a flat fill here hid it)
    if (o.wash) o.wash(B, cb, o.base || P.lawn);
    else if (!o.noBase) B.f(B.rect(cb[0], cb[1], cb[2] - cb[0], cb[3] - cb[1]), o.base || P.lawn);
    // Keep overlapping meadow drifts subordinate to the seasonal grass detail.
    KIT().tiles(cb, 120, 40, o.salt || 5, (tx, ty, rr) => {
      for (let k = 0; k < 7; k++) {
        const x = tx + rr() * 120, y = ty + rr() * 120, cx = x / cw, cy = (y - W.sky) / ch; if (!test(Math.floor(cx), Math.floor(cy))) continue;
        const a = fade ? fade(cx, cy) : 1; if (a <= 0) continue; const n = KIT().fbm(x / 260, y / 180, 9);
        B.f(B.blob(rr, x, y, 22 + rr() * 34, 8 + rr() * 12, 8, .5), n > .55 ? P.lawnHi : n < .42 ? P.lawnLo : (o.drift || P.lawn), (.08 + rr() * .06) * a);
      }
      for (let k = 0; k < 9; k++) {
        const x = tx + rr() * 120, y = ty + rr() * 120, cx = x / cw, cy = (y - W.sky) / ch; if (!test(Math.floor(cx), Math.floor(cy))) continue;
        const a = fade ? fade(cx, cy) : 1; if (a <= 0) continue;
        B.tufts(rr, x, y, 8, 3 + Math.floor(rr() * 3), [P.lawnLo, P.lawnHi, P.leaf[1]], 5).cx.globalAlpha = 1;
        if (rr() < .25) for (let f = 0; f < 4; f++) B.f(B.circ(x + (rr() - .5) * 12, y - rr() * 4, .9 + rr() * .6), P.flower[Math.floor(rr() * P.flower.length)], .9 * a);
      }
    });
    B.cx.restore();
  }
  /** Flagstones in courses over a clip (world px box): pale stones with joints, some lit, some worn, moss in a few. */
  function flags(B, r, P, bb, o) {
    o = o || {}; const row0 = o.row || 14, w0 = o.w || 26; let rowH = row0;   // (rowVar: courses of different depths, as laid stone is)
    if (o.pal) P = Object.assign({}, P, o.pal);   // (a stone of its own: the quay's granite)
    B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), P.stone);
    // broad wear and weather first, so the stones sit in one light
    KIT().tiles(bb, 140, 0, (o.salt || 1) + 50, (tx, ty, rr) => { for (let k = 0; k < 3; k++) B.f(B.blob(rr, tx + rr() * 140, ty + rr() * 140, 30 + rr() * 50, 12 + rr() * 18, 9, .5), rr() < .5 ? P.stoneHi : P.stoneLo, .35); });
    for (let y = Math.floor(bb[1] / row0) * row0; y < bb[3]; y += rowH) {
      if (o.rowVar) rowH = Math.round(row0 * (1 - o.rowVar + 2 * o.rowVar * KIT().rng(KIT().hash(Math.round(y), 5, o.salt || 1))()));
      const rr = KIT().rng(KIT().hash(Math.round(y), 3, o.salt || 1));
      B.f(B.rect(bb[0], y + rowH - 1.1, bb[2] - bb[0], 1.1), o.grout || P.grout, .42);
      for (let x = Math.floor(bb[0] / w0) * w0 - rr() * w0; x < bb[2]; ) {
        const w = w0 * (.7 + rr() * .7), tone = rr();
        if (o.broken && rr() < o.broken) { B.f(B.rect(x, y, w, rowH), P.lawnLo, .55); B.tufts(rr, x + w / 2, y + rowH - 2, w * .7, 3, [P.lawnLo, P.lawnHi], 5); x += w; continue; }
        // each stone its own warm tone (honey, buff, a rosy one now and then), lit along the top, shaded along the foot,
        // with a little grain: laid stone, not flat slabs
        const warmTones = o.tones || [P.stone, P.stoneLo, P.stoneHi, '#d4b688', '#d8bca4', '#c9b38c'];
        B.f(B.rect(x + .6, y + .6, w - 1.2, rowH - 1.8), warmTones[Math.floor(tone * warmTones.length) % warmTones.length], .7);
        B.f(B.rect(x + 1, y + .8, w - 2, 1.1), P.stoneHi, .55).f(B.rect(x + 1, y + rowH - 2.4, w - 2, 1.3), P.stoneLo, .55).f(B.rect(x - .5, y, 1.1, rowH), o.grout || P.grout, .5);
        for (let k = 0; k < 3; k++) B.f(B.rect(x + 2 + rr() * (w - 4), y + 2 + rr() * (rowH - 5), 1.2, 1), rr() < .5 ? P.stoneLo : P.stoneHi, .5);
        if (rr() < .08) B.s(`M${x + w * .3} ${y + 2}l${w * .2} ${rowH * .5}l${w * .15} ${rowH * .3}`, P.grout, .7, .45);
        if (o.moss && rr() < o.moss) B.f(B.blob(rr, x, y + rowH - 1, 4 + rr() * 5, 1.6, 6, .5), P.moss, .55);
        x += w;
      }
    }
  }
  /** Round setts (cobbles) over a box. */
  function setts(B, r, P, bb, o) {
    o = o || {}; B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), o.grout || P.grout);
    const s = o.size || 7;
    for (let y = Math.floor(bb[1] / s) * s, row = 0; y < bb[3] + s; y += s * .8, row++) for (let x = Math.floor(bb[0] / s) * s - (row % 2) * s * .5; x < bb[2] + s; x += s) {
      const rr = KIT().rng(KIT().hash(Math.round(x * 3), Math.round(y * 3), o.salt || 2)), tone = rr(), col = o.cols ? o.cols[Math.floor(tone * o.cols.length)] : tone < .35 ? P.stoneLo : tone < .8 ? P.stone : P.stoneHi;
      B.f(B.rr(x - s * .45 + (rr() - .5), y - s * .33, s * .9, s * .66, s * .22), col).f(B.rect(x - s * .3, y - s * .28, s * .5, s * .12), '#fff', .16);
    }
  }

  /* ---------- the front door ---------- */
  function paint(scene, root, info, objects) {
    if (!wanted() || !info || !info.data || window.__gpvOff) { clear(); return; }
    const t0 = performance.now(), kit = KIT(), W = info.W, season = info.season || 'summer', P = PAL[season] || PAL.summer;
    // stateSig: what the parts' level-tied art says about the garden now (a rope that comes down at a level, a stone rolled
    // back into the line, a field's fence). The composition is memoised on it too, so when the level changes during a
    // session the next repaint composes again and nothing stays drawn that the walk has already opened (round 3 review).
    const stateSig = groundSigs.map(f => ok(f) || '').join('');
    const L = readLayout(W, info.data, info.cellAt), sig = 'gpv-1|' + season + '|' + (GardenIslandLayout.fingerprint || ''), groundSig = sig + '|g|' + L.soil.sig + stateSig, compSig = sig + '|s|' + stateSig;   // (an area part whose ground follows the garden adds its key: 94-garden-paint-vale-1valley.js)
    clear(groundSig);
    // Only crossing water uses the four water-light palettes. Keep the ground
    // and standing-object caches unchanged when that discrete bucket changes.
    const waterTod = ['dawn', 'dusk', 'night'].includes(info.tod) ? info.tod : 'day', underSig = sig + '|u|' + waterTod + '|';
    // the composition is the same for the same picture: compose once, then a repaint (a gate opening) only places it
    let comp = memo.get(compSig);
    if (!comp) {
      comp = { L, ground: [], main: [], under: [], things: [], live: [] };
      const ctx = { L, P, season, tod: info.tod, kit, W, sig, add: (bb, seed, draw, extra) => comp.ground.push(Object.assign({ bb, seed, draw }, extra || {})), main: (bb, seed, draw) => comp.main.push({ bb, seed, draw }), under: o => comp.under.push(o), thing: o => comp.things.push(o), live: o => comp.live.push(o) };   // (live: drawn each frame near the camera, the swash)
      for (const p of parts) ok(() => p.compose(ctx));
      memo.clear(); memo.set(compSig, comp);
      // the standing things that say where their foot is: walking stops the feet there (_gwBuildSolids)
      const cw = W.cellW, ch = W.cellH, names = { 'cold-cove-rock': 'shore boulder', block: 'chopping block', 'chapel-stone': 'chapel stone' };
      feetNow = comp.things.filter(o => o.foot && o.key).map(o => { const id = o.key.split('|')[0], name = names[id.replace(/-\d+$/, '')] || id; return Object.freeze({ x0: (o.x + o.foot[0]) / cw, y0: (o.y - o.foot[2] - W.sky) / ch, x1: (o.x + o.foot[1]) / cw, y1: (o.y + 2 - W.sky) / ch, src: 'painted ' + name }); });
      feetSig = feetNow.length + ':' + feetNow.reduce((h, f) => (Math.imul(h, 31) + Math.round(f.x0 * 64) * 7 + Math.round(f.y0 * 64)) | 0, 0);
    } else { comp.L.cellAt = L.cellAt; comp.L.soil = L.soil; }
    const { ground, main, under, things } = comp;
    const worldBox = { x: -1800, y: -1200, w: W.cols * W.cellW + 4800, h: W.sky + W.rows * W.cellH + 2600 };
    const gBox = { x: 0, y: 0, w: W.cols * W.cellW, h: W.sky + W.rows * W.cellH };
    const handles = []; let groundHandle = null, softHandle = null;
    if (ground.length) handles.push(groundHandle = kit.chunked(scene, root, ground, { key: groundSig, box: gBox, K: 1.1, chunk: 256, depth: DEPTH, budgetMB: 24, lazy: true, slice: 8 }));
    // (rule 16) a soft copy of the same ground at a quarter of the detail, in big chunks that bake ahead while you stand still:
    // where a sharp chunk is still to come (walking fast, a repaint at a new level) you see this, never flat lawn
    if (ground.length) handles.push(softHandle = kit.chunked(scene, root, ground, { key: groundSig + '|soft', box: gBox, K: .28, chunk: 768, depth: DEPTH - 1, budgetMB: 6, lazy: true, slice: 6, prebake: true, under: groundHandle }));
    if (main.length) handles.push(kit.chunked(scene, root, main, { key: sig + '|m', box: worldBox, K: .35, chunk: 512, depth: MAIN_DEPTH, budgetMB: 10, lazy: true, slice: 10, prebake: true }));
    // Standing things and the crossings' water: a texture already baked is shown at once; a new one waits in a queue
    // that tick() bakes nearest the camera first, a few milliseconds a frame (so a repaint never freezes a frame).
    const sprites = [], queue = [], tall = [], shrink = [], bob = [];
    const make = (o, isUnder) => {
      if (o.make) { const im = ok(() => o.make(scene)); if (im) { im.setDepth(o.y); (objects || root).add(im); sprites.push(im); if (im.displayHeight > 60) tall.push(im); } return; }   // (a tall one, a tree: it fades when you stand under it)
      const key = (isUnder ? underSig : sig + '|t|') + o.key, draw = isUnder ? B => o.draw(B, waterTod) : o.draw;
      // (a thing that stands on the ground at its base line lays its shadow there; shade: false for one that does not)
      const im = kit.sprite(scene, isUnder ? root : objects || root, key, o.box, draw, o.x, o.y, o.K || (isUnder ? 1.25 : 1.5), !isUnder && o.depth == null && o.shade !== false ? o.shade || true : null); if (!im) return;
      im.setDepth(isUnder ? UNDER : o.depth != null ? o.depth : o.y); sprites.push(im); stats.spritePx = (stats.spritePx || 0) + (im._gptPx || 0);
      if (!isUnder && o.crown) { im._gpvCrown = o.crown; tall.push(im); }
      if (!isUnder && o.farShrink) { im._gpvBase = im.scaleX; im._gpvShrink = o.farShrink; shrink.push(im); }
      if (!isUnder && o.bob) { im._gpvBob = { y: im.y, ph: ((o.x * 7 + o.y * 13) % 628) / 100, a: o.bob }; bob.push(im); }   // (afloat: it rides the swell)
      if (isUnder && root.sort) root.sort('depth');
    };
    stats = { sig, ground: ground.length, mainland: main.length, under: under.length, things: things.length, spritePx: 0 };
    for (const u of under) (scene.textures.exists(underSig + u.key) ? make(u, true) : queue.push([u, true]));
    for (const o of things) (o.make || scene.textures.exists(sig + '|t|' + o.key) ? make(o, false) : queue.push([o, false]));
    // the live things (the swash on the beaches): one graphics each just over the ground, drawn by tick() near the camera only
    const lives = []; for (const o of comp.live || []) { const h = ok(() => o.make(scene, root, DEPTH + .5)); if (h && h.obj) { sprites.push(h.obj); lives.push(h); } }
    if (root.sort) root.sort('depth'); if (objects && objects.sort) objects.sort('depth');
    cur = { sig, groundSig, handles, groundHandle, softHandle, sprites, scene, queue, make, objects, root, tall, shrink, bob, lives, W, covering: [] };
    stats.buildMs = Math.round(performance.now() - t0);
  }
  function tick(time, view) {
    if (cur) cur.covering.length = 0;
    // a landmark that would swallow its own clearing when the whole map is in view (the Great Oak) draws smaller as you zoom out:
    // full size from the walking zoom in, down to farShrink at the whole-map zoom (its foot stays put)
    // boats and buoys afloat ride a slow swell, each on its own beat: a pixel or two up and down and a little roll
    if (cur && cur.bob.length && time) for (const im of cur.bob) { if (!im.active || !im.visible) continue; const b = im._gpvBob, t = time / 1000 + b.ph; im.y = b.y + Math.sin(t * 1.3) * b.a; im.rotation = Math.sin(t * .9 + 1) * .012 * b.a; }
    if (cur && cur.lives.length && time) for (const h of cur.lives) ok(() => h.update(time, view));
    if (cur && cur.shrink.length) { const z = cur.scene.cameras && cur.scene.cameras.main ? cur.scene.cameras.main.zoom : 1, t = Math.max(0, Math.min(1, (z - .25) / .45));
      for (const im of cur.shrink) if (im.active) { const k = im._gpvBase * (im._gpvShrink + (1 - im._gpvShrink) * t); if (Math.abs(im.scaleX - k) > 1e-4) im.setScale(k); } }
    if (cur && cur.tall.length && typeof _gw !== 'undefined') {
      // a tree you stand under fades, so you can always see yourself (as in the woods and the village)
      const W = cur.W, x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH;
      const covers = (im, x, y) => { const c = im._gpvCrown; return c ? y < im.y - 4 && ((x - im.x - c.x) / c.rx) ** 2 + ((y - 28 - im.y - c.y) / c.ry) ** 2 < 1 : gardenCrownCovers(x, y, im.x, im.y, im.displayHeight * im.originY, Math.min(im.displayWidth, im.displayHeight * im.originY * 1.05)); };
      const up = typeof gardenCrownFeet === 'function' ? gardenCrownFeet(W).filter(p => !p.me) : [];   // (2.74.1) and over a friend up a tree
      for (const im of cur.tall) { if (!im.active) continue; const under = covers(im, x, y) || up.some(p => covers(im, p.x, p.y)), a = under ? GARDEN_CROWN_FADE : 1; if (under && im.visible) cur.covering.push(im); if (im.alpha !== a) im.setAlpha(Math.abs(a - im.alpha) < .03 ? a : im.alpha + (a - im.alpha) * .25); }
    }
    if (!cur || !cur.queue.length) return;
    const t0 = performance.now(), cx = view ? view.x + view.w / 2 : 0, cy = view ? view.y + view.h / 2 : 0;
    cur.queue.sort((a, b) => Math.hypot(a[0].x - cx, a[0].y - cy) - Math.hypot(b[0].x - cx, b[0].y - cy));
    while (cur.queue.length && performance.now() - t0 < 6) { const [o, u] = cur.queue.shift(), s0 = performance.now(); ok(() => cur.make(o, u)); const ms = performance.now() - s0; if (ms > (stats.slowMs || 0)) { stats.slowMs = Math.round(ms); stats.slow = o.key || 'tree'; } }
    for (const c of [cur.objects, cur.root]) if (c && c.sort) c.sort('depth');
    stats.queueWorstMs = Math.max(stats.queueWorstMs || 0, Math.round(performance.now() - t0));
  }
  function clear(nextGroundSig) {
    if (cur) {
      for (const h of cur.handles) ok(() => h.destroy(true));
      for (const s of cur.sprites) ok(() => s.destroy());
      heldGround = { sig: cur.groundSig, handle: cur.groundHandle, soft: cur.softHandle }; cur = null;
    }
    // Nature releases the old scene before calling paint. Retain its handle
    // until the next signature is known, then discard obsolete soil masks.
    if (nextGroundSig && heldGround && heldGround.sig !== nextGroundSig) { if (heldGround.handle) ok(() => heldGround.handle.destroy(false)); if (heldGround.soft) ok(() => heldGround.soft.destroy(false)); heldGround = null; }
  }
  function pendingGround() { return cur && cur.groundHandle ? cur.groundHandle.pendingInView() : 0; }
  function status() {
    const hs = cur ? cur.handles : [], px = hs.reduce((s, h) => s + (h.texturePx || 0), 0) + (stats.spritePx || 0);
    return Object.assign({}, stats, { wanted: wanted(), on: !!cur, afloat: cur ? cur.bob.map(im => +(im.y - im._gpvBob.y).toFixed(2)) : [], swash: cur ? cur.lives.map(h => h.stat ? h.stat() : null) : [], chunks: hs.map(h => h.chunks), live: hs.map(h => h.live), pending: hs.map(h => h.pending), worstSliceMs: Math.max(0, ...hs.map(h => h.sliceWorstMs || 0)), worstChunkMs: Math.max(0, ...hs.map(h => h.worstMs || 0)), textureMB: Math.round(px * 4 / 1048576 * 10) / 10, lastError: lastError || (KIT() && KIT().lastError) });
  }
  /** Draw the ground picture of a box straight into a 2D context (no scene), for previews: GardenPaintVale.paintTo(ctx, [x0, y0, x1, y1], 1). */
  function paintTo(cx, box, k, season) {
    const kit = KIT(), W = GARDEN_WORLD, P = PAL[season || 'summer'], L = readLayout(W, gardenIslandData(), null), ops = [];
    const ctx = { L, P, season: season || 'summer', kit, W, sig: 'preview', add: (bb, seed, draw) => ops.push({ bb, seed, draw }), main: (bb, seed, draw) => ops.push({ bb, seed, draw }), under: () => {}, thing: () => {} };
    for (const p of parts) ok(() => p.compose(ctx));
    cx.save(); cx.setTransform(k, 0, 0, k, -box[0] * k, -box[1] * k); const B = kit.brush(cx);
    for (const o of ops) if (kit.meets(o.bb, box)) ok(() => { cx.save(); o.draw(B, kit.rng(o.seed || 1), box); cx.restore(); });
    cx.restore(); return { ops: ops.length, lastError };
  }
  /** Landform kinds painted here (the world skips its own art for them). */
  function owns(kind) { return (kind === 'ruin-wall' || kind === 'ruin' || kind === 'screen') && wanted(); }   // (round 3: the valley's screens, 94-garden-paint-vale-2valley-screens.js)
  return { feet: () => (wanted() ? feetNow : []), feetSig: () => (wanted() ? feetSig : ''), parts, groundSigs, softRoutes, PAL, wanted, paint, tick, clear, pendingGround, playerCanopies: () => cur ? cur.covering : null, status, paintTo, owns, readLayout, loopPath, smoothLoop, strokePts, routeRibbon, shapeLoop, clipGround, groundClips, walk, lobe, capsule, hull, lawn, flags, setts, ok, get lastError() { return lastError; } };
})();

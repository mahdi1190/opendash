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
  const parts = [];
  let cur = null, lastError = null, stats = {};
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
    const pres = data.presentation || {}, base = (x, y) => gardenIslandBaseCell(x, y);
    const coast = ((data.coast && data.coast.land) || []).map(l => l.map(pt));
    const mat = (x, y) => { const c = cellAt ? cellAt(Math.floor(x), Math.floor(y)) : null; return c ? c.material : ''; };
    const statics = data.static || [], stat = id => statics.find(s => s.id === id);
    const routes = new Map((data.routes || []).map(r => [r.id, r]));
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
    const plot = (x, y) => { const c = cellAt ? cellAt(Math.floor(x), Math.floor(y)) : null; return !!(c && c.row && c.row.plot); };
    return { W, D: data, pres, cw, ch, cpt, pt, base, coast, mat, kind, stat, routes, routePts, free, plot, cellAt };
  }
  const loopPath = (loops) => { const p = new Path2D(); for (const l of loops) { if (!l.length) continue; p.moveTo(l[0].x, l[0].y); for (let i = 1; i < l.length; i++) p.lineTo(l[i].x, l[i].y); p.closePath(); } return p; };
  const strokePts = (B, pts, col, w, op, dx, dy) => { if (pts.length < 2) return; const p = new Path2D(); p.moveTo(pts[0].x + (dx || 0), pts[0].y + (dy || 0)); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x + (dx || 0), pts[i].y + (dy || 0)); B.s(p, col, w, op); };
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
  /** Grass laid over the plain island ground: one lobe per grass cell (they overlap into a soft edge), then drifts, tufts
   *  and flowers. test(x, y) says where (cell coords); fade(x, y) is an alpha 0..1 (a feather into the village ground). */
  function lawn(B, r, L, P, cb, test, fade, o) {
    o = o || {}; const W = L.W, cw = L.cw, ch = L.ch;
    const x0 = Math.floor(cb[0] / cw) - 1, x1 = Math.ceil(cb[2] / cw) + 1, y0 = Math.floor((cb[1] - W.sky) / ch) - 1, y1 = Math.ceil((cb[3] - W.sky) / ch) + 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!test(x, y)) continue; const a = fade ? fade(x + .5, y + .5) : 1; if (a <= 0) continue;
      const rr = KIT().rng(KIT().hash(x, y, 77)), edge = !test(x - 1, y) || !test(x + 1, y) || !test(x, y - 1) || !test(x, y + 1), k = edge ? .62 : .82;
      B.f(B.blob(rr, (x + .5) * cw, W.sky + (y + .5) * ch, cw * k, ch * (k + .1), 8, .3), o.base || P.lawn, a);
    }
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
  }
  /** Flagstones in courses over a clip (world px box): pale stones with joints, some lit, some worn, moss in a few. */
  function flags(B, r, P, bb, o) {
    o = o || {}; const rowH = o.row || 14, w0 = o.w || 26;
    B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), P.stone);
    // broad wear and weather first, so the stones sit in one light
    KIT().tiles(bb, 140, 0, (o.salt || 1) + 50, (tx, ty, rr) => { for (let k = 0; k < 3; k++) B.f(B.blob(rr, tx + rr() * 140, ty + rr() * 140, 30 + rr() * 50, 12 + rr() * 18, 9, .5), rr() < .5 ? P.stoneHi : P.stoneLo, .35); });
    for (let y = Math.floor(bb[1] / rowH) * rowH; y < bb[3]; y += rowH) {
      const rr = KIT().rng(KIT().hash(Math.round(y), 3, o.salt || 1));
      B.f(B.rect(bb[0], y + rowH - 1.1, bb[2] - bb[0], 1.1), o.grout || P.grout, .42);
      for (let x = Math.floor(bb[0] / w0) * w0 - rr() * w0; x < bb[2]; ) {
        const w = w0 * (.7 + rr() * .7), tone = rr();
        if (o.broken && rr() < o.broken) { B.f(B.rect(x, y, w, rowH), P.lawnLo, .55); B.tufts(rr, x + w / 2, y + rowH - 2, w * .7, 3, [P.lawnLo, P.lawnHi], 5); x += w; continue; }
        // each stone its own warm tone (honey, buff, a rosy one now and then), lit along the top, shaded along the foot,
        // with a little grain: laid stone, not flat slabs
        const warmTones = [P.stone, P.stoneLo, P.stoneHi, '#d4b688', '#d8bca4', '#c9b38c'];
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
    clear(); if (!wanted() || !info || !info.data || window.__gpvOff) return;
    const t0 = performance.now(), kit = KIT(), W = info.W, season = info.season || 'summer', P = PAL[season] || PAL.summer;
    const L = readLayout(W, info.data, info.cellAt), sig = 'gpv-1|' + season + '|' + (GardenIslandLayout.fingerprint || '');
    // the composition is the same for the same picture: compose once, then a repaint (a gate opening) only places it
    let comp = memo.get(sig);
    if (!comp) {
      comp = { ground: [], main: [], under: [], things: [] };
      const ctx = { L, P, season, tod: info.tod, kit, W, sig, add: (bb, seed, draw, extra) => comp.ground.push(Object.assign({ bb, seed, draw }, extra || {})), main: (bb, seed, draw) => comp.main.push({ bb, seed, draw }), under: o => comp.under.push(o), thing: o => comp.things.push(o) };
      for (const p of parts) ok(() => p.compose(ctx));
      memo.clear(); memo.set(sig, comp);
    }
    const { ground, main, under, things } = comp;
    const worldBox = { x: -1800, y: -1200, w: W.cols * W.cellW + 4800, h: W.sky + W.rows * W.cellH + 2600 };
    const gBox = { x: 0, y: 0, w: W.cols * W.cellW, h: W.sky + W.rows * W.cellH };
    const handles = []; let groundHandle = null;
    if (ground.length) handles.push(groundHandle = kit.chunked(scene, root, ground, { key: sig + '|g', box: gBox, K: 1.1, chunk: 256, depth: DEPTH, budgetMB: 20, lazy: true, slice: 10 }));
    if (main.length) handles.push(kit.chunked(scene, root, main, { key: sig + '|m', box: worldBox, K: .35, chunk: 512, depth: MAIN_DEPTH, budgetMB: 6, lazy: true, slice: 10 }));
    // Standing things and the crossings' water: a texture already baked is shown at once; a new one waits in a queue
    // that tick() bakes nearest the camera first, a few milliseconds a frame (so a repaint never freezes a frame).
    const sprites = [], queue = [], tall = [];
    const make = (o, isUnder) => {
      if (o.make) { const im = ok(() => o.make(scene)); if (im) { im.setDepth(o.y); (objects || root).add(im); sprites.push(im); if (im.displayHeight > 60) tall.push(im); } return; }   // (a tall one, a tree: it fades when you stand under it)
      const im = kit.sprite(scene, isUnder ? root : objects || root, sig + (isUnder ? '|u|' : '|t|') + o.key, o.box, o.draw, o.x, o.y, o.K || (isUnder ? 1.25 : 1.5)); if (!im) return;
      im.setDepth(isUnder ? UNDER : o.depth != null ? o.depth : o.y); sprites.push(im); stats.spritePx = (stats.spritePx || 0) + (im._gptPx || 0);
      if (!isUnder && o.crown) { im._gpvCrown = o.crown; tall.push(im); }
      if (isUnder && root.sort) root.sort('depth');
    };
    stats = { sig, ground: ground.length, mainland: main.length, under: under.length, things: things.length, spritePx: 0 };
    for (const u of under) (scene.textures.exists(sig + '|u|' + u.key) ? make(u, true) : queue.push([u, true]));
    for (const o of things) (o.make || scene.textures.exists(sig + '|t|' + o.key) ? make(o, false) : queue.push([o, false]));
    if (root.sort) root.sort('depth'); if (objects && objects.sort) objects.sort('depth');
    cur = { sig, handles, groundHandle, sprites, scene, queue, make, objects, root, tall, W, covering: [] };
    stats.buildMs = Math.round(performance.now() - t0);
  }
  function tick(time, view) {
    if (cur) cur.covering.length = 0;
    if (cur && cur.tall.length && typeof _gw !== 'undefined') {
      // a tree you stand under fades, so you can always see yourself (as in the woods and the village)
      const W = cur.W, x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH;
      for (const im of cur.tall) { if (!im.active) continue; const c = im._gpvCrown, under = c ? y < im.y - 4 && ((x - im.x - c.x) / c.rx) ** 2 + ((y - 28 - im.y - c.y) / c.ry) ** 2 < 1 : gardenCrownCovers(x, y, im.x, im.y, im.displayHeight * im.originY, im.displayWidth), a = under ? GARDEN_CROWN_FADE : 1; if (under && im.visible) cur.covering.push(im); if (im.alpha !== a) im.setAlpha(Math.abs(a - im.alpha) < .03 ? a : im.alpha + (a - im.alpha) * .25); }
    }
    if (!cur || !cur.queue.length) return;
    const t0 = performance.now(), cx = view ? view.x + view.w / 2 : 0, cy = view ? view.y + view.h / 2 : 0;
    cur.queue.sort((a, b) => Math.hypot(a[0].x - cx, a[0].y - cy) - Math.hypot(b[0].x - cx, b[0].y - cy));
    while (cur.queue.length && performance.now() - t0 < 6) { const [o, u] = cur.queue.shift(), s0 = performance.now(); ok(() => cur.make(o, u)); const ms = performance.now() - s0; if (ms > (stats.slowMs || 0)) { stats.slowMs = Math.round(ms); stats.slow = o.key || 'tree'; } }
    for (const c of [cur.objects, cur.root]) if (c && c.sort) c.sort('depth');
    stats.queueWorstMs = Math.max(stats.queueWorstMs || 0, Math.round(performance.now() - t0));
  }
  function clear() {
    if (!cur) return;
    for (const h of cur.handles) ok(() => h.destroy(true));   // textures are kept for the next paint with the same picture
    for (const s of cur.sprites) ok(() => s.destroy());
    cur = null;
  }
  function pendingGround() { return cur && cur.groundHandle ? cur.groundHandle.pendingInView() : 0; }
  function status() {
    const hs = cur ? cur.handles : [], px = hs.reduce((s, h) => s + (h.texturePx || 0), 0) + (stats.spritePx || 0);
    return Object.assign({}, stats, { wanted: wanted(), on: !!cur, chunks: hs.map(h => h.chunks), live: hs.map(h => h.live), pending: hs.map(h => h.pending), worstSliceMs: Math.max(0, ...hs.map(h => h.sliceWorstMs || 0)), worstChunkMs: Math.max(0, ...hs.map(h => h.worstMs || 0)), textureMB: Math.round(px * 4 / 1048576 * 10) / 10, lastError: lastError || (KIT() && KIT().lastError) });
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
  function owns(kind) { return (kind === 'ruin-wall' || kind === 'ruin') && wanted(); }
  return { parts, PAL, wanted, paint, tick, clear, pendingGround, playerCanopies: () => cur ? cur.covering : null, status, paintTo, owns, readLayout, loopPath, strokePts, walk, lobe, capsule, hull, lawn, flags, setts, ok, get lastError() { return lastError; } };
})();

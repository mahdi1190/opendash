/* The "Painted village" art style: the village and start area drawn with the
 * opening scenes' own kit (the scene library objects of 70-scene-lib-*.js
 * through sceneObjShapes, and sceneDraw for lobed natural shapes), in their
 * flat-vector house style: soft shading lit from the upper left, no outlines,
 * curved organic shapes, trees in clumps.
 *
 * Top-down adaptation: the scenes are side views on a perspective ground, the
 * garden is a 3/4 top-down island. Upright things (trees, shrubs, buildings,
 * lamps, benches, reeds) are the library objects as they are, since the garden
 * also shows them from the front; the ground (meadow, sand, water, paths,
 * plaza) is painted flat here with the same palette and soft lobed shading.
 * Everything static is baked once into canvases that become Phaser textures;
 * only the game's own moving things stay live. Only rendering changes: cells,
 * walking, picking and saved rows are untouched. */
window.GardenNativePainted = (function () {
  'use strict';
  const TEX = 'gdpaint', KMAX = 2;           // ground bake: canvas pixels per world pixel (as sharp as one 4096 texture allows)
  let K = KMAX;
  const OBJ_K = 2;                            // object sprites: supersampled for close zoom
  function wanted() { try { return typeof _gdpPrefs === 'function' && _gdpPrefs().renderEngine !== 'standard'; } catch (e) { return false; } }   // (the vale's one style: on wherever Phaser draws; the old artStyle pref is ignored)
  function ready() { return typeof sceneObjShapes === 'function' && typeof sceneDraw !== 'undefined' && typeof Path2D === 'function'; }
  function preload(then) { if (then && ready()) then(); return ready(); }
  // A small seeded generator, the scenes' habit: the same island paints the same.
  function rng(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const PAL = {
    summer: { lawn: '#93ad5f', lawnLo: '#7c9a4e', lawnHi: '#a9bf6c', sand: '#e3d2a2', sandWet: '#c8b483', water: '#6d9fb0', shallow: '#93bfbd', deep: '#5a8aa0', foam: '#eef2e2', path: '#d7c294', pathEdge: '#b29a6b', pathWear: '#e5d5ab', shadow: '#4d5a36', stone: '#d6cdb6', stoneLo: '#bdb299', stoneHi: '#e6dfcb', kerb: '#a59a80' },
    autumn: { lawn: '#9aa65a', lawnLo: '#848f49', lawnHi: '#b2b66a', sand: '#e1cf9f', sandWet: '#c6b282', water: '#6a9aab', shallow: '#90b9b6', deep: '#57869b', foam: '#eef0e0', path: '#d6c090', pathEdge: '#ae9566', pathWear: '#e3d2a6', shadow: '#55542f', stone: '#d4cab2', stoneLo: '#bbaf95', stoneHi: '#e4dcc7', kerb: '#a3977c' },
    winter: { lawn: '#a6b29a', lawnLo: '#929f87', lawnHi: '#bcc5b0', sand: '#ddd3b6', sandWet: '#c4b897', water: '#7a9fab', shallow: '#a2bec0', deep: '#668a9a', foam: '#f2f4ee', path: '#d2c6a6', pathEdge: '#ad9f80', pathWear: '#e0d6bc', shadow: '#5e6658', stone: '#d6d0c2', stoneLo: '#bdb6a6', stoneHi: '#e8e4da', kerb: '#a49d8c' },
  };
  PAL.spring = Object.assign({}, PAL.summer, { lawn: '#8fb35f', lawnLo: '#78a04e', lawnHi: '#a8c66f' });
  const palette = season => PAL[season] || PAL.summer;
  const ok = (f) => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };
  let lastInfo = null, overLayer = null, lastError = null, groundMs = 0, lastPlanting = [], spotCounts = {}, cachedGround = null, groundSerial = 0;

  /* ---------- library objects as baked sprites ---------- */
  const paths = new Map();
  const path = d => { let p = paths.get(d); if (!p) { if (paths.size > 20000) paths.clear(); p = new Path2D(d); paths.set(d, p); } return p; };
  function paint(cx, p) {
    if (typeof p === 'string') return p;
    const stops = p.lin || p.rad, g = p.lin ? cx.createLinearGradient(p.x1 || 0, p.y1 || 0, p.x2 || 0, p.y2 != null ? p.y2 : 1) : cx.createRadialGradient(p.cx || 0, p.cy || 0, 0, p.cx || 0, p.cy || 0, p.r || 1);
    for (const [off, c, op] of stops) { const rgb = typeof _scHex === 'function' ? _scHex(c) : [0, 0, 0]; g.addColorStop(Math.max(0, Math.min(1, off)), op == null || op === 1 ? c : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${op})`); }
    return g;
  }
  function drawShapes(cx, list, glow) {
    for (const sh of list) {
      if (sh.img) continue;                       // raster objects are not used here
      if (sh.m) { cx.save(); cx.transform(sh.m[0], sh.m[1], sh.m[2], sh.m[3], sh.m[4], sh.m[5]); }
      cx.globalAlpha = sh.op == null ? 1 : sh.op;
      const pth = path(sh.d);
      if (glow && sh.glow) { cx.fillStyle = sh.glow === 'lamp' ? '#ffe2a0' : '#ffd98a'; cx.globalAlpha = 1; cx.fill(pth); }
      else { if (sh.f) { cx.fillStyle = paint(cx, sh.f); cx.fill(pth); } if (sh.s) { cx.strokeStyle = paint(cx, sh.s); cx.lineWidth = sh.w || 1; cx.lineCap = sh.cap || 'butt'; cx.stroke(pth); } }
      if (sh.m) cx.restore();
    }
    cx.globalAlpha = 1;
  }
  /** One library object as a canvas at a given world size: { c, ox, oy } with (ox, oy) its foot in canvas px. */
  function objectCanvas(id, v, season, size, night) {
    const sh = sceneObjShapes(id, v, season); if (!sh) return null;
    const names = (sh.still || sh.order.filter(p => p !== 'lit')).concat(night && sh.parts.lit ? ['lit'] : []);
    const [x0, y0, x1, y1] = sh.box, k = (size.w ? size.w / (x1 - x0) : size.h / (y1 - y0)) * OBJ_K;
    const pad = 4, w = Math.ceil((x1 - x0) * k) + pad * 2, h = Math.ceil((y1 - y0) * k) + pad * 2;
    if (w > 4096 || h > 4096 || w < 2 || h < 2) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d');
    cx.setTransform(k, 0, 0, k, pad - x0 * k, pad - y0 * k);
    for (const n of names) drawShapes(cx, sh.parts[n] || [], night && n !== 'lit');
    return { c, ox: pad - x0 * k, oy: pad - y0 * k, k };
  }
  function objectKey(scene, id, v, season, size, night) {
    const key = TEX + '|' + id + '|' + v + '|' + season + '|' + Math.round(size.w || 0) + 'x' + Math.round(size.h || 0) + (night ? '|n' : '');
    if (scene.textures.exists(key)) return { key, meta: scene.textures.get(key).customData && scene.textures.get(key).customData.gdpaint };
    const made = ok(() => objectCanvas(id, v, season, size, night)); if (!made) return null;
    const tex = scene.textures.addCanvas(key, made.c); const meta = { ox: made.ox / made.c.width, oy: made.oy / made.c.height };
    tex.customData = Object.assign(tex.customData || {}, { gdpaint: meta }); return { key, meta };
  }
  function objectImage(scene, id, v, season, size, x, y, night) {
    const o = objectKey(scene, id, v, season, size, night); if (!o) return null;
    return scene.add.image(x, y, o.key).setOrigin(o.meta.ox, o.meta.oy).setScale(1 / OBJ_K);
  }

  /* ---------- the painted ground ---------- */
  // info: { W, box: {x, y, w, h} world px, water, sand, paths: loops (world px), routes: [{main, width, points px}],
  //         plaza: [points], meadow(px, py), season }
  function ground(scene, parent, info) {
    const started = performance.now();
    const B = info.box, P = palette(info.season), sig = info.sig + '|' + info.season;
    K = Math.min(KMAX, 4096 / Math.max(B.w, B.h)); lastInfo = info;
    if (cachedGround && cachedGround.sig === sig && scene.textures.exists(cachedGround.key)) { groundMs = Math.round(performance.now() - started); return show(scene, parent, B, cachedGround.key); }
    const c = document.createElement('canvas'); c.width = Math.ceil(B.w * K); c.height = Math.ceil(B.h * K);
    const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, -B.x * K, -B.y * K);
    const r = rng(9137), loop = (pts) => { cx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i].x, pts[i].y); cx.closePath(); };
    const fillLoops = (loops, style) => { cx.beginPath(); for (const l of loops) loop(l); cx.fillStyle = style; cx.fill('evenodd'); };
    const clipLoops = (loops) => { cx.beginPath(); for (const l of loops) loop(l); cx.clip('evenodd'); };
    const strokeLoops = (loops, style, width, alpha) => { cx.beginPath(); for (const l of loops) loop(l); cx.strokeStyle = style; cx.lineWidth = width; cx.globalAlpha = alpha == null ? 1 : alpha; cx.lineJoin = 'round'; cx.stroke(); cx.globalAlpha = 1; };
    const blob = (x, y, rx, ry, n, rag, style, alpha) => { cx.globalAlpha = alpha; cx.fillStyle = style; cx.fill(path(sceneDraw.blob(r, x, y, rx, ry, n, rag))); cx.globalAlpha = 1; };
    // 1. The sea first: deep, then a paler shallow shelf along the coast.
    cx.fillStyle = P.water; cx.fillRect(B.x, B.y, B.w, B.h);
    for (let i = 0; i < 70; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; blob(x, y, 50 + r() * 70, 12 + r() * 20, 8, .4, P.deep, .14); }
    strokeLoops(info.coast, P.shallow, 70, .35); strokeLoops(info.coast, P.shallow, 34, .55);
    // 2. The beach: sand inside the coast, a wet band where it meets the sea
    //    and a thin bright lap line; soft drifts of paler and damper sand.
    strokeLoops(info.coast, P.sandWet, 10, 1); fillLoops(info.coast, P.sand);
    cx.save(); clipLoops(info.coast); for (let i = 0; i < 200; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; blob(x, y, 14 + r() * 30, 6 + r() * 12, 7, .5, r() < .5 ? P.sandWet : '#efe3bf', .16); } strokeLoops(info.coast, P.sandWet, 12, .7); cx.restore();
    strokeLoops(info.coast, P.foam, 2.2, .7);
    // 3. The meadow: one quiet base with broad soft light and shade in lobed
    //    drifts (light from the upper left), never a stripe or a tile.
    cx.save(); clipLoops(info.lawn);
    cx.fillStyle = P.lawn; cx.fillRect(B.x, B.y, B.w, B.h);
    for (let i = 0; i < B.w * B.h / 5200; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h, s = 30 + r() * 70; blob(x, y, s, s * .55, 9, .5, r() < .5 ? P.lawnLo : P.lawnHi, .22 + r() * .18); }
    for (let i = 0; i < B.w * B.h / 160; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; if (!info.meadow(x, y)) continue; cx.globalAlpha = .35; cx.strokeStyle = r() < .5 ? P.lawnLo : P.lawnHi; cx.lineWidth = 1.1; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + 1.5, y - 3, x + (r() - .5) * 4, y - 4 - r() * 3); cx.stroke(); }
    cx.globalAlpha = 1;
    // clover and moss: small darker drifts that break the lawn into a meadow
    for (let i = 0; i < B.w * B.h / 2600; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; if (!info.meadow(x, y)) continue; blob(x, y, 8 + r() * 16, 4 + r() * 7, 7, .55, r() < .6 ? P.lawnLo : '#6f8a46', .3); }
    // grass in tufts: three to six blades from one root, dark at the root, lit tips
    for (let i = 0; i < B.w * B.h / 520; i++) {
      const x = B.x + r() * B.w, y = B.y + r() * B.h; if (!info.meadow(x, y)) continue; const n = 3 + Math.floor(r() * 4), hh = 4 + r() * 5;
      cx.globalAlpha = .55; cx.fillStyle = P.shadow; cx.fill(path(sceneDraw.ell(x + 1, y + .6, 3.2, 1)));
      for (let k = 0; k < n; k++) { const lean = (k - n / 2) * 1.1 + (r() - .5); cx.globalAlpha = .7; cx.strokeStyle = k % 2 ? P.lawnLo : '#6f8a40'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x + k * .6, y); cx.quadraticCurveTo(x + k * .6 + lean * .4, y - hh * .6, x + k * .6 + lean, y - hh); cx.stroke(); cx.globalAlpha = .55; cx.strokeStyle = P.lawnHi; cx.lineWidth = .7; cx.beginPath(); cx.moveTo(x + k * .6 + lean * .55, y - hh * .62); cx.lineTo(x + k * .6 + lean, y - hh); cx.stroke(); }
    }
    // pebbles and the odd stone, in little groups
    for (let i = 0; i < B.w * B.h / 22000; i++) { const gx0 = B.x + r() * B.w, gy0 = B.y + r() * B.h; for (let k = 0, n = 2 + Math.floor(r() * 4); k < n; k++) { const x = gx0 + (r() - .5) * 22, y = gy0 + (r() - .5) * 10; if (!info.meadow(x, y)) continue; const s = 1.4 + r() * (k ? 2 : 4); cx.globalAlpha = .35; cx.fillStyle = P.shadow; cx.fill(path(sceneDraw.ell(x + .8, y + .8, s, s * .55))); cx.globalAlpha = 1; cx.fillStyle = r() < .5 ? P.stone : P.stoneLo; cx.fill(path(sceneDraw.ell(x, y, s, s * .58))); cx.fillStyle = P.stoneHi; cx.globalAlpha = .8; cx.fill(path(sceneDraw.ell(x - s * .3, y - s * .22, s * .45, s * .22))); cx.globalAlpha = 1; } }
    // autumn: fallen leaves drift across the grass
    if (info.season === 'autumn') for (let i = 0; i < B.w * B.h / 1400; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; if (!info.meadow(x, y)) continue; cx.globalAlpha = .75; cx.fillStyle = ['#c0702e', '#d89a3e', '#a8562a', '#b8a040'][Math.floor(r() * 4)]; cx.fill(path(sceneDraw.leaf(x, y, r() * 6.3, 3 + r() * 2, 1.4))); }
    cx.globalAlpha = 1; strokeLoops(info.lawn, P.lawnLo, 5, .5); cx.restore();
    // owned beds: tilled soil with furrows and an oak edging; an empty owned plot shows its dug edge
    if (info.soil && info.soil.length) {
      strokeLoops(info.soil, P.shadow, 7, .22); strokeLoops(info.soil, '#6a5034', 5, 1); fillLoops(info.soil, '#7d5d40');
      let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity; for (const l of info.soil) for (const q of l) { sx0 = Math.min(sx0, q.x); sy0 = Math.min(sy0, q.y); sx1 = Math.max(sx1, q.x); sy1 = Math.max(sy1, q.y); }
      cx.save(); clipLoops(info.soil);
      for (const l of info.soil) { let lx0 = Infinity, ly0 = Infinity, lx1 = -Infinity, ly1 = -Infinity; for (const q of l) { lx0 = Math.min(lx0, q.x); ly0 = Math.min(ly0, q.y); lx1 = Math.max(lx1, q.x); ly1 = Math.max(ly1, q.y); } for (let i = 0; i < (lx1 - lx0) * (ly1 - ly0) / 40; i++) { const x = lx0 + r() * (lx1 - lx0), y = ly0 + r() * (ly1 - ly0); cx.globalAlpha = .5; cx.fillStyle = r() < .5 ? '#5e432c' : '#9a7656'; cx.fillRect(x, y, 1 + r() * 1.6, .8 + r() * .8); } }
      for (let y = sy0; y < sy1; y += 7.5) { cx.globalAlpha = .45; cx.strokeStyle = '#5a3e28'; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(sx0, y); cx.lineTo(sx1, y); cx.stroke(); cx.globalAlpha = .35; cx.strokeStyle = '#a07c58'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(sx0, y - 2); cx.lineTo(sx1, y - 2); cx.stroke(); }
      cx.globalAlpha = 1; cx.restore(); strokeLoops(info.soil, '#a8845a', 1.4, .8);
    }
    // an empty owned plot: the grass a touch shorter inside and a soft dug edge (no dashes, no grid)
    if (info.owned && info.owned.length) { cx.save(); clipLoops(info.owned); strokeLoops(info.owned, '#7d6a44', 7, .16); strokeLoops(info.owned, '#8a6a46', 2.2, .28); cx.restore(); fillLoops(info.owned, 'rgba(190,200,120,.07)'); }
    // Inland water: a damp bank, the pond, its shallow rim and lap line.
    if (info.lakes.length) {
      strokeLoops(info.lakes, P.sandWet, 14, .9); fillLoops(info.lakes, P.water);
      cx.save(); clipLoops(info.lakes); strokeLoops(info.lakes, P.shallow, 40, .5); strokeLoops(info.lakes, P.shallow, 18, .6);
      // the sky on the water: long soft bands, then short bright glints, darker ripples under the banks
      for (let i = 0; i < B.w * B.h / 9000; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; blob(x, y, 30 + r() * 60, 3 + r() * 4, 8, .3, r() < .6 ? '#a6cad0' : P.deep, .22); }
      for (let i = 0; i < B.w * B.h / 1800; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h, l = 4 + r() * 12; cx.globalAlpha = .35 + r() * .3; cx.strokeStyle = r() < .7 ? '#e8f4f0' : '#c4e0e0'; cx.lineWidth = 1 + r() * .8; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + l, y); cx.stroke(); }
      cx.globalAlpha = 1; cx.restore();
      strokeLoops(info.lakes, P.foam, 2, .7);
    }
    // 4. Paths: a soft cast shadow, the worn edge, the gravel and a paler
    //    centre where feet go, clipped to the path the game walks.
    cx.save(); if (info.paths.length) clipLoops(info.paths);
    const stroke = (pts, style, width, alpha, dx, dy) => { if (pts.length < 2) return; cx.beginPath(); cx.moveTo(pts[0].x + (dx || 0), pts[0].y + (dy || 0)); for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i].x + (dx || 0), pts[i].y + (dy || 0)); cx.strokeStyle = style; cx.lineWidth = width; cx.globalAlpha = alpha; cx.lineJoin = 'round'; cx.lineCap = 'round'; cx.stroke(); cx.globalAlpha = 1; };
    for (const rt of info.routes) stroke(rt.points, P.shadow, rt.width + 6, .22, 2, 4);
    for (const rt of info.routes) stroke(rt.points, rt.main ? P.kerb : P.pathEdge, rt.width + 5, 1);
    for (const rt of info.routes) stroke(rt.points, rt.main ? P.stone : P.path, rt.width, 1);
    for (const rt of info.routes) stroke(rt.points, rt.main ? P.stoneHi : P.pathWear, rt.width * .42, .55);
    for (const rt of info.routes) for (let i = 1; i < rt.points.length; i++) {
      const a = rt.points[i - 1], b = rt.points[i], L = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / (L || 1), ny = (b.x - a.x) / (L || 1);
      for (let t = 0; t < L; t += rt.main ? 6 : 9) { const u = t / L, o = (r() - .5) * rt.width * .9, x = a.x + (b.x - a.x) * u + nx * o, y = a.y + (b.y - a.y) * u + ny * o; cx.globalAlpha = .45; cx.fillStyle = r() < .5 ? (rt.main ? P.stoneLo : P.pathEdge) : (rt.main ? P.stoneHi : P.pathWear); cx.fill(path(rt.main ? sceneDraw.rect(x - 3, y - 2, 6 + r() * 3, 4) : sceneDraw.ell(x, y, 1 + r() * 1.6, .8 + r()))); }
    }
    cx.globalAlpha = 1; cx.restore();
    // 5. The plaza: laid setts in courses with a kerb, a rose at its heart.
    if (info.plaza) {
      const pz = info.plaza;
      cx.save(); cx.beginPath(); loop(pz.points); cx.fillStyle = P.shadow; cx.globalAlpha = .2; cx.translate(2, 4); cx.fill(); cx.restore();
      cx.save(); cx.beginPath(); loop(pz.points); cx.fillStyle = P.stone; cx.fill(); cx.clip();
      const b = pz.bounds;
      for (let y = b.y, row = 0; y < b.y + b.h; y += 9, row++) for (let x = b.x - (row % 2) * 7; x < b.x + b.w; x += 14) { cx.globalAlpha = .55; cx.fillStyle = r() < .33 ? P.stoneLo : r() < .5 ? P.stoneHi : P.stone; cx.fill(path(sceneDraw.rect(x + .8, y + .8, 12.4, 7.4))); }
      cx.globalAlpha = 1;
      const ccx = pz.centre.x, ccy = pz.centre.y;
      for (const [rx, col] of [[46, P.kerb], [42, P.stoneHi], [30, P.stoneLo], [26, P.stone]]) { cx.fillStyle = col; cx.beginPath(); cx.ellipse(ccx, ccy, rx, rx * .55, 0, 0, Math.PI * 2); cx.fill(); }
      cx.fillStyle = P.kerb; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, l = i % 2 ? 14 : 24; cx.beginPath(); cx.moveTo(ccx + Math.cos(a) * l, ccy + Math.sin(a) * l * .55); cx.lineTo(ccx + Math.cos(a + 1.3) * 4, ccy + Math.sin(a + 1.3) * 2.2); cx.lineTo(ccx + Math.cos(a - 1.3) * 4, ccy + Math.sin(a - 1.3) * 2.2); cx.fill(); }
      cx.restore();
      cx.beginPath(); loop(pz.points); cx.strokeStyle = P.kerb; cx.lineWidth = 4; cx.stroke();
    }
    // 6. Flower drifts and low growth in the meadow: library plants, stamped
    //    flat into the ground bake in clumps (no one-per-tile sprinkle).
    const stamps = [['plant.wildflowers', 0], ['plant.daisies', 1], ['plant.wildflowers', 2], ['plant.daisies', 0], ['plant.grass', 1], ['plant.wildflowers', 3]];
    const stampC = new Map();
    for (let n = 0; n < B.w * B.h / 6000; n++) {
      const gx = B.x + r() * B.w, gy = B.y + r() * B.h; if (!info.meadow(gx, gy)) continue;
      const kind = stamps[Math.floor(r() * stamps.length)], count = 4 + Math.floor(r() * 7);
      for (let i = 0; i < count; i++) {
        const x = gx + (r() - .5) * 70, y = gy + (r() - .5) * 34; if (!info.meadow(x, y)) continue;
        const key = kind.join(':'); let s = stampC.get(key);
        if (s === undefined) { s = ok(() => objectCanvas(kind[0], kind[1], info.season, { h: kind[0] === 'plant.grass' ? 12 : 10 })); stampC.set(key, s); }
        if (!s) continue; const k = (.7 + r() * .5) / OBJ_K; cx.drawImage(s.c, x - s.ox * k, y - s.oy * k, s.c.width * k, s.c.height * k);
      }
    }
    // Low verges along every path: tufts and flowers at its edges, in runs.
    for (const rt of info.routes) for (let i = 1; i < rt.points.length; i++) {
      const a = rt.points[i - 1], b = rt.points[i], L = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / (L || 1), ny = (b.x - a.x) / (L || 1);
      for (let t = 0; t < L; t += 14) {
        if (r() < .45) continue; const side = r() < .5 ? -1 : 1, o = (rt.width / 2 + 5 + r() * 6) * side, x = a.x + (b.x - a.x) * t / L + nx * o, y = a.y + (b.y - a.y) * t / L + ny * o;
        if (!info.meadow(x, y)) continue; const kind = stamps[Math.floor(r() * stamps.length)], key = kind.join(':'); let s = stampC.get(key);
        if (s === undefined) { s = ok(() => objectCanvas(kind[0], kind[1], info.season, { h: kind[0] === 'plant.grass' ? 12 : 10 })); stampC.set(key, s); }
        if (s) { const k = (.6 + r() * .4) / OBJ_K; cx.drawImage(s.c, x - s.ox * k, y - s.oy * k, s.c.width * k, s.c.height * k); }
      }
    }
    // A feathered edge, so the painted village fades into the island around it.
    cx.setTransform(1, 0, 0, 1, 0, 0);
    const mask = document.createElement('canvas'); mask.width = c.width; mask.height = c.height; const mx = mask.getContext('2d'), fw = 90 * K;
    mx.fillStyle = '#000'; mx.filter = 'blur(' + Math.round(fw / 2.4) + 'px)'; mx.fillRect(fw, fw, c.width - fw * 2, c.height - fw * 2);
    cx.globalCompositeOperation = 'destination-in'; cx.drawImage(mask, 0, 0);
    cx.globalCompositeOperation = 'source-over';
    const key = TEX + '-ground-' + (++groundSerial);
    if (cachedGround && scene.textures.exists(cachedGround.key)) scene.textures.remove(cachedGround.key);
    scene.textures.addCanvas(key, c); cachedGround = { key, sig, box: B, low: false }; groundMs = Math.round(performance.now() - started);
    return show(scene, parent, B, key);
  }
  function show(scene, parent, B, key) {
    const img = scene.add.image(B.x, B.y, key).setOrigin(0, 0).setScale(1 / K).setDepth(-9600);
    parent.add(img); parent.sort('depth');
    return { image: img, destroy() { img.destroy(); } };
  }

  /* ---------- the village buildings ---------- */
  // Library buildings, each its own kind, sized to the old footprint so doors,
  // aprons, picking and depth stay where they were.
  const BUILD = {
    'garden-shop': { obj: 'building.green-cottage', v: 0, w: 150, sign: 'Seed & Stem', extra: [['plant.planter', 1, -84, 0, 26], ['plant.planter', 0, 84, 0, 26], ['plant.rph-flower-tub', 1, -60, 8, 18]] },
    'land-office': { obj: 'building.cottage', v: 1, w: 140, sign: 'Land Office', extra: [['street.lamp', 0, -78, 4, 0, 70]] },
    'tackle-shop': { obj: 'building.fpv-sailing-hut', v: 0, w: 150, sign: 'Tackle & Tide', extra: [['street.mqn-lifebuoy', 0, 80, 2, 0, 30]] },
    'market-stall': { obj: 'structure.mcr-market-chalet', v: 1, w: 104 },
  };
  const HALL = [{ obj: 'structure.wp-bivvy', v: 0, w: 96 }, { obj: 'building.kiosk', v: 0, w: 110, sign: 'Lake Hall' }, { obj: 'building.thatched-cottage', v: 1, w: 150, sign: 'Lake Hall' }, { obj: 'building.church', v: 0, w: 170, sign: 'Lake Hall' }];
  function hallTier(sc) { try { const ca = sc.ca || (typeof gardenCatchHere === 'function' ? gardenCatchHere() : null) || {}; return typeof gardenHallTier === 'function' ? Math.max(0, Math.min(3, gardenHallTier(Number(ca.ha) || 0))) : 0; } catch (e) { return 0; } }
  function building(scene, prop, sc, element, W) {
    if (!ready()) return null;
    const tier = prop.id === 'lake-hall' ? hallTier(sc) : -1, def = tier >= 0 ? HALL[tier] : BUILD[prop.id]; if (!def || !sceneObj(def.obj)) return null;
    const season = sc.season || 'summer', night = sc.tod === 'dusk' || sc.tod === 'night';
    const node = element(scene, 'g', { class: 'gd-it gd-prop gd-prop-' + prop.kind + ' gd-painted', 'data-prop': prop.id, 'data-z': prop.y + prop.h, 'data-x': prop.x });
    const cx = (prop.x + prop.w / 2) * W.cellW, foot = W.sky + (prop.y + prop.h) * W.cellH - 2;
    const shadow = scene.add.graphics(); shadow.fillStyle(0x3a4a2a, .2).fillEllipse(cx + 8, foot + 1, def.w * 1.08, 18); node._inner.add(shadow);
    const parts = [], poolImages = [];
    const main = objectImage(scene, def.obj, def.v, season, { w: def.w }, cx, foot, night); if (!main) { node.remove(); return null; }
    node._inner.add(main); parts.push([main, def.obj, def.v, { w: def.w }]);
    for (const [id, v, dx, dy, w, h] of def.extra || []) { if (!sceneObj(id)) continue; const im = objectImage(scene, id, v, season, w ? { w } : { h }, cx + dx, foot + dy, night); if (im) { node._inner.addAt(im, dy > 0 ? node._inner.list.length : 1); parts.push([im, id, v, w ? { w } : { h }]); } }
    if (def.sign) {
      const g = scene.add.graphics(), sy = foot + 12, tw = Math.max(54, def.sign.length * 6.4) / 2;
      g.fillStyle(0x3d3424, .22).fillRoundedRect(cx - tw + 2, sy - 7, tw * 2, 15, 4).fillStyle(0xf3ead2).fillRoundedRect(cx - tw, sy - 9, tw * 2, 15, 4).lineStyle(1, 0xb9a57c, 1).strokeRoundedRect(cx - tw, sy - 9, tw * 2, 15, 4);
      node._inner.add(g);
      node._inner.add(scene.add.text(cx, sy - 1.5, def.sign, { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#4a3b26', resolution: 3 }).setOrigin(.5, .5));
    }
    // lit windows spill a soft warm pool on the ground in front (added light, feathered: no disc)
    if (night && window.GardenPaintedProps) { const pk = GardenPaintedProps.poolKey(scene); if (pk) { const pool = scene.add.image(cx, foot + 10, pk).setOrigin(.5, .5).setScale(def.w * 1.1 / 256, def.w * .3 / 256).setAlpha(.3), layer = overLayer; if (layer) { layer.add(pool); pool.setDepth(80005); } else node._inner.add(pool); poolImages.push(pool); } }
    const top = foot - main.displayHeight * main.originY, b = { x: cx - main.displayWidth / 2 - 10, y: top - 4, width: main.displayWidth + 20, height: foot - top + 26 };
    node.nativeBounds = b;
    return { root: node.target, rootNode: node, bounds: b, painted: true, foot: { x: cx, y: foot }, update() {}, setLitWindows(on) { for (const [im, id, v, size] of parts) { const o = objectKey(scene, id, v, season, size, !!on); if (o && im.texture.key !== o.key) im.setTexture(o.key).setOrigin(o.meta.ox, o.meta.oy); } }, destroy() { for (const im of poolImages) im.destroy(); node.remove(); } };
  }

  /* ---------- planting: groves, shrubs and reeds in deliberate groups ---------- */
  const GROVE = { summer: ['tree.green-oak', 'tree.green-birch', 'tree.green-chestnut', 'tree.hawthorn', 'tree.green-alder'], autumn: ['tree.green-oak', 'tree.green-birch', 'tree.green-chestnut', 'tree.hawthorn', 'tree.cherry'] };
  const SHRUB = ['plant.holly', 'plant.gorse', 'plant.hedge', 'plant.fern', 'plant.bracken'];
  function planting(scene, parent, info) {
    const W = info.W, made = [], season = info.season || 'summer', trees = GROVE[season] || GROVE.summer; spotCounts = {};
    // Trees stay sprites (the player walks behind them); low shrubs and reeds
    // are painted straight into the cached ground, so a frame never pays for them.
    const g = cachedGround && scene.textures.exists(cachedGround.key) ? cachedGround : null, gc = g && scene.textures.get(g.key).getSourceImage(), gx = gc && gc.getContext('2d'), paintLow = !!(gx && !g.low);
    const add = (id, v, size, x, y) => {
      if (!sceneObj(id)) return;
      if (size.h && size.h < 50 && gx) {
        if (!paintLow) return; const o = ok(() => objectCanvas(id, v, season, size)); if (!o) return;
        const k = K / OBJ_K; gx.drawImage(o.c, (x - g.box.x) * K - o.ox * k, (y - g.box.y) * K - o.oy * k, o.c.width * k, o.c.height * k); return;
      }
      const im = objectImage(scene, id, v, season, size, x, y, false); if (!im) return; im.setDepth(y); parent.add(im); made.push(im);
    };
    const gates = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data && GardenIslandLayout.data.gates || [], fl = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data && (GardenIslandLayout.data.presentation || {}).falls, byGate = (x, y) => gates.some(g => Math.abs(x - g.x) <= 3 && y - g.y >= -2 && y - g.y <= 5) || !!(fl && x >= fl.x - 3 && x <= fl.x + (fl.w || 3) + 2 && y >= fl.y - 1 && y <= fl.y + (fl.h || 3) + 4);   // (nor over Fleet Falls)
    for (let cy = info.box.y0; cy <= info.box.y1; cy++) for (let cx = info.box.x0; cx <= info.box.x1; cx++) {
      const spot = info.spot(cx, cy); spotCounts[spot || 'none'] = (spotCounts[spot || 'none'] || 0) + 1; if (!spot) continue;
      if (spot === 'tree' && byGate(cx, cy)) continue;   // (a gate stays in view: no tree crown over the arch)
      const h = (a, b, k) => { let n = Math.imul(a * 374761393 + b * 668265263 + k * 1442695041, 1) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
      const r = h(cx, cy, 11), cluster = h(Math.floor(cx / 3), Math.floor(cy / 2), 5), px = (cx + .5) * W.cellW + (h(cx, cy, 2) - .5) * 22, py = W.sky + (cy + 1) * W.cellH - 4 + (h(cx, cy, 3) - .5) * 8;
      // A grove where the cluster field is high (one species leads it), shrubs at its fringe.
      if (spot === 'tree' && cluster > .42) add(trees[Math.floor((cluster * 7 + r * 2) % trees.length)], Math.floor(r * 3), { h: 84 + r * 40 }, px, py);
      else if ((spot === 'tree' && cluster > .3 || spot === 'edge' && cluster > .35 || spot === 'wild' && r > .4) && r > .3) add(SHRUB[Math.floor(r * 53) % SHRUB.length], Math.floor(r * 7) % 3, { h: 26 + r * 16 }, px, py);
      else if (spot === 'shore' && r > .45) add(r > .75 ? 'plant.bulrush' : 'plant.reed', Math.floor(r * 5) % 3, { h: 30 + r * 14 }, px, py);
    }
    if (paintLow) { g.low = true; scene.textures.get(g.key).refresh(); }
    lastPlanting = made;
    return { destroy() { for (const im of made) im.destroy(); made.length = 0; }, count: made.length };
  }
  /* ---------- composition: the props painted into the one ground picture ----------
   * Everything that stands in the village casts its soft shadow across the
   * ground, sits in a fringe of grass and flowers at its foundation and wears
   * the ground at its door; painted into the cached ground canvas (no sprite,
   * no frame cost) and redone only when the set of footprints changes. Kits
   * use paintIntoGround(scene, fn) to add their own composed detail the same way. */
  function paintIntoGround(scene, fn) {
    const g = cachedGround && scene.textures.exists(cachedGround.key) ? cachedGround : null; if (!g) return false;
    const c = scene.textures.get(g.key).getSourceImage(), cx = c.getContext('2d'), B = g.box;
    cx.save(); cx.setTransform(K, 0, 0, K, -B.x * K, -B.y * K);
    try { fn(cx, { box: B, meadow: lastInfo && lastInfo.meadow || (() => true), palette: palette(lastInfo && lastInfo.season), rng, path }); } catch (e) { lastError = String(e && e.stack || e); }
    cx.restore(); scene.textures.get(g.key).refresh(); return true;
  }
  function hash32(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  let composeMs = 0;
  function compose(scene, items) {
    const g = cachedGround; if (!g || !items.length) return;
    const key = items.map(i => [i.id, Math.round(i.x), Math.round(i.y), Math.round(i.w)].join(':')).sort().join('|');
    if (g.composed === key) return; const t0 = performance.now();
    paintIntoGround(scene, (cx, kit) => {
      const P = kit.palette, r = rng(hash32(key)), meadow = kit.meadow, B = kit.box;
      for (const it of items) {
        if (it.x < B.x - 40 || it.x > B.x + B.w + 40 || it.y < B.y - 40 || it.y > B.y + B.h + 40) continue;
        // a long soft shadow thrown to the lower right (light from the upper left)
        cx.save(); cx.translate(it.x + it.w * .14, it.y + 3); cx.scale(1, .22); const rad = it.w * .62 + 10, gr = cx.createRadialGradient(0, 0, 0, 0, 0, rad);
        gr.addColorStop(0, 'rgba(48,56,30,.26)'); gr.addColorStop(.7, 'rgba(48,56,30,.1)'); gr.addColorStop(1, 'rgba(48,56,30,0)'); cx.fillStyle = gr; cx.beginPath(); cx.arc(0, 0, rad, 0, Math.PI * 2); cx.fill(); cx.restore();
        // worn ground where feet stop: at a door, in front of a bench or a board
        if (it.door) { cx.globalAlpha = .38; cx.fillStyle = P.pathWear; cx.fill(path(sceneDraw.blob(r, it.x, it.y + 12, Math.max(14, it.w * .2), 7, 8, .5))); cx.globalAlpha = .25; cx.fillStyle = P.pathEdge; cx.fill(path(sceneDraw.blob(r, it.x + 2, it.y + 14, Math.max(8, it.w * .12), 4, 7, .5))); cx.globalAlpha = 1; }
        // planting growing round the foundation, thicker at the corners
        for (let k = 0, n = Math.round(6 + it.w / 10); k < n; k++) {
          const side = k % 2 ? 1 : -1, x = it.x + side * (it.w / 2 - 2 + r() * 12) + (r() - .5) * 6, y = it.y - 1 + r() * 5; if (!meadow(x, y)) continue;
          cx.globalAlpha = .8; cx.fillStyle = r() < .5 ? P.lawnLo : '#5e7e3c'; cx.fill(path(sceneDraw.blob(r, x, y, 4 + r() * 4, 2 + r() * 2, 6, .5)));
          for (let b = 0; b < 4; b++) { cx.strokeStyle = b % 2 ? P.lawnHi : '#6f8a40'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x + b - 2, y); cx.quadraticCurveTo(x + b - 2 + (b - 1.5), y - 4, x + (b - 1.5) * 2.2, y - 6 - r() * 4); cx.stroke(); }
          if (r() < .45) { cx.globalAlpha = 1; cx.fillStyle = ['#f2f0e8', '#e8c84a', '#c86aa0', '#9a7ad0'][Math.floor(r() * 4)]; cx.beginPath(); cx.arc(x + (r() - .5) * 6, y - 4 - r() * 3, 1.3, 0, Math.PI * 2); cx.fill(); }
          cx.globalAlpha = 1;
        }
      }
    });
    g.composed = key; composeMs = Math.round(performance.now() - t0);
  }
  function memory(scene) { let bytes = 0, n = 0; if (cachedGround && scene && scene.textures.exists(cachedGround.key)) { const c = scene.textures.get(cachedGround.key).getSourceImage(); bytes += c.width * c.height * 4; n++; } return { groundBytes: bytes, groundTextures: n }; }
  function status() { return { wanted: wanted(), ready: ready(), groundMs, composeMs, K, planted: lastPlanting.length, spots: spotCounts, lastError }; }
  return { wanted, ready, preload, ground, building, planting, status, objectImage, objectCanvas, paintIntoGround, compose, memory, get lastError() { return lastError; }, set lastError(v) { lastError = v; }, set overLayer(v) { overLayer = v; } };
})();

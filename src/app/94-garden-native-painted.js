/** A tree's crown covers the player (world px): the player's middle inside the crown's own oval, not just anywhere in the tree's box.
 * Only those crowns fade, and not to a ghost: a few crisp crowns fade, never a wide pale veil of every tree near you. */
const GARDEN_CROWN_FADE = 0.34;
function gardenCrownCovers(px, py, tx, ty, H, w, image) {
  if (!(py < ty - 4)) return false;   // (the tree stands behind you: it is drawn under you anyway)
  const cy = ty - H * .66, ry = H * .36, rx = Math.max(H * .26, w * .42), dx = (px - tx) / rx, dy = (py - 28 - cy) / ry;
  if (dx * dx + dy * dy < 1) return true;
  // Open-grown crowns have filled side clumps beyond the oval, with sky
  // between them. Only their authored paint can extend this fade.
  return !!(image && window.GardenNativePainted && GardenNativePainted.crownCovers(image, px, py));
}
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
    summer: { lawn: '#93ad5f', lawnLo: '#7c9a4e', lawnHi: '#a9bf6c', sand: '#e3d2a2', sandWet: '#c8b483', water: '#6d9fb0', shallow: '#93bfbd', deep: '#5a8aa0', foam: '#eef2e2', path: '#d7c294', pathEdge: '#b29a6b', pathWear: '#e5d5ab', shadow: '#4d5a36', stone: '#dcc8a0', stoneLo: '#bea47b', stoneHi: '#eddcb6', kerb: '#9f8560' },
    autumn: { lawn: '#9aa65a', lawnLo: '#848f49', lawnHi: '#b2b66a', sand: '#e1cf9f', sandWet: '#c6b282', water: '#6a9aab', shallow: '#90b9b6', deep: '#57869b', foam: '#eef0e0', path: '#d6c090', pathEdge: '#ae9566', pathWear: '#e3d2a6', shadow: '#55542f', stone: '#d9c39a', stoneLo: '#bba076', stoneHi: '#eadab2', kerb: '#9c825c' },
    winter: { lawn: '#a6b29a', lawnLo: '#929f87', lawnHi: '#bcc5b0', sand: '#ddd3b6', sandWet: '#c4b897', water: '#7a9fab', shallow: '#a2bec0', deep: '#668a9a', foam: '#f2f4ee', path: '#d2c6a6', pathEdge: '#ad9f80', pathWear: '#e0d6bc', shadow: '#5e6658', stone: '#d6d0c2', stoneLo: '#bdb6a6', stoneHi: '#e8e4da', kerb: '#a49d8c' },
  };
  PAL.spring = Object.assign({}, PAL.summer, { lawn: '#8fb35f', lawnLo: '#78a04e', lawnHi: '#a8c66f' });
  const palette = season => PAL[season] || PAL.summer;
  const ok = (f) => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };
  let lastInfo = null, overLayer = null, lastError = null, groundMs = 0, lastPlanting = [], plantingTrunks = { list: [], key: '', rev: 0 }, spotCounts = {}, cachedGround = null, groundSerial = 0;

  /* ---------- library objects as baked sprites ---------- */
  const paths = new Map();
  const path = d => { let p = paths.get(d); if (!p) { if (paths.size > 20000) paths.clear(); p = new Path2D(d); paths.set(d, p); } return p; };
  let crownProbe = null;
  const crownBodyOffsets = [28, 14, 42], crownPointOffsets = [0];
  function crownGeometry(sh, k) {
    if (!sh.parts.crown || typeof scenePathBox !== 'function') return null;
    const parts = [];
    for (const shape of sh.parts.crown) {
      if (!shape.f || shape.img || shape.op != null && shape.op < .5) continue;
      const bounds = scenePathBox(shape.d, shape.m); if (!bounds) continue;
      let inverse = null;
      if (shape.m) {
        const [a, b, c, d, e, f] = shape.m, det = a * d - b * c; if (Math.abs(det) < 1e-12) continue;
        inverse = [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
      }
      parts.push({ path: path(shape.d), bounds, inverse });
    }
    if (!parts.length) return null;
    // Geometry queries only: no pixels are drawn or read, and no GPU texture
    // is created. Paths and their bounds are retained with the existing bake.
    if (!crownProbe) { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; crownProbe = canvas.getContext('2d'); }
    return { parts, bounds: sh.box, k };
  }
  function crownCovers(image, px, py, offsets = crownBodyOffsets) {
    const meta = image.texture && image.texture.customData && image.texture.customData.gdpaint, crown = meta && meta.crown;
    if (!crown || !crownProbe) return false;
    const sx = image.scaleX * crown.k * (image.flipX ? -1 : 1), sy = image.scaleY * crown.k * (image.flipY ? -1 : 1);
    if (!sx || !sy) return false;
    const angle = image.rotation || 0, cs = Math.cos(angle), sn = Math.sin(angle), dx = px - image.x;
    const flipX = image.flipX ? image.frame.realWidth * (1 - 2 * meta.ox) / crown.k : 0, flipY = image.flipY ? image.frame.realHeight * (1 - 2 * meta.oy) / crown.k : 0;
    for (const offset of offsets) {
      const dy = py - offset - image.y, x = (dx * cs + dy * sn) / sx + flipX, y = (-dx * sn + dy * cs) / sy + flipY, box = crown.bounds;
      if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) continue;
      for (const part of crown.parts) {
        const b = part.bounds; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
        const m = part.inverse, qx = m ? m[0] * x + m[2] * y + m[4] : x, qy = m ? m[1] * x + m[3] * y + m[5] : y;
        if (crownProbe.isPointInPath(part.path, qx, qy)) return true;
      }
    }
    return false;
  }
  /** The local line keeps its already drawn float/fish centres on the FX rig.
   * Probe only those points against retained filled crowns, never nearby trees
   * by radius or a fresh scene/fish search. Player coverage stays separate. */
  function fishingCrownCovers(image) {
    const F = typeof _gw !== 'undefined' && _gw.fishing, fx = typeof _gw !== 'undefined' && _gw.fx;
    if (!image.active || !image.visible || !F || !fx || !fx.canopyPoints || F.bx >= GARDEN_ROOM_X || !['wait', 'bite', 'reel', 'help'].includes(F.state)) return false;
    return fx.canopyPoints.some(p => image.depth > p.depth && Number.isFinite(p.x) && Number.isFinite(p.y) && crownCovers(image, p.x, p.y, crownPointOffsets));
  }
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
  // The ruins' evergreen yew keeps the scene asset's size and foot, but its
  // garden-scale crown needs smaller sprays than the distant scene silhouette.
  // Clone the compiled shapes; opening scenes keep their original library art.
  const gardenYewPaint = new WeakMap();
  function gardenYewShapes(source, variant) {
    if (gardenYewPaint.has(source)) return gardenYewPaint.get(source);
    const r = rng(4410 + variant * 17), [x0, y0, x1] = source.box, H = -y0 * .96, R = (x1 - x0) * .46, centre = (x0 + x1) / 2;
    const layers = ['', '', '', ''], tones = ['#152a1c', '#1e3a26', '#294a30', '#416342'];
    const clumps = [[-.49, -.56, .37, .19], [.40, -.54, .38, .20], [-.23, -.78, .39, .17], [.30, -.77, .32, .16], [-.56, -.36, .34, .16], [.52, -.35, .34, .16], [-.20, -.25, .39, .13], [.24, -.24, .38, .13], [-.04, -.52, .42, .21]];
    let needles = '';
    for (let i = 0; i < clumps.length; i++) {
      const [dx, dy, w, h] = clumps[i], x = centre + dx * R, y = dy * H, rx = w * R, ry = h * H;
      layers[0] += sceneDraw.blob(r, x + 2, y + 3, rx, ry, 9, .3);
      layers[1] += sceneDraw.blob(r, x - rx * .09, y - ry * .08, rx * .90, ry * .87, 9, .35);
      for (let j = 0; j < 6; j++) {
        const a = j * 2.4 + i, px = x + Math.cos(a) * rx * .54, py = y + Math.sin(a) * ry * .48;
        layers[2] += sceneDraw.blob(r, px, py, rx * (.24 + r() * .09), ry * .27, 7, .4);
        if (j < 3) layers[3] += sceneDraw.blob(r, px - rx * .07, py - ry * .08, rx * .12, ry * .12, 6, .4);
        const length = 4 + r() * 4;
        needles += `M${px - length} ${py + 1}q${length} -3 ${length * 2} -2M${px - length * .5} ${py - 1}l-2 -3M${px + length * .3} ${py - 1}l2 -3`;
      }
    }
    const crown = layers.map((d, i) => ({ f: tones[i], d }));
    crown.push({ s: '#6c8258', w: .7, op: .42, d: needles });
    const branches = `M-3 -20Q-9 ${-H * .34} ${centre - R * .49} ${-H * .57}M3 -30Q${R * .11} ${-H * .42} ${centre + R * .43} ${-H * .62}M-1 -32Q-8 ${-H * .47} ${centre - R * .10} ${-H * .77}`;
    const trunk = source.parts.trunk.concat([{ s: '#4a2a1c', w: 8, d: branches }, { s: '#926b45', w: 2, op: .75, d: branches }]);
    const shaped = Object.assign({}, source, { parts: Object.assign({}, source.parts, { trunk, crown }) });
    gardenYewPaint.set(source, shaped); return shaped;
  }
  /** One library object as a canvas at a given world size: { c, ox, oy } with (ox, oy) its foot in canvas px. */
  function objectCanvas(id, v, season, size, night) {
    let sh = sceneObjShapes(id, v, season); if (!sh) return null;
    if (id === 'tree.proof-yew') sh = gardenYewShapes(sh, v);
    const names = (sh.still || sh.order.filter(p => p !== 'lit')).concat(night && sh.parts.lit ? ['lit'] : []);
    const [x0, y0, x1, y1] = sh.box, k = (size.w ? size.w / (x1 - x0) : size.h / (y1 - y0)) * OBJ_K;
    const pad = 4, w = Math.ceil((x1 - x0) * k) + pad * 2, h = Math.ceil((y1 - y0) * k) + pad * 2;
    if (w > 4096 || h > 4096 || w < 2 || h < 2) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d');
    cx.setTransform(k, 0, 0, k, pad - x0 * k, pad - y0 * k);
    for (const n of names) drawShapes(cx, sh.parts[n] || [], night && n !== 'lit');
    return { c, ox: pad - x0 * k, oy: pad - y0 * k, k, crown: id.startsWith('tree.') ? crownGeometry(sh, k) : null };
  }
  /**
   * Where a library tree's trunk stands, measured from its own drawing (the collision view, 18 Nov 2026: a trunk box sat on
   * the tree's anchor, and some drawings stand their trunk well to one side of it: the second green oak by most of a cell).
   * In the lowest tenth of the drawing, the widest run of columns painted solid in most rows is the trunk.
   * Returns { dx, w } in world px for the tree drawn h px tall and not mirrored (a mirrored one uses -dx), or null.
   * Measured once per drawing at 200 px tall and scaled: the drawings scale evenly.
   */
  const trunkFeet = new Map();
  function trunkFoot(id, v, h) {
    const key = id + '|' + (v || 0);
    if (!trunkFeet.has(key)) {
      let foot = null;
      const made = ok(() => objectCanvas(id, v || 0, 'summer', { h: 200 }));
      if (made) ok(() => {
        const c = made.c, w = c.width, hh = c.height, a = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, hh).data, solid = (u, y) => a[(y * w + u) * 4 + 3] >= 160;
        let top = -1, bottom = -1;
        for (let y = 0; y < hh && top < 0; y++) for (let u = 0; u < w; u++) if (solid(u, y)) { top = y; break; }
        for (let y = hh - 1; y >= 0 && bottom < 0; y--) { let n = 0; for (let u = 0; u < w; u++) if (solid(u, y) && ++n >= 2) { bottom = y; break; } }
        if (top < 0 || bottom <= top) return;
        const band = Math.max(4, Math.min(40, Math.round((bottom - top) * .1))), b0 = Math.max(top, bottom - band), rows = bottom - b0 + 1, col = new Uint16Array(w);
        for (let y = b0; y <= bottom; y++) for (let u = 0; u < w; u++) if (solid(u, y)) col[u]++;
        let best = null; for (const thr of [.6, .35, .15]) { if (best) break; for (let u = 0, s = -1; u <= w; u++) { const on = u < w && col[u] >= rows * thr; if (on && s < 0) s = u; if (!on && s >= 0) { if (!best || u - s > best[1] - best[0]) best = [s, u - 1]; s = -1; } } }   // (leaves fallen at its foot: fewer rows)
        if (best) foot = { dx: ((best[0] + best[1] + 1) / 2 - made.ox) / OBJ_K, w: (best[1] - best[0] + 1) / OBJ_K };
      });
      trunkFeet.set(key, foot);
    }
    const f = trunkFeet.get(key); return f ? { dx: f.dx * h / 200, w: f.w * h / 200 } : null;
  }
  function objectKey(scene, id, v, season, size, night) {
    const key = TEX + '|' + id + '|' + v + '|' + season + '|' + Math.round(size.w || 0) + 'x' + Math.round(size.h || 0) + (night ? '|n' : '');
    if (scene.textures.exists(key)) return { key, meta: scene.textures.get(key).customData && scene.textures.get(key).customData.gdpaint };
    const made = ok(() => objectCanvas(id, v, season, size, night)); if (!made) return null;
    const tex = scene.textures.addCanvas(key, made.c); const meta = { ox: made.ox / made.c.width, oy: made.oy / made.c.height, crown: made.crown };
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
    // 3. The meadow, painted (Nov 2026 art pass): a lawn is never one green. Broad light and shade first, on a
    //    low-resolution wash that is smoothed up (soft by construction, no seams, almost free); then the sward in
    //    short directional brush strokes in three tones, clover and moss in patches, worn soil where feet go, tufts,
    //    pebbles. The sun is upper left, as everywhere in the vale.
    cx.save(); clipLoops(info.lawn);
    cx.fillStyle = P.lawn; cx.fillRect(B.x, B.y, B.w, B.h);
    const wash = (scale, fn) => { const w = document.createElement('canvas'); w.width = Math.ceil(B.w * scale); w.height = Math.ceil(B.h * scale); const wx = w.getContext('2d'); wx.setTransform(scale, 0, 0, scale, -B.x * scale, -B.y * scale); fn(wx); cx.save(); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(w, B.x, B.y, B.w, B.h); cx.restore(); };
    const washBlob = (wx, x, y, rx, ry, style, alpha) => { wx.globalAlpha = alpha; wx.fillStyle = style; wx.fill(path(sceneDraw.blob(r, x, y, rx, ry, 9, .45))); };
    // broad: sunlit swells and shaded hollows, big and few
    wash(1 / 16, wx => { for (let i = 0; i < B.w * B.h / 26000; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h, s = 70 + r() * 150, lift = r() < .5; washBlob(wx, x, y, s, s * .6, lift ? '#d8e08a' : '#3e5a2a', lift ? .16 : .2); } });
    // middle: patches of richer and thinner sward
    wash(1 / 6, wx => { for (let i = 0; i < B.w * B.h / 3200; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h, s = 16 + r() * 40, t = r(); washBlob(wx, x, y, s, s * .55, t < .4 ? P.lawnLo : t < .75 ? P.lawnHi : '#b8b46a', .22 + r() * .12); } });
    // worn soil: bare, trodden ground in a few patches, with grass thinning into it
    wash(1 / 3, wx => { for (let i = 0; i < B.w * B.h / 90000; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; if (!info.meadow(x, y)) continue; const s = 12 + r() * 18; washBlob(wx, x, y, s, s * .4, '#a08c5e', .3); washBlob(wx, x - 2, y - 1, s * .55, s * .22, '#b8a370', .3); } });
    // clover and moss in drifts: small trefoils in a cooler green with the odd white head; moss yellower and fine
    for (let i = 0; i < B.w * B.h / 9000; i++) {
      const x0 = B.x + r() * B.w, y0 = B.y + r() * B.h; if (!info.meadow(x0, y0)) continue; const moss = r() < .35;
      for (let k = 0, n = 14 + Math.floor(r() * 22); k < n; k++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 16, x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d * .5; if (!info.meadow(x, y)) continue;
        if (moss) { cx.globalAlpha = .45; cx.fillStyle = r() < .5 ? '#8f9a3e' : '#a6aa4c'; cx.fillRect(x, y, 1.4 + r() * 1.4, 1 + r() * .8); continue; }
        cx.globalAlpha = .55; cx.fillStyle = r() < .5 ? '#5a7c3a' : '#6c8c42'; for (let j = 0; j < 3; j++) { const b = j * 2.1 + r(); cx.beginPath(); cx.arc(x + Math.cos(b) * 1.1, y + Math.sin(b) * .7, 1.05, 0, Math.PI * 2); cx.fill(); }
        if (r() < .07 && info.season !== 'winter') { cx.globalAlpha = .9; cx.fillStyle = '#f4f0e2'; cx.beginPath(); cx.arc(x, y - 1.6, 1.3, 0, Math.PI * 2); cx.fill(); }
      }
    }
    // the sward in brush strokes: short, slightly curved, leaning with the light, in clumps of a few
    const strokeTones = [P.lawnLo, '#6f8a40', P.lawnHi, '#c0c47a'];
    cx.lineCap = 'round';
    for (let i = 0; i < B.w * B.h / 90; i++) {
      const x = B.x + r() * B.w, y = B.y + r() * B.h; if (!info.meadow(x, y)) continue;
      const t = r(), len = 2.4 + r() * 3.2, lean = -.6 + r() * .5;
      cx.globalAlpha = .22 + r() * .22; cx.strokeStyle = strokeTones[t < .38 ? 0 : t < .6 ? 1 : t < .92 ? 2 : 3]; cx.lineWidth = .9 + r() * .9;
      cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + lean, y - len * .6, x + lean * 2, y - len); cx.stroke();
    }
    cx.globalAlpha = 1;
    // grass in tufts: blades from one root, dark at the root, lit tips (fewer: the strokes carry the texture now)
    for (let i = 0; i < B.w * B.h / 1600; i++) {
      const x = B.x + r() * B.w, y = B.y + r() * B.h; if (!info.meadow(x, y)) continue; const n = 4 + Math.floor(r() * 4), hh = 4 + r() * 5;
      cx.globalAlpha = .35; cx.fillStyle = P.shadow; cx.fill(path(sceneDraw.ell(x + 1.2, y + .6, 3.6, 1.1)));
      for (let k = 0; k < n; k++) { const lean = (k - n / 2) * 1.1 + (r() - .5); cx.globalAlpha = .75; cx.strokeStyle = k % 2 ? P.lawnLo : '#647e3a'; cx.lineWidth = 1.1; cx.beginPath(); cx.moveTo(x + k * .6, y); cx.quadraticCurveTo(x + k * .6 + lean * .4, y - hh * .6, x + k * .6 + lean, y - hh); cx.stroke(); cx.globalAlpha = .6; cx.strokeStyle = P.lawnHi; cx.lineWidth = .8; cx.beginPath(); cx.moveTo(x + k * .6 + lean * .55, y - hh * .62); cx.lineTo(x + k * .6 + lean, y - hh); cx.stroke(); }
    }
    // pebbles and the odd stone, in little groups, each sitting in its own shadow
    for (let i = 0; i < B.w * B.h / 30000; i++) { const gx0 = B.x + r() * B.w, gy0 = B.y + r() * B.h; for (let k = 0, n = 2 + Math.floor(r() * 4); k < n; k++) { const x = gx0 + (r() - .5) * 22, y = gy0 + (r() - .5) * 10; if (!info.meadow(x, y)) continue; const s = 1.4 + r() * (k ? 2 : 3.4); cx.globalAlpha = .3; cx.fillStyle = P.shadow; cx.fill(path(sceneDraw.ell(x + s * .4, y + s * .3, s * 1.1, s * .6))); cx.globalAlpha = 1; cx.fillStyle = r() < .5 ? P.stone : P.stoneLo; cx.fill(path(sceneDraw.ell(x, y, s, s * .58))); cx.fillStyle = P.stoneHi; cx.globalAlpha = .7; cx.fill(path(sceneDraw.ell(x - s * .3, y - s * .22, s * .45, s * .22))); cx.globalAlpha = 1; } }
    // autumn: fallen leaves drift across the grass
    if (info.season === 'autumn') for (let i = 0; i < B.w * B.h / 1400; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; if (!info.meadow(x, y)) continue; cx.globalAlpha = .75; cx.fillStyle = ['#c0702e', '#d89a3e', '#a8562a', '#b8a040'][Math.floor(r() * 4)]; cx.fill(path(sceneDraw.leaf(x, y, r() * 6.3, 3 + r() * 2, 1.4))); }
    cx.globalAlpha = 1; cx.restore();
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
    // (soft: blurred, round-cornered shade, so a plot reads as worked ground, not a ruled rectangle or a seam between tiles)
    if (info.owned && info.owned.length) { cx.save(); clipLoops(info.owned); cx.filter = 'blur(3px)'; strokeLoops(info.owned, '#7d6a44', 9, .13); cx.filter = 'none'; cx.restore(); fillLoops(info.owned, 'rgba(190,200,120,.06)'); }
    // Inland water: a damp bank, the pond, its shallow rim and lap line.
    if (info.lakes.length) {
      // The v5 river continues beyond the coast for water mechanics. Its
      // freshwater banks end at land; the sea below supplies the open mouth.
      // Clip the original contours, without closing a new lap line at shore.
      cx.save(); if (info.W.v >= 5) clipLoops(info.coast);
      strokeLoops(info.lakes, P.sandWet, 14, .9); fillLoops(info.lakes, P.water);
      cx.save(); clipLoops(info.lakes); strokeLoops(info.lakes, P.shallow, 40, .5); strokeLoops(info.lakes, P.shallow, 18, .6);
      // the sky on the water: long soft bands, then short bright glints, darker ripples under the banks
      for (let i = 0; i < B.w * B.h / 9000; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; blob(x, y, 30 + r() * 60, 3 + r() * 4, 8, .3, r() < .6 ? '#a6cad0' : P.deep, .22); }
      for (let i = 0; i < B.w * B.h / 1800; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h, l = 4 + r() * 12; cx.globalAlpha = .35 + r() * .3; cx.strokeStyle = r() < .7 ? '#e8f4f0' : '#c4e0e0'; cx.lineWidth = 1 + r() * .8; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + l, y); cx.stroke(); }
      cx.globalAlpha = 1; cx.restore();
      strokeLoops(info.lakes, P.foam, 2, .7);
      cx.restore();
    }
    // 4. Paths (Nov 2026 art pass): a soft trodden margin where the grass thins and browns, the path's own edge
    //    broken rather than ruled, laid stones on the main roads (irregular, each lit on its upper left, mortar
    //    and wear between them) and gravel with a beaten centre on the lanes; grass creeps in over both edges.
    //    Clipped to the shared paint allowance from the world. An empty allowance paints no route.
    cx.save(); clipLoops(info.paths);
    if (info.W.v >= 5) clipLoops(info.lawn);
    const stroke = (pts, style, width, alpha, dx, dy) => { if (pts.length < 2) return; cx.beginPath(); cx.moveTo(pts[0].x + (dx || 0), pts[0].y + (dy || 0)); for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i].x + (dx || 0), pts[i].y + (dy || 0)); cx.strokeStyle = style; cx.lineWidth = width; cx.globalAlpha = alpha; cx.lineJoin = 'round'; cx.lineCap = 'round'; cx.stroke(); cx.globalAlpha = 1; };
    // (fn gets the local width too: an authored route widens and narrows along its length, 2.74)
    const along = (rt, step, fn) => { for (let i = 1; i < rt.points.length; i++) { const a = rt.points[i - 1], b = rt.points[i], L = Math.hypot(b.x - a.x, b.y - a.y), tx = (b.x - a.x) / (L || 1), ty = (b.y - a.y) / (L || 1), w = rt.half ? rt.half[i - 1] + rt.half[i] : rt.width; for (let t = 0; t < L; t += step) fn(a.x + tx * t, a.y + ty * t, tx, ty, w); } };
    // A route of varying width is a ribbon: a quad per step and a disc at every point, all wound the same way, filled once
    // (so a soft or translucent layer never doubles up where the pieces overlap). grow: px added to the whole width.
    const ribbon = (rt, grow, scale, dx, dy) => { const P = rt.points, H = rt.half, p = new Path2D(), ox = dx || 0, oy = dy || 0, k = scale == null ? 1 : scale, h = i => Math.max(.6, H[i] * k + grow / 2);
      for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 1e-6) continue; const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L, ha = h(i - 1), hb = h(i);
        let q = [[a.x + nx * ha, a.y + ny * ha], [b.x + nx * hb, b.y + ny * hb], [b.x - nx * hb, b.y - ny * hb], [a.x - nx * ha, a.y - ny * ha]]; let area = 0; for (let j = 0; j < 4; j++) { const u = q[j], v = q[(j + 1) % 4]; area += u[0] * v[1] - v[0] * u[1]; } if (area < 0) q = q.reverse();
        p.moveTo(q[0][0] + ox, q[0][1] + oy); for (let j = 1; j < 4; j++) p.lineTo(q[j][0] + ox, q[j][1] + oy); p.closePath(); }
      for (let i = 0; i < P.length; i += 1) { p.moveTo(P[i].x + ox + h(i), P[i].y + oy); p.arc(P[i].x + ox, P[i].y + oy, h(i), 0, Math.PI * 2); p.closePath(); }
      return p; };
    const band = (rt, style, grow, alpha, dx, dy, scale) => { if (!rt.half) return stroke(rt.points, style, rt.width + grow, alpha, dx, dy); cx.globalAlpha = alpha; cx.fillStyle = style; cx.fill(ribbon(rt, grow, scale, dx, dy), 'nonzero'); cx.globalAlpha = 1; };
    // the trodden margin, soft (blurred) so lawn and path meet without a line
    cx.filter = 'blur(' + Math.round(3 * K) + 'px)';
    for (const rt of info.routes) band(rt, '#8a7a4a', 12, .3, 1.5, 2.5);
    for (const rt of info.routes) band(rt, rt.main ? '#b8a37c' : '#bca878', 4, .9);
    cx.filter = 'none';
    for (const rt of info.routes) if (!rt.plaza) band(rt, rt.main ? '#a8977a' : P.path, -1, 1);   // (the main road's mortar bed; the lane's gravel)
    for (const rt of info.routes) {
      if (rt.plaza) continue;   // (laid with the square, as one paved surface: step 5)
      if (rt.main) {
        // laid stones in rough courses across the road, never a grid: each a lumpy rounded hexagon, sized and toned by chance
        along(rt, 6.4, (x, y, tx, ty, rw) => {
          const nx = -ty, ny = tx, half = rw / 2 - 1, ang = Math.atan2(ty, tx);
          for (let o = -half + r() * 2.5; o < half; ) {
            const w = 5.2 + r() * 2.6, h = 5 + r() * 1.2, px = x + nx * (o + w / 2), py = y + ny * (o + w / 2), worn = Math.abs(o) < half * .45; o += w + .9;
            const tone = r(), base = tone < .2 ? '#c6b088' : tone < .45 ? '#d0bb92' : tone < .75 ? P.stone : tone < .9 ? '#d6c4a0' : '#bea67e';
            cx.save(); cx.translate(px, py); cx.rotate(ang + Math.PI / 2 + (r() - .5) * .12);
            cx.globalAlpha = .3; cx.fillStyle = '#5e5038'; cx.beginPath(); cx.roundRect(-w / 2 + .5, -h / 2 + .7, w, h, 1.8); cx.fill();
            cx.globalAlpha = 1; cx.fillStyle = base; cx.beginPath(); cx.roundRect(-w / 2, -h / 2, w, h, 1.8); cx.fill();
            cx.globalAlpha = worn ? .4 : .22; cx.fillStyle = P.stoneHi; cx.beginPath(); cx.roundRect(-w / 2 + .6, -h / 2 + .5, w * .7, h * .38, 1.2); cx.fill();
            cx.restore();
          }
        });
      } else {
        // gravel: a beaten paler centre, wheel-worn darker lines, grit in two tones
        if (rt.half) band(rt, P.pathWear, 0, .5, 0, 0, .45);
        else stroke(rt.points, P.pathWear, rt.width * .45, .5);
        if (!rt.half) { stroke(rt.points, P.pathEdge, 1.6, .28, -rt.width * .22, 0); stroke(rt.points, P.pathEdge, 1.6, .28, rt.width * .22, 0); }
        else along(rt, 3, (x, y, tx, ty, rw) => { for (const side of [-1, 1]) { const o = rw * .22 * side; cx.globalAlpha = .28; cx.fillStyle = P.pathEdge; cx.fillRect(x - ty * o - .8, y + tx * o - .8, 1.6, 1.6); } });   // (the wheel lines, following the width)
        along(rt, 2.2, (x, y, tx, ty, rw) => { for (let k = 0; k < 3; k++) { const o = (r() - .5) * rw * .95, px = x - ty * o, py = y + tx * o; cx.globalAlpha = .5; cx.fillStyle = r() < .5 ? P.pathEdge : r() < .5 ? P.pathWear : '#a89068'; cx.fillRect(px, py, .9 + r() * 1.3, .7 + r() * .9); } });
      }
    }
    cx.globalAlpha = 1; cx.restore();
    // grass creeping in over both edges of every path: blades and small clumps rooted in the lawn, leaning out
    cx.save(); clipLoops(info.lawn); cx.lineCap = 'round';
    for (const rt of info.routes) along(rt, 3.4, (x, y, tx, ty, rw) => {
      for (const side of [-1, 1]) {
        if (r() < .3) continue; const o = (rw / 2 + 1.5 - r() * 4.5) * side, px = x - ty * o, py = y + tx * o, n = 2 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) { const hh = 2.5 + r() * 4, lx = (r() - .5) * 3 - ty * side * 1.5; cx.globalAlpha = .7; cx.strokeStyle = r() < .5 ? P.lawnLo : '#6f8a40'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(px + k * .8, py + 1); cx.quadraticCurveTo(px + k * .8 + lx * .4, py - hh * .5, px + k * .8 + lx, py - hh); cx.stroke(); }
        if (r() < .12) { cx.globalAlpha = .55; cx.fillStyle = r() < .5 ? P.lawnLo : '#7d9448'; cx.fill(path(sceneDraw.blob(r, px, py, 3 + r() * 3, 1.6 + r(), 6, .5))); }
      }
    });
    cx.globalAlpha = 1; cx.restore();
    // 5. The plaza: irregular setts laid in courses, mortar between them, wear in the middle and moss in the joints
    //    at the edges, grass growing in over its rim; a stone kerb of separate blocks in place of a ruled outline,
    //    and the compass rose inlaid, worn by feet.
    // (2.74: every shaped plaza in the box, the square with its rose and the terrace; the old single pad is gone)
    for (const pz of info.plazas || (info.plaza ? [Object.assign({ rose: info.plaza.centre }, info.plaza)] : [])) {
      const b = pz.bounds, rose = pz.rose, ccx = rose ? rose.x : pz.centre.x, ccy = rose ? rose.y : pz.centre.y;
      // The paved shape: the plaza's outline and, with it, the flagged walks that are part of it (2.74), as one path
      // (every piece wound the same way and filled once, so the pieces never show where they overlap).
      const U = new Path2D(), ribs = pz.ribbons || [];
      { let q = pz.points, area = 0; for (let i = 0; i < q.length; i++) { const u = q[i], v = q[(i + 1) % q.length]; area += u.x * v.y - v.x * u.y; } if (area < 0) q = q.slice().reverse(); U.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) U.lineTo(q[i].x, q[i].y); U.closePath(); }
      for (const rt of ribs) U.addPath(ribbon(rt, 0));
      // (the lawn inside the walk is the lawn's: the end of the terrace road never lies on it)
      cx.save(); if (pz.lawn) { cx.beginPath(); cx.rect(B.x, B.y, B.w, B.h); loop(pz.lawn); cx.clip('evenodd'); }
      cx.save(); cx.fillStyle = '#3e4a2a'; cx.globalAlpha = .28; cx.filter = 'blur(' + Math.round(4 * K) + 'px)'; cx.translate(3, 5); cx.fill(U, 'nonzero'); cx.restore();
      if (ribs.length) {
        // the kerb round the whole shape: stroked first, so the paving laid over it leaves only the outer half showing
        cx.save(); cx.lineJoin = 'round'; cx.lineCap = 'butt';
        cx.globalAlpha = .4; cx.strokeStyle = '#4e4230'; cx.lineWidth = 9; cx.translate(.6, 1.3); cx.stroke(U); cx.translate(-.6, -1.3);
        cx.globalAlpha = 1; cx.strokeStyle = '#a89070'; cx.lineWidth = 7; cx.stroke(U);
        cx.strokeStyle = '#c0aa82'; cx.setLineDash([6.5, 2.4]); cx.lineWidth = 7; cx.stroke(U); cx.setLineDash([]);
        cx.restore();
      }
      cx.save(); cx.fillStyle = '#ae9c78'; cx.fill(U, 'nonzero'); cx.clip(U, 'nonzero');
      const inRose = (x, y) => !!rose && Math.hypot((x - ccx) / 46, (y - ccy) / 25.3) < 1;
      for (let y = b.y - 4; y < b.y + b.h + 4;) {
        const rh = 7.2 + r() * 2.6; let x = b.x - 4 - r() * 8;
        while (x < b.x + b.w + 4) {
          const w = 8 + r() * 8, x0 = x + .9, y0 = y + .9, x1 = x + w - .9, y1 = y + rh - .9, mx = (x0 + x1) / 2, my = (y0 + y1) / 2; x += w;
          if (inRose(mx, my)) continue;
          const inU = (x, y) => cx.isPointInPath(U, (x - B.x) * K, (y - B.y) * K), j = () => (r() - .5) * 1.4;
          if (ribs.length && !inU(mx, my) && !inU(x0, y0) && !inU(x1, y1) && !inU(x1, y0) && !inU(x0, y1)) continue;   // (off the paving: nothing to lay)
          const d = ribs.length ? (Math.hypot((mx - ccx) / 150, (my - ccy) / 70) < 1 ? .3 : inU(mx, my - 6) && inU(mx, my + 6) && inU(mx - 9, my) && inU(mx + 9, my) ? .62 : 1) : Math.hypot((mx - pz.centre.x) / (b.w / 2), (my - pz.centre.y) / (b.h / 2));
          const tone = r(), base = tone < .15 ? '#c8b08a' : tone < .4 ? '#d4be96' : tone < .65 ? P.stone : tone < .82 ? '#dcc9a4' : tone < .93 ? '#cdb68e' : '#d8c2aa';
          cx.save(); cx.translate(mx, my); cx.rotate((r() - .5) * .05);
          const sw = x1 - x0 + j() * .4, shh = y1 - y0 + j() * .3;
          cx.globalAlpha = 1; cx.fillStyle = base; cx.beginPath(); cx.roundRect(-sw / 2, -shh / 2, sw, shh, 1.6); cx.fill();
          cx.globalAlpha = .3; cx.fillStyle = P.stoneHi; cx.beginPath(); cx.roundRect(-sw / 2 + .5, -shh / 2 + .4, sw * .8, 2, 1); cx.fill();
          cx.globalAlpha = .22; cx.fillStyle = '#7a6648'; cx.beginPath(); cx.roundRect(-sw / 2 + .4, shh / 2 - 1.7, sw - .8, 1.5, .8); cx.fill();
          if (d < .55 && r() < .5) { cx.globalAlpha = .16; cx.fillStyle = '#f4e8c8'; cx.beginPath(); cx.roundRect(-sw / 2, -shh / 2, sw, shh, 1.6); cx.fill(); }   // polished by feet in the middle
          cx.restore();
          // moss and weeds in the joints, more towards the rim
          if (d > .7 && r() < (d - .6) * .9) { cx.globalAlpha = .7; cx.fillStyle = r() < .5 ? '#7d8f4e' : '#93a252'; cx.fill(path(sceneDraw.blob(r, x1 + .4, (y0 + y1) / 2 + j(), 1.6 + r() * 2, 1 + r(), 5, .5))); }
        }
        y += rh;
      }
      cx.globalAlpha = 1;
      // the rose: an inlaid ring of dark stone, a pale field, the points in honey stone, softened by wear
      if (rose) {
      cx.fillStyle = '#8f7a58'; cx.beginPath(); cx.ellipse(ccx, ccy, 46, 25.3, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#e4d4ae'; cx.beginPath(); cx.ellipse(ccx, ccy, 42.5, 23.2, 0, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = '#b49c72'; cx.lineWidth = 1.2; cx.globalAlpha = .7; cx.beginPath(); cx.ellipse(ccx, ccy, 29, 16, 0, 0, Math.PI * 2); cx.stroke(); cx.globalAlpha = 1;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, l = i % 2 ? 15 : 26; for (const [side, col] of [[1, '#a8875a'], [-1, '#c8a878']]) { cx.fillStyle = col; cx.beginPath(); cx.moveTo(ccx + Math.cos(a) * l, ccy + Math.sin(a) * l * .55); cx.lineTo(ccx + Math.cos(a + side * 1.25) * 4.4, ccy + Math.sin(a + side * 1.25) * 2.4); cx.lineTo(ccx, ccy); cx.fill(); } }
      cx.fillStyle = '#6e5a3e'; cx.beginPath(); cx.arc(ccx, ccy, 2, 0, Math.PI * 2); cx.fill();
      cx.globalAlpha = .22; cx.fillStyle = '#fff8e6'; cx.beginPath(); cx.ellipse(ccx - 8, ccy - 4, 22, 9, -.2, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
      }
      // the inner shade along the rim (the plaza sits a little below the turf)
      if (!ribs.length) { cx.filter = 'blur(' + Math.round(2 * K) + 'px)'; cx.beginPath(); loop(pz.points); cx.strokeStyle = '#5a4c34'; cx.lineWidth = 6; cx.globalAlpha = .28; cx.stroke(); cx.filter = 'none'; cx.globalAlpha = 1; }
      cx.restore();
      if (ribs.length) {
        // turf growing in over the kerb from outside, all round the shape: blades rooted just off its edge
        const inU = (x, y) => cx.isPointInPath(U, (x - B.x) * K, (y - B.y) * K), edge = [];
        const q = pz.points; for (let i = 0; i < q.length; i++) { const a = q[i], c = q[(i + 1) % q.length], L = Math.hypot(c.x - a.x, c.y - a.y); for (let t = 0; t < L; t += 2.6) edge.push([a.x + (c.x - a.x) * t / L, a.y + (c.y - a.y) * t / L]); }
        for (const rt of ribs) for (let i = 1; i < rt.points.length; i++) { const a = rt.points[i - 1], c = rt.points[i], L = Math.hypot(c.x - a.x, c.y - a.y) || 1, nx = -(c.y - a.y) / L, ny = (c.x - a.x) / L; for (let t = 0; t < L; t += 2.6) for (const sd of [-1, 1]) { const h = (rt.half[i - 1] + (rt.half[i] - rt.half[i - 1]) * t / L) * sd; edge.push([a.x + (c.x - a.x) * t / L + nx * h, a.y + (c.y - a.y) * t / L + ny * h]); } }
        cx.lineCap = 'round';
        for (const [ex, ey] of edge) {
          if (r() < .4) continue; const x = ex + (r() - .5) * 2, y = ey + (r() - .5) * 2;
          // on the rim: some ground just beside it is off the paving
          let ox = 0, oy = 0, out = 0; for (const [dx, dy] of [[3.5, 0], [-3.5, 0], [0, 3.5], [0, -3.5]]) if (!inU(x + dx, y + dy)) { ox += dx; oy += dy; out++; } if (!out || out === 4) continue;
          const bx = x + ox / out * .9, by = y + oy / out * .9 + 1.5, hh = 2.5 + r() * 4.5;
          cx.globalAlpha = .8; cx.strokeStyle = r() < .5 ? P.lawnLo : '#6f8a40'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(bx, by + 2); cx.quadraticCurveTo(bx + (r() - .5) * 2, by - hh * .4, bx + (r() - .5) * 4, by - hh); cx.stroke();
        }
        cx.globalAlpha = 1; cx.restore(); continue;
      }
      cx.restore();
      // the kerb: separate blocks along the rim, each lit, with grass grown up against them
      const pts = pz.points.concat([pz.points[0]]); cx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], c = pts[i], L = Math.hypot(c.x - a.x, c.y - a.y), tx = (c.x - a.x) / (L || 1), ty = (c.y - a.y) / (L || 1);
        for (let t = 0; t < L; t += 9 + r() * 4) {
          const x = a.x + tx * t, y = a.y + ty * t, len = Math.min(6 + r() * 3, L - t);
          cx.globalAlpha = .45; cx.strokeStyle = '#4e4230'; cx.lineWidth = 4.2; cx.beginPath(); cx.moveTo(x + .6, y + 1.2); cx.lineTo(x + tx * len + .6, y + ty * len + 1.2); cx.stroke();
          cx.globalAlpha = 1; cx.strokeStyle = r() < .5 ? '#b49e78' : '#a89070'; cx.lineWidth = 3.4; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + tx * len, y + ty * len); cx.stroke();
          cx.globalAlpha = .6; cx.strokeStyle = '#e2d2ac'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x - .4, y - .9); cx.lineTo(x + tx * len - .4, y + ty * len - .9); cx.stroke();
        }
      }
      cx.globalAlpha = 1;
      // turf growing in over the kerb from outside
      cx.save(); cx.beginPath(); cx.rect(B.x, B.y, B.w, B.h); loop(pz.points); cx.clip('evenodd');
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], c = pts[i], L = Math.hypot(c.x - a.x, c.y - a.y);
        for (let t = 0; t < L; t += 2.6) { if (r() < .35) continue; const x = a.x + (c.x - a.x) * t / L + (r() - .5) * 2, y = a.y + (c.y - a.y) * t / L + 1 + r() * 2.5, hh = 2.5 + r() * 4.5; cx.globalAlpha = .8; cx.strokeStyle = r() < .5 ? P.lawnLo : '#6f8a40'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x, y + 2); cx.quadraticCurveTo(x + (r() - .5) * 2, y - hh * .4, x + (r() - .5) * 4, y - hh); cx.stroke(); }
      }
      cx.globalAlpha = 1; cx.restore();
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
      const a = rt.points[i - 1], b = rt.points[i], L = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / (L || 1), ny = (b.x - a.x) / (L || 1), rw = rt.half ? rt.half[i - 1] + rt.half[i] : rt.width;
      for (let t = 0; t < L; t += 14) {
        if (r() < .45) continue; const side = r() < .5 ? -1 : 1, o = (rw / 2 + 5 + r() * 6) * side, x = a.x + (b.x - a.x) * t / L + nx * o, y = a.y + (b.y - a.y) * t / L + ny * o;
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
    // addImage, not addCanvas: a CanvasTexture reads every pixel of this big canvas back from the GPU first (over a second);
    // the few later touches (paintIntoGround, the low detail) re-upload through refresh() below.
    { const t = scene.textures.addImage(key, c); if (t && typeof t.refresh !== 'function') t.refresh = function () { for (const src of this.source) src.update(); return this; }; }
    cachedGround = { key, sig, box: B, low: false }; groundMs = Math.round(performance.now() - started);
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
    'garden-shop': { obj: 'building.green-cottage', v: 0, w: 150, wallWidth: 150, sign: 'Seed & Stem', extra: [['plant.planter', 1, -84, 0, 26], ['plant.planter', 0, 84, 0, 26], ['plant.rph-flower-tub', 1, -60, 8, 18]] },
    'land-office': { obj: 'building.cottage', v: 1, w: 140, wallWidth: 160, sign: 'Land Office', extra: [['street.lamp', 0, -66, 4, 0, 70]] },   // (the lamp on the door's side of the west corner: the lake walk passes just outside it)
    'tackle-shop': { obj: 'building.fpv-sailing-hut', v: 0, w: 150, wallWidth: 376, wallCenterX: -8, wallFootY: 14, sign: 'Tackle & Tide', extra: [['street.mqn-lifebuoy', 0, 80, 2, 0, 30]] },
    'market-stall': { obj: 'structure.mcr-market-chalet', v: 1, w: 104, wallWidth: 200 },
    // the high street's cottages (2.74), each its own kind so the street is not one house four times
    'ld-cottage-1': { obj: 'building.cottage', v: 1, w: 100, wallWidth: 160, extra: [['plant.rph-flower-tub', 1, -44, 6, 16]] },
    'ld-cottage-2': { obj: 'building.thatched-cottage', v: 1, w: 100, wallWidth: 216 },
    'ld-cottage-3': { obj: 'building.green-cottage', v: 0, w: 100, wallWidth: 150, extra: [['plant.planter', 0, 46, 0, 20]] },
    'ld-cottage-4': { obj: 'building.thatched-cottage', v: 0, w: 100, wallWidth: 216 },
  };
  const HALL = [
    { obj: 'structure.wp-bivvy', v: 0, w: 96, wallWidth: 150, wallCenterX: 5 },
    { obj: 'building.vale-hall-small', v: 0, w: 144, wallWidth: 160, sign: 'Lake Hall' },
    { obj: 'building.thatched-cottage', v: 1, w: 150, wallWidth: 216, sign: 'Lake Hall' },
    { obj: 'building.vale-hall-large', v: 0, w: 144, wallWidth: 240, sign: 'Lake Hall' },
    { obj: 'building.vale-hall-large', v: 1, w: 144, wallWidth: 240, sign: 'Lake Hall' },
  ];
  function hallTier(sc) { try { const ca = sc.ca || (typeof gardenCatchHere === 'function' ? gardenCatchHere() : null) || {}; return typeof gardenHallTier === 'function' ? Math.max(0, Math.min(HALL.length - 1, gardenHallTier(Number(ca.ha) || 0))) : 0; } catch (e) { return 0; } }
  function building(scene, prop, sc, element, W) {
    if (!ready()) return null;
    const tier = prop.id === 'lake-hall' ? hallTier(sc) : -1, def = tier >= 0 ? HALL[tier] : BUILD[prop.id]; if (!def || !sceneObj(def.obj)) return null;
    const season = sc.season || 'summer', night = sc.tod === 'dusk' || sc.tod === 'night';
    const node = element(scene, 'g', { class: 'gd-it gd-prop gd-prop-' + prop.kind + ' gd-painted', 'data-prop': prop.id, 'data-z': prop.y + prop.h, 'data-x': prop.x });
    const cx = (prop.x + prop.w / 2) * W.cellW, foot = W.sky + (prop.y + prop.h) * W.cellH - 2;
    const shadow = scene.add.graphics(); shadow.fillStyle(0x3a4a2a, .2).fillEllipse(cx + 8, foot + 1, def.w * 1.08, 18); node._inner.add(shadow);
    const parts = [], poolImages = [];
    // Match the authored standing span to the protected footprint. Roofs,
    // rods and flags do not define its width or its ground anchor.
    const shape = def.wallWidth ? sceneObjShapes(def.obj, def.v, season) : null;
    const scale = shape ? prop.w * W.cellW / def.wallWidth : 1;
    const size = { w: shape ? (shape.box[2] - shape.box[0]) * scale : def.w };
    const main = objectImage(scene, def.obj, def.v, season, size, cx - (def.wallCenterX || 0) * scale, foot - (def.wallFootY || 0) * scale, night); if (!main) { node.remove(); return null; }
    node._inner.add(main); parts.push([main, def.obj, def.v, size]);
    for (const [id, v, dx, dy, w, h] of def.extra || []) { if (!sceneObj(id)) continue; const im = objectImage(scene, id, v, season, w ? { w } : { h }, cx + dx, foot + dy, night); if (im) { node._inner.addAt(im, dy > 0 ? node._inner.list.length : 1); parts.push([im, id, v, w ? { w } : { h }]); } }
    if (def.sign) {
      const g = scene.add.graphics(), sy = foot + 12, tw = Math.max(54, def.sign.length * 6.4) / 2;
      g.fillStyle(0x3d3424, .22).fillRoundedRect(cx - tw + 2, sy - 7, tw * 2, 15, 4).fillStyle(0xf3ead2).fillRoundedRect(cx - tw, sy - 9, tw * 2, 15, 4).lineStyle(1, 0xb9a57c, 1).strokeRoundedRect(cx - tw, sy - 9, tw * 2, 15, 4);
      node._inner.add(g);
      node._inner.add(scene.add.text(cx, sy - 1.5, def.sign, { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#4a3b26', resolution: 3 }).setOrigin(.5, .5));
    }
    // lit windows spill a soft warm pool on the ground in front (added light, feathered: no disc)
    if (night && window.GardenPaintedProps) { const pk = GardenPaintedProps.poolKey(scene); if (pk) { const pool = scene.add.image(cx, foot + 10, pk).setOrigin(.5, .5).setScale(def.w * 1.1 / 256, def.w * .3 / 256).setAlpha(.3), layer = overLayer; if (layer) { layer.add(pool); pool.setDepth(80005); } else node._inner.add(pool); poolImages.push(pool); } }
    const top = main.y - main.displayHeight * main.originY, b = { x: main.x - main.displayWidth * main.originX - 10, y: top - 4, width: main.displayWidth + 20, height: foot - top + 26 };
    node.nativeBounds = b;
    return { root: node.target, rootNode: node, bounds: b, painted: true, foot: { x: cx, y: foot }, update() {}, setLitWindows(on) { for (const [im, id, v, size] of parts) { const o = objectKey(scene, id, v, season, size, !!on); if (o && im.texture.key !== o.key) im.setTexture(o.key).setOrigin(o.meta.ox, o.meta.oy); } }, destroy() { for (const im of poolImages) im.destroy(); node.remove(); } };
  }

  /* ---------- planting: groves, shrubs and reeds in deliberate groups ---------- */
  const GROVE = { summer: ['tree.green-oak', 'tree.green-birch', 'tree.green-chestnut', 'tree.hawthorn', 'tree.green-alder'], autumn: ['tree.green-oak', 'tree.green-birch', 'tree.green-chestnut', 'tree.hawthorn', 'tree.cherry'] };
  const TREE_KIT = { 'tree.green-oak': 'oak', 'tree.green-birch': 'birch', 'tree.green-chestnut': 'chestnut', 'tree.hawthorn': 'hawthorn', 'tree.green-alder': 'alder', 'tree.cherry': 'cherry' };
  const SHRUB = ['plant.holly', 'plant.gorse', 'plant.hedge', 'plant.fern', 'plant.bracken'];
  /** Once a frame: a village crown you stand under fades, so you can always see yourself (as in the woods). */
  let plantingTall = [], fadeLast = 0;
  const plantingCoverage = [];
  function fadeUnder(time) {
    plantingCoverage.length = 0;
    if (!plantingTall.length || typeof _gw === 'undefined' || !lastInfo) return;
    const W = lastInfo.W, dt = fadeLast ? Math.min(.1, Math.max(0, (time - fadeLast) / 1000)) : .016; fadeLast = time;
    const x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH;
    for (const t of plantingTall) { if (!t.im.active) continue; const under = gardenCrownCovers(x, y, t.x, t.y, t.h, t.im.displayWidth, t.im), a = under || fishingCrownCovers(t.im) ? GARDEN_CROWN_FADE : 1; if (under && t.im.visible) plantingCoverage.push(t.im); if (t.im.alpha !== a) t.im.setAlpha(Math.abs(a - t.im.alpha) < .02 ? a : t.im.alpha + (a - t.im.alpha) * Math.min(1, dt * 8)); }
  }
  function planting(scene, parent, info) {
    const W = info.W, made = [], season = info.season || 'summer', trees = GROVE[season] || GROVE.summer; spotCounts = {};
    // Trees stay sprites (the player walks behind them); low shrubs and reeds
    // are painted straight into the cached ground, so a frame never pays for them.
    const g = cachedGround && scene.textures.exists(cachedGround.key) ? cachedGround : null, gc = g && scene.textures.get(g.key).getSourceImage(), gx = gc && gc.getContext('2d'), paintLow = !!(gx && !g.low);
    const add = (id, v, size, x, y) => {
      if (!sceneObj(id)) return;
      if (size.h && size.h < 50 && gx) {
        if (!paintLow) return; const o = ok(() => objectCanvas(id, v, season, size)); if (!o) return;
        const k = K / OBJ_K, bx = (x - g.box.x) * K, by = (y - g.box.y) * K, bw = Math.min(o.c.width * k, size.h * K * 2.2);
        // seated in the lawn: a soft shadow under it and grass grown up over its foot, so a hedge or gorse clump
        // never ends in a ruled line across the grass (polish, Nov 2026)
        gx.save(); gx.globalAlpha = .22; gx.fillStyle = '#2e3e22'; gx.beginPath(); gx.ellipse(bx, by - K, bw * .46, 3.2 * K, 0, 0, Math.PI * 2); gx.fill(); gx.restore();
        gx.drawImage(o.c, bx - o.ox * k, by - o.oy * k, o.c.width * k, o.c.height * k);
        gx.save(); const blades = Math.round(bw / (2.6 * K)), seed = Math.abs(Math.round(x * 7 + y * 13)), tone = season === 'winter' ? ['#8a9878', '#a4ae90'] : season === 'autumn' ? ['#7e9446', '#9aaa58'] : ['#5e8a3e', '#7aa24c'];
        gx.lineCap = 'round'; for (let i = 0; i < blades; i++) { const t = blades > 1 ? i / (blades - 1) : .5, h = ((seed + i * 37) % 7) / 7, px = bx - bw * .48 + t * bw * .96, len = (3 + h * 4.5) * K * (1 - Math.abs(t - .5) * .6); gx.strokeStyle = tone[(seed + i) % 2]; gx.globalAlpha = .9; gx.lineWidth = 1.1 * K; gx.beginPath(); gx.moveTo(px, by + K * .6); gx.quadraticCurveTo(px + (h - .5) * 2 * K, by - len * .5, px + (h - .5) * 4 * K, by - len); gx.stroke(); }
        gx.restore(); return;
      }
      // trees: the painted tree kit (94-garden-paint-tree-0kit.js), crowns of lit leaf masses on rooted trunks, and their
      // dappled shadow and root contact painted into the cached ground (no sprite, no frame cost)
      const species = TREE_KIT[id], kit = species && window.GardenPaintTrees;
      let im = null;
      if (kit) {
        im = ok(() => GardenPaintTrees.image(scene, { species, season, v, h: size.h, x, y, flip: (Math.round(x) & 1) === 1 }));
        if (im && paintLow) { gx.save(); gx.setTransform(K, 0, 0, K, -g.box.x * K, -g.box.y * K); ok(() => GardenPaintTrees.groundShadow(gx, x, y, size.h, { species, season })); gx.restore(); }
      }
      if (!im) im = objectImage(scene, id, v, season, size, x, y, false);
      if (!im) return; im.setDepth(y); parent.add(im); made.push(im);
      if (size.h >= 50) { tall.push({ im, x, y, h: size.h }); trunks.push(Object.freeze({ x: x / W.cellW, y: (y - W.sky) / W.cellH, w: size.h > 100 ? .5 : .4 })); }
    };
    const tall = plantingTall = [], trunks = [];
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
    // the village trees' trunks stand in the way like a planted tree's (94-garden-world-0walk.js _gwBuildSolids): you walked through them
    const key = trunks.map(t => t.x.toFixed(2) + ',' + t.y.toFixed(2)).join('|'); if (key !== plantingTrunks.key) { plantingTrunks = { list: Object.freeze(trunks), key, rev: plantingTrunks.rev + 1 }; if (typeof _gw !== 'undefined' && _gw) _gw.grid = null; }
    return { destroy() { for (const im of made) im.destroy(); made.length = 0; if (plantingTall === tall) { plantingTall = []; plantingCoverage.length = 0; } }, count: made.length };
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
  return { wanted, ready, preload, ground, building, planting, trunks: () => plantingTrunks, trunkFoot, fadeUnder, crownCovers, fishingCrownCovers, playerCanopies: () => plantingCoverage, status, objectImage, objectCanvas, paintIntoGround, compose, memory, get lastError() { return lastError; }, set lastError(v) { lastError = v; }, set overLayer(v) { overLayer = v; } };
})();

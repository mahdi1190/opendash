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
  /** (village fix round 2) Setts laid in fans, the old way: each fan a few courses of small stones on arcs, the fans in
   * overlapping rows like scales, so the paving has no rows to run across a curved street and never reads as a brick
   * wallpaper. Stones and mortar are close in tone (one surface, the joints a shade darker, never a dark grid); the
   * tone wanders in broad patches of older and newer stone; feet polish a paler way; moss and the odd weed live in the
   * joints towards the rim. Every fan is seeded by its place, so ground chunks painted apart meet exactly.
   * o: { salt, P (palette), skip(x, y): leave a stone out (the rose), wear(x, y): 0..1 polish, rim(x, y): 0..1 towards the edge } */
  // (village fix round 2, speed) the fans are laid once into a tile (8 fans by 16 rows, seamless: the lattice repeats on it) and
  // the paving is filled with that tile as a pattern fixed to the world, one fill per piece: laid a stone at a time, the
  // thousands of little paths kept the graphics card so busy that walking past the square stalled for seconds
  const fanTiles = new Map();
  function fanTile(P, k) {
    const key = k.toFixed(3) + '|' + (P.stoneHi || ''); let t = fanTiles.get(key); if (t) return t;
    const R = 21, ring = 4.4, half = 1.2, ys = .6, dx = 32, dy = 8, NI = 8, NJ = 16, TW = dx * NI, TH = dy * NJ;
    const c = document.createElement('canvas'); c.width = Math.round(TW * k); c.height = Math.round(TH * k); const tx = c.getContext('2d');
    tx.setTransform(c.width / TW, 0, 0, c.height / TH, 0, 0); tx.fillStyle = '#b3a07e'; tx.fillRect(0, 0, TW, TH);
    const tones = ['#c6b08a', '#cfb993', '#d6c39e', '#ccb690', '#d2bfa2', '#c2ab86', '#d9c8a6'];
    const hash = (a, b) => { let n = Math.imul(a * 374761393 + b * 668265263 + 1442695041 * 23, 1) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return (n ^ (n >>> 16)) >>> 0; };
    for (let j = -1; j <= NJ + 2; j++) {
      const off = (j & 1) ? dx / 2 : 0, fy = j * dy, byTone = tones.map(() => new Path2D()), hi = new Path2D(), lo = new Path2D();
      for (let i = -1; i <= NI + 1; i++) {
        const fx = i * dx + off, rr = rng(hash(((i % NI) + NI) % NI, ((j % NJ) + NJ) % NJ) | 1), age = Math.sin(((i % NI) + NI) % NI * 1.7 + (((j % NJ) + NJ) % NJ) * .9) * .5;
        for (let q = 0; q < 4; q++) {
          const r0 = R - q * ring, r1 = r0 - ring + .85; if (r1 < 1.6) break;
          const rm = (r0 + r1) / 2, n = Math.max(2, Math.round(2 * half * rm / (4.6 + rr() * 1.2))), da = 2 * half / n;
          for (let m = 0; m < n; m++) {
            const a0 = Math.PI / 2 - half + m * da + .7 / rm, a1 = a0 + da - 1.1 / rm, t0 = rr();
            const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), P2 = byTone[Math.max(0, Math.min(tones.length - 1, Math.floor((t0 + age * .1) * tones.length)))];
            P2.moveTo(fx + c0 * r0, fy - s0 * r0 * ys); P2.lineTo(fx + c1 * r0, fy - s1 * r0 * ys); P2.lineTo(fx + c1 * r1, fy - s1 * r1 * ys); P2.lineTo(fx + c0 * r1, fy - s0 * r1 * ys); P2.closePath();
            hi.moveTo(fx + c0 * r0, fy - s0 * r0 * ys + .4); hi.lineTo(fx + c1 * r0, fy - s1 * r0 * ys + .4); lo.moveTo(fx + c0 * r1, fy - s0 * r1 * ys - .3); lo.lineTo(fx + c1 * r1, fy - s1 * r1 * ys - .3);
          }
        }
      }
      tx.globalAlpha = 1; for (let q = 0; q < tones.length; q++) { tx.fillStyle = tones[q]; tx.fill(byTone[q]); }
      tx.lineWidth = .9; tx.globalAlpha = .34; tx.strokeStyle = P.stoneHi || '#eddcb6'; tx.stroke(hi); tx.globalAlpha = .2; tx.strokeStyle = '#6e5c42'; tx.stroke(lo);
    }
    t = { c, TW, TH }; fanTiles.set(key, t); return t;
  }
  function fanSetts(cx, bb, o) {
    o = o || {}; const P = o.P || PAL.summer, m = cx.getTransform(), k = Math.max(.25, Math.hypot(m.a, m.b)), T = fanTile(P, k);
    const pat = cx.createPattern(T.c, 'repeat'); if (!pat) return; pat.setTransform(new DOMMatrix([T.TW / T.c.width, 0, 0, T.TH / T.c.height, 0, 0]));
    cx.save(); cx.globalAlpha = 1; cx.fillStyle = pat; cx.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
    // the tone wanders in broad patches of older and newer stone, so the tile's repeat never shows; feet polish a paler way
    const r = rng((Math.round(bb[0] * 7 + bb[1] * 13) | 0) ^ 0x5bd1), area = (bb[2] - bb[0]) * (bb[3] - bb[1]);
    for (let q = 0, n = Math.max(2, Math.round(area / 9000)); q < n; q++) { const x = bb[0] + r() * (bb[2] - bb[0]), y = bb[1] + r() * (bb[3] - bb[1]), light = r() < .55, w = o.wear ? o.wear(x, y) : 0; cx.globalAlpha = (light ? .09 : .07) + w * .12; cx.fillStyle = light || w > 0 ? '#f6ecd0' : '#6a5a40'; cx.beginPath(); cx.ellipse(x, y, 24 + r() * 46, 8 + r() * 14, (r() - .5) * .4, 0, 7); cx.fill(); }
    cx.restore();
  }



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
  function objectCanvas(id, v, season, size, night, cpu) {   // cpu: a canvas kept in memory, for pictures that are read back (icons)
    let sh = sceneObjShapes(id, v, season); if (!sh) return null;
    if (id === 'tree.proof-yew') sh = gardenYewShapes(sh, v);
    const names = (sh.still || sh.order.filter(p => p !== 'lit')).concat(night && sh.parts.lit ? ['lit'] : []);
    const [x0, y0, x1, y1] = sh.box, k = (size.w ? size.w / (x1 - x0) : size.h / (y1 - y0)) * OBJ_K;
    const pad = 4, w = Math.ceil((x1 - x0) * k) + pad * 2, h = Math.ceil((y1 - y0) * k) + pad * 2;
    if (w > 4096 || h > 4096 || w < 2 || h < 2) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d', { willReadFrequently: true });   // (in memory: its texture and pixel reads never wait on the graphics card, fix round 2)
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
      const made = ok(() => objectCanvas(id, v || 0, 'summer', { h: 200 }, false, true));   /* (in memory: it is read back below, and reading a card's canvas waits for the card) */
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
    // (addImage: no read back of every pixel from the graphics card as the texture is made; see the ground below)
    const tex = scene.textures.addCanvas(key, made.c);
    const meta = { ox: made.ox / made.c.width, oy: made.oy / made.c.height, crown: made.crown };
    tex.customData = Object.assign(tex.customData || {}, { gdpaint: meta }); return { key, meta };
  }
  function objectImage(scene, id, v, season, size, x, y, night) {
    const o = objectKey(scene, id, v, season, size, night); if (!o) return null;
    return scene.add.image(x, y, o.key).setOrigin(o.meta.ox, o.meta.oy).setScale(1 / OBJ_K);
  }

  /* ---------- the painted ground ---------- */
  // The whole map's ground, through the shared paint kit (94-garden-paint-ground-0kit.js, docs/dev/PAINT_KIT.md): the
  // ground kinds from the layout, the paths from its routes, then what belongs to the garden itself (dug beds, owned
  // plots, the square's compass rose, flower drifts). It is a chunked layer whose sharpness follows the camera, so it
  // is crisp at every zoom, bakes a few milliseconds at a time and holds only what is near the screen.
  // info: { W, box (the whole map, world px), coast, lawn, lakes, paths, soil, owned: loops (world px), kinds (the kit's kind grid),
  //         routes: [{ id, kind, width, points px }], plaza: { centre, bounds, points }, meadow(px, py), season, sig }
  let retiring = null;   // (the ground layer being replaced: it stays up until the new one is whole on screen)
  const rebuilds = [];   // (the last few changes of the ground's key: what made it repaint)
  const loopsPath = loops => { const p = new Path2D(); for (const l of loops || []) { if (!l.length) continue; p.moveTo(l[0].x, l[0].y); for (let i = 1; i < l.length; i++) p.lineTo(l[i].x, l[i].y); p.closePath(); } return p; };
  const loopsBox = (loops, pad) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const l of loops) for (const q of l) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); } return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; };
  function ground(scene, parent, info) {
    const started = performance.now(), G = window.GardenPaintGround;
    const B = info.box, P = palette(info.season), sig = info.sig + '|' + info.season; lastInfo = info;
    K = G.levelFor(scene.cameras && scene.cameras.main ? scene.cameras.main.zoom : 1);
    const handleOf = layer => ({ layer, destroy() { layer.detach(); G.cast.detach(); } });
    G.cast.attach(scene, parent, B, info.W);   // (the shadows of standing sprites: one soft layer over every ground)
    /* (the garden was left and opened again: a new scene. The kept ground belongs to the old one, which is gone: start again, or nothing is painted) */
    if (cachedGround && cachedGround.scene !== scene) { const old = cachedGround.layer; cachedGround = null; for (const l of [old, retiring]) if (l) try { l.destroy(true); } catch (e) {} retiring = null; }
    if (cachedGround && cachedGround.sig === sig && cachedGround.layer) { cachedGround.layer.attach(parent); groundMs = Math.round(performance.now() - started); return handleOf(cachedGround.layer); }
    if (cachedGround && cachedGround.layer) {
      rebuilds.push([cachedGround.sig, sig]); if (rebuilds.length > 4) rebuilds.shift();
      if (retiring) retiring.destroy(); retiring = cachedGround.layer; retiring.retire();
    }
    cachedGround = null;
    const W = info.W, bb = [B.x, B.y, B.x + B.w, B.y + B.h], coastP = loopsPath(info.coast), lawnP = loopsPath(info.lawn), allowP = loopsPath(info.paths), season = info.season;
    const kindAt = (px, py) => { const v = info.kinds.at(Math.floor(px / W.cellW), Math.floor((py - W.sky) / W.cellH)); return v ? G.KINDS[v - 1] : null; };
    // 1. The ground itself: every kind the layout names, shore first.
    const ops = G.ground({ W, grid: info.kinds, season, coast: coastP, lawn: lawnP, box: B });
    // 2. The tide's edge: a damp band inside the coast and a thin bright lap line.
    ops.push({ bb, seed: 3, draw(Bk) { const cx = Bk.cx; cx.lineJoin = 'round'; cx.save(); cx.clip(coastP, 'evenodd'); cx.strokeStyle = P.sandWet; cx.globalAlpha = .5; cx.lineWidth = 18; cx.stroke(coastP); cx.lineWidth = 8; cx.stroke(coastP); cx.restore(); cx.globalAlpha = W.v >= 5 && window.GardenPaintVale ? .28 : .7; cx.strokeStyle = P.foam; cx.lineWidth = W.v >= 5 && window.GardenPaintVale ? 1.4 : 2.2; cx.stroke(coastP);   /* (faint where the vale paints its own broken foam lace along the shore: one stiff white rim followed every straight run of the outline: coast round 3) */ cx.globalAlpha = 1; } });
    // 3. Owned beds: tilled soil with an oak edging; an empty owned plot shows a soft dug edge (no dashes, no grid).
    if (info.soil && info.soil.length) { const soilP = loopsPath(info.soil);
      ops.push({ bb: loopsBox(info.soil, 8), seed: 5, draw(Bk, r, cb) { const cx = Bk.cx; cx.lineJoin = 'round'; cx.globalAlpha = .22; cx.strokeStyle = P.shadow; cx.lineWidth = 7; cx.stroke(soilP); cx.globalAlpha = 1; cx.strokeStyle = '#6a5034'; cx.lineWidth = 5; cx.stroke(soilP); cx.save(); cx.clip(soilP, 'evenodd'); G.paintKind(cx, 'soil', cb, season); cx.restore(); cx.globalAlpha = .8; cx.strokeStyle = '#a8845a'; cx.lineWidth = 1.4; cx.stroke(soilP); cx.globalAlpha = 1; } }); }
    if (info.owned && info.owned.length) { const ownedP = loopsPath(info.owned);
      /* (no clip: clipped to the plot it had a ruled outer edge, which showed as a pale rectangle on the lawn close up; the worn line fades both ways) */
      ops.push({ bb: loopsBox(info.owned, 16), seed: 6, draw(Bk) { const cx = Bk.cx; const k = Math.hypot(cx.getTransform().a, cx.getTransform().b) || 1; cx.save(); cx.lineJoin = 'round'; cx.strokeStyle = '#7d6a44'; cx.filter = 'blur(' + (4 * k).toFixed(1) + 'px)'; for (const [w, al] of [[9, .045], [4, .06]]) { cx.globalAlpha = al; cx.lineWidth = w; cx.stroke(ownedP); } cx.restore(); cx.filter = 'none'; cx.globalAlpha = 1; } }); }
    // 4. Inland water under the painted water: a damp bank, the water, its shallow rim and lap line (the v5 river runs on
    //    past the coast for the water mechanics, so its banks are cut at the land's edge).
    if (info.lakes && info.lakes.length) { const lakeP = loopsPath(info.lakes);
      ops.push({ bb: loopsBox(info.lakes, 24), seed: 7, draw(Bk) { const cx = Bk.cx; cx.save(); if (W.v >= 5) cx.clip(coastP, 'evenodd'); cx.lineJoin = 'round'; cx.globalAlpha = .9; cx.strokeStyle = P.sandWet; cx.lineWidth = 14; cx.stroke(lakeP); cx.globalAlpha = 1; cx.fillStyle = P.water; cx.fill(lakeP, 'evenodd'); cx.save(); cx.clip(lakeP, 'evenodd'); cx.strokeStyle = P.shallow; cx.globalAlpha = .5; cx.lineWidth = 40; cx.stroke(lakeP); cx.globalAlpha = .6; cx.lineWidth = 18; cx.stroke(lakeP); cx.restore(); cx.globalAlpha = .7; cx.strokeStyle = P.foam; cx.lineWidth = 2; cx.stroke(lakeP); cx.restore(); cx.globalAlpha = 1; } }); }
    // 5. Paths: the kit's roads, lanes, trails, boardwalks and steps along the layout's routes; then the square's setts.
    for (const o of G.paths({ routes: info.routes, areas: (info.areas || []).concat(info.plaza ? [{ kind: 'setts', points: info.plaza.points }] : []), season, allow: allowP, within: W.v >= 5 ? lawnP : null, kindAt, box: B })) ops.push(o);
    if (info.plaza) {
      const pz = info.plaza, ccx = pz.centre.x, ccy = pz.centre.y;
      // the compass rose inlaid in the square, worn by feet: a ring of dark stone, a pale field, the points in honey stone
      ops.push({ bb: [ccx - 52, ccy - 32, ccx + 52, ccy + 32], seed: 8, draw(Bk) { const cx = Bk.cx;
        cx.globalAlpha = .3; cx.fillStyle = '#4e4230'; cx.beginPath(); cx.ellipse(ccx + 1, ccy + 1.6, 47, 26, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
        cx.fillStyle = '#8f7a58'; cx.beginPath(); cx.ellipse(ccx, ccy, 46, 25.3, 0, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = '#e4d4ae'; cx.beginPath(); cx.ellipse(ccx, ccy, 42.5, 23.2, 0, 0, Math.PI * 2); cx.fill();
        cx.strokeStyle = '#b49c72'; cx.lineWidth = 1.2; cx.globalAlpha = .7; cx.beginPath(); cx.ellipse(ccx, ccy, 29, 16, 0, 0, Math.PI * 2); cx.stroke(); cx.globalAlpha = 1;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, l = i % 2 ? 15 : 26; for (const [side, col] of [[1, '#a8875a'], [-1, '#c8a878']]) { cx.fillStyle = col; cx.beginPath(); cx.moveTo(ccx + Math.cos(a) * l, ccy + Math.sin(a) * l * .55); cx.lineTo(ccx + Math.cos(a + side * 1.25) * 4.4, ccy + Math.sin(a + side * 1.25) * 2.4); cx.lineTo(ccx, ccy); cx.fill(); } }
        cx.fillStyle = '#6e5a3e'; cx.beginPath(); cx.arc(ccx, ccy, 2, 0, Math.PI * 2); cx.fill();
        cx.globalAlpha = .22; cx.fillStyle = '#fff8e6'; cx.beginPath(); cx.ellipse(ccx - 8, ccy - 4, 22, 9, -.2, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1; } });
    }
    // 5b. The village's shaped plazas (village round 3, kept in the round 3 integration): the square, the flagged walk round
    //     the green and the road up to the terrace laid as one paving of setts in fans (fanSetts), the square framed in setts on
    //     edge, the compass rose inlaid, weather and weeds in the joints, turf over the kerb, and the Lakeside terrace's coping,
    //     mooring rings, planters and lanterns. One op a plaza, painted chunk by chunk like the rest of the ground (the kit
    //     leaves these routes and areas to it: 94-garden-native-world.js villagePaved).
    for (const pzz of info.plazas || []) { const b0 = pzz.bounds;
      ops.push({ bb: [b0.x - 40, b0.y - 40, b0.x + b0.w + 40, b0.y + b0.h + 50], seed: 81, draw(Bk, r0, cb) {
        const cx = Bk.cx, pz = pzz, r = rng(4271), K = Math.hypot(cx.getTransform().a, cx.getTransform().b) || 1;
        const loop = (pts) => { cx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i].x, pts[i].y); cx.closePath(); };
        const ribbon = (rt, grow, scale, dx, dy) => { const P = rt.points, H = rt.half, p = new Path2D(), ox = dx || 0, oy = dy || 0, k = scale == null ? 1 : scale, h = i => Math.max(.6, H[i] * k + grow / 2);
          for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 1e-6) continue; const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L, ha = h(i - 1), hb = h(i);
            let q = [[a.x + nx * ha, a.y + ny * ha], [b.x + nx * hb, b.y + ny * hb], [b.x - nx * hb, b.y - ny * hb], [a.x - nx * ha, a.y - ny * ha]]; let area = 0; for (let j = 0; j < 4; j++) { const u = q[j], v = q[(j + 1) % 4]; area += u[0] * v[1] - v[0] * u[1]; } if (area < 0) q = q.reverse();
            p.moveTo(q[0][0] + ox, q[0][1] + oy); for (let j = 1; j < 4; j++) p.lineTo(q[j][0] + ox, q[j][1] + oy); p.closePath(); }
          for (let i = 0; i < P.length; i += 1) { p.moveTo(P[i].x + ox + h(i), P[i].y + oy); p.arc(P[i].x + ox, P[i].y + oy, h(i), 0, Math.PI * 2); p.closePath(); }
          return p; };
        cx.save(); try {
          const b = pz.bounds, rose = pz.rose, ccx = rose ? rose.x : pz.centre.x, ccy = rose ? rose.y : pz.centre.y;
          // The paved shape: the plaza's outline and, with it, the flagged walks that are part of it (2.74), as one path
          // (every piece wound the same way and filled once, so the pieces never show where they overlap).
          const U = new Path2D(), ribs = pz.ribbons || [];
          { let q = pz.points, area = 0; for (let i = 0; i < q.length; i++) { const u = q[i], v = q[(i + 1) % q.length]; area += u.x * v.y - v.x * u.y; } if (area < 0) q = q.slice().reverse(); U.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) U.lineTo(q[i].x, q[i].y); U.closePath(); }
          for (const rt of ribs) U.addPath(ribbon(rt, 0));
          for (let q of pz.extra || []) { let area = 0; for (let i = 0; i < q.length; i++) { const u = q[i], v = q[(i + 1) % q.length]; area += u.x * v.y - v.x * u.y; } if (area < 0) q = q.slice().reverse(); U.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) U.lineTo(q[i].x, q[i].y); U.closePath(); }   // (the terrace's crescent, fix round 1)
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
          // the paved shape as a small mask, drawn once and read for every stone and every blade at the rim (asking the canvas
          // whether each point lies in the path took about two seconds whenever the village ground was painted again, at a level-up)
          const MK = .5, mkw = Math.ceil((b.w + 48) * MK), mkh = Math.ceil((b.h + 48) * MK), mk = document.createElement('canvas'); mk.width = mkw; mk.height = mkh;
          const mkx = mk.getContext('2d', { willReadFrequently: true }); mkx.setTransform(MK, 0, 0, MK, -(b.x - 24) * MK, -(b.y - 24) * MK); mkx.fill(U, 'nonzero');
          const mkd = mkx.getImageData(0, 0, mkw, mkh).data, inU = (x, y) => { const i = Math.floor((x - b.x + 24) * MK), k = Math.floor((y - b.y + 24) * MK); return i >= 0 && k >= 0 && i < mkw && k < mkh && mkd[(k * mkw + i) * 4 + 3] > 127; };
          cx.save(); cx.fillStyle = '#ae9c78'; cx.fill(U, 'nonzero'); cx.clip(U, 'nonzero');
          const inRose = (x, y) => !!rose && Math.hypot((x - ccx) / 46, (y - ccy) / 25.3) < 1;
          // (fix round 2: the setts laid in fans, see fanSetts; in rows they ran straight across the curved streets and read as a
          // brick wallpaper. One lattice and one seed for the square, the walks, the high street and the quay: no seam between them)
          const dOf = (x, y) => ribs.length ? (Math.hypot((x - ccx) / 150, (y - ccy) / 70) < 1 ? .3 : inU(x, y - 5) && inU(x, y + 5) && inU(x - 7, y) && inU(x + 7, y) ? .62 : 1) : Math.hypot((x - pz.centre.x) / (b.w / 2), (y - pz.centre.y) / (b.h / 2));
          fanSetts(cx, [Math.max(b.x - 6, cb[0] - 12), Math.max(b.y - 6, cb[1] - 12), Math.min(b.x + b.w + 6, cb[2] + 12), Math.min(b.y + b.h + 6, cb[3] + 12)], { P, salt: 23, skip: (x, y) => inRose(x, y) || ribs.length > 0 && !inU(x, y) && !inU(x, y - 4) && !inU(x, y + 4) && !inU(x - 5, y) && !inU(x + 5, y),
            wear: (x, y) => dOf(x, y) < .55 ? .45 : 0, rim: (x, y) => { const d = dOf(x, y); return d > .7 ? (d - .6) * 1.2 : 0; } });
          // (fix round 2) the square itself is a place of its own: its stone paler and worn smooth, framed by a band of
          // darker setts on edge, while the walks round the green and the streets that leave it are in the fans
          if (rose && ribs.length && pz.points && pz.points.length > 2) {
            const sq = new Path2D(); sq.moveTo(pz.points[0].x, pz.points[0].y); for (const q of pz.points) sq.lineTo(q.x, q.y); sq.closePath();
            cx.save(); cx.clip(sq); const xs = pz.points.map(q => q.x), ys = pz.points.map(q => q.y), X0 = Math.min(...xs) - 4, X1 = Math.max(...xs) + 4, Y0 = Math.min(...ys) - 4, Y1 = Math.max(...ys) + 4;
            // (in the same fans as the streets, not in flags: flags in courses read as a brick wall again; the square is told by its
            // frame of setts on edge and by its stone, paler and worn smooth by the market and the feet that cross it)
            cx.globalAlpha = .16; cx.fillStyle = '#f6ecd2'; cx.fillRect(X0, Y0, X1 - X0, Y1 - Y0); const fr = rng(6131);
            for (let k = 0; k < 10; k++) { const x = X0 + fr() * (X1 - X0), y = Y0 + fr() * (Y1 - Y0); cx.globalAlpha = .07 + fr() * .05; cx.fillStyle = fr() < .6 ? '#f4e8c8' : '#6a5a40'; cx.beginPath(); cx.ellipse(x, y, 30 + fr() * 40, 10 + fr() * 12, 0, 0, 7); cx.fill(); }
            cx.restore();
            // the band of setts on edge round it, a hand wide, darker and worn
            cx.save(); cx.lineJoin = 'round'; cx.globalAlpha = .9; cx.strokeStyle = '#9c8a6a'; cx.lineWidth = 5; cx.stroke(sq); cx.strokeStyle = '#b8a582'; cx.setLineDash([3.4, 1.3]); cx.lineWidth = 3.6; cx.stroke(sq); cx.setLineDash([]); cx.restore();
            cx.globalAlpha = 1;
          }
          // (village fix round 3) the paving lived in: broad patches of damp and of sun-bleached stone, a shallow puddle or two
          // holding the sky, weeds in the cracks, a drain, and in autumn leaves blown against the kerb (one even pattern read
          // as wallpaper or as sand from the walking camera)
          { const pr = rng(7717 + Math.round(b.x * 3 + b.y)), n = Math.max(4, Math.min(44, Math.round(b.w * b.h / 8000))), season = info.season || 'summer';
            for (let k = 0; k < n; k++) { const x = b.x + pr() * b.w, y = b.y + pr() * b.h; if (!inU(x, y)) continue; cx.globalAlpha = .09 + pr() * .1; cx.fillStyle = pr() < .45 ? '#5a4c34' : '#f6ecd0'; cx.beginPath(); cx.ellipse(x, y, 22 + pr() * 46, 8 + pr() * 15, (pr() - .5) * .6, 0, 7); cx.fill(); }
            for (let k = 0; k < Math.max(2, Math.round(n / 6)); k++) { const x = b.x + pr() * b.w, y = b.y + pr() * b.h, w = 8 + pr() * 12; if (!inU(x - w - 4, y) || !inU(x + w + 4, y) || !inU(x, y - 6) || !inU(x, y + 6) || inRose(x, y)) continue;
              cx.globalAlpha = .45; cx.fillStyle = '#6a7470'; cx.beginPath(); cx.ellipse(x, y, w, w * .36, 0, 0, 7); cx.fill(); cx.globalAlpha = .6; cx.fillStyle = '#b4c8d0'; cx.beginPath(); cx.ellipse(x - w * .08, y - w * .04, w * .84, w * .26, 0, 0, 7); cx.fill(); cx.globalAlpha = .75; cx.fillStyle = '#f2f8f6'; cx.beginPath(); cx.ellipse(x - w * .34, y - w * .1, w * .24, w * .05, 0, 0, 7); cx.fill(); }
            cx.globalAlpha = .9; cx.lineWidth = .9;
            for (let k = 0; k < n * 4; k++) { const x = b.x + pr() * b.w, y = b.y + pr() * b.h; if (!inU(x, y) || inRose(x, y)) continue; cx.strokeStyle = pr() < .5 ? '#66763a' : '#7e8a46'; cx.beginPath(); for (let j = 0; j < 3; j++) { cx.moveTo(x + j * 1.3 - 1.3, y); cx.lineTo(x + (j - 1) * 1.8 + (pr() - .5) * 1.6, y - 2.4 - pr() * 2.6); } cx.stroke(); }
            for (let k = 0; k < Math.max(1, Math.round(n / 14)); k++) { const x = b.x + pr() * b.w, y = b.y + pr() * b.h; if (!inU(x - 9, y) || !inU(x + 9, y) || inRose(x, y)) continue; cx.globalAlpha = 1; cx.fillStyle = '#5a5650'; cx.fillRect(x - 7, y - 3, 14, 6); cx.fillStyle = '#2e2c28'; for (let j = 0; j < 5; j++) cx.fillRect(x - 5.6 + j * 2.4, y - 2, 1.2, 4); cx.fillStyle = '#8a8478'; cx.fillRect(x - 7, y - 3, 14, .9); }
            if (season === 'autumn') for (let k = 0; k < n * 6; k++) { const x = b.x + pr() * b.w, y = b.y + pr() * b.h; if (!inU(x, y) || (inU(x, y + 9) && inU(x, y - 9) && inU(x + 12, y) && inU(x - 12, y) && pr() < .85)) continue; cx.globalAlpha = .9; cx.fillStyle = ['#c8702a', '#d8a040', '#a8501c', '#b8863a'][Math.floor(pr() * 4)]; cx.beginPath(); cx.ellipse(x, y, 1.8 + pr(), 1 + pr() * .5, pr() * 3, 0, 7); cx.fill(); }
          }
          cx.globalAlpha = 1;
          // the rose: an inlaid ring of dark stone, a pale field, the points in honey stone, softened by wear
          if (rose) {
          // (fix round 2: laid in stone, not a printed disc: a ring of separate dark kerb stones round it, its field in pale
          // stones cut to the circle with their joints showing, the points in honey stone, all worn by feet)
          cx.fillStyle = '#a08a66'; cx.beginPath(); cx.ellipse(ccx, ccy, 46, 25.3, 0, 0, Math.PI * 2); cx.fill();
          for (let i = 0; i < 28; i++) { const a0 = i / 28 * Math.PI * 2 + .02, a1 = (i + 1) / 28 * Math.PI * 2 - .02, t = (i * 37 % 11) / 11; cx.fillStyle = t < .4 ? '#94805e' : t < .75 ? '#a48e6a' : '#8a7656'; cx.beginPath(); cx.ellipse(ccx, ccy, 45.4, 24.9, 0, a0, a1); cx.ellipse(ccx, ccy, 42.2, 23, 0, a1, a0, true); cx.closePath(); cx.fill(); }
          cx.fillStyle = '#dccba6'; cx.beginPath(); cx.ellipse(ccx, ccy, 42.2, 23, 0, 0, Math.PI * 2); cx.fill();
          cx.save(); cx.beginPath(); cx.ellipse(ccx, ccy, 42.2, 23, 0, 0, Math.PI * 2); cx.clip(); cx.strokeStyle = '#b8a37e'; cx.lineWidth = .8; cx.globalAlpha = .6;
          for (let k = -40; k <= 40; k += 8.5) { cx.beginPath(); cx.moveTo(ccx + k, ccy - 24); cx.lineTo(ccx + k + 3, ccy + 24); cx.stroke(); }
          for (let k = -20; k <= 20; k += 6.2) { cx.beginPath(); cx.moveTo(ccx - 44, ccy + k); cx.lineTo(ccx + 44, ccy + k + 1.5); cx.stroke(); }
          cx.restore(); cx.globalAlpha = 1;
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
            const edge = [];
            for (const q of [pz.points].concat(pz.extra || [])) for (let i = 0; i < q.length; i++) { const a = q[i], c = q[(i + 1) % q.length], L = Math.hypot(c.x - a.x, c.y - a.y); for (let t = 0; t < L; t += 2.6) edge.push([a.x + (c.x - a.x) * t / L, a.y + (c.y - a.y) * t / L]); }
            for (const rt of ribs) for (let i = 1; i < rt.points.length; i++) { const a = rt.points[i - 1], c = rt.points[i], L = Math.hypot(c.x - a.x, c.y - a.y) || 1, nx = -(c.y - a.y) / L, ny = (c.x - a.x) / L; for (let t = 0; t < L; t += 2.6) for (const sd of [-1, 1]) { const h = (rt.half[i - 1] + (rt.half[i] - rt.half[i - 1]) * t / L) * sd; edge.push([a.x + (c.x - a.x) * t / L + nx * h, a.y + (c.y - a.y) * t / L + ny * h]); } }
            cx.lineCap = 'round';
            for (const [ex, ey] of edge) {
              if (r() < .4) continue; const x = ex + (r() - .5) * 2, y = ey + (r() - .5) * 2;
              // on the rim: some ground just beside it is off the paving
              let ox = 0, oy = 0, out = 0; for (const [dx, dy] of [[3.5, 0], [-3.5, 0], [0, 3.5], [0, -3.5]]) if (!inU(x + dx, y + dy)) { ox += dx; oy += dy; out++; } if (!out || out === 4) continue;
              const bx = x + ox / out * .9, by = y + oy / out * .9 + 1.5, hh = 2.5 + r() * 4.5;
              cx.globalAlpha = .8; cx.strokeStyle = r() < .5 ? P.lawnLo : '#6f8a40'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(bx, by + 2); cx.quadraticCurveTo(bx + (r() - .5) * 2, by - hh * .4, bx + (r() - .5) * 4, by - hh); cx.stroke();
            }
            // (village fix round 3) the lakeside terrace dressed as a place to sit by the water: along its shore edge a coping
            // of dressed stone with iron mooring rings, and on the terrace half-barrel planters spilling flowers and short lantern
            // posts (it was an empty pad of paving with one stall on it)
            for (const q of pz.extra || []) {
              const tr = rng(4409), n = q.length, north = [];
              for (let i = 0; i < n; i++) { const a = q[i], c = q[(i + 1) % n], L = Math.hypot(c.x - a.x, c.y - a.y) || 1; if ((c.x - a.x) / L < .35) continue; for (let t = 0; t < L; t += 3) north.push({ x: a.x + (c.x - a.x) * t / L, y: a.y + (c.y - a.y) * t / L, tx: (c.x - a.x) / L, ty: (c.y - a.y) / L }); }
              // the coping: blocks along the edge facing the water (the upper run of the crescent, drawn left to right)
              let k = 0; for (const p of north) { if (k++ % 3) continue; const len = 8.6;
                cx.globalAlpha = .35; cx.strokeStyle = '#3e3626'; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(p.x + .5, p.y + 1.6); cx.lineTo(p.x + p.tx * len + .5, p.y + p.ty * len + 1.6); cx.stroke();
                cx.globalAlpha = 1; cx.strokeStyle = tr() < .5 ? '#bcae90' : '#aea082'; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x + p.tx * len - .8, p.y + p.ty * len); cx.stroke();
                cx.globalAlpha = .7; cx.strokeStyle = '#e8dcbc'; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(p.x, p.y - 1.8); cx.lineTo(p.x + p.tx * len - .8, p.y + p.ty * len - 1.8); cx.stroke(); }
              for (let i = 6; i < north.length - 4; i += 17) { const p = north[i]; cx.globalAlpha = 1; cx.strokeStyle = '#3a3a38'; cx.lineWidth = 1.3; cx.beginPath(); cx.ellipse(p.x, p.y - 4.4, 2.6, 2, 0, 0, 7); cx.stroke(); cx.fillStyle = '#4a4a46'; cx.fillRect(p.x - 1.2, p.y - 2.4, 2.4, 1.6); }
              // planters and lantern posts, a little in from the water's edge, spaced along it
              const inner = north.filter((p, i) => i % 23 === 7);
              inner.forEach((p, i) => { const x = p.x + 2 - p.ty * 0, y = p.y + 16;
                if (!inU(x, y) || !inU(x - 10, y) || !inU(x + 10, y)) return;
                if (i % 2 === 0) {   // a half-barrel planter
                  cx.globalAlpha = .28; cx.fillStyle = '#2a2418'; cx.beginPath(); cx.ellipse(x + 2, y + 1.5, 10, 3, 0, 0, 7); cx.fill(); cx.globalAlpha = 1;
                  cx.fillStyle = '#7a5434'; cx.fillRect(x - 8, y - 9, 16, 9); cx.fillStyle = '#5e3e24'; cx.fillRect(x - 8, y - 9, 16, 1.6); cx.fillRect(x - 8, y - 3, 16, 1.4); cx.fillStyle = '#9a7048'; cx.fillRect(x - 7, y - 8, 2.4, 7);
                  const fl = ['#e8553a', '#f4f0e0', '#f0c84a', '#c86aa0']; for (let j = 0; j < 9; j++) { cx.fillStyle = j < 5 ? '#4e7a34' : '#6a9a44'; cx.beginPath(); cx.ellipse(x - 7 + tr() * 14, y - 10 - tr() * 5, 3, 2.2, 0, 0, 7); cx.fill(); }
                  for (let j = 0; j < 7; j++) { cx.fillStyle = fl[Math.floor(tr() * fl.length)]; cx.beginPath(); cx.arc(x - 7 + tr() * 14, y - 11 - tr() * 6, 1.4, 0, 7); cx.fill(); }
                } else {   // a short lantern post
                  cx.globalAlpha = .28; cx.fillStyle = '#2a2418'; cx.beginPath(); cx.ellipse(x + 2, y + 1, 5, 1.8, 0, 0, 7); cx.fill(); cx.globalAlpha = 1;
                  cx.fillStyle = '#34322e'; cx.fillRect(x - 1.3, y - 22, 2.6, 22); cx.fillRect(x - 3, y - 1.6, 6, 1.6); cx.fillStyle = '#2a2826'; cx.fillRect(x - 3.6, y - 30, 7.2, 8); cx.fillStyle = '#f4dc9a'; cx.fillRect(x - 2.4, y - 28.6, 4.8, 5.4); cx.fillStyle = '#2a2826'; cx.beginPath(); cx.moveTo(x - 4.4, y - 30); cx.lineTo(x, y - 33.6); cx.lineTo(x + 4.4, y - 30); cx.fill();
                } });
              cx.globalAlpha = 1;
            }
            cx.globalAlpha = 1; cx.restore(); return;
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
        } finally { cx.restore(); } } });
    }
    // 6. Flower drifts and low growth on lawn and meadow: library plants stamped flat, in clumps (never one a tile).
    const stamps = [['plant.wildflowers', 0], ['plant.daisies', 1], ['plant.wildflowers', 2], ['plant.daisies', 0], ['plant.grass', 1], ['plant.wildflowers', 3]], stampC = new Map();
    const stampOf = kind => { const key = kind.join(':'); let st = stampC.get(key); if (st === undefined) { st = ok(() => objectCanvas(kind[0], kind[1], season, { h: kind[0] === 'plant.grass' ? 24 : 20 })); stampC.set(key, st); } return st; };
    ops.push({ bb, seed: 9, draw(Bk, r0, cb) { const cx = Bk.cx; G.tiles(cb, 96, 46, 301, (tx, ty, r) => { for (let g = 0; g < 2; g++) { const gx = tx + r() * 96, gy = ty + r() * 96, kind = stamps[Math.floor(r() * stamps.length)], count = 4 + Math.floor(r() * 7), go = r() > .25, k0 = kindAt(gx, gy); for (let i = 0; i < count; i++) { const x = gx + (r() - .5) * 70, y = gy + (r() - .5) * 34, sc = (.7 + r() * .5) / (OBJ_K * 2); if (!go || k0 !== 'lawn' && k0 !== 'meadow' || !info.meadow(x, y)) continue; const st = stampOf(kind); if (st) cx.drawImage(st.c, x - st.ox * sc, y - st.oy * sc, st.c.width * sc, st.c.height * sc); } } }); } });
    // lazy: nothing bakes in this task (the planting and the props' shadows are added to it straight after, and the world's
    // opening waits for what is on screen: pendingInView)
    const layer = G.layer(scene, parent, ops, { key: TEX + '-g' + (++groundSerial), box: B, chunk: 256, depth: -9600, budgetMB: 64, prebake: true, slice: 8, lazy: true });
    cachedGround = { sig, box: B, layer, scene }; groundMs = Math.round(performance.now() - started);
    if (retiring) { const old = retiring, t0 = performance.now(), wait = () => { if (retiring !== old) return; if (cachedGround && cachedGround.layer === layer && layer.softInView() > 0 && performance.now() - t0 < 9000) return void setTimeout(wait, 250); old.destroy(); retiring = null; }; setTimeout(wait, 250); }
    return handleOf(layer);
  }

  /* ---------- the village buildings ---------- */
  // Library buildings, each its own kind, sized to the old footprint so doors,
  // aprons, picking and depth stay where they were.
  const BUILD = {
    'garden-shop': { obj: 'building.green-cottage', v: 0, w: 200, wallWidth: 150, door: '#2f5a3a', sign: 'Seed & Stem', shop: [0x3e7a4a, 0xf2ead2], extra: [['plant.planter', 1, -110, 0, 28], ['plant.planter', 0, 110, 0, 28], ['plant.rph-flower-tub', 1, -80, 8, 20]] },   // (four cells: a shop stands larger than the cottages)
    // (the Land Office and Tackle & Tide four cells wide, round 3: shops stand larger than the cottages)
    'land-office': { obj: 'building.cottage', v: 1, w: 190, wallWidth: 160, door: '#5a3a2a', sign: 'Land Office', extra: [['street.lamp', 0, -102, 4, 0, Math.round(gardenSizePx('lamp') / .61)]] },   // (the lamp on the door's side of the west corner: the lake walk passes just outside it)
    'tackle-shop': { obj: 'building.fpv-sailing-hut', v: 0, w: 200, wallWidth: 376, wallCenterX: -8, wallFootY: 14, clickTop: .3, sign: 'Tackle & Tide', extra: [['street.mqn-lifebuoy', 0, 104, 2, 0, 32]] },
    'market-stall': { obj: 'structure.mcr-market-chalet', v: 1, w: 104, wallWidth: 200 },
    // the high street's cottages (2.74), each its own kind so the street is not one house four times. Three cells wide, so
    // the ridge stands about 3.5 times the player's height (common size standard); the low thatched kind would stay under 2.5.
    'ld-cottage-1': { obj: 'building.thatched-cottage', v: 1, w: 160, wallWidth: 216, door: '#2f5a44', extra: [['plant.rph-flower-tub', 1, -62, 6, 20]] },
    'ld-cottage-2': { obj: 'building.cottage', v: 0, w: 150, wallWidth: 160, door: '#2a3e66', extra: [['plant.planter', 1, 64, 0, 24]] },
    'ld-cottage-3': { obj: 'building.cottage', v: 1, w: 150, wallWidth: 160, door: '#7a2e2a', extra: [['plant.planter', 0, 64, 0, 24]] },
    // (round 3 layouts) Quince's whitewashed cottage on the cider square in the High orchard, its honey-coloured door facing the square
    'ld-quince-house': { obj: 'building.cottage', v: 0, w: 150, wallWidth: 150, door: '#c8962e', extra: [['plant.rph-flower-tub', 0, -64, 6, 20]] },   // (fix round 1: the stone cottage of the high street drawn as wide as its three cells, so its eaves stand near 1.8 H and its ridge about 3.4 H; the low thatched kind stood at 2.5)
    'ld-cottage-4': { obj: 'building.green-cottage', v: 2, w: 150, wallWidth: 150, door: '#2e4a6a', porch: 1, extra: [['plant.rph-flower-tub', 0, -62, 6, 20], ['street.mqn-lifebuoy', 0, 60, 2, 0, 22]] },
  };
  const HALL = [
    // (four cells wide from round 3: the hall stands larger than the cottages; w is its shadow's width)
    // (village fix round 1: the anglers' first meeting place is a striped-awning stall on the terrace's end, timber and
    // canvas in the village's colours, not a dark green dome tent that read as a featureless blob; round 3: drawn across
    // its whole four cells, the width its block takes, where it stood a cell narrower than the ground it stops you on)
    // (vale final fix 1: the striped market hut read as a placeholder box with a blank front; the hall is a real building
    // from the first day, the small plastered hall with its slate roof, and grows into the large one)
    { obj: 'building.vale-hall-small', v: 0, w: 192, wallWidth: 160, sign: 'Lake Hall' },
    { obj: 'building.vale-hall-small', v: 0, w: 192, wallWidth: 160, sign: 'Lake Hall', extra: [['street.mqn-lifebuoy', 0, 92, 2, 0, 24]] },
    { obj: 'building.vale-hall-large', v: 0, w: 192, wallWidth: 240, sign: 'Lake Hall' },
    { obj: 'building.vale-hall-large', v: 0, w: 192, wallWidth: 240, sign: 'Lake Hall' },
    { obj: 'building.vale-hall-large', v: 1, w: 192, wallWidth: 240, sign: 'Lake Hall' },
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
    const lampLights = [];   /* (a street lamp standing by a building is lit at dusk and night like any other: no dark lamp beside a lit one) */
    // (village fix round 2) the front door at the size standard, a quarter as tall again as the player will be (1.25 H): the
    // houses' own doors came to about two thirds of the player's height. A panelled door with a fanlight in a stone
    // surround, a stone step and a little gabled hood, painted over the picture's own door, which it covers
    if (def.door) {
      const H = 40, dh = H * 1.25, dw = dh * .46, x = cx - (def.wallCenterX || 0) * scale + (def.doorDx || 0), by = foot - (def.wallFootY || 0) * scale - 1;
      const g = scene.add.graphics(), col = Phaser.Display.Color.HexStringToColor(def.door).color, dark = Phaser.Display.Color.HexStringToColor(def.door).darken(25).color;
      g.fillStyle(0x2a2418, .25).fillRect(x - dw / 2 - 3, by - dh - 1, dw + 7, dh + 2);
      g.fillStyle(0xe6dcc6).fillRect(x - dw / 2 - 3.2, by - dh - 2.6, dw + 6.4, dh + 2.6).fillStyle(0xc8bca4).fillRect(x + dw / 2 + 1.4, by - dh - 2.6, 1.8, dh + 2.6);
      g.fillStyle(0x3a3a3a).fillRect(x - dw / 2, by - dh, dw, dh);
      g.fillStyle(0xbcd4dc).fillRect(x - dw / 2 + 1, by - dh + 1, dw - 2, dh * .16).fillStyle(0xe6dcc6).fillRect(x - .6, by - dh + 1, 1.2, dh * .16);
      g.fillStyle(col).fillRect(x - dw / 2 + .8, by - dh * .82, dw - 1.6, dh * .82 - .2);
      for (const [px, py, pw, ph] of [[-.38, -.76, .32, .3], [.06, -.76, .32, .3], [-.38, -.38, .32, .3], [.06, -.38, .32, .3]]) g.fillStyle(dark).fillRect(x + px * dw, by + py * dh, pw * dw, ph * dh).fillStyle(0xffffff, .12).fillRect(x + px * dw, by + py * dh, pw * dw, 1);
      g.fillStyle(0xd8b24a).fillCircle(x + dw * .3, by - dh * .42, 1.3).fillRect(x - dw * .14, by - dh * .5, dw * .28, 1.4);
      g.fillStyle(0xc8bca4).fillRect(x - dw / 2 - 5, by - 1.5, dw + 10, 3.4).fillStyle(0xe0d6c0).fillRect(x - dw / 2 - 5, by - 1.5, dw + 10, 1);
      g.fillStyle(0x4a3c32).fillTriangle(x - dw / 2 - 6, by - dh - 2.6, x + dw / 2 + 6, by - dh - 2.6, x, by - dh - 12).fillStyle(0x6a5646).fillTriangle(x - dw / 2 - 4, by - dh - 3.4, x, by - dh - 3.4, x, by - dh - 10.6);
      node._inner.add(g);
    }
    // (village fix round 3) a shop is told from the houses by its front: a striped awning over the ground floor with a
    // scalloped valance, a bench of seed trays and potted seedlings under the window and a chalkboard by the door; the
    // harbour master's house has a white-painted porch over its door and a lifebuoy by it
    if (def.shop) {
      const g = scene.add.graphics(), x = cx - (def.wallCenterX || 0) * scale, by = foot - (def.wallFootY || 0) * scale - 1, half = prop.w * W.cellW / 2 - 10, top = by - 66, bot = by - 50, n = 14, sw = half * 2 / n, bw = (half * 2 + 12) / n;
      g.fillStyle(0x2a2418, .22).fillRect(x - half - 2, bot, half * 2 + 4, 7);
      for (let i = 0; i < n; i++) g.fillStyle(i % 2 ? def.shop[1] : def.shop[0]).fillPoints([{ x: x - half + i * sw, y: top }, { x: x - half + (i + 1) * sw, y: top }, { x: x - half - 6 + (i + 1) * bw, y: bot }, { x: x - half - 6 + i * bw, y: bot }], true);
      for (let i = 0; i < n; i++) g.fillStyle(i % 2 ? def.shop[1] : def.shop[0]).fillCircle(x - half - 6 + (i + .5) * bw, bot, bw / 2);
      g.fillStyle(0xffffff, .16).fillRect(x - half, top, half * 2, 3).fillStyle(0x3a2e22).fillRect(x - half - 2, top - 2, half * 2 + 4, 2.4);
      for (const ex of [x - half - 2, x + half + 2]) g.fillStyle(0x3a2e22).fillRect(ex - 1, top - 2, 2, 18);
      // the seed bench under the left window
      const sx = x - half * .58; g.fillStyle(0x2a2418, .25).fillEllipse(sx + 2, by + 1.5, 46, 5).fillStyle(0x6e5236).fillRect(sx - 21, by - 12, 42, 3.4).fillRect(sx - 19, by - 9, 2.6, 9).fillRect(sx + 16.4, by - 9, 2.6, 9);
      for (let k = 0; k < 4; k++) { const px = sx - 16 + k * 10.5; g.fillStyle(0x9a5a3a).fillRect(px - 3.6, by - 19, 7.2, 6.4).fillStyle(0xb06a44).fillRect(px - 4.2, by - 19.6, 8.4, 1.8).fillStyle(k % 2 ? 0x5e8a3a : 0x7aa04a).fillCircle(px - 1.4, by - 21.6, 2.6).fillCircle(px + 1.6, by - 22.4, 2.4).fillStyle(k === 1 ? 0xe8b830 : k === 3 ? 0xd85a6a : 0x6e9a40).fillCircle(px, by - 24, 1.5); }
      // a chalkboard on an easel by the door
      const bx = x + half * .62; g.fillStyle(0x2a2418, .25).fillEllipse(bx + 2, by + 1, 18, 3.4).fillStyle(0x6e5236).fillPoints([{ x: bx - 8, y: by }, { x: bx - 2, y: by - 26 }, { x: bx + 2, y: by - 26 }, { x: bx + 8, y: by }], false).fillStyle(0x2e3a34).fillRect(bx - 7, by - 24, 14, 16).fillStyle(0xf0ead8, .85).fillRect(bx - 4.5, by - 21, 9, 1.2).fillRect(bx - 4.5, by - 17.6, 6, 1.2).fillRect(bx - 4.5, by - 14.2, 7.6, 1.2);
      node._inner.add(g);
    }
    if (def.porch && def.door) {
      const g = scene.add.graphics(), x = cx - (def.wallCenterX || 0) * scale + (def.doorDx || 0), by = foot - (def.wallFootY || 0) * scale - 1, pw = 34, ph = 62;
      g.fillStyle(0x2a2418, .2).fillRect(x - pw / 2 + 3, by - ph + 12, pw, ph - 12);
      for (const px of [x - pw / 2, x + pw / 2 - 3.4]) g.fillStyle(0xf2efe6).fillRect(px, by - ph + 10, 3.4, ph - 10).fillStyle(0xcfc8b8).fillRect(px + 2.4, by - ph + 10, 1, ph - 10);
      g.fillStyle(0xf2efe6).fillTriangle(x - pw / 2 - 4, by - ph + 11, x + pw / 2 + 4, by - ph + 11, x, by - ph - 4).fillStyle(0x5a6470).fillTriangle(x - pw / 2 - 6, by - ph + 9, x + pw / 2 + 6, by - ph + 9, x, by - ph - 7).fillStyle(0xf2efe6).fillTriangle(x - pw / 2 + 1, by - ph + 9, x + pw / 2 - 1, by - ph + 9, x, by - ph - 2);
      g.fillStyle(0xd8b24a).fillCircle(x, by - ph + 3, 2.2);
      node._inner.add(g);
    }
    for (const [id, v, dx, dy, w, h] of def.extra || []) { if (!sceneObj(id)) continue; const im = objectImage(scene, id, v, season, w ? { w } : { h }, cx + dx, foot + dy, night); if (im) { node._inner.addAt(im, dy > 0 ? node._inner.list.length : 1); parts.push([im, id, v, w ? { w } : { h }]); if (id === 'street.lamp') lampLights.push({ x: cx + dx, y: foot + dy - im.displayHeight * im.originY + 14, radius: 120, pool: true }); } }
    if (def.sign) {
      // (village fix round 1: a painted timber signboard on two oak posts standing in the ground in front of the house, with
      // their shadows, not a pale label lying at its foot)
      const g = scene.add.graphics(), sy = foot + 10, tw = Math.max(54, def.sign.length * 6.4) / 2, px = tw * .78, sx = cx + Math.max(0, prop.w * W.cellW / 2 - tw - 6);   // (beside the door, not standing in front of it)
      g.fillStyle(0x2a2418, .26).fillEllipse(sx - px + 2, sy + 9, 9, 3).fillEllipse(sx + px + 2, sy + 9, 9, 3).fillRoundedRect(sx - tw + 3, sy - 6, tw * 2, 14, 2);
      for (const x of [sx - px, sx + px]) g.fillStyle(0x4e3e2a).fillRect(x - 1.6, sy - 13, 3.2, 22).fillStyle(0x8a7050, .8).fillRect(x - 1.6, sy - 13, 1.1, 22).fillStyle(0x6e5a3e).fillCircle(x, sy - 13, 1.9);
      g.fillStyle(0x2f4a3a).fillRoundedRect(sx - tw, sy - 9, tw * 2, 15, 2).fillStyle(0x3e5e4a, .7).fillRect(sx - tw + 1, sy - 8.5, tw * 2 - 2, 2.2).lineStyle(1.1, 0xc8a868, 1).strokeRoundedRect(sx - tw + 1.8, sy - 7.4, tw * 2 - 3.6, 11.8, 1.5);
      node._inner.add(g);
      node._inner.add(scene.add.text(sx, sy - 1.5, def.sign, { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#f3e6c4', resolution: 3 }).setOrigin(.5, .5));
    }
    // lit windows spill a soft warm pool on the ground in front (added light, feathered: no disc)
    if (night && window.GardenPaintedProps) { const pk = GardenPaintedProps.poolKey(scene); if (pk) { const pool = scene.add.image(cx, foot + 10, pk).setOrigin(.5, .5).setScale(def.w * 1.1 / 256, def.w * .3 / 256).setAlpha(.3), layer = overLayer; if (layer) { layer.add(pool); pool.setDepth(80005); } else node._inner.add(pool); poolImages.push(pool); } }
    // the click area is the picture and its sign, no wider: the village's paths pass close by these houses now they stand at
    // full size, and a click on the path beside one must walk there, not in at its door
    // (clickTop: the share of the picture above the roof that is only a flagpole and its flag, not part of the house: it is
    // drawn, and cached, with the house, but a click there is a click on the ground behind it)
    const top = main.y - main.displayHeight * main.originY, b = { x: main.x - main.displayWidth * main.originX - 2, y: top, width: main.displayWidth + 4, height: foot - top + (def.sign ? 22 : 8) };
    const hitTop = top + main.displayHeight * (def.clickTop || 0);
    node.nativeBounds = b;
    return { root: node.target, rootNode: node, bounds: b, hitPoint: def.clickTop ? (x, y) => y >= hitTop : undefined, painted: true, lights: lampLights, foot: { x: cx, y: foot }, update() {}, setLitWindows(on) { for (const [im, id, v, size] of parts) { const o = objectKey(scene, id, v, season, size, !!on); if (o && im.texture.key !== o.key) im.setTexture(o.key).setOrigin(o.meta.ox, o.meta.oy); } }, destroy() { for (const im of poolImages) im.destroy(); node.remove(); } };
  }

  /* ---------- planting: groves, shrubs and reeds in deliberate groups ---------- */
  const GROVE = { summer: ['tree.green-oak', 'tree.green-birch', 'tree.green-chestnut', 'tree.hawthorn', 'tree.green-alder'], autumn: ['tree.green-oak', 'tree.green-birch', 'tree.green-chestnut', 'tree.hawthorn', 'tree.cherry'] };
  const TREE_KIT = { 'tree.green-oak': 'oak', 'tree.green-birch': 'birch', 'tree.green-chestnut': 'chestnut', 'tree.hawthorn': 'hawthorn', 'tree.green-alder': 'alder', 'tree.cherry': 'cherry', 'tree.kit-apple': 'apple', 'tree.kit-pear': 'pear', 'tree.kit-plum': 'plum' };
  // (round 3) the shut south common orchard is planted with fruit trees in rows, each section its own kind, instead of the
  // grove's oaks and chestnuts: the tree kit paints apple, pear and plum (no library drawing: kit only)
  const FRUIT_TREES = { 'lc-old-apple': 'tree.kit-apple', 'lc-pear-corner': 'tree.kit-pear', 'lc-plum-row': 'tree.kit-plum' };
  const SHRUB = ['plant.holly', 'plant.gorse', 'plant.fern', 'plant.bracken'];   // (village fix round 3: no box-hedge piece set loose on the grass as a shrub)
  /** Once a frame: a village crown you stand under fades, so you can always see yourself (as in the woods). */
  let plantingTall = [], fadeLast = 0;
  const plantingCoverage = [];
  function fadeUnder(time) {
    plantingCoverage.length = 0;
    if (!plantingTall.length || typeof _gw === 'undefined' || !lastInfo) return;
    const W = lastInfo.W, dt = fadeLast ? Math.min(.1, Math.max(0, (time - fadeLast) / 1000)) : .016; fadeLast = time;
    const x = _gw.px * W.cellW, y = W.sky + _gw.py * W.cellH;
    for (const t of plantingTall) { if (!t.im.active) continue; const under = gardenCrownCovers(x, y, t.x, t.y, t.h, Math.min(t.im.displayWidth, t.h * 1.05), t.im), a = under || fishingCrownCovers(t.im) ? GARDEN_CROWN_FADE : 1; if (under && t.im.visible) plantingCoverage.push(t.im); if (t.im.alpha !== a) t.im.setAlpha(Math.abs(a - t.im.alpha) < .02 ? a : t.im.alpha + (a - t.im.alpha) * Math.min(1, dt * 8)); }
  }
  function planting(scene, parent, info) {
    const W = info.W, made = [], season = info.season || 'summer', trees = GROVE[season] || GROVE.summer; spotCounts = {};
    // Trees stay sprites (the player walks behind them); low shrubs and reeds
    // are painted straight into the cached ground, so a frame never pays for them.
    const g = cachedGround && cachedGround.layer ? cachedGround : null, low = [];
    const add = (id, v, size, x, y) => {
      if (!sceneObj(id) && !(TREE_KIT[id] && window.GardenPaintTrees && size.h >= 50)) return;
      if (size.h && size.h < 50 && g) { low.push({ id, v, h: Math.round(size.h / 2) * 2, x, y }); return; }
      // trees: the painted tree kit (94-garden-paint-tree-0kit.js), crowns of lit leaf masses on rooted trunks, and their
      // dappled shadow and root contact painted into the cached ground (no sprite, no frame cost)
      const species = TREE_KIT[id], kit = species && window.GardenPaintTrees;
      let im = null;
      if (kit) {
        im = ok(() => GardenPaintTrees.image(scene, { species, season, v, h: size.h, x, y, flip: (Math.round(x) & 1) === 1 }));
        if (im && g) low.push({ tree: species, h: size.h, x, y });
      }
      if (!im) im = objectImage(scene, id, v, season, size, x, y, false);
      if (!im) return; im.setDepth(y); parent.add(im); made.push(im);
      if (size.h >= 50) { tall.push({ im, x, y, h: size.h }); trunks.push(Object.freeze({ x: x / W.cellW, y: (y - W.sky) / W.cellH, w: (size.was || size.h) > 100 ? .5 : .4, sp: String(species || id || '') })); }
    };
    const tall = plantingTall = [], trunks = [];
    // Nothing overlaps: a tree stands 3.5 to 5 times the player (gardenSizePx), but never so tall that its crown covers a building,
    // a sign, a lamp or a seat standing behind it. Then it keeps the most height that leaves them clear, down to its old size.
    const keep = (typeof gardenPropsNow === 'function' ? gardenPropsNow() : []).filter(p => p && p.w && (p.tall == null || p.tall >= .6)).map(p => { const foot = W.sky + (p.y + (p.h || 1)) * W.cellH, up = /lamp/.test(String(p.kind || p.art || '')) ? gardenSizePx('lamp', 1) + 8 : Math.max(30, (p.tall == null ? 2 : p.tall) * 46); return { x0: p.x * W.cellW - 6, x1: (p.x + p.w) * W.cellW + 6, y0: foot - up, y1: foot }; });
    const fitTree = (species, x, y, want, least) => { const F = window.GardenPaintTrees && GardenPaintTrees.form ? GardenPaintTrees.form(species) : { rx: .46, cy: .6, ry: .33 }; for (let h = want; h > least; h -= 10) { const cx0 = x - h * F.rx, cx1 = x + h * F.rx, cy0 = y - h, cy1 = y - h * (F.cy - F.ry); if (!keep.some(b => b.y1 < y - 2 && b.x1 > cx0 && b.x0 < cx1 && b.y1 > cy0 && b.y0 < cy1)) return Math.round(h); } return Math.round(least); };
    const gates = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data && GardenIslandLayout.data.gates || [], fl = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data && (GardenIslandLayout.data.presentation || {}).falls, byGate = (x, y) => gates.some(g => Math.abs(x - g.x) <= 3 && y - g.y >= -2 && y - g.y <= 5) || !!(fl && x >= fl.x - 3 && x <= fl.x + (fl.w || 3) + 2 && y >= fl.y - 1 && y <= fl.y + (fl.h || 3) + 4);   // (nor over Fleet Falls)
    let fruitAt = null; try { const D = typeof gardenIslandData === 'function' ? gardenIslandData() : null; if (D && D.sectionCells) { fruitAt = new Map(); for (const [id, cs] of Object.entries(D.sectionCells)) if (FRUIT_TREES[id]) for (const c of cs) fruitAt.set(c[0] + ',' + c[1], FRUIT_TREES[id]); } } catch (e) { fruitAt = null; }
    for (let cy = info.box.y0; cy <= info.box.y1; cy++) for (let cx = info.box.x0; cx <= info.box.x1; cx++) {
      const spot = info.spot(cx, cy); spotCounts[spot || 'none'] = (spotCounts[spot || 'none'] || 0) + 1; if (!spot) continue;
      if (spot === 'tree' && byGate(cx, cy)) continue;   // (a gate stays in view: no tree crown over the arch)
      const h = (a, b, k) => { let n = Math.imul(a * 374761393 + b * 668265263 + k * 1442695041, 1) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
      const r = h(cx, cy, 11), cluster = h(Math.floor(cx / 3), Math.floor(cy / 2), 5), px = (cx + .5) * W.cellW + (h(cx, cy, 2) - .5) * 22, py = W.sky + (cy + 1) * W.cellH - 4 + (h(cx, cy, 3) - .5) * 8;
      { const fruit = spot === 'tree' && fruitAt && fruitAt.get(cx + ',' + cy); if (fruit) { if (((cx + cy) & 1) === 0) add(fruit, Math.floor(r * 3), { h: 90 + r * 18 }, (cx + .5) * W.cellW + (h(cx, cy, 2) - .5) * 10, W.sky + (cy + 1) * W.cellH - 4); continue; } }
      // A grove where the cluster field is high (one species leads it), shrubs at its fringe.
      if (spot === 'tree' && cluster > .42) { const id = trees[Math.floor((cluster * 7 + r * 2) % trees.length)]; add(id, Math.floor(r * 3), { h: fitTree(TREE_KIT[id], px, py, gardenSizePx('tree', r), 84 + r * 40), was: 84 + r * 40 }, px, py); }   /* (a mature tree stands 3.5 to 5 times the player; `was` keeps the trunk's old width for walking) */
      else if ((spot === 'tree' && cluster > .3 || spot === 'edge' && cluster > .35 || spot === 'wild' && r > .4) && r > .3) add(SHRUB[Math.floor(r * 53) % SHRUB.length], Math.floor(r * 7) % 3, { h: 26 + r * 16 }, px, py);
      else if (spot === 'shore' && r > .45) add(r > .75 ? 'plant.bulrush' : 'plant.reed', Math.floor(r * 5) % 3, { h: 30 + r * 14 }, px, py);
    }
    // Low shrubs and reeds, and every tree's dappled shadow and root contact, are painted into the ground layer (no sprite,
    // no frame cost): one late op, repainted only when the planting changes. Each shrub is seated in the lawn: a soft
    // shadow under it and grass grown up over its foot, so a hedge or gorse clump never ends in a ruled line.
    if (g && low.length) {
      const sigL = season + ':' + low.length + ':' + hash32(low.map(i => (i.id || i.tree) + ':' + Math.round(i.x) + ',' + Math.round(i.y) + ',' + Math.round(i.h)).join('|')), cans = new Map();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const i of low) { x0 = Math.min(x0, i.x); y0 = Math.min(y0, i.y); x1 = Math.max(x1, i.x); y1 = Math.max(y1, i.y); }
      const canOf = i => { const key = i.id + ':' + i.v + ':' + i.h; let o = cans.get(key); if (o === undefined) { o = ok(() => objectCanvas(i.id, i.v, season, { h: i.h * 2 })); cans.set(key, o); } return o; };
      const tone = season === 'winter' ? ['#8a9878', '#a4ae90'] : season === 'autumn' ? ['#7e9446', '#9aaa58'] : ['#5e8a3e', '#7aa24c'];
      g.layer.set('planting', { bb: [x0 - 160, y0 - 160, x1 + 160, y1 + 160], seed: 1, draw(Bk, r0, cb) {
        const gx = Bk.cx;
        for (const i of low) {
          if (i.x < cb[0] - 150 || i.x > cb[2] + 150 || i.y < cb[1] - 60 || i.y > cb[3] + 150) continue;
          if (i.tree) { ok(() => GardenPaintTrees.groundShadow(gx, i.x, i.y, i.h, { species: i.tree, season })); continue; }
          const o = canOf(i); if (!o) continue; const k = 1 / (OBJ_K * 2), bw = Math.min(o.c.width * k, i.h * 2.2);
          gx.globalAlpha = .22; gx.fillStyle = '#2e3e22'; gx.beginPath(); gx.ellipse(i.x + 2, i.y - 1, bw * .46, 3.2, 0, 0, Math.PI * 2); gx.fill(); gx.globalAlpha = 1;
          gx.drawImage(o.c, i.x - o.ox * k, i.y - o.oy * k, o.c.width * k, o.c.height * k);
          const blades = Math.round(bw / 2.6), seed = Math.abs(Math.round(i.x * 7 + i.y * 13)); gx.lineCap = 'round';
          for (let b = 0; b < blades; b++) { const t = blades > 1 ? b / (blades - 1) : .5, h = ((seed + b * 37) % 7) / 7, px = i.x - bw * .48 + t * bw * .96, len = (3 + h * 4.5) * (1 - Math.abs(t - .5) * .6); gx.strokeStyle = tone[(seed + b) % 2]; gx.globalAlpha = .9; gx.lineWidth = 1.1; gx.beginPath(); gx.moveTo(px, i.y + .6); gx.quadraticCurveTo(px + (h - .5) * 2, i.y - len * .5, px + (h - .5) * 4, i.y - len); gx.stroke(); }
          gx.globalAlpha = 1;
        }
      } }, sigL);
    }
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
    const g = cachedGround && cachedGround.layer ? cachedGround : null; if (!g) return false; const B = g.box;
    g.layer.add({ bb: [B.x, B.y, B.x + B.w, B.y + B.h], seed: 1, draw(Bk) { fn(Bk.cx, { box: B, meadow: lastInfo && lastInfo.meadow || (() => true), palette: palette(lastInfo && lastInfo.season), rng, path }); } });
    return true;
  }
  function hash32(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  let composeMs = 0;
  function compose(scene, items) {
    const g = cachedGround; if (!g || !g.layer || !items.length) return;
    const key = items.map(i => [i.id, Math.round(i.x), Math.round(i.y), Math.round(i.w), Math.round(i.fw || 0)].join(':')).sort().join('|');
    if (g.composed === key) return; const t0 = performance.now(), G = window.GardenPaintGround, B = g.box, list = items.map(i => Object.assign({}, i)), P = palette(lastInfo && lastInfo.season), meadow = lastInfo && lastInfo.meadow || (() => true);
    // its soft shadow, thrown the way every shadow in the vale falls (the kit's one light) and dark where it meets the ground:
    // on the kit's shadow layer, which lies over every region's ground (in this ground it was hidden wherever a region paints its own)
    G.cast.blobs(list.filter(it => !it.shaded).map(it => { const w0 = it.fw ? Math.min(it.w, it.fw) : it.w, tall = it.h > w0 * 1.6, w = tall ? Math.max(8, w0 * .3) : w0;   // (as wide as what stands on the ground: a lamp's glow and a roof's eaves are not its foot, and a post is thinner still)
      return { id: it.id, x: it.x, y: it.y + 1, w, h: Math.min(160, it.h ? it.h * .85 : it.w * .9), a: .34 }; }));
    g.layer.set('compose', { bb: [B.x, B.y, B.x + B.w, B.y + B.h], seed: 1, draw(Bk, r0, cb) {
      const cx = Bk.cx;
      for (const it of list) {
        if (it.x < cb[0] - it.w - 110 || it.x > cb[2] + it.w + 40 || it.y < cb[1] - 60 || it.y > cb[3] + 40) continue;
        const r = rng(hash32(String(it.id) + ':' + Math.round(it.x) + ',' + Math.round(it.y)));
        // worn ground where feet stop: at a door, in front of a bench or a board
        if (it.door) { cx.globalAlpha = .38; cx.fillStyle = P.pathWear; cx.fill(path(sceneDraw.blob(r, it.x, it.y + 12, Math.max(14, it.w * .2), 7, 8, .5))); cx.globalAlpha = .25; cx.fillStyle = P.pathEdge; cx.fill(path(sceneDraw.blob(r, it.x + 2, it.y + 14, Math.max(8, it.w * .12), 4, 7, .5))); cx.globalAlpha = 1; }
        // planting growing round the foundation, thicker at the corners
        for (let k = 0, n = Math.round(6 + it.w / 10); k < n; k++) {
          const side = k % 2 ? 1 : -1, x = it.x + side * (it.w / 2 - 2 + r() * 12) + (r() - .5) * 6, y = it.y - 1 + r() * 5, t1 = r(), t2 = r(), t3 = r(), t4 = r(), t5 = r(); if (!meadow(x, y)) continue;
          cx.globalAlpha = .8; cx.fillStyle = t1 < .5 ? P.lawnLo : '#5e7e3c'; cx.fill(path(sceneDraw.blob(rng(hash32(it.id + ':' + k)), x, y, 4 + t2 * 4, 2 + t3 * 2, 6, .5)));
          for (let b = 0; b < 4; b++) { cx.strokeStyle = b % 2 ? P.lawnHi : '#6f8a40'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x + b - 2, y); cx.quadraticCurveTo(x + b - 2 + (b - 1.5), y - 4, x + (b - 1.5) * 2.2, y - 6 - t4 * 4); cx.stroke(); }
          if (t5 < .45) { cx.globalAlpha = 1; cx.fillStyle = ['#f2f0e8', '#e8c84a', '#c86aa0', '#9a7ad0'][Math.floor(t5 / .45 * 4) % 4]; cx.beginPath(); cx.arc(x + (t2 - .5) * 6, y - 4 - t3 * 3, 1.3, 0, Math.PI * 2); cx.fill(); }
          cx.globalAlpha = 1;
        }
      }
    } }, key);
    g.composed = key; composeMs = Math.round(performance.now() - t0);
  }
  function memory(scene) { const l = cachedGround && cachedGround.layer; return { groundBytes: l ? l.texturePx * 4 : 0, groundTextures: l ? l.live : 0 }; }
  function pendingGround() { const l = cachedGround && cachedGround.layer; return l && !retiring ? l.pendingInView() : 0; }
  function status() { const l = cachedGround && cachedGround.layer; return { wanted: wanted(), ready: ready(), groundMs, composeMs, K: l ? l.level : K, ground: l ? { level: l.level, chunks: l.chunks, live: l.live, MB: l.MB, medianMs: l.median, p95Ms: l.p95, worstSliceMs: l.sliceWorstMs } : null, planted: lastPlanting.length, spots: spotCounts, rebuilds, lastError: lastError || (window.GardenPaintGround && GardenPaintGround.lastError) || null }; }
  return { wanted, ready, preload, ground, building, planting, fanSetts, trunks: () => plantingTrunks, tall: () => plantingTall.map(t => ({ x: t.x, y: t.y, h: t.h, w: t.im && t.im.displayWidth || t.h })), trunkFoot, fadeUnder, crownCovers, fishingCrownCovers, playerCanopies: () => plantingCoverage, status, objectImage, objectCanvas, paintIntoGround, compose, memory, pendingGround, get lastError() { return lastError; }, set lastError(v) { lastError = v; }, set overLayer(v) { overLayer = v; } };
})();

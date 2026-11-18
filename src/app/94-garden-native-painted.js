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
    ops.push({ bb, seed: 3, draw(Bk) { const cx = Bk.cx; cx.lineJoin = 'round'; cx.save(); cx.clip(coastP, 'evenodd'); cx.strokeStyle = P.sandWet; cx.globalAlpha = .5; cx.lineWidth = 18; cx.stroke(coastP); cx.lineWidth = 8; cx.stroke(coastP); cx.restore(); cx.globalAlpha = .7; cx.strokeStyle = P.foam; cx.lineWidth = 2.2; cx.stroke(coastP); cx.globalAlpha = 1; } });
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
    // 6. Flower drifts and low growth on lawn and meadow: library plants stamped flat, in clumps (never one a tile).
    const stamps = [['plant.wildflowers', 0], ['plant.daisies', 1], ['plant.wildflowers', 2], ['plant.daisies', 0], ['plant.grass', 1], ['plant.wildflowers', 3]], stampC = new Map();
    const stampOf = kind => { const key = kind.join(':'); let st = stampC.get(key); if (st === undefined) { st = ok(() => objectCanvas(kind[0], kind[1], season, { h: kind[0] === 'plant.grass' ? 24 : 20 })); stampC.set(key, st); } return st; };
    ops.push({ bb, seed: 9, draw(Bk, r0, cb) { const cx = Bk.cx; G.tiles(cb, 96, 46, 301, (tx, ty, r) => { for (let g = 0; g < 2; g++) { const gx = tx + r() * 96, gy = ty + r() * 96, kind = stamps[Math.floor(r() * stamps.length)], count = 4 + Math.floor(r() * 7), go = r() > .25, k0 = kindAt(gx, gy); for (let i = 0; i < count; i++) { const x = gx + (r() - .5) * 70, y = gy + (r() - .5) * 34, sc = (.7 + r() * .5) / (OBJ_K * 2); if (!go || k0 !== 'lawn' && k0 !== 'meadow' || !info.meadow(x, y)) continue; const st = stampOf(kind); if (st) cx.drawImage(st.c, x - st.ox * sc, y - st.oy * sc, st.c.width * sc, st.c.height * sc); } } }); } });
    // lazy: nothing bakes in this task (the planting and the props' shadows are added to it straight after, and the world's
    // opening waits for what is on screen: pendingInView)
    const layer = G.layer(scene, parent, ops, { key: TEX + '-g' + (++groundSerial), box: B, chunk: 256, depth: -9600, budgetMB: 48, prebake: true, slice: 8, lazy: true });
    cachedGround = { sig, box: B, layer }; groundMs = Math.round(performance.now() - started);
    if (retiring) { const old = retiring, t0 = performance.now(), wait = () => { if (retiring !== old) return; if (cachedGround && cachedGround.layer === layer && layer.softInView() > 0 && performance.now() - t0 < 9000) return void setTimeout(wait, 250); old.destroy(); retiring = null; }; setTimeout(wait, 250); }
    return handleOf(layer);
  }

  /* ---------- the village buildings ---------- */
  // Library buildings, each its own kind, sized to the old footprint so doors,
  // aprons, picking and depth stay where they were.
  const BUILD = {
    'garden-shop': { obj: 'building.green-cottage', v: 0, w: 150, wallWidth: 150, sign: 'Seed & Stem', extra: [['plant.planter', 1, -84, 0, 26], ['plant.planter', 0, 84, 0, 26], ['plant.rph-flower-tub', 1, -60, 8, 18]] },
    'land-office': { obj: 'building.cottage', v: 1, w: 140, wallWidth: 160, sign: 'Land Office', extra: [['street.lamp', 0, -78, 4, 0, 70]] },
    'tackle-shop': { obj: 'building.fpv-sailing-hut', v: 0, w: 150, wallWidth: 376, wallCenterX: -8, wallFootY: 14, sign: 'Tackle & Tide', extra: [['street.mqn-lifebuoy', 0, 80, 2, 0, 30]] },
    'market-stall': { obj: 'structure.mcr-market-chalet', v: 1, w: 104, wallWidth: 200 },
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
    const g = cachedGround && cachedGround.layer ? cachedGround : null, low = [];
    const add = (id, v, size, x, y) => {
      if (!sceneObj(id)) return;
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
  return { wanted, ready, preload, ground, building, planting, trunks: () => plantingTrunks, trunkFoot, fadeUnder, crownCovers, fishingCrownCovers, playerCanopies: () => plantingCoverage, status, objectImage, objectCanvas, paintIntoGround, compose, memory, pendingGround, get lastError() { return lastError; }, set lastError(v) { lastError = v; }, set overLayer(v) { overLayer = v; } };
})();

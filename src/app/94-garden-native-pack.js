/* The "Pixel village" art style: the outdoor ground, village buildings and
 * planting drawn from one CC0 tile pack (Kenney's Roguelike/RPG pack, vendored
 * in vendor/art/kenney-roguelike with its licence). Only rendering changes:
 * cells, walking, picking and saved rows are untouched. The atlas is inlined
 * by build.mjs as inert data (#freeflo-garden-art), so it works offline and
 * needs nothing beyond the page's existing data: image policy. */
window.GardenNativePack = (function () {
  'use strict';
  const TEX = 'gdpack', T = 16, S = 2, TS = T * S;
  let meta = null, image = null, state = 'idle', sandWater = null;
  const waiting = new Set();
  function wanted() { try { return typeof _gdpPrefs === 'function' && _gdpPrefs().artStyle === 'pixel' && _gdpPrefs().renderEngine !== 'standard'; } catch (e) { return false; } }
  function readData() {
    if (meta) return meta;
    const tag = typeof document !== 'undefined' && document.getElementById('freeflo-garden-art'); if (!tag) return null;
    try { meta = JSON.parse(tag.textContent); } catch (e) { meta = null; } return meta;
  }
  function ready() { return state === 'ready'; }
  // Decode once per page. Callers redraw when it lands (one terrain rebuild).
  function preload(then) {
    if (state === 'ready') { if (then) then(); return true; }
    if (then) waiting.add(then);
    if (state === 'loading') return false;
    const data = readData(); if (!data) { state = 'missing'; return false; }
    state = 'loading'; image = new Image();
    image.onload = () => { prepareSandWater(); state = 'ready'; const list = [...waiting]; waiting.clear(); for (const fn of list) try { fn(); } catch (e) { console.warn('pack redraw', e); } };
    image.onerror = () => { state = 'missing'; waiting.clear(); };
    image.src = 'data:image/png;base64,' + data.png; return false;
  }
  function src(block, lx, ly) {
    const f = meta.atlas.frames[block]; if (!f) return null;
    const i = f.i[(ly || 0) * f.w + (lx || 0)]; if (i == null) return null;
    const P = T + 2; return { x: (i % meta.atlas.cols) * P + 1, y: Math.floor(i / meta.atlas.cols) * P + 1 };
  }
  function blit(ctx, block, lx, ly, dx, dy, from) {
    const s = src(block, lx, ly); if (!s) return;
    ctx.drawImage(from || image, s.x, s.y, T, T, dx, dy, T, T);
  }
  // Water bordered by beach: the pack's shore tiles carry a meadow border, so a
  // copy swaps those meadow pixels for the pack's own sand, pixel for pixel.
  function prepareSandWater() {
    const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
    const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0);
    const sand = src('sand', 0, 0), sandPx = ctx.getImageData(sand.x, sand.y, T, T).data;
    for (const block of ['waterIn', 'waterOut']) {
      const f = meta.atlas.frames[block];
      for (let k = 0; k < f.i.length; k++) {
        const s = src(block, k % f.w, Math.floor(k / f.w)), img = ctx.getImageData(s.x, s.y, T, T), d = img.data;
        for (let p = 0; p < d.length; p += 4) { const r = d[p], g = d[p + 1], b = d[p + 2]; if (g > r + 12 && g > b + 12) { d[p] = sandPx[p]; d[p + 1] = sandPx[p + 1]; d[p + 2] = sandPx[p + 2]; } }
        ctx.putImageData(img, s.x, s.y);
      }
    }
    sandWater = c;
    const w = src('waterOut', 1, 1), d = ctx.getImageData(w.x, w.y, T, T).data; let r = 0, g = 0, b = 0;
    for (let p = 0; p < d.length; p += 4) { r += d[p]; g += d[p + 1]; b += d[p + 2]; }
    const n = d.length / 4; waterTone = (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
  }
  const hash = (x, y, k) => { let n = Math.imul(x * 374761393 + y * 668265263 + (k || 0) * 2246822519, 1) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  // Corner autotiling. A tile's four corners say which quarter is covered;
  // the pack's 3x3 outer and 2x2 inner sets give every case.
  function wang(ctx, block, tl, tr, bl, br, dx, dy, from) {
    const n = tl + tr + bl + br; if (!n) return false;
    const out = block + 'Out', inn = block + 'In';
    let b = out, x = 1, y = 1;
    if (n === 4) { x = 1; y = 1; }
    else if (n === 3) { b = inn; if (!br) { x = 0; y = 0; } else if (!bl) { x = 1; y = 0; } else if (!tr) { x = 0; y = 1; } else { x = 1; y = 1; } }
    else if (n === 1) { b = out; if (br) { x = 0; y = 0; } else if (bl) { x = 2; y = 0; } else if (tr) { x = 0; y = 2; } else { x = 2; y = 2; } }
    else { if (bl && br) { x = 1; y = 0; } else if (tl && tr) { x = 1; y = 2; } else if (tr && br) { x = 0; y = 1; } else if (tl && bl) { x = 2; y = 1; } else { x = 1; y = 1; } }
    blit(ctx, b, x, y, dx, dy, from); return true;
  }
  /* Ground for the whole outdoor world, one canvas at the pack's own pixels,
   * shown at 2x with nearest filtering. info.material(cx, cy) is the cell's
   * render material; info.kind(px, py) classifies a world point. */
  function ground(scene, parent, info) {
    const W = info.W, width = W.cols * W.cellW, height = W.rows * W.cellH, NX = Math.ceil(width / TS), NY = Math.ceil(height / TS);
    const vx = NX + 1, kinds = new Uint8Array(vx * (NY + 1));
    // 0 grass, 1 water, 2 sand, 3 path (stone), 4 plaza, 5 dirt path
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) kinds[j * vx + i] = info.kind(Math.min(width - 1, i * TS), Math.min(height - 1, j * TS));
    const at = (i, j) => kinds[Math.max(0, Math.min(NY, j)) * vx + Math.max(0, Math.min(NX, i))];
    const c = document.createElement('canvas'); c.width = NX * T; c.height = NY * T; const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const is = (k, set) => set.includes(k) ? 1 : 0, details = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const dx = i * T, dy = j * T, q = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)];
      const r = hash(i, j);
      blit(ctx, 'grass', 0, r < .5 ? 0 : 1, dx, dy);
      const sand = q.map(k => is(k, [1, 2])), water = q.map(k => is(k, [1]));
      if (water.some(Boolean)) {
        const beach = q.some(k => k === 2);
        if (!wang(ctx, 'water', ...water, dx, dy, beach ? sandWater : null)) {}
        if (!water.every(Boolean) && !beach) { /* meadow shore */ }
        continue;
      }
      if (sand.some(Boolean)) wang(ctx, 'sand', ...sand, dx, dy);
      const dirt = q.map(k => is(k, [5])), stone = q.map(k => is(k, [3, 4]));
      if (dirt.some(Boolean)) wang(ctx, 'dirt', ...dirt, dx, dy);
      if (stone.some(Boolean)) wang(ctx, 'stone', ...stone, dx, dy);
      if (q.every(k => k === 4)) blit(ctx, 'pave', 1, (i + j + (r < .5 ? 1 : 0)) % 2, dx, dy);
      else if (!sand.some(Boolean) && !dirt.some(Boolean) && !stone.some(Boolean) && info.meadow(i * TS + TS / 2, j * TS + TS / 2)) {
        // Meadow details: a few loose flowers and stones in drifts, never noise.
        const m = hash(Math.floor(i / 4), Math.floor(j / 3), 7), d = hash(i, j, 3), ox = Math.floor(hash(i, j, 4) * 9) - 4, oy = Math.floor(hash(i, j, 5) * 7) - 3;
        if (m > .58 && d > .35) { details.push(['flowers', Math.floor(m * 40) % 4, dx + ox, dy + oy]); if (d > .7) details.push(['flowers', Math.floor(d * 400) % 4, dx + 8 - ox, dy + 7 - oy]); }
        else if (d > .965) details.push(['misc', d > .985 ? 2 : 0, dx + ox, dy + oy, d > .985 ? 0 : 1]);
      }
    }
    // Loose flowers and tufts go on after every tile, so a drift can cross a
    // tile edge instead of sitting on the grid.
    for (const [b, lx, x, y, ly] of details) blit(ctx, b, lx, ly || 0, x, y);
    const key = TEX + '-ground-' + (++groundSerial);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, c); scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const img = scene.add.image(0, W.sky, key).setOrigin(0, 0).setScale(S).setDepth(-9600);
    parent.add(img); parent.sort('depth');
    return { image: img, destroy() { img.destroy(); if (scene.textures.exists(key)) scene.textures.remove(key); }, water: averageWater() };
  }
  let groundSerial = 0;
  let waterTone = 0x5fb0c0;
  function averageWater() { return waterTone; }
  /* Compositions: [block, localX, localY, tileX, tileY]; '$name' slots are
   * filled per building so each shop is its own house, not a recolour. */
  function house(gables) {
    const L = [];
    for (let x = 0; x < gables * 2; x++) L.push(['$wall', 5, 3, x, 2], ['$wall', 4, 4, x, 3]);
    for (let g = 0; g < gables; g++) { const x = g * 2; L.push(['$roof', 0, 0, x, 0], ['$roof', 1, 0, x + 1, 0], ['$roof', 0, 1, x, 1], ['$roof', 1, 1, x + 1, 1], ['$roof', 0, 2, x, 2], ['$roof', 1, 2, x + 1, 2]); }
    return L;
  }
  const houseRow = (cells) => cells.map((slot, x) => [slot, 0, 0, x, 3]);
  const shifted = (layers, by) => layers.map(([b, lx, ly, x, y]) => [b, lx, ly, x + by, y]);
  const BUILD = {
    // Seed & Stem: warm clay roof, shrubs and a barrel of bulbs either side.
    'garden-shop': { w: 6, h: 4, slots: { $roof: ['roofBrown', 0, 0], $wall: ['wallBeige', 0, 0], $win: ['windows', 0, 4], $door: ['doors', 0, 0] }, layers: shifted(house(2).concat(houseRow(['$win', '$door', '$win', '$win'])), 1).concat([['bush', 0, 0, 0, 3], ['misc', 2, 0, 0, 2], ['barrels', 0, 0, 5, 3], ['misc', 4, 0, 5, 2]]), sign: 'SEED & STEM' },
    // Land office: slate roof, the island's teal shields on both gables.
    'land-office': { w: 4, h: 4, slots: { $roof: ['roofGrey', 0, 0], $wall: ['wallBeige', 0, 0], $win: ['windows', 2, 4], $door: ['doors', 1, 0] }, layers: house(2).concat(houseRow(['$win', '$win', '$door', '$win'])).concat([['banners', 2, 3, 0, 2], ['banners', 2, 3, 3, 2]]), sign: 'LAND OFFICE' },
    // Tackle & Tide: timber roof, a drying net and creels outside.
    'tackle-shop': { w: 6, h: 4, slots: { $roof: ['roofWood', 0, 0], $wall: ['wallBeige', 0, 0], $win: ['windows', 0, 0], $door: ['doors', 4, 0] }, layers: shifted(house(2).concat(houseRow(['$win', '$door', '$win', '$win'])), 1).concat([['netpost', 0, 0, 5, 2], ['netpost', 0, 2, 5, 3], ['crates', 0, 0, 0, 3], ['barrels', 2, 0, 0, 2]]), sign: 'TACKLE & TIDE' },
    'market-stall': { w: 3, h: 3, layers: [['awning', 0, 0, 0, 0], ['awning', 0, 0, 1, 0], ['awning', 0, 0, 2, 0], ['awning', 0, 2, 0, 1], ['awning', 0, 2, 1, 1], ['awning', 0, 2, 2, 1], ['counter', 0, 0, 0, 2], ['counter', 1, 0, 1, 2], ['counter', 2, 0, 2, 2], ['counter', 1, 1, 1, 1], ['counter', 2, 2, 2, 1]] },
    'notice-board': { w: 2, h: 2, layers: [['boards', 0, 0, 0, 1], ['boards', 0, 0, 1, 1], ['books', 0, 3, 0, 1], ['books', 3, 3, 1, 1], ['banners', 4, 6, 0, 0], ['banners', 4, 3, 1, 0]] },
    'craft-bench': { w: 4, h: 2, layers: [['crafts', 1, 0, 0, 1], ['crafts', 3, 0, 1, 1], ['crates', 0, 0, 2, 1], ['barrels', 0, 0, 3, 1], ['barrels', 2, 0, 3, 0]] },
  };
  // The lake hall grows with the collection (gardenHallTier): a tent, a hut,
  // then a hall of two and three gables.
  const HALL = [
    { w: 2, h: 2, layers: [['tents', 2, 0, 0, 0], ['tents', 3, 0, 1, 0], ['tents', 2, 1, 0, 1], ['tents', 3, 1, 1, 1]] },
    { w: 2, h: 4, slots: { $roof: ['roofWood', 0, 0], $wall: ['wallWood', 0, 0], $win: ['windows', 4, 4], $door: ['doors', 0, 0] }, layers: house(1).concat(houseRow(['$win', '$door'])), sign: 'LAKE HALL' },
    { w: 4, h: 4, slots: { $roof: ['roofBrown', 0, 0], $wall: ['wallBeige', 0, 0], $win: ['windows', 4, 4], $door: ['doors', 0, 0] }, layers: house(2).concat(houseRow(['$win', '$door', '$win', '$win'])), sign: 'LAKE HALL' },
    { w: 6, h: 4, slots: { $roof: ['roofBrown', 0, 0], $wall: ['wallBeige', 0, 0], $win: ['windows', 4, 4], $door: ['doors', 0, 0] }, layers: house(3).concat(houseRow(['$win', '$win', '$door', '$win', '$win', '$win'])), sign: 'LAKE HALL' },
  ];
  function hallTier(sc) { try { const ca = sc.ca || (typeof gardenCatchHere === 'function' ? gardenCatchHere() : null) || {}; return typeof gardenHallTier === 'function' ? Math.max(0, Math.min(3, gardenHallTier(Number(ca.ha) || 0))) : 0; } catch (e) { return 0; } }
  // Night swaps the glazed windows for the pack's own lamp-lit panes.
  function nightSlot(slot) { return slot && slot[0] === 'windows' && slot[2] >= 4 ? ['windows', slot[1], 6] : slot && slot[0] === 'windows' ? ['windows', slot[1], 6] : slot; }
  function stamp(scene, id, def, night) {
    const key = TEX + '-b-' + id + (night ? '-n' : '');
    if (scene.textures.exists(key)) return key;
    const c = document.createElement('canvas'); c.width = def.w * T; c.height = def.h * T; const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    for (const [b0, lx0, ly0, dx, dy] of def.layers) {
      let b = b0, lx = lx0, ly = ly0;
      if (b.startsWith('$')) { let slot = def.slots[b]; if (night && b === '$win') slot = nightSlot(slot); b = slot[0]; lx += slot[1]; ly += slot[2]; }
      blit(ctx, b, lx, ly, dx * T, dy * T);
    }
    scene.textures.addCanvas(key, c); scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST); return key;
  }
  function frameKey(scene, block, lx, ly, w, h) {
    const key = TEX + '-f-' + block + '-' + lx + '-' + ly + '-' + (w || 1) + 'x' + (h || 1);
    if (scene.textures.exists(key)) return key;
    const c = document.createElement('canvas'); c.width = (w || 1) * T; c.height = (h || 1) * T; const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < (h || 1); y++) for (let x = 0; x < (w || 1); x++) blit(ctx, block, lx + x, ly + y, x * T, y * T);
    scene.textures.addCanvas(key, c); scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST); return key;
  }
  /* A village building as a native node: same handle shape as the painted
   * buildings, anchored on the same foot so doors, picking and depth hold. */
  function building(scene, prop, sc, element, W) {
    if (!ready()) return null;
    const tier = prop.id === 'lake-hall' ? hallTier(sc) : -1, def = tier >= 0 ? HALL[tier] : BUILD[prop.id]; if (!def) return null;
    const stampId = tier >= 0 ? prop.id + '-' + tier : prop.id;
    const node = element(scene, 'g', { class: 'gd-it gd-prop gd-prop-' + prop.kind + ' gd-pack', 'data-prop': prop.id, 'data-z': prop.y + prop.h, 'data-x': prop.x });
    const cx = (prop.x + prop.w / 2) * W.cellW, foot = W.sky + (prop.y + prop.h) * W.cellH + 2, pw = def.w * TS, ph = def.h * TS;
    const shadow = scene.add.graphics(); shadow.fillStyle(0x1f3a2a, .22).fillEllipse(cx + 4, foot - 2, pw + 10, 16); node._inner.add(shadow);
    const night = sc.tod === 'dusk' || sc.tod === 'night';
    const img = scene.add.image(cx, foot, stamp(scene, stampId, def, night)).setOrigin(.5, 1).setScale(S); node._inner.add(img);
    if (def.sign) {
      const board = scene.add.graphics(), sy = foot - TS * 2 + 6;
      const bw = Math.min(88, def.w * TS - 6) / 2; board.fillStyle(0x6b4a2c).fillRect(cx - bw, sy - 9, bw * 2, 17).fillStyle(0xc89a62).fillRect(cx - bw + 2, sy - 7, bw * 2 - 4, 13);
      node._inner.add(board);
      const label = scene.add.text(cx, sy, def.sign, { fontFamily: 'Georgia, serif', fontSize: def.w < 4 ? '7px' : '10px', fontStyle: 'bold', color: '#3b2614', resolution: 3 }).setOrigin(.5, .5); node._inner.add(label);
    }
    const b = { x: cx - pw / 2 - 6, y: foot - ph - 4, width: pw + 12, height: ph + 12 }; node.nativeBounds = b;
    return { root: node.target, rootNode: node, bounds: b, pack: true, update() {}, setLitWindows(on) { const k = stamp(scene, stampId, def, !!on); if (img.texture.key !== k) img.setTexture(k); }, destroy() { node.remove(); } };
  }
  /* Planting composed around the village: trees, hedges, bushes and props in
   * deliberate groups, only where nobody walks (the game's own free test). */
  const TREES = [['trees', 0, 1, 1, 2], ['trees', 2, 1, 1, 2], ['trees', 3, 1, 1, 2], ['trees', 5, 1, 1, 2], ['trees', 0, 0, 1, 1], ['trees', 2, 0, 1, 1], ['misc', 1, 1, 1, 2]];
  const BUSHES = [['bush', 0, 0, 1, 1], ['bush', 2, 0, 1, 1], ['misc', 2, 0, 1, 1], ['misc', 3, 0, 1, 1], ['misc', 2, 1, 1, 1], ['misc', 4, 0, 1, 1]];
  function planting(scene, parent, info) {
    const W = info.W, made = []; spotCounts = {};
    const add = (spec, x, y, scale) => {
      const img = scene.add.image(x, y, frameKey(scene, spec[0], spec[1], spec[2], spec[3], spec[4])).setOrigin(.5, 1).setScale(S * (scale || 1)).setDepth(y);
      parent.add(img); made.push(img); return img;
    };
    for (let cy = info.box.y0; cy <= info.box.y1; cy++) for (let cx = info.box.x0; cx <= info.box.x1; cx++) {
      const spot = info.spot(cx, cy); spotCounts[spot || 'none'] = (spotCounts[spot || 'none'] || 0) + 1; if (!spot) continue;
      const r = hash(cx, cy, 11), cluster = hash(Math.floor(cx / 3), Math.floor(cy / 2), 5);
      const px = (cx + .5) * W.cellW + (hash(cx, cy, 2) - .5) * 18, py = W.sky + (cy + 1) * W.cellH - 3;
      // Groups, not a sprinkle: a grove where the cluster field is high, a
      // shrub or two at its fringe, open meadow (ground flowers) elsewhere.
      if (spot === 'tree' && cluster > .42) add(TREES[Math.floor(r * 97) % (cluster > .75 ? 4 : TREES.length)], px, py);
      else if ((spot === 'tree' && cluster > .3 || spot === 'edge' && cluster > .35) && r > .45) add(BUSHES[Math.floor(r * 53) % BUSHES.length], px, py);
      else if (spot === 'wild' && (cluster > .5 ? r > .25 : r > .8)) add(cluster > .8 && r > .7 ? TREES[Math.floor(r * 31) % TREES.length] : BUSHES[Math.floor(r * 53) % BUSHES.length], px, py);
    }
    lastPlanting = made;
    return { destroy() { for (const img of made) img.destroy(); made.length = 0; }, count: made.length };
  }
  let lastPlanting = [], spotCounts = {};
  function status() { return { wanted: wanted(), state, planted: lastPlanting.length, spots: spotCounts, plantedVisible: lastPlanting.filter(i => i.visible && i.active && i.parentContainer).length, sample: lastPlanting[0] ? [lastPlanting[0].x, lastPlanting[0].y, lastPlanting[0].depth, lastPlanting[0].alpha] : null, atlas: meta ? { w: image && image.width, h: image && image.height } : null }; }
  return { wanted, ready, preload, ground, building, planting, status, scale: S, tile: TS };
})();

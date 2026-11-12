/* Painted nature: the vale's woods as composed pictures (Painted village art
 * style): Whispering woodland (birch and beech-like broadleaves, light coming
 * through in shafts and dapples) and the old woodland (ancient oaks and yews,
 * snags and fallen trunks, moss, silence).
 *
 * Driven by the layout: each wood is a region polygon (data.regions), trees
 * stand only on land cells that are not paths, water, statics, owned plots or a
 * plaza's clearing; the brook, the paths and the clearings are what the
 * picture is composed round. Groves come from a clustering field, never a grid.
 *
 * How it stays cheap:
 *  - The floor (leaf litter, moss, the canopy's shade, sunlit patches, ferns,
 *    bluebells, logs) is baked lazily into 512 px chunk textures near the
 *    camera, one a frame at most, with an LRU cap.
 *  - Trees are the library's own objects as sprites (a small set of sizes per
 *    species, so textures are shared), sorted by their base line in the world's
 *    object layer: you walk under and behind them. A crown you stand under
 *    fades so you are never lost; trees off screen are hidden.
 *  - Light: a few soft additive pools that breathe and drift on the floor, and
 *    shafts over the glades; nothing redraws.
 * Nothing here runs at load. */
window.GardenPaintWood = (function () {
  'use strict';
  const K = 1, CH = 256, MAX_CHUNKS = 56, TEX = 'gpwd';
  const slowStep = { ms: 0, at: '' };
  let state = null, lastError = null, bakes = 0, bakeMs = 0, worstBake = 0, tickWorst = 0;
  const ok = f => { try { return f(); } catch (e) { lastError = String(e && e.stack || e); return null; } };
  function rng(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const h3 = (a, b, k) => { let n = Math.imul(a * 374761393 + b * 668265263 + k * 1442695041, 1) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  function inside(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  // smooth value noise on cells, for groves and glades
  function noise(x, y, s, k) { const xi = Math.floor(x / s), yi = Math.floor(y / s), fx = x / s - xi, fy = y / s - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = h3(xi, yi, k), b = h3(xi + 1, yi, k), c = h3(xi, yi + 1, k), d = h3(xi + 1, yi + 1, k); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }

  /* ---------- the woods the layout names ---------- */
  const WOODS = {
    'west-woods': { name: 'Whispering woodland', mood: 'light', density: .5, trees: [['tree.pool-birch', 3, 150], ['tree.green-birch', 3, 140], ['tree.green-chestnut', 3, 190], ['tree.green-oak', 2, 200], ['tree.canal-oak', 2, 210], ['tree.hawthorn', 1, 110]], under: [['plant.fern', 3], ['plant.bracken', 2], ['plant.holly', 1]], floor: { litter: '#7d7a4a', shade: '#3f5232', moss: '#6f8a42', sun: '#e9e0a0', leaf: ['#9a8a4e', '#b39a5a', '#6f6a3c'] } },
    'east-mill': { name: 'Millwater valley', mood: 'meadow', density: .9, trees: [['tree.canal-willow', 3, 170], ['tree.green-willow', 2, 160], ['tree.green-alder', 2, 150], ['tree.pool-birch', 1, 140]], under: [['plant.grass', 3], ['plant.wildflowers', 2], ['plant.canal-view-meadowsweet', 1]], floor: { litter: '#8fa95a', shade: '#5f7f3e', moss: '#6f9446', sun: '#c8cf82', leaf: ['#a8b866', '#7f9a4c', '#b9b070'] } },
    'southwest-ruins': { name: 'The old woodland', mood: 'old', density: .58, trees: [['tree.canal-oak', 3, 240], ['tree.wyv-far-oak', 2, 230], ['tree.proof-yew', 2, 170], ['tree.green-oak', 2, 220], ['tree.wyv-snag', 1, 170]], under: [['plant.fern', 3], ['plant.holly', 2], ['plant.bracken', 1]], floor: { litter: '#5f6a3e', shade: '#2c3c28', moss: '#5f7f3a', sun: '#d8dca0', leaf: ['#6f6a3c', '#857a44', '#4f5a32'] } },
  };
  const MEADOW_TONE = { autumn: { litter: '#99a45a', leaf: ['#b2a860', '#8a944c', '#c0a868'] }, winter: { litter: '#a6b29a', leaf: ['#b8bea8', '#98a38a', '#c4c2ae'] } };
  const SEASON_TONE = { autumn: { litter: '#857a46', leaf: ['#a8703a', '#c08c44', '#7a5a30'] }, winter: { litter: '#8a8670', leaf: ['#8f8a74', '#a49e86', '#6f6b5a'] } };

  function build(info, cellAt) {
    const W = info.W, data = info.data, out = { trees: [], floors: [], lights: [], shafts: [], W };
    const pres = data.presentation || {}, plazas = (pres.plazas || []).filter(p => p.rx || /clearing|court/.test(p.id));
    // round every landmark, and four rows in front of it: a crown there would hide the house, its door and whoever stands at it (Thistle's old house was lost in the canopy)
    const statics = new Set(); for (const s of data.static || []) for (const b of [s, s.apron].filter(Boolean)) for (let y = Math.floor(b.y) - 1; y <= b.y + (b.h || 1) + 4; y++) for (let x = Math.floor(b.x) - (y > b.y + (b.h || 1) ? 2 : 1); x <= b.x + (b.w || 1) + (y > b.y + (b.h || 1) ? 1 : 0); x++) statics.add(x + ',' + y);
    const wet = c => !c || c.water || ['ocean', 'water', 'pool', 'lake', 'ice', 'beach'].includes(c.material);
    const isPath = c => c && c.material === 'path';
    const near = (x, y, r, test) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (test(cellAt(x + dx, y + dy))) return true; return false; };
    const px = x => x * W.cellW, py = y => W.sky + y * W.cellH;
    for (const region of data.regions || []) {
      const def = WOODS[region.id]; if (!def) continue;
      const poly = region.polygons[0], season = info.season || 'summer';
      const species = def.trees.filter(([id]) => typeof sceneObj === 'function' && sceneObj(id));
      if (!species.length) continue;
      const total = species.reduce((a, s) => a + s[1], 0);
      const clear = (x, y) => plazas.some(p => Math.hypot((x - p.x) / ((p.rx || 3.2) + 1), (y - p.y) / ((p.ry || 2.4) + 1)) < 1);
      // the gates stay in view: no tree stands on a gate, nor where its crown would hide the arch, bridge or stair (the canopy rises up the screen)
      const fl = pres.falls, byGate = (x, y) => (data.gates || []).some(g => Math.abs(x - g.x) <= 3 && y - g.y >= -2 && y - g.y <= 5) || !!(fl && x >= fl.x - 3 && x <= fl.x + (fl.w || 3) + 2 && y >= fl.y - 1 && y <= fl.y + (fl.h || 3) + 4);   // (nor over Fleet Falls)
      const finds = typeof GARDEN_GATE_FINDS !== 'undefined' && typeof gardenGateFindPoint === 'function' ? GARDEN_GATE_FINDS.map(f => gardenGateFindPoint(f)).filter(Boolean) : [], byFind = (x, y) => finds.some(q => Math.abs(x + .5 - q.x) <= 2.5 && y + .5 - q.y >= -1 && y + .5 - q.y <= 3.5);   // (a find is never under a crown)
      let x0 = 95, y0 = 95, x1 = 0, y1 = 0;
      for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(95, Math.ceil(x1)); y1 = Math.min(95, Math.ceil(y1));
      const land = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!inside(x + .5, y + .5, poly)) continue; const c = cellAt(x, y); if (wet(c)) continue;
        land.push([x, y]);
        if (isPath(c) || statics.has(x + ',' + y) || (c.row && c.row.plot && !c.locked) || clear(x + .5, y + .5) || byGate(x, y) || byFind(x, y)) continue;
        const grove = noise(x, y, 5, hash(region.id) & 1023), dense = noise(x, y, 2.2, 77), pathNear = near(x, y, 1, isPath), waterNear = near(x, y, 1, wet);
        // groves where the field is high, glades where it is low; a fringe of shrubs at path edges
        const bankNear = def.mood === 'meadow' && near(x, y, 2, wet) && !waterNear;
        const p = def.mood === 'meadow' ? (bankNear ? def.density * (grove > .45 ? .5 : .2) : 0) * (pathNear ? .3 : 1) : def.density * (grove > .62 ? 1.25 : grove > .42 ? .8 : .18) * (pathNear ? .35 : 1) * (waterNear ? .5 : 1);
        const roll = h3(x, y, 9);
        if (roll < p * (.55 + dense * .6)) {
          let pick = h3(x, y, 13) * total, sp = species[0]; for (const s of species) { if ((pick -= s[1]) <= 0) { sp = s; break; } }
          // birches gather in their own drifts in the light wood
          if (def.mood === 'light' && grove < .5 && h3(x, y, 21) < .6) sp = species.find(s => /birch/.test(s[0])) || sp;
          const size = 0, hgt = sp[2], jitter = [(h3(x, y, 2) - .5) * 26, (h3(x, y, 3) - .5) * 12];
          out.trees.push({ id: sp[0], v: /birch|oak/.test(sp[0]) && h3(x, y, 5) < .5 ? 1 : 0, size, h: Math.round(hgt / 10) * 10, x: px(x + .5) + jitter[0], y: py(y + 1) - 4 + jitter[1], flip: h3(x, y, 6) < .5, scale: .8 + h3(x, y, 7) * .4, region: region.id, cx: x, cy: y });
        } else if (!pathNear && roll < p + (def.mood === 'meadow' ? .3 : .2) && h3(x, y, 31) < .5) {
          const u = def.under[Math.floor(h3(x, y, 33) * def.under.length)];
          out.floors.push({ kind: 'stamp', id: u[0], v: Math.floor(h3(x, y, 34) * 3), h: 26 + h3(x, y, 35) * 16, x: px(x + .5) + (h3(x, y, 36) - .5) * 30, y: py(y + 1) - 6 });
        }
      }
      out.floors.push({ kind: 'floor', region: region.id, def, land, season, poly, glades: def.mood === 'meadow' ? [] : plazas.filter(p => inside(p.x, p.y, poly)).map(p => ({ x: px(p.x), y: py(p.y), rx: ((p.rx || 3.2) + 1.2) * W.cellW, ry: ((p.ry || 2.4) + 1) * W.cellH })) });
      // light: dapples on the floor wherever the canopy is broken, shafts over glades and clearings
      const r = rng(hash(region.id + 'light'));
      for (const [x, y] of land) {
        const grove = noise(x, y, 5, hash(region.id) & 1023);
        if (def.mood !== 'meadow' && grove < .45 && r() < (def.mood === 'light' ? .09 : .04)) out.lights.push({ x: px(x + r()), y: py(y + r()), k: .6 + r() * .9, ph: r() * 6.28, sp: .2 + r() * .3, region: region.id });
      }
      for (const p of plazas) if (def.mood !== 'meadow' && inside(p.x, p.y, poly)) out.shafts.push({ x: px(p.x), y: py(p.y), n: def.mood === 'light' ? 5 : 3, region: region.id });
      // the light wood also gets shafts over its biggest glades (low grove field, many land cells)
      if (def.mood === 'light') for (const [x, y] of land) if (x % 7 === 0 && y % 6 === 0 && noise(x, y, 5, hash(region.id) & 1023) < .28 && !clear(x, y)) out.shafts.push({ x: px(x + .5), y: py(y + .5), n: 2, region: region.id });
    }
    return out;
  }

  /* ---------- the floor, baked in chunks ---------- */
  const stamps = new Map();
  function stampCanvas(id, v, season, h) {
    const hq = Math.max(12, Math.round(h / 12) * 12), key = id + '|' + v + '|' + season + '|' + hq; if (stamps.has(key)) return stamps.get(key);
    const GP = window.GardenNativePainted; let s = null;
    if (GP && GP.objectCanvas && typeof sceneObj === 'function' && sceneObj(id)) s = ok(() => GP.objectCanvas(id, v, season, { h: hq }));
    if (s) s.hq = hq;
    if (stamps.size > 160) stamps.clear(); stamps.set(key, s); return s;
  }
  function* bakeChunk(ch) {   // a generator: it yields between cells, so a bake spreads over frames
    const t0 = performance.now(), S = state, B = ch.box, W = S.W, c = document.createElement('canvas'); c.width = Math.ceil(B.w * K); c.height = Math.ceil(B.h * K);
    const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, -B.x * K, -B.y * K);
    const view = { x: B.x - 80, y: B.y - 80, w: B.w + 160, h: B.h + 160 }, season = S.season;
    for (const f of S.M.floors) {
      if (f.kind !== 'floor') continue;
      const F = Object.assign({}, f.def.floor, (f.def.mood === 'meadow' ? MEADOW_TONE : SEASON_TONE)[season] || {}), r = rng(hash(f.region + ch.key));
      // soft lobed cells of litter (they overlap, so the edge of the wood is organic, never square)
      for (const [x, y] of f.land) { yield;
        const X = x * W.cellW + W.cellW / 2, Y = W.sky + y * W.cellH + W.cellH / 2; if (X < view.x || X > view.x + view.w || Y < view.y || Y > view.y + view.h) continue;
        const g = noise(x, y, 5, hash(f.region) & 1023), rr = rng(hash(f.region) ^ (x * 977 + y * 131));
        // one opaque union of big jittered lobes: the floor's colour with an organic edge, no cell pattern
        cx.globalAlpha = 1; cx.fillStyle = F.litter; cx.fill(new Path2D(sceneDraw.blob(rr, X + (rr() - .5) * 16, Y + (rr() - .5) * 10, W.cellW * (.8 + rr() * .3), W.cellH * (.85 + rr() * .3), 9, .3)));
      }
      // broad drifts of tone over the union, from smooth fields: canopy shade under
      // the groves, sun in the glades, green moss and grass where it is damp
      for (const [x, y] of f.land) { yield;
        if ((x + y * 3) % 2) continue; const X = x * W.cellW + W.cellW / 2, Y = W.sky + y * W.cellH + W.cellH / 2; if (X < view.x || X > view.x + view.w || Y < view.y || Y > view.y + view.h) continue;
        const g = noise(x, y, 5, hash(f.region) & 1023), m = noise(x, y, 3.3, 501), rr = rng(hash(f.region + 'd') ^ (x * 613 + y * 271));
        const blob = (a, col, sx, sy) => { cx.globalAlpha = a; cx.fillStyle = col; cx.fill(new Path2D(sceneDraw.blob(rr, X + (rr() - .5) * 30, Y + (rr() - .5) * 18, W.cellW * sx, W.cellH * sy, 10, .45))); };
        if (g > .5) blob(Math.min(f.def.mood === 'meadow' ? .14 : .34, (g - .5) * 1.2), F.shade, 1.5, 1.4);
        else if (g < .36) blob((.36 - g) * 1.4, F.sun, 1.3, 1.1);
        if (m > .58) blob((m - .58) * 1.6, F.moss, 1.2, 1);
        else if (m < .3) blob((.3 - m) * 1.2, F.leaf[x % 3], 1.1, .9);
      }
      cx.globalAlpha = 1;
      // the clearing: a sunlit lawn of short grass opening in the litter, soft at its edge, flowers in the light
      for (const gl of f.glades || []) {
        if (!hit({ x: gl.x - gl.rx * 1.3, y: gl.y - gl.ry * 1.3, w: gl.rx * 2.6, h: gl.ry * 2.6 }, view)) continue; yield;
        const rr = rng(hash(f.region + 'glade' + gl.x)), lawn = season === 'autumn' ? '#9aa65a' : season === 'winter' ? '#a6b29a' : '#93ad5f';
        for (const [k, a] of [[1.25, .35], [1.1, .55], [.95, .9], [.8, 1]]) { cx.globalAlpha = a; cx.fillStyle = lawn; cx.fill(new Path2D(sceneDraw.blob(rr, gl.x, gl.y, gl.rx * k, gl.ry * k, 12, .35))); }
        const g = cx.createRadialGradient(gl.x - gl.rx * .2, gl.y - gl.ry * .2, 0, gl.x, gl.y, gl.rx); g.addColorStop(0, 'rgba(255,244,190,.4)'); g.addColorStop(1, 'rgba(255,244,190,0)'); cx.globalAlpha = 1; cx.fillStyle = g; cx.save(); cx.translate(gl.x, gl.y); cx.scale(1, gl.ry / gl.rx); cx.translate(-gl.x, -gl.y); cx.beginPath(); cx.arc(gl.x, gl.y, gl.rx, 0, Math.PI * 2); cx.fill(); cx.restore();
        yield; for (let i = 0; i < 160; i++) { const a = rr() * 6.28, d = Math.sqrt(rr()) * .9, x = gl.x + Math.cos(a) * gl.rx * d, y = gl.y + Math.sin(a) * gl.ry * d; cx.globalAlpha = .5; cx.strokeStyle = rr() < .5 ? '#7c9a4e' : '#b4c878'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + 1, y - 2.5, x + (rr() - .5) * 3, y - 4); cx.stroke(); }
        yield; if (season !== 'winter') for (let i = 0; i < 26; i++) { const a = rr() * 6.28, d = Math.sqrt(rr()) * .85, x = gl.x + Math.cos(a) * gl.rx * d, y = gl.y + Math.sin(a) * gl.ry * d; const s = stampCanvas(rr() < .5 ? 'plant.wildflowers' : 'plant.daisies', Math.floor(rr() * 2), season, 12); if (s) { const k = (12 / s.hq) / 2; cx.globalAlpha = 1; cx.drawImage(s.c, x - s.ox * k, y - s.oy * k, s.c.width * k, s.c.height * k); } }
        cx.globalAlpha = 1;
      }
      // fine detail last, so no lobe covers it: litter flecks, moss, spring bluebells
      for (const [x, y] of f.land) { yield;
        const X = x * W.cellW + W.cellW / 2, Y = W.sky + y * W.cellH + W.cellH / 2; if (X < view.x || X > view.x + view.w || Y < view.y || Y > view.y + view.h) continue;
        const g = noise(x, y, 5, hash(f.region) & 1023), rr = rng(hash(f.region + 'f') ^ (x * 977 + y * 131));
        // leaf litter flecks and moss
        for (let i = 0; i < 6; i++) { cx.globalAlpha = .45; cx.fillStyle = F.leaf[i % 3]; const lx = X + (rr() - .5) * W.cellW, ly = Y + (rr() - .5) * W.cellH; cx.beginPath(); cx.ellipse(lx, ly, 1.6 + rr() * 1.6, .9 + rr() * .7, rr() * 3, 0, Math.PI * 2); cx.fill(); }
        if (rr() < (f.def.mood === 'old' ? .5 : .25)) { cx.globalAlpha = .5; cx.fillStyle = F.moss; cx.fill(new Path2D(sceneDraw.blob(rr, X + (rr() - .5) * 20, Y + (rr() - .5) * 10, 8 + rr() * 10, 4 + rr() * 4, 7, .5))); }
        // spring bluebells in drifts under the light wood
        if (season === 'spring' && f.def.mood === 'light' && g > .4 && rr() < .5) for (let i = 0; i < 9; i++) { cx.globalAlpha = .85; cx.fillStyle = i % 3 ? '#6f78c8' : '#8c90da'; cx.beginPath(); cx.arc(X + (rr() - .5) * W.cellW, Y + (rr() - .5) * W.cellH, 1.3, 0, Math.PI * 2); cx.fill(); }
      }
      cx.globalAlpha = 1; void r;
    }
    for (const f of S.M.floors) { yield;
      if (f.kind !== 'stamp' || f.x < view.x || f.x > view.x + view.w || f.y < view.y || f.y > view.y + view.h) continue;
      const s = stampCanvas(f.id, f.v, season, f.h); if (!s) continue; const k = (f.h / s.hq) / 2; cx.drawImage(s.c, f.x - s.ox * k, f.y - s.oy * k, s.c.width * k, s.c.height * k);
    }
    // each tree's soft contact shadow on the floor, under the sprite
    for (const t of S.M.trees) { if (t.x < view.x || t.x > view.x + view.w || t.y < view.y || t.y > view.y + view.h) continue; yield; const g = cx.createRadialGradient(t.x + 6, t.y, 0, t.x + 6, t.y, t.h * .28); g.addColorStop(0, 'rgba(30,40,24,.32)'); g.addColorStop(1, 'rgba(30,40,24,0)'); cx.fillStyle = g; cx.save(); cx.translate(t.x + 6, t.y); cx.scale(1, .32); cx.translate(-t.x - 6, -t.y); cx.beginPath(); cx.arc(t.x + 6, t.y, t.h * .28, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    const key = TEX + '-' + ch.key + '-' + (++S.serial);
    S.scene.textures.addImage(key, c); ch.tex = key;   // (never redrawn: no pixel read-back) ch.bytes = c.width * c.height * 4;
    ch.image = S.scene.add.image(B.x, B.y, key).setOrigin(0, 0).setDisplaySize(B.w, B.h)   /* (exact: a 1 px overlap of two soft floors drew a dark line at every chunk edge) */.setDepth(-9594); S.root.add(ch.image); S.sortRoot = true;
    const ms = performance.now() - t0; bakes++; bakeMs += ms; worstBake = Math.max(worstBake, ms);
  }
  function dropChunk(ch) { if (ch.image) ch.image.destroy(); if (ch.tex && state.scene.textures.exists(ch.tex)) state.scene.textures.remove(ch.tex); ch.image = null; ch.tex = null; ch.bytes = 0; }

  /* ---------- trees as sprites in the object layer ---------- */
  function makeTree(t) {
    const S = state, GP = window.GardenNativePainted; if (!GP || !GP.objectImage) return null;
    const im = ok(() => GP.objectImage(S.scene, t.id, t.v, S.season, { h: t.h }, t.x, t.y, false)); if (!im) return null;
    im.setScale(im.scaleX * t.scale * (t.flip ? -1 : 1), im.scaleY * t.scale).setDepth(t.y); S.objects.add(im); t.im = im;
    return im;
  }
  function liveTextures(scene) {
    const make = (key, w, h, draw) => { const k = TEX + '-' + key; if (scene.textures.exists(k)) return k; const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); scene.textures.addCanvas(k, c); return k; };
    return {
      dapple: make('dapple', 96, 48, (cx) => { const r = rng(5); for (let i = 0; i < 7; i++) { const x = 18 + r() * 60, y = 10 + r() * 28, rr = 6 + r() * 12; const g = cx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(255,246,200,.9)'); g.addColorStop(1, 'rgba(255,246,200,0)'); cx.fillStyle = g; cx.save(); cx.translate(x, y); cx.scale(1, .55); cx.beginPath(); cx.arc(0, 0, rr, 0, Math.PI * 2); cx.restore(); cx.fill(); } }),
      shaft: make('shaft', 64, 256, (cx) => { const g = cx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,248,214,0)'); g.addColorStop(.25, 'rgba(255,238,176,.8)'); g.addColorStop(.8, 'rgba(255,230,160,.5)'); g.addColorStop(1, 'rgba(255,244,200,0)'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(22, 0); cx.lineTo(42, 0); cx.lineTo(64, 256); cx.lineTo(0, 256); cx.closePath(); cx.fill(); cx.globalCompositeOperation = 'destination-in'; const s = cx.createLinearGradient(0, 0, 64, 0); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(.5, 'rgba(0,0,0,1)'); s.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = s; cx.fillRect(0, 0, 64, 256); }),
      mote: make('mote', 8, 8, (cx) => { const g = cx.createRadialGradient(4, 4, 0, 4, 4, 4); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(1, 'rgba(255,250,220,0)'); cx.fillStyle = g; cx.fillRect(0, 0, 8, 8); }),
    };
  }

  /* ---------- the public face ---------- */
  function paint(scene, root, info, objects) {
    clear(); if (!info || !info.data || !info.cellAt || !objects) return null;
    const t0 = performance.now();
    const S = state = { scene, root, objects, W: info.W, season: info.season || 'summer', tod: info.tod || 'day', serial: 0, clock: 0, last: null, frame: 0 };
    S.M = ok(() => build(info, info.cellAt)); if (!S.M) { state = null; return null; }
    // chunks over every wood's land
    S.chunks = new Map(); const W = S.W;
    for (const f of S.M.floors) if (f.kind === 'floor') for (const [x, y] of f.land) { const X = Math.floor(x * W.cellW / CH), Y = Math.floor((W.sky + y * W.cellH) / CH), k = X + ',' + Y; if (!S.chunks.has(k)) S.chunks.set(k, { key: k, box: { x: X * CH, y: Y * CH, w: CH, h: CH }, image: null, used: 0 }); }
    // trees bucketed by chunk, made the first time their chunk is near the view
    S.buckets = new Map(); for (const t of S.M.trees) { const k = Math.floor(t.x / CH) + ',' + Math.floor(t.y / CH); if (!S.buckets.has(k)) S.buckets.set(k, { box: { x: Math.floor(t.x / CH) * CH - 140, y: Math.floor(t.y / CH) * CH - 300, w: CH + 280, h: CH + 320 }, trees: [], made: false, vis: false }); S.buckets.get(k).trees.push(t); }
    S.tex = liveTextures(scene);
    const night = S.tod === 'night', dusk = S.tod === 'dusk' || S.tod === 'dawn';
    S.light = []; const add = (im, d) => { im.setDepth(d); root.add(im); return im; };
    if (!night) {
      for (const l of S.M.lights) S.light.push({ im: add(scene.add.image(l.x, l.y, S.tex.dapple).setAlpha(0).setScale(l.k), -9593), d: l, kind: 'dapple', b: { x: l.x - 60, y: l.y - 40, w: 120, h: 80 } });
      for (const s of S.M.shafts) { const r = rng(hash('shaft' + s.x)); for (let i = 0; i < s.n; i++) { const x = s.x + (r() - .5) * 120, y = s.y + (r() - .5) * 40; S.light.push({ im: add(scene.add.image(x, y, S.tex.shaft).setOrigin(.5, 1).setAlpha(0).setRotation(-.32).setScale(.9 + r() * .8, 1 + r() * .6), 0), d: { x, y, ph: r() * 6.28, sp: .12 + r() * .1, k: dusk ? .6 : .45 }, kind: 'shaft', b: { x: x - 160, y: y - 300, w: 320, h: 320 } }); }
        for (let i = 0; i < s.n * 3; i++) { const x = s.x + (r() - .5) * 140, y = s.y - r() * 120; S.light.push({ im: add(scene.add.image(x, y, S.tex.mote).setAlpha(0), 90000 - 10), d: { x, y, ph: r() * 6.28, sp: .3 + r() * .5 }, kind: 'mote', b: { x: x - 80, y: y - 80, w: 160, h: 160 } }); } }
    }
    for (const l of S.light) if (l.kind === 'shaft') l.im.setDepth(l.d.y + 40);
    // every distinct tree texture is made now, with the ground, so walking never pays for one
    { const GP = window.GardenNativePainted, seen = new Set(); const w0 = performance.now(); for (const t of S.M.trees) { const k = t.id + '|' + t.v + '|' + t.h; if (seen.has(k)) continue; seen.add(k); if (GP && GP.objectImage) ok(() => { const im = GP.objectImage(scene, t.id, t.v, S.season, { h: t.h }, 0, 0, false); if (im) im.destroy(); }); } S.warmMs = Math.round(performance.now() - w0); S.warmCount = seen.size; }
    // and every floor stamp (ferns, bracken, holly, grasses, the clearing's flowers)
    { const w0 = performance.now(); for (const f of S.M.floors) if (f.kind === 'stamp') stampCanvas(f.id, f.v, S.season, f.h); if (S.season !== 'winter') for (const id of ['plant.wildflowers', 'plant.daisies']) for (const v of [0, 1]) stampCanvas(id, v, S.season, 12); S.warmMs += Math.round(performance.now() - w0); }
    const here = window.GardenPaintWater && GardenPaintWater.startView ? GardenPaintWater.startView(S.W) : null;
    if (here) for (const ch of S.chunks.values()) if (hit(ch.box, here)) ok(() => { const g = bakeChunk(ch); while (!g.next().done); });
    S.buildMs = Math.round(performance.now() - t0);
    return { destroy: clear };
  }
  function clear() {
    if (!state) return; const S = state; state = null;
    for (const ch of S.chunks.values()) { if (ch.image) ch.image.destroy(); if (ch.tex && S.scene.textures.exists(ch.tex)) S.scene.textures.remove(ch.tex); }
    for (const t of S.M.trees) if (t.im) t.im.destroy(); for (const l of S.light) l.im.destroy();
  }
  function tick(time, view) {
    const S = state; if (!S || !view) return; const t0 = performance.now();
    const dt = S.last == null ? 0 : Math.min(.08, Math.max(0, (time - S.last) / 1000)); S.last = time;
    const motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(); if (motion) S.clock += dt; S.frame++;
    const near = { x: view.x - 384, y: view.y - 384, w: view.w + 768, h: view.h + 768 };
    let resident = 0, budget = 1; const vx = view.x + view.w / 2, vy = view.y + view.h / 2, pick = () => { let best = null, bd = Infinity; for (const ch of S.chunks.values()) { if (ch.image || !hit(ch.box, near) || (S.job && S.job.ch === ch)) continue; const d = Math.hypot(ch.box.x + CH / 2 - vx, (ch.box.y + CH / 2 - vy) * 1.4) - (hit(ch.box, view) ? 1e6 : 0); if (d < bd) { bd = d; best = ch; } } return best; };
    for (const ch of S.chunks.values()) if (ch.image) { resident++; if (hit(ch.box, view)) ch.used = S.frame; }
    const j0 = performance.now();
    for (let n = 0; n < 6 && performance.now() - j0 < 7; n++) {
      if (!S.job) { const todo = pick(); if (!todo) break; S.job = { ch: todo, gen: bakeChunk(todo) }; }
      let done = false; try { while (performance.now() - j0 < 7) { const g0 = performance.now(); const st = S.job.gen.next(); const gd = performance.now() - g0; if (gd > slowStep.ms) { slowStep.ms = +gd.toFixed(1); slowStep.at = S.job.ch.key + ':' + (S.job.phase || ''); } if (st.done) { done = true; break; } } } catch (e) { lastError = String(e && e.stack || e); done = true; }
      budget = 0; if (!done) break; S.job.ch.used = S.frame; S.job = null; resident++;
    }
    const tBake = performance.now() - t0; S.tw = S.tw || { bake: 0, trees: 0, sort: 0, light: 0 }; S.tw.bake = Math.max(S.tw.bake, tBake);
    if (resident > MAX_CHUNKS) { const far = [...S.chunks.values()].filter(c => c.image && !hit(c.box, near)).sort((a, b) => a.used - b.used); for (const c of far.slice(0, resident - MAX_CHUNKS)) dropChunk(c); }
    if (S.sortRoot && S.root.sort) { S.root.sort('depth'); S.sortRoot = false; }
    // trees: make a bucket's sprites once, when it comes near (one bucket a frame, and not on a bake frame)
    const pl = typeof _gw !== 'undefined' ? { x: _gw.px * S.W.cellW, y: S.W.sky + _gw.py * S.W.cellH } : null;
    for (const b of S.buckets.values()) {
      const vis = hit(b.box, view);
      // a new tree texture costs a bake: at most one a frame; trees whose texture exists are free
      if (vis && !b.made) { let all = true; for (const t of b.trees) { if (t.im || t.failed) continue; const key = 'gdpaint|' + t.id + '|' + t.v + '|' + S.season + '|0x' + t.h; if (!S.scene.textures.exists(key)) { if (budget <= 0) { all = false; continue; } budget--; } if (!makeTree(t)) t.failed = true; S.sortObjects = true; } if (all) { b.made = true; b.vis = true; } }
      if (b.made && vis !== b.vis && !(vis && !b.made)) { b.vis = vis; for (const t of b.trees) if (t.im) t.im.setVisible(vis); }
      // a crown you are under fades, so you can always see yourself
      if (vis && pl) for (const t of b.trees) { if (!t.im) continue; const under = pl.y < t.y - 4 && pl.y > t.y - t.h * t.scale * .95 && Math.abs(pl.x - t.x) < t.h * t.scale * .34; const a = under ? .5 : 1; if (t.im.alpha !== a) t.im.setAlpha(t.im.alpha + (a - t.im.alpha) * Math.min(1, dt * 8 || 1)); }
    }
    const tTrees = performance.now(); S.tw.trees = Math.max(S.tw.trees, tTrees - t0 - tBake);
    if (S.sortObjects && S.objects.sort) { S.objects.sort('depth'); S.sortObjects = false; }
    S.tw.sort = Math.max(S.tw.sort, performance.now() - tTrees);
    const pad = { x: view.x - 40, y: view.y - 40, w: view.w + 80, h: view.h + 80 }, t = S.clock;
    for (const l of S.light) {
      const vis = hit(l.b, pad); if (vis !== l.vis) { l.vis = vis; l.im.setVisible(vis); } if (!vis) continue;
      const d = l.d;
      if (l.kind === 'dapple') l.im.setPosition(d.x + Math.sin(t * d.sp + d.ph) * 6, d.y + Math.cos(t * d.sp * .7 + d.ph) * 3).setAlpha(.16 + (Math.sin(t * d.sp * 2.3 + d.ph) * .5 + .5) * .16);
      else if (l.kind === 'shaft') l.im.setAlpha(d.k * (.55 + Math.sin(t * d.sp + d.ph) * .45));
      else { const f = (t * d.sp * .2 + d.ph / 6.28) % 1; l.im.setPosition(d.x + Math.sin(t * .6 + d.ph) * 10, d.y - f * 60).setAlpha(Math.sin(f * Math.PI) * .7); }
    }
    tickWorst = Math.max(tickWorst, performance.now() - t0);
  }
  function memory() { const S = state; if (!S) return null; let bytes = 0, resident = 0; for (const c of S.chunks.values()) if (c.image) { bytes += c.bytes; resident++; } return { chunks: S.chunks.size, resident, mb: +(bytes / 1048576).toFixed(1), capMb: +(MAX_CHUNKS * CH * CH * K * K * 4 / 1048576).toFixed(1) }; }
  function treeTextures() { const S = state; if (!S) return null; const keys = new Set(); let bytes = 0; for (const t of S.M.trees) if (t.im && t.im.texture && !keys.has(t.im.texture.key)) { keys.add(t.im.texture.key); const src = t.im.texture.getSourceImage(); bytes += (src.width || 0) * (src.height || 0) * 4; } return { textures: keys.size, mb: +(bytes / 1048576).toFixed(1) }; }
  function status() { const S = state; return { slowStep, tw: S && S.tw, treeTex: treeTextures(), warm: S ? [S.warmCount, S.warmMs] : null, on: !!S, trees: S ? S.M.trees.length : 0, made: S ? S.M.trees.filter(t => t.im).length : 0, lights: S ? S.light.length : 0, buildMs: S && S.buildMs, bakes, bakeMs: Math.round(bakeMs), worstBake: Math.round(worstBake), tickWorst: +tickWorst.toFixed(1), memory: memory(), lastError }; }
  /** True where a painted wood stands (the world then leaves out its own forest trees there). Cell units. */
  function covers(cx, cy) { const D = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data; if (!D || !D.regions) return false; for (const r of D.regions) { const def = WOODS[r.id]; if (def && def.mood !== 'meadow' && inside(cx, cy, r.polygons[0])) return true; } return false; }
  return { paint, tick, clear, status, memory, covers, WOODS, get lastError() { return lastError; } };
})();

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
  // The floor's sharpness follows the camera (GardenPaintGround.levelFor): a chunk is baked at the level the zoom needs and
  // baked again, behind the old picture, when you zoom in; CAP_MB bounds what is held.
  const CH = 256, MAX_CHUNKS = 56, CAP_MB = 44, TEX = 'gpwd', BLEED = 2, FLOOR_REACH = 128;
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
    out.groundLayout = window.GardenPaintVale && GardenPaintVale.readLayout ? GardenPaintVale.readLayout(W, data, cellAt) : null;
    const pres = data.presentation || {}, plazas = (pres.plazas || []).filter(p => p.rx || /clearing|court/.test(p.id));
    // round every landmark, and four rows in front of it: a crown there would hide the house, its door and whoever stands at it (Thistle's old house was lost in the canopy)
    // a story house in the woods (Hollin's hut, Thistle's old house) stands in a small glade, open to the south so the canopy never hides it
    const houses = (data.static || []).filter(s => /^ld-(woodhut|oldhouse|house)$/.test(s.id));   // (ld-house: the shut cottage up by Foxglove spring was hidden behind a row of crowns)
    for (const h of houses) plazas.push({ id: h.id + '-glade', x: h.x + (h.w || 1) / 2, y: h.y + 2.4, rx: 2.8, ry: 3, house: true });
    const statics = new Set(); for (const s of data.static || []) for (const b of [s, s.apron].filter(Boolean)) for (let y = Math.floor(b.y) - 1; y <= b.y + (b.h || 1) + 4; y++) for (let x = Math.floor(b.x) - (y > b.y + (b.h || 1) ? 2 : 1); x <= b.x + (b.w || 1) + (y > b.y + (b.h || 1) ? 1 : 0); x++) statics.add(x + ',' + y);
    const wet = c => !c || c.water || ['ocean', 'water', 'pool', 'lake', 'ice', 'beach'].includes(c.material);
    const isPath = c => c && (c.route || c.material === 'path');
    const near = (x, y, r, test) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (test(cellAt(x + dx, y + dy))) return true; return false; };
    const px = x => x * W.cellW, py = y => W.sky + y * W.cellH;
    // Centre-cell eligibility chooses the planting, not the edge of its broad
    // painted drift. Keep those drifts off the actual coast, beach and water.
    const loops = rows => { const p = new Path2D(); for (const row of rows) { if (!row || row.length < 3) continue; p.moveTo(px(row[0][0]), py(row[0][1])); for (let i = 1; i < row.length; i++) p.lineTo(px(row[i][0]), py(row[i][1])); p.closePath(); } return p; };
    const coast = data.coast && data.coast.land || [];
    { const home = (data.regions || []).find(rg => rg.id === 'home-island'); out.homePath = home && home.polygons && home.polygons.length ? loops(home.polygons) : null; }
    out.floorClip = { land: coast.length ? loops(coast) : null, water: (data.freshwater || []).filter(w => w.boundary && w.boundary.length >= 3).map(w => loops([w.boundary])), beach: Math.max(0, data.coast && data.coast.beachWidthPx || 0), routes: [] };
    const routeLines = [];
    for (const route of data.routes || []) {
      if (!route.points || route.points.length < 2) continue;
      const pts = gardenIslandRoutePath(route).points, p = new Path2D(); if (pts.length < 2) continue;
      p.moveTo(px(pts[0].x), py(pts[0].y)); for (let i = 1; i < pts.length; i++) p.lineTo(px(pts[i].x), py(pts[i].y));
      const width = gardenIslandRoadStyle(route).main ? 40 : 26;
      out.floorClip.routes.push({ path: p, width, kind: window.GardenPaintGround ? GardenPaintGround.routeKind(route) : '', yard: route.tier === 'plaza' ? Math.max(1, Number(route.widthCells) || 3) : 0 });
      routeLines.push({ pts: pts.map(q => ({ x: px(q.x), y: py(q.y) })), half: width / 2 });
    }
    // How far (world px) a trunk foot is from the edge of the nearest drawn path or plaza
    // line: a trunk never stands on a path's painted width, so it can collide without blocking it.
    const pathGap = (X, Y) => { let best = Infinity; for (const r of routeLines) for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], b = r.pts[i], dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((X - a.x) * dx + (Y - a.y) * dy) / L)), d = Math.hypot(X - a.x - dx * t, Y - a.y - dy * t) - r.half; if (d < best) best = d; } return best; };
    // (every wall: a terrace wall, a ruin wall and the rock of a scarp. Trunks stood in the old wood's ruin walls and at the foot of the Edge: the collision audit's overlap check, 18 Nov 2026)
    const wallPolys = (data.landforms || []).filter(f => /-wall$/.test(String(f.kind)) && f.polygon && f.polygon.length > 2).map(f => f.polygon);
    const onWall = (x, y) => wallPolys.some(p => [[0, 0], [.6, 0], [-.6, 0], [0, .5], [0, -.5]].some(([dx, dy]) => inside(x + dx, y + dy, p)));
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
        if (onWall(x + .5, y + 1)) continue;   // (a trunk never stands on a wall)
        // Land not yet bought in a wood is a wall to your feet: show it as one (brambles and holly in a knot), not open grass.
        // The map-wide rule (one look per kind of country): thicket in the woods (light and old), a post-and-rail fence
        // everywhere else, the valley meadow included (94-garden-paint-vale-1valley.js, which skips THICKET_WOODS).
        if (def.mood !== 'meadow' && c.locked && c.row && /^l[sc]-/.test(c.row.id || '') && !c.plantingReserved && !isPath(c)) { thicket(out, x, y, px, py, region.id); continue; }
        if (c.plantingReserved || isPath(c) || statics.has(x + ',' + y) || (c.row && c.row.plot && !c.locked) || clear(x + .5, y + .5) || byGate(x, y) || byFind(x, y)) continue;
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
          const tx = px(x + .5) + jitter[0], ty = py(y + 1) - 4 + jitter[1], scale = .8 + h3(x, y, 7) * .4;
          // Paths stay open and in view: no trunk on or at the edge of a path's painted width (it collides now), and no
          // crown sitting straight over the path just north of it (the woods lane was lost under the canopy).
          if (pathGap(tx, ty) < 14 || isPath(cellAt(x, y - 1)) || isPath(cellAt(x, y - 2)) && h3(x, y, 41) < .7) continue;
          // the trunk's foot, in cells: what the feet collide with (the crown is for walking behind)
          const half = (/birch|snag/.test(sp[0]) ? 4 : /hawthorn|yew/.test(sp[0]) ? 5 : 7) * scale;
          const trunk = { x0: (tx - half) / W.cellW, x1: (tx + half) / W.cellW, y0: (ty - 6 - W.sky) / W.cellH, y1: (ty + 1 - W.sky) / W.cellH };
          out.trees.push({ id: sp[0], v: /birch|oak/.test(sp[0]) && h3(x, y, 5) < .5 ? 1 : 0, size, h: Math.round(hgt / 10) * 10, x: tx, y: ty, flip: h3(x, y, 6) < .5, scale, region: region.id, cx: x, cy: y, trunk });
        } else if (!pathNear && roll < p + (def.mood === 'meadow' ? .3 : .2) && h3(x, y, 31) < .5) {
          const u = def.under[Math.floor(h3(x, y, 33) * def.under.length)];
          out.floors.push({ kind: 'stamp', id: u[0], v: Math.floor(h3(x, y, 34) * 3), h: 26 + h3(x, y, 35) * 16, x: px(x + .5) + (h3(x, y, 36) - .5) * 34, y: py(y + 1) - 6 - h3(x, y, 37) * 20 });   // (jittered both ways: ferns stood in rows)
        }
      }
      // The outer edge of the wood (not a border shared with another painted wood) fades into the lawn instead of a ruled line.
      const edge = new Path2D(), others = (data.regions || []).filter(o => o !== region && WOODS[o.id]).map(o => o.polygons[0]);
      for (const ring of region.polygons) for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!L) continue;
        const n = Math.max(1, Math.ceil(L)), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
        for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n, mx = a[0] + (b[0] - a[0]) * (t0 + t1) / 2, my = a[1] + (b[1] - a[1]) * (t0 + t1) / 2;
          const ox = inside(mx + nx * .8, my + ny * .8, ring) ? mx - nx * .8 : mx + nx * .8, oy = inside(mx + nx * .8, my + ny * .8, ring) ? my - ny * .8 : my + ny * .8;
          if (others.some(o => inside(ox, oy, o))) continue;
          edge.moveTo(px(a[0] + (b[0] - a[0]) * t0), py(a[1] + (b[1] - a[1]) * t0)); edge.lineTo(px(a[0] + (b[0] - a[0]) * t1), py(a[1] + (b[1] - a[1]) * t1));
        }
      }
      out.floors.push({ kind: 'floor', region: region.id, def, land, season, poly, edge, path: loops(region.polygons), glades: def.mood === 'meadow' ? [] : plazas.filter(p => inside(p.x, p.y, poly)).map(p => ({ x: px(p.x), y: py(p.y), rx: ((p.rx || 3.2) + 1.2) * W.cellW, ry: ((p.ry || 2.4) + 1) * W.cellH })) });
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
    keepOldWoodInView(out, data, W, (x, y) => { const c = cellAt(x, y), r = (data.regions || []).find(q => WOODS[q.id] && WOODS[q.id].mood === 'old'); return !!(c && r && inside(x + .5, y + .5, r.polygons[0]) && !wet(c) && !c.plantingReserved && !isPath(c) && !statics.has(x + ',' + y) && !onWall(x + .5, y + 1) && !(c.row && (c.row.plot || c.locked && /^l[sc]-/.test(c.row.id || ''))) && !near(x, y, 1, isPath) && !plazas.some(p => Math.hypot((x + .5 - p.x) / ((p.rx || 3.2) + 1), (y + .5 - p.y) / ((p.ry || 2.4) + 1)) < 1)); });
    // a crown that still reaches over a story house fades as you come near it (tick)
    for (const h of houses) { const hx = (h.x + (h.w || 1) / 2) * W.cellW, hy = W.sky + (h.y + .5) * W.cellH; for (const t of out.trees) { const H = t.h * t.scale; if (hy < t.y && hy > t.y - H * .95 && Math.abs(hx - t.x) < H * .5) t.hides = { x: hx, y: hy }; } }
    return out;
  }

  // A knot of bramble, holly and bracken filling one cell, drawn upright so it hides your feet like the real thing.
  const THICKET = [['plant.hedgerow-blackberry', 32], ['plant.holly', 50], ['plant.shrub', 38], ['plant.hedgerow-blackberry', 30], ['plant.holly', 44]];
  // Whispering woodland is a light birch wood: its unbought land is birch scrub (young birches no taller than you) in bracken and fern,
  // not the old woodland's bramble and holly knot (17 Nov 2026: one locked-land rule, in local dress)
  const THICKET_LIGHT = [['tree.green-birch', 62], ['plant.bracken', 34], ['tree.pool-birch', 56], ['plant.fern', 30], ['plant.bracken', 30], ['tree.green-birch', 52]];
  function thicket(out, x, y, px, py, region) {
    const light = WOODS[region] && WOODS[region].mood === 'light';
    const have = (light ? THICKET_LIGHT : THICKET).filter(([id]) => typeof sceneObj === 'function' && sceneObj(id)); if (!have.length) return;
    const [id, h] = have[Math.floor(h3(x, y, 41) * have.length)];
    // a small tree in the knot has a trunk the feet stop at, like every other painted tree (the light woods' unbought
    // land is walked through: 94-garden-world-0walk.js gardenLockedPlotOpenToFeet), in cells at its foot
    const tx = px(x + .5) + (h3(x, y, 43) - .5) * 10, ty = py(y + .9), GW = GARDEN_WORLD;
    const trunk = /^tree\./.test(id) ? { x0: (tx - 5) / GW.cellW, x1: (tx + 5) / GW.cellW, y0: (ty - 6 - GW.sky) / GW.cellH, y1: (ty + 1 - GW.sky) / GW.cellH } : null;
    out.trees.push({ id, v: Math.floor(h3(x, y, 45) * 3), size: 0, h, x: tx, y: ty, flip: h3(x, y, 47) < .5, scale: .92 + h3(x, y, 49) * .2, region, cx: x, cy: y, thicket: true, trunk });
    if (h3(x, y, 51) < (light ? .9 : .6)) out.floors.push({ kind: 'stamp', id: light && h3(x, y, 55) < .35 ? 'plant.fern' : 'plant.bracken', v: Math.floor(h3(x, y, 52) * 3), h: 22 + h3(x, y, 53) * 8, x: px(x + .5) + (h3(x, y, 54) - .5) * 26, y: py(y + 1) - 2 });
  }
  /* The old woodland's walls, pond and ruins stay in view. Its oaks are tall
   * (a crown rises up to nine rows above its trunk), so a tree in front of a
   * wall, the pond or a ruin painted over it: the ring of wall, the postern and
   * the pond read as missing. A tree whose crown would cover one becomes a low
   * yew if that clears it, else ferns and holly at its foot. Only this wood. */
  function keepOldWoodInView(out, data, W, spotOk) {
    const region = (data.regions || []).find(r => WOODS[r.id] && WOODS[r.id].mood === 'old'); if (!region) return;
    const cw = W.cellW, ch = W.cellH, py = y => W.sky + y * ch, keep = [], poly = region.polygons[0];
    const box = (x0, y0, x1, y1) => keep.push([x0 * cw, py(y0), x1 * cw, py(y1)]);
    const LIFT = { 'ld-chapel': 6, 'ld-tower': 3.4, 'ld-statue': 2.6, 'ld-woodhut': 2.6, 'ld-icehouse': 2.2, 'ld-labyrinth': 1.2 };
    for (const s of data.static || []) if (inside(s.x + (s.w || 1) / 2, s.y + .5, poly)) box(s.x - .4, s.y + (s.h || 1) - (LIFT[s.id] || 3), s.x + (s.w || 1) + .4, s.y + (s.h || 1) + .6);
    for (const f of data.landforms || []) {
      if (f.region !== region.id || !f.polygon) continue;
      if (f.kind === 'ruin-wall') for (const [x, y] of f.polygon) box(x - .5, y - 1.7, x + .5, y + .3);
      else { const xs = f.polygon.map(p => p[0]), ys = f.polygon.map(p => p[1]); box(Math.min(...xs) - .2, Math.min(...ys) - .8, Math.max(...xs) + .2, Math.max(...ys) + .2); }
    }
    for (const w of data.freshwater || []) if (w.boundary && inside(w.wet.x + w.wet.w / 2, w.wet.y + w.wet.h / 2, poly)) { const xs = w.boundary.map(p => p[0]), ys = w.boundary.map(p => p[1]); box(Math.min(...xs) + .3, Math.min(...ys) + .3, Math.max(...xs) - .3, Math.max(...ys) - .2); }
    for (const s of (data.presentation && data.presentation.shortcuts) || []) if (s.from === region.id && s.at) box(s.at[0] - 2, s.at[1] - 1.6, s.at[0] + 1.4, s.at[1] + 1.2);
    // covered: a crown in front hides more than a quarter of it (a crown brushing the pond's far corner is fine)
    const covers = (x, y, H) => { const c = [x - H * .4, y - H, x + H * .4, y - H * .28]; return keep.some(k => { if (y <= k[3] - ch * .2) return false; const ox = Math.min(c[2], k[2]) - Math.max(c[0], k[0]), oy = Math.min(c[3], k[3]) - Math.max(c[1], k[1]); return ox > 0 && oy > 0 && ox * oy > (k[2] - k[0]) * (k[3] - k[1]) * .25; }); };
    const taken = new Set(out.trees.map(t => t.cx + ',' + t.cy)), moved = [];
    const yew = typeof sceneObj === 'function' && sceneObj('tree.proof-yew') ? 'tree.proof-yew' : null;
    out.trees = out.trees.filter(t => {
      if (t.region !== region.id || t.thicket || !covers(t.x, t.y, t.h * t.scale)) return true;
      if (yew && !covers(t.x, t.y, 130 * .82)) { t.id = yew; t.v = Math.floor(h3(t.cx, t.cy, 5) * 2); t.h = 130; t.scale = .74 + h3(t.cx, t.cy, 7) * .12; t.flip = h3(t.cx, t.cy, 6) < .5; return true; }
      // else the same tree a step or two away (behind what it hid, first), if the ground there is free
      for (const [dx, dy] of [[0, -2], [-1, -3], [1, -3], [0, -4], [-2, -1], [2, -1], [0, 2], [-2, 1], [2, 1], [0, 3]]) {
        const nx = t.cx + dx, ny = t.cy + dy, x = t.x + dx * cw, y = t.y + dy * ch;
        if (!spotOk(nx, ny) || taken.has(nx + ',' + ny) || covers(x, y, t.h * t.scale)) continue;
        // (its trunk box moves with it: it used to stay behind as a block on bare ground while the tree itself was walked through)
        moved.push(Object.assign({}, t, { x, y, cx: nx, cy: ny, trunk: t.trunk ? { x0: t.trunk.x0 + dx, x1: t.trunk.x1 + dx, y0: t.trunk.y0 + dy, y1: t.trunk.y1 + dy } : null })); taken.add(nx + ',' + ny); break;
      }
      const u = WOODS[region.id].under[Math.floor(h3(t.cx, t.cy, 33) * WOODS[region.id].under.length)];
      out.floors.push({ kind: 'stamp', id: u[0], v: Math.floor(h3(t.cx, t.cy, 34) * 3), h: 30 + h3(t.cx, t.cy, 35) * 14, x: t.x, y: t.y - 2 });
      return false;
    });
    for (const t of moved) out.trees.push(t);
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
  function* bakeChunk(ch, K) {   // a generator: it yields between cells, so a bake spreads over frames
    const t0 = performance.now(), S = state, B = ch.box, W = S.W, c = document.createElement('canvas'), E = BLEED; c.width = Math.ceil((B.w + 2 * E) * K); c.height = Math.ceil((B.h + 2 * E) * K);
    const cx = c.getContext('2d'); cx.setTransform(K, 0, 0, K, -(B.x - E) * K, -(B.y - E) * K);
    const view = { x: B.x - FLOOR_REACH, y: B.y - FLOOR_REACH, w: B.w + FLOOR_REACH * 2, h: B.h + FLOOR_REACH * 2 }, season = S.season;
    if (S.M.floorClip.land) cx.clip(S.M.floorClip.land, 'evenodd');
    for (const [f, land] of ch.floors) {
      const F = Object.assign({}, f.def.floor, (f.def.mood === 'meadow' ? MEADOW_TONE : SEASON_TONE)[season] || {}), r = rng(hash(f.region + ch.key));
      const meadow = f.def.mood === 'meadow', palette = window.GardenPaintVale && GardenPaintVale.PAL[season];
      cx.save(); cx.clip(f.path);
      if (S.M.groundLayout) GardenPaintVale.clipGround({ cx }, S.M.groundLayout, [B.x - E, B.y - E, B.x + B.w + E, B.y + B.h + E], true, !!window.GardenPaintGround);   // (with the shared kit the floor fades out over paths and yards below: no ruled ribbon)
      // One continuous floor; the river meadow shares the harbour's seasonal
      // lawn. Broad soft tone replaces opaque grass stamped once per cell.
      yield; cx.globalAlpha = 1;
      // the base is the shared kit's (94-garden-paint-ground-0kit.js): its forest floor here; a river meadow has no base of its own, the map's ground shows
      if (window.GardenPaintGround) { if (!meadow) { GardenPaintGround.paintKind(cx, f.def.mood === 'old' ? 'oldwood' : 'forest', [B.x - E, B.y - E, B.x + B.w + E, B.y + B.h + E], season); cx.globalAlpha = 1; yield; } }
      else { cx.fillStyle = meadow && palette ? palette.lawn : F.litter; cx.fillRect(B.x - E, B.y - E, B.w + 2 * E, B.h + 2 * E); }
      // Canopy shade and damp moss stay broad and soft, without hard lobes.
      for (const [x, y] of land) { yield;
        if ((x + y * 3) % 2) continue; const X = x * W.cellW + W.cellW / 2, Y = W.sky + y * W.cellH + W.cellH / 2; if (X < view.x || X > view.x + view.w || Y < view.y || Y > view.y + view.h) continue;
        const g = noise(x, y, 5, hash(f.region) & 1023), m = noise(x, y, 3.3, 501), rr = rng(hash(f.region + 'd') ^ (x * 613 + y * 271));
        const blob = (a, col, sx, sy) => {
          const px = X + (rr() - .5) * 30, py = Y + (rr() - .5) * 18, rx = W.cellW * sx, ry = W.cellH * sy, n = parseInt(col.slice(1), 16), rgb = (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255);
          cx.save(); cx.translate(px, py); cx.scale(1, ry / rx); const grad = cx.createRadialGradient(0, 0, 0, 0, 0, rx); grad.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); grad.addColorStop(.55, 'rgba(' + rgb + ',' + a * .5 + ')'); grad.addColorStop(1, 'rgba(' + rgb + ',0)'); cx.globalAlpha = 1; cx.fillStyle = grad; cx.fillRect(-rx, -rx, rx * 2, rx * 2); cx.restore();
        };
        if (g > .5) blob(Math.min(meadow ? .055 : .23, (g - .5) * .8), F.shade, 1.5, 1.4);
        else if (g < .36) blob(Math.min(meadow ? .06 : .24, (.36 - g) * .9), F.sun, 1.3, 1.1);
        if (m > .58) blob(Math.min(meadow ? .04 : .18, (m - .58) * .9), F.moss, 1.2, 1);
        else if (m < .3) blob(Math.min(meadow ? .04 : .15, (.3 - m) * .8), F.leaf[x % 3], 1.1, .9);
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
      for (const [x, y] of land) { yield;
        const X = x * W.cellW + W.cellW / 2, Y = W.sky + y * W.cellH + W.cellH / 2; if (X < view.x || X > view.x + view.w || Y < view.y || Y > view.y + view.h) continue;
        const g = noise(x, y, 5, hash(f.region) & 1023), rr = rng(hash(f.region + 'f') ^ (x * 977 + y * 131));
        // leaf litter flecks and moss
        // (with the shared kit the litter is its forest floor's, laid in drifts with a lit half to each leaf: six flat ovals a
        // cell here, on top of it, read as a polka-dot field; 19 Nov 2026)
        if (!window.GardenPaintGround) for (let i = 0; i < 6; i++) { cx.globalAlpha = .45; cx.fillStyle = F.leaf[i % 3]; const lx = X + (rr() - .5) * W.cellW, ly = Y + (rr() - .5) * W.cellH; cx.beginPath(); cx.ellipse(lx, ly, 1.6 + rr() * 1.6, .9 + rr() * .7, rr() * 3, 0, Math.PI * 2); cx.fill(); }
        if (rr() < (f.def.mood === 'old' ? .5 : .25)) { cx.globalAlpha = .5; cx.fillStyle = F.moss; cx.fill(new Path2D(sceneDraw.blob(rr, X + (rr() - .5) * 20, Y + (rr() - .5) * 10, 8 + rr() * 10, 4 + rr() * 4, 7, .5))); }
        // spring bluebells in drifts under the light wood
        if (season === 'spring' && f.def.mood === 'light' && g > .4 && rr() < .5) for (let i = 0; i < 9; i++) { cx.globalAlpha = .85; cx.fillStyle = i % 3 ? '#6f78c8' : '#8c90da'; cx.beginPath(); cx.arc(X + (rr() - .5) * W.cellW, Y + (rr() - .5) * W.cellH, 1.3, 0, Math.PI * 2); cx.fill(); }
      }
      cx.globalAlpha = 1;
      // Where a wood meets the village lawn its floor fades out over a few steps, instead of
      // stopping on the region's straight polygon edge (a hard light/dark line on the grass).
      if (S.M.homePath) { cx.globalCompositeOperation = 'destination-out'; cx.filter = 'blur(' + Math.round(14 * K) + 'px)'; cx.fillStyle = '#000'; cx.fill(S.M.homePath); cx.filter = 'none'; cx.globalCompositeOperation = 'source-over'; }
      // the wood's outer edge fades out over about a cell (the lawn beneath shows through), so there is no ruled line
      if (f.edge && !meadow) { yield; cx.save(); cx.globalCompositeOperation = 'destination-out'; cx.filter = 'blur(' + Math.round(9 * K) + 'px)'; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = 'rgba(0,0,0,.85)'; cx.lineWidth = 34; cx.stroke(f.edge); cx.filter = 'none'; cx.strokeStyle = 'rgba(0,0,0,.45)'; cx.lineWidth = 60; cx.filter = 'blur(' + Math.round(14 * K) + 'px)'; cx.stroke(f.edge); cx.restore(); }
      cx.restore(); void r;
    }
    for (const f of ch.stamps) { yield;
      const s = stampCanvas(f.id, f.v, season, f.h); if (!s) continue; const k = (f.h / s.hq) / 2; cx.drawImage(s.c, f.x - s.ox * k, f.y - s.oy * k, s.c.width * k, s.c.height * k);
    }
    // each tree's soft contact shadow on the floor, under the sprite
    for (const t of ch.shadows) { yield; const g = cx.createRadialGradient(t.x + 6, t.y, 0, t.x + 6, t.y, t.h * .28); g.addColorStop(0, 'rgba(30,40,24,.32)'); g.addColorStop(1, 'rgba(30,40,24,0)'); cx.fillStyle = g; cx.save(); cx.translate(t.x + 6, t.y); cx.scale(1, .32); cx.translate(-t.x - 6, -t.y); cx.beginPath(); cx.arc(t.x + 6, t.y, t.h * .28, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    // Remove only this texture's paint: the shared sand, water and road below
    // stay visible. This follows the continuous authored boundaries, rather
    // than cutting the litter into a staircase of beach or river cells.
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'destination-out';
    cx.fillStyle = '#000'; cx.strokeStyle = '#000'; cx.lineJoin = 'round'; cx.lineCap = 'round';
    const clip = S.M.floorClip;
    if (clip.land && clip.beach) { cx.lineWidth = clip.beach * 2; cx.stroke(clip.land); }
    for (const water of clip.water) cx.fill(water);
    if (window.GardenPaintGround) { cx.filter = 'blur(' + Math.round(5 * K) + 'px)'; for (const rt of clip.routes) { if (rt.yard) continue; cx.lineWidth = Math.max(8, (GardenPaintGround.ROUTE_WIDTH[rt.kind] || rt.width) - 2); cx.stroke(rt.path); } cx.filter = 'blur(' + Math.round(12 * K) + 'px)'; for (const rt of clip.routes) { if (!rt.yard) continue; cx.lineWidth = rt.yard * 22; cx.stroke(rt.path); } cx.filter = 'none'; }
    else for (const rt of clip.routes) { cx.lineWidth = rt.width + 4; cx.stroke(rt.path); }
    cx.globalCompositeOperation = 'source-over';
    const key = TEX + '-' + ch.key + '-' + (++S.serial);
    if (ch.image) ch.image.destroy(); if (ch.tex && S.scene.textures.exists(ch.tex)) S.scene.textures.remove(ch.tex);   // (a sharper bake replaces the old picture)
    S.scene.textures.addImage(key, c); ch.tex = key; ch.bytes = c.width * c.height * 4; ch.K = K;   // (never redrawn: no pixel read-back)
    // the canvas runs BLEED px past the chunk and shows only the chunk (a crop): edges meet exactly, and the edge
    // texels filter against real floor, so no line shows where chunks meet (an overlap drew a dark line, a bare edge a thin one)
    ch.image = S.scene.add.image(B.x - E, B.y - E, key).setOrigin(0, 0).setScale(1 / K).setCrop(E * K, E * K, B.w * K, B.h * K).setDepth(-9594); S.root.add(ch.image); S.sortRoot = true;
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
      shaft: make('shaft', 64, 256, (cx) => { const g = cx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,248,214,0)'); g.addColorStop(.25, 'rgba(255,238,176,.8)'); g.addColorStop(.8, 'rgba(255,230,160,.5)'); g.addColorStop(1, 'rgba(255,244,200,0)'); cx.fillStyle = g; cx.filter = 'blur(5px)'; cx.beginPath(); cx.moveTo(25, 0); cx.lineTo(39, 0); cx.lineTo(54, 256); cx.lineTo(10, 256); cx.closePath(); cx.fill(); cx.filter = 'none'; cx.globalCompositeOperation = 'destination-in'; const s = cx.createLinearGradient(0, 0, 64, 0); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(.5, 'rgba(0,0,0,1)'); s.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = s; cx.fillRect(0, 0, 64, 256); }),
      mote: make('mote', 8, 8, (cx) => { const g = cx.createRadialGradient(4, 4, 0, 4, 4, 4); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(1, 'rgba(255,250,220,0)'); cx.fillStyle = g; cx.fillRect(0, 0, 8, 8); }),
    };
  }

  /* ---------- the public face ---------- */
  function paint(scene, root, info, objects) {
    clear(); if (!info || !info.data || !info.cellAt || !objects) return null;
    const t0 = performance.now();
    const S = state = { scene, root, objects, W: info.W, season: info.season || 'summer', tod: info.tod || 'day', serial: 0, clock: 0, last: null, frame: 0, covering: [] };
    S.M = ok(() => build(info, info.cellAt)); if (!S.M) { state = null; return null; }
    // A lobe can cross a chunk even when no land-cell origin lies inside it.
    // Reserve every touched chunk, and bucket its contributors now: streaming
    // no longer walks a whole region three times to bake one small picture.
    S.chunks = new Map(); const W = S.W;
    const touch = (x0, y0, x1, y1, add) => {
      const cx0 = Math.max(0, Math.floor((x0 - BLEED) / CH)), cy0 = Math.max(0, Math.floor((y0 - BLEED) / CH)), cx1 = Math.min(Math.ceil(W.cols * W.cellW / CH) - 1, Math.floor((x1 + BLEED) / CH)), cy1 = Math.min(Math.ceil((W.sky + W.rows * W.cellH) / CH) - 1, Math.floor((y1 + BLEED) / CH));
      for (let Y = cy0; Y <= cy1; Y++) for (let X = cx0; X <= cx1; X++) {
        const k = X + ',' + Y; let ch = S.chunks.get(k);
        if (!ch) { ch = { key: k, box: { x: X * CH, y: Y * CH, w: CH, h: CH }, floors: new Map(), stamps: [], shadows: [], image: null, used: 0 }; S.chunks.set(k, ch); }
        add(ch);
      }
    };
    const floorRows = (ch, f) => { let rows = ch.floors.get(f); if (!rows) { rows = []; ch.floors.set(f, rows); } return rows; };
    for (const f of S.M.floors) {
      if (f.kind === 'floor') {
        for (const row of f.land) { const x = (row[0] + .5) * W.cellW, y = W.sky + (row[1] + .5) * W.cellH; touch(x - FLOOR_REACH, y - FLOOR_REACH, x + FLOOR_REACH, y + FLOOR_REACH, ch => floorRows(ch, f).push(row)); }
        for (const gl of f.glades || []) touch(gl.x - gl.rx * 1.7, gl.y - gl.ry * 1.7, gl.x + gl.rx * 1.7, gl.y + gl.ry * 1.7, ch => floorRows(ch, f));
      } else if (f.kind === 'stamp') touch(f.x - FLOOR_REACH, f.y - FLOOR_REACH, f.x + FLOOR_REACH, f.y + FLOOR_REACH, ch => ch.stamps.push(f));
    }
    for (const t of S.M.trees) { const r = t.h * .28; touch(t.x + 6 - r, t.y - r * .32, t.x + 6 + r, t.y + r * .32, ch => ch.shadows.push(t)); }
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
    const S = state; if (S) S.covering.length = 0; if (!S || !view) return; const t0 = performance.now();
    const dt = S.last == null ? 0 : Math.min(.08, Math.max(0, (time - S.last) / 1000)); S.last = time;
    const motion = typeof gardenMotionOn !== 'function' || gardenMotionOn(); if (motion) S.clock += dt; S.frame++;
    const near = { x: view.x - 384, y: view.y - 384, w: view.w + 768, h: view.h + 768 };
    {
      const cam = S.scene.cameras && S.scene.cameras.main;
      const z = cam ? cam.zoom || 1 : 1, now = performance.now();
      if (Math.abs(z - (S.zoomSeen || 0)) > z * .012) {
        S.zoomSeen = z;
        S.zoomAt = now;
      }
      if (!S.wantK || now - (S.zoomAt || 0) > 220) {
        // Limit the woodland texture resolution to the cache budget.
        S.wantK = window.GardenPaintGround ? GardenPaintGround.levelFor(z, 1, 3) : 1;
      }
    }
    const wantK = S.wantK || 1;
    let resident = 0, budget = 1; const vx = view.x + view.w / 2, vy = view.y + view.h / 2, pick = () => { let best = null, bd = Infinity; for (const ch of S.chunks.values()) { const seen = hit(ch.box, view); if (ch.image && (ch.K >= wantK || !seen) || !hit(ch.box, near) || (S.job && S.job.ch === ch)) continue; const d = Math.hypot(ch.box.x + CH / 2 - vx, (ch.box.y + CH / 2 - vy) * 1.4) - (seen ? 1e6 : 0) + (ch.image ? 5e5 : 0); if (d < bd) { bd = d; best = ch; } } return best; };
    for (const ch of S.chunks.values()) if (ch.image) { resident++; if (hit(ch.box, view)) ch.used = S.frame; }
    const j0 = performance.now();
    for (let n = 0; n < 6 && performance.now() - j0 < 7; n++) {
      if (!S.job) { const todo = pick(); if (!todo) break; S.job = { ch: todo, gen: bakeChunk(todo, hit(todo.box, view) ? wantK : Math.min(wantK, 1.5)) }; }
      let done = false; try { while (performance.now() - j0 < 7) { const g0 = performance.now(); const st = S.job.gen.next(); const gd = performance.now() - g0; if (gd > slowStep.ms) { slowStep.ms = +gd.toFixed(1); slowStep.at = S.job.ch.key + ':' + (S.job.phase || ''); } if (st.done) { done = true; break; } } } catch (e) { lastError = String(e && e.stack || e); done = true; }
      budget = 0; if (!done) break; S.job.ch.used = S.frame; S.job = null; resident++;
    }
    const tBake = performance.now() - t0; S.tw = S.tw || { bake: 0, trees: 0, sort: 0, light: 0 }; S.tw.bake = Math.max(S.tw.bake, tBake);
    { let bytes = 0; for (const c of S.chunks.values()) if (c.image) bytes += c.bytes || 0; if (resident > MAX_CHUNKS || bytes > CAP_MB * 1048576) { const far = [...S.chunks.values()].filter(c => c.image && !hit(c.box, near)).sort((a, b) => a.used - b.used); let over = bytes - CAP_MB * 1048576, n = resident - MAX_CHUNKS; for (const c of far) { if (over <= 0 && n <= 0) break; over -= c.bytes || 0; n--; dropChunk(c); } } }
    if (S.sortRoot && S.root.sort) { S.root.sort('depth'); S.sortRoot = false; }
    // trees: make a bucket's sprites once, when it comes near (one bucket a frame, and not on a bake frame)
    const pl = typeof _gw !== 'undefined' ? { x: _gw.px * S.W.cellW, y: S.W.sky + _gw.py * S.W.cellH } : null;
    let underN = 0; const fading = [];
    for (const b of S.buckets.values()) {
      const vis = hit(b.box, view);
      // a new tree texture costs a bake: at most one a frame; trees whose texture exists are free
      if (vis && !b.made) { let all = true; for (const t of b.trees) { if (t.im || t.failed) continue; const key = 'gdpaint|' + t.id + '|' + t.v + '|' + S.season + '|0x' + t.h; if (!S.scene.textures.exists(key)) { if (budget <= 0) { all = false; continue; } budget--; } if (!makeTree(t)) t.failed = true; S.sortObjects = true; } if (all) { b.made = true; b.vis = true; } }
      if (b.made && vis !== b.vis && !(vis && !b.made)) { b.vis = vis; for (const t of b.trees) if (t.im) t.im.setVisible(vis); }
      // a crown you are under fades, so you can always see yourself (a wide crown by its own width); so does a crown over a
      // story house (Hollin's hut) once you are near it
      // (the picture's width includes its shadow and dapple margins: a fruit tree's fade oval by it was twice the crown, so
      // the tree beside the orchard bell stood as a grey ghost with you a stride away; the crown is at most about its height)
      if (vis && pl) for (const t of b.trees) { if (!t.im) continue; const under = gardenCrownCovers(pl.x, pl.y, t.x, t.y, t.h * t.scale, Math.min(t.im.displayWidth, t.h * t.scale * 1.05), t.im), near = t.hides && Math.hypot((pl.x - t.hides.x) / S.W.cellW, (pl.y - t.hides.y) / S.W.cellH) < 3.5; t.fade = near || under || GardenNativePainted.fishingCrownCovers(t.im); if (under) { underN++; if (t.im.active && t.im.visible) S.covering.push(t.im); } fading.push(t); }
    }
    // Several crowns over you fade further each, so you are as easy to see under three as under one (stacked at the one-crown
    // fade you read as a ghost deep in the wood)
    const fadeTo = underN > 1 ? Math.max(.14, 1 - Math.pow(1 - GARDEN_CROWN_FADE, 1 / Math.min(3, underN))) : GARDEN_CROWN_FADE;
    for (const t of fading) { const a = t.fade ? fadeTo : 1; if (t.im.alpha !== a) t.im.setAlpha(t.im.alpha + (a - t.im.alpha) * Math.min(1, dt * 8 || 1)); }
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
  function memory() { const S = state; if (!S) return null; let bytes = 0, resident = 0; for (const c of S.chunks.values()) if (c.image) { bytes += c.bytes; resident++; } return { chunks: S.chunks.size, resident, mb: +(bytes / 1048576).toFixed(1), capMb: CAP_MB, level: S.wantK || 1 }; }
  function treeTextures() { const S = state; if (!S) return null; const keys = new Set(); let bytes = 0; for (const t of S.M.trees) if (t.im && t.im.texture && !keys.has(t.im.texture.key)) { keys.add(t.im.texture.key); const src = t.im.texture.getSourceImage(); bytes += (src.width || 0) * (src.height || 0) * 4; } return { textures: keys.size, mb: +(bytes / 1048576).toFixed(1) }; }
  function status() { const S = state; return { slowStep, tw: S && S.tw, treeTex: treeTextures(), warm: S ? [S.warmCount, S.warmMs] : null, on: !!S, trees: S ? S.M.trees.length : 0, made: S ? S.M.trees.filter(t => t.im).length : 0, lights: S ? S.light.length : 0, buildMs: S && S.buildMs, bakes, bakeMs: Math.round(bakeMs), worstBake: Math.round(worstBake), tickWorst: +tickWorst.toFixed(1), memory: memory(), lastError }; }
  /** True where a painted wood stands (the world then leaves out its own forest trees there). Cell units. */
  function covers(cx, cy) { const D = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data; if (!D || !D.regions) return false; for (const r of D.regions) { const def = WOODS[r.id]; if (def && def.mood !== 'meadow' && inside(cx, cy, r.polygons[0])) return true; } return false; }
  /** The painted trees' trunk feet, in cells ({x0, y0, x1, y1}), for the walking boxes (94-garden-world-0walk.js), and a
   * signature that changes only when the trees do (a repaint with the same trees keeps the route grid). */
  function trunks() { const S = state; if (!S || !S.M) return null; if (!S.trunks) { const list = S.M.trees.filter(t => t.trunk).map(t => t.trunk); let h = list.length; for (const b of list) h = (Math.imul(h, 31) + Math.round(b.x0 * 64) * 7 + Math.round(b.y0 * 64)) | 0; S.trunks = { list, sig: list.length + ':' + h + ':' + thicketCells().size }; } return S.trunks; }
  /** The cells a thicket knot is drawn on (cy * cols + cx), from the same model as the trees: unbought land in the old
   *  woodland stops the feet where its knot is drawn and nowhere else (94-garden-world-0walk.js gardenLockedPlotOpenToFeet). */
  function thicketCells() { const S = state; if (!S || !S.M) return null; if (!S.thicketCells) { const set = new Set(), cols = GARDEN_WORLD.cols; for (const t of S.M.trees) if (t.thicket) set.add(t.cy * cols + t.cx); S.thicketCells = set; } return S.thicketCells; }
  return { paint, tick, clear, playerCanopies: () => state ? state.covering : null, status, memory, covers, trunks, thicketCells, WOODS, thicketWood: id => !!(WOODS[id] && WOODS[id].mood !== 'meadow'), get lastError() { return lastError; } };
})();

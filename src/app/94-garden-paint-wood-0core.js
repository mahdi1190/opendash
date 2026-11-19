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
    // (19 Nov 2026, round 3: both woods are painted with the shared tree kit, GardenPaintTrees, at the world's size standard:
    //  [kit species, weight, size row, least, most] picks a height by gardenSizePx; the light wood is beech and oak with a
    //  birch in about eight (woodland.md), the old wood is yew and ancient oak with holly under them)
    'west-woods': { name: 'Whispering woodland', mood: 'light', density: .4, trees: [['kit:beech', 4, 'tree', .3, .95], ['kit:oak', 3, 'tree', .5, 1], ['kit:chestnut', 1, 'tree', .35, .85], ['kit:birch', 1.2, 'tree', 0, .4], ['kit:hawthorn', .7, 'young', .4, 1], ['kit:holly', .5, 'young', .3, 1]], under: [['plant.fern', 3], ['plant.bracken', 2], ['plant.us-ozark-fern', 2]], floor: { litter: '#7d7a4a', shade: '#3f5232', moss: '#6f8a42', sun: '#e9e0a0', leaf: ['#9a8a4e', '#b39a5a', '#6f6a3c'] } },
    'east-mill': { name: 'Millwater valley', mood: 'meadow', density: .9, trees: [['tree.canal-willow', 3, 170], ['tree.green-willow', 2, 160], ['tree.green-alder', 2, 150], ['tree.pool-birch', 1, 140]], under: [['plant.grass', 3], ['plant.wildflowers', 2], ['plant.canal-view-meadowsweet', 1]], floor: { litter: '#8fa95a', shade: '#5f7f3e', moss: '#6f9446', sun: '#c8cf82', leaf: ['#a8b866', '#7f9a4c', '#b9b070'] } },
    'southwest-ruins': { name: 'The old woodland', mood: 'old', density: .62, trees: [['kit:yew', 4, 'tree', 0, .45], ['kit:oak', 2.6, 'tree', .75, 1], ['kit:beech', 1.4, 'tree', .5, 1], ['kit:holly', 1.2, 'young', .4, 1], ['tree.wyv-snag', .5, 180]], under: [['plant.fern', 3], ['plant.us-sword-fern', 2], ['plant.bracken', 1]], floor: { litter: '#5f6a3e', shade: '#2c3c28', moss: '#5f7f3a', sun: '#d8dca0', leaf: ['#6f6a3c', '#857a44', '#4f5a32'] } },
  };
  // The rhythm of each wood, by the layout's own plot ids (woodland.md section 3, oldwood.md): tight stretches and open
  // ones. A plot named here closes the canopy round it (dense) or opens it (open), and more or fewer trees stand there; a
  // plot the layout no longer has does nothing. (The light wood: arch tight, fern hollow half, the clearing open, bluebell
  // wood dense, buttercup glade open, the east stones bright, sallow carr enclosed, Ivy corner and Ness wood very dense,
  // then Wren cove vast. The old wood: a dark yew ring, the bright court, the walled suntrap, then the open shore.)
  const RHYTHM = {
    dense: { 'ls-ivy-corner': 1, 'ls-ness-wood': 1, 'ls-owl-wood': .85, 'ls-bluebell-wood': .7, 'ls-sallow-carr': .65, 'ls-beech-top': .5, 'ls-foxglove-strip': .35, 'ls-otter-holt': .55, 'ls-hazel-isle': .45, 'ls-ferny-way': .55, 'ls-hermit-corner': .35 },
    open: { 'ls-buttercup-bank': 1, 'ls-blackbird-corner': .9, 'ls-sunny-doorstep': .8, 'ls-hazel-copse': .7, 'ls-fern-hollow': .6, 'ls-strawberry-bank': .6, 'ls-willow-foot': .5, 'ls-rush-hollow': .45, 'ls-reed-isle': .45, 'ls-snipe-rough': .4, 'ls-rhubarb-patch': .35, 'ls-clover-corner': 1, 'ls-walnut-shade': .9, 'ls-walled-garden': 1, 'ls-silver-birches': .6, 'ls-heronry': .5, 'ls-exotic-glade': .6, 'ls-lily-pool': .4, 'ls-stone-pool': .4, 'ls-sandy-spit': 1, 'ls-spit-end': 1, 'ls-cockle-bank': 1, 'ls-otter-beach': 1, 'ls-gull-rest': 1, 'ls-tiny-isle': 1, 'ls-wader-flats': 1 },
  };
  // how much of a deciduous crown's shade is left in each season (yew and holly keep theirs all year)
  const LEAF_ON = { spring: .6, summer: 1, autumn: .8, winter: .12 };
  /** 'kit:beech' -> 'beech' (a tree painted by the shared tree kit); a library id -> null */
  const kitOf = id => typeof id === 'string' && id.startsWith('kit:') ? id.slice(4) : null;
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
    // (19 Nov 2026, round 2: the segments are bucketed in a 128 px grid, each in every bucket within its half-width and 96 px
    //  of reach: every caller only asks whether a path is within a few tens of px, and scanning every segment of the map for
    //  every tree and fern made the planting a quarter of a second)
    const GB = 128, REACH = 96, segGrid = new Map();
    for (const r of routeLines) for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], b = r.pts[i], pad = r.half + REACH, seg = [a, b, r.half];
      for (let gy = Math.floor((Math.min(a.y, b.y) - pad) / GB); gy <= Math.floor((Math.max(a.y, b.y) + pad) / GB); gy++) for (let gx = Math.floor((Math.min(a.x, b.x) - pad) / GB); gx <= Math.floor((Math.max(a.x, b.x) + pad) / GB); gx++) { const k = gx + ',' + gy; let l = segGrid.get(k); if (!l) segGrid.set(k, l = []); l.push(seg); }
    }
    const pathGap = (X, Y) => { const l = segGrid.get(Math.floor(X / GB) + ',' + Math.floor(Y / GB)); if (!l) return REACH; let best = REACH; for (const [a, b, half] of l) { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((X - a.x) * dx + (Y - a.y) * dy) / L)), d = Math.hypot(X - a.x - dx * t, Y - a.y - dy * t) - half; if (d < best) best = d; } return best; };
    // the rhythm plots (RHYTHM): how dense or open the wood is at a cell, from the plots named there
    const rhythm = [];
    for (const [id, cells] of Object.entries(data.sectionCells || {})) { const k = RHYTHM.dense[id] || -(RHYTHM.open[id] || 0); if (!k || !cells || !cells.length) continue; let sx = 0, sy = 0; for (const c of cells) { sx += c[0]; sy += c[1]; } rhythm.push({ x: sx / cells.length + .5, y: sy / cells.length + .5, k, R: k > 0 ? 4.6 + Math.sqrt(cells.length) * .4 : 3.2 + Math.sqrt(cells.length) * .4 }); }
    const moodAt = (x, y) => { let dense = 0, open = 0; for (const q of rhythm) { const d = Math.hypot(x - q.x, (y - q.y) * 1.25); if (d >= q.R) continue; const f = 1 - (d / q.R) * (d / q.R); if (q.k > 0) dense = Math.max(dense, q.k * f); else open = Math.max(open, -q.k * f); } return { dense, open }; };
    out.moodAt = moodAt;
    const wallPolys = (data.landforms || []).filter(f => f.kind === 'terrace-wall' && f.polygon && f.polygon.length > 2).map(f => f.polygon);
    // (each wall's bounding box first: every land cell of every wood tested against every terrace wall on the map was 145 ms)
    const wallBox = wallPolys.map(p => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a - .7, b - .6, c + .7, d + .6]; });
    const onWall = (x, y) => wallPolys.some((p, i) => { const k = wallBox[i]; return x >= k[0] && x <= k[2] && y >= k[1] && y <= k[3] && [[0, 0], [.6, 0], [-.6, 0], [0, .5], [0, -.5]].some(([dx, dy]) => inside(x + dx, y + dy, p)); });
    const tm = out.tm = {}, T0 = performance.now();
    for (const region of data.regions || []) {
      const def = WOODS[region.id]; if (!def) continue;
      const R0 = performance.now();
      const poly = region.polygons[0], season = info.season || 'summer';
      const species = def.trees.filter(([id]) => kitOf(id) ? !!window.GardenPaintTrees : typeof sceneObj === 'function' && sceneObj(id));
      if (!species.length) continue;
      const total = species.reduce((a, s) => a + s[1], 0), placed = [];
      // how many path cells lie under the dense middle of a crown standing at (X, Y), H tall (world px)
      const crownOnPath = (X, Y, H, F) => { const cyp = Y - H * F.cy, rx = H * F.rx * .72, ry = H * F.ry * .72; let n = 0; for (let cy = Math.floor((cyp - ry - W.sky) / W.cellH); cy <= Math.floor((cyp + ry - W.sky) / W.cellH); cy++) for (let cx = Math.floor((X - rx) / W.cellW); cx <= Math.floor((X + rx) / W.cellW); cx++) { const mx = (cx + .5) * W.cellW, my = W.sky + (cy + .5) * W.cellH; if (((mx - X) / rx) ** 2 + ((my - cyp) / ry) ** 2 > 1) continue; if (isPath(cellAt(cx, cy))) n++; } return n; };
      const kitWood = species.some(s => kitOf(s[0]));
      // the Great Oak stands alone at its clearing's edge (94-garden-paint-vale-1places.js paints it, its foot 2.9 cells east and
      // 1.5 rows north of the clearing's middle): no tree in front of its bole, none under its crown, so the landmark reads at once
      const goc = (pres.plazas || []).find(p => p.id === 'great-oak-clearing'), oakFoot = goc ? { x: goc.x + 2.9, y: goc.y - 1.5 } : null;
      const byOak = (x, y) => !!oakFoot && kitWood && Math.abs(x + .5 - oakFoot.x) < 5.4 && y + 1 - oakFoot.y > -8.5 && y + 1 - oakFoot.y < 3.2;
      const clear = (x, y) => plazas.some(p => Math.hypot((x - p.x) / ((p.rx || 3.2) + 1), (y - p.y) / ((p.ry || 2.4) + 1)) < 1);
      // the gates stay in view: no tree stands on a gate, nor where its crown would hide the arch, bridge or stair (the canopy rises up the screen)
      const fl = pres.falls, byGate = (x, y) => (data.gates || []).some(g => Math.abs(x - g.x) <= 3 && y - g.y >= -2 && y - g.y <= (kitWood ? 7 : 5)) || !!(fl && x >= fl.x - 3 && x <= fl.x + (fl.w || 3) + 2 && y >= fl.y - 1 && y <= fl.y + (fl.h || 3) + 4);   // (nor over Fleet Falls)
      const finds = typeof GARDEN_GATE_FINDS !== 'undefined' && typeof gardenGateFindPoint === 'function' ? GARDEN_GATE_FINDS.map(f => gardenGateFindPoint(f)).filter(Boolean) : [], byFind = (x, y) => finds.some(q => Math.abs(x + .5 - q.x) <= 2.5 && y + .5 - q.y >= -1 && y + .5 - q.y <= 3.5);   // (a find is never under a crown)
      let x0 = 95, y0 = 95, x1 = 0, y1 = 0;
      for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(95, Math.ceil(x1)); y1 = Math.min(95, Math.ceil(y1));
      const land = [], knots = new Map();
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!inside(x + .5, y + .5, poly)) continue; const c = cellAt(x, y); if (wet(c)) continue;
        land.push([x, y]);
        if (onWall(x + .5, y + 1)) continue;   // (a trunk never stands on a dry-stone terrace wall)
        // Land not yet bought in a wood is a wall to your feet: show it as one (brambles and holly in a knot), not open grass.
        // The map-wide rule (one look per kind of country): thicket in the woods (light and old), a post-and-rail fence
        // everywhere else, the valley meadow included (94-garden-paint-vale-1valley.js, which skips THICKET_WOODS).
        // (19 Nov 2026, round 2: one knot is composed for each plot, not one bush a cell: a plot of two rows read as two
        //  ruled bramble strips, repeated down every unbought plot in the wood)
        if (def.mood !== 'meadow' && c.locked && c.row && /^l[sc]-/.test(c.row.id || '') && !c.plantingReserved && !isPath(c)) { if (!window.GardenPaintTrees) { thicket(out, x, y, px, py, region.id); continue; } const k = c.row.id; if (!knots.has(k)) knots.set(k, []); knots.get(k).push([x, y]); continue; }
        if (c.plantingReserved || isPath(c) || statics.has(x + ',' + y) || (c.row && c.row.plot && !c.locked) || clear(x + .5, y + .5) || byGate(x, y) || byFind(x, y) || byOak(x, y)) continue;
        const grove = noise(x, y, 5, hash(region.id) & 1023), dense = noise(x, y, 2.2, 77), pathNear = near(x, y, 1, isPath), waterNear = near(x, y, 1, wet);
        // groves where the field is high, glades where it is low; a fringe of shrubs at path edges
        const bankNear = def.mood === 'meadow' && near(x, y, 2, wet) && !waterNear;
        const md = def.mood === 'meadow' ? { dense: 0, open: 0 } : moodAt(x + .5, y + .5);
        const p = def.mood === 'meadow' ? (bankNear ? def.density * (grove > .45 ? .5 : .2) : 0) * (pathNear ? .3 : 1) : def.density * (grove > .62 ? 1.25 : grove > .42 ? (def.mood === 'old' ? 1 : .8) : (def.mood === 'old' ? .5 : .18) + md.dense * .9) * (pathNear ? (def.mood === 'old' ? .6 : .35) : 1) * (waterNear ? .5 : 1) * (1 + md.dense * .8) * (1 - md.open * .8);
        const roll = h3(x, y, 9);
        if (roll < p * (.55 + dense * .6)) {
          let pick = h3(x, y, 13) * total, sp = species[0]; for (const s of species) { if ((pick -= s[1]) <= 0) { sp = s; break; } }
          // birches gather in their own drifts in the light wood (the library wood: everywhere the grove field is low; the kit
          // wood: only at the bright edge of a glade, so a birch stays about one tree in eight)
          const birch = species.find(s => /birch/.test(s[0]));
          if (def.mood === 'light' && birch && (kitOf(sp[0]) ? grove < .34 && h3(x, y, 21) < .45 : grove < .5 && h3(x, y, 21) < .6)) sp = birch;
          const kit = kitOf(sp[0]), jitter = [(h3(x, y, 2) - .5) * 26, (h3(x, y, 3) - .5) * 12];
          const tx = px(x + .5) + jitter[0], ty = py(y + 1) - 4 + jitter[1];
          if (kit) {
            // a kit tree: its height from the size standard (a mature tree 3.5 to 5 H, holly and hawthorn as young trees),
            // spaced from its neighbours by its own crown so groves read as trees, not a felt of leaves; its crown is lowered
            // (or the tree left out) until it no longer hides more than a stride of path (the woods lane was lost under the canopy)
            const F = GardenPaintTrees.form(kit), want = Math.round(gardenSizePx(sp[2], sp[3] + (sp[4] - sp[3]) * h3(x, y, 7)));
            const gap = want * F.rx * (kit === 'birch' ? .55 : kit === 'holly' || kit === 'hawthorn' ? .7 : .95) * (1 - md.dense * .3);
            if (placed.some(q => Math.hypot(q.x - tx, (q.y - ty) * 1.5) < Math.max(gap, q.gap))) continue;
            const half = Math.max(4, Math.min(13, want * F.girth * .75));
            if (pathGap(tx, ty) < half + 10) continue;
            // (the old wood's yews may close over its lane, the Hush, as a tunnel: a crown over a path fades as you walk under it)
            let h = 0; for (let k = want; k >= want * .72; k -= 8) if (crownOnPath(tx, ty, k, F) <= (def.mood === 'old' ? 4 : 2)) { h = k; break; }
            if (!h) continue;
            const trunk = { x0: (tx - half) / W.cellW, x1: (tx + half) / W.cellW, y0: (ty - 6 - W.sky) / W.cellH, y1: (ty + 1 - W.sky) / W.cellH };
            // depth: a tree deep in a grove stands in its neighbours' shade, so it is darker and cooler than one at a glade's
            // sunny edge; each tree a touch different again, so no two crowns of a kind are the same green (the wood read as one tree stamped)
            const deep = Math.max(0, Math.min(1, (grove - .3) / .5)), f = (def.mood === 'old' ? .9 : 1) - deep * (def.mood === 'old' ? .24 : .17) - h3(x, y, 71) * .07, cool = deep * .05;
            const tint = (Math.round(255 * f * (1 - cool)) << 16) | (Math.round(255 * f) << 8) | Math.round(255 * Math.min(1, f * (1 + cool)));
            const t = { id: sp[0], kit, v: Math.floor(h3(x, y, 5) * (kit === 'oak' || kit === 'beech' ? 3 : 2)), size: 0, h, x: tx, y: ty, flip: h3(x, y, 6) < .5, scale: 1, region: region.id, cx: x, cy: y, trunk, tint };
            out.trees.push(t); placed.push({ x: tx, y: ty, gap: gap * .8 });
            // its undergrowth: ferns and bracken gathered in the shade at its foot (on the shadow side, lower right), each its own size
            const nU = kit === 'birch' ? 1 : 1 + Math.floor(h3(x, y, 61) * 2.4);
            for (let k = 0; k < nU; k++) { const u = def.under[Math.floor(h3(x + k, y, 62) * def.under.length)], a = -.4 + h3(x, y + k, 63) * 1.9, d = 14 + h3(x + k, y + k, 64) * want * .22, fx = tx + Math.cos(a) * d * 1.3, fy = ty + Math.sin(a) * d * .45 + 2; if (pathGap(fx, fy) < 8) continue; out.floors.push({ kind: 'stamp', id: u[0], v: Math.floor(h3(x, y, 65 + k) * 3), h: 22 + h3(x, y, 66 + k) * 18, x: fx, y: fy }); }
            continue;
          }
          const size = 0, hgt = sp[2], scale = .8 + h3(x, y, 7) * .4;
          // Paths stay open and in view: no trunk on or at the edge of a path's painted width (it collides now), and no
          // crown sitting straight over the path just north of it (the woods lane was lost under the canopy).
          if (pathGap(tx, ty) < 14 || isPath(cellAt(x, y - 1)) || isPath(cellAt(x, y - 2)) && h3(x, y, 41) < .7) continue;
          // the trunk's foot, in cells: what the feet collide with (the crown is for walking behind)
          const half = (/birch|snag/.test(sp[0]) ? 4 : /hawthorn|yew/.test(sp[0]) ? 5 : 7) * scale;
          const trunk = { x0: (tx - half) / W.cellW, x1: (tx + half) / W.cellW, y0: (ty - 6 - W.sky) / W.cellH, y1: (ty + 1 - W.sky) / W.cellH };
          if (def.mood !== 'meadow' && placed.some(q => Math.hypot(q.x - tx, (q.y - ty) * 1.5) < q.gap)) continue;
          out.trees.push({ id: sp[0], v: /birch|oak/.test(sp[0]) && h3(x, y, 5) < .5 ? 1 : 0, size, h: Math.round(hgt / 10) * 10, x: tx, y: ty, flip: h3(x, y, 6) < .5, scale, region: region.id, cx: x, cy: y, trunk });
        } else if (!pathNear && roll < p + (def.mood === 'meadow' ? .3 : .2) && h3(x, y, 31) < (def.trees.some(s => kitOf(s[0])) ? .22 : .5)) {
          const u = def.under[Math.floor(h3(x, y, 33) * def.under.length)];
          out.floors.push({ kind: 'stamp', id: u[0], v: Math.floor(h3(x, y, 34) * 3), h: 26 + h3(x, y, 35) * 16, x: px(x + .5) + (h3(x, y, 36) - .5) * 34, y: py(y + 1) - 6 - h3(x, y, 37) * 20 });   // (jittered both ways: ferns stood in rows)
        }
      }
      tm['cells:' + region.id] = Math.round(performance.now() - R0);
      for (const [id, cells] of knots) knot(out, id, cells, px, py, region.id);
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
      // and over the open plots of its rhythm (RHYTHM.open): where the canopy breaks, the light comes down in a shaft
      for (const q of rhythm) if (q.k < -.45 && def.mood !== 'meadow' && inside(q.x, q.y, poly)) out.shafts.push({ x: px(q.x), y: py(q.y), n: 2, region: region.id });
      // the light wood also gets shafts over its biggest glades (low grove field, many land cells)
      if (def.mood === 'light') for (const [x, y] of land) if (x % 7 === 0 && y % 6 === 0 && noise(x, y, 5, hash(region.id) & 1023) < .28 && !clear(x, y)) out.shafts.push({ x: px(x + .5), y: py(y + .5), n: 2, region: region.id });
      tm[region.id] = Math.round(performance.now() - R0);
    }
    tm.plant = Math.round(performance.now() - T0);
    keepOldWoodInView(out, data, W, (x, y) => { const c = cellAt(x, y), r = (data.regions || []).find(q => WOODS[q.id] && WOODS[q.id].mood === 'old'); return !!(c && r && inside(x + .5, y + .5, r.polygons[0]) && !wet(c) && !c.plantingReserved && !isPath(c) && !statics.has(x + ',' + y) && !(c.row && (c.row.plot || c.locked && /^l[sc]-/.test(c.row.id || ''))) && !near(x, y, 1, isPath) && !plazas.some(p => Math.hypot((x + .5 - p.x) / ((p.rx || 3.2) + 1), (y + .5 - p.y) / ((p.ry || 2.4) + 1)) < 1)); });
    // a crown that still reaches over a story house fades as you come near it (tick)
    for (const h of houses) { const hx = (h.x + (h.w || 1) / 2) * W.cellW, hy = W.sky + (h.y + .5) * W.cellH; for (const t of out.trees) { const H = t.h * t.scale; if (hy < t.y && hy > t.y - H * .95 && Math.abs(hx - t.x) < H * .5) t.hides = { x: hx, y: hy }; } }
    // the canopy's shade over the whole floor, from the trees that stand there (and the rhythm plots), and each tree as dark
    // as the shade it stands in: under a closed canopy the wood is dim, its glades and lanes are the light
    tm.keep = Math.round(performance.now() - T0) - tm.plant;
    out.canopy = ok(() => canopyField(out, data, W, cellAt, plazas, moodAt, info.season || 'summer', wet, isPath));
    tm.canopy = Math.round(performance.now() - T0) - tm.plant - tm.keep;
    if (out.canopy) for (const t of out.trees) {
      if (!t.kit && !t.thicket) continue; const o = WOODS[t.region] && WOODS[t.region].mood === 'old', v = Math.min(1, out.canopy.at(t.x, t.y - 8));
      const f = (o ? .93 : 1) - v * (o ? .3 : .2) * (t.thicket ? 1.3 : 1) - h3(t.cx, t.cy, 71) * .06, cool = o ? .04 + v * .05 : v * .03;
      t.tint = (Math.round(255 * f * (1 - cool)) << 16) | (Math.round(255 * f) << 8) | Math.round(255 * Math.min(1, f * (1 + cool)));
    }
    return out;
  }

  /* The canopy's shade (19 Nov 2026, round 2: the woods read as a sunny park, one bright floor from end to end).
   * A small field over both woods, 12 world px a sample: each wood's own dimness (the old wood is dusk at noon), every
   * tree's crown laid over the ground round its foot (deciduous ones by the season, so winter opens the wood), the rhythm
   * plots closing or opening it, the lanes and the brook a little lighter, the clearings, the court and the shore open
   * sky. It is blurred once and drawn into each floor chunk at the chunk's level, smoothed up, with sun flecks cut out of
   * it, so it has no edge, no seam and no grid. */
  function canopyField(out, data, W, cellAt, plazas, moodAt, season, wet, isPath) {
    const woods = (data.regions || []).filter(r => WOODS[r.id] && WOODS[r.id].mood !== 'meadow' && r.polygons && r.polygons[0]); if (!woods.length) return null;
    let c0 = 96, r0 = 96, c1 = 0, r1 = 0; for (const rg of woods) for (const [x, y] of rg.polygons[0]) { c0 = Math.min(c0, x); r0 = Math.min(r0, y); c1 = Math.max(c1, x); r1 = Math.max(r1, y); }
    c0 = Math.max(0, Math.floor(c0) - 2); r0 = Math.max(0, Math.floor(r0) - 2); c1 = Math.min(W.cols, Math.ceil(c1) + 2); r1 = Math.min(W.rows, Math.ceil(r1) + 2);
    const ST = 12, X0 = c0 * W.cellW, Y0 = W.sky + r0 * W.cellH, nx = Math.ceil((c1 - c0) * W.cellW / ST) + 1, ny = Math.ceil((r1 - r0) * W.cellH / ST) + 1;
    const CW = c1 - c0, CR = r1 - r0, base = new Float32Array(CW * CR), mask = new Float32Array(CW * CR), oldC = new Uint8Array(CW * CR);
    const shore = c => c && (c.material === 'beach' || c.material === 'ocean');
    for (let y = r0; y < r1; y++) for (let x = c0; x < c1; x++) {
      const rg = woods.find(q => inside(x + .5, y + .5, q.polygons[0])); if (!rg) continue; const c = cellAt(x, y), i = (y - r0) * CW + x - c0, o = WOODS[rg.id].mood === 'old';
      oldC[i] = o ? 1 : 0; if (wet(c)) { mask[i] = shore(c) ? 0 : .45; continue; }
      const m = moodAt(x + .5, y + .5);
      let b = (o ? .5 : .36) + m.dense * .45; if (isPath(c)) b *= o ? .9 : .72; b *= 1 - m.open * .85;
      let sh = 9; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (shore(cellAt(x + dx, y + dy))) sh = Math.min(sh, Math.hypot(dx, dy));
      if (sh < 9) b *= Math.min(1, .25 + sh * .28);   // (the shore is open sky)
      base[i] = b; mask[i] = sh < 9 ? Math.min(1, .3 + sh * .3) : 1;
    }
    const val = new Float32Array(nx * ny), oldS = new Float32Array(nx * ny), msk = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const cx = Math.floor((X0 + i * ST) / W.cellW) - c0, cy = Math.floor((Y0 + j * ST - W.sky) / W.cellH) - r0; if (cx < 0 || cy < 0 || cx >= CW || cy >= CR) continue;
      const k = cy * CW + cx; val[j * nx + i] = base[k]; msk[j * nx + i] = mask[k]; oldS[j * nx + i] = oldC[k];
    }
    const leaf = LEAF_ON[season] == null ? 1 : LEAF_ON[season];
    for (const t of out.trees) {
      if (t.thicket) continue; const F = t.kit ? GardenPaintTrees.form(t.kit) : { rx: .32 }, w = t.kit ? (F.evergreen ? .55 : .45 * leaf) : .16 * leaf; if (w < .02) continue;
      const H = t.h * (t.scale || 1), ccx = t.x + H * .1, ccy = t.y + H * .03, rx = H * F.rx * 1.6, ry = rx * .62;
      const i0 = Math.max(0, Math.floor((ccx - rx - X0) / ST)), i1 = Math.min(nx - 1, Math.ceil((ccx + rx - X0) / ST)), j0 = Math.max(0, Math.floor((ccy - ry - Y0) / ST)), j1 = Math.min(ny - 1, Math.ceil((ccy + ry - Y0) / ST));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = (X0 + i * ST - ccx) / rx, dy = (Y0 + j * ST - ccy) / ry, d = dx * dx + dy * dy; if (d < 1) val[j * nx + i] += w * (1 - d) * (1 - d) * msk[j * nx + i]; }
    }
    // the clearings, the house glades and the court are open to the sky, with a soft rim
    for (const p of plazas) {
      const rx = (p.rx || 3.2) + .7, ry = (p.ry || 2.4) + .7, gx = p.x * W.cellW, gy = W.sky + p.y * W.cellH;
      const i0 = Math.max(0, Math.floor((gx - rx * 1.8 * W.cellW - X0) / ST)), i1 = Math.min(nx - 1, Math.ceil((gx + rx * 1.8 * W.cellW - X0) / ST)), j0 = Math.max(0, Math.floor((gy - ry * 1.8 * W.cellH - Y0) / ST)), j1 = Math.min(ny - 1, Math.ceil((gy + ry * 1.8 * W.cellH - Y0) / ST));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot((X0 + i * ST - gx) / (rx * W.cellW), (Y0 + j * ST - gy) / (ry * W.cellH)); if (d >= 1.8) continue; const f = d < 1 ? .1 : .1 + .9 * Math.pow((d - 1) / .8, 1.6); val[j * nx + i] *= f; }
    }
    const raw = document.createElement('canvas'); raw.width = nx; raw.height = ny; const rc = raw.getContext('2d'), img = rc.createImageData(nx, ny);
    for (let k = 0; k < nx * ny; k++) { const v = Math.max(0, Math.min(1, val[k])), o = oldS[k]; if (!v) continue; const a = (o ? .72 : .62) * Math.pow(v, 1.1); img.data[k * 4] = Math.round(20 - o * 8); img.data[k * 4 + 1] = Math.round(38 - o * 8); img.data[k * 4 + 2] = Math.round(26 + o * 6); img.data[k * 4 + 3] = Math.round(255 * a); }
    rc.putImageData(img, 0, 0);
    const canvas = document.createElement('canvas'); canvas.width = nx; canvas.height = ny; const bc = canvas.getContext('2d'); bc.filter = 'blur(2px)'; bc.drawImage(raw, 0, 0); bc.filter = 'none';
    const at = (x, y) => { const fx = (x - X0) / ST, fy = (y - Y0) / ST, i = Math.floor(fx), j = Math.floor(fy); if (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) return 0; const u = fx - i, v = fy - j, k = j * nx + i; return (val[k] * (1 - u) + val[k + 1] * u) * (1 - v) + (val[k + nx] * (1 - u) + val[k + nx + 1] * u) * v; };
    return { canvas, x0: X0, y0: Y0, st: ST, nx, ny, at, box: { x: X0 - ST * 4, y: Y0 - ST * 4, w: nx * ST + ST * 8, h: ny * ST + ST * 8 } };
  }
  // the canopy into one floor chunk, with sun flecks cut out of it where light gets through (fewer at dusk, none at night)
  let canopyScratch = null;
  function canopyInto(cx, CF, B, E, K, tod) {
    const w = Math.ceil((B.w + 2 * E) * K), h = Math.ceil((B.h + 2 * E) * K); if (!(w > 0 && h > 0)) return false;
    if (!canopyScratch || canopyScratch.width < w || canopyScratch.height < h) { canopyScratch = document.createElement('canvas'); canopyScratch.width = w; canopyScratch.height = h; }
    const o = canopyScratch.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.clearRect(0, 0, w, h);
    o.setTransform(K, 0, 0, K, -(B.x - E) * K, -(B.y - E) * K); o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    const s0 = Math.max(0, Math.floor((B.x - E - CF.x0) / CF.st) - 3), t0 = Math.max(0, Math.floor((B.y - E - CF.y0) / CF.st) - 3), s1 = Math.min(CF.nx, Math.ceil((B.x + B.w + E - CF.x0) / CF.st) + 3), t1 = Math.min(CF.ny, Math.ceil((B.y + B.h + E - CF.y0) / CF.st) + 3);
    if (s1 <= s0 || t1 <= t0) return false;
    o.drawImage(CF.canvas, s0, t0, s1 - s0, t1 - t0, CF.x0 + (s0 - .5) * CF.st, CF.y0 + (t0 - .5) * CF.st, (s1 - s0) * CF.st, (t1 - t0) * CF.st);
    if (tod !== 'night') {
      // sun flecks: small bright ovals in clusters under the gaps, drawn from the place (a tile's own seed), so chunks meet
      o.globalCompositeOperation = 'destination-out'; const T = 36, few = tod === 'dusk' || tod === 'dawn' ? .5 : 1;
      for (let ty = Math.floor((B.y - E - 20) / T) * T; ty < B.y + B.h + E + 20; ty += T) for (let tx = Math.floor((B.x - E - 20) / T) * T; tx < B.x + B.w + E + 20; tx += T) {
        const g = noise(tx / 48, ty / 30, 1.6, 913); if (g < .42) continue; const r = rng(h3(tx / T | 0, ty / T | 0, 917) * 2147483646 + 1), n = Math.round((g - .42) * 6 * few + r());
        for (let k = 0; k < n; k++) {
          const x = tx + r() * T, y = ty + r() * T, v = CF.at(x, y); if (v < .2) continue;
          const rx = 2.5 + r() * r() * 9, ry = rx * (.42 + r() * .18), a = Math.min(.85, .3 + v * .5) * (.6 + r() * .4);
          o.save(); o.translate(x, y); o.rotate(.28 + (r() - .5) * .3); o.scale(1, ry / rx);
          const gr = o.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(0,0,0,' + a.toFixed(3) + ')'); gr.addColorStop(.55, 'rgba(0,0,0,' + (a * .92).toFixed(3) + ')'); gr.addColorStop(.82, 'rgba(0,0,0,' + (a * .45).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');   // (a fleck has an edge: soft blobs read as smoke)
          o.fillStyle = gr; o.fillRect(-rx, -rx, rx * 2, rx * 2); o.restore();
        }
      }
      o.globalCompositeOperation = 'source-over';
    }
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = tod === 'night' ? .7 : 1; cx.globalCompositeOperation = 'source-over'; cx.drawImage(canopyScratch, 0, 0, w, h, 0, 0, w, h); cx.restore();
    return true;
  }
  /* One knot of thicket for each unbought plot in a wood: one or two young trees stand up out of the back of it, bramble,
   * briar and bracken heaped through it, each its own size, turn and place, and its own shade on the floor under it. */
  function knot(out, id, cells, px, py, region) {
    const light = WOODS[region] && WOODS[region].mood === 'light', r = rng(hash(id + '|' + region));
    const have = s => kitOf(s[0]) ? !!window.GardenPaintTrees : typeof sceneObj === 'function' && sceneObj(s[0]);
    // (19 Nov 2026, round 2: the tall trees take their sizes from the size standard: young trees in the light wood's knots,
    //  with one mature beech or oak at the back of a big one; in the old wood, where nearly all the free ground is unbought
    //  plots, a knot is grown round a mature yew, or an ancient oak, so the wood is the dark yew ring its design asks for)
    const sz = (row, a, b) => gardenSizePx(row, a + r() * (b - a));
    const TALL = (light ? [['kit:birch', 'young', 0, 1], ['kit:hawthorn', 'young', .2, .9], ['kit:holly', 'young', .2, 1], ['kit:birch', 'young', .3, 1]] : [['kit:yew', 'tree', 0, .4], ['kit:yew', 'tree', .1, .5], ['kit:holly', 'young', .4, 1], ['kit:oak', 'tree', .7, 1]]).filter(have);
    const BIG = (light ? [['kit:beech', 'tree', .2, .8], ['kit:oak', 'tree', .3, .9]] : [['kit:yew', 'tree', .2, .55]]).filter(have);
    const LOW = (light ? [['plant.hedgerow-blackberry', 26, 36], ['plant.bracken', 26, 36], ['plant.fern', 24, 34], ['plant.bracken', 24, 32], ['plant.shrub', 26, 34]] : [['plant.hedgerow-blackberry', 24, 34], ['plant.bracken', 26, 36], ['plant.us-sword-fern', 24, 34], ['plant.bracken', 24, 32], ['plant.fern', 24, 30]]).filter(have);
    if (!LOW.length) { for (const [x, y] of cells) thicket(out, x, y, px, py, region); return; }
    let x0 = 96, y0 = 96, x1 = 0, y1 = 0; for (const [x, y] of cells) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const set = new Set(cells.map(c => c[0] + ',' + c[1]));
    const spot = (yLo, yHi) => { for (let k = 0; k < 10; k++) { const cx = x0 + .12 + r() * (x1 - x0 + .76), cy = y0 + yLo + r() * (y1 - y0 + yHi - yLo); if (set.has(Math.floor(cx) + ',' + Math.floor(cy))) return [cx, cy]; } const c = cells[Math.floor(r() * cells.length)]; return [c[0] + .5, c[1] + .8]; };
    const put = (s, cx, cy) => { const kit = kitOf(s[0]), h = typeof s[1] === 'string' ? sz(s[1], s[2], s[3]) : s[1] + r() * (s[2] - s[1]); out.trees.push({ id: s[0], kit, v: Math.floor(r() * (kit ? 2 : 3)), size: 0, h: kit ? Math.round(h) : Math.round(h / 6) * 6, x: px(cx), y: py(cy), flip: r() < .5, scale: kit ? 1 : .88 + r() * .3, region, cx: Math.floor(cx), cy: Math.floor(cy), thicket: true }); };
    const nT = TALL.length ? (cells.length > 4 ? 2 : 1) + (r() < .3 ? 1 : 0) : 0;
    // the big tree stands at the back of the knot (its north row), so its crown rises behind the tangle, not over the lane in front
    if (BIG.length && (!light || cells.length > 4)) { const [cx, cy] = spot(.3, .55 - (y1 - y0)); put(BIG[Math.floor(r() * BIG.length)], cx, cy); }
    for (let k = 0; k < nT; k++) { const [cx, cy] = spot(.35, .75); put(TALL[Math.floor(r() * TALL.length)], cx, cy); }
    const nL = Math.round(cells.length * 1.25 + 1 + r() * 2);
    for (let k = 0; k < nL; k++) { const [cx, cy] = spot(.5, .98); put(LOW[Math.floor(r() * LOW.length)], cx, cy); }
    out.floors.push({ kind: 'knot', x: px((x0 + x1 + 1) / 2), y: py((y0 + y1 + 1) / 2 + .2), rx: (x1 - x0 + 1.6) * 26, ry: (y1 - y0 + 1.5) * 17, seed: hash(id) });
  }
  // A knot of bramble, holly and bracken filling one cell, drawn upright so it hides your feet like the real thing.
  // (19 Nov 2026: the holly in the knot is the tree kit's, a young holly at about one and a half times your height; the
  //  library's little holly read as a toy fir tree dotted along every unbought plot)
  const THICKET = [['plant.hedgerow-blackberry', 32], ['kit:holly', 62], ['plant.shrub', 38], ['plant.hedgerow-blackberry', 30], ['kit:holly', 54], ['plant.bracken', 30]];
  // Whispering woodland is a light birch wood: its unbought land is birch scrub (young birches no taller than you) in bracken and fern,
  // not the old woodland's bramble and holly knot (17 Nov 2026: one locked-land rule, in local dress)
  const THICKET_LIGHT = [['kit:birch', 66], ['plant.bracken', 34], ['kit:hawthorn', 52], ['plant.fern', 30], ['plant.bracken', 30], ['kit:birch', 58], ['plant.hedgerow-blackberry', 30]];
  function thicket(out, x, y, px, py, region) {
    const light = WOODS[region] && WOODS[region].mood === 'light';
    const have = (light ? THICKET_LIGHT : THICKET).filter(([id]) => kitOf(id) ? !!window.GardenPaintTrees : typeof sceneObj === 'function' && sceneObj(id)); if (!have.length) return;
    const [id, h] = have[Math.floor(h3(x, y, 41) * have.length)], kit = kitOf(id);
    out.trees.push({ id, kit, v: Math.floor(h3(x, y, 45) * (kit ? 2 : 3)), size: 0, h: kit ? Math.round(h * (.9 + h3(x, y, 49) * .22)) : h, x: px(x + .5) + (h3(x, y, 43) - .5) * 10, y: py(y + .9), flip: h3(x, y, 47) < .5, scale: kit ? 1 : .92 + h3(x, y, 49) * .2, region, cx: x, cy: y, thicket: true });
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
      if (t.region !== region.id || !covers(t.x, t.y, t.h * t.scale)) return true;
      // a knot's tall tree that would hide a landmark is grown smaller instead (a young yew, or a holly), never moved off its plot
      if (t.thicket) { if (!t.kit) return true; if (!covers(t.x, t.y, 100)) { t.h = Math.min(t.h, 92 + Math.round(h3(t.cx, t.cy, 7) * 14)); return true; } t.h = Math.min(t.h, 64); return true; }
      if (t.kit && !covers(t.x, t.y, 100)) { t.id = 'kit:yew'; t.kit = 'yew'; t.v = Math.floor(h3(t.cx, t.cy, 5) * 2); t.h = 92 + Math.round(h3(t.cx, t.cy, 7) * 14); t.scale = 1; t.flip = h3(t.cx, t.cy, 6) < .5; return true; }
      if (!t.kit && yew && !covers(t.x, t.y, 130 * .82)) { t.id = yew; t.v = Math.floor(h3(t.cx, t.cy, 5) * 2); t.h = 130; t.scale = .74 + h3(t.cx, t.cy, 7) * .12; t.flip = h3(t.cx, t.cy, 6) < .5; return true; }
      // else the same tree a step or two away (behind what it hid, first), if the ground there is free
      for (const [dx, dy] of [[0, -2], [-1, -3], [1, -3], [0, -4], [-2, -1], [2, -1], [0, 2], [-2, 1], [2, 1], [0, 3]]) {
        const nx = t.cx + dx, ny = t.cy + dy, x = t.x + dx * cw, y = t.y + dy * ch;
        if (!spotOk(nx, ny) || taken.has(nx + ',' + ny) || covers(x, y, t.h * t.scale)) continue;
        moved.push(Object.assign({}, t, { x, y, cx: nx, cy: ny })); taken.add(nx + ',' + ny); break;
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
        // (the old wood: under the yews it is dusk at noon, so its canopy shade is deeper and wider, the court and glades the only sun)
        const old = f.def.mood === 'old';
        // (19 Nov 2026, round 2: with the canopy field over a kit wood the shade and the sun are its; these per-cell soft
        //  rounds on top of the shared forest floor read as smoke-puffs at the walking zoom, so a kit wood keeps only moss)
        if (S.M.canopy && !meadow) { if (m > .62) blob(Math.min(.1, (m - .62) * .6), F.moss, 1.6, 1.2); continue; }
        if (g > (old ? .36 : .5)) blob(Math.min(meadow ? .055 : old ? .36 : .23, (g - (old ? .36 : .5)) * (old ? 1.2 : .8)), F.shade, old ? 1.9 : 1.5, old ? 1.7 : 1.4);
        else if (g < .36) blob(Math.min(meadow ? .06 : .24, (.36 - g) * .9), F.sun, 1.3, 1.1);
        if (m > .58) blob(Math.min(meadow ? .04 : .18, (m - .58) * .9), F.moss, 1.2, 1);
        else if (m < .3) blob(Math.min(meadow ? .04 : .15, (.3 - m) * .8), F.leaf[x % 3], 1.1, .9);
      }
      cx.globalAlpha = 1;
      // the clearing: a sunlit lawn of short grass opening in the litter, soft at its edge, flowers in the light
      for (const gl of f.glades || []) {
        if (!hit({ x: gl.x - gl.rx * 1.3, y: gl.y - gl.ry * 1.3, w: gl.rx * 2.6, h: gl.ry * 2.6 }, view)) continue; yield;
        const rr = rng(hash(f.region + 'glade' + gl.x)), lawn = season === 'autumn' ? '#9aa65a' : season === 'winter' ? '#a6b29a' : '#93ad5f';
        for (const [k, a] of [[1.4, .1], [1.27, .18], [1.13, .3], [1, .5], [.88, .75], [.76, 1]]) {   /* (more, fainter rings: the outer one at .35 drew a line across the lane) */ cx.globalAlpha = a; cx.fillStyle = lawn; cx.fill(new Path2D(sceneDraw.blob(rr, gl.x, gl.y, gl.rx * k, gl.ry * k, 12, .35))); }
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
        if (noise(x, y, 2.6, 515) > (f.def.mood === 'old' ? .5 : .62) && rr() < .75) { cx.globalAlpha = .42;   /* (moss in drifts, not one pad a cell at random: an even scatter read as lily pads) */ cx.fillStyle = F.moss; cx.fill(new Path2D(sceneDraw.blob(rr, X + (rr() - .5) * 20, Y + (rr() - .5) * 10, 8 + rr() * 10, 4 + rr() * 4, 7, .5))); }
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
    // a thicket knot sits in its own shade: a soft dark tangle under it, broken at its rim
    for (const f of ch.knots) { yield; const r = rng(f.seed || 7); for (let k = 0; k < 5; k++) { const x = f.x + (r() - .5) * f.rx * .9 + f.rx * .12, y = f.y + (r() - .5) * f.ry * .7 + f.ry * .1, rx = f.rx * (.45 + r() * .3), ry = f.ry * (.45 + r() * .25); cx.save(); cx.translate(x, y); cx.scale(1, ry / rx); const g = cx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(22,32,18,.34)'); g.addColorStop(.6, 'rgba(22,32,18,.18)'); g.addColorStop(1, 'rgba(22,32,18,0)'); cx.fillStyle = g; cx.fillRect(-rx, -rx, rx * 2, rx * 2); cx.restore(); } }
    for (const f of ch.stamps) { yield;
      const s = stampCanvas(f.id, f.v, season, f.h); if (!s) continue; const k = (f.h / s.hq) / 2; cx.drawImage(s.c, f.x - s.ox * k, f.y - s.oy * k, s.c.width * k, s.c.height * k);
    }
    // each tree's soft contact shadow on the floor, under the sprite
    // (a kit tree throws the kit's own shadow, below: its crown's shade laid to the lower right along the one light, with sun
    //  flecks in it, and a dark contact round the roots; under a grove of yews the shadows meet and the floor goes dark)
    for (const t of ch.shadows) { if (t.kit) continue; yield; const g = cx.createRadialGradient(t.x + 6, t.y, 0, t.x + 6, t.y, t.h * .28); g.addColorStop(0, 'rgba(30,40,24,.32)'); g.addColorStop(1, 'rgba(30,40,24,0)'); cx.fillStyle = g; cx.save(); cx.translate(t.x + 6, t.y); cx.scale(1, .32); cx.translate(-t.x - 6, -t.y); cx.beginPath(); cx.arc(t.x + 6, t.y, t.h * .28, 0, Math.PI * 2); cx.fill(); cx.restore(); }
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
    // a kit tree's shadow is laid after the paths are cut out of the floor, so it falls across a path as well as the litter
    // (cut with the floor, a shadow stopped dead at the path's edge); the water stays clear of it
    let kitShade = false;
    for (const t of ch.shadows) { if (!t.kit) continue; yield; kitShade = true; ok(() => GardenPaintTrees.groundShadow(cx, t.x, t.y, t.h, { species: t.kit, season })); cx.globalAlpha = 1; cx.filter = 'none'; }
    // the canopy's shade, over the floor and across the paths alike (a lane through a wood is in its shade too, only less)
    if (S.M.canopy && hit({ x: B.x - E, y: B.y - E, w: B.w + 2 * E, h: B.h + 2 * E }, S.M.canopy.box)) { yield; if (ok(() => canopyInto(cx, S.M.canopy, B, E, K, S.tod))) kitShade = true; }
    if (kitShade && clip.water.length) { cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = '#000'; for (const water of clip.water) cx.fill(water); cx.globalCompositeOperation = 'source-over'; }
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
  // the tree kit's texture key for a tree (GardenPaintTrees.image shares a texture per species, season, variant and height step)
  function kitKey(t, season) { const want = Math.max(30, t.h), step = want > 130 ? 48 : 24, H = Math.max(48, Math.round(want / step) * step); return 'gptree|' + t.kit + '|' + season + '|' + Math.max(0, Math.min(2, t.v | 0)) + '|' + H; }
  function makeTree(t) {
    const S = state;
    if (t.kit) {
      const im = ok(() => GardenPaintTrees.image(S.scene, { species: t.kit, season: S.season, v: t.v, h: t.h, x: t.x, y: t.y, flip: t.flip })); if (!im) return null;
      if (t.tint != null && t.tint !== 0xffffff) im.setTint(t.tint);
      im.setDepth(t.y); S.objects.add(im); t.im = im; return im;
    }
    const GP = window.GardenNativePainted; if (!GP || !GP.objectImage) return null;
    const im = ok(() => GP.objectImage(S.scene, t.id, t.v, S.season, { h: t.h }, t.x, t.y, false)); if (!im) return null;
    im.setScale(im.scaleX * t.scale * (t.flip ? -1 : 1), im.scaleY * t.scale).setDepth(t.y); if (t.tint != null && t.tint !== 0xffffff && im.setTint) im.setTint(t.tint); S.objects.add(im); t.im = im;
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
        if (!ch) { ch = { key: k, box: { x: X * CH, y: Y * CH, w: CH, h: CH }, floors: new Map(), stamps: [], shadows: [], knots: [], image: null, used: 0 }; S.chunks.set(k, ch); }
        add(ch);
      }
    };
    const floorRows = (ch, f) => { let rows = ch.floors.get(f); if (!rows) { rows = []; ch.floors.set(f, rows); } return rows; };
    for (const f of S.M.floors) {
      if (f.kind === 'floor') {
        for (const row of f.land) { const x = (row[0] + .5) * W.cellW, y = W.sky + (row[1] + .5) * W.cellH; touch(x - FLOOR_REACH, y - FLOOR_REACH, x + FLOOR_REACH, y + FLOOR_REACH, ch => floorRows(ch, f).push(row)); }
        for (const gl of f.glades || []) touch(gl.x - gl.rx * 1.7, gl.y - gl.ry * 1.7, gl.x + gl.rx * 1.7, gl.y + gl.ry * 1.7, ch => floorRows(ch, f));
      } else if (f.kind === 'stamp') touch(f.x - FLOOR_REACH, f.y - FLOOR_REACH, f.x + FLOOR_REACH, f.y + FLOOR_REACH, ch => ch.stamps.push(f));
      else if (f.kind === 'knot') touch(f.x - f.rx * 1.3, f.y - f.ry * 1.3, f.x + f.rx * 1.3, f.y + f.ry * 1.3, ch => ch.knots.push(f));
    }
    for (const t of S.M.trees) {
      if (t.kit) { const F = GardenPaintTrees.form(t.kit), sx = t.x + t.h * .22, rx = t.h * F.rx * 1.05, ry = t.h * F.rx * .42, pad = t.h * .08 + 4; touch(Math.min(t.x - t.h * .12, sx - rx * 1.2 - pad), t.y + t.h * .05 - ry * 1.2 - pad, sx + rx * 1.2 + pad, t.y + t.h * .05 + ry * 1.2 + pad, ch => ch.shadows.push(t)); continue; }
      const r = t.h * .28; touch(t.x + 6 - r, t.y - r * .32, t.x + 6 + r, t.y + r * .32, ch => ch.shadows.push(t));
    }
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
    { const GP = window.GardenNativePainted, seen = new Set(); const w0 = performance.now(); for (const t of S.M.trees) { const k = t.kit ? kitKey(t, S.season) : t.id + '|' + t.v + '|' + t.h; if (seen.has(k)) continue; seen.add(k); if (t.kit) { ok(() => { const im = GardenPaintTrees.image(scene, { species: t.kit, season: S.season, v: t.v, h: t.h, x: 0, y: 0 }); if (im) im.destroy(); }); continue; } if (GP && GP.objectImage) ok(() => { const im = GP.objectImage(scene, t.id, t.v, S.season, { h: t.h }, 0, 0, false); if (im) im.destroy(); }); } S.warmMs = Math.round(performance.now() - w0); S.warmCount = seen.size; }
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
      if (vis && !b.made) { let all = true; for (const t of b.trees) { if (t.im || t.failed) continue; const key = t.kit ? kitKey(t, S.season) : 'gdpaint|' + t.id + '|' + t.v + '|' + S.season + '|0x' + t.h; if (!S.scene.textures.exists(key)) { if (budget <= 0) { all = false; continue; } budget--; } if (!makeTree(t)) t.failed = true; S.sortObjects = true; } if (all) { b.made = true; b.vis = true; } }
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
  function status() { const S = state; return { slowStep, tw: S && S.tw, parts: S && S.M && S.M.tm, treeTex: treeTextures(), warm: S ? [S.warmCount, S.warmMs] : null, on: !!S, trees: S ? S.M.trees.length : 0, made: S ? S.M.trees.filter(t => t.im).length : 0, lights: S ? S.light.length : 0, buildMs: S && S.buildMs, bakes, bakeMs: Math.round(bakeMs), worstBake: Math.round(worstBake), tickWorst: +tickWorst.toFixed(1), memory: memory(), lastError }; }
  /** True where a painted wood stands (the world then leaves out its own forest trees there). Cell units. */
  function covers(cx, cy) { const D = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data; if (!D || !D.regions) return false; for (const r of D.regions) { const def = WOODS[r.id]; if (def && def.mood !== 'meadow' && inside(cx, cy, r.polygons[0])) return true; } return false; }
  /** The painted trees' trunk feet, in cells ({x0, y0, x1, y1}), for the walking boxes (94-garden-world-0walk.js), and a
   * signature that changes only when the trees do (a repaint with the same trees keeps the route grid). */
  function trunks() { const S = state; if (!S || !S.M) return null; if (!S.trunks) { const list = S.M.trees.filter(t => t.trunk).map(t => t.trunk); let h = list.length; for (const b of list) h = (Math.imul(h, 31) + Math.round(b.x0 * 64) * 7 + Math.round(b.y0 * 64)) | 0; S.trunks = { list, sig: list.length + ':' + h }; } return S.trunks; }
  /** How deep the canopy's shade is at a world point (0 open sky to about 1 a closed canopy), for a look at the field. */
  const canopyAt = (x, y) => state && state.M && state.M.canopy ? +state.M.canopy.at(x, y).toFixed(3) : null;
  return { paint, tick, clear, playerCanopies: () => state ? state.covering : null, status, memory, covers, trunks, WOODS, canopyAt, thicketWood: id => !!(WOODS[id] && WOODS[id].mood !== 'meadow'), get lastError() { return lastError; } };
})();

/* ============================================================
   GARDEN, the land (the drawing). The owner, 1 Nov 2026: "make everything less square, so more winding paths etc and nicer looking things overall". The walking and planting
   stay on the cell grid; what is drawn follows it loosely: a section is an outline traced round its cells and rounded off, a trail is a curve that wanders inside its cells, and a
   fence follows the outline. All of it goes in the baked ground (94-garden-art-h-life.js), so it costs one picture however rich it is. Nothing here moves on its own.

     gartLandsPlot(id, sc, o, open)      the ground of a region of the map: {s (baked), live (signs)}
     gartLandsTrails(sc, o, open)        every trail, over the plots: {s, live}
     gardenLandWorldProps(sc, o)         what stands up: the land office, features, the maze's hedges, the plots marked for building
     gardenLandLights(sc)                pools of light for the night layer
     gardenLandMini(open, season)        the land on the little map
   ============================================================ */
const _GLD_ART = (function () {
  const A = GART, f1 = A.f1, rr = A.rr;
  const W = () => GARDEN_WORLD;
  const px = (x) => x * W().cellW, py = (y) => W().sky + y * W().cellH;
  const tile = (id, season) => { const t = gardenTile(id); return season === 'winter' ? t.winter : season === 'autumn' ? t.autumn : t.c; };
  const WILD = { spring: ['#a2c866', '#88b254', '#bcd97c'], summer: ['#9cc264', '#82ac52', '#b6d278'], autumn: ['#b9b264', '#a09a50', '#cec47a'], winter: ['#bac6a8', '#a4b292', '#d2dac4'] };
  /** Quadratic curves through the midpoints of a list of points. */
  function curve(pts, closed) {
    if (pts.length < 3) return A.line(pts);
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) {
      let m = mid(pts[pts.length - 1], pts[0]), d = `M${f1(m[0])} ${f1(m[1])}`;
      for (let i = 0; i < pts.length; i++) { const p = pts[i]; m = mid(p, pts[(i + 1) % pts.length]); d += `Q${f1(p[0])} ${f1(p[1])} ${f1(m[0])} ${f1(m[1])}`; }
      return d + 'z';
    }
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) { const m = mid(pts[i], pts[i + 1]); d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(m[0])} ${f1(m[1])}`; }
    const l = pts[pts.length - 1];
    return d + `L${f1(l[0])} ${f1(l[1])}`;
  }
  /* The outline of a set of cells: its loops of edges, walked with the inside on the right. Each edge gives two points, pushed in by `inset` and wandering by up to `wob`. The same id gives the same shape in every season. */
  function loops(cells, seed, inset, wob) {
    const key = (x, y) => x + ',' + y, has = new Set(cells.map(c => key(c[0], c[1]))), next = new Map(), r = A.rng(A.hash('gld-out|' + seed));
    for (const [x, y] of cells) {
      if (!has.has(key(x, y - 1))) next.set(key(x, y), [x + 1, y, x, y - 1]);
      if (!has.has(key(x + 1, y))) next.set(key(x + 1, y) + 'r', [x + 1, y + 1, x + 1, y]);
      if (!has.has(key(x, y + 1))) next.set(key(x + 1, y + 1) + 'b', [x, y + 1, x, y + 1]);
      if (!has.has(key(x - 1, y))) next.set(key(x, y + 1) + 'l', [x, y, x - 1, y]);
    }
    const take = (vx, vy) => { for (const suf of ['', 'r', 'b', 'l']) { const k = key(vx, vy) + suf; if (next.has(k)) { const v = next.get(k); next.delete(k); return v; } } return null; };
    const out = [];
    while (next.size) {
      const k0 = next.keys().next().value, m0 = /^(-?\d+),(-?\d+)/.exec(k0);
      let vx = +m0[1], vy = +m0[2], e = take(vx, vy);
      const loop = [];
      while (e) {
        const dx = e[0] - vx, dy = e[1] - vy, nx = -dy, ny = dx, jit = () => rr(r, -wob, wob);
        const ins = (n) => n * inset;
        loop.push({ x: px(vx) + ins(nx) + jit() * 0.4, y: py(vy) + ins(ny) * 0.75 + jit() * 0.3, nb: [e[2], e[3]] });
        loop.push({ x: px(vx + dx / 2) + ins(nx) + nx * jit(), y: py(vy + dy / 2) + ins(ny) * 0.75 + ny * jit() * 0.7, nb: [e[2], e[3]] });
        vx = e[0]; vy = e[1]; e = take(vx, vy);
      }
      if (loop.length > 3) out.push(loop);
    }
    return out;
  }
  const dOf = (lp) => curve(lp.map(p => [p.x, p.y]), true);
  /* A random point in a random cell, a little in from its sides. */
  const inCell = (r, cells) => { const c = cells[Math.floor(r() * cells.length)]; return [px(c[0]) + 6 + r() * (W().cellW - 12), py(c[1]) + 5 + r() * (W().cellH - 9)]; };
  const tuft = (x, y, h, lean) => `M${f1(x - 1.6)} ${f1(y)}q${f1(lean * 0.4 - 0.4)} ${f1(-h * 0.5)} ${f1(lean - 1.4)} ${f1(-h * 0.85)}M${f1(x)} ${f1(y)}q${f1(lean * 0.4)} ${f1(-h * 0.6)} ${f1(lean)} ${f1(-h)}M${f1(x + 1.6)} ${f1(y)}q${f1(lean * 0.4 + 0.4)} ${f1(-h * 0.5)} ${f1(lean + 1.4)} ${f1(-h * 0.8)}`;
  function grassy(r, cells, col, per) { let d = ''; const n = Math.round(cells.length * (per || 1.2)); for (let i = 0; i < n; i++) { const [x, y] = inCell(r, cells); d += tuft(x, y, rr(r, 5, 10), rr(r, -2.4, 2.4)); } return A.S(col, 0.9, d, 0.7); }
  function dotsOf(r, cells, per, cols, R) { const acc = cols.map(() => ''); const n = Math.round(cells.length * per); for (let i = 0; i < n; i++) { const [x, y] = inCell(r, cells); acc[i % cols.length] += A.circ(x, y, R ? rr(r, R * 0.7, R * 1.3) : rr(r, 1.3, 2.1)); } return acc.map((d, i) => A.P(cols[i], d, 0.95)).join(''); }
  /* Rows that bend a little, one a cell-row, for a bed. */
  function rowsOf(r, cells, col, wide) {
    const by = new Map(); for (const [x, y] of cells) { if (!by.has(y)) by.set(y, []); by.get(y).push(x); }
    let d = '';
    for (const [y, xs] of by) { xs.sort((a, b) => a - b); let i0 = 0; for (let i = 1; i <= xs.length; i++) if (i === xs.length || xs[i] !== xs[i - 1] + 1) { const x0 = px(xs[i0]) + 8, x1 = px(xs[i - 1] + 1) - 8, pts = []; for (let q = x0; q <= x1; q += 16) pts.push([q, py(y) + 15 + rr(r, -3, 3)]); pts.push([x1, py(y) + 15]); d += curve(pts, false); i0 = i; } }
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${wide || 3}" stroke-linecap="round" stroke-opacity="0.55"/>`;
  }
  const PAINT = {
    bed(r, c, sc, base) { let cl = '', st = ''; for (let i = 0; i < c.length * 8; i++) { const [x, y] = inCell(r, c), R = rr(r, 0.5, 1.3); cl += A.ell(x, y, R, R * 0.66); } for (let i = 0; i < c.length; i++) { const [x, y] = inCell(r, c), R = rr(r, 1.4, 2.6); st += A.ell(x, y, R, R * 0.66); } return A.P(A.shift(base, 6, 1, -0.1), A.blob(r, ...inCell(r, c), 40, 15, 8, 0.6), 0.42) + A.P(A.shift(base, 6, 1, -0.14), cl, 0.7) + A.P('#a39684', st); },
    patch(r, c, sc, base) { return rowsOf(r, c, A.shift(base, 6, 1, -0.18), 3.8); },
    green(r, c, sc, base) { return grassy(r, c, A.shift(base, 4, 1, -0.1), 0.5) + (sc.season === 'winter' ? '' : dotsOf(r, c, 0.5, ['#fbfbf2'], 1.1)); },
    pondedge(r, c, sc, base) { return grassy(r, c, A.shift(base, 6, 1, -0.2), 0.8); },
    glass(r, c, sc, base) { return ''; },
    meadow(r, c, sc, base) { const f = sc.season === 'winter' ? ['#f4f7f8'] : sc.season === 'autumn' ? ['#d9671c', '#e8a23a'] : ['#fbfbf2', '#f6d23a', '#e0608a', '#8ab0ec']; return grassy(r, c, A.shift(base, 6, 1, -0.18), 1.5) + dotsOf(r, c, 1.2, f); },
    dell(r, c, sc, base) { let d = ''; for (let i = 0; i < c.length; i++) { const [x, y] = inCell(r, c); for (let k = -2; k <= 2; k++) d += A.leaf(x, y, k * 0.6, rr(r, 7, 11), 1.5, 0.4); } return A.P(A.shift(base, 8, 1, -0.16), A.blob(r, ...inCell(r, c), 40, 16, 9, 0.5), 0.4) + `<path fill="${sc.season === 'winter' ? '#7a8a6a' : '#2f6a34'}" fill-opacity="0.85" d="${d}"/>`; },
    herb(r, c, sc, base) { return rowsOf(r, c, A.shift(base, 0, 1, -0.14)) + dotsOf(r, c, 2.4, sc.season === 'winter' ? ['#8a9a7a'] : ['#5f9a4a', '#7fb35a', '#b48ae6'], 2); },
    rock(r, c, sc, base) { let s = '', hi = ''; for (let i = 0; i < c.length * 1.2; i++) { const [x, y] = inCell(r, c), R = rr(r, 3.5, 7.5); s += A.blob(r, x, y, R, R * 0.68, 7, 0.2); hi += A.ell(x - R * 0.3, y - R * 0.25, R * 0.4, R * 0.2); } return `<path fill="#a8a294" stroke="#6e6a5e" stroke-width="0.8" d="${s}"/>` + A.P('#d8d2c4', hi, 0.9) + grassy(r, c, '#7f9a5a', 0.7); },
    berry(r, c, sc, base) { return rowsOf(r, c, A.shift(base, 0, 1, -0.16)) + dotsOf(r, c, 1.4, ['#4f8a44'], 4) + dotsOf(r, c, 1.4, sc.season === 'winter' ? ['#b4b0a0'] : ['#c8352a', '#7a2a5a'], 1.3); },
    orchard(r, c, sc, base) { return grassy(r, c, A.shift(base, 6, 1, -0.16), 1.1) + dotsOf(r, c, 0.5, sc.season === 'autumn' ? ['#d9671c', '#c0392b', '#e8a23a'] : sc.season === 'winter' ? ['#e4e8e0'] : ['#f6e8ee', '#c8352a']); },
    wood(r, c, sc, base) { const lit = sc.season === 'autumn' ? '#c8702a' : sc.season === 'winter' ? '#c8c4b4' : '#8aaa4a'; let d = ''; for (let i = 0; i < c.length * 5; i++) { const [x, y] = inCell(r, c); d += A.leaf(x, y, r() * 6.2, rr(r, 2.4, 4.6), 1.1); } return A.P(A.shift(base, 12, 1, -0.2), A.blob(r, ...inCell(r, c), 40, 14, 9, 0.5), 0.35) + A.P(lit, d, 0.75); },
    veg(r, c, sc, base) { return rowsOf(r, c, A.shift(base, 6, 1, -0.16), 3.6); },
    rich(r, c, sc, base) { const dk = A.shift(base, 0, 1, -0.12); return A.P(dk, A.blob(r, ...inCell(r, c), 44, 18, 9, 0.5), 0.5) + rowsOf(r, c, A.shift(base, 6, 1, -0.24), 4) + dotsOf(r, c, 0.8, ['#3a2416'], 1.1); },
    nursery(r, c) { let d = ''; for (let i = 0; i < c.length * 1.4; i++) { const [x, y] = inCell(r, c); d += `M${f1(x)} ${f1(y)}v-9`; } return A.S('#8a6a44', 1.6, d) + dotsOf(r, c, 1.4, ['#6aa24a'], 2.6); },
    suntrap(r, c, sc, base) { let d = ''; for (let i = 0; i < c.length * 3; i++) { const [x, y] = inCell(r, c); d += A.blob(r, x, y, rr(r, 7, 11), rr(r, 4, 6), 7, 0.18); } return `<path fill="${A.lt(base, 0.18)}" stroke="${A.shift(base, 0, 1, -0.18)}" stroke-width="0.7" d="${d}"/>` + dotsOf(r, c, 0.7, ['#f6d23a', '#e8607a'], 1.8); },
    reed(r, c, sc) { const f = sc.season === 'winter' ? '#a8a890' : '#6f9a5a'; let d = ''; for (let i = 0; i < c.length * 3; i++) { const [x, y] = inCell(r, c); d += tuft(x, y, rr(r, 8, 14), rr(r, -1.5, 1.5)); } return A.S(f, 1, d, 0.9) + dotsOf(r, c, 0.4, sc.season === 'winter' ? ['#e8f0f4'] : ['#f6d23a'], 1.5); },
    exotic(r, c, sc, base) { let d = ''; for (let i = 0; i < c.length * 0.8; i++) { const [x, y] = inCell(r, c); for (let k = -3; k <= 3; k++) d += A.leaf(x, y, k * 0.5, rr(r, 10, 15), 2, 0.4); } return A.P(A.shift(base, -10, 1.1, 0), A.blob(r, ...inCell(r, c), 34, 14, 9, 0.5), 0.5) + `<path fill="#3f8a5a" fill-opacity="0.9" d="${d}"/>` + dotsOf(r, c, 0.5, ['#e8508a', '#f28a1a'], 2); },
  };
  /* Open water in a bank that wanders: lily pads, a little glint. Still: the water that moves is the lake. */
  function pool(s, lp, r, sc) {
    const wate = sc.rain && sc.rain.snow && sc.season === 'winter' ? ['#d6e8f0', '#c0d8e6'] : sc.tod === 'night' ? ['#2c4a78', '#1f3a68'] : ['#5fb0cc', '#3f8ebc'];
    const cells = s.cells; let o = '';
    for (const L of loops(cells, s.id + '|w', 7, 3)) o += A.P(wate[1], dOf(L));
    for (const L of loops(cells, s.id + '|w2', 12, 4)) o += A.P(wate[0], dOf(L), 0.7);
    let pads = '', flowers = '', lines = '';
    for (let i = 0; i < cells.length * 0.5; i++) { const [x, y] = inCell(r, cells), R = rr(r, 4, 7); pads += `M${f1(x)} ${f1(y)}L${f1(x + R)} ${f1(y - R * 0.1)}A${f1(R)} ${f1(R * 0.42)} 0 1 0 ${f1(x + R * 0.86)} ${f1(y + R * 0.2)}z`; if (i % 2) flowers += A.circ(x + 1, y - 1, 1.8); }
    for (let i = 0; i < cells.length; i++) { const [x, y] = inCell(r, cells), L = rr(r, 8, 20); lines += `M${f1(x)} ${f1(y)}q${f1(L / 2)} ${f1(rr(r, -1, 1))} ${f1(L)} 0`; }
    return o + A.S('#ffffff', 1, lines, 0.25) + (sc.season === 'winter' ? '' : `<path fill="#4f8f42" stroke="#2f5f2c" stroke-width="0.6" d="${pads}"/>` + A.P('#f2c4d8', flowers));
  }

  /* ---------- fences: posts and rails along a curve ---------- */
  function fenceAlong(r, pts, season) {
    if (pts.length < 2) return '';
    const wood = season === 'winter' ? ['#6a5a48', '#8f7c66', '#b09c86'] : ['#6e4c2a', '#9a7244', '#c9a26c'];
    const up = (dy) => curve(pts.map(p => [p[0], p[1] - dy]), false);
    let posts = '', caps = '', shade = '';
    pts.forEach((p, i) => { if (i % 2) return; posts += A.rrect(p[0] - 1.8, p[1] - 11, 3.6, 12, 1); caps += A.ell(p[0], p[1] - 11, 1.9, 0.9); shade += A.ell(p[0] + 2.4, p[1] + 0.8, 3.2, 1); });
    return A.P('#1c2a14', shade, 0.2) + A.S(wood[0], 2.2, up(8.2)) + A.S(wood[0], 2.2, up(3.8)) + A.S(wood[1], 1.1, up(8.8), 0.9) + `<path fill="${wood[1]}" stroke="${wood[0]}" stroke-width="0.7" d="${posts}"/>` + A.P(wood[2], caps);
  }

  /* ---------- a region ---------- */
  /* A curving edge of stones (or of low logs for a veg patch) along a bed's outline. */
  function edging(d, logs) {
    const c = logs ? ['#6e4c2a', '#9a7244', '#c9a26c'] : ['#7a6a5a', '#b8ac98', '#dcd2c0'];
    return `<path d="${d}" fill="none" stroke="#2c2418" stroke-opacity="0.16" stroke-width="7" transform="translate(1 2)"/><path d="${d}" fill="none" stroke="${c[0]}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c[1]}" stroke-width="4.200" stroke-linecap="round" stroke-dasharray="${logs ? '13 2.400' : '6 3.400'}"/><path d="${d}" fill="none" stroke="${c[2]}" stroke-width="1.100" stroke-linecap="round" stroke-dasharray="${logs ? '9 6' : '3 6'}" stroke-opacity="0.8"/>`;
  }
  /* The thickets: what nobody walks through. The trees standing in them are in the world (gardenLandTrees); this is what they stand on. Each direction has its own. */
  function thicket(cells, id, theme, sc) {
    if (!cells.length) return '';
    const season = sc.season, r = A.rng(A.hash('gld-th|' + id + '|' + season)), dk = season === 'winter' ? '#6f8470' : season === 'autumn' ? '#7f8a40' : '#4f8446', mid = season === 'winter' ? '#94a48c' : season === 'autumn' ? '#a8a450' : '#74a858';
    let s = '';
    if (theme === 'rock') {
      for (const L of loops(cells, id + '|t', -2, 8)) s += A.P(season === 'winter' ? '#c8ccc0' : '#a8ac84', dOf(L), 0.9);
      let st = '', hi = ''; for (let i = 0; i < cells.length * 1.5; i++) { const [x, y] = inCell(r, cells), R = rr(r, 6, 13); st += A.blob(r, x, y, R, R * 0.72, 8, 0.22); hi += A.ell(x - R * 0.3, y - R * 0.28, R * 0.42, R * 0.2); }
      return s + `<path fill="#9a968a" stroke="#66625a" stroke-width="0.9" d="${st}"/>` + A.P('#d4d0c4', hi, 0.9) + grassy(r, cells, '#6f8a4a', 0.8);
    }
    if (theme === 'reed') {
      for (const L of loops(cells, id + '|t', -2, 8)) s += A.P(season === 'winter' ? '#b8c0ac' : '#8aa066', dOf(L), 0.95);
      let d = ''; for (let i = 0; i < cells.length * 6; i++) { const [x, y] = inCell(r, cells); d += tuft(x, y, rr(r, 12, 22), rr(r, -2, 2)); }
      return s + A.S(season === 'winter' ? '#c8bc90' : '#5f8a4a', 1.2, d, 0.95) + dotsOf(r, cells, 0.8, season === 'winter' ? ['#a89a70'] : ['#7a5a2e'], 1.6);
    }
    for (const L of loops(cells, id + '|t', -2, 8)) s += A.P(dk, dOf(L), 0.92);
    let d1 = '', d2 = ''; for (let i = 0; i < cells.length * (theme === 'hedge' ? 2 : 3); i++) { const [x, y] = inCell(r, cells), R = rr(r, 8, 15); d1 += A.blob(r, x, y - R * 0.4, R, R * 0.8, 9, 0.2); d2 += A.blob(r, x - R * 0.25, y - R * 0.65, R * 0.55, R * 0.4, 8, 0.2); }
    return s + `<path fill="${dk}" stroke="${A.dk(dk, 0.25)}" stroke-width="0.7" d="${d1}"/>` + A.P(mid, d2, 0.95);
  }
  function plot(id, sc, o, open) {
    const M = GARDEN_LAND_MAPS[id], season = sc.season, P = WILD[season] || WILD.summer, r = A.rng(A.hash('gld-plot|' + id + '|' + season)), secs = GARDEN_LAND_SECTIONS.filter(q => q.region === id);
    let s = '', live = '';
    const all = [], solid = [];
    M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) { all.push([M.x + dx, M.y + dy]); if (row[dx] === '#') solid.push([M.x + dx, M.y + dy]); } });
    if (M.wild) {
      // out in the wild: rough grass, carrying on from the lawn
      for (const L of loops(all, id, -2, 7)) s += A.P(P[0], dOf(L));
      let dk = ''; for (let i = 0; i < all.length / 7; i++) { const [x, y] = inCell(r, all); dk += A.blob(r, x, y, rr(r, 18, 42), rr(r, 7, 15), 8, 0.5); } s += A.P(P[1], dk, 0.35);
    }
    s += thicket(solid, id, M.theme, sc);
    for (const sec of secs) {
      const isOpen = open.has(sec.id), lps = loops(sec.cells, sec.id, 5, 6.5), rs = A.rng(A.hash('gld-sec|' + sec.id + '|' + season)), K = GARDEN_LAND_KINDS[sec.kind];
      if (isOpen) {
        if (sec.fam === 'pond' || sec.fam === 'greenhouse') continue;   // (their own drawings, after this)
        const base = sec.green ? (season === 'winter' ? '#a9b98a' : season === 'autumn' ? '#a4b45e' : '#92c864') : tile(sec.tile, season), lip = A.shift(base, 8, 1, -0.24);
        for (const L of lps) s += `<path d="${dOf(L)}" fill="${lip}" transform="translate(0 ${sec.green ? 1.5 : 3.5})"/>` + A.P(base, dOf(L));   // the lip along its front: the ground steps down here
        s += sec.pool ? pool(sec, lps[0], rs, sc) : PAINT[sec.kind](rs, sec.cells, sc, base);
        if (K.edge) for (const L of lps) s += edging(dOf(L), K.edge === 'log');
        if (sec.needs) for (const L of lps) s += `<path d="${dOf(L)}" fill="none" stroke="#8a5a44" stroke-width="8" stroke-linejoin="round"/><path d="${dOf(L)}" fill="none" stroke="#b87a5a" stroke-width="5" stroke-linejoin="round" stroke-dasharray="9 1.500"/>`;   // the old wall still stands round it
        if (!K.edge) { let fr = ''; for (const L of lps) for (const q of L) for (let k = 0; k < 2; k++) fr += tuft(q.x + rr(rs, -7, 7), q.y + rr(rs, -2, 3), rr(rs, 4, 8), rr(rs, -2, 2)); s += A.S(A.shift(P[0], 6, 1, -0.12), 0.9, fr, 0.85); }
      } else {
        // not open: longer grass in clumps, a few flowers, what it will become showing faintly, and a fence where it faces land you can stand on
        if (!M.wild) for (const L of lps) s += A.P(P[0], dOf(L), 0.95);
        s += grassy(rs, sec.cells, A.shift(P[0], 6, 1, -0.2), 1.8) + dotsOf(rs, sec.cells, 0.5, season === 'winter' ? ['#f4f7f8'] : season === 'autumn' ? ['#e8a23a'] : ['#fbfbf2', '#f6d23a']);
        if (rs() < 0.4) { const [bx, by] = inCell(rs, sec.cells), R = rr(rs, 9, 15), leaf = season === 'winter' ? ['#7c8c74', '#9aa890'] : season === 'autumn' ? ['#a4742e', '#c8963e'] : ['#4f8a44', '#74ac58']; s += A.P('#1c2a14', A.ell(bx + 2, by + R * 0.3, R, R * 0.3), 0.18) + `<path fill="${leaf[0]}" stroke="${A.dk(leaf[0], 0.3)}" stroke-width="0.7" d="${A.blob(rs, bx, by - R * 0.4, R, R * 0.8, 9, 0.16)}"/>` + A.P(leaf[1], A.blob(rs, bx - R * 0.26, by - R * 0.62, R * 0.55, R * 0.42, 8, 0.2), 0.95); }
        if (sec.pool || sec.fam === 'pond') { const bx = (sec.x + sec.w / 2) * W().cellW, by = py(sec.y) + sec.h * W().cellH / 2; s += A.P(tile('pond-water', season), A.blob(rs, bx, by, sec.w * W().cellW * 0.3, sec.h * W().cellH * 0.28, 12, 0.14), 0.55); }
        for (const L of lps) {
          let run = [];
          const flush = () => { if (run.length > 1) s += fenceAlong(rs, run, season); run = []; };
          const n = L.length;
          for (let i = 0; i < n; i++) {
            const q = L[i], nb = gardenLandCell(q.nb[0], q.nb[1]);
            if (!(nb && (nb.lane || open.has(nb.id)))) { flush(); continue; }
            run.push([q.x, q.y]);
          }
          if (run.length === n) run.push(run[0]);
          flush();
        }
      }
    }
    return { s, live };
  }

  /* ---------- trails ---------- */
  /** A trail's cells as runs from its mouth: [[[x, y], ...]], each starting at the cell it branches from. */
  function runsOf(t) {
    const cells = [], key = (x, y) => x + ',' + y, has = new Set();
    for (const M of Object.values(GARDEN_LAND_MAPS)) M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) if (row[dx] === t.ch) { cells.push([M.x + dx, M.y + dy]); has.add(key(M.x + dx, M.y + dy)); } });
    const parent = t.from ? gardenLandRow(t.from) : null, adj = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const isRoot = (x, y) => adj.some(([a, b]) => { const c = gardenLandCell(x + a, y + b); return parent ? c === parent : !!(c && c.lane); });
    const start = cells.find(c => isRoot(c[0], c[1])) || cells[0], back = adj.map(([a, b]) => [start[0] + a, start[1] + b]).find(([x, y]) => { const c = gardenLandCell(x, y); return parent ? c === parent : !!(c && c.lane); });
    const seen = new Set([key(start[0], start[1])]), out = [];
    const walk = (from) => { let run = from.slice(), cur = run[run.length - 1]; for (;;) { const nx = adj.map(([a, b]) => [cur[0] + a, cur[1] + b]).filter(([x, y]) => has.has(key(x, y)) && !seen.has(key(x, y))); if (!nx.length) break; for (const q of nx.slice(1)) seen.add(key(q[0], q[1])); seen.add(key(nx[0][0], nx[0][1])); for (const q of nx.slice(1)) { const save = out.length; walk([cur, q]); void save; } run.push(nx[0]); cur = nx[0]; } out.push(run); };
    walk(back ? [back, start] : [start]);
    return { runs: out, start };
  }
  /** Points that wander inside the cells: more where the run goes up and down, because a cell is wider than it is deep. */
  function wander(run, seed) {
    const ph = (A.hash('gld-t|' + seed) % 628) / 100, pts = [];
    for (let i = 0; i < run.length; i++) {
      const [x, y] = run[i], p = run[i - 1] || run[i], n = run[i + 1] || run[i], vert = p[0] === n[0], horiz = p[1] === n[1];
      const k1 = Math.sin(i * 1.5 + ph), cx = px(x + 0.5), cy = py(y + 0.5), corner = i > 0 && i < run.length - 1 && !vert && !horiz;
      if (!corner) pts.push([cx + (vert ? k1 * 12 : 0), cy + (horiz ? k1 * 6 : 0)]);
      if (i < run.length - 1) { const q = run[i + 1], k2 = Math.sin(i * 1.5 + ph + 1.2); pts.push([px((x + q[0]) / 2 + 0.5) + (vert ? k2 * 9 : 0), py((y + q[1]) / 2 + 0.5) + (horiz ? k2 * 4 : 0)]); }
    }
    return pts;
  }
  function trails(sc, o, open) {
    const season = sc.season, sand = tile('sand', season), P = WILD[season] || WILD.summer, r = A.rng(A.hash('gld-trails|' + season));
    let s = '', live = '', under = '', top = '', closed = '', steps = '', peb = '';
    for (const t of GARDEN_LAND_TRAILS) {
      const isOpen = open.has(t.id), { runs, start } = runsOf(t);
      runs.forEach((run, ri) => {
        const keep = run;
        if (keep.length < 2) return;
        const d = curve(wander(keep, t.id + ri), false);
        if (isOpen) {
          under += d; top += d;
          for (let i = 1; i < keep.length - 1; i++) { const [x, y] = keep[i]; if (keep[i - 1][0] === x && keep[i + 1][0] === x) steps += `M${f1(px(x + 0.5) - 8)} ${f1(py(y) + 12)}q8 3 16 0M${f1(px(x + 0.5) - 7)} ${f1(py(y) + 24)}q7 3 14 0`; const [qx, qy] = [px(x) + 8 + r() * 32, py(y) + 8 + r() * 14]; peb += A.ell(qx, qy, rr(r, 0.9, 1.9), rr(r, 0.6, 1.1)); }
        } else closed += d;
      });
      // a closed trail: a little gate at its mouth, and a sign says the level when you can reach it
      if (!isOpen && (!t.from || open.has(t.from))) {   // (further off there is nothing to see of it yet)
        const gx = px(start[0] + 0.5), gy = py(start[1] + 1) - 3;
        const wood = season === 'winter' ? ['#6a5a48', '#8f7c66'] : ['#6e4c2a', '#9a7244'];
        live += `<g class="gd-landgate"><path fill="${wood[1]}" stroke="${wood[0]}" stroke-width="0.8" d="${A.rrect(gx - 15, gy - 15, 3.6, 16, 1)}${A.rrect(gx + 11.4, gy - 15, 3.6, 16, 1)}"/><path fill="none" stroke="${wood[0]}" stroke-width="2.4" d="M${f1(gx - 12)} ${f1(gy - 10)}H${f1(gx + 12)}M${f1(gx - 12)} ${f1(gy - 4)}H${f1(gx + 12)}M${f1(gx - 11)} ${f1(gy - 4)}L${f1(gx + 11)} ${f1(gy - 10)}"/></g>`;
        if (!o.photo && !o.readOnly) live += sign(gx + 26, gy, `Level ${t.lv}`, false, t.id);
      }
    }
    const mud = A.mix(sand, P[1], 0.45);
    if (under) s += `<path d="${under}" fill="none" stroke="${mud}" stroke-width="23" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.55"/>`;
    if (top) s += `<path d="${top}" fill="none" stroke="${A.mix(sand, P[0], 0.1)}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (closed) s += `<path d="${closed}" fill="none" stroke="${A.mix(sand, P[1], 0.62)}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.65"/>`;
    if (steps) s += A.S(A.shift(sand, 8, 1, -0.3), 1.6, steps, 0.6);
    if (peb) s += A.P(A.shift(sand, 10, 1, -0.25), peb, 0.7);
    // the lake's three far shores: a beach with a wandering edge, over the straight ends of the water, with its corners rounded by rocks and reeds
    { const r2 = A.rng(A.hash('gld-shore')), x0 = px(12), x1 = px(40), y0 = py(21) + 8, y1 = py(38), q = 26, pts = [];
      for (let y = y0; y < y1 - q; y += 16) pts.push([x0 + Math.sin(y * 0.03) * 9 + rr(r2, -3, 3), y]);
      pts.push([x0 + 6, y1 - 8]);
      for (let x = x0 + q; x < x1 - q; x += 24) pts.push([x, y1 + Math.sin(x * 0.02) * 7 + rr(r2, -3, 3)]);
      pts.push([x1 - 6, y1 - 8]);
      for (let y = y1 - q; y > y0; y -= 16) pts.push([x1 + Math.sin(y * 0.03 + 2) * 9 + rr(r2, -3, 3), y]);
      const d = curve(pts, false), wet = A.shift(sand, 8, 1, -0.2);
      s += `<path d="${d}" fill="none" stroke="${wet}" stroke-width="22" stroke-opacity="0.55" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${sand}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>`;
      let st = '', hi = ''; for (const [cx, cy] of [[x0 + 8, y1 - 10], [x1 - 8, y1 - 10]]) for (let i = 0; i < 6; i++) { const x = cx + rr(r2, -16, 16), y = cy + rr(r2, -9, 9), R = rr(r2, 4, 8); st += A.blob(r2, x, y, R, R * 0.7, 7, 0.2); hi += A.ell(x - R * 0.3, y - R * 0.26, R * 0.4, R * 0.18); }
      s += `<path fill="#a8a294" stroke="#6e6a5e" stroke-width="0.8" d="${st}"/>` + A.P('#d8d2c4', hi, 0.9); }
    // the price on what you can buy from here
    if (!o.photo && !o.readOnly) for (const sec of GARDEN_LAND_SECTIONS) {
      if (open.has(sec.id)) continue;
      const D = gardenLandDoor(sec); if (!D || (sec.via && !open.has(sec.via))) continue;
      const lvNow = sc.lv == null ? 99 : sc.lv, forSale = !!sec.buy && lvNow >= sec.lv;
      if (!forSale && sec.lv > lvNow + 1) continue;   // far off: the land office lists it, a sign here would only be clutter
      const noKey = forSale && sec.needs && !((sc.landShow && sc.landShow.c) || []).includes(GARDEN_LAND_KEY_ID);
      live += sign(px(D.fx + 0.5), py(D.fy + 1) - 2, noKey ? 'Key' : forSale ? String(sec.buy) : `Level ${sec.lv}`, forSale && !noKey, sec.id);
    }
    return { s, live };
  }
  function sign(sx, sy, txt, forSale, land) {
    const bw = Math.round(txt.length * 4.7 + 18), bh = 13.5, top = sy - 23;
    const mark = forSale ? `<circle cx="${f1(sx - bw / 2 + 7.8)}" cy="${f1(top + bh / 2)}" r="4.2" fill="#f2b01e" stroke="#a87412" stroke-width="1"/><circle cx="${f1(sx - bw / 2 + 6.6)}" cy="${f1(top + bh / 2 - 1.2)}" r="1.2" fill="#ffe9a8"/>`
      : `<rect x="${f1(sx - bw / 2 + 4.4)}" y="${f1(top + 5.6)}" width="6.8" height="5.6" rx="1.2" fill="#8a7a5a"/><path d="M${f1(sx - bw / 2 + 5.7)} ${f1(top + 5.6)}v-1.600a2.100 2.100 0 0 1 4.200 0v1.600" stroke="#8a7a5a" stroke-width="1.3" fill="none"/>`;
    return `<g class="gd-locksign${forSale ? ' is-sale' : ''}" data-land="${land}"><path fill="#2c2418" fill-opacity="0.18" d="${A.ell(sx + 3, sy + 0.5, 9, 2)}"/><path fill="#7a5636" stroke="#4c3420" stroke-width="0.8" d="M${f1(sx - 1.7)} ${f1(sy)}V${f1(top + bh - 1)}h3.400V${f1(sy)}z"/><rect x="${f1(sx - bw / 2)}" y="${f1(top)}" width="${bw}" height="${bh}" rx="5" fill="${forSale ? '#f8ecc8' : '#e8ddc2'}" stroke="#8a6238" stroke-width="1.3"/>`
      + `<text x="${f1(sx + 6)}" y="${f1(top + 10)}" font-size="8.4" font-family="Inter, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#5a4630">${txt}</text>${mark}</g>`;
  }
  return { plot, trails, fenceAlong, curve, loops, dOf };
})();
function gartLandsPlot(a, sc, o, open) { return _GLD_ART.plot(a, sc, o, open); }
function gartLandsTrails(sc, o, open) { return _GLD_ART.trails(sc, o, open); }

/* ---------- what stands up ---------- */
/* Every curio's own little drawing, about ten units across about 0,0. A new one is a row here and a row in GARDEN_LAND_CURIOS. */
const _GLD_CURIO_ART = {
  'clay-pipe': (A) => A.S('#e8dcc8', 1.5, 'M-4.500 -2H3') + A.P('#e8dcc8', A.rrect(2, -4, 3, 5, 1)),
  farthing: (A) => A.P('#c8843a', A.circ(0, 0, 3.6)) + A.P('#e8b070', A.circ(-1, -1, 1.2)),
  'blue-bottle': (A) => A.P('#2f5fc8', 'M-1 -5h2v2q2 1 2 3v4h-6v-4q0 -2 2 -3z'),
  'sea-shell': (A) => A.P('#f0d8c0', 'M-4 3Q-5 -4 0 -4Q5 -4 4 3z') + A.S('#b89878', 0.7, 'M0 3V-3M-2 3L-1 -3M2 3L1 -3'),
  arrowhead: (A) => A.P('#6a6a72', 'M0 -5L3 2L0 1L-3 2z'),
  token: (A) => A.P('#c8a02e', A.rrect(-3.5, -3.5, 7, 7, 1.2)) + A.P('#8a6a14', A.circ(0, 0, 1.2)),
  'tin-soldier': (A) => A.P('#2a2a40', A.rect(-1.5, 2, 3, 3)) + A.P('#c8382a', A.rect(-1.5, -2, 3, 4)) + A.P('#e8d8a8', A.circ(0, -3.4, 1.4)),
  thimble: (A) => A.P('#c8ccd4', 'M-3 3Q-3 -4 0 -4Q3 -4 3 3z') + A.S('#8a909a', 0.7, 'M-3 2H3'),
  marble: (A) => A.P('#5fb0e8', A.circ(0, 0, 3.4)) + A.S('#1f5fa8', 0.8, 'M-2 1Q0 -1 2 2') + A.P('#ffffff', A.circ(-1, -1, 0.9), 0.8),
  horseshoe: (A) => A.S('#6a6a72', 1.8, 'M-3 4V-1A3 3 0 0 1 3 -1V4'),
  ammonite: (A) => A.P('#a89878', A.circ(0, 0, 3.8)) + A.S('#6a5a3a', 0.8, 'M0 0a1 1 0 0 1 2 0a2 2 0 0 1 -4 0a3 3 0 0 1 6 0'),
  'pot-shard': (A) => A.P('#c8703a', 'M-4 -2L2 -4L4 1L-1 4z') + A.S('#2a4a6a', 0.7, 'M-2 0Q0 -2 2 0'),
  'bird-ring': (A) => A.S('#c8a02e', 1.3, A.circ(0, 0, 3)),
  stopper: (A) => A.P('#bfe0e8', 'M-1.5 4V0H-3L0 -4L3 0H1.5V4z'),
  button: (A) => A.P('#c8a02e', A.circ(0, 0, 3.4)) + A.P('#8a6a14', A.circ(-1, 0, 0.6) + A.circ(1, 0, 0.6)),
  'lead-seal': (A) => A.P('#7a7e88', A.ell(0, 0, 3.6, 3)) + A.P('#9aa0aa', A.circ(-1, -1, 0.9)),
  bell: (A) => A.P('#d8a82e', 'M-3.5 2.5Q-3 -4 0 -4Q3 -4 3.5 2.5z') + A.P('#8a6a14', A.circ(0, 3, 1)),
  spoon: (A) => A.S('#c8ccd4', 1.2, 'M-3 4L1 -1') + A.P('#c8ccd4', A.ell(2, -2.5, 1.8, 2.4)),
  'key-tag': (A) => A.P('#b8703a', 'M-3 -2L1 -4L4 -1V3H-3z') + A.P('#5a3a1a', A.circ(-1, -1, 0.6)),
  dice: (A) => A.P('#f0e8d8', A.rrect(-3.2, -3.2, 6.4, 6.4, 1.2)) + A.P('#2a2a2a', A.circ(-1.2, -1.2, 0.6) + A.circ(1.2, -1.2, 0.6) + A.circ(-1.2, 1.2, 0.6) + A.circ(1.2, 1.2, 0.6)),
  'old-key': (A) => A.S('#7a6a4a', 1.4, 'M-1 -2V4M-1 3H1.5M-1 1H1') + A.S('#7a6a4a', 1.4, A.circ(-1, -3.4, 1.8)),
};
/** Curios in rows, each at its own place on the table (so one found later does not push the others along). */
function _gldCurioRows(ids, x0, y0, cols, dx, dy) {
  const A = GART, order = GARDEN_LAND_CURIOS.map(c => c.id).concat(GARDEN_LAND_KEY_ID), have = new Set(ids);
  let s = '';
  order.forEach((id, i) => { if (!have.has(id) || !_GLD_CURIO_ART[id]) return; s += `<g transform="translate(${_gwN(x0 + (i % cols) * dx)} ${_gwN(y0 + Math.floor(i / cols) * dy)}) scale(0.9)">${_GLD_CURIO_ART[id](A)}</g>`; });
  return s;
}
function gardenLandCurioSvg(id, px) { const fn = _GLD_CURIO_ART[id]; return fn ? `<svg viewBox="-6 -6 12 12" width="${px}" height="${px}" aria-hidden="true">${fn(GART)}</svg>` : ''; }
/* The star book on a board beside the observatory: each constellation has its own shape, up as soon as you have logged it. */
const _GLD_SKY_ART = { plough: [[0, 2], [3, 3], [6, 3], [8, 5], [8, 8], [12, 8], [12, 5], [8, 5]], orion: [[2, 0], [9, 1], [4, 5], [6, 5], [8, 5], [3, 10], [10, 9]], cassiopeia: [[0, 2], [3, 7], [6, 3], [9, 8], [12, 2]], swan: [[6, 0], [6, 5], [6, 10], [1, 4], [6, 5], [11, 6]], lyre: [[6, 0], [4, 4], [8, 4], [9, 9], [3, 9], [4, 4]], 'great-bear': [[0, 1], [3, 2], [6, 2], [8, 4], [11, 3], [12, 7], [8, 7], [8, 4]], lion: [[1, 4], [3, 1], [6, 2], [7, 5], [12, 6], [9, 9], [6, 8], [7, 5]], twins: [[1, 0], [2, 5], [2, 10], [2, 5], [9, 5], [9, 0], [9, 5], [10, 10]], bull: [[0, 0], [5, 5], [9, 7], [12, 10], [9, 7], [6, 2]], eagle: [[6, 1], [6, 5], [6, 9], [1, 4], [6, 5], [11, 4]], crown: [[0, 3], [3, 7], [6, 8], [9, 7], [12, 3]], hare: [[2, 1], [4, 5], [8, 4], [11, 7], [8, 9], [4, 9], [4, 5]] };
function _gldSkyBoard(ids) {
  const A = GART, Wd = GART_PAL.wood, have = new Set(ids), bx = 34, by = -36, cw = 15, chh = 12;
  let s = A.S(Wd[0], 2, `M${bx + 4} 0V${by + 34}M${bx + 44} 0V${by + 34}`) + A.P(Wd[1], A.rrect(bx - 2, by - 2, cw * 3 + 7, chh * 3 + 3, 2)) + A.P('#1c2850', A.rect(bx, by, cw * 3 + 3, chh * 3 - 1));
  GARDEN_LAND_SKY.slice(0, 9).forEach((c, i) => {
    const ox = bx + 2 + (i % 3) * cw, oy = by + 1 + Math.floor(i / 3) * chh, P = _GLD_SKY_ART[c.id] || [];
    if (!have.has(c.id)) return;
    s += A.S('#8aa0d8', 0.5, P.map((p, k) => `${k ? 'L' : 'M'}${_gwN(ox + p[0])} ${_gwN(oy + p[1] * 0.9)}`).join('')) + A.P('#fff4c0', P.map(p => A.circ(ox + p[0], oy + p[1] * 0.9, 0.7)).join(''));
  });
  // the last three along a strip under it
  GARDEN_LAND_SKY.slice(9).forEach((c, i) => { const ox = bx + 2 + i * cw, oy = by + chh * 3 + 1, P = _GLD_SKY_ART[c.id] || []; if (have.has(c.id)) s += A.P('#1c2850', A.rect(ox - 1, oy - 1, cw - 1, 11)) + A.P('#fff4c0', P.map(p => A.circ(ox + p[0], oy + p[1] * 0.8, 0.7)).join('')); });
  return s;
}
/* Each draws at its feet (0, 0), growing up. Small, plain and in the garden's palette; `n` is how the night changes it. */
const _GLD_PROP_ART = {
  post(sc) { const A = GART, Wd = GART_PAL.wood; return _gwWoodPost(0, 34, 5) + A.P(Wd[1], 'M-3 -34L17 -31L22 -27L17 -23L-3 -24z') + A.P(Wd[3], 'M-1 -32L15 -30L18 -28L-1 -29z', 0.7) + A.P(Wd[1], 'M3 -22L-15 -20L-20 -16L-15 -12L3 -13z') + A.S(Wd[0], 0.9, 'M2 -27h10M-12 -16h10', 0.6); },
  barrel() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], 'M-11 -24Q-14 -12 -11 0H11Q14 -12 11 -24z') + A.P(Wd[3], 'M-9 -22Q-11 -12 -9 -2H-4Q-6 -12 -4 -22z', 0.6) + A.S('#3a3f44', 2, 'M-12.500 -18H12.500M-12.500 -6H12.500') + A.P('#3f7fa8', A.ell(0, -24, 10.500, 3.400)) + A.P('#a8d8f0', A.ell(-3, -25, 4, 1.200), 0.8); },
  stone() { const A = GART, St = GART_PAL.stone; return A.P(St[1], 'M-13 0Q-16 -14 -6 -20Q4 -26 11 -16Q16 -6 12 0z') + A.P(St[3], 'M-9 -5Q-11 -14 -4 -18Q0 -20 2 -18Q-5 -13 -5 -4z', 0.75) + A.P('#f2c432', A.circ(3, -10, 1.8)) + A.S('#8a7a5a', 0.9, 'M-2 -7q3 3 7 1', 0.7); },
  worms() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rrect(-13, -16, 26, 16, 2)) + A.S(Wd[0], 1, 'M-13 -10H13M-13 -5H13', 0.6) + A.P('#5a3a22', A.rrect(-11, -19, 22, 4, 1.5)) + A.S('#d88a8a', 1.5, 'M-7 -18q2 -3 4 0t4 0M3 -18q2 -3 3 -1', 0.9); },
  arch(sc) {
    const A = GART, Wd = GART_PAL.wood, leaf = { spring: '#f6c8d8', summer: '#f6d23a', autumn: '#d9671c', winter: '#e8f0f4' }[sc.season] || '#f6d23a';
    let d = ''; for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12; d += A.circ(Math.cos(a) * 24, -46 - Math.sin(a) * 18 + (i % 2) * 1.5, 3); }
    return A.S(Wd[0], 3, 'M-24 0V-44Q-24 -64 0 -64Q24 -64 24 -44V0') + A.S(Wd[2], 1.3, 'M-24.500 0V-44Q-24 -63 0 -63', 0.8) + A.P(leaf, d) + (sc.season === 'winter' ? A.P('#ffffff', A.circ(0, -8, 8) + A.circ(0, -20, 6)) + A.P('#2a2a2a', A.circ(-2, -21, 0.9) + A.circ(2, -21, 0.9)) + A.P('#e8761a', 'M0 -20l5 1 -5 1z') : '');
  },
  scarecrow(sc) { const A = GART, Wd = GART_PAL.wood, coat = { spring: '#6a9ac8', summer: '#c8603a', autumn: '#8a5a2a', winter: '#5a6a8a' }[sc.season] || '#c8603a', hat = sc.season === 'winter' ? '#c8382a' : '#a8843a'; return _gwWoodPost(0, 40, 3.6) + A.S(Wd[0], 3, 'M-18 -32H18') + A.P(coat, 'M-10 -36H10L13 -14H-13z') + A.S(coat, 5, 'M-10 -32H-20M10 -32H20') + A.P('#e8d8a8', A.circ(0, -44, 7)) + A.P(hat, 'M-11 -47H11L6 -50V-56H-6V-50z') + A.P('#3a2a1a', A.circ(-2.500, -44, 1) + A.circ(2.500, -44, 1)) + A.S('#3a2a1a', 0.9, 'M-3 -40.500q3 2 6 0'); },
  stars(sc) { const A = GART, Wd = GART_PAL.wood, n = (sc.landShow && sc.landShow.r) || 0; return _gwWoodPost(-13, 36, 4) + _gwWoodPost(13, 36, 4) + A.P(Wd[1], A.rrect(-22, -48, 44, 26, 2.5)) + A.P('#2c3a60', A.rrect(-19, -45, 38, 20, 1.5)) + [-15, -7.500, 0, 7.500, 15].map((x, i) => A.P(i < n ? '#ffd24a' : '#55618a', A.star(x, -35 - (i % 2) * 2, 5, 3.6, 1.6))).join(''); },
  well() { const A = GART, St = GART_PAL.stone, Wd = GART_PAL.wood; return A.P(St[1], A.rrect(-14, -16, 28, 16, 3)) + A.P(St[3], A.rect(-12, -14, 6, 12), 0.6) + A.P('#2f5f8a', A.ell(0, -16, 12, 3.400)) + A.S(Wd[0], 3, 'M-13 -14V-42M13 -14V-42') + A.P('#8a4a30', 'M-20 -40L0 -54L20 -40z') + A.S('#6a4a2e', 1.2, 'M0 -40V-24') + A.P(Wd[1], A.rrect(-4, -26, 8, 7, 1)); },
  bandstand(sc) { const A = GART, Wd = GART_PAL.wood, snow = sc.season === 'winter'; let c = ''; for (const x of [-34, -12, 12, 34]) c += A.S('#e8e0d0', 3, `M${x} -10V-44`); return A.P(Wd[1], A.ell(0, -5, 44, 9)) + A.P(Wd[3], A.ell(-6, -8, 30, 4), 0.5) + c + A.P('#c8483a', 'M-42 -44Q-20 -60 0 -72Q20 -60 42 -44Q0 -50 -42 -44z') + A.P('#f4e8d0', 'M-14 -46Q-8 -60 0 -72Q8 -60 14 -46Q0 -49 -14 -46z', 0.9) + (snow ? A.P(GART_PAL.snow, 'M-30 -52Q-10 -64 0 -72Q10 -64 30 -52Q0 -60 -30 -52z') : '') + A.P('#f2c432', A.circ(0, -74, 2.500)); },
  fountain(sc) { const A = GART, St = GART_PAL.stone, frozen = sc.season === 'winter'; return A.P(St[1], A.ell(0, -5, 40, 9)) + A.P(frozen ? '#d6e8f0' : '#5fb0cc', A.ell(0, -7, 34, 6.500)) + A.P(St[2], A.rrect(-5, -30, 10, 24, 2)) + A.P(St[1], A.ell(0, -30, 15, 4)) + A.P(frozen ? '#d6e8f0' : '#9ad4ee', A.ell(0, -31, 12, 2.800)) + (frozen ? '' : A.S('#bfe8f6', 1.3, 'M-4 -33Q-14 -42 -17 -14M4 -33Q14 -42 17 -14M0 -34V-44', 0.9)) + A.P('#f2c432', A.circ(-14, -7, 1.300) + A.circ(11, -6, 1.300)); },
  windmill(sc) { const A = GART, St = GART_PAL.stone, Wd = GART_PAL.wood; const sail = (a) => `<g transform="translate(0 -70) rotate(${a})">${A.P(Wd[0], A.rect(-1.500, -44, 3, 44))}${A.P('#f4ecd8', A.rect(1.500, -42, 10, 32))}${A.S(Wd[0], 0.6, 'M1.500 -32H11.500M1.500 -22H11.500', 0.7)}</g>`; return A.P(St[2], 'M-20 0L-13 -66H13L20 0z') + A.P(St[3], 'M-17 -2L-11 -64H-5L-9 -2z', 0.7) + A.P(Wd[1], A.rrect(-6, -22, 12, 22, 5)) + A.P('#8a4a30', 'M-16 -64Q0 -86 16 -64z') + (sc.season === 'winter' ? A.P(GART_PAL.snow, 'M-15 -65Q0 -86 15 -65Q0 -74 -15 -65z') : '') + sail(20) + sail(110) + sail(200) + sail(290) + A.P(Wd[3], A.circ(0, -70, 3)); },
  boots() { const A = GART, c = '#6a4a2e', d = '#4a3220'; const one = (x) => A.P(c, `M${x - 4} -15H${x + 3}V-6L${x + 8} -3V0H${x - 4}z`) + A.P(d, A.rect(x - 4, -1.500, 12, 1.700)) + A.S('#c8a06a', 0.8, `M${x - 3} -12h5M${x - 3} -9h5`, 0.9); return A.P('#8a7a5a', A.rrect(-15, -1, 30, 2.400, 1)) + one(-9) + one(3); },
  finds(sc) { const A = GART, Wd = GART_PAL.wood; return A.S(Wd[0], 2.600, 'M-38 0V-14M38 0V-14') + A.P(Wd[1], A.rrect(-44, -18, 88, 5, 1.500)) + A.P('#e8dcc0', A.rect(-42, -17.400, 84, 1.600), 0.8) + _gldCurioRows((sc.landShow && sc.landShow.c) || [], -38, -30, 11, 7.600, 9); },
  skeps() { const A = GART; let s = ''; for (const [x, k] of [[-9, 1], [9, 0.85]]) s += A.P('#c89a4a', `M${x - 11 * k} 0Q${x - 12 * k} ${-22 * k} ${x} ${-24 * k}Q${x + 12 * k} ${-22 * k} ${x + 11 * k} 0z`) + A.S('#8a6420', 0.9, `M${x - 10.600 * k} ${-5 * k}H${x + 10.600 * k}M${x - 10 * k} ${-11 * k}H${x + 10 * k}M${x - 7.500 * k} ${-17 * k}H${x + 7.500 * k}`, 0.75) + A.P('#3a2a10', A.ell(x, -2.400 * k, 2.500, 2)); return s; },
  help() { const A = GART, Wd = GART_PAL.wood; return _gwWoodPost(0, 44, 4.5) + A.P(Wd[1], A.rrect(-16, -48, 32, 24, 2)) + A.P('#fbf7ee', A.rrect(-11, -45, 13, 17, 1)) + A.P('#fff0b0', A.rrect(3, -44, 10, 12, 1)) + A.S('#a8884a', 1, 'M-9 -40h9M-9 -36h9M-9 -32h6M5 -40h6M5 -36h5', 0.8) + A.P('#e8607a', A.circ(-4.500, -44, 1.5)); },
  kettle() { const A = GART; return A.P('#3a3f44', 'M-11 0L-8 -7H8L11 0z') + A.P('#b0703a', 'M-14 -7Q-16 -24 0 -25Q16 -24 14 -7z') + A.P('#e0a060', 'M-11 -10Q-12 -21 -3 -23Q-7 -16 -6 -9z', 0.75) + A.S('#6a3a18', 2, 'M-13 -24Q0 -38 13 -24') + A.P('#c8382a', A.ell(0, -24, 11, 2.800)); },
  rack() { const A = GART, Wd = GART_PAL.wood; return A.S(Wd[0], 3, 'M-14 0L-6 -36M14 0L6 -36M-12 -20H12M-7 -33H7') + ['#5f9a4a', '#8fa58a', '#7fb35a'].map((c, i) => A.S(c, 3, `M${-8 + i * 8} -20v9`) + A.S(c, 3, `M${-5 + i * 5} -33v8`)).join(''); },
  shelf() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rrect(-14, -38, 28, 38, 2)) + A.P(Wd[0], A.rect(-11, -35, 22, 15)) + A.P(Wd[0], A.rect(-11, -17, 22, 13)) + ['#e8c33a', '#e8607a', '#5aa83a'].map((c, i) => A.P(c, A.rrect(-10 + i * 7, -32, 6, 12, 1)) + A.P(['#4a8fd8', '#f28a1a', '#b48ae6'][i], A.rrect(-10 + i * 7, -15, 6, 11, 1))).join('') + A.P('#8a4a30', 'M-17 -38L0 -46L17 -38z'); },
  rill() { const A = GART, St = GART_PAL.stone; return A.P(St[1], A.ell(0, -2, 18, 6)) + A.P('#5fb0cc', A.ell(0, -3, 13, 3.800)) + A.P('#e0f4fa', A.ell(-4, -4, 4, 1), 0.8) + A.P(St[2], A.blob(A.rng(7), -14, -5, 5, 4, 6, 0.2) + A.blob(A.rng(9), 13, -6, 6, 5, 6, 0.2)); },
  lampbox() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rrect(-10, -16, 20, 16, 2)) + A.P('#ffd36a', A.rrect(-5, -24, 10, 9, 2)) + A.S('#2f3438', 1.4, 'M-5 -24H5M0 -28V-24'); },
  museum(sc) { const A = GART, St = GART_PAL.stone, snow = sc.season === 'winter', shown = (sc.landShow && sc.landShow.c) || []; let c = ''; for (const x of [-34, -17, 17, 34]) c += A.P(St[2], A.rect(x - 3.500, -40, 7, 40)) + A.P(St[3], A.rect(x - 2.800, -40, 2, 40), 0.7); return A.P(St[1], A.rect(-40, -3, 80, 4)) + A.P('#b8ac98', A.rect(-30, -40, 60, 38)) + A.P('#5a4a3a', A.rrect(-8, -26, 16, 25, 7)) + c + A.P(St[2], 'M-44 -40L0 -62L44 -40z') + A.P(St[3], 'M-38 -41L-2 -59L-14 -41z', 0.6) + (snow ? A.P(GART_PAL.snow, 'M-44 -41L0 -63L44 -41L0 -55z') : '') + A.P('#f2c432', A.circ(0, -47, 3)) + A.P('#6a4a2e', A.rrect(-44, -4, 88, 5, 1)) + A.P('#dff0f6', A.rrect(-43, -23, 86, 19, 2), 0.72) + _gldCurioRows(shown, -38, -19, 11, 7.600, 8.500) + A.S('#ffffff', 1, 'M-41 -21h22', 0.7); },
  lookout(sc) { const A = GART, Wd = GART_PAL.wood; return A.S(Wd[0], 4, 'M-20 0L-12 -70M20 0L12 -70M-17 -24H17M-15 -47H15') + A.S(Wd[0], 2.4, 'M-18 -24L15 -47M18 -24L-15 -47') + A.P(Wd[1], A.rrect(-18, -76, 36, 7, 1)) + A.S(Wd[0], 1.8, 'M-16 -76V-88M16 -76V-88M-16 -88H16') + A.P('#a8483a', 'M-22 -88L0 -106L22 -88z') + (sc.season === 'winter' ? A.P(GART_PAL.snow, 'M-20 -88L0 -106L20 -88L0 -96z') : ''); },
  dew(sc) { const A = GART, St = GART_PAL.stone, dawn = sc.tod === 'dawn'; return A.P(St[1], 'M-15 0Q-18 -10 -9 -13H9Q18 -10 15 0z') + A.P('#9ad4ee', A.ell(0, -12, 9, 2.800)) + A.P(St[3], 'M-11 -3Q-13 -9 -8 -11H-3Q-8 -8 -7 -2z', 0.7) + (dawn ? A.P('#fff4d8', A.circ(-3, -13, 1.500) + A.circ(3, -12, 1.100)) : ''); },
  oak(sc) { const A = GART, leaf = sc.season === 'winter' ? '#9aa890' : sc.season === 'autumn' ? '#c8802e' : '#4f8a44'; return A.P('#6a4a2e', 'M-6 0Q-4 -14 -5 -26H5Q4 -14 6 0Q10 2 12 3H-12Q-10 2 -6 0z') + A.P(leaf, A.blob(A.rng(11), 0, -40, 24, 19, 11, 0.2)) + A.P(A.lt(leaf, 0.2), A.blob(A.rng(13), -6, -46, 13, 10, 9, 0.22), 0.9) + A.P('#f2c432', A.circ(-9, -2, 2) + A.circ(8, -1, 1.600)) + A.P('#5a3a22', A.ell(0, 1, 7, 2)); },
  observatory(sc) { const A = GART, St = GART_PAL.stone, night = sc.tod === 'night'; return _gldSkyBoard((sc.landShow && sc.landShow.z) || []) + A.P(St[1], A.rrect(-30, -30, 60, 30, 2)) + A.P(St[3], A.rect(-27, -28, 12, 26), 0.5) + A.P('#7a8a9a', 'M-30 -30Q-30 -62 0 -62Q30 -62 30 -30z') + A.P('#a8b8c8', 'M-25 -32Q-24 -56 -4 -59Q-14 -48 -14 -32z', 0.8) + A.P('#2c3a60', 'M2 -60L12 -58L17 -32H4z') + A.S('#3a3f44', 3.4, 'M8 -44L24 -64') + A.P(night ? '#ffd36a' : '#3a4a5a', A.rrect(-6, -20, 12, 20, 6)); },
  moon(sc) { const A = GART, St = GART_PAL.stone, night = sc.tod === 'night'; return A.P(St[0], 'M-9 0Q-11 -24 0 -34Q11 -24 9 0z') + A.P(St[2], 'M-6 -2Q-8 -22 0 -30Q-2 -14 -1 -2z', 0.7) + A.P(night ? '#cfe8ff' : '#8aa0b8', A.circ(0, -18, 3.500)) + (night ? `<g class="gda-glow">${A.P('#cfe8ff', A.circ(0, -18, 9), 0.25)}</g>` : ''); },
  circle(sc) { const A = GART, St = GART_PAL.stone; let s = ''; for (const [x, h, k] of [[-52, 26, 1], [-26, 32, 1.1], [0, 36, 1.2], [26, 30, 1], [52, 26, 0.95]]) s += A.P(St[1], `M${x - 7 * k} 0L${x - 5 * k} ${-h}Q${x} ${-h - 3} ${x + 5 * k} ${-h}L${x + 7 * k} 0z`) + A.P(St[3], `M${x - 5 * k} -2L${x - 3.500 * k} ${-h + 2}H${x - 1 * k}L${x - 2 * k} -2z`, 0.7); return s + (sc.season === 'winter' ? '' : A.S('#7fa85a', 1, 'M-60 1q2 -4 3 0M60 1q2 -4 3 0', 0.8)); },
  chest() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rrect(-11, -13, 22, 13, 2)) + A.P(Wd[3], 'M-12 -13Q-12 -21 0 -21Q12 -21 12 -13z') + A.S('#c8a02e', 1.6, 'M-12 -13H12M-8 -20V0M8 -20V0') + A.P('#f2c432', A.rrect(-2, -15, 4, 5, 1)); },
  office(sc, o) { const A = GART, Wd = GART_PAL.wood, snow = sc.season === 'winter', night = sc.tod === 'night' || sc.tod === 'dusk'; return A.P('#d8c490', A.rrect(-52, -48, 104, 48, 3)) + A.S(Wd[0], 1, 'M-52 -36H52M-52 -24H52M-52 -12H52', 0.3) + A.P(Wd[1], A.rrect(-9, -32, 18, 32, 2)) + A.P(Wd[3], A.circ(5, -15, 1.400)) + A.P(night ? '#ffe08a' : '#a8c8d8', A.rrect(-40, -36, 20, 16, 2)) + A.P(night ? '#ffe08a' : '#a8c8d8', A.rrect(20, -36, 20, 16, 2)) + A.S(Wd[0], 1.2, 'M-30 -36V-20M-40 -28H-20M30 -36V-20M20 -28H40') + A.P('#7a5a3a', 'M-60 -46Q-30 -78 0 -80Q30 -78 60 -46Q0 -56 -60 -46z') + A.P('#a07a50', 'M-54 -48Q-30 -72 -6 -76Q-22 -62 -28 -50z', 0.7) + (snow ? A.P(GART_PAL.snow, 'M-58 -47Q-30 -78 0 -80Q30 -78 58 -47Q0 -66 -58 -47z') : '') + `<g transform="translate(0 -60)">${A.P('#f8ecc8', A.rrect(-11, -8, 22, 15, 3))}${A.S('#6a8a4a', 1.6, 'M-7 3Q-3 -5 0 -1T7 -4')}${A.P('#c8352a', A.circ(3, -3, 1.700))}</g>`; },
  lamp(sc) { const A = GART, on = sc.tod === 'night' || sc.tod === 'dusk'; return A.S('#2f3438', 2.2, 'M0 0V-28M0 -28Q6 -32 7 -28') + A.P('#2f3438', A.rrect(3.400, -28, 7, 3, 1)) + A.P(on ? '#ffd36a' : '#d8d4c4', A.rrect(4, -25, 6, 7, 1.500)) + (on ? A.P('#ffd36a', A.circ(7, -22, 8), 0.22) : ''); },
};
function _gldHedgeRow(p, sc) {
  const A = GART, W = GARDEN_WORLD, x0 = p.x * W.cellW, x1 = (p.x + p.w) * W.cellW, by = W.sky + (p.y + 1) * W.cellH - 2, c = sc.season === 'winter' ? ['#55695a', '#6f8470', '#94a48c'] : sc.season === 'autumn' ? ['#5f6a34', '#7f8a40', '#a8a450'] : ['#3a6a3a', '#4f8446', '#74a858'], r = A.rng(A.hash(p.id));
  let b = '', t = '', l = '';
  for (let x = x0 + 4; x < x1; x += 11) { b += A.circ(x + A.rr(r, -1.5, 1.5), by - 11 + A.rr(r, -2, 2), A.rr(r, 9, 12)); t += A.circ(x - 2 + A.rr(r, -1, 1), by - 17 + A.rr(r, -2, 1), A.rr(r, 4, 7)); }
  for (let i = 0; i < (x1 - x0) / 5; i++) l += A.leaf(x0 + r() * (x1 - x0), by - 4 - r() * 20, r() * 6.2, 2.6, 0.8);
  return `<path fill="#1a2a14" fill-opacity="0.2" d="${A.ell((x0 + x1) / 2, by + 1, (x1 - x0) / 2 + 3, 3)}"/>` + A.P(c[0], A.rrect(x0, by - 13, x1 - x0, 14, 5)) + A.P(c[0], b) + A.P(c[1], t) + A.P(c[2], l, 0.7);
}
function _gldDraw(kind, p, sc, o) {
  const fn = _GLD_PROP_ART[kind]; if (!fn) return '';
  const W = GARDEN_WORLD, cx = (p.x + p.w / 2) * W.cellW, by = W.sky + (p.y + p.h) * W.cellH - 3;
  const sh = `<ellipse cx="${_gwN(cx + 2)}" cy="${_gwN(by + 1)}" rx="${_gwN(p.w * W.cellW / 2 + 2)}" ry="4" fill="#1a2a14" fill-opacity="0.2"/>`;
  return sh + _gwInked(cx, by, fn(sc, o));
}
/** The marker on a spot you could build on: a stake and a small sign saying the price, or the level. */
function _gldSiteArt(f, sc, lv) {
  const A = GART, W = GARDEN_WORLD, cx = (f.x + f.w / 2) * W.cellW, by = W.sky + (f.y + f.h) * W.cellH - 5, can = lv >= f.lv, txt = can ? String(f.cost) : 'Lv ' + f.lv, bw = Math.round(txt.length * 4.6 + 15);
  return `<path fill="#2c2418" fill-opacity="0.16" d="${A.ell(cx + 2, by + 1, 8, 1.8)}"/><path fill="#7a5636" stroke="#4c3420" stroke-width="0.7" d="M${_gwN(cx - 1.400)} ${_gwN(by)}V${_gwN(by - 14)}h2.800V${_gwN(by)}z"/><rect x="${_gwN(cx - bw / 2)}" y="${_gwN(by - 24)}" width="${bw}" height="12" rx="4.500" fill="${can ? '#f8ecc8' : '#e8ddc2'}" stroke="#8a6238" stroke-width="1.100"/>`
    + (can ? `<circle cx="${_gwN(cx - bw / 2 + 6.500)}" cy="${_gwN(by - 18)}" r="3.300" fill="#f2b01e" stroke="#a87412" stroke-width="0.8"/>` : '')
    + `<text x="${_gwN(cx + (can ? 4 : 0))}" y="${_gwN(by - 15.200)}" font-size="7.600" font-family="Inter, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#5a4630">${txt}</text>`;
}
function gardenLandWorldProps(sc, o) {
  const out = [], open = new Set(sc.areas || []), lv = sc.lv == null ? 1 : sc.lv;
  const push = (cls, z, x, inner, key) => { if (inner) out.push({ cls, z, x, inner, key }); };
  push('gd-prop-lf gd-prop-click', GARDEN_LAND_OFFICE.y + 1, GARDEN_LAND_OFFICE.x, _gldDraw('office', GARDEN_LAND_OFFICE, sc, o), GARDEN_LAND_OFFICE.id);
  if (open.has('finds') && !open.has('lf-museum')) push('gd-prop-lf gd-prop-click', GARDEN_LAND_FINDS.y + 1, GARDEN_LAND_FINDS.x, _gldDraw('finds', GARDEN_LAND_FINDS, sc, o), GARDEN_LAND_FINDS.id);
  const occ = new Set();
  for (const p of sc.plants || []) occ.add(p.x + ',' + p.y);
  for (const d of sc.decor || []) { const dd = gardenDecor(d.id); if (dd && dd.layer !== 'ground') occ.add(d.x + ',' + d.y); }
  for (const f of GARDEN_LAND_FEATURES) {
    if (f.x == null) continue;
    if (open.has(f.id)) {
      if (f.does === 'maze') {
        for (const r of _gldMazeRects(f)) {
          if (r.act) push('gd-prop-lf gd-prop-click', r.y + 1, r.x, _gldDraw('chest', r, sc, o), r.id);
          else push('gd-prop-lf', r.y + 1, r.x, _gldHedgeRow(r, sc), r.id);
        }
        continue;
      }
      if (f.does === 'lamps') for (const x of GARDEN_LAND_LAMPS) push('gd-prop-lf', 19.3, x, _gldDraw('lamp', { x, y: 19, w: 1, h: 0.4 }, sc, o), 'lf-lamp-' + x);
      push('gd-prop-lf gd-prop-click', f.y + f.h, f.x, _gldDraw(f.art, f, sc, o), f.id);
      continue;
    }
    if (!o.interactive || o.photo || o.readOnly) continue;
    if (f.sec && !open.has(f.sec)) continue;
    if (occ.has(f.x + ',' + f.y) || f.lv > lv + 2) continue;   // (further off, the land office lists it: a field of stakes would only be clutter)
    push('gd-prop-lf gd-prop-click', f.y + f.h, f.x, _gldSiteArt(f, sc, lv), 'site:' + f.id);
  }
  return out;
}
/** A marker for building, as a prop the click code can use (the id is on the drawing). */
function gardenLandSiteProp(id) {
  const m = /^site:(.+)$/.exec(String(id || '')); if (!m) return null;
  const f = gardenLandFeature(m[1]); if (!f || f.x == null) return null;
  return { id: 'site:' + f.id, name: f.name, x: f.x, y: f.y, w: f.w, h: f.h, col: 'none', act: 'lf', lf: f.id, site: 1, door: f.door };
}
function gardenLandLights(sc) {
  const W = GARDEN_WORLD, open = new Set(sc.areas || []), out = [];
  if (open.has('lf-lamps')) for (const x of GARDEN_LAND_LAMPS) out.push({ x: (x + 0.65) * W.cellW, y: W.sky + 19 * W.cellH - 8, r: 62 });
  if (open.has('lf-moon')) { const f = gardenLandFeature('lf-moon'); out.push({ x: (f.x + 0.5) * W.cellW, y: W.sky + f.y * W.cellH, r: 56 }); }
  return out;
}
/** The land on the little map: open land in its colour, paths pale, closed land and thicket dark. Rows of cells joined up. */
function gardenLandMini(open, season) {
  let s = '';
  const colOf = (c) => (c.lane ? '#e3d3a2' : c.solid ? 'rgba(30,50,26,.75)' : !open.has(c.id) ? 'rgba(40,40,30,.55)' : c.trail ? '#efe2b4' : _gdrTileCol(c.tile, season));
  for (let y = 0; y < GARDEN_WORLD.rows; y++) {
    let x = 0;
    while (x < GARDEN_WORLD.cols) {
      const c = gardenLandCell(x, y); let j = x + 1;
      while (j < GARDEN_WORLD.cols && gardenLandCell(j, y) === c) j++;
      if (c) s += `<rect x="${x}" y="${y}" width="${j - x}" height="1" fill="${colOf(c)}"/>`;
      x = j;
    }
  }
  return s;
}

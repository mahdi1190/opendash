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
const _GLD_OVER = { fn: null, stand: [], mist: '' };
/* The things a wild tree must not get in front of: they stand in the world, so they are always drawn over the baked ground, and a tree that belongs in front of one would come out behind it. */
const _GLD_WILD = { boxes: null, wet: null };
function _gldWildBoxes() {
  if (_GLD_WILD.boxes) return _GLD_WILD.boxes;
  const out = [], W = GARDEN_WORLD, add = (p, tall) => { const x = Math.floor(p.x), w = p.w || 1, h = p.h || 1; out.push({ x0: x, x1: x + w, y0: p.y + h - tall, y1: p.y + h }); };
  for (const d of GARDEN_LAND_SIGHTS) add(d, d.tall || 1);
  for (const f of GARDEN_LAND_FEATURES) if (f.x != null && f.does !== 'maze') add(f, f.tall || 1);
  for (const g of GARDEN_ZONE_GATES) add(Object.assign({}, g, { w: 1 }), 1.3);
  for (const p of GARDEN_PROPS) if (!p.walk && p.y < 21) add(p, p.tall || 1);
  add(GARDEN_LAND_OFFICE, 2); add(GARDEN_LAND_FINDS, 1.5);
  for (const x of GARDEN_LAND_LAMPS) out.push({ x0: x, x1: x + 1, y0: 18, y1: 19.4 });
  const wet = [];
  for (const w of GARDEN_REGION_WATERS) if (!w.room && !w.area && !w.sec) wet.push({ cx: w.x + w.w / 2, cy: w.y + w.h / 2, rx: w.w / 2 + 0.3, ry: w.h / 2 + 0.3 });
  for (const q of GARDEN_LAND_SQUARES) wet.push({ cx: q[0], cy: q[1], rx: (q[2] + 12) / W.cellW, ry: (q[3] + 8) / W.cellH });
  for (const b of GARDEN_LAND_BROOKS) for (let i = 0; i < b.length - 1; i++) for (let t = 0; t < 1; t += 0.25) wet.push({ cx: b[i][0] + (b[i + 1][0] - b[i][0]) * t, cy: b[i][1] + (b[i + 1][1] - b[i][1]) * t, rx: 0.5, ry: 0.5 });
  _GLD_WILD.boxes = out; _GLD_WILD.wet = wet;
  return out;
}
/** May a wild tree or bush stand here? Cell x, y; its foot fx, fy in cells; k its size. Not on a path (the way stays there to be found), in water or on paving, or in front of something in the world. */
function _gldWildFits(x, y, fx, fy, k, kind) {
  const c = gardenLandCell(x, y); if (!c || c.trail || c.lane) return false;
  const boxes = _gldWildBoxes(), W = GARDEN_WORLD;
  for (const e of _GLD_WILD.wet) if (((fx - e.cx) / e.rx) ** 2 + ((fy - e.cy) / e.ry) ** 2 < 1) return false;
  const hw = (kind === 'tree' ? 34 * k : 18) / W.cellW, tall = (kind === 'tree' ? 100 * k : 26) / W.cellH;
  for (const b of boxes) if (fy > b.y1 - 1 && fx + hw > b.x0 && fx - hw < b.x1 && fy - tall < b.y1) return false;
  return true;
}
function _gldOvergrown(cells, id, sc, zones) { return _GLD_OVER.fn ? _GLD_OVER.fn(cells, id, sc, zones) : ''; }
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
  function pool(s, lp, r, sc, opts) {
    const wate = sc.rain && sc.rain.snow && sc.season === 'winter' ? ['#d6e8f0', '#c0d8e6'] : sc.tod === 'night' ? ['#2c4a78', '#1f3a68'] : ['#5fb0cc', '#3f8ebc'];
    const cells = s.cells, shape = _gdrOtherWaterShape(sc, s.id), contour = shape ? _gdrWaterShapePath(shape) : '', clip = (opts.uid || 'gd') + '-pool-' + s.id; let o = '';
    if (shape) o += `<defs><clipPath id="${clip}"><path d="${contour}" clip-rule="evenodd"/></clipPath></defs><path d="${contour}" fill="${wate[1]}" fill-rule="evenodd"/><g clip-path="url(#${clip})">`;
    for (const L of loops(cells, s.id + '|w', 7, 3)) o += A.P(wate[1], dOf(L));
    for (const L of loops(cells, s.id + '|w2', 12, 4)) o += A.P(wate[0], dOf(L), 0.7);
    let pads = '', flowers = '', lines = '';
    for (let i = 0; i < cells.length * 0.5; i++) { const [x, y] = inCell(r, cells), R = rr(r, 4, 7); pads += `M${f1(x)} ${f1(y)}L${f1(x + R)} ${f1(y - R * 0.1)}A${f1(R)} ${f1(R * 0.42)} 0 1 0 ${f1(x + R * 0.86)} ${f1(y + R * 0.2)}z`; if (i % 2) flowers += A.circ(x + 1, y - 1, 1.8); }
    for (let i = 0; i < cells.length; i++) { const [x, y] = inCell(r, cells), L = rr(r, 8, 20); lines += `M${f1(x)} ${f1(y)}q${f1(L / 2)} ${f1(rr(r, -1, 1))} ${f1(L)} 0`; }
    return o + A.S('#ffffff', 1, lines, 0.25) + (sc.season === 'winter' ? '' : `<path fill="#4f8f42" stroke="#2f5f2c" stroke-width="0.6" d="${pads}"/>` + A.P('#f2c4d8', flowers)) + (shape ? '</g>' : '');
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
  /* Land past a gate: nobody has been here for years. Long grass that runs over the old boundaries, drifts of wildflowers, brambles, young trees and a little mist, thicker the further out it is. Baked with the ground, so it costs one picture however rich. */
  const OVER = { spring: ['#8fbc5c', '#74a44c', '#a9cf70', '#5f9440'], summer: ['#88b458', '#6e9c48', '#a2c86a', '#5a8c3c'], autumn: ['#a8a658', '#8e8c48', '#c0b96a', '#7a7c3c'], winter: ['#aab89a', '#94a488', '#c4cfb4', '#7f9078'] };
  function overgrown(cells, id, sc, zones) {
    const season = sc.season, C = OVER[season] || OVER.summer, r = A.rng(A.hash('gld-over|' + id + '|' + season));
    if (!cells.length) return '';
    let s = '';
    for (const L of loops(cells, id + '|over', -5, 11)) s += A.P(C[0], dOf(L));
    let dark = '', lite = ''; const n = Math.round(cells.length / 2.2);
    for (let i = 0; i < n; i++) { const [x, y] = inCell(r, cells); if (i % 2) dark += A.blob(r, x, y, rr(r, 26, 62), rr(r, 10, 22), 9, 0.45); else lite += A.blob(r, x, y, rr(r, 18, 46), rr(r, 7, 15), 9, 0.45); }
    s += A.P(C[1], dark, 0.5) + A.P(C[2], lite, 0.42);
    // the long grass
    s += grassy(r, cells, C[3], 3.4) + grassy(r, cells, A.shift(C[0], 6, 1, -0.14), 2.2);
    // wildflowers grow in drifts, each drift one colour
    const fl = season === 'winter' ? ['#f4f7f8', '#e4e8e0'] : season === 'autumn' ? ['#d9671c', '#e8a23a', '#c0392b'] : ['#fbfbf2', '#f6d23a', '#e0608a', '#8ab0ec', '#c88ae6'];
    const drift = fl.map(() => ''); for (let i = 0; i < cells.length / 3.4; i++) { const [x, y] = inCell(r, cells), k = Math.floor(r() * fl.length), R = rr(r, 16, 34); for (let j = 0; j < 12; j++) { const a = r() * 6.283, d = Math.sqrt(r()) * R; drift[k] += A.circ(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, rr(r, 1.2, 2.3)); } }
    drift.forEach((d, k) => { if (d) s += A.P(fl[k], d, 0.95); });
    // brambles, young trees and old ones, back to front
    const pal = GART_PAL.leaf[season] || GART_PAL.leaf.summer, stand = [];
    const seenC = new Set();
    for (const [cx, cy] of cells) { const h = gardenHash('zt|' + cx + ',' + cy), m = h % 100; if (m < 12) { seenC.add(cx + ',' + cy); stand.push(['tree', cx, cy, h]); } else if (m < 22) stand.push(['bush', cx, cy, h]); }
    for (const [kind, cx, cy, h] of stand) {
      const q = gardenRand(h), fx = cx + 0.2 + q() * 0.6, fy = cy + 0.5 + q() * 0.45, x = px(fx), y = py(fy), tk = kind === 'tree' ? 0.62 + q() * 0.5 : 0;
      if (!_gldWildFits(cx, cy, fx, fy, tk, kind)) continue;
      if (kind === 'tree' && typeof _gwTree === 'function') { _GLD_OVER.stand.push([y, `<path fill="#1a2a14" fill-opacity="0.16" d="${A.ell(x + 4, y + 1, 16, 4)}"/>` + _gwTree(x, y, tk, pal, season, q)]); continue; }
      const R = 9 + q() * 9, L = season === 'winter' ? ['#6f8070', '#8ea088', '#b0bca4'] : season === 'autumn' ? ['#7f6e2c', '#a8923a', '#c8ae52'] : ['#3f7a3c', '#5a9648', '#82b45e'];
      let lobes = '', tops = '', lv = '';
      for (let k = 0; k < 4; k++) { const a = -R + k * R * 0.66, rr0 = R * (0.42 + q() * 0.26), by = y - rr0 * 0.7 - q() * R * 0.28; lobes += A.circ(x + a, by, rr0); tops += A.circ(x + a - 1.5, by - rr0 * 0.34, rr0 * 0.55); }
      for (let k = 0; k < 9; k++) lv += A.leaf(x + (q() - 0.5) * R * 2.1, y - q() * R * 1.1, q() * 6.2, 2.6, 0.9);
      let bu = A.P('#1c2a14', A.ell(x + 2, y + 1, R * 1.25, R * 0.3), 0.16) + A.P(L[0], lobes) + A.P(L[1], tops) + A.P(L[2], lv, 0.8);
      if (q() < 0.3 && season !== 'winter') { let b = ''; for (let k = 0; k < 5; k++) b += A.circ(x + (q() - 0.5) * R * 1.6, y - R * (0.2 + q() * 0.7), 1.2); bu += A.P(season === 'autumn' ? '#7a2a5a' : '#f2c4d8', b, 0.95); }
      _GLD_OVER.stand.push([y, bu]);
    }
    _GLD_OVER.mist += mist(cells, id, sc, zones);
    return s;
  }
  /* A soft bank of mist: the further out, the thicker. */
  function mist(cells, id, sc, zones) {
    const r = A.rng(A.hash('gld-mist|' + id)), col = sc.tod === 'night' ? '#8fa2c0' : sc.tod === 'dusk' ? '#e8c8c8' : '#f6f8ee';
    const lay = ['', '', '', ''];
    for (const [cx, cy] of cells) {
      const h = gardenHash('zm|' + cx + ',' + cy); if (h % 5) continue;
      const z = zones(cx, cy), k = 0.8 + z * 0.3, x = px(cx + r()), y = py(cy + r());
      lay.forEach((_, i) => { const q = 1 - i * 0.22; lay[i] += A.ell(x, y, 96 * k * q, 26 * k * q); });
    }
    return lay.map(d => (d ? A.P(col, d, 0.045) : '')).join('');
  }
  _GLD_OVER.fn = overgrown;
  function plot(id, sc, o, open) {
    const M = GARDEN_LAND_MAPS[id], season = sc.season, P = WILD[season] || WILD.summer, r = A.rng(A.hash('gld-plot|' + id + '|' + season)), secs = GARDEN_LAND_SECTIONS.filter(q => q.region === id);
    let s = '', live = '';
    const all = [], solid = [];
    M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) { all.push([M.x + dx, M.y + dy]); if (row[dx] === '#') solid.push([M.x + dx, M.y + dy]); } });
    // past a gate there are no plots to see: one stretch of wild land, right over the boundaries. Only how many gates away it is shows, in the mist
    const zo = (n) => !n || open.has('zn-' + n), first = (() => { let k = 1; while (k < GARDEN_ZONES.length && zo(k)) k++; return k; })(), wildCells = [];
    M.rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) { const x = M.x + dx, y = M.y + dy, c = gardenLandCell(x, y); if (!c || c.solid || zo(gardenZoneOf(x, y))) continue; if (c.plot && open.has(c.id)) continue; wildCells.push([x, y]); } });
    if (M.wild) {
      // out in the wild: rough grass, carrying on from the lawn
      for (const L of loops(all, id, -2, 7)) s += A.P(P[0], dOf(L));
      let dk = ''; for (let i = 0; i < all.length / 7; i++) { const [x, y] = inCell(r, all); dk += A.blob(r, x, y, rr(r, 18, 42), rr(r, 7, 15), 8, 0.5); } s += A.P(P[1], dk, 0.35);
    }
    s += thicket(solid, id, M.theme, sc);
    s += overgrown(wildCells, id, sc, (x, y) => Math.max(0, gardenZoneOf(x, y) - first));
    for (const sec of secs) {
      if (!open.has(sec.id) && !zo(sec.zn)) continue;   // (it is under the long grass until its gate opens)
      const isOpen = open.has(sec.id), lps = loops(sec.cells, sec.id, 5, 6.5), rs = A.rng(A.hash('gld-sec|' + sec.id + '|' + season)), K = GARDEN_LAND_KINDS[sec.kind];
      if (isOpen) {
        if (sec.fam === 'pond' || sec.fam === 'greenhouse') continue;   // (their own drawings, after this)
        const base = sec.green ? (season === 'winter' ? '#a9b98a' : season === 'autumn' ? '#a4b45e' : '#92c864') : tile(sec.pool ? 'pond-edge' : sec.tile, season), lip = A.shift(base, 8, 1, -0.24);
        for (const L of lps) s += `<path d="${dOf(L)}" fill="${lip}" transform="translate(0 ${sec.green ? 1.5 : 3.5})"/>` + A.P(base, dOf(L));   // the lip along its front: the ground steps down here
        s += sec.pool ? pool(sec, lps[0], rs, sc, o) : PAINT[sec.kind](rs, sec.cells, sc, base);
        if (K.edge) for (const L of lps) s += edging(dOf(L), K.edge === 'log');
        if (sec.needs) for (const L of lps) s += `<path d="${dOf(L)}" fill="none" stroke="#8a5a44" stroke-width="8" stroke-linejoin="round"/><path d="${dOf(L)}" fill="none" stroke="#b87a5a" stroke-width="5" stroke-linejoin="round" stroke-dasharray="9 1.500"/>`;   // the old wall still stands round it
        if (!K.edge) { let fr = ''; for (const L of lps) for (const q of L) for (let k = 0; k < 2; k++) fr += tuft(q.x + rr(rs, -7, 7), q.y + rr(rs, -2, 3), rr(rs, 4, 8), rr(rs, -2, 2)); s += A.S(A.shift(P[0], 6, 1, -0.12), 0.9, fr, 0.85); }
      } else {
        // not open: longer grass in clumps, a few flowers, what it will become showing faintly, and a fence where it faces land you can stand on
        if (!M.wild) for (const L of lps) s += A.P(P[0], dOf(L), 0.95);
        if (!sec.pool && sec.kind !== 'glass' && sec.kind !== 'pondedge') { for (const L of lps) s += A.P(tile(sec.tile, season), dOf(L), 0.28); s += `<g opacity="0.5">${PAINT[sec.kind](rs, sec.cells, sc, tile(sec.tile, season))}</g>`; }   // what it will become shows faintly, so each piece of land is its own even before it is yours
        s += grassy(rs, sec.cells, A.shift(P[0], 6, 1, -0.2), 1.8) + dotsOf(rs, sec.cells, 0.5, season === 'winter' ? ['#f4f7f8'] : season === 'autumn' ? ['#e8a23a'] : ['#fbfbf2', '#f6d23a']);
        if (rs() < 0.4) { const [bx, by] = inCell(rs, sec.cells), R = rr(rs, 9, 15), leaf = season === 'winter' ? ['#7c8c74', '#9aa890'] : season === 'autumn' ? ['#a4742e', '#c8963e'] : ['#4f8a44', '#74ac58']; s += A.P('#1c2a14', A.ell(bx + 2, by + R * 0.3, R, R * 0.3), 0.18) + `<path fill="${leaf[0]}" stroke="${A.dk(leaf[0], 0.3)}" stroke-width="0.7" d="${A.blob(rs, bx, by - R * 0.4, R, R * 0.8, 9, 0.16)}"/>` + A.P(leaf[1], A.blob(rs, bx - R * 0.26, by - R * 0.62, R * 0.55, R * 0.42, 8, 0.2), 0.95); }
        if (sec.pool || sec.fam === 'pond') { const bx = (sec.x + sec.w / 2) * W().cellW, by = py(sec.y) + sec.h * W().cellH / 2, shape = _gdrOtherWaterShape(sc, sec.fam === 'pond' ? 'pond' : sec.id); s += A.P(tile('pond-water', season), shape ? _gdrWaterShapePath(shape) : A.blob(rs, bx, by, sec.w * W().cellW * 0.3, sec.h * W().cellH * 0.28, 12, 0.14), 0.55); }
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
  const TRAIL_STONE = new Set(['lt-heart', 'lt-cottage', 'lt-pondway', 'lt-orchard', 'lt-foxglove']), TRAIL_COBBLE = new Set(['lt-apple', 'lt-pear', 'lt-cider', 'lt-wall']), TRAIL_PLANK = new Set(['lt-board', 'lt-heron', 'lt-willow']);
  /* Flagstones in a soft round patch, a grey bed under them and each stone its own. */
  function paving(r, cx, cy, rx, ry) {
    let st = '', hi = '';
    const rows = Math.max(1, Math.round(ry / 7));
    for (let j = -rows; j <= rows; j++) { const yy = cy + j * ry / (rows + 0.2), half = rx * Math.sqrt(Math.max(0, 1 - (j / (rows + 0.2)) ** 2)); for (let x = cx - half + rr(r, 0, 6); x < cx + half - 4;) { const w = rr(r, 8, 14); st += A.rrect(x, yy - 3, Math.min(w, cx + half - x), 6.200, 2); if (r() < 0.5) hi += A.rect(x + 1.500, yy - 2.200, w * 0.5, 1); x += w + 1.400; } }
    return A.P('#8e8676', A.ell(cx, cy, rx + 4, ry + 3)) + A.P('#c4bcaa', st) + A.P('#e0d8c6', hi, 0.8);
  }
  function trails(sc, o, open) {
    const season = sc.season, sand = tile('sand', season), P = WILD[season] || WILD.summer, r = A.rng(A.hash('gld-trails|' + season));
    let s = '', live = '', under = '', top = '', closed = '', steps = '', peb = '', stone = '', plank = '', cobble = '', verge = ['', '', ''], squares = '';
    const mouths = [], mouthNear = (x, y) => mouths.some(q => Math.hypot(q[0] - x, (q[1] - y) * 1.6) < 1.6) || GARDEN_LAND_SQUARES.some(q => Math.hypot((q[0] - x) * W().cellW / (q[2] + 34), (q[1] - y) * W().cellH / (q[3] + 30)) < 1);
    for (const t of GARDEN_LAND_TRAILS) {
      const isOpen = open.has(t.id), { runs, start } = runsOf(t), zOpen = (c) => { const n = gardenZoneOf(c[0], c[1]); return !n || open.has('zn-' + n); };
      runs.forEach((run0, ri) => {
        // past a gate the path is under the long grass: it stops at the gate, whatever the rest of it is doing
        let cut = run0.findIndex((c, i) => i > 0 && !zOpen(c));
        const keep = cut < 0 ? run0 : run0.slice(0, cut);
        if (keep.length < 2) return;
        const d = curve(wander(keep, t.id + ri), false);
        if (isOpen) {
          under += d; top += d;
          if (TRAIL_STONE.has(t.id)) stone += d; else if (TRAIL_PLANK.has(t.id)) plank += d; else if (TRAIL_COBBLE.has(t.id)) cobble += d;
          for (let i = 1; i < keep.length; i += 2) { const [x, y] = keep[i], c = gardenLandCell(x, y + 1), c2 = gardenLandCell(x, y - 1); if (c && !c.trail && !c.solid && r() < 0.55) verge[i % 3] += A.circ(px(x) + 8 + r() * 32, py(y) + 27 + r() * 3, rr(r, 1.3, 2)) + A.circ(px(x) + 8 + r() * 32, py(y) + 26 + r() * 3, rr(r, 1.2, 1.8)); if (c2 && !c2.trail && !c2.solid && r() < 0.45) verge[(i + 1) % 3] += A.circ(px(x) + 8 + r() * 32, py(y) + 2 + r() * 3, rr(r, 1.2, 1.8)); }
          if (ri === 0 && !mouthNear(start[0] + 0.5, start[1] + 0.5)) { mouths.push([start[0] + 0.5, start[1] + 0.5]); squares += paving(r, px(start[0] + 0.5), py(start[1] + 0.5), 26, 15); }   // a little square where it meets the way it leads from
          for (let i = 1; i < keep.length - 1; i++) { const [x, y] = keep[i]; if (keep[i - 1][0] === x && keep[i + 1][0] === x) steps += `M${f1(px(x + 0.5) - 8)} ${f1(py(y) + 12)}q8 3 16 0M${f1(px(x + 0.5) - 7)} ${f1(py(y) + 24)}q7 3 14 0`; const [qx, qy] = [px(x) + 8 + r() * 32, py(y) + 8 + r() * 14]; peb += A.ell(qx, qy, rr(r, 0.9, 1.9), rr(r, 0.6, 1.1)); }
        } else closed += d;
      });
      // The reachable mouth retains its physical gate; requirements are read
      // when the player inspects it, rather than on another level placard.
      if (!isOpen && !t.zn && (!t.from || open.has(t.from))) {   // (further off there is nothing to see of it yet, and past the old garden a gate says it: GARDEN_ZONE_GATES)
        const gx = px(start[0] + 0.5), gy = py(start[1] + 1) - 3;
        const wood = season === 'winter' ? ['#6a5a48', '#8f7c66'] : ['#6e4c2a', '#9a7244'];
        live += `<g class="gd-landgate"><path fill="${wood[1]}" stroke="${wood[0]}" stroke-width="0.8" d="${A.rrect(gx - 15, gy - 15, 3.6, 16, 1)}${A.rrect(gx + 11.4, gy - 15, 3.6, 16, 1)}"/><path fill="none" stroke="${wood[0]}" stroke-width="2.4" d="M${f1(gx - 12)} ${f1(gy - 10)}H${f1(gx + 12)}M${f1(gx - 12)} ${f1(gy - 4)}H${f1(gx + 12)}M${f1(gx - 11)} ${f1(gy - 4)}L${f1(gx + 11)} ${f1(gy - 10)}"/></g>`;
      }
    }
    const mud = A.mix(sand, P[1], 0.45);
    const dressed = () => {
      // what each path is made of, by where it goes: flagstones in the village, cobbles in the orchards, planks over the marsh, plain worn earth and grass elsewhere
      let q = '';
      if (stone) q += `<path d="${stone}" fill="none" stroke="#a8a090" stroke-width="16" stroke-linejoin="round"/><path d="${stone}" fill="none" stroke="#c8c0ae" stroke-width="14" stroke-dasharray="11 2.400" stroke-linejoin="round"/><path d="${stone}" fill="none" stroke="#dcd4c2" stroke-width="5" stroke-dasharray="6 7.400" stroke-linejoin="round" stroke-opacity="0.8"/>`;
      if (cobble) q += `<path d="${cobble}" fill="none" stroke="#9a8e78" stroke-width="15" stroke-linejoin="round"/><path d="${cobble}" fill="none" stroke="#bcb09a" stroke-width="13" stroke-dasharray="4 2.200" stroke-linejoin="round"/>`;
      if (plank) q += `<path d="${plank}" fill="none" stroke="#6e4c2a" stroke-width="16" stroke-linejoin="round"/><path d="${plank}" fill="none" stroke="#a67c50" stroke-width="14" stroke-dasharray="5 1.300" stroke-linejoin="round"/>`;
      return q;
    };
    if (under) s += `<path d="${under}" fill="none" stroke="${mud}" stroke-width="23" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.55"/>`;
    if (top) s += `<path d="${top}" fill="none" stroke="${A.mix(sand, P[0], 0.1)}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += dressed() + squares;
    { const fc = season === 'winter' ? ['#e8f0f4', '#d8e0e4', '#f4f7f8'] : season === 'autumn' ? ['#d9671c', '#e8a23a', '#c0392b'] : ['#f6d23a', '#e0608a', '#fbfbf2']; verge.forEach((d, i) => { if (d) s += A.P(fc[i], d, 0.95); }); }
    if (closed) s += `<path d="${closed}" fill="none" stroke="${A.mix(sand, P[1], 0.62)}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.65"/>`;
    if (steps) s += A.S(A.shift(sand, 8, 1, -0.3), 1.6, steps, 0.6);
    if (peb) s += A.P(A.shift(sand, 10, 1, -0.25), peb, 0.7);
    // the square at the heart of the world, and the wider paving in front of the shops
    s += paving(r, px(25.6), py(12.5), 138, 60) + paving(r, px(25), py(20.4), 170, 18);
    { const fc = season === 'winter' ? '#dfe6ec' : season === 'autumn' ? '#d9a23a' : '#e0608a', fc2 = season === 'winter' ? '#c8d0d4' : '#f6d23a'; let a = '', b = '', g = ''; for (let i = 0; i < 26; i++) { const t = i / 26 * 6.283, x = px(25.6) + Math.cos(t) * 146, y = py(12.5) + Math.sin(t) * 66; if ((Math.abs(Math.cos(t)) < 0.3 && Math.sin(t) > 0) || Math.abs(Math.sin(t)) < 0.22 || (Math.abs(Math.cos(t)) < 0.25 && Math.sin(t) < 0)) continue; g += A.blob(r, x, y, 10, 5, 7, 0.2); a += A.circ(x - 3, y - 1, 1.7) + A.circ(x + 4, y + 1, 1.5); b += A.circ(x + 1, y - 2, 1.5); } s += A.P(season === 'winter' ? '#7c8c74' : '#4f8a44', g) + A.P(fc, a) + A.P(fc2, b); }
    // the mini squares, and the brooks
    for (const [cx, cy, rx, ry] of GARDEN_LAND_SQUARES) s += paving(r, px(cx), py(cy), rx, ry);
    for (const pts of GARDEN_LAND_BROOKS) { const d = curve(pts.map(q => [px(q[0]), py(q[1])]), false); s += `<path d="${d}" fill="none" stroke="#6e8a5a" stroke-width="11" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${season === 'winter' ? '#c0d8e6' : '#5fb0cc'}" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffffff" stroke-width="1.200" stroke-opacity="0.5" stroke-dasharray="6 9"/>`; }
    if (typeof gardenRegionWaterArt === 'function') s += gardenRegionWaterArt(px, py, season, sc, o);   // the regions' small waters
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
    // the lane past a gate has grown over too
    { const shut = []; for (const y of [19, 20]) for (let x = 0; x < GARDEN_WORLD.cols; x++) { const n = gardenZoneOf(x, y); if (n && !open.has('zn-' + n)) shut.push([x, y]); }
      if (shut.length) { let f0 = 1; while (f0 < GARDEN_ZONES.length && open.has('zn-' + f0)) f0++; s += _gldOvergrown(shut, 'lane', sc, (x, y) => Math.max(0, gardenZoneOf(x, y) - f0)); } }
    // the world's edges: the same woods as past the edge, so there is no straight line where the picture stops
    { const C = season === 'winter' ? ['#6f8470', '#7d9280'] : season === 'autumn' ? ['#6f6a34', '#7d7638'] : ['#3f7040', '#4c7e46'], r3 = A.rng(A.hash('gld-rim|' + season)), wpx = W().cols * W().cellW, y9 = py(W().rows); let d0 = '', d1 = '';
      const rim = (x, y) => { const R = 12 + r3() * 16; d0 += A.circ(x, y, R); d1 += A.circ(x - R * 0.2, y - R * 0.3, R * 0.62); };
      for (let y = py(0); y < y9; y += 24) { rim(2 + r3() * 8, y); rim(wpx - 2 - r3() * 8, y); }
      for (let x = 0; x < wpx; x += 26) rim(x, y9 - 2 - r3() * 8);
      s += A.P(C[0], d0) + A.P(C[1], d1); }
    // The far-water rope and mist mark the actual limit without a level placard.
    { const to = typeof sc.lakeTo === 'number' ? sc.lakeTo : gardenLakeOpenToOf(open), last = GARDEN_ZONES[GARDEN_ZONES.length - 1].lake;
      if (to < last) {
        const y0 = py(to), x0 = px(12) + 6, x1 = px(40) - 6, rq = A.rng(A.hash('gld-lakerope')), col = sc.tod === 'night' ? '#8fa2c0' : sc.tod === 'dusk' ? '#e8c8c8' : '#f4f8f8';
        const lay = ['', '', '', ''];
        for (let yy = to; yy < last; yy += 1) for (let xx = 12; xx < 40; xx += 3) { const k = 0.9 + (yy - to) * 0.12, x = px(xx + rq() * 3), y = py(yy + rq()); lay.forEach((_, i) => { const q = 1 - i * 0.22; lay[i] += A.ell(x, y, 110 * k * q, 24 * k * q); }); }
        s += lay.map(d => (d ? A.P(col, d, 0.05) : '')).join('');
        const rope = []; for (let x = x0; x <= x1; x += 22) rope.push([x, y0 + Math.sin(x * 0.05) * 1.6]);
        s += A.S('#6e5a3e', 1.1, curve(rope, false), 0.8);
        let fr = '', fw = ''; rope.forEach((q, i) => { if (i % 2) fr += A.ell(q[0], q[1] - 1, 4.2, 3.2); else fw += A.ell(q[0], q[1] - 1, 4.2, 3.2); });
        s += A.P('#000000', fr + fw, 0.12) + A.P('#d8452a', fr) + A.P('#f4efe2', fw);
      }
    }
    // the wild land's trees and bushes, after the water, paths and paving they stand in front of, back to front; then its mist
    _GLD_OVER.stand.sort((a, b) => a[0] - b[0]);
    for (const t of _GLD_OVER.stand) s += t[1];
    s += _GLD_OVER.mist; _GLD_OVER.stand = []; _GLD_OVER.mist = '';
    // Plot edges stay in the landscape. Prices and requirements belong to an
    // intentional ground inspection or the land office, not repeated plaques.
    return { s, live };
  }
  return { plot, trails, fenceAlong, curve, loops, dOf };
})();
/** Past the edge of the world, woods go on: three soft masses of leaves along the left, right and bottom. Not baked: it lies outside the picture (a window zoomed right out). */
function gartLandsFringe(sc) {
  const A = GART, W = GARDEN_WORLD, wpx = W.cols * W.cellW, y0 = W.sky, y1 = W.sky + W.rows * W.cellH, season = sc.season, C = season === 'winter' ? ['#6f8470', '#7d9280', '#8a9e8c'] : season === 'autumn' ? ['#6f6a34', '#7d7638', '#8b8240'] : ['#3f7040', '#4c7e46', '#5a8c4e'], r = A.rng(A.hash('gld-fringe|' + season));
  const side = 512, lays = ['', new Map(), new Map()];
  // Keep every circle and its random order. A cell repeats only the circles
  // touching it, then clips their compound path: translucent overlaps retain
  // the original union instead of becoming darker at a cell boundary.
  const add = (layer, x, y, R) => {
    const d = A.circ(x, y, R), groups = lays[layer];
    for (let cy = Math.floor((y - R - 1) / side); cy <= Math.floor((y + R + 1) / side); cy++) for (let cx = Math.floor((x - R - 1) / side); cx <= Math.floor((x + R + 1) / side); cx++) {
      const key = cx + ',' + cy;
      let g = groups.get(key);
      if (!g) { g = { x: cx * side, y: cy * side, cx, cy, d: '' }; groups.set(key, g); }
      g.d += d;
    }
  };
  const clump = (x, y) => { const R = 18 + r() * 22; lays[0] += A.circ(x, y, R); add(1, x - R * 0.2, y - R * 0.3, R * 0.68); add(2, x - R * 0.3, y - R * 0.5, R * 0.34); };
  for (let i = 0; i < 2; i++) for (let y = y0 - 30; y < y1 + 300; y += 30) { for (let d = 8; d < 240; d += 46) { const dd = d + (r() - 0.5) * 18; clump(i ? wpx + dd : -dd, y + (r() - 0.5) * 16); } }
  for (let x = -30; x < wpx + 30; x += 34) for (let d = 10; d < 240; d += 42) clump(x + (r() - 0.5) * 18, y1 + d + (r() - 0.5) * 14);
  const cells = (layer, opacity) => [...lays[layer].values()].map(g => {
    const key = layer + '-' + (g.cx < 0 ? 'n' + -g.cx : g.cx) + '-' + (g.cy < 0 ? 'n' + -g.cy : g.cy), id = 'gart-fringe-' + key;
    return `<g data-gp-cell="fringe-${key}" clip-path="url(#${id})"><defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse"><rect x="${g.x}" y="${g.y}" width="${side}" height="${side}"/></clipPath></defs>${A.P(C[layer], g.d, opacity)}</g>`;
  }).join('');
  // Outside-world scenery stays SVG in the legacy renderer; the GPU renderer
  // treats this split group as local images rather than one mostly empty map.
  return A.P(C[0], `M-3000 ${y0}H${wpx + 3000}V${y1 + 3000}H-3000z`) + `<g class="gart-bake no-bake" data-bake="fringe" data-split="1">${cells(1, 0.8)}${cells(2, 0.55)}</g>`;
}
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
  cross() { const A = GART, St = GART_PAL.stone; return A.P(St[1], A.rrect(-14, -6, 28, 6, 1.500)) + A.P(St[2], A.rrect(-10, -11, 20, 6, 1.500)) + A.P(St[2], A.rect(-3, -42, 6, 32)) + A.P(St[3], A.rect(-2.400, -42, 2, 32), 0.7) + A.P(St[2], A.rrect(-11, -38, 22, 6, 1.500)) + A.S(St[0], 0.9, 'M-5 -7h10', 0.7); },
  finger() { const A = GART, Wd = GART_PAL.wood; return _gwWoodPost(0, 40, 4.5) + A.P(Wd[1], 'M2 -37H20L24 -34L20 -31H2z') + A.P(Wd[3], 'M-2 -29H-20L-24 -26L-20 -23H-2z') + A.P(Wd[2], 'M2 -21H18L22 -18L18 -15H2z') + A.S(Wd[0], 0.8, 'M6 -34h10M-6 -26h-10M6 -18h8', 0.7); },
  seat() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[0], A.rect(-30, -9, 4, 9) ) + A.P(Wd[0], A.rect(26, -9, 4, 9)) + A.P(Wd[1], A.rrect(-34, -13, 68, 5, 1.500)) + A.P(Wd[1], A.rrect(-34, -28, 68, 6, 1.500)) + A.P(Wd[3], A.rect(-32, -27, 64, 1.400), 0.7) + A.S(Wd[0], 3, 'M-28 -13V-26M28 -13V-26'); },
  topiary(sc) { const A = GART, c = sc.season === 'winter' ? '#6f8470' : '#3f7a3e', l = sc.season === 'winter' ? '#94a48c' : '#5f9a52'; return A.P('#8a5a3a', 'M-9 0L-7 -9H7L9 0z') + A.P(c, A.circ(0, -20, 13) + A.circ(-2, -35, 8)) + A.P(l, A.circ(-4, -24, 6) + A.circ(-4, -38, 3.500), 0.9); },
  statue() { const A = GART, St = GART_PAL.stone; return A.P(St[1], A.rrect(-13, -14, 26, 14, 1.500)) + A.P(St[2], 'M-7 -14L-8 -38Q0 -44 8 -38L7 -14z') + A.P(St[3], 'M-6 -15L-7 -37H-2L-2 -15z', 0.7) + A.P(St[2], A.circ(0, -48, 6)) + A.P(St[0], 'M-9 -51H9L5 -55H-5z') + A.S(St[2], 3.4, 'M7 -34L17 -26M17 -26L22 -29'); },
  stones(sc) { const A = GART, St = GART_PAL.stone; let s = ''; for (const [x, h, k] of [[-70, 30, 1], [-38, 40, 1.15], [-6, 26, 0.9], [26, 36, 1.1], [62, 28, 1]]) s += A.P('#1c2a14', A.ell(x + 3, 1, 11 * k, 2.400), 0.2) + A.P(St[1], `M${x - 8 * k} 0L${x - 5 * k} ${-h}Q${x} ${-h - 4} ${x + 5 * k} ${-h}L${x + 8 * k} 0z`) + A.P(St[3], `M${x - 5 * k} -2L${x - 3.500 * k} ${-h + 2}H${x - k}L${x - 2 * k} -2z`, 0.7); return s; },
  cairn() { const A = GART, St = GART_PAL.stone; let s = ''; for (const [x, y, r] of [[-11, -5, 7], [2, -5, 8], [13, -4, 5], [-5, -14, 6.500], [6, -14, 5.500], [0, -23, 5], [1, -30, 3]]) s += A.P(St[1 + (Math.abs(x) % 2)], A.ell(x, y, r, r * 0.72)) + A.P(St[3], A.ell(x - r * 0.3, y - r * 0.26, r * 0.4, r * 0.18), 0.8); return s; },
  tower(sc) { const A = GART, St = GART_PAL.stone; return A.P(St[1], 'M-50 0V-22L-40 -30L-36 -48L-26 -44V-72L-14 -66L-8 -76L4 -68V-42L14 -38L20 -22L34 -18L50 -8V0z') + A.P(St[3], 'M-44 -4V-22L-38 -28L-34 -44H-30V-4z', 0.5) + A.P('#3a3a44', 'M-14 -38V-52Q-8 -60 -2 -52V-38z') + A.S(St[0], 1, 'M-40 -14H-10M-26 -28H0M-20 -56H2M10 -22H40', 0.5) + (sc.season === 'winter' ? '' : A.P('#4f8a44', A.blob(A.rng(5), 30, -14, 18, 8, 9, 0.3) + A.blob(A.rng(7), -22, -66, 8, 5, 8, 0.3), 0.95)); },
  chapel(sc) { const A = GART, St = GART_PAL.stone; return A.P(St[1], 'M-52 0V-34L-44 -42V-30H-30V-52L-14 -74L2 -52V-30H16V-42L24 -36L34 -44V-30L52 -22V0z') + A.P('#3f4a3f', 'M-12 0V-30Q-6 -44 0 -30V0z') + A.P('#3f4a3f', 'M-44 -6V-20Q-40 -28 -36 -20V-6zM24 -6V-20Q28 -28 32 -20V-6z') + A.S(St[0], 0.9, 'M-50 -12H-16M4 -12H50M-30 -24H0', 0.5) + A.P(St[3], 'M-48 -2V-30L-44 -34V-2z', 0.5) + A.S('#8a7a5a', 1.2, 'M-6 -58V-30') + A.P('#a8841a', 'M-10 -60Q-6 -68 -2 -60z'); },
  stump() { const A = GART; return A.P('#6a4a2e', 'M-22 0Q-20 -8 -18 -22H18Q20 -8 22 0Q28 3 30 4H-30Q-28 3 -22 0z') + A.P('#c8a06a', A.ell(0, -22, 18, 5)) + A.S('#8a6a44', 0.8, A.ell(0, -22, 12, 3.400) + A.ell(0, -22, 6, 1.700)) + A.P('#a8483a', A.rrect(-4, -11, 8, 11, 3.500)) + A.P('#f2c432', A.circ(2, -5, 0.9)); },
  wall(sc) { const A = GART, St = GART_PAL.stone; let s = ''; for (let j = 0; j < 3; j++) for (let x = -44 + j * 6; x < 40; x += 13) s += A.P(St[1 + ((x + j * 3) & 1)], A.rrect(x, -7 - j * 6, 12, 6, 2)); return s + (sc.season === 'winter' ? '' : A.P('#5f8a4a', A.blob(A.rng(9), 28, -18, 12, 3, 7, 0.3), 0.9)); },
  barn(sc) { const A = GART, Wd = GART_PAL.wood; return A.P('#8a3a2e', A.rect(-58, -46, 116, 46)) + A.S('#6a2a20', 1, 'M-40 -46V0M-22 -46V0M22 -46V0M40 -46V0', 0.6) + A.P('#6a2a20', A.rect(-16, -36, 32, 36)) + A.S('#f4e8d0', 1.6, 'M-16 -36L16 0M16 -36L-16 0') + A.P('#5a4a3a', 'M-64 -44L0 -78L64 -44z') + A.P('#7a6a5a', 'M-58 -46L-4 -74L-20 -46z', 0.6) + (sc.season === 'winter' ? A.P(GART_PAL.snow, 'M-62 -45L0 -78L62 -45L0 -62z') : ''); },
  hay(sc) { const A = GART, c = sc.season === 'winter' ? '#c8bc90' : '#d8b44a', d = '#a88a30'; let t = ''; for (let i = 0; i < 26; i++) { const x = -32 + (i * 37 % 64), y = -6 - (i * 13 % 34) * (1 - Math.abs(x) / 44); t += `M${x} ${y}l${(i % 5) - 2} -6`; } return A.P(c, 'M-40 0Q-36 -36 0 -42Q36 -36 40 0z') + A.P(A.lt(c, 0.2), 'M-30 -4Q-28 -30 -6 -38Q-20 -22 -18 -4z', 0.8) + A.S(d, 0.9, t, 0.8); },
  cart() { const A = GART, Wd = GART_PAL.wood; return `<g transform="rotate(-9)">${A.P(Wd[1], A.rrect(-34, -24, 60, 16, 1.500))}${A.S(Wd[0], 1, 'M-34 -18H26', 0.6)}${A.S(Wd[0], 2.400, 'M26 -14L46 -8')}</g>` + A.S(Wd[0], 2.400, A.circ(-14, -8, 8)) + A.S(Wd[0], 1, 'M-14 -16V0M-22 -8H-6', 0.8) + A.P(Wd[0], A.ell(20, 0, 9, 2)); },
  lighthouse(sc) { const A = GART, night = sc.tod === 'night' || sc.tod === 'dusk'; return A.P('#f4f0e6', 'M-15 0L-9 -74H9L15 0z') + A.P('#c8382a', 'M-13 -18L-12 -36H12L13 -18zM-10.500 -54L-9.800 -68H9.800L10.500 -54z') + A.P('#ffffff', 'M-12 -2L-7 -72H-4L-7 -2z', 0.3) + A.P('#3a3f44', A.rrect(-12, -78, 24, 4, 1)) + A.P(night ? '#ffe08a' : '#cfe6f2', A.rect(-7, -92, 14, 14)) + A.S('#3a3f44', 1.200, 'M-7 -92V-78M7 -92V-78M0 -92V-78') + A.P('#c8382a', 'M-10 -92L0 -102L10 -92z') + A.P('#6a4a2e', A.rrect(-4, -14, 8, 14, 3)) + (night ? A.P('#ffe08a', A.circ(0, -85, 18), 0.25) : ''); },
  hull() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], 'M-44 -2Q-36 -24 0 -26Q36 -24 44 -2Q0 2 -44 -2z') + A.S(Wd[0], 1, 'M-38 -8Q0 -16 38 -8M-30 -16Q0 -22 30 -16', 0.7) + A.P(Wd[3], 'M-34 -8Q-24 -20 -4 -24Q-20 -14 -24 -6z', 0.5) + A.P('#2a2a2a', A.ell(-14, -1, 14, 2), 0.35); },
  temple(sc) { const A = GART, St = GART_PAL.stone; let c = ''; for (const [x, h] of [[-54, 50], [-28, 50], [4, 34], [32, 22]]) c += A.P(St[2], A.rect(x, -h, 11, h)) + A.P(St[3], A.rect(x + 1, -h, 3, h), 0.7) + A.S(St[0], 0.7, `M${x + 7} ${-h}V0`, 0.5); return A.P(St[1], A.rrect(-62, -5, 110, 6, 1)) + c + A.P(St[2], 'M-60 -50H-16L-12 -56H-60z') + A.P(St[1], A.ell(52, -4, 14, 6)) + A.P(St[1], A.rrect(16, -5, 12, 5, 1.500)); },
  summer(sc) { const A = GART, Wd = GART_PAL.wood; return A.P('#e8e0cc', A.rect(-30, -28, 60, 28)) + A.P('#3f4a3f', A.rrect(-12, -24, 24, 24, 4)) + A.S(Wd[0], 2.400, 'M-30 -28V0M30 -28V0') + A.P('#4f7f8a', 'M-38 -26Q0 -64 38 -26z') + A.P('#6fa0aa', 'M-30 -28Q-14 -52 -2 -56Q-14 -40 -16 -28z', 0.7) + A.P('#f2c432', A.circ(0, -56, 2.400)); },
  hide() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rect(-40, -26, 80, 26)) + A.S(Wd[0], 0.8, 'M-40 -18H40M-40 -9H40', 0.5) + A.P('#2a2418', A.rect(-24, -19, 48, 5)) + A.P(Wd[0], 'M-44 -24L0 -38L44 -24z') + A.S('#7a8a4a', 1, 'M-46 0q-1 -8 -3 -12M46 0q1 -8 3 -12M-36 0q0 -6 -1 -9', 0.9); },
  boathouse(sc) { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rect(-56, -30, 112, 30)) + A.S(Wd[0], 0.8, 'M-40 -30V0M-20 -30V0M20 -30V0M40 -30V0', 0.5) + A.P('#2a3a4a', A.rrect(-18, -24, 36, 24, 3)) + A.P('#5f6a5a', 'M-62 -28L0 -52L62 -28z') + A.P('#7f8a7a', 'M-56 -30L-4 -50L-20 -30z', 0.5) + A.P('#c8382a', A.circ(36, -18, 5)) + A.P('#f4f0e6', A.circ(36, -18, 2.400)); },
  bridge() { const A = GART, St = GART_PAL.stone; return A.P(St[1], 'M-26 2Q0 -12 26 2V6H-26z') + A.P(St[3], 'M-26 1Q0 -13 26 1V-3Q0 -17 -26 -3z') + A.S(St[0], 0.8, 'M-16 -9V-4M-6 -12V-7M6 -12V-7M16 -9V-4', 0.6); },
  gate(sc) { const A = GART, St = GART_PAL.stone; const leaf = sc.season === 'winter' ? '#9aa890' : sc.season === 'autumn' ? '#c8802e' : '#5f9a52'; return A.P(St[1], A.rrect(-27, -48, 7, 48, 1.500)) + A.P(St[1], A.rrect(20, -48, 7, 48, 1.500)) + A.P(St[3], A.rect(-26, -47, 2, 46), 0.7) + A.S(St[1], 6, 'M-24 -48Q0 -72 24 -48') + A.S(St[3], 1.400, 'M-24 -51Q0 -74 24 -51', 0.7) + A.P(leaf, A.blob(A.rng(3), -20, -56, 9, 6, 8, 0.3) + A.blob(A.rng(4), 16, -62, 8, 5, 8, 0.3), 0.95); },
  falls(sc) { const A = GART, St = GART_PAL.stone, w = sc.season === 'winter' ? '#d6e8f0' : '#8ad0e8'; return A.P(St[1], 'M-46 0L-42 -40L-24 -58L4 -62L30 -52L46 -30L48 0z') + A.P(St[3], 'M-40 -6L-36 -40L-22 -54L-14 -50L-28 -30L-30 -6z', 0.5) + A.P(St[0], 'M16 -50L34 -40L40 -8L24 -4z', 0.5) + A.P(w, 'M-12 -56Q-4 -60 6 -56L10 -2Q0 2 -14 -2z') + A.S('#ffffff', 1.300, 'M-8 -54L-9 -6M-2 -56L-2 -2M4 -54L6 -4', 0.8) + A.P('#ffffff', A.ell(-2, 0, 18, 4), 0.7) + A.P('#4f8a44', A.blob(A.rng(2), -30, -46, 12, 6, 8, 0.3) + A.blob(A.rng(3), 28, -48, 10, 5, 8, 0.3), 0.9); },
  grotto() { const A = GART, St = GART_PAL.stone; let f = ''; for (const [x, y] of [[-30, -4], [-24, -24], [24, -6], [30, -18], [-8, -38]]) for (let k = -2; k <= 2; k++) f += A.leaf(x, y, k * 0.6, 11, 1.8, 0.4); return A.P(St[1], 'M-42 0Q-44 -34 -14 -42Q14 -48 38 -30Q46 -14 42 0z') + A.P('#20281c', 'M-18 0Q-20 -24 0 -26Q20 -24 18 0z') + A.P('#5fb0cc', A.ell(0, -2, 13, 3), 0.8) + `<path fill="#3f7a3e" d="${f}"/>`; },
  shepherd() { const A = GART, Wd = GART_PAL.wood; return A.S('#3a3f44', 2, A.circ(-12, -5, 5) + A.circ(12, -5, 5)) + A.P('#5f7f6a', A.rrect(-22, -30, 44, 21, 2)) + A.P('#4a4a4a', 'M-25 -30Q0 -46 25 -30z') + A.P(Wd[1], A.rrect(-16, -26, 10, 15, 1)) + A.P('#cfe6f2', A.rect(2, -26, 12, 9)) + A.S('#3a3f44', 2.400, 'M12 -38V-46'); },
  folly(sc) { const A = GART, St = GART_PAL.stone; return A.P(St[2], 'M-16 0L-13 -72H13L16 0z') + A.P(St[3], 'M-14 -2L-11 -70H-5L-8 -2z', 0.6) + A.P(St[1], A.rect(-16, -80, 32, 9)) + [-13, -4, 5].map(x => A.P(St[1], A.rect(x, -86, 7, 6))).join('') + A.P('#3a3a44', A.rrect(-4, -56, 8, 14, 4)) + A.S('#3a3f44', 1.200, 'M6 -86V-108') + A.P('#c8382a', 'M6 -108L24 -102L6 -96z'); },
  beacon() { const A = GART; return A.S('#6a4a2e', 3.400, 'M0 0V-30') + A.S('#3a3f44', 1.400, 'M-9 -44L-6 -30H6L9 -44M-9 -44H9M-3 -44L-2 -30M3 -44L2 -30') + A.P('#5a3a22', A.ell(0, -40, 7, 3)) + A.S('#6a4a2e', 2, 'M-8 0L0 -10L8 0'); },
  warren() { const A = GART; return A.P('#8a9a5a', 'M-30 0Q-16 -14 0 -14Q16 -14 30 0z') + A.P('#2a2418', A.ell(-12, -4, 4, 2.600) + A.ell(6, -7, 3.500, 2.200) + A.ell(16, -2.500, 3, 1.800)); },
  ring(sc) { const A = GART, lf = sc.season === 'winter' ? '#9aa890' : sc.season === 'autumn' ? '#c88a30' : '#4f8a44'; let s = ''; for (const [x, y, k] of [[-78, -6, 1], [-40, -22, 0.8], [8, -24, 0.8], [52, -20, 0.85], [78, -2, 1.05]]) s += A.P('#5a3f28', `M${x - 9 * k} ${y}Q${x - 6 * k} ${y - 28 * k} ${x - 7 * k} ${y - 50 * k}H${x + 7 * k}Q${x + 6 * k} ${y - 28 * k} ${x + 9 * k} ${y}Q${x + 13 * k} ${y + 2} ${x + 14 * k} ${y + 3}H${x - 14 * k}Q${x - 13 * k} ${y + 2} ${x - 9 * k} ${y}z`) + A.P(lf, A.blob(A.rng(x + 90), x, y - 62 * k, 24 * k, 18 * k, 10, 0.2)); return s + A.P('#8a9a5a', A.ell(0, -8, 34, 8), 0.6); },
  hollow(sc) { const A = GART, lf = sc.season === 'winter' ? '#9aa890' : sc.season === 'autumn' ? '#c8802e' : '#4f8a44'; return A.P('#5a3f28', 'M-18 0Q-14 -30 -16 -56H16Q14 -30 18 0Q24 3 28 4H-28Q-24 3 -18 0z') + A.P('#1e1610', 'M-9 0Q-11 -22 0 -30Q11 -22 9 0z') + A.P('#8a6a44', A.rect(-6, -16, 12, 1.800)) + A.P(lf, A.blob(A.rng(8), 0, -74, 34, 26, 11, 0.2)) + A.P(A.lt(lf, 0.2), A.blob(A.rng(9), -9, -82, 16, 11, 9, 0.2), 0.9); },
  treehouse(sc) { const A = GART, Wd = GART_PAL.wood, lf = sc.season === 'winter' ? '#9aa890' : sc.season === 'autumn' ? '#c8802e' : '#4f8a44'; return A.P('#5a3f28', 'M-10 0L-7 -66H7L10 0z') + A.P(lf, A.blob(A.rng(4), 0, -92, 44, 26, 11, 0.2)) + A.P(Wd[1], A.rrect(-30, -60, 60, 4, 1)) + A.P(Wd[3], A.rrect(-22, -82, 44, 22, 1.500)) + A.P('#3a2a1a', A.rect(-5, -76, 10, 16)) + A.P('#8a4a30', 'M-28 -80L0 -96L28 -80z') + A.S(Wd[0], 1.300, 'M22 -56V-14M28 -56V-14M22 -46H28M22 -36H28M22 -26H28') + A.S('#c8bc90', 0.7, 'M-26 -56V-12'); },
  clamp() { const A = GART; return A.P('#5a5a3a', 'M-34 0Q-24 -24 0 -26Q24 -24 34 0z') + A.P('#3a3a2a', 'M-12 -24Q0 -28 12 -24Q6 -20 -6 -20z') + A.P('#7a7a4a', 'M-28 -2Q-20 -18 -8 -22Q-14 -10 -16 -2z', 0.7); },
  barrels() { const A = GART, Wd = GART_PAL.wood; const b = (x, y) => A.P(Wd[1], A.rrect(x - 9, y - 18, 18, 18, 5)) + A.S('#3a3f44', 1.300, `M${x - 9} ${y - 13}h18M${x - 9} ${y - 5}h18`) + A.P(Wd[3], A.rect(x - 6, y - 16, 3, 14), 0.5); return b(-12, 0) + b(9, 0) + b(-2, -17); },
  pump() { const A = GART; return A.P('#3f6f5a', A.rrect(-6, -36, 12, 36, 2)) + A.P('#2f5a48', A.rrect(-8, -40, 16, 5, 2)) + A.S('#2f5a48', 3, 'M6 -30L16 -24M-6 -36L-22 -46') + A.P('#7a8288', 'M12 -8L26 -8L24 0H14z') + A.P('#5fb0cc', A.ell(19, -7, 5, 1.300)); },
  boles(sc) { const A = GART, St = GART_PAL.stone; return A.P(St[1], A.rrect(-22, -32, 44, 32, 2)) + A.P('#3a3a30', A.rrect(-17, -24, 14, 18, 6)) + A.P('#3a3a30', A.rrect(3, -24, 14, 18, 6)) + A.P('#c89a4a', 'M-15 -6Q-15 -20 -10 -20Q-5 -20 -5 -6z') + A.P('#c89a4a', 'M5 -6Q5 -20 10 -20Q15 -20 15 -6z'); },
  wish() { const A = GART, St = GART_PAL.stone, Wd = GART_PAL.wood; return A.P(St[2], A.rrect(-16, -14, 32, 14, 7)) + A.P('#12222e', A.ell(0, -14, 13, 4)) + A.S(Wd[0], 2.600, 'M-14 -12V-38M14 -12V-38M-14 -32H14') + A.P('#a8483a', 'M-22 -36L0 -50L22 -36z') + A.S('#6a4a2e', 1, 'M0 -32V-20') + A.P('#f2c432', A.circ(-20, -3, 1.500) + A.circ(19, -2, 1.200)); },
  mill() { const A = GART, Wd = GART_PAL.wood, St = GART_PAL.stone; let sp = ''; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; sp += `M42 -18L${42 + Math.cos(a) * 16} ${-18 + Math.sin(a) * 16}`; } return A.P(St[1], A.rect(-48, -40, 76, 40)) + A.P(St[3], A.rect(-46, -38, 12, 36), 0.5) + A.P('#8a4a30', 'M-54 -38L-10 -62L34 -38z') + A.P(Wd[1], A.rrect(-14, -24, 14, 24, 2)) + A.P('#3a4a5a', A.rect(-38, -30, 10, 10)) + A.S(Wd[0], 3, A.circ(42, -18, 16)) + A.S(Wd[0], 1.800, sp); },
  rope() { const A = GART; return A.S('#8a6a44', 1.400, 'M-26 -14Q0 -2 26 -14M-26 -6Q0 6 26 -6') + A.S('#6e4c2a', 3, 'M-26 -16V2M26 -16V2') + A.S('#a67c50', 2.600, 'M-18 -3V0M-11 0V3M-4 2V5M4 2V5M11 0V3M18 -3V0'); },
  turf(sc) { const A = GART, c = sc.season === 'winter' ? '#b8c0ac' : '#6f9a4a'; return A.P(c, A.ell(0, -8, 60, 15)) + `<path d="M0 -8c8 -5 22 -2 24 2s-16 8 -30 6s-22 -6 -18 -10s26 -9 44 -6s30 8 26 14s-30 12 -52 10s-36 -8 -32 -14" fill="none" stroke="#e8dcb4" stroke-width="2.600" stroke-linecap="round"/>`; },
  smoke() { const A = GART; return A.P('#2f2a26', A.rect(-40, -30, 80, 30)) + A.S('#16120f', 0.8, 'M-26 -30V0M-12 -30V0M12 -30V0M26 -30V0', 0.8) + A.P('#1e1a18', 'M-46 -28L0 -50L46 -28z') + A.P('#16120f', A.rect(-8, -22, 16, 22)) + A.P('#2f2a26', A.rect(14, -56, 9, 18)); },
  ice() { const A = GART, Wd = GART_PAL.wood; return A.P('#6f8a4a', 'M-42 0Q-34 -36 0 -38Q34 -36 42 0z') + A.P('#8aa45a', 'M-34 -4Q-28 -28 -8 -34Q-20 -18 -22 -4z', 0.8) + A.P('#9a968a', A.rrect(-13, -24, 26, 24, 8)) + A.P(Wd[0], A.rrect(-9, -20, 18, 20, 5)) + A.S('#3a3f44', 1.400, 'M-9 -13H9M-9 -5H9'); },
  frogstone() { const A = GART, St = GART_PAL.stone; return A.P(St[1], 'M-18 0Q-20 -16 -6 -20Q10 -22 18 -8Q20 -2 18 0z') + A.P(St[3], A.circ(-8, -21, 4) + A.circ(4, -22, 4)) + A.P('#2a2a2a', A.circ(-8, -21, 1.500) + A.circ(4, -22, 1.500)) + A.S(St[0], 1, 'M-12 -11Q0 -6 12 -10'); },
  churn() { const A = GART; const c = (x) => A.P('#a8b0b6', `M${x - 6} 0L${x - 7} -14L${x - 3} -20V-24H${x + 3}V-20L${x + 7} -14L${x + 6} 0z`) + A.P('#7a8288', A.rect(x - 4, -26, 8, 2.500)) + A.P('#ffffff', A.rect(x - 4.500, -14, 2, 12), 0.4); return A.P('#8a6a44', A.rrect(-16, -2, 32, 3, 1)) + c(-7) + c(8); },
  drift() { const A = GART; return A.S('#b8ae98', 4.400, 'M-34 0Q-30 -34 -6 -48') + A.S('#a89e88', 3.800, 'M32 0Q30 -30 2 -50') + A.S('#c8bea8', 2.200, 'M-20 -14L24 -18M-10 -34L16 -30M-30 -8L-38 -22M28 -8L38 -20'); },
  sunken() { const A = GART, St = GART_PAL.stone; return A.P(St[0], A.rrect(-40, -14, 80, 20, 5)) + A.P(St[1], A.rrect(-34, -11, 68, 15, 4)) + A.P(St[2], A.rrect(-28, -8, 56, 10, 3)) + A.P('#4f93be', A.rrect(-22, -6, 44, 7, 2)) + A.P('#ffffff', A.rect(-16, -5, 18, 0.900), 0.6); },
  picnic() { const A = GART, Wd = GART_PAL.wood; return A.P(Wd[1], A.rrect(-30, -22, 60, 5, 1.500)) + A.P(Wd[3], A.rect(-28, -21.500, 56, 1.200), 0.7) + A.S(Wd[0], 2.800, 'M-20 -18L-26 0M20 -18L26 0') + A.P(Wd[1], A.rrect(-40, -9, 80, 4, 1.300)) + A.P('#d83a3a', A.rect(-8, -23, 16, 1.400)); },
  mile() { const A = GART, St = GART_PAL.stone; return A.P(St[1], 'M-8 0V-20Q0 -28 8 -20V0z') + A.P(St[3], 'M-6 -2V-20Q-3 -24 -1 -24V-2z', 0.6) + A.S(St[0], 1.400, A.ell(0, -13, 2.400, 3.400)); },
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
/* Large regions share their exact authored coast contours with access. These
 * detached rows are reused by native retained art, Classic and photographs. */
const _GLD_ISLAND_REGIONS = { data: null, geometry: [], stands: null, artKey: '', art: [], understoryKey: '', understory: null };
function _gldIslandRegionGeometry() {
  if (typeof gardenIslandActive !== 'function' || !gardenIslandActive()) return [];
  const data = gardenIslandData();
  if (_GLD_ISLAND_REGIONS.data === data) return _GLD_ISLAND_REGIONS.geometry;
  const W = GARDEN_WORLD, rows = [];
  for (const region of data.regions || []) for (let i = 0; i < region.polygons.length; i++) {
    let points = region.polygons[i].map(p => ({ x: p[0] * W.cellW, y: W.sky + p[1] * W.cellH }));
    let area = 0; for (let j = 0; j < points.length; j++) { const a = points[j], b = points[(j + 1) % points.length]; area += a.x * b.y - b.x * a.y; }
    if (area < 0) points = points.reverse();
    const xs = points.map(p => p.x), ys = points.map(p => p.y), x = Math.min(...xs), y = Math.min(...ys);
    rows.push({ id: 'region:' + region.id + ':' + i, area: 'zn-' + region.zone, zone: region.zone, region, points, holes: [], bounds: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y } });
  }
  _GLD_ISLAND_REGIONS.data = data; _GLD_ISLAND_REGIONS.geometry = rows; _GLD_ISLAND_REGIONS.stands = null; _GLD_ISLAND_REGIONS.artKey = ''; _GLD_ISLAND_REGIONS.art = []; _GLD_ISLAND_REGIONS.understoryKey = ''; _GLD_ISLAND_REGIONS.understory = null;
  return rows;
}
function _gldIslandRegionPath(points) { return points.map((p, i) => `${i ? 'L' : 'M'}${GART.f1(p.x)} ${GART.f1(p.y)}`).join('') + 'Z'; }
function _gldIslandRegionTone(region, season) {
  const theme = String(region.theme || region.id), winter = season === 'winter';
  return /mount|headland|peak/.test(theme) ? winter ? '#9cafac' : '#8a9b84'
    : /ruin/.test(theme) ? winter ? '#96ad9a' : '#789774'
      : /wood|forest/.test(theme) ? winter ? '#859f8d' : season === 'autumn' ? '#768d62' : '#6f926e'
        : /orchard/.test(theme) ? winter ? '#a5b69b' : '#91ad79' : winter ? '#a5b9a3' : '#8aad7c';
}
function _gldIslandRegionFloor(sc) {
  return _gldIslandRegionGeometry().map(row => `<path d="${_gldIslandRegionPath(row.points)}" fill="${_gldIslandRegionTone(row.region, sc.season)}" fill-opacity=".42"/>`).join('');
}
function _gldIslandRegionStands() {
  _gldIslandRegionGeometry();
  if (_GLD_ISLAND_REGIONS.stands) return _GLD_ISLAND_REGIONS.stands;
  const W = GARDEN_WORLD, data = gardenIslandData(), out = [];
  // Classify once for this immutable geometry. Checking only the actual crown,
  // narrow trunk and low shadow leaves clear grass shoulders available without
  // allowing foliage over a path, plot, doorway, beach, water or rocky outcrop.
  const cells = new Array(W.cols * W.rows);
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const cell = gardenIslandBaseCell(x, y), row = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null;
    cells[y * W.cols + x] = cell && cell.land && !cell.beach && !cell.freshwater && !cell.reserved && !cell.solid && !(row && (row.plot || row.solid || row.trail || row.lane)) ? cell.region : '';
  }
  const ellipseTouchesCell = (cx, cy, rx, ry, x, y) => {
    const px = Math.max(x * W.cellW, Math.min((x + 1) * W.cellW, cx)), py = Math.max(y * W.cellH, Math.min((y + 1) * W.cellH, cy));
    return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
  };
  const fits = (fx, fy, height, region) => {
    const px = fx * W.cellW, py = fy * W.cellH;
    // Enclose both the retained native crown and the wider Classic/Photo tree.
    // The padded lobes also leave room for the existing small wind movement.
    const crown = { x: px, y: py - height * .68, rx: height * .49 + 3, ry: height * .45 + 3 };
    const shadow = { x: px + 4, y: py + 3, rx: height * .29 + 3, ry: height * .07 + 3 };
    const trunk = { x0: px - height * .105 - 3, x1: px + height * .105 + 3, y0: py - height * .64, y1: py + 5 };
    const left = Math.floor((px - crown.rx) / W.cellW), right = Math.floor((px + crown.rx) / W.cellW);
    const top = Math.floor((crown.y - crown.ry) / W.cellH), bottom = Math.floor((shadow.y + shadow.ry) / W.cellH);
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
      const touches = ellipseTouchesCell(crown.x, crown.y, crown.rx, crown.ry, x, y)
        || ellipseTouchesCell(shadow.x, shadow.y, shadow.rx, shadow.ry, x, y)
        || x * W.cellW < trunk.x1 && (x + 1) * W.cellW > trunk.x0 && y * W.cellH < trunk.y1 && (y + 1) * W.cellH > trunk.y0;
      if (touches && (x < 0 || y < 0 || x >= W.cols || y >= W.rows || cells[y * W.cols + x] !== region.id)) return false;
    }
    // Cell-centre classification remains a lookup aid. Rounded continuous coast
    // and freshwater boundaries stay authoritative at the actual crown edge.
    for (let i = 0; i < 20; i++) {
      const a = i * Math.PI / 10, x = (crown.x + Math.cos(a) * crown.rx) / W.cellW, y = (crown.y + Math.sin(a) * crown.ry) / W.cellH;
      if (!gardenIslandLandContains(x, y) || gardenIslandRegionAt(x, y) !== region || data.freshwater.some(water => water.boundary ? _gardenIslandInLoop(x, y, water.boundary) : _gardenIslandRect(x, y, water.wet))) return false;
    }
    return true;
  };
  for (const region of data.regions || []) {
    const theme = String(region.theme || region.id), orchard = /orchard/.test(theme), mountain = /mount|headland|peak/.test(theme);
    const profile = /wood|forest/.test(theme) ? { maximum: 26, heights: [234, 198, 168], gapX: 2.15, gapY: 2.8, edge: true }
      : orchard ? { maximum: 18, heights: [184, 164, 144], gapX: 3.35, gapY: 3.7, rows: true }
        : /ruin/.test(theme) ? { maximum: 16, heights: [218, 186, 156], gapX: 2.55, gapY: 3.1, edge: true }
          : /valley|mill/.test(theme) ? { maximum: 10, heights: [198, 174, 150], gapX: 2.75, gapY: 3.3, edge: true }
            : mountain ? { maximum: 12, heights: [210, 180, 152], gapX: 2.6, gapY: 3.1, edge: true } : null;
    // The home village intentionally keeps its broad open green.
    if (!profile || !region.zone) continue;
    const points = region.polygons.flat(), xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), candidates = [];
    const rowX = Math.ceil(minX) + 2.5, rowY = Math.ceil(minY) + 4.65;
    for (let y = Math.ceil(minY) + 1; y < maxY - 1; y++) for (let x = Math.ceil(minX) + 1; x < maxX - 1; x++) {
      const seed = gardenHash('island-grove-2|' + region.id + '|' + x + ':' + y);
      const fx = x + .5 + (orchard ? 0 : (seed % 9 - 4) * .035), fy = y + .65 + (orchard ? 0 : ((seed >>> 4) % 7 - 3) * .035);
      if (cells[y * W.cols + x] !== region.id) continue;
      let height = 0;
      for (const base of profile.heights) { const size = base + (seed >>> 8) % 13 - 6; if (fits(fx, fy, size, region)) { height = size; break; } }
      if (!height) continue;
      const edgeDistance = profile.edge ? gardenIslandCoastDistance(fx, fy) : 0;
      const phase = (value, period) => { const a = ((value % period) + period) % period; return Math.min(a, period - a); };
      const rowDistance = profile.rows ? phase(fx - rowX, 4) * 2 + phase(fy - rowY, 5) * 3 : 0;
      const bucketX = Math.min(2, Math.floor((fx - minX) / Math.max(1, maxX - minX) * 3)), bucketY = Math.min(2, Math.floor((fy - minY) / Math.max(1, maxY - minY) * 3));
      candidates.push({ id: 'region-tree:' + region.id + ':' + x + ':' + y, kind: 'tree', region: region.id, theme, x: fx * W.cellW, y: W.sky + fy * W.cellH, height, width: height * (mountain ? .27 : orchard ? .32 : .34), seed, cellX: fx, cellY: fy,
        bucket: bucketY * 3 + bucketX, score: rowDistance * 180 + edgeDistance * .13 - height * .9 + seed % 29 });
    }
    // Spread separate groves around the region before adding companions to a
    // grove. Orchard candidates prefer a spaced four-by-five-cell row rhythm.
    const buckets = Array.from({ length: 9 }, () => []), chosen = [];
    for (const candidate of candidates) buckets[candidate.bucket].push(candidate);
    for (const bucket of buckets) bucket.sort((a, b) => a.score - b.score || a.seed - b.seed);
    let progressed = true;
    while (chosen.length < profile.maximum && progressed) {
      progressed = false;
      for (const bucket of buckets) {
        while (bucket.length) {
          const next = bucket.shift();
          if (chosen.some(tree => ((next.cellX - tree.cellX) / profile.gapX) ** 2 + ((next.cellY - tree.cellY) / profile.gapY) ** 2 < 1)) continue;
          const { bucket: unusedBucket, score: unusedScore, ...tree } = next;
          chosen.push(tree); progressed = true; break;
        }
        if (chosen.length >= profile.maximum) break;
      }
    }
    out.push(...chosen);
  }
  return _GLD_ISLAND_REGIONS.stands = out;
}
/** Low ground foliage occupies clear common only. The authored map has narrow
 * clear pockets between plots and paths, so these are moss, fern and grass
 * masses, not mature tree crowns or new physical obstacles. */
function _gldIslandUnderstoryRows(sc) {
  _gldIslandRegionGeometry();
  const cache = _GLD_ISLAND_REGIONS, key = sc.season;
  if (cache.understoryKey === key && cache.understory) return cache.understory;
  const A = GART, W = GARDEN_WORLD, data = gardenIslandData(), chunks = new Map(), winter = key === 'winter', autumn = key === 'autumn';
  const rect = (x, y, r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
  const touches = (x, y, r) => x + 1 > r.x && y + 1 > r.y && x < r.x + r.w && y < r.y + r.h;
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const cell = gardenIslandBaseCell(x, y), row = typeof gardenLandCell === 'function' ? gardenLandCell(x, y) : null;
    if (!cell || !cell.regionZone || !cell.land || cell.beach || cell.freshwater || cell.reserved || cell.solid || row && (row.plot || row.solid || row.trail || row.lane)) continue;
    const region = gardenIslandRegionAt(x + .5, y + .5); if (!region || !region.zone) continue;
    // A facade/apron may end part-way through a cell. Keep its whole visual
    // envelope clear rather than relying on its cell-centre classification.
    if (data.static.some(p => touches(x, y, p) || p.apron && touches(x, y, p.apron) || p.rearEnvelope && touches(x, y, p.rearEnvelope))) continue;
    let clear = true;
    for (const [dx, dy] of [[.025,.025],[.975,.025],[.975,.975],[.025,.975]]) {
      const px = x + dx, py = y + dy;
      if (gardenIslandRegionAt(px, py) !== region || gardenIslandCoastDistance(px, py) <= data.coast.beachWidthPx || data.freshwater.some(water => water.boundary ? _gardenIslandInLoop(px, py, water.boundary) : rect(px, py, water.wet))) { clear = false; break; }
    }
    if (!clear) continue;
    const id = region.id + ':' + Math.floor(x / 10) + ':' + Math.floor(y / 10);
    if (!chunks.has(id)) chunks.set(id, { id, region, cells: [] });
    chunks.get(id).cells.push([x, y]);
  }
  const out = [];
  for (const chunk of chunks.values()) {
    const theme = String(chunk.region.theme || chunk.region.id), forest = /wood|forest/.test(theme), orchard = /orchard/.test(theme), mountain = /mount|headland|peak/.test(theme), valley = /valley|mill/.test(theme);
    const colors = forest ? winter ? ['#77917b','#8fa18b','#b2bd9c'] : autumn ? ['#627c50','#86924d','#b1a367'] : ['#486e4b','#65874e','#91a76b']
      : orchard ? winter ? ['#8c9e83','#9cac8f','#c3c8a7'] : autumn ? ['#81894d','#9ba456','#bcb277'] : ['#78944f','#92aa60','#b0c37a']
        : mountain ? winter ? ['#83988c','#a1ad9a','#c5cbbb'] : ['#68866b','#8c9b77','#b0b99a']
          : valley ? winter ? ['#8fa286','#acb596','#c8cbb1'] : ['#7e9c59','#9ab46c','#beca89']
            : winter ? ['#81957c','#9cab8d','#c0c6a4'] : ['#5f7f50','#819351','#a6ae70'];
    const clip = 'gd-island-common-' + chunk.id.replace(/[^a-z0-9-]/gi, '-'), f = A.f1;
    // The exact union of legal common cells clips every low leaf and stone.
    // Ten-cell chunks keep each retained native drawing small and cullable.
    const mask = chunk.cells.map(([x,y]) => `M${f(x*W.cellW)} ${f(W.sky+y*W.cellH)}h${W.cellW}v${W.cellH}h${-W.cellW}Z`).join('');
    const mass = _GLD_ART.loops(chunk.cells, 'common-' + chunk.id, 5, 0).map(_GLD_ART.dOf).join('');
    let shade = '', leaves = '', tips = '', stems = '', stones = '', stoneLight = '';
    for (const [x, y] of chunk.cells) {
      const r = A.rng(A.hash('common-foliage|' + chunk.region.id + '|' + x + ':' + y)), px = (x+.5)*W.cellW, py = W.sky+(y+.53)*W.cellH;
      // Broad irregular patches leave breathing room. Repeating the same
      // cluster in every legal cell makes the clear ground look cultivated.
      const patch = Math.sin(x * .53 + y * .31) + Math.cos(x * .29 - y * .61);
      if (patch < .35 || r() > .58) continue;
      if (valley) {
        for (let i=0;i<4;i++) { const xx=px-14+r()*28, yy=py+4+r()*5, h=6+r()*6, lean=r()*4-2; stems += `M${f(xx)} ${f(yy)}q${f(lean-2)} ${f(-h*.5)} ${f(lean)} ${f(-h)}M${f(xx+2)} ${f(yy)}q1 ${f(-h*.4)} 4 ${f(-h*.7)}`; }
        if (!winter && (A.hash(x+':'+y) % 5 === 0)) tips += A.circ(px-4+r()*8,py-2,1.5);
      } else {
        const n = forest ? 2 : 1;
        for (let i=0;i<n;i++) {
          const xx=px+(r()-.5)*W.cellW*.84, yy=py+(r()-.5)*W.cellH*.7, rx=(forest?13:orchard?11:9)+r()*5, ry=4+r()*3;
          shade += A.blob(r,xx,yy,rx,ry,8,.12);
          leaves += A.blob(r,xx-rx*.18,yy-1.8,rx*.71,ry*.64,8,.12);
          tips += A.ell(xx-rx*.3,yy-ry*.38,rx*.3,ry*.22);
        }
      }
      if (mountain || !forest && !orchard && !valley && A.hash(x+','+y)%4===0) {
        const xx=px+(r()-.5)*18, yy=py+2, rx=3+r()*4;
        stones += A.blob(r,xx,yy,rx,rx*.48,6,.14);stoneLight += A.ell(xx-rx*.2,yy-rx*.13,rx*.44,rx*.15);
      }
      if (forest && !winter && A.hash(x+'|'+y)%4===0) {
        for(let i=0;i<3;i++){const xx=px+(r()-.5)*30,yy=py+(r()-.5)*13;tips+=A.leaf(xx,yy,r()*6.2,3.3,1.2);}
      }
    }
    const html = `<defs><clipPath id="${clip}"><path d="${mask}"/></clipPath></defs><g clip-path="url(#${clip})">`
      + A.P(colors[0], mass, forest ? .06 : .045)
      + A.P(colors[0], shade, .42) + A.P(colors[1], leaves, .48) + A.P(colors[2], tips, .38)
      + A.S(colors[0], .9, stems, .77) + A.P(winter ? '#aeb8a6' : '#9b9f88', stones, .82) + A.P(winter ? '#d0d5c7' : '#c2c4a9', stoneLight, .77) + '</g>';
    const xs=chunk.cells.map(p=>p[0]),ys=chunk.cells.map(p=>p[1]);
    out.push({ id: chunk.id, region: chunk.region.id, zone: chunk.region.zone, cells: chunk.cells.length, html, bounds:{x:Math.min(...xs)*W.cellW,y:W.sky+Math.min(...ys)*W.cellH,width:(Math.max(...xs)-Math.min(...xs)+1)*W.cellW,height:(Math.max(...ys)-Math.min(...ys)+1)*W.cellH} });
  }
  cache.understoryKey = key; cache.understory = out;
  return out;
}
function _gldIslandLandformRows(sc) {
  _gldIslandRegionGeometry();
  const key = sc.season;
  if (_GLD_ISLAND_REGIONS.artKey === key) return _GLD_ISLAND_REGIONS.art;
  const A = GART, W = GARDEN_WORLD, out = [], winter = sc.season === 'winter';
  for (const form of gardenIslandData().landforms || []) {
    if (!form.polygon || form.polygon.length < 3) continue;
    const points = form.polygon.map(p => ({ x: p[0] * W.cellW, y: W.sky + p[1] * W.cellH })), xs = points.map(p => p.x), ys = points.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2;
    const kind = String(form.kind || form.id), f = A.f1, path = _gldIslandRegionPath(points);
    let art = '', tall = 100;
    if (/mount|peak|cliff/.test(kind)) {
      tall = Math.max(230, Math.min(470, w * .95));
      const top = y0 - tall * .72, shoulder = top + tall * .37, toe = y1 - h * .12;
      art = A.P('#3d6252', path, .24)
        + A.P(winter ? '#849d96' : '#788c7e', `M${f(x0)} ${f(y0 + h * .5)}L${f(cx - w * .34)} ${f(shoulder)}L${f(cx - w * .06)} ${f(top)}L${f(cx + w * .19)} ${f(shoulder - 20)}L${f(x1)} ${f(toe)}L${f(cx + w * .17)} ${f(y1)}L${f(x0 + w * .12)} ${f(y1 - h * .2)}Z`)
        + A.P(winter ? '#6a8580' : '#5f776c', `M${f(cx - w * .06)} ${f(top)}L${f(cx + w * .07)} ${f(top + tall * .32)}L${f(cx - w * .07)} ${f(top + tall * .64)}L${f(cx + w * .17)} ${f(y1)}L${f(x1)} ${f(toe)}L${f(cx + w * .19)} ${f(shoulder - 20)}Z`)
        + A.P(winter ? '#e5ebe0' : '#c3cbb6', `M${f(cx - w * .06)} ${f(top)}L${f(cx - w * .24)} ${f(top + tall * .24)}L${f(cx - w * .10)} ${f(top + tall * .21)}L${f(cx - w * .035)} ${f(top + tall * .28)}L${f(cx + w * .025)} ${f(top + tall * .20)}L${f(cx + w * .12)} ${f(top + tall * .23)}Z`)
        + A.S('#b3bba0', 1.6, `M${f(cx - w * .29)} ${f(shoulder + 15)}L${f(cx - w * .36)} ${f(y0 + h * .58)}M${f(cx + w * .27)} ${f(shoulder + 45)}L${f(cx + w * .4)} ${f(toe - 20)}`, .5)
        + A.P(winter ? '#8fa99a' : '#5e805e', `M${f(x0 + w * .07)} ${f(y1 - h * .29)}Q${f(cx)} ${f(y1 - h * .6)} ${f(x1 - w * .06)} ${f(y1 - h * .18)}L${f(cx + w * .17)} ${f(y1)}L${f(x0 + w * .12)} ${f(y1 - h * .2)}Z`);
    } else {
      const wall = /wall/.test(kind), stone = winter ? '#adb8a1' : '#a6ad8a', shade = '#6e826c', light = '#d6d5b2'; tall = wall ? 92 : 143;
      art = A.P('#526e55', path, .28) + A.P(shade, path);
      const count = wall ? Math.max(3, Math.round(w / 50)) : 4;
      for (let i = 0; i < count; i++) {
        const xx = x0 + (i + .5) * w / count, foot = y1 - (i % 2) * h * .2, rise = tall * (wall ? .65 + (i % 3) * .13 : i === 0 || i === count - 1 ? 1 : .38);
        art += A.P(shade, A.rrect(xx - w / count * .44, foot - rise, w / count * .88, rise, 3)) + A.P(stone, A.rrect(xx - w / count * .42, foot - rise + 2, w / count * .74, rise - 4, 2))
          + A.S(light, 1.5, `M${f(xx - w / count * .36)} ${f(foot - rise + 5)}h${f(w / count * .63)}`, .85)
          + A.S(shade, 1, `M${f(xx - w / count * .4)} ${f(foot - rise * .35)}h${f(w / count * .74)}M${f(xx - w / count * .4)} ${f(foot - rise * .7)}h${f(w / count * .74)}`, .7);
      }
      if (!wall) art += A.S(shade, 15, `M${f(x0 + w * .125)} ${f(y1 - tall + 5)}Q${f(cx)} ${f(y1 - tall - 55)} ${f(x1 - w * .125)} ${f(y1 - tall + 5)}`, .9) + A.S(stone, 10, `M${f(x0 + w * .125)} ${f(y1 - tall + 3)}Q${f(cx)} ${f(y1 - tall - 53)} ${f(x1 - w * .125)} ${f(y1 - tall + 3)}`);
      art += A.P(winter ? '#8ca18a' : '#62835b', A.ell(x0 + w * .2, y1 - h * .1, w * .15, 7) + A.ell(x1 - w * .17, y1 - h * .22, w * .12, 6), .9);
    }
    out.push({ id: form.id, kind: 'landform', html: `<g class="gd-island-landform" pointer-events="none">${art}</g>`, x: x0 / W.cellW, y: (y0 - W.sky) / W.cellH, w: w / W.cellW, h: h / W.cellH, foot: { x: cx, y: y1 }, bounds: { x: x0 - 8, y: y0 - tall - 40, width: w + 16, height: h + tall + 54 } });
  }
  _GLD_ISLAND_REGIONS.artKey = key; return _GLD_ISLAND_REGIONS.art = out;
}
function _gldIslandRegionMist(sc, o) {
  const rows = _gldIslandRegionGeometry(), open = new Set(sc.areas || []), A = GART, uid = String(o.uid || 'gd') + '-region-mist', dusk = sc.tod === 'night' || sc.tod === 'dusk';
  let out = '';
  for (const row of rows) {
    if (!row.zone || open.has('zn-' + row.zone)) continue;
    const d = _gldIslandRegionPath(row.points), id = uid + '-' + row.zone + '-' + row.id.replace(/[^a-z0-9-]/gi, ''), b = row.bounds, r = A.rng(A.hash(row.id)); let wisps = '';
    for (let i = 0; i < 14; i++) wisps += A.ell(b.x + r() * b.width, b.y + r() * b.height, 100 + r() * 140, 25 + r() * 33);
    out += `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})" pointer-events="none"><path d="${d}" fill="${dusk ? '#243c3a' : '#38544a'}" fill-opacity=".48"/><path d="${d}" fill="none" stroke="${dusk ? '#78988c' : '#a6b9a0'}" stroke-width="32" stroke-opacity=".23" stroke-linejoin="round"/><g class="${o.still || o.photo ? '' : 'gd-waves'}">${A.P(dusk ? '#849d96' : '#c0cdb4', wisps, .12)}</g></g>`;
  }
  return out;
}

/* Cross-span endpoints are the same neck used by the physical region mask.
 * A slight oblique view gives an east/west gate readable upright posts. */
function _gldIslandGateFrame(g) {
  if (!g || !g.crossSpan || g.crossSpan.length !== 2) return null;
  const W = GARDEN_WORLD, a = g.crossSpan[0], b = g.crossSpan[1], dx = (b[0] - a[0]) * W.cellW, dy = (b[1] - a[1]) * W.cellH, span = Math.hypot(dx, dy) / 2;
  return { x: (a[0] + b[0]) * W.cellW / 2, y: W.sky + (a[1] + b[1]) * W.cellH / 2, span, ux: Math.abs(dx) < 1 ? .16 : dx / (span * 2), uy: dy / (span * 2), rise: 120 };
}
function _gldIslandGateBody(frame, sc) {
  const A = GART, f = A.f1, St = GART_PAL.stone, winter = sc.season === 'winter', green = winter ? '#8fa393' : sc.season === 'autumn' ? '#a49661' : '#6f915e';
  const x = frame.span * frame.ux, y = frame.span * frame.uy, top = frame.rise;
  let s = '';
  for (const side of [-1, 1]) {
    const px = x * side, py = y * side;
    s += A.P('#314f3d', A.ell(px + 4, py + 3, 20, 6), .18)
      + A.P('#657b6a', A.rrect(px - 13, py - top, 26, top + 3, 3))
      + A.P(St[1], A.rrect(px - 10, py - top + 2, 19, top - 2, 2))
      + A.P(St[3], A.rect(px - 8, py - top + 6, 4, top - 9), .8)
      + A.S('#75876d', 1.2, `M${f(px - 9)} ${f(py - 32)}h18M${f(px - 9)} ${f(py - 65)}h18M${f(px - 9)} ${f(py - 96)}h18`)
      + A.P('#75866e', A.rrect(px - 17, py - top - 5, 34, 10, 2))
      + A.P(St[3], A.rrect(px - 16, py - top - 6, 32, 5, 2));
  }
  const arch = `M${f(-x)} ${f(-y - top + 1)}Q0 ${f(-top - 58)} ${f(x)} ${f(y - top + 1)}`;
  s += A.S('#617767', 17, arch) + A.S(St[1], 12, arch) + A.S(St[3], 2, `M${f(-x)} ${f(-y - top - 2)}Q0 ${f(-top - 61)} ${f(x)} ${f(y - top - 2)}`, .9)
    + A.P(St[3], A.rrect(-9, -top - 32, 18, 20, 3))
    + A.P(green, A.leaf(-3, -top - 19, -.65, 10, 3.5) + A.leaf(4, -top - 19, -2.5, 9, 3));
  for (const side of [-1, 1]) s += A.S(green, 2.4, `M${f(side * x - 6)} ${f(side * y - 15)}q-8 -16 1 -31q6 -13 -1 -24`, .9) + A.P(green, A.leaf(side * x - 7, side * y - 47, -.6, 10, 3) + A.leaf(side * x - 6, side * y - 24, 2.5, 9, 3), .95);
  return s;
}
function _gldIslandGateLeaf(span, sc) {
  const A = GART, f = A.f1, winter = sc.season === 'winter', dark = '#65533c', wood = winter ? '#a29578' : '#aa8b58', light = '#d2bc87';
  let s = A.P(dark, A.rrect(0, -79, span - 3, 72, 2));
  const count = Math.max(4, Math.round(span / 18)), plank = (span - 5) / count;
  for (let i = 0; i < count; i++) s += A.P(wood, A.rrect(1 + i * plank, -77, plank - 1.2, 68, 1)) + A.S(light, .9, `M${f(3 + i * plank)} -73v60`, .6);
  return s + A.S(dark, 4, `M2 -66H${f(span - 5)}M2 -22H${f(span - 5)}M4 -63L${f(span - 7)} -25`) + A.S(light, 1.2, `M3 -68H${f(span - 6)}`, .9)
    + A.P(dark, A.rrect(span - 11, -49, 7, 17, 1.5)) + A.P(light, A.rrect(span - 9, -46, 3.2, 11, 1));
}
function _gldIslandGrandGateArt(g, sc, open) {
  const frame = _gldIslandGateFrame(g); if (!frame) return '';
  const f = GART.f1, opened = open ? .14 : 1, leaf = _gldIslandGateLeaf(frame.span, sc); let s = _gldIslandGateBody(frame, sc);
  for (const side of [-1, 1]) s += `<g transform="matrix(${f(-side * frame.ux * opened)} ${f(-side * frame.uy * opened)} 0 1 ${f(side * frame.span * frame.ux)} ${f(side * frame.span * frame.uy)})">${leaf}</g>`;
  if (!open) s += GART.P('#dbc897', GART.rrect(-4, -47, 8, 12, 1.5)) + GART.S('#dbc897', 2, 'M-3 -47v-5a3 3 0 0 1 6 0v5');
  return `<g transform="translate(${f(frame.x)} ${f(frame.y)})">${s}</g>`;
}

/* A physical boundary with stone posts and a wooden gate. Exact requirements
 * stay in its inspection panel. The way through is across the screen or up it. */
function _gldIslandGateArt(g, sc, open) {
  if (g.crossSpan) return _gldIslandGrandGateArt(g, sc, open);
  const A = GART, W = GARDEN_WORLD, St = GART_PAL.stone;
  const winter = sc.season === 'winter', wood = winter ? ['#655a4b', '#958671', '#c4b69d'] : ['#705431', '#a18655', '#d1b780'];
  const leaf = winter ? '#829383' : sc.season === 'autumn' ? '#a98048' : '#63875a';
  const post = (x, y, k) => A.P('#25382b', A.ell(x + 3, y + 1, 9 * k, 3 * k), .18)
    + A.P(St[0], A.rrect(x - 6 * k, y - 47 * k, 12 * k, 47 * k, 1.8))
    + A.P(St[1], A.rrect(x - 4.6 * k, y - 46 * k, 8.6 * k, 44 * k, 1.2))
    + A.P(St[2], A.rect(x - 4 * k, y - 44 * k, 2.2 * k, 41 * k), .8)
    + A.S(St[0], .7, `M${_gwN(x - 4 * k)} ${_gwN(y - 16 * k)}h${_gwN(8 * k)}M${_gwN(x - 4 * k)} ${_gwN(y - 32 * k)}h${_gwN(8 * k)}`, .65)
    + A.P(St[3], A.rrect(x - 8 * k, y - 51 * k, 16 * k, 5 * k, 1.5));
  const arch = (a, b) => {
    const ax = a.x, ay = a.y - 49 * a.k, bx = b.x, by = b.y - 49 * b.k, mx = (ax + bx) / 2, my = (ay + by) / 2 - 15;
    const d = `M${_gwN(ax)} ${_gwN(ay)}Q${_gwN(mx)} ${_gwN(my)} ${_gwN(bx)} ${_gwN(by)}`;
    return A.S(St[0], 8, d) + A.S(St[1], 5.8, d) + A.S(St[3], 1, `M${_gwN(ax)} ${_gwN(ay - 2)}Q${_gwN(mx)} ${_gwN(my - 2)} ${_gwN(bx)} ${_gwN(by - 2)}`, .85)
      + A.P(leaf, A.leaf(ax + 2, ay - 1, .3, 8, 3) + A.leaf(bx - 3, by - 2, 2.4, 7, 2.5), .9);
  };
  const latch = (x, y) => A.P(wood[0], A.rrect(x - 5, y - 6, 10, 11, 1.4))
    + A.S(wood[2], 1.5, `M${_gwN(x - 2.5)} ${_gwN(y - 2)}v-2.5a2.5 2.5 0 0 1 5 0v2.5`)
    + A.P(wood[2], A.rrect(x - 3, y - 2.2, 6, 4.7, .8));
  if (g.dx) {
    const x = (g.dx > 0 ? g.x : g.x + 1) * W.cellW, by = W.sky + (g.y + g.h) * W.cellH - 2, skew = 7 + g.h * 5;
    const a = { x: x - skew, y: by - g.h * W.cellH + 8, k: .84 }, b = { x: x + skew, y: by, k: 1 };
    let s = post(a.x, a.y, a.k) + arch(a, b);
    if (!open) {
      let boards = '';
      for (let i = 1, n = g.h * 5; i < n; i++) { const t = i / n, px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t; boards += A.rrect(px - 2.6, py - 28, 5.2, 28, .9); }
      const rail = h => `M${_gwN(a.x)} ${_gwN(a.y - h * a.k)}L${_gwN(b.x)} ${_gwN(b.y - h)}`;
      s += A.P(wood[1], boards) + A.S(wood[0], 3, rail(22) + rail(8)) + A.S(wood[2], .8, rail(23)) + latch((a.x + b.x) / 2, (a.y + b.y) / 2 - 16);
    } else {
      const dx = g.dx > 0 ? -20 : 20;
      s += A.S(wood[0], 2.8, `M${_gwN(b.x)} ${_gwN(b.y - 22)}l${dx} -6M${_gwN(b.x)} ${_gwN(b.y - 8)}l${dx} -6`);
    }
    return s + post(b.x, b.y, b.k);
  }
  const x = (g.x + .5) * W.cellW, y = W.sky + (g.dy > 0 ? g.y : g.y + 1) * W.cellH - 1, hw = 19;
  const a = { x: x - hw, y, k: 1 }, b = { x: x + hw, y, k: 1 };
  let s = arch(a, b);
  if (!open) {
    let boards = '';
    for (let i = -2; i <= 2; i++) boards += A.rrect(x + i * 6 - 2.6, y - 29 + Math.abs(i), 5.2, 28 - Math.abs(i), .9);
    s += A.P(wood[1], boards) + A.S(wood[0], 3, `M${_gwN(x - hw)} ${_gwN(y - 22)}h38M${_gwN(x - hw)} ${_gwN(y - 8)}h38`)
      + A.S(wood[2], .9, `M${_gwN(x - hw)} ${_gwN(y - 23)}h38`) + latch(x, y - 16);
  } else s += A.S(wood[0], 2.8, `M${_gwN(x - hw)} ${_gwN(y - 22)}l-13 6M${_gwN(x - hw)} ${_gwN(y - 8)}l-13 6M${_gwN(x + hw)} ${_gwN(y - 22)}l13 6M${_gwN(x + hw)} ${_gwN(y - 8)}l13 6`);
  return s + post(a.x, a.y, 1) + post(b.x, b.y, 1);
}
function _gldGateArt(g, sc, open) {
  if (typeof gardenIslandActive === 'function' && gardenIslandActive()) return _gldIslandGateArt(g, sc, open);
  const A = GART, W = GARDEN_WORLD, St = GART_PAL.stone, wood = sc.season === 'winter' ? ['#6a5a48', '#8f7c66', '#b09c86'] : ['#6e4c2a', '#9a7244', '#c9a26c'], ivy = sc.season === 'winter' ? '#7c8c74' : sc.season === 'autumn' ? '#a4742e' : '#4f8a44';
  const post = (x, y, k) => `<path fill="#1a2a14" fill-opacity="0.2" d="${A.ell(x + 2, y + 1, 7 * k, 2.2 * k)}"/>` + A.P(St[1], A.rrect(x - 5 * k, y - 27 * k, 10 * k, 27 * k, 1.5)) + A.P(St[2], A.rrect(x - 3.4 * k, y - 25 * k, 3 * k, 23 * k, 1)) + A.P(St[3], A.rrect(x - 6.5 * k, y - 31 * k, 13 * k, 5 * k, 1.8)) + A.P(St[0], A.circ(x, y - 33 * k, 3 * k)) + A.P(ivy, A.leaf(x - 3 * k, y - 12 * k, 2.2, 6 * k, 2) + A.leaf(x + 3 * k, y - 20 * k, 0.6, 6 * k, 2) + A.leaf(x + 2 * k, y - 6 * k, 1.1, 6 * k, 2));
  if (g.dx) {   // the way through is across the screen: the gate runs up the screen, the far post behind
    const d = g.h * W.cellH, x = (g.dx > 0 ? g.x : g.x + 1) * W.cellW, yb = W.sky + (g.y + g.h) * W.cellH - 2, yt = yb - d + 8, skew = 7 + g.h * 5, xt = x - skew, xb = x + skew, S = open ? 26 * (g.dx > 0 ? -1 : 1) : 0;
    let s = post(xt, yt, 0.84);
    if (!open) {
      const n = g.h * 5; let pick = '', top = '';
      for (let i = 1; i < n; i++) { const t = i / n, px0 = xt + (xb - xt) * t, py0 = yt + (yb - yt) * t; pick += A.rrect(px0 - 2.6, py0 - 24, 5.2, 24, 1.2); top += A.rect(px0 - 1.6, py0 - 23, 1.2, 21); }
      const rail = (h, c, w) => `<path d="M${_gwN(xt)} ${_gwN(yt - h * 0.84)}L${_gwN(xb)} ${_gwN(yb - h)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
      s += rail(18, wood[0], 3.4) + rail(7, wood[0], 3.4) + `<path fill="${wood[1]}" stroke="${wood[0]}" stroke-width="0.9" d="${pick}"/>` + A.P(wood[2], top, 0.7);
    } else s += `<path d="M${_gwN(xb)} ${_gwN(yb - 18)}L${_gwN(xb + S)} ${_gwN(yb - 24)}M${_gwN(xb)} ${_gwN(yb - 7)}L${_gwN(xb + S)} ${_gwN(yb - 13)}M${_gwN(xb)} ${_gwN(yb - 7)}L${_gwN(xb + S)} ${_gwN(yb - 24)}" stroke="${wood[0]}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
    s += post(xb, yb, 1);
    return s;
  }
  // the way through is up or down the screen: the gate stands facing you
  const cx = (g.x + 0.5) * W.cellW, by = W.sky + (g.dy > 0 ? g.y : g.y + 1) * W.cellH - 1, hw = 19;
  let s = '';
  if (!open) { s += `<path d="M${_gwN(cx - hw)} ${_gwN(by - 20)}H${_gwN(cx + hw)}M${_gwN(cx - hw)} ${_gwN(by - 12)}H${_gwN(cx + hw)}M${_gwN(cx - hw)} ${_gwN(by - 5)}H${_gwN(cx + hw)}M${_gwN(cx - hw + 1)} ${_gwN(by - 5)}L${_gwN(cx + hw - 1)} ${_gwN(by - 20)}" stroke="${wood[0]}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M${_gwN(cx - hw)} ${_gwN(by - 20.6)}H${_gwN(cx + hw)}M${_gwN(cx - hw)} ${_gwN(by - 12.6)}H${_gwN(cx + hw)}M${_gwN(cx - hw)} ${_gwN(by - 5.6)}H${_gwN(cx + hw)}" stroke="${wood[2]}" stroke-width="1.100" fill="none"/>`; }
  else s += `<path d="M${_gwN(cx - hw)} ${_gwN(by - 18)}L${_gwN(cx - hw - 13)} ${_gwN(by - 13)}M${_gwN(cx - hw)} ${_gwN(by - 7)}L${_gwN(cx - hw - 13)} ${_gwN(by - 3)}M${_gwN(cx + hw)} ${_gwN(by - 18)}L${_gwN(cx + hw + 13)} ${_gwN(by - 13)}M${_gwN(cx + hw)} ${_gwN(by - 7)}L${_gwN(cx + hw + 13)} ${_gwN(by - 3)}" stroke="${wood[0]}" stroke-width="2.600" stroke-linecap="round" fill="none"/>`;
  s += post(cx - hw, by, 1) + post(cx + hw, by, 1);
  return s;
}
/** Low survey pegs mark a ready building spot without another sales placard. */
function _gldSiteArt(f) {
  const A = GART, W = GARDEN_WORLD, cx = (f.x + f.w / 2) * W.cellW, by = W.sky + (f.y + f.h) * W.cellH - 5;
  return A.P('#2c2418', A.ell(cx + 1, by + 1, 11, 2), .12)
    + `<path d="M${_gwN(cx - 8)} ${_gwN(by - 5)}Q${_gwN(cx)} ${_gwN(by - 2)} ${_gwN(cx + 8)} ${_gwN(by - 5)}" fill="none" stroke="#a79973" stroke-width=".8"/>`
    + A.P('#8c7755', A.rrect(cx - 9, by - 10, 2.6, 11, .7) + A.rrect(cx + 7, by - 10, 2.6, 11, .7))
    + A.P('#d1c398', A.rect(cx - 8.5, by - 9, .9, 7) + A.rect(cx + 7.5, by - 9, .9, 7));
}
function gardenLandWorldProps(sc, o) {
  const out = [], open = new Set(sc.areas || []), lv = sc.lv == null ? 1 : sc.lv, island = typeof gardenIslandActive === 'function' && gardenIslandActive(), physical = island ? new Map(gardenPropsNow().map(p => [p.id, p])) : null;
  const push = (cls, z, x, inner, key) => { if (inner) out.push({ cls, z, x, inner, key }); };
  push('gd-prop-lf gd-prop-click', GARDEN_LAND_OFFICE.y + 1, GARDEN_LAND_OFFICE.x, _gldDraw('office', GARDEN_LAND_OFFICE, sc, o), GARDEN_LAND_OFFICE.id);
  if ((!physical || physical.has(GARDEN_LAND_FINDS.id)) && open.has('finds') && !open.has('lf-museum')) push('gd-prop-lf gd-prop-click', GARDEN_LAND_FINDS.y + 1, GARDEN_LAND_FINDS.x, _gldDraw('finds', GARDEN_LAND_FINDS, sc, o), GARDEN_LAND_FINDS.id);
  for (const sourceSight of GARDEN_LAND_SIGHTS) { const d = physical ? physical.get(sourceSight.id) : sourceSight; if (d) push('gd-prop-lf gd-prop-click', d.y + d.h, d.x, _gldDraw(d.art, d, sc, o), d.id); }
  // Landmark arches describe the regions. Smaller functional gates mark only
  // the next reachable closed boundary; saved custom gate artwork is retained.
  for (const g of GARDEN_ZONE_GATES) {
    const isOpen = open.has('zn-' + g.n), custom = typeof gardenBuildLookOf === 'function' && Object.values(gardenBuildLookOf(g.id)).some(Boolean);
    if (!gardenLandGatePresented(g, open, custom)) continue;
    const gateZ = g.crossSpan ? Math.max(...g.crossSpan.map(p => p[1])) + .15 : g.y + g.h;
    push('gd-prop-lf gd-zonegate' + (isOpen ? '' : ' gd-prop-click'), gateZ, g.x, _gldGateArt(g, sc, isOpen), g.id);
  }
  if (island && !o.native && (gardenIslandData().regions || []).length) {
    for (const row of _gldIslandUnderstoryRows(sc)) push('gd-island-understory', -30, 0, row.html, 'understory:' + row.id);
    for (const row of _gldIslandLandformRows(sc)) push('gd-island-landform', (row.foot.y - GARDEN_WORLD.sky) / GARDEN_WORLD.cellH, row.x, row.html, row.id);
    const pal = GART_PAL.leaf[sc.season] || GART_PAL.leaf.summer;
    for (const tree of _gldIslandRegionStands()) push('gd-island-tree', tree.cellY, tree.cellX, _gwTree(tree.x, tree.y, tree.height / 72, pal, sc.season, GART.rng(tree.seed)), tree.id);
    push('gd-island-mist', GARDEN_WORLD.rows + 1, 0, _gldIslandRegionMist(sc, o), 'island-region-mist');
  }
  const occ = new Set();
  for (const p of sc.plants || []) occ.add(p.x + ',' + p.y);
  for (const d of sc.decor || []) { const dd = gardenDecor(d.id); if (dd && dd.layer !== 'ground') occ.add(d.x + ',' + d.y); }
  for (const sourceFeature of GARDEN_LAND_FEATURES) {
    const f = island ? typeof gardenFeatureRow === 'function' && gardenFeatureRow(sourceFeature) : sourceFeature;
    if (!f || f.x == null) continue;
    if (open.has(f.id)) {
      if (f.does === 'maze') {
        for (const r of _gldMazeRects(f)) {
          if (r.act) push('gd-prop-lf gd-prop-click', r.y + 1, r.x, _gldDraw('chest', r, sc, o), r.id);
          else push('gd-prop-lf', r.y + 1, r.x, _gldHedgeRow(r, sc), r.id);
        }
        continue;
      }
      if (!island && f.does === 'lamps') for (const x of GARDEN_LAND_LAMPS) push('gd-prop-lf', 19.3, x, _gldDraw('lamp', { x, y: 19, w: 1, h: 0.4 }, sc, o), 'lf-lamp-' + x);
      push('gd-prop-lf gd-prop-click', f.y + f.h, f.x, _gldDraw(f.art, f, sc, o), f.id);
      continue;
    }
    if (island || !o.interactive || o.photo || o.readOnly || f.prize || (typeof gardenVisitOn === 'function' && gardenVisitOn())) continue;
    if (f.sec && !open.has(f.sec)) continue;
    { const n = gardenZoneOf(f.x, f.y); if (n && !open.has('zn-' + n)) continue; }   // only in a zone that is open
    if (occ.has(f.x + ',' + f.y) || f.lv > lv) continue;   // (a spot shows once you could build on it; the land office lists what comes later)
    push('gd-prop-lf gd-prop-click', f.y + f.h, f.x, _gldSiteArt(f, sc, lv), 'site:' + f.id);
  }
  return out;
}
/** A marker for building, as a prop the click code can use (the id is on the drawing). */
function gardenLandSiteProp(id) {
  { const g = gardenZoneGate(id); if (g) { const a = g.crossSpan && g.crossSpan[0], b = g.crossSpan && g.crossSpan[1]; return { id: g.id, name: gardenZone(g.n).name, x: a ? Math.min(a[0], b[0]) - (g.dx ? .5 : 0) : g.x, y: a ? Math.min(a[1], b[1]) - (g.dy ? .5 : 0) : g.y, w: a ? Math.max(1, Math.abs(b[0] - a[0])) : 1, h: a ? Math.max(1, Math.abs(b[1] - a[1])) : g.h, col: 'none', act: 'lf', lf: g.id, door: g.door }; } }
  const m = /^site:(.+)$/.exec(String(id || '')); if (!m) return null;
  const f = gardenLandFeature(m[1]); if (!f || f.x == null) return null;
  return { id: 'site:' + f.id, name: f.name, x: f.x, y: f.y, w: f.w, h: f.h, col: 'none', act: 'lf', lf: f.id, site: 1, door: f.door };
}
function gardenLandLights(sc) {
  const W = GARDEN_WORLD, open = new Set(sc.areas || []), out = [], island = typeof gardenIslandActive === 'function' && gardenIslandActive(), physical = island ? new Map(gardenPropsNow().map(p => [p.id, p])) : null;
  if (open.has('lf-lamps')) {
    if (island) { const f = physical.has('lf-lamps') && gardenLandFeature('lf-lamps'); if (f) out.push({ x: (f.x + .5) * W.cellW, y: W.sky + (f.y + (f.h || 1)) * W.cellH - 8, r: 62 }); }
    else for (const x of GARDEN_LAND_LAMPS) out.push({ x: (x + 0.65) * W.cellW, y: W.sky + 19 * W.cellH - 8, r: 62 });
  }
  for (const source of GARDEN_LAND_SIGHTS) { const d = physical ? physical.get(source.id) : source; if (d && (d.art === 'lamp' || d.art === 'lighthouse')) out.push({ x: (d.x + 0.65) * W.cellW, y: W.sky + d.y * W.cellH - (d.art === 'lighthouse' ? 60 : 8), r: 62 }); }
  if (open.has('lf-moon') && (!physical || physical.has('lf-moon'))) { const f = gardenLandFeature('lf-moon'); out.push({ x: (f.x + 0.5) * W.cellW, y: W.sky + f.y * W.cellH, r: 56 }); }
  return out;
}
/** Canonical coast in cell coordinates; beach width is measured in world pixels. */
function _gldIslandMini(open, season, level, model) {
  const W = GARDEN_WORLD, data = gardenIslandData(), geo = gardenIslandGeometry(), cw = W.cellW, ch = W.cellH;
  // Match native terrain: plants and ground decor cultivate whole sections;
  // owning an empty soil section leaves its existing lawn visible.
  const cultivated = new Set(), soilKinds = new Set(['bed', 'patch', 'veg', 'rich', 'herb', 'berry']);
  const remember = (item, w, h) => { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const row = gardenLandCell(item.x + dx, item.y + dy); if (row) cultivated.add(row.id); } };
  for (const item of model && model.plants || []) { const def = item.def || gardenPlant(item.id); if (def) remember(item, def.fp || 1, def.fp || 1); }
  for (const item of model && model.decor || []) { const def = item.def || gardenDecor(item.id); if (def && def.layer === 'ground') remember(item, def.w || 1, def.h || 1); }
  const loopPath = (loop, sx, sy) => loop.map((p, i) => (i ? 'L' : 'M') + p[0] * sx + ' ' + p[1] * sy).join('') + 'Z';
  const land = geo.land.map(loop => loopPath(loop, 1, 1)).join(''), shore = geo.land.map(loop => loopPath(loop, cw, ch)).join('');
  const lawn = _gdrTileCol('grass', season), sand = season === 'winter' ? '#dedcc5' : '#e4d6b2', water = season === 'winter' ? '#76a8ad' : '#599f9d';
  const clip = 'gd-mini-island-land';
  let s = '<defs><clipPath id="' + clip + '"><path d="' + land + '" clip-rule="evenodd"/></clipPath></defs><rect width="' + W.cols + '" height="' + W.rows + '" fill="' + water + '"/><path d="' + land + '" fill="' + lawn + '" fill-rule="evenodd"/><g clip-path="url(#' + clip + ')">';
  // Scale the authored pixel-width shore back into the map's cell space.
  s += '<g transform="scale(' + 1 / cw + ' ' + 1 / ch + ')"><path d="' + shore + '" fill="none" stroke="' + sand + '" stroke-width="' + geo.beachWidthPx * 2 + '" stroke-linejoin="round"/></g>';
  const colorAt = (x, y) => {
    const cell = gardenIslandBaseCell(x, y);
    if (!cell.land || cell.beach || cell.freshwater || cell.reservation === 'apron' || cell.reservation === 'facade') return '';
    const row = gardenLandCell(x, y), zone = gardenZoneOf(x, y), plot = row && row.plot;
    const locked = plot ? !open.has(row.id) && !(!row.buy && level >= row.lv) : zone && !open.has('zn-' + zone);
    if (locked) return (data.regions || []).length ? '' : '#526b54';
    if (cell.route || row && (row.lane || row.trail)) return '';
    return plot && (!soilKinds.has(row.kind) || cultivated.has(row.id)) ? _gdrTileCol(row.tile, season) : '';
  };
  // Paint plot tiles below the paths, then shade closed land above them.
  let lockedLand = '';
  for (let y = 0; y < W.rows; y++) {
    let x = 0;
    while (x < W.cols) {
      const color = colorAt(x, y); let end = x + 1;
      while (end < W.cols && colorAt(end, y) === color) end++;
      if (color) {
        const run = '<rect x="' + x + '" y="' + y + '" width="' + (end - x) + '" height="1" fill="' + color + '"/>';
        if (color === '#526b54') lockedLand += run; else s += run;
      }
      x = end;
    }
  }
  for (const route of data.routes) if (route.points && route.points.length > 1) s += '<path d="' + route.points.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('') + '" fill="none" stroke="#cec4a6" stroke-width="' + route.widthCells + '" stroke-linecap="round" stroke-linejoin="round"/>';
  s += lockedLand;
  for (const region of data.regions || []) if (region.zone && !open.has('zn-' + region.zone)) for (const polygon of region.polygons) s += '<path d="' + loopPath(polygon, 1, 1) + '" fill="#3c594d" fill-opacity=".67"/>';
  for (const form of data.landforms || []) s += '<path d="' + loopPath(form.polygon, 1, 1) + '" fill="#889583" stroke="#d3d2ad" stroke-width=".15"/>';
  // The existing inland contours include current bridges, ice and pool cuts.
  for (const shape of gardenOtherWaterShapes(model)) {
    const pathOf = loop => loop.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join('') + 'Z';
    s += '<path d="' + pathOf(shape.points) + (shape.holes || []).map(pathOf).join('') + '" fill="' + water + '" fill-rule="evenodd"/>';
  }
  s += '</g><path d="' + land + '" fill="none" stroke="#c6ddd0" stroke-width=".18"/>';
  // Main services and only the displayed built decks need map symbols.
  for (const prop of gardenPierDecks(model && model.works || [], model || null)) s += '<rect x="' + prop.x + '" y="' + prop.y + '" width="' + prop.w + '" height="' + prop.h + '" fill="#bb9664" stroke="#66533b" stroke-width=".18"><title>' + esc(prop.name) + '</title></rect>';
  const places = new Set(['garden-shop', 'land-office', 'tackle-shop', 'market-stall', 'lake-hall']);
  for (const prop of gardenPropsNow()) {
    if (places.has(prop.id)) s += '<g transform="translate(' + (prop.x + prop.w / 2) + ' ' + (prop.y + prop.h / 2) + ')"><title>' + esc(prop.name) + '</title><path d="M-1.2 0L0 -1.15 1.2 0V1.1H-1.2Z" fill="#ae7850" stroke="#fff0cf" stroke-width=".22" stroke-linejoin="round"/></g>';
  }
  return s;
}
/** The land on the little map: open land in its colour, paths pale, closed land and thicket dark. Rows of cells joined up. */
function gardenLandMini(open, season, level, model) {
  if (typeof gardenIslandActive === 'function' && gardenIslandActive()) return _gldIslandMini(open, season, level || 1, model);
  let s = '';
  const colOf = (c, x, y) => (c.lane ? (gardenZoneOf(x, y) && !open.has('zn-' + gardenZoneOf(x, y)) ? 'rgba(40,40,30,.55)' : '#e3d3a2') : c.trail && gardenZoneOf(x, y) && !open.has('zn-' + gardenZoneOf(x, y)) ? 'rgba(40,40,30,.55)' : c.solid ? 'rgba(30,50,26,.75)' : c.id !== 'lawn' && !open.has(c.id) ? 'rgba(40,40,30,.55)' : c.trail ? '#efe2b4' : _gdrTileCol(c.tile, season));
  for (let y = 0; y < GARDEN_WORLD.rows; y++) {
    let x = 0;
    while (x < GARDEN_WORLD.cols) {
      const c = gardenLandCell(x, y); let j = x + 1;
      while (j < GARDEN_WORLD.cols && gardenLandCell(j, y) === c && gardenZoneOf(j, y) === gardenZoneOf(x, y)) j++;
      if (c) s += `<rect x="${x}" y="${y}" width="${j - x}" height="1" fill="${colOf(c, x, y)}"/>`;
      x = j;
    }
  }
  return s;
}

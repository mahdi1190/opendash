/* ============================================================
   GARDEN ART, the world (2.23, agent 'garden-art'). The owner, 30 Oct 2026: "better SVGs and animations ... generally make
   it look better visually". The ground, the water and the sky as one painted picture instead of flat rectangles. PURE:
   strings only, nothing drawn at load. Reads GARDEN_WORLD, GARDEN_AREAS and GARDEN_PROPS every time, so a bigger world or
   a moved area needs no change here. The look: docs/dev/GARDEN.md section 14.

     gartGroundLayer(sc, o)            what goes in the renderer's <g class="gd-ground">:
                                       <g class="gart-bake" data-bake="ground">everything still</g><g class="gart-live">what moves</g>
     gartSkyLayers(sc, o, W, base)     {defs, sky, clouds, far} for the renderer's _gdrSky
     gartNight(sc, o, lights)          the dark of the hour with real pools of light cut out of it

   The renderer calls these three behind typeof guards and keeps its own drawing as the fallback. A `.gart-bake` group may be
   as rich as it likes: 94-garden-art-h-life.js turns it into one bitmap after the first paint (the group is still valid
   SVG, so the photo mode, a thumbnail and a browser that cannot bake all draw the same thing from the same string).
   ============================================================ */
const _GARTW = (function () {
  const A = GART, f1 = A.f1, rr = A.rr;
  const SEASON_WATER = {
    spring: ['#8fd0d8', '#5fb0cc', '#3f8ebc', '#2c6f9e'], summer: ['#86d2d6', '#52aece', '#3186b8', '#22639a'],
    autumn: ['#90bfc4', '#619db4', '#40809e', '#2f6484'], winter: ['#bedae4', '#94bdd0', '#6c9cb8', '#50829e'],
  };
  const TOD_WATER = { dawn: ['#e8c0c0', '#b89ab8', '#7c80ae', '#566a9c'], dusk: ['#e4a890', '#a880a4', '#5f6498', '#3e4a80'], night: ['#2c4a78', '#1f3a68', '#142b54', '#0c1e40'] };
  const waterOf = (sc) => (sc.tod !== 'day' && TOD_WATER[sc.tod]) || SEASON_WATER[sc.season] || SEASON_WATER.summer;
  const LAWN = { spring: ['#7cbd58', '#93cc62', '#a9d870', '#65a84c'], summer: ['#6fae4e', '#86bf58', '#a0cf66', '#5a9a44'], autumn: ['#94a650', '#a9b65a', '#c4c26a', '#7e9446'], winter: ['#a3b490', '#b6c4a4', '#cdd6bc', '#8fa27e'] };
  const tileC = (id, season, fb) => { try { const t = gardenTile(id); return season === 'winter' ? t.winter : season === 'autumn' ? t.autumn : t.c; } catch (e) { return fb; } };

  /** Smooth a list of points: quadratic curves through the midpoints. */
  function smooth(pts, closed) {
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
  /** A soft-cornered, slightly hand-wobbled closed outline round a rectangle. amp: how far it wanders; step: how often. */
  function wob(r, x, y, w, h, q, amp, step) {
    q = Math.min(q, w / 2, h / 2); step = step || 22;
    const pts = [];
    const side = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / step)); for (let i = 0; i < n; i++) { const t = i / n, nx = (y1 - y0) / (L || 1), ny = -(x1 - x0) / (L || 1), k = (r() - 0.5) * 2 * amp; pts.push([x0 + (x1 - x0) * t + nx * k, y0 + (y1 - y0) * t + ny * k]); } };
    side(x + q, y, x + w - q, y); side(x + w - q, y, x + w, y + q); side(x + w, y + q, x + w, y + h - q); side(x + w, y + h - q, x + w - q, y + h); side(x + w - q, y + h, x + q, y + h); side(x + q, y + h, x, y + h - q); side(x, y + h - q, x, y + q); side(x, y + q, x + q, y);
    return smooth(pts, true);
  }
  /** A wandering horizontal line from x0 to x1 about y: the points, for a shoreline or a furrow. */
  function wander(r, x0, x1, y, amp, step) { const pts = []; for (let x = x0; x <= x1 + step; x += step) pts.push([x, y + (r() - 0.5) * 2 * amp]); return pts; }
  const tuft = (x, y, h, lean) => `M${f1(x - 1.6)} ${f1(y)}q${f1(lean * 0.4 - 0.4)} ${f1(-h * 0.5)} ${f1(lean - 1.4)} ${f1(-h * 0.85)}M${f1(x)} ${f1(y)}q${f1(lean * 0.4)} ${f1(-h * 0.6)} ${f1(lean)} ${f1(-h * 1.1)}M${f1(x + 1.6)} ${f1(y)}q${f1(lean * 0.4 + 0.4)} ${f1(-h * 0.5)} ${f1(lean + 1.6)} ${f1(-h * 0.75)}`;
  const daisy = (x, y, R) => { let d = ''; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; d += A.ell(x + Math.cos(a) * R, y + Math.sin(a) * R * 0.7, R * 0.72, R * 0.5); } return d; };

  /* ---------- the lawn ---------- */
  function lawn(sc, o, r, x0, y0, w, h) {
    const pal = LAWN[sc.season] || LAWN.summer, lod = o.size === 's' ? 0.45 : 1;
    let s = A.P(pal[0], A.rect(x0, y0, w, h));
    const n = Math.round(w * h / 5200 * lod);
    let dark = '', soft = '', light = '', warm = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * w, y = y0 + r() * h, rx = rr(r, 26, 78), ry = rx * rr(r, 0.3, 0.5), k = i % 4;
      const d = A.blob(r, x, y, rx, ry, 8, 0.55);
      if (k === 0) dark += d; else if (k === 1) light += d; else if (k === 2) soft += d; else warm += A.blob(r, x, y, rx * 0.6, ry * 0.6, 7, 0.6);
    }
    s += A.P(pal[3], dark, 0.34) + A.P(pal[1], soft, 0.6) + A.P(pal[2], light, 0.3) + A.P(sc.season === 'autumn' ? '#c4a24e' : '#b8d868', warm, 0.16);
    // grass, drawn in little clumps so it reads as a lawn and not as wallpaper
    let t1 = '', t2 = '', t3 = '';
    const nc = Math.round(w * h / 1100 * lod);
    for (let i = 0; i < nc; i++) {
      const cx = x0 + r() * w, cy = y0 + 4 + r() * (h - 4), m = 1 + Math.floor(r() * 3);
      for (let k = 0; k < m; k++) { const d = tuft(cx + rr(r, -9, 9), cy + rr(r, -4, 4), rr(r, 2.6, 5.2), rr(r, -1.6, 1.6)); if (i % 3 === 0) t1 += d; else if (i % 3 === 1) t2 += d; else t3 += d; }
    }
    s += A.S(pal[3], 0.8, t1, 0.75) + A.S(pal[2], 0.8, t2, 0.7) + A.S(A.shift(pal[3], 8, 1, -0.05), 0.7, t3, 0.45);
    // what the season drops on it
    if (sc.season === 'spring' || sc.season === 'summer') {
      let pet = '', eye = '', yel = '', cl = '';
      const nf = Math.round(w * h / 9000 * lod);
      for (let i = 0; i < nf; i++) {
        const cx = x0 + r() * w, cy = y0 + 6 + r() * (h - 8), m = 2 + Math.floor(r() * 4), kind = r();
        for (let k = 0; k < m; k++) {
          const x = cx + rr(r, -16, 16), y = cy + rr(r, -6, 6);
          if (kind < 0.5) { pet += daisy(x, y, 1.1); eye += A.circ(x, y, 0.55); } else if (kind < 0.8) yel += A.ell(x, y, 1.15, 0.9); else cl += A.ell(x - 1, y, 1.3, 0.9) + A.ell(x + 1, y, 1.3, 0.9) + A.ell(x, y - 1, 1.3, 0.9);
        }
      }
      s += A.P(pal[3], cl, 0.7) + A.P('#fbf8ee', pet, 0.95) + A.P('#f2c21e', eye + yel);
    } else if (sc.season === 'autumn') {
      const cols = ['#d9671c', '#e8a23a', '#c0392b', '#b8862a'], acc = ['', '', '', ''];
      const nf = Math.round(w * h / 2600 * lod);
      for (let i = 0; i < nf; i++) acc[i % 4] += A.leaf(x0 + r() * w, y0 + r() * h, r() * 6.2, rr(r, 3.4, 5.6), 1.4);
      acc.forEach((d, i) => { s += A.P(cols[i], d, 0.85); });
    } else {
      let fr = '';
      for (let i = 0; i < Math.round(w * h / 3000 * lod); i++) fr += A.blob(r, x0 + r() * w, y0 + r() * h, rr(r, 8, 26), rr(r, 3, 7), 7, 0.5);
      s += A.P('#f4f7f8', fr, sc.rain && sc.rain.snow ? 0.8 : 0.32);
    }
    return s;
  }

  /* ---------- timber and brick edges ---------- */
  function timber(r, x, y, w, h, t) {
    // four sleepers with lit tops, end grain at the corners, a shadow thrown on the ground to the right and below
    t = t || 7;
    const W0 = ['#5f4028', '#8a6238', '#ad8350', '#c9a26c'];
    let s = A.P('#2c2418', A.rrect(x - t + 2, y - t + 3, w + 2 * t + 1, h + 2 * t + 1, 3), 0.14);
    const hbar = (yy) => A.P(W0[1], A.rrect(x - t, yy, w + 2 * t, t, 1.6)) + A.P(W0[2], A.rect(x - t + 1, yy + 0.8, w + 2 * t - 2, 2)) + A.P(W0[0], A.rect(x - t + 1, yy + t - 1.8, w + 2 * t - 2, 1.4), 0.75);
    const vbar = (xx) => A.P(W0[1], A.rrect(xx, y, t, h, 1.6)) + A.P(W0[2], A.rect(xx + 0.8, y + 1, 2, h - 2)) + A.P(W0[0], A.rect(xx + t - 1.8, y + 1, 1.4, h - 2), 0.75);
    s += vbar(x - t) + vbar(x + w) + hbar(y - t) + hbar(y + h);
    let g = '';
    for (let i = 0; i < w / 26; i++) { const gx = x + r() * w; g += `M${f1(gx)} ${f1(y - t + 3.6)}h${f1(rr(r, 6, 16))}M${f1(gx * 0.7 + x * 0.3)} ${f1(y + h + 3.6)}h${f1(rr(r, 6, 16))}`; }
    for (let i = 0; i < h / 26; i++) { const gy = y + r() * h; g += `M${f1(x - t + 3.6)} ${f1(gy)}v${f1(rr(r, 5, 12))}M${f1(x + w + 3.6)} ${f1(gy * 0.8 + y * 0.2)}v${f1(rr(r, 5, 12))}`; }
    s += A.S(W0[0], 0.7, g, 0.6);
    for (const [cx, cy] of [[x - t / 2, y - t / 2], [x + w + t / 2, y - t / 2], [x - t / 2, y + h + t / 2], [x + w + t / 2, y + h + t / 2]]) s += A.P(W0[3], A.circ(cx, cy, t * 0.42)) + A.S(W0[0], 0.6, A.circ(cx, cy, t * 0.42) + A.circ(cx, cy, t * 0.2), 0.8);
    return s;
  }
  function bricks(r, x, y, w, h) {
    // a low wall of rounded bricks round the front garden
    const c = ['#b5573a', '#c56a48', '#a34a30', '#cf7a56'], acc = ['', '', '', ''], B = 13, T = 6.5;
    const row = (x0, x1, yy) => { for (let bx = x0; bx < x1; bx += B + 0.8) acc[Math.floor(r() * 4)] += A.rrect(bx, yy + rr(r, -0.4, 0.4), Math.min(B, x1 - bx), T, 2); };
    const col = (xx, y0, y1) => { for (let by = y0; by < y1; by += B + 0.8) acc[Math.floor(r() * 4)] += A.rrect(xx + rr(r, -0.4, 0.4), by, T, Math.min(B, y1 - by), 2); };
    row(x - T, x + w + T, y - T); row(x - T, x + w + T, y + h); col(x - T, y, y + h); col(x + w, y, y + h);
    let s = A.P('#2c2418', A.rrect(x - T + 2, y - T + 3, w + 2 * T, h + 2 * T, 3), 0.14) + A.S('#6e3a26', 1.6, A.rect(x - T / 2, y - T / 2, w + T, h + T), 0.25);
    acc.forEach((d, i) => { s += `<path fill="${c[i]}" stroke="#7c3d27" stroke-width="0.7" d="${d}"/>`; });
    s += A.S('#f0a880', 0.9, `M${x - T + 1} ${f1(y - T + 1.3)}H${x + w + T - 1}M${x - T + 1} ${f1(y + h + 1.3)}H${x + w + T - 1}`, 0.5);
    return s;
  }

  /* ---------- soil ---------- */
  function soil(r, x, y, w, h, base, deep, lod) {
    let s = A.P(base, A.rrect(x, y, w, h, 4));
    let dk = '', lt = '';
    for (let i = 0; i < w * h / 1500; i++) { const d = A.blob(r, x + 10 + r() * (w - 20), y + 8 + r() * (h - 16), rr(r, 14, 40), rr(r, 6, 14), 7, 0.6); if (i % 2) dk += d; else lt += d; }
    s += A.P(deep, dk, 0.42) + A.P(A.lt(base, 0.14), lt, 0.3);
    let c1 = '', c2 = '', st = '', stl = '';
    for (let i = 0; i < w * h / 42 * lod; i++) { const cx = x + 2 + r() * (w - 4), cy = y + 2 + r() * (h - 4), rad = rr(r, 0.5, 1.4), d = A.ell(cx, cy, rad, rad * 0.66); if (i % 2) c1 += d; else c2 += d; }
    for (let i = 0; i < w * h / 1400; i++) { const cx = x + 4 + r() * (w - 8), cy = y + 4 + r() * (h - 8), rx = rr(r, 1.4, 2.6); st += A.ell(cx, cy, rx, rx * 0.66); stl += A.ell(cx - rx * 0.3, cy - rx * 0.24, rx * 0.46, rx * 0.26); }
    s += A.P(deep, c1, 0.75) + A.P(A.lt(base, 0.28), c2, 0.65) + A.P('#a39684', st) + A.P('#d8ccb8', stl, 0.8);
    // the wall's shade falls on the soil along the top and the left (the light comes from the upper left)
    s += A.P('#1c120a', A.rect(x, y, w, 6), 0.16) + A.P('#1c120a', A.rect(x, y, w, 2.6), 0.14) + A.P('#1c120a', A.rect(x, y, 3.4, h), 0.1);
    return s;
  }
  function furrows(r, x, y, w, h, ch, base, deep) {
    let dark = '', lit = '', cr = '';
    for (let yy = y + ch * 0.5; yy < y + h - 2; yy += ch) {
      const line = wander(r, x + 4, x + w - 18, yy + ch * 0.28, 1.1, 18);
      dark += smooth(line, false);
      lit += smooth(line.map(p => [p[0], p[1] - 5.4 + (r() - 0.5)]), false);
      for (let i = 0; i < w / 7; i++) cr += A.ell(x + 4 + r() * (w - 8), yy - 2 + r() * 3.4, rr(r, 0.6, 1.3), 0.6);
    }
    return A.S(deep, 5, dark, 0.62) + A.S(A.lt(base, 0.3), 2.2, lit, 0.5) + A.P(A.lt(base, 0.36), cr, 0.65);
  }

  const POND_PADS = [[0.2, 0.7, 7], [0.32, 0.8, 5], [0.78, 0.62, 6.4]];
  /* ---------- open areas ---------- */
  function wildPatch(r, x, y, w, h, base) {
    // a soft-edged different meadow on the lawn: no box round it
    return A.P(A.shift(base, 4, 1, -0.05), wob(r, x, y, w, h, 18, 7, 30), 0.5) + A.P(base, wob(r, x + 3, y + 3, w - 6, h - 6, 16, 6, 30), 0.92);
  }
  function orchard(r, sc, x, y, w, h, base, lod) {
    let s = wildPatch(r, x, y, w, h, base), sh = '', t1 = '', t2 = '', cl = '';
    for (let i = 0; i < w * h / 3400; i++) sh += A.blob(r, x + 20 + r() * (w - 40), y + 16 + r() * (h - 26), rr(r, 22, 40), rr(r, 9, 15), 9, 0.5);
    s += A.P(A.shift(base, 8, 1, -0.14), sh, 0.34);
    for (let i = 0; i < w * h / 240 * lod; i++) { const d = tuft(x + 6 + r() * (w - 12), y + 6 + r() * (h - 8), rr(r, 4, 7), rr(r, -2, 2)); if (i % 2) t1 += d; else t2 += d; }
    for (let i = 0; i < w * h / 2200; i++) { const cx = x + 8 + r() * (w - 16), cy = y + 8 + r() * (h - 14); for (let k = 0; k < 3; k++) { const q = k / 3 * 6.28; cl += A.ell(cx + Math.cos(q) * 1.6, cy + Math.sin(q) * 1.2, 1.5, 1.2); } }
    s += A.P(A.shift(base, 8, 1, -0.12), cl, 0.7) + A.S(A.shift(base, 8, 1, -0.16), 0.9, t1, 0.7) + A.S(A.lt(base, 0.28), 0.8, t2, 0.65);
    if (sc.season === 'autumn' || sc.season === 'summer') { let ap = '', gl = ''; for (let i = 0; i < w * h / 3600; i++) { const cx = x + 10 + r() * (w - 20), cy = y + 10 + r() * (h - 16); ap += A.circ(cx, cy, 2.4); gl += A.circ(cx - 0.7, cy - 0.8, 0.8); } s += A.P('#c0392b', ap) + A.P('#f08a6a', gl, 0.9); }
    return s;
  }
  function meadow(r, sc, x, y, w, h, base, lod) {
    let s = wildPatch(r, x, y, w, h, base), b1 = '', b2 = '', b3 = '', hd = '';
    for (let i = 0; i < w * h / 150 * lod; i++) {
      const bx = x + 6 + r() * (w - 12), by = y + 8 + r() * (h - 10), lean = rr(r, -3, 3), hh = rr(r, 7, 13), d = `M${f1(bx)} ${f1(by)}q${f1(lean * 0.3)} ${f1(-hh * 0.6)} ${f1(lean)} ${f1(-hh)}`;
      if (i % 3 === 0) b1 += d; else if (i % 3 === 1) b2 += d; else b3 += d;
      if (i % 7 === 0) hd += `M${f1(bx + lean)} ${f1(by - hh)}l${f1(lean * 0.1)} -2.6`;
    }
    s += A.S(A.shift(base, 10, 1, -0.18), 1, b1, 0.8) + A.S(A.shift(base, 2, 1, -0.08), 0.9, b2, 0.85) + A.S(A.lt(base, 0.3), 0.8, b3, 0.8) + A.S(sc.season === 'winter' ? '#c0b090' : '#d8c47a', 1.5, hd);
    if (sc.season === 'spring' || sc.season === 'summer') {
      // flowers come in drifts, not evenly: a few colours, each in its own patches
      const cols = ['#f7d417', '#fbfbf6', '#e05a8a', '#8aa0e8', '#e8452a'], acc = cols.map(() => '');
      for (let i = 0; i < w * h / 1500; i++) { const cx = x + 12 + r() * (w - 24), cy = y + 10 + r() * (h - 16), c = Math.floor(r() * cols.length); for (let k = 0; k < 7; k++) acc[c] += A.circ(cx + rr(r, -15, 15), cy + rr(r, -8, 8) - 6, rr(r, 1.1, 1.9)); }
      acc.forEach((d, i) => { s += A.P(cols[i], d, 0.95); });
    }
    return s;
  }
  function pond(r, sc, x, y, w, h, wa, W, frozen) {
    const cw = W.cellW, ch = W.cellH, wx = wa.x * cw, wy = W.sky + wa.y * ch, ww = wa.w * cw, wh = wa.h * ch, P = waterOf(sc);
    let s = wildPatch(r, x, y, w, h, tileC('pond-edge', sc.season, '#9aa88a'));
    let lush = '';
    for (let i = 0; i < 26; i++) { const q = i / 26 * 6.283; lush += tuft(wx + ww / 2 + Math.cos(q) * (ww / 2 + 22 + r() * 6), wy + wh / 2 + Math.sin(q) * (wh / 2 + 15 + r() * 4), rr(r, 5, 9), rr(r, -2, 2)); }
    s += A.S(sc.season === 'winter' ? '#a8a080' : '#4f7f3f', 1, lush, 0.85);
    const sq = v => Math.pow(Math.abs(v), 0.72) * Math.sign(v);
    const pool = (grow, n) => { const pts = []; for (let i = 0; i < n; i++) { const q = i / n * 6.283, k = 1 + (r() - 0.5) * 0.05; pts.push([wx + ww / 2 + sq(Math.cos(q)) * (ww / 2 + grow) * k, wy + wh / 2 + sq(Math.sin(q)) * (wh / 2 + grow * 0.8) * k]); } return smooth(pts, true); };
    s += A.P('#4a3a26', pool(9, 20), 0.75);
    s += A.P(frozen ? '#a8c8d8' : P[3], pool(3, 20));
    if (!frozen) {
      s += A.P(P[2], pool(-3, 18));
      s += A.P(P[1], `M${f1(wx + ww * 0.08)} ${f1(wy + wh * 0.42)}Q${f1(wx + ww * 0.3)} ${f1(wy + wh * 0.06)} ${f1(wx + ww * 0.72)} ${f1(wy + wh * 0.14)}Q${f1(wx + ww * 0.92)} ${f1(wy + wh * 0.32)} ${f1(wx + ww * 0.6)} ${f1(wy + wh * 0.46)}Q${f1(wx + ww * 0.3)} ${f1(wy + wh * 0.62)} ${f1(wx + ww * 0.08)} ${f1(wy + wh * 0.42)}z`, 0.8);
      s += A.P('#ffffff', A.ell(wx + ww * 0.36, wy + wh * 0.22, ww * 0.16, wh * 0.06) + A.ell(wx + ww * 0.62, wy + wh * 0.36, ww * 0.1, wh * 0.04), 0.3);
    } else s += A.S('#ffffff', 1, `M${f1(wx + ww * 0.2)} ${f1(wy + wh * 0.4)}l18 8 8 16M${f1(wx + ww * 0.6)} ${f1(wy + wh * 0.3)}l-10 14 16 10`, 0.7);
    // the stones round the rim, each with its own light
    const nst = 26, sd = [];
    for (let i = 0; i < nst; i++) { const q = i / nst * 6.283; sd.push([wx + ww / 2 + sq(Math.cos(q)) * (ww / 2 + 8), wy + wh / 2 + sq(Math.sin(q)) * (wh / 2 + 6.5), rr(r, 4.4, 8)]); }
    ['#a39d90', '#b8b2a4', '#8f8a7e'].forEach((c, t) => { let d = ''; sd.forEach((q, i) => { if (i % 3 === t) d += A.blob(r, q[0], q[1], q[2], q[2] * 0.68, 7, 0.2); }); s += `<path fill="${c}" stroke="#5e5a50" stroke-width="0.8" d="${d}"/>`; });
    let lit = ''; sd.forEach(q => { lit += A.ell(q[0] - q[2] * 0.25, q[1] - q[2] * 0.22, q[2] * 0.4, q[2] * 0.2); });
    s += A.P('#ece6d8', lit, sc.tod === 'night' ? 0.3 : 0.7);
    if (!frozen) {
      let pad = '', pl = '';
      for (const [fx, fy, R] of POND_PADS) { const px = wx + ww * fx, py = wy + wh * fy; pad += `M${f1(px)} ${f1(py)}L${f1(px + R)} ${f1(py - R * 0.1)}A${R} ${f1(R * 0.46)} 0 1 0 ${f1(px + R * 0.86)} ${f1(py + R * 0.24)}z`; pl += A.ell(px - R * 0.3, py - R * 0.14, R * 0.34, R * 0.12); }
      s += `<path fill="#4f8f42" stroke="#2f5f2c" stroke-width="0.7" d="${pad}"/>` + A.P('#8cc468', pl, 0.8);
    }
    return s;
  }
  function pondLive(sc, o, wa, W) {
    if (o.still || (sc.season === 'winter' && sc.rain && sc.rain.snow)) return '';
    const cw = W.cellW, ch = W.cellH, wx = wa.x * cw, wy = W.sky + wa.y * ch, ww = wa.w * cw, wh = wa.h * ch, q = A.rng(A.hash('pond-live'));
    let s = '';
    for (let i = 0; i < 4; i++) s += `<ellipse class="gart-ring" cx="${f1(wx + ww * (0.2 + q() * 0.6))}" cy="${f1(wy + wh * (0.25 + q() * 0.5))}" rx="${f1(rr(q, 7, 12))}" ry="2.4" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1" style="animation-delay:-${f1(q() * 6)}s"/>`;
    return s;
  }
  function greenhouse(r, sc, a, x, y, w, h, W) {
    const cw = W.cellW, c = tileC('glasshouse', sc.season, '#c9b8a0');
    let s = A.P(A.shift(c, 0, 1, -0.2), A.rrect(x + 2, y + 2, w - 4, h - 4, 4));
    const tones = [c, A.shift(c, 6, 1, -0.04), A.shift(c, -6, 0.9, 0.03)], acc = ['', '', ''];
    let lit = '';
    for (let gy = 0; gy < a.h * 2; gy++) for (let gx = 0; gx < a.w * 2; gx++) { const px = x + 4 + gx * (w - 8) / (a.w * 2), py = y + 4 + gy * (h - 8) / (a.h * 2), tw = (w - 8) / (a.w * 2) - 1.2, th = (h - 8) / (a.h * 2) - 1.2; acc[(gx * 3 + gy * 5 + Math.floor(r() * 2)) % 3] += A.rrect(px + 0.6, py + 0.6, tw, th, 1.4); lit += A.rect(px + 2, py + 1.6, tw * 0.5, 1); }
    acc.forEach((d, i) => { s += A.P(tones[i], d); });
    s += A.P('#fff8e8', lit, 0.3);
    // the glass house's back wall and pitched roof, behind whatever grows in it
    const ry = y - 34, top = y - 58, mid = x + w / 2, frame = sc.tod === 'night' ? '#b8c8d0' : '#f4f8f6', fd = '#9fb4b8';
    s += `<path fill="#d8ecf2" fill-opacity="0.34" d="M${f1(x)} ${f1(y + 2)}V${f1(ry)}L${f1(mid)} ${f1(top)}L${f1(x + w)} ${f1(ry)}V${f1(y + 2)}z"/>`;
    s += `<path fill="#ffffff" fill-opacity="0.2" d="M${f1(x + w * 0.14)} ${f1(y)}L${f1(x + w * 0.32)} ${f1(ry - 8)}H${f1(x + w * 0.42)}L${f1(x + w * 0.24)} ${f1(y)}zM${f1(x + w * 0.56)} ${f1(y)}L${f1(x + w * 0.7)} ${f1(ry - 4)}H${f1(x + w * 0.75)}L${f1(x + w * 0.62)} ${f1(y)}z"/>`;
    let bars = `M${f1(x)} ${f1(y + 2)}V${f1(ry)}L${f1(mid)} ${f1(top)}L${f1(x + w)} ${f1(ry)}V${f1(y + 2)}M${f1(x)} ${f1(ry)}H${f1(x + w)}M${f1(x)} ${f1(y - 14)}H${f1(x + w)}`;
    for (let g = 1; g < a.w; g++) { const lx = x + g * cw, t = ry + (top - ry) * (1 - Math.abs(g / a.w - 0.5) * 2); bars += `M${f1(lx)} ${f1(t)}V${f1(y + 2)}`; }
    s += A.S(fd, 4.2, bars, 0.75) + A.S(frame, 2.6, bars);
    s += A.P(frame, A.circ(mid, top - 3, 3)) + A.S(fd, 0.8, A.circ(mid, top - 3, 3));
    return s;
  }
  /* Land that is not yours yet looks like somewhere you would like to go: a meadow nobody has mown, a low fence, a closed gate and a worn path up to it.
     It is all baked ground, so it costs one image however rich it is. What it will become shows faintly: old furrows, a reedy pool, a few young trees. */
  const WILD = { spring: ['#a2c866', '#88b254', '#bcd97c'], summer: ['#9cc264', '#82ac52', '#b6d278'], autumn: ['#b9b264', '#a09a50', '#cec47a'], winter: ['#bac6a8', '#a4b292', '#d2dac4'] };
  /** Where a piece of land's gate is: on its side facing the shore's lane, in the middle. */
  function lockGate(a, x, y, w, h) { const south = a.y >= 11; return { x: x + w / 2, y: south ? y + 7 : y + h - 7, south }; }
  /** Is another closed piece of land drawn before this one on this side? Then its fence is there already. */
  function fenceShared(a, open, cx, cy) { for (const b of GARDEN_AREAS) { if (b === a) return false; if (!open.has(b.id) && cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h) return true; } return false; }
  function locked(r, sc, a, x, y, w, h, W, open) {
    const season = sc.season, P = WILD[season] || WILD.summer, base = P[0], deep = P[1], light = P[2], cw = W.cellW, ch = W.cellH, gate = lockGate(a, x, y, w, h);
    let s = A.P(deep, wob(r, x + 1, y + 1, w - 2, h - 2, 16, 4, 28), 0.55) + A.P(base, wob(r, x + 4, y + 4, w - 8, h - 8, 16, 4, 28));
    let dk = '', lt = '';
    for (let i = 0; i < w * h / 2600; i++) { const d = A.blob(r, x + 14 + r() * (w - 28), y + 10 + r() * (h - 18), rr(r, 18, 48), rr(r, 7, 16), 8, 0.55); if (i % 2) dk += d; else lt += d; }
    s += A.P(deep, dk, 0.42) + A.P(light, lt, 0.55);
    // what it will become, faintly
    if (a.tile === 'tilled') { let f = ''; for (let yy = y + ch * 0.7; yy < y + h - 10; yy += ch) f += smooth(wander(r, x + 14, x + w - 14, yy, 1.4, 26), false); s += A.S(A.shift(deep, 6, 1, -0.14), 3.4, f, 0.4); }
    if (a.water) {
      const c = waterOf(sc), mx = (a.water.x + a.water.w / 2) * cw, my = W.sky + (a.water.y + a.water.h / 2) * ch - ch, rx = Math.min(a.water.w * cw * 0.3, 70), ry = Math.min(a.water.h * ch * 0.3, 26);
      let reeds = ''; for (let i = 0; i < 16; i++) { const q = i / 16 * 6.283; reeds += tuft(mx + Math.cos(q) * (rx + 5), my + Math.sin(q) * (ry + 3) + 3, rr(r, 6, 11), rr(r, -2, 2)); }
      s += A.P(deep, A.blob(r, mx, my, rx + 7, ry + 5, 12, 0.14), 0.8) + A.P(c[1], A.blob(r, mx, my, rx, ry, 12, 0.12)) + A.P(c[0], A.ell(mx - rx * 0.26, my - ry * 0.3, rx * 0.42, ry * 0.3), 0.8) + A.S(A.shift(deep, 10, 1, -0.2), 1.2, reeds, 0.9);
    }
    // the worn path: out from the lane, through the gate, wandering in
    const sand = tileC('sand', season, '#e3d3a2'), dir = gate.south ? 1 : -1, cellX = Math.floor(gate.x / cw);
    let out = 0;
    if (!gate.south) { let row = a.y + a.h; while (row < 11 && gardenAreaAt(cellX, row) === 'lawn') { out++; row++; } if (row < 11) out = 0; }
    const pts = [];
    if (out) { const y1 = W.sky + 11 * ch + 6; pts.push([gate.x + rr(r, -4, 4), y1]); pts.push([gate.x + rr(r, -8, 8), (y1 + gate.y) / 2]); }
    pts.push([gate.x, gate.y + (gate.south ? -4 : 4)]);
    const reach = Math.min(h * 0.62, 150), sway = Math.min(w * 0.2, 56) * (r() < 0.5 ? -1 : 1);
    pts.push([gate.x + sway * 0.45, gate.y + dir * reach * 0.34]); pts.push([gate.x + sway, gate.y + dir * reach * 0.7]); pts.push([gate.x + sway * 0.7, gate.y + dir * reach]);
    const trail = smooth(pts, false), mud = A.mix(sand, deep, 0.42);
    s += `<path d="${trail}" fill="none" stroke="${mud}" stroke-width="15" stroke-linecap="round" stroke-opacity="0.55"/><path d="${trail}" fill="none" stroke="${A.mix(sand, base, 0.12)}" stroke-width="10.5" stroke-linecap="round"/>`;
    // long grass in clumps, thick along the fence and thinner in the middle
    let t1 = '', t2 = '', t3 = '';
    const clump = (cx, cy, n) => { for (let k = 0; k < n; k++) { const d = tuft(cx + rr(r, -8, 8), cy + rr(r, -3, 3), rr(r, 5, 10), rr(r, -2.6, 2.6)), v = r(); if (v < 0.4) t1 += d; else if (v < 0.75) t2 += d; else t3 += d; } };
    for (let i = 0; i < w * h / 620; i++) clump(x + 10 + r() * (w - 20), y + 12 + r() * (h - 16), 2 + Math.floor(r() * 3));
    for (let k = x + 10; k < x + w - 10; k += 22) { clump(k, y + 15 + r() * 6, 2); clump(k, y + h - 8 - r() * 6, 2); }
    s += A.S(A.shift(deep, 4, 1, -0.05), 0.9, t1, 0.5) + A.S(A.lt(base, 0.24), 0.9, t2, 0.65) + A.S(A.shift(base, -6, 1, -0.03), 0.9, t3, 0.5);
    // in flower: drifts of a colour or two (autumn: seed heads and leaves; winter: frost)
    if (season === 'spring' || season === 'summer') {
      const cols = season === 'spring' ? ['#fbfbf2', '#f6d23a', '#d88ad8', '#8ab0ec'] : ['#fbfbf2', '#f6d23a', '#ea5f4a', '#c78ae0'], acc = cols.map(() => ''), eye = [];
      for (let i = 0; i < w * h / 2200; i++) { const cx = x + 16 + r() * (w - 32), cy = y + 14 + r() * (h - 22), c = Math.floor(r() * cols.length), n = 3 + Math.floor(r() * 4); for (let k = 0; k < n; k++) { const fx = cx + rr(r, -15, 15), fy = cy + rr(r, -7, 7), R = rr(r, 1.5, 2.2); acc[c] += A.circ(fx, fy, R); eye.push(A.circ(fx, fy, R * 0.34)); } }
      acc.forEach((d, i) => { s += A.P(cols[i], d, 0.96); }); s += A.P('#7a5a1e', eye.join(''), 0.7);
    } else if (season === 'autumn') {
      const cols = ['#d9671c', '#e8a23a', '#c0392b'], acc = ['', '', '']; let hd = '';
      for (let i = 0; i < w * h / 900; i++) acc[i % 3] += A.leaf(x + 8 + r() * (w - 16), y + 8 + r() * (h - 14), r() * 6.2, rr(r, 3, 5), 1.3);
      for (let i = 0; i < w * h / 700; i++) { const hx = x + 10 + r() * (w - 20), hy = y + 12 + r() * (h - 18); hd += `M${f1(hx)} ${f1(hy)}q${f1(rr(r, -1, 1))} -6 ${f1(rr(r, -2, 2))} -11`; }
      acc.forEach((d, i) => { s += A.P(cols[i], d, 0.85); }); s += A.S('#e0cf8c', 1.3, hd, 0.9);
    } else { let fr = ''; for (let i = 0; i < w * h / 1800; i++) fr += A.blob(r, x + 12 + r() * (w - 24), y + 10 + r() * (h - 16), rr(r, 10, 28), rr(r, 3, 8), 7, 0.5); s += A.P('#f4f7f8', fr, sc.rain && sc.rain.snow ? 0.85 : 0.5); }
    // a few round bushes, a stone or two: enough that it is a place, never in a grid
    const bushes = Math.max(2, Math.round(w * h / 22000)), leaf = season === 'winter' ? ['#7c8c74', '#9aa890'] : season === 'autumn' ? ['#a4742e', '#c8963e'] : ['#4f8a44', '#74ac58'];
    for (let i = 0; i < bushes; i++) {
      const bx = x + 26 + r() * (w - 52), by = y + 26 + r() * (h - 40), R = rr(r, 11, 19);
      if (Math.abs(bx - gate.x) < 48 && Math.abs(by - gate.y) < 70) continue;
      s += A.P('#1c2a14', A.ell(bx + 3, by + R * 0.42, R * 1.05, R * 0.34), 0.2) + `<path fill="${leaf[0]}" stroke="${A.dk(leaf[0], 0.3)}" stroke-width="0.8" d="${A.blob(r, bx, by - R * 0.42, R, R * 0.82, 9, 0.16)}"/>` + A.P(leaf[1], A.blob(r, bx - R * 0.26, by - R * 0.66, R * 0.56, R * 0.42, 8, 0.2), 0.95);
      if (season === 'summer' || season === 'spring') { let bl = ''; for (let k = 0; k < 4; k++) bl += A.circ(bx + rr(r, -R * 0.7, R * 0.7), by - R * 0.4 + rr(r, -R * 0.5, R * 0.3), 1.3); s += A.P(season === 'spring' ? '#fbe6ee' : '#f6d23a', bl, 0.95); }
    }
    for (let i = 0; i < Math.max(1, bushes - 1); i++) { const sx = x + 20 + r() * (w - 40), sy = y + 22 + r() * (h - 32), R = rr(r, 4, 7); s += `<path fill="#a8a294" stroke="#6e6a5e" stroke-width="0.8" d="${A.blob(r, sx, sy, R, R * 0.66, 7, 0.2)}"/>` + A.P('#d8d2c4', A.ell(sx - R * 0.3, sy - R * 0.24, R * 0.42, R * 0.2), 0.9); }
    // a low post-and-rail fence, with a closed gate where the path comes through
    const wood = season === 'winter' ? ['#6a5a48', '#8f7c66', '#b09c86'] : ['#6e4c2a', '#9a7244', '#c9a26c'];
    const inset = 6, x0 = x + inset, x1 = x + w - inset, y0 = y + inset + 8, y1 = y + h - inset, gapW = 30;
    const pH = 12;   // how tall a post stands
    let posts = '', caps = '', rails = '', railsL = '', shade = '';
    const post = (px, py) => { posts += A.rrect(px - 1.9, py - pH, 3.8, pH + 1, 1); caps += A.ell(px, py - pH, 2, 1); shade += A.ell(px + 2.6, py + 0.8, 3.4, 1.1); };
    const hRun = (from, to, py, skipGate) => {
      const n = Math.max(1, Math.round((to - from) / 42)), step = (to - from) / n;
      for (let i = 0; i <= n; i++) { const px = from + i * step; if (skipGate && Math.abs(px - gate.x) < gapW / 2 + 3) continue; post(px, py); }
      const seg = (a0, a1) => { if (a1 - a0 < 1) return; rails += `M${f1(a0)} ${f1(py - 8.4)}H${f1(a1)}M${f1(a0)} ${f1(py - 3.8)}H${f1(a1)}`; railsL += `M${f1(a0)} ${f1(py - 9)}H${f1(a1)}M${f1(a0)} ${f1(py - 4.4)}H${f1(a1)}`; };
      if (skipGate) { seg(from, gate.x - gapW / 2); seg(gate.x + gapW / 2, to); } else seg(from, to);
    };
    const vRun = (px, from, to) => {
      const n = Math.max(1, Math.round((to - from) / 26)), step = (to - from) / n;
      for (let i = 0; i <= n; i++) post(px, from + i * step);
      rails += `M${f1(px)} ${f1(from - 8.4)}V${f1(to - 8.4)}M${f1(px)} ${f1(from - 3.8)}V${f1(to - 3.8)}`; railsL += `M${f1(px - 0.6)} ${f1(from - 8.4)}V${f1(to - 8.4)}`;
    };
    const midC = a.x + a.w / 2, midR = a.y + a.h / 2;
    if (!fenceShared(a, open, midC, a.y - 0.5)) hRun(x0, x1, y0, gate.south);
    if (!fenceShared(a, open, a.x - 0.5, midR)) vRun(x0, y0, y1);
    if (!fenceShared(a, open, a.x + a.w + 0.5, midR)) vRun(x1, y0, y1);
    const onBottom = !gate.south;
    if (!fenceShared(a, open, midC, a.y + a.h + 0.5) || onBottom) hRun(x0, x1, y1, onBottom);
    s += A.P('#1c2a14', shade, 0.2) + A.S(wood[0], 2.7, rails) + A.S(wood[1], 1.5, railsL) + `<path fill="${wood[1]}" stroke="${wood[0]}" stroke-width="0.8" d="${posts}"/>` + A.P(wood[2], caps);
    // the gate: two taller posts and a little barred gate, shut
    const gy = gate.south ? y0 : y1, gl = gate.x - gapW / 2, gr = gate.x + gapW / 2, G = season === 'winter' ? '#c8bca6' : '#d8bc88';
    let gatePosts = `M${f1(gl - 2.4)} ${f1(gy + 1)}V${f1(gy - 17)}h4.8V${f1(gy + 1)}zM${f1(gr - 2.4)} ${f1(gy + 1)}V${f1(gy - 17)}h4.8V${f1(gy + 1)}z`;
    s += A.P('#1c2a14', A.ell(gate.x + 3, gy + 1.2, gapW / 2 + 5, 1.6), 0.2);
    s += `<path fill="${wood[1]}" stroke="${wood[0]}" stroke-width="0.9" d="${gatePosts}"/>` + A.P(wood[2], A.ell(gl, gy - 17, 2.8, 1.3) + A.ell(gr, gy - 17, 2.8, 1.3));
    s += A.S(wood[0], 2.7, `M${f1(gl + 2)} ${f1(gy - 11)}H${f1(gr - 2)}M${f1(gl + 2)} ${f1(gy - 3.4)}H${f1(gr - 2)}M${f1(gl + 3)} ${f1(gy - 3.4)}L${f1(gr - 3)} ${f1(gy - 11)}`) + A.S(G, 1.6, `M${f1(gl + 2)} ${f1(gy - 11.5)}H${f1(gr - 2)}M${f1(gl + 2)} ${f1(gy - 3.9)}H${f1(gr - 2)}M${f1(gl + 3)} ${f1(gy - 3.9)}L${f1(gr - 3)} ${f1(gy - 11.5)}`);
    return s;
  }
  /** The sign by the gate: what stands between you and this land, in as few marks as possible. Not baked: it may be redrawn when the level changes. */
  function lockSign(a, x, y, w, h, sc) {
    const gate = lockGate(a, x, y, w, h), forSale = a.buy && (sc.lv == null || sc.lv >= a.lv), txt = forSale ? String(a.buy) : `Level ${a.lv}`, bw = Math.round(txt.length * 4.7 + 18), bh = 13.5;
    const gy = gate.south ? y + 6 + 8 : y + h - 6, sx = gate.x + 16 + bw / 2 + 3, sy = gy + 2, top = sy - 23;
    const mark = forSale ? `<circle cx="${f1(sx - bw / 2 + 7.8)}" cy="${f1(top + bh / 2)}" r="4.2" fill="#f2b01e" stroke="#a87412" stroke-width="1"/><circle cx="${f1(sx - bw / 2 + 6.6)}" cy="${f1(top + bh / 2 - 1.2)}" r="1.2" fill="#ffe9a8"/>`
      : `<rect x="${f1(sx - bw / 2 + 4.4)}" y="${f1(top + 5.6)}" width="6.8" height="5.6" rx="1.2" fill="#8a7a5a"/><path d="M${f1(sx - bw / 2 + 5.7)} ${f1(top + 5.6)}v-1.600a2.100 2.100 0 0 1 4.200 0v1.600" stroke="#8a7a5a" stroke-width="1.3" fill="none"/>`;
    return `<g class="gd-locksign${forSale ? ' is-sale' : ''}"${a.buy ? ` data-land="${a.id}"` : ''}><path fill="#2c2418" fill-opacity="0.18" d="${A.ell(sx + 3, sy + 0.5, 9, 2)}"/><path fill="#7a5636" stroke="#4c3420" stroke-width="0.8" d="M${f1(sx - 1.7)} ${f1(sy)}V${f1(top + bh - 1)}h3.400V${f1(sy)}z"/><rect x="${f1(sx - bw / 2)}" y="${f1(top)}" width="${bw}" height="${bh}" rx="3" fill="${forSale ? '#f8ecc8' : '#e8ddc2'}" stroke="#8a6238" stroke-width="1.3"/><rect x="${f1(sx - bw / 2 + 1.6)}" y="${f1(top + 1.4)}" width="${bw - 3.2}" height="2" rx="1" fill="#fff9e8" fill-opacity="0.8"/>`
      + `<text x="${f1(sx + 6)}" y="${f1(top + 10)}" font-size="8.4" font-family="Inter, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#5a4630">${txt}</text>${mark}</g>`;
  }
  function woods(r, sc, x, y, w, h) {
    const base = tileC('forest', sc.season, '#6f9a4a'), deep = A.shift(base, 8, 1, -0.16);
    let s = A.P(deep, wob(r, x, y, w, h, 14, 6, 28), 0.7) + A.P(base, wob(r, x + 5, y + 4, w - 10, h - 8, 14, 6, 28), 0.95);
    let sh = '', li = '';
    for (let i = 0; i < w * h / 2600; i++) sh += A.blob(r, x + 20 + r() * (w - 40), y + 14 + r() * (h - 24), rr(r, 22, 54), rr(r, 10, 22), 9, 0.55);
    for (let i = 0; i < w * h / 7000; i++) li += A.blob(r, x + 20 + r() * (w - 40), y + 14 + r() * (h - 24), rr(r, 12, 30), rr(r, 5, 12), 8, 0.5);
    s += A.P(A.shift(base, 12, 1, -0.2), sh, 0.42) + A.P('#fff8c8', li, 0.14);
    const lit = sc.season === 'autumn' ? ['#c8702a', '#e0a040', '#a8501c'] : sc.season === 'winter' ? ['#d8d4c4', '#b4b0a0', '#c8c4b4'] : ['#8aaa4a', '#6a9038', '#a8c460'];
    const acc = lit.map(() => '');
    for (let i = 0; i < w * h / 190; i++) acc[i % 3] += A.leaf(x + 6 + r() * (w - 12), y + 6 + r() * (h - 12), r() * 6.2, rr(r, 2.4, 4.6), 1.1);
    acc.forEach((d, i) => { s += A.P(lit[i], d, 0.8); });
    // ferns, each a fan of arching fronds with a lit side
    let f1d = '', f2d = '';
    for (let i = 0; i < w * h / 1500; i++) { const fx = x + 12 + r() * (w - 24), fy = y + 12 + r() * (h - 16); for (let k = -2; k <= 2; k++) { const d = A.leaf(fx, fy, k * 0.62 + rr(r, -0.1, 0.1), rr(r, 9, 14), 1.8, 0.4); if (k < 0) f2d += d; else f1d += d; } }
    const fc = sc.season === 'winter' ? ['#7a8a6a', '#94a484'] : sc.season === 'autumn' ? ['#8a7a34', '#b09a44'] : ['#2f6a34', '#4f8f44'];
    s += `<path fill="${fc[0]}" stroke="#20402a" stroke-width="0.5" d="${f1d}"/><path fill="${fc[1]}" stroke="#20402a" stroke-width="0.5" d="${f2d}"/>`;
    // mushrooms in small families
    for (let i = 0; i < 6; i++) { const mx = x + 18 + r() * (w - 36), my = y + 18 + r() * (h - 30), c = ['#d8452a', '#f0e4c8', '#c88a3a'][i % 3]; for (let k = 0; k < 3; k++) { const dx = k * 5 - 5 + r(), sz = rr(r, 2.6, 4.2); s += `<path fill="#f4ecd8" stroke="#8a7a5a" stroke-width="0.5" d="M${f1(mx + dx - sz * 0.3)} ${f1(my)}V${f1(my - sz * 0.9)}h${f1(sz * 0.6)}V${f1(my)}z"/><path fill="${c}" stroke="${A.dk(c, 0.5)}" stroke-width="0.6" d="M${f1(mx + dx - sz)} ${f1(my - sz * 0.8)}Q${f1(mx + dx)} ${f1(my - sz * 2.4)} ${f1(mx + dx + sz)} ${f1(my - sz * 0.8)}z"/>`; } }
    // a fallen log with moss along its top
    const lx = x + w * 0.42, ly = y + h * 0.62;
    s += A.P('#1a2414', A.ell(lx + 22, ly + 10.5, 26, 3.4), 0.26) + `<path fill="#6a4a2e" stroke="#3e2a18" stroke-width="1" d="${A.rrect(lx, ly, 42, 10, 5)}"/>` + `<path fill="#c8a06a" stroke="#6a4a2e" stroke-width="0.8" d="${A.ell(lx + 2.6, ly + 5, 3.8, 5)}"/>` + A.S('#6a4a2e', 0.6, A.ell(lx + 2.6, ly + 5, 1.7, 2.4)) + A.S('#3e2a18', 0.7, `M${f1(lx + 9)} ${f1(ly + 3.4)}h26M${f1(lx + 11)} ${f1(ly + 6.6)}h22`, 0.6) + `<path fill="#6aa040" d="M${f1(lx + 12)} ${f1(ly + 1)}q3 -4 7 -1q3 -3 7 -1q4 -2 7 1q-3 2 -21 1z"/>`;
    return s;
  }

  /* ---------- the lake ---------- */
  /** Where the lake's lily pads float: [x, y, radius] in stage units. Near the pier too, so you can see a frog on one from the shore. */
  function lakePads(a, W) { const w = (a.x + a.w) * W.cellW, wy = W.sky + a.water.y * W.cellH; return [32, 66, 96, 452, 500, 736, 782, w - 340, w - 54, w - 92, w - 130].map(px => [px, wy + 16 + (Math.abs(px) % 13), 6 + (Math.abs(px) % 4)]); }
  /** Every pad painted on open water, as rows a creature can land on: {x, y (cells), r}. Not while it is frozen. */
  function pads(sc, W) {
    const out = [], open = new Set(sc.areas || []), add = (x, y, r) => out.push({ x: x / W.cellW, y: (y - W.sky) / W.cellH, r });
    if (sc.season === 'winter' && sc.rain && sc.rain.snow) return out;
    for (const a of GARDEN_AREAS) {
      if (!a.water || !open.has(a.id)) continue;
      if ((a.look || a.id) === 'lake') { for (const [x, y, R] of lakePads(a, W)) add(x, y, R); continue; }
      const wx = a.water.x * W.cellW, wy = W.sky + a.water.y * W.cellH, ww = a.water.w * W.cellW, wh = a.water.h * W.cellH;
      for (const [fx, fy, R] of POND_PADS) add(wx + ww * fx, wy + wh * fy, R);
    }
    return out;
  }
  function lake(sc, o, a, W, r) {
    const cw = W.cellW, ch = W.cellH, base = W.sky, w = (a.x + a.w) * cw, y0 = base + a.y * ch, wa = a.water, wy = base + wa.y * ch, wh = wa.h * ch, season = sc.season;
    const sand = tileC('sand', season, '#e3d3a2'), frozen = season === 'winter' && sc.rain && sc.rain.snow, P = frozen ? ['#d6e8f0', '#c0d8e6', '#a8c8dc', '#92b8d0'] : waterOf(sc), night = sc.tod === 'night';
    let s = '', live = '';
    // the sand: a soft-edged beach, dunes, wet near the water, pebbles and shells
    const top = wander(r, -10, w + 10, y0 + 2, 4, 40), low = wy + 8;
    s += A.P(sand, smooth(top.concat([[w + 60, y0], [w + 60, low], [-60, low], [-60, y0]]), true));
    let dune = '', dlit = '';
    for (let i = 0; i < w / 90; i++) { const dx = r() * w, dy = y0 + 6 + r() * (wy - y0 - 12); dune += A.blob(r, dx, dy, rr(r, 26, 60), rr(r, 3, 7), 8, 0.5); dlit += A.blob(r, r() * w, y0 + 4 + r() * (wy - y0 - 14), rr(r, 18, 40), rr(r, 2, 4), 7, 0.5); }
    s += A.P(A.shift(sand, 6, 1, -0.07), dune, 0.5) + A.P(A.lt(sand, 0.42), dlit, 0.5);
    let peb = '', pebl = '', shell = '', sp = '';
    for (let i = 0; i < w / 5; i++) sp += A.circ(r() * w, y0 + 4 + r() * (wy - y0 - 6), rr(r, 0.3, 0.7));
    for (let i = 0; i < w / 42; i++) { const px = r() * w, py = y0 + 6 + r() * (wy - y0 - 12), rx = rr(r, 1.2, 3); peb += A.ell(px, py, rx, rx * 0.66); pebl += A.ell(px - rx * 0.3, py - rx * 0.2, rx * 0.4, rx * 0.2); }
    for (let i = 0; i < w / 150; i++) { const px = r() * w, py = y0 + 8 + r() * (wy - y0 - 14); shell += `M${f1(px - 2.2)} ${f1(py)}a2.2 2 0 0 1 4.4 0z`; }
    s += A.P(A.shift(sand, 10, 1, -0.28), sp, 0.45) + `<path fill="#a89e8a" stroke="#74695a" stroke-width="0.5" d="${peb}"/>` + A.P('#e8e0cc', pebl, 0.85) + `<path fill="#f6e8e0" stroke="#c49a84" stroke-width="0.5" d="${shell}"/>`;
    // the water, from the shore out: a line of wet sand, then shallows, middle and deep with soft wandering edges
    const shore = wander(r, -20, w + 20, wy, 3.6, 26);
    const closed = (pts, dy) => smooth(pts.map(p => [p[0], p[1] + dy]).concat([[w + 90, wy + dy], [w + 2400, wy + dy], [w + 2400, wy + wh + 2400], [-2400, wy + wh + 2400], [-2400, wy + dy], [-90, wy + dy]]), true);
    s += A.P(A.shift(sand, 8, 1, -0.2), closed(shore, -7), 0.5) + A.P(A.shift(sand, 10, 1.05, -0.3), closed(shore, -3.4), 0.55);
    s += A.P(P[0], closed(shore, 0));
    const b1 = wander(r, -20, w + 20, wy + ch * 0.75, 7, 44), b2 = wander(r, -20, w + 20, wy + ch * 2, 9, 54), b3 = wander(r, -20, w + 20, wy + ch * 3.5, 9, 60);
    s += A.P(P[1], closed(b1, 0), 0.9) + A.P(P[2], closed(b2, 0)) + A.P(P[3], closed(b3, 0));
    if (frozen) {
      let cr = ''; for (let i = 0; i < w / 80; i++) { const cx = r() * w, cy = wy + 8 + r() * (wh - 14); cr += `M${f1(cx)} ${f1(cy)}l${f1(rr(r, 8, 24))} ${f1(rr(r, -4, 6))}l${f1(rr(r, 6, 16))} ${f1(rr(r, -6, 6))}`; }
      s += A.S('#ffffff', 0.9, cr, 0.7);
    } else {
      // reflections: the sky's clouds as long pale shapes, painted strokes of light and dark across the water
      let cl = ''; for (let i = 0; i < w / 180; i++) cl += A.blob(r, r() * w, wy + 16 + r() * (wh - 24), rr(r, 40, 90), rr(r, 4, 9), 9, 0.5);
      s += A.P(night ? '#6a86b8' : '#ffffff', cl, night ? 0.14 : 0.17);
      let hi = '', lo = '';
      for (let i = 0; i < w * wh / 620; i++) { const sx = r() * w, sy = wy + 4 + r() * (wh - 6), L = rr(r, 10, 44), d = `M${f1(sx)} ${f1(sy)}q${f1(L / 2)} ${f1(rr(r, -1.2, 1.2))} ${f1(L)} 0`; if (i % 2) hi += d; else lo += d; }
      s += A.S(night ? '#7a96c8' : '#e8f8fc', 1, hi, night ? 0.22 : 0.3) + A.S(A.dk(P[3], 0.25), 1.1, lo, 0.2);
      // the bank's reflection: a dark smear close in under the shore
      if (!night) s += A.S(season === 'winter' ? '#8ca4ac' : season === 'autumn' ? '#7a7a52' : '#3f7f62', 3.4, smooth(shore.map(p => [p[0], p[1] + 8]), false), 0.2);
      // lily pads at the far edges
      let pad = '', pl = '', fl = '';
      for (const [px, py, R] of lakePads(a, W)) { pad += `M${f1(px)} ${f1(py)}L${f1(px + R)} ${f1(py - R * 0.1)}A${R} ${f1(R * 0.42)} 0 1 0 ${f1(px + R * 0.86)} ${f1(py + R * 0.2)}z`; pl += A.ell(px - R * 0.3, py - R * 0.12, R * 0.36, R * 0.1); if (Math.abs(px) % 3 === 0) fl += A.circ(px + 1, py - 1, 2); }
      s += `<path fill="#4f8f42" stroke="#2f5f2c" stroke-width="0.7" d="${pad}"/>` + A.P('#8cc468', pl, 0.8) + A.P(season === 'winter' ? '#e8f0f4' : '#f2c4d8', fl);
      if (night) {
        // the moon's road across the water
        const mx = w * 0.78; let road = '';
        for (let i = 0; i < 16; i++) { const yy = wy + 6 + i * (wh - 10) / 16, half = 8 + i * 1.5 + r() * 8; road += `M${f1(mx - half + rr(r, -6, 6))} ${f1(yy)}h${f1(half * 2)}`; }
        s += A.S('#f4efd8', 1.9, road, 0.5) + A.P('#dfe8ff', A.ell(mx, wy + wh * 0.46, 54, wh * 0.46), 0.08);
        let st = ''; for (let i = 0; i < w / 40; i++) st += A.circ(r() * w, wy + 6 + r() * (wh - 10), rr(r, 0.4, 0.9));
        s += A.P('#ffffff', st, 0.55);
      }
    }
    // what moves: the waves' lines of foam on the shore, ripples, glints and fish going about their day
    const mv = !o.still && !frozen;
    // (the pier stands over the water: what moves on the water goes round it, or it would be painted across the planks)
    const pier = (GARDEN_PROPS.find(q => q.id === 'pier') || { x: 0, w: 0 }), px0 = pier.x * cw - 7, px1 = (pier.x + pier.w) * cw + 7, offPier = (x, m) => x < px0 - (m || 0) || x > px1 + (m || 0);
    const twoRuns = (pts) => { const L = pts.filter(q => q[0] <= px0), R = pts.filter(q => q[0] >= px1); return (L.length > 1 ? smooth(L, false) : '') + (R.length > 1 ? smooth(R, false) : ''); };
    live += `<path d="${twoRuns(shore.map(p => [p[0], p[1] + 1]))}" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-opacity="${frozen ? 0.9 : 0.72}"${mv ? ' class="gd-foam"' : ''}/>`;
    if (mv) {
      live += `<path d="${twoRuns(shore.map(p => [p[0], p[1] + 6]))}" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.42" class="gd-foam gart-foam2"/>`;
      for (let k = 0; k < 3; k++) { const yy = wy + (k * 1.6 + 1.1) * ch; live += `<g class="gd-waves" style="animation-delay:-${k * 1.7}s">${A.S('#ffffff', 1, yy < W.sky + (pier.y + pier.h) * ch ? twoRuns(wander(r, -30, w + 30, yy, 2.4, 34)) : smooth(wander(r, -30, w + 30, yy, 2.4, 34), false), 0.2)}</g>`; }
      const rq = A.rng(A.hash('lake-live'));
      for (let i = 0; i < Math.min(14, w / 90); i++) { const cx = rq() * w, cy = wy + 10 + rq() * (wh - 16); if (!offPier(cx, 14) && cy < W.sky + (pier.y + pier.h) * ch + 12) continue; live += `<ellipse class="gart-ring" cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rr(rq, 7, 13))}" ry="2.2" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1" style="animation-delay:-${f1(rq() * 6)}s"/>`; }
      if (sc.tod === 'day' || sc.tod === 'dusk') for (let i = 0; i < Math.min(12, w / 110); i++) { const cx = rq() * w, cy = wy + 6 + rq() * (wh - 10); if (!offPier(cx, 6) && cy < W.sky + (pier.y + pier.h) * ch + 8) continue; live += `<path class="gd-glint" d="M${f1(cx - 3.4)} ${f1(cy)}h6.8M${f1(cx)} ${f1(cy - 1.6)}v3.2" stroke="#ffffff" stroke-width="1.3" stroke-opacity="0.85" stroke-linecap="round" style="animation-delay:-${f1(rq() * 5)}s"/>`; }
      // (no fish are drawn here: every shadow in the water is a real fish, 94-garden-fish-6school.js)
    }
    return { s, live };
  }

  /* ---------- everything on the ground ---------- */
  function ground(sc, o) {
    const W = GARDEN_WORLD, cw = W.cellW, ch = W.cellH, season = sc.season, open = new Set(sc.areas || []), r = A.rng(A.hash('gart-ground|' + season + '|' + (o.size || 'm')));
    const lod = o.size === 's' ? 0.45 : 1, snowy = season === 'winter' && sc.rain && sc.rain.snow;
    // separate groups, baked one at a time with a breath between (94-garden-art-h-life.js): a big world must never freeze the page
    const groups = [];
    let s = '', live = '';
    const flush = () => { if (s) groups.push(`<g>${s}</g>`); s = ''; };
    const TW = 720, TH = 420, lw0 = W.cols * cw, lh0 = W.rows * ch;
    for (let ty = 0; ty < lh0; ty += TH) for (let tx = 0; tx < lw0; tx += TW) { s = lawn(sc, o, r, tx, W.sky + ty, Math.min(TW, lw0 - tx), Math.min(TH, lh0 - ty)); flush(); }
    const late = [];
    for (const a of GARDEN_AREAS) {
      flush();
      const x = a.x * cw, y = W.sky + a.y * ch, w = a.w * cw, h = a.h * ch, ar = A.rng(A.hash('area|' + a.id + '|' + season));
      if ((a.look || a.id) === 'lake') { const L = lake(sc, o, a, W, ar); s += L.s; live += L.live; continue; }
      if (!open.has(a.id)) { s += locked(ar, sc, a, x, y, w, h, W, open); if (!o.photo) live += lockSign(a, x, y, w, h, sc); continue; }
      const col = tileC(a.tile, season, '#8a5a3a'), look = a.look || a.id;
      if (look === 'woods') s += woods(ar, sc, x, y, w, h);
      else if (look === 'orchard') s += orchard(ar, sc, x, y, w, h, col, lod);
      else if (look === 'meadow') s += meadow(ar, sc, x, y, w, h, col, lod);
      else if (a.water) { s += pond(ar, sc, x, y, w, h, a.water, W, snowy); live += pondLive(sc, o, a.water, W); }
      else if (a.tile === 'glasshouse') late.push(greenhouse(ar, sc, a, x, y, w, h, W));
      else if (a.tile === 'tilled' || a.tile === 'soil') {
        const deep = A.shift(col, 6, 1, -0.1), S = A.shift(col, 0, 1.02, a.tile === 'tilled' ? -0.02 : -0.03);
        const bx = x + 7, by = y + 7, bw = w - 14, bh = h - 14;
        s += soil(ar, bx, by, bw, bh, S, deep, lod);
        if (a.tile === 'tilled') s += furrows(ar, bx, by, bw, bh, ch, S, deep);
        if (season === 'winter') { let sn = ''; for (let i = 0; i < bw * bh / 2200; i++) sn += A.blob(ar, bx + 14 + ar() * (bw - 28), by + 10 + ar() * (bh - 18), rr(ar, 12, 30), rr(ar, 3, 7), 7, 0.5); s += A.P('#dfe6ec', sn, snowy ? 0.95 : 0.82); }
        s += a.tile === 'tilled' ? timber(ar, bx, by, bw, bh, 7) : bricks(ar, bx, by, bw, bh);
      } else s += wildPatch(ar, x, y, w, h, col);
    }
    flush();
    for (const g of late) groups.push(`<g>${g}</g>`);
    if (W.coreCols && W.cols > W.coreCols) {
      // the lane east along the shore, worn into the grass, with the land you can buy either side of it
      const lx = W.coreCols * cw, ly = W.sky + 11 * ch, lw = (W.cols - W.coreCols) * cw, lh = 2 * ch, ls = tileC('sand', season, '#e3d3a2'), lr = A.rng(A.hash('lane'));
      s += A.P(A.shift(ls, 8, 1, -0.1), wob(lr, lx - 6, ly + 1, lw + 12, lh - 2, 8, 3, 34), 0.6) + A.P(ls, wob(lr, lx - 4, ly + 4, lw + 8, lh - 8, 8, 3, 34));
      let pb = ''; for (let i = 0; i < lw / 14; i++) pb += A.ell(lx + lr() * lw, ly + 5 + lr() * (lh - 10), rr(lr, 0.8, 2), rr(lr, 0.5, 1.2));
      s += A.P(A.shift(ls, 10, 1, -0.22), pb, 0.7);
    }
    try { if (typeof gardenPierGround === 'function') s += gardenPierGround(sc, o); } catch (e) { /* no pier */ }
    if (snowy) { let sn = ''; for (let i = 0; i < 60; i++) sn += A.blob(r, r() * W.cols * cw, W.sky + r() * W.rows * ch, rr(r, 14, 36), rr(r, 4, 8), 8, 0.5); s += A.P('#ffffff', sn, 0.72); }
    // past the edge of the world (a window of another shape, zoomed right out): more lawn, and the lake carrying on
    const W2 = W.cols * cw, H0 = W.sky + W.rows * ch, lakeA = GARDEN_AREAS.find(a => (a.look || a.id) === 'lake'), pal = LAWN[season] || LAWN.summer;
    let margin = `<path fill="${pal[0]}" d="M-3000 ${W.sky}H${W2 + 3000}V${H0 + 3000}H-3000z"/>`;
    if (lakeA) margin += `<path fill="${(snowy ? '#92b8d0' : waterOf(sc)[3])}" d="M-3000 ${W.sky + lakeA.water.y * ch}H${(lakeA.x + lakeA.w) * cw}V${H0 + 3000}H-3000z"/>`;
    flush();
    return `${margin}<g class="gart-bake" data-bake="ground" data-split="1">${groups.join('')}</g><g class="gart-live">${live}</g>`;
  }

  /* ---------- the sky ---------- */
  const DIM = { night: 0.62, dusk: 0.28, dawn: 0.16 };
  const SKY = {
    day: { spring: ['#6fb8ea', '#a4d6f2', '#eaf7f4'], summer: ['#5fb0ea', '#98d2f4', '#ecf7ee'], autumn: ['#7fb0d4', '#b6d0de', '#f6ebd2'], winter: ['#a4c0d6', '#c8d8e4', '#f0f2f4'] },
    dawn: ['#7d8ec4', '#f0b4a4', '#fde4bc'], dusk: ['#5c5a9c', '#d68aa4', '#fbbf80'], night: ['#0b1430', '#172650', '#2c3f6e'],
  };
  function hill(r, W, y, amp, step) { const pts = [[-20, y]]; for (let x = 0; x <= W + step; x += step) pts.push([x, y - r() * amp]); return smooth(pts.concat([[W + 40, y + 60], [-40, y + 60]]), true); }
  function skyLayers(sc, o, W, base) {
    const u = o.uid, r = A.rng(A.hash('gart-sky|' + sc.season));
    const grey = sc.rain && (sc.rain.now || sc.rain.snow) && sc.tod !== 'night';
    let [top, mid, bot] = sc.tod === 'day' ? (SKY.day[sc.season] || SKY.day.summer) : (SKY[sc.tod] || SKY.day.summer);
    if (grey) { top = A.mix(top, '#7c8894', 0.55); mid = A.mix(mid, '#a4acb4', 0.55); bot = A.mix(bot, '#ccd0d4', 0.5); }
    const defs = `<defs><linearGradient id="${u}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="0.62" stop-color="${mid}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`
      + `<radialGradient id="${u}-sun"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.85"/><stop offset="0.3" stop-color="#ffe9a0" stop-opacity="0.4"/><stop offset="1" stop-color="#ffe090" stop-opacity="0"/></radialGradient></defs>`;
    const hr = typeof sc.hour === 'number' ? sc.hour : 12;
    let s = `<path fill="${top}" d="M-3000 -3000H${W + 3000}V1H-3000z"/><path fill="${bot}" d="M-3000 0H0V${base + 10}H-3000zM${W} 0H${W + 3000}V${base + 10}H${W}z"/><rect x="0" y="0" width="${W}" height="${base + 10}" fill="url(#${u}-sky)"/>`;
    let tw = '';
    if (sc.tod === 'night') {
      const q = A.rng(A.hash('stars|' + (sc.day || '')));
      let far = '', near = '', cross = '';
      for (let i = 0; i < W * base / 1400; i++) { const x = q() * W, y = q() * base * 0.86, big = i % 9 === 0; if (big) cross += `M${f1(x - 2.2)} ${f1(y)}h4.4M${f1(x)} ${f1(y - 2.2)}v4.4`; else if (i % 3) far += A.circ(x, y, rr(q, 0.4, 0.75)); else near += A.circ(x, y, rr(q, 0.7, 1.15)); }
      s += A.P('#c8d4f4', far, 0.55) + A.P('#ffffff', near, 0.85) + A.S('#ffffff', 0.7, cross, 0.8);
      if (!o.still) for (let i = 0; i < 6; i++) tw += `<circle class="gda-blink" cx="${f1(q() * W)}" cy="${f1(q() * base * 0.7)}" r="1.1" fill="#ffffff" style="animation-delay:-${f1(q() * 3)}s"/>`;
      const mx = W * 0.78, my = 46;
      s += `<circle cx="${f1(mx)}" cy="${my}" r="74" fill="url(#${u}-sun)" opacity="0.4"/><circle cx="${f1(mx)}" cy="${my}" r="20" fill="#f6f2dc"/><circle cx="${f1(mx - 5)}" cy="${my - 4}" r="4" fill="#d8d4bc"/><circle cx="${f1(mx + 7)}" cy="${my + 3}" r="2.8" fill="#d8d4bc"/><circle cx="${f1(mx - 3)}" cy="${my + 9}" r="2.2" fill="#d8d4bc"/><path fill="#c8c4ac" fill-opacity="0.5" d="M${f1(mx + 4)} ${my - 20}a20 20 0 0 1 0 40a26 26 0 0 0 0 -40z"/>`;
    } else if (!(sc.rain && sc.rain.now)) {
      const t = Math.max(0, Math.min(1, (hr - 5) / 16)), sx = W * (0.12 + t * 0.76), sy = 30 + Math.abs(t - 0.5) * 2 * 70, sun = sc.tod === 'day' ? '#ffdc64' : '#ffb26a';
      s += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="92" fill="url(#${u}-sun)"/><circle cx="${f1(sx)}" cy="${f1(sy)}" r="26" fill="${sun}" fill-opacity="0.34"/><circle cx="${f1(sx)}" cy="${f1(sy)}" r="16.5" fill="${sun}"/><circle cx="${f1(sx - 4)}" cy="${f1(sy - 4)}" r="9" fill="#fff4c0" fill-opacity="0.55"/>`;
    }
    // sky stays in vector: it is a handful of shapes and the camera rarely shows it
    const sky = `<g class="gd-sky">${s}${tw}</g>`;
    // clouds: real cumulus, flat underneath, lit from the upper left, each drifting at its own pace
    const nc = grey ? 7 : Math.max(3, Math.round(W / 300));
    const light = sc.tod === 'night' ? '#46567e' : grey ? '#d0d4d8' : sc.tod === 'dusk' ? '#ffe0c8' : sc.tod === 'dawn' ? '#fff0e0' : '#ffffff', shade = sc.tod === 'night' ? '#2c3a60' : grey ? '#9ea6ae' : sc.tod === 'dusk' ? '#b884a8' : sc.tod === 'dawn' ? '#e4b4bc' : '#c8dcec';
    let cl = '<g class="gd-clouds">';
    for (let i = 0; i < nc; i++) {
      const q = A.rng(A.hash('cloud|' + i + '|' + sc.season)), cx = q() * W, cy = 22 + q() * Math.max(20, base * 0.42), k = 0.7 + q() * 0.9, n = 4 + Math.floor(q() * 3);
      let pu = '', hi = '';
      for (let j = 0; j < n; j++) { const dx = (j - (n - 1) / 2) * 15 * k + rr(q, -3, 3), rad = (9 + (1 - Math.abs(j - (n - 1) / 2) / n) * 12 + q() * 4) * k, y = cy - rad * 0.55; pu += A.circ(cx + dx, y, rad); hi += A.circ(cx + dx - rad * 0.22, y - rad * 0.22, rad * 0.68); }
      const span = (n * 9 + 12) * k, floor = `M${f1(cx - span)} ${f1(cy)}Q${f1(cx)} ${f1(cy + 5 * k)} ${f1(cx + span)} ${f1(cy)}Q${f1(cx)} ${f1(cy - 15 * k)} ${f1(cx - span)} ${f1(cy)}z`;
      const inner = A.P(shade, pu + floor, sc.tod === 'night' ? 0.7 : 0.94) + A.P(light, hi, sc.tod === 'night' ? 0.55 : 0.95);
      cl += `<g class="${o.still ? '' : 'gart-cloud'}" style="--gx:${Math.round(W * 0.28)}px;animation-duration:${Math.round(110 + q() * 110)}s;animation-delay:-${Math.round(q() * 200)}s">${inner}</g>`;
    }
    cl += '</g>';
    // the far distance: hills going blue with distance, trees on the ridge, the hedge at the bottom of the garden
    const dim = DIM[sc.tod] || 0, ni = '#141c3c', d = c => (dim ? A.mix(c, ni, dim) : c);
    const H = { spring: ['#b8d6c8', '#9cc898', '#80b86c'], summer: ['#b0d0d0', '#92c098', '#74ac62'], autumn: ['#ccc8b0', '#c4b480', '#b09a54'], winter: ['#d4dce0', '#c0ccc8', '#a8b8ac'] }[sc.season] || ['#b0d0d0', '#92c098', '#74ac62'];
    let f = A.P(d(H[0]), hill(r, W, base - 56, 34, 150)) + A.P(d(H[1]), hill(r, W, base - 40, 30, 110));
    const treeRow = (y, col, colL, step, R) => { let dk = '', lt = ''; for (let x = -10; x < W + 20; x += step * (0.7 + r() * 0.7)) { const rad = R * (0.72 + r() * 0.6), ty = y - r() * 7; dk += A.blob(r, x, ty, rad * 1.1, rad, 8, 0.3); lt += A.blob(r, x - rad * 0.26, ty - rad * 0.3, rad * 0.62, rad * 0.5, 7, 0.3); } return A.P(col, dk) + A.P(colL, lt, 0.85); };
    const tl = sc.season === 'winter' ? ['#7e8c84', '#9aa89e'] : sc.season === 'autumn' ? ['#a4703a', '#c89650'] : sc.season === 'spring' ? ['#5f9a58', '#86bc6e'] : ['#4f8a4c', '#74a95c'];
    f += treeRow(base - 32, d(tl[0]), d(tl[1]), 30, 15);
    f += A.P(d(H[2]), hill(r, W, base - 22, 14, 90));
    if (sc.tod === 'night' || sc.tod === 'dusk') { let win = ''; for (let i = 0; i < W / 240; i++) win += A.rect(r() * W, base - 30 - r() * 8, 1.8, 2.4); f += A.P('#ffe08a', win, 0.85); }
    // the hedge: a clipped wall of leaves, lit along its top
    const hc = sc.season === 'winter' ? ['#55695a', '#6f8470', '#94a48c'] : sc.season === 'autumn' ? ['#5f6a34', '#7f8a40', '#a8a450'] : ['#3a6a3a', '#4f8446', '#74a858'];
    let hb = '', ht = '', hl = '';
    for (let x = -6; x < W + 12; x += 15) { hb += A.circ(x + rr(r, -2, 2), base - 15 + rr(r, -1.4, 1.4), rr(r, 8, 10.5)); ht += A.circ(x - 2 + rr(r, -2, 2), base - 18 + rr(r, -1, 1), rr(r, 3.2, 5.6)); }
    for (let i = 0; i < W / 3.4; i++) hl += A.leaf(r() * W, base - 21 + r() * 19, r() * 6.2, 2.6, 0.8);
    f += A.P(d(hc[0]), A.rect(0, base - 15, W, 19) + hb) + A.P(d(hc[1]), ht, 0.95) + A.P(d(hc[2]), hl, 0.62);
    f += A.P('#102014', A.rect(0, base - 2, W, 6), 0.16);
    return { defs, sky, clouds: cl, far: `<g class="gd-far"><g class="gart-bake" data-bake="far" data-bs="1">${f}</g></g>` };
  }

  /* ---------- the dark of the hour ---------- */
  function night(sc, o, lights) {
    const W = GARDEN_WORLD, ww = W.cols * W.cellW, hh = W.sky + W.rows * W.cellH, top = W.sky - 16, u = o.uid;
    const tone = { night: ['#081440', 0.5], dusk: ['#34204e', 0.24], dawn: ['#4a2f60', 0.14] }[sc.tod];
    if (!tone) return '';
    // the plants' and lamps' lights, and the lit windows of the buildings on the shore
    const props = [];
    try { for (const p of GARDEN_PROPS) if (p.kind === 'shop' || p.kind === 'tackle') props.push({ x: (p.x + p.w / 2) * W.cellW, y: W.sky + (p.y + p.h) * W.cellH - 26, r: 92 }); else if (p.id === 'pier') props.push({ x: (p.x + p.w / 2) * W.cellW, y: W.sky + (p.y + p.h) * W.cellH - 8, r: 58 }); } catch (e) { /* no buildings here */ }
    const lit = sc.tod === 'dawn' ? [] : props.concat(lights).slice(0, 44);
    let holes = sc.tod === 'night' ? `<ellipse cx="${f1(ww * 0.62)}" cy="${f1(top + (hh - top) * 0.3)}" rx="${f1(ww * 0.46)}" ry="${f1((hh - top) * 0.44)}" fill="url(#${u}-hole)" opacity="0.3"/>` : '', glow = '', warm = '';
    lit.forEach((L, i) => {
      const R = L.r * 1.25;
      holes += `<circle cx="${f1(L.x)}" cy="${f1(L.y)}" r="${f1(R)}" fill="url(#${u}-hole)"/>`;
      // a warm wash in the pool, a small bright heart that breathes (only the first few breathe: they cost a repaint each)
      warm += `<circle cx="${f1(L.x)}" cy="${f1(L.y)}" r="${f1(R * 0.9)}" fill="url(#${u}-glow2)" opacity="0.72"/>`;
      if (i < 10 && !o.still) glow += `<circle class="gd-halo" cx="${f1(L.x)}" cy="${f1(L.y)}" r="${f1(L.r * 0.34)}" fill="url(#${u}-glow)" style="animation-delay:-${f1(i * 0.7)}s"/>`;
    });
    const vig = sc.tod === 'night' ? `<radialGradient id="${u}-vig" cx="0.5" cy="0.45" r="0.8"><stop offset="0.55" stop-color="#060a24" stop-opacity="0"/><stop offset="1" stop-color="#060a24" stop-opacity="0.55"/></radialGradient>` : '';
    const grad = (id) => `<radialGradient id="${id}"><stop offset="0" stop-color="#ffdf9a" stop-opacity="0.6"/><stop offset="0.45" stop-color="#ffd088" stop-opacity="0.2"/><stop offset="1" stop-color="#ffc878" stop-opacity="0"/></radialGradient>`;
    const dark = `<defs><radialGradient id="${u}-hole"><stop offset="0" stop-color="#000000"/><stop offset="0.42" stop-color="#000000" stop-opacity="0.7"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>${grad(u + '-glow2')}${vig}`
      + `<mask id="${u}-nm" maskUnits="userSpaceOnUse" x="0" y="0" width="${ww}" height="${hh}"><rect x="0" y="0" width="${ww}" height="${hh}" fill="#ffffff"/>${holes}</mask></defs>`
      + `<rect x="0" y="${top}" width="${ww}" height="${hh - top}" fill="${tone[0]}" fill-opacity="${tone[1]}" mask="url(#${u}-nm)"/>`
      + (vig ? `<rect x="0" y="${top}" width="${ww}" height="${hh - top}" fill="url(#${u}-vig)"/>` : '')
      + warm
      + (typeof gartLighting === 'function' ? gartLighting(sc.tod, { w: ww, h: hh, top: W.sky, season: sc.season }) : '');
    return `<defs>${grad(u + '-glow')}</defs><g class="gart-bake" data-bake="night" data-bs="0.5" data-alpha="1">${dark}</g>${glow}`;
  }
  return { ground, skyLayers, night, wob, smooth, wander, pads };
})();
function gartGroundLayer(sc, o) { return _GARTW.ground(sc, o); }
function gartLilyPads(sc) { return _GARTW.pads(sc, GARDEN_WORLD); }
function gartSkyLayers(sc, o, W, base) { return _GARTW.skyLayers(sc, o, W, base); }
function gartNight(sc, o, lights) { return _GARTW.night(sc, o, lights); }

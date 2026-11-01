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

  function wildPatch(r, x, y, w, h, base) {
    // a soft-edged different meadow on the lawn: no box round it
    return A.P(A.shift(base, 4, 1, -0.05), wob(r, x, y, w, h, 18, 7, 30), 0.5) + A.P(base, wob(r, x + 3, y + 3, w - 6, h - 6, 16, 6, 30), 0.92);
  }
  const POND_PADS = [[0.2, 0.7, 7], [0.32, 0.8, 5], [0.78, 0.62, 6.4]];
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
  /* ---------- the lake ---------- */
  /** Where the lake's lily pads float: [x, y, radius] in stage units. Near the pier too, so you can see a frog on one from the shore. */
  function lakePads(a, W) { const x0 = a.x * W.cellW, w = a.w * W.cellW, wy = W.sky + a.water.y * W.cellH; return [32, 66, 96, 452, 500, 736, 782, w - 340, w - 54, w - 92, w - 130].map(px => [x0 + px, wy + 16 + (Math.abs(px) % 13), 6 + (Math.abs(px) % 4)]); }
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
  function lake(sc, o, a, W, r, shift) {   // (drawn from x 0, in a group moved by `shift`: the sums below are its own width)
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
    const closed = (pts, dy) => smooth(pts.map(p => [p[0], p[1] + dy]).concat([[w + 40, wy + dy + 20], [w + 40, wy + wh + 40], [-40, wy + wh + 40], [-40, wy + dy + 20]]), true);
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
    const pier = (GARDEN_PROPS.find(q => q.id === 'pier') || { x: 0, w: 0 }), px0 = pier.x * cw - shift - 7, px1 = (pier.x + pier.w) * cw - shift + 7, offPier = (x, m) => x < px0 - (m || 0) || x > px1 + (m || 0);
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
    // the lake, then everything round it (the land covers the lake's rough edges), then the pond and the greenhouse on their sections
    const lakeA = gardenArea('lake');
    { flush(); const ar = A.rng(A.hash('area|lake|' + season)), L = lake(sc, o, Object.assign({}, lakeA, { x: 0 }), W, ar, lakeA.x * cw); s += `<g transform="translate(${lakeA.x * cw} 0)">${L.s}</g>`; live += `<g transform="translate(${lakeA.x * cw} 0)">${L.live}</g>`; }
    for (const id of Object.keys(GARDEN_LAND_MAPS)) { flush(); const LP = gartLandsPlot(id, sc, o, open); s += LP.s; live += LP.live; }
    flush();
    if (open.has('pond')) { const a = gardenArea('pond'), ar = A.rng(A.hash('area|pond|' + season)); s += pond(ar, sc, a.x * cw, W.sky + a.y * ch, a.w * cw, a.h * ch, a.water, W, snowy); live += pondLive(sc, o, a.water, W); }
    const late = [];
    if (open.has('greenhouse')) { const a = gardenArea('greenhouse'), ar = A.rng(A.hash('area|greenhouse|' + season)); late.push(greenhouse(ar, sc, a, a.x * cw, W.sky + a.y * ch, a.w * cw, a.h * ch, W)); }
    flush();
    for (const g of late) groups.push(`<g>${g}</g>`);
    // the lane through the middle of the world: it wanders, inside its two rows of cells
    {
      const ly = W.sky + 19 * ch, lh = 2 * ch, ls = tileC('sand', season, '#e3d3a2'), lr = A.rng(A.hash('lane')), lw = W.cols * cw;
      const edge = (yy, ph, amp) => { const pts = []; for (let x = -10; x <= lw + 20; x += 30) pts.push([x, yy + Math.sin(x / 67 + ph) * amp + (lr() - 0.5) * 3]); return pts; };
      s += A.P(A.shift(ls, 8, 1, -0.1), smooth(edge(ly + 1, 0.4, 4).concat(edge(ly + lh - 1, 2.2, 4).reverse()), true), 0.6) + A.P(ls, smooth(edge(ly + 5, 0.4, 4).concat(edge(ly + lh - 5, 2.2, 4).reverse()), true));
      let pb = ''; for (let i = 0; i < lw / 14; i++) pb += A.ell(lr() * lw, ly + 7 + lr() * (lh - 14), rr(lr, 0.8, 2), rr(lr, 0.5, 1.2));
      s += A.P(A.shift(ls, 10, 1, -0.22), pb, 0.7);
    }
    { flush(); const LT = gartLandsTrails(sc, o, open); s += LT.s; live += LT.live; flush(); }
    try { if (typeof gardenPierGround === 'function') s += gardenPierGround(sc, o); } catch (e) { /* no pier */ }
    if (snowy) { let sn = ''; for (let i = 0; i < 60; i++) sn += A.blob(r, r() * W.cols * cw, W.sky + r() * W.rows * ch, rr(r, 14, 36), rr(r, 4, 8), 8, 0.5); s += A.P('#ffffff', sn, 0.72); }
    // past the edge of the world (a window of another shape, zoomed right out): more lawn, and the lake carrying on
    const W2 = W.cols * cw, H0 = W.sky + W.rows * ch, pal = LAWN[season] || LAWN.summer;
    const margin = `<path fill="${pal[0]}" d="M-3000 ${W.sky}H${W2 + 3000}V${H0 + 3000}H-3000z"/>`;
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

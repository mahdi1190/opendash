/* Painted vale: the High orchard dressed (C:/tmp/regions/orchard.md). A staircase of turf terraces climbs from the
 * lower terrace walls to the pass, each held by a grassy bank with a broken dry-stone foot, worn steps where a path
 * climbs it, and one planted row of fruit trees along it (the kind its own fruit section names). The ring of eight old
 * perry pears, the Mother tree propped on her crutch at the end of the orchard rows, windfalls in autumn, heather and
 * thyme on the top terrace, cowslips on the rise. Everything is placed from the layout (terrace walls, the pass, routes,
 * plots, statics, water): no cell is named here. Trees keep their trunks off paths, the square and water, and their
 * crowns off plots and landmarks. See 94-garden-paint-vale-0kit.js and docs/dev/PAINT_KIT.md. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  // what a fruit section's name says grows on its terrace; a terrace with no section of its own takes the next in turn
  const FRUIT = [['crab', 'apple'], ['apple', 'apple'], ['damson', 'plum'], ['plum', 'plum'], ['cherry', 'cherry'], ['pear', 'pear'], ['medlar', 'pear'], ['windfall', 'apple'], ['cider', 'apple'], ['bee', 'cherry']];
  const TURN = ['apple', 'pear', 'plum', 'cherry', 'apple', 'plum', 'pear'];
  const LIME = { rock: '#c9b994', rockLo: '#a8956c', rockHi: '#e4d8b6', rockDk: '#7d6a48' };
  const FOOT = { rock: '#b8a67e', rockLo: '#97845e', rockHi: '#d2c39a', rockDk: '#5e4e34' };   // the bank's foot: the same honey stone, weathered and in the bank's shade
  const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const size = (n, t) => typeof gardenSizePx === 'function' ? gardenSizePx(n, t) : (n === 'tree' ? 165 : 92);

  // Broad colour laid soft: painted at a sixth of the resolution and smoothed up (as the fells do), so a bank's light
  // and shade have no edge of their own at any zoom.
  const softPad = 40, softS = 6; let softA = null, softB = null;
  function soft(B, cb, paint) {
    const w = Math.ceil((cb[2] - cb[0] + softPad * 2) / softS), h = Math.ceil((cb[3] - cb[1] + softPad * 2) / softS);
    if (!softA) { softA = document.createElement('canvas'); softB = document.createElement('canvas'); }
    for (const c of [softA, softB]) { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, w, h); }
    const sx = softA.getContext('2d'); sx.setTransform(1 / softS, 0, 0, 1 / softS, -(cb[0] - softPad) / softS, -(cb[1] - softPad) / softS);
    const S = { cx: sx, f(d, col, a) { sx.globalAlpha = a == null ? 1 : a; sx.fillStyle = col; sx.fill(typeof d === 'string' ? new Path2D(d) : d); return S; } };
    paint(S); sx.globalAlpha = 1;
    const bx = softB.getContext('2d'); bx.filter = 'blur(1.4px)'; bx.drawImage(softA, 0, 0); bx.filter = 'none';
    B.cx.save(); B.cx.imageSmoothingEnabled = true; B.cx.imageSmoothingQuality = 'high'; B.cx.globalAlpha = 1; B.cx.drawImage(softB, cb[0] - softPad, cb[1] - softPad, w * softS, h * softS); B.cx.restore();
  }
  // a band along a line of points (px): from `up` px above it to `down` px below, each scaled by the point's taper
  function band(pts, up, down) { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y - up * q.t) : p.moveTo(q.x, q.y - up * q.t))); for (let i = pts.length - 1; i >= 0; i--) p.lineTo(pts[i].x, pts[i].y + down * pts[i].t); p.closePath(); return p; }

  /* ---------- the terraces, from the layout ---------- */
  // The lowest terrace is the line of east-west terrace walls along the region's foot; the top one sits just below the
  // pass. Between them the terraces climb in even steps, each line a little flatter than the one below and gently
  // wandering. A bank is laid only where it would not cross water, a plot, a landmark, the square or an open place.
  function terraces(L, kit, reg, loops) {
    const D = L.D, cw = L.cw, ch = L.ch, rb = kit.bboxOf(loops.flat(), 0), x0 = Math.max(0, rb[0] / cw), x1 = Math.min(L.W.cols, rb[2] / cw);
    const near = poly => { const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length; return cx > x0 - 3 && cx < x1 + 3 && cy * ch + L.W.sky > rb[1] - 3 * ch && cy * ch + L.W.sky < rb[3] + 3 * ch; };
    const rim = [];
    for (const f of D.landforms || []) {
      if (f.kind !== 'terrace-wall' || !f.polygon || f.polygon.length < 4 || !near(f.polygon)) continue;
      const poly = f.polygon, n = poly.length >> 1, a = poly.slice(0, n), b = poly.slice(n).reverse();
      const up = a.reduce((s, p) => s + p[1], 0) <= b.reduce((s, p) => s + p[1], 0) ? a : b;
      if (Math.abs(up[up.length - 1][0] - up[0][0]) > Math.abs(up[up.length - 1][1] - up[0][1]) * 1.5) for (const p of up) rim.push(p);
    }
    rim.sort((p, q) => p[0] - q[0]);
    const foot = (rb[3] - L.W.sky) / ch - 1.5;
    const raw = x => { if (!rim.length) return foot; if (x <= rim[0][0]) return rim[0][1]; const e = rim[rim.length - 1]; if (x >= e[0]) return e[1]; let i = 1; while (rim[i][0] < x) i++; const p = rim[i - 1], q = rim[i], t = (x - p[0]) / ((q[0] - p[0]) || 1); return p[1] + (q[1] - p[1]) * t; };
    const base = x => { let s = 0; for (let d = -3; d <= 3; d++) s += raw(x + d); return s / 7; };
    const pass = (D.gates || []).find(g => g.district === reg.id ? false : g.fromZone === reg.zone) || null;
    const top = pass ? (pass.door ? pass.door.y : pass.y + 3) + .6 : (rb[1] - L.W.sky) / ch + 3;
    let mean = 0, nm = 0; for (let x = x0 + 1; x < x1 - 1; x += 1) { mean += base(x); nm++; } mean = nm ? mean / nm : foot;
    const N = Math.max(3, Math.round((mean - top) / 4.1)), S = (mean - top) / N;
    const line = (k, x) => k === 0 ? Math.min(base(x), raw(x)) : base(x) * (1 - k / N) + mean * (k / N) - k * S + (kit.noise(x / 6.5, k * 7.3, 811) - .5) * 1.2;
    return { N, S, line, x0, x1, top, pass };
  }

  function compose(C) {
    const t0 = performance.now(), { L, P, kit, add, thing, season } = C, cw = L.cw, ch = L.ch, W = L.W;
    const reg = (L.D.regions || []).find(r => r.id === 'orchard-headland'); if (!reg || !window.GardenPaintWood || !GardenPaintWood.orchardTree) return;
    const loops = (reg.polygons || []).map(l => l.map(L.pt)), regP = V.loopPath(loops), coastP = V.loopPath(L.coast), rb = kit.bboxOf(loops.flat(), 20);
    const walls = (L.D.landforms || []).filter(f => f.kind === 'terrace-wall' && f.polygon).map(f => f.polygon);
    // on a wall, or within d of its outline (a terrace wall is drawn upright: nothing stands in it)
    const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const wallBox = walls.map(poly => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of poly) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; });
    const nearWall = (x, y, d) => walls.some((poly, i) => { const b = wallBox[i]; if (x < b[0] - d || x > b[2] + d || y < b[1] - d || y > b[3] + d) return false; return inPoly(x, y, poly) || poly.some(p => Math.hypot(p[0] - x, (p[1] - y) * 1.25) < d * .55); });
    // This lawn sits above the fells layer. Its cell-sized lobes must not
    // overpaint the shared water contours or the terrace masonry below it.
    const groundCuts = (L.D.freshwater || []).filter(f => f.boundary).map(f => f.boundary.map(L.pt));
    for (const poly of walls) {
      const n = poly.length >> 1, a = poly.slice(0, n), b = poly.slice(n).reverse();
      const north = a.reduce((s, p) => s + p[1], 0) <= b.reduce((s, p) => s + p[1], 0);
      const upper = (north ? a : b).map(L.pt), lower = (north ? b : a).map(L.pt), along = Math.abs(upper[upper.length - 1].x - upper[0].x) > Math.abs(upper[upper.length - 1].y - upper[0].y);
      // terraceOps draws upright coping up to six pixels above the upper rim. A wall that runs north and south is a
      // bank (bankOps) with nothing above its outline: lifting one side cut a slanted sliver that showed as a light streak.
      groundCuts.push(along ? upper.map(p => ({ x: p.x, y: p.y - 7 })).concat(lower.slice().reverse()) : poly.map(L.pt));
    }
    const groundClips = groundCuts.map(poly => {
      const cut = new Path2D(); cut.rect(rb[0], rb[1], rb[2] - rb[0], rb[3] - rb[1]);
      cut.addPath(V.loopPath([poly])); return cut;
    });
    const inReg = (x, y) => { const b = L.base(x, y); return !!(b && b.region === reg.id); };
    const grass = (x, y) => inReg(x, y) && L.kind(x + .5, y + .5) === 'grass';
    const T = terraces(L, kit, reg, loops), line = T.line;

    // The places the layout names, and what keeps clear of them
    const stats = (L.D.static || []).filter(s => inReg(s.x + s.w / 2, s.y + s.h / 2));
    const statHit = (x, y, m) => stats.some(s => x > s.x - m && x < s.x + s.w + m && y > s.y - m && y < s.y + s.h + m);
    const plotC = id => { const cells = (L.D.sectionCells || {})[id]; if (!cells || !cells.length) return null; return { x: cells.reduce((s, c) => s + c[0], 0) / cells.length + .5, y: cells.reduce((s, c) => s + c[1], 0) / cells.length + .5 }; };
    const sections = Object.keys(L.D.sectionCells || {}).map(id => ({ id, c: plotC(id) })).filter(s => s.c && inReg(s.c.x, s.c.y));
    const rise = (sections.find(s => /cowslip|meadow|rise/.test(s.id)) || {}).c || null;
    const folly = stats.find(s => /folly|tower/.test(s.id)), fc = folly ? { x: folly.x + folly.w / 2, y: folly.y + folly.h / 2 } : null;
    const ringS = stats.find(s => /ring/.test(s.id)), ringC = ringS ? { x: ringS.x + ringS.w / 2, y: ringS.y + .5 } : null;
    const inRise = (x, y) => !!rise && ((x - rise.x) / 3.8) ** 2 + ((y - rise.y) / 3) ** 2 < 1;
    const onRidge = (x, y) => !!fc && ((x - fc.x) / 4.2) ** 2 + ((y - fc.y) / 5.2) ** 2 < 1;
    const onTop = (x, y) => y < line(T.N, x) + .4;
    const inRing = (x, y, s) => !!ringC && ((x - ringC.x) / (4.6 * s)) ** 2 + ((y - ringC.y) / (3 * s)) ** 2 < 1;

    const ribbons = [...L.routes.values()].filter(rt => rt.points && rt.points.length > 1 && (rt.tier || rt.kind) !== 'plaza' && rt.points.some(p => inReg(p[0], p[1])))
      .map(rt => { const G = window.GardenPaintGround, kind = G && G.routeKind ? G.routeKind(rt) : 'earth', painted = G && G.ROUTE_WIDTH ? G.ROUTE_WIDTH[kind] || 22 : 22; return { id: rt.id, w: rt.widthCells || 1.4, half: Math.max(painted / 2, (rt.widthCells || 1.4) / 2 * cw * .5), painted: painted / 2, pts: gardenIslandRoutePath(rt).points }; });
    const segD = (px, py, a, b) => { const ax = a.x * cw, ay = a.y * ch, bx = b.x * cw, by = b.y * ch, dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
    // route segments filed by the cells they pass, so a test looks only at the few segments near it
    const segBins = new Map();
    for (const rb2 of ribbons) for (let i = 1; i < rb2.pts.length; i++) { const a = rb2.pts[i - 1], b = rb2.pts[i], seg = [a, b, rb2.half];
      for (let gy = Math.floor(Math.min(a.y, b.y)) - 1; gy <= Math.floor(Math.max(a.y, b.y)) + 1; gy++) for (let gx = Math.floor(Math.min(a.x, b.x)) - 1; gx <= Math.floor(Math.max(a.x, b.x)) + 1; gx++) { const key = gx * 1000 + gy; let l = segBins.get(key); if (!l) segBins.set(key, l = []); l.push(seg); } }
    const offPath = (x, y, pad) => { const l = segBins.get(Math.floor(x) * 1000 + Math.floor(y)); if (!l) return true; for (const [a, b, half] of l) if (segD(x * cw, y * ch, a, b) < half + pad) return false; return true; };
    const sq = [...L.routes.values()].find(rt => (rt.tier || rt.kind) === 'plaza' && rt.points && rt.points.some(p => inReg(p[0], p[1])));
    const sqA = sq ? sq.points[0] : null, sqB = sq ? sq.points[sq.points.length - 1] : null, sqR = sq ? (sq.widthCells || 4) / 2 : 0;
    const offSquare = (x, y, m) => { if (!sqA) return true; const dx = sqB[0] - sqA[0], dy = sqB[1] - sqA[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - sqA[0]) * dx + (y - sqA[1]) * dy) / l)) : 0, cx = sqA[0] + dx * t, cy = sqA[1] + dy * t; return ((x - cx) / (sqR + .5 + m)) ** 2 + ((y - cy) / (sqR + .3 + m * .7)) ** 2 > 1; };
    const gate = (L.D.gates || []).find(g => g.id === reg.gateId), offGate = (x, y) => !gate || Math.abs(x - gate.x - .5) > 3.4 || y < gate.y - 3.2 || y > gate.y + 2;
    const dry = (x, y, d) => [[0, 0], [d, 0], [-d, 0], [0, d * .9], [0, -d], [d * .7, d * .7], [-d * .7, d * .7]].every(([dx, dy]) => !['water', 'beach', 'sea', ''].includes(L.kind(x + dx, y + dy)));
    const plotNear = (x, y, dx, up, down) => { for (let yy = y - up; yy <= y + down + 1e-6; yy += .45) for (let xx = x - dx; xx <= x + dx + 1e-6; xx += .45) if (L.plot(xx, yy)) return true; return false; };

    /* 1. the terrace banks: where each line can run, cut into runs, each tapered at its ends */
    const bankOK = (x, y) => inReg(x, y) && ['grass', 'path'].includes(L.kind(x, y)) && dry(x, y, .9) && !plotNear(x, y, .3, .6, .35) && !statHit(x, y, .5) && offSquare(x, y, .1) && !inRise(x, y) && !onRidge(x, y) && !inRing(x, y, 1) && offGate(x, y) && !nearWall(x, y, 1.0);
    // A line bends round what it meets (a plot, a path running along it) by up to a cell and a half, the nearest way,
    // then is smoothed; where it still cannot pass, it ends.
    const banks = [], DY = [0, .35, -.35, .7, -.7, 1.05, -1.05];
    const shift = [0];
    for (let k = 1; k <= T.N; k++) {
      const xs = []; for (let x = T.x0; x <= T.x1 + .01; x += .25) xs.push(x);
      // first the whole line takes the shift (up to a cell and a half) that leaves it the longest clear length
      let bestC = 0, bestN = -1; for (let c = -1.5; c <= 1.51; c += .25) { let n = 0; for (let i = 0; i < xs.length; i += 2) if (bankOK(xs[i], line(k, xs[i]) + c)) n++; n -= Math.abs(c) * 2; if (n > bestN) { bestN = n; bestC = c; } }
      shift[k] = bestC;
      const dy = xs.map(x => { const y0 = line(k, x) + bestC; let best = null, bs = 9; for (const d of DY) { if (!bankOK(x, y0 + d)) continue; const sc = Math.abs(d) + (offPath(x, y0 + d, 4) ? 0 : 1.1); if (sc < bs) { bs = sc; best = d; } } return best; });
      const sm = dy.map((d, i) => { if (d == null) return null; let s = 0, n = 0; for (let j = Math.max(0, i - 6); j <= Math.min(dy.length - 1, i + 6); j++) if (dy[j] != null) { s += dy[j]; n++; } return s / n; });
      let run = null; const flush = () => { if (run && run.length >= 12) banks.push({ k, pts: run }); run = null; };
      xs.forEach((x, i) => { const y = sm[i] == null ? null : line(k, x) + bestC + sm[i]; if (y != null && bankOK(x, y)) (run || (run = [])).push({ cx: x, cy: y }); else flush(); });
      flush();
    }
    for (const b of banks) { const n = b.pts.length; b.pts.forEach((p, i) => { const q = L.cpt(p.cx, p.cy); p.x = q.x; p.y = q.y; p.t = smooth(Math.min(i, n - 1 - i) / 5) * (.8 + kit.noise(p.cx / 2.2, b.k * 3, 812) * .4); }); }
    // (a terrace is a step of the hill, so its bank stands up: 17 px read as a faint line on one flat lawn; 0.6 H now, with
    // a broader shade on the terrace below so each level reads)
    const FACE = Math.round(typeof gardenSizePx === 'function' ? gardenSizePx('hedge', 1) : 25), SHADE = 24, flowers = season === 'spring' ? ['#f0d24a', '#f8f4e8', '#f4c6d2'] : season === 'summer' ? ['#f8f4e8', '#c79ac0', '#f0d24a'] : season === 'autumn' ? ['#c79ac0', '#e8d8a0'] : [];
    for (const b of banks) {
      const bb = kit.bboxOf(b.pts, 40); bb[1] -= FACE + 12;
      add(bb, 900 + b.k * 31 + Math.round(b.pts[0].cx * 3), (B, r, cb) => {
        B.cx.clip(regP); B.cx.clip(coastP);
        for (const cut of groundClips) B.cx.clip(cut, 'evenodd');
        V.clipGround(B, L, cb, true);
        const winter = season === 'winter';
        // the bank's shade laid soft on the terrace below it
        soft(B, cb, S => { S.f(band(b.pts, 0, SHADE + 10), winter ? '#4a5048' : '#3a4a20', .4).f(band(b.pts, 0, SHADE * .5), winter ? '#4a5048' : '#2e3e18', .3);
          // and the lit lip of the terrace above, so each level reads as a step: light on top, the bank, shade below
          S.f(band(b.pts.map(p => ({ x: p.x, y: p.y - FACE * p.t, t: p.t })), 16, 0), winter ? '#f4f4ea' : '#f4ecb0', .2); });
        // the face, turned from the sun: deeper green at the foot, lit towards the lip; its upper edge wanders a little
        const face = new Path2D(); b.pts.forEach((p, i) => { const y = p.y - FACE * p.t * (.85 + kit.noise(p.cx * 1.7, b.k, 816) * .3); i ? face.lineTo(p.x, y) : face.moveTo(p.x, y); });
        for (let i = b.pts.length - 1; i >= 0; i--) face.lineTo(b.pts[i].x, b.pts[i].y + 1.5 * b.pts[i].t);
        face.closePath();
        const yMid = (bb[1] + bb[3]) / 2, g = B.cx.createLinearGradient(0, yMid - 40, 0, yMid + 40);
        g.addColorStop(0, winter ? 'rgba(220,224,206,.5)' : 'rgba(176,190,96,.55)'); g.addColorStop(1, winter ? 'rgba(120,126,104,.55)' : 'rgba(78,104,40,.6)');
        B.cx.save(); B.cx.clip(face);
        for (let i = 1; i < b.pts.length; i++) { const p = b.pts[i - 1], q = b.pts[i], fh = FACE * Math.max(p.t, q.t) + 2, lg = B.cx.createLinearGradient(0, p.y - fh, 0, p.y + 1.5);
          lg.addColorStop(0, winter ? 'rgba(232,234,220,.62)' : 'rgba(196,204,112,.6)'); lg.addColorStop(.45, winter ? 'rgba(160,166,146,.55)' : 'rgba(120,146,62,.58)'); lg.addColorStop(1, winter ? 'rgba(96,104,88,.6)' : 'rgba(62,86,34,.66)');
          B.cx.fillStyle = lg; B.cx.fillRect(p.x - .5, Math.min(p.y, q.y) - fh - 2, q.x - p.x + 1, fh + 6); }
        B.cx.restore();
        // the lit lip and the dark contact along the foot, both broken by noise so neither is a drawn line
        for (let i = 1; i < b.pts.length; i++) { const p = b.pts[i - 1], q = b.pts[i], n = kit.noise(p.cx * 1.3, b.k * 2, 817); if (Math.min(p.t, q.t) < .2) continue;
          const lift = t => FACE * t * (.85 + kit.noise(t === p.t ? p.cx * 1.7 : q.cx * 1.7, b.k, 816) * .3);
          if (n > .25) B.s(`M${p.x} ${p.y - lift(p.t) + .6}L${q.x} ${q.y - lift(q.t) + .6}`, winter ? '#f6f6ee' : '#f2ecb4', 1.6, .55 * Math.min(p.t, q.t));
          if (n < .8) B.s(`M${p.x} ${p.y + .8}L${q.x} ${q.y + .8}`, '#2c3818', 1.8, .32 * Math.min(p.t, q.t)); }
        // the dry-stone face that holds the terrace up, where the bank stands highest: courses of honey limestone laid in
        // bond, a turf cope over it and a dark seam at its foot, broken where a path climbs (19 Nov 2026: the terraces read as
        // one lawn crossed by strips of loose stones, with no wall faces and no change of level)
        { let run = []; const runs = []; for (const p of b.pts) { if (p.t > .3 && offPath(p.cx, p.cy, 4)) run.push(p); else { if (run.length > 3) runs.push(run); run = []; } } if (run.length > 3) runs.push(run);
          for (const rn of runs) {
            const top = rn.map(p => ({ x: p.x, y: p.y - FACE * p.t * .78 })), bot = rn.map(p => ({ x: p.x, y: p.y + 1 })), poly = B.poly(top.concat(bot.slice().reverse()));
            B.f(poly, winter ? '#8e887a' : '#8c7c5c', .96);
            B.cx.save(); B.cx.clip(new Path2D(poly));
            const x0 = rn[0].x - 4, x1 = rn[rn.length - 1].x + 4, yTop = Math.min(...top.map(q => q.y)), yBot = Math.max(...bot.map(q => q.y));
            for (let y = yBot - .5, row = 0; y > yTop - 2; y -= 4.3, row++) for (let x = x0 - (row & 1) * 3.5; x < x1; ) { const w = 3.6 + r() * 6.4, tone = r(), sh = 2.8 + r() * 1.4, dy = (r() - .5) * .9; B.f(B.rr(x, y - sh - .2 + dy, w - .9, sh, 1.2), tone < .35 ? FOOT.rock : tone < .7 ? FOOT.rockLo : FOOT.rockHi).f(B.rr(x + .4, y - sh - .2 + dy, w * .6, 1, .5), '#efe4c4', .45);   /* (each stone its own length and depth, rounded by weather: laid even they read as brick) */ if (!winter && r() < .06) B.f(B.ell(x + w / 2, y - 3, w * .4, 1.3), '#8a9a4e', .7); x += w; }
            B.f(poly, B.lin(0, yTop, 0, yBot, [[0, 'rgba(255,244,210,.12)'], [1, 'rgba(40,34,20,.22)']]));
            B.cx.restore();
            B.s(B.line(bot), '#2c2818', 1.8, .4);
            B.s(B.line(top.map(q => ({ x: q.x, y: q.y + .6 }))), winter ? '#f4f4ee' : P.lawnLo || '#5a7a3a', 2.6, .85).s(B.line(top.map(q => ({ x: q.x, y: q.y - .6 }))), winter ? '#ffffff' : '#b4c070', 1.3, .75);
          } }
        // the face's grass, longer than the mown terrace and leaning down the slope; flowers in drifts
        for (let i = 0; i < b.pts.length; i++) {
          const p = b.pts[i]; if (p.t < .15) continue;
          if (p.x < cb[0] - 20 || p.x > cb[2] + 20) continue;
          const fh = FACE * p.t;
          B.tufts(r, p.x + (r() - .5) * 10, p.y - fh * (.2 + r() * .6), 12, 3, winter ? ['#8a8a70', '#a8a48a'] : [P.lawnLo, '#7c8a44', '#9aa858'], 7 + r() * 4);
          if (r() < .55) B.tufts(r, p.x + (r() - .5) * 10, p.y - fh - 1, 10, 3, winter ? ['#a8a890'] : ['#a8b468', P.lawnHi || '#c4cc7a'], 5);
          const drift = kit.noise(p.cx / 2.6, b.k * 5.1, 813);
          if (flowers.length && drift > .56 && r() < .7) for (let f = 0; f < 3; f++) B.f(B.circ(p.x + (r() - .5) * 12, p.y - fh * (.25 + r() * .6), 1.3 + r() * .5), flowers[Math.floor(r() * flowers.length)], .92);
        }
      });
    }
    // A route the layout calls "steps" is a long trail round the pond, not one flight: painted as steps along its whole
    // length it read as a picket fence laid on the grass (art director, 19 Nov 2026). It is laid again here as the kit's
    // gravel, a little wider than the planks so none shows at its edge; it gets real steps where it climbs a bank, below.
    { const G = window.GardenPaintGround;
      if (G && G.paths && G.routeKind) for (const rt of L.D.routes || []) { if (!rt.points || rt.points.length < 2 || G.routeKind(rt) !== 'steps' || !rt.points.some(p => inReg(p[0], p[1]) || inReg(p[0] + 1, p[1]) || inReg(p[0], p[1] + 1))) continue;
        const pts = gardenIslandRoutePath(rt).points.map(p => L.cpt(p.x, p.y)), bb = kit.bboxOf(pts, 50);
        for (const o of G.paths({ routes: [{ id: rt.id + '-laid', kind: 'gravel', width: (G.ROUTE_WIDTH.steps || 24) + 8, points: pts }], season, kindAt: () => 'meadow', box: { x: bb[0], y: bb[1], w: bb[2] - bb[0], h: bb[3] - bb[1] } })) add(o.bb || bb, 925, (B, r, cb) => { B.cx.save(); o.draw(B, r, cb); B.cx.restore(); B.cx.globalAlpha = 1; });
      } }
    // worn steps where a path climbs a bank: two treads across the path's painted width, cheek stones at their ends
    const steps = [];
    for (const b of banks) for (const rb2 of ribbons) for (let i = 1; i < rb2.pts.length; i++) {
      const a = rb2.pts[i - 1], c = rb2.pts[i];
      for (let j = 1; j < b.pts.length; j++) {
        const p = b.pts[j - 1], q = b.pts[j], d1x = c.x - a.x, d1y = c.y - a.y, d2x = q.cx - p.cx, d2y = q.cy - p.cy, den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-9) continue;
        const s = ((p.cx - a.x) * d2y - (p.cy - a.y) * d2x) / den, u = ((p.cx - a.x) * d1y - (p.cy - a.y) * d1x) / den;
        if (s < 0 || s > 1 || u < 0 || u > 1 || Math.min(p.t, q.t) < .35) continue;
        const X = (a.x + d1x * s) * cw, Y = W.sky + (a.y + d1y * s) * ch, len = Math.hypot(d1x * cw, d1y * ch) || 1, ux = d1x * cw / len, uy = d1y * ch / len, up = uy > 0 ? -1 : 1;
        const bl = Math.hypot(d2x * cw, d2y * ch) || 1; if (Math.abs(ux * d2x * cw / bl + uy * d2y * ch / bl) > .45) continue;   // (a path meeting a bank at a slant climbs it as a ramp: steps across a slant read as a rail)
        steps.push({ x: X, y: Y, ux: ux * up, uy: uy * up, half: rb2.painted * .85, t: (p.t + q.t) / 2 });   // (as wide as the path is painted: wider, they read as rails laid across it)
      }
    }
    if (steps.length) add(kit.bboxOf(steps, 50), 931, (B, r) => {
      B.cx.clip(regP);
      for (const s of steps) {
        const nx = -s.uy, ny = s.ux;
        for (let j = 0; j < 2; j++) {
          const cx = s.x + s.ux * (j * 8 - 1), cy = s.y + s.uy * (j * 8 - 1) - FACE * s.t * .4 * j, ex = nx * s.half, ey = ny * s.half;
          // a step of laid stone: its riser in shade (the sun is behind the climb), its tread lit, a soft shadow at its foot,
          // the tread worn paler in the middle where feet go; cheek stones where the bank meets it
          B.s(`M${cx - ex} ${cy - ey + 2.6}L${cx + ex} ${cy + ey + 2.6}`, '#2e2818', 4, .18);
          B.s(`M${cx - ex} ${cy - ey}L${cx + ex} ${cy + ey}`, '#7a6a4a', 4.6, .85).s(`M${cx - ex} ${cy - ey - 3.4}L${cx + ex} ${cy + ey - 3.4}`, '#cdbf98', 3.4, .9);
          B.s(`M${cx - ex * .45} ${cy - ey * .45 - 3.6}L${cx + ex * .45} ${cy + ey * .45 - 3.6}`, '#ece2c4', 2, .7);
          for (let q = -1; q <= 1; q += .5) B.s(`M${cx + ex * q - .6} ${cy + ey * q - 5}l0 7`, '#5e5038', .8, .35);
          for (const sd of [-1, 1]) B.stone(r, cx + nx * (s.half + 3) * sd, cy + ny * (s.half + 3) * sd - 2, 3.4 + r() * 1.6, 2.6 + r() * .8, LIME, j ? null : '#8a9a4e');
        }
      }
    });

    /* 2. the terraces' grass: a mown strip along each row, longer grass towards the bank, flowers by place */
    add(rb, 91, (B, r, cb) => {
      B.cx.clip(regP); B.cx.clip(coastP);
      for (const cut of groundClips) B.cx.clip(cut, 'evenodd');
      V.clipGround(B, L, cb, true);
      // (no flat fill: the terraces' meadow is the shared ground kit's, with its light, shade and drifts; this adds the mowing)
      V.lawn(B, r, L, P, cb, (x, y) => grass(x, y), null, { salt: 91, noBase: !!window.GardenPaintGround, base: kit.mix(P.lawn, '#b8c47a', season === 'winter' ? 0 : .12) });
      const x0 = Math.max(T.x0, cb[0] / cw - 2), x1 = Math.min(T.x1, cb[2] / cw + 2);
      if (x1 > x0) soft(B, cb, S => {
        for (let k = 0; k < T.N; k++) {
          const pts = []; for (let x = x0; x <= x1 + .01; x += .5) { const q = L.cpt(x, line(k, x) - 1.25); pts.push({ x: q.x, y: q.y, t: 1 }); }
          const pk = kit.bboxOf(pts, 60); if (pk[3] < cb[1] - 80 || pk[1] > cb[3] + 80) continue;
          S.f(band(pts, ch * .75, ch * .55), season === 'winter' ? '#d8dcc8' : '#e2e49a', .15);   // the mown strip the row stands in
          S.f(band(pts.map(p => ({ x: p.x, y: p.y + ch * .95, t: 1 })), ch * .3, ch * .35), season === 'winter' ? '#b8bca4' : '#c8b86a', .11);   // longer, warmer grass towards the bank below
        }
      });
      kit.tiles(cb, 100, 20, 92, (tx, ty, rr) => { for (let k = 0; k < 8; k++) { const x = tx + rr() * 100, y = ty + rr() * 100, cx = x / cw, cy = (y - W.sky) / ch; if (!grass(Math.floor(cx), Math.floor(cy))) continue;
        const drift = kit.noise(cx / 3.2, cy / 2.4, 815);
        if (onTop(cx, cy)) { if (drift > .42) B.heather(rr, x, y, 6 + rr() * 6, { heather: '#8d6a92', heatherLo: '#5f4a62', heatherHi: '#b07ab8' }, season === 'summer' ? '#c79ac0' : null); else if (rr() < .4) B.tufts(rr, x, y, 10, 4, ['#9a9a52', '#b8b070'], 6); continue; }
        if (inRise(cx, cy)) { if ((season === 'spring' || season === 'summer') && drift > .38) for (let f = 0; f < 4; f++) B.f(B.circ(x + (rr() - .5) * 14, y + (rr() - .5) * 6, 1.4 + rr() * .5), f % 3 ? '#f0d24a' : '#f8f4e8', .95); B.tufts(rr, x, y, 10, 4, [P.lawnLo, '#9a9a52'], 7); continue; }
        if (rr() < .3) B.tufts(rr, x, y, 10, 4, [P.lawnLo, P.lawnHi], 6); } });
    }, {});

    // 2b. The orchard pond's margin: a worn earth bank with sedge and a few stones, so the grass meets the water at a
    // shore (as the Mere's does) and not at a bare glassy lip. Drawn under the water's own shallows.
    for (const pool of (L.D.freshwater || []).filter(w => w.boundary && w.boundary.length > 2 && inReg(w.boundary.reduce((s, p) => s + p[0], 0) / w.boundary.length, w.boundary.reduce((s, p) => s + p[1], 0) / w.boundary.length))) {
      const pts = pool.boundary.map(L.pt), loop = V.loopPath([pts]), bb = kit.bboxOf(pts, 40);
      add(bb, 97, (B, r) => {
        B.s(loop, season === 'winter' ? '#8e8a74' : '#8a7a52', 26, .5).s(loop, '#6e6040', 12, .55).s(loop, '#5a5238', 4, .45);
        for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; for (let t = 0; t < 1; t += .34) { const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, d = Math.hypot(x - cx, (y - cy) * 1.6) || 1, ox = (x - cx) / d, oy = (y - cy) * 1.6 / d;
          if (r() < .32) B.stone(r, x + ox * 9, y + oy * 5, 3 + r() * 3, 2 + r() * 1.4, { rock: '#b4aa94', rockLo: '#8c8270', rockHi: '#d8cfb8', rockDk: '#4e483e' }, null);
          if (season !== 'winter' && r() < .7) B.tufts(r, x + ox * (14 + r() * 8), y + oy * (8 + r() * 5), 12, 6, ['#9a9a52', '#7c8a44', season === 'autumn' ? '#b8a05a' : '#a8b468'], 9); } }
      });
    }

    /* 3. the trees: the ring and the Mother tree first, then one planted row along each terrace */
    const trees = [], F = sp => (window.GardenPaintTrees && GardenPaintTrees.form ? GardenPaintTrees.form(sp) : { rx: .42, cy: .55, ry: .3 });
    const crownClear = (x, y, sp, h) => {
      const f = F(sp), rx = h * f.rx / cw * .85, up = h * (f.cy + f.ry * .8) / ch;
      for (const fy of [.15, .45, .75, 1]) for (const fx of [-1, -.5, 0, .5, 1]) { const px = x + fx * rx * (fy < .3 ? .4 : 1), py = y - fy * up; if (L.plot(px, py) || statHit(px, py, .15)) return false; }
      return true;
    };
    const spaced = (x, y, sp, h) => { const rx = h * F(sp).rx / cw; return trees.every(t => { const w = rx + t.h * F(t.kind).rx / cw; return ((t.x - x) / (w * .92 + .2)) ** 2 + ((t.y - y) / 1.25) ** 2 >= 1; }); };
    const trunkOK = (x, y) => inReg(x, y) && grass(Math.floor(x), Math.floor(y)) && L.free(x, y) && !L.plot(x, y) && !L.plot(x, y + .4) && offPath(x, y, 7) && offSquare(x, y, .9) && offGate(x, y) && dry(x, y, 1) && !nearWall(x, y, .85);
    // the ring of eight old perry pears round the mown centre (mature trees: 3.5 to 5 times the player)
    if (ringC) {
      const c = L.cpt(ringC.x, ringC.y);
      add([c.x - 170, c.y - 80, c.x + 170, c.y + 80], 99, (B, r) => { B.f(B.blob(r, c.x, c.y, 150, 58, 14, .12), season === 'winter' ? '#c4cab8' : '#b8c47a', .45); B.s(B.blob(r, c.x, c.y, 150, 58, 14, .12), P.lawnLo, 5, .25); for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 150 + r() * 16; B.tufts(r, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * .4, 8, 4, [P.lawnLo, '#9a9a52'], 8); } });
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, x = ringC.x + Math.cos(a) * 3.1, y = ringC.y + Math.sin(a) * 1.9; const h = Math.round(size('tree', .5 + (i * 3 % 8) / 8 * .5)); /* (huge old perry pears, the tallest of the orchard: at .15 to .55 they were no bigger than the rows) */ if (inReg(x, y) && L.kind(x, y) !== 'path' && !L.plot(x, y) && !L.plot(x, y + .4) && offPath(x, y, 4) && offSquare(x, y, 0) && crownClear(x, y, 'pear', h * .8)) trees.push({ x, y, kind: 'pear', h, v: i % 3, old: true }); }
    }
    // the Mother tree: the oldest apple, at the far end of the orchard rows, leaning on her crutch
    const rowsRt = [...L.routes.values()].find(rt => /orchard-rows|rows/.test(rt.id) && rt.points && rt.points.length > 1 && inReg(rt.points[rt.points.length - 1][0], rt.points[rt.points.length - 1][1]));
    let mother = null;
    if (rowsRt) { const e = rowsRt.points[rowsRt.points.length - 1], h = Math.round(size('tree', .25));
      for (let d = .8; d < 3.2 && !mother; d += .4) for (let a = 0; a < 12 && !mother; a++) { const x = e[0] + Math.cos(a / 12 * Math.PI * 2) * d, y = e[1] + Math.sin(a / 12 * Math.PI * 2) * d * .7; if (trunkOK(x, y) && spaced(x, y, 'apple', h)) mother = { x, y, h }; } }
    if (mother) trees.push({ x: mother.x, y: mother.y, kind: 'apple', h: mother.h, v: 2, old: true, mother: true });
    // one row along each terrace, a little up from the bank that holds it, in that terrace's fruit
    const rowKind = k => { const y = line(k, (T.x0 + T.x1) / 2) - 1.25; let best = null, bd = 2.4; for (const s of sections) { const f = FRUIT.find(([w]) => s.id.includes(w)); if (!f) continue; const d = Math.abs(s.c.y - (line(k, s.c.x) - 1.6)); if (d < bd) { bd = d; best = f[1]; } } return best || TURN[k % TURN.length]; };
    const rej = {};
    // (two staggered rows on each terrace, the classic quincunx; a tree may stand a little off its row's line to clear a
    // plot or a path, never more than half a cell)
    for (let k = 0; k < T.N; k++) for (const [row, off, x00] of [[0, 1.15, 0], [1, 2.75, 1.05]]) {
      const kind = row && k % 2 ? TURN[(k + 3) % TURN.length] : rowKind(k), rowAge = (kit.hash(k, row, 932) % 100) / 100;
      for (let x = T.x0 + .6 + x00, i = 0; x < T.x1; i++) {
        const hs = kit.hash(Math.round(x * 10), k * 2 + row, 931), step = 1.9 + (hs % 100) / 100 * .3;
        const jx = x + ((hs >> 8) % 100) / 100 * .3 - .15; x += step;
        if (hs % 13 === 0) continue;   // now and then a tree is missing from its row: an old gap, not a stamp
        const h = Math.round(size('young', Math.max(0, Math.min(1, rowAge + (((hs >> 4) % 100) / 100 - .5) * .3)))), v = (hs >> 12) % 3;   // (a row was planted together: one age, a little give)
        const base = line(k, jx) + (shift[k] || 0), deep = base - (k + 1 <= T.N ? line(k + 1, jx) + (shift[k + 1] || 0) : base - 4); if (row && deep < 3.5) continue; const at = row ? deep * .66 : Math.min(off, deep * .3); let jy = null; for (const d of [0, -.25, .25, -.5, .5]) { const y = base - at + d; if (onTop(jx, y) || inRise(jx, y) || onRidge(jx, y) || inRing(jx, y, .8)) continue; if (trunkOK(jx, y) && crownClear(jx, y, kind, h) && spaced(jx, y, kind, h)) { jy = y; break; } }
        if (jy == null) { const y = base - at; if (onTop(jx, y) || inRise(jx, y) || onRidge(jx, y) || inRing(jx, y, .8)) continue; jy = y; }
        const why = !inReg(jx, jy) ? 'reg' : !grass(Math.floor(jx), Math.floor(jy)) ? 'grass' : !L.free(jx, jy) ? 'stat' : L.plot(jx, jy) || L.plot(jx, jy + .4) ? 'plot' : !offPath(jx, jy, 7) ? 'path' : !offSquare(jx, jy, .9) ? 'sq' : !offGate(jx, jy) ? 'gate' : !dry(jx, jy, 1) ? 'wet' : nearWall(jx, jy, 1.3) ? 'wall' : !crownClear(jx, jy, kind, h) ? 'crown' : !spaced(jx, jy, kind, h) ? 'space' : '';
        if (why) { rej[k + why] = (rej[k + why] || 0) + 1; continue; }
        trees.push({ x: jx, y: jy, kind, h, v });
      }
    }
    // their trunks are solid where they stand (the leaves are for walking behind): GardenPaintVale.orchardTrunks(), 94-garden-world-0walk.js
    trunks = trees.map(t => [+t.x.toFixed(2), +t.y.toFixed(2), t.old ? .45 : .32]);
    const kinds = GardenPaintWood.orchardKinds || ['apple'];
    for (const t of trees) { const p = L.cpt(t.x, t.y);
      thing({ y: p.y, make: scene => { const im = GardenPaintWood.orchardTree(scene, { kind: kinds.includes(t.kind) ? t.kind : 'apple', season, h: t.h, x: p.x, y: p.y, v: t.v, flip: (Math.round(t.x * 7) % 2) === 1 }); if (im && t.mother) im.setAngle(-8); return im; } }); }
    // (she leans west, so the crutch props her west side)
    if (mother) { const mt = L.cpt(mother.x, mother.y); thing({ key: 'crutch', x: mt.x - 34, y: mt.y + 2, box: [-10, -92, 40, 6], draw: B => { B.s('M0 0L26 -76', '#6a5034', 4.4).s('M33 -74L18 -81', '#6a5034', 4.4).s('M0 0L26 -76', '#9a7a54', 1.4, .7); } }); }
    // hives: a short row of white hives on the warm side of the flower rise, where the bees have the most to work
    const hives = [];
    if (rise) for (let d = 1.6; d < 4.6 && hives.length < 3; d += .5) for (let a = -2.6; a <= -.5 && hives.length < 3; a += .35) {
      const x = rise.x + Math.cos(a) * d * 1.2, y = rise.y + Math.sin(a) * d * .8;
      if (!trunkOK(x, y) || L.plot(x, y - .6) || statHit(x, y - .6, .1) || hives.some(h => Math.hypot(h.x - x, (h.y - y) * 1.6) < 1.05) || trees.some(t => Math.hypot(t.x - x, (t.y - y) * 1.6) < 1.2)) continue;
      hives.push({ x, y });
    }
    hives.forEach((h, i) => { const p = L.cpt(h.x, h.y); thing({ key: 'hive-' + (i % 3) + '|' + season, x: p.x, y: p.y, box: [-18, -44, 20, 6], draw: drawHive(i, season), foot: [-12, 12, 8] }); });
    // Gentle motion (a few sprites on the scene's own update, nothing baked): cloud shadows drifting over the highlands on
    // the wind by day, and bees working round each hive in the warm months.
    motion(C, thing, hives.map(h => L.cpt(h.x, h.y)), (L.D.regions || []).filter(r => r.id === reg.id || r.theme === 'mountain'));
    // windfalls under the trees in autumn
    if (season === 'autumn' && trees.length) add(kit.bboxOf(trees.map(t => L.cpt(t.x, t.y)), 40), 98, (B, r) => { for (const t of trees) { const p = L.cpt(t.x, t.y); for (let k = 0; k < 5; k++) B.f(B.circ(p.x + (r() - .5) * 40, p.y + (r() - .3) * 10, 2.2), r() < .6 ? '#c8442e' : '#e0b23a', .9); } });
    info = { ms: Math.round(performance.now() - t0), terraces: T.N, step: +T.S.toFixed(2), banks: banks.map(b => [b.k, +b.pts[0].cx.toFixed(1), +b.pts[b.pts.length - 1].cx.toFixed(1)]), steps: steps.length, trees: trees.length, hives: hives.length, rows: trees.filter(t => !t.old).length, mother: mother ? [+mother.x.toFixed(1), +mother.y.toFixed(1)] : null, rej };
  }

  function motion(C, thing, hives, regs) {
    const { L, kit, season, tod } = C, W = L.W, night = tod === 'night';
    const onUpdate = (scene, im, fn) => { const f = (time) => { if (!im.active) return; fn(time); }; scene.events.on('update', f); im.once('destroy', () => scene.events.off('update', f)); };
    // cloud shadows: a few big soft lobed shadows, darker by day than at dusk, none at night (no sun to throw them)
    if (!night && regs.length) {
      const pts = regs.flatMap(r => (r.polygons || []).flat()), y0 = W.sky + Math.max(0, Math.min(...pts.map(p => p[1]))) * L.ch - 200, y1 = W.sky + Math.min(W.rows, Math.max(...pts.map(p => p[1]))) * L.ch;
      const x0 = -500, span = W.cols * L.cw + 1000, a = tod === 'dusk' ? .15 : .26;
      for (let i = 0; i < 4; i++) {
        const r = kit.rng(kit.hash(i * 31 + 7, 4400, 11)), sc = 5.5 + r() * 3.5, vx = 6 + r() * 4, vy = .8 + r() * .8, off = r() * span, yb = y0 + r() * (y1 - y0);
        thing({ y: -9330, make: scene => {
          const key = 'gpv-cloud-' + (i % 2);
          if (!scene.textures.exists(key)) { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), rr = kit.rng(91 + i % 2);
            for (let k = 0; k < 7; k++) { const cx = 50 + rr() * 156, cy = 40 + rr() * 48, R = 28 + rr() * 34, g = x.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, 'rgba(26,38,44,.55)'); g.addColorStop(.6, 'rgba(26,38,44,.3)'); g.addColorStop(1, 'rgba(26,38,44,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, R * 1.3, R * .8, 0, 0, Math.PI * 2); x.fill(); }
            scene.textures.addCanvas(key, c); }
          // (made small, then grown on its first frame: a tall image would be taken for a tree and faded as you walk under it)
          const im = scene.add.image(0, 0, key).setScale(.2).setAlpha(a); let grown = false;
          onUpdate(scene, im, time => { if (!grown) { im.setScale(sc, sc * .62); grown = true; } const t = time / 1000; im.x = x0 + ((t * vx + off) % span); im.y = yb + Math.sin(t * .01 + i) * 60 + ((t * vy) % 240) - 120; });
          return im; } });
      }
    }
    // bees: five round each hive's door, spring and summer by day
    if (!night && tod !== 'dusk' && (season === 'spring' || season === 'summer')) hives.forEach((h, j) => {
      for (let b = 0; b < 5; b++) {
        const r = kit.rng(5100 + j * 13 + b), w = 1.6 + r() * 1.4, rx = 16 + r() * 14, ry = 7 + r() * 7, ph = r() * 6.28, sp = 1.1 + r() * 1.2;
        thing({ y: h.y + 3, make: scene => {
          const key = 'gpv-bee';
          if (!scene.textures.exists(key)) { const c = document.createElement('canvas'); c.width = 12; c.height = 8; const x = c.getContext('2d'); x.fillStyle = 'rgba(244,240,224,.85)'; x.beginPath(); x.ellipse(5, 2.6, 2.6, 1.6, -.4, 0, Math.PI * 2); x.fill(); x.fillStyle = '#3a2c18'; x.beginPath(); x.ellipse(6, 5, 3, 2, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#d8a83a'; x.fillRect(5.4, 3.4, 1.2, 3.2); scene.textures.addCanvas(key, c); }
          const im = scene.add.image(h.x, h.y - 24, key).setScale(.42);
          onUpdate(scene, im, time => { const t = time / 1000 * sp + ph; im.x = h.x + Math.cos(t) * rx + Math.sin(t * 2.3) * 3; im.y = h.y - 22 - w * 4 + Math.sin(t * 1.4) * ry; });
          return im; } });
      }
    });
  }

  // A white hive of stacked lifts (as old orchards keep them): legs, a landing board, three lifts each a little proud of
  // the one below, a gabled roof; lit on the left, in shade on the right; bees at the door in the warm months.
  function drawHive(i, season) {
    return B => {
      const W0 = '#f2eee2', W1 = '#d8d2c2', W2 = '#aea694', LEG = '#5a4a34', lift = [[-11, -8, 22, 7], [-12, -15.5, 24, 7.5], [-11, -23, 22, 7.5]];
      for (const x of [-9, 7]) B.f(B.rect(x, -5, 2.4, 5), LEG);
      B.f(B.rect(-13, -7, 26, 2.6), '#8a6e4a').f(B.rect(-6, -5.2, 12, 1.6), '#6e5638');
      lift.forEach(([x, y, w, h], k) => { B.f(B.rect(x, y, w, h), k === 1 ? W1 : W0).f(B.rect(x + w * .62, y, w * .38, h), W2, .7).f(B.rect(x, y, w, 1), '#ffffff', .55).f(B.rect(x - .5, y + h - 1, w + 1, 1.2), '#7d7462', .45); });
      B.f(B.rect(-4, -9, 8, 1.6), '#2e281e');
      B.f('M-14 -22.5L0 -31L14 -22.5Z', '#c9c3b2').f('M0 -31L14 -22.5L0 -22.5Z', '#97907e').f('M-14 -22.5L0 -31L1 -30', '#f6f4ec', .7).f(B.rect(-14.5, -23, 29, 1.6), '#7d7462', .6);
      if (season !== 'winter') for (const [x, y] of [[-6, -12 - i], [8, -27], [12 + i, -16], [-15, -30 + i]]) B.f(B.ell(x, y, 1.2, .8), '#3a2c18').f(B.ell(x - .3, y - .8, .9, .45), '#f4f0e0', .8);
      else B.f('M-14 -22.5L0 -31L14 -22.5L13 -24L0 -30L-13 -24Z', '#ffffff', .85);
    };
  }

  // The orchard's trunks as [x, y, width] in cells, while the painted vale is what is shown (null otherwise).
  let trunks = null, info = null;
  // The painted orchard plants its own rows, so the world leaves out its generic grove stands there (94-garden-native-world.js).
  V.ownsRegion = id => id === 'orchard-headland' && V.wanted();
  V.orchardTrunks = () => (V.wanted() && trunks) || null;
  V.orchardStatus = () => info;
  V.parts.push({ id: 'orchard', compose });
})();

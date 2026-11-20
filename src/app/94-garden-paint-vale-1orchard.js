/* Painted vale: the High orchard dressed (C:/tmp/regions/orchard.md): the
 * terraces' grass in mown strips under rows of apple, pear, plum and cherry
 * (GardenPaintWood.orchardTree), the ring of eight old perry pears, the Mother
 * tree propped on her crutch, windfalls in autumn, thyme and heather on the top
 * terrace and cowslips on the rise. Trees keep off paths, plots the player can
 * buy, statics and the terrace walls. See 94-garden-paint-vale-0kit.js. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const ROWS = ['apple', 'pear', 'plum', 'cherry', 'apple', 'plum', 'pear', 'apple'];

  function compose(C) {
    const { L, P, kit, add, thing, season } = C, cw = L.cw, ch = L.ch, W = L.W;
    const STONE = { rock: '#b4aa94', rockLo: '#8c8270', rockHi: '#d8cfb8', rockDk: '#4e483e', lichen: '#d8c86a' };
    const reg = (L.D.regions || []).find(r => r.id === 'orchard-headland'); if (!reg || !window.GardenPaintWood || !GardenPaintWood.orchardTree) return;
    const loops = (reg.polygons || []).map(l => l.map(L.pt)), regP = V.loopPath(loops), coastP = V.loopPath(L.coast), rb = kit.bboxOf(loops.flat(), 20);
    const wallRows = (L.D.landforms || []).filter(f => f.kind === 'terrace-wall' && f.polygon), walls = wallRows.map(f => f.polygon);
    const nearWall = (x, y, d) => walls.some(poly => poly.some(p => Math.abs(p[0] - x) < d && Math.abs(p[1] - y) < d * .8));
    // This lawn sits above the fells layer. Its cell-sized lobes must not
    // overpaint the shared water contours or the terrace masonry below it.
    const groundCuts = (L.D.freshwater || []).filter(f => f.boundary).map(f => f.boundary.map(L.pt));
    for (const f of wallRows) {
      const poly = f.polygon, n = poly.length >> 1, a = poly.slice(0, n), b = poly.slice(n).reverse();
      const north = a.reduce((s, p) => s + p[1], 0) <= b.reduce((s, p) => s + p[1], 0);
      const upper = (north ? a : b).map(L.pt), lower = (north ? b : a).map(L.pt), lift = f.thin ? 26 : 0;   // (a thin wall's face stands 26 px above its line: 94-garden-paint-terrain-1fells.js THIN_LIFT)
      // terraceOps draws upright coping up to six pixels above the upper rim.
      groundCuts.push(upper.map((p, i, A) => ({ x: p.x, y: p.y - 7 - lift * Math.min(1, i / 3, (A.length - 1 - i) / 3) })).concat(lower.slice().reverse()));
    }
    // (fix round 2) where one path runs into another, the corners are worn round: a disc of the path's own ground left bare
    // round the meeting point (two straight ribbons butted together met in ruled right angles, a flat cross of sand)
    { const RT = [...L.routes.values()].filter(rt => rt.zone === 4 && rt.tier !== 'plaza' && rt.points && rt.points.length > 1).map(rt => ({ rt, pts: gardenIslandRoutePath(rt).points, w: rt.widthCells || 2 }));
      const dSeg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0; return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
      for (const A of RT) for (const e of [A.pts[0], A.pts[A.pts.length - 1]]) for (const O of RT) { if (O === A) continue; let d = 9; for (let i = 1; i < O.pts.length; i++) d = Math.min(d, dSeg(e, O.pts[i - 1], O.pts[i]));
        const wo = typeof gardenIslandRouteWidthAt === 'function' ? gardenIslandRouteWidthAt(O.rt, e.x, e.y) : O.w, wa = typeof gardenIslandRouteWidthAt === 'function' ? gardenIslandRouteWidthAt(A.rt, e.x, e.y) : A.w;
        if (d > wo * .5) continue; const R = Math.min(wa, wo) * .5 + .5, c = L.cpt(e.x, e.y);
        groundCuts.push(Array.from({ length: 20 }, (_, k) => ({ x: c.x + Math.cos(k / 20 * Math.PI * 2) * R * cw, y: c.y + Math.sin(k / 20 * Math.PI * 2) * R * ch }))); } }
    const groundClips = groundCuts.map(poly => {
      const cut = new Path2D(); cut.rect(rb[0], rb[1], rb[2] - rb[0], rb[3] - rb[1]);
      cut.addPath(V.loopPath([poly])); return cut;
    });
    const inReg = (x, y) => { const b = L.base(x, y); return !!(b && b.region === 'orchard-headland'); };
    const grass = (x, y) => inReg(x, y) && L.kind(x + .5, y + .5) === 'grass';

    // 1. The terraces' grass: mown strips that follow the terraces, long grass at the edges, flowers by place
    add(rb, 91, (B, r, cb) => {
      B.cx.clip(regP); B.cx.clip(coastP);
      for (const cut of groundClips) B.cx.clip(cut, 'evenodd');
      V.clipGround(B, L, cb, true);
      V.lawn(B, r, L, P, cb, (x, y) => grass(x, y), null, { salt: 91, base: kit.mix(P.lawn, '#b8c47a', season === 'winter' ? 0 : .12) });
      // Quiet continuous mowing bands stop at the same paths and shore as the
      // meadow. Cell-shaped scallops made the terrace read as loose patches.
      for (let y = Math.floor((cb[1] - W.sky) / (ch * 4)) * ch * 4 + W.sky; y < cb[3]; y += ch * 4) {
        const col = season === 'winter' ? '#c4cab8' : '#c2cc84', g = B.lin(0, y, 0, y + ch * 2, [[0, kit.rgba(col, 0)], [.2, kit.rgba(col, .07)], [.8, kit.rgba(col, .07)], [1, kit.rgba(col, 0)]]);
        B.f(B.rect(cb[0], y, cb[2] - cb[0], ch * 2), g);
      }
      kit.tiles(cb, 100, 20, 92, (tx, ty, rr) => { for (let k = 0; k < 8; k++) { const x = tx + rr() * 100, y = ty + rr() * 100, cx = x / cw, cy = (y - W.sky) / ch; if (!grass(Math.floor(cx), Math.floor(cy))) continue;
        if (cy < 25 && cx > 69 && cx < 79) { B.heather(rr, x, y, 7 + rr() * 5, { heather: '#8d6a92', heatherLo: '#5f4a62', heatherHi: '#b07ab8' }, season === 'summer' ? '#c79ac0' : null); continue; }
        if (cx > 81.5 && cy > 33.5 && cy < 39.5) { if (season === 'spring' || season === 'summer') for (let f = 0; f < 5; f++) B.f(B.circ(x + (rr() - .5) * 14, y + (rr() - .5) * 6, 1.6), f % 3 ? '#f0d24a' : '#f8f4e8', .95); B.tufts(rr, x, y, 10, 4, [P.lawnLo, '#9a9a52'], 7); continue; }
        // (fix round 2) the ridge round the folly is downland, not bare lawn: cushions of thyme, gorse, harebells, a grey stone
        if (cy < 29.6 && cx > 71.5) { const t = rr();
          if (t < .16) { B.f(B.ell(x + 3, y + 2, 9, 2.6), '#22301a', .18); for (let k = 0; k < 5; k++) B.f(B.blob(rr, x - 6 + k * 3, y - 3 - rr() * 5, 5 + rr() * 2, 4 + rr() * 2, 6, .5), k < 2 ? '#3e5a2a' : '#56743a', .95); if (season === 'spring' || season === 'summer') for (let k = 0; k < 8; k++) B.f(B.circ(x - 8 + rr() * 16, y - 9 + rr() * 8, 1.2), '#f0c830', .95); continue; }
          if (t < .4) { B.f(B.blob(rr, x, y, 7 + rr() * 4, 3, 7, .4), '#7a8a52', .9); if (season === 'summer') for (let k = 0; k < 6; k++) B.f(B.circ(x - 6 + rr() * 12, y - 1 - rr() * 2, 1), '#b88ac0', .95); continue; }
          if (t < .47) { B.stone(rr, x, y, 4 + rr() * 3, 2.4 + rr() * 1.4, STONE, null); continue; }
          if (t < .6 && season === 'summer') { for (let k = 0; k < 3; k++) B.f(B.circ(x + (rr() - .5) * 10, y - 4 - rr() * 4, 1.3), '#7a8ad0', .95); } }
        if (rr() < .3) B.tufts(rr, x, y, 10, 4, [P.lawnLo, P.lawnHi], 6); } });
    }, {});

    // 1b. The orchard pond's margin: a worn earth bank with sedge and a few stones, so the grass meets the water at a
    // shore (as the Mere's does) and not at a bare glassy lip. Drawn under the water's own shallows.
    // (fix round 1: the dip too, its warm pool under the bank)
    for (const pool of (L.D.freshwater || []).filter(w => (w.id === 'orchard-pool' || w.id === 'orchard-dip') && w.boundary && w.boundary.length > 2)) {
      const pts = pool.boundary.map(L.pt), loop = V.loopPath([pts]), bb = kit.bboxOf(pts, 40);
      add(bb, 97, (B, r) => {
        // (fix round 2) the dip lies in a hollow: the turf falls to it from every side, darker as it goes down, the north bank
        // lit; sedge in clumps round the water, only a few stones (a neat ring of stones read as a disc dropped on the grass)
        if (pool.id === 'orchard-dip') { const c0 = { x: (bb[0] + bb[2]) / 2, y: (bb[1] + bb[3]) / 2 }; B.cx.filter = 'blur(10px)'; B.f(B.ell(c0.x, c0.y + 4, (bb[2] - bb[0]) / 2 + 6, (bb[3] - bb[1]) / 2 + 2), '#4e6432', .45); B.f(B.ell(c0.x - 6, c0.y - (bb[3] - bb[1]) / 2 + 26, (bb[2] - bb[0]) / 2 - 14, 10), '#c8d08a', .35); B.cx.filter = 'none'; }
        if (pool.id === 'orchard-dip') B.s(loop, season === 'winter' ? '#8e8a74' : '#7a7a4a', 20, .35).s(loop, '#5e6038', 8, .35);   // (a soft earth lip, no ruled ring)
        else B.s(loop, season === 'winter' ? '#8e8a74' : '#8a7a52', 26, .5).s(loop, '#6e6040', 12, .55).s(loop, '#5a5238', 4, .45);
        for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; for (let t = 0; t < 1; t += .34) { const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, d = Math.hypot(x - cx, (y - cy) * 1.6) || 1, ox = (x - cx) / d, oy = (y - cy) * 1.6 / d;
          if (r() < (pool.id === 'orchard-dip' ? .1 : .32)) B.stone(r, x + ox * 9, y + oy * 5, 3 + r() * 3, 2 + r() * 1.4, { rock: '#b4aa94', rockLo: '#8c8270', rockHi: '#d8cfb8', rockDk: '#4e483e' }, null);
          if (season !== 'winter' && r() < .7) B.tufts(r, x + ox * (14 + r() * 8), y + oy * (8 + r() * 5), 12, 6, ['#9a9a52', '#7c8a44', season === 'autumn' ? '#b8a05a' : '#a8b468'], 9); } }
      });
    }

    // (High orchard fix round 1) what the plan names and nothing drew: the grass lanes, the flights of steps, the cliff top
    // and its face, the dip's steam. Each is painted into the ground, from the layout's own routes and shapes.
    const rpts = id => { const rt = L.routes.get(id); if (!rt || !rt.points || rt.points.length < 2) return null; return gardenIslandRoutePath(rt).points.map(q => ({ x: q.x * cw, y: W.sky + q.y * ch, w: typeof gardenIslandRouteWidthAt === 'function' ? gardenIslandRouteWidthAt(rt, q.x, q.y) : (rt.widthCells || 2) })); };
    const even = (pts, step) => { const out = [pts[0]]; let carry = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y); let d = step - carry; while (d <= l) { const t = d / l; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t }); d += step; } carry = l - (d - step); } return out; };
    const across = (pts, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { tx: dx / l, ty: dy / l, nx: -dy / l, ny: dx / l }; };
    // the half width of a path in px across its line (cells are wider than deep)
    const halfPx = (q, d) => q.w * .5 * Math.hypot(d.ny * cw, d.nx * ch);

    // 1c. The grass lanes (the folly trail on the midsummer line, the ridge path): mown turf, the mower's passes along
    // them light and dark, a soft longer edge, never the bare earth of the other walks.
    for (const rt of [...L.routes.values()].filter(q => q.zone === 4 && q.surface === 'grass')) {
      const pts = rpts(rt.id); if (!pts) continue; const ev0 = even(pts, 6), bb = kit.bboxOf(ev0, 70);
      // where it meets a worn path, the path wins (a lane painted over the pass's end hid it)
      const others = [...L.routes.values()].filter(q => q.zone === 4 && q.surface !== 'grass' && q.tier !== 'plaza' && q.points || q.id === 'pass-summit').map(q => rpts(q.id)).filter(Boolean);
      const onOther = q => others.some(o => o.some(p => Math.hypot((p.x - q.x) / cw, (p.y - q.y) / ch) < p.w * .5 + .35));
      const ev = ev0.filter(q => !onOther(q)); if (ev.length < 2) continue;
      add(bb, 93, (B, r) => {
        B.cx.save(); B.cx.clip(coastP); B.cx.lineCap = 'round'; B.cx.lineJoin = 'round';
        const lane = (k, col, a) => { for (let i = 1; i < ev.length; i++) { if (Math.hypot(ev[i].x - ev[i - 1].x, ev[i].y - ev[i - 1].y) > 14) continue; const d = across(ev, i), h = halfPx(ev[i], d) * k; B.s(`M${ev[i - 1].x} ${ev[i - 1].y}L${ev[i].x} ${ev[i].y}`, col, h * 2, a); } };
        // (fix round 2) the uncut meadow either side stands taller and darker, so the lane's two edges read from the camera
        // (a faint lighter green with no edge was all but invisible)
        B.cx.filter = 'blur(4px)'; lane(1.42, kit.mix(P.lawnLo, '#5f7a3a', .5), .75); B.cx.filter = 'none';
        lane(1.12, kit.mix(P.lawnLo, '#6f8a44', .4), .9);
        lane(1, kit.mix(P.lawn, P.lawnHi, .3), 1); lane(.9, season === 'winter' ? '#cdd2c0' : kit.mix(P.lawnHi, '#dfe6a6', .35), 1);
        // the mower's passes: two stripes along the lane, one lit and one in shade
        const runs = []; let cur = [ev[0]]; for (let i = 1; i < ev.length; i++) { if (Math.hypot(ev[i].x - ev[i - 1].x, ev[i].y - ev[i - 1].y) > 14) { runs.push(cur); cur = []; } cur.push(ev[i]); } runs.push(cur);
        for (const run of runs.filter(q => q.length > 1)) for (const [o, col, a] of [[-.45, season === 'winter' ? '#c4cab8' : kit.mix(P.lawnHi, '#d8e0a0', .3), .55], [.45, P.lawnLo, .32]]) { const line = run.map((q, i) => { const d = across(run, i), h = halfPx(q, d); return { x: q.x + d.nx * h * o, y: q.y + d.ny * h * o }; }); V.strokePts(B, line, col, Math.max(6, halfPx(run[0], across(run, 0)) * .8), a); }
        // daisies and clover in the sward, tufts of longer grass at the edges
        for (let i = 0; i < ev.length; i += 2) { const q = ev[i], d = across(ev, i), h = halfPx(q, d);
          if (season !== 'winter' && r() < .5) B.f(B.circ(q.x + d.nx * h * (r() - .5) * 1.4, q.y + d.ny * h * (r() - .5) * 1.4, 1.2), r() < .7 ? '#f8f4e8' : '#f0d24a', .9);
          for (const sd of [-1, 1]) { B.tufts(r, q.x + d.nx * h * sd * 1.1, q.y + d.ny * h * sd * 1.1 + 2, 10, 5, [P.lawnLo, '#7c8a44', '#9a9a52'], 7); if (season !== 'winter' && r() < .25) B.f(B.circ(q.x + d.nx * h * sd * 1.25, q.y + d.ny * h * sd * 1.25 - 3, 1.5), r() < .5 ? '#f0d24a' : '#c8a0d8', .95); } }
        B.cx.restore();
      }, {});
    }

    // 1d. Flights of steps: stone treads across the way, each lit on its top and shaded on its riser, worn hollow in the
    // middle, with grass and a stone cheek at either end. The lakeside steps climb the bank to the pass; the cliff steps
    // climb the rock from the cove to the pippin.
    // (fix round 2) a flight is one straight run of squared stone steps between two stone cheeks, every tread parallel and
    // touching the next (treads laid square to a curving path fanned out like loose laths, and with grass between them they read
    // as planks dropped on the path). opts.climb: the screen rise of the whole flight, when it climbs a wall face (drawn as
    // level treads stacked up the face, the wall's two cut ends either side).
    const flight = (pts, opts) => {
      const a0 = pts[0], a1 = pts[pts.length - 1], dx = a1.x - a0.x, dy = a1.y - a0.y, l = Math.hypot(dx, dy) || 1;
      const half = pts.reduce((m, q, i) => m + halfPx(q, across(pts, i)), 0) / pts.length * (opts.k || .82);
      let tx = dx / l, ty = dy / l; if (opts.climb) { tx = 0; ty = -1; }
      const nx = -ty, ny = tx, n = opts.n || Math.max(3, Math.round(l / (opts.step || 12)));
      const c0 = opts.climb ? { x: (a0.x + a1.x) / 2, y: opts.foot } : { x: a0.x, y: a0.y }, len = opts.climb ? opts.climb : l;
      const bb = [Math.min(a0.x, a1.x) - half - 30, Math.min(a0.y, a1.y, c0.y - len) - 40, Math.max(a0.x, a1.x) + half + 30, Math.max(a0.y, a1.y, c0.y) + 30];
      add(bb, 94 + (opts.salt || 0), (B, r) => {
        B.cx.save(); B.cx.clip(coastP);
        const P0 = t => ({ x: c0.x + tx * len * t, y: c0.y + ty * len * t });
        const quad = (t0, t1, h0, h1) => { const p = P0(t0), q = P0(t1); return B.poly([[p.x - nx * h0, p.y - ny * h0], [p.x + nx * h0, p.y + ny * h0], [q.x + nx * h1, q.y + ny * h1], [q.x - nx * h1, q.y - ny * h1]]); };
        const tone = opts.rock ? ['#a89c86', '#b8ad96', '#8c8270', '#5e564a'] : ['#bdb39a', '#cfc6ac', '#a39880', '#6e6656'];
        // the bed and its shadow, then the cheeks: dressed stones either side, a little proud of the treads
        B.cx.filter = 'blur(4px)'; B.f(quad(-.04, 1.04, half + 10, half + 10), '#2e3420', .28); B.cx.filter = 'none';
        B.f(quad(0, 1, half + 7, half + 7), tone[3]);
        // the treads, from the far end to the near so each nearer one laps the one beyond; each a lit top, a nosing and a riser in shade
        for (let k = n - 1; k >= 0; k--) { const t0 = k / n, t1 = (k + 1) / n, tm = t0 + (t1 - t0) * (opts.climb ? .5 : .32), p = P0(t0), q = P0(t1), m = P0(tm);
          const tp = r(); B.f(quad(tm, t1, half, half), tp < .5 ? tone[0] : tone[1]);   // the tread's top
          B.f(quad(t0, tm, half, half), tone[2]);   // its riser, in shade
          B.s(`M${p.x - nx * half} ${p.y - ny * half}L${p.x + nx * half} ${p.y + ny * half}`, tone[3], 1.2, .6);
          B.s(`M${m.x - nx * half} ${m.y - ny * half}L${m.x + nx * half} ${m.y + ny * half}`, '#efe8d4', 1.4, .85);   // the lit nosing
          B.f(B.ell((m.x + q.x) / 2, (m.y + q.y) / 2, half * .3, Math.max(1, Math.abs(q.y - m.y) * .25)), '#ece4ce', .35);   // worn pale in the middle
          for (let c = 0; c < 2; c++) { const s0 = (r() - .5) * 1.6 * half; B.s(`M${m.x + nx * s0} ${m.y + ny * s0}l${(q.x - m.x) * .9} ${(q.y - m.y) * .9}`, '#7e7662', .7, .45); }
        }
        for (const sd of [-1, 1]) { const ch0 = half + 1, ch1 = half + 9;
          for (let k = 0; k < n + 1; k++) { const t = Math.min(1, k / n), p = P0(t), cx0 = p.x + nx * sd * (ch0 + ch1) / 2, cy0 = p.y + ny * sd * (ch0 + ch1) / 2;
            B.f(B.rect(cx0 - 5, cy0 - 7, 10, 9), r() < .5 ? STONE.rock : STONE.rockLo).f(B.rect(cx0 - 5, cy0 - 7, 10, 2.4), STONE.rockHi, .9).f(B.rect(cx0 + 3, cy0 - 5, 2, 7), STONE.rockDk, .35); }
          if (season !== 'winter') for (let k = 0; k <= n; k += 2) { const p = P0(k / n); B.tufts(r, p.x + nx * sd * (half + 13), p.y + ny * sd * (half + 13) + 3, 7, 3, [P.lawnLo, '#9cb062'], 5); }
        }
        B.cx.restore();
      }, {});
    };
    // (the lakeside steps are a path with one short flight, where they climb through the gap in the orchard bank: one straight
    // run up the gap from the outlet to the hurdle)
    // (layfix east) the flight runs straight up the screen from the footbridge's end to the hurdle across its head (seen face on)
    { const a = L.cpt(60.3, 40.12), b = L.cpt(60.42, 38.9); flight([{ x: a.x, y: a.y, w: 2.05 }, { x: b.x, y: b.y, w: 2.05 }], { step: 8.5, salt: 1, k: .95 }); }
    // where a path climbs through a thin terrace wall: a short flight up the wall's face through the gap, the wall's two cut ends
    // either side (not on the orchard stair, which is steps all the way)
    { const thin = wallRows.filter(f => f.thin).map(f => { const n = f.polygon.length >> 1, a = f.polygon.slice(0, n); return { id: f.id, a: a[0], b: a[a.length - 1] }; });
      for (const w of thin) for (const o of thin) { if (o === w || o.a[0] <= w.b[0] || o.a[0] - w.b[0] > 4.5 || Math.abs(o.a[1] - w.b[1]) > 1.2) continue;
        const mid = [(w.b[0] + o.a[0]) / 2, (w.b[1] + o.a[1]) / 2];
        const near = [...L.routes.values()].filter(rt => rt.zone === 4 && rt.tier !== 'plaza' && rt.surface !== 'steps' && rt.points).map(rt => ({ rt, pts: rpts(rt.id) })).filter(q => q.pts).map(q => ({ q, i: q.pts.reduce((m, p, k) => { const c = { x: p.x / cw, y: (p.y - W.sky) / ch }; const dd = Math.hypot(c.x - mid[0], c.y - mid[1]); return dd < m.d ? { d: dd, k } : m; }, { d: 9, k: -1 }) })).filter(z => z.i.k >= 0 && z.i.d < 1.2).sort((a, b) => a.i.d - b.i.d)[0];
        if (!near) continue; const pts = near.q.pts, k = near.i.k, seg = pts.slice(Math.max(0, k - 2), Math.min(pts.length, k + 3));
        const foot = L.cpt(mid[0], mid[1] + .5).y; if (seg.length > 1) flight(seg, { salt: 3, climb: 26 + ch * .5, foot, n: 5, k: .7 }); } }

    // 1e. The cliff top, east of the cowslip rise: bare rock and thrift where the sand gave out, a lit lip at the sea edge
    // with the face falling away under it, blackthorn bent by the wind, a trod worn along the cliff walk; and across the
    // cove's head the low rock face the cliff steps climb (the sand ran on up to the pippin).
    const CLIFF = [[87.2, 28.4], [91, 28.4], [91, 41.2], [88.8, 41.2], [87.2, 40.6], [85.6, 40.5], [85.4, 38.6], [86.6, 37.6], [87, 33]].map(p => L.cpt(p[0], p[1]));
    const FACE_Y = 40.55, faceFrom = 85.5;
    { const cl = V.loopPath([CLIFF]), bb = kit.bboxOf(CLIFF, 80), on = (x, y) => { const k = L.kind(x / cw, (y - W.sky) / ch); return k === 'beach' || k === 'grass' || k === 'path'; };
      add(bb, 95, (B, r, cb) => {
        B.cx.save(); B.cx.clip(coastP);
        // the rock floor, its edge on the grass soft and broken (a ruled line read as a cut-out): broad slabs, cracked,
        // lichened, with thrift and turf in the joints, thinning out over the edge
        B.cx.filter = 'blur(7px)'; B.f(cl, season === 'winter' ? '#a3aa94' : '#8e9a62', .96); B.cx.filter = 'none';   // (fix round 2: a headland's sward of turf and thrift over the rock, not stones laid on sand)
        const inCl = (x, y) => { let o = false; for (let i = 0, j = CLIFF.length - 1; i < CLIFF.length; j = i++) { const a = CLIFF[i], b = CLIFF[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) o = !o; } return o; };
        kit.tiles(cb, 40, 30, 96, (tx, ty, rr) => { for (let k = 0; k < 3; k++) { const x = tx + rr() * 40, y = ty + rr() * 40; if (!on(x, y) || !inCl(x + (rr() - .5) * 30, y + (rr() - .5) * 20)) continue; if (rr() < .62) { B.tufts(rr, x, y, 12, 5, ['#6f7e44', '#8c9a56', '#a4a862'], 8); continue; } const t = rr(); B.f(B.blob(rr, x, y, 10 + rr() * 12, 5 + rr() * 5, 7, .35), t < .33 ? STONE.rock : t < .66 ? '#a59b85' : STONE.rockLo, .9).f(B.blob(rr, x - 3, y - 2, 6 + rr() * 5, 2.4 + rr() * 2, 6, .4), STONE.rockHi, .55);
          if (rr() < .35) B.s(`M${x - 8} ${y + 1}l${6 + rr() * 6} ${(rr() - .5) * 3}`, STONE.rockDk, .7, .45);
          if (rr() < .4) B.f(B.blob(rr, x + 6, y - 1, 3 + rr() * 2, 1.4, 6, .5), season === 'winter' ? '#dfe2da' : STONE.lichen, .6);
          if (season !== 'winter' && rr() < .32) { const cx0 = x + (rr() - .5) * 14, cy0 = y + 4; B.f(B.blob(rr, cx0, cy0, 5, 2.6, 7, .4), '#6a7e44', .95); if (season !== 'autumn') for (let j = 0; j < 5; j++) B.f(B.circ(cx0 + (rr() - .5) * 7, cy0 - 1.4 - rr() * 2, 1.3), '#e8a0b8', .95); }
          else if (rr() < .3) B.tufts(rr, x, y + 3, 10, 4, ['#7c8a44', '#9a9a52'], 5); } });
        // the trod along the cliff walk: turf and grit worn pale where feet go
        const cw0 = rpts('cliff-walk'); if (cw0) { const ev = even(cw0, 6); B.cx.lineCap = 'round'; for (let i = 1; i < ev.length; i++) { const d = across(ev, i), h = halfPx(ev[i], d); B.s(`M${ev[i - 1].x} ${ev[i - 1].y}L${ev[i].x} ${ev[i].y}`, '#b9ad92', h * 1.3, .55); B.s(`M${ev[i - 1].x} ${ev[i - 1].y}L${ev[i].x} ${ev[i].y}`, '#cfc4a8', h * .7, .5); } }
        B.cx.restore();
        // (layfix east: the sea edge's face is a standing picture now, below: laid in the ground it lay under the sea's own paint,
        //  a translucent grey slab with the water showing through it)
        // blackthorn bent by the wind on the cliff top, its back to the sea
        for (const [x, y] of [[89.2, 30.6], [89.6, 33.8], [88.9, 36.2]]) { const c = L.cpt(x, y); if (!on(c.x, c.y)) continue; B.shadow(c.x + 6, c.y + 2, 20, 5, .3);
          for (let k = 0; k < 7; k++) B.f(B.blob(r, c.x - 6 + k * 2 - r() * 4, c.y - 8 - r() * 10, 9 + r() * 5, 6 + r() * 3, 7, .45), k < 3 ? '#3f4e2e' : k < 5 ? '#55663a' : '#6a7a46', .95);
          if (season === 'spring') for (let k = 0; k < 14; k++) B.f(B.circ(c.x - 14 + r() * 26, c.y - 20 + r() * 14, 1.3), '#fbf7ee', .95);
          else if (season === 'autumn') for (let k = 0; k < 8; k++) B.f(B.circ(c.x - 12 + r() * 22, c.y - 16 + r() * 10, 1.6), '#3e4a7a', .95); }
        // the cliff top's edge above the beach walk: a low blackthorn hedge, knee high (it stops the feet: 94-garden-wonder-7shortcuts.js)
        for (let y = 36.6; y < 40.4; y += .3) { const c = L.cpt(85.25 + Math.sin(y * 3.1) * .06, y); B.f(B.ell(c.x + 4, c.y + 2, 13, 4), '#22301a', .2);
          for (let k = 0; k < 4; k++) B.f(B.blob(r, c.x - 4 + r() * 8, c.y - 6 - r() * 12, 7 + r() * 4, 5 + r() * 3, 7, .45), k < 2 ? '#3f4e2e' : k < 3 ? '#55663a' : '#6a7a46', .97);
          if (season === 'spring') for (let k = 0; k < 4; k++) B.f(B.circ(c.x - 7 + r() * 14, c.y - 18 + r() * 10, 1.3), '#fbf7ee', .95);
          else if (season === 'autumn' && r() < .6) B.f(B.circ(c.x - 5 + r() * 10, c.y - 12 + r() * 6, 1.6), '#3e4a7a', .95); }
      }, {});
      // A rock face falling from a lip (pts, px, in order along it) to its foot: broken into facets of their own height and tone, a
      // lit, broken lip, bedding ledges and cracks, darker toward the foot, wet and foamed where it meets the water (sea true) or
      // with tufts and fallen stones where it meets sand. Drawn in the thing's own space (origin ox, oy).
      const rockFace = (B, r, pts, ox, oy, o) => {
        const D0 = o.depth, out = o.lean || 0, vary = o.vary == null ? .5 : o.vary, seg = pts.map((p, i) => { const h = D0 * (1 - vary * .56 + r() * vary) * (o.taper ? Math.min(1, (i + 1) / 3, (pts.length - i) / 3) : 1); return { x: p.x - ox, y: p.y - oy + (r() - .5) * (o.rough || 4), h }; });
        for (let i = 1; i < seg.length - 1; i++) seg[i].h = (seg[i - 1].h + seg[i].h * 2 + seg[i + 1].h) / 4;   // (neighbours agree, so the foot wanders, not saws)
        const foot = seg.map(p => ({ x: p.x + out * p.h / D0, y: p.y + p.h }));
        B.cx.filter = 'blur(5px)'; B.f(B.poly(foot.map(p => ({ x: p.x, y: p.y - 4 })).concat(foot.slice().reverse().map(p => ({ x: p.x + 8, y: p.y + 8 })))), o.sea ? '#1e3a40' : '#2e3420', .3); B.cx.filter = 'none';
        for (let i = 1; i < seg.length; i++) { const a = seg[i - 1], b = seg[i], fa = foot[i - 1], fb = foot[i], t = r();
          const quad = B.poly([[a.x, a.y], [b.x, b.y], [fb.x, fb.y], [fa.x, fa.y]]);
          B.f(quad, B.lin(0, Math.min(a.y, b.y), 0, Math.max(fa.y, fb.y), [[0, t < .4 ? '#b0a48c' : t < .75 ? '#a39784' : '#968b77'], [.45, t < .5 ? '#857b69' : '#7a705f'], [1, o.sea ? '#3e3a33' : '#5e564a']]));
          B.f(quad, '#000', .015 + r() * .05); }
        // the face's beds: ledges along it, lit on top and shaded under, and cracks down it
        for (let k = 1; k < 4; k++) { const f = k / 4 + (r() - .5) * .06; V.strokePts(B, seg.map((p, i) => ({ x: p.x + (foot[i].x - p.x) * f, y: p.y + (foot[i].y - p.y) * f + Math.sin(i * 1.3 + k) * 1.4 })), '#d0c6ae', 1.2, .4); V.strokePts(B, seg.map((p, i) => ({ x: p.x + (foot[i].x - p.x) * f, y: p.y + (foot[i].y - p.y) * f + 2 + Math.sin(i * 1.3 + k) * 1.4 })), '#3e3a34', 1, .3); }
        for (let i = 0; i < seg.length; i++) if (r() < .7) { const p = seg[i], fp = foot[i], l = .35 + r() * .55; B.s(`M${p.x + (r() - .5) * 4} ${p.y + 3}L${p.x + (fp.x - p.x) * l + (r() - .5) * 5} ${p.y + (fp.y - p.y) * l}`, '#3a352e', .9, .55); }
        // the lip: a broken lit edge with turf and thrift hanging over it
        V.strokePts(B, seg.map(p => ({ x: p.x, y: p.y - 1 })), '#ddd3bb', 3, .95);
        for (let i = 0; i < seg.length; i++) { const p = seg[i]; if (r() < .55) B.f(B.blob(r, p.x + (r() - .5) * 6, p.y - 2, 5 + r() * 5, 2 + r(), 6, .5), o.season === 'winter' ? '#8a9078' : '#6f8a44', .95); if (o.season !== 'winter' && o.season !== 'autumn' && r() < .2) for (let j = 0; j < 4; j++) B.f(B.circ(p.x + (r() - .5) * 8, p.y - 3 - r() * 2, 1.2), '#e8a0b8', .95); }
        // the foot: boulders fallen from it, and white water working round them (or tufts on the sand)
        for (let i = 0; i < foot.length; i++) { const p = foot[i]; if (r() < .45) B.boulder(r, p.x + (r() - .5) * 8, p.y + 2, 7 + r() * 9, 5 + r() * 4, STONE, false);
          if (o.sea) { if (r() < .8) B.f(B.blob(r, p.x + 4 + (r() - .5) * 10, p.y + 4, 9 + r() * 8, 2.6, 6, .5), '#f2f6f4', .55 + r() * .3); }
          else if (o.season !== 'winter' && r() < .4) B.tufts(r, p.x, p.y + 4, 8, 3, ['#7c8a44', '#a8a860'], 5); }
      };
      // the sea cliff down the headland's east coast, north of the cove: chunks of a few cells each, standing over the sea at
      // their own depth (their lip's line), so the face is painted over the water, not under it
      { const lipMax = L.cpt(0, FACE_Y).y - 8;
        for (const l of L.coast) { const run = l.filter(p => p.x > 86.6 * cw && p.y > bb[1] + 30 && p.y < lipMax); if (run.length < 2) continue;
          // in order along the coast, split where it jumps (another stretch of the same loop)
          const parts = []; let cur = [run[0]]; for (let i = 1; i < run.length; i++) { if (Math.hypot(run[i].x - run[i - 1].x, run[i].y - run[i - 1].y) > 40) { parts.push(cur); cur = []; } cur.push(run[i]); } parts.push(cur);
          for (const part of parts) { if (part.length < 2) continue; const even0 = even(part.map(p => ({ x: p.x, y: p.y, w: 0 })), 14);
            for (let s0 = 0; s0 < even0.length - 1; s0 += 9) { const ch0 = even0.slice(s0, Math.min(even0.length, s0 + 10)); if (ch0.length < 2) continue;
              const xs = ch0.map(p => p.x), ys = ch0.map(p => p.y), ox = Math.min(...xs), oy = Math.max(...ys), salt = Math.round(ox + oy);
              thing({ key: 'sea-cliff-' + salt + '|' + season, x: ox, y: oy, depth: oy - 40, box: [-24, Math.min(...ys) - oy - 20, Math.max(...xs) - ox + 50, 100], draw: B => rockFace(B, kit.rng(salt), ch0, ox, oy, { depth: 64, lean: 10, rough: 3, sea: true, season }) }); } } } }
      // the cove's head: a rock face about a figure high from the steps to the sea, the steps cut through it
      const fpts = []; for (let x = faceFrom; x <= 91; x += .25) fpts.push(L.cpt(x, FACE_Y + Math.sin(x * 2.3) * .08));
      // (vale layouts merge: the face stands, a picture of its own in front of the cliff top (laid flat in the ground it was not
      //  drawn where the feet stop, by the collision audit); the boulders fallen on the sand and the tufts at its foot stay
      //  in the ground, where the feet walk among them)
      const fbb = kit.bboxOf(fpts, 70), fox = (fbb[0] + fbb[2]) / 2, foy = L.cpt(0, FACE_Y).y + 44;
      add(fbb, 97, (B, r) => {
        B.cx.save(); B.cx.clip(coastP);
        const sl = rpts('cliff-steps'), gap = sl ? (() => { const q = sl.reduce((m, p) => Math.abs(p.y - L.cpt(0, FACE_Y).y) < Math.abs(m.y - L.cpt(0, FACE_Y).y) ? p : m, sl[0]); return [q.x - halfPx(q, { nx: 1, ny: 0 }) - 2, q.x + halfPx(q, { nx: 1, ny: 0 }) + 2]; })() : [0, 0];
        for (const seg of [fpts.filter(p => p.x < gap[0]), fpts.filter(p => p.x > gap[1])]) { if (seg.length < 2) continue;
          if (season !== 'winter') for (let i = 0; i < seg.length; i += 3) { const p = seg[i]; if (r() < .4) B.tufts(r, p.x, p.y + 46, 8, 3, ['#7c8a44', '#a8a860'], 5); }
          for (let i = 2; i < seg.length; i += 5) if (r() < .55) B.boulder(r, seg[i].x + (r() - .5) * 8, seg[i].y + 50, 12 + r() * 10, 8 + r() * 6, STONE, false); }
        B.cx.restore();
      }, {});
      thing({ key: 'cove-face|' + season, x: fox, y: foy, box: [fbb[0] - fox, fbb[1] - foy, fbb[2] - fox, foy - foy + 4], draw: B => { const r = kit.rng(96);
        B.cx.save(); B.cx.translate(-fox, -foy); B.cx.clip(coastP);
        const sl = rpts('cliff-steps'), gap = sl ? (() => { const q = sl.reduce((m, p) => Math.abs(p.y - L.cpt(0, FACE_Y).y) < Math.abs(m.y - L.cpt(0, FACE_Y).y) ? p : m, sl[0]); return [q.x - halfPx(q, { nx: 1, ny: 0 }) - 2, q.x + halfPx(q, { nx: 1, ny: 0 }) + 2]; })() : [0, 0];
        // (layfix east: broken into facets of their own height, its lip broken, not a ruled grey slab)
        for (const seg of [fpts.filter(p => p.x < gap[0]), fpts.filter(p => p.x > gap[1])]) { if (seg.length < 2) continue; rockFace(B, r, seg.map(p => ({ x: p.x, y: p.y - 4 })), 0, 0, { depth: 46, lean: 2, rough: 4, vary: .16, season }); }
        B.cx.restore();
      } });
      const cs = rpts('cliff-steps'); if (cs) flight(cs, { step: 9, salt: 5, rock: true });
    }

    // 1g. The hurdle fence down the gap from the orchard bank's end to the outlet: two woven hazel hurdles on stakes, standing
    // either side of the lakeside hurdle (the shortcut itself, 94-garden-wonder-7shortcuts.js); their feet stop yours
    // (fix round 2) the fence runs on from the hurdle's two posts, which stand on the slant across the gap (a fence set straight
    // up the screen is seen end on, a row of bare stakes): each stretch a woven hazel panel with its face showing
    if (L.D.presentation && L.D.presentation.orchard && L.D.presentation.orchard.hurdle) for (const [x0, y0, x1, y1] of [[61.08, 38.86, 61, 40.2]]) {   // (layfix east: one run, from the hurdle's east post down the flight's side to the outlet; above the hurdle is the orchard's own side)
      const top = L.cpt(x0, y0), foot = L.cpt(x1, y1), len = foot.y - top.y, dx = top.x - foot.x;
      thing({ key: 'hurdle-fence', x: foot.x, y: foot.y, box: [Math.min(dx, 0) - 14, -len - 34, Math.max(dx, 0) + 14, 8], foot: [-.25 * cw, .25 * cw, len], draw: B => {   // (layfix east: its foot at its lower post, the run up to the bank closed by the bank and the hurdle's own end box)
          // (vale layouts merge: its block as wide as the panel's drift across the screen, not a cell out past the post it ends in)
        // (layfix east) the fence either side is a low post-and-rail in weathered grey oak, so the woven hurdle (the way through,
        // pegged shut) stands out from it across the head of the steps; woven panels both sides read as one long side rail
        const r = kit.rng(Math.round(y0 * 10)), hgt = 17, n = Math.max(2, Math.round(Math.hypot(dx, len) / 22));
        B.f(B.poly([[dx + 4, -len + 2], [8, 3], [16, 1], [dx + 12, -len]]), '#22301a', .16);
        for (const o of [hgt - 3, hgt * .45]) { B.s(`M${dx} ${-len - o}L0 ${-o}`, '#6e665a', 2.6, 1); B.s(`M${dx} ${-len - o - 1}L0 ${-o - 1}`, '#a49a88', 1, .8); }
        for (let k = 0; k <= n; k++) { const t = k / n, x = dx * (1 - t), y = -len * (1 - t), end = k === 0 || k === n; B.f(B.rect(x - 1.8, y - hgt - (end ? 4 : 1), 3.6, hgt + (end ? 4 : 1)), '#5e564a').f(B.rect(x - 1.8, y - hgt - (end ? 4 : 1), 1.2, hgt + (end ? 4 : 1)), '#8e8574', .8).f(B.ell(x + 1.6, y + .6, 4, 1.3), '#22301a', .28); }
        if (season !== 'winter') { B.tufts(r, 2, 2, 8, 4, [P.lawnLo, '#9a9a52'], 6); B.tufts(r, dx, -len + 2, 8, 4, [P.lawnLo, '#9a9a52'], 5); for (let k = 1; k < n; k++) if (r() < .6) B.tufts(r, dx * (1 - k / n), -len * (1 - k / n) + 2, 6, 3, [P.lawnLo, '#9cb062'], 4); }
      } });
    }

    // (fix round 2) Quince's yard: a clipped box hedge, knee high, along the cottage's west side and across the back, so the
    // cottage stands in its own hedged garden and not on bare grass behind the square (the plan's hedged yard). Solid at its foot.
    const rr0 = (x, y, w, h, q) => { q = Math.min(q, w / 2, h / 2); return `M${x + q} ${y}H${x + w - q}Q${x + w} ${y} ${x + w} ${y + q}V${y + h - q}Q${x + w} ${y + h} ${x + w - q} ${y + h}H${x + q}Q${x} ${y + h} ${x} ${y + h - q}V${y + q}Q${x} ${y} ${x + q} ${y}Z`; };
    // (layfix east: no hedge along the back: the cottage's picture stands over it, so it read as a green box on the roof ridge with
    //  the figure standing on it, and the route planner ran into its foot; the cottage's own planting is its garden)
    if (L.stat('ld-quince-house')) for (const [x0, y0, x1, y1] of []) {
      const a = L.cpt(x0, y0), b = L.cpt(x1, y1), along = x1 - x0 > .5, len = along ? b.x - a.x : b.y - a.y, hh = 22;
      thing({ key: 'yard-hedge', x: along ? a.x : b.x, y: b.y, box: along ? [-10, -hh - 12, len + 10, 10] : [-14, -len - hh - 12, 14, 10], foot: along ? [0, len, 9] : [-.2 * cw, .2 * cw, len], draw: B => {
        const r = kit.rng(Math.round(x0 * 10 + y0)), G = season === 'winter' ? ['#4e5e46', '#66765a', '#7e8e70'] : ['#3e5e30', '#5a8040', '#86a85a'];
        if (along) { B.f(B.ell(len / 2 + 4, 3, len / 2 + 10, 5), '#22301a', .25); B.f(rr0(-6, -hh, len + 12, hh + 4, 7), G[0]); B.f(rr0(-5, -hh - 2, len + 10, 9, 5), G[1]); for (let x = 0; x < len; x += 7) B.f(B.blob(r, x + r() * 4, -hh + 2 + r() * 3, 5, 3, 6, .5), G[2], .8); }
        else { B.f(B.ell(5, -len / 2, 13, len / 2 + 6), '#22301a', .22); B.f(rr0(-9, -len - hh, 18, len + hh + 4, 8), G[0]); B.f(rr0(-8, -len - hh - 2, 16, len + 2, 7), G[1]); B.f(rr0(-6, -len - hh, 9, len - 2, 4), G[2], .7); for (let y = -len; y < 0; y += 7) B.f(B.blob(r, -3 + r() * 6, y - hh + 4 + r() * 3, 5, 3, 6, .5), G[2], .8); }
        if (season === 'spring' || season === 'summer') B.tufts(r, along ? len / 2 : 0, 3, along ? len / 2 : 8, 4, [P.lawnLo, '#9cb062'], 8);
      } });
    }

    // (fix round 2) the espalier wall: the thyme wall's sunny face, from 75.6 to 79.9, is old brick, warm in the sun, with fan
    // trained pears and apricots tied flat to it on wires (the plan; a brick edge round the field read as a stub on its own)
    { const f9 = wallRows.find(f => f.id === 'terrace-wall-9-b'); if (f9) { const n = f9.polygon.length >> 1, a9 = f9.polygon.slice(0, n), b9 = f9.polygon.slice(n).reverse();
      const north = a9.reduce((q, p) => q + p[1], 0) <= b9.reduce((q, p) => q + p[1], 0), up = (north ? a9 : b9).filter(p => p[0] >= 75.6 && p[0] <= 79.9), lo = (north ? b9 : a9).filter(p => p[0] >= 75.6 && p[0] <= 79.9);
      if (up.length > 2 && lo.length > 2) { const U = up.map(L.pt).map(p => ({ x: p.x, y: p.y - 26 })), Lw = lo.map(L.pt), face = B0 => B0.poly(U.concat(Lw.slice().reverse())), bb = kit.bboxOf(U.concat(Lw), 40);
        const yAt = (A, x) => A.reduce((m, q) => Math.abs(q.x - x) < Math.abs(m.x - x) ? q : m, A[0]).y;
        add(bb, 92, (B, r) => {
          B.cx.save(); B.cx.clip(new Path2D(face(B)));
          B.f(face(B), B.lin(0, bb[1], 0, bb[3], [[0, '#b0644a'], [1, '#7a3e2e']]));
          for (let row = 0, y0 = Math.min(...U.map(p => p.y)) - 2; y0 < Math.max(...Lw.map(p => p.y)) + 4; row++, y0 += 5.2) for (let x = bb[0] + (row & 1) * 5; x < bb[2]; x += 10) { const t = r(); B.f(B.rect(x + .5, y0 + .5, 9, 4.2), t < .3 ? '#c2785a' : t < .7 ? '#a95c44' : '#b86a4e', .95).f(B.rect(x + .5, y0 + .5, 9, 1), '#dc9a78', .5); }
          B.cx.filter = 'blur(3px)'; B.f(B.poly(Lw.map(p => ({ x: p.x, y: p.y - 10 })).concat(Lw.slice().reverse())), '#2e2018', .3); B.cx.filter = 'none';
          // the wires, then a fan trained tree every stride: a short stem, ribs splayed flat against the brick, leaves and fruit on them
          for (let k = 1; k < 4; k++) V.strokePts(B, U.map((p, i) => ({ x: p.x, y: p.y + k * (yAt(Lw, p.x) - p.y) / 4 })), '#5a5a5e', .5, .6);
          if (season !== 'winter') for (let x = U[0].x + 30; x < U[U.length - 1].x - 20; x += 64) { const top = yAt(U, x) + 4, foot = yAt(Lw, x) - 1;
            for (let k = -3; k <= 3; k++) { const ex = x + k * 9, ey = top + Math.abs(k) * 2.2; B.s(`M${x} ${foot}Q${x + k * 2} ${(foot + ey) / 2} ${ex} ${ey}`, '#5a4232', 1.3, .95); for (let j = 0; j < 4; j++) { const t = .35 + j * .18, lx = x + (ex - x) * t, ly = foot + (ey - foot) * t; B.f(B.ell(lx + (r() - .5) * 3, ly, 2.6, 1.6), r() < .5 ? '#4e7a38' : '#6a9a48', .95); } }
            if (season === 'summer' || season === 'autumn') for (let j = 0; j < 5; j++) B.f(B.circ(x + (r() - .5) * 46, top + 6 + r() * (foot - top - 10), 1.8), season === 'autumn' ? '#e0a040' : '#b8c058'); }
          B.cx.restore();
          // the cope: a course of bricks on edge, a lit top
          for (let i = 0; i < U.length; i++) { const p = U[i]; B.f(B.rect(p.x - 2, p.y - 6, 4.4, 7), r() < .5 ? '#a0503a' : '#8e4834').f(B.rect(p.x - 2, p.y - 6, 4.4, 1.6), '#d08a6a', .8); }
          if (season !== 'winter') for (let i = 0; i < Lw.length; i += 2) B.tufts(r, Lw[i].x, Lw[i].y + 3, 7, 3, [P.lawnLo, '#9cb062'], 5);
        }, {});
      } } }

    // 1f. The dip's steam: soft wisps lifting off the warm water, thicker on a cold morning
    { const dip = (L.D.freshwater || []).find(w => w.id === 'orchard-dip'); if (dip && dip.boundary) { const pts = dip.boundary.map(L.pt), bb = kit.bboxOf(pts, 50);
      add([bb[0], bb[1] - 60, bb[2], bb[3]], 99, (B, r) => { const cx0 = (bb[0] + bb[2]) / 2, cy0 = (bb[1] + bb[3]) / 2, a = season === 'winter' ? .34 : season === 'autumn' ? .26 : .16;
        B.cx.filter = 'blur(6px)'; for (let k = 0; k < 7; k++) B.f(B.blob(r, cx0 + (r() - .5) * 30, cy0 - 6 - k * 7 + (r() - .5) * 4, 12 - k * .8, 6, 7, .5), '#f4f6f6', a * (1 - k / 9)); B.cx.filter = 'none'; }, {}); } }
    // 2. Trees in rows along the terraces, clear of everything the player uses
    const trees = [], kinds = GardenPaintWood.orchardKinds || ['apple'];
    // What the rows keep clear of, measured from the painted shapes, not cell centres: a trunk never stands on a
    // path's ribbon or the cider square's setts, in the stair's mouth, at the pond's lip or crowding the ring.
    // (round 3 layouts: every path of the orchard, the hand-authored ones included, and the climb to the pass)
    const ROUTE_IDS = [...L.routes.values()].filter(rt => rt.zone === 4 && rt.tier !== 'plaza' || rt.id === 'pass-summit').map(rt => rt.id);
    const ribbons = ROUTE_IDS.map(id => { const rt = L.routes.get(id); return rt && rt.points && rt.points.length > 1 ? { w: rt.widthCells || 1.4, pts: gardenIslandRoutePath(rt).points, grass: rt.surface === 'grass' } : null; }).filter(Boolean);
    const segD = (px, py, a, b) => { const ax = a.x * cw, ay = a.y * ch, bx = b.x * cw, by = b.y * ch, dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
    const offPath = (x, y, pad) => ribbons.every(rb2 => { const lim = rb2.w / 2 * cw * .5 + pad + (rb2.grass ? 64 : 0);   /* (fix round 1: nothing tall on the grass lanes, the midsummer line: a crown stood over the folly trail) */ for (let i = 1; i < rb2.pts.length; i++) if (segD(x * cw, y * ch, rb2.pts[i - 1], rb2.pts[i]) < lim) return false; return true; });
    const sq = L.routes.get('cider-square'), sqA = sq && sq.points ? sq.points[0] : null, sqB = sq && sq.points ? sq.points[sq.points.length - 1] : null;
    const sqShape = sq && sq.shape, inPoly = (x, y, pts) => { let on = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) on = !on; } return on; };
    const offSquare = (x, y) => { if (sqShape) return ![[0, 0], [.9, 0], [-.9, 0], [0, .7], [0, -.7]].some(([dx, dy]) => inPoly(x + dx, y + dy, sqShape)); if (!sqA) return true; const cx = Math.max(sqA[0], Math.min(sqB[0], x)), cy = sqA[1] + (sqB[1] - sqA[1]) * ((cx - sqA[0]) / ((sqB[0] - sqA[0]) || 1)); return ((x - cx) / 2.7) ** 2 + ((y - cy) / 2.5) ** 2 > 1; };
    const gate = (L.D.gates || []).find(g => g.id === 'island-orchard'), offGate = (x, y) => !gate || Math.abs(x - gate.x - .5) > 3.4 || y < gate.y - 3.2 || y > gate.y + 2;
    const dipC = (L.D.freshwater || []).filter(w => w.id === 'orchard-dip' && w.boundary).map(w => [w.boundary.reduce((a, p) => a + p[0], 0) / w.boundary.length, w.boundary.reduce((a, p) => a + p[1], 0) / w.boundary.length]);
    const dryLip = (x, y) => [[0, 0], [1.1, 0], [-1.1, 0], [0, 1], [0, -1.2], [.8, .8], [-.8, .8]].every(([dx, dy]) => L.kind(x + dx, y + dy) !== 'water') && dipC.every(([px, py]) => Math.hypot(x - px, (y - py) * 1.3) > 2.8 && !(Math.abs(x - px) < 2.6 && y > py && y < py + 4.6));   // (fix round 1: no crown over the dip)
    const ringS = L.stat('ld-ring'), ringC = ringS ? { x: ringS.x + ringS.w / 2, y: ringS.y + .5 } : null;
    // (round 3 layouts) the ring's eight trunks and the Mother tree where the hand-authored orchard puts them (presentation.orchard)
    const OR = (L.D.presentation && L.D.presentation.orchard) || {}, MOM = OR.mother ? [OR.mother.x, OR.mother.y] : [84.6, 45.2], RINGT = OR.ring && OR.ring.trunks;
    // (round 3 layouts) no row tree stands on or just in front of one of the orchard's places (a crown hid the bell and the press)
    const places = (L.D.static || []).filter(q => q.district === 'orchard-headland' && q.id !== 'ld-ring'), byPlace = (x, y) => places.some(q => x > q.x - 1.2 && x < q.x + q.w + 1.2 && y > q.y - .6 && y < q.y + q.h + 2.4);
    // (fix round 2) and none at the top of the lakeside steps by the hurdle fence (a trunk stood on the steps' stones, its crown over them)
    const offHurdle = (x, y) => Math.hypot(x - 61.8, (y - 38.2) * 1.2) > 2.3;
    const clearOf = (x, y) => offPath(x, y, 5) && offSquare(x, y) && offGate(x, y) && dryLip(x, y) && !byPlace(x, y) && offHurdle(x, y);
    for (let y = 21.6, row = 0; y < 47; y += 1.75, row++) for (let x = 60 + (row % 2) * 1.15; x < 89; x += 2.3) {
      const jx = x + (kit.hash(Math.round(x * 10), Math.round(y * 10), 93) % 100) / 100 * .7 - .35, jy = y + (kit.hash(Math.round(x * 10), Math.round(y * 10), 94) % 100) / 100 * .5 - .25;
      const fx = Math.floor(jx), fy = Math.floor(jy);
      // the trunk's own cell is grass (or the edge of a path cell the painted ribbon does not reach), on land the orchard owns
      const own = inReg(fx, fy) && (grass(fx, fy) || L.kind(fx + .5, fy + .5) === 'path' && offPath(jx, jy, 24));
      if (!own || !L.free(jx, jy) || L.plot(jx, jy) || L.plot(jx, jy - 1) || L.plot(jx - .8, jy) || L.plot(jx + .8, jy) || nearWall(jx, jy, 1.3)) continue;
      // the thyme terrace, the cowslip rise and the folly's ridge stay open: no rows there
      if (jy < 25 || (jx > 81.5 && jy > 33.5 && jy < 39.5) || (jx > 82 && jy < 33.5)) continue;
      if (!clearOf(jx, jy)) continue;
      if (ringC && ((jx - ringC.x) / 4.6) ** 2 + ((jy - ringC.y) / 3) ** 2 < 1) continue;   // the ring is its own eight pears
      if (Math.hypot(jx - MOM[0], (jy - MOM[1]) * 1.4) < 2.4) continue;   // room round the Mother tree
      if (kit.hash(fx, fy, 95) % 8 === 0) continue;   // a gap now and then, so rows read as planted, not stamped
      trees.push({ x: jx, y: jy, kind: ROWS[row % ROWS.length], h: 92 + kit.hash(fx, fy, 96) % 36, v: kit.hash(fx, fy, 97) % 3 });
    }
    // then fill the gaps the plots and paths leave: the same rules, a finer sieve, never closer than a row's spacing to a neighbour
    for (let y = 25.2; y < 47; y += .9) for (let x = 60.4 + (Math.round(y * 10) % 2) * .5; x < 89; x += 1.05) {
      if (trees.length >= 64) break;
      const jx = x + (kit.hash(Math.round(x * 10), Math.round(y * 10), 98) % 100) / 100 * .4 - .2, jy = y + (kit.hash(Math.round(x * 10), Math.round(y * 10), 99) % 100) / 100 * .3 - .15, fx = Math.floor(jx), fy = Math.floor(jy);
      if (!(inReg(fx, fy) && grass(fx, fy)) || !L.free(jx, jy) || L.plot(jx, jy) || L.plot(jx, jy - 1) || L.plot(jx - .8, jy) || L.plot(jx + .8, jy) || nearWall(jx, jy, 1.3)) continue;
      if ((jx > 81.5 && jy > 33.5 && jy < 39.5) || (jx > 82 && jy < 33.5) || !clearOf(jx, jy)) continue;
      if (ringC && ((jx - ringC.x) / 4.6) ** 2 + ((jy - ringC.y) / 3) ** 2 < 1 || Math.hypot(jx - MOM[0], (jy - MOM[1]) * 1.4) < 2.4) continue;
      if (trees.some(t => ((t.x - jx) / 2.05) ** 2 + ((t.y - jy) / 1.6) ** 2 < 1)) continue;
      const row = Math.round((jy - 21.6) / 1.75);
      trees.push({ x: jx, y: jy, kind: ROWS[((row % ROWS.length) + ROWS.length) % ROWS.length], h: 88 + kit.hash(fx, fy, 96) % 36, v: kit.hash(fx, fy, 97) % 3 });
    }
    // the ring of eight old perry pears round the mown centre
    const ring = L.stat('ld-ring');
    if (ring) { const c = L.cpt(ring.x + ring.w / 2, ring.y + .5); add([c.x - 170, c.y - 80, c.x + 170, c.y + 80], 99, (B, r) => { B.f(B.blob(r, c.x, c.y, 150, 58, 14, .12), season === 'winter' ? '#c4cab8' : '#b8c47a', .45); B.s(B.blob(r, c.x, c.y, 150, 58, 14, .12), P.lawnLo, 5, .25); for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 150 + r() * 16; B.tufts(r, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * .4, 8, 4, [P.lawnLo, '#9a9a52'], 8); }
      // (fix round 1) mown in rings round the stone, light and dark, so the centre reads as kept lawn among the pears
      for (let k = 1; k < 5; k++) B.s(B.ell(c.x, c.y, k * 28, k * 11.5), k % 2 ? (season === 'winter' ? '#d0d6c4' : '#c8d48c') : P.lawnLo, 9, k % 2 ? .4 : .22); }); }
    if (ring && RINGT) RINGT.forEach(([x, y], i) => { if (inReg(x, y)) trees.push({ x, y, kind: 'pear', h: (y < ringC.y - 1 ? 118 : 132) + (i * 7) % 12, v: i % 3 }); });   // (fix round 2: 3 to 3.4 H perry pears, slim and tall, so the ring reads as eight trees round a mown centre and not one clump; the north pair lower, under the cottage wall)
    else if (ring) { const c = { x: ring.x + ring.w / 2, y: ring.y + .5 }; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, x = c.x + Math.cos(a) * 3.1, y = c.y + Math.sin(a) * 1.9; if (inReg(x, y) && L.kind(x, y) !== 'path' && offPath(x, y, 4) && offSquare(x, y)) trees.push({ x, y, kind: 'pear', h: 132 + (i * 7) % 20, v: i % 3 }); } }
    // their trunks are solid where they stand (the leaves are for walking behind): GardenPaintVale.orchardTrunks(), 94-garden-world-0walk.js
    trunks = trees.map(t => [+t.x.toFixed(2), +t.y.toFixed(2), t.h > 125 ? .42 : .32]).concat(inReg(MOM[0], MOM[1]) ? [[MOM[0], MOM[1], .5], [MOM[0] + 26 / cw, MOM[1] + .05, .22]] : []);   // (and the crutch's foot: you walked through it)
    for (const t of trees) { const p = L.cpt(t.x, t.y); thing({ y: p.y, make: scene => GardenPaintWood.orchardTree(scene, { kind: kinds.includes(t.kind) ? t.kind : 'apple', season, h: t.h, x: p.x, y: p.y, v: t.v, flip: (Math.round(t.x * 7) % 2) === 1 }) }); }
    motion(C, thing, [], (L.D.regions || []).filter(r => r.id === reg.id || r.theme === 'mountain'));
    // windfalls under the trees in autumn
    if (season === 'autumn' && trees.length) add(kit.bboxOf(trees.map(t => L.cpt(t.x, t.y)), 40), 98, (B, r) => { for (const t of trees) { const p = L.cpt(t.x, t.y); for (let k = 0; k < 5; k++) B.f(B.circ(p.x + (r() - .5) * 40, p.y + (r() - .3) * 10, 2.2), r() < .6 ? '#c8442e' : '#e0b23a', .9); } });
    // the Mother tree: the oldest apple, leaning, propped on a crutch
    const mt = L.cpt(MOM[0], MOM[1]);
    if (inReg(MOM[0], MOM[1])) {
      thing({ y: mt.y, make: scene => { const im = GardenPaintWood.orchardTree(scene, { kind: 'apple', season, h: 170, x: mt.x, y: mt.y, v: 2 }); if (im) im.setAngle(-9); return im; } });
      thing({ key: 'crutch', x: mt.x + 26, y: mt.y + 2, box: [-30, -80, 10, 6], draw: B => { B.s('M0 0L-22 -66', '#6a5034', 4).s('M-28 -64L-15 -70', '#6a5034', 4).s('M0 0L-22 -66', '#9a7a54', 1.4, .7); } });
    }
  }

  // The orchard's trunks as [x, y, width] in cells, while the painted vale is what is shown (null otherwise).
  let trunks = null;
  // The painted orchard plants its own rows, so the world leaves out its generic grove stands there (94-garden-native-world.js).
  // (vale final: round 3's highland motion kept: cloud shadows drifting over the highlands by day)
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
  V.ownsRegion = id => id === 'orchard-headland' && V.wanted();
  V.orchardTrunks = () => (V.wanted() && trunks) || null;
  V.parts.push({ id: 'orchard', compose });
})();

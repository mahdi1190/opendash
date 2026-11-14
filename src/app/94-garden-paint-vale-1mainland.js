/* Painted vale: the mainland. Past the west and north edges the land runs on
 * (presentation.mainland): the woods go on west into a patchwork of small
 * fields and hedgerows, the long road leaves from the milestone and winds away
 * into the haze, and to the north the fells rise into ridges, blue with
 * distance, snow on them in winter. No cells: nothing to walk or save. It is
 * seen from far off, so it is baked at a third of a canvas pixel per world pixel and
 * hazes out with distance; where it meets the sea it has a beach and foam.
 * See 94-garden-paint-vale-0kit.js for the layers. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;

  function compose(C) {
    const { L, P, kit, main, W } = C, cw = L.cw, ch = L.ch, pres = L.pres.mainland;
    if (!pres || !(pres.edges || []).length) return;
    const gw = W.cols * cw, cp = (x, y) => ({ x: x * cw, y: W.sky + y * ch });
    // the mainland's own outline, in cells: it overlaps the island (the island is cut out), and ends in two headlands
    const big = [[-60, -70], [120, -70], [112, -40], [100, -22], [92, -10], [84, 1], [60, 6], [20, 8], [6, 12], [3, 34], [4, 56], [2, 66], [-5, 72.5], [-14, 77], [-28, 81], [-46, 83], [-60, 84]].map(p => cp(p[0], p[1]));
    const bigP = new Path2D(B0(big)), coastP = V.loopPath(L.coast);
    const SEAM = W.sky + 30, FADE = 70;   // the mainland reaches a little over the island's west edge and its sky strip, then fades out, so no edge shows
    const outGrid = new Path2D(); outGrid.rect(-6000, -6000, gw + 12000, 16000); outGrid.rect(FADE, SEAM, gw - FADE, 9000);
    const outCoast = new Path2D(); outCoast.rect(-6000, -6000, gw + 12000, 16000); outCoast.addPath(coastP);
    const shoreS = [[2, 66], [-5, 72.5], [-14, 77], [-28, 81], [-46, 83], [-60, 84]].map(p => cp(p[0], p[1]));
    const road = [cp(2.4, 52.6), cp(-6, 51.4), cp(-14, 53.6), cp(-22, 51), cp(-31, 47.6), cp(-40, 49.8), cp(-52, 46)];
    const FS = 250;   // the farm lattice, world px
    const site = (i, j) => { const r = kit.rng(kit.hash(i, j, 181)), wx = (kit.fbm(i * .37, j * .37, 182) - .5) * FS * .9, wy = (kit.fbm(i * .37 + 9, j * .37, 183) - .5) * FS * .7; return { x: i * FS + FS * .5 + (r() - .5) * FS * .7 + wx, y: j * FS * .8 + FS * .4 + (r() - .5) * FS * .6 + wy, i, j }; };
    // a shared edge wobbles by the world position alone, so both fields draw the same line
    const wob = (x, y) => [(kit.fbm(x / 140, y / 140, 184) - .5) * 34, (kit.fbm(x / 140 + 5, y / 140, 185) - .5) * 26];
    function cellOf(i, j) {
      const me = site(i, j), R = FS * 1.6; let poly = [[me.x - R, me.y - R, null], [me.x + R, me.y - R, null], [me.x + R, me.y + R, null], [me.x - R, me.y + R, null]];
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
        if (!di && !dj) continue; const o = site(i + di, j + dj), nx = o.x - me.x, ny = o.y - me.y, mx = (o.x + me.x) / 2, my = (o.y + me.y) / 2, side = (q) => (q[0] - mx) * nx + (q[1] - my) * ny;
        const out = []; for (let k = 0; k < poly.length; k++) { const A = poly[k], Bq = poly[(k + 1) % poly.length], sa = side(A), sb = side(Bq); if (sa <= 0) out.push(A); if ((sa <= 0) !== (sb <= 0)) { const t = sa / (sa - sb); out.push([A[0] + (Bq[0] - A[0]) * t, A[1] + (Bq[1] - A[1]) * t, (sa <= 0) ? o : A[2]]); } }
        // each vertex carries the neighbour across the edge that starts at it
        poly = out; if (poly.length < 3) return null;
      }
      return { me, poly };
    }
    const edgePts = (A, Bq) => { const n = Math.max(2, Math.round(Math.hypot(Bq[0] - A[0], Bq[1] - A[1]) / 40)), pts = []; for (let k = 0; k <= n; k++) { const t = k / n, x = A[0] + (Bq[0] - A[0]) * t, y = A[1] + (Bq[1] - A[1]) * t, w = k && k < n ? wob(x, y) : [0, 0]; pts.push([x + w[0], y + w[1]]); } return pts; };
    function fieldsIn(B, cb) {
      const i0 = Math.floor((cb[0] - FS * 1.5) / FS), i1 = Math.ceil((cb[2] + FS * 1.5) / FS), j0 = Math.floor((cb[1] - FS * 1.5) / (FS * .8)), j1 = Math.ceil((cb[3] + FS * 1.5) / (FS * .8));
      const cells = [];
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const c = cellOf(i, j); if (!c) continue; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of c.poly) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); } if (x1 < cb[0] - 40 || x0 > cb[2] + 40 || y1 < cb[1] - 40 || y0 > cb[3] + 40) continue; c.edges = c.poly.map((A, k) => edgePts(A, c.poly[(k + 1) % c.poly.length])); cells.push(c); }
      // the fields: crop, pasture, the odd ploughed brown, a few rows or stripes
      for (const c of cells) {
        const rr = kit.rng(kit.hash(c.me.i, c.me.j, 186)), roll = rr(), col = roll < .1 ? '#9a7a54' : P.mainField[Math.floor(rr() * P.mainField.length)], outline = [].concat(...c.edges.map(e => e.slice(0, -1)));
        const shape = 'M' + outline.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z';
        B.f(shape, col, .92);
        if (rr() < .45) { B.cx.save(); B.cx.clip(new Path2D(shape)); const a = rr() * Math.PI, dx = Math.cos(a), dy = Math.sin(a), gap = 9 + rr() * 8, lc = kit.mix(col, roll < .1 ? '#6a5034' : '#6a7a3a', .3); for (let k = -24; k <= 24; k++) { const ox = c.me.x - dy * k * gap, oy = c.me.y + dx * k * gap; B.s(`M${ox - dx * 400} ${oy - dy * 400}L${ox + dx * 400} ${oy + dy * 400}`, lc, 1.8, .32); } B.cx.restore(); }
        else if (rr() < .3) for (let k = 0; k < 4; k++) { const x = c.me.x + (rr() - .5) * 90, y = c.me.y + (rr() - .5) * 60; B.f(B.ell(x, y, 2.4, 1.6), '#f4f0e6', .95); }   // sheep
      }
      // the hedgerows along every shared edge (drawn by the field with the lower number), trees standing in them
      for (const c of cells) c.poly.forEach((A, k) => {
        const o = c.poly[(k + 1) % c.poly.length][2]; if (o && (o.j * 10000 + o.i) < (c.me.j * 10000 + c.me.i)) return;
        const pts = c.edges[k]; if (pts.length < 2) return;
        const d = 'M' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L');
        B.s(d, '#4a6230', 7, .55).s(d, P.leaf[0], 4.2, .9);
        const rr = kit.rng(kit.hash(Math.round(pts[0][0]), Math.round(pts[0][1]), 187)), gate = rr() < .3 ? Math.floor(rr() * (pts.length - 1)) : -1;
        for (let q = 0; q < pts.length - 1; q++) {
          if (q === gate) { const m = [(pts[q][0] + pts[q + 1][0]) / 2, (pts[q][1] + pts[q + 1][1]) / 2]; B.f(B.rect(m[0] - 6, m[1] - 3, 12, 3), '#c4a478'); continue; }
          for (let z = 0; z < 2; z++) { const t = rr(), x = pts[q][0] + (pts[q + 1][0] - pts[q][0]) * t, y = pts[q][1] + (pts[q + 1][1] - pts[q][1]) * t; B.f(B.blob(rr, x, y - 2, 7 + rr() * 5, 4.4 + rr() * 2.6, 7, .4), P.leaf[Math.floor(rr() * 2)], .95); }
          if (rr() < .28) { const t = rr(), x = pts[q][0] + (pts[q + 1][0] - pts[q][0]) * t, y = pts[q][1] + (pts[q + 1][1] - pts[q][1]) * t, s0 = 12 + rr() * 9; B.f(B.ell(x + 5, y + 4, s0 * .9, s0 * .35), 'rgba(40,50,24,.25)').f(B.blob(rr, x, y - s0 * .6, s0, s0 * .8, 9, .35), P.leaf[0]).f(B.blob(rr, x - s0 * .25, y - s0 * .8, s0 * .6, s0 * .45, 8, .4), P.leaf[1], .95).f(B.blob(rr, x - s0 * .4, y - s0 * .95, s0 * .26, s0 * .2, 7, .4), P.leaf[2], .9); }
        }
      });
      // a farmstead now and then: house, barn, a yard
      for (const c of cells) { const rr = kit.rng(kit.hash(c.me.i, c.me.j, 188)); if (rr() > .09) continue; const fx = c.me.x, fy = c.me.y; B.f(B.ell(fx + 4, fy + 4, 34, 12), '#b8a878', .6).f(B.rect(fx - 12, fy - 9, 18, 11), '#d8ccb0').f(`M${fx - 14} ${fy - 9}L${fx - 3} ${fy - 18}L${fx + 8} ${fy - 9}Z`, '#8a5a44').f(B.rect(fx + 10, fy - 7, 20, 10), '#8a6a4a').f(`M${fx + 8} ${fy - 7}L${fx + 20} ${fy - 14}L${fx + 32} ${fy - 7}Z`, '#5e5a52'); }
    }

    // in parts, so a chunk bakes in short slices (the kit slices between ops)
    const paintLand = (B, r, cb, part) => {
      if (part === 0) B.f(B.rect(cb[0] - 6, cb[1] - 6, cb[2] - cb[0] + 12, cb[3] - cb[1] + 12), P.mainField[0]);
      if (part === 0)
      // fields: an old patchwork, not a grid. Each field is the patch of ground nearest one of a scatter of
      // farm points (a warped lattice), so fields come in odd sizes and slant every way; their shared edges wobble
      // the same for both neighbours and carry the hedgerows, with hedgerow trees, gates and the odd farmstead.
      fieldsIn(B, cb);
      // the island's west woods run on past the grid: a woodland floor that deepens toward the edge, so fields give way to wood, not to a line
      if (part === 1 && cb[0] < 0) { const x0 = Math.max(cb[0], -520), floor = kit.mix(P.floor || P.leaf[0], P.leaf[0], .35); B.f(B.rect(x0, Math.max(cb[1], 0), Math.min(0, cb[2]) + 40 - x0, Math.max(0, cb[3] - Math.max(cb[1], 0))), B.lin(-520, 0, -60, 0, [[0, kit.rgba(floor, 0)], [.6, kit.rgba(floor, .7)], [1, kit.rgba(floor, .95)]])); }
      // woods: the west woods run on, and copses dot the farmland
      if (part === 1) kit.tiles(cb, 90, 40, 82, (tx, ty, rr) => {
        for (let k = 0; k < 5; k++) {
          const x = tx + rr() * 90, y = ty + rr() * 90, nearWest = x > -420 && y > W.sky + 4 * ch && y < W.sky + 74 * ch ? 1 - Math.max(0, -x) / 420 : 0;
          const n = kit.fbm(x / 520, y / 460, 83) + nearWest * .4 * kit.fbm(x / 200, y / 200, 87) + nearWest * nearWest * .8; if (n < .54) continue;
          const s = 22 + rr() * 16; B.f(B.blob(rr, x + 6, y + 8, s, s * .7, 9, .35), P.leaf[0]).f(B.blob(rr, x, y, s * .86, s * .6, 9, .35), P.leaf[1]).f(B.blob(rr, x - s * .3, y - s * .25, s * .4, s * .28, 7, .4), P.leaf[2], .9);
        }
      });
      // fells rising to the north, seen from far off: a sky first, then ridges far to near, each paler and bluer the
      // farther it is (aerial perspective) and misted at its foot, with organic crests and lit and shaded faces, so they read
      // as hills in haze, never flat slabs or bands; the nearest is moor, heather and copses, softening down into the island's fells
      if (part === 2 && cb[1] < SEAM) {
        const fell = C.season === 'winter' ? '#b8b8a8' : C.season === 'autumn' ? '#a99c70' : '#a3a874', sky = C.season === 'winter' ? '#dfe6ea' : '#d6e4ea';
        const top = Math.min(SEAM, cb[3]), dy = W.sky - 40;   // (the ridges sit down over the island's sky strip)
        B.f(B.rect(cb[0] - 6, cb[1] - 6, cb[2] - cb[0] + 12, Math.min(top, dy - 60) - cb[1] + 6), B.lin(0, -1300, 0, -80, [[0, kit.mix(sky, '#a8c4d4', .35)], [.6, sky], [1, kit.mix(sky, P.haze, .5)]]));
        for (let k = Math.floor(cb[0] / 400) - 1; k <= Math.ceil(cb[2] / 400); k++) { const rr = kit.rng(kit.hash(k, 7, 92)), x = k * 400 + rr() * 400, y = -560 - rr() * 500; B.f(B.blob(rr, x, y, 120 + rr() * 160, 18 + rr() * 16, 10, .3), '#f4f8fa', .45); }   // high soft cloud
        const ridges = [{ base: -330 + dy, amp: 150, col: kit.mix(P.far, sky, .5) }, { base: -230 + dy, amp: 120, col: kit.mix(P.far, sky, .22) }, { base: -130 + dy, amp: 95, col: kit.mix(fell, P.far, .55) }, { base: -40 + dy, amp: 70, col: kit.mix(fell, P.far, .25) }];
        ridges.forEach((R, ri) => {
          const pts = [], step = 24, x0 = Math.floor(cb[0] / step) * step - step * 2;
          for (let x = x0; x <= cb[2] + step * 2; x += step) { const n = kit.fbm(x / 520, ri * 3.1, 840 + ri) * .75 + kit.fbm(x / 140, ri * 1.7, 850 + ri) * .25; pts.push({ x, y: R.base - Math.pow(n, 1.6) * R.amp * 1.6 }); }
          const foot = R.base + 70, poly = pts.concat([{ x: pts[pts.length - 1].x, y: foot }, { x: pts[0].x, y: foot }]);
          // the body: the ridge's own tone at the crest, misted into the haze at its foot
          B.f(B.poly(poly), B.lin(0, R.base - R.amp, 0, foot, [[0, R.col], [.55, kit.mix(R.col, sky, .25)], [1, kit.mix(R.col, P.haze, .7)]]));
          // faces: each rise lit on its west side, shaded on its east (light from the upper left), with gullies running down
          B.cx.save(); B.cx.clip(new Path2D(B.poly(poly)));
          for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1]; if (b.y < a.y && b.y <= c.y) { const rr = kit.rng(kit.hash(Math.round(b.x), ri, 93)), w = 40 + rr() * 60, h = R.base - b.y + 50; B.f(B.poly([b, { x: b.x + w, y: b.y + h }, { x: b.x + w * .2, y: b.y + h }]), kit.mix(R.col, '#3c4048', .14), .3).f(B.poly([b, { x: b.x - w * .8, y: b.y + h }, { x: b.x - w * .1, y: b.y + h }]), kit.mix(R.col, '#fffbe8', .16), .28); if ((C.season === 'winter' || ri < 2) && R.base - b.y > R.amp * .7) B.f(B.poly([b, { x: b.x - 16, y: b.y + 14 }, { x: b.x + 3, y: b.y + 10 }, { x: b.x + 15, y: b.y + 16 }]), '#f6f8f8', .7); } }
          if (ri >= 2) for (let tx = Math.floor(cb[0] / 120) * 120 - 120; tx < cb[2] + 120; tx += 120) { const rr = kit.rng(kit.hash(tx, ri, 94)); for (let k = 0; k < 4; k++) { const x = tx + rr() * 120, y = R.base - rr() * R.amp * .8; B.f(B.blob(rr, x, y, 10 + rr() * 22, 3 + rr() * 5, 7, .5), rr() < .5 ? kit.mix(R.col, '#7a5a48', .25) : kit.mix(R.col, '#5f6e3c', .25), .35); } }   // heather and bracken on the near moor
          if (ri === 3) for (let tx = Math.floor(cb[0] / 140) * 140 - 140; tx < cb[2] + 140; tx += 140) { const rr = kit.rng(kit.hash(tx, 3, 95)); for (let k = 0; k < 2; k++) { const x = tx + rr() * 140, y = R.base + 10 - rr() * 40, s0 = 8 + rr() * 8; B.f(B.blob(rr, x, y, s0, s0 * .7, 8, .35), kit.mix(P.leaf[0], P.far, .35), .8).f(B.blob(rr, x - s0 * .3, y - s0 * .3, s0 * .45, s0 * .3, 6, .4), kit.mix(P.leaf[2], P.far, .3), .7); } }   // copses in the near folds
          B.cx.restore();
          V.strokePts(B, pts, kit.mix(R.col, '#fffbe8', .3), 1.6, .5);   // a lit crest line, not a dark outline
        });
        // the foot of the fells fades into the haze where the island's own fells begin, so there is no line at the grid's edge
        if (cb[2] > 0) B.f(B.rect(Math.max(cb[0], 0), Math.max(cb[1], dy - 80), cb[2] - Math.max(cb[0], 0), top - Math.max(cb[1], dy - 80)), B.lin(0, dy - 80, 0, SEAM, [[0, kit.rgba(P.haze, 0)], [1, kit.rgba(P.haze, .5)]]));
      }
      // the long road, leaving from the milestone
      if (part !== 3) return;
      V.strokePts(B, road, '#9c8a66', 20, .7); V.strokePts(B, road, '#dccca2', 14, .95); V.strokePts(B, road, '#efe2bf', 5, .5);
      // haze: the farther, the paler and bluer
      if (cb[0] < 0) B.f(B.rect(cb[0], Math.max(cb[1], 0), Math.min(0, cb[2]) - cb[0], Math.max(0, cb[3] - Math.max(cb[1], 0))), B.lin(-350, 0, -1700, 0, [[0, kit.rgba(P.haze, 0)], [1, kit.rgba(P.haze, .5)]]));
      if (cb[1] < 0) B.f(B.rect(cb[0], cb[1], cb[2] - cb[0], Math.min(0, cb[3]) - cb[1]), B.lin(0, -250, 0, -1300, [[0, kit.rgba(P.haze, 0)], [1, kit.rgba(P.haze, .55)]]));
    };
    const bb = (pts, pad) => kit.bboxOf(pts, pad);
    const bandW = [-1800, SEAM, FADE + 10, W.sky + 86 * ch], bandN = [-1800, -1200, cp(118, 0).x, SEAM];   // (disjoint: where both painted, the haze went on twice and a pale box showed)
    for (const [i, band] of [bandW, bandN].entries()) {
      // Every branch is clipped to the same disjoint band. A feature's bounds
      // select chunks; they do not clip its drawing. Without this clip the
      // corner branch filled the whole last chunk beyond the feathered seam.
      const bandClip = new Path2D();
      if (i) bandClip.rect(-6000, -6000, gw + 12000, SEAM + 6000);
      else bandClip.rect(-6000, SEAM, 6000 + band[2], 9000);
      // Keep the western mainland beach; the northern backdrop needs no bright diagonal ribbon.
      main(band, 86 + i, (B) => { B.cx.clip(bandClip); for (const sh of [shoreS]) { V.strokePts(B, sh, P.shallow, 120, .3); V.strokePts(B, sh, P.sand, 60, 1); V.strokePts(B, sh, P.sandWet, 22, .5, 0, 18); B.cx.setLineDash([16, 8]); V.strokePts(B, sh, P.foam, 3, .7, 0, 32); B.cx.setLineDash([]); } });
      for (let part = 0; part < 4; part++) {
        main(band, 90 + i * 10 + part, (B, r, cb) => { B.cx.clip(bandClip); B.cx.clip(bigP); B.cx.clip(outGrid, 'evenodd'); paintLand(B, r, cb, part); });
        // inside the grid's corners, only where the island's coast leaves sea
        main(band, 120 + i * 10 + part, (B, r, cb) => { if (cb[0] > 0 && cb[1] > 0) return; B.cx.clip(bandClip); B.cx.clip(bigP); B.cx.clip(outCoast, 'evenodd'); B.cx.clip(new Path2D(B.rect(0, 0, gw, 9000))); paintLand(B, r, cb, part); });
      }
      // a soft seam at the grid edge: the island's woods and fells fade into the mainland
      // the part over the island fades out: west across the woods' edge, north down over the sky strip into the island's own fells
      main(band, 140 + i, (B, r, cb) => { B.cx.globalCompositeOperation = 'destination-out';
        if (i === 0) B.f(B.rect(-FADE, Math.max(cb[1], SEAM), FADE * 2 + 10, cb[3] - Math.max(cb[1], SEAM)), B.lin(-FADE, 0, FADE, 0, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]));
        else if (cb[2] > 0) B.f(B.rect(Math.max(cb[0], 0), W.sky - 90, cb[2] - Math.max(cb[0], 0), 130), B.lin(0, W.sky - 90, 0, SEAM - 6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]));
        B.cx.globalCompositeOperation = 'source-over'; });
    }
    void bb;
    // a soft bank of haze over the island's west and north edges, above the woods: the island's ground and the
    // mainland's meet under it, so the whole map shows no straight edge where the cells end
    const rows = W.sky + W.rows * ch, haze = kit.rgba(P.haze, 0), hz = a => kit.rgba(P.haze, a);
    if (C.thing) {
      C.thing({ key: 'mainland-haze-w', x: 0, y: rows, depth: 89990, K: .25, box: [-300, -rows - 800, 260, 0], draw: B => { B.f(B.rect(-300, -rows - 800, 560, rows + 800), B.lin(-300, 0, 260, 0, [[0, haze], [.42, hz(.5)], [.58, hz(.42)], [1, haze]])); } });
      C.thing({ key: 'mainland-haze-n', x: 0, y: 420, depth: 89991, K: .2, box: [-2400, -1400, W.cols * cw + 2400, 0], draw: B => { B.f(B.rect(-2400, -1400, W.cols * cw + 4800, 1400), B.lin(0, -1400, 0, 0, [[0, haze], [.55, hz(.26)], [.73, hz(.34)], [.84, hz(.26)], [1, haze]])); } });
    }
  }
  function B0(pts) { return 'M' + pts.map(p => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L') + 'Z'; }

  V.parts.push({ id: 'mainland', compose });
})();

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
    const outGrid = new Path2D(); outGrid.rect(-6000, -6000, gw + 12000, 16000); outGrid.rect(0, 0, gw, 9000);
    const outCoast = new Path2D(); outCoast.rect(-6000, -6000, gw + 12000, 16000); outCoast.addPath(coastP);
    const shoreS = [[2, 66], [-5, 72.5], [-14, 77], [-28, 81], [-46, 83], [-60, 84]].map(p => cp(p[0], p[1])), shoreE = [[84, 1], [92, -10], [100, -22], [112, -40], [120, -70]].map(p => cp(p[0], p[1]));
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
      if (part === 0) B.f(B.rect(cb[0], cb[1], cb[2] - cb[0], cb[3] - cb[1]), P.mainField[0]);
      if (part === 0)
      // fields: an old patchwork, not a grid. Each field is the patch of ground nearest one of a scatter of
      // farm points (a warped lattice), so fields come in odd sizes and slant every way; their shared edges wobble
      // the same for both neighbours and carry the hedgerows, with hedgerow trees, gates and the odd farmstead.
      fieldsIn(B, cb);
      // woods: the west woods run on, and copses dot the farmland
      if (part === 1) kit.tiles(cb, 90, 40, 82, (tx, ty, rr) => {
        for (let k = 0; k < 5; k++) {
          const x = tx + rr() * 90, y = ty + rr() * 90, nearWest = x > -420 && y > W.sky + 4 * ch && y < W.sky + 74 * ch ? 1 - Math.max(0, -x) / 420 : 0;
          const n = kit.fbm(x / 520, y / 460, 83) + nearWest * .4 * kit.fbm(x / 200, y / 200, 87) + nearWest * nearWest * .5; if (n < .54) continue;
          const s = 22 + rr() * 16; B.f(B.blob(rr, x + 6, y + 8, s, s * .7, 9, .35), P.leaf[0]).f(B.blob(rr, x, y, s * .86, s * .6, 9, .35), P.leaf[1]).f(B.blob(rr, x - s * .3, y - s * .25, s * .4, s * .28, 7, .4), P.leaf[2], .9);
        }
      });
      // fells rising to the north: brown moor, contour rises, then ridges in haze
      if (part === 2 && cb[1] < 0) {
        const fell = C.season === 'winter' ? '#b4b2a0' : C.season === 'autumn' ? '#a89a6a' : '#a2a66e';
        B.f(B.rect(cb[0], cb[1], cb[2] - cb[0], Math.min(0, cb[3]) - cb[1]), B.lin(0, -400, 0, 120, [[0, fell], [1, 'rgba(162,166,110,0)']]));
        for (let ridge = 0; ridge < 4; ridge++) {
          const base = -150 - ridge * 260, col = kit.mix(fell, P.far, Math.min(1, .25 + ridge * .25)), rr = kit.rng(900 + ridge), pts = [];
          for (let x = Math.floor(cb[0] / 160) * 160 - 160; x <= cb[2] + 160; x += 160) { const r2 = kit.rng(kit.hash(x, ridge, 84)); pts.push({ x, y: base - 80 - r2() * 170 - (ridge > 1 ? r2() * 120 : 0) }); }
          const poly = pts.concat([{ x: pts[pts.length - 1].x, y: base + 260 }, { x: pts[0].x, y: base + 260 }]);
          B.f(B.poly(poly), col);
          for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const hi = a.y < b.y ? a : b; B.f(B.poly([hi, { x: hi.x - 50, y: hi.y + 120 }, { x: hi.x + 10, y: hi.y + 130 }]), '#fff', .12); if ((C.season === 'winter' || C.season === 'spring' || ridge > 1) && hi.y < base - 150) B.f(B.poly([hi, { x: hi.x - 26, y: hi.y + 30 }, { x: hi.x + 4, y: hi.y + 22 }, { x: hi.x + 24, y: hi.y + 32 }]), '#f4f6f6', .85); }
          void rr;
        }
      }
      // the long road, leaving from the milestone
      if (part !== 3) return;
      V.strokePts(B, road, '#9c8a66', 20, .7); V.strokePts(B, road, '#dccca2', 14, .95); V.strokePts(B, road, '#efe2bf', 5, .5);
      // haze: the farther, the paler and bluer
      if (cb[0] < 0) B.f(B.rect(cb[0], Math.max(cb[1], 0), Math.min(0, cb[2]) - cb[0], Math.max(0, cb[3] - Math.max(cb[1], 0))), B.lin(-350, 0, -1700, 0, [[0, kit.rgba(P.haze, 0)], [1, kit.rgba(P.haze, .5)]]));
      if (cb[1] < 0) B.f(B.rect(cb[0], cb[1], cb[2] - cb[0], Math.min(0, cb[3]) - cb[1]), B.lin(0, -250, 0, -1300, [[0, kit.rgba(P.haze, 0)], [1, kit.rgba(P.haze, .55)]]));
    };
    const bb = (pts, pad) => kit.bboxOf(pts, pad);
    const bandW = [-1800, -1200, 30, W.sky + 86 * ch], bandN = [-1800, -1200, cp(118, 0).x, 30];
    for (const [i, band] of [bandW, bandN].entries()) {
      // beaches and foam where the mainland meets the sea
      main(band, 86 + i, (B) => { for (const sh of [shoreS, shoreE]) { V.strokePts(B, sh, P.shallow, 120, .3); V.strokePts(B, sh, P.sand, 60, 1); V.strokePts(B, sh, P.sandWet, 22, .5, 0, 18); B.cx.setLineDash([16, 8]); V.strokePts(B, sh, P.foam, 3, .7, 0, 32); B.cx.setLineDash([]); } });
      for (let part = 0; part < 4; part++) {
        main(band, 90 + i * 10 + part, (B, r, cb) => { B.cx.clip(bigP); B.cx.clip(outGrid, 'evenodd'); paintLand(B, r, cb, part); });
        // inside the grid's corners, only where the island's coast leaves sea
        main(band, 120 + i * 10 + part, (B, r, cb) => { if (cb[0] > 0 && cb[1] > 0) return; B.cx.clip(bigP); B.cx.clip(outCoast, 'evenodd'); B.cx.clip(new Path2D(B.rect(0, 0, gw, 9000))); paintLand(B, r, cb, part); });
      }
      // a soft seam at the grid edge: the island's woods and fells fade into the mainland
      main(band, 140 + i, (B, r, cb) => { B.cx.clip(bigP); const g1 = B.lin(-60, 0, 0, 0, [[0, 'rgba(0,0,0,0)'], [1, kit.rgba(P.leaf[0], .18)]]); B.f(B.rect(-60, cb[1], 60, cb[3] - cb[1]), g1); });
    }
    void bb;
    // a soft bank of haze over the island's west and north edges, above the woods: the island's ground and the
    // mainland's meet under it, so the whole map shows no straight edge where the cells end
    const rows = W.sky + W.rows * ch, haze = kit.rgba(P.haze, 0), hz = a => kit.rgba(P.haze, a);
    if (C.thing) {
      C.thing({ key: 'mainland-haze-w', x: 0, y: rows, depth: 89990, K: .25, box: [-300, -rows - 800, 260, 0], draw: B => { B.f(B.rect(-300, -rows - 800, 560, rows + 800), B.lin(-300, 0, 260, 0, [[0, haze], [.42, hz(.5)], [.58, hz(.42)], [1, haze]])); } });
      C.thing({ key: 'mainland-haze-n', x: 0, y: 420, depth: 89991, K: .25, box: [-300, -640, W.cols * cw + 300, 0], draw: B => { B.f(B.rect(-300, -640, W.cols * cw + 600, 640), B.lin(0, -640, 0, 0, [[0, hz(.15)], [.4, hz(.5)], [.62, hz(.38)], [1, haze]])); } });
    }
  }
  function B0(pts) { return 'M' + pts.map(p => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L') + 'Z'; }

  V.parts.push({ id: 'mainland', compose });
})();

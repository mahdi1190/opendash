/* Painted vale: the mainland. Past the west and north edges the land runs on
 * (presentation.mainland): the woods go on west into a patchwork of small
 * fields and hedgerows, the long road leaves from the milestone and winds away
 * into the haze, and to the north the fells rise into ridges, blue with
 * distance, snow on them in winter. No cells: nothing to walk or save. It is
 * seen from far off, so it is baked at half a canvas pixel per world pixel and
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

    const paintLand = (B, r, cb) => {
      B.f(B.rect(cb[0], cb[1], cb[2] - cb[0], cb[3] - cb[1]), P.mainField[0]);
      // fields: hashed tiles, each a patch of crop or pasture with a hedge and a hedgerow tree or two
      kit.tiles(cb, 200, 60, 81, (tx, ty, rr) => {
        const x = tx + rr() * 30, y = ty + rr() * 20, w = 170 + rr() * 40, h = 120 + rr() * 50, col = P.mainField[Math.floor(rr() * P.mainField.length)];
        const q = [[x, y], [x + w, y + (rr() - .5) * 20], [x + w + (rr() - .5) * 20, y + h], [x + (rr() - .5) * 20, y + h + (rr() - .5) * 16]];
        B.f(B.poly(q), col, .85);
        if (rr() < .4) for (let k = 0; k < 6; k++) B.s(`M${x + 8} ${y + 12 + k * h / 7}L${x + w - 8} ${y + 10 + k * h / 7}`, kit.mix(col, '#6a7a3a', .25), 2, .35);
        B.s(B.poly(q), '#4f6a34', 5, .75);
        for (let k = 0; k < 4; k++) { const e = Math.floor(rr() * 4), a = q[e], b = q[(e + 1) % 4], t = rr(); B.f(B.blob(rr, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4, 9 + rr() * 8, 7 + rr() * 5, 8, .4), P.leaf[Math.floor(rr() * 2)], .95); }
        if (rr() < .12) { const fx = x + w * .5, fy = y + h * .5; B.f(B.rect(fx - 9, fy - 8, 18, 10), '#d8ccb0').f(`M${fx - 11} ${fy - 8}L${fx} ${fy - 16}L${fx + 11} ${fy - 8}Z`, '#8a5a44'); }
      });
      // woods: the west woods run on, and copses dot the farmland
      kit.tiles(cb, 90, 40, 82, (tx, ty, rr) => {
        for (let k = 0; k < 5; k++) {
          const x = tx + rr() * 90, y = ty + rr() * 90, nearWest = x > -700 && y > W.sky + 6 * ch && y < W.sky + 70 * ch ? 1 - Math.max(0, -x) / 700 : 0;
          const n = kit.fbm(x / 700, y / 600, 83) + nearWest * .35; if (n < .6) continue;
          const s = 22 + rr() * 16; B.f(B.blob(rr, x + 6, y + 8, s, s * .7, 9, .35), P.leaf[0]).f(B.blob(rr, x, y, s * .86, s * .6, 9, .35), P.leaf[1]).f(B.blob(rr, x - s * .3, y - s * .25, s * .4, s * .28, 7, .4), P.leaf[2], .9);
        }
      });
      // fells rising to the north: brown moor, contour rises, then ridges in haze
      if (cb[1] < 0) {
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
      V.strokePts(B, road, '#9c8a66', 20, .7); V.strokePts(B, road, '#dccca2', 14, .95); V.strokePts(B, road, '#efe2bf', 5, .5);
      // haze: the farther, the paler and bluer
      if (cb[0] < 0) B.f(B.rect(cb[0], Math.max(cb[1], 0), Math.min(0, cb[2]) - cb[0], Math.max(0, cb[3] - Math.max(cb[1], 0))), B.lin(0, 0, -1600, 0, [[0, kit.rgba(P.haze, 0)], [1, kit.rgba(P.haze, .8)]]));
      if (cb[1] < 0) B.f(B.rect(cb[0], cb[1], cb[2] - cb[0], Math.min(0, cb[3]) - cb[1]), B.lin(0, 0, 0, -1600, [[0, kit.rgba(P.haze, 0)], [1, kit.rgba(P.haze, .8)]]));
    };
    const bb = (pts, pad) => kit.bboxOf(pts, pad);
    const bandW = [-2400, -1700, 30, W.sky + 86 * ch], bandN = [-2400, -1700, cp(122, 0).x, 30];
    for (const [i, band] of [bandW, bandN].entries()) {
      // beaches and foam where the mainland meets the sea
      main(band, 86 + i, (B, r, cb) => {
        for (const sh of [shoreS, shoreE]) { V.strokePts(B, sh, P.shallow, 120, .3); V.strokePts(B, sh, P.sand, 60, 1); V.strokePts(B, sh, P.sandWet, 22, .5, 0, 18); B.cx.setLineDash([16, 8]); V.strokePts(B, sh, P.foam, 3, .7, 0, 32); B.cx.setLineDash([]); }
        B.cx.save(); B.cx.clip(bigP); B.cx.clip(outGrid, 'evenodd'); paintLand(B, r, cb); B.cx.restore();
        // inside the grid's corners, only where the island's coast leaves sea
        B.cx.save(); B.cx.clip(bigP); B.cx.clip(outCoast, 'evenodd'); B.cx.clip(new Path2D(B.rect(0, 0, gw, 9000))); paintLand(B, r, cb); B.cx.restore();
        // a soft seam at the grid edge: the island's woods and fells fade into the mainland
        B.cx.save(); B.cx.clip(bigP); const g1 = B.lin(-60, 0, 0, 0, [[0, 'rgba(0,0,0,0)'], [1, kit.rgba(P.leaf[0], .18)]]); B.f(B.rect(-60, cb[1], 60, cb[3] - cb[1]), g1); B.cx.restore();
      });
    }
    void bb;
  }
  function B0(pts) { return 'M' + pts.map(p => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('L') + 'Z'; }

  V.parts.push({ id: 'mainland', compose });
})();

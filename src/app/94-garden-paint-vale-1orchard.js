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
    const reg = (L.D.regions || []).find(r => r.id === 'orchard-headland'); if (!reg || !window.GardenPaintWood || !GardenPaintWood.orchardTree) return;
    const loops = (reg.polygons || []).map(l => l.map(L.pt)), regP = V.loopPath(loops), coastP = V.loopPath(L.coast), rb = kit.bboxOf(loops.flat(), 20);
    const walls = (L.D.landforms || []).filter(f => f.kind === 'terrace-wall' && f.polygon).map(f => f.polygon);
    const nearWall = (x, y, d) => walls.some(poly => poly.some(p => Math.abs(p[0] - x) < d && Math.abs(p[1] - y) < d * .8));
    // This lawn sits above the fells layer. Its cell-sized lobes must not
    // overpaint the shared water contours or the terrace masonry below it.
    const groundCuts = (L.D.freshwater || []).filter(f => f.boundary).map(f => f.boundary.map(L.pt));
    for (const poly of walls) {
      const n = poly.length >> 1, a = poly.slice(0, n), b = poly.slice(n).reverse();
      const north = a.reduce((s, p) => s + p[1], 0) <= b.reduce((s, p) => s + p[1], 0);
      const upper = (north ? a : b).map(L.pt), lower = (north ? b : a).map(L.pt);
      // terraceOps draws upright coping up to six pixels above the upper rim.
      groundCuts.push(upper.map(p => ({ x: p.x, y: p.y - 7 })).concat(lower.slice().reverse()));
    }
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
      V.lawn(B, r, L, P, cb, (x, y) => grass(x, y), null, { salt: 91, base: kit.mix(P.lawn, '#b8c47a', season === 'winter' ? 0 : .25) });
      // mown strips: soft horizontal bands, one lobe per grass cell on every other row, so they stop softly at paths
      { const x0 = Math.floor(cb[0] / cw) - 1, x1 = Math.ceil(cb[2] / cw) + 1, y0 = Math.floor((cb[1] - W.sky) / ch) - 1, y1 = Math.ceil((cb[3] - W.sky) / ch) + 1; for (let y = y0; y <= y1; y++) { if (y % 2) continue; for (let x = x0; x <= x1; x++) if (grass(x, y)) B.f(B.ell((x + .5) * cw, W.sky + (y + .5) * ch, cw * .78, ch * .36), season === 'winter' ? '#c4cab8' : '#c2cc84', .2); } }
      kit.tiles(cb, 100, 20, 92, (tx, ty, rr) => { for (let k = 0; k < 8; k++) { const x = tx + rr() * 100, y = ty + rr() * 100, cx = x / cw, cy = (y - W.sky) / ch; if (!grass(Math.floor(cx), Math.floor(cy))) continue;
        if (cy < 25 && cx > 69 && cx < 79) { B.heather(rr, x, y, 7 + rr() * 5, { heather: '#8d6a92', heatherLo: '#5f4a62', heatherHi: '#b07ab8' }, season === 'summer' ? '#c79ac0' : null); continue; }
        if (cx > 81.5 && cy > 33.5 && cy < 39.5) { if (season === 'spring' || season === 'summer') for (let f = 0; f < 5; f++) B.f(B.circ(x + (rr() - .5) * 14, y + (rr() - .5) * 6, 1.6), f % 3 ? '#f0d24a' : '#f8f4e8', .95); B.tufts(rr, x, y, 10, 4, [P.lawnLo, '#9a9a52'], 7); continue; }
        if (rr() < .3) B.tufts(rr, x, y, 10, 4, [P.lawnLo, P.lawnHi], 6); } });
    }, {});

    // 2. Trees in rows along the terraces, clear of everything the player uses
    const trees = [], kinds = GardenPaintWood.orchardKinds || ['apple'];
    for (let y = 21.6, row = 0; y < 47; y += 1.75, row++) for (let x = 60 + (row % 2) * 1.1; x < 89; x += 2.3) {
      const jx = x + (kit.hash(Math.round(x * 10), Math.round(y * 10), 93) % 100) / 100 * .7 - .35, jy = y + (kit.hash(Math.round(x * 10), Math.round(y * 10), 94) % 100) / 100 * .5 - .25;
      const fx = Math.floor(jx), fy = Math.floor(jy);
      if (!grass(fx, fy) || !grass(fx - 1, fy) || !grass(fx + 1, fy) || !grass(fx, fy - 1) || !L.free(jx, jy) || L.plot(jx, jy) || L.plot(jx, jy - 1) || nearWall(jx, jy, 1.3)) continue;
      // the thyme terrace and the cowslip rise stay open: no rows there
      if (jy < 25 || (jx > 81.5 && jy > 33.5 && jy < 39.5)) continue;
      if (kit.hash(fx, fy, 95) % 7 === 0) continue;   // a gap now and then, so rows read as planted, not stamped
      trees.push({ x: jx, y: jy, kind: ROWS[row % ROWS.length], h: 92 + kit.hash(fx, fy, 96) % 36, v: kit.hash(fx, fy, 97) % 3 });
    }
    // the ring of eight old perry pears round the mown centre
    const ring = L.stat('ld-ring');
    if (ring) { const c = L.cpt(ring.x + ring.w / 2, ring.y + .5); add([c.x - 170, c.y - 80, c.x + 170, c.y + 80], 99, (B, r) => { B.f(B.blob(r, c.x, c.y, 150, 58, 14, .12), season === 'winter' ? '#c4cab8' : '#b8c47a', .45); B.s(B.blob(r, c.x, c.y, 150, 58, 14, .12), P.lawnLo, 5, .25); for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 150 + r() * 16; B.tufts(r, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * .4, 8, 4, [P.lawnLo, '#9a9a52'], 8); } }); }
    if (ring) { const c = { x: ring.x + ring.w / 2, y: ring.y + .5 }; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, x = c.x + Math.cos(a) * 3.1, y = c.y + Math.sin(a) * 1.9; if (inReg(x, y) && L.kind(x, y) !== 'path') trees.push({ x, y, kind: 'pear', h: 132 + (i * 7) % 20, v: i % 3 }); } }
    for (const t of trees) { const p = L.cpt(t.x, t.y); thing({ y: p.y, make: scene => GardenPaintWood.orchardTree(scene, { kind: kinds.includes(t.kind) ? t.kind : 'apple', season, h: t.h, x: p.x, y: p.y, v: t.v, flip: (Math.round(t.x * 7) % 2) === 1 }) }); }
    // windfalls under the trees in autumn
    if (season === 'autumn' && trees.length) add(kit.bboxOf(trees.map(t => L.cpt(t.x, t.y)), 40), 98, (B, r) => { for (const t of trees) { const p = L.cpt(t.x, t.y); for (let k = 0; k < 5; k++) B.f(B.circ(p.x + (r() - .5) * 40, p.y + (r() - .3) * 10, 2.2), r() < .6 ? '#c8442e' : '#e0b23a', .9); } });
    // the Mother tree: the oldest apple, leaning, propped on a crutch
    const mt = L.cpt(84.6, 45.2);
    if (inReg(84.6, 45.2)) {
      thing({ y: mt.y, make: scene => { const im = GardenPaintWood.orchardTree(scene, { kind: 'apple', season, h: 170, x: mt.x, y: mt.y, v: 2 }); if (im) im.setAngle(-9); return im; } });
      thing({ key: 'crutch', x: mt.x + 26, y: mt.y + 2, box: [-30, -80, 10, 6], draw: B => { B.s('M0 0L-22 -66', '#6a5034', 4).s('M-28 -64L-15 -70', '#6a5034', 4).s('M0 0L-22 -66', '#9a7a54', 1.4, .7); } });
    }
  }

  V.parts.push({ id: 'orchard', compose });
})();

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
        if (rr() < .3) B.tufts(rr, x, y, 10, 4, [P.lawnLo, P.lawnHi], 6); } });
    }, {});

    // 2. Trees in rows along the terraces, clear of everything the player uses
    const trees = [], kinds = GardenPaintWood.orchardKinds || ['apple'];
    // What the rows keep clear of, measured from the painted shapes, not cell centres: a trunk never stands on a
    // path's ribbon or the cider square's setts, in the stair's mouth, at the pond's lip or crowding the ring.
    const ROUTE_IDS = ['orchard-stair', 'orchard-pass', 'folly-trail', 'east-beach', 'lakeside-steps', 'orchard-rows', 'pass-summit'];
    const ribbons = ROUTE_IDS.map(id => { const rt = L.routes.get(id); return rt && rt.points && rt.points.length > 1 ? { w: rt.widthCells || 1.4, pts: gardenIslandRoutePath(rt).points } : null; }).filter(Boolean);
    const segD = (px, py, a, b) => { const ax = a.x * cw, ay = a.y * ch, bx = b.x * cw, by = b.y * ch, dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
    const offPath = (x, y, pad) => ribbons.every(rb2 => { const lim = rb2.w / 2 * cw * .5 + pad; for (let i = 1; i < rb2.pts.length; i++) if (segD(x * cw, y * ch, rb2.pts[i - 1], rb2.pts[i]) < lim) return false; return true; });
    const sq = L.routes.get('cider-square'), sqA = sq && sq.points ? sq.points[0] : null, sqB = sq && sq.points ? sq.points[sq.points.length - 1] : null;
    const offSquare = (x, y) => { if (!sqA) return true; const cx = Math.max(sqA[0], Math.min(sqB[0], x)), cy = sqA[1] + (sqB[1] - sqA[1]) * ((cx - sqA[0]) / ((sqB[0] - sqA[0]) || 1)); return ((x - cx) / 2.7) ** 2 + ((y - cy) / 2.5) ** 2 > 1; };
    const gate = (L.D.gates || []).find(g => g.id === 'island-orchard'), offGate = (x, y) => !gate || Math.abs(x - gate.x - .5) > 3.4 || y < gate.y - 3.2 || y > gate.y + 2;
    const dryLip = (x, y) => [[0, 0], [1.1, 0], [-1.1, 0], [0, 1], [0, -1.2], [.8, .8], [-.8, .8]].every(([dx, dy]) => L.kind(x + dx, y + dy) !== 'water');
    const ringS = L.stat('ld-ring'), ringC = ringS ? { x: ringS.x + ringS.w / 2, y: ringS.y + .5 } : null;
    const clearOf = (x, y) => offPath(x, y, 5) && offSquare(x, y) && offGate(x, y) && dryLip(x, y);
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
      if (Math.hypot(jx - 84.6, (jy - 45.2) * 1.4) < 2.4) continue;   // room round the Mother tree
      if (kit.hash(fx, fy, 95) % 8 === 0) continue;   // a gap now and then, so rows read as planted, not stamped
      trees.push({ x: jx, y: jy, kind: ROWS[row % ROWS.length], h: 92 + kit.hash(fx, fy, 96) % 36, v: kit.hash(fx, fy, 97) % 3 });
    }
    // then fill the gaps the plots and paths leave: the same rules, a finer sieve, never closer than a row's spacing to a neighbour
    for (let y = 25.2; y < 47; y += .9) for (let x = 60.4 + (Math.round(y * 10) % 2) * .5; x < 89; x += 1.05) {
      if (trees.length >= 64) break;
      const jx = x + (kit.hash(Math.round(x * 10), Math.round(y * 10), 98) % 100) / 100 * .4 - .2, jy = y + (kit.hash(Math.round(x * 10), Math.round(y * 10), 99) % 100) / 100 * .3 - .15, fx = Math.floor(jx), fy = Math.floor(jy);
      if (!(inReg(fx, fy) && grass(fx, fy)) || !L.free(jx, jy) || L.plot(jx, jy) || L.plot(jx, jy - 1) || L.plot(jx - .8, jy) || L.plot(jx + .8, jy) || nearWall(jx, jy, 1.3)) continue;
      if ((jx > 81.5 && jy > 33.5 && jy < 39.5) || (jx > 82 && jy < 33.5) || !clearOf(jx, jy)) continue;
      if (ringC && ((jx - ringC.x) / 4.6) ** 2 + ((jy - ringC.y) / 3) ** 2 < 1 || Math.hypot(jx - 84.6, (jy - 45.2) * 1.4) < 2.4) continue;
      if (trees.some(t => ((t.x - jx) / 2.05) ** 2 + ((t.y - jy) / 1.6) ** 2 < 1)) continue;
      const row = Math.round((jy - 21.6) / 1.75);
      trees.push({ x: jx, y: jy, kind: ROWS[((row % ROWS.length) + ROWS.length) % ROWS.length], h: 88 + kit.hash(fx, fy, 96) % 36, v: kit.hash(fx, fy, 97) % 3 });
    }
    // the ring of eight old perry pears round the mown centre
    const ring = L.stat('ld-ring');
    if (ring) { const c = L.cpt(ring.x + ring.w / 2, ring.y + .5); add([c.x - 170, c.y - 80, c.x + 170, c.y + 80], 99, (B, r) => { B.f(B.blob(r, c.x, c.y, 150, 58, 14, .12), season === 'winter' ? '#c4cab8' : '#b8c47a', .45); B.s(B.blob(r, c.x, c.y, 150, 58, 14, .12), P.lawnLo, 5, .25); for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 150 + r() * 16; B.tufts(r, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * .4, 8, 4, [P.lawnLo, '#9a9a52'], 8); } }); }
    if (ring) { const c = { x: ring.x + ring.w / 2, y: ring.y + .5 }; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2, x = c.x + Math.cos(a) * 3.1, y = c.y + Math.sin(a) * 1.9; if (inReg(x, y) && L.kind(x, y) !== 'path' && offPath(x, y, 4) && offSquare(x, y)) trees.push({ x, y, kind: 'pear', h: 132 + (i * 7) % 20, v: i % 3 }); } }
    // their trunks are solid where they stand (the leaves are for walking behind): GardenPaintVale.orchardTrunks(), 94-garden-world-0walk.js
    trunks = trees.map(t => [+t.x.toFixed(2), +t.y.toFixed(2), t.h > 125 ? .42 : .32]).concat(inReg(84.6, 45.2) ? [[84.6, 45.2, .5]] : []);
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

  // The orchard's trunks as [x, y, width] in cells, while the painted vale is what is shown (null otherwise).
  let trunks = null;
  // The painted orchard plants its own rows, so the world leaves out its generic grove stands there (94-garden-native-world.js).
  V.ownsRegion = id => id === 'orchard-headland' && V.wanted();
  V.orchardTrunks = () => (V.wanted() && trunks) || null;
  V.parts.push({ id: 'orchard', compose });
})();

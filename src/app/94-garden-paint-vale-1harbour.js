/* Painted vale: the quay and the harbour, where travellers and friends land.
 * A flagged quay with its harbour wall dropping to the tide, steps and mooring
 * rings, the promenade running down to it, the strand and the lighthouse walk,
 * sand with its wrack line, shells and ripples, the bay's shallows and lace of
 * foam, the lighthouse on its rocks with thrift in the turf, and the harbour's
 * clutter standing up: bollards, crates, lobster pots, a net drying, boats on
 * the sand and at their moorings. All from the layout (the quay plaza, routes,
 * coast and statics); see 94-garden-paint-vale-0kit.js for the layers. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const QUAY = { x0: 34, x1: 69, y0: 67, y1: 92 };

  function bayCoast(L) {
    // the longest run of coast points that faces the bay
    let best = [], run = [];
    for (const loop of L.coast) { for (const p of loop.concat(loop)) { const cx = p.x / L.cw, cy = (p.y - L.W.sky) / L.ch; if (cx > QUAY.x0 && cx < QUAY.x1 && cy > 75) run.push(p); else { if (run.length > best.length) best = run; run = []; } } if (run.length > best.length) best = run; run = []; }
    return best.sort((a, b) => a.x - b.x);
  }

  function compose(C) {
    const { L, P, kit, W, add, thing } = C, cw = L.cw, ch = L.ch, cpt = L.cpt;
    const quay = (L.pres.plazas || []).find(p => p.id === 'the-quay'); if (!quay) return;
    const box = [QUAY.x0 * cw, W.sky + QUAY.y0 * ch, QUAY.x1 * cw, W.sky + QUAY.y1 * ch];
    const coastP = V.loopPath(L.coast), outside = new Path2D(); outside.rect(box[0] - 400, box[1] - 400, box[2] - box[0] + 800, box[3] - box[1] + 800); outside.addPath(coastP);
    const bay = bayCoast(L);
    const smooth = (a, b, t) => Math.max(0, Math.min(1, (t - a) / (b - a)));
    // the village ground ends at its box (start + 17 rows, x within start +/- 18): feather into it
    const st = L.D.anchors.start, vx0 = st.x - 18, vx1 = st.x + 19, vy1 = st.y + 18;
    const fade = (x, y) => smooth(vy1 - 2.6, vy1 - .2, y) * Math.min(smooth(QUAY.x0 + .5, QUAY.x0 + 2.5, x), 1 - smooth(QUAY.x1 - 3, QUAY.x1 - .5, x)) * (x < vx0 || x > vx1 ? 1 : 1);

    // 1. Grass over the plain ground between the village and the beach
    add(box, 31, (B, r, cb) => { B.cx.clip(coastP); V.lawn(B, r, L, P, cb, (x, y) => y >= QUAY.y0 && L.kind(x + .5, y + .5) === 'grass', fade, { salt: 31 }); });

    // 2. The bay: shallows and lace of foam outside the coast, wet sand, a wrack line and shells inside it
    if (bay.length > 2) {
      add([box[0] - 60, box[1] + 200, box[2] + 60, box[3] + 200], 32, (B, r) => {
        B.cx.save(); B.cx.clip(outside, 'evenodd');
        V.strokePts(B, bay, P.shallow, 150, .22, 0, 30); V.strokePts(B, bay, P.shallow, 80, .3, 0, 14); V.strokePts(B, bay, '#b7d8cf', 34, .35, 0, 6);
        // sand ripples seen through the shallows
        for (const p of V.walk(bay, 26)) for (let k = 0; k < 2; k++) { const d = 14 + r() * 50, x = p.x + (r() - .5) * 20; B.s(`M${x - 9} ${p.y + d}q9 -3 18 0`, '#d8e6d8', 1.1, .25); }
        // the lace: broken lines of foam at the edge and a fainter line further out
        B.cx.setLineDash([14, 6, 4, 9]); V.strokePts(B, bay, P.foam, 2.6, .85, 0, 3); B.cx.setLineDash([22, 14, 6, 18]); V.strokePts(B, bay, P.foam, 1.6, .45, 0, 15); B.cx.setLineDash([]);
        B.cx.restore();
        B.cx.save(); B.cx.clip(coastP);
        V.strokePts(B, bay, P.sandWet, 30, .55); V.strokePts(B, bay, P.sandWet, 12, .5, 0, -2);
        // the wrack line: dark weed and drift at the last high tide
        for (const p of V.walk(bay, 7)) { if (r() < .25) continue; const y = p.y - 26 - Math.sin(p.x / 60) * 5 + (r() - .5) * 4; B.f(B.blob(r, p.x, y, 2 + r() * 4, 1 + r() * 1.2, 6, .6), r() < .6 ? '#5e5a3a' : '#7a6a48', .7); if (r() < .12) B.f(B.rr(p.x - 5, y - 1, 10 + r() * 6, 2.2, 1), '#a08a66', .8); }
        // shells, pebbles and ripples on the dry sand
        kit.tiles(box, 90, 0, 33, (tx, ty, rr) => { for (let k = 0; k < 10; k++) { const x = tx + rr() * 90, y = ty + rr() * 90; if (L.kind(x / cw, (y - W.sky) / ch) !== 'beach') continue; const t = rr();
          if (t < .35) B.s(`M${x - 7} ${y}q7 -2.4 14 0`, P.sandDk, 1, .28); else if (t < .6) B.f(B.ell(x, y, 1.6, 1.1), ['#f6efe0', '#e8c4b8', '#d8d0c0'][Math.floor(rr() * 3)], .95); else if (t < .8) B.f(B.ell(x, y, 2 + rr() * 2, 1.2 + rr()), ['#a89c88', '#8c8474', '#c2b8a4'][Math.floor(rr() * 3)], .9); } });
        B.cx.restore();
      });
    }

    // 3. Paths: the promenade's last stretch, the strand and the lighthouse walk, as worn flags and sandy tracks
    const promenade = L.routePts('harbour-walk').filter(p => (p.y - W.sky) / ch > vy1 - 4);
    if (promenade.length > 1) add(kit.bboxOf(promenade, 80), 34, (B, r) => {
      V.strokePts(B, promenade, 'rgba(46,52,30,.22)', 112, 1, 2, 4); V.strokePts(B, promenade, P.kerb, 108, 1);
      const p = new Path2D(); p.moveTo(promenade[0].x, promenade[0].y); for (const q of promenade) p.lineTo(q.x, q.y); B.cx.save(); B.cx.lineWidth = 100; B.cx.lineCap = 'butt';
      // clip to the stroke: draw flags into a band (the stroke's own outline)
      const band = new Path2D(); const N = kit.normals(promenade); band.moveTo(promenade[0].x + N[0].x * 50, promenade[0].y + N[0].y * 50); for (let i = 1; i < promenade.length; i++) band.lineTo(promenade[i].x + N[i].x * 50, promenade[i].y + N[i].y * 50); for (let i = promenade.length - 1; i >= 0; i--) band.lineTo(promenade[i].x - N[i].x * 50, promenade[i].y - N[i].y * 50); band.closePath();
      B.cx.clip(band); const bb = kit.bboxOf(promenade, 60); V.flags(B, r, P, bb, { row: 13, w: 24, salt: 34, moss: .05 });
      // the feather: the village's own promenade above, so this one fades in over it
      B.cx.restore();
    }, { });
    for (const id of ['strand', 'lighthouse-walk', 'coast-walk']) {
      const pts = L.routePts(id); if (pts.length < 2) continue;
      add(kit.bboxOf(pts, 40), 35 + id.length, (B, r) => {
        V.strokePts(B, pts, P.pathEdge, 30, .55); V.strokePts(B, pts, P.path, 24, .9); V.strokePts(B, pts, P.pathWear, 9, .6);
        for (const q of V.walk(pts, 7)) { if (r() < .4) continue; const s = (r() < .5 ? -1 : 1) * (8 + r() * 6); B.f(B.ell(q.x - q.ty * s, q.y + q.tx * s, 1.4 + r() * 1.6, 1 + r()), r() < .5 ? P.pathEdge : P.sandDk, .7); }
      });
    }

    // 4. The quay: flags in courses with a granite kerb, the harbour wall down to the tide, steps, rings and rope
    const qa = cpt(quay.x - 6.1, quay.y - 1.9), qb = cpt(quay.x + 6.3, quay.y + 1.65), qx0 = qa.x, qx1 = qb.x, qy0 = qa.y, qy1 = qb.y, face = 19;
    const quayShape = `M${qx0 + 26} ${qy0}L${qx1 - 26} ${qy0}Q${qx1} ${qy0} ${qx1} ${qy0 + 18}L${qx1} ${qy1}L${qx0} ${qy1}L${qx0} ${qy0 + 18}Q${qx0} ${qy0} ${qx0 + 26} ${qy0}Z`;
    add([qx0 - 40, qy0 - 30, qx1 + 40, qy1 + face + 30], 41, (B, r) => {
      B.cx.filter = 'blur(3px)'; B.f(B.rect(qx0 + 4, qy1 + 2, qx1 - qx0, face + 6), '#2e3a36', .25); B.cx.filter = 'none';
      // the harbour wall's face: big dressed blocks, darker and weedy towards the tide, lit at the top
      B.f(B.rect(qx0, qy1, qx1 - qx0, face), B.lin(0, qy1, 0, qy1 + face, [[0, P.wall], [.6, P.wallLo], [1, '#4e5a4a']]));
      for (let row = 0; row < 3; row++) { const y = qy1 + row * face / 3; for (let x = qx0 + (row % 2) * 9; x < qx1; x += 16 + r() * 8) { const w = 14 + r() * 8; B.f(B.rr(x + 1, y + 1, Math.min(w, qx1 - x) - 2, face / 3 - 2, 1.5), row === 2 ? '#6e7462' : r() < .5 ? P.wall : P.wallHi, row === 2 ? .8 : .7); } }
      for (let x = qx0; x < qx1; x += 6) if (r() < .7) B.f(B.blob(r, x, qy1 + face - 2, 4 + r() * 4, 2 + r() * 2.5, 6, .6), r() < .5 ? '#4a5a34' : '#6a7440', .8);
      for (let x = qx0 + 30; x < qx1 - 20; x += 70 + r() * 30) { B.s(`M${x} ${qy1 + 7}a3 3 0 1 0 0.1 0`, P.iron, 1.4, .9); B.s(`M${x} ${qy1 + 2}l0 2`, P.iron, 1.6, .9); }
      // the flags, then a kerb of long granite copes along the sea edge
      B.cx.save(); B.cx.clip(new Path2D(quayShape)); V.flags(B, r, P, [qx0, qy0, qx1, qy1], { row: 15, w: 30, salt: 41, moss: .06 });
      // feet have worn a paler way from the promenade to the pier
      B.f(B.blob(r, (qx0 + qx1) / 2 - 20, (qy0 + qy1) / 2, 70, 26, 9, .3), P.stoneHi, .3);
      B.cx.restore();
      for (let x = qx0; x < qx1; ) { const w = 22 + r() * 14, ww = Math.min(w, qx1 - x); B.f(B.rr(x + .6, qy1 - 5, ww - 1.2, 6, 1.5), r() < .5 ? '#b4ab94' : '#a59c86').f(B.rect(x + 1, qy1 - 4.6, ww - 2, 1.6), P.stoneHi, .7); x += w; }
      B.s(quayShape, P.kerb, 2.2, .7);
      // steps down the wall at each end, a rope coil and a lost glove
      for (const sx of [qx0 + 24, qx1 - 40]) for (let k = 0; k < 4; k++) B.f(B.rect(sx, qy1 + k * 4.6, 18, 5), k % 2 ? P.wallLo : P.wallHi).f(B.rect(sx, qy1 + k * 4.6 + 3.6, 18, 1.2), P.wallDk, .5);
      const rc = { x: (qx0 + qx1) / 2 + 52, y: qy1 - 14 }; for (let k = 0; k < 4; k++) B.s(B.ell(rc.x, rc.y, 7 - k * 1.4, 3.6 - k * .7), k % 2 ? P.rope : '#a88a54', 1.6, .95);
      B.s(`M${rc.x + 6} ${rc.y}q12 2 18 9`, P.rope, 1.4, .9);
    });

    // 5. The lighthouse on its rocks: weed-dark boulders at the tide, turf with thrift above, a rock pool
    const lh = L.stat('ld-lighthouse');
    if (lh) { const c = cpt(lh.x + .5, lh.y + 1.2);
      add([c.x - 170, c.y - 110, c.x + 190, c.y + 120], 43, (B, r) => {
        const P2 = { rock: '#a0988a', rockLo: '#7a7266', rockHi: '#cfc6b2', rockDk: '#4a443c', lichen: '#d8c86a' };
        // the rock pool
        B.f(B.blob(r, c.x - 70, c.y + 52, 22, 9, 9, .3), '#6f6a5c').f(B.blob(r, c.x - 70, c.y + 51, 19, 7, 9, .3), '#7fb3b4').f(B.ell(c.x - 74, c.y + 49, 8, 1.6), '#e4f2ee', .7);
        const rocks = []; for (let i = 0; i < 26; i++) { const a = Math.PI * (.05 + r() * .9), d = 40 + r() * 110; rocks.push([c.x + Math.cos(a) * d * 1.3 - 10, c.y + Math.sin(a) * d * .7 + 6, 10 + r() * 18]); }
        rocks.sort((a, b) => a[1] - b[1]);
        for (const [x, y, s] of rocks) { B.boulder(r, x, y, s * 1.5, s * .8, P2, false); if (y > c.y + 40) B.f(B.blob(r, x, y - 1, s * .8, s * .2, 7, .5), '#4f5a36', .75); }
        // thrift and sea campion in the turf above the rocks
        for (let i = 0; i < 26; i++) { const x = c.x - 120 + r() * 240, y = c.y - 90 + r() * 70; if (L.kind(x / cw, (y - W.sky) / ch) !== 'grass') continue; B.f(B.blob(r, x, y, 6, 3.4, 7, .4), '#6f8a4a').f(B.blob(r, x - 1, y - 2, 4, 2, 6, .4), '#86a058', .9); for (let k = 0; k < 5; k++) B.f(B.circ(x + (r() - .5) * 8, y - 3 - r() * 3, 1.3), C.season === 'winter' ? '#c8c0b8' : '#e8a0b8', .95); }
      });
    }

    // 6. Things that stand up on the quay, the sand and the water
    const atCell = (x, y) => ({ x: x * cw, y: W.sky + y * ch });
    const spot = (x, y, want) => { const k = L.kind(x, y); return L.free(x, y) && (!want || want.includes(k)); };
    // bollards along the wall's top, clear of the pier
    for (let x = quay.x - 5.4; x < quay.x + 6; x += 1.45) { if (x > 48.7 && x < 52.4) continue; const p = atCell(x, quay.y + 1.5); thing({ key: 'bollard', box: [-8, -16, 10, 5], x: p.x, y: p.y, draw: drawBollard(P) }); }
    const put = (cands, want, key, box, draw) => { for (const [x, y] of cands) if (spot(x, y, want)) { const p = atCell(x, y); thing({ key, box, x: p.x, y: p.y, draw }); return true; } return false; };
    put([[44.3, 76.6], [43.6, 75.4], [57.3, 75.4]], ['path', 'grass', 'beach'], 'crates', [-30, -46, 34, 8], drawCrates(P, 1));
    put([[57.6, 75.2], [58.3, 76.2], [43.2, 77.6]], ['path', 'grass', 'beach'], 'pots', [-28, -34, 30, 6], drawPots(P));
    put([[38.6, 80.6], [39.4, 80.2], [37.6, 81.6]], ['beach', 'grass'], 'net', [-42, -60, 44, 8], drawNet(P));
    put([[38.4, 83.6], [37.4, 84.4], [42.6, 81.2]], ['beach'], 'boat-sand', [-46, -26, 48, 10], drawBoat(P, '#3f6f8a', false));
    put([[53.2, 76.1], [46.6, 77.9]], ['path', 'beach'], 'crate1', [-16, -24, 18, 6], drawCrates(P, 0));
    put([[53.4, 78.55], [46.2, 78.6]], ['path', 'beach'], 'bench', [-30, -30, 30, 6], drawBench(P));
    put([[44.7, 78.7], [56.4, 76.4]], ['path', 'beach', 'grass'], 'anchor', [-22, -40, 22, 6], drawAnchor(P));
    put([[48.3, 78.6], [52.9, 77.2]], ['path', 'beach'], 'fishbox', [-16, -16, 18, 5], drawFishBox(P));
    // boats at their moorings and two buoys, out on the bay
    for (const [x, y, col, k] of [[45.6, 83.6, '#a8402e', 'boat-a'], [54.4, 84.6, '#2f6a5a', 'boat-b'], [42.4, 86.8, '#d8c890', 'boat-c']]) { const b = L.base(x, y); if (b && b.ocean) { const p = atCell(x, y); thing({ key: k, box: [-54, -26, 58, 14], x: p.x, y: p.y, draw: drawBoat(P, col, true) }); } }
    for (const [x, y] of [[47.2, 87.4], [56.8, 86.6], [43.4, 84.6]]) { const b = L.base(x, y); if (b && b.ocean) { const p = atCell(x, y); thing({ key: 'buoy', box: [-8, -14, 8, 5], x: p.x, y: p.y, draw: drawBuoy(P) }); } }
  }

  /* ---------- the standing things ---------- */
  const drawBollard = P => B => { B.shadow(3, 1, 8, 2.6, .32); B.f(B.rr(-4.2, -11, 8.4, 11, 2.4), P.iron).f(B.rect(-3.2, -10, 1.8, 9), '#5c6266', .8).f(B.ell(0, -11.4, 5.6, 2.2), '#3c4246').f(B.ell(-1, -12, 3, 1), '#6e767a', .8); };
  function crate(B, x, y, w, h, P, tone) {
    const d = h * .38, c0 = tone ? P.woodHi : P.wood;
    B.f(B.poly([[x, y - h], [x + d * .6, y - h - d], [x + w + d * .6, y - h - d], [x + w, y - h]]), P.woodHi).f(B.poly([[x + w, y], [x + w, y - h], [x + w + d * .6, y - h - d], [x + w + d * .6, y - d]]), P.woodLo);
    B.f(B.rect(x, y - h, w, h), c0); for (let k = 1; k < 3; k++) B.f(B.rect(x, y - h + k * h / 3 - .6, w, 1.2), P.woodLo, .7);
    B.f(B.rect(x + 1, y - h, 2.4, h), P.woodLo, .6).f(B.rect(x + w - 3.4, y - h, 2.4, h), P.woodLo, .6).f(B.rect(x, y - h, w, 1.4), P.woodHi, .6);
  }
  const drawCrates = (P, big) => B => {
    if (!big) { B.shadow(4, 1, 15, 4, .3); crate(B, -10, 0, 18, 13, P, 1); return; }
    B.shadow(6, 1, 32, 7, .32); crate(B, -26, 0, 22, 16, P, 0); crate(B, -2, 0, 20, 14, P, 1); crate(B, -18, -16, 20, 14, P, 1);
    // a barrel at the end and a fish box with ice
    B.f(B.rr(20, -18, 12, 18, 4), '#8a6a46').f(B.rect(20, -14, 12, 1.6), P.iron, .8).f(B.rect(20, -5, 12, 1.6), P.iron, .8).f(B.rect(22, -17, 3, 16), '#b08c5e', .6).f(B.ell(26, -18, 6, 2), '#6a5034');
  };
  const drawPots = P => B => {
    B.shadow(2, 1, 26, 6, .3);
    const pot = (x, y, s) => { B.f(B.rect(x - 11 * s, y - 3 * s, 22 * s, 3 * s), P.woodLo).f(`M${x - 10 * s} ${y - 3 * s}Q${x - 10 * s} ${y - 17 * s} ${x} ${y - 17 * s}Q${x + 10 * s} ${y - 17 * s} ${x + 10 * s} ${y - 3 * s}Z`, '#3e4a3c', .55);
      for (let k = -8; k <= 8; k += 4) B.s(`M${x + k * s} ${y - 3 * s}Q${x + k * s * .8} ${y - 14 * s} ${x} ${y - 17 * s}`, '#c9b07a', .8, .85);
      for (let k = 1; k < 4; k++) B.s(`M${x - 10 * s} ${y - (3 + k * 3.5) * s}Q${x} ${y - (5 + k * 3.8) * s} ${x + 10 * s} ${y - (3 + k * 3.5) * s}`, '#b89c66', .7, .7); };
    pot(-10, 0, 1); pot(12, 0, 1); pot(1, -14, .95);
  };
  const drawNet = P => B => {
    B.shadow(0, 1, 40, 6, .25);
    for (const x of [-34, 34]) { B.post(x, -52, 0, 3.4, [P.wood, P.woodLo, P.woodHi]); }
    B.s('M-34 -50L34 -50', P.woodLo, 2.4, .95);
    const net = 'M-33 -49Q0 -44 33 -49L30 -16Q4 -2 -26 -20Z';
    B.f(net, '#4f6a66', .35); B.cx.save(); B.cx.clip(new Path2D(net)); for (let k = -60; k < 60; k += 5) { B.s(`M${k} -52l40 50`, '#2f3e3a', .7, .6); B.s(`M${k} -52l-40 50`, '#2f3e3a', .7, .6); } B.cx.restore();
    for (let x = -30; x <= 30; x += 8) B.f(B.ell(x, -48 + Math.abs(x) * .05, 2.2, 1.6), '#d8a040');
    B.f(B.ell(-12, -6, 8, 2.4), '#4f6a66', .4);
  };
  const drawBoat = (P, col, afloat) => B => {
    const hull = 'M-40 -6Q-38 -18 -14 -20L30 -18Q44 -14 44 -6Q42 4 26 6L-26 6Q-40 4 -40 -6Z', inner = 'M-34 -7Q-32 -15 -14 -16L28 -14Q38 -11 38 -6Q36 0 24 1L-24 1Q-34 0 -34 -7Z';
    if (afloat) { B.f(B.ell(2, 4, 50, 7), '#2e5a6a', .25); B.s(B.ell(2, 4, 54, 8), '#e8f2ee', 1.2, .45); }
    else B.shadow(4, 5, 46, 7, .32);
    B.f(hull, col).f('M-40 -6Q-40 4 -26 6L26 6Q42 4 44 -6Q40 0 26 1L-24 1Q-38 0 -40 -6Z', '#000', .22).f('M-38 -10Q-36 -18 -14 -20L30 -18Q42 -15 43 -10', '#fff', .18);
    B.s('M-39 -8Q-36 -17 -14 -19L30 -17Q43 -13 43 -7', '#f4efe2', 1.6, .8);
    B.f(inner, P.woodHi).f('M-34 -7Q-32 -15 -14 -16L28 -14Q38 -11 38 -6', P.wood, .4);
    for (const x of [-16, 8]) B.f(B.rect(x, -16, 5, 17), P.wood).f(B.rect(x, -16, 2, 17), P.woodHi, .7);
    B.s('M-24 -10L30 -3', P.woodLo, 2.2, .95).s('M-22 -4L32 -10', P.woodLo, 2.2, .9);
    if (afloat) B.f('M-40 -2Q-40 4 -26 6L26 6Q42 4 44 -2Z', '#3f7a8c', .45);
  };
  const drawBench = P => B => { B.shadow(2, 1, 26, 4, .28); for (const x of [-20, 18]) B.f(B.rect(x - 1.6, -12, 3.2, 12), P.iron); B.f(B.rect(-24, -14, 48, 4), P.wood).f(B.rect(-24, -14, 48, 1.4), P.woodHi, .8).f(B.rect(-24, -26, 48, 3.4), P.wood).f(B.rect(-24, -21, 48, 3.4), P.woodLo).s('M-21 -26v12M19 -26v12', P.iron, 2.2); };
  const drawAnchor = P => B => { B.shadow(2, 1, 18, 4, .28); B.s('M0 -36V-2', '#3e4448', 4).s('M-16 -10Q0 6 16 -10', '#3e4448', 4).s('M-9 -30H9', '#3e4448', 3.4).s(B.ell(0, -38, 3.4, 3.4), '#3e4448', 2).s('M-2 -34V-4', '#7a8286', 1.2, .7); B.f('M-19 -14L-14 -8L-12 -14Z', '#3e4448').f('M19 -14L14 -8L12 -14Z', '#3e4448'); B.s('M0 -38q14 4 10 18q-4 14 8 22', P.rope, 1.6, .9); };
  const drawFishBox = P => B => { B.shadow(1, 1, 14, 3, .3); crate(B, -12, 0, 22, 9, P, 1); for (let k = 0; k < 4; k++) B.f(B.ell(-8 + k * 5, -10, 2.6, 1.2), '#c8d4dc').f(B.ell(-8 + k * 5, -10.4, 1.6, .5), '#fff', .7); };
  const drawBuoy = P => B => { B.f(B.ell(0, 2, 8, 2.4), '#2e5a6a', .25); B.f(B.circ(0, -4, 5.4), '#c8402e').f(B.rect(-5.4, -5, 10.8, 2.2), '#f4efe2').f(B.circ(-1.8, -6, 1.6), '#fff', .5); B.s('M0 -9.4v-4', P.iron, 1.2); };

  V.parts.push({ id: 'harbour', compose });
})();

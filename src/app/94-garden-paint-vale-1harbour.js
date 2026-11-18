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

  // The sea coast: the longest run of the island's outline inside the map (the west and
  // north edges run on into the painted mainland, which has its own shore).
  function seaCoast(L) {
    let best = [], run = [];
    for (const loop of L.coast) { for (const p of loop.concat(loop)) { const cx = p.x / L.cw, cy = (p.y - L.W.sky) / L.ch; if (cx > -.4 && cy > -.4 && cx < L.W.cols + .4 && cy < L.W.rows + .4) run.push(p); else { if (run.length > best.length) best = run; run = []; } } if (run.length > best.length) best = run; run = []; }
    return best.length > loopLen(L) ? best.slice(0, loopLen(L) + 1) : best;
  }
  const loopLen = L => Math.max(0, ...L.coast.map(l => l.length));
  // runs of consecutive points that pass a test
  function runsWhere(pts, test) { const out = []; let run = []; for (const p of pts) { if (test(p)) run.push(p); else { if (run.length > 1) out.push(run); run = []; } } if (run.length > 1) out.push(run); return out; }

  function compose(C) {
    const { L, P, kit, W, add, thing } = C, cw = L.cw, ch = L.ch, cpt = L.cpt;
    const quay = (L.pres.plazas || []).find(p => p.id === 'the-quay'); if (!quay) return;
    const box = [QUAY.x0 * cw, W.sky + QUAY.y0 * ch, QUAY.x1 * cw, W.sky + QUAY.y1 * ch];
    const coastP = V.loopPath(L.coast), outside = new Path2D(); outside.rect(box[0] - 400, box[1] - 400, box[2] - box[0] + 800, box[3] - box[1] + 800); outside.addPath(coastP);
    const smooth = (a, b, t) => Math.max(0, Math.min(1, (t - a) / (b - a)));
    // the village ground ends at its box (start + 17 rows, x within start +/- 18): feather into it
    const st = L.D.anchors.start, vy1 = st.y + 18;
    const fade = (x, y) => smooth(vy1 - 2.6, vy1 - .2, y) * Math.min(smooth(QUAY.x0 + .5, QUAY.x0 + 2.5, x), 1 - smooth(QUAY.x1 - 3, QUAY.x1 - .5, x));
    let washCanvas = null;
    const wash = (B, cb, color) => {
      // Reuse one small scratch canvas to multiply the two smooth feathers.
      // The result is baked into the existing chunk, without strip boundaries.
      if (!washCanvas) washCanvas = document.createElement('canvas');
      const x = Math.floor(cb[0]), y = Math.floor(cb[1]), w = Math.ceil(cb[2]) - x, h = Math.ceil(cb[3]) - y;
      if (washCanvas.width !== w || washCanvas.height !== h) { washCanvas.width = w; washCanvas.height = h; }
      const cx = washCanvas.getContext('2d'); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, w, h); cx.setTransform(1, 0, 0, 1, -x, -y); cx.globalCompositeOperation = 'source-over';
      const vertical = cx.createLinearGradient(0, W.sky + (vy1 - 2.6) * ch, 0, W.sky + (vy1 - .2) * ch); vertical.addColorStop(0, kit.rgba(color, 0)); vertical.addColorStop(1, color); cx.fillStyle = vertical; cx.fillRect(x, y, w, h);
      const horizontal = cx.createLinearGradient(box[0], 0, box[2], 0);
      for (const [at, alpha] of [[QUAY.x0, 0], [QUAY.x0 + .5, 0], [QUAY.x0 + 2.5, 1], [QUAY.x1 - 3, 1], [QUAY.x1 - .5, 0], [QUAY.x1, 0]]) horizontal.addColorStop((at - QUAY.x0) / (QUAY.x1 - QUAY.x0), 'rgba(0,0,0,' + alpha + ')');
      cx.globalCompositeOperation = 'destination-in'; cx.fillStyle = horizontal; cx.fillRect(x, y, w, h); cx.globalCompositeOperation = 'source-over';
      B.cx.drawImage(washCanvas, x, y, w, h);
    };

    // 1. Grass over the plain ground between the village and the beach
    add(box, 31, (B, r, cb) => { B.cx.clip(coastP); V.lawn(B, r, L, P, cb, (x, y) => y >= QUAY.y0 && L.kind(x + .5, y + .5) === 'grass', fade, { salt: 31, wash }); });

    // 2. The sea edge all round: shallows and a lace of foam outside the coast, wet sand,
    // a wrack line and shells inside it. One continuous run of the sea coast (the bay and
    // every beach on to Wren cove and the cold cove), so the shallows never stop at a
    // straight edge. Split into ops by stretch so only shore chunks bake; in a chunk only
    // the first stretch that meets it draws the whole run, so nothing doubles up.
    const shore = seaCoast(L);
    if (shore.length > 2) {
      const seaBox = [-1200, -1200, W.cols * cw + 1200, W.sky + W.rows * ch + 1200];
      const outsideAll = new Path2D(); outsideAll.rect(seaBox[0], seaBox[1], seaBox[2] - seaBox[0], seaBox[3] - seaBox[1]); outsideAll.addPath(coastP);
      const bbs = []; for (let i = 0; i < shore.length; i += 8) bbs.push(kit.bboxOf(shore.slice(Math.max(0, i - 1), i + 9), 110));
      const near = (p, cb, m) => p.x > cb[0] - m && p.x < cb[2] + m && p.y > cb[1] - m && p.y < cb[3] + m;
      const beachAt = p => { const k = L.kind(p.x / cw, (p.y - W.sky) / ch); return k === 'beach' || k === 'path'; };
      // seaward copies of the line (along the outward normal: the sea side of the outline)
      const offOf = (pts, d) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(c.x - a.x, c.y - a.y) || 1; return { x: p.x + (c.y - a.y) / l * d, y: p.y - (c.x - a.x) / l * d }; }), off = d => offOf(shore, d);
      const in2 = off(-2), in14 = off(-14), in24 = off(-24);
      // the water's lace runs straight across the river mouth (a bar), not up into it in a V
      const sea = shore.filter((p, i) => { const q = in24[i], b = L.base(q.x / cw, (q.y - W.sky) / ch); return !(b && b.freshwater); });
      const o30 = offOf(sea, 30), o14 = offOf(sea, 14), o6 = offOf(sea, 6), o3 = offOf(sea, 3), o15 = offOf(sea, 15);
      const lens = pts => pts.reduce((out, p, i) => (out.push(i ? out[i - 1] + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), out), []), len3 = lens(o3), len15 = lens(o15);
      // index spans [a, b) of the points within m px of a box, each widened by a point either side
      const spans = (pts, cb, m) => { const out = []; let a = -1; for (let i = 0; i <= pts.length; i++) { const inside = i < pts.length && near(pts[i], cb, m); if (inside && a < 0) a = Math.max(0, i - 1); if (!inside && a >= 0) { out.push([a, Math.min(pts.length, i + 1)]); a = -1; } } return out; };
      const prng = (p, salt) => kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), salt));
      bbs.forEach((bb, idx) => add(bb, 32, (B, r, cb) => {
        for (let j = 0; j < idx; j++) if (kit.meets(bbs[j], cb)) return;
        B.cx.save(); B.cx.clip(outsideAll, 'evenodd');
        // only the stretch near this chunk is stroked (whole strokes cost the full coast each chunk); the dashes keep their phase
        const seaRuns = spans(sea, cb, 230);
        for (const [a, b] of seaRuns) { V.strokePts(B, o30.slice(a, b), P.shallow, 150, .22); V.strokePts(B, o14.slice(a, b), P.shallow, 80, .3); V.strokePts(B, o6.slice(a, b), '#b7d8cf', 34, .35); }
        // sand ripples seen through the shallows
        for (const p of V.walk(sea, 26)) { if (!near(p, cb, 90)) continue; const q = prng(p, 71); for (let k = 0; k < 2; k++) { const d = 14 + q() * 50, x = p.x + p.ty * d + (q() - .5) * 20, y = p.y - p.tx * d; B.s(`M${x - 9} ${y}q9 -3 18 0`, '#d8e6d8', 1.1, .25); } }
        // the lace: broken lines of foam at the edge and a fainter line further out
        for (const [a, b] of seaRuns) { B.cx.setLineDash([14, 6, 4, 9]); B.cx.lineDashOffset = len3[a]; V.strokePts(B, o3.slice(a, b), P.foam, 2.6, .85); B.cx.setLineDash([22, 14, 6, 18]); B.cx.lineDashOffset = len15[a]; V.strokePts(B, o15.slice(a, b), P.foam, 1.6, .45); }
        B.cx.setLineDash([]); B.cx.lineDashOffset = 0;
        B.cx.restore();
        B.cx.save(); B.cx.clip(coastP);
        // wet sand only where the shore is sand (the cold cove's moor and rock keep their own edge)
        for (const run of runsWhere(shore.map((p, i) => ({ x: p.x, y: p.y, i })), p => beachAt(in14[p.i]) && near(p, cb, 230))) { V.strokePts(B, run, P.sandWet, 30, .55); V.strokePts(B, run.map(p => in2[p.i]), P.sandWet, 12, .5); }
        // the wrack line: dark weed and drift at the last high tide, a stride above the water
        for (const p of V.walk(shore, 7)) { if (!near(p, cb, 40)) continue; const q = prng(p, 72); if (q() < .25) continue; const d = 26 + Math.sin((p.x + p.y) / 60) * 5 + (q() - .5) * 4, x = p.x - p.ty * d, y = p.y + p.tx * d; if (!beachAt({ x, y })) continue; B.f(B.blob(q, x, y, 2 + q() * 4, 1 + q() * 1.2, 6, .6), q() < .6 ? '#5e5a3a' : '#7a6a48', .7); if (q() < .12) B.f(B.rr(x - 5, y - 1, 10 + q() * 6, 2.2, 1), '#a08a66', .8); }
        // shells, pebbles and ripples on the dry sand
        kit.tiles(cb, 90, 0, 33, (tx, ty, rr) => { for (let k = 0; k < 10; k++) { const x = tx + rr() * 90, y = ty + rr() * 90; if (L.kind(x / cw, (y - W.sky) / ch) !== 'beach') continue; const t = rr();
          if (t < .35) B.s(`M${x - 7} ${y}q7 -2.4 14 0`, P.sandDk, 1, .28); else if (t < .6) B.f(B.ell(x, y, 1.6, 1.1), ['#f6efe0', '#e8c4b8', '#d8d0c0'][Math.floor(rr() * 3)], .95); else if (t < .8) B.f(B.ell(x, y, 2 + rr() * 2, 1.2 + rr()), ['#a89c88', '#8c8474', '#c2b8a4'][Math.floor(rr() * 3)], .9); } });
        B.cx.restore();
      }));
    }

    // 3. One promenade from the village to the quay. Its shoulders gradually
    // widen with the native road, rather than jumping to a hundred-pixel band.
    const promenade = L.routePts('harbour-walk'), promenadeRoute = L.routes.get('harbour-walk');
    if (promenade.length > 1) {
      const band = V.loopPath([V.routeRibbon(L, promenadeRoute, false)]), kerb = V.loopPath([V.routeRibbon(L, promenadeRoute, true)]), bb = kit.bboxOf(promenade, 80);
      add(bb, 34, (B, r, cb) => {
        V.clipGround(B, L, cb); B.f(kerb, P.kerb); B.s(kerb, 'rgba(46,52,30,.18)', 2);
        B.cx.save(); B.cx.clip(band); V.flags(B, r, P, [bb[0], Math.max(bb[1], cb[1] - 13), bb[2], Math.min(bb[3], cb[3] + 13)], { row: 13, w: 24, salt: 34, moss: .05 }); B.cx.restore();
      });
    }
    // (the meadow's wash is not cut away along them, V.softRoutes: the turf runs on under the worn line, with no hard edge)
    // The village's two shore trails (2.74) are worn ways, not laid ones: trodden earth on the turf, a packed damp line and
    // footprints on the sand, soft at both edges, as wide as the route is there, and dying away where the trail ends.
    for (const id of ['strand', 'lighthouse-walk']) {
      const pts = L.routePts(id), route = L.routes.get(id); if (pts.length < 2 || !route || !Array.isArray(route.widths)) continue;
      const qs = V.walk(pts, 5), n = qs.length; if (n < 3) continue;
      const sandAt = q => L.kind(q.x / cw, (q.y - W.sky) / ch) === 'beach';
      const half = (q, i) => gardenIslandRouteWidthAt(route, q.x / cw, (q.y - W.sky) / ch) * .46 * Math.hypot(q.ty * cw, q.tx * ch) * Math.min(1, .25 + (n - 1 - i) / 10);
      const runs = []; { let cur = null; qs.forEach((q, i) => { const sand = sandAt(q); if (!cur || cur.sand !== sand) { const prev = cur; cur = { sand, pts: prev ? prev.pts.slice(-3) : [] }; runs.push(cur); } cur.pts.push({ q, i }); }); }
      // (each stretch narrows to nothing at both its ends, so turf and sand hand over to each other with no square end)
      const ribbon = (run, k, grow, whole) => { const l = [], rr = [], m = run.pts.length; run.pts.forEach(({ q, i }, j) => { const e = whole ? 1 : Math.min(1, (j + .4) / 4, (m - 1 - j + .4) / 4), h = Math.max(.6, (half(q, i) * k + grow) * e); l.push([q.x - q.ty * h, q.y + q.tx * h]); rr.push([q.x + q.ty * h, q.y - q.tx * h]); }); const p = new Path2D(), all = l.concat(rr.reverse()); p.moveTo(all[0][0], all[0][1]); for (let j = 1; j < all.length; j++) p.lineTo(all[j][0], all[j][1]); p.closePath(); return p; };
      add(kit.bboxOf(pts, 40), 35 + id.length, (B, r, cb) => {
        V.clipGround(B, L, cb);
        // (the plain ground under the painting lays its own flat strip of road wherever the route crosses a cell that is
        // not beach, even one out on the sand: sand over that strip, seaward of the turf's edge)
        { const gc = V.groundClips(L), off = new Path2D(); off.rect(cb[0] - 60, cb[1] - 60, cb[2] - cb[0] + 120, cb[3] - cb[1] + 120); off.addPath(gc.lawn);
          B.cx.save(); B.cx.clip(off, 'evenodd'); B.f(ribbon({ pts: qs.map((q, i) => ({ q, i })) }, 1.7, 12, true), C.season === 'winter' ? '#dedcc5' : '#e4d6b2', 1); B.cx.restore(); }
        for (const run of runs) { if (run.pts.length < 2) continue;
          if (run.sand) { B.cx.filter = 'blur(5px)'; B.f(ribbon(run, .95, 2), P.sandWet, .34); B.cx.filter = 'blur(2.5px)'; B.f(ribbon(run, .4, 0), P.sandDk, .16); B.cx.filter = 'none'; }
          else { B.cx.filter = 'blur(6px)'; B.f(ribbon(run, 1, 3), P.pathEdge, .3); B.cx.filter = 'blur(4px)'; B.f(ribbon(run, .84, 0), P.path, .78); B.cx.filter = 'blur(3px)'; B.f(ribbon(run, .4, 0), P.pathWear, .45); B.cx.filter = 'none'; }
        }
        qs.forEach((q, i) => {
          const h = half(q, i), sand = sandAt(q);
          if (sand) { if (i % 2 === 0 && i < n - 2) { const s = (i % 4 ? 1 : -1) * 3.2; B.f(B.ell(q.x - q.ty * s + q.tx * 1.5, q.y + q.tx * s + q.ty * 1.5, 2.3, 1.5), P.sandDk, .5).f(B.ell(q.x - q.ty * s - q.tx * 1.6, q.y + q.tx * s - q.ty * 1.6, 1.5, 1.2), P.sandDk, .45); } }   // footprints
          else { for (let k = 0; k < 3; k++) { const o = (r() - .5) * 2 * h; B.f(B.ell(q.x - q.ty * o, q.y + q.tx * o, .8 + r(), .6 + r() * .6), r() < .5 ? P.pathEdge : P.pathWear, .6); }   // grit
            for (const sd of [-1, 1]) { if (r() < .45) continue; const o = (h + 1 - r() * 3) * sd, x = q.x - q.ty * o, y = q.y + q.tx * o, hh = 3 + r() * 4; B.s(`M${x} ${y + 1}q${(r() - .5) * 2} ${-hh * .5} ${(r() - .5) * 4} ${-hh}`, r() < .5 ? P.lawnLo : '#6f8a40', 1, .75); } }   // grass growing in over the edge
        });
      });
    }
    for (const id of ['coast-walk']) {
      const pts = L.routePts(id); if (pts.length < 2) continue;
      add(kit.bboxOf(pts, 40), 35 + id.length, (B, r, cb) => {
        V.clipGround(B, L, cb);
        V.strokePts(B, pts, P.pathEdge, 30, .55); V.strokePts(B, pts, P.path, 24, .9); V.strokePts(B, pts, P.pathWear, 9, .6);
        for (const q of V.walk(pts, 7)) { if (r() < .4) continue; const s = (r() < .5 ? -1 : 1) * (8 + r() * 6); B.f(B.ell(q.x - q.ty * s, q.y + q.tx * s, 1.4 + r() * 1.6, 1 + r()), r() < .5 ? P.pathEdge : P.sandDk, .7); }
      });
    }

    // 4. The quay: flags in courses with a granite kerb, the harbour wall down to the tide, steps, rings and rope
    const qa = cpt(quay.x - 6.1, quay.y - 1.9), qb = cpt(quay.x + 6.3, quay.y + 1.65), qx0 = qa.x, qx1 = qb.x, qy0 = qa.y, qy1 = qb.y, face = 19;
    // The quay's front is its authored shape (2.74): it bulges at the pier root and tapers into the strand and the
    // lighthouse walk; its sea edge stays the straight harbour wall, so the wall, steps and bollards keep their line.
    const front = Array.isArray(quay.shape) ? quay.shape.filter(p => p[1] < quay.y + .7).sort((a, b) => a[0] - b[0]) : [];
    let quayShape = `M${qx0 + 26} ${qy0}L${qx1 - 26} ${qy0}Q${qx1} ${qy0} ${qx1} ${qy0 + 18}L${qx1} ${qy1}L${qx0} ${qy1}L${qx0} ${qy0 + 18}Q${qx0} ${qy0} ${qx0 + 26} ${qy0}Z`, qTop = qy0, qLeft = qx0, qRight = qx1;
    if (front.length > 3) {
      const g = i => front[Math.max(0, Math.min(front.length - 1, i))], pts = [];
      for (let i = 0; i < front.length - 1; i++) { const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2); for (let k = 0; k < 6; k++) { const t = k / 6, t2 = t * t, t3 = t2 * t, c = j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3); pts.push(cpt(c(0), c(1))); } }
      pts.push(cpt(front[front.length - 1][0], front[front.length - 1][1]));
      quayShape = `M${qx0} ${qy1}` + pts.map(p => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') + `L${qx1} ${qy1}Z`;
      qTop = Math.min(...pts.map(p => p.y)); qLeft = Math.min(qx0, ...pts.map(p => p.x)); qRight = Math.max(qx1, ...pts.map(p => p.x));
    }
    add([qLeft - 40, qTop - 30, qRight + 40, qy1 + face + 30], 41, (B, r) => {
      B.cx.filter = 'blur(3px)'; B.f(B.rect(qx0 + 4, qy1 + 2, qx1 - qx0, face + 6), '#2e3a36', .25); B.cx.filter = 'none';
      // the harbour wall's face: big dressed blocks, darker and weedy towards the tide, lit at the top
      B.f(B.rect(qx0, qy1, qx1 - qx0, face), B.lin(0, qy1, 0, qy1 + face, [[0, P.wall], [.6, P.wallLo], [1, '#4e5a4a']]));
      for (let row = 0; row < 3; row++) { const y = qy1 + row * face / 3; for (let x = qx0 + (row % 2) * 9; x < qx1; x += 16 + r() * 8) { const w = 14 + r() * 8; B.f(B.rr(x + 1, y + 1, Math.min(w, qx1 - x) - 2, face / 3 - 2, 1.5), row === 2 ? '#6e7462' : r() < .5 ? P.wall : P.wallHi, row === 2 ? .8 : .7); } }
      for (let x = qx0; x < qx1; x += 6) if (r() < .7) B.f(B.blob(r, x, qy1 + face - 2, 4 + r() * 4, 2 + r() * 2.5, 6, .6), r() < .5 ? '#4a5a34' : '#6a7440', .8);
      for (let x = qx0 + 30; x < qx1 - 20; x += 70 + r() * 30) { B.s(`M${x} ${qy1 + 7}a3 3 0 1 0 0.1 0`, P.iron, 1.4, .9); B.s(`M${x} ${qy1 + 2}l0 2`, P.iron, 1.6, .9); }
      // the flags, then a kerb of long granite copes along the sea edge
      B.cx.save(); B.cx.clip(new Path2D(quayShape)); V.flags(B, r, P, [qLeft, qTop, qRight, qy1], { row: 15, w: 30, salt: 41, moss: .06 });
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
        // the shelf the tower and the keeper's cottage stand on: a low weathered platform of rock
        // reaching out over the tide, so neither building stands in the water
        const sx = c.x - 22, sy = c.y - 10;
        B.f(B.blob(r, sx + 4, sy + 10, 96, 26, 14, .22), '#3e4a44', .3);
        B.f(B.blob(r, sx, sy + 4, 92, 24, 14, .2), P2.rockDk).f(B.blob(r, sx - 3, sy, 88, 21, 14, .2), P2.rockLo).f(B.blob(r, sx - 10, sy - 5, 72, 15, 12, .25), P2.rock).f(B.blob(r, sx - 26, sy - 9, 40, 7, 9, .3), P2.rockHi, .8);
        for (let i = 0; i < 9; i++) { const x = sx - 80 + r() * 160, y = sy - 4 + r() * 18; B.s(`M${x} ${y}l${6 + r() * 10} ${(r() - .5) * 4}`, P2.rockDk, 1, .45); }
        for (let i = 0; i < 6; i++) B.f(B.blob(r, sx - 70 + r() * 140, sy + 16 + r() * 6, 8 + r() * 10, 2.4, 7, .5), '#4f5a36', .7);
        B.f(B.blob(r, sx - 40, sy - 8, 14, 3, 7, .5), P2.lichen, .5).f(B.blob(r, sx + 30, sy - 4, 10, 2.4, 7, .5), P2.lichen, .45);
        const rocks = []; for (let i = 0; i < 26; i++) { const a = Math.PI * (.05 + r() * .9), d = 40 + r() * 110; rocks.push([c.x + Math.cos(a) * d * 1.3 - 10, c.y + Math.sin(a) * d * .7 + 6, 10 + r() * 18]); }
        rocks.sort((a, b) => a[1] - b[1]);
        for (const [x, y, s] of rocks) { B.boulder(r, x, y, s * 1.5, s * .8, P2, false); if (y > c.y + 40) B.f(B.blob(r, x, y - 1, s * .8, s * .2, 7, .5), '#4f5a36', .75); }
        // thrift and sea campion in the turf above the rocks
        for (let i = 0; i < 26; i++) { const x = c.x - 120 + r() * 240, y = c.y - 90 + r() * 70; if (L.kind(x / cw, (y - W.sky) / ch) !== 'grass') continue; B.f(B.blob(r, x, y, 6, 3.4, 7, .4), '#6f8a4a').f(B.blob(r, x - 1, y - 2, 4, 2, 6, .4), '#86a058', .9); for (let k = 0; k < 5; k++) B.f(B.circ(x + (r() - .5) * 8, y - 3 - r() * 3, 1.3), C.season === 'winter' ? '#c8c0b8' : '#e8a0b8', .95); }
      });
    }

    // 6. Things that stand up on the quay, the sand and the water
    const atCell = (x, y) => ({ x: x * cw, y: W.sky + y * ch });
    // bollards along the wall's top, clear of the pier
    for (let x = quay.x - 5.4; x < quay.x + 6; x += 1.45) { if (x > 48.7 && x < 52.4) continue; const p = atCell(x, quay.y + 1.5); thing({ key: 'bollard', box: [-8, -16, 10, 5], foot: [-6, 8, 6], x: p.x, y: p.y, draw: drawBollard(P) }); }
    // where each stands is shared with walking (gardenIslandHarbourThings), so the feet meet what is drawn
    const looks = { crates: [[-30, -46, 34, 8], drawCrates(P, 1)], pots: [[-28, -34, 30, 6], drawPots(P)], net: [[-42, -60, 44, 8], drawNet(P)], 'boat-sand': [[-46, -26, 48, 10], drawBoat(P, '#3f6f8a', false)],
      crate1: [[-16, -24, 18, 6], drawCrates(P, 0)], bench: [[-30, -30, 30, 6], drawBench(P)], anchor: [[-22, -44, 22, 6], drawAnchor(P)], fishbox: [[-16, -16, 18, 5], drawFishBox(P)] };
    for (const t of gardenIslandHarbourThings(L.D)) { const look = looks[t.key]; if (!look) continue; const p = atCell(t.x, t.y); thing({ key: t.key, box: look[0], x: p.x, y: p.y, draw: look[1] }); }
    // boats at their moorings and two buoys, out on the bay
    for (const [x, y, col, k] of [[43.6, 84.6, '#a8402e', 'boat-a'], [54.0, 86.2, '#2f6a5a', 'boat-b'], [42.4, 86.8, '#d8c890', 'boat-c']]) { const b = L.base(x, y); if (b && b.ocean) { const p = atCell(x, y); thing({ key: k, box: [-54, -26, 58, 14], x: p.x, y: p.y, draw: drawBoat(P, col, true) }); } }
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

  V.softRoutes.add('strand'); V.softRoutes.add('lighthouse-walk');
  V.parts.push({ id: 'harbour', compose });
})();

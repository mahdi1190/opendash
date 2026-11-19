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
    // the harbour's reach, from the quay plaza (it was fixed cells: 34 to 69, 67 to 92)
    const QUAY = { x0: quay.x - 16.3, x1: quay.x + 18.7, y0: quay.y - 10.6, y1: quay.y + 14.4 };
    const piers = (L.D.static || []).filter(p => /^pier/.test(p.id)), pierX0 = piers.length ? Math.min(...piers.map(p => p.x)) : quay.x - 1.6, pierX1 = piers.length ? Math.max(...piers.map(p => p.x + p.w)) : quay.x + 1.7;
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
    // (the roads are not cut out of it on their ribbons' hard outline: the lawn is laid over them and then faded off each
    // one in a soft band a little narrower than the road, so the road's own trodden edge and grass show; 19 Nov 2026)
    const Gk = window.GardenPaintGround, roadLines = Gk ? [...L.routes.values()].filter(rt => rt.points && rt.points.length > 1 && rt.tier !== 'plaza').map(rt => { const pts = L.routePts(rt.id), k = Gk.routeKind(rt); return { pts, w: (Gk.ROUTE_WIDTH[k] || 30) * .82, bb: kit.bboxOf(pts, 60) }; }).filter(o => o.pts.length > 1) : [];
    let lawnCanvas = null, lawnBrush = null;
    add(box, 31, (B, r, cb) => {
      const near = roadLines.filter(o => kit.meets(o.bb, cb));
      if (!near.length) { B.cx.clip(coastP); V.lawn(B, r, L, P, cb, (x, y) => y >= QUAY.y0 && L.kind(x + .5, y + .5) === 'grass', fade, { salt: 31, wash }); return; }
      // the lawn on a canvas of its own, the roads faded out of it there, then laid on this layer (nothing else is erased)
      const c = B.cx.canvas; if (!lawnCanvas) lawnCanvas = document.createElement('canvas'); if (lawnCanvas.width !== c.width || lawnCanvas.height !== c.height) { lawnCanvas.width = c.width; lawnCanvas.height = c.height; }
      const lx = lawnCanvas.getContext('2d'), T = B.cx.getTransform(), K = Math.abs(T.a) || 1; lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1; lx.filter = 'none'; lx.clearRect(0, 0, c.width, c.height); lx.setTransform(T);
      if (!lawnBrush || lawnBrush.cx !== lx) lawnBrush = kit.brush(lx);
      lx.save(); lx.clip(coastP); V.lawn(lawnBrush, r, L, P, cb, (x, y) => y >= QUAY.y0 && L.kind(x + .5, y + .5) === 'grass', fade, { salt: 31, wash, soft: true }); lx.restore();
      lx.save(); lx.globalCompositeOperation = 'destination-out'; lx.filter = 'blur(' + (4 * K).toFixed(2) + 'px)'; lx.lineCap = 'round'; lx.lineJoin = 'round'; lx.strokeStyle = '#000';
      for (const o of near) { lx.lineWidth = o.w; lx.beginPath(); o.pts.forEach((p, i) => i ? lx.lineTo(p.x, p.y) : lx.moveTo(p.x, p.y)); lx.stroke(); }
      lx.restore(); B.cx.save(); B.cx.setTransform(1, 0, 0, 1, 0, 0); B.cx.drawImage(lawnCanvas, 0, 0); B.cx.restore();
    });

    // 2. The sea edge all round: shallows and a lace of foam outside the coast, wet sand with a swash line, wrack in
    // clumps, shells in drifts, and at the back of every sand beach a dune edge of marram and sea plants. One continuous
    // run of the sea coast (the bay and every beach on to Wren cove and the cold cove), so nothing stops at a straight
    // edge. Every mark is placed from its own place along the shore (hashed and noised by world position), never by the
    // chunk, and never evenly: the foam thickens and breaks, the weed lies in drifts with bare sand between (the foam
    // was a dashed line and the wrack a row of even dots before: art round 3, 19 Nov 2026).
    const shore = seaCoast(L);
    if (shore.length > 2) {
      const seaBox = [-1200, -1200, W.cols * cw + 1200, W.sky + W.rows * ch + 1200];
      const outsideAll = new Path2D(); outsideAll.rect(seaBox[0], seaBox[1], seaBox[2] - seaBox[0], seaBox[3] - seaBox[1]); outsideAll.addPath(coastP);
      const bbs = []; for (let i = 0; i < shore.length; i += 8) bbs.push(kit.bboxOf(shore.slice(Math.max(0, i - 1), i + 9), 130));
      const near = (p, cb, m) => p.x > cb[0] - m && p.x < cb[2] + m && p.y > cb[1] - m && p.y < cb[3] + m;
      const cellOf = (x, y) => [x / cw, (y - W.sky) / ch], kindAt = (x, y) => { const c = cellOf(x, y); return L.kind(c[0], c[1]); };
      const beachAt = p => { const k = kindAt(p.x, p.y); return k === 'beach' || k === 'path'; };
      // the cold shores (the fells and the old woodland) are shingle: thrift and campion there, no marram, no sand ripples
      const themes = new Map((L.D.regions || []).map(rg => [rg.id, rg.theme])), COLD = new Set(['mountain', 'ruin']);
      const coldAt = (x, y) => { const c = cellOf(x, y), b = L.base(c[0], c[1]); return !!(b && COLD.has(themes.get(b.region))); };
      const fellsAt = (x, y) => { const c = cellOf(x, y), b = L.base(c[0], c[1]); return !!(b && themes.get(b.region) === 'mountain'); };
      // clear of the harbour's things, buildings, plots and paths: the dune planting keeps off all of them
      const things = gardenIslandHarbourThings(L.D).map(t => ({ x: t.x * cw, y: W.sky + t.y * ch }));
      const plantable = (x, y) => { const c = cellOf(x, y), k = L.kind(c[0], c[1]); if (k !== 'beach' && k !== 'grass') return false; if (!L.free(c[0], c[1]) || L.plot(c[0], c[1])) return false; for (const t of things) if (Math.abs(t.x - x) < 70 && Math.abs(t.y - y) < 40) return false; return true; };
      const prng = (p, salt) => kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), salt));
      const N = (x, y, s, k) => kit.noise(x / s, y / s, k), F = (x, y, s, k) => kit.fbm(x / s, y / s, k), sm = (a, b, t) => Math.max(0, Math.min(1, (t - a) / (b - a)));
      // the water's lace runs straight across the river mouth (a bar), not up into it in a V
      const in24 = shore.map((p, i) => { const a = shore[Math.max(0, i - 1)], c = shore[Math.min(shore.length - 1, i + 1)], l = Math.hypot(c.x - a.x, c.y - a.y) || 1; return { x: p.x - (c.y - a.y) / l * 24, y: p.y + (c.x - a.x) / l * 24 }; });
      const sea = shore.filter((p, i) => { const q = in24[i], b = L.base(q.x / cw, (q.y - W.sky) / ch); return !(b && b.freshwater); });
      // seaward is (ty, -tx) along a walk, landward (-ty, tx)
      const seaW = V.walk(sea, 5), shoreW = V.walk(shore, 6), backW = V.walk(shore, 9);
      const out = (q, d) => ({ x: q.x + q.ty * d, y: q.y - q.tx * d }), inl = (q, d) => ({ x: q.x - q.ty * d, y: q.y + q.tx * d });
      // a run of walk points near a chunk, as index spans (so a stroke is joined from point to point)
      const spansOf = (pts, cb, m) => { const res = []; let a = -1; for (let i = 0; i <= pts.length; i++) { const ok = i < pts.length && near(pts[i], cb, m); if (ok && a < 0) a = Math.max(0, i - 1); if (!ok && a >= 0) { res.push([a, Math.min(pts.length - 1, i)]); a = -1; } } return res; };
      const firstFor = (idx, cb) => { for (let j = 0; j < idx; j++) if (kit.meets(bbs[j], cb)) return false; return true; };

      // 2a. the sea side: shallows that come and go with the sand under them, then the lace
      bbs.forEach((bb, idx) => add(bb, 32, (B, r, cb) => {
        if (!firstFor(idx, cb)) return;
        B.cx.save(); B.cx.clip(outsideAll, 'evenodd');
        // (a ramp of thin passes along one line, so the shallows fade out to the deep with no edge: three wide bands of one
        // strength each ended in a hard line parallel to the coast)
        for (const [a, b] of spansOf(seaW, cb, 240)) { const line = []; for (let i = a; i <= b; i++) line.push(out(seaW[i], 4)); for (let w = 220; w >= 20; w -= 20) V.strokePts(B, line, w > 80 ? P.shallow : '#b7d8cf', w, w > 80 ? .055 : .075); }
        for (let i = 0; i < seaW.length; i += 3) { const q = seaW[i]; if (!near(q, cb, 140)) continue; const n = F(q.x, q.y, 260, 81); if (n < .5) continue; const rr = prng(q, 82), c = out(q, 40 + rr() * 50);
          // a bar of pale sand under the water, or a darker weedy patch, here and there along the shore
          B.f(B.blob(rr, c.x, c.y, 30 + rr() * 40, 9 + rr() * 8, 9, .45), n > .6 ? '#c4dcd0' : P.shallow, (n - .5) * .7); }
        for (let i = 0; i < seaW.length; i += 6) { const q = seaW[i]; if (!near(q, cb, 90)) continue; const n = F(q.x, q.y, 160, 83); if (n < .46) continue; const rr = prng(q, 71), d = 16 + rr() * 52, p = out(q, d), w = 6 + rr() * 9; B.s(`M${p.x - q.tx * w} ${p.y - q.ty * w}q${q.tx * w - q.ty * 2} ${q.ty * w + q.tx * 2} ${q.tx * w * 2} ${q.ty * w * 2}`, '#d8e8dc', 1, .22 * sm(.46, .6, n)); }
        // the lace at the edge: one foam line that swells and thins and breaks, never a dash pattern
        for (const [a, b] of spansOf(seaW, cb, 40)) for (let i = a; i < b; i++) {
          const q = seaW[i], q2 = seaW[i + 1], n = F(q.x, q.y, 70, 91), w = .8 + 3.4 * sm(.3, .75, n); if (n < .3) continue;
          const e = out(q, 2.5 + N(q.x, q.y, 40, 92) * 3), e2 = out(q2, 2.5 + N(q2.x, q2.y, 40, 92) * 3);
          B.s(`M${e.x} ${e.y}L${e2.x} ${e2.y}`, P.foam, w, .55 + .4 * sm(.3, .8, n));
          if (n > .55) { const rr = prng(q, 93); for (let k = 0; k < 2; k++) { if (rr() < .4) continue; const f = out(q, 6 + rr() * 9); B.f(B.circ(f.x + (rr() - .5) * 4, f.y, .7 + rr() * 1.3), P.foam, .5 + rr() * .3); } }
        }
        // the next wave, a little way out: crescents of foam where it is about to break
        for (const [a, b] of spansOf(seaW, cb, 60)) for (let i = a; i < b; i++) {
          const q = seaW[i], q2 = seaW[i + 1], n = F(q.x, q.y, 110, 94); if (n < .54) continue;
          const e = out(q, 13 + N(q.x, q.y, 220, 95) * 12), e2 = out(q2, 13 + N(q2.x, q2.y, 220, 95) * 12);
          B.s(`M${e.x} ${e.y}L${e2.x} ${e2.y}`, P.foam, .6 + (n - .54) * 7, .3 + (n - .54) * 1.1);
        }
        B.cx.restore();
      }));

      // 2b. the beach: a wet band that reaches up and falls back, the swash line of the last wave, wrack in drifts,
      // shells and pebbles in drifts, wind ripples on the dry sand
      bbs.forEach((bb, idx) => add(bb, 33, (B, r, cb) => {
        if (!firstFor(idx, cb)) return;
        B.cx.save(); B.cx.clip(coastP);
        for (let i = 0; i < shoreW.length; i += 2) { const q = shoreW[i]; if (!near(q, cb, 60)) continue; if (!beachAt(inl(q, 14))) continue; const rr = prng(q, 84), n = F(q.x, q.y, 120, 85), c = inl(q, 2);
          const p = inl(q, 6 + n * 10); B.f(B.blob(rr, p.x, p.y, 13 + n * 14, 6 + n * 7, 8, .35), P.sandWet, .3 + n * .2);
          B.f(B.blob(rr, c.x, c.y, 9, 3.4, 7, .3), P.sandWet, .45); }
        // the last wave's reach: a thin scalloped line of darker sand, and sky caught in the wet beside the water
        // (one stroke a run: segments laid one by one doubled up at every joint and read as a dotted line)
        const swash = (d0) => { let run = []; const flush = () => { if (run.length > 2) V.strokePts(B, run, P.sandDk, 1.1, .24); run = []; };
          for (const [a, b] of spansOf(shoreW, cb, 30)) { for (let i = a; i <= b; i++) { const q = shoreW[i], n = F(q.x, q.y, 90, 86); if (n < .4 || !beachAt(inl(q, 14))) { flush(); continue; } run.push(inl(q, d0 + n * 16 + Math.sin((q.x + q.y) / 23) * 3)); } flush(); } };
        swash(17);
        for (const [a, b] of spansOf(shoreW, cb, 30)) { let run = []; const flush = () => { if (run.length > 2) V.strokePts(B, run, '#eef2e6', 1.5, .3); run = []; };
          for (let i = a; i <= b; i++) { const q = shoreW[i]; if (N(q.x, q.y, 55, 87) > .62 && beachAt(inl(q, 14))) run.push(inl(q, 3.5)); else flush(); } flush(); }
        // the wrack: weed and drift at the last high tide, in drifts along the shore with bare sand between
        for (let i = 0; i < shoreW.length; i++) { const q = shoreW[i]; if (!near(q, cb, 40)) continue; const n = F(q.x, q.y, 340, 95); if (n < .54) continue; const rr = prng(q, 72); if (rr() < .55 - (n - .54) * 1.2) continue;
          const p = inl(q, 28 + N(q.x, q.y, 300, 96) * 18 + (rr() - .5) * 14); if (kindAt(p.x, p.y) !== 'beach' || fellsAt(p.x, p.y) || !plantable(p.x, p.y)) continue;   // (open sand only: never on a path)
          // a clump of wrack: a dark tangle with a few curled fronds and bladders, each its own size and turn (strands laid
          // along the shore read as scratches)
          B.f(B.blob(rr, p.x, p.y + 1, 9 + rr() * 8, 2.6 + rr() * 1.6, 8, .5), P.sandWet, .3);   // (the damp the weed keeps)
          // flat strands of weed lying along the tide's line, soft and low in contrast (small dark clumps read as spiders)
          const ang = Math.atan2(q.ty, q.tx), k = 1 + Math.floor(rr() * 2.4); for (let j = 0; j < k; j++) { const u = (rr() - .5) * 14, ox = p.x + q.tx * u, oy = p.y + q.ty * u + (rr() - .5) * 3, col = ['#7d7448', '#8f8455', '#6a6a44', '#9a8c5c', '#5e6440'][Math.floor(rr() * 5)], len = 5 + rr() * 7;
            B.cx.save(); B.cx.translate(ox, oy); B.cx.rotate(ang + (rr() - .5) * .5); B.f(B.blob(rr, 0, 0, len, 1 + rr() * .9, 8, .45), col, .55); B.cx.restore();
            B.s(`M${ox - q.tx * len * .8} ${oy - q.ty * len * .8 - .6}q${q.tx * len * .8} ${q.ty * len * .8 + (rr() - .5) * 3} ${q.tx * len * 1.6} ${q.ty * len * 1.6}`, col, .7, .45); }
          if (rr() < .1) B.f(B.ell(p.x + 4, p.y + 2, 1.7, 1.1), rr() < .5 ? '#f6efe0' : '#e2bcb0', .95);
          if (rr() < .035) { const len = 10 + rr() * 12; B.s(`M${p.x - q.tx * len} ${p.y - q.ty * len + 1.4}L${p.x + q.tx * len} ${p.y + q.ty * len + 1.4}`, '#5a5040', 3.6, .2).s(`M${p.x - q.tx * len} ${p.y - q.ty * len}L${p.x + q.tx * len} ${p.y + q.ty * len}`, '#a8997e', 2.6, .95).s(`M${p.x - q.tx * len} ${p.y - q.ty * len - .8}L${p.x + q.tx * len * .6} ${p.y + q.ty * len * .6 - .8}`, '#d6cbb2', .9, .8); }
        }
        // shells, pebbles and wind ripples on the dry sand, thick in some drifts and bare in others
        kit.tiles(cb, 90, 0, 33, (tx, ty, rr) => { for (let k = 0; k < 12; k++) { const x = tx + rr() * 90, y = ty + rr() * 90; if (kindAt(x, y) !== 'beach') continue; const n = F(x, y, 140, 97), t = rr(); if (rr() > n * 1.5 - .2) continue; const cold = coldAt(x, y);
          if (t < .3 && !cold) { const w = 6 + rr() * 6; B.s(`M${x - w} ${y}q${w} -2.2 ${w * 2} 0`, P.sandDk, .9, .22).s(`M${x - w + 1} ${y + 1}q${w - 1} -1.6 ${w * 2 - 2} 0`, '#f2e6c4', .7, .3); }
          else if (t < .52) B.f(B.ell(x, y, 1.5 + rr() * .6, 1 + rr() * .4), ['#f6efe0', '#e8c4b8', '#d8d0c0', '#c8b8a0'][Math.floor(rr() * 4)], .95).f(B.ell(x - .5, y - .4, .7, .4), '#fff', .6);
          else if (t < .8) { const s = 1.6 + rr() * 2.2; B.f(B.ell(x + .6, y + .7, s, s * .6), '#6e6452', .3).f(B.ell(x, y, s, s * .62), ['#a89c88', '#8c8474', '#c2b8a4', '#9a9488'][Math.floor(rr() * 4)], .95).f(B.ell(x - s * .3, y - s * .25, s * .45, s * .25), '#e8e2d4', .55); } } });
        // the middle of a wide beach is never bare (round 2): runnels the tide left, long shallow pools along the shore with
        // the sky in them and a dark wet margin; a gull's tracks wandering over the damp sand; now and then a crab's hole,
        // a razor shell or a starfish
        for (let i = 0; i < shoreW.length; i += 9) { const q = shoreW[i]; if (!near(q, cb, 120)) continue; const n = F(q.x, q.y, 380, 131); if (n < .5) continue; const rr = prng(q, 132); if (rr() < .35) continue;
          const d = 24 + rr() * 22, m = inl(q, d), m2 = inl(q, d + 26); if (kindAt(m.x, m.y) !== 'beach' || kindAt(m2.x, m2.y) !== 'beach' || coldAt(m.x, m.y) || !plantable(m.x, m.y)) continue;
          const len = 18 + rr() * 30, ang = Math.atan2(q.ty, q.tx);
          B.cx.save(); B.cx.translate(m.x, m.y); B.cx.rotate(ang + (rr() - .5) * .2);
          B.f(B.blob(rr, 0, 1.2, len + 5, 5.6, 10, .35), P.sandWet, .5).f(B.blob(rr, 0, 0, len, 3.2, 10, .35), '#a9c8c4', .78).f(B.blob(rr, -len * .2, -.9, len * .55, 1, 8, .4), '#e6f2ee', .7);
          B.s(`M${-len * .85} 3.2Q0 4.4 ${len * .85} 3`, '#f2e8cc', .9, .45); B.cx.restore(); }
        kit.tiles(cb, 170, 80, 134, (tx, ty, rr) => { if (rr() > .4) return; let x = tx + rr() * 170, y = ty + rr() * 170, a = rr() * Math.PI * 2; if (kindAt(x, y) !== 'beach' || coldAt(x, y)) return;
          for (let k = 0; k < 16; k++) { a += (rr() - .5) * .5; const side = k % 2 ? 1.5 : -1.5, fx = x - Math.sin(a) * side, fy = y + Math.cos(a) * side * .7; if (kindAt(fx, fy) !== 'beach') break;
            for (const b of [-.55, 0, .55]) B.s(`M${fx} ${fy}l${Math.cos(a + b) * 2.3} ${Math.sin(a + b) * 1.6}`, '#8e7e62', .6, .5);
            x += Math.cos(a) * 4.4; y += Math.sin(a) * 3.1; } });
        kit.tiles(cb, 120, 8, 135, (tx, ty, rr) => { for (let k = 0; k < 3; k++) { const x = tx + rr() * 120, y = ty + rr() * 120, t = rr(); if (kindAt(x, y) !== 'beach' || coldAt(x, y) || rr() > F(x, y, 200, 136) * .8) continue;
          if (t < .45) B.f(B.ell(x, y, 2.2, 1.3), '#e8d8b4', .75).f(B.ell(x, y + .2, 1, .6), '#5e5040', .7);
          else if (t < .85) { const a = rr() * 3; B.s(`M${x} ${y + .8}l${Math.cos(a) * 6} ${Math.sin(a) * 2.6}`, '#6e6452', 1.6, .25).s(`M${x} ${y}l${Math.cos(a) * 6} ${Math.sin(a) * 2.6}`, '#5e5a64', 1.7, .85).s(`M${x} ${y - .4}l${Math.cos(a) * 5.6} ${Math.sin(a) * 2.4}`, '#b4b0c0', .6, .7); }
          else if (t < .93) { const a0 = rr() * 6; let d = ''; for (let j = 0; j < 10; j++) { const a = a0 + j / 10 * Math.PI * 2, rad = j % 2 ? 1.5 : 4.2; d += (j ? 'L' : 'M') + (x + Math.cos(a) * rad).toFixed(1) + ' ' + (y + Math.sin(a) * rad * .7).toFixed(1); } B.f(B.ell(x + .8, y + .8, 4, 2.4), '#6e5a40', .2).f(d + 'Z', '#e0885a', .92).f(B.circ(x - .4, y - .3, 1.1), '#f4b688', .8); } } });
        B.cx.restore();
      }));

      // 2c. the back of the beach: where the sand meets the turf, marram in clumps on low hummocks, with sea holly,
      // sea kale, bindweed and horned poppy among it (thrift and sea kale on the cold shingle shores)
      const wint = C.season === 'winter', aut = C.season === 'autumn';
      const MAR = wint ? ['#a49c78', '#c4b890', '#8a8a6a'] : aut ? ['#a4a058', '#c8b870', '#8a8e4c'] : ['#8fa058', '#b4b868', '#6f8a46'], TIP = wint ? '#d8ccaa' : '#d8cc8e';
      const clumps = []; for (const q of backW) { const n = F(q.x, q.y, 300, 98); if (n < .44) continue; const rr = prng(q, 99); if (rr() > (n - .32) * 1.5) continue;
        const p = inl(q, 56 + N(q.x, q.y, 260, 100) * 30 + (rr() - .5) * 22); if (!plantable(p.x, p.y) || fellsAt(p.x, p.y)) continue; clumps.push({ x: p.x, y: p.y, n, cold: coldAt(p.x, p.y), seed: kit.hash(Math.round(p.x), Math.round(p.y), 101) }); }
      const lean = .38;   // (one wind, off the sea: every blade leans the same way)
      const marram = (B, rr, x, y, s) => { const n = 6 + Math.floor(rr() * 8); B.f(B.blob(rr, x + 5 * s, y + 1, 10 * s + 3, 2.6 * s + 1, 7, .5), '#5a5236', .16);
        for (let j = 0; j < n; j++) { const px = x + (rr() - .5) * 13 * s, h = (15 + rr() * 11) * s, bend = (lean + (rr() - .5) * .5) * h * .5, col = j % 4 === 0 ? TIP : MAR[j % 3]; B.s(`M${px} ${y + rr() * 2}q${bend * .25} ${-h * .62} ${bend} ${-h}`, col, 1 + rr() * .6, .95); }
        if (!wint && rr() < .3) for (let j = 0; j < 3; j++) { const px = x + (rr() - .5) * 8 * s, h = (22 + rr() * 6) * s; B.s(`M${px} ${y}q${lean * h * .15} ${-h * .6} ${lean * h * .45} ${-h}`, '#c8b880', 1, .9).f(B.ell(px + lean * h * .45, y - h - 2, 1.3, 3.4), '#d8c898', .9); } };
      const holly = (B, rr, x, y) => { for (let j = 0; j < 7; j++) { const a = -Math.PI * (.1 + j / 7 * .8), l = 5 + rr() * 3; B.s(`M${x} ${y}l${Math.cos(a) * l} ${Math.sin(a) * l * .8}`, j % 2 ? '#8aa2a4' : '#a8bec0', 2, .95); } if (!wint) for (let j = 0; j < 3; j++) B.f(B.circ(x + (rr() - .5) * 8, y - 6 - rr() * 4, 1.6), '#7a8cc4', .95); };
      const kale = (B, rr, x, y) => { for (let j = 0; j < 5; j++) { const a = Math.PI * (j / 4) - Math.PI, px = x + Math.cos(a) * 6, py = y + Math.sin(a) * 3 - 2; B.f(B.blob(rr, px, py, 5.5, 3.4, 7, .5), j % 2 ? '#7f9a8e' : '#9db4a6', .95); } B.f(B.blob(rr, x - 2, y - 4, 4, 2, 6, .4), '#b8ccc0', .7); if (C.season === 'summer' || C.season === 'spring') for (let j = 0; j < 7; j++) B.f(B.circ(x + (rr() - .5) * 9, y - 8 - rr() * 4, 1.1), '#f6f2e4', .95); };
      const vine = (B, rr, x, y) => { let px = x, py = y; for (let j = 0; j < 6; j++) { const nx = px + 3 + rr() * 4, ny = py + (rr() - .5) * 3; B.s(`M${px} ${py}L${nx} ${ny}`, '#5e7a3e', 1, .9).f(B.ell(nx, ny - 1, 1.8, 1.2), '#6f8e46', .9); if (!wint && rr() < .35) B.f(B.circ(nx, ny - 2.4, 1.6), '#f0b4c4', .95).f(B.circ(nx, ny - 2.4, .6), '#fff', .8); px = nx; py = ny; } };
      const poppy = (B, rr, x, y) => { B.f(B.blob(rr, x, y - 2, 6, 3, 7, .5), '#9eb0ae', .9); if (!wint) for (let j = 0; j < 3; j++) { const px = x + (rr() - .5) * 8, py = y - 7 - rr() * 5; B.s(`M${px} ${y - 2}L${px} ${py}`, '#8ea29e', .9, .9).f(B.circ(px, py, 2), '#f0cc3a', .95); } };
      const thrift = (B, rr, x, y) => { const z = .6 + rr() * .8; B.f(B.blob(rr, x, y - 1.5, 6 * z, 3 * z, 7, .4), '#5f7a44', .95).f(B.blob(rr, x - 1, y - 3 * z, 4 * z, 1.8 * z, 6, .4), '#7c9656', .9); if (!wint) for (let j = 0, m = Math.floor(rr() * 5); j < m; j++) { const px = x + (rr() - .5) * 9, py = y - 6 - rr() * 4; B.s(`M${px} ${y - 2}L${px} ${py}`, '#6f8a4a', .8, .9).f(B.circ(px, py, 1.9), aut ? '#c8a0a8' : '#e8a0b8', .95); } };
      // one op a stretch of shore, so a chunk only bakes the clumps near it
      for (let i = 0; i < clumps.length; i += 24) { const set = clumps.slice(i, i + 24), cbb = kit.bboxOf(set, 60);
        add(cbb, 34, (B, r, cb) => {
          B.cx.save(); B.cx.clip(coastP);
          for (const c of set) { if (!near(c, cb, 50)) continue; const rr = kit.rng(c.seed), s = .8 + c.n * .5;
            // a low hummock the wind has built round the roots: lit on its sunny side, shaded on the other
            if (!c.cold) B.f(B.blob(rr, c.x + 3, c.y + 1, 22 * s, 7 * s, 9, .4), P.sandDk, .14).f(B.blob(rr, c.x - 4, c.y - 2, 17 * s, 5 * s, 9, .4), '#f2e6c0', .3);
            const t = rr();
            if (c.cold) { thrift(B, rr, c.x, c.y); if (rr() < .5) thrift(B, rr, c.x + 10 + rr() * 8, c.y + (rr() - .5) * 6); if (rr() < .3) kale(B, rr, c.x - 12, c.y + 3); continue; }
            marram(B, rr, c.x, c.y, s); if (rr() < .55) marram(B, rr, c.x + (rr() < .5 ? -1 : 1) * (11 + rr() * 8), c.y + (rr() - .5) * 6, s * .75);
            if (t < .16) holly(B, rr, c.x + 13, c.y + 4); else if (t < .3) kale(B, rr, c.x - 14, c.y + 5); else if (t < .44) vine(B, rr, c.x - 20, c.y + 7); else if (t < .54) poppy(B, rr, c.x + 15, c.y + 6);
          }
          B.cx.restore();
        }); }

      // 2d. driftwood lying on the upper beach, and low rock ledges reaching into the water on a few stretches of shore:
      // things you walk over, so they have no collision, laid in the ground with their shadow and a line of foam
      const logs = [], ledges = [];
      for (let i = 0; i < shoreW.length; i += 7) { const q = shoreW[i], rr = prng(q, 103), p = inl(q, 40 + rr() * 22);
        if (rr() < .05 && kindAt(p.x, p.y) === 'beach' && plantable(p.x, p.y) && !fellsAt(p.x, p.y)) logs.push({ x: p.x, y: p.y, a: Math.atan2(q.ty, q.tx) + (rr() - .5) * .7, len: 26 + rr() * 26, seed: kit.hash(Math.round(p.x), Math.round(p.y), 104) }); }
      for (let i = 0; i < seaW.length; i += 14) { const q = seaW[i], n = F(q.x, q.y, 520, 105); if (n < .6) continue; const rr = prng(q, 106); if (rr() < .55) continue; const p = inl(q, 4), back = inl(q, 30);
        const sandy = d => kindAt(inl(q, d).x, inl(q, d).y) === 'beach'; if (!plantable(back.x, back.y) || !sandy(8) || !sandy(20) || !sandy(34)) continue; if (ledges.some(l => Math.hypot(l.x - p.x, l.y - p.y) < 150)) continue; ledges.push({ x: p.x, y: p.y, tx: q.tx, ty: q.ty, s: .8 + rr() * .6, seed: kit.hash(Math.round(p.x), Math.round(p.y), 107) }); }
      for (const g of logs) add([g.x - 70, g.y - 40, g.x + 70, g.y + 40], 36, (B) => { const rr = kit.rng(g.seed), ca = Math.cos(g.a), sa = Math.sin(g.a) * .55, hx = ca * g.len / 2, hy = sa * g.len / 2, x0 = g.x - hx, y0 = g.y - hy, x1 = g.x + hx, y1 = g.y + hy, t = 4.6 + rr() * 2;
        B.s(`M${x0 + 3} ${y0 + 3}L${x1 + 4} ${y1 + 3}`, '#4a4230', t + 3, .2).s(`M${x0} ${y0}L${x1} ${y1}`, '#8c806a', t, 1).s(`M${x0} ${y0 - t * .25}L${x1} ${y1 - t * .25}`, '#b8ab92', t * .5, .9).s(`M${x0 + ca * 3} ${y0 - t * .35}L${x1 - ca * 6} ${y1 - t * .35}`, '#ddd2bc', 1, .8);
        for (let k = 0; k < 4; k++) { const a = g.a + Math.PI + (rr() - .5) * 1.6, l = 4 + rr() * 6; B.s(`M${x0} ${y0}l${Math.cos(a) * l} ${Math.sin(a) * l * .6}`, '#8c806a', 1.6, .95); }
        if (rr() < .6) { const u = .3 + rr() * .4, bx = x0 + (x1 - x0) * u, by = y0 + (y1 - y0) * u; B.s(`M${bx} ${by}l${-sa * 9 + 2} ${-6 - rr() * 3}`, '#9c907a', 1.8, .95); }
        B.f(B.blob(rr, g.x + 6, g.y + 3, g.len * .45, 2.4, 7, .4), '#c8b483', .3); });
      const RK = { rock: '#9c968a', rockLo: '#767064', rockHi: '#cbc4b2', rockDk: '#4a463e', lichen: '#d2c26a' };
      for (const g of ledges) add([g.x - 120, g.y - 70, g.x + 120, g.y + 80], 37, (B) => { const rr = kit.rng(g.seed), slabs = 3 + Math.floor(rr() * 3), pts = [];
        // low tabular rocks on the wet sand, the seaward one with its toe in the water: a lit top, a dark face, weed at the foot
        for (let k = 0; k < slabs; k++) { const along = (k - (slabs - 1) / 2) * 24 * g.s + (rr() - .5) * 10, d = (k === 0 ? 2 : 8) + rr() * 22; pts.push({ x: g.x + g.tx * along - g.ty * d, y: g.y + g.ty * along + g.tx * d, w: (16 + rr() * 20) * g.s, h: (7 + rr() * 5) * g.s, sea: k === 0 }); }
        pts.sort((a, b) => a.y - b.y);
        for (const p of pts) B.f(B.blob(rr, p.x + p.w * .22, p.y + 2, p.w * .62, p.h * .4, 8, .3), '#3a3a2c', .2);
        for (const p of pts) { const top = p.y - p.h * .55;
          B.f(B.blob(rr, p.x, p.y - p.h * .1, p.w * .5, p.h * .5, 6, .4), RK.rockDk).f(B.blob(rr, p.x - p.w * .04, p.y - p.h * .22, p.w * .47, p.h * .4, 6, .38), RK.rockLo);
          B.f(B.blob(rr, p.x - p.w * .06, top, p.w * .44, p.h * .3, 7, .35), RK.rock).f(B.blob(rr, p.x - p.w * .2, top - p.h * .06, p.w * .2, p.h * .12, 6, .4), RK.rockHi, .85);
          for (let k = 0; k < 2; k++) B.s(`M${p.x - p.w * .3 + rr() * p.w * .5} ${top - p.h * .1 + rr() * p.h * .2}l${3 + rr() * 6} ${(rr() - .5) * 2.4}`, RK.rockDk, .8, .5);
          B.f(B.blob(rr, p.x + p.w * .04, p.y + p.h * .3, p.w * .46, 1.8, 8, .5), '#4f5a36', .8); for (let k = 0; k < 4; k++) B.f(B.circ(p.x + (rr() - .5) * p.w * .7, p.y + p.h * .1 - rr() * p.h * .3, .7), '#dcd8ca', .7);
          if (p.sea) B.s(`M${p.x - p.w * .5} ${p.y + p.h * .42}q${p.w * .5} 3 ${p.w} 0`, P.foam, 1.3, .65);
          if (rr() < .35) B.f(B.blob(rr, p.x - p.w * .1, top, 3.4, 1.4, 6, .5), RK.lichen, .55); }
        // a rock pool caught between two of them, with the sky in it
        const a = pts[0], b = pts[pts.length - 1], px = (a.x + b.x) / 2 - g.ty * 14, py = (a.y + b.y) / 2 + g.tx * 10;
        if (rr() < .7) B.f(B.blob(rr, px, py, 11 * g.s, 4.4 * g.s, 9, .3), '#6f6a5c').f(B.blob(rr, px, py - .6, 9 * g.s, 3.4 * g.s, 9, .3), '#7fb3b4').f(B.ell(px - 3, py - 1.6, 4 * g.s, .9), '#e4f2ee', .7); });

      // 2e. the swash, live: on every sand and shingle beach a thin sheet of water runs up the sand, its edge a line of
      // foam, then slides back and the foam thins away; each stretch on its own beat, the waves running along the beach
      // (round 2: the foam was painted into the ground and nothing moved). Drawn each frame near the camera only, in short
      // pieces culled to the view, at most 30 times a second, and not at all when the whole map is in view.
      if (C.live) {
        const pieces = []; let run = [];
        // (each run fades in and out over its first and last few points, so no stretch of swash ends in a cut edge)
        const flush = () => { if (run.length > 5) { run.forEach((q, i) => { const k = Math.min(1, i / 7, (run.length - 1 - i) / 7); q.a *= k * k * (3 - 2 * k); });
          for (let i = 0; i < run.length - 1; i += 24) { const pts = run.slice(i, i + 25); if (pts.length > 2) pieces.push({ pts, bb: kit.bboxOf(pts, 30) }); } } run = []; };
        const wallAt = p => { const c = cellOf(p.x, p.y); return c[0] > quay.x - 6.6 && c[0] < quay.x + 6.8 && c[1] < quay.y + 3.4; };   // (not along the foot of the harbour wall)
        for (let i = 0; i < seaW.length; i += 2) { const q = seaW[i], a = inl(q, 10), b = inl(q, 26);
          if (kindAt(a.x, a.y) === 'beach' && kindAt(b.x, b.y) === 'beach' && !wallAt(q)) run.push({ x: q.x, y: q.y, tx: q.tx, ty: q.ty, s: i * 5, a: 6 + N(q.x, q.y, 260, 120) * 9, ph: F(q.x, q.y, 520, 121) * 1.7 }); else flush(); }
        flush();
        if (pieces.length) C.live({ make: (scene, root, depth) => {
          const g = scene.add.graphics(); g.setDepth(depth); if (root && root.add) root.add(g);
          let last = -1e9, drawn = 0, ms = 0; const sheet = [], foam = [];
          const reach = u => u < .3 ? Math.sin(u / .3 * Math.PI / 2) : 1 - (k => k * k * (3 - 2 * k))((u - .3) / .7);
          return { obj: g, stat: () => ({ pieces: pieces.length, drawn, ms: +ms.toFixed(2), visible: g.visible }), update(time, view) {
            const z = scene.cameras && scene.cameras.main ? scene.cameras.main.zoom : 1;
            if (z < 1.2 || !view) { if (g.visible) g.clear().setVisible(false); return; }
            if (time - last < 33) return; last = time; g.clear().setVisible(true); const t0 = performance.now(); drawn = 0;
            const t = time / 1000, m = 40;
            for (const pc of pieces) { const bb = pc.bb; if (bb[2] < view.x - m || bb[0] > view.x + view.w + m || bb[3] < view.y - m || bb[1] > view.y + view.h + m) continue;
              foam.length = 0; drawn++;
              for (const q of pc.pts) { const u = ((t / 7.5 + q.ph + q.s / 1500) % 1 + 1) % 1, d = q.a * reach(u) + (q.a > 1 ? Math.sin(q.s / 23 + t * 1.1) * .9 : 0), fa = (u < .3 ? .35 + .4 * u / .3 : .75 * Math.pow(1 - (u - .3) / .7, 1.6)) * Math.min(1, q.a / 5);
                foam.push(q, d, fa); }
              // the sheet of water in two films, thicker towards the sea, so it has no edge of its own: only the foam has one
              for (const [f, a] of [[1, .13], [.55, .13]]) { sheet.length = 0;
                for (let i = 0; i < foam.length; i += 3) { const q = foam[i], d = foam[i + 1] * f; sheet.push({ x: q.x - q.ty * d, y: q.y + q.tx * d }); }
                for (let i = foam.length - 3; i >= 0; i -= 3) { const q = foam[i]; sheet.push({ x: q.x + q.ty * 3, y: q.y - q.tx * 3 }); }
                g.fillStyle(0xe2f4ee, a).fillPoints(sheet, true); }
              for (let i = 0; i + 5 < foam.length; i += 3) { const a = (foam[i + 2] + foam[i + 5]) / 2; if (a < .04) continue; const q = foam[i], q2 = foam[i + 3], d = foam[i + 1], d2 = foam[i + 4];
                const x1 = q.x - q.ty * d, y1 = q.y + q.tx * d, x2 = q2.x - q2.ty * d2, y2 = q2.y + q2.tx * d2;
                g.lineStyle(3.2, 0xffffff, a * .22).lineBetween(x1, y1, x2, y2).lineStyle(1.1, 0xffffff, a).lineBetween(x1, y1, x2, y2); }
            }
            ms = performance.now() - t0;
          } };
        } });
      }
    }

    // 3. One promenade from the village to the quay. Its shoulders gradually
    // widen with the native road, rather than jumping to a hundred-pixel band.
    // It is the shared path kit's cobbled main road (94-garden-paint-ground-0kit.js), laid again on this layer over the
    // harbour's lawn: it had its own flags inside a dark kerb ribbon, a hard brown outline down both sides (art director,
    // 19 Nov 2026). The kit's road has a soft trodden edge with grass growing in, the same as every other road.
    // The lawn above (1.) is taken off every road in a soft band, so the shared ground's road shows with its own edge.
    const promenade = L.routePts('harbour-walk');
    // (the strand, the lighthouse walk and the coast walk had a second ribbon of their own here, a hard tan band with round
    // ends over the kit's path; the shared ground paints them, as every other trail: art round 3, 19 Nov 2026)

    // 4. The quay: flags in courses with a granite kerb, the harbour wall down to the tide, steps, rings and rope
    const qa = cpt(quay.x - 6.1, quay.y - 1.9), qb = cpt(quay.x + 6.3, quay.y + 1.65), qx0 = qa.x, qx1 = qb.x, qy0 = qa.y, qy1 = qb.y, face = 30;   // (the wall down to the tide, about three quarters of your height: it was 19 px, a kerb)
    const quayShape = `M${qx0 + 26} ${qy0}L${qx1 - 26} ${qy0}Q${qx1} ${qy0} ${qx1} ${qy0 + 18}L${qx1} ${qy1}L${qx0} ${qy1}L${qx0} ${qy0 + 18}Q${qx0} ${qy0} ${qx0 + 26} ${qy0}Z`;
    add([qx0 - 40, qy0 - 30, qx1 + 40, qy1 + face + 30], 41, (B, r) => {
      B.cx.filter = 'blur(' + (3 * (Math.abs(B.cx.getTransform().a) || 1)).toFixed(1) + 'px)'; B.f(B.rect(qx0 + 4, qy1 + 2, qx1 - qx0, face + 6), '#2e3a36', .25); B.cx.filter = 'none';
      // the harbour wall's face: big dressed blocks, darker and weedy towards the tide, lit at the top
      B.f(B.rect(qx0, qy1, qx1 - qx0, face), B.lin(0, qy1, 0, qy1 + face, [[0, P.wall], [.6, P.wallLo], [1, '#4e5a4a']]));
      // four courses of big granite blocks, each its own grey, lit along the top and shaded at the foot; the lowest course
      // is black-green with weed and barnacles below the tide line, with a pale salt line where the water stands
      const WB = ['#a8a090', '#b8b0a0', '#9a9384', '#aea48e', '#c0b8a6'], ch4 = face / 4;
      for (let row = 0; row < 4; row++) { const y = qy1 + row * ch4; for (let x = qx0 - r() * 12; x < qx1; ) { const w = 18 + r() * 16, x0 = Math.max(qx0, x), ww = Math.min(x + w, qx1) - x0; if (ww > 3) { const low = row === 3, mid = row === 2;
        B.f(B.rr(x0 + .8, y + .8, ww - 1.6, ch4 - 1.4, 1.6), low ? '#56604c' : mid ? '#7c7c6c' : WB[Math.floor(r() * WB.length)], low ? .95 : .9).f(B.rect(x0 + 1.4, y + 1, ww - 2.8, 1.2), low ? '#6e7a5a' : '#d8d0be', low ? .5 : .55).f(B.rect(x0 + 1.4, y + ch4 - 2.2, ww - 2.8, 1.2), '#4a4a40', .4);
        if (!low && r() < .3) B.f(B.blob(r, x0 + r() * ww, y + 2 + r() * (ch4 - 4), 2.6, 1.4, 6, .5), r() < .6 ? '#c8a648' : '#8a9a5a', .55); } x += w; } }
      B.f(B.rect(qx0, qy1 + face * .62, qx1 - qx0, 1.4), '#e4e0d2', .3);
      for (let x = qx0; x < qx1; x += 5) { if (r() < .75) B.f(B.blob(r, x, qy1 + face - 3, 3 + r() * 4, 2.4 + r() * 3, 6, .6), r() < .5 ? '#3e4e30' : '#5e6a3a', .85); if (r() < .3) B.f(B.circ(x + r() * 4, qy1 + face - 6 - r() * 4, .8), '#d8d4c6', .8); }
      for (let x = qx0 + 30; x < qx1 - 20; x += 70 + r() * 30) { B.s(`M${x} ${qy1 + 7}a3 3 0 1 0 0.1 0`, P.iron, 1.4, .9); B.s(`M${x} ${qy1 + 2}l0 2`, P.iron, 1.6, .9); }
      // steps down the wall near each end
      for (const sx of [qx0 + 24, qx1 - 40]) { B.f(B.rect(sx - 2, qy1, 24, face), '#3e4038', .35); for (let k = 0; k < 6; k++) B.f(B.rect(sx + k * .6, qy1 + k * 5, 20 - k * 1.2, 5.4), k > 3 ? '#5e6a50' : k % 2 ? '#9a9282' : '#c4bcaa').f(B.rect(sx + k * .6, qy1 + k * 5 + 4.2, 20 - k * 1.2, 1.2), '#3e3c34', .55); }
      // the wall's two ends: quoins at the corner, long and short in turn, and where an end stands on the beach, sand
      // banked up against it over the foot of the wall and back on to the strand, with pebbles, marram on the crest and
      // weed along the wet foot (round 2: each end stopped square on the sand, a cut edge)
      for (const [ex, dir] of [[qx0, 1], [qx1, -1]]) {
        for (let k = 0; k < 4; k++) { const qw = k % 2 ? 12 : 21, x0 = dir > 0 ? ex : ex - qw, y = qy1 + k * ch4; B.f(B.rr(x0 + .5, y + .5, qw - 1, ch4 - 1, 1.4), k === 3 ? '#5a644e' : '#c6bead', .97).f(B.rect(x0 + 1, y + 1, qw - 2, 1.2), k === 3 ? '#76825e' : '#eee8da', .6).f(B.rect(x0 + 1, y + ch4 - 2, qw - 2, 1.1), '#46443c', .45); }
        const eb = L.base((ex - dir * 16) / cw, (qy1 + face * .5 - W.sky) / ch); if (eb && eb.ocean) continue;   // (an end in the water keeps its face to the tide)
        const top = qy1 + face * .3, foot = qy1 + face + 6, fx = ex - dir * 34, far = ex + dir * 74;
        // (its shadow on the face first, then the drift with a rounded fall to the wet sand, a lit crest and a darker foot)
        B.s(`M${ex} ${top}C${ex + dir * 30} ${top + 3} ${ex + dir * 42} ${qy1 + face * .62} ${ex + dir * 54} ${qy1 + face * .8}`, '#3a362c', 3.4, .2);
        B.f(`M${fx} ${foot + 2}Q${ex - dir * 8} ${top - 4} ${ex + dir * 10} ${top}C${ex + dir * 30} ${top + 2} ${ex + dir * 40} ${qy1 + face * .62} ${ex + dir * 52} ${qy1 + face * .78}Q${ex + dir * 63} ${foot - 5} ${far} ${foot}Z`, B.lin(0, top, 0, foot + 2, [[0, '#f0dcae'], [.35, P.sand], [.75, P.sandDk], [1, P.sandWet]]), .97);
        B.s(`M${ex - dir * 4} ${top + 1.5}C${ex + dir * 22} ${top + 3} ${ex + dir * 34} ${qy1 + face * .55} ${ex + dir * 44} ${qy1 + face * .7}`, '#fff6e0', 1.3, .45);
        for (let k = 0; k < 9; k++) { const x = ex + dir * (r() * 62 - 12), y = top + 6 + r() * (foot - top - 8); B.f(B.ell(x, y, 1.4 + r() * 1.6, 1 + r() * .7), ['#a89c88', '#8c8474', '#c2b8a4', '#f2ebdc'][Math.floor(r() * 4)], .9); }
        for (let k = 0; k < 4; k++) B.tufts(r, ex + dir * (r() * 26 - 8), top + 3 + r() * 5, 8, 3, ['#8fa058', '#b4b868', '#6f8a46'], 6 + r() * 5);
        for (let k = 0; k < 5; k++) { const x = ex + dir * (56 + r() * 30), y = foot - 1 - r() * 3; B.s(`M${x} ${y}q${dir * (3 + r() * 3)} ${-1 - r()} ${dir * (6 + r() * 4)} ${r() - .5}`, r() < .5 ? '#4e5e34' : '#6a7440', 1.3, .7); }
      }
      // the top: big granite slabs in courses of three depths along the quay, each its own grey (blue-grey, buff, a warm
      // pink now and then, the tone drifting across the quay by noise so it is never wallpaper), dark joints that read,
      // every slab lit along its top and left and shaded at its foot, with flecks in the grain, a crack or a chipped corner
      // (round 2: the flags were pale beige tiles at seven tenths, one flat floor; art round 3, 19 Nov 2026)
      B.cx.save(); B.cx.clip(new Path2D(quayShape));
      const GRAN = ['#b3ada2', '#a59f95', '#c0b9ab', '#9c978d', '#b9ae98', '#c4b8a0', '#aaa69c', '#bfb7a8', '#c9b9a2', '#a89c8a', '#b7a89a'];
      B.f(B.rect(qx0, qy0, qx1 - qx0, qy1 - qy0), '#625d54');
      for (let y = qy0 - 6; y < qy1; ) {
        const rc = kit.rng(kit.hash(Math.round(y * 3), 11, 41)), h = 16 + Math.floor(rc() * 3) * 3.5;
        for (let x = qx0 - rc() * 50; x < qx1; ) {
          const w = h * (1.5 + rc() * 1.9), n = kit.fbm(x / 170, y / 170, 44), t = GRAN[Math.floor((rc() * .65 + n * .35) * GRAN.length) % GRAN.length];
          const x0 = x + .9, y0 = y + .9, ww = w - 1.8, hh = h - 1.8;
          B.f(B.rr(x0, y0, ww, hh, 2.4), t).f(B.rr(x0 + .8, y0 + .6, ww - 1.6, 2, 1), '#ede7d9', .4).f(B.rect(x0 + .5, y0 + 1.2, 1.5, hh - 2.6), '#e6dfce', .22).f(B.rr(x0 + 1, y0 + hh - 2.6, ww - 2, 2.2, 1), '#4a463e', .3);
          for (let k = 0; k < 5; k++) B.f(B.rect(x0 + 2 + rc() * (ww - 4), y0 + 2.5 + rc() * (hh - 5), 1.3, 1), rc() < .5 ? '#77726a' : '#ece8de', .42);
          if (rc() < .13) B.s(`M${x0 + ww * (.2 + rc() * .4)} ${y0 + 1}l${ww * .12} ${hh * .45}l${ww * .1} ${hh * .5}`, '#57534a', .8, .5);
          if (rc() < .1) B.f(B.blob(rc, x0 + ww - 3, y0 + hh - 3, 4, 2.4, 6, .5), '#625d54', .85);
          x += w;
        }
        y += h;
      }
      // weather in broad patches (damp and dark in the hollows, bleached on the crowns), soft, at low strength
      kit.tiles([qx0, qy0, qx1, qy1], 110, 0, 45, (tx, ty, rr) => { for (let k = 0; k < 2; k++) { const x = tx + rr() * 110, y = ty + rr() * 110, n = kit.fbm(x / 140, y / 140, 46); B.f(B.blob(rr, x, y, 34 + rr() * 40, 12 + rr() * 12, 9, .5), n < .5 ? '#4e5a58' : '#f0e8d4', n < .5 ? .1 : .12); } });
      // feet have worn a paler, smoother way from the promenade down to the pier head (soft: passes of falling width)
      const road0 = (promenade.length > 1 ? promenade : []).reduce((m, p) => Math.abs(p.y - qy0) < Math.abs(m.y - qy0) ? p : m, { x: (qx0 + qx1) / 2, y: qy0 }), pierMid = (pierX0 + pierX1) / 2 * cw;
      for (const [lw, la] of [[70, .06], [52, .07], [36, .08]]) B.s(`M${road0.x} ${qy0 - 4}C${road0.x} ${qy0 + 40} ${pierMid} ${qy1 - 50} ${pierMid} ${qy1 + 4}`, '#f2ead6', lw, la);
      // salt and spray darken the stone towards the sea edge
      B.f(B.rect(qx0, qy1 - 26, qx1 - qx0, 26), B.lin(0, qy1 - 26, 0, qy1, [[0, 'rgba(62,70,66,0)'], [1, 'rgba(62,70,66,.26)']]));
      // puddles left by the last rain or a wave over the copes, in the hollows off the trodden way: each holds the sky
      kit.tiles([qx0 + 20, qy0 + 20, qx1 - 20, qy1 - 8], 90, 0, 47, (tx, ty, rr) => { const x = tx + 10 + rr() * 70, y = ty + 6 + rr() * 60; if (y > qy1 - 10 || y < qy0 + 18 || Math.abs(x - pierMid) < 46 || rr() > .3) return;
        const pw = 9 + rr() * 13, ph = 3 + rr() * 2.6; B.f(B.blob(rr, x + 1, y + .8, pw + 2, ph + 1.4, 9, .4), '#4a4c46', .28).f(B.blob(rr, x, y, pw, ph, 9, .35), '#93acb0', .85).f(B.blob(rr, x - pw * .2, y - ph * .25, pw * .55, ph * .45, 7, .4), '#d6eaec', .7).f(B.ell(x + pw * .35, y + ph * .3, pw * .3, .7), '#5e767a', .5); });
      // lichen in drifts on the slabs out of the way of feet (golden and grey-green crust), gulls' white here and there
      kit.tiles([qx0, qy0, qx1, qy1], 44, 0, 42, (tx, ty, rr) => { const n = kit.fbm(tx / 200, ty / 200, 43), away = Math.min(1, Math.abs(tx + 22 - pierMid) / 140); if (rr() > n * (.4 + away)) return;
        for (let k = 0, m = 1 + Math.floor(rr() * 3); k < m; k++) { const x = tx + rr() * 44, y = ty + rr() * 44; B.f(B.blob(rr, x, y, 2.4 + rr() * 3.4, 1.4 + rr() * 1.2, 6, .5), rr() < .55 ? '#d4a23c' : rr() < .5 ? '#a4ae8c' : '#e2ddc8', .55); }
        if (rr() < .2) B.f(B.circ(tx + rr() * 44, ty + rr() * 44, .9), '#f6f4ec', .75); });
      B.cx.restore();
      for (let x = qx0; x < qx1; ) { const w = 22 + r() * 14, ww = Math.min(w, qx1 - x); B.f(B.rr(x + .6, qy1 - 6, ww - 1.2, 7, 1.8), r() < .5 ? '#b0a894' : '#a0988a').f(B.rect(x + 1, qy1 - 5.6, ww - 2, 1.7), '#dcd6c6', .7).f(B.rect(x + 1, qy1 - .4, ww - 2, 1.2), '#4e4c44', .45); x += w; }
      // the kerb only down the ends and along the sea; on the landward side the lawn runs on to the flags in a broken,
      // trodden fringe (a ruled line across the whole screen there read as pasted on), clear of where the road comes in
      B.s(`M${qx0} ${qy0 + 18}L${qx0} ${qy1}L${qx1} ${qy1}L${qx1} ${qy0 + 18}`, P.kerb, 2.2, .55);
      const road = (promenade.length > 1 ? promenade : []).reduce((m, p) => Math.abs(p.y - qy0) < Math.abs(m.y - qy0) ? p : m, { x: -1e9, y: 1e9 });
      for (let x = qx0 + 8; x < qx1 - 8; x += 5) {
        const off = Math.abs(x - road.x) - 34; if (off < 0) continue; const near = Math.min(1, off / 40), n = kit.noise(x / 46, 3, 77), dep = (4 + n * 13) * near;
        B.f(B.blob(r, x, qy0 + dep * .35, 5 + r() * 4, dep * .55 + 2, 7, .5), r() < .5 ? P.lawn : P.lawnLo, .9 * near);
        if (r() < .7) B.tufts(r, x, qy0 + dep * .6 + 2, 7, 3, [P.lawnLo, P.lawnHi], 4 + r() * 3);
        if (r() < .18) B.f(B.ell(x + 3, qy0 + dep + 4 + r() * 6, 2.2 + r() * 2, 1.4), P.lawnLo, .45 * near);   // (moss in the joints a stride out)
      }
      // a rope coil and a lost glove (the steps down the wall are laid with the wall, under the sand banked at its ends)
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
        // (it was one grey disc with a darker rim: now a stepped outcrop, a dark seaward face cut by joints with weed and
        // barnacles at its foot, and a top of separate slabs, each lit on its upper left, with turf and thrift in the joints)
        B.f(B.blob(r, sx + 6, sy + 12, 98, 26, 14, .22), '#2e4a48', .3);
        B.f(B.blob(r, sx, sy + 6, 92, 24, 14, .2), P2.rockDk).f(B.blob(r, sx - 2, sy + 2, 90, 21, 14, .2), '#5e584e');
        for (let k = 0; k < 16; k++) { const a = Math.PI * (.08 + k / 16 * .84), x = sx + Math.cos(a) * 88, y = sy + 4 + Math.sin(a) * 22; B.s(`M${x} ${y - 6}l${(r() - .5) * 3} ${7 + r() * 6}`, '#2e2a24', 1.1, .6); }
        for (let k = 0; k < 30; k++) { const a = Math.PI * (.06 + r() * .88), x = sx + Math.cos(a) * (86 + r() * 6), y = sy + 8 + Math.sin(a) * (22 + r() * 3); B.f(B.blob(r, x, y, 4 + r() * 5, 1.8 + r() * 1.4, 6, .5), r() < .6 ? '#3e4e30' : '#5a6a3a', .85); if (r() < .4) B.f(B.circ(x + (r() - .5) * 6, y - 3, .8), '#dcd8ca', .8); }
        const slabs = []; for (let k = 0; k < 9; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * .72; slabs.push({ x: sx - 6 + Math.cos(a) * 80 * d, y: sy - 3 + Math.sin(a) * 15 * d, w: 22 + r() * 22, h: 7 + r() * 5 }); }
        slabs.sort((a, b) => a.y - b.y);
        B.cx.save(); B.cx.clip(new Path2D(B.blob(r, sx - 3, sy + 1, 88, 20, 14, .18)));
        B.f(B.blob(r, sx - 4, sy - 1, 86, 19, 14, .2), P2.rockLo);
        for (const q of slabs) { B.f(B.blob(r, q.x + 2, q.y + 2, q.w, q.h, 8, .3), '#4e4a42', .7).f(B.blob(r, q.x, q.y, q.w, q.h, 8, .3), r() < .5 ? P2.rock : '#aaa294').f(B.blob(r, q.x - q.w * .25, q.y - q.h * .3, q.w * .55, q.h * .4, 7, .35), P2.rockHi, .75);
          if (r() < .4) B.f(B.blob(r, q.x + q.w * .2, q.y - q.h * .1, 5, 1.8, 6, .5), P2.lichen, .5); B.s(`M${q.x - q.w * .9} ${q.y + q.h * .7}q${q.w * .9} ${2} ${q.w * 1.8} 0`, '#3e3a34', .9, .5); }
        for (let k = 0; k < 14; k++) { const x = sx - 70 + r() * 140, y = sy - 14 + r() * 10; if (Math.abs(x - c.x) < 34 && y > sy - 12) continue; B.tufts(r, x, y, 8, 3, ['#6f8a4a', '#86a058', '#5f7a3e'], 4 + r() * 3); if (r() < .4) B.f(B.circ(x + (r() - .5) * 5, y - 4, 1.4), C.season === 'winter' ? '#c8c0b8' : '#e8a0b8', .95); }
        B.cx.restore();
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
    // (clear of the two lamps that stand at the pier head)
    const lamps = gardenIslandHarbourLamps(L.D);
    for (let x = quay.x - 5.4; x < quay.x + 6; x += 1.45) { if (x > pierX0 - (lamps.length ? 1.3 : .3) && x < pierX1 + (lamps.length ? 1.3 : .4)) continue; const p = atCell(x, quay.y + 1.5); thing({ key: 'bollard', box: [-10, -22, 12, 6], foot: [-7, 9, 7], x: p.x, y: p.y, draw: drawBollard(P) }); }
    // the harbour's lamps (gardenIslandHarbourLamps, lit at dusk by the world's lights): an iron post on each side of the
    // pier head, each foot solid, so you walk round them (the lantern at the pier's end is drawn with the deck)
    for (const q of lamps) { const p = atCell(q.x, q.y); thing({ key: 'harbour-lamp-' + q.key + '|' + C.season, x: p.x, y: p.y, box: [-15, -q.h - 20, 15, 6], foot: [-5, 5, 6], draw: drawQuayLamp(P, q.h) }); }
    // where each stands is shared with walking (gardenIslandHarbourThings), so the feet meet what is drawn
    const looks = { crates: [[-30, -46, 34, 8], drawCrates(P, 1)], pots: [[-28, -34, 30, 6], drawPots(P)], net: [[-42, -60, 44, 8], drawNet(P)], 'boat-sand': [[-46, -26, 48, 10], drawBoat(P, '#3f6f8a', false)],
      crate1: [[-16, -24, 18, 6], drawCrates(P, 0)], bench: [[-30, -30, 30, 6], drawBench(P)], anchor: [[-22, -44, 22, 6], drawAnchor(P)], fishbox: [[-16, -16, 18, 5], drawFishBox(P)] };
    for (const t of gardenIslandHarbourThings(L.D)) { const look = looks[t.key]; if (!look) continue; const p = atCell(t.x, t.y); thing({ key: t.key, box: look[0], x: p.x, y: p.y, draw: look[1] }); }
    // each stands in its own worn ground: damp sand scuffed round a boat or a net's posts, trodden turf round the crates,
    // pebbles and tufts at the foot (drawn in, not set down on top)
    for (const t of gardenIslandHarbourThings(L.D)) { const p = atCell(t.x, t.y), k = L.kind(t.x, t.y); if (k !== 'beach' && k !== 'grass') continue; const hw = (t.foot[2] - t.foot[0]) * cw / 2 + 8;
      add([p.x - hw - 24, p.y - 30, p.x + hw + 34, p.y + 24], 38, (B) => { const rr = kit.rng(kit.hash(Math.round(p.x), Math.round(p.y), 108)), sand = k === 'beach';
        B.f(B.blob(rr, p.x + 5, p.y, hw + 6, 7, 9, .4), sand ? P.sandWet : P.lawnLo, sand ? .32 : .4).f(B.blob(rr, p.x - 2, p.y - 2, hw * .8, 4.5, 9, .4), sand ? P.sandDk : '#8a7a58', sand ? .14 : .2);
        for (let i = 0; i < 9; i++) { const ax = p.x + (rr() - .5) * (hw * 2 + 16), ay = p.y + (rr() - .4) * 10; if (sand) B.f(B.ell(ax, ay, 1.3 + rr() * 1.6, .9 + rr() * .7), ['#a89c88', '#8c8474', '#c2b8a4', '#f2ebdc'][Math.floor(rr() * 4)], .9); else B.tufts(rr, ax, ay, 6, 3, [P.lawnLo, P.lawnHi, P.leaf[1]], 4 + rr() * 3); }
        if (sand) B.s(`M${p.x + hw * .2} ${p.y + 2}q${hw * .5} 3 ${hw + 10} -1`, '#f2e6c4', 1.4, .5); }); }
    // boats at their moorings and two buoys, out on the bay
    // (where they ride is set from the quay, so it follows the layout; a buoy no longer sits on boat-a)
    for (const [dx, dy, col, k] of [[-6.7, 7, '#a8402e', 'boat-a'], [3.7, 8.6, '#2f6a5a', 'boat-b'], [-7.9, 9.2, '#d8c890', 'boat-c']]) { const x = quay.x + dx, y = quay.y + dy; const b = L.base(x, y); if (b && b.ocean) { const p = atCell(x, y); thing({ key: k, box: [-54, -26, 58, 14], x: p.x, y: p.y, bob: 1.4, draw: drawBoat(P, col, true) }); } }
    for (const [dx, dy] of [[-3.1, 9.8], [6.5, 9], [-9.6, 7.4]]) { const x = quay.x + dx, y = quay.y + dy; const b = L.base(x, y); if (b && b.ocean) { const p = atCell(x, y); thing({ key: 'buoy', box: [-8, -14, 8, 5], x: p.x, y: p.y, bob: 1.8, draw: drawBuoy(P) }); } }
  }

  /* ---------- the standing things ---------- */
  // (a cast-iron bollard about 0.4 of your height, with its cap and a waist where the ropes go: it stood 11 px, a stud)
  const drawBollard = P => B => { B.shadow(3, 1, 10, 3, .32); B.f(B.rr(-5.4, -16, 10.8, 16, 3), P.iron).f(B.rect(-4.2, -15, 2.2, 14), '#5c6266', .8).f(B.rect(-5.6, -9.6, 11.2, 1.6), '#1e2224', .6).f(B.ell(0, -16.4, 7.4, 2.8), '#3c4246').f(B.ell(-1.2, -17.2, 4, 1.3), '#6e767a', .8).f(B.rect(-5.4, -2.4, 10.8, 2.4), '#4a3e2c', .35); };
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
    // afloat: its own darker water under it, a broken ring of ripple, and the mooring rope going down off the bow
    if (afloat) { B.f(B.ell(2, 5, 50, 7), '#2e5a6a', .25); B.cx.setLineDash([16, 5, 9, 7]); B.s(B.ell(2, 4, 54, 8), '#e8f2ee', 1.2, .45); B.cx.setLineDash([]); B.s('M42 -8q10 4 12 13', P.rope, 1.2, .85).s('M54 5q2 2 1 5', P.rope, 1, .35); }
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
  // a harbour lamp about two of your heights: a granite plinth, a cast-iron column with collars and a scrolled bracket, and
  // a lantern of four warm panes under a domed cap and finial (its light at dusk is the world's: 94-garden-native-world.js)
  const drawQuayLamp = (P, h) => B => {
    B.shadow(2, 1, 9, 3, .32);
    B.f(B.rr(-8, -9, 16, 9, 2), '#a8a294').f(B.rect(-8, -9, 5, 9), '#cfc8b8', .5).f(B.rect(3, -9, 5, 9), '#6e6a60', .5).f(B.rr(-9, -11, 18, 3, 1.2), '#8e887c').f(B.blob(KIT_RNG(7), -2, -1, 9, 1.6, 6, .5), '#7a8a4e', .45);
    B.f(`M-3.4 -11L-2.2 ${-h + 6}L2.2 ${-h + 6}L3.4 -11Z`, P.iron).s(`M-1.8 -12L-1 ${-h + 7}`, '#6e767a', 1, .8);
    B.f(B.rr(-4.6, -24, 9.2, 3, 1.2), '#2a2e30').f(B.rr(-4, -h * .55, 8, 2.4, 1), '#2a2e30');
    B.s(`M-2 ${-h + 8}q-6 -1 -6 -5M2 ${-h + 8}q6 -1 6 -5`, P.iron, 1.4, .95);
    const g0 = -h - 7, g1 = -h + 5;
    B.f(`M-6 ${g0}L6 ${g0}L4.6 ${g1}L-4.6 ${g1}Z`, '#f4e3a8', .96).f(`M-6 ${g0}L-1 ${g0}L-1.6 ${g1}L-4.6 ${g1}Z`, '#fff6d4', .55).s(`M-6 ${g0}L6 ${g0}L4.6 ${g1}L-4.6 ${g1}ZM0 ${g0}V${g1}`, P.iron, 1.2);
    B.f(B.rr(-5.6, g1, 11.2, 2.4, 1), P.iron).f(`M-8 ${g0}Q0 ${g0 - 8} 8 ${g0}Z`, P.iron).f(`M-7 ${g0}Q-2 ${g0 - 6} 0 ${g0 - 5}L0 ${g0}Z`, '#6e767a', .5).f(B.circ(0, g0 - 7, 1.6), P.iron).s(`M0 ${g0 - 8}v-3`, P.iron, 1.2);
  };
  const KIT_RNG = s => window.GardenPaintTerrainKit.rng(s);
  const drawBuoy = P => B => { B.f(B.ell(0, 2, 8, 2.4), '#2e5a6a', .25); B.f(B.circ(0, -4, 5.4), '#c8402e').f(B.rect(-5.4, -5, 10.8, 2.2), '#f4efe2').f(B.circ(-1.8, -6, 1.6), '#fff', .5); B.s('M0 -9.4v-4', P.iron, 1.2); };

  V.parts.push({ id: 'harbour', compose });
})();

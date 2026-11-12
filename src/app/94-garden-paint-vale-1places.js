/* Painted vale: the river crossings, the old woodland's ruins, the plazas and
 * the Great Oak (see 94-garden-paint-vale-0kit.js for the layers).
 *  - Crossings (presentation.crossings): the river runs on under each one (the
 *    painted rivers stop either side of a route), then a timber footbridge or a
 *    line of stepping stones goes over it. The Millwater hump bridge is the
 *    gate's own art; it only gets its water.
 *  - Ruins (landforms 'ruin-wall' and 'ruin'): dry walls standing a man's height
 *    or tumbled to the knee, ivy and moss on them, stones fallen at the foot,
 *    ferns; the old foundation a low ring of stones in the grass. A wood that
 *    keeps things: quiet, mossy, never grim.
 *  - Plazas (presentation.plazas): each laid the way its job asks (setts in the
 *    cider square, a mill yard with cart ruts and flour, broken flags in the
 *    ruin court, flags on the lakeside terrace, leaf litter and roots under the
 *    Great Oak, whose crown is painted here, huge, at the clearing's north edge).
 *  - Hollin's hut and the ice house get their surroundings: a log stack, a
 *    chopping block, chips; a stone-lined way down to the ice house door. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const RUIN = { body: '#a7a491', lo: '#7d7b6b', hi: '#ccc8b4', dk: '#555547', moss: '#6f8446', mossHi: '#93a85a', ivy: '#3c5a32', ivyHi: '#5a7e44' };

  /* ---------- crossings ---------- */
  function lineOf(cells) { const cum = [0]; for (let i = 1; i < cells.length; i++) cum.push(cum[i - 1] + Math.hypot(cells[i][0] - cells[i - 1][0], cells[i][1] - cells[i - 1][1])); return { cells, cum, len: cum[cum.length - 1] }; }
  function at(Ln, s) { s = Math.max(0, Math.min(Ln.len, s)); let i = 1; while (i < Ln.cum.length - 1 && Ln.cum[i] < s) i++; const a = Ln.cells[i - 1], b = Ln.cells[i], seg = Ln.cum[i] - Ln.cum[i - 1] || 1, t = (s - Ln.cum[i - 1]) / seg, tx = (b[0] - a[0]) / seg, ty = (b[1] - a[1]) / seg; return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, tx, ty }; }
  function nearest(Ln, x, y) { let best = null; for (let s = 0; s <= Ln.len; s += .1) { const p = at(Ln, s), d = Math.hypot(p.x - x, p.y - y); if (!best || d < best.d) best = { s, d }; } return best; }

  function crossings(C) {
    const { L, P, add, under } = C, cw = L.cw, ch = L.ch, W = L.W;
    for (const c of L.pres.crossings || []) {
      const riv = L.pres.rivers && L.pres.rivers[c.over]; if (!riv || !riv.line) continue;
      const Ln = lineOf(riv.line), hw = riv.halfWidth || 1, n0 = nearest(Ln, c.x, c.y);
      const wet = s => { const p = at(Ln, s), b = L.base(p.x, p.y); return !!(b && b.freshwater); };
      let s0 = n0.s, s1 = n0.s; for (let k = 0; k < 40 && s0 > 0 && !wet(s0); k++) s0 -= .15; for (let k = 0; k < 40 && s1 < Ln.len && !wet(s1); k++) s1 += .15;
      s0 = Math.max(0, s0 - .7); s1 = Math.min(Ln.len, s1 + .7);
      const mid = at(Ln, n0.s), anchor = { x: mid.x * cw, y: W.sky + mid.y * ch }, px = (x, y) => ({ x: x * cw - anchor.x, y: W.sky + y * ch - anchor.y });
      const left = [], right = [], centre = [];
      for (let s = s0; s <= s1 + 1e-6; s += .2) { const p = at(Ln, s), nx = -p.ty, ny = p.tx, k = hw * (1 + .06 * Math.sin(s * 3.1)); left.push(px(p.x + nx * k, p.y + ny * k)); right.push(px(p.x - nx * k, p.y - ny * k)); centre.push(px(p.x, p.y)); }
      if (left.length < 2) continue;
      const strip = left.concat(right.slice().reverse()), bb = V.hull(strip.map(q => ({ x: q.x, y: q.y }))).reduce((b, q) => [Math.min(b[0], q.x), Math.min(b[1], q.y), Math.max(b[2], q.x), Math.max(b[3], q.y)], [1e9, 1e9, -1e9, -1e9]);
      // the water under the crossing: drawn under the painted river, so its banks lap over the ends
      under({ key: 'cross-water|' + c.id, x: anchor.x, y: anchor.y, box: [bb[0] - 16, bb[1] - 16, bb[2] + 16, bb[3] + 16], draw: B => {
        const shape = B.poly(strip);
        B.cx.filter = 'blur(2px)'; B.f(shape, P.bank, .8); B.cx.filter = 'none';
        B.cx.save(); B.cx.translate(0, 0); B.s(shape, P.bank, 9, .7); B.s(shape, '#6a6048', 3, .5); B.cx.restore();
        B.f(shape, P.river); B.cx.save(); B.cx.clip(new Path2D(shape));
        V.strokePts(B, centre, P.riverDk, hw * Math.min(cw, ch) * 1.1, .35);
        const r = C.kit.rng(C.kit.hashStr(c.id));
        for (const q of V.walk(centre, 9)) { const o = (r() - .5) * hw * ch * 1.4; B.s(`M${q.x - q.ty * o} ${q.y + q.tx * o}l${q.tx * (6 + r() * 10)} ${q.ty * (6 + r() * 10)}`, r() < .7 ? P.riverHi : '#e8f0f4', 1 + r(), .35 + r() * .3); }
        B.cx.restore();
      } });
      if (c.kind === 'hump-bridge') continue;
      // the crossing itself, square to the river at its middle
      const nx = -mid.ty, ny = mid.tx, span = c.kind === 'footbridge' ? hw + .7 : hw + .15;
      const A = { x: (mid.x + nx * span) * cw, y: W.sky + (mid.y + ny * span) * ch }, Bp = { x: (mid.x - nx * span) * cw, y: W.sky + (mid.y - ny * span) * ch };
      const box = [Math.min(A.x, Bp.x) - 40, Math.min(A.y, Bp.y) - 40, Math.max(A.x, Bp.x) + 40, Math.max(A.y, Bp.y) + 40];
      if (c.kind === 'footbridge') add(box, 61, (B, r) => footbridge(B, r, P, A, Bp));
      else add(box, 62, (B, r) => stones(B, r, P, A, Bp, C.season));
    }
  }
  function footbridge(B, r, P, A, Bp) {
    const L = Math.hypot(Bp.x - A.x, Bp.y - A.y), ux = (Bp.x - A.x) / L, uy = (Bp.y - A.y) / L, vx = -uy, vy = ux, hw = 17;
    const q = (t, s, lift) => ({ x: A.x + ux * t + vx * s, y: A.y + uy * t + vy * s - (lift || 0) });
    const arch = t => Math.sin(Math.PI * t / L) * 7;
    B.cx.filter = 'blur(3px)'; B.f(B.poly([q(8, -hw + 4), q(L - 8, -hw + 4), q(L - 8, hw + 10), q(8, hw + 10)]), '#1e2e34', .3); B.cx.filter = 'none';
    // stringers, then planks across, each lit on its upper edge, a few weathered pale
    for (const s of [-hw + 2, hw - 2]) { const pts = []; for (let t = 0; t <= L; t += 4) pts.push(q(t, s, arch(t) - 3)); V.strokePts(B, pts, P.woodDk, 5, .9); }
    for (let t = 2; t < L - 2; t += 6.4) { const a = arch(t), tone = r(); B.f(B.poly([q(t, -hw, a), q(t + 5.4, -hw, a), q(t + 5.4, hw, a), q(t, hw, a)]), tone < .2 ? P.woodHi : tone < .8 ? P.wood : P.woodLo).f(B.poly([q(t, -hw, a), q(t + 1.6, -hw, a), q(t + 1.6, hw, a), q(t, hw, a)]), P.woodHi, .5); }
    // handrails on both sides: posts and a rail, the near one darker
    for (const [s, col] of [[-hw, P.woodLo], [hw, P.wood]]) {
      const rail = []; for (let t = 0; t <= L; t += 4) rail.push(q(t, s, arch(t) + 13)); V.strokePts(B, rail, col, 2.6, .95); V.strokePts(B, rail, P.woodHi, 1, .5, 0, -.8);
      for (let t = 2; t <= L - 1; t += (L - 4) / 3) { const a = q(t, s, arch(t)), b = q(t, s, arch(t) + 14); B.s(`M${a.x} ${a.y}L${b.x} ${b.y}`, P.woodDk, 3, .95); }
    }
    for (const t of [0, L]) B.f(B.blob(r, q(t, 0).x, q(t, 0).y + 4, 22, 8, 7, .4), '#9c8a66', .55);
  }
  function stones(B, r, P, A, Bp, season) {
    const L = Math.hypot(Bp.x - A.x, Bp.y - A.y), n = Math.max(3, Math.round(L / 26)), ux = (Bp.x - A.x) / L, uy = (Bp.y - A.y) / L;
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n * L, x = A.x + ux * t + (r() - .5) * 5, y = A.y + uy * t + (r() - .5) * 3, rx = 10 + r() * 4, ry = 6 + r() * 2;
      B.s(B.ell(x + 3, y + 3, rx + 5, ry + 3), P.foam, 1.4, .55);
      B.f(B.blob(r, x + 1, y + 3, rx, ry, 8, .25), '#4e4a40').f(B.blob(r, x, y, rx * .94, ry * .86, 8, .25), '#9a9484').f(B.blob(r, x - rx * .2, y - ry * .25, rx * .55, ry * .4, 7, .3), '#c8c2b0', .9);
      if (r() < .5) B.f(B.blob(r, x + rx * .2, y + ry * .1, rx * .35, ry * .2, 6, .5), season === 'winter' ? '#e8ecef' : '#6f8446', .8);
    }
  }

  /* ---------- ruins ---------- */
  function ruins(C) {
    const { L, add, thing, kit } = C, W = L.W;
    for (const f of L.D.landforms || []) {
      if (!f.polygon || f.polygon.length < 4) continue;
      if (f.kind === 'ruin-wall') {
        const n = f.polygon.length >> 1, a = f.polygon.slice(0, n).map(L.pt), b = f.polygon.slice(n).reverse().map(L.pt), m = Math.min(a.length, b.length);
        const mid = []; for (let i = 0; i < m; i += 2) mid.push({ x: (a[i].x + b[i].x) / 2, y: (a[i].y + b[i].y) / 2 });
        if (m % 2 === 0) mid.push({ x: (a[m - 1].x + b[m - 1].x) / 2, y: (a[m - 1].y + b[m - 1].y) / 2 });
        let foot = mid[0]; for (const p of mid) if (p.y > foot.y) foot = p;
        const seed = kit.hashStr(f.id), rr = kit.rng(seed), H = [];
        // a ruined profile: high runs and tumbled gaps, never the same twice
        let h = 28 + rr() * 14; for (let i = 0; i < mid.length; i++) { h += (rr() - .5) * 12; if (rr() < .1) h = 7 + rr() * 6; if (rr() < .12) h = 32 + rr() * 16; h = Math.max(6, Math.min(48, h)); H.push(h); }
        for (let k = 0; k < 2; k++) for (let i = 1; i < H.length - 1; i++) H[i] = (H[i - 1] + H[i] * 2 + H[i + 1]) / 4;
        // in pieces of six stretches: each bakes quickly and sorts by its own foot
        for (let g = 0; g < mid.length - 1; g += 6) {
          const sub = mid.slice(g, g + 7), hs = H.slice(g, g + 7); let ft = sub[0]; for (const p of sub) if (p.y > ft.y) ft = p;
          const C2 = sub.map(p => ({ x: p.x - ft.x, y: p.y - ft.y })), bb = kit.bboxOf(C2);
          thing({ key: 'ruin3|' + f.id + '|' + g, x: ft.x, y: ft.y, box: [bb[0] - 30, bb[1] - 64, bb[2] + 30, bb[3] + 20], K: 1.1, draw: B => ruinWall(B, kit.rng(seed + 1 + g), C2, hs, C.P, C.season) });
        }
      } else if (f.kind === 'ruin') {
        const loop = f.polygon.map(L.pt), bb = kit.bboxOf(loop, 30);
        add(bb, kit.hashStr(f.id), (B, r) => foundation(B, r, loop, C.P, C.season));
      }
    }
  }
  function ruinWall(B, r, C2, H, P, season) {
    const T = 7, ST = { rock: RUIN.body, rockLo: RUIN.lo, rockHi: RUIN.hi, rockDk: RUIN.dk };
    // contact shade along the foot
    V.strokePts(B, C2, '#24301e', 18, .16, 3, 4); V.strokePts(B, C2, '#24301e', 9, .18, 2, 3);
    // the wall as short boxes along its centre line, drawn back to front; each box: lit or shaded faces, a mossy top
    const segs = []; for (let i = 0; i < C2.length - 1; i++) segs.push(i); segs.sort((i, j) => (C2[i].y + C2[i + 1].y) - (C2[j].y + C2[j + 1].y));
    for (const i of segs) {
      const p = C2[i], q = C2[i + 1], L = Math.hypot(q.x - p.x, q.y - p.y) || 1, nx = -(q.y - p.y) / L * T, ny = (q.x - p.x) / L * T * .6, h0 = H[i], h1 = H[i + 1];
      const foot = [{ x: p.x + nx, y: p.y + ny }, { x: q.x + nx, y: q.y + ny }, { x: q.x - nx, y: q.y - ny }, { x: p.x - nx, y: p.y - ny }], hs = [h0, h1, h1, h0];
      const up = (v, k) => ({ x: v.x, y: v.y - hs[k] });
      for (let e = 0; e < 4; e++) {
        const v0 = foot[e], v1 = foot[(e + 1) % 4], ex = v1.x - v0.x, ey = v1.y - v0.y, onx = ey, ony = -ex;   // outward normal for a clockwise loop
        const cx = (foot[0].x + foot[2].x) / 2, cy = (foot[0].y + foot[2].y) / 2, mx = (v0.x + v1.x) / 2 - cx, my = (v0.y + v1.y) / 2 - cy, s = Math.sign(onx * mx + ony * my) || 1, outY = ony * s, outX = onx * s;
        if (outY <= 0) continue;   // faces turned away from the camera are hidden
        const face = [v0, v1, up(v1, (e + 1) % 4), up(v0, e)], lit = outX < 0 ? 1 : 0;
        B.f(B.poly(face), B.lin(0, Math.min(face[2].y, face[3].y), 0, Math.max(v0.y, v1.y), [[0, lit ? RUIN.hi : RUIN.body], [.75, lit ? RUIN.body : RUIN.lo], [1, RUIN.dk]]));
        B.cx.save(); B.cx.clip(new Path2D(B.poly(face)));
        const len = Math.hypot(ex, ey), hh = Math.max(hs[e], hs[(e + 1) % 4]);
        for (let y = 0; y < hh; y += 6.5) for (let t = (Math.round(y / 6.5) % 2) * 5; t < len; t += 10 + r() * 5) { const x0 = v0.x + ex * t / len, y0 = v0.y + ey * t / len - y - 3; if (r() < .3) continue; B.f(B.ell(x0, y0, 4.4 + r() * 2.4, 2.5), r() < .4 ? RUIN.lo : r() < .8 ? RUIN.body : RUIN.hi, .75).f(B.rect(x0 - 4, y0 + 2.3, 8, .9), RUIN.dk, .35); }
        B.f(B.poly([v0, v1, { x: v1.x, y: v1.y - 7 }, { x: v0.x, y: v0.y - 7 }]), RUIN.moss, .4);
        if (r() < .5) { const t = r(), x = v0.x + ex * t, yTop = v0.y + ey * t - Math.min(hs[e], hs[(e + 1) % 4]), d = 8 + r() * 16; B.f(`M${x - 6} ${yTop}Q${x - 8} ${yTop + d * .7} ${x} ${yTop + d}Q${x + 8} ${yTop + d * .6} ${x + 7} ${yTop}Z`, RUIN.ivy, .92); for (let k = 0; k < 5; k++) B.f(B.blob(r, x + (r() - .5) * 11, yTop + r() * d, 2.6, 2, 6, .5), r() < .5 ? RUIN.ivyHi : RUIN.ivy, .95); }
        B.cx.restore();
      }
      const top = foot.map((v, k) => up(v, k));
      B.f(B.poly(top), RUIN.body).f(B.poly(top), season === 'winter' ? '#f4f6f2' : RUIN.moss, season === 'winter' ? .9 : .55);
      if (season !== 'winter' && r() < .35) B.tufts(r, (top[0].x + top[2].x) / 2, (top[0].y + top[2].y) / 2 + 2, 10, 4, [RUIN.mossHi, '#8a9a58'], 6);
    }
    // tumbled stones and ferns at the foot
    for (let i = 0; i < C2.length; i++) { const p = C2[i]; if (r() < .6) B.stone(r, p.x + (r() - .5) * 16, p.y + 8 + r() * 8, 4 + r() * 4, 2.6 + r() * 1.6, ST, RUIN.moss); if (r() < .45) fern(B, r, p.x + (r() - .5) * 18, p.y + 10, season); }
  }
  function fern(B, r, x, y, season) {
    const col = season === 'autumn' ? '#a8703a' : season === 'winter' ? '#8a6a4a' : '#4f7a3a', hi = season === 'autumn' ? '#c8904a' : '#7aa255';
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * .42, l = 9 + r() * 6, ex = x + Math.cos(a) * l * 1.4, ey = y + Math.sin(a) * l; B.s(`M${x} ${y}Q${(x + ex) / 2} ${ey - 3} ${ex} ${ey}`, k % 2 ? col : hi, 2.2, .9); }
  }
  function foundation(B, r, loop, P, season) {
    const kit = window.GardenPaintTerrainKit, pts = kit.resample(loop.concat([loop[0]]), 6);
    B.f(B.poly(loop), P.lawnLo, .35);
    for (let i = 0; i < pts.length; i++) { if (Math.sin(i * .37) > .78) continue; const p = pts[i]; B.stone(r, p.x + (r() - .5) * 3, p.y + (r() - .5) * 2, 4.6 + r() * 2.6, 3 + r() * 1.2, { rock: RUIN.body, rockLo: RUIN.lo, rockHi: RUIN.hi, rockDk: RUIN.dk }, r() < .5 ? RUIN.moss : null); if (r() < .1) fern(B, r, p.x, p.y + 2, season); }
  }

  /* ---------- plazas and the Great Oak ---------- */
  const STYLE = { 'cider-square': 'setts', 'mill-yard': 'yard', 'ruin-court': 'broken', 'lakeside-terrace': 'flags', 'great-oak-clearing': 'litter' };
  function plazas(C) {
    const { L, P, add, kit, thing } = C, cw = L.cw, ch = L.ch;
    for (const pz of L.pres.plazas || []) {
      const style = STYLE[pz.id]; if (!style) continue;
      const rt = L.routes.get(pz.route); if (!rt || !rt.points || rt.points.length < 2) continue;
      const a = L.pt(rt.points[0]), b = L.pt(rt.points[rt.points.length - 1]), w = rt.widthCells || 4, seed = kit.hashStr(pz.id);
      const shape = V.capsule(kit.rng(seed), a, b, w / 2 * cw * .95 + 8, w / 2 * ch * 1.05 + 4, style === 'broken' || style === 'litter' ? .3 : .08), bb = kit.bboxOf(shape, 30);
      add(bb, seed, (B, r) => {
        const path = new Path2D(B.poly(shape)), dry = new Path2D(); dry.rect(bb[0] - 10, bb[1] - 10, bb[2] - bb[0] + 20, bb[3] - bb[1] + 20); for (const w of L.D.freshwater || []) if (w.boundary) dry.addPath(V.loopPath([w.boundary.map(L.pt)]));
        B.cx.clip(dry, 'evenodd');
        if (style !== 'litter') { B.cx.filter = 'blur(3px)'; B.f(path, '#2e3420', .2); B.cx.filter = 'none'; }
        B.cx.save(); B.cx.clip(path);
        if (style === 'setts') { V.setts(B, r, P, bb, { size: 11, salt: seed, grout: '#a8987a', cols: ['#c9b994', '#c2b28c', '#d2c5a2', '#bcac86'] }); for (let k = 0; k < 18; k++) B.f(B.blob(r, bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 14 + r() * 20, 4 + r() * 5, 7, .5), r() < .5 ? '#e0d4b2' : '#9c8c68', .25); }
        else if (style === 'yard') { V.setts(B, r, P, bb, { size: 11, salt: seed, grout: '#968e7a', cols: ['#b4ac98', '#aca490', '#bcb4a0', '#a49c88'] }); for (const o of [-9, 9]) V.strokePts(B, [{ x: a.x - 60, y: a.y + o + 8 }, { x: (a.x + b.x) / 2, y: a.y + o + 2 }, { x: b.x + 70, y: b.y + o - 10 }], '#6e6450', 4, .35); for (let k = 0; k < 14; k++) B.f(B.blob(r, a.x + (r() - .3) * (b.x - a.x + 80), a.y + (r() - .5) * 60, 10 + r() * 16, 3 + r() * 4, 7, .5), '#f4f0e4', .35); for (let k = 0; k < 40; k++) { const x = bb[0] + r() * (bb[2] - bb[0]), y = bb[1] + r() * (bb[3] - bb[1]); B.s(`M${x} ${y}l${(r() - .5) * 8} ${(r() - .5) * 3}`, '#d8b860', 1, .7); } }
        else if (style === 'broken') { B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), P.lawnLo); V.flags(B, r, Object.assign({}, P, { stone: '#bdb8a4', stoneLo: '#a29e8a', stoneHi: '#d2cebc', grout: '#7d7a68' }), bb, { row: 13, w: 24, salt: seed, broken: .2, moss: .3 }); }
        else if (style === 'flags') V.flags(B, r, P, bb, { row: 14, w: 26, salt: seed, moss: .04 });
        else { // the clearing under the oak: leaf litter, moss, roots running out from the trunk
          B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), C.season === 'winter' ? '#9a9a84' : '#8a8a52', .55);
          const leaf = C.season === 'autumn' ? ['#b0682a', '#d38f3a', '#8a5a2c', '#e0b050'] : C.season === 'winter' ? ['#8a7a5a', '#a0906a', '#6e6450'] : ['#7d8f4e', '#6a7c40', '#94a058', '#8a7a4a'];
          for (let k = 0; k < (bb[2] - bb[0]) * (bb[3] - bb[1]) / 90; k++) B.f(B.ell(bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 1.6 + r() * 1.6, 1 + r() * .8), leaf[Math.floor(r() * leaf.length)], .8);
          const o = oakAt(L, pz); for (let k = 0; k < 7; k++) { const ang = Math.PI * (.05 + k / 6 * .9), l = 60 + r() * 70; B.s(`M${o.x + Math.cos(ang) * 14} ${o.y}Q${o.x + Math.cos(ang) * l * .5} ${o.y + Math.sin(ang) * l * .25 + 6} ${o.x + Math.cos(ang) * l} ${o.y + Math.sin(ang) * l * .45}`, '#5a4632', 5 - k % 3, .55); }
        }
        B.cx.restore();
        if (style === 'setts' || style === 'flags' || style === 'yard') B.s(path, P.kerb, 3, .8);
      });
      // dressing by job: the cider square's press, bell and lanterns; the mill yard's millstone and sacks; the court's fallen column
      const spot = (x, y) => L.free(x, y) && ['grass', 'path'].includes(L.kind(x, y));
      const put = (cands, key, box, draw) => { for (const [x, y] of cands) if (spot(x, y)) { const p = L.cpt(x, y); thing({ key, box, x: p.x, y: p.y, draw }); return; } };
      if (pz.id === 'cider-square') { put([[80.2, 36.4], [79.6, 35.4], [75.4, 37.6]], 'press', [-26, -50, 28, 6], drawPress(P)); put([[79.6, 38.3], [80.4, 38.6]], 'bell', [-14, -64, 16, 5], drawBell(P)); put([[76.9, 38.6], [78.2, 38.9]], 'baskets', [-24, -18, 26, 5], drawBaskets(P, C.season)); }
      if (pz.id === 'mill-yard') { put([[76.6, 64.6], [77.2, 65.2], [76.9, 66.8]], 'millstone', [-22, -40, 24, 6], drawMillstone(P)); put([[77.3, 66.9], [73.6, 67.4], [76.8, 67.6]], 'sacks', [-22, -24, 24, 5], drawSacks(P)); }
      if (pz.id === 'ruin-court') { const c = L.cpt(pz.x + 1.4, pz.y + .9); add([c.x - 60, c.y - 30, c.x + 60, c.y + 30], 75, (B, r) => { B.shadow(4, 6, 46, 8, .3); B.f(B.rr(c.x - 44, c.y - 7, 80, 14, 7), RUIN.body).f(B.rr(c.x - 44, c.y - 7, 80, 5, 2.5), RUIN.hi, .8).f(B.ell(c.x + 38, c.y, 6, 7), RUIN.lo).f(B.ell(c.x + 38, c.y, 3.4, 4), RUIN.dk, .3); for (let k = -36; k < 34; k += 9) B.s(`M${c.x + k} ${c.y - 6}v12`, RUIN.lo, .8, .5); B.f(B.blob(r, c.x - 10, c.y - 6, 22, 3, 7, .5), RUIN.moss, .8); fern(B, r, c.x - 50, c.y + 6, C.season); fern(B, r, c.x + 20, c.y + 9, C.season); }); }
      if (style === 'litter') { const o = oakAt(L, pz); thing({ key: 'great-oak|' + C.season, x: o.x, y: o.y, box: [-250, -360, 250, 40], K: 1, draw: B => greatOak(B, kit.rng(seed + 9), P, C.season) }); }
    }
  }
  const drawPress = P => B => { B.shadow(4, 2, 24, 5, .3); B.f(B.rr(-18, -16, 36, 16, 3), P.wood).f(B.rect(-18, -16, 36, 3), P.woodHi, .7); for (const x of [-14, 12]) B.post(x, -46, -14, 5, [P.wood, P.woodLo, P.woodHi]); B.f(B.rect(-18, -50, 36, 6), P.woodLo).s('M0 -44V-20', P.iron, 3).s('M-10 -30H10', P.iron, 2.2).f(B.ell(0, -18, 12, 3), '#c8a04a', .8); };
  const drawBell = P => B => { B.shadow(2, 1, 8, 2.4, .3); B.post(0, -58, 0, 4, [P.wood, P.woodLo, P.woodHi]); B.s('M0 -56H10', P.woodLo, 2.6); B.f('M4 -54Q4 -46 2 -42H18Q16 -46 16 -54Q10 -58 4 -54Z', '#b08a3a').f('M5 -53Q5 -47 3 -43H8Q7 -48 8 -54Z', '#e0c070', .7).f(B.circ(10, -41, 1.6), '#5a4a2a'); };
  const drawBaskets = (P, season) => B => { B.shadow(2, 1, 22, 4, .3); for (const x of [-12, 10]) { B.f(`M${x - 10} -12L${x + 10} -12L${x + 8} 0L${x - 8} 0Z`, '#a8844e').s(`M${x - 9} -8H${x + 9}M${x - 8.5} -4H${x + 8.5}`, '#7a5e34', .8, .8); for (let k = 0; k < 5; k++) B.f(B.circ(x - 7 + k * 3.5, -13 - (k % 2) * 1.6, 2.6), season === 'autumn' ? (k % 2 ? '#c8402e' : '#e0b23a') : '#9cbc4a'); } };
  const drawMillstone = P => B => { B.shadow(6, 2, 20, 5, .3); B.f(B.ell(0, -18, 12, 18), '#8e8a7c').f(B.ell(-2, -19, 11, 17), '#b4ae9c').f(B.ell(-2, -19, 3.4, 5), '#5e5a4e'); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.s(`M${-2 + Math.cos(a) * 4} ${-19 + Math.sin(a) * 6}L${-2 + Math.cos(a + .3) * 10} ${-19 + Math.sin(a + .3) * 15}`, '#7a7668', 1, .7); } };
  const drawSacks = P => B => { B.shadow(2, 1, 22, 5, .3); for (const [x, y, s] of [[-10, 0, 1], [9, 0, .95], [0, -11, .9]]) { B.f(`M${x - 9 * s} ${y}Q${x - 11 * s} ${y - 12 * s} ${x - 5 * s} ${y - 16 * s}L${x + 5 * s} ${y - 16 * s}Q${x + 11 * s} ${y - 12 * s} ${x + 9 * s} ${y}Z`, '#e4dcc4').f(`M${x - 8 * s} ${y}Q${x - 10 * s} ${y - 11 * s} ${x - 5 * s} ${y - 15 * s}L${x - 2 * s} ${y - 15 * s}Q${x - 6 * s} ${y - 10 * s} ${x - 4 * s} ${y}Z`, '#fff', .5).s(`M${x - 4 * s} ${y - 16 * s}l${8 * s} 0`, '#a08a5a', 1.4); } };
  const oakAt = (L, pz) => L.cpt(pz.x + .4, pz.y - 1.9);
  function greatOak(B, r, P, season) {
    B.shadow(10, 6, 200, 34, .3);
    const bark = ['#6a5440', '#4e3e30', '#8a7258', '#3a2e24'];
    // roots flaring into the ground, the bole, and five great limbs
    B.f('M-46 6Q-30 -6 -22 -40L-20 -120Q-4 -132 18 -120L22 -40Q30 -6 52 8Q20 2 4 4Q-20 2 -46 6Z', bark[0]);
    B.f('M-40 4Q-26 -8 -20 -40L-18 -118Q-12 -124 -4 -122L-6 -40Q-12 -8 -24 4Z', bark[2], .6).f('M8 -120Q16 -100 18 -40Q22 -8 42 6Q24 0 12 2Q16 -40 4 -120Z', bark[1], .55);
    for (let k = 0; k < 7; k++) B.s(`M${-14 + k * 5} ${-8 - r() * 10}q${(r() - .5) * 4} ${-40 - r() * 30} ${(r() - .5) * 6} ${-60 - r() * 30}`, bark[3], 1.2, .4);
    B.f(B.ell(-6, -70, 5, 9), bark[3], .7);   // an old knot hole
    const limbs = [[-12, -116, -150, -220], [-4, -124, -70, -300], [6, -124, 40, -320], [14, -118, 140, -250], [18, -110, 190, -170], [-16, -108, -200, -150]];
    for (const [x0, y0, x1, y1] of limbs) { B.s(`M${x0} ${y0}Q${(x0 + x1) / 2 + (r() - .5) * 40} ${(y0 + y1) / 2 + 30} ${x1} ${y1}`, bark[0], 14, 1).s(`M${x0 - 3} ${y0}Q${(x0 + x1) / 2 - 3} ${(y0 + y1) / 2 + 27} ${x1 - 2} ${y1}`, bark[2], 4, .5); }
    if (season === 'winter') { for (const [, , x1, y1] of limbs) for (let k = 0; k < 6; k++) B.s(`M${x1} ${y1}l${(r() - .5) * 60} ${-20 - r() * 40}`, bark[0], 2.4, .9); return; }
    const L = season === 'autumn' ? ['#6e4a24', '#a8642a', '#d08a38', '#ecc060'] : P.leaf, lobes = [];
    for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); lobes.push([Math.cos(a) * 200 * d, -230 + Math.sin(a) * 105 * d, 40 + r() * 34, 30 + r() * 20]); }
    lobes.sort((p, q) => p[1] - q[1]);
    for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x + 8, y + 12, rx * 1.05, ry * 1.05, 9, .35), L[0]);
    for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x, y, rx * .9, ry * .88, 9, .35), L[1]);
    for (const [x, y, rx, ry] of lobes) if (x < 40 || y < -260) B.f(B.blob(r, x - rx * .25, y - ry * .3, rx * .5, ry * .45, 8, .4), L[2], .9);
    for (let i = 0; i < 26; i++) B.f(B.blob(r, -150 + r() * 220, -320 + r() * 120, 12, 8, 6, .5), L[3], .8);
    // sky gaps through the crown and limbs showing through them
    for (let i = 0; i < 7; i++) { const x = -150 + r() * 300, y = -300 + r() * 140; B.f(B.blob(r, x, y, 9 + r() * 8, 6 + r() * 5, 7, .5), '#c8d8dc', .5); B.s(`M${x - 10} ${y + 6}l20 -10`, bark[0], 3, .7); }
    if (season === 'autumn') for (let i = 0; i < 40; i++) B.f(B.ell(-200 + r() * 400, 2 + r() * 26, 2, 1.2), L[1 + Math.floor(r() * 3)], .85);
  }

  /* ---------- Hollin's hut and the ice house: their surroundings ---------- */
  function homes(C) {
    const { L, P, add, thing } = C, cw = L.cw, ch = L.ch;
    const hut = L.stat('ld-woodhut');
    if (hut) {
      const c = L.cpt(hut.x + hut.w / 2, hut.y + hut.h);
      add([c.x - 150, c.y - 60, c.x + 150, c.y + 90], 71, (B, r) => {
        // a yard of chips and sawdust before the door, a beaten way to it
        B.f(B.blob(r, c.x, c.y + 26, 110, 38, 11, .3), '#9a8458', .45).f(B.blob(r, c.x - 10, c.y + 22, 70, 22, 9, .3), '#b8a070', .35);
        for (let k = 0; k < 120; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); B.f(B.rect(c.x + Math.cos(a) * 100 * d, c.y + 24 + Math.sin(a) * 34 * d, 2 + r() * 3, 1 + r()), r() < .5 ? '#d8c08a' : '#8a6a46', .8); }
      });
      thing({ key: 'logstack', x: c.x + 2.2 * cw, y: c.y + .4 * ch, box: [-40, -46, 44, 8], draw: B => logStack(B, C.kit.rng(72), P) });
      thing({ key: 'block', x: c.x - 1.9 * cw, y: c.y + 1.3 * ch, box: [-20, -34, 26, 8], draw: B => chopBlock(B, P) });
    }
    const ice = L.stat('ld-icehouse');
    if (ice) {
      const c = L.cpt(ice.x + ice.w / 2, ice.y + ice.h);
      add([c.x - 120, c.y - 50, c.x + 120, c.y + 100], 73, (B, r) => {
        // a sunken way down to the door: two stone wing walls, worn steps, ferns and a drip of damp
        const shape = `M${c.x - 26} ${c.y}L${c.x + 26} ${c.y}L${c.x + 40} ${c.y + 66}L${c.x - 40} ${c.y + 66}Z`;
        B.f(shape, '#5e5a4c', .55);
        for (let k = 0; k < 6; k++) { const y = c.y + 6 + k * 10, w = 26 + k * 2.4; B.f(B.rect(c.x - w, y, w * 2, 6), k % 2 ? '#a7a491' : '#bdb9a6').f(B.rect(c.x - w, y + 5, w * 2, 1.4), '#4e4a3e', .5); }
        for (const s of [-1, 1]) for (let k = 0; k < 8; k++) { const t = k / 7, x = c.x + s * (28 + t * 16), y = c.y + t * 64; B.stone(r, x, y, 6, 4, { rock: RUIN.body, rockLo: RUIN.lo, rockHi: RUIN.hi, rockDk: RUIN.dk }, r() < .5 ? RUIN.moss : null); if (r() < .4) fern(B, r, x + s * 10, y + 4, C.season); }
        B.f(B.blob(r, c.x, c.y + 4, 22, 5, 7, .4), '#3e4a3a', .5);
      });
    }
    // the small stone by the chapel wall, with no name on it
    const chapel = L.stat('ld-chapel');
    if (chapel) { const p = L.cpt(chapel.x - .6, chapel.y + chapel.h + .4); thing({ key: 'chapel-stone', x: p.x, y: p.y, box: [-14, -26, 16, 6], draw: B => { B.shadow(3, 1, 11, 3, .3); B.f('M-7 0L-7 -15Q-7 -21 0 -21Q7 -21 7 -15L7 0Z', RUIN.body).f('M-7 0L-7 -15Q-7 -21 0 -21L0 0Z', RUIN.hi, .5).f(B.blob(window.GardenPaintTerrainKit.rng(5), -2, -19, 5, 2, 6, .5), RUIN.moss, .9); B.f(B.circ(-3, 1, 1.6), '#f0e0a0').f(B.circ(2, 1.4, 1.4), '#e8e4f0'); } }); }
  }
  function logStack(B, r, P) {
    B.shadow(4, 1, 40, 6, .3);
    for (const x of [-34, 34]) B.f(B.rect(x - 2, -40, 4, 40), P.woodDk);
    for (let row = 0; row < 5; row++) for (let k = 0; k < 7; k++) { const x = -29 + k * 9.6 + (row % 2) * 4.8, y = -5 - row * 8.4; if (x > 30) continue; B.f(B.circ(x, y, 4.6), '#8a6a46').f(B.circ(x - .4, y - .4, 3.6), '#d8b884').f(B.circ(x - .4, y - .4, 1.6), '#b8925e', .8); }
    B.f('M-40 -42L0 -52L42 -42L40 -38L0 -47L-38 -38Z', '#5e5040');
  }
  function chopBlock(B, P) {
    B.shadow(2, 1, 14, 4, .3);
    B.f(B.rect(-10, -14, 20, 14), '#7a5e40').f(B.rect(-10, -14, 6, 14), '#9a7a54', .6).f(B.ell(0, -14, 10, 3.4), '#d8b884').f(B.ell(0, -14, 5, 1.6), '#b8925e', .7);
    B.s('M2 -15L14 -30', '#8a6a46', 2.4).f('M10 -33L18 -28L15 -24L8 -29Z', '#6a7074').f('M10 -33L12 -32L9 -28L8 -29Z', '#c8d0d4');
    for (let k = 0; k < 4; k++) B.f(B.rect(-18 + k * 9, 2 + (k % 2) * 3, 6, 2.2), '#c8a878', .9);
  }

  V.parts.push({ id: 'crossings', compose: crossings }, { id: 'ruins', compose: ruins }, { id: 'plazas', compose: plazas }, { id: 'homes', compose: homes });
})();

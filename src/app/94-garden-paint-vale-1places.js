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

  // The retained crossing water and river-bank joins share exactly this support.
  function crossingWaterSpan(pres, c, base) {
    const physical = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry().find(g => g.crossing.id === c.id) : null;
    if (physical) return physical.span;
    const riv = pres.rivers && pres.rivers[c.over]; if (!riv || !riv.line || riv.line.length < 2) return null;
    const Ln = lineOf(riv.line), n0 = nearest(Ln, c.x, c.y);
    const wet = s => { const p = at(Ln, s), b = base(p.x, p.y); return !!(b && b.freshwater); };
    let s0 = n0.s, s1 = n0.s; for (let k = 0; k < 40 && s0 > 0 && !wet(s0); k++) s0 -= .15; for (let k = 0; k < 40 && s1 < Ln.len && !wet(s1); k++) s1 += .15;
    return { Ln, n0, s0: Math.max(0, s0 - .7), s1: Math.min(Ln.len, s1 + .7) };
  }
  V.crossingWaterSpan = crossingWaterSpan;

  function crossings(C) {
    const { L, P, add, under } = C, cw = L.cw, ch = L.ch, W = L.W;
    const physical = typeof gardenIslandCrossingGeometry === 'function' ? gardenIslandCrossingGeometry() : [];
    for (const c of L.pres.crossings || []) {
      const riv = L.pres.rivers && L.pres.rivers[c.over]; if (!riv || !riv.line) continue;
      const deck = physical.find(g => g.crossing.id === c.id);
      const { Ln, n0, s0, s1 } = deck ? deck.span : crossingWaterSpan(L.pres, c, L.base), hw = riv.halfWidth || 1;
      const mid = at(Ln, n0.s), anchor = { x: mid.x * cw, y: W.sky + mid.y * ch }, px = (x, y) => ({ x: x * cw - anchor.x, y: W.sky + y * ch - anchor.y });
      const left = [], right = [], centre = [];
      for (let s = s0; s <= s1 + 1e-6; s += .2) { const p = at(Ln, s), nx = -p.ty, ny = p.tx, k = hw * (1 + .06 * Math.sin(s * 3.1)); left.push(px(p.x + nx * k, p.y + ny * k)); right.push(px(p.x - nx * k, p.y - ny * k)); centre.push(px(p.x, p.y)); }
      if (left.length < 2) continue;
      const strip = deck ? deck.points.map(p => px(p.x, p.y)) : left.concat(right.slice().reverse()), bb = V.hull(strip.map(q => ({ x: q.x, y: q.y }))).reduce((b, q) => [Math.min(b[0], q.x), Math.min(b[1], q.y), Math.max(b[2], q.x), Math.max(b[3], q.y)], [1e9, 1e9, -1e9, -1e9]);
      // the water under the crossing: drawn under the painted river, so its banks lap over the ends
      under({ key: 'cross-water|' + c.id, x: anchor.x, y: anchor.y, box: [bb[0] - 16, bb[1] - 16, bb[2] + 16, bb[3] + 16], draw: (B, tod) => {
        const shape = B.poly(strip);
        B.cx.filter = 'blur(2px)'; B.f(shape, P.bank, .8); B.cx.filter = 'none';
        B.cx.save(); B.cx.translate(0, 0); B.s(shape, P.bank, 9, .7); B.s(shape, '#6a6048', 3, .5); B.cx.restore();
        const water = window.GardenPaintWater && GardenPaintWater.palette(tod, C.season), teal = c.over !== 'river', body = water ? water.water : teal ? '#86b8bc' : P.river, deep = water ? water.deep : teal ? '#5f949c' : P.riverDk;
        B.f(shape, body); B.cx.save(); B.cx.clip(new Path2D(shape));
        // Match the basin painter's channel through the retained crossing
        // outline. Its single narrow stroke made every basin cap a shade seam.
        if (water) {
          const channel = riv.line.map(p => px(p[0], p[1])), gorge = c.over === 'gorge', hwx = hw * cw * (gorge ? .55 : .5);
          V.strokePts(B, channel, deep, hwx * 2.2, gorge ? .45 : .28);
          V.strokePts(B, channel, deep, hwx * 1.2, gorge ? .4 : .26);
          V.strokePts(B, channel, C.kit.mix(deep, '#203040', .3), hwx * .5, .2);
        } else V.strokePts(B, centre, deep, hw * Math.min(cw, ch) * 1.1, .35);
        if (water) for (const side of [left, right]) { V.strokePts(B, side, water.shallow, 30, .3); V.strokePts(B, side, water.shallow, 14, .45); V.strokePts(B, side, water.bed, 8, .22); }
        const r = C.kit.rng(C.kit.hashStr(c.id));
        for (const q of V.walk(centre, 9)) { const o = (r() - .5) * hw * ch * 1.4; B.s(`M${q.x - q.ty * o} ${q.y + q.tx * o}l${q.tx * (6 + r() * 10)} ${q.ty * (6 + r() * 10)}`, r() < .7 ? P.riverHi : '#e8f0f4', 1 + r(), .35 + r() * .3); }
        B.cx.restore();
      } });
      if (c.kind === 'hump-bridge') continue;
      // The shared deck meets the actual path on both dry banks.
      const nx = -mid.ty, ny = mid.tx, span = c.kind === 'footbridge' ? hw + .7 : hw + .15;
      const A = deck ? deck.a : { x: (mid.x + nx * span) * cw, y: W.sky + (mid.y + ny * span) * ch }, Bp = deck ? deck.b : { x: (mid.x - nx * span) * cw, y: W.sky + (mid.y - ny * span) * ch };
      const box = [Math.min(A.x, Bp.x) - 40, Math.min(A.y, Bp.y) - 40, Math.max(A.x, Bp.x) + 40, Math.max(A.y, Bp.y) + 40];
      if (c.kind === 'footbridge') add(box, 61, (B, r) => footbridge(B, r, P, A, Bp, deck));
      else if (c.kind === 'log' && V.fallenLog) add(box, 62, (B, r) => V.fallenLog(B, r, P, A, Bp, C.season, deck));   // (round 3: Wren's log, 94-garden-paint-vale-1woodland.js)
      else add(box, 62, (B, r) => stones(B, r, P, A, Bp, C.season, deck));
    }
  }
  function footbridge(B, r, P, A, Bp, deck) {
    const L = Math.hypot(Bp.x - A.x, Bp.y - A.y), ux = (Bp.x - A.x) / L, uy = (Bp.y - A.y) / L, vx = -uy, vy = ux, hw = deck ? deck.halfWidth : 17;
    const ground = (t, s) => ({ x: A.x + ux * t + vx * s, y: A.y + uy * t + vy * s });
    const q = (t, s, lift = 0) => { const p = deck ? deck.deckPoint(t / L, s) : ground(t, s); return { x: p.x, y: p.y - lift }; };
    B.cx.filter = 'blur(3px)'; B.f(B.poly([ground(8, -hw + 4), ground(L - 8, -hw + 4), ground(L - 8, hw + 10), ground(8, hw + 10)]), '#1e2e34', .3); B.cx.filter = 'none';
    // Flush stone abutments finish in the bank, rather than a dirt blot over
    // the boards. The continuous bed and every plank stay inside support.
    B.f(B.poly([q(0, -hw), q(L, -hw), q(L, hw), q(0, hw)]), P.woodDk);
    const cap = Math.min(10, L * .12);
    for (const t of [0, L - cap]) {
      B.f(B.poly([q(t, -hw), q(t + cap, -hw), q(t + cap, hw), q(t, hw)]), '#a69d84');
      V.strokePts(B, [q(t + 1.5, -hw + 1), q(t + 1.5, hw - 1)], '#d7ccb0', 1.6, .7);
      for (const s of [-hw / 3, hw / 3]) V.strokePts(B, [q(t + 1, s), q(t + cap - 1, s)], '#766d58', .8, .65);
    }
    for (const s of [-hw + 2, hw - 2]) V.strokePts(B, [q(cap, s, -2), q(L - cap, s, -2)], P.woodDk, 4, .9);
    for (let t = cap; t < L - cap; t += 6.4) {
      const end = Math.min(L - cap, t + 5.8), hi = Math.min(end, t + 1.2), tone = r();
      B.f(B.poly([q(t, -hw), q(end, -hw), q(end, hw), q(t, hw)]), tone < .16 ? P.woodHi : tone < .82 ? P.wood : P.woodLo).f(B.poly([q(t, -hw), q(hi, -hw), q(hi, hw), q(t, hw)]), P.woodHi, .4);
      for (const s of [-hw + 4, hw - 4]) { const p = q(t + 3, s); B.f(B.circ(p.x, p.y, .6), P.woodDk, .8); }
    }
    // The rail carries the gentle arch; feet remain on the visible flat deck.
    for (const [s, col] of [[-hw, P.woodLo], [hw, P.wood]]) {
      const lift = t => 13 + Math.sin(Math.PI * (t - cap / 2) / (L - cap)) * 4;
      const rail = []; for (let t = cap / 2; t < L - cap / 2; t += 4) rail.push(q(t, s, lift(t))); rail.push(q(L - cap / 2, s, 13)); V.strokePts(B, rail, col, 2.6, .95); V.strokePts(B, rail, P.woodHi, 1, .5, 0, -.8);
      for (let i = 0; i <= 3; i++) { const t = cap / 2 + (L - cap) * i / 3, a = q(t, s), b = q(t, s, lift(t) + 1); B.s(`M${a.x} ${a.y}L${b.x} ${b.y}`, P.woodDk, 3, .95); }
    }
  }
  function stones(B, r, P, A, Bp, season, deck) {
    if (deck && deck.stones) {
      // Close-set low slabs expose the exact ford. The old oversized ellipses
      // hung beyond its edges and left invisible support between the stones.
      const { count, acrossRadius: hw } = deck.stones, q = (t, s) => deck.deckPoint(t, s), step = 1 / count;
      const cid = deck.crossing && deck.crossing.id;
      if (cid === 'lip-stones') {
        // Cloudbreak's lip stones, a little above the falls: boulders of fell rock, each its own size and set a little off
        // the line, sitting in the stream (the water breaks white on their upstream side and runs dark between them),
        // their tops worn flat where feet go; together they still cover the whole footing
        const tones = season === 'winter' ? ['#a9a89c', '#bdbcb0', '#9a9a8e'] : ['#8e877a', '#9c9484', '#857e70', '#a39a88'];
        const gap = typeof window.gardenCloudbreakLipGap === 'function' && window.gardenCloudbreakLipGap() ? Math.floor(count / 2) : -1;   // (shortcut A: one stone rolled out of the line until level 6)
        for (let i = 0; i < count; i++) {
          const lo = i * step, hi = (i + 1) * step, mid = (lo + hi) / 2, off = (r() - .5) * hw * .35, sz = .9 + r() * .3, n = 9, a0 = r() * 6.3, pts = [];
          if (i === gap) { for (let k = 0; k < 3; k++) { const p = q(mid + (k - 1) * (hi - lo) * .3, (r() - .5) * hw); B.s(`M${p.x - 6} ${p.y}q6 -3 12 0`, P.foam || '#eef2e2', 1.4, .7); } const p = q(mid + (hi - lo) * .2, hw * 1.5); B.stone(r, p.x, p.y + 4, 9, 5, { rock: '#8e877a', rockLo: '#5e584e', rockHi: '#b8b0a0', rockDk: '#2e2c28' }, null); continue; }
          for (let j = 0; j < n; j++) { const a = a0 + j / n * Math.PI * 2, k = (.82 + r() * .26) * sz; pts.push([mid + Math.cos(a) * (hi - lo) * .62 * k, off + Math.sin(a) * hw * 1.02 * k]); }
          const at = (pp, dy) => pp.map(([t, ds]) => { const p = q(t, ds); return [p.x, p.y + (dy || 0)]; });
          B.f(B.poly(at(pts.map(([t, ds]) => [t, ds * 1.12]), 2)), P.foam || '#eef2e2', .55);   // the white water round its foot
          B.f(B.poly(at(pts, 3.2)), '#3a3830', .9);   // its wet flank, standing out of the water
          B.f(B.poly(at(pts)), tones[Math.floor(r() * tones.length)]);
          B.f(B.poly(at(pts.map(([t, ds]) => [mid + (t - mid) * .62, off + (ds - off) * .55 - hw * .12]))), '#c8c0aa', .55);   // the worn, dry top
          if (r() < .55) B.f(B.poly(at(pts.map(([t, ds]) => [mid + (t - mid) * .36, off + (ds - off) * .3 + hw * .45]))), season === 'winter' ? '#e8ecef' : '#5f7440', .55);   // moss on the shaded side
        }
        return;
      }
      if (cid === 'gorge-stones') {
        // Cloudbreak's clapper bridge: two long granite slabs laid end to end on a pier stone in the stream and an abutment
        // of piled stones on each bank, grey and lichened, a dark gap of water under each slab, worn pale along the middle
        const tones = season === 'winter' ? ['#b8b8b0', '#c6c6be'] : ['#9a958a', '#a8a294'];
        const at = (t, ds, dy) => { const p = q(t, ds); return [p.x, p.y + (dy || 0)]; };
        for (const t of [0, .5, 1]) { const w0 = t === .5 ? .1 : .14; for (let k = 0; k < 4; k++) { const tt = t + (r() - .5) * w0, ds = (k / 3 - .5) * hw * 2.3; B.stone(r, ...at(Math.max(-.06, Math.min(1.06, tt)), ds, 5), 7 + r() * 3, 4 + r() * 2, { rock: '#8a8478', rockLo: '#5e594f', rockHi: '#b8b2a2', rockDk: '#2e2c28', lichen: '#c9c48a' }, season === 'winter' ? 'snow' : r() < .4 ? '#c9c48a' : null); } }
        for (const [lo, hi] of [[-.02, .51], [.49, 1.02]]) {
          const top = [at(lo, -hw), at(hi, -hw * .96), at(hi, hw * .98), at(lo, hw)];
          B.f(B.poly(top.map(([x, y]) => [x + 1, y + 7])), '#22201c', .5);   // the gap under the slab
          B.f(B.poly([top[3], top[2], [top[2][0], top[2][1] + 5], [top[3][0], top[3][1] + 5]]), '#6a655a');   // its front edge, the slab's thickness
          B.f(B.poly(top), tones[lo < .2 ? 0 : 1]);
          V.strokePts(B, [at(lo + .04, 0), at(hi - .04, 0)], '#cfc8b4', hw * .9, .45);   // worn pale along the middle
          V.strokePts(B, [at(lo + .02, -hw + 1.4), at(hi - .02, -hw * .96 + 1.4)], '#e0d8c2', 1.3, .6);
          for (let k = 0; k < 5; k++) { const [x, y] = at(lo + (hi - lo) * r(), (r() - .5) * hw * 1.6); B.f(B.blob(r, x, y, 2.4 + r() * 4, 1.2 + r() * 1.4, 6, .4), season === 'winter' ? '#e8ecef' : r() < .6 ? '#c9c48a' : '#9aa65a', .6); }
          for (let k = 0; k < 3; k++) { const [x, y] = at(lo + (hi - lo) * (.2 + r() * .6), (r() - .5) * hw * 1.4); B.s(`M${x} ${y}l${3 + r() * 5} ${(r() - .5) * 3}`, '#5e594f', .9, .5); }
        }
        return;
      }
      if (deck.over === 'brook') {
        // The woodland brook: rounded, water-worn stones (a squircle filling each slab, so the footing is still the
        // whole support), wet dark feet, a ring of ripple where the water meets them, moss on the shaded side.
        const tones = season === 'winter' ? ['#a9a89c', '#bdbcb0', '#9a9a8e'] : ['#a19a84', '#b3ab93', '#958f7b', '#aaa088'];
        // (round 3) two abreast, each a half of the deck's width, set a little out of line so they read as stones and not tiles
        const sq = (lo, hi, k, ds, dt, jit, ac) => { const pts = []; for (let j = 0; j < 28; j++) { const a = j / 28 * Math.PI * 2, c = Math.cos(a), si = Math.sin(a), u = Math.sign(c) * Math.pow(Math.abs(c), .72), v = Math.sign(si) * Math.pow(Math.abs(si), .72), n = 1 + (jit ? (jit[j % jit.length] - .5) * .06 : 0); pts.push(q((lo + hi) / 2 + dt + u * (hi - lo) / 2 * k * n, ds + v * ac * k * n)); } return B.poly(pts); };
        // (critic round 2) boulders, not a block of tiles: each its own lumpy shape and size, staggered, sitting IN the stream
        // with a dark wet foot at the waterline, the brook breaking white round their upstream shoulders and running off in a
        // riffle of streaks downstream between them; a few smaller stones awash beside the line. The footing is still the deck.
        const sides = hw >= 20 ? [-1, 1] : [0], flow = (deck.flow || 1);
        const lump = (lo, hi, k, ds, ac, jit) => { const pts = []; for (let j = 0; j < 22; j++) { const a = j / 22 * Math.PI * 2, c = Math.cos(a), si = Math.sin(a), u = Math.sign(c) * Math.pow(Math.abs(c), .8), v = Math.sign(si) * Math.pow(Math.abs(si), .8), n = 1 + (jit[j % jit.length] - .5) * .26; pts.push(q((lo + hi) / 2 + u * (hi - lo) / 2 * k * n, ds + v * ac * k * n)); } return B.poly(pts); };
        const rocks = [];
        for (let i = 0; i < count; i++) for (const sd of sides) {
          const nudge = sd ? (r() - .5) * .45 * step : 0, lo = i * step + (i ? .25 / deck.length : 0) + nudge, hi = (i + 1) * step - (i < count - 1 ? .25 / deck.length : 0) + nudge;
          rocks.push({ lo, hi, ac: sd ? hw * .5 - .6 + (r() - .5) * 3 : hw, c0: sd * hw * .5 + (r() - .5) * 3, k0: .9 + r() * .2, jit: [r(), r(), r(), r(), r(), r(), r(), r(), r()], tone: r() });
        }
        // the riffle first, under the stones: white streaks off their downstream side and darker slack water behind them
        for (const k of rocks) for (let j = 0; j < 3; j++) { const t = k.lo + (k.hi - k.lo) * (.2 + j * .3), a = q(t, k.c0 + flow * (k.ac + 1)), b = q(t + (r() - .5) * .03, k.c0 + flow * (k.ac + 9 + r() * 10)); B.s(`M${a.x} ${a.y}L${b.x} ${b.y}`, P.foam || '#eef2e2', 1.3, .55); }
        for (const k of rocks) B.f(lump(k.lo, k.hi, k.k0 * 1.02, k.c0 + flow * 5, k.ac, k.jit), '#3e5a5e', .22);
        for (let i = 0; i < 5; i++) { const t = r(), sd = (r() < .5 ? -1 : 1) * (hw + 6 + r() * 8), p = q(t, sd); B.f(B.ell(p.x, p.y, 2.6 + r() * 2, 1.6 + r()), '#8e8878', .8).f(B.ell(p.x - .6, p.y - .6, 1.4, .8), '#c8c2ae', .7); }
        for (const k of rocks) {
          const tone = tones[Math.floor(k.tone * tones.length)];
          B.f(lump(k.lo, k.hi, k.k0 * 1.04, k.c0 + 1.6, k.ac, k.jit), '#3a3830', .9);
          B.f(lump(k.lo, k.hi, k.k0, k.c0, k.ac, k.jit), tone);
          B.f(lump(k.lo, k.hi, k.k0 * .62, k.c0 - k.ac * .26, k.ac, k.jit), '#d4ccb4', .45);
          B.f(lump(k.lo, k.hi, k.k0 * .9, k.c0 + k.ac * .3, k.ac * .5, k.jit), '#5e584a', .35);
          if (k.tone < .45) B.f(lump(k.lo, k.hi, k.k0 * .4, k.c0 + k.ac * .5, k.ac, k.jit), season === 'winter' ? '#e8ecef' : '#6f8446', .6);
          const u = q((k.lo + k.hi) / 2, k.c0 - flow * (k.ac * k.k0 + 1)); B.s(`M${u.x - 6} ${u.y}q6 -2.4 12 0`, P.foam || '#eef2e2', 1.4, .7);
        }
        return;
      }
      // (layfix east) over a river: a clapper causeway, a long slab of grey stone on each pier of piled stones, the water running
      // dark under each slab and breaking white on the piers' upstream side, lichen and worn pale tops; one slab a little askew
      // (a flat strip of pale tiles over a grey band read as a plain concrete slab bridge)
      const tones = season === 'winter' ? ['#b8b8b0', '#c6c6be', '#aeaea6'] : ['#a8a294', '#b6b0a0', '#9c968a'];
      const at = (t, ds, dy) => { const p = q(t, ds); return [p.x, p.y + (dy || 0)]; }, RK = { rock: '#8a8478', rockLo: '#5e594f', rockHi: '#b8b2a2', rockDk: '#2e2c28', lichen: '#c9c48a' };
      for (let i = 0; i <= count; i++) { const t = i / count; for (let k = 0; k < 3; k++) { const ds = (k / 2 - .5) * hw * 2.2; B.f(B.ell(...at(t + (r() - .5) * .04, ds - hw * .35, 7), 9, 2.4), P.foam || '#eef2e2', .5); B.stone(r, ...at(Math.max(-.04, Math.min(1.04, t + (r() - .5) * .05)), ds, 6), 7 + r() * 3, 4 + r() * 2, RK, season === 'winter' ? 'snow' : r() < .4 ? '#c9c48a' : null); } }
      for (let i = 0; i < count; i++) {
        const lo = i / count - (i ? .012 : .02), hi = (i + 1) / count + (i < count - 1 ? .012 : .02), sk = i === Math.floor(count / 2) ? .05 : 0;
        const top = [at(lo, -hw + sk * hw * 4), at(hi, -hw * .96), at(hi, hw * .98), at(lo, hw + sk * hw * 4)];
        B.f(B.poly(top.map(([x, y]) => [x + 1, y + 8])), '#1e2a2c', .5);   // the dark water under the slab
        B.f(B.poly([top[3], top[2], [top[2][0], top[2][1] + 8], [top[3][0], top[3][1] + 8]]), '#4e4a42');   // its front edge, the slab's thickness, wet and dark
        B.f(B.poly([top[3], top[2], [top[2][0], top[2][1] + 3], [top[3][0], top[3][1] + 3]]), '#6e695e');
        B.f(B.poly(top), tones[i % 3]);
        B.s(B.poly(top), '#3e3a34', 1.2, .8);
        V.strokePts(B, [at(lo + .02, 0), at(hi - .02, 0)], '#d8d2c0', hw * .8, .5);   // worn pale along the middle
        V.strokePts(B, [at(lo + .01, -hw + 1.4), at(hi - .01, -hw * .96 + 1.4)], '#e0d8c2', 1.3, .6);
        for (let k = 0; k < 4; k++) { const [x, y] = at(lo + (hi - lo) * r(), (r() - .5) * hw * 1.6); B.f(B.blob(r, x, y, 2.4 + r() * 4, 1.2 + r() * 1.4, 6, .4), season === 'winter' ? '#e8ecef' : r() < .6 ? '#c9c48a' : '#9aa65a', .6); }
        for (let k = 0; k < 2; k++) { const [x, y] = at(lo + (hi - lo) * (.2 + r() * .6), (r() - .5) * hw * 1.4); B.s(`M${x} ${y}l${3 + r() * 5} ${(r() - .5) * 3}`, '#5e594f', .9, .5); }
      }
      return;
    }
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
      if (f.brick) continue;   // (the walled garden's brick wall: 94-garden-paint-vale-1oldwood.js)
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
      // a touch of oblique, so walls running north-south show their east face; more the more north-south the stretch runs
      // (critic 3: the postern wall, running north-south, leant a third of its height and read as a flat line of low stones)
      const lean = .32 + .3 * Math.abs(q.y - p.y) / L, up = (v, k) => ({ x: v.x - hs[k] * lean, y: v.y - hs[k] });
      for (let e = 0; e < 4; e++) {
        if ((e === 1 && i < C2.length - 2) || (e === 3 && i > 0)) continue;   // the ends between two stretches are inside the wall
        const v0 = foot[e], v1 = foot[(e + 1) % 4], ex = v1.x - v0.x, ey = v1.y - v0.y, onx = ey, ony = -ex;   // outward normal for a clockwise loop
        const cx = (foot[0].x + foot[2].x) / 2, cy = (foot[0].y + foot[2].y) / 2, mx = (v0.x + v1.x) / 2 - cx, my = (v0.y + v1.y) / 2 - cy, s = Math.sign(onx * mx + ony * my) || 1, outY = ony * s, outX = onx * s;
        if (outY <= 0 && outX <= 0) continue;   // faces turned away from the camera are hidden
        const face = [v0, v1, up(v1, (e + 1) % 4), up(v0, e)], lit = outY > Math.abs(outX) ? 1 : 0;
        B.f(B.poly(face), B.lin(0, Math.min(face[2].y, face[3].y), 0, Math.max(v0.y, v1.y), [[0, lit ? RUIN.body : RUIN.lo], [.75, lit ? RUIN.lo : '#6a685a'], [1, RUIN.dk]]));
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
    // tumbled stones and ferns against the foot (layout round 3, critic 3: they lay up to half a cell out on the grass in front
    // of the wall, where the feet walked over them; now they lean on the foot, where the wall stops the feet)
    for (let i = 0; i < C2.length; i++) { const p = C2[i]; if (r() < .6) B.stone(r, p.x + (r() - .5) * 16, p.y + 1 + r() * 3, 4 + r() * 4, 2.6 + r() * 1.6, ST, RUIN.moss); if (r() < .45) fern(B, r, p.x + (r() - .5) * 18, p.y + 5, season); }
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
  const STYLE = { 'cider-square': 'setts', 'mill-yard': 'yard', 'ruin-court': 'broken', 'postern-yard': 'broken', 'lakeside-terrace': 'flags', 'great-oak-clearing': 'litter', 'woodpile-yard': 'earth', 'arch-forecourt': 'earth' };
  function plazas(C) {
    const { L, P, add, kit, thing } = C, cw = L.cw, ch = L.ch;
    for (const pz of L.pres.plazas || []) {
      const style = STYLE[pz.id]; if (!style) continue;
      // (fix round 1: the village's own ground lays the Lakeside terrace's crescent in the same setts as its roads, as one
      // surface with them; slabs and a kerb laid over that again read as a plaza set down on the end of the terrace road)
      if (pz.id === 'lakeside-terrace' && Array.isArray(pz.shape) && pz.shape.length > 2) continue;
      const rt = L.routes.get(pz.route); if (!rt || !rt.points || rt.points.length < 2) continue;
      let a = L.pt(rt.points[0]); const b = L.pt(rt.points[rt.points.length - 1]), w = rt.widthCells || 4, seed = kit.hashStr(pz.id);
      // The land office stands on the terrace's west end: pave from its east wall, so the building is not set down on the flags
      // (the lake walk's sandy road carries on behind it).
      const office = pz.id === 'lakeside-terrace' && L.stat('land-office');
      if (office && office.x < rt.points[0][0] + 1 && office.x + office.w > rt.points[0][0]) a = L.pt([office.x + office.w + .5, rt.points[0][1]]);
      // a shaped plaza (the Lakeside terrace's crescent, 2.74) is laid to its own outline; the rest are capsules along their spine
      const shape = Array.isArray(pz.shape) && pz.shape.length > 2 ? V.shapeLoop(L, pz.shape) : V.capsule(kit.rng(seed), a, b, w / 2 * cw * .95 + 8, w / 2 * ch * 1.05 + 4, style === 'broken' || style === 'litter' ? .3 : .08), bb = kit.bboxOf(shape, 40), soft = style === 'litter' || style === 'earth';
      add(bb, seed, (B, r) => {
        const path = new Path2D(B.poly(shape)), dry = new Path2D(); dry.rect(bb[0] - 10, bb[1] - 10, bb[2] - bb[0] + 20, bb[3] - bb[1] + 20); for (const w of L.D.freshwater || []) if (w.boundary) dry.addPath(V.loopPath([w.boundary.map(L.pt)]));
        B.cx.clip(dry, 'evenodd');
        if (style !== 'litter') { B.cx.filter = 'blur(3px)'; B.f(path, '#2e3420', .2); B.cx.filter = 'none'; }
        // (round 3) a clearing or yard in the wood is trodden earth that thins into the grass at its edge: laid soft, in two
        // blurred washes to its outline, not cut to it (a hard pale shape on the lawn)
        if (soft) {
          const tone = C.season === 'winter' ? ['#9a9a84', '#b0ae98'] : style === 'earth' ? ['#8a7650', '#a08a5e'] : ['#7e7a48', '#9a8a56'];
          B.cx.filter = 'blur(9px)'; B.f(path, tone[0], .5); B.cx.filter = 'blur(4px)'; B.cx.save(); B.cx.translate(0, 0); B.f(path, tone[1], .42); B.cx.restore(); B.cx.filter = 'none';
          for (let k = 0; k < 14; k++) { const x = bb[0] + 30 + r() * (bb[2] - bb[0] - 60), y = bb[1] + 30 + r() * (bb[3] - bb[1] - 60); if (B.cx.isPointInPath(path, x, y)) B.f(B.blob(r, x, y, 10 + r() * 18, 4 + r() * 6, 7, .5), r() < .5 ? '#6f8a42' : tone[0], .22); }   // grass coming back in patches, darker trodden hollows
        }
        B.cx.save(); B.cx.clip(path);
        if (style === 'setts') { V.setts(B, r, P, bb, { size: 11, salt: seed, grout: '#a8987a', cols: ['#c9b994', '#c2b28c', '#d2c5a2', '#bcac86'] }); for (let k = 0; k < 18; k++) B.f(B.blob(r, bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 14 + r() * 20, 4 + r() * 5, 7, .5), r() < .5 ? '#e0d4b2' : '#9c8c68', .25); }
        else if (style === 'yard') {   // warm, worn and busy: honey setts like the plaza's, cart ruts, flour by the door, straw, moss in the joints
          const bw = bb[2] - bb[0], bh = bb[3] - bb[1], rx = () => bb[0] + r() * bw, ry = () => bb[1] + r() * bh;
          V.setts(B, r, P, bb, { size: 11, salt: seed, grout: '#9a8460', cols: ['#d2b88c', '#c6aa7e', '#dcc69e', '#bfa178', '#cfae84', '#c9b48e'] });
          for (let k = 0; k < 16; k++) B.f(B.blob(r, rx(), ry(), 16 + r() * 24, 5 + r() * 7, 7, .5), r() < .55 ? '#e6d2a6' : '#a08458', .24);   // sun and wear in broad patches
          for (let k = 0; k < 26; k++) B.f(B.blob(r, rx(), ry(), 3 + r() * 5, 1.2 + r(), 5, .5), r() < .6 ? '#7d8a44' : '#96a052', .5);   // moss and weeds in the joints
          // (round 3, critic fix: the ruts' pale lips and the flour blown right across the court read as white smears on the setts)
          for (const o of [-9, 9]) { const pts = [{ x: a.x - 60, y: a.y + o + 8 }, { x: (a.x + b.x) / 2, y: a.y + o + 2 }, { x: b.x + 70, y: b.y + o - 10 }]; V.strokePts(B, pts, '#7a5c3c', 4, .22); }   // cart ruts, worn into the stone
          { const mill = L.stat('ld-mill'), dx = mill && mill.door ? L.cpt(mill.door.x + .5, mill.door.y + .15) : null; if (dx) for (let k = 0; k < 6; k++) B.f(B.ell(dx.x + (r() - .5) * 34, dx.y + r() * 9, 3 + r() * 4, 1.2 + r() * 1.2), '#f4ead0', .55); }   // a dusting of flour on the step, only at the door
          for (let k = 0; k < 70; k++) { const x = rx(), y = ry(); B.s(`M${x} ${y}l${(r() - .5) * 9} ${(r() - .5) * 3}`, r() < .7 ? '#e2bc5a' : '#c89a3c', 1.1, .8); }   // spilt straw
          for (let k = 0; k < 18; k++) B.f(B.ell(rx(), ry(), 1.8 + r() * 1.4, 1.1 + r() * .6), ['#b0682a', '#d38f3a', '#8a5a2c', '#7d8f4e'][Math.floor(r() * 4)], .75);   // a few blown leaves
          for (let k = 0; k < 3; k++) { const x = rx(), y = ry(); B.f(B.blob(r, x, y, 12 + r() * 10, 4 + r() * 2, 8, .4), '#7e6a4a', .35).f(B.blob(r, x - 2, y - 1, 8 + r() * 6, 2.4, 8, .4), '#b6cbd0', .5); }   // rain puddles in the low setts
        }
        else if (style === 'broken') { B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), P.lawnLo); V.flags(B, r, Object.assign({}, P, { stone: '#bdb8a4', stoneLo: '#a29e8a', stoneHi: '#d2cebc', grout: '#7d7a68' }), bb, { row: 13, w: 24, salt: seed, broken: .2, moss: .3 }); }
        else if (style === 'flags') V.flags(B, r, P, bb, { row: 14, w: 26, salt: seed, moss: .04 });
        else if (style === 'earth') {   // a woodland yard: wood chips and bark, sawdust by the block, leaves blown in, two cart ruts
          const bw = bb[2] - bb[0], bh = bb[3] - bb[1], rx = () => bb[0] + r() * bw, ry = () => bb[1] + r() * bh;
          for (let k = 0; k < bw * bh / 260; k++) { const x = rx(), y = ry(); B.s(`M${x} ${y}l${(r() - .5) * 6} ${(r() - .5) * 2.4}`, r() < .5 ? '#d8c08a' : '#7a5e3c', 1.6, .55); }
          for (let k = 0; k < 6; k++) B.f(B.blob(r, rx(), ry(), 8 + r() * 10, 3 + r() * 3, 7, .5), '#e2cc96', .3);
          // (critic round 2: no cart ruts: two straight lines across the yard read as ruled stripes)
          const leaf = C.season === 'autumn' ? ['#b0682a', '#d38f3a', '#8a5a2c'] : ['#7d8f4e', '#8a7a4a'];
          for (let k = 0; k < bw * bh / 500; k++) B.f(B.ell(rx(), ry(), 1.6 + r() * 1.4, 1 + r() * .6), leaf[Math.floor(r() * leaf.length)], .7);
        }
        else { // the clearing under the oak: leaf litter, moss, roots running out from the trunk
          const leaf = C.season === 'autumn' ? ['#b0682a', '#d38f3a', '#8a5a2c', '#e0b050'] : C.season === 'winter' ? ['#8a7a5a', '#a0906a', '#6e6450'] : ['#7d8f4e', '#6a7c40', '#94a058', '#8a7a4a'];
          for (let k = 0; k < (bb[2] - bb[0]) * (bb[3] - bb[1]) / 90; k++) B.f(B.ell(bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 1.6 + r() * 1.6, 1 + r() * .8), leaf[Math.floor(r() * leaf.length)], .8);
          const o = oakAt(L, pz); for (let k = 0; k < 7; k++) { const ang = Math.PI * (.05 + k / 6 * .9), l = 60 + r() * 70; B.s(`M${o.x + Math.cos(ang) * 14} ${o.y}Q${o.x + Math.cos(ang) * l * .5} ${o.y + Math.sin(ang) * l * .25 + 6} ${o.x + Math.cos(ang) * l} ${o.y + Math.sin(ang) * l * .45}`, '#5a4632', 5 - k % 3, .55); }
        }
        B.cx.restore();
        if (style === 'setts' || style === 'flags' || style === 'yard') B.s(path, P.kerb, 3, .8);
      });
      // dressing by job: the cider square's press, bell and lanterns; the mill yard's millstone and sacks; the court's fallen column
      const spot = (x, y) => L.free(x, y) && ['grass', 'path'].includes(L.kind(x, y));
      const put = (cands, key, box, draw, foot) => { for (const [x, y] of cands) if (spot(x, y)) { const p = L.cpt(x, y); thing({ key, box, x: p.x, y: p.y, draw, foot }); return; } };   // foot: [left, right, depth] px the feet cannot enter (GardenPaintVale.feet)
      if (pz.id === 'cider-square') { if (!L.stat('ld-press')) put([[80.2, 36.4], [79.6, 35.4], [75.4, 37.6]], 'press', [-26, -50, 28, 6], drawPress(P), [-21, 23, 10]); if (!L.stat('ld-bell')) put([[79.6, 38.3], [80.4, 38.6]], 'bell', [-14, -64, 16, 5], drawBell(P), [-6, 7, 6]);   /* (round 3 layouts: the hand-authored orchard has its own press and bell, ld-press and ld-bell) */ put([[77.1, 36.3], [76.3, 38.75]], 'baskets',   /* (High orchard fix round 2: by the lamp at the square's back edge, where the barrels are; in the middle of the setts they stood loose) */ [-24, -18, 26, 5], drawBaskets(P, C.season), [-18, 20, 8]); }
      if (pz.id === 'mill-yard') { put([[76.6, 64.6], [77.2, 65.2], [76.9, 66.8]], 'millstone', [-22, -40, 24, 6], drawMillstone(P), [-18, 20, 10]); put([[77.3, 66.9], [73.6, 67.4], [76.8, 67.6]], 'sacks', [-22, -24, 24, 5], drawSacks(P), [-18, 20, 8]);
        // (layfix east) the yard at work, not a bare plaza: a hay wain unhitched by the barn, a stone trough and pump against the
        // lamp in the yard's middle, barrels and a sack barrow by the mill's doors; the setts give way to weeds at the yard's edges
        put([[87.1, 65.6], [86.9, 66], [87.3, 65.2]], 'yard-wain|' + C.season, [-72, -58, 52, 8], drawWain(P, C.season), [-38, 38, 10]);
        put([[84.7, 67.1], [84.2, 66.9]], 'yard-trough', [-30, -50, 26, 6], drawTrough(P), [-26, 20, 8]);
        put([[82.6, 67.5], [83.2, 67.3]], 'yard-sacks2', [-22, -24, 24, 5], drawSacks(P), [-18, 20, 8]);
        put([[82.4, 64.9], [82.9, 65.0]], 'yard-barrels', [-22, -30, 22, 5], drawBarrels(P), [-17, 17, 8]);
        { const sh = shape; if (sh && sh.length > 2) add(kit.bboxOf(sh, 30), seed + 3, (B, r) => { const path = new Path2D(B.poly(sh)); B.cx.save(); B.cx.clip(path);
          // grass and weeds creep in round the edges and against the walls, where no wheel goes
          for (let i = 0; i < sh.length; i++) { const a0 = sh[i], b0 = sh[(i + 1) % sh.length], l = Math.hypot(b0.x - a0.x, b0.y - a0.y); for (let t = 0; t < l; t += 9) { const x = a0.x + (b0.x - a0.x) * t / l + (r() - .5) * 10, y = a0.y + (b0.y - a0.y) * t / l + (r() - .5) * 6; if (r() < .7) B.f(B.blob(r, x, y, 6 + r() * 9, 2.4 + r() * 2, 7, .5), r() < .5 ? '#7d8a44' : '#96a052', .55); if (r() < .3) B.tufts(r, x, y + 2, 7, 3, ['#6f8a42', '#9cb062'], 5); } }
          // the setts settled unevenly: grass grown up in the low joints in broad patches, a damp dark run below the trough
          for (let k = 0; k < 9; k++) { const q = sh[Math.floor(r() * sh.length)], c = sh.reduce((m, p) => ({ x: m.x + p.x / sh.length, y: m.y + p.y / sh.length }), { x: 0, y: 0 }), t = .35 + r() * .45, x = q.x + (c.x - q.x) * t, y = q.y + (c.y - q.y) * t;
            for (let j = 0; j < 14; j++) B.f(B.blob(r, x + (r() - .5) * 46, y + (r() - .5) * 16, 3 + r() * 4, 1.2 + r(), 5, .5), r() < .5 ? '#7d8a44' : '#96a052', .5); }
          // a trodden band from the lane to the barn's doors, the setts darker and polished where the carts go
          const a1 = L.cpt(80.4, 65.4), b1 = L.cpt(84.9, 64.6); B.cx.filter = 'blur(6px)'; V.strokePts(B, [a1, { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 + 8 }, b1], '#7a603c', 40, .14); B.cx.filter = 'none';
          B.cx.restore(); }, {}); }
      }
      if (pz.id === 'ruin-court') { const c = L.cpt(pz.x + 1.4, pz.y + .9); add([c.x - 60, c.y - 30, c.x + 60, c.y + 30], 75, (B, r) => { B.shadow(c.x + 4, c.y + 6, 46, 8, .3); B.f(B.rr(c.x - 44, c.y - 7, 80, 14, 7), RUIN.body).f(B.rr(c.x - 44, c.y - 7, 80, 5, 2.5), RUIN.hi, .8).f(B.ell(c.x + 38, c.y, 6, 7), RUIN.lo).f(B.ell(c.x + 38, c.y, 3.4, 4), RUIN.dk, .3); for (let k = -36; k < 34; k += 9) B.s(`M${c.x + k} ${c.y - 6}v12`, RUIN.lo, .8, .5); B.f(B.blob(r, c.x - 10, c.y - 6, 22, 3, 7, .5), RUIN.moss, .8); fern(B, r, c.x - 50, c.y + 6, C.season); fern(B, r, c.x + 20, c.y + 9, C.season); }); }
      if (style === 'litter') { const o = oakAt(L, pz), S = OAK_SCALE; thing({ key: 'great-oak-5|' + C.season, x: o.x, y: o.y, box: [-250 * S, -360 * S, 250 * S, 40 * S].map(Math.round), crown: { x: 0, y: -215 * S, rx: 270 * S, ry: 195 * S }, farShrink: .6, K: .9, draw: B => { B.cx.save(); B.cx.scale(S, S); greatOak(B, kit.rng(seed + 9), P, C.season); B.cx.restore(); } }); }
    }
  }
  const drawPress = P => B => { B.shadow(4, 2, 24, 5, .3); B.f(B.rr(-18, -16, 36, 16, 3), P.wood).f(B.rect(-18, -16, 36, 3), P.woodHi, .7); for (const x of [-14, 12]) B.post(x, -46, -14, 5, [P.wood, P.woodLo, P.woodHi]); B.f(B.rect(-18, -50, 36, 6), P.woodLo).s('M0 -44V-20', P.iron, 3).s('M-10 -30H10', P.iron, 2.2).f(B.ell(0, -18, 12, 3), '#c8a04a', .8); };
  const drawBell = P => B => { B.shadow(2, 1, 8, 2.4, .3); B.post(0, -58, 0, 4, [P.wood, P.woodLo, P.woodHi]); B.s('M0 -56H10', P.woodLo, 2.6); B.f('M4 -54Q4 -46 2 -42H18Q16 -46 16 -54Q10 -58 4 -54Z', '#b08a3a').f('M5 -53Q5 -47 3 -43H8Q7 -48 8 -54Z', '#e0c070', .7).f(B.circ(10, -41, 1.6), '#5a4a2a'); };
  const drawBaskets = (P, season) => B => { B.shadow(2, 1, 22, 4, .3); for (const x of [-12, 10]) { B.f(`M${x - 10} -12L${x + 10} -12L${x + 8} 0L${x - 8} 0Z`, '#a8844e').s(`M${x - 9} -8H${x + 9}M${x - 8.5} -4H${x + 8.5}`, '#7a5e34', .8, .8); for (let k = 0; k < 5; k++) B.f(B.circ(x - 7 + k * 3.5, -13 - (k % 2) * 1.6, 2.6), season === 'autumn' ? (k % 2 ? '#c8402e' : '#e0b23a') : '#9cbc4a'); } };
  const drawMillstone = P => B => { B.shadow(6, 2, 20, 5, .3); B.f(B.ell(0, -18, 12, 18), '#8e8a7c').f(B.ell(-2, -19, 11, 17), '#b4ae9c').f(B.ell(-2, -19, 3.4, 5), '#5e5a4e'); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.s(`M${-2 + Math.cos(a) * 4} ${-19 + Math.sin(a) * 6}L${-2 + Math.cos(a + .3) * 10} ${-19 + Math.sin(a + .3) * 15}`, '#7a7668', 1, .7); } };
  // (layfix east) the mill yard's working things
  const drawWain = (P, season) => B => { B.shadow(6, 3, 46, 7, .32);
    B.f(B.ell(0, 2, 38, 3.4), season === 'winter' ? '#a89870' : '#c8a850').f(B.ell(-4, 1.4, 30, 2), season === 'winter' ? '#c0b08a' : '#e0c470', .9);   // (a bed of straw under it, its whole length)
    for (let k = 0; k < 26; k++) { const x = -40 + k * 3.1; B.s(`M${x} ${2 + (k % 3)}l${(k % 2 ? 4 : -3)} ${-1 - (k % 2)}`, season === 'winter' ? '#b0a07a' : '#d8bc6a', 1.2, .95); }   // (straw dropped under it, along its whole length)
    const wd = ['#8a6a44', '#6a5034', '#a8865a', '#4a3828'];
    B.s('M-46 -8L-70 -2', wd[1], 3);   // the shafts down on the setts
    B.s('M-44 -12L-68 -6', wd[1], 2.6);
    B.f(B.poly([[-40, -30], [40, -30], [44, -14], [-44, -14]]), wd[0]).f(B.poly([[-40, -30], [40, -30], [41, -26], [-41, -26]]), wd[2], .8);
    for (let x = -36; x < 40; x += 9) B.s(`M${x} -29V-15`, wd[3], .8, .5);
    // its load of hay, combed and roped
    B.f('M-38 -30Q-36 -52 -6 -54Q30 -54 38 -30Z', season === 'winter' ? '#b0a07a' : '#d8bc6a').f('M-34 -32Q-32 -48 -8 -50Q-12 -40 -10 -32Z', '#ecd894', .6);
    for (let k = 0; k < 14; k++) B.s(`M${-30 + k * 4.6} -32l${(k % 3) - 1} -${8 + (k % 4) * 3}`, '#b89a54', .8, .6);
    B.s('M-20 -50L-26 -30M14 -52L20 -30', '#6e5634', 1, .7);
    for (const x of [-26, 26]) { B.f(B.circ(x, -8, 11), wd[3]).f(B.circ(x, -8, 9), 'rgba(0,0,0,0)'); B.s(B.circ(x, -8, 10), wd[1], 3); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.s(`M${x} -8l${Math.cos(a) * 9} ${Math.sin(a) * 9}`, wd[0], 1.6); } B.f(B.circ(x, -8, 2.4), wd[3]); }
  };
  const drawTrough = P => B => { B.shadow(4, 2, 28, 5, .3);
    B.f(B.rr(-26, -16, 40, 16, 3), '#8e8a7c').f(B.rr(-26, -16, 40, 4, 2), '#b8b4a2').f(B.rr(-23, -14, 34, 4, 1.6), '#46686c').f(B.rect(-23, -14, 34, 1.2), '#a8cace', .8);
    B.f(B.ell(-18, -3, 5, 1.6), '#6f8a42', .6);
    // the pump: a cast-iron column with a long handle, its spout over the trough
    B.f(B.rr(10, -44, 9, 44, 2), '#3e4446').f(B.rect(10, -44, 3, 44), '#6a7274', .7).f(B.rr(8, -48, 13, 5, 2), '#2e3436');
    B.s('M19 -40Q30 -46 34 -30', '#2e3436', 2.4).s('M10 -30h-8v4', '#2e3436', 3);
    B.f(B.ell(2, -17, 2, 1), '#d4e6e4', .8);
  };
  const drawBarrels = P => B => { B.shadow(3, 1, 20, 4, .3);
    for (const [x, y, k] of [[-9, 0, 1], [9, 0, 1], [0, -16, .9]]) { const w = 8.5 * k, h = 15 * k; B.f(B.rr(x - w, y - h, w * 2, h, 3), '#8a6236').f(B.rr(x - w, y - h, w * .7, h, 2), '#a87a46', .7); for (const t of [.2, .8]) B.s(`M${x - w} ${y - h * t}h${w * 2}`, '#3e3a36', 1.4); B.f(B.ell(x, y - h, w, 2.4), '#6e4e2a').f(B.ell(x, y - h, w - 1.6, 1.6), '#9a7044', .8); }
  };
  const drawSacks = P => B => { B.shadow(2, 1, 22, 5, .3); for (const [x, y, s] of [[-10, 0, 1], [9, 0, .95], [0, -11, .9]]) { B.f(`M${x - 9 * s} ${y}Q${x - 11 * s} ${y - 12 * s} ${x - 5 * s} ${y - 16 * s}L${x + 5 * s} ${y - 16 * s}Q${x + 11 * s} ${y - 12 * s} ${x + 9 * s} ${y}Z`, '#e4dcc4').f(`M${x - 8 * s} ${y}Q${x - 10 * s} ${y - 11 * s} ${x - 5 * s} ${y - 15 * s}L${x - 2 * s} ${y - 15 * s}Q${x - 6 * s} ${y - 10 * s} ${x - 4 * s} ${y}Z`, '#fff', .5).s(`M${x - 4 * s} ${y - 16 * s}l${8 * s} 0`, '#a08a5a', 1.4); } };
  // (round 3, critic round 2: the crown's fade reaches its whole drawn underside: on the deer track the player's head was lost in it)
  const OAK_SCALE = 1.75;   // the vale's landmark tree: its crown stands over the woods, seen from the arch and from the green zoomed out
  const oakAt = (L, pz) => L.cpt(pz.x + 2.9, pz.y - 1.5);   // at the clearing's north-east edge, clear of the bench and the hollow oak
  function greatOak(B, r, P, season) {
    B.shadow(10, 6, 200, 34, .3);
    const bark = ['#6a5440', '#4e3e30', '#8a7258', '#3a2e24'];
    // roots flaring into the ground, the bole, and five great limbs
    B.f('M-46 6Q-30 -6 -22 -40L-20 -120Q-4 -132 18 -120L22 -40Q30 -6 52 8Q20 2 4 4Q-20 2 -46 6Z', bark[0]);
    B.f('M-40 4Q-26 -8 -20 -40L-18 -118Q-12 -124 -4 -122L-6 -40Q-12 -8 -24 4Z', bark[2], .6).f('M8 -120Q16 -100 18 -40Q22 -8 42 6Q24 0 12 2Q16 -40 4 -120Z', bark[1], .55);
    for (let k = 0; k < 7; k++) B.s(`M${-14 + k * 5} ${-8 - r() * 10}q${(r() - .5) * 4} ${-40 - r() * 30} ${(r() - .5) * 6} ${-60 - r() * 30}`, bark[3], 1.2, .4);
    B.f(B.ell(-6, -70, 5, 9), bark[3], .7);   // an old knot hole
    const limbs = [[-12, -116, -150, -220], [-4, -124, -70, -300], [6, -124, 40, -320], [14, -118, 140, -250], [18, -110, 150, -185], [-16, -108, -150, -175]];   // (the two low limbs end inside the crown: their bare ends read as a log floating over the brook)
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
    for (let i = 0; i < 7; i++) { const x = -150 + r() * 300, y = -300 + r() * 140, rx = 9 + r() * 8, ry = 6 + r() * 5; B.f(B.blob(r, x, y + 2, rx * 1.5, ry * 1.3, 8, .5), L[0], .38); B.s(`M${x - 12} ${y + 7}q9 -2 22 -11`, bark[0], 2.6, .55); }   // (shaded pockets with a limb in them: cut-out holes showed the lawn through the crown as grey patches)
    // (round 3) the fallen leaves round its foot under the alpha that reads as something standing: at .85 the lowest leaves
    // were taken for the tree's own base, a cell in front of its trunk, where the feet could stand on it
    if (season === 'autumn') for (let i = 0; i < 40; i++) B.f(B.ell(-200 + r() * 400, 2 + r() * 26, 2, 1.2), L[1 + Math.floor(r() * 3)], .3);
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
      const logs = gardenIslandLogStack(L.D), logAt = logs ? L.cpt(logs.x, logs.y) : { x: c.x + 2.2 * cw, y: c.y + .4 * ch };
      thing({ key: 'logstack', x: logAt.x, y: logAt.y, box: [-40, -54, 44, 8], draw: B => logStack(B, C.kit.rng(72), P) });
      thing({ key: 'block', x: c.x - 1.9 * cw, y: c.y + 1.3 * ch, box: [-20, -34, 26, 8], foot: [-14, 18, 8], draw: B => chopBlock(B, P) });
    }
    const ice = L.stat('ld-icehouse');
    if (ice) {
      const c = L.cpt(ice.x + ice.w / 2, ice.y + ice.h);
      add([c.x - 120, c.y - 50, c.x + 120, c.y + 100], 73, (B, r) => {
        // a sunken way down to the door: two stone wing walls, worn steps, ferns and a drip of damp
        // (layout round 3: four steps, so the way down ends at the round in front of the door and never runs on over the shore plots below it)
        const shape = `M${c.x - 26} ${c.y}L${c.x + 26} ${c.y}L${c.x + 36} ${c.y + 42}L${c.x - 36} ${c.y + 42}Z`;
        B.f(shape, '#5e5a4c', .55);
        for (let k = 0; k < 4; k++) { const y = c.y + 6 + k * 9, w = 26 + k * 2.4; B.f(B.rect(c.x - w, y, w * 2, 6), k % 2 ? '#a7a491' : '#bdb9a6').f(B.rect(c.x - w, y + 5, w * 2, 1.4), '#4e4a3e', .5); }
        for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const t = k / 5, x = c.x + s * (28 + t * 12), y = c.y + t * 40; B.stone(r, x, y, 6, 4, { rock: RUIN.body, rockLo: RUIN.lo, rockHi: RUIN.hi, rockDk: RUIN.dk }, r() < .5 ? RUIN.moss : null); if (r() < .4) fern(B, r, x + s * 10, y + 4, C.season); }
        B.f(B.blob(r, c.x, c.y + 4, 22, 5, 7, .4), '#3e4a3a', .5);
      });
    }
    // the watchtower's door faces south, off its own path: a trodden way round its west end joins the pond walk to the step
    const tower = L.stat('ld-tower'), walk = L.routes.get('pond-walk');
    if (tower && tower.door && walk) {
      const pts = [[tower.x - .75, tower.y - .1], [tower.x - .7, tower.y + .75], [tower.x - .2, tower.y + 1.4], [tower.door.x, tower.y + 1.6]].map(L.pt);
      add(C.kit.bboxOf(pts, 40), 79, (B, r) => {
        V.strokePts(B, pts, '#6e5e3e', 30, .3); V.strokePts(B, pts, '#b8a478', 24, .9); V.strokePts(B, pts, '#d4c196', 16, .85); V.strokePts(B, pts, '#e2d2a8', 6, .5, -2, -1);
        for (let k = 0; k < 18; k++) { const t = r(), i = Math.min(2, Math.floor(t * 3)), a = pts[i], b = pts[i + 1], f = t * 3 - i; B.f(B.blob(r, a.x + (b.x - a.x) * f + (r() - .5) * 14, a.y + (b.y - a.y) * f + (r() - .5) * 8, 3 + r() * 3, 1.4 + r(), 6, .5), r() < .5 ? '#7d8f4e' : '#9a8a5e', .55); }
      });
    }
    // the wayside lamps: an iron lantern on a squat stone plinth, glass that holds the light (lit at dusk by the world's lights)
    if (typeof gardenIslandOldWoodLamps === 'function') gardenIslandOldWoodLamps(L.D).forEach((q, i) => {
      const p = L.cpt(q.x, q.y);
      thing({ key: 'oldlamp|' + i + '|' + C.season, x: p.x, y: p.y, box: [-18, -70, 18, 8], draw: B => {
        const r = C.kit.rng(300 + i);
        B.shadow(2, 1, 13, 3.4, .32);
        B.f(B.rr(-9, -15, 18, 15, 2.5), RUIN.body).f(B.rect(-9, -15, 5, 15), RUIN.hi, .45).f(B.rect(4, -15, 5, 15), RUIN.lo, .55).f(B.rr(-10.5, -18, 21, 4, 1.5), RUIN.lo).f(B.rr(-10.5, -18, 21, 1.6, 1), RUIN.hi, .7);
        B.f(B.blob(r, -3, -17, 7, 2, 6, .5), C.season === 'winter' ? '#f2f4f0' : RUIN.moss, .9);
        B.s('M0 -18V-50', P.iron, 3).s('M-1 -18V-50', '#5a6064', 1, .6).s('M0 -46Q6 -50 9 -46', P.iron, 1.8);
        B.f('M-6 -56L6 -56L5 -46L-5 -46Z', '#f2d36b', .95).f('M-6 -56L-1 -56L-1.5 -46L-5 -46Z', '#fff2c0', .6).s('M-6 -56L6 -56L5 -46L-5 -46ZM0 -56V-46M-5.5 -51H5.5', P.iron, 1.2);
        B.f('M-8 -56L0 -62L8 -56Z', P.iron).f(B.circ(0, -63, 1.6), P.iron).f(B.rect(-5.5, -46.5, 11, 2), P.iron);
        if (C.season !== 'winter' && r() < .7) fern(B, r, 9, 1, C.season);
      } });
    });
    // the postern: two old gate piers either side of the circuit where it leaves through the east wall
    if (typeof gardenIslandPosternPiers === 'function') gardenIslandPosternPiers(L.D).forEach((q, i) => {
      const p = L.cpt(q.x, q.y);
      thing({ key: 'postern-pier|' + i + '|' + C.season, x: p.x, y: p.y, box: [-22, -66, 22, 10], draw: B => {
        const r = C.kit.rng(410 + i), ST = { rock: RUIN.body, rockLo: RUIN.lo, rockHi: RUIN.hi, rockDk: RUIN.dk };
        B.shadow(3, 2, 18, 4.4, .34);
        B.f(B.rect(-11, -48 + i * 6, 22, 48 - i * 6), B.lin(0, -48, 0, 0, [[0, RUIN.body], [.8, RUIN.lo], [1, RUIN.dk]])).f(B.rect(-11, -48 + i * 6, 6, 48 - i * 6), RUIN.hi, .4).f(B.rect(5, -48 + i * 6, 6, 48 - i * 6), RUIN.lo, .5);
        for (let y = -44 + i * 6; y < -2; y += 8) B.f(B.rect(-11, y, 22, 1), RUIN.dk, .35).f(B.rect(-11 + ((y / 8) & 1) * 9, y - 7, 1, 7), RUIN.dk, .3);
        B.f(B.rr(-13.5, -53 + i * 6, 27, 6, 2), RUIN.lo).f(B.rr(-13.5, -53 + i * 6, 27, 2.4, 1.2), RUIN.hi, .8).f(B.blob(r, -4, -52 + i * 6, 9, 2.4, 6, .5), C.season === 'winter' ? '#f2f4f0' : RUIN.moss, .9);
        B.f(`M-11 ${-40 + i * 6}Q-14 ${-24 + i * 6} -9 ${-12}Q-4 ${-26 + i * 6} -6 ${-40 + i * 6}Z`, RUIN.ivy, .9);
        for (let k = 0; k < 3; k++) B.stone(r, (r() - .5) * 30, 4 + r() * 4, 4 + r() * 3, 2.6 + r(), ST, r() < .5 ? RUIN.moss : null);
        fern(B, r, i ? -12 : 13, 3, C.season);
      } });
    });
    // the small stone by the chapel wall, with no name on it
    const chapel = L.stat('ld-chapel');
    if (chapel) { const p = L.cpt(chapel.x - .6, chapel.y + chapel.h + .4); thing({ key: 'chapel-stone', x: p.x, y: p.y, box: [-14, -26, 16, 6], foot: [-11, 13, 8], draw: B => { B.shadow(3, 1, 11, 3, .3); B.f('M-7 0L-7 -15Q-7 -21 0 -21Q7 -21 7 -15L7 0Z', RUIN.body).f('M-7 0L-7 -15Q-7 -21 0 -21L0 0Z', RUIN.hi, .5).f(B.blob(window.GardenPaintTerrainKit.rng(5), -2, -19, 5, 2, 6, .5), RUIN.moss, .9); B.f(B.circ(-3, 1, 1.6), '#f0e0a0').f(B.circ(2, 1.4, 1.4), '#e8e4f0'); } }); }
  }
  function logStack(B, r, P) {
    B.shadow(4, 1, 40, 6, .3);
    for (const x of [-34, 34]) B.f(B.rect(x - 2, -40, 4, 40), P.woodDk);
    B.f(B.rr(-38, -3.4, 76, 4.4, 1.6), '#6a5034').f(B.rect(-38, -3.4, 76, 1.2), '#9a7a54', .7);   // (the sill log the stack stands on: its foot is as wide as its block)
    for (let row = 0; row < 5; row++) for (let k = 0; k < 7; k++) { const x = -29 + k * 9.6 + (row % 2) * 4.8, y = -5 - row * 8.4; if (x > 30) continue; B.f(B.circ(x, y, 4.6), '#8a6a46').f(B.circ(x - .4, y - .4, 3.6), '#d8b884').f(B.circ(x - .4, y - .4, 1.6), '#b8925e', .8); }
    B.f('M-40 -42L0 -52L42 -42L40 -38L0 -47L-38 -38Z', '#5e5040');
  }
  function chopBlock(B, P) {
    B.shadow(2, 1, 14, 4, .3);
    B.f(B.rect(-10, -14, 20, 14), '#7a5e40').f(B.rect(-10, -14, 6, 14), '#9a7a54', .6).f(B.ell(0, -14, 10, 3.4), '#d8b884').f(B.ell(0, -14, 5, 1.6), '#b8925e', .7);
    B.s('M2 -15L14 -30', '#8a6a46', 2.4).f('M10 -33L18 -28L15 -24L8 -29Z', '#6a7074').f('M10 -33L12 -32L9 -28L8 -29Z', '#c8d0d4');
    for (let k = 0; k < 4; k++) B.f(B.rect(-18 + k * 9, 2 + (k % 2) * 3, 6, 2.2), '#c8a878', .9);
  }

  /* ---------- the village green: the heart of the village ----------
   * Inside the loop path: a well-kept common, mown in broad stripes, daisies and clover in the sward, a ring of
   * cottage flowers just inside the path, a worn line where everyone cuts across, and on the free ground the
   * maypole with its ribbons and a bench under it. Ground only where the plots are, so nothing gets in the way. */
  function green(C) {
    const { L, P, add, kit, thing } = C, pz = (L.pres.plazas || []).find(p => p.id === 'the-green'); if (!pz) return;
    const loop = L.routePts(pz.route); if (loop.length < 6) return;
    const c = L.cpt(pz.x, pz.y), cx0 = loop.reduce((s, q) => s + q.x, 0) / loop.length, cy0 = loop.reduce((s, q) => s + q.y, 0) / loop.length;
    // the sward: the loop pulled in from the path's edge
    // (2.74: the lawn is authored, the inside edge of the flagged walk; the square lies outside it, at its foot)
    const inner = Array.isArray(pz.lawn) && pz.lawn.length > 2 ? V.shapeLoop(L, pz.lawn, 3) : loop.map(q => ({ x: cx0 + (q.x - cx0) * .9, y: cy0 + (q.y - cy0) * .86 })), bb = kit.bboxOf(loop, 20), seed = kit.hashStr('the-green');
    const flowers = C.season === 'winter' ? ['#f4f6f2', '#e8ecef'] : C.season === 'autumn' ? ['#e8dcc0', '#d8a040', '#a8503a', '#e0c070'] : ['#f4f0e0', '#f0d24a', '#c79ac0', '#e88a8a', '#8ab0e0'];
    add(bb, seed, (B, r) => {
      // the sward, less the paved circle at the green's foot (the village ground's compass stone: about 8 by 6.6 cells)
      const path = new Path2D(B.poly(inner)), pad = L.cpt(pz.x + .9, pz.y + 3.3), cut = new Path2D(); cut.rect(bb[0] - 40, bb[1] - 40, bb[2] - bb[0] + 80, bb[3] - bb[1] + 80); if (!pz.lawn) cut.addPath(new Path2D(B.rr ? B.rr(pad.x - 4 * L.cw, pad.y - 3.3 * L.ch, 8 * L.cw, 6.6 * L.ch, 40) : B.rect(pad.x - 4 * L.cw, pad.y - 3.3 * L.ch, 8 * L.cw, 6.6 * L.ch)));
      B.cx.save(); B.cx.clip(path); B.cx.clip(cut, 'evenodd');
      // a richer, greener sward than the ground round it
      B.f(B.poly(inner), C.season === 'winter' ? '#b8c2aa' : C.season === 'autumn' ? '#a4ae62' : '#9cba62', .16);   // (light: the village ground's painted sward shows through)
      // mown stripes, broad and soft, running across the green
      const w = bb[2] - bb[0], h = bb[3] - bb[1];
      // (fix round 1: strong enough to read as a mown green at the default camera; they were too faint to see)
      B.cx.filter = 'blur(2.5px)'; for (let k = -3; k < 14; k++) { const x = bb[0] + k * 46; B.f(`M${x} ${bb[1]}l46 0l${-h * .35} ${h}l-46 0z`, k % 2 ? '#f6f8dc' : '#2e4a20', k % 2 ? .1 : .075); } B.cx.filter = 'none';
      // the worn line across the middle where everyone cuts over
      V.strokePts(B, [{ x: bb[0] + w * .16, y: cy0 + h * .18 }, { x: cx0 - w * .1, y: cy0 + 4 }, { x: cx0 + w * .14, y: cy0 - 6 }, { x: bb[2] - w * .14, y: cy0 - h * .2 }], '#b8a878', 10, .22);
      // daisies and clover in the sward
      for (let k = 0; k < w * h / 260; k++) { const x = bb[0] + r() * w, y = bb[1] + r() * h; if (r() < .6) B.f(B.circ(x, y, 1.2), C.season === 'winter' ? '#f4f6f2' : r() < .8 ? '#f6f2e4' : '#f0d24a', .9); else B.f(B.blob(r, x, y, 3.4, 2.2, 6, .4), '#5e8a44', .5); }
      B.cx.restore();
      // a ring of cottage flowers just inside the path
      const leafy = C.season === 'winter' ? '#7a8a6e' : '#5e8040';
      for (const q of V.walk(inner.concat([inner[0]]), 11)) { if (!pz.lawn && q.y > cy0 && Math.abs(q.x - cx0) < w * .21) continue;   // (not across the paved circle at the green's foot)
        const o = 3 + r() * 6, x = q.x - q.ty * o, y = q.y + q.tx * o; B.f(B.blob(r, x, y, 6, 3.6, 7, .4), leafy, .85); for (let j = 0; j < 3; j++) B.f(B.circ(x + (r() - .5) * 9, y - 2 + (r() - .5) * 4, 1.6), flowers[Math.floor(r() * flowers.length)], .95); }
    });
    // the maypole: on free ground near the middle (never on a plot or a house)
    const ok = (x, y) => L.free(x, y) && !L.plot(x, y) && L.kind(x, y) === 'grass';
    let spot = null; for (const [dx, dy] of [[0, -.6], [-1, -.6], [1, -.6], [0, .4], [-2, 0], [2, 0], [-1, 1], [1, 1], [-3, .6], [3, .6]]) if (ok(pz.x + dx, pz.y + dy)) { spot = L.cpt(pz.x + dx, pz.y + dy); break; }
    if (spot && !pz.lime) thing({ key: 'maypole|' + C.season, x: spot.x, y: spot.y, box: [-46, -150, 46, 14], foot: [-6, 6, 6], draw: B => {
      const rr = kit.rng(seed + 3), cols = ['#c84a3a', '#e8c84a', '#3a7ac0', '#f2f0e8', '#5e9a54', '#c86aa0'];
      B.shadow(0, 2, 26, 6, .3);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, ex = Math.cos(a) * 34, ey = Math.sin(a) * 9 + 2; B.s(`M0 -128Q${ex * .6} ${-60 + ey} ${ex} ${ey}`, cols[k], 1.6, .9).f(B.circ(ex, ey, 1.6), '#6a5034'); }
      B.post(0, -134, 2, 5, ['#e8dcc0', '#b8a888', '#ffffff']);
      for (let k = 0; k < 7; k++) B.s(`M-2.4 ${-120 + k * 16}l4.8 -6`, cols[k % cols.length], 2, .9);
      B.f(B.ell(0, -128, 9, 4), '#5e8a44').f(B.circ(-5, -130, 2), cols[0]).f(B.circ(2, -131, 2), cols[1]).f(B.circ(6, -128, 2), cols[5]).f(B.circ(-1, -126, 1.6), cols[3]);
      B.f(B.poly([[-3, -134], [0, -142], [3, -134]]), '#d8b040');
      void rr;
    } });
  }

  /* ---------- the high street's front gardens (polish, Nov 2026) ----------
   * The road from the quay to the green ran between bare lawns. Cottage borders along both verges: a leafy band with
   * lavender, roses and marigolds, a hollyhock now and then. Ground paint only (you step over a border, as on the green),
   * and only on open grass: never on a plot, a sight's footprint or the road. */
  function highStreet(C) {
    const { L, add, kit } = C, cw = L.cw, ch = L.ch, W = L.W, pts = L.routePts('harbour-walk'); if (pts.length < 2) return;
    const season = C.season, seed = kit.hashStr('high-street');
    const blooms = season === 'winter' ? ['#d8d2c4', '#b8a890'] : season === 'autumn' ? ['#c8783a', '#e0b050', '#a8503a', '#9a7ac8'] : season === 'spring' ? ['#f2efe2', '#e8c84a', '#d88aa8', '#9ab0e0'] : ['#9a7ac8', '#d86a7a', '#e8a040', '#f2efe2', '#c84a5a'];
    const leaf = season === 'winter' ? '#7a8468' : season === 'autumn' ? '#6e7a3e' : '#4f7a38', leafHi = season === 'winter' ? '#929a80' : season === 'autumn' ? '#8a9448' : '#6a9a48';
    const r0 = kit.rng(seed + 1), spots = []; for (const q of V.walk(pts, 9)) { const cy = (q.y - W.sky) / ch; if (cy < 59.2 || cy > 74.6) continue; for (const s of [-1, 1]) for (const d of [1.9, 2.4]) { const x = q.x + s * d * cw + (r0() - .5) * 6, y = q.y, gx = x / cw, gy = (y - W.sky) / ch; if (L.kind(gx, gy) === 'grass' && L.free(gx, gy) && !L.plot(gx, gy) && L.kind(gx - s * .5, gy) !== 'water') spots.push({ x, y, s }); } }
    if (!spots.length) return;
    const bb = kit.bboxOf(spots.map(p => ({ x: p.x, y: p.y })), 40);
    add(bb, seed, (B, r) => {
      for (const p of spots) { B.f(B.blob(r, p.x, p.y, 15, 7, 8, .45), leaf, .92).f(B.blob(r, p.x - 2, p.y - 3, 10, 4.6, 7, .45), leafHi, .75); }
      spots.forEach((p, i) => {
        const n = season === 'winter' ? 2 : 9; for (let k = 0; k < n; k++) B.f(B.circ(p.x + (r() - .5) * 20, p.y - 2 + (r() - .5) * 7, 1.5 + r() * .8), blooms[Math.floor(r() * blooms.length)], .95);
        if (i % 7 === 3 && season !== 'winter') { const hx = p.x + (r() - .5) * 8, col = blooms[Math.floor(r() * blooms.length)]; B.s(`M${hx} ${p.y}L${hx + 1} ${p.y - 24}`, '#5a7a3a', 1.6, .9); for (let k = 0; k < 5; k++) B.f(B.circ(hx + 1 + (r() - .5) * 2, p.y - 6 - k * 4, 2.6 - k * .25), col, .95); }
      });
    });
  }

  V.parts.push({ id: 'high-street', compose: highStreet });
  V.parts.push({ id: 'crossings', compose: crossings }, { id: 'ruins', compose: ruins }, { id: 'plazas', compose: plazas }, { id: 'homes', compose: homes }, { id: 'green', compose: green });
})();

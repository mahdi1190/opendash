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
  const RUIN = { body: '#a7a491', lo: '#7d7b6b', hi: '#ccc8b4', dk: '#555547', moss: '#6f8446', mossHi: '#93a85a', ivy: '#3c5a32', ivyHi: '#5a7e44' }, RUIN0 = RUIN;

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
    const { L, P, add, under, thing } = C, cw = L.cw, ch = L.ch, W = L.W;
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
      if (c.kind === 'footbridge') { add(box, 61, (B, r) => footbridge(B, r, P, A, Bp, deck)); nearRail(thing, c, P, A, Bp, deck); }
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
    // (19 Nov 2026, round 3 fixes, round 2: the deck's side beam shows below its edge on the side that faces you, so the bridge
    //  has a thickness and lies on the water; a bridge running north and south keeps low rails with only a slight rise, or its
    //  rails climbing the screen drew it as a ladder tilted up the bank)
    const ns = Math.abs(uy) > Math.abs(ux) * 1.2, pa = q(L / 2, hw), pb = q(L / 2, -hw), face = (Math.abs(pa.y - pb.y) > 2 ? pa.y > pb.y : pa.x > pb.x) ? hw : -hw, th = ns ? 4 : 5;
    { const run = []; for (let t = cap * .5; t <= L - cap * .5 + .01; t += 6) run.push(q(t, face)); const low = run.map(p => ({ x: p.x + (ns ? 1.5 : 0), y: p.y + th })); B.f(B.poly(run.concat(low.reverse())), '#4a3424', .92); V.strokePts(B, run, P.woodLo, 1.2, .8); }
    for (let t = cap; t < L - cap; t += 6.4) {
      const end = Math.min(L - cap, t + 5.8), hi = Math.min(end, t + 1.2), tone = r();
      B.f(B.poly([q(t, -hw), q(end, -hw), q(end, hw), q(t, hw)]), tone < .16 ? P.woodHi : tone < .82 ? P.wood : P.woodLo).f(B.poly([q(t, -hw), q(hi, -hw), q(hi, hw), q(t, hw)]), P.woodHi, .4);
      for (const s of [-hw + 4, hw - 4]) { const p = q(t + 3, s); B.f(B.circ(p.x, p.y, .6), P.woodDk, .8); }
    }
    // The rail carries the gentle arch; feet remain on the visible flat deck.
    for (const [s, col] of [[-hw, P.woodLo], [hw, P.wood]]) {
      const lift = t => (ns ? 7 : 13) + Math.sin(Math.PI * (t - cap / 2) / (L - cap)) * (ns ? 1.5 : 4);
      const rail = []; for (let t = cap / 2; t < L - cap / 2; t += 4) rail.push(q(t, s, lift(t))); rail.push(q(L - cap / 2, s, ns ? 7 : 13)); V.strokePts(B, rail, col, 2.6, .95); V.strokePts(B, rail, P.woodHi, 1, .5, 0, -.8);
      for (let i = 0; i <= 3; i++) { const t = cap / 2 + (L - cap) * i / 3, a = q(t, s), b = q(t, s, lift(t) + 1); B.s(`M${a.x} ${a.y}L${b.x} ${b.y}`, P.woodDk, 3, .95); if (ns) B.f(B.ell(b.x, b.y, 2.2, 1.4), P.woodHi, .9); }
    }
  }
  /** The footbridge's rail on the side nearer the viewer, again, as short standing pieces in the object layer: the
   *  same strokes as the rail baked into the ground above, so nothing changes until someone stands on the deck behind
   *  it. Then it crosses in front of their legs; before, the whole bridge was under their feet and they looked as if
   *  they stood outside the rail, over the water (drawing order, 18 Nov 2026). Each piece is a column of the rail
   *  and sorts by the rail's own foot there, a little forward so nobody on the deck is ever cut in two by it. */
  function nearRail(thing, c, P, A, Bp, deck) {
    const L = Math.hypot(Bp.x - A.x, Bp.y - A.y), ux = (Bp.x - A.x) / L, uy = (Bp.y - A.y) / L, hw = deck ? deck.halfWidth : 17;
    if (!thing || Math.abs(ux) < .6) return;   // (a bridge that runs up the screen, or steeply, has its rails left and right of you: they stay in the ground picture)
    const s = ux > 0 ? hw : -hw, col = s > 0 ? P.wood : P.woodLo, cap = Math.min(10, L * .12);
    const q = (t, lift = 0) => { const p = deck ? deck.deckPoint(t / L, s) : { x: A.x + ux * t - uy * s, y: A.y + uy * t + ux * s }; return { x: p.x, y: p.y - lift }; };
    const lift = t => 13 + Math.sin(Math.PI * (t - cap / 2) / (L - cap)) * 4;
    const rail = []; for (let t = cap / 2; t < L - cap / 2; t += 4) rail.push(q(t, lift(t))); rail.push(q(L - cap / 2, 13));
    const posts = [0, 1, 2, 3].map(i => cap / 2 + (L - cap) * i / 3);
    const e0 = q(cap / 2), e1 = q(L - cap / 2), xa = Math.min(e0.x, e1.x) - 3, xb = Math.max(e0.x, e1.x) + 3, STRIP = 10, n = Math.max(1, Math.ceil((xb - xa) / STRIP));
    const footAt = X => { const k = Math.max(0, Math.min(1, (X - e0.x) / ((e1.x - e0.x) || 1))); return e0.y + (e1.y - e0.y) * k; };
    for (let i = 0; i < n; i++) {
      const X0 = xa + i * STRIP, X1 = Math.min(xb, X0 + STRIP), fx = (X0 + X1) / 2, fy = footAt(fx), end = i === 0 || i === n - 1;
      thing({ key: 'rail|' + c.id + '|' + i, x: fx, y: fy, depth: fy + (end ? 1 : 6), box: [X0 - fx - 1, -34, X1 - fx + 1, 12], draw: B => {
        B.cx.save(); B.cx.beginPath(); B.cx.rect(X0 - fx, -40, X1 - X0, 60); B.cx.clip(); B.cx.translate(-fx, -fy);
        V.strokePts(B, rail, col, 2.6, .95); V.strokePts(B, rail, P.woodHi, 1, .5, 0, -.8);
        for (const t of posts) { const a = q(t), b = q(t, lift(t) + 1); B.s(`M${a.x} ${a.y}L${b.x} ${b.y}`, P.woodDk, 3, .95); }
        B.cx.restore();
      } });
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
          // (layout fix, north) each a flat-topped stone with running water showing between it and the next, in a line
          // across the stream (set close and as wide as the ford they read as one heap of boulders); a stride apart
          for (let j = 0; j < n; j++) { const a = a0 + j / n * Math.PI * 2, k = (.88 + r() * .18) * sz; pts.push([mid + Math.cos(a) * (hi - lo) * .4 * k, off * .5 + Math.sin(a) * hw * .78 * k]); }
          { const p0 = q(lo + (hi - lo) * .04, 0), p1 = q(hi - (hi - lo) * .04, 0); if (i > 0 && i - 1 !== gap) B.s(`M${p0.x - 5} ${p0.y - 2}q4 3 8 0`, P.foam || '#eef2e2', 1.3, .8); void p1; }
          const at = (pp, dy) => pp.map(([t, ds]) => { const p = q(t, ds); return [p.x, p.y + (dy || 0)]; });
          B.f(B.poly(at(pts.map(([t, ds]) => [t, ds * 1.12]), 2)), P.foam || '#eef2e2', .55);   // the white water round its foot
          B.f(B.poly(at(pts, 3.2)), '#3a3830', .9);   // its wet flank, standing out of the water
          B.f(B.poly(at(pts)), tones[Math.floor(r() * tones.length)]);
          B.f(B.poly(at(pts.map(([t, ds]) => [mid + (t - mid) * .8, off * .5 + (ds - off * .5) * .72 - hw * .1]))), '#c8c0aa', .7);   // the worn, flat, dry top
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
      // (the estuary's stones too, in sea-grey granite with green weed at the tide: round 2 of the coast, 19 Nov 2026; they were
      // pale slabs on one dark bed, a plank causeway across the river mouth)
      if (deck.over === 'river') {
        // The estuary: water-worn boulders, each its own size, outline, lean and tone, laid a little off the line as stones
        // in a river are, with small stones and weed between them in the water and the foam on their upstream side only.
        // Each still covers its own slab, so the footing is the whole support. (round 3: ten identical rounded squares with
        // the same moss patch and two white dots, a ruler-straight row of tiles)
        const tones = ['#8e8a80', '#9c978b', '#858178', '#a29c8f', '#948e82', '#a09484', '#7e7b74'], mid = t => q(t, 0);
        const outline = (lo, hi, k, ds, dt, rad, off) => { const pts = []; for (let j = 0; j < 30; j++) { const a = j / 30 * Math.PI * 2, f = j / 30 * rad.length, i0 = Math.floor(f) % rad.length, i1 = (i0 + 1) % rad.length, w = (1 - Math.cos((f - Math.floor(f)) * Math.PI)) / 2, rr = rad[i0] * (1 - w) + rad[i1] * w; pts.push(q((lo + hi) / 2 + dt + Math.cos(a) * (hi - lo) / 2 * k * rr, ds + off + Math.sin(a) * hw * k * rr * .92)); } return B.poly(pts); };
        for (let i = 0; i < count; i++) {
          const lo = i * step + (i ? .2 / deck.length : 0), hi = (i + 1) * step - (i < count - 1 ? .2 / deck.length : 0), size = 1.02 + r() * .2, off = (r() - .5) * hw * .3, rad = Array.from({ length: 7 }, () => .86 + r() * .26), tone = tones[Math.floor(r() * tones.length)];
          // (coast fix round 2: each slab laid as two or three stones of their own sizes, flat-topped and set close, not one
          // egg-shaped boulder the player's height repeated across the river)
          const at = (tc, sc, ra, rs, rd, dy) => { const pts = []; for (let j = 0; j < 30; j++) { const a = j / 30 * Math.PI * 2, f = j / 30 * rd.length, i0 = Math.floor(f) % rd.length, i1 = (i0 + 1) % rd.length, w = (1 - Math.cos((f - Math.floor(f)) * Math.PI)) / 2, rr = rd[i0] * (1 - w) + rd[i1] * w, p = q(tc + Math.cos(a) * ra * rr, sc + Math.sin(a) * rs * rr * .92); pts.push({ x: p.x, y: p.y + (dy || 0) }); } return B.poly(pts); };
          // (seen from above at the camera's slant a flat stone is wider than it is deep: each is drawn foreshortened, a low
          // side face under a flat top; now and then a small one set beside it in the water)
          const mid2 = (lo + hi) / 2, half = (hi - lo) / 2, parts = [[mid2 + (r() - .5) * half * .16, off + (r() - .5) * hw * .2, half * (.9 + r() * .2), hw * (.5 + r() * .16)]];
          if (r() < .4) parts.push([mid2 + (r() < .5 ? -1 : 1) * half * (.55 + r() * .2), off + (r() < .5 ? -1 : 1) * hw * (.62 + r() * .15), half * (.3 + r() * .12), hw * (.2 + r() * .08)]);
          for (const [tc, sc, ra, rs] of parts) { const rd = Array.from({ length: 7 }, () => .84 + r() * .3), tn = tones[Math.floor(r() * tones.length)], lift = 2.5 + rs * .12;
            B.f(at(tc, sc, ra * 1.06, rs * 1.08, rd, lift + 1.5), '#2e3a36', .4);
            B.f(at(tc, sc, ra, rs, rd, lift * .5), '#5a564c').f(at(tc, sc, ra * .98, rs * .96, rd, -lift * .5), tn);
            // the flat worn top, lit from the upper left, damp and darker towards its foot
            B.f(at(tc - ra * .14, sc - rs * .2, ra * .6, rs * .5, rd, -lift * .5 - .5), '#c4bcaa', .26 + r() * .14);
            if (r() < .55) B.f(at(tc + ra * (r() - .5) * .4, sc + rs * .7, ra * .55, rs * .25, rd, lift * .5), r() < .6 ? '#4f6a3a' : '#5e6a34', .5 + r() * .2); }
          if (r() < .4) { const p = q(lo + (hi - lo) * (.3 + r() * .4), off - hw * (.2 + r() * .3)); B.f(B.blob(r, p.x, p.y, 2.6 + r() * 2, 1.2 + r(), 6, .5), r() < .5 ? '#c8c48a' : '#e4e0d4', .55); }
          // foam on the side the river comes from, broken
          const fa = q(lo + (hi - lo) * (.15 + r() * .2), -hw * size * .98 + off), fb = q(lo + (hi - lo) * (.6 + r() * .25), -hw * size * .98 + off); B.s(`M${fa.x} ${fa.y}Q${(fa.x + fb.x) / 2} ${(fa.y + fb.y) / 2 - 2} ${fb.x} ${fb.y}`, P.foam || '#eef2e2', 1.3, .55);
          // a small stone or two in the water beside it, off the walk
          for (let k = 0, n = Math.floor(r() * 3); k < n; k++) { const side = r() < .5 ? -1 : 1, p = q(lo + (hi - lo) * r(), side * hw * (1.25 + r() * .45)), s = 2.4 + r() * 3.4; B.f(B.blob(r, p.x + .8, p.y + 1, s, s * .6, 7, .4), '#2e3a36', .35).f(B.blob(r, p.x, p.y, s, s * .62, 7, .4), tones[Math.floor(r() * tones.length)]).f(B.blob(r, p.x - s * .3, p.y - s * .2, s * .45, s * .25, 6, .4), '#cfc8b8', .45); }
        }
        void mid; return;
      }
      {
        // Every ford (the brook's, the gorge's, the estuary's): rounded, water-worn boulders, each its own shape and size
        // inside its slab of the support (a lumpy round outline, a little askew), wet dark feet, a ring of ripple where the
        // water meets them, moss on the shaded side. (Square slabs end to end, on a stone plank under them, read as a
        // paved causeway lying on the water; art director, round 3.)
        const tones = season === 'winter' ? ['#a9a89c', '#bdbcb0', '#9a9a8e'] : deck.over === 'river' ? ['#9a957f', '#aaa38c', '#8c8775', '#a39a82'] : ['#a19a84', '#b3ab93', '#958f7b', '#aaa088'];
        let shp = [1, 0, 1];
        const sq = (lo, hi, k, ds, dt, jit, kk = shp) => { const pts = []; for (let j = 0; j < 28; j++) { const a = j / 28 * Math.PI * 2, c = Math.cos(a), si = Math.sin(a), u = Math.sign(c) * Math.pow(Math.abs(c), .78), v = Math.sign(si) * Math.pow(Math.abs(si), .78), n = 1 + (jit ? (jit[j % jit.length] - .5) * .22 + (jit[(j + 3) % jit.length] - .5) * .1 : 0); pts.push(q((lo + hi) / 2 + dt + u * (hi - lo) / 2 * k * n * kk[0], ds + kk[1] + v * hw * k * n * kk[2])); } return B.poly(pts); };
        for (let i = 0; i < count; i++) {
          const lo = i * step + (i ? .25 / deck.length : 0), hi = (i + 1) * step - (i < count - 1 ? .25 / deck.length : 0), jit = [r(), r(), r(), r(), r(), r(), r()], tone = r();
          shp = [.9 + r() * .12, (r() - .5) * hw * .16, .84 + r() * .16];   // (each ford stone its own size and lean: the water painter's rounded fords, kept under the woods' two-boulder footings)
          // (19 Nov 2026, round 3 fixes: no cream ring round each stone, which drew them as tiles; the water breaks on them in a
          //  soft pale wash on the upstream side and a dark wet band at the waterline, each stone lumpier and lit on its top,
          //  with moss down its shaded side)
          for (let j = 0; j < jit.length; j++) jit[j] = .5 + (jit[j] - .5) * 3;
          // (19 Nov 2026, round 3 fixes, round 2: each footing two water-worn boulders, a big one and a smaller one against it,
          //  domed: lit on top, darker down their sides, wet at the waterline in a soft band; one slab filling each footing with
          //  a hard dark rim under it read as flagstones laid across the brook)
          const k2 = .5 + r() * .12, ds2 = (r() < .5 ? -1 : 1) * hw * .42, dt2 = (r() - .5) * (hi - lo) * .5;
          B.cx.save(); B.cx.filter = 'blur(2px)'; B.f(sq(lo, hi, 1.16, -1.5, 0, jit), '#dce8e4', .2); B.f(sq(lo, hi, 1.05, 1.8, 0, jit), '#22302c', .32); B.cx.filter = 'none'; B.cx.restore();
          for (const [kk, ds, dt] of [[.95, 0, 0], [k2, ds2, dt2]]) {
            const base = tones[Math.floor(tone * tones.length)];
            B.f(sq(lo, hi, kk, ds + 1, dt, jit), '#5e584a', .95);
            B.f(sq(lo, hi, kk * .96, ds - .4, dt, jit), base);
            B.f(sq(lo, hi, kk * .78, ds + hw * .16, dt + (hi - lo) * .06, jit), '#7a7462', .35);
            B.f(sq(lo, hi, kk * .58, ds - hw * .26, dt - (hi - lo) * .1, jit), '#d4ccb4', .45);
            B.f(sq(lo, hi, kk * .26, ds - hw * .36, dt - (hi - lo) * .16, jit), '#ece4cc', .4);
          }
          if (tone < .7) B.f(sq(lo, hi, .42, hw * .46, (hi - lo) * .14, jit), season === 'winter' ? '#e8ecef' : '#5f7a3e', .62);
          if (tone < .35 && season !== 'winter') B.f(sq(lo, hi, .22, hw * .22, -(hi - lo) * .16, jit), '#7d9248', .7);
        }
        return;
      }
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
        // (and each point's two sides of the walking block, so the rubble at the wall's foot fills the whole block: 19 Nov 2026,
        //  round 3 fixes, round 2: a thin wall in a block three times its width stopped you at nothing you could see)
        const mid = [], band = [], pushMid = i => { const x = (a[i].x + b[i].x) / 2, y = (a[i].y + b[i].y) / 2; mid.push({ x, y }); band.push([{ x: a[i].x - x, y: a[i].y - y }, { x: b[i].x - x, y: b[i].y - y }]); };
        for (let i = 0; i < m; i += 2) pushMid(i);
        if (m % 2 === 0) pushMid(m - 1);
        let foot = mid[0]; for (const p of mid) if (p.y > foot.y) foot = p;
        const seed = kit.hashStr(f.id), rr = kit.rng(seed), H = [];
        // a ruined profile: high runs and tumbled gaps, never the same twice
        // (19 Nov 2026, round 3 fixes: to the size standard's wall, 0.8 to 1.2 of your height where it stands, tumbled to the knee
        //  in its gaps: at about half that, seen from above, it read as a kerb lying on the ground)
        const WH = typeof gardenSizePx === 'function' ? [gardenSizePx('wall', 0), gardenSizePx('wall', 1)] : [33, 50];
        let h = WH[0] + rr() * (WH[1] - WH[0]) * .6; for (let i = 0; i < mid.length; i++) { h += (rr() - .5) * 12; if (rr() < .1) h = 9 + rr() * 6; if (rr() < .12) h = WH[1] - rr() * 6; h = Math.max(8, Math.min(WH[1], h)); H.push(h); }
        for (let k = 0; k < 2; k++) for (let i = 1; i < H.length - 1; i++) H[i] = (H[i - 1] + H[i] * 2 + H[i + 1]) / 4;
        // an end that is not at a gate tumbles down into its own rubble (the wall west of Hollin's hut stopped dead on the sand)
        const atGate = p => (L.D.gates || []).some(g => Math.hypot(p.x - L.pt([g.x, g.y]).x, (p.y - L.pt([g.x, g.y]).y) * 1.4) < 150);
        for (const [i, j] of [[0, 1], [H.length - 1, H.length - 2]]) if (H.length > 3 && !atGate(mid[i])) { H[i] = Math.min(H[i], 9); H[j] = Math.min(H[j], 20); }
        // in pieces of two stretches: each bakes quickly and sorts by its own foot (pieces of six sorted a slanting wall up
        // to two rows away from where it stood: now that the feet stop at the drawn wall and not a cell short of it
        // (94-garden-world-0walk.js gardenRuinWallFoot), someone standing in front of its upper end was drawn behind it)
        for (let g = 0; g < mid.length - 1; g += 2) {
          const sub = mid.slice(g, g + 3), hs = H.slice(g, g + 3), bs = band.slice(g, g + 3); let ft = sub[0]; for (const p of sub) if (p.y > ft.y) ft = p;
          const C2 = sub.map(p => ({ x: p.x - ft.x, y: p.y - ft.y })), bb = kit.bboxOf(C2), ends = [g === 0 && !atGate(mid[0]), g + 3 >= mid.length && !atGate(mid[mid.length - 1])];
          thing({ key: 'ruin5|' + f.id + '|' + g, x: ft.x, y: ft.y, box: [bb[0] - 52, bb[1] - 64, bb[2] + 52, bb[3] + 34], K: 1.1, draw: B => ruinWall(B, kit.rng(seed + 1 + g), C2, hs, C.P, C.season, bs, ends) });
        }
      } else if (f.kind === 'ruin') {
        // (19 Nov 2026, round 3 fixes: the old hall's footings stand up out of the grass as low broken walls, knee high, with a
        //  doorway on the side towards the court, a hearth stone inside and nettles in the old floor: a ring of pebbles in the
        //  grass could not be read, and walking stopped at nothing you could see)
        const loop = f.polygon.map(L.pt), seed = kit.hashStr(f.id); let ft = loop[0]; for (const p of loop) if (p.y > ft.y) ft = p;
        add(kit.bboxOf(loop, 30), seed, (B, r) => foundationFloor(B, r, loop, C.P, C.season));
        const court = (L.pres.plazas || []).find(p => /court/.test(p.id)), cp = court ? L.pt([court.x, court.y]) : { x: ft.x, y: ft.y + 100 };
        const C2 = loop.map(p => ({ x: p.x - ft.x, y: p.y - ft.y })), bb = kit.bboxOf(C2);
        thing({ key: 'footings|' + f.id, x: ft.x, y: ft.y, box: [bb[0] - 30, bb[1] - 40, bb[2] + 30, bb[3] + 18], K: 1.1, draw: B => footings(B, kit.rng(seed + 3), C2, { x: cp.x - ft.x, y: cp.y - ft.y }, C.P, C.season) });
      }
    }
  }
  // The old wall's own stone: older and darker than the footings' (a pale wall with a flat moss band on top read as a raised
  // road; 19 Nov 2026, round 3 fixes, round 2)
  const WALL = { body: '#959079', lo: '#6d6957', hi: '#b6b098', dk: '#47463a', moss: '#5e7a3c', mossHi: '#86a04e', ivy: '#34522e', ivyHi: '#55783e' };
  // The rubble at a wall's foot, over the whole of its walking block on both sides: tumbled stones (bigger and closer near the
  // wall), bramble and fern at the block's outer edge, grass between. Items behind the wall's line come back first, those in
  // front last, so the wall stands in its rubble. band: for each centre point its two side offsets (px).
  function wallRubble(r, C2, band, season, ends) {
    const items = [], n = C2.length;
    for (let i = 0; i < n - 1; i++) {
      const p = C2[i], q = C2[i + 1], L = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      for (let s = 0; s < L; s += 6) {
        const t = s / L, cx = p.x + (q.x - p.x) * t, cy = p.y + (q.y - p.y) * t;
        for (const side of [0, 1]) {
          const o0 = band[i][side], o1 = band[i + 1][side], ox = o0.x + (o1.x - o0.x) * t, oy = o0.y + (o1.y - o0.y) * t, reach = Math.hypot(ox, oy); if (reach < 10) continue;
          const d = .32 + Math.pow(r(), 1.3) * .72, x = cx + ox * d + (r() - .5) * 4, y = cy + oy * d + (r() - .5) * 3, near = 1 - d;
          if (r() < .16 + near * .34) items.push({ y, k: 'stone', x, s: 3 + r() * 3 + near * 4.5, dark: r() < .6, behind: y < cy - 2 });
          if (d > .55 && r() < .3) items.push({ y: y + 1, k: r() < .5 ? 'bramble' : 'fern', x, behind: y < cy - 2 });
          else if (r() < .32) items.push({ y, k: 'tuft', x, behind: y < cy - 2 });
        }
      }
    }
    // past an end that is not at a gate, the last stones lie spread out along the line it would have run
    for (const [on, a, b] of [[ends && ends[0], C2[0], C2[1]], [ends && ends[1], C2[n - 1], C2[n - 2]]]) {
      if (!on || !a || !b) continue; const L = Math.hypot(a.x - b.x, a.y - b.y) || 1, ux = (a.x - b.x) / L, uy = (a.y - b.y) / L;
      for (let k = 0; k < 9; k++) { const s = 4 + r() * 34, x = a.x + ux * s + (r() - .5) * 18, y = a.y + uy * s + (r() - .5) * 10; items.push({ y, k: 'stone', x, s: 2.4 + r() * 4 * (1 - s / 40), behind: false }); }
      items.push({ y: a.y + 3, k: 'fern', x: a.x + ux * 10, behind: false });
    }
    return items.sort((p, q) => p.y - q.y);
  }
  function drawRubble(B, r, it, season) {
    const ST = { rock: WALL.body, rockLo: WALL.lo, rockHi: WALL.hi, rockDk: WALL.dk };
    if (it.k === 'stone') { B.shadow(it.x + it.s * .3, it.y + it.s * .3, it.s * 1.2, it.s * .45, .26); B.stone(r, it.x, it.y, it.s, it.s * (.55 + r() * .2), it.dark ? { rock: WALL.lo, rockLo: WALL.dk, rockHi: WALL.body, rockDk: '#33322a' } : ST, season === 'winter' ? null : r() < .6 ? WALL.moss : null); }
    else if (it.k === 'fern') fern(B, r, it.x, it.y, season);
    else if (it.k === 'bramble') { if (season === 'winter') return; for (let k = 0; k < 4; k++) { const a = -Math.PI * (.15 + r() * .7), l = 8 + r() * 9; B.s(`M${it.x} ${it.y}q${Math.cos(a) * l * .6} ${Math.sin(a) * l - 4} ${Math.cos(a) * l} ${Math.sin(a) * l * .7}`, '#5a3a2a', 1.2, .85); } for (let k = 0; k < 6; k++) B.f(B.blob(r, it.x + (r() - .5) * 14, it.y - 3 - r() * 7, 3 + r() * 2, 2 + r() * 1.4, 6, .5), r() < .5 ? '#3e5a2c' : '#56743a', .92); if (season === 'summer' && r() < .5) B.f(B.circ(it.x + (r() - .5) * 8, it.y - 6, 1.3), '#2a1a2a', .9); }
    else if (season !== 'winter') B.tufts(r, it.x, it.y, 8, 3, ['#6f8446', '#8a9a58'], 5);
  }
  function ruinWall(B, r, C2, H, P, season, band, ends) {
    const T = band ? 9 : 7, RUIN = band ? WALL : RUIN0, ST = { rock: RUIN.body, rockLo: RUIN.lo, rockHi: RUIN.hi, rockDk: RUIN.dk };
    // contact shade along the foot
    V.strokePts(B, C2, '#24301e', 18, .16, 3, 4); V.strokePts(B, C2, '#24301e', 9, .18, 2, 3);
    const rubble = band ? wallRubble(r, C2, band, season, ends) : [];
    for (const it of rubble) if (it.behind) drawRubble(B, r, it, season);
    // the wall as short boxes along its centre line, drawn back to front; each box: lit or shaded faces, a mossy top
    const segs = []; for (let i = 0; i < C2.length - 1; i++) segs.push(i); segs.sort((i, j) => (C2[i].y + C2[i + 1].y) - (C2[j].y + C2[j + 1].y));
    for (const i of segs) {
      const p = C2[i], q = C2[i + 1], L = Math.hypot(q.x - p.x, q.y - p.y) || 1, nx = -(q.y - p.y) / L * T, ny = (q.x - p.x) / L * T * .6, h0 = H[i], h1 = H[i + 1];
      const foot = [{ x: p.x + nx, y: p.y + ny }, { x: q.x + nx, y: q.y + ny }, { x: q.x - nx, y: q.y - ny }, { x: p.x - nx, y: p.y - ny }], hs = [h0, h1, h1, h0];
      // a touch of oblique, so walls running north-south show their east face; more the more north-south the stretch runs
      // (critic 3: the postern wall leant a third of its height and read as a flat line of low stones; the old wall's north-south runs further still)
      const lean = band && Math.abs(q.y - p.y) > Math.abs(q.x - p.x) * .8 ? .6 : .32 + .3 * Math.abs(q.y - p.y) / L, up = (v, k) => ({ x: v.x - hs[k] * lean, y: v.y - hs[k] });
      for (let e = 0; e < 4; e++) {
        if ((e === 1 && i < C2.length - 2) || (e === 3 && i > 0)) continue;   // the ends between two stretches are inside the wall
        const v0 = foot[e], v1 = foot[(e + 1) % 4], ex = v1.x - v0.x, ey = v1.y - v0.y, onx = ey, ony = -ex;   // outward normal for a clockwise loop
        const cx = (foot[0].x + foot[2].x) / 2, cy = (foot[0].y + foot[2].y) / 2, mx = (v0.x + v1.x) / 2 - cx, my = (v0.y + v1.y) / 2 - cy, s = Math.sign(onx * mx + ony * my) || 1, outY = ony * s, outX = onx * s;
        if (outY <= 0 && outX <= 0) continue;   // faces turned away from the camera are hidden
        const face = [v0, v1, up(v1, (e + 1) % 4), up(v0, e)], lit = outY > Math.abs(outX) ? 1 : 0;
        B.f(B.poly(face), B.lin(0, Math.min(face[2].y, face[3].y), 0, Math.max(v0.y, v1.y), band ? [[0, lit ? RUIN.body : RUIN.lo], [.4, lit ? RUIN.lo : '#5a584a'], [.85, lit ? '#5e5c4c' : '#46453a'], [1, '#2e2e26']] : [[0, lit ? RUIN.hi : RUIN.lo], [.35, lit ? RUIN.body : '#6a685a'], [.8, lit ? RUIN.lo : '#56554a'], [1, RUIN.dk]]));
        B.cx.save(); B.cx.clip(new Path2D(B.poly(face)));
        const len = Math.hypot(ex, ey), hh = Math.max(hs[e], hs[(e + 1) % 4]);
        for (let y = 0; y < hh; y += 6.5) for (let t = (Math.round(y / 6.5) % 2) * 5; t < len; t += 10 + r() * 5) { const x0 = v0.x + ex * t / len, y0 = v0.y + ey * t / len - y - 3; if (r() < .3) continue; if (band && r() < .1) { B.f(B.ell(x0, y0, 3.6 + r() * 2, 2.2), RUIN.dk, .7); continue; } B.f(B.ell(x0, y0, (band ? 3.2 + r() * 4 : 4.4 + r() * 2.4), band ? 2 + r() * 1.3 : 2.5), r() < .4 ? RUIN.lo : r() < .8 ? RUIN.body : RUIN.hi, .75).f(B.rect(x0 - 4, y0 + 2.3, 8, .9), RUIN.dk, .35); }
        // (the old wall: rain streaks down its face from the broken top, and lichen in patches)
        if (band) for (let k = 0, nS = Math.round(len / 9); k < nS; k++) { const t = r(), x = v0.x + ex * t, yb = v0.y + ey * t, hT = Math.min(hs[e], hs[(e + 1) % 4]), l = hT * (.3 + r() * .6); B.s(`M${x} ${yb - hT + 1}l${(r() - .5) * 1.5} ${l}`, r() < .7 ? '#3e3d32' : '#c8c49c', 1.2 + r() * 1.6, .18 + r() * .14); if (r() < .3) B.f(B.blob(r, x + 2, yb - hT * r(), 3 + r() * 3, 1.6 + r(), 6, .5), r() < .5 ? '#b4b47a' : '#8e9c64', .5); }
        B.f(B.poly([v0, v1, { x: v1.x, y: v1.y - 7 }, { x: v0.x, y: v0.y - 7 }]), RUIN.moss, band ? .5 : .4);
        if (r() < .5) { const t = r(), x = v0.x + ex * t, yTop = v0.y + ey * t - Math.min(hs[e], hs[(e + 1) % 4]), d = 8 + r() * 16; B.f(`M${x - 6} ${yTop}Q${x - 8} ${yTop + d * .7} ${x} ${yTop + d}Q${x + 8} ${yTop + d * .6} ${x + 7} ${yTop}Z`, RUIN.ivy, .92); for (let k = 0; k < 5; k++) B.f(B.blob(r, x + (r() - .5) * 11, yTop + r() * d, 2.6, 2, 6, .5), r() < .5 ? RUIN.ivyHi : RUIN.ivy, .95); }
        B.cx.restore();
      }
      const top = foot.map((v, k) => up(v, k));
      if (!band) {
        B.f(B.poly(top), RUIN.body).f(B.poly(top), season === 'winter' ? '#f4f6f2' : RUIN.moss, season === 'winter' ? .9 : .55);
        if (season !== 'winter' && r() < .35) B.tufts(r, (top[0].x + top[2].x) / 2, (top[0].y + top[2].y) / 2 + 2, 10, 4, [RUIN.mossHi, '#8a9a58'], 6);
        continue;
      }
      // the old wall's broken top: its core shaded, then loose capstones along it with gaps between them, a stone gone here and
      // there, moss and grass only in clumps (a flat moss band all along read as the top of a raised road)
      B.f(B.poly(top), RUIN.body).f(B.poly(top), '#fff6dc', .1);   // (lit from above, the face below it in shade: the wall reads as standing up)
      const a0 = { x: (top[0].x + top[3].x) / 2, y: (top[0].y + top[3].y) / 2 }, a1 = { x: (top[1].x + top[2].x) / 2, y: (top[1].y + top[2].y) / 2 }, tl = Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1;
      for (let s = r() * 4; s < tl; s += 6 + r() * 5) { if (r() < .14) continue; const t = s / tl, x = a0.x + (a1.x - a0.x) * t, y = a0.y + (a1.y - a0.y) * t + (r() - .5) * 2, w = 3.2 + r() * 3.4, hgt = 1.8 + r() * 1.8;
        B.f(B.blob(r, x + .6, y + 1, w, hgt, 6, .3), RUIN.dk, .6).f(B.blob(r, x, y, w * .94, hgt * .9, 6, .3), r() < .6 ? RUIN.lo : RUIN.body).f(B.ell(x - w * .3, y - hgt * .35, w * .4, hgt * .3), '#c8c2a8', .25);
        if (season === 'winter') B.f(B.ell(x, y - hgt * .4, w * .8, hgt * .5), '#f4f6f2', .85); else if (r() < .22) B.f(B.blob(r, x + (r() - .5) * 3, y - hgt * .3, 2.4 + r() * 2.6, 1.3 + r(), 6, .5), r() < .5 ? RUIN.moss : RUIN.mossHi, .85); }
      if (season !== 'winter' && r() < .3) B.tufts(r, (a0.x + a1.x) / 2, (a0.y + a1.y) / 2 + 1, 8, 4, [RUIN.mossHi, '#8a9a58'], 5);
    }
    // tumbled stones and ferns at the foot (the old wall: its rubble in front of it, over its whole block)
    if (band) { for (const it of rubble) if (!it.behind) drawRubble(B, r, it, season); return; }
    // tumbled stones and ferns against the foot (layout round 3, critic 3: they lay up to half a cell out on the grass in front
    // of the wall, where the feet walked over them; now they lean on the foot, where the wall stops the feet)
    for (let i = 0; i < C2.length; i++) { const p = C2[i]; if (r() < .6) B.stone(r, p.x + (r() - .5) * 16, p.y + 1 + r() * 3, 4 + r() * 4, 2.6 + r() * 1.6, ST, RUIN.moss); if (r() < .45) fern(B, r, p.x + (r() - .5) * 18, p.y + 5, season); }
  }
  function fern(B, r, x, y, season) {
    const col = season === 'autumn' ? '#a8703a' : season === 'winter' ? '#8a6a4a' : '#4f7a3a', hi = season === 'autumn' ? '#c8904a' : '#7aa255';
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * .42, l = 9 + r() * 6, ex = x + Math.cos(a) * l * 1.4, ey = y + Math.sin(a) * l; B.s(`M${x} ${y}Q${(x + ex) / 2} ${ey - 3} ${ex} ${ey}`, k % 2 ? col : hi, 2.2, .9); }
  }
  // the old floor inside the footings: trodden earth and a few sunk flags in the grass, nettles at the walls' foot
  function foundationFloor(B, r, loop, P, season) {
    const kit = window.GardenPaintTerrainKit, path = new Path2D(B.poly(loop)); let cx = 0, cy = 0; for (const p of loop) { cx += p.x; cy += p.y; } cx /= loop.length; cy /= loop.length;
    B.cx.save(); B.cx.clip(path); B.cx.filter = 'blur(4px)'; B.f(path, '#8a8656', .2); B.cx.filter = 'none';   // (an old floor gone to trodden earth and grass, a little paler than the wood round it: a dark fill read as an empty pit; 19 Nov 2026, round 2)
    for (let k = 0; k < 14; k++) { const x = cx + (r() - .5) * 80, y = cy + (r() - .5) * 44; B.f(B.blob(r, x, y, 5 + r() * 9, 2 + r() * 3, 7, .5), r() < .5 ? '#7d8f4e' : '#9aa060', .4); }
    for (let k = 0; k < 9; k++) { const x = cx + (r() - .5) * 70, y = cy + (r() - .5) * 40; B.f(B.blob(r, x + 1, y + 1.5, 11 + r() * 6, 6 + r() * 3, 6, .2), '#4e4a40', .5).f(B.blob(r, x, y, 10 + r() * 6, 5.5 + r() * 3, 6, .2), r() < .5 ? '#9c9886' : '#8e8a78', .62); }
    B.cx.restore(); void kit;
  }
  function footings(B, r, C2, toward, P, season) {
    // the ring, opened for a doorway on the side nearest the court
    let gi = 0, gd = 1e9; for (let i = 0; i < C2.length; i++) { const d = Math.hypot(C2[i].x - toward.x, C2[i].y - toward.y); if (d < gd) { gd = d; gi = i; } }
    const n = C2.length, run = []; for (let k = 1; k < n; k++) run.push(C2[(gi + k) % n]);
    const pts = window.GardenPaintTerrainKit.resample(run, 10), H = []; let h = 14 + r() * 6;
    for (let i = 0; i < pts.length; i++) { h += (r() - .5) * 7; if (r() < .12) h = 6 + r() * 4; h = Math.max(5, Math.min(22, h)); H.push(h); }
    for (let i = 1; i < H.length - 1; i++) H[i] = (H[i - 1] + H[i] * 2 + H[i + 1]) / 4; H[0] = Math.min(H[0], 8); H[H.length - 1] = Math.min(H[H.length - 1], 8);
    // the hearth: a broad flat stone near the back of the room, a sooted middle, a fallen stone beside it
    let mx = 0, my = 0; for (const p of C2) { mx += p.x; my += p.y; } mx /= n; my /= n; my -= 6;
    B.shadow(mx + 4, my + 3, 22, 7, .3); B.f(B.blob(r, mx, my, 20, 8, 8, .2), RUIN.lo).f(B.blob(r, mx - 2, my - 1.5, 18, 6.5, 8, .2), RUIN.body).f(B.ell(mx + 1, my, 9, 3.2), '#3a352c', .55).f(B.ell(mx - 6, my - 3, 6, 1.6), RUIN.hi, .5);
    B.stone(r, mx + 26, my + 6, 7, 4, { rock: RUIN.body, rockLo: RUIN.lo, rockHi: RUIN.hi, rockDk: RUIN.dk }, RUIN.moss);
    for (let k = 0; k < 5; k++) nettle(B, r, mx + (r() - .5) * 60, my + 8 + r() * 14, season);
    ruinWall(B, r, pts, H, P, season);
    // the doorway's two jambs a little higher, a worn threshold stone between them
    const a = run[run.length - 1], b = run[0]; B.stone(r, (a.x + b.x) / 2, (a.y + b.y) / 2 + 2, 9, 3.4, { rock: RUIN.body, rockLo: RUIN.lo, rockHi: RUIN.hi, rockDk: RUIN.dk }, null);
  }
  function nettle(B, r, x, y, season) {
    if (season === 'winter') return; const col = season === 'autumn' ? '#6e6a36' : '#3f6430', hi = season === 'autumn' ? '#8e8444' : '#5d8640';
    for (let k = 0; k < 4; k++) { const sx = x + (k - 1.5) * 3 + (r() - .5) * 2, hh = 9 + r() * 7; B.s(`M${sx} ${y}l${(r() - .5) * 2} ${-hh}`, col, 1.3, .9); for (let j = 1; j < 4; j++) B.f(B.ell(sx + (j % 2 ? 2.4 : -2.4), y - hh * j / 4, 2.4, 1.3), j % 2 ? hi : col, .9); }
  }
  function foundation(B, r, loop, P, season) {
    const kit = window.GardenPaintTerrainKit, pts = kit.resample(loop.concat([loop[0]]), 6);
    B.f(B.poly(loop), P.lawnLo, .35);
    for (let i = 0; i < pts.length; i++) { if (Math.sin(i * .37) > .78) continue; const p = pts[i]; B.stone(r, p.x + (r() - .5) * 3, p.y + (r() - .5) * 2, 4.6 + r() * 2.6, 3 + r() * 1.2, { rock: RUIN.body, rockLo: RUIN.lo, rockHi: RUIN.hi, rockDk: RUIN.dk }, r() < .5 ? RUIN.moss : null); if (r() < .1) fern(B, r, p.x, p.y + 2, season); }
  }

  // (layout fix, west) old flags lying in trodden earth (the ruin court, the postern yard): laid one by one, close in the
  // middle and fewer toward the edge, where grass has taken them, so the paving thins out into the paths and the grass
  // round it. A sheet of flags cut to the yard's outline over a lawn-coloured fill read as a round stone disc stamped on
  // the junction, half on the path and half on the grass.
  function brokenFlags(B, r, shape, bb, season) {
    const pts = shape.map(p => Array.isArray(p) ? p : [p.x, p.y]), n = pts.length;
    const inside = (x, y) => { let c = false; for (let i = 0, j = n - 1; i < n; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi || 1e-9) + xi) c = !c; } return c; };
    const tones = season === 'winter' ? ['#c4c2b4', '#b0ae9e', '#d4d2c6'] : ['#bdb8a4', '#a9a490', '#cbc6b2', '#b3ae98'], moss = season === 'winter' ? '#e4e8e6' : season === 'autumn' ? '#8a8a46' : '#6f8a42';
    for (let y = bb[1] + 4, row = 0; y < bb[3]; y += 11, row++) for (let x = bb[0] + (row % 2) * 12; x < bb[2]; x += 23 + r() * 4) {
      const fx = x + r() * 3, fy = y + r() * 1.6; if (!inside(fx, fy)) continue;
      let depth = 0; for (const d of [12, 24, 36]) if (inside(fx + d, fy) && inside(fx - d, fy) && inside(fx, fy + d * .62) && inside(fx, fy - d * .62)) depth++;
      if (r() > [.3, .62, .88, .97][depth]) continue;   // the edge: mostly gone to grass
      const w = 9.5 + r() * 3.5, h = 4.2 + r() * 1.2, tilt = (r() - .5) * .8;
      B.f(B.ell(fx + 1, fy + 1.4, w, h), '#3a3a2a', .22);
      B.f(`M${fx - w} ${fy + tilt}L${fx - w + 2} ${fy - h}L${fx + w - 1} ${fy - h - tilt}L${fx + w} ${fy + h * .4}L${fx + w - 2} ${fy + h}L${fx - w + 1} ${fy + h - .4}Z`, tones[Math.floor(r() * tones.length)]);
      B.f(`M${fx - w + 2.5} ${fy - h + 1}L${fx + w - 2} ${fy - h + .6}L${fx + w - 3} ${fy - h + 2.2}L${fx - w + 2.5} ${fy - h + 2.6}Z`, '#e0dccb', .55);
      if (r() < .18) B.s(`M${fx - w * .3} ${fy - h + 1}l${w * .5} ${h * 1.4}`, '#6a6656', .7, .6);   // a crack
      if (r() < .45 || depth < 2) B.f(B.blob(r, fx + (r() - .5) * w, fy + h * .7, 3 + r() * 4, 1.2 + r() * .8, 6, .5), moss, .7);   // moss creeping in the joints
    }
    for (let k = 0; k < 16; k++) { const x = bb[0] + r() * (bb[2] - bb[0]), y = bb[1] + r() * (bb[3] - bb[1]); if (!inside(x, y)) continue; B.s(`M${x} ${y}q${(r() - .5) * 3} -3 ${(r() - .5) * 4} ${-4 - r() * 3}`, season === 'winter' ? '#b8b4a0' : '#6f8a42', 1.1, .85); }
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
      const shape = Array.isArray(pz.shape) && pz.shape.length > 2 ? V.shapeLoop(L, pz.shape) : V.capsule(kit.rng(seed), a, b, w / 2 * cw * .95 + 8, w / 2 * ch * 1.05 + 4, style === 'broken' || style === 'litter' ? .3 : pz.id === 'cider-square' ? .24 : .08), bb = kit.bboxOf(shape, 40), soft = style === 'litter' || style === 'earth';
      add(bb, seed, (B, r) => {
        // (round 3, the valley chain: a working yard by a river meets it in one smooth quay line, its edge stones laid as a coping;
        //  the water's cell outline made a stepped, jagged edge along the mill race. Other plazas keep the outline as it was.)
        const smooth = style === 'yard', chaikin = pts => { let p = pts; for (let k = 0; k < 3; k++) { const q = []; for (let i = 0; i < p.length; i++) { const u = p[i], v = p[(i + 1) % p.length]; q.push({ x: u.x * .75 + v.x * .25, y: u.y * .75 + v.y * .25 }, { x: u.x * .25 + v.x * .75, y: u.y * .25 + v.y * .75 }); } p = q; } return p; };
        const loops = (L.D.freshwater || []).filter(w => w.boundary).map(w => { const pts = w.boundary.map(L.pt); return smooth ? chaikin(pts) : pts; });
        const path = new Path2D(B.poly(shape)), dry = new Path2D(); dry.rect(bb[0] - 10, bb[1] - 10, bb[2] - bb[0] + 20, bb[3] - bb[1] + 20); for (const lp of loops) dry.addPath(V.loopPath([lp]));
        B.cx.clip(dry, 'evenodd');
        const kitYard = window.GardenPaintGround && (style === 'setts' || style === 'yard') ? GardenPaintGround.paths({ areas: [{ kind: 'setts', points: shape }], season: C.season, kindAt: () => 'meadow', box: { x: bb[0], y: bb[1], w: bb[2] - bb[0], h: bb[3] - bb[1] } }) : null;
        if (kitYard) for (const o of kitYard) { B.cx.save(); o.draw(B, r, bb); B.cx.restore(); B.cx.globalAlpha = 1; }
        else if (style !== 'litter' && style !== 'broken') { B.cx.filter = 'blur(3px)'; B.f(path, '#2e3420', .2); B.cx.filter = 'none'; }
        // (round 3) a clearing or yard in the wood is trodden earth that thins into the grass at its edge: laid soft, in two
        // blurred washes to its outline, not cut to it (a hard pale shape on the lawn)
        if (soft) {
          const tone = C.season === 'winter' ? ['#9a9a84', '#b0ae98'] : style === 'earth' ? ['#8a7650', '#a08a5e'] : ['#7e7a48', '#9a8a56'];
          B.cx.filter = 'blur(9px)'; B.f(path, tone[0], .5); B.cx.filter = 'blur(4px)'; B.cx.save(); B.cx.translate(0, 0); B.f(path, tone[1], .42); B.cx.restore(); B.cx.filter = 'none';
          for (let k = 0; k < 14; k++) { const x = bb[0] + 30 + r() * (bb[2] - bb[0] - 60), y = bb[1] + 30 + r() * (bb[3] - bb[1] - 60); if (B.cx.isPointInPath(path, x, y)) B.f(B.blob(r, x, y, 10 + r() * 18, 4 + r() * 6, 7, .5), r() < .5 ? '#6f8a42' : tone[0], .22); }   // grass coming back in patches, darker trodden hollows
        }
        B.cx.save(); B.cx.clip(path);
        if (style === 'setts') { if (!kitYard) V.setts(B, r, P, bb, { size: 11, salt: seed, grout: '#a8987a', cols: ['#c9b994', '#c2b28c', '#d2c5a2', '#bcac86'] }); for (let k = 0; k < 18; k++) B.f(B.blob(r, bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 14 + r() * 20, 4 + r() * 5, 7, .5), r() < .5 ? '#e0d4b2' : '#9c8c68', .25);
          if (pz.id === 'cider-square') { const bw = bb[2] - bb[0], bh = bb[3] - bb[1];
            // trodden darker in a ring round the press and the barrels, fallen apples and pomace by the press, moss in the joints
            for (let k = 0; k < 30; k++) B.f(B.blob(r, bb[0] + r() * bw, bb[1] + r() * bh, 2.4 + r() * 4, 1 + r(), 5, .5), r() < .6 ? '#7d8a44' : '#96a052', .5);
            if (C.season === 'autumn' || C.season === 'summer') for (let k = 0; k < 14; k++) B.f(B.circ(b.x - 20 + (r() - .5) * 40, b.y + (r() - .5) * 22, 1.5 + r() * .6), ['#b8402a', '#d8a030', '#8aa040'][Math.floor(r() * 3)], .9); } }
        else if (style === 'yard') {   // warm, worn and busy: honey setts like the plaza's, cart ruts, flour by the door, straw, moss in the joints
          const bw = bb[2] - bb[0], bh = bb[3] - bb[1], rx = () => bb[0] + r() * bw, ry = () => bb[1] + r() * bh;
          if (!kitYard) V.setts(B, r, P, bb, { size: 11, salt: seed, grout: '#9a8460', cols: ['#d2b88c', '#c6aa7e', '#dcc69e', '#bfa178', '#cfae84', '#c9b48e'] });
          for (let k = 0; k < 16; k++) B.f(B.blob(r, rx(), ry(), 16 + r() * 24, 5 + r() * 7, 7, .5), r() < .55 ? '#e6d2a6' : '#a08458', .24);   // sun and wear in broad patches
          for (let k = 0; k < 26; k++) B.f(B.blob(r, rx(), ry(), 3 + r() * 5, 1.2 + r(), 5, .5), r() < .6 ? '#7d8a44' : '#96a052', .5);   // moss and weeds in the joints
          // cart ruts: worn hollows in the setts, darker in broken lengths and polished in places, that fade out at both ends
          // (two long even brown lines read as rails laid across the yard; 19 Nov 2026)
          for (const o of [-9, 9]) { const pts = [{ x: a.x - 50, y: a.y + o + 7 }, { x: (a.x + b.x) / 2, y: a.y + o + 2 }, { x: b.x + 50, y: b.y + o - 8 }], run = V.walk(pts, 3);
            for (let i = 1; i < run.length; i++) { const t = i / run.length, e = Math.min(1, Math.min(t, 1 - t) * 5), n = kit.noise(run[i].x / 26, o, 233); if (n < .38) continue; const p = run[i - 1], q = run[i]; B.s(`M${p.x} ${p.y}L${q.x} ${q.y}`, '#7a5c3c', 3.4 + n * 2, .16 * e * n); if (n > .62) B.s(`M${p.x} ${p.y - 1}L${q.x} ${q.y - 1}`, '#f0e2bc', .9, .22 * e); } }
          // (round 3, critic fix: flour blown right across the court read as white smears on the setts: a dusting on the step, only at the door)
          { const mill = L.stat('ld-mill'), dx = mill && mill.door ? L.cpt(mill.door.x + .5, mill.door.y + .15) : null; if (dx) for (let k = 0; k < 6; k++) B.f(B.ell(dx.x + (r() - .5) * 34, dx.y + r() * 9, 3 + r() * 4, 1.2 + r() * 1.2), '#f4ead0', .55); }
          for (let k = 0; k < 70; k++) { const x = rx(), y = ry(); B.s(`M${x} ${y}l${(r() - .5) * 9} ${(r() - .5) * 3}`, r() < .7 ? '#e2bc5a' : '#c89a3c', 1.1, .8); }   // spilt straw
          for (let k = 0; k < 18; k++) B.f(B.ell(rx(), ry(), 1.8 + r() * 1.4, 1.1 + r() * .6), ['#b0682a', '#d38f3a', '#8a5a2c', '#7d8f4e'][Math.floor(r() * 4)], .75);   // a few blown leaves
          // the coping along the race: dressed edge stones, lit on top, a wet dark lip where they meet the water, moss in the joints
          for (const lp of loops) { if (!lp.some(q => q.x > bb[0] - 20 && q.x < bb[2] + 20 && q.y > bb[1] - 20 && q.y < bb[3] + 20)) continue; const lpPath = new Path2D(V.loopPath([lp]));
            B.cx.save(); B.cx.lineJoin = 'round'; B.cx.globalAlpha = .6; B.cx.strokeStyle = '#2e3a36'; B.cx.lineWidth = 15; B.cx.stroke(lpPath); B.cx.strokeStyle = '#a8a088'; B.cx.lineWidth = 12; B.cx.stroke(lpPath); B.cx.strokeStyle = '#cfc6aa'; B.cx.lineWidth = 7; B.cx.globalAlpha = .8; B.cx.stroke(lpPath);
            B.cx.restore();
            // (fix round 2: the joints were one dash pattern, a row of identical round stones. Each stone is now its own length, a
            //  little proud or sunk, its own tone, lit on its top edge, with a dark joint and now and then moss or a chipped corner)
            const inB = q => q.x > bb[0] - 12 && q.x < bb[2] + 12 && q.y > bb[1] - 12 && q.y < bb[3] + 12, cum = [0]; let k0 = lp.findIndex(q => !inB(q)); if (k0 < 0) k0 = 0;
            const line = []; for (let i = 1; i <= lp.length; i++) { const q = lp[(k0 + i) % lp.length]; if (inB(q)) line.push(q); else if (line.length) break; }
            for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
            const at = d => { let i = 1; while (i < line.length - 1 && cum[i] < d) i++; const a = line[i - 1], b = line[i], u = Math.max(0, Math.min(1, (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1))); return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
            const LL = cum[cum.length - 1] || 0; let t = 0;
            while (line.length > 1 && t < LL) { const len = 7 + r() * 9, t1 = Math.min(LL, t + len), c = at((t + t1) / 2), hl = (t1 - t) / 2 - .8, wd = 4.6 + r() * 1.4, tone = ['#b8b098', '#a8a08a', '#c6bea6', '#9a9480', '#b0a890'][Math.floor(r() * 5)];
              if (hl > 1) { B.cx.save(); B.cx.translate(c.x, c.y); B.cx.rotate(c.ang); B.f(B.rr(-hl, -wd + .8, hl * 2, wd * 2, 1.6), '#4a463a', .55).f(B.rr(-hl, -wd, hl * 2, wd * 2 - .6, 1.8), tone).f(B.rr(-hl + .6, -wd, hl * 2 - 1.2, 1.6, .8), '#ddd4bc', .55);
                if (r() < .22) B.f(B.ell(-hl + 1.5 + r() * hl, wd - 1.2, 2.4, 1), '#6f8446', .6); if (r() < .15) B.f(B.poly([[hl - 2.5, -wd], [hl, -wd], [hl, -wd + 2.5]]), '#7a7462', .8); B.cx.restore(); }
              t = t1 + .9; } }
          for (let k = 0; k < 3; k++) { const x = rx(), y = ry(); B.f(B.blob(r, x, y, 12 + r() * 10, 4 + r() * 2, 8, .4), '#7e6a4a', .35).f(B.blob(r, x - 2, y - 1, 8 + r() * 6, 2.4, 8, .4), '#b6cbd0', .5); }   // rain puddles in the low setts
        }
        // the ruin court: old flags, worn and broken. Each stone's corners are shared with its neighbours and pulled well out of
        // line, so the stones fit like crazy paving with a mossy joint between, never in courses (courses read as a brick wall
        // laid flat); towards the edge more are sunk or gone to turf; then moss and grass grown in over them in drifts
        else if (style === 'broken' && window.GardenPaintGround) {
          const mx = (bb[0] + bb[2]) / 2, my = (bb[1] + bb[3]) / 2, rx = (bb[2] - bb[0]) / 2, ry = (bb[3] - bb[1]) / 2;
          const hh = (i, j, k) => { let n = Math.imul(i * 374761393 + j * 668265263 + k * 1442695041 + seed, 1) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
          const SW = 31, SH = 19, ni = Math.ceil((bb[2] - bb[0]) / SW) + 1, nj = Math.ceil((bb[3] - bb[1]) / SH) + 1;
          const corner = (i, j) => ({ x: bb[0] - SW * .5 + i * SW + (hh(i, j, 1) - .5) * SW * .62, y: bb[1] - SH * .5 + j * SH + (hh(i, j, 2) - .5) * SH * .62 });
          const STONE = ['#a9a391', '#9b9680', '#b5af9b', '#908b77', '#a59f88', '#aca58c'];
          // (no fill under the stones: the joints and the gaps are the wood's own turf, so the court has no outline of its own)
          for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
            const q = [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)], cxs = (q[0].x + q[1].x + q[2].x + q[3].x) / 4, cys = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;
            const e = Math.min(1, Math.hypot((cxs - mx) / rx, (cys - my) / ry)); if (hh(i, j, 3) < .06 + e * e * .4) continue;   // gone to turf
            const s = q.map(p => ({ x: cxs + (p.x - cxs) * .95, y: cys + (p.y - cys) * .92 }));   // the joint, a thin one
            // a flag with its corners worn round, not an oval (rounded through its edge midpoints the stones read as pebbles)
            const P2 = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); let d = '';
            for (let k = 0; k < 4; k++) { const a = s[k], b = s[(k + 1) % 4], c2 = s[(k + 2) % 4], p0 = P2(a, b, .2), p1 = P2(a, b, .8), p2 = P2(b, c2, .2); d += (k ? 'L' : 'M') + p0.x.toFixed(1) + ' ' + p0.y.toFixed(1) + 'L' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1) + 'Q' + b.x.toFixed(1) + ' ' + b.y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1); }
            d += 'Z';
            const tone = STONE[Math.floor(hh(i, j, 4) * STONE.length)], sunk = hh(i, j, 5) < .15 + e * .25;
            B.f(d, '#3e4232', .4); B.cx.save(); B.cx.translate(-.4, -.8); B.f(d, sunk ? C.kit.mix(tone, '#7a7864', .35) : tone);
            B.cx.save(); B.cx.clip(new Path2D(d)); B.f(B.ell(cxs - 4, cys - 3, SW * .42, SH * .3), '#ddd6c2', .22); B.cx.restore(); B.cx.restore();   // its lit upper-left face, inside the stone (an edge line read as a white outline)
            if (hh(i, j, 6) < .3) B.f(B.blob(r, cxs + (hh(i, j, 7) - .5) * 12, cys + (hh(i, j, 8) - .5) * 6, 3 + hh(i, j, 9) * 5, 1.4 + hh(i, j, 10) * 2, 6, .5), '#8a8a74', .35);   // wear and lichen
          }
          for (let k = 0; k < 70; k++) { const x = bb[0] + r() * (bb[2] - bb[0]), y = bb[1] + r() * (bb[3] - bb[1]), e = Math.min(1, Math.hypot((x - mx) / rx, (y - my) / ry)); if (r() > .25 + e * .9) continue; B.f(B.blob(r, x, y, 6 + r() * 18 * (.5 + e), 2.5 + r() * 5, 8, .55), r() < .55 ? '#667c40' : r() < .7 ? '#8a9a56' : '#4e6634', .3 + e * .4); }
          for (let k = 0; k < 40; k++) B.f(B.blob(r, bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 2 + r() * 4, 1 + r() * 1.4, 5, .6), '#7d9248', .6);
          if (C.season !== 'winter') for (let k = 0; k < 10; k++) B.tufts(r, bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 8, 3, ['#7d9248', '#a0b060'], 5);
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
          // (19 Nov 2026, round 3 fixes: no fill of its own, so no straight-edged lighter shape on the floor; the oak's litter lies
          //  in drifts round its foot, thick near the bole and thinning out to nothing well before the clearing's edge, each
          //  leaf turned and lit, not an even scatter of dots)
          const leaf = C.season === 'autumn' ? ['#b0682a', '#d38f3a', '#8a5a2c', '#e0b050'] : C.season === 'winter' ? ['#8a7a5a', '#a0906a', '#6e6450'] : ['#6f7f44', '#5e6e38', '#86924e', '#7a6c42'];
          const oo = oakAt(L, pz), lx = oo.x + 20, ly = oo.y + 30, lrx = (bb[2] - bb[0]) * .42, lry = (bb[3] - bb[1]) * .4, nz = window.GardenPaintTerrainKit && GardenPaintTerrainKit.noise;
          for (let k = 0; k < (bb[2] - bb[0]) * (bb[3] - bb[1]) / 140; k++) {
            const x = lx + (r() - .5) * lrx * 2.2, y = ly + (r() - .5) * lry * 2.2, e = Math.hypot((x - lx) / lrx, (y - ly) / lry); if (e > 1) continue;
            const dr = nz ? nz(x / 46, y / 30, 3) : .6; if (r() > (1 - e) * (1 - e) * 1.6 * (.3 + dr)) continue;
            const a = r() * Math.PI, s = 1.3 + r() * 1.8, c = leaf[Math.floor(r() * leaf.length)];
            B.cx.save(); B.cx.translate(x, y); B.cx.rotate(a); B.f(B.ell(0, 0, s * 1.5, s * .7), c, .55 + (1 - e) * .3).f(B.ell(-s * .3, -s * .2, s * .7, s * .3), '#c8c08a', .25); B.cx.restore();
          }
          // (the kit's Great Oak flares into its own roots: the long thin strokes run out over the litter read as a spider's legs)
          const o = oakAt(L, pz); if (!window.GardenPaintTrees) for (let k = 0; k < 7; k++) { const ang = Math.PI * (.05 + k / 6 * .9), l = 60 + r() * 70; B.s(`M${o.x + Math.cos(ang) * 14} ${o.y}Q${o.x + Math.cos(ang) * l * .5} ${o.y + Math.sin(ang) * l * .25 + 6} ${o.x + Math.cos(ang) * l} ${o.y + Math.sin(ang) * l * .45}`, '#5a4632', 5 - k % 3, .55); }
        }
        B.cx.restore();
        if (!kitYard && (style === 'setts' || style === 'flags' || style === 'yard')) B.s(path, P.kerb, 3, .8);
        // the orchard grass grows in over the square's edge in tufts and turf lips, so the setts end in the lawn, not on a line
        if (pz.id === 'cider-square' && C.season !== 'winter') { const ring = V.walk(shape.concat([shape[0]]), 5);
          for (let i = 0; i < ring.length; i++) { const p = ring[i], n = kit.noise(i * .3, 2, 241); if (n < .3) continue; B.f(B.blob(r, p.x + (r() - .5) * 4, p.y + (r() - .5) * 3, 4 + n * 7, 2 + n * 2, 7, .5), n > .6 ? (P.lawn || '#7d9a48') : (P.lawnLo || '#5a7a3a'), .75); if (r() < .6) B.tufts(r, p.x, p.y + 1, 9, 4, [P.lawnLo || '#5a7a3a', P.lawnHi || '#a8c070'], 6); } }
      });
      // dressing by job: the cider square's press, bell and lanterns; the mill yard's millstone and sacks; the court's fallen column
      const spot = (x, y) => L.free(x, y) && ['grass', 'path'].includes(L.kind(x, y));
      const put = (cands, key, box, draw, foot, ok) => { for (const [x, y] of cands) if ((ok || spot)(x, y)) { const p = L.cpt(x, y); thing({ key, box, x: p.x, y: p.y, draw, foot }); return; } };   // foot: [left, right, depth] px the feet cannot enter (GardenPaintVale.feet)
      if (pz.id === 'cider-square') { if (!L.stat('ld-press')) put([[80.2, 36.4], [79.6, 35.4], [75.4, 37.6]], 'press', [-26, -50, 28, 6], drawPress(P), [-21, 23, 10]); if (!L.stat('ld-bell')) put([[79.6, 38.3], [80.4, 38.6]], 'bell', [-14, -64, 16, 5], drawBell(P), [-6, 7, 6]); /* (round 3 layouts: the hand-authored orchard has its own press and bell, ld-press and ld-bell) */ put([[77.1, 36.3], [76.3, 38.75]], 'baskets',   /* (High orchard fix round 2: by the lamp at the square's back edge, where the barrels are) */ [-24, -18, 26, 5], drawBaskets(P, C.season), [-18, 20, 8]); }
      if (pz.id === 'mill-yard') {
        // (round 3: the millstone stood alone in the middle of the yard. It leans on the mill's front wall now, past the door, and
        //  the sacks wait by the door: both from the mill's own layout row, the old spots kept only if the wall's foot is taken)
        const mill = (L.D.static || []).find(q => /mill/.test(String(q.id || '')) && Math.hypot(q.x + (q.w || 1) / 2 - pz.x, q.y - pz.y) < 6), wf = mill ? mill.y + (mill.h || 1) + .14 : 0, door = mill && mill.door;
        const atWall = mill ? [[mill.x + (mill.w || 1) - .3, wf], [mill.x + (mill.w || 1) + .1, wf]] : [], byDoor = door ? [[door.x - .08, wf + .5], [door.x + 1.4, wf + .04]] : [];   // (fix round 2: beside the door, a stride out from the wall, clear of the wheel and its pit; they stood over the pit)
        // (the mill's front is its yard's apron, held for its door: these stand on it, against the wall, never on the door's own cell)
        const apron = (x, y) => { const b = typeof gardenIslandBaseCell === 'function' ? gardenIslandBaseCell(Math.floor(x), Math.floor(y)) : null; return !!(b && b.land && !b.freshwater && !b.solid && !(door && Math.floor(x) === door.x && Math.floor(y) === door.y)) || spot(x, y); };
        put([...atWall, [76.6, 64.6], [77.2, 65.2]], 'millstone', [-22, -40, 24, 6], drawMillstone(P), [-12, 11, 8], apron); put([...byDoor, [77.3, 66.9], [73.6, 67.4]], 'sacks', [-22, -24, 24, 5], drawSacks(P), [-18, 20, 8], apron);
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
      // The Great Oak, painted by the shared tree kit at the size standard (at least 8 H): its crown in lit leaf masses far wider
      // than it is tall, a vast bole flaring into roots, its shadow thrown along the one light by the shared shadow layer. Its
      // foot stands where it always stood (the walking code's trunk box, 94-garden-world-0walk.js, reads the same place).
      if (style === 'litter' && window.GardenPaintTrees && typeof gardenSizePx === 'function') {
        const o = oakAt(L, pz), HG = Math.round(gardenSizePx('greatOak', 1)), F = GardenPaintTrees.form('greatoak'), half = Math.ceil(HG * Math.max(F.rx * 1.35, .3) + 8), up = Math.ceil(HG * (F.cy + F.ry * 1.25) + 8);
        // (shade: false: the woods' floor throws its shadow, the kit tree's own crown shade laid along the light and long at dusk;
        //  the shared layer's squashed silhouette of a tree this size lay as a flat band with a straight top edge; 19 Nov 2026)
        thing({ key: 'great-oak-kit|' + C.season, x: o.x, y: o.y, box: [-half, -up, half, 14], shade: window.GardenPaintWood && GardenPaintWood.shadesOak ? false : undefined, crown: { x: 0, y: -HG * F.cy, rx: HG * F.rx, ry: HG * F.ry }, farShrink: .6, K: .9, draw: B => {
          const m = B.cx.getTransform(), sc = Math.max(1, Math.min(3, Math.hypot(m.a, m.b))), t = GardenPaintTrees.canvas({ species: 'greatoak', season: C.season, v: 1, h: HG, K: sc, seed: 4409 }); if (!t) return;
          B.cx.drawImage(t.c, -t.ox / t.k, -t.oy / t.k, t.c.width / t.k, t.c.height / t.k);
        } });
      } else if (style === 'litter') { const o = oakAt(L, pz), S = OAK_SCALE; thing({ key: 'great-oak-5|' + C.season, x: o.x, y: o.y, box: [-250 * S, -360 * S, 250 * S, 40 * S].map(Math.round), crown: { x: 0, y: -230 * S, rx: 250 * S, ry: 145 * S }, farShrink: .6, K: .9, draw: B => { B.cx.save(); B.cx.scale(S, S); greatOak(B, kit.rng(seed + 9), P, C.season); B.cx.restore(); } }); }
    }
  }
  const drawPress = P => B => { B.shadow(4, 2, 24, 5, .3); B.f(B.rr(-18, -16, 36, 16, 3), P.wood).f(B.rect(-18, -16, 36, 3), P.woodHi, .7); for (const x of [-14, 12]) B.post(x, -46, -14, 5, [P.wood, P.woodLo, P.woodHi]); B.f(B.rect(-18, -50, 36, 6), P.woodLo).s('M0 -44V-20', P.iron, 3).s('M-10 -30H10', P.iron, 2.2).f(B.ell(0, -18, 12, 3), '#c8a04a', .8); };
  const drawBell = P => B => { B.shadow(2, 1, 8, 2.4, .3); B.post(0, -58, 0, 4, [P.wood, P.woodLo, P.woodHi]); B.s('M0 -56H10', P.woodLo, 2.6); B.f('M4 -54Q4 -46 2 -42H18Q16 -46 16 -54Q10 -58 4 -54Z', '#b08a3a').f('M5 -53Q5 -47 3 -43H8Q7 -48 8 -54Z', '#e0c070', .7).f(B.circ(10, -41, 1.6), '#5a4a2a'); };
  const drawBaskets = (P, season) => B => { B.shadow(2, 1, 22, 4, .3); for (const x of [-12, 10]) { B.f(`M${x - 10} -12L${x + 10} -12L${x + 8} 0L${x - 8} 0Z`, '#a8844e').s(`M${x - 9} -8H${x + 9}M${x - 8.5} -4H${x + 8.5}`, '#7a5e34', .8, .8); for (let k = 0; k < 5; k++) B.f(B.circ(x - 7 + k * 3.5, -13 - (k % 2) * 1.6, 2.6), season === 'autumn' ? (k % 2 ? '#c8402e' : '#e0b23a') : '#9cbc4a'); } };
  // (a stone wheel 24 px across standing on its edge: its foot in the mill yard is that wide, [-12, 11, 8]; at [-18, 20] it
  // stopped the feet 0.3 of a cell past the wheel on open cobbles, the collision audit, 19 Nov 2026)
  const drawMillstone = P => B => { B.shadow(6, 2, 20, 5, .3); B.f(B.ell(4, -24, 13, 15), '#2a2620', .22); B.f(B.blob(kit0(), 10, -1, 5, 2.4, 6, .3), '#7a7466'); B.f(B.ell(0, -18, 12, 18), '#8e8a7c').f(B.ell(-2, -19, 11, 17), '#b4ae9c').f(B.ell(-2, -19, 3.4, 5), '#5e5a4e'); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.s(`M${-2 + Math.cos(a) * 4} ${-19 + Math.sin(a) * 6}L${-2 + Math.cos(a + .3) * 10} ${-19 + Math.sin(a + .3) * 15}`, '#7a7668', 1, .7); } B.f(B.ell(-4, -3, 9, 2.6), '#6f8446', .55).f(B.ell(-11, -8, 2.4, 4), '#6f8446', .45); };
  const kit0 = () => { let a = 7919; return () => (a = (a * 16807) % 2147483647) / 2147483647; };
  // (sacks of hessian: a body shaded round to the lower right, lit on the upper left, a tied neck with its ears, a seam
  // and a dusting of flour; they were flat cream shapes; 19 Nov 2026)
  const drawSacks = P => B => { B.shadow(2, 1, 22, 5, .3); for (const [x, y, s] of [[-10, 0, 1], [9, 0, .95], [0, -11, .9]]) {
    const body = `M${x - 9 * s} ${y}Q${x - 11 * s} ${y - 12 * s} ${x - 5 * s} ${y - 16 * s}L${x + 5 * s} ${y - 16 * s}Q${x + 11 * s} ${y - 12 * s} ${x + 9 * s} ${y}Z`;
    B.f(body, B.lin(x - 9 * s, y - 16 * s, x + 9 * s, y, [[0, '#e2d4ae'], [.55, '#c8b48a'], [1, '#9a8660']])).s(body, '#7a6a4a', .8, .55)
     .f(`M${x - 8 * s} ${y - 1}Q${x - 10 * s} ${y - 11 * s} ${x - 5 * s} ${y - 15 * s}L${x - 2 * s} ${y - 15 * s}Q${x - 6 * s} ${y - 10 * s} ${x - 4 * s} ${y - 1}Z`, '#f4ead0', .55)
     .f(`M${x - 2 * s} ${y - 16 * s}L${x - 4.5 * s} ${y - 19.5 * s}L${x - .5 * s} ${y - 17.5 * s}L${x + 1.5 * s} ${y - 19.8 * s}L${x + 2.5 * s} ${y - 16 * s}Z`, '#b8a47c').s(`M${x - 4 * s} ${y - 16 * s}l${8 * s} 0`, '#6a5434', 1.4)
     .s(`M${x + 1 * s} ${y - 14 * s}Q${x + 3 * s} ${y - 7 * s} ${x + 2 * s} ${y - 1}`, '#8a7650', .6, .5).f(B.ell(x - 3 * s, y - 4 * s, 4 * s, 1.6 * s), '#fbf6e8', .3); } };
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

  /* ---------- Hollin's woodpile by the ruins lane (woodland.md 17: stacked logs, a sawhorse, a kettle on a fire) ----------
   * Where: the first stretch of open grass beside the lane that runs from the Great Oak to the Ruined arch, a third to half
   * of the way along it, on whichever side is free (never on a path, a plot, a static or land for sale). The woods' planting
   * keeps its trees off the same spot (GardenPaintWood reads woodpileSpot). In cells; null if the layout has no such lane. */
  function woodpileSpot(data) {
    const rt = (data.routes || []).find(r => r.id === 'ruins-lane'); if (!rt || !rt.points || rt.points.length < 2 || typeof gardenIslandBaseCell !== 'function') return null;
    if (pileCache.has(data)) return pileCache.get(data);
    const pts = rt.points, cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const len = cum[cum.length - 1], at = s => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const a = pts[i - 1], b = pts[i], t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / ((cum[i] - cum[i - 1]) || 1), ty: (b[1] - a[1]) / ((cum[i] - cum[i - 1]) || 1) }; };
    const ok = (x, y) => { const c = gardenIslandBaseCell(Math.floor(x), Math.floor(y)), row = typeof gardenLandCell === 'function' ? gardenLandCell(Math.floor(x), Math.floor(y)) : null; return !!(c && c.land && !c.freshwater && !c.beach && !c.route && !c.solid && !c.reserved && !c.staticId && !(row && (row.plot || /^l[sct]-/.test(row.id || '')))) && !(data.static || []).some(p => x > p.x - 1 && x < p.x + (p.w || 1) + 1 && y > p.y - 1 && y < p.y + (p.h || 1) + 1); };
    let best = null;
    for (let s = len * .33; s <= len * .55 && !best; s += .25) { const p = at(s); for (const side of [1, -1]) { const nx = -p.ty * side, ny = p.tx * side, x = p.x + nx * 2.4, y = p.y + ny * 2.4; if ([[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [1.6, 0], [-1.6, 0]].every(([dx, dy]) => ok(x + dx, y + dy))) { best = { x, y }; break; } } }
    pileCache.set(data, best); return best;
  }
  const pileCache = new WeakMap();   // (the layout is frozen: the spot is kept beside it)
  V.woodpileSpot = woodpileSpot;
  function woodpile(B, r, P, season) {
    // trodden earth and chips round it
    B.f(B.blob(r, 4, 6, 70, 16, 10, .35), '#7a6644', .35).f(B.blob(r, -6, 5, 44, 10, 9, .35), '#9a8458', .3);
    for (let k = 0; k < 60; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); B.f(B.rect(Math.cos(a) * 64 * d, 6 + Math.sin(a) * 14 * d, 2 + r() * 2.6, .9 + r() * .8), r() < .5 ? '#d8c08a' : '#8a6a46', .75); }
    // the long cordwood stack between two stakes
    B.shadow(6, 1, 36, 5, .3);
    for (const x of [-30, 30]) B.f(B.rect(x - 1.8, -27, 3.6, 28), P.woodDk);
    let y = -2; for (let row = 0; row < 4; row++) { let x = -28 + r() * 2, rowH = 0; while (x < 26) { const rad = 2.6 + r() * r() * 2.8, cx0 = x + rad, cy0 = y - rad + (r() - .5); if (cx0 + rad > 29) break; const face = r() < .3 ? '#d2bc92' : r() < .6 ? '#c0a47a' : '#a88c64', bark = r() < .5 ? '#5a4230' : '#6e5236';
            // (a sawn log end: rough bark round it, the face lit on its upper left and shaded to the lower right, two growth rings
            //  and a split; flat pale discs read as coins; 19 Nov 2026, round 3 fixes, round 2)
            B.f(B.circ(cx0 + .5, cy0 + .5, rad * 1.04), '#3a2c20').f(B.blob(r, cx0, cy0, rad, rad * .98, 9, .12), bark).f(B.circ(cx0 - .25, cy0 - .25, rad * .78), face).f(B.circ(cx0 + rad * .16, cy0 + rad * .18, rad * .6), C2(face), .38).f(B.circ(cx0 - rad * .3, cy0 - rad * .3, rad * .32), '#ecdcb4', .4);
            if (rad > 3) { B.s(`M${cx0 - .25 + rad * .48} ${cy0 - .25}A${rad * .48} ${rad * .48} 0 1 1 ${cx0 - .25 + rad * .48} ${cy0 - .26}`, '#8a6c46', .45, .55); B.s(`M${cx0 - .25} ${cy0 - .25}l${(r() - .5) * rad} ${rad * .7}`, '#6a5034', .5, .5); }
            if (r() < .15) B.f(B.blob(r, cx0 - rad * .4, cy0 - rad * .8, rad * .7, rad * .3, 6, .5), '#6f8a42', .8); x += rad * 2 + .2 + r() * .6; rowH = Math.max(rowH, rad * 2); } y -= Math.max(5, rowH * .86); }
    // the sawhorse, a log across it, sawdust under the cut
    const sx = 50; B.shadow(sx + 3, 1, 16, 3.5, .28);
    for (const [a, b] of [[-9, 6], [9, -6]]) { B.s(`M${sx + a} 0L${sx + b} -17`, P.woodDk, 2.6); B.s(`M${sx + a + 4} 1L${sx + b + 4} -16`, '#6e5236', 2.2); }
    B.f(B.rr(sx - 16, -21, 32, 6, 3), '#82623e').f(B.ell(sx + 16, -18, 2.8, 3.1), '#d2ae78').f(B.rect(sx - 16, -21, 32, 1.6), '#a08058', .6);
    B.f(B.ell(sx + 2, 2, 7, 1.8), '#e4cc9a', .7);
    // the fire: a ring of stones, half-burnt sticks, a kettle hung from a tripod (cold in the dark: Hollin is home by dusk)
    const fx = -52; B.f(B.ell(fx, 2, 11, 4), '#3a3028', .7);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; B.f(B.blob(r, fx + Math.cos(a) * 10, 2 + Math.sin(a) * 3.8, 2.6, 1.8, 6, .3), r() < .5 ? '#8e8a78' : '#a8a492'); }
    B.s(`M${fx - 5} 1L${fx + 4} -1`, '#2e2620', 2).s(`M${fx - 3} -1L${fx + 5} 2`, '#4a3a2a', 1.8).f(B.ell(fx, 0, 3, 1.2), '#c86a2a', .7);
    for (const [a, b] of [[-10, 3], [10, 3], [0, -4]]) B.s(`M${fx + a} ${b}L${fx} -24`, '#5a4632', 1.6);
    B.s(`M${fx} -24L${fx} -14`, '#3a3a3a', .8).f(B.rr(fx - 5, -15, 10, 8, 3.4), '#4a4e52').f(B.rr(fx - 5, -15, 4, 8, 2), '#7a8086', .6).s(`M${fx + 5} -11l4 -2`, '#4a4e52', 1.6);
    // a bucket and an axe left in the block
    B.f(B.rr(18, -7, 7, 8, 1.6), '#7a6a52').f(B.ell(21.5, -7, 3.5, 1.2), '#5a4a3a');
    if (season !== 'winter') for (let k = 0; k < 5; k++) B.tufts(r, -70 + r() * 140, 8 + r() * 4, 10, 3, ['#6f8446', '#8a9a58'], 6);
  }

  /* ---------- Hollin's hut and the ice house: their surroundings ---------- */
  function homes(C) {
    const { L, P, add, thing } = C, cw = L.cw, ch = L.ch;
    { const wp = woodpileSpot(L.D); if (wp) { const p = L.cpt(wp.x, wp.y); thing({ key: 'woodpile', x: p.x, y: p.y, box: [-80, -40, 76, 20], foot: [-32, 32, 8], draw: B => woodpile(B, C.kit.rng(77), P, C.season) }); } }
    const hut = L.stat('ld-woodhut');
    if (hut) {
      const c = L.cpt(hut.x + hut.w / 2, hut.y + hut.h);
      add([c.x - 150, c.y - 60, c.x + 150, c.y + 90], 71, (B, r) => {
        // a yard of chips and sawdust before the door, a beaten way to it
        B.f(B.blob(r, c.x, c.y + 26, 110, 38, 11, .3), '#9a8458', .45).f(B.blob(r, c.x - 10, c.y + 22, 70, 22, 9, .3), '#b8a070', .35);
        for (let k = 0; k < 120; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); B.f(B.rect(c.x + Math.cos(a) * 100 * d, c.y + 24 + Math.sin(a) * 34 * d, 2 + r() * 3, 1 + r()), r() < .5 ? '#d8c08a' : '#8a6a46', .8); }
      });
      const logs = gardenIslandLogStack(L.D), logAt = logs ? L.cpt(logs.x, logs.y) : { x: c.x + 2.2 * cw, y: c.y + .4 * ch };
      thing({ key: 'logstack2', x: logAt.x, y: logAt.y, box: [-46, -58, 48, 8], draw: B => logStack(B, C.kit.rng(72), P) });
      thing({ key: 'block', x: c.x - 1.9 * cw, y: c.y + 1.3 * ch, box: [-20, -34, 26, 8], foot: [-11, 11, 8], draw: B => chopBlock(B, P) });   // (foot: the stump, 20 px wide; the chips on the ground are walked over and the axe's handle is in the air: the block ran 0.44 of a cell past the stump, the collision audit, 19 Nov 2026)
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
      // (19 Nov 2026, round 3 fixes: it starts on the pond walk itself, at the walk's nearest point, and is laid by the shared
      //  path kit as a worn-earth trail with soft trodden edges: a pale ribbon with a bright edge read as a stub ending in grass)
      { const wp = L.routePts('pond-walk'); let best = null, bd = 1e9; for (let i = 1; i < wp.length; i++) { const a = wp[i - 1], b = wp[i], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((pts[0].x - a.x) * dx + (pts[0].y - a.y) * dy) / ((dx * dx + dy * dy) || 1))), q = { x: a.x + dx * t, y: a.y + dy * t }, d = Math.hypot(q.x - pts[0].x, q.y - pts[0].y); if (d < bd) { bd = d; best = q; } } if (best && bd < 3 * L.cw) pts.unshift(best); }
      const kitWay = window.GardenPaintGround && GardenPaintGround.paths ? (bb => GardenPaintGround.paths({ routes: [{ id: 'tower-way', kind: 'earth', width: 20, points: pts.map(p => ({ x: p.x, y: p.y })) }], season: C.season, kindAt: () => 'oldwood', box: { x: bb[0], y: bb[1], w: bb[2] - bb[0], h: bb[3] - bb[1] } }))(C.kit.bboxOf(pts, 40)) : null;
      if (kitWay && kitWay.length) for (const o of kitWay) add(o.bb, o.seed || 79, (B, r, chunkBB) => o.draw(B, r, chunkBB || o.bb), o.clip ? { clip: o.clip } : undefined);
      else add(C.kit.bboxOf(pts, 40), 79, (B, r) => {
        V.strokePts(B, pts, '#6e5e3e', 30, .3); V.strokePts(B, pts, '#b8a478', 24, .9); V.strokePts(B, pts, '#d4c196', 16, .85);
        for (let k = 0; k < 18; k++) { const t = r(), i = Math.min(2, Math.floor(t * 3)), a = pts[i], b = pts[i + 1], f = t * 3 - i; B.f(B.blob(r, a.x + (b.x - a.x) * f + (r() - .5) * 14, a.y + (b.y - a.y) * f + (r() - .5) * 8, 3 + r() * 3, 1.4 + r(), 6, .5), r() < .5 ? '#7d8f4e' : '#9a8a5e', .55); }
      });
    }
    // the wayside lamps: an iron lantern on a rough stone plinth, glass that holds the light (lit at dusk by the world's lights).
    // (19 Nov 2026, round 3 fixes, round 2: to the size standard's lamp post, about 1.9 of your height, each its own: a plinth of
    //  two or three rough stones, a post that leans a touch, a square or a capped lantern, ivy up some; seven of one lamp on
    //  flat pale blocks read as a row of street furniture)
    if (typeof gardenIslandOldWoodLamps === 'function') gardenIslandOldWoodLamps(L.D).forEach((q, i) => {
      const p = L.cpt(q.x, q.y), S = (typeof gardenSizePx === 'function' ? gardenSizePx('lamp', .5) : 79) / 63;
      thing({ key: 'oldlamp2|' + i + '|' + C.season, x: p.x, y: p.y, box: [-24, -84, 24, 10], draw: B => {
        const r = C.kit.rng(300 + i), ST = { rock: WALL.body, rockLo: WALL.lo, rockHi: WALL.hi, rockDk: WALL.dk }, lean = (r() - .5) * .07, capped = r() < .5;
        B.shadow(2, 1, 15, 3.8, .32);
        B.cx.save(); B.cx.scale(S, S);
        // the plinth: rough stones stacked, the lower one wider, moss in the joint
        B.stone(r, 0, -4, 7.6 + r() * .8, 5.2, ST, null); B.stone(r, (r() - .5) * 1.6, -11, 6.2 + r() * 1, 4.4, ST, C.season === 'winter' ? null : r() < .6 ? WALL.moss : null); if (r() < .5) B.stone(r, (r() - .5) * 1.6, -17, 4.8, 3, ST, null);   // (inside the plinth's walking box, 94-garden-0island.js)
        B.f(B.blob(r, -2, -9, 6, 1.6, 6, .5), C.season === 'winter' ? '#f2f4f0' : WALL.moss, .8);
        B.cx.save(); B.cx.translate(0, -18); B.cx.rotate(lean);
        B.s('M0 0V-32', P.iron, 3).s('M-1 0V-32', '#5a6064', 1, .6).s('M0 -28Q6 -32 9 -28', P.iron, 1.8);
        if (capped) { B.f('M-5.5 -38L5.5 -38L4.5 -29L-4.5 -29Z', '#f2d36b', .95).f('M-5.5 -38L-1 -38L-1.5 -29L-4.5 -29Z', '#fff2c0', .6).s('M-5.5 -38L5.5 -38L4.5 -29L-4.5 -29ZM0 -38V-29', P.iron, 1.2); B.f('M-8 -38Q0 -46 8 -38Z', P.iron).f(B.circ(0, -45, 1.4), P.iron).f(B.rect(-5, -29.5, 10, 2), P.iron); }
        else { B.f('M-6 -38L6 -38L5 -28L-5 -28Z', '#f2d36b', .95).f('M-6 -38L-1 -38L-1.5 -28L-5 -28Z', '#fff2c0', .6).s('M-6 -38L6 -38L5 -28L-5 -28ZM0 -38V-28M-5.5 -33H5.5', P.iron, 1.2); B.f('M-8 -38L0 -44L8 -38Z', P.iron).f(B.circ(0, -45, 1.6), P.iron).f(B.rect(-5.5, -28.5, 11, 2), P.iron); }
        if (C.season !== 'winter' && r() < .45) { const top = -6 - r() * 16; B.s('M1 0Q-2 ' + top / 2 + ' 1 ' + top, '#3e5a2c', 1.1, .9); for (let k = 0; k < 6; k++) B.f(B.blob(r, (r() - .5) * 5, -r() * -top, 2.2, 1.6, 6, .5), r() < .5 ? WALL.ivy : WALL.ivyHi, .95); }
        B.cx.restore(); B.cx.restore();
        if (C.season !== 'winter' && r() < .8) fern(B, r, 10 + r() * 3, 2, C.season);
        if (C.season !== 'winter' && r() < .5) B.tufts(r, -10, 3, 8, 3, ['#6f8446', '#8a9a58'], 5);
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
  const C2 = c => { const n = parseInt(c.slice(1), 16), f = v => Math.max(0, Math.round(v * .84)); return '#' + ((f(n >> 16 & 255) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0'); };   // (a growth ring: the face a shade darker)
  function logStack(B, r, P) {
    B.shadow(4, 1, 40, 6, .3);
    // (19 Nov 2026, round 3 fixes: a woodpile, not a honeycomb: logs of every girth packed as they fell, split ones showing a
    //  pale face, older ones greyed and mossy at the bottom, dark gaps between them, under a roof of weathered shakes)
    B.f(B.rect(-38, -46, 76, 46), '#2a2018', .9);
    for (const x of [-35, 35]) B.f(B.rect(x - 2.4, -44, 4.8, 44), P.woodDk).f(B.rect(x - 2.4, -44, 1.6, 44), '#8a6a46', .5);
    let y = -4; for (let row = 0; row < 6 && y > -40; row++) {
      const end = 31 - Math.abs(row - 2) * .8; let x = -31 + r() * 3, rowH = 0;
      while (x < end) {
        const rad = 2.8 + r() * r() * 3.6, split = r() < .3, old = row < 2 && r() < .5, cx0 = x + rad, cy0 = y - rad + (r() - .5) * 1.2;
        if (cx0 + rad > end + 2) break;
        const bark = old ? '#6a6250' : r() < .5 ? '#6e5236' : '#82623e', face = old ? '#a89c80' : split ? '#d8c6a0' : r() < .5 ? '#c8b088' : '#b89c74';
        if (split) B.f(`M${cx0 - rad} ${cy0}A${rad} ${rad} 0 0 1 ${cx0 + rad} ${cy0}L${cx0} ${cy0 + rad * .9}Z`, bark).f(`M${cx0 - rad * .8} ${cy0}A${rad * .8} ${rad * .8} 0 0 1 ${cx0 + rad * .8} ${cy0}L${cx0} ${cy0 + rad * .7}Z`, face);
        else B.f(B.circ(cx0, cy0, rad), bark).f(B.circ(cx0 - .3, cy0 - .3, rad * .8), face).f(B.circ(cx0 - .3, cy0 - .3, rad * .45), C2(face), .45).f(B.circ(cx0 - .3, cy0 - .3, rad * .14), '#7a5a36', .6);
        if (old && r() < .5) B.f(B.ell(cx0 + rad * .3, cy0 + rad * .5, rad * .7, rad * .35), '#6f8446', .75);
        x += rad * 2 + .3 + r() * .8; rowH = Math.max(rowH, rad * 2);
      }
      y -= Math.max(5.5, rowH * .86);
    }
    B.f('M-42 -44L0 -55L44 -44L42 -39L0 -49L-40 -39Z', '#5e5040').f('M-42 -44L0 -55L0 -52L-40 -42Z', '#7a6a56', .6);
    for (let k = -38; k < 40; k += 6) B.s(`M${k} -44l${(r() - .5) * 1.5} 4`, '#463a2e', .8, .6);
    B.f(B.blob(r, -10, 1, 34, 3.4, 8, .4), '#6f8446', .5);
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
    { const q = L.cpt(pz.x + .9, pz.y + 3.3), R = [q.x - 4 * L.cw, q.y - 3.3 * L.ch, q.x + 4 * L.cw, q.y + 3.3 * L.ch]; const all = window.GardenPaintPaved || (window.GardenPaintPaved = []); if (!all.some(o => o.id === pz.id)) all.push({ id: pz.id, rect: R }); }   // (the paved circle below: the pets' ground rule reads it, so nothing is laid on it)
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
      // clover in the sward (its daisies are the village ground's own, in drifts: a dot sprinkled every few steps read as confetti)
      for (let k = 0; k < w * h / 700; k++) { const x = bb[0] + r() * w, y = bb[1] + r() * h; B.f(B.blob(r, x, y, 3.4, 2.2, 6, .4), '#5e8a44', .4); }
      // the ring the dancers have worn round the maypole's foot, the grass thin and brown there
      if (spot) for (let k = 0; k < 3; k++) B.s(B.ell(spot.x, spot.y + 2, 34 - k * 3, 10 - k), '#a89466', 7 - k * 2, .12 + k * .05);
      B.cx.restore();
      // cottage flowers just inside the path in clumps and runs of their own lengths, some of the edge bare grass: a clump
      // every eleven px all the way round, each with three bright dots, traced the lawn's edge like a bead necklace
      const leafy = C.season === 'winter' ? '#7a8a6e' : '#5e8040', soft = c => kit.mix(c, '#9cb070', .25);
      for (const q of V.walk(inner.concat([inner[0]]), 7)) { if (!pz.lawn && q.y > cy0 && Math.abs(q.x - cx0) < w * .21) continue;   // (not across the paved circle at the green's foot)
        const run = kit.noise(q.x / 70, q.y / 50, 404); if (run < .5 || r() < .35) continue;
        const o = 2 + r() * 12 + (run - .5) * 10, x = q.x - q.ty * o + (r() - .5) * 4, y = q.y + q.tx * o, s = .7 + r() * .7;
        B.f(B.blob(r, x + 1, y + 1.2, 6 * s, 3.2 * s, 7, .5), '#3e5a2c', .3).f(B.blob(r, x, y, 6 * s, 3.4 * s, 7, .5), leafy, .8).f(B.blob(r, x - 1.5 * s, y - 1.2 * s, 3.2 * s, 1.5 * s, 6, .5), '#86a85a', .6);
        if (run > .58) for (let j = 0, n = 1 + Math.floor(r() * 3); j < n; j++) B.f(B.circ(x + (r() - .5) * 8 * s, y - 2 + (r() - .5) * 3, 1.1 + r() * .5), soft(flowers[Math.floor(r() * flowers.length)]), .9); }
    });
    // the maypole: on free ground near the middle (never on a plot or a house)
    const ok = (x, y) => L.free(x, y) && !L.plot(x, y) && L.kind(x, y) === 'grass';
    let spot = null; for (const [dx, dy] of [[0, -.6], [-1, -.6], [1, -.6], [0, .4], [-2, 0], [2, 0], [-1, 1], [1, 1], [-3, .6], [3, .6]]) if (ok(pz.x + dx, pz.y + dy)) { spot = L.cpt(pz.x + dx, pz.y + dy); break; }
    // (the tallest thing on the green throws a shadow you can see, pole and ribbons, and each ribbon's peg sits in the turf
    // with its own contact; the ribbons are drawn a little wider with a soft dark underside, so on a 2x screen a thin
    // diagonal does not break into steps)
    // (round 5, pets: the foot is the ribbons' ring of pegs, not only the pole: you and your pet walked inside the ribbons and stood half hidden there)
    // (round 6: the ring of pegs is the foot, a little wider than the pegs; standing behind it, the ribbons fade like a tree's crown so you are
    // seen through them and never look as if you stood inside the pole)
    if (spot && !pz.lime) thing({ key: 'maypole|' + C.season, x: spot.x, y: spot.y, box: [-46, -150, 46, 14], foot: [-38, 38, 12], crown: { x: 0, y: -46, rx: 46, ry: 48 }, shade: { a: 1 }, draw: B => {
      const rr = kit.rng(seed + 3), cols = ['#c84a3a', '#e8c84a', '#3a7ac0', '#f2f0e8', '#5e9a54', '#c86aa0'];
      B.shadow(1.5, 2, 12, 4, .45);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, ex = Math.cos(a) * 34, ey = Math.sin(a) * 9 + 2; B.shadow(ex + 1, ey + .8, 3.4, 1.4, .5); B.s(`M0 -128Q${ex * .6} ${-60 + ey} ${ex} ${ey}`, '#3a3428', 3, .16).s(`M0 -128Q${ex * .6} ${-60 + ey} ${ex} ${ey}`, cols[k], 2.1, .95).f(B.circ(ex, ey, 1.8), '#6a5034').f(B.circ(ex - .5, ey - .6, .7), '#a8845a'); }
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
    { const GP = window.GardenGroundPlanting || (window.GardenGroundPlanting = { rows: new Map(), set(id, cells) { this.rows.set(id, cells); }, has(x, y) { const k = x + ',' + y; for (const c of this.rows.values()) if (c.has(k)) return true; return false; } }), cells = new Set();
      for (const p of spots) { const gy = Math.floor((p.y - W.sky) / ch); for (const dx of [-15, 0, 15]) cells.add(Math.floor((p.x + dx) / cw) + ',' + gy); }
      GP.set('high-street', cells); }   // (what is planted here is in the ground for good: anything set out later keeps off it, 94-garden-1stored.js)
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

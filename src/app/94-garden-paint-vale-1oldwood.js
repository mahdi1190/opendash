/* Painted vale: the old woodland's own new things (layout round 3, the region's file assets/garden/vale-oldwood.json;
 * see 94-garden-paint-vale-0kit.js for the layers). Only what the plan adds and no other painter draws:
 *  - the yew maze: a mown turf oval off the lantern round, two low clipped yew rings (half your height, so you see over
 *    them), the outer ring open to the east on the round, the inner ring open to the west, the turf labyrinth at the
 *    heart; each piece of hedge stops the feet where it stands (its foot), the gaps are the way in
 *  - finger posts at the forks the lamps do not mark, pointing along the ways
 *  - the Old Man: the sea stack the beech ride points at, out in the sea off the shore, never reached
 * Everything is placed from presentation.oldwood, so it moves with the layout. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  const YEW = { summer: ['#1f3a22', '#2c4c2c', '#3d6438', '#5a8448'], spring: ['#22402a', '#305232', '#44703e', '#64904e'], autumn: ['#22382a', '#2e4a2e', '#3e6038', '#587a44'], winter: ['#25382c', '#304636', '#40583e', '#5c7258'] };
  const STONE = { body: '#a7a491', lo: '#7d7b6b', hi: '#ccc8b4', dk: '#555547', moss: '#6f8446' };

  /** The maze's rings in cells: centre, the turf oval, and each ring with the side its gap is on. */
  function mazeOf(L) {
    const ow = L.pres.oldwood, m = ow && ow.maze; if (!m) return null;
    const lab = L.stat('ld-labyrinth'), cx = lab ? lab.x + lab.w / 2 - .15 : m.x, cy = lab ? lab.y + lab.h - .55 : m.y;
    // (layout round 3 fixes: the rings as big as the maze's yard allows, so the inner hedge stands clear of the heart and the
    //  arrival in the outer ring's mouth is on open turf)
    return { cx, cy, turf: { rx: 2.4, ry: 1.7 }, rings: [{ rx: 2.18, ry: 1.52, gap: 0, half: .34 }, { rx: 1.5, ry: 1.0, gap: Math.PI, half: .5 }] };
  }
  V.oldwoodMaze = mazeOf;

  function maze(C) {
    const { L, P, add, thing, kit } = C, M = mazeOf(L); if (!M) return;
    const cw = L.cw, ch = L.ch, c = L.cpt(M.cx, M.cy), season = C.season, Y = YEW[season] || YEW.summer, seed = kit.hashStr('oldwood-maze');
    const rx = M.turf.rx * cw, ry = M.turf.ry * ch, bb = [c.x - rx - 12, c.y - ry - 12, c.x + rx + 12, c.y + ry + 12];
    // the turf: mown close in broad stripes, a worn ring of feet between the hedges, a soft edge into the wood floor
    add(bb, seed, (B, r) => {
      B.cx.save(); B.cx.filter = 'blur(4px)'; B.f(B.ell(c.x, c.y + 2, rx + 6, ry + 4), '#2e3420', .18); B.cx.filter = 'none';
      const oval = new Path2D(B.ell(c.x, c.y, rx, ry)); B.cx.clip(oval);
      B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), season === 'winter' ? '#a8b49a' : season === 'autumn' ? '#9aa85e' : '#8fb05a');
      for (let k = -6; k < 8; k++) { const x = c.x + k * 22; B.f(`M${x} ${bb[1]}l22 0l-30 ${bb[3] - bb[1]}l-22 0z`, k % 2 ? '#f4f8dc' : '#2e4a20', k % 2 ? .1 : .08); }
      for (const ring of M.rings) { const mx = (ring.rx - .5) * cw, my = (ring.ry - .3) * ch; if (mx > 10) B.s(B.ell(c.x, c.y, mx, my), '#c8b88a', 7, .3); }
      for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); B.f(B.circ(c.x + Math.cos(a) * rx * d, c.y + Math.sin(a) * ry * d, 1.1), season === 'winter' ? '#f2f4f0' : r() < .8 ? '#f6f2e4' : '#f0d24a', .85); }
      B.cx.restore();
      B.s(B.ell(c.x, c.y, rx, ry), '#5a6a38', 2, .35);
    });
    // the hedges: short clipped pieces round each ring, far ones first, each with a shaded foot, a body and a lit top
    M.rings.forEach((ring, ri) => {
      const perim = Math.PI * Math.sqrt((ring.rx * cw) ** 2 + (ring.ry * ch) ** 2) * 1.41, n = Math.max(12, Math.round(perim / 11));
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, d = Math.atan2(Math.sin(a - ring.gap), Math.cos(a - ring.gap)); if (Math.abs(d) < ring.half) continue;
        const x = c.x + Math.cos(a) * ring.rx * cw, y = c.y + Math.sin(a) * ring.ry * ch, end = Math.abs(Math.abs(d) - ring.half) < .3;
        const w = 9.5, h = (ri ? 21 : 24) + Math.sin(i * 1.7) * 1.2;   // (a hedge 0.4 to 0.5 of your height: you see over it into the maze)
        thing({ key: 'ow-hedge|' + ri + '|' + i + '|' + season, x: Math.round(x), y: Math.round(y), box: [-16, -h - 8, 16, 7], foot: [-8, 8, 6], draw: B => {
          const r = kit.rng(seed + ri * 97 + i);
          B.shadow(2, 2, 13, 3.4, .3);
          // (one clipped hedge, not blocks: each piece overlaps the next, its top a soft rounded crown of leaf)
          B.f(B.rr(-w, -h + 3, w * 2, h - 3, 3), Y[0]).f(B.blob(r, 0, -h + 4, w + 1.5, 4.6, 8, .18), Y[1]).f(B.rr(-w, -h + 6, w * 2, h * .4, 3), Y[1], .7).f(B.blob(r, -1, -h + 2.6, w * .9, 2.4, 7, .25), Y[2]);
          for (let k = 0; k < 6; k++) B.f(B.blob(r, -w + 3 + r() * (w * 2 - 6), -h + 1 + r() * 3, 2.6, 1.4, 5, .5), Y[3], .8);
          for (let k = 0; k < 5; k++) B.f(B.blob(r, -w + 2 + r() * (w * 2 - 4), -h * .55 + r() * h * .4, 2.4, 1.6, 5, .5), Y[0], .6);
          if (end) B.f(B.rr(Math.sign(d) * (w - 4) - 2, -h + 4, 4, h - 4, 2), Y[2], .5);
          B.f(B.ell(0, 0, w + 1, 2.2), '#22301a', .35);
          if (season !== 'winter' && r() < .25) B.tufts(r, (r() - .5) * 14, 2, 6, 3, ['#566e30', P.lawnLo], 5);
        } });
      }
    });
  }

  /** A finger post: an oak post with two arms, pointing along the ways that leave the fork. */
  function fingerPosts(C) {
    const { L, P, thing, kit } = C, ow = L.pres.oldwood; if (!ow || !Array.isArray(ow.fingerPosts)) return;
    const ok = (x, y) => L.free(x, y) && !L.plot(x, y) && L.kind(x, y) === 'grass';
    ow.fingerPosts.forEach(([fx, fy], i) => {
      let spot = null; for (const [dx, dy] of [[0, 0], [.3, 0], [-.3, 0], [0, .3], [0, -.3], [.5, .3], [-.5, .3], [.5, -.3], [-.5, -.3]]) if (ok(fx + dx, fy + dy)) { spot = L.cpt(fx + dx, fy + dy); break; }
      if (!spot) return;
      const r0 = kit.rng(530 + i), a1 = r0() < .5 ? 1 : -1;
      thing({ key: 'ow-finger|' + i + '|' + C.season, x: Math.round(spot.x), y: Math.round(spot.y), box: [-34, -78, 34, 8], foot: [-4, 4, 5], draw: B => {
        const r = kit.rng(540 + i);
        B.shadow(2, 1, 9, 2.6, .32);
        B.post(0, -70, 1, 4.6, [P.wood || '#8a6a46', P.woodLo || '#5e4630', P.woodHi || '#b08a5e']);
        B.f(B.rr(-3.4, -73, 6.8, 4, 1.4), P.woodLo || '#5e4630');
        for (const [y, s] of [[-64, a1], [-54, -a1]]) {
          const tip = s * 28; B.f(`M${s * 1.5} ${y - 4}L${tip - s * 5} ${y - 4}L${tip} ${y}L${tip - s * 5} ${y + 4}L${s * 1.5} ${y + 4}Z`, '#d8c6a0').s(`M${s * 1.5} ${y - 4}L${tip - s * 5} ${y - 4}L${tip} ${y}L${tip - s * 5} ${y + 4}L${s * 1.5} ${y + 4}Z`, '#6a5236', 1, .9);
          B.f(B.rect(Math.min(s * 5, s * 20), y - 1, 15, 1.2), '#7a6448', .55);
          if (r() < .5) B.f(B.blob(r, s * 8, y + 3, 4, 1.2, 5, .5), STONE.moss, .7);
        }
        if (C.season !== 'winter') B.tufts(r, 0, 2, 12, 5, ['#566e30', P.lawnLo || '#6a8a3e'], 6);
      } });
    });
  }

  /** The Old Man: a sea stack out off the shore, in line with the beech ride, gulls on its top.
   * (layout fix, west) Drawn as a broad, broken pillar of rock with a smaller stack beside it, not a tall smooth taper: ruled
   * across with level strata it read from the shore and the whole-map view as a bare plank jetty running out to sea with
   * nothing at its end. Now: blocky facets lit from the upper left, ledges that step in, a sea arch through its foot,
   * white streaks under the gulls' ledges, a dark weed band at the tide line and surf breaking round both rocks. It
   * stands about three of you tall, so its top stays out in the water and never meets the beach. */
  function oldMan(C) {
    const { L, thing, kit } = C, ow = L.pres.oldwood; if (!ow || !Array.isArray(ow.oldMan)) return;
    const p = L.cpt(ow.oldMan[0], ow.oldMan[1] + .9), winter = C.season === 'winter';
    thing({ key: 'ow-oldman-2|' + C.season, x: Math.round(p.x), y: Math.round(p.y), box: [-92, -132, 92, 24], draw: B => {
      B.cx.save(); B.cx.scale(.8, .8);   // (about three of you tall: its top stays out over the water seen from the shore)
      const r = kit.rng(611), R = { body: '#867c6c', lo: '#5e564a', hi: '#b2a68e', dk: '#3a352e', weed: '#3e4a2a', guano: '#eeeae0' };
      // the water round the foot: a dark ring, then broken surf
      B.cx.filter = 'blur(3px)'; B.f(B.ell(-6, 8, 84, 13), '#2e4e5a', .45); B.cx.filter = 'none';
      // the dog: a low stack to the east
      const dog = [[30, 6], [32, -14], [38, -30], [46, -38], [58, -36], [66, -24], [70, -8], [72, 6]];
      B.f(B.poly(dog), R.lo).f(B.poly([[30, 6], [32, -14], [38, -30], [46, -38], [50, -30], [46, -12], [44, 6]]), R.body).f(B.poly([[38, -30], [46, -38], [52, -37], [48, -32]]), R.hi, .8);
      B.f(B.blob(r, 50, -38, 9, 3, 6, .4), winter ? '#eef2f2' : '#7c9050', .9);
      // the Old Man: broad at the foot, stepping in at two ledges, a crown of turf; each block its own facets
      const body = [[-58, 6], [-60, -20], [-52, -30], [-54, -52], [-44, -60], [-42, -86], [-30, -96], [-28, -112], [-12, -122], [6, -118], [16, -106], [18, -90], [30, -80], [30, -58], [40, -48], [42, -22], [48, -8], [46, 6]];
      B.f(B.poly(body), R.lo);
      const lit = [[-58, 6], [-60, -20], [-52, -30], [-54, -52], [-44, -60], [-42, -86], [-30, -96], [-28, -112], [-12, -122], [-6, -120], [-14, -100], [-18, -88], [-20, -62], [-28, -54], [-30, -26], [-24, -8], [-26, 6]];
      B.f(B.poly(lit), R.body).f(B.poly([[-54, -52], [-44, -60], [-42, -86], [-34, -92], [-36, -64], [-46, -54]]), R.hi, .75).f(B.poly([[-28, -112], [-12, -122], [-6, -120], [-18, -108]]), R.hi, .8);
      // the ledges: lit tops where the rock steps in, shadow under each
      for (const [x0, x1, y] of [[-52, -30, -52], [-42, 18, -88], [18, 30, -80], [30, 40, -48], [-60, -40, -20]]) { B.f(B.poly([[x0, y], [x1, y - 1], [x1 - 2, y + 3], [x0 + 2, y + 4]]), R.hi, .7).f(B.rect(x0 + 2, y + 4, x1 - x0 - 4, 3), R.dk, .35); }
      // joints: short broken cracks, never ruled lines across it
      for (let k = 0; k < 26; k++) { const x = -50 + r() * 86, y = -112 + r() * 112, vert = r() < .6; B.s(vert ? `M${x} ${y}l${(r() - .5) * 3} ${6 + r() * 10}` : `M${x} ${y}l${4 + r() * 7} ${(r() - .5) * 2}`, R.dk, 1 + r() * .6, .45); }
      // the sea arch through its foot, light showing through
      B.f('M-10 6Q-10 -16 2 -20Q14 -16 14 6Z', R.dk).f('M-6 6Q-6 -12 2 -15Q10 -12 10 6Z', '#6fa4ae', .85).f('M-4 6Q2 -2 8 6Z', '#e8f4f2', .7);
      // the gulls' streaks below the ledges, and the gulls
      for (const [x, y] of [[-36, -86], [-20, -86], [24, -78], [-46, -50]]) B.s(`M${x} ${y + 4}q${(r() - .5) * 3} 8 ${(r() - .5) * 2} ${10 + r() * 8}`, R.guano, 2 + r(), .7);
      B.f(B.blob(r, -10, -121, 20, 5, 8, .4), winter ? '#eef2f2' : '#6f8446', .95).f(B.blob(r, -16, -124, 10, 3, 6, .4), winter ? '#ffffff' : '#93a85a', .85);
      for (const [x, y] of [[-14, -126], [0, -124], [-30, -95]]) B.f(B.ell(x, y, 4, 2.4), '#f4f4ee').f(B.circ(x + 3, y - 2, 1.6), '#f4f4ee').f(B.rect(x + 4.4, y - 2.4, 2, .8), '#e0a030').f(B.rect(x - 4, y - .6, 3, 1.2), '#8a9098');
      // the tide line: dark wet rock and weed round both feet
      B.f(B.poly([[-58, 6], [-59, -6], [46, -6], [48, 6]]), R.weed, .6).f(B.poly([[30, 6], [31, -5], [72, -5], [72, 6]]), R.weed, .6);
      for (let k = 0; k < 14; k++) { const x = -56 + r() * 128; B.s(`M${x} -6q${(r() - .5) * 2} 4 ${(r() - .5) * 3} 8`, '#2e3a20', 1.4, .7); }
      // surf: lobes of foam round the feet, a bright line where the swell breaks on them
      for (let k = 0; k < 11; k++) { const x = -70 + k * 14 + r() * 6; B.f(B.blob(r, x, 7 + r() * 4, 9 + r() * 6, 2.6 + r() * 1.6, 6, .5), '#f2f8f6', .75 + r() * .2); }
      B.s('M-62 4Q-6 -2 50 4M28 4Q50 0 74 4', '#ffffff', 1.4, .8);
      B.cx.restore();
    } });
  }


  /* ---------- the walled garden's old brick wall (layout round 3 fixes) ----------
   * Each straight length of the wall (a landform marked brick, one block) is drawn as warm red brick in courses with a
   * stone coping, a wall about your height (0.95 H), its foot exactly on its block: the east-west lengths as one piece, the
   * north-south lengths in pieces a cell long, so each sorts by its own foot as you walk beside it. At each door gap the
   * wall ends in a taller pier with a cap stone, and the green plank door stands open flat against the wall. */
  const BRICK = { body: '#a9573f', lo: '#7e3d2c', hi: '#c9785a', dk: '#4e2a20', mortar: '#d7c4a4', cope: '#bdb7a3', copeHi: '#dcd6c2', copeLo: '#8a8574', moss: '#6f8446', door: '#4f7a4a', doorHi: '#7fa86e', doorDk: '#2e4a2e' };
  const Hpx = () => (typeof GARDEN_H === 'number' ? GARDEN_H : 41.4);
  function brickFace(B, r, quad, h, len, season, lit) {
    // quad: [foot a, foot b, top b, top a]; courses every 4.6 px, bricks staggered, a few darker or lighter
    const [a, b] = quad, ex = b.x - a.x, ey = b.y - a.y, lean = quad[3].x - a.x;
    B.f(B.poly(quad), B.lin(0, a.y - h, 0, a.y, [[0, lit ? BRICK.hi : BRICK.body], [.5, lit ? BRICK.body : BRICK.lo], [1, lit ? BRICK.lo : BRICK.dk]]));
    B.cx.save(); B.cx.clip(new Path2D(B.poly(quad)));
    for (let y = 0, row = 0; y < h; y += 4.6, row++) {
      const k = y / h;
      for (let t = (row % 2) * 4; t < len + 8; t += 8) {
        const u = t / len, x = a.x + ex * u + lean * k, yy = a.y + ey * u - y, tone = r();
        if (tone < .26) B.f(B.rect(x - 3.6, yy - 4.2, 7.2, 3.6), tone < .08 ? BRICK.dk : tone < .18 ? BRICK.hi : BRICK.lo, .5);
        B.s(`M${x} ${yy}l${lean / h * 4.6} -4.6`, BRICK.mortar, .6, lit ? .4 : .22);
      }
      B.s(`M${a.x + lean * k} ${a.y - y}L${b.x + lean * k} ${b.y - y}`, BRICK.mortar, .7, lit ? .45 : .28);
    }
    // weathering: a damp band at the foot, moss patches
    B.f(B.poly([a, b, { x: b.x + lean * 5 / h, y: b.y - 5 }, { x: a.x + lean * 5 / h, y: a.y - 5 }]), '#3e2a1e', .35);
    if (season !== 'winter') for (let k = 0; k < len / 26; k++) { const u = r(), x = a.x + ex * u + lean * .4, y = a.y + ey * u - h * (.2 + r() * .5); B.f(B.blob(r, x, y, 3 + r() * 3, 2, 6, .5), BRICK.moss, .45); }
    B.cx.restore();
  }
  function brickRun(B, r, A, Bq, h, thick, season, opts) {
    // a straight length from A to Bq (local px, the foot's centre line), thick px deep on the ground, h px high
    const L = Math.hypot(Bq.x - A.x, Bq.y - A.y) || 1, dx = (Bq.x - A.x) / L, dy = (Bq.y - A.y) / L, nx = -dy * thick / 2, ny = dx * thick / 2, ns = !!(opts && opts.ns), lean = -h * (ns ? .5 : .18);
    // (critic 2: a north-south length leant only a fifth of its height, so its brick face was a sliver and its long pale coping
    //  stood up the screen as a stone slab; it leans half its height, so its east face shows its brick, under a brick top)
    const foot = [{ x: A.x + nx, y: A.y + ny }, { x: Bq.x + nx, y: Bq.y + ny }, { x: Bq.x - nx, y: Bq.y - ny }, { x: A.x - nx, y: A.y - ny }];
    const up = v => ({ x: v.x + lean, y: v.y - h }), mid = { x: (foot[0].x + foot[2].x) / 2, y: (foot[0].y + foot[2].y) / 2 };
    // contact shade, then the faces turned to the camera (south and east), then the coping
    B.f(B.poly(foot.map(v => ({ x: v.x + (v.x > mid.x ? 4 : 1), y: v.y + (v.y > mid.y ? 3 : 0) }))), '#2a2418', .24);
    const faces = [];
    for (let e = 0; e < 4; e++) { const v0 = foot[e], v1 = foot[(e + 1) % 4], mx = (v0.x + v1.x) / 2 - mid.x, my = (v0.y + v1.y) / 2 - mid.y; if (my > .3 || mx > .3) faces.push({ v0, v1, south: my > Math.abs(mx) * .3 }); }
    faces.sort((p, q) => (p.v0.y + p.v1.y) - (q.v0.y + q.v1.y));
    for (const fc of faces) { const a = fc.v0.y > fc.v1.y || (fc.v0.y === fc.v1.y && fc.v0.x < fc.v1.x) ? fc.v0 : fc.v1, b = a === fc.v0 ? fc.v1 : fc.v0; brickFace(B, r, [a, b, up(b), up(a)], h, Math.hypot(b.x - a.x, b.y - a.y), season, fc.south); }
    const top = foot.map(up), cope = top.map(v => ({ x: v.x + Math.sign(v.x - (top[0].x + top[2].x) / 2) * 1.6, y: v.y + Math.sign(v.y - (top[0].y + top[2].y) / 2) * 1.2 }));
    if (ns) {   // a north-south length's top: brick on edge, with a thin worn coping line down its middle
      B.f(B.poly(cope.map(v => ({ x: v.x, y: v.y + 3 }))), BRICK.dk, .9).f(B.poly(cope), season === 'winter' ? '#f2f4f0' : BRICK.lo);
      const c0 = { x: (cope[0].x + cope[3].x) / 2, y: (cope[0].y + cope[3].y) / 2 }, c1 = { x: (cope[1].x + cope[2].x) / 2, y: (cope[1].y + cope[2].y) / 2 };
      if (season !== 'winter') { for (let y = Math.min(c0.y, c1.y) + 3; y < Math.max(c0.y, c1.y); y += 4.6) B.s(`M${Math.min(cope[0].x, cope[3].x)} ${y}h${Math.abs(cope[0].x - cope[3].x)}`, BRICK.mortar, .6, .35); B.s(`M${c0.x} ${c0.y}L${c1.x} ${c1.y}`, BRICK.cope, 2.2, .7); }
    } else {
      B.f(B.poly(cope.map(v => ({ x: v.x, y: v.y + 3 }))), BRICK.copeLo).f(B.poly(cope), season === 'winter' ? '#f2f4f0' : BRICK.cope);
      B.s(`M${cope[0].x} ${cope[0].y}L${cope[1].x} ${cope[1].y}`, BRICK.copeHi, 1.2, .8);
    }
    if (season !== 'winter') for (let k = 0; k < L / 30; k++) { const u = r(); B.f(B.blob(r, cope[0].x + (cope[1].x - cope[0].x) * u, cope[0].y + (cope[1].y - cope[0].y) * u + 1, 3.4, 1.4, 6, .5), BRICK.moss, .6); }
    for (const P of (opts && opts.pier) || []) {   // a pier at a door: wider, taller, a cap stone and a ball on it
      const c = P === 'a' ? A : Bq, w = Math.max(thick * .5, 6) + 3, hh = h + 9, by = c.y + Math.abs(ny) * .9;
      B.f(B.rect(c.x - w + lean, by - hh, w * 2, hh), BRICK.lo).f(B.poly([{ x: c.x - w, y: by }, { x: c.x + w, y: by }, { x: c.x + w + lean, y: by - hh }, { x: c.x - w + lean, y: by - hh }]), BRICK.body);
      for (let y = 4.6; y < hh; y += 4.6) B.s(`M${c.x - w + lean * y / hh} ${by - y}h${w * 2}`, BRICK.mortar, .6, .45);
      B.f(B.rr(c.x - w - 2.5 + lean, by - hh - 4, w * 2 + 5, 6, 2), BRICK.copeLo).f(B.rr(c.x - w - 2.5 + lean, by - hh - 5, w * 2 + 5, 4, 2), BRICK.cope).f(B.circ(c.x + lean, by - hh - 9, 4.2), BRICK.cope).f(B.circ(c.x + lean - 1.4, by - hh - 10.4, 1.8), BRICK.copeHi);
    }
    if (opts && opts.door) {   // the green plank door, standing open flat against the wall beside its pier
      const c = opts.door === 'a' ? A : Bq, s = opts.door === 'a' ? 1 : -1, dw = Math.min(26, L * .8), dh = Math.min(h - 3, Hpx() * 1.05), off = Math.max(thick / 2, 3) + 1.5;
      const ox = dy !== 0 && Math.abs(dy) > Math.abs(dx) ? off : 0, oy = Math.abs(dx) >= Math.abs(dy) ? off * .6 : 0;
      const p0 = { x: c.x + dx * s * 5 + ox, y: c.y + dy * s * 5 + oy }, p1 = { x: p0.x + dx * s * dw, y: p0.y + dy * s * dw };
      const q = [p0, p1, { x: p1.x + lean * dh / h, y: p1.y - dh }, { x: p0.x + lean * dh / h, y: p0.y - dh }];
      B.f(B.poly(q), BRICK.door).s(B.poly(q), BRICK.doorDk, 1.1, .85);
      for (let k = 1; k < 4; k++) { const u = k / 4; B.s(`M${p0.x + (p1.x - p0.x) * u} ${p0.y + (p1.y - p0.y) * u}l${lean * dh / h} ${-dh}`, BRICK.doorDk, .8, .6); }
      B.f(B.poly([q[3], q[2], { x: q[2].x - lean * 6 / h, y: q[2].y + 6 }, { x: q[3].x - lean * 6 / h, y: q[3].y + 6 }]), BRICK.doorHi, .45);
      for (const v of [.25, .75]) B.s(`M${p0.x + lean * dh * v / h} ${p0.y - dh * v}L${p1.x + lean * dh * v / h} ${p1.y - dh * v}`, '#2a2a26', 1.4, .8);
    }
    if (season !== 'winter') B.tufts(r, (A.x + Bq.x) / 2 + 2, Math.max(A.y, Bq.y) + Math.abs(ny) - 1, Math.max(6, Math.abs(Bq.x - A.x) * .8), Math.max(3, Math.round(L / 9)), ['#566e30', '#7d9a4e'], 5);
  }
  function brickWalls(C) {
    const { L, thing, kit } = C, ow = L.pres.oldwood, ids = new Set(ow && ow.gardenWalls || []); if (!ids.size) return;
    const h = Hpx() * .95, cw = L.cw, ch = L.ch;
    for (const f of L.D.landforms || []) {
      if (!f.brick || !f.line || !ids.has(f.id)) continue;
      const a0 = L.pt(f.line[0]), b0 = L.pt(f.line[1]), ns = Math.abs(b0.y - a0.y) > Math.abs(b0.x - a0.x);
      const A = ns ? (a0.y <= b0.y ? a0 : b0) : (a0.x <= b0.x ? a0 : b0), Bq = A === a0 ? b0 : a0;
      const thick = ns ? .4 * cw : .4 * ch, seed = kit.hashStr(f.id);
      // (which end is a door's pier, and which carries the open door leaf, is the layout's: vale-oldwood.json walls)
      const end = p => p === a0 ? 'a' : 'b';   // ('a' is the first point of the wall's line in the file)
      const isPier = p => (f.pier || []).includes(end(p)), isDoor = p => (f.door || []).includes(end(p));
      const n = ns ? Math.max(1, Math.round(Math.abs(Bq.y - A.y) / ch)) : 1;
      for (let i = 0; i < n; i++) {
        const P0 = { x: A.x + (Bq.x - A.x) * i / n, y: A.y + (Bq.y - A.y) * i / n }, P1 = { x: A.x + (Bq.x - A.x) * (i + 1) / n, y: A.y + (Bq.y - A.y) * (i + 1) / n };
        // the foot this piece sorts by and stands on: the south face of its block (inside the block, so the feet meet brick)
        const ft = { x: Math.round((P0.x + P1.x) / 2), y: Math.round(Math.max(P0.y, P1.y) + (ns ? 0 : thick / 2) - 1) };
        const lp = p => ({ x: p.x - ft.x, y: p.y - ft.y });
        const pier = []; if (i === 0 && isPier(A)) pier.push('a'); if (i === n - 1 && isPier(Bq)) pier.push('b');
        const door = i === 0 && isDoor(A) ? 'a' : i === n - 1 && isDoor(Bq) ? 'b' : null;
        const la = lp(P0), lb = lp(P1), x0 = Math.round(Math.min(la.x, lb.x) - 44), x1 = Math.round(Math.max(la.x, lb.x) + 44), y0 = Math.round(Math.min(la.y, lb.y) - h - 30);
        thing({ key: 'ow-brick|' + f.id + '|' + i + '|' + C.season, x: ft.x, y: ft.y, box: [x0, y0, x1, 10], K: 1.1, draw: B => brickRun(B, kit.rng(seed + i), la, lb, h, thick, C.season, { pier, door, ns }) });
      }
    }
  }


  /* ---------- the old woodland's buildings to the size standard (layout round 3 fixes, rule 14) ----------
   * They join GardenPaintedMarks' landmark table, so each stands as one painted sprite on its own foot, on the footprint
   * the layout gives it (vale-oldwood.json staticMoves): the watchtower 6.5 H on 3 x 2, the chapel's gable 3.6 H with its
   * empty bell-cote on 4 x 2, Hollin's hut a turf ridge of 2.8 H on 2 x 2, the ice house a turf bank 1.7 H on 3 x 2 with
   * its stone portal and frosted door let into it. Every door is 1.25 H, on the door cell. Only rendering. */
  (function marks() {
    const M = window.GardenPaintedMarks, TK = () => window.GardenPaintTerrainKit; if (!M || !M.ART) return;
    const H = typeof GARDEN_H === 'number' ? GARDEN_H : 41.4, DOOR = Math.round(H * 1.25);
    const ST = { body: '#a39d8b', lo: '#7b7666', hi: '#cbc5b1', dk: '#4f4b40', moss: '#6f8446', mossHi: '#93a85a', ivy: '#3f5e30', ivyHi: '#5f8442' };
    const GR = s => s === 'winter' ? ['#b8c2b0', '#d8dfd2', '#9aa696'] : s === 'autumn' ? ['#8a9a4e', '#a8b060', '#6e7e3e'] : ['#6f9a48', '#8fb45a', '#55783a'];
    const courses = (B, r, x0, x1, y0, y1, step, op) => { for (let y = y1 - step, row = 0; y > y0; y -= step, row++) { B.s(`M${x0} ${y}H${x1}`, ST.dk, .8, op); for (let x = x0 + (row & 1) * step; x < x1; x += step * 1.7 + r() * step) B.s(`M${x} ${y}v${step}`, ST.dk, .7, op * .8); } };
    const ivy = (B, r, x, top, len, s) => { if (s === 'winter') return; B.s(`M${x} ${top}q${(r() - .5) * 10} ${len * .5} ${(r() - .5) * 6} ${len}`, '#4a3a2a', 1.2, .7); for (let k = 0; k < len / 3; k++) B.f(B.blob(r, x + (r() - .5) * 12, top + r() * len, 3 + r() * 2.4, 2.2, 6, .5), r() < .5 ? ST.ivy : ST.ivyHi, .95); };
    const foot = (B, r, w, s) => { const g = GR(s); B.tufts(r, -w * .3, 0, w * .5, Math.round(w / 6), [g[0], g[1]], 7).tufts(r, w * .3, 0, w * .5, Math.round(w / 6), [g[0], g[2]], 7); };
    const arch = (x, y, w, h) => `M${x - w / 2} ${y}V${y - h + w * .62}Q${x - w / 2} ${y - h} ${x} ${y - h}Q${x + w / 2} ${y - h} ${x + w / 2} ${y - h + w * .62}V${y}Z`;

    // the watchtower: a square tower of grey stone, its top broken, a rowan grown out of it, the door at its foot
    M.ART['ld-tower'] = { box: [-92, -312, 96, 16], door: { dx: 0, dy: 0 }, draw(B, o) {
      const r = TK().rng(311), s = o.season, w = 62, side = 20, top = -268, g = GR(s);
      B.shadow(10, 2, 96, 13, .36);
      // a plinth of big blocks the whole width of its ground
      B.f(B.rect(-w - 8, -14, (w + 8) * 2 + side * .6, 14), ST.lo).f(B.rect(-w - 8, -14, (w + 8) * 2, 3), ST.hi, .8);
      for (let x = -w - 8; x < w + 8; x += 17 + r() * 6) B.s(`M${x} -14v14`, ST.dk, .9, .6);
      // the east face, in shade, and the south face, lit
      B.f(B.poly([[w, -14], [w + side, -22], [w + side, top - 8], [w, top]]), B.lin(0, top, 0, 0, [[0, '#8e8878'], [1, '#5e5a4c']]));
      B.f(B.rect(-w, top, w * 2, -top - 14), B.lin(-w, 0, w, 0, [[0, ST.hi], [.4, ST.body], [1, ST.lo]]));
      courses(B, r, -w, w, top, -14, 9, .35);
      B.cx.save(); B.cx.clip(new Path2D(B.poly([[w, -14], [w + side, -22], [w + side, top - 8], [w, top]]))); for (let y = -22; y > top; y -= 9) B.s(`M${w} ${y + 6}L${w + side} ${y - 2}`, ST.dk, .7, .3); B.cx.restore();
      // quoins at the corners
      for (let y = -14, k = 0; y > top + 6; y -= 13, k++) { B.f(B.rect(-w, y - 12, k & 1 ? 16 : 10, 12), ST.hi, .55); B.f(B.rect(w - (k & 1 ? 16 : 10), y - 12, k & 1 ? 16 : 10, 12), ST.lo, .5); }
      // the broken top: a ragged parapet, crenels on the west, tumbled to the east; a rowan in the gap
      const crest = [[-w - 2, top], [-w - 2, top - 22], [-w + 14, top - 22], [-w + 14, top - 10], [-w + 26, top - 10], [-w + 26, top - 24], [-w + 42, top - 24], [-w + 44, top - 8], [-6, top - 2], [8, top + 10], [20, top + 4], [34, top + 14], [48, top + 6], [w + 2, top + 12], [w + side, top + 4], [w + side, top - 8], [w, top]];
      B.f(B.poly(crest), ST.body).s(B.line(crest.slice(1, 15)), ST.hi, 1.6, .8);
      if (s !== 'winter') { B.s(`M10 ${top + 6}q-6 -24 -2 -44`, '#5a4232', 2.6); for (let k = 0; k < 9; k++) B.f(B.blob(r, 4 + (r() - .5) * 34, top - 40 + (r() - .5) * 26, 10, 7, 7, .4), k < 4 ? g[2] : g[0], .95); if (s === 'autumn' || s === 'summer') for (let k = 0; k < 8; k++) B.f(B.circ(4 + (r() - .5) * 30, top - 34 + (r() - .5) * 20, 2), '#c8402a'); }
      for (let k = 0; k < 6; k++) B.stone(r, 22 + r() * 40, top + 10 + r() * 6, 5 + r() * 3, 3.4, { rock: ST.body, rockLo: ST.lo, rockHi: ST.hi, rockDk: ST.dk }, r() < .5 ? ST.moss : null);
      // arrow slits, an upper window with a broken mullion, a string course
      for (const [x, y] of [[-30, -150], [30, -150], [0, -96]]) B.f(B.rr(x - 3, y - 22, 6, 22, 2), '#26241e').f(B.rect(x - 7, y, 14, 3), ST.hi, .7);
      B.f(arch(0, -200, 26, 40), '#24221c').s('M0 -200V-236', ST.body, 3).f(B.rect(-15, -200, 30, 4), ST.hi, .8);
      B.f(B.rect(-w, -178, w * 2, 5), ST.lo).f(B.rect(-w, -178, w * 2, 1.6), ST.hi);
      // the door: a pointed arch 1.25 H, oak planks with iron bands, a worn step
      B.f(arch(0, -14, 34, DOOR + 6), ST.hi).f(arch(0, -14, 26, DOOR), '#5a4228').f(arch(-3, -14, 10, DOOR - 6), '#7a5a38', .55);
      for (const y of [-26, -46]) B.s(`M-13 ${y}H13`, '#2e2a26', 1.8, .9);
      B.f(B.circ(8, -36, 1.6), '#c8a23a');
      B.f(B.rr(-22, -7, 44, 7, 2), ST.lo).f(B.rr(-22, -7, 44, 2.4, 1), ST.hi);
      // ivy up the west side, moss on ledges, ferns at the foot
      ivy(B, r, -w + 6, -230, 200, s); ivy(B, r, w - 10, -120, 100, s);
      for (let k = 0; k < 10; k++) B.f(B.blob(r, -w + r() * w * 2, -20 - r() * 230, 4, 1.6, 6, .5), s === 'winter' ? '#e8ece6' : ST.moss, .55);
      foot(B, r, 150, s);
    } };

    // the chapel: roofless, its south wall with two tall empty lancets, the east gable with its empty bell-cote, a low door
    M.ART['ld-chapel'] = { box: [-112, -200, 120, 16], door: { dx: 24, dy: 0 }, draw(B, o) {
      const r = TK().rng(313), s = o.season, x0 = -94, x1 = 52, eave = -84, gx0 = 52, gx1 = 96, ridge = -150, g = GR(s);
      B.shadow(4, 2, 108, 12, .34);
      // the inside of the nave seen over the broken wall: grass and a fallen bench
      B.f(B.poly([[x0 + 6, eave + 10], [x1, eave + 6], [x1 + 8, eave - 8], [x0 + 14, eave - 6]]), g[0], .9);
      // the south wall, its top broken in steps
      const wallTop = [[x0, 0], [x0, eave + 22], [x0 + 18, eave + 14], [x0 + 30, eave + 2], [x0 + 60, eave], [x0 + 74, eave + 16], [x0 + 92, eave + 8], [x0 + 118, eave - 2], [x1, eave], [x1, 0]];
      B.f(B.poly(wallTop), B.lin(0, eave, 0, 0, [[0, ST.hi], [.6, ST.body], [1, ST.lo]]));
      courses(B, r, x0, x1, eave - 4, 0, 8.5, .3);
      B.s(B.line(wallTop.slice(1, 9)), ST.hi, 1.6, .9);
      for (const x of [x0 + 26, x0 + 104]) { B.f(arch(x, -24, 20, 52), '#2a2a24').f(arch(x, -24, 20, 52), '#3a4a3a', .4).s(arch(x, -24, 24, 56), ST.hi, 2, .8); }
      // the east gable end: a pointed gable to the ridge, a tall window, the bell-cote with its empty arch on top
      B.f(B.poly([[gx0, 0], [gx0, eave], [(gx0 + gx1) / 2, ridge], [gx1, eave], [gx1, 0]]), B.lin(gx0, 0, gx1, 0, [[0, ST.body], [1, ST.lo]]));
      courses(B, r, gx0, gx1, ridge, 0, 8.5, .28);
      B.s(`M${gx0 - 3} ${eave + 2}L${(gx0 + gx1) / 2} ${ridge - 3}L${gx1 + 3} ${eave + 2}`, ST.hi, 3.2, .9);
      const cx = (gx0 + gx1) / 2;
      B.f(B.rect(cx - 10, ridge - 34, 20, 34), ST.body).f(B.poly([[cx - 13, ridge - 34], [cx, ridge - 48], [cx + 13, ridge - 34]]), ST.lo).f(arch(cx, ridge - 6, 10, 22), '#2a2a24');
      B.s(`M${cx} ${ridge - 48}v-8M${cx - 4} ${ridge - 53}h8`, ST.dk, 2);
      B.f(arch(cx, -40, 18, 62), '#2a2a24').s(arch(cx, -40, 22, 66), ST.hi, 2, .8).s(`M${cx} -40V-96`, ST.body, 2.4);
      // the door in the south wall: a low pointed arch 1.25 H, oak, a step
      B.f(arch(24, -2, 34, DOOR + 6), ST.hi).f(arch(24, -2, 26, DOOR), '#5a4228').f(arch(21, -2, 10, DOOR - 6), '#7a5a38', .55).s('M11 -18H37M11 -38H37', '#2e2a26', 1.6, .9).f(B.circ(32, -26, 1.6), '#c8a23a');
      B.f(B.rr(8, -5, 32, 5, 2), ST.lo).f(B.rr(8, -5, 32, 2, 1), ST.hi);
      // buttresses, ivy, moss, a fallen stone or two at the foot
      for (const x of [x0 - 4, x0 + 64]) B.f(B.poly([[x, 0], [x, eave + 30], [x + 10, eave + 40], [x + 10, 0]]), ST.lo).f(B.rect(x, eave + 30, 3, -eave - 30), ST.hi, .5);
      ivy(B, r, x0 + 8, eave + 20, 64, s); ivy(B, r, gx1 - 8, eave - 4, 80, s); ivy(B, r, x0 + 80, eave + 12, 50, s);
      for (let k = 0; k < 4; k++) B.stone(r, x0 - 8 + r() * 40, -4, 6 + r() * 4, 4, { rock: ST.body, rockLo: ST.lo, rockHi: ST.hi, rockDk: ST.dk }, r() < .5 ? ST.moss : null);
      foot(B, r, 200, s);
    } };

    // Hollin's hut: low stone walls, a thick turf roof down to the eaves, a stone chimney with a curl of smoke, a lit window
    M.ART['ld-woodhut'] = { box: [-70, -150, 74, 14], door: { dx: 24, dy: 0 }, draw(B, o) {
      const r = TK().rng(317), s = o.season, w = 46, eave = -66, ridge = -118, g = GR(s);
      B.shadow(4, 2, 62, 10, .34);
      B.f(B.rect(-w, eave, w * 2, -eave), B.lin(-w, 0, w, 0, [[0, ST.hi], [.5, ST.body], [1, ST.lo]]));
      for (let y = -6, row = 0; y > eave; y -= 9, row++) for (let x = -w + (row & 1) * 7; x < w - 4; x += 12 + r() * 5) B.stone(r, x + 6, y, 6 + r() * 1.5, 4, { rock: ST.body, rockLo: ST.lo, rockHi: ST.hi, rockDk: ST.dk }, null);
      // the chimney on the west end, then the turf roof over the walls: thick, lumpy, grass and a few flowers on it
      B.f(B.rect(-w + 6, ridge - 10, 14, 56), ST.lo).f(B.rect(-w + 6, ridge - 10, 5, 56), ST.hi, .6).f(B.rect(-w + 4, ridge - 14, 18, 5), ST.dk);
      if (s !== 'summer') for (let k = 0; k < 4; k++) B.f(B.ell(-w + 13 - k * 4, ridge - 22 - k * 11, 6 + k * 2, 4 + k), '#e8e8e2', .35 - k * .07);
      const roof = `M${-w - 10} ${eave + 4}Q${-w} ${ridge + 18} -2 ${ridge}Q${w} ${ridge + 18} ${w + 10} ${eave + 4}Q0 ${eave + 12} ${-w - 10} ${eave + 4}Z`;
      B.f(roof, s === 'winter' ? '#e8ece6' : g[2]).f(`M${-w - 6} ${eave}Q${-w + 4} ${ridge + 20} -2 ${ridge + 4}Q${-12} ${ridge + 24} ${-w + 10} ${eave - 2}Z`, s === 'winter' ? '#f6f8f4' : g[1], .8);
      B.s(`M${-w - 10} ${eave + 4}Q0 ${eave + 12} ${w + 10} ${eave + 4}`, '#4a3a26', 3, .85);
      if (s !== 'winter') { for (let k = 0; k < 26; k++) { const t = r(), x = -w + t * w * 2, y = eave - 6 - Math.sin(t * Math.PI) * (eave - ridge - 14) * r(); B.s(`M${x} ${y}l${(r() - .5) * 3} -5`, g[k % 2], 1, .9); } for (let k = 0; k < 6; k++) B.f(B.circ(-w + r() * w * 2, eave - 10 - r() * 30, 1.6), s === 'autumn' ? '#d8a040' : '#f4f0e0'); }
      // a small window, warm, west of the door; the door at its cell, 1.25 H, a plank step
      B.f(B.rect(-30, -50, 20, 16), '#3a3024').f(B.rect(-28.5, -48.5, 17, 13), B.lin(0, -48, 0, -36, [[0, '#f2dc9a'], [1, '#d8a85a']])).s('M-20 -48.5v13M-28.5 -42h17', '#3a3024', 1.4);
      B.f(B.rect(24 - 14, -DOOR, 28, DOOR), '#3a2c1e').f(B.rect(24 - 12, -DOOR + 2, 24, DOOR - 2), B.lin(12, 0, 36, 0, [[0, '#8a6a46'], [1, '#6a5034']]));
      B.s(`M18 ${-DOOR + 2}v${DOOR - 2}M24 ${-DOOR + 2}v${DOOR - 2}M30 ${-DOOR + 2}v${DOOR - 2}`, '#4e3a26', .8, .7).f(B.circ(32, -26, 1.4), '#c8a23a');
      B.f(B.rr(6, -5, 36, 5, 2), '#7a5a3a');
      foot(B, r, 110, s);
    } };

    // the ice house: a turf bank, its round top grown over, a stone portal let into its south face, a frosted door
    M.ART['ld-icehouse'] = { box: [-96, -96, 100, 16], door: { dx: 0, dy: 0 }, draw(B, o) {
      const r = TK().rng(319), s = o.season, g = GR(s), top = -72;
      B.shadow(0, 2, 92, 12, .3);
      // the bank: a broad mound that runs out into the ground on both sides
      const bank = `M-92 2Q-84 -20 -56 ${top + 30}Q-30 ${top - 4} 0 ${top}Q30 ${top - 4} 56 ${top + 30}Q84 -20 92 2Q0 8 -92 2Z`;
      B.f(bank, s === 'winter' ? '#d8ded4' : g[2]).f(`M-80 0Q-70 -24 -46 ${top + 26}Q-22 ${top + 2} 6 ${top + 4}Q-20 ${top + 16} -36 ${top + 40}Q-56 -14 -62 0Z`, s === 'winter' ? '#f2f4f0' : g[1], .75);
      if (s !== 'winter') for (let k = 0; k < 40; k++) { const t = r(), x = -84 + t * 168, y = 2 - Math.sin(t * Math.PI) * (-top - 4) * (.3 + r() * .7); B.s(`M${x} ${y}l${(r() - .5) * 3} -6`, g[k % 3], 1, .85); }
      // the portal: a stone face with an arch, a keystone, the door 1.25 H frosted grey-blue, iron straps, rime at its foot
      B.f(B.poly([[-32, 2], [-32, -50], [-24, -64], [24, -64], [32, -50], [32, 2]]), B.lin(-32, 0, 32, 0, [[0, ST.hi], [.6, ST.body], [1, ST.lo]]));
      courses(B, r, -32, 32, -62, 2, 8, .3);
      B.f(arch(0, 2, 32, DOOR + 6), ST.hi).f(arch(0, 2, 24, DOOR), '#6f8a96').f(arch(-3, 2, 9, DOOR - 6), '#9ab4be', .55);
      for (let k = 1; k < 4; k++) B.s(`M${-12 + k * 6} ${2 - DOOR + 8}V2`, '#4e626c', .8, .7);
      for (const y of [-12, -34]) B.s(`M-12 ${y}H12`, '#2e3438', 1.8, .9);
      B.f(B.poly([[-5, -DOOR - 6], [5, -DOOR - 6], [4, -DOOR + 2], [-4, -DOOR + 2]]), ST.hi).f(B.rect(-34, -66, 68, 4), ST.lo, .8);
      for (let k = 0; k < 14; k++) B.f(B.circ(-11 + r() * 22, -2 - r() * 10, .9 + r()), '#f4fbff', .85);
      // ferns either side of the portal, a few stones fallen from the bank
      if (s !== 'winter') for (const x of [-42, 40]) for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .4; B.s(`M${x} 0q${Math.cos(a) * 8} ${Math.sin(a) * 6} ${Math.cos(a) * 16} ${Math.sin(a) * 16}`, g[2], 2.4, .9); }
      for (let k = 0; k < 3; k++) B.stone(r, -60 + r() * 120, -4, 5 + r() * 3, 3.4, { rock: ST.body, rockLo: ST.lo, rockHi: ST.hi, rockDk: ST.dk }, r() < .5 ? ST.moss : null);
      foot(B, r, 180, s);
    } };
  })();


  /** Where an old wall stops short of nothing (the postern wall's south end, out in the grass), it tumbles into a heap of its
   *  own stones, mossy and grown through with fern, and the heap is what stops the feet past the wall's end. */
  function wallEnds(C) {
    const { L, thing, kit } = C;
    // (the last piece of the postern wall: the wall is laid in short pieces, numbered from the north)
    const last = (L.D.landforms || []).filter(f => /^postern-wall-\d+$/.test(f.id)).sort((p, q) => +q.id.split('-')[2] - +p.id.split('-')[2])[0];
    for (const f of last ? [last] : []) {
      if (!f.polygon) continue;
      const n = f.polygon.length >> 1, a = f.polygon[n - 1], b = f.polygon[n], e = L.pt([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + .32]), seed = kit.hashStr(f.id + '|end');
      thing({ key: 'ow-wallend|' + f.id + '|' + C.season, x: Math.round(e.x), y: Math.round(e.y), box: [-34, -34, 34, 6], foot: [-22, 22, 9], draw: B => {
        const r = kit.rng(seed);
        B.shadow(2, 0, 26, 4, .3);
        for (let k = 0; k < 11; k++) { const t = k / 10, x = -16 + t * 32 + (r() - .5) * 4, y = -1 - Math.sin(t * Math.PI) * (6 + r() * 6); B.stone(r, x, y, 5.5 + r() * 2.5, 3.6 + r() * 1.2, { rock: STONE.body, rockLo: STONE.lo, rockHi: STONE.hi, rockDk: STONE.dk }, r() < .5 ? STONE.moss : null); }
        for (let k = 0; k < 4; k++) B.stone(r, -8 + r() * 16, -14 - r() * 6, 5 + r() * 2, 3.4, { rock: STONE.body, rockLo: STONE.lo, rockHi: STONE.hi, rockDk: STONE.dk }, r() < .6 ? STONE.moss : null);
        if (C.season !== 'winter') { for (const x of [-18, 16]) for (let k = 0; k < 4; k++) { const ang = -Math.PI / 2 + (k - 1.5) * .45; B.s(`M${x} -1q${Math.cos(ang) * 6} ${Math.sin(ang) * 5} ${Math.cos(ang) * 12} ${Math.sin(ang) * 12}`, '#4f7436', 2, .9); } B.tufts(r, 0, -1, 30, 6, ['#566e30', '#7d9a4e'], 6); }
      } });
    }
  }

  /** The court's well head and the plan's benches, and the two secrets (critic 2: listed in the plan, never drawn).
   *  The well head is a ring of dressed stone half your height with a worn oak windlass over it, moss in its joints, on its
   *  own flags; a bench is an oak plank on two stone ends, its seat a third of your height, ferns at its feet; the carved
   *  birds are three small grey stones by Hollin's track, each with a wren cut into its face; the bell's bronze rim shows
   *  through the pond water as a dull green-gold arc. Each stands on its own foot (the well and the benches stop the feet). */
  function courtThings(C) {
    const { L, thing, add, kit } = C, ow = L.pres.oldwood; if (!ow) return;
    const H = Hpx(), season = C.season, wint = season === 'winter', S = { rock: STONE.body, rockLo: STONE.lo, rockHi: STONE.hi, rockDk: STONE.dk };
    if (Array.isArray(ow.wellHead)) {
      const p = L.cpt(ow.wellHead[0], ow.wellHead[1]), rw = 19, hh = Math.round(H * .5);
      thing({ key: 'ow-well|' + season, x: Math.round(p.x), y: Math.round(p.y + 7), box: [-34, -hh - 46, 34, 10], foot: [-20, 20, 12], draw: B => {
        const r = kit.rng(811);
        B.shadow(3, 1, 30, 7, .34);
        B.f(B.ell(0, -2, rw + 7, 9), '#8a8676', .9).f(B.ell(0, -3, rw + 5, 7.5), '#b4ae98', .8);   // its flags
        // the drum: front half of a stone ring, coursed, lit from the left
        B.f(`M${-rw} ${-7}L${-rw} ${-hh}A${rw} 6 0 0 0 ${rw} ${-hh}L${rw} ${-7}A${rw} 6 0 0 1 ${-rw} ${-7}Z`, B.lin(-rw, 0, rw, 0, [[0, STONE.hi], [.45, STONE.body], [1, STONE.lo]]));
        for (let y = -12; y > -hh; y -= 6.5) B.s(`M${-rw} ${y}A${rw} 6 0 0 0 ${rw} ${y}`, STONE.dk, .8, .45);
        for (let k = 0; k < 7; k++) { const a = Math.PI * (.1 + k * .13), x = -Math.cos(a) * rw, y = -hh + 4 + (k & 1) * 6.5 + Math.sin(a) * 6; B.s(`M${x} ${y}v6`, STONE.dk, .7, .4); }
        B.f(B.ell(0, -hh, rw, 6), STONE.hi).f(B.ell(0, -hh + .5, rw - 4, 4), '#1e2420').f(B.ell(2, -hh + 1.5, rw - 9, 2), '#3e5a5e', .7);   // the coping and the dark water down in it
        if (!wint) { B.f(B.blob(r, -10, -hh + 1, 7, 2, 6, .5), STONE.moss, .8); B.f(B.blob(r, rw - 4, -14, 3, 5, 6, .5), STONE.moss, .6); }
        // the windlass: two oak posts, a roller with rope, a small pitched roof of shingles
        for (const x of [-rw + 2, rw - 2]) B.f(B.rr(x - 2.2, -hh - 34, 4.4, 34, 1.2), '#6a4a30').f(B.rect(x - 2.2, -hh - 34, 1.6, 34), '#8a6a46', .7);
        B.f(B.rr(-rw + 2, -hh - 22, rw * 2 - 4, 5, 2.4), '#7a5a3a').s(`M-3 ${-hh - 18}V${-hh - 4}`, '#c8b48a', 1.3, .9).f(B.rr(-5, -hh - 8, 8, 7, 1.5), '#5a4028');
        B.f(`M${-rw - 6} ${-hh - 30}L0 ${-hh - 44}L${rw + 6} ${-hh - 30}Z`, wint ? '#eef2f0' : '#6a5440').s(`M${-rw - 6} ${-hh - 30}L0 ${-hh - 44}L${rw + 6} ${-hh - 30}`, '#3e2e20', 1.4, .9);
        for (let k = 1; k < 4; k++) B.s(`M${-rw - 6 + k * 5.5} ${-hh - 30 - k * 3.4}h${(rw + 6 - k * 5.5) * 2}`, '#3e2e20', .6, .45);
        if (!wint) B.tufts(r, 0, 1, 50, 9, ['#566e30', '#7d9a4e'], 6);
      } });
    }
    (ow.benches || []).slice(0, 2).forEach(([bx, by], i) => {   // (the third, on the west shore, lay on a plot's edge: left out)
      const p = L.cpt(bx, by), seat = Math.round(H * .32);
      thing({ key: 'ow-bench|' + i + '|' + season, x: Math.round(p.x), y: Math.round(p.y + 6), box: [-36, -seat - 22, 36, 8], foot: [-24, 24, 7], draw: B => {
        const r = kit.rng(830 + i);
        B.shadow(1, 1, 30, 5, .32);
        for (const x of [-20, 14]) { B.f(B.rr(x, -seat, 7, seat, 1.5), STONE.lo).f(B.rr(x, -seat, 3, seat, 1.2), STONE.hi, .7); }
        B.f(B.rr(-26, -seat - 4, 52, 6, 2), '#7a5a3a').f(B.rr(-26, -seat - 4, 52, 2, 1), '#a07a50', .8).s(`M-24 ${-seat + 1}h48`, '#4a3424', .8, .6);
        B.f(B.rr(-25, -seat - 18, 50, 5, 2), '#6e5034').f(B.rr(-25, -seat - 18, 50, 1.6, 1), '#96704a', .7);
        for (const x of [-19, 17]) B.f(B.rect(x, -seat - 14, 3, 11), '#5a4028');
        if (!wint) { B.tufts(r, -16, 1, 14, 5, ['#4f7436', '#7d9a4e'], 7); B.tufts(r, 18, 1, 14, 5, ['#4f7436', '#7d9a4e'], 7); }
      } });
    });
    (ow.carvedBirds || []).forEach(([sx, sy], i) => {
      const p = L.cpt(sx, sy);
      thing({ key: 'ow-birdstone|' + i + '|' + season, x: Math.round(p.x), y: Math.round(p.y), box: [-16, -24, 16, 6], foot: [-9, 9, 5], draw: B => {
        const r = kit.rng(850 + i);
        B.shadow(1, 1, 11, 3, .3);
        B.f('M-9 1Q-11 -12 -6 -17Q0 -21 6 -17Q11 -12 9 1Z', STONE.body).f('M-9 1Q-11 -12 -6 -17Q-2 -19 0 -19L-2 1Z', STONE.hi, .45).f('M4 -16Q10 -12 9 1L5 1Z', STONE.lo, .55);
        // a wren cut into its face: a round body, a cocked tail, a dot of an eye
        B.s('M-4 -7Q-4 -12 0 -12Q4 -12 4 -8Q4 -5 0 -5Q-3 -5 -4 -7ZM3.6 -9L6.4 -13.4M-4 -8L-6 -9', STONE.dk, 1, .85).f(B.circ(-1.6, -10, .7), STONE.dk);
        if (!wint) { B.f(B.blob(r, -5, -1, 4, 1.6, 6, .5), STONE.moss, .7); B.tufts(r, 0, 1, 18, 5, ['#566e30', '#7d9a4e'], 5); }
      } });
    });
    if (Array.isArray(ow.bellRim)) {
      const c = L.cpt(ow.bellRim[0], ow.bellRim[1]);
      add([c.x - 30, c.y - 16, c.x + 30, c.y + 16], 870, B => { B.cx.save(); B.cx.filter = 'blur(1.4px)'; B.s(`M${c.x - 16} ${c.y + 4}A16 7 0 0 1 ${c.x + 16} ${c.y + 4}`, '#6a7a3e', 4, .5); B.s(`M${c.x - 12} ${c.y + 2}A12 5 0 0 1 ${c.x + 6} ${c.y - 2}`, '#c8b060', 1.6, .45); B.cx.restore(); });
    }
  }

  /** Hollin's track (critic 2: it read as one more sandy trail): worn earth, not a laid path. Dark trodden soil with soft
   *  edges and the turf growing in over them, a paler packed line where feet go, leaf litter, a root or two across it,
   *  and no hard edge cut in the turf (a soft route, V.softRoutes). Painted with the garden walk, after the fields. */
  function hollinsTrack(C) {
    const { L, P, add, kit } = C, id = 'hollins-track', route = L.routes.get(id), pts = L.routePts(id); if (!route || pts.length < 2) return;
    const W = L.W, cw = L.cw, ch = L.ch, qs = V.walk(pts, 5), n = qs.length; if (n < 3) return;
    const half = q => gardenIslandRouteWidthAt(route, q.x / cw, (q.y - W.sky) / ch) * .46 * Math.hypot(q.ty * cw, q.tx * ch);
    const rib = (k, grow) => { const l = [], rr = []; qs.forEach((q, j) => { const e = Math.min(1, (j + .5) / 3, (n - 1 - j + .5) / 3), h = Math.max(.6, (half(q) * k + grow) * e); l.push({ x: q.x - q.ty * h, y: q.y + q.tx * h }); rr.push({ x: q.x + q.ty * h, y: q.y - q.tx * h }); }); return B => B.poly(l.concat(rr.reverse())); };
    const autumn = C.season === 'autumn', wint = C.season === 'winter';
    add(kit.bboxOf(pts, 40), 977, (B, r) => {
      B.cx.filter = 'blur(5px)'; B.f(rib(1.15, 4)(B), wint ? '#c8cabc' : '#5e5a36', .45);
      B.cx.filter = 'blur(3px)'; B.f(rib(.9, 0)(B), wint ? '#d4d2c4' : '#6e5a3a', .9);
      B.cx.filter = 'blur(2px)'; B.f(rib(.42, 0)(B), wint ? '#e2e0d4' : '#8e7650', .55); B.cx.filter = 'none';
      qs.forEach((q, i) => {
        const h = half(q);
        for (let k = 0; k < 3; k++) { const o = (r() - .5) * 1.7 * h; B.f(B.ell(q.x - q.ty * o, q.y + q.tx * o, 1 + r() * 1.4, .7 + r() * .6), r() < .5 ? '#4a3c26' : autumn ? '#b8642a' : '#9a8458', .6); }   // grit and leaf litter
        for (const sd of [-1, 1]) { if (r() < .35) continue; const o = (h - r() * 4) * sd, x = q.x - q.ty * o, y = q.y + q.tx * o, hh = 3 + r() * 5; B.s(`M${x} ${y + 1}q${(r() - .5) * 2} ${-hh * .5} ${(r() - .5) * 4} ${-hh}`, wint ? '#9aa696' : r() < .5 ? P.lawnLo : '#6f8a40', 1.1, .8); }   // turf growing in
        if (i % 13 === 6 && !wint) {   // a root across it, from the turf on one side, sinking into the earth before the other
          const a = -q.ty, b = q.tx, o = h * .95, x0 = q.x + a * o, y0 = q.y + b * o, x1 = q.x - a * o * .2 + q.tx * 4, y1 = q.y - b * o * .2 + q.ty * 4, mx = (x0 + x1) / 2 + q.tx * 5, my = (y0 + y1) / 2 + q.ty * 5;
          B.s(`M${x0} ${y0}Q${mx} ${my} ${x1} ${y1}`, '#4e3a26', 3, .7).s(`M${x0} ${y0 - 1}Q${mx} ${my - 1} ${x1} ${y1 - 1}`, '#9a7a52', 1, .55);
        }
      });
    });
  }
  V.softRoutes.add('hollins-track');

  /** The walled garden's walk (critic 2): a raked gravel walk as wide as the route, between the green doors, edged both sides
   *  with a low line of clipped box, its ends running out under the door gaps. Painted after the fields (see below), so the
   *  garden's flowers grow beside it and never across it. */
  /** The watchtower's doorstep (critic 2: its forecourt was a flat pale pad with rounded corners on the grass): big worn
   *  flags laid loose before the door, turf and moss in their joints, the outer ones half sunk in the grass, so the bare
   *  doorway ground under them never shows its square edge. */
  function towerStep(C) {
    const { L, add, kit } = C, t = L.stat('ld-tower'); if (!t || !t.apron || !t.door) return;
    const a = t.apron, c = L.cpt(t.door.x + .5, t.y + t.h + .65), wint = C.season === 'winter', bw = Math.min(2.8, t.w + .4) * L.cw, bh = 1.25 * L.ch;
    add([c.x - bw, c.y - bh, c.x + bw, c.y + bh], 991, (B, r) => {
      B.cx.save(); B.cx.filter = 'blur(4px)'; B.f(B.ell(c.x, c.y, bw * .55, bh * .58), wint ? '#c8ccc2' : '#7e7a52', .9); B.cx.filter = 'none'; B.cx.restore();   // trodden earth and moss between the flags, soft at its edge
      const flags = []; for (let row = -1; row <= 1; row++) for (let k = -2; k <= 2; k++) { const x = c.x + k * 21 + (row & 1) * 10 + (r() - .5) * 5, y = c.y + row * 13 + (r() - .5) * 3, e = Math.hypot((x - c.x) / (bw * .5), (y - c.y) / (bh * .5)); if (e < 1.02) flags.push([x, y, e]); }
      for (const [x, y, e] of flags) { const w = 9 + r() * 2, h = 5.4 + r(), sunk = e > .72; B.f(B.blob(r, x, y + 1.2, w, h, 7, .14), '#4e4a3e', .5).f(B.blob(r, x, y, w * (sunk ? .8 : 1), h * (sunk ? .8 : 1), 7, .14), sunk ? '#9a9684' : '#b4ae98').f(B.blob(r, x - 2, y - 1.6, w * .5, h * .4, 6, .3), '#d0cab4', .55); if (!wint && r() < .4) B.f(B.blob(r, x + w * .4, y + h * .3, 3, 1.6, 6, .5), STONE.moss, .7); }
      if (!wint) B.tufts(r, c.x, c.y + bh * .45, bw * .9, 14, ['#566e30', '#7d9a4e'], 5);
    });
  }
  /** The ruin court's edge (critic 2: a flat pale ellipse with a hard cut edge): the outer flags broken and sunk, turf and
   *  moss creeping in over the rim in soft tongues, so the court lies in the grass rather than on it. */
  function courtEdge(C) {
    const { L, add, kit } = C, rt = L.routes.get('ruin-court'); if (!rt || !rt.shape) return;
    const loop = V.shapeLoop(L, rt.shape, 6), bb = kit.bboxOf(loop, 30), wint = C.season === 'winter', grass = wint ? '#d8dcd4' : '#7c9a4a', moss = wint ? '#c8ccc2' : '#6f8446';
    add(bb, 993, (B, r) => {
      B.cx.save(); B.cx.clip(new Path2D(B.poly(loop)));
      B.cx.filter = 'blur(5px)'; V.strokePts(B, loop.concat([loop[0]]), grass, 22, .55); B.cx.filter = 'none';
      for (let i = 0; i < loop.length; i += 2) { const p = loop[i], q = loop[(i + 1) % loop.length], c = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; if (r() < .55) B.f(B.blob(r, c.x + (r() - .5) * 8, c.y + (r() - .5) * 6, 7 + r() * 9, 3 + r() * 4, 7, .45), r() < .5 ? grass : moss, .75); }
      B.cx.restore();
      if (!wint) for (let i = 0; i < loop.length; i += 3) { const p = loop[i]; B.tufts(r, p.x, p.y + 2, 16, 4, ['#566e30', '#7d9a4e'], 6); }
    });
  }
  function gardenWalk(C) {
    hollinsTrack(C); towerStep(C); courtEdge(C);
    const { L, add, kit } = C, rt = L.routes.get('garden-walk'); if (!rt) return;
    const rib = V.routeRibbon(L, rt, false), edge = V.routeRibbon(L, rt, true), bb = kit.bboxOf(edge, 16), seed = kit.hashStr('ow-garden-walk'), season = C.season;
    const pts = gardenIslandRoutePath(rt).points.map(p => L.cpt(p.x, p.y)), n = rib.length >> 1, left = rib.slice(0, n), right = rib.slice(n).reverse();
    add(bb, seed, (B, r) => {
      B.cx.save(); B.cx.filter = 'blur(3px)'; B.f(B.poly(edge), '#3e3a26', .22); B.cx.filter = 'none'; B.cx.restore();
      B.f(B.poly(rib), season === 'winter' ? '#d8d6cc' : '#c9b48a').f(B.poly(rib), B.lin(0, bb[1], 0, bb[3], [[0, '#d8c69c'], [1, '#b39e74']]), .55);
      B.cx.save(); B.cx.clip(new Path2D(B.poly(rib)));
      for (let k = 0; k < 520; k++) { const i = Math.floor(r() * (pts.length - 1)), t = r(), a = pts[i], b = pts[i + 1], x = a.x + (b.x - a.x) * t + (r() - .5) * 60, y = a.y + (b.y - a.y) * t + (r() - .5) * 40; B.f(B.circ(x, y, .7 + r() * 1.1), r() < .5 ? '#a8946a' : r() < .8 ? '#e6d8b4' : '#8c7a56', .7); }
      V.strokePts(B, pts, '#a08a60', 7, .18);   // the raked line down its middle, worn by feet
      B.cx.restore();
      if (season === 'winter') return;
      const g0 = L.cpt(22.95, 63), g1 = L.cpt(28.4, 68.25); B.cx.save(); B.cx.beginPath(); B.cx.rect(g0.x, g0.y, g1.x - g0.x, g1.y - g0.y); B.cx.clip();   // (inside the walls only)
      for (const side of [left, right]) {   // a clipped box edging, ankle high, one soft roll of leaf with a lit top
        V.strokePts(B, side, '#2f4a24', 6.5, .95); V.strokePts(B, side.map(p => ({ x: p.x, y: p.y - 2 })), '#4c7034', 4.4, .95); V.strokePts(B, side.map(p => ({ x: p.x, y: p.y - 3.2 })), '#7a9e4c', 1.6, .7);
      }
      B.cx.restore();
    });
  }

  V.parts.push({ id: 'oldwood-brick', compose: brickWalls }, { id: 'oldwood-wallends', compose: wallEnds }, { id: 'oldwood-maze', compose: maze }, { id: 'oldwood-posts', compose: fingerPosts }, { id: 'oldwood-oldman', compose: oldMan }, { id: 'oldwood-court', compose: courtThings });
  // (the garden walk paints over the ground the field painters lay, whose files load after this one: moved to the end of
  //  the list once every painter has joined it)
  setTimeout(() => { const i = V.parts.findIndex(q => q.id === 'oldwood-garden-walk'); if (i >= 0) V.parts.push(V.parts.splice(i, 1)[0]); else V.parts.push({ id: 'oldwood-garden-walk', compose: gardenWalk }); }, 0);
})();

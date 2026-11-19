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
    return { cx, cy, turf: { rx: 2.35, ry: 1.55 }, rings: [{ rx: 2.05, ry: 1.3, gap: 0, half: .36 }, { rx: 1.02, ry: .62, gap: Math.PI, half: .62 }] };
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
        const w = 9.5, h = (ri ? 17 : 20) + Math.sin(i * 1.7) * 1.2;
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

  /** The Old Man: a sea stack out off the shore, in line with the beech ride, gulls on its top. */
  function oldMan(C) {
    const { L, thing, kit } = C, ow = L.pres.oldwood; if (!ow || !Array.isArray(ow.oldMan)) return;
    const p = L.cpt(ow.oldMan[0], ow.oldMan[1] + .9);
    thing({ key: 'ow-oldman|' + C.season, x: Math.round(p.x), y: Math.round(p.y), box: [-50, -160, 50, 18], draw: B => {
      B.cx.save(); B.cx.scale(.7, .7);
      const r = kit.rng(611), R = ['#7e7668', '#5e584e', '#a49a88', '#3e3a34'];
      B.f(B.ell(0, 6, 66, 12), '#e8f4f2', .45).f(B.ell(0, 4, 54, 8), '#3a5a66', .35);   // surf and the dark water round its foot
      B.f('M-46 6Q-50 -40 -36 -90Q-30 -150 -18 -196Q-6 -214 8 -206Q22 -170 30 -120Q44 -60 48 6Z', R[0]);
      B.f('M-46 6Q-50 -40 -36 -90Q-30 -150 -18 -196Q-12 -204 -6 -200Q-16 -150 -20 -90Q-26 -40 -22 6Z', R[2], .55);
      B.f('M20 -150Q32 -100 36 -50Q44 -20 48 6L26 6Q30 -50 20 -150Z', R[1], .6);
      for (let k = 0; k < 9; k++) { const y = -20 - k * 21 + r() * 6, w = 40 - k * 3.4; B.s(`M${-w} ${y}q${w} ${-3 + r() * 4} ${w * 2} ${r() * 4 - 2}`, R[3], 1.4, .45); }
      B.f(B.blob(r, -4, -202, 16, 6, 7, .4), '#6f8446', .9).f(B.blob(r, 8, -196, 10, 4, 6, .4), '#93a85a', .8);   // turf on its top
      for (const [x, y] of [[-6, -212], [6, -208]]) B.f(B.ell(x, y, 4, 2.4), '#f4f4ee').f(B.circ(x + 3, y - 2, 1.6), '#f4f4ee').f(B.rect(x + 4.4, y - 2.4, 2, .8), '#e0a030');
      B.f(B.ell(0, 8, 52, 4), '#f4fbfa', .5);
      B.cx.restore();
    } });
  }

  V.parts.push({ id: 'oldwood-maze', compose: maze }, { id: 'oldwood-posts', compose: fingerPosts }, { id: 'oldwood-oldman', compose: oldMan });
})();

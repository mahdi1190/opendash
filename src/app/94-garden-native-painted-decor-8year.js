/* Painted decorations the vale's year and its story give (the folk3 plan, steps 7 and 10): the Frost Fair's Star lantern (taking part, once a
 * year), and what a whole era of the Chronicle brings (the two-waters stone, the millstone seat). The rows are in GARDEN_DECOR
 * (94-garden-0catalog.js), so friends see them once they are put out. In the house style: lit from the upper left, soft shade below, no
 * outlines, a contact shadow and grass or worn soil round every foot (rule 13). Sized against H (about 52 units here, decorations being
 * drawn at 0.8): the star lantern on its crook 1.7 H, the two-waters stone 1.1 H, the millstone seat 0.45 H and about two cells wide.
 * Registry: 94-garden-native-painted-decor-0kit.js ('year' family). */
GardenPaintedDecor.add('year', (function () {
  const WOOD = ['#8a6a46', '#6a5034', '#b08c5e', '#4a3420'], IRON = ['#4a4e52', '#2e3236', '#7a8086'];
  const STONE = ['#a8a090', '#868070', '#c8c2b0', '#6a6458'], GRIT = ['#9a9488', '#7a7468', '#bcb6a8', '#5e5a50'], MOSS = ['#6a8a4a', '#8aa860'];
  const foot = (B, r, w, o, soil) => { B.shadow(1, 1, w, w * .26, .28); if (soil) B.f(B.ell(0, 1, w * .8, w * .18), '#7a6244', .3); B.tufts(r, -w * .55, 2, w * .7, 4, o.season).tufts(r, w * .55, 2, w * .7, 4, o.season); };
  return {
    /* ---------- the Frost Fair: a paper star on a crook, lit from inside; it glows all winter ---------- */
    'vy-star-lantern': { glow: { w: 58, halo: -70, radius: 70 }, box: [-14, -100, 36, 6], draw(B, o) {
      const { r, night } = o; foot(B, r, 9, o, true);
      for (const [x, y] of [[-5, .6], [4.4, 1.4]]) B.stone(r, x, y, 2.4, 1.4, STONE, null);
      B.post(0, -90, 0, 3.4, WOOD).s('M0 -90q0 -8 9 -8q9 0 9 8', IRON[0], 2.4).s('M18 -90v6', IRON[1], 1);
      if (night) B.f(B.circ(18, -70, 26), B.rad(18, -70, 26, [[0, 'rgba(255,214,120,.6)'], [1, 'rgba(255,214,120,0)']]));
      // the star: five points, a lit face and a shaded one, the paper glowing from inside
      const pts = [], cx = 18, cy = -72, R1 = 12, R2 = 5.2;
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, R = i % 2 ? R2 : R1; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
      B.f(B.poly(pts), night ? '#f6c860' : '#e8c070').f(B.poly([pts[9], pts[0], pts[1], [cx, cy], pts[7], pts[8]]), night ? '#fff0b8' : '#f6dc98', .9);
      B.f(B.poly([[cx, cy], pts[3], pts[4], pts[5]]), '#c89040', night ? .25 : .45).f(B.circ(cx, cy, 2.6), night ? '#fff8dc' : '#f8e8b8');
      B.s(`M${cx - 4} ${cy + 13}l-2 5M${cx + 4} ${cy + 13}l2 5`, '#d8352a', 1.2).f(B.circ(cx, cy + 12.4, 1.6), '#d8352a');
      B.tufts(r, -2, 1, 6, 3, o.season);
    } },
    /* ---------- era I: the two-waters stone, a standing stone carved with two streams that meet in one ---------- */
    'vy-two-waters-stone': { box: [-24, -64, 24, 6], draw(B, o) {
      const { r } = o; foot(B, r, 18, o, true);
      B.f('M-12 0C-14 -20 -12 -44 -6 -56C-2 -60 4 -60 8 -54C13 -40 14 -18 12 0z', GRIT[1]);
      B.f('M-12 0C-14 -20 -12 -44 -6 -56C-3 -59 1 -59.6 3 -58C-2 -44 -4 -20 -2 0z', B.lin(-12, 0, 6, 0, [[0, GRIT[2]], [1, GRIT[0]]]));
      B.f('M8 -50C12 -36 13 -16 12 0L6 0C8 -18 8 -36 8 -50z', GRIT[3], .35);
      // the carving: two waters coming down from either side and running on as one
      B.s('M-7 -44q4 6 7 12M7 -46q-3 7 -7 14M0 -32q1 10 -1 22', '#5e5a50', 2.2, .75).s('M-6.4 -44.6q4 6 7 12M7.4 -46.6q-3 7 -7 14M.6 -32.6q1 10 -1 22', '#d8d2c2', .8, .7);
      B.f(B.ell(-8, -52, 5, 2), MOSS[0], .7).f(B.ell(-9, -53, 2.6, 1), MOSS[1], .8).f(B.ell(9, -6, 4, 1.6), MOSS[0], .55);
      B.tufts(r, -10, 1, 8, 4, o.season).tufts(r, 10, 1, 8, 4, o.season).flowers(r, 0, 2, 16, 3, ['#f4f0e0', '#c79ac0']);
    } },
    /* ---------- era III: a millstone seat, an old millstone laid on two blocks, worn smooth where people sit ---------- */
    'vy-millstone-seat': { box: [-48, -34, 48, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 42, 7, .26).f(B.ell(0, 1, 38, 4.4), '#7a6244', .22);
      for (const x of [-28, 28]) { B.f(B.rr(x - 9, -14, 18, 14, 1.6), STONE[1]).f(B.rect(x - 9, -14, 18, 3), STONE[2], .8).f(B.rect(x + 3, -11, 6, 11), STONE[3], .4); }
      B.f(B.ell(0, -16, 42, 9), GRIT[3]).f(B.ell(0, -18, 42, 9), GRIT[1]).f(B.ell(-2, -19.4, 38, 7.6), B.lin(-40, 0, 40, 0, [[0, GRIT[2]], [.5, GRIT[0]], [1, GRIT[1]]]));
      for (let i = 0; i < 10; i++) { const a = -Math.PI + i * Math.PI / 10; B.s(`M${Math.cos(a) * 9} ${-18 + Math.sin(a) * 2}L${Math.cos(a) * 34} ${-18 + Math.sin(a) * 7}`, GRIT[3], .7, .45); }
      B.f(B.ell(0, -18.6, 7, 1.8), '#4a463e').f(B.ell(-12, -21, 10, 1.6), '#ffffff', .18);
      B.f(B.ell(30, -17, 6, 1.6), MOSS[0], .6).f(B.ell(-34, -15, 4, 1.2), MOSS[1], .5);
      B.tufts(r, -40, 2, 8, 4, o.season).tufts(r, 40, 2, 8, 4, o.season).tufts(r, 0, 2, 12, 4, o.season);
    } },
  };
})());

/* Painted terrain: the high ground's landmarks in the same style as the fells around them
 * (94-garden-paint-terrain-0kit.js brushes): the summit cairn, the beacon on its plinth, the four
 * standing stones and the grotto's mouth under the Horn. Each is baked once into a sprite (keyed by
 * what it shows) and stands on its base line so the player walks behind it; picking, doors and the
 * saved rows stay the world's. Only rendering. Nothing runs at load. */
window.GardenPaintedMarks = (function () {
  'use strict';
  const KIT = () => window.GardenPaintTerrainKit, K = 2;
  const STONE = { rock: '#a69c8a', rockLo: '#7c7366', rockHi: '#d0c6b0', rockDk: '#4a443c', lichen: '#c9c48a', snow: '#fbfbf7', snowSh: '#c8d6e6' };
  const ART = {
    // the summit cairn: a broad cone of fell stones, a flat cap stone, lichen; snow lodged on the ledges in winter
    'ld-cairn': { box: [-40, -78, 44, 14], draw(B, o) {
      const kit = KIT(), r = kit.rng(31), snowy = o.season === 'winter';
      B.shadow(8, 2, 36, 8, .34);
      for (let row = 0; row < 9; row++) { const y = -4 - row * 7.2, half = 30 * (1 - row / 10.5); for (let x = -half; x <= half; x += 7 + r() * 3) B.stone(r, x + (r() - .5) * 3, y + (r() - .5) * 2, 4.4 + r() * 2.6, 3 + r() * 1.4, STONE, snowy && r() < .5 ? 'snow' : r() < .3 ? STONE.lichen : null); }
      B.f(B.blob(r, 0, -70, 9, 3.2, 7, .2), STONE.rockLo).f(B.blob(r, -1, -71.4, 8, 2.4, 7, .2), snowy ? STONE.snow : STONE.rockHi);
      B.f(B.poly([[14, -8], [30, -4], [22, -40], [10, -60]]), STONE.rockDk, .18);   // the cone's shaded east side
    } },
    // the beacon: an iron fire basket on a post, standing in a round stone plinth with a cope
    'ld-beacon': { box: [-34, -98, 40, 14], draw(B, o) {
      const kit = KIT(), r = kit.rng(37), snowy = o.season === 'winter', iron = '#2c2e30', ironHi = '#5a6064';
      B.shadow(8, 2, 30, 7, .32);
      B.f(B.rect(-22, -24, 44, 24), B.lin(-22, 0, 22, 0, [[0, '#c4b9a2'], [.6, '#a1977f'], [1, '#776e60']]));
      for (let row = 0; row < 3; row++) for (let x = -21 + (row % 2) * 5; x < 21; x += 10) B.s(`M${x} ${-23 + row * 8}v8`, '#6a6252', .8, .5);
      for (let row = 1; row < 3; row++) B.s(`M-22 ${-24 + row * 8}h44`, '#6a6252', .8, .55);
      B.f(B.ell(0, -24, 23, 5.4), '#8f8672').f(B.ell(0, -25.4, 22, 4.6), snowy ? STONE.snow : '#d6ccb4');
      B.s('M0 -26v-44', iron, 4).s('M-1.2 -26v-44', ironHi, 1.1, .7);
      // the basket: iron straps, a rim, the old char inside
      B.f('M-15 -82h30l-6 14h-18z', '#3a2e26', .9);
      for (const x of [-15, -8, 0, 8, 15]) B.s(`M${x} -82L${x * .6} -68`, iron, 1.8);
      B.s('M-16 -82h32M-11 -74h22M-9 -68h18', iron, 1.8).s('M-16 -83h32', ironHi, .8, .7);
      if (snowy) B.f(B.ell(0, -83, 15, 2.4), STONE.snow, .95);
      B.tufts(r, 0, 1, 50, 12, ['#8c9a5e', '#c2c78e'], 6);
    } },
    // four standing stones in a row, leaning, lichened, each throwing its shadow to the south-east
    'ld-stones': { box: [-110, -64, 120, 16], draw(B, o) {
      const kit = KIT(), r = kit.rng(41), snowy = o.season === 'winter';
      [[-72, 34, 9, -.12], [-26, 46, 11, .05], [22, 38, 10, -.08], [68, 28, 8, .14]].forEach(([x, h, w, lean]) => {
        B.f(B.poly([[x - w * .6, 0], [x + w * .6, 0], [x + w * .6 + 22, 8], [x - w * .2 + 22, 9]]), 'rgba(40,46,30,.22)');
        const tx = x + lean * h, pts = [[x - w, 0], [x - w * 1.02, -h * .45], [tx - w * .7, -h * .9], [tx - w * .2, -h], [tx + w * .5, -h * .94], [x + w * .9, -h * .4], [x + w, 0]];
        B.f(B.poly(pts), '#857c6e');
        B.f(B.poly([[x - w, 0], [x - w * 1.02, -h * .45], [tx - w * .7, -h * .9], [tx - w * .2, -h], [tx - w * .05, -h * .5], [x - w * .15, 0]]), '#b0a690');
        B.f(B.poly([[x - w * .9, -h * .5], [tx - w * .62, -h * .86], [tx - w * .3, -h * .94], [x - w * .55, -h * .4]]), '#d4cab2', .55);
        for (let k = 0; k < 4; k++) B.f(B.blob(r, x + (r() - .5) * w, -h * (.2 + r() * .6), 1.6 + r() * 2.4, 1.2 + r() * 1.6, 6, .5), r() < .6 ? '#c9c48a' : '#9aa86a', .7);
        if (snowy) B.f(B.blob(r, tx - w * .1, -h + 1.4, w * .7, 2, 6, .4), STONE.snow, .95);
        B.tufts(r, x, 1, w * 2.6, 6, ['#8c9a5e', '#c2c78e'], 5);
      });
    } },
    // the grotto: a low mossy mouth in a rock knoll under the Horn, ferns dripping, a green dark inside
    'ld-grotto': { box: [-64, -74, 68, 14], draw(B, o) {
      const kit = KIT(), r = kit.rng(43), snowy = o.season === 'winter';
      B.shadow(8, 2, 58, 9, .32);
      const masses = [[-38, -22, 22, 18], [-12, -44, 26, 18], [18, -42, 24, 17], [40, -20, 22, 17], [-30, -48, 16, 12], [30, -50, 15, 11]];
      for (const [x, y, rx, ry] of masses) { B.f(B.blob(r, x + 3, y + 4, rx, ry, 9, .25), '#3a342e', .8); B.f(B.blob(r, x, y, rx, ry, 9, .25), x > 10 ? '#6a6156' : '#8e8474'); B.f(B.blob(r, x - rx * .3, y - ry * .3, rx * .5, ry * .4, 7, .3), '#c2b7a2', .55); }
      // moss and turf over the knoll
      for (let k = 0; k < 7; k++) B.f(B.blob(r, -40 + k * 13 + (r() - .5) * 6, -58 + Math.abs(k - 3) * 5, 10 + r() * 6, 4 + r() * 2, 7, .5), snowy ? STONE.snow : k % 2 ? '#7d8f4e' : '#93a660', .95);
      // the mouth
      B.f('M-24 0Q-26 -38 0 -40Q26 -38 24 0Z', '#4a443c');
      B.f('M-20 0Q-22 -33 0 -35Q22 -33 20 0Z', B.rad(0, -14, 32, [[0, '#2f4a40'], [.5, '#1e2a26'], [1, '#121614']]));
      B.f('M-10 0Q-8 -16 2 -18Q10 -14 12 0Z', 'rgba(140,200,160,.14)');
      B.s('M-24 0Q-26 -38 0 -40', '#c2b7a2', 2.2, .8);
      // ferns hanging over the lip, drips, wet stones at the threshold
      if (!snowy) for (let k = 0; k < 7; k++) { const x = -18 + k * 6, y = -36 - Math.abs(k - 3) * .8; for (let j = 0; j < 5; j++) B.s(`M${x} ${y}q${(j - 2) * 2} 2 ${(j - 2) * 4} ${6 + r() * 4}`, k % 2 ? '#5f7a3c' : '#7a9a4a', 1.1, .9); }
      else for (let k = 0; k < 8; k++) { const x = -16 + k * 4.4; B.f(`M${x - 1.2} -34l1.2 ${6 + r() * 8}l1.2 ${-6 - r() * 8}z`, '#e6f3f8', .9); }
      for (let k = 0; k < 6; k++) B.stone(r, -16 + r() * 32, 3 + r() * 5, 2.4 + r() * 3, 1.4 + r() * 1.8, Object.assign({}, STONE, { rock: '#7f8a86', rockHi: '#a8b4b0' }));
      B.f(B.ell(2, 2, 12, 2.4), 'rgba(110,170,180,.45)');
    } },
  };
  // the Ring (High orchard): eight old perry pears stand round it (94-garden-paint-vale-1orchard.js); at its heart a low
  // stone with a carved ring, from a wedding nobody remembers, and windfalls in the mown grass
  ART['ld-ring'] = { box: [-40, -34, 44, 10], draw(B, o) {
    const kit = KIT(), r = kit.rng(53), S = { rock: '#b4aa94', rockLo: '#8c8270', rockHi: '#d8cfb8', rockDk: '#4e483e', lichen: '#d8c86a' };
    B.shadow(4, 2, 26, 6, .3);
    B.f('M-16 0L-15 -16Q-14 -24 0 -24Q14 -24 15 -16L16 0Z', S.rockLo).f('M-16 0L-15 -16Q-14 -24 0 -24L0 0Z', S.rock).f('M-13 -15Q-12 -22 0 -22L0 -18Q-9 -18 -10 -13Z', S.rockHi, .8);
    B.s(B.ell(0, -12, 6.5, 6.5), S.rockDk, 1.6, .6).s(B.ell(.6, -11.4, 6.5, 6.5), S.rockHi, .8, .5);
    B.f(B.blob(r, -6, -22, 6, 2, 6, .5), o.season === 'winter' ? '#f4f6f2' : S.lichen, .8);
    if (o.season === 'autumn') for (let k = 0; k < 7; k++) B.f(B.ell(-34 + r() * 70, 2 + r() * 6, 2.2, 1.8), '#c8b84a', .95);
    if (o.season === 'spring') for (let k = 0; k < 16; k++) B.f(B.circ(-36 + r() * 74, -2 + r() * 10, 1.2), '#fdfaf2', .9);
  } };
  function knows(id) { return !!ART[id]; }
  /** A painted landmark as a world handle (the same shape the village's painted buildings return). */
  function landmark(scene, prop, sc, element, W) {
    const kit = KIT(), art = prop && ART[prop.id]; if (!kit || !art) return null;
    const season = sc.season || 'summer', key = 'gpm|' + prop.id + '|' + season;
    const node = element(scene, 'g', { class: 'gd-it gd-prop gd-painted gd-painted-mark', 'data-prop': prop.id, 'data-z': prop.y + prop.h, 'data-x': prop.x });
    const x = (prop.x + prop.w / 2) * W.cellW, foot = W.sky + (prop.y + prop.h) * W.cellH - 2;
    const im = kit.sprite(scene, node._inner, key, art.box, B => art.draw(B, { season }), x, foot, K); if (!im) { node.remove(); return null; }
    im.setDepth(0);
    const b = { x: x + art.box[0], y: foot + art.box[1], width: art.box[2] - art.box[0], height: art.box[3] - art.box[1] };
    node.nativeBounds = b;
    return { root: node.target, rootNode: node, bounds: b, painted: true, foot: { x, y: foot }, update() {}, destroy() { node.remove(); } };
  }
  return { knows, landmark, ART };
})();

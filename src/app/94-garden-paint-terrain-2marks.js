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
  // the warren bank (windy flats): a low turf bank on the stony plateau, sandy scrapes and spoil, burrow mouths in shadow
  // (it was the old flat green dome, a cartoon among the painted fells)
  ART['ld-warren'] = { box: [-62, -30, 66, 12], draw(B, o) {
    const kit = KIT(), r = kit.rng(59), snowy = o.season === 'winter', autumn = o.season === 'autumn';
    const turf = snowy ? '#cfd3c8' : autumn ? '#a69a62' : '#8f9c5a', turfHi = snowy ? STONE.snow : autumn ? '#c2b47a' : '#aab670', turfLo = snowy ? '#a9b4b8' : autumn ? '#8a7e50' : '#76824c';
    B.shadow(4, 3, 58, 9, .26);
    B.f(B.blob(r, 2, -6, 56, 15, 11, .18), turfLo, .55).f(B.blob(r, 0, -8, 52, 13, 11, .2), turfLo, .6).f(B.blob(r, -2, -10, 50, 12, 11, .2), turf).f(B.blob(r, -10, -15, 30, 6, 9, .3), turfHi, .8);
    // sandy spoil fanned out below each mouth, then the mouths, dark and round-topped
    [[-34, -6, 1], [-10, -9, 1.2], [14, -6, 1], [36, -8, .85]].forEach(([x, y, k]) => {
      B.f(B.blob(r, x + 2, y + 6, 11 * k, 4 * k, 8, .4), snowy ? '#e6e8e2' : '#c9b48a', .9);
      for (let j = 0; j < 4; j++) B.f(B.circ(x - 6 + r() * 14, y + 4 + r() * 6, .8 + r() * .8), '#a08a62', .8);
      B.f(`M${x - 6 * k} ${y + 2}Q${x - 6.4 * k} ${y - 7 * k} ${x} ${y - 7.4 * k}Q${x + 6.4 * k} ${y - 7 * k} ${x + 6 * k} ${y + 2}Z`, '#3a3024');
      B.f(`M${x - 4 * k} ${y + 2}Q${x - 4 * k} ${y - 4.6 * k} ${x} ${y - 5 * k}Q${x + 4 * k} ${y - 4.6 * k} ${x + 4 * k} ${y + 2}Z`, '#1e1914');
      B.s(`M${x - 6 * k} ${y - 1}Q${x} ${y - 9 * k} ${x + 6 * k} ${y - 1}`, turfLo, 1.2, .7);
    });
    for (let k = 0; k < 4; k++) B.stone(r, -50 + r() * 100, 2 + r() * 6, 2.4 + r() * 2.4, 1.6 + r() * 1.2, STONE, snowy ? 'snow' : r() < .4 ? STONE.lichen : null);
    if (!snowy) B.tufts(r, 0, -16, 90, 18, ['#7d8f4e', '#c2c78e', '#9aa86a'], 5).tufts(r, 0, 4, 110, 10, ['#8c9a5e', '#c2c78e'], 4);
  } };
  // Wick's shepherd's hut on the high pasture: weathered planks, a curved tin roof, iron wheels, plank steps up to
  // the door, a stove pipe, a log pile under the end; its door is its way in (wayIn), so no extra door is drawn on it
  ART['ld-hut'] = { box: [-56, -116, 60, 14], door: { dx: 15, dy: 0 }, draw(B, o) {
    const kit = KIT(), r = kit.rng(61), snowy = o.season === 'winter', iron = '#2e2c2a', ironHi = '#64605a';
    const wall = '#6f8274', wallLo = '#4f6052', wallHi = '#93a596', roof = '#8a8f92', roofLo = '#5f6468', roofHi = '#b9bec0';
    B.shadow(4, 2, 52, 9, .34);
    // the undercarriage and the wheels (one pair seen, the far pair a darker hint)
    B.f(B.rect(-38, -26, 76, 5), '#3a3430');
    for (const x of [-26, 26]) { B.f(B.circ(x + 4, -12, 11), '#24221f', .5); B.s(B.circ(x, -12, 11), iron, 3).s(B.circ(x, -12, 11), ironHi, .9, .6); for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3; B.s(`M${x} -12l${(Math.cos(t) * 10).toFixed(1)} ${(Math.sin(t) * 10).toFixed(1)}`, iron, 1.3); } B.f(B.circ(x, -12, 2.4), ironHi); }
    // the body: planks, lit west end, a shaded underside
    B.f(B.rect(-38, -70, 76, 46), B.lin(-38, 0, 38, 0, [[0, wallHi], [.25, wall], [1, wallLo]]));
    for (let y = -64; y < -26; y += 6) B.s(`M-38 ${y}h76`, wallLo, .8, .55);
    for (let k = 0; k < 6; k++) B.f(B.rect(-36 + r() * 66, -68 + r() * 40, 6 + r() * 10, 1.6), wallHi, .35);   // worn paint
    B.f(B.rect(-38, -30, 76, 6), 'rgba(30,34,28,.35)');
    // the curved tin roof, its ribs, the overhang's shadow on the wall
    B.f('M-43 -68Q-42 -96 0 -98Q42 -96 43 -68Z', B.lin(0, -98, 0, -68, [[0, roofHi], [.5, roof], [1, roofLo]]));
    for (let x = -36; x <= 36; x += 6) B.s(`M${x} -69Q${x * .98} ${-94 + Math.abs(x) * .14} ${x * .9} -96`, roofLo, .7, .5);
    B.s('M-43 -68Q-42 -96 0 -98', roofHi, 1.4, .8).f(B.rect(-38, -70, 76, 4), 'rgba(20,24,22,.35)');
    if (snowy) B.f('M-41 -76Q-40 -98 0 -100Q40 -98 41 -76Q20 -84 0 -84Q-22 -84 -41 -76Z', STONE.snow, .96);
    else B.f(B.blob(r, -18, -90, 10, 3, 6, .4), '#a0623a', .35).f(B.blob(r, 22, -84, 7, 2.4, 6, .4), '#a0623a', .3);   // rust
    // the stove pipe and its cap
    B.f(B.rect(24, -112, 5, 20), iron).f(B.rect(24, -112, 1.6, 20), ironHi, .7).f(B.rect(21, -115, 11, 3), iron);
    // a small window with warm glass and a sill
    B.f(B.rect(-26, -60, 18, 16), '#3a3024').f(B.rect(-24.5, -58.5, 15, 13), B.lin(0, -58, 0, -45, [[0, '#f2dc9a'], [1, '#d8a85a']])).s('M-17 -58.5v13M-24.5 -52h15', '#3a3024', 1.4).f(B.rect(-27, -44, 20, 2.2), wallHi);
    // the door (the way in) and its plank steps down to the turf
    B.f(B.rect(6, -64, 18, 40), '#3a2c1e').f(B.rect(7.5, -62.5, 15, 37), B.lin(7, 0, 23, 0, [[0, '#8a6a46'], [1, '#6a5034']]));
    B.s('M11 -62v36M15 -62v36M19 -62v36', '#4e3a26', .8, .7).f(B.circ(20.5, -44, 1.2), '#c8a23a');
    B.f(B.poly([[4, -24], [26, -24], [28, -17], [2, -17]]), '#7a5a3a').f(B.poly([[2, -16], [28, -16], [30, -9], [0, -9]]), '#6e5234').f(B.poly([[0, -8], [30, -8], [32, 0], [-2, 0]]), '#62482e');
    B.s('M4 -24h22M2 -16h26M0 -8h30', '#a07a50', 1, .8);
    // logs stacked under the west end, a bucket, turf round the wheels
    for (let k = 0; k < 5; k++) { const x = -48 + (k % 3) * 6 + (k > 2 ? 3 : 0), y = -3 - (k > 2 ? 5.4 : 0); B.f(B.circ(x, y, 3), '#8a6440').f(B.circ(x, y, 1.8), '#c49a66'); }
    B.f(B.poly([[38, 0], [39, -8], [47, -8], [46, 0]]), '#6a6e70').s('M38.5 -8h9', '#9a9ea0', 1);
    if (!snowy) B.tufts(r, 0, 1, 104, 22, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6);
    else B.f(B.blob(r, 0, 2, 50, 4, 9, .3), STONE.snow, .85);
  } };
  function knows(id) { return !!ART[id]; }
  /** Where a painted landmark's own door is, as an offset from its foot (world px), or null when it has none. */
  // buildings painted elsewhere whose own doorway is their way in (offsets from their foot): no second door picture is stood on the grass in front of them
  const WAYIN = { 'ld-chapel': { dx: 0, dy: -2 }, 'ld-lighthouse': { dx: 0, dy: -1 }, 'lf-windmill': { dx: 0, dy: -1 } };
  function wayIn(id) { const a = ART[id]; return a ? a.door || (id === 'ld-grotto' ? { dx: 0, dy: 0 } : null) : WAYIN[id] || null; }
  /** A painted landmark as a world handle (the same shape the village's painted buildings return).
   *  layer: the ground's container, for the seat under it (GardenPaintSeat, 94-garden-paint-terrain-5sights.js). An art
   *  with `lit` has a second picture for dusk and night (lit windows, a lamp), swapped by setLitWindows; `lights` are
   *  its live warm lights at night, as offsets from its foot; `seat` says what it stands in (false: nothing). */
  function landmark(scene, prop, sc, element, W, layer) {
    const kit = KIT(), art = prop && ART[prop.id]; if (!kit || !art) return null;
    const season = sc.season || 'summer', night0 = !!art.lit && (sc.tod === 'dusk' || sc.tod === 'night'), keyOf = n => 'gpm|' + prop.id + '|' + season + (n ? '|n' : '');
    const node = element(scene, 'g', { class: 'gd-it gd-prop gd-painted gd-painted-mark', 'data-prop': prop.id, 'data-z': prop.y + prop.h, 'data-x': prop.x });
    const x = (prop.x + prop.w / 2) * W.cellW + (art.dx || 0), foot = W.sky + (prop.y + prop.h) * W.cellH - 2;
    // a flat sight (a pool let into the ground, a turf maze) lies in the ground's container with its seat: under every actor
    const host = art.flat && layer ? layer : node._inner, depthOf = () => art.flat && layer ? (window.GardenPaintSeat ? GardenPaintSeat.DEPTH + 1 : -9344) : 0;
    let im = kit.sprite(scene, host, keyOf(night0), art.box, B => art.draw(B, { season, night: night0, prop }), x, foot, K, art.shade !== false); if (!im) { node.remove(); return null; }
    im.setDepth(depthOf());
    const seat = art.seat !== false && window.GardenPaintSeat && layer ? GardenPaintSeat.add(scene, layer, prop, W, Object.assign({ season, x, foot }, art.seat || {})) : null;
    const b = { x: x + art.box[0], y: foot + art.box[1], width: art.box[2] - art.box[0], height: art.box[3] - art.box[1] };
    node.nativeBounds = b;
    let lit = night0;
    const lights = night0 && art.lights ? art.lights.map(([dx, dy, r]) => ({ x: x + dx, y: foot + dy, radius: r || 110, pool: true })) : [];
    const h = { root: node.target, rootNode: node, bounds: b, painted: true, shaded: art.shade !== false || !!art.flat, foot: { x, y: foot }, lights, update() { if (seat) { seat.setVisible(node.target.visible); seat.setAlpha(node.target.alpha); } },
      setLitWindows(on) { on = !!on && !!art.lit; if (on === lit) return; lit = on; const next = kit.sprite(scene, host, keyOf(on), art.box, B => art.draw(B, { season, night: on, prop }), x, foot, K, art.shade !== false); if (!next) return; next.setDepth(depthOf()); im.destroy(); im = next; h.lights.length = 0; if (on && art.lights) for (const [dx, dy, r] of art.lights) h.lights.push({ x: x + dx, y: foot + dy, radius: r || 110, pool: true }); },
      destroy() { if (seat) seat.destroy(); if (host !== node._inner) im.destroy(); node.remove(); } };
    return h;
  }
  return { knows, landmark, wayIn, ART };
})();

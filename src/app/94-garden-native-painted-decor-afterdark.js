/* Painted decorations, after dark (94-garden-zz-afterdark-*.js): the moth sheet, the weathervane, the star lantern, the moon lantern,
 * the moon dial, the rainbow arch and the bandstand. The family look: weathered ash and black iron, pale linen, a little moss at every foot, lit from
 * the upper left; at dusk and night a warm core and a pool of light. Sizes against H, the gardener's height (41 world px; these draw at
 * 0.8, so 52 units): the sheet 1.8 H, the vane 2 H, the lanterns 1.5 H, the dial 0.95 H, the arch 2.2 H, the bandstand 4.2 H.
 * Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('afterdark', (function () {
  const ASH = ['#a8987a', '#7e6e54', '#cfc0a2', '#4e4434'], IRON = ['#2f3438', '#1e2224', '#56606a'], STONE = ['#b4b0a6', '#8e8a82', '#d8d4ca', '#6e6a62'], MOSS = ['#7d8f4e', '#a3b06a'];
  const LINEN = ['#f8f4ea', '#e2dac8', '#ffffff', '#c8bea8'];
  // a hurricane lantern: wire cage, glass, a flame that is lit at dusk and night
  function lantern(B, o, x, y, k) {
    const { H } = o;
    B.f(B.rr(x - 5 * k, y - 2 * k, 10 * k, 3 * k, 1), IRON[0]).f(B.rect(x - 5 * k, y - 2 * k, 10 * k, 1 * k), IRON[2], .7);
    B.f(`M${x - 4.4 * k} ${y - 2 * k}Q${x - 6 * k} ${y - 9 * k} ${x - 3.4 * k} ${y - 15 * k}H${x + 3.4 * k}Q${x + 6 * k} ${y - 9 * k} ${x + 4.4 * k} ${y - 2 * k}Z`, o.night ? B.rad(x, y - 8 * k, 9 * k, [[0, '#fff4c8'], [.55, '#ffd27a'], [1, '#e8a04a']]) : 'rgba(214,230,232,.62)');
    if (!o.night) H.glass(B, `M${x - 4.4 * k} ${y - 2 * k}Q${x - 6 * k} ${y - 9 * k} ${x - 3.4 * k} ${y - 15 * k}H${x + 3.4 * k}Q${x + 6 * k} ${y - 9 * k} ${x + 4.4 * k} ${y - 2 * k}Z`, x - 5 * k, y - 15 * k, 10 * k, 13 * k, .2);
    for (const dx of [-3.6, 0, 3.6]) B.s(`M${x + dx * k} ${y - 2 * k}Q${x + dx * 1.5 * k} ${y - 9 * k} ${x + dx * .8 * k} ${y - 15 * k}`, IRON[1], .7 * k, .8);
    B.f(B.rr(x - 4 * k, y - 18 * k, 8 * k, 3.4 * k, 1.2), IRON[0]).f(B.ell(x, y - 18 * k, 3 * k, 1 * k), IRON[2], .8);
    B.s(`M${x - 3 * k} ${y - 19 * k}Q${x} ${y - 25 * k} ${x + 3 * k} ${y - 19 * k}`, IRON[0], .9 * k);
  }
  function lanternFlame(B, o, x, y, k) { if (o.night) { B.f(B.circ(x, y - 8 * k, 14 * k), B.rad(x, y - 8 * k, 14 * k, [[0, 'rgba(255,228,150,.55)'], [1, 'rgba(255,220,140,0)']])); o.H.flame(B, x, y - 4 * k, .5 * k); } else B.f(B.rr(x - .8 * k, y - 8 * k, 1.6 * k, 4 * k, .6), '#3a3028', .8); }
  const leafy = (B, o, x, y, w) => { const L = o.K.leafOf(o.season); B.f(o.D.blob(o.r, x, y, w, w * .32, 8, .4), L[0], .85).f(o.D.blob(o.r, x - w * .15, y - w * .12, w * .62, w * .22, 7, .45), L[1], .85); };
  return {
    /* a white sheet on a line between two ash poles, pegged, with a lantern on a crate in front of it: the moths come to the light */
    'moth-sheet': { box: [-68, -108, 68, 10], glow: { w: 120, halo: -24, radius: 120 }, draw(B, o) {
      const { H, r } = o; B.shadow(0, 2, 62, 7, .24);
      leafy(B, o, -54, 1, 12); leafy(B, o, 54, 1, 12); leafy(B, o, 0, 3, 30);
      // the poles: ash, peeled pale at the top, each with a fork the line is tied into
      for (const s of [-1, 1]) {
        const x = s * 54;
        B.f(`M${x - 2.4} 1L${x - 1.6} -94L${x + 1.4} -94L${x + 2.2} 1Z`, B.lin(x - 2.4, 0, x + 2.4, 0, [[0, ASH[2]], [.45, ASH[0]], [1, ASH[1]]]));
        B.s(`M${x + .2} -94l${s * -3} -6M${x + .4} -94l${s * 2.4} -5`, ASH[1], 1.4).s(`M${x - 1} -60l${s * -1.6} 1`, ASH[3], .7, .5);
        B.f(o.D.blob(r, x - 1, -2, 4, 1.6, 6, .4), ASH[3], .35);
        B.tufts(r, x, 1, 14, 7, o.season);
      }
      H.cord(B, 'M-54 -90Q0 -84 54 -90', 1.1, '#d8ccb0');
      // the crate and the lantern on it, in front
      B.f(B.rr(-6, -13, 22, 13, 1.4), ASH[1]).f(B.rect(-6, -13, 22, 2.4), ASH[2], .9).f(B.rect(-6, -7, 22, 1), ASH[3], .5).f(B.rect(-6, -13, 2.4, 13), ASH[2], .5).f(B.rect(13.6, -13, 2.4, 13), ASH[3], .4);
      lantern(B, o, 5, -13, 1.15);
      B.tufts(r, 5, 2, 30, 6, o.season);
    }, anim: [
      { id: 'sheet', x: 0, y: -87, kind: 'sway', speed: .55, amp: .018, box: [-52, -2, 52, 70], draw(B, o) {
        // the sheet hangs from the line: pale linen lit from the upper left, soft folds, a hem; at night the lantern warms its middle
        const d = 'M-50 0Q0 4 50 0L48 61Q36 65 24 62Q12 66 0 63Q-12 66 -24 62Q-36 65 -48 61Z';
        B.f(d, B.lin(-50, 0, 50, 62, [[0, LINEN[2]], [.35, LINEN[0]], [1, LINEN[1]]]));
        if (o.night) B.f(d, B.rad(4, 52, 46, [[0, 'rgba(255,214,130,.55)'], [.6, 'rgba(255,214,130,.18)'], [1, 'rgba(255,214,130,0)']]));
        for (const [x, w] of [[-34, 5], [-12, 7], [10, 6], [30, 8]]) B.f(`M${x} 2Q${x + w * .4} 30 ${x - 1} 62L${x + w} 62Q${x + w * .7} 30 ${x + w * .6} 3Z`, LINEN[3], o.night ? .16 : .22);
        B.s('M-48 60Q-36 64 -24 61Q-12 65 0 62Q12 65 24 61Q36 64 48 60', LINEN[3], 1.1, .6);
        for (const x of [-40, -14, 14, 40]) B.f(B.rr(x - 1.2, -2.6, 2.4, 6, .8), ASH[1]).f(B.rect(x - 1.2, -2.6, .9, 6), ASH[2], .7);
      } },
      { id: 'flame', x: 5, y: -13, kind: 'flicker', speed: 6.5, box: [-16, -26, 16, 4], draw(B, o) { lanternFlame(B, o, 0, 0, 1.15); } },
    ] },
    /* a cockerel on an iron post, the four letters under it, on a mossy stone */
    weathervane: { box: [-34, -122, 34, 8], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 18, 4.4, .26);
      B.stone(r, 0, -3, 13, 6, STONE, MOSS).tufts(r, 0, 2, 30, 8, o.season);
      B.post(0, -92, -6, 3.6, IRON).f(B.circ(0, -92, 2.6), IRON[2]);
      // the arms: east and west across, north and south foreshortened, each tipped with its letter
      B.s('M-19 -84H19', IRON[0], 1.4).s('M-7 -79L7 -89', IRON[0], 1.2);
      B.f(B.circ(-19, -84, 1.4), IRON[2]).f(B.circ(19, -84, 1.4), IRON[2]).f(B.circ(-7, -79, 1.2), IRON[2]).f(B.circ(7, -89, 1.2), IRON[2]);
      B.text('W', -25, -84, 6.4, IRON[0], 'Georgia, serif', 'bold').text('E', 25, -84, 6.4, IRON[0], 'Georgia, serif', 'bold').text('S', -10, -75, 5.4, IRON[0], 'Georgia, serif', 'bold').text('N', 10, -93, 5.4, IRON[0], 'Georgia, serif', 'bold');
    }, anim: [{ id: 'bird', x: 0, y: -94, kind: 'sway', speed: .42, amp: .09, box: [-26, -28, 26, 4], draw(B, o) {
      // the cockerel and its arrow, black iron with a gilded edge that catches the light
      const bird = 'M-14 -4L-6 -4Q-8 -12 -2 -16Q2 -20 6 -16L8 -20L9 -15Q12 -14 12 -11L9 -10Q10 -6 6 -4L14 -4L13 -2H-13Z';
      B.s('M-22 0H22', IRON[0], 1.6).f('M22 0L16 -3.4L16 3.4Z', IRON[0]).f('M-22 0L-18 -4L-15 -4L-19 0L-15 4L-18 4Z', IRON[0]);
      B.f(bird, IRON[0]).s(bird, '#c8a24a', .7, .7);
      B.f('M-6 -4Q-12 -10 -16 -20Q-10 -16 -6 -10Z', IRON[0]).f('M-7 -5Q-10 -12 -10 -21Q-6 -14 -5 -8Z', IRON[1]);
      B.f('M3 -18Q4 -22 6 -20Q7 -23 8 -20L7 -17Z', '#b83a2a', .9);
    } }] },
    /* a fallen star's stone in a cage lantern on a post: it glows all night */
    'star-lantern': { box: [-22, -86, 22, 6], glow: { w: 90, halo: -66, radius: 100 }, draw(B, o) {
      const { r } = o; B.shadow(0, 1, 14, 4, .26);
      B.stone(r, 0, -1, 8, 3.6, STONE, MOSS).tufts(r, 0, 2, 22, 6, o.season);
      B.post(0, -58, -2, 3.2, IRON);
      B.s('M0 -46q7 -2 6 -12', IRON[0], 1).s('M0 -46q-7 -2 -6 -12', IRON[0], 1);
      // the cage, the stone inside, a little iron star on top
      B.f(B.rr(-8, -60, 16, 3, 1), IRON[0]);
      for (const dx of [-7, -2.4, 2.4, 7]) B.s(`M${dx} -60Q${dx * 1.25} -68 ${dx * .7} -76`, IRON[0], .9);
      B.f(B.rr(-6, -79, 12, 3, 1), IRON[0]).f(B.poly([[0, -86], [1.3, -82.6], [4.4, -82.4], [2, -80.4], [2.8, -77.4], [0, -79], [-2.8, -77.4], [-2, -80.4], [-4.4, -82.4], [-1.3, -82.6]]), IRON[2]);
    }, anim: [{ id: 'stone', x: 0, y: -68, kind: 'flicker', speed: 2.2, box: [-16, -16, 16, 16], draw(B, o) {
      if (o.night) B.f(B.circ(0, 0, 15), B.rad(0, 0, 15, [[0, 'rgba(226,214,255,.7)'], [1, 'rgba(200,180,255,0)']]));
      B.f(B.ell(0, 1, 4.6, 4), o.night ? '#efe6ff' : '#b8a6d8').f(B.ell(-1.4, -.4, 1.8, 1.4), '#ffffff', o.night ? .95 : .6);
    } }] },
    /* a pale glass globe like a little moon, hung from a curled iron crook */
    'moon-lantern': { box: [-24, -84, 22, 6], glow: { w: 90, halo: -52, radius: 100 }, draw(B, o) {
      const { r } = o; B.shadow(0, 1, 14, 4, .26);
      B.stone(r, 0, -1, 8, 3.6, STONE, MOSS).tufts(r, 0, 2, 22, 6, o.season);
      B.post(-2, -74, -2, 3, IRON);
      B.s('M-2 -74Q-2 -82 6 -82Q13 -82 12 -74Q11 -70 7 -71', IRON[0], 2.2).s('M-2.6 -75Q-2.4 -81 5 -81', IRON[2], .7, .7);
      B.s('M7 -71V-66', IRON[0], .8).f(B.rr(4, -66.4, 6, 2.4, 1), IRON[0]);
    }, anim: [{ id: 'globe', x: 7, y: -54, kind: 'sway', speed: .8, amp: .03, box: [-14, -14, 14, 14], draw(B, o) {
      if (o.night) B.f(B.circ(0, 0, 14), B.rad(0, 0, 14, [[0, 'rgba(228,236,255,.62)'], [1, 'rgba(210,224,255,0)']]));
      B.f(B.circ(0, 0, 7.4), B.rad(-2.6, -2.6, 9, [[0, '#ffffff'], [.55, o.night ? '#eef2ff' : '#dfe6f2'], [1, o.night ? '#c8d4f0' : '#aab6cc']]));
      for (const [x, y, rr] of [[2.4, 1.6, 1.4], [-1.6, 2.8, .9], [1, -2.4, .8]]) B.f(B.circ(x, y, rr), '#b8c4dc', o.night ? .45 : .55);
      B.f(B.ell(-2.6, -3, 2, 1.2), '#ffffff', .8);
    } }] },
    /* a stone pedestal and a bronze dial of the moon's eight shapes, a crescent pointer at the full */
    'moon-dial': { box: [-26, -60, 26, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 18, 4.4, .26);
      B.f(B.rr(-12, -6, 24, 6, 2), STONE[1]).f(B.rect(-12, -6, 24, 2), STONE[2], .8).tufts(r, 0, 2, 36, 8, o.season);
      B.f('M-6 -6Q-9 -22 -5 -30H5Q9 -22 6 -6Z', B.lin(-9, 0, 9, 0, [[0, STONE[2]], [.45, STONE[0]], [1, STONE[3]]]));
      B.f(o.D.blob(r, -3, -8, 4, 2, 6, .4), MOSS[0], .8).f(B.rr(-9, -33, 18, 4, 1.4), STONE[1]).f(B.rect(-9, -33, 18, 1.4), STONE[2], .9);
      // the dial, seen a little from above: bronze, its rim of eight moons, the pointer
      B.f(B.ell(0, -40, 19, 8), '#8a6a3a').f(B.ell(0, -41, 18, 7.2), B.lin(-18, 0, 18, 0, [[0, '#d8b06a'], [.5, '#b8904a'], [1, '#7a5a2c']]));
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 13, y = -41 + Math.sin(a) * 4.8, f = Math.cos(a);
        B.f(B.ell(x, y, 2, 1.3), '#3a2e1e', .55).f(B.ell(x + f * .8, y, 2 * Math.abs(f) || .3, 1.3), '#f4ecd4', .9);
      }
      B.f(B.ell(0, -41, 4, 1.6), '#6a4a24').s('M0 -41L10 -44', '#4a3418', 1.4).f(B.circ(0, -41, 1.2), '#f4d890');
      B.f(B.ell(-7, -43.4, 6, 1.4), '#ffffff', .25);
    } },
    /* an arch of seven colours from where the rainbow touched the ground, roses at its feet */
    'rainbow-arch': { scale: 1, box: [-60, -114, 60, 8], draw(B, o) {
      const { r } = o; B.shadow(0, 2, 50, 6, .24);
      const cols = ['#e8504e', '#f09a3e', '#f2d44a', '#62b85a', '#4a8ae0', '#5a5ac8', '#9a5ac0'];
      B.s('M-42 0v-58q0 -42 42 -42q42 0 42 42v58', '#d8d0bc', 15).s('M-42 0v-58q0 -42 42 -42q42 0 42 42v58', '#f6f2e6', 13);
      cols.forEach((c, i) => { const w = 42 - 6 + i * 1.7; B.s(`M${-w} -4v-54q0 -${w} ${w} -${w}q${w} 0 ${w} ${w}v54`, c, 1.6, .95); });
      B.s('M-48.6 0v-58q0 -48 48.6 -48.6', '#ffffff', 1.1, .7);
      const L = o.K.leafOf(o.season);
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const x = s * 42 + (r() - .5) * 8, y = -4 - i * 10; B.f(o.D.blob(r, x, y, 7, 6, 7, .5), L[0], .95).f(o.D.blob(r, x - 2, y - 2, 4.4, 3.4, 6, .5), L[1], .95); if (o.season !== 'winter' && i % 2 === 0) B.f(B.circ(x + 2, y, 2.4), cols[(i + (s > 0 ? 3 : 0)) % 7], .95); }
      B.tufts(r, -42, 2, 16, 6, o.season).tufts(r, 42, 2, 16, 6, o.season);
    } },
    /* a bandstand (for all four places at a band's pitch played at once): a raised stone floor with three steps, slender green iron
       columns, a white railing, a striped roof with a scalloped valance and a little lantern on top; bunting between the side columns
       and paper lanterns under the eaves that light at dusk. The floor 0.7 H up, 4.2 H to the finial. */
    bandstand: { box: [-96, -222, 96, 8], glow: { w: 170, halo: -90, radius: 160 }, draw(B, o) {
      const { r } = o, G = ['#3e6a52', '#2a4a38', '#5f9074', '#1c3326'], CR = ['#f4efe2', '#d6cdb8', '#ffffff', '#a89e86'];
      const FY = -36, EY = -146, at = (a, k, cy, rx, ry) => [Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k], f1 = (n) => n.toFixed(1);
      B.shadow(0, 2, 94, 13, .28);
      // the floor: its front face (lit from the left), its top worn paler where the band stands, moss and grass at its foot
      B.f(`M-84 ${FY}A84 20 0 0 0 84 ${FY}L84 ${FY + 16}A84 20 0 0 1 -84 ${FY + 16}Z`, B.lin(-84, 0, 84, 0, [[0, STONE[2]], [.4, STONE[0]], [1, STONE[3]]]));
      for (const x of [-62, -32, 32, 62]) { const y = FY + Math.sqrt(1 - (x / 84) ** 2) * 20; B.s(`M${x} ${f1(y)}v15`, STONE[3], .7, .5); }
      B.s(`M-84 ${FY + 8}A84 20 0 0 0 84 ${FY + 8}`, STONE[3], .6, .45);
      B.f(B.ell(0, FY, 84, 20), STONE[1]).f(B.ell(0, FY - 1, 80, 18), STONE[0]).f(B.ell(-10, FY - 3, 46, 9), STONE[2], .45);
      for (const x of [-72, 50, 76]) B.f(o.D.blob(r, x, -2 - r() * 3, 7, 2.6, 6, .4), MOSS[0], .75);
      for (let i = 0; i < 3; i++) { const w = 38 + i * 7, y = -14 + i * 5.2; B.f(B.rr(-w / 2, y, w, 5.6, 1.2), STONE[1]).f(B.rect(-w / 2, y, w, 1.8), STONE[2], .85).f(B.rect(w / 2 - 5, y, 5, 5.6), STONE[3], .35); }
      B.tufts(r, -86, 0, 18, 7, o.season).tufts(r, 86, 0, 18, 7, o.season).tufts(r, -34, 2, 12, 5, o.season).tufts(r, 36, 2, 12, 5, o.season);
      // a column: an iron foot, the shaft lit on its left, a flared capital under the roof
      const col = (a) => { const [x, y] = at(a, .9, FY, 84, 20), top = EY + Math.sin(a) * 18.9 + 2; B.f(B.rr(x - 3.4, y - 3, 6.8, 4, 1), G[1]).f(`M${f1(x - 1.9)} ${f1(y - 2)}L${f1(x - 1.6)} ${f1(top + 4)}H${f1(x + 1.6)}L${f1(x + 1.9)} ${f1(y - 2)}Z`, B.lin(x - 2, 0, x + 2, 0, [[0, G[2]], [.5, G[0]], [1, G[3]]])).f(`M${f1(x - 4)} ${f1(top + 4)}Q${f1(x)} ${f1(top + 9)} ${f1(x + 4)} ${f1(top + 4)}L${f1(x + 2)} ${f1(top)}H${f1(x - 2)}Z`, G[1]); };
      // the far side: its railing, then its columns
      B.s(`M-80 ${FY - 14}A80 18.4 0 0 1 80 ${FY - 14}`, CR[1], 1.4, .8);
      for (let i = 1; i < 14; i++) { const [x, y] = at(Math.PI + i / 14 * Math.PI, .97, FY, 84, 20); B.s(`M${f1(x)} ${f1(y)}v-14`, CR[1], .8, .6); }
      for (const a of [Math.PI * 7 / 6, Math.PI * 11 / 6]) col(a);
      // the near side: its columns, then its railing, open at the steps
      for (const a of [Math.PI, 0, Math.PI * 2 / 3, Math.PI / 3]) col(a);
      const ry = FY - 14 + 19 * Math.sqrt(1 - (22 / 82) ** 2);
      B.s(`M-82 ${FY - 14}A82 19 0 0 0 -22 ${f1(ry)}M22 ${f1(ry)}A82 19 0 0 0 82 ${FY - 14}`, CR[0], 1.8);
      for (let i = 1; i < 22; i++) { const [x, y] = at(i / 22 * Math.PI, 1, FY, 82, 19); if (Math.abs(x) < 22) continue; B.s(`M${f1(x)} ${f1(y)}v-14`, CR[0], 1, .95).s(`M${f1(x + .6)} ${f1(y)}v-14`, CR[3], .4, .5); }
      // the roof: green and cream stripes from the top, light from the left, the valance's scallops along the eave
      const roof = `M-90 ${EY}Q-74 ${EY - 16} -42 ${EY - 27}Q-12 ${EY - 37} 0 ${EY - 50}Q12 ${EY - 37} 42 ${EY - 27}Q74 ${EY - 16} 90 ${EY}A90 21 0 0 1 -90 ${EY}Z`;
      B.f(roof, G[0]);
      const cx = B.cx; cx.save(); cx.clip(new Path2D(roof));
      for (let k = -6; k <= 6; k += 2) { const p0 = at(Math.PI / 2 + (k - .5) * .2, 1.2, EY + 8, 90, 21), p1 = at(Math.PI / 2 + (k + .5) * .2, 1.2, EY + 8, 90, 21); B.f(B.poly([[0, EY - 52], p0, p1]), CR[0], .92); }
      B.f(B.rect(-92, EY - 54, 184, 80), B.lin(-90, 0, 90, 0, [[0, 'rgba(255,255,255,.22)'], [.45, 'rgba(255,255,255,0)'], [1, 'rgba(10,30,20,.34)']]));
      cx.restore();
      B.s(`M-90 ${EY}A90 21 0 0 0 90 ${EY}`, G[3], 1.4, .9).s(`M-89 ${EY - 2}A89 20 0 0 0 89 ${EY - 2}`, CR[2], .8, .5);
      for (let i = 0; i <= 18; i++) { const [x, y] = at(.1 + i / 18 * (Math.PI - .2), 1, EY, 90, 21); B.f(`M${f1(x - 4.6)} ${f1(y)}A4.6 4.6 0 0 0 ${f1(x + 4.6)} ${f1(y)}Z`, i % 2 ? CR[0] : G[0]).s(`M${f1(x - 4.6)} ${f1(y)}A4.6 4.6 0 0 0 ${f1(x + 4.6)} ${f1(y)}`, G[3], .5, .6); }
      // the little lantern on the top and its gilded finial
      const LY = EY - 62;
      B.f(B.rr(-6, LY, 12, 10, 1.5), CR[0]).f(B.rect(-4, LY + 2, 3, 6), o.night ? '#ffe2a0' : '#9ab0b8').f(B.rect(1, LY + 2, 3, 6), o.night ? '#ffd27a' : '#7a909a');
      B.f(`M-8 ${LY}Q0 ${LY - 8} 8 ${LY}Z`, G[1]).f(B.circ(0, LY - 9, 2.4), '#d8b24a').f(B.circ(-.7, LY - 9.7, .9), '#fff4c8', .8);
      if (o.night) B.f(B.circ(0, LY + 5, 12), B.rad(0, LY + 5, 12, [[0, 'rgba(255,226,150,.5)'], [1, 'rgba(255,226,150,0)']]));
    }, anim: [
      { id: 'bunting', x: 0, y: -136, kind: 'sway', speed: .5, amp: .015, box: [-78, -14, 78, 22], draw(B, o) {
        const cols = ['#d8405a', '#f2d44a', '#4a8ae0', '#62b85a', '#f09a3e', '#9a5ac0'];
        for (const sg of [-1, 1]) {
          const x0 = sg * 74, y0 = -8, x1 = sg * 37, y1 = 8.4, mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 8;
          o.H.cord(B, `M${x0} ${y0}Q${mx} ${my} ${x1} ${y1}`, .8, '#e8dcc0');
          for (let i = 0; i < 5; i++) { const t = (i + .5) / 5, x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * mx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * my + t * t * y1; B.f(B.poly([[x - 3.4, y], [x + 3.4, y], [x, y + 7]]), cols[(i + (sg > 0 ? 3 : 0)) % cols.length], .95).f(B.poly([[x - 3.4, y], [x - .4, y], [x - 1.6, y + 5]]), '#ffffff', .18); }
        }
      } },
      { id: 'lamps', x: 0, y: -126, kind: 'flicker', speed: 2.4, box: [-34, -4, 34, 32], draw(B, o) {
        for (const x of [-20, 20]) {
          const y = 7; B.s(`M${x} -1V${y}`, '#3a2a1a', .6);
          if (o.night) B.f(B.circ(x, y + 7, 13), B.rad(x, y + 7, 13, [[0, 'rgba(255,214,140,.55)'], [1, 'rgba(255,214,140,0)']]));
          B.f(`M${x - 4} ${y + 13}L${x - 4.6} ${y + 4}Q${x - 4.2} ${y + 1} ${x - 2.4} ${y}H${x + 2.4}Q${x + 4.2} ${y + 1} ${x + 4.6} ${y + 4}L${x + 4} ${y + 13}Z`, o.night ? '#f4a85a' : '#e88a5a').f(`M${x - 4} ${y + 13}L${x - 4.6} ${y + 4}Q${x - 4.2} ${y + 1} ${x - 2.4} ${y}H${x - 1}Q${x - 2.4} ${y + 2} ${x - 2.4} ${y + 4}L${x - 2} ${y + 13}Z`, '#ffffff', .25);
          if (o.night) B.f(B.ell(x, y + 7, 2, 3), '#fff4c8', .85);
          B.s(`M${x - 2.6} ${y}H${x + 2.6}M${x - 2.8} ${y + 13}H${x + 2.8}`, '#6a4a2c', .8);
        }
      } },
    ] },
  };
})());

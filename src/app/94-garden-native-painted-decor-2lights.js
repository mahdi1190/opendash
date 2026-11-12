/* Painted decorations, lights: string lights, the fire pit, toadstool lamps,
 * paper lanterns, the gourd lantern (the family look: dark oiled timber and
 * black iron by day with pale unlit glass; at dusk and night warm cores,
 * soft halos and a pool of light on the grass). Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('lights', (function () {
  const whole = rows => rows;   // the kit paints the moving parts into the icons itself
  const WOOD = ['#7a5636', '#5a3e26', '#a07a52', '#3a2818'], IRONP = ['#2f3438', '#1e2224', '#4e565c'];
  const STONE = ['#8e8a82', '#6e6a62', '#b4b0a6', '#55524c'];
  return whole({
    'string-lights': { v: 3, box: [-58, -86, 58, 8], glow: { w: 110, halo: -62, radius: 120 }, draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 52, 5, .2);
      for (const s of [-1, 1]) { B.post(s * 50, -78, 0, 4.4, WOOD).f(B.circ(s * 50, -78, 2.6), WOOD[2]).f(B.rect(s * 50 - 3, -74, 6, 2), IRONP[0]); B.tufts(r, s * 50, 1, 14, 6, o.season); }
      // the cable sags between the posts; bulbs hang on short drops
      H.cord(B, 'M-50 -74Q0 -46 50 -74', .9, '#3a3a3a');
      const cols = ['#ffe08a', '#ffb3c8', '#a8e0ff'];
      for (let i = 0; i < 9; i++) {
        const t = (i + .5) / 9, x = -50 + t * 100, y = -74 + 28 * 4 * t * (1 - t) * .5 + 0, yy = (1 - t) * (1 - t) * -74 + 2 * (1 - t) * t * -46 + t * t * -74;
        const col = cols[(o.v + i) % 3]; B.s(`M${x} ${yy}v3`, '#2a2a2a', .8);
        if (o.night) H.bulb(B, x, yy + 6, 2.6, col, true);
        else B.f(B.rect(x - 1.2, yy + 2, 2.4, 2.4), '#3a3a3a').f(B.ell(x, yy + 7, 2.8, 3.6), H.shade(col, -.05)).f(B.ell(x + .8, yy + 7.6, 1.6, 2.6), H.shade(col, -.25), .5).f(B.ell(x - .9, yy + 5.6, .9, 1.4), '#ffffff', .9);
      }
    } },
    'fire-pit': { box: [-56, -40, 56, 10], glow: { w: 140, halo: -16, radius: 140 }, draw(B, o) {
      const { H, r } = o; B.shadow(0, 2, 52, 9, .26);
      // a ring of lobed stones round a dark bowl of ash and logs
      B.f(B.ell(0, -8, 40, 14), STONE[3]).f(B.ell(0, -9, 30, 9), '#2a2622').f(B.ell(-4, -10, 18, 4), '#4a4440', .7);
      for (const [lx, ly, rot] of [[-10, -12, -.35], [8, -12, .35], [0, -10, 0]]) { B.cx.save(); B.cx.translate(lx, ly); B.cx.rotate(rot); B.f(B.rr(-12, -2.6, 24, 5.2, 2.6), WOOD[1]).f(B.rr(-12, -2.6, 24, 2, 1), WOOD[2], .7).f(B.ell(12, 0, 1.8, 2.6), '#d8b888'); B.cx.restore(); }
      if (o.night) B.f(B.ell(0, -10, 20, 6), B.rad(0, -10, 20, [[0, 'rgba(255,170,70,.9)'], [1, 'rgba(255,120,40,0)']]));
      else B.f(B.ell(0, -9, 12, 3), '#6a5a50', .7);
      const n = 16; for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n, x = Math.cos(a) * 38, y = -8 + Math.sin(a) * 12; if (Math.sin(a) < -.2) B.stone(r, x, y, 8, 5.4, STONE, null); }
      for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n, x = Math.cos(a) * 38, y = -8 + Math.sin(a) * 12; if (Math.sin(a) >= -.2) B.stone(r, x, y, 8.6, 6, STONE, i % 4 === 0 ? ['#7d8f4e', '#a3b06a'] : null); }
      B.tufts(r, -44, 6, 10, 4, o.season).tufts(r, 44, 6, 10, 4, o.season);
      // a log seat to one side, a marshmallow stick leaning on the ring
      B.s('M30 -14l18 -20', '#8a6a46', 1.4).f(B.rr(45, -38, 5, 4, 1.4), '#fbf6ec');
    }, anim: [{ id: 'flames', x: 0, y: -10, kind: 'flicker', speed: 7, box: [-22, -34, 22, 4], draw(B, o) {
      const { H } = o; const s = o.night ? 1.2 : .9;
      H.flame(B, -8, 0, s * .8); H.flame(B, 7, 0, s * .85); H.flame(B, 0, 1, s * 1.25);
      if (o.night) B.f(B.ell(0, -12, 20, 18), B.rad(0, -12, 20, [[0, 'rgba(255,220,140,.35)'], [1, 'rgba(255,200,120,0)']]));
    } }] },
    'toadstool-lamps': { box: [-26, -38, 26, 6], glow: { w: 70, halo: -16, radius: 80 }, draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 22, 5, .22);
      B.f(o.D.blob(r, 0, 0, 22, 5, 9, .4), H.shade(o.K.leafOf(o.season)[0], -.05), .8);
      // three red caps with white spots on pale stalks, lit from inside at night
      for (const [x, y, k] of [[-11, 0, 1], [10, -2, .8], [1, 3, .62]]) {
        B.f(`M${x - 3.6 * k} ${y}q${-1 * k} ${-9 * k} ${1 * k} ${-17 * k}h${5.2 * k}q${2 * k} ${8 * k} ${1 * k} ${17 * k}z`, o.night ? '#fff1c8' : '#f2ead6').f(B.rect(x - 2.6 * k, y - 16 * k, 1.6 * k, 15 * k), '#ffffff', .6);
        if (o.night) B.f(B.circ(x, y - 18 * k, 18 * k), B.rad(x, y - 18 * k, 18 * k, [[0, 'rgba(255,220,150,.55)'], [1, 'rgba(255,220,150,0)']]));
        const cap = `M${x - 13 * k} ${y - 15 * k}q${1 * k} ${-14 * k} ${13 * k} ${-14 * k}q${12 * k} 0 ${13 * k} ${14 * k}q${-13 * k} ${4 * k} ${-26 * k} 0z`;
        B.f(cap, B.lin(x - 13 * k, 0, x + 13 * k, 0, [[0, o.night ? '#ff7a5a' : '#e8604a'], [.5, o.night ? '#f05a3a' : '#d0402e'], [1, o.night ? '#c83a2a' : '#8e2a1e']]));
        B.f(`M${x - 13 * k} ${y - 15 * k}q${13 * k} ${4 * k} ${26 * k} 0q${-13 * k} ${2.4 * k} ${-26 * k} 0z`, o.night ? '#ffe0a0' : '#f4e2c4');
        for (const [dx, dy, rr] of [[-6, -22, 2.2], [1, -26, 1.8], [6, -20, 2], [-1, -19, 1.3], [-9, -17.6, 1.1]]) B.f(B.ell(x + dx * k, y + dy * k, rr * k, rr * .8 * k), '#fbf6ea');
        B.f(B.ell(x - 5 * k, y - 25 * k, 3.4 * k, 1.4 * k), '#ffffff', .35);
      }
      B.tufts(r, 0, 4, 40, 9, o.season);
    } },
    'paper-lanterns': { v: 3, box: [-58, -100, 58, 8], glow: { w: 120, halo: -60, radius: 120 }, draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 52, 5, .2);
      for (const s of [-1, 1]) { B.post(s * 50, -88, 0, 4.4, WOOD).f(B.circ(s * 50, -88, 2.6), WOOD[2]); B.tufts(r, s * 50, 1, 14, 6, o.season); }
      H.cord(B, 'M-50 -84Q0 -64 50 -84', .8, '#5a5a5a');
    }, anim: [-28, 0, 28].map((x, i) => ({ id: 'lantern' + i, x, y: -76 + (Math.abs(x) < 1 ? 5 : 1), kind: 'sway', speed: 1.1 + i * .17, amp: .06, box: [-14, -2, 14, 36], draw(B, o) {
      const { H } = o, col = [['#f2a7c8', '#ffd36a', '#a8d8f0'], ['#f6c445', '#e04a3a', '#f4f1ea'], ['#9b7fd1', '#f2a7c8', '#7fb3d8']][o.v][i];
      // a round paper moon with ribs, a black cap and a tassel; glowing from within at night
      B.s('M0 0v6', '#4a4a4a', .8).f(B.rr(-4, 5, 8, 3, 1), '#2a2a2a');
      if (o.night) B.f(B.circ(0, 18, 22), B.rad(0, 18, 22, [[0, 'rgba(255,220,150,.5)'], [1, 'rgba(255,220,150,0)']]));
      B.f(B.ell(0, 18, 11, 10), B.rad(-3, 15, 13, [[0, o.night ? '#fff6dc' : H.shade(col, .35)], [.6, o.night ? H.shade(col, .45) : col], [1, H.shade(col, o.night ? .1 : -.25)]]));
      for (const dx of [-7, -3.4, 0, 3.4, 7]) B.s(`M${dx * .5} 8.4Q${dx * 1.55} 18 ${dx * .5} 27.6`, H.shade(col, -.35), .5, .55);
      B.f(B.rr(-4, 27, 8, 2.6, 1), '#2a2a2a').s('M0 29.6v4', H.shade(col, -.2), 1.2).f(B.ell(0, 34, 1.2, 1.8), H.shade(col, -.2));
    } })) },
    'lantern-gourd': { box: [-22, -46, 22, 6], glow: { w: 70, halo: -22, radius: 80 }, draw(B, o) {
      const { H, r } = o; B.shadow(1, 1, 14, 4, .24);
      B.f(o.D.blob(r, 0, -1, 14, 4, 8, .4), o.K.leafOf(o.season)[0], .7);
      // a carved gourd on a stump: ribbed orange skin, a smug face lit from inside
      B.f(B.rr(-8, -10, 16, 10, 2), WOOD[1]).f(B.ell(0, -10, 8, 2.4), '#c8a070').f(B.ell(0, -10, 5, 1.4), '#a07a4a', .6);
      const body = 'M0 -40q-14 0 -15 14q0 14 15 15q15 -1 15 -15q-1 -14 -15 -14z';
      if (o.night) B.f(B.circ(0, -26, 26), B.rad(0, -26, 26, [[0, 'rgba(255,200,110,.45)'], [1, 'rgba(255,200,110,0)']]));
      B.f(body, B.lin(-15, 0, 15, 0, [[0, '#f4a85a'], [.45, '#e88a3c'], [1, '#b0581e']]));
      for (const dx of [-8, 0, 8]) B.s(`M${dx * .4} -39Q${dx * 1.4} -26 ${dx * .4} -11.4`, '#b0581e', .8, .55);
      B.f(B.ell(-7, -33, 4, 2.4), '#ffd8a0', .45);
      const lit = o.night ? '#ffe08a' : '#4a2410';
      B.f('M-8 -30l3 -3l3 3z', lit).f('M2 -30l3 -3l3 3z', lit).f('M-8 -22q8 7 16 0q-3 2 -8 2q-5 0 -8 -2z', lit);
      B.f('M-1 -40q-1 -6 4 -9l2 2q-4 2 -3 7z', '#6a7a3a').f('M3 -46q6 -4 8 1q-5 1 -8 -1z', '#7aa04a');
      B.tufts(r, 0, 2, 26, 6, o.season);
    } },
  });
})());

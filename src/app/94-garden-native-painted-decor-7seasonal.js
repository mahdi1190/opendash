/* Painted decorations: the seasons (spring eggs, summer bunting, harvest
 * pumpkins and leaves, winter snow and lights), spooky, festive and the
 * ruins. Family looks: seasonal is soft and handmade (cloth, paint, straw);
 * spooky is dusk-coloured, mossy and a little crooked, lit warm at night;
 * festive is glossy red, gold and evergreen; ruins match the village's
 * ruined arch and dry-stone wall (coursed pale stone, moss, ivy).
 * Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('seasonal', (function () {
  const WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'];
  // a ribbed pumpkin: lobes darker at the edges, a light face upper left, a curly stem
  function pumpkin(B, o, x, y, rx, ry, col) {
    const { H } = o, p = H.pal(col || '#e8801c');
    B.f(B.ell(x, y, rx, ry), p[3]).f(B.ell(x - rx * .42, y, rx * .58, ry * .96), p[1]).f(B.ell(x + rx * .42, y, rx * .58, ry * .96), p[1]);
    B.f(B.ell(x, y - ry * .02, rx * .5, ry), p[0]).f(B.ell(x - rx * .5, y - ry * .1, rx * .36, ry * .8), p[0]);
    B.f(B.ell(x - rx * .38, y - ry * .4, rx * .2, ry * .34), p[2], .7).f(B.ell(x + rx * .1, y - ry * .5, rx * .12, ry * .26), p[2], .45);
    B.f(B.rr(x - 1.8, y - ry - 5, 3.6, 7, 1.4), '#6a7a34').f(B.rect(x - 1.8, y - ry - 5, 1.4, 7), '#9aaa58', .8).s(`M${x + 1} ${y - ry - 3}q5 -4 7 0`, '#7a9a44', .9);
    return B;
  }
  // a carved face on a pumpkin: dark by day, glowing warm at night
  function face(B, o, x, y, s, kind) {
    const lit = o.night, c = lit ? '#ffd86a' : '#3a1a0a', c2 = lit ? '#fff4c0' : '#5a2a10';
    const eyes = kind === 1 ? [[-5, -3, 'M-1.6 0a1.6 2 0 1 0 3.2 0a1.6 2 0 1 0 -3.2 0z']] : null;
    if (kind === 1) { for (const ex of [-5, 5]) B.f(B.circ(x + ex * s, y - 4 * s, 2.2 * s), c); }
    else if (kind === 2) { for (const ex of [-5, 5]) B.f(`M${x + (ex - 3) * s} ${y - 2 * s}l${3 * s} ${-4 * s}l${3 * s} ${4 * s}z`, c); }
    else { for (const ex of [-5, 5]) B.f(`M${x + (ex - 3) * s} ${y - 2.4 * s}l${6 * s} ${-1 * s}l${-3 * s} ${-3.6 * s}z`, c); }
    B.f(`M${x - 8 * s} ${y + 1.5 * s}q${8 * s} ${6 * s} ${16 * s} 0l${-2 * s} ${3.6 * s}l${-2 * s} ${-1.6 * s}l${-2 * s} ${2.2 * s}l${-2 * s} ${-2 * s}l${-2 * s} ${2 * s}l${-2 * s} ${-2 * s}l${-2 * s} ${1.6 * s}z`, c);
    if (lit) B.f(B.ell(x, y, 3 * s, 2 * s), c2, .5);
    return eyes;
  }
  const snowCap = (B, r, x, y, rx, ry) => B.f(sceneDraw.blob(r, x, y, rx, ry, 7, .3), '#f6f8fa').f(sceneDraw.blob(r, x - rx * .25, y - ry * .3, rx * .5, ry * .45, 6, .3), '#ffffff', .9);
  return {
    'carved-pumpkin': { v: 3, glow: { w: 56, halo: -14, radius: 70 }, box: [-26, -42, 26, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 20, 5, .28);
      for (let i = 0; i < 5; i++) B.f(`M${-18 + i * 9} 1q2 -6 ${4 + r() * 3} -2`, o.season === 'winter' ? '#c8d0c8' : ['#a8432a', '#d9671c', '#c08a2a'][i % 3], .85);
      pumpkin(B, o, 0, -14, 19, 14, '#ef7f1a');
      face(B, o, 0, -14, 1, o.v);
      if (o.night) B.f(B.ell(0, -12, 16, 11), B.rad(0, -12, 16, [[0, 'rgba(255,214,110,.35)'], [1, 'rgba(255,214,110,0)']]));
      B.tufts(r, 0, 2, 34, 7, o.season);
    } },
    'leaf-pile': { box: [-32, -26, 32, 6], draw(B, o) {
      const { r, D } = o; B.shadow(0, 1, 28, 6, .24);
      const cols = ['#d9671c', '#a8432a', '#e8a23a', '#c0392b', '#b8862a', '#8a5a2a'];
      B.f(D.blob(r, 0, -8, 27, 9, 10, .4), '#8a4a24').f(D.blob(r, -2, -11, 23, 8, 10, .4), '#b0582a');
      for (let i = 0; i < 46; i++) {
        const t = r(), a = r() * Math.PI, x = (r() - .5) * 50 * (1 - t * .3), y = -4 - Math.sin(a) * 14 * (1 - Math.abs(x) / 30) - t * 2, ang = r() * 6.28, c = cols[i % cols.length];
        const l = 4 + r() * 3, dx = Math.cos(ang) * l, dy = Math.sin(ang) * l * .6;
        B.f(`M${x - dx} ${y - dy}q${-dy} ${dx * .5} ${dx * 2} ${dy * 2}q${dy} ${-dx * .5} ${-dx * 2} ${-dy * 2}z`, c).s(`M${x - dx} ${y - dy}l${dx * 2} ${dy * 2}`, H(c), .4, .6);
      }
      for (let i = 0; i < 6; i++) { const x = -28 + r() * 56; B.f(B.ell(x, 1 + r() * 2, 2.6, 1.2), cols[i % 4], .9); }
      if (o.season === 'winter') snowCap(B, r, -2, -17, 18, 4);
      function H(c) { return o.H.shade(c, -.35); }
    } },
    snowman: { v: 3, box: [-26, -70, 26, 6], draw(B, o) {
      const { r, H } = o, sc = ['#d83a3a', '#3a6fc4', '#3f8f5a'][o.v], sp = H.pal(sc), snow = s => B.lin(-s, 0, s, 0, [[0, '#ffffff'], [.5, '#f2f6fa'], [1, '#c8d4e0']]);
      B.shadow(1, 1, 20, 5, .22); B.f(B.ell(0, 0, 22, 4), '#eef3f6', .8);
      B.f(B.circ(0, -16, 17), snow(17)).f(B.ell(-6, -22, 6, 4), '#ffffff', .7);
      B.f(B.circ(0, -42, 12), snow(12)).f(B.ell(-4, -46, 4, 3), '#ffffff', .7);
      // twig arms, coal buttons and eyes, a carrot nose
      B.s('M-14 -26l-12 -10M-21 -32l-4 1M14 -26l11 -12M21 -34l4 -1', '#5a4030', 1.6);
      for (const y of [-24, -16, -8]) B.f(B.circ(0, y, 1.7), '#2f2a26');
      B.f(B.circ(-4, -45, 1.4), '#2f2a26').f(B.circ(4, -45, 1.4), '#2f2a26').f('M0 -42l10 2.4l-10 1.6z', '#ef7f1a').f('M0 -42l10 2.4l-10 .4z', '#f8a050');
      for (let i = 0; i < 5; i++) B.f(B.circ(-5 + i * 2.5, -37.4 + Math.sin(i / 4 * Math.PI) * 1.6, .8), '#2f2a26');
      // the borrowed scarf, a battered hat
      B.f(B.rr(-12, -33, 24, 5, 2.4), sp[0]).f(B.rect(-12, -33, 24, 1.4), sp[2], .8).f('M5 -30l-1 13l5 1l1 -13z', sp[1]).s('M5 -18l5 .6M5.5 -20l5 .6', sp[2], .6);
      B.f(B.rr(-12, -55, 24, 3, 1.4), '#2f3438').f(B.rr(-8, -66, 16, 12, 1.4), '#2f3438').f(B.rect(-8, -58, 16, 2), sp[0]).f(B.rect(-8, -66, 4, 11), '#4a5054', .7);
      B.tufts(r, -16, 2, 8, 3, 'winter').tufts(r, 16, 2, 8, 3, 'winter');
    } },
    'festive-lights': { v: 2, glow: { w: 110, halo: -44, radius: 110 }, box: [-54, -70, 54, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 50, 5, .22);
      for (const s of [-1, 1]) { B.post(s * 48, -62, 0, 4.4, WOOD).f(B.circ(s * 48, -63, 3), WOOD[2]); B.tufts(r, s * 48, 1, 12, 4, o.season); }
      // an evergreen garland swagged between the posts, a red bow at each end
      const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, x = -48 + t * 96, y = -58 + 22 * Math.sin(t * Math.PI); pts.push([x, y]); }
      for (const [x, y] of pts) B.f(o.D.blob(r, x, y, 6, 4.4, 7, .5), '#2f5f2e');
      for (const [x, y] of pts) B.f(o.D.blob(r, x - 1, y - 1.6, 4, 2.6, 6, .5), '#4a8a44', .9);
      for (let i = 0; i < pts.length; i += 3) { const [x, y] = pts[i]; B.f(B.circ(x + 2, y + 1, 1.4), '#c8302a'); }
      for (const s of [-1, 1]) { const x = s * 46, y = -60; B.f(`M${x} ${y}q-7 -6 -8 0q1 5 8 0z`, '#d8352a').f(`M${x} ${y}q7 -6 8 0q-1 5 -8 0z`, '#c02a24').f(B.circ(x, y, 1.6), '#a82020').f(`M${x - 1} ${y}l-3 9l2 -1l2 2z`, '#d8352a'); }
      // bulbs hanging below, lit at night
      const cols = ['#ffd36a', '#e04a3a', '#7fb3f0', '#f27aa8'];
      for (let i = 1; i < pts.length; i += 2) { const [x, y] = pts[i]; B.s(`M${x} ${y + 2}v2`, '#2a3a2a', .8); H.bulb(B, x, y + 5.4, 2, cols[(i + o.v) % 4], o.night); }
      if (o.season === 'winter') for (let i = 0; i < pts.length; i += 2) snowCap(B, r, pts[i][0], pts[i][1] - 3.4, 4, 1.6);
    } },
    bunting: { v: 2, box: [-54, -84, 54, 6], draw(B, o) {
      const { r, H } = o, cols = o.v % 2 ? ['#f2a7c8', '#7fb3f0', '#f6c445', '#9fc35a'] : ['#d83a3a', '#f4f1ea', '#3a6fc4']; B.shadow(0, 1, 50, 5, .2);
      for (const s of [-1, 1]) { B.post(s * 48, -78, 0, 3.6, WOOD).f(B.circ(s * 48, -79, 2.6), WOOD[2]); B.tufts(r, s * 48, 1, 12, 4, o.season); }
      H.cord(B, 'M-48 -74Q0 -50 48 -74', .9, '#e8dcc0');
      // cotton flags, each with its sunlit left half and a soft fold
      for (let i = 0; i < 9; i++) { const t = (i + .5) / 9, x = -46 + t * 92, y = -74 + 24 * Math.sin(t * Math.PI) * 1 - 0, c = cols[i % cols.length], p = H.pal(c), w = 9.4, tilt = (t - .5) * 3;
        const yy = -74 + 4 * 24 * t * (1 - t);
        B.f(`M${x - w / 2} ${yy}L${x + w / 2} ${yy + tilt * .4}L${x + tilt} ${yy + 13}z`, p[0]).f(`M${x - w / 2} ${yy}L${x} ${yy + .2}L${x + tilt} ${yy + 13}z`, p[2], .45).f(`M${x + w / 2} ${yy + tilt * .4}L${x + 1.5} ${yy + 2}L${x + tilt} ${yy + 13}z`, p[1], .4); }
    } },
    'painted-eggs': { box: [-26, -24, 26, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 22, 4, .2);
      B.f(o.D.blob(r, 0, -2, 24, 5, 9, .5), o.K.leafOf(o.season)[0], .9);
      const egg = (x, y, s, col, pat) => { const p = H.pal(col); B.f(`M${x} ${y}c${-6 * s} 0 ${-6 * s} ${-7 * s} ${-5 * s} ${-9 * s}c${1 * s} ${-3 * s} ${3 * s} ${-5 * s} ${5 * s} ${-5 * s}c${2 * s} 0 ${4 * s} ${2 * s} ${5 * s} ${5 * s}c${1 * s} ${2 * s} ${1 * s} ${9 * s} ${-5 * s} ${9 * s}z`, H.lit(B, x - 6 * s, x + 6 * s, col));
        if (pat === 0) B.s(`M${x - 5 * s} ${y - 6 * s}q${2.5 * s} ${-2 * s} ${5 * s} 0t${5 * s} 0`, '#ffffff', 1.1, .9).s(`M${x - 4.4 * s} ${y - 3 * s}h${8.8 * s}`, p[3], .8, .7);
        else if (pat === 1) for (const [dx, dy] of [[-2, -9], [2, -7], [-2.6, -4], [2.4, -3], [0, -11.5]]) B.f(B.circ(x + dx * s, y + dy * s, .9 * s), '#ffffff', .9);
        else B.s(`M${x - 5 * s} ${y - 8 * s}l${2 * s} ${2 * s}l${2 * s} ${-2 * s}l${2 * s} ${2 * s}l${2 * s} ${-2 * s}l${2 * s} ${2 * s}`, '#fff6d0', .9).s(`M${x - 5 * s} ${y - 4 * s}h${10 * s}`, p[3], 1, .7);
        B.f(B.ell(x - 2.4 * s, y - 9 * s, 1.2 * s, 2 * s), '#ffffff', .5); };
      egg(-11, -1, 1.05, '#f2a7c8', 0); egg(9, -2, .95, '#7fb3f0', 1); egg(-1, 2, .9, '#f6c445', 2); egg(18, 2, .7, '#9fc35a', 1);
      B.tufts(r, -4, 3, 44, 12, o.season).flowers(r, 0, 4, 46, 5, ['#ffffff', '#f6c445', '#e8a0c0']);
    } },
  };
})());

GardenPaintedDecor.add('spooky', (function () {
  function GHOST(B, o) {
      if (o.night) B.f(B.ell(0, -34, 26, 36), B.rad(0, -34, 30, [[0, 'rgba(207,232,255,.35)'], [1, 'rgba(207,232,255,0)']]));
      const sheet = 'M-16 -2Q-15 -42 -13 -52Q-9 -70 0 -70Q9 -70 13 -52Q15 -42 16 -2Q12 -8 9 -1Q6 -8 3 -1Q0 -8 -3 -1Q-6 -8 -9 -1Q-12 -8 -16 -2z';
      B.f(sheet, B.lin(-16, 0, 16, 0, [[0, '#ffffff'], [.5, '#f2f2f8'], [1, '#c4c8dc']])).f('M-12 -48Q-10 -64 -1 -66Q-7 -58 -8 -40Q-9 -24 -10 -6l-3 1z', '#ffffff', .8);
      B.s('M5 -46q2 18 1 40M-2 -40q1 14 0 32', '#c4c8dc', .9, .6);
      B.f(B.ell(-5, -52, 2.6, 3.8), '#1a1a22').f(B.ell(5, -52, 2.6, 3.8), '#1a1a22').f(B.ell(0, -43, 2.4, 3), '#1a1a22').f(B.circ(-5.6, -53.4, .7), '#ffffff', .8);
      B.f('M-15 -30q-8 2 -9 8q5 -2 9 -3z', '#eceef6').f('M15 -30q8 2 9 8q-5 -2 -9 -3z', '#d4d8e6');
    
  }
  const STONE = ['#a39b8c', '#857d70', '#c4bdae', '#5f5a50'], MOSS = ['#5a8a4a', '#7a9a58'];
  function pk(B, o, x, y, rx, ry) {
    const { H } = o, p = H.pal('#e87a1a');
    B.f(B.ell(x, y, rx, ry), p[3]).f(B.ell(x - rx * .4, y, rx * .58, ry * .95), p[1]).f(B.ell(x + rx * .4, y, rx * .58, ry * .95), p[1]).f(B.ell(x, y, rx * .48, ry), p[0]).f(B.ell(x - rx * .45, y - ry * .1, rx * .34, ry * .78), p[0]).f(B.ell(x - rx * .36, y - ry * .42, rx * .18, ry * .3), p[2], .7);
  }
  function grin(B, o, x, y, s) {
    const c = o.night ? '#ffd86a' : '#3a1a0a';
    B.f(`M${x - 5 * s} ${y - 3 * s}l${3 * s} ${-2.4 * s}v${4 * s}zM${x + 5 * s} ${y - 3 * s}l${-3 * s} ${-2.4 * s}v${4 * s}z`, c).f(`M${x - 5 * s} ${y + 1 * s}q${5 * s} ${3.6 * s} ${10 * s} 0q${-5 * s} ${5.4 * s} ${-10 * s} 0z`, c);
  }
  return {
    'dc-gravestone': { box: [-24, -54, 24, 6], draw(B, o) {
      const { r, D } = o; B.shadow(3, 1, 20, 5, .3);
      B.f(D.blob(r, 0, 0, 18, 4, 8, .4), '#6a5a40', .5);
      // a round-headed slab leaning a little, the face weathered, lichen and moss
      B.cx.save(); B.cx.rotate(-.06);
      B.f('M-14 0V-32Q-14 -48 0 -48Q14 -48 14 -32V0z', STONE[1]).f('M-14 0V-32Q-14 -48 0 -48Q10 -48 13 -38Q4 -44 -6 -38Q-10 -34 -10 -24V0z', STONE[0]).f('M-12 -30Q-12 -44 -2 -45Q-9 -40 -9 -28V-2h-3z', STONE[2], .7).f(B.rect(10, -36, 4, 36), STONE[3], .35);
      B.s('M0 -40V-26M-5 -35H5', STONE[3], 1.5, .7).s('M-7 -19H7M-5 -14H5M-6 -9H4', STONE[3], .9, .5);
      B.f(D.blob(r, -6, -44, 6, 3, 6, .5), '#b8b878', .6).f(D.blob(r, 8, -20, 3, 4, 6, .5), '#a8b070', .5);
      B.cx.restore();
      B.f(D.blob(r, -10, -2, 9, 4, 7, .5), MOSS[0]).f(D.blob(r, 9, -1, 7, 3, 7, .5), MOSS[1], .9).f(D.blob(r, -12, -4, 4, 2, 6, .5), '#9aba6a', .8);
      B.tufts(r, 0, 2, 40, 10, o.season);
      if (o.season === 'winter') B.f(o.D.blob(r, 0, -47, 12, 3, 7, .3), '#f6f8fa');
    } },
    'dc-cauldron': { glow: { w: 70, halo: -30, radius: 80 }, box: [-28, -54, 28, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 22, 5, .3);
      // the fire under it: logs and embers (brighter at night)
      B.f(B.ell(0, -1, 16, 4), o.night ? '#ff9a3a' : '#c8642a', o.night ? .9 : .6).f(B.ell(0, -2, 8, 2), '#ffe08a', o.night ? .9 : .5);
      B.s('M-14 0l12 -4M14 0l-12 -4', '#5a3a24', 3).s('M-14 0l12 -4', '#7a5636', 1, .7);
      H.flame(B, -6, -4, .55, .8); H.flame(B, 5, -4, .45, .8);
      B.s('M-19 0L-14 -11M19 0L14 -11', '#22222a', 2.6);
      // an iron pot, lit rim, a green brew bubbling over
      B.f('M-22 -32Q-26 -7 0 -6Q26 -7 22 -32z', B.lin(-24, 0, 24, 0, [[0, '#5a5a6a'], [.35, '#33333e'], [1, '#18181e']])).f(B.ell(-11, -22, 4, 7), '#7a7a8a', .45);
      B.f(B.ell(0, -32, 23, 5.4), '#2a2a32').f(B.ell(0, -32.6, 20, 4.2), o.night ? '#a8ff6a' : '#6ad83a').f(B.ell(-6, -33.4, 8, 1.6), '#d8ffb0', .7);
      for (const [x, y, rr] of [[-8, -36, 3], [4, -38, 3.6], [12, -35, 2.2], [-1, -42, 2.2]]) B.f(B.circ(x, y, rr), '#7ae84a', .85).f(B.circ(x - rr * .3, y - rr * .3, rr * .35), '#eaffd0', .8);
      B.f('M14 -31q3 6 1 10q-2 -4 -3 -9z', '#6ad83a', .9).f(B.ell(0, -32, 23, 5.4), 'rgba(0,0,0,0)');
      B.s('M-22 -31q-4 0 -4 4M22 -31q4 0 4 4', '#33333e', 1.6);
      B.tufts(r, 0, 2, 44, 8, o.season);
    }, anim: [{ id: 'steam', x: 0, y: -44, kind: 'bob', speed: .9, amp: 2.4, box: [-14, -18, 14, 4], draw(B) { for (const [x, y, rr] of [[-6, -4, 5], [3, -10, 6], [-2, -15, 4]]) B.f(B.circ(x, y, rr), B.rad(x, y, rr, [[0, 'rgba(200,255,180,.45)'], [1, 'rgba(200,255,180,0)']])); } }] },
    'dc-raven-post': { box: [-22, -84, 30, 6], draw(B, o) {
      const { r, H } = o; B.shadow(1, 1, 12, 4, .28);
      // a split old fence post, a lean to it, and a raven with opinions
      B.f('M-4 0L-5 -60H4L4 0z', B.lin(-5, 0, 4, 0, [[0, '#7a5a42'], [.4, '#54392a'], [1, '#2e2018']])).s('M-1 -6L-2 -54', '#2e2018', .6, .7).s('M2 -20l1 -14', '#2e2018', .5, .6).f(B.rect(-6, -61, 11, 3), '#3e2a1e');
      B.f(o.D.blob(r, -4, -40, 3, 5, 6, .5), '#7a9a58', .8).f(o.D.blob(r, 3, -14, 3, 4, 6, .5), '#5a8a4a', .8);
      B.f('M-15 -62Q-10 -78 4 -76Q12 -76 14 -70L23 -68L14 -65Q10 -59 -2 -59L-17 -52z', '#22222a').f('M-10 -66Q-3 -74 6 -72Q0 -64 -10 -62z', '#3e3e50').f('M-12 -60Q-4 -62 6 -61', '#4a4a5e', .6);
      B.f('M-15 -62l-6 9l5 -2l2 4z', '#1a1a20').f('M14 -70L23 -68L14 -66z', '#3a3a40').f(B.circ(8, -71, 1.5), '#f2c432').f(B.circ(8.4, -71.4, .5), '#1a1a20');
      B.s('M0 -59v2M3 -59v2', '#3a3a40', .9);
      B.tufts(r, 0, 2, 22, 6, o.season);
      if (o.season === 'winter') B.f(B.ell(0, -61, 6, 1.6), '#f6f8fa');
    } },
    'dc-sheet-ghost': { box: [-26, -82, 26, 6], draw(B, o) {
      B.shadow(0, 1, 14, 3.6, .22);
    }, anim: [{ id: 'ghost', x: 0, y: -6, kind: 'bob', speed: 1.3, amp: 3, box: [-26, -76, 26, 4], draw: GHOST }] },
    'dc-dead-tree': { box: [-50, -124, 50, 8], draw(B, o) {
      const { r } = o, bark = '#3a2a22', lite = '#5a4436'; B.shadow(2, 2, 30, 6, .3);
      B.f('M-11 0Q-6 -28 -6 -52H6Q5 -28 13 0q-6 -3 -12 -1q-6 -1 -12 1z', B.lin(-10, 0, 10, 0, [[0, lite], [.4, bark], [1, '#1e1612']]));
      B.f('M-11 0q-4 2 -8 1q6 -3 8 -6zM13 0q4 2 9 1q-6 -3 -9 -6z', bark);
      B.s('M-2 -50Q-16 -62 -28 -86M2 -52Q14 -64 22 -96', bark, 5.4).s('M-16 -64L-38 -68M-22 -76L-16 -98M14 -64L36 -72M18 -80L6 -104', bark, 3).s('M-38 -68l-8 -6M-16 -98l-6 -8M36 -72l8 -10M6 -104l-4 -10M-28 -86l-8 -10M22 -96l8 -8', bark, 1.6);
      B.s('M-3 -52Q-16 -62 -27 -84', lite, 1.4, .6).s('M-5 -40v30', lite, 1.4, .5);
      B.f(B.ell(1, -30, 3.4, 5), '#140e0a').f(B.ell(.4, -31, 2, 3.4), '#0a0806');
      B.f(o.D.blob(r, -6, -3, 9, 3, 7, .5), '#5a8a4a', .8).f(o.D.blob(r, 8, -2, 6, 2.4, 7, .5), '#7a9a58', .8);
      // the crow, with opinions
      B.f('M18 -98q4 -8 12 -6q4 1 5 4l5 1l-5 2q-3 4 -9 4l-9 2z', '#22222a').f(B.circ(30, -102, .9), '#f2c432').s('M27 -94v2M30 -94v2', '#3a3a40', .7);
      if (o.season === 'winter') B.s('M-3 -53Q-16 -63 -28 -87M1 -55Q14 -65 22 -97M-16 -65L-37 -69M14 -65L35 -73', '#f6f8fa', .9, .85);
      B.tufts(r, 0, 3, 46, 10, o.season);
    } },
    'dc-pumpkin-stack': { glow: { w: 70, halo: -24, radius: 80 }, box: [-30, -60, 30, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 26, 6, .28);
      B.f(o.D.blob(r, 0, 0, 26, 5, 9, .5), '#c8a050', .7);   // a bed of straw
      for (let i = 0; i < 18; i++) { const x = -24 + r() * 48; B.s(`M${x} 1l${(r() - .5) * 8} -3`, '#e8c86a', .8, .9); }
      pk(B, o, -12, -12, 14, 11); pk(B, o, 13, -10, 11, 9); grin(B, o, -12, -12, 1); grin(B, o, 13, -10, .8);
      pk(B, o, 1, -31, 11, 9); grin(B, o, 1, -31, .85);
      B.f(B.rr(-.6, -45, 3.2, 7, 1.2), '#5f7a3a').s('M2 -42q6 -6 8 -1', '#7a9a44', .9).f('M-1 -43q-8 -4 -10 2q6 2 10 -2z', '#4a7a3a');
      if (o.night) for (const [x, y, s] of [[-12, -12, 13], [13, -10, 10], [1, -31, 10]]) B.f(B.ell(x, y, s, s * .7), B.rad(x, y, s, [[0, 'rgba(255,214,110,.32)'], [1, 'rgba(255,214,110,0)']]));
    } },
  };
})());

GardenPaintedDecor.add('festive', (function () {
  const GOLD = ['#e0b43a', '#a8841a', '#f8e08a', '#7a5a10'];
  function HORSE(B, o) {
      const { H } = o;
      // a twisted brass pole, then the horse: cream, a red saddle, a blue mane, gold trim
      B.f(B.rect(-1.6, -88, 3.2, 88), B.lin(-1.6, 0, 1.6, 0, [[0, GOLD[2]], [.5, GOLD[0]], [1, GOLD[3]]]));
      for (let y = -86; y < 0; y += 6) B.s(`M-1.6 ${y}l3.2 3`, GOLD[3], .7, .6);
      B.f(B.circ(0, -90, 2.6), GOLD[0]);
      const body = 'M-19 -38Q-20 -27 -8 -27H9Q16 -27 17 -36L22 -46L24 -57L17 -60L13 -48Q2 -42 -11 -42Q-17 -42 -19 -38z';
      B.s('M-13 -30L-18 -16l-3 -2M-7 -29L-5 -13M8 -29L12 -14M13 -30L20 -19l3 -2', '#e8dcc8', 3.6).s('M-13 -30L-18 -16M-7 -29L-5 -13M8 -29L12 -14M13 -30L20 -19', '#fbf5ec', 2.6);
      for (const [x, y] of [[-21, -18], [-5, -13], [12, -14], [23, -21]]) B.f(B.circ(x, y, 1.6), GOLD[1]);
      B.f(body, H.lit(B, -20, 24, '#fbf5ec')).f('M17 -60L26 -56L28 -51L22 -50z', '#f2ebdc').f(B.circ(20, -55, 1), '#2a2a32').f(B.ell(-8, -39, 7, 2), '#ffffff', .6);
      B.f('M-9 -43H7L9 -33H-10z', '#d8352a').f('M-9 -43H7L7.5 -41H-9z', '#f07a6a', .8).s('M-10 -33H9', GOLD[0], 1.4).f(B.circ(0, -33, 1.4), GOLD[0]);
      B.f('M16 -61L9 -48L14 -47L20 -59z', '#3a7ac4').f('M15 -60L11 -52l2 0z', '#7aaae0', .7);
      B.s('M-19 -38Q-27 -32 -24 -20', '#3a7ac4', 3.2).s('M-20 -37Q-25 -32 -24 -24', '#7aaae0', 1, .7);
      B.s('M14 -46l5 -1M21 -52q-4 4 -6 6', GOLD[0], 1);
      B.f(B.circ(0, -62, 3), '#d8352a').f(B.circ(-.6, -62.6, 1), '#ffffff', .6);
    
  }
  function BELL(B) {
      B.s('M0 0V10', '#d8352a', 1.4);
      B.f('M-9 26Q-8 10 0 10Q8 10 9 26z', B.lin(-9, 0, 9, 0, [[0, GOLD[2]], [.4, GOLD[0]], [1, GOLD[3]]])).f(B.rr(-10, 25, 20, 3, 1.4), GOLD[1]).f(B.circ(0, 29, 2.2), GOLD[3]).f('M-5 22Q-5 14 -1 12Q-3 16 -3 23z', '#ffffff', .5);
  }
  return {
    'dc-fir-tree': { glow: { w: 90, halo: -50, radius: 100 }, box: [-38, -112, 38, 8], draw(B, o) {
      const { r, D, H } = o; B.shadow(2, 2, 28, 6, .3);
      // a tub, then three tiers of boughs, each lit upper left and shaded below
      B.f(B.rr(-10, -14, 20, 14, 2), '#a8432a').f(B.rect(-10, -14, 20, 3), '#c86a4a').f(B.rect(-10, -14, 5, 14), '#d88a6a', .5).f(B.rect(-11, -15, 22, 2.4), GOLD[0]);
      B.f(B.rect(-3, -20, 6, 6), '#5a3a24');
      const tier = (y, w, h) => { B.f(`M${-w} ${y}Q0 ${y + 5} ${w} ${y}L0 ${y - h}z`, '#244f2e'); B.f(`M${-w + 3} ${y - 1}Q-2 ${y + 2} ${w * .4} ${y - 1}L0 ${y - h + 3}z`, '#3a7a42'); B.f(`M${-w * .7} ${y - h * .35}L0 ${y - h + 4}L${-w * .1} ${y - h * .4}z`, '#5a9a52', .7);
        for (let i = 0; i < 7; i++) { const x = -w + (i + .5) * w * 2 / 7; B.f(`M${x - 3} ${y + 1 - Math.abs(x) * .05}l3 3l3 -3z`, '#244f2e'); }
        if (o.season === 'winter') B.f(D.blob(r, -w * .3, y - h * .55, w * .45, 3, 7, .4), '#f6f8fa', .95); };
      tier(-16, 30, 32); tier(-38, 24, 30); tier(-60, 17, 30);
      // a red ribbon swag, baubles and a gold star
      B.s('M-24 -24Q0 -14 22 -28M-17 -46Q0 -40 18 -50M-10 -66Q0 -62 11 -70', '#d8352a', 1.8).s('M-24 -25Q0 -15 22 -29', '#f07a6a', .6, .7);
      const lit = o.night;
      for (const [x, y, c] of [[-14, -20, '#d8352a'], [10, -22, '#3a7ac4'], [-8, -40, GOLD[0]], [11, -44, '#d8352a'], [-3, -62, '#3a7ac4'], [6, -68, GOLD[0]], [20, -18, GOLD[0]], [-22, -16, '#f4f1ea'], [0, -30, '#f4f1ea'], [-12, -56, '#d8352a']]) H.bulb(B, x, y, 2.6, c, lit && (c === GOLD[0] || c === '#f4f1ea'));
      const star = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 3.4 : 8; star.push([Math.cos(a) * rr, -94 + Math.sin(a) * rr]); }
      if (lit) B.f(B.circ(0, -94, 16), B.rad(0, -94, 16, [[0, 'rgba(255,233,138,.6)'], [1, 'rgba(255,233,138,0)']]));
      B.f(B.poly(star), lit ? '#ffe98a' : GOLD[0]).f(B.poly(star.slice(0, 6).concat([[0, -94]])), GOLD[2], .6);
    } },
    'dc-gift-pile': { box: [-36, -44, 36, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 32, 6, .26);
      const box = (x, y, w, h, c, rb) => { const p = H.pal(c), d = h * .3;
        B.f(B.poly([[x - w / 2, y - h], [x - w / 2 + d * .6, y - h - d], [x + w / 2 + d * .6, y - h - d], [x + w / 2, y - h]]), p[2]).f(B.rect(x - w / 2, y - h, w, h), p[0]).f(B.poly([[x + w / 2, y], [x + w / 2, y - h], [x + w / 2 + d * .6, y - h - d], [x + w / 2 + d * .6, y - d]]), p[1]);
        B.f(B.rect(x - 2, y - h, 4, h), rb).f(B.poly([[x - 2 + d * .3, y - h - d / 2 - 0], [x + 2 + d * .3, y - h - d / 2], [x + 2, y - h], [x - 2, y - h]]), rb).f(B.rect(x - w / 2, y - h / 2 - 2, w, 4), rb).f(B.poly([[x + w / 2, y - h / 2 - 2], [x + w / 2 + d * .6, y - h / 2 - 2 - d], [x + w / 2 + d * .6, y - h / 2 + 2 - d], [x + w / 2, y - h / 2 + 2]]), H.shade(rb, -.2));
        const bx = x + d * .3, by = y - h - d / 2; B.f(`M${bx} ${by}q-8 -8 -9 -1q2 3 9 1z`, rb).f(`M${bx} ${by}q8 -8 9 -1q-2 3 -9 1z`, H.shade(rb, -.12)).f(B.circ(bx, by, 1.6), H.shade(rb, -.25)); };
      box(-14, 0, 26, 20, '#d8352a', '#f2c432'); box(14, 0, 22, 16, '#3a7ac4', '#fbf5ec'); box(1, -21, 18, 12, '#3f8a4a', '#fbf5ec'); box(26, 2, 10, 8, '#f2c432', '#d8352a');
      if (o.season === 'winter') B.f(o.D.blob(r, 3, -37, 9, 2, 6, .3), '#f6f8fa');
      B.tufts(r, 0, 3, 60, 8, o.season);
    } },
    'dc-candy-cane': { box: [-24, -76, 14, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 9, 3, .26);
      const d = 'M0 0V-52Q0 -68 -11 -68Q-20 -68 -20 -58', cx = B.cx;
      B.s(d, '#b8301e', 10.4).s(d, '#fbf5ec', 8.6);
      cx.save(); cx.setLineDash([5, 6]); B.s(d, '#d8352a', 8.6, 1, 'butt'); cx.setLineDash([1.4, 9.6]); cx.lineDashOffset = -7.6; B.s(d, '#e88a80', 8.6, .7, 'butt'); cx.restore();
      B.s('M-2.4 -2V-52Q-2.4 -64 -11 -65', '#ffffff', 2, .55).s('M2.6 -4V-50', '#801a10', 1.4, .25);
      B.f(o.D.blob(r, 0, 0, 7, 2.4, 6, .5), '#f6f8fa', o.season === 'winter' ? 1 : 0);
      B.f(`M-6 -42q-6 -4 -7 1q2 3 7 -1z`, '#d8352a').f(`M-6 -42q2 -7 6 -4q-1 4 -6 4z`, '#c02a24').f(B.circ(-5, -42, 1.4), '#901c18');
      B.tufts(r, 0, 2, 16, 5, o.season);
    } },
    'dc-maypole': { box: [-42, -132, 42, 8], draw(B, o) {
      const { r, H } = o; B.shadow(0, 2, 36, 6, .26);
      const ribs = [['#d8352a', -36, -6], ['#3a7ac4', -20, 0], ['#f2c432', 20, 0], ['#3f8a4a', 36, -6], ['#e8607a', -8, 3], ['#f4f1ea', 8, 3]];
      for (const [c, x, y] of ribs) { B.s(`M0 -112Q${x * .55} -70 ${x} ${y}`, H.shade(c, -.25), 1.8, .9).s(`M0 -112Q${x * .55} -70 ${x} ${y}`, c, 1.1); B.f(`M${x} ${y}l-2.4 5l2.4 -1.4l2.4 1.4z`, c); }
      B.f(o.D.blob(r, 0, -1, 9, 3, 7, .5), o.K.leafOf(o.season)[1]); if (o.season !== 'winter') for (const [x, c] of [[-5, '#e8607a'], [0, '#fbf5ec'], [5, '#f2c432']]) B.f(B.circ(x, -2, 1.8), c);
      B.f(B.rect(-2.8, -116, 5.6, 116), H.lit(B, -2.8, 2.8, '#c8a46a'));
      B.s('M-2.8 -100l5.6 -6M-2.8 -84l5.6 -6M-2.8 -68l5.6 -6M-2.8 -52l5.6 -6', '#d8352a', 1.6, .8);
      // a crown of flowers and a pennant
      B.f(o.D.blob(r, 0, -113, 11, 4.4, 8, .5), '#3f8a4a').f(o.D.blob(r, -2, -115, 7, 2.4, 6, .5), '#6aaa58');
      for (const [x, c] of [[-8, '#e8607a'], [-3, '#fbf5ec'], [3, '#f2c432'], [8, '#e8607a']]) B.f(B.circ(x, -114, 2.2), c).f(B.circ(x, -114, .8), '#f2c432');
      B.s('M0 -118V-130', '#8a6a3a', 1.2).f('M0 -130L13 -126L0 -122z', '#d8352a').f('M0 -130L13 -126L0 -127z', '#f07a6a', .6);
      B.tufts(r, 0, 2, 70, 14, o.season).flowers(r, 0, 4, 70, 8, ['#ffffff', '#f6c445', '#e8a0c0']);
    } },
    'dc-bell-arch': { box: [-58, -100, 58, 8], draw(B, o) {
      const { r, D } = o; B.shadow(0, 2, 50, 6, .26);
      // an evergreen arch: a dark core and lobed bough clumps all round, holly berries
      B.s('M-44 0V-52Q-44 -82 0 -82Q44 -82 44 -52V0', '#4a3a2c', 3);
      const pts = []; for (let i = 0; i <= 26; i++) { const t = i / 26; let x, y; if (t < .3) { x = -44; y = -t / .3 * 52; } else if (t > .7) { x = 44; y = -(1 - t) / .3 * 52; } else { const a = Math.PI * (1 - (t - .3) / .4); x = Math.cos(a) * 44; y = -52 - Math.sin(a) * 30; } pts.push([x, y]); }
      for (const [x, y] of pts) B.f(D.blob(r, x + 1, y + 1, 9, 7, 8, .5), '#244f2e');
      for (const [x, y] of pts) B.f(D.blob(r, x - 1.4, y - 1.4, 6.4, 5, 7, .5), '#3f6a3a', .95);
      for (let i = 0; i < pts.length; i += 2) { const [x, y] = pts[i]; B.f(D.blob(r, x - 3, y - 3, 3.4, 2.4, 6, .5), '#6a9a58', .8); }
      for (let i = 1; i < pts.length; i += 3) { const [x, y] = pts[i]; B.f(`M${x - 5} ${y}q2.5 -3 5 -1q2.5 -2 5 1q-2.5 3 -5 1q-2.5 2 -5 -1z`, '#2a6a32').f(B.circ(x, y - 1, 1.6), '#d8352a').f(B.circ(x + 2, y + .6, 1.4), '#c02a24').f(B.circ(x - .5, y - 1.5, .5), '#ffb0a0'); }
      if (o.season === 'winter') for (let i = 6; i <= 20; i += 2) { const [x, y] = pts[i]; B.f(D.blob(r, x, y - 5, 6, 2, 6, .3), '#f6f8fa'); }
      // a red bow at the crown
      B.f('M0 -84q-10 -8 -11 0q2 4 11 0z', '#d8352a').f('M0 -84q10 -8 11 0q-2 4 -11 0z', '#c02a24').f(B.circ(0, -84, 2), '#a82020');
      B.tufts(r, -44, 2, 14, 5, o.season).tufts(r, 44, 2, 14, 5, o.season);
    }, anim: [{ id: 'bell', x: 0, y: -82, kind: 'sway', speed: 1.4, amp: .12, box: [-12, -2, 12, 30], draw: BELL }] },
    'dc-snow-globe': { box: [-24, -62, 24, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 20, 5, .28);
      // a turned wooden base with a gold band, a glass globe, a tiny winter inside
      B.f('M-18 0L-15 -13H15L18 0z', B.lin(-18, 0, 18, 0, [[0, '#8a5e3a'], [.4, '#6a4426'], [1, '#3e2614']])).f(B.rect(-16, -15, 32, 3), GOLD[0]).f(B.rect(-16, -15, 32, 1), GOLD[2]);
      B.f(B.circ(0, -35, 21), 'rgba(196,228,240,.55)');
      B.f('M-19 -25Q0 -33 19 -25Q12 -15 0 -15Q-12 -15 -19 -25z', '#fbfdff').f('M-19 -25Q0 -31 19 -25', '#dfe8f0', .6);
      B.f('M-8 -24L-2 -44L4 -24z', '#2f6a3a').f('M-6 -30L-2 -44L0 -30z', '#4a8a4a').f(B.rect(-3, -24, 2, 3), '#5a3a24');
      B.f(B.rr(5, -30, 9, 7, 1), '#c86a4a').f('M4 -30l5.5 -5l5.5 5z', '#fbfdff').f(B.rect(8, -27, 2.6, 4), '#ffd86a', o.night ? 1 : .7);
      for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = r() * 16; B.f(B.circ(Math.cos(a) * d, -38 + Math.sin(a) * d * .9, .7 + r() * .5), '#ffffff', .9); }
      B.f(B.ell(-9, -46, 3.6, 6), '#ffffff', .55).f(B.ell(9, -24, 4, 2), '#ffffff', .25);
      B.s(B.circ(0, -35, 21), '#e8f4f8', .8, .5);
    } },
    'dc-carousel-horse': { box: [-30, -96, 32, 6], draw(B, o) {
      B.shadow(0, 1, 14, 4, .26);
      B.f(B.ell(0, -1, 12, 3.4), '#d8352a').f(B.ell(0, -2, 10, 2.6), GOLD[0]);
    }, anim: [{ id: 'horse', x: 0, y: -2, kind: 'bob', speed: 1.1, amp: 3.4, box: [-30, -92, 32, 4], draw: HORSE }] },
  };
})());

GardenPaintedDecor.add('ruins', (function () {
  const st = ['#c4bca4', '#a39a82', '#ddd6c0', '#7e7662'], MOSS = ['#7d8f4e', '#a3b06a', '#5f723c'];
  const moss = (B, r, x, y, rx, ry) => B.f(sceneDraw.blob(r, x, y, rx, ry, 7, .5), MOSS[0], .9).f(sceneDraw.blob(r, x - rx * .2, y - ry * .3, rx * .55, ry * .5, 6, .5), MOSS[1], .85);
  const ivy = (B, r, d, season) => { const L = GardenPaintedProps.kit.leafOf(season); B.s(d, L[0], 1.1, .9); const m = d.match(/-?\d+(\.\d+)?/g).map(Number); for (let i = 0; i + 1 < m.length; i += 2) { B.f(sceneDraw.blob(r, m[i] + (r() - .5) * 3, m[i + 1], 3, 2.4, 5, .5), L[1]).f(sceneDraw.blob(r, m[i] - 1, m[i + 1] - 1, 1.6, 1.2, 5, .5), L[2], .9); } };
  const grass = (B, o, w) => B.tufts(o.r, 0, 2, w, Math.round(w / 5), o.season);
  const snow = (B, o, x, y, rx) => { if (o.season === 'winter') B.f(sceneDraw.blob(o.r, x, y, rx, 2.2, 7, .3), '#f6f8fa'); };
  return {
    'dc-broken-column': { box: [-26, -86, 26, 6], draw(B, o) {
      const { r } = o; B.shadow(2, 1, 22, 5, .3);
      B.f(B.rr(-19, -8, 38, 8, 1.4), st[1]).f(B.rect(-19, -8, 38, 2.4), st[2]).f(B.rr(-16, -12, 32, 5, 1.2), st[0]).f(B.rect(-16, -12, 32, 1.4), st[2], .8);
      // a fluted shaft, broken in a jagged line, a drum fallen beside it
      const top = 'M-12 -12L-11 -66L-6 -72L-1 -64L4 -70L8 -62L12 -66L12 -12z';
      B.f(top, B.lin(-12, 0, 12, 0, [[0, st[2]], [.4, st[0]], [1, st[3]]]));
      for (const x of [-6, -1.5, 3, 7.5]) B.s(`M${x} -13V${-62 + Math.abs(x) * .3}`, st[3], .9, .45).s(`M${x - 1.2} -13V${-62 + Math.abs(x) * .3}`, st[2], .6, .5);
      B.f('M-11 -66L-6 -72L-1 -64L4 -70L8 -62L12 -66L12 -63L8 -59L4 -66L-1 -61L-6 -68L-11 -63z', st[3], .45);
      B.s('M-12 -40h24M-12 -26h24', st[3], .6, .4);
      ivy(B, r, 'M-11 -14q-3 -14 2 -26q3 -10 -1 -22', o.season);
      B.f(B.ell(18, -5, 6, 5.6), st[1]).f(B.ell(17, -6, 5, 4.6), st[0]).f(B.ell(16, -7, 2.4, 2), st[2], .7);
      moss(B, r, -12, -6, 8, 3); moss(B, r, 20, -10, 4, 1.6); snow(B, o, 1, -68, 8);
      grass(B, o, 44);
    } },
    'dc-stone-head': { box: [-36, -66, 36, 6], draw(B, o) {
      const { r } = o; B.shadow(2, 1, 32, 6, .3);
      // a great carved head sunk to the chin in the lawn: brow, closed eyes, a worn nose, lichen
      const head = 'M-27 0Q-31 -30 -25 -45Q-15 -62 4 -60Q25 -58 28 -38Q31 -18 27 0z';
      B.f(head, B.lin(-30, 0, 30, 0, [[0, st[2]], [.4, st[0]], [1, st[3]]])).f('M-23 -3Q-27 -30 -21 -43Q-13 -56 -3 -57Q-15 -36 -13 -3z', st[2], .5);
      B.s('M-17 -34Q-11 -38 -4 -34M9 -35Q15 -39 21 -34', st[3], 2.6, .8).s('M-15 -30q4 2 8 0M11 -31q4 2 8 0', st[3], 1.2, .7);
      B.f('M2 -32L-2 -17Q2 -14 7 -17L5 -32z', st[1]).f('M2 -32L-2 -17L1 -17L3 -31z', st[2], .6).f(B.ell(2, -15, 6, 1.6), st[3], .5);
      B.s('M-6 -9Q2 -6 10 -9', st[3], 1.6, .8).s('M-24 -20q2 6 0 12M24 -22q-2 6 0 12', st[3], 1, .4);
      B.f(sceneDraw.blob(r, 10, -52, 6, 3, 6, .5), '#c8c890', .55).f(sceneDraw.blob(r, -18, -16, 4, 3, 6, .5), '#b8c080', .5);
      moss(B, r, -10, -56, 14, 4); moss(B, r, 18, -2, 10, 3); ivy(B, r, 'M-26 -4q-4 -12 0 -24q2 -8 6 -14', o.season); snow(B, o, -2, -59, 14);
      B.f(sceneDraw.blob(r, 0, 0, 30, 4, 9, .4), GardenPaintedProps.kit.leafOf(o.season)[1], .9); grass(B, o, 64);
    } },
    'dc-fallen-capital': { box: [-36, -30, 36, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 32, 5, .3);
      // an Ionic capital on its side: the block, the scrolls, an egg-and-dart band, moss in the curls
      B.f(B.rr(-27, -14, 54, 14, 1.4), st[1]).f(B.rect(-27, -14, 54, 3), st[0]).f(B.rect(19, -14, 8, 14), st[3], .4);
      B.f(B.rr(-30, -21, 60, 7, 1.4), st[0]).f(B.rect(-30, -21, 60, 2), st[2]);
      for (let i = 0; i < 8; i++) B.f(B.ell(-17 + i * 5, -8, 1.8, 3), st[3], .45).f(B.ell(-17.4 + i * 5, -8.6, 1, 2), st[2], .5);
      for (const s of [-1, 1]) { const x = s * 23; B.f(B.circ(x, -21, 8.6), st[1]).f(B.circ(x - 1, -22, 7.4), st[0]); B.s(`M${x} -21m-1 0a1.4 1.4 0 1 1 2.8 0a3 3 0 1 1 -5.6 0a4.6 4.6 0 1 1 9.2 0`, st[3], 1, .7).f(B.ell(x - 3, -25, 2.6, 1.6), st[2], .7); }
      moss(B, r, 23, -15, 5, 2.4); moss(B, r, -8, -21, 10, 2.4); snow(B, o, 0, -22, 22);
      grass(B, o, 60);
    } },
    'dc-mossy-steps': { box: [-36, -34, 36, 6], draw(B, o) {
      const { r } = o; B.shadow(2, 1, 32, 6, .3);
      // three worn treads going up to nowhere, each a lit top and a shaded riser
      const step = (w, y, h, c) => { B.f(B.rr(-w / 2, y - h, w, h, 1.6), st[1]).f(B.rr(-w / 2, y - h, w, h * .32, 1.4), c).f(B.rect(w / 2 - 6, y - h, 6, h), st[3], .35).f(B.rect(-w / 2, y - 1.4, w, 1.4), st[3], .4); for (let i = 0; i < 3; i++) B.s(`M${-w / 2 + 6 + r() * (w - 12)} ${y - h + 2}l${(r() - .5) * 3} ${h - 3}`, st[3], .6, .5); };
      step(62, 0, 10, st[2]); step(50, -10, 10, st[0]); step(36, -20, 10, st[2]);
      moss(B, r, -24, -10, 8, 2.4); moss(B, r, 16, -20, 8, 2.2); moss(B, r, -6, -30, 9, 2.2); moss(B, r, 26, -1, 5, 2);
      B.f(sceneDraw.blob(r, 4, -31, 3, 1.4, 5, .5), '#c8c890', .6);
      ivy(B, r, 'M-30 -2q-2 -6 2 -10q4 -4 4 -10', o.season); snow(B, o, 0, -30, 16); snow(B, o, 0, -20, 22);
      if (o.season !== 'winter') B.flowers(r, 18, -1, 10, 3, ['#ffffff', '#f6c445']);
      grass(B, o, 66);
    } },
    'dc-stone-lion': { box: [-34, -58, 34, 6], draw(B, o) {
      const { r } = o; B.shadow(2, 1, 30, 6, .3);
      // a lion couchant on a plinth: the mane a ring of lobes, his patted nose worn pale
      B.f(B.rr(-30, -10, 60, 10, 1.4), st[1]).f(B.rect(-30, -10, 60, 2.4), st[2]).f(B.rect(22, -10, 8, 10), st[3], .4);
      B.f('M-26 -10Q-29 -30 -8 -32H10L18 -10z', B.lin(-28, 0, 18, 0, [[0, st[2]], [.5, st[0]], [1, st[1]]]));
      B.f('M-26 -12q-8 -2 -8 -10q3 2 6 3z', st[1]).s('M-28 -14q-6 -6 -4 -14', st[1], 2.2);
      B.f(B.rr(12, -24, 10, 14, 3), st[1]).f(B.rr(14, -12, 12, 4, 2), st[0]).f(B.rr(14, -12, 12, 1.6, 1), st[2], .8);
      for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; B.f(sceneDraw.blob(r, 11 + Math.cos(a) * 11, -38 + Math.sin(a) * 11, 5.6, 5, 6, .4), i % 2 ? st[1] : st[0]); }
      B.f(B.circ(11, -38, 10), st[1]).f(B.circ(10, -39, 9), st[0]).f(B.ell(7, -42, 4, 3), st[2], .7);
      B.f(B.circ(6, -40, 1.1), st[3]).f(B.circ(14, -40, 1.1), st[3]).f(B.ell(10, -34, 3.4, 2.6), '#e8e2d2').s('M7 -30q3 2 6 0', st[3], 1, .7).s('M5 -44q2 -1 3 0M13 -44q2 -1 3 0', st[3], .9, .7);
      B.s('M-14 -26q4 4 2 12M-2 -28q3 6 1 14', st[3], .8, .45);
      moss(B, r, -20, -30, 8, 2.6); moss(B, r, 18, -48, 6, 2.2); moss(B, r, -24, -2, 7, 2.4); snow(B, o, 10, -48, 9); snow(B, o, -10, -32, 12);
      grass(B, o, 64);
    } },
  };
})());

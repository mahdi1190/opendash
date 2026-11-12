/* Painted decorations, the lake and its catches (angling) and the seaside
 * (the family look: weathered timber, brass gone warm and dull, hemp rope,
 * galvanised tin, a contact shadow and tufts at the foot; lit from the upper
 * left, no outlines). Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('angling', (function () {
  const still = rows => rows;   // the kit draws the moving parts into the icons itself
  const WOOD = ['#8a6644', '#6a4c30', '#b08a5e', '#3e2c1c'], DARK = ['#6a4a2e', '#4e3420', '#8e6a44', '#2e2014'];
  const BRASS = ['#c8a23a', '#9a7a22', '#f0d47a', '#6a5216'], TIN = ['#a8b0b6', '#7a8288', '#d4dade', '#4a5056'];
  // a painted fish side on: body, belly light, tail, a fin and an eye (k: scale, dir 1 faces right)
  const fish = (B, x, y, k, c, dir, belly) => {
    const d = dir || 1, s = (a, b) => `${x + a * k * d} ${y + b * k}`;
    B.f(`M${s(-10, 0)}L${s(-16, -6)}Q${s(-15, 0)} ${s(-16, 6)}z`, c[1]);
    B.f(`M${s(-11, 0)}Q${s(-2, -8)} ${s(9, -2)}Q${s(11, 0)} ${s(9, 2)}Q${s(-2, 7)} ${s(-11, 0)}z`, c[0]);
    B.f(`M${s(-8, 1)}Q${s(0, 6)} ${s(8, 1.6)}Q${s(0, 3)} ${s(-8, 1)}z`, belly || '#f4ecd8', .7);
    B.f(`M${s(-2, -4.6)}Q${s(1, -9)} ${s(4, -4)}z`, c[1]).f(`M${s(-6, -3)}Q${s(0, -6)} ${s(6, -2.4)}`, c[2], .0);
    B.f(B.circ(x + 5.6 * k * d, y - 1 * k, 1.3 * k), '#f8f4ea').f(B.circ(x + 5.9 * k * d, y - 1 * k, .7 * k), '#1e1a16');
    B.s(`M${s(-6, -3.4)}Q${s(0, -5.4)} ${s(6, -2.6)}`, c[2], .7 * k, .7);
  };
  const GOLD = ['#e8843c', '#b85a22', '#f8b870'], PERCH = ['#7a9a4a', '#4e6a2a', '#b8c878'], CARP = ['#b89a5a', '#7a6232', '#e0c890'], PIKE = ['#6a8a5a', '#3e5a34', '#a8c088'], MINNOW = ['#8aa0a8', '#5a6e76', '#c8d4d8'];
  const bug = (B, x, y, k, c, wings) => {
    if (wings) { B.f(B.ell(x - 3.4 * k, y - 1 * k, 3.8 * k, 2.6 * k), c[1]).f(B.ell(x + 3.4 * k, y - 1 * k, 3.8 * k, 2.6 * k), c[1]).f(B.ell(x - 2.6 * k, y + 2 * k, 2.6 * k, 2 * k), c[0]).f(B.ell(x + 2.6 * k, y + 2 * k, 2.6 * k, 2 * k), c[0]).f(B.circ(x - 3.4 * k, y - 1.4 * k, .9 * k), '#ffffff', .7).f(B.circ(x + 3.4 * k, y - 1.4 * k, .9 * k), '#ffffff', .7); B.f(B.ell(x, y, .8 * k, 3.4 * k), '#2a2420'); return; }
    B.s(`M${x - 3 * k} ${y - 1 * k}l-2 ${-1.4 * k}M${x + 3 * k} ${y - 1 * k}l2 ${-1.4 * k}M${x - 3 * k} ${y + 1.4 * k}l-2.4 ${1 * k}M${x + 3 * k} ${y + 1.4 * k}l2.4 ${1 * k}`, '#2a2420', .5 * k);
    B.f(B.ell(x, y + .6 * k, 3 * k, 3.6 * k), c[0]).f(B.circ(x, y - 3.4 * k, 1.6 * k), '#2a2420').s(`M${x} ${y - 2.6 * k}v${6.6 * k}`, c[1], .5 * k).f(B.ell(x - 1.2 * k, y - .6 * k, 1 * k, 1.6 * k), '#ffffff', .4);
  };
  return still({
    // the aquarium: a tank on an oak stand, goldfish, weed, pebbles (the world draws your own fish live)
    aquarium: { iconOnly: true, box: [-60, -76, 60, 6], draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 54, 6, .26);
      H.plank(B, -54, -22, 108, 5, WOOD, r); B.f(B.rect(-52, -17, 104, 15), WOOD[1]).f(B.rect(-52, -17, 104, 2), WOOD[3], .4);
      for (const x of [-50, 44]) B.post(x + 3, -17, 0, 6, WOOD);
      const tx = -50, ty = -70, tw = 100, th = 48;
      B.f(B.rr(tx, ty, tw, th, 3), B.lin(0, ty, 0, ty + th, [[0, '#9ad4ee'], [1, '#3f8ab8']]));
      B.f(B.rect(tx + 1, ty + th - 8, tw - 2, 7), '#e0cf9a').f(B.rect(tx + 1, ty + th - 8, tw - 2, 1.4), '#b8a678', .6);
      for (let i = 0; i < 9; i++) B.f(B.ell(tx + 8 + i * 11 + r() * 4, ty + th - 4, 3 + r() * 2, 1.6), ['#9a8e7a', '#c8bca0', '#7a6e5c'][i % 3]);
      for (const [wx, hh, c] of [[-40, 26, '#3f8a4a'], [-36, 18, '#5aa85a'], [36, 24, '#3f8a4a'], [40, 16, '#5aa85a']]) B.s(`M${wx} ${ty + th - 6}q-5 ${-hh * .5} 1 ${-hh}M${wx + 3} ${ty + th - 6}q4 ${-hh * .4} -1 ${-hh * .8}`, c, 2.4);
      fish(B, -14, ty + 16, 1.1, GOLD, 1); fish(B, 16, ty + 28, .9, GOLD, -1); fish(B, 6, ty + 12, .7, ['#f4c040', '#c89020', '#fae090'], -1);
      for (let i = 0; i < 5; i++) B.f(B.circ(-24 + i * 3, ty + th - 14 - i * 7, 1.2 + (i % 2) * .6), '#ffffff', .55);
      B.f(B.rect(tx + 4, ty + 4, 6, th - 14), '#ffffff', .22).f(B.rect(tx + 14, ty + 4, 2, th - 14), '#ffffff', .16);
      B.s(B.rr(tx, ty, tw, th, 3), '#e8f4f8', 2, .85);
      B.beam(tx - 3, ty - 5, tw + 6, 5, WOOD).f(B.rect(tx + 8, ty - 2.4, tw - 16, 1.2), '#fff6d8', .6);
    } },
    // a glazed oak case, nine bugs pinned on cork paper
    'bug-case': { iconOnly: true, box: [-30, -74, 30, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 24, 4, .26);
      B.f(B.poly([[-10, 0], [-4, -12], [4, -12], [10, 0]]), WOOD[1]).f(B.poly([[-10, 0], [-4, -12], [0, -12], [-5, 0]]), WOOD[2], .5);
      B.f(B.rr(-27, -70, 54, 58, 3), WOOD[1]).f(B.rr(-27, -70, 54, 4, 2), WOOD[2]).f(B.rect(23, -70, 4, 58), WOOD[3], .35);
      B.f(B.rect(-23, -64, 46, 48), '#efe3c4');
      for (let i = 0; i < 18; i++) B.f(B.circ(-21 + r() * 42, -62 + r() * 44, .8), '#d8c8a0', .8);
      const C = [['#3a8a4a', '#1e4a2a'], ['#d8452a', '#7a1e12'], ['#3a5ab0', '#7aa0e0'], ['#c88a2a', '#7a4a12'], ['#e8c24a', '#a8601a'], ['#5a3a2a', '#2a1a12'], ['#7a5ad0', '#c8a8f0'], ['#2a7a8a', '#123a42'], ['#e86a8a', '#f4c0d0']];
      C.forEach((c, i) => { const x = -15 + (i % 3) * 15, y = -54 + Math.floor(i / 3) * 14; bug(B, x, y, 1.2, c, i === 2 || i === 6 || i === 8); B.f(B.circ(x, y - 4.6, .7), '#a8a8a8'); });
      B.f('M-21 -62l14 0l-10 44l-4 0z', '#ffffff', .3).f(B.rect(-23, -64, 46, 48), 'rgba(206,232,236,.12)');
      B.f(B.rect(-6, -18.4, 12, 2.6), BRASS[0]).f(B.rect(-6, -18.4, 12, .8), BRASS[2], .8);
    } },
    // a board of three mounted fish on brass plates
    'trophy-board': { iconOnly: true, box: [-60, -72, 60, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 50, 5, .26);
      B.post(-45, -44, 0, 6, WOOD).post(45, -44, 0, 6, WOOD);
      B.f(B.rr(-56, -70, 112, 42, 4), DARK[1]).f(B.rr(-56, -70, 112, 5, 3), DARK[2], .8).f(B.rr(-56, -32, 112, 4, 2), DARK[3], .5);
      B.f(B.rr(-50, -64, 100, 30, 2), DARK[0]);
      for (let i = 0; i < 5; i++) B.s(`M-48 ${-60 + i * 6}h96`, DARK[1], .5, .5);
      [[CARP, 1.3], [PERCH, 1], [PIKE, 1.5]].forEach(([c, k], i) => { const x = -32 + i * 32; B.f(B.ell(x, -49, 12, 7), DARK[3], .25); fish(B, x, -50, k, c, i % 2 ? -1 : 1); B.f(B.rr(x - 8, -39, 16, 3.6, 1), BRASS[0]).f(B.rect(x - 6, -38.4, 12, .8), BRASS[3], .5).f(B.rect(x - 8, -39, 16, 1), BRASS[2], .7); });
      B.f(B.rect(-48, -66, 30, 1.6), '#ffffff', .2); B.tufts(r, -45, 1, 12, 4, o.season).tufts(r, 45, 1, 12, 4, o.season);
    } },
    // a cast-iron pole and a copper fish that turns to the wind
    'fish-weathervane': { box: [-26, -96, 26, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 12, 3.4, .26);
      B.stone(r, 0, -3, 9, 4.6, ['#a8a090', '#868070', '#c8c2b0'], null);
      B.s('M0 -4V-70', '#3a3e42', 2.6).s('M-.6 -6V-68', '#6a7076', .8, .8);
      B.s('M-12 -62h24M0 -74v24', '#3a3e42', 1.2).text('N', 0, -79, 6, '#3a3e42', 'Georgia, serif', 'bold').text('E', 16, -62, 5, '#3a3e42').text('W', -16, -62, 5, '#3a3e42');
      B.f(B.circ(0, -70, 2.2), BRASS[0]); B.tufts(r, 0, 1, 20, 6, o.season);
    }, anim: [{ id: 'vane', x: 0, y: -84, kind: 'sway', speed: .5, amp: .08, box: [-24, -10, 24, 10], draw(B) {
      B.s('M-20 0h18', '#3a3e42', 1.2).f(B.poly([[-22, 0], [-17, -3.4], [-18, 0], [-17, 3.4]]), '#3a3e42');
      fish(B, 6, 0, 1.25, ['#e8a83a', '#a8641a', '#f8d488'], 1, '#f8dca0'); B.f(B.circ(0, 0, 1.4), '#3a3e42');
    } }] },
    // a dented tin bucket of lake water, a minnow peeping out
    'bait-bucket': { box: [-20, -40, 22, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 15, 3.6, .26);
      B.f('M-12 -26l3 26h18l3 -26z', B.lin(-12, 0, 12, 0, [[0, TIN[2]], [.4, TIN[0]], [1, TIN[3]]]));
      for (const y of [-19, -8]) B.f(`M${-11.2 + (26 + y) * .1} ${y}h${22.4 - (26 + y) * .2}v1.6h${-(22.4 - (26 + y) * .2)}z`, TIN[1], .6);
      B.f(B.ell(-4, -12, 2.4, 3.4), TIN[1], .35);
      B.f(B.ell(0, -26, 12, 3.2), TIN[3]).f(B.ell(0, -26, 10.6, 2.4), '#2f6a98').f(B.ell(-3, -26.6, 5, 1), '#9ac8e8', .7);
      B.s('M-11 -26Q0 -44 11 -26', TIN[3], 1.4).s('M-11 -26Q0 -43 11 -26', TIN[2], .5, .7);
      fish(B, 4, -31, .75, MINNOW, 1); B.f(B.ell(4, -27, 3, .8), '#2f6a98');
      B.s('M-16 -1q3 -4 6 0t6 0', '#d88a8a', 1.4, .9); B.tufts(r, 0, 1, 26, 6, o.season);
    } },
    // a pole, a flag of a fish blowing out from it
    'fish-flag': { box: [-14, -82, 14, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 8, 2.6, .26);
      B.post(0, -76, 0, 3.6, WOOD).f(B.circ(0, -77, 2.4), BRASS[0]).f(B.circ(-.6, -77.6, .9), BRASS[2]);
      B.tufts(r, 0, 1, 18, 6, o.season); B.flowers(r, 2, 1, 16, 3, ['#4a7ad0', '#6a9ae8']);
    }, anim: [{ id: 'flag', x: 1.8, y: -72, kind: 'flutter', speed: 4, amp: .08, box: [0, -10, 40, 12], draw(B) {
      B.f('M0 -8Q14 -12 34 -6L28 0L34 6Q14 4 0 6z', '#4a7ab0').f('M0 -8Q14 -12 34 -6L30 -3Q14 -7 0 -3z', '#7aa4d4', .8).f('M0 2Q14 4 30 3L34 6Q14 5 0 6z', '#2e5a8a', .7);
      B.f(B.circ(6, -2, 1.8), '#f4ead8').f(B.circ(6.3, -2, .9), '#1e2a3a');
      for (const x of [12, 18, 24]) B.s(`M${x} -6q-2 4 0 8`, '#f4ead8', .8, .6);
    } }] },
    // a jar of fireflies: dark by day, a soft green-gold glow at dusk
    'firefly-jar': { glow: { w: 54, halo: -20, radius: 60 }, box: [-16, -46, 16, 6], draw(B, o) {
      const { r, night } = o; B.shadow(0, 1, 12, 3.4, .26);
      if (night) B.f(B.circ(0, -20, 24), B.rad(0, -20, 24, [[0, 'rgba(236,248,140,.55)'], [1, 'rgba(236,248,140,0)']]));
      B.f(B.rr(-11, -36, 22, 35, 6), night ? 'rgba(220,240,180,.55)' : 'rgba(206,232,212,.5)');
      B.f(B.ell(0, -3, 10, 2.4), 'rgba(120,150,120,.35)');
      for (let i = 0; i < 4; i++) B.s(`M${-6 + i * 4} -3q${(r() - .5) * 6} -8 ${(r() - .5) * 3} -14`, '#5a8a4a', 1, .8);
      for (const [x, y] of [[-5, -14], [4, -22], [-2, -28], [6, -11], [1, -17]]) { if (night) B.f(B.circ(x, y, 3.6), '#f4ff8a', .45); B.f(B.circ(x, y, 1.4), night ? '#fbffc8' : '#6a6a4a'); }
      B.f('M-8 -33l3 0l-2 28l-3 0z', '#ffffff', .4);
      B.f(B.rr(-10, -41, 20, 6, 1.6), WOOD[0]).f(B.rect(-10, -41, 20, 1.6), WOOD[2]); H_cord(B, o);
      B.tufts(r, 0, 1, 22, 6, o.season);
    } },
    // a lost boot, now a planter of daisies
    'boot-planter': { box: [-20, -50, 22, 6], draw(B, o) {
      const { r, H } = o; B.shadow(2, 1, 15, 3.6, .26);
      B.f('M-10 -30H8V-12Q17 -10 17 -3V1H-10z', H.lit(B, -10, 17, '#7a5a3a')).f('M-10 -30H-5V1H-10z', '#9a7a52', .5);
      B.f(B.rect(-11, -2, 29, 3), '#3a2a1c').f(B.rect(-11, -2, 29, .8), '#6a5040');
      for (let i = 0; i < 4; i++) B.f(B.circ(-3 + i * 3.4, -24 + i * .2, .7), '#c8b080').s(`M-4 ${-24 + i * 1.4}l6 ${i % 2 ? 1 : -1}`, '#d8c8a0', .4, .6);
      B.f('M-4 -14q2 -2 4 0', '#5a4028', .5).f(B.ell(-11, -30, 1.6, 1), '#5a4028');
      B.f(B.ell(-1, -30, 9.4, 2.2), '#3a2a1c');
      H.blooms(B, r, -1, -36, 22, 14, ['#e8607a', '#f4f0e6', '#f2c432'], o.season);
      for (const [x, y, c] of [[-7, -42, '#f4f0e6'], [3, -46, '#f4f0e6'], [9, -39, '#e8607a']]) { B.s(`M${x} -32V${y}`, '#3f8a3a', 1); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; B.f(B.ell(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 1.6, 1.6), c); } B.f(B.circ(x, y, 1.3), '#f2c432'); }
      B.tufts(r, 0, 1, 26, 6, o.season);
    } },
    // tin cans hung on a driftwood bracket: they clink in the wind
    'can-chimes': { box: [-20, -82, 22, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 10, 3, .26);
      B.f('M-15 0L-13 -66L-10 -66L-11 0z', '#b8ad98').f('M-14.6 0L-12.6 -66L-11.6 -66L-12.6 0z', '#d8d0bc', .9);
      B.f('M-15 -68L16 -71L16 -67L-14 -64z', '#a89e88').f('M-15 -68L16 -71L16 -70L-15 -67z', '#d8d0bc');
      B.f(B.ell(16.5, -69, 1.6, 2.2), '#d8d0bc'); B.tufts(r, -12, 1, 14, 5, o.season);
    }, anim: [-6, 3, 11].map((x, i) => ({ id: 'can' + i, x, y: -68.6 + i * -.3, kind: 'sway', speed: 1.4 + i * .3, amp: .08, box: [-5, -1, 5, 34], draw(B) {
      const l = [16, 22, 14][i]; B.s(`M0 0V${l}`, '#8a8a7a', .6);
      B.f(B.rr(-3.4, l, 6.8, 10, 1), B.lin(-3.4, 0, 3.4, 0, [[0, '#dce2e6'], [.5, '#b8bcc0'], [1, '#7a7e82']])).f(B.rect(-3.4, l + 3, 6.8, 2.6), ['#c84a3a', '#3a6aa8', '#e8b040'][i], .85);
      for (const y of [l + .6, l + 9.2]) B.f(B.rect(-3.4, y, 6.8, .7), '#7a7e82', .7);
    } })) },
    // the sunken chest: iron-bound oak, a gold glint at the lock
    'sea-chest': { box: [-30, -40, 30, 6], draw(B, o) {
      const { r, H } = o; B.shadow(1, 1, 27, 5, .28);
      B.f(B.rect(-24, -20, 48, 20), H.lit(B, -24, 24, '#7a4a2a')); for (let i = 0; i < 3; i++) B.s(`M-24 ${-14 + i * 6}h48`, '#5a3418', .5, .6);
      B.f('M-25 -20Q0 -38 25 -20z', H.lit(B, -25, 25, '#8a5a34')).f('M-22 -22Q0 -35 8 -31Q-6 -30 -22 -22z', '#b07a4a', .5);
      B.f(B.rect(-25, -21, 50, 2.6), BRASS[1]).f(B.rect(-25, -21, 50, .8), BRASS[2], .8);
      for (const x of [-15, 15]) B.f(`M${x - 1.6} 0V-20Q${x - 1.6} -28 ${x} -28.6Q${x + 1.6} -28 ${x + 1.6} -20V0z`, BRASS[0]).f(B.rect(x - 1.6, -20, .8, 20), BRASS[2], .7);
      B.f(B.rr(-4, -24, 8, 9, 1.4), BRASS[0]).f(B.circ(0, -20, 1.4), '#2a1e10').f(B.rect(-.5, -20, 1, 3), '#2a1e10').f(B.circ(-2, -23, 1.2), '#fff4c8', .8);
      B.f(B.ell(20, -3, 3, 1.4), '#f2c432').f(B.circ(23, -2, 1.6), '#e8c24a').f(B.circ(22.4, -2.6, .6), '#fff4c8');
      B.f(sceneDraw.blob(r, -18, -1, 8, 2.4, 6, .5), '#4a7a5a', .7).f(sceneDraw.blob(r, 14, -26, 4, 1.6, 6, .5), '#6a8a5a', .6);
      B.tufts(r, 0, 1, 50, 9, o.season);
    } },
    // the wreck's wheel on a stump, spokes worn smooth
    'ship-wheel': { box: [-30, -76, 30, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 16, 4, .26);
      B.f('M-6 0V-34h12V0z', H.lit(B, -6, 6, '#6a4426')).f(B.ell(0, -34, 6, 1.6), '#8a6038');
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); B.s(`M${c * 5} ${-48 + s * 5}L${c * 27} ${-48 + s * 27}`, '#6a4426', 3.4).s(`M${c * 5} ${-48 + s * 5}L${c * 27} ${-48 + s * 27}`, '#a8784a', 1.1, .7); B.f(B.circ(c * 27, -48 + s * 27, 2.6), '#7a4a2a').f(B.circ(c * 27 - .8, -48 + s * 27 - .8, 1), '#b08050', .8); }
      B.s(B.circ(0, -48, 19), '#5a3418', 5).s(B.circ(0, -48, 19), '#9a6a3e', 2.2, .9).s('M-14 -61A19 19 0 0 1 10 -64', '#c8985e', 1, .7);
      B.f(B.circ(0, -48, 5.4), BRASS[1]).f(B.circ(0, -48, 4.2), BRASS[0]).f(B.circ(-1.4, -49.4, 1.6), BRASS[2], .8);
      B.tufts(r, 0, 1, 22, 7, o.season);
    } },
    // a carved lady from an old ship's bow, paint gone soft
    figurehead: { box: [-26, -94, 26, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 18, 4.4, .28);
      B.f('M-15 0L-7 -32H7L15 0z', H.lit(B, -15, 15, '#6a4426')).f('M-15 0L-7 -32H-3L-9 0z', '#8a6038', .6);
      B.f('M-12 -30Q0 -24 12 -30L8 -60Q0 -64 -8 -60z', H.lit(B, -12, 12, '#3f6f8a')).f('M-10 -32Q-6 -46 -7 -58', '#6a98b4', .0).s('M-6 -34q2 -12 0 -24M2 -32q1 -12 -1 -26', '#2e5268', .8, .8);
      B.s('M-8 -56Q-11 -46 -1 -46M8 -56Q11 -48 1 -46', '#c8a46a', 3.2).s('M-8 -57Q-10 -48 -3 -47', '#e0c48a', 1, .8);
      B.f(B.rr(-4, -66, 8, 7, 2), '#c8a46a');
      B.f(B.ell(0, -72, 8, 9.4), H.lit(B, -8, 8, '#d0ae74')).f(B.ell(-2.6, -74, 3.4, 3), '#e8d0a0', .7);
      B.f('M-9 -74Q-12 -54 -16 -42Q-7 -48 -4 -60Q-6 -66 -4 -80Q4 -86 9 -76Q4 -82 -2 -80Q-9 -80 -9 -74z', '#7a4a2a').f('M-6 -80Q2 -86 8 -77', '#a8703e', .7);
      B.s('M-3 -72h1.6M2 -72h1.6', '#3a2010', .9).s('M-1.4 -67q1.4 1 2.8 0', '#8a4a3a', .7).f(B.circ(-4, -69.4, 1.4), '#e09080', .4).f(B.circ(4, -69.4, 1.4), '#e09080', .4);
      B.f(B.circ(2, -84, 2.4), '#d8452a', .9);
      B.tufts(r, 0, 1, 30, 7, o.season);
    } },
    // the festival rosette on a stake, ribbons lifting in the breeze
    'rosette-stand': { box: [-20, -66, 20, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 10, 3, .26);
      B.post(0, -32, 0, 3, WOOD); B.tufts(r, 0, 1, 18, 6, o.season);
    }, anim: [{ id: 'ros', x: 0, y: -44, kind: 'sway', speed: 1.1, amp: .05, box: [-17, -17, 17, 32], draw(B) {
      B.f('M-6 8L-11 28L-4 23L-1 8z', '#d8452a').f('M-6 8L-9 22L-6 20z', '#f07050', .6).f('M6 8L11 28L4 23L1 8z', '#e8c24a').f('M6 8L9 22L6 20z', '#fae08a', .6);
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; B.f(B.ell(Math.cos(a) * 11, Math.sin(a) * 11, 4.6, 4.6), i % 2 ? '#c03a22' : '#d8452a'); }
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + .3; B.f(B.circ(Math.cos(a) * 7, Math.sin(a) * 7, 3.4), '#e8c24a'); }
      B.f(B.circ(0, 0, 6), '#fff4c8').f(B.circ(0, 0, 4.4), '#f6ead0').f(B.circ(-1.6, -1.6, 1.8), '#ffffff', .7);
      B.f(B.circ(0, 0, 13.6), 'rgba(255,255,255,0)').f(B.ell(-6, -7, 4, 2), '#ffffff', .25);
    } }] },
    // a plaster cast of a strange footprint, laid on a slab
    'thing-cast': { box: [-54, -30, 54, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 48, 5, .24);
      B.f(B.rr(-46, -16, 92, 16, 3), '#c8c4b4').f(B.rr(-46, -24, 92, 18, 4), '#ece8dc').f(B.rect(-44, -24, 88, 1.6), '#ffffff', .8);
      for (let i = 0; i < 6; i++) B.f(B.circ(-40 + r() * 80, -22 + r() * 14, .7), '#c8c4b4', .7);
      // a sunken print: the inner wall at the upper left in shade, the lower right lit
      const dent = d => B.f(d, '#9a9688').f(d, B.lin(0, -22, 0, -8, [[0, 'rgba(80,76,66,.5)'], [.6, 'rgba(80,76,66,0)'], [1, 'rgba(255,255,255,.35)']]));
      dent('M-32 -15Q-30 -20 -18 -20Q2 -21 12 -18Q16 -15 12 -12Q2 -10 -18 -10Q-30 -10 -32 -15z');
      for (const [x, y, rx, a] of [[22, -21, 6, -.35], [26, -15.4, 6.6, 0], [22, -10, 6, .35]]) { B.cx.save(); B.cx.translate(x, y); B.cx.rotate(a); dent(B.ell(0, 0, rx, 2.2)); B.cx.restore(); B.f(B.poly([[x + rx * .9, y - 1.6], [x + rx + 4, y + a * 3], [x + rx * .9, y + 1.4]]), '#8a8678'); }
      B.f(B.ell(-2, -15, 6, 1.6), '#b8b4a6', .6);
      B.f(B.rr(-42, -12, 13, 5, 1), '#e8d8a8').text('?', -35.5, -9.6, 4.4, '#6a5a3a', 'Georgia, serif', 'bold');
      B.tufts(r, -48, 1, 10, 4, o.season).tufts(r, 48, 1, 10, 4, o.season);
    } },
    // the old angler's carved plaque: four legendary fish
    'legend-plaque': { box: [-26, -70, 26, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 12, 3.4, .26);
      B.post(0, -24, 0, 4, WOOD);
      B.f(B.rr(-22, -64, 44, 42, 5), H.lit(B, -22, 22, '#6a4a2e')).f(B.rr(-22, -64, 44, 3, 2), '#9a7248', .8);
      B.f(B.rr(-18, -60, 36, 34, 3), '#8a6238').f(B.rect(-18, -60, 36, 1.4), '#b08458', .6);
      [[-8, -50, ['#f2c432', '#b88a1a', '#fae08a']], [8, -50, ['#dfe6f2', '#9aa4b4', '#ffffff']], [-8, -36, ['#f4a22a', '#b0661a', '#fac87a']], [8, -36, ['#5a4a3a', '#3a2c20', '#8a7a68']]].forEach(([x, y, c], i) => fish(B, x, y, .7, c, i % 2 ? -1 : 1));
      for (const [x, y] of [[-19, -61], [19, -61], [-19, -25], [19, -25]]) B.f(B.circ(x, y, 1.3), BRASS[0]).f(B.circ(x - .4, y - .4, .5), BRASS[2]);
      B.tufts(r, 0, 1, 20, 6, o.season);
    } },
  });
  // a twist of cord tying the firefly jar's lid
  function H_cord(B) { B.s('M-10 -37q10 3 20 0', '#c8b48a', 1, .9).s('M8 -36q3 3 1 7', '#c8b48a', .9, .9); }
})());

GardenPaintedDecor.add('seaside', (function () {
  const WOOD = ['#8a6644', '#6a4c30', '#b08a5e', '#3e2c1c'], ROPE = '#d8c48e', IRONC = ['#4a525c', '#343a42', '#7a828c', '#262a30'];
  const SAND = ['#e4d6ae', '#c8b888', '#f2e8c8', '#a89a70'];
  return {
    // a rusting anchor stood in the grass, rope wound round its shank
    'dc-anchor': { box: [-30, -78, 30, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 22, 4.6, .28);
      B.s('M0 -62V-10', IRONC[1], 5.4).s('M-1.4 -62V-10', IRONC[2], 1.4, .8);
      B.s('M-14 -52H14', IRONC[1], 5).s('M-14 -53.4H14', IRONC[2], 1.2, .8).f(B.circ(-15, -52, 3), IRONC[0]).f(B.circ(15, -52, 3), IRONC[0]);
      B.s('M-24 -22Q-20 -2 0 -4Q20 -2 24 -22', IRONC[1], 5.6).s('M-23 -23Q-19 -5 0 -6', IRONC[2], 1.2, .7);
      B.f('M-24 -30L-31 -16L-18 -19z', IRONC[0]).f('M24 -30L31 -16L18 -19z', IRONC[1]).f('M-24 -30L-27 -20L-22 -21z', IRONC[2], .7);
      B.s(B.circ(0, -67, 5), IRONC[1], 3).s('M-3.4 -70A5 5 0 0 1 3 -71', IRONC[2], 1, .8);
      for (const [x, y, s] of [[-10, -12, 2.4], [6, -40, 2], [-2, -24, 1.6], [16, -20, 1.8]]) B.f(sceneDraw.blob(r, x, y, s, s * .8, 6, .5), '#9a5a32', .55);
      B.s('M3 -63Q16 -50 6 -38T14 -14', '#a8945e', 2.6).s('M3 -63Q16 -50 6 -38T14 -14', ROPE, 1.6);
      for (let i = 0; i < 7; i++) B.s(`M-3 ${-56 + i * 5}l6 -1.6`, i % 2 ? ROPE : '#b8a46e', 2);
      B.tufts(r, 0, 1, 40, 9, o.season);
    } },
    // a stack of willow lobster pots, nets and a red float
    'dc-lobster-pots': { box: [-36, -50, 36, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 30, 5, .26);
      const pot = (x, y, w) => {
        const h = w * .62, dome = `M${x - w / 2} ${y - 2}A${w / 2} ${h} 0 0 1 ${x + w / 2} ${y - 2}z`;
        B.f(dome, B.lin(x - w / 2, 0, x + w / 2, 0, [[0, 'rgba(200,164,106,.55)'], [1, 'rgba(110,80,40,.6)']]));
        B.cx.save(); B.cx.clip(new Path2D(dome)); let m = ''; for (let i = -4; i <= 4; i++) m += `M${x + i * w / 9} ${y}L${x + i * w / 9 + 3} ${y - h - 2}`; for (let j = 1; j < 5; j++) m += `M${x - w / 2} ${y - j * h / 5}h${w}`; B.s(m, '#6a4a28', .5, .5); B.cx.restore();
        for (const k of [1, .6, .2]) B.s(`M${x - w / 2 * k} ${y - 2}A${w / 2 * k} ${h} 0 0 1 ${x + w / 2 * k} ${y - 2}`, '#c8a46a', 1.8).s(`M${x - w / 2 * k} ${y - 2.6}A${w / 2 * k} ${h} 0 0 1 ${x + w / 2 * k - 2} ${y - h * .7}`, '#f0d8a0', .6, .8);
        B.f(B.ell(x, y - h * .45, 3.4, 2.6), '#3a2a1a', .6).s(B.ell(x, y - h * .45, 3.4, 2.6), '#d8c08a', .8);
        B.f(B.rect(x - w / 2 - 1, y - 3, w + 2, 3.6), WOOD[1]).f(B.rect(x - w / 2 - 1, y - 3, w + 2, 1), WOOD[2]);
      };
      pot(-14, 0, 28); pot(14, 0, 28); pot(0, -17, 26);
      B.s('M-28 -4q8 4 14 -2t14 2', '#8a9a8a', .8, .7);
      B.f(B.ell(28, -10, 5, 7), '#d8352a').f(B.rect(23, -11, 10, 3), '#fbf5ec').f(B.ell(26.4, -13, 1.6, 2.6), '#ff8a7a', .6).s('M28 -17v-6', '#5a4a3a', 1);
      B.tufts(r, 0, 1, 56, 9, o.season);
    } },
    // a striped buoy, washed up and pleased about it
    'dc-buoy': { box: [-20, -56, 20, 6], draw(B, o) {
      const { r, H } = o; B.shadow(1, 1, 15, 4, .28);
      const body = 'M-13 -6Q-14 -26 0 -32Q14 -26 13 -6Q0 2 -13 -6z';
      B.f(body, H.lit(B, -14, 14, '#d8352a'));
      B.cx.save(); B.cx.clip(new Path2D(body)); B.f('M-16 -14Q0 -7 16 -14L16 -22Q0 -15 -16 -22z', H.lit(B, -14, 14, '#fbf5ec')); B.cx.restore();
      B.f(B.ell(-6, -24, 2.6, 4), '#ffffff', .45).f(B.ell(0, -2, 12, 2.4), '#8a2018', .4);
      B.s('M0 -31V-44', '#3a3a42', 2).f(B.circ(0, -46, 3.4), '#f2c432').f(B.circ(-1, -47, 1.2), '#fff4c8', .8);
      B.s('M10 -6q8 2 12 -2', ROPE, 1.4).f(sceneDraw.blob(r, -10, -2, 4, 1.6, 6, .5), '#5a7a4a', .7);
      B.tufts(r, 0, 1, 30, 7, o.season);
    } },
    // a sandcastle with three towers, a moat line, a flag on top
    'dc-sandcastle': { box: [-38, -64, 38, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 34, 5, .22);
      B.f(sceneDraw.blob(r, 0, -3, 36, 6, 10, .3), SAND[1]).f(sceneDraw.blob(r, -4, -4, 30, 4, 9, .3), SAND[0]);
      const tw = (x, h, w) => { B.f(B.rect(x - w / 2, -h, w, h), H.lit(B, x - w / 2, x + w / 2, SAND[0])); B.f(`M${x - w / 2 - 1} ${-h}h${w + 2}v-4h-3v3h-3v-3h-${w - 7}v3h-3v-3h-2z`, SAND[0]).f(B.rect(x - w / 2 - 1, -h - 1, w + 2, 2), SAND[2], .8); for (let i = 0; i < 3; i++) B.f(B.ell(x - w / 4 + r() * w / 2, -h * (.3 + i * .25), 1.2, .8), SAND[3], .6); };
      B.f(B.rect(-16, -22, 32, 22), H.lit(B, -16, 16, SAND[0]));
      tw(-21, 26, 16); tw(21, 26, 16); tw(0, 40, 16);
      B.f(B.rr(-5, -15, 10, 15, 5), SAND[3]).f(B.rr(-3.6, -13, 7, 13, 3.6), '#8a7a54');
      B.f(B.rr(-2, -33, 4, 5, 2), SAND[3]).f(B.rr(-23, -20, 4, 5, 2), SAND[3]).f(B.rr(19, -20, 4, 5, 2), SAND[3]);
      B.s('M0 -44V-58', '#7a5a3a', 1).f('M0 -58L11 -54L0 -50z', '#d8452a').f('M0 -58L11 -54L0 -55.4z', '#f07a5a', .7);
      B.f('M-32 -1Q-29 -7 -25 -1z', '#f0d8c0').f(B.circ(30, -2, 2.2), '#e8a0a0').f(B.circ(29.4, -2.6, .8), '#ffffff', .6);

    } },
    // a heap of shells, each one picked up and carried home
    'dc-shell-pile': { box: [-32, -32, 32, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 26, 4, .22);
      B.tufts(r, -26, 1, 8, 3, o.season).tufts(r, 27, 1, 8, 3, o.season);
      B.f(sceneDraw.blob(r, 0, -2, 26, 4.4, 9, .3), '#ead8b0').f(sceneDraw.blob(r, -4, -3, 18, 2.4, 8, .3), '#f6ead0', .8);
      // fan scallops, a whelk, a cockle and a mussel, each lit from the upper left
      const scallop = (x, y, s, c, dk) => { const fan = `M${x} ${y + 1.6 * s}L${x - 9 * s} ${y - 5 * s}A${9.4 * s} ${9.4 * s} 0 0 1 ${x + 9 * s} ${y - 5 * s}z`;
        B.f(fan, B.lin(x - 9 * s, y - 12 * s, x + 9 * s, y, [[0, '#ffffff'], [.35, c], [1, dk]]));
        for (let k = -3; k <= 3; k++) B.s(`M${x} ${y + 1.4 * s}L${x + k * 2.9 * s} ${y - 10 * s + Math.abs(k) * 1.3 * s}`, dk, .7 * s, .55);
        B.f(B.poly([[x - 3 * s, y + 2.6 * s], [x + 3 * s, y + 2.6 * s], [x + 1.4 * s, y], [x - 1.4 * s, y]]), dk); };
      scallop(-14, -2, 1.2, '#f4dcc4', '#c89a80'); scallop(13, -2, 1.15, '#f2c0b4', '#c07a70'); scallop(-1, -10, 1.35, '#fbeee0', '#d0b098');
      // a whelk: a spiral cone
      B.f('M18 -14q10 -2 12 6q-4 6 -12 4q-4 -4 0 -10z', '#e8d0b0').s('M19 -12q6 -1 9 4M20 -9q5 0 7 3', '#a8805a', .7, .8).f('M18 -14q-3 1 -4 4q2 1 4 0z', '#c09070').f(B.ell(25, -6, 2.4, 1.6), '#f4c8a8');
      B.f(B.ell(-24, -3, 4.4, 2.4), '#2e4a6a').f(B.ell(-25, -4, 2, .9), '#7aa0c8', .8);
      B.f(B.ell(6, -2, 3.4, 2.6), '#e8b880').s('M3.6 -2.4h4.8M4 -1h4', '#b8885a', .5, .7);
      B.f('M-28 -1L-25 -8L-22 -1L-27 -5H-23z', '#f2c432');
    } },
    // two posts and a pole with fishing nets hung to dry, cork floats along them
    'dc-net-rack': { box: [-56, -74, 56, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 50, 5, .26);
      B.post(-46, -66, 0, 5, WOOD).post(46, -66, 0, 5, WOOD);
      B.beam(-52, -68, 104, 5, WOOD);
      B.f('M-42 -64Q-38 -40 -32 -16Q0 -10 34 -18Q38 -40 42 -64z', 'rgba(200,182,138,.22)');
      let m = ''; for (let x = -38; x <= 38; x += 6) m += `M${x} -63Q${x + 2} -36 ${x * .82} -16`; for (let y = -58; y <= -20; y += 6) m += `M-41 ${y}Q0 ${y + 8} 41 ${y}`;
      B.s(m, '#9a8a62', .9, .7).s(m, '#d8c89a', .5, .8);
      for (const [x, y] of [[-32, -17], [-16, -13], [0, -12], [16, -13], [32, -18]]) B.f(B.ell(x, y, 3.4, 2.2), '#c89a5a').f(B.ell(x - 1, y - .8, 1.4, .8), '#e8c08a');
      B.s('M-44 -60q-4 10 -2 22M44 -60q4 10 2 20', ROPE, 1.2);
      B.f(B.ell(48, -40, 4, 6), '#d8352a').f(B.rect(44, -41, 8, 2.4), '#fbf5ec');
      B.tufts(r, -46, 1, 14, 5, o.season).tufts(r, 46, 1, 14, 5, o.season).tufts(r, 0, 1, 40, 6, o.season);
    } },
  };
})());

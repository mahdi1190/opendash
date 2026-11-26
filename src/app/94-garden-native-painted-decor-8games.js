/* Painted decorations won playing with the vale's folk (the prize ladders, VALE_PRIZES in 94-garden-folk3-0rules.js; the rows are in
 * GARDEN_DECOR, 94-garden-0catalog.js, so friends see them once they are put out). In the house style: lit from the upper left, soft
 * shade below, no outlines, a contact shadow and grass or worn soil round every foot. Sized against H (the player's height, about 52
 * units here, since decorations are drawn at 0.8): a pennant on its pole 1.6 H, the ribbon rack 1.2 H, the podium 0.9 H, a cup 0.8 H,
 * the lantern post 1.6 H, the board 1.1 H, the hoop 1 H, the cairn 0.5 H, the tally board 1 H, the stone on its plinth 0.6 H, the chest
 * 0.45 H, the map post 1.3 H, the carved stone flat in the grass. Registry: 94-garden-native-painted-decor-0kit.js ('games' family). */
GardenPaintedDecor.add('games', (function () {
  const WOOD = ['#8a6a46', '#6a5034', '#b08c5e', '#4a3420'], OAK = ['#7a5a3a', '#5a4028', '#a07c52', '#3e2a18'], IRON = ['#4a4e52', '#2e3236', '#7a8086'];
  const BRASS = ['#c8a050', '#8a6a2a', '#f0d890'], SILVER = ['#b8c0c8', '#7a8490', '#eef2f6'], STONE = ['#a8a090', '#868070', '#c8c2b0', '#6a6458'], SLATE = ['#8a929a', '#646c74', '#b4bcc4'];
  const MOSS = ['#6a8a4a', '#8aa860'];
  // the foot of anything: a soft contact shadow, a worn patch of soil, grass tufts round it
  const foot = (B, r, w, o, soil) => { B.shadow(1, 1, w, w * .26, .28); if (soil) B.f(B.ell(0, 1, w * .8, w * .18), '#7a6244', .32); B.tufts(r, -w * .55, 2, w * .7, 4, o.season).tufts(r, w * .55, 2, w * .7, 4, o.season); };
  // a rosette with tails (the prize kind): pleats, a centre, two notched tails
  const rosette = (B, x, y, R, c0, c1, c2) => {
    for (const s of [-1, 1]) B.f(`M${x + s * 1.4} ${y + 2}l${s * 3.4} ${R * 1.7}l${-s * 1.8} -1.8l${-s * 1.8} 2.6l${-s * .4} ${-R * 1.6}z`, s < 0 ? c1 : c0);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, a2 = (i + 1) / 14 * Math.PI * 2; B.f(B.poly([[x, y], [x + Math.cos(a) * R, y + Math.sin(a) * R], [x + Math.cos(a2) * R * .94, y + Math.sin(a2) * R * .94]]), i % 2 ? c0 : c1); }
    B.f(B.circ(x, y, R * .52), c2).f(B.circ(x - R * .16, y - R * .18, R * .2), '#ffffff', .55);
  };
  const crate = (B, x, w, h, n, pal, r) => {
    B.f(B.rr(x - w / 2, -h, w, h, 1.6), pal[0]).f(B.rect(x - w / 2, -h, w, 2.6), pal[2], .8).f(B.rect(x + w / 2 - w * .2, -h + 2.6, w * .2, h - 2.6), pal[1], .5);
    B.s(`M${x - w / 2 + 2} ${-h + 4}L${x + w / 2 - 2} ${-3}M${x + w / 2 - 2} ${-h + 4}L${x - w / 2 + 2} ${-3}`, pal[1], 1.8, .55).s(`M${x - w / 2} ${-h * .5}h${w}`, pal[1], 1, .4);
    B.f(B.circ(x, -h * .56, 6.4), ['#e8b830', '#c8d0d8', '#c8803c'][n - 1]).f(B.circ(x, -h * .56, 4.4), '#fff6dc', .92).text(String(n), x, -h * .56 + .3, 7, '#4a3420', 'Georgia, serif', '700');
    for (let i = 0; i < 3; i++) B.s(`M${x - w / 2 + 3 + r() * (w - 6)} ${-h * (.2 + r() * .2)}h${2 + r() * 3}`, pal[3] || pal[1], .5, .5);
  };
  return {
    /* ---------- racing ---------- */
    'vg-race-pennant': { box: [-14, -90, 44, 6], draw(B, o) {
      const { r } = o; foot(B, r, 9, o, true);
      for (const [x, y] of [[-5, 0], [4.6, 1.2], [6.8, -.4]]) B.stone(r, x, y, 2.6, 1.6, STONE, null);
      B.post(0, -84, 0, 3.4, WOOD).f(B.circ(0, -85.6, 2.6), BRASS[0]).f(B.circ(-.8, -86.4, 1), BRASS[2]);
      B.s('M-1.6 -12h3.2M-1.6 -40h3.2', WOOD[3], .6, .5);
    }, anim: [{ id: 'cloth', x: 1.6, y: -80, kind: 'flutter', speed: 3.6, amp: .07, box: [0, -10, 42, 14], draw(B) {
      B.f('M0 -9L38 -3L26 1.6L38 7L0 4z', '#c8402a').f('M0 -9L38 -3L30 -1.2L0 -4.4z', '#e86a48', .85).f('M0 1L26 1.6L38 7L0 4z', '#8e2a1a', .55);
      B.f(B.circ(9, -2.4, 2.4), '#f4ead8').f(B.circ(9, -2.4, 1.1), '#c8402a');
    } }] },
    'vg-ribbon-rack': { box: [-30, -68, 30, 6], draw(B, o) {
      const { r } = o; foot(B, r, 22, o, true);
      for (const x of [-22, 22]) { B.post(x, -60, 0, 4, OAK).f(B.circ(x, -61, 2.6), OAK[2]); B.f(B.rr(x - 3.4, -3, 6.8, 3, 1), OAK[3], .6); }
      B.beam(-24, -58, 48, 4, OAK).beam(-24, -26, 48, 3, OAK);
      const cols = [['#c8402a', '#e86a48', '#f6d860'], ['#3a7ab8', '#6a9ad8', '#f4ead8'], ['#e8b830', '#f6d870', '#fff4d0'], ['#4a8a4a', '#7ab86a', '#f4ead8'], ['#8a4aa8', '#b07ad0', '#f6e0f0']];
      cols.forEach((c, k) => { const x = -16 + k * 8; B.s(`M${x} -54v6`, '#c8b48a', .8); rosette(B, x, -44, 4.6, c[0], c[1], c[2]); });
      B.f(B.rr(-12, -22, 24, 8, 1.4), '#efe4c6').text('RACES', 0, -17.8, 5.4, '#5a4028', 'Georgia, serif', '700');
    } },
    'vg-podium': { box: [-56, -56, 56, 8], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 50, 8, .28).f(B.ell(0, 1, 44, 5), '#7a6244', .25);
      crate(B, -32, 30, 30, 2, ['#b8875a', '#8a6038', '#d8a878', '#5a3e24'], r);
      crate(B, 32, 30, 22, 3, ['#a87e54', '#7e5a36', '#c89a6a', '#5a3e24'], r);
      crate(B, 0, 34, 44, 1, ['#c4925e', '#94663c', '#e2b482', '#5a3e24'], r);
      B.tufts(r, -50, 2, 10, 5, o.season).tufts(r, 50, 2, 10, 5, o.season).tufts(r, -16, 2, 4, 2, o.season).tufts(r, 16, 2, 4, 2, o.season);
    } },
    'vg-race-cup': { box: [-18, -50, 18, 6], draw(B, o) {
      const { r } = o; foot(B, r, 14, o);
      B.f(`M-13 0l2.4 -12h21.2l2.4 12z`, STONE[1]).f(`M-10.6 -12h21.2l1 3.6h-23.2z`, STONE[2]).f(B.rect(-13, -2, 26, 2), STONE[3], .5);
      B.f(B.rr(-6, -9.4, 12, 4, .8), BRASS[0]).f(B.rect(-5.4, -9.4, 10.8, 1), BRASS[2], .8);
      B.f('M-3 -12h6l-1 -5h-4z', SILVER[1]).f('M-4.6 -18h9.2l-1 -1.6h-7.2z', SILVER[0]);
      B.f('M-9 -42q0 14 9 19q9 -5 9 -19z', B.lin(-9, 0, 9, 0, [[0, SILVER[2]], [.45, SILVER[0]], [1, SILVER[1]]])).f('M-9 -42h18v2h-18z', SILVER[2]);
      B.s('M-9 -38q-6 1 -5 7q1 4 6 3M9 -38q6 1 5 7q-1 4 -6 3', SILVER[1], 1.6).s('M-5.4 -40q.4 8 3.4 12', '#ffffff', 1.2, .55);
      B.f(B.circ(0, -33, 3.2), BRASS[0]).f(B.circ(-.6, -33.6, 1.2), BRASS[2]);
    } },
    /* ---------- hide and seek ---------- */
    'vg-seek-lantern': { glow: { w: 54, halo: -60, radius: 64 }, box: [-12, -92, 30, 6], draw(B, o) {
      const { r, night } = o; foot(B, r, 9, o, true);
      B.post(0, -84, 0, 3.4, IRON).s('M0 -84q0 -6 7 -6q8 0 8 7', IRON[0], 2.6).s('M15 -83v5', IRON[1], 1);
      if (night) B.f(B.circ(15, -66, 22), B.rad(15, -66, 22, [[0, 'rgba(255,214,120,.55)'], [1, 'rgba(255,214,120,0)']]));
      B.f(B.poly([[10, -77], [20, -77], [18.6, -74], [11.4, -74]]), IRON[0]);
      B.f(B.rr(11, -74, 8, 13, 1.4), night ? '#ffd56a' : '#e8e0c0').f(B.rect(11, -74, 8, 13), B.lin(11, 0, 19, 0, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(0,0,0,.12)']]));
      B.s('M11 -74v13M19 -74v13M15 -74v13', IRON[1], .8, .8).f(B.poly([[10.4, -61], [19.6, -61], [18, -58.6], [12, -58.6]]), IRON[0]);
      o.H.flame(B, 15, -63, .42, night ? .95 : .55);
      B.tufts(r, -2, 1, 6, 3, o.season).flowers(r, 3, 1, 10, 3, ['#f0e0a0', '#e8c8e0']);
    } },
    'vg-ready-board': { box: [-34, -62, 34, 6], draw(B, o) {
      const { r } = o; foot(B, r, 26, o, true);
      for (const x of [-22, 22]) B.post(x, -40, 0, 3.6, WOOD);
      B.f(B.rr(-30, -58, 60, 26, 3), WOOD[1]).f(B.rr(-29, -57, 58, 24, 2.6), WOOD[0]).f(B.rect(-29, -57, 58, 3), WOOD[2], .7);
      for (let i = 0; i < 5; i++) B.s(`M${-26 + r() * 52} ${-52 + r() * 16}h${3 + r() * 6}`, WOOD[3], .5, .45);
      B.text('COMING,', 0, -50, 7.4, '#efe4c6', 'Georgia, serif', '700').text('READY OR NOT!', 0, -41, 6.6, '#efe4c6', 'Georgia, serif', '700');
      B.f(B.circ(-26, -54, .9), IRON[2]).f(B.circ(26, -54, .9), IRON[2]).f(B.circ(-26, -36, .9), IRON[2]).f(B.circ(26, -36, .9), IRON[2]);
    } },
    'vg-hiding-hoop': { box: [-34, -60, 34, 6], draw(B, o) {
      const { r } = o; foot(B, r, 28, o, true);
      for (const x of [-20, 20]) { B.f(B.rr(x - 8, -8, 16, 8, 1.4), '#9a6a44').f(B.rect(x - 8, -8, 16, 2), '#b88a5e', .8); B.crown(r, x, -22, 9, 15, o.season, 5); }
      B.crown(r, -14, -42, 9, 9, o.season, 4).crown(r, 14, -42, 9, 9, o.season, 4).crown(r, 0, -48, 12, 8, o.season, 5);
      B.f(B.ell(0, -20, 9, 16), 'rgba(30,40,20,.35)');
    } },
    /* ---------- skimming ---------- */
    'vg-stone-cairn': { box: [-20, -32, 20, 6], draw(B, o) {
      const { r } = o; foot(B, r, 15, o);
      const pal = [SLATE, STONE, SLATE, STONE, SLATE, STONE];
      [[0, -2, 14, 4], [1, -7.5, 12, 3.6], [-.6, -12.6, 10.4, 3.2], [.8, -17.2, 8.6, 2.8], [-.4, -21.2, 7, 2.4], [.4, -24.6, 5, 2]].forEach(([x, y, rx, ry], k) => B.stone(r, x, y, rx, ry, pal[k], k === 0 ? MOSS : null));
    } },
    'vg-tally-board': { box: [-24, -58, 24, 6], draw(B, o) {
      const { r } = o; foot(B, r, 16, o, true);
      B.s('M-12 0L-6 -44M12 0L6 -44M0 -2L0 -40', WOOD[1], 2.6).s('M-11.4 0L-5.4 -44M12.6 0L6.6 -44', WOOD[2], .8, .7);
      B.f(B.rr(-17, -52, 34, 24, 2), OAK[1]).f(B.rect(-15, -50, 30, 20), '#3c4a44').f(B.rect(-15, -50, 30, 20), B.lin(-15, -50, 15, -30, [[0, 'rgba(255,255,255,.1)'], [1, 'rgba(0,0,0,.1)']]));
      for (let g = 0; g < 2; g++) { const x0 = -11 + g * 13; for (let i = 0; i < 4; i++) B.s(`M${x0 + i * 2.2} -47v9`, '#f0f0e6', 1, .85); B.s(`M${x0 - 1} -40L${x0 + 8} -46`, '#f0f0e6', 1, .85); }
      B.text('12', 8, -34, 6, '#f0f0e6', 'Georgia, serif', '700').f(B.rect(-15, -29, 30, 2.4), OAK[0]).f(B.rr(-13, -29.4, 6, 2, .6), '#f4f2ea');
    } },
    'vg-twelve-stone': { box: [-18, -36, 18, 6], draw(B, o) {
      const { r } = o; foot(B, r, 14, o);
      B.f(`M-11 0l1.6 -14h18.8l1.6 14z`, STONE[1]).f(`M-9.4 -14h18.8l.6 3h-20z`, STONE[2]).f(B.rect(-11, -2, 22, 2), STONE[3], .45);
      B.stone(r, 0, -17, 10, 3.6, SLATE, null);
      B.text('12', 0, -17.4, 5, '#4a5058', 'Georgia, serif', '700');
      B.f(B.rr(-5, -9, 10, 4, .8), BRASS[0]).f(B.rect(-4.4, -9, 8.8, .9), BRASS[2], .8);
    } },
    /* ---------- treasure ---------- */
    'vg-treasure-chest': { box: [-20, -32, 20, 6], draw(B, o) {
      const { r } = o; foot(B, r, 16, o, true);
      B.f('M-14 0q2 -4 14 -4.6q12 .6 14 4.6z', '#6a4a30', .7);
      B.f(B.rr(-12, -14, 24, 14, 1.6), OAK[0]).f(B.rect(-12, -14, 24, 3), OAK[2], .7).f(B.rect(6, -11, 6, 11), OAK[1], .5);
      B.f('M-12 -14q12 -9 24 0v1h-24z', OAK[1]).s('M-11 -14.6q11 -7.6 22 0', OAK[2], 1.2, .7);
      for (const x of [-7, 7]) B.f(B.rect(x - 1.4, -21, 2.8, 21), BRASS[1]).f(B.rect(x - 1.4, -21, 1, 21), BRASS[2], .7);
      B.f(B.rr(-2.4, -12.6, 4.8, 4.6, .8), BRASS[0]).f(B.circ(0, -10.4, .9), OAK[3]);
      B.f(B.poly([[-10, -15.4], [-6, -19], [-2, -16], [2, -19.4], [6, -16], [10, -18.6], [10, -15]]), '#f2d060', .9);
    } },
    'vg-map-post': { box: [-28, -74, 28, 6], draw(B, o) {
      const { r } = o; foot(B, r, 12, o, true);
      B.post(0, -40, 0, 4, OAK);
      B.f(B.rr(-24, -70, 48, 34, 2.4), OAK[1]).f(B.rr(-21, -67, 42, 28, 1.6), '#efe2c0').f(B.rect(-21, -67, 42, 28), B.lin(-21, -67, 21, -39, [[0, 'rgba(255,250,232,.3)'], [1, 'rgba(120,90,40,.15)']]));
      B.f(o.D.blob(r, -10, -56, 8, 6, 8, .4), '#9ab870').f(o.D.blob(r, 9, -49, 9, 5, 8, .4), '#a8c47e').f(o.D.blob(r, -12, -46, 5, 3, 7, .4), '#c8d4a0');
      B.s('M-20 -62q12 4 14 10t20 6', '#6a9ac8', 1.8, .85).s('M-16 -42q6 -6 12 -6t8 -8t8 -2', '#8a6a44', .9, .8);
      B.s('M8 -60l4 4M12 -60l-4 4', '#c8402a', 1.4).f(B.circ(-15, -51, 1), '#5a4028');
      B.s('M-17 -39.4q2 -1.4 4 0', '#8a6a44', .6, .6);
    } },
    'vg-x-stone': { box: [-22, -16, 22, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 18, 3.6, .2);
      B.stone(r, 0, -3, 17, 5.4, STONE, MOSS);
      B.s('M-5 -6.4l10 5M5 -6.4l-10 5', STONE[3], 1.8, .8).s('M-4.6 -6.8l10 5', STONE[2], .6, .5);
      B.tufts(r, -16, 2, 6, 3, o.season).tufts(r, 16, 2, 6, 3, o.season);
    } },
  };
})());

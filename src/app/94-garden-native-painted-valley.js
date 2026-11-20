/* Painted Millwater valley: the valley's landmarks in the painted props' own
 * brush (94-garden-native-painted-props.js), replacing their flat classic
 * drawings when the painted garden is on. Registered as 'sight:<art>' painters
 * in GardenPaintedProps.paintTable; each keeps its landmark's footprint, foot
 * and collision, so nothing about the layout or saved gardens changes.
 *  - The watermill: brick, slate roof, a lucam for the sack hoist, the
 *    undershot wheel against its west gable in a stone wheel pit open to the
 *    river. The wheel is still (a gap in its paddles)
 *    until the cog is fitted; then it turns and the windows light at night.
 *  - The barn, the eel smokehouse, the bird hide, the milk stand and the frog
 *    stone, each drawn to the region plan (C:/tmp/regions/valley.md, sec. 11). */
(function () {
  'use strict';
  const GP = window.GardenPaintedProps; if (!GP || !GP.paintTable || !GP.kit) return;
  const K = GP.kit, { rng, hash, leafOf } = K, { WOOD, OAK, STONE, SLATE, IRON, MOSS } = K.PALETTE;
  const D = () => sceneDraw;
  const BRICK = ['#a65a3e', '#8e4a33', '#c07656', '#6e3a28'];
  const turning = () => { try { return typeof gardenGateHas === 'function' && gardenGateHas('mill'); } catch (e) { return false; } };
  // brick courses across a rectangle, lit from the upper left
  function bricks(B, r, x, y, w, h, pal) {
    B.f(B.rect(x, y, w, h), pal[0]);
    for (let row = 0, yy = y + h - 4; yy > y; yy -= 4, row++) {
      B.s(`M${x} ${yy}h${w}`, pal[3], .45, .5);
      for (let xx = x + (row & 1) * 4; xx < x + w; xx += 8) { B.s(`M${xx} ${yy}v-4`, pal[3], .4, .4); if (r() < .14) B.f(B.rect(xx + .5, yy - 3.6, 7, 3.2), r() < .5 ? pal[2] : pal[1], .55); }
    }
    B.f(B.rect(x, y, w * .12, h), pal[2], .22).f(B.rect(x + w * .86, y, w * .14, h), pal[3], .22);
  }
  function slateRoof(B, x0, x1, eave, ridge, inset) {
    B.f(B.poly([[x0 - 6, eave], [x0 + inset, ridge], [x1 - inset, ridge], [x1 + 6, eave]]), SLATE[0]);
    for (let y = eave - 4; y > ridge + 1; y -= 4) { const k = (eave - y) / (eave - ridge), a = x0 - 6 + (inset + 6) * k, b = x1 + 6 - (inset + 6) * k; B.s(`M${a} ${y}H${b}`, SLATE[1], .7, .55); }
    B.f(B.poly([[x0 - 6, eave], [x0 + inset, ridge], [x0 + inset + 10, ridge], [x0 + 4, eave]]), SLATE[2], .35);
    B.s(`M${x0 + inset} ${ridge}H${x1 - inset}`, '#3a4448', 2.2).s(`M${x0 - 6} ${eave}H${x1 + 6}`, '#3a4448', 1.4, .8);
  }
  function window4(B, x, y, w, h, lit) {
    B.f(B.rect(x - 1.5, y - 2.5, w + 3, 2.5), STONE[0]).f(B.rect(x - 1, y + h, w + 2, 2), STONE[1]);
    B.f(B.rect(x, y, w, h), lit ? '#ffd27a' : '#3e4e52').s(`M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}`, lit ? '#b07a3a' : '#d8d0b8', .9, .9);
    if (!lit) B.f(B.rect(x + 1, y + 1, w * .35, h * .4), '#8aa4a8', .45);
  }
  /** The undershot wheel, centred on its hub; gap = the missing paddles of the still wheel. */
  function wheel(B, R, gap) {
    const n = 16;
    B.s(`M${-R} 0a${R} ${R} 0 1 0 ${R * 2} 0a${R} ${R} 0 1 0 ${-R * 2} 0`, OAK[1], 4.2).s(`M${-R + 6} 0a${R - 6} ${R - 6} 0 1 0 ${(R - 6) * 2} 0a${R - 6} ${R - 6} 0 1 0 ${-(R - 6) * 2} 0`, OAK[0], 2.4);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; B.s(`M0 0L${(Math.cos(a) * (R - 3)).toFixed(1)} ${(Math.sin(a) * (R - 3)).toFixed(1)}`, OAK[1], 2.6).s(`M0 0L${(Math.cos(a) * (R - 3)).toFixed(1)} ${(Math.sin(a) * (R - 3)).toFixed(1)}`, OAK[2], .8, .6); }
    for (let i = 0; i < n; i++) {
      if (gap && (i === 5 || i === 6)) continue;
      const a = i * Math.PI * 2 / n, c = Math.cos(a), s = Math.sin(a), x0 = c * (R - 1), y0 = s * (R - 1), x1 = c * (R + 6), y1 = s * (R + 6), tx = -s * 3.2, ty = c * 3.2;
      B.f(B.poly([[x0 - tx, y0 - ty], [x1 - tx, y1 - ty], [x1 + tx, y1 + ty], [x0 + tx, y0 + ty]]), i % 2 ? WOOD[0] : WOOD[2]).s(`M${x0 - tx} ${y0 - ty}L${x1 - tx} ${y1 - ty}`, OAK[3], .6, .6);
    }
    B.f(B.circ(0, 0, 6), IRON[1]).f(B.circ(0, 0, 3), '#7a7468').f(B.circ(-1, -1, 1.2), '#c8c0aa');
  }
  const P = GP.paintTable;
  Object.assign(P, {
    /* ---------- the watermill ---------- */
    // (round 3 layout: on its 5 x 3 footprint the mill stands at the size standard, its ridge about five and a half times the player)
    'sight:mill': { box: [-124, -150, 92, 18], scale: prop => (prop.w >= 5 ? 1.6 : 1), lift: prop => (prop.w >= 5 ? 16 : 0),
      sig: () => turning() ? '|turn' : '|still',
      draw(B, o) {
        const r = rng(hash('valley-mill')), lit = o.night && o.more === '|turn';
        B.shadow(6, 4, 92, 12, .26);
        // the wheel pit against the gable: dark water between stone walls, open to the river on the west
        B.f(B.poly([[-118, -10], [-56, -12], [-56, 10], [-112, 10]]), '#3f5f64').f(B.poly([[-118, -10], [-56, -12], [-56, -8], [-117, -6]]), '#2c4448', .8);
        for (let x = -114; x < -58; x += 7) B.f(B.rr(x, -15, 6.4, 3.8, 1), r() < .5 ? STONE[0] : STONE[1]).f(B.rr(x + 1, 8, 6.4, 3.4, 1), r() < .5 ? STONE[1] : STONE[3]);
        // the body: two storeys of brick, stone quoins, a slate roof with a lucam
        bricks(B, r, -56, -78, 128, 78, BRICK);
        for (let y = -78; y < 0; y += 9) for (const x of [-56, 66]) B.f(B.rect(x, y, 6, 4.4), (y / 9) & 1 ? STONE[0] : STONE[2]).f(B.rect(x, y + 4.4, 6, .6), STONE[3], .6);
        B.f(B.rect(-56, -40, 128, 3), STONE[1]).f(B.rect(-56, -40, 128, 1), STONE[2]);
        slateRoof(B, -56, 72, -78, -112, 16);
        // the lucam: a weatherboarded hoist housing jutting from the roof over the doors
        B.f(B.rect(6, -112, 26, 30), WOOD[1]).f(B.poly([[2, -112], [19, -126], [36, -112]]), SLATE[1]).f(B.poly([[2, -112], [19, -126], [21, -124], [6, -112]]), SLATE[2], .5);
        for (let y = -108; y < -82; y += 4) B.s(`M6 ${y}h26`, OAK[1], .6, .7);
        B.f(B.rect(13, -102, 12, 16), '#2e2418').s('M19 -86v10', IRON[0], 1).f(B.rect(17, -76, 4, 3), WOOD[2]);
        // doors and windows: big loading doors, a small door, windows on both floors
        B.f(B.rect(6, -36, 28, 36), OAK[1]).f(B.rect(8, -34, 11, 34), OAK[0]).f(B.rect(21, -34, 11, 34), OAK[0]).s('M8 -34L19 -2M21 -34L32 -2', OAK[2], 1, .6);
        B.f(B.rect(4, -39, 32, 3), STONE[0]);
        for (const x of [-42, -20, 48]) window4(B, x, -30, 12, 16, lit);
        for (const x of [-42, -20, 4, 26, 48]) window4(B, x, -68, 12, 14, lit);
        // the wheel's axle box on the gable, and the wet stain down the wall below it
        B.f(B.rect(-58, -40, 5, 14), STONE[2]).f(B.rect(-56, -34, 4, 34), '#5a4a3a', .35);
        // sacks and a barrow of meal by the doors, nettles at the foot of the wall
        for (const [x, y] of [[42, -2], [50, -3], [46, -10]]) B.f(B.rr(x - 5, y - 9, 10, 11, 4), '#d9caa0').f(B.rr(x - 5, y - 9, 4, 11, 3), '#efe4c6', .7).s(`M${x - 2} ${y - 8}q2 -2 4 0`, '#a8986e', .8);
        B.f(B.ell(-30, 1, 10, 2), MOSS[0], .5).f(B.ell(66, 0, 9, 2), MOSS[2], .5);
        for (let i = 0; i < 7; i++) { const x = -54 + r() * 30; B.s(`M${x} 0q${(r() - .5) * 3} -6 ${(r() - .5) * 4} -${8 + r() * 6}`, leafOf(o.season)[1], 1.2, .85); }
        if (lit) { B.f(B.ell(20, 4, 40, 6), 'rgba(255,210,120,.25)'); }
      },
      // the wheel is its own image so it can turn once the cog is in
      extra(scene, h, fx, foot, o) {
        const turn = o.more === '|turn', key = K.bake(scene, 'sight-mill-wheel|' + (turn ? 't' : 's'), [-44, -44, 44, 44], B => wheel(B, 32, !turn)), s = o.scale || 1;
        const cx = fx - 79 * s, cy = foot - 30 * s, im = h.add(K.image(scene, key, cx, cy)); if (im && s !== 1) im.setScale(im.scaleX * s);
        // the water in the pit laps over the wheel's foot
        const lap = K.bake(scene, 'sight-mill-lap', [-34, -6, 34, 10], B => { B.f(B.rr(-30, -2, 60, 9, 3), '#46686c', .92).f(B.rect(-30, -2, 60, 2), '#a8cace', .75); for (let x = -28; x < 28; x += 7) B.f(B.rr(x, 6, 6.4, 3.4, 1), x % 2 ? STONE[1] : STONE[3]); });
        const water = h.add(K.image(scene, lap, cx, foot - 1)); if (water && s !== 1) water.setScale(water.scaleX * s);
        if (turn && im) h.move(im, (node, t, motion) => { if (motion) node.setRotation(-t * .55); });
        if (turn && water) h.move(water, (node, t, motion) => { if (motion) node.setAlpha(.85 + Math.sin(t * 4) * .1); });
      },
    },
    /* ---------- the barn: red weatherboarding, a slate-grey roof, big doors, a hay ladder ---------- */
    'sight:barn': { box: [-96, -128, 96, 14], scale: prop => (prop.w >= 6 ? 1.45 : 1), draw(B, o) {
      const r = rng(hash('valley-barn')), red = ['#9a3a2e', '#7e2e24', '#b85a48', '#5e2018'];
      B.shadow(4, 3, 90, 10, .26);
      B.f(B.rect(-74, -62, 148, 62), red[0]);
      for (let x = -74; x < 74; x += 6) B.s(`M${x} -62v62`, red[3], .7, .45).f(B.rect(x + .6, -62, 1.4, 62), red[2], .18);
      B.f(B.rect(-74, -4, 148, 4), STONE[1]).f(B.rect(-74, -62, 148, 3), red[3], .4);
      // the roof: a broad gable of old corrugated slate grey with moss, and the gable end's hayloft door
      B.f(B.poly([[-84, -60], [-50, -104], [50, -104], [84, -60]]), '#5d6366');
      for (let y = -64; y > -103; y -= 4.5) { const k = (-60 - y) / 44, a = -84 + 34 * k, b = 84 - 34 * k; B.s(`M${a} ${y}H${b}`, '#4a5054', .8, .6); }
      B.f(B.poly([[-84, -60], [-50, -104], [-40, -104], [-72, -60]]), '#7d8588', .4).s('M-50 -104H50', '#3c4244', 2.4);
      for (let i = 0; i < 6; i++) B.f(D().blob(r, -60 + r() * 120, -66 - r() * 34, 6 + r() * 6, 2, 7, .5), MOSS[r() < .5 ? 0 : 2], .7);
      // the big doors, one ajar on the dark, hay spilling; a hay ladder up to the loft hatch
      B.f(B.rect(-24, -50, 48, 50), red[3]).f(B.rect(-24, -50, 24, 50), red[1]).s('M-24 -50L0 0M0 -50L-24 0', '#e8dcc0', 1.6, .9).s('M-24 -50h24v50h-24z', '#e8dcc0', 1.4, .9);
      B.f(B.rect(0, -50, 24, 50), '#2a1c14').f(B.poly([[2, 0], [10, -14], [22, -10], [24, 0]]), '#d8b860').f(B.poly([[4, 0], [10, -10], [16, -8], [18, 0]]), '#ecd27a', .8);
      B.f(B.rect(-56, -50, 18, 14), '#2a1c14').s('M-56 -50h18v14h-18z', '#e8dcc0', 1.2);
      B.post(-62, -50, 0, 2, OAK).post(-50, -50, 0, 2, OAK); for (let y = -44; y < 0; y += 8) B.s(`M-62 ${y}h12`, OAK[1], 1.6);
      // swallows' nests under the eave, an old tractor seat by the door, nettles and elder
      for (const x of [-30, 40]) B.f(B.ell(x, -59, 3.2, 2.2), '#8a7454');
      B.s('M36 -2v-8', IRON[1], 1.4).f(B.rr(31, -14, 10, 4, 2), '#b84a2a');
      for (let i = 0; i < 9; i++) { const x = (i < 5 ? -72 : 52) + r() * 20; B.s(`M${x} 0q${(r() - .5) * 3} -7 ${(r() - .5) * 4} -${9 + r() * 7}`, leafOf(o.season)[1], 1.3, .85); }
      if (o.night) B.f(B.rect(0, -50, 24, 50), 'rgba(255,200,110,.18)');
    } },
    /* ---------- the eel smokehouse: black-tarred boards, a thatched cap, a brick chimney, grig traps ---------- */
    'sight:smoke': { box: [-82, -108, 82, 12], draw(B, o) {
      const r = rng(hash('valley-smoke'));
      B.shadow(3, 3, 74, 8, .28);
      B.f(B.rect(-56, -46, 112, 46), '#2c2824');
      for (let y = -42; y < 0; y += 5) B.s(`M-56 ${y}h112`, '#141210', .8, .8).s(`M-56 ${y + 1}h112`, '#4a443c', .5, .5);
      // the thatched cap: honey thatch, a ridge pattern, the chimney through it
      B.f(B.poly([[-66, -44], [-34, -84], [34, -84], [66, -44]]), '#c8a25a').f(B.poly([[-66, -44], [-34, -84], [-24, -84], [-54, -44]]), '#e0bc74', .6);
      for (let i = 0; i < 26; i++) { const x = -60 + i * 4.8; B.s(`M${x} -45l${(x < 0 ? 2.4 : -2.4)} -6`, '#9a7a3e', .7, .55); }
      B.f(B.poly([[-38, -82], [38, -82], [34, -88], [-34, -88]]), '#a8843e');
      for (let x = -32; x < 32; x += 8) B.f(B.poly([[x, -82], [x + 4, -77], [x + 8, -82]]), '#a8843e');
      B.f(B.rect(18, -102, 12, 24), BRICK[1]); for (let y = -98; y < -80; y += 4) B.s(`M18 ${y}h12`, BRICK[3], .5, .6); B.f(B.rect(16, -104, 16, 3), STONE[1]);
      // the door, a vent slot, eel traps (grigs) leaning on the wall, a chopping block
      B.f(B.rect(-12, -34, 20, 34), '#1a1612').s('M-12 -34h20v34', '#3c362e', 1.2).f(B.rect(-46, -36, 22, 4), '#141210');
      for (const x of [26, 38, 50]) B.f(B.ell(x, -12, 4.5, 12), '#a88c5a').s(`M${x - 4} -18h8M${x - 4} -10h8M${x - 4} -2h8`, '#7a6238', .8);
      B.f(B.rr(-40, -10, 14, 10, 2), WOOD[1]).f(B.ell(-33, -10, 7, 2), WOOD[2]);
      for (let i = 0; i < 6; i++) { const x = -64 + r() * 128; if (Math.abs(x) < 54) continue; B.s(`M${x} 0q${(r() - .5) * 3} -9 ${(r() - .5) * 4} -${12 + r() * 9}`, '#b8a060', 1.1, .9); }
      if (o.night) B.f(B.rect(-46, -36, 22, 4), '#e8a050', .7);
    } },
    /* ---------- the bird hide: a weathered timber box on short legs, the long viewing slot, a list of birds ---------- */
    'sight:hide': { box: [-62, -62, 62, 10], draw(B, o) {
      const r = rng(hash('valley-hide'));
      B.shadow(2, 2, 52, 6, .26);
      for (const x of [-38, 38]) B.post(x, -14, 0, 4, OAK);
      B.f(B.rect(-44, -44, 88, 32), '#7a6446');
      for (let y = -40; y < -12; y += 5) B.s(`M-44 ${y}h88`, '#5a4834', .8, .7).s(`M-44 ${y + 1}h88`, '#9a8462', .5, .45);
      B.f(B.poly([[-50, -42], [-44, -54], [44, -54], [50, -42]]), '#4c5a3a').f(B.poly([[-50, -42], [-44, -54], [-36, -54], [-42, -42]]), '#6a7a50', .6);
      B.f(B.rect(-32, -34, 64, 7), '#16130e').f(B.rect(-32, -27, 64, 2), '#a08a64');
      B.f(B.rr(30, -24, 9, 11, 1), '#efe6cc').s('M32 -21h5M32 -18h5M32 -15h4', '#8a7a5a', .5);
      for (let i = 0; i < 14; i++) { const x = -60 + r() * 120, tall = 14 + r() * 18; B.s(`M${x} 2q${(r() - .5) * 4} ${-tall / 2} ${(r() - .5) * 6} ${-tall}`, o.season === 'winter' ? '#b8a888' : '#b49a5a', 1.2, .9); if (r() < .4) B.f(B.ell(x + (r() - .5) * 3, 2 - tall, 1.4, 4), '#6a4a2a'); }
    } },
    /* ---------- the milk stand: a stone stand at cart height, two churns on it ---------- */
    'sight:churn': { box: [-30, -50, 30, 8], draw(B, o) {
      const r = rng(hash('valley-churn'));
      B.shadow(1, 2, 24, 5, .26);
      B.f(B.rect(-24, -16, 48, 16), STONE[1]).f(B.rect(-26, -19, 52, 4), STONE[0]).f(B.rect(-26, -19, 52, 1.4), STONE[2]);
      for (let x = -22; x < 22; x += 9) B.s(`M${x} -15v15`, STONE[3], .6, .55);
      for (const x of [-11, 10]) {
        B.f(`M${x - 8} -19L${x - 9} -36L${x - 4} -42V-46H${x + 4}V-42L${x + 9} -36L${x + 8} -19z`, B.lin(x - 9, 0, x + 9, 0, [[0, '#c4ccd0'], [.4, '#e6ecee'], [1, '#8a9498']]));
        B.f(B.rect(x - 5, -48, 10, 3), '#7a8488').s(`M${x - 8.6} -28h17.2`, '#8a9498', 1);
      }
      B.f(D().blob(r, -24, -1, 7, 3, 7, .5), MOSS[0], .7);
    } },
    /* ---------- the frog stone: a big mossy boulder with a carved, helped-along face, in a wet hollow ---------- */
    'sight:frogstone': { box: [-34, -40, 34, 10], draw(B, o) {
      const r = rng(hash('valley-frog')), rock = ['#9a9886', '#76745f', '#bcb8a2', '#5a584a'];
      B.f(B.ell(0, 2, 30, 7), '#5c7a5e', .45).f(B.ell(-4, 1, 18, 3.4), '#7aa0a0', .55);
      B.stone(r, 0, -12, 24, 15, rock, MOSS);
      for (const x of [-9, 9]) B.f(B.circ(x, -24, 5), rock[0]).f(B.circ(x, -24, 3), '#2c2a22').f(B.circ(x - 1, -25, 1), '#e8e4d4');
      B.s('M-12 -12q12 7 24 0', '#3a382e', 1.6).s('M-11 -11q11 6 22 0', rock[2], .6, .6);
      for (let i = 0; i < 8; i++) { const x = -28 + r() * 56; B.s(`M${x} 3q${(r() - .5) * 3} -7 ${(r() - .5) * 4} -${8 + r() * 6}`, '#4e7040', 1.2, .9); }
    } },
  });
})();

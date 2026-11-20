/* Painted vale: the Whispering woodland's own pieces from its hand-authored layout (round 3, assets/garden/vale-woodland.json).
 *  - Wren's log (presentation.crossings kind 'log'): an old birch fallen across the brook, adzed flat along its top so it
 *    can be walked, its bark peeling, moss on its shaded side, the cut root plate on the far bank and its broken crown end
 *    in the ferns on the near one. Drawn over the deck the walk stands on (gardenIslandCrossingGeometry), so the feet
 *    are on the log and nowhere beside it. 94-garden-paint-vale-1places.js calls it from its crossings.
 * Ground paint only: cells, walking and saved rows are untouched. */
(function () {
  'use strict';
  const V = window.GardenPaintVale; if (!V) return;
  V.fallenLog = function (B, r, P, A, Bp, season, deck) {
    if (!deck) return;
    const hw = deck.halfWidth, R = hw * .95, q = (t, s, up) => { const p = deck.deckPoint(t, s); return { x: p.x, y: p.y - (up || 0) }; };
    const winter = season === 'winter', autumn = season === 'autumn';
    const bark = winter ? ['#d8d6cc', '#c4c2b6'] : ['#e4dfcf', '#cfc8b2'], dark = '#3a3630', moss = winter ? '#dfe4e2' : autumn ? '#8a8a46' : '#6f8a42';
    // its shadow on the water and the wet line where it lies in the banks
    B.cx.filter = 'blur(3px)'; B.f(B.poly([q(.04, -R + 4), q(.96, -R + 4), q(.96, R + 9), q(.04, R + 9)]), '#1c2a2e', .38); B.cx.filter = 'none';
    // the round body: an underside in shade, the flat walked top, the lit near flank
    B.f(B.poly([q(0, -R, 2), q(1, -R, 2), q(1, R, 0), q(0, R, 0)]), '#8c8676');
    B.f(B.poly([q(0, -R * .8, 7), q(1, -R * .8, 7), q(1, R * .55, 6), q(0, R * .55, 6)]), bark[1]);
    B.f(B.poly([q(0, -R * .6, 9), q(1, -R * .6, 9), q(1, R * .3, 8.5), q(0, R * .3, 8.5)]), bark[0]);
    // the adzed walking face: a paler strip with the tool's marks across it
    B.f(B.poly([q(.06, -R * .42, 9.4), q(.94, -R * .42, 9.4), q(.94, R * .18, 9.2), q(.06, R * .18, 9.2)]), '#efe6cc', .85);
    for (let t = .08; t < .93; t += .035 + r() * .03) { const a = q(t, -R * .4, 9.6), b = q(t + .01, R * .16, 9.4); B.s(`M${a.x} ${a.y}L${b.x} ${b.y}`, '#c9b98e', 1, .55); }
    // birch marks: short dark dashes across the bark, peeling curls
    for (let k = 0; k < 26; k++) { const t = .03 + r() * .94, s = (r() - .5) * R * 1.6, a = q(t, s, 5 + r() * 3), w = 3 + r() * 6; B.s(`M${a.x - w / 2} ${a.y}l${w} ${(r() - .5) * 1.5}`, dark, 1.4 + r(), .7); }
    for (let k = 0; k < 5; k++) { const p = q(.1 + r() * .8, R * (.2 + r() * .4), 6); B.s(`M${p.x} ${p.y}q3 -4 6 -1`, '#f6f1e4', 1.6, .9); }
    // moss along the shaded side, thicker toward the old root end
    for (let k = 0; k < 22; k++) { const t = Math.pow(r(), 1.6), p = q(t, -R * (.55 + r() * .35), 6 + r() * 2); B.f(B.blob(r, p.x, p.y, 3 + r() * 5, 1.4 + r() * 1.6, 6, .5), moss, .75); }
    // the root plate on the far bank: a torn disc of roots and earth standing up
    const e = q(0, 0, 8); B.f(B.ell(e.x, e.y - 6, R * 1.3, R * 1.5), '#5e4a34').f(B.ell(e.x + 2, e.y - 5, R * 1.05, R * 1.25), '#7a6248');
    for (let k = 0; k < 9; k++) { const a = Math.PI * 2 * k / 9 + r() * .3, l = R * (1.2 + r() * .6); B.s(`M${e.x} ${e.y - 6}l${Math.cos(a) * l} ${Math.sin(a) * l * 1.1}`, '#4a3a28', 2 + r() * 1.5, .9); }
    if (!winter) for (let k = 0; k < 4; k++) B.f(B.blob(r, e.x + (r() - .5) * R, e.y - 6 - R * (.6 + r() * .6), 4, 2, 6, .5), moss, .8);
    // the broken crown end in the ferns on the near bank: a split, pale core and two stub branches
    const f = q(1, 0, 8); B.f(B.ell(f.x, f.y, R * .55, R * .9), '#d8caa4').f(B.ell(f.x, f.y, R * .3, R * .55), '#bfae84');
    for (const s of [-1, 1]) { const a = q(.9, s * R * .4, 9); B.s(`M${a.x} ${a.y}l${6 + r() * 6} ${-8 - r() * 8}`, bark[1], 3, .95).s(`M${a.x} ${a.y}l${6 + r() * 6} ${-8 - r() * 8}`, dark, 1, .5); }
    // a ripple where the water meets it on both sides
    for (const s of [-1, 1]) { const pts = []; for (let t = .12; t <= .88; t += .04) pts.push(q(t, s * (R + 2.5), 0)); V.strokePts(B, pts, P.foam || '#eef2e2', 1.4, .45); }
  };
})();

/* The Whispering woodland's seats and Wren cove's driftwood arch (round 3 fixes), in the painted props' own brush
 * (94-garden-native-painted-props.js), registered in its paint table as 'sight:prop-<id>' and 'sight:drift':
 *  - the fork benches and the bench by the oak: a split-log plank on two sawn rounds, worn earth at their feet, leaf
 *    litter and moss, a leaf that now and then comes down on the plank (they were the village's park bench set on the
 *    grass; its legs stood apart round an empty block, so the feet stopped on nothing and the click missed the art)
 *  - Wren's seat: a seat cut into a short length of fallen birch, a wren carved on its arm, a live wren that hops along it
 *  - the driftwood arch: two bleached limbs leant together over a windbreak of stacked driftwood, wrack and shells at its
 *    foot, a faded rag tied at the top that stirs in the wind (it was drawn as bare outlines with no fill)
 * Size by rule 14 (H, the player after the 0.8 change, is about 44 px): a seat at 0.3 H, the arch about 1.6 H.
 * Each keeps its prop's footprint, foot and collision; only the drawing changes. */
(function () {
  'use strict';
  const GP = window.GardenPaintedProps; if (!GP || !GP.paintTable || !GP.kit) return;
  const K = GP.kit, { rng, hash } = K, { MOSS } = K.PALETTE, D = () => sceneDraw, P = GP.paintTable;
  const BARK = ['#8a6a48', '#6a5034', '#b08c62', '#3e3022'], GRAIN = ['#d8c09a', '#c4a878', '#a88a5e'];
  const litterOf = s => s === 'autumn' ? ['#b0682a', '#d38f3a', '#8a5a2c'] : s === 'winter' ? ['#8a7a62', '#a49478'] : ['#9a8a4e', '#7d7a4a', '#b39a5a'];
  const fernOf = s => s === 'autumn' ? '#a8823a' : s === 'winter' ? '#9a9884' : '#5e8a44';
  // worn ground where people stop: soft, under the alpha the click and the audit read as standing paint
  function wear(B, r, rx, ry, season) {
    B.f(B.ell(0, 1, rx, ry), season === 'winter' ? '#d6d2c4' : '#7a6646', .3).f(B.ell(-rx * .15, 0, rx * .7, ry * .7), season === 'winter' ? '#e6e2d6' : '#8e7650', .26);
    const L = litterOf(season); for (let i = 0; i < 16; i++) B.f(B.ell(-rx + r() * rx * 2, -ry * .6 + r() * ry * 1.4, 2.2, 1.1), L[i % L.length], .34);
  }
  function round(B, r, x, w, h, season) {
    // a sawn round: bark sides, a pale end grain top, moss on the shaded side, roots and tufts at its foot
    B.f(B.rr(x - w / 2, -h, w, h, 2.5), BARK[0]).f(B.rect(x - w / 2, -h + 2, w * .3, h - 2), BARK[2], .5).f(B.rect(x + w / 2 - w * .32, -h + 2, w * .32, h - 2), BARK[1], .75);
    B.f(B.ell(x, -h, w / 2, 2.6), GRAIN[1]).f(B.ell(x - .5, -h - .3, w / 2 - 2, 1.8), GRAIN[0]).s(`M${x - w / 4} ${-h}a${w / 4} 1.2 0 1 0 ${w / 2} 0`, GRAIN[2], .6, .6);
    if (season !== 'winter') B.f(D().blob(r, x + w * .28, -h * .45, w * .22, h * .4, 6, .5), MOSS[0], .85);
    B.f(B.ell(x, -.5, w / 2 + 2.5, 2), BARK[1]);
    for (let k = 0; k < 4; k++) { const tx = x - w / 2 - 2 + r() * (w + 4); B.s(`M${tx} 0q${(r() - .5) * 3} -3 ${(r() - .5) * 4} ${-4 - r() * 3}`, season === 'autumn' ? '#9a9a4a' : season === 'winter' ? '#b8b4a0' : '#6f8a42', 1.1, .9); }
  }
  const fern = (B, x, a0, s) => { for (let k = 0; k < 5; k++) { const a = a0 + k * .22; B.s(`M${x} 0q${Math.cos(a) * 6} ${Math.sin(a) * 9} ${Math.cos(a) * 11} ${Math.sin(a) * 14}`, fernOf(s), 1.6, .9); } };
  const bench = { box: [-48, -30, 48, 10], draw(B, o) {
    const r = rng(hash('woodbench' + (o.prop && o.prop.id || ''))), s = o.season;
    wear(B, r, 42, 7, s); B.shadow(1, 1, 36, 5, .3);
    round(B, r, -17, 17, 11, s); round(B, r, 17, 17, 10, s);
    // the plank: a split log, flat face up, bark along its underside, end grain at both ends
    B.f(B.rr(-35, -17, 70, 6.5, 2.4), BARK[1]).f(B.rect(-34, -17, 68, 3.2), GRAIN[1]).f(B.rect(-34, -17, 68, 1.2), GRAIN[0], .9);
    for (let x = -30; x < 32; x += 7 + r() * 5) B.s(`M${x} -15.6h${3 + r() * 4}`, GRAIN[2], .6, .55);
    for (const e of [-35, 35]) B.f(B.ell(e, -14, 1.6, 3.2), GRAIN[2]);
    B.s('M-33 -10.6h66', BARK[3], 1, .45);
    if (s === 'autumn') for (let k = 0; k < 3; k++) B.f(B.ell(-24 + r() * 48, -17.4, 2.4, 1.1), litterOf(s)[k % 3], .95);
    if (s === 'winter') B.f(B.rr(-34, -18.6, 68, 2.2, 1), '#f2f4f2', .85);
    // a fern at one end and bilberry at the other: the wood growing round it
    fern(B, -40, -2.2, s);
    for (let k = 0; k < 6; k++) B.f(D().blob(r, 36 + r() * 8, -3 - r() * 5, 3, 2.4, 6, .5), s === 'winter' ? '#8a8a7a' : '#4f6e3a', .9);
  }, extra(scene, h, fx, foot, o) {
    // now and then a leaf comes down and settles on the plank
    const key = K.bake(scene, 'wood-leaf|' + o.season, [-3, -2, 3, 2], B => B.f(B.ell(0, 0, 2.6, 1.3), litterOf(o.season)[0]).s('M-2.4 0h4.8', '#5a3a1c', .4, .6));
    const im = h.add(K.image(scene, key, fx, foot - 40)); if (!im) return;
    const ph = (hash(o.prop && o.prop.id || 'b') % 100) / 100 * 9;
    h.move(im, (node, t, motion) => { const c = ((motion ? t : 0) + ph) % 9, f = Math.min(1, c / 3); node.setPosition(fx - 14 + Math.sin(c * 2.4) * 8 * (1 - f) + f * 10, foot - 52 + f * 34); node.setRotation(Math.sin(c * 3) * .8 * (1 - f)); node.setAlpha(c < 3 ? Math.min(1, c * 2) : c < 7 ? 1 : Math.max(0, (9 - c) / 2)); });
  } };
  const wrenSeat = { box: [-54, -40, 54, 10], draw(B, o) {
    const r = rng(hash('wrenseat')), s = o.season, bw = ['#ece6d6', '#d4ccb8', '#b8ae96'];
    wear(B, r, 46, 7, s); B.shadow(2, 1, 42, 5, .32);
    // a length of fallen birch along the bank: white bark with black marks, a seat cut down into its middle
    B.f(B.rr(-42, -19, 84, 19, 9), bw[1]).f(B.rr(-42, -19, 84, 8, 6), bw[0]).f(B.rect(-40, -4, 80, 4), bw[2], .8);
    for (let k = 0; k < 22; k++) { const x = -38 + r() * 76, y = -16 + r() * 14, w = 3 + r() * 6; B.s(`M${x} ${y}l${w} ${(r() - .5) * 1.2}`, '#2e2a26', 1.1 + r(), .75); }
    B.f('M-14 -19V-11Q-14 -9 -12 -9H14Q16 -9 16 -11V-19Z', '#c8ab7a').f('M-13 -17V-11H15V-17Z', '#e0c494', .9).s('M-14 -11H16', '#8a6a44', .8, .5);
    // the arm: the trunk's upper end left standing, sawn flat, with the wren carved on it, tail cocked
    B.f(B.rr(-42, -28, 26, 11, 4), bw[1]).f(B.rr(-42, -28, 26, 5, 3), bw[0]).f(B.ell(-29, -28, 12, 2.6), '#e2c898');
    B.f(B.ell(-30, -31.6, 4.2, 2.8), '#9a7448').f(B.circ(-26.4, -33, 1.9), '#9a7448').s('M-34 -32.4l-2.6 -3.6', '#9a7448', 1.6).f(B.circ(-26, -33.4, .5), '#3a2a1a');
    // the root end in the ferns, the broken top at the other end
    B.f(B.ell(-43, -9.5, 4, 9.5), '#5e4a34').f(B.ell(-43, -9.5, 2.4, 6), '#7a6248');
    B.f(B.ell(43, -9.5, 3.5, 9), '#d8caa4').f(B.ell(43, -9.5, 1.8, 5), '#bfae84');
    if (s !== 'winter') for (let k = 0; k < 7; k++) B.f(D().blob(r, -36 + r() * 72, -1.5 - r() * 3, 3 + r() * 3, 1.6, 6, .5), MOSS[r() < .5 ? 0 : 2], .85);
    else B.f(B.rr(-40, -21, 80, 3, 1.5), '#f4f6f4', .9);
    fern(B, -47, -2.4, s); fern(B, 47, -1.6, s);
  }, extra(scene, h, fx, foot) {
    // a live wren comes to the arm, bobs its tail, hops along the seat and goes
    const key = K.bake(scene, 'wren-bird', [-7, -8, 8, 3], B => { B.f(B.ell(0, -3, 4, 3), '#8a6238').f(B.circ(3.4, -4.6, 2), '#8a6238').s('M-3.4 -4l-2.4 -3', '#6a4a2a', 1.6).f(B.circ(4, -5, .5), '#1a1410').s('M5.2 -4.4l1.4 .3', '#c89a4a', .8).s('M-1 0v1.6M1 0v1.6', '#5a3a1c', .6); });
    const im = h.add(K.image(scene, key, fx - 24, foot - 30)); if (!im) return;
    h.move(im, (node, t, motion) => { const c = (motion ? t : 2) % 14, on = c < 9, hop = c > 3 && c < 6 ? Math.floor((c - 3) * 2) : c >= 6 ? 6 : 0;
      node.setAlpha(c < .4 ? c / .4 : c > 8.6 && c < 9 ? (9 - c) / .4 : on ? 1 : 0);
      node.setPosition(fx - 24 + hop * 5, foot - (hop ? 21 : 30) - (c > 3 && c < 6 ? Math.abs(Math.sin((c - 3) * Math.PI * 2)) * 3 : 0)); node.setRotation(on ? Math.sin(c * 9) * .08 : 0); });
  } };
  for (const id of ['ld-woodbench-1', 'ld-woodbench-2', 'ld-woodbench-3', 'ld-woodbench-4', 'ld-bench-a']) P['sight:prop-' + id] = bench;
  P['sight:prop-ld-wrenseat'] = wrenSeat;
  P['sight:drift'] = { box: [-62, -86, 62, 12], draw(B, o) {
    const r = rng(hash('drift-arch')), s = o.season, bleach = ['#d8d0bc', '#bfb59c', '#a69a80', '#ece6d6'];
    B.f(B.ell(0, 2, 58, 8), '#b8a274', .3); B.shadow(4, 1, 54, 7, .32);
    // two long bleached limbs leant together into an arch, their tops lashed with old rope
    const limb = (x0, x1, y1, w) => {
      B.f(`M${x0 - w} 0Q${(x0 + x1) / 2 - w} ${y1 * .55} ${x1 - w * .4} ${y1}L${x1 + w * .4} ${y1 + 2}Q${(x0 + x1) / 2 + w} ${y1 * .55 + 2} ${x0 + w} 0Z`, bleach[1]);
      B.f(`M${x0 - w} 0Q${(x0 + x1) / 2 - w} ${y1 * .55} ${x1 - w * .4} ${y1}L${x1} ${y1 + 1}Q${(x0 + x1) / 2 - w * .2} ${y1 * .55 + 1} ${x0 - w * .2} 0Z`, bleach[3], .8);
      B.s(`M${x0 + w * .5} -2Q${(x0 + x1) / 2 + w * .6} ${y1 * .55 + 1} ${x1 + w * .3} ${y1 + 1}`, bleach[2], 1.4, .8);
    };
    limb(-40, 6, -74, 5); limb(42, -6, -72, 4.5);
    B.s('M-4 -70l10 -3M-4 -66l10 -4M-3 -62l9 -3', '#8a7450', 1.6, .95).s('M2 -66q4 10 -2 18', '#8a7450', 1.2, .9);
    // a windbreak of stacked driftwood along its foot, across the whole width it stands on
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) { const y = -3 - row * 6, x = -50 + k * 25 + (row % 2) * 10 + (r() - .5) * 6, w = 22 + r() * 10; if (x + w > 54) continue; B.f(B.rr(x, y - 5.6, w, 5.6, 2.8), bleach[Math.floor(r() * 3)]).f(B.rr(x, y - 5.6, w, 2, 1), bleach[3], .7).f(B.ell(x + w, y - 2.8, 1.4, 2.6), bleach[2]); }
    // wrack, shells and marram at its feet
    for (let k = 0; k < 10; k++) B.s(`M${-56 + r() * 112} ${1 + r() * 4}q${4 + r() * 4} ${(r() - .5) * 3} ${9 + r() * 6} ${(r() - .5) * 2}`, '#5e5a2e', 1.4, .55);
    for (let k = 0; k < 6; k++) B.f(B.ell(-50 + r() * 100, 3 + r() * 3, 1.8, 1.2), r() < .5 ? '#f2ebe0' : '#e8c8b8', .95);
    const g = s === 'winter' ? '#b4ae96' : s === 'autumn' ? '#b8a462' : '#8ea660';
    for (const fx of [-56, -48, 50, 57]) for (let k = 0; k < 5; k++) B.s(`M${fx + k * 1.6} 1q${(r() - .5) * 4} -8 ${(r() - .5) * 8} ${-14 - r() * 8}`, g, 1.1, .9);
  }, extra(scene, h, fx, foot) {
    // a faded rag tied at the top stirs in the sea wind
    const key = K.bake(scene, 'drift-rag', [-1, -2, 14, 6], B => B.f('M0 0L12 1L10 3L13 5L0 3Z', '#c8503a', .85).f('M0 0L12 1L11 2L0 1.4Z', '#e88a6a', .6));
    const im = h.add(K.image(scene, key, fx + 1, foot - 70)); if (!im) return;
    h.move(im, (node, t, motion) => { node.setRotation(motion ? Math.sin(t * 2.3) * .22 + Math.sin(t * 5.1) * .06 : 0); node.setScale(1, motion ? 1 + Math.sin(t * 3.3) * .12 : 1); });
  } };
})();

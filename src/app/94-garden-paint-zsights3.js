/* Sights, round 3: the market stall, the boathouse, the shepherd's hut, the treehouse, the eel smokehouse, the bird
 * hide, the warren bank, the ring stone and the orchard wall, painted at the size standard (docs/dev/PAINT_KIT.md,
 * "Scale") in the brush of 94-garden-paint-terrain-5sights.js. They had kept a region painter's older, smaller drawing
 * (94-garden-paint-vale-1coast.js, -terrain-2marks.js, -terrain-3orchard.js); this file sorts after all of them, so
 * these rows win. Each keeps its footprint, door and what blocks walking, and stands in its own seat. Nothing runs at
 * load. */
(function () {
  'use strict';
  const M = window.GardenPaintedMarks; if (!M || !M.ART || !M.SIGHT_KIT || !M.SIGHT_KIT.shingleRoof) return;
  const KIT = () => window.GardenPaintTerrainKit;
  const { ashlar, mossOn, ivy, windowLit, leaf, grass, sz, STONE, MOSSY, OAK, IRON, rubble, ferns, shingleRoof, drum, SLATE } = M.SIGHT_KIT;
  const A = M.ART;
  const H = typeof GARDEN_H !== 'undefined' ? GARDEN_H : 41;

  /* ---------- the market stall: a timber stall under a striped canvas awning, its counter heaped with crates of the
     vale's own produce, jars on the back shelves, herbs hung from the rail, a chalked price board, pumpkins and sacks at
     its foot; a lantern on the corner post at night ---------- */
  A['market-stall'] = { box: [-62, -128, 64, 8], seat: { kind: 'flags', w: 98, front: 18 }, lit: true, lights: [[47, -66, 80]], draw(B, o) {
    const r = KIT().rng(701), s = o.season, L = leaf(s), counter = -H * .85, eaveF = -H * 1.95, eaveB = -H * 2.55;
    // the back posts and the shaded inside: boards in shadow, two shelves of jars, bunches of herbs from the rail
    for (const x of [-45, 45]) B.post(x, eaveB + 2, counter, 4.6, OAK);
    B.f(B.rect(-43, eaveB + 4, 86, counter - eaveB - 4), B.lin(0, eaveB, 0, counter, [[0, '#33261a'], [1, '#56402c']]));
    for (let x = -43; x < 43; x += 6.2) B.s(`M${x} ${eaveB + 4}V${counter}`, '#251a10', .6, .55);
    for (const [y, n] of [[eaveB + 30, 8], [eaveB + 46, 7]]) {
      B.f(B.rect(-42, y, 84, 2.8), OAK[0]).f(B.rect(-42, y, 84, 1), OAK[2], .7);
      for (let i = 0; i < n; i++) { const x = -36 + i * 72 / (n - 1), c = ['#b8343a', '#e0a838', '#8a3a6a', '#d86a2a', '#6a8a3a'][(i * 3 + n) % 5], h = 6 + r() * 3; B.f(B.rr(x - 3, y - h, 6, h, 1.2), c).f(B.rect(x - 3.3, y - h - 1.6, 6.6, 2), r() < .5 ? '#e8dcc0' : '#c84a3a').f(B.rect(x - 2.2, y - h + 1.4, 1.3, h - 3), '#ffffff', .28); }
    }
    for (let i = 0; i < 6; i++) { const x = -34 + i * 13.6 + (r() - .5) * 3; B.s(`M${x} ${eaveB + 5}v5`, '#a88a5a', .6); for (let k = 0; k < 4; k++) B.f(B.blob(r, x + (r() - .5) * 3, eaveB + 13 + k * 2.4, 2.2, 3, 6, .5), i % 3 === 1 ? '#c8a060' : L[k % 3], .95); }
    // the counter: an oak top over a front of upright boards, lit on the west, a chalked price board hung on it
    B.f(B.rect(-48, counter, 96, -counter - 3), OAK[0]);
    for (let x = -48; x < 48; x += 7.4) { B.s(`M${x} ${counter + 2}V-3`, OAK[3], .7, .6); if (r() < .5) B.f(B.rect(x + .8, counter + 3, 5.6, -counter - 7), r() < .5 ? OAK[2] : OAK[1], .3); }
    B.f(B.rect(-48, counter, 22, -counter - 3), '#ffffff', .08).f(B.rect(28, counter, 20, -counter - 3), '#1a1008', .18).f(B.rect(-48, -6, 96, 3), OAK[3], .45);
    B.f(B.rect(-51, counter - 3.4, 102, 4.4), '#c8a070').f(B.rect(-51, counter - 3.4, 102, 1.3), '#ecd0a4');
    B.f(B.rr(-13, counter + 7, 26, 16, 1.4), '#5a4430').f(B.rr(-11.4, counter + 8.6, 22.8, 12.8, 1), '#2e3634');
    B.s(`M-8 ${counter + 12}h7M-8 ${counter + 15.6}h10M-8 ${counter + 19}h6`, '#e8ece6', .8, .8).f(B.circ(6, counter + 12.4, 1.6), '#d84a3a', .9).f(B.circ(6.6, counter + 17.6, 1.6), '#9ab83a', .9);
    // the crates on the counter, tipped toward you: apples, pears, carrots with their tops, a basket of brown eggs
    const fruit = (x0, w, y, n, col, hi, R) => { for (let i = 0; i < n; i++) { const t = i / n, fx = x0 - w / 2 + 3 + r() * (w - 6), fy = y - 1 - r() * 6 * (1 - Math.abs(fx - x0) / w); B.f(B.circ(fx + .5, fy + .6, R), '#2a1a10', .35).f(B.circ(fx, fy, R), col[i % col.length]).f(B.circ(fx - R * .35, fy - R * .35, R * .38), hi, .7); } };
    const crate = (x, w, body) => { const y = counter - 3; B.f(B.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 1.4, y - 10], [x - w / 2 + 1.4, y - 10]]), '#b48c5c'); body(x, w, y - 9); B.f(B.rect(x - w / 2, y - 4.6, w, 4.6), '#c49c6a').s(`M${x - w / 2} ${y - 4.6}h${w}`, '#7a5a38', .6).s(`M${x - w / 2 + 2} ${y}v-4.6M${x + w / 2 - 2} ${y}v-4.6`, '#7a5a38', .7); };
    crate(-33, 24, (x, w, y) => fruit(x, w, y, 15, ['#c8322a', '#d8442a', '#a82a22', '#e0602e'], '#ffd0b0', 2.6));
    crate(-8, 22, (x, w, y) => fruit(x, w, y, 12, ['#b8c03a', '#a8b02e', '#d0c848'], '#f4f0b0', 2.5));
    crate(16, 22, (x, w, y) => { for (let i = 0; i < 11; i++) { const fx = x - 8 + r() * 16, fy = y - r() * 5; B.s(`M${fx} ${fy}l${3 + r() * 2} ${-1.4}`, '#e0782a', 2.4).s(`M${fx - 1} ${fy + .3}l-2 -3M${fx - 1} ${fy + .3}l-3 -1`, '#5e9a3a', .9); } });
    B.f(B.ell(38, counter - 5, 8, 4.4), '#a8844e').s(`M30 ${counter - 6}q8 3 16 0`, '#7a5a30', .8); for (let i = 0; i < 6; i++) B.f(B.ell(33 + r() * 10, counter - 8 - r() * 2.4, 2, 2.5), i % 2 ? '#c89a6a' : '#e4c49a').f(B.ell(32.6 + i * 1.6, counter - 9.4, .6, .8), '#ffffff', .4);
    // at its foot: pumpkins on the west, a sack of potatoes and a bucket of cut flowers on the east
    const pump = (x, y, R) => { B.f(B.ell(x, y - R * .8, R * 1.25, R * .9), '#c8641e'); for (const dx of [-.6, 0, .6]) B.f(B.ell(x + dx * R, y - R * .8, R * .45, R * .86), dx < 0 ? '#e88a32' : dx > 0 ? '#b0541a' : '#d8742a', .9); B.s(`M${x} ${y - R * 1.6}l1 -3`, '#5a6a2a', 1.4); };
    if (s === 'autumn' || s === 'summer') { pump(-52, 1, 5.4); pump(-44, 2, 4); pump(-56, -2, 3.4); }
    else { B.f(B.rr(-58, -9, 14, 10, 2), '#a8844e').s('M-58 -5h14', '#7a5a30', .7); for (let i = 0; i < 5; i++) B.f(B.circ(-55 + r() * 8, -10 - r() * 2, 2), ['#c8322a', '#e0a838'][i % 2]); }
    B.f('M42 1Q38 -12 44 -16Q52 -18 56 -12Q60 -2 56 1Z', '#b49a6a').s('M42 -12q7 -3 14 0', '#7a6440', .8).f(B.blob(r, 48, -16, 5, 2.4, 6, .4), '#8a6a3a');
    B.f('M-4 1L-5 -9H5L4 1Z', B.lin(-5, 0, 5, 0, [[0, '#a8b0b4'], [1, '#5e686c']])).f(B.ell(0, -9, 5, 1.5), '#4e585c');
    if (s !== 'winter') for (let i = 0; i < 8; i++) { const fx = -4 + r() * 8; B.s(`M${fx} -9l${(r() - .5) * 4} ${-6 - r() * 4}`, '#5e8a3e', .7); B.f(B.circ(fx + (r() - .5) * 4, -16 - r() * 4, 1.6), ['#f2c63a', '#f4f0e8', '#c86aa0', '#e86a4a'][i % 4]); }
    // the front corner posts, the awning on them: canvas in cream and green, sloping up to the back rail, a scalloped edge
    for (const x of [-52, 52]) B.post(x, eaveF - 2, 0, 5, OAK).f(B.rect(x - 3, -3, 6, 3), STONE.rockLo);
    const st = 12, xs = -58, xe = 58;
    for (let i = 0, x = xs; x < xe - .1; i++, x += (xe - xs) / st) {
      const w = (xe - xs) / st, k = x / 58, x2 = x + w, top = eaveB - 6, c = i % 2 ? ['#2f6e5a', '#3e8670', '#245446'] : ['#efe6d0', '#fbf6ea', '#d4c8ac'];
      B.f(B.poly([[x * .92, top], [x2 * .92, top], [x2, eaveF], [x, eaveF]]), B.lin(0, top, 0, eaveF, [[0, c[1]], [.7, c[0]], [1, c[2]]]));
      if (k > .3) B.f(B.poly([[x * .92, top], [x2 * .92, top], [x2, eaveF], [x, eaveF]]), '#1a1a10', (k - .3) * .22);
    }
    B.s(`M${xs * .92} ${eaveB - 6}H${xe * .92}`, OAK[1], 2.4).f(B.rect(xs * .92, eaveB - 8, (xe - xs) * .92, 2), '#ffffff', .25);
    for (let i = 0, x = xs; x < xe - .1; i++, x += (xe - xs) / st) { const w = (xe - xs) / st; B.f(`M${x} ${eaveF}Q${x + w / 2} ${eaveF + 9} ${x + w} ${eaveF}Z`, i % 2 ? '#2a5e4e' : '#e4d8bc'); B.s(`M${x} ${eaveF}Q${x + w / 2} ${eaveF + 9} ${x + w} ${eaveF}`, '#1a2a20', .5, .4); }
    B.f(B.rect(xs, eaveF - 1.4, xe - xs, 2.6), '#ffffff', .3);
    // a little painted board on the rail, the lantern on its bracket on the east post
    B.f(B.rr(-17, eaveB - 22, 34, 12, 2), '#5a4430').f(B.rr(-15.6, eaveB - 20.6, 31.2, 9.2, 1.4), '#f2e6c8').text('Market', 0, eaveB - 15.8, 7, '#3e5a3a');
    B.s(`M-12 ${eaveB - 10}v4M12 ${eaveB - 10}v4`, OAK[1], 1.6);
    B.s(`M52 ${eaveF + 8}h-7`, IRON[0], 1.4).s(`M45 ${eaveF + 8}v4`, IRON[0], .8);
    const glow = o.night ? B.rad(45, eaveF + 18, 7, [[0, '#fffbe6'], [.5, '#ffe08a'], [1, '#e8a44a']]) : B.lin(41, 0, 49, 0, [[0, '#cfe0e0'], [1, '#4e6264']]);
    B.f(`M42 ${eaveF + 13}h6l-1 9h-4z`, IRON[0]).f(`M42.8 ${eaveF + 14}h4.4l-.8 7h-2.8z`, glow).f(`M41.4 ${eaveF + 13}Q45 ${eaveF + 9} 48.6 ${eaveF + 13}Z`, IRON[1]);
    if (s === 'winter') { B.f(B.poly([[xs * .92, eaveB - 6], [xe * .92, eaveB - 6], [xe * .97, eaveB + 2], [xs * .97, eaveB + 2]]), '#f4f6f2', .9); }
    B.tufts(r, -60, 1, 6, 6, grass(s), 6).tufts(r, 60, 1, 6, 6, grass(s), 6);
  } };

  /* ---------- the boathouse: a gable of sea-blue weatherboard on a granite footing, its slate roof running back, the boat
     doors standing open on the dark inside with a boat's bow in it, the loft door under its hoist beam (the way up to
     the boat loft), lobster pots, oars, a lifebuoy and rope at its foot; the ship's lantern by the doors lit at night ---------- */
  A['ld-boathouse'] = { box: [-84, -190, 86, 12], door: { dx: 0, dy: -2 }, seat: { kind: 'flags', w: 136, front: 20 }, lit: true, lights: [[-44, -58, 90], [0, -118, 70]], draw(B, o) {
    const r = KIT().rng(711), s = o.season, eaves = -H * 1.95, ridge = -H * 3.45, back = 34, hw = 64;
    const BLUE = ['#5e868c', '#4a6e74', '#7ea4a8', '#2e4a50'], TRIM = '#efe8d8';
    // the roof running back from the gable: the west pitch lit, the east in shade, slate courses, the ridge tiles
    const lb = [-hw - 5, eaves + 3 - back], rb = [hw + 5, eaves + 3 - back], rt = [0, ridge - back];
    B.f(B.poly([[-hw - 5, eaves + 3], lb, rt, [0, ridge]]), SLATE[2]).f(B.poly([[hw + 5, eaves + 3], rb, rt, [0, ridge]]), SLATE[1]);
    for (let k = 1; k < 9; k++) { const t = k / 9; B.s(`M${-hw - 5 + (hw + 5) * t} ${eaves + 3 + (ridge - eaves - 3) * t}l0 ${-back}`, SLATE[3], .5, .35).s(`M${hw + 5 - (hw + 5) * t} ${eaves + 3 + (ridge - eaves - 3) * t}l0 ${-back}`, SLATE[3], .5, .45); }
    for (let j = 1; j < 6; j++) { const d = back * j / 6; B.s(`M${-hw - 5} ${eaves + 3 - d}L0 ${ridge - d}L${hw + 5} ${eaves + 3 - d}`, SLATE[3], .6, .4); }
    for (let i = 0; i < 14; i++) { const t = r(), side = r() < .5 ? -1 : 1, d = r() * back; B.f(B.rect(side * (hw + 5) * (1 - t) - 3, eaves + 3 + (ridge - eaves - 3) * t - d, 6, 2.4), side < 0 ? '#93a0a6' : '#3e464c', .5); }
    B.s(`M0 ${ridge}L0 ${ridge - back}`, '#3a3230', 3.4).s(`M-1 ${ridge}L-1 ${ridge - back}`, '#7a6a62', 1, .6);
    if (s === 'winter') B.f(B.poly([[-hw + 2, eaves - 2 - back * .2], lb, rt, rb, [hw - 2, eaves - 2 - back * .2], [0, ridge - 4]]), '#f4f6f2', .85);
    else for (let i = 0; i < 6; i++) B.f(B.blob(r, -hw + 10 + r() * 40, eaves - 4 - r() * back, 4 + r() * 3, 1.6, 6, .5), '#9aa85e', .55);
    // the granite footing, then the gable of lapped boards, each board's lower edge shadowed, salt-pale streaks
    ashlar(B, r, -hw, -14, hw * 2, 14, STONE, 5);
    B.f(B.poly([[-hw, -14], [-hw, eaves], [0, ridge + 4], [hw, eaves], [hw, -14]]), BLUE[0]);
    for (let y = -16; y > ridge + 8; y -= 5.2) { const half = y > eaves ? hw : hw * (y - ridge - 4) / (eaves - ridge - 4); B.f(B.rect(-half, y - 1.4, half * 2, 1.4), BLUE[3], .45).f(B.rect(-half, y - 5.2, half * 2, 1), BLUE[2], .35); }
    for (let i = 0; i < 12; i++) { const x = -hw + 4 + r() * (hw * 2 - 8), y = eaves + r() * (-eaves - 20); B.f(B.rect(x, y, 2 + r() * 6, 3 + r() * 14), r() < .5 ? '#9cc0c2' : '#3e5c62', .22); }
    B.f(B.poly([[-hw, -14], [-hw, eaves], [-hw * .55, eaves - (eaves - ridge) * .45], [-hw * .55, -14]]), '#ffffff', .07).f(B.poly([[hw * .62, -14], [hw * .62, eaves - (eaves - ridge) * .38], [hw, eaves], [hw, -14]]), '#0a1418', .2);
    // the white bargeboards and a finial at the apex
    B.s(`M${-hw - 6} ${eaves + 4}L0 ${ridge}L${hw + 6} ${eaves + 4}`, '#2a2a28', 5.6, .35).s(`M${-hw - 5} ${eaves + 3}L0 ${ridge}L${hw + 5} ${eaves + 3}`, TRIM, 4.4).s(`M${-hw - 5} ${eaves + 4.6}L0 ${ridge + 1.6}`, '#b8b0a0', 1, .7);
    B.post(0, ridge - 12, ridge + 2, 3, ['#efe8d8', '#a8a090', '#ffffff']).f(B.circ(0, ridge - 13, 2.2), TRIM);
    // the boat doors: a deep opening in a white frame, the east leaf swung out to the wall, the west one ajar
    const dw = 66, dh = sz('door', 1) * 1.36, dt = -14 - dh;
    B.f(B.rect(-dw / 2 - 3, dt - 3, dw + 6, dh + 3), TRIM).f(B.rect(-dw / 2, dt, dw, dh), B.lin(0, dt, 0, -14, [[0, '#120e0a'], [1, '#2a2218']]));
    // inside: the bow of a boat on its trolley, ropes, an oar rack in the gloom
    B.f(`M-18 -14Q-20 ${dt + 26} -4 ${dt + 18}Q10 ${dt + 26} 8 -14Z`, '#d8d2c4').f(`M-18 -14Q-19 ${dt + 34} -5 ${dt + 28}Q8 ${dt + 34} 8 -14Z`, '#b8342a', .9).s(`M-4 ${dt + 18}V-16`, '#7a7266', .8);
    for (let k = 0; k < 4; k++) B.s(`M${14 + k * 4} ${dt + 6}l2 ${dh - 10}`, '#5a4a38', 1.2, .7);
    B.f(B.rect(-dw / 2, -17, dw, 3), '#000000', .35);
    // the west leaf ajar (a narrow plank face), the east leaf swung right back against the wall
    B.f(B.poly([[-dw / 2, dt], [-dw / 2 + 12, dt + 4], [-dw / 2 + 12, -12], [-dw / 2, -14]]), BLUE[1]).s(`M${-dw / 2 + 6} ${dt + 2}V-13`, BLUE[3], .6);
    B.f(B.poly([[dw / 2, dt], [dw / 2 + 22, dt + 6], [dw / 2 + 22, -10], [dw / 2, -14]]), BLUE[2]).s(`M${dw / 2 + 7} ${dt + 3}V-12M${dw / 2 + 14} ${dt + 4}V-11`, BLUE[3], .6, .8).s(`M${dw / 2} ${dt + 10}l22 4M${dw / 2} -26l22 3`, '#2a2a28', 1.2, .8);
    // the loft door under the hoist: plank, a white frame, its beam with a block and a rope coiled down
    const lt = eaves - 34; windowLit(B, -9, lt + 1, 18, 22, o.night, TRIM); B.f(B.rect(-9, lt + 1, 18, 22), o.night ? 'rgba(0,0,0,0)' : '#6a4e36', o.night ? 0 : 1).s(`M-3 ${lt + 1}v22M3 ${lt + 1}v22`, '#4a3626', .6, o.night ? 0 : .8);
    B.f(B.rect(-11, lt + 23, 22, 2.6), TRIM);
    B.f(B.rect(-3, lt - 14, 6, 5), '#6a5034').f(B.poly([[-3, lt - 14], [3, lt - 14], [5, lt - 20], [-1, lt - 20]]), '#8a6a46');
    B.f(B.rect(-2, lt - 12, 30, 4), OAK[1]).f(B.rect(-2, lt - 12, 30, 1.2), OAK[2]).f(B.circ(25, lt - 6, 2.6), '#3e3a36').s(`M25 ${lt - 4}V${lt + 26}`, '#c8b080', 1).s(`M23 ${lt - 4}V${lt + 10}`, '#c8b080', 1);
    B.f(B.rr(21, lt + 26, 8, 6, 1), IRON[1]);
    // two small windows either side of the doors
    for (const x of [-hw + 10, hw - 22]) windowLit(B, x, -60, 12, 14, o.night, TRIM);
    // the ship's lantern by the doors, the lifebuoy on the east wall, oars leaning, pots and rope at the west
    const lx = -44, ly = -62;
    B.s(`M${lx + 4} ${ly - 8}h-6v4`, IRON[0], 1.2);
    B.f(B.rr(lx - 6, ly - 4, 8, 12, 1.4), '#1e2224').f(B.rr(lx - 4.8, ly - 2.6, 5.6, 9, 1), o.night ? B.rad(lx - 2, ly + 2, 6, [[0, '#fffbe6'], [.5, '#ffe08a'], [1, '#e8a44a']]) : '#8aa4a6').f(B.circ(lx - 2, ly + 2, 1.6), o.night ? '#fffbe6' : '#d84a3a', o.night ? 1 : .7);
    const bx = hw - 14, by = -36;
    const arc = (a0, a1) => `M${bx + Math.cos(a0) * 7.6} ${by + Math.sin(a0) * 7.6}A7.6 7.6 0 0 1 ${bx + Math.cos(a1) * 7.6} ${by + Math.sin(a1) * 7.6}`;
    B.s(B.ell(bx + .8, by + 1, 7.6, 7.6), '#1a2a2e', 5, .35).s(B.ell(bx, by, 7.6, 7.6), '#f4f0e8', 4.6);
    for (let k = 0; k < 4; k += 2) B.s(arc(k * Math.PI / 2 + .3, (k + 1) * Math.PI / 2 + .3), '#d8402a', 4.6, 1, 'butt');
    B.s(arc(3.6, 4.6), '#ffffff', 1.2, .6).s(`M${bx + 7} ${by - 4}q4 6 -2 14`, '#c8b080', .8);
    for (const [x, a] of [[hw + 10, .2], [hw + 15, .3]]) { B.s(`M${x} 2L${x - Math.sin(a) * 70} -70`, '#a87e4e', 2.2).f(B.poly([[x - 2.6, 4], [x + 2.6, 4], [x + 2, -12], [x - 2, -12]]), '#c89a62'); }
    const pot = (x, y) => { B.f(`M${x - 9} ${y}V${y - 8}Q${x} ${y - 15} ${x + 9} ${y - 8}V${y}Z`, '#6a5038'); for (let k = -2; k <= 2; k++) B.s(`M${x + k * 3.6} ${y}V${y - 9 - (2 - Math.abs(k)) * 1.6}`, '#c8b080', .7); B.s(`M${x - 9} ${y - 4}h18`, '#c8b080', .7).f(B.rect(x - 9.4, y - 1.4, 18.8, 1.4), '#4a3626'); };
    pot(-hw - 6, 2); pot(-hw + 10, 3); pot(-hw + 2, -10);
    B.f(B.ell(-30, -2, 8, 3.4), '#c8a874').s(B.ell(-30, -2.6, 5.4, 2.2), '#9a7a48', .8).s(B.ell(-30, -3, 2.6, 1), '#9a7a48', .7);
    if (s !== 'winter') { mossOn(B, r, -hw, -14, hw * 2, 8, s); for (let i = 0; i < 6; i++) B.f(B.circ(-hw + 4 + r() * 20, -15 - r() * 4, 1.2), '#f4f0e2', .9); }
    B.tufts(r, -hw - 2, 1, 10, 7, grass(s), 6).tufts(r, hw + 2, 1, 10, 7, grass(s), 6);
  } };

  /* ---------- shared pieces for the merged sights (the owner, 19 Nov: "merged into a structure or the land it belongs to") ---------- */
  const BARK = ['#6e5a42', '#4e3e2c', '#8e785a', '#2e2418'];
  // surface roots snaking out over the ground from a trunk's foot, mossed, sinking into the earth as they go (in a seat: under every actor)
  function roots(B, r, n, x0, x1, reach, s) {
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, sx = side < 0 ? x0 + r() * 8 : x1 - r() * 8, a = (side < 0 ? Math.PI : 0) + (r() - .5) * 1.1 + (side < 0 ? -.25 : .25), len = reach * (.55 + r() * .45);
      let px = sx, py = 1 + r() * 3, w = 6 + r() * 3;
      for (let k = 0; k < 7; k++) { const nx = px + Math.cos(a + (r() - .5) * .6) * len / 7, ny = py + Math.abs(Math.sin(a)) * len / 7 * .45 + (r() - .5) * 2; B.s(`M${px} ${py}L${nx} ${ny}`, BARK[1], w, .95).s(`M${px} ${py - w * .25}L${nx} ${ny - w * .25}`, BARK[2], w * .35, .7); px = nx; py = ny; w *= .78; }
      if (s !== 'winter') B.f(B.blob(r, sx + side * 10, 3, 6, 2, 6, .5), '#7d8f4e', .7);
    }
  }
  // leaf litter in drifts, each leaf its own turn (autumn thick, summer a few old ones)
  function litter(B, r, rx, ry, n, s) {
    const cols = s === 'autumn' ? ['#c45a26', '#e0a040', '#8e6a2c', '#b8782e'] : s === 'winter' ? ['#8a7a64', '#a89a80'] : ['#8e7a4a', '#a8905a', '#6e6a3a'];
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = .45 + Math.sqrt(r()) * .55, x = Math.cos(a) * rx * d, y = Math.sin(a) * ry * d + ry * .2; B.cx.save(); B.cx.translate(x, y); B.cx.rotate(r() * 3); B.f(B.ell(0, 0, 2 + r() * 1.4, 1 + r() * .6), cols[i % cols.length], .85); B.cx.restore(); }
  }
  // a crown of leaf masses lit from the upper left: the dark under-lobes, the body, lit lobes, a few bright flecks
  function crown(B, r, lobes, s, o) {
    o = o || {}; const L = leaf(s);
    if (s === 'winter') { for (const [x, y, rx] of lobes) for (let k = 0; k < 3; k++) { const a = -Math.PI * (.15 + r() * .7); B.s(`M${x} ${y + rx * .3}l${Math.cos(a) * rx} ${Math.sin(a) * rx * .8}`, '#6a5444', 1.6, .75); } return; }
    for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x + rx * .12, y + ry * .16, rx, ry, 10, .32), L[0]);
    for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x - rx * .04, y - ry * .04, rx * .84, ry * .8, 10, .34), L[1]);
    for (const [x, y, rx, ry] of lobes) if (x < (o.litX == null ? 0 : o.litX) + rx * .4 || y < (o.litY || -1e9)) B.f(B.blob(r, x - rx * .26, y - ry * .3, rx * .5, ry * .42, 8, .4), L[2], .92);
    for (const [x, y, rx, ry] of lobes) if (r() < .5) B.f(B.blob(r, x - rx * .4, y - ry * .5, rx * .2, ry * .16, 6, .5), L[3], .85);
    for (let i = 0; i < lobes.length * 4; i++) { const [x, y, rx, ry] = lobes[Math.floor(r() * lobes.length)], a = r() * Math.PI * 2; B.f(B.ell(x + Math.cos(a) * rx * .95, y + Math.sin(a) * ry * .95, 2.2, 1.4), L[r() < .5 ? 0 : 1], .9); }
    if (s === 'autumn') for (let i = 0; i < lobes.length * 2; i++) { const [x, y, rx, ry] = lobes[Math.floor(r() * lobes.length)]; B.f(B.blob(r, x + (r() - .5) * rx, y + (r() - .5) * ry, rx * .22, ry * .18, 6, .5), ['#c45a26', '#e0a040', '#b8782e'][i % 3], .85); }
  }
  // a puff of smoke, soft, for a part that rises and fades
  const puff = (B, rad) => B.f(B.circ(0, 0, rad), B.rad(0, 0, rad, [[0, 'rgba(236,234,228,.85)'], [.6, 'rgba(226,224,218,.45)'], [1, 'rgba(220,220,214,0)']]));
  const smokeParts = (at, n, rise, drift, rate) => Array.from({ length: n }, (_, i) => ({ id: 'smoke' + i, box: [-9, -9, 9, 9], at, draw: B => puff(B, 7 + i * .6),
    anim(im, t, o) { const p = (t * rate + i / n) % 1; im.setPosition(o.x + Math.sin(p * 3 + i) * 2 + p * drift, o.y - p * rise); im.setAlpha(Math.min(1, p * 6) * (1 - p) * .7); } }));

  /* ---------- the great stump: the bole of a felled oak, its buttress roots running out into the moss, the felling cut with
     its splintered hinge, the very small door of the parlour with its step, a tin chimney with a thread of smoke; the
     trunk that was felled lies beside it and its own logs are split and stacked on the east ---------- */
  A['ld-stump'] = { box: [-72, -92, 74, 10], door: { dx: 10, dy: 0 }, lit: true, lights: [[12, -14, 50]],
    seat: { kind: 'moss', w: 74, front: 20, back: 22, stones: 0, box: [-96, -30, 96, 34], extra(B, r, P, G) { roots(B, r, 7, -30, 30, 52, 'summer'); litter(B, r, 70, 20, 46, 'autumn'); for (let i = 0; i < 14; i++) B.f(B.ell(36 + r() * 26, 2 + r() * 6, 1.6, .8), '#d4b07a', .9); } },
    parts: smokeParts([18, -78], 3, 34, 8, .22),
    draw(B, o) {
    const r = KIT().rng(721), s = o.season, top = -H * 1.3, bark = BARK;
    // the felled trunk lying away to the west, its sawn end toward the stump, moss along its back, a fern in front
    B.f(`M-72 -4Q-74 -22 -64 -26L-34 -24Q-28 -14 -32 -2Z`, bark[1]).f(`M-72 -10Q-72 -22 -64 -25L-36 -23Q-34 -20 -36 -18Z`, bark[2], .6);
    for (let i = 0; i < 5; i++) B.s(`M${-70 + i * 2} ${-6 - i * 3.6}L-36 ${-6 - i * 3.4}`, bark[3], .7, .45);
    B.f(B.ell(-33, -13, 6, 11.6), '#b49a70').f(B.ell(-33, -13, 4.6, 9.6), '#cdb488'); for (let k = 1; k < 4; k++) B.s(B.ell(-33, -13, 4.6 - k, 9.6 - k * 2.2), '#a08460', .5, .7);
    if (s !== 'winter') { mossOn(B, r, -70, -24, 30, 6, s); ferns(B, r, -54, 0, 20, 4, s); }
    // the buttress roots where they leave the bole, then the bole itself, fluted, lit on the west
    for (const [x, d] of [[-34, -1], [-24, -1], [28, 1], [36, 1], [-4, 0]]) B.f(`M${x - 7} 1Q${x + d * 7} -20 ${x + d * 2} -30L${x + 9} -25Q${x + 11 + d * 5} -11 ${x + 12 + d * 12} 2Z`, bark[d < 0 ? 0 : 1]);
    B.f(`M-29 0Q-34 ${top * .5} -30 ${top}H30Q34 ${top * .5} 29 0Z`, bark[0]);
    B.f(`M-34 0Q-37 ${top * .5} -31 ${top}H-12Q-16 ${top * .5} -14 0Z`, bark[2], .65).f(`M13 0Q18 ${top * .5} 13 ${top}H31Q36 ${top * .5} 33 0Z`, bark[1], .8);
    for (let i = 0; i < 11; i++) { const x = -28 + i * 5.6 + (r() - .5) * 2; B.s(`M${x} -2Q${x + (r() - .5) * 4} ${top * .5} ${x + (r() - .5) * 3} ${top + 2}`, bark[3], .8, .45); }
    // the felling cut: the pale face, its rings, the splintered hinge standing up along the back edge
    B.f(B.ell(0, top, 31, 8), '#b49a70').f(B.ell(0, top, 27, 6.4), '#cdb488');
    for (let k = 1; k < 7; k++) B.s(B.ell(-1 + k * .3, top + .2, 27 - k * 3.8, 6.4 - k * .9), '#a08460', .55, .7);
    B.f(B.ell(-9, top - 1, 11, 2.6), '#e4d0a4', .5);
    const hinge = [[-22, top - 3]]; for (let x = -20; x <= 22; x += 3) hinge.push([x, top - 4 - (r() * 9 + (Math.abs(x) < 10 ? 6 : 0))]); hinge.push([24, top - 3]);
    B.f(B.poly(hinge.concat([[24, top - 1], [-22, top - 1]])), '#c4a878').s(B.line(hinge), '#8e7450', .7);
    for (let i = 0; i < 6; i++) B.s(`M${-16 + i * 6} ${top - 2}l${(r() - .5) * 2} ${-4 - r() * 4}`, '#e8d4a8', .6, .8);
    // the tin chimney of the parlour stove, out of the cut face
    B.f(B.rect(15, top - 18, 5, 18), B.lin(15, 0, 20, 0, [[0, '#9aa0a2'], [1, '#4e5456']])).f(B.rect(13.6, top - 21, 7.8, 3.4), '#3e4446');
    // moss on the bole and the rim, bracket fungi on the shaded side
    mossOn(B, r, -30, top + 3, 34, 9, s); for (let i = 0; i < 6; i++) B.f(B.blob(r, -31 + r() * 5, top * (.15 + r() * .65), 4, 2, 6, .5), s === 'winter' ? '#e8eeea' : '#6f8446', .85);
    for (const [x, y] of [[27, top * .6], [30, top * .45], [25, top * .3]]) B.f(`M${x - 6} ${y}q6 -4.6 12 0z`, '#c89a5a').f(`M${x - 6} ${y}h12`, '#8a6438').f(`M${x - 4} ${y - 1.4}q4 -2.4 8 0`, '#e0b878', .6);
    // the very small door: round-topped and green, a brass knob, a step of flat stone, a window that glows at night
    B.f(`M4 0V-13a6 6 0 0 1 12 0V0Z`, '#2e2418').f(`M5.4 0V-12.6a4.6 4.6 0 0 1 9.2 0V0Z`, '#4e7a4a').s('M10 -12v12', '#3a5a36', .5).f(B.circ(13, -6, .9), '#e8c45a');
    B.f(B.rr(1, -1.4, 18, 3, 1), STONE.rock).f(B.rect(1.4, -1.4, 17, 1), STONE.rockHi, .8);
    B.f(B.circ(-7, -17, 3.4), '#3a2c1e').f(B.circ(-7, -17, 2.6), o.night ? '#ffd27a' : '#3e4e52').s('M-7 -19.6v5.2M-9.6 -17h5.2', '#8a6a46', .5);
    B.s('M20 -14h3', IRON[0], .8).f(B.rr(21.4, -13, 3.4, 5, .8), IRON[0]).f(B.rr(22, -12.4, 2.2, 3.6, .5), o.night ? '#ffe08a' : '#7a9a9c');
    // the logs from it, split and stacked on the east: ends toward us, pale wood ringed, bark at the rim
    const round = (x, y, R) => { B.f(B.circ(x + .6, y + .6, R), bark[3], .6).f(B.circ(x, y, R), bark[1]).f(B.circ(x - .3, y - .3, R * .82), '#cdb488').s(B.ell(x - .3, y - .3, R * .5, R * .5), '#a08460', .5, .7).f(B.ell(x - R * .3, y - R * .35, R * .3, R * .18), '#e8d4a8', .6); };
    for (const [x, y, R] of [[42, -5, 5.4], [53, -5, 5.6], [64, -5, 5.2], [47.5, -15, 5.2], [58.5, -15, 5.4], [53, -25, 5]]) round(x, y, R);
    B.f(B.poly([[38, -1], [46, -3], [44, 1]]), '#cdb488');
    // ferns and grass round the foot, a toadstool or two, fallen leaves on the cut in autumn
    if (s !== 'winter') { ferns(B, r, -22, 2, 18, 4, s); ferns(B, r, 30, 2, 12, 3, s); for (const [x, c] of [[-14, '#c83a2a'], [-10, '#d84a3a']]) B.f(`M${x - 3} -3q3 -4 6 0z`, c).s(`M${x} -3v3`, '#efe8d8', 1.2).f(B.circ(x - 1, -4, .5), '#ffffff'); }
    if (s === 'autumn') litter(B, r, 22, 4, 12, s);
    if (s === 'winter') B.f(B.ell(0, top - 1, 28, 6), '#f4f6f2', .9);
    B.tufts(r, -40, 3, 10, 6, grass(s), 7).tufts(r, 70, 3, 8, 6, grass(s), 7);
  } };

  /* ---------- pump square: a small yard of flags against a dry-stone wall, the cast-iron pump at the wall with its trough,
     a bucket and the dipper on its nail, the flags dark and shining where the water runs off; the spout drips ---------- */
  A['ld-pump'] = { box: [-66, -94, 68, 8],
    seat: { kind: 'flags', w: 116, front: 26, back: 16, stones: 0, box: [-82, -26, 84, 40], extra(B, r) {
      // the wet: dark round the trough's foot and the bucket, a runnel off to the yard's edge, shine on it
      B.f(B.blob(r, -16, 6, 30, 7, 10, .35), '#3e3a2c', .32).f(B.blob(r, 42, 6, 10, 4, 8, .4), '#3e3a2c', .28);
      B.s('M-4 10Q8 16 4 24Q-2 30 10 34', '#3e3a2c', 2.6, .3).s('M-4 10Q8 16 4 24', '#e8f0f0', .6, .45);
      for (let i = 0; i < 6; i++) B.f(B.ell(-30 + r() * 30, 3 + r() * 7, 3 + r() * 3, .8), '#eef4f4', .35);
    } },
    parts: [
      { id: 'drip', box: [-3, -3, 3, 4], at: [-4, -38], draw: B => B.f('M0 -2.4Q2 1 0 2.4Q-2 1 0 -2.4Z', '#d8eef2').f(B.circ(-.5, .4, .6), '#ffffff', .9), anim(im, t, o) { const p = (t * .7) % 1, f = Math.min(1, p / .8); im.setPosition(o.x, o.y + f * f * 15); im.setAlpha(p < .8 ? .9 : 0); } },
      { id: 'ring', box: [-9, -3, 9, 3], at: [-4, -21], draw: B => B.s(B.ell(0, 0, 7, 1.8), '#e8f4f4', .8).s(B.ell(0, 0, 3.6, .9), '#ffffff', .6), anim(im, t, o) { const p = (t * .7) % 1; im.setAlpha(p >= .8 ? (1 - (p - .8) / .2) * .8 : 0); } },
    ],
    draw(B, o) {
    const r = KIT().rng(731), s = o.season, L = leaf(s), wallTop = -H * 1.1, top = -H * 1.9, green = ['#2e4a3a', '#1e3428', '#4e6e58', '#0e1a14'];
    // the wall behind: rubble in courses, a coping of slabs, its ends broken down, ivy on the west, valerian on the cope
    const wt = x => wallTop + (x < -50 ? (-50 - x) * .9 : x > 52 ? (x - 52) * .9 : 0) + Math.sin(x * .3) * .8;
    rubble(B, r, -62, 64, -14, wt, ['#9a9480', '#8a8470', '#a8a28c', '#7e7864'], { course: 4.6, moss: .12 });
    for (let x = -50; x < 52;) { const w = 9 + r() * 7; B.f(B.rr(x, wallTop - 4, w - .6, 5, 1.2), '#b4ae98').f(B.rect(x + .6, wallTop - 4, w - 1.8, 1.4), '#d8d2bc', .8); x += w; }
    ivy(B, r, -54, -14, wallTop + 2, s); ivy(B, r, -46, -14, wallTop + 8, s);
    if (s !== 'winter') for (let i = 0; i < 6; i++) { const x = 24 + r() * 26; B.s(`M${x} ${wallTop - 3}q${(r() - .5) * 3} -5 ${(r() - .5) * 4} -9`, '#5e8a3e', .8); B.f(B.blob(r, x + (r() - .5) * 3, wallTop - 12 - r() * 2, 2.6, 2, 6, .5), s === 'autumn' ? '#a8562a' : '#d84a5a', .9); }
    // the dipper on its nail, a horseshoe over the pump for luck
    B.f(B.circ(-30, -40, .9), IRON[0]).s('M-30 -40l-2 12', '#8a949a', 1.4).f(B.ell(-32.4, -27, 4, 2.6), '#9aa4a8').f(B.ell(-33, -27.6, 2.6, 1.2), '#cfd8da', .7);
    B.s('M22 -66a4 4 0 1 1 8 0', '#5a5e60', 1.8);
    // the trough: a long dressed block, the water in it lit by the sky, moss at its foot
    B.f(B.rr(-40, -22, 52, 22, 2), STONE.rockLo).f(B.rect(-40, -22, 52, 4), STONE.rockHi).f(B.rect(-40, -18, 8, 18), STONE.rock, .7).f(B.rect(4, -18, 8, 18), '#3e3a30', .25);
    B.f(B.rect(-37, -20.6, 46, 3.8), s === 'winter' ? '#d8e6ec' : B.lin(0, -21, 0, -17, [[0, '#7aa4ac'], [1, '#2e5258']])).f(B.ell(-18, -19.4, 12, .8), '#e8f4f4', .5);
    mossOn(B, r, -40, -1, 52, 7, s); B.s('M-38 -14l2 12M6 -12l1 10', '#6a6454', .6, .5);
    // the pump against the wall: a fluted cast-iron column, a collar, a domed cap and finial, the handle up, the spout over the trough
    B.f(B.rr(12, -6, 18, 6, 1), STONE.rockLo).f(B.rect(12, -6, 18, 1.6), STONE.rockHi);
    B.f(B.rect(14, top + 12, 14, -top - 18), drum(B, 14, 28, [green[2], green[0], green[0], green[1], green[3]]));
    for (const x of [17.4, 21, 24.6]) B.s(`M${x} ${top + 14}V-8`, green[3], .5, .5);
    for (const y of [top + 20, -30, -10]) B.f(B.rect(12.6, y, 16.8, 3.4), green[1]).f(B.rect(12.6, y, 16.8, 1.1), green[2], .7);
    B.f(B.ell(21, top + 12, 9, 3.2), green[1]).f(`M13 ${top + 12}Q13 ${top + 2} 21 ${top}Q29 ${top + 2} 29 ${top + 12}Z`, drum(B, 13, 29, [green[2], green[0], green[0], green[1], green[3]])).f(B.circ(21, top - 3, 2.4), green[1]).f(B.circ(20.2, top - 3.8, .9), green[2]);
    B.s(`M14 -38Q4 -40 -2 -38`, green[0], 4.4).s(`M14 -39.4Q4 -41.4 -2 -39.4`, green[2], 1, .7).f(B.ell(-3, -36.6, 2.6, 2.4), green[1]).f(B.ell(-3.6, -35.4, 1.4, 1), '#0a120e');
    B.s(`M28 ${top + 20}Q40 ${top + 14} 46 ${top + 2}`, green[0], 3.4).f(B.circ(46.4, top + 1.4, 2.6), green[1]).s(`M28 ${top + 20}l3 -1`, green[2], 1, .7);
    // a wooden bucket on the flags, staves and two iron hoops, water in it; a stool
    B.f('M36 1L34 -14H50L48 1Z', B.lin(34, 0, 50, 0, [[0, '#b08a5a'], [.6, '#8a6a42'], [1, '#5a4228']])).f(B.ell(42, -14, 8, 2.2), '#5a4228').f(B.ell(42, -14, 6.6, 1.6), '#4e7a80');
    for (const y of [-11, -3]) B.s(`M34.6 ${y}Q42 ${y + 1.4} 49.4 ${y}`, IRON[1], 1.2);
    for (let x = 37; x < 48; x += 3.2) B.s(`M${x} -13v13`, '#5a4228', .5, .5);
    B.s('M35 -14Q42 -24 49 -14', '#8a949a', .8);
    if (s !== 'winter') { for (let i = 0; i < 5; i++) B.f(B.circ(-58 + r() * 8, -2 - r() * 3, 1.2), ['#f4f0e2', '#e8c84a'][i % 2]); ferns(B, r, 58, 1, 10, 3, s); }
    if (s === 'winter') { B.f(B.rect(-50, wallTop - 6, 102, 3), '#f4f6f2', .9).f(B.ell(21, top + 1, 8, 2.4), '#f4f6f2', .9); for (let i = 0; i < 4; i++) B.f(`M${-34 + i * 12} -22l1.2 ${5 + r() * 5}l1.2 ${-5 - r() * 5}z`, '#e6f3f8', .9); }
    B.tufts(r, -64, 2, 8, 6, grass(s), 6).tufts(r, 64, 2, 8, 6, grass(s), 6);
    void L;
  } };

  /* ---------- the treehouse: built into a great sweet chestnut, a deck of planks round the trunk on knee braces, a railing,
     the plank house with its shingle roof among the limbs, a rope ladder down to the roots, a lantern on a cord from a
     branch (lit at night, swinging a little) and a pennant on the ridge ---------- */
  const TX = -12, DECK = -H * 2.35;
  // (its door is the rope ladder's foot: the rooms' way in stands there as a worn threshold, not a second little door picture)
  A['ld-treehouse'] = { box: [-130, -262, 126, 14], door: { dx: TX - 43, dy: 0 }, lit: true, lights: [[TX - 62, DECK - 30, 70], [TX + 26, DECK - 26, 80]],
    seat: { kind: 'turf', w: 64, front: 18, back: 18, stones: 0, box: [-110, -26, 110, 36], extra(B, r) { roots(B, r, 8, TX - 24, TX + 24, 64, 'summer'); litter(B, r, 70, 18, 22, 'summer'); } },
    parts: [
      { id: 'lantern', box: [-8, -2, 8, 30], at: [TX - 62, DECK - 54], draw(B, o) { B.s('M0 0V14', '#c8b080', .9); B.f('M-4 14h8l-1 11h-6z', IRON[0]).f('M-3.2 15h6.4l-.8 9h-4.8z', o.night ? B.rad(0, 19.5, 6, [[0, '#fffbe6'], [.5, '#ffe08a'], [1, '#e8a44a']]) : '#8aa4a6').f('M-5 14Q0 9 5 14Z', IRON[1]).f(B.rect(-1.4, 25, 2.8, 1.6), IRON[0]); },
        anim(im, t) { im.setRotation(Math.sin(t * 1.1) * .07 + Math.sin(t * 2.7) * .02); } },
      { id: 'pennant', box: [-2, -24, 22, 2], at: [TX + 30, DECK - 74], draw(B) { B.s('M0 0V-22', '#6e4c2a', 1.2).f('M0 -22l18 4l-18 4.4z', '#d8452a').f('M0 -22l18 4l-18 1z', '#f06a4a', .7); },
        anim(im, t) { im.setRotation(Math.sin(t * 2.1) * .05); } },
    ],
    draw(B, o) {
    const r = KIT().rng(741), s = o.season, tx = TX, deck = DECK, wall = '#8a6a48', plank = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'];
    // the crown behind: the great mass of the chestnut, above and round the house
    const back = []; for (let i = 0; i < 13; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); back.push([tx + Math.cos(a) * 72 * d, -184 + Math.sin(a) * 42 * d, 30 + r() * 12, 22 + r() * 8]); }
    crown(B, r, back, s, { litX: tx });
    // the trunk: broad and spiral-furrowed, flaring into roots at the foot, forking above the deck into three limbs
    for (const [x, d] of [[tx - 30, -1], [tx - 22, -1], [tx + 24, 1], [tx + 32, 1]]) B.f(`M${x - 7} 1Q${x + d * 7} -12 ${x + d * 2} -22L${x + 9} -18Q${x + 11 + d * 4} -8 ${x + 12 + d * 12} 2Z`, BARK[d < 0 ? 0 : 1]);
    B.f(`M${tx - 26} 0Q${tx - 17} -60 ${tx - 15} ${deck - 30}L${tx + 15} ${deck - 30}Q${tx + 17} -60 ${tx + 28} 0Z`, BARK[0]);
    B.f(`M${tx - 26} 0Q${tx - 17} -60 ${tx - 15} ${deck - 30}L${tx - 5} ${deck - 30}Q${tx - 8} -60 ${tx - 10} 0Z`, BARK[2], .65).f(`M${tx + 8} 0Q${tx + 8} -60 ${tx + 6} ${deck - 30}L${tx + 15} ${deck - 30}Q${tx + 17} -60 ${tx + 28} 0Z`, BARK[1], .8);
    for (let k = 0; k < 9; k++) B.s(`M${tx - 22 + k * 5} -3Q${tx - 12 + k * 3.6} ${deck * .5} ${tx - 10 + k * 2.6} ${deck - 28}`, BARK[3], .9, .45);
    for (const [dx, dy, w] of [[-70, -186, 11], [6, -222, 10], [68, -180, 10]]) B.s(`M${tx} ${deck - 26}Q${tx + dx * .3} ${deck - 26 + (dy - deck + 26) * .6} ${tx + dx} ${dy}`, BARK[0], w).s(`M${tx - 2} ${deck - 26}Q${tx + dx * .3 - 2} ${deck - 26 + (dy - deck + 26) * .6} ${tx + dx - 2} ${dy}`, BARK[2], w * .25, .6);
    // the branch that carries the lantern, out to the west
    B.s(`M${tx - 10} ${deck - 40}Q${tx - 40} ${deck - 62} ${tx - 76} ${deck - 58}`, BARK[1], 4.4).s(`M${tx - 10} ${deck - 41}Q${tx - 40} ${deck - 63} ${tx - 76} ${deck - 59}`, BARK[2], 1.2, .6);
    // the knee braces from the trunk out under the deck, then the deck: planks across, a fascia, its shadow on the bark
    for (const d of [-1, 1]) B.s(`M${tx + d * 12} ${deck + 36}L${tx + d * 50} ${deck + 2}`, plank[1], 4.4).s(`M${tx + d * 12} ${deck + 35}L${tx + d * 50} ${deck + 1}`, plank[2], 1.2, .6);
    B.f(B.ell(tx - 2, deck + 4, 62, 12), 'rgba(30,22,14,.35)');
    B.f(`M${tx - 62} ${deck - 4}Q${tx - 62} ${deck - 14} ${tx - 40} ${deck - 16}H${tx + 38}Q${tx + 60} ${deck - 14} ${tx + 60} ${deck - 4}Z`, plank[0]);
    for (let x = tx - 58; x < tx + 58; x += 5.2) B.s(`M${x} ${deck - 15}l${(x - tx) * .04} 11`, plank[3], .6, .55);
    B.f(B.rect(tx - 62, deck - 4, 122, 5), plank[1]).f(B.rect(tx - 62, deck - 4, 122, 1.4), plank[2], .8);
    // the house on the deck, east of the trunk: crooked plank walls, a round window, a door onto the deck, a shingle roof
    const hx0 = tx + 4, hx1 = tx + 54, hb = deck - 12, ht = hb - H * 1.05;
    B.f(B.poly([[hx0, hb], [hx0 + 1, ht], [hx1 - 1, ht - 1], [hx1, hb]]), wall);
    for (let x = hx0 + 4; x < hx1; x += 5) B.s(`M${x} ${hb}l.4 ${ht - hb}`, '#5a4430', .7, .6);
    B.f(B.rect(hx1 - 12, ht, 12, hb - ht), '#1a1008', .2).f(B.rect(hx0, ht, 10, hb - ht), '#ffffff', .08);
    B.f(B.circ(hx0 + 30, ht + 15, 7), '#5a4430').f(B.circ(hx0 + 30, ht + 15, 5.6), o.night ? B.rad(hx0 + 30, ht + 15, 6, [[0, '#ffe6a6'], [1, '#e8a85a']]) : '#3e4e52').s(`M${hx0 + 30} ${ht + 9.4}v11.2M${hx0 + 24.4} ${ht + 15}h11.2`, '#5a4430', .9);
    if (!o.night) B.f(B.circ(hx0 + 28, ht + 13, 1.6), '#a8c0c2', .6);
    B.f(B.rect(hx0 + 12, hb - 28, 11, 28), '#3e2c1c').f(B.rect(hx0 + 13, hb - 27, 9, 27), o.night ? '#7a5a34' : '#5a4430').f(B.circ(hx0 + 20, hb - 14, .8), '#e8c45a');
    shingleRoof(B, r, hx0 - 6, hx1 + 6, ht + 2, ht - 30, s, { moss: 3, tone: ['#6e5a44', '#4e3e2e', '#9a8462', '#2e2418'] });
    // the railing round the deck: posts and a top rail, a gap where the ladder comes up
    for (let x = tx - 58; x <= tx + 56; x += 12) if (x < tx - 52 || x > tx - 34) B.post(x, deck - 22, deck - 3, 2.6, plank);
    B.s(`M${tx - 60} ${deck - 21}H${tx - 52}M${tx - 34} ${deck - 21}H${tx + 58}`, plank[0], 2.6).s(`M${tx - 60} ${deck - 22}H${tx - 52}M${tx - 34} ${deck - 22}H${tx + 58}`, plank[2], .8, .7);
    // the rope ladder from the deck's gap down to the roots
    const lx0 = tx - 50, lx1 = tx - 37, lb = -4;
    for (const x of [lx0, lx1]) B.s(`M${x} ${deck - 4}Q${x - 3} ${(deck + lb) / 2} ${x - 1} ${lb}`, '#c8b080', 1.3).s(`M${x} ${deck - 4}Q${x - 3} ${(deck + lb) / 2} ${x - 1} ${lb}`, '#7a6440', .5, .6);
    for (let y = deck + 6; y < lb - 2; y += 9) { const k = Math.sin(Math.PI * (y - deck) / (lb - deck)) * -2.6; B.s(`M${lx0 + k} ${y}H${lx1 + k}`, plank[1], 2.2).s(`M${lx0 + k} ${y - .7}H${lx1 + k}`, plank[2], .7, .7); }
    // leaves in front, over the limbs and the roof's edge, so the house sits inside the tree
    const front = [[tx - 76, -150, 24, 16], [tx + 70, -146, 22, 15], [tx - 30, -214, 24, 15], [tx + 28, -222, 22, 14], [tx - 86, -184, 18, 13], [tx + 82, -182, 18, 12]];
    crown(B, r, front, s, { litX: tx - 20, litY: -200 });
    if (s === 'summer') for (let i = 0; i < 16; i++) B.s(`M${tx - 70 + r() * 140} ${-212 + r() * 70}l${(r() - .5) * 4} 7`, '#f0e2a0', 1.3, .85);
    if (s === 'autumn') for (let i = 0; i < 8; i++) B.f(B.circ(tx - 50 + r() * 100, 2 + r() * 6, 2), '#9ab040');
    B.tufts(r, tx - 44, 3, 20, 8, grass(s), 7).tufts(r, tx + 46, 3, 20, 8, grass(s), 7);
  } };

  /* ---------- the hollow oak: an ancient oak still in full leaf, its bole split open at the foot (the way in), roots over
     the moss, and up the trunk the owl's hole, where the owl sleeps by day and at dusk opens its eyes, blinks and turns
     its head ---------- */
  const OWL = [-6, -104];
  const owlFace = (open) => B => {
    B.f(B.ell(0, 1, 7, 7.6), '#8a6a42').f(B.ell(-2.6, -1, 3.6, 3.4), '#c8a878').f(B.ell(2.6, -1, 3.6, 3.4), '#c8a878');
    B.f('M-6 -6l-1.6 -4.4l3.6 2.6zM6 -6l1.6 -4.4l-3.6 2.6z', '#6a5034');
    if (open) for (const ex of [-2.6, 2.6]) B.f(B.circ(ex, -1, 2.3), '#f2c030').f(B.circ(ex, -1, 1.1), '#120c06').f(B.circ(ex - .5, -1.6, .45), '#fffbe8');
    else for (const ex of [-2.6, 2.6]) B.s(`M${ex - 2} -1q2 1.6 4 0`, '#3a2810', .9);
    B.f('M-1 1.4L0 3.6L1 1.4Z', '#d8a040').f(B.ell(0, 6.4, 4.6, 2.6), '#a8865a', .8);
    for (let i = 0; i < 4; i++) B.s(`M${-2.4 + i * 1.6} 5.6l.4 1.4`, '#5a4430', .5, .7);
  };
  A['ld-hollow'] = { box: [-104, -246, 106, 10], lit: true, lights: [],
    seat: { kind: 'moss', w: 84, front: 18, back: 20, stones: 0, box: [-104, -28, 104, 36], extra(B, r) { roots(B, r, 8, -32, 32, 60, 'summer'); litter(B, r, 74, 20, 34, 'autumn'); } },
    parts: [
      { id: 'owl', box: [-9, -12, 9, 10], at: OWL, draw: (B, o) => owlFace(!!o.night)(B),
        anim(im, t, o) { im.setRotation(o.night ? Math.sin(t * .45) * .22 + (Math.sin(t * .13) > .7 ? .3 : 0) : 0); } },
      { id: 'lids', box: [-9, -12, 9, 10], at: OWL, draw: B => { B.f(B.ell(0, 1, 7, 7.6), '#8a6a42').f(B.ell(-2.6, -1, 3.6, 3.4), '#c8a878').f(B.ell(2.6, -1, 3.6, 3.4), '#c8a878').f('M-6 -6l-1.6 -4.4l3.6 2.6zM6 -6l1.6 -4.4l-3.6 2.6z', '#6a5034'); for (const ex of [-2.6, 2.6]) B.s(`M${ex - 2} -1q2 1.6 4 0`, '#3a2810', .9); B.f('M-1 1.4L0 3.6L1 1.4Z', '#d8a040').f(B.ell(0, 6.4, 4.6, 2.6), '#a8865a', .8); },
        anim(im, t, o) { const p = t % 4.2; im.setAlpha(o.night && (p < .16 || (p > .5 && p < .62)) ? 1 : 0); im.setRotation(o.night ? Math.sin(t * .45) * .22 + (Math.sin(t * .13) > .7 ? .3 : 0) : 0); } },
    ],
    draw(B, o) {
    const r = KIT().rng(751), s = o.season, top = -H * 2.9, bark = ['#6a5a46', '#4a3e30', '#8e7c62', '#2a221a'];
    // the crown behind: broad and low, as an old oak's is, on four great limbs
    const lobes = []; for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); lobes.push([Math.cos(a) * 62 * d, -172 + Math.sin(a) * 40 * d, 28 + r() * 12, 20 + r() * 8]); }
    crown(B, r, lobes, s, { litX: -10 });
    // the buttress roots and the bole, broad and fluted, lit on the west
    for (const [x, d] of [[-38, -1], [-28, -1], [28, 1], [36, 1], [-4, 0]]) B.f(`M${x - 8} 1Q${x + d * 7} -16 ${x + d * 2} -26L${x + 10} -21Q${x + 12 + d * 5} -9 ${x + 13 + d * 12} 2Z`, bark[d < 0 ? 0 : 1]);
    B.f(`M-34 0Q-40 ${top * .4} -26 ${top}H24Q38 ${top * .4} 34 0Z`, bark[0]);
    B.f(`M-34 0Q-40 ${top * .4} -26 ${top}H-12Q-20 ${top * .4} -16 0Z`, bark[2], .65).f(`M14 0Q22 ${top * .4} 12 ${top}H24Q38 ${top * .4} 34 0Z`, bark[1], .8);
    for (let i = 0; i < 13; i++) { const x = -32 + i * 5.2; B.s(`M${x} -2Q${x + (r() - .5) * 6} ${top * .5} ${x * .75 + (r() - .5) * 4} ${top + 2}`, bark[3], .9, .4); }
    for (let i = 0; i < 8; i++) B.f(B.blob(r, -30 + r() * 60, -14 + r() * top, 3 + r() * 3, 1.4, 6, .5), bark[3], .4);
    // the four great limbs into the crown
    for (const [x0, x1, y1, w] of [[-20, -70, -176, 13], [-6, -26, -214, 11], [8, 30, -212, 11], [20, 72, -170, 12]]) B.s(`M${x0} ${top + 6}Q${(x0 + x1) / 2} ${top - 20} ${x1} ${y1}`, bark[0], w).s(`M${x0 - 2} ${top + 6}Q${(x0 + x1) / 2 - 2} ${top - 20} ${x1 - 2} ${y1}`, bark[2], w * .25, .6);
    // the owl's hole up the trunk: a dark oval with a lip of callused bark
    B.f(B.ell(OWL[0], OWL[1], 10, 12), bark[3]).f(B.ell(OWL[0], OWL[1] + 1, 8.4, 10.4), '#120c08').s(B.ell(OWL[0] - .6, OWL[1], 10, 12), bark[2], 1.4, .7);
    // the hollow at the foot: a tall split in the bole, the dark of it, the lit lip, a threshold of roots worn smooth
    B.f(`M-14 0Q-18 -30 -4 -56Q6 -48 10 -30Q12 -12 12 0Z`, bark[3]).f(`M-11 0Q-13 -28 -3 -50Q4 -42 8 -28Q9 -12 9 0Z`, B.lin(0, -50, 0, 0, [[0, '#0e0a06'], [1, '#261a10']]));
    B.s(`M-14 0Q-18 -30 -4 -56`, bark[2], 2.2, .8).s(`M12 0Q12 -12 10 -30`, bark[1], 1.6, .8);
    B.f(B.rr(-12, -2, 24, 3, 1.4), '#8e7c62').f(B.rect(-11, -2, 22, 1), '#b4a284', .8);
    // front leaves over the limbs' ends, so the head of the tree is one mass
    crown(B, r, [[-74, -150, 24, 15], [68, -146, 22, 14], [-30, -214, 22, 14], [32, -214, 22, 14]], s, { litX: -20, litY: -200 });
    mossOn(B, r, -36, top * .3, 22, 8, s); for (let i = 0; i < 6; i++) B.f(B.blob(r, 28 + r() * 6, top * (.2 + r() * .5), 3, 4, 6, .5), s === 'winter' ? '#dfe8e4' : '#6f8446', .8);
    if (s !== 'winter') { ferns(B, r, -34, 2, 18, 4, s); ferns(B, r, 34, 2, 18, 4, s); }
    B.tufts(r, -50, 1, 10, 6, grass(s), 7).tufts(r, 52, 1, 10, 6, grass(s), 7);
  } };

  /* ---------- the warren bank: a long turf bank on the high flats, gorse on its crest, sandy scrapes, burrow mouths with
     their spoil fanned out on the turf below; a rabbit comes out to sit, and another looks out of its hole ---------- */
  const BURROWS = [[-44, -7], [-14, -15], [16, -12], [46, -6]];
  const rabbit = (B, look) => {
    const c = ['#8a7a62', '#6e604c', '#b4a488', '#f2ece0'];
    if (look) { B.f(B.ell(0, -3, 4.4, 3.6), c[0]).f(B.ell(-1.4, -3.8, 2, 1.4), c[2], .7).f(B.ell(-1.6, -8.6, 1.1, 3.6), c[0]).f(B.ell(1.4, -8.4, 1.1, 3.4), c[1]).f(B.ell(-1.6, -8.6, .5, 2.6), '#d8a890', .7).f(B.circ(-1.8, -3.6, .7), '#1a1008').f(B.circ(-4, -2.6, .5), '#3a2a20'); return; }
    B.f(B.ell(1.6, -4, 5.6, 4.4), c[0]).f(B.ell(.4, -5.2, 3.6, 2.4), c[2], .6).f(B.circ(6.6, -3.6, 1.8), c[3]);
    B.f(B.ell(-3.4, -7.6, 3.2, 2.8), c[0]).f(B.ell(-4, -8.4, 1.6, 1.2), c[2], .7);
    B.f(B.ell(-3, -13, 1, 3.6), c[0]).f(B.ell(-1.4, -12.6, 1, 3.4), c[1]).f(B.ell(-3, -13, .45, 2.6), '#d8a890', .7);
    B.f(B.circ(-4.6, -8, .7), '#1a1008').f(B.circ(-6.4, -7.2, .5), '#3a2a20').f(B.ell(-1, -.6, 3, 1), c[1]);
  };
  A['ld-warren'] = { box: [-80, -46, 82, 4],
    seat: { kind: 'turf', w: 128, front: 14, back: 10, stones: 0, way: false, box: [-92, -24, 92, 30], extra(B, r) {
      // the spoil kicked out of each burrow, fanned over the turf below it, sandy and fresh; droppings and a few stones
      for (const [x] of BURROWS) { B.f(B.blob(r, x + 2, 5, 12, 4, 9, .4), '#c4a878', .75).f(B.blob(r, x, 3, 7, 2.4, 8, .4), '#dcc49a', .7); for (let j = 0; j < 5; j++) B.f(B.circ(x - 8 + r() * 18, 6 + r() * 6, .7 + r() * .7), '#8a7a5a', .8); }
      for (let k = 0; k < 6; k++) B.stone(r, -70 + r() * 140, 6 + r() * 8, 2.4 + r() * 2.4, 1.6 + r() * 1.2, STONE, r() < .4 ? '#cfc78a' : null);
    } },
    parts: [
      { id: 'sitter', box: [-9, -18, 10, 2], at: [-28, -4], draw: B => rabbit(B, false),
        anim(im, t, o) { const p = (t * .045) % 1, out = p > .12 && p < .7, k = out ? Math.min(1, (p - .12) / .04, (.7 - p) / .04) : 0; im.setAlpha(k); im.setPosition(o.x - (1 - k) * 6, o.y + (1 - k) * 3); im.setRotation(out && (t % 3.1) < .25 ? -.06 : 0); } },
      { id: 'looker', box: [-6, -14, 6, 1], at: [BURROWS[2][0], BURROWS[2][1] + 1], draw: B => rabbit(B, true),
        anim(im, t, o) { const p = (t * .07 + .5) % 1, k = p < .4 ? Math.min(1, p / .06, (.4 - p) / .06) : 0; im.setAlpha(k); im.setPosition(o.x, o.y + (1 - k) * 5); } },
    ],
    draw(B, o) {
    const r = KIT().rng(761), s = o.season, snowy = s === 'winter', autumn = s === 'autumn', h = H * .95;
    const turf = snowy ? ['#cfd3c8', '#e8ece6', '#a9b4b8'] : autumn ? ['#a69a62', '#c2b47a', '#7a7048'] : ['#8a9a56', '#aab870', '#66743e'];
    // the bank: a long lumpy mound, lit on its west shoulder and along its crest, shaded down its east end
    const crest = []; for (let x = -76; x <= 76; x += 4) crest.push([x, -h * Math.pow(Math.max(0, 1 - Math.pow(x / 78, 2)), .7) * (.8 + .2 * Math.sin(x * .09 + 1)) - 1]);
    // (its foot is a soft, uneven line where the turf runs on into the grass, never a ruler-straight cut)
    const foot = []; for (let x = 78; x >= -78; x -= 6) foot.push([x, 1.2 - Math.abs(Math.sin(x * .21 + 2)) * 2.2]);
    B.f(B.poly([[-78, 1]].concat(crest, foot)), B.lin(-70, -h, 70, 0, [[0, turf[1]], [.45, turf[0]], [1, turf[2]]]));
    for (let x = -76; x < 77; x += 3) B.s(`M${x} 1.4q${(r() - .5) * 2} -3 ${(r() - .5) * 3} ${-4 - r() * 4}`, snowy ? '#c8d0c4' : r() < .5 ? '#7d8f4e' : '#9aa86a', .9, .9);
    B.f(B.poly([[-70, -2]].concat(crest.filter(p => p[0] < 10).map(([x, y]) => [x, y + 2]), [[10, -h * .6]])), '#ffffff', .07);
    for (let i = 0; i < 70; i++) { const x = -70 + r() * 140, top = -h * Math.pow(Math.max(0, 1 - Math.pow(x / 78, 2)), .7) * .8, y = top + r() * (-top); B.s(`M${x} ${y}q${(r() - .5) * 2} -2.4 ${(r() - .5) * 3} -4`, r() < .5 ? turf[0] : turf[2], .8, .7); }
    // sandy scrapes, a few bedded stones, the burrow mouths dark and round-topped with a lip of turf
    for (let k = 0; k < 4; k++) B.f(B.blob(r, -50 + r() * 100, -h * .45 + r() * 10, 6 + r() * 6, 2.4, 8, .4), '#c8ae80', .65);
    for (let k = 0; k < 4; k++) B.stone(r, -56 + r() * 112, -4 - r() * h * .4, 3 + r() * 2.4, 2 + r(), STONE, snowy ? 'snow' : r() < .5 ? '#cfc78a' : null);
    for (const [x, y] of BURROWS) { B.f(`M${x - 7} ${y + 3}Q${x - 7} ${y - 6} ${x} ${y - 7}Q${x + 7} ${y - 6} ${x + 7} ${y + 3}Z`, '#2a2216').f(`M${x - 5} ${y + 3}Q${x - 5} ${y - 4} ${x} ${y - 5}Q${x + 5} ${y - 4} ${x + 5} ${y + 3}Z`, '#120c08'); B.f(B.blob(r, x, y + 3, 8, 1.6, 7, .4), '#c4a878', .9); B.s(`M${x - 8} ${y - 6}Q${x} ${y - 10} ${x + 8} ${y - 6}`, turf[2], 2, .8); }
    // gorse along the crest, dark and spiny, in flower most of the year
    for (const [x, sc] of [[-52, .8], [-30, 1], [6, 1.15], [34, .9], [60, .7]]) {
      const y = -h * Math.pow(Math.max(0, 1 - Math.pow(x / 78, 2)), .7) * .86 + 2;
      for (let k = 0; k < 6; k++) B.f(B.blob(r, x + (r() - .5) * 14 * sc, y - 6 * sc - r() * 6 * sc, 7 * sc, 5 * sc, 8, .6), k < 3 ? '#3e5430' : '#56703c', .95);
      for (let k = 0; k < 14; k++) B.s(`M${x + (r() - .5) * 18 * sc} ${y - r() * 14 * sc}l${(r() - .5) * 3} ${-2 - r() * 2}`, '#2e4026', .6, .8);
      if (!snowy && s !== 'autumn') for (let k = 0; k < 9; k++) B.f(B.circ(x + (r() - .5) * 16 * sc, y - 4 * sc - r() * 10 * sc, 1.1), r() < .7 ? '#f2c63a' : '#f8e07a', .95);
      if (snowy) B.f(B.blob(r, x - 2, y - 12 * sc, 9 * sc, 3, 7, .4), '#f4f6f2', .9);
    }
    if (!snowy) B.tufts(r, -60, 1, 30, 10, grass(s), 5).tufts(r, 62, 1, 26, 9, grass(s), 5);
  } };

  /* ---------- the ring stone: at the heart of the ring of old pears, a standing stone with a ring cut in its face, ribbons
     tied to the iron staple at its top from weddings nobody remembers, windfalls in the grass, a ring of trodden turf ---------- */
  A['ld-ring'] = { box: [-46, -70, 48, 6],
    seat: { kind: 'turf', w: 40, front: 14, back: 12, stones: 0, way: true, box: [-60, -24, 60, 26], extra(B, r) { for (let a = 0; a < Math.PI * 2; a += .2) B.f(B.blob(r, Math.cos(a) * 44, 2 + Math.sin(a) * 14, 6, 2.4, 7, .5), '#9c8a5c', .22); } },
    parts: [{ id: 'ribbons', box: [-3, -2, 16, 22], at: [6, -60], draw(B) { for (const [dx, c, l] of [[0, '#d84a5a', 18], [2, '#3a7ac0', 15], [4, '#f2d04a', 13]]) B.s(`M${dx} 0q4 ${l * .4} ${2 + dx} ${l}`, c, 1.6); }, anim(im, t) { im.setRotation(Math.sin(t * 1.7) * .12 + Math.sin(t * 3.9) * .04); } }],
    draw(B, o) {
    const r = KIT().rng(771), s = o.season, top = -H * 1.45, P = { rock: '#a8a290', rockLo: '#827c6a', rockHi: '#cec8b2', rockDk: '#4e4a3e' };
    // the stone: a tall slab, weathered to a soft outline, lit on its west face, its east edge in shade
    const slab = `M-17 0Q-21 ${top * .5} -14 ${top + 6}Q-8 ${top - 2} 4 ${top}Q14 ${top + 3} 16 ${top * .6}Q20 ${top * .3} 17 0Z`;
    B.f(slab, P.rockLo).f(`M-17 0Q-21 ${top * .5} -14 ${top + 6}Q-8 ${top - 2} 0 ${top}Q-4 ${top * .5} -2 0Z`, P.rock).f(`M-14 ${top * .3}Q-17 ${top * .6} -12 ${top + 8}Q-8 ${top + 3} -4 ${top + 4}Q-8 ${top * .5} -8 ${top * .3}Z`, P.rockHi, .6);
    B.f(`M8 0Q14 ${top * .5} 4 ${top}Q14 ${top + 3} 16 ${top * .6}Q20 ${top * .3} 17 0Z`, P.rockDk, .35);
    for (let i = 0; i < 6; i++) B.s(`M${-12 + r() * 24} ${-4 - r() * 10}l${(r() - .5) * 3} ${-8 - r() * 14}`, P.rockDk, .5, .4);
    // the ring cut in its face, worn smooth by hands, a cup in its middle
    B.s(B.ell(-1, top * .55, 8, 8.6), P.rockDk, 2.4, .7).s(B.ell(-1.6, top * .55 - .6, 8, 8.6), P.rockHi, .8, .6).f(B.ell(-1, top * .55, 2.4, 2.6), P.rockDk, .6);
    // lichen in rosettes, moss at its foot, the iron staple at the top
    for (let i = 0; i < 6; i++) { const x = -12 + r() * 24, y = top + 8 + r() * (-top - 20); B.f(B.blob(r, x, y, 2 + r() * 2.4, 1.4 + r(), 7, .6), r() < .5 ? '#cfc78a' : '#a8b47a', .6); }
    mossOn(B, r, -16, -2, 32, 6, s);
    B.s(`M3 ${top + 2}q3 -4 6 0`, IRON[1], 1.4);
    // the flat offering stone in front with windfall pears on it, flowers and long grass round the foot
    B.f(B.ell(-24, -2, 9, 3.4), P.rockLo).f(B.ell(-24.6, -3, 8, 2.6), P.rock);
    if (s === 'summer' || s === 'autumn') for (const [x, y] of [[-27, -5], [-22, -4.4]]) B.f(B.ell(x, y, 2.2, 2.8), '#b8b03a').f(B.ell(x - .6, y - .8, .8, 1), '#f4f0b0', .7).s(`M${x} ${y - 2.8}l.6 -1.4`, '#5a4430', .6);
    if (s !== 'winter') for (let i = 0; i < 10; i++) { const x = (r() < .5 ? -1 : 1) * (18 + r() * 20); B.s(`M${x} 1v-5`, '#5e8a3e', .6).f(B.circ(x, -5.4, 1.2), ['#f4f0e2', '#e8c84a', '#c86aa0', '#9a7ad0'][i % 4]); }
    if (s === 'winter') B.f(`M-14 ${top + 6}Q-8 ${top - 2} 4 ${top}Q14 ${top + 3} 15 ${top + 8}Q2 ${top + 4} -14 ${top + 6}Z`, '#f4f6f2', .9);
    B.tufts(r, -18, 1, 8, 6, grass(s), 8).tufts(r, 18, 1, 8, 6, grass(s), 8);
  } };

  /* ---------- the orchard wall: a length of old brick wall under a stone coping, two arched bee boles in it with their straw
     skeps, a pear trained flat against the brick between them; bees come and go from the skeps ---------- */
  const BOLES = [[-30, -24], [30, -24]];
  const bees = i => ({ id: 'bees' + i, box: [-10, -8, 10, 6], at: [BOLES[i][0], BOLES[i][1] - 4], draw(B) { for (const [x, y] of [[-5, -2], [3, -4], [6, 2], [-2, 3]]) B.f(B.ell(x, y, 1.2, .8), '#3a2a10').f(B.ell(x - .3, y, .5, .7), '#f2c03a').f(B.ell(x, y - .9, 1, .5), '#ffffff', .6); },
    anim(im, t, o) { const a = t * (1.6 + i * .3) + i * 2; im.setPosition(o.x + Math.cos(a) * 5, o.y + Math.sin(a * 1.7) * 3); im.setRotation(Math.sin(a * .5) * .3); } });
  A['ld-orchard-wall'] = { box: [-64, -72, 66, 6],
    seat: { kind: 'earth', w: 112, front: 14, back: 6 },
    parts: [bees(0), bees(1)],
    draw(B, o) {
    const r = KIT().rng(781), s = o.season, L = leaf(s), top = -H * 1.3, BR = ['#b4623e', '#9a5236', '#c8784e', '#8a4a30', '#a85a3a'];
    // the brickwork in English bond, every brick its own tone, the lime mortar weathered back, light from the west
    B.f(B.rect(-56, top, 112, -top), '#cbbfa4');
    for (let y = -2.6, row = 0; y > top + 1; y -= 3.4, row++) for (let x = -56 - (row & 1) * 3.6; x < 56; ) { const w = row & 1 ? 3.4 : 7.2; const x0 = Math.max(-56, x), x1 = Math.min(56, x + w - .5); if (x1 > x0) B.f(B.rect(x0, y - 2.8, x1 - x0, 2.8), BR[Math.floor(r() * BR.length)], .95); x += w; }
    B.f(B.rect(-56, top, 26, -top), '#ffffff', .07).f(B.rect(34, top, 22, -top), '#2a1810', .16);
    for (let i = 0; i < 5; i++) B.f(B.blob(r, -50 + r() * 100, top + 6 + r() * (-top - 12), 6 + r() * 6, 3 + r() * 3, 7, .5), '#7a8a4a', .35);
    // the coping: dressed stone, overhanging a little, moss and stonecrop along it
    B.f(B.rect(-60, top - 5, 120, 6), '#b0a890').f(B.rect(-60, top - 5, 120, 1.6), '#d8d0b8').f(B.rect(-60, top, 120, 1.4), '#4a4238', .5);
    for (let x = -60; x < 60; x += 12 + r() * 4) B.s(`M${x} ${top - 5}v6`, '#7a7262', .5, .7);
    mossOn(B, r, -56, top - 5, 112, 7, s);
    // the espalier pear between the boles: a trunk and three tiers of arms tied along the brick, leaves and fruit on them
    B.s(`M0 -1V${top + 8}`, '#5a4430', 3);
    for (const y of [-14, -28, -42]) { B.s(`M0 ${y}Q-8 ${y - 2} -16 ${y}M0 ${y}Q8 ${y - 2} 16 ${y}`, '#5a4430', 1.8); if (s !== 'winter') for (let k = 0; k < 8; k++) { const x = -15 + k * 4.2 + (r() - .5); B.f(B.ell(x, y - 2.4, 2.4, 1.4), L[k % 2 ? 1 : 2], .95); } if (s === 'summer' || s === 'autumn') for (const x of [-10, 8]) B.f(B.ell(x, y + 2.4, 2, 2.6), '#b8b03a').f(B.ell(x - .5, y + 1.6, .7, .9), '#f4f0b0', .7); }
    if (s === 'spring') for (let i = 0; i < 14; i++) B.f(B.circ(-15 + r() * 30, -44 + r() * 32, 1.2), '#fdfaf2', .95);
    // the boles: round-headed niches with a stone sill, a straw skep in each, its doorway dark at the foot
    for (const [x, y] of BOLES) {
      B.f(`M${x - 13} ${y + 10}V${y - 8}A13 13 0 0 1 ${x + 13} ${y - 8}V${y + 10}Z`, '#d8ccb0').f(`M${x - 11} ${y + 9}V${y - 8}A11 11 0 0 1 ${x + 11} ${y - 8}V${y + 9}Z`, '#3a2a1e');
      B.f(B.rect(x - 14, y + 9, 28, 3.4), '#c8c0a8').f(B.rect(x - 14, y + 9, 28, 1), '#e8e0c8');
      B.f(`M${x - 9} ${y + 9}Q${x - 10} ${y - 8} ${x} ${y - 11}Q${x + 10} ${y - 8} ${x + 9} ${y + 9}Z`, B.lin(x - 9, 0, x + 9, 0, [[0, '#e8cc7a'], [.5, '#d4b05a'], [1, '#a8843a']]));
      for (let k = 1; k < 6; k++) { const yy = y + 9 - k * 3.6, hw = 9 * Math.sqrt(Math.max(0, 1 - Math.pow((k * 3.6) / 20.5, 2))); B.s(`M${x - hw} ${yy}Q${x} ${yy + 1.2} ${x + hw} ${yy}`, '#9a7a34', .8, .8); }
      B.f(`M${x - 2.6} ${y + 9}V${y + 6}a2.6 2.6 0 0 1 5.2 0V${y + 9}Z`, '#1a1008');
    }
    // a pot of lavender at its foot, the earth dug along the wall, long grass at the ends
    if (s !== 'winter') { B.f('M-50 1L-52 -8H-40L-42 1Z', '#b4683e').f(B.ell(-46, -8, 6, 1.6), '#8a4a2a'); for (let i = 0; i < 9; i++) B.s(`M${-46 + (r() - .5) * 8} -8l${(r() - .5) * 3} ${-5 - r() * 4}`, '#8a7ad0', 1.2); }
    B.tufts(r, -60, 1, 8, 6, grass(s), 7).tufts(r, 60, 1, 8, 6, grass(s), 7);
  } };

  /* ---------- the eel smokehouse: a tarred timber shed under red pantiles, the louvred smoke hood on its ridge breathing a
     thread of oak smoke, the door ajar on the smoke and the glow of the fire, eels hung on the rack, willow eel traps
     stacked by the wall, oak chips in a heap ---------- */
  A['ld-smoke'] = { box: [-80, -156, 82, 6], door: { dx: -12, dy: 0 }, lit: true, lights: [[-12, -24, 70]],
    seat: { kind: 'earth', w: 130, front: 18, extra(B, r) { for (let i = 0; i < 16; i++) B.f(B.ell(40 + r() * 30, 3 + r() * 7, 1.6, .9), '#c8a474', .9); B.f(B.blob(r, -12, 6, 12, 3, 8, .4), '#5a4a34', .25); } },
    parts: smokeParts([0, -146], 4, 44, 12, .16),
    draw(B, o) {
    const r = KIT().rng(791), s = o.season, eaves = -H * 1.8, ridge = -H * 3.05, hw = 60, TAR = ['#3a332e', '#2a2420', '#5a5048', '#18140f'];
    // the footing, the tarred boards (lapped, salt-greyed in streaks, lit on the west), a gable end facing west
    ashlar(B, r, -hw, -8, hw * 2, 8, MOSSY, 4.4);
    B.f(B.rect(-hw, eaves, hw * 2, -eaves - 8), B.lin(-hw, 0, hw, 0, [[0, TAR[2]], [.25, TAR[0]], [1, TAR[1]]]));
    for (let y = -12; y > eaves; y -= 5) B.f(B.rect(-hw, y - 1.2, hw * 2, 1.2), TAR[3], .5).f(B.rect(-hw, y - 5, hw * 2, .8), '#8a8078', .2);
    for (let i = 0; i < 9; i++) B.f(B.rect(-hw + 4 + r() * (hw * 2 - 8), eaves + r() * (-eaves - 30), 2 + r() * 4, 6 + r() * 16), '#9a9088', .16);
    // the pantile roof: red clay in curving courses, darker in the troughs, the ridge tiles, a lichen bloom
    const roofTop = ridge + 10;
    B.f(B.poly([[-hw - 8, eaves + 2], [-hw + 6, roofTop], [hw - 6, roofTop], [hw + 8, eaves + 2]]), '#9a4a2e');
    for (let k = 0; k < 6; k++) { const y = eaves + 2 - (eaves + 2 - roofTop) * k / 6, x0 = -hw - 8 + 14 * k / 6, x1 = hw + 8 - 14 * k / 6; for (let x = x0; x < x1; x += 6) B.f(`M${x} ${y}q3 ${-(eaves - roofTop) / 14} 6 0v${(roofTop - eaves) / 6}q-3 -1.4 -6 0z`, (x / 6 | 0) % 2 ? '#b85a36' : '#a85032', .95).s(`M${x + 6} ${y}v${(roofTop - eaves) / 6}`, '#6a2e1a', .6, .7); }
    B.f(B.poly([[-hw - 8, eaves + 2], [-hw + 6, roofTop], [-hw + 30, roofTop], [-hw + 10, eaves + 2]]), '#ffffff', .08);
    B.f(B.rect(-hw + 6, roofTop - 3, hw * 2 - 12, 4), '#7a3a22').f(B.rect(-hw + 6, roofTop - 3, hw * 2 - 12, 1.2), '#c87a52', .8);
    if (s !== 'winter') for (let i = 0; i < 4; i++) B.f(B.blob(r, -40 + r() * 80, eaves - 6 - r() * 16, 4, 1.6, 6, .5), '#c8b870', .55);
    else B.f(B.poly([[-hw - 4, eaves], [-hw + 8, roofTop + 2], [hw - 8, roofTop + 2], [hw + 4, eaves], [0, eaves - 6]]), '#f4f6f2', .9);
    // the louvred smoke hood on the ridge: a little gabled box with slatted sides, black with soot
    B.f(B.rect(-10, roofTop - 22, 20, 20), '#2a2420'); for (let y = roofTop - 19; y < roofTop - 3; y += 3.4) B.s(`M-9 ${y}h18`, '#6a5e54', 1.2).s(`M-9 ${y + 1.2}h18`, '#0e0a08', .8);
    B.f(B.poly([[-14, roofTop - 21], [0, roofTop - 32], [14, roofTop - 21]]), '#9a4a2e').f(B.poly([[-14, roofTop - 21], [0, roofTop - 32], [0, roofTop - 21]]), '#b85a36');
    // the door ajar: the dark of the smoke inside, the fire's glow at night, a hook with a lantern beside it
    const dh = sz('door', .5), dx = -12;
    B.f(B.rect(dx - 12, -8 - dh, 24, dh), '#140e0a').f(B.rect(dx - 10, -8 - dh * .55, 20, dh * .55), o.night ? B.rad(dx, -12, 20, [[0, '#ffb060'], [.5, '#c8602a'], [1, 'rgba(60,20,10,.2)']]) : 'rgba(80,60,48,.4)');
    B.f(B.poly([[dx + 12, -8 - dh], [dx + 22, -6 - dh], [dx + 22, -6], [dx + 12, -8]]), TAR[2]).s(`M${dx + 12} ${-8 - dh * .7}l10 1.6M${dx + 12} ${-8 - dh * .3}l10 1.6`, '#1a1612', 1.2);
    B.f(B.rect(dx - 14, -8 - dh - 3, 28, 3), '#5a5048');
    // the rack along the east wall: two posts and a pole, the eels hung by their heads, smoked bronze
    for (const x of [28, 56]) B.post(x, -64, 0, 3, ['#7a6a5a', '#4a3e34', '#9a8a78']);
    B.s('M26 -62H58', '#6a5a4a', 2.4);
    for (let k = 0; k < 6; k++) { const x = 31 + k * 4.6, l = 20 + r() * 8; B.s(`M${x} -61q${(r() - .5) * 3} ${l * .5} ${(r() - .5) * 2} ${l}`, k % 2 ? '#8a5a2a' : '#a86a32', 2); B.s(`M${x - .4} -60q${(r() - .5) * 2} ${l * .4} 0 ${l * .8}`, '#e0a860', .5, .6); }
    // willow eel traps stacked on the west, a basket of oak chips, a split block
    const trap = (x, y, l) => { B.f(`M${x} ${y}Q${x + l * .2} ${y - 7} ${x + l * .7} ${y - 4}L${x + l} ${y - 2}L${x + l * .7} ${y + 1}Q${x + l * .2} ${y + 2} ${x} ${y}Z`, '#b8945a'); for (let k = 1; k < 6; k++) B.s(`M${x + l * k / 7} ${y - 5 + k * .3}v${5 - k * .2}`, '#7a5a30', .8); B.s(`M${x} ${y - 3.4}q-2 2 0 3.4`, '#7a5a30', 1); };
    trap(-hw - 18, -2, 28); trap(-hw - 14, -10, 26); trap(-hw - 2, -2, 22);
    B.f(B.ell(66, -4, 8, 4), '#a8844e').f(B.ell(66, -7, 7, 2.4), '#c8a474');
    if (s !== 'winter') mossOn(B, r, -hw, -8, hw * 2, 8, s);
    B.tufts(r, -hw - 4, 1, 10, 7, grass(s), 6).tufts(r, hw + 12, 1, 10, 7, grass(s), 6);
  } };

  /* ---------- the bird hide: a weathered hut on short piles at the edge of the wet, a long viewing slot under its propped
     flap, a turf roof gone to seed, steps up to its door, reeds round its feet; a heron fishes beside it ---------- */
  A['ld-hide'] = { box: [-76, -100, 80, 6], door: { dx: -44, dy: 0 },
    seat: { kind: 'moss', w: 110, front: 14, stones: 0, extra(B, r) { B.f(B.blob(r, 40, 6, 34, 6, 10, .4), '#4e6a5e', .3); for (let i = 0; i < 6; i++) B.s(B.ell(40 + (r() - .5) * 40, 6 + r() * 4, 4 + r() * 3, 1), '#cfe6e4', .5, .5); } },
    parts: [{ id: 'heron', box: [-12, -46, 12, 2], at: [60, 2], draw(B) {
      B.s('M-2 0L-1 -14M2 0L1 -14', '#6a6050', 1);
      B.f('M-6 -14Q-8 -22 -2 -28Q6 -30 8 -22Q8 -14 0 -13Z', '#9aa0a2').f('M-6 -16Q-6 -24 -1 -27Q3 -24 2 -16Z', '#c8ccc8').f('M4 -26Q8 -20 6 -14', '#5a6064', 1.2);
      B.s('M-1 -27Q-6 -34 -2 -38Q1 -41 -2 -44', '#e8eae4', 2.2).f(B.circ(-2, -44, 2.2), '#f2f2ec').s('M-3.4 -45l5 -1.2', '#2a2a2a', 1.2).s('M-2 -44L-10 -43', '#d8a030', 1.4).f(B.circ(-2.8, -44.4, .5), '#1a1a10');
    }, anim(im, t) { const p = t % 9; im.setRotation(p > 6 && p < 7.6 ? -.22 * Math.sin((p - 6) / 1.6 * Math.PI) : 0); } }],
    draw(B, o) {
    const r = KIT().rng(801), s = o.season, floor = -H * .55, roofE = -H * 1.75, TIM = ['#8c826e', '#6c6454', '#b0a68e', '#3e3a30'], turf = s === 'winter' ? ['#8e9684', '#e8ece6'] : s === 'autumn' ? ['#7c8040', '#a49a52'] : ['#5f7c3c', '#86a452'];
    // the piles into the wet, then the hut: vertical boards silvered by weather, lit on the west
    for (const x of [-46, -16, 16, 46]) B.post(x, floor + 2, 0, 4, TIM).f(B.ell(x, 0, 4, 1.4), '#3e3a30', .5);
    B.f(B.rect(-52, roofE + 6, 104, floor - roofE - 4), B.lin(-52, 0, 52, 0, [[0, TIM[2]], [.3, TIM[0]], [1, TIM[1]]]));
    for (let x = -52; x < 52; x += 5) { B.s(`M${x} ${roofE + 6}V${floor + 2}`, TIM[3], .6, .5); if (r() < .4) B.f(B.rect(x + .6, roofE + 8 + r() * 10, 3.8, 10 + r() * 14), r() < .5 ? TIM[2] : TIM[1], .3); }
    B.f(B.rect(-54, floor, 108, 3.4), TIM[1]).f(B.rect(-54, floor, 108, 1), TIM[2]);
    // the viewing slot, long and dark, its flap propped up on two sticks
    const sy = roofE + 22;
    B.f(B.rect(-38, sy, 76, 8), '#120e0a').f(B.rect(-38, sy + 7, 76, 1.6), TIM[2], .8);
    B.f(B.poly([[-40, sy], [40, sy], [44, sy - 9], [-36, sy - 9]]), TIM[0]).f(B.poly([[-40, sy], [40, sy], [41, sy - 2], [-39, sy - 2]]), TIM[3], .5);
    for (const x of [-30, 30]) B.s(`M${x} ${sy + 1}l3 -9`, TIM[3], 1);
    // the turf roof: a heavy lid of sod, its edge ragged, grasses and a few flowers gone to seed on it
    B.f(`M-60 ${roofE + 8}Q-56 ${roofE - 6} -40 ${roofE - 9}H40Q56 ${roofE - 6} 60 ${roofE + 8}Q0 ${roofE + 12} -60 ${roofE + 8}Z`, turf[0]);
    for (let i = 0; i < 16; i++) B.f(B.blob(r, -50 + r() * 100, roofE - 6 + r() * 12, 6 + r() * 6, 2.4, 7, .5), i % 2 ? turf[1] : turf[0], .85);
    for (let x = -58; x < 60; x += 3) B.s(`M${x} ${roofE + 8 + Math.abs(x) * .04}q${(r() - .5) * 3} ${3 + r() * 4} ${(r() - .5) * 3} ${5 + r() * 4}`, turf[r() < .5 ? 0 : 1], .9, .9);
    if (s !== 'winter') for (let i = 0; i < 12; i++) { const x = -48 + r() * 96; B.s(`M${x} ${roofE - 6}q${(r() - .5) * 3} -6 ${(r() - .5) * 4} -10`, '#a8a060', .7, .8); if (r() < .4) B.f(B.circ(x, roofE - 16, 1.2), ['#f4f0e2', '#c86aa0', '#e8c84a'][i % 3]); }
    // the steps up to the door on the west end, the door, a sightings board on a post
    B.f(B.rect(-52, floor - H * .95, 16, H * .95), '#3e3428').f(B.rect(-51, floor - H * .95 + 1, 14, H * .95 - 1), '#7a6a52').f(B.circ(-40, floor - H * .5, .8), '#c8a23a');
    for (let k = 0; k < 3; k++) B.f(B.rect(-58 + k * 3, floor + 4 + k * 6.4, 20 - k * 3, 2.6), TIM[k % 2 ? 1 : 0]).f(B.rect(-58 + k * 3, floor + 4 + k * 6.4, 20 - k * 3, .8), TIM[2], .8);
    B.post(-70, -36, 0, 2.6, TIM).f(B.rr(-78, -46, 16, 12, 1), '#3a4a40').s('M-75 -42h9M-75 -39h6', '#e8ece6', .6, .8).f(B.circ(-66, -39, 1), '#e8c84a');
    // reeds round its feet, in front: stems, leaves and brown heads
    if (s !== 'winter') for (let i = 0; i < 26; i++) { const x = -60 + r() * 130, h = 12 + r() * 14; B.s(`M${x} 2q${(r() - .5) * 4} ${-h * .6} ${(r() - .5) * 5} ${-h}`, i % 3 ? '#6a8a3e' : '#8aa456', 1, .95); if (r() < .35) B.f(B.ell(x + (r() - .5) * 2, -h + 1, 1.2, 3), '#7a5a36'); }
    else for (let i = 0; i < 16; i++) { const x = -60 + r() * 130; B.s(`M${x} 2l${(r() - .5) * 4} ${-10 - r() * 10}`, '#b4a888', .9); }
  } };

  /* ---------- the shepherd's hut: on iron wheels on the high pasture, sage-painted planks under a curved tin roof, a stable
     door at the top of its steps (the way in), a stove pipe breathing a thread of smoke, hurdles leant on the end,
     a lantern by the door at night ---------- */
  A['ld-hut'] = { box: [-70, -138, 72, 6], door: { dx: 15, dy: 0 }, lit: true, lights: [[-12, -62, 70], [30, -66, 50]],
    seat: { kind: 'turf', w: 96, front: 16, extra(B, r) { for (let i = 0; i < 8; i++) B.f(B.ell(-50 + r() * 26, 3 + r() * 5, 1.8, 1), '#c8a474', .85); } },
    parts: smokeParts([-22, -134], 3, 36, 10, .2),
    draw(B, o) {
    const r = KIT().rng(811), s = o.season, snowy = s === 'winter', floor = -H * .78, eaves = -H * 2.05, crown = -H * 2.55, W2 = 46;
    const wall = ['#7e927e', '#5e705e', '#a2b4a0', '#3e4a3e'], roof = ['#7a8a86', '#56625e', '#a8b4b0'], IR = ['#2e2c2a', '#64605a'];
    // the wheels: the far pair dark behind, the near pair spoked iron; the chassis beam
    const wheel = (x, R, far) => { B.s(B.circ(x, -R, R), far ? '#24221f' : IR[0], far ? 2.4 : 3).s(B.circ(x, -R, R - 1.4), IR[1], .7, far ? .3 : .6); for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; B.s(`M${x} ${-R}l${Math.cos(t) * (R - 1)} ${Math.sin(t) * (R - 1)}`, far ? '#24221f' : IR[0], 1.1); } B.f(B.circ(x, -R, 2.4), IR[1]); };
    wheel(-30, 12, true); wheel(32, 12, true);
    B.f(B.rect(-W2 + 2, floor - 2, W2 * 2 - 4, 5), '#3e3428');
    // the body: horizontal planks in sage paint, worn to wood at the corners, lit at the west end
    B.f(B.rect(-W2, eaves, W2 * 2, floor - eaves), B.lin(-W2, 0, W2, 0, [[0, wall[2]], [.3, wall[0]], [1, wall[1]]]));
    for (let y = floor - 5; y > eaves; y -= 5.4) B.f(B.rect(-W2, y - 1, W2 * 2, 1), wall[3], .45);
    for (let i = 0; i < 7; i++) B.f(B.rect(-W2 + r() * (W2 * 2 - 10), eaves + r() * (floor - eaves - 4), 4 + r() * 8, 1.6), '#a8946a', .5);
    // the curved tin roof, its ribs, a little rust, the overhang's shadow along the wall
    B.f(`M${-W2 - 5} ${eaves + 3}Q${-W2 - 4} ${crown - 4} 0 ${crown - 6}Q${W2 + 4} ${crown - 4} ${W2 + 5} ${eaves + 3}Z`, B.lin(0, crown, 0, eaves, [[0, roof[2]], [.6, roof[0]], [1, roof[1]]]));
    for (let x = -W2 + 2; x <= W2 - 2; x += 5.6) B.s(`M${x} ${eaves + 2}Q${x * .96} ${crown - 2 + Math.abs(x) * .1} ${x * .86} ${crown - 5}`, roof[1], .7, .55);
    B.f(B.rect(-W2, eaves + 3, W2 * 2, 3), '#1a1a16', .3);
    if (snowy) B.f(`M${-W2 - 4} ${eaves}Q${-W2 - 3} ${crown - 4} 0 ${crown - 6}Q${W2 + 3} ${crown - 4} ${W2 + 4} ${eaves}Q0 ${eaves - 10} ${-W2 - 4} ${eaves}Z`, '#f4f6f2', .95);
    else B.f(B.blob(r, -18, crown + 4, 9, 2.6, 6, .4), '#a0623a', .35).f(B.blob(r, 24, eaves - 6, 7, 2.2, 6, .4), '#a0623a', .3);
    // the stove pipe through the roof, its cap
    B.f(B.rect(-25, crown - 20, 6, 22), B.lin(-25, 0, -19, 0, [[0, '#7a7e80'], [1, '#2e3234']])).f(B.rect(-27, crown - 23, 10, 3.4), '#2e3234');
    // a window with curtains and a box of geraniums, warm at night
    windowLit(B, -32, eaves + 10, 18, 15, o.night, '#e8e0c8'); B.f(B.rect(-32, eaves + 10, 4, 15), '#c84a4a', .8).f(B.rect(-18, eaves + 10, 4, 15), '#c84a4a', .8);
    B.f(B.rect(-34, eaves + 26, 22, 4), '#6a5034'); if (!snowy) for (let i = 0; i < 6; i++) B.f(B.circ(-32 + i * 3.6, eaves + 25, 1.6), i % 2 ? '#d84a3a' : '#4e7a3a');
    // the stable door (its top half open on the lamplit inside), the steps of plank down to the turf
    const dx = 15, dh = sz('door', .2) * .92, dt = floor - dh;
    B.f(B.rect(dx - 9, dt - 1, 18, dh + 1), '#3e3428').f(B.rect(dx - 8, dt + dh * .48, 16, dh * .52), '#5e705e').s(`M${dx - 8} ${dt + dh * .74}h16`, '#3e4a3e', .7);
    B.f(B.rect(dx - 8, dt, 16, dh * .48), o.night ? B.rad(dx, dt + dh * .3, 12, [[0, '#ffe6a6'], [1, '#c8783a']]) : '#1e1a14');
    B.f(B.poly([[dx + 8, dt], [dx + 15, dt + 2], [dx + 15, dt + dh * .48 + 1], [dx + 8, dt + dh * .48]]), '#7e927e').f(B.circ(dx + 6, dt + dh * .62, .8), '#c8a23a');
    for (let k = 0; k < 4; k++) { const y = floor + 3 + k * (-floor - 3) / 4; B.f(B.rect(dx - 9 - k * .6, y, 18 + k * 1.2, 2.6), k % 2 ? '#8a6a46' : '#a8845a').f(B.rect(dx - 9 - k * .6, y, 18 + k * 1.2, .8), '#c8a474', .8); }
    B.s(`M${dx - 9} ${floor + 2}l-2 ${-floor - 2}M${dx + 9} ${floor + 2}l2 ${-floor - 2}`, '#6a5034', 1.4);
    // the lantern on its hook by the door
    B.s(`M${dx + 18} ${dt + 2}h3v3`, IR[0], .9).f(B.rr(dx + 18.4, dt + 5, 5.2, 7, 1), IR[0]).f(B.rr(dx + 19.2, dt + 5.8, 3.6, 5.2, .6), o.night ? '#ffe08a' : '#8aa4a6');
    // the near wheels over the body's foot, hurdles leant on the west end, logs under it, a bucket
    wheel(-26, 13, false); wheel(28, 13, false);
    // (one hurdle leant at the west end, plainly leaning: two upright ones read as a fence run into the wheels, hunter, round 3)
    { const x0 = -W2 - 13; B.f(B.poly([[x0 - 2, 0], [x0 + 16, 0], [x0 + 21, -30], [x0 + 3, -32]]), '#2e2a20', .12); for (const t of [.22, .55, .85]) B.s(`M${x0 + 1 + t * 3} ${-t * 32}l17 ${1 - t * 2}`, '#a8845a', 1.5); for (let i = 0; i < 4; i++) B.s(`M${x0 + i * 5} 0l${5 - i * .4} -31`, '#8a6a46', 1.7); }
    for (let k = 0; k < 6; k++) { const x = -16 + (k % 3) * 6 + (k > 2 ? 3 : 0), y = -3 - (k > 2 ? 5.4 : 0); B.f(B.circ(x, y, 3), '#8a6440').f(B.circ(x, y, 1.8), '#c49a66'); }
    // (no bucket out past its east wheel: what stands must stand on its own block, round 3 audit)
    if (!snowy) B.tufts(r, -60, 1, 16, 8, grass(s), 6).tufts(r, 62, 1, 12, 7, grass(s), 6);
  } };

  /* ---------- the small things a player sets out, merged into a little place of their own (19 Nov, round 3: the worm bin,
     the seed swap shelf, the boots, the jam kettle, the skeps and the scarecrow had stood alone on the grass) ---------- */
  // a butterfly that drifts about a thing and settles now and then
  const butterfly = (at, seed, cols) => ({ id: 'fly' + seed, box: [-4, -3, 4, 3], at, draw(B) { B.f('M0 0Q-4 -4 -3.4 -.4Q-4 2.4 0 0Z', cols[0]).f('M0 0Q4 -4 3.4 -.4Q4 2.4 0 0Z', cols[1]).s('M0 -1.4v2.6', '#2a2016', .6); },
    anim(im, t, o) { const p = t * .35 + seed, rest = Math.sin(p * .7) > .6; im.setPosition(o.x + (rest ? 0 : Math.sin(p * 1.3) * 12 + Math.sin(p * 3.1) * 3), o.y + (rest ? 0 : Math.cos(p * 1.1) * 6 - 4)); im.setAlpha(o.night ? 0 : 1); im.setRotation(rest ? 0 : Math.sin(t * 14) * .25); } });
  const robin = (at, seed) => ({ id: 'robin', box: [-6, -9, 6, 1], at, draw(B) { B.f(B.ell(0, -4, 4, 3.4), '#7a5a3a').f(B.ell(-1.2, -3.4, 2.4, 2.4), '#e0602a').f(B.circ(-2.6, -6.4, 2), '#7a5a3a').f(B.ell(-3, -5.6, 1.4, 1.2), '#e0602a').f(B.circ(-3.2, -7, .5), '#1a1008').s('M-4.6 -6.6l-1.6 .4', '#3a2a1a', .7).s('M3.4 -3.4l3 -1.4', '#5a4028', 1.2).s('M0 -.8v1.6M1.4 -.8v1.6', '#5a4028', .5); },
    anim(im, t, o) { const p = (t * .06 + seed) % 1, here = p > .2 && p < .75, hop = here && (t % 2.3) < .2 ? -2 : 0; im.setAlpha(here && !o.night ? Math.min(1, (p - .2) / .02, (.75 - p) / .02) : 0); im.setPosition(o.x, o.y + hop); im.setRotation(here && (t % 3.7) < .4 ? .25 : 0); } });

  /* the worm bin: a compost corner of slatted oak bays, the worm bin with its lid propped, a heap of dark compost with a fork
     in it, peelings, a sack and a can; a robin comes to the fork */
  A['lf-worms'] = { box: [-46, -50, 48, 6], seat: { kind: 'earth', w: 62, front: 14, way: false, box: [-60, -20, 60, 24], extra(B, r) { for (let i = 0; i < 14; i++) B.f(B.ell(-40 + r() * 80, 3 + r() * 8, 1.6, .8), ['#3a2a1a', '#6a8a3a', '#c8a050'][i % 3], .7); } },
    parts: [robin([10, -44], .3)],
    draw(B, o) {
    const r = KIT().rng(821), s = o.season, OAKS = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'];
    // the back boards and the two bays, slats with gaps, lit on the west
    for (const [x0, x1] of [[-40, -2], [2, 40]]) { for (let y = -4; y > -34; y -= 6) B.f(B.rect(x0, y - 4.4, x1 - x0, 4.4), y % 12 ? OAKS[0] : OAKS[1]).f(B.rect(x0, y - 4.4, x1 - x0, 1), OAKS[2], .6); for (const x of [x0, x1]) B.post(x, -38, 0, 3.4, OAKS); }
    B.f(B.rect(-40, -38, 20, 38), '#ffffff', .06).f(B.rect(26, -38, 14, 38), '#1a1008', .16);
    // the heap in the west bay, dark and crumbly, peelings on top, the fork stood in it
    B.f('M-38 -18Q-30 -34 -20 -32Q-8 -34 -4 -18Z', '#3a2a1a').f('M-34 -22Q-28 -31 -20 -30Q-12 -31 -8 -22Z', '#5a4028', .8);
    for (let i = 0; i < 10; i++) B.f(B.ell(-32 + r() * 24, -24 - r() * 8, 1.6, .8), ['#c8a050', '#6a8a3a', '#e0602a', '#e8d8b0'][i % 4], .9);
    B.s('M-14 -26L10 -46', '#8a6a46', 1.8).s('M-14 -26l-3 6M-14 -26l-1 7M-14 -26l1.4 6.6', '#8a949a', .9).s('M9 -45l3 -2', '#5a4028', 2.4);
    // the worm bin in the east bay: a lid on hinges propped open, the dark of the bedding, a lit edge
    B.f(B.rect(4, -24, 34, 22), '#2a1e14').f(B.rect(6, -22, 30, 4), '#4a3626');
    B.f(B.poly([[4, -24], [38, -24], [40, -40], [6, -42]]), OAKS[1]).f(B.poly([[4, -24], [38, -24], [38.6, -26], [4.4, -26]]), OAKS[3], .5).s('M12 -24l2 -16', OAKS[3], .8);
    for (let i = 0; i < 4; i++) B.s(`M${10 + i * 7} -20q2 -1.4 4 0`, '#c87a6a', 1, .9);
    // a sack of leaf mould and a watering can at the foot
    B.f('M-46 1Q-48 -10 -42 -14Q-36 -15 -34 -10Q-32 -2 -36 1Z', '#b49a6a').s('M-44 -12q4 -2 8 0', '#7a6440', .8);
    B.f('M40 1L39 -9H48L47 1Z', B.lin(39, 0, 48, 0, [[0, '#9aa8ac'], [1, '#4e5a5e']])).s('M47 -7l6 -6', '#5e6a6e', 1.6).s('M41 -9q3 -6 6 0', '#5e6a6e', .8);
    if (s !== 'winter') { ferns(B, r, -2, 1, 6, 2, s); for (let i = 0; i < 4; i++) B.f(B.circ(-24 + r() * 8, -1 - r() * 2, 1), '#e8c84a'); }
    B.tufts(r, -42, 1, 6, 5, grass(s), 6).tufts(r, 44, 1, 6, 5, grass(s), 6);
  } };

  /* the seed swap shelf: a little dresser with a shingled hood on a stone foot, its shelves of tins, packets and jars, a slate
     that says what it is for, a basket of seed heads and a stool; a note pinned to it lifts in the wind */
  A['lf-swap'] = { box: [-40, -90, 42, 6], seat: { kind: 'flags', w: 50, front: 14, way: true },
    parts: [{ id: 'note', box: [-1, -1, 9, 9], at: [15, -60], draw(B) { B.f(B.rect(0, 0, 8, 8.6), '#f6efdc').s('M1.4 2.4h5M1.4 4.4h4M1.4 6.4h5', '#8e887c', .5).f(B.circ(4, .8, .7), '#c84a3a'); }, anim(im, t) { im.setRotation(Math.sin(t * 2.3) * .14 + Math.sin(t * 5.1) * .05); } }, butterfly([-24, -30], 2, ['#f2c63a', '#e8a838'])],
    draw(B, o) {
    const r = KIT().rng(831), s = o.season, OAKS = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], top = -H * 1.75;
    B.f(B.rr(-22, -6, 44, 7, 1.4), STONE.rockLo).f(B.rect(-22, -6, 44, 1.8), STONE.rockHi);
    for (const x of [-18, 18]) B.post(x, top + 10, -6, 4, OAKS);
    // the back and the shelves, lit from the west, three rows of what people left
    B.f(B.rect(-18, top + 10, 36, -top - 18), '#5a4430');
    for (let k = 0; k < 3; k++) {
      const y = top + 26 + k * 13; B.f(B.rect(-19, y, 38, 2.4), OAKS[0]).f(B.rect(-19, y, 38, .8), OAKS[2], .8);
      for (let i = 0; i < 6; i++) { const x = -16 + i * 5.6, c = ['#e8c84a', '#c84a3a', '#5a8ac0', '#6a9a4a', '#e8a8c0', '#f2ece0'][(i + k * 2) % 6]; if ((i + k) % 3 === 0) B.f(B.rr(x - 2, y - 8, 4.4, 8, 1), '#c8d4d6').f(B.rect(x - 2.2, y - 9.4, 4.8, 2), '#8a6a46').f(B.rect(x - 1.4, y - 6, 3, 4), c, .8); else B.f(B.rect(x - 2, y - 7.6, 4.2, 7.6), c).f(B.rect(x - 2, y - 7.6, 4.2, 1.6), '#ffffff', .4).s(`M${x - 1} ${y - 4}h2.4`, '#3a2a1a', .4, .6); }
    }
    // the hood, the slate under it, the pinned note's place
    shingleRoof(B, r, -26, 26, top + 10, top - 8, s, { moss: 2 });
    B.f(B.rr(-15, top + 12, 30, 9, 1), '#3a4440').text('Swap seeds', 0, top + 16.6, 4.6, '#e8ece6');
    // a stool beside it with a basket of seed heads, poppies and honesty
    B.f(B.ell(-32, -12, 7, 2.4), OAKS[2]).s('M-37 -11l-2 11M-27 -11l2 11M-32 -11v11', OAKS[1], 1.4);
    B.f(B.ell(-32, -15, 6, 3.4), '#a8844e'); for (let i = 0; i < 6; i++) B.s(`M${-34 + i * 1.2} -16l${(r() - .5) * 4} -8`, '#8a7a50', .6).f(B.circ(-35 + i * 1.6 + (r() - .5) * 2, -24 - r() * 2, 1.3), i % 2 ? '#a89a6a' : '#d8d0b8');
    if (s !== 'winter') for (let i = 0; i < 6; i++) B.f(B.circ(24 + r() * 10, -2 - r() * 6, 1.3), ['#d84a3a', '#f4f0e2', '#9a7ad0'][i % 3]);
    B.tufts(r, -26, 1, 6, 5, grass(s), 6).tufts(r, 30, 1, 6, 5, grass(s), 6);
  } };

  /* the stout boots: on a coir mat by an oak bench, a boot scraper let into a stone, a stick leant on the bench, a pair of
     socks drying on its back */
  A['lf-boots'] = { box: [-40, -40, 42, 6], seat: { kind: 'flags', w: 56, front: 12, way: false, extra(B, r) { B.f(B.rr(-6, 0, 24, 9, 1.4), '#b8945a').f(B.rr(-4, 1.4, 20, 6, 1), '#c8a46a'); for (let i = 0; i < 8; i++) B.f(B.circ(-20 + r() * 50, 4 + r() * 8, .8), '#5a4430', .6); } },
    parts: [butterfly([-18, -26], 5, ['#f4f0e2', '#e8e4d8'])],
    draw(B, o) {
    const r = KIT().rng(841), s = o.season, OAKB = ['#a07a52', '#7e5e3c', '#c8a070', '#4a3624'], seat = -H * .3;
    // the bench: two legs, a seat plank and a back rail with socks pegged over it
    for (const x of [-34, -6]) B.post(x, seat + 2, 0, 3, OAKB);
    B.f(B.rect(-38, seat - 3, 36, 4), OAKB[0]).f(B.rect(-38, seat - 3, 36, 1.2), OAKB[2]);
    for (const x of [-36, -4]) B.post(x, seat - 18, seat - 2, 2.4, OAKB);
    B.f(B.rect(-38, seat - 19, 36, 3), OAKB[0]).f(B.rect(-38, seat - 19, 36, 1), OAKB[2], .8);
    for (const [x, c] of [[-30, '#c84a3a'], [-22, '#c84a3a']]) B.f(`M${x} ${seat - 17}h5v10q0 3 -3 3h-4v-3h2z`, c).f(B.rect(x, seat - 17, 5, 2), '#f2ece0');
    B.s('M-2 0L-12 -34', '#6a4a2a', 1.6).f(B.circ(-12, -35, 1.6), '#6a4a2a');
    // the boots: brown leather, laced, mud on the soles, one stood and one fallen on its side
    const boot = (x, y) => { B.f(`M${x} ${y}V${y - 13}H${x + 7}V${y - 5}Q${x + 13} ${y - 5} ${x + 13} ${y}Z`, '#6a4428').f(`M${x + .8} ${y - 12}H${x + 3}V${y - 2}H${x + .8}Z`, '#8e6440', .8).f(B.rect(x - .4, y - 1.6, 14, 2), '#2a1a10'); for (let k = 0; k < 4; k++) B.s(`M${x + 2} ${y - 11 + k * 2.4}l4 .6`, '#e8dcc0', .5); };
    boot(0, 1); boot(10, 2);
    // the scraper: an iron blade between two scrolls, set in a block of stone
    B.f(B.rr(26, -6, 14, 7, 1.4), STONE.rockLo).f(B.rect(26, -6, 14, 1.8), STONE.rockHi).s('M29 -6V-13M37 -6V-13M29 -10H37', IRON[0], 1.4).f(B.circ(29, -13.6, 1.2), IRON[0]).f(B.circ(37, -13.6, 1.2), IRON[0]);
    if (s !== 'winter') for (let i = 0; i < 5; i++) B.f(B.circ(-40 + r() * 6, -1 - r() * 4, 1.1), ['#f4f0e2', '#e8c84a'][i % 2]);
    B.tufts(r, -40, 1, 6, 5, grass(s), 6).tufts(r, 42, 1, 6, 5, grass(s), 6);
  } };

  /* the jam kettle: a copper preserving pan on a little open hearth of bricks, the fire under it, steam rising; a trestle
     beside it with jars of jam cooling, a ladle, a basket of fruit; logs for the fire */
  A['lf-kettle'] = { box: [-46, -56, 50, 6], lit: true, lights: [[-14, -10, 60]], seat: { kind: 'flags', w: 66, front: 14, way: false, extra(B, r) { for (let i = 0; i < 10; i++) B.f(B.ell(-34 + r() * 20, 4 + r() * 6, 1.4, .7), '#3a3a34', .5); } },
    parts: [...smokeParts([-14, -40], 3, 30, 4, .3), { id: 'fire', box: [-7, -8, 7, 1], at: [-14, -10], draw(B) { B.f('M-5 0Q-6 -5 -2 -7Q-1 -4 0 -6Q2 -3 3 -7Q6 -4 5 0Z', '#ffd060').f('M-3 0Q-3 -3 -1 -4Q0 -2 1 -4Q3 -2 3 0Z', '#fff4c0'); }, anim(im, t) { im.setAlpha(.7 + Math.sin(t * 9) * .15 + Math.sin(t * 23) * .1); } }],
    draw(B, o) {
    const r = KIT().rng(851), s = o.season, BR = ['#b4623e', '#9a5236', '#c8784e', '#8a4a30'];
    // the hearth: a horseshoe of bricks, the fire's mouth dark and glowing, the pan on its iron trivet
    B.f(B.rr(-34, -18, 40, 18, 2), '#6a3a26');
    for (let y = -2; y > -18; y -= 4) for (let x = -34 + (y % 8 ? 0 : 3); x < 6; x += 7) B.f(B.rect(x + .3, y - 3.4, 6.4, 3.2), BR[Math.floor(r() * 4)], .95);
    B.f(`M-22 0V-9Q-14 -15 -6 -9V0Z`, '#1a0e08').f(`M-21 0V-8Q-14 -13 -7 -8V0Z`, o.night ? B.rad(-14, -4, 9, [[0, '#ffd070'], [1, '#a83a14']]) : B.rad(-14, -4, 9, [[0, '#e8743a'], [1, '#3a1608']]));
    B.f(B.rect(-35, -20, 42, 3), '#8a8478').f(B.rect(-35, -20, 42, 1), '#b4ac98');
    B.f('M-28 -21Q-28 -32 -14 -32Q0 -32 0 -21Z', B.lin(-28, 0, 0, 0, [[0, '#f0a060'], [.4, '#c8683a'], [1, '#7a3a1a']])).f(B.ell(-14, -32, 14, 3), '#7a3a1a').f(B.ell(-14, -32, 12, 2.2), '#8a1a2a').f(B.ell(-17, -32.6, 5, .8), '#d8505a', .7);
    B.s('M0 -28h8', '#6a3a1a', 1.8).s('M-27 -30q-2 -8 13 -10q15 2 13 10', '#5a4a3a', .9, .7);
    // the trestle with the jars cooling on it, gingham tops, a ladle, a basket of plums and strawberries
    for (const x of [12, 40]) B.s(`M${x - 4} 0L${x + 4} -20M${x + 4} 0L${x - 4} -20`, '#7a5e40', 1.6);
    B.f(B.rect(8, -22, 38, 3.4), '#c4a478').f(B.rect(8, -22, 38, 1), '#e4caa0');
    for (let i = 0; i < 5; i++) { const x = 13 + i * 7; B.f(B.rr(x - 2.6, -30, 5.2, 8, 1), i % 2 ? '#a82a3a' : '#c8402a').f(B.rect(x - 3, -31.6, 6, 2.2), i % 2 ? '#f2ece0' : '#c84a3a').f(B.rect(x - 1.6, -28.6, 1, 4.6), '#ffffff', .35); }
    B.s('M44 -24l-4 -10', '#9aa4a8', 1.2).f(B.ell(39, -35, 2.4, 1.6), '#9aa4a8');
    B.f(B.ell(30, -3, 9, 4.4), '#a8844e').s('M21 -4q9 3 18 0', '#7a5a30', .8); for (let i = 0; i < 8; i++) B.f(B.circ(24 + r() * 12, -6 - r() * 3, 1.8), i % 2 ? '#6a2a5a' : '#d8342a');
    // logs for the fire stacked on the west
    for (const [x, y] of [[-40, -3], [-34, -3], [-37, -8]]) B.f(B.circ(x, y, 3), '#8a6440').f(B.circ(x, y, 1.8), '#c49a66');
    B.tufts(r, -44, 1, 6, 5, grass(s), 6).tufts(r, 48, 1, 6, 5, grass(s), 6);
  } };

  /* the bee skeps: three straw skeps on an oak bee bench under a little thatched hackle, lavender and foxgloves round it,
     a smoker on the stool; bees come and go */
  A['lf-skeps'] = { box: [-40, -62, 42, 6], seat: { kind: 'earth', w: 56, front: 14, way: false },
    parts: [Object.assign(bees(0), { at: [-14, -30] }), Object.assign(bees(1), { at: [16, -32] })],
    draw(B, o) {
    const r = KIT().rng(861), s = o.season, L = leaf(s), OAKS = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'];
    // the bench on its four legs
    for (const x of [-28, -10, 10, 28]) B.post(x, -14, 0, 3, OAKS);
    B.f(B.rect(-32, -17, 64, 4), OAKS[0]).f(B.rect(-32, -17, 64, 1.2), OAKS[2]);
    // the skeps: coiled straw, each with its little door, a stone on top of the middle one
    const skep = (x, w, h) => { B.f(`M${x - w} -17Q${x - w - 1} ${-17 - h * .8} ${x} ${-17 - h}Q${x + w + 1} ${-17 - h * .8} ${x + w} -17Z`, B.lin(x - w, 0, x + w, 0, [[0, '#ecd080'], [.5, '#d4b05a'], [1, '#a8843a']])); for (let k = 1; k < 6; k++) { const yy = -17 - k * h / 6, hw = w * Math.sqrt(Math.max(0, 1 - Math.pow(k / 6, 2))) + .6; B.s(`M${x - hw} ${yy}Q${x} ${yy + 1.4} ${x + hw} ${yy}`, '#9a7a34', .8, .8); } B.f(`M${x - 2.4} -17V-20a2.4 2.4 0 0 1 4.8 0V-17Z`, '#1a1008'); };
    skep(-18, 10, 20); skep(2, 11, 23); skep(22, 9.6, 19);
    B.f(B.blob(r, 2, -41, 4.4, 2.2, 6, .3), STONE.rockLo).f(B.blob(r, 1, -42, 2.6, 1.2, 6, .3), STONE.rockHi);
    // the hackle: a little thatched lid over the bench on two posts
    for (const x of [-34, 34]) B.post(x, -50, 0, 2.6, OAKS);
    B.f('M-40 -46Q-36 -58 0 -60Q36 -58 40 -46Q0 -42 -40 -46Z', '#b89a56');
    for (let i = 0; i < 40; i++) { const x = -38 + r() * 76; B.s(`M${x} ${-56 + Math.abs(x) * .2}l${(r() - .5) * 2} ${4 + r() * 4}`, r() < .5 ? '#8a7034' : '#d4b870', .7, .9); }
    // lavender and foxgloves round its feet (in front of the legs)
    if (s !== 'winter') { for (let i = 0; i < 12; i++) { const x = -38 + r() * 20; B.s(`M${x} 1l${(r() - .5) * 3} ${-7 - r() * 5}`, '#7a8a6a', .8).f(B.ell(x + (r() - .5) * 2, -9 - r() * 3, .9, 2.4), '#8a7ad0'); } for (const x of [30, 36]) { B.s(`M${x} 1v-20`, L[0], 1.2); for (let k = 0; k < 6; k++) B.f(B.ell(x + 1.4, -6 - k * 2.4, 1.4, 1.1), '#c86aa0'); } }
    B.tufts(r, -40, 1, 6, 5, grass(s), 6).tufts(r, 42, 1, 6, 5, grass(s), 6);
  } };

  /* the scarecrow: on his pole in a small bed of cabbages and beans on canes, straw hat, a patched coat and a scarf that
     lifts in the wind, a crow on his arm that he does not frighten at all */
  A['lf-scarecrow'] = { box: [-46, -96, 48, 6], seat: { kind: 'earth', w: 70, front: 16, stones: 0, way: false, extra(B, r) { for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) B.f(B.blob(r, -36 + i * 14 + (row & 1) * 6, -4 + row * 6, 5, 1.6, 7, .4), '#5a4430', .35); } },
    parts: [
      { id: 'scarf', box: [-1, -3, 14, 6], at: [3, -64], draw(B) { B.f('M0 -2L13 0L12 3L0 2Z', '#c84a3a').s('M3 -1.6v4M7 -1v3.6M10 -.6v3', '#f2d04a', .8); }, anim(im, t) { im.setRotation(Math.sin(t * 2.6) * .18 + .1); } },
      { id: 'crow', box: [-6, -10, 7, 1], at: [24, -60], draw(B) { B.f(B.ell(0, -4, 5, 3.4), '#1e2226').f(B.circ(-4, -7, 2.4), '#1e2226').f(B.poly([[-6, -7.4], [-9.4, -6.6], [-6, -6]]), '#3a3e40').f(B.circ(-4.6, -7.6, .5), '#c8c8c0').f(B.poly([[4, -5], [8, -2], [4, -2.4]]), '#16181a').s('M-1 -1v2M1 -1v2', '#3a3e40', .6); },
        anim(im, t) { const p = t % 6.3; im.setRotation(p < .4 ? -.3 : p > 3 && p < 3.3 ? .2 : 0); } },
    ],
    draw(B, o) {
    const r = KIT().rng(871), s = o.season, L = leaf(s), top = -H * 1.6;
    // beans on canes behind him, cabbages in rows in front of him
    if (s !== 'winter') for (const x of [-38, -26, 28, 40]) { B.s(`M${x} 0L${x + (x < 0 ? 4 : -4)} -40`, '#a8905a', 1); for (let k = 0; k < 7; k++) B.f(B.ell(x + (x < 0 ? 4 : -4) * k / 7 + (r() - .5) * 4, -4 - k * 5.4, 2.4, 1.6), L[k % 2 ? 1 : 2], .95); if (s === 'summer') B.f(B.circ(x, -20, 1.2), '#d84a3a'); }
    // the pole and the cross piece, the patched coat on it, the stuffed head under a straw hat
    B.post(0, top, 0, 3.4, ['#8a6a46', '#6a5034', '#b08c5e']);
    B.s(`M-24 ${top + 24}H24`, '#8a6a46', 3);
    B.f(`M-24 ${top + 20}L-6 ${top + 18}L-8 ${top + 50}L8 ${top + 50}L6 ${top + 18}L24 ${top + 20}L24 ${top + 28}L8 ${top + 28}L10 ${top + 56}L-10 ${top + 56}L-8 ${top + 28}L-24 ${top + 28}Z`, '#4e6a8a');
    B.f(B.rect(-6, top + 30, 7, 7), '#c8a04a', .9).f(B.rect(10, top + 21, 6, 5), '#a84a3a', .9).s(`M-2 ${top + 32}h3M-2 ${top + 34.6}h3`, '#3a2a1a', .5);
    for (const x of [-25, 25]) for (let k = 0; k < 4; k++) B.s(`M${x} ${top + 22 + k * 2}l${x < 0 ? -4 : 4} ${1 + r() * 2}`, '#e0c060', .9);
    for (let k = 0; k < 5; k++) B.s(`M${-8 + k * 4} ${top + 56}l${(r() - .5) * 3} 5`, '#e0c060', .9);
    B.f(B.ell(0, top + 10, 7, 8), '#e8d8b0').f(B.ell(-1, top + 9, 5, 6), '#f4e8c8', .7).f(B.circ(-2.6, top + 9, .9), '#2a1a10').f(B.circ(2.6, top + 9, .9), '#2a1a10').s(`M-3 ${top + 13}q3 2 6 0`, '#8a5a3a', .7);
    B.f(B.ell(0, top + 3, 13, 3), '#d4b05a').f(`M-7 ${top + 3}Q-7 ${top - 7} 0 ${top - 8}Q7 ${top - 7} 7 ${top + 3}Z`, '#e0c060').f(B.rect(-7, top, 14, 2.4), '#c84a3a');
    // cabbages in the bed in front
    if (s !== 'winter') for (const x of [-30, -14, 14, 30]) { B.f(B.ell(x, -3, 6, 4), '#6a9a4a').f(B.ell(x - 1, -4, 4, 2.6), '#9ac46a').s(`M${x - 4} -3q4 -4 8 0`, '#4e7a3a', .6); }
    B.tufts(r, -44, 1, 6, 5, grass(s), 6).tufts(r, 46, 1, 6, 5, grass(s), 6);
  } };

  /* ---------- small lives for the sights painted in earlier rounds (7b): each its own, gentle, only on screen ---------- */
  // a gull standing on a ridge or a gunwale, turning its head now and then
  const gullStand = at => ({ id: 'gull', box: [-8, -12, 8, 1], at, draw(B) { B.f(B.ell(0, -5, 6, 3.6), '#f4f4f0').f(B.ell(2, -5.6, 4.6, 2.4), '#9aa4aa').f(B.circ(-4.4, -8.4, 2.6), '#f8f8f4').f(B.poly([[-6.6, -8.4], [-10, -7.8], [-6.6, -7.4]]), '#e8b030').f(B.circ(-5, -9, .55), '#1a1a18').f(B.poly([[5, -6], [9, -4.6], [5, -4]]), '#2a2e30').s('M-1 -1.6v2M1.4 -1.6v2', '#d89a40', .7); },
    anim(im, t, o) { const p = t % 5.2; im.setAlpha(o.night ? 0 : 1); im.setRotation(p < .6 ? -.12 : p > 2.6 && p < 3 ? .1 : 0); } });
  // a bird in flight on a wide loop round a point (a gull, a swallow); day only
  const flyer = (id, at, rx, ry, rate, cols, size) => ({ id, box: [-9, -5, 9, 4], at, draw(B) { const k = size || 1; B.s(`M${-8 * k} ${-1 * k}Q${-4 * k} ${-4 * k} 0 0Q${4 * k} ${-4 * k} ${8 * k} ${-1 * k}`, cols[0], 1.6 * k).f(B.ell(0, 0, 2.2 * k, 1.3 * k), cols[1]); },
    anim(im, t, o) { const a = t * rate; im.setPosition(o.x + Math.cos(a) * rx, o.y + Math.sin(a) * ry + Math.sin(a * 3) * 2); im.setRotation(Math.cos(a) * .2); im.setAlpha(o.night ? 0 : .95); } });
  const sparkle = (at, w) => ({ id: 'sparkle', box: [-w, -3, w, 3], at, draw(B) { for (const [x, y] of [[-w * .6, 0], [-w * .1, -1.4], [w * .5, .6]]) B.s(`M${x - 2} ${y}h4M${x} ${y - 1.4}v2.8`, '#ffffff', .7, .9); }, anim(im, t) { im.setAlpha(Math.max(0, Math.sin(t * 2.4)) * .8); } });
  const addLife = (id, parts) => { const a = A[id]; if (a) a.parts = (a.parts || []).concat(parts); };
  addLife('ld-woodhut', smokeParts([-46, -140], 3, 36, 10, .18));
  addLife('ld-boathouse', [gullStand([16, -H * 3.45 + 10])]);
  addLife('ld-lighthouse', [flyer('gull-fly', [0, -236], 46, 14, .5, ['#f4f4f0', '#dde2e4'], 1.1)]);
  addLife('ld-hull', [gullStand([-6, -40])]);
  addLife('ld-barn', [flyer('swallow', [10, -120], 60, 22, .9, ['#1e2a3a', '#c86a3a'], .7)]);
  addLife('ld-chapel', [flyer('jackdaw', [0, -180], 54, 16, .4, ['#1e2226', '#2a2e30'], .8)]);
  addLife('notice-board', [{ id: 'note', box: [-1, -1, 11, 11], at: [22, -46], draw(B) { B.f(B.rect(0, 0, 10, 10.6), '#f6efdc').s('M1.6 3h6.4M1.6 5.4h5M1.6 7.8h6', '#8e887c', .6).f(B.circ(5, 1, .9), '#3a7ac0'); }, anim(im, t) { im.setRotation(Math.sin(t * 2.1) * .12 + Math.sin(t * 4.7) * .04); } }]);
  addLife('lf-fountain', [sparkle([-6, -H * .5 - 2], 24)]);
  addLife('market-stall', [butterfly([-2, -24], 7, ['#f4f0e2', '#c8d8f0'])]);
  addLife('ld-wish', [butterfly([-26, -20], 9, ['#e86a2a', '#f2a03a'])]);
  addLife('lf-well', [butterfly([-26, -20], 11, ['#f2c63a', '#e8a838'])]);

  /* ---------- the old angler at the quay's edge: sat hunched on his bucket (a proper stool later, then his kettle beside
     him, then his dog, at last a golden hat: he changes as your story goes on), oilskin and sou'wester, a white beard, his
     pipe smoking; the rod's tip nods and the float rides the water. Sized as one of the vale's folk sitting down ---------- */
  const anglerStage = () => { try { const ca = gardenCatchHere() || {}, n = Number(ca.aj) || 0; return n >= GARDEN_ANGLER_JOBS.length ? 4 : n >= 13 ? 3 : n >= 8 ? 2 : n >= 3 ? 1 : 0; } catch (e) { return 0; } };
  A['old-angler'] = { box: [-34, -46, 30, 6], seat: false, state: () => 'a' + anglerStage(),
    parts: [
      { id: 'rod', box: [-2, -30, 44, 66], at: [3, -16], draw(B) { B.s('M33 -27Q38 6 39 63', '#fbfbf2', .6, .6).s('M0 0L33 -27', '#6e4c2a', 1.5).s('M0 0L12 -9.8', '#3a2a1a', 2.2).f(B.circ(5, -4, 1.6), '#8a949a'); }, anim(im, t, o) { im.setRotation(Math.sin(t * .9) * .03 + (Math.sin(t * .23) > .9 ? .06 : 0)); im.setAlpha(1); } },
      { id: 'float', box: [-5, -4, 5, 3], at: [42, 47], draw(B) { B.f(B.ell(0, 0, 4.6, 1.4), 'rgba(16,40,56,.25)').f('M-1.6 0V-2.6a1.6 1.6 0 0 1 3.2 0V0Z', '#e8402a').f(B.rect(-1.6, -1, 3.2, 1), '#ffffff'); }, anim(im, t, o) { im.setPosition(o.x, o.y + Math.sin(t * 1.6) * .8 + (Math.sin(t * .31) > .94 ? 2.4 : 0)); } },
      ...smokeParts([-8, -30], 2, 16, 5, .25).map(p => Object.assign(p, { draw: B => puff(B, 3.2) })),
      { id: 'tail', box: [-8, -6, 1, 1], at: [-26, -4], draw(B, o) { if (o.state === 'a3' || o.state === 'a4') B.s('M0 0q-4 -2 -6 -5', '#a87c4f', 1.8); }, anim(im, t) { im.setRotation(Math.sin(t * 7) * .35); } },
    ],
    draw(B, o) {
      const r = KIT().rng(941), s = o.season, st = Number(String(o.state || 'a0').slice(1)) || 0, k = .7;
      B.shadow(-2, 1, 20, 3.4, .28, '#1a1208');
      // the line down from the rod's tip to the water (the rod itself is a part that nods)
      // what he sits on: an old bucket, then a proper three-legged stool
      if (st >= 1) B.s(`M${-8 * k} ${-12 * k}h${16 * k}M${-6 * k} ${-12 * k}L${-8 * k} 0M${5 * k} ${-12 * k}L${7 * k} 0`, '#6e4c2a', 2);
      else B.f(`M${-9 * k} 0L${-10 * k} ${-10 * k}H${9 * k}L${8 * k} 0Z`, B.lin(-8, 0, 8, 0, [[0, '#a8b0b4'], [1, '#5e686c']])).f(B.ell(-.5, -10 * k, 9.5 * k, 1.6), '#4e585c');
      // his kettle on its little stove, his dog lying by him
      if (st >= 2) { B.f(B.rr(12, -6, 9, 6, 1), '#3a3a42').f(`M13 -6Q16.5 -11 20 -6Z`, '#59636a').s('M20 -5l3 -2', '#3a3a42', 1.2); }
      if (st >= 3) { B.f(B.ell(-20, -3.4, 7, 3.6), '#a87c4f').f(B.circ(-14, -6.6, 3.2), '#a87c4f').f(B.poly([[-13, -9.4], [-11, -11.6], [-11.4, -8]]), '#7a5636').f(B.circ(-12.6, -7, .5), '#1a1008').f(B.ell(-21, -4.6, 4, 1.4), '#c89a6a', .6); }
      // boots and oilskin trousers, knees up, the coat hunched round him, lit from the west
      B.f(`M${-4 * k} ${-12 * k}q${8 * k} -1 ${14 * k} 1l${5 * k} ${11 * k}h${-4 * k}l${-5 * k} ${-7 * k}q${-6 * k} 0 ${-10 * k} -3z`, '#3a4e66');
      B.f(B.rr(10 * k, -3, 6, 3, 1), '#2a2420').f(B.rr(5 * k, -2.6, 5, 2.6, 1), '#2a2420');
      B.f(`M${-8 * k} ${-31 * k}Q${-9 * k} ${-12 * k} ${-4 * k} ${-11 * k}H${6 * k}Q${8 * k} ${-22 * k} ${5 * k} ${-31 * k}Z`, B.lin(-8, 0, 6, 0, [[0, '#d8a44a'], [.5, '#b8843a'], [1, '#8a5e24']]));
      B.s(`M${-7 * k} ${-24 * k}q${7 * k} 2 ${12 * k} 0`, '#8a5e24', .6, .7).s(`M${4 * k} ${-26 * k}l${6 * k} ${4 * k}`, '#b8843a', 2.4);
      // the head: a weathered face, white beard and brows, an eye on his float, the pipe in his teeth
      B.f(B.circ(-1 * k, -37 * k, 7 * k), '#e4c2a0').f(B.circ(-3 * k, -38.6 * k, 3 * k), '#f0d4b8', .6);
      B.f(`M${-7 * k} ${-34 * k}q0 ${9 * k} ${7 * k} ${10 * k}q${7 * k} -1 ${7 * k} ${-9 * k}q${-3 * k} ${3 * k} ${-7 * k} ${2 * k}q${-4 * k} 1 ${-7 * k} ${-3 * k}z`, '#eeeae0');
      B.f(B.circ(2.6 * k, -37.6 * k, .8), '#2a2018').s(`M${1 * k} ${-39.6 * k}h${3 * k}`, '#f4f0e8', .8);
      B.s(`M${-3 * k} ${-32 * k}l${-6} 2`, '#5a3a22', 1.2).f(B.rr(-12, -26.6, 3.4, 2.8, .8), '#5a3a22');
      // the sou'wester, gold at the last
      const hat = st >= 4 ? ['#f2c432', '#d8a420'] : ['#e8c24a', '#c89a2a'];
      B.f(`M${-11 * k} ${-39 * k}q${10 * k} ${-6 * k} ${21 * k} 0l${1 * k} ${2 * k}h${-23 * k}z`, hat[0]).f(`M${-7 * k} ${-40 * k}q${6 * k} ${-9 * k} ${14 * k} 0`, hat[1]).s(`M${-11 * k} ${-37 * k}h${22 * k}`, '#8a6a1a', .5, .7);
      if (st >= 4) B.f(B.circ(-5 * k, -44 * k, 1), '#fff6c8', .9);
      if (s === 'winter') B.f(`M${-7 * k} ${-41 * k}q${6 * k} ${-7 * k} ${12 * k} 0z`, '#f4f6f2', .8);
    } };

  /* ---------- the pier's decks (the pier and the two lengths a player adds): oak planks laid across, each its own weathered
     tone, nail heads over the joists, a gap of dark water between boards, a fascia along each side, piles going down into
     the lake with rings of water round them, bollards and a ladder at the deep end. Drawn from the deck's own box (the
     deck that walking uses, gardenPierDecks), under every actor; the deck keeps its size and what you can walk on ---------- */
  M.pierDeck = function (scene, parent, pier, x, y, w, h, season, last) {
    const kit = KIT(); if (!kit || !kit.sprite) return null;
    if (pier.side === 'west' || pier.side === 'east') return sideDeck(kit, scene, parent, pier, x, y, w, h, season);
    const key = 'gpm|pier|' + pier.id + '|' + season + '|' + Math.round(w) + 'x' + Math.round(h) + (last ? '|end' : '');
    const box = [-14, -6, w + 14, h + (last ? 24 : 6)];
    return kit.sprite(scene, parent, key, box, B => {
      const r = kit.rng(kit.hashStr ? kit.hashStr(pier.id) : 931), snowy = season === 'winter';
      const TONES = ['#b8a079', '#a88e66', '#c4ad84', '#9c8460', '#b0a080', '#a8987a'];
      // the deck's shadow on the water and the piles down each side, each with its ring of ripples
      B.f(B.rr(4, 6, w + 6, h + (last ? 6 : 0), 4), 'rgba(16,40,56,.28)');
      for (let yy = 10; yy < h; yy += 34) for (const xx of [-4, w + 4]) { B.f(B.ell(xx, yy + 9, 7, 2.4), 'rgba(16,40,56,.3)').s(B.ell(xx, yy + 9, 8.6, 2.8), '#e8f4f4', .7, .45); B.f(B.rect(xx - 3, yy - 2, 6, 11), '#5a4630').f(B.rect(xx - 3, yy - 2, 1.6, 11), '#8a7050', .8).f(B.rect(xx - 3, yy + 6, 6, 3), '#2e4a3e', .45); }
      // the fascia boards along both sides
      B.f(B.rect(-3, 0, 4, h), '#6e5638').f(B.rect(w - 1, 0, 4, h), '#4e3c26').f(B.rect(-3, 0, 1.2, h), '#a8906a', .7);
      // the planks, across the deck: each its own tone and length of grain, the joints dark, nails over the joists
      for (let yy = 0, i = 0; yy < h - .5; yy += 9.6, i++) {
        const bh = Math.min(8.8, h - yy), tone = TONES[Math.floor(r() * TONES.length)], split = r() < .3 ? w * (.3 + r() * .4) : 0;
        B.f(B.rect(0, yy, w, bh), tone);
        if (split) B.s(`M${split} ${yy}v${bh}`, '#3e3020', .8, .8);
        B.f(B.rect(0, yy, w, 1), '#e8d8b0', .35).f(B.rect(0, yy + bh - 1.2, w, 1.2), '#5a4630', .45);
        for (let k = 0; k < 3; k++) { const gx = r() * w * .7, gl = 10 + r() * 30; B.s(`M${gx} ${yy + 2 + r() * (bh - 4)}h${gl}`, '#7a6446', .5, .45); }
        if (r() < .18) B.f(B.ell(r() * w, yy + bh / 2, 1.8, 1), '#6a5034', .8);
        if (r() < .25) B.f(B.rect(r() * w * .8, yy + 1, 10 + r() * 14, bh - 2), '#d8d0c0', .16);
        for (const nx of [6, w / 2, w - 6]) B.f(B.circ(nx - 1.4, yy + bh / 2, .6), '#3a3430').f(B.circ(nx + 1.4, yy + bh / 2, .6), '#3a3430');
        B.f(B.rect(0, yy + bh, w, .8), '#1e2a26', .7);
      }
      // light from the west along the deck, shade on the east, a worn pale way down the middle where feet go
      B.f(B.rect(0, 0, w * .2, h), '#ffffff', .07).f(B.rect(w * .8, 0, w * .2, h), '#1a1008', .12).f(B.rect(w * .3, 0, w * .4, h), '#f4ead0', .1);
      // a coil of rope, a gull's feather, a few scales near the edge where people fish
      if (r() < .7) { const cx = w * (.15 + r() * .1), cy = h * (.3 + r() * .4); for (let k = 0; k < 3; k++) B.s(B.ell(cx, cy, 6 - k * 1.6, 3 - k * .8), k % 2 ? '#c8b080' : '#a8905a', 1.1); }
      for (let i = 0; i < 4; i++) B.f(B.ell(w * (.75 + r() * .2), h * r(), .8, .5), '#e8f0f0', .7);
      if (snowy) for (let i = 0; i < 6; i++) B.f(B.blob(r, r() * w, r() * h, 10 + r() * 10, 3, 7, .5), '#f4f6f2', .7);
      // the deep end: the end face of the last deck, its piles into the water, two bollards and a ladder down
      if (last) {
        B.f(B.rect(-3, h, w + 6, 6), '#5a4630').f(B.rect(-3, h, w + 6, 1.4), '#8a7050', .8);
        for (const xx of [2, w / 2, w - 2]) { B.f(B.rect(xx - 3, h + 6, 6, 10), '#4a3826').f(B.rect(xx - 3, h + 13, 6, 3), '#2e4a3e', .5).s(B.ell(xx, h + 16, 8, 2.6), '#e8f4f4', .8, .5); }
        B.s(`M${w * .62} ${h - 4}V${h + 18}M${w * .62 + 9} ${h - 4}V${h + 18}`, '#8a949a', 1.2); for (let k = 0; k < 4; k++) B.s(`M${w * .62} ${h + k * 5.4}h9`, '#8a949a', 1);
      }
      if (last) for (const xx of [7, w - 7]) { const yy = h - 6; B.f(B.ell(xx, yy + 6, 4.6, 2.2), '#2a2e30').f(B.rr(xx - 3.4, yy - 2, 6.8, 8, 2), '#3a3e40').f(B.ell(xx, yy - 2, 4, 1.8), '#5a5e60').f(B.ell(xx - 1, yy - 2.4, 1.6, .7), '#8a9094', .8); }
    }, x, y, 2, false);
  };

  /* ---------- a side pier (west or east), bought for the lake: the same oak as the main pier, its planks laid across the
     deck's run, a fascia along its sunny front, piles every few planks down into the water each with its ring, the
     deck's shadow and a broken reflection on the water, a bollard and a ladder at the water end, the land end bedded in
     the shore with stones (art director, round 3: they were flat tan boards lying on the sea, no piles, rails or shadow).
     Drawn from the deck's own box; walking keeps the deck's size ---------- */
  function sideDeck(kit, scene, parent, pier, x, y, w, h, season) {
    const west = pier.side === 'west', key = 'gpm|pier|' + pier.id + '|' + season + '|' + Math.round(w) + 'x' + Math.round(h), FACE = 7, PILE = 14;
    const box = [-16, -10, w + 16, h + FACE + PILE + 12];
    return kit.sprite(scene, parent, key, box, B => {
      const r = kit.rng(kit.hashStr ? kit.hashStr(pier.id) : 977), snowy = season === 'winter', TONES = ['#b8a079', '#a88e66', '#c4ad84', '#9c8460', '#b0a080', '#a8987a'];
      const wet = west ? 0 : w, dry = west ? w : 0, toWater = west ? -1 : 1;
      // the reflection and the shadow on the water, south of the deck (the world's light from the north-west)
      B.f(B.rr(6, h + FACE - 2, w - 4, PILE + 6, 4), 'rgba(16,40,56,.26)');
      for (let i = 0; i < 7; i++) { const yy = h + FACE + 3 + i * 3.2, x0 = 4 + r() * 8; B.s(`M${x0} ${yy}h${w - 14 - r() * 18}`, '#8a6e4a', 1.6, .22 - i * .025); }
      // the piles down into the water along the front, each with its ring of ripples; a cross brace between pairs
      const piles = []; for (let xx = 10; xx < w - 4; xx += 32) piles.push(xx); piles.push(wet + toWater * -4);
      for (let i = 0; i + 1 < piles.length; i += 2) B.s(`M${piles[i]} ${h + FACE + 1}L${piles[i + 1]} ${h + FACE + PILE - 3}`, '#4a3826', 1.6, .8);
      for (const xx of piles) { B.f(B.rect(xx - 3.2, h - 2, 6.4, FACE + PILE + 2), '#4e3c28').f(B.rect(xx - 3.2, h - 2, 1.8, FACE + PILE + 2), '#7a6244', .8).f(B.rect(xx - 3.2, h + FACE + PILE - 5, 6.4, 5), '#2e4a3e', .55); B.s(B.ell(xx, h + FACE + PILE, 8.6, 2.6), '#e8f4f4', .8, .55).s(B.ell(xx, h + FACE + PILE + 1, 12, 3.4), '#e8f4f4', .6, .25); }
      // the front fascia: the deck's sunlit edge seen from the south, plank ends and a dark joint under the boards
      B.f(B.rect(-2, h - 1, w + 4, FACE), '#6e5638').f(B.rect(-2, h - 1, w + 4, 1.6), '#a8906a', .8).f(B.rect(-2, h + FACE - 2, w + 4, 1.4), '#2e2418', .6);
      for (let xx = 4; xx < w; xx += 9.6) B.s(`M${xx} ${h}v${FACE - 2}`, '#4e3c26', .7, .6);
      // the planks across the run, each its own tone, nails over the two joists, a worn pale way down the middle
      for (let xx = 0; xx < w - .5; xx += 9.6) {
        const bw = Math.min(8.8, w - xx), tone = TONES[Math.floor(r() * TONES.length)];
        B.f(B.rect(xx, 0, bw, h - 1), tone).f(B.rect(xx, 0, 1, h - 1), '#e8d8b0', .3).f(B.rect(xx + bw - 1.1, 0, 1.1, h - 1), '#5a4630', .45);
        for (let k = 0; k < 2; k++) { const gy = 2 + r() * (h - 6); B.s(`M${xx + 1.5 + r() * 2} ${gy}v${4 + r() * 8}`, '#7a6446', .5, .45); }
        for (const ny of [5, h - 6]) B.f(B.circ(xx + bw / 2, ny, .6), '#3a3430');
        B.f(B.rect(xx + bw, 0, .8, h - 1), '#1e2a26', .6);
      }
      B.f(B.rect(0, h * .3, w, h * .38), '#f4ead0', .1).f(B.rect(0, 0, w, 2), '#ffffff', .1);
      // a rope rail on short posts along the back, so it reads as a landing stage and not a board
      const posts = []; for (let xx = 6; xx < w; xx += 30) posts.push(xx);
      for (const xx of posts) B.f(B.rect(xx - 1.8, -9, 3.6, 10), '#5a4630').f(B.rect(xx - 1.8, -9, 1.2, 10), '#8a7050', .8).f(B.ell(xx, -9, 2.2, 1), '#a8906a');
      for (let i = 0; i + 1 < posts.length; i++) B.s(`M${posts[i]} -7Q${(posts[i] + posts[i + 1]) / 2} -3 ${posts[i + 1]} -7`, '#c8b080', 1.1, .9);
      // the water end: its end face, a bollard with a turn of rope, a ladder down
      const ex = wet - toWater * 6;
      B.f(B.rect(wet - (west ? 3 : 0), -1, 3, h + FACE), '#4e3c26');
      B.f(B.ell(ex, h - 6 + 5, 4.4, 2), '#2a2e30').f(B.rr(ex - 3.2, h - 13, 6.4, 8, 2), '#3a3e40').f(B.ell(ex, h - 13, 3.8, 1.7), '#5a5e60').s(B.ell(ex, h - 9, 4, 1.4), '#c8b080', 1);
      const lx = wet - toWater * 16; B.s(`M${lx} ${h - 2}V${h + FACE + PILE}M${lx + 7} ${h - 2}V${h + FACE + PILE}`, '#8a949a', 1.1); for (let k = 0; k < 4; k++) B.s(`M${lx} ${h + 2 + k * 5}h7`, '#8a949a', .9);
      // the land end bedded in the shore: stones and a tuft of grass round the first boards
      for (let i = 0; i < 5; i++) { const sx = dry + toWater * (2 + r() * 10), sy = h - 4 + r() * 10, rx = 3 + r() * 4; B.f(B.blob(r, sx, sy, rx, rx * .6, 7, .3), '#8a8478').f(B.blob(r, sx - 1, sy - 1, rx * .7, rx * .4, 6, .3), '#b4ae9e', .8); }
      B.tufts && B.tufts(r, dry + toWater * 4, h + 2, 18, 5, ['#6a8a44', '#8aa858'], 7);
      if (r() < .8) { const cx = w * (west ? .7 : .3), cy = h * .5; for (let k = 0; k < 3; k++) B.s(B.ell(cx, cy, 5.4 - k * 1.5, 2.6 - k * .7), k % 2 ? '#c8b080' : '#a8905a', 1); }
      if (snowy) for (let i = 0; i < 5; i++) B.f(B.blob(r, r() * w, r() * h, 9 + r() * 9, 3, 7, .5), '#f4f6f2', .7);
    }, x, y, 2, false);
  }

  /* ---------- the hedge maze: every run of hedge a clipped yew wall with its lit top and its shaded face, standing exactly
     on the cells that block walking (GARDEN_LAND_MAZE, one row per run); the first run's seat lays the maze's gravel
     walks and the grass round it, so the whole maze is one place; the chest at its heart iron-bound on a flag ---------- */
  if (typeof GARDEN_LAND_MAZE !== 'undefined') {
    const HH = H * .78, DEEP = 30, CW = 48, YEW = s => s === 'winter' ? ['#3e5244', '#55695a', '#7a8c7c', '#e8eeea'] : s === 'autumn' ? ['#2e4a2e', '#3e5e36', '#5e7a44', '#8a9a54'] : ['#244a2c', '#335e36', '#4e7e44', '#7aa458'];
    const hedge = (w, seed, floor) => ({ box: [-w * CW / 2 - 4, -HH - DEEP - 6, w * CW / 2 + 4, 6], shade: true,
      seat: floor ? { kind: 'earth', w: w * CW, front: 6, back: 4, stones: 0, way: false, box: [-w * CW / 2 - 30, -DEEP - 30, -w * CW / 2 + 8 * CW + 30, 4 * DEEP + 30], extra(B, r) {
        // the walks: raked gravel in every open cell of the maze, a fringe of grass round the outside
        const x0 = -w * CW / 2, y0 = -DEEP;
        B.f(B.rr(x0 - 10, y0 - 8, 8 * CW + 20, 5 * DEEP + 16, 10), '#8a9a56', .35);
        GARDEN_LAND_MAZE.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) if (row[dx] !== '#') { const cx = x0 + dx * CW + CW / 2, cy = y0 + dy * DEEP + DEEP / 2; B.f(B.blob(r, cx, cy, CW * .56, DEEP * .56, 9, .2), '#c8b890', .95); for (let i = 0; i < 14; i++) B.f(B.circ(cx + (r() - .5) * CW, cy + (r() - .5) * DEEP, .5 + r() * .8), r() < .5 ? '#a8987a' : '#e4d8bc', .8); } });
        for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2; B.tufts(r, x0 + 4 * CW + Math.cos(a) * (4 * CW + 8), y0 + 2.5 * DEEP + Math.sin(a) * (2.5 * DEEP + 6), 6, 3, grass('summer'), 5); }
      } } : false,
      draw(B, o) {
        const r = KIT().rng(seed), s = o.season, Y = YEW(s), half = w * CW / 2, top = -HH;
        // (clipped, but by hand: every edge a soft wave, the corners rounded, never a ruler-straight slab)
        const wave = (y, amp, k) => { const pts = []; for (let x = -half + 3; x <= half - 3; x += 4) pts.push([x, y + Math.sin(x * .19 + seed + k) * amp + (r() - .5) * amp * .6]); return pts; };
        const lip = wave(top, 1.4, 1), crest = wave(top - DEEP, 1.8, 2), foot = wave(0, 1, 3).reverse();
        // the face toward you: shaded, darker at the foot, its clipped surface in small leaf dabs
        B.f(B.poly([[-half, top + 4], ...lip, [half, top + 4], [half - 1, -3], ...foot, [-half + 1, -3]]), B.lin(0, top, 0, 0, [[0, Y[1]], [.7, Y[0]], [1, '#16301c']]));
        for (let i = 0; i < w * 16; i++) { const x = -half + 2 + r() * (half * 2 - 4), y = top + 2 + r() * (HH - 4); B.f(B.ell(x, y, 1.6 + r(), 1 + r() * .6), r() < .5 ? Y[1] : Y[0], .8); }
        // the top, clipped flat and lit from the upper left, broad light and shade across it, its front edge catching the light
        B.f(B.poly([[-half - 1, top - DEEP + 5], ...crest, [half + 1, top - DEEP + 5], [half + 1, top + 1], ...lip.slice().reverse(), [-half - 1, top + 1]]), B.lin(-half, top - DEEP, half, top, [[0, Y[3]], [.4, Y[2]], [1, Y[1]]]));
        for (let i = 0; i < w * 2 + 1; i++) B.f(B.blob(r, -half + r() * half * 2, top - DEEP * (.25 + r() * .5), 8 + r() * 10, 4 + r() * 4, 8, .5), r() < .5 ? Y[1] : Y[3], .3);
        for (let i = 0; i < w * 20; i++) { const x = -half + 2 + r() * (half * 2 - 4), y = top - DEEP + 3 + r() * (DEEP - 3); B.f(B.ell(x, y, 1.6 + r(), 1 + r() * .6), r() < .4 ? Y[3] : r() < .7 ? Y[2] : Y[1], .75); }
        B.s(B.line(lip), Y[3], 1.2, .7).f(B.rect(half - 8, top - DEEP + 4, 8, DEEP + HH - 6), '#0a1a0e', .12);
        B.tufts(r, 0, 1, half * 2, w * 5, grass(s), 5);
        // a little unevenness where it was cut, a sprig grown out, a few flowers at the foot in summer
        for (let i = 0; i < w * 2; i++) B.s(`M${-half + r() * half * 2} ${top - DEEP + 1}l${(r() - .5) * 3} -3`, Y[2], 1, .8);
        if (s === 'summer' || s === 'spring') for (let i = 0; i < w * 2; i++) B.f(B.circ(-half + r() * half * 2, -1 - r() * 2, 1), ['#f4f0e2', '#e8c84a'][i % 2], .9);
      } });
    let first = true;
    GARDEN_LAND_MAZE.forEach((row, dy) => {
      let x0 = -1;
      for (let dx = 0; dx <= row.length; dx++) {
        const isH = row[dx] === '#';
        if (isH && x0 < 0) x0 = dx;
        if (!isH && x0 >= 0) { A['lf-maze-h' + dy + '-' + x0] = hedge(dx - x0, 881 + dy * 10 + x0, first); first = false; x0 = -1; }
      }
    });
    A['lf-chest'] = { box: [-20, -26, 20, 6], seat: { kind: 'flags', w: 26, front: 8, back: 6, stones: 0, way: false }, lit: true, lights: [[0, -12, 50]],
      parts: [sparkle([0, -20], 10)],
      draw(B, o) {
        const r = KIT().rng(899), s = o.season;
        B.f(B.rr(-13, -14, 26, 14, 1.6), '#7a4e2a').f(B.rect(-13, -14, 26, 2), '#a8703e').s('M-13 -7H13', '#4a2e18', .8);
        B.f('M-13 -14Q-13 -22 0 -23Q13 -22 13 -14Z', '#8a5a32').f('M-13 -14Q-13 -21 -4 -22.4V-14Z', '#a8703e', .6);
        for (const x of [-9, 9]) B.f(B.rect(x - 1.6, -22.6, 3.2, 22.6), '#5a5e60').f(B.rect(x - 1.6, -22.6, 1, 22.6), '#9aa0a2', .7);
        B.f(B.rr(-3, -15, 6, 6, 1), '#c8a23a').f(B.circ(0, -12.6, 1), '#3a2810');
        if (o.night) B.f(B.ell(0, -14, 14, 3), '#ffe08a', .25);
        if (s !== 'winter') for (let i = 0; i < 6; i++) B.f(B.circ(-17 + r() * 34, -1 - r() * 2, 1), ['#f4f0e2', '#e8c84a', '#c86aa0'][i % 3]);
        B.tufts(r, -16, 1, 5, 4, grass(s), 5).tufts(r, 16, 1, 5, 4, grass(s), 5);
      } };
  }
})();

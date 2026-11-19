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
  A['ld-boathouse'] = { box: [-84, -190, 86, 12], seat: { kind: 'flags', w: 136, front: 20 }, lit: true, lights: [[-44, -58, 90], [0, -118, 70]], draw(B, o) {
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
})();

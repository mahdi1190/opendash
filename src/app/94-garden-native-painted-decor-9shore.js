/* Painted decorations won on the shore (the tide's games, 94-garden-tide-7castle.js to -d-spot.js): the shore rosette, the crab race
 * cup, the bottle rack, Pip's champion stone, the pebble pits board and the group photo frame. The opening scenes' house style: lit
 * from the upper left, no outlines, lobed natural shapes, a contact shadow and a little growth or wear round each foot.
 * Registry: 94-garden-native-painted-decor-0kit.js (plain data at load). */
GardenPaintedDecor.add('shore', (function () {
  const WOOD = ['#a8845a', '#7e5e3c', '#c8a676', '#5a4028'], DRIFT = ['#bcae94', '#8e8068', '#ddd2bc', '#6a5e4a'], SAND = ['#e3d2a2', '#c8b483', '#f0e4c0'];
  const gloss = (B, x, y, rx, ry) => B.f(B.ell(x, y, rx, ry), '#ffffff', .55).f(B.ell(x + rx * .2, y + ry * .1, rx * .45, ry * .4), '#ffffff', .5);
  // a little drift of sand round a foot, with a shell or two in it: these things come from the beach
  const sandFoot = (B, r, w, o) => {
    B.shadow(0, 1, w, w * .28, .26);
    B.f(sceneDraw.blob(r, 0, 1.4, w * .9, w * .2, 9, .3), SAND[1], .55).f(sceneDraw.blob(r, -w * .15, .6, w * .6, w * .12, 8, .3), SAND[2], .5);
    for (let k = 0; k < 2; k++) { const x = (r() - .5) * w * 1.3, y = 1 + r() * 1.5; B.f(`M${x} ${y + 1.4}l-2 -1.6q.2 -1.8 2 -2q1.8 .2 2 2z`, k ? '#f0c8bc' : '#ece2cc', .9); }
    B.tufts(r, 0, 2, w * 1.4, 4, o.season);
  };
  return {
    // a rosette on a stake, in sea blue and sand gold, with a little scallop at its heart
    'shore-rosette': { box: [-20, -72, 20, 6], draw(B, o) {
      const { r } = o, y = -50, R = 14, c0 = '#3a8ab0', c1 = '#2a6a90', c2 = '#e8c24a', c3 = '#f4e6d0';
      sandFoot(B, r, 10, o);
      B.post(0, y + 4, 0, 3, ['#8a6a46', '#6a5034', '#b08c5e']);
      for (const s of [-1, 1]) B.f(`M${s * 2} ${y + 4}l${s * 6} ${R * 1.5}l${-s * 3} -2.4l${-s * 3} 3.6l${s * -1} ${-R * 1.4}z`, s < 0 ? c1 : c0);
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, a2 = (i + 1) / 18 * Math.PI * 2; B.f(B.poly([[0, y], [Math.cos(a) * R, y + Math.sin(a) * R], [Math.cos(a2) * R * .96, y + Math.sin(a2) * R * .96]]), i % 2 ? c0 : c1); }
      B.f(B.circ(0, y, R), B.rad(-R * .4, y - R * .4, R * 1.4, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(0,0,0,.18)']]));
      B.f(B.circ(0, y, R * .58), c2).f(B.circ(0, y, R * .48), c3);
      // the scallop
      B.f(`M0 ${y + 4.4}L-5 ${y - .6}Q-4.2 ${y - 5} 0 ${y - 5.4}Q4.2 ${y - 5} 5 ${y - .6}z`, '#e8a878');
      for (let k = 0; k < 5; k++) { const a = Math.PI * (.2 + .6 * k / 4); B.s(`M0 ${y + 4}L${(-Math.cos(a) * 5).toFixed(1)} ${(y - Math.sin(a) * 4.8).toFixed(1)}`, '#b87048', .5, .8); }
      gloss(B, -R * .35, y - R * .4, 2, 1.2);
    } },
    // a small silver cup on a driftwood plinth, a red crab sat on its rim with its claws up
    'crab-cup': { box: [-26, -64, 26, 6], draw(B, o) {
      const { r } = o; sandFoot(B, r, 14, o);
      B.f(B.rr(-14, -9, 28, 9, 2.4), B.lin(-14, 0, 14, 0, [[0, DRIFT[2]], [.5, DRIFT[0]], [1, DRIFT[1]]])).f(B.rr(-14, -9, 28, 2.4, 1.2), DRIFT[2], .8);
      B.s('M-10 -5q6 1 12 -1M-4 -3q5 1 10 0', DRIFT[3], .5, .5);
      B.f(B.rr(-6, -12, 12, 3, 1), '#c8b07a').f(B.rect(-5, -11.4, 10, .8), '#f0dca0', .8);
      const silver = B.lin(-15, 0, 15, 0, [[0, '#f4f6f8'], [.35, '#c8d0d8'], [1, '#7e8a96']]);
      B.f('M-3 -12l1 -8h4l1 8z', silver).f(B.ell(0, -20, 5, 1.6), '#dde3e9');
      B.f('M-14 -46q0 22 14 26q14 -4 14 -26z', silver).f(B.ell(0, -46, 14, 3.8), '#a8b2bc').f(B.ell(0, -46, 11.4, 2.8), '#6e7a86');
      for (const s of [-1, 1]) B.s(`M${s * 13} -42q${s * 8} 2 ${s * 5} 10q${s * -2} 3 ${s * -7} 3`, '#b8c2cc', 2.6);
      gloss(B, -7, -36, 2, 5.4);
      // the crab on the rim
      const cx = 4, cy = -48;
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) B.s(`M${cx + sd * (3 + k)} ${cy + 1 + k * .4}l${sd * 2.2} ${2.4 - k * .3}`, '#8a3422', .8);
      for (const sd of [-1, 1]) { B.s(`M${cx + sd * 3.4} ${cy - 1.6}L${cx + sd * 6} ${cy - 7}`, '#8a3422', 1.1); B.f(B.ell(cx + sd * 6.2, cy - 7.6, 1.8, 1.4), '#c8563a'); }
      B.f(B.ell(cx, cy, 4.6, 2.8), B.lin(cx - 4, cy - 3, cx + 4, cy + 2, [[0, '#e8906a'], [.5, '#c8563a'], [1, '#8a3422']])).f(B.ell(cx - 1.4, cy - 1.2, 1.4, .6), '#ffffff', .4);
      for (const sd of [-1, 1]) B.f(B.circ(cx + sd * 1.3, cy - 3.6, .7), '#1a1612');
    } },
    // a little rack of weathered wood, two shelves of bottles from the sea, each with its note rolled up inside
    'bottle-rack': { box: [-28, -60, 28, 6], draw(B, o) {
      const { r, H } = o; sandFoot(B, r, 22, o);
      for (const x of [-22, 20]) B.post(x, -50, 0, 3.4, [DRIFT[0], DRIFT[1], DRIFT[2]]);
      for (const y of [-26, -48]) H.plank(B, -25, y, 50, 4, [DRIFT[0], DRIFT[1], DRIFT[2]], r);
      H.plank(B, -25, -6, 50, 4, [DRIFT[0], DRIFT[1], DRIFT[2]], r);
      const bottle = (x, y, c, h, lean) => {
        B.cx.save(); B.cx.translate(x, y); B.cx.rotate(lean || 0);
        const b = h * .55;
        B.f(`M-4 -1Q-4 0 -3 0L3 0Q4 0 4 -1L4 ${-b}Q4 ${-b - 3} 1.6 ${-b - 4}L1.6 ${-h}L-1.6 ${-h}L-1.6 ${-b - 4}Q-4 ${-b - 3} -4 ${-b}z`, c, .82);
        B.f(B.rr(-2.4, -b + 1, 4.8, b * .62, 1.6), '#f4ecd8', .95).f(B.rect(-1.8, -h - 1.6, 3.6, 2.6), '#a87a4a');
        B.f(B.rr(-3.2, -b - 1, 1.2, b * .8, .6), '#ffffff', .4);
        B.cx.restore();
      };
      bottle(-15, -26, '#8ec4b0', 16, -.04); bottle(-5, -26, '#7aa0c8', 14, .03); bottle(5, -26, '#e4eeee', 17, 0); bottle(14, -26, '#c8925a', 13, .05);
      bottle(-12, -6, '#9cc8b8', 15, .02); bottle(2, -6, '#a8d4c4', 18, -.03); bottle(13, -6, '#6a9ad8', 12, .04);
      B.f('M8 -48q3 -8 8 -6q-2 3 -8 6z', '#4f6a34', .85);   // (a strand of weed still on the top)
    } },
    // the flattest stone in the vale, stood on its edge on a little wooden stand with a brass plate
    'skim-stone': { box: [-24, -46, 24, 6], draw(B, o) {
      const { r } = o; sandFoot(B, r, 14, o);
      B.f(B.rr(-15, -8, 30, 8, 2), B.lin(-15, 0, 15, 0, [[0, WOOD[2]], [.5, WOOD[0]], [1, WOOD[1]]])).f(B.rr(-15, -8, 30, 2, 1), WOOD[2], .8);
      B.f(B.rr(-6, -5.6, 12, 3.4, .8), '#c8a04a').f(B.rect(-5, -5, 10, .8), '#f0d890', .8);
      B.f('M-3 -8l-1 -3h8l-1 3z', WOOD[3], .7);
      B.f('M-13 -12q-2 -16 10 -24q14 -6 18 6q3 12 -8 18q-10 4 -20 0z', B.lin(-14, -36, 16, -10, [[0, '#8a96a2'], [.45, '#6a7480'], [1, '#48505a']]));
      B.s('M-9 -16q4 -12 16 -16', '#9aa4b0', .8, .7).s('M-6 -12q8 -2 16 -10', '#4a525c', .6, .6);
      B.f(B.ell(-4, -28, 4, 2), '#ffffff', .3);
      B.s('M-13 -12q-2 -16 10 -24q14 -6 18 6q3 12 -8 18q-10 4 -20 0z', '#e8c24a', .7, .5);   // (a line of gold leaf round its rim: Pip's idea)
    } },
    // a carved board for the sowing game on a low log stand: two rows of six pits, a store at each end, pebbles in it
    'pits-board': { box: [-40, -26, 40, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 36, 7, .28); B.tufts(r, 0, 2, 66, 5, o.season);
      for (const x of [-26, 26]) { B.f(B.ell(x, -2, 6, 3), WOOD[1]).f(B.rr(x - 6, -8, 12, 6, 2), B.lin(x - 6, 0, x + 6, 0, [[0, WOOD[2]], [1, WOOD[1]]])).f(B.ell(x, -8, 6, 2.2), '#d8bc8a').s(sceneDraw.ell(x, -8, 3.4, 1.2), WOOD[1], .5, .7); }
      B.f(B.rr(-36, -20, 72, 13, 5), B.lin(0, -20, 0, -7, [[0, WOOD[2]], [.4, WOOD[0]], [1, WOOD[1]]])).f(B.rr(-36, -20, 72, 3, 2), '#d8b884', .7);
      const pit = (x, y, rx, ry) => B.f(B.ell(x, y, rx, ry), WOOD[3], .55).f(B.ell(x, y + .5, rx * .8, ry * .6), '#3e2a18', .5).s(`M${x - rx} ${y + .4}q${rx} ${ry * 1.2} ${rx * 2} 0`, '#e8cc98', .5, .55);
      for (let i = 0; i < 6; i++) { pit(-20 + i * 8, -16.2, 3, 1.4); pit(-20 + i * 8, -11.6, 3, 1.4); }
      pit(-30, -13.8, 3.6, 3); pit(30, -13.8, 3.6, 3);
      const cols = ['#9a968c', '#7a9a84', '#c8925a', '#8ac4a0', '#b8b0a4', '#6a9ad8'];
      for (let i = 0; i < 12; i++) for (let k = 0; k < (i % 4) + 1; k++) { const x = -20 + (i % 6) * 8 + (r() - .5) * 2.4, y = (i < 6 ? -16.4 : -11.8) + (r() - .5) * .8; B.f(B.ell(x, y, 1.1, .75), cols[(i * 3 + k) % cols.length]).f(B.ell(x - .3, y - .3, .4, .25), '#ffffff', .55); }
    } },
    // an empty picture frame on an easel, painted with shells in the corners: stand behind it with your friends for a photo
    'spotter-frame': { box: [-34, -88, 34, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 30, 7, .26); B.tufts(r, -22, 2, 14, 5, o.season); B.tufts(r, 22, 2, 14, 5, o.season);
      for (const [x0, x1] of [[-22, -16], [22, 16]]) B.s(`M${x0} 0L${x1} -78`, WOOD[1], 3.4).s(`M${x0 - .8} 0L${x1 - .8} -78`, WOOD[2], 1, .7);
      B.s('M0 -4L0 -70', WOOD[1], 2.6);
      const fr = (x, y, w, h, t) => { B.s(B.rr(x + t / 2, y + t / 2, w - t, h - t, 2), B.lin(x, y, x + w, y + h, [[0, '#e0c48a'], [.5, '#b88a4e'], [1, '#7e5a30']]), t); B.s(B.rr(x + t, y + t, w - 2 * t, h - 2 * t, 1), '#5a3e20', .8, .6); B.s(B.rr(x + .6, y + .6, w - 1.2, h - 1.2, 1.6), '#f4e4b8', .7, .5); };
      fr(-28, -76, 56, 48, 5);
      B.f(B.rr(-26, -28, 52, 4, 1.4), WOOD[0]).f(B.rr(-26, -28, 52, 1.4, .7), WOOD[2], .8);
      for (const [x, y, c] of [[-25, -73, '#f0c8bc'], [25, -73, '#e8dcc4'], [-25, -31, '#f4b8c4'], [25, -31, '#e8a878']]) B.f(`M${x} ${y + 2.6}L${x - 3} ${y}Q${x - 2.6} ${y - 3} ${x} ${y - 3.2}Q${x + 2.6} ${y - 3} ${x + 3} ${y}z`, c).s(`M${x} ${y + 2.2}L${x} ${y - 2.6}`, '#a8806a', .4, .7);
      B.f(B.rr(-9, -84, 18, 7, 2), '#f4ecd8').s(B.rr(-9, -84, 18, 7, 2), '#a8906a', .5, .8).f(B.circ(-5, -80.5, 1.2), '#3a8ab0').f(B.circ(0, -80.5, 1.2), '#e8c24a').f(B.circ(5, -80.5, 1.2), '#c8563a');   // (the card's three colours on a little sign)
    } },
  };
})());

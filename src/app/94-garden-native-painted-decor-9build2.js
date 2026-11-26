/* Painted decorations for pockets and home storage (build2): the storage chest, any chest of the kind `chest` opens the same storage
 * (94-garden-build2-1pockets.js). The family look: oiled oak boards gone soft at the edges, iron straps with a lit edge, brass worn to
 * gold where hands touch it, a tartan rug left folded on the lid, a contact shadow and a patch of earth worn bare in front where you
 * kneel to open it. About half the player's height (GARDEN_SIZE barrel), lit from the upper left, no outlines.
 * Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('build2', (function () {
  const OAK = ['#8a5a34', '#6e4626', '#b07c4c', '#4a2e18'], IRON = ['#3a3e40', '#2a2d2f', '#6a7276'], BRASS = ['#c8962e', '#9a6e1c', '#f2d27a'];
  const MOSS = ['#6f8a44', '#93ad5e'];
  // the lid's top edge as drawn: a low dome from x -22 to 22, highest at the middle
  const lidY = (x) => -21.5 - 7.5 * (1 - (x / 22) * (x / 22));
  return {
    'storage-chest': { box: [-30, -36, 32, 7], draw(B, o) {
      const { r, H, season } = o, D = o.D;
      // the ground it stands on: earth worn bare in front, the contact shadow, a few tufts at its foot
      B.f(D.blob(r, 3, 3, 22, 3.6, 9, .35), '#6a5236', .26).f(D.blob(r, -6, 3.4, 9, 1.8, 7, .4), '#8a6c48', .2);
      B.shadow(2, 1, 27, 5.4, .3);
      // the right side, in shade (the chest seen a little from the left)
      B.f(B.poly([[21, 0], [26, -2.6], [26, -21.4], [21, -19.6]]), B.lin(21, 0, 26, 0, [[0, OAK[1]], [1, OAK[3]]]));
      B.s('M21.4 -10.2L25.8 -12.4', OAK[3], .6, .5).s('M21.4 -5L25.8 -7.2', OAK[3], .6, .5);
      // the front: three boards, lit across from the left, a little grain
      B.f(B.rect(-21, -19.6, 42, 19.6), H.lit(B, -21, 21, OAK[0]));
      for (const y of [-13.2, -6.6]) B.s(`M-21 ${y}h42`, OAK[3], .7, .5).s(`M-21 ${y + .8}h42`, OAK[2], .5, .35);
      for (let i = 0; i < 9; i++) { const gx = -18 + r() * 36, gy = -18 + r() * 17; B.s(`M${gx.toFixed(1)} ${gy.toFixed(1)}h${(3 + r() * 6).toFixed(1)}`, OAK[1], .45, .45); }
      B.f(B.rect(-21, -19.6, 42, 2), OAK[2], .28);   // the light on the top board
      // the plinth it stands on, a shade darker, and its own lit edge
      B.f(B.rect(-22.4, -3, 44.8, 3), OAK[3]).f(B.rect(-22.4, -3, 44.8, .8), OAK[1], .9).f(B.poly([[22.4, 0], [26.6, -2.2], [26.6, -4.6], [22.4, -3]]), OAK[3], .9);
      // moss come up the plinth at the back corner, and a mossy stone tucked under the front
      B.f(D.blob(r, -18.5, -1.6, 4.6, 1.5, 7, .5), MOSS[0], .8).f(D.blob(r, -19.5, -2.3, 2.4, .8, 6, .5), MOSS[1], .7);
      B.stone(r, -25.5, -1, 3.6, 2.4, ['#a8a090', '#868070', '#c8c2b0'], season === 'winter' ? null : MOSS);
      // iron straps over the front and on up round the lid, riveted
      for (const x of [-13, 13]) {
        B.f(B.rect(x - 2.1, -19.6, 4.2, 17), IRON[0]).f(B.rect(x - 2.1, -19.6, 1, 17), IRON[2], .55).f(B.rect(x + 1.2, -19.6, .9, 17), IRON[1], .8);
        for (const y of [-16.4, -10, -5]) B.f(B.circ(x, y, .9), IRON[1]).f(B.circ(x - .3, y - .3, .45), IRON[2], .9);
      }
      // the lid: a low dome, its curve lit along the top, deeper towards the seam
      const top = []; for (let i = 0; i <= 16; i++) { const x = -22 + i * 44 / 16; top.push([x, lidY(x)]); }
      const lidPath = 'M-22 -19.6' + top.map(([x, y]) => `L${x.toFixed(2)} ${y.toFixed(2)}`).join('') + 'L22 -19.6Z';
      B.f(lidPath, B.lin(0, -29, 0, -19.6, [[0, OAK[2]], [.45, OAK[0]], [1, OAK[1]]])).f(lidPath, B.lin(-22, 0, 22, 0, [[0, 'rgba(255,240,210,.16)'], [.5, 'rgba(255,240,210,0)'], [1, 'rgba(40,20,8,.22)']]));
      B.s('M-19 ' + lidY(-19).toFixed(2) + top.slice(2, 15).map(([x, y]) => `L${x.toFixed(2)} ${(y + 1.2).toFixed(2)}`).join(''), '#fff2d8', .7, .35);   // the sheen along the curve
      // the lid's side: its round end, in shade
      B.f(`M22 -19.6L26 -21.4L26 ${(lidY(22) - 1.6).toFixed(2)}Q24.6 ${(lidY(14) - .6).toFixed(2)} 22 ${lidY(22).toFixed(2)}Z`, OAK[3], .95);
      for (const x of [-13, 13]) { const y0 = lidY(x); B.f(`M${x - 2.1} -19.6L${x - 2.1} ${(y0 - .2).toFixed(2)}L${x + 2.1} ${(y0 - .2).toFixed(2)}L${x + 2.1} -19.6Z`, IRON[0]).f(B.rect(x - 2.1, y0 - .2, 4.2, .9), IRON[2], .5); }
      // the seam: a band of iron where the lid shuts, lit along its top
      B.f(B.rect(-22.4, -21, 44.8, 2.4), IRON[1]).f(B.rect(-22.4, -21, 44.8, .8), IRON[2], .7).f(B.poly([[22.4, -18.6], [26.4, -20.6], [26.4, -23], [22.4, -21]]), IRON[1], .9);
      // brass caps on the front corners, worn to gold where they catch the light
      for (const s of [-1, 1]) { const x = s * 21; B.f(B.poly([[x, -3], [x - s * 4.2, -3], [x - s * 4.2, -5.2], [x - s * 1.6, -5.2], [x - s * 1.6, -8.4], [x, -8.4]]), BRASS[1]).f(B.rect(Math.min(x, x - s * 4.2), -3, 4.2, .7), BRASS[2], .6); }
      // the lock plate and the hasp over the seam, a keyhole, the brass rubbed bright in the middle
      B.f(B.rr(-4.6, -18.8, 9.2, 8.4, 1.6), BRASS[1]).f(B.rr(-4, -18.4, 8, 7.4, 1.4), BRASS[0]).f(B.ell(-1.4, -16.6, 2.4, 1.2), BRASS[2], .75);
      B.f(B.circ(0, -14.6, 1.2), '#2a1c0c').f(B.poly([[-.55, -14.6], [.55, -14.6], [.8, -12], [-.8, -12]]), '#2a1c0c');
      B.f(B.rr(-2.2, -23.4, 4.4, 5.2, 1.2), BRASS[1]).f(B.rr(-1.6, -23, 3.2, 1.4, .6), BRASS[2], .7);
      // a tartan rug left folded on the lid, its end hanging over the front
      const rug = 'M3 ' + (lidY(3) - .4).toFixed(2) + 'Q11 ' + (lidY(11) - 1.8).toFixed(2) + ' 20 ' + (lidY(20) - .6).toFixed(2) + 'L21.6 -16.2Q16 -14.4 10.4 -15.6Q6 -16.6 3.6 -18.6Z';
      B.f(rug, '#9a3e34').f(rug, B.lin(3, -26, 21, -15, [[0, 'rgba(255,230,200,.2)'], [1, 'rgba(30,10,6,.25)']]));
      { const cx = B.cx; cx.save(); cx.clip(new Path2D(rug)); for (let i = 0; i < 5; i++) B.s(`M${4 + i * 4} -30L${3 + i * 4} -12`, i % 2 ? '#2f5a3a' : '#e8d4a0', i % 2 ? 1.1 : .6, .55); for (const y of [-23.5, -19]) B.s(`M0 ${y}L24 ${y + 1}`, '#2f5a3a', 1, .5); cx.restore(); }
      B.s('M3.6 -18.6Q6 -16.6 10.4 -15.6Q16 -14.4 21.6 -16.2', '#5a221c', .8, .6);
      for (let i = 0; i < 6; i++) { const t = i / 5, x = 4.2 + t * 17, y = -18.2 + Math.sin(t * Math.PI) * 2.6 + t * 1.6; B.s(`M${x.toFixed(1)} ${y.toFixed(1)}l${(r() - .5).toFixed(2)} 1.8`, '#e8d4a0', .6, .7); }   // its fringe
      if (season === 'winter') {   // a dusting of snow on the lid and the rug
        B.f('M-21 ' + (lidY(-21) + .4).toFixed(2) + top.slice(1, 16).map(([x, y]) => `L${x.toFixed(2)} ${(y - .8).toFixed(2)}`).join('') + 'L21 ' + (lidY(21) + .4).toFixed(2) + 'Q0 ' + (lidY(0) + 3).toFixed(2) + ' -21 ' + (lidY(-21) + .4).toFixed(2) + 'Z', '#f4f8fb', .92);
      }
      B.tufts(r, -24.5, 1.2, 5, 3, season).tufts(r, 27.5, 0, 5, 3, season);   // (grass at its two ends only: across the front it hid the boards)
      if (season === 'spring' || season === 'summer') B.flowers(r, 23, 2, 6, 2, ['#f4f2ec', '#f2c84a']);
    }, anim: [{ id: 'tag', x: 3.2, y: -17.6, kind: 'sway', speed: 1.1, amp: .07, box: [-6, -2, 8, 16], draw(B) {
      // a luggage tag on a string from the hasp, for whoever owns it: it turns a little in the breeze
      B.s('M0 0Q.6 2.6 1.6 4.6', '#c8b48a', .7);
      B.f('M-2.6 4.8L4.4 4.2L5.4 12.2L-1.4 13Z', '#efe4c8').f('M-2.6 4.8L4.4 4.2L4.6 5.6L-2.4 6.2Z', '#ffffff', .5).f('M4.4 4.2L5.4 12.2L4.2 12.4L3.4 4.4Z', '#c8b48a', .6);
      B.f(B.circ(.9, 6.4, .7), '#8a6a3a').s('M-.8 9.2L3.6 8.8M-.6 10.8L2.6 10.5', '#a88a5a', .5, .7);
    } }] },
  };
})());

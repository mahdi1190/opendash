/* Painted rooms: the room behind the garden, where the red band plays. A small
 * gilded theatre in the Painted village's hand: velvet drapes, a lit stage of
 * old boards, a carpet worn by dancing, lanterns along a low wall, and the
 * green EXIT over the little door. The band, the mic stand and the coloured
 * beams stay live on top (94-garden-world-3back.js). */
GRA_ROOMS.back = {
  plate: '#12060a', ambient: .6,
  fx: {
    motes: [{ x0: 260, x1: 700, y0: 90, y1: 360, n: 22, c: '#ffe2b0', a: .5 }],
    flicker: [{ x: 38, y: 190, r: 70, c: '#ffb050', a: .22 }, { x: 922, y: 190, r: 70, c: '#ffb050', a: .22 }, { x: 240, y: 552, r: 46, c: '#ffc070', a: .2 }, { x: 480, y: 552, r: 46, c: '#ffc070', a: .2 }, { x: 720, y: 552, r: 46, c: '#ffc070', a: .2 }],
  },
  *paint(T) {
    const { cx } = T, D = EE.door, arch = 'M72 384V150Q72 40 200 40H760Q888 40 888 150V384Z';
    // the room round the theatre: dark panelling, warm from the lamps
    T.rect(0, 0, 960, 600, '#1a0a0c');
    T.planksV(0, 0, 480, 392, { base: '#2e1612', w: 44, wMax: 60, var: .14, gap: .5 });
    yield;
    T.planksV(480, 0, 960, 392, { base: '#2e1612', w: 44, wMax: 60, var: .14, gap: .5 });
    T.rect(0, 0, 960, 392, T.lin(0, 0, 0, 392, [[0, '#000', .55], [1, '#000', .1]]));
    yield;
    // inside the arch: the velvet backdrop, a soft spotlight pool, painted stars
    T.clip(arch, () => {
      T.rect(60, 30, 840, 360, T.lin(0, 30, 0, 390, [[0, '#6e2523'], [.55, '#43161a'], [1, '#2a0c10']]));
      for (let x = 72; x < 888; x += 26) T.rect(x, 30, 13, 360, T.lin(x, 0, x + 13, 0, [[0, '#000', 0], [.5, '#000', .18], [1, '#000', 0]]));
      T.glow(480, 330, 300, '#ffb070', .35);
      for (let i = 0; i < 26; i++) { const x = 250 + ((i * 97) % 460), y = 70 + ((i * 53) % 190); T.glow(x, y, 7, '#ffe0a8', .5); T.fill(`M${x} ${y - 4}l1.6 3 3.2.6-3.2.7-1.6 3-1.6-3-3.2-.7 3.2-.6z`, '#ffe8b8', .55); }
    });
    yield;
    // the drapes either side, deep folds, a swag and gold tassels
    for (const side of [0, 1]) {
      const x0 = side ? 720 : 72;
      T.clip(arch, () => {
        T.cloth(x0, 40, 168, 280, '#7e2a2c', { folds: 7, flare: side ? -10 : 10, hem: 10 });
        const swag = side ? 'M888 40H720Q740 100 760 102Q810 124 888 100Z' : 'M72 40H240Q220 100 200 102Q150 124 72 100Z';
        T.fill(swag, T.lin(0, 40, 0, 124, [[0, '#a83a38'], [1, '#5a1618']])); T.stroke(side ? 'M720 44Q760 96 888 96' : 'M240 44Q200 96 72 96', '#d8a850', 2.4, .7);
      });
      for (let i = 0; i < 6; i++) { const tx = side ? 864 - i * 28 : 96 + i * 28, ty = 104 - (i % 2) * 4; T.ell(tx, ty, 4, 4, T.rad(tx - 1, ty - 1, 5, [[0, '#fff0b0'], [1, '#8a6018']])); T.stroke(`M${tx} ${ty + 3}v9`, '#c89838', 2.4); }
      yield;
    }
    yield;
    // the gilded proscenium, lit along its inner edge
    T.stroke('M72 384V150Q72 40 200 40H760Q888 40 888 150V384', '#2a1408', 24);
    T.stroke('M72 384V150Q72 40 200 40H760Q888 40 888 150V384', T.lin(0, 40, 960, 384, [[0, '#f6d27a'], [.35, '#b98a3a'], [.6, '#e8c060'], [1, '#7a5322']]), 14);
    T.stroke('M66 384V150Q66 34 200 34H760Q894 34 894 150V384', '#fff0b0', 2, .45); T.stroke('M79 384V152Q79 47 200 47H760Q881 47 881 152V384', '#5a3410', 2, .6);
    for (const [x, y] of [[480, 38], [200, 40], [760, 40]]) { T.ell(x, y, 14, 9, T.rad(x - 4, y - 4, 14, [[0, '#fff2b8'], [1, '#8a5a18']])); T.ell(x, y, 5, 4, '#7a2a20'); }
    yield;
    // the stage: worn boards going back, a lit front edge
    cx.save(); cx.beginPath(); cx.rect(100, 300, 760, 72); cx.clip();
    for (let r = 0; r < 4; r++) for (let x = 100 - (r % 2) * 40; x < 860; x += 80) { const c = T.shade('#7a5440', (T.r() - .5) * .25); T.rect(x, 300 + r * 18, 80, 18, T.lin(0, 300 + r * 18, 0, 318 + r * 18, [[0, T.shade(c, .12)], [1, T.shade(c, -.15)]])); T.grain(x, 300 + r * 18, 80, 18, T.shade(c, -.45), .3, false, 4); T.rect(x + 79, 300 + r * 18, 1.5, 18, '#000', .4); }
    yield;
    T.rect(100, 300, 760, 72, T.lin(0, 300, 0, 372, [[0, '#000', .45], [1, '#000', 0]])); T.ell(480, 350, 260, 26, '#ffd8a0', .14);
    cx.restore();
    T.rect(100, 372, 760, 14, T.lin(0, 372, 0, 386, [[0, '#f6d27a'], [.5, '#b98a3a'], [1, '#6a4418']])); T.rect(100, 372, 760, 2, '#fff4c8', .6); T.rect(100, 386, 760, 6, '#1a0a04', .8);
    for (let x = 140; x < 860; x += 80) { T.ell(x, 379, 6, 3, '#fff2c0', .6); }
    yield;
    // the carpet in front: deep red, a border, the floor worn pale where people dance
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#4a1416'], [1, '#2a0a0e']]));
    for (let k = 0; k < 4; k++) { for (let i = 0; i < 350; i++) T.ell(T.r() * 960, 392 + T.r() * 174, .8 + T.r() * 2, .6 + T.r(), T.r() < .5 ? '#6a2224' : '#200608', .4); yield; }
    cx.save(); cx.translate(480, 478); cx.scale(1, .2);
    for (const [rr, c, a] of [[420, '#7a2a1e', .5], [400, '#c8984a', .35], [380, '#5a1a16', .4]]) { cx.lineWidth = 10; cx.strokeStyle = T.rgba(c, a); cx.beginPath(); cx.ellipse(0, 0, rr, rr, 0, 0, 6.3); cx.stroke(); }
    cx.restore();
    T.soft(480, 470, 300, 46, .16, '#ffd8b0');
    T.skirt(394, .55);
    yield;
    // the low wall at the front, three lanterns on it
    T.rect(0, 566, 960, 34, T.lin(0, 566, 0, 600, [[0, '#a8683a'], [.2, '#8a5228'], [1, '#4a2810']])); T.grain(0, 566, 960, 34, '#3a1e0c', .35, false, 5); T.rect(0, 566, 960, 3, '#e8b070', .6);
    for (const x of [240, 480, 720]) {
      T.stroke(`M${x} 544V566`, '#2a1a10', 2);
      T.rrect(x - 9, 544, 18, 24, 3, T.lin(x - 9, 0, x + 9, 0, [[0, '#5a3818'], [1, '#2a1608']])); T.rrect(x - 6, 548, 12, 16, 2, T.rad(x, 556, 10, [[0, '#fff2c0'], [.6, '#ffb040'], [1, '#c86a10']]));
      T.glow(x, 556, 60, '#ffb050', .5); T.ell(x, 568, 30, 4, '#ffc070', .3);
    }
    yield;
    // the torches either side of the arch
    for (const x of [38, 922]) {
      T.rect(x - 3, 214, 6, 40, T.lin(x - 3, 0, x + 3, 0, [[0, '#6a4424'], [1, '#2a1608']])); T.fill(`M${x - 9} 214h18l-3 -9h-12z`, T.lin(0, 205, 0, 214, [[0, '#d8a850'], [1, '#6a4418']]));
      T.glow(x, 190, 70, '#ff9a3a', .55); T.flame(x, 206, 1.6);
      T.rect(x - 40, 160, 80, 120, T.rad(x, 200, 80, [[0, '#ffb060', .12], [1, '#ffb060', 0]]));
    }
    yield;
    // the little door, arched, with its EXIT
    const mx = (D.x0 + D.x1) / 2;
    T.glow(mx, D.y0 + 60, 90, '#ffe2a0', .18);
    T.fill(`M${D.x0 - 6} ${D.y1}V${D.y0 + 38}Q${D.x0 - 6} ${D.y0 - 8} ${mx} ${D.y0 - 8}Q${D.x1 + 6} ${D.y0 - 8} ${D.x1 + 6} ${D.y0 + 38}V${D.y1}Z`, T.lin(D.x0, 0, D.x1, 0, [[0, '#8a6a4a'], [1, '#4a3420']]));
    const door = `M${D.x0 + 8} ${D.y1}V${D.y0 + 44}Q${D.x0 + 8} ${D.y0 + 10} ${mx} ${D.y0 + 10}Q${D.x1 - 8} ${D.y0 + 10} ${D.x1 - 8} ${D.y0 + 44}V${D.y1}Z`;
    T.fill(door, T.lin(D.x0, 0, D.x1, 0, [[0, '#6a3c1e'], [.5, '#8a5228'], [1, '#5a3218']])); T.clip(door, () => { T.grain(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0, '#3a1e0c', .4, true, 4); T.rect(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0, T.lin(0, D.y0, 0, D.y1, [[0, '#ffd090', .12], [1, '#000', .3]])); });
    T.stroke(`M${mx} ${D.y0 + 12}V${D.y1}`, '#2a1408', 2); T.ell(D.x1 - 20, D.y0 + 108, 4, 4, T.rad(D.x1 - 21, D.y0 + 107, 4, [[0, '#fff2b0'], [1, '#8a6018']]));
    T.rrect(mx - 25, D.y0 - 27, 50, 20, 3, '#0a2a16'); T.rrect(mx - 22, D.y0 - 24, 44, 14, 2, T.lin(0, D.y0 - 24, 0, D.y0 - 10, [[0, '#3ac070'], [1, '#14803a']])); T.glow(mx, D.y0 - 17, 34, '#5aff9a', .3);
    cx.font = 'bold 11px Inter, Arial, sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#eaffef'; cx.fillText('EXIT', mx, D.y0 - 13);
    T.fill(`M${D.x0} ${D.y1}L${D.x1 + 70} 590H${D.x0 - 10}Z`, '#ffd28a', .06);
    yield;
    T.finish({ dabs: 480, vignette: .5, vcol: '#0a0204' });
  },
};

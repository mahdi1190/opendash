/* Vale waterfront community hall. Ground anchor (0, 0); standing walls
 * span -120..120 in both variants. Raised roof trim overhangs by 8 only.
 * v0: assembly hall; v1: upper gallery and open bell lantern. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const rect = (x, y, w, h) => 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'z';
  const poly = points => 'M' + points.map(p => p.join(' ')).join('L') + 'z';
  const ellipse = (x, y, rx, ry) => 'M' + (x - rx) + ' ' + y + 'a' + rx + ' ' + ry + ' 0 1 0 ' + (rx * 2) + ' 0a' + rx + ' ' + ry + ' 0 1 0 ' + (-rx * 2) + ' 0';
  const windowAt = (body, x, y, w, h) => {
    body.push(['@stone.1', rect(x - 3, y - 3, w + 6, h + 7)], ['@frame', rect(x - 1.5, y - 1.5, w + 3, h + 3)],
      { f: '@glass.0', d: rect(x, y, w, h), glow: 'window' },
      ['@glass.1', poly([[x, y], [x + w * .7, y], [x, y + h * .6]]), .28],
      { s: '@frame', w: 1.6, cap: 'round', d: 'M' + (x + w / 2) + ' ' + y + 'v' + h + 'M' + x + ' ' + (y + h * .46) + 'h' + w },
      ['@stone.2', rect(x - 4, y + h + 2, w + 8, 3)]);
  };
  sceneObjDefine({
    id: 'building.vale-hall-large', category: 'building', size: [256, 226], variants: 2,
    seasonal: true, shapeBySeason: true, flippable: false,
    palette: { base: {
      plaster: ['#e7ddc5', '#c9bfa6', '#f5ecd6'], stone: ['#afa992', '#8c8875', '#d2ccb5'],
      roof: ['#536b70', '#3a5059', '#829393'], wood: ['#7a6247', '#4f4537', '#ac9270'],
      door: ['#3c6762', '#274c49', '#74918a'], frame: '#eee3c9', glass: ['#466776', '#c1d9d7'],
      brass: ['#b79a5c', '#e1c986'], snow: '#edf1e8'
    } },
    night: { glow: { window: '#ffd98a' }, on: .85 },
    shadow: { rx: 122, ry: 9, h: 158 }, reflect: true,
    tags: ['village', 'waterfront', 'community-hall', 'kit:temperate', 'role:building-mid'],
    credit: 'Original centered waterfront community hall for Vale',
    build(v, r, ctx) {
      const gallery = v === 1, top = gallery ? -132 : -96, ridge = top - 48, body = [];
      // Stone footing and warm plaster; no shrubs or furniture beyond the wall.
      body.push(['@plaster.0', rect(-120, top, 240, -top)], ['@plaster.1', rect(96, top, 24, -top), .38],
        ['@stone.0', rect(-120, -13, 240, 13)], ['@stone.1', rect(-120, -4, 240, 4)],
        ['@plaster.2', rect(-110, top + 5, 3, -top - 19), .5]);
      for (const x of [-120, 110]) for (let y = top + 3, row = 0; y < -14; y += 13, row++) {
        body.push(['@stone.0', rect(x, y, 10, Math.min(11, -14 - y))], ['@stone.2', rect(x, y, 10, 1.2), .55]);
      }
      body.push({ s: '@stone.1', w: .8, op: .5, d: 'M-120 -13h240M-93 -12v8M-64 -12v8M64 -12v8M93 -12v8' });
      // Broad hipped slate roof, lit ridge and restrained courses.
      body.push(['@wood.1', rect(-124, top - 1, 248, 6)],
        ['@roof.0', poly([[-128, top], [-83, ridge], [83, ridge], [128, top]])],
        ['@roof.1', poly([[83, ridge], [128, top], [91, top], [64, ridge]]), .75]);
      for (let row = 1; row <= 5; row++) {
        const t = row / 6, y = ridge + 48 * t, x = 83 + 45 * t;
        body.push({ s: '@roof.1', w: 1, op: .5, d: 'M' + (-x) + ' ' + y + 'H' + x });
      }
      body.push(['@roof.2', rect(-83, ridge - 2, 166, 2)], ['@wood.2', rect(-126, top, 252, 2), .8]);
      if (ctx.season === 'winter') body.push(['@snow', poly([[-84, ridge - 2], [84, ridge - 2], [88, ridge + 4], [60, ridge + 3], [27, ridge + 5], [-16, ridge + 3], [-54, ridge + 5], [-88, ridge + 4]]), .9]);
      // Four tall windows flank a single centered entrance.
      for (const x of [-98, -63, 35, 70]) windowAt(body, x, -76, 28, 38);
      body.push(['@stone.0', rect(-24, -68, 48, 68)], ['@stone.2', rect(-24, -68, 48, 4)],
        ['@wood.1', rect(-18, -62, 36, 62)], ['@door.0', rect(-16, -60, 32, 60)],
        ['@door.1', rect(0, -60, 16, 60), .36], { f: '@glass.0', d: rect(-12, -56, 24, 12), glow: 'window' },
        { s: '@frame', w: 1.2, d: 'M0 -56v12' },
        { s: '@door.2', w: 1, op: .7, d: 'M-12 -37h9v29h-9zM3 -37h9v29H3z' },
        ['@brass.0', ellipse(-3, -25, 1.3, 1.3)], ['@brass.1', ellipse(3, -25, 1.3, 1.3)],
        ['@stone.2', rect(-29, -3, 58, 3)]);
      if (gallery) {
        // A usable-looking upper gallery; a quiet cornice separates the floors.
        body.push(['@wood.0', rect(-110, -89, 220, 5)], ['@wood.2', rect(-110, -89, 220, 1.4)]);
        for (const x of [-98, -63, -14, 35, 70]) windowAt(body, x, -121, 28, 23);
        // Open bell lantern, on the roof centre rather than an offset tower.
        body.push(['@wood.1', rect(-22, -183, 44, 6)], ['@wood.0', rect(-19, -211, 38, 30)],
          ['@roof.1', rect(-14, -207, 28, 24)], ['@wood.2', rect(-19, -211, 4, 30)], ['@wood.1', rect(15, -211, 4, 30)],
          { s: '@wood.2', w: 2, d: 'M0 -210v8' },
          ['@brass.0', 'M-7 -193q0 -9 7 -9q7 0 7 9l3 4h-20z'], ['@brass.1', ellipse(-2, -196, 2, 4)],
          ['@brass.0', ellipse(0, -187, 2, 2)],
          ['@roof.0', poly([[-25, -211], [0, -226], [25, -211]])],
          ['@roof.1', poly([[0, -226], [25, -211], [8, -211]])], ['@roof.2', rect(-25, -211, 50, 2)]);
        if (ctx.season === 'winter') body.push(['@snow', 'M-23 -212L0 -226l23 14l-10 -2l-13 -8l-13 8z', .85]);
      } else {
        // Small central front gable gives the hall an entrance axis without a tower.
        body.push(['@plaster.0', poly([[-37, -96], [0, -130], [37, -96]])],
          { s: '@wood.0', w: 3, cap: 'round', d: 'M-40 -96L0 -134L40 -96' },
          ['@stone.0', ellipse(0, -109, 10, 10)], { f: '@glass.0', d: ellipse(0, -109, 7, 7), glow: 'window' },
          { s: '@frame', w: 1.3, d: 'M-7 -109H7M0 -116v14' });
      }
      return { body };
    }
  });
})();

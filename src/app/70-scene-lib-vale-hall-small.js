/* Small Vale lake hall: one quiet village facade, anchored at the centre of
 * its threshold. Standing walls span exactly -80..80; all feet end at y=0.
 * Roof overhang is artwork only. Native placement owns the external name sign.
 * Pure scene registration; no clocks, DOM, gameplay state or external assets. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const rect = (x, y, w, h) => 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + -w + 'z';
  const ell = (x, y, rx, ry) => 'M' + (x - rx) + ' ' + y + 'a' + rx + ' ' + ry + ' 0 1 0 ' + (rx * 2) + ' 0a' + rx + ' ' + ry + ' 0 1 0 ' + (-rx * 2) + ' 0';
  sceneObjDefine({
    id: 'building.vale-hall-small', category: 'building', variants: 1,
    size: [176, 116], box: [-88, -114, 88, 2], seasonal: true, flippable: false,
    parts: ['body', 'lit'],
    palette: {
      base: {
        plaster: ['#e7e2cb', '#c8ceb5', '#f5f0dc'],
        wood: ['#8d7958', '#655b48', '#b2a07b'],
        sage: ['#72866c', '#536854', '#9eae88'],
        slate: ['#566771', '#3e505c', '#788a90'],
        stone: ['#aaa99a', '#818b83', '#d0cbb8'],
        frame: '#eee9d6', glass: ['#496871', '#bdd9d6'],
        brass: '#c5a960', paper: '#e8ddba', leaf: ['#4d714e', '#779565'], bloom: '#efe1b1'
      },
      spring: { leaf: ['#52764c', '#91ab6b'], bloom: '#eee4b4' },
      summer: { leaf: ['#426d49', '#799b61'], bloom: '#f0d9bd' },
      autumn: { leaf: ['#697449', '#9b995e'], bloom: '#d8ac72' },
      winter: { leaf: ['#526858', '#809282'], bloom: '#bec6b4' }
    },
    night: { glow: { window: '#ffd98a' }, on: 1 },
    shadow: { rx: 80, ry: 6, h: 108 },
    tags: ['village', 'lake', 'hall', 'kiosk', 'kit:temperate', 'role:building-mid'],
    build() {
      const body = [
        // Plaster front and timber corners retain the exact standing width.
        ['@plaster.0', rect(-80, -70, 160, 70)],
        ['@plaster.2', rect(-76, -67, 8, 61), .6],
        ['@plaster.1', rect(60, -70, 20, 70), .65],
        ['@stone.0', rect(-80, -7, 160, 7)],
        ['@stone.1', rect(-80, -2, 160, 2)],
        ['@wood.0', rect(-80, -70, 4, 63)],
        ['@wood.1', rect(76, -70, 4, 63)],
        ['@wood.2', rect(-80, -70, 1.2, 62)],
        ['@wood.1', rect(-80, -70, 160, 5)],
        ['@plaster.1', 'M-76 -65H76V-60L-76 -62Z', .55],
        // Modest hipped slate roof, with light on the left and a shaded hip.
        ['@slate.0', 'M-88 -70L-58 -108H58L88 -70Z'],
        ['@slate.1', 'M58 -108L88 -70H59L40 -108Z', .72],
        ['@slate.2', 'M-88 -70L-58 -108H-52L-80 -70Z', .5],
        { s: '@slate.1', w: 1, op: .48, d: 'M-81 -79H80M-74 -88H73M-67 -97H66' },
        { s: '@slate.2', w: .7, op: .45, d: 'M-78 -78H77M-71 -87H70M-64 -96H63' },
        { s: '@slate.1', w: .7, op: .38, d: 'M-47 -107L-51 -98M-22 -107L-24 -98M3 -107V-98M28 -107L30 -98M-57 -96L-61 -89M-33 -96L-35 -89M-9 -96V-89M15 -96L16 -89M40 -96L42 -89M-69 -87L-73 -80M-44 -87L-47 -80M-19 -87L-20 -80M6 -87V-80M31 -87L33 -80M55 -87L58 -80' },
        ['@slate.2', rect(-59, -110, 118, 2)],
        ['@slate.1', rect(-88, -71, 176, 3)],
        ['@wood.2', rect(-84, -68, 168, 1.4)]
      ];
      for (const x of [-66, 36]) {
        body.push(
          ['@sage.1', rect(x - 3, -58, 36, 32)],
          ['@frame', rect(x - 1.5, -56.5, 33, 29)],
          { f: '@glass.0', d: rect(x, -55, 30, 26), glow: 'window' },
          ['@glass.1', 'M' + x + ' -55h13l-13 18z', .28],
          { s: '@frame', w: 1.8, d: 'M' + (x + 15) + ' -55v26M' + x + ' -43h30' },
          ['@wood.2', rect(x - 4, -28, 38, 2.5)],
          // Wall-mounted boxes, not separate pots on the walking ground.
          ['@sage.0', 'M' + (x - 2) + ' -25h34l-2 8h-30z'],
          ['@sage.1', rect(x, -20, 30, 3)],
          ['@sage.2', rect(x - 2, -25, 34, 1.5)]
        );
        for (let i = 0; i < 5; i++) {
          const px = x + 2 + i * 6.5;
          body.push(['@leaf.' + (i % 2), ell(px, -26 - i % 2, 4.2, 3.2)]);
          if (i === 1 || i === 3) body.push(['@bloom', ell(px, -29, 1.5, 1.3)]);
        }
      }
      body.push(
        // A deep central doorway, a small porch hood and a flush stone sill.
        ['@wood.1', rect(-17, -46, 34, 46)],
        ['@wood.2', rect(-17, -46, 3, 43)],
        ['@sage.0', rect(-13, -43, 26, 42)],
        ['@sage.1', rect(10, -43, 3, 42)],
        ['@wood.1', rect(-9, -39, 18, 13)],
        { f: '@glass.0', d: rect(-7.5, -37.5, 15, 10), glow: 'window' },
        { s: '@frame', w: 1.2, d: 'M0 -37.5v10' },
        ['@sage.1', rect(-8, -21, 16, 14)],
        ['@sage.2', rect(-7, -20, 14, 1)],
        ['@brass', ell(8, -22, 1.3, 1.3)],
        ['@wood.0', 'M-22 -46V-50L0 -63L22 -50V-46Z'],
        ['@slate.1', 'M-25 -49L0 -66L25 -49H20L0 -61L-20 -49Z'],
        { s: '@wood.2', w: 1.2, cap: 'round', d: 'M-18 -49L0 -59L18 -49M0 -59v10' },
        ['@stone.2', rect(-19, -3, 38, 2)],
        ['@stone.1', rect(-19, -1, 38, 1)],
        // A little glazed notice case: pinned sheets, no baked lettering.
        ['@wood.1', rect(-32, -32, 12, 17)],
        ['@wood.2', rect(-32, -32, 12, 1.2)],
        ['@sage.1', rect(-30.5, -30, 9, 13)],
        ['@paper', 'M-29 -29h6v5h-6zM-28 -23h5v4h-5z'],
        ['@brass', ell(-26, -28.5, .55, .55)]
      );
      // These small warm reflections appear only in the existing night pass.
      const lit = [
        ['#ffd98a', 'M-64 -28H-38L-36 -25H-66Z', .16],
        ['#ffd98a', 'M38 -28H64L66 -25H36Z', .16],
        ['#ffd98a', rect(-10, -3, 20, 1), .2]
      ];
      return { body, lit };
    }
  });
})();

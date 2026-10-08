/* ============================================================
   SCENE LIBRARY: landmark.khor-virap (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Started from `scene upgrade asia-west/am-signature --box 360,560,705,782` (the old art's
   monastery on its mound), then REDRAWN as respectful architecture:
   - the real structure: the walled monastery on its rocky knoll above the Ararat plain: the
     stone enclosure wall with its round towers and slit loopholes, the arched gate with the
     small open belfry over it, and behind the wall the main church (a cruciform stone church:
     the near arm's gable, the long roof of the cross arms, the tall drum with its narrow
     arched windows and the conical stone roof) and the small chapel on the left; the low
     roofs of the cells along the inner wall. Pale tuff and stone; no crosses or carved
     symbols are drawn, only the buildings
   - lit from the left: the right-hand faces, the receding east wall and the drum's right half
     in shade
   - seasons (shapeBySeason): the grass on the knoll green in spring, straw in summer, tawny in
     autumn; snow on the roofs, the wall tops and the knoll in winter
   - night: the 'lit' part floodlights the walls and the church warm; the drum's windows and
     the chapel window glow
   No text. Anchor: the ground at the middle of the knoll's foot.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define, seasons } = sceneDraw;
  const arch = (x, yb, w, h) => `M${f1(x - w / 2)} ${f1(yb)}v${f1(-(h - w / 2))}a${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(w)} 0v${f1(h - w / 2)}z`;
  const WY = -40, WT = -84;                                         // the foot and the top of the enclosure wall
  const TOWERS = [[-150, 16, -96], [-10, 13, -91], [118, 15, -93]];  // round towers: x, radius, top
  define({
    id: 'landmark.khor-virap', category: 'landmark', size: [380, 196], variants: 1, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      stone: ['#c8ac8a', '#9a7e62', '#dcc4a2', '#7a6450'], church: ['#d6b690', '#a8886a', '#e6cca8'], roof: ['#8e7a66', '#6a5848', '#b09a82'],
      rock: ['#9a8468', '#76644e', '#5e5040'], dark: ['#3a2e26', '#56463a'], snow: ['#f2f6fa', '#d0dae4'], flood: '#ffc884',
    } }, seasons({
      grass: { spring: ['#7e9a52', '#94ae62'], summer: ['#b0a068', '#c4b47a'], autumn: ['#a88a54', '#bc9c62'], winter: ['#8a8a7a', '#a0a090'] },
    })),
    night: { glow: { window: '#ffcc80', lamp: '#ffe0a8' }, on: 0.85 },
    shadow: { rx: 180, ry: 8, h: 120 },
    reflect: true,
    tags: ['landmark', 'place:asia/country:AM', 'asia', 'asia-west', 'monastery', 'church', 'signature'],
    credit: 'native (scene engine upgrade), after the hand-drawn am-signature art',
    build(v, r, ctx) {
      const body = [], lit = [], winter = ctx.season === 'winter';
      // the knoll: its rock, the shaded east side, outcrops, the grass, the path up to the gate
      const knoll = `M-190 0Q-176 -26 -120 ${WY - 2}H124Q176 -28 190 0z`;
      body.push(['@rock.0', knoll], ['@rock.1', `M60 ${WY - 2}H124Q176 -28 190 0H90Q84 -22 60 ${WY - 2}z`, 0.7]);
      for (let k = 0; k < 10; k++) { const x = -170 + k * 36 + r() * 12, y = -6 - r() * 26; body.push({ f: k % 3 ? '@rock.2' : '@rock.1', d: sceneDraw.blob(r, x, y, 8 + r() * 8, 4 + r() * 3, 6, 0.5), op: 0.8, detail: k % 2 === 1 }); }
      let g0 = '', g1 = '';
      for (let k = 0; k < 16; k++) { const x = -178 + k * 23 + r() * 8, y = -4 - r() * 30, d = sceneDraw.blob(r, x, y, 12 + r() * 10, 1.8 + r() * 1.2, 7, 0.5); if (k % 2) g0 += d; else g1 += d; }
      body.push(['@grass.0', g0], { f: '@grass.1', d: g1, detail: true });
      body.push(['@stone.2', poly([[-104, 0], [-74, WY], [-52, WY], [-70, 0]]), 0.9], { s: '@stone.1', w: 0.8, op: 0.6, d: Array.from({ length: 8 }, (_, k) => { const t = (k + 1) / 9, y = WY * (1 - t); return `M${f1(-74 - 30 * t)} ${f1(y)}h${f1(22 + 12 * t)}`; }).join(''), detail: true });
      // the cells' low roofs along the inner wall, the small chapel on the left
      body.push(['@roof.2', rect(64, WT - 8, 50, 8)]);
      body.push(['@church.0', rect(-128, -100, 58, 16)], ['@roof.0', poly([[-132, -100], [-99, -114], [-66, -100]])], ['@roof.1', poly([[-99, -114], [-66, -100], [-82, -100]]), 0.8], { f: '@dark.0', d: arch(-99, -88, 5, 9), glow: 'window' });
      // the main church: the cross arms' walls and long roof, the near arm's gable, the drum and its conical roof
      const cx = 40;
      body.push(['@church.0', rect(cx - 52, -114, 104, 30)], ['@church.1', rect(cx + 26, -114, 26, 30), 0.85]);
      body.push(['@roof.0', poly([[cx - 56, -113], [cx - 40, -125], [cx + 40, -125], [cx + 56, -113]])], ['@roof.1', poly([[cx + 40, -125], [cx + 56, -113], [cx + 64, -115], [cx + 47, -126]])], { s: '@roof.2', w: 0.7, op: 0.6, d: `M${cx - 56} -113H${cx + 56}M${cx - 40} -125H${cx + 40}`, detail: true });
      // the far (west) arm's gable end, lit, at the left of the long roof
      body.push(['@church.2', poly([[cx - 56, -113], [cx - 40, -125], [cx - 44, -113]]), 0.9]);
      body.push(['@church.2', poly([[cx - 22, WT], [cx + 22, WT], [cx + 22, -112], [cx, -128], [cx - 22, -112]])], ['@roof.1', poly([[cx - 25, -111], [cx, -130], [cx + 25, -111], [cx + 25, -108], [cx, -126], [cx - 25, -108]])]);
      body.push({ s: '@church.1', w: 0.7, op: 0.6, d: `M${cx - 22} -104H${cx + 22}M${cx - 22} -96H${cx + 22}M${cx - 52} -104H${cx - 22}M${cx + 22} -104H${cx + 52}`, detail: true }, { f: '@dark.0', d: arch(cx, -95, 4, 12) + arch(cx - 38, -97, 3, 9) + arch(cx + 36, -97, 3, 9), glow: 'window' });
      const dr = 17, dTop = -164;
      body.push(['@church.0', rect(cx - dr, dTop, 2 * dr, -124 - dTop)], ['@church.1', rect(cx + 2, dTop, dr - 2, -124 - dTop), 0.8]);
      let dw = ''; for (const dx of [-11, -3.5, 4, 11]) dw += arch(cx + dx, -132, 3, 14);
      body.push({ f: '@dark.0', d: dw, glow: 'window' }, { s: '@church.2', w: 0.8, op: 0.7, d: `M${cx - dr} -128H${cx + dr}` + [-15, -7.5, 0, 7.5, 15].map(dx => `M${cx + dx} ${dTop + 2}v34`).join(''), detail: true }, ['@church.2', rect(cx - dr - 1.5, dTop - 2, 2 * dr + 3, 3)]);
      body.push(['@roof.0', poly([[cx - dr - 2, dTop - 1], [cx, dTop - 30], [cx + dr + 2, dTop - 1]])], ['@roof.1', poly([[cx, dTop - 30], [cx + dr + 2, dTop - 1], [cx + 4, dTop - 1]]), 0.8], { s: '@roof.2', w: 0.6, op: 0.5, d: [-12, -6, 6, 12].map(dx => `M${cx} ${dTop - 29}L${cx + dx} ${dTop - 1}`).join(''), detail: true }, ['@roof.1', ell(cx, dTop - 31, 2, 2)]);
      // the enclosure wall: its face, coping, the receding east wall, courses, loopholes, weather streaks
      body.push(['@stone.0', rect(-150, WT, 268, WY - WT)], ['@stone.2', rect(-152, WT - 2.5, 272, 3)], ['@stone.1', poly([[118, WY], [168, WY - 7], [168, WT - 5], [118, WT]])], ['@stone.2', poly([[118, WT - 2.5], [168, WT - 7.5], [168, WT - 5], [118, WT]]), 0.8]);
      for (const [x0, x1] of [[-150, -76], [-48, 30], [52, 118]]) { let c = ''; for (let y = WY - 6; y > WT; y -= 6) c += `M${x0} ${y}H${x1}`; body.push({ s: '@stone.1', w: 0.5, op: 0.4, d: c, detail: true }); }
      body.push({ s: '@stone.1', w: 0.5, op: 0.4, d: Array.from({ length: 6 }, (_, k) => `M118 ${WY - 6 - k * 6.5}L168 ${WY - 12 - k * 6.2}`).join(''), detail: true });
      body.push({ f: '@dark.1', d: [-120, -92, 6, 74, 98].map(x => rect(x, WT + 12, 2, 8)).join('') + rect(140, WT + 8, 1.6, 7), detail: true }, { s: '@stone.3', w: 2, op: 0.16, d: 'M-130 -82v20M-40 -82v14M70 -82v24M150 -84v18', detail: true });
      // the gate and the small open belfry over it
      body.push(['@stone.2', arch(-62, WY, 22, 30)], { f: '@dark.0', d: arch(-62, WY, 16, 26) });
      body.push({ s: '@stone.1', w: 0.6, op: 0.6, d: [-80, -55, -30, 0, 30, 55, 80].map(a => { const t = a * Math.PI / 180, c = -62 + Math.sin(t) * 8, y = WY - 18 - Math.cos(t) * 8; return `M${f1(c)} ${f1(y)}L${f1(c + Math.sin(t) * 3)} ${f1(y - Math.cos(t) * 3)}`; }).join(''), detail: true });
      body.push(['@stone.1', poly([[-104, 0], [-74, WY], [-76, WY], [-108, 0]]) + poly([[-70, 0], [-52, WY], [-50, WY], [-66, 0]]), 0.8]);
      body.push(['@stone.0', rect(-74, WT - 14, 24, 14)], { f: '@dark.1', d: rect(-72, WT - 28, 20, 14) }, ['@stone.2', rect(-74, WT - 28, 3, 14) + rect(-65, WT - 28, 3, 14) + rect(-56, WT - 28, 3, 14) + rect(-53, WT - 28, 3, 14)], ['@roof.0', poly([[-76, WT - 28], [-62, WT - 44], [-48, WT - 28]])], ['@roof.1', poly([[-62, WT - 44], [-48, WT - 28], [-58, WT - 28]]), 0.8]);
      // the round towers (the fourth, at the far end of the east wall, smaller with the distance)
      for (const [x, rr, top] of TOWERS.concat([[168, 10, WT - 14]])) {
        const foot = x > 160 ? WY - 7 : WY;
        body.push(['@stone.0', rect(x - rr, top, 2 * rr, foot - top)], ['@stone.1', rect(x + rr * 0.15, top, rr * 0.85, foot - top), 0.75], ['@stone.2', ell(x, top, rr + 1, 2.4)]);
        let c = `M${f1(x - 1)} ${f1(top + 12)}v6M${f1(x - rr * 0.6)} ${f1(top + 26)}v6`; for (let y = foot - 7; y > top + 4; y -= 7) c += `M${f1(x - rr)} ${f1(y)}h${f1(2 * rr)}`;
        body.push({ s: '@stone.3', w: 0.6, op: 0.45, d: c, detail: true }, { f: '@stone.3', d: rect(x - rr, top + 1.5, 2 * rr, 2), op: 0.35, detail: true });
      }
      if (winter) body.push(['@snow.0', rect(-152, WT - 4, 272, 2.6) + poly([[118, WT - 4], [168, WT - 9], [168, WT - 7], [118, WT - 2]]) + poly([[cx - 40, -126], [cx + 40, -126], [cx + 52, -116], [cx - 52, -116]]) + poly([[cx - 2, dTop - 28], [cx + 9, dTop - 14], [cx - 9, dTop - 14]]) + poly([[-99, -114], [-114, -107], [-84, -107]]) + TOWERS.map(([x, rr, top]) => ell(x, top - 0.5, rr, 2)).join('')], ['@snow.1', g1, 0.85]);
      // night: the walls and the church floodlit warm from below
      // (the light takes the buildings' own outlines: the wall and its towers, then the church's walls, gable and drum)
      lit.push({ f: { lin: [[0, '@flood', 0.42], [1, '@flood', 0.08]], x1: 0, y1: WY, x2: 0, y2: WT - 20 }, d: rect(-150, WT, 268, WY - WT) + poly([[118, WY], [168, WY - 7], [168, WT - 5], [118, WT]]) + TOWERS.map(([x, rr, top]) => rect(x - rr, top, 2 * rr, WY - top)).join('') });
      lit.push({ f: { lin: [[0, '@flood', 0.38], [1, '@flood', 0.06]], x1: 0, y1: WT, x2: 0, y2: dTop - 30 }, d: rect(cx - 52, -114, 104, 30) + poly([[cx - 22, WT], [cx + 22, WT], [cx + 22, -112], [cx, -128], [cx - 22, -112]]) + rect(cx - dr, dTop, 2 * dr, -124 - dTop) });
      return { body, lit };
    },
  });
})();

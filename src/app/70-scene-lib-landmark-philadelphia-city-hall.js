/* ============================================================
   SCENE LIBRARY: landmark.philadelphia-city-hall (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Philadelphia City Hall at Penn Square, seen down the Parkway. Drawn by hand after its form:
   - the Second Empire block in white marble on a granite plinth: storeys of arched windows
     between paired pilasters, the cornice and balustrade, the slate mansard roofs with their
     dormers, the taller corner pavilions with curved pavilion roofs and cresting, and the
     central pavilion with the great arched portal into the courtyard
   - the tower over the central pavilion: the masonry shaft with corner piers, arched openings
     and a balustrade; the painted iron clock stage with a clock face on each side (tick marks
     and hands only, no numerals) under a curved hood; the octagonal drum, the ribbed bell dome
     with its oculi and the lantern; the top is a PLAIN SPIRE CAP (no figure)
   - light from the left: lit faces, a narrow shaded side on the right
   - night: windows lit in seeded groups (glow), the clock faces glowing, the 'lit' part:
     floodlight washes on the tower and the facade, the portal's warm glow, the aviation light
   No text, no figures, no emblems. Anchor: the ground at the middle of the facade.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const WL = -230, WR = 230, C = -120;            // the facade's ends and the main cornice
  define({
    id: 'landmark.philadelphia-city-hall', category: 'landmark', size: [476, 560], box: [-236, -560, 246, 2], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      marble: ['#eee8da', '#d8cfbc', '#b6ac96', '#958b76'], granite: ['#aaa499', '#878177', '#5f5a53'],
      slate: ['#6a777c', '#515d63', '#3c464b'], iron: ['#f0e7d0', '#d6caac', '#ac9f82'],
      glass: ['#46525e', '#2e3842'], clock: ['#f8f4e8', '#8c7c5c', '#2a2a32'],
      flood: '#ffe8be', warm: '#ffd796', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffe2a8', lamp: '#fff6dc' }, on: 0.6 },
    shadow: { rx: 230, ry: 8, h: 120 },
    reflect: true,
    tags: ['landmark', 'place:us/place:philadelphia', 'us', 'us-northeast', 'civic', 'clock', 'tower'],
    credit: 'native, drawn for the composed philadelphia-city-hall scene (after the hand-drawn art)',
    build(v, r) {
      const body = [], lit = [];
      const lin = (a, b, y1, y2) => ({ lin: [[0, a], [1, b]], x1: 0, y1, x2: 0, y2 });
      // ---- the block: plinth, the marble wall, the receding right side
      body.push(['@granite.1', rect(WL, -24, WR - WL, 24)], ['@granite.2', poly([[WR, 0], [WR + 14, -3], [WR + 14, -26], [WR, -24]])]);
      body.push({ s: '@granite.2', w: 0.6, op: 0.5, d: 'M-230 -8H230M-230 -16H230', detail: true });
      body.push({ f: lin('@marble.0', '@marble.1', C, -24), d: rect(WL, C, WR - WL, C * -1 - 24) });
      body.push({ f: lin('@marble.2', '@marble.3', C, 0), d: poly([[WR, -24], [WR + 14, -26], [WR + 14, C - 6], [WR, C]]) });
      // storey bands, the cornice and its balustrade
      body.push({ s: '@marble.2', w: 1, op: 0.7, d: 'M-230 -56H230M-230 -82H230M-230 -102H230', detail: true });
      body.push(['@marble.0', rect(WL - 3, C - 5, WR - WL + 6, 6)], ['@marble.2', rect(WL - 3, C + 1, WR - WL + 6, 2), 0.8]);
      let bal = ''; for (let x = WL; x < WR; x += 5) bal += `M${x} ${C - 5}v-5`;
      body.push({ s: '@marble.1', w: 1.2, op: 0.8, d: bal + `M${WL} ${C - 11}H${WR}`, detail: true });
      // windows: the arched lower storey, then three rows of square-headed ones, bay by bay (none at the portal)
      const bays = []; for (let x = WL + 8; x < WR - 6; x += 18) if (x < -84 || x > 72) bays.push(x);
      let w1 = '', w2 = '', pil = '';
      for (const x of bays) {
        w1 += `M${x + 2} -30V-46a4 4 0 0 1 8 0V-30z`;
        w2 += rect(x + 2, -76, 8, 14) + rect(x + 2, -98, 8, 11) + rect(x + 3, -116, 6, 9);
        pil += `M${x - 2} -26V${C}M${x + 14} -26V${C}`;
      }
      body.push(['@glass.0', w1, 0.9], ['@glass.0', w2, 0.85], { s: '@marble.1', w: 1.6, op: 0.7, d: pil, detail: true });
      let sill = ''; for (const x of bays) sill += `M${x + 1} -29h10M${x + 1} -61h10M${x + 1} -86h10`;
      body.push({ s: '@marble.3', w: 0.8, op: 0.5, d: sill, detail: true }, { f: '@granite.2', d: bays.map(x => rect(x + 3, -18, 6, 8)).join(''), op: 0.7, detail: true });
      // ---- the corner pavilions: proud of the wall, taller, with curved pavilion roofs, dormers and cresting
      for (const px of [WL, WR - 52]) {
        body.push({ f: lin('@marble.0', '@marble.1', -142, -24), d: rect(px, -142, 52, 118) }, ['@marble.2', rect(px + 48, -142, 4, 118), 0.7]);
        body.push(['@marble.0', rect(px - 3, -146, 58, 5)], { s: '@marble.2', w: 1.4, op: 0.7, d: `M${px + 6} -26V-142M${px + 46} -26V-142M${px + 2} -60H${px + 50}M${px + 2} -100H${px + 50}`, detail: true });
        body.push({ f: lin('@slate.0', '@slate.2', -190, -146), d: `M${px - 2} -146Q${px} -172 ${px + 10} -188H${px + 42}Q${px + 52} -172 ${px + 54} -146z` });
        body.push(['@slate.2', `M${px + 40} -146Q${px + 48} -170 ${px + 42} -188Q${px + 52} -172 ${px + 54} -146z`, 0.6], ['@iron.2', rect(px + 8, -192, 36, 4)]);
        body.push({ s: '@iron.2', w: 1, d: `M${px + 10} -192v-6M${px + 18} -192v-4M${px + 26} -192v-8M${px + 34} -192v-4M${px + 42} -192v-6`, detail: true });
        body.push({ f: '@marble.1', d: `M${px + 12} -150v-14a6 6 0 0 1 12 0v14zM${px + 30} -150v-14a6 6 0 0 1 12 0v14z`, detail: true }, ['@glass.1', ell(px + 18, -160, 3, 3) + ell(px + 36, -160, 3, 3), 0.9]);
        body.push(['@glass.0', rect(px + 10, -76, 10, 14) + rect(px + 32, -76, 10, 14) + rect(px + 10, -96, 10, 12) + rect(px + 32, -96, 10, 12) + rect(px + 12, -134, 8, 12) + rect(px + 32, -134, 8, 12), 0.85]);
        body.push(['@glass.0', `M${px + 18} -30V-48a8 8 0 0 1 16 0V-30z`, 0.9]);
      }
      // ---- the wing mansards with their dormers
      for (const [a, b] of [[WL + 52, -78], [78, WR - 52]]) {
        body.push({ f: lin('@slate.0', '@slate.2', -146, C - 5), d: `M${a} ${C - 5}L${a + 4} -146H${b - 4}L${b} ${C - 5}z` });
        let dm = '', dg = '';
        for (let x = a + 10; x < b - 12; x += 18) { dm += `M${x} ${C - 5}v-15l6 -6l6 6v15z`; dg += rect(x + 3, C - 17, 6, 9); }
        body.push({ f: '@marble.1', d: dm, detail: true }, ['@glass.1', dg, 0.85], { s: '@slate.2', w: 0.6, op: 0.6, d: `M${a + 4} -140H${b - 4}`, detail: true });
      }
      // ---- the central pavilion and the great portal
      body.push({ f: lin('@marble.0', '@marble.1', -152, 0), d: rect(-80, -152, 160, 152) }, ['@marble.2', rect(76, -152, 4, 152), 0.7]);
      body.push(['@marble.0', rect(-84, -156, 168, 6)], { s: '@marble.2', w: 1.2, op: 0.7, d: 'M-80 -60H80M-80 -104H80M-80 -132H80', detail: true });
      body.push(['@marble.2', 'M-30 0V-50A30 30 0 0 1 30 -50V0z'], ['@glass.1', 'M-22 0V-48A22 22 0 0 1 22 -48V0z']);
      body.push({ s: '@marble.0', w: 4, d: 'M-40 0V-84M-34 0V-84M34 0V-84M40 0V-84', detail: true }, ['@marble.1', 'M-48 -84H48L0 -100z'], { s: '@marble.3', w: 0.8, op: 0.6, d: 'M-44 -86H44L0 -98z', detail: true });
      let cw = ''; for (const x of [-72, -58, 46, 60]) cw += rect(x, -50, 8, 18) + rect(x, -96, 8, 14);
      for (const x of [-66, -44, -22, 0, 22, 44, 66]) cw += rect(x - 4, -126, 8, 14) + rect(x - 3, -146, 6, 9);
      body.push(['@glass.0', cw, 0.85]);
      // ---- the tower: the masonry base stage, the shaft, its balustrade
      const T0 = -156, T1 = -204, T2 = -326;
      body.push({ f: lin('@marble.0', '@marble.1', T1, T0), d: rect(-54, T1, 108, T0 - T1) }, ['@marble.2', rect(54, T1 + 2, 9, T0 - T1 - 2)]);
      body.push({ f: lin('@marble.0', '@marble.1', T2, T1), d: rect(-45, T2, 90, T1 - T2) }, { f: lin('@marble.2', '@marble.3', T2, T1), d: rect(45, T2 + 2, 10, T1 - T2 - 2) });
      body.push(['@marble.0', rect(-58, T1 - 4, 116, 6)], ['@marble.0', rect(-49, -264, 98, 5)], ['@marble.0', rect(-50, T2 - 6, 100, 8)]);
      // corner piers and the arched openings of each stage
      body.push(['@marble.0', rect(-54, T1, 12, T0 - T1) + rect(42, T1, 12, T0 - T1)], ['@marble.0', rect(-45, T2, 11, T1 - T2) + rect(34, T2, 11, T1 - T2)]);
      body.push({ s: '@marble.2', w: 1, op: 0.6, d: 'M-42 -160V-200M42 -160V-200M-34 -208V-322M34 -208V-322', detail: true });
      body.push(['@glass.0', 'M-30 -162V-186a8 8 0 0 1 16 0V-162zM14 -162V-186a8 8 0 0 1 16 0V-162z', 0.9]);
      body.push(['@glass.0', 'M-24 -212V-248a7 7 0 0 1 14 0V-212zM10 -212V-248a7 7 0 0 1 14 0V-212z', 0.9], ['@glass.0', 'M-24 -272V-310a7 7 0 0 1 14 0V-272zM10 -272V-310a7 7 0 0 1 14 0V-272z', 0.9]);
      body.push({ s: '@marble.3', w: 0.8, op: 0.5, d: 'M-32 -186h20M12 -186h20M-26 -250h18M8 -250h18M-26 -312h18M8 -312h18', detail: true });
      let tb = ''; for (let x = -48; x <= 48; x += 6) tb += `M${x} ${T2 - 6}v-7`;
      body.push({ s: '@marble.1', w: 1.4, op: 0.85, d: tb + `M-50 ${T2 - 13}H50`, detail: true }, ['@marble.1', rect(-52, T2 - 22, 9, 16) + rect(43, T2 - 22, 9, 16)]);
      // ---- the clock stage (painted iron): paired corner columns, the clock face under its curved hood
      const K0 = T2 - 14, K1 = -404, CY = -364;
      body.push({ f: lin('@iron.0', '@iron.1', K1, K0), d: rect(-40, K1, 80, K0 - K1) }, ['@iron.2', rect(40, K1 + 2, 9, K0 - K1 - 2)]);
      body.push(['@iron.0', rect(-40, K1, 9, K0 - K1) + rect(31, K1, 9, K0 - K1)], { s: '@iron.2', w: 1, op: 0.7, d: `M-36 ${K0}V${K1}M36 ${K0}V${K1}`, detail: true });
      body.push(['@iron.1', `M-30 ${CY - 18}Q0 ${CY - 52} 30 ${CY - 18}V${CY - 22}Q0 ${CY - 56} -30 ${CY - 22}z`], ['@iron.0', rect(-44, K1 - 4, 88, 6)]);
      body.push(['@clock.1', ell(0, CY, 23, 23)], { f: '@clock.0', d: ell(0, CY, 19.5, 19.5), glow: 'lamp' });
      let tick = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), k = i % 3 ? 16 : 14; tick += `M${f1(c * k)} ${f1(CY + s * k)}L${f1(c * 18)} ${f1(CY + s * 18)}`; }
      body.push({ s: '@clock.2', w: 1.2, d: tick }, { s: '@clock.2', w: 1.8, d: `M0 ${CY}V${CY - 12}M0 ${CY}L8 ${CY + 5}` }, ['@clock.2', ell(0, CY, 1.6, 1.6)]);
      body.push({ s: '@iron.2', w: 0.8, op: 0.6, d: `M-30 ${K0 - 4}H30M-30 ${K1 + 6}H30`, detail: true });
      // ---- the octagonal drum, the ribbed bell dome with its oculi, the lantern and the plain spire cap
      const D0 = K1 - 4, D1 = -440, M1 = -490;
      body.push({ f: lin('@iron.0', '@iron.1', D1, D0), d: rect(-30, D1, 60, D0 - D1) }, ['@iron.2', poly([[30, D0], [38, D0], [36, D1], [30, D1]])]);
      body.push(['@glass.0', 'M-19 -410V-428a4 4 0 0 1 8 0V-410zM-4 -410V-430a4 4 0 0 1 8 0V-410zM11 -410V-428a4 4 0 0 1 8 0V-410z', 0.9]);
      body.push({ s: '@iron.2', w: 1.2, op: 0.7, d: `M-24 ${D0}V${D1}M24 ${D0}V${D1}`, detail: true }, ['@iron.0', rect(-34, D1 - 4, 70, 5)]);
      body.push({ f: lin('@iron.0', '@iron.2', M1, D1 - 4), d: `M-32 ${D1 - 4}Q-34 -468 -14 -482Q0 ${M1} 14 -482Q34 -468 32 ${D1 - 4}z` }, ['@iron.2', `M16 -482Q34 -468 32 ${D1 - 4}H24Q28 -466 12 -484z`, 0.55]);
      body.push({ s: '@iron.2', w: 0.9, op: 0.7, d: `M-16 ${D1 - 4}Q-16 -470 -6 -486M0 ${D1 - 4}V${M1 + 2}M16 ${D1 - 4}Q16 -470 6 -486`, detail: true });
      body.push(['@glass.1', ell(-18, -456, 2.6, 3.4) + ell(0, -460, 2.6, 3.4) + ell(18, -456, 2.6, 3.4), 0.9]);
      body.push(['@iron.1', rect(-9, -510, 18, 22)], ['@iron.0', rect(-11, -512, 22, 4)], ['@glass.1', rect(-5, -504, 3, 10) + rect(2, -504, 3, 10), 0.8]);
      body.push(['@iron.1', poly([[-6, -512], [0, -548], [6, -512]])], ['@iron.0', poly([[-6, -512], [0, -548], [-1, -512]]), 0.8], ['@iron.2', ell(0, -551, 3, 3)], ['@iron.2', rect(-0.6, -560, 1.2, 7)]);
      // ---- night: the windows in seeded groups (coarse cells), the tower's openings, the drum
      const cells = [];
      for (const x of bays) cells.push([x + 2, -44, 8, 12], [x + 2, -74, 8, 9], [x + 2, -96, 8, 8]);
      for (const x of [-66, -44, -22, 0, 22, 44, 66]) cells.push([x - 4, -124, 8, 10]);
      sceneDraw.winGroups(r, cells, 10).forEach(d => body.push({ f: '@glass.1', d, op: 0.3, glow: 'window', detail: true }));
      body.push({ f: '@glass.1', d: rect(-24, -246, 14, 30) + rect(10, -246, 14, 30) + rect(-19, -426, 8, 14) + rect(11, -426, 8, 14), op: 0.3, glow: 'window', detail: true });
      // the lit part: floodlight washes on the tower and the facade, the clock's halo, the portal, the aviation light
      // (the washes follow the tower's stages and the block's outline, so no lit box shows against the sky)
      const towerOutline = poly([[-54, T0], [-54, T1], [-45, T1], [-45, T2 - 6], [-40, T2 - 6], [-40, K1], [-30, K1], [-30, D1 - 4], [-32, D1 - 4], [-24, -476], [-9, -490], [-9, -512], [9, -512], [9, -490], [24, -476], [32, D1 - 4], [30, D1 - 4], [30, K1], [40, K1], [40, T2 - 6], [45, T2 - 6], [45, T1], [54, T1], [54, T0]]);
      lit.push({ f: { lin: [[0, '@flood', 0.05], [0.6, '@flood', 0.4], [1, '@flood', 0.55]], x1: 0, y1: T0, x2: 0, y2: M1 }, d: towerOutline });
      lit.push({ f: { lin: [[0, '@flood', 0.4], [1, '@flood', 0.04]], x1: 0, y1: 0, x2: 0, y2: -150 }, d: rect(WL, C - 6, WR - WL, 6 - C) + rect(-80, -156, 160, 36) });
      lit.push({ f: { rad: [[0, '@flood', 0.55], [1, '@flood', 0]], cx: 0, cy: CY, r: 40 }, d: rect(-40, CY - 40, 80, 80) }, ['@warm', 'M-22 0V-48A22 22 0 0 1 22 -48V0z', 0.75]);
      lit.push(['@beacon', ell(0, -555, 2.2, 2.2), 0.95], { f: { rad: [[0, '@beacon', 0.45], [1, '@beacon', 0]], cx: 0, cy: -555, r: 9 }, d: rect(-9, -564, 18, 18) });
      return { body, lit };
    },
  });
})();

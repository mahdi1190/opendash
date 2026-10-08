/* ============================================================
   SCENE LIBRARY + ARCHETYPES: Farnborough (Rushmoor, Hampshire)
   (docs/dev/SCENE_ENGINE.md sections 2 and 8). PURE: sceneObjDefine and
   sceneArchetypeDefine calls inside IIFEs and nothing else; every build
   runs lazily (objects once per variant and season, scenes once when shown).

   The area: the Farnborough International Airshow (flying displays over the
   airfield, the hospitality chalets along the crowd line, the static park),
   Farnborough Airport (the wave-roofed terminal, its control tower and the
   arched hangars), St Michael's Abbey (French flamboyant Gothic church with
   its domed east end, on its wooded hill), the FAST museum (Farnborough Air
   Sciences Trust, an Edwardian brick building of the old factory site with
   a jet on display outside), Queensmead (the pedestrian shopping street),
   Farnborough Main (South Western main line) and Farnborough North (North
   Downs line, the level crossing), the Farnborough Business Park and the
   Basingstoke Canal along the airfield's edge. The airship hangar belongs to
   the Fleet pack. All aircraft are GENERIC: no markings, no liveries.
     https://www.farnborough.com/
     https://airsciences.org.uk/
     https://www.farnboroughabbey.org/

   Objects:
     landmark.st-michaels-abbey          pale stone flamboyant Gothic church, flying buttresses, domed east end
     landmark.fast-museum                Edwardian red-brick block, white sashes, a silver jet on its stand
     landmark.farnborough-main-station   two-storey brick station building, tall chimneys, platform canopy
     landmark.farnborough-north-station  a small brick station, shelter and the level crossing (barriers, lights)
     landmark.farnborough-airport        the terminal's wave roof, the control tower and the arched hangars
     building.business-park-office       a low glazed office block (business park), 3 variants
     structure.airshow-chalet            a run of white two-storey hospitality chalets with glazed balconies
     vehicle.display-jet                 a generic jet (v0 / v1 trainer with white / blue smoke, v2 business jet)
     vehicle.airliner                    a generic twin-engine airliner, plain white
   Archetypes (the scenes are data rows in 71-scene-uk-farnborough-*.js):
     farnborough-airfield   the airshow crowd line, the static park, the business park (form: showline | static | business | precinct)
     farnborough-place      the town views: station, church, street, lawn and canal (built on the Fleet
                            archetypes' ground) with Farnborough's aircraft overhead
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const F = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => sceneD.rect(x, y, w, h);
  const poly = (...pts) => sceneD.poly(pts);
  /** Shrubs along a base line (seasonal '@leaf' tones), n clumps between x0 and x1. */
  const shrubs = (rnd, x0, x1, n, y, h) => { const o = []; for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + 0.5) / n + (rnd() - 0.5) * 10, r = h * (0.7 + rnd() * 0.5); o.push({ f: '@leaf.0', d: sceneD.ell(x, y - r * 0.5, r * 1.2, r * 0.75) }, { f: '@leaf.1', d: sceneD.ell(x - r * 0.3, y - r * 0.7, r * 0.7, r * 0.45), op: 0.9 }); } return o; };
  const LEAF = { spring: { leaf: ['#4e7a2e', '#7aa042'] }, summer: { leaf: ['#3e6a2a', '#5a8a36'] }, autumn: { leaf: ['#8a5a26', '#b8803a'] }, winter: { leaf: ['#4a5a44', '#6a7464'] } };

  /* ---------- St Michael's Abbey ---------- */
  sceneObjDefine({
    id: 'landmark.st-michaels-abbey',
    category: 'landmark',
    size: [640, 380],
    variants: 1,
    seasonal: true,
    flippable: false,
    palette: {
      base: { stone: ['#d6ccb4', '#b4a88e', '#ece4d0', '#9a8e76'], roof: ['#5a6068', '#454a52', '#767c84'], dome: ['#6e7a7e', '#56626a', '#8e9a9c'], glass: ['#3c4858', '#8aa0b4'], door: ['#3a2e26'], flood: ['#ffe2a8'], snow: ['#f2f4f6'], leaf: ['#3e6a2a', '#5a8a36'] },
      spring: LEAF.spring, summer: LEAF.summer, autumn: LEAF.autumn, winter: Object.assign({ stone: ['#ccc4b0', '#a89e88', '#e2dccc', '#8e8470'] }, LEAF.winter),
    },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 300, ry: 14, h: 300 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/st-michaels-abbey', 'uk', 'hampshire', 'farnborough', 'abbey', 'church', 'gothic', 'kit:temperate'],
    credit: "drawn for the Farnborough area pack: St Michael's Abbey, Farnborough",
    build(v, rnd, ctx) {
      const b = [], lit = [], W = ctx.season === 'winter';
      const pin = (x, y, h, w = 8) => {
        b.push({ f: '@stone.0', d: rect(x - w / 2, y - h * 0.45, w, h * 0.45) }, { f: '@stone.1', d: poly([x - w / 2, y - h * 0.45], [x, y - h], [x + w / 2, y - h * 0.45]) });
        for (let k = 1; k < 4; k++) b.push({ f: '@stone.2', d: sceneD.circ(x - w * 0.35 * (1 - k / 4), y - h * 0.45 - k * h * 0.13, 1.6), detail: true }, { f: '@stone.2', d: sceneD.circ(x + w * 0.35 * (1 - k / 4), y - h * 0.45 - k * h * 0.13, 1.6), detail: true });
      };
      const lancet = (x, y, w, h, tracery) => {
        b.push({ f: '@stone.3', d: `M${x - 2} ${y + h + 1}V${y + w * 0.6}Q${x + w / 2} ${y - w * 0.9} ${x + w + 2} ${y + w * 0.6}V${y + h + 1}z` });
        b.push({ f: '@glass.0', d: `M${x} ${y + h}V${y + w * 0.6}Q${x + w / 2} ${y - w * 0.6} ${x + w} ${y + w * 0.6}V${y + h}z`, glow: 'window' });
        if (tracery) b.push({ s: '@stone.2', w: 1.2, d: `M${x + w / 2} ${y + h}V${y + w * 0.2}M${x} ${y + w * 0.7}Q${x + w / 4} ${y} ${x + w / 2} ${y + w * 0.4}Q${x + w * 0.75} ${y} ${x + w} ${y + w * 0.7}` });
      };
      // the apse (east end, right): polygonal, tall windows, buttresses; the dome and lantern above
      b.push({ f: '@stone.0', d: 'M190 0V-170L230-182L268-170L290-140V0z' }, { f: '@stone.1', d: 'M250-176L290-140V0H250z', op: 0.55 });
      for (const x of [204, 240]) lancet(x, -150, 18, 96, true);
      for (const x of [196, 232, 268]) b.push({ f: '@stone.1', d: `M${x} 0V-120l6-10h6V0z` });
      // the drum and dome
      b.push({ f: '@stone.0', d: rect(196, -232, 76, 56) }, { f: '@stone.1', d: rect(250, -232, 22, 56), op: 0.5 });
      for (let i = 0; i < 4; i++) lancet(202 + i * 18, -224, 9, 36, false);
      b.push({ f: '@stone.2', d: rect(192, -238, 84, 7) });
      b.push({ f: '@dome.0', d: 'M196-236C196-292 272-292 272-236z' }, { f: '@dome.1', d: 'M240-280C262-272 272-256 272-236H246C248-254 246-268 240-280z', op: 0.7 });
      for (let i = 1; i < 6; i++) b.push({ s: '@dome.2', w: 1, op: 0.6, d: `M${196 + i * 12.7} -236Q${F(234 + (i - 3) * 6)} -270 234 -282` });
      b.push({ f: '@stone.0', d: rect(226, -306, 16, 24) }, { f: '@dome.0', d: 'M224-306Q234-322 244-306z' }, { s: '@stone.3', w: 2, d: 'M234-318V-338M228-330H240' });
      // the north transept (near, right of centre): a gable with a rose
      b.push({ f: '@stone.0', d: 'M110 0V-196L150-250L190-196V0z' }, { f: '@stone.1', d: 'M150-250L190-196V0H160V-196z', op: 0.4 });
      b.push({ f: '@stone.3', d: sceneD.circ(150, -168, 24) }, { f: '@glass.0', d: sceneD.circ(150, -168, 20), glow: 'window' });
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.push({ s: '@stone.2', w: 1.6, d: `M150 -168L${F(150 + Math.cos(a) * 20)} ${F(-168 + Math.sin(a) * 20)}` }); }
      lancet(130, -126, 16, 80, true); lancet(154, -126, 16, 80, true);
      pin(110, -196, 46); pin(190, -196, 46);
      // the nave: tall clerestory and low aisle, flying buttresses with crocketed pinnacles
      b.push({ f: '@stone.0', d: rect(-210, -88, 320, 88) }, { f: '@stone.1', d: rect(-210, -18, 320, 18), op: 0.45 });
      b.push({ f: '@roof.1', d: poly([-214, -86], [-200, -104], [106, -104], [114, -86]) });
      b.push({ f: '@stone.0', d: rect(-200, -200, 300, 96) }, { f: '@stone.1', d: rect(-200, -116, 300, 12), op: 0.4 });
      b.push({ f: '@roof.0', d: poly([-206, -198], [-170, -262], [96, -262], [108, -198]) }, { f: '@roof.1', d: poly([60, -262], [96, -262], [108, -198], [80, -198]), op: 0.55 }, { f: '@roof.2', d: rect(-170, -264, 266, 4) });
      for (let i = 1; i < 6; i++) b.push({ s: '@roof.1', w: 0.8, op: 0.4, detail: true, d: `M${F(-206 + i * 6)} ${F(-198 - i * 10.6)}H${F(108 - i * 2)}` });
      for (let i = 0; i < 6; i++) {
        const x = -186 + i * 50;
        lancet(x + 10, -186, 18, 62, true);
        lancet(x + 10, -74, 16, 50, false);
        // the buttress on the aisle and its flying arch to the clerestory
        const bx = x - 4;
        b.push({ f: '@stone.1', d: rect(bx - 5, -112, 10, 112) }, { f: '@stone.3', d: rect(bx - 5, -112, 3, 112), op: 0.5 });
        b.push({ s: '@stone.1', w: 5, d: `M${bx} -108Q${bx + 6} -150 ${bx + 2} -178` });
        pin(bx, -112, 40, 9);
      }
      // the west front (left): a tall gable flanked by pinnacled turrets, the flamboyant portal and the rose
      b.push({ f: '@stone.0', d: 'M-292 0V-210L-246-286L-200-210V0z' }, { f: '@stone.1', d: 'M-246-286L-200-210V0H-226V-210z', op: 0.35 });
      b.push({ f: '@stone.3', d: sceneD.circ(-246, -196, 28) }, { f: '@glass.0', d: sceneD.circ(-246, -196, 24), glow: 'window' });
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; b.push({ s: '@stone.2', w: 1.6, d: `M-246 -196L${F(-246 + Math.cos(a) * 24)} ${F(-196 + Math.sin(a) * 24)}` }); }
      b.push({ f: '@stone.2', d: sceneD.circ(-246, -196, 6) });
      // the portal: deep moulded arch with an ogee hood and crockets
      b.push({ f: '@stone.3', d: 'M-276 0V-80Q-246-140-216-80V0z' }, { f: '@door', d: 'M-266 0V-74Q-246-116-226-74V0z' }, { s: '@stone.2', w: 2, d: 'M-282-78Q-262-100-246-144Q-230-100-210-78' });
      pin(-246, -140, 30, 6);
      for (const x of [-298, -194]) { b.push({ f: '@stone.1', d: rect(x - 9, -250, 18, 250) }, { f: '@stone.3', d: rect(x - 9, -250, 5, 250), op: 0.5 }); pin(x, -250, 70, 18); }
      b.push({ f: '@stone.2', d: rect(-292, -212, 92, 5) });
      // stone courses (detail)
      for (let y = -12; y > -86; y -= 12) b.push({ s: '@stone.3', w: 0.6, op: 0.3, detail: true, d: `M-210 ${y}H110` });
      for (let y = -12; y > -200; y -= 14) b.push({ s: '@stone.3', w: 0.6, op: 0.25, detail: true, d: `M-290 ${y}H-202` });
      b.push(...shrubs(rnd, -320, 300, 16, 2, 16));
      if (W) b.push({ f: '@snow.0', d: rect(-170, -265, 266, 3) }, { f: '@snow.0', d: 'M-204-104H112V-100H-204z' }, { f: '@snow.0', d: 'M200-238C202-282 266-282 268-238C260-276 208-276 200-238z' });
      lit.push({ f: { rad: [[0, '@flood', 0.32], [1, '@flood', 0]], cx: -246, cy: -150, r: 170 }, d: 'M-310 0V-220L-246-300L-180-220V0z' });
      lit.push({ f: { rad: [[0, '@flood', 0.18], [1, '@flood', 0]], cx: 0, cy: -140, r: 240 }, d: rect(-210, -270, 500, 270) });
      return { body: b, lit };
    },
  });

  /* ---------- the FAST museum ---------- */
  sceneObjDefine({
    id: 'landmark.fast-museum',
    category: 'landmark',
    size: [560, 220],
    variants: 1,
    seasonal: true,
    flippable: false,
    palette: {
      base: { brick: ['#a4553c', '#7e3e2c', '#bc6c50'], white: ['#f0ece2', '#c8c2b4'], roof: ['#575558', '#403e42', '#6e6a6c'], glass: ['#3a4656', '#9ab0c4'], door: ['#2e4a3e'], jet: ['#c4cad0', '#9aa2aa', '#e2e6ea', '#6a727a'], stand: ['#5a5e62'], lawn: ['#5e8a3e', '#4a7032'], snow: ['#f2f4f6'], flood: ['#ffe2a8'] },
      autumn: { lawn: ['#7a8442', '#5e6a34'] }, winter: { lawn: ['#8a9480', '#6e786a'] },
    },
    night: { glow: { window: '#f6cc7c', lamp: '#ffe2a0' }, on: 0.8 },
    parts: ['body', 'lit'],
    shadow: { rx: 260, ry: 12, h: 160 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/fast-museum', 'uk', 'hampshire', 'farnborough', 'museum', 'aviation', 'heritage', 'kit:temperate'],
    credit: 'drawn for the Farnborough area pack: the Farnborough Air Sciences Trust museum building, with a generic jet outside',
    build(v, rnd, ctx) {
      const b = [], lit = [], W = ctx.season === 'winter';
      // the building: two storeys of red brick, white sashes, a hipped slate roof with dormers and chimneys
      const x0 = -250, x1 = 120;
      b.push({ f: '@roof.0', d: poly([x0 - 6, -128], [x0 + 40, -190], [x1 - 40, -190], [x1 + 6, -128]) }, { f: '@roof.1', d: poly([x1 - 60, -190], [x1 - 40, -190], [x1 + 6, -128], [x1 - 30, -128]), op: 0.6 });
      for (let i = 1; i < 6; i++) b.push({ s: '@roof.1', w: 0.7, op: 0.4, detail: true, d: `M${F(x0 - 6 + i * 7.6)} ${F(-128 - i * 10.3)}H${F(x1 + 6 - i * 7.6)}` });
      for (const x of [x0 + 60, x1 - 70]) b.push({ f: '@brick.2', d: rect(x, -212, 18, 40) }, { f: '@roof.2', d: rect(x - 2, -214, 22, 5) });
      for (const x of [x0 + 110, x0 + 200]) b.push({ f: '@white.0', d: poly([x, -140], [x, -162], [x + 16, -176], [x + 32, -162], [x + 32, -140]) }, { f: '@glass.0', d: rect(x + 8, -162, 16, 18), glow: 'window' });
      b.push({ f: '@brick.0', d: rect(x0, -130, x1 - x0, 130) }, { f: '@brick.1', d: rect(x1 - 60, -130, 60, 130), op: 0.4 });
      b.push({ f: '@white.0', d: rect(x0 - 4, -134, x1 - x0 + 8, 6) }, { f: '@white.1', d: rect(x0, -66, x1 - x0, 4) });
      for (let y = -8; y > -128; y -= 8) b.push({ s: '@brick.1', w: 0.5, op: 0.35, detail: true, d: `M${x0} ${y}H${x1}` });
      for (let i = 0; i < 8; i++) {
        const x = x0 + 18 + i * 44;
        for (const y of [-118, -54]) {
          if (i === 3 && y === -54) continue;
          b.push({ f: '@white.0', d: rect(x - 2, y - 2, 26, 44) }, { f: '@glass.0', d: rect(x, y, 22, 40), glow: 'window' }, { f: '@glass.1', d: rect(x, y, 8, 14), op: 0.35 }, { s: '@white.0', w: 1.4, d: `M${x} ${y + 20}H${x + 22}M${x + 11} ${y}V${y + 40}` });
          b.push({ f: '@white.1', d: rect(x - 4, y + 40, 30, 4) });
        }
      }
      // the entrance porch with its door and lamp
      b.push({ f: '@white.0', d: rect(x0 + 140, -62, 52, 62) }, { f: '@white.1', d: poly([x0 + 134, -60], [x0 + 166, -82], [x0 + 198, -60]) }, { f: '@door', d: rect(x0 + 154, -50, 24, 50) }, { f: '@glass.1', d: rect(x0 + 162, -58, 8, 6), glow: 'lamp' });
      b.push({ f: '@lawn.0', d: `M-280 0V-6Q0-12 280-6V0z` }, { f: '@lawn.1', d: 'M-280 0V-3H280V0z' });
      // the jet on its stand on the lawn (right): swept wings, high tail, silver, no markings
      const jx = 200, jy = -46;
      b.push({ f: '@stand', d: rect(jx - 6, jy + 4, 12, 42) }, { f: '@stand', d: rect(jx - 24, -4, 48, 4) });
      b.push({ f: '@jet.1', d: `M${jx - 30} ${jy - 2}L${jx - 64} ${jy + 18}L${jx - 54} ${jy + 18}L${jx + 6} ${jy + 2}z` });   // far wing
      b.push({ f: '@jet.0', d: `M${jx - 86} ${jy - 2}Q${jx - 40} ${jy - 12} ${jx + 60} ${jy - 8}Q${jx + 84} ${jy - 4} ${jx + 88} ${jy}Q${jx + 70} ${jy + 8} ${jx + 40} ${jy + 8}H${jx - 80}z` });
      b.push({ f: '@jet.1', d: `M${jx - 80} ${jy + 4}H${jx + 40}Q${jx + 66} ${jy + 6} ${jx + 86} ${jy + 1}Q${jx + 70} ${jy + 9} ${jx + 40} ${jy + 9}H${jx - 80}z`, op: 0.8 });
      b.push({ f: '@jet.0', d: `M${jx - 70} ${jy - 6}L${jx - 92} ${jy - 46}H${jx - 80}L${jx - 50} ${jy - 8}z` }, { f: '@jet.2', d: `M${jx - 96} ${jy - 46}H${jx - 64}L${jx - 66} ${jy - 42}H${jx - 94}z` });
      b.push({ f: '@jet.2', d: `M${jx - 20} ${jy + 2}L${jx - 60} ${jy + 30}H${jx - 44}L${jx + 16} ${jy + 4}z` });   // near wing
      b.push({ f: '@glass.0', d: `M${jx + 44} ${jy - 9}Q${jx + 56} ${jy - 20} ${jx + 70} ${jy - 7}z` }, { f: '@jet.3', d: sceneD.ell(jx + 86, jy, 4, 3) });
      if (W) b.push({ f: '@snow.0', d: poly([x0 + 40, -190], [x1 - 40, -190], [x1 - 34, -184], [x0 + 34, -184]) }, { f: '@snow.0', d: rect(-280, -8, 560, 3) });
      lit.push({ f: { rad: [[0, '@flood', 0.26], [1, '@flood', 0]], cx: x0 + 166, cy: -40, r: 140 }, d: rect(x0, -140, 300, 140) });
      return { body: b, lit };
    },
  });

  /* ---------- Farnborough Main station ---------- */
  sceneObjDefine({
    id: 'landmark.farnborough-main-station',
    category: 'landmark',
    size: [520, 220],
    variants: 1,
    seasonal: true,
    flippable: false,
    palette: {
      base: { brick: ['#9c4e36', '#7a3a2a', '#b66a4e'], dress: ['#e0d4b8', '#bcae90'], roof: ['#5a5658', '#423e40', '#726e6e'], canopy: ['#d8dcd8', '#a8aeac', '#4a6a5a'], glass: ['#3a4656', '#9ab0c4'], plat: ['#9a948a', '#7a756c', '#e8d24a'], rail: ['#5a5550', '#8a8680'], ballast: ['#8a8278', '#6a645c'], snow: ['#f2f4f6'], leaf: ['#3e6a2a', '#5a8a36'] },
      spring: LEAF.spring, summer: LEAF.summer, autumn: LEAF.autumn, winter: LEAF.winter,
    },
    night: { glow: { window: '#f6cc7c', lamp: '#ffe8b0' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 240, ry: 10, h: 160 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/farnborough-main', 'uk', 'hampshire', 'farnborough', 'station', 'rail', 'kit:temperate'],
    credit: 'drawn for the Farnborough area pack: Farnborough (Main) station on the South Western main line',
    build(v, rnd, ctx) {
      const b = [], lit = [], W = ctx.season === 'winter';
      b.push(...shrubs(rnd, -260, 260, 14, -24, 14));
      // the station house: two storeys, stone bands and quoins, a hipped roof with tall chimneys
      b.push({ f: '@roof.0', d: poly([-236, -130], [-200, -176], [-20, -176], [16, -130]) }, { f: '@roof.1', d: poly([-50, -176], [-20, -176], [16, -130], [-20, -130]), op: 0.6 });
      for (const x of [-196, -110, -40]) b.push({ f: '@brick.2', d: rect(x, -206, 16, 44) }, { f: '@dress.0', d: rect(x - 2, -208, 20, 5) }, { f: '@roof.2', d: rect(x + 3, -214, 4, 6) }, { f: '@roof.2', d: rect(x + 9, -214, 4, 6) });
      b.push({ f: '@brick.0', d: rect(-230, -132, 240, 132) }, { f: '@brick.1', d: rect(-40, -132, 50, 132), op: 0.4 });
      for (const y of [-134, -70]) b.push({ f: '@dress.0', d: rect(-234, y, 248, 5) });
      for (let y = -6; y > -130; y -= 8) b.push({ s: '@brick.1', w: 0.5, op: 0.3, detail: true, d: `M-230 ${y}H10` });
      for (const x of [-230, 2]) for (let k = 0; k < 8; k++) b.push({ f: '@dress.1', d: rect(x + (k % 2 ? 0 : 0), -14 - k * 16, k % 2 ? 8 : 12, 10), detail: true });
      for (let i = 0; i < 5; i++) {
        const x = -214 + i * 44;
        b.push({ f: '@dress.0', d: rect(x - 3, -122, 28, 42) }, { f: '@glass.0', d: rect(x, -118, 22, 36), glow: 'window' }, { s: '@dress.0', w: 1.2, d: `M${x} -100H${x + 22}` });
        if (i !== 2) b.push({ f: '@dress.0', d: rect(x - 3, -58, 28, 46) }, { f: '@glass.0', d: rect(x, -54, 22, 40), glow: 'window' }, { f: '@glass.1', d: rect(x, -54, 8, 14), op: 0.35 });
      }
      b.push({ f: '@dress.0', d: 'M-131 0V-60Q-116-74-101-60V0z' }, { f: '@glass.0', d: 'M-127 0V-58Q-116-68-105-58V0z', glow: 'window' });
      // the platform canopy: valanced timber on cast columns, running right along the platform
      b.push({ f: '@canopy.0', d: poly([10, -98], [250, -98], [254, -88], [10, -88]) }, { f: '@canopy.2', d: rect(10, -90, 244, 4) });
      let val = ''; for (let x = 12; x < 252; x += 8) val += `M${x} -86l4 6l4-6z`; b.push({ f: '@canopy.2', d: val });
      for (let x = 30; x < 250; x += 44) b.push({ f: '@canopy.2', d: rect(x, -86, 4, 62) }, { f: '#ffe8b0', d: rect(x - 6, -84, 16, 2), glow: 'lamp' });
      // the platform, its yellow line and the line in front
      b.push({ f: '@plat.0', d: rect(-260, -24, 520, 8) }, { f: '@plat.2', d: rect(-260, -24, 520, 1.6) }, { f: '@plat.1', d: rect(-260, -16, 520, 16) });
      b.push({ f: '@ballast.0', d: rect(-260, 0, 520, 8) });
      let s = ''; for (let x = -256; x < 260; x += 9) s += rect(x, 2, 4, 5); b.push({ f: '@ballast.1', d: s });
      b.push({ f: '@rail.0', d: rect(-260, 1, 520, 1.6) }, { f: '@rail.1', d: rect(-260, 5, 520, 1.6) });
      if (W) b.push({ f: '@snow.0', d: poly([-200, -176], [-20, -176], [-14, -170], [-206, -170]) }, { f: '@snow.0', d: rect(10, -100, 244, 3) });
      lit.push({ f: { lin: [[0, '#ffe8b0', 0.3], [1, '#ffe8b0', 0]], x1: 0, y1: -88, x2: 0, y2: -20 }, d: rect(10, -88, 244, 66) });
      return { body: b, lit };
    },
  });

  /* ---------- Farnborough North station and its level crossing ---------- */
  sceneObjDefine({
    id: 'landmark.farnborough-north-station',
    category: 'landmark',
    size: [520, 170],
    variants: 1,
    seasonal: true,
    flippable: false,
    palette: {
      base: { brick: ['#a05a40', '#7c4232', '#b87258'], roof: ['#5a5658', '#423e40'], shelter: ['#3e5a4e', '#a8c0c4'], glass: ['#3a4656', '#9ab0c4'], plat: ['#9a948a', '#7a756c', '#e8d24a'], rail: ['#5a5550', '#8a8680'], ballast: ['#8a8278', '#6a645c'], boom: ['#f2f2ee', '#c8322a'], post: ['#2e3236', '#e6c22a'], red: ['#d23a2a'], road: ['#5e6062'], snow: ['#f2f4f6'], leaf: ['#3e6a2a', '#5a8a36'], fence: ['#6a6e70'] },
      spring: LEAF.spring, summer: LEAF.summer, autumn: LEAF.autumn, winter: LEAF.winter,
    },
    night: { glow: { window: '#f6cc7c', lamp: '#ffe8b0', signal: '#ff4a3a' }, on: 0.9 },
    parts: ['body', 'lit'],
    anim: { flicker: { part: 'lit', op: [0.2, 1], period: 1.2 } },
    shadow: { rx: 240, ry: 10, h: 110 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/farnborough-north', 'uk', 'hampshire', 'farnborough', 'station', 'rail', 'level crossing', 'kit:temperate'],
    credit: 'drawn for the Farnborough area pack: Farnborough North station on the North Downs line, with its level crossing',
    build(v, rnd, ctx) {
      const b = [], lit = [], W = ctx.season === 'winter';
      b.push(...shrubs(rnd, -260, 180, 18, -40, 16));
      // the palisade fence behind the platform
      for (let x = -250; x < 150; x += 10) b.push({ f: '@fence.0', d: poly([x, -24], [x, -50], [x + 2, -54], [x + 4, -50], [x + 4, -24]), detail: true });
      b.push({ f: '@fence.0', d: rect(-250, -46, 400, 2) }, { f: '@fence.0', d: rect(-250, -32, 400, 2) });
      // the station name board posts (blank boards: no text) and a help point
      for (const x of [-150, 60]) b.push({ f: '@post.0', d: rect(x - 18, -60, 2, 36) }, { f: '@post.0', d: rect(x + 16, -60, 2, 36) }, { f: '@shelter.0', d: rect(x - 22, -70, 44, 12) }, { f: '@boom.0', d: rect(x - 20, -68, 40, 8) });
      // the little station building: brick, a pitched roof, a gable to the platform
      b.push({ f: '@roof.0', d: poly([-232, -66], [-200, -100], [-80, -100], [-56, -66]) }, { f: '@roof.1', d: poly([-100, -100], [-80, -100], [-56, -66], [-80, -66]), op: 0.5 });
      b.push({ f: '@brick.2', d: rect(-180, -118, 14, 26) });
      b.push({ f: '@brick.0', d: rect(-226, -68, 164, 46) });
      for (let y = -28; y > -66; y -= 7) b.push({ s: '@brick.1', w: 0.5, op: 0.35, detail: true, d: `M-226 ${y}H-62` });
      for (let i = 0; i < 3; i++) b.push({ f: '@glass.0', d: rect(-212 + i * 50, -58, 22, 26), glow: 'window' }, { f: '@glass.1', d: rect(-212 + i * 50, -58, 8, 10), op: 0.35 });
      // the platform shelter (glazed) and lamps
      b.push({ f: '@shelter.0', d: rect(-36, -64, 90, 4) }, { f: '@shelter.1', d: rect(-34, -60, 86, 36), op: 0.45 }, { s: '@shelter.0', w: 2, d: 'M-34-60V-24M52-60V-24M8-60V-24' });
      for (const x of [-120, 100]) b.push({ f: '@post.0', d: rect(x, -78, 3, 56) }, { f: '#ffe8b0', d: rect(x - 4, -82, 11, 4), glow: 'lamp' });
      b.push({ f: '@plat.0', d: rect(-250, -24, 400, 8) }, { f: '@plat.2', d: rect(-250, -24, 400, 1.6) }, { f: '@plat.1', d: rect(-250, -16, 400, 16) });
      b.push({ f: '@plat.1', d: poly([150, -24], [176, 0], [150, 0]) });
      // the line, crossing the road on the right
      b.push({ f: '@ballast.0', d: rect(-260, 0, 520, 8) });
      let s = ''; for (let x = -256; x < 260; x += 9) s += rect(x, 2, 4, 5); b.push({ f: '@ballast.1', d: s });
      b.push({ f: '@road', d: rect(196, -2, 70, 10) });
      b.push({ f: '@rail.0', d: rect(-260, 1, 520, 1.6) }, { f: '@rail.1', d: rect(-260, 5, 520, 1.6) });
      // the level crossing: barrier posts and booms (raised), red and white; the warning lights
      for (const [x, up] of [[186, 1], [262, 1]]) {
        b.push({ f: '@post.0', d: rect(x - 3, -66, 6, 66) }, { f: '@post.0', d: rect(x - 8, -40, 16, 18) });
        // the boom raised, near vertical
        const tip = up ? [x + (x < 230 ? -8 : 8), -150] : [x + 80, -40];
        b.push({ s: '@boom.0', w: 4, cap: 'round', d: `M${x} -34L${tip[0]} ${tip[1]}` });
        for (let k = 1; k < 5; k++) { const t0 = k / 5, t1 = t0 + 0.08; b.push({ s: '@boom.1', w: 4.2, d: `M${F(x + (tip[0] - x) * t0)} ${F(-34 + (tip[1] + 34) * t0)}L${F(x + (tip[0] - x) * t1)} ${F(-34 + (tip[1] + 34) * t1)}` }); }
        b.push({ f: '@post.0', d: rect(x - 12, -82, 24, 10) }, { f: '@post.1', d: poly([x - 16, -88], [x + 16, -88], [x, -102]), op: 0.9 });
        b.push({ f: '#3a1a18', d: sceneD.circ(x - 7, -77, 3.4) }, { f: '#3a1a18', d: sceneD.circ(x + 7, -77, 3.4) });
        lit.push({ f: '@red.0', d: sceneD.circ(x - 7, -77, 3.4), glow: 'signal' }, { f: { rad: [[0, '@red.0', 0.4], [1, '@red.0', 0]], cx: x - 7, cy: -77, r: 14 }, d: sceneD.circ(x - 7, -77, 14) });
      }
      if (W) b.push({ f: '@snow.0', d: poly([-200, -100], [-80, -100], [-76, -96], [-204, -96]) }, { f: '@snow.0', d: rect(-36, -66, 90, 2) });
      return { body: b, lit };
    },
  });

  /* ---------- Farnborough Airport: the arched hangars, the terminal's wave roof and the control tower ---------- */
  sceneObjDefine({
    id: 'landmark.farnborough-airport',
    category: 'landmark',
    size: [900, 300],
    variants: 1,
    seasonal: false,
    flippable: false,
    palette: {
      base: { metal: ['#c4ccd2', '#9aa4ac', '#e2e8ec', '#7a848c'], wall: ['#e6e4de', '#bcbab2'], glass: ['#3e5262', '#8cb0c8', '#5a7a90'], tower: ['#eceae4', '#c2c0b8'], apron: ['#a4a29a', '#8a887e'], snow: ['#f2f4f6'], beacon: ['#e83a2a'] },
    },
    night: { glow: { window: '#f8d890', lamp: '#fff0c8', beacon: '#ff4a3a' }, on: 1 },
    parts: ['body', 'lit'],
    shadow: { rx: 420, ry: 12, h: 140 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/farnborough-airport', 'uk', 'hampshire', 'farnborough', 'airport', 'aviation', 'kit:temperate'],
    credit: 'drawn for the Farnborough area pack: Farnborough Airport, its terminal, control tower and arched hangars',
    build(v, rnd, ctx) {
      const b = [], lit = [], W = ctx.season === 'winter';
      // three arched hangars (left), barrel roofs with ribs, doors to the apron
      for (let i = 0; i < 3; i++) {
        const x = -440 + i * 140, w = 136, h = 70;
        b.push({ f: '@metal.' + (i === 1 ? 2 : 0), d: `M${x} 0V${-h + 20}Q${x + w / 2} ${-h - 30} ${x + w} ${-h + 20}V0z` });
        b.push({ f: '@metal.1', d: `M${x + w * 0.62} ${-h - 4}Q${x + w * 0.85} ${-h + 4} ${x + w} ${-h + 20}V0H${x + w * 0.62}z`, op: 0.45 });
        for (let k = 1; k < 6; k++) b.push({ s: '@metal.3', w: 0.8, op: 0.4, detail: true, d: `M${x + k * w / 6} 0V${F(-h + 20 - 50 * Math.sin(Math.PI * k / 6))}` });
        b.push({ f: '@metal.3', d: rect(x + 10, -40, w - 20, 40) });
        for (let k = 0; k < 5; k++) b.push({ s: '@metal.1', w: 1, d: `M${x + 10 + k * (w - 20) / 5} -40V0` });
      }
      // the terminal: a long glazed hall under an undulating wing roof
      const tx = -10, tw = 360;
      b.push({ f: '@wall.0', d: rect(tx, -46, tw, 46) }, { f: '@glass.0', d: rect(tx + 6, -40, tw - 12, 30), glow: 'window' });
      for (let x = tx + 18; x < tx + tw - 6; x += 18) b.push({ s: '@wall.1', w: 1.2, d: `M${x} -40V-10` });
      b.push({ f: '@glass.1', d: rect(tx + 6, -40, tw - 12, 8), op: 0.35 });
      b.push({ f: '@metal.2', d: `M${tx - 20} -50Q${tx + 60} -96 ${tx + 140} -60T${tx + 300} -66Q${tx + 340} -80 ${tx + tw + 20} -54V-46H${tx - 20}z` });
      b.push({ f: '@metal.1', d: `M${tx - 20} -50Q${tx + 60} -84 ${tx + 140} -54T${tx + 300} -60Q${tx + 340} -72 ${tx + tw + 20} -50V-46H${tx - 20}z`, op: 0.7 });
      // the control tower: a slender shaft, the glazed cab, a swept cap like a wing
      const cx = 400;
      b.push({ f: '@tower.0', d: `M${cx - 18} 0L${cx - 12} -200H${cx + 12}L${cx + 18} 0z` }, { f: '@tower.1', d: `M${cx + 2} 0L${cx + 4} -200H${cx + 12}L${cx + 18} 0z`, op: 0.6 });
      for (let y = -30; y > -190; y -= 22) b.push({ f: '@glass.2', d: rect(cx - 4, y, 8, 12), glow: 'window' });
      b.push({ f: '@tower.0', d: poly([cx - 34, -200], [cx + 34, -200], [cx + 28, -210], [cx - 28, -210]) });
      b.push({ f: '@glass.0', d: poly([cx - 38, -212], [cx + 38, -212], [cx + 44, -246], [cx - 44, -246]), glow: 'window' }, { f: '@glass.1', d: poly([cx - 38, -212], [cx - 20, -212], [cx - 24, -246], [cx - 44, -246]), op: 0.35 });
      for (let k = -3; k <= 3; k++) b.push({ s: '@tower.1', w: 1.2, d: `M${cx + k * 11} -212L${F(cx + k * 12.8)} -246` });
      b.push({ f: '@metal.2', d: `M${cx - 60} -246Q${cx} -262 ${cx + 70} -256L${cx + 50} -250Q${cx} -254 ${cx - 50} -244z` }, { f: '@metal.0', d: rect(cx - 2, -276, 4, 20) });
      b.push({ f: '@beacon.0', d: sceneD.circ(cx, -278, 3), glow: 'beacon' });
      b.push({ f: '@apron.0', d: rect(-450, -2, 900, 4) });
      if (W) for (let i = 0; i < 3; i++) { const x = -440 + i * 140; b.push({ f: '@snow.0', d: `M${x + 6} -46Q${x + 68} -104 ${x + 130} -46Q${x + 68} -96 ${x + 6} -46z` }); }
      lit.push({ f: { lin: [[0, '#fff0c8', 0.3], [1, '#fff0c8', 0]], x1: 0, y1: -46, x2: 0, y2: 0 }, d: rect(tx, -46, tw, 46) });
      lit.push({ f: { rad: [[0, '#fff0c8', 0.35], [1, '#fff0c8', 0]], cx, cy: -230, r: 70 }, d: sceneD.circ(cx, -230, 70) });
      return { body: b, lit };
    },
  });

  /* ---------- a business park office block ---------- */
  sceneObjDefine({
    id: 'building.business-park-office',
    category: 'building',
    size: [320, 150],
    variants: 3,
    seasonal: false,
    flippable: true,
    palette: { base: { clad: ['#d8d6d0', '#b8b6ae', '#c8b49a'], glass: ['#4a6478', '#8cb0c8', '#3a4e5e'], frame: ['#6a7278', '#4a5258'], roof: ['#8a8e90'] } },
    night: { glow: { window: '#f4dca0' }, on: 0.7 },
    parts: ['body', 'lit'],
    shadow: { rx: 150, ry: 8, h: 140 },
    reflect: true,
    tags: ['building', 'office', 'business park', 'glass', 'kit:urban', 'kit:temperate', 'role:building-mid'],
    credit: 'drawn for the Farnborough area pack: a business-park office block',
    build(v, rnd) {
      const b = [], lit = [], c = '@clad.' + v, floors = 3 + (v % 2), fh = 30, W = 300 - v * 20, x0 = -W / 2;
      const H = floors * fh + 10;
      b.push({ f: c, d: rect(x0, -H, W, H) }, { f: '@frame.1', d: rect(x0 + W * 0.7, -H, W * 0.3, H), op: 0.25 });
      // the glazed curtain wall bays and the solid stair core
      const coreX = v === 1 ? x0 + 10 : x0 + W - 60;
      for (let f = 0; f < floors; f++) {
        const y = -H + 8 + f * fh;
        b.push({ f: '@glass.' + (v === 2 ? 2 : 0), d: rect(x0 + 6, y, W - 12, fh - 8), glow: 'window' }, { f: '@glass.1', d: rect(x0 + 6, y, W - 12, 6), op: 0.3 });
        for (let x = x0 + 6; x < x0 + W - 6; x += 22) b.push({ s: '@frame.0', w: 1, d: `M${x} ${y}V${y + fh - 8}` });
        if (rnd() < 0.5) lit.push({ f: '#f4dca0', d: rect(x0 + 6 + Math.floor(rnd() * 8) * 22, y, 44, fh - 8), op: 0.5 });
      }
      b.push({ f: c, d: rect(coreX, -H - 14, 50, H + 14) }, { f: '@frame.1', d: rect(coreX + 34, -H - 14, 16, H + 14), op: 0.3 });
      b.push({ f: '@roof', d: rect(x0 - 4, -H - 4, W + 8, 6) }, { f: '@roof', d: rect(x0 + 40, -H - 14, 60, 10), op: 0.8 });
      // the entrance canopy
      b.push({ f: '@frame.0', d: rect(-30, -26, 60, 4) }, { f: '@glass.1', d: rect(-20, -22, 40, 22), glow: 'window' });
      return { body: b, lit };
    },
  });

  /* ---------- the airshow hospitality chalets ---------- */
  sceneObjDefine({
    id: 'structure.airshow-chalet',
    category: 'structure',
    size: [400, 110],
    variants: 2,
    seasonal: false,
    flippable: true,
    palette: { base: { white: ['#f4f4f0', '#d4d4cc', '#b4b4ac'], glass: ['#4a6478', '#9cbcd0'], rail: ['#c8ccd0'], flag: ['#2a5a9a', '#c83a2e', '#e8b830', '#3a8a5a'] } },
    night: { glow: { window: '#f8dca0' }, on: 0.8 },
    parts: ['body', 'flags'],
    anim: { sway: { part: 'flags', pivot: [0, -90], deg: 2 } },
    shadow: { rx: 190, ry: 8, h: 90 },
    reflect: false,
    tags: ['structure', 'airshow', 'chalet', 'hospitality', 'kit:urban', 'kit:temperate', 'role:building-near'],
    credit: 'drawn for the Farnborough area pack: the airshow hospitality chalets along the crowd line',
    build(v, rnd) {
      const b = [], flags = [];
      for (let i = 0; i < 5; i++) {
        const x = -200 + i * 80;
        b.push({ f: '@white.' + (i % 2), d: rect(x, -86, 78, 86) }, { f: '@white.2', d: rect(x + 76, -86, 2, 86) });
        b.push({ f: '@glass.0', d: rect(x + 6, -76, 66, 30), glow: 'window' }, { f: '@glass.1', d: rect(x + 6, -76, 20, 12), op: 0.4 });
        b.push({ f: '@glass.0', d: rect(x + 6, -34, 66, 30), glow: 'window' });
        b.push({ s: '@rail', w: 1.4, d: `M${x + 4} -46H${x + 74}M${x + 4} -40H${x + 74}` });
        for (let k = 0; k < 6; k++) b.push({ s: '@rail', w: 0.8, d: `M${x + 6 + k * 13} -46V-36` });
        b.push({ f: '@white.2', d: rect(x - 2, -92, 82, 6) });
        // plain flags on short poles (no emblems)
        const fx = x + 40;
        b.push({ s: '@white.2', w: 1.4, d: `M${fx} -92V-120` });
        flags.push({ f: '@flag.' + ((i + v) % 4), d: `M${fx} -120h18l-3 5 3 5h-18z` });
      }
      return { body: b, flags };
    },
  });

  /* ---------- a generic display jet (no markings) ---------- */
  sceneObjDefine({
    id: 'vehicle.display-jet',
    category: 'vehicle',
    size: [300, 40],
    box: [-210, -26, 66, 14],
    variants: 3,
    seasonal: false,
    flippable: true,
    palette: { base: { skin: ['#dfe3e6', '#e8eaec', '#f4f4f2'], shade: ['#a8b0b8', '#9aa2ac', '#c8ccd0'], trim: ['#3a4a5e', '#2a5a9a', '#7a848e'], glass: '#2e3a48', smoke: ['#f6f6f4', '#9cc0e8', '#ffffff'], off: '#5a626a' } },
    night: { glow: { lamp: '#fff4d8' }, on: 1 },
    parts: ['smoke', 'body'],
    anim: { flicker: { part: 'smoke', op: [0.55, 0.85], period: 0.9 } },
    tags: ['aircraft', 'jet', 'airshow', 'airfield', 'sky', 'kit:vehicles', 'role:vehicle'],
    credit: 'drawn for the Farnborough area pack: a generic display jet (trainer with smoke, or a business jet)',
    build(v) {
      const c = v, biz = v === 2, smoke = [];
      const body = [];
      if (biz) {
        // a business jet: slim fuselage, rear engines, T-tail, cabin windows
        body.push({ f: '@shade.' + c, d: 'M-50-14L-62-30H-52L-36-12z' }, { f: '@skin.' + c, d: 'M-66-30H-42L-44-27H-64z' });
        body.push({ f: '@skin.' + c, d: 'M-58-6Q-40-14 10-13Q40-12 56-6Q60-2 54 1Q40 4 10 4H-48Q-58 2-58-6z' });
        body.push({ f: '@shade.' + c, d: 'M-56-2Q-30 4 10 3Q40 3 54 1Q40 5 10 5H-48z', op: 0.8 });
        body.push({ f: '@off', d: sceneD.ell(-34, -12, 12, 4.5) }, { f: '@shade.' + c, d: 'M-10 0L-30 12H-20L8 1z' });
        for (let k = 0; k < 6; k++) body.push({ f: '@glass', d: sceneD.ell(-14 + k * 8, -7, 2, 2.2), glow: 'lamp' });
        body.push({ f: '@glass', d: 'M42-9Q48-9 52-5H44z' }, { f: '@trim.2', d: 'M-56-4H50V-2.6H-56z', op: 0.7 });
      } else {
        // a jet trainer: low swept wing, canopy, a fin with a plain stripe; the smoke trail behind
        smoke.push({ f: { lin: [[0, '@smoke.' + c, 0], [0.7, '@smoke.' + c, 0.55], [1, '@smoke.' + c, 0.9]], x1: -210, y1: 0, x2: -46, y2: 0 }, d: 'M-210-8Q-130-12-46-3V3Q-130 10-210 8z' });
        smoke.push({ f: '@smoke.' + c, d: sceneD.ell(-120, 0, 30, 7), op: 0.25 }, { f: '@smoke.' + c, d: sceneD.ell(-180, -1, 26, 9), op: 0.18 });
        body.push({ f: '@shade.' + c, d: 'M-40-6L-52-26H-42L-24-6z' }, { f: '@trim.' + c, d: 'M-48-20L-50-24H-44L-40-20z' });
        body.push({ f: '@skin.' + c, d: 'M-46-4Q-30-10 10-10Q40-9 58-2Q60 0 58 2Q40 5 10 5H-40Q-46 3-46-4z' });
        body.push({ f: '@shade.' + c, d: 'M-44 0Q-20 4 10 4Q40 4 58 2Q40 6 10 6H-40z', op: 0.8 });
        body.push({ f: '@trim.' + c, d: 'M-40-1H50V1.2H-40z', op: 0.85 });
        body.push({ f: '@glass', d: 'M12-9Q24-18 38-8z' }, { f: '@shade.' + c, d: 'M-6 1L-26 12H-14L14 2z' });
        body.push({ f: '@off', d: sceneD.ell(-44, -1, 3, 3.4) });
      }
      body.push({ f: '#3a9a4a', d: sceneD.circ(-20, 9, 1.3), glow: 'lamp' }, { f: '#e8ecf0', d: sceneD.circ(biz ? 4 : 2, biz ? 4 : 5, 1.2), glow: 'lamp' }, { f: '#ffe8b0', d: sceneD.circ(biz ? 54 : 56, 1, 1.2), glow: 'lamp' }, { f: '#b03028', d: sceneD.circ(-24, 11, 1.4), glow: 'lamp' }, { f: '#e8ecf0', d: sceneD.circ(biz ? -64 : -52, biz ? -30 : -26, 1.3), glow: 'lamp' });
      return { smoke, body };
    },
  });

  /* ---------- a generic airliner (plain white, no livery) ---------- */
  sceneObjDefine({
    id: 'vehicle.airliner',
    category: 'vehicle',
    size: [320, 90],
    variants: 1,
    seasonal: false,
    flippable: true,
    palette: { base: { skin: ['#f2f2f0', '#c8ccd0', '#a8b0b6'], engine: ['#d4d8dc', '#6a727a'], glass: '#2e3a48', grey: ['#8a929a'] } },
    night: { glow: { window: '#ffe2a0', lamp: '#fff4d8' }, on: 1 },
    parts: ['body'],
    tags: ['aircraft', 'airliner', 'airshow', 'airfield', 'sky', 'kit:vehicles', 'role:vehicle'],
    credit: 'drawn for the Farnborough area pack: a generic twin-engine airliner',
    build() {
      const b = [];
      b.push({ f: '@skin.1', d: 'M-120-14L-150-66H-128L-90-16z' }, { f: '@skin.2', d: 'M-132-62H-150L-146-56H-130z' });
      b.push({ f: '@skin.1', d: 'M-20 0L-90 22H-70L20 4z' });   // far wing
      b.push({ f: '@skin.0', d: 'M-150-14Q-140-24-100-26H120Q148-26 158-12Q160 0 148 4H-110Q-140 4-150-14z' });
      b.push({ f: '@skin.1', d: 'M-140-6Q-110 0 120 0Q150 0 156-6Q154 4 146 6H-110Q-136 4-140-6z', op: 0.8 });
      b.push({ f: '@grey.0', d: 'M-146-12H150V-10H-146z', op: 0.5 });
      for (let x = -96; x < 110; x += 8) b.push({ f: '@glass', d: rect(x, -19, 3.6, 4), glow: 'window' });
      b.push({ f: '@glass', d: 'M140-18Q148-18 152-12H142z' });
      b.push({ f: '@skin.0', d: 'M10 2L-70 34H-48L40 4z' }, { f: '@skin.1', d: 'M-70 34H-48L-46 31H-66z' });
      b.push({ f: '@engine.0', d: sceneD.rect(-30, 8, 50, 16, 7) }, { f: '@engine.1', d: sceneD.ell(20, 16, 3, 7) });
      b.push({ f: '@skin.1', d: 'M-150-20L-176-14H-160L-140-14z' });
      b.push({ f: '#b03028', d: sceneD.circ(-68, 34, 1.6), glow: 'lamp' }, { f: '#e8ecf0', d: sceneD.circ(-150, -64, 1.4), glow: 'lamp' }, { f: '#c03028', d: sceneD.circ(0, -27, 1.5), glow: 'lamp' });
      return { body: b };
    },
  });
})();

/* ============================================================
   ARCHETYPES (8.1): Farnborough's repeated scene types. Each build is pure
   and seeded from the row's id; the rows live in 71-scene-uk-farnborough-*.js.
   ============================================================ */
const _farnArch = (function () {
  const R = v => Math.round(v);
  const has = (p, f) => (p.features || []).includes(f);
  const band = (y, amp, ph, foot = 905) => `M-160 ${R(foot)}V${R(y)}Q${R(300 + ph)} ${R(y - amp)} ${R(800 + ph / 2)} ${R(y + amp * 0.4)}T1760 ${R(y - amp * 0.3)}V${R(foot)}Z`;
  const pal = {
    base: { wood: ['#4e6844', '#3c5436'], ground: ['#6a8a44', '#557236', '#42602c'], lawn: ['#6e9246', '#5a7c3a', '#486832'], tarmac: ['#6a6c6e', '#56585a', '#808284'], pave: ['#b8b0a2', '#9c958a', '#cfc8ba'], path: ['#b49c76', '#9a8462'] },
    spring: { wood: ['#5f7e48', '#486640'], ground: ['#74983e', '#5a7a30', '#466228'], lawn: ['#78a048', '#628a3c', '#4e7432'] },
    autumn: { wood: ['#8a6a3a', '#6a5232'], ground: ['#8a7e40', '#6e6232', '#54502a'], lawn: ['#7e8a44', '#687236', '#545c2c'] },
    winter: { wood: ['#5a5a50', '#47483f'], ground: ['#8a9080', '#6e766a', '#586058'], lawn: ['#8a9480', '#727c6a', '#5e6858'], pave: ['#bcb8b0', '#a29e96', '#d4d0c8'] },
  };
  const layers = () => [{ id: 'horizon', depth: 0.08, haze: 0.45 }, { id: 'far', depth: 0.2, haze: 0.24 }, { id: 'mid', depth: 0.45, haze: 0.1 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }];
  const base = (p, setting) => ({
    v: 1, id: String(p.id), view: { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 200, fov: 78, horizon: p.horizon || 480, lift: 1 },
    at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting, signage: false, palette: JSON.parse(JSON.stringify(pal)),
    layers: layers(), sky: { stars: 200, clouds: { n: 4, y: [40, Math.max(200, (p.horizon || 480) - 140)], speed: 5 }, sunR: 24, moonR: 18 },
    ground: [], water: [], place: [], scatter: [], actors: [], flocks: [], particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  });
  const ppl = (d, id, y) => scenePersonScale((sceneObj(id) || { size: [30, 64] }).size[1], y, d.view);
  const farWood = (d, H, seed, n) => {
    d.ground.push({ layer: 'horizon', d: band(H - 8, 10, seed * 7 % 200, H + 40), fill: '@wood.0' });
    d.scatter.push({ obj: 'tree.pond-wood', layer: 'horizon', seed, area: { rect: [-150, H - 2, 1750, H + 16] }, n: n || 20, minGap: 24, s: [0.2, 0.55], flip: 0.5, variant: [0, 1], tint: { col: '#7a8a9a', k: [0, 0.1] }, mask: { noise: { scale: 200, cut: 0.25 } }, anim: false });
  };
  const flocks = (d, H, seed) => d.flocks.push({ obj: 'bird.small-flight', n: 4, area: [300, 160, 1500, Math.max(240, H - 100)], speed: 40, s: 0.45, seed, layer: 'horizon' });
  /** Farnborough's sky: a display pair trailing smoke, a business jet climbing out, an airliner fly-by (by features). */
  const sky = (d, p, H) => {
    if (has(p, 'display')) {
      d.actors.push({ obj: 'vehicle.display-jet', layer: 'horizon', path: [[-400, 230], [700, 150], [2000, 210]], speed: 120, loop: 'loop', s: 0.9, seed: 201, variant: 0, offset: 0.1 });
      d.actors.push({ obj: 'vehicle.display-jet', layer: 'horizon', path: [[-460, 262], [640, 182], [1940, 242]], speed: 120, loop: 'loop', s: 0.9, seed: 202, variant: 1, offset: 0.1 });
      d.actors.push({ obj: 'vehicle.display-jet', layer: 'horizon', path: [[2000, 120], [-400, 170]], speed: 110, loop: 'loop', s: 0.7, seed: 203, variant: 0, flip: true, offset: 0.6 });
    }
    if (has(p, 'flypast')) d.actors.push({ obj: 'vehicle.airliner', layer: 'horizon', path: [[-500, Math.max(220, H - 170)], [2100, Math.max(160, H - 260)]], speed: 55, loop: 'loop', s: 0.9, seed: 204, offset: 0.35 });
    if (has(p, 'bizjet')) d.actors.push({ obj: 'vehicle.display-jet', layer: 'horizon', path: [[-200, Math.max(220, H - 120)], [1900, 110]], speed: 70, loop: 'loop', s: 0.55, seed: 205, variant: 2, offset: 0.5 });
  };
  const finish = (d) => {
    const out = [];
    d.scatter.forEach((r, i) => {
      if (r.variant === 'random') r.variant = [0, 1];
      if (r.n >= 30 && !r.tint && Array.isArray(r.variant) && r.variant[0] === 0 && r.variant[1] === 1) {
        const h = Math.round(r.n / 2);
        out.push(Object.assign({}, r, { n: h, variant: 0 }), Object.assign({}, r, { n: r.n - h, variant: 1, seed: r.seed + 500, anim: r.anim === 'strip' ? false : r.anim, tint: { col: i % 2 ? '#8a7a40' : '#6a7a3a', k: [0.08, 0.08] } }));
      } else { if (!r.tint && r.n >= 20) r.tint = { col: '#7a8a6a', k: [0, 0.1] }; out.push(r); }
    });
    d.scatter = out;
    if (d.water.length) for (const e of d.scatter.concat(d.place)) if (['horizon', 'far', 'mid'].includes(e.layer) && e.reflect == null) e.reflect = true;
    return d;
  };
  const landmark = (d, p, y, layer) => {
    if (!p.landmark || !sceneObj(p.landmark)) return;
    d.place.push({ obj: p.landmark, x: Number.isFinite(p.lmx) ? p.lmx : 800, y, s: Number.isFinite(p.lms) ? p.lms : 1, variant: Number.isFinite(p.lmv) ? p.lmv : 0, layer: layer || 'mid', seed: 3, anim: false });
  };
  const AT = ['afternoon', 'dawn', 'morning', 'day', 'noon', 'golden', 'sunset', 'dusk', 'night'];
  const common = { id: 'id', name: 'sign', lat: 'number', lon: 'number', heading: 'number', horizon: 'number', at: AT, lmx: 'number', lmy: 'number', lms: 'number', lmv: 'number', features: 'list' };

  /* ---------- farnborough-airfield: the airshow crowd line, the static park, the business park, the precinct ---------- */
  function airfield(p, u) {
    const form = p.form || 'showline';
    const d = base(p, form === 'precinct' ? 'urban' : 'mixed'), H = d.view.horizon;
    farWood(d, H, 11, form === 'precinct' ? 10 : 22);
    if (form === 'showline' || form === 'static') {
      // the airfield: grass to the far trees, the runway band, the taxiway and the crowd-line fence
      d.ground.push({ layer: 'far', d: band(H + 4, 3, 30), fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], y1: H, y2: H + 120 } });
      const ry = H + 26;
      d.ground.push({ layer: 'far', d: `M-160 ${ry}H1760V${ry + 18}H-160Z`, fill: '@tarmac.1' }, { layer: 'far', d: `M-160 ${ry + 8}H1760V${ry + 10}H-160Z`, fill: '#e8e8e0' });
      landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : H + 22, p.lmlayer || 'far');
      d.scatter.push({ obj: { 'plant.grass': 4 }, layer: 'far', seed: 12, area: { rect: [-150, ry + 20, 1750, H + 90] }, n: 140, minGap: 12, s: [0.2, 0.4], flip: 0.5, variant: 'random', anim: false });
      // the near apron / showground: tarmac (static) or grass (crowd line)
      const cy = H + 110;
      d.ground.push({ layer: 'mid', d: band(H + 86, 4, 140), fill: form === 'static' ? { lin: [[0, '@tarmac.2'], [1, '@tarmac.0']], y1: H + 86, y2: 905 } : { lin: [[0, '@lawn.0'], [1, '@lawn.1']], y1: H + 86, y2: 905 } });
      if (form === 'showline') {
        // the hospitality chalets along the crowd line, plain flags
        for (let i = 0; i < 4; i++) d.place.push({ obj: 'structure.airshow-chalet', x: -40 + i * 420 + (p.chx || 0), y: cy, s: 1.0, variant: i % 2, flip: i % 2 === 1, layer: 'mid', seed: 20 + i });
        d.ground.push({ layer: 'near', d: band(cy + 60, 4, 60), fill: { lin: [[0, '@lawn.1'], [1, '@lawn.2']], y1: cy + 60, y2: 905 } });
        d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 0.5 }, layer: 'near', seed: 28, area: { rect: [-150, cy + 70, 1750, 905] }, n: 220, minGap: 18, s: [0.5, 1.0], sByY: [[cy + 70, 0.7], [900, 1.3]], flip: 0.5, variant: 'random', anim: false });
        // the crowd: watchers, photographers, families, picnickers
        const crowd = ['person.photographer', 'person.family', 'person.couple', 'person.walker', 'person.picnicker', 'person.phone-idler', 'person.child-ball', 'person.elderly-couple'];
        for (let i = 0; i < 14; i++) {
          const id = crowd[i % crowd.length], y = cy + 90 + (i % 3) * 60;
          d.place.push({ obj: id, x: 40 + i * 116 + (i % 2) * 30, y, s: ppl(d, id, y), variant: i % 4, flip: i % 3 === 0, layer: y > cy + 160 ? 'fore' : 'near', seed: 40 + i, anim: i % 4 === 0 });
        }
        d.actors.push({ obj: 'person.walker', layer: 'fore', path: [[-80, 850], [1680, 860]], speed: 12, loop: 'loop', s: ppl(d, 'person.walker', 850), seed: 60, offset: 0.3, variant: 5 });
        d.actors.push({ obj: 'person.buggy-walker', layer: 'near', path: [[1680, cy + 110], [-80, cy + 110]], speed: 9, loop: 'loop', s: ppl(d, 'person.buggy-walker', cy + 110), seed: 61, offset: 0.7, flip: true });
      } else {
        // the static park: aircraft parked on the apron with visitors among them
        d.place.push({ obj: 'vehicle.airliner', x: 520, y: H + 150, s: 1.5, layer: 'mid', seed: 21 }, { obj: 'vehicle.display-jet', x: 1180, y: H + 190, s: 1.6, variant: 2, flip: true, layer: 'mid', seed: 22, anim: false });
        d.place.push({ obj: 'vehicle.display-jet', x: 1400, y: H + 300, s: 2.2, variant: 0, layer: 'near', seed: 23, anim: false }, { obj: 'structure.airshow-chalet', x: 1400, y: H + 100, s: 0.7, layer: 'mid', seed: 24 });
        const vis = ['person.photographer', 'person.family', 'person.couple', 'person.child-scooter', 'person.walker', 'person.student'];
        for (let i = 0; i < 10; i++) { const id = vis[i % vis.length], y = H + 200 + (i % 3) * 70; d.place.push({ obj: id, x: 80 + i * 150, y, s: ppl(d, id, y), variant: i % 4, flip: i % 2 === 0, layer: y > H + 300 ? 'fore' : 'near', seed: 70 + i, anim: false }); }
        d.actors.push({ obj: 'person.walker', layer: 'fore', path: [[-80, 860], [1680, 850]], speed: 11, loop: 'loop', s: ppl(d, 'person.walker', 850), seed: 80, offset: 0.2, variant: 2 });
        d.actors.push({ obj: 'person.family', layer: 'near', path: [[1680, H + 250], [-80, H + 250]], speed: 7, loop: 'loop', s: ppl(d, 'person.family', H + 250), seed: 81, offset: 0.6, flip: true });
        d.scatter.push({ obj: { 'street.bollard': 1 }, layer: 'near', seed: 82, area: { rect: [-150, H + 160, 1750, H + 170] }, n: 18, minGap: 80, s: [0.7, 0.8], flip: 0.5, variant: 'random', anim: false });
      }
    } else if (form === 'business') {
      // the business park: offices round a lawn and a pond, the airport beyond, jets climbing out
      d.ground.push({ layer: 'far', d: band(H + 4, 3, 30), fill: { lin: [[0, '@lawn.0'], [1, '@lawn.1']], y1: H, y2: H + 160 } });
      landmark(d, p, Number.isFinite(p.lmy) ? p.lmy : H + 10, p.lmlayer || 'horizon');
      for (let i = 0; i < 5; i++) d.place.push({ obj: 'building.business-park-office', x: -40 + i * 380 + (i % 2) * 40, y: H + 70 + (i % 2) * 20, s: 1.15 + (i % 2) * 0.2, variant: i % 3, flip: i % 2 === 1, layer: 'mid', seed: 30 + i });
      d.scatter.push({ obj: { 'tree.plane': 2, 'tree.bank-birch': 1, 'tree.bank-oak': 1 }, layer: 'mid', seed: 36, area: { rect: [-150, H + 96, 1750, H + 120] }, n: 9, minGap: 150, s: [0.45, 0.65], flip: 0.5, variant: 'random', anim: false });
      const wy = H + 180;
      d.ground.push({ layer: 'near', d: band(H + 130, 4, 80), fill: { lin: [[0, '@lawn.1'], [1, '@lawn.2']], y1: H + 130, y2: 905 } });
      d.water.push({ layer: 'near', d: `M200 ${wy}Q800 ${wy - 18} 1400 ${wy}Q1460 ${wy + 40} 1300 ${wy + 70}Q800 ${wy + 90} 260 ${wy + 66}Q140 ${wy + 40} 200 ${wy}Z`, y0: wy - 18, y1: wy + 90, base: ['#8ab6c4', '#4f8ca0', '#2c5f74'], reflect: true, shimmer: 18, lightPath: true });
      d.actors.push({ obj: 'bird.mallard', layer: 'near', path: [[500, wy + 30], [1000, wy + 36]], speed: 4, loop: 'pingpong', s: 0.4, seed: 37 });
      d.ground.push({ layer: 'fore', d: `M-160 905V${wy + 110}Q800 ${wy + 96} 1760 ${wy + 110}V905Z`, fill: { lin: [[0, '@pave.0'], [1, '@pave.1']], y1: wy + 100, y2: 905 } });
      d.scatter.push({ obj: { 'plant.grass': 4, 'plant.wildflowers': 0.6, 'plant.reed': 0.6 }, layer: 'near', seed: 38, area: { rect: [-150, H + 136, 1750, wy + 100] }, n: 200, minGap: 16, s: [0.4, 0.8], flip: 0.5, variant: 'random', anim: false, mask: { avoid: [{ poly: [[200, wy - 10], [1420, wy - 10], [1420, wy + 80], [200, wy + 80]] }] } });
      d.scatter.push({ obj: { 'plant.planter': 2, 'street.bench': 1, 'plant.shrub': 2, 'street.bollard': 1 }, layer: 'fore', seed: 39, area: { rect: [-150, wy + 130, 1750, 905] }, n: 40, minGap: 70, s: [0.8, 1.2], flip: 0.5, variant: 'random', anim: false });
      for (const [x, id, v] of [[300, 'person.commuter', 0], [700, 'person.phone-idler', 1], [1240, 'person.commuter', 2]]) d.place.push({ obj: id, x, y: wy + 170, s: ppl(d, id, wy + 170), variant: v, layer: 'fore', seed: 90 + v, anim: false });
      d.actors.push({ obj: 'person.jogger', layer: 'fore', path: [[-80, wy + 150], [1680, wy + 150]], speed: 20, loop: 'loop', s: ppl(d, 'person.jogger', wy + 150), seed: 94, offset: 0.2 });
      d.actors.push({ obj: 'person.cyclist-commuter', layer: 'fore', path: [[1680, wy + 200], [-80, wy + 200]], speed: 24, loop: 'loop', s: ppl(d, 'person.cyclist-commuter', wy + 200), seed: 95, offset: 0.6, flip: true });
      d.place.push({ obj: 'street.lamppost', x: 160, y: wy + 140, s: 1, layer: 'fore', seed: 96 }, { obj: 'street.lamppost', x: 1460, y: wy + 140, s: 1, layer: 'fore', seed: 97 });
    } else {
      // precinct: Queensmead, a pedestrian street of shopfronts, paving, planters and trees
      d.ground.push({ layer: 'far', d: band(H + 4, 2, 30), fill: '@pave.1' });
      const fy = H + 140;
      d.scatter.push({ obj: { 'building.shopfront': 1 }, layer: 'mid', seed: 52, area: { rect: [-150, fy - 4, 1750, fy] }, n: 12, minGap: 140, s: [0.5, 0.62], flip: 0.5, variant: 'random' });
      d.scatter.push({ obj: { 'building.business-park-office': 1 }, layer: 'far', seed: 53, area: { rect: [-150, H + 40, 1750, H + 50] }, n: 4, minGap: 360, s: [0.8, 1.0], flip: 0.5, variant: [0, 1, 2], tint: { col: '#9aa8b4', k: [0.1, 0.2] } });
      d.ground.push({ layer: 'near', d: `M-160 905V${fy}H1760V905Z`, fill: { lin: [[0, '@pave.0'], [1, '@pave.1']], y1: fy, y2: 905 } });
      for (let i = 0; i < 9; i++) d.ground.push({ layer: 'near', d: `M${-160 + i * 240} 905L${640 + i * 40} ${fy}H${646 + i * 40}L${-150 + i * 240} 905Z`, fill: '@pave.2' });
      for (let i = 0; i < 5; i++) d.place.push({ obj: i % 2 ? 'tree.plane' : 'street.lamppost', x: 80 + i * 360, y: fy + 120, s: i % 2 ? 0.7 : 1.0, variant: i % 3, layer: 'near', seed: 60 + i, anim: false });
      d.scatter.push({ obj: { 'plant.planter': 3, 'street.bench': 1.5, 'street.bollard': 1 }, layer: 'near', seed: 66, area: { rect: [-150, fy + 60, 1750, fy + 140] }, n: 16, minGap: 90, s: [0.8, 1.0], flip: 0.5, variant: 'random', anim: false });
      const shop = ['person.shopper', 'person.couple', 'person.buggy-walker', 'person.elderly-walker', 'person.takeaway-walker', 'person.student', 'person.child-scooter'];
      for (let i = 0; i < 7; i++) { const y = fy + 40 + (i % 3) * 50, id = shop[i]; d.actors.push({ obj: id, layer: y > fy + 120 ? 'fore' : 'near', path: i % 2 ? [[1700, y], [-100, y]] : [[-100, y], [1700, y]], speed: 7 + i, loop: 'loop', s: ppl(d, id, y), seed: 70 + i, offset: i / 7, flip: i % 2 === 1 }); }
      d.place.push({ obj: 'person.bench-sitter', x: 560, y: fy + 200, s: ppl(d, 'person.bench-sitter', fy + 200), layer: 'fore', seed: 80 }, { obj: 'person.busker', x: 1220, y: fy + 210, s: ppl(d, 'person.busker', fy + 210), layer: 'fore', seed: 81 });
      d.place.push({ obj: 'bird.pigeon', x: 900, y: fy + 230, s: 0.9, layer: 'fore', seed: 82 }, { obj: 'bird.pigeon', x: 950, y: fy + 236, s: 0.85, flip: true, variant: 1, layer: 'fore', seed: 83 });
    }
    sky(d, p, H);
    flocks(d, H, 99);
    return finish(d);
  }

  /* ---------- farnborough-place: the Fleet archetypes' ground with Farnborough's own sky ---------- */
  function place(p, u) {
    const fa = typeof _fleetArch !== 'undefined' ? _fleetArch : null;
    const form = p.form || 'street';
    let d;
    if (fa && ['band', 'channel', 'lake'].includes(form)) d = fa.water(p, u);
    else if (fa && ['meadow', 'wood', 'wetland', 'lawn'].includes(form)) d = fa.green(p, u);
    else if (fa) d = fa.town(p, u);
    else d = airfield(Object.assign({}, p, { form: 'precinct' }), u);
    sky(d, p, d.view.horizon);
    return d;
  }

  return { airfield, place, common };
})();
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  const c = _farnArch.common;
  const extra = { form: ['showline', 'static', 'business', 'precinct', 'lake', 'channel', 'band', 'meadow', 'wood', 'wetland', 'lawn', 'street', 'church', 'station'], side: ['right', 'left'] };
  const num = ['nearbank', 'vx', 'wy0', 'wy1', 'walky', 'walkx0', 'walkx1', 'trainx', 'boatx', 'pathx', 'brooky', 'bwx', 'benchx', 'logx', 'fronty', 'chx'];
  const params = Object.assign({}, c, extra, Object.fromEntries(num.map(k => [k, 'number'])), { lmlayer: ['mid', 'far', 'near', 'fore', 'horizon'], landmark: 'string' });
  const meta = () => null;
  sceneArchetypeDefine('farnborough-airfield', { params, kits: ['temperate', 'urban', 'vehicles', 'people'], meta, build: (p, u) => _farnArch.airfield(p, u) });
  sceneArchetypeDefine('farnborough-place', { params, kits: ['temperate', 'urban', 'water', 'vehicles', 'people'], meta, build: (p, u) => _farnArch.place(p, u) });
})();

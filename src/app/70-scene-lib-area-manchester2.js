/* ============================================================
   SCENE LIBRARY, AREA manchester2 (docs/dev/SCENE_ENGINE.md 2.2, 8.1): more Manchester and Salford
   objects and the 'mcr2-city' archetype the second batch of composed Manchester scenes is built
   from (71-scene-uk-manchester2-*.js, registered by 72-anim-pack-uk-area-manchester2.js).
   Drawn after the public form of each place, simplified: no text, no emblems, no club colours.
   - landmark.mcr-cathedral           the dark sandstone Perpendicular church: west tower, battlements,
                                      pinnacles and the long run of aisle windows
   - landmark.mcr-corn-exchange       the Edwardian exchange: its curved corner and copper dome
   - landmark.mcr-chinatown-arch      a Chinese paifang gate: red columns, three tiled roofs, a blank panel
   - landmark.mcr-etihad              a bowl stadium with its ring of cable masts and spiral ramp towers
   - landmark.mcr-old-trafford        a tall football stand with its roof trusses (generic, no club)
   - landmark.mcr-sim-station         the 1830 railway station house and warehouse (now the museum)
   - landmark.heaton-hall             the neoclassical hall: domed bow, colonnades, end pavilions
   - landmark.mcr-chips               three stacked, offset 'chips' of flats by the marina, colour bands
   - landmark.mcr-piccadilly-pavilion the long smooth concrete pavilion wall, its roof slab and a fountain
   - street.mcr-bunting               rainbow pennants strung between two posts (no text)
   PURE: definitions only; build() runs lazily. Names are local to the IIFE except the archetype
   function sceneArchMcr2City.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const { f1, rect, ell, circ, poly, define, winGroups } = sceneDraw;
  const lin = (a, b, y1, y2, x1, x2) => ({ lin: [[0, a], [1, b]], x1: x1 || 0, y1, x2: x2 || 0, y2 });
  const linX = (a, b, x1, x2) => ({ lin: [[0, a], [1, b]], x1, y1: 0, x2, y2: 0 });
  const lancet = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w * 0.55)}L${f1(x + w / 2)} ${f1(y - w * 0.25)}L${f1(x + w)} ${f1(y + w * 0.55)}V${f1(y + h)}z`;
  const archW = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w / 2)}a${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(w)} 0V${f1(y + h)}z`;
  const spike = (x, y, w, h) => poly([[x - w / 2, y], [x, y - h], [x + w / 2, y]]);
  const crenels = (x0, x1, y, step, h) => { let d = ''; for (let x = x0; x < x1 - step / 2; x += step * 2) d += rect(x, y - h, step, h); return d; };

  /* ---------- landmark.mcr-cathedral ---------- */
  define({
    id: 'landmark.mcr-cathedral', category: 'landmark', size: [600, 430], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#a08068', '#8a6a54', '#6e5242', '#4c382c'], roof: ['#6a7276', '#4e5458'], glass: ['#323c48', '#232a34'], flood: '#ffe2b0', warm: '#ffcf86',
    } },
    night: { glow: { window: '#ffd890' }, on: 0.6 },
    shadow: { rx: 290, ry: 9, h: 160 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/manchester-cathedral', 'uk', 'manchester', 'cathedral', 'gothic', 'church', 'kit:urban'],
    credit: 'native: drawn for the second Manchester area batch (after the Perpendicular cathedral by the Irwell)',
    build() {
      const body = [], lit = [];
      // the nave and aisles: low aisle wall, the clerestory set back, the lead roof behind
      const A0 = -150, A1 = 292, AY = -112, CY = -168;
      body.push({ f: lin('@roof.0', '@roof.1', CY - 20, CY), d: poly([[A0 + 20, CY], [A0 + 30, CY - 16], [A1 - 14, CY - 16], [A1 - 6, CY]]) });
      body.push({ f: lin('@stone.0', '@stone.1', CY, AY), d: rect(A0 + 20, CY, A1 - A0 - 26, AY - CY + 2) });
      body.push({ f: lin('@stone.0', '@stone.2', AY, 0), d: rect(A0, AY, A1 - A0, -AY) }, ['@stone.3', rect(A0, -8, A1 - A0, 8)]);
      body.push(['@stone.2', rect(A1 - 8, AY, 8, -AY), 0.7]);
      body.push({ f: '@stone.1', d: crenels(A0 + 20, A1 - 6, CY, 7, 7) }, { f: '@stone.1', d: crenels(A0, A1, AY, 7, 7) });
      // bays: buttresses with pinnacles, big aisle windows with mullions and transoms, clerestory lights
      let mull = '';
      for (let x = A0 + 6, k = 0; x < A1 - 30; x += 46, k++) {
        body.push(['@stone.2', rect(x, AY - 4, 9, 108)], ['@stone.0', spike(x + 4.5, AY - 6, 8, 26)], ['@stone.1', spike(x + 4.5, CY - 6, 6, 20)]);
        body.push({ f: '@glass.0', d: lancet(x + 15, AY + 22, 28, 62), glow: 'window' }, { f: '@glass.1', d: lancet(x + 16, CY + 12, 24, 30), glow: 'window' });
        mull += `M${x + 24.3} ${AY + 18}v66M${x + 33.6} ${AY + 18}v66M${x + 15} ${AY + 52}h28M${x + 28} ${CY + 10}v32`;
      }
      body.push({ s: '@stone.1', w: 1.4, op: 0.85, d: mull, detail: true });
      body.push({ s: '@stone.3', w: 1, op: 0.5, d: `M${A0} ${AY + 14}H${A1}M${A0} -30H${A1}M${A0 + 20} ${CY + 6}H${A1 - 6}`, detail: true });
      // a south porch with its own gable
      body.push({ f: '@stone.1', d: poly([[60, 0], [60, -70], [84, -96], [108, -70], [108, 0]]) }, ['@glass.1', archW(72, -56, 24, 56)], ['@stone.0', spike(84, -96, 6, 16)]);
      // the west tower: buttressed, the great west window, belfry stage, battlements and four pinnacles
      const T0 = -290, T1 = -160, TT = -350;
      body.push({ f: linX('@stone.0', '@stone.2', T0, T1), d: rect(T0, TT, T1 - T0, -TT) });
      for (const bx of [T0 - 6, T1 - 10]) body.push({ f: '@stone.2', d: `M${bx} 0V${TT + 40}l8 -10l8 10V0z` });
      body.push({ s: '@stone.3', w: 1.2, op: 0.55, d: `M${T0} -120H${T1}M${T0} -230H${T1}M${T0} ${TT + 10}H${T1}`, detail: true });
      body.push({ f: '@glass.0', d: archW(-248, -110, 46, 96), glow: 'window' }, { s: '@stone.1', w: 1.6, d: 'M-225 -110v96M-240 -70h30M-248 -40h46', detail: true });
      body.push(['@stone.3', archW(-238, -36, 26, 36)]);
      for (const bx of [-262, -214]) body.push({ f: '@glass.1', d: lancet(bx, -300, 22, 54), glow: 'window' }, { s: '@stone.1', w: 1, d: `M${bx + 11} -300v54M${bx} -270h22`, detail: true });
      body.push({ f: '@glass.1', d: lancet(-232, -206, 14, 40), glow: 'window' }, ['@stone.3', circ(-225, -150, 9)], ['@stone.1', circ(-225, -150, 6)]);
      body.push(['@stone.1', rect(T0 - 4, TT - 4, T1 - T0 + 8, 8)], { f: '@stone.1', d: crenels(T0 - 4, T1 + 4, TT - 4, 9, 12) });
      for (const px of [T0 - 2, T0 + 40, T1 - 40, T1 + 2]) body.push(['@stone.0', spike(px, TT - 4, 12, 70)], ['@stone.2', poly([[px, TT - 74], [px + 6, TT - 4], [px + 1, TT - 4]]), 0.6]);
      body.push(['@stone.3', rect(T0 - 6, -8, T1 - T0 + 12, 8)]);
      // night: floodlit tower and the lit nave
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.45]], x1: 0, y1: TT - 74, x2: 0, y2: 0 }, d: rect(T0 - 8, TT - 74, T1 - T0 + 16, -TT + 74) });
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.3]], x1: 0, y1: CY - 20, x2: 0, y2: 0 }, d: rect(A0, CY - 20, A1 - A0, -CY + 20) });
      lit.push(['@warm', archW(72, -56, 24, 56), 0.6]);
      return { body, lit };
    },
  });

  /* ---------- landmark.mcr-corn-exchange ---------- */
  define({
    id: 'landmark.mcr-corn-exchange', category: 'landmark', size: [580, 360], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#d4a884', '#bc8e6a', '#97704e', '#6e5038'], dome: ['#8ab8a4', '#5e9280', '#3e6a5c'], roof: ['#5a5e62', '#3e4246'],
      glass: ['#2e3a46', '#46586a'], awning: ['#3a4a5a', '#5a3a3a', '#3a5a4a'], warm: '#ffd290', gold: '#d8b060',
    } },
    night: { glow: { window: '#ffe0a0', shop: '#fff0c8' }, on: 0.6 },
    shadow: { rx: 280, ry: 9, h: 180 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/corn-exchange', 'uk', 'manchester', 'edwardian', 'dome', 'exchange', 'kit:urban'],
    credit: 'native: drawn for the second Manchester area batch (after the Edwardian exchange by the cathedral)',
    build(v, r) {
      const body = [], lit = [], X0 = -290, X1 = 186, TOP = -228;
      // the long front: five storeys and an attic, cornices, a glazed roof ridge behind
      body.push({ f: lin('@glass.1', '@glass.0', TOP - 30, TOP), d: poly([[X0 + 30, TOP], [X0 + 60, TOP - 26], [X1 - 30, TOP - 26], [X1, TOP]]) });
      let rib = ''; for (let x = X0 + 66; x < X1 - 30; x += 14) rib += `M${x} ${TOP - 26}v24`;
      body.push({ s: '@roof.0', w: 1, op: 0.7, d: rib, detail: true });
      body.push({ f: lin('@stone.0', '@stone.1', TOP, 0), d: rect(X0, TOP, X1 - X0, -TOP) });
      body.push({ s: '@stone.2', w: 2, op: 0.7, d: `M${X0} -52H${X1}M${X0} -150H${X1}M${X0} ${TOP + 6}H${X1}`, detail: true });
      body.push(['@stone.2', rect(X0 - 4, TOP - 8, X1 - X0 + 8, 9)]);
      let bal = ''; for (let x = X0 + 4; x < X1 - 4; x += 8) bal += `M${x} ${TOP - 8}v-9`;
      body.push({ s: '@stone.1', w: 2, d: bal + `M${X0} ${TOP - 18}H${X1}` });
      const cells = [];
      for (let f = 0; f < 4; f++) for (let x = X0 + 12; x < X1 - 18; x += 30) cells.push([x, TOP + 18 + f * 44, 16, f === 3 ? 22 : 28]);
      winGroups(r, cells, 6).forEach(d => body.push({ f: '@glass.0', d, glow: 'window' }));
      let sills = ''; for (const c of cells) sills += `M${f1(c[0] - 2)} ${f1(c[1] + c[3] + 2)}h${f1(c[2] + 4)}M${f1(c[0] - 1)} ${f1(c[1] - 3)}h${f1(c[2] + 2)}`;
      body.push({ s: '@stone.0', w: 1.6, d: sills, detail: true });
      // pilasters between bays
      let pil = ''; for (let x = X0 + 4; x < X1; x += 90) pil += rect(x, TOP, 7, -TOP - 52);
      body.push(['@stone.2', pil, 0.55]);
      // the ground floor: shopfronts and awnings
      for (let k = 0, x = X0 + 6; x < X1 - 40; x += 58, k++) {
        body.push({ f: '@glass.1', d: rect(x, -46, 48, 40), glow: 'shop' }, ['@stone.3', rect(x + 23, -46, 2, 40)], ['@stone.3', rect(x - 2, -54, 52, 5)], ['@stone.2', rect(x + 2, -14, 44, 8), 0.7]);
        body.push(['@awning.' + (k % 3), poly([[x - 3, -48], [x + 51, -48], [x + 55, -36], [x - 7, -36]])]);
        lit.push({ f: '@warm', d: rect(x, -46, 48, 40), op: 0.45 });
      }
      // the curved corner: a drum of windows rising into the copper dome, lantern and finial
      const CX = 236, CR = 50;
      body.push({ f: linX('@stone.0', '@stone.2', CX - CR, CX + CR), d: rect(CX - CR, TOP - 30, CR * 2, -TOP + 30) });
      body.push({ s: '@stone.2', w: 2, op: 0.7, d: `M${CX - CR} -52H${CX + CR}M${CX - CR} -150H${CX + CR}M${CX - CR} ${TOP - 24}H${CX + CR}`, detail: true });
      for (let f = 0; f < 5; f++) for (const dx of [-32, -8, 16]) body.push({ f: '@glass.0', d: f === 4 ? archW(CX + dx, TOP - 22 + f * 44 - 176 + 176, 14, 26) : rect(CX + dx, TOP + 4 + f * 44 - 20, 14, 26), glow: 'window' });
      body.push(['@stone.1', rect(CX - CR - 6, TOP - 38, CR * 2 + 12, 10)]);
      body.push({ f: linX('@dome.0', '@dome.2', CX - CR, CX + CR), d: `M${CX - CR + 4} ${TOP - 38}Q${CX - CR + 4} ${TOP - 112} ${CX} ${TOP - 116}Q${CX + CR - 4} ${TOP - 112} ${CX + CR - 4} ${TOP - 38}z` });
      body.push({ s: '@dome.2', w: 1.2, op: 0.7, d: `M${CX - 24} ${TOP - 40}Q${CX - 22} ${TOP - 96} ${CX} ${TOP - 114}M${CX + 24} ${TOP - 40}Q${CX + 22} ${TOP - 96} ${CX} ${TOP - 114}M${CX} ${TOP - 40}V${TOP - 114}`, detail: true });
      body.push(['@stone.0', rect(CX - 10, TOP - 140, 20, 26)], ['@glass.0', rect(CX - 5, TOP - 134, 10, 16)], ['@dome.1', `M${CX - 13} ${TOP - 140}Q${CX} ${TOP - 160} ${CX + 13} ${TOP - 140}z`], ['@gold', rect(CX - 1.5, TOP - 172, 3, 16)], ['@gold', circ(CX, TOP - 174, 3)]);
      // a small domed turret at the far end
      body.push(['@stone.1', rect(X0 + 6, TOP - 48, 30, 30)], ['@dome.1', `M${X0 + 4} ${TOP - 48}Q${X0 + 21} ${TOP - 80} ${X0 + 38} ${TOP - 48}z`], ['@gold', rect(X0 + 20, TOP - 92, 2, 14)]);
      body.push(['@stone.3', rect(X0, -6, CX + CR - X0, 6)]);
      lit.push({ f: { lin: [[0, '#ffe8c0', 0], [1, '#ffe8c0', 0.32]], x1: 0, y1: TOP - 170, x2: 0, y2: 0 }, d: rect(CX - CR - 6, TOP - 170, CR * 2 + 12, -TOP + 170) });
      return { body, lit };
    },
  });

  /* ---------- landmark.mcr-chinatown-arch ---------- */
  define({
    id: 'landmark.mcr-chinatown-arch', category: 'landmark', size: [460, 330], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      red: ['#c4302a', '#9a201c', '#e0503e'], tile: ['#d8a838', '#b88420', '#f0c860'], eave: ['#2e7a5a', '#1e5a42'], gold: ['#e0b850', '#a8842c'],
      panel: ['#1e3a6a', '#2a4c86'], stone: ['#b8b2a6', '#8a857a', '#d4cfc2'], lan: '#e0402e', lanL: '#ffb070', dark: '#2a1a16',
    } },
    night: { glow: { lamp: '#ffc070' }, on: 1 },
    shadow: { rx: 210, ry: 7, h: 260 },
    tags: ['landmark', 'signature', 'place:uk/manchester-chinatown', 'uk', 'manchester', 'chinatown', 'arch', 'gate', 'kit:urban'],
    credit: 'native: drawn for the second Manchester area batch (after the Chinatown archway; the panel is left blank)',
    build() {
      const body = [], lit = [];
      // four columns on stone plinths: the outer pair shorter
      for (const [x, h] of [[-176, 176], [-72, 214], [72, 214], [176, 176]]) {
        body.push(['@stone.1', rect(x - 15, -26, 30, 26)], ['@stone.2', rect(x - 15, -26, 30, 4)], ['@stone.0', rect(x - 12, -20, 24, 18)]);
        body.push({ f: linX('@red.2', '@red.1', x - 9, x + 9), d: rect(x - 9, -h, 18, h - 26) });
        body.push({ s: '@gold.0', w: 1.4, d: `M${x - 9} ${-h + 20}h18M${x - 9} ${-h + 26}h18M${x - 9} -40h18`, detail: true });
        body.push(['@red.1', rect(x + 3, -h, 6, h - 26), 0.6], ['@gold.1', rect(x - 11, -h - 4, 22, 6)]);
      }
      // a pair of guardian lions on the inner plinths
      for (const s of [-1, 1]) {
        const lx = s * 100;
        body.push(['@stone.1', rect(lx - 12, -14, 24, 14)], ['@stone.2', `M${lx - 9} -14V-30Q${lx} -42 ${lx + 9} -30V-14z`], ['@stone.0', circ(lx + s * 3, -36, 7)], { f: '@stone.1', d: circ(lx + s * 5, -38, 2.5), detail: true });
      }
      // beams: lower lintel with carved blocks, the blank central panel, brackets
      body.push({ f: lin('@red.0', '@red.1', -170, -150), d: rect(-80, -170, 160, 20) }, { f: lin('@red.0', '@red.1', -140, -124), d: rect(-184, -140, 104, 16) + rect(80, -140, 104, 16) });
      let blocks = ''; for (let x = -76; x < 76; x += 12) blocks += rect(x, -166, 7, 12);
      for (const s of [-1, 1]) for (let x = 84; x < 180; x += 12) blocks += rect(s > 0 ? x : -x - 7, -137, 7, 10);
      body.push({ f: '@gold.0', d: blocks, op: 0.85, detail: true });
      body.push(['@gold.1', rect(-52, -226, 104, 52)], ['@panel.0', rect(-46, -220, 92, 40)], { s: '@gold.0', w: 1.6, d: rect(-42, -216, 84, 32) });
      body.push(['@red.0', rect(-80, -246, 160, 18)], ['@eave.0', rect(-80, -238, 160, 6)]);
      let dg = ''; for (let x = -78; x < 78; x += 8) dg += rect(x, -256, 5, 8);
      body.push({ f: '@eave.1', d: dg, detail: true });
      // the roofs: a tall central one with upswept eaves, lower side roofs; tiled ridges and finials
      const roof = (cx, y, hw, h, sw) => `M${cx - hw - sw} ${y - sw * 0.7}Q${cx - hw + 6} ${y + 4} ${cx - hw + 26} ${y}H${cx + hw - 26}Q${cx + hw - 6} ${y + 4} ${cx + hw + sw} ${y - sw * 0.7}L${cx + hw - 20} ${y - h}H${cx - hw + 20}z`;
      body.push({ f: lin('@tile.2', '@tile.1', -300, -256), d: roof(0, -256, 108, 44, 22) });
      let tl = ''; for (let x = -110; x <= 110; x += 9) tl += `M${x} -258L${f1(x * 0.8)} -298`;
      for (let x = -116; x <= 116; x += 23) body.push(['@tile.1', circ(x, -254 - (Math.abs(x) > 90 ? (Math.abs(x) - 90) * 0.5 : 0), 3.2)]);
      body.push({ s: '@tile.1', w: 1, op: 0.6, d: tl, detail: true }, ['@eave.0', rect(-90, -306, 180, 8)], ['@gold.0', `M-96 -306l-10 -14l12 8zM96 -306l10 -14l-12 8z`], ['@gold.0', circ(0, -312, 6)]);
      for (const s of [-1, 1]) {
        const cx = s * 130;
        body.push({ f: '@red.1', d: rect(cx - 50, -158, 100, 16) }, { f: '@eave.1', d: (() => { let d = ''; for (let x = cx - 48; x < cx + 48; x += 8) d += rect(x, -164, 5, 7); return d; })(), detail: true });
        body.push({ f: lin('@tile.2', '@tile.1', -196, -164), d: roof(cx, -164, 62, 30, 16) }, ['@eave.0', rect(cx - 48, -200, 96, 6)]);
        let tl2 = ''; for (let x = -60; x <= 60; x += 9) tl2 += `M${cx + x} -166L${f1(cx + x * 0.78)} -194`;
        body.push({ s: '@tile.1', w: 1, op: 0.6, d: tl2, detail: true }, ['@gold.0', circ(cx, -204, 4)]);
      }
      // two hanging lanterns in the central opening
      for (const lx of [-34, 34]) {
        body.push({ s: '@dark', w: 0.8, d: `M${lx} -150v14` }, { f: '@lan', d: ell(lx, -124, 11, 12), glow: 'lamp' }, ['@gold.1', rect(lx - 5, -138, 10, 3)], ['@gold.1', rect(lx - 5, -113, 10, 3)], { s: '@gold.0', w: 1.4, d: `M${lx} -110v9` });
        lit.push({ f: { rad: [[0, '@lanL', 0.55], [1, '@lanL', 0]], cx: lx, cy: -124, r: 40 }, d: rect(lx - 40, -164, 80, 80) });
      }
      lit.push({ f: { lin: [[0, '#ffd8a0', 0], [1, '#ffd8a0', 0.3]], x1: 0, y1: -320, x2: 0, y2: 0 }, d: rect(-190, -320, 380, 320) });
      return { body, lit };
    },
  });

  /* ---------- landmark.mcr-etihad (a bowl with cable masts; neutral greys, no club marks) ---------- */
  define({
    id: 'landmark.mcr-etihad', category: 'landmark', size: [940, 330], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      clad: ['#d4d8dc', '#b0b6bc', '#8a9298', '#5e666c'], glass: ['#3a4854', '#56687a'], roof: ['#eef0f2', '#c8ccd0'], mast: ['#f4f6f8', '#b8bec4'], cable: '#9aa2aa',
      flood: '#f4f8ff', beacon: '#ff4030', warm: '#ffe0a8',
    } },
    night: { glow: { window: '#fff0d0', lamp: '#f8fbff' }, on: 0.5 },
    shadow: { rx: 460, ry: 10, h: 160 },
    tags: ['landmark', 'signature', 'place:uk/eastlands-stadium', 'uk', 'manchester', 'stadium', 'football', 'kit:urban'],
    credit: 'native: drawn for the second Manchester area batch (after the bowl stadium at Eastlands; neutral colours, no marks)',
    build() {
      const body = [], lit = [], W = 420, RY = -160;
      // the bowl: a long low drum, the roof edge sweeping up at the middle
      body.push({ f: lin('@clad.0', '@clad.2', RY, 0), d: `M${-W} 0V-90Q${-W + 30} ${RY + 20} -200 ${RY + 4}Q0 ${RY - 10} 200 ${RY + 4}Q${W - 30} ${RY + 20} ${W} -90V0z` });
      body.push({ f: lin('@roof.0', '@roof.1', RY - 24, RY + 10), d: `M${-W - 8} -88Q${-W + 26} ${RY + 6} -200 ${RY - 10}Q0 ${RY - 26} 200 ${RY - 10}Q${W - 26} ${RY + 6} ${W + 8} -88L${W} -82Q${W - 30} ${RY + 20} 200 ${RY + 4}Q0 ${RY - 10} -200 ${RY + 4}Q${-W + 30} ${RY + 20} ${-W} -82z` });
      // a band of glazing and vertical cladding fins
      body.push({ f: '@glass.0', d: `M${-W + 10} -40V-70Q0 -104 ${W - 10} -70V-40Q0 -72 ${-W + 10} -40z`, glow: 'window' });
      let fins = ''; for (let x = -W + 16; x < W - 10; x += 14) fins += `M${x} -6V${f1(-70 - 34 * (1 - (x / W) * (x / W)))}`;
      body.push({ s: '@clad.2', w: 1.2, op: 0.6, d: fins, detail: true });
      body.push(['@clad.3', rect(-W, -8, 2 * W, 8)]);
      // entrance glazing at the base
      for (let x = -300; x <= 260; x += 80) body.push({ f: '@glass.1', d: rect(x, -34, 40, 26), glow: 'window' });
      // the spiral ramp towers: drums with helical stripes
      for (const tx of [-W + 10, -150, 150, W - 10]) {
        body.push({ f: linX('@clad.0', '@clad.3', tx - 26, tx + 26), d: rect(tx - 26, -150, 52, 150) }, ['@clad.1', ell(tx, -150, 26, 6)]);
        let sp = ''; for (let k = 0; k < 7; k++) sp += `M${tx - 26} ${-6 - k * 21}L${tx + 26} ${-20 - k * 21}`;
        body.push({ s: '@clad.3', w: 2.4, op: 0.7, d: sp }, ['@clad.3', rect(tx + 12, -150, 14, 150), 0.35], ['@clad.2', rect(tx - 28, -158, 56, 8)]);
        for (let k = 0; k < 3; k++) body.push({ f: '@glass.0', d: rect(tx - 4, -132 + k * 40, 8, 14), glow: 'window' });
      }
      // entrance canopies and the floodlight units under the roof edge
      for (let x = -300; x <= 260; x += 80) body.push(['@clad.3', rect(x - 6, -40, 52, 5)]);
      for (let x = -340; x <= 340; x += 68) body.push({ f: '@mast.1', d: rect(x - 6, RY + 8 + Math.abs(x) * 0.12, 12, 4), glow: 'lamp' });
      // the masts and their cable stays down to the roof edge
      const masts = [-360, -250, -130, 0, 130, 250, 360];
      let cab = '';
      for (const mx of masts) {
        const roofY = mx === 0 ? RY - 18 : RY - 6 + Math.abs(mx) * 0.06, top = roofY - 130 + Math.abs(mx) * 0.08;
        body.push({ f: linX('@mast.0', '@mast.1', mx - 4, mx + 4), d: poly([[mx - 5, roofY + 40], [mx - 2, top], [mx + 2, top], [mx + 5, roofY + 40]]) }, ['@mast.1', poly([[mx, roofY + 40], [mx + 2, top], [mx + 5, roofY + 40]]), 0.6], ['@clad.2', rect(mx - 8, roofY + 36, 16, 5)]);
        cab += `M${mx} ${top + 4}L${mx - 70} ${roofY + 4}M${mx} ${top + 4}L${mx + 70} ${roofY + 4}M${mx} ${top + 20}L${mx - 40} ${roofY + 2}M${mx} ${top + 20}L${mx + 40} ${roofY + 2}`;
        lit.push(['@beacon', circ(mx, top - 2, 2.6)]);
      }
      body.push({ s: '@cable', w: 1, op: 0.85, d: cab });
      // night: the roof underside glows from the floodlights
      lit.push({ f: { lin: [[0, '@flood', 0.55], [1, '@flood', 0]], x1: 0, y1: RY - 30, x2: 0, y2: RY - 160 }, d: `M${-W} ${RY + 30}Q0 ${RY - 70} ${W} ${RY + 30}L${W - 60} ${RY - 160}H${-W + 60}z` });
      lit.push({ f: '@warm', d: `M${-W + 10} -40V-70Q0 -104 ${W - 10} -70V-40Q0 -72 ${-W + 10} -40z`, op: 0.4 });
      return { body, lit };
    },
  });

  /* ---------- landmark.mcr-old-trafford (a tall stand with roof trusses; neutral, no club marks) ---------- */
  define({
    id: 'landmark.mcr-old-trafford', category: 'landmark', size: [900, 320], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      brick: ['#9a5a46', '#7e4636', '#5e3428'], clad: ['#d0d4d8', '#a4aab0', '#6e767c'], glass: ['#2e3a46', '#4a5e70'], truss: ['#c8ccd0', '#8e969c'],
      roof: ['#e4e6e8', '#b4b8bc'], flood: '#f4f8ff', warm: '#ffdca0', beacon: '#ff4030',
    } },
    night: { glow: { window: '#fff0d0', lamp: '#f8fbff' }, on: 0.5 },
    shadow: { rx: 440, ry: 10, h: 180 },
    tags: ['landmark', 'signature', 'place:uk/old-trafford', 'uk', 'manchester', 'stadium', 'football', 'kit:urban'],
    credit: 'native: drawn for the second Manchester area batch (after the tall cantilever stands at Old Trafford; neutral colours, no marks)',
    build(v, r) {
      const body = [], lit = [], W = 430, RY = -230;
      // the stand: brick base, a tall glazed and clad face, the roof edge above
      body.push({ f: lin('@clad.0', '@clad.1', RY, -60), d: rect(-W, RY, 2 * W, -RY - 60) });
      body.push({ f: lin('@brick.0', '@brick.1', -60, 0), d: rect(-W, -60, 2 * W, 60) });
      body.push({ s: '@brick.2', w: 0.6, op: 0.3, d: Array.from({ length: 7 }, (_, k) => `M${-W} ${-6 - k * 8}H${W}`).join(''), detail: true });
      for (let x = -W + 30; x < W - 40; x += 70) body.push(['@brick.2', archW(x, -52, 30, 52)], { f: '@glass.1', d: archW(x + 4, -46, 22, 40), glow: 'window' });
      // the glazed stair cores and window bands
      const cells = [];
      for (let f = 0; f < 4; f++) for (let x = -W + 14; x < W - 20; x += 36) cells.push([x, RY + 22 + f * 36, 24, 18]);
      winGroups(r, cells, 6).forEach(d => body.push({ f: '@glass.0', d, glow: 'window' }));
      for (const cx of [-W + 10, -120, 120, W - 70]) body.push(['@clad.2', rect(cx - 4, RY + 4, 68, 6)], ['@brick.2', rect(cx + 20, -60, 20, 54)],{ f: linX('@glass.1', '@glass.0', cx, cx + 60), d: rect(cx, RY + 10, 60, -RY - 70), glow: 'window' }, { s: '@clad.2', w: 1, d: `M${cx + 20} ${RY + 10}V-60M${cx + 40} ${RY + 10}V-60` + Array.from({ length: 6 }, (_, k) => `M${cx} ${RY + 34 + k * 26}h60`).join(''), detail: true });
      // the roof and the exposed cantilever trusses with their raking struts
      body.push({ f: lin('@roof.0', '@roof.1', RY - 14, RY), d: rect(-W - 14, RY - 14, 2 * W + 28, 14) });
      let tr = '';
      for (let x = -W; x <= W; x += 86) tr += `M${x} ${RY - 14}L${x + 10} ${RY - 76}L${x + 20} ${RY - 14}M${x + 10} ${RY - 76}L${x + 96} ${RY - 76}M${x + 10} ${RY - 76}L${x + 53} ${RY - 14}L${x + 96} ${RY - 76}`;
      body.push({ s: '@truss.0', w: 2.4, d: tr }, { s: '@truss.1', w: 1, op: 0.7, d: `M${-W} ${RY - 44}H${W + 96}`, detail: true });
      for (const px of [-W + 4, W - 8]) body.push({ f: linX('@truss.0', '@truss.1', px - 6, px + 6), d: rect(px - 6, RY - 90, 12, -RY + 90 - 60) });
      // floodlight gantry lamps along the roof edge
      for (let x = -W + 40; x < W; x += 60) { body.push({ f: '@roof.1', d: rect(x - 5, RY - 4, 10, 4), glow: 'lamp' }); lit.push(['@beacon', circ(x, RY - 80, 1.8)]); }
      lit.push({ f: { lin: [[0, '@flood', 0.5], [1, '@flood', 0]], x1: 0, y1: RY, x2: 0, y2: RY - 170 }, d: rect(-W, RY - 170, 2 * W, 170) });
      lit.push({ f: '@warm', d: rect(-W, -60, 2 * W, 60), op: 0.22 });
      return { body, lit };
    },
  });

  /* ---------- landmark.mcr-sim-station (the 1830 station house and warehouse) ---------- */
  define({
    id: 'landmark.mcr-sim-station', category: 'landmark', size: [620, 230], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      brick: ['#a8604a', '#8e4c3a', '#6a3a2c', '#4e2a20'], stone: ['#ddd2bc', '#c0b498', '#9a8e74'], roof: ['#5c6266', '#42484c'],
      glass: ['#2a3440', '#40505e'], door: ['#3c4a3e', '#2a342c'], warm: '#ffd690',
    } },
    night: { glow: { window: '#ffdc98' }, on: 0.6 },
    shadow: { rx: 300, ry: 9, h: 150 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/science-industry-museum', 'uk', 'manchester', 'railway', 'museum', 'heritage', 'kit:urban'],
    credit: 'native: drawn for the second Manchester area batch (after the 1830 station and warehouse on Liverpool Road)',
    build(v, r) {
      const body = [], lit = [];
      // the warehouse behind and to the right: long, tall, many small windows, the taking-in doors
      const W0 = 0, W1 = 304, WH = 196;
      body.push({ f: lin('@roof.0', '@roof.1', -WH - 18, -WH), d: poly([[W0 - 4, -WH], [W0 + 20, -WH - 18], [W1 - 20, -WH - 18], [W1 + 4, -WH]]) });
      body.push({ f: lin('@brick.1', '@brick.2', -WH, 0), d: rect(W0, -WH, W1 - W0, WH) }, ['@brick.3', rect(W1 - 8, -WH, 8, WH), 0.5]);
      body.push({ s: '@brick.3', w: 0.6, op: 0.25, d: Array.from({ length: 24 }, (_, k) => `M${W0} ${-4 - k * 8}H${W1}`).join(''), detail: true });
      const cells = []; for (let f = 0; f < 5; f++) for (let x = W0 + 14; x < W1 - 14; x += 26) if (Math.abs(x - 150) > 16) cells.push([x, -WH + 16 + f * 36, 12, 18]);
      winGroups(r, cells, 6).forEach(d => body.push({ f: '@glass.0', d, glow: 'window' }));
      let arches = ''; for (const c of cells) arches += `M${c[0] - 1} ${c[1]}q${f1(c[2] / 2 + 1)} -6 ${c[2] + 2} 0`;
      body.push({ s: '@stone.1', w: 1.2, op: 0.8, d: arches, detail: true });
      for (let f = 0; f < 5; f++) body.push(['@door.0', rect(142, -WH + 12 + f * 36, 18, 26)], ['@stone.1', rect(140, -WH + 38 + f * 36, 22, 3)]);
      body.push(['@stone.2', rect(150, -WH - 30, 3, 30)], ['@stone.2', rect(150, -WH - 30, 22, 3)]);
      // the station house: a stuccoed ground floor with round-headed doors, brick above, sash windows
      const S0 = -300, S1 = 0, SH = 120;
      body.push({ f: lin('@roof.0', '@roof.1', -SH - 14, -SH), d: poly([[S0 - 4, -SH], [S0 + 14, -SH - 14], [S1 - 10, -SH - 14], [S1 + 4, -SH]]) });
      body.push({ f: lin('@brick.0', '@brick.1', -SH, -50), d: rect(S0, -SH, S1 - S0, SH - 50) }, { f: lin('@stone.0', '@stone.1', -50, 0), d: rect(S0, -50, S1 - S0, 50) });
      body.push({ s: '@stone.2', w: 0.8, op: 0.5, d: Array.from({ length: 5 }, (_, k) => `M${S0} ${-8 - k * 10}H${S1}`).join(''), detail: true });
      body.push(['@stone.1', rect(S0 - 3, -SH - 4, S1 - S0 + 6, 6)], ['@stone.1', rect(S0, -54, S1 - S0, 5)]);
      for (let x = 46; x < W1; x += 52) body.push(['@brick.0', rect(x, -WH, 6, WH), 0.5]);
      for (let x = S0 + 18; x < S1 - 20; x += 40) {
        body.push(['@stone.1', rect(x + 6, -SH + 10, 6, 5)], ['@stone.0', `M${x - 4} -46h30v3h-30z`], ['@stone.2', rect(x + 6, -46, 8, 4)],{ f: '@glass.0', d: rect(x, -SH + 14, 18, 42), glow: 'window' }, { s: '@stone.0', w: 1, d: `M${x} ${-SH + 35}h18M${x + 9} ${-SH + 14}v42`, detail: true }, ['@stone.0', rect(x - 2, -SH + 56, 22, 3)]);
        body.push({ f: (x / 40) % 2 ? '@door.0' : '@glass.1', d: archW(x - 2, -44, 22, 44), glow: 'window' });
      }
      for (const cx of [S0 + 6, S1 - 14]) for (let k = 0; k < 2; k++) body.push(['@roof.1', rect(cx, -SH - 30 - k * 0, 8, 18)]);
      body.push(['@brick.3', rect(S0, -4, W1 - S0, 4)]);
      lit.push({ f: '@warm', d: rect(S0, -50, S1 - S0, 50), op: 0.22 }, { f: { lin: [[0, '#ffe6c0', 0], [1, '#ffe6c0', 0.25]], x1: 0, y1: -WH, x2: 0, y2: 0 }, d: rect(W0, -WH, W1 - W0, WH) });
      return { body, lit };
    },
  });

  /* ---------- landmark.heaton-hall ---------- */
  define({
    id: 'landmark.heaton-hall', category: 'landmark', size: [780, 250], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#ece2ca', '#d4c6a6', '#ae9e7e', '#86775c'], roof: ['#7a8084', '#5a6064'], glass: ['#34404c', '#4c5c6c'], warm: '#ffd690',
    } },
    night: { glow: { window: '#ffdc98' }, on: 0.5 },
    shadow: { rx: 380, ry: 9, h: 120 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/heaton-park', 'uk', 'manchester', 'hall', 'neoclassical', 'park', 'kit:urban'],
    credit: 'native: drawn for the second Manchester area batch (after the Wyatt hall in Heaton Park)',
    build() {
      const body = [], lit = [];
      const sash = (x, y, w, h) => { body.push({ f: '@glass.0', d: rect(x, y, w, h), glow: 'window' }, { s: '@stone.0', w: 0.9, d: `M${x} ${f1(y + h / 2)}h${w}M${f1(x + w / 2)} ${y}v${h}`, detail: true }, ['@stone.2', rect(x - 2, y + h, w + 4, 3)]); };
      // the end pavilions with Venetian windows and pediments
      for (const s of [-1, 1]) {
        const x0 = s > 0 ? 262 : -372, x1 = x0 + 110;
        body.push({ f: lin('@stone.0', '@stone.1', -120, 0), d: rect(x0, -120, 110, 120) }, ['@stone.2', rect(x0 - 3, -124, 116, 6)]);
        body.push({ f: '@stone.1', d: poly([[x0 - 4, -124], [x0 + 55, -156], [x1 + 4, -124]]) }, { s: '@stone.2', w: 1.4, d: `M${x0 + 12} -128L${x0 + 55} -150L${x1 - 12} -128H${x0 + 12}`, detail: true });
        body.push({ f: '@glass.0', d: archW(x0 + 44, -96, 22, 50), glow: 'window' }, { f: '@glass.0', d: rect(x0 + 26, -82, 14, 36), glow: 'window' }, { f: '@glass.0', d: rect(x0 + 70, -82, 14, 36), glow: 'window' });
        body.push({ s: '@stone.2', w: 1.4, d: `M${x0 + 22} -44H${x0 + 88}M${x0 + 42} -84v40M${x0 + 68} -84v40`, detail: true }, ['@stone.3', rect(x0, -8, 110, 8)]);
        // the colonnade link
        const c0 = s > 0 ? 120 : -262, c1 = c0 + 142;
        body.push({ f: lin('@stone.2', '@stone.3', -74, 0), d: rect(c0, -70, 142, 70) }, ['@stone.1', rect(c0 - 2, -82, 146, 14)], ['@roof.0', rect(c0, -88, 142, 6)]);
        for (let x = c0 + 8; x < c1 - 4; x += 16) body.push(['@stone.0', rect(x, -68, 7, 64)], ['@stone.1', rect(x - 1.5, -70, 10, 4)]);
      }
      // the main block: two storeys and an attic, the domed bow at the centre
      body.push({ f: lin('@roof.0', '@roof.1', -170, -156), d: poly([[-124, -156], [-110, -170], [110, -170], [124, -156]]) });
      body.push({ f: lin('@stone.0', '@stone.1', -156, 0), d: rect(-120, -156, 240, 156) }, ['@stone.2', rect(-124, -160, 248, 6)], ['@stone.2', rect(-120, -80, 240, 4)]);
      for (const x of [-108, -84, 70, 94]) { sash(x, -140, 14, 30); sash(x, -66, 14, 40); }
      // the bow: a half drum with giant pilasters, three tall windows, a shallow dome
      body.push({ f: linX('@stone.0', '@stone.2', -58, 58), d: rect(-58, -170, 116, 170) });
      for (const x of [-56, -20, 16, 50]) body.push(['@stone.1', rect(x, -166, 6, 162)], ['@stone.0', rect(x - 1, -170, 8, 5)]);
      for (const x of [-42, -6, 30]) { body.push({ f: '@glass.0', d: archW(x, -150, 12, 40), glow: 'window' }); sash(x, -70, 12, 46); }
      body.push(['@stone.2', rect(-62, -178, 124, 8)], { f: linX('@roof.0', '@roof.1', -50, 50), d: `M-50 -178Q-48 -216 0 -220Q48 -216 50 -178z` }, ['@stone.1', rect(-6, -232, 12, 12)]);
      body.push({ s: '@stone.3', w: 1, op: 0.5, d: 'M-50 -190Q0 -206 50 -190', detail: true });
      body.push(['@stone.3', rect(-372, -8, 744, 8)]);
      lit.push({ f: { lin: [[0, '#fff0d0', 0], [1, '#fff0d0', 0.32]], x1: 0, y1: -230, x2: 0, y2: 0 }, d: rect(-130, -230, 260, 230) });
      return { body, lit };
    },
  });

  /* ---------- landmark.mcr-chips (three stacked, offset blocks with plain colour bands) ---------- */
  define({
    id: 'landmark.mcr-chips', category: 'landmark', size: [640, 260], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      clad: ['#e8eaea', '#c8ccce', '#9aa0a4'], glass: ['#30404c', '#4a5c6a'], band: ['#d8483a', '#3a8a5a', '#3a6ab0', '#e8b030'], base: '#5a6064', warm: '#ffd690',
    } },
    night: { glow: { window: '#ffe2a8' }, on: 0.6 },
    shadow: { rx: 300, ry: 8, h: 120 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/new-islington', 'uk', 'manchester', 'flats', 'modern', 'marina', 'kit:urban'],
    credit: 'native: drawn for the second Manchester area batch (after the stacked flats by New Islington marina; the bands carry no letters)',
    build(v, r) {
      const body = [], lit = [];
      const chip = (x0, x1, y0, h, k) => {
        const rr = h / 2;
        body.push({ f: lin('@clad.0', '@clad.1', y0, y0 + h), d: `M${x0 + rr} ${y0}H${x1 - rr}A${rr} ${rr} 0 0 1 ${x1 - rr} ${y0 + h}H${x0 + rr}A${rr} ${rr} 0 0 1 ${x0 + rr} ${y0}z` });
        let ribs = ''; for (let x = x0 + rr; x < x1 - rr; x += 10) ribs += `M${x} ${y0 + 2}v${h - 4}`;
        body.push({ s: '@clad.2', w: 0.8, op: 0.45, d: ribs, detail: true });
        const cells = []; for (let f = 0; f < 2; f++) for (let x = x0 + rr; x < x1 - rr - 20; x += 22) cells.push([x, y0 + 8 + f * (h / 2), 14, h / 2 - 22]);
        winGroups(r, cells, 5).forEach(d => body.push({ f: '@glass.0', d, glow: 'window' }));
        body.push(['@band.' + k, rect(x0 + rr + 30, y0 + h - 12, (x1 - x0 - 2 * rr) * 0.55, 6)], ['@band.' + ((k + 2) % 4), rect(x0 + rr + 50 + (x1 - x0 - 2 * rr) * 0.55, y0 + h - 12, (x1 - x0 - 2 * rr) * 0.25, 6)]);
        body.push({ s: '@clad.2', w: 1.4, d: `M${x0 + rr} ${y0 + h}H${x1 - rr}`, op: 0.8 });
        // shaded round ends, the floor slab, balcony rails and roof plant
        body.push(['@clad.2', `M${x1 - rr} ${y0}A${rr} ${rr} 0 0 1 ${x1 - rr} ${y0 + h}z`, 0.45], ['@clad.1', `M${x0 + rr} ${y0}A${rr} ${rr} 0 0 0 ${x0 + rr} ${y0 + h}z`, 0.35]);
        body.push(['@clad.2', rect(x0 + rr, y0 + h / 2 - 2, x1 - x0 - 2 * rr, 3), 0.7]);
        for (let k = 0; k < 4; k++) body.push({ s: '@clad.2', w: 1, d: `M${x0 + rr + 20 + k * (x1 - x0 - 2 * rr) / 4} ${y0 + h / 2 - 8}h${f1((x1 - x0 - 2 * rr) / 4 - 30)}`, op: 0.8, detail: true });
        for (let k = 0; k < 2; k++) body.push(['@clad.2', rect(x0 + rr + 60 + k * 160, y0 - 8, 30, 8)]);
      };
      // the stilts and ground floor
      body.push(['@base', rect(-250, -40, 480, 40)]);
      for (let x = -240; x < 230; x += 40) body.push({ f: '@glass.1', d: rect(x, -34, 26, 28), glow: 'window' }, ['@clad.2', rect(x + 30, -40, 6, 40)]);
      chip(-300, 210, -116, 76, 0);
      chip(-240, 310, -188, 72, 1);
      chip(-290, 230, -256, 70, 2);
      lit.push({ f: '@warm', d: rect(-250, -40, 480, 40), op: 0.25 });
      return { body, lit };
    },
  });

  /* ---------- landmark.mcr-piccadilly-pavilion (the concrete wall, its roof slab, a fountain) ---------- */
  define({
    id: 'landmark.mcr-piccadilly-pavilion', category: 'landmark', size: [600, 150], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'jets', 'lit'],
    palette: { base: {
      conc: ['#d8d6d0', '#bcbab4', '#9a9892', '#76746e'], glass: ['#3a4a56', '#5a6e7c'], water: ['#9cc4d4', '#6a9cb0'], spray: '#eef6fa', warm: '#ffe0a8', lamp: '#fff4d8',
    } },
    night: { glow: { window: '#ffe8b8', lamp: '#f0f8ff' }, on: 0.7 },
    anim: { bob: { part: 'jets', dy: 1.4, period: 1.7 } },
    shadow: { rx: 290, ry: 8, h: 80 },
    tags: ['landmark', 'signature', 'place:uk/piccadilly-gardens', 'uk', 'manchester', 'gardens', 'fountain', 'modern', 'kit:urban'],
    credit: 'native: drawn for the second Manchester area batch (after the pavilion wall in Piccadilly Gardens)',
    build() {
      const body = [], jets = [], lit = [];
      // the long smooth wall with its tie-hole grid and openings
      body.push({ f: lin('@conc.0', '@conc.2', -96, 0), d: rect(-290, -96, 470, 96) }, ['@conc.3', rect(-290, -6, 470, 6)]);
      let holes = ''; for (let y = -84; y < -6; y += 18) for (let x = -280; x < 176; x += 30) holes += circ(x, y, 0.9);
      body.push({ f: '@conc.2', d: holes, detail: true }, { s: '@conc.2', w: 0.8, op: 0.6, d: Array.from({ length: 15 }, (_, k) => `M${-290 + k * 30 + 15} -96v90`).join('') + 'M-290 -60H180M-290 -24H180', detail: true });
      for (let k = 0; k < 15; k++) if (k % 2) body.push(['@conc.1', rect(-290 + k * 30, -96, 30, 90), 0.35]);
      for (const x of [-210, -60, 80]) body.push({ f: '@glass.0', d: rect(x, -66, 48, 60), glow: 'window' }, ['@conc.3', rect(x - 3, -69, 54, 3)], ['@conc.1', rect(x - 3, -6, 54, 3)]);
      for (let k = 0; k < 6; k++) body.push(['@conc.3', rect(70 + k * 40, -98, 18, 2), 0.7]);
      // low granite benches along the foot of the wall
      for (let k = 0; k < 6; k++) body.push(['@conc.1', rect(-270 + k * 74, -16, 40, 8)], ['@conc.3', rect(-266 + k * 74, -8, 32, 6), 0.7]);
      // the pavilion: a glass box under a thin roof slab, cantilevered past the wall
      body.push({ f: '@glass.1', d: rect(180, -88, 110, 82), glow: 'window' }, { s: '@conc.3', w: 1.2, d: 'M206 -88v82M234 -88v82M262 -88v82', detail: true });
      body.push({ f: lin('@conc.0', '@conc.1', -112, -96), d: rect(60, -112, 250, 14) }, ['@conc.3', rect(60, -100, 250, 2), 0.6], ['@conc.2', rect(296, -98, 6, 92)]);
      // the fountain floor in front: a shallow wet pad with jets
      body.push({ f: '@water.1', d: ell(-120, -2, 150, 7), op: 0.8 }, { f: '@water.0', d: ell(-120, -3, 130, 5), op: 0.8 });
      for (let k = 0; k < 9; k++) {
        const x = -230 + k * 27, h = 22 + (k % 3) * 12 + (k === 4 ? 14 : 0);
        jets.push({ f: '@spray', d: `M${x - 2} -2Q${x - 1} ${-h} ${x} ${-h - 4}Q${x + 1} ${-h} ${x + 2} -2z`, op: 0.85 }, { f: '@spray', d: circ(x, -h - 3, 2.6), op: 0.7 }, { f: '@spray', d: ell(x, -2, 6, 1.6), op: 0.6, detail: true });
      }
      lit.push({ f: '@lamp', d: rect(60, -100, 250, 3), op: 0.8 }, { f: '@warm', d: rect(180, -88, 110, 82), op: 0.35 });
      for (let k = 0; k < 9; k++) lit.push({ f: { rad: [[0, '#d8f0ff', 0.5], [1, '#d8f0ff', 0]], cx: -230 + k * 27, cy: -10, r: 18 }, d: rect(-248 + k * 27, -28, 36, 36) });
      return { body, jets, lit };
    },
  });

  /* ---------- street.mcr-bunting (rainbow pennants, no text) ---------- */
  define({
    id: 'street.mcr-bunting', category: 'street', size: [340, 140], variants: 2, seasonal: false, flippable: true,
    parts: ['poles', 'flags', 'lit'],
    palette: { base: {
      pole: ['#3a3e42', '#5a5e62'], cord: '#2a2a2e', flag: ['#e03a3a', '#f08a2a', '#f0d030', '#3aa04a', '#2a6ac8', '#7a3aa8'], bulb: '#ffe8b0',
    } },
    night: { glow: { lamp: '#ffe2a0' }, on: 1 },
    anim: { bob: { part: 'flags', dy: 0.8, period: 2.6 } },
    shadow: { rx: 160, ry: 4, h: 120 },
    tags: ['uk', 'manchester', 'street', 'bunting', 'festival', 'kit:urban', 'role:street'],
    credit: 'native: drawn for the second Manchester area batch (rainbow pennants on a festival street)',
    build(v) {
      const poles = [], flags = [], lit = [], X = 164, Y = -128, sag = v ? -74 : -86;
      for (const s of [-1, 1]) poles.push(['@pole.0', rect(s * X - 2.5, -134, 5, 134)], ['@pole.1', rect(s * X - 4, -136, 8, 3)]);
      poles.push({ s: '@cord', w: 1, d: `M${-X} ${Y}Q0 ${sag} ${X} ${Y}` });
      const n = 18;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = -X + 2 * X * t, y = (1 - t) * (1 - t) * Y + 2 * (1 - t) * t * sag + t * t * Y + 1;
        flags.push(['@flag.' + (i % 6), poly([[x - 7, y], [x + 7, y], [x, y + 16]])]);
        if (i % 3 === 1) { flags.push({ f: '@bulb', d: circ(x + 9, y + 2, 1.8), glow: 'lamp' }); lit.push({ f: { rad: [[0, '@bulb', 0.6], [1, '@bulb', 0]], cx: x + 9, cy: y + 2, r: 10 }, d: rect(x - 1, y - 8, 20, 20) }); }
      }
      return { poles, flags, lit };
    },
  });
})();

/* ============================================================
   ARCHETYPE mcr2-city: the second batch of Manchester views. It builds on the 'mcr-city' archetype
   (70-scene-lib-area-manchester.js: the street, square, canal or quay with its landmarks, traffic,
   tram, people, cover and the framing trees) and adds what this batch needs. PURE.
   Extra params: water also 'lake' (a park lake with rowing boats and wildfowl) and 'marina' (a
   canal basin with moored narrowboats); crowd (walkers | students | shoppers | fans | night | park)
   picks the passers-by; features also: rain (wet paving, puddles), lanterns (strings of lanterns),
   bunting (rainbow pennants), tram2 (a second, newer tram the other way), steam (a heritage engine
   and carriage shunting on a short track), busker, cafe (a cafe table), bench (a bench reader),
   fountain-mist.
   ============================================================ */
function sceneArchMcr2City(p, u) {
  const R = Math.round, feats = p.features || [], has = f => feats.includes(f);
  const lake = p.water === 'lake', marina = p.water === 'marina';
  const water = lake || marina ? 'canal' : (p.water || 'none');
  const data = sceneArchMcrCity(Object.assign({}, p, { water }), u);
  const H = Number.isFinite(p.horizon) ? p.horizon : 500, wet = water !== 'none';
  const yL = wet ? H + 120 : H + 150, yW0 = yL + 6, yW1 = wet ? yL + 96 : yL, yR = wet ? yW1 + 40 : yL + 70, yF = Math.max(yR + 70, 800);
  const pS = (id, y) => scenePersonScale(sceneObj(id).size[1], y, data.view);
  // the passers-by, by crowd
  const crowds = {
    students: ['person.student', 'person.takeaway-walker', 'person.student', 'person.skateboarder', 'person.couple', 'person.phone-idler'],
    shoppers: ['person.shopper', 'person.couple', 'person.shopper', 'person.buggy-walker', 'person.elderly-couple', 'person.family'],
    fans: ['person.football-fan', 'person.walker', 'person.football-fan', 'person.family', 'person.football-fan', 'person.couple'],
    night: ['person.couple', 'person.walker', 'person.takeaway-walker', 'person.couple', 'person.phone-idler', 'person.walker'],
    park: ['person.dog-walker', 'person.jogger', 'person.family', 'person.child-scooter', 'person.elderly-walker', 'person.buggy-walker'],
  };
  const mix = crowds[p.crowd];
  if (mix) {
    let i = 0;
    for (const a of data.actors) {
      if (!/^person\./.test(a.obj) || a.obj === 'person.cyclist' || a.layer !== 'near') continue;
      const id = mix[i++ % mix.length]; if (!sceneObj(id)) continue;
      a.obj = id; a.s = pS(id, a.path[0][1]);
      if (/idler|skateboarder|child-scooter/.test(id)) { a.speed = Math.min(a.speed, 9); }
    }
  }
  // wet days: darker paving and road, puddles that hold the sky
  if (has('rain')) {
    const wetP = { pave: ['#8e8a84', '#76726c', '#5e5a56'], road: ['#3e4246', '#50545a'], kerb: ['#a8a29a', '#86827a'] };
    for (const s of ['base', 'spring', 'summer', 'autumn']) data.palette[s] = Object.assign({}, data.palette[s] || {}, wetP);
    data.scatter.push({ obj: 'ground.puddle', layer: 'near', seed: 71, area: { rect: [-100, yR + 34, 1700, yR + 66] }, n: 7, minGap: 200, s: [0.5, 0.9], flip: 0.5, variant: 'random', anim: false });
    data.scatter.push({ obj: 'ground.puddle', layer: 'fore', seed: 72, area: { rect: [-100, yF + 4, 1700, yF + 30] }, n: 4, minGap: 320, s: [0.8, 1.2], flip: 0.5, variant: 'random', anim: false });
  }
  // a park lake: rowing boats and wildfowl instead of narrowboats
  if (lake) {
    data.actors = data.actors.filter(a => !/^boat\.narrowboat/.test(a.obj));
    data.actors.push({ obj: 'person.rower', layer: 'mid', path: [[260, R(yW0 + 30)], [900, R(yW0 + 34)]], speed: 6, loop: 'pingpong', s: pS('person.rower', yW0 + 30), seed: 73, offset: 0.3 });
    data.actors.push({ obj: 'bird.swan', layer: 'mid', path: [[1000, R(yW0 + 60)], [1400, R(yW0 + 58)]], speed: 3, loop: 'pingpong', s: 0.5, seed: 74, offset: 0.6 });
    data.actors.push({ obj: 'bird.goose', layer: 'mid', path: [[120, R(yW1 - 30)], [420, R(yW1 - 28)]], speed: 3, loop: 'pingpong', s: 0.46, seed: 75, offset: 0.1 });
    data.scatter.push({ obj: 'plant.reed', layer: 'mid', seed: 76, area: { rect: [-140, yW1 - 6, 1740, yW1] }, n: 16, minGap: 50, s: [0.4, 0.7], flip: 0.5, variant: [0, 1], mask: { noise: { scale: 160, cut: 0.35 } }, anim: false, reflect: true });
  }
  // a marina: moored narrowboats along the far wall
  if (marina) {
    [[180, 0.5, false], [620, 0.46, true], [1160, 0.5, false], [1480, 0.44, true]].forEach(([x, s, f], i) => data.place.push({ obj: 'boat.narrowboat', x, y: R(yW0 + 18), s, layer: 'mid', seed: 77 + i, flip: f, variant: i % 3, reflect: true }));
  }
  // strings of lanterns or bunting across the street
  if (has('lanterns')) [[260, 0], [800, 2], [1340, 0]].forEach(([x, v], i) => data.place.push({ obj: 'street.lantern-string', x, y: R(yR + 36), s: 0.95, layer: 'near', seed: 80 + i, variant: v, flip: i === 1 }));
  if (has('bunting')) [[300, 0], [860, 1], [1400, 0]].forEach(([x, v], i) => data.place.push({ obj: 'street.mcr-bunting', x, y: R(yR + 36), s: 0.95, layer: 'near', seed: 84 + i, variant: v, flip: i === 1 }));
  // a second tram the other way
  if (has('tram2')) {
    const y = yR - 18, s = Math.round((0.32 + (y - H) / (900 - H) * 0.32) * 0.66 * 100) / 100;
    data.actors.push({ obj: 'vehicle.metrolink-m5000', layer: 'near', path: [[2100, y], [-500, y]], speed: 30, loop: 'loop', s, seed: 88, offset: 0.8, flip: true });
  }
  // a heritage engine and carriage on a short demonstration track
  if (has('steam')) {
    const y = R(yR - 14);
    data.ground.push({ layer: 'near', d: `M-160 ${y - 2}H1760V${y + 4}H-160Z`, fill: '#5a524a' }, { layer: 'near', d: `M-160 ${y - 1}H1760V${y}H-160Z`, fill: '#9a9aa0' });
    data.actors.push({ obj: 'rail.heritage-steam-loco', layer: 'near', path: [[300, y], [1200, y]], speed: 10, loop: 'pingpong', s: 0.62, seed: 90, offset: 0.3 });
    data.actors.push({ obj: 'rail.heritage-coach', layer: 'near', path: [[146, y], [1046, y]], speed: 10, loop: 'pingpong', s: 0.62, seed: 91, offset: 0.3 });
  }
  if (has('busker')) data.place.push({ obj: 'person.busker', x: 1180, y: R(yR + 44), s: pS('person.busker', yR + 44), layer: 'near', seed: 92 });
  if (has('cafe')) data.place.push({ obj: 'person.cafe-goer', x: 420, y: R(yR + 46), s: pS('person.cafe-goer', yR + 46), layer: 'near', seed: 93, flip: true });
  if (has('bench')) data.place.push({ obj: 'person.bench-reader', x: 1300, y: R(yR + 46), s: pS('person.bench-reader', yR + 46), layer: 'near', seed: 94 });
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function' || typeof sceneArchMcrCity !== 'function') return;
  sceneArchetypeDefine('mcr2-city', {
    params: { id: 'id', lat: 'number', lon: 'number', heading: 'number', at: typeof SCENE_AT_MOMENTS !== 'undefined' ? SCENE_AT_MOMENTS : 'id', horizon: 'number', landmarks: 'list',
      ground: ['street', 'square', 'towpath', 'quay', 'park'], water: ['none', 'canal', 'quays', 'lake', 'marina'], tram: ['none', 'street', 'viaduct'], far: ['mixed', 'brick', 'glass'],
      crowd: ['walkers', 'students', 'shoppers', 'fans', 'night', 'park'], features: 'list', palette: 'object' },
    kits: ['urban', 'temperate', 'people', 'birds', 'boats'],
    slots: [{ id: 'landmark', layer: 'mid', x: 800, y: 650, s: 1 }],
    meta: () => null,
    build: (p, u) => sceneArchMcr2City(p, u),
  });
})();

/* ============================================================
   SCENE LIBRARY, AREA manchester (docs/dev/SCENE_ENGINE.md 2.2, 8.1): the Manchester and Salford
   objects and the 'mcr-city' archetype the composed Manchester scenes are built from
   (71-scene-uk-manchester-*.js, registered by 72-anim-pack-uk-area-manchester.js).
   Drawn after the public form of each building, simplified, no text, no emblems, no club colours:
   - landmark.manchester-town-hall   Waterhouse's Gothic town hall on Albert Square: the long gabled
                                     front, end pavilions and the clock tower with its spire
   - landmark.beetham-tower          the slim glass tower on Deansgate, its cantilevered upper floors
                                     and the glass blade on the roof
   - landmark.castlefield-viaduct    the steel lattice viaduct on castellated piers, now a sky garden
   - landmark.john-rylands           the red sandstone Gothic library front on Deansgate
   - landmark.whitworth-hall         the university's Gothic hall: the great gable window and its tower
   - landmark.whitworth-gallery      the red-brick gallery front and its glass wing into the park
   - landmark.salford-lowry          the steel-clad arts centre on the Quays with its drum
   - landmark.mcr-central-library    the Portland stone rotunda and portico on St Peter's Square
   - landmark.mcr-stadium            a large football stand with a cantilever roof (generic, no club)
   - structure.mediacity-footbridge  the white cable-stayed footbridge with its leaning mast
   - building.mcr-mill               red-brick cotton mills and Northern Quarter warehouses
   - vehicle.metrolink-tram          a silver and yellow two-section tram (no operator marks)
   PURE: definitions only; build() runs lazily. All names here are local to the IIFE except the
   archetype function sceneArchMcrCity.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const { f1, rect, ell, circ, poly, define, winGroups } = sceneDraw;
  const lin = (a, b, y1, y2, x1, x2) => ({ lin: [[0, a], [1, b]], x1: x1 || 0, y1, x2: x2 || 0, y2 });
  const lancet = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w * 0.55)}L${f1(x + w / 2)} ${f1(y - w * 0.25)}L${f1(x + w)} ${f1(y + w * 0.55)}V${f1(y + h)}z`;
  const archW = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w / 2)}a${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(w)} 0V${f1(y + h)}z`;
  const hood = (x, y, w, paint) => ({ s: paint, w: 1.6, d: `M${f1(x - 2)} ${f1(y + w * 0.6)}L${f1(x + w / 2)} ${f1(y - w * 0.3 - 3)}L${f1(x + w + 2)} ${f1(y + w * 0.6)}`, detail: true });
  const foil = (x, y, k, paint) => ({ f: paint, d: circ(x - k, y, k) + circ(x + k, y, k) + circ(x, y - k, k) + circ(x, y + k, k), detail: true });
  const spike = (x, y, w, h) => poly([[x - w / 2, y], [x, y - h], [x + w / 2, y]]);
  const LEAF = sceneDraw.seasons({
    leaf: { spring: ['#5f9a3e', '#8cc05a', '#3e7230'], summer: ['#3f7a34', '#62a044', '#2c5a28'], autumn: ['#b8742a', '#d8a040', '#8a5a26'], winter: ['#6a6a58', '#8a8a74', '#4e5046'] },
    bloom: { spring: '#f4d8e4', summer: '#e86a8a', autumn: '#e0a040', winter: '#c8c8c0' },
  });

  /* ---------- landmark.manchester-town-hall ---------- */
  define({
    id: 'landmark.manchester-town-hall', category: 'landmark', size: [610, 650], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#d2bd96', '#bba47c', '#9a8360', '#73603f'], roof: ['#69706f', '#4f5658', '#3a4044'],
      glass: ['#3c4854', '#28323c'], clock: ['#f1e9d2', '#2a2a30', '#b89a5a'], flood: '#ffe6b4', warm: '#ffd38a', beacon: '#ff5040',
    } },
    night: { glow: { window: '#ffdc98', lamp: '#fff2d0' }, on: 0.65 },
    shadow: { rx: 300, ry: 10, h: 200 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/town-hall', 'uk', 'manchester', 'civic', 'gothic', 'clock', 'tower', 'kit:urban'],
    credit: 'native: drawn for the Manchester area scenes (after Waterhouse\'s Albert Square front)',
    build() {
      const body = [], lit = [], W = 300, C = -168;
      body.push(['@stone.3', rect(-W, -14, 2 * W, 14)], { f: lin('@stone.0', '@stone.1', C, -14), d: rect(-W, C, 2 * W, C * -1 - 14) });
      body.push({ f: '@stone.2', d: poly([[W, -14], [W + 16, -18], [W + 16, C - 4], [W, C]]) });
      body.push({ s: '@stone.2', w: 1.2, op: 0.7, d: `M${-W} -60H${W}M${-W} -112H${W}M${-W} ${C + 6}H${W}`, detail: true });
      // the steep slate roof and its ridge cresting
      body.push({ f: lin('@roof.0', '@roof.2', C - 64, C), d: `M${-W - 4} ${C}L${-W + 30} ${C - 62}H${W - 30}L${W + 4} ${C}z` });
      let crest = ''; for (let x = -W + 34; x < W - 30; x += 9) crest += `M${x} ${C - 62}v-6`;
      body.push({ s: '@roof.2', w: 1.4, d: crest + `M${-W + 30} ${C - 66}H${W - 30}`, detail: true });
      // window bays: three storeys of Gothic lights, each its own glow
      const cols = []; for (let x = -W + 16; x < W - 14; x += 25) if (Math.abs(x + 6) > 64) cols.push(x);
      for (const x of cols) {
        body.push({ f: '@glass.0', d: lancet(x, -50, 12, 30), glow: 'window' });
        body.push({ f: '@glass.0', d: lancet(x, -102, 12, 32), glow: 'window' });
        body.push({ f: '@glass.1', d: lancet(x + 1, -150, 10, 26), glow: 'window' });
      }
      let mull = ''; for (const x of cols) mull += `M${x + 6} -50v28M${x + 6} -102v30M${x - 5} -14V${C}`;
      body.push({ s: '@stone.2', w: 1, op: 0.6, d: mull, detail: true });
      // gabled dormers along the roof, end pavilions with steep pyramid caps and corner turrets
      for (const gx of [-215, -135, 135, 215]) {
        body.push({ f: '@stone.0', d: poly([[gx - 26, C], [gx - 26, C - 30], [gx, C - 70], [gx + 26, C - 30], [gx + 26, C]]) });
        body.push({ f: '@glass.0', d: lancet(gx - 7, C - 44, 14, 36), glow: 'window' }, { s: '@stone.2', w: 1.2, d: `M${gx - 28} ${C - 29}L${gx} ${C - 72}L${gx + 28} ${C - 29}` }, ['@stone.1', spike(gx, C - 70, 6, 18)]);
      }
      for (const px of [-W, W - 56]) {
        body.push({ f: lin('@stone.0', '@stone.1', -250, -14), d: rect(px, -250, 56, 236) }, ['@stone.2', rect(px + 50, -250, 6, 236), 0.6]);
        body.push({ f: lin('@roof.0', '@roof.2', -330, -250), d: poly([[px - 4, -250], [px + 28, -332], [px + 60, -250]]) }, ['@roof.2', poly([[px + 28, -332], [px + 60, -250], [px + 44, -250]]), 0.6]);
        body.push(['@stone.1', spike(px + 3, -250, 8, 34)], ['@stone.1', spike(px + 53, -250, 8, 34)]);
        for (let k = 0; k < 4; k++) body.push({ f: '@glass.0', d: lancet(px + 18, -46 - k * 50, 20, 32), glow: 'window' });
        body.push({ s: '@stone.3', w: 1.4, op: 0.6, d: `M${px + 4} -14V-250M${px + 52} -14V-250`, detail: true });
      }
      // the clock tower: shaft, belfry, clock stage, gallery with pinnacles and the spire
      const T0 = -42, T1 = 42, top = -470;
      body.push({ f: lin('@stone.0', '@stone.1', top, -14), d: rect(T0, top, T1 - T0, -14 - top) }, ['@stone.2', rect(T1 - 9, top, 9, -14 - top), 0.7]);
      body.push({ s: '@stone.3', w: 2, op: 0.55, d: `M${T0 + 6} -14V${top}M${T1 - 12} -14V${top}`, detail: true });
      body.push({ f: '@glass.0', d: archW(-22, -96, 44, 82) }, { f: '@warm', d: archW(-16, -86, 32, 72), op: 0.25, glow: 'lamp' });
      for (let k = 0; k < 4; k++) { const y = -200 - k * 46; body.push({ f: '@glass.0', d: lancet(-16, y, 12, 34), glow: 'window' }, { f: '@glass.0', d: lancet(4, y, 12, 34), glow: 'window' }); }
      body.push({ s: '@stone.2', w: 1.2, d: 'M-42 -186H42M-42 -232H42M-42 -278H42M-42 -324H42', op: 0.7, detail: true });
      // belfry openings and the clock stage
      body.push(['@stone.0', rect(-48, -380, 96, 8)], ['@glass.1', lancet(-30, -368, 14, 40)], ['@glass.1', lancet(-7, -368, 14, 40)], ['@glass.1', lancet(16, -368, 14, 40)]);
      body.push({ f: '@clock.0', d: circ(0, -420, 22), glow: 'lamp' }, { s: '@clock.2', w: 2.4, d: `M0 -420m-24 0a24 24 0 1 0 48 0a24 24 0 1 0 -48 0` });
      let ticks = ''; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; ticks += `M${f1(Math.cos(a) * 17)} ${f1(-420 + Math.sin(a) * 17)}L${f1(Math.cos(a) * 21)} ${f1(-420 + Math.sin(a) * 21)}`; }
      body.push({ s: '@clock.1', w: 1.2, d: ticks }, { s: '@clock.1', w: 2, d: 'M0 -420V-434M0 -420L10 -414' });
      body.push(['@stone.0', rect(-50, -476, 100, 8)], { s: '@stone.2', w: 1.2, d: Array.from({ length: 12 }, (_, k) => `M${-46 + k * 8} -476v-8`).join('') + 'M-50 -484H50', detail: true });
      for (const sx of [-46, -16, 16, 46]) body.push(['@stone.1', spike(sx, -484, 9, 42)]);
      // the spire with lucarnes and its lit side
      body.push({ f: lin('@roof.0', '@roof.2', -650, -484), d: poly([[-36, -484], [0, -650], [36, -484]]) }, ['@roof.2', poly([[0, -650], [36, -484], [14, -484]]), 0.55]);
      for (const ly of [-520, -566]) body.push(['@stone.1', poly([[-8, ly + 18], [-8, ly], [0, ly - 10], [8, ly], [8, ly + 18]])], ['@glass.1', rect(-4, ly + 2, 8, 12)]);
      body.push(['@clock.2', rect(-1.5, -664, 3, 16)]);
      // night: floodlit tower and front, the beacon
      lit.push({ f: { lin: [[0, '@flood', 0.0], [1, '@flood', 0.42]], x1: 0, y1: -650, x2: 0, y2: -14 }, d: rect(-46, -650, 92, 636) });
      lit.push({ f: { lin: [[0, '@flood', 0.0], [1, '@flood', 0.3]], x1: 0, y1: -260, x2: 0, y2: -14 }, d: rect(-W, -250, 2 * W, 236) });
      lit.push(['@beacon', circ(0, -666, 3)]);
      return { body, lit };
    },
  });

  /* ---------- landmark.beetham-tower ---------- */
  define({
    id: 'landmark.beetham-tower', category: 'landmark', size: [120, 780], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#8fb4c8', '#6d93aa', '#4c7088', '#c4dae4'], frame: ['#d8dee2', '#a8b2b8', '#6c767e'], dark: '#2c3640', blade: ['#d8eef6', '#a8ccdc'],
      flood: '#d8ecff', beacon: '#ff4030',
    } },
    night: { glow: { window: '#fff0c8' }, on: 0.55 },
    shadow: { rx: 60, ry: 6, h: 760 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/beetham-tower', 'uk', 'manchester', 'tower', 'glass', 'skyline', 'kit:urban', 'kit:towers'],
    credit: 'native: drawn for the Manchester area scenes (after the Deansgate tower)',
    build(v, r) {
      const body = [], lit = [], A = -42, B = 26, B2 = 52, Y1 = -330, TOP = -712;
      body.push({ f: lin('@glass.0', '@glass.2', 0, 0, A, B), d: rect(A, Y1, B - A, -Y1) });
      body.push({ f: lin('@glass.3', '@glass.1', 0, 0, A, B2), d: rect(A, TOP, B2 - A, Y1 - TOP) });
      body.push(['@glass.2', rect(B2 - 12, TOP, 12, Y1 - TOP), 0.55], ['@glass.2', rect(B - 10, Y1, 10, -Y1), 0.5]);
      // the cantilever's soffit and the step
      body.push(['@dark', poly([[B, Y1], [B2, Y1], [B2, Y1 + 6], [B, Y1 + 10]])], ['@frame.1', rect(A, Y1 - 3, B2 - A, 4)]);
      // floors: a spandrel band per floor (computed), the lower ones narrower
      const cells = [];
      for (let y = -12; y > TOP + 6; y -= 14) {
        const right = y > Y1 ? B : B2;
        body.push({ f: '@frame.0', d: rect(A, y, right - A, 2.2), op: 0.55 });
        for (let x = A + 3; x < right - 6; x += 11) cells.push([x, y - 11, 8, 9]);
      }
      body.push({ s: '@frame.1', w: 0.8, op: 0.5, d: Array.from({ length: 9 }, (_, k) => `M${A + 11 * (k + 1)} -2V${k < 6 ? TOP : TOP}`).join(''), detail: true });
      winGroups(r, cells, 18).forEach(d => body.push({ f: '@glass.2', d, op: 0.3, glow: 'window' }));
      // the sky reflected in the glass: a few long light streaks
      body.push(['@glass.3', poly([[A + 4, -40], [A + 18, -40], [A + 30, Y1 + 20], [A + 16, Y1 + 20]]), 0.35], ['@glass.3', poly([[A + 6, Y1 - 30], [A + 22, Y1 - 30], [A + 40, TOP + 30], [A + 24, TOP + 30]]), 0.35]);
      // the roof plant screen and the glass blade along the edge, standing above the roof
      body.push(['@frame.2', rect(A + 4, TOP - 12, B2 - A - 12, 12)], { f: lin('@blade.0', '@blade.1', -785, Y1), d: poly([[B2 - 2, Y1 + 4], [B2 + 10, Y1 + 4], [B2 + 10, -782], [B2 - 2, -760]]), op: 0.8 });
      body.push({ s: '@frame.0', w: 1, d: `M${B2 + 4} ${Y1}V-772`, op: 0.6 }, ['@frame.2', rect(A, -12, B - A, 12)], ['@dark', rect(A + 10, -10, 22, 10)]);
      lit.push({ f: { lin: [[0, '@flood', 0.55], [1, '@flood', 0]], x1: 0, y1: -782, x2: 0, y2: Y1 }, d: poly([[B2 - 2, Y1 + 4], [B2 + 10, Y1 + 4], [B2 + 10, -782], [B2 - 2, -760]]) }, ['@beacon', circ(B2 + 4, -784, 3)], ['@beacon', circ(A + 6, TOP - 14, 2.4)]);
      return { body, lit };
    },
  });

  /* ---------- landmark.castlefield-viaduct ---------- */
  define({
    id: 'landmark.castlefield-viaduct', category: 'landmark', size: [1000, 300], variants: 1, seasonal: true, flippable: false,
    parts: ['body', 'plants', 'lit'],
    palette: Object.assign({ base: {
      brick: ['#9a5a44', '#7a4434', '#5c3226', '#b87256'], stone: ['#c8b08a', '#a08a68'], steel: ['#6a5048', '#4e3a34', '#8a6a5e'], rail: '#2a2c2e',
      lamp: '#ffe2a0', flood: '#ffd9a0',
    } }, LEAF),
    night: { glow: { lamp: '#ffe4a8', window: '#ffd890' }, on: 1 },
    shadow: { rx: 480, ry: 10, h: 120 },
    reflect: true,
    anim: { sway: { part: 'plants', pivot: [0, -262], deg: 0.6 } },
    tags: ['landmark', 'signature', 'place:uk/castlefield', 'uk', 'manchester', 'viaduct', 'ironwork', 'garden', 'row', 'kit:urban'],
    credit: 'native: drawn for the Manchester area scenes (after the Castlefield Viaduct sky garden)',
    build(v, r) {
      const body = [], plants = [], lit = [], DT = -262, DB = -214, piers = [-430, -145, 145, 430];
      for (const px of piers) {
        body.push({ f: lin('@brick.3', '@brick.1', DB, 0), d: rect(px - 22, DB, 44, -DB) }, ['@brick.2', rect(px + 12, DB, 10, -DB), 0.6]);
        let bands = ''; for (let y = DB + 14; y < 0; y += 9) bands += `M${px - 22} ${y}h44`;
        body.push({ s: '@brick.2', w: 0.7, op: 0.45, d: bands, detail: true });
        // castellated cap and the springing stones
        let cren = ''; for (let k = 0; k < 4; k++) cren += rect(px - 26 + k * 14, DB - 10, 8, 8);
        body.push(['@stone.0', rect(px - 27, DB - 4, 54, 6)], ['@stone.1', cren], ['@stone.1', rect(px - 26, -10, 52, 10)]);
      }
      // the lattice girders: chords and X bracing bay by bay
      body.push({ f: '@steel.0', d: rect(-500, DT, 1000, 7) }, { f: '@steel.1', d: rect(-500, DB - 18, 1000, 8) }, ['@steel.2', rect(-500, DT, 1000, 2), 0.8]);
      for (let x = -500; x < 500; x += 26) {
        body.push({ s: '@steel.0', w: 2.4, d: `M${x} ${DT + 6}L${x + 26} ${DB - 12}M${x} ${DB - 12}L${x + 26} ${DT + 6}` });
        body.push({ s: '@steel.1', w: 1.6, d: `M${x} ${DT + 6}V${DB - 12}`, detail: true });
      }
      // the garden on the deck: railing, planters, shrubs and small trees (they sway a little)
      let rail = ''; for (let x = -496; x < 500; x += 10) rail += `M${x} ${DT}v-14`;
      body.push({ s: '@rail', w: 1, op: 0.7, d: rail + `M-500 ${DT - 14}H500`, detail: true });
      for (let x = -470; x < 480; x += 62 + Math.floor(r() * 30)) {
        const w = 24 + r() * 26, h = 14 + r() * 26;
        plants.push({ f: '@leaf.' + (Math.floor(r() * 3)), d: sceneDraw.blob(r, x, DT - h * 0.5, w * 0.6, h * 0.6, 7, 0.4) });
        if (r() < 0.45) plants.push({ f: '@leaf.2', d: sceneDraw.blob(r, x + 10, DT - h - 14, 16, 18, 6, 0.4) }, { s: '@brick.2', w: 2, d: `M${x + 10} ${DT}v${-h - 6}` });
        if (r() < 0.4) plants.push({ f: '@bloom', d: circ(x - 6, DT - h * 0.7, 3) + circ(x + 4, DT - h * 0.9, 2.6) });
      }
      for (let x = -480; x < 500; x += 120) body.push({ f: '@lamp', d: circ(x, DT - 18, 2.4), glow: 'lamp' });
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.35]], x1: 0, y1: DT - 50, x2: 0, y2: DT }, d: rect(-500, DT - 50, 1000, 50) });
      return { body, plants, lit };
    },
  });

  /* ---------- landmark.john-rylands ---------- */
  define({
    id: 'landmark.john-rylands', category: 'landmark', size: [410, 440], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#b06e62', '#94564c', '#6e3c36', '#c88a7c'], roof: ['#5c6266', '#43484c'], glass: ['#34404c', '#222a34'], warm: '#ffcf88', flood: '#ffd8b0',
    } },
    night: { glow: { window: '#ffd690', lamp: '#ffe8c0' }, on: 0.7 },
    shadow: { rx: 200, ry: 8, h: 260 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/john-rylands', 'uk', 'manchester', 'library', 'gothic', 'sandstone', 'kit:urban'],
    credit: 'native: drawn for the Manchester area scenes (after the Deansgate front of the John Rylands Library)',
    build() {
      const body = [];
      const lit = [];
      // wings
      for (const [x0, x1] of [[-205, -150], [150, 205]]) {
        body.push({ f: lin('@stone.0', '@stone.1', -240, 0), d: rect(x0, -240, x1 - x0, 240) }, ['@roof.1', poly([[x0 - 2, -240], [(x0 + x1) / 2, -280], [x1 + 2, -240]])]);
        for (let k = 0; k < 3; k++) body.push({ f: '@glass.0', d: lancet(x0 + 14, -70 - k * 62, 26, 46), glow: 'window' }, { s: '@stone.2', w: 1, d: `M${x0 + 27} ${-70 - k * 62 + 46}v-44`, detail: true });
      }
      // the central block with its great window and the porch
      body.push({ f: lin('@stone.3', '@stone.1', -300, 0), d: rect(-110, -300, 220, 300) }, ['@stone.2', rect(100, -300, 10, 300), 0.6]);
      body.push({ f: '@roof.0', d: poly([[-112, -300], [0, -370], [112, -300]]) }, ['@stone.0', poly([[-60, -300], [0, -350], [60, -300]])]);
      body.push({ f: '@glass.0', d: lancet(-62, -276, 124, 150), glow: 'window' });
      let tr = ''; for (let k = 1; k < 5; k++) tr += `M${-62 + k * 24.8} -126V-240`;
      body.push({ s: '@stone.3', w: 2.4, d: tr + 'M-62 -190H62M-62 -150H62' }, { s: '@stone.3', w: 2, d: 'M-37 -240Q-25 -270 0 -280Q25 -270 37 -240M-12 -248a12 12 0 1 0 24 0a12 12 0 1 0 -24 0', detail: true });
      body.push(['@stone.2', rect(-74, -110, 148, 110)], { f: '@glass.1', d: lancet(-34, -92, 68, 92) }, { f: '@warm', d: lancet(-26, -80, 52, 80), op: 0.3, glow: 'lamp' });
      for (const sx of [-70, -36, 36, 70]) body.push(['@stone.3', spike(sx, -110, 8, 30)]);
      // the two towers with their turrets, lancets and pinnacles
      for (const [x0, x1] of [[-150, -110], [110, 150]]) {
        body.push({ f: lin('@stone.0', '@stone.1', -380, 0), d: rect(x0, -380, x1 - x0, 380) }, ['@stone.2', rect(x1 - 7, -380, 7, 380), 0.5]);
        for (let k = 0; k < 5; k++) body.push({ f: '@glass.0', d: lancet(x0 + 13, -60 - k * 64, 14, 40), glow: 'window' });
        let bat = ''; for (let k = 0; k < 4; k++) bat += rect(x0 - 2 + k * 11.5, -392, 7, 12);
        body.push(['@stone.3', bat], ['@stone.0', rect(x0 - 4, -382, x1 - x0 + 8, 6)]);
        body.push(['@stone.1', spike(x0 + 2, -392, 8, 50)], ['@stone.1', spike(x1 - 2, -392, 8, 50)], ['@roof.0', spike((x0 + x1) / 2, -392, 22, 54)]);
        body.push({ s: '@stone.2', w: 1, op: 0.5, d: `M${x0 + 4} 0V-380M${x0} -130h40M${x0} -258h40`, detail: true });
      }
      for (const [x0] of [[-150], [110]]) for (let k = 0; k < 5; k++) body.push(hood(x0 + 13, -60 - k * 64, 14, '@stone.2'));
      for (const [x0] of [[-205], [150]]) for (let k = 0; k < 3; k++) body.push(hood(x0 + 14, -70 - k * 62, 26, '@stone.2'));
      for (let k = 0; k < 9; k++) body.push(foil(-88 + k * 22, -292, 3, '@stone.2'));
      let course = ''; for (let y = -20; y > -300; y -= 20) course += `M-110 ${y}H-74M74 ${y}H110`;
      body.push({ s: '@stone.2', w: 0.8, op: 0.4, d: course, detail: true }, ['@stone.2', rect(-208, -10, 416, 10)]);
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.4]], x1: 0, y1: -420, x2: 0, y2: 0 }, d: rect(-205, -420, 410, 420) });
      return { body, lit };
    },
  });

  /* ---------- landmark.whitworth-hall ---------- */
  define({
    id: 'landmark.whitworth-hall', category: 'landmark', size: [440, 420], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#cdbd98', '#b3a27c', '#8c7c5a', '#e0d2ae'], roof: ['#5a6064', '#42484c'], glass: ['#36424e', '#26303a'], warm: '#ffd08a', flood: '#ffe2b8',
    } },
    night: { glow: { window: '#ffd894', lamp: '#ffeac4' }, on: 0.7 },
    shadow: { rx: 210, ry: 8, h: 260 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/whitworth-hall', 'uk', 'manchester', 'university', 'gothic', 'hall', 'kit:urban'],
    credit: 'native: drawn for the Manchester area scenes (after Whitworth Hall on Oxford Road)',
    build() {
      const body = [], lit = [];
      // the hall with its steep gable and the great window
      body.push({ f: lin('@stone.3', '@stone.1', -330, 0), d: poly([[-200, 0], [-200, -210], [-75, -330], [50, -210], [50, 0]]) }, ['@stone.2', poly([[40, -220], [50, -210], [50, 0], [40, 0]]), 0.6]);
      body.push({ f: '@roof.0', d: poly([[-206, -206], [-75, -338], [56, -206], [46, -206], [-75, -326], [-196, -206]]) });
      body.push({ f: '@glass.0', d: lancet(-130, -270, 110, 190), glow: 'window' });
      let tr = ''; for (let k = 1; k < 5; k++) tr += `M${-130 + k * 22} -82V-238`;
      body.push({ s: '@stone.0', w: 2.6, d: tr + 'M-130 -130H-20M-130 -180H-20' }, { s: '@stone.0', w: 2, d: 'M-108 -238Q-96 -262 -75 -270Q-54 -262 -42 -238M-86 -246a11 11 0 1 0 22 0a11 11 0 1 0 -22 0', detail: true });
      for (const bx of [-204, 40]) { body.push(['@stone.1', rect(bx, -250, 14, 250)], ['@stone.0', spike(bx + 7, -250, 12, 40)]); }
      body.push(['@stone.1', spike(-75, -330, 10, 30)]);
      for (const x of [-190, -30]) for (let k = 0; k < 2; k++) body.push({ f: '@glass.0', d: lancet(x, -60 - k * 70, 16, 44), glow: 'window' });
      // the tower with the gateway arch, oriel and battlements
      body.push({ f: lin('@stone.0', '@stone.1', -380, 0), d: rect(60, -380, 120, 380) }, ['@stone.2', rect(168, -380, 12, 380), 0.6]);
      body.push(['@stone.2', archW(88, -120, 64, 120)], { f: '@warm', d: archW(96, -110, 48, 110), op: 0.25, glow: 'lamp' });
      for (let k = 0; k < 4; k++) { const y = -170 - k * 50; body.push({ f: '@glass.0', d: lancet(84, y, 18, 34), glow: 'window' }, { f: '@glass.0', d: lancet(110, y, 18, 34), glow: 'window' }, { f: '@glass.0', d: lancet(136, y, 18, 34), glow: 'window' }); }
      let bat = ''; for (let k = 0; k < 7; k++) bat += rect(58 + k * 18, -396, 10, 16);
      body.push(['@stone.1', bat], ['@stone.3', rect(56, -382, 128, 6)], ['@stone.1', spike(64, -396, 10, 28)], ['@stone.1', spike(176, -396, 10, 28)]);
      body.push({ s: '@stone.2', w: 1, op: 0.45, d: 'M60 -140H180M60 -320H180M60 -150H180', detail: true });
      for (let k = 0; k < 4; k++) { const y = -170 - k * 50; for (const x of [84, 110, 136]) body.push(hood(x, y, 18, '@stone.2')); }
      for (const x of [-190, -30]) for (let k = 0; k < 2; k++) body.push(hood(x, -60 - k * 70, 16, '@stone.2'));
      for (const bx of [-204, 40]) for (let k = 0; k < 4; k++) body.push(['@stone.2', poly([[bx, -40 - k * 52], [bx + 14, -40 - k * 52], [bx + 18, -32 - k * 52], [bx - 4, -32 - k * 52]]), 0.7]);
      for (let k = 0; k < 8; k++) body.push(foil(-182 + k * 30, -196, 3.2, '@stone.2'));
      for (let k = 1; k < 5; k++) { const t = k / 5; body.push(['@stone.1', spike(-200 + 125 * t, -210 - 120 * t, 5, 10)], ['@stone.1', spike(50 - 125 * t, -210 - 120 * t, 5, 10)]); }
      for (let k = 0; k < 6; k++) body.push(['@stone.3', rect(66 + k * 18, -350, 8, 14), 0.8]);
      // the low range to the left of the hall
      body.push({ f: lin('@stone.0', '@stone.1', -150, 0), d: rect(-220, -150, 20, 150) });
      body.push(['@stone.2', rect(-222, -8, 444, 8)]);
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.38]], x1: 0, y1: -400, x2: 0, y2: 0 }, d: rect(-205, -400, 390, 400) });
      return { body, lit };
    },
  });

  /* ---------- landmark.whitworth-gallery ---------- */
  define({
    id: 'landmark.whitworth-gallery', category: 'landmark', size: [600, 260], variants: 1, seasonal: true, flippable: false,
    parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      brick: ['#a8563e', '#8c4430', '#c4704f', '#6a3022'], terra: ['#dca07a', '#c0805c'], roof: ['#56605e', '#3e4644'], glass: ['#5a7a86', '#3c5866', '#a8c8d0'],
      frame: '#d8dcd8', flood: '#ffe0b0',
    } }, LEAF),
    night: { glow: { window: '#ffd894' }, on: 0.7 },
    shadow: { rx: 290, ry: 8, h: 160 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/whitworth-gallery', 'uk', 'manchester', 'gallery', 'park', 'brick', 'kit:urban'],
    credit: 'native: drawn for the Manchester area scenes (after the Whitworth on Oxford Road)',
    build() {
      const body = [], lit = [];
      body.push({ f: lin('@brick.2', '@brick.1', -170, 0), d: rect(-290, -170, 400, 170) }, ['@roof.0', poly([[-294, -170], [-270, -196], [86, -196], [114, -170]])]);
      body.push({ s: '@brick.3', w: 0.6, op: 0.3, d: Array.from({ length: 24 }, (_, k) => `M-290 ${-6 - k * 7}H110`).join(''), detail: true });
      body.push(['@terra.0', rect(-292, -96, 404, 6)], ['@terra.0', rect(-292, -172, 404, 6)]);
      for (let x = -276; x < 100; x += 34) {
        if (x > -86 && x < -10) continue;
        body.push({ f: '@glass.1', d: archW(x, -150, 18, 44), glow: 'window' }, { f: '@glass.1', d: rect(x, -76, 18, 52), glow: 'window' }, ['@terra.1', rect(x - 2, -26, 22, 3)]);
        body.push({ s: '@terra.0', w: 2, d: `M${x - 2} -141a11 11 0 0 1 22 0`, detail: true }, ['@terra.0', rect(x + 6, -156, 6, 7)]);
      }
      // the central entrance pavilion with its terracotta gable and two small corner turrets
      body.push({ f: lin('@brick.2', '@brick.1', -232, 0), d: rect(-80, -210, 70, 210) }, ['@terra.0', poly([[-84, -210], [-45, -246], [-6, -210]])], ['@brick.1', poly([[-74, -212], [-45, -238], [-16, -212]])]);
      body.push(['@terra.1', archW(-66, -84, 42, 84)], { f: '@glass.0', d: archW(-60, -76, 30, 76), glow: 'window' }, { f: '@glass.1', d: archW(-60, -180, 30, 70), glow: 'window' });
      for (const tx of [-88, -2]) body.push(['@brick.1', rect(tx - 6, -232, 12, 232)], ['@roof.0', poly([[tx - 9, -232], [tx, -258], [tx + 9, -232]])], ['@terra.0', rect(tx - 8, -234, 16, 4)]);
      // the glass wing reaching into the park, with trees reflected in it
      body.push({ f: lin('@glass.2', '@glass.0', -120, 0), d: rect(112, -118, 196, 118) }, ['@frame', rect(108, -124, 204, 7)], ['@frame', rect(108, -4, 204, 4)]);
      let mull = ''; for (let x = 132; x < 308; x += 22) mull += `M${x} -117V-4`;
      body.push({ s: '@frame', w: 1.6, d: mull });
      body.push({ f: '@leaf.2', d: sceneDraw.blob(sceneRnd(4411), 170, -62, 40, 34, 7, 0.4), op: 0.35 }, { f: '@leaf.0', d: sceneDraw.blob(sceneRnd(4412), 256, -54, 36, 30, 7, 0.4), op: 0.3 });
      for (let x = 120; x < 300; x += 44) body.push({ f: '@glass.1', d: rect(x, -100, 30, 40), op: 0.3, glow: 'window' });
      body.push(['@brick.3', rect(-292, -6, 404, 6)]);
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.35]], x1: 0, y1: -250, x2: 0, y2: 0 }, d: rect(-290, -250, 400, 250) });
      return { body, lit };
    },
  });

  /* ---------- landmark.salford-lowry ---------- */
  define({
    id: 'landmark.salford-lowry', category: 'landmark', size: [580, 330], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      steel: ['#d4d8dc', '#b4bac0', '#8c949c', '#e8ecee'], glass: ['#3e5a6c', '#2a3e4c', '#88aabc'], accent: ['#e08a2a', '#7a4a8c'], base: '#6a7076', flood: '#e8f0ff', warm: '#ffc878',
    } },
    night: { glow: { window: '#ffd48a', lamp: '#ffe6b4' }, on: 0.75 },
    shadow: { rx: 280, ry: 8, h: 200 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/salford-quays', 'uk', 'salford', 'theatre', 'steel', 'quays', 'kit:urban'],
    credit: 'native: drawn for the Manchester area scenes (after the Lowry arts centre on Salford Quays)',
    build() {
      const body = [], lit = [];
      // the long angular wings clad in steel
      body.push({ f: lin('@steel.3', '@steel.1', -170, 0), d: poly([[-290, 0], [-290, -120], [-170, -168], [-60, -150], [-60, 0]]) });
      body.push({ f: lin('@steel.0', '@steel.2', -200, 0), d: poly([[60, 0], [60, -190], [200, -150], [292, -110], [292, 0]]) });
      let seams = ''; for (let x = -280; x < -60; x += 14) seams += `M${x} -4V${f1(-120 - Math.max(0, Math.min(48, (x + 290) * 0.4)) + 6)}`;
      for (let x = 70; x < 292; x += 14) seams += `M${x} -4V${f1(-180 + (x - 60) * 0.32)}`;
      body.push({ s: '@steel.2', w: 0.8, op: 0.5, d: seams, detail: true });
      // the drum (the tower) with its horizontal bands and the crown
      body.push({ f: lin('@steel.3', '@steel.2', 0, 0, -64, 64), d: rect(-64, -300, 128, 300) }, ['@steel.0', ell(0, -300, 64, 12)], ['@steel.2', poly([[-64, -300], [64, -300], [56, -316], [-56, -316]])]);
      for (let y = -24; y > -296; y -= 22) body.push({ s: '@steel.2', w: 1.4, op: 0.6, d: `M-64 ${y}Q0 ${y + 8} 64 ${y}` });
      body.push(['@steel.1', rect(30, -300, 34, 300), 0.5]);
      // the glazed foyer, its canopy and the coloured lining
      body.push({ f: lin('@glass.2', '@glass.0', -140, 0), d: poly([[-60, 0], [-60, -136], [60, -150], [60, 0]]) });
      let fm = ''; for (let x = -48; x < 60; x += 18) fm += `M${x} -4V${f1(-136 - (x + 60) * 0.12)}`;
      body.push({ s: '@steel.0', w: 1.4, d: fm + 'M-60 -70H60' });
      body.push(['@accent.0', rect(-54, -60, 40, 54), 0.55], ['@accent.1', rect(10, -60, 40, 54), 0.5]);
      body.push(['@steel.3', poly([[-110, -140], [80, -160], [100, -150], [-96, -128]])]);
      // ribbon windows along the wings
      for (let k = 0; k < 6; k++) body.push({ f: '@glass.1', d: rect(-270 + k * 34, -84, 24, 12), glow: 'window' }, { f: '@glass.1', d: rect(80 + k * 34, -96, 24, 12), glow: 'window' });
      for (let k = 0; k < 5; k++) body.push({ f: '@glass.1', d: rect(-40 + k * 18, -230 + (k % 2) * 30, 10, 18), glow: 'window' });
      for (let k = 0; k < 16; k++) { const x = -280 + k * 13; body.push(['@steel.' + (k % 3 === 0 ? 3 : 1), rect(x, -110 + (k % 4) * 6, 11, 18), 0.45]); }
      for (let k = 0; k < 16; k++) { const x = 72 + k * 13.5; body.push(['@steel.' + (k % 3 === 1 ? 3 : 2), rect(x, -150 + k * 2 + (k % 3) * 5, 11, 20), 0.4]); }
      for (let k = 0; k < 8; k++) body.push(['@steel.3', rect(-60 + k * 5, -290 + k * 32, 3, 20), 0.5]);
      body.push(['@base', rect(-292, -8, 586, 8)]);
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.45]], x1: 0, y1: -320, x2: 0, y2: 0 }, d: rect(-64, -318, 128, 318) }, { f: '@warm', d: poly([[-60, 0], [-60, -136], [60, -150], [60, 0]]), op: 0.4 });
      return { body, lit };
    },
  });

  /* ---------- landmark.mcr-central-library ---------- */
  define({
    id: 'landmark.mcr-central-library', category: 'landmark', size: [460, 280], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#ece6d6', '#d4ccb8', '#aea690', '#8a8270'], lead: ['#8a9690', '#6a7670'], glass: ['#3a4650', '#2a343e'], flood: '#fff0d0', warm: '#ffd690',
    } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff0cc' }, on: 0.8 },
    shadow: { rx: 230, ry: 8, h: 200 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/st-peters-square', 'uk', 'manchester', 'library', 'rotunda', 'classical', 'kit:urban'],
    credit: 'native: drawn for the Manchester area scenes (after the Central Library rotunda)',
    build() {
      const body = [], lit = [];
      // the drum: rusticated base, the colonnaded storeys, the cornice, the shallow lead roof
      body.push({ f: lin('@stone.0', '@stone.2', 0, 0, -220, 220), d: rect(-220, -70, 440, 70) });
      let rust = ''; for (let y = -10; y > -70; y -= 10) rust += `M-220 ${y}H220`;
      body.push({ s: '@stone.3', w: 0.8, op: 0.45, d: rust, detail: true });
      body.push({ f: lin('@stone.0', '@stone.2', 0, 0, -214, 214), d: rect(-214, -200, 428, 130) });
      for (let k = 0; k < 15; k++) {
        const a = -Math.PI / 2 + (k + 0.5) / 15 * Math.PI, x = Math.sin(a) * 210, w = Math.max(3, Math.cos(a) * 10);
        body.push({ f: '@stone.0', d: rect(x - w / 2, -196, w, 122) }, { f: '@glass.0', d: rect(x + w / 2 + 1, -180, Math.max(2, Math.cos(a) * 14), 34), glow: 'window' });
      }
      for (let k = 0; k < 15; k++) { const a = -Math.PI / 2 + (k + 0.5) / 15 * Math.PI, x = Math.sin(a) * 210, w = Math.max(3, Math.cos(a) * 10); body.push(['@stone.1', rect(x - w / 2 - 1.5, -200, w + 3, 5)], ['@stone.2', rect(x - w / 2 - 1, -76, w + 2, 4), 0.8]); }
      body.push(['@stone.1', rect(-218, -210, 436, 12)], ['@stone.3', rect(-218, -199, 436, 3), 0.6], ['@stone.1', rect(-210, -226, 420, 16)]);
      body.push({ f: lin('@lead.0', '@lead.1', -270, -226), d: 'M-200 -226Q-120 -268 0 -272Q120 -268 200 -226z' }, ['@stone.1', rect(-22, -282, 44, 12)]);
      // the portico: steps, columns, entablature and pediment
      body.push(['@stone.2', rect(-120, -10, 240, 10)], ['@stone.1', rect(-110, -18, 220, 8)]);
      for (let k = 0; k < 6; k++) { const x = -96 + k * 38; body.push({ f: lin('@stone.0', '@stone.2', 0, 0, x, x + 14), d: rect(x, -150, 14, 132) }, ['@stone.1', rect(x - 3, -154, 20, 6)]); }
      body.push(['@glass.1', rect(-80, -140, 160, 122), 0.55], { f: '@warm', d: rect(-24, -90, 48, 72), op: 0.3, glow: 'lamp' });
      body.push(['@stone.0', rect(-108, -172, 216, 18)], ['@stone.1', poly([[-112, -172], [0, -206], [112, -172]])], ['@stone.2', poly([[-90, -175], [0, -200], [90, -175]]), 0.5]);
      for (let k = 0; k < 6; k++) body.push({ f: '@glass.0', d: rect(-200 + k * 12 + (k > 2 ? 290 : 0), -52, 8, 30), glow: 'window' });
      lit.push({ f: { lin: [[0, '@flood', 0], [1, '@flood', 0.45]], x1: 0, y1: -280, x2: 0, y2: 0 }, d: rect(-220, -280, 440, 280) });
      return { body, lit };
    },
  });

  /* ---------- landmark.mcr-stadium (generic: no club colours, no marks) ---------- */
  define({
    id: 'landmark.mcr-stadium', category: 'landmark', size: [940, 300], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      clad: ['#c8ccd0', '#a8aeb4', '#7c848c', '#e4e8ea'], roof: ['#eef0f2', '#c4c8cc'], seat: ['#5a6068', '#454b52'], truss: ['#8c949a', '#5c646a'],
      glass: ['#3a4a58', '#2a3642'], flood: '#f4f8ff', warm: '#ffd690',
    } },
    night: { glow: { window: '#ffe2a8', lamp: '#f8fbff' }, on: 0.85 },
    shadow: { rx: 460, ry: 10, h: 200 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/match-day', 'uk', 'manchester', 'stadium', 'football', 'sport', 'kit:urban'],
    credit: 'native: a generic large football stand, drawn for the Manchester match-day scene (no club marks)',
    build() {
      const body = [], lit = [];
      // the outer wall of the stand, glazed concourse and stair cores
      body.push({ f: lin('@clad.3', '@clad.1', -200, 0), d: poly([[-470, 0], [-470, -170], [-420, -210], [420, -210], [470, -170], [470, 0]]) });
      for (let x = -440; x < 450; x += 36) body.push({ s: '@clad.2', w: 1, op: 0.5, d: `M${x} -4V-196`, detail: true });
      for (let k = 0; k < 22; k++) body.push({ f: '@glass.0', d: rect(-430 + k * 39, -64, 30, 22), glow: 'window' });
      for (const sx of [-360, -120, 120, 360]) body.push({ f: lin('@clad.0', '@clad.2', 0, 0, sx - 20, sx + 20), d: rect(sx - 22, -230, 44, 230) }, { s: '@clad.2', w: 1.4, d: `M${sx - 22} -60l44 -40M${sx - 22} -120l44 -40M${sx - 22} -180l44 -40`, detail: true });
      // the seating rake seen over the wall's lip (the upper tier) and the roof
      body.push({ f: lin('@seat.0', '@seat.1', -260, -210), d: poly([[-420, -210], [-400, -262], [400, -262], [420, -210]]) });
      let rows = ''; for (let y = -214; y > -262; y -= 6) rows += `M-418 ${y}H418`;
      body.push({ s: '@seat.1', w: 0.8, op: 0.6, d: rows, detail: true });
      body.push({ f: lin('@roof.0', '@roof.1', -300, -262), d: poly([[-470, -262], [-440, -298], [440, -298], [470, -262]]) });
      // the cantilever truss and the roof's front edge with floodlights in it
      let tr = ''; for (let x = -440; x < 440; x += 40) tr += `M${x} -298l20 -6l20 6`;
      body.push({ s: '@truss.0', w: 2.2, d: tr + 'M-440 -304H440' }, ['@truss.1', rect(-470, -264, 940, 4)]);
      for (let k = 0; k < 18; k++) body.push({ f: '@roof.1', d: rect(-430 + k * 50, -268, 22, 5), glow: 'lamp' });
      body.push(['@clad.2', rect(-472, -6, 944, 6)]);
      lit.push({ f: { lin: [[0, '@flood', 0.55], [1, '@flood', 0]], x1: 0, y1: -268, x2: 0, y2: -120 }, d: poly([[-470, -268], [470, -268], [520, -120], [-520, -120]]) });
      lit.push({ f: '@warm', d: rect(-430, -64, 860, 22), op: 0.3 });
      return { body, lit };
    },
  });

  /* ---------- structure.mediacity-footbridge ---------- */
  define({
    id: 'structure.mediacity-footbridge', category: 'structure', size: [720, 280], variants: 1, seasonal: false, flippable: true,
    parts: ['body'],
    palette: { base: { white: ['#f4f6f6', '#d4dadc', '#a8b0b4'], cable: '#e8ecee', deck: ['#8a9298', '#5c646a'], lamp: '#fff2c8' } },
    night: { glow: { lamp: '#fff0c0' }, on: 1 },
    shadow: { rx: 340, ry: 6, h: 40 },
    reflect: true,
    tags: ['uk', 'salford', 'mediacity', 'bridge', 'footbridge', 'quays', 'kit:urban', 'role:building-mid'],
    credit: 'native: drawn for the Manchester area scenes (after the MediaCityUK footbridge over the Ship Canal)',
    build() {
      const body = [];
      const deckY = x => -36 - 14 * (1 - (x / 360) ** 2);
      let deck = 'M-360 ' + f1(deckY(-360)); for (let x = -340; x <= 360; x += 20) deck += 'L' + x + ' ' + f1(deckY(x));
      let under = ''; for (let x = 360; x >= -360; x -= 20) under += 'L' + x + ' ' + f1(deckY(x) + 10);
      body.push({ f: lin('@deck.0', '@deck.1', -60, -20), d: deck + under + 'z' }, { s: '@white.0', w: 2, d: deck });
      let rail = ''; for (let x = -356; x < 360; x += 9) rail += `M${x} ${f1(deckY(x))}v-10`;
      body.push({ s: '@white.1', w: 0.8, op: 0.8, d: rail, detail: true }, { s: '@white.0', w: 1.2, d: deck.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, a, b) => `${a} ${f1(+b - 10)}`) });
      // the leaning mast, its backstays and the fan of stays to the deck
      const top = [-30, -276], foot = [70, deckY(70)];
      body.push({ f: '@white.0', d: poly([[foot[0] - 7, foot[1]], [top[0] - 4, top[1]], [top[0] + 4, top[1]], [foot[0] + 7, foot[1]]]) }, ['@white.2', poly([[foot[0] + 2, foot[1]], [top[0] + 2, top[1]], [top[0] + 4, top[1]], [foot[0] + 7, foot[1]]]), 0.6]);
      let stays = ''; for (let k = 0; k < 9; k++) { const x = -330 + k * 36; stays += `M${top[0]} ${top[1] + 6 + k * 3}L${x} ${f1(deckY(x) - 10)}`; }
      for (let k = 0; k < 4; k++) { const x = 200 + k * 40; stays += `M${top[0]} ${top[1] + 4}L${x} ${f1(deckY(x) - 10)}`; }
      body.push({ s: '@cable', w: 1, op: 0.85, d: stays });
      for (const px of [-340, 340]) body.push(['@white.1', rect(px - 10, deckY(px), 20, -deckY(px) + 4)]);
      body.push(['@deck.1', rect(60, deckY(70) + 10, 20, -deckY(70) - 6)], ['@white.2', ell(70, 2, 26, 4)]);
      for (let x = -320; x <= 320; x += 80) body.push({ f: '@lamp', d: circ(x, deckY(x) - 12, 2.2), glow: 'lamp' });
      return { body };
    },
  });

  /* ---------- building.mcr-mill (v0 a cotton mill with a stair tower and chimney; v1 a Northern Quarter warehouse with shopfronts) ---------- */
  define({
    id: 'building.mcr-mill', category: 'building', size: [420, 320], variants: 2, seasonal: false, flippable: true,
    parts: ['body', 'lit'],
    palette: { base: {
      brick: ['#9c5640', '#7e4232', '#b86c50', '#5e2e22'], stone: ['#d4c4a4', '#b0a080'], roof: ['#4e5458', '#3a3f43'], glass: ['#3a4650', '#26303a'],
      shop: ['#2a4a5a', '#6a2a2a', '#2a5a3a', '#4a3a5a'], iron: '#2a2c30', warm: '#ffcf86',
    } },
    night: { glow: { window: '#ffd488' }, on: 0.55 },
    shadow: { rx: 200, ry: 10, h: 300 },
    tags: ['uk', 'manchester', 'mill', 'warehouse', 'brick', 'industrial', 'kit:urban', 'role:building-mid'],
    credit: 'native: drawn for the Manchester area scenes (Ancoats mills and Northern Quarter warehouses, generic)',
    build(v, r) {
      const body = [], lit = [], mill = v === 0, H = mill ? 250 : 200, x0 = -200, x1 = 160;
      body.push({ f: lin('@brick.2', '@brick.1', -H, 0), d: rect(x0, -H, x1 - x0, H) }, ['@brick.3', rect(x1 - 8, -H, 8, H), 0.4]);
      body.push({ s: '@brick.3', w: 0.6, op: 0.25, d: Array.from({ length: Math.floor(H / 8) }, (_, k) => `M${x0} ${-4 - k * 8}H${x1}`).join(''), detail: true });
      body.push(['@stone.0', rect(x0 - 3, -H - 6, x1 - x0 + 6, 8)]);
      if (!mill) body.push(['@roof.0', poly([[x0, -H - 6], [x0 + 20, -H - 26], [x1 - 20, -H - 26], [x1, -H - 6]])]);
      const floors = mill ? 6 : 4, fh = (H - (mill ? 20 : 50)) / floors, cols = 9, cw = (x1 - x0) / cols;
      const cells = [];
      for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) cells.push([x0 + c * cw + cw * 0.22, -H + 14 + f * fh, cw * 0.56, fh * 0.62]);
      winGroups(r, cells, 8).forEach(d => body.push({ f: '@glass.0', d, glow: 'window' }));
      let sills = ''; for (const c of cells) sills += `M${f1(c[0] - 1)} ${f1(c[1] + c[3] + 1)}h${f1(c[2] + 2)}`;
      body.push({ s: '@stone.1', w: 1.2, op: 0.8, d: sills, detail: true });
      if (mill) {
        // the stair and water tower, and the chimney
        body.push({ f: lin('@brick.0', '@brick.1', -H - 60, 0), d: rect(x1, -H - 50, 44, H + 50) }, ['@roof.0', poly([[x1 - 3, -H - 50], [x1 + 22, -H - 74], [x1 + 47, -H - 50]])]);
        for (let k = 0; k < 6; k++) body.push({ f: '@glass.0', d: rect(x1 + 16, -H - 36 + k * 44, 12, 22), glow: 'window' });
        body.push({ f: lin('@brick.0', '@brick.1', 0, 0, x0 + 30, x0 + 50), d: poly([[x0 + 28, -H], [x0 + 34, -H - 80], [x0 + 46, -H - 80], [x0 + 52, -H]]) }, ['@stone.0', rect(x0 + 31, -H - 86, 18, 6)]);
      } else {
        // shopfronts at the street and iron fire escapes
        for (let k = 0; k < 4; k++) { const sx = x0 + 8 + k * 88; body.push(['@shop.' + k, rect(sx, -44, 80, 40)], { f: '@glass.1', d: rect(sx + 8, -38, 46, 30), glow: 'window' }); }
        body.push({ s: '@iron', w: 1.4, d: `M${x0 + 120} -60V${-H + 10}M${x0 + 170} -60V${-H + 10}` + Array.from({ length: 4 }, (_, k) => `M${x0 + 118} ${-62 - k * 34}h54l-54 -34`).join('') });
      }
      body.push(['@brick.3', rect(x0, -6, x1 - x0 + (mill ? 44 : 0), 6)]);
      lit.push({ f: '@warm', d: rect(x0, -50, x1 - x0, 46), op: 0.18 });
      return { body, lit };
    },
  });

  /* ---------- vehicle.metrolink-tram (generic: silver with yellow ends and doors) ---------- */
  define({
    id: 'vehicle.metrolink-tram', category: 'vehicle', size: [460, 120], variants: 1, seasonal: false, flippable: true,
    parts: ['body', 'lit'],
    palette: { base: {
      silver: ['#d6dadc', '#b0b6ba', '#8a9096'], yellow: ['#f2c400', '#c89e00'], glass: ['#26323c', '#5a7080'], skirt: ['#3a3e42', '#26282a'], pan: '#3a3c40', head: '#fff6d8', tail: '#d02020',
    } },
    night: { glow: { window: '#fff2cc', lamp: '#fff6d8' }, on: 1 },
    anim: { bob: { part: 'body', dy: 0.5, period: 0.9 } },
    shadow: { rx: 220, ry: 6, h: 100 },
    tags: ['uk', 'manchester', 'tram', 'metrolink', 'rail', 'traffic', 'kit:urban', 'kit:vehicles', 'role:vehicle'],
    credit: 'native: drawn for the Manchester area scenes (a two-section tram, no operator marks)',
    build() {
      const body = [], lit = [];
      for (const [a, b] of [[-228, -4], [4, 228]]) {
        const front = a < 0 ? a : b;
        body.push({ f: lin('@silver.0', '@silver.2', -100, -8), d: `M${a + 12} -10V-90Q${a + 12} -100 ${a + 24} -100H${b - 24}Q${b - 12} -100 ${b - 12} -90V-10z` });
        body.push(['@yellow.0', a < 0 ? `M${a} -14V-70Q${a} -96 ${a + 26} -98V-14z` : `M${b} -14V-70Q${b} -96 ${b - 26} -98V-14z`]);
        body.push({ f: '@glass.0', d: a < 0 ? `M${a + 4} -60Q${a + 6} -88 ${a + 24} -90V-60z` : `M${b - 4} -60Q${b - 6} -88 ${b - 24} -90V-60z`, glow: 'window' });
        for (let k = 0; k < 5; k++) { const wx = a + 34 + k * 36; if (k === 2) { body.push(['@yellow.0', rect(wx, -86, 26, 74)], { s: '@yellow.1', w: 1, d: `M${wx + 13} -86v74` }, { f: '@glass.0', d: rect(wx + 3, -80, 8, 34), glow: 'window' }, { f: '@glass.0', d: rect(wx + 15, -80, 8, 34), glow: 'window' }); } else body.push({ f: '@glass.0', d: rect(wx, -84, 28, 36), glow: 'window' }, ['@glass.1', `M${wx + 2} -82h10l-10 14z`, 0.35]); }
        body.push(['@skirt.0', rect(a + 8, -16, b - a - 16, 8)], ['@silver.2', rect(a + 12, -46, b - a - 24, 3), 0.6]);
        body.push({ f: '@head', d: circ(front + (a < 0 ? 8 : -8), -28, 3.5), glow: 'lamp' });
        for (const wx of [a + 50, b - 50]) body.push(['@skirt.1', circ(wx, -6, 9)]);
      }
      body.push(['@skirt.0', rect(-6, -92, 12, 82)], ['@silver.1', rect(-60, -106, 120, 6)]);
      body.push({ s: '@pan', w: 2, d: 'M-30 -106L0 -124L30 -106M-16 -124H16' });
      lit.push({ f: '@head', d: poly([[-228, -30], [-300, -18], [-300, -40]]), op: 0.25 });
      return { body, lit };
    },
  });
})();

/* ============================================================
   ARCHETYPE mcr-city: a Manchester street, square, canal or quay with its landmark. PURE.
   Layers: horizon (distant towers, hazed), far (a row of mills, terraces and towers with gaps),
   mid (the landmarks on their ground line; a canal or the quays in front of them), near (the road
   or towpath with traffic, a tram, people; lamps and benches), fore (cover: planters, grass,
   bollards, leaves; wind strips), front (two framing trees).
   Params: id, lat, lon, heading, at, horizon, landmarks ('id@x@h' list), ground (square | street |
   towpath | quay | park), water (none | canal | quays), tram (none | street | viaduct), far (brick |
   glass | mixed), features list (brick-viaduct, narrowboats, buses, cyclists, gulls, fans,
   blossom), palette.
   ============================================================ */
function sceneArchMcrCity(p, u) {
  const R = Math.round, H = Number.isFinite(p.horizon) ? p.horizon : 500, has = f => (p.features || []).includes(f);
  const water = p.water || 'none', ground = p.ground || 'street', tram = p.tram || 'none', far = p.far || 'mixed';
  const sOf = (id, h) => { const d = sceneObj(id); return d && d.size ? Math.round(h / d.size[1] * 100) / 100 : 1; };
  const wet = water !== 'none', yL = wet ? H + (water === 'quays' ? 70 : 120) : H + 150;           // the landmarks' ground line
  const yW0 = yL + 6, yW1 = water === 'quays' ? yL + 190 : water === 'canal' ? yL + 96 : yL;     // water band
  const yR = wet ? yW1 + 40 : yL + 70;                                                           // the road / towpath line
  const yF = Math.max(yR + 70, 800);                                                             // the fore cover top
  const palette = {
    base: { far: ['#a8b4c0', '#c0c8d0'], pave: ['#b8b0a2', '#9c9486', '#827a6e'], road: ['#5e6266', '#74787a'], kerb: ['#cfc8ba', '#a8a294'],
      grass: ['#5e8a3e', '#4a7232'], wall: ['#8a5a46', '#6a4436'], water: ['#7aa2b0', '#4a7486', '#2a4c5c'] },
    spring: { grass: ['#6a9a40', '#527c34'] },
    autumn: { grass: ['#7a8a3e', '#5e6e30'], pave: ['#b4a48a', '#988a72', '#7e725e'] },
    winter: { grass: ['#c8d0d0', '#a8b4b8'], pave: ['#d8dcdc', '#bcc2c4', '#9aa2a6'], far: ['#b8c0c8', '#ccd2d8'], road: ['#6a6e72', '#82868a'] },
  };
  if (p.palette && typeof p.palette === 'object') for (const [s, slots] of Object.entries(p.palette)) palette[s] = Object.assign({}, palette[s] || {}, slots);
  const data = {
    v: 1, id: String(p.id), view: { lat: p.lat, lon: p.lon, heading: Number.isFinite(p.heading) ? p.heading : 180, fov: 70, horizon: H, lift: 1 },
    at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting: 'urban', signage: false, palette,
    sky: { stars: 140, clouds: { n: 6, y: [40, Math.max(200, H - 200)], speed: 6 }, sunR: 24, moonR: 20 },
    layers: [{ id: 'horizon', depth: 0.08, haze: 0.6 }, { id: 'far', depth: 0.2, haze: 0.36 }, { id: 'mid', depth: 0.45, haze: 0.12 },
      { id: 'near', depth: 0.75, haze: 0.04 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    ground: [
      { layer: 'horizon', d: `M-160 ${H - 2}H1760V${H + 14}H-160Z`, fill: { lin: [[0, '@far.0'], [1, '@far.1']], x1: 0, y1: H - 2, x2: 0, y2: H + 14 } },
      { layer: 'far', d: `M-160 ${H + 10}H1760V${yL + 4}H-160Z`, fill: { lin: [[0, '@pave.0'], [1, '@pave.1']], x1: 0, y1: H + 10, x2: 0, y2: yL } },
      { layer: 'mid', d: `M-160 ${yL - 6}H1760V${(wet ? yW0 : yR) + 2}H-160Z`, fill: { lin: [[0, '@pave.0'], [1, '@pave.1']], x1: 0, y1: yL - 6, x2: 0, y2: yR } },
      { layer: 'near', d: `M-160 ${yR - 30}H1760V${yF + 4}H-160Z`, fill: ground === 'towpath' || ground === 'park' ? { lin: [[0, '@grass.0'], [1, '@grass.1']], x1: 0, y1: yR - 30, x2: 0, y2: yF } : { lin: [[0, '@road.1'], [1, '@road.0']], x1: 0, y1: yR - 30, x2: 0, y2: yF } },
      { layer: 'near', d: `M-160 ${yR + 26}H1760V${yR + 32}H-160Z`, fill: '@kerb.0' },
      { layer: 'fore', d: `M-160 ${yF}Q400 ${yF - 6} 800 ${yF}T1760 ${yF}V905H-160Z`, fill: ground === 'square' || ground === 'quay' ? { lin: [[0, '@pave.0'], [1, '@pave.2']], x1: 0, y1: yF, x2: 0, y2: 900 } : { lin: [[0, '@grass.0'], [1, '@grass.1']], x1: 0, y1: yF, x2: 0, y2: 900 } },
    ],
    water: [], place: [], scatter: [], actors: [], flocks: [],
    particles: 'season', weather: 'live', camera: { pan: 0, period: 90 },
  };
  if (ground === 'towpath') data.ground.push({ layer: 'near', d: `M-160 ${yR - 4}H1760V${yR + 26}H-160Z`, fill: { lin: [[0, '@pave.1'], [1, '@pave.2']], x1: 0, y1: yR - 4, x2: 0, y2: yR + 26 } });
  if (wet) {
    data.water.push({ layer: 'mid', d: `M-160 ${yW0}H1760V${yW1}H-160Z`, y0: yW0, y1: yW1, base: ['@water.0', '@water.1', '@water.2'], reflect: true, shimmer: water === 'quays' ? 40 : 24, lightPath: true });
    data.ground.push({ layer: 'mid', d: `M-160 ${yW0 - 6}H1760V${yW0 + 1}H-160Z`, fill: '@wall.0' }, { layer: 'near', d: `M-160 ${yW1 - 2}H1760V${yW1 + 6}H-160Z`, fill: '@kerb.1' });
  }
  // the distant city and the far row
  data.scatter.push({ obj: 'building.skyline-band', layer: 'horizon', seed: 2, area: { rect: [-120, H, 1720, H + 2] }, n: 5, minGap: 300, s: [0.42, 0.7], flip: 0.5, variant: 'random', tint: { col: '#a8b4c4', k: [0.08, 0.16] }, shadow: false, anim: false });
  const farMix = far === 'brick' ? { 'building.mcr-mill': 3, 'building.terrace-victorian': 2, 'building.tower-stone': 1 } : far === 'glass' ? { 'building.tower-glass': 3, 'building.tower': 2, 'building.skyscraper': 1, 'building.mcr-mill': 1 } : { 'building.mcr-mill': 2, 'building.tower-glass': 2, 'building.terrace-victorian': 1, 'building.tower': 1 };
  const avoid = [];
  const lms = (p.landmarks || []).map(s => String(s).split('@')).filter(a => sceneObj(a[0]));
  lms.forEach((a, i) => {
    const id = a[0], x = a[1] ? +a[1] : 800, h = a[2] ? +a[2] : 360, layer = a[3] || 'mid', yy = a[4] ? +a[4] : yL, d = sceneObj(id), s = sOf(id, h), w = d.size[0] * s / 2;
    data.place.push({ obj: id, x, y: yy, s, layer, seed: 11 + i, reflect: wet });
    if (layer === 'mid' && h > 150) avoid.push({ rect: [x - w - 10, H - 40, x + w + 10, yL + 8] });
  });
  data.scatter.push({ obj: farMix, layer: 'far', seed: 4, area: { rect: [-150, H + 24, 1750, H + 30] }, n: 22, minGap: 70, s: [0.3, 0.52], maxH: Math.round(H * 0.62), flip: 0.5, variant: 'random', tint: { col: '#9aa6b4', k: [0, 0.16] }, mask: { noise: { scale: 160, cut: 0.25 }, avoid }, shadow: false, anim: false });
  // street trees along the landmarks' ground line (static) and lamps
  data.scatter.push({ obj: { 'tree.plane': 2, 'tree.far-broad': 1 }, layer: 'mid', seed: 15, area: { rect: [-140, yL - 2, 1740, yL + 3] }, n: 16, minGap: 70, s: [0.2, 0.32], flip: 0.5, variant: [0, 2], tint: { col: '#6a8a9a', k: [0, 0.08] }, mask: { avoid: avoid.map(a => ({ rect: [a.rect[0] + 40, a.rect[1], a.rect[2] - 40, a.rect[3]] })) }, anim: false, reflect: wet });
  data.scatter.push({ obj: 'street.lamppost', layer: 'near', seed: 13, area: { rect: [-100, yR + 34, 1700, yR + 38] }, n: 6, minGap: 260, s: [0.46, 0.56], flip: 0.5, variant: [0, 3], anim: false });
  data.scatter.push({ obj: 'street.bench', layer: 'near', seed: 14, area: { rect: [-60, yR + 40, 1660, yR + 44] }, n: 4, minGap: 300, s: [0.5, 0.6], flip: 0.5, variant: 'random' });
  data.scatter.push({ obj: { 'street.bollard': 2 }, layer: 'near', seed: 16, area: { rect: [-140, yR + 30, 1740, yR + 34] }, n: 22, minGap: 50, s: [0.55, 0.75], flip: 0.5, variant: 'random', anim: false });
  // traffic on the road (or boats on the canal), a tram
  const lane = (k) => yR - 22 + k * 22, carS = y => Math.round((0.32 + (y - H) / (900 - H) * 0.32) * 100) / 100;
  if (ground !== 'towpath' && ground !== 'park') {
    const cars = [['vehicle.car-city', 0], ['vehicle.taxi-black', 1], ['vehicle.car', 0], has('buses') ? ['vehicle.bus', 1] : ['vehicle.car-city', 1], ['vehicle.car', 1]];
    cars.forEach(([obj, k], i) => { const y = lane(k), back = k === 1; data.actors.push({ obj, layer: 'near', path: back ? [[1800, y], [-200, y]] : [[-200, y], [1800, y]], speed: 40 + i * 7, loop: 'loop', s: carS(y), seed: 30 + i, offset: (0.11 + i * 0.23) % 1, flip: back, variant: i % 2 }); });
    if (has('cyclists')) data.actors.push({ obj: 'person.cyclist-commuter', layer: 'near', path: [[-120, lane(0) + 10], [1720, lane(0) + 10]], speed: 26, loop: 'loop', s: scenePersonScale(sceneObj('person.cyclist-commuter').size[1], lane(0), data.view), seed: 41, offset: 0.4 });
  }
  if (tram === 'street') data.actors.push({ obj: 'vehicle.metrolink-tram', layer: 'near', path: [[-420, yR - 34], [2020, yR - 34]], speed: 34, loop: 'loop', s: carS(yR - 34) * 1.05, seed: 44, offset: 0.35 });
  if (tram === 'viaduct') data.actors.push({ obj: 'vehicle.metrolink-tram', layer: 'mid', path: [[2000, yL - 214], [-400, yL - 214]], speed: 30, loop: 'loop', s: 0.42, seed: 45, offset: 0.6, flip: true });
  if (wet) {
    const boats = water === 'canal' ? ['boat.narrowboat', 'boat.narrowboat-receding', 'boat.narrowboat'] : ['boat.water-taxi', 'boat.dinghy', 'boat.tug'];
    const lanesW = [yW0 + (yW1 - yW0) * 0.3, yW0 + (yW1 - yW0) * 0.75, yW0 + (yW1 - yW0) * 0.5];
    boats.forEach((obj, i) => { const y = R(lanesW[i]), back = i % 2 === 1; data.actors.push({ obj, layer: 'mid', path: back ? [[1800, y], [-200, y]] : [[-200, y], [1800, y]], speed: water === 'canal' ? 5 + i * 2 : 9 + i * 4, loop: 'loop', s: 1, sByY: [[yW0, 0.32], [yW1, 0.62]], seed: 50 + i, offset: (0.2 + i * 0.31) % 1, flip: back }); });
    data.actors.push({ obj: 'bird.mallard', layer: 'mid', path: [[300, R(yW1 - 12)], [620, R(yW1 - 10)]], speed: 3, loop: 'pingpong', s: 0.42, seed: 54, offset: 0.2 });
    data.actors.push({ obj: water === 'canal' ? 'bird.moorhen' : 'bird.swan', layer: 'mid', path: [[1100, R(yW1 - 16)], [1380, R(yW1 - 14)]], speed: 2.5, loop: 'pingpong', s: 0.42, seed: 55, offset: 0.7 });
  }
  // people: tiny anonymous walkers on the pavement or towpath (at most 6)
  const people = ['person.walker', 'person.commuter', 'person.dog-walker', 'person.walker', 'person.jogger', 'person.family'];
  const nPeople = has('fans') ? 6 : 5;
  for (let i = 0; i < nPeople; i++) {
    const id = has('fans') ? (i % 2 ? 'person.family' : 'person.walker') : people[i], y = yR + 40 + (i % 3) * 14, back = i % 2 === 1;
    data.actors.push({ obj: id, layer: 'near', path: back ? [[1720, y], [-120, y]] : [[-120, y], [1720, y]], speed: 12 + (i % 4) * 3, loop: 'loop', s: scenePersonScale(sceneObj(id).size[1], y, data.view), seed: 60 + i, offset: (i * 0.19 + 0.07) % 1, flip: back });
  }
  // birds: pigeons and gulls over the city
  data.flocks.push({ obj: 'bird.small-flight', n: 6, area: [160, 100, 1440, Math.max(220, H - 140)], speed: 26, s: 0.5, seed: 9, layer: 'far' });
  data.flocks.push({ obj: has('gulls') ? 'bird.herring-gull-flight' : 'bird.small-flight', n: 4, area: [80, 160, 1500, Math.max(300, H - 80)], speed: 20, s: 0.7, seed: 10, layer: 'mid' });
  data.scatter.push({ obj: 'bird.pigeon-feral', layer: 'near', seed: 17, area: { rect: [200, yR + 52, 1400, yR + 70] }, n: 6, minGap: 40, s: [0.7, 1], flip: 0.5, variant: 'random' });
  // the fore: cover by ground type (wind strips), shrubs and planters, leaves in autumn
  const cover = ground === 'square' || ground === 'quay' ? { 'plant.planter': 1, 'plant.grass': 2, 'plant.wildflowers': 1 } : ground === 'towpath' ? { 'plant.grass': 3, 'plant.wildflowers': 1, 'plant.towpath-hedge': 1 } : { 'plant.grass': 3, 'plant.wildflowers': 1 };
  data.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'near', seed: 18, area: { rect: [-150, yR + 46, 1750, yF] }, n: 90, minGap: 16, s: [0.45, 0.75], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: false });
  data.scatter.push({ obj: cover, layer: 'fore', seed: 7, area: { rect: [-150, yF + 2, 1750, yF + 50] }, n: 150, minGap: 15, s: [0.55, 0.9], flip: 0.5, variant: [0, 1], tint: { col: '#6a7a40', k: [0, 0.08] }, anim: 'strip' });
  data.scatter.push({ obj: { 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'fore', seed: 8, area: { rect: [-150, yF + 50, 1750, 905] }, n: 110, minGap: 22, s: [0.9, 1.3], flip: 0.5, variant: [1, 2], tint: { col: '#6a7a40', k: [0.08, 0.16] }, anim: 'strip' });
  data.scatter.push({ obj: { 'plant.shrub': 2, 'plant.hedge': 1 }, layer: 'fore', seed: 19, area: { rect: [-150, yF + 6, 1750, yF + 40] }, n: 9, minGap: 150, s: [0.6, 0.95], flip: 0.5, variant: 'random', anim: false });
  data.scatter.push({ obj: 'ground.leaves', layer: 'fore', seed: 20, area: { rect: [-150, yF + 10, 1750, 900] }, n: 14, minGap: 60, s: [0.7, 1.1], flip: 0.5, variant: 'random', anim: false });
  // the framing trees
  data.place.push({ obj: 'tree.plane', x: 20, y: 910, s: sOf('tree.plane', 500), layer: 'front', seed: 21, variant: 2 }, { obj: 'tree.plane', x: 1600, y: 912, s: sOf('tree.plane', 470), layer: 'front', seed: 22, flip: true, variant: 1 });
  if (has('brick-viaduct')) data.scatter.push({ obj: 'structure.bridge-brick', layer: 'far', seed: 23, area: { rect: [-200, H + 40, 1800, H + 42] }, n: 5, minGap: 380, s: [0.8, 0.9], flip: 0.5, variant: [0, 1], anim: false });
  return data;
}
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  sceneArchetypeDefine('mcr-city', {
    params: { id: 'id', lat: 'number', lon: 'number', heading: 'number', at: typeof SCENE_AT_MOMENTS !== 'undefined' ? SCENE_AT_MOMENTS : 'id', horizon: 'number', landmarks: 'list',
      ground: ['street', 'square', 'towpath', 'quay', 'park'], water: ['none', 'canal', 'quays'], tram: ['none', 'street', 'viaduct'], far: ['mixed', 'brick', 'glass'], features: 'list', palette: 'object' },
    kits: ['urban', 'temperate', 'people', 'birds', 'boats'],
    slots: [{ id: 'landmark', layer: 'mid', x: 800, y: 650, s: 1 }],
    meta: () => null,
    build: (p, u) => sceneArchMcrCity(p, u),
  });
})();

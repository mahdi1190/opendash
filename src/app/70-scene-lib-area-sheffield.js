/* ============================================================
   SCENE LIBRARY: area-sheffield (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.
   Check with: node tools/anim-pack.mjs object lint <id>; look with object sheet <id>.

   Sheffield's own objects, for the composed Sheffield scenes
   (71-scene-uk-sheffield-*.js, pack uk-area-sheffield):
   - landmark.sheffield-arts-tower: the University's Arts Tower (1965), a slim
     curtain-wall slab over a recessed glazed ground floor, with the lower
     Western Bank Library wing beside it.
   - landmark.sheffield-diamond: the Diamond (2015), a long glazed block wrapped
     in a silver anodised aluminium diamond lattice.
   - landmark.sheffield-winter-garden: the Winter Garden (2003), a long
     glasshouse of larch glulam arches, planted inside.
   - landmark.sheffield-kelham: Kelham Island Museum, the red-brick works with its
     chimney, and the Bessemer converter outside.
   - landmark.sheffield-park-hill: Park Hill (1961), the long concrete-framed block
     with its graded infill panels (bright where refurbished, brick elsewhere)
     and the deck-access "streets in the sky".
   - landmark.sheffield-botanical: the three curvilinear glass pavilions of the
     Botanical Gardens (1836) and their stone links.
   - landmark.sheffield-town-hall: the Town Hall (1897) over the Peace Gardens,
     its gabled stone front and clock tower.
   - landmark.endcliffe-bridge: a gritstone arch footbridge over the Porter Brook.
   - vehicle.sheffield-supertram: a three-section articulated tram with its
     pantograph (plain livery colours, no logos).
   - building.sheffield-terrace: a row of red-brick terraced houses with slate
     roofs and chimneys, for the hillside rooftops (weight 0: placed by id only).
   - building.sheffield-works: a brick works / warehouse with a chimney (weight 0).
   Every non-landmark object has weight 0, so no other area's archetype picks it.
   No text, no logos, no figures.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = (n) => Math.round(n * 10) / 10;
  const R = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;

  /* ---------- the Arts Tower ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield-arts-tower', category: 'landmark', size: [400, 400], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      glass: ['#5d7684', '#3f5562', '#93abb6'], span: ['#b9c4c6', '#9aa6aa', '#d6dedf'], mull: ['#dfe6e6'], side: ['#4b5d68', '#7e9099'],
      roof: ['#2e3a40', '#59666c'], pilot: ['#cfd5d2', '#8c9693'], lib: ['#c9c5b6', '#a8a493', '#e1ddd0'], libglass: ['#4d6470', '#86a0ac'],
      flood: ['#ffe4b0'],
    } },
    night: { glow: { window: '#f6d48a', lamp: '#ffe2a0' }, on: 0.62 },
    parts: ['body', 'lit'], shadow: { rx: 190, ry: 16, h: 380 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'university', 'modernism', 'tower', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the Arts Tower, Western Bank)',
    build() {
      const b = [];
      // the Western Bank Library wing (left): four glazed bands over a recessed base
      b.push(['@lib.1', R(-250, -86, 186, 86)], ['@lib.0', R(-252, -88, 190, 6)], ['@lib.2', R(-252, -88, 190, 2)]);
      for (let f = 0; f < 3; f++) for (let k = 0; k < 6; k++) b.push({ f: '@libglass.0', d: R(-246 + k * 30.5, -78 + f * 22, 27, 14), glow: 'window' });
      b.push({ s: '@lib.2', w: .8, op: .7, detail: true, d: Array.from({ length: 7 }, (_, k) => `M${-247 + k * 30.5} -80V-16`).join('') });
      b.push(['#3a4448', R(-246, -14, 182, 14)], ['@pilot.1', R(-246, -14, 182, 2)]);
      for (let k = 0; k < 7; k++) b.push(['@pilot.0', R(-244 + k * 29.5, -14, 4, 14)]);
      // the tower: side face (shade, right), front face (curtain wall)
      b.push(['@side.0', 'M62 -2V-372L98-366V-2z'], ['@roof.0', 'M-64 -372H62L98 -366V-378L62 -384H-64z'], ['@roof.1', 'M-64 -384H62L98 -378L62 -386H-64z']);
      b.push(['@glass.1', R(-62, -372, 124, 350)]);
      // the plant floor at the top, recessed and dark, with its louvres
      b.push(['@roof.0', R(-58, -372, 116, 20)], { s: '@roof.1', w: 1, d: Array.from({ length: 12 }, (_, k) => `M${-54 + k * 9.6} -370V-354`).join('') });
      const fl = 19, fh = (352 - 24) / fl;
      for (let f = 0; f < fl; f++) {
        const y = -352 + f * fh;
        b.push(['@span.' + (f % 3 === 0 ? 2 : 0), R(-62, y, 124, fh * .34)]);
        for (let k = 0; k < 3; k++) b.push({ f: '@glass.' + (k === 1 ? 0 : 1), d: R(-60 + k * 41, y + fh * .36, 39, fh * .6), glow: 'window' });
        b.push({ f: '@side.1', d: `M64 ${f1(y + fh * .38)}L96 ${f1(y + fh * .38 + 1)}V${f1(y + fh * .94)}L64 ${f1(y + fh * .96)}z`, op: .55, glow: 'window' });
      }
      // sky in the glass (lit from the left), the aluminium mullions
      b.push(['@glass.2', 'M-62 -352L-20 -352L-62 -200z', .35], ['@glass.2', 'M-62 -150L-30 -24H-62z', .18]);
      b.push({ s: '@mull', w: 1.1, op: .8, d: Array.from({ length: 14 }, (_, k) => `M${f1(-62 + k * 124 / 13)} -352V-24`).join('') });
      b.push({ s: '@mull', w: 2, d: 'M-62 -352V-24M62 -352V-24' });
      // the recessed glazed ground floor on pilotis
      b.push(['#2c3438', R(-56, -24, 112, 24)], ['@libglass.1', R(-52, -20, 104, 16), .4]);
      for (let k = 0; k < 6; k++) b.push(['@pilot.0', R(-60 + k * 23.4, -24, 4.6, 24)]);
      b.push({ f: '@libglass.1', d: R(-30, -18, 60, 14), glow: 'lamp', op: .8 });
      const lit = [{ f: { rad: [[0, '@flood', .3], [1, '@flood', 0]], cx: 0, cy: -60, r: 200 }, d: 'M-70 0V-390H100V0z' }];
      return { body: b, lit };
    },
  });

  /* ---------- the Diamond ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield-diamond', category: 'landmark', size: [560, 150], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      glass: ['#3f5664', '#5f7a88', '#8fb0bf'], lat: ['#e4e8ea', '#b8c0c4'], frame: ['#7d878c', '#5c666a'], base: ['#2c3438', '#4a5458'],
      roof: ['#6f7a80'], flood: ['#e8f2ff'],
    } },
    night: { glow: { window: '#f4e2b0', lamp: '#fff0c8' }, on: 0.7 },
    parts: ['body', 'lit'], shadow: { rx: 290, ry: 16, h: 150 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'university', 'engineering', 'lattice', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the Diamond, Leavygreave)',
    build() {
      const b = [], W = 540, x0 = -270, top = -142, floors = 5, fh = 25;
      b.push(['@roof', R(x0 - 4, top - 6, W + 8, 7)], ['@frame.1', R(x0, top, W, 142)]);
      // floor plates and the glazing behind the lattice (lit at dusk)
      for (let f = 0; f < floors; f++) {
        const y = top + 4 + f * fh;
        for (let k = 0; k < 15; k++) b.push({ f: '@glass.' + ((k + f) % 3 === 0 ? 1 : 0), d: R(x0 + 3 + k * 36, y, 33, fh - 5), glow: 'window' });
        b.push(['@frame.0', R(x0, y + fh - 5, W, 3)]);
      }
      // the recessed, glazed ground floor and the entrance canopy
      b.push(['@base.0', R(x0 + 6, -17, W - 12, 17)], { f: '@glass.2', d: R(x0 + 12, -15, W - 24, 12), op: .35 });
      b.push({ f: '@glass.2', d: R(-60, -15, 120, 13), glow: 'lamp' }, ['@lat.1', R(-80, -21, 160, 4)]);
      // the diamond lattice: zigzags, two per floor band, in silver
      const z = (y0, h, ph) => { let d = `M${x0} ${y0 + (ph ? h : 0)}`; for (let i = 1; i <= 30; i++) d += `L${x0 + i * 18} ${y0 + ((i + ph) % 2 ? h : 0)}`; return d; };
      for (let r = 0; r < 10; r++) b.push({ s: '@lat.' + (r % 2), w: 2.6, d: z(top + r * 12.5, 12.5, r % 2) });
      b.push({ s: '@lat.0', w: 3.4, d: `M${x0} ${top}H${x0 + W}M${x0} -17H${x0 + W}M${x0} ${top}V-17M${x0 + W} ${top}V-17` });
      // the sky in the cladding, lit from the left
      b.push(['@glass.2', `M${x0} ${top}h160L${x0} -40z`, .25]);
      const lit = [{ f: { rad: [[0, '@flood', .22], [1, '@flood', 0]], cx: 0, cy: -60, r: 320 }, d: `M${x0} 0V${top - 8}H${-x0}V0z` }];
      return { body: b, lit };
    },
  });

  /* ---------- the Winter Garden ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield-winter-garden', category: 'landmark', size: [600, 250], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      glass: ['#7f9eaa', '#5c7c88', '#b6ccd2'], larch: ['#c79a62', '#9c7444', '#e0b880'], plant: ['#2f5a34', '#3f7040', '#5a8a4a'],
      base: ['#8a8070', '#6c6456'], frame: ['#e6e2d6'], flood: ['#fff0c8'],
    } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff0c0' }, on: 0.85 },
    parts: ['body', 'lit'], shadow: { rx: 300, ry: 16, h: 220 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'glasshouse', 'timber', 'plants', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the Winter Garden, Surrey Street)',
    build() {
      const b = [], X = 290, H = 236;
      const roof = (x) => -12 - (H - 12) * Math.max(0, 1 - Math.pow(Math.abs(x) / X, 3.2));
      let d = `M${-X} -12`;
      for (let x = -X; x <= X; x += 10) d += `L${x} ${f1(roof(x))}`;
      b.push(['@glass.1', d + `L${X} -12z`]);
      // planting inside (dark crowns behind the glass)
      const crowns = [[-210, 60], [-140, 120], [-60, 170], [20, 190], [100, 150], [170, 110], [230, 60]];
      for (const [x, h] of crowns) b.push(['@plant.0', ell(x, -12 - h * .45, 44, h * .45), .8], ['@plant.1', ell(x - 8, -18 - h * .55, 28, h * .32), .7]);
      b.push(['@plant.2', ell(-20, -150, 18, 30), .6], ['@plant.2', ell(60, -130, 14, 26), .6]);
      // the glazing between the arches (lit warm at dusk), four tiers
      const bays = 16;
      for (let k = 0; k < bays; k++) {
        const xa = -X + 12 + k * (2 * X - 24) / bays, xb = xa + (2 * X - 24) / bays - 4, xm = (xa + xb) / 2, yt = roof(xm) + 6;
        for (let t = 0; t < 3; t++) {
          const y0 = yt + (-12 - yt) * t / 3, y1 = yt + (-12 - yt) * (t + 1) / 3;
          if (y1 - y0 < 6) continue;
          b.push({ f: '@glass.' + ((k + t) % 2), d: R(xa, y0, xb - xa, y1 - y0 - 1.5), op: .55, glow: 'window' });
        }
      }
      // the larch arches (seen edge on) and the transoms
      for (let k = 0; k <= bays; k++) { const x = -X + 10 + k * (2 * X - 20) / bays, yt = roof(x); b.push(['@larch.' + (k % 2), R(x - 2.5, yt, 5, -12 - yt)], ['@larch.2', R(x - 2.5, yt, 1.4, -12 - yt), .7]); }
      let tr = '';
      for (let t = 1; t < 4; t++) { tr += `M${-X} ${-12 - t * 50}`; for (let x = -X; x <= X; x += 10) { const y = Math.max(roof(x), -12 - t * 50); tr += `L${x} ${f1(y)}`; } }
      b.push({ s: '@frame', w: 1.2, op: .7, d: tr });
      // the roof line (the top rib), sky in the glass, the stone plinth and the doors
      b.push({ s: '@larch.1', w: 4, d });
      b.push(['@glass.2', `M${-X + 30} -40L-120 ${f1(roof(-120))}L-60 ${f1(roof(-60))}L${-X + 80} -40z`, .3]);
      b.push(['@base.0', R(-X - 6, -12, 2 * X + 12, 12)], ['@base.1', R(-X - 6, -3, 2 * X + 12, 3)]);
      b.push({ f: '@glass.2', d: R(-24, -40, 48, 28), glow: 'lamp' }, ['@larch.1', R(-26, -42, 52, 3)]);
      const lit = [{ f: { rad: [[0, '@flood', .3], [1, '@flood', 0]], cx: 0, cy: -80, r: 330 }, d: d + `L${X} 0H${-X}z` }];
      return { body: b, lit };
    },
  });

  /* ---------- Kelham Island Museum and the Bessemer converter ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield-kelham', category: 'landmark', size: [520, 330], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#9a4a34', '#7a3626', '#b66248'], slate: ['#4a4e56', '#3a3e44', '#6a7078'], stone: ['#cbbfa4', '#a89c84'],
      glass: ['#34404a', '#6a7c88'], iron: ['#3a3634', '#2a2624', '#5a524c'], rust: ['#8a4a2a', '#b0683a'], door: ['#2e3a34'], flood: ['#ffd9a0'],
    } },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 0.75 },
    parts: ['body', 'lit'], shadow: { rx: 260, ry: 16, h: 300 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'industry', 'steel', 'museum', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (Kelham Island Museum, Alma Street)',
    build() {
      const b = [];
      // the chimney (right), banded at the top
      b.push(['@brick.1', 'M196 -110L202 -318H226L232 -110z'], ['@brick.2', 'M202 -318H210L206 -110H198z', .6], ['@slate.1', R(198, -326, 32, 10)], ['@stone.0', R(200, -300, 28, 4)]);
      b.push({ s: '@brick.1', w: .8, op: .6, detail: true, d: Array.from({ length: 16 }, (_, i) => `M${f1(198 + i * .3)} ${-130 - i * 11}h${f1(32 - i * .6)}`).join('') });
      // the main works hall: brick gable front with a big arched opening, a long side range
      b.push(['@brick.0', 'M-60 0V-120L40 -176L140 -120V0z'], ['@brick.1', 'M40 -176L140 -120V0H100z', .5]);
      b.push(['@slate.0', 'M-70 -118L40 -182L150 -118L144 -114L40 -172L-64 -114z'], ['@stone.0', 'M28 -150h24v8h-24z']);
      b.push(['@brick.1', 'M140 0V-96H260V0z'], ['@slate.1', 'M134 -94L150 -122H262L270 -94z'], ['@slate.2', 'M150 -122H262L264 -116H150z', .7]);
      b.push({ s: '@brick.1', w: .8, op: .5, detail: true, d: Array.from({ length: 12 }, (_, i) => `M-60 ${-8 - i * 9}H140`).join('') + Array.from({ length: 9 }, (_, i) => `M140 ${-8 - i * 9}H260`).join('') });
      // the arched doorway and its stone voussoirs
      b.push(['@stone.1', 'M10 0V-62Q40 -96 70 -62V0z'], ['@door', 'M16 0V-60Q40 -88 64 -60V0z'], { f: '@glass.1', d: 'M20 -62Q40 -84 60 -62z', glow: 'lamp' });
      // arched windows, two rows on the gable and one along the range
      const arch = (x, y, w, h) => {
        b.push(['@stone.0', `M${x - 2} ${y + h + 2}V${y + w * .5}Q${x + w / 2} ${y - w * .5} ${x + w + 2} ${y + w * .5}V${y + h + 2}z`]);
        b.push({ f: '@glass.0', d: `M${x} ${y + h}V${y + w * .5}Q${x + w / 2} ${y - w * .3} ${x + w} ${y + w * .5}V${y + h}z`, glow: 'window' });
        b.push({ s: '@stone.1', w: .7, detail: true, d: `M${x + w / 2} ${y + w * .1}V${y + h}M${x} ${y + h * .55}h${w}` });
      };
      for (const x of [-46, -18, 82, 110]) arch(x, -104, 16, 34);
      for (const x of [-46, 110]) arch(x, -56, 16, 32);
      for (let k = 0; k < 4; k++) arch(150 + k * 27, -76, 15, 40);
      b.push(['@stone.0', R(-62, -4, 204, 4)], ['@stone.0', R(140, -4, 120, 4)]);
      // the Bessemer converter on its trunnions (left), tilted
      b.push(['@iron.0', 'M-232 0L-214 -70H-206L-190 0z'], ['@iron.0', 'M-148 0L-132 -70H-124L-106 0z'], ['@iron.1', R(-240, -4, 142, 4)]);
      b.push({ f: '@iron.0', m: [Math.cos(-.35), Math.sin(-.35), -Math.sin(-.35), Math.cos(-.35), -169, -86], d: 'M-34 30Q-40 -30 -16 -62L-12 -78H12L16 -62Q40 -30 34 30Q0 48 -34 30z' });
      b.push({ f: '@rust.0', m: [Math.cos(-.35), Math.sin(-.35), -Math.sin(-.35), Math.cos(-.35), -169, -86], d: 'M-26 26Q-32 -26 -12 -56L18 -50Q30 -30 26 26Q0 36 -26 26z', op: .55 });
      b.push({ f: '@iron.2', m: [Math.cos(-.35), Math.sin(-.35), -Math.sin(-.35), Math.cos(-.35), -169, -86], d: 'M-32 -4H32V4H-32zM-34 16H34V22H-34z' });
      b.push({ f: '@rust.1', m: [Math.cos(-.35), Math.sin(-.35), -Math.sin(-.35), Math.cos(-.35), -169, -86], d: 'M-20 -40Q-26 -10 -24 20', op: .4, s: '@rust.1', w: 3 });
      b.push(['@iron.2', ell(-169, -86, 9, 9)], ['@iron.1', ell(-169, -86, 4, 4)], ['@iron.1', R(-214, -90, 90, 5)]);
      // the riverside wall in front and two lamps
      b.push(['@stone.1', R(-260, -2, 540, 6)]);
      // brick pilasters on the gable and the range, a hoist beam, the railing along the river wall
      for (const x of [-60, 136, 140, 200, 256]) b.push(['@brick.2', R(x, -94, 4, 94), .55]);
      b.push(['@iron.0', R(36, -150, 22, 4)], ['@iron.1', R(54, -150, 2, 20)]);
      for (let k = 0; k < 18; k++) b.push(['@iron.0', R(-256 + k * 30, -22, 2, 20)]);
      b.push({ s: '@iron.0', w: 1.6, d: 'M-256 -22H272M-256 -12H272' });
      for (const x of [-80, 170]) b.push(['@iron.0', R(x - 1.5, -60, 3, 58)], ['@iron.0', R(x - 5, -68, 10, 8)], { f: '#fff0c0', d: R(x - 3.5, -66, 7, 5), glow: 'lamp' });
      const lit = [{ f: { rad: [[0, '@flood', .3], [1, '@flood', 0]], cx: 40, cy: -60, r: 260 }, d: 'M-260 0V-190H270V0z' }];
      return { body: b, lit };
    },
  });

  /* ---------- Park Hill ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield-park-hill', category: 'landmark', size: [760, 250], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      conc: ['#c9c6bc', '#a8a59c', '#e0ded6'], deck: ['#55585a', '#3e4244'],
      bright: ['#d2452e', '#e8762a', '#f0a530', '#e8c838', '#9cc046'], brick: ['#6e3a2c', '#8a4a34', '#a8664a', '#c4906a', '#d8b48e'],
      glass: ['#3a4650', '#6a7c88'], flood: ['#ffe4b8'],
    } },
    night: { glow: { window: '#f6d48a', lamp: '#ffe8b0' }, on: 0.6 },
    parts: ['body', 'lit'], shadow: { rx: 380, ry: 18, h: 240 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'brutalism', 'housing', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (Park Hill, above the station)',
    build() {
      const b = [], x0 = -370, W = 740, floors = 10, fh = 22, bays = 26, bw = W / bays, top = -floors * fh - 6;
      const foot = () => 0;
      b.push(['@conc.1', R(x0, top, W, -top)]);
      b.push(['@conc.2', R(x0 - 4, top - 4, W + 8, 6)]);
      for (let f = 0; f < floors; f++) {
        const y = top + 6 + f * fh, deck = f % 3 === 1;
        if (deck) { b.push(['@deck.0', R(x0, y, W, fh - 4)], ['@deck.1', R(x0, y + fh - 7, W, 3)]); continue; }
        for (let k = 0; k < bays; k++) {
          const x = x0 + k * bw;
          if (y + fh > foot(x + bw / 2) + 1) continue;
          const refurb = k >= 12, ci = Math.min(4, Math.floor((floors - 1 - f) / 2));
          b.push({ f: refurb ? '@bright.' + ci : '@brick.' + ci, d: R(x + 2, y + 1, bw * .5, fh - 6) });
          b.push({ f: '@glass.' + (k % 3 === 0 ? 1 : 0), d: R(x + 2 + bw * .52, y + 2, bw * .4, fh - 8), glow: 'window' });
        }
      }
      // the concrete frame: columns and floor edges
      b.push({ s: '@conc.0', w: 2.2, d: Array.from({ length: bays + 1 }, (_, k) => `M${f1(x0 + k * bw)} ${top}V0`).join('') + Array.from({ length: floors }, (_, f) => `M${x0} ${top + 6 + f * fh}H${x0 + W}`).join('') });
      b.push(['@conc.2', `M${x0} ${top}h60L${x0} ${top + 120}z`, .25]);
      const lit = [{ f: { rad: [[0, '@flood', .2], [1, '@flood', 0]], cx: 100, cy: -110, r: 420 }, d: `M${x0} 0V${top - 6}H${x0 + W}V0z` }];
      return { body: b, lit };
    },
  });

  /* ---------- the Botanical Gardens pavilions ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield-botanical', category: 'landmark', size: [640, 200], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      glass: ['#9ab4ba', '#7898a2', '#c8dadc'], bar: ['#f0eee6', '#cfccc2'], stone: ['#d8ccb0', '#b8ac90', '#ece2c8'],
      plant: ['#2f5a34', '#4a7a3e', '#6a9a50'], roof: ['#8a9a9c'], door: ['#4a3a2e'], flood: ['#fff0d0'],
    } },
    night: { glow: { window: '#ffe2a8', lamp: '#fff0c8' }, on: 0.7 },
    parts: ['body', 'lit'], shadow: { rx: 320, ry: 14, h: 180 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'glasshouse', 'garden', 'victorian', 'kit:temperate'],
    credit: 'drawn for the Sheffield area scenes (the Botanical Gardens pavilions, Clarkehouse Road)',
    build() {
      const b = [];
      const pav = (cx, w, h, wall) => {
        const x0 = cx - w / 2, yw = -wall;
        // the curved glass roof (an ogee-ish dome in elevation), the glazed wall, ribs
        const dome = `M${x0} ${yw}C${x0} ${yw - h * .7} ${cx - w * .18} ${yw - h} ${cx} ${yw - h}C${cx + w * .18} ${yw - h} ${x0 + w} ${yw - h * .7} ${x0 + w} ${yw}z`;
        b.push(['@glass.1', dome], ['@glass.2', `M${x0 + 8} ${yw}C${x0 + 8} ${yw - h * .6} ${cx - w * .2} ${yw - h * .9} ${cx - 6} ${yw - h * .95}L${cx - 20} ${yw}z`, .35]);
        for (let k = 0; k < 6; k++) b.push(['@plant.' + (k % 3), ell(x0 + w * (k + .5) / 6, yw + 2, w / 10, 10 + (k % 2) * 8), .55]);
        const n = Math.round(w / 22);
        for (let k = 0; k < n; k++) b.push({ f: '@glass.' + (k % 2), d: R(x0 + 3 + k * (w - 6) / n, yw + 2, (w - 6) / n - 3, wall - 10), op: .8, glow: 'window' });
        let ribs = '';
        for (let k = 1; k < 8; k++) { const t = k / 8, x = x0 + w * t; const yy = yw - h * Math.sqrt(1 - Math.pow(2 * t - 1, 2)) * .98; ribs += `M${f1(x)} ${yw}Q${f1(x + (cx - x) * .25)} ${f1(yy + 10)} ${cx} ${yw - h}`; }
        b.push({ s: '@bar.0', w: 1.2, op: .85, d: ribs }, { s: '@bar.1', w: 1, op: .7, detail: true, d: `M${x0} ${yw - h * .35}Q${cx} ${yw - h * .62} ${x0 + w} ${yw - h * .35}M${x0 + w * .1} ${yw - h * .66}Q${cx} ${yw - h * .9} ${x0 + w * .9} ${yw - h * .66}` });
        b.push({ s: '@bar.0', w: 1.6, d: dome }, ['@stone.0', R(x0 - 3, -8, w + 6, 8)], ['@stone.1', R(x0 - 3, yw, w + 6, 3)], ['@stone.2', R(cx - 4, yw - h - 6, 8, 6)]);
      };
      // the stone linking ranges with their columns (classical fronts)
      for (const s of [-1, 1]) {
        const xa = s < 0 ? -230 : 80, w = 150;
        b.push(['@stone.0', R(xa, -60, w, 60)], ['@stone.2', R(xa - 3, -66, w + 6, 6)], ['@stone.1', R(xa, -8, w, 8)]);
        for (let k = 0; k < 7; k++) { const x = xa + 8 + k * 21.5; b.push(['@stone.2', R(x, -58, 6, 50)], { f: '@glass.0', d: R(x + 7, -52, 13, 38), op: .9, glow: 'window' }); }
      }
      pav(-280, 120, 70, 50); pav(0, 170, 110, 60); pav(280, 120, 70, 50);
      b.push(['@door', 'M-12 0V-26Q0 -36 12 -26V0z'], { f: '@glass.2', d: 'M-8 -26Q0 -32 8 -26z', glow: 'lamp' });
      const lit = [{ f: { rad: [[0, '@flood', .25], [1, '@flood', 0]], cx: 0, cy: -60, r: 330 }, d: 'M-350 0V-190H350V0z' }];
      return { body: b, lit };
    },
  });

  /* ---------- the Town Hall ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield-town-hall', category: 'landmark', size: [560, 380], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#d4c8a8', '#b4a684', '#e8dec2'], shade: ['#9e9070'], roof: ['#5a6066', '#454a50', '#727a80'],
      glass: ['#3c4650', '#6c7c88'], clock: ['#2c3448', '#d8b84a'], door: ['#3a2e26'], copper: ['#6a9a8a', '#4a7a6a'], flood: ['#ffe2a8'],
    } },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 0.7 },
    parts: ['body', 'lit'], shadow: { rx: 280, ry: 16, h: 360 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'civic', 'victorian', 'clock tower', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the Town Hall over the Peace Gardens)',
    build() {
      const b = [];
      // the long front: two storeys and an attic under a steep slate roof, three gables
      b.push(['@roof.0', 'M-270 -120L-250 -150H150L170 -120z'], ['@roof.2', 'M-250 -150H150L148 -146H-248z', .7]);
      b.push(['@stone.0', R(-270, -122, 440, 122)], ['@shade', R(-270, -8, 440, 8)], ['@stone.2', R(-272, -124, 444, 5)], ['@stone.2', R(-270, -64, 440, 3)]);
      for (const gx of [-220, -80, 60]) b.push(['@stone.0', `M${gx - 36} -122V-150L${gx} -184L${gx + 36} -150V-122z`], ['@stone.2', `M${gx - 40} -148L${gx} -188L${gx + 40} -148L${gx + 36} -146L${gx} -180L${gx - 36} -146z`], { f: '@glass.0', d: `M${gx - 10} -128V-150Q${gx} -164 ${gx + 10} -150V-128z`, glow: 'window' });
      // mullioned windows, two storeys
      for (let k = 0; k < 13; k++) {
        const x = -262 + k * 33.5;
        if (k === 6) continue;
        for (const [y, h] of [[-112, 40], [-56, 40]]) {
          b.push(['@stone.1', R(x - 2, y - 2, 22, h + 4)], { f: '@glass.' + (k % 2), d: R(x, y, 18, h), glow: 'window' });
          b.push({ s: '@stone.2', w: 1, detail: true, d: `M${x + 9} ${y}v${h}M${x} ${y + h * .38}h18` });
        }
      }
      // the entrance porch with its arch
      b.push(['@stone.2', R(-76, -70, 52, 70)], ['@door', 'M-64 0V-40Q-50 -60 -36 -40V0z'], { f: '@glass.1', d: 'M-60 -42Q-50 -54 -40 -42z', glow: 'lamp' });
      // the clock tower (right): stages, the clock faces, the belfry, the spirelet
      const tx = 130;
      b.push(['@stone.0', R(tx - 26, -300, 52, 300)], ['@shade', R(tx + 10, -300, 16, 300)], ['@stone.2', R(tx - 29, -232, 58, 5)], ['@stone.2', R(tx - 29, -170, 58, 5)]);
      for (const y of [-160, -216]) b.push({ f: '@glass.0', d: R(tx - 8, y, 16, 40), glow: 'window' }, ['@stone.1', R(tx - 8, y + 18, 16, 2)]);
      b.push(['@clock.0', ell(tx, -262, 15, 15)], ['@stone.2', ell(tx, -262, 12, 12)], { f: '@glass.1', d: ell(tx, -262, 10.5, 10.5), glow: 'lamp' }, { s: '@clock.0', w: 1.4, cap: 'round', d: `M${tx} -262V-270M${tx} -262h6` });
      b.push(['@stone.0', R(tx - 20, -330, 40, 30)], ['@stone.2', R(tx - 24, -302, 48, 4)]);
      for (const x of [-14, -2, 10]) b.push({ f: '@glass.0', d: `M${tx + x} -306V-322Q${tx + x + 2} -326 ${tx + x + 4} -322V-306z`, glow: 'window' });
      b.push(['@copper.0', `M${tx - 22} -330L${tx} -358L${tx + 22} -330z`], ['@copper.1', `M${tx} -358L${tx + 22} -330H${tx + 6}z`], ['@roof.1', R(tx - 1.2, -376, 2.4, 20)], ['@roof.1', ell(tx, -378, 3, 3)]);
      // corner pinnacles
      for (const x of [tx - 24, tx + 24]) b.push(['@stone.2', `M${x - 4} -330V-340L${x} -350L${x + 4} -340V-330z`]);
      b.push(['@stone.2', 'M-270 -124L-60 -124L-270 -40z', .2]);
      const lit = [{ f: { rad: [[0, '@flood', .3], [1, '@flood', 0]], cx: 60, cy: -120, r: 320 }, d: 'M-280 0V-390H180V0z' }];
      return { body: b, lit };
    },
  });

  /* ---------- a gritstone footbridge over the Porter Brook (Endcliffe Park) ---------- */
  sceneObjDefine({
    id: 'landmark.endcliffe-bridge', category: 'landmark', size: [360, 140], variants: 1, seasonal: false, flippable: false,
    palette: {
      base: { stone: ['#9a8e74', '#7a6e58', '#b8ac90'], dark: ['#4a4436', '#2e2a22'], moss: ['#5a7a3a', '#6e8e44'], iron: ['#2a2e30'], lamp: ['#fff0c0'], flood: ['#ffe2a8'] },
    },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 1 },
    parts: ['body', 'lit'], shadow: { rx: 170, ry: 12, h: 90 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'park', 'bridge', 'gritstone', 'kit:temperate'],
    credit: 'drawn for the Sheffield area scenes (Endcliffe Park)',
    build() {
      const b = [];
      b.push(['@stone.0', 'M-180 0V-60Q-90 -84 0 -88Q90 -84 180 -60V0H120Q110 -50 0 -54Q-110 -50 -120 0z']);
      b.push(['@dark.0', 'M-112 0Q-104 -44 0 -48Q104 -44 112 0z'], ['@dark.1', 'M-90 0Q-80 -34 0 -38Q80 -34 90 0z', .6]);
      // the voussoirs round the arch
      for (let k = 0; k <= 14; k++) { const a = Math.PI * k / 14, x = -116 * Math.cos(a), y = -52 * Math.sin(a); b.push({ f: '@stone.' + (k % 2 ? 2 : 1), d: `M${f1(x)} ${f1(y)}L${f1(x * 1.12)} ${f1(y * 1.18 - 6)}L${f1(-118 * Math.cos(a + .2) * 1.12)} ${f1(-52 * Math.sin(a + .2) * 1.18 - 6)}L${f1(-116 * Math.cos(a + .2))} ${f1(-52 * Math.sin(a + .2))}z` }); }
      // coursed gritstone: blocks on the spandrels
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) for (const s of [-1, 1]) {
        const x = s * (130 + k * 9), y = -12 - r * 12;
        if (y < -58 + Math.abs(k) * 0) b.push({ f: '@stone.' + ((r + k) % 3), d: R(Math.min(x, x + s * 8), y, 8, 10), op: .9, detail: true });
        else b.push({ f: '@stone.' + ((r + k) % 3), d: R(Math.min(x, x + s * 8), y, 8, 10), op: .9 });
      }
      // the parapet with its coping, moss on the stone
      b.push(['@stone.2', 'M-186 -60Q-90 -86 0 -90Q90 -86 186 -60V-72Q90 -100 0 -104Q-90 -100 -186 -72z'], ['@stone.1', 'M-190 -72Q-90 -100 0 -104Q90 -100 190 -72V-78Q90 -106 0 -110Q-90 -106 -190 -78z']);
      for (const [x, y] of [[-150, -66], [-60, -88], [70, -88], [150, -66], [-130, -10], [140, -14]]) b.push(['@moss.' + (x > 0 ? 1 : 0), ell(x, y, 14, 4), .8]);
      // two cast-iron lamps on the parapet ends
      for (const x of [-176, 176]) b.push(['@iron', R(x - 2, -132, 4, 56)], ['@iron', `M${x - 8} -132h16l-3 -12h-10z`], { f: '@lamp', d: R(x - 5, -142, 10, 8), glow: 'lamp' }, ['@iron', R(x - 6, -80, 12, 4)]);
      const lit = [{ f: { rad: [[0, '@flood', .35], [1, '@flood', 0]], cx: -176, cy: -138, r: 70 }, d: 'M-250 -60V-210H-100V-60z' }, { f: { rad: [[0, '@flood', .35], [1, '@flood', 0]], cx: 176, cy: -138, r: 70 }, d: 'M100 -60V-210H250V-60z' }];
      return { body: b, lit };
    },
  });

  /* ---------- the Supertram ---------- */
  sceneObjDefine({
    id: 'vehicle.sheffield-supertram', category: 'vehicle', size: [340, 86], variants: 1, seasonal: false, flippable: true, weight: 0,
    palette: { base: { body: ['#2c4f8a', '#1f3a66', '#4a6ea8'], band: ['#e8762a', '#c8402e'], roof: ['#d8dcdc', '#a8acae'], glass: ['#2a3440', '#6a8090'], dark: ['#1a1c1e', '#3a3e42'], pant: ['#4a4e52'] } },
    night: { glow: { window: '#fff0c8', lamp: '#ffffff' }, on: 1 },
    parts: ['body'], anim: { bob: { part: '*', dy: .6, period: 1.1 } }, shadow: { rx: 170, ry: 8, h: 60 }, reflect: false,
    tags: ['uk', 'sheffield', 'tram', 'light rail', 'kit:urban', 'kit:vehicles', 'role:vehicle'],
    credit: 'drawn for the Sheffield area scenes (a Supertram, plain livery)',
    build() {
      const b = [], secs = [[-168, -60], [-56, 56], [60, 168]];
      for (const [a, z] of secs) {
        b.push(['@body.0', `M${a} -10V-52Q${a} -58 ${a + 6} -58H${z - 6}Q${z} -58 ${z} -52V-10z`], ['@roof.0', R(a + 2, -62, z - a - 4, 5)], ['@band.0', R(a, -22, z - a, 6)], ['@band.1', R(a, -16, z - a, 3)]);
        const n = Math.round((z - a) / 22);
        for (let k = 0; k < n; k++) b.push({ f: '@glass.' + (k % 2), d: R(a + 4 + k * (z - a - 8) / n, -50, (z - a - 8) / n - 3, 22), glow: 'window' });
        b.push(['@dark.0', R(a + 10, -12, 26, 10)], ['@dark.0', R(z - 36, -12, 26, 10)], ['@dark.1', ell(a + 16, -3, 5, 5)], ['@dark.1', ell(a + 30, -3, 5, 5)], ['@dark.1', ell(z - 30, -3, 5, 5)], ['@dark.1', ell(z - 16, -3, 5, 5)]);
        b.push(['@body.2', R(a + 2, -56, z - a - 4, 3), .6]);
      }
      // the articulations, the cab ends, the doors, lamps
      b.push(['@dark.1', R(-60, -54, 4, 44)], ['@dark.1', R(56, -54, 4, 44)]);
      b.push(['@body.1', 'M-168 -10V-48Q-176 -46 -178 -30V-10z'], ['@glass.1', 'M-168 -48Q-176 -46 -177 -30H-168z'], ['@body.1', 'M168 -10V-48Q176 -46 178 -30V-10z'], ['@glass.1', 'M168 -48Q176 -46 177 -30H168z']);
      for (const x of [-120, -10, 100]) b.push(['@body.1', R(x, -50, 18, 36), .6], ['@roof.1', R(x + 8.6, -50, .8, 36)]);
      b.push({ f: '#fff8e0', d: R(-178, -22, 4, 4), glow: 'lamp' }, { f: '#ff6040', d: R(174, -22, 4, 4), glow: 'lamp' });
      // the pantograph on the middle section
      b.push({ s: '@pant', w: 1.8, d: 'M-14 -62L6 -80L-4 -86M14 -62L6 -80' }, ['@pant', R(-16, -88, 24, 2.4)]);
      return { body: b };
    },
  });

  /* ---------- the hillside terraces ---------- */
  sceneObjDefine({
    id: 'building.sheffield-terrace', category: 'building', size: [300, 70], variants: 3, seasonal: false, flippable: true, weight: 0,
    palette: { base: { brick: ['#8a4a36', '#a05a40', '#7a4232'], slate: ['#4a4e56', '#5a5e66', '#3e4248'], stone: ['#d4c8ac'], glass: ['#2e3640', '#6a7a86'], door: ['#3a4a3a', '#5a2a24', '#2a3a5a'] } },
    night: { glow: { window: '#f4c674' }, on: 0.55 },
    parts: ['body'], shadow: { rx: 150, ry: 8, h: 60 }, reflect: false,
    tags: ['uk', 'sheffield', 'terrace', 'brick', 'row', 'kit:temperate', 'kit:urban', 'role:building-far'],
    credit: 'drawn for the Sheffield area scenes (red-brick terraces on the hills)',
    build(v) {
      const b = [], n = 6 + v, w = 300 / n, x0 = -150;
      b.push(['@brick.' + v, R(x0, -44, 300, 44)], ['@slate.' + v, `M${x0 - 3} -43L${x0 + 8} -62H${-x0 - 8}L${-x0 + 3} -43z`], ['@slate.2', `M${x0 + 8} -62H${-x0 - 8}L${-x0 - 6} -59H${x0 + 6}z`, .7]);
      for (let k = 0; k < n; k++) {
        const x = x0 + k * w;
        b.push({ f: '@glass.0', d: R(x + w * .15, -38, w * .26, 12), glow: 'window' }, { f: '@glass.' + (k % 2), d: R(x + w * .6, -38, w * .26, 12), glow: 'window' });
        b.push({ f: '@glass.0', d: R(x + w * .15, -20, w * .26, 12), glow: 'window' }, ['@door.' + ((k + v) % 3), R(x + w * .62, -20, w * .2, 20)]);
        b.push(['@stone', R(x + w * .13, -39.5, w * .3, 1.5)], ['@stone', R(x + w * .13, -21.5, w * .3, 1.5)]);
        if (k % 2 === 0) b.push(['@brick.2', R(x + w - 5, -70, 10, 10)], ['#8a5040', R(x + w - 4, -73, 3, 3)], ['#8a5040', R(x + w + 1, -73, 3, 3)]);
      }
      b.push({ s: '@brick.2', w: .8, op: .5, d: Array.from({ length: n - 1 }, (_, k) => `M${f1(x0 + (k + 1) * w)} -44V0`).join('') });
      return { body: b };
    },
  });

  /* ---------- a brick works ---------- */
  sceneObjDefine({
    id: 'building.sheffield-works', category: 'building', size: [260, 200], variants: 2, seasonal: false, flippable: true, weight: 0,
    palette: { base: { brick: ['#8e4632', '#6e3426', '#a85a40'], slate: ['#4a4e56', '#3a3e44'], stone: ['#cbbfa4'], glass: ['#34404a', '#6a7c88'] } },
    night: { glow: { window: '#f4c674' }, on: 0.6 },
    parts: ['body'], shadow: { rx: 130, ry: 10, h: 120 }, reflect: true,
    tags: ['uk', 'sheffield', 'industry', 'brick', 'works', 'kit:temperate', 'kit:urban', 'role:building-mid'],
    credit: 'drawn for the Sheffield area scenes (the brick works of Kelham Island and the Don valley)',
    build(v) {
      const b = [], h = v ? 70 : 92;
      b.push(['@brick.0', R(-130, -h, 210, h)], ['@slate.0', `M-136 ${-h}L-120 ${-h - 22}H70L86 ${-h}z`], ['@brick.1', R(-130, -6, 210, 6)]);
      for (let r = 0; r < (v ? 2 : 3); r++) for (let k = 0; k < 7; k++) {
        const x = -122 + k * 28, y = -h + 10 + r * 28;
        b.push(['@stone', `M${x - 1} ${y + 19}V${y + 4}Q${x + 7} ${y - 3} ${x + 15} ${y + 4}V${y + 19}z`], { f: '@glass.' + ((k + r) % 2), d: `M${x} ${y + 18}V${y + 5}Q${x + 7} ${y - 1} ${x + 14} ${y + 5}V${y + 18}z`, glow: 'window' });
      }
      b.push({ s: '@brick.1', w: .7, op: .5, detail: true, d: Array.from({ length: 8 }, (_, i) => `M-130 ${-10 - i * 10}H80`).join('') });
      const cx = v ? 100 : 104, ch = v ? 170 : 200;
      b.push(['@brick.1', `M${cx - 12} 0L${cx - 8} ${-ch}H${cx + 8}L${cx + 12} 0z`], ['@brick.2', `M${cx - 8} ${-ch}H${cx - 3}L${cx - 6} 0H${cx - 12}z`, .6], ['@slate.1', R(cx - 10, -ch - 6, 20, 7)]);
      return { body: b };
    },
  });
})();

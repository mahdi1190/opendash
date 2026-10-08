/* ============================================================
   SCENE LIBRARY: area-sheffield2 (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.
   Check with: node tools/anim-pack.mjs object lint <id>; look with object sheet <id>.

   More of Sheffield, for the second set of composed Sheffield scenes
   (71-scene-uk-sheffield2-*.js, pack uk-area-sheffield2):
   - landmark.sheffield2-crucible: the Crucible Theatre (1971), its faceted ribbed
     upper storey over the glazed foyer, on Tudor Square.
   - landmark.sheffield2-lyceum: the Lyceum Theatre (1897), cream stone front, the
     corner tower and its copper dome and lantern.
   - landmark.sheffield2-moor-market: the Moor Market (2013), the long glazed hall
     under its wave roof and deep canopy.
   - landmark.sheffield2-station: Sheffield station, the long stone arcade of round
     arches with the balustraded pavilions and the train shed behind.
   - landmark.sheffield2-cutting-edge: the steel wall sculpture on Sheaf Square with
     water running down its face and the stepped pools below.
   - landmark.sheffield2-weston-museum: Weston Park Museum and the Mappin gallery
     front, the Ionic colonnade in stone.
   - landmark.sheffield2-meadowhall: the shopping centre, its green glass domes and
     the cream and terracotta arcades.
   - landmark.sheffield2-cemetery-gate: the Egyptian gate of the General Cemetery
     (1836), the battered pylons, lotus columns and the deep cornice.
   - landmark.sheffield2-abbeydale: Abbeydale Industrial Hamlet, the stone works,
     the crucible furnace stack, the tilt-forge and its turning water wheel.
   - landmark.sheffield2-hillsborough-house: the Georgian house in Hillsborough Park.
   - landmark.sheffield2-forge-dam: the stone cafe and the dam spillway at Forge Dam.
   - landmark.sheffield2-rivelin-dam: a Rivelin mill dam head: the gritstone wall,
     the sluice, the wheel-pit ruin and a little footbridge.
   - landmark.sheffield2-wardsend: the old sexton's house above Wardsend Cemetery.
   - building.sheffield2-shoprow (4): a row of Victorian shops with awnings and
     upper windows (Division Street, Ecclesall Road, Sharrow Vale, West Street).
   - building.sheffield2-pub (3): a corner pub, tiled ground floor, big windows,
     a lamp over the door and hanging baskets. No names, no signs.
   - structure.sheffield2-weir: a stepped stone weir with white water.
   - structure.sheffield2-headstones (3): old gritstone headstones, leaning.
   Every non-landmark object has weight 0, so no other area's archetype picks it.
   No text, no logos, no crests, no figures. Lit from the LEFT.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = (n) => Math.round(n * 10) / 10;
  const R = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const P = (pts) => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const arch = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w / 2)}A${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(x + w)} ${f1(y + w / 2)}V${f1(y + h)}z`;
  const wash = (cx, cy, r, d, op) => ({ f: { rad: [[0, '@flood', op], [1, '@flood', 0]], cx, cy, r }, d });
  const lines = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
  const NIGHT = { glow: { window: '#f6d48a', lamp: '#ffe6a8' }, on: 0.7 };

  /* ---------- the Crucible Theatre ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-crucible', category: 'landmark', size: [540, 200], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      clad: ['#6a5a50', '#54463e', '#86766a'], rib: ['#4a3e36', '#9a8a7c'], glass: ['#33404a', '#5d7684', '#a8bcc6'], base: ['#2a2e32', '#44494e'],
      roof: ['#5a5e62', '#3e4246'], stone: ['#c8c2b4', '#a8a294'], red: ['#b4332c'], flood: ['#ffe2b0'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 270, ry: 14, h: 190 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'theatre', 'modernism', 'tudor-square', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the Crucible Theatre, Tudor Square)',
    build() {
      const b = [];
      // the stage house behind, stepped
      b.push(['@roof.1', R(-150, -196, 220, 40)], ['@roof.0', R(-150, -198, 220, 4)], ['@clad.1', R(70, -176, 90, 24)]);
      b.push({ s: '@rib.0', w: 1, op: .6, d: lines(22, i => `M${-146 + i * 10} -192V-158`) });
      // the faceted upper storey: left face, front, right face, overhanging the foyer
      const top = -158, low = -70;
      b.push(['@clad.2', P([[-268, low], [-230, top], [-150, top], [-170, low]])]);
      b.push(['@clad.0', P([[-170, low], [-150, top], [150, top], [170, low]])]);
      b.push(['@clad.1', P([[170, low], [150, top], [230, top], [268, low]])]);
      b.push(['@roof.0', P([[-232, top - 2], [232, top - 2], [230, top + 4], [-230, top + 4]])]);
      // the vertical ribs, computed along each sloped face
      for (let i = 0; i <= 30; i++) { const t = i / 30, xb = -170 + t * 340, xt = -150 + t * 300; b.push({ s: i % 5 ? '@rib.0' : '@rib.1', w: i % 5 ? 1.1 : 1.8, op: .8, d: `M${f1(xt)} ${top + 4}L${f1(xb)} ${low}` }); }
      for (let i = 0; i <= 7; i++) { const t = i / 7; b.push({ s: '@rib.0', w: 1, op: .7, d: `M${f1(-230 + t * 80)} ${top + 4}L${f1(-268 + t * 98)} ${low}M${f1(230 - t * 80)} ${top + 4}L${f1(268 - t * 98)} ${low}` }); }
      // a slit of glazing near the top of the front face (lit at night)
      for (let k = 0; k < 8; k++) b.push({ f: '@glass.0', d: R(-128 + k * 33, top + 12, 24, 7), glow: 'window' });
      b.push(['@base.0', P([[-268, low], [268, low], [262, low + 6], [-262, low + 6]])]);
      // the glazed foyer, recessed, with mullions, wrapping round
      b.push(['@base.0', R(-246, low + 6, 492, 64)]);
      for (let k = 0; k < 20; k++) b.push({ f: '@glass.' + (k % 4 === 1 ? 2 : 1), d: R(-240 + k * 24, low + 10, 21, 54), glow: k % 3 ? 'window' : 'lamp' });
      b.push({ s: '@stone.0', w: 1.4, d: `M-246 ${low + 36}H246` });
      b.push(['@glass.2', 'M-240 -60L-170 -60L-240 -6z', .22]);
      // the entrance canopy and steps, a red accent band (no lettering)
      b.push(['@base.1', R(-90, low + 2, 180, 6)], ['@red', R(-60, low - 8, 120, 6)]);
      b.push(['@stone.0', R(-260, -6, 520, 6)], ['@stone.1', R(-110, -3, 220, 3)]);
      for (let k = 0; k < 6; k++) b.push(['@stone.1', R(-250 + k * 100, -70, 3, 70), .7]);
      const lit = [wash(0, -120, 320, 'M-280 0V-210H280V0z', .26), { f: '@red', d: R(-60, low - 8, 120, 6), op: .9 }];
      return { body: b, lit };
    },
  });

  /* ---------- the Lyceum Theatre ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-lyceum', category: 'landmark', size: [380, 320], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#e2d6bc', '#c8b898', '#f2ead6'], shade: ['#b0a080', '#968666'], dome: ['#6a9a88', '#4a7a6a', '#9cc4b2'], lead: ['#4a5258'],
      glass: ['#34404a', '#6a7c88', '#b8c8d0'], door: ['#3a2a24'], gold: ['#d8b860'], canopy: ['#2e3438', '#5a6268'], flood: ['#ffe6b8'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 190, ry: 14, h: 300 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'theatre', 'victorian', 'dome', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the Lyceum Theatre, Tudor Square)',
    build() {
      const b = [];
      // the main front (right of the tower)
      b.push(['@stone.0', R(-60, -190, 240, 190)], ['@shade.0', R(150, -190, 30, 190), .45]);
      b.push(['@stone.2', R(-64, -198, 248, 8)], ['@shade.1', R(-64, -192, 248, 3)], ['@stone.1', R(-60, -78, 240, 6)]);
      // the balustrade
      for (let k = 0; k < 24; k++) b.push(['@stone.1', R(-56 + k * 10, -210, 5, 12)]);
      b.push(['@stone.2', R(-62, -213, 244, 4)]);
      // giant Ionic pilasters and the arched upper windows between
      for (let k = 0; k < 6; k++) { const x = -54 + k * 46; b.push(['@stone.2', R(x, -186, 8, 108)], ['@shade.0', R(x + 6, -186, 2, 108), .5], ['@stone.1', R(x - 3, -190, 14, 5)]); }
      for (let k = 0; k < 5; k++) {
        const x = -40 + k * 46;
        b.push(['@shade.0', arch(x - 2, -172, 30, 64)], { f: '@glass.0', d: arch(x, -170, 26, 60), glow: 'window' }, { s: '@stone.2', w: 1, detail: true, d: `M${x + 13} -160V-110M${x} -136h26` });
        b.push(['@stone.1', R(x - 2, -108, 30, 4)]);
        b.push({ f: '@glass.1', d: R(x + 2, -66, 22, 40), glow: k === 2 ? 'lamp' : 'window' }, ['@stone.1', R(x, -70, 26, 4)]);
      }
      b.push(['@stone.1', R(-60, -24, 240, 24)], ['@door', R(54, -24, 52, 24)]);
      // the glass and iron entrance canopy
      b.push(['@canopy.0', R(-40, -36, 200, 6)], ['@canopy.1', R(-40, -38, 200, 2)]);
      for (let k = 0; k < 5; k++) b.push({ f: '@gold', d: R(-30 + k * 46, -32, 10, 3), glow: 'lamp' });
      // the corner tower (left): rounded, three stages, the dome and its lantern
      const tx = -110;
      b.push(['@stone.0', R(tx - 50, -230, 100, 230)], ['@shade.0', R(tx + 22, -230, 28, 230), .4]);
      for (let k = 0; k < 7; k++) b.push(['@shade.1', R(tx - 50, -24 - k * 30, 100, 2), .5]);
      for (const y of [-200, -140]) { b.push(['@shade.0', arch(tx - 18, y - 2, 36, 54)], { f: '@glass.0', d: arch(tx - 16, y, 32, 50), glow: 'window' }); }
      b.push({ f: '@glass.1', d: R(tx - 14, -70, 28, 44), glow: 'window' }, ['@door', R(tx - 16, -24, 32, 24)]);
      b.push(['@stone.2', R(tx - 56, -238, 112, 8)]);
      for (let k = 0; k < 10; k++) b.push(['@stone.1', R(tx - 52 + k * 10.6, -250, 5, 12)]);
      b.push(['@stone.2', R(tx - 54, -252, 108, 3)]);
      // the drum and the copper dome with ribs
      b.push(['@stone.1', R(tx - 36, -270, 72, 18)]);
      for (let k = 0; k < 6; k++) b.push({ f: '@glass.0', d: R(tx - 30 + k * 11, -266, 6, 11), glow: 'window' });
      b.push(['@dome.1', `M${tx - 40} -270Q${tx - 38} -318 ${tx} -322Q${tx + 38} -318 ${tx + 40} -270z`]);
      b.push(['@dome.2', `M${tx - 36} -272Q${tx - 32} -310 ${tx - 4} -318Q${tx - 18} -300 ${tx - 22} -272z`, .55]);
      b.push({ s: '@dome.0', w: 1.3, d: lines(7, i => { const x = tx - 30 + i * 10; return `M${x} -271Q${f1(tx + (x - tx) * .45)} -306 ${tx} -320`; }) });
      b.push(['@stone.2', R(tx - 9, -340, 18, 18)], ['@dome.1', `M${tx - 11} -340Q${tx} -352 ${tx + 11} -340z`], ['@gold', R(tx - 1, -360, 2, 10)], ['@gold', ell(tx, -361, 2.5, 2.5)]);
      const lit = [wash(-20, -150, 300, 'M-180 0V-370H190V0z', .28), { f: '@gold', d: R(-40, -30, 200, 3), op: .9 }];
      return { body: b, lit };
    },
  });

  /* ---------- the Moor Market ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-moor-market', category: 'landmark', size: [640, 190], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      roof: ['#b8bec2', '#8e969c', '#d8dee0'], glass: ['#3a4a56', '#6a8494', '#b4c8d2'], frame: ['#3e4448', '#6a7276'], wall: ['#7a7e80', '#5e6264'],
      accent: ['#d8a83a', '#2a7a8a', '#b84a3a'], stone: ['#c8c4bc'], flood: ['#fff0d0'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 320, ry: 14, h: 170 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'market', 'the-moor', 'modern', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the Moor Market)',
    build() {
      const b = [], X = 310;
      // the hall: side wall, then the glazed front under the waves
      b.push(['@wall.0', R(-X, -150, 2 * X, 150)]);
      // the wave roof: a run of shallow vaults
      let wave = `M${-X - 14} -150`; const n = 8, w = (2 * X + 28) / n;
      for (let i = 0; i < n; i++) wave += `Q${f1(-X - 14 + (i + .5) * w)} -188 ${f1(-X - 14 + (i + 1) * w)} -150`;
      b.push(['@roof.1', wave + `V-140H${-X - 14}z`]);
      for (let i = 0; i < n; i++) { const x = -X - 14 + i * w; b.push(['@roof.2', `M${f1(x + 4)} -152Q${f1(x + w * .45)} -182 ${f1(x + w * .7)} -166Q${f1(x + w * .4)} -166 ${f1(x + 4)} -152z`, .7]); }
      b.push(['@roof.0', R(-X - 14, -146, 2 * X + 28, 8)]);
      // the curtain wall: mullions and transoms, some panels coloured
      for (let r = 0; r < 3; r++) for (let k = 0; k < 20; k++) {
        const x = -X + 6 + k * 31, y = -134 + r * 34;
        b.push({ f: (k * 7 + r * 3) % 11 === 0 ? '@accent.' + ((k + r) % 3) : '@glass.' + ((k + r) % 3 === 0 ? 1 : 0), d: R(x, y, 28, 31), glow: (k * 7 + r * 3) % 11 === 0 ? undefined : 'window' });
      }
      b.push({ s: '@frame.0', w: 2, d: lines(4, r => `M${-X} ${-136 + r * 34}H${X}`) });
      b.push(['@glass.2', `M${-X} -134L${-X + 140} -134L${-X} -40z`, .25]);
      // the deep canopy and its columns
      b.push(['@roof.0', R(-X - 20, -38, 2 * X + 40, 8)], ['@frame.0', R(-X - 20, -30, 2 * X + 40, 3)]);
      for (let k = 0; k < 11; k++) b.push(['@frame.1', R(-X - 6 + k * 63, -30, 4, 30)]);
      for (let k = 0; k < 10; k++) b.push({ f: '@glass.1', d: R(-X + 8 + k * 63, -26, 48, 26), glow: 'lamp' });
      b.push(['@stone', R(-X - 24, -3, 2 * X + 48, 3)]);
      const lit = [wash(0, -60, 380, `M${-X - 30} 0V-200H${X + 30}V0z`, .24)];
      return { body: b, lit };
    },
  });

  /* ---------- Sheffield station ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-station', category: 'landmark', size: [780, 170], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#d6c8a6', '#b8a886', '#ece0c4'], shade: ['#9c8c6c', '#7e6e52'], glass: ['#34404a', '#5e7482', '#aec0ca'], roof: ['#6a7276', '#4a5256', '#9aa4a8'],
      door: ['#2e3438'], flood: ['#ffe4b0'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 390, ry: 14, h: 140 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'station', 'railway', 'sheaf-square', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (Sheffield station on Sheaf Square)',
    build() {
      const b = [], X = 380;
      // the train shed roof behind
      b.push(['@roof.0', P([[-X + 20, -110], [-X + 60, -150], [X - 60, -150], [X - 20, -110]])], ['@roof.2', P([[-X + 60, -150], [X - 60, -150], [X - 64, -146], [-X + 64, -146]]), .7]);
      b.push({ s: '@roof.1', w: 1, op: .7, d: lines(26, i => `M${-X + 70 + i * 26} -148L${-X + 40 + i * 28} -112`) });
      // the arcade screen
      b.push(['@stone.0', R(-X, -112, 2 * X, 112)], ['@shade.0', R(-X, -10, 2 * X, 10)]);
      const n = 15, bw = 2 * X / n;
      for (let k = 0; k < n; k++) {
        const x = -X + k * bw, pav = k === 0 || k === n - 1 || k === 7;
        if (pav) { b.push(['@stone.2', R(x, -138, bw, 138)], ['@shade.0', R(x + bw - 6, -138, 6, 138), .5], ['@stone.1', R(x - 3, -142, bw + 6, 6)]);
          for (let j = 0; j < 5; j++) b.push(['@stone.1', R(x + 6 + j * (bw - 12) / 5, -156, 5, 14)]);
          b.push(['@stone.2', R(x - 2, -158, bw + 4, 3)], { f: '@glass.0', d: arch(x + bw * .3, -128, bw * .4, 30), glow: 'window' }); }
        b.push(['@shade.1', arch(x + 6, -94, bw - 12, 94)], { f: '@glass.' + (k % 2), d: arch(x + 10, -90, bw - 20, 90), glow: k % 3 === 1 ? 'lamp' : 'window' });
        b.push({ s: '@stone.2', w: 1, detail: true, d: `M${f1(x + bw / 2)} -70V0M${f1(x + 10)} -48h${f1(bw - 20)}` });
        b.push(['@stone.2', R(x + bw / 2 - 3, -98, 6, 8)]);
      }
      // the cornice and balustrade along the screen
      b.push(['@stone.2', R(-X - 4, -116, 2 * X + 8, 6)], ['@shade.1', R(-X - 4, -110, 2 * X + 8, 2), .6]);
      for (let k = 0; k < 64; k++) { const x = -X + 4 + k * 12; if (Math.abs(x) < 26 || x < -X + bw || x > X - bw) continue; b.push(['@stone.1', R(x, -126, 5, 10)]); }
      b.push(['@stone.2', R(-X, -128, 2 * X, 3)]);
      b.push(['@glass.2', `M${-X} -94L${-X + 160} -94L${-X} -10z`, .2]);
      const lit = [wash(0, -60, 440, `M${-X - 10} 0V-170H${X + 10}V0z`, .24)];
      return { body: b, lit };
    },
  });

  /* ---------- the Cutting Edge, Sheaf Square ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-cutting-edge', category: 'landmark', size: [560, 130], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      steel: ['#c8d0d6', '#9aa4ac', '#eef2f4', '#6e787e'], water: ['#bcd8e2', '#e6f4f8'], pool: ['#6a98a8', '#3e6a7a'], stone: ['#c8c2b6', '#a8a296', '#dcd8cc'],
      flood: ['#d8ecff'],
    } },
    night: NIGHT, parts: ['body', 'water', 'lit'], anim: { flicker: { part: 'water', op: [0.55, 1], period: 1.6 } },
    shadow: { rx: 280, ry: 10, h: 110 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'sculpture', 'steel', 'water', 'sheaf-square', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the steel water wall on Sheaf Square)',
    build() {
      const b = [], water = [], X = 270;
      // the stepped pools and rills at the foot
      for (let k = 0; k < 4; k++) { const y = -4 - k * 5; b.push(['@stone.' + (k % 2), R(-X + k * 20, y - 4, 2 * X - k * 40, 6)], ['@pool.' + (k % 2), R(-X + 6 + k * 20, y - 3, 2 * X - 12 - k * 40, 3)]); }
      // the blade: rising from left to right, curved top edge
      const top = (t) => -22 - 100 * Math.pow(t, 1.3);
      let d = `M${-X} -22`; for (let i = 1; i <= 24; i++) { const t = i / 24; d += `L${f1(-X + t * 2 * X)} ${f1(top(t))}`; } d += `V-22z`;
      b.push(['@steel.1', d]);
      // polished panels: vertical seams and the sky in the steel
      for (let i = 1; i < 24; i++) { const t = i / 24, x = -X + t * 2 * X; b.push({ s: i % 3 ? '@steel.0' : '@steel.3', w: i % 3 ? .8 : 1.2, op: .7, d: `M${f1(x)} ${f1(top(t))}V-22` }); }
      let hi = `M${-X + 40} -24`; for (let i = 2; i <= 20; i++) { const t = i / 24; hi += `L${f1(-X + t * 2 * X)} ${f1(top(t) * .55 - 10)}`; } hi += `L${f1(-X + 20 / 24 * 2 * X)} -24z`;
      b.push(['@steel.2', hi, .45]);
      b.push({ s: '@steel.3', w: 2, d: `M${-X} -22` + lines(24, i => { const t = (i + 1) / 24; return `L${f1(-X + t * 2 * X)} ${f1(top(t))}`; }) });
      // lamps in the paving that wash the wall at night
      for (let k = 0; k < 12; k++) b.push({ f: '@water.1', d: R(-X + 20 + k * 44, -24, 8, 2), glow: 'lamp' });
      // water running down the face
      for (let i = 0; i < 18; i++) { const t = (i + .5) / 18, x = -X + t * 2 * X; water.push({ f: '@water.' + (i % 2), d: `M${f1(x - 3)} ${f1(top(t) + 4)}h6L${f1(x + 2)} -22h-4z`, op: .55 }); }
      water.push(['@water.1', R(-X + 4, -26, 2 * X - 8, 3), .7]);
      for (let k = 0; k < 14; k++) water.push(['@water.1', ell(-X + 30 + k * 37, -8 - (k % 3) * 4, 8 + (k % 4) * 2, 1.2), .6]);
      for (let k = 0; k < 10; k++) b.push(['@stone.2', R(-X + 10 + k * 54, -2, 40, 2), .7]);
      const lit = [wash(60, -60, 340, `M${-X} 0V-130H${X}V0z`, .3)];
      return { body: b, water, lit };
    },
  });

  /* ---------- Weston Park Museum ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-weston-museum', category: 'landmark', size: [540, 200], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#ddd0b2', '#c2b490', '#efe6cc'], shade: ['#a89874', '#8a7a5a'], glass: ['#34404a', '#64788a'], door: ['#3a2c24'], roof: ['#6a7276'], flood: ['#ffe6b8'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 270, ry: 14, h: 180 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'museum', 'gallery', 'classical', 'weston-park', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (Weston Park Museum and the Mappin gallery)',
    build() {
      const b = [], X = 260;
      // wings and the recessed centre
      b.push(['@stone.0', R(-X, -150, 2 * X, 150)], ['@shade.0', R(-120, -142, 240, 120), .7]);
      b.push(['@stone.2', R(-X - 4, -160, 2 * X + 8, 10)], ['@shade.1', R(-X - 4, -152, 2 * X + 8, 2), .6], ['@roof', R(-X + 10, -172, 2 * X - 20, 12)]);
      // the attic and its panels
      b.push(['@stone.1', R(-130, -192, 260, 32)], ['@stone.2', R(-134, -196, 268, 5)]);
      for (let k = 0; k < 5; k++) b.push(['@shade.0', R(-116 + k * 48, -186, 40, 20), .5]);
      // the Ionic colonnade: eight columns with capitals, bases and entablature
      for (let k = 0; k < 8; k++) {
        const x = -112 + k * 32;
        b.push(['@stone.2', R(x - 6, -140, 12, 112)], ['@shade.0', R(x + 2, -140, 4, 112), .5]);
        b.push(['@stone.1', `M${x - 10} -140h20l-2 -6h-16z`], ['@stone.1', ell(x - 7, -143, 3, 3)], ['@stone.1', ell(x + 7, -143, 3, 3)], ['@stone.1', R(x - 9, -30, 18, 4)]);
      }
      b.push(['@stone.2', R(-124, -150, 248, 8)]);
      // windows behind the colonnade and the doors
      for (let k = 0; k < 7; k++) { const x = -98 + k * 32; b.push({ f: '@glass.' + (k % 2), d: k === 3 ? arch(x - 2, -100, 22, 72) : R(x, -92, 18, 34), glow: k === 3 ? 'lamp' : 'window' }); }
      // the wings: tall windows, rustication
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
        const x = s < 0 ? -X + 14 + k * 32 : 124 + k * 32;
        b.push(['@shade.0', R(x - 2, -122, 22, 70), .7], { f: '@glass.0', d: R(x, -120, 18, 66), glow: 'window' }, ['@stone.2', R(x - 4, -126, 26, 4)]);
      }
      b.push({ s: '@shade.0', w: .8, op: .5, detail: true, d: lines(5, i => `M${-X} ${-8 - i * 9}H-124M124 ${-8 - i * 9}H${X}`) });
      // the steps
      for (let k = 0; k < 4; k++) b.push(['@stone.' + (k % 2 ? 1 : 2), R(-130 - k * 6, -26 + k * 6, 260 + k * 12, 6)]);
      const lit = [wash(0, -90, 330, `M${-X - 10} 0V-200H${X + 10}V0z`, .26)];
      return { body: b, lit };
    },
  });

  /* ---------- Meadowhall ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-meadowhall', category: 'landmark', size: [740, 230], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      wall: ['#e6d6c0', '#c8b49a', '#f2e8d8'], terra: ['#b46a4a', '#94523a'], dome: ['#4e9a7c', '#2e7a5e', '#8cc8ae'], rib: ['#e8efe8', '#c0ccc4'],
      glass: ['#3a4c58', '#6a8898', '#b6ccd6'], roof: ['#7a8288'], flood: ['#e8fff4'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 370, ry: 14, h: 160 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'shopping', 'dome', 'meadowhall', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (Meadowhall, in the Don valley)',
    build() {
      const b = [], X = 360;
      const dome = (cx, base, r, h) => {
        b.push(['@wall.1', R(cx - r - 6, base - 14, 2 * r + 12, 14)]);
        b.push(['@dome.1', `M${cx - r} ${base - 14}Q${cx - r} ${base - 14 - h} ${cx} ${base - 14 - h}Q${cx + r} ${base - 14 - h} ${cx + r} ${base - 14}z`]);
        b.push(['@dome.2', `M${cx - r + 6} ${base - 16}Q${cx - r + 4} ${base - 10 - h} ${cx - r * .2} ${base - 12 - h}Q${cx - r * .7} ${base - 14 - h * .6} ${cx - r * .5} ${base - 16}z`, .5]);
        b.push({ s: '@rib.0', w: 1.4, d: lines(9, i => { const x = cx - r + (i + 1) * 2 * r / 10; return `M${f1(x)} ${base - 14}Q${f1(cx + (x - cx) * 1.05)} ${f1(base - 14 - h * .95)} ${cx} ${base - 14 - h}`; }) + lines(3, i => `M${f1(cx - r * (.95 - i * .2))} ${f1(base - 14 - h * (.3 + i * .22))}H${f1(cx + r * (.95 - i * .2))}`) });
        b.push({ f: '@dome.0', d: R(cx - r + 4, base - 14 - 6, 2 * r - 8, 4), glow: 'window' });
        b.push(['@rib.1', R(cx - 5, base - 26 - h, 10, 12)], ['@dome.1', ell(cx, base - 26 - h, 6, 3)]);
      };
      // the long arcades
      b.push(['@wall.0', R(-X, -110, 2 * X, 110)], ['@terra.0', R(-X, -116, 2 * X, 8)], ['@roof', R(-X + 6, -122, 2 * X - 12, 6)]);
      for (let k = 0; k < 22; k++) {
        const x = -X + 10 + k * 32.4;
        if (Math.abs(x + 12) < 80) continue;
        b.push(['@terra.1', arch(x - 2, -96, 26, 62)], { f: '@glass.' + (k % 3 === 0 ? 1 : 0), d: arch(x, -94, 22, 58), glow: 'window' });
        b.push(['@wall.2', R(x - 3, -30, 28, 3)]);
      }
      b.push(['@terra.0', R(-X, -24, 2 * X, 4)], ['@wall.1', R(-X, -20, 2 * X, 20)]);
      // the central glazed entrance and the great dome; two smaller domes
      b.push(['@terra.0', R(-80, -150, 160, 150)], ['@wall.2', R(-84, -156, 168, 8)]);
      b.push(['@glass.0', arch(-60, -140, 120, 140)], { f: '@glass.1', d: arch(-52, -132, 104, 132), glow: 'lamp' });
      b.push({ s: '@rib.0', w: 1.6, d: lines(5, i => `M${-52 + (i + 1) * 104 / 6} -112V0`) + lines(4, i => `M-52 ${-30 - i * 24}H52`) });
      dome(0, -150, 86, 70);
      dome(-250, -116, 50, 40);
      dome(250, -116, 50, 40);
      b.push(['@glass.2', `M-52 -100L-10 -100L-52 -20z`, .25]);
      const lit = [wash(0, -120, 420, `M${-X - 10} 0V-250H${X + 10}V0z`, .28)];
      return { body: b, lit };
    },
  });

  /* ---------- the General Cemetery's Egyptian gate ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-cemetery-gate', category: 'landmark', size: [420, 230], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#bfb294', '#a09276', '#d6ccb2'], shade: ['#7e7258', '#62584a'], moss: ['#6a7a4a', '#4e5e36'], iron: ['#2a2c2e', '#4a4c4e'], dark: ['#2e2a26'], flood: ['#ffe4b8'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 210, ry: 12, h: 200 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'cemetery', 'egyptian-revival', 'heritage', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the Egyptian gate of the General Cemetery, Cemetery Road)',
    build() {
      const b = [];
      // the flanking walls with their cornices
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -210 : 110;
        b.push(['@stone.1', R(x0, -96, 100, 96)], ['@stone.2', R(x0 - 2, -106, 104, 10)], ['@shade.0', R(x0 - 2, -98, 104, 3), .6]);
        b.push({ s: '@shade.0', w: .8, op: .5, detail: true, d: lines(9, i => `M${x0} ${-8 - i * 10}h100`) + lines(10, i => `M${x0 + 10 * i + (i % 2) * 5} ${-96}v96`) });
        b.push(['@moss.0', `M${x0} 0V-30Q${x0 + 30} -40 ${x0 + 60} -18Q${x0 + 80} -10 ${x0 + 100} -14V0z`, .5]);
        for (let k = 0; k < 8; k++) b.push(['@stone.' + (k % 2 ? 2 : 0), R(x0 + k * 12.5, -112, 12, 6)]);
        for (let k = 0; k < 6; k++) b.push(['@moss.' + (k % 2), ell(x0 + 8 + k * 17, -30 + (k % 3) * 8, 7 + (k % 2) * 3, 5), .75]);
      }
      // the battered pylons either side of the passage
      for (const s of [-1, 1]) {
        const xo = s * 110, xi = s * 46;
        b.push(['@stone.0', P([[xo, 0], [xi, 0], [xi + s * 4, -190], [xo - s * 10, -190]])]);
        b.push(['@shade.0', P([[xo, 0], [xo - s * 14, 0], [xo - s * 22, -190], [xo - s * 10, -190]]), .45]);
        b.push({ s: '@shade.1', w: .8, op: .55, detail: true, d: lines(14, i => `M${f1(xo - s * i * .7)} ${-12 - i * 13}H${f1(xi + s * i * .3)}`) });
        // the torus moulding up the edges
        b.push({ s: '@stone.2', w: 3, d: `M${xo} 0L${xo - s * 10} -190M${xi} 0L${xi + s * 4} -190` });
      }
      // the lintel and the deep cavetto cornice across the top
      b.push(['@stone.0', R(-124, -212, 248, 22)], ['@stone.2', `M-130 -212Q-136 -232 -142 -236H142Q136 -232 130 -212z`], ['@shade.0', R(-130, -214, 260, 3), .6]);
      b.push({ s: '@shade.0', w: 1, op: .5, d: lines(30, i => `M${-138 + i * 9.4} -234L${-128 + i * 8.6} -214`) });
      b.push(['@stone.1', R(-142, -240, 284, 5)]);
      for (let k = 0; k < 12; k++) b.push(['@stone.' + (k % 2), R(-120 + k * 20, -206, 18, 12), .6]);
      // the passage: two lotus columns, the dark way through, the iron gates
      b.push(['@dark', R(-46, -176, 92, 176)], ['@shade.1', R(-46, -176, 92, 12), .7]);
      for (const x of [-24, 24]) {
        b.push(['@stone.2', R(x - 6, -150, 12, 150)], ['@shade.0', R(x + 2, -150, 4, 150), .5]);
        b.push(['@stone.2', `M${x - 6} -150Q${x - 14} -166 ${x - 10} -176H${x + 10}Q${x + 14} -166 ${x + 6} -150z`]);
        b.push({ s: '@shade.0', w: .8, d: `M${x - 3} -152L${x - 6} -172M${x + 3} -152L${x + 6} -172M${x} -152V-174` });
      }
      b.push({ s: '@iron.0', w: 1.6, d: lines(13, i => `M${-44 + i * 7.3} -2V-70`) + 'M-44 -40H44M-44 -68H44' });
      b.push({ f: '@iron.1', d: lines(13, i => `M${f1(-45.5 + i * 7.3)} -70l1.5 -5 1.5 5z`) });
      for (const x of [-150, 150]) b.push(['@iron.0', R(x - 1.5, -150, 3, 44)], ['@iron.0', R(x - 6, -160, 12, 10)], { f: '#fff0c0', d: R(x - 4, -158, 8, 7), glow: 'lamp' });
      for (let k = 0; k < 8; k++) b.push({ f: '#ffe8b0', d: R(-40 + k * 10.5, -6, 4, 3), glow: 'lamp', op: .7 });
      const lit = [wash(0, -110, 260, 'M-220 0V-250H220V0z', .26)];
      return { body: b, lit };
    },
  });

  /* ---------- Abbeydale Industrial Hamlet ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-abbeydale', category: 'landmark', size: [660, 240], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#b8a888', '#9a8a6c', '#d2c4a4'], slate: ['#5a5e62', '#44484c', '#787e82'], wood: ['#6a4a30', '#4a3220', '#8a6a48'], brick: ['#8a4a34', '#6e3828'],
      glass: ['#34404a', '#6a7c88'], water: ['#9ac4d0', '#e6f4f8'], iron: ['#3a3634'], flood: ['#ffd8a0'],
    } },
    night: NIGHT, parts: ['body', 'wheel', 'spray', 'lit'],
    anim: { spin: { part: 'wheel', pivot: [-60, -54], period: 14 }, flicker: { part: 'spray', op: [0.5, 1], period: 1.3 } },
    shadow: { rx: 330, ry: 14, h: 220 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'industry', 'heritage', 'waterwheel', 'abbeydale', 'kit:temperate'],
    credit: 'drawn for the Sheffield area scenes (Abbeydale Industrial Hamlet)',
    build() {
      const b = [], wheel = [], spray = [];
      const roof = (x, y, w, h) => { b.push(['@slate.0', P([[x - 6, y], [x + w / 2, y - h], [x + w + 6, y]])], ['@slate.2', P([[x + w / 2, y - h], [x + w + 6, y], [x + w - 4, y]]), .4]); };
      // the crucible furnace stack (tall, square, stone)
      b.push(['@stone.1', P([[150, -60], [156, -232], [176, -232], [182, -60]])], ['@stone.2', P([[156, -232], [162, -232], [158, -60], [150, -60]]), .6], ['@slate.1', R(152, -238, 28, 8)]);
      b.push({ s: '@stone.0', w: .7, op: .5, detail: true, d: lines(16, i => `M${f1(151 + i * .35)} ${-70 - i * 10}h${f1(30 - i * .7)}`) });
      // the crucible shop (long, stone, with its stacks)
      b.push(['@stone.0', R(90, -84, 210, 84)]); roof(90, -84, 210, 34);
      for (let k = 0; k < 5; k++) b.push(['@stone.2', R(110 + k * 38, -60, 18, 28)], { f: '@glass.' + (k % 2), d: R(112 + k * 38, -58, 14, 24), glow: 'window' });
      b.push(['@wood.1', R(260, -46, 26, 46)]);
      // the workers' cottages and the manager's house (right)
      b.push(['@stone.2', R(300, -72, 30, 72)]); roof(300, -72, 30, 18);
      b.push(['@stone.0', R(-330, -70, 120, 70)]); roof(-330, -70, 120, 30);
      for (let k = 0; k < 3; k++) b.push({ f: '@glass.0', d: R(-318 + k * 40, -56, 16, 18), glow: 'window' }, ['@stone.2', R(-320 + k * 40, -60, 20, 3)], ['@wood.' + (k % 2), R(-304 + k * 40, -30, 12, 30)]);
      b.push(['@stone.1', R(-246, -128, 14, 30)], ['@stone.1', R(-300, -124, 14, 26)]);
      for (let k = 0; k < 6; k++) b.push(['@slate.1', R(-320 + k * 18, -80 - (k % 2) * 6, 14, 2), .6]);
      // the tilt-forge (centre): timber-framed stone shed, open front with the hammers
      b.push(['@stone.1', R(-200, -100, 230, 100)]); roof(-200, -100, 230, 40);
      b.push(['#2a2622', R(-180, -70, 110, 70)]);
      for (let k = 0; k < 3; k++) b.push(['@wood.0', R(-174 + k * 36, -58, 8, 40)], ['@iron', R(-178 + k * 36, -22, 16, 10)], ['@wood.2', R(-180 + k * 36, -62, 60, 5)]);
      b.push({ f: '#ff9a4a', d: ell(-100, -10, 14, 6), glow: 'lamp' });
      b.push({ s: '@wood.1', w: 2, d: 'M-200 -100V0M-70 -100V0M30 -100V0M-200 -70H30' });
      b.push({ f: '@glass.0', d: R(-50, -80, 22, 22), glow: 'window' }, { f: '@glass.1', d: R(-10, -80, 22, 22), glow: 'window' });
      // the wheel race (timber launder) feeding the wheel
      b.push(['@wood.0', R(-240, -116, 180, 8)], ['@wood.1', R(-240, -108, 180, 3)]);
      for (let k = 0; k < 5; k++) b.push(['@wood.1', R(-236 + k * 40, -108, 4, 108)]);
      // the water wheel: rim, spokes, buckets (turns)
      const cx = -60, cy = -54, Rw = 50;
      wheel.push({ s: '@wood.0', w: 5, d: `M${cx - Rw} ${cy}a${Rw} ${Rw} 0 1 0 ${2 * Rw} 0a${Rw} ${Rw} 0 1 0 ${-2 * Rw} 0` });
      wheel.push({ s: '@wood.2', w: 2, d: `M${cx - Rw + 9} ${cy}a${Rw - 9} ${Rw - 9} 0 1 0 ${2 * (Rw - 9)} 0a${Rw - 9} ${Rw - 9} 0 1 0 ${-2 * (Rw - 9)} 0` });
      wheel.push({ s: '@wood.1', w: 3, d: lines(8, i => { const a = i * Math.PI / 8; return `M${f1(cx + Math.cos(a) * Rw)} ${f1(cy + Math.sin(a) * Rw)}L${f1(cx - Math.cos(a) * Rw)} ${f1(cy - Math.sin(a) * Rw)}`; }) });
      wheel.push({ f: '@wood.1', d: lines(24, i => { const a = i * Math.PI / 12, c = Math.cos(a), s = Math.sin(a); return `M${f1(cx + c * Rw)} ${f1(cy + s * Rw)}L${f1(cx + c * (Rw + 7) - s * 4)} ${f1(cy + s * (Rw + 7) + c * 4)}L${f1(cx + c * (Rw + 7))} ${f1(cy + s * (Rw + 7))}z`; }) });
      wheel.push(['@iron', ell(cx, cy, 8, 8)]);
      // falling water from the launder
      for (let k = 0; k < 6; k++) spray.push({ f: '@water.' + (k % 2), d: `M${-72 + k * 4} -108q${2 + k} 20 ${4 + k} 44h3q-${k} -24 -3 -44z`, op: .7 });
      spray.push(['@water.1', ell(-30, -6, 30, 4), .7]);
      // the tail race wall
      b.push(['@stone.2', R(-340, -4, 680, 4)]);
      for (const x of [-210, 70]) b.push(['@iron', R(x - 1.5, -60, 3, 56)], ['@iron', R(x - 5, -68, 10, 8)], { f: '#fff0c0', d: R(x - 3.5, -66, 7, 5), glow: 'lamp' });
      const lit = [wash(-40, -80, 360, 'M-340 0V-250H340V0z', .22)];
      return { body: b, wheel, spray, lit };
    },
  });

  /* ---------- Hillsborough House ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-hillsborough-house', category: 'landmark', size: [420, 200], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#d6c8a8', '#bcac8c', '#ebe0c6'], shade: ['#9c8c6c'], slate: ['#5a5e64', '#43474c'], glass: ['#34404a', '#6a7c88'], door: ['#2e3a30'], flood: ['#ffe6b8'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 210, ry: 12, h: 180 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'georgian', 'library', 'hillsborough-park', 'kit:temperate'],
    credit: 'drawn for the Sheffield area scenes (Hillsborough House, now the library, in Hillsborough Park)',
    build() {
      const b = [];
      b.push(['@slate.0', P([[-150, -140], [-130, -168], [130, -168], [150, -140]])], ['@slate.1', R(-130, -170, 260, 3)]);
      for (const x of [-110, 110]) b.push(['@stone.1', R(x - 9, -188, 18, 22)], ['#9a5a40', R(x - 6, -192, 4, 4)], ['#9a5a40', R(x + 2, -192, 4, 4)]);
      b.push(['@stone.0', R(-150, -140, 300, 140)], ['@shade', R(120, -140, 30, 140), .45]);
      // side wings
      for (const s of [-1, 1]) { const x = s < 0 ? -210 : 150; b.push(['@stone.1', R(x, -84, 60, 84)], ['@slate.0', P([[x - 4, -84], [x + 6, -100], [x + 54, -100], [x + 64, -84]])]); b.push({ f: '@glass.0', d: R(x + 14, -66, 14, 26), glow: 'window' }, { f: '@glass.1', d: R(x + 34, -66, 14, 26), glow: 'window' }); }
      // the central pediment bay
      b.push(['@stone.2', R(-50, -150, 100, 150)], ['@stone.2', P([[-58, -150], [0, -184], [58, -150]])], ['@shade', P([[-46, -152], [0, -178], [46, -152]]), .35]);
      b.push(['@stone.2', R(-154, -146, 308, 6)], ['@stone.2', R(-150, -78, 300, 4)]);
      // sash windows, three storeys, with glazing bars
      for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) {
        const x = -136 + k * 40, y = -134 + r * 44; if (r === 2 && k === 3) continue;
        b.push({ f: '@glass.' + ((k + r) % 2), d: R(x, y, 18, r === 0 ? 22 : 30), glow: 'window' }, ['@stone.2', R(x - 2, y + (r === 0 ? 22 : 30), 22, 3)]);
        b.push({ s: '@stone.2', w: .7, detail: true, d: `M${x + 9} ${y}v${r === 0 ? 22 : 30}M${x} ${y + (r === 0 ? 11 : 15)}h18` });
      }
      // the porch with two columns and the door
      b.push(['@stone.2', R(-26, -54, 52, 6)]);
      for (const x of [-20, 16]) b.push(['@stone.2', R(x, -48, 6, 48)], ['@shade', R(x + 4, -48, 2, 48), .5]);
      b.push(['@door', R(-11, -46, 22, 46)], { f: '@glass.1', d: arch(-11, -58, 22, 14), glow: 'lamp' });
      b.push(['@stone.1', R(-34, -4, 68, 4)]);
      const lit = [wash(0, -90, 260, 'M-220 0V-200H220V0z', .24)];
      return { body: b, lit };
    },
  });

  /* ---------- Forge Dam: the cafe and the spillway ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-forge-dam', category: 'landmark', size: [460, 130], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#a89878', '#8a7a5e', '#c4b494'], slate: ['#54585e', '#6e747a'], wood: ['#5a4630', '#7a6448'], glass: ['#34404a', '#6a7c88'],
      water: ['#a8ccd6', '#e8f6fa'], moss: ['#5e7040'], flood: ['#ffe2b0'],
    } },
    night: NIGHT, parts: ['body', 'spray', 'lit'], anim: { flicker: { part: 'spray', op: [0.5, 1], period: 1.2 } },
    shadow: { rx: 230, ry: 10, h: 110 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'mill-dam', 'cafe', 'porter-valley', 'kit:temperate'],
    credit: 'drawn for the Sheffield area scenes (Forge Dam in the Porter valley)',
    build() {
      const b = [], spray = [];
      // the stone cafe with its slate roof, chimney and windows
      b.push(['@stone.0', R(40, -70, 170, 70)], ['@slate.0', P([[32, -70], [60, -104], [190, -104], [218, -70]])], ['@slate.1', P([[60, -104], [190, -104], [186, -98], [64, -98]]), .7]);
      b.push(['@stone.1', R(160, -122, 16, 22)], ['@stone.2', R(158, -124, 20, 4)]);
      b.push({ s: '@stone.1', w: .8, op: .5, detail: true, d: lines(6, i => `M40 ${-10 - i * 10}h170`) + lines(9, i => `M${50 + i * 19 + (i % 2) * 6} -70v70`) });
      for (let k = 0; k < 4; k++) b.push({ f: '@glass.' + (k % 2), d: R(54 + k * 38, -54, 22, 26), glow: 'window' }, ['@stone.2', R(52 + k * 38, -57, 26, 3)], ['@stone.2', R(52 + k * 38, -28, 26, 3)]);
      b.push(['@wood.0', R(196, -44, 12, 44)]);
      // the terrace and its tables
      b.push(['@stone.2', R(30, -4, 200, 4)]);
      for (let k = 0; k < 3; k++) { const x = 60 + k * 54; b.push(['@wood.1', R(x - 10, -16, 20, 3)], ['@wood.0', R(x - 1, -14, 2, 12)]); }
      // the dam wall and the stepped spillway (left)
      b.push(['@stone.1', P([[-230, 0], [-230, -40], [20, -40], [30, 0]])], ['@stone.2', R(-230, -44, 250, 5)]);
      b.push({ s: '@stone.0', w: .8, op: .55, detail: true, d: lines(4, i => `M-230 ${-8 - i * 9}H${22 + i * 2}`) + lines(12, i => `M${-222 + i * 20 + (i % 2) * 8} -40v40`) });
      for (let k = 0; k < 4; k++) b.push(['@stone.' + (k % 2 ? 0 : 2), R(-150 + k * 8, -40 + k * 10, 70 - k * 16, 10)]);
      for (let k = 0; k < 4; k++) spray.push({ f: '@water.' + (k % 2), d: R(-148 + k * 8, -40 + k * 10, 66 - k * 16, 6), op: .8 });
      spray.push(['@water.1', ell(-118, -2, 50, 5), .6]);
      b.push(['@moss', `M-230 -2Q-200 -14 -170 -4Q-150 0 -140 -2V0H-230z`, .6]);
      for (let k = 0; k < 16; k++) b.push(['@stone.' + (k % 2 ? 2 : 0), R(-230 + k * 15.6, -48, 14.6, 5)]);
      for (let k = 0; k < 12; k++) b.push(['@slate.' + (k % 2), R(66 + k * 10, -100 + (k % 3) * 9, 8, 2), .6]);
      for (let k = 0; k < 6; k++) b.push(['@wood.' + (k % 2), R(46 + k * 27, -12, 6, 10)]);
      for (let k = 0; k < 5; k++) b.push(['@moss', ell(36 + k * 44, -72, 9, 5), .6]);
      // railings along the dam top, two lamps
      b.push({ s: '#2e3034', w: 1.4, d: 'M-228 -60H20M-228 -52H20' + lines(14, i => `M${-226 + i * 18} -44V-62`) });
      for (const x of [-210, 26]) b.push(['#2e3034', R(x - 1.5, -86, 3, 42)], ['#2e3034', R(x - 5, -94, 10, 8)], { f: '#fff0c0', d: R(x - 3.5, -92, 7, 5), glow: 'lamp' });
      const lit = [wash(110, -50, 220, 'M-240 0V-140H240V0z', .26)];
      return { body: b, spray, lit };
    },
  });

  /* ---------- a Rivelin mill dam head ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-rivelin-dam', category: 'landmark', size: [460, 150], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#9e9076', '#80745c', '#bcae90'], moss: ['#5a6e3a', '#7a8a4a'], wood: ['#5a4630', '#7a6448'], iron: ['#3a3634'],
      water: ['#a8ccd6', '#e8f6fa'], dark: ['#2a2622'], flood: ['#ffe2b0'],
    } },
    night: NIGHT, parts: ['body', 'spray', 'lit'], anim: { flicker: { part: 'spray', op: [0.5, 1], period: 1.1 } },
    shadow: { rx: 230, ry: 10, h: 130 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'mill-dam', 'rivelin', 'industry', 'heritage', 'kit:temperate'],
    credit: 'drawn for the Sheffield area scenes (the mill dams of the Rivelin valley)',
    build() {
      const b = [], spray = [];
      // the wheel-pit ruin: a tall gritstone wall with an arched opening (right)
      b.push(['@stone.1', P([[60, 0], [60, -130], [90, -146], [150, -140], [196, -110], [210, -60], [210, 0]])]);
      b.push(['@dark', arch(110, -96, 54, 96)], ['@stone.2', `M106 -96A31 31 0 0 1 168 -96H162A25 25 0 0 0 112 -96z`]);
      b.push({ s: '@stone.0', w: .9, op: .55, detail: true, d: lines(12, i => `M60 ${-10 - i * 10.5}H${f1(210 - Math.max(0, i - 6) * 6)}`) + lines(14, i => `M${66 + i * 10 + (i % 2) * 4} -120v120`) });
      b.push(['@moss.0', 'M60 -130L90 -146L110 -140Q90 -120 70 -110z', .7], ['@moss.1', 'M190 -112L206 -66L196 -70z', .7]);
      b.push(['@stone.2', P([[60, -130], [90, -146], [94, -140], [64, -126]])]);
      // the dam wall with its sluice gate and the overflow
      b.push(['@stone.0', R(-230, -50, 290, 50)], ['@stone.2', R(-232, -54, 294, 6)]);
      b.push({ s: '@stone.1', w: .8, op: .55, detail: true, d: lines(4, i => `M-230 ${-10 - i * 10}H60`) + lines(15, i => `M${-224 + i * 19 + (i % 2) * 7} -50v50`) });
      b.push(['@wood.0', R(-60, -78, 40, 30)], ['@iron', R(-44, -96, 6, 26)], ['@iron', R(-56, -98, 32, 4)], ['@wood.1', R(-56, -44, 32, 44)]);
      b.push(['@moss.0', 'M-230 -6Q-190 -24 -150 -8Q-120 0 -100 -4V0H-230z', .6]);
      for (let k = 0; k < 20; k++) b.push(['@stone.' + (k % 3), R(-232 + k * 14.7, -60, 14, 6)]);
      for (let k = 0; k < 14; k++) { const fx = 64 + k * 10.5, fy = -128 + (k % 4) * 30; b.push(['@moss.' + (k % 2), `M${fx} ${fy}q6 -10 12 -2q-6 -2 -12 2z`, .8]); }
      for (let k = 0; k < 12; k++) b.push(['@stone.' + (k % 3), ell(-220 + k * 22, -3, 7 + (k % 3) * 2, 3)]);
      for (let k = 0; k < 10; k++) b.push(['@stone.2', R(118 + (k % 2) * 30, -86 + k * 8, 10, 3), .5]);
      for (let k = 0; k < 8; k++) b.push(['@moss.1', ell(-200 + k * 32, -50, 6, 2.4), .7]);
      for (let k = 0; k < 5; k++) spray.push({ f: '@water.' + (k % 2), d: `M${-146 + k * 9} -50q2 24 ${2 + k} 48h5q-${k} -24 -1 -48z`, op: .75 });
      spray.push(['@water.1', ell(-126, -2, 40, 4), .6]);
      // a timber footbridge with handrails
      b.push(['@wood.0', R(-20, -58, 100, 5)]);
      b.push({ s: '@wood.1', w: 1.6, d: 'M-20 -76H80M-20 -68H80' + lines(6, i => `M${-18 + i * 19} -56V-78`) });
      const lit = [wash(80, -60, 260, 'M-240 0V-160H230V0z', .22)];
      return { body: b, spray, lit };
    },
  });

  /* ---------- Wardsend: the old sexton's house ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-wardsend', category: 'landmark', size: [360, 160], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#9e927a', '#827660', '#b8ac92'], slate: ['#4e5258', '#686e74'], glass: ['#34404a', '#6a7c88'], door: ['#3a2e26'], moss: ['#5a6c3a'],
      iron: ['#2e3034'], flood: ['#ffe2b0'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 180, ry: 10, h: 140 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'cemetery', 'heritage', 'wardsend', 'kit:temperate'],
    credit: 'drawn for the Sheffield area scenes (Wardsend Cemetery above the Don)',
    build() {
      const b = [];
      // the two-storey gabled house
      b.push(['@stone.0', R(-90, -100, 180, 100)], ['@slate.0', P([[-100, -100], [-100, -104], [0, -150], [100, -104], [100, -100]])], ['@slate.1', P([[0, -150], [100, -104], [92, -104], [0, -142]]), .5]);
      b.push(['@stone.2', P([[-104, -102], [0, -154], [104, -102], [98, -100], [0, -148], [-98, -100]])]);
      b.push(['@stone.1', R(52, -150, 18, 30)], ['@stone.2', R(50, -152, 22, 4)]);
      b.push({ s: '@stone.1', w: .8, op: .5, detail: true, d: lines(9, i => `M-90 ${-8 - i * 10.5}H90`) + lines(10, i => `M${-84 + i * 18 + (i % 2) * 6} -100v100`) });
      // mullioned windows
      for (const [x, y] of [[-70, -86], [30, -86], [-70, -44], [30, -44], [-14, -124]]) {
        b.push(['@stone.2', R(x - 3, y - 3, 46 - (y < -100 ? 18 : 0), 30)]);
        for (let k = 0; k < (y < -100 ? 2 : 3); k++) b.push({ f: '@glass.' + (k % 2), d: R(x + k * 14, y, 12, 24), glow: 'window' });
      }
      b.push(['@door', arch(-18, -44, 30, 44)], ['@stone.2', R(-24, -48, 42, 4)]);
      b.push(['@moss', 'M-90 -2Q-60 -20 -30 -4Q-10 0 0 -2V0H-90z', .6]);
      for (let k = 0; k < 14; k++) b.push(['@slate.' + (k % 2), P([[-92 + k * 6.8, -104 - k * 3.2], [-86 + k * 6.8, -107 - k * 3.2], [-80 + k * 6.8, -104 - k * 3.2]]), .6]);
      for (let k = 0; k < 12; k++) b.push(['@moss', ell(64 + (k % 3) * 9, -12 - k * 7, 7, 5), .75]);
      for (let k = 0; k < 8; k++) { const hx = -250 + k * 13, hh = 18 + (k % 3) * 6; b.push(['@stone.' + (k % 3), `M${hx - 5} 0V${-hh + 5}A5 5 0 0 1 ${hx + 5} ${-hh + 5}V0z`]); }
      for (let k = 0; k < 8; k++) { const hx = 150 + k * 13, hh = 16 + (k % 3) * 7; b.push(['@stone.' + ((k + 1) % 3), P([[hx - 5, 0], [hx - 5 + (k % 2) * 2, -hh], [hx + 5 + (k % 2) * 2, -hh - 2], [hx + 5, 0]])]); }
      // the old stone gate piers and railings (left), a lamp
      for (const x of [-170, -130]) b.push(['@stone.1', R(x - 8, -60, 16, 60)], ['@stone.2', P([[x - 10, -60], [x, -70], [x + 10, -60]])]);
      b.push({ s: '@iron', w: 1.4, d: 'M-162 -40H-138M-162 -14H-138' + lines(5, i => `M${-160 + i * 5} -4V-44`) });
      b.push({ s: '@stone.1', w: 4, d: 'M-178 -4H-260M120 -4H180' });
      b.push(['@iron', R(130 - 1.5, -70, 3, 66)], ['@iron', R(126, -78, 9, 8)], { f: '#fff0c0', d: R(127.5, -76, 6, 5), glow: 'lamp' });
      const lit = [wash(0, -70, 220, 'M-180 0V-170H180V0z', .22)];
      return { body: b, lit };
    },
  });

  /* ---------- a row of Victorian shops ---------- */
  sceneObjDefine({
    id: 'building.sheffield2-shoprow', category: 'building', size: [520, 200], variants: 4, seasonal: false, flippable: true, weight: 0,
    palette: { base: {
      brick: ['#8e4a36', '#a65e44', '#7a3e2e', '#b8a080'], stone: ['#d8ccb0', '#b8aa8a', '#e8dec6'], slate: ['#4a4e56', '#3a3e44', '#62686e'],
      glass: ['#2e3a44', '#5a6e7c', '#b8c8d2'], front: ['#2a4a3e', '#6a2a2a', '#1e2e44', '#3a3a3a', '#7a5a2a', '#2a5a6a'],
      awn: ['#c84a3a', '#2a6a8a', '#e0b040', '#3a7a4a', '#7a3a6a', '#d8d4c8'], pot: ['#a8603a'],
    } },
    night: { glow: { window: '#f6d48a', lamp: '#ffe8b0' }, on: 0.75 },
    parts: ['body'], shadow: { rx: 260, ry: 10, h: 190 }, reflect: false,
    tags: ['uk', 'sheffield', 'shops', 'victorian', 'street', 'kit:urban', 'role:building-mid'],
    credit: 'drawn for the Sheffield area scenes (the shop rows of Division Street, Ecclesall Road, Sharrow Vale and West Street)',
    build(v, rnd) {
      const b = [], n = 4, w = 130, x0 = -260;
      const storeys = [3, 2, 2, 3][v], fh = 46, gf = 54;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * w, st = storeys - (v === 2 && i === 1 ? 1 : 0) + (v === 3 && i === 2 ? 1 : 0), H = gf + st * fh - fh + 8 + (st > 1 ? fh : 0) - fh;
        const top = -(gf + (st - 1) * fh + 14), stone = v === 1 || (v === 3 && i === 2);
        const wall = stone ? '@stone.' + (i % 2) : '@brick.' + ((i + v) % 3);
        b.push([wall, R(x, top, w + .5, -top)]);
        if (!stone) b.push({ s: '@brick.2', w: .5, op: .3, detail: true, d: lines(Math.floor(-top / 9), k => `M${x} ${top + 6 + k * 9}h${w}`) });
        // roof: a parapet (v0, v3) or a slate pitch with chimneys
        if (v === 0 || v === 3) { b.push(['@stone.2', R(x - 2, top - 8, w + 4, 8)], ['@stone.1', R(x - 2, top - 1, w + 4, 2)]); if (i % 2 === 0) b.push(['@stone.2', P([[x + 30, top - 8], [x + 65, top - 24], [x + 100, top - 8]])]); }
        else b.push(['@slate.' + (i % 2), P([[x - 2, top], [x + 8, top - 26], [x + w - 8, top - 26], [x + w + 2, top]])], ['@brick.2', R(x + w - 22, top - 40, 16, 16)], ['@pot', R(x + w - 20, top - 44, 4, 4)], ['@pot', R(x + w - 13, top - 44, 4, 4)]);
        // upper windows: sashes with stone heads and sills (bays on v2)
        for (let s = 1; s < st; s++) {
          const y = -gf - s * fh + 6;
          for (let k = 0; k < 3; k++) {
            const wx = x + 16 + k * 38, wy = y + 4;
            if (v === 2 && k === 1 && s === 1) { b.push(['@stone.2', P([[wx - 10, wy + 34], [wx - 6, wy - 2], [wx + 30, wy - 2], [wx + 34, wy + 34]])], { f: '@glass.0', d: R(wx - 4, wy + 2, 32, 28), glow: 'window' }); continue; }
            b.push(['@stone.0', R(wx - 3, wy - 4, 30, 4)], { f: '@glass.' + ((k + s + i) % 2), d: R(wx, wy, 24, 30), glow: 'window' }, ['@stone.0', R(wx - 2, wy + 30, 28, 3)]);
            b.push({ s: '@stone.2', w: .7, detail: true, d: `M${wx} ${wy + 15}h24M${wx + 12} ${wy}v30` });
          }
        }
        // the shopfront: fascia, glass, door, awning
        const fc = '@front.' + ((i * 2 + v) % 6), ac = '@awn.' + ((i + v * 2) % 6);
        b.push([fc, R(x + 2, -gf, w - 4, gf)], ['@stone.2', R(x, -gf - 4, w, 4)], [fc, R(x + 6, -gf + 2, w - 12, 10)]);
        b.push({ f: '@glass.' + (i % 2), d: R(x + 8, -gf + 16, w - 46, gf - 22), glow: 'lamp' }, ['@glass.2', R(x + 10, -gf + 18, 20, gf - 26), .3]);
        b.push(['@glass.0', R(x + w - 34, -gf + 16, 22, gf - 16)], { f: '@glass.1', d: R(x + w - 31, -gf + 19, 16, 14), glow: 'window' });
        b.push({ s: fc, w: 1.2, detail: true, d: `M${x + 8 + (w - 46) / 3} ${-gf + 16}v${gf - 22}M${x + 8 + 2 * (w - 46) / 3} ${-gf + 16}v${gf - 22}` });
        if ((i + v) % 3 !== 2) {
          b.push([ac, P([[x + 6, -gf + 12], [x + w - 6, -gf + 12], [x + w - 2, -gf + 30], [x + 2, -gf + 30]])]);
          b.push({ f: '@awn.5', d: lines(5, k => { const ax = x + 14 + k * 24; return `M${ax} ${-gf + 12}h10l1.4 18h-12.8z`; }), op: .7 });
        }
        b.push(['@stone.1', R(x, -6, w, 6)]);
        if (i > 0) b.push(['@stone.0', R(x - 3, top, 6, -top)]);
        void H;
      }
      b.push(['@stone.0', R(x0 - 3, -(gf + (storeys - 1) * fh + 14), 6, gf + (storeys - 1) * fh + 14)]);
      void rnd;
      return { body: b };
    },
  });

  /* ---------- a corner pub ---------- */
  sceneObjDefine({
    id: 'building.sheffield2-pub', category: 'building', size: [280, 200], variants: 3, seasonal: false, flippable: true, weight: 0,
    palette: { base: {
      brick: ['#8a4632', '#a05a40', '#6e3828'], stone: ['#d4c8ac', '#b0a284', '#a89c80'], slate: ['#4a4e56', '#5e646a'], tile: ['#2e5a3e', '#6a2626', '#22303e'],
      glass: ['#3a3020', '#6a5a3a', '#c8b88a'], gold: ['#d8b050'], iron: ['#2a2c2e'], flower: ['#d84a6a', '#e8c040', '#8a4ac0'], leaf: ['#3a6a2e'],
    } },
    night: { glow: { window: '#f8c870', lamp: '#ffe2a0' }, on: 0.85 },
    parts: ['body'], shadow: { rx: 140, ry: 10, h: 190 }, reflect: true,
    tags: ['uk', 'sheffield', 'pub', 'victorian', 'kelham', 'street', 'kit:urban', 'role:building-mid'],
    credit: 'drawn for the Sheffield area scenes (the corner pubs of Kelham Island and Neepsend; no names or signs)',
    build(v) {
      const b = [], X = 130, st = v === 2 ? 3 : 2, gf = 64, fh = 50, top = -(gf + (st - 1) * fh + 10);
      const wall = v === 1 ? '@stone.2' : '@brick.' + (v === 2 ? 2 : 0), tile = '@tile.' + v;
      b.push([wall, R(-X, top, 2 * X, -top)]);
      if (v !== 1) b.push({ s: '@brick.1', w: .5, op: .35, detail: true, d: lines(Math.floor((-top - gf) / 9), k => `M${-X} ${top + 6 + k * 9}h${2 * X}`) });
      else b.push({ s: '@stone.1', w: .7, op: .45, detail: true, d: lines(Math.floor((-top - gf) / 12), k => `M${-X} ${top + 8 + k * 12}h${2 * X}`) });
      // the roof and chimneys
      b.push(['@slate.0', P([[-X - 4, top], [-X + 14, top - 34], [X - 14, top - 34], [X + 4, top]])], ['@slate.1', P([[-X + 14, top - 34], [X - 14, top - 34], [X - 16, top - 30], [-X + 16, top - 30]]), .7]);
      for (const x of [-X + 24, X - 40]) b.push([wall, R(x, top - 52, 18, 20)], ['#a8603a', R(x + 2, top - 56, 5, 5)], ['#a8603a', R(x + 10, top - 56, 5, 5)]);
      // upper windows
      for (let s = 1; s < st; s++) for (let k = 0; k < 4; k++) {
        const x = -X + 20 + k * 62, y = -gf - s * fh + 8;
        b.push(['@stone.0', R(x - 3, y - 4, 32, 4)], { f: '@glass.' + ((k + s) % 2), d: R(x, y, 26, 34), glow: 'window' }, ['@stone.0', R(x - 2, y + 34, 30, 3)]);
        b.push({ s: '@stone.0', w: .7, detail: true, d: `M${x} ${y + 17}h26M${x + 13} ${y}v34` });
      }
      // the tiled ground floor, the big windows, the corner door and its lamp
      b.push([tile, R(-X, -gf, 2 * X, gf)], ['@stone.0', R(-X - 2, -gf - 5, 2 * X + 4, 5)], [tile, R(-X + 2, -gf + 1, 2 * X - 4, 12)]);
      b.push({ f: '@gold', d: R(-X + 10, -gf + 5, 2 * X - 20, 2), op: .8 });
      for (let k = 0; k < 3; k++) { const x = -X + 12 + k * 70; b.push(['@stone.0', R(x - 3, -gf + 16, 56, 40)], { f: '@glass.' + (k % 2 ? 1 : 0), d: R(x, -gf + 18, 50, 36), glow: 'window' }, { f: '@glass.2', d: R(x, -gf + 18, 50, 10), op: .5, glow: 'lamp' }); b.push({ s: '@stone.1', w: .8, detail: true, d: `M${x + 25} ${-gf + 18}v36M${x} ${-gf + 28}h50` }); }
      b.push(['@iron', arch(X - 44, -50, 30, 50)], { f: '@glass.1', d: arch(X - 40, -46, 22, 20), glow: 'lamp' });
      b.push(['@iron', R(X - 34, -gf - 20, 3, 14)], ['@iron', R(X - 40, -gf - 26, 14, 8)], { f: '#fff0c0', d: R(X - 38, -gf - 24, 10, 6), glow: 'lamp' });
      // hanging baskets
      for (const x of [-X + 40, -X + 180]) { b.push({ s: '@iron', w: 1, d: `M${x} ${-gf - 6}v-10h10` }, ['@leaf', ell(x, -gf + 6, 12, 8)]); for (let k = 0; k < 5; k++) b.push(['@flower.' + ((k + v) % 3), ell(x - 8 + k * 4, -gf + 4 + (k % 2) * 4, 2.6, 2.6)]); }
      b.push(['@stone.1', R(-X, -4, 2 * X, 4)]);
      return { body: b };
    },
  });

  /* ---------- a stone weir ---------- */
  sceneObjDefine({
    id: 'structure.sheffield2-weir', category: 'structure', size: [520, 50], variants: 1, seasonal: false, flippable: true, weight: 0,
    palette: { base: { stone: ['#9a8e74', '#7e7260', '#b8ac92'], moss: ['#5a6c3a'], water: ['#b8d8e2', '#eef8fb', '#8ab4c2'] } },
    parts: ['body', 'spray'], anim: { flicker: { part: 'spray', op: [0.55, 1], period: 1.4 } },
    shadow: { rx: 260, ry: 6, h: 20 }, reflect: true,
    tags: ['uk', 'sheffield', 'weir', 'river', 'heritage', 'kit:temperate', 'role:edge'],
    credit: 'drawn for the Sheffield area scenes (the weirs of the Don, the Rivelin and the Porter)',
    build() {
      const b = [], spray = [], X = 260;
      b.push(['@stone.1', P([[-X, -30], [X, -34], [X, 0], [-X, 0]])], ['@stone.2', P([[-X, -34], [X, -38], [X, -32], [-X, -28]])]);
      b.push({ s: '@stone.0', w: .9, op: .6, d: lines(26, i => `M${-X + i * 20} -32v12`) + lines(26, i => `M${-X + 10 + i * 20} -20v14`) });
      b.push(['@moss', P([[-X, -14], [-X + 80, -20], [-X + 160, -10], [-X + 160, 0], [-X, 0]]), .5]);
      for (let i = 0; i < 26; i++) spray.push({ f: '@water.' + (i % 3), d: R(-X + i * 20 + 2, -32, 16, 14 + (i % 3) * 3), op: .75 });
      for (let i = 0; i < 12; i++) spray.push(['@water.1', ell(-X + 20 + i * 42, -2, 18, 3), .7]);
      return { body: b, spray };
    },
  });

  /* ---------- old headstones ---------- */
  sceneObjDefine({
    id: 'structure.sheffield2-headstones', category: 'structure', size: [120, 60], variants: 3, seasonal: false, flippable: true, weight: 0,
    palette: { base: { stone: ['#9a947e', '#7a745e', '#b4ae96', '#6a665a'], moss: ['#5e7040', '#7a8a4a'], lichen: ['#c8c070'] } },
    shadow: { rx: 60, ry: 5, h: 50 }, reflect: false,
    tags: ['uk', 'sheffield', 'cemetery', 'headstone', 'heritage', 'kit:temperate', 'role:edge'],
    credit: 'drawn for the Sheffield area scenes (the old headstones of the General Cemetery and Wardsend; plain, no symbols or lettering)',
    build(v, rnd) {
      const b = [], n = 3 + v;
      for (let i = 0; i < n; i++) {
        const x = -50 + i * (100 / (n - 1 || 1)) + (rnd() - .5) * 8, h = 34 + rnd() * 24, w = 16 + rnd() * 10, lean = (rnd() - .5) * 8, top = rnd() < .5;
        const d = top ? `M${f1(x - w / 2)} 0L${f1(x - w / 2 + lean)} ${f1(-h + w / 2)}A${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(x + w / 2 + lean)} ${f1(-h + w / 2)}L${f1(x + w / 2)} 0z` : P([[x - w / 2, 0], [x - w / 2 + lean, -h], [x + w / 2 + lean, -h - 3], [x + w / 2, 0]]);
        b.push(['@stone.' + (i % 4), d], ['@stone.2', P([[x - w / 2, 0], [x - w / 2 + lean, -h + 4], [x - w / 2 + lean + 3, -h + 4], [x - w / 2 + 3, 0]]), .5]);
        b.push(['@moss.' + (i % 2), ell(x + lean * .3, -2, w * .6, 3), .7], ['@lichen', ell(x + lean * .6, -h * .6, 3, 2), .5]);
      }
      return { body: b };
    },
  });

  /* ---------- festoon lights across a street ---------- */
  sceneObjDefine({
    id: 'street.sheffield2-festoon', category: 'street', size: [420, 40], variants: 2, seasonal: false, flippable: true, weight: 0,
    palette: { base: { wire: ['#2a2c30'], bulb: ['#f4e6c0', '#f0d080', '#e8b8a0'], glow: ['#ffe6a0'] } },
    night: { glow: { window: '#ffe0a0', lamp: '#ffe6a8' }, on: 1 },
    parts: ['body', 'lit'], anim: { sway: { part: 'body', pivot: [0, -40], deg: 0.6 } },
    tags: ['uk', 'sheffield', 'lights', 'night', 'street', 'kit:urban', 'role:street'],
    credit: 'drawn for the Sheffield area scenes (festoon lights over the streets of Kelham and Division Street)',
    build(v) {
      const b = [], lit = [], X = 210, sag = v ? 26 : 18;
      const at = (t) => [-X + t * 2 * X, -40 + 4 * sag * t * (1 - t)];
      b.push({ s: '@wire', w: 1.2, d: `M${-X} -40Q0 ${-40 + 2 * sag} ${X} -40` });
      for (let i = 1; i < 18; i++) { const [x, y] = at(i / 18); b.push({ f: '@bulb.' + ((i + v) % 3), d: ell(x, y + 4, 3, 3.6), glow: 'lamp' }); lit.push({ f: { rad: [[0, '@glow', .5], [1, '@glow', 0]], cx: f1(x), cy: f1(y + 4), r: 14 }, d: ell(x, y + 4, 14, 14) }); }
      return { body: b, lit };
    },
  });

  /* ---------- the football ground on Bramall Lane (generic: no crests, no lettering) ---------- */
  sceneObjDefine({
    id: 'landmark.sheffield2-bramall-lane', category: 'landmark', size: [760, 290], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#8a4232', '#6e3426', '#a65a44'], clad: ['#e8e6e0', '#c8c6c0'], red: ['#c8302a', '#a02420'], roof: ['#d8dcdc', '#9aa0a4', '#6a7074'],
      steel: ['#4a5056', '#c8ccd0'], glass: ['#2e3a44', '#5a6a78', '#b8c8d4'], gate: ['#2a2c30'], beam: ['#f4f8ff'], flood: ['#ffe8c0'],
    } },
    night: { glow: { window: '#f6d48a', lamp: '#fff4d8' }, on: 0.8 }, parts: ['body', 'lit'], shadow: { rx: 380, ry: 14, h: 220 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'football', 'stadium', 'bramall-lane', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (the football ground on Bramall Lane; generic, no crests or lettering)',
    build() {
      const b = [], lit = [], X = 340, H = 150;
      // the far stand roof showing behind
      b.push(['@roof.2', P([[-X + 40, -H - 10], [-X + 80, -H - 40], [X - 80, -H - 40], [X - 40, -H - 10]])]);
      // the stand: brick base, white cladding with red bands, the glazed lounge
      b.push(['@brick.0', R(-X, -60, 2 * X, 60)], ['@clad.0', R(-X, -H, 2 * X, H - 60)], ['@clad.1', R(X - 60, -H, 60, H - 60), .6]);
      b.push({ s: '@brick.1', w: .5, op: .4, detail: true, d: lines(6, i => `M${-X} ${-8 - i * 9}h${2 * X}`) });
      for (const y of [-H + 8, -86]) b.push(['@red.0', R(-X, y, 2 * X, 10)]);
      for (let k = 0; k < 20; k++) b.push({ f: '@glass.' + (k % 3 === 0 ? 1 : 0), d: R(-X + 12 + k * 33.6, -H + 26, 26, 22), glow: 'window' });
      b.push({ s: '@clad.1', w: .8, op: .7, d: lines(24, i => `M${f1(-X + i * 28.3)} ${-H + 18}V-90`) });
      // the turnstiles and gates along the base
      for (let k = 0; k < 10; k++) { const x = -X + 24 + k * 66; b.push(['@gate', R(x, -40, 30, 40)], ['@brick.2', R(x - 3, -44, 36, 4)], { f: '@glass.2', d: R(x + 4, -36, 22, 8), glow: 'lamp' }); }
      // the cantilever roof and its trusses
      b.push(['@roof.0', P([[-X - 14, -H - 4], [X + 14, -H - 4], [X + 8, -H - 22], [-X - 8, -H - 22]])], ['@roof.1', R(-X - 14, -H - 6, 2 * X + 28, 3)]);
      let tr = ''; for (let x = -X; x < X; x += 28) tr += `M${x} ${-H - 22}L${x + 14} ${-H - 40}L${x + 28} ${-H - 22}`;
      b.push({ s: '@steel.0', w: 1.4, d: tr + `M${-X} ${-H - 40}H${X}` });
      // the corner stand stepping down (right)
      b.push(['@clad.1', P([[X, 0], [X, -H + 10], [X + 40, -H + 40], [X + 40, 0]])], ['@red.1', R(X, -80, 40, 8)]);
      // the floodlight pylons: lattice masts, lamp banks, beams at night
      for (const s of [-1, 1]) {
        const px = s * (X + 4);
        b.push({ s: '@steel.0', w: 3, d: `M${px - 9} ${-H}L${px - 2} -258M${px + 9} ${-H}L${px + 2} -258` }, { s: '@steel.0', w: .9, d: lines(10, i => `M${f1(px - 9 + i * .7)} ${f1(-H - i * 10.8)}L${f1(px + 9 - (i + 1) * .7)} ${f1(-H - (i + 1) * 10.8)}`) });
        b.push(['@steel.0', R(px - 28, -290, 56, 34)]);
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) b.push({ f: '@steel.1', d: R(px - 25 + k * 13, -287 + r * 10.5, 11, 8), glow: 'lamp' });
        lit.push({ f: { lin: [[0, '@beam', .4], [1, '@beam', 0]], x1: px, y1: -270, x2: px - s * 240, y2: -60 }, d: `M${px - 26} -288L${px + 26} -258L${px - s * 300} -40L${px - s * 420} -130z` });
      }
      b.push(['@glass.2', `M${-X} ${-H + 20}L${-X + 120} ${-H + 20}L${-X} -90z`, .2]);
      lit.push(wash(0, -100, 420, `M${-X - 20} 0V-300H${X + 50}V0z`, .2));
      return { body: b, lit };
    },
  });
})();

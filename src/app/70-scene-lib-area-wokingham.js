/* ============================================================
   SCENE LIBRARY + ARCHETYPES: Wokingham, Berkshire
   (docs/dev/SCENE_ENGINE.md sections 2 and 8). PURE: sceneObjDefine and
   sceneArchetypeDefine calls inside IIFEs and nothing else; every build runs
   lazily (objects once per variant and season, scenes once when shown).

   The area: Wokingham town (the Victorian Gothic Town Hall of 1860 in the
   Market Place, All Saints' Church with its flint west tower, the Georgian
   and Victorian streets: Broad Street, Rose Street, Denmark Street), Elms
   Field park, the station and its level crossing on the Reading to Waterloo
   line, Dinton Pastures Country Park (the old gravel-pit lakes on the Loddon),
   and the Berkshire farmland and pine and heath woods round the town
   (California Country Park, Bearwood, the Finchampstead Ridges).

   Objects (this area's own):
     landmark.wokingham-town-hall     the Town Hall: polychrome brick, a pointed arcade, gabled windows, the clock tower and spire
     landmark.all-saints-wokingham    All Saints': the flint west tower with its battlements and pinnacles, nave and aisles
     landmark.wokingham-station       the station building: a brick plinth, glazing and a broad oversailing roof, the footbridge
     building.wokingham-street        a market-town house (4 variants: Georgian brick, painted with a shop, timber-framed, Victorian gabled)
     structure.level-crossing         a full-barrier level crossing: booms down, red lights, the yellow box
     street.market-stall              a striped market stall with its goods (3 variants)
   Archetypes (the scenes are data rows in 71-scene-uk-wokingham-*.js):
     wokingham-town     form: market | street | station (urban)
     wokingham-country  form: lake | park | woods | fields (natural or mixed)
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${R(x)} ${R(y)}h${R(w)}v${R(h)}h${R(-w)}z`;
  const poly = (...pts) => 'M' + pts.map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'z';
  const ell = (x, y, rx, ry) => sceneD.ell(x, y, rx, ry == null ? rx : ry);
  /** A pointed (Gothic) arch opening: x, top y of the springing, width, height to the foot. */
  const parch = (x, y, w, h) => `M${R(x)} ${R(y + h)}V${R(y)}Q${R(x)} ${R(y - w * 0.75)} ${R(x + w / 2)} ${R(y - w * 0.95)}Q${R(x + w)} ${R(y - w * 0.75)} ${R(x + w)} ${R(y)}V${R(y + h)}z`;
  const snowP = { snow: ['#eef2f6', '#d6dee6'] };

  /* ---------- Wokingham Town Hall ---------- */
  sceneObjDefine({
    id: 'landmark.wokingham-town-hall',
    category: 'landmark',
    size: [560, 420],
    variants: 1,
    seasonal: true,
    shapeBySeason: true,
    flippable: false,
    palette: {
      base: { brick: ['#a8503a', '#86392a', '#c26a50'], blue: ['#3a3440', '#2a2630'], stone: ['#e0d4b4', '#c2b490', '#f0e8d0'], roof: ['#565a62', '#3e424a', '#70747c'], glass: ['#33414f', '#8fa6ba'], door: ['#3a2a22'], clock: ['#f2ecd8', '#1e1e22'], gold: ['#c8a040'], flood: ['#ffe0a0'], flower: ['#d84a5a', '#f0c040', '#5a8a3a', '#e8e0f0'], creeper: ['#3e6a2e', '#5a8a3a', '#2e5226'] },
      spring: { flower: ['#e05a8a', '#f0d040', '#6a9a40', '#f4f0f8'] }, summer: {}, autumn: { flower: ['#b8562a', '#d89a3a', '#6a6a30', '#c8a060'], creeper: ['#b0302a', '#d0602a', '#8a2a22'] }, winter: Object.assign({ creeper: ['#6a5a4a', '#7a6a58', '#4a3e34'], roof: ['#7a7e86', '#5a5e66', '#969aa2'], brick: ['#98503e', '#7a3a2c', '#b06650'], flower: ['#4a5a40', '#6a6a5a', '#3a4a34', '#8a8a7a'] }, snowP),
    },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 260, ry: 14, h: 260 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/wokingham-town-hall', 'uk', 'berkshire', 'wokingham', 'town hall', 'gothic', 'brick', 'kit:temperate'],
    credit: 'drawn for the Wokingham area pack: the Town Hall, Market Place, Wokingham (1860)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx && ctx.season === 'winter';
      const x0 = -250, x1 = 250, eave = -190;
      // the main block: red brick, a dark-brick diaper over it, stone string courses
      P(['@brick.0', rect(x0, eave, x1 - x0, -eave)], ['@brick.1', rect(150, eave, 100, -eave), 0.45]);
      for (let row = 0; row < 7; row++) {
        let d = '';
        for (let i = 0; i < 20; i++) { const cx = x0 + 14 + i * 25 + (row % 2) * 12, cy = -100 - row * 13; if (cy < eave + 10) continue; d += `M${cx} ${cy - 5}l5 5l-5 5l-5-5z`; }
        P({ f: '@blue.0', d, op: 0.55, detail: true });
      }
      for (let y = -10; y > eave; y -= 7) P({ s: '@brick.1', w: 0.6, op: 0.3, detail: true, d: `M${x0} ${y}H${x1}` });
      P(['@stone.1', rect(x0 - 4, -8, x1 - x0 + 8, 8)], ['@stone.0', rect(x0 - 4, -96, x1 - x0 + 8, 6)], ['@stone.0', rect(x0 - 6, eave - 4, x1 - x0 + 12, 7)]);
      // the ground-floor arcade: six pointed arches in stone, glazed (the old open market hall)
      for (let i = 0; i < 6; i++) {
        const x = x0 + 16 + i * 80;
        P(['@stone.0', parch(x - 5, -62, 62, 62)], ['@stone.1', parch(x - 5, -62, 62, 62), 0.25]);
        P({ f: '@glass.0', d: parch(x, -58, 52, 58), glow: 'window' }, ['@glass.1', parch(x + 2, -56, 18, 30), 0.3]);
        P({ s: '@stone.2', w: 1.2, d: `M${x + 26} -100V0M${x} -30H${x + 52}` });
        for (let k = 0; k < 9; k++) { const a = Math.PI * (0.1 + k * 0.1); P({ f: k % 2 ? '@stone.1' : '@blue.0', op: 0.8, detail: true, d: rect(x + 26 - Math.cos(a) * 31 - 2, -62 - Math.sin(a) * 50 - 2, 4, 4) }); }
        if (i < 5) P(['@stone.1', rect(x + 58, -80, 14, 80)], ['@stone.2', rect(x + 58, -80, 5, 80), 0.6]);
      }
      // the doorway (centre left) with steps
      P(['@door', parch(-40, -48, 30, 48)], ['@stone.1', rect(-46, -4, 42, 4)]);
      // the steep slate roof behind the gables, its courses and the ridge cresting
      P(['@roof.0', poly([x0 - 10, eave], [x0 + 40, eave - 100], [x1 - 40, eave - 100], [x1 + 10, eave])], ['@roof.1', poly([x1 - 70, eave - 100], [x1 - 40, eave - 100], [x1 + 10, eave], [x1 - 30, eave]), 0.6]);
      for (let i = 1; i < 9; i++) P({ s: '@roof.1', w: 0.8, op: 0.45, detail: true, d: `M${R(x0 - 10 + i * 5.6)} ${R(eave - i * 11)}H${R(x1 + 10 - i * 5.6)}` });
      for (let i = 0; i < 20; i++) P({ f: '@roof.1', d: `M${x0 + 46 + i * 21} ${eave - 100}l3-7l3 7z` });
      if (W) P(['@snow.0', poly([x0 - 10, eave], [x0 + 40, eave - 100], [x1 - 40, eave - 100], [x1 + 10, eave], [x1 - 4, eave - 6], [x1 - 46, eave - 92], [x0 + 46, eave - 92], [x0 + 4, eave - 6]), 0.9], ['@snow.1', rect(x0 - 4, -98, x1 - x0 + 8, 3)]);
      // first floor: tall two-light Gothic windows, each under its own steep gable rising through the eave
      for (let i = 0; i < 5; i++) {
        const x = x0 + 40 + i * 90, gw = 70;
        P(['@brick.2', poly([x - 6, eave + 4], [x + gw / 2, eave - 64], [x + gw + 6, eave + 4])], ['@brick.1', poly([x + gw / 2, eave - 64], [x + gw + 6, eave + 4], [x + gw / 2, eave + 4]), 0.4]);
        P(['@stone.0', poly([x - 10, eave + 6], [x + gw / 2, eave - 70], [x + gw + 10, eave + 6], [x + gw + 4, eave + 6], [x + gw / 2, eave - 60], [x - 4, eave + 6])]);
        P(['@stone.0', parch(x + 8, -164, 54, 64)], { f: '@glass.0', d: parch(x + 12, -160, 21, 58), glow: 'window' }, { f: '@glass.0', d: parch(x + 37, -160, 21, 58), glow: 'window' });
        P({ f: '@glass.0', d: ell(x + 35, -176, 7), glow: 'window' }, ['@glass.1', parch(x + 13, -158, 8, 24), 0.35], ['@stone.2', rect(x + 30, -166, 3, 66)]);
        P({ f: '@blue.0', d: ell(x + 35, eave - 30, 6), op: 0.85 }, { s: '@stone.0', w: 1, d: ell(x + 35, eave - 30, 6) });
        P({ f: '@stone.2', d: poly([x + gw / 2 - 3, eave - 64], [x + gw / 2, eave - 78], [x + gw / 2 + 3, eave - 64]) });
      }
      // chimneys
      for (const x of [-210, 200]) P(['@brick.1', rect(x, eave - 140, 18, 50)], ['@stone.1', rect(x - 2, eave - 144, 22, 6)], ['@brick.0', rect(x + 2, eave - 150, 5, 6)], ['@brick.0', rect(x + 10, eave - 150, 5, 6)]);
      // the clock tower: a square brick stage rising from the roof, the clock faces, a belfry and the steep spire
      const tx = -30, tw = 60, tb = eave - 60, tt = tb - 90;
      P(['@brick.0', rect(tx, tt, tw, tb - tt + 60)], ['@brick.1', rect(tx + tw - 16, tt, 16, tb - tt + 60), 0.5]);
      P(['@stone.0', rect(tx - 3, tt - 4, tw + 6, 6)], ['@stone.0', rect(tx - 3, tb - 40, tw + 6, 5)]);
      // the clock: a pale dial with hour marks and two hands (no figures)
      const cx = tx + tw / 2, cy = tb - 70;
      P(['@stone.0', ell(cx, cy, 19)], ['@clock.0', ell(cx, cy, 16)], { s: '@clock.1', w: 2.2, cap: 'round', d: `M${cx} ${cy}V${cy - 11}M${cx} ${cy}L${cx + 8} ${cy + 4}` });
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; P({ f: '@clock.1', d: rect(cx + Math.cos(a) * 13 - 1, cy + Math.sin(a) * 13 - 1, 2, 2) }); }
      // the belfry openings
      for (let k = 0; k < 2; k++) P(['@blue.1', parch(tx + 10 + k * 22, tt + 14, 16, 26)], { s: '@stone.1', w: 1, d: `M${tx + 10 + k * 22} ${tt + 28}h16` });
      P(['@stone.2', rect(tx - 6, tt - 10, tw + 12, 7)]);
      // the spire: a tall slate pyramid with lucarnes, a finial and a weathervane
      const sp = tt - 130;
      P(['@roof.0', poly([tx - 6, tt - 10], [cx, sp], [tx + tw + 6, tt - 10])], ['@roof.1', poly([cx, sp], [tx + tw + 6, tt - 10], [cx, tt - 10]), 0.55]);
      for (let i = 1; i < 8; i++) { const y = tt - 10 - i * 15, half = (tw / 2 + 6) * (1 - i * 15 / 120); P({ s: '@roof.1', w: 0.7, op: 0.5, detail: true, d: `M${R(cx - half)} ${y}H${R(cx + half)}` }); }
      P(['@stone.0', poly([cx - 9, tt - 36], [cx, tt - 58], [cx + 9, tt - 36])], ['@blue.1', rect(cx - 4, tt - 40, 8, 10)]);
      P({ s: '@gold', w: 2, d: `M${cx} ${sp}V${sp - 26}M${cx - 10} ${sp - 18}H${cx + 12}` }, { f: '@gold', d: poly([cx + 2, sp - 24], [cx + 14, sp - 20], [cx + 2, sp - 16]) }, { f: '@gold', d: ell(cx, sp - 4, 3) });
      // corner turret pinnacles at both ends
      for (const x of [x0 - 6, x1 - 8]) P(['@stone.1', rect(x, eave - 30, 14, 34)], ['@roof.0', poly([x - 2, eave - 30], [x + 7, eave - 62], [x + 16, eave - 30])]);
      // lamps on brackets either side of the door
      for (const x of [-60, 10]) P({ s: '@blue.1', w: 2, d: `M${x} -70h8v-6` }, { f: '@blue.1', d: rect(x + 4, -90, 10, 14) }, { f: '@glass.1', d: rect(x + 6, -88, 6, 10), glow: 'lamp' });
      // a creeper over both ends of the frontage
      for (const xs of [x0 + 2, x1 - 30]) for (let i = 0; i < 26; i++) P({ f: '@creeper.' + (i % 3), d: ell(xs + (i * 7) % 28, -6 - Math.floor(i / 2) * 11, 10, 8), op: 0.92 });
      // hanging flower baskets on the arcade piers (seasonal: summer bedding, autumn bronze, winter greenery)
      for (let i = 0; i < 5; i++) { const x = x0 + 81 + i * 80; P({ s: '@blue.1', w: 1, d: `M${x} -86v8` }, ['@flower.2', ell(x, -72, 10, 7)]); for (let k = 0; k < 6; k++) P({ f: '@flower.' + (k % 2 ? 0 : (k % 3 ? 1 : 3)), d: ell(x - 8 + k * 3.2, -76 + (k % 2) * 4, 3, 2.6) }); }
      const lit = [
        { f: { rad: [[0, '@flood', 0.32], [1, '@flood', 0]], cx: 0, cy: -60, r: 260 }, d: rect(x0, -200, x1 - x0, 200) },
        { f: { rad: [[0, '@flood', 0.3], [1, '@flood', 0]], cx, cy: tt, r: 120 }, d: rect(tx - 40, sp, tw + 80, tb - sp) },
        { f: '#fff4d0', d: ell(cx, cy, 15), op: 0.9 },
      ];
      return { body: b, lit };
    },
  });

  /* ---------- All Saints' Church, Wokingham ---------- */
  sceneObjDefine({
    id: 'landmark.all-saints-wokingham',
    category: 'landmark',
    size: [520, 330],
    variants: 1,
    seasonal: true,
    shapeBySeason: true,
    flippable: false,
    palette: {
      base: { flint: ['#7a766c', '#5e5a52', '#9a968a'], stone: ['#d4c8a4', '#b2a482', '#ece2c4'], roof: ['#8a5a44', '#6a4232', '#a8705a'], glass: ['#33414f', '#8fa6ba'], door: ['#3a2a22'], ivy: ['#3e5a2e', '#557a3a'], gold: ['#c8a040'], flood: ['#ffe4b0'] },
      spring: { ivy: ['#4e6e34', '#6a8a40'] }, summer: {}, autumn: { ivy: ['#7a4a26', '#a0662e'] }, winter: Object.assign({ ivy: ['#4a5440', '#5a6450'], roof: ['#9a7464', '#7a5646', '#b48a76'] }, snowP),
    },
    night: { glow: { window: '#f2c070', lamp: '#ffe2a0' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 240, ry: 14, h: 300 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/wokingham-all-saints', 'uk', 'berkshire', 'wokingham', 'church', 'flint', 'kit:temperate'],
    credit: "drawn for the Wokingham area pack: All Saints' Church, Wokingham",
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx && ctx.season === 'winter', r = sceneRnd(4411);
      const flintCourses = (x, y0, w, h) => { for (let row = 0; row < h / 9; row++) P({ f: '@flint.' + (row % 2 ? 2 : 1), op: 0.5, detail: true, d: Array.from({ length: Math.floor(w / 13) }, (_, i) => ell(x + 6 + i * 13 + (row % 2) * 6 + r() * 2, y0 - 6 - row * 9, 2.8, 1.8)).join('') }); };
      // the south aisle and the nave clerestory behind it, a long tiled roof
      P(['@flint.0', rect(-60, -120, 300, 120)], ['@flint.1', rect(170, -120, 70, 120), 0.4]);
      flintCourses(-60, 0, 300, 110);
      P(['@roof.0', poly([-66, -118], [-60, -150], [246, -150], [252, -118])], ['@flint.0', rect(-50, -186, 280, 36)], ['@roof.0', poly([-56, -184], [-40, -214], [230, -214], [242, -184])], ['@roof.1', poly([200, -214], [230, -214], [242, -184], [214, -184]), 0.5]);
      for (let i = 1; i < 5; i++) P({ s: '@roof.1', w: 0.8, op: 0.45, detail: true, d: `M${-56 + i * 4} ${-184 - i * 6}H${242 - i * 3}` });
      for (let i = 0; i < 6; i++) P({ f: '@glass.0', d: rect(-36 + i * 46, -178, 22, 18), glow: 'window' }, { s: '@stone.0', w: 1.2, d: rect(-36 + i * 46, -178, 22, 18) }, { s: '@stone.0', w: 1, d: `M${-25 + i * 46} -178v18` });
      // aisle windows: four-centred Perpendicular windows with tracery, buttresses between, a battlemented aisle parapet
      for (let i = 0; i < 5; i++) {
        const x = -44 + i * 58;
        P(['@stone.0', parch(x - 3, -88, 36, 72)], { f: '@glass.0', d: parch(x, -86, 30, 68), glow: 'window' }, { s: '@stone.0', w: 1.2, d: `M${x + 10} -86v68M${x + 20} -86v68M${x} -50h30` }, ['@glass.1', parch(x + 1, -84, 8, 24), 0.3]);
        P(['@stone.1', poly([x + 40, 0], [x + 40, -100], [x + 46, -110], [x + 52, -100], [x + 52, 0])], ['@stone.2', rect(x + 40, -100, 4, 100), 0.6]);
      }
      for (let i = 0; i < 15; i++) P(['@stone.1', rect(-60 + i * 20, -128, 12, 10)]);
      P(['@stone.1', rect(-62, -120, 304, 4)]);
      // the south porch
      P(['@flint.0', rect(50, -76, 56, 76)], ['@roof.0', poly([44, -74], [78, -112], [112, -74])], ['@door', parch(64, -44, 28, 44)], ['@stone.0', parch(61, -46, 34, 46), 0.35]);
      // the west tower: four stages of flint with stone quoins, diagonal buttresses, a stair turret, battlements and pinnacles
      const tx = -230, tw = 150, top = -280;
      P(['@flint.0', rect(tx, top, tw, -top)], ['@flint.1', rect(tx + tw - 40, top, 40, -top), 0.45]);
      flintCourses(tx, 0, tw, -top - 10);
      for (let y = -12; y > top; y -= 18) P(['@stone.0', rect(tx, y, 12, 9)], ['@stone.0', rect(tx + tw - 12, y - 9, 12, 9)], ['@stone.1', rect(tx + tw - 12, y, 12, 9), 0.8]);
      for (const y of [-90, -170, -228]) P(['@stone.1', rect(tx - 4, y, tw + 8, 6)]);
      // diagonal buttresses at the corners, stepped
      for (const [x, s] of [[tx - 16, 1], [tx + tw - 2, -1]]) for (let k = 0; k < 3; k++) P(['@stone.1', rect(x + (s < 0 ? 0 : 0), -80 * (k + 1), 18 - k * 4, 80)], ['@stone.2', rect(x, -80 * (k + 1), 4, 80), 0.6], ['@stone.0', poly([x, -80 * (k + 1)], [x + 18 - k * 4, -80 * (k + 1)], [x + 18 - k * 4, -80 * (k + 1) - 8])]);
      // the west door and great west window, the bell openings, the clock dial
      P(['@stone.0', parch(tx + 52, -56, 46, 56)], ['@door', parch(tx + 57, -52, 36, 52)]);
      P(['@stone.0', parch(tx + 44, -158, 62, 60)], { f: '@glass.0', d: parch(tx + 48, -154, 54, 54), glow: 'window' }, { s: '@stone.0', w: 1.3, d: `M${tx + 61} -154v54M${tx + 75} -154v54M${tx + 89} -154v54M${tx + 48} -128h54` });
      for (let k = 0; k < 2; k++) P(['@stone.0', parch(tx + 34 + k * 50, -220, 32, 44)], ['@glass.0', parch(tx + 38 + k * 50, -216, 24, 40)], { s: '@stone.1', w: 1.6, d: `M${tx + 38 + k * 50} -206h24M${tx + 38 + k * 50} -196h24M${tx + 38 + k * 50} -186h24` });
      P(['@stone.0', ell(tx + tw / 2, -246, 13)], ['@glass.0', ell(tx + tw / 2, -246, 10)], { s: '@gold', w: 1.8, cap: 'round', d: `M${tx + tw / 2} -246v-7M${tx + tw / 2} -246l5 3` });
      // battlements: merlons with a stone coping, and four crocketed corner pinnacles with a vane
      P(['@stone.1', rect(tx - 4, top - 4, tw + 8, 6)]);
      for (let i = 0; i < 8; i++) P(['@stone.1', rect(tx - 2 + i * 20, top - 18, 12, 14)], ['@stone.2', rect(tx - 2 + i * 20, top - 20, 12, 3)]);
      for (const x of [tx - 6, tx + tw - 8]) {
        P(['@stone.1', rect(x, top - 34, 14, 34)], ['@stone.0', poly([x - 2, top - 34], [x + 7, top - 66], [x + 16, top - 34])]);
        for (let k = 0; k < 3; k++) P({ f: '@stone.2', d: poly([x + 2 + k * 1.5, top - 42 - k * 8], [x - 1 + k * 1.5, top - 46 - k * 8], [x + 3 + k * 1.5, top - 44 - k * 8]) }, { f: '@stone.2', d: poly([x + 12 - k * 1.5, top - 42 - k * 8], [x + 15 - k * 1.5, top - 46 - k * 8], [x + 11 - k * 1.5, top - 44 - k * 8]) });
        P({ f: '@gold', d: ell(x + 7, top - 68, 2.5) });
      }
      // the stair turret on the south-east corner, rising above the parapet
      P(['@flint.1', rect(tx + tw - 4, top - 10, 26, 140)], ['@stone.1', rect(tx + tw - 6, top - 14, 30, 6)], ['@roof.0', poly([tx + tw - 6, top - 14], [tx + tw + 9, top - 34], [tx + tw + 24, top - 14])]);
      for (let k = 0; k < 4; k++) P({ f: '@glass.0', d: rect(tx + tw + 6, top + 20 + k * 28, 4, 10), glow: 'window' });
      P({ s: '@gold', w: 1.8, d: `M${tx + tw + 9} ${top - 34}v-18M${tx + tw + 3} ${top - 46}h12` });
      // ivy climbing the tower foot and the porch
      for (let i = 0; i < 14; i++) P({ f: i % 2 ? '@ivy.0' : '@ivy.1', d: ell(tx + 6 + (i % 5) * 9 + r() * 4, -8 - Math.floor(i / 5) * 16 - r() * 8, 9, 7), op: 0.92 });
      for (let i = 0; i < 6; i++) P({ f: i % 2 ? '@ivy.0' : '@ivy.1', d: ell(104 + r() * 6, -10 - i * 10, 7, 6), op: 0.9 });
      // the lamp by the porch
      P({ s: '@flint.1', w: 2, d: 'M124 0V-50' }, { f: '@flint.1', d: rect(119, -62, 10, 12) }, { f: '@glass.1', d: rect(121, -60, 6, 8), glow: 'lamp' });
      if (W) P(['@snow.0', poly([-56, -184], [-40, -214], [230, -214], [242, -184], [226, -190], [-40, -190]), 0.85], ['@snow.0', poly([-66, -118], [-60, -150], [246, -150], [252, -118], [238, -124], [-52, -124]), 0.85], ['@snow.1', rect(tx - 4, top - 6, tw + 8, 3)]);
      const lit = [
        { f: { rad: [[0, '@flood', 0.36], [1, '@flood', 0]], cx: tx + tw / 2, cy: -150, r: 200 }, d: rect(tx - 40, top - 80, tw + 80, 300) },
        { f: { rad: [[0, '@flood', 0.16], [1, '@flood', 0]], cx: 100, cy: -80, r: 200 }, d: rect(-60, -220, 300, 220) },
      ];
      return { body: b, lit };
    },
  });

  /* ---------- Wokingham station ---------- */
  sceneObjDefine({
    id: 'landmark.wokingham-station',
    category: 'landmark',
    size: [600, 200],
    variants: 1,
    seasonal: true,
    shapeBySeason: true,
    flippable: false,
    palette: {
      base: { brick: ['#8a5442', '#6c3e30', '#a46a54'], glass: ['#3c4c5a', '#9ab4c6', '#c8dae6'], roof: ['#4a4e54', '#363a40', '#62666c'], soffit: ['#b48a5c', '#94704a'], steel: ['#d8dcde', '#9aa2a8', '#5a6268'], plat: ['#a8a29a', '#8a847c'], edge: ['#e6d36a'], flood: ['#fff0c8'], leaf: ['#4e7a34', '#6a9a40'], flower: ['#d84a5a', '#f0c040', '#5a8a3a', '#e8e0f0'] },
      spring: { flower: ['#e05a8a', '#f0d040', '#6a9a40', '#f4f0f8'] }, summer: {}, autumn: { leaf: ['#8a6a2a', '#b07a30'], flower: ['#b8562a', '#d89a3a', '#6a6a30', '#c8a060'] }, winter: Object.assign({ roof: ['#5a5e64', '#464a50', '#72767c'], leaf: ['#4a5440', '#5a6450'], flower: ['#4a5a40', '#6a6a5a', '#3a4a34', '#8a8a7a'] }, snowP),
    },
    night: { glow: { window: '#ffe6a8', lamp: '#fff0c8' }, on: 1 },
    parts: ['body', 'lit'],
    shadow: { rx: 280, ry: 12, h: 120 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/wokingham-station', 'uk', 'berkshire', 'wokingham', 'station', 'railway', 'kit:temperate'],
    credit: 'drawn for the Wokingham area pack: the station building and footbridge, Wokingham',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx && ctx.season === 'winter';
      // the platform in front
      P(['@plat.0', rect(-300, -14, 600, 14)], ['@plat.1', rect(-300, -4, 600, 4)], ['@edge', rect(-300, -2, 600, 2)]);
      // the ticket hall: brick ends, a glazed front with mullions, a door pair
      P(['@brick.0', rect(-170, -110, 40, 96)], ['@brick.0', rect(110, -110, 40, 96)], ['@brick.1', rect(130, -110, 20, 96), 0.5]);
      for (let y = -20; y > -110; y -= 6) P({ s: '@brick.1', w: 0.6, op: 0.4, detail: true, d: `M-170 ${y}h40M110 ${y}h40` });
      P(['@glass.0', rect(-130, -110, 240, 96)]);
      for (let i = 0; i < 12; i++) P({ f: '@glass.1', d: rect(-128 + i * 20, -108, 17, 60), glow: 'window', op: 0.9 }, { f: '@glass.2', d: rect(-128 + i * 20, -108, 6, 20), op: 0.35 });
      for (let i = 0; i <= 12; i++) P({ f: '@steel.2', d: rect(-130 + i * 20, -110, 2.4, 96) });
      P(['@steel.2', rect(-130, -48, 240, 3)], ['@steel.1', rect(-20, -46, 40, 32)], { f: '@glass.1', d: rect(-18, -44, 17, 30), glow: 'window' }, { f: '@glass.1', d: rect(1, -44, 17, 30), glow: 'window' });
      // the broad oversailing roof: a shallow monopitch with a timber soffit and slim steel columns
      P(['@roof.0', poly([-210, -116], [190, -134], [196, -126], [-210, -108])], ['@soffit.0', poly([-210, -108], [196, -126], [196, -120], [-206, -104])], ['@roof.2', poly([-210, -116], [190, -134], [190, -132], [-210, -114]), 0.7]);
      for (let i = 0; i < 20; i++) P({ s: '@soffit.1', w: 0.8, op: 0.6, detail: true, d: `M${-200 + i * 20} ${R(-106 - i * 0.9)}l0 3` });
      for (const x of [-196, 180]) P(['@steel.1', rect(x, -122, 4, 108)]);
      // the platform canopy running away to the right on its columns
      P(['@roof.1', rect(150, -96, 150, 8)], ['@soffit.0', rect(150, -88, 150, 3)]);
      for (let i = 0; i < 5; i++) P(['@steel.1', rect(170 + i * 30, -88, 3, 74)], { f: '@steel.0', d: rect(166 + i * 30, -88, 11, 3) });
      for (let i = 0; i < 4; i++) P({ f: '@glass.2', d: rect(178 + i * 30, -82, 12, 4), glow: 'lamp' });
      // the footbridge: two lift towers and a glazed span
      const fb = -176;
      for (const x of [-290, -230]) P(['@steel.2', rect(x, fb, 34, fb * -1 - 14)], ['@glass.0', rect(x + 4, fb + 6, 26, -fb - 30)], { f: '@glass.1', d: rect(x + 6, fb + 10, 22, 30), glow: 'window' }, ['@roof.0', rect(x - 3, fb - 6, 40, 7)]);
      P(['@steel.2', rect(-290, fb - 2, 320, 22)], ['@roof.0', rect(-294, fb - 8, 328, 7)]);
      for (let i = 0; i < 16; i++) P({ f: '@glass.1', d: rect(-288 + i * 20, fb + 2, 16, 14), glow: 'window', op: 0.85 });
      for (let i = 0; i < 6; i++) P({ s: '@steel.0', w: 1.4, d: `M${-290 + i * 64} ${fb + 20}l32-20l32 20` });
      P(['@steel.2', rect(14, fb + 18, 16, -fb - 32)]);
      // the platform lamp posts, a bench and the cycle racks
      for (const x of [-170, 220, 290]) P({ s: '@steel.2', w: 2.2, d: `M${x} -14V-74h10` }, { f: '@steel.2', d: rect(x + 6, -78, 14, 4) }, { f: '@glass.2', d: rect(x + 7, -74, 12, 2), glow: 'lamp' });
      P(['@soffit.1', rect(60, -30, 40, 4)], { s: '@steel.2', w: 1.6, d: 'M64-26v12M96-26v12' });
      for (let i = 0; i < 5; i++) P({ s: '@steel.1', w: 1.6, d: `M${-260 + i * 14} -14q0-16 8-16q8 0 8 16` });
      // planters along the platform
      for (const x of [-120, 30, 250]) { P(['@steel.2', rect(x, -30, 44, 16)], ['@leaf.0', ell(x + 22, -32, 24, 9)], ['@leaf.1', ell(x + 16, -36, 12, 6)]); for (let k = 0; k < 5; k++) P({ f: '@flower.' + (k % 3), d: ell(x + 6 + k * 8, -36 - (k % 2) * 3, 3.4, 3) }); }
      if (W) P(['@snow.0', poly([-210, -116], [190, -134], [190, -140], [-210, -122]), 0.9], ['@snow.0', rect(-294, fb - 12, 328, 4)], ['@snow.0', rect(150, -100, 150, 4)]);
      const lit = [
        { f: { rad: [[0, '@flood', 0.34], [1, '@flood', 0]], cx: -10, cy: -40, r: 240 }, d: rect(-260, -140, 500, 140) },
        { f: { rad: [[0, '@flood', 0.26], [1, '@flood', 0]], cx: 220, cy: -20, r: 140 }, d: rect(120, -100, 200, 100) },
      ];
      return { body: b, lit };
    },
  });

  /* ---------- a Wokingham street house ---------- */
  sceneObjDefine({
    id: 'building.wokingham-street',
    category: 'building',
    size: [220, 250],
    variants: 4,
    seasonal: true,
    shapeBySeason: true,
    flippable: true,
    palette: {
      base: { brick: ['#a4553c', '#82402c', '#bc6c50'], paint: ['#ece4d2', '#cfc6b2', '#f6f0e2'], timber: ['#2e2622', '#4a3c32'], plaster: ['#efe6cc', '#d4c8a8'], tile: ['#9a5a40', '#7a4430', '#b4705a'], slate: ['#5a5e64', '#43474c'], glass: ['#33414f', '#8fa6ba'], door: ['#2c3e5a', '#5a2a2a', '#2e4a36'], trim: ['#f4f0e6', '#c8c0ae'], shop: ['#2e4a3e', '#6a2e2e', '#2a3a5a'], awn: ['#e8e2d4'], flower: ['#d84a5a', '#f0c040', '#5a8a3a'], creeper: ['#3e6a2e', '#5a8a3a', '#2e5226'] },
      spring: { flower: ['#e05a8a', '#f0d040', '#6a9a40'], creeper: ['#5a8a3a', '#7aa848', '#3e6a2e'] }, summer: {}, autumn: { flower: ['#c86a2a', '#e0a040', '#7a7a3a'], creeper: ['#b0302a', '#d0602a', '#8a2a22'] }, winter: Object.assign({ flower: ['#5a6a4a', '#7a7a6a', '#4a5a40'], tile: ['#a46a52', '#84503e', '#bc8068'], creeper: ['#6a5a4a', '#7a6a58', '#4a3e34'] }, snowP),
    },
    night: { glow: { window: '#f6c878', lamp: '#ffe2a0' }, on: 0.55 },
    parts: ['body', 'lit'],
    shadow: { rx: 110, ry: 10, h: 200 },
    reflect: false,
    tags: ['uk', 'berkshire', 'wokingham', 'market town', 'georgian', 'victorian', 'house', 'shop', 'kit:temperate', 'kit:urban', 'role:building-mid'],
    credit: 'drawn for the Wokingham area pack: market-town houses of Broad Street, Rose Street and the Market Place',
    build(v, rnd, ctx) {
      const b = [], lit = [], P = (...s) => b.push(...s), W = ctx && ctx.season === 'winter';
      const sash = (x, y, w, h) => { P(['@trim.0', rect(x - 2, y - 2, w + 4, h + 4)], { f: '@glass.0', d: rect(x, y, w, h), glow: 'window' }, ['@glass.1', rect(x + 1, y + 1, w * 0.4, h * 0.4), 0.3], { s: '@trim.0', w: 1, d: `M${x} ${y + h / 2}h${w}M${x + w / 3} ${y}v${h}M${x + 2 * w / 3} ${y}v${h}` }); };
      const shopfront = (x0, x1, col) => {
        P([col, rect(x0, -74, x1 - x0, 74)], ['@trim.1', rect(x0, -78, x1 - x0, 8)], [col, rect(x0 + 2, -76, x1 - x0 - 4, 4), 0.6]);
        P({ f: '@glass.0', d: rect(x0 + 8, -64, (x1 - x0) * 0.58, 50), glow: 'window' }, ['@glass.1', rect(x0 + 10, -62, 14, 46), 0.3], ['@trim.0', rect(x0 + 6, -14, (x1 - x0) * 0.58 + 4, 4)]);
        for (let i = 1; i < 4; i++) P({ s: '@trim.0', w: 1, d: `M${R(x0 + 8 + i * (x1 - x0) * 0.145)} -64v50` });
        P(['@door.0', rect(x1 - 36, -60, 24, 60)], { f: '@glass.1', d: rect(x1 - 32, -56, 16, 20), glow: 'window' });
        // the striped awning, rolled out
        P(['@awn', poly([x0 + 4, -74], [x1 - 40, -74], [x1 - 34, -56], [x0 - 2, -56])]);
        for (let i = 0; i < 7; i++) { const t0 = i / 7, t1 = (i + 0.5) / 7; P({ f: col, d: poly([x0 + 4 + t0 * (x1 - x0 - 44), -74], [x0 + 4 + t1 * (x1 - x0 - 44), -74], [x0 - 2 + t1 * (x1 - x0 - 32), -56], [x0 - 2 + t0 * (x1 - x0 - 32), -56]) }); }
        lit.push({ f: { rad: [[0, '#ffe2a0', 0.4], [1, '#ffe2a0', 0]], cx: (x0 + x1) / 2, cy: -10, r: 90 }, d: rect(x0 - 30, -70, x1 - x0 + 60, 80) });
      };
      const chimney = (x, y) => P(['@brick.1', rect(x, y - 34, 20, 36)], ['@trim.1', rect(x - 2, y - 38, 24, 5)], ['@tile.1', rect(x + 3, y - 46, 6, 8)], ['@tile.1', rect(x + 11, y - 44, 6, 6)]);
      const box = (x, y) => { P(['@timber.1', rect(x, y, 34, 6)]); for (let i = 0; i < 5; i++) P({ f: '@flower.' + (i % 3), d: ell(x + 4 + i * 6.5, y - 1, 3.6, 3) }); };
      if (v === 0) {
        // Georgian: three storeys of red brick, a parapet, three bays of sashes, a pedimented doorcase with fanlight
        P(['@brick.0', rect(-100, -220, 200, 220)], ['@brick.1', rect(60, -220, 40, 220), 0.4]);
        for (let y = -8; y > -220; y -= 8) P({ s: '@brick.1', w: 0.6, op: 0.3, detail: true, d: `M-100 ${y}H100` });
        P(['@trim.0', rect(-104, -226, 208, 8)], ['@trim.1', rect(-100, -150, 200, 4)], ['@slate.0', poly([-96, -226], [-70, -250], [70, -250], [96, -226])]);
        chimney(-80, -244); chimney(56, -244);
        for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) if (!(row === 0 && i === 1)) sash(-80 + i * 62, -206 + row * 70, 36, row === 2 ? 34 : 46);
        P(['@trim.0', rect(-22, -70, 44, 70)], ['@door.0', rect(-14, -56, 28, 56)], ['@trim.0', poly([-28, -70], [0, -90], [28, -70])], { f: '@glass.1', d: 'M-14-58a14 12 0 0 1 28 0z', glow: 'window' });
        for (let i = 0; i < 4; i++) P({ s: '@door.0', w: 0.8, op: 0.6, d: `M${-10 + i * 7} -50v36` });
        for (let i = -1; i <= 1; i += 2) for (let k = 0; k < 5; k++) P({ f: '@trim.0', d: rect(i * 70 - 3 + k * 0, -220 + k * 44, 6, 6), op: 0.5, detail: true });
        box(-97, -124); box(63, -124);
      } else if (v === 1) {
        // painted Georgian: two storeys, rendered and painted, a tiled roof with two dormers, a shop below
        P(['@paint.0', rect(-100, -170, 200, 170)], ['@paint.1', rect(60, -170, 40, 170), 0.5]);
        P(['@tile.0', poly([-106, -168], [-80, -230], [80, -230], [106, -168])], ['@tile.1', poly([50, -230], [80, -230], [106, -168], [70, -168]), 0.5]);
        for (let i = 1; i < 6; i++) P({ s: '@tile.1', w: 0.7, op: 0.5, detail: true, d: `M${-106 + i * 4.3} ${-168 - i * 10.3}H${106 - i * 4.3}` });
        for (const x of [-60, 30]) P(['@paint.0', rect(x, -214, 32, 30)], ['@tile.1', poly([x - 4, -212], [x + 16, -230], [x + 36, -212])], { f: '@glass.0', d: rect(x + 6, -208, 20, 20), glow: 'window' }, { s: '@trim.0', w: 1, d: `M${x + 16} -208v20M${x + 6} -198h20` });
        chimney(70, -228);
        for (let i = 0; i < 3; i++) sash(-80 + i * 62, -150, 36, 46);
        P(['@trim.1', rect(-100, -96, 200, 4)]);
        shopfront(-96, 96, '@shop.' + (Math.floor(rnd() * 3)));
      } else if (v === 2) {
        // timber-framed: a jettied upper floor in black and white, a steep tiled roof, leaded casements
        P(['@plaster.0', rect(-90, -100, 180, 100)], ['@plaster.0', rect(-100, -190, 200, 92)], ['@timber.0', rect(-102, -102, 204, 6)]);
        for (let i = 0; i <= 8; i++) P(['@timber.0', rect(-100 + i * 24.5, -190, 5, 92)]);
        for (let i = 0; i < 4; i++) P({ s: '@timber.0', w: 4, d: `M${-96 + i * 49} -100L${-72 + i * 49} -150` });
        P(['@timber.0', rect(-100, -150, 200, 4)]);
        for (let i = 0; i <= 6; i++) P(['@timber.0', rect(-90 + i * 29, -100, 5, 100)]);
        P(['@tile.0', poly([-110, -188], [-40, -262], [40, -262], [110, -188])], ['@tile.1', poly([10, -262], [40, -262], [110, -188], [60, -188]), 0.5]);
        for (let i = 1; i < 7; i++) P({ s: '@tile.1', w: 0.7, op: 0.5, detail: true, d: `M${-110 + i * 10} ${-188 - i * 10.5}H${110 - i * 10}` });
        chimney(-30, -258);
        for (const x of [-70, 20]) { P({ f: '@glass.0', d: rect(x, -140, 50, 34), glow: 'window' }); for (let k = 1; k < 5; k++) P({ s: '@timber.1', w: 0.8, op: 0.7, d: `M${x + k * 10} -140v34` }); P({ s: '@timber.1', w: 0.8, op: 0.7, d: `M${x} -123h50` }); }
        P({ f: '@glass.0', d: rect(-60, -76, 50, 40), glow: 'window' }, { s: '@timber.1', w: 0.8, d: 'M-50-76v40M-40-76v40M-30-76v40M-20-76v40M-60-56h50' });
        P(['@door.1', rect(20, -66, 30, 66)], ['@timber.0', rect(16, -70, 38, 5)]);
        box(-62, -36);
      } else {
        // Victorian: red brick with a front gable, a canted bay window, stone dressings and a shop at street level
        P(['@brick.0', rect(-100, -190, 200, 190)], ['@brick.1', rect(60, -190, 40, 190), 0.4]);
        for (let y = -8; y > -190; y -= 8) P({ s: '@brick.1', w: 0.6, op: 0.3, detail: true, d: `M-100 ${y}H100` });
        P(['@slate.0', poly([-106, -188], [-80, -230], [80, -230], [106, -188])]);
        P(['@brick.0', poly([-40, -186], [10, -258], [60, -186])], ['@trim.0', poly([-48, -184], [10, -266], [68, -184], [60, -184], [10, -254], [-40, -184])]);
        P({ f: '@glass.0', d: parch(-2, -226, 24, 30), glow: 'window' }, ['@trim.0', rect(-6, -196, 32, 4)]);
        // the bay
        P(['@trim.1', poly([-40, -100], [-30, -110], [50, -110], [60, -100])], ['@brick.2', rect(-36, -180, 92, 80)], ['@trim.0', rect(-40, -184, 100, 6)]);
        for (let i = 0; i < 3; i++) sash(-30 + i * 30, -170, 20, 52);
        sash(-84, -170, 30, 52); sash(70, -170, 22, 52);
        chimney(-90, -228);
        shopfront(-96, 96, '@shop.' + (Math.floor(rnd() * 3)));
      }
      // a creeper up one side of the frontage (green, then red in autumn, bare in winter)
      for (let i = 0; i < 16; i++) P({ f: '@creeper.' + (i % 3), d: ell(v % 2 ? 84 - (i % 3) * 6 : -86 + (i % 3) * 6, -8 - i * 9, 9 - (i % 4), 7), op: 0.92 });
      // a lamp bracket on the frontage
      P({ s: '@timber.0', w: 2, d: 'M-96-110h10v-6' }, { f: '@timber.0', d: rect(-90, -130, 10, 14) }, { f: '@glass.1', d: rect(-88, -128, 6, 10), glow: 'lamp' });
      if (W) P(['@snow.0', rect(-104, v === 2 ? -192 : v === 0 ? -230 : -172, 208, 4), 0.9]);
      lit.push({ f: { rad: [[0, '#ffe2a0', 0.25], [1, '#ffe2a0', 0]], cx: -85, cy: -122, r: 50 }, d: rect(-135, -170, 100, 100) });
      return { body: b, lit };
    },
  });

  /* ---------- a level crossing (barriers down) ---------- */
  sceneObjDefine({
    id: 'structure.level-crossing',
    category: 'structure',
    size: [360, 120],
    variants: 1,
    seasonal: false,
    flippable: true,
    palette: { base: { boom: ['#f2f0ea', '#d23a30'], post: ['#e8e2d0', '#4a4e54', '#2a2c30'], lamp: ['#ff3a2a', '#5a1a14'], box: ['#e6c84a'], road: ['#5e6062'] } },
    night: { glow: { lamp: '#ff5a40' }, on: 1 },
    parts: ['body'],
    shadow: { rx: 170, ry: 8, h: 80 },
    reflect: false,
    tags: ['uk', 'railway', 'level crossing', 'barrier', 'kit:temperate', 'kit:urban', 'role:street'],
    credit: 'drawn for the Wokingham area pack: a full-barrier level crossing',
    build() {
      const b = [], P = (...s) => b.push(...s);
      // the yellow box-junction hatching on the road
      P({ s: '@box', w: 2, op: 0.8, d: 'M-120 0L-80-10M-80 0L-40-10M-40 0L0-10M0 0L40-10M40 0L80-10M80 0L120-10' });
      for (const [x, s] of [[-170, 1], [170, -1]]) {
        // the barrier mechanism cabinet and post, the warning lights on their back board, the boom down across the road
        P(['@post.1', rect(x - 8, -40, 16, 40)], ['@post.2', rect(x - 8, -40, 16, 4)], ['@post.0', rect(x - 3, -90, 6, 50)]);
        P(['@post.2', rect(x - 16, -104, 32, 16)], { f: '@lamp.0', d: ell(x - 8, -96, 5), glow: 'lamp' }, { f: '@lamp.1', d: ell(x + 8, -96, 5) }, ['@post.0', rect(x - 18, -84, 36, 6)]);
        for (let k = 0; k < 4; k++) P({ f: '@lamp.0', d: poly([x - 18 + k * 9, -84], [x - 13 + k * 9, -84], [x - 18 + k * 9 + 9, -78], [x - 18 + k * 9 + 4, -78]) });
        const len = 150;
        P(['@boom.0', rect(s > 0 ? x : x - len, -38, len, 7)]);
        for (let k = 0; k < 6; k++) P({ f: '@boom.1', d: rect(s > 0 ? x + 8 + k * 24 : x - 20 - k * 24, -38, 12, 7) });
        for (let k = 0; k < 3; k++) P({ f: '@lamp.0', d: ell(s > 0 ? x + 40 + k * 44 : x - 40 - k * 44, -40, 2.2), glow: 'lamp' });
        P({ s: '@post.1', w: 1, d: `M${s > 0 ? x : x - len} -31h${len}`, op: 0.6 });
      }
      return { body: b };
    },
  });

  /* ---------- a market stall ---------- */
  sceneObjDefine({
    id: 'street.market-stall',
    category: 'street',
    size: [130, 120],
    variants: 3,
    seasonal: true,
    flippable: true,
    palette: {
      base: { canvas: ['#f0ece2'], stripe: ['#2e6a4a', '#b0342e', '#2a4e8a'], frame: ['#5a5e64', '#3a3e44'], cloth: ['#e8e2d0', '#c8c0aa'], crate: ['#a87a4a', '#86603a'], goods: ['#d84a3a', '#f0b030', '#6aa040', '#f08a3a', '#8a3a6a'] },
      spring: { goods: ['#e05a8a', '#f0d040', '#7ab048', '#f0f0e0', '#a04a8a'] }, summer: {}, autumn: { goods: ['#c86a2a', '#e0a040', '#8a7a3a', '#a03a2a', '#6a3a2a'] }, winter: { goods: ['#b03a3a', '#e8c040', '#3a6a3a', '#d06a2a', '#e8e4dc'] },
    },
    night: { glow: { lamp: '#ffe2a0' }, on: 0.8 },
    parts: ['body'],
    shadow: { rx: 64, ry: 6, h: 100 },
    reflect: false,
    tags: ['uk', 'market', 'stall', 'town', 'kit:temperate', 'kit:urban', 'role:street'],
    credit: 'drawn for the Wokingham area pack: a stall of the Market Place market',
    build(v) {
      const b = [], P = (...s) => b.push(...s), col = '@stripe.' + v;
      for (const x of [-58, 54]) P(['@frame.0', rect(x, -96, 4, 96)]);
      // the canopy: striped, with a scalloped valance
      P(['@canvas', poly([-66, -96], [-56, -116], [56, -116], [66, -96])]);
      for (let i = 0; i < 6; i++) { const a = -56 + i * 18.7, c = -66 + i * 22; P({ f: col, d: poly([a, -116], [a + 9.3, -116], [c + 11, -96], [c, -96]) }); }
      for (let i = 0; i < 8; i++) P({ f: i % 2 ? col : '@canvas', d: `M${-66 + i * 16.5} -96h16.5q0 8-8.2 8q-8.3 0-8.3-8z` });
      // the table, cloth, crates and goods
      P(['@cloth.0', rect(-60, -48, 120, 10)], ['@cloth.1', poly([-60, -38], [60, -38], [56, -14], [-56, -14])], ['@frame.1', rect(-54, -14, 4, 14)], ['@frame.1', rect(50, -14, 4, 14)]);
      for (let i = 0; i < 4; i++) {
        const x = -56 + i * 29;
        P(['@crate.0', rect(x, -60, 26, 13)], { s: '@crate.1', w: 0.8, d: `M${x} -54h26` });
        for (let k = 0; k < 5; k++) P({ f: '@goods.' + ((i + k + v) % 5), d: ell(x + 4 + k * 4.5, -62 - (k % 2) * 2, 3.6) });
      }
      P(['@crate.1', rect(-40, -12, 30, 12)], ['@crate.0', rect(14, -12, 30, 12)]);
      // a hanging lamp under the canopy
      P({ s: '@frame.1', w: 1, d: 'M0-96v8' }, { f: '@goods.1', d: ell(0, -84, 4), glow: 'lamp' });
      return { body: b };
    },
  });
})();

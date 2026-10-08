/* ============================================================
   SCENE LIBRARY: area-norwich (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

   The objects of the Norwich area builder: the city of Norwich and the Broads.
     landmark.norwich-cathedral   the long Norman nave, the arcaded crossing tower and the tall slender spire
     landmark.norwich-castle      the great square Norman keep with its tiers of blind arcading
     landmark.pulls-ferry         the flint watergate over the old canal and the ferry house beside it (on the Wensum)
     landmark.cow-tower           the round brick artillery tower on the bend of the Wensum
     landmark.norwich-forum       the horseshoe of glass between brick wings (the library and the square)
     landmark.erpingham-gate      the flint and stone gate into the Close from Tombland (no figures)
     building.norwich-market      a row of market stalls under striped canopies (three colour sets)
     building.elm-hill-house      a jettied, colour-washed timber-framed house under pantiles (three variants)
     boat.broads-cruiser          a white hire cruiser of the Broads (three trims)
     boat.broads-sail             a boat under sail: v0 a black-sailed trading wherry, v1 a gaff cruiser, v2 a bermudan yacht
   No text, no logos, no flags, no figures.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const def = d => sceneObjDefine(Object.assign({}, d, { build: (v, r, ctx) => tidy(d.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const pointed = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w * .55)}Q${f1(x + w * .05)} ${f1(y)} ${f1(x + w / 2)} ${f1(y - w * .15)}Q${f1(x + w * .95)} ${f1(y)} ${f1(x + w)} ${f1(y + w * .55)}V${f1(y + h)}z`;
  const round = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w / 2)}A${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(x + w)} ${f1(y + w / 2)}V${f1(y + h)}z`;
  /** Flint: many small cobbles over a rectangle, in three tones. */
  const flints = (push, r, x, y, w, h, n, keys) => { const s = ['', '', '']; for (let i = 0; i < n; i++) s[i % 3] += ell(rr(r, x + 2, x + w - 2), rr(r, y + 2, y + h - 2), rr(r, 1.2, 2.6), rr(r, .9, 1.8)); push({ f: keys[0], d: s[0], op: .85, detail: true }, { f: keys[1], d: s[1], op: .75, detail: true }, { f: keys[2], d: s[2], op: .6, detail: true }); };

  /* ---------- landmark.norwich-cathedral (from the south-west, across the lower Close; lit from the left) ---------- */
  def({
    id: 'landmark.norwich-cathedral', category: 'landmark', size: [760, 560], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#e4d8be', '#cbbb9c', '#f2ead6', '#ae9f82'], shade: ['#a09276', '#8a7e66', '#b6a98c'], lead: ['#7e848a', '#666c72', '#9ca2a8', '#575c62'],
      glass: ['#38424f', '#7c8ca2'], tracery: ['#ece2c8'], door: ['#3a2e26'], flood: ['#ffe2ae', '#fff0cc'],
    } },
    night: { glow: { window: '#f6c878', lamp: '#ffe6a8' }, on: 0.9 },
    parts: ['body', 'lit'],
    shadow: { rx: 380, ry: 18, h: 300 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/norwich', 'uk', 'norwich', 'cathedral', 'church', 'spire', 'kit:temperate'],
    credit: 'drawn for the Norwich area scenes (from public views of the cathedral from the Close)',
    build() {
      const b = [], lit = [], push = (...s) => b.push(...s);
      const rwin = (x, y, w, h) => push({ f: '@shade.1', d: round(x - 2, y - 2, w + 4, h + 3), detail: true }, { f: '@glass.0', d: round(x, y, w, h), glow: 'window' });
      const pwin = (x, y, w, h, mull) => { push(['@shade.1', pointed(x - 2, y - 2, w + 4, h + 3)], { f: '@glass.0', d: pointed(x, y, w, h), glow: 'window' }); let m = ''; for (let i = 1; i <= mull; i++) m += `M${f1(x + i * w / (mull + 1))} ${f1(y + w * .25)}V${f1(y + h)}`; push({ s: '@tracery', w: .9, d: m + `M${f1(x)} ${f1(y + h * .5)}h${f1(w)}`, op: .85, detail: true }); };
      // ---- the spire (behind everything): an octagon seen on the angle, lit face and shaded face, ribs, crockets, lucarnes
      const sx = 30, sb = -300, st = -560;
      push(['@stone.1', `M${sx - 40} ${sb}L${sx} ${st}L${sx + 40} ${sb}z`], ['@stone.2', `M${sx - 40} ${sb}L${sx} ${st}L${sx - 6} ${sb}z`, .7], ['@shade.0', `M${sx + 12} ${sb}L${sx} ${st}L${sx + 40} ${sb}z`, .55]);
      push({ s: '@shade.1', w: 1.4, d: `M${sx - 6} ${sb}L${sx} ${st}M${sx + 12} ${sb}L${sx} ${st}` });
      let crk = ''; for (let i = 1; i < 14; i++) { const t = i / 14, y = sb + (st - sb) * t, hw = 40 * (1 - t); crk += rect(sx - hw - 3, y, 4, 3) + rect(sx + hw - 1, y, 4, 3); }
      push({ f: '@stone.3', d: crk, detail: true });
      let band = ''; for (const t of [.22, .48, .72]) { const y = sb + (st - sb) * t, hw = 40 * (1 - t); band += `M${f1(sx - hw)} ${f1(y)}H${f1(sx + hw)}`; }
      push({ s: '@shade.1', w: 1.2, d: band, op: .7, detail: true });
      for (const [t, w] of [[.12, 12], [.36, 9], [.6, 6]]) { const y = sb + (st - sb) * t; for (const dx of [-14, 14]) { const x = sx + dx * (1 - t) - w / 2; push(['@stone.0', `M${f1(x - 2)} ${f1(y)}L${f1(x + w / 2)} ${f1(y - w * 1.4)}L${f1(x + w + 2)} ${f1(y)}V${f1(y + w * 1.5)}H${f1(x - 2)}z`], { f: '@glass.0', d: pointed(x + 1.5, y - w * .2, w - 3, w * 1.5), glow: 'window' }); } }
      push(['@stone.3', `M${sx - 2} ${st + 4}h4v-14h-4z`], ['@stone.2', ell(sx, st - 10, 3, 3)]);
      // ---- the crossing tower: four tiers of Norman decoration (blind arcade, roundels, lozenges, the belfry)
      const tx0 = -20, tx1 = 80;
      push(['@stone.1', rect(tx0, -300, tx1 - tx0, 130)], ['@stone.2', rect(tx0, -300, 24, 130), .5], ['@shade.0', rect(tx1 - 20, -300, 20, 130), .5]);
      for (let i = 0; i < 7; i++) { const x = tx0 + 6 + i * 13.2; push(['@shade.1', round(x, -196, 9, 22)]); }
      let lz = ''; for (let i = 0; i < 8; i++) { const x = tx0 + 8 + i * 12; lz += `M${x} -222l6 -8l6 8l-6 8z`; }
      push({ f: '@shade.1', d: lz, op: .85, detail: true });
      for (let i = 0; i < 4; i++) { const x = tx0 + 16 + i * 22; push(['@shade.1', ell(x, -246, 7, 7)], ['@stone.3', ell(x, -246, 3, 3)]); }
      for (let i = 0; i < 4; i++) { const x = tx0 + 7 + i * 23; push(['@shade.1', round(x - 1, -292, 18, 36)], { f: '@glass.0', d: round(x + 3, -286, 10, 28), glow: 'window' }); }
      push({ s: '@shade.1', w: 1, d: `M${tx0} -204H${tx1}M${tx0} -232H${tx1}M${tx0} -260H${tx1}`, op: .8 });
      push(['@stone.2', rect(tx0 - 4, -306, tx1 - tx0 + 8, 7)]);
      let cr = ''; for (let i = 0; i < 12; i++) cr += rect(tx0 - 2 + i * 9, -312, 5, 6);
      push(['@stone.0', cr]);
      for (const x of [tx0 - 4, tx1 - 4]) push(['@stone.0', rect(x, -324, 8, 26)], ['@stone.2', `M${x} -324l4 -16l4 16z`]);
      // ---- the east end (right): the presbytery with flying buttresses and the rounded apse
      push(['@stone.0', rect(80, -84, 220, 84)], ['@lead.1', 'M80 -84L80 -98H300V-84z'], ['@stone.1', rect(80, -176, 220, 80)]);
      push(['@lead.0', 'M76 -176L96 -196H300L306 -176z'], ['@lead.2', 'M96 -196H300l2 4H98z', .8]);
      for (let i = 0; i < 6; i++) { const x = 86 + i * 36; pwin(x + 8, -164, 16, 54, 2); rwin(x + 10, -74, 14, 44); push(['@shade.0', rect(x + 30, -96, 6, 96)], { s: '@stone.3', w: 3.5, d: `M${x + 33} -100Q${x + 33} -150 ${x + 20} -170`, op: .9 }, ['@stone.3', `M${x + 30} -100v-10l3 -10l3 10v10z`]); }
      push(['@stone.1', 'M300 0V-170Q330 -170 352 -150V0z'], ['@shade.0', 'M326 0V-165Q342 -160 352 -150V0z', .6], ['@lead.1', 'M298 -170Q332 -190 356 -150L352 -150Q330 -172 300 -168z']);
      rwin(314, -140, 12, 40); rwin(314, -74, 12, 44); push(['@glass.0', round(334, -72, 8, 40), .8]);
      // ---- the nave (left): aisle, gallery and clerestory, fourteen bays of round-headed windows, the long lead roof
      push(['@stone.0', rect(-330, -88, 312, 88)], ['@lead.1', 'M-330 -88L-330 -102H-18V-88z'], ['@stone.1', rect(-330, -168, 312, 72)]);
      push(['@lead.0', 'M-336 -168L-316 -192H-16L-10 -168z'], ['@lead.2', 'M-316 -192H-16L-14 -188H-314z', .8], ['@lead.3', 'M-336 -168H-10v3H-336z', .7]);
      const naveLo = ['', '']; let naveHi = '', naveSh = '';
      for (let i = 0; i < 14; i++) {
        const x = -326 + i * 22;
        naveLo[i < 7 ? 0 : 1] += round(x + 5, -76, 10, 40); naveHi += round(x + 5, -160, 10, 30); naveSh += round(x + 3, -78, 14, 43) + round(x + 3, -162, 14, 33);
        push(['@shade.0', `M${f1(x + 18)} 0V-88h4V0z`], ['@shade.0', `M${f1(x + 18)} -100V-168h3v68z`, .7]);
      }
      push({ f: '@shade.1', d: naveSh, detail: true }, { f: '@glass.0', d: naveLo[0], glow: 'window' }, { f: '@glass.0', d: naveLo[1], glow: 'window' }, { f: '@glass.0', d: naveHi, glow: 'window' });
      let pc = ''; for (let i = 0; i < 38; i++) pc += rect(-330 + i * 8.2, -173, 4.2, 5);
      push({ f: '@stone.1', d: pc, detail: true }, ['@stone.3', rect(-330, -6, 312, 6), .55]);
      // ---- the south transept (nearest, under the tower): gable, three tiers of round-headed windows, turrets
      push(['@stone.0', rect(-10, -168, 84, 168)], ['@stone.2', rect(-10, -168, 18, 168), .45], ['@shade.0', rect(58, -168, 16, 168), .5]);
      push(['@lead.0', 'M-14 -168L32 -212L78 -168z'], ['@stone.1', 'M-6 -168L32 -204L70 -168z']);
      push(['@stone.3', 'M-18 -176v-30h8v30zM70 -176v-30h8v30z'], ['@stone.2', 'M-18 -206l4 -10 4 10zM70 -206l4 -10 4 10z']);
      for (let t = 0; t < 3; t++) for (let i = 0; i < 3; i++) rwin(2 + i * 22, -156 + t * 48, 12, 32);
      push({ f: '@glass.0', d: ell(32, -188, 6, 6), glow: 'window' }, ['@tracery', ell(32, -188, 2, 2)]);
      push({ s: '@shade.1', w: 1, d: 'M-10 -116h84M-10 -66h84', op: .7 });
      push(['@door', round(22, -40, 20, 40)]);
      // ---- the west front (far left): the great window between corner turrets, the west door
      push(['@stone.2', rect(-380, -150, 52, 150)], ['@stone.0', rect(-362, -200, 34, 200)], ['@stone.2', 'M-366 -200L-345 -224L-326 -200z']);
      for (const x of [-386, -334]) push(['@stone.0', rect(x, -214, 10, 214)], ['@stone.3', `M${x} -214l5 -18l5 18z`]);
      pwin(-372, -178, 40, 110, 4);
      push(['@shade.1', pointed(-366, -56, 28, 56)], ['@door', pointed(-362, -50, 20, 50)]);
      push(['@stone.3', rect(-386, -6, 60, 6), .6]);
      // ---- the night look: floodlit spire, tower and west front (not graded)
      lit.push(['@flood.0', `M${sx - 44} ${sb}L${sx} ${st - 6}L${sx + 44} ${sb}z`, .14], ['@flood.0', rect(tx0 - 6, -326, tx1 - tx0 + 12, 326), .14], ['@flood.0', rect(-390, -232, 70, 232), .14], ['@flood.1', 'M-10 0L30 -40L70 0z', .16], ['@flood.1', 'M-390 0L-354 -40L-318 0z', .16]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.norwich-castle (the keep on its mound; anchor: the foot of the keep wall) ---------- */
  def({
    id: 'landmark.norwich-castle', category: 'landmark', size: [320, 230], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#e8dec6', '#d0c3a4', '#f4eedc', '#b4a688'], shade: ['#a4977a', '#8c8068', '#bcae90'], glass: ['#3a3e46', '#6a7280'], door: ['#3c3026'], flood: ['#ffe6b6', '#fff2d2'],
    } },
    night: { glow: { window: '#f8cc80' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 150, ry: 10, h: 200 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/norwich', 'uk', 'norwich', 'castle', 'norman', 'keep', 'kit:temperate'],
    credit: 'drawn for the Norwich area scenes (from public views of the keep above the market)',
    build() {
      const b = [], lit = [], push = (...s) => b.push(...s);
      // the forebuilding (Bigod's Tower) on the left, lower and set forward
      push(['@stone.1', rect(-160, -150, 52, 150)], ['@stone.2', rect(-160, -150, 14, 150), .5]);
      for (let i = 0; i < 3; i++) push(['@shade.1', round(-154 + i * 15, -128, 10, 30)]);
      for (let i = 0; i < 3; i++) push(['@shade.1', round(-154 + i * 15, -80, 10, 30)]);
      let fc = ''; for (let i = 0; i < 6; i++) fc += rect(-160 + i * 9, -158, 5, 8);
      push(['@stone.0', fc], ['@door', round(-146, -40, 22, 40)], ['@stone.3', rect(-160, -6, 52, 6), .6]);
      // the keep: the square block with pilaster buttresses and four tiers of blind arcading
      const x0 = -110, x1 = 130, top = -196;
      push(['@stone.0', rect(x0, top, x1 - x0, -top)], ['@stone.2', rect(x0, top, 30, -top), .45], ['@shade.0', rect(x1 - 34, top, 34, -top), .45]);
      const tiers = [[-58, 40, 9], [-108, 42, 11], [-150, 34, 13], [-182, 24, 18]];
      for (const [y, h, n] of tiers) {
        const w = (x1 - x0 - 12) / n;
        for (let i = 0; i < n; i++) push(['@shade.1', round(x0 + 6 + i * w + 1.5, y, w - 3, h - 4)], ['@stone.3', round(x0 + 6 + i * w + 3, y + 3, w - 6, h - 8), .35]);
        push(['@stone.2', rect(x0, y + h - 4, x1 - x0, 4)], ['@shade.0', rect(x0, y + h, x1 - x0, 2), .6]);
      }
      for (const x of [x0 - 2, -52, 8, 68, x1 - 10]) push(['@stone.2', rect(x, top, 12, -top)], ['@shade.0', rect(x + 9, top, 3, -top), .5]);
      // windows in the arcades (lit at night): the gallery and the hall
      for (const [x, y] of [[-80, -96], [-30, -96], [30, -96], [90, -96], [-54, -140], [50, -140], [-6, -50]]) push(['@shade.1', round(x - 2, y - 2, 13, 25)], { f: '@glass.0', d: round(x, y, 9, 21), glow: 'window' });
      // arrow loops low down
      let al = ''; for (const x of [-90, -40, 40, 100]) al += rect(x, -40, 3, 16);
      push(['@shade.1', al]);
      // the parapet and the corner turrets
      push(['@stone.2', rect(x0 - 4, top - 4, x1 - x0 + 8, 6)]);
      let cr = ''; for (let i = 0; i < 26; i++) cr += rect(x0 - 2 + i * 9.4, top - 12, 5, 8);
      push(['@stone.0', cr]);
      for (const x of [x0 - 8, x1 - 16]) { push(['@stone.1', rect(x, top - 20, 24, 24)]); let tc = ''; for (let i = 0; i < 3; i++) tc += rect(x + 1 + i * 8, top - 27, 5, 7); push(['@stone.1', tc]); }
      push(['@stone.3', rect(x0, -6, x1 - x0, 6), .6]);
      // the bridge onto the mound (stone, one arch), right of centre
      push(['@stone.1', 'M130 0V-30H186V0H176Q170 -18 158 -18Q146 -18 140 0z'], ['@shade.0', rect(130, -34, 56, 4)]);
      lit.push(['@flood.0', rect(x0 - 10, top - 30, x1 - x0 + 20, -top + 30), .15], ['@flood.1', 'M-110 0L10 -70L130 0z', .14], ['@flood.0', rect(-164, -160, 58, 160), .12]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.pulls-ferry (anchor: the waterline at the middle of the gate) ---------- */
  def({
    id: 'landmark.pulls-ferry', category: 'landmark', size: [340, 230], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      flint: ['#7e8086', '#5c5e64', '#a8a8ac', '#3e4046'], stone: ['#e0d6bc', '#c4b898', '#b0a284'], brick: ['#b0603e', '#8a4630', '#c8785a'],
      tile: ['#9a4a30', '#7a3824', '#b45e40'], frame: ['#f2ece0'], glass: ['#34404c', '#90a6b8'], timber: ['#4a3828'], water: ['#2a4848', '#4e7270'], flood: ['#ffe2ae'],
    } },
    night: { glow: { window: '#ffd88a', lamp: '#ffe6a8' }, on: 0.8 },
    parts: ['body', 'lit'],
    shadow: { rx: 160, ry: 8, h: 160 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/norwich', 'uk', 'norwich', 'watergate', 'river wensum', 'flint', 'kit:temperate'],
    credit: 'drawn for the Norwich area scenes (from public views of the watergate from the Riverside Walk)',
    build(v, r) {
      const b = [], lit = [], push = (...s) => b.push(...s);
      // the ferry house (right): flint walls with brick quoins and dressings, a steep tiled roof, dormers, a big stack
      push(['@flint.0', rect(40, -96, 180, 96)]);
      flints(push, r, 40, -96, 180, 96, 240, ['@flint.1', '@flint.2', '@flint.3']);
      let q = ''; for (let i = 0; i < 9; i++) q += rect(40, -94 + i * 10.5, i % 2 ? 8 : 13, 5) + rect(i % 2 ? 212 : 207, -94 + i * 10.5, i % 2 ? 8 : 13, 5);
      push(['@brick.0', q], ['@brick.1', rect(40, -10, 180, 10)]);
      push(['@tile.0', 'M32 -94L86 -168H186L228 -94z'], ['@tile.2', 'M86 -168H186l4 6H82z', .8], ['#000000', 'M150 -168H186L228 -94H170z', .14]);
      let tc = ''; for (let i = 1; i < 10; i++) { const y = -168 + i * 7.4, k = (y + 168) / 74; tc += `M${f1(86 - 54 * k)} ${f1(y)}H${f1(186 + 42 * k)}`; }
      push({ s: '@tile.1', w: .8, d: tc, op: .55 });
      for (const x of [94, 150]) push(['@flint.2', `M${x - 4} -118V-136L${x + 14} -150L${x + 32} -136V-118z`], ['@tile.1', `M${x - 8} -134L${x + 14} -154L${x + 36} -134h-5L${x + 14} -149L${x - 3} -134z`], ['@frame', rect(x + 3, -134, 22, 16)], { f: '@glass.0', d: rect(x + 5, -132, 18, 13), glow: 'window' }, { s: '@frame', w: 1, d: `M${x + 14} -132v13` });
      push(['@brick.1', rect(176, -196, 22, 40)], ['@brick.0', rect(178, -196, 9, 40)], ['@brick.2', rect(174, -200, 26, 5)], ['@brick.1', rect(178, -206, 6, 6) + rect(189, -205, 6, 5)]);
      for (const [x, y] of [[62, -76], [110, -76], [170, -76], [62, -40], [170, -40]]) push(['@brick.0', rect(x - 4, y - 4, 30, 30)], ['@frame', rect(x - 1, y - 1, 24, 24)], { f: '@glass.0', d: rect(x, y, 22, 22), glow: 'window' }, { s: '@frame', w: 1.2, d: `M${x + 11} ${y}v22M${x} ${y + 11}h22` });
      push(['@brick.0', rect(106, -46, 30, 46)], ['@timber', rect(110, -42, 22, 42)], { f: '@glass.1', d: rect(114, -38, 14, 8), glow: 'window' });
      // the watergate (left): a flint gatehouse with stone quoins, the pointed arch over the old canal, a two-light window
      const g0 = -120, g1 = 40;
      push(['@flint.0', rect(g0, -150, g1 - g0, 150)]);
      flints(push, r, g0, -150, g1 - g0, 150, 300, ['@flint.1', '@flint.2', '@flint.3']);
      let gq = ''; for (let i = 0; i < 13; i++) gq += rect(g0, -148 + i * 11.4, i % 2 ? 9 : 14, 6) + rect(i % 2 ? g1 - 9 : g1 - 14, -148 + i * 11.4, i % 2 ? 9 : 14, 6);
      push(['@stone.0', gq]);
      push(['@stone.1', pointed(-74, -100, 68, 100)], ['@stone.2', pointed(-68, -92, 56, 92)], ['@water.0', pointed(-62, -84, 44, 84)], ['@water.1', 'M-62 0V-14Q-40 -6 -18 -14V0z', .9]);
      push(['@stone.0', rect(-80, -4, 80, 4)], { s: '@stone.2', w: 2, d: 'M-74 -45H-70M-10 -45H-6' });
      push(['@stone.1', pointed(-58, -140, 16, 30)], ['@stone.1', pointed(-30, -140, 16, 30)], { f: '@glass.0', d: pointed(-56, -137, 12, 26), glow: 'window' }, { f: '@glass.0', d: pointed(-28, -137, 12, 26), glow: 'window' });
      push(['@tile.1', `M${g0 - 8} -148L-40 -196L${g1 + 8} -148z`], ['@tile.2', `M${g0 - 8} -148L-40 -196L-34 -190L${g1 - 2} -148z`, .3], ['@stone.0', `M${g0 - 10} -148H${g1 + 10}v-4H${g0 - 10}z`]);
      push(['@stone.2', rect(g0, -6, g1 - g0, 6), .7]);
      // the landing stage along the front, posts in the water
      push(['@timber', rect(-150, -8, 380, 6)]);
      let posts = ''; for (let i = 0; i < 9; i++) posts += rect(-146 + i * 46, -8, 5, 12);
      push(['@timber', posts], { s: '@water.1', w: 1, d: 'M-150 4h380', op: .6 });
      // mooring rings, stone steps down to the water, plants in the wall foot
      for (let i = 0; i < 6; i++) push(['@stone.2', ell(-140 + i * 60, -4, 2.4, 2.4)], ['@timber', rect(-144 + i * 60, -14, 8, 4)]);
      for (let i = 0; i < 5; i++) push(['@stone.' + (i % 2), rect(-112 + i * 4, -30 + i * 6, 30 - i * 4, 6)]);
      for (let i = 0; i < 8; i++) push(['#5e7e3a', ell(48 + i * 22, -6, 7, 4), .8]);
      push({ f: '#fff0c0', d: rect(-90, -112, 6, 8), glow: 'lamp' }, ['@timber', rect(-88, -104, 2, 6)]);
      lit.push(['@flood.0', rect(g0 - 4, -200, g1 - g0 + 8, 200), .14], ['@flood.0', 'M-80 0L-40 -60L0 0z', .2]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.cow-tower (the round brick tower by the river; anchor: its foot) ---------- */
  def({
    id: 'landmark.cow-tower', category: 'landmark', size: [150, 240], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#a85c40', '#86452e', '#c47a5a', '#6a3624'], flint: ['#8a8a88', '#6a6a68', '#acaaa4'], stone: ['#d8cdb2'], dark: ['#2a2220'], flood: ['#ffdcaa'], glass: ['#3a2c26'],
    } },
    night: { glow: { window: '#f4b870' }, on: 0.7 },
    parts: ['body', 'lit'],
    shadow: { rx: 70, ry: 8, h: 200 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/norwich', 'uk', 'norwich', 'tower', 'river wensum', 'medieval', 'kit:temperate'],
    credit: 'drawn for the Norwich area scenes (from public views of Cow Tower from the river path)',
    build(v, r) {
      const b = [], lit = [], push = (...s) => b.push(...s), R = 56, T = -200;
      // the drum: shaded as a cylinder (light on the left), brick courses curving slightly
      push({ f: { lin: [[0, '@brick.2'], [.35, '@brick.0'], [.8, '@brick.1'], [1, '@brick.3']], x1: -R, y1: 0, x2: R, y2: 0 }, d: `M${-R} 0V${T + 10}Q0 ${T + 2} ${R} ${T + 10}V0Q0 8 ${-R} 0z` });
      let cs = ''; for (let i = 1; i < 30; i++) { const y = T + 10 + i * 6.4; cs += `M${-R} ${f1(y)}Q0 ${f1(y + 5)} ${R} ${f1(y)}`; }
      push({ s: '@brick.3', w: .6, d: cs, op: .4, detail: true });
      let pat = ''; for (let i = 0; i < 70; i++) { const x = rr(r, -R + 4, R - 4), y = rr(r, T + 16, -10); pat += rect(x, y, 5, 2.4); }
      push({ f: '@brick.2', d: pat, op: .45, detail: true }, { f: '@brick.3', d: pat.split('z').slice(0, 30).join('z') + 'z', op: .3, detail: true });
      // the flint and stone plinth, the stair turret bulge on the right
      push({ f: { lin: [[0, '@flint.2'], [1, '@flint.1']], x1: -R, y1: 0, x2: R, y2: 0 }, d: `M${-R - 3} 0V-26Q0 -20 ${R + 3} -26V0Q0 8 ${-R - 3} 0z` }, ['@stone.0', `M${-R - 3} -26Q0 -20 ${R + 3} -26v-4Q0 -24 ${-R - 3} -30z`]);
      push(['@brick.1', `M${R - 14} -26V${T + 14}Q${R - 4} ${T + 10} ${R + 4} ${T + 14}V-26z`, .9], ['@brick.3', `M${R - 2} -26V${T + 14}h6V-26z`, .5]);
      // gun ports, arrow loops and the doorway
      for (const [x, y] of [[-30, -60], [8, -60], [-14, -120], [24, -120], [-34, -168], [6, -168]]) push(['@stone.0', rect(x - 3, y - 3, 10, 26)], ['@dark.0', rect(x, y, 4, 20)], ['@dark.0', ell(x + 2, y + 20, 4, 3)]);
      push(['@stone.0', pointed(-16, -54, 28, 54)], ['@dark.0', pointed(-12, -50, 20, 50)]);
      for (const [x, y] of [[-24, -96], [16, -146]]) push({ f: '@glass.0', d: rect(x, y, 6, 8), glow: 'window' });
      // the ruined top: broken merlons, uneven, a little greenery
      let top = `M${-R} ${T + 10}`; const steps = [[-50, -8], [-42, -8], [-42, 6], [-30, 6], [-30, -10], [-18, -10], [-18, 4], [-4, 4], [-4, -6], [10, -6], [10, 8], [22, 8], [22, -12], [34, -12], [34, 4], [46, 4], [46, -4], [R, -4]];
      for (const [x, dy] of steps) top += `L${x} ${T + dy}`;
      top += `L${R} ${T + 10}Q0 ${T + 2} ${-R} ${T + 10}z`;
      // putlog holes, patched brick and repairs (each its own shape), ivy climbing the shaded side
      for (let i = 0; i < 24; i++) { const ring = Math.floor(i / 6), k = i % 6, x = -R + 8 + k * 18 + (ring % 2) * 8, y = T + 30 + ring * 42; push(['@dark.0', rect(x, y, 3.5, 3), .8]); }
      for (let i = 0; i < 14; i++) push([i % 2 ? '@brick.2' : '@brick.3', rect(rr(r, -R + 6, R - 20), rr(r, T + 20, -40), rr(r, 8, 16), rr(r, 5, 10)), .35]);
      for (let i = 0; i < 12; i++) { const y = -30 - i * 13, x = R - 10 - (i % 3) * 4; push(['#4e6e34', ell(x, y, 6 + (i % 2) * 2, 5), .85], ['#6a8c44', ell(x - 2, y - 2, 3, 2.4), .8]); }
      push(['@brick.0', top], ['@brick.3', `M10 ${T - 6}h12v14h-12zM46 ${T - 4}h10v12h-10z`, .5], ['#5a7a3a', ell(-36, T - 8, 8, 4) + ell(28, T - 12, 6, 3), .8]);
      lit.push(['@flood.0', `M${-R - 10} 0V${T - 20}H${R + 10}V0z`, .16], ['@flood.0', 'M-60 0L0 -60L60 0z', .2]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.norwich-forum (the glass horseshoe between brick wings; anchor: the foot of the glass) ---------- */
  def({
    id: 'landmark.norwich-forum', category: 'landmark', size: [580, 230], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#b86848', '#9a5238', '#cc8264'], glass: ['#7a9ab0', '#5a7a92', '#a8c4d4', '#3e5a70'], steel: ['#d8dcdc', '#a8acae'], floor: ['#e8e0d0'], inner: ['#c89a6a'], roof: ['#9aa0a4', '#7e8488'], flood: ['#fff0c8'],
    } },
    night: { glow: { window: '#ffe0a0' }, on: 0.95 },
    parts: ['body', 'lit'],
    shadow: { rx: 280, ry: 12, h: 200 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/norwich', 'uk', 'norwich', 'library', 'modern', 'glass', 'kit:urban'],
    credit: 'drawn for the Norwich area scenes (from public views of the Forum across its square)',
    build() {
      const b = [], push = (...s) => b.push(...s);
      // the brick wings, with ribbon windows
      for (const [x0, x1] of [[-290, -150], [150, 290]]) {
        push(['@brick.0', rect(x0, -150, x1 - x0, 150)], ['@brick.1', rect(x0, -150, x1 - x0, 8)], ['@roof.0', rect(x0 - 4, -156, x1 - x0 + 8, 6)]);
        for (const y of [-132, -96, -60]) { push(['@steel.1', rect(x0 + 8, y - 2, x1 - x0 - 16, 22)]); for (let i = 0; i < 6; i++) push({ f: '@glass.3', d: rect(x0 + 10 + i * (x1 - x0 - 20) / 6, y, (x1 - x0 - 20) / 6 - 2, 18), glow: 'window' }); }
        push(['@brick.1', rect(x0, -30, x1 - x0, 30), .5]);
      }
      // the great glass front: a curved top, a fine steel grid, the floors and warm interior behind
      const G = 'M-150 0V-170Q0 -232 150 -170V0z';
      push(['@roof.1', 'M-158 -170Q0 -240 158 -170L150 -164Q0 -228 -150 -164z'], { f: { lin: [[0, '@glass.2'], [.5, '@glass.0'], [1, '@glass.1']], x1: -150, y1: 0, x2: 150, y2: 0 }, d: G });
      for (const y of [-130, -86, -44]) push(['@floor.0', `M-150 ${y}H150v5H-150z`, .8], { f: '@inner.0', d: `M-146 ${y + 5}H146v14H-146z`, op: .35, glow: 'window' });
      for (let i = 0; i < 12; i++) { const x = -138 + i * 25; push({ f: '@glass.2', d: rect(x, -160 + Math.abs(i - 5.5) * 2.4, 18, 30), op: .5, glow: 'window' }); }
      let grid = ''; for (let i = 1; i < 12; i++) { const x = -150 + i * 25, yt = -170 - 62 * (1 - Math.pow(x / 150, 2)) * .97; grid += `M${x} 0V${f1(yt)}`; }
      for (let y = -20; y > -220; y -= 20) grid += `M-150 ${y}H150`;
      push({ s: '@steel.0', w: 1.4, d: grid, op: .85 });
      push(['@steel.0', 'M-150 0V-170h4V0zM146 0V-170h4V0z']);
      push({ f: '#000000', d: 'M60 0V-170Q100 -186 150 -170V0z', op: .1 });
      // the entrance canopy and doors
      push(['@steel.1', rect(-60, -40, 120, 6)], ['@glass.3', rect(-50, -34, 100, 34)], { f: '@inner.0', d: rect(-46, -32, 40, 30), glow: 'window' }, { f: '@inner.0', d: rect(6, -32, 40, 30), glow: 'window' }, { s: '@steel.0', w: 1.4, d: 'M-26 -34V0M0 -34V0M26 -34V0' });
      push(['@steel.1', rect(-290, -4, 580, 4)]);
      return { body: b, lit: [['@flood.0', 'M-150 0V-170Q0 -232 150 -170V0z', .08]] };
    },
  });

  /* ---------- landmark.erpingham-gate (the gate into the Close from Tombland; no figures, the niches empty) ---------- */
  def({
    id: 'landmark.erpingham-gate', category: 'landmark', size: [210, 280], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#e0d4b8', '#c8b898', '#efe6d0', '#a69676'], flint: ['#5e6066', '#7e8086', '#44464c'], shade: ['#8e8268'], inner: ['#5f7a48', '#9fb07a', '#c8bc98'], flood: ['#ffe2ae'],
    } },
    night: { glow: { window: '#f6c878', lamp: '#ffe6a8' }, on: 0.8 },
    parts: ['body', 'lit'],
    shadow: { rx: 100, ry: 8, h: 230 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/norwich', 'uk', 'norwich', 'tombland', 'gate', 'medieval', 'kit:temperate'],
    credit: 'drawn for the Norwich area scenes (from public views of the gate across Tombland)',
    build(v, r) {
      const b = [], lit = [], push = (...s) => b.push(...s);
      // the upper wall and gable over the arch, faced in flint with a stone panel band
      push(['@flint.0', 'M-60 -150V-236L0 -270L60 -236V-150z']);
      flints(push, r, -58, -250, 116, 98, 120, ['@flint.1', '@flint.2', '@flint.0']);
      push(['@stone.0', 'M-64 -236L0 -274L64 -236L58 -232L0 -266L-58 -232z'], ['@stone.2', rect(-60, -200, 120, 8)]);
      for (let i = 0; i < 5; i++) push(['@stone.1', pointed(-50 + i * 21, -226, 14, 22)], ['@shade.0', pointed(-48 + i * 21, -222, 10, 18), .6]);
      push({ f: '#fff0c0', d: rect(-6, -250, 12, 14), glow: 'lamp' }, ['@stone.2', pointed(-8, -254, 16, 20), .25]);
      // the arch: deep moulded orders with empty canopied niches, the green Close glimpsed through
      push(['@stone.1', pointed(-64, -166, 128, 166)], ['@stone.0', pointed(-56, -156, 112, 156)], ['@stone.3', pointed(-48, -146, 96, 146)], ['@stone.2', pointed(-42, -138, 84, 138)]);
      for (let i = 0; i < 6; i++) { const t = i / 5, x = -52 + 0 * t, y = -20 - t * 100; push(['@shade.0', rect(x - 2, y - 14, 7, 12), .6], ['@shade.0', rect(-x - 5, y - 14, 7, 12), .6]); }
      push(['@inner.2', pointed(-36, -130, 72, 130)], ['@inner.1', 'M-36 0V-46Q0 -54 36 -46V0z'], ['@inner.0', 'M-36 -46Q-10 -90 6 -60Q20 -96 36 -50V-46Q0 -54 -36 -46z'], ['@stone.2', 'M-8 0L-2 -40H2L8 0z', .5]);
      // the flanking buttress towers: flint flushwork panels, offsets, polygonal caps
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -104 : 60, w = 44;
        push(['@stone.1', rect(x0, -246, w, 246)], [s < 0 ? '@stone.2' : '@shade.0', rect(s < 0 ? x0 : x0 + w - 12, -246, 12, 246), .45]);
        for (let k = 0; k < 6; k++) { const y = -232 + k * 36; push(['@flint.2', rect(x0 + 8, y, w - 16, 28)], ['@stone.0', pointed(x0 + 10, y + 4, 10, 22), .9], ['@stone.0', pointed(x0 + w - 20, y + 4, 10, 22), .9]); }
        for (const y of [-160, -80]) push(['@stone.3', rect(x0 - 3, y, w + 6, 5)]);
        push(['@stone.0', `M${x0 - 2} -246L${x0 + w / 2} -268L${x0 + w + 2} -246z`], ['@stone.2', `M${x0 + w / 2 - 2} -268v-10h4v10z`]);
      }
      push(['@stone.3', rect(-104, -6, 208, 6), .6]);
      lit.push(['@flood.0', rect(-110, -280, 220, 280), .15], ['@flood.0', pointed(-36, -130, 72, 130), .1]);
      return { body: b, lit };
    },
  });

  /* ---------- building.norwich-market: a row of six stalls under striped canopies (anchor: bottom centre) ---------- */
  def({
    id: 'building.norwich-market', category: 'building', size: [640, 170], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      a: ['#d8443a', '#2f6fb0', '#2f8a4e', '#e8b828', '#e06a2a', '#7a4aa0'], white: ['#f6f2e8', '#d6d0c2'], post: ['#3e4a52', '#5a666e'], dark: ['#2a2622', '#463e36'],
      counter: ['#7a5a3e', '#5e4430'], fruit: ['#d8402a', '#f0a020', '#8ac040', '#f4d84a', '#7a3a7a', '#e86a8a'], lamp: ['#fff2c0'],
    } },
    night: { glow: { window: '#ffd88a', lamp: '#fff2c0' }, on: 0.7 },
    shadow: { rx: 300, ry: 10, h: 120 },
    tags: ['uk', 'norwich', 'market', 'stalls', 'canopy', 'city', 'kit:urban', 'role:building-near'],
    credit: 'drawn for the Norwich area scenes (the striped stall roofs of the city market; no names or signs)',
    build(v, r) {
      const b = [], push = (...s) => b.push(...s), sets = [[0, 1, 3, 2, 4, 1], [3, 0, 2, 5, 1, 4], [1, 4, 0, 3, 2, 0]][v];
      for (let i = 0; i < 6; i++) {
        const x = -318 + i * 106, w = 102, c = sets[i];
        // the dark interior and the back shelves
        push(['@dark.1', rect(x + 2, -116, w - 4, 116)], ['@dark.0', rect(x + 2, -116, w - 4, 20), .7]);
        for (const y of [-92, -70]) { push(['@counter.1', rect(x + 6, y, w - 12, 4)]); let g = ''; for (let k = 0; k < 9; k++) g += ell(x + 12 + k * 10, y - 4, 4, 4); push({ f: '@fruit.' + ((i + (y > -80 ? 2 : 0)) % 6), d: g, op: .9, detail: true }); }
        // the counter with produce piled on it (fruit, veg, flowers, crates)
        push(['@counter.0', rect(x + 4, -40, w - 8, 40)], ['@counter.1', rect(x + 4, -40, w - 8, 4)]);
        let pile = ['', '', '']; for (let k = 0; k < 24; k++) pile[k % 3] += ell(x + 10 + (k % 12) * 7.4, -44 - Math.floor(k / 12) * 6 + rr(r, -1, 1), 4, 3.6);
        push(['@fruit.' + (i % 6), rect(x + 8, -52, w - 16, 12)], { f: '@fruit.' + ((i + 1) % 6), d: pile[1], detail: true }, { f: '@fruit.' + ((i + 3) % 6), d: pile[2], detail: true }, { f: '@fruit.' + (i % 6), d: pile[0], detail: true });
        push(['@white.1', rect(x + 8, -36, w - 16, 3), .6]);
        // the posts
        push(['@post.0', rect(x + 2, -128, 4, 128)], ['@post.0', rect(x + w - 6, -128, 4, 128)]);
        // the canopy: a sloped roof of stripes and a scalloped valance
        const y0 = -164, y1 = -122, n = 8;
        const strp = ['', '']; for (let k = 0; k < n; k++) { const xa = x - 2 + k * (w + 4) / n, xb = xa + (w + 4) / n, ta = x + 8 + k * (w - 16) / n, tb = ta + (w - 16) / n; strp[k % 2] += `M${f1(ta)} ${y0}L${f1(tb)} ${y0}L${f1(xb)} ${y1}L${f1(xa)} ${y1}z`; }
        push(['@a.' + c, strp[0]], ['@white.0', strp[1]]);
        push(['#000000', `M${x + 8} ${y0}H${x + w - 8}L${x + w + 2} ${y1}H${x - 2}z`, .08]);
        let val = `M${x - 2} ${y1}H${x + w + 2}V${y1 + 6}`; for (let k = 8; k > 0; k--) val += `Q${f1(x - 2 + (k - .5) * (w + 4) / 8)} ${y1 + 14} ${f1(x - 2 + (k - 1) * (w + 4) / 8)} ${y1 + 6}`;
        push(['@a.' + c, val + 'z'], ['@white.0', `M${x - 2} ${y1}H${x + w + 2}v2H${x - 2}z`]);
        push({ f: '@lamp.0', d: ell(x + w / 2, -112, 4, 4), glow: 'lamp' }, { f: '@lamp.0', d: rect(x + 10, -96, w - 20, 2), op: .4, glow: 'window' });
      }
      return { body: b };
    },
  });

  /* ---------- building.elm-hill-house: a jettied timber-framed house, colour-washed, under red pantiles ---------- */
  def({
    id: 'building.elm-hill-house', category: 'building', size: [240, 240], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      wash: ['#ecc0b4', '#ecd294', '#f2ede2'], washD: ['#cc9a8e', '#ccb070', '#d2cbbc'], timber: ['#3a2c22', '#5a4636'], tile: ['#b05a38', '#8a4228', '#c8704c'],
      flint: ['#7e8086', '#5e6066'], frame: ['#f4f0e6'], glass: ['#33404c', '#9cb2c2'], door: ['#2f4a3a', '#5a2a2a', '#2a3a5a'], brick: ['#a85a3e', '#7e4028'],
    } },
    night: { glow: { window: '#ffd98a' }, on: 0.7 },
    shadow: { rx: 110, ry: 8, h: 200 },
    tags: ['uk', 'norwich', 'elm hill', 'medieval', 'timber-framed', 'house', 'city', 'kit:urban', 'role:building-mid'],
    credit: 'drawn for the Norwich area scenes (the colour-washed jettied houses of the old city)',
    build(v, r) {
      const b = [], push = (...s) => b.push(...s);
      const leaded = (x, y, w, h) => { push(['@frame', rect(x - 2, y - 2, w + 4, h + 4)], { f: '@glass.0', d: rect(x, y, w, h), glow: 'window' }, ['@glass.1', rect(x + 1, y + 1, w * .4, h * .4), .35]); let m = ''; for (let i = 1; i < 3; i++) m += `M${f1(x + i * w / 3)} ${y}v${h}`; push({ s: '@frame', w: .8, d: m + `M${x} ${f1(y + h / 2)}h${w}`, detail: true }); };
      // the ground floor on a flint plinth
      push(['@wash.' + v, rect(-100, -84, 200, 84)], ['@washD.' + v, rect(70, -84, 30, 84), .7], ['@flint.0', rect(-100, -12, 200, 12)]);
      leaded(-80, -64, 44, 32); leaded(30, -64, 44, 32);
      push(['@timber.0', rect(-16, -66, 28, 66)], ['@door.' + v, rect(-12, -62, 20, 62)], ['@frame', ell(4, -32, 1.6, 1.6)]);
      // the jettied first floor, overhanging on joist ends
      push(['@timber.0', rect(-110, -92, 220, 8)]);
      let joist = ''; for (let i = 0; i < 18; i++) joist += rect(-106 + i * 12.3, -86, 5, 4);
      push({ f: '@timber.1', d: joist, detail: true });
      push(['@wash.' + v, rect(-110, -160, 220, 68)], ['@washD.' + v, rect(76, -160, 34, 68), .7]);
      if (v === 2) { let st = ''; for (let i = 0; i < 12; i++) st += `M${-106 + i * 19} -160v68`; st += 'M-110 -126h220'; push({ s: '@timber.0', w: 3.2, d: st }); }
      else push({ s: '@timber.0', w: 3, d: 'M-110 -160v68M110 -160v68M-110 -94h220', op: .8 });
      leaded(-90, -146, 50, 36); leaded(-14, -146, 40, 36); leaded(52, -146, 44, 36);
      // the pantile roof: rippled courses, a dormer, a brick stack
      push(['@tile.0', 'M-118 -158L-74 -226H84L118 -158z'], ['@tile.1', 'M40 -226H84L118 -158H70z', .5]);
      let pt = ''; for (let i = 1; i < 9; i++) { const y = -226 + i * 7.6, k = (y + 226) / 68, xa = -74 - 44 * k, xb = 84 + 34 * k; pt += `M${f1(xa)} ${f1(y)}`; for (let x = xa; x < xb; x += 9) pt += `q4.5 3 9 0`; }
      push({ s: '@tile.1', w: .9, d: pt, op: .5, detail: true }, ['@tile.2', 'M-74 -226H84l2 4H-76z', .8]);
      push(['@wash.' + v, 'M-26 -170V-194L-6 -208L14 -194V-170z'], ['@tile.1', 'M-32 -192L-6 -212L20 -192h-6L-6 -206L-26 -192z']);
      leaded(-17, -192, 22, 18);
      push(['@brick.0', rect(54, -252, 22, 40)], ['@brick.1', rect(54, -252, 22, 4)], ['@brick.1', rect(66, -252, 10, 40), .5]);
      return { body: b };
    },
  });

  /* ---------- boat.broads-cruiser: a white hire cruiser (anchor: the waterline at the middle) ---------- */
  def({
    id: 'boat.broads-cruiser', category: 'boat', size: [240, 90], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      hull: ['#f6f4ee', '#d8d6d0'], stripe: ['#2a4a7a', '#2f6a4a', '#8a2a2a'], canopy: ['#2a3a5c', '#3a5a4a', '#7a2a2a'], glass: ['#2e3a46', '#9fb4c4'], rail: ['#c8ccd0'], fender: ['#2a2a2a'], lamp: '#fff2c0',
    } },
    night: { glow: { window: '#ffd68a', lamp: '#fff4c8' }, on: .6 },
    anim: { paddle: { dy: 1, deg: 1, period: 5 } },
    reflect: true,
    tags: ['uk', 'norfolk', 'broads', 'river', 'cruiser', 'holiday', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'drawn for the Norwich area scenes (a generic Broads hire cruiser; no names)',
    build(v) {
      const b = [], push = (...s) => b.push(...s);
      push(['@hull.0', 'M-112 -30L104 -32Q118 -30 116 -20L104 2H-102Q-114 -12 -112 -30z'], ['@hull.1', 'M-106 -10L112 -14L104 2H-102z', .6], ['@stripe.' + v, 'M-110 -24L114 -26L113 -21L-109 -19z']);
      push(['@hull.0', 'M-96 -32L-90 -58H48L64 -32z'], ['@hull.1', 'M30 -58H48L64 -32H44z', .5]);
      for (let i = 0; i < 5; i++) push({ f: '@glass.0', d: rect(-86 + i * 26, -52, 20, 12), glow: 'window' }, ['@glass.1', rect(-85 + i * 26, -51, 8, 4), .4]);
      push(['@canopy.' + v, 'M-108 -32V-58Q-104 -66 -96 -66H-60V-58H-96V-32z'], ['@canopy.' + v, 'M48 -58H74Q86 -58 90 -46L96 -32H64z']);
      push({ s: '@rail', w: 1.4, d: 'M66 -32V-42H112M-112 -30V-42', detail: true }, { f: '@lamp', d: rect(-4, -64, 6, 5), glow: 'lamp' }, { s: '@rail', w: 1.4, d: 'M-1 -58V-62' });
      for (const x of [-70, -20, 30]) push(['@fender.0', ell(x, -18, 3, 6)]);
      return { body: b };
    },
  });

  /* ---------- boat.broads-sail: under sail on the river (anchor: the waterline at the middle) ---------- */
  def({
    id: 'boat.broads-sail', category: 'boat', size: [260, 340], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      hull: ['#1e1e20', '#8a5a32', '#f4f2ec'], hullD: ['#0e0e10', '#6a4224', '#c8c6c0'], trim: ['#c8302a', '#e8d8b0', '#2a4a7a'], sail: ['#1c1c1e', '#efe4c8', '#f8f6f0'], sailD: ['#38383a', '#d6c8a6', '#dcdad2'],
      spar: ['#6a4a2a', '#5a3e24', '#b8bcc0'], rope: '#7a7e84', lamp: '#fff2c0', glass: ['#2e3a46'],
    } },
    night: { glow: { window: '#ffd68a', lamp: '#fff4c8' }, on: .5 },
    anim: { paddle: { dy: 1.6, deg: 2, period: 4 } },
    reflect: true,
    tags: ['uk', 'norfolk', 'broads', 'river', 'sailing', 'wherry', 'yacht', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'drawn for the Norwich area scenes (a trading wherry and Broads sailing cruisers; no names or sail numbers)',
    build(v) {
      const b = [], push = (...s) => b.push(...s);
      if (v === 0) {
        // the wherry: a long low black hull, the mast well forward, one great black gaff sail with a long gaff
        push(['@hull.0', 'M-124 -22L118 -26Q130 -24 126 -14L112 2H-110Q-126 -8 -124 -22z'], ['@trim.0', 'M-124 -22L118 -26L118 -23L-123 -19z'], ['@hullD.0', 'M-114 -6L122 -10L112 2H-110z']);
        push(['@hull.0', 'M-60 -24L-56 -36H70L74 -24z'], ['@sail.0', 'M-60 -36H70', .5]);
        push({ s: '@spar.0', w: 5, d: 'M70 -24V-320' }, { s: '@spar.0', w: 4, d: 'M66 -300L-100 -250' }, { s: '@spar.0', w: 3, d: 'M66 -40L-110 -42' });
        push(['@sail.0', 'M64 -298L-98 -250L-110 -46L64 -42z'], ['@sailD.0', 'M64 -298L20 -284L10 -44L64 -42z', .6]);
        push({ s: '@sailD.0', w: .8, d: 'M60 -260L-104 -220M60 -200L-106 -170M60 -140L-108 -118M60 -90L-109 -76', op: .7, detail: true });
        push(['#e8e4dc', 'M66 -322h8v8h-8z'], { s: '@rope', w: .8, d: 'M70 -320L126 -24M70 -320L-30 -20', op: .7, detail: true }, { f: '@lamp', d: rect(116, -36, 5, 5), glow: 'lamp' });
      } else {
        // a cruiser under sail: main and jib, a small cabin with ports
        const h = v === 1 ? -270 : -300;
        push(['@hull.' + v, 'M-96 -26L90 -28Q104 -26 102 -16L88 2H-84Q-98 -10 -96 -26z'], ['@hullD.' + v, 'M-88 -8L98 -12L88 2H-84z', .6], ['@trim.' + v, 'M-96 -26L90 -28L90 -24L-95 -22z']);
        push(['@sail.1', 'M-60 -28L-50 -44H40L48 -28z'], { f: '@glass.0', d: rect(-40, -40, 10, 6), glow: 'window' }, { f: '@glass.0', d: rect(-20, -40, 10, 6), glow: 'window' }, { f: '@glass.0', d: rect(0, -40, 10, 6), glow: 'window' });
        push({ s: '@spar.' + v, w: 4, d: `M14 -40V${h}` }, { s: '@spar.' + v, w: 3, d: 'M14 -56L-100 -54' });
        if (v === 1) push({ s: '@spar.1', w: 3, d: `M12 ${h + 30}L-80 ${h + 70}` }, ['@sail.1', `M10 ${h + 30}L-80 ${h + 70}L-98 -58L10 -58z`], ['@sailD.1', `M10 ${h + 30}L-20 ${h + 44}L-30 -58L10 -58z`, .5]);
        else push(['@sail.2', `M10 ${h + 4}L-98 -58H10z`], ['@sailD.2', `M10 ${h + 4}L-30 -58H10z`, .5]);
        push(['@sail.' + v, `M20 ${h + 10}L96 -32L22 -50z`], ['@sailD.' + v, `M20 ${h + 10}L50 -40L22 -50z`, .4]);
        push({ s: '@sailD.' + v, w: .7, d: `M10 ${h + 80}L-60 ${h + 120}M10 ${h + 150}L-80 ${h + 170}`, op: .6, detail: true }, { f: '@lamp', d: rect(12, h - 6, 5, 5), glow: 'lamp' }, { f: '@lamp', d: rect(94, -34, 4, 4), glow: 'lamp' });
      }
      return { body: b };
    },
  });

  /* ---------- landmark.norfolk-windpump: a tapering drainage windpump on the marsh (anchor: the foot of the tower; the sails turn about the hub) ---------- */
  def({
    id: 'landmark.norfolk-windpump', category: 'landmark', size: [200, 340], variants: 2, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#a65a3e', '#84432e', '#c27a58', '#5e2e20'], white: ['#f2efe6', '#cfcabd', '#ffffff'], tar: ['#2e2c2a', '#1a1918', '#454038'],
      wood: ['#6a5a48', '#4a3e32'], sail: ['#efe8d6', '#d6ccb2'], glass: ['#3a4a5a', '#c8dce8'], door: ['#2f4a3a', '#1f2e26'],
    } },
    night: { glow: { window: '#ffd98a' }, on: .6 },
    parts: ['body', 'sails'],
    anim: { spin: { part: 'sails', pivot: [0, -270], period: 22 } },
    shadow: { rx: 60, ry: 8, h: 330 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/norfolk', 'uk', 'norfolk', 'broads', 'windpump', 'marsh', 'drainage', 'kit:temperate'],
    credit: 'drawn for the Norwich area scenes (a generic Broads drainage windpump; not a particular mill)',
    build(v) {
      const b = [], sl = [], hub = [0, -270];
      const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
      const tower = v === 0 ? ['@brick.0', '@brick.1'] : ['@tar.0', '@tar.1'];
      b.push([tower[0], poly([[-46, 0], [46, 0], [26, -252], [-26, -252]])], [tower[1], poly([[12, 0], [46, 0], [26, -252], [12, -252]]), .7]);
      const courses = []; for (let i = 0; i < 22; i++) courses.push(`M-44 ${f1(-6 - i * 11)}h88`);
      b.push({ s: v === 0 ? '@brick.3' : '@tar.2', w: .8, op: .35, d: courses.join(''), detail: true });
      if (v === 1) b.push(['@white.0', poly([[-40, -150], [40, -150], [36, -132], [-36, -132]])], ['@white.1', poly([[10, -150], [40, -150], [36, -132], [10, -132]]), .6]);
      b.push(['@white.0', poly([[-30, -252], [30, -252], [14, -292], [-14, -292]])], ['@white.1', poly([[6, -252], [30, -252], [14, -292], [6, -292]]), .7], ['@white.0', 'M0 -300 L5 -290 L-5 -290 Z']);
      b.push({ s: '@wood.0', w: 2.2, d: 'M10 -282 L70 -284 M44 -292 L44 -270 M28 -276 L60 -292' }, { s: '@wood.1', w: 1.2, d: 'M28 -276 A14 14 0 1 1 28 -277' });
      b.push(['@wood.1', 'M-8 -208 V-176 h16 V-208 z']);
      for (const y of [-200, -170, -140, -110, -80, -50]) for (const x of [-14, 14]) b.push({ f: '@glass.0', d: `M${x - 4} ${y}V${y - 14}h8V${y}z`, glow: 'window' }, { s: '@white.2', w: .8, op: .6, d: `M${x - 5} ${y}h10` });
      for (const y of [-160, -110, -60]) b.push({ s: '@wood.1', w: 1, op: .5, d: `M-7 ${y - 8}h14` });
      b.push({ f: '@glass.0', d: 'M-7 -160 V-176 Q0 -184 7 -176 V-160 z', glow: 'window' });
      b.push(['@door.0', 'M-10 0 V-34 Q0 -46 10 -34 V0 z']);
      // the sails: one arm, drawn along +x from the hub, then rotated to four (a ribbon of cloth with lattice bars and the stock)
      const rot = (x, y, a) => [hub[0] + x * Math.cos(a) - y * Math.sin(a), hub[1] + x * Math.sin(a) + y * Math.cos(a)];
      const ribbon = (a, x0, x1, w) => poly([rot(x0, -w / 2, a), rot(x1, -w / 2, a), rot(x1, w / 2, a), rot(x0, w / 2, a)]);
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        sl.push(['@sail.0', ribbon(a, 16, 150, 26)], ['@sail.1', ribbon(a, 16, 60, 26), .6]);
        for (let i = 0; i < 8; i++) { const x = 26 + i * 17, p0 = rot(x, -13, a), p1 = rot(x, 13, a); sl.push({ s: '@wood.1', w: .9, d: `M${f1(p0[0])} ${f1(p0[1])}L${f1(p1[0])} ${f1(p1[1])}`, op: .7, detail: true }); }
        const s0 = rot(4, 0, a), s1 = rot(158, 0, a);
        sl.push({ s: '@wood.0', w: 3, d: `M${f1(s0[0])} ${f1(s0[1])}L${f1(s1[0])} ${f1(s1[1])}` });
      }
      sl.push(['@wood.1', 'M-6 -270 h12 v-6 h-12z']);
      return { body: b, sails: sl };
    },
  });

  /* ---------- building.riverside-stand: a generic riverside football stand (tiered seats under a sloping roof, floodlight masts; anchor: the foot of the front) ---------- */
  def({
    id: 'building.riverside-stand', category: 'building', size: [520, 230], variants: 2, seasonal: false, flippable: true,
    palette: { base: {
      steel: ['#c9ced3', '#9aa2aa', '#e4e8ec'], seat: ['#2f6a4a', '#24543b', '#3d8058'], roof: ['#8e969e', '#6a727a', '#b4bcc4'], lamp: ['#fff6d8', '#ffffff'], concrete: ['#b8b2a8', '#948e84'],
    } },
    night: { glow: { lamp: '#fff3c0' }, on: .9 },
    parts: ['body', 'lit'],
    shadow: { rx: 240, ry: 12, h: 120 },
    reflect: false,
    tags: ['building', 'signature', 'stadium', 'stand', 'football', 'riverside', 'floodlights', 'city', 'kit:urban', 'role:building-mid'],
    credit: 'drawn for the Norwich area scenes (a generic football stand and floodlight masts; no club, crest or name)',
    build(v) {
      const b = [], lit = [];
      const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
      b.push(['@concrete.0', rect(-250, -22, 500, 22)], ['@concrete.1', rect(-250, -22, 500, 4), .6]);
      for (let i = 0; i < 8; i++) {
        const y = -22 - i * 15;
        b.push(['@concrete.1', rect(-244, y - 15, 488, 15), .9], { s: '@seat.' + (v ? (i % 2 ? 0 : 2) : (i % 2 ? 2 : 1)), w: 1, d: '', op: 1 }, ['@seat.' + (i % 3), rect(-240, y - 19, 480, 5)]);
      }
      b.push({ s: '@steel.1', w: .9, op: .5, d: Array.from({ length: 20 }, (_, i) => `M${-240 + i * 25} -22V-140`).join(''), detail: true });
      b.push(['@steel.0', poly([[-258, -150], [258, -150], [258, -136], [-258, -112]])], ['@roof.0', poly([[-258, -150], [258, -150], [258, -144], [-258, -120]])], ['@roof.2', poly([[-258, -150], [258, -150], [258, -147], [-258, -128]]), .8]);
      b.push({ s: '@steel.0', w: 2.4, d: 'M-240 -22V-132M-120 -22V-140M0 -22V-144M120 -22V-140M240 -22V-132' });
      b.push({ s: '@roof.1', w: 1.2, op: .7, d: 'M-258 -134H258M-258 -118H258' });
      // floodlight masts at both ends, with lamp heads (lit at night)
      for (const x of [-300, 300]) {
        b.push({ s: '@steel.0', w: 4, d: `M${x} 0V-210` }, ['@steel.1', poly([[x - 26, -210], [x + 26, -210], [x + 20, -232], [x - 20, -232]])]);
        lit.push({ f: '@lamp.0', d: poly([[x - 22, -232], [x + 22, -232], [x + 18, -240], [x - 18, -240]]), glow: 'lamp' }, { s: '@lamp.1', w: 1, d: `M${x - 20} -236H${x + 20}`, op: .8 });
        for (let k = 0; k < 4; k++) lit.push({ f: '@lamp.0', d: rect(x - 16 + k * 9, -226, 6, 5), glow: 'lamp' });
      }
      return { body: b, lit };
    },
  });
})();

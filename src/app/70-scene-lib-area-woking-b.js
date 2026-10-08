/* ============================================================
   SCENE LIBRARY: area-woking-b (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

   The objects of the second Woking batch (Surrey), drawn for the new spots only:
     landmark.kingfield-floodlights   the stand and four floodlight pylons of a non-league football ground (no club marks)
     landmark.old-woking-church       a flint village church with a shingled spire and lancet chancel
     landmark.basingstoke-lock        a canal lock seen end on: brick chamber walls, timber gates, balance beams, a footbridge
     landmark.necropolis-station      a small stone cemetery station with a gabled front and a long iron-post canopy
     landmark.wey-bridge              a brick road bridge of three arches over a river
   No text, no logos, no people. Shadows and glows follow the 2.2 conventions.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const def = d => sceneObjDefine(Object.assign({}, d, { build: (v, r, ctx) => tidy(d.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  /** A pointed (lancet) arch opening: x left, y the crown, w width, h height to the sill. */
  const lancet = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w * .5)}Q${f1(x + w * .04)} ${f1(y + w * .08)} ${f1(x + w / 2)} ${f1(y)}Q${f1(x + w * .96)} ${f1(y + w * .08)} ${f1(x + w)} ${f1(y + w * .5)}V${f1(y + h)}z`;
  /** A tube between two points: a quadrilateral of widths w0 and w1. */
  const tube = (x0, y0, x1, y1, w0, w1) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; return `M${f1(x0 + nx * w0 / 2)} ${f1(y0 + ny * w0 / 2)}L${f1(x1 + nx * w1 / 2)} ${f1(y1 + ny * w1 / 2)}L${f1(x1 - nx * w1 / 2)} ${f1(y1 - ny * w1 / 2)}L${f1(x0 - nx * w0 / 2)} ${f1(y0 - ny * w0 / 2)}z`; };
  /** A round-arched opening (a bridge span or a lock gate): centre x, springing y, half-width w, height h. */
  const arch = (x, y, w, h) => `M${f1(x - w)} ${f1(y)}V${f1(y - h * .25)}Q${f1(x - w * .9)} ${f1(y - h)} ${f1(x)} ${f1(y - h)}Q${f1(x + w * .9)} ${f1(y - h)} ${f1(x + w)} ${f1(y - h * .25)}V${f1(y)}z`;

  /* ---------- landmark.kingfield-floodlights (the stand, the pylons; anchor: the terrace foot, centre) ---------- */
  def({
    id: 'landmark.kingfield-floodlights', category: 'landmark', size: [820, 340], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stand: ['#7d8590', '#646c76', '#9aa2aa'], roof: ['#cfd4da', '#aab2ba'], seat: ['#3c4c5e', '#c9ced4', '#4d6a4e'],
      pylon: ['#8e979f', '#6a727a'], lamp: ['#fff8e6', '#ffe9b8'], brick: ['#8d6a52', '#74563f'], grass: ['#5e8a3e', '#4d7534'],
    } },
    night: { glow: { window: '#ffd98a', lamp: '#fff2cc' }, on: 0.9 },
    parts: ['body'],
    shadow: { rx: 150, ry: 16, h: 220 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'football', 'stadium', 'floodlights', 'kit:urban'],
    credit: 'drawn for the Woking area scenes (a non-league football ground: a stand and floodlights, no club marks)',
    build() {
      const b = [], push = (...s) => b.push(...s);
      // the pitch edge and the ground's concrete terrace
      push(['@grass.0', 'M-420 0L-380 -26L380 -26L420 0z']);
      // the main stand: a long low body, a shallow roof on slim posts
      push(['@stand.0', rect(-360, -124, 720, 120)], ['@stand.1', 'M-360 -124L360 -124L360 -116L-360 -116z']);
      push(['@roof.0', 'M-380 -124L-360 -150L360 -150L380 -124z'], ['@roof.1', 'M-360 -150L360 -150L360 -144L-360 -144z']);
      for (let i = 0; i < 9; i++) push(['@stand.2', rect(-352 + i * 80, -150, 3.5, 26), .7]);
      // the rows of seats in the stand (a few colours, no marks)
      for (let row = 0; row < 5; row++) {
        const y = -96 + row * 17;
        push({ s: '@seat.' + (row % 2 ? 1 : 0), w: 3, op: .85, d: `M-340 ${f1(y)}H340` });
        for (let x = -330; x < 340; x += 9) push(['@seat.' + ((x + row * 5) % 27 < 4 ? 2 : (row % 2 ? 1 : 0)), rect(x, y - 6, 4, 4), .75]);
      }
      // the stand's back windows (lit at dusk)
      for (let i = 0; i < 14; i++) push({ f: '@lamp.1', d: rect(-340 + i * 50, -142, 16, 9), glow: 'window' });
      // the terrace below, in brick
      push(['@brick.1', rect(-360, -6, 720, 8)]);
      // four floodlight pylons at the corners and the centre of the ground
      const pylon = (x) => {
        push(['@pylon.0', tube(x, 0, x, -300, 12, 8)], ['@pylon.1', tube(x + 3, 0, x + 3, -300, 4, 3), .6]);
        push(['@pylon.1', rect(x - 36, -314, 72, 8)]);
        for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) push({ f: '@lamp.0', d: rect(x - 32 + j * 22, -322 + i * 12, 18, 10), glow: 'lamp' });
        push(['@pylon.0', tube(x - 36, -312, x - 26, -316, 3, 3)], ['@pylon.0', tube(x + 36, -312, x + 26, -316, 3, 3)]);
      };
      pylon(-400); pylon(-120); pylon(140); pylon(420);
      return { body: b };
    },
  });

  /* ---------- landmark.old-woking-church (flint walls, shingled spire; anchor: the plinth at the centre) ---------- */
  def({
    id: 'landmark.old-woking-church', category: 'landmark', size: [320, 400], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      flint: ['#55595e', '#6a6e72', '#43474c', '#7a7e80'], stone: ['#c9c2b0', '#a9a291'], roof: ['#4a4a46', '#333532'],
      shingle: ['#6d6257', '#554b43', '#7d7165'], glass: ['#2e3d40', '#6c8a88'], window: ['#ffd98a', '#fff0c0'], louvre: ['#2b2e2e', '#40443f'],
    } },
    night: { glow: { window: '#ffd98a', lamp: '#ffe6a8' }, on: 0.8 },
    parts: ['body'],
    shadow: { rx: 120, ry: 14, h: 380 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'church', 'village', 'flint', 'spire', 'kit:temperate'],
    credit: 'drawn for the Woking area scenes (a village church of flint and stone with a shingled spire)',
    build(v, r) {
      const b = [], push = (...s) => b.push(...s);
      // the nave: flint walls, a steep roof, the stone quoins at the corners
      push(['@flint.0', rect(-120, -186, 200, 186)], ['@roof.0', 'M-132 -186L-20 -262L92 -186z'], ['@roof.1', 'M-20 -262L92 -186L-20 -186z', .5]);
      // the tower at the west end, its belfry and the shingled spire
      push(['@flint.1', rect(-170, -320, 70, 320)], ['@stone.0', rect(-170, -320, 6, 320)], ['@stone.1', rect(-106, -320, 6, 320)], ['@stone.0', rect(-170, -324, 70, 6)]);
      push(['@louvre.0', rect(-158, -292, 46, 26)], ['@louvre.1', rect(-158, -292, 46, 26), .3]);
      for (let i = 0; i < 5; i++) push(['@louvre.1', rect(-156 + i * 9, -290, 3, 22)]);
      push(['@shingle.0', 'M-172 -324L-135 -424L-100 -324z'], ['@shingle.1', 'M-135 -424L-100 -324L-120 -324z', .6]);
      for (let k = 0; k < 6; k++) { const y = -336 - k * 14, hw = 34 - k * 5; push(['@shingle.2', `M${f1(-135 - hw)} ${f1(y)}L${f1(-135 + hw)} ${f1(y)}`, .55], ['@shingle.2', `M${f1(-135)} ${f1(y - 14)}L${f1(-135)} ${f1(y)}`, .25]); }
      push(['@stone.1', rect(-138, -424, 6, 8)]);
      for (let i = 0; i < 3; i++) push({ f: '@window.1', d: rect(-156 + i * 20, -284, 10, 8), glow: 'lamp' });
      // flint texture: scattered knapped flint and stone bands
      for (let i = 0; i < 90; i++) { const x = rr(r, -118, 76), y = rr(r, -180, -8); push(['@flint.' + (i % 4), ell(x, y, rr(r, 2.4, 4.6), rr(r, 1.8, 3.4)), .9]); }
      for (let y = -66; y <= -60; y += 6) push(['@stone.1', rect(-120, y, 200, 2), .6]);
      // the nave windows: lancets, lit at dusk
      for (let i = 0; i < 3; i++) { const x = -96 + i * 62; push(['@stone.0', lancet(x - 2, -146, 22, 84)], { f: '@window.0', d: lancet(x, -144, 18, 80), glow: 'window' }, ['@glass.0', lancet(x + 6, -140, 6, 72), .5]); }
      for (let i = 0; i < 3; i++) push({ f: '@window.1', d: rect(-96 + i * 62 + 6, -206, 6, 9), glow: 'window' });
      // the chancel at the east end (a smaller roof, a three-light window)
      push(['@flint.2', rect(80, -132, 60, 132)], ['@roof.0', 'M74 -132L110 -170L146 -132z']);
      push({ f: '@window.1', d: lancet(92, -118, 36, 56), glow: 'window' }, ['@stone.0', rect(108, -118, 3, 56)], ['@stone.0', rect(92, -94, 36, 3)]);
      // the west door and its porch
      push(['@stone.0', arch(-70, 0, 20, 50)], ['@flint.3', arch(-70, 0, 14, 36), .9]);
      // the plinth and the grass at the foot
      push(['@stone.1', rect(-186, -6, 380, 6)], ['@grass.0', 'M-200 0L-160 -8L160 -8L200 0z', .8]);
      return { body: b };
    },
  });

  /* ---------- landmark.basingstoke-lock (seen end on from the bank; anchor: the lock floor, centre) ---------- */
  def({
    id: 'landmark.basingstoke-lock', category: 'landmark', size: [460, 290], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#9c5f45', '#7f4c37', '#b67a5a'], coping: ['#c9c1b0', '#a8a08e'], timber: ['#6a4a2c', '#533a22', '#8a6440'],
      iron: ['#3f4a4f', '#2e3538'], water: ['#3f6f7e', '#2d5661'], beam: ['#5a4a36', '#44392a'], lamp: ['#fff2d0', '#ffe0a0'],
    } },
    night: { glow: { window: '#ffd98a', lamp: '#fff0c0' }, on: 0.8 },
    parts: ['body'],
    shadow: { rx: 170, ry: 12, h: 180 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'canal', 'lock', 'basingstoke canal', 'towpath', 'kit:water'],
    credit: 'drawn for the Woking area scenes (a canal lock seen from the bank: brick chamber, timber gates, footbridge)',
    build(v, r) {
      const b = [], push = (...s) => b.push(...s);
      // the chamber walls: brick with a stone coping, both sides
      push(['@brick.0', rect(-230, -170, 60, 170)], ['@brick.1', rect(170, -170, 60, 170)]);
      push(['@coping.0', rect(-236, -176, 70, 8)], ['@coping.0', rect(166, -176, 70, 8)]);
      for (let y = -158; y < 0; y += 12) { push(['@brick.2', rect(-230, y, 60, 1.5), .45]); push(['@brick.2', rect(170, y, 60, 1.5), .45]); }
      // the water in the chamber, between the walls
      push(['@water.1', rect(-170, -40, 340, 40)], ['@water.0', rect(-170, -40, 340, 6), .6]);
      // the footbridge over the top of the lock: a deck and an arch of brick, with rails
      push(['@brick.1', arch(0, -170, 230, 60)], ['@coping.1', rect(-240, -176, 480, 9)]);
      push(['@iron.0', rect(-236, -210, 472, 3)], ['@iron.1', rect(-236, -170, 472, 2)]);
      for (let x = -236; x <= 236; x += 26) push(['@iron.0', rect(x, -210, 2.5, 40)]);
      // the two timber gates in a V (the upstream pair, closed)
      push(['@timber.0', 'M-170 -170L-6 -36L-6 -6L-170 -6z'], ['@timber.1', 'M-170 -170L-6 -36L-6 -6L-170 -6z', .3]);
      push(['@timber.0', 'M170 -170L6 -36L6 -6L170 -6z'], ['@timber.1', 'M170 -170L6 -36L6 -6L170 -6z', .3]);
      for (let k = 0; k < 4; k++) { const t = (k + 1) / 5; push(['@timber.2', tube(-170 + 164 * t, -170 + 134 * t, -170 + 164 * t, -6, 2.5, 2.5), .55]); push(['@timber.2', tube(170 - 164 * t, -170 + 134 * t, 170 - 164 * t, -6, 2.5, 2.5), .55]); }
      // balance beams projecting above the gates, with their counterweights
      push(['@beam.0', tube(-170, -180, -220, -206, 9, 7)], ['@iron.1', rect(-226, -214, 14, 12)]);
      push(['@beam.0', tube(170, -180, 220, -206, 9, 7)], ['@iron.1', rect(212, -214, 14, 12)]);
      // the paddle gear: windlass posts and a bollard on each side
      push(['@iron.0', rect(-244, -180, 6, 44)], ['@iron.0', rect(238, -180, 6, 44)]);
      push(['@timber.1', ell(-170, -6, 8, 5)], ['@timber.1', ell(170, -6, 8, 5)]);
      // the lamp on the footbridge post (lit at dusk) and the planted bank edge
      push({ f: '@lamp.0', d: ell(-236, -214, 6, 5), glow: 'lamp' }, { f: '@lamp.0', d: ell(236, -214, 6, 5), glow: 'lamp' });
      for (const x of [-150, -60, 60, 150]) push({ f: '@lamp.1', d: ell(x, -212, 4, 3.5), glow: 'lamp' });
      for (const x of [-210, -120, 120, 210]) push({ f: '@lamp.1', d: rect(x - 4, -170, 8, 4), glow: 'window' });
      push(['@coping.1', rect(-460 / 2, -6, 460, 6)]);
      return { body: b };
    },
  });

  /* ---------- landmark.necropolis-station (a cemetery station; anchor: the platform edge, centre) ---------- */
  def({
    id: 'landmark.necropolis-station', category: 'landmark', size: [420, 250], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      stone: ['#c8c0ae', '#a9a18f', '#ded6c4'], roof: ['#5a5a54', '#43433e'], slate: ['#4e5358', '#3a3f43'],
      glass: ['#2e3d42', '#5f7c7a'], window: ['#ffd98a', '#fff0c0'], iron: ['#2f3538', '#23282a'], timber: ['#6a5a44', '#524434'],
    } },
    night: { glow: { window: '#ffd98a', lamp: '#fff0c8' }, on: 0.9 },
    parts: ['body'],
    shadow: { rx: 180, ry: 14, h: 200 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'brookwood', 'cemetery', 'station', 'railway', 'kit:temperate'],
    credit: 'drawn for the Woking area scenes (a small Victorian cemetery station: a stone gabled front and an iron canopy)',
    build(v, r) {
      const b = [], push = (...s) => b.push(...s);
      // the station block: a stone front with a gable and a slate roof
      push(['@stone.0', rect(-150, -150, 300, 150)], ['@stone.1', rect(-150, -6, 300, 6)]);
      push(['@slate.0', 'M-168 -150L0 -238L168 -150z'], ['@slate.1', 'M0 -238L168 -150L0 -150z', .5]);
      push(['@stone.2', 'M-40 -150L0 -196L40 -150z', .7]);
      // the gable window, lit at dusk, and the row of tall windows under the eaves
      push(['@stone.1', lancet(-22, -226, 44, 64)], { f: '@window.0', d: lancet(-16, -218, 32, 58), glow: 'window' });
      for (let i = 0; i < 5; i++) { const x = -132 + i * 60; push(['@stone.1', rect(x - 3, -118, 36, 68)], { f: '@window.1', d: rect(x, -114, 30, 60), glow: 'window' }, ['@glass.0', rect(x + 14, -114, 2, 60), .6]); }
      // the door of the booking hall, in timber
      push(['@timber.0', arch(0, -6, 18, 52)], ['@timber.1', rect(-1, -40, 2, 34), .6]);
      // the canopy on iron posts, over the platform
      push(['@iron.0', rect(-210, -170, 420, 6)], ['@iron.1', rect(-210, -164, 420, 3)]);
      for (let i = 0; i < 6; i++) push(['@iron.0', rect(-204 + i * 80, -164, 4, 158)]);
      push(['@slate.1', rect(-214, -176, 428, 6), .6]);
      for (let y = -140; y < -10; y += 14) push(['@stone.2', rect(-148, y, 296, 1.4), .4]);
      for (let i = 0; i < 12; i++) push(['@slate.1', rect(-160 + i * 28, -212 + i * 0, 1.4, 2), .5]);
      for (let k = 0; k < 6; k++) push(['@slate.1', tube(-150 + k * 50, -150, -110 + k * 50, -190 + k * 0, 1.2, 1.2), .25]);
      for (let i = 0; i < 5; i++) { const x = -132 + i * 60; push(['@stone.0', rect(x - 6, -54, 42, 3)]); push(['@iron.1', rect(x + 14, -114, 2, 60), .5]); }
      for (let i = 0; i < 4; i++) push(['@iron.1', rect(-196 + i * 4, -170, 1.2, 4), .6]);
      // the platform edge and the lamp by the door (lit at dusk)
      push(['@stone.2', rect(-230, -6, 460, 6)]);
      push(['@iron.1', rect(-176, -190, 3, 24)], { f: '@window.0', d: ell(-175, -196, 7, 6), glow: 'lamp' });
      push(['@iron.1', rect(172, -190, 3, 24)], { f: '@window.0', d: ell(173, -196, 7, 6), glow: 'lamp' });
      for (const x of [-90, 90]) push({ f: '@window.1', d: rect(x - 6, -186, 12, 10), glow: 'window' });
      return { body: b };
    },
  });

  /* ---------- landmark.wey-bridge (a brick road bridge of three arches; anchor: the water line, centre) ---------- */
  def({
    id: 'landmark.wey-bridge', category: 'landmark', size: [540, 220], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#a0644a', '#825038', '#b97a5c'], coping: ['#cfc7b5', '#aaa291'], arch: ['#3e2e26', '#2f2420'], iron: ['#3c4448', '#2a3034'],
      lamp: ['#fff3d6', '#ffe0a0'], water: ['#3d6a78', '#2a5260'],
    } },
    night: { glow: { window: '#ffd98a', lamp: '#fff0c8' }, on: 0.9 },
    parts: ['body'],
    shadow: { rx: 240, ry: 12, h: 200 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/woking', 'uk', 'woking', 'river', 'river wey', 'bridge', 'brick', 'kit:water'],
    credit: 'drawn for the Woking area scenes (a brick road bridge of three arches over a river; no place-specific detail)',
    build(v, r) {
      const b = [], push = (...s) => b.push(...s);
      // the deck and its parapets, the piers between the arches
      push(['@brick.0', rect(-270, -150, 540, 136)]);
      push(['@coping.0', rect(-276, -158, 552, 10)], ['@coping.1', rect(-276, -156, 552, 2), .6]);
      // the three arches, dark under the spans, with the piers standing in the water
      for (const cx of [-180, 0, 180]) push(['@arch.0', arch(cx, 0, 74, 110)], ['@brick.1', arch(cx, 0, 62, 96), .5]);
      // the brick courses on the piers and the spandrels
      for (let y = -140; y < -10; y += 11) push(['@brick.2', rect(-270, y, 540, 1.6), .45]);
      for (let x = -260; x < 270; x += 18) push(['@brick.2', rect(x, -150, 1.6, 136), .25]);
      // the parapet posts, lit at dusk: lamps on the crown of each pier
      for (let i = 0; i < 10; i++) { const x = -240 + i * 53.3; push(['@iron.0', rect(x - 1.5, -196, 3, 38)]); push({ f: '@lamp.0', d: ell(x, -200, 6, 5), glow: 'lamp' }); }
      // the iron rail on the parapet
      push(['@iron.1', rect(-270, -176, 540, 2)]);
      for (let x = -268; x <= 268; x += 14) push(['@iron.1', rect(x, -176, 1.6, 18), .7]);
      // the water under the arches
      push(['@water.1', rect(-270, -4, 540, 4), .6]);
      return { body: b };
    },
  });
})();

/* ============================================================
   SCENE LIBRARY: the Wyndham's Pool proof scene's own objects (docs/dev/SCENE_ENGINE.md 2, SCENE_ENGINE_V2.md 4.2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season). Every bird faces RIGHT; anchors at the waterline
   (waders, rings), the feet (perched) or the body centre (flight). Used by 71-scene-proof-wyndhams-pool.js.

     structure.wp-angler-platform  a small timber anglers' platform, side-on, with a mooring post (the kingfisher's perch)
     bird.wp-heron-stalk           a grey heron stalking in the shallows: legs walk slowly, the neck STABS down to the water
     bird.wp-kingfisher-perch      a kingfisher sitting on a post (no perch drawn: it sits on the platform's post)
     water.wp-dive-ring            the splash crown and rings where the kingfisher hits the water
     bird.wp-swallow               a swallow skimming the water (spring to early autumn; none in winter)
     animal.wp-bat                 a pipistrelle: only after real dusk (drawn in the 'lit' part), none in winter
     sky.wp-mist                   a wisp of mist on the water: only after real dusk and before dawn (the 'lit' part)
     tree.wp-pine-bough            a Scots pine bough hanging into the frame (foreground framing)
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const eye = (x, y, r) => [['#101414', circ(x, y, r)], ['#ffffff', circ(x - r * .35, y - r * .35, r * .35), .9]];
  const rndOf = seed => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };

  /* ---------- structure.wp-angler-platform: anchor at the bank end, on the waterline; the deck runs right over the water ---------- */
  defineObj({
    id: 'structure.wp-angler-platform', category: 'structure', size: [300, 80], variants: 1, seasonal: true, flippable: true, parts: ['body'],
    real: { h: 0.8, l: 3, w: 1.2 }, foot: [0.4, 0.4], reflect: true,
    palette: {
      base: { wood: ['#7a6650', '#5c4a3a', '#9c876a', '#3e3228'], wet: ['#2e2a24', '#46403a'], moss: ['#5a6a3a', '#6e7e44'], rope: '#b8a274' },
      autumn: { wood: ['#74604a', '#564434', '#94805f', '#3a2e24'], moss: ['#7a6a32', '#8e7a3c'] }, winter: { wood: ['#5e5a54', '#46423c', '#86817a', '#302c28'], wet: ['#24221e', '#3a3632'], moss: ['#4a5446', '#5c6456'] },
    },
    tags: ['uk', 'pond', 'angling', 'swim', 'platform', 'wyndhams-pool', 'class:structure', 'kit:water', 'kit:temperate', 'role:street'],
    credit: "drawn for the Wyndham's Pool proof scene",
    build() {
      const r = rndOf(41), posts = [6, 96, 186, 276], back = [40, 130, 220];
      const body = [];
      for (const x of back) body.push(['@wood.3', `M${x} -54h7v54h-7z`, .85], ['@wet.0', `M${x} -6h7v6h-7z`, .7]);
      body.push(['@wood.0', 'M0 -58L300 -58L300 -46L0 -46z'], ['@wood.2', 'M0 -58L300 -58L300 -55L0 -55z', .8]);
      let planks = '';
      for (let x = 8; x < 300; x += 9 + r() * 2) planks += `M${f1(x)} -58l-1.2 12`;
      body.push({ s: '@wood.3', w: 0.9, op: .55, d: planks });
      body.push(['@wood.1', 'M0 -46L300 -46L300 -38L0 -38z'], { s: '@wood.3', w: 1, op: .6, d: 'M0 -42H300' });
      for (const x of posts) body.push(['@wood.1', `M${x} -46h9v46h-9z`], ['@wood.2', `M${x} -46h3v46h-3z`, .55], ['@wet.0', `M${x} -9h9v9h-9z`, .8], ['@moss.0', `M${x} -14h9v5h-9z`, .5]);
      body.push(['@wood.1', 'M286 -92h11v92h-11z'], ['@wood.2', 'M286 -92h4v92h-4z', .6], ['@wood.0', ell(291.5, -92, 5.5, 1.8)], ['@wet.0', 'M286 -9h11v9h-11z', .8]);
      body.push({ s: '@rope', w: 1.6, op: .9, d: 'M286 -70q-6 4 0 8' });
      body.push(['@moss.1', 'M0 -46q14 4 28 0v4q-14 3-28-1z', .6], ['@moss.0', 'M-6 -48q8-8 18-2l-4 4z', .8]);
      return { body };
    },
  });

  /* ---------- structure.wp-bivvy: a night angler's dome bivvy with rods on a rest; its lantern lights after dusk (the 'lit' part) ---------- */
  defineObj({
    id: 'structure.wp-bivvy', category: 'structure', size: [160, 70], variants: 1, seasonal: true, flippable: true, parts: ['body', 'lit'],
    real: { h: 1.3, l: 3, w: 2.4 }, foot: [1.2, 1],
    light: { kind: 'lamp', r: 4, h: 0.6, col: '#ffc878' },
    night: { glow: { lamp: '#ffd08a' }, on: 1 },
    palette: {
      base: { tent: ['#4e5a3a', '#3a4430', '#66724a', '#2a3022'], rod: '#2a2620', pod: '#6a6a6a', chair: ['#3a3e30', '#55583f'] },
      autumn: { tent: ['#56583a', '#40422e', '#6e7048', '#2c2e22'] }, winter: { tent: ['#4a5246', '#383e36', '#606a5c', '#262a24'] },
    },
    tags: ['uk', 'pond', 'angling', 'bivvy', 'night', 'wyndhams-pool', 'class:structure', 'kit:water', 'kit:temperate', 'role:street'],
    credit: "drawn for the Wyndham's Pool proof scene",
    build() {
      return {
        body: [
          ['@tent.1', 'M-70 0q4-58 66-64 60 2 70 64z'], ['@tent.2', 'M-62-6q10-48 58-54-34 14-40 56z', .7], ['@tent.0', 'M-20 0q2-40 22-50 26 10 30 50z'],
          ['@tent.3', 'M-12 0q4-28 14-36 14 8 18 36z', .85], { s: '@tent.3', w: 1.4, op: .6, d: 'M-60-8q30-50 70-54M-30 0q20-36 40-58' },
          ['@chair.0', 'M30-22h22v-6h-22zM32-22l-4 22M50-22l4 22'], ['@chair.1', 'M30-34h22v12h-22z'],
          { s: '@pod', w: 1.6, d: 'M64 0l6-30M80 0l-4-30M64-26h18' },
          { s: '@rod', w: 1.2, d: 'M66-30l92-26M70-28l90-14' },
          { f: '@tent.3', d: 'M-6-14h12v6h-12z', glow: 'lamp' },
        ],
        lit: [{ f: { rad: [[0, '#ffd890', .85], [0.5, '#ffb860', .35], [1, '#ff9a40', 0]], cx: 4, cy: -22, r: 40 }, d: 'M-70 0q4-58 66-64 60 2 70 64z' }, ['#ffe2a8', ell(0, -12, 5, 3.4), .95]],
      };
    },
  });

  /* ---------- bird.wp-heron-stalk: the waterline at y 0; the shins stand in the water ---------- */
  defineObj({
    id: 'bird.wp-heron-stalk', category: 'bird', size: [120, 110], variants: 1, seasonal: false, flippable: true, parts: ['legB', 'body', 'legA', 'neck'],
    real: { h: 0.85, l: 0.9, w: 0.3 }, foot: [0.15, 0.1], reflect: true, float: { level: 0, beam: 0.3 },
    palette: { base: { grey: ['#9aa4ac', '#c0c8cc', '#5d6870', '#3a4048'], white: ['#e8ecee', '#d6dcde'], bill: ['#e6b84a', '#c99a34'], leg: ['#b8a060', '#8e7a48'], black: '#20262c' } },
    anim: { walk: { parts: ['legA', 'legB'], pivot: [-2, -44], deg: 9, period: 3.6, bob: 0.6 }, turn: { part: 'neck', pivot: [16, -66], deg: 58, period: 6.5, hold: .82 } },
    tags: ['uk', 'pond', 'heron', 'grey-heron', 'wader', 'water', 'class:bird-water', 'kit:birds', 'kit:water', 'role:bird'],
    credit: "drawn for the Wyndham's Pool proof scene, after the library's heron",
    build() {
      const leg = (c, k) => [{ s: '@leg.' + c, w: 2.8, d: `M-2 -44l${k * 3} 22l${-k * 2} 22` }, { s: '@leg.1', w: 1.6, op: .6, d: `M${-2 + k * 3} -22l3 -1` }];
      return {
        legB: leg(1, -1),
        legA: leg(0, 1),
        body: [
          ['@grey.0', 'M-40-52q2-16 22-22 24-6 40 4 6 6 0 14-18 12-44 10z'],
          ['@grey.1', 'M-30-64q14-12 34-10 10 2 14 8-18-6-48 2z', .85],
          ['@grey.2', 'M-44-50q6-14 22-18-6 14-22 18z'],
          ['@grey.3', 'M-48-49l-14 6 16-1z'],
          { s: '@grey.3', w: 1.1, op: .55, d: 'M-30-58q10-5 22-6M-24-52q12-4 26-4' },
          ['@white.1', 'M-14-46q14 4 30-2-14 6-30 2z', .7],
        ],
        neck: [
          { s: '@white.0', w: 7.5, d: 'M14-66q14-2 18 4t12 2' },
          { s: '@grey.1', w: 2.2, op: .6, d: 'M16-69q12-2 16 3' },
          { s: '@black', w: 1.2, op: .6, d: 'M24-62l1 4M30-60l1 4' },
          ['@white.0', 'M40-66q8-8 14-1l-2 7-11 1z'],
          { s: '@black', w: 2.2, d: 'M44-68l-12 2' },
          ['@bill.0', 'M52-62l22 10-23-4z'], ['@bill.1', 'M52-59l22 7-21-2z', .8],
          ...eye(48, -64, 1.5),
        ],
      };
    },
  });

  /* ---------- bird.wp-kingfisher-perch: the feet at y 0 (on a post top) ---------- */
  defineObj({
    id: 'bird.wp-kingfisher-perch', category: 'bird', size: [34, 26], variants: 1, seasonal: false, flippable: true, parts: ['body', 'head'],
    real: { h: 0.17, l: 0.17, w: 0.06 },
    palette: { base: { blue: ['#1e8fc4', '#3fb0e0', '#155f8a', '#7fd8f4'], orange: ['#e0742a', '#f29a4a'], white: '#f6f2ea', bill: '#1a1a1a' } },
    anim: { turn: { part: 'head', pivot: [4, -16], deg: 16, period: 2.6, hold: .45 } },
    tags: ['uk', 'pond', 'kingfisher', 'perched', 'class:air', 'kit:birds', 'kit:water', 'role:bird'],
    credit: "the library's kingfisher, without its twig",
    build() {
      return {
        body: [['@blue.2', 'M-11-4l-8 8 3 2 8-7z'], ['@orange.0', 'M-8 0q-4-10 4-16 8-2 10 4 2 8-4 13z'], ['@orange.1', 'M0-6q3 2 2 6l-3 1z', .8], ['@blue.0', 'M-12-4q-2-10 8-14 6 0 4 6-6 6-12 8z'], ['@blue.1', 'M-8-10q4-6 10-6-2 4-10 6z'], ['@blue.3', 'M-10-6l14-6-1 2z', .9],
          { s: '#c0583a', w: 1.2, d: 'M-2 0v2M2 0v2' }],
        head: [['@blue.0', 'M-2-16q2-10 10-8 6 2 4 8l-6 4z'], ['@blue.1', 'M0-21q4-4 8-2-4 0-8 2z'], ['@orange.0', 'M4-18q4-1 6 1l-4 2z'], ['@white', 'M5-14q4-1 5 2l-4 1z'], ['@bill', 'M11-18.6l10 2-10 1.4z'], ...eye(6, -19, 1.2)],
      };
    },
  });

  /* ---------- water.wp-dive-ring: the splash crown and the first rings, centred on the waterline ---------- */
  defineObj({
    id: 'water.wp-dive-ring', category: 'water', size: [80, 30], variants: 1, seasonal: false, flippable: false, parts: ['body'],
    real: { h: 0.12, l: 0.5 },
    palette: { base: { ring: ['#eef8fb', '#ffffff'], splash: ['#e4f2f6', '#ffffff'] } },
    tags: ['uk', 'pond', 'splash', 'ripple', 'kingfisher', 'class:air', 'kit:water', 'role:edge'],
    credit: "drawn for the Wyndham's Pool proof scene",
    build() {
      return { body: [
        { s: '@ring.0', w: 1.8, op: .85, d: ell(0, 0, 34, 6.5) }, { s: '@ring.1', w: 1.4, op: .7, d: ell(0, 0, 22, 4.2) }, { s: '@ring.1', w: 1.2, op: .9, d: ell(0, 0, 11, 2.2) },
        ['@splash.0', 'M-8 0l-3-10 4 5 1-14 3 12 2-17 2 15 3-11 1 9 4-6-3 10z', .85], ['@splash.1', circ(-9, -16, 1.3)], ['@splash.1', circ(6, -21, 1.1)], ['@splash.1', circ(12, -12, 1)], ['@splash.1', circ(-2, -24, 1.2)],
      ] };
    },
  });

  /* ---------- bird.wp-swallow: the body centre at (0, 0); spring, summer and early autumn only ---------- */
  defineObj({
    id: 'bird.wp-swallow', category: 'bird', size: [40, 20], variants: 2, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'wings'],
    real: { h: 0.1, l: 0.19, w: 0.33 },
    palette: { base: { blue: ['#1c2a44', '#2c3e60', '#0e1626'], red: '#b8402a', cream: '#f2e8d8' }, autumn: { blue: ['#2a3448', '#3a4a64', '#161e2c'], red: '#a0503a', cream: '#e6d8c0' }, winter: { blue: ['#3a4250', '#4a5464', '#262c36'], red: '#8a5a4a', cream: '#d8d0c4' } },
    anim: { flap: { part: 'wings', pivot: [0, -1], sy: [-.9, 1], period: .22 } },
    tags: ['uk', 'sky', 'swallow', 'hirundine', 'flight', 'class:air', 'kit:birds', 'kit:temperate', 'role:bird'],
    credit: "drawn for the Wyndham's Pool proof scene",
    build(v, r, ctx) {
      if (ctx && ctx.season === 'winter') return { body: [['@blue.2', circ(0, 0, .4), .02]], wings: [] };   // gone south for the winter
      const b = v ? 1 : 0;
      return {
        body: [['@blue.' + b, 'M-9 0q5-4 14-3l5 2-5 2q-9 2-14-1z'], ['@blue.2', 'M-9 0l-13-5 6 5-6 4z'], { s: '@blue.2', w: .8, d: 'M-16-3l-6-3M-16 3l-6 2' },
          ['@cream', 'M-4 1q7 2 11 0-5 2-11 0z'], ['@red', 'M7-1l4 1-4 1z']],
        wings: [['@blue.' + b, 'M-3-1q-6-9-17-13 10 2 20 11z'], ['@blue.2', 'M-1-1q3-9 10-14-3 9-7 14z', .9]],
      };
    },
  });

  /* ---------- animal.wp-bat: a pipistrelle, only after real dusk (everything in 'lit'); hibernating in winter ---------- */
  defineObj({
    id: 'animal.wp-bat', category: 'animal', size: [34, 16], variants: 2, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    real: { h: 0.06, l: 0.08, w: 0.22 }, shade: false,
    palette: { base: { bat: ['#1e1a20', '#2a2430', '#3a3040'] }, autumn: { bat: ['#201a1e', '#2c2428', '#3c3236'] } },
    anim: { bob: { part: '*', dy: 2.2, period: .19 } },
    tags: ['uk', 'bat', 'pipistrelle', 'dusk', 'night', 'class:air', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: "drawn for the Wyndham's Pool proof scene",
    build(v, r, ctx) {
      if (ctx && ctx.season === 'winter') return { body: [], lit: [] };
      const up = v === 1;
      const wings = up
        ? 'M0-2q-4-6-9-9-3 3-8 2-2 3-6 2 6-1 9 4 6 2 14 1zM0-2q4-6 9-9 3 3 8 2 2 3 6 2-6-1-9 4-6 2-14 1z'
        : 'M0-1q-6 1-10 4-3-2-7 0-3-2-7 1 5-5 10-7 7-2 14 0zM0-1q6 1 10 4 3-2 7 0 3-2 7 1-5-5-10-7-7-2-14 0z';
      return { body: [], lit: [['@bat.0', wings, .92], ['@bat.1', ell(0, -1.5, 2.6, 3.4)], ['@bat.0', 'M-1.6-4.4l-.8-2.4 1.6 1.2zM1.6-4.4l.8-2.4-1.6 1.2z']] };
    },
  });

  /* ---------- sky.wp-mist: a wisp of mist lying on the water, only after real dusk (everything in 'lit') ---------- */
  defineObj({
    id: 'sky.wp-mist', category: 'sky', size: [720, 44], variants: 5, seasonal: false, flippable: true, parts: ['body', 'lit'],
    real: { h: 1.2, l: 40 }, shade: false,
    palette: { base: { mist: ['#a8b0be', '#bcc3cf', '#8e97a8'] } },
    tags: ['uk', 'mist', 'pond', 'dusk', 'dawn', 'class:air', 'kit:water', 'kit:temperate', 'role:sky'],
    credit: "drawn for the Wyndham's Pool proof scene",
    build(v) {
      // it HANGS BELOW its anchor (14, 32 or 66 units by variant): an anchor above the water keeps the water pass from mirroring
      // a whole wisp every frame (mist does not reflect; its glow is on the water already)
      // v0 to v2: long banks lying still on the water (static: baked, free per frame); v3, v4: small wisps that drift
      const r = rndOf(91 + v * 17), lit = [], off = [14, 32, 66, 24, 46][v] || 14, small = v >= 3;
      for (let i = 0, n = small ? 3 : 7; i < n; i++) {
        const x = small ? -110 + i * 100 + (r() - .5) * 40 : -280 + i * 90 + (r() - .5) * 60, w = small ? 60 + r() * 50 : 90 + r() * 110, h = 5 + r() * 7, y = off - 4 + (r() - .5) * 8;
        lit.push(['@mist.' + (i % 3), ell(f1(x), f1(y), f1(w), f1(h)), f1(.045 + r() * .035)]);
        lit.push(['@mist.1', ell(f1(x + 10), f1(y + 1), f1(w * .55), f1(h * .5)), f1(.03 + r() * .03)]);
      }
      lit.push(['@mist.2', ell(0, off - 1, small ? 150 : 330, 6), .03]);
      return { body: [], lit };
    },
  });

  /* ---------- tree.wp-pine-bough: a Scots pine bough hanging in from the top-left; the anchor is where it leaves the frame ---------- */
  defineObj({
    id: 'tree.wp-pine-bough', category: 'tree', size: [620, 300], variants: 1, seasonal: true, flippable: true, parts: ['body'],
    real: { h: 3, l: 6 },
    palette: {
      base: { bark: ['#b8673a', '#8a4a2a', '#d88a52', '#4a2e22'], needle: ['#24382c', '#2f4a36', '#3e5e40', '#5a7a4a', '#16241c'], cone: ['#6a4a30', '#8a6a46'] },
      spring: { needle: ['#26402e', '#335238', '#4a6e44', '#7a9a52', '#16241c'] },
      autumn: { bark: ['#b06a40', '#86502e', '#cc8a58', '#4a3024'], needle: ['#34402a', '#445432', '#5a6a38', '#8a8a44', '#1e261a'] },
      winter: { bark: ['#9a6040', '#744430', '#b8805a', '#3e2a22'], needle: ['#1e2e2a', '#283a34', '#34483e', '#5a6a5e', '#121c18'] },
    },
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 0.9 } },
    tags: ['uk', 'scots-pine', 'pine', 'bough', 'framing', 'evergreen', 'class:air', 'kit:temperate', 'role:tree'],
    credit: "drawn for the Wyndham's Pool proof scene",
    build() {
      const r = rndOf(7), body = [];
      // the main limb: thick at the frame edge, curving down and out, with side shoots
      body.push(['@bark.1', 'M-20 -10q160 20 300 90 120 60 300 96l2 6q-190-30-306-88-140-68-296-78z']);
      body.push(['@bark.2', 'M-20 -10q160 20 300 90 120 60 300 96l-1 2q-180-34-300-92-140-66-299-90z', .7]);
      body.push({ s: '@bark.1', w: 5, d: 'M150 46q30-40 96-52M300 120q40 30 44 76M420 150q60-20 116-14M220 80q-10 50-56 88M480 160q30 10 50 26M540 186q30 4 62 12M100 30q60-10 96-32' });
      body.push({ s: '@bark.3', w: 2, op: .5, d: 'M40 8q60 14 120 36M330 132q60 30 140 48' });
      // needle tufts at the shoot tips: a dark core, then fans of needle strokes (dark below, lit above), never round pads
      const tufts = [[250, -14, 58], [196, 2, 40], [306, -22, 38], [346, 196, 50], [304, 214, 36], [392, 224, 34], [548, -6, 50], [606, 14, 38], [474, 142, 54],
        [528, 182, 46], [604, 198, 40], [162, 172, 48], [116, 196, 36], [214, 152, 32], [424, 104, 36], [64, 36, 34]];
      const fan = (x, y, k, a0, a1, n, lmin, lmax, droop) => {
        let d = '';
        for (let i = 0; i < n; i++) {
          const a = a0 + (a1 - a0) * (i + r() * .8) / n, l = k * (lmin + r() * (lmax - lmin)), sx = x + Math.cos(a) * k * .12, sy = y + Math.sin(a) * k * .08;
          const ex = sx + Math.cos(a) * l, ey = sy + Math.sin(a) * l * .62 + droop * l * .25;
          d += `M${f1(sx)} ${f1(sy)}Q${f1((sx + ex) / 2)} ${f1((sy + ey) / 2 - l * .08)} ${f1(ex)} ${f1(ey)}`;
        }
        return d;
      };
      for (const [x, y, k] of tufts) {
        body.push(['@needle.4', ell(x, y + k * .06, k * .42, k * .2), .95]);
        body.push({ s: '@needle.4', w: 2.6, op: .95, d: fan(x, y + 2, k, Math.PI * .05, Math.PI * .95, 14, .45, .8, 1) });
        body.push({ s: '@needle.0', w: 2.4, d: fan(x, y, k, -Math.PI * 1.05, Math.PI * .05, 20, .55, 1, .2) });
        body.push({ s: '@needle.1', w: 2.1, d: fan(x, y - 2, k * .9, -Math.PI * .95, -Math.PI * .05, 16, .5, .9, 0) });
        body.push({ s: '@needle.2', w: 1.8, op: .9, d: fan(x - k * .05, y - 4, k * .75, -Math.PI * .85, -Math.PI * .2, 11, .45, .85, 0) });
        body.push({ s: '@needle.3', w: 1.4, op: .7, d: fan(x - k * .1, y - 6, k * .55, -Math.PI * .8, -Math.PI * .3, 6, .4, .8, 0) });
      }
      body.push(['@cone.0', ell(352, 206, 7, 11)], ['@cone.1', ell(350, 202, 4, 6), .7], ['@cone.0', ell(486, 160, 6, 9)]);
      return { body };
    },
  });
})();

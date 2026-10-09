/* ============================================================
   SCENE LIBRARY: hampshire landmarks (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.
   Check with: node tools/anim-pack.mjs object lint <id>,
   LOOK with: node tools/anim-pack.mjs object sheet <id> --mode night.

   Hampshire's named places: Winchester Cathedral, the King Alfred statue, the
   Great Hall, the Spinnaker Tower, HMS Victory in her dry dock, HMS Warrior,
   the Bargate, the Farnborough airship hangar frame, Fleet station, Jane
   Austen's House at Chawton, and the Georgian storehouses of the Historic
   Dockyard. Lit from the LEFT; anchor at the ground (or waterline) centre.
   Variant 1 of a landmark is the same place mirrored in plan (a view from the
   other side); scenes never flip them. Winter lays snow on roofs and lawns;
   the turf, borders and harbour water follow the season. No text, no emblems.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = (n) => Math.round(n * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry = rx) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const poly = (...p) => 'M' + p.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + 'z';
  /** A round-headed (Norman) opening, x/y top-left, w wide, h tall. */
  const rarch = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w / 2)}A${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(x + w)} ${f1(y + w / 2)}V${f1(y + h)}z`;
  /** A pointed (Gothic) opening. */
  const parch = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w * .55)}Q${f1(x)} ${f1(y)} ${f1(x + w / 2)} ${f1(y - w * .2)}Q${f1(x + w)} ${f1(y)} ${f1(x + w)} ${f1(y + w * .55)}V${f1(y + h)}z`;
  /** Battlements: merlons along y from x0 to x1. */
  const crenel = (x0, x1, y, h = 5, step = 8) => { let d = ''; for (let x = x0; x < x1 - 1; x += step) d += rect(x, y - h, Math.min(step / 2, x1 - x), h); return d; };
  /** A window that lights at dusk: surround, glass (glow), a pane highlight and glazing bars. */
  const win = (shape, x, y, w, h, bars = 1) => [
    { f: '@glass.0', d: shape(x, y, w, h), glow: 'window' },
    ['@glass.1', shape(x, y, w * .45, h * .5), .35],
    ...(bars ? [{ s: '@dress', w: .7, d: `M${f1(x + w / 2)} ${f1(y + w * .3)}V${f1(y + h)}` + (bars > 1 ? `M${f1(x)} ${f1(y + h * .55)}h${f1(w)}` : '') }] : []),
  ];
  const SEAS = {
    spring: { turf: ['#6e9a44', '#8cb85a', '#4e7832'], leaf: ['#6a9a3e', '#9cc45a', '#4a7a2e'], bloom: ['#f4d84a', '#f2a6c0', '#ffffff'], sea: ['#4a7a88', '#6a9aa6', '#a8c8d0'] },
    summer: { turf: ['#5e8a38', '#7aa44a', '#3e6a2a'], leaf: ['#3e6a2a', '#5a8a3a', '#2a5020'], bloom: ['#e04a5a', '#f2c040', '#c070d0'], sea: ['#3a7088', '#5a94aa', '#b0d4dc'] },
    autumn: { turf: ['#7a8a44', '#9aa058', '#5a6a34'], leaf: ['#a8602a', '#d08a3a', '#7a4a22'], bloom: ['#d0702a', '#e0a040', '#a04a30'], sea: ['#4a6670', '#6a868e', '#98b0b4'] },
    winter: { turf: ['#9aa494', '#c8d0c8', '#76806e'], leaf: ['#6a6a5a', '#8a8474', '#4a4a40'], bloom: ['#e8e8f0', '#c8c0d8', '#a8a0b8'], sea: ['#4a5e68', '#6a7e86', '#9aaab0'] },
  };
  const seasPal = (base) => Object.assign({ base: Object.assign({ snow: ['#f2f5f8', '#d8e0ea'], glass: ['#3e4a58', '#a8b8c8'], flood: ['#ffe2a8'] }, base) }, JSON.parse(JSON.stringify(SEAS)));
  /** A turf strip with tufts from x0 to x1 (the ground the landmark stands on). */
  const turf = (x0, x1, y = 0, rnd) => {
    let t = '';
    for (let x = x0 + 4; x < x1 - 4; x += 9) { const h = 3 + ((x * 7919) % 5); t += `M${f1(x)} ${y}l1.5 ${-h}l1.5 ${h}z`; }
    return [['@turf.0', rect(x0, y - 3, x1 - x0, 6)], ['@turf.2', rect(x0, y + 1, x1 - x0, 2), .6], { f: '@turf.1', d: t, op: .8, detail: true }];
  };
  /** A row of seasonal shrubs (leaf slot) along the ground: n separate clumps. */
  const shrubs = (x0, x1, n, y = 0, h = 10) => Array.from({ length: n }, (_, i) => { const x = x0 + (x1 - x0) * (i + .5) / n; return ['@leaf.' + (i % 3), `M${f1(x - h * .9)} ${y}Q${f1(x - h)} ${f1(y - h * 1.1)} ${f1(x)} ${f1(y - h * 1.2)}Q${f1(x + h)} ${f1(y - h * 1.1)} ${f1(x + h * .9)} ${y}z`]; });
  /** Shapes to world form: optional mirror and scale; thin strokes become detail. */
  const fin = (arr, mirror, k = 1) => arr.filter(Boolean).map((s) => {
    const o = Array.isArray(s) ? { f: s[0], d: s[1] } : Object.assign({}, s);
    if (Array.isArray(s) && s[2] != null) o.op = s[2];
    if (mirror || k !== 1) o.m = [mirror ? -k : k, 0, 0, k, 0, 0];
    if (o.s && !o.f && !o.glow && (o.w || 0) <= 1) o.detail = true;
    if (o.s && !o.cap) o.cap = 'round';
    return o;
  });
  const define = (def) => sceneObjDefine(Object.assign({ category: 'landmark', flippable: false, seasonal: true, shapeBySeason: true, parts: ['body', 'lit'], night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: .8 } }, def));

  /* ---------------- Winchester Cathedral from the Close lawn (the long nave from the north-west, the squat Norman tower; seasons and a mirror view) ---------------- */
  define({
    id: 'landmark.winchester-cathedral-close',
    size: [680, 210], variants: 2,
    palette: seasPal({ stone: ['#cfc2a0', '#a99b78', '#e4dabe', '#8c7f60'], lead: ['#7f8c8e', '#5f6a6c', '#9aa6a8'], dress: ['#ece4cc'], dark: ['#3a3630', '#5a544a'], path: ['#c8bca4'] }),
    shadow: { rx: 320, ry: 16, h: 200 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/winchester-cathedral', 'uk', 'hampshire', 'winchester', 'cathedral', 'kit:temperate'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter';
      // the presbytery and the retrochoir behind the tower, the low Lady Chapel at the east end
      P(['@stone.1', rect(150, -100, 140, 100)], ['@stone.3', rect(150, -100, 140, 6), .5], ['@lead.0', poly([146, -100], [160, -116], [282, -116], [294, -100])], ['@lead.1', poly([230, -116], [282, -116], [294, -100], [240, -100]), .5]);
      for (let x = 160; x < 285; x += 26) P(...win(parch, x, -92, 10, 30, 1), ...win(parch, x, -46, 10, 32, 1), ['@stone.2', rect(x + 16, -60, 6, 60)]);
      P(['@stone.0', rect(290, -62, 40, 62)], ['@lead.0', poly([287, -62], [300, -74], [328, -74], [333, -62])], ...win(parch, 302, -54, 14, 40, 2));
      // the central tower: plain, broad and low, round-arched belfry openings, a battlemented top with corner pinnacles
      P(['@stone.0', rect(60, -186, 80, 186)], ['@stone.1', rect(112, -186, 28, 186), .55], ['@stone.2', rect(60, -186, 10, 186), .5]);
      P(['@stone.0', crenel(58, 142, -186, 6, 8)], ['@stone.2', rect(57, -200, 7, 20)], ['@stone.2', rect(136, -200, 7, 20)], ['@stone.1', poly([57, -200], [60.5, -208], [64, -200])], ['@stone.1', poly([136, -200], [139.5, -208], [143, -200])]);
      for (let i = 0; i < 4; i++) { const x = 66 + i * 18; P(['@dark.0', rarch(x, -172, 10, 26)], { s: '@stone.3', w: .7, d: `M${x} -156h10M${x} -152h10M${x} -148h10` }, ['@stone.3', rect(x - 2, -176, 14, 2), .6]); }
      P({ s: '@stone.3', w: 1, op: .6, d: 'M60-140H140M60-122H140' });
      // the north transept: a Norman gable with tiers of round-headed windows and corner turrets
      P(['@stone.0', poly([24, 0], [24, -120], [80, -152], [136, -120], [136, 0])], ['@stone.1', poly([100, 0], [100, -138], [136, -120], [136, 0]), .45]);
      P(['@stone.2', rect(20, -136, 10, 136)], ['@stone.2', rect(130, -136, 10, 136)], ['@stone.1', poly([20, -136], [25, -148], [30, -136])], ['@stone.1', poly([130, -136], [135, -148], [140, -136])]);
      for (const [x, y] of [[44, -110], [72, -110], [100, -110], [56, -70], [92, -70]]) P(...win(rarch, x, y, 14, 28, 0));
      P(['@dark.0', rarch(70, -30, 20, 30)], ['@stone.3', rarch(67, -33, 26, 33), .35], ['@dark.1', rarch(73, -27, 14, 27)]);
      P({ s: '@stone.3', w: 1, op: .5, d: 'M24-80H136M24-40H136' });
      // the nave: the longest medieval nave in Europe; aisle, clerestory, a low-pitched lead roof
      P(['@stone.2', rect(-250, -114, 276, 56)], ['@stone.0', rect(-250, -60, 276, 60)], ['@stone.1', rect(-250, -8, 276, 8), .5]);
      P(['@lead.0', poly([-254, -114], [-242, -132], [22, -132], [26, -114])], ['@lead.2', poly([-254, -114], [-242, -132], [-150, -132], [-160, -114]), .5], ['@lead.1', rect(-250, -68, 276, 8)]);
      for (let x = -246; x < 20; x += 29) {
        P(...win(parch, x + 9, -106, 10, 34, 1), ...win(parch, x + 8, -52, 12, 40, 2));
        P(['@stone.2', rect(x, -76, 7, 76)], ['@stone.3', rect(x + 5, -76, 2, 76), .5], ['@stone.2', poly([x - 1, -76], [x + 3.5, -88], [x + 8, -76])]);
        P({ s: '@stone.3', w: 2, d: `M${x + 3} ${-80}Q${x + 3} ${-106} ${x + 14} ${-112}` });
      }
      // the west front: the great Perpendicular window over three porch arches, stair turrets with pinnacles
      P(['@stone.0', poly([-330, 0], [-330, -134], [-290, -170], [-250, -134], [-250, 0])], ['@stone.2', poly([-330, 0], [-330, -134], [-318, -145], [-318, 0]), .55]);
      P({ f: '@glass.0', d: parch(-312, -150, 44, 96), glow: 'window' }, ['@glass.1', parch(-312, -150, 18, 50), .3]);
      P({ s: '@dress', w: 1.2, d: 'M-301.5-148V-54M-290-152V-54M-279-148V-54M-312-110H-268M-312-84H-268' });
      for (const x of [-322, -297, -272]) P(['@dark.0', parch(x, -40, 16, 40)], ['@stone.3', parch(x - 3, -43, 22, 43), .3], ['@dark.1', parch(x + 3, -34, 10, 34)]);
      for (const x of [-338, -256]) P(['@stone.2', rect(x, -164, 12, 164)], ['@stone.1', rect(x + 7, -164, 5, 164), .5], ['@stone.1', poly([x - 1, -164], [x + 6, -186], [x + 13, -164])], { s: '@stone.3', w: .8, d: `M${x} -60h12M${x} -110h12` });
      P(['@stone.1', poly([-293, -170], [-290, -184], [-287, -170])]);
      // stone courses and the Close lawn in front, a path to the west door
      for (let r = 0; r < 4; r++) P({ s: '@stone.3', w: .6, op: .35, d: `M-250 ${-14 - r * 12}H26` });
      P(...turf(-360, 350, 0), ['@path', poly([-300, 0], [-292, -1], [-282, 4], [-304, 4])]);
      if (W) P(['@snow.0', poly([-254, -114], [-242, -132], [22, -132], [26, -114], [20, -118], [-246, -118])], ['@snow.0', poly([146, -100], [160, -116], [282, -116], [294, -100], [280, -103], [160, -103])], ['@snow.0', rect(58, -188, 84, 3)], ['@snow.1', rect(-360, -4, 710, 4)]);
      const lit = [
        { f: { rad: [[0, '@flood', .3], [1, '@flood', 0]], cx: -290, cy: -80, r: 110 }, d: poly([-340, 0], [-340, -170], [-250, -170], [-250, 0]) },
        { f: { rad: [[0, '@flood', .28], [1, '@flood', 0]], cx: 100, cy: -120, r: 120 }, d: rect(20, -200, 124, 200) },
        { f: { rad: [[0, '@flood', .14], [1, '@flood', 0]], cx: -110, cy: -60, r: 160 }, d: rect(-250, -134, 276, 134) },
      ];
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });

  /* ---------------- The King Alfred statue (Hamo Thornycroft, 1899) on its granite blocks, The Broadway ---------------- */
  define({
    id: 'landmark.king-alfred-statue',
    size: [120, 200], variants: 2,
    palette: seasPal({ granite: ['#8e8a84', '#6e6a66', '#aaa6a0', '#5a5652'], bronze: ['#3e4a40', '#2a332c', '#6a7a5e', '#8a9a74'], pave: ['#b8b0a2', '#9a9286'] }),
    shadow: { rx: 50, ry: 8, h: 200 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/winchester', 'uk', 'hampshire', 'winchester', 'statue', 'kit:temperate'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter';
      // the paved island and its flower border
      P(['@pave.0', poly([-60, 4], [-54, -6], [54, -6], [60, 4])], ['@pave.1', rect(-60, 2, 120, 3)]);
      P(['@turf.0', poly([-56, -2], [-50, -8], [-30, -8], [-30, -2])], ['@turf.0', poly([30, -2], [30, -8], [50, -8], [56, -2])]);
      P(...shrubs(-56, -30, 4, -6, 6), ...shrubs(30, 56, 4, -6, 6));
      for (let i = 0; i < 16; i++) { const x = i < 8 ? -54 + i * 3.2 : 32 + (i - 8) * 3.2; P({ f: '@bloom.' + (i % 3), d: ell(x, -8 - (i % 2) * 1.5, 1.8, 1.6), detail: true }); }
      // the two great rough granite blocks (left lit, right in shade), chisel-rough faces
      P(['@granite.0', poly([-30, -6], [-31, -44], [-26, -50], [24, -51], [31, -45], [30, -6])], ['@granite.1', poly([8, -6], [10, -50], [24, -51], [31, -45], [30, -6]), .7], ['@granite.2', poly([-30, -44], [-26, -50], [10, -51], [6, -46]), .7]);
      P(['@granite.0', poly([-22, -50], [-24, -82], [-18, -88], [18, -88], [23, -82], [22, -50])], ['@granite.1', poly([6, -50], [8, -88], [18, -88], [23, -82], [22, -50]), .7], ['@granite.2', poly([-24, -82], [-18, -88], [8, -88], [4, -84]), .7]);
      const r = sceneRnd(41);
      for (let i = 0; i < 26; i++) { const top = i < 14, x = top ? -20 + r() * 40 : -28 + r() * 56, y = top ? -84 + r() * 30 : -46 + r() * 38; P({ f: '@granite.' + (i % 2 ? 3 : 2), d: poly([x, y], [x + 3 + r() * 3, y + 1], [x + 2, y + 2 + r() * 2]), op: .45, detail: true }); }
      // Alfred: long robe and cloak, the shield at his left side, the sword raised by the hilt (a cross-hilt silhouette)
      P(['@bronze.1', 'M-14-88Q-22-120-16-140Q-12-150-4-152L6-150Q14-146 14-136Q16-112 12-88z']);
      P(['@bronze.0', 'M-10-88Q-14-116-8-138Q-4-148 2-148Q10-144 10-130Q12-110 9-88z'], ['@bronze.2', 'M-8-90Q-12-116-6-136Q-4-142 -2-142Q-6-118-4-90z', .8]);
      P(['@bronze.1', 'M-16-118Q-28-104-22-88H-12Q-18-102-10-120z'], ['@bronze.0', 'M-15-112Q-22-100-19-90H-14Q-17-102-11-116z', .8]);
      P(['@bronze.0', poly([12, -116], [22, -112], [22, -94], [16, -88], [10, -94], [10, -112])], ['@bronze.3', poly([12, -114], [20, -111], [20, -95], [16, -90]), .6], { s: '@bronze.1', w: 1, d: 'M16-113V-90M11-104H21' });
      P(['@bronze.0', 'M-2-150Q2-156 6-150L7-142H-3z'], ['@bronze.0', ell(1.5, -157, 4.2, 5)], ['@bronze.1', 'M-3-160Q1.5-167 6-160L6-158H-3z'], ['@bronze.2', 'M-2-158Q0-162 2-162L1-156z', .7], ['@bronze.1', 'M-2-154Q1-148 5-154L4-150Q1-147-1-150z']);
      P(['@bronze.0', 'M-3-146Q-8-160-6-170L-2-171Q-3-160 1-148z'], ['@bronze.2', 'M-5-150Q-7-160-6-168L-4-168Q-5-158-3-150z', .7]);
      P({ s: '@bronze.0', w: 2.2, d: 'M-4-172V-200' }, { s: '@bronze.0', w: 2.4, d: 'M-10-176H2' }, ['@bronze.2', ell(-4, -172, 2, 2)], { s: '@bronze.3', w: .7, d: 'M-4.6-178V-199' });
      P(['@bronze.1', 'M-11-88Q-9-84-5-88zM3-88Q6-84 10-88z']);
      if (W) P(['@snow.0', poly([-31, -44], [-26, -50], [24, -51], [31, -45], [26, -47], [-26, -47])], ['@snow.0', poly([-24, -82], [-18, -88], [18, -88], [23, -82], [18, -85], [-18, -85])], ['@snow.1', 'M-56-2L-50-9H-30V-4zM30-4V-9H50L56-2z']);
      const lit = [
        { f: { rad: [[0, '@flood', .36], [1, '@flood', 0]], cx: 0, cy: -120, r: 70 }, d: rect(-34, -205, 68, 205) },
        { f: { lin: [[0, '@flood', .3], [1, '@flood', 0]], x1: 0, y1: -6, x2: 0, y2: -60 }, d: poly([-32, -6], [-40, -80], [40, -80], [32, -6]) },
      ];
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });

  /* ---------------- The Great Hall, Winchester (the surviving hall of the castle, flint with stone dressings) ---------------- */
  define({
    id: 'landmark.winchester-great-hall',
    size: [400, 190], variants: 2,
    palette: seasPal({ flint: ['#7e7a70', '#625e56', '#9c988c'], stone: ['#d6caa8', '#b4a684', '#ece2c6'], roof: ['#6e4436', '#52302a', '#8a5a48'], dress: ['#ede4c8'], dark: ['#3a342c'] }),
    shadow: { rx: 190, ry: 14, h: 180 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/winchester', 'uk', 'hampshire', 'winchester', 'hall', 'kit:temperate'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter';
      // the long flint wall, stone quoins and plinth, the steep tiled roof
      P(['@flint.0', rect(-180, -96, 330, 96)], ['@flint.1', rect(60, -96, 90, 96), .4], ['@stone.1', rect(-180, -10, 330, 10)], ['@stone.0', rect(-180, -100, 330, 5)]);
      P(['@roof.0', poly([-186, -98], [-150, -168], [150, -168], [156, -98])], ['@roof.2', poly([-186, -98], [-150, -168], [-120, -168], [-150, -98]), .5], ['@roof.1', rect(-150, -170, 300, 4)]);
      for (let i = 0; i < 9; i++) P({ s: '@roof.1', w: .9, op: .45, d: `M${-182 + i * 3.6} ${-104 - i * 7.2}H${152 + i * .4}` });
      const r = sceneRnd(73);
      for (let row = 0; row < 7; row++) P({ f: '@flint.' + (row % 2 ? 2 : 1), op: .45, detail: true, d: Array.from({ length: 22 }, (_, i) => ell(-174 + i * 15 + (row % 2) * 7 + r() * 3, -16 - row * 11, 2.6, 1.6)).join('') });
      // four bays of tall paired lancets under a pointed head with a circle (plate tracery), buttresses between
      for (let i = 0; i < 4; i++) {
        const x = -150 + i * 72;
        P(['@stone.0', parch(x - 3, -88, 38, 76)], { f: '@glass.0', d: parch(x + 2, -76, 13, 60), glow: 'window' }, { f: '@glass.0', d: parch(x + 17, -76, 13, 60), glow: 'window' });
        P({ f: '@glass.0', d: ell(x + 16, -80, 5), glow: 'window' }, ['@glass.1', parch(x + 2, -76, 6, 30), .35], { s: '@dress', w: .8, d: `M${x + 2} -46h13M${x + 17} -46h13` });
        P(['@stone.1', rect(x + 46, -92, 10, 92)], ['@stone.2', rect(x + 46, -92, 4, 92), .7], ['@stone.1', poly([x + 45, -92], [x + 51, -102], [x + 57, -92])]);
      }
      P(['@stone.1', rect(-186, -100, 10, 100)]);
      // the east gable end with its great window and the arched doorway
      P(['@flint.1', poly([150, 0], [150, -98], [196, -168], [202, -168], [214, -98], [214, 0])], ['@stone.1', poly([148, -98], [198, -172], [216, -98], [210, -98], [198, -160], [154, -98])]);
      P({ f: '@glass.0', d: parch(166, -132, 32, 82), glow: 'window' }, { s: '@dress', w: 1, d: 'M176-130V-50M188-130V-50M166-90h32' }, ['@dark', parch(172, -36, 20, 36)], ['@stone.0', parch(169, -39, 26, 39), .3]);
      P(...shrubs(-196, -150, 3, 0, 9), ...shrubs(216, 236, 2, 0, 9), ...turf(-200, 240, 0));
      for (let i = 0; i < 6; i++) P({ f: '@stone.2', d: rect(-180 + i * 66, -60, 3, 3), op: .6, detail: true }, { f: '@stone.2', d: rect(-150 + i * 66, -30, 3, 3), op: .6, detail: true });
      if (W) P(['@snow.0', poly([-186, -98], [-150, -168], [150, -168], [156, -98], [140, -104], [-170, -104]), .9], ['@snow.1', rect(-200, -4, 430, 4)]);
      const lit = [{ f: { rad: [[0, '@flood', .22], [1, '@flood', 0]], cx: 0, cy: -60, r: 200 }, d: rect(-186, -170, 400, 170) }];
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });

  /* ---------------- The Spinnaker Tower, Gunwharf Quays, Portsmouth ---------------- */
  define({
    id: 'landmark.spinnaker-tower',
    size: [180, 570], variants: 2,
    palette: seasPal({ white: ['#f2f2ee', '#c8ccd0', '#ffffff', '#9aa2aa'], steel: ['#d8dce0', '#a8b0b8'], deck: ['#3e4c5a', '#8aa4b8'], quay: ['#b4aa98', '#8e8676'], led: ['#6ab8ff', '#c070ff'] }),
    shadow: { rx: 60, ry: 10, h: 560 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/portsmouth-harbour', 'uk', 'hampshire', 'portsmouth', 'tower', 'harbour', 'kit:temperate', 'kit:water'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter';
      // the harbour water and the quay at its foot
      P(['@sea.0', rect(-130, -2, 260, 16)], ['@sea.1', rect(-130, 8, 260, 6), .6]);
      for (let i = 0; i < 8; i++) P({ s: '@sea.2', w: 1, op: .6, d: `M${-120 + i * 31} ${2 + (i % 3) * 3}h${12 + (i % 2) * 8}` });
      P(['@quay.0', rect(-60, -12, 120, 12)], ['@quay.1', rect(-60, -4, 120, 4)], ...shrubs(-58, -36, 3, -12, 6), ...shrubs(36, 58, 3, -12, 6));
      for (let x = -56; x <= 56; x += 8) P(['@steel.1', rect(x, -20, 1.2, 8)]);
      // the spinnaker sail: two white steel arcs bowing out to the west, tied to the legs
      P({ s: '@white.1', w: 7, d: 'M-30-12Q-118-210-14-470' }, { s: '@white.0', w: 5, d: 'M-30-12Q-116-210-14-470' }, { s: '@white.2', w: 1.6, d: 'M-32-20Q-114-210-18-460' });
      P({ s: '@white.1', w: 4, d: 'M-22-12Q-80-220-10-460' }, { s: '@white.0', w: 2.6, d: 'M-22-12Q-80-220-10-460' });
      for (let i = 1; i < 12; i++) { const t = i / 12, y = -12 - t * 450, xo = (1 - t) * (1 - t) * -30 + 2 * (1 - t) * t * -118 + t * t * -14, xi = (1 - t) * (1 - t) * -22 + 2 * (1 - t) * t * -80 + t * t * -10; P({ s: '@steel.1', w: 1.4, d: `M${f1(xo)} ${f1(y)}L${f1(xi)} ${f1(y)}L${f1(-8 + t * 4)} ${f1(y)}` }); }
      // the two curved concrete legs (an A that closes near the top)
      P(['@white.0', 'M-16-12Q-24-240-6-440H6Q-10-240-4-12z'], ['@white.0', 'M10-12Q30-240 8-440H16Q42-240 26-12z'], ['@white.3', 'M14-12Q34-240 12-440H16Q42-240 26-12z', .5]);
      for (let i = 0; i < 9; i++) { const y = -40 - i * 44; P({ s: '@white.1', w: 2.2, d: `M${f1(-12 + i * .3)} ${y}L${f1(18 - i * .5)} ${y}` }); }
      // the viewing decks: a glazed pod of three levels, then the white spire
      P(['@white.0', poly([-20, -400], [24, -400], [22, -470], [-16, -470])], ['@white.3', poly([10, -400], [24, -400], [22, -470], [10, -470]), .5]);
      for (let k = 0; k < 3; k++) { const y = -408 - k * 20; P({ f: '@deck.0', d: rect(-16, y - 12, 36, 12), glow: 'window' }, ['@deck.1', rect(-16, y - 12, 14, 5), .45], { s: '@white.1', w: .8, d: `M-6 ${y - 12}v12M4 ${y - 12}v12M12 ${y - 12}v12` }); }
      P(['@white.0', poly([-14, -470], [20, -470], [6, -520], [3, -566], [1, -520])], ['@white.3', poly([4, -470], [20, -470], [6, -520], [3, -566]), .45]);
      P({ f: '#ff4040', d: ell(3, -566, 2), glow: 'lamp' });
      // the lower ties and gantry at the foot
      P(['@steel.0', rect(-40, -26, 70, 6)], { s: '@steel.1', w: 1, d: 'M-40-20h70M-30-26v14M-10-26v14M10-26v14' });
      if (W) P(['@snow.0', rect(-60, -13, 120, 3)]);
      const lit = [
        { s: '@led.0', w: 3, op: .85, d: 'M-30-12Q-118-210-14-470' },
        { s: '@led.1', w: 2, op: .7, d: 'M-22-12Q-80-220-10-460' },
        { f: { rad: [[0, '@led.0', .3], [1, '@led.0', 0]], cx: 0, cy: -260, r: 160 }, d: rect(-90, -480, 140, 470) },
        { f: { lin: [[0, '@flood', .5], [1, '@flood', 0]], x1: 0, y1: 0, x2: 0, y2: 10 }, d: rect(-60, 0, 120, 10) },
      ];
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });

  /* ---------------- HMS Victory in No. 2 Dock, the Historic Dockyard ---------------- */
  const ship = (P, o) => {
    // masts, yards, tops, shrouds and stays: o.masts = [[x, h, yardHalfWidths...]]
    for (const [x, h, ...yards] of o.masts) {
      P({ s: '@spar.0', w: 4.4, d: `M${x} ${o.deck}V${o.deck - h * .45}` }, { s: '@spar.0', w: 3, d: `M${x} ${o.deck - h * .4}V${o.deck - h * .75}` }, { s: '@spar.0', w: 1.8, d: `M${x} ${o.deck - h * .72}V${o.deck - h}` });
      P(['@spar.1', rect(x - 8, o.deck - h * .45 - 2, 16, 3)], ['@spar.1', rect(x - 5, o.deck - h * .75 - 2, 10, 2.4)]);
      yards.forEach((yw, i) => { const y = o.deck - h * (.3 + i * .22); P({ s: '@spar.1', w: 2.2 - i * .4, d: `M${x - yw} ${f1(y)}H${x + yw}` }); });
      P({ s: '@rig', w: .7, op: .8, d: `M${x - 22} ${o.deck}L${x - 7} ${o.deck - h * .45}M${x - 14} ${o.deck}L${x - 5} ${o.deck - h * .45}M${x + 22} ${o.deck}L${x + 7} ${o.deck - h * .45}M${x + 14} ${o.deck}L${x + 5} ${o.deck - h * .45}M${x - 6} ${o.deck - h * .45}L${x - 2} ${o.deck - h * .75}M${x + 6} ${o.deck - h * .45}L${x + 2} ${o.deck - h * .75}` });
    }
    for (let i = 0; i < o.masts.length - 1; i++) { const [a, ha] = o.masts[i], [c, hc] = o.masts[i + 1]; P({ s: '@rig', w: .8, op: .8, d: `M${a} ${o.deck - ha}L${c} ${o.deck - hc * .45}M${a} ${o.deck - ha * .75}L${c} ${o.deck - 4}` }); }
    const [lx, lh] = o.masts[o.masts.length - 1];
    P({ s: '@rig', w: .9, op: .85, d: `M${lx} ${o.deck - lh}L${o.bow[0]} ${o.bow[1]}M${lx} ${o.deck - lh * .75}L${o.bow[0] - 20} ${o.bow[1] + 8}M${lx} ${o.deck - lh * .45}L${o.bow[0] - 50} ${o.bow[1] + 22}` });
  };
  define({
    id: 'landmark.hms-victory',
    size: [500, 360], variants: 2,
    palette: seasPal({ hull: ['#1e1c1a', '#34302c', '#4a4440'], ochre: ['#d8a648', '#b48434', '#ecc06a'], spar: ['#3a2c22', '#4e3a2a'], rig: ['#2a2420'], stern: ['#c89a44', '#2a3a4a'], dock: ['#b4aa96', '#948a78', '#cfc6b2'], red: ['#8a2e22'] }),
    shadow: false, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/portsmouth-harbour', 'uk', 'hampshire', 'portsmouth', 'ship', 'dockyard', 'kit:temperate', 'kit:water'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter', deck = -118;
      // rigging first (behind the hull)
      ship(P, { deck, masts: [[-118, 230, 50, 40, 28], [-6, 300, 74, 60, 42, 26], [100, 280, 66, 54, 38, 24]], bow: [270, -200] });
      // the bowsprit and jib boom
      P({ s: '@spar.0', w: 4, d: 'M170-112L236-150' }, { s: '@spar.0', w: 2.2, d: 'M230-146L276-176' });
      // the hull: black with the ochre gun-deck bands (the Nelson chequer), the gun ports black on ochre
      const hull = 'M-200-130Q-206-80-180-36L-160-30H160Q196-50 214-108L180-112Q100-104 0-108Q-110-112-188-140z';
      P(['@hull.0', hull], ['@hull.2', 'M-200-130Q-206-80-180-36L-170-34Q-190-80-186-136z', .6]);
      const bands = [[-56, 9], [-80, 9], [-104, 8]];
      for (const [y, h] of bands) {
        P(['@ochre.0', `M${-192} ${y}Q0 ${y + 6} ${196} ${y - 4}V${y - 4 + h}Q0 ${y + 6 + h} ${-192} ${y + h}z`], ['@ochre.2', `M-192 ${y}Q0 ${y + 6} 196 ${y - 4}v2Q0 ${y + 8} -192 ${y + 2}z`, .5]);
        let d = ''; for (let x = -176; x < 184; x += 15) d += rect(x, y + (x * x) * -0.00006 + 1.5 + x * .02, 6, h - 3); P(['@hull.0', d]);
      }
      // the stern galleries (lit at dusk), the poop and the beakhead
      P(['@ochre.1', poly([-202, -130], [-210, -160], [-176, -150], [-170, -122])], ['@hull.1', poly([-200, -158], [-190, -166], [-150, -150], [-176, -150])]);
      for (let i = 0; i < 4; i++) P({ f: '@stern.1', d: rect(-204 + i * 7, -150 + i * 1.5, 5, 7), glow: 'window' }, { f: '@stern.1', d: rect(-202 + i * 7, -138 + i * 1.5, 5, 7), glow: 'window' });
      for (const [x, y] of [[-208, -166], [-196, -170], [-184, -166]]) P(['@ochre.0', rect(x - 2, y - 6, 4, 6)], { f: '#ffd98a', d: ell(x, y - 3, 1.6), glow: 'lamp' });
      P(['@ochre.0', poly([176, -118], [214, -108], [226, -120], [200, -132])], ['@stern.0', 'M214-108Q226-112 230-124L222-126Q220-118 212-114z'], ['@red', rect(-150, -122, 300, 3), .7]);
      // the dry dock: stepped stone altars in front, timber shores under the hull
      for (const x of [-150, -90, -30, 30, 90, 150]) P({ s: '@spar.1', w: 2.4, d: `M${x} -40L${x + (x < 0 ? -14 : 14)} -4` });
      P(['@dock.0', rect(-250, -30, 520, 30)], ['@dock.2', rect(-250, -30, 520, 3)], { s: '@dock.1', w: 1, op: .7, d: 'M-250-20H270M-250-10H270' }, ['@dock.1', rect(-250, -6, 520, 6), .5]);
      for (let x = -246; x < 270; x += 22) P({ s: '@dock.1', w: .6, op: .5, d: `M${x} -30v10M${x + 11} -20v10` });
      P(...turf(-250, 270, -30));
      if (W) P(['@snow.0', rect(-250, -33, 520, 3)], ['@snow.0', 'M-150-120Q0-114 160-116L160-112Q0-110-150-116z', .8]);
      const lit = [
        { f: { rad: [[0, '@flood', .3], [1, '@flood', 0]], cx: 0, cy: -90, r: 240 }, d: rect(-210, -330, 440, 300) },
        { f: { lin: [[0, '@flood', .24], [1, '@flood', 0]], x1: 0, y1: -30, x2: 0, y2: -140 }, d: hull },
      ];
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });

  /* ---------------- HMS Warrior 1860, afloat at her jetty ---------------- */
  define({
    id: 'landmark.hms-warrior',
    size: [520, 300], variants: 2,
    palette: seasPal({ hull: ['#1c1c1e', '#303034', '#4a4a50'], port: ['#5a5a60'], band: ['#eceae2'], funnel: ['#d0b070', '#a88a50'], spar: ['#3a2c22', '#4e3a2a'], rig: ['#2a2420'], gold: ['#d8b050', '#f0ead8'], boot: ['#8a2e22'], jetty: ['#6a5a48', '#4a3e32'] }),
    shadow: false, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/portsmouth-harbour', 'uk', 'hampshire', 'portsmouth', 'ship', 'dockyard', 'kit:temperate', 'kit:water'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter', deck = -52;
      ship(P, { deck, masts: [[-130, 210, 54, 42, 28], [-10, 236, 62, 48, 32], [110, 220, 58, 44, 30]], bow: [270, -150] });
      P({ s: '@spar.0', w: 3.6, d: 'M220-48L272-80' }, { s: '@spar.0', w: 2, d: 'M266-76L300-98' });
      // two funnels between the masts
      for (const x of [-64, 46]) P(['@funnel.0', rect(x, -110, 16, 60)], ['@funnel.1', rect(x + 10, -110, 6, 60), .6], ['@hull.0', rect(x - 1, -114, 18, 5)]);
      // the long low iron hull, a white band, one row of gun ports, red boot-topping at the waterline
      const hull = 'M-236-56L-226-6H214Q238-30 246-58Q0-50-236-56z';
      P(['@hull.0', hull], ['@band.0', 'M-236-56Q0-50 246-58L245-54Q0-46-235-52z'], ['@boot', 'M-228-10H216L214-6H-226z']);
      let d = ''; for (let x = -210; x < 220; x += 13) d += rect(x, -38, 6, 6); P(['@port', d]);
      for (let x = -205; x < 215; x += 26) P({ f: '#f4c674', d: rect(x, -24, 3, 3), glow: 'window', detail: true });
      P(['@hull.2', 'M-236-56L-226-6H-216L-226-54z', .5]);
      // the figurehead under the bow
      P(['@gold.1', 'M240-56Q252-60 254-48Q250-44 244-46z'], ['@gold.0', 'M244-52l6-2l-2 6z']);
      // the jetty in the foreground, the water
      P(['@sea.0', rect(-260, -6, 540, 12)], { s: '@sea.2', w: 1, op: .6, d: 'M-240 0h30M-150 2h40M-20 0h30M90 3h40M200 0h24' });
      P(['@jetty.0', rect(-260, -4, 120, 8)]); for (let x = -255; x < -140; x += 18) P(['@jetty.1', rect(x, 2, 4, 10)]);
      for (const x of [-236, -206, -176, -150]) P(['@jetty.1', ell(x, -5, 3, 2)]);
      for (const x of [-250, -180]) P(['@jetty.1', rect(x, -18, 3, 14)], { f: '#ffe2a0', d: ell(x + 1.5, -19, 2), glow: 'lamp' });
      if (W) P(['@snow.0', rect(-260, -6, 120, 2)]);
      const lit = [
        { f: { rad: [[0, '@flood', .24], [1, '@flood', 0]], cx: 0, cy: -60, r: 250 }, d: rect(-240, -260, 500, 256) },
        { s: '@flood', w: 1.4, op: .7, d: 'M-130-262L-10-288L110-272L270-152M-236-58L-130-262' },
      ];
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });

  /* ---------------- The Bargate, Southampton (north face: the drum towers and the arch) ---------------- */
  define({
    id: 'landmark.bargate',
    size: [180, 150], variants: 2,
    palette: seasPal({ stone: ['#cbbf9e', '#a89a78', '#e0d6b8', '#857858'], dark: ['#2e2a26', '#4a443c'], pave: ['#b0a898', '#8e8676'], lamp: ['#2a2a2a'] }),
    shadow: { rx: 80, ry: 8, h: 140 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/southampton', 'uk', 'hampshire', 'southampton', 'gatehouse', 'medieval', 'kit:temperate'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter';
      P(['@pave.0', rect(-100, -4, 200, 8)], { s: '@pave.1', w: .6, op: .6, d: 'M-100 0H100M-80-4v8M-50-4v8M-20-4v8M20-4v8M50-4v8M80-4v8' });
      // the gatehouse block behind: upper storey with windows and an arcaded, battlemented parapet
      P(['@stone.0', rect(-46, -118, 92, 118)], ['@stone.1', rect(14, -118, 32, 118), .45]);
      P(['@stone.0', crenel(-48, 48, -118, 7, 9)], ['@stone.3', rect(-46, -112, 92, 3), .6]);
      for (let i = 0; i < 4; i++) P(...win(rect, -36 + i * 19, -100, 10, 16, 2));
      for (let i = 0; i < 9; i++) P(['@stone.3', rarch(-44 + i * 10, -76, 6, 8), .5]);
      // the gate arch
      P(['@stone.3', parch(-22, -64, 44, 64)], ['@dark.0', parch(-18, -60, 36, 60)], ['@dark.1', parch(-12, -50, 24, 50), .5]);
      // the two half-round drum towers, rounded with light and shade, arrow slits and battlements
      for (const sx of [-1, 1]) {
        const x0 = sx < 0 ? -78 : 46;
        P({ f: { lin: [[0, '@stone.2'], [.45, '@stone.0'], [1, '@stone.3']], x1: x0, y1: 0, x2: x0 + 32, y2: 0 }, d: rect(x0, -108, 32, 108) });
        P(['@stone.0', crenel(x0 - 2, x0 + 34, -108, 6, 8)], { s: '@stone.3', w: .7, op: .6, d: `M${x0} -36h32M${x0} -72h32` });
        for (const y of [-92, -56, -22]) P(['@dark.0', rect(x0 + 14, y, 3, 12)]);
        for (let r = 0; r < 8; r++) P({ s: '@stone.3', w: .5, op: .3, d: `M${x0} ${-8 - r * 12.5}h32` });
      }
      for (let i = 0; i < 14; i++) P({ f: '@stone.' + (i % 2 ? 2 : 3), d: rect(-44 + (i % 7) * 13, i < 7 ? -16 : -40, 8, 3), op: .35, detail: true });
      for (const x of [-92, 92]) P(['@stone.1', rect(x - 7, -12, 14, 10)], ['@turf.1', rect(x - 6, -14, 12, 2)], ...shrubs(x - 8, x + 8, 2, -12, 8));
      // wall lamps either side of the arch
      for (const x of [-30, 30]) P(['@lamp.0', rect(x - 2, -44, 4, 6)], { f: '#ffe2a0', d: rect(x - 1.5, -43, 3, 4), glow: 'lamp' });
      if (W) P(['@snow.0', rect(-80, -110, 160, 2)], ['@snow.0', rect(-48, -126, 96, 2)]);
      const lit = [{ f: { rad: [[0, '@flood', .32], [1, '@flood', 0]], cx: 0, cy: -60, r: 110 }, d: rect(-80, -128, 160, 128) }];
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });

  /* ---------------- The Portable Airship Hangar frame, Farnborough (1911 steel frame, restored) ---------------- */
  define({
    id: 'landmark.farnborough-airship-hangar',
    size: [420, 200], variants: 2,
    palette: seasPal({ steel: ['#4a5450', '#353d3a', '#6a7670'], pad: ['#b6b0a4', '#948e82'], uplight: ['#ffd88a'] }),
    shadow: { rx: 200, ry: 12, h: 160 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/farnborough-airship-hangar', 'uk', 'hampshire', 'farnborough', 'aviation', 'heritage', 'kit:temperate'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter';
      P(['@pad.0', rect(-210, -4, 420, 8)], ['@pad.1', rect(-210, 2, 420, 2)]);
      // the far-side frames (lighter, behind): the shed seen a little from one end
      for (let i = 0; i < 7; i++) { const x = -170 + i * 58; P({ s: '@steel.2', w: 2, op: .6, d: `M${x + 18} -8V-150L${x + 24} -164` }); }
      P({ s: '@steel.2', w: 2, op: .6, d: 'M-152-164H210' });
      // the near stanchions: lattice columns (two chords and a zig-zag)
      for (let i = 0; i < 7; i++) {
        const x = -190 + i * 62;
        P(['@steel.0', rect(x - 4, -170, 3, 170)], ['@steel.0', rect(x + 3, -170, 3, 170)], ['@steel.1', rect(x - 6, -4, 14, 4)]);
        P(['@steel.2', rect(x - 5, -172, 12, 5), .8], ['@pad.1', rect(x - 9, -2, 20, 3)]);
        let z = `M${x - 3} -2`; for (let y = -2; y > -168; y -= 12) z += `L${x + 4} ${y - 6}L${x - 3} ${y - 12}`; P({ s: '@steel.1', w: 1, d: z });
      }
      // the roof truss: a slight arch, top and bottom chords, diagonals; X bracing in the end bays
      P({ s: '@steel.0', w: 3, d: 'M-196-170Q0-196 196-170' }, { s: '@steel.0', w: 2.4, d: 'M-196-160Q0-182 196-160' });
      let t = ''; for (let x = -190; x < 190; x += 15.5) { const y = -170 - 26 * (1 - (x / 196) ** 2), y2 = -160 - 22 * (1 - ((x + 7.7) / 196) ** 2); t += `M${f1(x)} ${f1(y)}L${f1(x + 7.7)} ${f1(y2)}L${f1(x + 15.5)} ${f1(-170 - 26 * (1 - ((x + 15.5) / 196) ** 2))}`; }
      P({ s: '@steel.1', w: 1.1, d: t });
      for (const x of [-190, 182]) P({ s: '@steel.1', w: 1.4, d: `M${x} -4L${x + 62 * (x < 0 ? 1 : -1)} -160M${x} -160L${x + 62 * (x < 0 ? 1 : -1)} -4` });
      P({ s: '@steel.0', w: 2, d: 'M-190-90H182' });
      for (let i = 0; i < 6; i++) { const x = -190 + i * 62; P({ s: '@steel.2', w: 1.2, op: .7, d: `M${x + 3} -120L${x + 62} -120` }, { s: '@steel.1', w: 1, d: `M${x + 6} -40L${x + 56} -40` }); }
      P(...turf(-215, 215, 4), ...shrubs(-214, -196, 2, 4, 9), ...shrubs(196, 214, 2, 4, 9));
      if (W) P({ s: '@snow.0', w: 2, d: 'M-196-172Q0-198 196-172' }, ['@snow.1', rect(-215, 0, 430, 3)]);
      // at night: uplights wash gold up the stanchions
      const lit = [];
      for (let i = 0; i < 7; i++) { const x = -190 + i * 62; lit.push({ f: { lin: [[0, '@uplight', .5], [1, '@uplight', 0]], x1: x, y1: 0, x2: x, y2: -170 }, d: poly([x - 4, 0], [x - 16, -170], [x + 20, -170], [x + 8, 0]) }); }
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });

  /* ---------------- Fleet station: the booking hall, the footbridge with its lift towers, the platform canopy ---------------- */
  define({
    id: 'landmark.fleet-station',
    size: [440, 170], variants: 2,
    palette: seasPal({ brick: ['#9a5a42', '#7a4434', '#b4705a'], steel: ['#5a6a7a', '#3e4a56', '#8a9aa8'], canopy: ['#d8dcdc', '#a8b0b4'], plat: ['#9a948a', '#7a756c', '#e8d24a'], rail: ['#5a5550', '#8a8680'], ballast: ['#8a8278', '#6a645c'], frame: ['#eef0ee'] }),
    shadow: { rx: 200, ry: 10, h: 120 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/fleet', 'uk', 'hampshire', 'fleet', 'station', 'rail', 'kit:temperate'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter';
      // the lineside bushes behind the platform
      P(...shrubs(-220, 250, 12, -60, 18));
      // the footbridge: two glazed lift towers and an enclosed span over the tracks
      for (const x of [-30, 140]) {
        P(['@steel.0', rect(x, -150, 30, 150)], ['@steel.1', rect(x + 20, -150, 10, 150), .6]);
        for (let k = 0; k < 4; k++) P({ f: '@glass.0', d: rect(x + 4, -142 + k * 34, 22, 26), glow: 'window' }, ['@glass.1', rect(x + 4, -142 + k * 34, 8, 12), .35]);
        P(['@steel.1', rect(x - 2, -154, 34, 5)]);
      }
      P(['@steel.0', rect(0, -146, 140, 30)], ['@steel.1', rect(0, -120, 140, 4)]);
      for (let x = 4; x < 136; x += 14) P({ f: '@glass.0', d: rect(x, -142, 11, 20), glow: 'window' });
      // the booking hall: low brick with a glazed front and a flat canopy
      P(['@brick.0', rect(-210, -64, 150, 64)], ['@brick.1', rect(-110, -64, 50, 64), .45], ['@steel.1', rect(-214, -70, 158, 7)]);
      for (let r = 0; r < 6; r++) P({ s: '@brick.1', w: .5, op: .4, d: `M-210 ${-8 - r * 9}h150` });
      for (let i = 0; i < 4; i++) P({ f: '@glass.0', d: rect(-200 + i * 32, -54, 24, 40), glow: 'window' }, ['@glass.1', rect(-200 + i * 32, -54, 9, 18), .35], { s: '@frame', w: 1, d: `M${-188 + i * 32} -54v40` });
      // the platform canopy on columns, lamps underneath
      P(['@canopy.0', poly([-60, -76], [220, -76], [224, -70], [-60, -70])], ['@canopy.1', rect(-60, -70, 284, 3)]);
      for (let x = -40; x < 220; x += 44) P(['@steel.0', rect(x, -70, 3, 50)], { f: '#ffe8b0', d: rect(x - 6, -66, 15, 2), glow: 'lamp' });
      // the platform edge (the yellow line) and the line in front: ballast, sleepers, rails
      P(['@plat.0', rect(-220, -22, 460, 8)], ['@plat.2', rect(-220, -22, 460, 1.6)], ['@plat.1', rect(-220, -14, 460, 14)]);
      for (let r = 0; r < 2; r++) P({ s: '@plat.0', w: .5, op: .5, d: `M-220 ${-10 + r * 5}h460` });
      P(['@ballast.0', rect(-220, 0, 460, 8)]);
      let s = ''; for (let x = -216; x < 240; x += 9) s += rect(x, 2, 4, 5); P(['@ballast.1', s]);
      P(['@rail.0', rect(-220, 1, 460, 1.6)], ['@rail.1', rect(-220, 5, 460, 1.6)]);
      // the platform lamp posts
      for (const x of [-170, -100]) P(['@steel.1', rect(x, -60, 2, 38)], { f: '#ffe8b0', d: rect(x - 3, -64, 8, 4), glow: 'lamp' });
      P(...turf(-240, -212, -22), ...turf(232, 250, -22));
      if (W) P(['@snow.0', rect(-60, -78, 284, 2)], ['@snow.0', rect(0, -148, 140, 2)], ['@snow.0', rect(-214, -72, 158, 2)]);
      const lit = [{ f: { lin: [[0, '#ffe8b0', .28], [1, '#ffe8b0', 0]], x1: 0, y1: -70, x2: 0, y2: -20 }, d: rect(-60, -70, 284, 50) }];
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });

  /* ---------------- Jane Austen's House, Chawton (red brick, the blocked road-front window) ---------------- */
  define({
    id: 'landmark.jane-austen-house',
    size: [280, 170], variants: 2,
    palette: seasPal({ brick: ['#a4563e', '#7e3e2e', '#c06e54', '#8a4836'], roof: ['#7a4434', '#5a3026', '#946050'], white: ['#f2efe6', '#cfcabe'], door: ['#3a3a40'], wall: ['#9a4c38'] }),
    shadow: { rx: 130, ry: 10, h: 150 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/chawton', 'uk', 'hampshire', 'chawton', 'house', 'writer', 'kit:temperate'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter', s = ctx.season;
      // the lower wing to the right, gable end on
      P(['@brick.1', rect(50, -74, 70, 74)], ['@roof.1', poly([46, -72], [85, -112], [124, -72])], ['@roof.0', poly([50, -74], [85, -108], [120, -74])]);
      P(...win(rect, 72, -56, 22, 26, 2));
      // the main house: two storeys of red brick under a steep tiled roof, two chimneys
      P(['@roof.0', poly([-118, -84], [-96, -136], [56, -136], [74, -84])], ['@roof.2', poly([-118, -84], [-96, -136], [-70, -136], [-90, -84]), .45]);
      for (let i = 0; i < 6; i++) P({ s: '@roof.1', w: .8, op: .4, d: `M${-114 + i * 3.6} ${-90 - i * 8}H${70 - i * 3}` });
      for (const x of [-70, 26]) P(['@brick.0', rect(x, -156, 16, 26)], ['@brick.1', rect(x + 10, -156, 6, 26), .6], ['@brick.3', rect(x - 2, -158, 20, 4)]);
      P(['@brick.0', rect(-110, -86, 176, 86)], ['@brick.3', rect(10, -86, 56, 86), .35], ['@brick.2', rect(-110, -86, 12, 86), .35]);
      for (let r = 0; r < 9; r++) P({ s: '@brick.3', w: .5, op: .35, d: `M-110 ${-6 - r * 9}h176` });
      // sash windows with glazing bars; the blocked window on the first floor (brick, no glass)
      for (const [x, y, blocked] of [[-96, -74, 0], [-56, -74, 1], [-16, -74, 0], [24, -74, 0], [-96, -36, 0], [-16, -36, 0], [24, -36, 0]]) {
        if (blocked) { P(['@wall', rect(x, y, 20, 26)], ['@white.1', rect(x - 1, y - 2, 22, 2)]); continue; }
        P(['@white.0', rect(x - 1.5, y - 1.5, 23, 29)], { f: '@glass.0', d: rect(x, y, 20, 26), glow: 'window' }, ['@glass.1', rect(x, y, 8, 11), .35], { s: '@white.0', w: 1, d: `M${x + 10} ${y}v26M${x} ${y + 13}h20M${x} ${y + 6.5}h20M${x} ${y + 19.5}h20` });
      }
      // the door with its hood
      P(['@white.0', rect(-58, -42, 24, 42)], ['@door', rect(-55, -39, 18, 39)], ['@white.1', poly([-62, -42], [-46, -52], [-30, -42])], { f: '#ffe2a0', d: rect(-48, -48, 4, 3), glow: 'lamp' });
      // the garden wall, a climbing rose and border flowers by season
      P(['@brick.1', rect(-130, -12, 270, 12)], ['@brick.2', rect(-130, -14, 270, 3)]);
      P(['@leaf.0', 'M-110 -14Q-120-50-104-80Q-98-60-100-14z'], ['@leaf.1', 'M-108-30Q-114-50-104-70Q-102-50-102-30z', .7]);
      if (s !== 'winter') for (let i = 0; i < 7; i++) P({ f: '@bloom.' + (i % 3), d: ell(-108 + (i % 2) * 5, -24 - i * 8, 2.4), detail: true });
      for (let i = 0; i < 14; i++) P({ f: i % 2 ? '@leaf.0' : '@bloom.' + (i % 3), d: ell(-124 + i * 19, -16, 4, 3), op: .9 });
      P(...turf(-140, 150, 0));
      if (W) P(['@snow.0', poly([-118, -84], [-96, -136], [56, -136], [74, -84], [60, -88], [-104, -88]), .9], ['@snow.0', poly([50, -74], [85, -108], [120, -74], [110, -76], [85, -102], [60, -76])], ['@snow.0', rect(-130, -15, 270, 2)]);
      const lit = [{ f: { rad: [[0, '@flood', .18], [1, '@flood', 0]], cx: -40, cy: -10, r: 120 }, d: rect(-130, -90, 260, 90) }];
      return { body: fin(b, v === 1), lit: fin(lit, v === 1) };
    },
  });
})();

/* ============================================================
   SCENE LIBRARY: hampshire objects (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

   The countryside and railway pieces of Hampshire: New Forest donkeys, a
   cattle grid, open heathland, a chalk stream with watercress, the rolling
   South Downs, and a heritage steam engine and coaches in the manner of the
   Watercress Line (generic liveries, no lettering, no crests). Facing RIGHT,
   lit from the LEFT; anchor on the ground (rails for the railway). Seasons
   change coats, flowers, fields and steam; the railway lights up at dusk.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = (n) => Math.round(n * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry = rx) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const poly = (...p) => 'M' + p.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + 'z';
  const mound = (x, y, w, h) => `M${f1(x - w)} ${f1(y)}Q${f1(x - w * .9)} ${f1(y - h)} ${f1(x)} ${f1(y - h * 1.05)}Q${f1(x + w * .9)} ${f1(y - h)} ${f1(x + w)} ${f1(y)}z`;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const pal = (base, seas) => Object.assign({ base }, bySeason(seas));
  const tidy = (parts) => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(Boolean).map((s) => { const o = Array.isArray(s) ? { f: s[0], d: s[1] } : Object.assign({}, s); if (Array.isArray(s) && s[2] != null) o.op = s[2]; if (o.s && !o.cap) o.cap = 'round'; if (o.s && !o.f && !o.glow && (o.w || 0) <= .8) o.detail = true; return o; }); return parts; };
  const define = (def) => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const GRASS = { spring: ['#6e9a44', '#8cb85a', '#4e7832'], summer: ['#5e8a38', '#7aa44a', '#3e6a2a'], autumn: ['#7a8040', '#9a9a54', '#5a6230'], winter: ['#76806a', '#9aa28c', '#566050'] };

  /* ---------------- animal.donkey: a New Forest donkey (grey, brown or dark), the shoulder cross, long ears ---------------- */
  define({
    id: 'animal.donkey', category: 'animal', size: [110, 116], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    parts: ['legsFar', 'tail', 'body', 'legsNear', 'head'],
    palette: pal({ hoof: '#2a2420', muzzle: ['#e8e2d6', '#c8c0b2'], dark: ['#2e2824', '#4a403a'], eye: '#141010' }, {
      c0: { spring: ['#8e8a84', '#6c6862', '#b0aca4', '#4e4a46'], summer: ['#96928a', '#726e68', '#b8b4ac', '#524e4a'], autumn: ['#88847c', '#66625c', '#a8a49c', '#4a4642'], winter: ['#7e7a74', '#5e5a56', '#a09c96', '#44403c'] },
      c1: { spring: ['#7a5e48', '#5a4434', '#9a7e66', '#3e2e24'], summer: ['#86664c', '#624a38', '#a8886a', '#422f24'], autumn: ['#74584a', '#564034', '#927460', '#3a2a22'], winter: ['#6a5446', '#4e3c32', '#866e5e', '#342620'] },
      c2: { spring: ['#4a423e', '#36302c', '#625a54', '#221e1c'], summer: ['#524842', '#3a3430', '#6c625a', '#26201e'], autumn: ['#463e3a', '#322c28', '#5e5650', '#201c1a'], winter: ['#403a36', '#2e2a26', '#56504a', '#1c1816'] },
    }),
    anim: { turn: { part: 'head', pivot: [16, -66], deg: 9, period: 8, hold: .6 }, sway: { part: 'tail', pivot: [-38, -62], deg: 8 } },
    shadow: { rx: 42, ry: 6, h: 100 }, weight: .3,
    tags: ['uk', 'new-forest', 'heath', 'countryside', 'donkey', 'grazing', 'hampshire', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: 'hampshire library (south)',
    build(v, r, ctx) {
      const C = `@c${v}`, shaggy = ctx.season === 'winter' || ctx.season === 'autumn', graze = v === 1;
      const leg = (x, top = -44) => `M${x - 3.6} ${top}L${x - 3} -4H${x + 3}L${x + 3.4} ${top}z`;
      const legsFar = [[`${C}.1`, leg(22) + leg(-26)], ['#000000', leg(22) + leg(-26), .2], ['@hoof', rect(18.6, -3.5, 7, 3.5) + rect(-29.4, -3.5, 7, 3.5)]];
      const legsNear = [[`${C}.0`, leg(28) + leg(-32)], [`${C}.2`, rect(25, -42, 2, 16) + rect(-35, -42, 2, 14), .4], ['@muzzle.1', rect(24.6, -12, 6.8, 6) + rect(-35.4, -12, 6.8, 6), .5], ['@hoof', rect(24.6, -3.8, 7, 3.8) + rect(-35.4, -3.8, 7, 3.8)]];
      const tail = [[`${C}.1`, 'M-37-63Q-44-52-43-36L-40-36Q-40-52-35-61z'], ['@dark.0', 'M-44-38Q-46-28-41-24Q-37-28-39-38z']];
      const body = [[`${C}.0`, 'M-38-56Q-40-72-24-73H14Q30-73 34-60Q36-46 26-40Q12-36-4-38H-26Q-40-42-38-56z'],
        [`${C}.2`, 'M-32-68Q-10-75 14-72Q-8-70-32-64z', .55], ['@muzzle.0', 'M-26-40Q-6-36 20-40Q14-44-4-44H-24z', .7], [`${C}.3`, 'M-36-60Q-40-50-34-44Q-34-54-30-64z', .35],
        ['@dark.0', 'M-2-73H4L3-40H-1z', .55], ['@dark.0', 'M-2-66Q2-62 8-58V-56Q2-60-2-64Q-6-60-12-58V-60Q-6-62-2-66z', .45]];
      if (shaggy) { let h = ''; for (let i = 0; i < 14; i++) { const x = -34 + i * 4.6; h += `M${f1(x)} ${f1(-39 - (i % 3))}l${f1(-.6 + (i % 2))} 3.4`; } body.push({ s: `${C}.1`, w: 1.3, op: .7, d: h }, { s: `${C}.2`, w: .8, op: .35, d: 'M-30-70l1.4 3M-20-72l1.4 3M-10-72l1.4 3M2-72l1.4 3M14-70l1.4 3' }); }
      const nx = graze ? 10 : 0, ny = graze ? 34 : 0;
      const head = [[`${C}.0`, `M10-72Q20-82 ${32 + nx * .4}-${86 - ny * .6}L${40 + nx * .4}-${80 - ny * .6}Q32-66 24-56Q16-56 10-62z`],
        [`${C}.0`, `M${30 + nx}-${88 - ny}Q${38 + nx}-${92 - ny} ${44 + nx}-${86 - ny}L${54 + nx}-${66 - ny}Q${56 + nx}-${58 - ny} ${48 + nx}-${58 - ny}L${42 + nx}-${62 - ny}Q${34 + nx}-${70 - ny} ${30 + nx}-${80 - ny}z`],
        ['@muzzle.0', `M${46 + nx}-${70 - ny}L${54 + nx}-${66 - ny}Q${56 + nx}-${58 - ny} ${48 + nx}-${58 - ny}L${43 + nx}-${62 - ny}z`],
        ['@eye', ell(41 + nx, -80 + ny, 1.4)], ['@muzzle.0', ell(41 + nx, -80 + ny, 2.6), .5], ['@eye', ell(51 + nx, -63 + ny, .9)],
        [`${C}.1`, `M${32 + nx}-${88 - ny}Q${26 + nx}-${104 - ny} ${28 + nx}-${112 - ny}Q${33 + nx}-${102 - ny} ${36 + nx}-${90 - ny}z`],
        [`${C}.0`, `M${37 + nx}-${90 - ny}Q${36 + nx}-${106 - ny} ${40 + nx}-${113 - ny}Q${43 + nx}-${102 - ny} ${41 + nx}-${89 - ny}z`],
        ['@dark.0', `M${28 + nx}-${112 - ny}l1.6 4l1.4-1zM${40 + nx}-${113 - ny}l.6 4l1.6-.6z`],
        ['@dark.1', 'M10-73Q22-84 32-88L33-85Q22-80 12-70z', .9]];
      return { legsFar, tail, body, legsNear, head };
    },
  });

  /* ---------------- structure.cattle-grid: the steel grid across a forest road, white wing posts and a fence each side ---------------- */
  define({
    id: 'structure.cattle-grid', category: 'structure', size: [200, 46], variants: 2, seasonal: true, flippable: true,
    palette: pal({ road: ['#6e6c68', '#585652', '#8a8884'], pit: ['#1e1c1a'], bar: ['#8a8e92', '#b8bcc0'], white: ['#f0eee8', '#c8c4bc'], post: ['#6a5440', '#4e3e30'] }, { grass: GRASS }),
    shadow: false, weight: .4,
    tags: ['uk', 'new-forest', 'heath', 'countryside', 'road', 'hampshire', 'kit:temperate', 'role:street'],
    credit: 'hampshire library (south)',
    build(v) {
      const b = [], P = (...s) => b.push(...s);
      P(['@grass.0', rect(-100, -8, 200, 10)], ['@grass.2', rect(-100, 0, 200, 2), .6]);
      P(['@road.0', poly([-70, 0], [-58, -10], [58, -10], [70, 0])], ['@road.2', poly([-58, -10], [58, -10], [60, -8.6], [-60, -8.6]), .5]);
      P(['@pit', poly([-26, 0], [-22, -10], [22, -10], [26, 0])]);
      for (let i = 0; i < 10; i++) { const x = -22 + i * 4.9; P({ s: '@bar.0', w: 1.6, d: `M${f1(x - 1.8)} 0L${f1(x)} -10` }); }
      P({ s: '@bar.1', w: .6, d: 'M-25-1H25M-23-9H23' });
      // the white-painted wing posts and timber fences off each side (variant 1: a field gate to the right)
      for (const sx of [-1, 1]) {
        P(['@white.0', rect(sx * 30 - 3, -22, 6, 22)], ['@white.1', rect(sx * 30 + (sx > 0 ? 1 : -3), -22, 2, 22), .7], ['@white.0', poly([sx * 30 - 3, -22], [sx * 30, -25], [sx * 30 + 3, -22])]);
        for (let k = 0; k < 3; k++) { const x = sx * (48 + k * 20); P(['@post.0', rect(x - 1.6, -24, 3.2, 24)]); }
        P({ s: '@post.0', w: 1.8, d: `M${sx * 33} -18H${sx * 94}M${sx * 33} -9H${sx * 94}` });
      }
      if (v === 1) P({ s: '@white.0', w: 1.6, d: 'M74-20H94M74-12H94M74-4H94M74-4L94-20' });
      for (let i = 0; i < 12; i++) { const x = -96 + i * 17 + (i > 5 ? 20 : 0); P({ f: '@grass.1', d: `M${x} -6l2-7l2 7z`, op: .8 }); }
      return { body: b };
    },
  });

  /* ---------------- ground.heathland: New Forest heath, heather mounds, gorse, bracken and a sandy gap ---------------- */
  define({
    id: 'ground.heathland', category: 'ground', size: [260, 44], variants: 3, seasonal: true, flippable: true,
    parts: ['body', 'tops'],
    palette: pal({ sand: ['#d8c49a', '#b8a47a'] }, {
      heather: { spring: ['#5a5a3e', '#6e6c4a', '#7a6a6a'], summer: ['#8a4a8a', '#a868a8', '#6a3a6a'], autumn: ['#7a4e5a', '#94606e', '#5a3c44'], winter: ['#5a4a42', '#6e5a50', '#46382e'] },
      gorse: { spring: ['#3e5a2a', '#f2c830', '#5a7a3a'], summer: ['#3a5426', '#d8b03a', '#4e6e34'], autumn: ['#3a5228', '#8a8a3a', '#4a6834'], winter: ['#34482a', '#c8a830', '#44603a'] },
      bracken: { spring: ['#6a9a3e', '#8ab85a', '#4a7a2e'], summer: ['#4e7e30', '#6a9a3e', '#3a6224'], autumn: ['#b0602a', '#c87a34', '#8a4a22'], winter: ['#8a5a3a', '#a07050', '#6a4430'] },
      grass: GRASS,
    }),
    anim: { sway: { part: 'tops', pivot: [0, -6], deg: 1.4 } },
    shadow: false, weight: .6,
    tags: ['uk', 'new-forest', 'heath', 'hampshire', 'countryside', 'kit:temperate', 'role:ground'],
    credit: 'hampshire library (south)',
    build(v, rnd) {
      const r = sceneRnd(311 + v * 17), body = [], tops = [];
      body.push(['@grass.2', rect(-130, -6, 260, 8)], ['@sand.0', poly([-20 + v * 30, 2], [-12 + v * 30, -6], [14 + v * 30, -6], [26 + v * 30, 2])], ['@sand.1', poly([-6 + v * 30, -2], [-2 + v * 30, -6], [8 + v * 30, -6], [12 + v * 30, -2]), .6]);
      for (let i = 0; i < 9; i++) {
        const x = -120 + i * 30 + r() * 10, w = 12 + r() * 10, h = 10 + r() * 10, kind = i % 3;
        if (Math.abs(x - (v * 30)) < 16) continue;
        const sl = kind === 0 ? 'heather' : kind === 1 ? 'gorse' : 'bracken';
        body.push([`@${sl}.0`, mound(x, 0, w, h)], [`@${sl}.2`, mound(x + w * .3, 0, w * .6, h * .6), .6]);
        if (kind === 0) tops.push({ f: '@heather.1', d: Array.from({ length: 6 }, (_, k) => ell(x - w * .6 + k * w * .24, -h * .7 + (k % 2) * 2, 1.6, 1.2)).join(''), op: .9 });
        if (kind === 1) tops.push({ f: '@gorse.1', d: Array.from({ length: 7 }, (_, k) => ell(x - w * .7 + k * w * .22, -h * .55 - (k % 3) * 2.4, 1.3)).join(''), op: .9 });
        if (kind === 2) tops.push({ s: '@bracken.1', w: 1.1, d: Array.from({ length: 5 }, (_, k) => `M${f1(x - w * .6 + k * w * .3)} ${f1(-h * .4)}q2 -6 6 -${f1(4 + k % 2 * 2)}`).join('') });
      }
      for (let i = 0; i < 14; i++) { const x = -126 + i * 18.6; tops.push({ f: '@grass.1', d: `M${f1(x)} -2l1.4 -${5 + i % 3}l1.4 ${5 + i % 3}z`, op: .8 }); }
      return { body, tops };
    },
  });

  /* ---------------- water.chalk-stream: gin-clear water over gravel, watercress beds, crowfoot in flower, glints ---------------- */
  define({
    id: 'water.chalk-stream', category: 'water', size: [400, 44], variants: 3, seasonal: true, flippable: true,
    parts: ['body', 'glint'],
    palette: pal({ gravel: ['#b8a888', '#9a8a6a', '#d0c4a8'], glint: ['#ffffff'], bank: ['#5a4a34'] }, {
      water: { spring: ['#6aa08a', '#8ac0a8', '#3e7a68'], summer: ['#5a9a7e', '#7ab89a', '#2e6e58'], autumn: ['#5a8478', '#7aa094', '#3a645a'], winter: ['#5e7a78', '#7e9a98', '#40605e'] },
      cress: { spring: ['#4e8a34', '#78b04a', '#f4f4ee'], summer: ['#3e7a2c', '#5e9a3a', '#ffffff'], autumn: ['#5a7a34', '#7a943e', '#e8e8d8'], winter: ['#3e5e34', '#56763e', '#3e5e34'] },
      crow: { spring: ['#3e6e3a', '#ffffff'], summer: ['#3a6a36', '#ffffff'], autumn: ['#4a6a3a', '#5a7a44'], winter: ['#3e5a3a', '#4a6644'] },
      grass: GRASS,
    }),
    anim: { flicker: { part: 'glint', op: [.2, .9], period: 2.4 } },
    shadow: false, reflect: false, weight: .5,
    tags: ['uk', 'hampshire', 'chalk-stream', 'river', 'test', 'itchen', 'watercress', 'countryside', 'kit:temperate', 'kit:water', 'role:edge'],
    credit: 'hampshire library (south)',
    build(v) {
      const r = sceneRnd(523 + v * 31), body = [], glint = [];
      body.push(['@grass.0', rect(-200, -14, 400, 6)], ['@bank', rect(-200, -9, 400, 2), .6], ['@water.0', rect(-200, -8, 400, 14)], ['@water.2', rect(-200, 2, 400, 4), .5]);
      // gravel seen through the water
      for (let i = 0; i < 26; i++) { const x = -196 + r() * 392, y = -4 + r() * 8; body.push({ f: '@gravel.' + (i % 3), d: ell(x, y, 1.6 + r() * 1.6, .9), op: .45, detail: true }); }
      // watercress mats on the margins (flowering white in summer), crowfoot streaming in the current
      for (let i = 0; i < 6; i++) {
        const x = -180 + i * 68 + r() * 20, w = 18 + r() * 12;
        body.push(['@cress.0', `M${f1(x - w)} -6Q${f1(x - w * .8)} -16 ${f1(x)} -16Q${f1(x + w * .8)} -16 ${f1(x + w)} -6z`], ['@cress.1', `M${f1(x - w * .6)} -9Q${f1(x - w * .4)} -15 ${f1(x)} -15Q${f1(x + w * .2)} -14 ${f1(x + w * .3)} -9z`, .8]);
        body.push({ f: '@cress.2', d: Array.from({ length: 5 }, (_, k) => ell(x - w * .6 + k * w * .3, -15 + (k % 2) * 2, 1)).join(''), op: .9, detail: true });
        const cx = x + 34;
        body.push({ s: '@crow.0', w: 2, op: .8, d: `M${f1(cx - 14)} -1q8 -3 16 0t16 0` }, { f: '@crow.1', d: ell(cx - 6, -2, 1.3) + ell(cx + 4, -1, 1.3) + ell(cx + 12, -2, 1.3), op: .95 });
      }
      for (let i = 0; i < 9; i++) glint.push({ s: '@glint', w: 1, op: .8, d: `M${f1(-190 + i * 44 + r() * 10)} ${f1(-4 + r() * 6)}h${f1(5 + r() * 6)}` });
      return { body, glint };
    },
  });

  /* ---------------- rock.chalk-downs: the rolling South Downs, fields, hedges, beech hangers and a chalk track ---------------- */
  define({
    id: 'rock.chalk-downs', category: 'rock', size: [1400, 240], variants: 3, seasonal: true, flippable: true,
    palette: pal({ chalk: ['#ece6d6', '#d4ccb8'] }, {
      down: { spring: ['#7aa458', '#94bc6a', '#5e8a44', '#a8c87a'], summer: ['#8aa85a', '#a4bc6a', '#6a8a44', '#d8c070'], autumn: ['#8a8a50', '#a49a5e', '#6a6e40', '#a8784a'], winter: ['#8a9480', '#a4ac98', '#6e7866', '#b8bcb0'] },
      wood: { spring: ['#4e7a34', '#6a9a44'], summer: ['#2e5426', '#3e6a30'], autumn: ['#9a5a26', '#b87a34'], winter: ['#4e4a44', '#625c54'] },
    }),
    shadow: false, reflect: false, weight: 0,
    tags: ['uk', 'hampshire', 'south-downs', 'downs', 'hills', 'chalk', 'countryside', 'natural', 'kit:temperate', 'role:rock'],
    credit: 'hampshire library (south)',
    build(v) {
      const r = sceneRnd(907 + v * 41), b = [];
      const ridge = (base, amp, ph, n) => { let d = `M-700 0V${base}`; for (let i = 0; i <= n; i++) { const x = -700 + i * 1400 / n, y = base - amp * (.55 + .45 * Math.sin(i * 1.3 + ph + v)) ; d += `Q${f1(x - 700 / n)} ${f1(y - amp * .25)} ${f1(x)} ${f1(y)}`; } return d + 'V0z'; };
      b.push(['@down.2', ridge(-150, 70, 0, 5)], ['@down.0', ridge(-100, 60, 2, 6)], ['@down.1', ridge(-50, 40, 4, 7)]);
      // field strips and hedgerows across the near slope (the summer barley gold, the autumn plough)
      for (let i = 0; i < 9; i++) { const x = -660 + i * 150 + r() * 30, w = 70 + r() * 40, y = -30 - r() * 30; b.push({ f: '@down.' + (i % 2 ? 3 : 0), d: poly([x, y + 8], [x + w * .1, y - 8], [x + w, y - 10], [x + w * 1.05, y + 6]), op: .7 }, { s: '@wood.0', w: 1.6, op: .7, d: `M${f1(x)} ${f1(y + 8)}L${f1(x + w * 1.05)} ${f1(y + 6)}` }); }
      // beech hangers and clumps on the crests
      for (let i = 0; i < 7; i++) { const x = -620 + i * 200 + r() * 60, y = -90 - r() * 50, w = 20 + r() * 30; b.push(['@wood.0', `M${f1(x - w)} ${f1(y + 6)}Q${f1(x - w)} ${f1(y - 14)} ${f1(x)} ${f1(y - 16)}Q${f1(x + w)} ${f1(y - 14)} ${f1(x + w)} ${f1(y + 6)}z`], ['@wood.1', `M${f1(x - w * .8)} ${f1(y)}Q${f1(x - w * .6)} ${f1(y - 12)} ${f1(x - w * .1)} ${f1(y - 14)}Q${f1(x)} ${f1(y - 6)} ${f1(x - w * .2)} ${f1(y)}z`, .7]); }
      // the white chalk track climbing the down
      b.push({ s: '@chalk.0', w: 3, d: `M${-200 + v * 120} 0Q${-120 + v * 120} -40 ${-40 + v * 120} -70T${140 + v * 120} -120` }, { s: '@chalk.1', w: 1, op: .6, d: `M${-198 + v * 120} 2Q${-118 + v * 120} -38 ${-38 + v * 120} -68` });
      return { body: b };
    },
  });

  /* ---------------- rail.heritage-steam-loco: a tender engine in the manner of the Watercress Line ---------------- */
  define({
    id: 'rail.heritage-steam-loco', category: 'rail', size: [230, 120], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    parts: ['body', 'steam'],
    palette: pal({
      livery: ['#2e5a36', '#1e3e26', '#4a7a52'], livery1: ['#1e1e20', '#101012', '#3a3a3e'], livery2: ['#6e2420', '#4a1614', '#8e3a32'],
      metal: ['#2a2a2c', '#4a4a4e', '#8a8a8e'], brass: ['#c8a040', '#e8c868'], red: ['#a82a20'], coal: ['#18181a', '#3a3a3c'], glass: ['#3e4a58'], white: ['#f2f0ea'],
    }, { steam: { spring: ['#f2f2f2', '#d8dadc'], summer: ['#f4f4f4', '#e0e2e4'], autumn: ['#e4e4e2', '#c4c6c8'], winter: ['#ffffff', '#e8eef4'] } }),
    night: { glow: { window: '#f4c674', lamp: '#fff2c8' }, on: 1 },
    anim: { flicker: { part: 'steam', op: [.45, .95], period: 1.6 } },
    shadow: { rx: 100, ry: 6, h: 60 }, weight: .3,
    tags: ['uk', 'hampshire', 'watercress-line', 'heritage', 'steam', 'railway', 'kit:temperate', 'kit:vehicles', 'role:vehicle'],
    credit: 'hampshire library (south)',
    build(v, rnd, ctx) {
      const L = v === 0 ? '@livery' : v === 1 ? '@livery1' : '@livery2', b = [], P = (...s) => b.push(...s), W = ctx.season === 'winter';
      // the tender behind (left)
      P([L + '.0', rect(-112, -62, 64, 46)], [L + '.1', rect(-112, -26, 64, 10)], [L + '.2', rect(-112, -62, 64, 4), .6], ['@coal.0', 'M-110-62Q-96-72-80-66Q-66-72-52-62z'], ['@coal.1', 'M-100-64l6-3l5 3zM-76-65l5-3l5 3z']);
      P({ s: '@brass.0', w: 1, d: 'M-108-54h56v26h-56z', op: .7 });
      // the cab, its windows (lit at dusk) and the glow of the fire on the footplate
      P([L + '.0', rect(-46, -80, 34, 64)], [L + '.1', rect(-46, -80, 34, 4)], ['@metal.0', 'M-50-80Q-29-90-8-80z']);
      P({ f: '@glass', d: rect(-40, -72, 10, 14), glow: 'window' }, { f: '@glass', d: rect(-26, -72, 10, 14), glow: 'window' }, { f: '#e8803a', d: rect(-40, -36, 22, 6), glow: 'lamp', op: .9 });
      // the boiler, the smokebox, the chimney, the dome and the safety valves
      P([L + '.0', 'M-12-74H76V-36H-12z'], [L + '.2', 'M-12-74H76V-68H-12z', .5], [L + '.1', 'M-12-44H76V-36H-12z', .6]);
      for (const x of [10, 34, 58]) P({ s: '@brass.0', w: 1.4, d: `M${x} -74V-36` });
      P(['@metal.0', rect(76, -76, 22, 42)], ['@metal.1', rect(76, -76, 22, 4), .6], ['@metal.0', ell(98, -55, 3, 20)]);
      P(['@metal.0', rect(84, -94, 10, 18)], ['@metal.0', rect(82, -96, 14, 4)], ['@brass.0', 'M34-74Q34-86 42-86Q50-86 50-74z'], ['@brass.1', 'M36-76Q36-84 42-84z', .6], ['@brass.0', rect(14, -80, 6, 6)]);
      // the footplate, red buffer beam, buffers and the lamps (lit)
      P(['@metal.0', rect(-114, -18, 232, 4)], ['@red', rect(100, -26, 8, 12)], ['@metal.1', rect(108, -24, 6, 3)], ['@metal.1', rect(108, -18, 6, 3)], ['@metal.1', rect(-120, -24, 6, 3)], ['@metal.1', rect(-120, -18, 6, 3)]);
      for (const [x, y] of [[96, -82], [100, -30], [86, -30]]) P(['@white', rect(x - 3, y - 6, 6, 6)], { f: '#fff2c8', d: ell(x, y - 3, 1.8), glow: 'lamp' });
      P(['@metal.0', rect(70, -32, 26, 14)], ['@metal.1', rect(70, -32, 26, 3), .6]);
      // wheels: three coupled drivers and a leading pair, tender wheels; spokes and the coupling rod
      const wheel = (x, rad) => { P(['@metal.0', ell(x, -rad - 1, rad)], [L + '.0', ell(x, -rad - 1, rad * .8)], ['@metal.1', ell(x, -rad - 1, rad * .22)]); let s = ''; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; s += `M${f1(x)} ${f1(-rad - 1)}l${f1(Math.cos(a) * rad * .8)} ${f1(Math.sin(a) * rad * .8)}`; } P({ s: '@metal.0', w: 1, d: s }); };
      for (const x of [-8, 22, 52]) wheel(x, 14);
      wheel(86, 8);
      for (const x of [-100, -80, -60]) wheel(x, 8);
      P({ s: '@metal.2', w: 2.2, d: 'M-8-12H52' }, { s: '@metal.2', w: 1.8, d: 'M52-12L80-24' });
      P(['@metal.0', rect(-120, -2, 240, 2)]);
      if (W) P(['@steam.0', rect(-112, -63, 64, 2)], ['@steam.0', 'M-50-81Q-29-91-8-81V-79Q-29-88-50-79z']);
      const plume = W ? 1.4 : 1, steam = [];
      for (let k = 0; k < 5; k++) steam.push({ f: '@steam.' + (k % 2), d: ell(88 - k * 16 * plume, -100 - k * 6 * plume, (6 + k * 3) * plume, (5 + k * 2) * plume), op: .85 - k * .12 });
      return { body: b, steam };
    },
  });

  /* ---------------- rail.heritage-coach: a preserved corridor coach (maroon, green, or crimson and cream) ---------------- */
  define({
    id: 'rail.heritage-coach', category: 'rail', size: [240, 70], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: pal({
      c0: ['#6e2420', '#4a1614', '#8e3a32'], c1: ['#2e5a36', '#1e3e26', '#4a7a52'], c2: ['#8a2a2a', '#5a1a1a', '#e8d4a8'],
      metal: ['#2a2a2c', '#4a4a4e'], glass: ['#3e4a58', '#a8b8c8'], brass: ['#c8a040'],
    }, { roof: { spring: ['#6a6a6a', '#8a8a8a'], summer: ['#707070', '#909090'], autumn: ['#6a625a', '#8a8278'], winter: ['#f2f5f8', '#d8e0ea'] } }),
    night: { glow: { window: '#f4d08a', lamp: '#fff2c8' }, on: .9 },
    shadow: { rx: 110, ry: 5, h: 50 }, weight: .3,
    tags: ['uk', 'hampshire', 'watercress-line', 'heritage', 'railway', 'kit:temperate', 'kit:vehicles', 'role:vehicle'],
    credit: 'hampshire library (south)',
    build(v) {
      const C = `@c${v}`, b = [], P = (...s) => b.push(...s);
      P(['@roof.0', 'M-116-58Q0-68 116-58V-54H-116z'], ['@roof.1', 'M-112-60Q0-68 112-60', .5]);
      P([C + '.0', rect(-118, -54, 236, 40)], [C + '.1', rect(-118, -20, 236, 6)]);
      if (v === 2) P([C + '.2', rect(-118, -54, 236, 16)]);
      for (let i = 0; i < 10; i++) { const x = -108 + i * 22; P({ f: '@glass.0', d: rect(x, -50, 15, 14), glow: 'window' }, ['@glass.1', rect(x, -50, 6, 6), .3]); }
      for (const x of [-116, -6, 104]) P({ s: C + '.1', w: 1, d: `M${x} -54v40M${x + 10} -54v40` }, ['@brass.0', rect(x + 7, -34, 1.6, 4)]);
      P(['@metal.0', rect(-120, -14, 240, 4)]);
      for (const bx of [-80, 80]) { P(['@metal.1', rect(bx - 26, -12, 52, 5)]); for (const dx of [-16, 16]) P(['@metal.0', ell(bx + dx, -6, 6)], ['@metal.1', ell(bx + dx, -6, 2)]); }
      P(['@metal.0', rect(-126, -24, 8, 3)], ['@metal.0', rect(118, -24, 8, 3)], ['@metal.0', rect(-120, -1, 240, 1.6)]);
      return { body: b };
    },
  });
})();

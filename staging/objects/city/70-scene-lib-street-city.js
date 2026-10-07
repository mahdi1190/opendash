/* ============================================================
   SCENE LIBRARY: city street furniture (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per variant.

   street.lamppost: city lamp standards, taller than the village lamp
   (street.lamp): lanterns light at real dusk (glow 'lamp') and the 'lit'
   part holds their halos and the pool of light on the pavement.
   street.bollard: cast-iron, steel and concrete bollards. Generic designs,
   no crests or lettering. Anchor: the ground at the foot.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const halo = (cx, cy, r) => ({ f: { rad: [[0, '@halo', .6], [.3, '@halo', .22], [1, '@halo', 0]], cx, cy, r }, d: ell(cx, cy, r, r) });
  const pool = (cx, r) => ({ f: { rad: [[0, '@pool', .32], [1, '@pool', 0]], cx, cy: 0, r }, d: ell(cx, 0, r, r * .2) });
  /** A four-sided Victorian lantern hanging or standing at (x, y = its base). */
  const lantern = (x, y, s = 1) => [
    ['@iron.0', `M${f1(x - 5 * s)} ${f1(y)}h${f1(10 * s)}l${f1(-2 * s)} ${f1(4 * s)}h${f1(-6 * s)}z`],
    { f: '@glass.0', d: `M${f1(x - 7 * s)} ${f1(y - 20 * s)}h${f1(14 * s)}l${f1(-2 * s)} ${f1(20 * s)}h${f1(-10 * s)}z`, glow: 'lamp' },
    { s: '@iron.0', w: f1(1.1 * s), d: `M${f1(x)} ${f1(y - 20 * s)}v${f1(20 * s)}M${f1(x - 7 * s)} ${f1(y - 20 * s)}l${f1(2 * s)} ${f1(20 * s)}M${f1(x + 7 * s)} ${f1(y - 20 * s)}l${f1(-2 * s)} ${f1(20 * s)}` },
    ['@iron.0', `M${f1(x - 10 * s)} ${f1(y - 20 * s)}h${f1(20 * s)}l${f1(-6 * s)} ${f1(-8 * s)}h${f1(-8 * s)}z`], ['@iron.1', `M${f1(x + 2 * s)} ${f1(y - 28 * s)}h${f1(2 * s)}l${f1(6 * s)} ${f1(8 * s)}h${f1(-3 * s)}z`, .6],
    ['@iron.0', ell(x, y - 31 * s, 2.2 * s, 2.6 * s)],
  ];

  /* ---------- street.lamppost: v0 a fluted cast-iron column with two lanterns on a scrolled crossarm,
     v1 a single lantern column with a ladder bar, v2 a modern steel column with a slim LED head,
     v3 a riverside column with a lantern on a curved swan-neck bracket ---------- */
  defineObj({
    id: 'street.lamppost', category: 'street', size: [90, 250], variants: 4, seasonal: false, flippable: true, parts: ['lit', 'body'],
    palette: { base: { iron: ['#22262a', '#4a5056', '#151719'], green: ['#23392e', '#3e5a4a'], glass: ['#dcdccc', '#f4f2e4'], steel: ['#7a8288', '#aab2b8', '#4e5459'], halo: '#ffe0a0', pool: '#ffd890', led: '#eef4ff' } },
    night: { glow: { lamp: '#ffe2a0' }, on: 1 },
    anim: { flicker: { part: 'lit', op: [.88, 1], period: 3.1 } },
    shadow: { rx: 10, ry: 2.4, h: 200 },
    tags: ['uk', 'london', 'city', 'street', 'embankment', 'lamp', 'lamp-post', 'kit:urban', 'kit:london', 'role:street'],
    credit: 'city kit: Victorian and modern lamp standards, generic',
    build(v) {
      const body = [], lit = [];
      const I = v === 3 ? '@green' : '@iron';
      if (v === 0 || v === 1 || v === 3) {
        // the base: a stepped plinth, a fluted shaft tapering to a collar
        const top = v === 1 ? -168 : -186;
        body.push([`${I}.0`, 'M-11 0v-8h22v8zM-9-8v-6h18v6zM-7-14l1-26h12l1 26z'], [`${I}.1`, 'M-5-16v-22h2v22zM1-16v-22h2v22z', .6], { s: `${I}.0`, w: 5, d: `M0-40V${top}` }, { s: `${I}.1`, w: 1, op: .6, d: `M-1.2-42V${top + 2}` }, [`${I}.0`, rect(-4.5, -96, 9, 4)], [`${I}.0`, rect(-5, top - 2, 10, 4)]);
        if (v === 0) {
          // a scrolled crossarm carrying two hanging lanterns
          body.push({ s: '@iron.0', w: 3, d: `M-34 ${top + 8}q34-16 68 0M0 ${top}v-8` }, { s: '@iron.0', w: 1.6, d: `M-6 ${top + 4}q-10 10-20 4q-4-6 2-8M6 ${top + 4}q10 10 20 4q4-6-2-8` });
          body.push(...lantern(-34, top + 36, 1), ...lantern(34, top + 36, 1));
          body.push({ s: '@iron.0', w: 1.4, d: `M-34 ${top + 8}v-2M34 ${top + 8}v-2` }, ['@iron.0', ell(0, top - 10, 3, 3)]);
          lit.push(halo(-34, top + 22, 38), halo(34, top + 22, 38), pool(0, 70));
        } else if (v === 1) {
          // a single lantern on top and a ladder bar
          body.push({ s: '@iron.0', w: 2, d: `M-14 ${top + 18}h28` }, ['@iron.0', ell(-14, top + 18, 2, 2) + ell(14, top + 18, 2, 2)]);
          body.push(...lantern(0, top - 2, 1.15));
          lit.push(halo(0, top - 14, 46), pool(0, 64));
        } else {
          // the riverside swan neck: the lantern hangs forward of the column
          body.push({ s: '@green.0', w: 3, d: `M0 ${top}q0-24 22-24q10 0 12 10` }, { s: '@green.1', w: 1, op: .6, d: `M-1 ${top - 2}q0-20 20-21` }, ['@green.0', ell(0, top - 6, 3.4, 3.4)]);
          body.push(...lantern(34, top + 22, 1));
          lit.push(halo(34, top + 8, 40), pool(26, 66));
        }
      } else {
        // modern: a tapered steel column, an outreach arm and a slim LED head
        body.push(['@steel.2', 'M-8 0v-6h16v6z'], ['@steel.0', 'M-4.6-6L-3-220h6L4.6-6z'], ['@steel.1', 'M-3.4-8L-2-218h1.6l-.4 210z', .7]);
        body.push({ s: '@steel.0', w: 3.6, d: 'M0-216q2-10 16-10h22' }, ['@steel.0', 'M30-230h30l3 5h-36z'], { f: '@led', d: 'M30-225h32v2.4h-32z', glow: 'lamp' });
        lit.push({ f: { lin: [[0, '@halo', .35], [1, '@halo', 0]], x1: 0, y1: -222, x2: 0, y2: 0 }, d: 'M30-222h32l50 222h-132z' }, halo(46, -222, 30), pool(46, 76));
      }
      return { lit, body };
    },
  });

  /* ---------- street.bollard: v0 a black cast-iron cannon bollard with a ring band and a cap,
     v1 a slim stainless steel post with a reflective band, v2 a dome-topped concrete bollard,
     v3 a cast-iron bollard in dark green with a ball top ---------- */
  defineObj({
    id: 'street.bollard', category: 'street', size: [22, 44], variants: 4, seasonal: false, flippable: true,
    palette: { base: { iron: ['#1e2124', '#4a5054', '#0f1112'], green: ['#23392e', '#4a6a58'], steel: ['#9aa2a8', '#d4dadc', '#5a6268'], band: '#e8ecd8', conc: ['#c6c2b8', '#a29e94', '#e2dfd8'], gold: '#a88a48' } },
    shadow: { rx: 8, ry: 2, h: 40 },
    tags: ['uk', 'london', 'city', 'street', 'pavement', 'bollard', 'kit:urban', 'kit:london', 'role:street'],
    credit: 'city kit: bollards, generic',
    build(v) {
      const body = [];
      if (v === 0 || v === 3) {
        const I = v === 3 ? '@green' : '@iron', h = v === 3 ? 40 : 38;
        body.push([`${I}.0`, `M-7 0q-1-${h * .6} 1-${h - 6}h12q2 ${h * .6 - 6} 1 ${h - 6}z`], [`${I}.1`, `M-4.6-2q-.8-${h * .55} .6-${h - 8}h2l-.8 ${h - 8}z`, .55], ['#000000', `M3-2q.8-${h * .55}-.4-${h - 8}h2.4q1.6 ${h * .5} .8 ${h - 8}z`, .25]);
        body.push([`${I}.0`, rect(-8, -h * .58, 16, 3.4)], [`${I}.1`, rect(-8, -h * .58, 16, 1.1), .6]);
        if (v === 0) body.push(['@iron.0', `M-7-${h - 6}q7-8 14 0z`], ['@iron.0', ell(0, -h + 1, 2.4, 2.4)]);
        else body.push(['@green.0', ell(0, -h + 2, 5.4, 5)], ['@green.1', ell(-1.6, -h + .4, 2, 1.6), .6], ['@gold', rect(-6.4, -h + 6, 12.8, 1.6)]);
      } else if (v === 1) {
        body.push(['@steel.0', rect(-4, -40, 8, 40)], ['@steel.1', rect(-3, -40, 2, 40), .8], ['@steel.2', rect(2, -40, 2, 40), .5], ['@band', rect(-4, -34, 8, 4)], ['@steel.1', ell(0, -40, 4, 1.4)]);
      } else {
        body.push(['@conc.0', 'M-9 0v-26q0-10 9-10t9 10v26z'], ['@conc.2', 'M-6-2v-24q0-7 5-8v32z', .6], ['@conc.1', 'M5-2v-24q0-5-2-7l1 31z', .7], ['@conc.1', rect(-10, -3, 20, 3)]);
      }
      return { body };
    },
  });
})();

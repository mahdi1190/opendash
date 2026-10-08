/* ============================================================
   SCENE LIBRARY: animals, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Sheep and New Forest ponies, FACING RIGHT, lit from the LEFT. Anchor: the
   feet on the ground. Fleece and coats follow the season.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  /** A colour set [base, shade, light, deep] from one colour. */
  const tone4 = c => [c, mix(c, '#000000', .28), mix(c, '#ffffff', .25), mix(c, '#000000', .52)];
  /** Structural randomness that does NOT change with the season (shapeBySeason objects re-seed r per season). */
  const srnd = k => sceneRnd(sceneHash(k));
  /** A rotation matrix of deg degrees about (cx, cy), and shapes with a matrix applied. */
  const rot = (deg, cx, cy) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, f1(cx - c * cx + s * cy), f1(cy - s * cx - c * cy)].map(n => Math.round(n * 1e4) / 1e4); };
  const withM = (shapes, m) => shapes.filter(Boolean).map(sh => Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2], m } : Object.assign({}, sh, { m }));
  /** A scalloped clump outline (foliage, fleece, rubble): n lobes round an ellipse. */
  const lobed = (r, cx, cy, rx, ry, n, rag = .3) => {
    const a = i => (i / n) * Math.PI * 2 - Math.PI / 2, k = Array.from({ length: n }, () => 1 - rag * r());
    const P = i => [cx + Math.cos(a(i)) * rx * k[i % n], cy + Math.sin(a(i)) * ry * k[i % n]];
    let d = `M${f1(P(0)[0])} ${f1(P(0)[1])}`;
    for (let i = 0; i < n; i++) { const am = (a(i) + a(i + 1)) / 2, km = (k[i] + k[(i + 1) % n]) / 2 * 1.32, q = P(i + 1); d += `Q${f1(cx + Math.cos(am) * rx * km)} ${f1(cy + Math.sin(am) * ry * km)} ${f1(q[0])} ${f1(q[1])}`; }
    return d + 'z';
  };
  /** Seasonal grass: the palette slot 'grass' [mid, light, deep] for the four seasons. */
  const GRASS = { spring: ['#5f9a3a', '#8ab84e', '#3e6e2a'], summer: ['#4d7f2e', '#78a040', '#345a22'], autumn: ['#7d7a3a', '#a8954c', '#585428'], winter: ['#5e6450', '#7c7c64', '#40463a'] };
  /** Grass tufts along the ground from x0 to x1 at y (blades h tall): three shapes. */
  const tufts = (r, x0, x1, n, h, y = 0) => {
    const p = ['', '', ''];
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (i + r()) / n, hh = h * rr(r, .5, 1.2), l = rr(r, -3, 3);
      p[i % 3] += `M${f1(x - 3)} ${f1(y + 1)}Q${f1(x - 2 + l * .3)} ${f1(y - hh * .5)} ${f1(x - 3 + l)} ${f1(y - hh)}Q${f1(x + l * .2)} ${f1(y - hh * .45)} ${f1(x + 1)} ${f1(y + 1)}z`
        + `M${f1(x)} ${f1(y + 1)}Q${f1(x + 2 + l * .3)} ${f1(y - hh * .4)} ${f1(x + 4 + l)} ${f1(y - hh * .8)}Q${f1(x + 3)} ${f1(y - hh * .35)} ${f1(x + 3)} ${f1(y + 1)}z`;
    }
    return [['@grass.2', p[2]], ['@grass.0', p[0]], ['@grass.1', p[1]]];
  };

  const eye = (x, y, rad) => [['#141010', circ(x, y, rad)], ['#ffffff', circ(x - rad * .35, y - rad * .35, rad * .35), .85]];

  /* ---------- animal.sheep: v0 a white-faced ewe, v1 a black-faced Suffolk, v2 a grey Herdwick, v3 a white-faced ewe grazing. Full ragged fleece in winter and spring, shorn and smooth in summer ---------- */
  defineObj({
    id: 'animal.sheep', category: 'animal', size: [104, 74], variants: 4, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legsFar', 'body', 'legsNear', 'head'],
    palette: Object.assign({ base: { face: ['#f0e8da', '#c8bca8', '#2a2420'], black: ['#1e1a18', '#3a3430'], hoof: '#2a2420', nose: '#5a4a46', ear: '#d8b0a0' } }, bySeason({
      wool: { spring: ['#e2dac8', '#bdb4a0', '#f2ecde', '#a69c88'], summer: ['#f2eee4', '#cfc8ba', '#fbf8f2', '#b8b0a2'], autumn: ['#ece6d8', '#c8c0ae', '#f8f4ea', '#aea490'], winter: ['#d8cfba', '#b0a690', '#e8e0cc', '#968c78'] },
      grey: { spring: ['#8a8680', '#6a6660', '#a8a49c', '#55524c'], summer: ['#9a968e', '#76726a', '#b4b0a8', '#5e5a54'], autumn: ['#8e8a82', '#6c6862', '#aaa69e', '#58544e'], winter: ['#7e7a72', '#5e5a54', '#9a968e', '#4a4640'] },
    })),
    anim: { turn: { part: 'head', pivot: [26, -50], deg: 10, period: 8, hold: .7 } },
    shadow: { rx: 40, ry: 6, h: 60 },
    tags: ['uk', 'countryside', 'farm', 'field', 'downs', 'dales', 'sheep', 'grazing', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: 'coast-country kit (sheep: generic lowland and fell breeds)',
    build(v, r, ctx) {
      const s = ctx.season, W = v === 2 ? '@grey' : '@wool', dark = v === 1, leg = dark ? '@black.0' : v === 2 ? '@face.0' : '@face.1';
      const shorn = s === 'summer', full = s === 'winter' || s === 'spring', rx = shorn ? 34 : full ? 42 : 38, ry = shorn ? 18 : full ? 24 : 21, cy = shorn ? -40 : -43;
      const L = x => `M${x - 2.6} -28L${x - 2.2} 0h4.4L${x + 2.6} -28z`;
      const legsFar = [[leg, L(-18) + L(16)], ['#000000', L(-18) + L(16), .25], ['@hoof', rect(-20.5, -2, 5, 2.4) + rect(13.5, -2, 5, 2.4)]];
      const legsNear = [[leg, L(-26) + L(22)], ['@hoof', rect(-28.5, -2, 5.5, 2.6) + rect(19.5, -2, 5.5, 2.6)]];
      // the fleece: a scalloped mass, lit from the upper left, with curls and a shaded belly
      const body = [[`${W}.0`, lobed(r, -4, cy, rx, ry, full ? 16 : 13, full ? .16 : .08)], [`${W}.2`, lobed(r, -10, cy - ry * .35, rx * .62, ry * .45, 9, .12), .55], [`${W}.1`, `M${-4 - rx * .9} ${cy + ry * .3}Q-4 ${cy + ry * 1.25} ${-4 + rx * .9} ${cy + ry * .3}Q-4 ${cy + ry * .8} ${-4 - rx * .9} ${cy + ry * .3}z`, .7]];
      let curls = ''; const n = shorn ? 8 : 22; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, k = Math.sqrt(r()) * .8, x = -4 + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k; curls += `M${f1(x - 2.5)} ${f1(y)}q2.5 -3 5 0`; }
      body.push({ s: `${W}.3`, w: .9, op: shorn ? .25 : .45, d: curls, detail: true });
      if (shorn) body.push({ s: `${W}.3`, w: .7, op: .25, d: `M${-4 - rx * .5} ${cy - ry * .5}q${rx * .3} 4 ${rx * .5} 0M${-4} ${cy}q${rx * .3} 4 ${rx * .5} 0` });
      // the head: face, ears sticking out sideways, eye, nose (a fleecy poll on the white-faced breeds)
      const F = dark ? '@black' : '@face';
      const head = [[`${F}.1`, 'M30 -55Q22 -62 14 -60Q20 -54 30 -52z'], [`${F}.0`, 'M23 -54Q30 -63 38 -58L48 -44Q50 -38 44 -37L37 -38Q28 -42 23 -54z'], [`${F}.1`, 'M36 -40Q42 -41 46 -38L44 -37L37 -38z', .6],
        [`${F}.0`, 'M34 -58l5 -6l3 7z'], [dark ? '@black.1' : '@ear', 'M35 -58l3.6 -4.4l1.6 4.8z', .7], ...eye(37.5, -50, 1.4), ['@nose', ell(46.5, -40.5, 1.6, 1.1)]];
      if (!dark) head.push([`${W}.0`, lobed(r, 27, -56, 6, 4.5, 6, .2)]);
      return { legsFar, body, legsNear, head: v === 3 ? withM(head, rot(62, 26, -50)) : head };
    },
  });

  /* ---------- animal.pony: a New Forest pony; v0 bay, v1 chestnut grazing, v2 grey. Sleek with a sheen in summer, a shaggy dull coat in winter ---------- */
  defineObj({
    id: 'animal.pony', category: 'animal', size: [150, 140], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['legsFar', 'tail', 'body', 'legsNear', 'head'],
    palette: Object.assign({ base: {
      mane: ['#1e1a18', '#5a2e16', '#e6e2da'], maneL: ['#3a3430', '#7a4626', '#fbf8f2'], point: ['#1e1a18', '#6e3a1c', '#8a8680'], hoof: '#2a2420', nose: ['#2a2220', '#3a2a24', '#5a5654'], blaze: '#f2eee4',
      rim: '#e2eaf8',   // the cool rim of light on the dark coats (back line, crest, face, knees): a sheen by day, the edge that keeps them readable at night
    } }, bySeason({
      c0: { spring: tone4('#6e4428'), summer: tone4('#7a4626'), autumn: tone4('#6a4430'), winter: tone4('#5e4634') },
      c1: { spring: tone4('#9a5430'), summer: tone4('#a8582c'), autumn: tone4('#94563a'), winter: tone4('#86583e') },
      c2: { spring: tone4('#c8c4bc'), summer: tone4('#d4d0c8'), autumn: tone4('#c0bcb2'), winter: tone4('#aeaaa0') },
    })),
    anim: { turn: { part: 'head', pivot: [18, -96], deg: 8, period: 9, hold: .7 }, sway: { part: 'tail', pivot: [-48, -90], deg: 6 } },
    shadow: { rx: 56, ry: 7, h: 120 },
    tags: ['uk', 'new-forest', 'heath', 'common', 'countryside', 'pony', 'horse', 'grazing', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: 'coast-country kit (New Forest pony)',
    build(v, r, ctx) {
      const s = ctx.season, C = `@c${v}`, shaggy = s === 'winter' || s === 'autumn', graze = v === 1, rim = v < 2, kf = graze ? 6 : 0;
      // the legs: a knee (hock) and a fetlock, the darker points hugging the lower leg and blending in below the knee (no
      // block); X shears a foreleg forward by k at the hoof (the grazer sets its near foreleg forward)
      const X = (x, k, y) => f1(x + k * (1 + y / 62)), P = (x, k = 0) => (dx, y) => `${X(x + dx, k, y)} ${y}`;
      const fore = (x, k = 0) => { const p = P(x, k); return `M${p(-6, -62)}L${p(-4.2, -34)}Q${p(-5.2, -31)} ${p(-4, -28)}L${p(-3.4, -12)}Q${p(-4.6, -8)} ${p(-3.6, -4)}L${p(-4, 0)}H${X(x + 4, k, 0)}L${p(3.8, -4)}Q${p(5, -8)} ${p(3.6, -12)}L${p(3.6, -28)}Q${p(5.2, -31)} ${p(4.4, -34)}L${p(6, -62)}z`; };
      const foreLow = (x, k = 0) => { const p = P(x, k); return `M${p(-4, -28)}L${p(3.6, -28)}L${p(3.6, -12)}Q${p(5, -8)} ${p(3.8, -4)}L${p(4, 0)}H${X(x - 4, k, 0)}L${p(-3.6, -4)}Q${p(-4.6, -8)} ${p(-3.4, -12)}z`; };
      const hind = x => { const p = P(x); return `M${p(-8, -70)}Q${p(-11, -50)} ${p(-4, -38)}Q${p(-3.4, -34)} ${p(-2.4, -31)}L${p(-2.2, -12)}Q${p(-3.6, -8)} ${p(-2.4, -4)}L${p(-2.6, 0)}H${f1(x + 5.4)}L${p(5, -4)}Q${p(6.2, -8)} ${p(5, -12)}L${p(5, -28)}Q${p(6.4, -34)} ${p(6, -38)}Q${p(10, -52)} ${p(10, -68)}z`; };
      const hindLow = x => { const p = P(x); return `M${p(-2.4, -31)}L${p(5, -28)}L${p(5, -12)}Q${p(6.2, -8)} ${p(5, -4)}L${p(5.4, 0)}H${f1(x - 2.6)}L${p(-2.4, -4)}Q${p(-3.6, -8)} ${p(-2.2, -12)}z`; };
      const pn = P(34, kf), pt = { lin: [[0, `@point.${v}`, 0], [1, `@point.${v}`, 1]], x1: 0, y1: -29, x2: 0, y2: -20 };
      const legsFar = [[`${C}.1`, fore(24) + hind(-28)], [pt, foreLow(24) + hindLow(-28), .9], ['#000000', fore(24) + hind(-28), .2], ['@hoof', rect(19.5, -3, 9, 3.4) + rect(-31, -3, 9, 3.4)]];
      const legsNear = [[`${C}.0`, fore(34, kf) + hind(-38)], [`${C}.2`, `M${pn(-6, -60)}L${pn(-4, -36)}H${X(33, kf, -36)}L${pn(-2, -60)}z`, .4], [pt, foreLow(34, kf) + hindLow(-38)], ['@hoof', rect(29.5 + kf, -3, 9, 3.6) + rect(-41, -3, 9, 3.6)]];
      if (rim) legsNear.push({ s: '@rim', w: 1.4, op: .85, d: `M${pn(4, -38)}Q${pn(4.8, -31)} ${pn(3.4, -25)}M-43.6 -43Q-41.6 -37.6 -39.8 -32` });
      const tail = [[`@mane.${v}`, 'M-46 -94Q-62 -88 -64 -64Q-66 -46 -58 -34Q-54 -30 -50 -36Q-56 -54 -48 -78z'], { s: `@maneL.${v}`, w: 1, op: .6, d: 'M-52 -86Q-60 -70 -58 -42M-56 -84Q-62 -66 -60 -46' }];
      if (rim) tail.push({ s: '@rim', w: 1.3, op: .6, d: 'M-48.5 -92.5Q-60.5 -87 -62.4 -66' });
      const body = [[`${C}.0`, 'M-52 -80Q-54 -98 -32 -100H18Q40 -100 46 -84Q48 -64 36 -56Q20 -52 -2 -54H-34Q-54 -58 -52 -80z'],
        [`${C}.2`, 'M-44 -94Q-20 -102 18 -98Q-10 -96 -44 -90z', .55], [`${C}.1`, 'M-50 -66Q-10 -54 40 -62Q34 -56 20 -54H-34Q-46 -58 -50 -66z', .6], [`${C}.3`, 'M-48 -86Q-54 -76 -48 -66Q-44 -80 -40 -92z', .35]];
      if (!shaggy) body.push({ s: `${C}.2`, w: 1.2, op: .45, d: 'M-40 -88Q-20 -92 6 -90M-30 -80q14 -2 30 0' });
      else { let h = ''; for (let i = 0; i < 18; i++) { const x = -46 + i * 4.8 + rr(r, -1, 1); h += `M${f1(x)} ${f1(-56 + Math.abs(x) * .04)}l${f1(rr(r, -1, 1))} ${f1(rr(r, 3, 5))}`; } body.push({ s: `${C}.1`, w: 1.4, op: .7, d: h }, { s: `${C}.2`, w: .9, op: .3, d: 'M-40 -90l2 4M-30 -92l2 4M-20 -93l2 4M-8 -93l2 4M4 -92l2 4M-36 -80l2 4M-22 -82l2 4M-6 -82l2 4', detail: true }); }
      if (rim) body.push(['@rim', 'M-51 -84Q-52.6 -98.4 -32 -99.6H14Q-8 -97.6 -32 -97Q-48 -96 -51 -84z', .9]);
      // the neck and head as one part (the turn hook pivots it about the neck end at the withers); mane along the crest, forelock, a white star on the bay
      let head;
      if (graze) {
        // grazing: the crest rises from the withers in a long arch and drops in front of the chest, thick at the shoulder and
        // slim at the throat; the head hangs nearly vertical from the poll, the muzzle by the grass, the ears back
        head = [[`${C}.0`, 'M6 -99C28 -110 52 -106 61 -88C67 -76 69 -66 68 -57L56 -50Q48 -62 46 -79L28 -88z'], [`${C}.1`, 'M46 -79Q48 -62 56 -50L58.6 -52Q51 -63 49 -76z', .45],
          [`${C}.0`, 'M57 -55L66 -61Q71 -60 72.5 -53C74.5 -40 76.5 -27 77.5 -17Q79.5 -10 77 -6.5Q73 -3.5 68 -5.5Q64.5 -8 63.5 -14Q62 -24 58 -31C52.6 -35 51.4 -46 57 -55z'],
          [`${C}.1`, 'M74 -46C75.4 -36 76.8 -27 77.5 -17Q79.5 -10 77 -6.5Q76 -14 75.2 -24Q74.4 -36 74 -46z', .5], [`${C}.2`, 'M56 -51Q52.4 -44 56.4 -36Q55.6 -44 58.6 -49z', .45],
          [`@nose.${v}`, 'M63.5 -14Q70.5 -17 78 -13.5Q79.5 -9.5 77 -6.5Q73 -3.5 68 -5.5Q64.5 -8 63.5 -14z', .8], ['#141010', ell(75, -10.5, 1, 1.5)], { s: `${C}.3`, w: .8, op: .6, d: 'M68 -6.8Q71 -5.8 74 -7', detail: true }, ...eye(68.5, -46, 1.8),
          [`@mane.${v}`, 'M5 -100C28 -112 54 -108 63 -89C69 -77 71 -66 69 -57L65 -59C65 -68 62 -78 57 -87C48 -101 28 -103 12 -96z'], { s: `@maneL.${v}`, w: 1, op: .6, d: 'M14 -101C32 -108 50 -104 58 -90M26 -103C40 -106 52 -100 60 -84', detail: true },
          [`${C}.1`, 'M63 -60l1 -12l5 9z'], [`${C}.1`, 'M66 -59l4 -12l3 11z'], [`@mane.${v}`, 'M64 -61Q72 -63 73.5 -55Q74.5 -48 72 -43Q70.5 -51 65 -56z']];
        if (shaggy) head.push({ s: `${C}.1`, w: 1.2, op: .6, d: 'M64 -13l-3 2M65.5 -9l-2 3M62 -20l-3 1', detail: true });
        if (rim) head.push({ s: '@rim', w: 1.8, op: .85, d: 'M8 -100.6C29 -110.6 53 -106.6 61.8 -88.6C67.6 -77 69.6 -67 68.2 -59' }, { s: '@rim', w: 1.4, op: .85, d: 'M72.9 -44C74.3 -34 75.3 -25 76.1 -17Q77.7 -10.5 75.6 -7.8' });
      } else {
        head = [[`${C}.0`, 'M12 -96Q26 -114 48 -130L64 -116Q56 -96 46 -80Q30 -76 20 -82z'], [`${C}.1`, 'M46 -80Q56 -96 64 -116L58 -112Q50 -96 40 -82z', .5],
          [`${C}.0`, 'M46 -128Q56 -138 64 -130L84 -104Q86 -96 78 -94L70 -95Q62 -102 56 -112z'], [`${C}.2`, 'M50 -128Q56 -134 62 -130L58 -126z', .6], [`${C}.1`, 'M66 -104Q76 -100 84 -102L82 -96Q76 -94 68 -96z', .5],
          [`@nose.${v}`, 'M76 -104Q86 -102 84 -96Q80 -93 74 -96z', .8], ['#141010', ell(80, -100, 1.4, 1)], ...eye(62, -121, 1.8), [`${C}.1`, 'M51 -131l1 -11l6 9z'], [`${C}.1`, 'M56 -132l3 -10l4 9z'],
          [`@mane.${v}`, 'M10 -96Q26 -116 48 -134L52 -128Q36 -114 24 -96Q18 -90 10 -96z'], { s: `@maneL.${v}`, w: 1, op: .6, d: 'M16 -98Q30 -114 46 -128M22 -98Q32 -108 44 -120' }, [`@mane.${v}`, 'M52 -132Q58 -128 58 -118Q54 -124 50 -126z']];
        if (v === 0) head.push(['@blaze', 'M60 -126l3 -4l2 4l-2 3z']);
        if (shaggy) head.push({ s: `${C}.1`, w: 1.2, op: .6, d: 'M60 -102l-2 4M64 -100l-1 4M56 -106l-3 3' });
        if (rim) head.push({ s: '@rim', w: 1.8, op: .85, d: 'M14 -99Q28 -115 47 -131' }, { s: '@rim', w: 1.4, op: .85, d: 'M64.4 -128.4L83 -104.6Q85 -96.6 78.4 -95' });
      }
      return { legsFar, tail, body, legsNear, head };
    },
  });
})();

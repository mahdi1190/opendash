/* ============================================================
   SCENE LIBRARY: railway, the London station kit (docs/dev/SCENE_ENGINE.md,
   section 2; the legal note, section 8.4).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Platform canopies of three periods, and four GENERIC train types seen
   side on: a deep-level tube train (small round-roofed cars), a sub-surface
   train (larger square cars with walk-through gangways), a light-railway
   two-section unit and a suburban electric multiple unit. About 10 units per
   metre, like rail.train. Every train FACES RIGHT; anchor: the rail head at
   the middle. No operator liveries, logos, numbers or lettering.

   THE LINE COLOUR is the variant: v = 0 .. 11 picks the stripe, doors and
   cab colour from LINE_COLOURS (red, dark blue, green, yellow, brown, pink,
   purple, light blue, grey, black, teal, orange): place a train with
   `variant: <index>` to match the line in the data. The colours are bars and
   panels only, never a mark.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  /** A rectangle with rounded corners (windows, cab glass). */
  const rrect = (x, y, w, h, k) => `M${f1(x + k)} ${f1(y)}h${f1(w - 2 * k)}q${k} 0 ${k} ${k}v${f1(h - 2 * k)}q0 ${k} ${-k} ${k}h${f1(-w + 2 * k)}q${-k} 0 ${-k} ${-k}v${f1(-h + 2 * k)}q0 ${-k} ${k} ${-k}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const lobed = (r, cx, cy, rx, ry, n, rag = .3) => {
    const ph = r() * 6.3, pts = [];
    for (let i = 0; i < n; i++) { const a = (i + rr(r, -.25, .25)) / n * Math.PI * 2, k = 1 + rag * .6 * Math.sin(3 * a + ph) + rr(r, -.08, .08), s = Math.sin(a); pts.push([cx + Math.cos(a) * rx * k, cy + (s > 0 ? s * .65 : s) * ry * k]); }
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[i - 1], lr = Math.max(1, f1(Math.hypot(p[0] - q[0], p[1] - q[1]) * .62)); d += `A${lr} ${lr} 0 0 1 ${f1(p[0])} ${f1(p[1])}`; }
    return d + 'z';
  };
  const wash = (cx, cy, rx, ry, op, slot) => ({ f: { rad: [[0, slot, op], [.5, slot, op * .45], [1, slot, 0]], cx, cy, r: Math.max(rx, ry) }, d: ell(cx, cy, rx, ry) });
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const LINE_COLOURS = ['#d03a2f', '#1f4f9e', '#00843d', '#f2c225', '#8b5a2b', '#ec93b0', '#7b2a7f', '#36a4dc', '#9ba3a8', '#2b2b2f', '#3fb0a4', '#ef7d22'];
  const LINE_DARK = LINE_COLOURS.map(c => { const n = parseInt(c.slice(1), 16); return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(v * .7).toString(16).padStart(2, '0')).join(''); });
  const TRAIN_BASE = { line: LINE_COLOURS, lineD: LINE_DARK, glass: ['#2a3440', '#5a6a7a'], under: ['#1e2328', '#34393e'], wheel: '#16191c', lamp: ['#f6f4ea', '#c83a2a'], warn: '#f2c431' };
  const trainTags = (extra) => ['uk', 'london', 'railway', 'train', 'generic-livery', ...extra, 'kit:london', 'kit:vehicles', 'role:vehicle'];
  /** Bogies and wheels under a car: two bogies, two wheels each (filled discs, never rings). */
  const bogies = (out, x0, w, y = 0, r = 3) => {
    for (const bx of [x0 + w * .16, x0 + w * .84]) out.push(['@under.0', rect(bx - 13, y - r * 2 - 2, 26, 3)], ['@wheel', ell(bx - 7, y - r, r, r) + ell(bx + 7, y - r, r, r)], ['@under.1', ell(bx - 7, y - r, r * .35, r * .35) + ell(bx + 7, y - r, r * .35, r * .35)]);
  };

  /* ---------- rail.canopy: a platform canopy section (36 m); v0 Victorian valance on cast-iron columns, v1 1930s concrete slab, v2 a modern steel-and-glass roof on tree columns ---------- */
  defineObj({
    id: 'rail.canopy', category: 'rail', size: [380, 78], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      iron: ['#2e4a3a', '#3e5e4a', '#1e3228'], cream: ['#ece2c8', '#c8bc9e'], roof: ['#5a5e66', '#44484e', '#8a9098'], glass: ['#7a96a8', '#c8dce6'], conc: ['#d6d0c2', '#b0a898', '#ece6d8'],
      steel: ['#c8ced4', '#8a949c', '#5a646c'], lamp: '#f8f4e4', halo: '#ffe6b0', snow: ['#f4f6f8', '#d8e0e8'], tub: ['#3a3e44', '#d8d2c4'], twig: '#5a4a3a',
    } }, bySeason({
      leaf: { spring: ['#4f8a3a', '#7ab04a'], summer: ['#2f6a2c', '#4f8a38'], autumn: ['#8a6a2a', '#b8823a'], winter: ['#3e4a38', '#56604a'] },
      bloom: { spring: ['#f4d23a', '#f8f4ec'], summer: ['#d8405a', '#f4a0c0'], autumn: ['#d8782a', '#c04a2a'], winter: ['#6a5a4a', '#7a6a5a'] },
    })),
    night: { glow: { lamp: '#fff2cc' }, on: 1 },
    shadow: { rx: 180, ry: 10, h: 40 },
    tags: ['uk', 'london', 'railway', 'platform', 'canopy', 'station', 'kit:london', 'kit:urban', 'role:street'],
    credit: 'after London platform canopies of three periods; generic',
    build(v, r, ctx) {
      const body = [], lit = [], W = 180, winter = ctx.season === 'winter', bloom = !winter;
      const cols = [-144, -72, 0, 72, 144];
      // a planter standing on a stone plinth by the column (never loose on the platform)
      const tub = (x) => { body.push(['@tub.1', rect(x - 12, -5, 24, 5)], ['@tub.0', rect(x - 12, -1.2, 24, 1.2), .3], ['@tub.0', rect(x - 9, -14, 18, 9)], ['@tub.1', rect(x - 10, -15, 20, 1.6)], ['@leaf.0', lobed(r, x, -18, 10, 6, 8, .35)]); if (bloom) { let b = ''; for (let i = 0; i < 5; i++) b += ell(x + rr(r, -8, 8), rr(r, -23, -15), 1.4, 1.4); body.push(['@bloom.0', b]); } else body.push(['@snow.0', `M${x - 10} -20q10 -7 20 0z`]); };
      if (v === 0) {
        // cast-iron columns with capitals and curved spandrel brackets; a longitudinal girder; the pitched roof behind a deep valance of dagger boards
        let c = ''; for (const x of cols) c += `M${x} 0V-40`; body.push({ s: '@iron.0', w: 3.2, d: c });
        for (const x of cols) body.push(['@iron.0', rect(x - 4, -3, 8, 3)], ['@iron.0', rect(x - 3.4, -42, 6.8, 3)], { s: '@iron.0', w: 1.6, d: `M${x - 18} -44q16 0 18 16q2 -16 18 -16` }, { s: '@iron.1', w: .8, d: `M${x - 12} -44q10 2 12 10q2 -8 12 -10` });
        body.push(['@roof.0', `M${-W} -52L${-W + 6} -66H${W - 6}L${W} -52z`], ['@roof.2', `M${-W + 6} -66H${W - 6}v2H${-W + 6}z`], { s: '@roof.1', w: .6, op: .5, d: Array.from({ length: 24 }, (_, i) => `M${-W + 8 + i * 15} -65l-2 12`).join(''), detail: true });
        body.push(['@iron.1', rect(-W, -46, 2 * W, 3)]);
        let dag = `M${-W} -52`; for (let x = -W; x < W; x += 6) dag += `L${x + 3} -43L${x + 6} -52`; body.push(['@cream.0', dag + 'z'], { s: '@cream.1', w: .5, op: .7, d: Array.from({ length: 60 }, (_, i) => `M${-W + i * 6} -52v8`).join(''), detail: true }, ['@iron.0', rect(-W, -53, 2 * W, 1.6)]);
        for (const x of [-108, -36, 36, 108]) { body.push({ s: '@iron.0', w: .6, d: `M${x} -44v8` }, ['@iron.0', `M${x - 4} -36h8l-1 2h-6z`], { f: '@lamp', d: `M${x - 3} -34h6l-1 5h-4z`, glow: 'lamp' }); lit.push(wash(x, -31, 22, 22, .5, '@halo'), wash(x, 0, 30, 6, .3, '@halo')); }
        for (const x of [-72, 72]) { body.push({ s: '@iron.0', w: .5, d: `M${x} -44v6M${x} -38l-4 5M${x} -38l4 5` }, ['@tub.0', `M${x - 5} -33h10q0 5 -5 5q-5 0 -5 -5z`], ['@leaf.1', lobed(r, x, -33, 7, 3.5, 7, .4)]); if (bloom) { let b = ''; for (let i = 0; i < 5; i++) b += ell(x + rr(r, -6, 6), rr(r, -36, -26), 1.2, 1.2); body.push(['@bloom.1', b], { s: '@leaf.0', w: .7, d: `M${x - 5} -31q-2 5 -1 9M${x + 5} -31q2 4 0 8` }); } }
        if (winter) body.push(['@snow.0', `M${-W + 4} -66L${-W + 8} -69H${W - 8}L${W - 4} -66z`]);
      } else if (v === 1) {
        // a thin cantilever slab on a single row of tapering concrete columns, an upstand fascia, a strip of lights
        for (const x of cols) body.push(['@conc.0', `M${x - 3} 0L${x - 2.4} -36L${x - 22} -40H${x + 22}L${x + 2.4} -36L${x + 3} 0z`], ['@conc.1', `M${x + .6} 0L${x + 1} -36L${x + 22} -40H${x + 12}L${x + 2.4} -36L${x + 3} 0z`, .55]);
        body.push(['@conc.0', rect(-W, -46, 2 * W, 6)], ['@conc.2', rect(-W, -46, 2 * W, 1.4)], ['@conc.1', rect(-W, -41, 2 * W, 1.2)], ['@roof.1', rect(-W + 2, -50, 2 * W - 4, 4)]);
        for (let x = -W + 24; x < W; x += 48) { body.push({ f: '@lamp', d: rect(x - 9, -39.6, 18, 1.8), glow: 'lamp' }); lit.push(wash(x, -36, 26, 12, .45, '@halo'), wash(x, 0, 28, 5, .25, '@halo')); }
        tub(-108); tub(108);
        if (winter) body.push(['@snow.0', `M${-W} -50q${W} -4 ${2 * W} 0z`]);
      } else {
        // steel tree columns branching into a gently pitched glass roof on a deep edge beam
        for (const x of [-120, 0, 120]) body.push({ s: '@steel.1', w: 4, d: `M${x} 0V-30` }, { s: '@steel.1', w: 2.2, d: `M${x} -30L${x - 30} -48M${x} -30L${x + 30} -48M${x} -30L${x - 10} -50M${x} -30L${x + 10} -50` }, ['@steel.2', rect(x - 4, -3, 8, 3)]);
        body.push(['@glass.0', `M${-W - 6} -48L${-W} -60H${W}L${W + 6} -48z`, .75], ['@glass.1', `M${-W} -58H${W}v2H${-W}z`, .7], ['@steel.0', rect(-W - 8, -50, 2 * W + 16, 5)], ['@steel.2', rect(-W - 8, -46, 2 * W + 16, 1)]);
        body.push({ s: '@steel.1', w: .7, d: Array.from({ length: 13 }, (_, i) => `M${-W + i * 30} -50l2 -10`).join('') });
        for (let x = -W + 30; x < W; x += 60) { body.push({ f: '@lamp', d: rect(x - 12, -45, 24, 1.6), glow: 'lamp' }); lit.push(wash(x, -40, 30, 12, .4, '@halo'), wash(x, 0, 30, 5, .25, '@halo')); }
        tub(-60); tub(60);
        if (winter) body.push(['@snow.0', `M${-W} -60q${W} -4 ${2 * W} 0z`]);
      }
      if (ctx.season === 'autumn') { let lv = ''; for (let i = 0; i < 18; i++) lv += ell(rr(r, -W, W), rr(r, -1.5, .5), 1.6, .8); body.push(['@bloom.0', lv, .9]); }
      return { body, lit };
    },
  });

  /* ---------- rail.train-tube: a three-car deep-level tube train; small cars with a round roof, doors cut into the roof curve ---------- */
  defineObj({
    id: 'rail.train-tube', category: 'rail', size: [500, 34], variants: 12, seasonal: false, flippable: true,
    palette: { base: Object.assign({ body: ['#e4e6e8', '#c2c6ca', '#f6f7f8'], skirt: '#2a3442' }, TRAIN_BASE) },
    night: { glow: { window: '#fff0c4' }, on: .97 },
    anim: { bob: { part: 'body', dy: .5, period: .8 } },
    shadow: { rx: 250, ry: 5, h: 30 },
    tags: trainTags(['tube', 'deep-level', 'metro']),
    credit: 'after London deep-level tube stock (generic livery: the line colour on the doors and cab)',
    params: { variant: 'line colour index into LINE_COLOURS (0 red, 1 dark blue, 2 green, 3 yellow, 4 brown, 5 pink, 6 purple, 7 light blue, 8 grey, 9 black, 10 teal, 11 orange)' },
    build(v) {
      // the low ROUND tube profile: vertical sides to a cantrail, then a big-radius roof curve (shaded as a band) into a flat roof;
      // doors rise into the curve, the windows are small. Variety beyond the line colour: v % 2 gives three or four cars, v % 3 === 2 two doors a car
      const L = `@line.${v}`, LD = `@lineD.${v}`, body = [], gap = 4, n = 3 + (v % 2), cw = (488 - (n - 1) * gap) / n, x0 = -244, top = -30, bot = -6, ct = top + 9;
      const doorAt = v % 3 === 2 ? [.2, .62] : [.125, .4, .675], dw = 20;
      for (let i = 0; i < n; i++) {
        const cx = x0 + i * (cw + gap), front = i === n - 1, back = i === 0, xe = cx + cw;
        const shell = front ? `M${f1(cx)} ${bot}V${ct}Q${f1(cx)} ${top} ${f1(cx + 9)} ${top}H${f1(xe - 18)}Q${f1(xe - 1)} ${top} ${f1(xe - 1)} ${top + 16}V${bot}z`
          : back ? `M${f1(cx + 1)} ${bot}V${top + 16}Q${f1(cx + 1)} ${top} ${f1(cx + 18)} ${top}H${f1(xe - 9)}Q${f1(xe)} ${top} ${f1(xe)} ${ct}V${bot}z`
          : `M${f1(cx)} ${bot}V${ct}Q${f1(cx)} ${top} ${f1(cx + 9)} ${top}H${f1(xe - 9)}Q${f1(xe)} ${top} ${f1(xe)} ${ct}V${bot}z`;
        const a = cx + (back ? 12 : 4), b = xe - (front ? 12 : 4);   // the roof band's run
        body.push(['@body.0', shell], ['@body.1', `M${f1(a - 2)} ${ct}Q${f1(a - 2)} ${top + 2} ${f1(a + 6)} ${top + 2}H${f1(b - 6)}Q${f1(b + 2)} ${top + 2} ${f1(b + 2)} ${ct}z`, .5], ['@body.2', rect(a + 4, top + 1, b - a - 8, 1.4), .8], ['@body.1', rect(a - 2, ct, b - a + 4, .8)]);
        body.push(['@body.1', rect(cx + (back ? 2 : 0), bot - 7, cw - (front ? 2 : 0), 7)], ['@skirt', rect(cx + (back ? 2 : 0), bot - 2, cw - (front ? 1 : 0), 2)], [LD, rect(cx + (back ? 4 : 0), bot - 8.4, cw - (front ? 8 : back ? 4 : 0), 1.2), .9]);
        // doors (line colour) cut up into the roof curve, a small window in each leaf
        const doors = doorAt.map(t => f1(cx + t * cw));
        for (const dx of doors) body.push([L, `M${dx} ${bot}V${top + 4}q0 -2 2 -2h${dw - 4}q2 0 2 2V${bot}z`], { f: '@glass.0', d: rrect(dx + 2.5, ct, 6, 9, 1.5), glow: 'window' }, { f: '@glass.0', d: rrect(dx + 11.5, ct, 6, 9, 1.5), glow: 'window' }, [LD, rect(dx + 9.6, top + 3, .8, -top + bot - 3)]);
        // small windows in the bays between the doors and the car ends
        const edges = [cx + (back ? 18 : 4), ...doors.flatMap(d => [d, d + dw]), xe - (front ? 18 : 4)];
        for (let k = 0; k < edges.length; k += 2) {
          const g0 = edges[k] + 3, g1 = edges[k + 1] - 3, m = Math.max(g1 - g0 >= 6 ? 1 : 0, Math.floor((g1 - g0 + 3) / 14)), ww = Math.min(11, g1 - g0);
          for (let j = 0; j < m; j++) { const wx = g0 + (g1 - g0 - (m * (ww + 3) - 3)) / 2 + j * (ww + 3); body.push({ f: '@glass.0', d: rrect(wx, ct + 1, ww, 8, 2), glow: 'window' }, ['@glass.1', `M${f1(wx + 1)} ${ct + 2}h4l-4 4z`, .5]); }
        }
        bogies(body, cx, cw, 0, 2.6);
        if (!front) body.push(['@under.0', rect(xe, ct, gap, bot - ct)]);
      }
      // the cabs: the line-colour ends, the deep windscreens, lamps
      const fx = x0 + 488;
      body.push([L, `M${fx - 10} ${bot}V${top + 8}q7 1 9 8V${bot}z`], { f: '@glass.0', d: `M${fx - 15} ${top + 3}q9 0 12 9h-12z`, glow: 'window' }, ['@lamp.0', rect(fx - 4, bot - 6, 3, 2)], ['@lamp.1', rect(fx - 4, bot - 3.4, 3, 1.4)]);
      body.push([L, `M${x0 + 11} ${bot}V${top + 8}q-7 1 -9 8V${bot}z`], { f: '@glass.0', d: `M${x0 + 16} ${top + 3}q-9 0 -12 9h12z`, glow: 'window' }, ['@lamp.1', rect(x0 + 1.4, bot - 5, 2.4, 1.6)]);
      return { body };
    },
  });

  /* ---------- rail.train-subsurface: a walk-through sub-surface train, three of its cars; tall square cars, wide windows ---------- */
  defineObj({
    id: 'rail.train-subsurface', category: 'rail', size: [540, 44], variants: 12, seasonal: false, flippable: true,
    palette: { base: Object.assign({ body: ['#e8eaec', '#c4c8cc', '#f8f9fa'], skirt: '#1f3a6a' }, TRAIN_BASE) },
    night: { glow: { window: '#fff0c4' }, on: .97 },
    anim: { bob: { part: 'body', dy: .6, period: .9 } },
    shadow: { rx: 270, ry: 6, h: 40 },
    tags: trainTags(['sub-surface', 'metro', 'walk-through']),
    credit: 'after London sub-surface stock (generic livery: the line colour on the doors and cab)',
    params: { variant: 'line colour index into LINE_COLOURS' },
    build(v) {
      const L = `@line.${v}`, LD = `@lineD.${v}`, body = [], cw = 172, gap = 2, n = 3, x0 = -(n * cw + (n - 1) * gap) / 2, top = -42, bot = -7;
      for (let i = 0; i < n; i++) {
        const cx = x0 + i * (cw + gap), front = i === n - 1, back = i === 0;
        const shell = front ? `M${cx} ${bot}V${top + 2}q0 -2 2 -2H${cx + cw - 14}q8 0 11 8l3 ${-top + bot - 8}V${bot}z`
          : back ? `M${cx} ${bot}V${top + 10}q2 -10 12 -10H${cx + cw}V${bot}z` : `M${cx} ${bot}V${top + 2}q0 -2 2 -2H${cx + cw - 2}q2 0 2 2V${bot}z`;
        body.push(['@body.0', shell], ['@body.1', rect(cx + (back ? 1 : 0), bot - 10, cw - (front ? 1 : 0), 10)], ['@body.2', rect(cx + 4, top + 1.2, cw - 12, 1.6), .8], ['@skirt', rect(cx + (back ? 1 : 0), bot - 3, cw - (front ? 0 : 0), 3)]);
        // four pairs of doors in the line colour, wide windows between them
        for (let d = 0; d < 4; d++) {
          const dx = cx + 14 + d * 40;
          body.push([L, rect(dx, top + 4, 18, -top + bot - 4)], { f: '@glass.0', d: rrect(dx + 2, top + 7, 6, 14, 1.4), glow: 'window' }, { f: '@glass.0', d: rrect(dx + 10, top + 7, 6, 14, 1.4), glow: 'window' }, [LD, rect(dx + 8.6, top + 4, .8, -top + bot - 4)]);
          if (d < 3) body.push({ f: '@glass.0', d: rrect(dx + 21, top + 8, 16, 13, 2), glow: 'window' }, ['@glass.1', `M${dx + 22} ${top + 9}h7l-7 7z`, .45]);
        }
        body.push([LD, rect(cx + (back ? 2 : 0), top + 24, cw - (front ? 4 : 2), 1.4)]);
        bogies(body, cx, cw, 0, 3);
        if (!front) body.push(['@under.0', rect(cx + cw, top + 4, gap, -top + bot - 4)]);
      }
      const fx = x0 + n * (cw + gap) - gap;
      body.push([L, `M${fx - 12} ${bot}V${top + 9}q8 0 9 6l3 ${-top + bot - 15}z`], { f: '@glass.0', d: `M${fx - 16} ${top + 2}q9 0 12 10h-12z`, glow: 'window' }, ['@lamp.0', rect(fx - 4, bot - 8, 3, 2.4)], ['@lamp.1', rect(fx - 4, bot - 5, 3, 1.6)]);
      body.push([L, `M${x0} ${bot}V${top + 10}q1 -5 5 -8v${-top + bot - 2}z`]);
      body.push({ f: '@glass.0', d: `M${x0 + 14} ${top + 2}q-8 1 -10 10h10z`, glow: 'window' }, ['@lamp.1', rect(x0 + 1.4, bot - 5, 2.4, 1.6)]);
      return { body };
    },
  });

  /* ---------- rail.train-dlr: a two-section articulated light-railway unit, driverless ends with big raked windscreens ---------- */
  defineObj({
    id: 'rail.train-dlr', category: 'rail', size: [300, 40], variants: 12, seasonal: false, flippable: true,
    palette: { base: Object.assign({ body: ['#eceeef', '#c6cacd', '#fafbfb'], skirt: '#2e3236' }, TRAIN_BASE) },
    night: { glow: { window: '#fff0c4' }, on: .97 },
    anim: { bob: { part: 'body', dy: .5, period: .8 } },
    shadow: { rx: 150, ry: 5, h: 36 },
    tags: trainTags(['light-rail', 'elevated', 'driverless']),
    credit: 'after London light-railway units (generic livery: the line colour on the band and doors)',
    params: { variant: 'line colour index into LINE_COLOURS (the teal of 10 suits the light railway)' },
    build(v) {
      const L = `@line.${v}`, LD = `@lineD.${v}`, body = [], cw = 140, x0 = -cw - 2, top = -38, bot = -7;
      for (let i = 0; i < 2; i++) {
        const cx = x0 + i * (cw + 4), front = i === 1;
        const shell = front ? `M${cx} ${bot}V${top}H${cx + cw - 22}q12 0 18 14l4 ${-top + bot - 14}V${bot}z` : `M${cx} ${bot}V${top + 14}l4 -10q4 -4 18 -4H${cx + cw}V${bot}z`;
        body.push(['@body.0', shell], ['@body.1', rect(cx + (front ? 0 : 1), bot - 9, cw - (front ? 0 : 1), 9)], ['@skirt', rect(cx + (front ? 0 : 1), bot - 2.4, cw - (front ? 0 : 1), 2.4)]);
        body.push([L, rect(cx + (front ? 0 : 2), bot - 8, cw - (front ? 4 : 2), 4)]);
        for (const dx of [cx + 30, cx + 92]) body.push([L, rect(dx, top + 3, 20, -top + bot - 3)], { f: '@glass.0', d: rrect(dx + 2, top + 6, 7, 16, 1.4), glow: 'window' }, { f: '@glass.0', d: rrect(dx + 11, top + 6, 7, 16, 1.4), glow: 'window' }, [LD, rect(dx + 9.6, top + 3, .8, -top + bot - 3)]);
        for (const wx of [cx + 54, cx + 72]) body.push({ f: '@glass.0', d: rrect(wx, top + 6, 15, 14, 2), glow: 'window' }, ['@glass.1', `M${wx + 1} ${top + 7}h6l-6 6z`, .45]);
        body.push({ f: '@glass.0', d: front ? rrect(cx + 8, top + 6, 16, 14, 2) : rrect(cx + 118, top + 6, 16, 14, 2), glow: 'window' });
        // the raked end windscreen
        if (front) body.push({ f: '@glass.0', d: `M${cx + cw - 26} ${top + 3}H${cx + cw - 20}q9 0 14 11l1 6h-21z`, glow: 'window' }, ['@lamp.0', rect(cx + cw - 3, bot - 7, 2.4, 2)]);
        else body.push({ f: '@glass.0', d: `M${cx + 22} ${top + 3}H${cx + 18}q-8 0 -12 11l-1 6h17z`, glow: 'window' }, ['@lamp.1', rect(cx + 1, bot - 7, 2.4, 2)]);
        // one bogie at each outer end, the shared bogie under the articulation
        bogies(body, cx, cw, 0, 2.8);
      }
      body.push(['@under.0', `M${x0 + cw} ${top + 6}h4v${-top + bot - 6}h-4z`], { s: '@under.1', w: .6, d: Array.from({ length: 6 }, (_, i) => `M${x0 + cw} ${top + 9 + i * 4}h4`).join('') });
      body.push(['@under.0', rect(-20, bot - 1, 40, 3)]);
      return { body };
    },
  });

  /* ---------- rail.train-mainline: a three-car suburban electric unit with a yellow warning front; body tone by v % 3, the line colour as the band and doors ---------- */
  defineObj({
    id: 'rail.train-mainline', category: 'rail', size: [620, 46], variants: 12, seasonal: false, flippable: true,
    palette: { base: Object.assign({ body: ['#eceeef', '#9aa2aa', '#3e444c'], bodyD: ['#c8ccd0', '#7a828a', '#2c3238'], roof: ['#8a9098', '#6a7078', '#5a6068'], skirt: '#22272c' }, TRAIN_BASE) },
    night: { glow: { window: '#ffe6a8' }, on: .95 },
    anim: { bob: { part: 'body', dy: .6, period: .9 } },
    shadow: { rx: 310, ry: 6, h: 44 },
    tags: trainTags(['national-rail', 'suburban', 'overground', 'emu']),
    credit: 'after London suburban electric units (generic livery: a body tone and the line colour)',
    params: { variant: 'line colour index into LINE_COLOURS; the body tone is v % 3 (light, mid grey, dark)' },
    build(v) {
      const L = `@line.${v}`, LD = `@lineD.${v}`, t = v % 3, B = `@body.${t}`, BD = `@bodyD.${t}`, body = [], cw = 200, gap = 3, n = 3, x0 = -(n * cw + (n - 1) * gap) / 2, top = -44, bot = -8;
      for (let i = 0; i < n; i++) {
        const cx = x0 + i * (cw + gap), front = i === n - 1, back = i === 0;
        const shell = front ? `M${cx} ${bot}V${top + 3}q0 -3 3 -3H${cx + cw - 20}q12 0 16 12l4 ${-top + bot - 12}V${bot}z`
          : back ? `M${cx} ${bot}V${top + 12}q4 -12 16 -12H${cx + cw}V${bot}z` : rect(cx, top, cw, -top + bot);
        body.push([B, shell], [BD, rect(cx + (back ? 1 : 0), bot - 9, cw - (front ? 2 : 0), 9)], [`@roof.${t}`, rect(cx + (back ? 12 : 3), top - 2, cw - (front ? 24 : back ? 15 : 6), 2.4)], ['@skirt', rect(cx + (back ? 1 : 0), bot - 2.4, cw - (front ? 1 : 0), 2.4)]);
        body.push([L, rect(cx + (back ? 2 : 0), bot - 12, cw - (front ? 6 : 2), 3)]);
        for (const dx of [cx + 40, cx + 142]) body.push([L, rect(dx, top + 4, 20, -top + bot - 4)], { f: '@glass.0', d: rrect(dx + 2.5, top + 8, 6.5, 14, 1.4), glow: 'window' }, { f: '@glass.0', d: rrect(dx + 11, top + 8, 6.5, 14, 1.4), glow: 'window' }, [LD, rect(dx + 9.6, top + 4, .8, -top + bot - 4)]);
        for (const wx of [cx + 8, cx + 66, cx + 94, cx + 118, cx + 168]) { if (front && wx > cx + 160) continue; body.push({ f: '@glass.0', d: rrect(wx, top + 9, 20, 13, 2), glow: 'window' }, ['@glass.1', `M${wx + 1} ${top + 10}h8l-8 6z`, .45]); }
        bogies(body, cx, cw, 0, 3.2);
        if (!front) body.push(['@under.0', rect(cx + cw, top + 4, gap, -top + bot - 4)]);
      }
      const fx = x0 + n * (cw + gap) - gap;
      body.push(['@warn', `M${fx - 12} ${bot}V${top + 12}q8 2 10 8l2 ${-top + bot - 20}z`], { f: '@glass.0', d: `M${fx - 20} ${top + 2}q12 0 16 11h-16z`, glow: 'window' }, ['@lamp.0', rect(fx - 5, bot - 8, 3, 2.4)], ['@lamp.1', rect(fx - 5, bot - 5, 3, 1.6)], ['@warn', `M${x0} ${bot}V${top + 14}q2 -6 6 -9v${-top + bot - 5}z`], { f: '@glass.0', d: `M${x0 + 18} ${top + 2}q-10 1 -13 11h13z`, glow: 'window' }, ['@lamp.1', rect(x0 + 1.4, bot - 5, 2.4, 1.6)]);
      return { body };
    },
  });
})();

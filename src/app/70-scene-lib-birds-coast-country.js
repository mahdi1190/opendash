/* ============================================================
   SCENE LIBRARY: birds, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Herring gulls: standing (with a winter-streaked head in autumn and winter)
   and flying. FACING RIGHT. Anchor: the feet (standing), the body centre
   (flying).
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

  const eye = (x, y, rad, ring) => [[ring || '#141010', circ(x, y, rad)], ['#141010', circ(x, y, rad * .55)], ['#ffffff', circ(x - rad * .3, y - rad * .3, rad * .25), .85]];
  const GULL = {
    plum: ['#fbfbf8', '#dcdedc', '#ffffff', '#b8bcbc'], mantle: ['#a9b4bc', '#8a96a0', '#c4ccd2'], tip: ['#1c1c1e', '#fbfbf8'], bill: ['#f2c832', '#d84a2a', '#c8a022'], leg: ['#e8a8a0', '#c88880'],
    juv: ['#a8968a', '#7e6c60', '#c8b8a8', '#5a4a40'], jbill: ['#2a2422', '#8a7a70'], ring: '#e8c840',
  };

  /* ---------- bird.herring-gull: a herring gull standing on a post, a wall or the beach; v0 standing, v1 calling (head up, bill open), v2 a mottled brown juvenile. Adults have streaked heads in autumn and winter ---------- */
  defineObj({
    id: 'bird.herring-gull', category: 'bird', size: [70, 60], variants: 3, seasonal: true, flippable: true, parts: ['legs', 'body', 'head'],
    palette: Object.assign({ base: GULL }, bySeason({ streak: { spring: '#f4f4f2', summer: '#fbfbf8', autumn: '#9a9490', winter: '#8a847e' }, headW: { spring: '#fbfbf8', summer: '#fdfdfb', autumn: '#e6e2dc', winter: '#e0dcd6' } })),
    anim: { turn: { part: 'head', pivot: [14, -38], deg: 12, period: 7, hold: .6 } },
    shadow: { rx: 18, ry: 3, h: 50 },
    reflect: true,
    tags: ['uk', 'coast', 'seaside', 'harbour', 'beach', 'gull', 'herring-gull', 'seagull', 'kit:birds', 'kit:water', 'role:bird'],
    credit: 'coast-country kit (herring gull)',
    build(v) {
      const juv = v === 2, P = juv ? '@juv' : '@plum';
      const legs = [['@leg.1', 'M-3 -15l-1 14h2l1 -14zM5 -15l1 14h2l-1 -14z'], ['@leg.0', 'M-8 0l4 -2 4 2zM2 0l5 -2 5 2z']];
      const body = [
        // the tail and the folded primaries (black with white mirrors), then the body and the grey mantle
        [juv ? '@juv.3' : '@tip.0', 'M-18 -30L-38 -27L-36 -24L-16 -22z'], [juv ? '@juv.2' : '@tip.1', ell(-33, -26.6, 1.6, 1.1) + ell(-27, -25.4, 1.4, 1), .9],
        [`${P}.0`, 'M-22 -28Q-24 -40 -8 -42H10Q22 -40 22 -30Q20 -16 4 -14H-8Q-20 -16 -22 -28z'],
        [juv ? '@juv.1' : '@mantle.0', 'M-24 -30Q-18 -42 0 -42H8Q14 -40 14 -34Q4 -28 -16 -24L-36 -25z'],
        [juv ? '@juv.2' : '@mantle.2', 'M-14 -38Q0 -42 10 -38Q0 -38 -14 -34z', .7], [juv ? '@juv.3' : '@mantle.1', 'M-20 -27Q-4 -30 12 -34L13 -32Q0 -26 -18 -24z', .7],
        [juv ? '@juv.2' : '@tip.1', 'M-10 -31q4 -1 8 0M0 -33q4 -1 8 0', .0],
        { s: juv ? '@juv.2' : '@tip.1', w: 1.2, op: .9, d: 'M-20 -27.5L-6 -30.5' },
        [`${P}.3`, 'M-14 -18Q0 -13 14 -18Q10 -14 4 -14H-8z', .5],
      ];
      if (juv) { let d = ''; for (let i = 0; i < 26; i++) { const x = -20 + (i * 37 % 40), y = -40 + (i * 13 % 24); d += `M${x} ${y}q2 -1.5 4 0`; } body.push({ s: '@juv.3', w: 1, op: .6, d }, { s: '@juv.2', w: .9, op: .5, d: 'M-16 -36h8M-6 -38h10M-12 -32h12M-2 -34h10' }); }
      // the head (shifted up and tilted back when calling)
      const head = [[juv ? '@juv.0' : '@headW', 'M8 -36Q6 -50 16 -52Q26 -52 26 -44Q24 -38 18 -36z'], [`${P}.2`, 'M10 -46Q14 -52 20 -51Q14 -49 11 -44z', .7]];
      if (!juv) head.push({ s: '@streak', w: .9, op: .8, d: 'M12 -48l3 -1M11 -45l4 -1M14 -50l3 -.5M18 -50l2 0M12 -42l3 -1M16 -41l3 -1' });
      // calling: both mandibles rooted in the face, hinged at the gape, the dark mouth between them
      if (v === 1) head.push(['#5a2624', 'M22.5 -44L35 -48.4L34.4 -41.6z'], ['@bill.0', 'M22 -47.6Q24 -48.2 26.4 -47.8L35.4 -49.8Q37.6 -50 37.2 -48.2Q36.6 -46.8 35 -47.4L26 -45Q24 -44.2 22.5 -44z'], ['@bill.0', 'M22.5 -44L26.4 -42.8L33.6 -42Q35.6 -41.6 35.2 -40L32.6 -39.8Q29 -39.4 25.6 -40Q23.6 -40.4 22.4 -41.4z'], ['@bill.1', ell(33, -41, 1.3, 1)]);
      else head.push([juv ? '@jbill.0' : '@bill.0', 'M24 -45L36 -44Q38 -43 36 -41L24 -41z'], [juv ? '@jbill.1' : '@bill.2', 'M24 -42.5H35L34 -41H24z', .6], [juv ? '@jbill.1' : '@bill.1', ell(32.5, -41.5, 1.3, 1)]);
      head.push(...eye(19.5, -46, 1.6, juv ? '#3a302a' : GULL.ring));
      const hm = v === 1 ? rot(-22, 14, -38) : undefined;
      return { legs, body: body.filter(sh => !(Array.isArray(sh) && sh[2] === 0)), head: hm ? withM(head, hm) : head };
    },
  });

  /* ---------- bird.herring-gull-flight: a gull gliding and flapping on bent wings; v0 adult, v1 juvenile ---------- */
  defineObj({
    id: 'bird.herring-gull-flight', category: 'bird', size: [100, 36], variants: 2, seasonal: false, flippable: true, parts: ['wingFar', 'body', 'wings'],
    palette: { base: GULL },
    anim: { flap: { part: 'wings', pivot: [0, -2], sy: [-.6, 1], period: .9 } },
    tags: ['uk', 'coast', 'seaside', 'harbour', 'gull', 'herring-gull', 'seagull', 'flying', 'kit:birds', 'kit:water', 'role:bird'],
    credit: 'coast-country kit (herring gull in flight)',
    build(v) {
      const juv = v === 1, P = juv ? '@juv' : '@plum', M = juv ? '@juv.1' : '@mantle.0', T = juv ? '@juv.3' : '@tip.0';
      // the near wing flaps by squashing in y, so it is broad (14 at the root): squashed, it reads as a foreshortened
      // wing, never a stick. Black tip, white mirror; the shading, mirror and trailing edge are detail
      const wing = [[M, 'M6 -4Q9 -12 5 -19L-12 -25L-36 -30Q-26 -22 -14 -17Q-6 -12 -8 -3z'], { f: juv ? '@juv.3' : '@mantle.1', d: 'M-8 -3Q-6 -12 -14 -17Q-22 -21 -30 -26.4Q-18 -17.6 -10 -14Q-3 -10 -4 -3z', op: .5, detail: true },
        { f: juv ? '@juv.2' : '@mantle.2', d: 'M5 -18Q8 -11 5 -4L1 -4Q3 -11 2 -16z', op: .6, detail: true },
        [T, 'M-20 -26.7L-36 -30Q-30 -25.4 -23.5 -22.6z'], { f: juv ? '@juv.2' : '@tip.1', d: ell(-29, -27.4, 1.5, .9), op: .9, detail: true }, { s: juv ? '@juv.2' : '@plum.2', w: 1.1, op: .85, d: 'M-8 -3Q-6 -12 -14 -17Q-19 -20 -23 -22', detail: true }];
      // the far wing never flaps: held low, swept back along the body
      const wingFar = [[juv ? '@juv.3' : '@mantle.1', 'M3 -4Q-1 -10 -9 -11.6L-26 -12.6Q-18 -8 -10 -5.6Q-4 -4.4 -2 -2z', .9], [T, 'M-19 -12.2L-26 -12.6Q-23 -10.4 -20 -9.4z', .9]];
      const body = [[`${P}.0`, 'M-20 -1Q-10 -6 6 -5Q16 -5 20 -2Q16 2 6 3Q-8 4 -20 1L-26 0z'], { f: `${P}.3`, d: 'M-16 1Q0 4 14 0Q8 3 2 3Q-8 4 -16 1z', op: .5, detail: true }, [`${P}.0`, ell(18, -3.5, 5, 4)],
        [juv ? '@jbill.0' : '@bill.0', 'M22 -4L29 -3.4L22 -2z'], ['#141010', circ(19.5, -4.5, .9)], [`${P}.0`, 'M-20 -1L-28 0L-20 1z']];
      const wings = wing;
      return { wingFar, body, wings };
    },
  });
})();

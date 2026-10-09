/* ============================================================
   SCENE LIBRARY: yateley-green-views (docs/dev/SCENE_ENGINE.md, section 2).
   The pieces the four Yateley Green views (71-scene-uk-south-east-yateley-green-*.js) and
   the two Yateley proofs use to fill the frame the way the proof Fleet Pond does: big,
   dense MASSES of growth instead of single tufts dotted over mown grass (one sprite of a
   reed bed costs what one reed does, and covers ten times the ground).

     plant.yg-reedbed   a dense bed of common reed and reedmace: blades in four tones, plumes,
                        bulrush heads; green in summer, gold and tawny in autumn, pale straw
                        and broken stems in winter, new shoots under last year's straw in spring
     plant.yg-meadow    an uncut tussock mass of long grass and wild flowers (buttercup, ox-eye
                        and knapweed in summer, cow parsley and campion in spring, seed heads
                        in autumn, dead stems in winter), a ragged foot, never a flat cut base;
                        variant 4: a flowerless moor-grass tussock for heaths
     plant.yg-oak-bough an English oak bough hanging into a top corner (the foreground frame):
                        lobed oak leaves in sprays, acorns in autumn, bare twigs in winter

   Plus sceneYgClumps(o): irregular CLUMPS of pixel placements for the v1 views (a Thomas
   process: seeded centres, gaussian spread, a few strays; never a row, never a grid).
   Light from the LEFT. Anchor: the ground at the foot (the bough: its top-left corner).
   PURE: definitions only; every build runs lazily, once per (variant, season).
   ============================================================ */
/**
 * Irregular clumps of pixel placements. o: { obj (id or { id: weight }), centres: [[x, y, rx, ry, n], ...] or
 * area: [x0, y0, x1, y1] with nc centres, n per centre, rx, ry; s: [a, b] (scale), sByY: [[y, k], ...] (perspective), layer,
 * seed, variant ([a, b] or n), anim, reflect, tint, not(x, y) (a reject test), flip: 0.5 }. Returns placement objects.
 */
function sceneYgClumps(o) {
  const r = sceneRnd(o.seed || 1), out = [];
  const pick = () => { const w = o.obj; if (typeof w === 'string') return w; const e = Object.entries(w), t = e.reduce((s, [, k]) => s + k, 0); let x = r() * t; for (const [id, k] of e) if ((x -= k) <= 0) return id; return e[0][0]; };
  const kY = y => { const t = o.sByY; if (!t) return 1; if (y <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (y <= t[i][0]) return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * (y - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); return t[t.length - 1][1]; };
  let C = o.centres;
  if (!C) { const [x0, y0, x1, y1] = o.area; C = []; for (let i = 0; i < (o.nc || 5); i++) C.push([x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), o.rx || 60, o.ry || 12, Math.max(1, Math.round((o.n || 6) * (0.5 + r())))]); }
  const g = () => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  for (const [cx, cy, rx, ry, n] of C) for (let i = 0; i < n; i++) {
    const stray = r() < 0.12, x = Math.round(cx + g() * rx * (stray ? 1.8 : 0.6)), y = Math.round(cy + g() * ry * (stray ? 1.5 : 0.5));
    if (o.not && o.not(x, y)) continue;
    const [a, b] = o.s || [0.8, 1.2], va = o.variant;
    const p = { obj: pick(), x, y, s: Math.round((a + r() * (b - a)) * kY(y) * 100) / 100, layer: o.layer || 'fore', seed: (o.seed || 1) * 100 + out.length,
      variant: Array.isArray(va) ? va[0] + Math.floor(r() * (va[1] - va[0] + 1)) : (va == null ? Math.floor(r() * 3) : va), flip: r() < (o.flip == null ? 0.5 : o.flip), anim: o.anim == null ? false : o.anim };
    if (o.reflect != null) p.reflect = o.reflect;
    if (o.tint) p.tint = o.tint;
    out.push(p);
  }
  return out.sort((p, q) => p.y - q.y);
}
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  /** A tapered, curved blade from the ground at (x, y0): height h, foot width w, the tip bent by b (all one subpath). */
  const blade = (x, y0, h, w, b) => `M${f1(x - w / 2)} ${f1(y0)}Q${f1(x - w / 4 + b * 0.35)} ${f1(y0 - h * 0.55)} ${f1(x + b)} ${f1(y0 - h)}Q${f1(x + w / 4 + b * 0.3)} ${f1(y0 - h * 0.5)} ${f1(x + w / 2)} ${f1(y0)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  /** A tilted ellipse (a plume, a cigar head) as a 4-curve path. */
  const rot = (x, y, rx, ry, a) => {
    const c = Math.cos(a), s = Math.sin(a), P = (u, v) => `${f1(x + u * c - v * s)} ${f1(y + u * s + v * c)}`;
    return `M${P(rx, 0)}Q${P(rx, ry)} ${P(0, ry)}Q${P(-rx, ry)} ${P(-rx, 0)}Q${P(-rx, -ry)} ${P(0, -ry)}Q${P(rx, -ry)} ${P(rx, 0)}z`;
  };
  /** A soft lumpy mound (the dark mass behind the blades, so a bed never shows ground through it): bottom y0, top ~y0-h. */
  const mound = (r, x0, x1, y0, h) => {
    let d = `M${f1(x0)} ${f1(y0)}`, x = x0;
    const n = Math.max(4, Math.round((x1 - x0) / 26));
    for (let i = 1; i <= n; i++) { const xn = x0 + (x1 - x0) * i / n, e = Math.sin(Math.PI * i / n), yt = y0 - h * (0.35 + 0.65 * e) * rr(r, 0.75, 1.05); d += `Q${f1((x + xn) / 2)} ${f1(yt - h * 0.18)} ${f1(xn)} ${f1(y0 - h * 0.3 * e * rr(r, 0.7, 1.1))}`; x = xn; }
    // the foot: ragged (little dips), never a ruler line
    for (let i = n * 2; i >= 0; i--) d += `L${f1(x0 + (x1 - x0) * i / (n * 2))} ${f1(y0 + (i % 2 ? rr(r, 1, 4) : -rr(r, 0, 2)))}`;
    return d + 'z';
  };

  /* ---------- plant.yg-reedbed ---------- */
  sceneObjDefine({
    id: 'plant.yg-reedbed', category: 'plant', size: [330, 210], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 2, w: 3.4, l: 1.6 },
    palette: bySeason({
      dark: { spring: '#3c5a2c', summer: '#2f4e26', autumn: '#6a5a2e', winter: '#6e6450' },
      blade: { spring: ['#5a8a36', '#7aa844', '#a2c45e', '#b8ae7a'], summer: ['#3e6a2c', '#58843a', '#7ea24c', '#a8bc68'], autumn: ['#8a7a3a', '#ae9648', '#c8b060', '#dcc884'], winter: ['#8e8266', '#a69a7c', '#bdb294', '#d4ccb2'] },
      plume: { spring: ['#a49470', '#c4b694'], summer: ['#6e4e4a', '#94706a'], autumn: ['#9a7a56', '#c8aa80'], winter: ['#b4a894', '#dcd4c4'] },
      head: { spring: '#5a3e28', summer: '#5c3a22', autumn: '#5a3a24', winter: '#4a3a2e' },
      stem: { spring: '#9a9268', summer: '#5a7a38', autumn: '#a89050', winter: '#9a8e70' },
    }),
    anim: { sway: { part: 'tops', pivot: [0, 0], deg: 2.2 } },
    parts: ['body', 'tops'],
    shadow: { rx: 150, ry: 6, h: 40 },
    reflect: true,
    tags: ['uk', 'waterside', 'reed', 'reedbed', 'phragmites', 'bulrush', 'kit:temperate', 'kit:water', 'role:edge'],
    credit: 'drawn for the Yateley Green views: a common reed (Phragmites) and reedmace bed',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', win = season === 'winter', spr = season === 'spring';
      const W = 150 + v * 8, H = 150 + v * 22;
      const body = [], tops = [];
      body.push({ f: '@dark', d: mound(r, -W, W, 0, H * 0.42) });
      // blades: back (dark) to front (light), taller in the middle of the bed, bent by the wind toward the right
      const tones = ['', '', '', ''], stems = [];
      const N = 150;
      for (let i = 0; i < N; i++) {
        const x = rr(r, -W, W), e = 1 - Math.pow(Math.abs(x) / W, 2), t = Math.min(3, Math.floor(i / N * 4 + r() * 0.6));
        const h = H * (0.35 + 0.65 * e) * rr(r, 0.55, 1.05) * (t === 3 ? 0.7 : 1), bend = rr(r, -8, 22) * h / H * (win && r() < 0.15 ? 3 : 1);
        tones[t] += blade(x, rr(r, -2, 3), h, rr(r, 2.4, 4.6), bend);
        if (r() < 0.22) stems.push([x, h, bend]);
      }
      tones.forEach((d, i) => body.push({ f: '@blade.' + i, d }));
      if (spr) { let sh = ''; for (let i = 0; i < 40; i++) { const x = rr(r, -W * 0.9, W * 0.9); sh += blade(x, 1, rr(r, 18, 46), 3.4, rr(r, -4, 8)); } body.push({ f: '#7ab04a', d: sh }); }
      // plumes on tall stems (phragmites) and a few reedmace cigars (bulrush), in the sway part
      let st = '', pl0 = '', pl1 = '', hd = '';
      for (const [x, h, b] of stems) {
        const top = [x + b * 1.3, -h * 1.12];
        st += `M${f1(x)} ${f1(-h * 0.4)}Q${f1(x + b * 0.5)} ${f1(-h * 0.8)} ${f1(top[0])} ${f1(top[1])}`;
        if (r() < 0.2 && !spr) hd += rot(top[0], top[1] + 12, 12, 3.6, Math.PI / 2 + b * 0.01);
        else { const a = 1.05 + rr(r, -0.25, 0.3), L = rr(r, 14, 22); pl0 += rot(top[0] + Math.cos(a) * L * 0.8, top[1] + Math.sin(a) * L * 0.8, L, rr(r, 3.6, 5.2), a); if (r() < 0.7) pl1 += rot(top[0] + Math.cos(a) * L * 0.6 - 1, top[1] + Math.sin(a) * L * 0.6, L * 0.6, 1.8, a - 0.08); }
      }
      tops.push({ s: '@stem', w: 1.3, d: st, cap: 'round' }, { f: '@plume.0', d: pl0 }, { f: '@plume.1', d: pl1, op: 0.9 }, { f: '@head', d: hd });
      if (win) { let br = ''; for (let i = 0; i < 10; i++) { const x = rr(r, -W * 0.8, W * 0.8), h = rr(r, 40, 90); br += `M${f1(x)} 0L${f1(x + 3)} ${f1(-h)}L${f1(x + 26)} ${f1(-h + 22)}`; } body.push({ s: '@blade.3', w: 1.6, d: br, cap: 'round' }); }
      return { body: body.filter(s => s.d), tops: tops.filter(s => s.d) };
    },
  });

  /* ---------- plant.yg-meadow ---------- */
  const FLOWERS = {
    spring: [['#fbfbf2', 'umbel', 3.4], ['#e0679a', 'dot', 2.2], ['#f6cf22', 'dot', 2]],
    summer: [['#f6cf22', 'dot', 2.2], ['#fbfaf2', 'daisy', 3], ['#9b5aa8', 'dot', 2.4], ['#d93a2a', 'dot', 2.6]],
    autumn: [['#6e5434', 'dot', 1.7], ['#8a6e46', 'umbel', 2.2], ['#8a6a86', 'dot', 1.8]],
    winter: [['#4e4234', 'dot', 1.6], ['#6a5a46', 'umbel', 2.2]],
  };
  sceneObjDefine({
    id: 'plant.yg-meadow', category: 'plant', size: [240, 100], variants: 5, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 0.7, w: 3, l: 1.4 },
    palette: bySeason({
      dark: { spring: '#3e6a2c', summer: '#335a28', autumn: '#43562a', winter: '#565c46' },
      blade: { spring: ['#4f8a34', '#6aa040', '#8ab858', '#b4d07a'], summer: ['#3e6a2c', '#5a8a38', '#7aa246', '#a6ba62'], autumn: ['#4e6230', '#6a7a3a', '#8e8e4a', '#b6a866'], winter: ['#6a7056', '#868a6c', '#a6a488', '#c8c4ac'] },
      stem: { spring: '#5a8a3a', summer: '#5a7a38', autumn: '#8a7a4c', winter: '#7a6e58' },
    }),
    anim: { sway: { part: 'tops', pivot: [0, 0], deg: 3 } },
    parts: ['body', 'tops'],
    shadow: false,
    reflect: false,
    tags: ['uk', 'meadow', 'long-grass', 'verge', 'flowers', 'kit:temperate', 'role:ground'],
    credit: 'drawn for the Yateley Green views: an uncut meadow margin',
    build(v, r, ctx) {
      const season = (ctx && ctx.season) || 'summer', W = 104 + v * 8, H = 62 + v * 8;
      // the tussock's skyline: two or three humps (never a flat-topped strip), low at the ends
      const ph = [rr(r, 0, 6), rr(r, 0, 6)], hump = x => { const u = x / W; return Math.max(0, 1 - Math.pow(Math.abs(u), 1.5)) * (0.75 + 0.25 * Math.sin(u * 5 + ph[0]) + 0.15 * Math.sin(u * 9 + ph[1])); };
      const body = [], tops = [];
      body.push({ f: '@dark', d: mound(r, -W * 0.92, W * 0.92, 0, H * 0.72) }, { f: '@blade.1', op: 0.6, d: mound(r, -W * 0.8, W * 0.75, 0, H * 0.42) });
      const tones = ['', '', '', ''], N = 200;
      for (let i = 0; i < N; i++) {
        const x = rr(r, -W * 1.05, W * 1.05), t = Math.min(3, Math.floor(i / N * 4 + r() * 0.5));
        tones[t] += blade(x, rr(r, -4, 3), H * (0.12 + 0.88 * hump(x)) * rr(r, 0.45, 1.0), rr(r, 3.2, 6), rr(r, -12, 16));
      }
      // a skirt of short, broad blades over the foot (fills the bottom: no see-through gaps)
      for (let i = 0; i < 70; i++) { const x = rr(r, -W, W); tones[Math.floor(r() * 3)] += blade(x, rr(r, -3, 2), H * (0.18 + 0.4 * hump(x)) * rr(r, 0.6, 1), rr(r, 5, 9), rr(r, -6, 8)); }
      tones.forEach((d, i) => body.push({ f: '@blade.' + i, d }));
      // flower and seed-head stems above the grass, the heads by the season's mix
      const mix = FLOWERS[season] || FLOWERS.summer, heads = mix.map(() => ''), cen = [];
      let st = '';
      // variant 4: a moor-grass tussock (heath): seed heads only, never meadow flowers
      const nF = v === 4 ? 0 : season === 'winter' ? 8 : season === 'autumn' ? 11 : 18;
      for (let i = 0; i < nF; i++) {
        const x = rr(r, -W * 0.8, W * 0.8), h = H * (0.25 + 0.7 * hump(x)) * rr(r, 0.75, 1.1), b = rr(r, -6, 10), k = Math.floor(r() * mix.length);
        st += `M${f1(x)} ${f1(-h * 0.3)}Q${f1(x + b * 0.4)} ${f1(-h * 0.7)} ${f1(x + b)} ${f1(-h)}`;
        const [, kind, z] = mix[k];
        if (kind === 'umbel') { for (let j = 0; j < 5; j++) heads[k] += ell(x + b + rr(r, -z * 1.6, z * 1.6), -h - rr(r, 0, z), z * 0.7, z * 0.55); }
        else if (kind === 'daisy') { heads[k] += ell(x + b, -h, z, z * 0.7); cen.push(ell(x + b, -h, z * 0.35, z * 0.3)); }
        else heads[k] += ell(x + b, -h, z, z * 0.85);
      }
      tops.push({ s: '@stem', w: 1.1, d: st, cap: 'round' });
      mix.forEach(([c], k) => { if (heads[k]) tops.push({ f: c, d: heads[k] }); });
      if (cen.length) tops.push({ f: '#f2c53a', d: cen.join('') });
      return { body: body.filter(s => s.d), tops: tops.filter(s => s.d) };
    },
  });

  /* ---------- plant.yg-oak-bough ---------- */
  /** An English oak leaf: a short stalk, then 4 or 5 rounded lobes a side, pointing at angle a. */
  const oakLeaf = (x, y, a, len) => {
    const c = Math.cos(a), s = Math.sin(a), P = (u, w) => `${f1(x + u * c - w * s)} ${f1(y + u * s + w * c)}`, wd = len * 0.32;
    let d = `M${P(0, 0)}`;
    const L = [[0.18, 0.5], [0.36, 0.85], [0.55, 0.95], [0.74, 0.8], [0.9, 0.45]];
    for (const [u, k] of L) d += `Q${P(len * (u - 0.06), wd * k * 1.25)} ${P(len * u, wd * k * 0.55)}`;
    d += `Q${P(len * 1.04, 0)} ${P(len * 0.9, -wd * 0.45 * 0.55)}`;
    for (const [u, k] of L.slice().reverse().slice(1)) d += `Q${P(len * (u + 0.06), -wd * k * 1.25)} ${P(len * u, -wd * k * 0.55)}`;
    return d + `Q${P(len * 0.06, -wd * 0.4)} ${P(0, 0)}z`;
  };
  sceneObjDefine({
    id: 'plant.yg-oak-bough', category: 'plant', size: [620, 360], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    palette: {
      base: { bark: ['#3a3026', '#54473a', '#6c5e4e'], leaf: ['#2a4422', '#3a5a2a', '#527638', '#6e9046'], acorn: ['#7a6a3a', '#5a4a2a'], moss: ['#6a7a3e'] },
      spring: { leaf: ['#4a7a2c', '#64963a', '#86b44c', '#acd06a'] },
      summer: { leaf: ['#26401f', '#365a28', '#4e7434', '#6c9046'] },
      autumn: { leaf: ['#6a5a24', '#9a7a2e', '#c08a34', '#d8a848'] },
    },
    parts: ['branch', 'leaves'],
    anim: { sway: { part: 'leaves', pivot: [0, 40], deg: 1.1 } },
    reflect: false,
    shadow: false,
    tags: ['uk', 'oak', 'frame', 'kit:temperate', 'role:shrub', 'frame'],
    credit: 'drawn for the Yateley Green views: an English oak (Quercus robur) bough',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { branch: [], leaves: [] };
      const limb = (pts, w0, w1, f) => {
        const L = [], Rr = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
          const w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
          L.push([pts[i][0] - dy / m * w, pts[i][1] + dx / m * w]); Rr.push([pts[i][0] + dy / m * w, pts[i][1] - dx / m * w]);
        }
        out.branch.push({ f, d: 'M' + L.concat(Rr.reverse()).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z' });
      };
      // oak limbs are crooked: elbows, not curves
      const main = v ? [[-30, 10], [70, 26], [140, 20], [230, 52], [300, 66], [380, 108], [450, 118], [530, 166]] : [[-30, 30], [60, 40], [130, 70], [210, 66], [290, 104], [350, 150], [430, 166], [500, 214]];
      limb(main, 42, 6, '@bark.0');
      limb(main.map(([x, y]) => [x + 2, y - 6]), 16, 2, '@bark.1');
      out.branch.push({ f: '@moss', op: 0.6, d: ell(80, 32 + (v ? -8 : 6), 26, 5) + ell(170, 52 + (v ? -16 : 10), 18, 4) });
      const sides = v ? [[[100, 24], [130, 70], [170, 100], [176, 160]], [[230, 52], [250, 110], [300, 140], [306, 200]], [[300, 66], [360, 50], [420, 56], [480, 40]], [[380, 108], [400, 160], [440, 190]], [[160, 22], [200, -4], [260, 0]]]
        : [[[110, 58], [150, 110], [170, 150], [210, 200]], [[210, 66], [260, 40], [320, 46], [380, 30]], [[290, 104], [300, 160], [340, 200], [350, 250]], [[350, 150], [410, 140], [470, 120], [540, 126]], [[60, 40], [80, 90], [70, 140]]];
      sides.forEach((s, i) => limb(s, 13 - i, 2, '@bark.' + (i % 2)));
      const anchors = [];
      const along = (pts, n) => { for (let i = 1; i <= n; i++) { const u = i / (n + 1), k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))), t = u * (pts.length - 1) - k; anchors.push([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t]); } };
      along(main.slice(1), 9); sides.forEach(s => along(s, 3));
      let tw = '', ac = '', cups = '';
      const leaves = ['', '', '', ''];
      for (const [ax, ay] of anchors) {
        const tx = ax + (rnd() - 0.4) * 44, ty = ay + 18 + rnd() * 38;
        tw += `M${f1(ax)} ${f1(ay)}L${f1((ax + tx) / 2 + rnd() * 8 - 4)} ${f1((ay + ty) / 2)}L${f1(tx)} ${f1(ty)}`;
        if (season === 'winter') { tw += `M${f1(tx)} ${f1(ty)}l${f1(rnd() * 10 - 2)} ${f1(6 + rnd() * 8)}M${f1((ax + tx) / 2)} ${f1((ay + ty) / 2)}l${f1(-6 - rnd() * 6)} ${f1(4 + rnd() * 6)}`; continue; }
        // a rosette of leaves at the twig's end (oaks bunch them), a few along the twig; fewer and patchier in autumn
        const n = season === 'autumn' ? 5 : 8;
        for (let j = 0; j < n; j++) {
          const u = 0.45 + 0.55 * (j / n), lx = ax + (tx - ax) * u + (rnd() - 0.5) * 10, ly = ay + (ty - ay) * u + (rnd() - 0.5) * 8;
          const a = (rnd() - 0.5) * 2.6 + Math.PI / 2 * (rnd() < 0.5 ? 0.6 : -0.2), len = 22 + rnd() * 14, tone = j < n / 3 ? Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3);
          leaves[tone] += oakLeaf(lx, ly, a, len);
        }
        if (season === 'autumn' && rnd() < 0.45) { ac += ell(tx + 3, ty + 7, 3.4, 4.6); cups += ell(tx + 3, ty + 3.6, 3.8, 2.2); }
      }
      out.branch.push({ s: '@bark.2', w: season === 'winter' ? 2 : 1.6, d: tw, cap: 'round' });
      leaves.forEach((d, i) => { if (d) out.leaves.push({ f: '@leaf.' + i, d }); });
      if (ac) out.leaves.push({ f: '@acorn.0', d: ac }, { f: '@acorn.1', d: cups });
      if (!out.leaves.length) out.leaves.push({ f: '@bark.2', d: 'M0 0h0.1v0.1z', op: 0 });
      return out;
    },
  });
})();

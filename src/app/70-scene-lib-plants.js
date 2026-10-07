/* ============================================================
   SCENE LIBRARY: plants (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Ground cover and low growth, ported from the nature kit's symbols
   (71-anim-uk-nature-kit.js: tuftSym, heatherSym, frondSym, reedSym,
   flowerSym, K.gorse, K.fern, K.bluebells) with palette slots, plus a
   hedgerow, a woodland shrub and holly. Light from the LEFT. Anchor: the
   ground at the foot of the plant. Most are made to be scattered by the
   hundred (they bake into the layer bitmap); their one part 'body' sways
   when a scatter rule asks for it.

   The kit's dashed strokes (heather spikes, seed heads) are drawn as rows
   of short round-capped segments ("beads"), because shapes carry no dash.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const rr = (r, a, b) => a + r() * (b - a);
  const R = Math.round, f1 = v => Math.round(v * 10) / 10;
  const D = Math.PI / 180;
  const leafD = (x, y, a, l, w) => sceneD.leaf(x, y, a, l, w);
  const circ = (x, y, rad) => `M${f1(x - rad)} ${f1(y)}a${f1(rad)} ${f1(rad)} 0 1 0 ${f1(2 * rad)} 0a${f1(rad)} ${f1(rad)} 0 1 0 ${f1(-2 * rad)} 0`;
  const blob = (r, cx, cy, rx, ry, n) => {
    const pts = []; for (let i = 0; i < n; i++) { const a = (i + rr(r, -.25, .25)) / n * Math.PI * 2, k = rr(r, .86, 1.04); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[i - 1], lr = Math.max(1, f1(Math.hypot(p[0] - q[0], p[1] - q[1]) * rr(r, .56, .7))); d += `A${lr} ${lr} 0 0 1 ${f1(p[0])} ${f1(p[1])}`; }
    return d + 'z';
  };
  /** Beads along a line (x0, y0) -> (x1, y1): one short segment every `step` units (stroke them round-capped). */
  const beads = (x0, y0, x1, y1, step) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor(L / step)), ux = (x1 - x0) / L, uy = (y1 - y0) / L; let d = ''; for (let i = 0; i <= n; i++) { const x = x0 + ux * i * step, y = y0 + uy * i * step; d += `M${f1(x)} ${f1(y)}l${f1(ux * .4)} ${f1(uy * .4)}`; } return d; };
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };

  /* The kit's seasonal colours (K.PAL). */
  const GRASS = { spring: ['#4c7a37', '#6f9f40', '#a6c95e', '#cfe28a'], summer: ['#3f6b31', '#5f8f3a', '#8db352', '#c3d77e'], autumn: ['#5f6a35', '#8a8a45', '#b5a65c', '#d6c58a'], winter: ['#6b735a', '#8d9277', '#b3b59c', '#dcdccb'] };
  const DRY = { spring: ['#9aa660', '#c2c48a'], summer: ['#b9ad6a', '#d9cb8e'], autumn: ['#c2a467', '#dcc396'], winter: ['#b9ac86', '#d6cdb0'] };

  /* ---------- plant.grass: a tuft (about 40 tall); odd variants carry seed heads in summer and autumn ---------- */
  defineObj({
    id: 'plant.grass', category: 'plant', size: [54, 53], variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { shade: '#0a1a10' } }, bySeason({ grass: GRASS, head: DRY })),
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 7 } },
    tags: ['uk', 'grass', 'meadow', 'ground-cover', 'kit:temperate', 'kit:urban', 'role:ground'],
    credit: "the nature kit's tuft symbol (tuftSym)",
    build(v, r, ctx) {
      const s = ctx.season, heads = v % 2 === 1 && (s === 'summer' || s === 'autumn');
      let back = '', front = '', hd = '';
      const n = 9 + (v % 3) * 2 + (v === 3 ? 3 : 0);
      for (let i = 0; i < n; i++) {
        const a = rr(r, -40, 40) * D, h = rr(r, 20, 44) * (1 - Math.abs(a) * .45), bx = rr(r, -7, 7), tx = bx + Math.sin(a) * h, ty = -Math.cos(a) * h, w = rr(r, 1.1, 2.1), qx = bx + Math.sin(a) * h * .2, qy = -h * .6;
        const d = `M${f1(bx - w)} 0Q${f1(qx)} ${f1(qy)} ${f1(tx)} ${f1(ty)}Q${f1(qx + w)} ${f1(qy)} ${f1(bx + w)} 0z`;
        if (i % 2) front += d; else back += d;
        if (heads && i % 3 === 0) hd += beads(tx, ty, tx + Math.sin(a) * 5, ty - 8, 2.2);
      }
      const body = [['@grass.1', back], ['@grass.2', front], ['@shade', 'M-8 0q8-4 16 0z', .18]];
      if (hd) body.push({ s: '@head.0', w: 2.4, d: hd });
      return { body };
    },
  });

  /* ---------- plant.heather: a cushion (about 60 wide): purple in late summer, russet in autumn and winter ---------- */
  defineObj({
    id: 'plant.heather', category: 'plant', size: [78, 38], variants: 4, seasonal: true, flippable: true,
    palette: Object.assign({ base: { glint: '#ffffff' } }, bySeason({
      heather: { spring: ['#3d4f30', '#5f7340', '#93a65c'], summer: ['#3b4a2e', '#55663a', '#7c8d52'], autumn: ['#4a3f30', '#6a5040', '#8a6a55'], winter: ['#3e3a30', '#5a4a3c', '#7a6550'] },
      bloom: { spring: ['#8a9a55', '#a3b26a'], summer: ['#a8509c', '#c875b8'], autumn: ['#8a5a6a', '#a87a84'], winter: ['#6a4f45', '#80665a'] },
    })),
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 2.5 } },
    tags: ['uk', 'heath', 'heather', 'ling', 'ground-cover', 'kit:temperate', 'role:ground'],
    credit: "the nature kit's heather cushion (heatherSym)",
    build(v, r) {
      const w = rr(r, 26, 34), h = rr(r, 10, 14);
      let stems = '', fl = ['', ''], hi = '';
      for (let j = 0; j < 18; j++) {
        const sx = rr(r, -w * .9, w * .9), sy = -h * (1 - (sx / w) ** 2) * rr(r, .5, 1), sh = rr(r, 9, 21), a = rr(r, -.35, .35) + sx / w * .35, ex = sx + Math.sin(a) * sh, ey = sy - Math.cos(a) * sh;
        stems += `M${f1(sx)} ${f1(sy)}L${f1(ex)} ${f1(ey)}`;
        fl[j % 2] += beads(sx + (ex - sx) * .3, sy + (ey - sy) * .3, ex, ey, 3);
        if (j % 3 === 0) hi += `M${f1(ex)} ${f1(ey + 1)}l${f1(Math.sin(a) * -2)} 4`;
      }
      const mound = `M${f1(-w)} 1Q${f1(-w * .95)} ${f1(-h * 1.2)} ${f1(-w * .35)} ${f1(-h * 1.15)}Q0 ${f1(-h * 1.7)} ${f1(w * .4)} ${f1(-h * 1.2)}Q${f1(w * 1.05)} ${f1(-h * .9)} ${f1(w)} 1z`;
      return { body: [['@heather.0', mound], ['@heather.1', blob(r, -w * .2, -h * .95, w * .55, h * .4, 7)], { s: '@heather.2', w: .9, d: stems }, { s: '@bloom.0', w: 3.4, d: fl[0] }, { s: '@bloom.1', w: 3, d: fl[1] }, { s: '@glint', w: 1.4, op: .3, d: hi, detail: true }] };
    },
  });

  /* ---------- plant.gorse: a spiny mound with yellow flowers (most in spring, a few even in winter) ---------- */
  defineObj({
    id: 'plant.gorse', category: 'plant', size: [252, 116], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { frost: '#f2f6f4', shade: '#1f2d22' } }, bySeason({
      gorse: { spring: ['#28452b', '#3f6338', '#6b8d4a'], summer: ['#28452b', '#3f6338', '#6b8d4a'], autumn: ['#2a432a', '#3f5e36', '#66844a'], winter: ['#2a4030', '#3d5a40', '#62806a'] },
      flower: { spring: ['#f7c51e', '#ffe15a', '#e8a514'], summer: ['#f3c21c', '#ffde55', '#e39d12'], autumn: ['#e9b81c', '#f7d450', '#e9b81c'], winter: ['#e8c040', '#f6d870', '#e8c040'] },
    })),
    parts: ['base', 'body'],
    anim: { sway: { part: 'body', pivot: [0, -10], deg: 1.2 } },
    shadow: { rx: 105, ry: 10, h: 90 },
    tags: ['uk', 'heath', 'gorse', 'furze', 'shrub', 'kit:temperate', 'role:shrub'],
    credit: "the nature kit's K.gorse",
    build(v, r, ctx) {
      const bloom = { spring: 1, summer: .55, autumn: .3, winter: .12 }[ctx.season];
      const w = 110 * rr(r, .85, 1.1), h = 80 * rr(r, .85, 1.15);
      let edge = `M${R(-w)} 0`;
      for (let i = 0; i <= 26; i++) { const t = i / 26, a = Math.PI * (1 - t), rad = 1 + Math.sin(t * Math.PI * 3 + r()) * .08, bx = Math.cos(a) * w * rad, by = -Math.sin(a) * h * rad * (1 + .25 * Math.sin(t * 7)); edge += `L${R(bx + rr(r, -5, 5))} ${R(by - rr(r, 4, 12))}L${R(bx * .97)} ${R(by * .95)}`; }
      edge += 'z';
      let spines = '', light = '', inner = '';
      for (let i = 0; i < 46; i++) { const a = rr(r, .1, Math.PI - .1), d = rr(r, .3, .95), sx = Math.cos(a) * w * d, sy = -Math.sin(a) * h * d; spines += `M${R(sx)} ${R(sy)}l${R(Math.cos(a) * 9)} ${R(-Math.sin(a) * 9 - 3)}`; if (sy < -h * .4) light += circ(sx - 6, sy - 4, rr(r, 8, 15)); else if (r() < .5) inner += circ(sx + 4, sy + 2, rr(r, 7, 12)); }
      // flower sprays: a few small clusters of blossoms over the bush
      const fl = ['', '', ''], nf = Math.round(26 * bloom);
      for (let i = 0; i < nf; i++) { const a = rr(r, .1, Math.PI - .1), d = Math.sqrt(r()) * .9, fx = Math.cos(a) * w * d, fy = -Math.sin(a) * h * d - 3, k = rr(r, .8, 1.25); for (let j = 0; j < 4; j++) fl[(i + j) % 3] += circ(fx + rr(r, -11, 11) * k, fy + rr(r, -8, 8) * k, rr(r, 2.4, 4) * k); }
      const body = [['@gorse.0', edge], ['@shade', inner, .12], ['@gorse.1', light], { s: '@gorse.2', w: 1.6, d: spines }, ['@flower.2', fl[2]], ['@flower.0', fl[0]], ['@flower.1', fl[1]]];
      if (ctx.season === 'winter') body.push({ s: '@frost', w: 3, op: .55, d: `M${R(-w * .7)} ${R(-h * .8)}Q0 ${R(-h * 1.25)} ${R(w * .7)} ${R(-h * .8)}` });
      return { base: [['@shade', `M${R(-w * .95)} 2Q0 ${R(-h * .35)} ${R(w * .95)} 2z`, .35]], body };
    },
  });

  /* ---------- plant.bracken: a clump of fronds (fiddleheads in spring, copper in autumn, rust in winter) ---------- */
  defineObj({
    id: 'plant.bracken', category: 'plant', size: [193, 93], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: bySeason({ bracken: { spring: ['#5f8d3a', '#94bb55', '#c3dc7e'], summer: ['#3f7032', '#6a9c44', '#a5c96a'], autumn: ['#8a3f1c', '#bb6428', '#e39a4a'], winter: ['#7a4a2a', '#9a6438', '#bb8a5a'] } }),
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 3 } },
    tags: ['uk', 'heath', 'woodland', 'bracken', 'fern', 'ground-cover', 'kit:temperate', 'role:ground'],
    credit: "the nature kit's bracken frond (frondSym)",
    build(v, r, ctx) {
      const s = ctx.season, out = { stalk: '', a: '', b: '', curl: '' };
      const n = 6 + v;
      for (let f = 0; f < n; f++) {
        const ox = rr(r, -34, 34), dir = (f % 2 ? -1 : 1), k = rr(r, .7, 1.1), winterBent = s === 'winter' ? rr(r, .55, .8) : 1;
        if (s === 'spring' && f % 2 === 0) { out.curl += `M${f1(ox)} 0q${f1(3 * k)} ${f1(-26 * k)} ${f1(-1 * k)} ${f1(-34 * k)}a${f1(6 * k)} ${f1(6 * k)} 0 1 1 ${f1(8 * k)} ${f1(4 * k)}`; continue; }
        const h = rr(r, 58, 76) * k * winterBent, L = rr(r, 42, 60) * k * (2 - winterBent), ex = ox + dir * L, ey = -h * .72;
        out.stalk += `M${f1(ox)} 0Q${f1(ox + dir * L * .1)} ${f1(-h)} ${f1(ex)} ${f1(ey)}`;
        for (let j = 1; j < 10; j++) {
          const t = j / 10, px = ox + dir * L * (t * t * .85 + t * .15), py = -h * (1 - (1 - t) ** 2) * .95 + (t > .6 ? (t - .6) * h * .6 : 0), len = (1 - t * .6) * 23 * k;
          const ang = Math.atan2(dir * L * (2 * t * .85 + .15), h * 2 * (1 - t) * .95);
          out.a += leafD(px, py, ang - 1.2 * dir, len, len * .3); out.b += leafD(px, py, ang + 1.2 * dir, len * .9, len * .3);
        }
      }
      const mass = s === 'spring' ? '' : sceneD.lobed(r, 0, -9, 58, 10, 12, .18);
      const body = [['@bracken.0', mass, .5], { s: '@bracken.0', w: 1.8, d: out.stalk }, ['@bracken.0', out.a], ['@bracken.' + (v % 2 ? 1 : 2), out.b]];
      if (out.curl) body.push({ s: '@bracken.1', w: 2.4, d: out.curl });
      return { body };
    },
  });

  /* ---------- plant.fern: a rosette of arching fronds (male fern / hart's-tongue look; bronze in autumn) ---------- */
  defineObj({
    id: 'plant.fern', category: 'plant', size: [168, 113], variants: 3, seasonal: true, flippable: true,
    palette: bySeason({ fern: { spring: ['#5f9a3a', '#9cc860', '#3f7a2a'], summer: ['#3d7a3a', '#6aa850', '#2a5a28'], autumn: ['#8a5a2a', '#b07a3a', '#6a4220'], winter: ['#6a5a40', '#857250', '#4a3f2a'] } }),
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 2.5 } },
    tags: ['uk', 'woodland', 'waterside', 'fern', 'ground-cover', 'kit:temperate', 'role:ground'],
    credit: "the nature kit's K.fern",
    build(v, r) {
      let d0 = '', d1 = '', st = '';
      const fr = 7 + v;
      for (let i = 0; i < fr; i++) {
        const a = (-72 + i * 144 / (fr - 1) + rr(r, -8, 8)) * D, L = rr(r, 70, 110) * (1 - Math.abs(a) * .15), ex = Math.sin(a) * L, ey = -Math.cos(a) * L * .9, cx = Math.sin(a) * L * .3, cy = -L * .95;
        st += `M0 0Q${R(cx)} ${R(cy)} ${R(ex)} ${R(ey)}`;
        for (let j = 1; j < 11; j++) {
          const t = j / 11, bx = 2 * (1 - t) * t * cx + t * t * ex, by = 2 * (1 - t) * t * cy + t * t * ey, len = (1 - t) * 18 + 3, ang = Math.atan2(ex - cx, -(ey - cy));
          const pd = leafD(bx, by, ang - 1.1, len, len * .28) + leafD(bx, by, ang + 1.1, len, len * .28);
          if (j % 2) d0 += pd; else d1 += pd;
        }
      }
      return { body: [{ s: '@fern.2', w: 2, d: st }, ['@fern.0', d0], ['@fern.1', d1], ['@fern.2', 'M-14 0q14-10 28 0z', .6]] };
    },
  });

  /* ---------- reeds: plant.reed (common reed with plumes) and plant.bulrush (reedmace heads) ---------- */
  const reedPal = bySeason({
    reed: { spring: ['#4f7a3a', '#7ea24c', '#a9c26a'], summer: ['#46713a', '#6f9a48', '#a3c066'], autumn: ['#7a7038', '#a39248', '#c8b46a'], winter: ['#8a8058', '#aa9e74', '#cfc49c'] },
    head: { spring: ['#6e5236', '#8e6a44'], summer: ['#5e4430', '#7d5c3c'], autumn: ['#5a3e2a', '#7a5434'], winter: ['#5a4632', '#6e5840'] },
    plume: { spring: ['#8a7a5a', '#a89a78'], summer: ['#7a5f6e', '#a08494'], autumn: ['#a08a6a', '#c4b090'], winter: ['#b0a48a', '#d4cab0'] },
  });
  const reedBuild = kind => (v, r) => {
    let a = '', b = '', heads = '', lit = '', stalks = '', plumes = ['', ''];
    const n = 11 + v * 2;
    for (let j = 0; j < n; j++) {
      const h = rr(r, 60, 125), ang = rr(r, -.25, .25), bx = rr(r, -12, 12), tx = bx + Math.sin(ang) * h, ty = -Math.cos(ang) * h, bend = rr(r, -1, 1) * h * .22, w = rr(r, 1.6, 2.6);
      const d = `M${f1(bx - w)} 0Q${f1(bx + bend * .2)} ${f1(-h * .6)} ${f1(tx + bend)} ${f1(ty + h * .1)}Q${f1(bx + bend * .2 + w)} ${f1(-h * .6)} ${f1(bx + w)} 0z`;
      if (j % 2) b += d; else a += d;
      if (j < 3 + v) {
        const sh = h * 1.12, sx = bx + Math.sin(ang * .5) * sh, sy = -Math.cos(ang * .5) * sh;
        stalks += `M${f1(bx)} 0L${f1(sx)} ${f1(sy)}`;
        if (kind === 'bulrush') { const hx0 = bx + (sx - bx) * .8, hy0 = sy * .8, hx1 = bx + (sx - bx) * .95, hy1 = sy * .95; heads += `M${f1(hx0)} ${f1(hy0)}L${f1(hx1)} ${f1(hy1)}`; lit += `M${f1(hx0 - 1.6)} ${f1(hy0 - 1)}L${f1(hx1 - 1.6)} ${f1(hy1 + 1)}`; }
        else for (let q = 0; q < 6; q++) plumes[q % 2] += `M${f1(sx)} ${f1(sy)}q${f1((q - 2.5) * 3)} 4 ${f1((q - 2.5) * 4 + 7)} ${f1(14 + q * 2)}`;
      }
    }
    const body = [['@reed.0', a], ['@reed.' + (1 + v % 2), b], { s: '@reed.1', w: 1.4, d: stalks }];
    if (heads) body.push({ s: '@head.0', w: 7, d: heads }, { s: '@head.1', w: 2, d: lit, op: .8 });
    if (plumes[0]) body.push({ s: '@plume.0', w: 2, d: plumes[0] }, { s: '@plume.1', w: 1.6, d: plumes[1] });
    return { body };
  };
  defineObj({
    id: 'plant.reed', category: 'plant', size: [91, 146], variants: 3, seasonal: true, flippable: true, palette: reedPal,
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 4 } }, reflect: true,
    tags: ['uk', 'waterside', 'reed', 'phragmites', 'kit:temperate', 'kit:water', 'role:edge'],
    credit: "the nature kit's reed clump (reedSym, plumes)", build: reedBuild('plume'),
  });
  defineObj({
    id: 'plant.bulrush', category: 'plant', size: [98, 138], variants: 3, seasonal: true, flippable: true, palette: reedPal,
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 3.5 } }, reflect: true,
    tags: ['uk', 'waterside', 'reed', 'bulrush', 'reedmace', 'kit:temperate', 'kit:water', 'role:edge'],
    credit: "the nature kit's reed clump (reedSym, bulrush heads)", build: reedBuild('bulrush'),
  });

  /* ---------- plant.wildflowers: a small patch of the season's flowers on stems ---------- */
  const FL = {
    daisy: ['#fbfaf2', '#f2c53a', 3.4], buttercup: ['#f6cf22', '#fff09a', 3], campion: ['#e0679a', '#f7a8c8', 3.3], poppy: ['#d93a2a', '#2a1f22', 4.4],
    knapweed: ['#9b5aa8', '#c58ad0', 3], clover: ['#e8b3c7', '#fbe3ec', 2.8], dandelion: ['#f7c01e', '#ffe27a', 3.4], ragwort: ['#f2c21a', '#ffe070', 2.2],
    harebell: ['#8aa2e0'], foxglove: ['#c9559a'], cowparsley: ['#fbfbf2'], celandine: ['#f6d21e', '#fff1a0', 3], anemone: ['#fbf6f2', '#f0d060', 3],
  };
  const MIXES = {
    spring: [['celandine', 'anemone', 'dandelion'], ['cowparsley', 'campion', 'daisy'], ['dandelion', 'daisy', 'celandine'], ['campion', 'cowparsley', 'anemone']],
    summer: [['daisy', 'buttercup', 'clover'], ['poppy', 'daisy', 'knapweed'], ['foxglove', 'campion', 'buttercup'], ['knapweed', 'ragwort', 'harebell']],
    autumn: [['ragwort', 'knapweed'], ['harebell', 'dandelion'], ['knapweed', 'daisy'], ['ragwort', 'harebell']],
  };
  defineObj({
    id: 'plant.wildflowers', category: 'plant', size: [80, 77], variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { stem: '#4f7a35', seed: '#8a7a5a', fluff: '#eeeae0' } }, bySeason({ stem: { spring: '#5a8a3a', summer: '#4f7a35', autumn: '#6a7a3a', winter: '#7a6a4a' } })),
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 6 } },
    tags: ['uk', 'meadow', 'verge', 'flowers', 'wildflowers', 'kit:temperate', 'role:ground'],
    credit: "the nature kit's flower symbols (flowerSym)",
    build(v, r, ctx) {
      const body = [], stems = [];
      const leafs = [];
      if (ctx.season === 'winter') {
        // winter: dead seed heads and a dandelion clock or two
        let st = '', hd = '', fl = '';
        for (let i = 0; i < 6; i++) { const bx = rr(r, -22, 22), h = rr(r, 18, 40), lean = rr(r, -.3, .3), tx = bx + lean * h, ty = -h; st += `M${f1(bx)} 0q${f1(lean * h * .2)} ${f1(-h * .5)} ${f1(tx - bx)} ${f1(ty)}`; if (i % 3 === 0) fl += circ(tx, ty, 4.2); else hd += circ(tx, ty, 2); }
        return { body: [{ s: '@stem', w: 1.1, d: st }, ['@seed', hd], ['@fluff', fl, .8]] };
      }
      const kinds = MIXES[ctx.season][v % 4], byCol = new Map(), add = (c, d) => byCol.set(c, (byCol.get(c) || '') + d);
      let st = '';
      const n = 7 + (v % 2) * 3;
      for (let i = 0; i < n; i++) {
        const kind = kinds[i % kinds.length], c = FL[kind], tall = kind === 'foxglove' || kind === 'cowparsley' ? 1.7 : 1;
        const h = rr(r, 20, 38) * tall, lean = rr(r, -.25, .25), bx = rr(r, -26, 26), tx = bx + lean * h, ty = -h;
        st += `M${f1(bx)} 0q${f1(lean * h * .2)} ${f1(-h * .5)} ${f1(tx - bx)} ${f1(ty)}`;
        if (i % 2) leafs.push(leafD(bx, -h * .25, lean + (i % 4 ? .9 : -.9), 9, 3));
        if (kind === 'harebell') add(c[0], leafD(tx, ty, Math.PI * .9, 7, 3) + leafD(tx + 3, ty + 6, Math.PI * .85, 6, 2.6));
        else if (kind === 'foxglove') { let d = ''; for (let j = 0; j < 7; j++) d += leafD(tx + 2, ty + j * 5, 2.2, 6.4 * (1 - j * .06), 2.6); add(c[0], d); }
        else if (kind === 'cowparsley') { let d = '', ray = ''; for (let u = 0; u < 4; u++) { const ua = (u / 3 - .5) * 1.6, ux = tx + Math.sin(ua) * 7, uy = ty - Math.cos(ua) * 5; ray += `M${f1(tx)} ${f1(ty + 3)}L${f1(ux)} ${f1(uy)}`; for (let j = 0; j < 6; j++) { const a = rr(r, 0, 6.28), q = rr(r, 0, 3.2); d += circ(ux + Math.cos(a) * q, uy + Math.sin(a) * q * .6 - 1, 1.2); } } stems.push(ray); add(c[0], d); }
        else if (kind === 'ragwort') add(c[0], circ(tx - 3, ty, 2.2) + circ(tx + 3, ty - 1, 2.2) + circ(tx, ty - 3, 2.2) + circ(tx + 1, ty + 2, 2));
        else { let pet = ''; for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2 + i; pet += leafD(tx, ty, a, c[2] * 1.3, c[2] * .55); } add(c[0], pet); add(c[1], circ(tx, ty, c[2] * .38)); }
      }
      body.push({ s: '@stem', w: 1.2, d: st + stems.join('') }, ['@stem', leafs.join('')]);
      for (const [c, d] of byCol) body.push([c, d]);
      return { body };
    },
  });

  /* ---------- plant.bluebells: a patch under trees: a violet haze and nodding stems in spring ---------- */
  defineObj({
    id: 'plant.bluebells', category: 'plant', size: [179, 43], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { bell: ['#5f6fd0', '#8a90e0'], haze: '#7a78c8', stem: '#4f7a45', litter: ['#7a6040', '#a08058'] } }, bySeason({ leaf: { spring: '#4f8a40', summer: '#5a7a3a', autumn: '#7a6a3a', winter: '#6a5a40' } })),
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 4 } },
    tags: ['uk', 'woodland', 'bluebell', 'spring-flowers', 'ground-cover', 'kit:temperate', 'role:ground'],
    credit: "the nature kit's K.bluebells",
    build(v, r, ctx) {
      const s = ctx.season, w = 80 + v * 10;
      let haze = '', st = '', bells = ['', ''], lv = '', lit = '';
      // strap leaves at the foot (all year bar winter, when only leaf litter shows)
      if (s !== 'winter') for (let i = 0; i < 14; i++) { const x = rr(r, -w * .8, w * .8), a = rr(r, -.7, .7); lv += leafD(x, 0, a, rr(r, 14, 24) * (s === 'autumn' ? .6 : 1), 3.2); }
      else for (let i = 0; i < 16; i++) lit += sceneD.ell(rr(r, -w * .8, w * .8), rr(r, -3, 1), rr(r, 3, 6), rr(r, 1.2, 2));
      if (s === 'spring') {
        for (let i = 0; i < 4; i++) haze += sceneD.ell(rr(r, -w * .5, w * .5), rr(r, -14, -6), rr(r, 30, 60), rr(r, 6, 11));
        for (let i = 0; i < 22; i++) {
          const bx = rr(r, -w * .85, w * .85), h = rr(r, 18, 34), lean = rr(r, -.2, .3);
          st += `M${f1(bx)} 0q${f1(lean * h)} ${f1(-h * 1.2)} ${f1(h * .35)} ${f1(-h * .9)}`;
          for (let j = 0; j < 4; j++) bells[(i + j) % 2] += leafD(bx + h * .3 + j * 1.4, -h * .9 + j * 4, Math.PI * .92, 5.4, 2.4);
        }
      } else if (s === 'summer') for (let i = 0; i < 10; i++) { const bx = rr(r, -w * .8, w * .8), h = rr(r, 16, 28); st += `M${f1(bx)} 0q2 ${f1(-h * .6)} ${f1(h * .2)} ${f1(-h)}`; bells[0] += circ(bx + h * .2, -h, 1.8); }
      const body = [];
      if (haze) body.push(['@haze', haze, .4]);
      if (lv) body.push(['@leaf', lv]);
      if (lit) body.push(['@litter.0', lit], ['@litter.1', lit, .4]);
      if (st) body.push({ s: '@stem', w: 1.2, d: st });
      if (s === 'spring') body.push(['@bell.0', bells[0]], ['@bell.1', bells[1]]);
      else if (bells[0]) body.push(['@leaf', bells[0]]);
      return { body };
    },
  });

  /* ---------- shrubs: leafy masses built from lobed clusters with lit tops (the kit's woods understorey) ---------- */
  const bushMass = (r, w, h, n, ragged) => {
    // overlapping lobes over a flat-bottomed outline: [cx, cy, rx, ry] each
    const lobes = [];
    for (let i = 0; i < n; i++) { const t = n === 1 ? .5 : i / (n - 1), cx = (t - .5) * w * .8 + rr(r, -8, 8), top = Math.sin(Math.PI * (.15 + t * .7)), ry = h * rr(r, .35, .55) * (.6 + top * .5), rx = w / n * rr(r, .8, 1.2); lobes.push([cx, -ry * rr(r, .8, 1.1), rx, ry]); }
    return lobes;
  };
  const shrubShapes = (r, lobes, ragged, { leaves = 0, slot = 'leaf' } = {}) => {
    const base = [], mid = [], cap = [], lf = ['', ''];
    for (const [cx, cy, rx, ry] of lobes) {
      base.push(sceneD.lobed(r, cx, cy, rx, ry, 11, ragged));
      mid.push(sceneD.lobed(r, cx - rx * .12, cy - ry * .15, rx * .8, ry * .72, 9, ragged));
      cap.push(sceneD.lobed(r, cx - rx * .3, cy - ry * .5, rx * .45, ry * .35, 7, .3));
      for (let i = 0; i < leaves; i++) { const a = rr(r, -2.8, 1.2), k = rr(r, .85, 1.05); lf[a < -.6 ? 1 : 0] += leafD(cx + Math.sin(a) * rx * k, cy - Math.cos(a) * ry * k, a + rr(r, -.4, .4), rr(r, 7, 11), 3.2); }
    }
    const out = [[`@${slot}.0`, base.join('')], [`@${slot}.0`, lf[0]], [`@${slot}.1`, mid.join('')], [`@${slot}.2`, cap.join(''), .9], { f: `@${slot}.2`, d: lf[1], detail: true }];
    return out;
  };
  const twigs = (r, w, h, n) => { let d = ''; for (let i = 0; i < n; i++) { const x = rr(r, -w * .4, w * .4), a = (x / w) * 1.4 + rr(r, -.3, .3), L = h * rr(r, .6, 1.05); const ex = x + Math.sin(a) * L, ey = -Math.cos(a) * L; d += `M${f1(x * .5)} 0Q${f1(x)} ${f1(-L * .5)} ${f1(ex)} ${f1(ey)}`; for (let j = 0; j < 3; j++) { const t = rr(r, .4, .9), px = x * .5 + (ex - x * .5) * t, py = ey * t, b = a + (j % 2 ? .6 : -.6); d += `M${f1(px)} ${f1(py)}l${f1(Math.sin(b) * L * .25)} ${f1(-Math.cos(b) * L * .25)}`; } } return d; };

  /* plant.hedge: a hedgerow section (hawthorn and blackthorn): blossom in spring, haws in autumn, bare twigs in winter */
  defineObj({
    id: 'plant.hedge', category: 'plant', size: [317, 157], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { twig: ['#4a3e36', '#6a5a4e'], bloom: ['#fbf6f2', '#f2d6dc'], berry: ['#a8281e', '#d24a30'], shade: '#14201a', frost: '#f2f6f6' } }, bySeason({
      leaf: { spring: ['#3d6e34', '#6b9f46', '#a8cf6c'], summer: ['#2a5229', '#447a3a', '#78a856'], autumn: ['#6a5a2a', '#9a7a34', '#c49a48'], winter: ['#4a4038', '#5e5248', '#766a5e'] },
    })),
    anim: { sway: { part: 'body', pivot: [0, -20], deg: .8 } },
    shadow: { rx: 130, ry: 10, h: 100 },
    tags: ['uk', 'hedgerow', 'hedge', 'field-edge', 'kit:temperate', 'kit:urban', 'role:ground'],
    credit: 'library: lobed clusters after the nature kit woods understorey',
    build(v, r, ctx) {
      const s = ctx.season, w = 240 + v * 20, h = 85 + v * 10;
      const lobes = bushMass(r, w, h, 6 + v, .25);
      const body = [['@shade', `M${R(-w * .52)} 2Q0 ${R(-h * .25)} ${R(w * .52)} 2z`, .35]];
      if (s === 'winter') {
        body.push({ s: '@twig.0', w: 2.6, d: twigs(r, w, h, 16) }, { s: '@twig.1', w: 1.2, d: twigs(r, w, h * .8, 22) });
        body.push(['@leaf.0', lobes.map(([cx, cy, rx, ry]) => sceneD.lobed(r, cx, cy * .5, rx * .7, ry * .4, 8, .3)).join(''), .55]);
        body.push({ s: '@frost', w: 1, op: .45, d: twigs(r, w, h * .9, 8), m: [1, 0, 0, 1, 0, -1], detail: true });
        let haw = ''; for (let i = 0; i < 14; i++) haw += circ(rr(r, -w * .45, w * .45), -rr(r, h * .3, h * .9), 2.2); body.push(['@berry.0', haw]);
        return { body };
      }
      body.push(...shrubShapes(r, lobes, .28, { leaves: 10 }));
      if (s === 'spring') { const bl = ['', '']; for (const [cx, cy, rx, ry] of lobes) for (let i = 0; i < 14; i++) { const a = rr(r, 0, 6.28), d = Math.sqrt(r()); bl[i % 2] += circ(cx + Math.cos(a) * rx * d * .9, cy + Math.sin(a) * ry * d * .8 - ry * .1, rr(r, 2.2, 3.6)); } body.push(['@bloom.0', bl[0]], ['@bloom.1', bl[1]]); }
      if (s === 'autumn') { const b = ['', '']; for (const [cx, cy, rx, ry] of lobes) for (let i = 0; i < 9; i++) { const a = rr(r, 0, 6.28), d = Math.sqrt(r()); b[i % 2] += circ(cx + Math.cos(a) * rx * d * .9, cy + Math.sin(a) * ry * d * .8, rr(r, 1.8, 2.8)); } body.push(['@berry.0', b[0]], ['@berry.1', b[1]]); }
      return { body };
    },
  });

  /* plant.shrub: a woodland or garden bush (hazel / elder); bare and twiggy in winter */
  defineObj({
    id: 'plant.shrub', category: 'plant', size: [242, 173], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { twig: ['#5a4a3e', '#7a6a5a'], shade: '#14201a', catkin: '#c8b85a', flower: '#f6f0dc', berry: '#3a2032' } }, bySeason({
      leaf: { spring: ['#3f7032', '#79aa45', '#b8d878'], summer: ['#2c5530', '#467a3a', '#7aa858'], autumn: ['#7a6a22', '#b0942c', '#dcc04a'], winter: ['#4a4038', '#5e5248', '#766a5e'] },
    })),
    anim: { sway: { part: 'body', pivot: [0, -20], deg: 1.4 } },
    shadow: { rx: 60, ry: 8, h: 100 },
    tags: ['uk', 'woodland', 'garden', 'shrub', 'hazel', 'elder', 'kit:temperate', 'kit:urban', 'role:shrub'],
    credit: 'library: lobed clusters after the nature kit woods understorey',
    build(v, r, ctx) {
      const s = ctx.season, w = 110 + v * 20, h = 90 + v * 12;
      const lobes = bushMass(r, w, h, 3 + v, .3).map(([cx, cy, rx, ry]) => [cx, cy - h * .2, rx, ry * 1.15]);
      const body = [['@shade', `M${R(-w * .45)} 2Q0 ${R(-h * .2)} ${R(w * .45)} 2z`, .3], { s: '@twig.0', w: 3, d: twigs(r, w * .5, h * .6, 4) }];
      if (s === 'winter') {
        body.push({ s: '@twig.0', w: 2.2, d: twigs(r, w, h, 10) }, { s: '@twig.1', w: 1, d: twigs(r, w * 1.1, h, 14) });
        let cat = ''; for (let i = 0; i < 12; i++) { const x = rr(r, -w * .4, w * .4), y = -rr(r, h * .4, h); cat += `M${f1(x)} ${f1(y)}l${f1(rr(r, -1.5, 1.5))} 7`; }
        body.push({ s: '@catkin', w: 2.6, d: cat });   // hazel catkins hang from late winter
        return { body };
      }
      body.push(...shrubShapes(r, lobes, .3, { leaves: 12 }));
      if (s === 'summer' && v === 1) { let fl = ''; for (const [cx, cy, rx, ry] of lobes) for (let i = 0; i < 3; i++) fl += sceneD.ell(cx + rr(r, -.6, .6) * rx, cy + rr(r, -.6, .3) * ry, 7, 4); body.push(['@flower', fl, .95]); }   // elderflower plates
      if (s === 'autumn' && v === 1) { let b = ''; for (const [cx, cy, rx, ry] of lobes) for (let i = 0; i < 10; i++) b += circ(cx + rr(r, -.6, .6) * rx, cy + rr(r, -.4, .5) * ry, 1.8); body.push(['@berry', b]); }   // elderberries
      return { body };
    },
  });

  /* plant.holly: an evergreen holly bush; red berries in autumn and winter */
  defineObj({
    id: 'plant.holly', category: 'plant', size: [150, 181], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { leaf: ['#16341f', '#24502c', '#4c7a48'], berry: ['#c21e1e', '#ff5a40'], twig: '#3e3630', shade: '#0c1810' } }, bySeason({ leaf: { spring: ['#18381f', '#2a5a2e', '#5a8a50'], summer: ['#16341f', '#24502c', '#4c7a48'], autumn: ['#16341f', '#24502c', '#4c7a48'], winter: ['#16301f', '#22482c', '#4a7050'] } })),
    anim: { sway: { part: 'body', pivot: [0, -30], deg: .8 } },
    shadow: { rx: 55, ry: 8, h: 140 },
    tags: ['uk', 'woodland', 'holly', 'evergreen', 'shrub', 'kit:temperate', 'role:shrub'],
    credit: 'library: holly, glossy spiky leaves on a conical bush',
    build(v, r, ctx) {
      const s = ctx.season, w = 100 + v * 30, h = 140 + v * 20;
      const lobes = [];
      for (let i = 0; i < 7; i++) { const t = i / 6, y = -h * (.15 + t * .7), rx = w * .5 * (1 - t * .65) * rr(r, .85, 1.1); lobes.push([rr(r, -6, 6), y, rx, h * .16]); }
      const body = [['@shade', `M${R(-w * .4)} 2Q0 ${R(-h * .12)} ${R(w * .4)} 2z`, .35], { s: '@twig', w: 4, d: `M0 0L${R(rr(r, -4, 4))} ${R(-h * .6)}` }];
      body.push(...shrubShapes(r, lobes, .22, { leaves: 0 }));
      // spiky glossy leaves: wavy almond shapes with a pale glint
      let lf = ['', ''], gl = '';
      for (let i = 0; i < 46; i++) { const [cx, cy, rx, ry] = lobes[Math.floor(r() * lobes.length)], a = rr(r, -3, 3), x = cx + Math.sin(a) * rx * rr(r, .4, 1), y = cy - Math.cos(a) * ry * rr(r, .3, 1.1), L = rr(r, 9, 13); lf[a < 0 ? 1 : 0] += leafD(x, y, a + rr(r, -.5, .5), L, L * .42); if (a < 0 && r() < .5) gl += `M${f1(x)} ${f1(y)}l${f1(Math.sin(a) * 4)} ${f1(-Math.cos(a) * 4)}`; }
      body.push(['@leaf.0', lf[0]], ['@leaf.2', lf[1]], { s: '#ffffff', w: 1.2, op: .4, d: gl, detail: true });
      if (s === 'autumn' || s === 'winter') { const b = ['', '']; for (let i = 0; i < 22; i++) { const [cx, cy, rx, ry] = lobes[1 + Math.floor(r() * (lobes.length - 1))], x = cx + rr(r, -.8, .8) * rx, y = cy + rr(r, -.6, .6) * ry; b[0] += circ(x, y, 2.6); b[1] += circ(x - .9, y - .9, .9); } body.push(['@berry.0', b[0]], ['@berry.1', b[1]]); }
      return { body };
    },
  });
})();

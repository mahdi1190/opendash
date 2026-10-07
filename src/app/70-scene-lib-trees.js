/* ============================================================
   SCENE LIBRARY: trees (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only; everything is built lazily, once per
   (variant, season), and memoised by the core.

   The drawing is the nature kit's tree (71-anim-uk-nature-kit.js, K.tree),
   ported to library shapes with palette slots: a tapered trunk with bark
   marks, limbs by width class, and a crown of many leaf clusters with lit
   rims, toned five ways by where each cluster sits against the light (the
   sun is on the LEFT; the renderer mirrors a placement for light from the
   right). Winter deciduous trees are bare twig lattices with frost; spring
   adds catkins or blossom; autumn thins the crown.

   Parts: 'trunk' (with the thick limbs, still) and 'crown' (sways about the
   top of the trunk). Anchor: the foot of the trunk.

   Palette slots: bark [base, shade, light], limb [thick, thin], mark,
   leaf [6 tones, shade to light], leafAlt [6 tones] (autumn's second set),
   twig, frost, catkin, bloom [2].
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const rr = (r, a, b) => a + r() * (b - a);
  const R = Math.round, f1 = v => Math.round(v * 10) / 10, f2 = v => Math.round(v * 100) / 100;
  const D = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  /** Six tones from a [dark, mid, light] leaf triple: shade, dark, dark-mid, mid, mid-light, light (as K.tree). */
  const tones = (c, autumn) => [mix(c[0], autumn ? '#2a1e14' : '#06120c', autumn ? .28 : .36), c[0], mix(c[0], c[1], .55), c[1], mix(c[1], c[2], .65), c[2]];
  const altOf = c => tones([mix(c[0], '#5a3a1a', .3), c[0], c[1]], true);

  /* Leaf triples by season (the kit's PAL.leaf) plus the horse chestnut. */
  const LEAF = {
    oak: { spring: ['#3f7032', '#79aa45', '#c5df7c'], summer: ['#2f5a2c', '#4f8538', '#94bd5a'], autumn: ['#7a4f22', '#bd7a2c', '#e9b24c'] },
    birch: { spring: ['#4f8a3a', '#8fc157', '#d8ee95'], summer: ['#3f7536', '#6fa448', '#b6d773'], autumn: ['#a37a22', '#dcae35', '#f6d968'] },
    pine: { spring: ['#1f4536', '#33634a', '#6d9a63'], summer: ['#1d4033', '#2f5b44', '#5f8c58'], autumn: ['#1f4334', '#30604a', '#61905c'], winter: ['#1f3f36', '#2e5547', '#5a8070'] },
    willow: { spring: ['#5f9440', '#9cc65e', '#ddf0a0'], summer: ['#4f8338', '#84b452', '#c3e08a'], autumn: ['#8f8a33', '#c4b448', '#e8d877'] },
    alder: { spring: ['#356634', '#56904a', '#97c06a'], summer: ['#2c5530', '#447a3e', '#7aa95a'], autumn: ['#4d5a2c', '#6f7534', '#9c9446'] },
    hawthorn: { spring: ['#3d6e34', '#6b9f46', '#b3d474'], summer: ['#2f5a2e', '#4d8040', '#8cb85c'], autumn: ['#7a2f22', '#b04a2c', '#d97a3c'] },
    chestnut: { spring: ['#3a6a2e', '#6aa040', '#b4d870'], summer: ['#25502a', '#3f7a34', '#7cae4e'], autumn: ['#7a3e1c', '#b8652a', '#e0a048'] },
  };
  const BARK = {
    oak: ['#5d4c3c', '#3b2f26', '#8c7862'], birch: ['#ece9df', '#8f8d86', '#ffffff'], pine: ['#a65a3a', '#6a3a2c', '#d79060'],
    willow: ['#6c5f4a', '#463c2e', '#92836a'], alder: ['#4f4a44', '#33302c', '#7a736b'], hawthorn: ['#5a4a3e', '#3a2f28', '#7f6c5c'],
    chestnut: ['#5a4a40', '#372c26', '#8a7868'],
  };
  /* The species (K.tree's SPEC, plus the horse chestnut: a broad dome on a short, thick trunk). */
  const SPEC = {
    oak: { th: 120, tw: 34, L: 150, limbs: [[-64, .82, 1], [-32, 1, 1], [2, 1.05, 1], [34, .98, 1], [66, .84, 1], [-84, .55, .72], [84, .5, .66]], depth: 3, kids: [2, 3], spread: 30, lk: .66, wk: .6, droop: 5, clump: [34, 50], unit: 40, gaps: .3 },
    birch: { th: 430, tw: 16, L: 84, along: [.3, .97, 16, 22, 48], depth: 2, kids: [2, 3], spread: 20, lk: .6, wk: .5, droop: 30, clump: [20, 28], unit: 30, fill: [.35, .7], taper: true, white: true },
    pine: { th: 410, tw: 20, L: 96, along: [.6, .98, 10, 66, 98], depth: 2, kids: [2, 3], spread: 24, lk: .55, wk: .55, droop: -4, clump: [30, 40], unit: 34, plate: true, ever: true },
    willow: { th: 140, tw: 38, L: 140, limbs: [[-56, .9, 1], [-26, 1, 1], [4, 1.05, 1], [30, 1, 1], [58, .9, 1]], depth: 2, kids: [2, 3], spread: 30, lk: .72, wk: .6, droop: 6, clump: [32, 44], unit: 40, weep: true },
    alder: { th: 320, tw: 19, L: 100, along: [.25, .98, 12, 34, 54], depth: 2, kids: [2, 3], spread: 26, lk: .6, wk: .55, droop: 3, clump: [24, 32], unit: 40, fill: [.5], cone: true },
    hawthorn: { th: 80, tw: 22, L: 85, limbs: [[-62, .9, 1], [-28, 1, 1], [8, 1, 1], [40, .95, 1], [70, .7, 1]], depth: 3, kids: [2, 3], spread: 34, lk: .66, wk: .6, droop: 8, clump: [22, 30], unit: 40, blossom: true },
    chestnut: { th: 110, tw: 36, L: 140, limbs: [[-70, .78, 1], [-44, .95, 1], [-16, 1.05, 1], [14, 1.05, 1], [42, .95, 1], [70, .78, 1], [-86, .5, .7], [86, .5, .66]], depth: 3, kids: [2, 3], spread: 26, lk: .68, wk: .6, droop: 9, clump: [38, 52], unit: 40, gaps: .12, dome: true, candles: true },
  };

  /* ---------- leaf clusters: about 80 units across, drawn once per (kind, v, snow) ----------
     Each shape is { t, d, op }: t 'F' takes the cluster's tone, 'C' the next tone up (the lit rim),
     'K' a dark leaf (black, low opacity), 'S' snow. */
  const blob = (r, cx, cy, rx, ry, n) => {
    const pts = []; for (let i = 0; i < n; i++) { const a = (i + rr(r, -.25, .25)) / n * Math.PI * 2, k = rr(r, .86, 1.04); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    const F = Math.max(rx, ry) > 14 ? R : f1;
    let d = `M${F(pts[0][0])} ${F(pts[0][1])}`;
    for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[i - 1], lr = Math.max(1, F(Math.hypot(p[0] - q[0], p[1] - q[1]) * rr(r, .56, .7))); d += `A${lr} ${lr} 0 0 1 ${F(p[0])} ${F(p[1])}`; }
    return d + 'z';
  };
  const ell = (x, y, rx, ry) => sceneD.ell(x, y, rx, ry);
  const leafD = (x, y, a, l, w) => sceneD.leaf(x, y, a, l, w);
  const clumps = new Map();
  const clump = (kind, v, snow) => {
    const key = kind + '|' + v + '|' + (snow ? 1 : 0);
    if (clumps.has(key)) return clumps.get(key);
    const r = sceneRnd(sceneHash('scene-clump|' + key));
    const edgeLeaves = (n, rx, ry, L0, L1, from, to, out) => { let d = ''; for (let i = 0; i < n; i++) { const a = rr(r, from, to), L = rr(r, L0, L1), k = rr(r, .82, 1); d += leafD(Math.sin(a) * rx * k, -Math.cos(a) * ry * k, a + rr(r, -.45, .45) + (out ? 0 : Math.PI), L, L * .36); } return d; };
    let out;
    if (kind === 'pine') {
      // a Scots pine plate: a broad, flat-topped mass of needle tufts, dark beneath
      let top = '', tuft = '', under = '';
      for (let i = 0; i < 5; i++) top += ell(-36 + i * 18 + rr(r, -4, 4), -4 - Math.sin((i + .5) / 5 * Math.PI) * 9 + rr(r, -2, 2), rr(r, 16, 22), rr(r, 9, 13));
      for (let i = 0; i < 18; i++) { const x = -54 + i * 6.3 + rr(r, -2, 2), y = -2 - Math.sqrt(Math.max(0, 1 - (x / 58) ** 2)) * 18 + rr(r, -2, 3); tuft += `M${f1(x)} ${f1(y)}l${f1(rr(r, -6, -2))} ${f1(rr(r, -8, -4))}M${f1(x)} ${f1(y)}l${f1(rr(r, -1, 1))} ${f1(rr(r, -9, -5))}M${f1(x)} ${f1(y)}l${f1(rr(r, 2, 6))} ${f1(rr(r, -8, -4))}`; }
      for (let i = 0; i < 12; i++) { const x = -50 + i * 9 + rr(r, -3, 3); under += `M${f1(x)} ${f1(8 + rr(r, 0, 4))}l${f1(rr(r, -3, 3))} ${f1(rr(r, 5, 9))}`; }
      out = [{ t: 'F', d: blob(r, 0, 2, 60, 17, 16) + top }, { t: 'K', d: under, line: 2, op: .22 }, { t: 'C', d: blob(r, -10, -9, 40, 9, 11) }, { t: 'C', d: tuft, line: 1.7, detail: true }];
      if (snow) out.push({ t: 'S', d: blob(r, -6, -15, 36, 4, 10), op: .9 });
    } else if (kind === 'birch') {
      // airy: a loose spray of small leaves round a thin core, lit leaves on the upper left
      let a = '', b = '', c = '';
      for (let i = 0; i < 30; i++) { const ang = rr(r, 0, 6.28), d = Math.sqrt(r()) * 36, x = Math.cos(ang) * d, y = Math.sin(ang) * d * .8 + 6, L = rr(r, 7, 11); const lf = leafD(x, y, rr(r, 2.4, 3.9), L, L * .45); if (x + y < -6 && r() < .8) b += lf; else if (x + y > 14 && r() < .4) c += lf; else a += lf; }
      out = [{ t: 'F', d: blob(r, 2, 8, 22, 17, 9) + a }, { t: 'C', d: b }, { t: 'K', d: c, op: .16 }];
      if (snow) out.push({ t: 'S', d: blob(r, -6, -10, 18, 5, 8) });
    } else {
      const n = kind === 'willow' ? 10 : 12, sq = kind === 'willow' ? 1.12 : kind === 'chestnut' ? .95 : .9;
      // irregular, flat-bottomed masses (oak and hawthorn the most ragged), never a round ball
      const rg = kind === 'oak' || kind === 'hawthorn' ? .34 : kind === 'chestnut' ? .26 : .2;
      const body = sceneD.lobed(r, 2, 3, 37, 37 * sq, n + 4, rg), bodyL = edgeLeaves(16, 37, 37 * sq, 9, 13, -3.1, 3.1, true);
      const rim = sceneD.lobed(r, -6, -7, 34, 33 * sq, n + 2, rg), rimL = edgeLeaves(7, 36, 36 * sq, 9, 12, -2.6, -.3, true);
      const lit = edgeLeaves(6, 24, 22 * sq, 7, 10, -2.4, -.5, true), dark = edgeLeaves(6, 22, 20 * sq, 7, 10, .5, 2.6, false);
      // the crescent: the lit shape first, the body over it shifted down-right, so a lit rim shows top-left
      out = [{ t: 'C', d: rim + rimL }, { t: 'F', d: body + bodyL }, { t: 'C', d: lit, op: .8, detail: true }, { t: 'K', d: dark, op: .14, detail: true }];
      if (snow) out.push({ t: 'S', d: blob(r, -6, -27, 27, 8, 9), op: .92 });
    }
    clumps.set(key, out);
    return out;
  };

  /* ---------- the skeleton (K.tree's, verbatim apart from the random source) ---------- */
  const skeleton = (sp, r, winter) => {
    const segs = [], tips = [], lean = rr(r, -14, 14), th = sp.th * rr(r, .9, 1.1);
    const grow = (x, y, ang, len, w, depth) => {
      const a = ang * D, x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len, bend = rr(r, -.14, .14) * len;
      if (y2 > -12 && depth > 1) return;   // drooping twigs never reach below the ground line
      segs.push([x, y, (x + x2) / 2 + Math.cos(a) * bend, (y + y2) / 2 + Math.sin(a) * bend, x2, y2, w, depth]);
      const maxDepth = sp.depth + (winter ? 2 : 0);
      if (depth >= 2 && depth <= sp.depth) tips.push([(x + x2) / 2, (y + y2) / 2, depth, .8]);
      else if (depth === 1 && !sp.along) tips.push([x + (x2 - x) * .72, y + (y2 - y) * .72, depth, .95]);
      else if (depth === 1 && sp.fill) for (const t of sp.fill) tips.push([x + (x2 - x) * t, y + (y2 - y) * t + 4, depth, .85]);
      if (depth >= maxDepth || len < 8) { tips.push([x2, y2, depth, 1]); return; }
      const kids = sp.kids[0] + Math.floor(r() * (sp.kids[1] - sp.kids[0] + 1));
      for (let i = 0; i < kids; i++) {
        const t = kids === 1 ? 0 : i / (kids - 1) - .5, na = ang + t * sp.spread * 2 + rr(r, -8, 8);
        grow(x2, y2, na + sp.droop * (ang > 0 ? 1 : -1) * (depth + 1) * .5, len * sp.lk * rr(r, .85, 1.15), Math.max(.8, w * sp.wk), depth + 1);
      }
    };
    if (sp.plate) {
      // a Scots pine: a long bare trunk carrying a few irregular masses of needle plates on crooked limbs
      const masses = 4 + Math.floor(r() * 3);
      for (let i = 0; i < masses; i++) {
        const t = i === 0 ? .99 : rr(r, .68, .94), side = i === 0 ? (r() < .5 ? -1 : 1) * .2 : (i % 2 ? 1 : -1), y = -th * t, x0 = lean * t * t;
        const reach = side * (i === 0 ? rr(r, 0, 30) : rr(r, 45, 120) * (1.25 - t * .45)), mx = x0 + reach, my = y - (i === 0 ? rr(r, 34, 50) : rr(r, 8, 36));
        segs.push([x0, y, x0 + reach * .45, my + rr(r, 4, 22), mx, my, Math.max(2, sp.tw * .42 * (1.15 - t * .5)), 1]);
        const nP = 6 + Math.floor(r() * 4), Rm = rr(r, 50, 72) * (i === 0 ? 1.35 : .85);
        for (let j = 0; j < nP; j++) { const px = mx + rr(r, -1, 1) * Rm, py = my + rr(r, -.55, .2) * Rm * .55 - (1 - Math.abs(px - mx) / Rm) * 10; tips.push([px, py, 1, rr(r, .5, .85)]); segs.push([mx, my, (mx + px) / 2, (my + py) / 2 - 4, px, py, 1.6, 2]); }
      }
      return { segs, tips, lean, th };
    }
    if (sp.along) {
      const [t0, t1, n, a0, a1] = sp.along;
      for (let i = 0; i < n; i++) {
        const t = t0 + (t1 - t0) * (i + rr(r, -.3, .3)) / Math.max(1, n - 1), side = i % 2 ? 1 : -1, x = lean * t * t, y = -th * t;
        const lf = sp.cone ? 1.15 - t * .8 : sp.taper ? .4 + Math.sin(Math.PI * Math.min(1, (t - t0) / (t1 - t0) * 1.35)) * .75 * (1.1 - t * .5) : .45 + Math.sin(Math.PI * (t - t0) / (t1 - t0 + .1)) * .6;
        grow(x, y, side * rr(r, a0, a1), sp.L * lf * rr(r, .8, 1.15), sp.tw * .45 * (1.15 - t), 1);
      }
      tips.push([lean, -th - 8, 1, 1]);
    } else for (const [ang, lf, t] of sp.limbs) grow(lean * t * t, -th * t, ang + rr(r, -6, 6), sp.L * lf * rr(r, .88, 1.12), sp.tw * .55, 1);
    return { segs, tips, lean, th };
  };

  /** Build one tree: { trunk, crown } shapes. */
  const build = (kind, v, r, season) => {
    const sp = SPEC[kind], winter = season === 'winter', bare = winter && !sp.ever, spring = season === 'spring', autumn = season === 'autumn';
    const { segs, tips, lean, th } = skeleton(sp, r, bare);
    const tw = sp.tw, top = tw * .32, lx = -1;
    const trunk = [], crownBack = [], crown = [];
    // trunk: tapered, slightly curved, root flare, shaded away from the light, bark marks
    trunk.push(['@bark.0', `M${R(-tw * 1.05)} 3Q${R(-tw * .5)} ${R(-tw * .2)} ${R(-tw * .5)} ${R(-tw * .9)}Q${R(lean * .3 - tw * .45)} ${R(-th * .5)} ${R(lean - top)} ${R(-th)}L${R(lean + top)} ${R(-th)}Q${R(lean * .3 + tw * .45)} ${R(-th * .5)} ${R(tw * .5)} ${R(-tw * .9)}Q${R(tw * .5)} ${R(-tw * .2)} ${R(tw * 1.1)} 3z`]);
    trunk.push({ s: '@bark.1', w: f2(tw * .34), op: .55, d: `M${R(-lx * tw * .3)} 0Q${R(lean * .3 - lx * tw * .28)} ${R(-th * .5)} ${R(lean - lx * top * .5)} ${R(-th)}` });
    trunk.push({ s: '@bark.2', w: f2(tw * .12), op: .6, d: `M${R(lx * tw * .3)} -6Q${R(lean * .3 + lx * tw * .3)} ${R(-th * .5)} ${R(lean + lx * top * .5)} ${R(-th + 4)}` });
    let marks = '';
    if (sp.white) {
      for (let i = 0; i < 18; i++) { const t = rr(r, .04, .95), w = (tw * (1 - t * .6)) * rr(r, .3, .7), mx = lean * t * t + rr(r, -.3, .3) * tw * (1 - t * .6); marks += `M${R(mx - w / 2)} ${R(-th * t)}h${R(w)}`; }
      trunk.push({ s: '@mark', w: 2.4, d: marks }, ['@mark', `M${R(-tw * .95)} 2q${R(tw)} -${R(tw * 1.8)} ${R(tw * 2)} 0z`, .9]);
    } else if (kind === 'pine') {
      for (let i = 0; i < 14; i++) { const t = rr(r, .05, .55), mx = lean * t * t + rr(r, -.35, .35) * tw; marks += `M${R(mx)} ${R(-th * t)}l${R(rr(r, -3, 3))} ${-R(rr(r, 6, 14))}`; }
      trunk.push({ s: '@mark', w: 2, d: marks }, { s: '@bark.2', w: f2(tw * .45), op: .5, d: `M${R(lean * .36)} ${R(-th * .6)}L${R(lean)} ${R(-th)}` });
    } else {
      for (let i = 0; i < 12; i++) { const t = rr(r, .05, .9), mx = lean * t * t + rr(r, -.35, .35) * tw * (1 - t * .5); marks += `M${R(mx)} ${R(-th * t)}q${R(rr(r, -3, 3))} ${-R(rr(r, 8, 18))} 0 ${-R(rr(r, 16, 30))}`; }
      trunk.push({ s: '@bark.1', w: 1.6, op: .6, d: marks });
    }
    // limbs by width class: thick ones stay with the trunk, thin ones sway with the crown
    const byW = (min, max) => { const m = new Map(); for (const [a, b, c, d, e, f, w] of segs) { if (w < min || w >= max) continue; const k = w > 6 ? R(w) : w > 2.5 ? f2(Math.round(w * 2) / 2) : w > 1.4 ? 1.6 : 1; m.set(k, (m.get(k) || '') + `M${R(a)} ${R(b)}Q${R(c)} ${R(d)} ${R(e)} ${R(f)}`); } return m; };
    const limbs = (min, max, paint, extra) => [...byW(min, max)].map(([w, d]) => Object.assign({ s: paint, w, d }, extra || {}));
    const topLimbs = !sp.along && !bare;   // limbs from the trunk top sway with the crown
    const thick = limbs(4, 99, sp.white ? '@limb.0' : '@bark.0');
    if (!topLimbs) trunk.push(...thick);
    const thin = limbs(0, 4, bare ? '@twig' : sp.white ? '@limb.1' : '@bark.1');
    if (bare) {
      // winter: the full twig lattice, frost on the upper edges, catkins
      crown.push(...thin);
      crown.push(...[...byW(0, 99)].map(([w, d]) => ({ s: '@frost', w: f2(Math.max(.8, w * .35)), d, op: .45, m: [1, 0, 0, 1, 0, -1], detail: w < 2 })));
      if (kind === 'birch' || kind === 'willow') crown.push({ s: '@catkin', w: 1, op: .7, d: tips.filter(t => t[2] >= 2).map(([tx, ty]) => { const L = Math.min(rr(r, 26, kind === 'willow' ? 160 : 50), -ty - 6); return L < 8 ? '' : `M${R(tx)} ${R(ty)}q${R(rr(r, -4, 4))} ${R(Math.min(L * .5, rr(r, 10, 30)))} ${R(rr(r, -6, 6))} ${R(L)}`; }).join('') });
      if (kind === 'alder') { let cat = ''; for (const [tx, ty] of tips.filter((t, i) => i % 3 === 0)) cat += `M${R(tx)} ${R(ty)}l${R(rr(r, -2, 2))} 9`; crown.push({ s: '@catkin', w: 3.2, d: cat }); }
      if (kind === 'chestnut') { let bud = ''; for (const [tx, ty] of tips.filter((t, i) => i % 2 === 0)) bud += sceneD.ell(tx, ty - 2, 2, 3); crown.push(['@catkin', bud]); }
      return { trunk, crown };
    }
    // the crown: leaf clusters top first (lower ones overlap the lit tops above)
    const cl = [], [c0, c1] = sp.clump;
    for (const [tx, ty, depth, wgt] of tips) {
      if (autumn && !sp.ever && r() < .2) continue;
      if (sp.gaps && depth >= 2 && r() < sp.gaps) continue;   // holes in the crown: limbs and sky show through
      const big = sp.gaps && r() < .18 ? rr(r, 1.25, 1.6) : 1;
      cl.push([tx + rr(r, -6, 6), ty + rr(r, -6, 4), rr(r, sp.gaps ? c0 * .6 : c0, c1) * big * (spring && !sp.ever ? .85 : 1) * wgt, Math.floor(r() * 3), sp.gaps ? rr(r, .85, 1.45) : 1, sp.gaps ? rr(r, -25, 25) : 0]);
    }
    if (sp.dome) {
      // a horse chestnut's dense dome: extra clusters fill the outline between the limb tips
      let x0 = 1e9, x1 = -1e9, y0 = 1e9; for (const c of cl) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); }
      const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + 10, ry = Math.max(60, -th - y0 + 40), cy = y0 + ry;
      for (let i = 0; i < 14; i++) { const a = rr(r, Math.PI * 1.02, Math.PI * 1.98), k = Math.sqrt(rr(r, .25, 1)); cl.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, rr(r, c0, c1) * (spring ? .85 : 1), Math.floor(r() * 3), rr(r, .9, 1.3), rr(r, -20, 20)]); }
    }
    if (!cl.length) cl.push([lean, -th, c1, 0, 1, 0]);
    for (const c of cl) c[1] = Math.min(c[1], -c[2] * .9 - 10);   // no foliage below the ground line
    cl.sort((a, b) => a[1] - b[1]);
    let minY = 0, maxY = -1e9; for (const c of cl) { minY = Math.min(minY, c[1] - c[2]); maxY = Math.max(maxY, c[1] + c[2]); }
    const cy0 = (minY + maxY) / 2;
    let bx0 = 1e9, bx1 = -1e9; for (const c of cl) { bx0 = Math.min(bx0, c[0] - c[2]); bx1 = Math.max(bx1, c[0] + c[2]); }
    const mx = (bx0 + bx1) / 2, W = Math.max(40, bx1 - bx0), H = Math.max(40, maxY - minY);
    // the dark heart of the crown behind its limbs: gaps between clusters read as depth, not sky
    if (topLimbs) crownBack.push(['@leaf.0', cl.map(([cx, cy, rad]) => sp.gaps ? sceneD.lobed(r, cx, cy + rad * .2, rad * .62, rad * .5, 7, .3) : sceneD.circ(cx, cy + rad * .1, rad * .8)).join('')], ...thick);
    else if (!sp.ever) crownBack.push(['@leaf.0', cl.filter((c, i) => i % 2).map(([cx, cy, rad]) => sceneD.circ(cx, cy + rad * .15, rad * .6)).join(''), .7]);
    else crownBack.push(['@leaf.0', cl.map(([cx, cy, rad]) => ell(cx * .85 + lean * .15, cy + rad * .2, rad * 1.1, rad * .5)).join('')]);
    crownBack.push(...thin);
    // five tone groups; each cluster takes a tone from where it sits against the light
    const alt = autumn && !sp.ever;
    const groups = [];
    for (const [cx, cy, rad, cv, wide, turn] of cl) {
      const u = (cx - mx) / W * lx, w2 = (cy0 - cy) / H, t = clamp(.42 + u * .9 + w2 * .95 + rr(r, -.14, .14), 0, .999), k = rad / sp.unit;
      const set = alt && r() < .35 ? 'leafAlt' : 'leaf', ti = Math.floor(t * 5);
      const a = (turn || 0) * D, sx = k * (wide || 1), sy = k;
      const m = [f2(Math.cos(a) * sx), f2(Math.sin(a) * sx), f2(-Math.sin(a) * sy), f2(Math.cos(a) * sy), f1(cx), f1(cy)];
      groups.push({ ti, set, m, cv });
    }
    // draw tone by tone (as K.tree's grouped <g>s), each cluster's shapes together
    for (let ti = 0; ti < 5; ti++) for (const set of ['leaf', 'leafAlt']) for (const g of groups) {
      if (g.ti !== ti || g.set !== set) continue;
      for (const s of clump(kind, g.cv, false)) {
        const f = s.t === 'F' ? `@${set}.${ti}` : s.t === 'C' ? `@${set}.${ti + 1}` : s.t === 'K' ? '#000000' : '@frost';
        crown.push(s.line ? { s: f, w: s.line, d: s.d, op: s.op, m: g.m, detail: s.detail } : { f, d: s.d, op: s.op, m: g.m, detail: s.detail });
      }
    }
    // loose single leaves round the edge of the crown, catching the light
    const loose = ['', ''];
    for (let i = 0; i < (kind === 'pine' ? 0 : 26); i++) { const [cx, cy, rad] = cl[Math.floor(r() * cl.length)], a = rr(r, -2.9, 2.9), d = rad * rr(r, .9, 1.15), L = rr(r, 7, 11) * (sp.unit / 40); loose[a * -lx > 0 ? 1 : 0] += leafD(cx + Math.sin(a) * d, cy - Math.cos(a) * d, a + rr(r, -.6, .6), L, L * .4); }
    if (loose[0]) crown.push({ f: '@leaf.2', d: loose[0], detail: true }, { f: '@leaf.4', d: loose[1], detail: true });
    if (spring && sp.blossom) { const bl = ['', '']; for (const [cx, cy, rad] of cl) for (let i = 0; i < 8; i++) { const a = rr(r, 0, Math.PI * 2), d = Math.sqrt(r()) * rad; bl[i % 2] += sceneD.circ(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr(r, 2.4, 4)); } crown.push(['@bloom.0', bl[0]], ['@bloom.1', bl[1]]); }
    if (spring && sp.candles) {
      // horse chestnut "candles": upright white flower spikes over the crown
      const c = ['', ''];
      for (const [cx, cy, rad] of cl) { if (r() < .35) continue; for (let i = 0; i < 2; i++) { const x = cx + rr(r, -.7, .7) * rad, y = cy + rr(r, -.7, .2) * rad, h = rr(r, 12, 18); c[i] += `M${R(x - 3.5)} ${R(y)}Q${R(x - 3)} ${R(y - h * .6)} ${R(x)} ${R(y - h)}Q${R(x + 3)} ${R(y - h * .6)} ${R(x + 3.5)} ${R(y)}z`; } }
      crown.push(['@bloom.0', c[0]], ['@bloom.1', c[1]]);
    }
    if (autumn && sp.candles) { let k = ''; for (const [cx, cy, rad] of cl) if (r() < .3) k += sceneD.circ(cx + rr(r, -.5, .5) * rad, cy + rad * .4, 3); crown.push(['@catkin', k]); }   // conkers in their husks
    if (spring && kind === 'birch') { let cat = ''; for (const [tx, ty] of tips.filter((t, i) => i % 4 === 0)) cat += `M${R(tx)} ${R(ty)}l${R(rr(r, -2, 2))} 10`; crown.push({ s: '@catkin', w: 2.6, d: cat }); }
    if (sp.weep) {
      // weeping willow: hanging curtains (tongues of foliage with a fringed hem), then strands over them
      const cur = ['', ''];
      for (const [cx, cy, rad] of cl) {
        if (cy < cy0 - rad * 1.2) continue;
        const w = rad * rr(r, .75, 1.05), y0 = cy - rad * .2, L = Math.min(rad * rr(r, 2, 3.6), -y0 - 8), x0 = cx + rr(r, -.4, .4) * rad, n = 5 + Math.floor(r() * 3);
        let d = `M${R(x0 - w)} ${R(y0)}Q${R(x0 - w * 1.08)} ${R(y0 + L * .55)} ${R(x0 - w * .8)} ${R(y0 + L * .85)}`;
        for (let i = 0; i <= n; i++) { const t = i / n, hx0 = x0 - w * .8 + t * w * 1.6; d += `L${R(hx0)} ${R(y0 + L * (i % 2 ? rr(r, .8, .9) : rr(r, .95, 1.08)))}`; }
        d += `Q${R(x0 + w * 1.08)} ${R(y0 + L * .55)} ${R(x0 + w)} ${R(y0)}z`;
        cur[(cx < mx) ? 1 : 0] += d;
      }
      crownBack.push(['@leaf.1', cur[0], .95], ['@leaf.2', cur[1], .95]);
      let st = '', lf = '';
      for (const [cx, cy, rad] of cl) {
        if (cy < cy0 - rad && r() < .5) continue;
        for (let i = 0; i < 3; i++) {
          const sx = cx + rr(r, -rad, rad), sy = cy + rad * rr(r, -.2, .6), L = Math.min(rr(r, 80, 200), -sy - 6), cur = rr(r, -10, 10);
          if (L < 20) continue;
          st += `M${R(sx)} ${R(sy)}q${R(cur)} ${R(L * .5)} ${R(cur * .4)} ${R(L)}`;
          // leaves down the strand: short dashes along the same curve (every other 4.5-unit step)
          const x0 = sx + cur * .2, y0 = sy + 10, qx = x0 + cur, qy = y0 + (L - 10) * .5, ex = x0 + cur * .4, ey = y0 + L - 10, n = Math.max(4, Math.round((L - 10) / 4.5));
          const at = t => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * qx + t * t * ex, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * qy + t * t * ey];
          for (let j = 0; j < n - 1; j += 2) { const a = at(j / n), b = at((j + 1) / n); lf += `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`; }
        }
      }
      crown.push({ s: '@leaf.1', w: 1.6, d: st, op: .8 }, { s: '@leaf.4', w: 3, d: lf, detail: true });
    }
    return { trunk, crown: crownBack.concat(crown), pivot: [R(lean), R(-th)] };
  };

  /* ---------- the definitions ---------- */
  const pal = (kind, extra) => {
    const L = LEAF[kind], p = { base: Object.assign({ bark: BARK[kind], limb: [mix(BARK[kind][0], '#4a403a', .55), '#4a403a'], mark: '#3a3632', twig: '#5a4f4a', frost: '#f4f8fa', catkin: '#6a3a3a', bloom: ['#fff4f6', '#f6c9d7'] }, extra || {}) };
    for (const s of ['spring', 'summer', 'autumn', 'winter']) {
      const c = L[s] || L.summer;
      p[s] = { leaf: tones(c, s === 'autumn' && kind !== 'pine'), leafAlt: s === 'autumn' && kind !== 'pine' ? altOf(c) : tones(c) };
    }
    p.winter.twig = '#5a4f4a';
    return p;
  };
  // The pivot is near the top of the trunk; the trunk lean differs per variant, so a mean pivot is used (sway is small).
  const TREES = [
    { kind: 'oak', id: 'tree.oak', size: [791, 635], pivot: [0, -120], deg: 1.6, shadow: { rx: 120, ry: 14, h: 330 }, tags: ['uk', 'heath', 'deciduous', 'broadleaf', 'oak'], extra: { mark: '#2e2620' } },
    { kind: 'birch', id: 'tree.birch', size: [336, 511], pivot: [0, -300], deg: 2.6, shadow: { rx: 70, ry: 10, h: 520 }, tags: ['uk', 'heath', 'deciduous', 'birch', 'slender'], extra: { mark: '#2c2a28', catkin: '#6a4a5a' } },
    { kind: 'pine', id: 'tree.pine', size: [398, 544], pivot: [0, -330], deg: 1.4, shadow: { rx: 90, ry: 12, h: 520 }, tags: ['uk', 'heath', 'evergreen', 'conifer', 'scots-pine'], extra: { mark: '#5a4036' }, seasonalShape: false },
    { kind: 'willow', id: 'tree.willow', size: [667, 571], pivot: [0, -140], deg: 1.8, shadow: { rx: 130, ry: 14, h: 330 }, tags: ['uk', 'waterside', 'deciduous', 'willow', 'weeping'], extra: { catkin: '#c9a84a' } },
    { kind: 'alder', id: 'tree.alder', size: [380, 430], pivot: [0, -230], deg: 2, shadow: { rx: 80, ry: 12, h: 440 }, tags: ['uk', 'waterside', 'deciduous', 'alder'], extra: { catkin: '#6a3a3a' } },
    { kind: 'chestnut', id: 'tree.horse-chestnut', size: [713, 594], pivot: [0, -110], deg: 1.2, shadow: { rx: 140, ry: 15, h: 360 }, tags: ['uk', 'green', 'deciduous', 'broadleaf', 'horse-chestnut'], extra: { catkin: '#7a4a2a', bloom: ['#fbf6ee', '#f2d8de'] } },
    { kind: 'hawthorn', id: 'tree.hawthorn', size: [435, 325], pivot: [0, -80], deg: 1.8, shadow: { rx: 80, ry: 10, h: 220 }, tags: ['uk', 'hedgerow', 'deciduous', 'hawthorn', 'blossom'], extra: { bloom: ['#fff4f6', '#f6c9d7'] } },
  ];
  for (const T of TREES) {
    defineObj({
      id: T.id, category: 'tree', size: T.size, variants: 3, seasonal: true, shapeBySeason: T.seasonalShape !== false, flippable: true,
      palette: pal(T.kind, T.extra),
      parts: ['trunk', 'crown'],
      anim: { sway: { part: 'crown', pivot: T.pivot, deg: T.deg } },
      shadow: T.shadow, reflect: true,
      tags: T.tags.concat(['kit:temperate', 'role:tree']),
      credit: `the nature kit's K.tree('${T.kind}'), ported to library shapes`,
      build(v, rnd, ctx) { const t = build(T.kind, v, rnd, ctx.season || 'summer'); return { trunk: t.trunk, crown: t.crown }; },
    });
  }
})();

/* ============================================================
   SCENE LIBRARY: trees, the east-asian kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   (variant, season).

   tree.cherry           a flowering cherry: v0 a broad spreading tree,
                         v1 an old low-limbed tree, v2 a weeping cherry.
                         Spring is the blossom (pale pink clouds over dark
                         limbs), summer green, autumn orange and red,
                         winter bare twigs with snow along the limbs.
   tree.maple-japanese   a Japanese maple: layered, fine-textured tiers on
                         a low multi-stemmed trunk. v0 green (red in
                         autumn), v1 the red-leaved form, v2 an old tall
                         tree. Star-shaped leaves at the crown's edge.

   The sun is on the LEFT. Parts: 'trunk' (the trunk and main limbs,
   still) and 'crown' (sways about the top of the trunk). Anchor: the foot
   of the trunk. The branch geometry is stable across the seasons.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const D = Math.PI / 180;
  const P = p => `${f1(p[0])} ${f1(p[1])}`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const poly = pts => 'M' + pts.map(P).join('L') + 'z';
  const stable = (id, v) => sceneRnd(sceneHash(id + '#' + v));
  const lobed = (r, cx, cy, rx, ry, n, rag) => {
    const a0 = r() * 6.283, pts = [];
    for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283, k = 1 - rag * r() * .6; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = 'M' + P(pts[0]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], b = 1.22 + rag * r() * .3; d += `Q${f1(cx + ((p[0] + q[0]) / 2 - cx) * b)} ${f1(cy + ((p[1] + q[1]) / 2 - cy) * b)} ${P(q)}`; }
    return d + 'z';
  };
  const h2 = v => Math.round(v * 2) / 2;
  const lobedC = (r, cx, cy, rx, ry, n, rag) => {
    const a0 = r() * 6.283, pts = [];
    for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283, k = 1 - rag * r() * .6; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    // whole units: a ragged leaf cluster is 8 or more across, half a unit of rounding is invisible (the crowns hold hundreds)
    const R = Math.round, PR = p => `${R(p[0])} ${R(p[1])}`;
    let d = 'M' + PR(pts[0]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], b = 1.22 + rag * r() * .3; d += `Q${R(cx + ((p[0] + q[0]) / 2 - cx) * b)} ${R(cy + ((p[1] + q[1]) / 2 - cy) * b)} ${PR(q)}`; }
    return d + 'z';
  };
  /** An opaque fill split for tile stills: every k-th subpath stays (what a tile draws), the rest is detail (full size only). */
  const thinned = (f, d, k) => { let keep = '', rest = ''; d.split(/(?=M)/).forEach((q, i) => { if (i % k === 0) keep += q; else rest += q; }); return [[f, keep], { f, d: rest, detail: true }]; };
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };

  /** Grow limbs: segments (quadratics with a width and a level) and the tips. o: spread, lk, wk, up (bias to vertical), three. */
  const grow = (r, x, y, ang, len, w, depth, o, segs, tips, lvl = 0) => {
    const bend = rr(r, -o.bend, o.bend) * D, ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    const cx = x + Math.cos(ang - bend) * len * .5, cy = y + Math.sin(ang - bend) * len * .5 + (o.sag || 0) * len;
    segs.push({ d: `M${f1(x)} ${f1(y)}Q${f1(cx)} ${f1(cy)} ${f1(ex)} ${f1(ey)}`, w, lvl, x, y, ex, ey });
    if (depth <= 0) { tips.push({ x: ex, y: ey, ang, lvl }); return; }
    if (lvl >= 1) tips.push({ x: (x + ex) / 2, y: (y + ey) / 2, ang, lvl, inner: true });
    const k = r() < o.three ? 3 : 2;
    for (let i = 0; i < k; i++) {
      let a = ang + (k === 2 ? (i ? 1 : -1) * .7 : (i - 1)) * o.spread * D * rr(r, .7, 1.25);
      a += (-Math.PI / 2 - a) * o.up;
      grow(r, ex, ey, a, len * o.lk * rr(r, .85, 1.1), w * o.wk, depth - 1, o, segs, tips, lvl + 1);
    }
  };
  /** Limb strokes by level: bark, shaded right flank, lit left edge (the flanks and the finest twigs are detail). */
  const limbs = (segs, from, to, out) => {
    for (let l = from; l <= to; l++) {
      const g = segs.filter(q => q.lvl === l); if (!g.length) continue;
      const w = g.reduce((a, q) => a + q.w, 0) / g.length, d = g.map(q => q.d).join('');
      out.push({ s: '@bark.0', w, d, detail: l >= 2 }, { s: '@bark.1', w: w * .45, op: .85, d, m: [1, 0, 0, 1, w * .26, 0], detail: true });
      if (w > 3) out.push({ s: '@bark.2', w: w * .22, op: .5, d, m: [1, 0, 0, 1, -w * .28, 0], detail: true });
    }
  };
  /** A trunk with root flare, as a filled outline (bottom width w0, top w1, height th, a slight lean). */
  const trunkD = (w0, w1, th, lean) => `M${f1(-w0 * .9)} 0Q${f1(-w0 * .45)} ${f1(-th * .12)} ${f1(-w0 * .5)} ${f1(-th * .3)}L${f1(lean - w1 / 2)} ${f1(-th)}H${f1(lean + w1 / 2)}L${f1(w0 * .5)} ${f1(-th * .3)}Q${f1(w0 * .45)} ${f1(-th * .12)} ${f1(w0 * .9)} 0z`;
  /** Crown clusters toned by where they sit against the light (upper left lit), sorted shade to light.
      Tile stills (LOD < .5) draw a plain ellipse for every third cluster in its tone instead (the clusters and highlights are detail): each
      ellipse is 0.6 of the cluster's radii, inside its ragged outline (whose points sit at 0.7 or more), and is drawn just under
      its own tone, so the full-size picture is unchanged. */
  const clusters = (r, list, cx, cy, W, H, n6, o = {}) => {
    const tone = ['', '', '', '', '', ''], hi = ['', '', '', '', '', ''], core = ['', '', '', '', '', ''];
    list.forEach((c, ci) => {
      const s = -(c.x - cx) / W * .9 - (c.y - cy) / H * .9 + rr(r, -.35, .35);
      const t = Math.max(0, Math.min(5, Math.round(2.4 + s * 2.6)));
      const ex = Math.round(c.rx * .6), ey = Math.round(c.ry * .6);
      if (ci % 3 === 0 && ex >= 2 && ey >= 2) core[t] += `M${Math.round(c.x) - ex} ${Math.round(c.y)}a${ex} ${ey} 0 1 0 ${2 * ex} 0a${ex} ${ey} 0 1 0 ${-2 * ex} 0`;
      tone[t] += lobedC(r, c.x, c.y, c.rx, c.ry, o.n || 9, o.rag || .3);
      if (t < 5 && r() < (o.hi || .7)) hi[t + 1] += lobedC(r, c.x - c.rx * .22, c.y - c.ry * .28, c.rx * .55, c.ry * .5, 7, o.rag || .3);
    });
    // interleave: tone t, then the highlights of the clusters one tone darker (drawn in tone t)
    const res = [];
    for (let t = 0; t < 6; t++) { res.push([`@${n6}.${t}`, core[t]], { f: `@${n6}.${t}`, d: tone[t], detail: true }); if (hi[t]) res.push({ f: `@${n6}.${t}`, d: hi[t], op: .95, detail: true }); }
    return res;
  };

  /* ---------- tree.cherry ---------- */
  const CH = {
    trunk: ['#3e2e2a', '#2a1e1c', '#5e4a42'],
    blossom: ['#b46a86', '#d08ca6', '#e6aec0', '#f2c6d2', '#f9dce4', '#fff1f4'],
    summer: ['#244a26', '#2f5e2c', '#3f7434', '#55893e', '#73a24c', '#9cc066'],
    autumn: ['#6a2a1c', '#943a22', '#b8542a', '#d47632', '#e89c40', '#f2c25a'],
  };
  defineObj({
    id: 'tree.cherry-blossom', category: 'tree', size: [340, 300], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['trunk', 'crown'],
    palette: Object.assign({ base: { bark: CH.trunk, lent: '#7a6a62', twig: '#4a3a34', snow: ['#f4f7fb', '#d8e2ee'], petal: ['#f6cdd8', '#fbe6ec'], ground: '#5a4c3a' } }, bySeason({
      leaf: { spring: CH.blossom, summer: CH.summer, autumn: CH.autumn, winter: CH.summer },
      fresh: { spring: ['#6a8a3a', '#a0603a'], summer: ['#3f7434', '#55893e'], autumn: ['#b8542a', '#e89c40'], winter: ['#4a3a34', '#4a3a34'] },
    })),
    anim: { sway: { part: 'crown', pivot: [0, -78], deg: 1.4 } },
    shadow: { rx: 130, ry: 12, h: 260 }, reflect: true,
    tags: ['japan', 'east-asia', 'cherry', 'sakura', 'blossom', 'park', 'temple', 'deciduous', 'kit:east-asian', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the east-asian kit',
    build(v, _r, ctx) {
      const r = stable('tree.cherry', v), s = ctx.season, trunk = [], crown = [];
      const TH = 78, segs = [], tips = [];
      const cfg = [
        { w0: 30, w1: 20, lean: 4, limbs: [-158, -128, -100, -72, -40, -18], len: 78, o: { spread: 30, lk: .74, wk: .62, up: .12, three: .25, bend: 12 }, depth: 3 },
        { w0: 38, w1: 24, lean: -6, limbs: [-170, -140, -110, -64, -30, -8], len: 96, o: { spread: 26, lk: .7, wk: .6, up: .05, three: .2, bend: 16, sag: .06 }, depth: 3 },
        { w0: 26, w1: 18, lean: 2, limbs: [-140, -112, -84, -58, -34], len: 70, o: { spread: 28, lk: .78, wk: .62, up: .3, three: .2, bend: 10 }, depth: 2 },
      ][v];
      trunk.push(['@ground', ell(0, 0, 40, 4), .45]);
      trunk.push(['@bark.0', trunkD(cfg.w0, cfg.w1, TH + 4, cfg.lean)], ['@bark.1', `M${f1(cfg.w0 * .1)} 0L${f1(cfg.lean + cfg.w1 * .1)} ${-TH - 4}H${f1(cfg.lean + cfg.w1 / 2)}L${f1(cfg.w0 * .5)} ${f1(-TH * .3)}Q${f1(cfg.w0 * .45)} ${f1(-TH * .12)} ${f1(cfg.w0 * .9)} 0z`, .7]);
      let lent = '';   // cherry bark: horizontal lenticel bands
      for (let i = 0; i < 12; i++) { const y = -6 - i * 6.2 - r() * 2, w = cfg.w0 * (1 - i / 16) * .4; lent += `M${f1(cfg.lean * i / 12 - w + r() * 3)} ${f1(y)}h${f1(w * rr(r, .6, 1.3))}`; }
      trunk.push({ s: '@lent', w: 1.2, op: .6, d: lent, detail: true });
      for (const a of cfg.limbs) grow(r, cfg.lean, -TH, (a + rr(r, -6, 6)) * D, cfg.len * rr(r, .85, 1.1), cfg.w1 * .62, cfg.depth, cfg.o, segs, tips);
      limbs(segs, 0, 0, trunk);
      // winter: snow lying along the upper side of the bigger limbs (drawn on the trunk part, with the limbs)
      const bare = s === 'winter';
      const twigs = [];
      if (bare) {
        let tw = '';
        for (const t of tips) if (!t.inner) for (let k = 0; k < 3; k++) { const a = t.ang + rr(r, -.7, .7), l = rr(r, 10, 22); tw += `M${f1(t.x)} ${f1(t.y)}q${f1(Math.cos(a) * l * .5 + 2)} ${f1(Math.sin(a) * l * .5)} ${f1(Math.cos(a) * l)} ${f1(Math.sin(a) * l)}`; }
        twigs.push({ s: '@twig', w: .9, d: tw, detail: true });
      }
      const crownLimbs = [];
      limbs(segs, 1, 4, crownLimbs);
      if (bare) {
        const big = segs.filter(q => q.lvl <= 1).map(q => q.d).join('');
        crownLimbs.push({ s: '@snow.0', w: 2.2, op: .9, d: big, m: [1, 0, 0, 1, -.5, -3.2] });
        trunk.push({ s: '@snow.0', w: 2.6, op: .9, d: segs.filter(q => q.lvl === 0).map(q => q.d).join(''), m: [1, 0, 0, 1, -.5, -4.6] });
      }
      // the crown
      const list = [], W = 300, cy = -TH - 90;
      if (v === 2) {
        // weeping: strands fall from the tips; blossom, leaves or bare twigs along them
        let st = '';
        const dots = ['', '', '', '', '', ''];
        for (const t of tips) {
          const ns = t.inner ? 1 : 2;
          for (let k = 0; k < ns; k++) {
            const x0 = t.x, y0 = t.y, dx = rr(r, -14, 14) + Math.cos(t.ang) * 10, L = Math.min(-y0 - 18, rr(r, 70, 150));
            st += `M${f1(x0)} ${f1(y0)}q${f1(dx)} ${f1(-6)} ${f1(dx * 1.4)} ${f1(L)}`;
            if (!bare) for (let y = 6; y < L; y += 9.5) {
              const q = y / L, x = x0 + dx * (2 * q * (1 - q) + 1.4 * q * q) + rr(r, -2.5, 2.5), yy = y0 - 6 * 2 * q * (1 - q) + L * q * q + (y - L * q * q) * .0;
              const tt = Math.max(0, Math.min(5, Math.round(3.2 - (x / W) * 2.2 - q * 1.6 + rr(r, -1, 1))));
              if (s === 'autumn' && r() < .45) continue;
              { const yy2 = y0 + L * q + 2, rx = rr(r, 3, 4.4); dots[tt] += `M${h2(x - rx)} ${h2(yy2)}a${h2(rx)} ${h2(rx * .85)} 0 1 0 ${h2(2 * rx)} 0a${h2(rx)} ${h2(rx * .85)} 0 1 0 ${h2(-2 * rx)} 0`; }
            }
          }
          if (!bare) list.push({ x: t.x, y: t.y + 4, rx: rr(r, 13, 20), ry: rr(r, 9, 14) });
        }
        crown.push(...crownLimbs, { s: '@twig', w: .8, op: .85, d: st });
        if (!bare) { crown.push(...clusters(r, list, 0, cy, W, 200, 'leaf', { n: 8, rag: .35, hi: .5 })); for (let t = 0; t < 6; t++) crown.push(...thinned(`@leaf.${t}`, dots[t], 4)); }
        crown.push(...twigs);
      } else {
        if (!bare) {
          const thin = s === 'autumn' ? .78 : 1, u = (s === 'spring' ? 1.12 : 1) * (v === 1 ? 1.3 : 1);
          for (const t of tips) {
            if (r() > thin) continue;
            const big = t.inner ? .7 : 1;
            list.push({ x: t.x + rr(r, -6, 6), y: t.y + rr(r, -2, 8), rx: rr(r, 26, 36) * big * u, ry: rr(r, 18, 26) * big * u });
            if (!t.inner && r() < .45) list.push({ x: t.x + rr(r, -20, 20), y: t.y - rr(r, 4, 14), rx: rr(r, 14, 22) * u, ry: rr(r, 11, 16) * u });
          }
          list.sort((a, b) => a.y - b.y);
          crown.push(...crownLimbs);   // the limbs show in the gaps and under the crown
          crown.push(...clusters(r, list, 0, cy, W, 200, 'leaf', { n: 8, rag: s === 'spring' ? .45 : .3, hi: .55 }));
          if (s === 'spring') {   // a few fresh bronze-green leaves, petals drifting and lying under the tree
            let fr = '', pt = '', pg = '';
            for (let i = 0; i < 22; i++) { const c = list[(r() * list.length) | 0]; fr += ell(c.x + rr(r, -c.rx, c.rx), c.y + rr(r, -c.ry, c.ry) * .6, 1.8, 1.2); }
            for (let i = 0; i < 14; i++) pt += ell(rr(r, -150, 150), rr(r, -TH - 40, -10), 1.4, 1);
            for (let i = 0; i < 26; i++) pg += ell(rr(r, -120, 120), rr(r, -3, 2), rr(r, 1.2, 2.2), .9);
            crown.push({ f: '@fresh.0', d: fr, op: .8, detail: true }, { f: '@petal.1', d: pt, op: .9, detail: true });
            trunk.push({ f: '@petal.0', d: pg, op: .9, detail: true });
          }
          if (s === 'autumn') { let lg = ''; for (let i = 0; i < 30; i++) lg += ell(rr(r, -110, 110), rr(r, -3, 2), 1.8, .9); trunk.push({ f: '@fresh.0', d: lg, op: .8, detail: true }); }
        } else crown.push(...crownLimbs);
        crown.push(...twigs);
      }
      return { trunk, crown };
    },
  });

  /* ---------- tree.maple-japanese ---------- */
  const MP = {
    gSpring: ['#3c6428', '#4e7c2e', '#689a38', '#86b444', '#a8cc5a', '#cce47c'],
    gSummer: ['#1e4422', '#2a5a28', '#3a7030', '#4e863a', '#6aa04a', '#8cba5e'],
    gAutumn: ['#5e1012', '#84181a', '#a82420', '#cc3a24', '#e65e2c', '#f49040'],
    rSpring: ['#4a1620', '#62202a', '#7c2c34', '#9a3c40', '#b85450', '#d27464'],
    rSummer: ['#2e1018', '#40161e', '#541e26', '#6a2830', '#80363a', '#9a4a48'],
    rAutumn: ['#6a0a10', '#900e14', '#b4181a', '#d42a22', '#ee4a2c', '#ff7a40'],
  };
  /** A small star-shaped (palmate) maple leaf, r about 3.5. */
  const star = (x, y, rad, rot) => {
    let d = '';
    for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, k = i % 2 ? rad * .4 : rad * (i === 0 ? 1 : .85); d += (i ? 'L' : 'M') + `${h2(x + Math.sin(a) * k)} ${h2(y - Math.cos(a) * k)}`; }
    return d + 'z';
  };
  defineObj({
    id: 'tree.maple-momiji', category: 'tree', size: [280, 220], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['trunk', 'crown'],
    palette: Object.assign({ base: { bark: ['#5a5048', '#3e3630', '#7e746a'], twig: '#4e4038', snow: ['#f4f7fb', '#d8e2ee'], ground: '#5a4c3a' } }, bySeason({
      leaf: { spring: MP.gSpring, summer: MP.gSummer, autumn: MP.gAutumn, winter: MP.gSummer },
      red: { spring: MP.rSpring, summer: MP.rSummer, autumn: MP.rAutumn, winter: MP.rSummer },
      fallen: { spring: ['#86b444', '#5a4c3a'], summer: ['#4e863a', '#5a4c3a'], autumn: ['#cc3a24', '#f49040'], winter: ['#6a5a48', '#5a4c3a'] },
    })),
    anim: { sway: { part: 'crown', pivot: [0, -40], deg: 1.6 } },
    shadow: { rx: 110, ry: 10, h: 200 }, reflect: true,
    tags: ['japan', 'east-asia', 'maple', 'momiji', 'garden', 'temple', 'autumn', 'deciduous', 'kit:east-asian', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the east-asian kit',
    build(v, _r, ctx) {
      const r = stable('tree.maple-japanese', v), s = ctx.season, trunk = [], crown = [];
      const TH = 40, segs = [], tips = [];
      const slot = v === 1 ? 'red' : 'leaf';
      const cfg = [
        { w0: 20, w1: 13, stems: [-128, -96, -62], len: 62, o: { spread: 34, lk: .76, wk: .64, up: -.1, three: .35, bend: 18, sag: .05 }, depth: 3, W: 260 },
        { w0: 16, w1: 11, stems: [-140, -104, -70, -40], len: 54, o: { spread: 36, lk: .74, wk: .62, up: -.15, three: .35, bend: 20, sag: .07 }, depth: 3, W: 240 },
        { w0: 22, w1: 14, stems: [-118, -88, -60], len: 80, o: { spread: 30, lk: .74, wk: .62, up: .05, three: .3, bend: 16, sag: .04 }, depth: 3, W: 260 },
      ][v];
      trunk.push(['@ground', ell(0, 0, 34, 3.5), .45]);
      trunk.push(['@bark.0', trunkD(cfg.w0, cfg.w1, TH + 3, 2)], ['@bark.1', `M${f1(cfg.w0 * .15)} 0L${f1(2 + cfg.w1 * .1)} ${-TH - 3}H${f1(2 + cfg.w1 / 2)}L${f1(cfg.w0 * .5)} ${f1(-TH * .3)}Q${f1(cfg.w0 * .45)} ${f1(-TH * .12)} ${f1(cfg.w0 * .9)} 0z`, .7]);
      trunk.push({ s: '@bark.2', w: 1.4, op: .5, d: `M${f1(-cfg.w0 * .3)} -4Q${f1(-cfg.w0 * .2)} ${f1(-TH * .5)} ${f1(-cfg.w1 * .25 + 2)} ${-TH}` });
      for (const a of cfg.stems) grow(r, 2, -TH, (a + rr(r, -5, 5)) * D, cfg.len * rr(r, .9, 1.1), cfg.w1 * .66, cfg.depth, cfg.o, segs, tips);
      limbs(segs, 0, 0, trunk);
      const crownLimbs = [];
      limbs(segs, 1, 4, crownLimbs);
      const bare = s === 'winter';
      if (bare) {
        let tw = '';
        for (const t of tips) for (let k = 0; k < (t.inner ? 2 : 4); k++) { const a = t.ang + rr(r, -.8, .8), l = rr(r, 8, 18); tw += `M${f1(t.x)} ${f1(t.y)}q${f1(Math.cos(a) * l * .5)} ${f1(Math.sin(a) * l * .5 - 2)} ${f1(Math.cos(a) * l)} ${f1(Math.sin(a) * l)}`; }
        crown.push(...crownLimbs, { s: '@twig', w: .8, d: tw, detail: true }, { s: '@snow.0', w: 2, op: .9, d: segs.filter(q => q.lvl <= 1).map(q => q.d).join(''), m: [1, 0, 0, 1, -.4, -2.8] });
        let lg = ''; for (let i = 0; i < 16; i++) lg += ell(rr(r, -90, 90), rr(r, -2, 2), 2, .9);
        trunk.push(['@fallen.0', lg, .8]);
        return { trunk, crown };
      }
      // layered tiers: flattened, finely ragged clusters, many of them
      const list = [];
      for (const t of tips) {
        const n = t.inner ? 1 : 2;
        for (let k = 0; k < n; k++) list.push({ x: t.x + rr(r, -10, 10), y: t.y + rr(r, -3, 5), rx: rr(r, 18, 28) * (t.inner ? .8 : 1), ry: rr(r, 8, 12) * (t.inner ? .8 : 1) });
      }
      list.sort((a, b) => a.y - b.y);
      crown.push(...crownLimbs.filter((_, i) => i < 3));
      crown.push(...clusters(r, list, 0, -TH - 70, cfg.W, 140, slot, { n: 10, rag: .5, hi: .5 }));
      crown.push(...crownLimbs.slice(3));
      // star leaves along the crown edge (the lit tones on the left and top, the darker on the right)
      const st = ['', ''];
      for (const c of list) if (r() < .5) {
        const a = rr(r, 0, 6.28), x = c.x + Math.cos(a) * c.rx * 1.05, y = c.y + Math.sin(a) * c.ry * 1.1;
        st[x < 0 || y < -TH - 90 ? 1 : 0] += star(x, y, rr(r, 3, 4.2), rr(r, -.6, .6));
      }
      crown.push({ f: `@${slot}.3`, d: st[0], detail: true }, { f: `@${slot}.5`, d: st[1], detail: true });
      if (s === 'autumn' || s === 'spring') { let lg = ''; for (let i = 0; i < (s === 'autumn' ? 18 : 5); i++) lg += star(rr(r, -100, 100), rr(r, -3, 1), 2.6, rr(r, 0, 6)); trunk.push({ f: '@fallen.0', d: lg, op: .9, detail: true }); }
      return { trunk, crown };
    },
  });
})();

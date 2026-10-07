/* ============================================================
   SCENE LIBRARY: structures, the east-asian kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   (variant, season).

   structure.torii          a shrine gateway: two pillars leaning in a
                            little, the tie beam through them, the curved
                            top lintel over a second lintel, the central
                            strut, black sleeves at the feet. v0 vermilion
                            with a black cap, v1 grey stone, v2 plain
                            timber with a straight lintel. No plaque text.
   structure.lantern-stone  a stone garden lantern: v0 a tall post lantern
                            (pedestal, shaft, platform, fire box, curled
                            umbrella roof, jewel), v1 a low snow-viewing
                            lantern on three legs with a wide roof, v2 an
                            old mossy post lantern. The fire box glows at
                            dusk (glow 'lamp'), its flame flickers.

   Snow caps every top in winter; grass and moss change with the season.
   Lit from the LEFT. Anchor: the ground at the middle.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const P = p => `${f1(p[0])} ${f1(p[1])}`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const poly = pts => 'M' + pts.map(P).join('L') + 'z';
  const stable = (id, v) => sceneRnd(sceneHash(id + '#' + v));
  const lobed = (r, cx, cy, rx, ry, n, rag) => {
    const a0 = r() * 6.283, pts = [];
    for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283, k = 1 - rag * r() * .6; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = 'M' + P(pts[0]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], b = 1.22 + rag * r() * .3; d += `Q${f1(cx + ((p[0] + q[0]) / 2 - cx) * b)} ${f1(cy + ((p[1] + q[1]) / 2 - cy) * b)} ${P(q)}`; }
    return d + 'z';
  };
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  /** Grass tufts around a foot (seasonal). */
  const tufts = (r, x, w, n) => { let d = ''; for (let i = 0; i < n; i++) { const tx = x + rr(r, -w, w), h = rr(r, 4, 9); d += `M${f1(tx - 3)} 0q${f1(rr(r, -2, 2))} ${f1(-h * .6)} ${f1(rr(r, -2, 2))} ${f1(-h)}q1 ${f1(h * .5)} ${f1(rr(r, 3, 5))} ${f1(h)}z`; } return d; };

  /* ---------- structure.torii ---------- */
  defineObj({
    id: 'structure.torii', category: 'structure', size: [270, 215], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: {
      pillar: ['#c8402a', '#9a9890', '#a8885e'], pillarD: ['#8e2a1a', '#74726a', '#7a6040'], pillarL: ['#e0644a', '#b8b6ae', '#c4a47a'],
      cap: ['#1e1c1c', '#7e7c74', '#8a6c46'], capL: ['#4a4644', '#a8a69e', '#b08e62'], sleeve: ['#1e1c1c', '#6a6860', '#3e3226'], base: ['#9a968a', '#7a766c', '#b8b4a8'],
      snow: ['#f6f8fc', '#c8d4e4'], ground: '#5a5040', speck: '#5a5850',
    } }, bySeason({
      grass: { spring: ['#5a8a3a', '#7aa64a'], summer: ['#3e7030', '#5a8c3c'], autumn: ['#8a7a3a', '#a8904a'], winter: ['#6a6a50', '#7a7a5e'] },
    })),
    shadow: { rx: 120, ry: 8, h: 200 }, reflect: true,
    tags: ['japan', 'east-asia', 'shrine', 'torii', 'gate', 'signature', 'kit:east-asian', 'role:building-mid'],
    credit: 'drawn for the east-asian kit',
    build(v, _r, ctx) {
      const r = stable('structure.torii', v), s = ctx.season, body = [];
      const pc = `@pillar.${v}`, pd = `@pillarD.${v}`, pl = `@pillarL.${v}`, cp = `@cap.${v}`, cl = `@capL.${v}`;
      const H = 200, xb = 76, xt = 70, wb = 14, wt = 11.5, ny = -148;
      body.push(['@ground', ell(0, 0, 120, 4), .4]);
      // the pillars (a slight inward lean), shaded right flank, lit left edge
      for (const sd of [-1, 1]) {
        const b = sd * xb, t = sd * xt;
        body.push([pc, poly([[b - wb / 2, 0], [t - wt / 2, -H + 16], [t + wt / 2, -H + 16], [b + wb / 2, 0]])]);
        body.push([pd, poly([[b + wb * .08, 0], [t + wt * .08, -H + 16], [t + wt / 2, -H + 16], [b + wb / 2, 0]]), .75], [pl, poly([[b - wb / 2, 0], [t - wt / 2, -H + 16], [t - wt * .28, -H + 16], [b - wb * .28, 0]]), .6]);
        if (v !== 2) body.push([`@sleeve.${v}`, poly([[b - wb / 2 - 2, 0], [b - wb / 2 - 1.6, -16], [b + wb / 2 + 1.6, -16], [b + wb / 2 + 2, 0]])]);
        body.push([`@base.${v}`, rect(b - wb / 2 - 5, -3, wb + 10, 3)]);
        if (v === 1) { let sp = ''; for (let i = 0; i < 26; i++) sp += ell(b + rr(r, -5, 5) + (t - b) * (i / 26), -6 - i * 7, .8, .6); body.push(['@speck', sp, .5]); }
      }
      // the tie beam (through the pillars, ends projecting on v0 and v1), the strut, the second lintel
      const nx = v === 2 ? xt + 8 : xt + 26;
      body.push([pc, rect(-nx, ny - 9, nx * 2, 9)], [pd, rect(-nx, ny - 2.6, nx * 2, 2.6), .7], [pl, rect(-nx, ny - 9, nx * 2, 1.8), .6]);
      const sy = v === 2 ? -H + 22 : -H + 30;
      if (v !== 2) body.push([pc, rect(-5, sy, 10, ny - 9 - sy)], [pd, rect(1.5, sy, 3.5, ny - 9 - sy), .7]);
      // the top: v0/v1 the curved cap over the second lintel; v2 a straight log lintel with round ends
      if (v === 2) {
        body.push([pc, rect(-xt - 22, -H + 8, (xt + 22) * 2, 14)], [pd, rect(-xt - 22, -H + 17, (xt + 22) * 2, 5), .7], [pl, rect(-xt - 22, -H + 8, (xt + 22) * 2, 2.4), .7], [cp, ell(-xt - 22, -H + 15, 3, 7)], [cp, ell(xt + 22, -H + 15, 3, 7), .8]);
      } else {
        body.push([pc, `M${-xt - 32} ${-H + 18}Q0 ${-H + 26} ${xt + 32} ${-H + 18}V${-H + 29}Q0 ${-H + 36} ${-xt - 32} ${-H + 29}z`], [pd, `M${-xt - 32} ${-H + 26}Q0 ${-H + 33} ${xt + 32} ${-H + 26}V${-H + 29}Q0 ${-H + 36} ${-xt - 32} ${-H + 29}z`, .6]);
        body.push([cp, `M-134 ${-H - 2}Q-70 ${-H + 10} 0 ${-H + 10}Q70 ${-H + 10} 134 ${-H - 2}L126 ${-H + 12}Q70 ${-H + 20} 0 ${-H + 20}Q-70 ${-H + 20} -126 ${-H + 12}z`]);
        body.push([cl, `M-134 ${-H - 2}Q-70 ${-H + 10} 0 ${-H + 10}Q70 ${-H + 10} 134 ${-H - 2}L133 ${-H + 1}Q70 ${-H + 13} 0 ${-H + 13}Q-70 ${-H + 13} -133 ${-H + 1}z`, .7]);
        if (v === 0) body.push([pc, `M-128 ${-H + 12}Q-70 ${-H + 20} 0 ${-H + 20}Q70 ${-H + 20} 128 ${-H + 12}L127 ${-H + 15}Q70 ${-H + 23} 0 ${-H + 23}Q-70 ${-H + 23} -127 ${-H + 15}z`]);
      }
      // grass at the feet (seasonal), snow on every top in winter
      for (const sd of [-1, 1]) body.push(['@grass.0', tufts(r, sd * xb, 14, 7)], ['@grass.1', tufts(r, sd * xb + 4, 10, 4)]);
      if (s === 'winter') {
        body.push(v === 2 ? ['@snow.0', `M${-xt - 22} ${-H + 9}q${xt + 22} -5 ${(xt + 22) * 2} 0v1.6h${-(xt + 22) * 2}z`] : ['@snow.0', `M-133 ${-H - 2.5}Q-70 ${-H + 9} 0 ${-H + 9}Q70 ${-H + 9} 133 ${-H - 2.5}L130 ${-H - 5}Q70 ${-H + 4} 0 ${-H + 4}Q-70 ${-H + 4} -130 ${-H - 5}z`]);
        body.push(['@snow.0', `M${-nx} ${ny - 9}q${nx} -3 ${nx * 2} 0v1.4h${-nx * 2}z`], ['@snow.0', ell(-xb, -1, 14, 2.5) + ell(xb, -1, 14, 2.5)], ['@snow.1', `M${-xt - 30} ${-H + 4}h60v1h-60z`, .4]);
      }
      return { body };
    },
  });

  /* ---------- structure.lantern-stone ---------- */
  defineObj({
    id: 'structure.lantern-stone-garden', category: 'structure', size: [64, 96], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'flame', 'lit'],
    palette: Object.assign({ base: {
      stone: ['#9e9a8e', '#7a766c', '#bcb8ac', '#5e5a52'], old: ['#8a867a', '#666258', '#a8a498', '#4e4a42'], glow: ['#2a2622', '#3a342c'], fire: '#4a3a2a',
      halo: '#ffcf7a', snow: ['#f6f8fc', '#c8d4e4'], ground: '#5a5040',
    } }, bySeason({
      moss: { spring: ['#6a8a3a', '#8aa84a'], summer: ['#4e7a34', '#6a9440'], autumn: ['#7a7a3a', '#9a8c44'], winter: ['#5a6448', '#6a7258'] },
      grass: { spring: ['#5a8a3a', '#7aa64a'], summer: ['#3e7030', '#5a8c3c'], autumn: ['#9a5a2a', '#c07a34'], winter: ['#6a6a50', '#7a7a5e'] },
    })),
    night: { glow: { lamp: '#ffc870' }, on: .9 },
    anim: { flicker: { part: 'flame', op: [.65, 1], period: 1.6 } },
    shadow: { rx: 22, ry: 4, h: 80 }, reflect: true,
    tags: ['japan', 'east-asia', 'garden', 'temple', 'shrine', 'lantern', 'stone', 'kit:east-asian', 'role:street'],
    credit: 'drawn for the east-asian kit',
    build(v, _r, ctx) {
      const r = stable('structure.lantern-stone', v), s = ctx.season, body = [], flame = [], lit = [];
      const st = v === 2 ? '@old' : '@stone';
      const S = k => `${st}.${k}`;
      body.push(['@ground', ell(0, 0, 26, 3), .45]);
      /** The umbrella roof: hexagonal in elevation, curled tips (warabi), a jewel on top. Returns its top y. */
      const kasa = (y, w, h) => {
        body.push([S(0), `M${f1(-w)} ${f1(y)}Q${f1(-w - 3)} ${f1(y - 4)} ${f1(-w + 1)} ${f1(y - 6)}L${f1(-w * .2)} ${f1(y - h)}H${f1(w * .2)}L${f1(w - 1)} ${f1(y - 6)}Q${f1(w + 3)} ${f1(y - 4)} ${f1(w)} ${f1(y)}Q0 ${f1(y - 3)} ${f1(-w)} ${f1(y)}z`]);
        body.push([S(1), `M0 ${f1(y - h)}H${f1(w * .2)}L${f1(w - 1)} ${f1(y - 6)}Q${f1(w + 3)} ${f1(y - 4)} ${f1(w)} ${f1(y)}Q${f1(w * .5)} ${f1(y - 2.4)} 0 ${f1(y - 2.2)}z`, .55], { s: S(2), w: 1, op: .7, d: `M${f1(-w + 1)} ${f1(y - 6)}L${f1(-w * .2)} ${f1(y - h)}` }, { s: S(3), w: .8, op: .5, d: `M${f1(-w)} ${f1(y)}Q0 ${f1(y - 3)} ${f1(w)} ${f1(y)}` });
        body.push([S(0), rect(-w * .2, y - h - 3, w * .4, 3)], [S(0), `M-3.4 ${f1(y - h - 3)}q-1 -5 3.4 -9q4.4 4 3.4 9z`], [S(2), `M-2 ${f1(y - h - 5)}q0 -3 2 -5.5q-.6 3 -.4 5.5z`, .7]);
        if (s === 'winter') body.push(['@snow.0', `M${f1(-w + 2)} ${f1(y - 6.5)}L${f1(-w * .2)} ${f1(y - h - 1)}H${f1(w * .2)}L${f1(w - 2)} ${f1(y - 6.5)}q${f1(-w * .5)} 3 ${f1(-w + 2)} 1.5q${f1(-w * .5)} 1.5 ${f1(-w + 2)} -1.5z`], ['@snow.1', `M0 ${f1(y - h - 1)}H${f1(w * .2)}L${f1(w - 2)} ${f1(y - 6.5)}q${f1(-w * .5)} 3 ${f1(-w + 2)} 1.5z`, .5]);
        return y - h - 12;
      };
      /** The fire box: a block with a lit window (glow) and the flame part. */
      const box = (y, w, h) => {
        body.push([S(0), rect(-w / 2, y - h, w, h)], [S(1), rect(w * .2, y - h, w * .3, h), .55], { f: '@glow.0', d: rect(-w * .26, y - h * .78, w * .52, h * .6), glow: 'lamp' }, { s: S(3), w: .8, op: .6, d: `M0 ${f1(y - h * .78)}v${f1(h * .6)}` });
        flame.push({ f: '@fire', d: `M0 ${f1(y - h * .26)}q${f1(-w * .12)} ${f1(-h * .14)} 0 ${f1(-h * .34)}q${f1(w * .12)} ${f1(h * .2)} 0 ${f1(h * .34)}z`, glow: 'lamp' });
        lit.push({ f: { rad: [[0, '@halo', .5], [1, '@halo', 0]], cx: 0, cy: y - h * .5, r: w * 1.8 }, d: rect(-w * 1.8, y - h * .5 - w * 1.8, w * 3.6, w * 3.6) });
      };
      if (v === 1) {
        // snow-viewing lantern: three curved legs, a low box, a wide roof
        body.push({ s: S(3), w: 3.4, op: .8, d: 'M1 -22l1.4 15' }, { s: S(0), w: 4.6, d: 'M-8 -22q-6 10 -13 21M8 -22q6 10 13 21' }, { s: S(2), w: 1.4, op: .6, d: 'M-9 -21q-6 10 -13 20' });
        body.push([S(0), rect(-14, -26, 28, 5)], [S(1), rect(4, -26, 10, 5), .5]);
        box(-26, 22, 14);
        kasa(-40, 31, 12);
      } else {
        const k = v === 2 ? 1.12 : 1;
        // pedestal, shaft with its middle band, the platform
        body.push([S(0), `M-15 0L-12 ${f1(-8 * k)}H12L15 0z`], [S(1), `M4 0L4 ${f1(-8 * k)}H12L15 0z`, .5], [S(2), rect(-13, -8 * k - 2, 26, 2), .8]);
        const sh0 = -8 * k - 2, sh1 = -42 * k;
        body.push([S(0), rect(-5, sh1, 10, sh0 - sh1)], [S(1), rect(1.5, sh1, 3.5, sh0 - sh1), .6], [S(2), rect(-6.5, (sh0 + sh1) / 2 - 2, 13, 4)], [S(1), rect(-6.5, (sh0 + sh1) / 2 + 1, 13, 1), .6]);
        body.push([S(0), `M-10 ${f1(sh1)}L-13 ${f1(sh1 - 7)}H13L10 ${f1(sh1)}z`], [S(1), `M3 ${f1(sh1)}L4 ${f1(sh1 - 7)}H13L10 ${f1(sh1)}z`, .5]);
        box(sh1 - 7, 18, 17 * k);
        kasa(sh1 - 7 - 17 * k, 21 * k, 12);
        if (s === 'winter') body.push(['@snow.0', `M-13 ${f1(sh1 - 7.4)}q13 -2.4 26 0v1h-26z`]);
      }
      // moss on the old lantern (and a little on the others), grass at the foot
      let ms = '';
      const nm = v === 2 ? 9 : 3;
      for (let i = 0; i < nm; i++) ms += lobed(r, rr(r, -12, 10), -rr(r, 1, v === 2 ? 70 : 8), rr(r, 2.5, 5), rr(r, 1.4, 2.6), 6, .4);
      body.push(['@moss.0', ms, .9], ['@grass.0', tufts(r, 0, 20, 8)], ['@grass.1', tufts(r, 4, 16, 5)]);
      return { body, flame, lit };
    },
  });
})();

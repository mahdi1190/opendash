/* ============================================================
   SCENE LIBRARY: plants, the tropical kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   (variant, season).

   plant.palm-coconut   a coconut palm: a curved ringed trunk, a crown of
                        pinnate fronds in depth, nuts, dead fronds below
   plant.banana         a banana clump: pseudostems, wind-torn paddle
                        leaves, a fruit bunch with its purple bell
   plant.frangipani     a frangipani: stubby candelabra branches, leaf
                        rosettes and five-petal flowers at the tips
   plant.bougainvillea  arching sprays of papery bracts (one over a wall)
   plant.bamboo         a clump of jointed culms with drooping leaf sprays

   The sun is on the LEFT (the renderer mirrors a placement for light from
   the right). Seasons in the tropics are wet and dry: spring and summer
   are the lush wet months, autumn yellows a little, and winter is the dry
   season (dusty fronds, a leafless frangipani flowering on bare tips,
   bougainvillea in full bract). Anchor: the foot of the plant.
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
  const circ = (x, y, r) => ell(x, y, r, r);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const poly = pts => 'M' + pts.map(P).join('L') + 'z';
  const nrm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const bz = (A, B, C, t) => [(1 - t) * (1 - t) * A[0] + 2 * (1 - t) * t * B[0] + t * t * C[0], (1 - t) * (1 - t) * A[1] + 2 * (1 - t) * t * B[1] + t * t * C[1]];
  const bzT = (A, B, C, t) => nrm(2 * (1 - t) * (B[0] - A[0]) + 2 * t * (C[0] - B[0]), 2 * (1 - t) * (B[1] - A[1]) + 2 * t * (C[1] - B[1]));
  /** Geometry that stays put across the seasons (shapeBySeason objects get a new rnd per season). */
  const stable = (id, v) => sceneRnd(sceneHash(id + '#' + v));
  /** A lobed blob (a cluster of leaves or bracts). */
  const lobed = (r, cx, cy, rx, ry, n, rag) => {
    const a0 = r() * 6.283, pts = [];
    for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283, k = 1 - rag * r() * .6; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = 'M' + P(pts[0]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], b = 1.22 + rag * r() * .3; d += `Q${f1(cx + ((p[0] + q[0]) / 2 - cx) * b)} ${f1(cy + ((p[1] + q[1]) / 2 - cy) * b)} ${P(q)}`; }
    return d + 'z';
  };
  /** A pointed leaf from (x, y) along `ang` (radians). */
  const leafD = (x, y, ang, len, w) => {
    const c = Math.cos(ang), s = Math.sin(ang), tx = x + c * len, ty = y + s * len, mx = x + c * len * .45, my = y + s * len * .45;
    return `M${f1(x)} ${f1(y)}Q${f1(mx - s * w)} ${f1(my + c * w)} ${f1(tx)} ${f1(ty)}Q${f1(mx + s * w)} ${f1(my - c * w)} ${f1(x)} ${f1(y)}z`;
  };
  /** A tapered stem along a quadratic: outline, shaded right flank, lit left edge, and the two edges (for rings). */
  const stem = (A, B, C, w, n = 22) => {
    const L = [], R = [], S = [], H = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = bz(A, B, C, t), T = bzT(A, B, C, t), nx = -T[1], ny = T[0], hw = w(t) / 2;
      R.push([p[0] + nx * hw, p[1] + ny * hw]); L.push([p[0] - nx * hw, p[1] - ny * hw]);
      S.push([p[0] + nx * hw * .2, p[1] + ny * hw * .2]); H.push([p[0] - nx * hw * .5, p[1] - ny * hw * .5]);
    }
    return { all: poly(L.concat(R.slice().reverse())), shade: poly(S.concat(R.slice().reverse())), lit: poly(L.concat(H.slice().reverse())), L, R };
  };
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };

  /* ---------- plant.palm-coconut ---------- */
  /** One pinnate frond: the rachis and its leaflets, split into the upper (lit) and lower (shaded) rows. */
  const frond = (C, dir, L, lift, droop, leaf, hang, n) => {
    const A = C, B = [C[0] + dir[0] * L * .5, C[1] + dir[1] * L * .5 - lift * L], E = [C[0] + dir[0] * L * .92, C[1] + dir[1] * L * .92 + droop * L];
    let up = '', lo = '';
    const rach = [], ends = { up: [], lo: [] };
    for (let i = 0; i < n; i++) {
      const t = .07 + .93 * i / (n - 1), p = bz(A, B, E, t), T = bzT(A, B, E, t);
      rach.push(p);
      const l = leaf * (t < .3 ? .5 + t * 1.65 : 1 - (t - .3) * .95);
      for (const s of [1, -1]) {
        const nx = -T[1] * s, ny = T[0] * s, d = nrm(nx * .7 + T[0] * .5, ny * .7 + T[1] * .5 + hang);
        const e = [p[0] + d[0] * l, p[1] + d[1] * l], c = [p[0] + d[0] * l * .5 + nx * l * .16, p[1] + d[1] * l * .5 + ny * l * .16];
        const str = `M${P(p)}Q${P(c)} ${P(e)}`;
        if (ny < -.05) { up += str; ends.up.push([p[0] + d[0] * l * .8, p[1] + d[1] * l * .8]); } else { lo += str; ends.lo.push([p[0] + d[0] * l * .8, p[1] + d[1] * l * .8]); }
      }
    }
    const env = k => ends[k].length > 2 ? poly(rach.concat(ends[k].slice().reverse())) : '';
    return { rach: `M${P(A)}Q${P(B)} ${P(E)}`, up, lo, envUp: env('up'), envLo: env('lo') };
  };
  defineObj({
    id: 'plant.palm-coconut', category: 'plant', size: [330, 560], variants: 4, seasonal: true, flippable: true,
    palette: Object.assign({ base: {
      bark: ['#8c7c66', '#5e5244', '#b8aa90', '#4a4036'], boot: ['#6a5638', '#4a3a26'], dead: ['#9a7a44', '#7a5c30', '#b8995c'],
      ground: ['#7a6a4a', '#5a4c34'],
    } }, bySeason({
      nut: { spring: ['#5f7c2c', '#8aa43c', '#a8743a', '#3c4e1c'], summer: ['#587a2a', '#86a23a', '#a8743a', '#3a4c1c'], autumn: ['#7a862e', '#a8ac44', '#b07a36', '#4a521e'], winter: ['#8a6a34', '#b08a48', '#7a5228', '#4a3a20'] },
      frond: { spring: ['#24502a', '#3c7634', '#5e9a3e', '#90c25a'], summer: ['#1f4a28', '#356e30', '#56923a', '#86b650'], autumn: ['#34522a', '#527832', '#7e9c3e', '#b2c45e'], winter: ['#465a2e', '#68783a', '#90984a', '#bcb46c'] },
      rachis: { spring: ['#a6b05a', '#6a7a3a'], summer: ['#9aa652', '#5e6e34'], autumn: ['#b4ac58', '#76763a'], winter: ['#c0ac64', '#8a7a44'] },
    })),
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 1.3 } },
    shadow: { rx: 90, ry: 9, h: 520 }, reflect: true,
    tags: ['tropical', 'palm', 'coconut', 'beach', 'coast', 'asia', 'kit:tropical', 'role:tree'],
    credit: 'drawn for the tropical kit',
    build(v, r) {
      const H = [520, 545, 470, 300][v], lean = [.26, .06, .44, .14][v], young = v === 3;
      const A = [0, 0], B = [lean * H * .72, -H * .42], C = [lean * H, -H];
      const body = [];
      // the trunk: flared bole, taper, shaded flank, lit edge, leaf-scar rings
      const tr = stem(A, B, C, t => (young ? 22 : 26) - 10 * t + (t < .07 ? (.07 - t) / .07 * 14 : 0), 28);
      let tuft = '';
      for (let i = 0; i < 9; i++) { const x = rr(r, -26, 26); tuft += `M${f1(x - 4)} 1q${f1(rr(r, -6, 6))} ${f1(-rr(r, 8, 15))} ${f1(rr(r, -3, 3))} ${f1(-rr(r, 10, 16))}q2 8 8 ${f1(rr(r, 9, 15))}z`; }
      body.push(['@ground.0', ell(0, 0, 22, 3.5), .6], ['@frond.1', tuft], ['@bark.0', tr.all], ['@bark.1', tr.shade, .75], ['@bark.2', tr.lit, .55]);
      let rings = '';
      for (let i = 1; i < tr.L.length - 1; i++) { const a = tr.L[i], b = tr.R[i]; rings += `M${P(a)}Q${f1((a[0] + b[0]) / 2)} ${f1((a[1] + b[1]) / 2 + 2.2)} ${P(b)}`; }
      body.push({ s: '@bark.3', w: 1.1, op: .55, d: rings });
      // the crown: old dead fronds hang behind, then fronds sorted back to front, nuts in the middle
      const fr = [], n = young ? 14 : 18;
      for (let i = 0; i < n; i++) {
        const phi = (i + rr(r, -.3, .3)) / n * 6.283, tier = i % 3;
        const e = (tier === 0 ? rr(r, 38, 66) : tier === 1 ? rr(r, 4, 26) : rr(r, -34, -10)) * D;
        const px = Math.cos(phi) * Math.cos(e), py = -Math.sin(e), fs = Math.max(.38, Math.hypot(px, py));
        fr.push({ dir: nrm(px, py), depth: Math.sin(phi) * Math.cos(e), L: (young ? rr(r, 118, 140) : rr(r, 150, 178)) * fs, lift: e > .4 ? .1 : .04, droop: .14 + (.8 - e) * .2, e });
      }
      fr.sort((a, b) => a.depth - b.depth);
      for (let k = 0; k < 3; k++) {
        const f = frond(C, nrm(rr(r, -.45, .45), 1), rr(r, 90, 125), 0, .05, 20, 2.2, 14);
        body.push({ s: '@dead.1', w: 1.6, d: f.lo + f.up }, { s: '@dead.2', w: 2, d: f.rach });
      }
      body.push(['@boot.1', ell(C[0], C[1] + 4, 13, 10)]);
      const drawFrond = (f, back) => {
        const g = frond(C, f.dir, f.L, f.lift, f.droop, young ? 24 : 30, .95, 21);
        const lit = f.dir[0] < .15;
        const up = back ? '@frond.1' : lit ? '@frond.3' : '@frond.2', lo = back ? '@frond.0' : '@frond.1';
        body.push([lo, g.envLo, .5], [up, g.envUp, .45], { s: lo, w: back ? 1.6 : 1.8, d: g.lo }, { s: up, w: back ? 1.6 : 1.8, d: g.up }, { s: back ? '@rachis.1' : '@rachis.0', w: 2.4, d: g.rach });
      };
      for (const f of fr) if (f.depth < 0) drawFrond(f, true);
      // the nuts and the frond bases
      {
        let nut0 = '', nut1 = '', nut2 = '';
        const nn = young ? 4 : 8;
        for (let i = 0; i < nn; i++) {
          const x = C[0] + rr(r, -15, 15), y = C[1] + rr(r, 5, 17), rad = rr(r, 6.5, 8.2);
          (i % 3 === 2 ? (nut2 += circ(x, y, rad)) : (nut0 += circ(x, y, rad)));
          nut1 += ell(x - rad * .3, y - rad * .35, rad * .45, rad * .35);
        }
        body.push(['@nut.0', nut0], ['@nut.2', nut2], ['@nut.1', nut1, .7], ['@nut.3', ell(C[0] + 4, C[1] + 14, 14, 4), .35]);
      }
      let boots = '';
      for (let i = 0; i < 6; i++) { const a = (-150 + i * 24) * D, x = C[0] + Math.cos(a) * 9, y = C[1] + 6 + Math.sin(a) * 6; boots += `M${f1(C[0])} ${f1(C[1] + 8)}L${f1(x - 3)} ${f1(y)}L${f1(x + 3)} ${f1(y - 2)}z`; }
      body.push(['@boot.0', boots]);
      for (const f of fr) if (f.depth >= 0) drawFrond(f, false);
      return { body };
    },
  });

  /* ---------- plant.banana ---------- */
  /** A paddle leaf: two halves torn into strips (the slits slant toward the tip), the midrib. */
  const blade = (r, B, ang, L, W, droop, tears) => {
    const dir = [Math.cos(ang), Math.sin(ang)], M = [B[0] + dir[0] * L * .5, B[1] + dir[1] * L * .5 - L * .12], E = [B[0] + dir[0] * L, B[1] + dir[1] * L + droop * L];
    const hw = t => W / 2 * (t < .08 ? t / .08 : t > .8 ? Math.sqrt(Math.max(0, (1 - t) / .2)) : 1) * (1 - .12 * t);
    const out = { up: '', lo: '', rib: `M${P(B)}Q${P(M)} ${P(E)}` };
    for (const s of [1, -1]) {
      const cuts = [];
      for (let i = 0; i < tears; i++) cuts.push(rr(r, .18, .88));
      cuts.sort((a, b) => a - b);
      const seg = [[0, cuts.length ? cuts[0] : 1]];
      for (let i = 0; i < cuts.length; i++) seg.push([cuts[i] + .015, i + 1 < cuts.length ? cuts[i + 1] : 1]);
      let d = '', side = 0;
      for (const [ta, tb] of seg) {
        if (tb - ta < .02) continue;
        const pts = [], edge = [];
        for (let k = 0; k <= 6; k++) {
          const t = ta + (tb - ta) * k / 6, p = bz(B, M, E, t), T = bzT(B, M, E, t), nx = -T[1] * s, ny = T[0] * s, h = hw(t);
          pts.push(p); edge.push([p[0] + nx * h + T[0] * h * .25, p[1] + ny * h + T[1] * h * .25]); side += ny;
        }
        d += poly(pts.concat(edge.reverse()));
      }
      if (side < 0) out.up += d; else out.lo += d;
    }
    return out;
  };
  defineObj({
    id: 'plant.banana', category: 'plant', size: [230, 190], variants: 3, seasonal: true, flippable: true, parts: ['stem', 'leaves'],
    palette: Object.assign({ base: {
      stem: ['#7a8a3a', '#56622a', '#9cac54', '#7a5a34'], dry: ['#9a7a44', '#7a5a30', '#b8975a'], fruit: ['#6a8a2a', '#9ab83c', '#4a6420'], bell: ['#6a2a4a', '#4a1a34', '#8a4a66'], stalk: '#6a6a34', ground: '#5a4c34',
    } }, bySeason({
      leaf: { spring: ['#2e6a2a', '#4a9236', '#74b84a', '#a8d870'], summer: ['#28622a', '#408a32', '#68ae44', '#9cce66'], autumn: ['#3e6a2a', '#5e8e34', '#8aae46', '#bccc66'], winter: ['#56662e', '#788838', '#9ca44a', '#c8be70'] },
      rib: { spring: '#c8dc8a', summer: '#bed480', autumn: '#d0d48a', winter: '#d8cc8a' },
    })),
    anim: { sway: { part: 'leaves', pivot: [0, -88], deg: 2.6 } },
    shadow: { rx: 70, ry: 7, h: 180 },
    tags: ['tropical', 'banana', 'garden', 'kampung', 'asia', 'kit:tropical', 'role:shrub'],
    credit: 'drawn for the tropical kit',
    build(v, r) {
      const stemP = [], leaves = [];
      const H = 88, tears = [3, 2, 5][v];
      stemP.push(['@ground', ell(0, 0, 34, 4), .5]);
      // suckers (young shoots) at the foot, then the main pseudostem with its brown sheaths
      const suck = v === 1 ? [[-26, 30], [22, 46]] : [[-24, 40], [26, 26]];
      for (const [sx, sh] of suck) {
        const st = stem([sx, 0], [sx * 1.05, -sh * .5], [sx * 1.12, -sh], t => 9 - 4 * t);
        stemP.push(['@stem.0', st.all], ['@stem.1', st.shade, .7]);
        for (let i = 0; i < 3; i++) { const b = blade(r, [sx * 1.12, -sh], (-90 + (i - 1) * 50 + (sx > 0 ? 20 : -20)) * D, rr(r, 34, 46), 12, .12, 0); stemP.push(['@leaf.1', b.lo], ['@leaf.2', b.up], { s: '@rib', w: .9, d: b.rib }); }
      }
      const ms = stem([0, 0], [2, -H * .5], [3, -H], t => 21 - 8 * t + (t < .06 ? 6 * (.06 - t) / .06 : 0));
      stemP.push(['@stem.0', ms.all], ['@stem.1', ms.shade, .8], ['@stem.2', ms.lit, .5]);
      let sheath = '';
      for (let i = 0; i < 3; i++) { const y = -6 - i * 22 - rr(r, 0, 6), x = rr(r, -8, 2); sheath += `M${f1(x)} ${f1(y)}q${f1(2 + r() * 3)} -12 ${f1(3 + r() * 3)} -26l2.5 1q-1 14 -2 26z`; }
      stemP.push(['@stem.3', sheath, .75]);
      // dead leaves hanging down the stem (the dry season keeps more)
      for (const a of [96, 78]) { const b = blade(r, [3, -H + 4], a * D, rr(r, 54, 66), 16, .05, 4); stemP.push(['@dry.1', b.lo], ['@dry.0', b.up], { s: '@dry.2', w: 1, d: b.rib }); }
      // the fruit bunch (v0, v2): a peduncle arching out and down, hands of fingers, the purple bell
      const top = [3, -H];
      const fruit = [];
      if (v !== 1) {
        const p0 = [4, -H - 2], p1 = [40, -H - 16], p2 = [44, -H + 50];
        fruit.push({ s: '@stalk', w: 3, d: `M${P(p0)}Q${P(p1)} ${P(p2)}` });
        let f0 = '', f1s = '';
        for (let h = 0; h < 5; h++) {
          const p = bz(p0, p1, p2, .42 + h * .1);
          for (let k = 0; k < 6; k++) { const x = p[0] - 9 + k * 3.4, y = p[1] + 2; f0 += `M${f1(x)} ${f1(y)}q${f1(-3 + k * .6)} -5 ${f1(-1 + k * .8)} -11`; f1s += `M${f1(x - .8)} ${f1(y - 1)}q${f1(-3 + k * .6)} -4 ${f1(-1.2 + k * .8)} -9`; }
        }
        fruit.push({ s: '@fruit.0', w: 3.2, d: f0 }, { s: '@fruit.1', w: 1.2, op: .7, d: f1s });
        fruit.push(['@bell.0', `M${f1(p2[0] - 5)} ${f1(p2[1])}q5 -4 10 0q1 9 -5 16q-6 -7 -5 -16z`], ['@bell.1', `M${f1(p2[0] + 1)} ${f1(p2[1] - 1)}q4 1 4 1q1 9 -5 16q2 -8 1 -17z`, .8], ['@bell.2', `M${f1(p2[0] - 3)} ${f1(p2[1] + 1)}q1 6 1 10`, .6]);
      }
      // the leaf fan: upright young leaves, then the older ones arching and drooping
      const angs = v === 1 ? [[-92, 1, .04], [-62, 1, .2], [-128, .95, .22], [-30, .95, .5], [-156, .9, .55], [-8, .8, .8], [-176, .78, .85]]
        : [[-88, 1.05, .04], [-58, 1, .24], [-124, 1, .2], [-28, .95, .55], [-150, .95, .5], [-6, .82, .85], [-178, .82, .8], [-108, .9, .1]];
      const back = [], front = [];
      angs.forEach(([a, k, dr], i) => {
        const L = (v === 1 ? 92 : 112) * k * rr(r, .92, 1.06), W = (v === 1 ? 26 : 32) * rr(r, .9, 1.05);
        const B = [top[0] + Math.cos(a * D) * 10, top[1] + Math.sin(a * D) * 8];
        const pet = { s: '@stem.2', w: 2.6, d: `M${P(top)}L${P(B)}` };
        const b = blade(r, B, (a + rr(r, -9, 9)) * D, L, W, dr * rr(r, .85, 1.15), i < 3 ? Math.max(0, tears - 2) : tears);
        (i % 2 ? back : front).push(pet, { f: i % 2 ? '@leaf.0' : '@leaf.1', d: b.lo }, { f: i % 2 ? '@leaf.1' : (a < -90 && a > -150 ? '@leaf.3' : '@leaf.2'), d: b.up }, { s: '@rib', w: 1.1, op: .85, d: b.rib });
      });
      leaves.push(...back, ...fruit, ...front);
      return { stem: stemP, leaves };
    },
  });

  /* ---------- plant.frangipani ---------- */
  /** A five-petal pinwheel flower, coarse coordinates (they are small). */
  const flower = (x, y, rad, rot) => {
    const h = v => Math.round(v * 2) / 2;
    let d = '';
    for (let k = 0; k < 5; k++) { const a = (rot + k * 72) * D, b = a + .62; d += `M${h(x)} ${h(y)}Q${h(x + Math.cos(a) * rad * 1.25)} ${h(y + Math.sin(a) * rad * 1.25)} ${h(x + Math.cos(b) * rad)} ${h(y + Math.sin(b) * rad)}z`; }
    return d;
  };
  const growF = (r, x, y, ang, len, w, depth, segs, tips) => {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, cx = x + Math.cos(ang + .25) * len * .5, cy = y + Math.sin(ang + .25) * len * .5 + len * .08;
    segs.push({ d: `M${f1(x)} ${f1(y)}Q${f1(cx)} ${f1(cy)} ${f1(ex)} ${f1(ey)}`, w, depth });
    if (depth === 0) { tips.push([ex, ey]); return; }
    const k = r() < .3 ? 3 : 2;
    for (let i = 0; i < k; i++) {
      let a = ang + (k === 2 ? (i ? 1 : -1) * rr(r, 22, 34) : (i - 1) * 30) * D;
      a += (-Math.PI / 2 - a) * .25;
      growF(r, ex, ey, a, len * rr(r, .7, .85), w * .72, depth - 1, segs, tips);
    }
  };
  defineObj({
    id: 'plant.frangipani', category: 'plant', size: [230, 210], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['trunk', 'crown'],
    palette: Object.assign({ base: {
      bark: ['#8a8478', '#625c52', '#b2ac9e'], bloom: ['#fbf8ee', '#f4a6c0', '#c8243a'], bloomS: ['#e4dcc4', '#d27898', '#901828'], eye: ['#f2c63a', '#f6d860', '#f4c040'], ground: '#5a4c34',
    } }, bySeason({
      leaf: { spring: ['#2e6a2e', '#4c8e38', '#78b850', '#a8d878'], summer: ['#245a28', '#3a7c32', '#5ea444', '#90c866'], autumn: ['#4a6a2a', '#6e8c34', '#9cac44', '#c8c864'], winter: ['#6a7a30', '#94963c', '#bcae4c', '#d8c46a'] },
    })),
    anim: { sway: { part: 'crown', pivot: [0, -56], deg: 1.4 } },
    shadow: { rx: 80, ry: 8, h: 200 },
    tags: ['tropical', 'frangipani', 'plumeria', 'garden', 'temple', 'asia', 'kit:tropical', 'role:tree'],
    credit: 'drawn for the tropical kit',
    build(v, _r, ctx) {
      const r = stable('plant.frangipani', v), s = ctx.season, trunk = [], crown = [];
      const segs = [], tips = [];
      const TH = 56;
      trunk.push(['@ground', ell(0, 0, 30, 3.5), .5]);
      const tr = stem([0, 0], [-4, -TH * .5], [2, -TH], t => 18 - 6 * t + (t < .08 ? 8 * (.08 - t) / .08 : 0));
      trunk.push(['@bark.0', tr.all], ['@bark.1', tr.shade, .8], ['@bark.2', tr.lit, .5]);
      const limbs = v === 2 ? [-128, -92, -56] : [-140, -108, -74, -42];
      for (const a of limbs) growF(r, 2, -TH, (a + rr(r, -6, 6)) * D, rr(r, 40, 52), 11, 2, segs, tips);
      for (let dpt = 2; dpt >= 0; dpt--) {
        const g = segs.filter(q => q.depth === dpt); if (!g.length) continue;
        const w = g[0].w, d = g.map(q => q.d).join('');
        (dpt === 2 ? trunk : crown).push({ s: '@bark.0', w, d }, { s: '@bark.1', w: w * .45, op: .8, d, m: [1, 0, 0, 1, w * .26, 0] }, { s: '@bark.2', w: w * .25, op: .55, d, m: [1, 0, 0, 1, -w * .28, 0] });
      }
      // leaf rosettes at the tips (the dry season strips them) and the flower heads above
      const nLeaf = { spring: 7, summer: 8, autumn: 6, winter: 1 }[s], nFl = { spring: 3, summer: 4, autumn: 2, winter: 4 }[s];
      const L = ['', '', '', ''], petals = ['', ''];
      let eyes = '', fallen = '';
      tips.forEach(([x, y], ti) => {
        for (let i = 0; i < nLeaf; i++) {
          const a = (-180 + (i + rr(r, -.3, .3)) * 180 / Math.max(1, nLeaf - 1) + rr(r, -8, 8)) * D, len = rr(r, 20, 27);
          const tone = Math.sin(a) < -.6 ? (Math.cos(a) < 0 ? 3 : 2) : Math.cos(a) < 0 ? 2 : (r() < .5 ? 0 : 1);
          L[tone] += leafD(x, y, nLeaf === 1 ? (-60 - r() * 60) * D : a + (Math.sin(a) > -.3 ? .35 : 0), len, 5.4);
        }
        for (let i = 0; i < nFl; i++) {
          const fx = x + rr(r, -9, 9), fy = y - rr(r, 3, 12), rot = r() * 72, sh = (fx > x + 3) ? 1 : 0;
          petals[sh] += flower(fx, fy, 4.8, rot);
          eyes += `M${Math.round(fx * 2) / 2} ${Math.round(fy * 2) / 2}h.1`;
        }
      });
      for (let i = 0; i < 6; i++) fallen += flower(rr(r, -60, 60), rr(r, -3, 2), 3.6, r() * 72);
      crown.push(['@leaf.0', L[0]], ['@leaf.1', L[1]], ['@leaf.2', L[2]], ['@leaf.3', L[3]]);
      crown.push([`@bloom.${v}`, petals[0]], [`@bloomS.${v}`, petals[1]], { s: `@eye.${v}`, w: 2.4, d: eyes });
      trunk.push([`@bloom.${v}`, fallen, .85]);
      return { trunk, crown };
    },
  });

  /* ---------- plant.bougainvillea ---------- */
  defineObj({
    id: 'plant.bougainvillea', category: 'plant', size: [210, 130], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['wall', 'body'],
    palette: Object.assign({ base: {
      bract: ['#8e1460', '#c4287e', '#ee5aa8', '#ff9ccc', '#c0461e', '#ec7434', '#ffa25a', '#ffd0a0', '#a83a78', '#e098c0', '#f8e6f0', '#ffffff'],
      stem: ['#6a5040', '#4a3828'], wall: ['#ece6d8', '#c8c0b0', '#a89e8c', '#f8f4ea'], ground: '#5a4c34',
    } }, bySeason({
      leaf: { spring: ['#1f4a24', '#2f6a30', '#4a8c3c', '#76b056'], summer: ['#1a4422', '#2a622c', '#428438', '#6aa64e'], autumn: ['#2c4a22', '#44682c', '#628638', '#8ea650'], winter: ['#3a4a26', '#566a30', '#748838', '#98a450'] },
    })),
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 1.8 } },
    shadow: { rx: 80, ry: 7, h: 90 },
    tags: ['tropical', 'bougainvillea', 'garden', 'hedge', 'flowers', 'asia', 'kit:tropical', 'kit:urban', 'role:shrub'],
    credit: 'drawn for the tropical kit',
    build(v, _r, ctx) {
      const r = stable('plant.bougainvillea', v), s = ctx.season, wall = [], body = [];
      const dens = { spring: .8, summer: .4, autumn: .55, winter: 1 }[s];
      const base = v * 4;
      let baseY = 0, spread = [150, 120, 200][v], hgt = [88, 128, 64][v];
      if (v === 2) {
        // a low rendered garden wall the plant tumbles over
        baseY = -52;
        wall.push(['@wall.0', rect(-104, -52, 208, 52)], ['@wall.3', rect(-108, -58, 216, 7)], ['@wall.1', rect(-108, -51, 216, 2.5)], ['@wall.2', rect(60, -51, 44, 51), .35]);
        let st = ''; for (let i = 0; i < 9; i++) st += `M${f1(-100 + i * 25 + r() * 6)} ${f1(-44 + r() * 30)}q${f1(4 + r() * 8)} ${f1(2)} ${f1(10 + r() * 10)} ${f1(-1)}`;
        wall.push({ s: '@wall.2', w: .9, op: .45, d: st });
      } else wall.push(['@ground', ell(0, 0, spread * .4, 4), .5]);
      // the inner foliage mass (dark), then woody canes arching out and drooping at the tips
      const h = q => Math.round(q * 2) / 2;
      const blob = (cx, cy, rad) => { const a0 = r() * 6.28, pts = []; for (let i = 0; i < 5; i++) { const a = a0 + i * 1.2566, k = rr(r, .75, 1); pts.push([cx + Math.cos(a) * rad * k, cy + Math.sin(a) * rad * k * .85]); } let d = `M${h(pts[0][0])} ${h(pts[0][1])}`; for (let i = 0; i < 5; i++) { const p = pts[i], q = pts[(i + 1) % 5]; d += `Q${h(cx + ((p[0] + q[0]) / 2 - cx) * 1.5)} ${h(cy + ((p[1] + q[1]) / 2 - cy) * 1.5)} ${h(q[0])} ${h(q[1])}`; } return d + 'z'; };
      const mass = ['', ''];
      const nm = v === 2 ? 7 : 6;
      for (let i = 0; i < nm; i++) {
        const t = (i + .5) / nm, x = (t - .5) * spread * .78, y = v === 2 ? baseY - rr(r, 4, 16) : baseY - hgt * (.22 + .42 * Math.sin(t * Math.PI)) * rr(r, .8, 1);
        mass[i % 2] += lobed(r, x, y, spread * rr(r, .14, .2), hgt * rr(r, .2, .28), 12, .4);
      }
      if (v === 2) for (let i = 0; i < 5; i++) mass[i % 2] += lobed(r, rr(r, -90, 90), baseY + rr(r, 8, 30), rr(r, 12, 22), rr(r, 10, 18), 10, .4);
      body.push(['@leaf.0', mass[0]], ['@leaf.1', mass[1]]);
      const sprays = [], n = [18, 16, 20][v];
      let wood = '';
      for (let i = 0; i < n; i++) {
        const a = (v === 2 ? rr(r, -175, -5) : -165 + i / (n - 1) * 150 + rr(r, -8, 8)) * D;
        const len = v === 2 ? rr(r, 50, 100) : rr(r, .6, 1) * Math.max(spread * .55, hgt);
        const S = [rr(r, -14, 14) + (v === 2 ? rr(r, -60, 60) : 0), baseY - rr(r, 0, 6)];
        const ex = S[0] + Math.cos(a) * len * (spread / (2 * len) + .3), ey = Math.max(baseY - hgt, S[1] + Math.sin(a) * len * .9);
        const E = [ex, v === 2 ? S[1] + rr(r, 10, 48) : ey + len * (.2 + Math.abs(Math.cos(a)) * .3)], M = v === 2 ? [(S[0] + ex) / 2, S[1] - rr(r, 4, 14)] : [(S[0] + ex) / 2, Math.min(S[1], ey) - len * .22];
        sprays.push([S, M, E]);
        wood += `M${P(S)}Q${P(M)} ${P(bz(S, M, E, .7))}`;
      }
      body.push({ s: '@stem.0', w: 1.6, d: wood });
      // pointed leaves along the canes, then bract clusters thickest at the arching ends (three tones, lit on the upper left)
      const lf = ['', '', '', ''], br = ['', '', '', ''];
      for (const [S, M, E] of sprays) {
        for (let t = .2; t <= 1.001; t += .075) {
          const p = bz(S, M, E, t), T = bzT(S, M, E, t), lit = (p[0] < 0 ? 1 : 0) + (p[1] < baseY - hgt * .5 ? 1 : 0);
          const sd = r() < .5 ? -1 : 1; lf[Math.min(3, lit + (r() < .5 ? 0 : 1))] += leafD(p[0], p[1], Math.atan2(T[1], T[0]) + sd * rr(r, .6, 1.2), rr(r, 6, 9), 2.6);
          const nb = Math.round(dens * (t > .5 ? 2.3 : 1) * rr(r, .5, 1.3));
          for (let k = 0; k < nb; k++) br[Math.min(3, lit + (r() < .55 ? 0 : 1))] += blob(p[0] + rr(r, -7, 7), p[1] + rr(r, -7, 5), rr(r, 3, 5));
        }
      }
      body.push(['@leaf.0', lf[0]], ['@leaf.1', lf[1]], ['@leaf.2', lf[2]], ['@leaf.3', lf[3]]);
      body.push([`@bract.${base}`, br[0]], [`@bract.${base + 1}`, br[1]], [`@bract.${base + 2}`, br[2]], [`@bract.${base + 3}`, br[3]]);
      // fallen bracts on the ground
      let fallen = ''; for (let i = 0; i < Math.round(10 * dens); i++) fallen += ell(rr(r, -spread * .45, spread * .45), rr(r, -2, 2), 2, 1.2);
      wall.push([`@bract.${base + 1}`, fallen, .8]);
      return { wall, body };
    },
  });

  /* ---------- plant.bamboo ---------- */
  defineObj({
    id: 'plant.bamboo', category: 'plant', size: [210, 370], variants: 3, seasonal: true, flippable: true,
    palette: Object.assign({ base: {
      culm: ['#4a6a34', '#6a8c40', '#2e4a26', '#9ab45a', '#b89a3a', '#d8bc4a', '#8a6e24', '#f0d870', '#34502a', '#4a6a34', '#22381e', '#6e8e48'],
      node: ['#2a3a1e', '#7a6020', '#1a2814'], stripe: '#4a7a34', sheath: ['#8a6a44', '#a8885a'], litter: ['#a8905a', '#8a7444', '#c4ac74'],
    } }, bySeason({
      leaf: { spring: ['#2e5a2a', '#4a8236', '#74ac4a', '#a6d070'], summer: ['#264e26', '#3c7232', '#5e9a42', '#8ec262'], autumn: ['#3a5a26', '#5a7c30', '#84a03e', '#b8c060'], winter: ['#3a5230', '#56703a', '#7a9050', '#a4b070'] },
    })),
    anim: { sway: { part: 'body', pivot: [0, 0], deg: 1.5 } },
    shadow: { rx: 100, ry: 9, h: 340 },
    tags: ['tropical', 'bamboo', 'grove', 'garden', 'temple', 'asia', 'kit:tropical', 'kit:east-asian', 'role:tree'],
    credit: 'drawn for the tropical and east-asian kits',
    build(v, r) {
      const body = [], ground = [];
      const n = [15, 11, 20][v], Hm = [350, 330, 250][v], cb = v * 4;
      const culms = [];
      for (let i = 0; i < n; i++) { const x = rr(r, -84, 84), z = r(); culms.push({ x, z, H: Hm * rr(r, .72, 1) * (.85 + z * .15), w: (v === 2 ? 3.6 : 4.6) + z * 1.6 }); }
      culms.sort((a, b) => a.z - b.z);
      ground.push(['@litter.1', lobed(r, 0, -1, 104, 5, 12, .4), .7]);
      let lit = '';
      for (let i = 0; i < 40; i++) lit += leafD(rr(r, -100, 100), rr(r, -3, 2), rr(r, -.4, .4) + (r() < .5 ? 0 : Math.PI), rr(r, 5, 8), 1.2);
      ground.push(['@litter.2', lit, .8]);
      const lf = ['', '', '', ''];
      let nodes = '', twigs = '';
      for (const c of culms) {
        const lean = (c.x / 84) * rr(r, .06, .16) * c.H + rr(r, -8, 8), side = Math.sign(lean) || 1;
        const A = [c.x, 0], B = [c.x + lean * .15, -c.H * .55], E = [c.x + lean, -c.H];
        const tip = `M${P(E)}q${f1(side * 10)} -4 ${f1(side * 22)} 10`;
        const d = `M${P(A)}Q${P(B)} ${P(E)}` + tip;
        const back = c.z < .45;
        body.push({ s: `@culm.${cb + (back ? 2 : 0)}`, w: c.w, d }, { s: `@culm.${cb + (back ? 2 : 1)}`, w: c.w * .45, op: .8, d, m: [1, 0, 0, 1, c.w * .24, 0] });
        if (!back) body.push({ s: `@culm.${cb + 3}`, w: c.w * .22, op: .7, d: `M${P(A)}Q${P(B)} ${P(E)}`, m: [1, 0, 0, 1, -c.w * .26, 0] });
        if (v === 1 && !back) body.push({ s: '@stripe', w: .9, op: .7, d: `M${P(A)}Q${P(B)} ${P(E)}`, m: [1, 0, 0, 1, c.w * .1, 0] });
        // nodes, branch twigs and drooping leaf sprays in the upper half
        let k = 0;
        for (let t = .06; t < .98; t += 22 / c.H, k++) {
          const p = bz(A, B, E, t);
          nodes += `M${f1(p[0] - c.w * .65)} ${f1(p[1])}h${f1(c.w * 1.3)}`;
          if (t > .36 && (t > .6 || k % 2 === 0)) {
            const sd = k % 4 === 0 ? -1 : 1, len = rr(r, 14, 28) * (1.1 - t * .3), tx = p[0] + sd * len, ty = p[1] - len * .35;
            twigs += `M${P(p)}Q${f1(p[0] + sd * len * .5)} ${f1(p[1] - len * .45)} ${f1(tx)} ${f1(ty)}`;
            const nl = 5 + (r() * 4 | 0);
            for (let j = 0; j < nl; j++) {
              const a = (90 - sd * rr(r, 25, 80)) * D, lx = p[0] + sd * len * rr(r, .4, 1), ly = p[1] - len * rr(r, .2, .4);
              const tone = back ? (r() < .6 ? 0 : 1) : (sd < 0 ? (r() < .5 ? 3 : 2) : (r() < .5 ? 1 : 2));
              lf[tone] += leafD(lx, ly, a + rr(r, -.3, .3) - (sd > 0 ? .6 : -.6), rr(r, 11, 16), 2.1);
            }
          }
        }
        // a tuft at the very top
        for (let j = 0; j < 9; j++) lf[back ? 1 : 2] += leafD(E[0] + side * rr(r, 4, 24), E[1] + rr(r, -2, 8), (90 - side * rr(r, 20, 70)) * D, rr(r, 10, 15), 2);
      }
      body.push({ s: '@node.' + (v === 1 ? 1 : v === 2 ? 2 : 0), w: 1.3, op: .8, d: nodes }, { s: `@culm.${cb + 2}`, w: 1, d: twigs });
      body.push(['@leaf.0', lf[0]], ['@leaf.1', lf[1]], ['@leaf.2', lf[2]], ['@leaf.3', lf[3]]);
      // two new shoots in their papery sheaths
      body.push(['@sheath.0', `M-34 0l5 -26l5 26zM46 0l4 -18l4 18z`], ['@sheath.1', `M-34 0l5 -26l1 26zM46 0l4 -18l1 18z`, .7]);
      return { body: ground.concat(body) };
    },
  });
})();

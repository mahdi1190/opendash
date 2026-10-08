/* ============================================================
   SCENE LIBRARY: water, the east-asian kit (docs/dev/SCENE_ENGINE.md,
   sections 2 and 2.7). PURE: sceneObjDefine calls only, built lazily per
   (variant, season).

   water.koi-pond  a garden pond seen from a low angle: an oval of still
                   water ringed with rounded stones, koi of five colourings
                   (red and white, gold, black and red, yellow, tri-colour),
                   lily pads, a clump of iris. Spring and summer bring pads
                   and flowers (iris in early summer), autumn floats red
                   maple leaves on yellowing pads, winter is bare with a
                   skin of thin ice. v0 a round pond, v1 a long pond.

   The koi swing slowly about the middle (turn on the 'koi' part); glints
   on the water flicker (the 'glint' part). Anchor: the front rim.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const f3 = v => Math.round(v * 1000) / 1000;
  const rr = (r, a, b) => a + r() * (b - a);
  const P = p => `${f1(p[0])} ${f1(p[1])}`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
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
  /* koi colourings: [body, patch, accent] */
  const KOI = [['#f6f2ea', '#d8401e', '#d8401e'], ['#f08a24', '#f8c060', '#f8c060'], ['#24201e', '#e2502a', '#f4f0e8'], ['#f2d060', '#fbf2d0', '#fbf2d0'], ['#f6f2ea', '#d8401e', '#24201e']];
  defineObj({
    id: 'water.koi-pond', category: 'water', size: [300, 72], variants: 2, seasonal: true, shapeBySeason: true, flippable: true, parts: ['body', 'koi', 'glint'],
    palette: Object.assign({ base: {
      koi: KOI.map(k => k[0]), patch: KOI.map(k => k[1]), accent: KOI.map(k => k[2]), fin: '#fbf6ee',
      stone: ['#8e8a80', '#6e6a62', '#b4b0a6', '#55524c'], earth: ['#5e5040', '#4a3e30'], glint: '#ffffff', leafRed: ['#c8301e', '#e85a2a'], iris: ['#5a3a8a', '#8a6ac0'],
    } }, bySeason({
      water: { spring: ['#1e3e3e', '#2e5a56', '#7aa6a2'], summer: ['#1a3a34', '#2a5a4c', '#6e9e90'], autumn: ['#24383a', '#365452', '#8aa4a0'], winter: ['#34444c', '#4e626a', '#a4b8c0'] },
      pad: { spring: ['#4a8a3a', '#6aaa4a'], summer: ['#3a7a34', '#5a9a44'], autumn: ['#8a8a3a', '#b0a04a'], winter: ['#6a7a70', '#8a9a90'] },
      moss: { spring: ['#5a8a3a', '#7aa64a'], summer: ['#3e7030', '#5a8c3c'], autumn: ['#7a6a34', '#9a8040'], winter: ['#5e6650', '#e8eef4'] },
      ice: { spring: '#ffffff', summer: '#ffffff', autumn: '#ffffff', winter: '#e4eef6' },
    })),
    anim: { turn: { part: 'koi', pivot: [0, -26], deg: 16, period: 11, hold: .2 }, flicker: { part: 'glint', op: [.2, 1], period: 2.2 } },
    tags: ['japan', 'china', 'east-asia', 'garden', 'temple', 'pond', 'koi', 'fish', 'kit:east-asian', 'kit:water', 'role:edge'],
    credit: 'drawn for the east-asian kit',
    build(v, _r, ctx) {
      const r = stable('water.koi-pond', v), s = ctx.season, body = [], koi = [], glint = [];
      const cx = 0, cy = -26, rx = v === 1 ? 140 : 112, ry = v === 1 ? 22 : 25;
      // the earth rim, the water (lighter far side, sky reflected), the shadow under the far bank
      body.push(['@earth.0', ell(cx, cy + 1, rx + 10, ry + 6)], ['@earth.1', ell(cx, cy + 3, rx + 6, ry + 3), .7]);
      body.push({ f: { lin: [[0, '@water.2'], [.35, '@water.1'], [1, '@water.0']], x1: 0, y1: cy - ry, x2: 0, y2: cy + ry }, d: ell(cx, cy, rx, ry) });
      body.push(['@water.0', `M${f1(cx - rx)} ${f1(cy)}a${rx} ${ry} 0 0 1 ${2 * rx} 0q${f1(-rx)} ${f1(-ry * 1.1)} ${-2 * rx} 0z`, .55]);
      body.push({ s: '@water.2', w: 1, op: .35, d: `M${f1(cx - rx * .5)} ${f1(cy + ry * .35)}h${f1(rx * .3)}M${f1(cx + rx * .1)} ${f1(cy + ry * .55)}h${f1(rx * .35)}` });
      // koi: each a slim body with a forked tail and fins, patterned, foreshortened (seen from a low angle), under the surface
      const nk = v === 1 ? 7 : 6;
      for (let i = 0; i < nk; i++) {
        const a = rr(r, 0, 6.283), k = .42, c = Math.cos(a), sn = Math.sin(a), q = rr(r, .1, .62), t = rr(r, 0, 6.283);
        const x = cx + Math.cos(t) * rx * q, y = cy + Math.sin(t) * ry * q * .9, sc = rr(r, .85, 1.15), kind = i % 5;
        const m = [f3(c * sc), f3(k * sn * sc), f3(-sn * sc), f3(k * c * sc), f1(x), f1(y)];
        koi.push({ f: '@water.0', d: 'M-8 0Q-4 -3 4 -2.4Q9 -1 9 0Q9 1 4 2.4Q-4 3 -8 0z', op: .35, m: [m[0], m[1], m[2], m[3], m[4] + 1.2, m[5] + 1.6] });
        koi.push({ f: '@fin', d: 'M-7 0L-13.5 -3.8L-11.6 0L-13.5 3.8zM2 -2L-1 -5.4L-2 -2zM2 2L-1 5.4L-2 2z', op: .8, m });
        koi.push({ f: `@koi.${kind}`, d: 'M-8 0Q-4 -3.2 4 -2.6Q9.4 -1.2 9.4 0Q9.4 1.2 4 2.6Q-4 3.2 -8 0z', m });
        koi.push({ f: `@patch.${kind}`, d: kind === 1 ? 'M-2 -.6Q3 -1.8 7 -.4Q3 .6 -2 .2z' : 'M1 -2.2Q5 -2.6 8 -.8Q5 .6 2 -.2zM-6 -1Q-3 -2.4 -1 -1.2Q-2 1.6 -6 1z', m });
        if (kind === 2 || kind === 4) koi.push({ f: `@accent.${kind}`, d: 'M-4 1.2Q-2 2.4 0 1.4Q-1 .2 -4 .6zM3 -1.6h2v1.4h-2z', m });
      }
      // lily pads with a notch; flowers in summer; autumn maple leaves; winter ice
      if (s !== 'winter') {
        const pads = ['', ''];
        for (let i = 0; i < 8; i++) {
          const t = rr(r, 0, 6.283), q = rr(r, .45, .9), x = cx + Math.cos(t) * rx * q, y = cy + Math.sin(t) * ry * q * .85, pr = rr(r, 6, 10), a = rr(r, 0, 6.283);
          const ex = x + Math.cos(a) * pr, ey = y + Math.sin(a) * pr * .32, fx = x + Math.cos(a + .55) * pr, fy = y + Math.sin(a + .55) * pr * .32;
          pads[i % 2] += `M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}A${f1(pr)} ${f1(pr * .32)} 0 1 0 ${f1(fx)} ${f1(fy)}z`;
          if (s === 'summer' && i % 3 === 0) body.push(['#f4a0b8', ell(x + 1, y - 1.6, 2.6, 1.6)], ['#fbe0e8', ell(x + .6, y - 2.2, 1.4, .9)]);
        }
        body.push(['@pad.0', pads[0]], ['@pad.1', pads[1]]);
        if (s === 'autumn') { let lv = ''; for (let i = 0; i < 9; i++) { const t = rr(r, 0, 6.283), q = rr(r, .2, .85); lv += ell(cx + Math.cos(t) * rx * q, cy + Math.sin(t) * ry * q, 2.4, .9); } body.push(['@leafRed.0', lv]); }
      } else {
        body.push(['@ice', ell(cx - rx * .3, cy - ry * .2, rx * .45, ry * .4), .35], ['@ice', ell(cx + rx * .35, cy + ry * .2, rx * .35, ry * .35), .3], { s: '@ice', w: .7, op: .6, d: `M${f1(cx - rx * .6)} ${f1(cy)}l14 -3l10 4M${f1(cx + rx * .1)} ${f1(cy - ry * .3)}l12 2l9 -3` });
      }
      // glints on the far water
      let gl = ''; for (let i = 0; i < 7; i++) gl += `M${f1(cx + rr(r, -rx * .7, rx * .7))} ${f1(cy - ry * rr(r, .2, .7))}h${f1(rr(r, 3, 7))}`;
      glint.push({ s: '@glint', w: .9, op: .8, d: gl });
      // the stone rim: rounded stones all round, sorted far to near, with lit tops and moss
      const stones = [];
      const ns = v === 1 ? 26 : 22;
      for (let i = 0; i < ns; i++) { const t = (i + rr(r, -.3, .3)) / ns * 6.283; stones.push({ x: cx + Math.cos(t) * (rx + 3), y: cy + Math.sin(t) * (ry + 2), w: rr(r, 9, 16), h: rr(r, 5, 9) }); }
      stones.sort((a, b) => a.y - b.y);
      const sb = ['', ''];
      let top = '', moss = '', shade = '';
      stones.forEach((o, i) => {
        sb[i % 2] += lobed(r, o.x, o.y - o.h * .5, o.w, o.h, 8, .25);
        top += lobed(r, o.x - o.w * .25, o.y - o.h * .9, o.w * .55, o.h * .4, 6, .2);
        shade += lobed(r, o.x + o.w * .3, o.y - o.h * .3, o.w * .55, o.h * .5, 6, .2);
        if (r() < .35) moss += lobed(r, o.x - o.w * .1, o.y - o.h * 1.05, o.w * .45, o.h * .25, 6, .3);
      });
      body.push(['@stone.0', sb[0]], ['@stone.1', sb[1]], ['@stone.3', shade, .45], ['@stone.2', top, .7], ['@moss.0', moss, .9]);
      // a clump of iris at the back left (flowering in early summer), dried in winter
      let bl = ''; for (let i = 0; i < 9; i++) { const x = cx - rx * .62 + rr(r, -10, 10), h = rr(r, 22, 34); bl += `M${f1(x - 1.4)} ${f1(cy - ry)}q${f1(rr(r, -4, 4))} ${f1(-h * .6)} ${f1(rr(r, -6, 6))} ${f1(-h)}q${f1(rr(r, 0, 2))} ${f1(h * .5)} 3 ${f1(h)}z`; }
      body.push(['@moss.' + (s === 'winter' ? 0 : 1), bl]);
      if (s === 'summer') body.push(['@iris.0', ell(cx - rx * .62 - 4, cy - ry - 28, 3, 2.4) + ell(cx - rx * .62 + 6, cy - ry - 24, 3, 2.4)], ['@iris.1', ell(cx - rx * .62 - 4.6, cy - ry - 29, 1.4, 1.2) + ell(cx - rx * .62 + 5.4, cy - ry - 25, 1.4, 1.2)]);
      return { body, koi, glint };
    },
  });
})();

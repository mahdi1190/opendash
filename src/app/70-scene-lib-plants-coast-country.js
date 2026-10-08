/* ============================================================
   SCENE LIBRARY: plants, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   A field hedgerow of hawthorn and bramble: blossom in spring, bramble
   flowers in summer, blackberries and haws in autumn, bare twigs in winter.
   Anchor: the ground at the middle.
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

  /* ---------- plant.hedgerow-blackberry: a field hedge of hawthorn with bramble arching out of it; may blossom in spring, bramble flowers in summer, blackberries and red haws in autumn, bare twigs and a few haws in winter. v0 long and even, v1 tall and ragged, v2 low and laid ---------- */
  defineObj({
    id: 'plant.hedgerow-blackberry', category: 'plant', size: [380, 170], variants: 3, seasonal: true, shapeBySeason: true, flippable: true, parts: ['mass', 'canes'],
    palette: Object.assign({ base: { wood: ['#4a3a2c', '#5e4a38', '#3a2e24'], cane: ['#6a3a3a', '#7a4a3a'], berry: ['#1a1420', '#4a1e2a', '#c0302a', '#7a8a3a'], shine: '#e8e0f0' } }, bySeason({
      // winter: the hawthorn's bare twigs read purple-brown, the bramble keeps a few dull leaves
      leaf: { spring: ['#4f8a34', '#7aac48', '#2f5e26', '#a8cc6a'], summer: ['#2e5a26', '#4a7a34', '#1e3e1c', '#6a9440'], autumn: ['#5a6a2a', '#7a7a30', '#3a4a22', '#a07a34'], winter: ['#4a4a36', '#5a4a44', '#3e302c', '#6e5c4c'] },
      bloom: { spring: ['#fbf8f2', '#f4e6ea'], summer: ['#f4dde6', '#fbf6f2'], autumn: ['#c0302a', '#8a1e1a'], winter: ['#a02a22', '#6a1e1a'] },
      grass: GRASS,
    })),
    anim: { sway: { part: 'canes', pivot: [0, -20], deg: 2.2 } },
    shadow: { rx: 170, ry: 10, h: 120 },
    tags: ['uk', 'countryside', 'farm', 'field', 'lane', 'hedgerow', 'hawthorn', 'bramble', 'blackberry', 'kit:temperate', 'role:shrub'],
    credit: 'coast-country kit (hawthorn and bramble hedgerow)',
    build(v, r, ctx) {
      const s = ctx.season, sr = srnd('hedgerow|' + v), W = [360, 320, 370][v], H = [118, 150, 84][v], L = -W / 2;
      const prof = x => H * (.82 + .18 * Math.sin((x - L) / W * Math.PI * (v === 1 ? 3 : 2) + v)) * (v === 1 ? .8 + .2 * Math.sin(x * .05) : 1);
      const bare = s === 'winter', mass = [];
      // the woody frame: stems from the ground, branching (all that shows in winter, behind the leaves the rest of the year)
      let wd = '', tw = '';
      if (bare) {
        // winter: an irregular thicket of zig-zag hawthorn stems leaning every way, and a tangle of twigs crossing between them
        for (let i = 0; i < 22; i++) { const x = L + 10 + rr(sr, 0, W - 20), h = prof(x) * rr(sr, .55, 1), lean = rr(sr, -26, 26), j = rr(sr, -7, 7); wd += `M${f1(x)} 2L${f1(x + lean * .25 + j)} ${f1(-h * .35)}L${f1(x + lean * .6 - j)} ${f1(-h * .7)}L${f1(x + lean)} ${f1(-h)}`;
          for (let k = 0; k < 7; k++) { const t = rr(sr, .25, .95), bx = x + lean * t, by = -h * t, a = rr(sr, -2.9, -.25), l = rr(sr, 10, 30); tw += `M${f1(bx)} ${f1(by)}q${f1(Math.cos(a + .5) * l * .5)} ${f1(Math.sin(a + .5) * l * .5)} ${f1(Math.cos(a) * l)} ${f1(Math.sin(a) * l)}`; } }
      } else for (let i = 0; i < 16; i++) { const x = L + 12 + i * (W - 24) / 15 + rr(sr, -6, 6), h = prof(x) * rr(sr, .7, .95), lean = rr(sr, -14, 14); wd += `M${f1(x)} 2Q${f1(x + lean * .3)} ${f1(-h * .5)} ${f1(x + lean)} ${f1(-h)}`;
        for (let k = 0; k < 4; k++) { const t = rr(sr, .3, .9), bx = x + lean * t * t, by = -h * t, d = sr() < .5 ? -1 : 1; tw += `M${f1(bx)} ${f1(by)}q${f1(d * 8)} -6 ${f1(d * rr(sr, 12, 24))} ${f1(-rr(sr, 8, 18))}`; } }
      // the leafy mass: overlapping clumps, deep at the bottom and lit along the top (in winter a thin purple-brown haze of twig ends)
      const cl = ['', '', '', ''];
      const nC = bare ? 16 : 34;
      for (let i = 0; i < nC; i++) { const x = L + 16 + rr(r, 0, W - 32), top = prof(x), y = -rr(r, top * .3, top * .78), rx = rr(r, 22, 40), ry = rr(r, 16, 28); const layer = y < -top * .62 ? 3 : y < -top * .45 ? 1 : i % 2 ? 0 : 2; cl[layer] += lobed(r, x, y, rx * (bare ? .8 : 1), ry * (bare ? .9 : 1), 9, bare ? .45 : .3); }
      // the base: scalloped along its top (no hard edge), a twig haze in winter
      const base = Array.from({ length: 13 }, (_, i) => { const x = L + 20 + (i + 1) * (W - 40) / 13, xm = x - (W - 40) / 26; return `Q${f1(xm)} ${f1(-prof(xm) * (bare ? .66 : .86))} ${f1(x)} ${f1(-prof(x) * (bare ? .5 : .7))}`; }).join('');
      if (bare) mass.push(['@leaf.2', `M${L + 6} 2Q${L - 4} ${f1(-prof(L) * .4)} ${L + 20} ${f1(-prof(L + 20) * .5)}${base}Q${-L + 4} ${f1(-prof(-L) * .4)} ${-L - 6} 2z`, .85], ['@leaf.1', cl[0] + cl[2], .55], ['@leaf.3', cl[1] + cl[3], .4], { s: '@wood.0', w: 2.2, d: wd }, { s: '@wood.1', w: 1, d: tw }, { s: '@wood.2', w: .8, op: .8, d: tw.split('M').filter((_, i) => i % 3 === 1).map(q => 'M' + q).join(''), m: [1, 0, 0, 1, 3, -4], detail: true });
      else {
        mass.push({ s: '@wood.0', w: 2.6, d: wd }, { s: '@wood.1', w: 1.1, d: tw });
        mass.push(['@leaf.2', `M${L + 6} 2Q${L - 4} ${f1(-prof(L) * .5)} ${L + 20} ${f1(-prof(L + 20) * .7)}${base}Q${-L + 4} ${f1(-prof(-L) * .5)} ${-L - 6} 2z`]);
        mass.push(['@leaf.2', cl[2]], ['@leaf.0', cl[0]], ['@leaf.1', cl[1]], ['@leaf.3', cl[3], .9]);
      }
      if (!bare) { let lf = ''; for (let i = 0; i < 70; i++) { const x = L + 10 + r() * (W - 20), top = prof(x), y = -top * rr(r, .7, 1); const a = r() * 6.28; lf += `M${f1(x)} ${f1(y)}l${f1(Math.cos(a) * 4)} ${f1(Math.sin(a) * 4 - 1)}l${f1(Math.cos(a + .5) * 2)} ${f1(Math.sin(a + .5) * 2 + 2)}z`; } mass.push(['@leaf.3', lf, .9], ['@leaf.1', lf.split('M').slice(0, 30).join('M'), .5]); }
      // the season's colour in the mass: may blossom (spring), bramble flowers (summer), haws (autumn, winter)
      const fl = ['', ''];
      const nF = { spring: 160, summer: 60, autumn: 70, winter: 26 }[s];
      for (let i = 0; i < nF; i++) { const x = L + 14 + r() * (W - 28), top = prof(x), y = -top * rr(r, .35, .95); fl[i % 2] += s === 'summer' ? lobed(r, x, y, 2.6, 2.6, 5, .1) : circ(x, y, s === 'spring' ? rr(r, 1.4, 2.4) : rr(r, 1.4, 2)); }
      mass.push(['@bloom.0', fl[0]], ['@bloom.1', fl[1]]);
      // grass tufts along the foot soften the base (the same tufts every season)
      mass.push(...tufts(srnd('hedgerow|tufts|' + v), L - 4, -L + 4, Math.round(W / 14), bare ? 10 : 14, 2).map(([f, d]) => ({ f, d: d.replace(/-?\d+\.\d+/g, q => String(Math.round(+q))), detail: true })));   // whole units: blades are 3 wide
      // bramble canes arching out over the front, trifoliate leaves along them, and the blackberries (green, red, black as the summer goes)
      const canes = []; let cd = ''; const lv = ['', ''], bb = ['', '', '', ''];
      for (let i = 0; i < 7; i++) {
        const x0 = L + 30 + i * (W - 60) / 6 + rr(sr, -14, 14), h = prof(x0) * rr(sr, .5, .85), dir = sr() < .5 ? -1 : 1, span = rr(sr, 36, 70);
        const cx = x0 + dir * span * .4, cy = -h - 26, x1 = x0 + dir * span, y1 = -h * rr(sr, .25, .5);
        cd += `M${f1(x0)} ${f1(-h * .35)}Q${f1(cx)} ${f1(cy)} ${f1(x1)} ${f1(y1)}`;
        for (let k = 1; k < 6; k++) {
          const t = k / 6, px = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * cx + t * t * x1, py = (1 - t) * (1 - t) * (-h * .35) + 2 * t * (1 - t) * cy + t * t * y1;
          if (!bare || k % 3 === 0) for (const a of [-1.9, -1.2, -.5]) lv[k % 2] += `M${f1(px)} ${f1(py)}q${f1(Math.cos(a) * 3 - 2)} ${f1(Math.sin(a) * 3 - 2)} ${f1(Math.cos(a) * 7)} ${f1(Math.sin(a) * 7)}q${f1(-Math.cos(a) * 2 + 2)} ${f1(-Math.sin(a) * 2 + 2)} ${f1(-Math.cos(a) * 7)} ${f1(-Math.sin(a) * 7)}z`;
          if (s === 'autumn' || s === 'summer') for (let j = 0; j < 3; j++) { const bx = px + rr(r, -5, 5), by = py + rr(r, 2, 8); const ripe = s === 'autumn' ? (r() < .6 ? 0 : r() < .6 ? 1 : 2) : (r() < .2 ? 2 : 3); bb[ripe] += `M${f1(bx - 2.4)} ${f1(by)}a2.4 2.8 0 1 0 4.8 0a2.4 2.8 0 1 0 -4.8 0`; }
        }
      }
      canes.push({ s: '@cane.0', w: bare ? 2.6 : 2, d: cd }, { s: '@cane.1', w: .8, op: .7, d: cd });   // winter: the arching bramble canes are what shows
      canes.push(['@leaf.2', lv[0], bare ? .6 : 1], ['@leaf.0', lv[1], bare ? .6 : 1]);
      canes.push(['@berry.3', bb[3]], ['@berry.2', bb[2]], ['@berry.1', bb[1]], ['@berry.0', bb[0]]);
      if (s === 'autumn') canes.push(['@shine', bb[0].split('M').slice(1, 40).map(p => { const [a, b] = p.split(/[ a]/); return `M${f1(+a + 1.6)} ${f1(+b - 1.2)}h1.2v1.2h-1.2z`; }).join(''), .7]);
      return { mass, canes };
    },
  });
})();

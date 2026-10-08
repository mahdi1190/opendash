/* ============================================================
   SCENE LIBRARY: ground, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Coast and countryside ground cover: a sand and shingle beach strip and
   round hay bales. Anchor: the ground at the middle.
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

  const SNOW = '#f2f6fa';

  /* ---------- ground.beach: a strip of beach, the shingle bank behind and wet sand at the sea's edge; v0 sand with a shingle ridge, v1 all shingle, v2 rippled sand with a rock pool ---------- */
  defineObj({
    id: 'ground.beach', category: 'ground', size: [640, 64], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      sand: ['#e4d2a6', '#c9b386', '#f0e2c0', '#b09a70'], wet: ['#b8a47c', '#d8ccb0'], peb: ['#8a8478', '#a8a092', '#6a645a', '#c4bcae', '#7a6a5a', '#b0a08a'],
      weed: ['#3e3a24', '#5a5230'], shell: ['#f4efe4', '#e0c8b8'], pool: ['#7a9aa4', '#c8dce2'], drift: '#8a7a64',
    } },
    tags: ['uk', 'coast', 'seaside', 'beach', 'sand', 'shingle', 'kit:temperate', 'kit:water', 'role:ground'],
    credit: 'coast-country kit (generic sand and shingle beach)',
    build(v) {
      const sr = srnd('beach|' + v), body = [], L = -320, R = 320;
      const edge = (y, amp) => { let d = ''; for (let x = L + 30; x <= R - 30; x += 20) d += `L${x} ${f1(y + Math.sin(x * .021 + v) * amp + rr(sr, -1.5, 1.5))}`; return d; };
      /** A wavy line along the beach at y (a berm crest, a tideline), open. */
      const line = (y, amp, k = .017) => { let d = `M${L + 40} ${f1(y)}`; for (let x = L + 60; x <= R - 40; x += 20) d += `L${x} ${f1(y + Math.sin(x * k + v * 2) * amp)}`; return d; };
      // the dry sand (the whole strip), feathered at the ends
      body.push(['@sand.0', `M${L} 6Q${L - 8} -16 ${L + 30} -30${edge(-32, 4)}L${R - 30} -30Q${R + 8} -16 ${R} 6z`]);
      // v0: a solid grey shingle ridge along the back, its crest lit; v1: all shingle, a storm beach in two berms (lit crest, shadowed face)
      if (v === 0) body.push(['@peb.2', `M${L + 40} -20Q${L + 16} -26 ${L + 30} -34${edge(-37, 4)}L${R - 30} -34Q${R - 16} -26 ${R - 40} -20Q0 -27 ${L + 40} -20z`], { s: '@peb.3', w: 2, op: .8, d: line(-35, 3) });
      if (v === 1) body.push(['@peb.0', `M${L + 6} 6Q${L - 4} -18 ${L + 34} -34${edge(-38, 4)}L${R - 34} -34Q${R + 4} -18 ${R - 6} 6z`], { s: '@peb.2', w: 3, op: .7, d: line(-23, 3) + line(-9, 2.4, .023) }, { s: '@peb.3', w: 2.4, d: line(-26, 3) + line(-12, 2.4, .023) });
      // the pebbles: coarse ones on the ridge (v0), big rounded cobbles growing toward the sea (v1), a scatter (v2)
      const pebN = [150, 300, 120][v], band = [[-35, -22], [-36, 0], [-30, 2]][v], sz0 = [[1.6, 3.6], [1.8, 4.6], [1.4, 3.4]][v];
      const pb = ['', '', '', '', '', ''];
      for (let i = 0; i < pebN; i++) { const x = rr(sr, L + 30, R - 30), y = rr(sr, band[0], band[1]), sz = rr(sr, sz0[0], sz0[1]) * (.8 + .4 * (y - band[0]) / (band[1] - band[0])); if (Math.abs(x) > R - 50 && y < -24) continue; pb[Math.floor(sr() * 6)] += ell(x, y, sz, sz * rr(sr, .6, .8)); }
      pb.forEach((d, i) => body.push([`@peb.${i}`, d]));
      body.push(['#ffffff', pb[3].split('M').slice(1, 60).map(p => 'M' + p).join(''), .22]);
      // the strandline: v0 a bold dark tideline of weed with shells and a big driftwood log; v1 a bleached branch on the upper berm; v2 a scatter of weed
      let wd = '', sh = '';
      for (let i = 0; i < (v === 1 ? 0 : v === 0 ? 24 : 46); i++) { const x = rr(sr, L + 40, R - 40), y = -12 + Math.sin(x * .013) * 3 + rr(sr, -2, 2); wd += `M${f1(x)} ${f1(y)}q3 -2 6 0q3 2 6 -1`; if (sr() < .4) sh += `M${f1(x + 4)} ${f1(y + 2)}a2.2 1.6 0 0 1 4.4 0z`; }
      body.push({ s: '@weed.0', w: 1.4, op: .7, d: wd }, ['@shell.0', sh]);
      if (v === 0) body.push({ s: '@weed.0', w: 2.6, op: .85, d: line(-11, 2.4, .013) }, ['@drift', 'M-134 -2l74 -6q5 0 5 3t-4 3l-74 6q-5 0 -5 -3t4 -3z'], { s: '@shell.1', w: 1.2, op: .7, d: 'M-132 -4l72 -6' }, ['@sand.3', ell(-56, -6, 2, 2.6)], { s: '@drift', w: 2, d: 'M-136 0l-9 -6M-136 0l-10 2' });
      else if (v === 1) body.push({ s: '@drift', w: 3, d: 'M60 -26q30 -5 62 -3M96 -28q8 -6 18 -11' }, { s: '@shell.0', w: 1, op: .7, d: 'M62 -27q30 -5 58 -3' });
      else body.push(['@drift', `M${f1(rr(sr, -150, 150))} -14l34 -3l1 2.4l-34 3z`]);
      // ripples and a rock pool (v2)
      if (v === 2) { let rp = ''; for (let i = 0; i < 30; i++) { const x = rr(sr, L + 60, R - 60), y = rr(sr, -20, -2); rp += `M${f1(x)} ${f1(y)}q6 -2.2 12 0q6 2.2 12 0`; } body.push({ s: '@sand.3', w: 1, op: .45, d: rp }, { s: '@sand.2', w: .8, op: .6, d: rp.replace(/M(-?[\d.]+) (-?[\d.]+)/g, (m, a, b) => `M${a} ${f1(+b - 1.2)}`) });
        body.push(['@pool.0', 'M120 -8q20 -10 60 -6q22 4 4 10q-30 6 -60 2q-14 -2 -4 -6z'], ['@pool.1', 'M134 -8q16 -4 34 -3', .6], ['@peb.2', ell(118, -6, 8, 4) + ell(186, -4, 6, 3.4) + ell(160, -12, 5, 2.6)]); }
      // the wet edge, with a sheen: sand (v0, v2), dark wet stones (v1)
      if (v === 1) body.push(['@peb.2', `M${L + 8} 6Q${L + 20} -1 ${L + 60} -1${edge(-1, 2)}L${R - 60} -1Q${R - 20} -1 ${R - 8} 6z`, .6], { s: '@wet.1', w: 1.2, op: .6, d: `M${L + 70} 2h40M${L + 200} 3h70M${L + 380} 2h50M${R - 120} 3h60` });
      else body.push(['@wet.0',`M${L + 4} 6Q${L + 20} -2 ${L + 60} -1${edge(-1, 2)}L${R - 60} -1Q${R - 20} -2 ${R - 4} 6z`, .9], { s: '@wet.1', w: 1.2, op: .55, d: `M${L + 80} 2h90M${L + 260} 3h140M${R - 200} 2h110` });
      return { body };
    },
  });

  /* ---------- ground.hay-bales: round bales in a stubble field; v0 one end-on, v1 a pair, v2 a stack of three, v3 two wrapped in black silage film ---------- */
  defineObj({
    id: 'ground.hay-bales', category: 'ground', size: [210, 108], variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { wrap: ['#26282a', '#3e4246', '#8a9096'], net: '#e8e4dc', snow: SNOW } }, bySeason({
      hay: { spring: ['#b49a5e', '#8a7444', '#ccb47e', '#62502e'], summer: ['#dcb85e', '#b08a3a', '#f0d48c', '#7a5e2a'], autumn: ['#c8a050', '#9a7a36', '#dcbc78', '#6a5226'], winter: ['#a8905a', '#7e6a40', '#c0a878', '#56462c'] },
      stub: { spring: ['#7aa04a', '#a8a060'], summer: ['#d8c27a', '#b8a060'], autumn: ['#b0985a', '#8a7a4a'], winter: ['#8a7e60', '#6a6a50'] },
    })),
    shadow: { rx: 80, ry: 8, h: 60 },
    tags: ['uk', 'countryside', 'farm', 'field', 'hay', 'bales', 'harvest', 'kit:temperate', 'role:ground'],
    credit: 'coast-country kit (round hay bales)',
    build(v, r, ctx) {
      const s = ctx.season, body = [], R0 = 27, wrap = v === 3;
      const F = wrap ? '@wrap' : '@hay';
      /** End-on: the round face with its spiral. */
      const face = (cx, by) => {
        const cy = by - R0, out = [[`${F}.0`, circ(cx, cy, R0)]];
        if (wrap) out.push(['@wrap.1', `M${f1(cx - R0 * .7)} ${f1(cy - R0 * .5)}q${f1(R0 * .5)} ${f1(-R0 * .45)} ${f1(R0 * 1.1)} ${f1(-R0 * .2)}`, .7], { s: '@wrap.2', w: 1.4, op: .5, d: `M${f1(cx - R0 * .55)} ${f1(cy - R0 * .55)}q${f1(R0 * .4)} ${f1(-R0 * .3)} ${f1(R0 * .9)} ${f1(-R0 * .15)}` }, { s: '@wrap.1', w: .8, op: .6, d: `M${f1(cx - R0 * .2)} ${f1(cy + R0 * .1)}l${f1(R0 * .4)} ${f1(-R0 * .3)}M${f1(cx)} ${f1(cy + R0 * .4)}l${f1(R0 * .5)} ${f1(-R0 * .2)}` });
        else { let sp = `M${cx} ${cy}`; for (let a = 0; a < Math.PI * 9; a += .35) { const rad = R0 * a / (Math.PI * 9.4); sp += `L${f1(cx + Math.cos(a) * rad)} ${f1(cy + Math.sin(a) * rad)}`; } out.push({ s: '@hay.1', w: 1.1, op: .55, d: sp }); let st = ''; for (let i = 0; i < 24; i++) { const a = r() * Math.PI * 2, rd = R0 * rr(r, .3, .95); st += `M${f1(cx + Math.cos(a) * rd)} ${f1(cy + Math.sin(a) * rd)}l${f1(rr(r, -3, 3))} ${f1(rr(r, -3, 3))}`; } out.push({ s: '@hay.2', w: .8, op: .6, d: st, detail: true }); }
        out.push({ f: { lin: [[0, '#000000', 0], [1, '#000000', .32]], x1: cx - R0 * .3, y1: cy - R0 * .3, x2: cx + R0, y2: cy + R0 }, d: circ(cx, cy, R0) });
        if (!wrap) { let fz = ''; for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; fz += `M${f1(cx + Math.cos(a) * R0 * .98)} ${f1(cy + Math.sin(a) * R0 * .98)}l${f1(Math.cos(a + .4) * 3)} ${f1(Math.sin(a + .4) * 3)}`; } out.push({ s: '@hay.0', w: 1.2, d: fz }); }
        if (s === 'winter') out.push(['@snow', `M${f1(cx - R0 * .8)} ${f1(cy - R0 * .58)}Q${cx} ${f1(cy - R0 - 4)} ${f1(cx + R0 * .8)} ${f1(cy - R0 * .58)}q-6 3 -12 1q-8 3 -14 0q-8 3 -14 -1z`, .95]);
        return out;
      };
      /** Side-on: the cylinder (1.2 m long) with straw along it and the netwrap edge. */
      const side = (cx, by) => {
        const w = 44, cy = by - R0, x0 = cx - w / 2, out = [];
        out.push([`${F}.0`, `M${x0} ${by}h${w}q8 0 8 ${-R0}q0 ${-R0} -8 ${-R0}h${-w}q-8 0 -8 ${R0}q0 ${R0} 8 ${R0}z`], [`${F}.2`, `M${x0} ${by - 2 * R0 + 3}h${w}q5 1 6 6h${-w - 11}q1 -5 5 -6z`, .5], [`${F}.1`, `M${x0 - 6} ${cy + 10}h${w + 12}q-1 ${R0 - 12} -6 ${R0 - 10}h${-w}q-5 -2 -6 ${-R0 + 10}z`, .6]);
        out.push([`${F}.3`, `M${x0 + w} ${by}q8 0 8 ${-R0}q0 ${-R0} -8 ${-R0}q5 ${R0 * .2} 5 ${R0}q0 ${R0 * .8} -5 ${R0}z`, .45]);
        if (wrap) out.push({ s: '@wrap.2', w: 1.6, op: .5, d: `M${x0} ${by - 2 * R0 + 8}h${w}` }, { s: '@wrap.1', w: 1, op: .7, d: `M${x0 + 10} ${by - 4}l14 ${-2 * R0 + 8}M${x0 + 26} ${by - 4}l12 ${-2 * R0 + 10}` });
        else { let st = ''; for (let i = 0; i < 22; i++) { const y = by - rr(r, 3, 2 * R0 - 3), x = rr(r, x0 - 4, x0 + w - 6); st += `M${f1(x)} ${f1(y)}h${f1(rr(r, 6, 14))}`; } out.push({ s: '@hay.3', w: .8, op: .45, d: st, detail: true }, { s: '@net', w: .8, op: .5, d: `M${x0 + 3} ${by - 1}v${-2 * R0 + 2}M${x0 + w - 3} ${by - 1}v${-2 * R0 + 2}` }); }
        if (s === 'winter') out.push(['@snow', `M${x0 - 4} ${by - 2 * R0 + 4}q2 -4 6 -4h${w}q5 0 6 4q-8 3 -16 1q-10 3 -18 0q-10 3 -18 0z`, .95]);
        return out;
      };
      if (v === 0) body.push(...face(0, 0));
      if (v === 1) body.push(...side(-36, 0), ...face(34, 2));
      if (v === 2) body.push(...face(-28, 0), ...face(28, 0), ...face(0, -46));
      if (v === 3) body.push(...side(-34, 0), ...face(36, 2));
      // stubble rows (green regrowth in spring, gold in summer, dull in winter)
      const sb = ['', ''];
      for (let i = 0; i < 90; i++) { const x = rr(r, -100, 100), y = rr(r, -2, 6), h = rr(r, 2.5, 6); sb[i % 2] += `M${f1(x)} ${f1(y)}l${f1(rr(r, -1.5, 1.5))} ${f1(-h)}`; }
      body.push({ s: '@stub.0', w: 1, d: sb[0] }, { s: '@stub.1', w: 1, d: sb[1] });
      return { body };
    },
  });
})();

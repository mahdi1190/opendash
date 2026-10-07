/* ============================================================
   SCENE LIBRARY: structures, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Coast and countryside structures: a timber groyne, a dry stone wall and a
   five-bar field gate. Anchor: the ground at the middle.
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

  /* ---------- structure.groyne: a timber sea defence running down the beach (land on the left, the sea on the right); v0 sound and planked, v1 old and broken, v2 half buried in sand ---------- */
  defineObj({
    id: 'structure.groyne', category: 'structure', size: [470, 92], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      wood: ['#6e5e4c', '#4e4236', '#8c7c66', '#3a3028'], post: ['#5a4c3e', '#3e342a', '#7a6a58'], weed: ['#3e5a2e', '#5a7a3a', '#2a3a22'], barnacle: '#d8d4c8', iron: '#5a4a40',
      sand: ['#e0cea4', '#c8b488', '#ecdcb8'], wet: '#a8956e',
    } },
    shadow: { rx: 200, ry: 8, h: 50 },
    reflect: true,
    tags: ['uk', 'coast', 'seaside', 'beach', 'groyne', 'kit:temperate', 'kit:water', 'role:edge'],
    credit: 'coast-country kit (generic timber groyne)',
    build(v) {
      const sr = srnd('groyne|' + v), body = [], L = -232, R = 232, top = x => -72 + (x - L) / (R - L) * 50;
      const posts = []; for (let x = L; x <= R; x += 29) posts.push(x);
      // the planked wall (gaps and missing boards on the old one)
      if (v !== 1) {
        body.push(['@wood.0', poly([[L, 2], [L, top(L)], [R, top(R)], [R, 2]])], ['@wood.2', poly([[L, top(L)], [R, top(R)], [R, top(R) + 3], [L, top(L) + 3]]), .55]);
        let seams = ''; for (let y = -6; y > -72; y -= 8.5) { const xEnd = L + (y + 72) / 50 * (R - L); seams += `M${L} ${f1(y)}H${f1(Math.min(R, Math.max(L, xEnd)))}`; }
        body.push({ s: '@wood.3', w: 1, op: .55, d: seams });
        let grain = ''; for (let i = 0; i < 40; i++) { const x = L + sr() * (R - L), y = rr(sr, top(x) + 4, -4), l = rr(sr, 8, 24); grain += `M${f1(x)} ${f1(y)}h${f1(Math.min(l, R - x))}`; }
        body.push({ s: '@wood.2', w: .7, op: .4, d: grain, detail: true });
        body.push({ f: { lin: [[0, '#000000', 0], [1, '#000000', .35]], x1: 0, y1: -40, x2: 0, y2: 2 }, d: poly([[L, 2], [L, -40], [R, -40], [R, 2]]) });
      } else {
        let pl = ''; for (let i = 0; i < posts.length - 1; i++) { const a = posts[i], b = posts[i + 1]; const k = Math.floor(rr(sr, 0, 4)); for (let j = 0; j < k; j++) { const y = -3 - j * 8.5; if (y - 7 < top(b)) break; pl += rect(a, y - 7, b - a, 7); } }
        body.push(['@wood.0', pl], { s: '@wood.3', w: .8, op: .5, d: pl });
      }
      // weed and barnacles on the lower boards and posts; the tide line
      let weed = '', weed2 = '', barn = '';
      for (let x = L; x < R; x += 6) { const h = rr(sr, 6, 18) * (0.5 + (x - L) / (R - L)); weed += `M${f1(x)} 2q${f1(rr(sr, -2, 2))} ${f1(-h * .6)} ${f1(rr(sr, 1, 4))} ${f1(-h)}q${f1(rr(sr, 0, 2))} ${f1(h * .5)} 3 ${f1(h)}z`; if (sr() < .5) weed2 += ell(x + rr(sr, 0, 6), rr(sr, -14, -2), rr(sr, 2, 4), rr(sr, 1.2, 2)); if (sr() < .6) barn += ell(x + rr(sr, 0, 6), rr(sr, -26, -6), .9, .7); }
      // the posts: squared timbers, tops weathered and uneven
      const pt = ['', '', ''];
      for (const x of posts) { const t = top(x) - (v === 1 ? rr(sr, -14, 10) : 6) - 4, w = 9; pt[0] += `M${f1(x - w / 2)} 4V${f1(t + 2)}l${f1(w * .3)} -2l${f1(w * .4)} 1l${f1(w * .3)} -1V4z`; pt[1] += rect(x + w / 2 - 3, t, 3, 4 - t); pt[2] += rect(x - w / 2, t, w, 2); }
      body.push(['@post.0', pt[0]], ['@post.1', pt[1], .8], ['@post.2', pt[2], .8], { s: '@iron', w: 1.4, op: .7, d: posts.map(x => `M${f1(x - 2)} ${f1(top(x) + 10)}h4M${f1(x - 2)} -18h4`).join('') });
      body.push(['@weed.0', weed, .9], ['@weed.1', weed2, .8], ['@barnacle', barn, .7]);
      // the sand at its foot: drifts against the boards (deep on v2), wet sand toward the sea
      body.push(['@sand.0', `M${L - 20} 4Q${L + 40} -6 0 -2Q${R - 60} 0 ${R + 20} 4z`], ['@wet', `M${R - 160} 4Q${R - 40} -1 ${R + 20} 4z`, .6]);
      if (v === 2) body.push(['@sand.0', `M${L - 24} 4L${L - 6} ${f1(top(L) + 12)}Q${L + 120} -42 ${L + 260} -14Q${R - 60} -2 ${R} 4z`], ['@sand.2', `M${L - 4} ${f1(top(L) + 14)}Q${L + 110} -38 ${L + 230} -18Q${L + 110} -32 ${L - 4} ${f1(top(L) + 18)}z`, .8], ['@sand.1', `M${L + 200} -10Q${L + 300} -2 ${R} 4H${L + 240}z`, .5]);
      return { body };
    },
  });

  /* ---------- structure.stone-wall: a dry stone field wall with upright coping; v0 grey limestone, v1 honey Cotswold stone, v2 dark gritstone ---------- */
  defineObj({
    id: 'structure.stone-wall', category: 'structure', size: [330, 62], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: {
      s0: ['#a8a49a', '#8e8a80', '#bcb8ae', '#76726a', '#3a3834'], s1: ['#c8a86a', '#b08e54', '#dcc28a', '#96764a', '#4a3c28'], s2: ['#6c6c64', '#5a5a52', '#82827a', '#4a4a44', '#24241f'],
      lichen: ['#d8d07a', '#e8e8dc', '#b8c890'], snow: SNOW,
    } }, bySeason({ grass: GRASS, moss: { spring: ['#6a9a3a', '#8ab84a'], summer: ['#5a8a32', '#7aa040'], autumn: ['#6a7a32', '#8a8a3e'], winter: ['#4e5a3a', '#5e6a44'] } })),
    shadow: { rx: 150, ry: 7, h: 46 },
    tags: ['uk', 'countryside', 'farm', 'field', 'dales', 'cotswolds', 'stone-wall', 'kit:temperate', 'role:edge'],
    credit: 'coast-country kit (generic dry stone wall)',
    build(v, r, ctx) {
      const s = ctx.season, sr = srnd('wall|' + v), S = `@s${v}`, body = [], L = -160, R = 160, H = 42;
      const wx = (y, side) => side * (R - 4 * (-y / H));
      body.push([`${S}.4`, poly([[L, 0], [L + 4, -H], [R - 4, -H], [R, 0]])]);
      // courses of irregular stones, bigger at the foot, each a jittered polygon
      const st = ['', '', '', ''];
      let y = 0, row = 0;
      while (y > -H + 2) {
        const rh = Math.min(rr(sr, 7, 11) * (row === 0 ? 1.3 : 1), y + H); let x = wx(y, -1) + rr(sr, 0, 4);
        while (x < wx(y, 1) - 3) {
          const w = Math.min(rr(sr, 10, 24) * (row === 0 ? 1.3 : 1), wx(y, 1) - x), j = () => rr(sr, -1.2, 1.2);
          st[Math.floor(sr() * 4)] += poly([[x + 1 + j(), y - 1 + j()], [x + w - 1 + j(), y - 1 + j()], [x + w - .5, y - rh * .5 + j()], [x + w - 1.5 + j(), y - rh + 1 + j()], [x + 1.5 + j(), y - rh + 1 + j()], [x + .5, y - rh * .5 + j()]]);
          x += w + rr(sr, .5, 1.5);
        }
        y -= rh; row++;
      }
      body.push([`${S}.0`, st[0]], [`${S}.1`, st[1]], [`${S}.2`, st[2]], [`${S}.3`, st[3]]);
      // the coping: stones set on edge along the top
      const cp = ['', ''];
      for (let x = L + 6; x < R - 6;) { const w = rr(sr, 4, 7), h = rr(sr, 10, 15), lean = rr(sr, -2, 2); cp[Math.floor(sr() * 2)] += poly([[x, -H + 1], [x + w, -H + 1], [x + w + lean, -H - h], [x + lean + 1, -H - h - 1]]); x += w + .6; }
      body.push([`${S}.4`, rect(L + 4, -H - 4, R - L - 8, 5)], [`${S}.1`, cp[0]], [`${S}.2`, cp[1]], ['#000000', poly([[R - 30, 0], [R, 0], [R - 4, -H], [R - 34, -H]]), .12]);
      // lichen and moss (more moss in the wet half of the year), snow lying on top in winter
      const li = ['', ''], mo = ['', ''];
      for (let i = 0; i < 26; i++) li[i % 2] += ell(rr(sr, L + 6, R - 6), rr(sr, -H + 2, -4), rr(sr, 1.2, 3), rr(sr, .8, 2));
      for (let i = 0; i < (s === 'summer' ? 8 : 16); i++) { const x = rr(r, L + 10, R - 10); mo[i % 2] += lobed(r, x, -H - rr(r, 8, 13), rr(r, 4, 9), rr(r, 2, 3.5), 5, .3); }
      body.push(['@lichen.0', li[0], .6], ['@lichen.1', li[1], .5], ['@moss.0', mo[0], .9], ['@moss.1', mo[1], .85]);
      if (s === 'winter') { let sn = `M${L + 6} ${-H - 10}`; for (let x = L + 6; x <= R - 6; x += 10) sn += `L${f1(x + 5)} ${f1(-H - 15 - r() * 3)}L${f1(x + 10)} ${f1(-H - 12 - r() * 2)}`; sn += `V${-H - 6}Q0 ${-H - 2} ${L + 6} ${-H - 6}z`; body.push(['@snow', sn, .95]); }
      body.push(...tufts(r, L - 8, R + 8, 34, s === 'summer' ? 13 : 10, 2));
      return { body };
    },
  });

  /* ---------- structure.field-gate: a five-bar field gate between two posts; v0 timber, v1 galvanised metal, v2 timber swung open ---------- */
  defineObj({
    id: 'structure.field-gate', category: 'structure', size: [200, 86], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: {
      wood: ['#9a8a70', '#76684f', '#b8a88c', '#4e4436'], metal: ['#a8b0b4', '#7a8286', '#d0d6da'], post: ['#6a5a46', '#4a3e30', '#86745c'], iron: '#3a3632', mud: ['#5a4a38', '#7a6648'], snow: SNOW,
    } }, bySeason({ grass: GRASS, nettle: { spring: ['#3e6e2a', '#5a8a3a'], summer: ['#365e26', '#4e7a32'], autumn: ['#5a5a2a', '#6e6a32'], winter: ['#4a4a3a', '#5a5a48'] } })),
    shadow: { rx: 90, ry: 6, h: 70 },
    tags: ['uk', 'countryside', 'farm', 'field', 'gate', 'kit:temperate', 'role:edge'],
    credit: 'coast-country kit (generic five-bar gate)',
    build(v, r, ctx) {
      const s = ctx.season, body = [], hx = -84, lx = 84;
      // the posts: a heavy hanging post (left) and a lighter latch post (right), with weathered caps
      body.push(['@post.0', rect(hx - 7, -80, 14, 82)], ['@post.1', rect(hx + 2, -80, 5, 82), .7], ['@post.2', 'M' + (hx - 7) + ' -80l7 -5l7 5z'], ['@post.0', rect(lx - 5, -70, 10, 72)], ['@post.1', rect(lx + 1, -70, 4, 72), .7], ['@post.2', 'M' + (lx - 5) + ' -70l5 -4l5 4z']);
      if (s === 'autumn' || s === 'winter') body.push(['@mud.0', ell(0, 1, 70, 5), .85], ['@mud.1', ell(-10, 0, 40, 2.4), .6]);
      const gate = [];
      if (v === 1) {
        // galvanised: tubular rails and stays
        let t = ''; for (const y of [-14, -24, -34, -44, -54, -64]) t += `M${hx + 8} ${y}H${lx - 7}`;
        for (const x of [hx + 8, -20, 30, lx - 7]) t += `M${x} -12V-66`;
        t += `M${hx + 8} -14L-20 -64M-20 -14L30 -64`;
        gate.push({ s: '@metal.1', w: 3.2, d: t }, { s: '@metal.0', w: 2.2, d: t }, { s: '@metal.2', w: .8, op: .7, d: t.replace(/M(-?[\d.]+) (-?[\d.]+)/g, (m0, a, b) => `M${a} ${f1(+b - .6)}`) });
      } else {
        // timber: five bars, the hanging stile, the head, the diagonal brace and a mid stay
        const bar = (y, h) => [['@wood.0', rect(hx + 6, y, lx - hx - 11, h)], ['@wood.2', rect(hx + 6, y, lx - hx - 11, 1.2), .6], ['@wood.1', rect(hx + 6, y + h - 1.2, lx - hx - 11, 1.2), .6]];
        gate.push(...bar(-68, 6), ...bar(-54, 4.5), ...bar(-42, 4.5), ...bar(-30, 4.5), ...bar(-18, 5));
        gate.push(['@wood.0', rect(hx + 5, -70, 7, 58)], ['@wood.1', rect(hx + 9, -70, 3, 58), .6], ['@wood.0', rect(lx - 12, -68, 6, 56)], ['@wood.1', rect(lx - 9, -68, 3, 56), .6]);
        gate.push(['@wood.0', poly([[hx + 10, -14], [hx + 16, -14], [8, -66], [2, -66]])], ['@wood.1', poly([[hx + 14, -14], [hx + 16, -14], [8, -66], [6, -66]]), .6], ['@wood.0', rect(4, -68, 5, 56)]);
        gate.push({ s: '@wood.3', w: .6, op: .45, d: `M${hx + 14} -66h40M${hx + 30} -51h50M-10 -39h60M${hx + 20} -27h40M20 -15h50`, detail: true });
      }
      gate.push(['@iron', rect(hx + 2, -66, 8, 3) + rect(hx + 2, -20, 8, 3)], ['@iron', rect(lx - 10, -48, 12, 3)]);
      if (s === 'winter') gate.push(['@snow', `M${hx + 6} -68h${lx - hx - 11}v-2.5q-40 -2 -${lx - hx - 11} 0z`, .9]);
      // v2 swung open toward the viewer: the gate foreshortened about the hanging post
      body.push(...(v === 2 ? withM(gate, [.42, .16, 0, 1, f1(hx * (1 - .42)), f1(-hx * .16 + 4)]) : gate));
      if (v === 2) body.push(['@post.0', rect(lx - 5, -70, 10, 72)], ['@post.1', rect(lx + 1, -70, 4, 72), .7]);
      if (s === 'winter') body.push(['@snow', `M${hx - 8} -80l8 -6l8 6zM${lx - 6} -70l6 -5l6 5z`]);
      // grass and nettles round the posts
      const nt = ['', ''];
      for (const px of [hx, lx]) for (let i = 0; i < (s === 'winter' ? 3 : 7); i++) { const x = px + rr(r, -16, 16), h = s === 'winter' ? rr(r, 6, 10) : rr(r, 14, 26); nt[i % 2] += `M${f1(x)} 1V${f1(-h)}` + Array.from({ length: 3 }, (_, k) => `M${f1(x)} ${f1(-h * (k + 1) / 4)}l-5 -3l5 1l5 -3z`).join(''); }
      body.push({ s: '@nettle.0', w: 1.1, d: nt[0] }, ['@nettle.1', nt[1]], { s: '@nettle.1', w: 1.1, d: nt[1] });
      body.push(...tufts(r, hx - 26, lx + 26, 26, 12, 2));
      return { body };
    },
  });
})();

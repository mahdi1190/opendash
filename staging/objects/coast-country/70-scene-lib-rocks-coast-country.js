/* ============================================================
   SCENE LIBRARY: rocks, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Chalk cliffs: white chalk with flint bands, a turf cap that follows the
   season, fallen blocks at the foot. Anchor: the beach at the middle.
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

  /* ---------- rock.chalk-cliff: white chalk cliffs under a turf cap; v0 a rolling line of cliffs (Seven Sisters-like), v1 a headland with a sea stack, v2 a lower cliff with a scrubby slumped undercliff ---------- */
  defineObj({
    id: 'rock.chalk-cliff', category: 'rock', size: [740, 330], variants: 3, seasonal: true, flippable: true,
    palette: Object.assign({ base: {
      chalk: ['#eeebe2', '#c9c5ba', '#dcd8cc', '#9e9a90', '#fbfaf5'], flint: ['#4a4a4e', '#6a6a6e'], algae: ['#5a6a3a', '#7a7a4a'], rubble: ['#d8d4c8', '#b8b4a8', '#f2f0e8'],
    } }, bySeason({
      turf: { spring: ['#6aa040', '#8cc050', '#4a7a2e'], summer: ['#5e9038', '#86ac48', '#3e6a28'], autumn: ['#7e8a3e', '#a0a050', '#5a6230'], winter: ['#6a7458', '#86886a', '#4a5440'] },
      scrub: { spring: ['#4f7a30', '#7aa040', '#e8e0a0'], summer: ['#3e6a2a', '#5e8a36', '#d8c8e0'], autumn: ['#7a6a2a', '#9a7a34', '#b0402a'], winter: ['#5a5a44', '#6a6a52', '#7a5a4a'] },
    })),
    reflect: true,
    tags: ['uk', 'coast', 'seaside', 'cliffs', 'chalk', 'downs', 'signature', 'natural', 'kit:temperate', 'kit:water', 'role:rock'],
    credit: 'coast-country kit (generic chalk cliffs)',
    build(v) {
      const sr = srnd('chalk|' + v), body = [], L = -370, R = v === 1 ? 210 : 370;
      // the cliff top: rolling (v0), a headland rising seaward (v1), lower (v2)
      const topY = x => v === 0 ? -250 - 40 * Math.sin((x + 370) / 740 * Math.PI * 3.1) - 18 * Math.sin(x * .02)
        : v === 1 ? -230 - 70 * (x - L) / (R - L) - 10 * Math.sin(x * .03) : -170 - 22 * Math.sin((x + 370) / 740 * Math.PI * 2) - 8 * Math.sin(x * .04);
      const pts = []; for (let x = L + 20; x <= R - 10; x += 10) pts.push([x, topY(x)]);
      const face = poly([[L, 0], [L - 4, -40], [L + 6, topY(L + 20) + 40], [L + 20, topY(L + 20)], ...pts, [R + 4, topY(R - 10) + 30], [R + 10, -60], [R + 16, 0]]);
      body.push(['@chalk.0', face]);
      // buttresses and gullies: each rib lit on its left, shadowed in its gully on the right
      const lt = [], dk = [];
      for (let x = L + 30; x < R - 20; x += rr(sr, 44, 90)) {
        const t = topY(x) + 14, w = rr(sr, 14, 30), lean = rr(sr, -10, 10);
        dk.push(poly([[x, t], [x + w * .4, t + 6], [x + w + lean, 0], [x + lean - 2, 0]]));
        lt.push(poly([[x - w * 1.2, t + 4], [x - 2, t], [x + lean - 4, 0], [x - w * 1.3 + lean, 0]]));
      }
      body.push(['@chalk.1', dk.join(''), .5], ['@chalk.4', lt.join(''), .55]);
      body.push({ f: { lin: [[0, '#ffffff', .18], [.55, '#ffffff', 0], [1, '#5a5a50', .16]], x1: 0, y1: v === 2 ? -190 : -290, x2: 0, y2: 0 }, d: face });
      let stain = ''; for (let i = 0; i < 26; i++) { const x = rr(sr, L + 30, R - 20), y = topY(x) + 8, h = rr(sr, 24, 90); stain += `M${f1(x - 2)} ${f1(y)}q${f1(rr(sr, -2, 2))} ${f1(h * .5)} 1 ${f1(h)}l2 0q-1 ${f1(-h * .5)} 2 ${f1(-h)}z`; }
      body.push(['@chalk.3', stain, .3]);
      // bedding: faint strata following the top, and flint bands as rows of dark nodules
      let strata = '', flint = '', flint2 = '';
      for (let k = 1; k < 8; k++) { const off = k * (v === 2 ? 20 : 30); strata += `M${L + 10} ${f1(topY(L + 20) + off)}`; for (let x = L + 20; x <= R - 10; x += 20) strata += `L${x} ${f1(topY(x) * (1 - off / 340) + off * .2 + rr(sr, -1, 1))}`;
        for (let x = L + 14; x < R - 10; x += rr(sr, 8, 15)) { const y = topY(x) * (1 - off / 340) + off * .2 + rr(sr, -1.5, 1.5); const e = ell(x, y, rr(sr, 1.2, 2.6), rr(sr, .8, 1.6)); if (k % 2) flint += e; else flint2 += e; } }
      body.push({ s: '@chalk.3', w: .8, op: .16, d: strata }, ['@flint.0', flint, .6], ['@flint.1', flint2, .5]);
      // fissures and the shade along the top edge under the turf overhang
      let fis = ''; for (let i = 0; i < 40; i++) { const x = rr(sr, L + 20, R - 10), y0 = rr(sr, topY(x) + 20, -20); fis += `M${f1(x)} ${f1(y0)}l${f1(rr(sr, -3, 3))} ${f1(rr(sr, 10, 40))}l${f1(rr(sr, -2, 2))} ${f1(rr(sr, 6, 20))}`; }
      fis = fis.split('M').filter((_, i) => i % 2).map(p => 'M' + p).join('');
      body.push({ s: '@chalk.3', w: 1, op: .45, d: fis, detail: true }, ['@chalk.3', 'M' + pts.map(p => `${p[0]} ${f1(p[1] + 4)}`).join('L') + 'L' + pts.slice().reverse().map(p => `${p[0]} ${f1(p[1] + 18)}`).join('L') + 'z', .3]);
      // the turf cap: a thin green line with a ragged lip hanging over
      let turf = `M${L + 14} ${f1(topY(L + 20) + 6)}`; for (const [x, y] of pts) turf += `L${x} ${f1(y - 3)}`; for (const [x, y] of pts.slice().reverse()) turf += `L${x} ${f1(y + 5 + rr(sr, 0, 5))}`; turf += 'z';
      let tufts2 = ''; for (const [x, y] of pts) if (sr() < .6) tufts2 += `M${x} ${f1(y - 2)}l2 -5l2 5z`;
      body.push(['@turf.0', turf], ['@turf.1', 'M' + pts.map(p => `${p[0]} ${f1(p[1] - 3)}`).join('L') + 'L' + pts.slice().reverse().map(p => `${p[0]} ${f1(p[1])}`).join('L') + 'z', .8], ['@turf.2', tufts2]);
      // v1: the sea stack off the point; v2: the slumped, scrubby undercliff
      if (v === 1) {
        const sx = 300, st = -210;
        body.push(['@chalk.0', `M${sx - 40} 0L${sx - 36} ${st + 40}Q${sx - 30} ${st} ${sx - 8} ${st - 4}Q${sx + 22} ${st + 2} ${sx + 30} ${st + 30}L${sx + 44} 0z`], ['@chalk.1', `M${sx + 6} ${st + 2}Q${sx + 22} ${st + 2} ${sx + 30} ${st + 30}L${sx + 44} 0H${sx + 10}z`, .55], ['@chalk.4', `M${sx - 36} ${st + 40}L${sx - 28} ${st + 6}L${sx - 22} 0H${sx - 40}z`, .5]);
        let sf = ''; for (let k = 1; k < 6; k++) for (let x = sx - 34; x < sx + 36; x += rr(sr, 5, 9)) sf += ell(x, st + k * 36 + rr(sr, -1, 1), 1.6, 1); body.push(['@flint.0', sf, .55], ['@turf.0', `M${sx - 30} ${st + 4}Q${sx - 8} ${st - 12} ${sx + 24} ${st + 6}Q${sx} ${st + 2} ${sx - 30} ${st + 8}z`]);
      }
      if (v === 2) {
        const sc = ['', '', ''];
        body.push(['@turf.2', `M${L - 4} 0Q${L + 40} -60 ${L + 120} -76Q${L + 220} -90 ${L + 300} -50Q${L + 360} -20 ${L + 420} 0z`, .9]);
        for (let i = 0; i < 34; i++) { const x = rr(sr, L + 10, L + 400), y = -rr(sr, 4, 60) * (1 - Math.abs(x - (L + 200)) / 260); sc[i % 3] += lobed(sr, x, y, rr(sr, 10, 22), rr(sr, 6, 12), 7, .3); }
        body.push(['@scrub.0', sc[0]], ['@scrub.1', sc[1]], ['@scrub.0', sc[2]]);
        let fl = ''; for (let i = 0; i < 30; i++) fl += circ(rr(sr, L + 30, L + 380), -rr(sr, 6, 50), 1.6); body.push(['@scrub.2', fl, .9]);
      }
      // the foot: green weed at the tide line and fallen chalk blocks
      body.push(['@algae.0', `M${L} 0V-10Q0 -16 ${R + 16} -12V0z`, .55], ['@algae.1', `M${L} 0V-4Q0 -8 ${R + 16} -5V0z`, .5]);
      const rb = ['', '', ''];
      for (let i = 0; i < 22; i++) { const x = rr(sr, L, R + 10), w = rr(sr, 6, 20); rb[i % 3] += lobed(sr, x, -w * .3, w, w * .55, 6, .3); }
      body.push(['@rubble.0', rb[0]], ['@rubble.1', rb[1]], ['@rubble.2', rb[2]]);
      return { body };
    },
  });
})();

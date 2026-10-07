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

  /* ---------- rock.chalk-cliff: white chalk cliffs under a turf cap; v0 a long face rolling over two summits with a dip between,
     v1 a headland rising to its point with a sea stack off it, v2 a lower face above a green landslip ----------
     Everything is seeded per variant (srnd), so a season changes colours only: the turf cap, the landslip's grass and scrub and a
     little of the algae. The chalk stays white; the night look is the engine's night grade of these tones. Light from the left. */
  const gs = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
  /** The same polygon wound clockwise on screen, so overlapping pieces in one path add up instead of cutting holes. */
  const cw = P => (P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) < 0 ? P.slice().reverse() : P);
  /** poly() in whole units: for the broad, soft tone shapes, where a tenth of a unit is wasted bytes. */
  const polyI = pts => 'M' + pts.map(p => Math.round(p[0]) + ' ' + Math.round(p[1])).join('L') + 'z';
  /** A smooth seeded wander of about amp, with a wavelength of about len. */
  const wave = (r, amp, len) => { const k = 2 * Math.PI / len * rr(r, .8, 1.25), k2 = k * rr(r, 2.3, 3.4), p = rr(r, 0, 7), p2 = rr(r, 0, 7), a2 = rr(r, .2, .45); return x => amp * (Math.sin(x * k + p) + a2 * Math.sin(x * k2 + p2)); };
  /** A jagged near-vertical line from (x, y0) down to y1, drifting sideways by lean: its points, top first. */
  const crease = (r, x, y0, y1, lean, jit = 2.2) => {
    const n = Math.max(2, Math.round((y1 - y0) / rr(r, 24, 38))), pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n, mid = i > 0 && i < n; pts.push([x + lean * t + (mid ? rr(r, -jit, jit) : 0), y0 + (y1 - y0) * t + (mid ? rr(r, -3, 3) : 0)]); }
    return pts;
  };
  /** The band beside a line of points (side 1: to its right, -1: to its left), w0 wide at the top and w1 at the foot, its far edge
      wavering by rag; with top (the top line) the far corner stays under the edge. */
  const wedge = (r, pts, w0, w1, side, top, rag = .2) => {
    const n = pts.length - 1, far = pts.map(([x, y], i) => { const fx = x + side * (w0 + (w1 - w0) * i / n) * (1 + rr(r, -rag, rag)); return [fx, i || !top ? y : Math.max(y, top(fx) + 3)]; });
    return polyI(cw(pts.concat(far.reverse())));
  };
  /** A soft paint across the band beside a crease: paint at opacity a on the line, b at w away on side (1: right, -1: left). */
  const across = (pts, w, side, paint, a, b) => {
    const p = pts[0], q = pts[pts.length - 1], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    return { lin: [[0, paint, a], [1, paint, b]], x1: f1(mx), y1: f1(my), x2: f1(mx + dy / l * side * w), y2: f1(my - dx / l * side * w) };
  };
  /** A thin lens from (x0, y) to (x1, y + tilt) about 1.1 * |t| thick, bulging down when t > 0: a ledge's lit top, the shadow under it. */
  const lens = (x0, x1, y, t, tilt = 0) => { const xm = f1((x0 + x1) / 2), a = y + tilt / 2 + t * 2, b = y + tilt / 2 - t * .25; return `M${f1(x0)} ${f1(y)}Q${xm} ${f1(Math.min(a, b))} ${f1(x1)} ${f1(y + tilt)}Q${xm} ${f1(Math.max(a, b))} ${f1(x0)} ${f1(y)}z`; };
  /** A tapered streak hanging from (x, y): len long, w wide at the top, drifting sideways by bend. */
  const streak = (x, y, len, w, bend) => `M${f1(x - w / 2)} ${f1(y)}Q${f1(x - w * .2 + bend * .4)} ${f1(y + len * .55)} ${f1(x + bend)} ${f1(y + len)}Q${f1(x + w * .2 + bend * .4)} ${f1(y + len * .5)} ${f1(x + w / 2)} ${f1(y)}z`;
  /** A short stroke from (x, y) (round-capped, so it reads as a nodule or a pebble). */
  const dash = (x, y, dx, dy) => `M${Math.round(x)} ${Math.round(y)}l${f1(dx)} ${f1(dy)}`;
  /** An angular chalk block resting on y at x, about s across: [outline, shaded lower-right facet, lit upper-left facet]. */
  const block = (r, x, y, s) => {
    const n = r() < .5 ? 5 : 6, a0 = r(), cy = y - s * .5, P = [];
    for (let i = 0; i < n; i++) { const a = ((i + a0 + rr(r, -.18, .18)) / n) * 2 * Math.PI, k = rr(r, .72, 1.05); P.push([x + Math.cos(a) * s * .55 * k, cy + Math.sin(a) * s * .5 * k, Math.atan2(Math.sin(a), Math.cos(a))]); }
    const pick = (lo, hi) => P.filter(p => p[2] >= lo && p[2] <= hi).sort((a, b) => a[2] - b[2]), c = [x + s * .04, cy + s * .04], sh = pick(-.6, 2.5), lt = pick(-2.9, -.9);
    return [poly(P), sh.length > 1 ? poly([c, ...sh]) : '', lt.length > 1 ? poly([c, ...lt]) : ''];
  };
  /** One solid of chalk (the main face, or a stack): its top points (notched, crumbling where bite > 0), its end outlines and face. */
  const chalkSolid = (r, x0, x1, T, bite, notchAt, kind) => {
    const X = [x0, x1, ...notchAt.filter(x => x > x0 && x < x1)];
    for (let x = x0 + rr(r, 4, 9); x < x1 - 4; x += rr(r, 6, 12)) X.push(x);
    const pts = [...new Set(X)].sort((a, b) => a - b).map(x => [x, T(x) + rr(r, -.6, .6) + (bite(x) > .5 ? rr(r, -2.4, 2.4) : 0)]);
    const a = pts[0], b = pts[pts.length - 1], ha = -a[1], hb = -b[1];
    const left = kind === 'stack' ? [[a[0] - 9, 0], [a[0] - 6, -ha * .4], [a[0] - 3, a[1] + 12]] : [[a[0] - 16, 0], [a[0] - 13, -ha * .3], [a[0] - 9, a[1] + ha * .3], [a[0] - 4, a[1] + 9]];
    const right = kind === 'stack' ? [[b[0] + 3, b[1] + 12], [b[0] + 7, -hb * .45], [b[0] + 10, 0]]
      : kind === 'head' ? [[b[0] + 7, b[1] + 14], [b[0] + 15, b[1] + hb * .3], [b[0] + 19, -hb * .45], [b[0] + 26, -20], [b[0] + 30, 0]]
        : [[b[0] + 4, b[1] + 9], [b[0] + 9, b[1] + hb * .3], [b[0] + 13, -hb * .3], [b[0] + 16, 0]];
    return { x0, x1, T, bite, kind, pts, left, right, face: poly([...left, ...pts, ...right]) };
  };
  /** v2's landslip: a hummocky green mass at the foot, slipped chalk blocks tilted in it (their flint bands tilted too), scrub, flowers. */
  const chalkSlump = (r, [x0, x1], Y) => {
    let mass = `M${x0} 2`, hum = '', bare = '', cast = '', bk = '', bkS = '', cap = '', capH = '', nod = '', fl = '';
    for (let x = x0; x <= x1; x += rr(r, 8, 14)) mass += `L${f1(x)} ${f1(Y(x) + rr(r, -1.5, 1.5))}`;
    mass += `L${x1} 2z`;
    for (let i = 0; i < 9; i++) { const x = rr(r, x0 + 20, x1 - 30); hum += lobed(r, x, Y(x) + rr(r, 7, 14), rr(r, 16, 34), rr(r, 6, 11), 7, .22); }
    for (let i = 0; i < 5; i++) { const x = rr(r, x0 + 30, x1 - 40), y = Y(x) + rr(r, 14, 40); bare += lens(x, x + rr(r, 10, 24), y, rr(r, 1.8, 3.6), rr(r, -2, 2)); }
    for (const [u, bw, bh, tilt] of [[.24, 50, 40, -9], [.53, 64, 50, -13], [.8, 40, 28, 6]]) {
      const x = x0 + (x1 - x0) * u, base = Y(x) + 12, top = Y(x) - bh * .55, l = x - bw / 2, rt = x + bw / 2, ty = t => top + tilt * t;
      const rim = [[l + 4, ty(0)], [x - bw * .15, ty(.35) - rr(r, 1, 4)], [x + bw * .2, ty(.7) + rr(r, 0, 3)], [rt - 3, ty(1)]];
      cast += poly([[rt - 3, ty(1) + 3], [rt + 8, ty(1) + 9], [rt + 12, base], [rt + 2, base]]);
      bk += poly([[l, base], [l + rr(r, 0, 3), top + bh * .3], ...rim, [rt + rr(r, 0, 3), top + bh * .4], [rt + 2, base]]);
      bkS += poly([rim[2], rim[3], [rt + 2, base], [x + bw * .12, base]]);
      const up = rim.map(([px, py]) => [px, py - rr(r, 3.5, 6.5)]), dn = rim.map(([px, py]) => [px, py + rr(r, 1, 3.5)]);
      cap += poly(up.concat(dn.reverse())); capH += 'M' + up.map(([px, py]) => `${f1(px)} ${f1(py + .8)}`).join('L');
      nod += `M${f1(x - bw * .1)} ${f1(ty(.4) + 5)}l${f1(rr(r, -3, 3))} ${f1(bh * .3)}l${f1(rr(r, -3, 3))} ${f1(bh * .25)}`;   // a crack down the slipped block
    }
    const sc = ['', ''];
    for (let i = 0; i < 28; i++) { const x = rr(r, x0 + 8, x1 - 6), y = Math.min(Y(x) + rr(r, 3, 26), -10); sc[i % 2] += lobed(r, x, y, rr(r, 8, 19), rr(r, 5, 10), 7, .3); if (i % 3 < 2) for (let k = 0; k < 2; k++) fl += dash(x + rr(r, -8, 8), y - rr(r, 1, 6), .1, 0); }
    const tf = ['', '', '']; for (let i = 0; i < 6; i++) { const x = rr(r, x0 + 20, x1 - 30); tufts(r, x - 10, x + 10, 3, rr(r, 4, 7), Y(x) + 3).forEach((sh, k) => { tf[k] += sh[1]; }); }
    return [['@turf.2', mass], ['@turf.0', hum, .9], ['@chalk.2', bare, .85], ['@chalk.3', cast, .3], ['@chalk.2', bk], ['@chalk.1', bkS, .8], { s: '@chalk.3', w: 1, op: .55, d: nod, detail: true },
      ['@turf.0', cap], { s: '@turf.1', w: 1.4, op: .9, d: capH }, ['@scrub.0', sc[0]], ['@scrub.1', sc[1]], { s: '@scrub.2', w: 2.6, d: fl, detail: true },
      { f: '@turf.2', d: tf[0], detail: true }, { f: '@turf.0', d: tf[1], detail: true }, { f: '@turf.1', d: tf[2], detail: true }];
  };
  /** The variants: the top line, how many gullies, the dip of the bedding, the big lit (1) and shaded (-1) turns of the face. */
  const CHALK = [
    { R: 370, top: x => -196 - 104 * gs(x, -215, 150) - 90 * gs(x, 225, 130) - 10 * Math.sin(x * .021 + 1), gullies: 5, slope: .02,
      zones: [[-366, -262, 1], [-150, 34, -1], [34, 150, 1], [246, 366, -1]] },
    { R: 206, top: x => -214 - 78 * (x + 370) / 576 - 9 * Math.sin(x * .031), gullies: 4, slope: -.014, stack: [300, 76, -206],
      zones: [[-366, -286, 1], [-214, -112, -1], [-112, -36, 1], [60, 150, -1], [150, 204, 1]] },
    { R: 370, top: x => -168 - 22 * Math.sin((x + 370) / 370 * Math.PI) - 7 * Math.sin(x * .04), gullies: 3, slope: .012, slump: [-380, 72, 86],
      zones: [[-340, -60, 1], [-150, 24, -1], [24, 112, 1], [196, 300, -1], [300, 366, 1]] },
  ];
  defineObj({
    id: 'rock.chalk-cliff', category: 'rock', size: [740, 330], variants: 3, seasonal: true, flippable: true,
    palette: Object.assign({ base: {
      chalk: ['#eeebe2', '#c9c5ba', '#dcd8cc', '#9e9a90', '#fbfaf5'], flint: ['#4a4a4e', '#6a6a6e'], rubble: ['#d8d4c8', '#b8b4a8', '#f2f0e8'], shingle: ['#a8a093', '#867f73', '#c9c2b3'],
    } }, bySeason({
      turf: { spring: ['#6aa040', '#8cc050', '#4a7a2e'], summer: ['#5e9038', '#86ac48', '#3e6a28'], autumn: ['#7e8a3e', '#a0a050', '#5a6230'], winter: ['#6a7458', '#86886a', '#4a5440'] },
      scrub: { spring: ['#4f7a30', '#7aa040', '#e8e0a0'], summer: ['#3e6a2a', '#5e8a36', '#d8c8e0'], autumn: ['#7a6a2a', '#9a7a34', '#b0402a'], winter: ['#5a5a44', '#6a6a52', '#7a5a4a'] },
      algae: { spring: ['#56683a', '#78804a'], summer: ['#5a6a3a', '#7a7a4a'], autumn: ['#646238', '#86784a'], winter: ['#545c46', '#6e7058'] },
    })),
    reflect: true,
    tags: ['uk', 'coast', 'seaside', 'cliffs', 'chalk', 'downs', 'signature', 'natural', 'kit:temperate', 'kit:water', 'role:rock'],
    credit: 'coast-country kit (generic chalk cliffs)',
    build(v) {
      const sr = srnd('chalk|' + v), K = CHALK[v], L = -370, R = K.R, body = [], fine = wave(sr, 1.3, 44), S = K.slump;
      // 1. creases along the face at irregular spacing (now and then a broad panel): a few become gullies, the rest buttress edges
      const xs = []; for (let x = L + rr(sr, 26, 44); x < R - 36; x += sr() < .22 ? rr(sr, 84, 140) : rr(sr, 24, 72)) xs.push(x);
      const gi = new Set(); while (gi.size < Math.min(K.gullies, xs.length - 2)) gi.add(1 + Math.floor(sr() * (xs.length - 2)));
      const gullies = [...gi].sort((a, b) => a - b).map(i => ({ x: xs[i], w: rr(sr, 2.5, 6), notch: rr(sr, 5, 14), lean: rr(sr, -12, 12), start: sr() < .3 ? rr(sr, .12, .3) : 0, fork: sr() < .65 }));
      const bites = Array.from({ length: 2 + (sr() < .5 ? 1 : 0) }, () => ({ x: rr(sr, L + 50, R - 50), hw: rr(sr, 12, 24), d: rr(sr, 5, 10) }));
      const bite = x => bites.reduce((s, b) => s + b.d * Math.max(0, 1 - Math.abs(x - b.x) / b.hw) ** .7, 0);
      const T = x => K.top(x) + fine(x) + bite(x) + gullies.reduce((s, g) => s + (g.start ? 0 : g.notch * Math.max(0, 1 - Math.abs(x - g.x) / (g.notch * 1.7)) ** 1.4), 0);
      // 2. the solids: the main face (and v1's stack), each with its top line, outline and face
      const main = chalkSolid(sr, L, R, T, bite, gullies.filter(g => !g.start).map(g => g.x), K.stack ? 'head' : 'end'), solids = [main];
      if (K.stack) { const [sx, sw, st] = K.stack; solids.push(chalkSolid(sr, sx - sw / 2, sx + sw / 2, x => st + 12 * ((x - sx) / (sw / 2)) ** 2 + fine(x) * .5, () => 0, [], 'stack')); }
      const hiY = Math.min(...main.pts.map(p => p[1])), xEnd = solids[solids.length - 1].x1, faces = solids.map(s => s.face).join('');
      const topAt = x => { for (const s of solids) if (x >= s.x0 && x <= s.x1) return s.T(x); return null; };
      const slumpY = S ? x => (x < S[0] || x > S[1] ? 1 : -4 - S[2] * Math.sin(Math.PI * (x - S[0]) / (S[1] - S[0])) ** .8 * (.84 + .16 * Math.sin(x * .05 + 1))) : () => 1;
      const inside = (x, y, m = 8) => { const t = topAt(x); return t != null && y > t + m && y < -12 && y < slumpY(x) - 2; };
      const pick = i => solids[i % 6 || solids.length === 1 ? 0 : 1];
      if (v === 0) {
        // the downs rising behind the dip: only the part above the cliff top shows (the face covers the rest)
        const back = x => -228 - 16 * gs(x, 46, 80) - 3 * Math.sin(x * .05); let d = '', d2 = '';
        for (let x = -100; x <= 200; x += 10) { d += `L${x} ${f1(back(x))}`; if (x >= 40) d2 += `L${x} ${f1(back(x) + 1)}`; }
        body.push(['@turf.1', `M-100 -150${d}L200 -150z`], ['@turf.0', `M40 -150${d2}L200 -150z`, .5]);
      }
      body.push(['@chalk.0', faces], { f: { lin: [[0, '#ffffff', .2], [.5, '#ffffff', 0], [1, '#5a5a50', .2]], x1: 0, y1: hiY, x2: 0, y2: 0 }, d: faces });
      // 3. the big turns of the face: each bulge brightest on its left flank, darkening round its right flank into the re-entrant
      //    crease where the next bulge starts (soft on one side, a jagged hard edge on the other)
      const zone = (x0, x1) => { const l = crease(sr, x0, T(x0) + 4, -6, rr(sr, -8, 8), 3), r = crease(sr, x1, T(x1) + 4, -6, rr(sr, -8, 8), 3); return polyI(cw([...main.pts.filter(p => p[0] > x0 && p[0] < x1).map(([x, y]) => [x, y + 4]), ...r, ...l.reverse()])); };
      for (const [a0, b0, k] of K.zones) {
        const a = Math.max(a0, L + 4), b = Math.min(b0, R - 4);
        body.push({ f: { lin: k > 0 ? [[0, '@chalk.4', .7], [1, '@chalk.4', 0]] : [[0, '@chalk.1', 0], [.7, '@chalk.1', .38], [1, '@chalk.1', .62]], x1: a, y1: 0, x2: b, y2: 0 }, d: zone(a, b) });
      }
      // 4. the ends, where the face turns away: lit at the left end, in shade at the right (all down the headland, half the stack)
      let el = '', es = '', es2 = '';
      for (const s of solids) {
        const a = s.pts[0], b = s.pts[s.pts.length - 1], st = s.kind === 'stack', wr = st ? (s.x1 - s.x0) * .42 : s.kind === 'head' ? rr(sr, 40, 56) : rr(sr, 12, 22);
        el += wedge(sr, crease(sr, a[0] - 2, a[1] + 6, -3, st ? -7 : -12, 1), st ? rr(sr, 5, 8) : rr(sr, 9, 16), st ? rr(sr, 8, 12) : rr(sr, 16, 28), 1, s.T);
        const rc = crease(sr, b[0] + 2, b[1] + 6, -3, s.kind === 'head' ? 26 : st ? 8 : 12, 1);
        es += wedge(sr, rc, wr * .8, wr, -1, s.T); es2 += wedge(sr, rc, wr * .35, wr * .45, -1, s.T);
      }
      body.push(['@chalk.4', el, .6], ['@chalk.1', es, .55], ['@chalk.1', es2, .4]);
      // 5. buttresses: a lit flank left of each crease and a soft shade turning away to its right; some only jut out low down,
      //    some fade before the foot, a few are only shallow flutes
      let flute = '';
      for (const x of xs.filter((_, i) => !gi.has(i))) {
        const k = sr(), t = T(x) + 5, low = k < .28, short = k >= .28 && k < .46, pts = crease(sr, x, low ? t * rr(sr, .35, .65) : t, short ? t * rr(sr, .3, .6) : -8, rr(sr, -14, 14));
        const fade = short ? 0 : sr() < .3 ? rr(sr, .15, .45) : 1;
        if (k > .84) { flute += wedge(sr, pts, rr(sr, 2, 4), rr(sr, 3, 7) * fade, 1, T); continue; }
        const ws = rr(sr, 14, 42), wl = rr(sr, 8, 26);
        body.push({ f: across(pts, ws, 1, '@chalk.1', .55, 0), d: wedge(sr, pts, low ? 0 : ws * rr(sr, .6, 1), ws * fade, 1, T) });
        if (!low) body.push({ f: across(pts, wl, -1, '@chalk.4', .75, 0), d: wedge(sr, pts, wl * rr(sr, .5, 1), wl * fade, -1, T) });
      }
      body.push(['@chalk.1', flute, .3]);
      // 6. gullies: a dark cleft from a notch in the top (or fading in below it) down to a talus fan; shaded left wall, lit right wall, often a fork
      let gw = '', gl = '', gc = '', gb = ''; const fans = [];
      for (const g of gullies) {
        const c = crease(sr, g.x, g.start ? T(g.x) * (1 - g.start) : T(g.x) + 2, -6, g.lean, 1.4), n = c.length - 1;
        const hw = c.map((_, i) => (g.start && !i ? 0 : g.w * (.35 + .5 * i / n) * rr(sr, .8, 1.2))), lw = c.map(([x, y], i) => [x - hw[i], y]), rw = c.map(([x, y], i) => [x + hw[i], y]);
        gc += poly(cw(lw.concat(rw.slice().reverse())));
        gw += wedge(sr, lw, g.start ? 0 : rr(sr, 4, 9), rr(sr, 7, 16), -1, T); gl += wedge(sr, rw, g.start ? 0 : rr(sr, 2, 6), rr(sr, 5, 12), 1, T);
        if (g.fork && n > 2) {
          const i = 1 + Math.floor(sr() * Math.ceil(n / 2)), [fx, fy] = c[i], bx = fx + (sr() < .5 ? -1 : 1) * rr(sr, 12, 30), by = Math.max(T(bx) + 8, fy - rr(sr, 40, 100));
          if (by < fy - 12) { const b = crease(sr, bx, by, fy, fx - bx, 1.2), m = b.length - 1; gb += poly(cw(b.map(([x, y], j) => [x - hw[i] * .7 * j / m, y]).concat(b.map(([x, y], j) => [x + hw[i] * .7 * j / m, y]).reverse()))); }
        }
        fans.push({ x: c[n][0], h: rr(sr, 26, 52) * Math.min(1.2, -T(g.x) / 240), wl: rr(sr, 24, 46), wr: rr(sr, 28, 56) });
      }
      body.push(['@chalk.1', gw, .45], ['@chalk.4', gl, .6], ['@chalk.3', gb, .3], ['@chalk.3', gc, .5]);
      // 7. the crumbling edge: a fresh white scar under each bite, a block of turf slumping over it (drawn with the turf), fresh blocks below
      let scar = '', slab = '', slabU = '', slabS = '';
      for (const b of bites) {
        const t = T(b.x) + 2, pts = crease(sr, b.x, t, t + rr(sr, 22, 54), rr(sr, -6, 6), 1.5), x = b.x + (sr() < .5 ? -1 : 1) * b.hw * .5, y = T(x) + rr(sr, 3.5, 5), rx = rr(sr, 7, 11), ry = rr(sr, 2.6, 4);
        scar += wedge(sr, pts, b.hw * .55, 1, -1) + wedge(sr, pts, b.hw * .45, 1, 1);
        slabS += lens(x - rx, x + rx + 3, y + ry * .6, rr(sr, 3, 5)); slabU += lobed(sr, x + 1, y + 1.6, rx, ry, 6, .25); slab += lobed(sr, x, y, rx, ry * .85, 6, .3);
        fans.push({ x: b.x + rr(sr, -4, 4), h: rr(sr, 16, 30), wl: rr(sr, 10, 18), wr: rr(sr, 12, 22), fresh: true });
      }
      body.push(['@chalk.4', scar, .9]);
      // 8. bedding: flint bands that wander, step where a fault crosses, and break up into clusters of nodules (or a thin broken
      //    seam), each band its own strength; ledges along them, stained below
      const faults = Array.from({ length: 1 + Math.floor(sr() * 3) }, () => [rr(sr, L + 60, R - 40), rr(sr, -6, 6)]);
      const nod = ['', '', ''], ln = { seam: '', lt: '', sh: '', sh2: '' }; let stA = '', stG = '', stT = '';
      for (let h = rr(sr, 24, 40); h < -hiY - 12; h += sr() < .2 ? rr(sr, 40, 60) : rr(sr, 14, 34)) {
        const w = wave(sr, rr(sr, 2, 6), rr(sr, 90, 300)), sl = K.slope + rr(sr, -.015, .015), st = rr(sr, .35, 1), seam = sr() < .25;
        const by = x => -h + sl * x + w(x) + faults.reduce((a, [fx, d]) => a + (x > fx ? d : 0), 0);
        for (let x0 = L + rr(sr, -10, 60), x1; x0 < xEnd; x0 = x1 + rr(sr, 12, 80)) {
          x1 = Math.min(x0 + rr(sr, 15, 100), xEnd);
          for (let x = x0; x < x1;) {
            if (seam) { const n = rr(sr, 3, 12), y = by(x); if (inside(x, y) && inside(x + n, y)) ln.seam += dash(x, y, n, by(x + n) - y); x += n + rr(sr, 2, 9); continue; }
            for (let c = 1 + Math.floor(sr() * 6); c > 0 && x < x1; c--) {
              const s = rr(sr, .2, 1) * st, y = by(x) + rr(sr, -1.2, 1.2);
              if (inside(x, y)) nod[s > .62 ? 0 : s > .36 ? 1 : 2] += dash(x, y, rr(sr, .3, 3.4) * s, rr(sr, -.8, .8));
              x += rr(sr, 2.5, 6);
            }
            x += rr(sr, 6, 22);
          }
          if (sr() < .42 && x1 - x0 > 16) {
            const long = sr() < .14, a = rr(sr, x0, x1 - 14), b = a + (long ? rr(sr, 60, 130) : Math.min(rr(sr, 12, 54), x1 - a)), y = by(a) + 1, tilt = by(b) - by(a), big = long || sr() < .2, sh = big ? rr(sr, 5, 9) : rr(sr, 2, 4.5);
            if (inside(a, y, 12) && inside(b, y + tilt, 12) && inside((a + b) / 2, y + tilt / 2, 12)) {
              ln.lt += lens(a, b, y - .6, -rr(sr, .5, 1), tilt); ln[big ? 'sh' : 'sh2'] += lens(a - 1.5, b + rr(sr, 0, 4), y + .3, sh / 1.125, tilt);
              for (let k = 0, n = sr() < .55 ? 1 + Math.floor(sr() * 3) : 0; k < n; k++) {
                const sx = rr(sr, a, b), sy = by(sx) + sh * .8, len = Math.min(rr(sr, 10, 60), -sy - 14, slumpY(sx) - sy), d = len > 6 ? streak(sx, sy, len, rr(sr, 1.6, 4.5), rr(sr, -2, 2)) : '';
                if (sr() < .6) stA += d; else stG += d;
              }
            }
          }
        }
      }
      body.push({ s: '@flint.1', w: .9, op: .45, d: ln.seam, detail: true },
        { s: '@flint.0', w: 3.2, op: .62, d: nod[0], detail: true }, { s: '@flint.0', w: 2.3, op: .5, d: nod[1], detail: true }, { s: '@flint.1', w: 1.5, op: .45, d: nod[2], detail: true },
        ['@chalk.3', ln.sh, .42], ['@chalk.3', ln.sh2, .32], ['@chalk.4', ln.lt, .95]);
      // 9. rain streaks down from the top edge (the broad ones survive at tile size), a few greenish where water seeps
      for (let i = 0; i < 46; i++) {
        const s = pick(i), x = rr(sr, s.x0 + 6, s.x1 - 6), y = s.T(x) + rr(sr, 4, 9), len = Math.min(slumpY(x) - y - 4, -y - 16, rr(sr, .12, .62) * -y), w = rr(sr, 1.4, 5.5);
        if (len < 10) continue;
        const d = streak(x, y, len, w, rr(sr, -3, 3));
        if (sr() < .2) stA += d; else if (w > 3.2) stG += d; else stT += d;
      }
      body.push(['@chalk.3', stG, .2], { f: '@chalk.3', d: stT, op: .24, detail: true }, ['@algae.0', stA, .3]);
      // 10. hairline fissures (detail): they fork, and fade (the lower part fainter)
      let fA = '', fB = '';
      for (let i = 0; i < 52; i++) {
        const s = pick(i), x = rr(sr, s.x0 + 8, s.x1 - 8), t = s.T(x), y0 = rr(sr, t + 10, Math.max(t + 12, -50));
        if (!inside(x, y0, 10)) continue;
        const segs = 2 + Math.floor(sr() * 5), cut = Math.ceil(segs * rr(sr, .4, .7)); let px = x, py = y0, a = '', b = '';
        for (let k = 0; k < segs; k++) {
          const dx = rr(sr, -2.6, 2.6), dy = rr(sr, 7, 22); if (py + dy > -14 || py + dy > slumpY(px)) break;
          if (k < cut) a += `l${f1(dx)} ${f1(dy)}`; else b += (b ? '' : `M${f1(px)} ${f1(py)}`) + `l${f1(dx)} ${f1(dy)}`;
          px += dx; py += dy;
          if (k === 1 && sr() < .35) b += `M${f1(px)} ${f1(py)}l${f1((sr() < .5 ? -1 : 1) * rr(sr, 2, 7))} ${f1(rr(sr, 6, 14))}l${f1(rr(sr, -2, 2))} ${f1(rr(sr, 5, 12))}`;
        }
        if (a) fA += `M${f1(x)} ${f1(y0)}` + a; fB += b;
      }
      body.push({ s: '@chalk.3', w: 1.1, op: .5, d: fA, detail: true }, { s: '@chalk.3', w: .7, op: .32, d: fB, detail: true });
      // 11. the wet foot: grey-green algae with tongues up the seeps, a wave-cut notch under an overhang; v1's sea cave at the point
      const seeps = gullies.map(g => [g.x + g.lean, rr(sr, 16, 34), rr(sr, 6, 12)]).concat(Array.from({ length: 4 }, () => [rr(sr, L, xEnd), rr(sr, 10, 26), rr(sr, 5, 10)]));
      const aw = wave(sr, 3, 90); let az = '', ab = '', nt = '', nl = '';
      for (const s of solids) {
        const xa = Math.max(s.x0 - (s.kind === 'stack' ? 8 : 14), S ? S[1] - 12 : -1e9), xb = s.x1 + (s.kind === 'stack' ? 9 : s.kind === 'head' ? 28 : 15);
        let up = '', lo = '';
        for (let x = xa; x <= xb; x += rr(sr, 7, 12)) {
          const tg = seeps.reduce((m, [sx, a, hw]) => m + a * Math.max(0, 1 - Math.abs(x - sx) / hw) ** 1.5, 0);
          up += `L${f1(x)} ${f1(-14 - aw(x) - tg - rr(sr, 0, 2.5))}`; lo += `L${f1(x)} ${f1(-4 - aw(x) * .4 - rr(sr, 0, 1.5))}`;
        }
        az += `M${f1(xa)} 2${up}L${f1(xb)} 2z`; ab += `M${f1(xa)} 2${lo}L${f1(xb)} 2z`;
        for (let x = xa + rr(sr, 0, 30); x < xb - 20;) { const n = Math.min(rr(sr, 30, 110), xb - 6 - x), y = -rr(sr, 15, 22); nt += lens(x, x + n, y, rr(sr, 3, 5.5)); nl += lens(x + 2, x + n - 2, y - .4, -.7); x += n + rr(sr, 14, 60); }
      }
      body.push(['@algae.1', az, .42], ['@algae.0', ab, .5], ['@chalk.3', nt, .38], ['@chalk.4', nl, .8]);
      if (K.stack) { const x = R + 6; body.push(['@chalk.3', `M${x - 16} 1Q${x - 15} -32 ${x} -36Q${x + 14} -31 ${x + 16} 1z`, .6], ['@flint.0', `M${x - 9} 1Q${x - 8} -22 ${x + 1} -25Q${x + 9} -21 ${x + 10} 1z`, .35]); }
      // 12. the turf cap: a grass top, a ragged lip hanging over the edge (thin where it crumbles), its shadow on the chalk, tufts
      let tb = '', th = '', tu = '', ts = '';
      for (const s of solids) {
        const p = [s.left[s.left.length - 1], ...s.pts, s.right[0]], hi = p.map(() => rr(sr, 2.2, 4.4)), lip = p.map(([x]) => (s.bite(x) > .5 ? rr(sr, 0, 1) : sr() < .15 ? rr(sr, 6, 13) : rr(sr, 2, 4.5)));
        const P = dy => p.map(([x, y], i) => [x, y + dy(i)]);
        tb += poly([...P(i => -hi[i]), ...P(i => lip[i]).reverse()]); ts += poly([...P(i => lip[i] - .5), ...P(i => lip[i] + 2 + lip[i] * .5 + rr(sr, 0, 4)).reverse()]);
        th += 'M' + p.map(([x, y], i) => `${f1(x)} ${f1(y - hi[i] + .7)}`).join('L'); tu += 'M' + p.map(([x, y], i) => `${f1(x)} ${f1(y + lip[i] - .6)}`).join('L');
      }
      const tf = ['', '', '']; for (let i = 0; i < 10; i++) { const s = pick(i), [x, y] = s.pts[Math.floor(sr() * s.pts.length)]; tufts(sr, x - 7, x + 7, 3, rr(sr, 4, 7), y - 3).forEach((sh, k) => { tf[k] += sh[1]; }); }
      body.push(['@chalk.3', ts, .3], ['@turf.0', tb], { s: '@turf.1', w: 1.4, op: .9, d: th }, { s: '@turf.2', w: 1.2, op: .8, d: tu }, ['@chalk.3', slabS, .3], ['@turf.2', slabU], ['@turf.0', slab],
        { f: '@turf.2', d: tf[0], detail: true }, { f: '@turf.0', d: tf[1], detail: true }, { f: '@turf.1', d: tf[2], detail: true });
      // 13. v2: the green landslip at the foot
      if (S) body.push(...chalkSlump(sr, S, slumpY));
      // 14. talus: fans of fallen chalk under the gullies and the crumbling edge, angular blocks (a few big ones), dark flint cobbles
      for (let i = 0; i < 3; i++) fans.push({ x: rr(sr, L + 30, xEnd - 20), h: rr(sr, 20, 40), wl: rr(sr, 16, 30), wr: rr(sr, 18, 34) });
      let fanL = '', fanS = '', cob = ''; const bk = { a: '', b: '', fr: '', sh: '', lt: '', ct: '' }, hid = x => S && x < S[1] - 8;
      const addBlock = (x, y, s, fresh) => { const [o, sh, lt] = block(sr, x, y, s); bk[fresh ? 'fr' : sr() < .5 ? 'a' : 'b'] += o; if (s > 5) bk.sh += sh; if (s > 9) bk.lt += lt; if (s > 13) bk.ct += lens(x - s * .45, x + s * .75, y - .5, s * .1); };
      for (const f of fans) {
        if (hid(f.x)) continue;
        const ay = -f.h;
        // a grey heap of debris, concave-sided and round-topped, its upper-left slope catching the light
        fanS += `M${f1(f.x - f.wl)} 1Q${f1(f.x - f.wl * .4)} ${f1(ay * .3)} ${f1(f.x - 3)} ${f1(ay)}Q${f1(f.x)} ${f1(ay - 2)} ${f1(f.x + 3)} ${f1(ay)}Q${f1(f.x + f.wr * .4)} ${f1(ay * .3)} ${f1(f.x + f.wr)} 1z`;
        fanL += `M${f1(f.x - f.wl * .8)} 1Q${f1(f.x - f.wl * .35)} ${f1(ay * .32)} ${f1(f.x - 1)} ${f1(ay + 2)}Q${f1(f.x + f.wr * .1)} ${f1(ay * .4)} ${f1(f.x + f.wr * .25)} 1z`;
        for (let i = 0, n = 1 + Math.round((f.wl + f.wr) / 15); i < n; i++) { const t = sr() ** .6; addBlock(f.x + (sr() < .5 ? -f.wl : f.wr) * t * sr() * .9, ay * (1 - t) + 1, rr(sr, 2.5, 5) + t * rr(sr, 2, 8), f.fresh); }
      }
      for (let i = 0; i < 16; i++) { const x = rr(sr, L - 6, xEnd + 18); if (!hid(x)) addBlock(x, rr(sr, -1, 2), sr() < .22 ? rr(sr, 12, 22) : rr(sr, 3, 9)); }
      for (let i = 0; i < 40; i++) { const x = rr(sr, L - 4, xEnd + 20); if (!hid(x)) cob += dash(x, -rr(sr, 0, 6), rr(sr, .3, 1.6), rr(sr, -.3, .3)); }
      body.push(['@rubble.1', fanS, .9], ['@rubble.0', fanL, .85], ['@chalk.3', bk.ct, .3], ['@rubble.0', bk.a], ['@chalk.2', bk.b], ['@chalk.4', bk.fr], ['@chalk.3', bk.sh, .42], ['@rubble.2', bk.lt],
        { s: '@flint.0', w: 2.2, op: .8, d: cob, detail: true });
      // 15. the beach: a shingle bank along the foot, then the flat ledges of the wave-cut platform with weed on them
      const xs0 = L - 18, xs1 = xEnd + 24, sw = wave(sr, 1.8, 120), peb = ['', '', '']; let sh = `M${xs0} 2`, pl = '', plL = '', pw = '', pc = '';
      for (let x = xs0; x < xs1; x += rr(sr, 10, 18)) sh += `L${f1(x)} ${f1(-5 - sw(x) - rr(sr, 0, 1.5))}`;
      for (let i = 0; i < 150; i++) { const x = rr(sr, xs0, xs1); peb[i % 3] += dash(x, rr(sr, -3.5 - sw(x), 1), rr(sr, .2, 1.8), rr(sr, -.3, .3)); }
      for (let i = 0; i < 7; i++) {
        const x = rr(sr, xs0, xs1 - 60), n = rr(sr, 36, 130), y = rr(sr, 1.5, 3.5), wx = rr(sr, x, x + n * .6);
        pl += lens(x, x + n, y, 1.5); plL += lens(x + 3, x + n - 3, y + .2, -.5); if (sr() < .8) pw += lens(wx, wx + rr(sr, 10, n * .4), y + .6, 1.1);
        pc += `M${Math.round(x + n * rr(sr, .2, .8))} ${f1(y + .5)}l${f1(rr(sr, 4, 12))} ${f1(rr(sr, -.4, .4))}`;
      }
      body.push(['@shingle.0', `${sh}L${xs1} -4L${xs1} 2z`], ['@shingle.1', `M${xs0} -1.5H${xs1}V2H${xs0}z`, .5], { s: '@shingle.1', w: 2.4, d: peb[0], detail: true }, { s: '@shingle.2', w: 2, d: peb[1], detail: true },
        { s: '@flint.0', w: 2.1, op: .7, d: peb[2], detail: true }, ['@rubble.1', pl, .95], ['@rubble.2', plL, .9], ['@algae.0', pw, .7], { s: '@chalk.3', w: .7, op: .6, d: pc, detail: true });
      return { body };
    },
  });
})();

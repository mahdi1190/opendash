/* ---------- a great GLASSHOUSE as a real 3D model (21 Oct, the Sheffield Winter Garden) ----------
   structure.glasshouse: a long barrel vault of glass on arched ribs, the kind of a city winter garden or a Victorian palm house: a row of
   parabolic (or round) arches springing from a low granite plinth, glass panes between them in courses up the vault with light glazing
   bars, glazed end walls on a grid of mullions and transoms with an entrance portal, and the planting INSIDE seen through the glass: palms
   with arching fronds, tiered Norfolk Island pines, broad-leaved trees and an understorey of shrubs and flowering beds either side of a
   central walk. After dusk the interior is lit: the inside of the far half of the vault and the floor glow warm and the planting stands
   dark against it (the glass of the near half stays glass), so the lit shape is exactly the building's own shape.
   Drawn far to near by construction: the far half of the vault seen from inside (its glass, then its ribs), the floor and the beds, the
   plants (each its own part, far to near), the near ribs, then the near glass (translucent) and its bars, the near end wall, the plinth.
   Axis: a along the facing (the long axis), l across (+l right of the facing), y up. 70 m by 22 m by 21 m at size 1 (the Winter Garden:
   glulam larch arches, 2003). Parameters (model.opts, all optional): profile 'parabola' (default) | 'round', bays (number of bays,
   default about one every 3.3 m), planting (0..1, how full the beds are, default 1), door 'front' | 'back' | 'both' (which end has the
   entrance portal; default 'both'). Liveries: larch (silvered gold timber), larch-new, white-iron (a Victorian palm house), green-iron.
   No lettering, no signs, no flags. The plants use the material 'houseplant' (under glass: evergreen, never wet, frosted or snowed on). */
const _WMD_GH_LIVERIES = Object.freeze([
  { name: 'larch', rib: '#b49c74', ribLo: '#8e7a58', soffit: '#c9b58e', bar: '#cfd3d2', plinth: '#57534e', glass: '#cbdde4', glassBack: '#a9c0c9', floor: '#b8ad9c', door: '#2d3438' },
  { name: 'larch-new', rib: '#c6a46a', ribLo: '#9c7d4c', soffit: '#d8bc88', bar: '#d8dad6', plinth: '#5f5a52', glass: '#cfe0e6', glassBack: '#adc3cb', floor: '#bdb2a0', door: '#2a3034' },
  { name: 'white-iron', rib: '#e6e4dc', ribLo: '#b9b7ae', soffit: '#f1efe8', bar: '#eceae2', plinth: '#8b8174', glass: '#d2e1e4', glassBack: '#b1c6cb', floor: '#b9ad99', door: '#3a3e3c' },
  { name: 'green-iron', rib: '#4f6f5d', ribLo: '#3b5547', soffit: '#5d7f6b', bar: '#62806e', plinth: '#7d7366', glass: '#cbdcde', glassBack: '#a7bec2', floor: '#b3a893', door: '#2f3631' },
]);
// the planting's own palette (shades of a glasshouse jungle) and the warm light of the lit interior after dusk
const _WMD_GH_GREENS = Object.freeze(['#3f6b3a', '#4d7a3f', '#36603a', '#5a8644', '#2f5534', '#46733f', '#618c4a']);
const _WMD_GH_FLOWERS = Object.freeze(['#c9474f', '#e07a5a', '#e8b04a', '#d45f8a', '#f0e0d0']);
const _WMD_GH_LIT = Object.freeze({ hi: '#f6dcae', mid: '#efcf98', lo: '#e8c486', floor: '#e2bf86', door: '#ffd99a' });
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('structure.glasshouse'))) sceneObjDefine({
  id: 'structure.glasshouse', category: 'structure', size: [420, 140], variants: 1, seasonal: false, flippable: true, real: { h: 21, l: 70, w: 22 },
  palette: { base: { glass: '#cbdde4', rib: '#b49c74', plinth: '#57534e' } }, parts: ['body'],
  tags: ['uk', 'city', 'glasshouse', 'winter-garden', 'palm-house', 'kit:urban', 'role:landmark', 'class:structure'],
  credit: 'a great glasshouse on arched ribs (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@plinth', 'M-210 0H210V-6H-210Z'], ['@glass', 'M-200 -6C-200 -140 200 -140 200 -6Z'], ['@rib', 'M-200 -6C-200 -140 200 -140 200 -6L190 -6C190 -128 -190 -128 -190 -6Z']] }; },
});
/** The section of the vault: { pts: [[l, y]...] from -W to +W by equal arc, nrm(l) -> [nl, ny] outward } for a profile. */
function _wmdGhSection(W, H, yb, n, profile) {
  const yOf = profile === 'round' ? (l) => yb + (H - yb) * Math.sqrt(Math.max(0, 1 - (l / W) * (l / W))) : (l) => yb + (H - yb) * (1 - (l / W) * (l / W));
  const fine = [];
  for (let i = 0; i <= 240; i++) { const t = -1 + 2 * i / 240, l = W * (profile === 'round' ? Math.sin(t * Math.PI / 2) : t); fine.push([l, yOf(l)]); }
  const acc = [0];
  for (let i = 1; i < fine.length; i++) acc.push(acc[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
  const tot = acc[acc.length - 1], pts = [];
  for (let k = 0, j = 0; k <= n; k++) {
    const s = tot * k / n;
    while (j < acc.length - 2 && acc[j + 1] < s) j++;
    const f = (s - acc[j]) / ((acc[j + 1] - acc[j]) || 1);
    pts.push([fine[j][0] + (fine[j + 1][0] - fine[j][0]) * f, fine[j][1] + (fine[j + 1][1] - fine[j][1]) * f]);
  }
  pts[0] = [-W, yb]; pts[n] = [W, yb];
  const nrm = (l, y) => {
    let nl, ny;
    if (profile === 'round') { nl = l / W; ny = (y - yb) / (H - yb); }
    else { nl = 2 * (H - yb) * l / (W * W); ny = 1; }
    const L = Math.hypot(nl, ny) || 1;
    return [nl / L, ny / L];
  };
  return { pts, nrm, yOf };
}
/** A palm: a slim, slightly leaning trunk with rings and a crown of arching fronds (each a leaf blade on a curve). */
function _wmdGhPalm(h, a, l, ht, k, seed) {
  const u = (s) => _wmdU(seed, s), lean = (u('lean') - 0.5) * 0.12 * ht, lAng = u('ldir') * Math.PI * 2;
  const top = [a + Math.cos(lAng) * lean, l + Math.sin(lAng) * lean, ht];
  const trunk = h.mix('#7d6c56', '#9a8a70', u('tc'));
  h.line([h.P(a, l, 0.3 * k), h.P((a + top[0]) / 2 + Math.cos(lAng) * lean * 0.15, (l + top[1]) / 2 + Math.sin(lAng) * lean * 0.15, ht * 0.55), h.P(top[0], top[1], top[2])], 0.32 * k, trunk, 'houseplant', 'trunk');
  if (h.px(0.3 * k) >= 3) for (let r = 1.2 * k; r < ht - 0.6 * k; r += 0.9 * k) { const f = r / ht; h.line([h.P(a + (top[0] - a) * f - 0.17 * k, l + (top[1] - l) * f, r), h.P(a + (top[0] - a) * f + 0.17 * k, l + (top[1] - l) * f, r)], 0.05 * k, h.shade(trunk, 0.78), 'houseplant', 'ring'); }
  const n = 9 + Math.floor(u('nf') * 5), R = (2.2 + 1.6 * u('fr')) * k, g0 = Math.floor(u('g') * _WMD_GH_GREENS.length);
  for (let i = 0; i < n; i++) {
    const th = (i / n + u('rot')) * Math.PI * 2 + (u('j' + i) - 0.5) * 0.4, ca = Math.cos(th), cl = Math.sin(th);
    const up = (i % 3 === 0) ? 0.55 : (i % 3 === 1 ? 0.15 : -0.1), len = R * (0.8 + 0.35 * u('fl' + i));
    const C = top, M = [C[0] + ca * len * 0.5, C[1] + cl * len * 0.5, C[2] + len * (0.22 + up * 0.5)], T = [C[0] + ca * len, C[1] + cl * len, C[2] + len * (up * 0.4 - 0.35)];
    const w = len * 0.16, sa = -cl * w, sl = ca * w;
    const col = _WMD_GH_GREENS[(g0 + i) % _WMD_GH_GREENS.length];
    h.face([h.P(C[0], C[1], C[2]), h.P(M[0] + sa, M[1] + sl, M[2]), h.P(T[0], T[1], T[2]), h.P(M[0] - sa, M[1] - sl, M[2] - 0.08 * k)], col, 'houseplant', 'frond', 'two');
    if (h.px(0.1 * k) >= 1.2) h.line([h.P(C[0], C[1], C[2]), h.P(M[0], M[1], M[2] + 0.02 * k), h.P(T[0], T[1], T[2])], 0.04 * k, h.shade(col, 1.25), 'houseplant', 'midrib');
  }
}
/** A Norfolk Island pine: a straight trunk with tiers of drooping branches (shallow cones), widest at the foot. */
function _wmdGhPine(h, a, l, ht, k, seed) {
  const u = (s) => _wmdU(seed, s);
  h.line([h.P(a, l, 0.3 * k), h.P(a, l, ht)], 0.38 * k, '#6e5a48', 'houseplant', 'trunk');
  const tiers = 5 + Math.floor(u('t') * 3), col = _WMD_GH_GREENS[(4 + Math.floor(u('c') * 3)) % _WMD_GH_GREENS.length];
  for (let t = 0; t < tiers; t++) {
    const f = t / tiers, y = ht * (0.28 + 0.7 * f), r = (3.2 * (1 - f) + 0.6) * k * (0.85 + 0.3 * u('r' + t));
    h.frustum(h.ngon(a, l, r, 9, u('o' + t) * 2), y - 0.7 * k * (1 - f * 0.5), h.ngon(a, l, r * 0.12, 9, u('o' + t) * 2), y + 0.25 * k, h.shade(col, 0.92 + 0.16 * u('s' + t)), { mat: 'houseplant', role: 'tier', cap: false, inside: h.P(a, l, y - 2.5 * k) });
  }
}
/** A broad-leaved tree (a fig, a camellia): a short trunk and a crown of overlapping leaf masses facing the eye. */
function _wmdGhBroad(h, a, l, ht, k, seed) {
  const u = (s) => _wmdU(seed, s);
  h.line([h.P(a, l, 0.3 * k), h.P(a + (u('x') - 0.5) * 0.8 * k, l, ht * 0.6)], 0.3 * k, '#6a5a48', 'houseplant', 'trunk');
  const n = 6 + Math.floor(u('n') * 4), R = (1.8 + 1.4 * u('R')) * k;
  for (let i = 0; i < n; i++) {
    const th = u('a' + i) * Math.PI * 2, rr = R * 0.65 * Math.sqrt(u('d' + i));
    h.disc(h.P(a + Math.cos(th) * rr, l + Math.sin(th) * rr * 0.6, ht * (0.62 + 0.3 * u('y' + i))), R * (0.42 + 0.25 * u('s' + i)), _WMD_GH_GREENS[(i + Math.floor(u('g') * 7)) % 7], 'houseplant', 'crown', 0.8);
  }
}
worldModelDefine('glasshouse', {
  name: 'Great glasshouse (winter garden, palm house)', ids: ['structure.glasshouse', 'landmark.glasshouse'], sampleObj: 'structure.glasshouse', solidity: 'solid', faceCap: 2200,
  dims() { return { L: 70, B: 22, H: 21 }; },
  liveries: () => _WMD_GH_LIVERIES,
  samples: [{ livery: 'larch', seed: 3 }, { livery: 'larch-new', seed: 8, opts: { planting: 0.7 } }, { livery: 'white-iron', seed: 5, size: 0.6, opts: { profile: 'round' } }, { livery: 'green-iron', age: 0.6, seed: 12, size: 0.45 }],
  params(ent, o, p) {
    const op = p.opts || {}, r = {};
    r.profile = op.profile === 'round' ? 'round' : 'parabola';
    r.planting = typeof op.planting === 'number' ? Math.max(0, Math.min(1, op.planting)) : 1;
    r.door = ['front', 'back', 'both'].includes(op.door) ? op.door : 'both';
    r.bays = typeof op.bays === 'number' && op.bays >= 4 && op.bays <= 60 ? Math.round(op.bays) : null;
    return r;
  },
  build(p, h) {
    const k = p.size, liv = p.livery, L = p.L, W = p.B / 2, H = p.H, A0 = -L / 2, A1 = L / 2, yb = 0.55 * k;
    const NB = p.bays || Math.max(6, Math.round(L / (3.3 * k))), bay = L / NB;
    const far = h.px(bay) < 7, NS = far ? 8 : (h.px(1) < 6 ? 10 : 14);
    const S = _wmdGhSection(W, H, yb, NS, p.profile), pts = S.pts;
    const aj = (j) => A0 + bay * j;
    const rib = h.aged(liv.rib, 'timber'), ribLo = h.aged(liv.ribLo, 'timber'), soffit = h.aged(liv.soffit, 'timber'), bar = h.aged(liv.bar, 'paint'), plinth = h.aged(liv.plinth, 'stone', 0.5);
    h.contactShadow(A0 - 1.5 * k, A1 + 1.5 * k, -W - 1.6 * k, W + 1.6 * k, 0.32);
    // which strips of the vault face the eye from outside (front) and which are seen from inside, through the front (back); per bay
    const stripN = (i) => { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; return S.nrm(m[0], m[1]); };
    const front = (i, a) => { const n = stripN(i), m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; return h.sees([0, n[0], n[1]], [a, m[0], m[1]]); };
    const endFront = [h.sees([-1, 0, 0], [A0, 0, H * 0.4]), h.sees([1, 0, 0], [A1, 0, H * 0.4])];
    const endPoly = (a, inset) => pts.map(([l, y]) => h.P(a, l * (1 - inset), yb + (y - yb) * (1 - inset)));
    // the inner line of a rib: the section pulled in along its normal by the rib's depth
    const dRib = 0.62 * k, inner = pts.map(([l, y]) => { const n = S.nrm(l, y); return [l - n[0] * dRib, Math.max(yb, y - n[1] * dRib)]; });
    const lit = (col) => ({ theta: 0, lit: col, halo: false });
    const litOf = (y) => (y < H * 0.3 ? _WMD_GH_LIT.lo : y < H * 0.65 ? _WMD_GH_LIT.mid : _WMD_GH_LIT.hi);

    /* ---- 1. the far half of the vault seen from inside: its glass (lit after dusk), then the far end wall ---- */
    h.part('back-glass', { layer: 1 });
    for (let i = 0; i < NS; i++) {
      // a strip is split where it turns from back to front along its length (perspective): runs of bays of one kind
      let j = 0;
      while (j < NB) {
        const isF = front(i, aj(j) + bay / 2);
        let e = j + 1;
        while (e < NB && front(i, aj(e) + bay / 2) === isF) e++;
        if (!isF) {
          const yM = (pts[i][1] + pts[i + 1][1]) / 2, tone = h.mix(liv.glassBack, '#dfe8ea', Math.max(0, Math.min(1, (yM - yb) / (H - yb))) * 0.35);
          h.face([h.P(aj(j), pts[i][0], pts[i][1]), h.P(aj(e), pts[i][0], pts[i][1]), h.P(aj(e), pts[i + 1][0], pts[i + 1][1]), h.P(aj(j), pts[i + 1][0], pts[i + 1][1])], tone, 'glass', 'glass-back', null, Object.assign({ alpha: 0.82 }, lit(litOf(yM))));
        }
        j = e;
      }
    }
    [0, 1].forEach((s) => { if (!endFront[s]) h.face(endPoly(s ? A1 : A0, 0), liv.glassBack, 'glass', 'glass-back', null, Object.assign({ alpha: 0.82 }, lit(_WMD_GH_LIT.mid))); });

    /* ---- 2. the ribs of the far half (their soffits face the eye from inside), far to near ---- */
    h.part('back-ribs', { layer: 2 });
    const ribOrder = [];
    for (let j = 0; j <= NB; j++) ribOrder.push([j, h.depth(aj(j), 0, H * 0.5)]);
    ribOrder.sort((x, y) => y[1] - x[1]);
    const rw = 0.2 * k;
    const ribSeg = (j, i, soff, back) => {
      const a = aj(j), o0 = pts[i], o1 = pts[i + 1], n0 = inner[i], n1 = inner[i + 1];
      // the far half is seen through two panes and the planting: its ribs are softer (a lattice of equal ribs reads as a diagrid)
      const side = h.mix(h.mix(rib, ribLo, 0.2 + 0.25 * Math.abs(stripN(i)[0])), liv.glassBack, back ? 0.42 : 0);
      h.face([h.P(a, o0[0], o0[1]), h.P(a, o1[0], o1[1]), h.P(a, n1[0], n1[1]), h.P(a, n0[0], n0[1])], side, 'timber', 'rib', 'two');
      if (soff) h.face([h.P(a - rw, n0[0], n0[1]), h.P(a + rw, n0[0], n0[1]), h.P(a + rw, n1[0], n1[1]), h.P(a - rw, n1[0], n1[1])], h.mix(soffit, liv.glassBack, 0.35), 'timber', 'rib-soffit', 'two');
    };
    for (const [j] of ribOrder) for (let i = 0; i < NS; i++) if (!front(i, aj(j))) ribSeg(j, i, h.px(rw * 2) >= 1.5, true);
    // purlins of the far half: light lines along the vault at the strip joints (the glazing bars seen from inside)
    if (!far) for (let i = 1; i < NS; i++) if (!front(i, 0) && !front(i - 1, 0)) h.line([h.P(A0, pts[i][0], pts[i][1]), h.P(A1, pts[i][0], pts[i][1])], 0.07 * k, bar, 'metal', 'bar', { alpha: 0.7 });

    /* ---- 3. the floor and the beds (lit after dusk) ---- */
    h.part('floor', { layer: 3 });
    h.face([h.P(A0 + 0.4 * k, -W + 0.5 * k, 0.06 * k), h.P(A1 - 0.4 * k, -W + 0.5 * k, 0.06 * k), h.P(A1 - 0.4 * k, W - 0.5 * k, 0.06 * k), h.P(A0 + 0.4 * k, W - 0.5 * k, 0.06 * k)], liv.floor, 'paving', 'floor', null, lit(_WMD_GH_LIT.floor));
    for (const sg of [-1, 1]) h.face([h.P(A0 + 3 * k, sg * 2.2 * k, 0.12 * k), h.P(A1 - 3 * k, sg * 2.2 * k, 0.12 * k), h.P(A1 - 3 * k, sg * (W - 1.6 * k), 0.12 * k), h.P(A0 + 3 * k, sg * (W - 1.6 * k), 0.12 * k)], '#5b5040', 'soil', 'bed', null);

    /* ---- 4. the planting, each plant its own part (drawn far to near) ---- */
    const fill = p.planting, plants = [];
    if (fill > 0 && h.px(1) >= 0.8) {
      const nPalm = Math.round((11 + 4 * h.u('np')) * fill * L / (70 * k)), nPine = Math.max(1, Math.round(3 * fill * L / (70 * k))), nBroad = Math.round((6 + 3 * h.u('nb')) * fill * L / (70 * k));
      const room = (l, y) => S.yOf(l) - y;   // headroom under the vault
      const spot = (key, lo, hi) => { const a = A0 + (0.08 + 0.84 * h.u(key + 'a')) * L, sg = h.u(key + 's') < 0.5 ? -1 : 1, l = sg * (lo + (hi - lo) * h.u(key + 'l')) * W; return [a, l]; };
      for (let i = 0; i < nPalm; i++) { const [a, l] = spot('p' + i, 0.22, 0.62), ht = Math.min((7 + 8 * h.u('ph' + i)) * k, S.yOf(l) - 3.2 * k); if (ht > 2.5 * k) plants.push(['palm', a, l, ht, i]); }
      for (let i = 0; i < nPine; i++) { const a = A0 + L * (0.3 + 0.4 * i / Math.max(1, nPine - 1)) + (h.u('ia' + i) - 0.5) * 6 * k, l = (h.u('il' + i) - 0.5) * 0.3 * W; plants.push(['pine', a, l, Math.min(H * (0.72 + 0.12 * h.u('ih' + i)), room(l, 0) - 1.2 * k), i]); }
      for (let i = 0; i < nBroad; i++) { const [a, l] = spot('b' + i, 0.3, 0.7), ht = Math.min((5 + 5 * h.u('bh' + i)) * k, S.yOf(l) - 2 * k); if (ht > 2 * k) plants.push(['broad', a, l, ht, i]); }
      for (const [kind, a, l, ht, i] of plants) {
        h.part('plant-' + kind + '-' + i, { layer: 4 });
        if (kind === 'palm') _wmdGhPalm(h, a, l, ht, k, p.seed * 31 + i);
        else if (kind === 'pine') _wmdGhPine(h, a, l, ht, k, p.seed * 17 + i);
        else _wmdGhBroad(h, a, l, ht, k, p.seed * 13 + i);
      }
      // the understorey: shrubs and flowering beds along both sides of the walk, in clumps (never an even row)
      if (h.px(1) >= 1.6) for (const sg of [-1, 1]) {
        h.part('beds-' + (sg < 0 ? 'l' : 'r'), { layer: 4, key: h.depth(0, sg * W * 0.5, 1) + 0.5 });
        for (let a = A0 + 3.5 * k; a < A1 - 3.5 * k; a += (1.1 + 1.4 * h.u('sa' + a + sg)) * k) {
          if (h.u('skip' + a + sg) > 0.55 + 0.4 * fill) continue;
          const l = sg * (2.8 + (W - 5.5 * k) * h.u('sl' + a + sg)), r = (1.0 + 1.2 * h.u('sr' + a + sg)) * k, flower = h.u('sf' + a + sg) < 0.28;
          h.disc(h.P(a, l, r * 0.75), r, _WMD_GH_GREENS[Math.floor(h.u('sc' + a + sg) * 7) % 7], 'houseplant', 'shrub', 0.62);
          if (flower && h.px(0.3 * k) >= 2) for (let q = 0; q < 4; q++) h.disc(h.P(a + (h.u('fa' + q + a) - 0.5) * r, l + (h.u('fl' + q + a) - 0.5) * r * 0.5, r * (0.9 + 0.5 * h.u('fy' + q + a))), 0.16 * k, _WMD_GH_FLOWERS[(q + Math.floor(h.u('fc' + a) * 5)) % 5], 'houseplant', 'flower', 1);
        }
      }
    }

    /* ---- 5. the ribs of the near half (seen through the near glass), far to near ---- */
    h.part('front-ribs', { layer: 5 });
    for (const [j] of ribOrder) for (let i = 0; i < NS; i++) if (front(i, aj(j))) ribSeg(j, i, false, false);

    /* ---- 6. the near glass: panes with a little tone between them (some catch more sky), and the glazing bars ---- */
    h.part('front-glass', { layer: 6 });
    for (let i = 0; i < NS; i++) {
      const yM = (pts[i][1] + pts[i + 1][1]) / 2, sky = Math.max(0, Math.min(1, (yM - yb) / (H - yb)));
      if (far) {   // far away: one face per run of front bays
        let j = 0;
        while (j < NB) { const isF = front(i, aj(j) + bay / 2); let e = j + 1; while (e < NB && front(i, aj(e) + bay / 2) === isF) e++; if (isF) h.face([h.P(aj(j), pts[i][0], pts[i][1]), h.P(aj(e), pts[i][0], pts[i][1]), h.P(aj(e), pts[i + 1][0], pts[i + 1][1]), h.P(aj(j), pts[i + 1][0], pts[i + 1][1])], h.mix(liv.glass, '#eef4f6', sky * 0.4), 'glass', 'glass', null, { alpha: 0.3 }); j = e; }
        continue;
      }
      for (let j = 0; j < NB; j++) {
        if (!front(i, aj(j) + bay / 2)) continue;
        const tone = h.mix(liv.glass, '#f1f6f8', sky * 0.35 + 0.25 * h.u('pt' + i + '.' + j)), al = 0.26 + 0.22 * sky + 0.1 * h.u('pa' + i + '.' + j);
        h.face([h.P(aj(j), pts[i][0], pts[i][1]), h.P(aj(j + 1), pts[i][0], pts[i][1]), h.P(aj(j + 1), pts[i + 1][0], pts[i + 1][1]), h.P(aj(j), pts[i + 1][0], pts[i + 1][1])], tone, 'glass', 'glass', null, { alpha: al });
      }
    }
    if (h.px(0.08 * k) >= 0.6) {
      for (let i = 1; i < NS; i++) if (front(i, 0) || front(i - 1, 0)) h.line([h.P(A0, pts[i][0], pts[i][1]), h.P(A1, pts[i][0], pts[i][1])], 0.08 * k, bar, 'metal', 'bar', { alpha: 0.85 });
      // the arch lines on the glass over each rib (the rib's cover strip)
      for (let j = 0; j <= NB; j++) { const run = []; for (let i = 0; i <= NS; i++) { const ok = (i < NS && front(i, aj(j))) || (i > 0 && front(i - 1, aj(j))); if (ok) run.push(h.P(aj(j), pts[i][0], pts[i][1])); else if (run.length) { if (run.length > 1) h.line(run.splice(0), 0.12 * k, rib, 'timber', 'rib-cap', { alpha: 0.75 }); else run.length = 0; } } if (run.length > 1) h.line(run, 0.12 * k, rib, 'timber', 'rib-cap', { alpha: 0.75 }); }
    }

    /* ---- 7. the near end wall: glass on a grid of mullions and transoms, the end rib, the entrance portal ---- */
    [0, 1].forEach((s) => {
      if (!endFront[s]) return;
      const a = s ? A1 : A0, out = s ? 1 : -1;
      h.part('end-' + s, { layer: 7 });
      h.face(endPoly(a, 0), liv.glass, 'glass', 'glass', null, { alpha: 0.3 });
      const clipY = (l) => S.yOf(l);
      // mullions: every ~2.4 m across the end, up to the arch
      if (h.px(0.1 * k) >= 0.5) {
        const nm = Math.max(4, Math.round(2 * W / (2.4 * k)));
        for (let m = 1; m < nm; m++) { const l = -W + 2 * W * m / nm; h.line([h.P(a + out * 0.05 * k, l, yb), h.P(a + out * 0.05 * k, l, clipY(l) - 0.1 * k)], (m % 3 === 0 ? 0.16 : 0.09) * k, m % 3 === 0 ? rib : bar, m % 3 === 0 ? 'timber' : 'metal', 'mullion'); }
        for (let y = yb + 3 * k; y < H - 1.5 * k; y += 2.6 * k) {
          // the half width of the arch at this height
          const hw = p.profile === 'round' ? W * Math.sqrt(Math.max(0, 1 - Math.pow((y - yb) / (H - yb), 2))) : W * Math.sqrt(Math.max(0, 1 - (y - yb) / (H - yb)));
          if (hw > 0.8 * k) h.line([h.P(a + out * 0.05 * k, -hw + 0.1 * k, y), h.P(a + out * 0.05 * k, hw - 0.1 * k, y)], 0.08 * k, bar, 'metal', 'transom');
        }
      }
      // the end arch itself: the outermost rib, wide and solid
      h.line(pts.map(([l, y]) => h.P(a + out * 0.08 * k, l, y)), 0.55 * k, rib, 'timber', 'end-rib');
      // the entrance portal: a glazed box with a flat canopy, the doors lit after dusk
      if (p.door === 'both' || (p.door === 'front') === (s === 1)) {
        const pw = 3.4 * k, ph = 4.2 * k, d0 = a, d1 = a + out * 1.6 * k;
        const lo = Math.min(d0, d1), hi = Math.max(d0, d1);
        h.box(lo, hi, -pw, pw, 0, ph, h.aged('#c9c6bd', 'stone', 0.4), h.aged('#8f8c84', 'stone', 0.4), 'stone', 'portal');
        h.face([h.P(d1 + out * 0.02 * k, -pw + 0.35 * k, 0.05 * k), h.P(d1 + out * 0.02 * k, pw - 0.35 * k, 0.05 * k), h.P(d1 + out * 0.02 * k, pw - 0.35 * k, ph - 0.6 * k), h.P(d1 + out * 0.02 * k, -pw + 0.35 * k, ph - 0.6 * k)], liv.door, 'glass', 'door', null, lit(_WMD_GH_LIT.door));
        if (h.px(0.06 * k) >= 0.8) for (const l of [-pw / 2, 0, pw / 2]) h.line([h.P(d1 + out * 0.04 * k, l, 0.05 * k), h.P(d1 + out * 0.04 * k, l, ph - 0.6 * k)], 0.07 * k, bar, 'metal', 'door-frame');
        h.box(lo - (out > 0 ? 0 : 0.8 * k), hi + (out > 0 ? 0.8 * k : 0), -pw - 0.5 * k, pw + 0.5 * k, ph, ph + 0.3 * k, h.aged('#e4e2dc', 'paint', 0.3), h.aged('#d4d2cb', 'paint', 0.3), 'paint', 'canopy');
      }
    });

    /* ---- 8. the plinth: granite along both sides and the ends (only the faces the eye meets) ---- */
    h.part('plinth', { layer: 8 });
    // four upstands, not one block: a block's top would lie over the whole floor seen through the glass
    const t = 0.25 * k, top = h.shade(plinth, 1.15);
    for (const sg of [-1, 1]) h.box(A0 - t, A1 + t, sg * W - t, sg * W + t, 0, yb, plinth, top, 'stone', 'plinth');
    for (const a of [A0, A1]) h.box(a - t, a + t, -W + t, W - t, 0, yb, plinth, top, 'stone', 'plinth');
    return { height: H };
  },
});

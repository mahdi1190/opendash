/* ---------- a block of weathered gritstone as a real 3D model (18 Oct, Stanage Edge: "big weathered gritstone boulders") ----------
   rock.gritstone-block: the lump of millstone grit that lies in the heather below an edge or stands on a moor: angular, chamfered, bedded in
   level courses with the odd vertical joint, dark with weathering (sooty on the faces the rain does not reach, buff where it has been
   scoured), blotched with pale and orange lichen, damp and mossy at the foot, a tuft of grass and bilberry on top. Four forms by seed:
   `block` (one chunky boulder), `stack` (a smaller block resting on a larger one, offset), `slab` (a long low slab, leaning), `mushroom`
   (a narrow neck under a wide cap: the wind-and-sand shaped rocks of the Peak). 2.6 x 1.9 x 1.5 m at size 1; the seeded size varies from 0.55
   to 1.9 times that. opts: form ('block' | 'stack' | 'slab' | 'mushroom'), tuft (false for a bare block), lichen (0..1). Livery: weathered,
   sooty, buff, rust. Every face carries its normal, so the sun picks out the facets. */
const _WMD_GS_LIVERIES = Object.freeze([
  { name: 'weathered', stone: '#6a5f50', lichen: '#b2ad68', crust: '#b8823f' },
  { name: 'sooty', stone: '#443f39', lichen: '#a9a560', crust: '#a9733a' },
  { name: 'buff', stone: '#7c705d', lichen: '#b9b673', crust: '#c08a48' },
  { name: 'rust', stone: '#63523f', lichen: '#b0ab66', crust: '#bb7a38' },
]);
const _WMD_GS_FORMS = Object.freeze(['block', 'block', 'block', 'block', 'block', 'stack', 'stack', 'stack', 'slab', 'mushroom']);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('rock.gritstone-block'))) sceneObjDefine({
  id: 'rock.gritstone-block', category: 'rock', size: [150, 90], variants: 1, seasonal: false, flippable: true, real: { h: 2.0, l: 3.7, w: 2.6 },
  palette: { base: { stone: '#766d60', dark: '#3e3932' } }, parts: ['body'],
  tags: ['uk', 'moor', 'peak', 'gritstone', 'boulder', 'rock', 'kit:temperate', 'role:rock', 'class:rock'],
  credit: 'a block of weathered gritstone (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@stone', 'M-72 0L-66 -52L-28 -78L30 -82L70 -50L74 0Z'], ['@dark', 'M30 -82L70 -50L74 0L40 0Z']] }; },
});
/** A rounded-rectangle ring [[a, l]...] (a superellipse of 12 points, counter-clockwise seen from above) with its radius nudged by jit (a share). */
const _WMD_GS_N = 12;
function _wmdGsRing(a0, a1, l0, l1, p, jit, rn) {
  const ca = (a0 + a1) / 2, cl = (l0 + l1) / 2, ra = (a1 - a0) / 2, rl = (l1 - l0) / 2, out = [], ph = rn() * 0.5;
  for (let i = 0; i < _WMD_GS_N; i++) {
    const th = ph + i / _WMD_GS_N * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th), r = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(sn), p), -1 / p), k = r * (1 + (rn() - 0.5) * jit);
    out.push([ca + ra * c * k, cl + rl * sn * k]);
  }
  return out;
}
/**
 * One chunky weathered block (its faces go into the current part): four rings (the foot, the belly, the shoulder, the crown) each a rounded
 * rectangle of its own shape, the belly overhanging the foot and the crown shifted a little to one side (a block is never a prism), the sides
 * between them, the top, then the dressing of every side the eye sees (bedding, a joint, lichen, damp moss at the foot). t: { a0, a1, l0, l1, y0, y1,
 * stone, lean, tilt, lichen (0..1), liv }. Returns { y1, top(a, l) -> the crown's point } so a tuft can stand on it.
 */
function _wmdGsBlock(h, k, rn, t) {
  const { a0, a1, l0, l1, y0, y1, stone, lean = 0, tilt = 0.05, liv, lichen = 0.5 } = t, w = a1 - a0, d = l1 - l0, hh = y1 - y0, P = h.P, N = _WMD_GS_N;
  const sh = (rn() - 0.5) * 0.18 * Math.min(w, d), sh2 = (rn() - 0.5) * 0.16 * Math.min(w, d), pw = 3.2 + 1.6 * rn(), jit = 0.14;
  const lv = [
    { r: _wmdGsRing(a0 + 0.12 * w, a1 - 0.12 * w, l0 + 0.12 * d, l1 - 0.12 * d, pw, jit, rn), y: y0, da: 0, dl: 0 },
    { r: _wmdGsRing(a0, a1, l0, l1, pw, jit, rn), y: y0 + hh * (0.4 + 0.1 * rn()), da: 0, dl: 0 },
    { r: _wmdGsRing(a0 + 0.04 * w, a1 - 0.05 * w, l0 + 0.05 * d, l1 - 0.04 * d, pw, jit, rn), y: y0 + hh * (0.8 + 0.06 * rn()), da: sh * 0.5, dl: sh2 * 0.5 + lean * 0.5 },
    { r: _wmdGsRing(a0 + 0.2 * w, a1 - 0.2 * w, l0 + 0.2 * d, l1 - 0.2 * d, pw, jit, rn), y: y1, da: sh, dl: sh2 + lean },
  ];
  const ins = P((a0 + a1) / 2, (l0 + l1) / 2, (y0 + y1) / 2), cA = (a0 + a1) / 2;
  const pt = (i, q) => { const L = lv[i]; return P(q[0] + L.da, q[1] + L.dl, L.y + (i === 3 ? tilt * (q[0] - cA) : 0)); };
  const side = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < N; j++) {
    const A = lv[i].r[j], B = lv[i].r[(j + 1) % N], C = lv[i + 1].r[(j + 1) % N], D = lv[i + 1].r[j];
    h.face([pt(i, A), pt(i, B), pt(i + 1, C), pt(i + 1, D)], h.shade(stone, 0.88 + 0.2 * rn() + (i === 2 ? 0.07 : i === 0 ? -0.07 : 0)), 'stone', i === 0 ? 'foot' : 'side', ins);
    side.push({ i, j, A, B, C, D, dir: [B[1] - A[1], -(B[0] - A[0]), 0.1], mid: [(A[0] + B[0]) / 2 + lv[i].da, (A[1] + B[1]) / 2 + lv[i].dl, (lv[i].y + lv[i + 1].y) / 2] });
  }
  h.face(lv[3].r.map(q => pt(3, q)), h.shade(stone, 1.16), 'stone', 'top', ins);
  // the dressing: only on the sides the eye sees, only where the facet is big enough on screen to read
  if (h.px(0.12 * k) >= 0.9) for (const s of side) {
    if (s.i === 2 || !h.sees(s.dir, s.mid)) continue;
    const L0 = lv[s.i], L1 = lv[s.i + 1];
    const at = (f, v) => { const lo = [s.A[0] + (s.B[0] - s.A[0]) * f, s.A[1] + (s.B[1] - s.A[1]) * f], hi = [s.D[0] + (s.C[0] - s.D[0]) * f, s.D[1] + (s.C[1] - s.D[1]) * f]; return P(lo[0] + (hi[0] - lo[0]) * v + L0.da + (L1.da - L0.da) * v, lo[1] + (hi[1] - lo[1]) * v + L0.dl + (L1.dl - L0.dl) * v, L0.y + (L1.y - L0.y) * v); };
    if (s.i === 1) {
      // a bedding course or two (the grit is laid in beds), a hairline joint down the face, a dark weathered stain
      for (let b = 0; b < 2; b++) { const v = 0.28 + 0.4 * b + 0.14 * (rn() - 0.5); h.line([at(0.04, v), at(0.5, v + 0.05 * (rn() - 0.5)), at(0.96, v)], 0.014 * k, h.shade(stone, 0.5), 'stone', 'bed', { alpha: 0.35 }); }
      if (rn() < 0.4) { const f = 0.25 + 0.5 * rn(); h.line([at(f, 0.05), at(f + 0.05 * (rn() - 0.5), 0.55), at(f, 0.98)], 0.026 * k, h.shade(stone, 0.42), 'stone', 'joint', { alpha: 0.5 }); }
      if (rn() < 0.6) { const f = 0.15 + 0.6 * rn(), wd = 0.12 + 0.18 * rn(); h.face([at(f, 0.98), at(f + wd, 0.98), at(f + wd * 0.8, 0.25 + 0.3 * rn()), at(f + wd * 0.1, 0.35 + 0.3 * rn())], h.shade(stone, 0.5), 'stone', 'stain', null, { alpha: 0.3 }); }
    }
    // lichen: a pale blotch and an orange one on the upper part, never a regular row
    for (let b = 0; b < 3; b++) {
      if (rn() > lichen) continue;
      const f = 0.1 + 0.7 * rn(), v = 0.3 + 0.6 * rn(), r = 0.07 + 0.12 * rn(), orange = rn() < 0.35, col = orange ? liv.crust : liv.lichen;
      h.face([at(f, v), at(f + r, v + r * 0.3), at(f + r * 1.2, v + r * 0.9), at(f + r * 0.2, v + r * 1.1), at(f - r * 0.4, v + r * 0.5)], col, 'stone', 'lichen', null, { alpha: orange ? 0.36 : 0.42 });
    }
    // damp and green at the foot
    if (s.i === 0) h.face([at(0, 0), at(1, 0), at(0.96, 0.8), at(0.04, 0.9)], '#566838', 'stone', 'moss', null, { alpha: 0.3 });
  }
  return { y1, top: (a, l) => pt(3, [a, l]) };
}
worldModelDefine('gritstone-block', {
  name: 'Gritstone block', ids: ['rock.gritstone-block'], sampleObj: 'rock.gritstone-block', solidity: 'solid', faceCap: 420,
  dims() { return { L: 2.6, B: 1.9, H: 1.5 }; },
  liveries: () => _WMD_GS_LIVERIES,
  samples: [{ livery: 'weathered', seed: 3 }, { livery: 'sooty', seed: 8, age: 0.8 }, { livery: 'buff', seed: 15 }, { livery: 'rust', seed: 21, age: 0.5 }, { livery: 'weathered', seed: 29, size: 1.6 }],
  params(ent, o, p) {
    const op = p.opts || {}, u = (key) => (typeof _wmdU === 'function' ? _wmdU(p.seed, key) : 0.5);
    const form = _WMD_GS_FORMS.includes(op.form) ? op.form : _WMD_GS_FORMS[Math.floor(u('form') * _WMD_GS_FORMS.length) % _WMD_GS_FORMS.length];
    const r = { form, sv: 0.6 + 0.55 * Math.pow(u('sz'), 1.7), tuft: op.tuft === false ? false : u('tuft') < 0.72, lich: Number.isFinite(op.lichen) ? op.lichen : 0.35 + 0.6 * u('lich'), proud: 0.8 + 0.3 * u('proud') };
    if (p.liveryKey == null) r.liveryKey = Math.floor(u('livery') * _WMD_GS_LIVERIES.length);
    return r;
  },
  footprint(p) { const k = p.size * p.sv, L = (p.form === 'slab' ? 3.0 : 2.6) * k, B = (p.form === 'slab' ? 1.7 : 1.9) * k; return [[-L / 2, -B / 2], [L / 2, -B / 2], [L / 2, B / 2], [-L / 2, B / 2]]; },
  build(p, h) {
    const k = p.size * p.sv, liv = p.livery, stone = h.aged(liv.stone, 'stone', 0.7), lichen = p.lich;
    // the model's own sequence is shared with the ring jitter, so the details of one block never shift another's
    const rn = h.rnd;
    h.contactShadow(-1.6 * k, 1.6 * k, -1.2 * k, 1.2 * k, 0.34);
    const tops = [];
    if (p.form === 'slab') {
      const Lh = 3.0 * k, Bh = 1.7 * k, T = Math.max(0.5, 0.8 * k * (0.8 + 0.5 * rn())), lean = (rn() < 0.5 ? -1 : 1) * 0.18 * k;
      h.part('slab', { layer: 1 });
      tops.push(_wmdGsBlock(h, k, rn, { a0: -Lh / 2, a1: Lh / 2, l0: -Bh / 2, l1: Bh / 2, y0: 0, y1: T, stone, lean, tilt: 0.08, liv, lichen }));
    } else if (p.form === 'stack') {
      const y1 = 0.95 * k * p.proud, off = (rn() - 0.5) * 0.7 * k;
      h.part('lower', { layer: 1 });
      tops.push(_wmdGsBlock(h, k, rn, { a0: -1.3 * k, a1: 1.3 * k, l0: -0.95 * k, l1: 0.95 * k, y0: 0, y1, stone, liv, lichen }));
      h.part('upper', { layer: 3 });
      tops.push(_wmdGsBlock(h, k, rn, { a0: -0.85 * k + off, a1: 0.95 * k + off, l0: -0.7 * k, l1: 0.65 * k, y0: y1 - 0.04 * k, y1: y1 + 0.75 * k * (0.8 + 0.5 * rn()), stone: h.shade(stone, 1.04), liv, lichen }));
    } else if (p.form === 'mushroom') {
      h.part('neck', { layer: 1 });
      tops.push(_wmdGsBlock(h, k, rn, { a0: -0.55 * k, a1: 0.6 * k, l0: -0.5 * k, l1: 0.55 * k, y0: 0, y1: 0.9 * k, stone: h.shade(stone, 0.9), liv, lichen }));
      h.part('cap', { layer: 3 });
      tops.push(_wmdGsBlock(h, k, rn, { a0: -1.3 * k, a1: 1.3 * k, l0: -1.0 * k, l1: 1.0 * k, y0: 0.82 * k, y1: 0.82 * k + 0.8 * k * (0.8 + 0.4 * rn()), stone, tilt: 0.05, liv, lichen }));
    } else {
      h.part('block', { layer: 1 });
      tops.push(_wmdGsBlock(h, k, rn, { a0: -1.3 * k, a1: 1.3 * k, l0: -0.95 * k, l1: 0.95 * k, y0: 0, y1: 1.5 * k * p.proud * (0.7 + 0.4 * rn()), stone, liv, lichen }));
    }
    const T = tops[tops.length - 1], H = T.y1;
    // a tuft of grass and bilberry on the top, with a heather head in summer; nothing on a bare scoured block
    if (p.tuft && h.px(0.2 * k) >= 1.2) {
      h.part('tuft', { layer: 5 });
      const n = 2 + Math.floor(rn() * 3);
      for (let i = 0; i < n; i++) {
        const a = (rn() - 0.5) * 1.4 * k * 0.7, l = (rn() - 0.5) * 1.1 * k * 0.7, r = (0.16 + 0.22 * rn()) * k;
        const c = T.top(a, l); c[1] += r * 0.45;
        h.disc(c, r, rn() < 0.5 ? '#5a6a38' : '#7a7a45', 'grass', 'tuft', 0.7);
        if (p.season === 'summer' && rn() < 0.5) { const c2 = [c[0], c[1] + r * 0.35, c[2]]; h.disc(c2, r * 0.55, '#8a4f86', 'flower', 'bloom', 0.8); }
      }
    }
    return { height: H + 0.05 * k };
  },
});

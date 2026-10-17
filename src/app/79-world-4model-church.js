/* ---------- an English parish church as a real 3D model (17 Oct, "the nave is a blank wall": the Cotswold green) ----------
   structure.parish-church: a west tower (three stages, set-back corner buttresses, a belfry with louvred openings, a corbel table and a
   crenellated parapet with corner pinnacles, a stair turret, a weathercock; or a broach spire), a nave with its roof (stone slates laid in
   courses that shrink toward the ridge, a ridge cap, copings on the gables), a clerestory over one or two aisles (or tall windows in the
   bare nave wall), a lower chancel, a gabled south porch with an arched doorway, a priest's door, stepped buttresses between the bays, window
   tracery by era (round-headed norman lights, lancets, three-light perpendicular windows with a mullion, a transom and a hood), quoins
   at every corner, a plinth, and ashlar coursing with mottled stone. Seen from any angle. Nothing is lettered, no crosses (the care rules):
   the finials are balls and spikes, the vane a cockerel.
   Axis: a runs west -> east along the nave (the tower at the west end, the chancel at the east), l across (+l is the right of the facing: the
   SOUTH side when the model faces east = 90, where the porch is). 34 m by 14 m by 19.4 m (to the vane) at size 1. Parameters (model.opts, all optional and
   seeded when absent): era 'norman' | 'early-english' | 'perpendicular', aisle 'both' | 'south' | 'none', crown 'parapet' | 'spire' | 'none'
   (no tower), porch (bool), clerestory (bool, default with an aisle). Livery: honey, grey-limestone, ironstone, red-sandstone, flint. */
const _WMD_CH_LIVERIES = Object.freeze([
  { name: 'honey', wall: '#c4a468', quoin: '#d9c088', trim: '#dcc690', roof: '#8a7d66', roofHi: '#a39679', roofMat: 'slate', glass: '#27333f', door: '#4a3a2c' },
  { name: 'grey-limestone', wall: '#a9a498', quoin: '#c4bfb1', trim: '#cbc6b8', roof: '#6c7176', roofHi: '#83888c', roofMat: 'slate', glass: '#26303a', door: '#3f3a34' },
  { name: 'ironstone', wall: '#a47443', quoin: '#c29c68', trim: '#c9a876', roof: '#6c5e53', roofHi: '#85766a', roofMat: 'slate', glass: '#2a303a', door: '#40342a' },
  { name: 'red-sandstone', wall: '#9d5c47', quoin: '#bc8168', trim: '#c4906f', roof: '#5f6462', roofHi: '#777c78', roofMat: 'slate', glass: '#27303a', door: '#3b2f28' },
  { name: 'flint', wall: '#7c7e7b', quoin: '#bdb6a3', trim: '#c4bda8', roof: '#8a4a38', roofHi: '#a05c46', roofMat: 'tile', glass: '#252d36', door: '#3d332b' },
]);
const _WMD_CH_ERAS = Object.freeze(['norman', 'early-english', 'perpendicular']);
if (typeof sceneObjDefine === 'function' && !(typeof sceneObj === 'function' && sceneObj('structure.parish-church'))) sceneObjDefine({
  id: 'structure.parish-church', category: 'structure', size: [380, 200], variants: 1, seasonal: false, flippable: true, real: { h: 19.4, l: 34, w: 14 },
  palette: { base: { wall: '#c4a468', roof: '#8a7d66', dark: '#27333f' } }, parts: ['body'],
  tags: ['uk', 'village', 'church', 'kit:temperate', 'role:landmark', 'class:structure'],
  credit: 'a generic English parish church (the parametric model draws it; this sprite is the fallback)',
  build() { return { body: [['@wall', 'M-190 0H190V-70H-190Z'], ['@roof', 'M-190 -70L-150 -96H190V-70Z'], ['@wall', 'M-190 -70H-130V-190H-190Z'], ['@dark', 'M-182 -150H-138V-170H-182Z']] }; },
});
function _wmdChRng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** A wall plane for decals: ax 'l' (the wall stands at l = pos, u runs along a) or 'a' (stands at a = pos, u runs along l); sg its outward sign. */
function _wmdChWall(h, ax, pos, sg) {
  const dir = ax === 'l' ? [0, sg, 0] : [sg, 0, 0], n = h.nOf(dir), lit = typeof _wexLit === 'function' ? _wexLit(n) : 1, R2 = (v) => Math.round(v * 100) / 100;
  const W = { ax, pos, sg, dir, fn: (u, v, off) => (ax === 'l' ? h.P(u, pos + sg * off, v) : h.P(pos + sg * off, u, v)), sun: { n: [R2(n[0]), R2(n[1]), R2(n[2])], sun: 1 } };
  W.shade = (hex) => h.shade(hex, lit);
  // how squarely the eye meets this wall (1 face-on, 0 edge-on): a window seen edge-on is never lit (a sliver with a halo reads as a floating glow)
  { const c = ax === 'l' ? h.P(0, pos, 3) : h.P(pos, 0, 3), v = [c[0], c[1] - h.cam.eye, c[2]], L = Math.hypot(v[0], v[1], v[2]) || 1; W.cos = Math.abs(n[0] * v[0] + n[1] * v[1] + n[2] * v[2]) / L; }
  W.sees = (u, v) => h.sees(dir, ax === 'l' ? [u, pos, v] : [pos, u, v]);
  return W;
}
/** A decal polygon [[u, v]...] on a wall, a little proud (never culled: the caller only decorates walls that face the eye). */
function _wmdChPoly(h, W, uv, hex, mat, role, off, extra) {
  return h.face(uv.map(([u, v]) => W.fn(u, v, off)), W.shade(hex), mat, role, null, Object.assign({}, W.sun, extra || null));
}
const _wmdChRect = (h, W, u0, u1, v0, v1, hex, mat, role, off, extra) => _wmdChPoly(h, W, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], hex, mat, role, off, extra);
/** The outline of an arched opening (u centre, v0 sill, half width w, height hh, rise of the arch) as [[u, v]...]: 'round' a semicircle, 'pointed' two-centred, 'flat' none. */
function _wmdChArch(u, v0, w, hh, kind, rise, grow) {
  const g = grow || 0, ww = w + g, top = v0 + hh + g, base = v0 - g;
  if (kind === 'flat') return [[u - ww, base], [u + ww, base], [u + ww, top], [u - ww, top]];
  const ris = (kind === 'round' ? ww : Math.max(ww * 0.7, rise || ww * 1.1)) + g * 0.4, vs = top - ris, left = [];
  if (kind === 'round') for (let i = 1; i < 6; i++) { const t = i / 6 * Math.PI / 2; left.push([u - ww * Math.cos(t), vs + ww * Math.sin(t)]); }
  else {
    const R = (ww * ww + ris * ris) / (2 * ww), phiMax = Math.acos(Math.max(-1, Math.min(1, (R - ww) / R)));
    for (let i = 1; i < 6; i++) { const f = i / 6 * phiMax; left.push([u - ww + R - R * Math.cos(f), vs + R * Math.sin(f)]); }
  }
  return [[u - ww, base], [u - ww, vs], ...left, [u, top], ...left.slice().reverse().map(([x, y]) => [2 * u - x, y]), [u + ww, vs], [u + ww, base]];
}
/** Courses of ashlar across a wall panel [u0, u1] x [v0, v1], broken into runs and skipping the opening boxes `skip` [[u0, u1, v0, v1]...]. */
function _wmdChCourses(h, W, p, rn, u0, u1, v0, v1, step, hex, skip) {
  const k = p.size;
  if (h.px(step) < 2.4) return;
  const jump = h.px(step) < 4 ? 2 : 1;
  for (let v = v0 + step * (0.5 + 0.3 * rn()); v < v1 - 0.1 * k; v += step * jump * (0.85 + 0.3 * rn())) {
    let u = u0;
    while (u < u1 - 0.2) {
      const e = Math.min(u1, u + (3 + 9 * rn()) * k);
      // split by the openings crossing this course
      let a = u;
      const cuts = (skip || []).filter(s => v > s[2] - 0.05 && v < s[3] + 0.05 && s[1] > a && s[0] < e).sort((x, y) => x[0] - y[0]);
      for (const s of cuts) { if (s[0] > a + 0.15) h.line([W.fn(a, v, 0.01), W.fn(s[0], v, 0.01)], 0.03 * k, W.shade(hex), 'stone', 'course', { alpha: 0.5 }); a = Math.max(a, s[1]); }
      if (e > a + 0.15) h.line([W.fn(a, v, 0.01), W.fn(e, v, 0.01)], 0.03 * k, W.shade(hex), 'stone', 'course', { alpha: 0.5 });
      u = e + (0.1 + 0.5 * rn()) * k;
    }
  }
  // and the odd upright joints of a course, only near
  if (h.px(0.3 * k) >= 6) for (let v = v0 + step; v < v1; v += step * 2) for (let u = u0 + rn() * 1.2 * k; u < u1; u += (0.9 + 1.2 * rn()) * k) {
    if ((skip || []).some(s => u > s[0] - 0.1 && u < s[1] + 0.1 && v > s[2] - 0.1 && v < s[3] + 0.1)) continue;
    h.line([W.fn(u, v, 0.01), W.fn(u + (rn() - 0.5) * 0.08, v + step * 0.9, 0.01)], 0.024 * k, W.shade(hex), 'stone', 'joint', { alpha: 0.4 });
  }
}
/** Mottle: patches of lighter and darker stone (and rarely a lichen stain) so a wall is never one flat colour. */
function _wmdChMottle(h, W, p, rn, u0, u1, v0, v1, hex, n) {
  const k = p.size;
  for (let i = 0; i < n; i++) {
    const w = (0.8 + 2.4 * rn()) * k, hh = (0.4 + 1.1 * rn()) * k, u = u0 + rn() * Math.max(0.01, u1 - u0 - w), v = v0 + rn() * Math.max(0.01, v1 - v0 - hh), t = rn(), lichen = rn() < 0.07;
    _wmdChRect(h, W, u, u + w, v, v + hh, lichen ? '#a7a25a' : h.shade(hex, t < 0.5 ? 0.86 + 0.08 * t : 1.04 + 0.1 * (t - 0.5)), 'stone', 'mottle', 0.007, { alpha: lichen ? 0.3 : 0.38 });
  }
}
/** Quoins at a wall corner: long and short blocks alternating up the edge (u = the corner, d = +1 / -1 the way onto the wall). */
function _wmdChQuoins(h, W, p, u, d, v0, v1, hex) {
  const k = p.size, bh = 0.4 * k;
  if (h.px(bh) < 2) return;
  let i = 0;
  for (let v = v0; v + bh <= v1 + 0.01; v += bh, i++) _wmdChRect(h, W, d > 0 ? u : u - (i % 2 ? 0.5 : 0.85) * k, d > 0 ? u + (i % 2 ? 0.5 : 0.85) * k : u, v + 0.015 * k, v + bh - 0.015 * k, hex, 'stone', 'quoin', 0.012);
}
/** A window: stone surround, arched glass (some lit after dusk), mullions, a transom and a hood. kind 'round' | 'pointed' | 'flat'; lights: number of lights. */
function _wmdChWindow(h, W, p, rn, u, v0, w, hh, kind, lights, trim, glass, tr) {
  const k = p.size, rise = w * 1.15;
  _wmdChPoly(h, W, _wmdChArch(u, v0 - 0.08 * k, w, hh, kind, rise, 0.14 * k), trim, 'stone', 'surround', 0.011);
  const fx = h.litFx(rn() < 0.2 || W.cos < 0.34, undefined);
  _wmdChPoly(h, W, _wmdChArch(u, v0, w, hh, kind, rise, 0), glass, 'glass', 'window', 0.016, fx);
  if (h.px(w) < 5) return;
  const top = v0 + hh;
  for (let i = 1; i < lights; i++) { const x = u - w + 2 * w * i / lights; h.line([W.fn(x, v0, 0.02), W.fn(x, top - (kind === 'flat' ? 0 : rise * 0.55), 0.02)], 0.07 * k, trim, 'stone', 'mullion'); }
  if (tr && hh > 2.2 * k) h.line([W.fn(u - w, v0 + hh * 0.58, 0.02), W.fn(u + w, v0 + hh * 0.58, 0.02)], 0.06 * k, trim, 'stone', 'transom');
  if (kind !== 'flat' && h.px(w) >= 8) h.line(_wmdChArch(u, v0, w, hh, kind, rise, 0.17 * k).slice(1, -1).map(([a, b]) => W.fn(a, b, 0.024)), 0.07 * k, trim, 'stone', 'hood');
  h.line([W.fn(u - w - 0.2 * k, v0 - 0.08 * k, 0.03), W.fn(u + w + 0.2 * k, v0 - 0.08 * k, 0.03)], 0.08 * k, trim, 'stone', 'sill');
}
/** A stepped buttress at a on the wall plane l = lw (outward sg), rising to yTop. */
function _wmdChButtress(h, p, a, lw, sg, yTop, hex, cap) {
  const k = p.size, hw = 0.36 * k, y1 = yTop * 0.58, p1 = 0.9 * k, p2 = 0.62 * k;
  h.box(a - hw, a + hw, Math.min(lw, lw + sg * p1), Math.max(lw, lw + sg * p1), 0, y1, hex, cap, 'stone', 'buttress');
  h.box(a - hw * 0.92, a + hw * 0.92, Math.min(lw, lw + sg * p2), Math.max(lw, lw + sg * p2), y1, yTop, hex, cap, 'stone', 'buttress');
  const ins = h.P(a, lw + sg * 0.3 * k, yTop - 0.3 * k);
  h.face([h.P(a - hw * 0.92, lw + sg * p2, yTop), h.P(a + hw * 0.92, lw + sg * p2, yTop), h.P(a + hw * 0.92, lw, yTop + 0.5 * k), h.P(a - hw * 0.92, lw, yTop + 0.5 * k)], cap, 'stone', 'buttress-cap', ins);
}
/** A slab roof of stone slates seen from the eye: courses that shrink toward the ridge, tone strips, only where seen. pts(t, a) -> model point along slope t (0 eave .. 1 ridge). */
function _wmdChRoofDeco(h, p, rn, a0, a1, at, dir, probe, liv, mat, slopeLen) {
  const k = p.size;
  if (!h.sees(dir, probe)) return;
  const nn = h.nOf(dir), litR = typeof _wexLit === 'function' ? _wexLit(nn) : 1, R2 = (v) => Math.round(v * 100) / 100, hexLo = h.shade(h.aged(liv.roof, 'stone', 0.6), litR), hexHi = h.shade(liv.roofHi, litR), sn = { n: [R2(nn[0]), R2(nn[1]), R2(nn[2])], sun: 1 };
  // tone strips between courses (stone slates are never one tone)
  const pxc = h.px(0.4 * k);
  let t = 0;
  const rows = [];
  while (t < 1) { const g = (0.46 * k - 0.24 * k * t) / slopeLen; rows.push([t, Math.min(1, t + g)]); t += g; }
  const aRange = (a0 + a1) / 2;
  void aRange;
  for (const [t0, t1] of rows) {
    const col = h.mix(hexLo, hexHi, 0.15 + 0.7 * rn()), jit = 0.92 + 0.16 * rn();
    for (let a = a0; a < a1 - 0.2 * k; ) {
      const e = Math.min(a1, a + (2.5 + 7 * rn()) * k);
      if (rn() < 0.55) h.face([at(a, t0), at(e, t0), at(e, t1), at(a, t1)], h.shade(col, jit), mat, 'slates', null, Object.assign({ alpha: 0.45 }, sn));
      if (pxc >= 2.4) h.line([at(a, t0), at(e, t0)], 0.035 * k, h.shade(hexLo, 0.72), mat, 'course', { alpha: 0.55 });
      a = e;
    }
  }
}
/** A hood of a pyramid of n sides: used for turret caps and the spire. */
function _wmdChSpike(h, a, l, y0, y1, r, hex, mat, n) { h.frustum(h.ngon(a, l, r, n || 4, Math.PI / (n || 4)), y0, h.ngon(a, l, 0.03 * r, n || 4, Math.PI / (n || 4)), y1, hex, { mat: mat || 'slate', role: 'cap', cap: false }); }

worldModelDefine('parish-church', {
  name: 'English parish church', ids: ['structure.parish-church', 'landmark.parish-church'], sampleObj: 'structure.parish-church', solidity: 'solid', faceCap: 2600,
  dims() { return { L: 34, B: 14, H: 19.4 }; },
  liveries: () => _WMD_CH_LIVERIES,
  samples: [{ livery: 'honey', opts: { era: 'perpendicular', aisle: 'south' } }, { livery: 'grey-limestone', opts: { era: 'early-english', aisle: 'none', crown: 'spire' } }, { livery: 'ironstone', age: 0.7, opts: { era: 'norman', aisle: 'both' } }, { livery: 'flint', size: 0.8 }],
  params(ent, o, p) {
    const op = p.opts || {}, u = (key) => (typeof _wmdU === 'function' ? _wmdU(p.seed, key) : 0.5);
    const era = _WMD_CH_ERAS.includes(op.era) ? op.era : _WMD_CH_ERAS[Math.floor(u('era') * 3) % 3];
    const aisle = ['both', 'south', 'none'].includes(op.aisle) ? op.aisle : u('aisle') < 0.4 ? 'both' : u('aisle') < 0.8 ? 'south' : 'none';
    const crown = ['parapet', 'spire', 'none'].includes(op.crown) ? op.crown : u('crown') < 0.85 ? 'parapet' : 'spire';
    const r = { era, aisle, crown, porch: op.porch == null ? u('porch') < 0.85 : !!op.porch, clerestory: op.clerestory == null ? aisle !== 'none' : !!op.clerestory };
    if (p.liveryKey == null) r.liveryKey = Math.floor(u('livery') * _WMD_CH_LIVERIES.length);
    return r;
  },
  footprint(p) {
    const k = p.size, A0 = -p.L / 2, A1 = p.L / 2, tl = p.crown === 'none' ? 0 : 6.4 * k, nh = 3.9 * k, aw = 3.3 * k, chh = 3.1 * k, th = 3.5 * k;
    const sN = p.aisle === 'both' ? nh + aw : nh, sS = p.aisle !== 'none' ? nh + aw : nh, Ne = A1 - 7.4 * k, Ns = A0 + tl, pr = p.porch ? sS + 3 * k : sS;
    const pa = Ns + (Ne - Ns) * 0.62, pw = 2.2 * k;
    const out = [[A0, -th], [Ns, -th], [Ns, -sN], [Ne, -sN], [Ne, -chh], [A1, -chh], [A1, chh], [Ne, chh], [Ne, sS], [pa + pw, sS]];
    if (p.porch) out.push([pa + pw, pr], [pa - pw, pr]);
    out.push([pa - pw, sS], [Ns, sS], [Ns, th], [A0, th]);
    return out;
  },
  build(p, h) {
    const k = p.size, liv = p.livery, A0 = -p.L / 2, A1 = p.L / 2, era = p.era, rn = _wmdChRng((p.seed ^ 0x2f1d) >>> 0);
    const wall = h.aged(liv.wall, 'stone', 0.8), quoin = h.aged(liv.quoin, 'stone', 0.6), trim = h.aged(liv.trim, 'stone', 0.6), glass = liv.glass, roof = h.aged(liv.roof, 'stone', 0.6), rmat = liv.roofMat;
    const mortar = h.shade(wall, 0.74);
    const hasTower = p.crown !== 'none', tl = hasTower ? 6.4 * k : 0, th = 3.5 * k, nh = 3.9 * k, chh = 3.1 * k, aw = 3.3 * k, cl = 7.4 * k;
    const aS = p.aisle !== 'none', aN = p.aisle === 'both', Hn = (aS || aN) ? 8.1 * k : 6.7 * k, Rn = Hn + 2.5 * k, Ha = 3.9 * k, Hc = 5.5 * k, Rc = Hc + 2.1 * k, Ht = 15.2 * k;
    const Ns = A0 + tl, Ne = A1 - cl, sS = aS ? nh + aw : nh, sN = aN ? nh + aw : nh;
    const wallTop = '#b0a898';
    h.contactShadow(A0 - 1.2 * k, A1 + 1.2 * k, -(sN + 1.4 * k), sS + (p.porch ? 4.2 * k : 1.4 * k), 0.3);
    const stepC = 0.38 * k;
    const sky = (d, at) => h.sees(d, at);
    void sky;

    /* ---------- the masses, each a part (drawn far to near by its centre) ---------- */
    // nave
    h.part('nave', { layer: 1 });
    h.box(Ns, Ne, -nh, nh, 0, Hn, wall, wallTop, 'stone', 'wall');
    h.gable(Ns - 0.2 * k, Ne + 0.25 * k, -nh, nh, Hn, Rn, roof, { mat: rmat, ridge: 'a', over: 0.3 * k, end: wall, endMat: 'stone' });
    // chancel
    h.part('chancel', { layer: 1 });
    h.box(Ne, A1, -chh, chh, 0, Hc, wall, wallTop, 'stone', 'wall');
    h.gable(Ne - 0.1 * k, A1 + 0.1 * k, -chh, chh, Hc, Rc, roof, { mat: rmat, ridge: 'a', over: 0.3 * k, end: wall, endMat: 'stone' });
    // aisles with lean-to roofs
    const aisleMass = (sg) => {
      h.part(sg > 0 ? 'aisleS' : 'aisleN', { layer: 1 });
      const l0 = sg > 0 ? nh : -nh - aw, l1 = sg > 0 ? nh + aw : -nh;
      h.box(Ns, Ne, l0, l1, 0, Ha, wall, wallTop, 'stone', 'wall');
      const yJ = Hn - 1.9 * k, lo = sg * (nh + aw + 0.3 * k), li = sg * nh, ins = h.P((Ns + Ne) / 2, sg * (nh + aw / 2), Ha - 1);
      h.face([h.P(Ns - 0.2 * k, lo, Ha - 0.18 * k), h.P(Ne + 0.2 * k, lo, Ha - 0.18 * k), h.P(Ne + 0.2 * k, li, yJ), h.P(Ns - 0.2 * k, li, yJ)], roof, rmat, 'roof', ins);
      for (const a of [Ns, Ne]) h.face([h.P(a, sg * (nh + aw), Ha), h.P(a, li, Ha), h.P(a, li, yJ)], wall, 'stone', 'gable', ins);
    };
    if (aS) aisleMass(1);
    if (aN) aisleMass(-1);

    /* ---------- the tower ---------- */
    const bays = Math.max(3, Math.round((Ne - Ns) / (4.7 * k))), bayW = (Ne - Ns) / bays;
    if (hasTower) {
      h.part('tower', { layer: 2 });
      const s1 = 5.4 * k, s2 = 10.2 * k, s3 = Ht - 0.95 * k, a0 = A0, a1 = A0 + tl;
      const stage = (y0, y1, hw, hex) => h.box(a0 + (th - hw) * 0.0, a1 - (th - hw) * 0.0, -hw, hw, y0, y1, hex, wallTop, 'stone', 'tower');
      h.box(a0, a1, -th, th, 0, s1, wall, wallTop, 'stone', 'tower');
      h.box(a0 + 0.12 * k, a1 - 0.12 * k, -th + 0.12 * k, th - 0.12 * k, s1, s2, wall, wallTop, 'stone', 'tower');
      h.box(a0 + 0.22 * k, a1 - 0.22 * k, -th + 0.22 * k, th - 0.22 * k, s2, s3, wall, wallTop, 'stone', 'tower');
      void stage;
      // string courses (drip mouldings) at the stage joins and a corbel table under the parapet
      for (const y of [s1, s2]) h.box(a0 + 0.04 * k, a1 - 0.04 * k, -th + 0.04 * k, th - 0.04 * k, y - 0.08 * k, y + 0.12 * k, trim, trim, 'stone', 'string');
      h.box(a0 - 0.12 * k, a1 + 0.12 * k, -th - 0.1 * k, th + 0.1 * k, s3, s3 + 0.28 * k, trim, trim, 'stone', 'corbel');
      // the parapet: a wall with merlons, four corner pinnacles
      h.box(a0 - 0.05 * k, a1 + 0.05 * k, -th - 0.03 * k, th + 0.03 * k, s3 + 0.28 * k, Ht + 0.55 * k, wall, wallTop, 'stone', 'parapet');
      const inner = h.P((a0 + a1) / 2, 0, Ht + 0.2 * k);
      h.face([h.P(a0 + 0.4 * k, -th + 0.4 * k, Ht + 0.55 * k), h.P(a1 - 0.4 * k, -th + 0.4 * k, Ht + 0.55 * k), h.P(a1 - 0.4 * k, th - 0.4 * k, Ht + 0.55 * k), h.P(a0 + 0.4 * k, th - 0.4 * k, Ht + 0.55 * k)], '#6f6f68', 'stone', 'leads', h.P((a0 + a1) / 2, 0, Ht));
      void inner;
      if (p.crown === 'parapet') {
        const merl = (aa, ll) => h.box(aa - 0.27 * k, aa + 0.27 * k, ll - 0.2 * k, ll + 0.2 * k, Ht + 0.55 * k, Ht + 1.05 * k, wall, wallTop, 'stone', 'merlon');
        const nm = Math.max(3, Math.round(tl / (1.15 * k)));
        for (let i = 0; i < nm; i++) { const aa = a0 + 0.25 * k + (tl - 0.5 * k) * (i + 0.5) / nm; merl(aa, th - 0.2 * k); merl(aa, -th + 0.2 * k); }
        for (let i = 1; i < nm - 1; i++) { const ll = -th + 0.25 * k + (2 * th - 0.5 * k) * (i + 0.5) / nm; if (h.depth(a0, ll, Ht) < 400) { merl(a0 + 0.2 * k, ll); merl(a1 - 0.2 * k, ll); } }
        // corner pinnacles: a shaft, a pyramid, a ball
        for (const sa of [0, 1]) for (const sl of [-1, 1]) {
          const aa = sa ? a1 - 0.3 * k : a0 + 0.3 * k, ll = sl * (th - 0.3 * k);
          h.box(aa - 0.28 * k, aa + 0.28 * k, ll - 0.28 * k, ll + 0.28 * k, Ht + 0.55 * k, Ht + 1.9 * k, wall, wallTop, 'stone', 'pinnacle');
          _wmdChSpike(h, aa, ll, Ht + 1.9 * k, Ht + 2.7 * k, 0.4 * k, trim, 'stone', 4);
          h.cyl(aa, ll, Ht + 2.65 * k, Ht + 2.85 * k, 0.1 * k, 0.07 * k, trim, { mat: 'stone', role: 'ball', n: 6 });
        }
        if (era === 'perpendicular') for (const ll of [0]) for (const aa of [a0 + tl / 2]) for (const sl of [-1, 1]) { const q = sl * (th - 0.3 * k); h.box(aa - 0.2 * k, aa + 0.2 * k, q - 0.2 * k, q + 0.2 * k, Ht + 0.55 * k, Ht + 1.5 * k, wall, wallTop, 'stone', 'pinnacle'); void ll; }
        // the stair turret, a square one at the north-east corner (or the south, by seed)
      } else {
        // a broach spire: an octagonal pyramid with a lucarne or two, a ball and the vane
        const sp = 8.5 * k;
        h.frustum(h.ngon((a0 + a1) / 2, 0, th * 0.98, 8, Math.PI / 8), Ht + 0.55 * k, h.ngon((a0 + a1) / 2, 0, 0.06 * k, 8, Math.PI / 8), Ht + 0.55 * k + sp, h.aged(liv.roof, 'stone', 0.5), { mat: rmat, role: 'spire', cap: false });
        h.cyl((a0 + a1) / 2, 0, Ht + 0.5 * k + sp, Ht + 0.5 * k + sp + 0.35 * k, 0.14 * k, 0.1 * k, trim, { mat: 'stone', role: 'ball', n: 6 });
      }
      // stair turret
      const tsl = h.u('turret') < 0.5 ? -1 : 1, tla = a1 - 0.35 * k, tll = tsl * (th + 0.25 * k), ty = Ht + 1.9 * k;
      h.box(tla - 0.65 * k, tla + 0.65 * k, tll - 0.65 * k, tll + 0.65 * k, 0, ty, wall, wallTop, 'stone', 'turret');
      _wmdChSpike(h, tla, tll, ty, ty + 1.5 * k, 0.95 * k, h.aged(liv.roof, 'stone', 0.5), rmat, 4);
      // corner buttresses (stepped) on the first two stages, pairs at each corner
      for (const ca of [0, 1]) for (const cl2 of [-1, 1]) {
        const ea = ca ? a1 : a0, el = cl2 * th, da = ca ? 1 : -1;
        h.box(Math.min(ea, ea + da * 0.62 * k), Math.max(ea, ea + da * 0.62 * k), Math.min(el - cl2 * 0.2 * k, el + cl2 * 0.5 * k) - 0.01, Math.max(el - cl2 * 0.2 * k, el + cl2 * 0.5 * k) + 0.01, 0, s1 + 0.1 * k, wall, wallTop, 'stone', 'buttress');
        h.box(Math.min(ea - da * 0.2 * k, ea + da * 0.5 * k) - 0.01, Math.max(ea - da * 0.2 * k, ea + da * 0.5 * k) + 0.01, Math.min(el, el + cl2 * 0.62 * k), Math.max(el, el + cl2 * 0.62 * k), 0, s1 + 0.1 * k, wall, wallTop, 'stone', 'buttress');
        h.box(Math.min(ea, ea + da * 0.4 * k) + (ca ? 0.1 : -0.1) * k * 0, Math.max(ea, ea + da * 0.4 * k), Math.min(el, el + cl2 * 0.4 * k), Math.max(el, el + cl2 * 0.4 * k), s1, s2 - 0.6 * k, wall, wallTop, 'stone', 'buttress');
      }
      // the weathercock on the south-east pinnacle (or the spire)
      {
        const va = p.crown === 'spire' ? (a0 + a1) / 2 : a1 - 0.3 * k, vl = p.crown === 'spire' ? 0 : -th + 0.3 * k, vy = p.crown === 'spire' ? Ht + 0.9 * k + 8.5 * k : Ht + 2.85 * k, sc = k;
        h.line([h.P(va, vl, vy), h.P(va, vl, vy + 1.25 * sc)], 0.04 * k, '#2b2b2a', 'metal', 'vane-rod');
        h.line([h.P(va - 0.5 * sc, vl, vy + 0.62 * sc), h.P(va + 0.5 * sc, vl, vy + 0.62 * sc)], 0.03 * k, '#2b2b2a', 'metal', 'vane-arm');
        h.face([h.P(va - 0.28 * sc, vl, vy + 1.0 * sc), h.P(va + 0.28 * sc, vl, vy + 1.0 * sc), h.P(va + 0.38 * sc, vl, vy + 1.16 * sc), h.P(va + 0.2 * sc, vl, vy + 1.3 * sc), h.P(va - 0.1 * sc, vl, vy + 1.2 * sc), h.P(va - 0.34 * sc, vl, vy + 1.38 * sc), h.P(va - 0.42 * sc, vl, vy + 1.14 * sc)], '#2b2b2a', 'metal', 'cockerel', 'two');
      }
    }

    /* ---------- the walls' decoration: coursing, mottle, quoins, windows, buttresses, doors ---------- */
    const decorWall = (W, name, u0, u1, v0, v1, skip, mott) => {
      const mid = [(u0 + u1) / 2, (v0 + v1) / 2];
      if (!W.sees(mid[0], mid[1])) return false;
      h.part(name, { layer: 3 });
      _wmdChMottle(h, W, p, rn, u0, u1, v0, v1, wall, mott == null ? Math.min(44, Math.round((u1 - u0) * (v1 - v0) / (5 * k * k))) : mott);
      _wmdChRect(h, W, u0, u1, v0, v0 + 0.5 * k, '#2c2a22', 'stone', 'damp', 0.008, { alpha: 0.18 });
      _wmdChCourses(h, W, p, rn, u0, u1, v0 + 0.4 * k, v1, stepC, mortar, skip);
      return true;
    };
    // an aisle or a bare nave wall on the side sg: bays between buttresses, windows in the bays
    const sideWall = (sg) => {
      const hasA = sg > 0 ? aS : aN, lw = sg * (hasA ? nh + aw : nh), top = hasA ? Ha : Hn, W = _wmdChWall(h, 'l', lw, sg);
      const nbays = bays, win = [];
      const rise0 = hasA ? 0.85 * k : 1.9 * k, winH = hasA ? 2.1 * k : Math.max(3.2 * k, top - 1.9 * k - rise0), ww = hasA ? 0.62 * k : 0.85 * k;
      const doorBay = sg > 0 && p.porch ? Math.round((bays - 1) * 0.62) : -1;
      const priest = sg > 0 && !p.porch ? 2 : -1;
      for (let i = 0; i < nbays; i++) if (i !== doorBay) win.push([Ns + bayW * (i + 0.5), ww]);
      const skip = win.map(([u, w]) => [u - w - 0.2 * k, u + w + 0.2 * k, rise0 - 0.2 * k, rise0 + winH + 0.2 * k]);
      if (doorBay >= 0) { const u = Ns + bayW * (doorBay + 0.5); skip.push([u - 2.4 * k, u + 2.4 * k, 0, 5.0 * k]); }
      const seen = decorWall(W, (sg > 0 ? 'S-' : 'N-') + 'wall', Ns, Ne, 0, top, skip);
      // buttresses on every bay line (drawn after the wall: they stand in front of it)
      h.part((sg > 0 ? 'S-' : 'N-') + 'buttress', { layer: 3 });
      for (let i = 0; i <= nbays; i++) { if (i === 0 || i === nbays) continue; if (doorBay >= 0 && (i === doorBay || i === doorBay + 1)) continue; _wmdChButtress(h, p, Ns + bayW * i, lw, sg, top - (hasA ? 0.5 * k : 1.3 * k), wall, wallTop); }
      // the wall's end buttresses (diagonal: a pair at the corner)
      if (seen) {
        h.part((sg > 0 ? 'S-' : 'N-') + 'win', { layer: 4 });
        for (const [u, w] of win) _wmdChWindow(h, W, p, rn, u, rise0, w, winH, era === 'norman' ? 'round' : 'pointed', era === 'norman' ? 1 : era === 'early-english' ? (hasA ? 1 : 2) : 3, trim, glass, era === 'perpendicular');
        if (priest >= 0) { /* no porch: a small priest's door in the chancel instead (below) */ }
        _wmdChQuoins(h, W, p, Ne, -1, 0.2 * k, top, quoin); if (!hasTower) _wmdChQuoins(h, W, p, Ns, 1, 0.2 * k, top, quoin);
      }
      return { W, lw, top };
    };
    const sS_ = sideWall(1);
    const sN_ = sideWall(-1);
    void sN_;

    // the clerestory over an aisle: a row of squat windows in the nave wall above the lean-to, on the sides that have an aisle
    for (const sg of [1, -1]) {
      if (!(sg > 0 ? aS : aN) || !p.clerestory) continue;
      const W = _wmdChWall(h, 'l', sg * nh, sg), yJ = Hn - 1.9 * k, v0 = yJ + 0.25 * k, vh = Hn - 0.35 * k - v0;
      if (!W.sees((Ns + Ne) / 2, Hn - 1 * k)) continue;
      h.part(sg > 0 ? 'S-clere' : 'N-clere', { layer: 4 });
      _wmdChMottle(h, W, p, rn, Ns, Ne, yJ, Hn, wall, 10);
      _wmdChCourses(h, W, p, rn, Ns, Ne, yJ, Hn, stepC, mortar, []);
      for (let i = 0; i < bays; i++) _wmdChWindow(h, W, p, rn, Ns + bayW * (i + 0.5), v0, 0.62 * k, vh, 'flat', 3, trim, glass, false);
      // a string course under the eaves
      h.line([W.fn(Ns, Hn - 0.05 * k, 0.04), W.fn(Ne, Hn - 0.05 * k, 0.04)], 0.14 * k, trim, 'stone', 'eaves');
    }

    // chancel walls: windows, a priest's door on the south, buttresses, the east window in its wall
    for (const sg of [1, -1]) {
      const W = _wmdChWall(h, 'l', sg * chh, sg);
      const nb = 2, bw = (A1 - Ne) / nb, wl = [], rise0 = 1.1 * k, wh = 2.8 * k;
      for (let i = 0; i < nb; i++) wl.push(Ne + bw * (i + 0.5));
      const dU = Ne + bw * 0.5 + (sg > 0 ? 0 : 0);
      const skip = wl.map(u => [u - 0.9 * k, u + 0.9 * k, rise0 - 0.2 * k, rise0 + wh + 0.2 * k]);
      if (!decorWall(W, (sg > 0 ? 'S' : 'N') + '-chancel', Ne, A1, 0, Hc, skip)) continue;
      h.part((sg > 0 ? 'S' : 'N') + '-chancel-b', { layer: 3 });
      for (let i = 0; i <= nb; i++) _wmdChButtress(h, p, i === 0 ? Ne + 0.5 * k : i === nb ? A1 - 0.5 * k : Ne + bw * i, sg * chh, sg, Hc - 0.7 * k, wall, wallTop);
      h.part((sg > 0 ? 'S' : 'N') + '-chancel-w', { layer: 4 });
      for (const u of wl) _wmdChWindow(h, W, p, rn, u, rise0, 0.6 * k, wh, era === 'norman' ? 'round' : 'pointed', era === 'perpendicular' ? 2 : 1, trim, glass, false);
      void dU;
    }
    // the east end: the nave's gable above the chancel roof and the chancel's gable with its great window
    {
      const W = _wmdChWall(h, 'a', A1, 1);
      if (W.sees(0, 3 * k)) {
        h.part('E-wall', { layer: 3 });
        _wmdChMottle(h, W, p, rn, -chh, chh, 0, Hc, wall, 8);
        _wmdChCourses(h, W, p, rn, -chh, chh, 0, Hc, stepC, mortar, [[-1.0 * k, 1.0 * k, 1.5 * k, 5.6 * k]]);
        h.part('E-win', { layer: 4 });
        _wmdChWindow(h, W, p, rn, 0, 1.5 * k, 1.0 * k, 4.2 * k, era === 'norman' ? 'round' : 'pointed', era === 'perpendicular' ? 4 : 3, trim, glass, era === 'perpendicular');
        _wmdChQuoins(h, W, p, -chh, 1, 0.2 * k, Hc, quoin); _wmdChQuoins(h, W, p, chh, -1, 0.2 * k, Hc, quoin);
      }
      const W2 = _wmdChWall(h, 'a', Ne, 1);
      if (W2.sees(0, Hn - 1 * k) && Hn > Hc) {
        h.part('E-nave', { layer: 3 });
        _wmdChCourses(h, W2, p, rn, -nh, nh, Hc + 0.7 * k, Hn, stepC, mortar, []);
        _wmdChMottle(h, W2, p, rn, -nh, nh, Hc, Hn, wall, 5);
      }
    }
    // the west end: the tower's west face, a door and a window
    if (hasTower) {
      const W = _wmdChWall(h, 'a', A0, -1);
      if (W.sees(0, 3 * k)) {
        h.part('W-wall', { layer: 3 });
        const s1 = 5.4 * k, s2 = 10.2 * k, s3 = Ht - 0.95 * k;
        const skip = [[-1.1 * k, 1.1 * k, 0, 3.4 * k], [-0.7 * k, 0.7 * k, 6.3 * k, 9.0 * k]];
        _wmdChMottle(h, W, p, rn, -th, th, 0, s3, wall, 26);
        _wmdChCourses(h, W, p, rn, -th, th, 0.3 * k, s3, stepC, mortar, skip);
        h.part('W-detail', { layer: 4 });
        _wmdChPoly(h, W, _wmdChArch(0, 0, 1.1 * k, 3.3 * k, era === 'norman' ? 'round' : 'pointed', 1.5 * k, 0.15 * k), trim, 'stone', 'doorcase', 0.012);
        _wmdChPoly(h, W, _wmdChArch(0, 0, 1.0 * k, 3.15 * k, era === 'norman' ? 'round' : 'pointed', 1.4 * k, 0), liv.door, 'timber', 'door', 0.018);
        for (const x of [-0.5, 0, 0.5]) h.line([W.fn(x * k, 0.05 * k, 0.026), W.fn(x * k, 2.7 * k, 0.026)], 0.03 * k, h.shade(liv.door, 0.7), 'timber', 'plank');
        _wmdChWindow(h, W, p, rn, 0, 6.3 * k, 0.7 * k, 2.7 * k, era === 'norman' ? 'round' : 'pointed', era === 'perpendicular' ? 3 : 2, trim, glass, era === 'perpendicular');
        void s1; void s2;
      }
    }
    // tower faces on the north and south: slit windows, a blank stage, the belfry's louvred openings
    if (hasTower) for (const sg of [1, -1]) {
      const W = _wmdChWall(h, 'l', sg * th, sg), s1 = 5.4 * k, s2 = 10.2 * k, s3 = Ht - 0.95 * k, a0 = A0, a1 = A0 + tl;
      if (!W.sees((a0 + a1) / 2, 4 * k)) continue;
      const skip = [[(a0 + a1) / 2 - 0.4 * k, (a0 + a1) / 2 + 0.4 * k, 2.8 * k, 4.6 * k], [(a0 + a1) / 2 - 0.35 * k, (a0 + a1) / 2 + 0.35 * k, 7.2 * k, 8.8 * k], [a0 + 0.55 * k, a1 - 0.55 * k, s2 + 1.0 * k, s3 - 0.6 * k]];
      h.part('T-' + (sg > 0 ? 'S' : 'N'), { layer: 3 });
      _wmdChMottle(h, W, p, rn, a0, a1, 0, s3, wall, 26);
      _wmdChCourses(h, W, p, rn, a0, a1, 0.3 * k, s3, stepC, mortar, skip);
      h.part('T-' + (sg > 0 ? 'S' : 'N') + 'd', { layer: 4 });
      const mid = (a0 + a1) / 2;
      _wmdChPoly(h, W, _wmdChArch(mid, 2.8 * k, 0.32 * k, 1.8 * k, 'pointed', 0.5 * k, 0.1 * k), trim, 'stone', 'surround', 0.011);
      _wmdChPoly(h, W, _wmdChArch(mid, 2.8 * k, 0.32 * k, 1.8 * k, 'pointed', 0.5 * k, 0), '#14171b', 'glass', 'slit', 0.016);
      _wmdChPoly(h, W, _wmdChArch(mid, 7.2 * k, 0.3 * k, 1.5 * k, 'pointed', 0.5 * k, 0.1 * k), trim, 'stone', 'surround', 0.011);
      _wmdChPoly(h, W, _wmdChArch(mid, 7.2 * k, 0.3 * k, 1.5 * k, 'pointed', 0.5 * k, 0), '#14171b', 'glass', 'slit', 0.016);
      // belfry: two louvred two-light openings with a hood
      for (const dx of [-0.85, 0.85]) {
        const u = mid + dx * k;
        _wmdChPoly(h, W, _wmdChArch(u, s2 + 1.0 * k, 0.55 * k, 2.9 * k, 'pointed', 1.0 * k, 0.15 * k), trim, 'stone', 'surround', 0.011);
        _wmdChPoly(h, W, _wmdChArch(u, s2 + 1.0 * k, 0.55 * k, 2.9 * k, 'pointed', 1.0 * k, 0), '#17140f', 'timber', 'louvre', 0.016);
        if (h.px(0.5 * k) >= 3) for (let y = s2 + 1.2 * k; y < s2 + 3.0 * k; y += 0.26 * k) h.line([W.fn(u - 0.5 * k, y, 0.02), W.fn(u + 0.5 * k, y, 0.02)], 0.05 * k, '#4a3a2c', 'timber', 'louvre-slat', { alpha: 0.9 });
        h.line([W.fn(u, s2 + 1.0 * k, 0.025), W.fn(u, s3 - 1.0 * k, 0.025)], 0.07 * k, trim, 'stone', 'mullion');
      }
      _wmdChQuoins(h, W, p, a0 - 0.0, 1, 0.2 * k, s1, quoin);
      _wmdChQuoins(h, W, p, a1, -1, 0.2 * k, s1, quoin);
    }
    // the tower's east face over the nave roof
    if (hasTower) {
      const W = _wmdChWall(h, 'a', A0 + tl, 1), s2 = 10.2 * k, s3 = Ht - 0.95 * k;
      if (W.sees(0, Rn + 1 * k)) {
        h.part('T-E', { layer: 3 });
        _wmdChMottle(h, W, p, rn, -th, th, Rn - 1 * k, s3, wall, 8);
        _wmdChCourses(h, W, p, rn, -th, th, Rn - 0.5 * k, s3, stepC, mortar, []);
      }
    }

    /* ---------- the roofs: stone slates in courses, a ridge cap, copings ---------- */
    h.part('roof-deco', { layer: 5 });
    const slate = (a0, a1, yE, yR, hw, sg, over, ridgeCap) => {
      const e = hw + over, slopeLen = Math.hypot(e, yR - yE), yo = yE - 0.15 * k;
      const at = (a, t) => h.P(a, sg * e * (1 - t), yo + (yR - yo) * t);
      _wmdChRoofDeco(h, p, rn, a0, a1, at, [0, sg * (yR - yE), e], [(a0 + a1) / 2, sg * e * 0.5, (yE + yR) / 2], liv, rmat, slopeLen);
      if (ridgeCap) { const vis = h.sees([0, sg, 0.2], [(a0 + a1) / 2, 0, yR]) || h.above(yR); void vis; }
    };
    for (const sg of [1, -1]) {
      slate(Ns - 0.2 * k, Ne + 0.25 * k, Hn, Rn, nh, sg, 0.3 * k);
      slate(Ne - 0.1 * k, A1 + 0.1 * k, Hc, Rc, chh, sg, 0.3 * k);
    }
    for (const sg of [1, -1]) if (sg > 0 ? aS : aN) {
      // a lean-to: from the eave (l = sg (nh + aw + 0.3)) up to the nave wall
      const yJ = Hn - 1.9 * k, lo = nh + aw + 0.3 * k, run = lo - nh, sl = Math.hypot(run, yJ - Ha);
      const at = (a, t) => h.P(a, sg * (lo - run * t), Ha - 0.18 * k + (yJ - Ha + 0.18 * k) * t);
      _wmdChRoofDeco(h, p, rn, Ns - 0.2 * k, Ne + 0.2 * k, at, [0, sg * (yJ - Ha), run], [(Ns + Ne) / 2, sg * (nh + aw / 2), (Ha + yJ) / 2], liv, rmat, sl);
    }
    // ridge caps: a pale stone along each ridge, and copings along the gable rakes
    for (const [a0, a1, y, rkind] of [[Ns - 0.2 * k, Ne + 0.25 * k, Rn, 'n'], [Ne - 0.1 * k, A1 + 0.1 * k, Rc, 'c']]) {
      h.line([h.P(a0, 0, y + 0.1 * k), h.P(a1, 0, y + 0.1 * k)], 0.34 * k, h.shade(liv.roofHi, 1.06), 'stone', 'ridge');
      void rkind;
    }
    // gable copings on the east gables (the pale edge of the stone slates over the gable)
    for (const [aE, yE, yR, hw] of [[A1 + 0.1 * k, Hc, Rc, chh + 0.3 * k], [Ne + 0.25 * k, Hn, Rn, nh + 0.3 * k]]) for (const sg of [-1, 1]) {
      if (!h.sees([1, 0, 0], [aE, 0, yR - 0.5 * k])) continue;
      h.line([h.P(aE, sg * hw, yE - 0.15 * k), h.P(aE, 0, yR + 0.08 * k)], 0.2 * k, trim, 'stone', 'coping');
    }
    // a ball finial on the east gables (never a cross)
    for (const [aE, yR] of [[A1 + 0.1 * k, Rc], [Ne + 0.25 * k, Rn]]) h.cyl(aE - 0.05 * k, 0, yR, yR + 0.38 * k, 0.13 * k, 0.09 * k, trim, { mat: 'stone', role: 'ball', n: 6 });

    /* ---------- the south porch ---------- */
    if (p.porch) {
      const pa = Ns + bayW * (Math.round((bays - 1) * 0.62) + 0.5), pw = 2.15 * k, l0 = sS, l1 = sS + 3.0 * k, pe = 3.7 * k, pr = 5.7 * k;
      h.part('porch', { layer: 5 });
      h.box(pa - pw, pa + pw, l0 - 0.2 * k, l1, 0, pe, wall, wallTop, 'stone', 'porch');
      h.gable(pa - pw - 0.1 * k, pa + pw + 0.1 * k, l0 - 0.2 * k, l1 + 0.3 * k, pe, pr, roof, { mat: rmat, ridge: 'l', over: 0.3 * k, end: wall, endMat: 'stone' });
      // the outer gable face's decoration: the doorway arch, hood, a niche above, quoins, courses
      const W = _wmdChWall(h, 'l', l1, 1);
      if (W.sees(pa, 2 * k)) {
        h.part('porch-front', { layer: 6 });
        const skip = [[pa - 1.1 * k, pa + 1.1 * k, 0, 3.4 * k]];
        _wmdChMottle(h, W, p, rn, pa - pw, pa + pw, 0, pe, wall, 5);
        _wmdChCourses(h, W, p, rn, pa - pw, pa + pw, 0.2 * k, pe + 1.3 * k, stepC, mortar, skip);
        _wmdChPoly(h, W, _wmdChArch(pa, 0, 1.12 * k, 3.1 * k, 'pointed', 1.5 * k, 0.2 * k), trim, 'stone', 'doorcase', 0.012);
        _wmdChPoly(h, W, _wmdChArch(pa, 0, 0.95 * k, 2.95 * k, 'pointed', 1.4 * k, 0), '#1c1812', 'timber', 'opening', 0.016);
        _wmdChPoly(h, W, _wmdChArch(pa, 0, 0.7 * k, 2.4 * k, 'pointed', 1.0 * k, 0), liv.door, 'timber', 'door', 0.02);
        if (h.px(0.4 * k) >= 3) h.line([W.fn(pa, 0.05 * k, 0.025), W.fn(pa, 2.3 * k, 0.025)], 0.03 * k, h.shade(liv.door, 0.7), 'timber', 'plank');
        // a small slit in the gable and a stepped base
        _wmdChPoly(h, W, _wmdChArch(pa, pe + 0.6 * k, 0.16 * k, 0.8 * k, 'pointed', 0.3 * k, 0), '#14171b', 'glass', 'slit', 0.016);
        _wmdChQuoins(h, W, p, pa - pw, 1, 0.2 * k, pe, quoin); _wmdChQuoins(h, W, p, pa + pw, -1, 0.2 * k, pe, quoin);
      }
      // the porch's side walls: a small window, courses
      for (const sa of [-1, 1]) {
        const Ws = _wmdChWall(h, 'a', pa + sa * pw, sa);
        if (!Ws.sees((l0 + l1) / 2, 2 * k)) continue;
        h.part('porch-side' + (sa > 0 ? 'E' : 'W'), { layer: 6 });
        _wmdChCourses(h, Ws, p, rn, l0, l1, 0.2 * k, pe, stepC, mortar, [[(l0 + l1) / 2 - 0.3 * k, (l0 + l1) / 2 + 0.3 * k, 1.5 * k, 2.8 * k]]);
        _wmdChPoly(h, Ws, _wmdChArch((l0 + l1) / 2, 1.5 * k, 0.28 * k, 1.3 * k, 'pointed', 0.45 * k, 0.1 * k), trim, 'stone', 'surround', 0.011);
        _wmdChPoly(h, Ws, _wmdChArch((l0 + l1) / 2, 1.5 * k, 0.28 * k, 1.3 * k, 'pointed', 0.45 * k, 0), glass, 'glass', 'window', 0.016, h.litFx(true));
      }
    } else if (aS === false) {
      /* no porch: a priest's door in the south chancel wall */
      const W = _wmdChWall(h, 'l', chh, 1);
      if (W.sees(Ne + 2 * k, 1.5 * k)) {
        h.part('priest-door', { layer: 5 });
        const u = A1 - (A1 - Ne) * 0.18 - 0.3 * k;
        _wmdChPoly(h, W, _wmdChArch(u, 0, 0.55 * k, 2.1 * k, 'pointed', 0.8 * k, 0.12 * k), trim, 'stone', 'doorcase', 0.02);
        _wmdChPoly(h, W, _wmdChArch(u, 0, 0.45 * k, 2.0 * k, 'pointed', 0.7 * k, 0), liv.door, 'timber', 'door', 0.024);
      }
    }
    return { height: Ht + 4.2 * k };
  },
});

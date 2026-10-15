/* ============================================================
   SCENE ENGINE v2: CIVIC BUILDINGS for the procedural building generator (70-scene-gen-0building.js; docs/dev/SCENE_ENGINE_V2.md 19;
   docs/dev/WORLD_ENGINE.md 14.2). PURE: functions only, nothing runs at load. Private names: _scbc. Loaded after the generator and before
   the styles, so a style's data can name these functions (a style's `front`, `side` and `crowns`).

   What a grand civic building (a town hall, a cathedral-like dome, a clock tower, a station, a waterfront office) needs that a row
   house never does, in ONE place and for every style:
     CROWNS      a building's `crown` (a key of its style's `crowns`) is a list of STACKS standing on its roof: towers and domes built
                 from stages bottom to top: a plain or clocked SHAFT, a CORNICE slab, a louvred BELFRY, a window DRUM or open colonnaded
                 cupola, a DOME (a surface of revolution: hemisphere, ogee or saucer, lit through a few quantised rings, with ribs), a
                 LANTERN, a SPIRE or PYRAMID, and a FINIAL (a generic bird, an urn, a ball or a spike; never a flag, a religious symbol,
                 a name or a number). Every solid goes through the same view as the walls, so both the projected and the elevation
                 mode draw it, and every solid is a few merged shapes (a dome is a base, up to six tone rings and its ribs).
     FACADES     `_scbcFacade`, a style's front and side layout: a rusticated base with arched openings, a GIANT ORDER of engaged columns
                 or pilasters over the middle storeys, an entablature with a deep cornice and modillions, an attic storey, a balustraded
                 parapet with urns, string courses between tiers of a tall block, an optional central pediment (a `tympanum` block)
     ELEMENTS    rustic, order, entab, balus, clock, louvre, cquoins, flood: the extra element kinds `_scbgDrawElem` hands on to `_scbcElem`
   Detail follows the size on screen (tiers 0 to 3, as the walls do): the same shapes at every distance, fewer of them far away, never
   more than the generator's shape budget (SCENE_GEN_MAX_SHAPES) allows because the generator steps the tier down until it fits.

   Hooks in 70-scene-gen-0building.js (each a line or two): sceneBuildingResolve copies b.crown; _scbgModel calls _scbcModel; _scbgBuild
   draws the crowns (_scbcDrawCrowns); _scbgDrawElem and _scbgBlock hand unknown kinds to _scbcElem and _scbcBlock; _scbgTierAt reads e.hm.
   ============================================================ */

const _SCBC_LIGHT = Object.freeze([-0.4, 0.62, -0.67]);   // the generator's soft sky light (upper left, toward the camera)
const _scbcTau = Math.PI * 2;
const _scbcQ = (v, n) => Math.round(v * n) / n;

/* ---------- tone: the quantised light of a curved surface ---------- */
/** The colour of a surface of base colour `col` at light level q (-6 .. 6, the normal against the sky light in sixths). */
function _scbcTone(col, q, kLight, kDark) {
  if (!q) return col;
  return q > 0 ? _scbgMix(col, '#fff6e2', (kLight == null ? 0.2 : kLight) * q / 6) : _scbgMix(col, '#12161c', (kDark == null ? 0.42 : kDark) * -q / 6);
}
const _scbcLevel = (n) => Math.max(-6, Math.min(6, Math.round(_scbgDot(n, _SCBC_LIGHT) * 6.4)));

/* ---------- surfaces of revolution ---------- */
/**
 * The visible quads of a surface of revolution about the vertical axis through c = [x, d]. prof: [[r, z], ...] bottom to top (z in
 * metres above the ground); seg: sides round; rot: the angle of the first side. -> [{ p: [4 points [x, h, d]], n, mid }]
 */
function _scbcRevQuads(c, prof, seg, rot, view) {
  const out = [];
  for (let j = 0; j + 1 < prof.length; j++) {
    const [r0, z0] = prof[j], [r1, z1] = prof[j + 1], dr = r1 - r0, dz = z1 - z0, L = Math.hypot(dr, dz) || 1, nr = dz / L, nz = -dr / L;
    for (let i = 0; i < seg; i++) {
      const a0 = rot + _scbcTau * i / seg, a1 = rot + _scbcTau * (i + 1) / seg, am = (a0 + a1) / 2, at = (r, z, a) => [c[0] + r * Math.cos(a), z, c[1] + r * Math.sin(a)];
      const p = [at(r0, z0, a0), at(r0, z0, a1), at(r1, z1, a1), at(r1, z1, a0)], n = [nr * Math.cos(am), nz, nr * Math.sin(am)];
      const mid = [(p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2, (p[0][2] + p[2][2]) / 2];
      if (!view.sees(n, mid)) continue;
      out.push({ p, n, mid, j, i });
    }
  }
  return out;
}
/** A 3D polygon as a screen path (clipped at the near plane), '' when nothing is left. */
function _scbcPoly(view, p3) {
  const cl = _scbgClipNear(p3, view.near);
  return cl ? _scbgPath(cl.map(view.P)) : '';
}
/**
 * Draw a surface of revolution: one base shape (every visible quad in the mid tone: no seams), a tone ring for each other light level
 * (merged), the ribs and, for a drum, the openings. op: { c, prof, seg, rot, col, part, ribs, rib, open: { n, w, z0, z1, col, glow, theta }, cols: { n, w, col },
 * dark: kDark, light: kLight }.
 */
function _scbcDrawRev(op, ctx) {
  const { view, sink } = ctx, quads = _scbcRevQuads(op.c, op.prof, op.seg, op.rot || 0, view);
  if (!quads.length) return;
  const part = op.part || 'body', base = [], rings = new Map();
  for (const q of quads) {
    const d = _scbcPoly(view, q.p); if (!d) continue;
    base.push(d);
    const lv = _scbcLevel(q.n);
    if (lv) { if (!rings.has(lv)) rings.set(lv, []); rings.get(lv).push(d); }
  }
  sink.begin();
  const col = _scbgSeasonal(op.col, ctx.season);
  sink.add(1, { f: col, d: base.join(''), op: 1, part });
  for (const lv of [...rings.keys()].sort((a, b) => a - b)) sink.add(2, { f: _scbcTone(col, lv, op.light, op.dark), d: rings.get(lv).join(''), op: 1, part });
  // ribs: thin quads up the meridians, slightly proud of the surface
  if (op.ribs && ctx.T >= 2) {
    const segs = [], per = op.seg / op.ribs;
    for (const q of quads) {
      if (Math.abs((q.i % per) - 0) > 1e-6 && !(per < 1)) continue;
      const r0 = op.prof[q.j][0], r1 = op.prof[q.j + 1][0], am = (q.i + 0.5) / op.seg * _scbcTau + (op.rot || 0), k = 1.012, hw = (op.rib || 0.14) / 2;
      const pt = (r, z, da) => [op.c[0] + r * k * Math.cos(am + da), z, op.c[1] + r * k * Math.sin(am + da)];
      const z0 = op.prof[q.j][1], z1 = op.prof[q.j + 1][1], w0 = r0 > 0.01 ? hw / r0 : 0, w1 = r1 > 0.01 ? hw / r1 : 0;
      const d = _scbcPoly(view, [pt(r0, z0, -w0), pt(r0, z0, w0), pt(r1, z1, w1), pt(r1, z1, -w1)]); if (d) segs.push(d);
    }
    if (segs.length) sink.add(3, { f: _scbcTone(col, 1, 0.5), d: segs.join(''), op: 0.9, part, detail: true });
  }
  // a drum's windows (dark glass in every k-th side, lit at night) and its colonnade (pilasters between them)
  if (op.open && ctx.T >= 1) {
    const o = op.open, step = Math.max(1, Math.round(op.seg / o.n)), segs = [], posts = [], sh = [];
    for (const q of quads) {
      if (q.j !== (o.row || 0) || q.i % step !== 0) continue;
      const a0 = op.rot + _scbcTau * q.i / op.seg, a1 = op.rot + _scbcTau * (q.i + 1) / op.seg, r = op.prof[q.j][0], z0 = o.z0, z1 = o.z1, k = 1.006, f = o.w || 0.62, am = (a0 + a1) / 2, da = (a1 - a0) * f / 2;
      const pt = (z, a) => [op.c[0] + r * k * Math.cos(a), z, op.c[1] + r * k * Math.sin(a)];
      const d = _scbcPoly(view, o.head === 'round' ? [pt(z0, am - da), pt(z0, am + da), pt(z1 - 0.5, am + da), pt(z1, am), pt(z1 - 0.5, am - da)] : [pt(z0, am - da), pt(z0, am + da), pt(z1, am + da), pt(z1, am - da)]); if (d) segs.push(d);
      if (ctx.T >= 2 && o.post) { const d2 = _scbcPoly(view, [pt(o.z0 - 0.1, a1 - 0.5 * (a1 - a0) * (1 - f) * 0.9 - 0.02), pt(o.z0 - 0.1, a1 + 0.5 * (a1 - a0) * (1 - f) * 0.9 + 0.02), pt(z1 + 0.15, a1 + 0.5 * (a1 - a0) * (1 - f) * 0.9 + 0.02), pt(z1 + 0.15, a1 - 0.5 * (a1 - a0) * (1 - f) * 0.9 - 0.02)]); if (d2) posts.push(d2); }
    }
    void sh;
    if (posts.length) sink.add(3, { f: _scbcTone(col, 2, 0.5), d: posts.join(''), op: 1, part });
    if (segs.length) sink.add(4, { f: o.col || '#2f3a46', d: segs.join(''), op: 1, part: 'body', glow: o.glow || 'window', theta: o.theta == null ? 0.3125 : o.theta });
  }
  sink.flush();
}

/* ---------- silhouettes: the generic bird, urn, ball and spike finials ---------- */
// unit outlines [x, y] facing right, 0..1 wide, 0..1 tall (y up)
const _SCBC_SIL = Object.freeze({
  // a cormorant on a plinth, wings half raised, neck curved, beak down and forward (a generic bird: no name, no emblem)
  bird: [[0.4, 0], [0.42, 0.14], [0.28, 0.2], [0.08, 0.1], [0.24, 0.3], [0.2, 0.46], [0.1, 0.66], [0.04, 0.9], [0.16, 0.98], [0.3, 0.8], [0.4, 0.62], [0.47, 0.56], [0.5, 0.7], [0.55, 0.82], [0.62, 0.92], [0.72, 0.96], [0.86, 0.9], [0.95, 0.8], [0.82, 0.84], [0.72, 0.81], [0.64, 0.74], [0.62, 0.62], [0.66, 0.46], [0.68, 0.3], [0.6, 0.16], [0.62, 0]],
  urn: [[0.34, 0], [0.34, 0.1], [0.2, 0.18], [0.1, 0.38], [0.18, 0.56], [0.34, 0.66], [0.36, 0.78], [0.3, 0.84], [0.4, 0.9], [0.5, 1.0], [0.6, 0.9], [0.7, 0.84], [0.64, 0.78], [0.66, 0.66], [0.82, 0.56], [0.9, 0.38], [0.8, 0.18], [0.66, 0.1], [0.66, 0]],
  ball: [[0.4, 0], [0.4, 0.28], [0.22, 0.4], [0.16, 0.6], [0.26, 0.82], [0.5, 0.94], [0.74, 0.82], [0.84, 0.6], [0.78, 0.4], [0.6, 0.28], [0.6, 0]],
  spike: [[0.42, 0], [0.46, 0.7], [0.5, 1], [0.54, 0.7], [0.58, 0]],
});
/** A billboard silhouette at world point `at` ([x, h, d]): height `size` metres, turned to the eye, facing right when dir > 0. -> path or '' */
function _scbcSilPath(view, kind, at, size, dir) {
  const U = _SCBC_SIL[kind]; if (!U) return '';
  let r = [1, 0, 0];
  if (!view.ortho) { const w = [at[0], at[1] - view.eye, at[2]], l = Math.hypot(w[0], w[2]) || 1; r = [w[2] / l, 0, -w[0] / l]; }
  const ar = kind === 'bird' ? 1.05 : kind === 'urn' ? 0.8 : 0.6, pts = [];
  for (const [x, y] of U) { const xx = ((dir > 0 ? x : 1 - x) - 0.5) * size * ar; pts.push([at[0] + r[0] * xx, at[1] + y * size, at[2] + r[2] * xx]); }
  return _scbcPoly(view, pts);
}

/* ---------- stacks: towers and domes, built stage by stage ---------- */
const _scbcCol = (sp, k, dflt) => (sp.style.civic && sp.style.civic[k]) || dflt;
/** The profile of a dome of base radius r and rise h: [[r, z], ...] from the springing to the crown (z from 0). */
function _scbcDomeProfile(kind, r, h, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * Math.PI / 2;
    if (kind === 'ogee') {   // an onion: the belly is wider than the drum, the top draws in to a point
      const belly = 1 + 0.12 * Math.sin(Math.min(1, t * 1.6) * Math.PI);
      out.push([Math.max(0, r * belly * (1 - Math.pow(t, 2.4) * 0.97)) * (i === n ? 0 : 1), h * Math.pow(Math.sin(a), 0.9)]);
    } else if (kind === 'saucer') out.push([r * Math.cos(a), h * Math.sin(a)]);
    else out.push([r * Math.pow(Math.cos(a), 1.02), h * Math.sin(a)]);   // a hemisphere (an ellipse when h < r)
  }
  out[n][0] = 0;
  return out;
}
/**
 * The draw ops of one stack: { ops: [{ t: 'faces' | 'rev' | 'sil', ... }], top } in bottom-to-top order. spec: { at: [s, t] (metres along
 * the front edge and in from it), w, d (the base plan), z0, stages: [...] }. M: { P(s, t) -> [x, d], u: [ux, ud], n: [nx, nd] }.
 */
function _scbcStack(sp, spec, M, season) {
  const st = sp.style, ops = [], c = M.P(spec.at[0], spec.at[1]), ux = M.u, nx = M.n;
  const stone = spec.col || sp.wall, dress = sp.dress, copper = _scbcCol(sp, 'copper', '#6c9a86'), copperD = _scbgDark(copper, 0.3), gold = '#c9a24a';
  let z = spec.z0, hw = spec.w / 2, hd = spec.d / 2, edge = 0;
  const foot = (a, b) => [[-a, -b], [a, -b], [a, b], [-a, b]].map(([s, t]) => [c[0] + ux[0] * s + nx[0] * t, c[1] + ux[1] * s + nx[1] * t]);
  const roleOf = (f) => { const k = f.plane.N[0] * nx[0] + f.plane.N[2] * nx[1]; return k > 0.9 ? 'front' : k < -0.9 ? 'back' : 'side'; };
  const faces = (fp, z0, z1, col, elemsOf, top) => {
    const fs = _scbgBlockFaces(fp, z0, z1, col, top === false ? null : _scbgLight(col, 0.1), 'wall');
    for (const f of fs) { f.role = f.plane ? 'tower' : f.role; if (f.plane) { f.edge = 100 + (spec.id || 0) * 8 + edge++; f.elems = elemsOf(f, roleOf(f)); } }
    ops.push({ t: 'faces', faces: fs });
  };
  let id = 0;
  for (const S of spec.stages || []) {
    const h = S.h || 0;
    if (S.k === 'shaft' || S.k === 'belfry') {
      if (S.inset) { hw -= S.inset; hd -= S.inset; }
      const w = hw * 2, z0 = z, z1 = z + h;
      faces(foot(hw, hd), z0, z1, S.col || stone, (f, role) => {
        const L = f.plane.len, el = [{ k: 'tex', s0: 0, s1: L, z0, z1 }, { k: 'band', s0: 0, s1: L, z0, z1: z0 + 0.5, col: _scbgDark(f.col, 0.1), layer: 2, o: 0.1 }];
        if (S.k === 'belfry') {
          const nb = S.bays || 3, bw = (L - 1.8) / nb;
          for (let i = 0; i < nb; i++) el.push({ k: 'louvre', s: 0.9 + bw * (i + 0.15), w: bw * 0.7, z: z0 + 0.9, h: h - 2.1, head: 'round', hm: 3.2 });
          el.push({ k: 'cquoins', len: L, z0, z1, w: 0.7 });
        } else {
          el.push({ k: 'cquoins', len: L, z0, z1, w: Math.min(1.0, L * 0.06) });
          const rows = S.rows || [], ww = Math.min(1.8, L * 0.16);
          for (const rz of rows) for (const cs of S.cols || [0.3, 0.7]) el.push({ k: 'win', s: L * cs - ww / 2, z: z0 + h * rz, w: ww, h: Math.min(3.4, h * 0.14), type: 'sash', panes: [2, 3], head: 'round', recess: 0.14, storey: 0, hm: 4.4, surround: true });
          if (S.clock) el.push({ k: 'clock', s: L / 2, z: z0 + h * (S.clock.at == null ? 0.66 : S.clock.at), r: S.clock.r, hm: 4.4 });
        }
        if (S.flood !== false) el.push({ k: 'flood', s0: 0, s1: L, z0, z1 });
        return el;
      });
      z = z1;
    } else if (S.k === 'cornice') {
      const o = S.out || 0.6, a = hw + o, b = hd + o;
      faces(foot(a, b), z, z + h, _scbgLight(dress, 0.04), (f) => [{ k: 'band', s0: 0, s1: f.plane.len, z0: z, z1: z + h * 0.4, col: _scbgDark(dress, 0.34), layer: 2, o: 0.02 }, { k: 'band', s0: 0, s1: f.plane.len, z0: z + h * 0.78, z1: z + h, col: _scbgLight(dress, 0.12), layer: 2, o: 0.04 }]);
      hw = Math.max(hw, hw); z += h;
    } else if (S.k === 'pyramid' || S.k === 'spire') {
      const r = (S.k === 'spire' ? (S.r || Math.min(hw, hd) * 0.9) : Math.hypot(hw, hd)) , seg = S.k === 'spire' ? (S.seg || 8) : 4;
      ops.push({ t: 'rev', c, prof: [[r, z], [r * 0.55, z + h * 0.45], [S.k === 'spire' ? 0 : 0, z + h]], seg, rot: S.k === 'pyramid' ? Math.atan2(ux[1], ux[0]) + Math.PI / 4 : Math.PI / seg, col: S.col || copper, part: 'roof', ribs: 0 });
      z += h;
    } else if (S.k === 'drum' || S.k === 'cupola') {
      const r = S.r || Math.min(hw, hd) * 0.92, seg = S.seg || 24, open = S.k === 'cupola';
      const dz = z;
      // a cornice ring under the drum (a little wider), then the drum: stone with windows, or an open colonnade over dark
      ops.push({ t: 'rev', c, prof: [[r * 1.12, z], [r * 1.12, z + 0.5], [r * 1.04, z + 0.5]], seg, rot: Math.PI / seg, col: _scbgLight(dress, 0.06), part: 'body', light: 0.12, dark: 0.35 });
      z += 0.5;
      ops.push({ t: 'rev', c, prof: [[r, z], [r, z + h - 0.5]], seg, rot: Math.PI / seg, col: open ? '#3a4452' : stone, part: 'body',
        open: open ? { n: S.cols || 8, w: 0.22, z0: z + 0.25, z1: z + h - 0.9, col: _scbgLight(dress, 0.1), glow: null, row: 0, post: false } : { n: S.wins || 8, w: 0.56, z0: z + h * 0.16, z1: z + h * 0.84 - 0.5, head: 'round', post: true, glow: 'window' } });
      if (open) ops.push({ t: 'rev', c, prof: [[r, z], [r, z + h - 0.5]], seg, rot: Math.PI / seg, col: _scbgLight(dress, 0.06), part: 'body', open: { n: S.cols || 8, w: 0.7, z0: z + 0.25, z1: z + h - 0.7, col: '#4a5360', glow: null, post: false } });
      z = dz + h; hw = hd = r; edge++;
      ops.push({ t: 'rev', c, prof: [[r * 1.1, z - 0.5], [r * 1.1, z], [r * 1.02, z]], seg, rot: Math.PI / seg, col: _scbgLight(dress, 0.08), part: 'body', light: 0.12, dark: 0.35 });
    } else if (S.k === 'dome') {
      const r = S.r || Math.min(hw, hd), dr = _scbcDomeProfile(S.shape || 'hemi', r, h, S.rings || 10).map(([rr, zz]) => [rr, z + zz]);
      ops.push({ t: 'rev', c, prof: dr, seg: S.seg || 28, rot: 0, col: S.col || copper, part: 'roof', ribs: S.ribs || 0, rib: S.rib, light: 0.22, dark: 0.5 });
      z += h; hw = hd = 0.2;
    } else if (S.k === 'lantern') {
      const r = S.r || 1.0;
      ops.push({ t: 'rev', c, prof: [[r, z], [r, z + h]], seg: 12, rot: 0.26, col: _scbgLight(dress, 0.04), part: 'body', open: { n: 6, w: 0.5, z0: z + h * 0.2, z1: z + h * 0.8, col: '#2f3a46', glow: 'window', post: false } },
        { t: 'rev', c, prof: [[r * 1.25, z + h], [r * 0.9, z + h + 0.4], [0.12, z + h + h * 0.9]], seg: 12, rot: 0.26, col: copperD, part: 'roof' });
      z += h + h * 0.9;
    } else if (S.k === 'finial') {
      const kind = S.kind || 'ball', size = h || 2;
      ops.push({ t: 'sil', kind, at: [c[0], z, c[1]], size, dir: S.dir || 1, col: S.col || (kind === 'bird' ? copperD : gold) });
      z += size;
    }
    id++;
  }
  return { ops, top: z, c };
}

/* ---------- crowns: the stacks of a building ---------- */
/**
 * The crowns of a building (called by _scbgModel): sp.crown names a preset of the style's `crowns` ({ name: (K) => [stack spec] }); K gives
 * the plan (W, Dp, E: the top of the walls, E0: the eave, P(s, t), P3, u, n, sp). Sets model.crowns = [{ ops, c }] and raises model.H.
 */
function _scbcModel(b, sp, foot, model) {
  const st = sp.style;
  if (!sp.crown || !st.crowns || typeof st.crowns[sp.crown] !== 'function' || !model.quad) return;
  const a = foot[0], c = foot[1], W = model.W, Dp = model.Dp, u = [(c[0] - a[0]) / W, (c[1] - a[1]) / W], n = [u[1], -u[0]];
  const M = { u, n, P: (s, t) => [a[0] + u[0] * s - n[0] * t, a[1] + u[1] * s - n[1] * t] };
  const specs = st.crowns[sp.crown]({ W, Dp, E: model.E, E0: model.E0, sp, st, rnd: sp.rnd }) || [];
  const crowns = [];
  specs.forEach((spec, k) => { spec.id = k; const s = _scbcStack(sp, Object.assign({ z0: model.E }, spec), M); s.behind = spec.behind !== false; crowns.push(s); model.H = Math.max(model.H, s.top); });
  model.crowns = crowns;
}
/** Draw the crowns of a model: those standing inside the footprint (behind the visible walls) before the walls, the others after. */
function _scbcDrawCrowns(model, ctx, behind) {
  const view = ctx.view, list = (model.crowns || []).filter(s => !!s.behind === !!behind);
  if (!list.length) return;
  // far to near
  const dist = (s) => view.ortho ? 0 : Math.hypot(s.c[0], s.c[1]);
  list.sort((p, q) => dist(q) - dist(p));
  for (const s of list) {
    const c3 = [s.c[0], s.top * 0.5, s.c[1]], T0 = view.ortho ? 3 : Math.min(ctx.tierCap, sceneBuildingTier(view.px(4.4, c3)));
    const cx = Object.assign({}, ctx, { T: T0 });
    for (const op of s.ops) {
      if (op.t === 'faces') for (const f of op.faces) { if (f.flat || view.sees(f.n, f.poly[0])) _scbgDrawFace(f, ctx); }
      else if (op.t === 'rev') _scbcDrawRev(op, cx);
      else if (op.t === 'sil') {
        const d = _scbcSilPath(view, op.kind, op.at, op.size, op.dir);
        if (d) { ctx.sink.begin(); ctx.sink.add(5, { f: op.col, d, op: 1, part: op.kind === 'bird' ? 'roof' : 'body' }); ctx.sink.flush(); }
      }
    }
  }
}

/* ============================================================
   SCENE ENGINE v2: the timber-framed building machinery (docs/dev/WORLD_ENGINE.md 14.2; docs/dev/SCENE_LESSONS.md L). PURE. Private
   names: _sctf. Functions and consts only, nothing expensive at load. The STYLE (data) is 70-scene-gen-style-timber-framed.js.

   What a medieval street needs that a brick terrace does not, built ONCE for any town (York, Chester, Lavenham, Stratford ...):
     JETTIES      each storey may overhang the one below by a few tens of cm. The model is a STACK of storeys: every storey has its own
                  front wall on a plane shifted lane-ward by its offset (sp.tf.jet[i]), its own side walls from the shifted corner, and
                  the underside of each overhang (the soffit) is a face seen from below. Roof, gable and chimneys come from the
                  generator's own model, built on the footprint of the TOP storey. Both views (projected and elevation) go through the
                  same faces: in elevation the soffit is edge-on, so the overhang reads by its bressummer and the shadow it throws on
                  the storey below (a band under the beam), in the projected view by the soffit, the bressummer and the brackets.
     FRAMES       close studding, box frame and square panels: posts, plates, rails, studs and braces in dark oak laid out in metres on
                  each storey's wall plane around the openings; plaster infill. The stud pitch follows the projected screen spacing
                  (a wall seen at a grazing angle never turns into a dark smear).
     OPENINGS     leaded casements (single, or ribbons of several lights), a gable window, a plank door, a SHOPFRONT (display window,
                  stall riser, fascia board, door).
     FITTINGS     a stall-board shelf with wares, a striped awning, a hanging sign on an iron bracket (a painted board with a plain
                  motif: never lettering, a brand, a flag, a religious symbol or a house number), an iron lantern, a hanging basket
                  with the season's flowers. Every fitting hangs from a wall: nothing floats.
   Registered through the generator's extension points: _scbgElemKinds (tframe), _scbgBlockKinds (stall, awning, sign, lantern, basket).
   ============================================================ */
const _SCTF_OAK = Object.freeze(['#2b2017', '#33261b', '#3d2e20', '#241c14', '#4a3826', '#3a2a1c']);
const _SCTF_PLASTER = Object.freeze(['#e8e1cd', '#e2d7b8', '#dccfae', '#d8bf8c', '#d9baa4', '#cfd2bc', '#ece6d6', '#e6d2a8']);
const _SCTF_PAINT = Object.freeze(['#1f3a34', '#5a1f24', '#1d2a44', '#2a2a2a', '#3a2a1e', '#4a5a2a', '#6a2a3a', '#7a5a22']);
const _SCTF_WARES = Object.freeze({ butcher: ['#b5443c', '#e0b8a0', '#8c2f2a', '#d8c8a8'], bakery: ['#c28a4a', '#e0b878', '#a86a34', '#f0d8a0'], greengrocer: ['#5f8a3a', '#d8702a', '#c8382a', '#e0c84a'],
  florist: ['#d23a4a', '#e86aa0', '#f0f0f0', '#7a4ab8'], deli: ['#c8a050', '#8c5a34', '#e0d0a0', '#a84a3a'], cheese: ['#e8c860', '#d8b048', '#f0e0a0'], gift: ['#4a7aa8', '#d8a838', '#b8486a', '#58a088'],
  antiques: ['#8a6a3a', '#b8a888', '#5a6a7a'], books: ['#7a3a3a', '#3a5a7a', '#5a7a4a', '#a88a4a'], tea: ['#d8c8a8', '#a86a4a', '#7a8a6a'] });
const _SCTF_SEASON_FLOWERS = Object.freeze({ spring: ['#f2d24a', '#b58ad9', '#f0f0f0'], summer: ['#d23a4a', '#e86aa0', '#f4f0f0', '#8a4ab8'], autumn: ['#c9702a', '#a8442a', '#d8a030'], winter: [] });
const _SCTF_SEASON_LEAF = Object.freeze({ spring: '#5f8a3a', summer: '#3f6a2c', autumn: '#6a6a30', winter: '#4a4a38' });
// the nearest depth (metres) a fitting may hang at in a perspective view: what hangs from a wall never fills more than about a seventh of the frame at the lens (the engine's prop rule, SCENE_LESSONS K, for fittings)
const _SCTF_NEAR = Object.freeze({ stall: 9, awning: 9, sign: 6, lantern: 6, basket: 8, bracket: 4.5, oriel: 5, hooks: 2.6 });
const _sctfRnd = (sp, tag) => sceneRnd(sceneHash('tf|' + sp.seed + '|' + tag));
const _sctfPick = (r, a) => a[Math.floor(r() * a.length) % a.length];

/* ---------- the seeded choices of one timber house (the style's resolve hook) ---------- */
/**
 * sp.tf: { timber, plaster, pattern, jet: [offset per storey, metres lane-ward of the ground wall], sign, lantern, basket, awning, stall, ... }.
 * Storey heights vary house to house (the ground floor tall, the attic low) so floor lines never line up with a neighbour's: SCENE_LESSONS L.
 */
function _sctfResolve(sp, b) {
  const st = sp.style, r = _sctfRnd(sp, 'resolve'), nS = sp.storeys, T = st.timber || {};
  const tf = { timber: _sctfPick(r, T.oak || _SCTF_OAK), plaster: _sctfPick(r, T.plaster || _SCTF_PLASTER), pattern: _sctfPick(r, ['close', 'close', 'box', 'box', 'square']) };
  const hs = [];
  for (let i = 0; i < nS; i++) hs.push(i === 0 ? 2.65 + r() * 0.55 : (i === nS - 1 && nS >= 3 && r() < 0.4) ? 1.9 + r() * 0.35 : 2.25 + r() * 0.5);
  sp.hs = hs; sp.zs = [0]; for (const h of hs) sp.zs.push(sp.zs[sp.zs.length - 1] + h);
  // jetties: most houses overhang from the first floor up, by 25-60 cm, then a little more above; a few are flush (rebuilt fronts)
  const flush = r() < (T.flush == null ? 0.12 : T.flush), j1 = 0.28 + r() * 0.34, j2 = r() < 0.6 ? 0.2 + r() * 0.25 : 0, j3 = r() < 0.4 ? 0.12 + r() * 0.15 : 0;
  // LEAN: no hand-built frame is plumb. A storey below the top leans out (now and then in) by up to about 3 degrees (a slope of m per m), the
  // ground floor and the top storey stay true (the shopfront is cut to the door, the top storey carries the roof). The jetty of the next storey
  // starts from where the one below ended up, so an overhang is never negative (SCENE_LESSONS L)
  const lean = [0]; for (let i = 1; i < nS; i++) lean.push(flush || i === nS - 1 ? 0 : (r() - 0.22) * 0.07);
  tf.jet = [0]; tf.top = [0 + lean[0] * hs[0]];
  for (let i = 1; i < nS; i++) {
    const base = flush ? tf.top[i - 1] : tf.top[i - 1] + (i === 1 ? j1 : i === 2 ? j2 : j3);
    tf.jet.push(base); tf.top.push(base + lean[i] * hs[i]);
  }
  if (Array.isArray(b && b.jetty)) { tf.jet = [0].concat(b.jetty.slice(0, nS - 1).map(Number).map(v => Math.max(0, Math.min(1.2, v || 0)))).slice(0, nS); lean.fill(0); tf.top = tf.jet.slice(); }
  while (tf.jet.length < nS) { tf.jet.push(tf.jet[tf.jet.length - 1]); tf.top.push(tf.top[tf.top.length - 1]); }
  tf.lean = lean;
  tf.sign = sp.shop ? r() < 0.7 : r() < 0.1;
  tf.lantern = r() < 0.4; tf.basket = r() < 0.45; tf.awning = !!sp.shop && r() < 0.65; tf.stall = !!sp.shop && r() < 0.8;
  tf.fascia = _sctfPick(r, T.paint || _SCTF_PAINT); tf.board = _sctfPick(r, T.paint || _SCTF_PAINT); tf.motif = _sctfPick(r, ['disc', 'stripes', 'chevron', 'diamond', 'bar']);
  tf.awnCols = [_sctfPick(r, ['#8a2a2a', '#2a5a4a', '#2a3a6a', '#6a5a2a', '#7a3a1a']), '#e8e2d0'];
  tf.doorCol = _sctfPick(r, ['#2a3a2e', '#3a2a22', '#1f2a3a', '#4a2a2a', '#2a2a2a']);
  tf.rail = 0.09 + r() * 0.03;
  // an oriel (a boxed bay on the upper floors, on a corbel) on a third of the houses with an overhang; a butcher keeps the meat hooks over the stall
  tf.oriel = nS >= 2 && r() < 0.36 ? { i: 1 + Math.floor(r() * (nS - 1)), at: 0.25 + r() * 0.5, w: 1.6 + r() * 0.9 } : null;
  tf.hooks = !!sp.shop && sp.shop.kind === 'butcher';
  tf.oldHooks = !tf.hooks && !!sp.shop && r() < 0.4;   // the rail and hooks are still there on some other shops (the Shambles was the street of the butchers)
  sp.tf = tf;
  sp.dress = tf.timber;   // sills and lintels are oak
  sp.wall = _scbgMix(tf.plaster, ((st.wall && st.wall.grime) || '#3a3530'), sp.wear * 0.5);
  sp.frame = tf.timber;
}

/* ---------- the model: a stack of storeys ---------- */
const _sctfRect = (a, b, z0, z1) => [[a[0], z0, a[1]], [b[0], z0, b[1]], [b[0], z1, b[1]], [a[0], z1, a[1]]];
/**
 * The style's build hook: the generator's own model on the footprint of the TOP storey (roof, gable, chimneys), then its front and
 * side walls replaced by one face per storey (each on its own plane, shifted by the storey's overhang), and a soffit under every
 * overhang. Non-quad footprints keep the plain model. -> model
 */
function _sctfBuild(b, sp, foot, modelFn, opt, view) {
  sp.season = (opt && opt.season) || 'summer';
  sp.persp = !!(view && !view.ortho);
  if (foot.length !== 4) return modelFn(b, sp, foot);
  const tf = sp.tf, nS = sp.storeys, J = tf.jet, Jt = J[nS - 1], zs = sp.zs, pl0 = _scbgWallPlane(foot[0], foot[1]), N = pl0.N, lean = tf.lean || [];
  const sh = (p, d) => [p[0] + N[0] * d, p[1] + N[2] * d];
  const ext = foot.map((p, i) => (i === 0 || i === 1) ? sh(p, Jt) : p);
  const model = modelFn(b, sp, ext);
  const olds = model.faces.filter(f => f.part === 'wall'), roofs = model.faces.filter(f => f.part !== 'wall'), faces = [];
  const front0 = olds.find(f => f.edge === 0), planeAt = d => Object.assign({}, pl0, { O: [pl0.O[0] + N[0] * d, 0, pl0.O[2] + N[2] * d] });
  // a leaning storey's plane: tilted by `k` (m out per m up) from its base offset d at the storey's own floor, so its elements follow the lean
  const planeLean = (d, k, z0) => Object.assign({}, pl0, { O: [pl0.O[0] + N[0] * (d - k * z0), 0, pl0.O[2] + N[2] * (d - k * z0)], V: [N[0] * k, 1, N[2] * k] });
  for (const f of olds) if (f.edge === 2) faces.push(f);   // the back wall as it is
  for (let i = 0; i < nS; i++) {
    const top = i === nS - 1, k = top ? 0 : (lean[i] || 0), h = zs[i + 1] - zs[i], a = sh(foot[0], J[i]), c = sh(foot[1], J[i]), a2 = sh(foot[0], J[i] + k * h), c2 = sh(foot[1], J[i] + k * h);
    const poly = top ? [[a[0], zs[i], a[1]], [c[0], zs[i], c[1]]].concat(front0.poly.slice(2)) : [[a[0], zs[i], a[1]], [c[0], zs[i], c[1]], [c2[0], zs[i + 1], c2[1]], [a2[0], zs[i + 1], a2[1]]];
    // a leaning face turns its normal with it (a hair): the sun and the eye see the lean
    const n = k ? _scbgNorm([N[0], -k, N[2]]) : N;
    faces.push({ poly, n, part: 'wall', role: 'front', edge: 0, stack: i, col: sp.wall, plane: k ? planeLean(J[i], k, zs[i]) : planeAt(J[i]), elems: [], layout: _sctfFrontLayout });
  }
  for (const edge of [1, 3]) {
    const w = olds.find(f => f.edge === edge);
    if (!w) continue;
    const fc = edge === 1 ? foot[1] : foot[0], pl = w.plane;
    const bc = edge === 1 ? [pl.O[0] + pl.U[0] * pl.len, pl.O[2] + pl.U[2] * pl.len] : [pl.O[0], pl.O[2]];   // the ext edge's far end (the back corner)
    for (let i = 0; i < nS; i++) {
      const top = i === nS - 1, cr = sh(fc, J[i]), d = Jt - J[i], k = top ? 0 : (lean[i] || 0), cr2 = sh(fc, J[i] + k * (zs[i + 1] - zs[i]));
      const sr = edge === 1 ? [d, pl.len] : [0, pl.len - d];
      let poly;
      if (top) { const p = w.poly.map(q => q.slice()); p[0][1] = zs[i]; p[1][1] = zs[i]; poly = p; }
      else if (edge === 1) poly = [[cr[0], zs[i], cr[1]], [bc[0], zs[i], bc[1]], [bc[0], zs[i + 1], bc[1]], [cr2[0], zs[i + 1], cr2[1]]];
      else poly = [[bc[0], zs[i], bc[1]], [cr[0], zs[i], cr[1]], [cr2[0], zs[i + 1], cr2[1]], [bc[0], zs[i + 1], bc[1]]];
      faces.push({ poly, n: w.n, part: 'wall', role: w.role, edge, stack: i, col: sp.wall, plane: pl, sr, elems: [], layout: _sctfSideLayout });
    }
  }
  // the soffit under every overhang: from the top of the storey below (leaning out) to the base of this one; boarded, its joists run across
  for (let i = 1; i < nS; i++) {
    const t0 = tf.top[i - 1], ov = J[i] - t0;
    if (ov <= 0.02) continue;
    const a0 = sh(foot[0], t0), c0 = sh(foot[1], t0), a1 = sh(foot[0], J[i]), c1 = sh(foot[1], J[i]), z = zs[i];
    const joists = [{ k: 'tjoist', a0: [a0[0], z, a0[1]], c0: [c0[0], z, c0[1]], a1: [a1[0], z, a1[1]], c1: [c1[0], z, c1[1]], col: _scbgDark(tf.timber, 0.1), n: Math.max(2, Math.round(Math.hypot(c0[0] - a0[0], c0[1] - a0[1]) / 0.34)) }];
    faces.push({ poly: [[a0[0], z, a0[1]], [c0[0], z, c0[1]], [c1[0], z, c1[1]], [a1[0], z, a1[1]]], n: [0, -1, 0], part: 'wall', role: 'soffit', edge: 0, col: _scbgMix(tf.timber, tf.plaster, 0.3), dark: -0.12, plane: pl0, elems: [],
      layout: () => ({ elems: joists, blocks: [] }) });
  }
  model.faces = faces.concat(roofs);
  model.stack = true;
  return model;
}

/* ---------- the layout of one storey's front ---------- */
/** The timber members (rects [s, z, w, h, level] and quads) and the openings of the front wall of storey face.stack. */
function _sctfFrontLayout(sp, face, model) {
  const tf = sp.tf, i = face.stack, nS = sp.storeys, zs = sp.zs, len = face.plane.len, top = i === nS - 1, r = _sctfRnd(sp, 'f' + i);
  const zA = zs[i], zB = top ? model.E0 : zs[i + 1], out = { elems: [], blocks: [] }, rects = [], quads = [], holes = [];
  const gable = top && model.roof === 'gable' && face.poly.length > 4, rise = gable ? Math.max(0, model.H - model.E0) : 0;
  const topZ = s => gable ? zB + rise * (1 - Math.abs(2 * s / len - 1)) : zB;
  const put = bk => { out.blocks.push(bk); (tf.fit || (tf.fit = [])).push({ kind: bk.kind, i, s: bk.s != null ? bk.s : bk.s0 }); };   // tf.fit: what hangs from this house (the checks read it)
  const shop = i === 0 && sp.shop, rail = tf.rail, pw = 0.17, deep = (s, kind) => !sp.persp || _scbgOn(face.plane, s, 1.5, 0.3)[2] >= _SCTF_NEAR[kind];
  const rect = (s, z, w, h, lv) => { if (w > 0.01 && h > 0.01) rects.push([s, z, w, h, lv || 1]); };
  const slant = (s0, z0, s1, z1, t, lv) => quads.push([[[s0, z0], [s1, z1], [s1, z1 - t], [s0, z0 - t]], lv || 1]);
  const win = (s, z, w, h, over) => { out.elems.push(Object.assign({ k: 'win', s, z, w, h, type: 'leaded', panes: [Math.max(2, Math.round(w / 0.42)), 1], head: 'flat', recess: 0.1, storey: i, frame: tf.timber }, over || {})); holes.push([s - 0.07, s + w + 0.07, z - 0.1, z + h + 0.11]); rect(s - 0.07, z - 0.1, w + 0.14, 0.1); rect(s - 0.07, z + h, w + 0.14, 0.11); };
  // the plinth, the splash zone and the bressummer
  if (i === 0 && !shop) out.elems.push({ k: 'band', s0: 0, s1: len, z0: 0, z1: 0.4, col: '#7d6c5a', layer: 2, o: 0.02 });
  // a lane is dark at the foot (the walls stand a few metres apart): the plaster darkens toward the ground in three steps, damper at the foot
  if (i === 0) for (const [za, zb, op] of [[0.4, 1.0, 0.24], [1.0, 1.9, 0.12], [1.9, zB, 0.06]]) out.elems.push({ k: 'band', s0: 0, s1: len, z0: za, z1: zb, col: _scbgDark(sp.wall, 0.55), layer: 1, op, o: 0.006 });
  out.elems.push({ k: 'tpatch', s0: 0, s1: len, z0: zA, z1: zB, storey: i, seed: sp.seed * 7 + i, col: sp.wall });
  if (i >= 1) rect(0, zA, len, 0.28, 1);
  rect(0, zB - 0.15, len, 0.15, 1);
  rect(0, zA + (i >= 1 ? 0.28 : 0.4), pw, zB - zA - (i >= 1 ? 0.43 : 0.55), 1); rect(len - pw, zA + (i >= 1 ? 0.28 : 0.4), pw, zB - zA - (i >= 1 ? 0.43 : 0.55), 1);
  const zLo = zA + (i >= 1 ? 0.28 : 0.4);
  // openings
  const sill = i === 0 ? 0.95 : 0.7 + r() * 0.2;
  const oriel = tf.oriel && tf.oriel.i === i && !top && len > 3.2 ? (() => { const w = Math.min(tf.oriel.w, len - 1.4), s0 = Math.max(0.5, Math.min(len - 0.5 - w, len * tf.oriel.at - w / 2)); return { s0, s1: s0 + w, z0: zA + 0.62, z1: zA + 0.62 + Math.min(1.35, zB - zA - 1.0) }; })() : null;
  if (shop) {
    const dW = 1.0, doorLeft = sp.doorSide === 'left', dS = doorLeft ? 0.35 : len - 0.35 - dW, gs = doorLeft ? 0.35 + dW + 0.3 : 0.35, ge = doorLeft ? len - 0.35 : len - 0.35 - dW - 0.3;
    out.elems.push({ k: 'door', s: dS, z: 0.12, w: dW, h: 2.05, panels: 2, recess: 0.16, glass: true, col: tf.doorCol }); holes.push([dS - 0.05, dS + dW + 0.05, 0, 2.3]);
    rect(dS - 0.1, 0, 0.1, 2.3, 1); rect(dS + dW, 0, 0.1, 2.3, 1); rect(dS - 0.1, 2.15, dW + 0.2, 0.1, 1);
    const gw = ge - gs, wh = Math.min(1.5, zB - 0.78 - 0.95);
    win(gs, 0.9, gw, wh, { shopGlass: true, type: 'bar', panes: [Math.max(3, Math.round(gw / 0.36)), 3], recess: 0.12 });   // small panes: a shop window of a medieval street is never one sheet
    out.elems.push({ k: 'tlit', s: gs + 0.05, z: 0.95, w: gw - 0.1, h: wh - 0.1, storey: 0 });
    out.elems.push({ k: 'tgoods', s: gs + 0.08, z: 0.98, w: gw - 0.16, h: wh - 0.16, kind: sp.shop.kind, seed: sp.seed, storey: 0 });   // what is for sale, behind the glass (shapes, never lettering)
    if (tf.hooks || tf.oldHooks) out.elems.push({ k: 'thooks', s0: 0.15, s1: len - 0.15, z: zB - 0.86, full: tf.hooks, seed: sp.seed, storey: 0 });
    out.elems.push({ k: 'band', s0: gs - 0.05, s1: ge + 0.05, z0: 0.05, z1: 0.9, col: _scbgMix(tf.fascia, tf.timber, 0.4), layer: 2, o: 0.03 });   // the stall riser
    const mid = (gs + ge) / 2; rect(mid - 0.05, 0.05, 0.1, 0.85, 2);
    out.elems.push({ k: 'band', s0: 0.1, s1: len - 0.1, z0: zB - 0.75, z1: zB - 0.18, col: tf.fascia, layer: 2, o: 0.05 });   // the fascia board: plain, never lettering
    if (tf.stall && deep(Math.min(gs, ge), 'stall') && deep(Math.max(gs, ge), 'stall')) put({ kind: 'stall', s0: gs, s1: ge, o: 0.34, z: 0.92, col: _scbgLight(tf.timber, 0.12), kindOf: sp.shop && sp.shop.kind });
    if (tf.awning && deep(gs, 'awning') && deep(ge, 'awning')) put({ kind: 'awning', s0: gs - 0.1, s1: ge + 0.1, z: zB - 0.78, drop: 0.42, out: 0.8, cols: tf.awnCols });
  } else {
    const ps = tf.pattern === 'close' ? 1.9 + r() * 0.7 : tf.pattern === 'box' ? 1.4 + r() * 0.5 : 1.05 + r() * 0.25, nb = Math.max(1, Math.round(len / ps)), bw = len / nb;
    const doorBay = i === 0 ? (sp.doorSide === 'left' ? 0 : nb - 1) : -1;
    for (let k = 1; k < nb; k++) { const s = bw * k + (r() - 0.5) * 0.16; rect(s - 0.07, zLo, 0.14, zB - zLo - 0.15, 1); }
    for (let k = 0; k < nb; k++) {
      const sa = bw * k + pw / 2, sb = bw * (k + 1) - pw / 2, pwid = sb - sa;
      if (k === doorBay) { const dS = (sa + sb) / 2 - 0.5; out.elems.push({ k: 'door', s: dS, z: 0.12, w: 1.0, h: 2.05, panels: 2, recess: 0.2, col: tf.doorCol }); holes.push([dS - 0.05, dS + 1.05, 0, 2.3]); rect(dS - 0.1, 0, 0.1, 2.3, 1); rect(dS + 1.0, 0, 0.1, 2.3, 1); rect(dS - 0.1, 2.15, 1.2, 0.1, 1); continue; }
      if (oriel && sa < oriel.s1 + 0.1 && sb > oriel.s0 - 0.1) continue;
      if (pwid < 0.8 || r() < 0.1) continue;
      const ribbon = pwid >= 2.2 && r() < 0.5, w = ribbon ? Math.min(2.5, pwid - 0.2) : Math.min(1.5, Math.max(0.7, pwid - 0.4 - r() * 0.3));
      const h = Math.min(zB - zA - sill - 0.45, i === 0 ? 1.0 : 0.85 + r() * 0.3);
      if (h > 0.45) { win((sa + sb) / 2 - w / 2, zA + sill, w, h); out.elems.push({ k: 'tlead', s: (sa + sb) / 2 - w / 2, z: zA + sill, w, h, storey: i }); }
    }
  }
  if (oriel && !shop) {
    holes.push([oriel.s0 - 0.15, oriel.s1 + 0.15, oriel.z0 - 0.35, oriel.z1 + 0.5]);
    put({ kind: 'oriel', s0: oriel.s0, s1: oriel.s1, z0: oriel.z0, z1: oriel.z1, d: 0.42 + (oriel.s1 - oriel.s0) * 0.07, col: tf.timber, plaster: sp.wall, seed: sp.seed + i });
  }
  // the gable's own window and rake boards
  if (gable) {
    const gh = rise - 0.35;
    if (gh > 1.15) win(len / 2 - 0.4, zB + 0.4, 0.8, Math.min(0.9, gh - 0.8), { storey: nS });
    slant(0, zB, len / 2, zB + rise, 0.18, 1); slant(len, zB, len / 2, zB + rise, 0.18, 1);
  }
  // mid rails, studs and braces by the frame pattern; everything stops at the openings
  const zMid = zA + (zB - zA) * 0.55, studs = [], pitch = tf.pattern === 'close' ? 0.31 : tf.pattern === 'box' ? 1.0 : 0.62;
  const inHole = (s, z0, z1) => holes.some(h => s > h[0] - 0.01 && s < h[1] + 0.01 && z1 > h[2] && z0 < h[3]);
  if (!shop) {
    // rails across the panels between openings (a rail never crosses a window)
    const runs = [[0, len]];
    for (const h of holes.filter(h => zMid + rail > h[2] && zMid < h[3]).sort((a, b) => a[0] - b[0])) { const last = runs[runs.length - 1]; if (h[0] > last[0]) { const e = last[1]; last[1] = h[0]; if (h[1] < e) runs.push([h[1], e]); } else if (h[1] < last[1]) last[0] = h[1]; }
    if (tf.pattern !== 'square' || r() < 0.7) for (const [a, e] of runs) if (e - a > 0.15) rect(a, zMid, e - a, rail, 1);
    for (let s = pitch * 0.5; s < len - 0.1; s += pitch * (tf.pattern === 'close' ? 1 : 0.9 + r() * 0.2)) {
      const z0 = zLo, z1 = topZ(s) - 0.17;
      if (!inHole(s, z0, z1)) studs.push([s - 0.04, z0, 0.08, z1 - z0]); else {
        // short studs above and below a window
        const h = holes.find(q => s > q[0] && s < q[1] && z1 > q[2] && z0 < q[3]);
        if (h && h[2] - z0 > 0.2) studs.push([s - 0.04, z0, 0.08, h[2] - z0]);
        if (h && z1 - h[3] > 0.2) studs.push([s - 0.04, h[3], 0.08, z1 - h[3]]);
      }
    }
    if (tf.pattern !== 'close') {
      // braces: a down-brace from each post to the rail, in the panels with no window
      for (let k = 0; k <= Math.round(len / (1.5 + r() * 0.4)); k++) {
        const s = Math.min(len - 0.4, 0.17 + k * (len - 0.34) / Math.max(1, Math.round(len / 1.6))), dir = (k + sp.seed) % 2 ? 1 : -1, bl = Math.min(0.75, (topZ(s) - zMid) * 0.7);
        const s0 = dir > 0 ? s : s + 0.5, s1 = dir > 0 ? s + 0.55 : s + 0.02;
        if (!inHole((s0 + s1) / 2, zMid, zB) && s1 < len - 0.1 && s0 > 0.1) quads.push([[[s0, zB - 0.17], [s1, zB - 0.17 - bl], [s1 + 0.07, zB - 0.17 - bl], [s0 + 0.07, zB - 0.17]], 2]);
      }
    }
  }
  for (const q of studs) rects.push([q[0], q[1], q[2], q[3], 2]);
  const upper = i + 1 < nS && tf.jet[i + 1] > tf.top[i] + 0.02;
  if (upper) out.elems.push({ k: 'band', s0: 0, s1: len, z0: zB - 0.55, z1: zB, col: _scbgDark(tf.timber, 0.5), layer: 3, o: 0.01, op: 0.34 });   // the overhang's shadow on this storey
  else if (top && model.roof !== 'flat') out.elems.push({ k: 'band', s0: 0, s1: len, z0: zB - 0.22, z1: zB, col: _scbgDark(sp.wall, 0.5), layer: 3, o: 0.01, op: 0.4 });
  out.elems.push({ k: 'tframe', s0: 0, s1: len, z0: zA, z1: zB + rise, storey: i, rects, quads, col: tf.timber, pitch, studZone: [pw, zLo, len - 2 * pw, zB - 0.15 - zLo] });
  // BRACKETS: under the beam of every overhang, a curved corbel at each post (the dragon posts at the ends, and one every ~2 m): the jetty is carried, not floating
  if (i >= 1 && tf.jet[i] - tf.top[i - 1] > 0.1 && !shop) {
    const ov = tf.jet[i] - tf.top[i - 1], n = Math.max(2, Math.round(len / 2.1) + 1);
    for (let k = 0; k < n; k++) { const s = 0.1 + (len - 0.32) * k / (n - 1); if (deep(s, 'bracket')) put({ kind: 'bracket', s, z: zA, ov, drop: Math.min(0.6, 0.3 + ov * 0.9), col: _scbgDark(tf.timber, 0.05) }); }
  }
  // fittings: the hanging sign, the lantern and the basket hang from this storey's wall
  const fit = _sctfRnd(sp, 'fit' + i);
  const free = (s, w) => !holes.some(h => s + w > h[0] && s - w < h[1]);
  const spot = (w, tries) => { for (let t = 0; t < (tries || 8); t++) { const s = 0.45 + fit() * Math.max(0.1, len - 0.9); if (free(s, w)) return s; } return null; };
  if (i === 0 && tf.sign) { const s = shop ? 0.45 + fit() * Math.max(0.1, len - 0.9) : spot(0.3); if (s != null && deep(s, 'sign')) put({ kind: 'sign', s: len - s < 0.5 ? len - 0.5 : s, z: zB - 0.18, out: 0.85, tf: { board: tf.board, motif: tf.motif } }); }
  if (i === 0 && tf.lantern) { const s = fit() < 0.5 ? 0.22 : len - 0.22; if (deep(s, 'lantern')) put({ kind: 'lantern', s, z: zB - 0.3, out: 0.5 }); }
  if (i === 1 && tf.basket) { const s = spot(0.4); if (s != null && deep(s, 'basket')) put({ kind: 'basket', s, z: zA + 1.05, out: 0.42, seed: sp.seed }); }
  return out;
}

/** The side walls of a storey: a frame of posts, plates and studs between the shifted corner and the back; a window on a visible side. */
function _sctfSideLayout(sp, face, model) {
  const tf = sp.tf, i = face.stack, zs = sp.zs, nS = sp.storeys, top = i === nS - 1, [s0, s1] = face.sr, out = { elems: [], blocks: [] }, rects = [];
  const zA = zs[i], zB = top ? model.E0 : zs[i + 1], w = s1 - s0;
  if (w < 0.2) return out;
  rects.push([s0, zB - 0.15, w, 0.15, 1], [s0, zA, w, i ? 0.28 : 0.2, 1], [s0, zA, 0.16, zB - zA, 1], [s1 - 0.16, zA, 0.16, zB - zA, 1]);
  for (let s = s0 + 0.4; s < s1 - 0.2; s += 0.32) rects.push([s - 0.04, zA + 0.28, 0.08, zB - zA - 0.43, 2]);
  if (face.role === 'side' && w > 2) out.elems.push({ k: 'win', s: (s0 + s1) / 2 - 0.5, z: zA + 0.8, w: 1.0, h: 0.9, type: 'leaded', panes: [3, 1], head: 'flat', recess: 0.1, storey: i, frame: tf.timber });
  out.elems.push({ k: 'tframe', s0, s1, z0: zA, z1: zB, storey: i, rects, quads: [], col: tf.timber, pitch: 0.32, studZone: null });
  return out;
}

/* ---------- drawing: the frame ---------- */
/** Screen pixels per metre along a wall at its middle (the stud pitch LOD: a pitch under ~2.6 px is not drawn, its zone is toned). */
function _sctfPxPerM(face, view, e) {
  const pl = face.plane, sm = (e.s0 + e.s1) / 2, zm = (e.z0 + e.z1) / 2, A = _scbgOn(pl, sm, zm, 0), B = _scbgOn(pl, sm + 1, zm, 0);
  if (A[2] < view.near || B[2] < view.near) return view.ortho ? 20 : 1e3;
  const p = view.P(A), q = view.P(B);
  return Math.hypot(q[0] - p[0], q[1] - p[1]);
}
_scbgElemKinds.tframe = function (e, face, ctx, T) {
  if (T < 1) return;
  const { view, sink } = ctx, pl = face.plane, shade = _scbgFaceShade(face, ctx), col = _scbgDark(e.col, shade * 0.5);
  const pxm = _sctfPxPerM(face, view, e), studsOk = T >= 2 && pxm * (e.pitch || 0.3) >= 2.6, segs = [];
  for (const [s, z, w, h, lv] of e.rects) {
    if (lv > 1 && !studsOk) continue;
    const p = _scbgRect(pl, view, s, z, w, h, 0.02); if (p) segs.push(_scbgPath(p));
  }
  for (const [pts, lv] of e.quads) {
    if (lv > 1 && !studsOk) continue;
    const p = _scbgMap(pl, view, pts, 0.02); if (p) segs.push(_scbgPath(p));
  }
  if (segs.length) sink.add(2, { f: col, d: segs.join(''), op: 1, part: 'body' });
  if (!studsOk && e.studZone && T >= 1) { const z = e.studZone, p = _scbgRect(pl, view, z[0], z[1], z[2], z[3], 0.012); if (p) sink.add(1, { f: col, d: _scbgPath(p), op: 0.3, part: 'body' }); }
};

/** The joist ends of a jetty's soffit: boards running from the wall below out to the beam, one every ~0.34 m (the underside is a floor, not a black slab). */
_scbgElemKinds.tjoist = function (e, face, ctx, T) {
  if (T < 1) return;
  const { view, sink } = ctx, segs = [], n = e.n, lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  for (let k = 0; k < n; k++) {
    const t0 = (k + 0.38) / n, t1 = (k + 0.62) / n, A = lerp(e.a0, e.c0, t0), B = lerp(e.a0, e.c0, t1), C = lerp(e.a1, e.c1, t1), D = lerp(e.a1, e.c1, t0);
    const cl = _scbgClipNear([A, B, C, D], view.near); if (cl) segs.push(_scbgPath(cl.map(view.P)));
  }
  if (segs.length) sink.add(3, { f: e.col, d: segs.join(''), op: 0.55, part: 'body', detail: true });
};

/** Limewash patches on the plaster (a few lighter, a few damper), seeded: a wall is never one flat colour. Near enough to read (tier 2). */
_scbgElemKinds.tpatch = function (e, face, ctx, T) {
  if (T < 2) return;
  const { view, sink } = ctx, pl = face.plane, r = sceneRnd(sceneHash('tpatch|' + e.seed)), light = [], dark = [], n = 3 + Math.floor(r() * 4);
  for (let k = 0; k < n; k++) {
    const w = 0.5 + r() * 1.1, h = 0.4 + r() * 1.0, s = e.s0 + 0.2 + r() * Math.max(0.1, e.s1 - e.s0 - w - 0.4), z = e.z0 + 0.3 + r() * Math.max(0.1, e.z1 - e.z0 - h - 0.5), j = () => (r() - 0.5) * 0.2;
    const p = _scbgMap(pl, view, [[s + j(), z + j()], [s + w + j(), z + j()], [s + w + j(), z + h + j()], [s + j(), z + h + j()]], 0.007);
    if (p) (r() < 0.5 ? light : dark).push(_scbgPath(p));
  }
  if (light.length) sink.add(1, { f: _scbgLight(e.col, 0.35), d: light.join(''), op: 0.28, part: 'body', detail: true });
  if (dark.length) sink.add(1, { f: _scbgDark(e.col, 0.35), d: dark.join(''), op: 0.2, part: 'body', detail: true });
};
/** A lit shop interior over a display window (drawn only after dusk, ungraded): a warm gradient, brighter low. */
_scbgElemKinds.tlit = function (e, face, ctx) {
  const p = _scbgRect(face.plane, ctx.view, e.s, e.z, e.w, e.h, -0.06);
  if (p) ctx.sink.add(9, { f: { lin: [[0, '#fff2d0', 0.75], [1, '#ffd890', 0.35]], x1: (p[3] || p[p.length - 1])[0], y1: (p[3] || p[p.length - 1])[1], x2: p[0][0], y2: p[0][1] }, d: _scbgPath(p), op: 0.8, part: 'lit' });
};

/** Leaded lights: a diagonal lattice of lead over the glass of a window, near enough to read (tier 3). */
_scbgElemKinds.tlead = function (e, face, ctx, T) {
  if (T < 3) return;
  const { view, sink } = ctx, pl = face.plane, segs = [], st = 0.17, o = -0.12;
  const line = (s0, z0, s1, z1) => { const p = _scbgMap(pl, view, [[s0, z0], [s1, z1], [s1 + 0.012, z1], [s0 + 0.012, z0]], o); if (p) segs.push(_scbgPath(p)); };
  const n = Math.ceil((e.w + e.h) / st);
  for (let k = 1; k < n; k++) {
    const d = k * st;
    // the rising diagonal z = u (u from the left edge) shifted: z = u - (d - e.h), cut to 0 <= u <= w and 0 <= z <= h
    let u0 = Math.max(0, d - e.h), u1 = Math.min(e.w, d);
    if (u1 - u0 > 0.02) line(e.s + u0, e.z + (u0 - (d - e.h)), e.s + u1, e.z + (u1 - (d - e.h)));
    // the falling diagonal z = d - u
    u0 = Math.max(0, d - e.h); u1 = Math.min(e.w, d);
    if (u1 - u0 > 0.02) line(e.s + u0, e.z + (d - u0), e.s + u1, e.z + (d - u1));
  }
  if (segs.length) sink.add(5, { f: '#1d2428', d: segs.join(''), op: 0.55, part: 'body', detail: true });
};
/** What a shop sells, behind its glass: shelves with coloured shapes by kind (a butcher's hung joints, loaves, crates of fruit, flowers, cheeses, books ...). Shapes only. */
_scbgElemKinds.tgoods = function (e, face, ctx, T) {
  if (T < 1) return;
  const { view, sink } = ctx, pl = face.plane, r = sceneRnd(sceneHash('goods|' + e.seed + '|' + e.kind)), pal = _SCTF_WARES[e.kind] || _SCTF_WARES.gift, by = {}, o = -0.1;
  const add = (col, pts) => { const p = _scbgMap(pl, view, pts, o); if (p) (by[col] || (by[col] = [])).push(_scbgPath(p)); };
  const rc = (col, s, z, w, h) => add(col, [[s, z], [s + w, z], [s + w, z + h], [s, z + h]]);
  const oval = (col, s, z, w, h) => add(col, [[s + w * 0.25, z], [s + w * 0.75, z], [s + w, z + h * 0.5], [s + w * 0.75, z + h], [s + w * 0.25, z + h], [s, z + h * 0.5]]);
  const x0 = e.s, x1 = e.s + e.w, y0 = e.z, y1 = e.z + e.h, shelves = e.kind === 'butcher' ? [] : [y0 + e.h * 0.34, y0 + e.h * 0.68];
  for (const z of shelves) rc('#2b2118', x0, z - 0.03, e.w, 0.05);
  const step = e.kind === 'books' ? 0.07 : 0.22;
  if (e.kind === 'butcher') {
    // a rail across the top, joints and birds hung from it on hooks, a tray of chops on the marble below
    rc('#1c1f22', x0, y1 - 0.05, e.w, 0.04);
    for (let s = x0 + 0.12; s < x1 - 0.14; s += 0.26 + r() * 0.12) {
      const h = 0.35 + r() * 0.3, w = 0.1 + r() * 0.07, c = r() < 0.5 ? pal[0] : pal[2];
      rc('#1c1f22', s + w / 2 - 0.006, y1 - 0.15, 0.012, 0.1);
      oval(c, s, y1 - 0.15 - h, w, h);
      if (r() < 0.5) oval(pal[1], s + w * 0.3, y1 - 0.15 - h * 0.85, w * 0.35, h * 0.5);
    }
    for (let s = x0 + 0.1; s < x1 - 0.3; s += 0.3 + r() * 0.1) oval(r() < 0.5 ? pal[0] : pal[1], s, y0 + 0.04, 0.22, 0.1 + r() * 0.05);
    rc('#d8d4cc', x0, y0, e.w, 0.04);
  } else for (let row = 0; row < 3; row++) {
    const zb = row === 0 ? y0 + 0.02 : shelves[row - 1] + 0.02, hmax = (row === 2 ? y1 : shelves[row]) - zb - 0.06;
    if (hmax < 0.1) continue;
    for (let s = x0 + 0.08; s < x1 - 0.12; s += step * (0.8 + r() * 0.5)) {
      if (r() < 0.14) continue;
      const c = pal[Math.floor(r() * pal.length) % pal.length];
      if (e.kind === 'books') rc(c, s, zb, 0.05 + r() * 0.025, hmax * (0.6 + r() * 0.4));
      else if (e.kind === 'florist') { rc('#3f6a2c', s + 0.06, zb, 0.02, hmax * 0.6); oval(c, s, zb + hmax * 0.5, 0.15, hmax * 0.4); }
      else if (e.kind === 'cheese') oval(c, s, zb, 0.2, Math.min(hmax, 0.12 + r() * 0.1));
      else if (e.kind === 'greengrocer') { rc('#7a5a34', s, zb, 0.2, Math.min(hmax * 0.45, 0.09)); oval(c, s + 0.015, zb + 0.07, 0.17, Math.min(hmax * 0.6, 0.12)); }
      else if (e.kind === 'bakery') oval(c, s, zb, 0.2, Math.min(hmax, 0.1 + r() * 0.07));
      else rc(c, s, zb, 0.1 + r() * 0.1, Math.min(hmax, 0.1 + r() * 0.2));
    }
  }
  for (const col of Object.keys(by)) {
    sink.add(5, { f: col, d: by[col].join(''), op: 0.9, part: 'body', detail: true });
    sink.add(10, { f: _scbgMix(col, '#ffd890', 0.28), d: by[col].join(''), op: 0.82, part: 'lit' });   // the same goods under the shop lamps after dusk
  }
};
/** Meat hooks: an iron rail under the shop fascia with hooks along it; a butcher's has joints and birds hung on them. */
_scbgElemKinds.thooks = function (e, face, ctx, T) {
  if (T < 1) return;
  const { view, sink } = ctx, pl = face.plane, r = sceneRnd(sceneHash('hooks|' + e.seed)), o = 0.2, rails = [], hk = [], meat = [], fat = [];
  const q = (arr, pts) => { const p = _scbgMap(pl, view, pts, o); if (p) arr.push(_scbgPath(p)); };
  q(rails, [[e.s0, e.z], [e.s1, e.z], [e.s1, e.z + 0.05], [e.s0, e.z + 0.05]]);
  if (T >= 2) {
    const step = e.full ? 0.34 : 0.5, n = Math.floor((e.s1 - e.s0) / step);
    for (let k = 0; k < n; k++) {
      const s = e.s0 + step * (k + 0.5) + (r() - 0.5) * 0.08;
      q(hk, [[s - 0.012, e.z - 0.2], [s + 0.012, e.z - 0.2], [s + 0.012, e.z], [s - 0.012, e.z]]);
      q(hk, [[s - 0.05, e.z - 0.2], [s + 0.012, e.z - 0.2], [s + 0.012, e.z - 0.17], [s - 0.05, e.z - 0.17]]);
      if (e.full && r() < 0.8) {
        const h = 0.4 + r() * 0.35, w = 0.13 + r() * 0.07;
        q(meat, [[s - w / 2, e.z - 0.2 - h * 0.15], [s + w / 2, e.z - 0.2 - h * 0.15], [s + w * 0.35, e.z - 0.2 - h], [s - w * 0.35, e.z - 0.2 - h]]);
        if (r() < 0.6) q(fat, [[s - w * 0.15, e.z - 0.3], [s + w * 0.1, e.z - 0.3], [s + w * 0.05, e.z - 0.2 - h * 0.7], [s - w * 0.1, e.z - 0.2 - h * 0.7]]);
      }
    }
  }
  sink.add(6, { f: '#1c1f22', d: rails.concat(hk).join(''), op: 1, part: 'body' });
  if (meat.length) sink.add(6, { f: '#9a3a34', d: meat.join(''), op: 1, part: 'body' });
  if (fat.length) sink.add(7, { f: '#e8d6c8', d: fat.join(''), op: 0.9, part: 'body', detail: true });
};

/* ---------- fittings (block kinds): faces in metres from the wall plane ---------- */
const _sctfFace = (poly, col, extra) => Object.assign({ poly, n: _scbgNormal(poly, true), part: 'body', role: 'block', col, elems: [], flat: true }, extra || {});
const _sctfOct = (X, s, o, z, r, col, sq) => { const pts = []; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; pts.push(X(s, o + Math.cos(a) * r, z + Math.sin(a) * r * (sq || 1))); } return _sctfFace(pts, col); };
_scbgBlockKinds.stall = function (bk, wall, sp) {
  const pl = wall.plane, X = (s, o, z) => _scbgOn(pl, s, z, o), faces = [], tf = sp.tf, z = bk.z, o = bk.o;
  faces.push(_sctfFace([X(bk.s0, 0.02, z - 0.06), X(bk.s1, 0.02, z - 0.06), X(bk.s1, o, z - 0.06), X(bk.s0, o, z - 0.06)], _scbgDark(bk.col, 0.35)));   // the underside
  faces.push(_sctfFace([X(bk.s0, 0.02, z), X(bk.s1, 0.02, z), X(bk.s1, o, z), X(bk.s0, o, z)], bk.col));   // the shelf
  faces.push(_sctfFace([X(bk.s0, o, z - 0.06), X(bk.s1, o, z - 0.06), X(bk.s1, o, z), X(bk.s0, o, z)], _scbgDark(bk.col, 0.2)));
  const wares = _SCTF_WARES[bk.kindOf] || _SCTF_WARES.gift, r = _sctfRnd(sp, 'wares'), n = Math.max(2, Math.round((bk.s1 - bk.s0) / 0.22));
  for (let k = 0; k < n; k++) {
    if (r() < 0.2) continue;
    const a = bk.s0 + (bk.s1 - bk.s0) * (k + 0.1) / n, b = bk.s0 + (bk.s1 - bk.s0) * (k + 0.85) / n, h = 0.1 + r() * 0.16, c = wares[Math.floor(r() * wares.length)], oo = o - 0.07;
    faces.push(_sctfFace([X(a, oo, z), X(b, oo, z), X(b, oo, z + h), X(a, oo, z + h)], c));
    faces.push(_sctfFace([X(a, 0.1, z + h), X(b, 0.1, z + h), X(b, oo, z + h), X(a, oo, z + h)], _scbgLight(c, 0.15)));
  }
  void tf;
  return faces;
};
_scbgBlockKinds.awning = function (bk, wall) {
  const pl = wall.plane, X = (s, o, z) => _scbgOn(pl, s, z, o), faces = [], n = Math.max(3, Math.round((bk.s1 - bk.s0) / 0.3)), zt = bk.z, zo = zt - bk.drop, vh = 0.22;
  for (let k = 0; k < n; k++) {
    const a = bk.s0 + (bk.s1 - bk.s0) * k / n, b = bk.s0 + (bk.s1 - bk.s0) * (k + 1) / n, c = bk.cols[k % 2];
    faces.push(_sctfFace([X(a, 0.02, zt), X(b, 0.02, zt), X(b, bk.out, zo), X(a, bk.out, zo)], _scbgDark(c, 0.22)));
    faces.push(_sctfFace([X(a, bk.out, zo), X(b, bk.out, zo), X(b, bk.out, zo - vh * (k % 2 ? 1 : 0.7)), X(a, bk.out, zo - vh * (k % 2 ? 1 : 0.7))], c));
  }
  for (const s of [bk.s0, bk.s1]) faces.push(_sctfFace([X(s, 0.02, zt), X(s, bk.out, zo), X(s, 0.02, zo)], _scbgDark(bk.cols[0], 0.3)));
  return faces;
};
const _sctfArm = (X, s, z, out) => [_sctfFace([X(s, 0.02, z), X(s, out, z), X(s, out, z - 0.035), X(s, 0.02, z - 0.035)], '#1c1f22'),
  _sctfFace([X(s, 0.02, z - 0.4), X(s, out * 0.78, z - 0.035), X(s, out * 0.78 + 0.03, z - 0.035), X(s, 0.05, z - 0.4)], '#1c1f22')];
_scbgBlockKinds.sign = function (bk, wall) {
  const pl = wall.plane, X = (s, o, z) => _scbgOn(pl, s, z, o), faces = _sctfArm(X, bk.s, bk.z, bk.out), t = bk.tf;
  const o0 = bk.out - 0.62, o1 = bk.out - 0.1, zt = bk.z - 0.12, zb = zt - 0.52, mc = (o0 + o1) / 2, zc = (zt + zb) / 2;
  faces.push(_sctfFace([X(bk.s, o0, zb), X(bk.s, o1, zb), X(bk.s, o1, zt), X(bk.s, o0, zt)], t.board));
  faces.push(_sctfFace([X(bk.s, o0 + 0.04, zb + 0.04), X(bk.s, o1 - 0.04, zb + 0.04), X(bk.s, o1 - 0.04, zt - 0.04), X(bk.s, o0 + 0.04, zt - 0.04)], _scbgLight(t.board, 0.1)));
  const ink = _scbgLight(t.board, 0.62);
  if (t.motif === 'disc') faces.push(_sctfOct(X, bk.s, mc, zc, 0.15, ink));
  else if (t.motif === 'diamond') faces.push(_sctfFace([X(bk.s, mc, zc - 0.18), X(bk.s, mc + 0.17, zc), X(bk.s, mc, zc + 0.18), X(bk.s, mc - 0.17, zc)], ink));
  else if (t.motif === 'chevron') faces.push(_sctfFace([X(bk.s, o0 + 0.07, zc - 0.12), X(bk.s, mc, zc + 0.08), X(bk.s, o1 - 0.07, zc - 0.12), X(bk.s, o1 - 0.07, zc - 0.03), X(bk.s, mc, zc + 0.17), X(bk.s, o0 + 0.07, zc - 0.03)], ink));
  else if (t.motif === 'stripes') for (const k of [-1, 0, 1]) faces.push(_sctfFace([X(bk.s, mc - 0.04 + k * 0.1, zc - 0.17), X(bk.s, mc + 0.02 + k * 0.1, zc - 0.17), X(bk.s, mc + 0.02 + k * 0.1, zc + 0.17), X(bk.s, mc - 0.04 + k * 0.1, zc + 0.17)], ink));
  else faces.push(_sctfFace([X(bk.s, o0 + 0.07, zc - 0.04), X(bk.s, o1 - 0.07, zc - 0.04), X(bk.s, o1 - 0.07, zc + 0.04), X(bk.s, o0 + 0.07, zc + 0.04)], ink));
  for (const o of [o0 + 0.08, o1 - 0.08]) faces.push(_sctfFace([X(bk.s, o - 0.008, zt), X(bk.s, o + 0.008, zt), X(bk.s, o + 0.008, bk.z - 0.035), X(bk.s, o - 0.008, bk.z - 0.035)], '#1c1f22'));
  return faces;
};
_scbgBlockKinds.lantern = function (bk, wall) {
  const pl = wall.plane, X = (s, o, z) => _scbgOn(pl, s, z, o), faces = _sctfArm(X, bk.s, bk.z + 0.28, bk.out), o = bk.out - 0.05, z = bk.z, hw = 0.1;
  faces.push(_sctfFace([X(bk.s, o - hw - 0.03, z), X(bk.s, o + hw + 0.03, z), X(bk.s, o + hw, z - 0.05), X(bk.s, o - hw, z - 0.05)], '#1c1f22'));
  faces.push(_sctfFace([X(bk.s, o - hw, z - 0.05), X(bk.s, o + hw, z - 0.05), X(bk.s, o + hw, z - 0.3), X(bk.s, o - hw, z - 0.3)], '#cdd2c4'));
  faces.push(_sctfFace([X(bk.s, o - hw - 0.03, z - 0.3), X(bk.s, o + hw + 0.03, z - 0.3), X(bk.s, o + hw, z - 0.34), X(bk.s, o - hw, z - 0.34)], '#1c1f22'));
  faces.push(_sctfFace([X(bk.s, o - hw - 0.04, z + 0.0), X(bk.s, o + hw + 0.04, z), X(bk.s, o, z + 0.14)], '#1c1f22'));
  // its glow after dusk: a soft falloff of round lights (the lamp's own warm colour), wider and fainter outward, then the glass itself
  for (const [rad, op] of [[0.95, 0.07], [0.6, 0.12], [0.36, 0.22]]) faces.push({ poly: [X(bk.s, o, z - 0.17)], n: [0, 1, 0], part: 'lit', role: 'lamps', col: '#ffd890', rad, op, round: true, elems: [], flat: true, lit: true });
  faces.push({ poly: [X(bk.s, o, z - 0.17)], n: [0, 1, 0], part: 'lit', role: 'lamps', col: '#fff1c8', rad: 0.1, op: 1, elems: [], flat: true, lit: true });
  return faces;
};
_scbgBlockKinds.basket = function (bk, wall, sp) {
  const pl = wall.plane, X = (s, o, z) => _scbgOn(pl, s, z, o), faces = _sctfArm(X, bk.s, bk.z + 0.3, bk.out), o = bk.out - 0.04, z = bk.z, season = sp.season || 'summer', r = sceneRnd(sceneHash('basket|' + bk.seed + '|' + bk.s));
  const bowl = [X(bk.s, o - 0.2, z), X(bk.s, o + 0.2, z)]; for (let k = 0; k <= 5; k++) { const a = k / 5 * Math.PI; bowl.push(X(bk.s, o + 0.2 * Math.cos(a), z - 0.2 * Math.sin(a))); }
  faces.push(_sctfFace([X(bk.s, o - 0.2, z), X(bk.s, o + 0.2, z)].concat(bowl.slice(2).reverse()), '#2c2a26'));
  const flowers = _SCTF_SEASON_FLOWERS[season] || [];
  faces.push(_sctfOct(X, bk.s, o, z + 0.06, 0.22, _SCTF_SEASON_LEAF[season] || '#3f6a2c', 0.6));
  if (flowers.length) for (let k = 0; k < 7; k++) faces.push(_sctfOct(X, bk.s, o - 0.17 + r() * 0.34, z + 0.04 + r() * 0.17, 0.045 + r() * 0.03, flowers[Math.floor(r() * flowers.length)]));
  return faces;
};

/** A jetty bracket: a curved oak corbel (a concave gusset: thin where it leaves the beam and the post, thickest in the corner) under the beam, 12 cm wide. */
_scbgBlockKinds.bracket = function (bk, wall) {
  const pl = wall.plane, X = (s, o, z) => _scbgOn(pl, s, z, o), faces = [], w = 0.12, ov = bk.ov, z = bk.z, d = bk.drop, arc = [];
  for (let k = 0; k <= 7; k++) { const th = k / 7 * Math.PI / 2; arc.push([-ov * Math.sin(th), z - d * (1 - Math.cos(th))]); }
  const prof = [[-ov, z - 0.01], [0, z - 0.01]].concat(arc.slice(1, -1).map(([o, zz]) => [o, zz - 0.01]), [[-ov, z - d]]);
  for (const s of [bk.s, bk.s + w]) faces.push(_sctfFace(prof.map(([o, zz]) => X(s, o, zz)), s === bk.s ? bk.col : _scbgDark(bk.col, 0.15)));
  // the curved edge between the two profiles, turned to the lane
  for (let k = 2; k < prof.length - 1; k++) faces.push(_sctfFace([X(bk.s, prof[k][0], prof[k][1]), X(bk.s + w, prof[k][0], prof[k][1]), X(bk.s + w, prof[k + 1][0], prof[k + 1][1]), X(bk.s, prof[k + 1][0], prof[k + 1][1])], _scbgLight(bk.col, 0.12)));
  return faces;
};
/** An oriel: a boxed bay on a corbel standing out from an upper wall, a small window ribbon in its front, returns, a tiled pent roof. */
_scbgBlockKinds.oriel = function (bk, wall) {
  const pl = wall.plane, X = (s, o, z) => _scbgOn(pl, s, z, o), faces = [], d = bk.d, a = bk.s0, b = bk.s1, z0 = bk.z0, z1 = bk.z1, inset = 0.16;
  const frontPlane = Object.assign({}, pl, { O: [pl.O[0] + pl.N[0] * d, pl.O[1], pl.O[2] + pl.N[2] * d] });
  const L = b - a - 2 * inset, panes = Math.max(2, Math.round(L / 0.3)), hh = z1 - z0;
  const front = { poly: [X(a + inset, d, z0), X(b - inset, d, z0), X(b - inset, d, z1), X(a + inset, d, z1)], n: pl.N, part: 'wall', role: 'oriel', col: bk.plaster, plane: frontPlane, flat: true, elems: [], edge: wall.edge };
  front.elems.push({ k: 'band', s0: a + inset, s1: b - inset, z0, z1, col: bk.col, layer: 1, o: 0.0 });
  front.elems.push({ k: 'win', s: a + inset + 0.1, z: z0 + 0.1, w: L - 0.2, h: hh - 0.2, type: 'bar', panes: [panes, 3], head: 'flat', recess: 0.06, storey: 1, frame: bk.col });
  faces.push(front);
  // the returns (the two sides, seen face-on from the lane): a framed panel each, posts, a rail and a stud, so no side of a bay is a bare slab
  for (const [s, sd] of [[a + inset, -1], [b - inset, 1]]) {
    const w0 = X(s + sd * inset, 0, z0), f0 = X(s, d, z0), g0 = sd < 0 ? w0 : f0, g1 = sd < 0 ? f0 : w0, rp = _scbgWallPlane([g0[0], g0[2]], [g1[0], g1[2]]), len = rp.len, hh2 = z1 - z0;
    const rects = [[0, z0, 0.09, hh2, 1], [len - 0.09, z0, 0.09, hh2, 1], [0, z0, len, 0.09, 1], [0, z1 - 0.09, len, 0.09, 1], [0, z0 + hh2 * 0.5, len, 0.06, 2], [len * 0.5 - 0.035, z0, 0.07, hh2, 2]];
    const ret = _sctfFace([X(s + sd * inset, 0, z0), X(s, d, z0), X(s, d, z1), X(s + sd * inset, 0, z1)], _scbgDark(bk.plaster, 0.1), { n: [pl.U[0] * sd, 0, pl.U[2] * sd], plane: rp });
    if (sd < 0) { ret.poly = [X(s + sd * inset, 0, z0), X(s, d, z0), X(s, d, z1), X(s + sd * inset, 0, z1)]; } else { ret.poly = [X(s, d, z0), X(s + sd * inset, 0, z0), X(s + sd * inset, 0, z1), X(s, d, z1)]; }
    ret.elems = [{ k: 'tframe', s0: 0, s1: len, z0, z1, storey: 1, rects, quads: [], col: bk.col, pitch: 0.3, studZone: null }];
    ret.edge = wall.edge; ret.role = 'oriel';
    faces.push(ret);
  }
  faces.push(_sctfFace([X(a, 0, z1 + 0.34), X(b, 0, z1 + 0.34), X(b - inset * 0.4, d + 0.06, z1 + 0.02), X(a + inset * 0.4, d + 0.06, z1 + 0.02)], '#8a4a36', { part: 'roof', role: 'roof' }));
  faces.push(_sctfFace([X(a + inset, d, z0), X(b - inset, d, z0), X(b, 0, z0 - 0.32), X(a, 0, z0 - 0.32)], _scbgDark(bk.col, 0.1), { part: 'wall', role: 'soffit' }));   // the corbel's underside, seen from the lane
  return faces;
};

/* ---------- the style's hooks, shared with the style file ---------- */
const _SCTF_HOOKS = Object.freeze({ resolve: _sctfResolve, build: _sctfBuild });

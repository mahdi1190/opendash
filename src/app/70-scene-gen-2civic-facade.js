/* ============================================================
   SCENE ENGINE v2: CIVIC FACADES for the procedural building generator (companion of 70-scene-gen-1civic.js, which has the crowns).
   PURE: functions only. Private names: _scbc. A style's `front` / `side` hooks name _scbcFacade; its `frontBlocks` names _scbcFrontBlocks.

     _scbcFacade(sp, face, model, out, role)   a civic wall: a rusticated base with arched openings and (on a front) a central door, a
                                               GIANT ORDER of engaged pilasters or columns over the middle storeys (two tiers with a
                                               string course between them on a tall block), windows between the shafts, an entablature
                                               with a deep cornice, an attic storey under a crowning cornice, a balustraded parapet. The
                                               style's `civic` data tunes it: { bay (m), order: 'pilaster' | 'column', entab, course, pil }
     _scbcFrontBlocks(sp, face, model)         the blocks of a front: a central pediment (tympanum) for a `pediment` crown
     _scbcElem(e, face, ctx, T)                the element kinds rustic, order, entab, balus, clock, louvre, cquoins and flood
     _scbcBlock(bk, wall, sp, model)           the block kind tympanum
   Every element takes its detail from the tier T of its storey (0 tone bands .. 3 fluting, modillions, balusters), as the walls do.
   ============================================================ */

/**
 * A civic facade on a wall of length len (see the header). role: 'front' | 'side'.
 */
function _scbcFacade(sp, face, model, out, role) {
  const st = sp.style, cv = st.civic || {}, len = face.plane.len, nS = sp.storeys, zs = sp.zs, E0 = model.E0, par = model.E - model.E0, side = role === 'side';
  const hOf = (i) => zs[i + 1] - zs[i];
  const nb = _scbgCl(Math.round(len / (cv.bay || 4.6)), 1, 60), bw = len / nb, cx = [];
  for (let i = 0; i < nb; i++) cx.push(bw * (i + 0.5));
  const rus = nS >= 6 ? 2 : 1, attic = nS >= 5 ? 1 : 0, zR = zs[Math.min(rus, nS)], zA = zs[Math.max(rus, nS - attic)];
  const ent = Math.min(cv.entab || 2.2, hOf(Math.max(0, nS - attic - 1)) * 0.55), zO = zA - ent, pier = Math.min(1.3, bw * 0.3), pil = cv.pil || 0.9;
  const E = out.elems, mid = Math.floor(nb / 2), doorBay = !side && role === 'front' && nb >= 3 ? mid : -1;
  // the rusticated base, its string course, the openings
  E.push({ k: 'rustic', s0: 0, s1: len, z0: 0, z1: zR - 0.45, course: cv.course || 1.0 });
  E.push({ k: 'band', s0: 0, s1: len, z0: zR - 0.45, z1: zR, col: _scbgLight(sp.dress, 0.1), layer: 2, o: 0.14 });
  for (let f = 0; f < Math.min(rus, nS); f++) for (let i = 0; i < nb; i++) {
    if (f === 0 && i === doorBay) continue;
    const hS = hOf(f);
    E.push(_scbgWin(sp, f, cx[i], bw, { w: Math.min(2.2, bw * 0.46), head: f === 0 ? 'round' : 'flat', h: f === 0 ? hS * 0.66 : hS * 0.55, recess: 0.2, hm: hS }));
  }
  if (doorBay >= 0) E.push({ k: 'portal', s: cx[doorBay] - Math.min(1.5, bw * 0.3) - 0.55, w: Math.min(3, bw * 0.6) + 1.1, h: Math.min(hOf(0) * 0.8, 4.6) + 0.8, hm: hOf(0) });
  if (doorBay >= 0) E.push({ k: 'door', s: cx[doorBay] - Math.min(1.5, bw * 0.3), z: 0.02, w: Math.min(3, bw * 0.6), h: Math.min(hOf(0) * 0.8, 4.6), head: 'round', fan: true, panels: 0, glass: true, recess: 0.35, col: '#3a3834' });
  // the order: tiers of shafts between the base and the entablature; windows in every bay, round-headed under the cornice
  const nOrd = Math.max(0, nS - attic - rus), split = nOrd > 5 ? rus + Math.ceil(nOrd / 2) : -1, zS = split > 0 ? zs[split] : null;
  for (let f = rus; f < nS - attic; f++) for (let i = 0; i < nb; i++) {
    const hS = hOf(f), last = f === nS - attic - 1;
    E.push(_scbgWin(sp, f, cx[i], bw, { w: Math.max(1.2, Math.min(2.3, bw * 0.44)), head: last ? 'round' : 'flat', h: Math.min(hS * 0.66, hS - 1.9), hm: hS }));
  }
  const runs = split > 0 ? [[zR, zS - 0.8], [zS + 0.4, zO]] : [[zR, zO]];
  for (const [r0, r1] of runs) {
    for (let i = 0; i <= nb; i++) {
      const edge = i === 0 || i === nb, s = i === 0 ? pier * 0.5 : i === nb ? len - pier * 0.5 : i * bw;
      E.push({ k: 'order', kind: cv.order || 'pilaster', s, z0: r0, z1: r1, w: edge ? pier * 0.8 : pil, hm: hOf(rus) });
    }
  }
  if (split > 0) E.push({ k: 'entab', small: true, s0: 0, s1: len, z0: zS - 0.8, z1: zS + 0.4, hm: hOf(rus) });
  E.push({ k: 'entab', s0: 0, s1: len, z0: zO, z1: zA, hm: hOf(Math.max(0, nS - 2)) });
  // the attic storey and the crowning cornice
  if (attic) {
    const hS = hOf(nS - 1);
    for (let i = 0; i < nb; i++) E.push(_scbgWin(sp, nS - 1, cx[i], bw, { w: Math.max(1, bw * 0.3), h: Math.min(hS * 0.5, 2.0), type: 'sash', panes: [2, 1], head: 'flat', hm: hS }));
    E.push({ k: 'entab', small: true, s0: 0, s1: len, z0: E0 - 1.0, z1: E0, hm: hS });
  }
  E.push({ k: 'cquoins', len, z0: zR, z1: E0 - 1, w: pier, hm: hOf(rus) });
  if (par > 0.3) E.push({ k: 'balus', s0: 0, s1: len, z0: E0, z1: model.E, hm: hOf(Math.max(0, nS - 1)) });
  E.push({ k: 'flood', s0: 0, s1: len, z0: 0, z1: model.E, hm: hOf(rus) });
}
/** A style's front blocks: a central pediment for a `pediment` crown. */
function _scbcFrontBlocks(sp, face, model) {
  if (sp.crown !== 'pediment') return [];
  const len = face.plane.len;
  return [{ kind: 'tympanum', s0: len * 0.32, s1: len * 0.68, z: model.E, k: 0.17, col: sp.dress }];
}

/* ---------- elements ---------- */
/** The civic element kinds (called by _scbgDrawElem for a kind it does not know): true when handled. */
function _scbcElem(e, face, ctx, T) {
  const { view, sink, sp, season } = ctx, pl = face.plane, shade = _scbgFaceShade(face, ctx), dress = sp.dress, wallCol = face.col;
  const add = (layer, pts, f, extra) => { if (pts) sink.add(layer, Object.assign({ f, d: _scbgPath(pts), op: 1, part: 'body' }, extra || {})); };
  const rc = (s, z, w, h, o) => _scbgRect(pl, view, s, z, w, h, o);
  const seasonal = (c) => _scbgSeasonal(c, season);
  switch (e.k) {
    case 'rustic': {
      if (T < 1) return true;
      const course = e.course || 1, g = T >= 2 ? 0.11 : 0.18, grooves = [], joints = [];
      let k = 0;
      for (let z = e.z0 + course; z < e.z1 - 0.15; z += course, k++) {
        const p = rc(e.s0, z - g / 2, e.s1 - e.s0, g, 0.01); if (p) grooves.push(_scbgPath(p));
        if (T >= 2) { const step = course * 2.1; for (let s = e.s0 + (k % 2 ? step * 0.5 : step * 0.15) + 0.3; s < e.s1 - 0.2; s += step) { const q = rc(s - 0.04, z - course + g / 2, 0.08, course - g, 0.01); if (q) joints.push(_scbgPath(q)); } }
      }
      const tone = seasonal(_scbgDark(wallCol, 0.3 + shade * 0.4));
      if (grooves.length) sink.add(1, { f: tone, d: grooves.join(''), op: 0.62, part: 'body', detail: true });
      if (joints.length) sink.add(1, { f: tone, d: joints.join(''), op: 0.5, part: 'body', detail: true });
      return true;
    }
    case 'order': {
      if (T < 1) return true;
      const w = e.w, col = e.kind === 'column', o = col ? 0.3 : 0.14, cap = T >= 2 ? Math.min(0.85, w * 0.85) : 0, bas = T >= 2 ? w * 0.45 : 0, shaftH = e.z1 - e.z0 - cap - bas;
      if (shaftH < 0.5) return true;
      add(3, rc(e.s - w / 2, e.z0 + bas, w, shaftH, o), seasonal(_scbgDark(dress, shade * 0.5)));
      add(3, rc(e.s + w * 0.18, e.z0 + bas, w * 0.32, shaftH, o + 0.01), seasonal(_scbgDark(dress, 0.22 + shade * 0.5)), { op: 0.85 });   // the shaded side
      if (col || T >= 2) add(3, rc(e.s - w * 0.5, e.z0 + bas, w * 0.14, shaftH, o + 0.01), seasonal(_scbgLight(dress, 0.12)), { op: 0.8 });
      if (cap) {
        add(4, rc(e.s - w * 0.66, e.z1 - cap, w * 1.32, cap, o + 0.06), seasonal(_scbgLight(dress, 0.06 - shade * 0.3)));
        add(4, rc(e.s - w * 0.72, e.z1 - cap * 0.2, w * 1.44, cap * 0.2, o + 0.08), seasonal(_scbgDark(dress, 0.12 + shade * 0.4)));
        add(4, rc(e.s - w * 0.62, e.z0, w * 1.24, bas, o + 0.05), seasonal(_scbgDark(dress, 0.16 + shade * 0.4)));
        if (T >= 3) { const fl = []; for (let k = 1; k < 5; k++) { const p = rc(e.s - w / 2 + w * k / 5 - 0.015, e.z0 + bas, 0.03, shaftH, o + 0.02); if (p) fl.push(_scbgPath(p)); } if (fl.length) sink.add(4, { f: _scbgDark(dress, 0.34), d: fl.join(''), op: 0.5, part: 'body', detail: true }); }
      }
      return true;
    }
    case 'entab': {
      const h = e.z1 - e.z0, L = e.s1 - e.s0, small = !!e.small, hc = h * (small ? 0.5 : 0.36), out = small ? 0.35 : 0.6;
      if (T < 1 && h < 1) return true;
      add(2, rc(e.s0, e.z0, L, h - hc, 0.1), seasonal(_scbgLight(_scbgDark(dress, shade * 0.5), 0.03)));   // architrave and frieze
      if (!small && T >= 2) add(2, rc(e.s0, e.z0 + h * 0.16, L, h * 0.28, 0.12), seasonal(_scbgDark(dress, 0.12 + shade * 0.4)), { op: 0.7, detail: true });   // the frieze, a shade deeper
      add(5, rc(e.s0 - 0.05, e.z1 - hc, L + 0.1, hc, out), seasonal(_scbgLight(_scbgDark(dress, shade * 0.4), 0.1)));
      // the soffit, seen from below: a dark quad from the wall to the cornice's front, and the shadow it throws on the frieze
      const sf = [_scbgOn(pl, e.s0, e.z1 - hc, 0), _scbgOn(pl, e.s1, e.z1 - hc, 0), _scbgOn(pl, e.s1, e.z1 - hc, out), _scbgOn(pl, e.s0, e.z1 - hc, out)];
      if (sf.every(p => p[2] >= view.near)) add(4, sf.map(view.P), seasonal(_scbgDark(dress, 0.46)));
      if (T >= 1) add(4, rc(e.s0, e.z1 - hc - Math.min(0.5, h * 0.18), L, Math.min(0.5, h * 0.18), 0.1), seasonal(_scbgDark(dress, 0.5)), { op: 0.34 });
      if (T >= 3) { const m = []; for (let s = e.s0 + 0.3; s < e.s1 - 0.3; s += small ? 0.55 : 0.75) { const p = rc(s, e.z1 - hc - h * 0.14, 0.26, h * 0.14, out * 0.8); if (p) m.push(_scbgPath(p)); } if (m.length) sink.add(5, { f: seasonal(_scbgDark(dress, 0.3)), d: m.join(''), op: 0.9, part: 'body', detail: true }); }
      return true;
    }
    case 'balus': {
      const L = e.s1 - e.s0, hb = e.z1 - e.z0;
      add(5, rc(e.s0, e.z0, L, hb, 0.18), seasonal(_scbgDark(dress, 0.32 + shade * 0.3)), { op: 0.9 });   // the shaded back of the parapet seen between the balusters
      add(6, rc(e.s0, e.z0, L, Math.min(0.28, hb * 0.2), 0.22), seasonal(_scbgLight(dress, 0.05)));
      add(6, rc(e.s0, e.z1 - Math.min(0.24, hb * 0.2), L, Math.min(0.24, hb * 0.2), 0.24), seasonal(_scbgLight(dress, 0.14)));
      if (T >= 1) {
        const segs = [], step = T >= 3 ? 0.36 : T >= 2 ? 0.5 : 0.9, wb = step * 0.5;
        for (let s = e.s0 + 0.12; s < e.s1 - 0.12; s += step) { const p = rc(s, e.z0 + hb * 0.2, wb, hb * 0.6, 0.2); if (p) segs.push(_scbgPath(p)); }
        if (segs.length) sink.add(6, { f: seasonal(_scbgLight(dress, 0.07)), d: segs.join(''), op: 1, part: 'body' });
        const pr = [];
        for (let s = e.s0 + 0.2; s < e.s1; s += T >= 2 ? 5.5 : 11) { const p = rc(Math.min(s, e.s1 - 0.5), e.z0, 0.5, hb, 0.26); if (p) pr.push(_scbgPath(p)); }
        if (pr.length) sink.add(6, { f: seasonal(_scbgLight(dress, 0.1)), d: pr.join(''), op: 1, part: 'body' });
      }
      return true;
    }
    case 'clock': {
      const N = T >= 2 ? 24 : 12, ring = (r) => { const p = []; for (let i = 0; i < N; i++) { const a = i / N * _scbcTau; p.push([e.s + r * Math.cos(a), e.z + r * Math.sin(a)]); } return p; };
      const sur = _scbgMap(pl, view, ring(e.r * 1.2), 0.1), rim = _scbgMap(pl, view, ring(e.r * 1.04), 0.14), face2 = _scbgMap(pl, view, ring(e.r * 0.96), 0.16);
      if (sur) add(3, sur, seasonal(_scbgDark(dress, 0.14 + shade * 0.4)));
      if (rim) add(4, rim, '#b99a52');
      if (face2) add(5, face2, '#f0ead8', { glow: 'core', theta: 0.0625 });
      if (T >= 1 && face2) {
        // the hands at ten past ten
        const hand = (ang, len, wd) => { const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa * wd, nz = ca * wd; return _scbgMap(pl, view, [[e.s + nx, e.z + nz], [e.s + ca * len + nx * 0.3, e.z + sa * len + nz * 0.3], [e.s + ca * len - nx * 0.3, e.z + sa * len - nz * 0.3], [e.s - nx, e.z - nz]], 0.18); };
        const hs = [hand(Math.PI / 2 + 0.52, e.r * 0.6, e.r * 0.05), hand(Math.PI / 2 - 0.52 - 0.2, e.r * 0.86, e.r * 0.035)].filter(Boolean).map(p => _scbgPath(p));
        if (hs.length) sink.add(6, { f: '#222428', d: hs.join(''), op: 1, part: 'body' });
        if (T >= 2) {
          const tk = [];
          for (let k = 0; k < 12; k++) { const a = k / 12 * _scbcTau, r0 = e.r * 0.8, r1 = e.r * (k % 3 === 0 ? 0.92 : 0.88), ca = Math.cos(a), sa = Math.sin(a), wd = e.r * 0.025; const p = _scbgMap(pl, view, [[e.s + ca * r0 - sa * wd, e.z + sa * r0 + ca * wd], [e.s + ca * r1 - sa * wd, e.z + sa * r1 + ca * wd], [e.s + ca * r1 + sa * wd, e.z + sa * r1 - ca * wd], [e.s + ca * r0 + sa * wd, e.z + sa * r0 - ca * wd]], 0.17); if (p) tk.push(_scbgPath(p)); }
          if (tk.length) sink.add(6, { f: '#33302a', d: tk.join(''), op: 0.9, part: 'body', detail: true });
        }
      }
      return true;
    }
    case 'portal': {   // a stone surround round a doorway, with a keystone
      const sur = _scbgMap(pl, view, _scbgOpening({ s: e.s, w: e.w, z: 0, h: e.h, head: 'round' }), 0.12);
      if (sur) add(2, sur, seasonal(_scbgLight(_scbgDark(dress, shade * 0.4), 0.06)));
      if (T >= 2) add(3, rc(e.s + e.w / 2 - 0.3, e.h - 0.2, 0.6, 0.8, 0.16), seasonal(_scbgLight(dress, 0.12)));
      return true;
    }
    case 'louvre': {
      const sur = _scbgMap(pl, view, _scbgOpening(Object.assign({}, e, { s: e.s - 0.16, w: e.w + 0.32, z: e.z - 0.1, h: e.h + 0.2 })), 0.06);
      if (sur) add(2, sur, seasonal(_scbgDark(dress, 0.1 + shade * 0.4)));
      const open = _scbgMap(pl, view, _scbgOpening(e), -0.2);
      if (open) add(3, open, '#262c35');
      if (T >= 2) {
        const sl = [];
        for (let z = e.z + 0.3; z < e.z + e.h - e.w * 0.55; z += 0.34) { const p = _scbgMap(pl, view, [[e.s + 0.1, z], [e.s + e.w - 0.1, z], [e.s + e.w - 0.1, z + 0.12], [e.s + 0.1, z + 0.12]], -0.18); if (p) sl.push(_scbgPath(p)); }
        if (sl.length) sink.add(4, { f: '#566070', d: sl.join(''), op: 0.8, part: 'body', detail: true });
      }
      return true;
    }
    case 'cquoins': {
      const w = e.w || 0.8;
      if (T < 2) { for (const s of [0, e.len - w]) add(2, rc(s, e.z0, w, e.z1 - e.z0, 0.04), seasonal(_scbgLight(_scbgDark(dress, shade * 0.5), 0.02)), { op: 0.7 }); return true; }
      const segs = [], h = 0.9;
      for (let z = e.z0, k = 0; z < e.z1 - 0.2; z += h, k++) for (const [s, ww] of [[0, k % 2 ? w * 0.7 : w], [e.len - (k % 2 ? w * 0.7 : w), k % 2 ? w * 0.7 : w]]) { const p = rc(s, z, ww, h - 0.08, 0.05); if (p) segs.push(_scbgPath(p)); }
      if (segs.length) sink.add(2, { f: seasonal(_scbgLight(_scbgDark(dress, shade * 0.5), 0.02)), d: segs.join(''), op: 0.8, part: 'body' });
      return true;
    }
    case 'flood': {
      // after dark a floodlit wall: warm light washing up from the foot in fading bands (lit shapes, drawn after dusk only)
      const h = e.z1 - e.z0, nf = (sp.style.night && sp.style.night.flood) || 0;
      if (!(nf > 0)) return true;
      for (let k = 0; k < 3; k++) { const p = rc(e.s0, e.z0 + h * k / 3 * 0.9, e.s1 - e.s0, h / 3 * 0.9 + (k === 2 ? h * 0.1 : 0), 0.3); if (p) sink.add(9, { f: '#ffe6ae', d: _scbgPath(p), op: nf * (1 - k * 0.3), part: 'lit' }); }
      return true;
    }
    default: return false;
  }
}

/* ---------- blocks: a central pediment (tympanum) ---------- */
/** The civic block kinds (called by _scbgBlock for a kind it does not know): a tympanum, the triangular pediment over a centre bay. -> faces | null */
function _scbcBlock(bk, wall, sp, model) {
  const pl = wall.plane, W = (s, o) => { const p = _scbgOn(pl, s, 0, o); return [p[0], p[2]]; };
  if (bk.kind !== 'tympanum') return null;
  const m = (bk.s0 + bk.s1) / 2, X = (s, z, o) => { const p = W(s, o == null ? 0.2 : o); return [p[0], z, p[1]]; }, hh = (bk.s1 - bk.s0) * bk.k, zt = bk.z;
  const mk = (poly, col, part, role) => ({ poly, n: [pl.N[0], 0, pl.N[2]], part: part || 'wall', role: role || 'gable', col, elems: [], flat: true });
  const out = [];
  out.push(mk([X(bk.s0, zt), X(bk.s1, zt), X(m, zt + hh)], _scbgDark(bk.col, 0.18)));   // the tympanum, a shade deeper than the stone
  const band = (sa, za, sb, zb, th) => { const p0 = X(sa, za, 0.5), p1 = X(sb, zb, 0.5); return [p0, p1, [p1[0], p1[1] + th, p1[2]], [p0[0], p0[1] + th, p0[2]]]; };
  out.push(mk(band(bk.s0 - 0.5, zt - 0.2, m, zt + hh, 0.7), _scbgLight(bk.col, 0.1), 'roof', 'coping'), mk(band(m, zt + hh, bk.s1 + 0.5, zt - 0.2, 0.7), _scbgLight(bk.col, 0.1), 'roof', 'coping'));
  out.push(mk([X(bk.s0 - 0.5, zt - 0.7, 0.5), X(bk.s1 + 0.5, zt - 0.7, 0.5), X(bk.s1 + 0.5, zt, 0.5), X(bk.s0 - 0.5, zt, 0.5)], _scbgLight(bk.col, 0.05), 'roof', 'coping'));
  return out;
}

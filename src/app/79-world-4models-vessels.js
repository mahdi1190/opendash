/* ============================================================
   WORLD ENGINE v3.1, package appearance: VESSEL MODELS (docs/dev/WORLD_MODELS.md; the user, 16 Oct: "we want models for everything
   repeatable"; ferries drawn as repeated slabs, sailing boats as paper triangles, toy fishing boats). Private names: _wmdVes.
   PURE classic script: nothing runs at load but worldModelDefine calls (the registry is created on first use).

   Every vessel is a small generator over the model kit (79-world-4models.js): a HULL LOFTED from stations (a plan outline, a sheer,
   flare, a raked stem and counter, bands of colour: antifouling, boot-top, stripe, topsides, cut at the waterline when it heels), a
   deckhouse built from a plan polygon with its own windows (lit after dusk by the seeded rule), rails on posts, funnels, masts,
   sails as cloth with a belly, davits and ship's boats. Builders are written in NOMINAL metres of the class and scaled by the
   entity's own size (V = _wmdVesCtx); a heel is a real rotation of every point.

   models (model id: object ids):
     ferry-river  boat.river-ferry   a double-ended Mersey ferry          ferry-trip  boat.ferry, boat.trip-boat   a trip boat
     ferry-car    boat.island-ferry  a roll-on roll-off car ferry
     dinghy       boat.dinghy, boat.fpv-dinghy-moored                     yacht       boat.us-newport-sloop, boat.yacht
     fishing      boat.fishing-boat, boat.us-maine-fishing (trawler, potter), boat.coble (a Whitby coble)
     tug          boat.tug                                                lifeboat    boat.lifeboat
     steamer      boat.paddle-steamer, boat.us-memphis-paddle-steamer     barge       boat.canal-barge
     rowing       boat.rowing-boat                                        paddle      boat.kayak, boat.canoe, boat.us-new-river-canoe
   The classes that the library had no id for are registered as library objects at the end of this file (their sprite is borrowed
   from the nearest drawing, only the fallback: the model draws them).
   ============================================================ */

/* ---------- small helpers ---------- */
const _wmdVesClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _wmdVesLerp = (a, b, t) => a + (b - a) * t;

/**
 * The scaled drawing context of a vessel: nominal metres in (a along, l across, y up), the entity's own size out. Everything is
 * built from V.face / V.line / V.disc so that V.heel(rad) (a rotation about the keel line) turns the whole boat.
 */
function _wmdVesCtx(h, p, L0, B0, H0) {
  const ka = p.L / L0, kl = p.B / B0, ky = p.H / H0, kr = Math.sqrt(ka * kl);
  const V = { h, p, ka, kl, ky, kr, xf: null, crewLit: null };   // crewLit: the largest 'theta' of a lit pane (a vessel with a crew aboard: lit in any dusk)
  /** Heel the whole boat by rad about its centre line at the waterline (+: the +l side goes down). */
  V.heel = (rad) => { if (!rad) { V.xf = null; return; } const c = Math.cos(rad), s = Math.sin(rad); V.xf = (a, l, y) => [a, l * c + y * s, y * c - l * s]; };
  V.X = (a, l, y) => (V.xf ? V.xf(a, l, y) : [a, l, y]);
  V.P0 = (a, l, y) => h.P(a * ka, l * kl, y * ky);
  V.P = (a, l, y) => { const q = V.X(a, l, y); return h.P(q[0] * ka, q[1] * kl, q[2] * ky); };
  V.pt = (q) => { const t = V.X(q[0], q[1], q[2]); return [t[0] * ka, t[1] * kl, t[2] * ky]; };
  V.plan = (pl) => pl.map(q => [q[0] * ka, q[1] * kl]);
  V.depth = (a, l, y) => { const q = V.P(a, l, y); return Math.hypot(q[0], q[1] - h.cam.eye, q[2]); };
  V.sees = (d, at) => h.sees(d, [at[0] * ka, at[1] * kl, at[2] * ky]);
  V.px = (m) => h.px(m * kr);
  V.facets = (r) => { const q = h.px(r * kr); return q < 3 ? 6 : q < 12 ? 8 : 12; };
  /** A part drawn by layer, then far to near by the true centre of the thing (a, l, y nominal), not by its visible faces. */
  V.part = (name, a, l, y, layer) => h.part(name, { layer: layer == null ? 2 : layer, key: V.depth(a, l, y) });
  /** The side (+1 / -1) of the boat that faces the eye (0: end-on). A line on the far side is drawn before the hull, one on the near side after. */
  V.nearSide = () => (V.sees([0, 1, 0], [0, 1, 1]) ? 1 : V.sees([0, -1, 0], [0, -1, 1]) ? -1 : 0);
  V.sidePart = (name, sg, a, l, y) => V.part(name + (sg > 0 ? 'R' : 'L'), a, l, y, (V.nearSide() === sg || V.nearSide() === 0) ? 3.5 : 2.5);
  V.face = (pts, hex, mat, role, inside, extra) => h.face(pts.map(q => V.P(q[0], q[1], q[2])), hex, mat, role, Array.isArray(inside) ? V.P(inside[0], inside[1], inside[2]) : inside, extra);
  /** A face cut at the waterline (nominal y = 0 after the heel): only what is above the water is drawn. */
  V.faceCut = (pts, hex, mat, role, inside, extra) => {
    const Q = pts.map(q => V.X(q[0], q[1], q[2])), out = [];
    for (let i = 0; i < Q.length; i++) {
      const A = Q[i], B = Q[(i + 1) % Q.length], ia = A[2] >= 0, ib = B[2] >= 0;
      if (ia) out.push(A);
      if (ia !== ib) { const t = A[2] / (A[2] - B[2]); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, 0]); }
    }
    if (out.length < 3) return null;
    const ins = Array.isArray(inside) ? V.P(inside[0], inside[1], inside[2]) : inside;
    return h.face(out.map(q => h.P(q[0] * ka, q[1] * kl, q[2] * ky)), hex, mat, role, ins, extra);
  };
  /** A solid between two plan outlines (the kit's frustum, through V.face so that it heels). o: { mat, role, cap (hex | false), extra }. */
  V.solid = (pl0, y0, pl1, y1, hex, o) => {
    o = o || {};
    const n = pl0.length, ma = pl0.reduce((s, q) => s + q[0], 0) / n, ml = pl0.reduce((s, q) => s + q[1], 0) / n, ref = [ma, ml, (y0 + y1) / 2], mat = o.mat || 'paint', role = o.role || 'body';
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; V.face([[pl0[i][0], pl0[i][1], y0], [pl0[j][0], pl0[j][1], y0], [pl1[j][0], pl1[j][1], y1], [pl1[i][0], pl1[i][1], y1]], hex, mat, role, ref, o.extra); }
    if (o.cap !== false) V.face(pl1.map(([a, l]) => [a, l, y1]), typeof o.cap === 'string' ? o.cap : hex, mat, role, ref, o.extra);
  };
  V.frustum = (pl0, y0, pl1, y1, hex, o) => V.solid(pl0, y0, pl1, y1, hex, o);
  V.prism = (plan, y0, y1, hex, o) => V.solid(plan, y0, plan, y1, hex, o);
  V.box = (a0, a1, l0, l1, y0, y1, hex, top, mat, role, extra) => V.solid([[a0, l0], [a1, l0], [a1, l1], [a0, l1]], y0, [[a0, l0], [a1, l0], [a1, l1], [a0, l1]], y1, hex, { mat: mat || 'paint', role: role || 'body', cap: top || hex, extra });
  V.cyl = (a, l, y0, y1, r0, r1, hex, o) => { const n = (o && o.n) || V.facets(Math.max(r0, r1 == null ? r0 : r1)); V.solid(_wmdVesEllipse(a, l, r0, r0, n), y0, _wmdVesEllipse(a, l, r1 == null ? r0 : r1, r1 == null ? r0 : r1, n), y1, hex, o); };
  /** A tube between two nominal points, radius r (a boom, a spar, a pipe, a limb). */
  V.tube = (p0, p1, r, hex, mat, role, o) => {
    o = o || {};
    const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], Ld = Math.hypot(d[0], d[1], d[2]) || 1e-9, e = d.map(v => v / Ld);
    const ref = Math.abs(e[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], cr = (x, y) => [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
    let u = cr(e, ref); const lu = Math.hypot(u[0], u[1], u[2]) || 1; u = u.map(v => v / lu);
    const v = cr(e, u), n = o.n || V.facets(r), r0 = [], r1 = [];
    for (let k = 0; k < n; k++) {
      const th = (k + 0.5) / n * Math.PI * 2, c = Math.cos(th) * r, s = Math.sin(th) * r, off = [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s];
      r0.push([p0[0] + off[0], p0[1] + off[1], p0[2] + off[2]]); r1.push([p1[0] + off[0], p1[1] + off[1], p1[2] + off[2]]);
    }
    const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2];
    for (let k = 0; k < n; k++) { const j = (k + 1) % n; V.face([r0[k], r0[j], r1[j], r1[k]], hex, mat || 'paint', role || 'body', mid, o.extra); }
    if (o.cap !== false) { V.face(r1, o.capHex || hex, mat || 'paint', role || 'body', mid, o.extra); V.face(r0, o.capHex || hex, mat || 'paint', role || 'body', mid, o.extra); }
  };
  V.line = (pts, w, hex, mat, role, extra) => h.line(pts.map(q => V.P(q[0], q[1], q[2])), w * kr, hex, mat, role, extra);
  V.disc = (c, r, hex, mat, role, k, extra) => h.disc(V.P(c[0], c[1], c[2]), r * kr, hex, mat, role, k, extra);
  V.lamp = (a, l, y, r, o) => {
    o = o || {};
    const c = V.P(a, l, y), fc = h.disc(c, r * kr, o.off || '#d9d2b8', 'glass', 'lamp', 1, { theta: o.theta != null ? o.theta : 0, lit: o.col || '#ffe2a0', halo: o.halo !== false });
    h.lights.push({ x: c[0], y: c[1], z: c[2], r: r * kr, col: o.col || '#ffe2a0', kind: o.kind || 'lamp' });
    return fc;
  };
  V.cloth = (c, belly, hex, o) => h.cloth(c.map(q => V.pt(q)), belly * kr, hex, o);
  /** A rail along a plan path [[a, l]...] at y (foot), height hgt: a top rail, an optional mid rail, posts every o.post m. */
  V.rail = (path, y, hgt, hex, o) => {
    o = o || {};
    const mat = o.mat || 'metal', role = o.role || 'rail', w = o.w || 0.03, step = o.post || 1.2;
    V.line(path.map(([a, l]) => [a, l, y + hgt]), w, hex, mat, role);
    if (o.mid) V.line(path.map(([a, l]) => [a, l, y + hgt * 0.5]), w * 0.8, hex, mat, role);
    if (V.px(step) < 4) return;
    let acc = 0;
    const put = (a, l) => V.line([[a, l, y], [a, l, y + hgt]], w * 0.9, hex, mat, role);
    for (let i = 0; i < path.length; i++) {
      const pt = path[i];
      if (i === 0) { put(pt[0], pt[1]); continue; }
      const q = path[i - 1], seg = Math.hypot(pt[0] - q[0], pt[1] - q[1]);
      for (let s = step - acc; s < seg; s += step) put(q[0] + (pt[0] - q[0]) * s / seg, q[1] + (pt[1] - q[1]) * s / seg);
      acc = (acc + seg) % step;
      if (i === path.length - 1) put(pt[0], pt[1]);
    }
  };
  /** Decals on a vertical wall from (a, l) along (da, dl) with outward direction (na, nl): fn(u, v, off) with u along the wall (m), v the height. */
  V.wall = (a, l, da, dl, na, nl) => h.surface((u, v, off) => V.P(a + da * u + na * (off || 0), l + dl * u + nl * (off || 0), v), { normal: [na, nl, 0] });
  return V;
}

/** An ellipse plan (a, l) of n points. */
function _wmdVesEllipse(a, l, ra, rl, n) { const o = []; n = n || 10; for (let k = 0; k < n; k++) { const th = k / n * Math.PI * 2; o.push([a + Math.cos(th) * ra, l + Math.sin(th) * rl]); } return o; }

/** A deckhouse plan: a0..a1 along, +-hb across, aft and fore ends square (r 0) or rounded (semi-ellipse of depth rA, rF). */
function _wmdVesPlan(a0, a1, hb, rA, rF, n) {
  n = n || 6;
  const pl = [[a0 + rA, hb], [a1 - rF, hb]];
  if (rF > 0.01) { for (let k = 1; k < n; k++) { const ph = k / n * Math.PI; pl.push([a1 - rF + rF * Math.sin(ph), hb * Math.cos(ph)]); } pl.push([a1 - rF, -hb]); }
  else pl.push([a1, -hb]);
  pl.push([a0 + rA, -hb]);
  if (rA > 0.01) for (let k = 1; k < n; k++) { const ph = k / n * Math.PI; pl.push([a0 + rA - rA * Math.sin(ph), -hb * Math.cos(ph)]); }
  return pl;
}
/** A plan grown by d metres all round (from its centroid). */
function _wmdVesGrow(pl, d) {
  const n = pl.length, ca = pl.reduce((s, q) => s + q[0], 0) / n, cl = pl.reduce((s, q) => s + q[1], 0) / n;
  return pl.map(([a, l]) => { const da = a - ca, dl = l - cl, r = Math.hypot(da, dl) || 1; return [a + da / r * d, l + dl / r * d]; });
}
/** The two halves of a closed plan (the right and the left runs, from the aft-most point to the fore-most): paths for rails. */
function _wmdVesRuns(pl) {
  let imin = 0, imax = 0;
  pl.forEach((q, i) => { if (q[0] < pl[imin][0] - 1e-6 || (Math.abs(q[0] - pl[imin][0]) < 1e-6 && q[1] > pl[imin][1])) imin = i; if (q[0] > pl[imax][0] + 1e-6 || (Math.abs(q[0] - pl[imax][0]) < 1e-6 && q[1] > pl[imax][1])) imax = i; });
  const run = (i0, i1) => { const out = [pl[i0]]; for (let i = i0; i !== i1; ) { i = (i + 1) % pl.length; out.push(pl[i]); } return out; };
  const A = run(imin, imax), B = run(imax, imin);
  const mean = (r) => r.reduce((s, q) => s + q[1], 0) / r.length;
  return mean(A) >= mean(B) ? { right: A, left: B.slice().reverse() } : { right: B.slice().reverse(), left: A };
}

/**
 * A hull lofted from stations. S: { L, hb (half beam at the gunwale), kW (waterline half beam / gunwale half beam),
 *   bow, stern: { len, p, q (the end's curve: half = hb (tip + (1 - tip) (1 - u^p)^(1/q))), tip (the width left at the very end: a
 *   transom), rake (m the deck overhangs the waterline there), recede (m the keel line falls back below the waterline) },
 *   yd(a) (the gunwale or bulwark top), bulwark (m), draft (m under the waterline, cut away by the water), bilge (the half beam
 *   left at the keel, 0..1), bands: [{ to: m | (yd) => m | 'top', hex, mat, role }] (colour bands from the lowest up; the first reaches 0
 *   when there is a draft: it is the antifouling), step, nEnd, cut (cut at the waterline) }.
 * Emits the seen outer sides (into the current part). Returns { half, st (stations), rim(sg), deckPoly(inset), deck(), inner(), cap() }.
 */
function _wmdVesHull(V, S) {
  const h = V.h, L = S.L, hb = S.hb, kW = S.kW == null ? 0.84 : S.kW, draft = S.draft || 0, bilge = S.bilge == null ? 0.2 : S.bilge;
  const end = (e) => Object.assign({ len: 0.2 * L, p: 2, q: 2, tip: 0, rake: 0, recede: 0 }, e || {});
  const bow = end(S.bow), stern = end(S.stern), ab = L / 2 - bow.len, as = -L / 2 + stern.len;
  const half = (a) => {
    let u, e;
    if (a > ab) { u = (a - ab) / bow.len; e = bow; } else if (a < as) { u = (as - a) / stern.len; e = stern; } else return hb;
    u = _wmdVesClamp(u, 0, 1);
    return hb * (e.tip + (1 - e.tip) * Math.pow(Math.max(0, 1 - Math.pow(u, e.p)), 1 / e.q));
  };
  const zone = (a) => { if (a > ab) return Math.min(1, (a - ab) / bow.len); if (a < as) return -Math.min(1, (as - a) / stern.len); return 0; };
  const ov = (a) => { const u = zone(a); return u > 0 ? bow.rake * u * u : -stern.rake * u * u; };
  const rc = (a) => { const u = zone(a); return u > 0 ? bow.recede * u * u : -stern.recede * u * u; };
  const fine = V.px(L * 0.02) >= 1.2;   // a hull at a distance needs fewer stations
  const nE = S.nEnd || (fine ? 6 : 4), A = [];
  for (let k = nE; k >= 0; k--) A.push(as - stern.len * Math.sin(k / nE * Math.PI / 2));
  const mid = Math.max(0, ab - as), nM = Math.max(1, Math.ceil(mid / (S.step || Math.max(2, L / 6))));
  for (let k = 1; k < nM; k++) A.push(as + mid * k / nM);
  for (let k = 0; k <= nE; k++) A.push(ab + bow.len * Math.sin(k / nE * Math.PI / 2));
  const st = A.filter((a, i) => i === 0 || a > A[i - 1] + 1e-6).map(a => ({ a, hd: half(a), yd: S.yd(a), ov: ov(a), rc: rc(a) }));
  const bands = S.bands || [{ to: 'top', hex: '#888', mat: 'paint', role: 'hull' }];
  const toOf = (b, yd) => (b.to === 'top' ? yd : typeof b.to === 'function' ? Math.min(yd, b.to(yd)) : Math.min(yd, b.to));
  const rp = (s, y) => {
    if (y >= 0) { const t = s.yd > 1e-6 ? Math.min(1, y / s.yd) : 1; return [s.a - s.ov * (1 - t), s.hd * (kW + (1 - kW) * Math.pow(t, 0.7)), y]; }
    const q = Math.min(1, -y / draft);
    return [s.a - s.ov - s.rc * q, s.hd * kW * (1 - (1 - bilge) * Math.pow(q, 0.85)), y];
  };
  const ref = [0, 0, Math.max(0.3, S.yd(0) * 0.5)], face = draft > 0 || S.cut ? V.faceCut : V.face;
  for (let i = 0; i + 1 < st.length; i++) {
    const s0 = st[i], s1 = st[i + 1];
    let y0a = draft > 0 ? -draft : 0, y0b = y0a;
    for (const b of bands) {
      const y1a = toOf(b, s0.yd), y1b = toOf(b, s1.yd);
      if (y1a - y0a > 1e-4 || y1b - y0b > 1e-4) {
        const R = [rp(s0, y0a), rp(s1, y0b), rp(s1, y1b), rp(s0, y1a)];
        face(R, b.hex, b.mat || 'paint', b.role || 'hull', ref);
        face(R.map(q => [q[0], -q[1], q[2]]), b.hex, b.mat || 'paint', b.role || 'hull', ref);
      }
      y0a = y1a; y0b = y1b;
    }
  }
  // a blunt end (a transom, a punt's bow) is closed by a plate
  for (const [s, e] of [[st[0], stern], [st[st.length - 1], bow]]) {
    if (e.tip > 0.02) {
      let y0 = draft > 0 ? -draft : 0;
      for (const b of bands) {
        const y1 = toOf(b, s.yd);
        if (y1 - y0 > 1e-4) face([rp(s, y0), rp(s, y1), [rp(s, y1)[0], -rp(s, y1)[1], y1], [rp(s, y0)[0], -rp(s, y0)[1], y0]], b.hex, b.mat || 'paint', b.role || 'hull', ref);
        y0 = y1;
      }
    }
  }
  const H = { half, st, bow, stern, kW, ref, zone };
  /** The rim (the gunwale) on one side (+1 right, -1 left): model points [a, l, y]. */
  H.rim = (sg, up) => st.map(s => [s.a, sg * s.hd, s.yd + (up || 0)]);
  /** The deck outline (a, l, y): inset m from the gunwale, at the bulwark's foot. */
  H.deckPoly = (inset, yAdj) => {
    const R = st.map(s => [s.a, Math.max(0, s.hd - (inset || 0)), s.yd - (S.bulwark || 0) + (yAdj || 0)]);
    const Lf = R.slice().reverse().map(q => [q[0], -q[1], q[2]]);
    const out = R.concat(Lf);
    return out.filter((q, i) => { const n = out[(i + 1) % out.length]; return !(Math.abs(q[0] - n[0]) < 1e-6 && Math.abs(q[1] - n[1]) < 1e-6); });
  };
  /** The deck seen from above (only when the eye is above it). */
  H.deck = (hex, mat, inset) => {
    const yMid = S.yd(0) - (S.bulwark || 0);
    if (!h.above(yMid * V.ky)) return;
    V.face(H.deckPoly(inset == null ? 0.1 : inset), hex, mat || 'paint', 'deck', null);
  };
  /** The inner faces of the bulwark (seen from inside the boat). */
  H.inner = (hex, th, mat) => {
    if (!(S.bulwark > 0.04)) return;
    th = th || 0.1;
    for (let i = 0; i + 1 < st.length; i++) {
      const s0 = st[i], s1 = st[i + 1];
      for (const sg of [1, -1]) {
        const l0 = Math.max(0, s0.hd - th) * sg, l1 = Math.max(0, s1.hd - th) * sg;
        if (Math.abs(l0) < 1e-3 && Math.abs(l1) < 1e-3) continue;
        V.face([[s0.a, l0, s0.yd - S.bulwark], [s1.a, l1, s1.yd - S.bulwark], [s1.a, l1, s1.yd], [s0.a, l0, s0.yd]], hex, mat || 'paint', 'bulwark', [(s0.a + s1.a) / 2, sg * (hb * 1.5 + 1), s0.yd - S.bulwark / 2]);
      }
    }
  };
  /** The gunwale's cap rail (a line along the rim), with a width in metres. */
  H.cap = (hex, w, mat, up) => { for (const sg of [1, -1]) V.line(H.rim(sg, up == null ? 0.02 : up).map(q => [q[0], q[1] * 1.005, q[2]]), w || 0.12, hex, mat || 'timber', 'gunwale'); };
  return H;
}

/**
 * A deckhouse: its plan (a0..a1, +-hb, rounded ends), walls y0..y1 in hex, a roof cap (and an overhanging slab), windows in rows on
 * every seen wall (lit after dusk by the seeded rule). S: { a0, a1, hb, y0, y1, hex, roof, round: [aft, fore], over (roof slab), win: {
 *   rows: [[v0, v1]...], step, glass, share (dark), frame }, tag, mat, taper (the roof plan is smaller by this: a sloping house) }.
 * Returns the plan.
 */
function _wmdVesHouse(V, S) {
  const h = V.h, rA = S.round ? S.round[0] : 0, rF = S.round ? S.round[1] : 0, plan = _wmdVesPlan(S.a0, S.a1, S.hb, rA, rF, S.arc || 6);
  const top = S.taper ? _wmdVesPlan(S.a0 + S.taper, S.a1 - S.taper, Math.max(0.05, S.hb - S.taper), Math.max(0, rA - S.taper * 0.3), Math.max(0, rF - S.taper * 0.3), S.arc || 6) : plan;
  V.solid(plan, S.y0, top, S.y1, S.hex, { mat: S.mat || 'paint', role: 'cabin', cap: S.over != null ? S.hex : S.roof });
  if (S.over != null) V.prism(_wmdVesGrow(top, S.over), S.y1, S.y1 + (S.slab || 0.14), S.roof, { mat: S.roofMat || 'paint', role: 'roof' });
  const win = S.win;
  if (win) {
    const n = plan.length, ca = plan.reduce((s, q) => s + q[0], 0) / n, cl = plan.reduce((s, q) => s + q[1], 0) / n;
    for (let e = 0; e < n; e++) {
      const A = plan[e], B = plan[(e + 1) % n], da = B[0] - A[0], dl = B[1] - A[1], len = Math.hypot(da, dl);
      if (len < 0.3) continue;
      let na = dl / len, nl = -da / len;
      if (na * ((A[0] + B[0]) / 2 - ca) + nl * ((A[1] + B[1]) / 2 - cl) < 0) { na = -na; nl = -nl; }
      if (!V.sees([na, nl, 0], [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (S.y0 + S.y1) / 2])) continue;
      const Sf = V.wall(A[0], A[1], da / len, dl / len, na, nl), step = win.step || 1.4;
      const tight = V.px(step) < 2.6, share = win.share == null ? 0.2 : win.share, crew = win.crew != null ? win.crew : V.crewLit;
      const fx = (key) => { const dark = h.u(key) < share, f = h.litFx(dark); if (!dark && crew != null) f.theta = Math.round(crew * h.u(key + 't') * 1000) / 1000; return f; };
      for (let r = 0; r < win.rows.length; r++) {
        const [v0, v1] = win.rows[r];
        if (tight) { Sf.rect(0.25, len - 0.25, v0, v1, win.glass || '#3a4a5a', 'glass', 'window', 0.03, fx((S.tag || 'h') + 'b' + e + r)); continue; }
        const nW = Math.max(1, Math.round((len - 0.4) / step)), pitch = (len - 0.4) / nW, w = pitch * (win.frame == null ? 0.74 : win.frame);
        for (let k = 0; k < nW; k++) {
          const u = 0.2 + pitch * (k + 0.5) - w / 2;
          Sf.rect(u, u + w, v0, v1, win.glass || '#3a4a5a', 'glass', 'window', 0.03, fx((S.tag || 'h') + 'w' + e + ':' + k + ':' + r));
        }
      }
    }
  }
  return plan;
}

/** A funnel: an oval stack from y0 to y1 (rake aft in m), a coloured band and a black top. */
function _wmdVesFunnel(V, S) {
  const n = V.px(S.rl) < 4 ? 8 : 12, at = (y) => { const t = (y - S.y0) / (S.y1 - S.y0); return _wmdVesEllipse(S.a - (S.rake || 0) * t, S.l, _wmdVesLerp(S.ra, S.ra * 0.9, t), _wmdVesLerp(S.rl, S.rl * 0.9, t), n); };
  const yT = S.y1 - (S.topH || 0.9), yB0 = S.band ? S.y0 + (yT - S.y0) * 0.55 : yT, yB1 = S.band ? yB0 + (yT - S.y0) * 0.14 : yT;
  V.frustum(at(S.y0), S.y0, at(yB0), yB0, S.hex, { mat: 'paint', role: 'funnel', cap: false });
  if (S.band) { V.frustum(at(yB0), yB0, at(yB1), yB1, S.band, { mat: 'paint', role: 'funnel', cap: false }); V.frustum(at(yB1), yB1, at(yT), yT, S.hex, { mat: 'paint', role: 'funnel', cap: false }); }
  V.frustum(at(yT), yT, at(S.y1), S.y1, S.top || '#1c1e22', { mat: 'paint', role: 'funnel', cap: S.top || '#1c1e22' });
}

/** A ship's boat on its chocks (a lifeboat, a tender): a lens hull with a cover, in hex. */
function _wmdVesBoat(V, S) {
  const len = S.len, wid = S.wid, ht = S.ht || wid * 0.55, a = S.a, l = S.l, y = S.y;
  const shape = (k) => [[a + len / 2, l], [a + len * 0.34, l + wid / 2 * k * 0.8], [a - len * 0.05, l + wid / 2 * k], [a - len * 0.36, l + wid / 2 * k * 0.9], [a - len / 2 * 0.97, l + wid / 2 * k * 0.42], [a - len / 2 * 0.97, l - wid / 2 * k * 0.42], [a - len * 0.36, l - wid / 2 * k * 0.9], [a - len * 0.05, l - wid / 2 * k], [a + len * 0.34, l - wid / 2 * k * 0.8]];
  if (V.px(len) < 14) { V.solid(shape(0.7), y, shape(1), y + ht, S.hex, { mat: 'paint', role: 'boat', cap: S.cover || S.hex }); return; }
  V.solid(shape(0.7), y, shape(1), y + ht * 0.62, S.hex, { mat: 'paint', role: 'boat', cap: false });
  V.solid(shape(1), y + ht * 0.62, shape(0.96), y + ht * 0.72, S.trim || '#f2efe6', { mat: 'paint', role: 'boat', cap: false });
  if (S.cover) V.solid(shape(0.9), y + ht * 0.72, shape(0.55), y + ht * 1.08, S.cover, { mat: 'fabric', role: 'cover', cap: S.cover });
  else V.face(shape(0.9).map(q => [q[0], q[1], y + ht * 0.7]), S.inside || '#8a7a64', 'timber', 'deck', null);
}

/** The foam of a moving vessel: a pale ring on the water round its waterline (drawn first, under the hull). */
function _wmdVesFoam(V, H, wid, alpha, rest) {
  const h = V.h;
  // a big boat at rest in a tideway (rest: a river ferry) still has a collar of foam where the hull meets the water: fainter than under way
  const live = h.p.moving || h.p.t != null;
  if (!live) { if (!rest) return; alpha = (alpha || 0.35) * 0.75; }
  const R = H.st.map(s => [s.a - s.ov, Math.max(0, s.hd * H.kW)]), pl = R.concat(R.slice().reverse().map(q => [q[0], -q[1]]));
  const outer = _wmdVesGrow(pl, wid || 0.35);
  h.part('foam', { layer: -5 });
  V.face(outer.map(q => [q[0], q[1], 0.01]), '#f4fbfc', 'water', 'foam', null, { alpha: alpha || 0.35 });
}

/**
 * The white water of a big hull lying in a tideway (a ferry, a landing stage): from a camera a few metres over the water a flat foam
 * collar is a sliver under a pixel, so the wash STANDS UP: a low broken skirt of foam against the hull at the waterline (higher at the
 * ends, gaps between the pieces), a bow wave at each end (a wedge of small white crests running aft from the stem), and a few flecks on
 * the water. Seeded, subtle, never a ring. E: { face(pts, hex, mat, role, inside, extra) } in model coordinates (V, or the kit through
 * a wrapper); ring: the hull's plan at the waterline, a closed [[a, l]...]; o: { L, hb, seed (a key), up (the stem's strength 0..1), fine,
 * tips: [a of each stem], sea (0..1.5: how rough: scales the heights), gapK (1: gaps between the pieces of the skirt, 0.2: nearly continuous), valley (0.2: the ends of a piece stand low, 0.8: high) }.
 */
function _wmdVesWash(E, ring, o) {
  const UP = [0, 1, 0], h = o.h, u = (k) => h.u('wash' + k), sea = o.sea == null ? 1 : o.sea, fine = o.fine !== false, hex = '#f6fbfb', ink = [0, 0, 1.2];
  const nrm = (a, b) => { const dx = b[0] - a[0], dl = b[1] - a[1], n = Math.hypot(dx, dl) || 1; return [dl / n, -dx / n]; };
  // the skirt: pieces of 0.8 to 3.2 m along the outline, tent-shaped (a peak, never a slab), offset a hand outward, broken by gaps
  let k = 0;
  const endK = (a) => Math.max(0, Math.min(1, (Math.abs(a) - (o.L / 2 - 11)) / 9));
  for (let i = 0; i < ring.length; i++) {
    const A = ring[i], B = ring[(i + 1) % ring.length], len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (len < 0.3) continue;
    const n = nrm(A, B);
    for (let t0 = u('t0' + i) * 1.5 / len; t0 < 1; ) {
      k++;
      const pl = (0.8 + 2.4 * u('pl' + k)) / len, t1 = Math.min(1, t0 + pl), am = A[0] + (B[0] - A[0]) * (t0 + t1) / 2, ek = endK(am), tm = (t0 + t1) / 2;
      const next = t1 + (o.gapK == null ? 1 : o.gapK) * (0.3 + 2.6 * u('gp' + k) * (1 - ek)) / len;
      if (t1 - t0 > 0.15 / len) {
        const hh = (0.08 + 0.2 * u('hh' + k) + 0.45 * ek * (0.5 + 0.5 * u('he' + k))) * sea, off = 0.1 + 0.04 * u('of' + k), al = 0.45 + 0.3 * u('al' + k);
        const at = (t, y) => [A[0] + (B[0] - A[0]) * t + n[0] * off, A[1] + (B[1] - A[1]) * t + n[1] * off, y];
        const q1 = t0 + (t1 - t0) * (0.2 + 0.2 * u('q1' + k)), q2 = t1 - (t1 - t0) * (0.2 + 0.2 * u('q2' + k));
        const vl = o.valley == null ? 0.2 : o.valley;   // how high the ends of a piece stand (a continuous skirt hides the hull's foot between its peaks)
        E.face([at(t0, 0), at(t1, 0), at(t1, hh * (vl + (0.5 - vl * 0.5) * u('h1' + k))), at(q2, hh * (0.7 + 0.3 * u('p2' + k))), at(q1, hh), at(t0, hh * (vl + (0.5 - vl * 0.5) * u('h0' + k)))], hex, 'water', 'foam', ink, { alpha: al, shadeN: UP });
      }
      t0 = next;
    }
  }
  // the bow waves: from each stem a wedge of white crests running aft along both sides, widening, taller near the stem
  const tips = o.tips || [];
  tips.forEach((tp, ti) => {
    const dir = tp > 0 ? 1 : -1, str = (ti === 0 ? o.up == null ? 0.7 : o.up : 1 - (o.up == null ? 0.7 : o.up) * 0.7);
    const nC = fine ? 9 : 5;
    for (const sg of [-1, 1]) for (let c = 0; c < nC; c++) {
      const s = (c + 0.3 + 0.7 * u('bs' + ti + sg + c)) / nC, back = s * (o.wedge || 9), a = tp - dir * back, l = sg * (o.tipHb + 0.3 + s * (o.wedge || 9) * 0.16 + 0.35 * u('bl' + ti + sg + c));
      const w = (0.7 + 1.4 * u('bw' + ti + sg + c)) * (0.5 + 0.5 * (1 - s)), hh = (0.12 + 0.38 * (1 - s) * (0.5 + 0.5 * u('bh' + ti + sg + c))) * sea * (0.4 + 0.8 * str);
      // a crest: a vertical fin of foam along the wedge line
      const ax = dir * 0.62, al = sg * 0.18;
      E.face([[a - ax * w * 0.5, l - al * w * 0.5, 0], [a + ax * w * 0.5, l + al * w * 0.5, 0], [a + ax * w * 0.3, l + al * w * 0.3, hh], [a - ax * w * 0.3, l - al * w * 0.3, hh * 0.8]], hex, 'water', 'foam', null, { alpha: (0.4 + 0.35 * (1 - s)) * (0.5 + 0.5 * str), shadeN: UP });
    }
    // flecks on the water ahead of the stem and along the wedge: flat, faint (they read where the eye is high)
    if (fine) for (let c = 0; c < 7; c++) {
      const a = tp + dir * (0.5 + 2.8 * u('fa' + ti + c)) - dir * 4.5 * u('fb' + ti + c), l = (u('fl' + ti + c) - 0.5) * (o.tipHb * 2.4 + 2), r = 0.35 + 0.8 * u('fr' + ti + c), ring2 = [];
      for (let q = 0; q < 7; q++) { const th = q / 7 * Math.PI * 2, rad = r * (0.7 + 0.5 * u('fq' + ti + c + '_' + q)); ring2.push([a + Math.cos(th) * rad * 1.5, l + Math.sin(th) * rad, 0.015]); }
      E.face(ring2, hex, 'water', 'foam', null, { alpha: 0.3 + 0.25 * u('fp' + ti + c), shadeN: UP });
    }
  });
}

/* ============================================================
   FERRIES
   ============================================================ */
const _WMD_VES_FERRY_RIVER = Object.freeze([
  { name: 'blue', hull: '#f2f4f4', boot: '#27384a', band: '#2a5a8a', house: '#eeeee8', roof: '#c4ccd2', funnel: '#2a5a8a', top: '#1c1e22', ring: '#f2f4f4', deck: '#7d7a70', glass: '#3a4a5a', boat: '#e8a53a', cover: '#d9d2bd' },
  { name: 'green', hull: '#f0eee4', boot: '#2c3a2c', band: '#2e7a5a', house: '#f0eee6', roof: '#c9cfc9', funnel: '#2e7a5a', top: '#1c1e22', ring: '#f0eee4', deck: '#7a7a6c', glass: '#364a46', boat: '#e8a53a', cover: '#d9d2bd' },
  { name: 'red', hull: '#f2f2f0', boot: '#2a2a30', band: '#b6382c', house: '#efeee8', roof: '#c4c8cc', funnel: '#b6382c', top: '#1c1e22', ring: '#f2f2f0', deck: '#807a70', glass: '#3a3f4a', boat: '#e8a53a', cover: '#d9d2bd' },
  { name: 'heritage', hull: '#25272a', boot: '#6b1f1a', band: '#e6dcb0', house: '#efe6cc', roof: '#b9b3a2', funnel: '#c0392b', top: '#16171a', ring: '#16171a', deck: '#6f6a5e', glass: '#2f3a44', boat: '#f2efe6', cover: '#cfc7b0' },
  { name: 'navy', hull: '#22304c', boot: '#7a1f1a', band: '#e0b838', house: '#f1efe6', roof: '#c4ccd2', funnel: '#e0b838', top: '#1c1e22', ring: '#e0b838', deck: '#76726a', glass: '#33414f', boat: '#f2efe6', cover: '#d4cdb8' },
]);

/** A double-ended Mersey passenger ferry, 46 m: rounded ends, an enclosed saloon with an open deck at each end, a promenade deck
 *  with rails and boats, an upper house, a bridge with a mast, two funnels. Nominal 46 x 11.2 x 15.2 m. */
function _wmdVesBuildRiverFerry(p, h) {
  const V = _wmdVesCtx(h, p, 46, 11.2, 15.2), liv = p.livery, L = 46, hb = 5.6; V.crewLit = 0.4;
  const age = (hex, kind) => h.aged(hex, kind || 'paint', 0.6);
  const bul = 1.0, ydeck = a => 2.1 + 0.45 * Math.pow(Math.abs(a) / (L / 2), 3), yd = a => ydeck(a) + bul;
  const two = p.opts.funnels !== 1;
  V.part('hull', 0, 0, 1.5, 3);   // the hull's outer sides are drawn after what stands behind the bulwark
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.86, bow: { len: 8.5, p: 2, q: 2, rake: 0.7 }, stern: { len: 8.5, p: 2, q: 2, rake: 0.7 }, yd, bulwark: bul,
    bands: [{ to: 0.9, hex: age(liv.boot, 'paint'), role: 'hull' }, { to: 1.35, hex: age(liv.band, 'paint'), role: 'hull' }, { to: 'top', hex: age(liv.hull, 'paint'), role: 'hull' }] });
  // the heavy rubbing strake at deck level and the cap of the bulwark
  for (const sg of [1, -1]) { V.sidePart('strake', sg, 0, sg * hb, 1.5); V.line(Hh.rim(sg, -bul - 0.35).map(q => [q[0], q[1] * 1.012, q[2]]), 0.34, '#17181b', 'metal', 'fender'); }
  V.part('hull', 0, 0, 1.5, 3);
  Hh.cap(age(liv.ring, 'paint'), 0.16, 'paint', 0.06);
  _wmdVesFoam(V, Hh, 0.5, 0.34, true);
  // the wash: a standing skirt and a bow wave at each stem (the flat collar above is a sliver from a quay)
  V.part('wash', 0, 0, 0.3, 4.2);
  { const R = Hh.st.map(sx => [sx.a - sx.ov, sx.hd * Hh.kW]), ring = R.concat(R.slice().reverse().map(q => [q[0], -q[1]]));
    _wmdVesWash({ face: (pts, hx, mt, rl, ins, ex) => V.face(pts, hx, mt, rl, ins, ex) }, ring, { h, L, tips: [L / 2 - 0.2, -L / 2 + 0.2], tipHb: 1.2, up: 0.4 + 0.5 * h.u('flow'), fine: V.px(1) >= 2, wedge: 10, sea: p.sea == null ? 1 : p.sea }); }
  V.part('deck', 0, 0, 2.2, 1);
  Hh.deck(age(liv.deck, 'paint'), 'paint', 0.12);
  Hh.inner(age(liv.hull, 'paint'), 0.12);
  // bollards at both ends
  for (const a of [-21, -19, 19, 21]) for (const sg of [-1, 1]) { const hh = Hh.half(a) - 0.5; if (hh > 0.8) V.cyl(a, sg * hh * 0.7, ydeck(a), ydeck(a) + 0.38, 0.11, 0.11, '#2b2d30', { mat: 'metal', role: 'bollard' }); }
  // ---- the saloon: the long enclosed deck, windows all round
  const yS0 = ydeck(0), yS1 = yS0 + 2.7, wallS = age(liv.house, 'paint');
  V.part('saloon', 0, 0, (yS0 + yS1) / 2);
  const sPlan = _wmdVesHouse(V, { a0: -16.5, a1: 16.5, hb: 4.7, y0: yS0 - 0.05, y1: yS1, hex: wallS, roof: age(liv.roof, 'paint'), round: [4.4, 4.4], over: 0.25, slab: 0.16, tag: 's',
    win: { rows: [[yS0 + 0.85, yS1 - 0.45]], step: 1.45, glass: liv.glass, share: 0.16 } });
  // ---- the promenade deck: rails round the saloon roof, the boats
  const yP = yS1 + 0.16, edge = _wmdVesGrow(sPlan, 0.2), runs = _wmdVesRuns(edge);
  for (const [nm, path, sg] of [['rail-p-r', runs.right, 1], ['rail-p-l', runs.left, -1]]) { V.part(nm, 0, sg * 4.7, yP + 0.5); V.rail(path, yP, 1.05, age(liv.ring, 'paint'), { post: 1.6, mid: true, w: 0.05, mat: 'paint' }); }
  const nBoats = h.u('boats') < 0.5 ? 2 : 4, bl = [[-6.5, 3.85], [6.5, 3.85], [-6.5, -3.85], [6.5, -3.85]];
  for (let i = 0; i < 4; i++) {
    if (nBoats === 2 && (i === 1 || i === 3)) continue;
    const [a, l] = bl[i];
    V.part('boat-' + i, a, l, yP + 0.7);
    _wmdVesBoat(V, { a, l, y: yP + 0.12, len: 6.6, wid: 1.95, ht: 1.15, hex: liv.boat, cover: liv.cover });
  }
  // ---- the upper house
  const yU0 = yP, yU1 = yU0 + 2.25;
  V.part('upper', 0, 0, (yU0 + yU1) / 2);
  const uPlan = _wmdVesHouse(V, { a0: -9.6, a1: 9.6, hb: 2.65, y0: yU0, y1: yU1, hex: wallS, roof: age(liv.roof, 'paint'), round: [2.6, 2.6], over: 0.22, slab: 0.14, tag: 'u',
    win: { rows: [[yU0 + 0.7, yU1 - 0.4]], step: 1.35, glass: liv.glass, share: 0.2 } });
  const yR = yU1 + 0.14, uEdge = _wmdVesGrow(uPlan, 0.18), uRuns = _wmdVesRuns(uEdge);
  for (const [nm, path, sg] of [['rail-u-r', uRuns.right, 1], ['rail-u-l', uRuns.left, -1]]) { V.part(nm, 0, sg * 2.6, yR + 0.5); V.rail(path, yR, 1.0, age(liv.ring, 'paint'), { post: 1.7, mid: true, w: 0.05, mat: 'paint' }); }
  // ---- the funnels
  const fa = two ? [-6.9, 6.9] : [0];
  for (let i = 0; i < fa.length; i++) {
    V.part('funnel-' + i, fa[i], 0, yR + 3);
    _wmdVesFunnel(V, { a: fa[i], l: 0, y0: yR, y1: yR + (two ? 5.0 : 5.6), ra: two ? 1.55 : 2.0, rl: two ? 1.45 : 2.1, hex: age(liv.funnel, 'paint'), top: liv.top, band: liv.ring, topH: 0.95 });
    V.cyl(fa[i] + 0.55, 0, yR + 4.6, yR + 6.1, 0.09, 0.09, '#2a2c30', { mat: 'metal', role: 'pipe' });
  }
  // ---- the bridge
  const yB0 = yR, yB1 = yB0 + 2.15;
  V.part('bridge', 0, 0, (yB0 + yB1) / 2);
  _wmdVesHouse(V, { a0: -2.7, a1: 2.7, hb: 2.75, y0: yB0, y1: yB1, hex: wallS, roof: age(liv.roof, 'paint'), round: [0.8, 0.8], over: 0.3, slab: 0.12, tag: 'b', arc: 3,
    win: { rows: [[yB0 + 0.75, yB1 - 0.3]], step: 1.2, glass: liv.glass, share: 0.1, frame: 0.9 } });
  // ---- the mast, its yard, the radar and the navigation lights
  const yM = yB1 + 0.3;
  V.part('mast', 0, 0, yM + 2.5);
  V.line([[0, 0, yM], [0, 0, yM + 5.2]], 0.16, age('#d9d6cc', 'paint'), 'metal', 'mast');
  V.line([[0, -1.7, yM + 3.9], [0, 1.7, yM + 3.9]], 0.1, '#c9c6bc', 'metal', 'yard');
  V.box(-0.45, 0.45, -0.1, 0.1, yM + 1.7, yM + 1.95, '#2a2c30', '#3a3d42', 'metal', 'radar');
  V.line([[0, 0, yM + 5.2], [2.6, 0, yB1 + 0.2]], 0.04, '#6b7078', 'metal', 'stay');
  V.line([[0, 0, yM + 5.2], [-2.6, 0, yB1 + 0.2]], 0.04, '#6b7078', 'metal', 'stay');
  V.lamp(0, 0, yM + 5.35, 0.18, { col: '#fff2c8', kind: 'mast' });
  V.lamp(0.2, 1.7, yM + 3.9, 0.14, { col: '#7dff9a', kind: 'starboard' });
  V.lamp(0.2, -1.7, yM + 3.9, 0.14, { col: '#ff6a5a', kind: 'port' });
  // lifebuoys on the promenade rail
  if (h.fine) for (const [a, sg] of [[-3, 1], [3, -1], [11.5, 1], [-11.5, -1]]) V.disc([a, sg * 4.95, yP + 0.55], 0.32, '#e2563a', 'paint', 'ring', 1);
  return { height: (yM + 5.5) * V.ky };
}

worldModelDefine('ferry-river', {
  name: 'Mersey ferry (a double-ended river passenger ferry)', ids: ['boat.river-ferry'], sampleObj: 'boat.river-ferry', float: true, solidity: 'solid',
  bob: { heave: 0.025, roll: 0.0035, pitch: 0.0012, period: 6.5 },
  moor: { heave: 0.11, roll: 0.013, pitch: 0.0075, period: 6.1 },   // a 46 m ferry lying to a stage in a tideway's swell: it heaves a hand and rolls about a degree
  dims(info) { const s = info && info.size; return { L: s && s.w > 20 ? s.w : 46, B: s && s.d > 6 ? s.d : 11.2, H: s && s.h > 8 ? s.h : 15.2 }; },
  liveries: () => _WMD_VES_FERRY_RIVER,
  params(ent, o, p) { return p.liveryKey != null ? null : { liveryKey: Math.abs(ent.variant | 0) % 3 === 0 ? _wexHash(String(ent.id) + 'f') % 5 : Math.abs(ent.variant | 0) % 3 }; },
  samples: [{ livery: 'blue' }, { livery: 'heritage', age: 0.7 }, { livery: 'red', size: 1.1 }],
  footprint(p) { const L = p.L, B = p.B; return [[-L / 2 + 6, -B / 2], [L / 2 - 6, -B / 2], [L / 2, -B * 0.22], [L / 2, B * 0.22], [L / 2 - 6, B / 2], [-L / 2 + 6, B / 2], [-L / 2, B * 0.22], [-L / 2, -B * 0.22]]; },
  build: _wmdVesBuildRiverFerry,
});

/* ---------- the trip boat (a river passenger launch) ---------- */
const _WMD_VES_TRIP = Object.freeze([
  { name: 'white-blue', hull: '#f2f4f4', boot: '#27384a', band: '#2a5a8a', house: '#f4f2ec', roof: '#c4ccd2', awning: ['#2a5a8a', '#f2f4f4'], rail: '#e8ecee', glass: '#3a4a5a', stack: '#2a5a8a' },
  { name: 'cream-green', hull: '#eadfbd', boot: '#2c3a2c', band: '#2e7a5a', house: '#f0eee6', roof: '#c9cfc9', awning: ['#2e7a5a', '#f0eee6'], rail: '#f0eee6', glass: '#364a46', stack: '#2e7a5a' },
  { name: 'white-red', hull: '#f2f2f0', boot: '#2a2a30', band: '#b6382c', house: '#efeee8', roof: '#c4c8cc', awning: ['#b6382c', '#f2f2f0'], rail: '#f2f2f0', glass: '#3a3f4a', stack: '#b6382c' },
  { name: 'navy', hull: '#22304c', boot: '#7a1f1a', band: '#f2efe6', house: '#f1efe6', roof: '#c4ccd2', awning: ['#22304c', '#e8dcb0'], rail: '#f1efe6', glass: '#33414f', stack: '#22304c' },
]);

/** A river trip boat, 30 m: a bulwarked hull, a glazed saloon, an open upper deck with rails, seats and a striped awning, a
 *  wheelhouse forward, a small stack. Nominal 30 x 7.4 x 9 m. */
function _wmdVesBuildTrip(p, h) {
  const V = _wmdVesCtx(h, p, 30, 7.4, 9.0), liv = p.livery, L = 30, hb = 3.7; V.crewLit = 0.4;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.7);
  const bul = 0.85, ydeck = a => 1.75 + 0.5 * Math.pow(Math.max(0, (a - 3) / 12), 2) + 0.1 * Math.pow(Math.max(0, (-a - 8) / 7), 2), yd = a => ydeck(a) + bul;
  V.part('hull', 0, 0, 1.2, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.82, bow: { len: 6.5, p: 1.9, q: 1.4, rake: 0.7 }, stern: { len: 4.5, p: 2, q: 2, rake: 0.4 }, yd, bulwark: bul,
    bands: [{ to: 0.7, hex: age(liv.boot), role: 'hull' }, { to: 1.1, hex: age(liv.band), role: 'hull' }, { to: 'top', hex: age(liv.hull), role: 'hull' }] });
  for (const sg of [1, -1]) { V.sidePart('strake', sg, 0, sg * hb, 1.2); V.line(Hh.rim(sg, -bul - 0.28).map(q => [q[0], q[1] * 1.012, q[2]]), 0.26, '#17181b', 'metal', 'fender'); }
  V.part('hull', 0, 0, 1.2, 3);
  Hh.cap(age(liv.rail), 0.12, 'paint', 0.05);
  _wmdVesFoam(V, Hh, 0.35, 0.3);
  V.part('deck', 0, 0, 1.6, 1);
  Hh.deck(age('#7d7a70'), 'paint', 0.12);
  Hh.inner(age(liv.hull), 0.1);
  // ---- the saloon (glazed all round) and its roof deck with rails
  const y0 = ydeck(0), y1 = y0 + 2.5;
  V.part('saloon', -0.5, 0, (y0 + y1) / 2);
  const sp = _wmdVesHouse(V, { a0: -10.5, a1: 9.0, hb: 3.05, y0: y0 - 0.04, y1, hex: age(liv.house), roof: age(liv.roof), round: [1.0, 3.4], over: 0.2, slab: 0.14, tag: 's',
    win: { rows: [[y0 + 0.7, y1 - 0.4]], step: 1.35, glass: liv.glass, share: 0.15, frame: 0.8 } });
  const yR = y1 + 0.14, edge = _wmdVesGrow(sp, 0.2), runs = _wmdVesRuns(edge);
  for (const [nm, path, sg] of [['rail-r', runs.right, 1], ['rail-l', runs.left, -1]]) { V.part(nm, 0, sg * 3.2, yR + 0.5); V.rail(path, yR, 1.0, age(liv.rail), { post: 1.5, mid: true, w: 0.05, mat: 'paint' }); }
  // ---- the wheelhouse forward on the upper deck, a stack aft of it
  const yW1 = yR + 2.0;
  V.part('wheelhouse', 5.0, 0, yR + 1.0);
  _wmdVesHouse(V, { a0: 3.2, a1: 7.2, hb: 1.9, y0: yR - 0.02, y1: yW1, hex: age(liv.house), roof: age(liv.roof), round: [0.3, 1.6], over: 0.25, slab: 0.12, tag: 'w', arc: 4,
    win: { rows: [[yR + 0.65, yW1 - 0.3]], step: 1.0, glass: liv.glass, share: 0.1, frame: 0.85 } });
  V.part('stack', 2.2, 0, yR + 1.2);
  V.cyl(2.2, 0, yR, yR + 1.9, 0.38, 0.32, age(liv.stack), { mat: 'paint', role: 'stack' });
  V.cyl(2.2, 0, yR + 1.75, yR + 1.95, 0.36, 0.36, '#1c1e22', { mat: 'paint', role: 'stack' });
  V.part('mast', 5.6, 0, yW1 + 1.0);
  V.line([[5.6, 0, yW1 + 0.1], [5.6, 0, yW1 + 2.6]], 0.1, '#d9d6cc', 'metal', 'mast');
  V.lamp(5.6, 0, yW1 + 2.7, 0.12, { col: '#fff2c8', kind: 'masthead', theta: h.aboard });
  // ---- the awning over the aft upper deck on posts, with seats under it
  const aA0 = -9.4, aA1 = 1.2, yA = yR + 2.2;
  V.part('awning', (aA0 + aA1) / 2, 0, yA);
  for (const [a, l] of [[aA0, -2.6], [aA0, 2.6], [aA1, -2.6], [aA1, 2.6], [(aA0 + aA1) / 2, -2.6], [(aA0 + aA1) / 2, 2.6]]) V.line([[a, l, yR], [a, l, yA]], 0.07, age(liv.rail), 'metal', 'post');
  V.cloth([[aA0, -2.9, yA], [aA1, -2.9, yA], [aA1, 2.9, yA], [aA0, 2.9, yA]], 0.12, liv.awning[0], { stripe: liv.awning, nu: Math.max(4, Math.round((aA1 - aA0) / 0.9)), nv: 1, role: 'awning', side: 1 });
  if (h.fine) V.part('seats', (aA0 + aA1) / 2, 0, yR + 0.4);
  if (h.fine) for (const l of [-2.05, -0.7, 0.7, 2.05]) V.box(aA0 + 0.4, aA1 - 0.4, l - 0.26, l + 0.26, yR + 0.02, yR + 0.45, age('#a07a4a', 'timber'), age('#b88a58', 'timber'), 'timber', 'seat');
  // lifebuoys on the rail
  if (h.fine) for (const [a, sg] of [[-2, 1], [4, -1], [-7, -1]]) V.disc([a, sg * 3.4, yR + 0.55], 0.3, '#e2563a', 'paint', 'ring', 1);
  return { height: (yW1 + 2.9) * V.ky };
}

worldModelDefine('ferry-trip', {
  name: 'Trip boat (a river passenger launch)', ids: ['boat.ferry', 'boat.trip-boat'], sampleObj: 'boat.ferry', float: true, solidity: 'solid',
  bob: { heave: 0.02, roll: 0.005, pitch: 0.002, period: 5.2 },
  dims(info) { const s = info && info.size; return { L: s && s.w > 14 && s.w < 50 ? s.w : 30, B: s && s.d > 4 ? Math.min(s.d, 12) : 7.4, H: s && s.h > 5 ? s.h : 9 }; },
  liveries: () => _WMD_VES_TRIP,
  samples: [{ livery: 'white-blue' }, { livery: 'cream-green', age: 0.6 }, { livery: 'white-red' }, { livery: 'navy', size: 1.1 }],
  build: _wmdVesBuildTrip,
});

/* ---------- the roll-on roll-off car ferry ---------- */
const _WMD_VES_CARFERRY = Object.freeze([
  { name: 'navy-white', hull: '#1c2c4a', boot: '#7a1f1a', band: '#f2f4f4', house: '#f2f4f4', roof: '#c4ccd2', funnel: '#c0392b', top: '#1c1e22', glass: '#33414f', boat: '#e8a53a', door: '#2a2e36' },
  { name: 'green-white', hull: '#27503a', boot: '#2a2a2e', band: '#e8dcb0', house: '#f0eee6', roof: '#c9cfc9', funnel: '#27503a', top: '#1c1e22', glass: '#364a46', boat: '#e8a53a', door: '#2a2e36' },
  { name: 'red-white', hull: '#a8322a', boot: '#2a2a30', band: '#f2f2f0', house: '#f2f2f0', roof: '#c4c8cc', funnel: '#a8322a', top: '#1c1e22', glass: '#3a3f4a', boat: '#e8a53a', door: '#2a2e36' },
]);

/** A car ferry, 90 m: a high slab-sided hull with its stern door, a block of passenger decks with rows of windows, a bridge across
 *  the beam, a boat deck with enclosed lifeboats, a wide funnel. Nominal 90 x 17 x 18 m. */
function _wmdVesBuildCarFerry(p, h) {
  const V = _wmdVesCtx(h, p, 90, 17, 18), liv = p.livery, L = 90, hb = 8.5; V.crewLit = 0.4;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.7);
  const yTop = 7.0, yd = a => yTop + 0.7 * Math.pow(Math.max(0, (a - 20) / 25), 2);
  V.part('hull', 0, 0, 3.5, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.9, bow: { len: 15, p: 1.7, q: 1.3, rake: 2.2 }, stern: { len: 5, p: 2, q: 1, tip: 0.8, rake: 0 }, yd, bulwark: 0, step: 10,
    bands: [{ to: 1.6, hex: age(liv.boot), role: 'hull' }, { to: 2.0, hex: age(liv.band), role: 'hull' }, { to: y => y - 1.5, hex: age(liv.hull), role: 'hull' }, { to: 'top', hex: age(liv.house), role: 'hull' }] });
  _wmdVesFoam(V, Hh, 0.6, 0.3);
  // the car deck's side openings, in a row, and a few portholes below them
  if (h.fine) for (const sg of [1, -1]) if (V.nearSide() === sg || V.nearSide() === 0) {
    V.part('open' + sg, 0, sg * hb, 4, 3.2);
    for (let a = -36; a < 24; a += 4.6) { const w = Hh.half(a), k = 0.9 + 0.1 * Math.pow(5.2 / yTop, 0.7); if (w < hb * 0.99) continue; V.face([[a, sg * w * k * 1.004, 4.3], [a + 2.8, sg * w * k * 1.004, 4.3], [a + 2.8, sg * w * k * 1.004, 5.5], [a, sg * w * k * 1.004, 5.5]], age(liv.door), 'glass', 'window', null, h.litFx(h.u('o' + a) < 0.4)); }
  }
  V.part('hull', 0, 0, 3.5, 3);
  // the stern door (a dark opening in the transom) and the rubbing strake
  const aT = -L / 2 - 0.03;
  V.face([[aT, -6.4, 2.6], [aT, 6.4, 2.6], [aT, 6.4, yTop - 0.4], [aT, -6.4, yTop - 0.4]], age(liv.door), 'paint', 'door', null);
  for (const sg of [1, -1]) { V.sidePart('strake', sg, 0, sg * hb, 3.0); V.line(Hh.rim(sg, -0.5).map(q => [q[0], q[1] * 1.01, q[2]]), 0.4, '#17181b', 'metal', 'fender'); }
  V.part('deck', 0, 0, yTop, 1);
  if (h.above(yTop * V.ky)) V.face(Hh.deckPoly(0.1, 0), age('#7d7a70'), 'paint', 'deck', null);
  // ---- the passenger block, in three tiers, a bridge across the beam, the funnel
  const yA = yTop, yB = yA + 2.6, yC = yB + 2.6, yD = yC + 2.7;
  V.part('tier1', 4, 0, (yA + yB) / 2);
  _wmdVesHouse(V, { a0: -22, a1: 33, hb: 7.0, y0: yA - 0.05, y1: yB, hex: age(liv.house), roof: age(liv.roof), round: [0, 9], over: 0.2, slab: 0.2, tag: 't1', arc: 5,
    win: { rows: [[yA + 0.7, yB - 0.55]], step: 1.9, glass: liv.glass, share: 0.15, frame: 0.8 } });
  V.part('tier2', 5, 0, (yB + yC) / 2);
  _wmdVesHouse(V, { a0: -17, a1: 29, hb: 6.4, y0: yB + 0.15, y1: yC, hex: age(liv.house), roof: age(liv.roof), round: [0, 8], over: 0.2, slab: 0.18, tag: 't2', arc: 5,
    win: { rows: [[yB + 0.75, yC - 0.55]], step: 1.9, glass: liv.glass, share: 0.18, frame: 0.8 } });
  V.part('bridge', 18, 0, (yC + yD) / 2);
  _wmdVesHouse(V, { a0: 12, a1: 27, hb: 7.2, y0: yC + 0.15, y1: yD, hex: age(liv.house), roof: age(liv.roof), round: [0, 4], over: 0.3, slab: 0.16, tag: 'b', arc: 4,
    win: { rows: [[yC + 0.8, yD - 0.4]], step: 1.5, glass: liv.glass, share: 0.1, frame: 0.88 } });
  V.part('funnel', 0, 0, yC + 3);
  _wmdVesFunnel(V, { a: -2, l: 0, y0: yC + 0.15, y1: yC + 6.4, ra: 3.0, rl: 2.6, rake: 1.0, hex: age(liv.funnel), band: liv.band, top: liv.top, topH: 1.4 });
  V.part('mast', 21, 0, yD + 3);
  V.line([[21, 0, yD + 0.2], [21, 0, yD + 6]], 0.22, '#d9d6cc', 'metal', 'mast');
  V.line([[21, -2.6, yD + 4.4], [21, 2.6, yD + 4.4]], 0.14, '#c9c6bc', 'metal', 'yard');
  V.lamp(21, 0, yD + 6.2, 0.25, { col: '#fff2c8', kind: 'masthead', theta: h.aboard });
  // the boats on the tier-1 roof (enclosed lifeboats) by both sides of the second tier
  for (const [a, sg] of [[-6, 1], [-6, -1], [8, 1], [8, -1]]) { V.part('lb' + a + sg, a, sg * 4.9, yB + 1); _wmdVesBoat(V, { a, l: sg * 5.3, y: yB + 0.3, len: 8.5, wid: 2.5, ht: 1.7, hex: liv.boat, cover: '#d9d2bd' }); }
  return { height: (yD + 6.5) * V.ky };
}

worldModelDefine('ferry-car', {
  name: 'Car ferry (a roll-on roll-off island ferry)', ids: ['boat.island-ferry'], sampleObj: 'boat.island-ferry', float: true, solidity: 'solid',
  bob: { heave: 0.03, roll: 0.003, pitch: 0.0012, period: 8 },
  dims(info) { const s = info && info.size; return { L: s && s.w > 40 ? s.w : 90, B: s && s.d > 10 ? s.d : 17, H: s && s.h > 10 ? s.h : 18 }; },
  liveries: () => _WMD_VES_CARFERRY,
  samples: [{ livery: 'navy-white' }, { livery: 'green-white', age: 0.6 }, { livery: 'red-white' }],
  footprint(p) { const L = p.L, B = p.B; return [[-L / 2, -B * 0.48], [L / 2 - 14, -B / 2], [L / 2, -B * 0.1], [L / 2, B * 0.1], [L / 2 - 14, B / 2], [-L / 2, B * 0.48]]; },
  build: _wmdVesBuildCarFerry,
});

/* ============================================================
   SAILING BOATS: a dinghy and a cruising yacht (hull with sheer, cockpit, mast, boom, mainsail and jib as cloth with a belly,
   rudder, heel). The wind side (the side the sails bulge to, the side the boat heels to) and the point of sail are seeded.
   ============================================================ */
/** A bermudan sloop rig on a boat that may be heeled. S: { a, yF, mastH, boomY, boomLen, foreA, foreY, aftA, aftY, lee, psi, up, main,
 *  jib, spar, cover, mastR, belly, seams, spread, hbShroud, light } */
function _wmdVesRig(V, S) {
  const a = S.a, yF = S.yF, yTop = yF + S.mastH, cb = Math.cos(S.psi), sb = Math.sin(S.psi), lee = S.lee;
  V.line([[a, 0, yF], [a, 0, yTop]], S.mastR * 2, S.spar, 'metal', 'mast');
  const clew = [a - S.boomLen * cb, lee * S.boomLen * sb, S.boomY + 0.04];
  if (S.up) {
    V.line([[a - 0.04, 0, S.boomY], clew], S.mastR * 1.5, S.spar, 'metal', 'boom');
    const hl = [a - 0.3 * cb, lee * 0.3 * sb, yTop - 0.32];
    V.cloth([[a - 0.05, 0, S.boomY + 0.1], clew, hl, [a - 0.05, 0, yTop - 0.32]], S.belly, S.main, { side: lee, seams: S.seams, role: 'mainsail' });
    const pj = S.psi * 0.55, jc = [a - S.jibClew * Math.cos(pj), lee * S.jibClew * Math.sin(pj), S.foreY + (S.jibY || 0.3)], jt = [a + 0.05, 0, yTop - S.jibHead];
    V.cloth([[S.foreA, 0, S.foreY], jc, jt, jt], S.belly * 0.9, S.jib, { side: lee, seams: S.seams ? 1 : 0, role: 'jib' });
    V.line([[clew[0], clew[1], clew[2] - 0.02], [S.sheetA, lee * 0.1, S.sheetY]], 0.012, '#cfc7b0', 'fabric', 'sheet');
  } else {
    // furled: the mainsail in its cover on the boom, the jib rolled round the forestay
    V.tube([a - 0.08, 0, S.boomY + 0.1], [a - S.boomLen * 0.96, 0, S.boomY + 0.12], S.mastR * (S.bundle || 2.6), S.cover || S.main, 'fabric', 'cover');
    V.line([[S.foreA, 0, S.foreY + 0.15], [a + 0.04, 0, yTop - S.jibHead + 0.5]], S.mastR * 2.2, S.jib, 'fabric', 'roll');
    if (S.aftA != null) V.line([[a - S.boomLen * 0.96, 0, S.boomY + 0.1], [S.aftA * 0.9, 0, S.aftY + 0.4]], 0.012, '#8a8f95', 'metal', 'topping');
  }
  // standing rigging: forestay, backstay, a spreader and two shrouds a side
  V.line([[S.foreA, 0, S.foreY], [a + 0.04, 0, yTop - 0.4]], 0.014, '#8a8f95', 'metal', 'stay');
  if (S.aftA != null) V.line([[S.aftA, 0, S.aftY], [a - 0.02, 0, yTop - 0.15]], 0.014, '#8a8f95', 'metal', 'stay');
  if (S.spread) {
    const yS = yF + S.mastH * S.spread, w = S.mastH * 0.05;
    V.line([[a, -w, yS], [a, w, yS]], S.mastR * 1.3, S.spar, 'metal', 'spreader');
    for (const sg of [-1, 1]) { V.line([[a - 0.02, 0, yTop - 0.3], [a, sg * w, yS], [a - 0.05, sg * S.hbShroud, yF + 0.05]], 0.012, '#8a8f95', 'metal', 'shroud'); V.line([[a, 0, yS - 0.2], [a - 0.04, sg * S.hbShroud * 0.95, yF + 0.05]], 0.012, '#8a8f95', 'metal', 'shroud'); }
  } else for (const sg of [-1, 1]) V.line([[a - 0.02, 0, yTop - 0.9], [a - 0.06, sg * S.hbShroud, yF + 0.05]], 0.012, '#8a8f95', 'metal', 'shroud');
  if (S.light) V.lamp(a, 0, yTop + 0.1, 0.07, { col: '#fff4d0', kind: 'masthead', theta: S.light === true ? 0 : S.light });
}

function _wmdVesU(seed, key) { return (_wexHash(seed + '|' + key) % 100000) / 100000; }
/** A crew member SITTING in the boat (user, 16 Oct: the dinghy's crew stood upright and legless at the gunwale): the figure of
 *  79-world-4models-landing.js (_wmdLdgSeated): hips on the side deck at (a, l, y), a torso leaning out to the side sg, thighs forward
 *  and shins down into the boat on the inboard side, arms to the tiller extension or the sheet, a head and hair or a cap. o: more figure options. */
function _wmdVesCrew(V, a, l, y, sg, top, trousers, skin, hat, o) {
  const hair = ['#2a2220', '#4a3626', '#8a6a3e', '#c9b48a'][Math.abs(Math.round(a * 37 + l * 11 + y * 5)) % 4];
  _wmdLdgSeated(V, Object.assign({ a, l, y: y - 0.12, face: 1, out: sg, lean: 0.3, leanA: -0.05, top, trousers, skin, hat, hair: hat ? null : hair, legs: 'bent', feet: [a + 0.46, l - sg * 0.5, 0.07], k: 1 }, o || null));
}

const _WMD_VES_DINGHY = Object.freeze([
  { name: 'white', hull: '#f4f2ec', deck: '#d8cfbe', boot: '#c0392b', main: '#f6f4ee', jib: '#f6f4ee', trim: '#2a3a4a', inner: '#e6e0d0', top: '#d8d4cc' },
  { name: 'varnish', hull: '#c8a070', deck: '#b88a58', boot: '#2a3a4a', main: '#ecdcb8', jib: '#ecdcb8', trim: '#6b4a2a', inner: '#c8a070', top: '#a07a4a' },
  { name: 'blue', hull: '#2f5a8a', deck: '#e8e4dc', boot: '#f4f2ec', main: '#f6f4ee', jib: '#c8402e', trim: '#f4f2ec', inner: '#e6e0d0', top: '#2f5a8a' },
  { name: 'yellow', hull: '#e8c030', deck: '#f2efe4', boot: '#2a3a4a', main: '#f6f4ee', jib: '#f6f4ee', trim: '#2a3a4a', inner: '#e8e2cc', top: '#e8c030' },
  { name: 'red', hull: '#b02e26', deck: '#ece6d8', boot: '#f4f2ec', main: '#f2efe6', jib: '#e8e2d0', trim: '#f4f2ec', inner: '#e6e0d0', top: '#b02e26' },
]);

/** A sailing dinghy, 4.2 m: a hull with sheer and a pointed bow, a foredeck, thwarts and a centreboard case, a rudder with its
 *  tiller, a mast with a boom, a mainsail and a jib (cloth with a belly), a crew sitting out when under way. */
function _wmdVesBuildDinghy(p, h) {
  const V = _wmdVesCtx(h, p, 4.2, 1.6, 6.0), liv = p.livery, L = 4.2, hb = 0.78;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.7);
  const moored = p.opts.state ? p.opts.state === 'moored' : (p.obj === 'boat.fpv-dinghy-moored' || h.u('state') < 0.25);
  const lee = h.u('lee') < 0.5 ? -1 : 1, pos = h.u('pos'), psi = (8 + 36 * pos) * Math.PI / 180;
  const heel = moored ? 0 : (0.06 + 0.12 * (1 - pos * 0.6)) * (p.opts.heel != null ? p.opts.heel : 1);
  V.heel(lee * heel);
  const yd = a => 0.30 + 0.20 * Math.pow(Math.max(0, (a + 0.3) / 2.4), 2) + 0.08 * Math.pow(Math.max(0, (-0.3 - a) / 1.8), 2);
  V.part('hull', 0, 0, 0.2, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.72, bow: { len: 1.75, p: 1.9, q: 1.1, rake: 0.1, recede: 0.2 }, stern: { len: 0.6, p: 2, q: 1, tip: 0.74, rake: 0 }, yd, draft: 0.17, bilge: 0.5, step: 0.9,
    bands: [{ to: 0, hex: age('#3b3f46', 'paint'), role: 'antifoul' }, { to: 0.07, hex: age(liv.boot, 'paint'), role: 'boot' }, { to: 'top', hex: age(liv.hull, 'paint'), role: 'hull' }] });
  Hh.cap(age(liv.top, 'timber'), 0.06, 'timber', 0.015);
  _wmdVesFoam(V, Hh, 0.2, 0.3);
  // ---- the inside: floor, inner sides, foredeck, thwarts, centreboard case (seen from above the gunwale)
  V.part('inside', 0, 0, 0.1, 1);
  if (h.above(0.34 * V.ky)) {
    const R = Hh.st.filter(s => s.a >= -1.9 && s.a <= 0.9), fl = R.map(s => [s.a, 0.64 * s.hd, 0.07]), floor = fl.concat(fl.slice().reverse().map(q => [q[0], -q[1], q[2]]));
    V.face(floor, age(liv.inner, 'timber'), 'timber', 'floor', null);
    for (let i = 0; i + 1 < R.length; i++) for (const sg of [1, -1]) {
      const s0 = R[i], s1 = R[i + 1];
      V.face([[s0.a, sg * 0.64 * s0.hd, 0.07], [s1.a, sg * 0.64 * s1.hd, 0.07], [s1.a, sg * (s1.hd - 0.03), s1.yd], [s0.a, sg * (s0.hd - 0.03), s0.yd]], age(liv.inner, 'paint'), 'paint', 'inner', [(s0.a + s1.a) / 2, sg * hb * 2, 0.2]);
    }
    const F = Hh.st.filter(s => s.a >= 0.85), fd = F.map(s => [s.a, Math.max(0, s.hd - 0.03), yd(s.a) - 0.02]);
    V.face(fd.concat(fd.slice().reverse().map(q => [q[0], -q[1], q[2]])), age(liv.deck, 'paint'), 'paint', 'deck', null);
    V.box(-0.24, 0.0, -0.6, 0.6, 0.2, 0.25, age('#b88a58', 'timber'), age('#c8a070', 'timber'), 'timber', 'thwart');
    V.box(0.62, 0.8, -0.62, 0.62, 0.2, 0.27, age('#b88a58', 'timber'), age('#c8a070', 'timber'), 'timber', 'thwart');
    V.box(-0.12, 0.55, -0.03, 0.03, 0.07, 0.3, age('#8a6a44', 'timber'), age('#a07a4a', 'timber'), 'timber', 'case');
  }
  // ---- the rudder and tiller
  V.part('rudder', -2.2, 0, 0.1, V.sees([-1, 0, 0], [-2.1, 0, 0.2]) ? 4 : 1.5);
  V.faceCut([[-2.14, 0, 0.34], [-2.38, 0, 0.34], [-2.42, 0, -0.5], [-2.18, 0, -0.5]], age('#8a6a44', 'timber'), 'timber', 'rudder', null);
  V.line([[-2.2, 0, 0.36], [-1.35, lee * -0.12, 0.5], [-0.7, lee * -0.12, 0.6]], 0.04, age('#a07a4a', 'timber'), 'timber', 'tiller');
  // ---- the rig
  V.part('rig', 0.95, 0, 3, 2);
  _wmdVesRig(V, { a: 0.95, yF: 0.32, mastH: 5.55, boomY: 0.82, boomLen: 2.2, foreA: 2.02, foreY: 0.45, aftA: null, lee, psi, up: !moored, main: age(liv.main, 'fabric'), jib: age(liv.jib, 'fabric'),
    spar: '#bfc3c7', cover: age(liv.main, 'fabric'), bundle: 2.2, mastR: 0.028, belly: 0.3, seams: 3, hbShroud: 0.74, jibClew: 1.1, jibHead: 1.0, jibY: 0.35, sheetA: -1.5, sheetY: 0.12, light: false });
  // ---- the crew (under way): the helm aft on the weather gunwale, the crew by the mast
  if (!moored && h.u('crew') > 0.1) {
    const wsg = -lee, tops = ['#d8402e', '#2f6aa8', '#e8b030', '#f2efe6', '#2e8b57'], tp = tops[Math.floor(h.u('top') * tops.length)], trs = '#2a3340', sk = ['#e6bf9a', '#c89a78', '#9a6a48'][Math.floor(h.u('skin') * 3)];
    V.part('crew-helm', -0.85, wsg * 0.6, 0.6, 2);
    _wmdVesCrew(V, -0.85, wsg * 0.62, 0.42, wsg, tp, trs, sk, h.u('hat') < 0.5 ? '#f2efe6' : null, { hands: [[-0.68, wsg * 0.14, 0.6], [-0.4, wsg * 0.3, 0.5]] });
    if (h.u('two') < 0.55) { V.part('crew-b', -0.1, wsg * 0.6, 0.6, 2); _wmdVesCrew(V, -0.12, wsg * 0.6, 0.42, wsg, tops[(Math.floor(h.u('top') * tops.length) + 2) % tops.length], trs, ['#e6bf9a', '#c89a78', '#9a6a48'][Math.floor(h.u('skin2') * 3)], null, { hands: [[0.22, wsg * 0.3, 0.52], [0.3, wsg * 0.12, 0.45]] }); }
  }
  return { height: 5.95 * V.ky };
}

worldModelDefine('dinghy', {
  name: 'Sailing dinghy', ids: ['boat.dinghy', 'boat.fpv-dinghy-moored'], sampleObj: 'boat.dinghy', float: true, solidity: 'solid',
  bob: { heave: 0.03, roll: 0.012, pitch: 0.006, period: 2.7 },
  dims() { return { L: 4.2, B: 1.6, H: 6.0 }; },
  liveries: () => _WMD_VES_DINGHY,
  params(ent, o, p) { return p.liveryKey != null ? null : { liveryKey: [0, 1, 2][Math.abs(ent.variant | 0) % 3] + (_wmdVesU(p.seed, 'dl') < 0.4 ? [0, 3, 4][Math.floor(_wmdVesU(p.seed, 'dk') * 3)] : 0) }; },
  samples: [{ livery: 'white' }, { livery: 'varnish', age: 0.6 }, { livery: 'blue' }, { livery: 'yellow', size: 1.1 }],
  build: _wmdVesBuildDinghy,
});


/* ---------- the cruising yacht ---------- */
const _WMD_VES_YACHT = Object.freeze([
  { name: 'white', hull: '#f4f2ec', stripe: '#1f3a6a', antifoul: '#7a1f1a', deck: '#cfc3a6', cabin: '#f1efe8', main: '#f4f2ea', jib: '#f4f2ea', cover: '#1f3a6a', canvas: '#1f3a6a' },
  { name: 'navy', hull: '#1c2c4a', stripe: '#d8c07a', antifoul: '#1a1c1f', deck: '#d6cdb2', cabin: '#f1efe8', main: '#efe9da', jib: '#efe9da', cover: '#7a1f1a', canvas: '#7a1f1a' },
  { name: 'cream', hull: '#eadfbd', stripe: '#2f6a4a', antifoul: '#2a2a2e', deck: '#c8b88a', cabin: '#efe6cc', main: '#e6d6a8', jib: '#e6d6a8', cover: '#2f6a4a', canvas: '#2f6a4a' },
  { name: 'green', hull: '#2f5a42', stripe: '#e8dcb0', antifoul: '#1a1c1f', deck: '#d6cdb2', cabin: '#efe9da', main: '#f4f2ea', jib: '#f4f2ea', cover: '#e8dcb0', canvas: '#1f3a2a' },
  { name: 'red', hull: '#a8322a', stripe: '#f4f2ec', antifoul: '#1a1c1f', deck: '#d6cdb2', cabin: '#f1efe8', main: '#f4f2ea', jib: '#f4f2ea', cover: '#1c2c4a', canvas: '#1c2c4a' },
  { name: 'grey', hull: '#a9b1b8', stripe: '#c0392b', antifoul: '#2a2a2e', deck: '#d0cab8', cabin: '#eceae2', main: '#e6e6e0', jib: '#e6e6e0', cover: '#3a4a5a', canvas: '#3a4a5a' },
]);

/** A cruising yacht (a bermudan sloop), 9.6 m: sheer, a raked stem and a transom, a coachroof with ports, a cockpit with coamings,
 *  lifelines and pulpit, mast with spreaders and shrouds, a boom, a mainsail and a genoa; furled and fendered when moored. */
function _wmdVesBuildYacht(p, h) {
  const V = _wmdVesCtx(h, p, 9.6, 3.1, 14.0), liv = p.livery, L = 9.6, hb = 1.52;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.7);
  const moored = p.opts.state ? p.opts.state === 'moored' : h.u('state') < 0.45;
  const lee = h.u('lee') < 0.5 ? -1 : 1, pos = h.u('pos'), psi = (8 + 34 * pos) * Math.PI / 180;
  const heel = moored ? 0 : (0.07 + 0.1 * (1 - pos * 0.5)) * (p.opts.heel != null ? p.opts.heel : 1);
  V.heel(lee * heel);
  const yd = a => 0.93 + 0.3 * Math.pow(Math.max(0, (a - 0.5) / 4.3), 2) + 0.07 * Math.pow(Math.max(0, (-1.5 - a) / 3.3), 1.5);
  V.part('hull', 0, 0, 0.5, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.7, bow: { len: 3.2, p: 1.7, q: 1.0, rake: 0.55, recede: 0.55 }, stern: { len: 1.7, p: 2, q: 1.2, tip: 0.62, rake: 0.3, recede: 0.2 }, yd, draft: 0.55, bilge: 0.16,
    bands: [{ to: 0, hex: age(liv.antifoul, 'paint'), role: 'antifoul' }, { to: 0.06, hex: '#f4f2ec', role: 'boot' }, { to: y => y - 0.34, hex: age(liv.hull, 'paint'), role: 'hull' },
      { to: y => y - 0.24, hex: age(liv.stripe, 'paint'), role: 'stripe' }, { to: 'top', hex: age(liv.hull, 'paint'), role: 'hull' }] });
  Hh.cap(age('#c8b88a', 'timber'), 0.1, 'timber', 0.015);
  _wmdVesFoam(V, Hh, 0.3, 0.3);
  // ---- the deck, the coachroof, the cockpit
  V.part('deck', 0, 0, 1.0, 1);
  const yDk = a => yd(a) - 0.05;
  if (h.above(0.9 * V.ky)) {
    const R = Hh.st.map(s => [s.a, Math.max(0, s.hd - 0.04), yDk(s.a)]), poly = R.concat(R.slice().reverse().map(q => [q[0], -q[1], q[2]]));
    V.face(poly.filter((q, i) => { const n = poly[(i + 1) % poly.length]; return !(Math.abs(q[0] - n[0]) < 1e-6 && Math.abs(q[1] - n[1]) < 1e-6); }), age(liv.deck, 'timber'), 'timber', 'deck', null);
  }
  V.part('cabin', 0.5, 0, 1.4, 2);
  const cabinY0 = yDk(0.5) - 0.02, cabinY1 = cabinY0 + 0.62;
  _wmdVesHouse(V, { a0: -1.3, a1: 2.6, hb: 0.98, y0: cabinY0, y1: cabinY1, hex: age(liv.cabin, 'paint'), roof: age(liv.cabin, 'paint'), round: [0.25, 0.9], taper: 0.2, tag: 'c', arc: 4,
    win: { rows: [[cabinY0 + 0.22, cabinY1 - 0.14]], step: 0.85, glass: '#2b3948', share: 0.3, frame: 0.62 } });
  V.box(-1.15, -0.35, -0.42, 0.42, cabinY1 - 0.02, cabinY1 + 0.07, age('#8a6a44', 'timber'), age('#a07a4a', 'timber'), 'timber', 'hatch');
  V.part('cockpit', -2.7, 0, 0.9, 2);
  if (h.above(0.9 * V.ky)) V.face([[-3.85, -0.78, 0.5], [-1.35, -0.78, 0.5], [-1.35, 0.78, 0.5], [-3.85, 0.78, 0.5]], age('#8a6a44', 'timber'), 'timber', 'floor', null);
  for (const sg of [-1, 1]) {
    // the well's inner side (seen from inboard), the coaming standing above the deck, the seat
    V.face([[-3.85, sg * 0.8, 0.5], [-1.35, sg * 0.8, 0.5], [-1.35, sg * 0.8, yDk(-1.35)], [-3.85, sg * 0.8, yDk(-3.85)]], age(liv.cabin, 'paint'), 'paint', 'well', [-2.6, sg * 2.4, 0.7]);
    V.box(-3.9, -1.3, sg * 0.8, sg * 1.0, yDk(-2.6) - 0.02, yDk(-2.6) + 0.24, age(liv.cabin, 'paint'), age('#a07a4a', 'timber'), 'paint', 'coaming');
    V.box(-3.8, -1.5, sg * 0.36, sg * 0.8, 0.5, 0.64, age('#a07a4a', 'timber'), age('#b88a58', 'timber'), 'timber', 'seat');
  }
  V.box(-3.95, -3.8, -1.0, 1.0, yDk(-3.9) - 0.02, yDk(-3.9) + 0.22, age(liv.cabin, 'paint'), age('#a07a4a', 'timber'), 'paint', 'coaming');
  V.line([[-4.4, 0, 0.95], [-3.3, lee * 0.1, 1.0]], 0.05, age('#a07a4a', 'timber'), 'timber', 'tiller');
  // ---- lifelines on stanchions (the near run after the cabin, the far run before it) and the bow pulpit
  for (const sg of [1, -1]) {
    const pth = Hh.st.filter(s => s.a >= -4.3).map(s => [s.a, sg * Math.max(0, s.hd - 0.1), yDk(s.a)]);
    V.part('life-' + sg, 0, sg * hb, 1.3);
    V.line(pth.map(q => [q[0], q[1], q[2] + 0.62]), 0.025, '#c9ccd0', 'metal', 'lifeline');
    V.line(pth.map(q => [q[0], q[1], q[2] + 0.3]), 0.02, '#c9ccd0', 'metal', 'lifeline');
    if (V.px(1) > 6) pth.forEach((q, i) => { if (i % 2 === 0) V.line([[q[0], q[1], q[2]], [q[0], q[1], q[2] + 0.62]], 0.035, '#c9ccd0', 'metal', 'stanchion'); });
  }
  // ---- the rig
  V.part('rig', 1.8, 0, 6, 2);
  _wmdVesRig(V, { a: 1.8, yF: yDk(1.8), mastH: 12.3, boomY: 1.45, boomLen: 3.6, foreA: 4.3, foreY: yDk(4.3) + 0.1, aftA: -4.75, aftY: yd(-4.7), lee, psi, up: !moored, main: age(liv.main, 'fabric'), jib: age(liv.jib, 'fabric'),
    spar: '#c4c8cc', cover: age(liv.cover, 'fabric'), mastR: 0.07, belly: 0.5, seams: 3, spread: 0.55, hbShroud: 1.3, jibClew: 2.0, jibHead: 1.4, jibY: 0.5, sheetA: -2.2, sheetY: 0.95, light: moored ? h.aboard : true });
  // ---- fenders on the near side when moored
  if (moored && h.fine) for (let i = 0; i < 3; i++) { const a = -1.5 + i * 1.6; for (const sg of [-1, 1]) V.line([[a, sg * (hb + 0.02), yd(a) - 0.02], [a, sg * (hb + 0.05), yd(a) - 0.42]], 0.2, '#f1efe8', 'fabric', 'fender'); }
  return { height: 13.8 * V.ky };
}

worldModelDefine('yacht', {
  name: 'Cruising yacht (a bermudan sloop)', ids: ['boat.yacht'], sampleObj: 'boat.yacht', float: true, solidity: 'solid',
  bob: { heave: 0.03, roll: 0.007, pitch: 0.003, period: 4.2 },
  dims(info, ent) { const s = info && info.size; return { L: s && s.w > 6 && s.w < 16 ? s.w : 9.6, B: s && s.d > 2.2 && s.d < 5 ? s.d : 3.1, H: s && s.h > 8 ? s.h : 14.0 }; },
  liveries: () => _WMD_VES_YACHT,
  samples: [{ livery: 'white' }, { livery: 'navy', age: 0.5 }, { livery: 'cream' }, { livery: 'red', size: 1.2 }],
  build: _wmdVesBuildYacht,
});

/* ============================================================
   FISHING BOATS: an inshore trawler (wheelhouse forward, a mast with a derrick, a gantry or a net drum aft), a potter (pots,
   crates, a hauler), and the Whitby coble (a high flared prow, a low flat stern, a small wheelhouse aft).
   ============================================================ */
const _WMD_VES_FISH = Object.freeze([
  { name: 'blue', hull: '#2f5a8a', top: '#f2efe6', antifoul: '#8a2a22', house: '#f4f2ec', roof: '#2a2e36', stack: '#2a2e36', crate: '#3a7ab8', pot: '#3a3a38', net: '#3a6a5a', buoy: '#f08a2a' },
  { name: 'red', hull: '#a8322a', top: '#1e2226', antifoul: '#3a3a3a', house: '#cfcabd', roof: '#1e2226', stack: '#1e2226', crate: '#e0a030', pot: '#8a5a2a', net: '#5a8a7a', buoy: '#f2efe6' },
  { name: 'green', hull: '#2f6a4a', top: '#f0e6c8', antifoul: '#8a2a22', house: '#ffffff', roof: '#2a2e36', stack: '#8a2a22', crate: '#d8d4cc', pot: '#3a3a38', net: '#3a6a5a', buoy: '#f08a2a' },
  { name: 'yellow', hull: '#d8a828', top: '#2a3a5a', antifoul: '#2a2a2a', house: '#f2efe6', roof: '#2a3a5a', stack: '#2a3a5a', crate: '#3a7ab8', pot: '#2a2a2a', net: '#6a8a5a', buoy: '#e2563a' },
  { name: 'white', hull: '#f2efe6', top: '#2f5a8a', antifoul: '#2a2a2a', house: '#f2efe6', roof: '#2f5a8a', stack: '#2f5a8a', crate: '#e2563a', pot: '#3a3a38', net: '#5a7a8a', buoy: '#f08a2a' },
  { name: 'black', hull: '#26282b', top: '#c8b070', antifoul: '#7a1f1a', house: '#e8e2d0', roof: '#26282b', stack: '#26282b', crate: '#d8d4cc', pot: '#6a4a2a', net: '#4a6a5a', buoy: '#f08a2a' },
]);
const _WMD_VES_FISH_DIMS = { trawler: [12.5, 4.2, 7.0], potter: [9.5, 3.2, 4.6], coble: [8.5, 2.5, 3.6] };
/** The kind of a fishing boat: the scene's opts.kind, else the object (boat.coble), else the variant (2: a potter) with a seeded share of cobles. */
function _wmdVesFishKind(ent) {
  const o = ent && ent.model && ent.model.opts, k = o && o.kind;
  if (k === 'trawler' || k === 'potter' || k === 'coble') return k;
  if (ent && ent.obj === 'boat.coble') return 'coble';
  const v = Math.abs((ent && ent.variant) | 0) % 3, u = (_wexHash(String(ent && ent.id != null ? ent.id : 'x') + '|kind') % 100) / 100;
  return u < 0.25 ? 'coble' : v === 2 ? 'potter' : 'trawler';
}

function _wmdVesBuildFishing(p, h) {
  const kind = p.kind, D = _WMD_VES_FISH_DIMS[kind], V = _wmdVesCtx(h, p, D[0], D[1], D[2]), liv = p.livery, L = D[0], hb = D[1] / 2;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.8);
  const bul = kind === 'trawler' ? 0.75 : kind === 'potter' ? 0.6 : 0.36;
  const yd = kind === 'trawler' ? (a => 1.05 + 0.85 * Math.pow(Math.max(0, (a - 1) / (L / 2 - 1)), 2.2) + 0.1 * Math.pow(Math.max(0, (-a - 2) / (L / 2 - 2)), 2))
    : kind === 'potter' ? (a => 0.85 + 0.6 * Math.pow(Math.max(0, (a - 0.8) / (L / 2 - 0.8)), 2.2) + 0.08 * Math.pow(Math.max(0, (-a - 1.6) / (L / 2 - 1.6)), 2))
      : (a => 0.6 + 1.0 * Math.pow(Math.max(0, (a + 0.4) / (L / 2 + 0.4)), 2.3) + 0.05 * Math.pow(Math.max(0, (-a - 1.5) / 2.5), 2));
  const ends = kind === 'trawler' ? { bow: { len: 3.5, p: 1.75, q: 1.0, rake: 0.55 }, stern: { len: 1.8, p: 2, q: 2, rake: 0.25 }, kW: 0.78 }
    : kind === 'potter' ? { bow: { len: 2.9, p: 1.8, q: 1.05, rake: 0.4 }, stern: { len: 1.3, p: 2, q: 1.6, rake: 0.1 }, kW: 0.76 }
      : { bow: { len: 3.3, p: 1.55, q: 0.95, rake: 0.85 }, stern: { len: 0.55, p: 2, q: 1, tip: 0.72, rake: 0 }, kW: 0.62 };
  V.part('hull', 0, 0, 0.5, 3);
  const Hh = _wmdVesHull(V, Object.assign({ L, hb, yd, bulwark: bul,
    bands: [{ to: kind === 'coble' ? 0.14 : 0.4, hex: age(liv.antifoul, 'paint'), role: 'antifoul' }, { to: y => y - (kind === 'coble' ? 0.13 : 0.3), hex: age(liv.hull, 'paint'), role: 'hull' }, { to: 'top', hex: age(liv.top, 'paint'), role: 'strake' }] }, ends));
  // clinker strakes along the hull (a coble's are its character)
  if (h.fine) for (const sg of [1, -1]) for (const k of kind === 'coble' ? [0.3, 0.55, 0.8] : [0.55]) V.line(Hh.st.map(s => [s.a - s.ov * (1 - k), sg * s.hd * (ends.kW + (1 - ends.kW) * Math.pow(k, 0.7)) * 1.004, s.yd * k]), 0.03, h.shade(age(liv.hull, 'paint'), 0.78), 'paint', 'strake');
  Hh.cap(age(liv.top, 'timber'), 0.08, 'timber', 0.02);
  _wmdVesFoam(V, Hh, 0.25, 0.3);
  V.part('deck', 0, 0, 0.6, 1);
  const yDk = a => yd(a) - bul;
  Hh.deck(age('#8a7a64', 'timber'), 'timber', 0.1);
  Hh.inner(age(liv.top, 'paint'), 0.08);
  // ---- the wheelhouse
  const wh = kind === 'trawler' ? { a0: 0.9, a1: 3.0, hb: 1.0, ht: 2.1 } : kind === 'potter' ? { a0: 0.6, a1: 2.1, hb: 0.85, ht: 1.8 } : { a0: -1.5, a1: -0.1, hb: 0.5, ht: 1.35 };
  const yH0 = yDk((wh.a0 + wh.a1) / 2) - 0.02, yH1 = yH0 + wh.ht, ak = (wh.a0 + wh.a1) / 2;
  V.part('house', ak, 0, (yH0 + yH1) / 2);
  _wmdVesHouse(V, { a0: wh.a0, a1: wh.a1, hb: wh.hb, y0: yH0, y1: yH1, hex: age(liv.house, 'paint'), roof: age(liv.roof, 'paint'), over: 0.1, slab: 0.1, taper: kind === 'coble' ? 0.0 : 0.12, tag: 'w', arc: 3,
    win: { rows: [[yH0 + wh.ht * 0.42, yH1 - 0.22]], step: kind === 'trawler' ? 0.8 : 0.65, glass: '#34424e', share: 0.25, frame: 0.8 } });
  // the stack behind the house, the radar and lamps on the roof
  const aS = wh.a0 - 0.3;
  V.part('stack', aS, 0, yH1 + 0.5);
  V.cyl(aS, kind === 'coble' ? 0 : -0.35, yH0 + wh.ht * 0.2, yH1 + (kind === 'trawler' ? 0.9 : 0.55), 0.14, 0.12, age(liv.stack, 'paint'), { mat: 'metal', role: 'stack' });
  if (kind !== 'coble') V.box(wh.a0 + 0.2, wh.a0 + 0.7, -0.35, 0.35, yH1 + 0.12, yH1 + 0.2, '#2a2c30', '#3a3d42', 'metal', 'radar');
  // ---- the mast, the derrick and the stays
  const aM = kind === 'trawler' ? 0.35 : kind === 'potter' ? 0.15 : -0.4, mH = kind === 'trawler' ? 5.4 : kind === 'potter' ? 3.5 : 2.4;
  V.part('mast', aM, 0, 3);
  const yM = yDk(aM);
  V.line([[aM, 0, yM], [aM, 0, yM + mH]], 0.13, age('#8a8f95', 'metal'), 'metal', 'mast');
  V.line([[aM, -0.7, yM + mH * 0.8], [aM, 0.7, yM + mH * 0.8]], 0.07, '#8a8f95', 'metal', 'yard');
  V.line([[aM, 0, yM + mH], [wh.a1 + 0.2, 0, yH1]], 0.025, '#5a5e64', 'metal', 'stay');
  V.line([[aM, 0, yM + mH], [-L / 2 + 0.4, 0, yDk(-L / 2) + 0.2]], 0.025, '#5a5e64', 'metal', 'stay');
  if (kind === 'trawler') V.line([[aM, 0, yM + mH * 0.45], [aM - 2.6, 0.9, yM + mH * 0.62]], 0.1, age('#4a4e54', 'metal'), 'metal', 'derrick');
  V.lamp(aM, 0, yM + mH + 0.12, 0.08, { col: '#fff4d0', kind: 'masthead', theta: h.aboard });
  // ---- the deck gear, by kind and seed
  V.part('gear', -L / 4, 0, yDk(-L / 4) + 0.6);
  const style = kind === 'trawler' ? (p.variant % 3 === 1 ? 'drum' : h.u('gear') < 0.5 ? 'gantry' : 'drum') : kind === 'potter' ? 'pots' : (h.u('gear') < 0.5 ? 'crates' : 'pots');
  const aG = -L / 2 + (kind === 'coble' ? 1.6 : 2.6);
  if (style === 'gantry') {
    const aGt = -L / 2 + 1.5, yG = yDk(aGt);
    for (const sg of [-1, 1]) V.line([[aGt, sg * (hb - 0.45), yG], [aGt + 0.1, sg * (hb - 0.45), yG + 2.9]], 0.12, age('#4a4e54', 'metal'), 'metal', 'gantry');
    V.line([[aGt + 0.1, -(hb - 0.45), yG + 2.9], [aGt + 0.1, hb - 0.45, yG + 2.9]], 0.12, age('#4a4e54', 'metal'), 'metal', 'gantry');
    V.line([[aGt + 0.1, 0, yG + 2.9], [aGt + 0.1, 0, yG + 2.2]], 0.04, '#222222', 'metal', 'block');
    V.box(aGt + 0.55, aGt + 1.35, -0.5, 0.5, yG, yG + 0.35, age(liv.net, 'fabric'), age(liv.net, 'fabric'), 'fabric', 'net');
  } else if (style === 'drum') {
    const yG = yDk(aG);
    V.tube([aG, -hb + 0.55, yG + 0.75], [aG, hb - 0.55, yG + 0.75], 0.72, age('#4a4e54', 'metal'), 'metal', 'drum');
    V.tube([aG, -hb + 0.7, yG + 0.75], [aG, hb - 0.7, yG + 0.75], 0.78, age(liv.net, 'fabric'), 'fabric', 'net');
    V.box(aG - 0.3, aG + 0.3, -hb + 0.4, -hb + 0.55, yG, yG + 1.6, age('#4a4e54', 'metal'), null, 'metal', 'drum');
    V.box(aG - 0.3, aG + 0.3, hb - 0.55, hb - 0.4, yG, yG + 1.6, age('#4a4e54', 'metal'), null, 'metal', 'drum');
  } else if (style === 'pots') {
    const n = kind === 'potter' ? 3 : 1;
    for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
      const a0 = -L / 2 + 1.0 + i * 1.0, yG = yDk(a0), hts = 2 + Math.floor(h.u('pots' + i + sg) * 3);
      const l0 = sg > 0 ? 0.08 : -0.63;
      for (let k = 0; k < hts; k++) V.box(a0, a0 + 0.8, l0, l0 + 0.55, yG + k * 0.34, yG + (k + 1) * 0.34, age(liv.pot, 'timber'), age(h.mix(liv.pot, '#777', 0.4), 'timber'), 'timber', 'pot');
    }
    if (h.fine) for (let k = 0; k < 4; k++) V.disc([-L / 2 + 0.7 + k * 0.5, hb - 0.12, yDk(-L / 2 + 1) + 0.15], 0.14, liv.buoy, 'paint', 'buoy', 1);
  } else {   // crates stacked aft
    for (let i = 0; i < 2; i++) { const a0 = -L / 2 + 0.7 + i * 0.75, yG = yDk(a0), hts = 2 + Math.floor(h.u('cr' + i) * 3); for (let k = 0; k < hts; k++) V.box(a0, a0 + 0.62, -0.32 + (i ? 0.2 : -0.15), 0.28 + (i ? 0.2 : -0.15), yG + k * 0.3, yG + (k + 1) * 0.3, age(liv.crate, 'paint'), age(h.shade(liv.crate, 1.1), 'paint'), 'paint', 'crate'); }
  }
  // ---- a hauler davit on a potter's side, fenders hanging, a mooring warp
  if (kind === 'potter') { const aD = 0.5, yG = yDk(aD); V.line([[aD, hb - 0.25, yG], [aD, hb - 0.25, yG + 1.5], [aD, hb + 0.35, yG + 1.6]], 0.07, '#4a4e54', 'metal', 'davit'); }
  if (h.fine && h.u('fenders') < 0.7) for (const sg of [1, -1]) { V.sidePart('fend', sg, 0, sg * hb, 1.0); for (const a of [-1.2, 1.2, 2.6]) { const w = Hh.half(a); if (Math.abs(a) < L / 2 - 1.4 && w > 0.5) V.line([[a, sg * w * 1.0, yd(a) - 0.02], [a, sg * w * 1.06, yd(a) - 0.5]], 0.22, '#1a1a1a', 'fabric', 'fender'); } }
  return { height: (yM + mH + 0.3) * V.ky };
}

worldModelDefine('fishing', {
  name: 'Fishing boat (a trawler, a potter, a Whitby coble)', ids: ['boat.fishing-boat', 'boat.coble'], sampleObj: 'boat.fishing-boat', float: true, solidity: 'solid',
  bob: { heave: 0.025, roll: 0.01, pitch: 0.004, period: 3.4 },
  dims(info, ent) { const d = _WMD_VES_FISH_DIMS[_wmdVesFishKind(ent)]; return { L: d[0], B: d[1], H: d[2] }; },
  liveries: () => _WMD_VES_FISH,
  params(ent, o, p) { const kind = _wmdVesFishKind(ent); return { kind, liveryKey: p.liveryKey != null ? p.liveryKey : (Math.abs(ent.variant | 0) % 3) + (_wmdVesU(p.seed, 'fl') < 0.5 ? 0 : 3) }; },
  samples: [{ livery: 'blue' }, { livery: 'red', age: 0.7 }, { livery: 'green' }, { livery: 'yellow', size: 1.1 }],
  build: _wmdVesBuildFishing,
});

/* ============================================================
   WORK BOATS: a harbour tug and a lifeboat.
   ============================================================ */
/** A flat shape in the (a, y) plane, extruded across l0..l1 (a paddle box, an arch, a prow plate): the profile pts [[a, y]...]. */
function _wmdVesProfile(V, prof, l0, l1, hex, o) {
  o = o || {};
  const n = prof.length, ma = prof.reduce((s, q) => s + q[0], 0) / n, my = prof.reduce((s, q) => s + q[1], 0) / n, ref = [ma, (l0 + l1) / 2, my], mat = o.mat || 'paint', role = o.role || 'body';
  V.face(prof.map(q => [q[0], l0, q[1]]), o.faceHex || hex, mat, role, ref, o.extra);
  V.face(prof.map(q => [q[0], l1, q[1]]), o.faceHex || hex, mat, role, ref, o.extra);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; V.face([[prof[i][0], l0, prof[i][1]], [prof[j][0], l0, prof[j][1]], [prof[j][0], l1, prof[j][1]], [prof[i][0], l1, prof[i][1]]], hex, mat, role, ref, o.extra); }
}

const _WMD_VES_TUG = Object.freeze([
  { name: 'black-red', hull: '#25282c', top: '#f2efe6', antifoul: '#7a1f1a', house: '#f2efe6', roof: '#c9ced2', funnel: '#b6382c', band: '#f2efe6', stack: '#1c1e22', glass: '#33414f' },
  { name: 'blue', hull: '#1f3a6a', top: '#f2efe6', antifoul: '#2a2a2e', house: '#f2efe6', roof: '#c4ccd2', funnel: '#1f3a6a', band: '#e0b838', stack: '#1c1e22', glass: '#33414f' },
  { name: 'orange', hull: '#e07a1e', top: '#25282c', antifoul: '#2a2a2e', house: '#f4f1e8', roof: '#c9ced2', funnel: '#e07a1e', band: '#25282c', stack: '#1c1e22', glass: '#33414f' },
  { name: 'green', hull: '#27503a', top: '#e8dcb0', antifoul: '#2a2a2e', house: '#ece6d2', roof: '#bfc6c0', funnel: '#27503a', band: '#e8dcb0', stack: '#1c1e22', glass: '#33414f' },
  { name: 'yellow', hull: '#e8c030', top: '#25282c', antifoul: '#3a3a3a', house: '#f2efe6', roof: '#c9ced2', funnel: '#25282c', band: '#e8c030', stack: '#1c1e22', glass: '#33414f' },
]);

/** A harbour tug, 24 m: a rounded hull with a flared bow and a low working deck aft, a two-tier house with the wheelhouse over it,
 *  an oval funnel, a mast with radar, rubbing strakes and tyre fenders, a towing bollard. Nominal 24 x 8.6 x 9 m. */
function _wmdVesBuildTug(p, h) {
  const V = _wmdVesCtx(h, p, 24, 8.6, 9.0), liv = p.livery, L = 24, hb = 4.3; V.crewLit = 0.4;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.8);
  const bul = 0.9, yd = a => 2.15 + 1.0 * Math.pow(Math.max(0, (a - 1) / (L / 2 - 1)), 2) - 0.55 * Math.pow(Math.max(0, (-a - 1) / (L / 2 - 1)), 1.3);
  V.part('hull', 0, 0, 1.0, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.8, bow: { len: 7.0, p: 2, q: 1.7, rake: 0.9 }, stern: { len: 5.0, p: 2, q: 2, rake: 0.45 }, yd, bulwark: bul,
    bands: [{ to: 0.9, hex: age(liv.antifoul), role: 'antifoul' }, { to: y => y - 0.3, hex: age(liv.hull), role: 'hull' }, { to: 'top', hex: age(liv.top), role: 'strake' }] });
  // the heavy rubbing strake and the tyre fenders along the sides and the bow
  for (const sg of [1, -1]) {
    V.sidePart('strake', sg, 0, sg * hb, 1.5);
    V.line(Hh.rim(sg, -bul - 0.25).map(q => [q[0], q[1] * 1.015, q[2]]), 0.3, '#17181b', 'fabric', 'fender');
    if (h.fine) for (let a = -4; a <= 7; a += 1.5) { const w = Hh.half(a); V.disc([a, sg * w * 1.04, yd(a) - bul - 0.55], 0.36, '#1a1a1c', 'fabric', 'tyre', 0.95); }
  }
  V.part('hull', 0, 0, 1.0, 3);
  Hh.cap(age(liv.top), 0.12, 'paint', 0.02);
  _wmdVesFoam(V, Hh, 0.5, 0.35);
  V.part('deck', 0, 0, 1.2, 1);
  const yDk = a => yd(a) - bul;
  Hh.deck(age('#6e6a60'), 'paint', 0.12);
  Hh.inner(age(liv.hull), 0.12);
  // the towing bollard and winch aft, the bow fairlead
  V.part('gear', -6, 0, yDk(-6) + 0.5);
  V.cyl(-6.4, 0, yDk(-6.4), yDk(-6.4) + 0.7, 0.3, 0.26, '#2a2c30', { mat: 'metal', role: 'bollard' });
  V.box(-5.0, -3.9, -1.2, 1.2, yDk(-4.5), yDk(-4.5) + 0.55, age('#3a3d42', 'metal'), '#4a4e54', 'metal', 'winch');
  // ---- the main house, the wheelhouse over it, the funnel and the mast
  const y0 = yDk(0) - 0.02, y1 = y0 + 2.5, y2 = y1 + 0.16, y3 = y2 + 2.1;
  V.part('house', 0, 0, (y0 + y1) / 2);
  const hp = _wmdVesHouse(V, { a0: -4.6, a1: 4.4, hb: 3.15, y0, y1, hex: age(liv.house), roof: age(liv.roof), round: [1.2, 2.6], over: 0.2, slab: 0.16, tag: 'h',
    win: { rows: [[y0 + 0.85, y1 - 0.5]], step: 1.2, glass: liv.glass, share: 0.18 } });
  void hp;
  V.part('bridge', 0.8, 0, (y2 + y3) / 2);
  _wmdVesHouse(V, { a0: -1.2, a1: 3.2, hb: 2.7, y0: y2, y1: y3, hex: age(liv.house), roof: age(liv.roof), round: [0.5, 1.7], over: 0.3, slab: 0.14, tag: 'b', arc: 4,
    win: { rows: [[y2 + 0.7, y3 - 0.3]], step: 1.0, glass: liv.glass, share: 0.1, frame: 0.85 } });
  V.part('funnel', -2.9, 0, y2 + 1.8);
  _wmdVesFunnel(V, { a: -2.9, l: 0, y0: y1 + 0.16, y1: y3 + 1.9, ra: 1.1, rl: 1.45, rake: 0.5, hex: age(liv.funnel), band: liv.band, top: liv.stack, topH: 0.8 });
  V.part('mast', 1.4, 0, y3 + 2);
  V.line([[1.4, 0, y3 + 0.2], [1.4, 0, y3 + 3.4]], 0.14, age('#c4c8cc', 'metal'), 'metal', 'mast');
  V.line([[1.4, -0.9, y3 + 2.3], [1.4, 0.9, y3 + 2.3]], 0.08, '#c4c8cc', 'metal', 'yard');
  V.box(0.95, 1.85, -0.1, 0.1, y3 + 0.5, y3 + 0.75, '#2a2c30', '#3a3d42', 'metal', 'radar');
  V.lamp(1.4, 0, y3 + 3.5, 0.12, { col: '#fff2c8', kind: 'masthead', theta: h.aboard });
  V.lamp(3.0, 2.8, y3 - 0.4, 0.1, { col: '#7dff9a', kind: 'starboard', theta: h.aboard }); V.lamp(3.0, -2.8, y3 - 0.4, 0.1, { col: '#ff6a5a', kind: 'port', theta: h.aboard });
  // a searchlight and a liferaft on the wheelhouse roof, the funnel's whistle
  if (h.fine) { V.cyl(2.6, 0.9, y3 + 0.26, y3 + 0.6, 0.2, 0.2, '#c9ced2', { mat: 'metal', role: 'light' }); V.cyl(-0.4, -1.4, y3 + 0.26, y3 + 0.65, 0.32, 0.32, '#f2efe6', { mat: 'paint', role: 'raft' }); }
  return { height: (y3 + 3.6) * V.ky };
}

worldModelDefine('tug', {
  name: 'Harbour tug', ids: ['boat.tug'], sampleObj: 'boat.tug', float: true, solidity: 'solid',
  bob: { heave: 0.03, roll: 0.006, pitch: 0.002, period: 4.8 },
  dims(info) { const s = info && info.size; return { L: s && s.w > 12 && s.w < 40 ? s.w : 24, B: s && s.d > 5 ? Math.min(s.d, 12) : 8.6, H: s && s.h > 5 ? s.h : 9 }; },
  liveries: () => _WMD_VES_TUG,
  params(ent, o, p) { return p.liveryKey != null ? null : { liveryKey: Math.abs(ent.variant | 0) % 3 + (_wmdVesU(p.seed, 'tl') < 0.4 ? 2 : 0) }; },
  samples: [{ livery: 'black-red' }, { livery: 'blue', age: 0.6 }, { livery: 'orange' }, { livery: 'green', size: 1.1 }],
  footprint(p) { const L = p.L, B = p.B; return [[-L / 2 + 3, -B / 2], [L / 2 - 4, -B / 2], [L / 2, -B * 0.2], [L / 2, B * 0.2], [L / 2 - 4, B / 2], [-L / 2 + 3, B / 2], [-L / 2, B * 0.3], [-L / 2, -B * 0.3]]; },
  build: _wmdVesBuildTug,
});

/* ---------- the lifeboat ---------- */
const _WMD_VES_LIFEBOAT = Object.freeze([
  { name: 'navy-orange', hull: '#1f3a6a', stripe: '#f2efe6', antifoul: '#2a2a2e', house: '#e8501e', roof: '#e8501e', arch: '#e8501e', fender: '#17181b', glass: '#2b3948' },
  { name: 'navy-white', hull: '#223a64', stripe: '#c0392b', antifoul: '#2a2a2e', house: '#f2efe6', roof: '#e0e6ea', arch: '#e8501e', fender: '#17181b', glass: '#2b3948' },
  { name: 'red', hull: '#b6382c', stripe: '#f2efe6', antifoul: '#2a2a2e', house: '#f2efe6', roof: '#e0e6ea', arch: '#f2efe6', fender: '#17181b', glass: '#2b3948' },
  { name: 'yellow', hull: '#e8c030', stripe: '#1f3a6a', antifoul: '#2a2a2e', house: '#e8501e', roof: '#e8501e', arch: '#e8501e', fender: '#17181b', glass: '#2b3948' },
]);

/** An all-weather lifeboat, 14 m: a high bow, a low aft deck, a forward wheelhouse and an aft survivor cabin, a self-righting arch
 *  with its mast and aerials, a blue light, a D-fender along the gunwale. Nominal 14 x 4.4 x 6.5 m. */
function _wmdVesBuildLifeboat(p, h) {
  const V = _wmdVesCtx(h, p, 14, 4.4, 6.5), liv = p.livery, L = 14, hb = 2.2; V.crewLit = 0.4;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.7);
  const yd = a => 1.1 + 0.65 * Math.pow(Math.max(0, (a - 1.5) / (L / 2 - 1.5)), 2) + 0.12 * Math.pow(Math.max(0, (-a - 3) / 4), 2);
  V.part('hull', 0, 0, 0.6, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.76, bow: { len: 4.2, p: 1.7, q: 1.0, rake: 0.5 }, stern: { len: 1.2, p: 2, q: 1, tip: 0.6, rake: 0.1 }, yd, bulwark: 0.0,
    bands: [{ to: 0.5, hex: age(liv.antifoul), role: 'antifoul' }, { to: y => y - 0.3, hex: age(liv.hull), role: 'hull' }, { to: y => y - 0.22, hex: age(liv.stripe), role: 'stripe' }, { to: 'top', hex: age(liv.hull), role: 'hull' }] });
  for (const sg of [1, -1]) { V.sidePart('strake', sg, 0, sg * hb, 1.0); V.line(Hh.rim(sg, -0.04).map(q => [q[0], q[1] * 1.01, q[2]]), 0.26, '#17181b', 'fabric', 'fender'); }
  _wmdVesFoam(V, Hh, 0.35, 0.35);
  V.part('deck', 0, 0, 1.0, 1);
  const yDk = a => yd(a) - 0.04;
  if (h.above(1.0 * V.ky)) { const R = Hh.st.map(s => [s.a, Math.max(0, s.hd - 0.1), yDk(s.a)]), poly = R.concat(R.slice().reverse().map(q => [q[0], -q[1], q[2]])); V.face(poly, age('#8a8d90'), 'paint', 'deck', null); }
  // ---- the wheelhouse forward, the survivors' cabin aft
  const yF = yDk(1.5), yA = yDk(-2.4);
  V.part('wheelhouse', 1.5, 0, yF + 1.0);
  _wmdVesHouse(V, { a0: -0.4, a1: 3.6, hb: 1.45, y0: yF - 0.02, y1: yF + 1.95, hex: age(liv.house), roof: age(liv.roof), round: [0.2, 1.5], taper: 0.15, over: 0.1, slab: 0.12, tag: 'w', arc: 4,
    win: { rows: [[yF + 0.85, yF + 1.7]], step: 0.8, glass: liv.glass, share: 0.12, frame: 0.85 } });
  V.part('cabin', -2.6, 0, yA + 0.7);
  _wmdVesHouse(V, { a0: -4.6, a1: -0.7, hb: 1.5, y0: yA - 0.02, y1: yA + 1.35, hex: age(liv.house), roof: age(liv.roof), round: [0.3, 0.3], over: 0.08, slab: 0.1, tag: 'c', arc: 3,
    win: { rows: [[yA + 0.55, yA + 1.1]], step: 0.9, glass: liv.glass, share: 0.25, frame: 0.7 } });
  // ---- the self-righting arch over the aft cabin, the mast and the aerials
  V.part('arch', -2.7, 0, yA + 2.0);
  const aA = -2.7, yTop = yA + 3.0;
  for (const sg of [1, -1]) { V.line([[aA, sg * 1.45, yA + 1.2], [aA, sg * 1.1, yA + 2.5], [aA, sg * 0.5, yTop]], 0.16, age(liv.arch), 'paint', 'arch'); }
  V.line([[aA, -0.5, yTop], [aA, 0.5, yTop]], 0.16, age(liv.arch), 'paint', 'arch');
  V.line([[aA, 0, yTop], [aA, 0, yTop + 1.4]], 0.07, '#c4c8cc', 'metal', 'mast');
  V.box(aA - 0.4, aA + 0.4, -0.08, 0.08, yTop + 0.7, yTop + 0.9, '#2a2c30', '#3a3d42', 'metal', 'radar');
  V.line([[aA, 0, yTop + 1.4], [aA - 0.2, 0.7, yTop + 0.3]], 0.015, '#8a8f95', 'metal', 'aerial');
  V.lamp(aA, 0, yTop + 1.5, 0.12, { col: '#8cc0ff', kind: 'blue-light', theta: h.aboard });
  V.lamp(aA + 0.05, 1.5, yA + 1.3, 0.09, { col: '#7dff9a', kind: 'starboard', theta: h.aboard });
  V.lamp(aA + 0.05, -1.5, yA + 1.3, 0.09, { col: '#ff6a5a', kind: 'port', theta: h.aboard });
  // a bow rail and a towing post
  V.part('bow', 5.4, 0, yDk(5.4) + 0.4);
  V.cyl(4.6, 0, yDk(4.6), yDk(4.6) + 0.45, 0.16, 0.14, '#2a2c30', { mat: 'metal', role: 'bollard' });
  return { height: (yTop + 1.8) * V.ky };
}

worldModelDefine('lifeboat', {
  name: 'All-weather lifeboat', ids: ['boat.lifeboat'], sampleObj: 'boat.lifeboat', float: true, solidity: 'solid',
  bob: { heave: 0.035, roll: 0.012, pitch: 0.005, period: 3.6 },
  dims(info) { const s = info && info.size; return { L: s && s.w > 8 && s.w < 22 ? s.w : 14, B: s && s.d > 3 && s.d < 7 ? s.d : 4.4, H: s && s.h > 4 ? s.h : 6.5 }; },
  liveries: () => _WMD_VES_LIFEBOAT,
  samples: [{ livery: 'navy-orange' }, { livery: 'navy-white', age: 0.5 }, { livery: 'red' }, { livery: 'yellow', size: 1.1 }],
  build: _wmdVesBuildLifeboat,
});

/* ============================================================
   A PADDLE STEAMER and a working BARGE
   ============================================================ */
const _WMD_VES_STEAMER = Object.freeze([
  { name: 'black-cream', hull: '#1f2124', boot: '#7a1f1a', stripe: '#e8dcb0', house: '#efe6cc', roof: '#cfc7b0', funnel: '#b6382c', top: '#16171a', box: '#efe6cc', trim: '#c0a050', deck: '#8a8070', glass: '#2f3a44' },
  { name: 'maroon', hull: '#5a1f26', boot: '#1a1c1f', stripe: '#e8dcb0', house: '#f0e8d0', roof: '#cfc7b0', funnel: '#e8dcb0', top: '#16171a', box: '#f0e8d0', trim: '#c0a050', deck: '#8a8070', glass: '#2f3a44' },
  { name: 'blue-white', hull: '#22304c', boot: '#7a1f1a', stripe: '#f2efe6', house: '#f4f2ec', roof: '#c9ced2', funnel: '#f2efe6', top: '#22304c', box: '#f4f2ec', trim: '#2a5a8a', deck: '#827c70', glass: '#33414f' },
]);

/** A paddle steamer, 44 m: a slim hull with sponsons, two paddle boxes with their vents, saloons fore and aft of the engine casing,
 *  a promenade deck on rails, a bridge across the beam, two raked funnels, two masts. Nominal 44 x 11.4 x 14 m. */
function _wmdVesBuildSteamer(p, h) {
  const V = _wmdVesCtx(h, p, 44, 11.4, 14), liv = p.livery, L = 44, hb = 3.9; V.crewLit = 0.4;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.7);
  const yd = a => 2.35 + 0.75 * Math.pow(Math.max(0, (a - 6) / 16), 2) + 0.2 * Math.pow(Math.max(0, (-a - 10) / 12), 2), yDk = a => yd(a) - 0.05;
  V.part('hull', 0, 0, 1.2, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.86, bow: { len: 9, p: 1.7, q: 1.0, rake: 1.0 }, stern: { len: 6, p: 2, q: 2, rake: 0.6 }, yd, step: 5,
    bands: [{ to: 0.9, hex: age(liv.boot), role: 'hull' }, { to: y => y - 0.35, hex: age(liv.hull), role: 'hull' }, { to: y => y - 0.22, hex: age(liv.stripe), role: 'stripe' }, { to: 'top', hex: age(liv.hull), role: 'hull' }] });
  _wmdVesFoam(V, Hh, 0.5, 0.35);
  V.part('deck', 0, 0, 2.4, 1);
  const rim = (sg) => Hh.st.filter(s => s.a > -L / 2 + 1).map(s => [s.a, sg * s.hd, yDk(s.a)]);
  if (h.above(2.4 * V.ky)) { const R = Hh.st.map(s => [s.a, Math.max(0, s.hd - 0.1), yDk(s.a)]); V.face(R.concat(R.slice().reverse().map(q => [q[0], -q[1], q[2]])), age(liv.deck, 'timber'), 'timber', 'deck', null); }
  // ---- the paddle boxes: a sponson, a half-round housing with its vents and a gilt ring
  const aC = 0.6, rP = 3.3;
  for (const sg of [1, -1]) {
    const l0 = sg * hb, l1 = sg * (hb + 1.7), yB = yDk(aC);
    V.part('pbox' + sg, aC, sg * (hb + 0.9), yB + 1.5);
    // the half-round profile from the aft foot, over the top, to the fore foot
    const profile = [[aC - rP, yB - 0.05]];
    for (let k = 0; k <= 9; k++) { const th = Math.PI - k / 9 * Math.PI; profile.push([aC + rP * Math.cos(th), yB + rP * 0.92 * Math.sin(th)]); }
    profile.push([aC + rP, yB - 0.05]);
    _wmdVesProfile(V, profile, Math.min(l0, l1), Math.max(l0, l1), age(liv.box), { role: 'pbox' });
    const lf = l1 + sg * 0.02;
    if (h.fine) {
      for (let k = 1; k < 8; k++) { const th = k / 8 * Math.PI; V.line([[aC, lf, yB + 0.2], [aC + rP * 0.92 * Math.cos(th), lf, yB + 0.2 + rP * 0.8 * Math.sin(th)]], 0.07, age(liv.trim, 'paint'), 'paint', 'vent'); }
      const ring = []; for (let k = 0; k <= 12; k++) { const th = k / 12 * Math.PI; ring.push([aC + rP * 0.9 * Math.cos(th), lf, yB + rP * 0.9 * 0.92 * Math.sin(th)]); }
      V.line(ring, 0.12, age(liv.trim, 'paint'), 'paint', 'ring');
    }
    // the sponson deck under the box
    V.face([[aC - rP, l0, yB - 0.1], [aC + rP, l0, yB - 0.1], [aC + rP, l1, yB - 0.1], [aC - rP, l1, yB - 0.1]], age(liv.hull), 'paint', 'sponson', null);
  }
  // ---- the engine casing between the boxes, the saloons fore and aft, the promenade deck over them
  const y0 = yDk(0), y1 = y0 + 2.7;
  V.part('casing', 0.6, 0, (y0 + y1) / 2);
  _wmdVesHouse(V, { a0: -5.5, a1: 6.6, hb: 1.9, y0: y0 - 0.05, y1, hex: age(liv.house), roof: age(liv.roof), over: 0.12, slab: 0.1, tag: 'k', win: { rows: [[y0 + 0.8, y1 - 0.5]], step: 1.1, glass: liv.glass, share: 0.2, frame: 0.7 } });
  V.part('aft-saloon', -12, 0, (y0 + y1) / 2);
  _wmdVesHouse(V, { a0: -19, a1: -6.8, hb: 3.2, y0: yDk(-12) - 0.05, y1, hex: age(liv.house), roof: age(liv.roof), round: [3.5, 0.3], over: 0.2, slab: 0.14, tag: 'a', arc: 4,
    win: { rows: [[y0 + 0.75, y1 - 0.45]], step: 1.25, glass: liv.glass, share: 0.15, frame: 0.8 } });
  V.part('fore-saloon', 11, 0, (y0 + y1) / 2);
  _wmdVesHouse(V, { a0: 8.0, a1: 15.5, hb: 3.1, y0: yDk(11) - 0.05, y1, hex: age(liv.house), roof: age(liv.roof), round: [0.3, 3.0], over: 0.2, slab: 0.14, tag: 'f', arc: 4,
    win: { rows: [[y0 + 0.75, y1 - 0.45]], step: 1.25, glass: liv.glass, share: 0.15, frame: 0.8 } });
  // the promenade deck across the paddle boxes: rails round it, the bridge at the front
  const yP = y1 + 0.1;
  V.part('promenade', 0, 0, yP, 2);
  const pp = [[-19, 0.0], [-17, 3.0], [-9, 3.4], [9, 3.4], [14, 3.2], [16.5, 1.5], [17.5, 0]];
  const poly = pp.map(q => [q[0], q[1] * 1.0]).concat(pp.slice(0, -1).reverse().map(q => [q[0], -q[1]]));
  V.face(poly.map(q => [q[0], q[1], yP]), age(liv.deck, 'timber'), 'timber', 'deck', null);
  const runR = pp.map(q => [q[0], q[1]]), runL = pp.map(q => [q[0], -q[1]]);
  for (const [nm, path, sg] of [['rail-r', runR, 1], ['rail-l', runL, -1]]) { V.part(nm, 0, sg * 3.2, yP + 0.5, 2); V.rail(path, yP, 1.0, age(liv.house), { post: 1.6, mid: true, w: 0.05, mat: 'paint' }); }
  V.part('bridge', 7.0, 0, yP + 1.2);
  _wmdVesHouse(V, { a0: 5.2, a1: 9.4, hb: 3.0, y0: yP, y1: yP + 2.2, hex: age(liv.house), roof: age(liv.roof), round: [0.3, 1.2], over: 0.3, slab: 0.12, tag: 'b', arc: 3,
    win: { rows: [[yP + 0.7, yP + 1.95]], step: 1.0, glass: liv.glass, share: 0.1, frame: 0.88 } });
  // ---- two raked funnels and two masts
  for (const [i, a] of [[0, -3.0], [1, 2.8]]) { V.part('funnel' + i, a, 0, yP + 3); _wmdVesFunnel(V, { a, l: 0, y0: yP, y1: yP + 6.4, ra: 1.25, rl: 1.5, rake: 1.1, hex: age(liv.funnel), band: liv.top === '#22304c' ? '#f2efe6' : '#f2efe6', top: liv.top, topH: 1.0 }); }
  V.part('foremast', 16.5, 0, yDk(16.5) + 4);
  V.line([[16.5, 0, yDk(16.5)], [15.6, 0, yDk(16.5) + 8.4]], 0.2, age('#8a6a44', 'timber'), 'timber', 'mast');
  V.part('mainmast', -16.5, 0, yP + 3);
  V.line([[-16.5, 0, yP], [-17.4, 0, yP + 5.6]], 0.18, age('#8a6a44', 'timber'), 'timber', 'mast');
  V.line([[15.6, 0, yDk(16.5) + 8.4], [8.5, 0, yP + 2.2]], 0.03, '#4a4e54', 'metal', 'stay');
  V.line([[15.6, 0, yDk(16.5) + 8.4], [L / 2 - 1, 0, yDk(L / 2 - 1)]], 0.03, '#4a4e54', 'metal', 'stay');
  V.lamp(15.6, 0, yDk(16.5) + 8.5, 0.16, { col: '#fff2c8', kind: 'masthead', theta: h.aboard });
  // a pennant at the main
  if (h.fine) V.cloth([[-17.4, 0, yP + 5.5], [-19.4, 0, yP + 5.3], [-19.4, 0, yP + 4.9], [-17.4, 0, yP + 5.0]], 0.12, '#c0392b', { nu: 4, nv: 1, role: 'flag', side: 1 });
  return { height: (yP + 8.0) * V.ky };
}

worldModelDefine('steamer', {
  name: 'Paddle steamer', ids: ['boat.paddle-steamer'], sampleObj: 'boat.paddle-steamer', float: true, solidity: 'solid',
  bob: { heave: 0.03, roll: 0.004, pitch: 0.0016, period: 6.5 },
  dims(info, ent) { return { L: 44, B: 11.4, H: 14 }; },
  liveries: () => _WMD_VES_STEAMER,
  samples: [{ livery: 'black-cream' }, { livery: 'maroon', age: 0.5 }, { livery: 'blue-white' }],
  footprint(p) { const L = p.L, B = p.B; return [[-L / 2 + 5, -B * 0.34], [-8, -B / 2], [8, -B / 2], [L / 2 - 8, -B * 0.34], [L / 2, 0], [L / 2 - 8, B * 0.34], [8, B / 2], [-8, B / 2], [-L / 2 + 5, B * 0.34]]; },
  build: _wmdVesBuildSteamer,
});

/* ---------- the working barge ---------- */
const _WMD_VES_BARGE = Object.freeze([
  { name: 'black', hull: '#202326', boot: '#6b2a1c', cabin: '#f1efe8', roof: '#8a2a22', trim: '#c9b070', cover: '#2c4a6a', cargo: '#3a3a3c', glass: '#33414f' },
  { name: 'green', hull: '#27503a', boot: '#2a2a2e', cabin: '#efe9d4', roof: '#4a4a46', trim: '#e0c060', cover: '#2f4a38', cargo: '#8a7a5a', glass: '#33414f' },
  { name: 'oxide', hull: '#7a2a1c', boot: '#1c1e20', cabin: '#e6e0cc', roof: '#2a2c30', trim: '#d9b44a', cover: '#3a4a58', cargo: '#6a6a66', glass: '#33414f' },
  { name: 'blue', hull: '#25406a', boot: '#2a2a2e', cabin: '#f2efe6', roof: '#c4ccd2', trim: '#e0c060', cover: '#6a2a24', cargo: '#4a4a4c', glass: '#33414f' },
]);

/** A working canal or river barge, 24 m: a blunt raked bow, an open hold with coamings (a tarpaulin, hatch boards or a heap of
 *  cargo, seeded), a wheelhouse and stack aft, bollards, tyres. Nominal 24 x 4.6 x 3.4 m. */
function _wmdVesBuildBarge(p, h) {
  const V = _wmdVesCtx(h, p, 24, 4.6, 3.4), liv = p.livery, L = 24, hb = 2.3;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.8);
  const load = p.opts.load != null ? p.opts.load : h.u('load');   // 0 empty .. 1 down to her marks
  const free = 1.05 - 0.5 * load, yd = a => free + 0.3 * Math.pow(Math.max(0, (a - 4) / 8), 2) + 0.05 * Math.pow(Math.max(0, (-a - 8) / 4), 2);
  V.part('hull', 0, 0, 0.6, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.92, bow: { len: 3.6, p: 1.5, q: 1.2, tip: 0.38, rake: 0.5 }, stern: { len: 2.8, p: 2, q: 1.6, rake: 0.3 }, yd, bulwark: 0.0, step: 4,
    bands: [{ to: 0.35, hex: age(liv.boot), role: 'hull' }, { to: 'top', hex: age(liv.hull), role: 'hull' }] });
  Hh.cap(age(liv.trim), 0.1, 'paint', 0.02);
  _wmdVesFoam(V, Hh, 0.3, 0.3);
  V.part('deck', 0, 0, free, 1);
  const yDk = a => yd(a) - 0.03;
  if (h.above(free * V.ky)) { const R = Hh.st.map(s => [s.a, Math.max(0, s.hd - 0.08), yDk(s.a)]); V.face(R.concat(R.slice().reverse().map(q => [q[0], -q[1], q[2]])), age('#5a5750', 'paint'), 'paint', 'deck', null); }
  // ---- the hold: coamings and its covering
  const a0 = -5.5, a1 = 9.0, yC = yDk(2) + 0.5, wH = 1.65;
  V.part('hold', (a0 + a1) / 2, 0, yC);
  const cargo = h.u('cargo'), covered = cargo < 0.5, heap = cargo >= 0.5 && cargo < 0.8;
  for (const sg of [1, -1]) V.box(a0, a1, sg * wH, sg * (wH + 0.12), yDk(2) - 0.02, yC, age(liv.hull), age(liv.trim), 'paint', 'coaming');
  for (const a of [a0, a1 - 0.12]) V.box(a, a + 0.12, -wH, wH, yDk(2) - 0.02, yC, age(liv.hull), age(liv.trim), 'paint', 'coaming');
  if (covered) V.cloth([[a0, -wH - 0.1, yC + 0.02], [a1, -wH - 0.1, yC + 0.02], [a1, wH + 0.1, yC + 0.02], [a0, wH + 0.1, yC + 0.02]], 0.16, age(liv.cover, 'fabric'), { nu: 6, nv: 2, role: 'tarpaulin', side: 1, seams: 0 });
  else if (heap) { const pl0 = [[a0 + 0.2, -wH + 0.05], [a1 - 0.2, -wH + 0.05], [a1 - 0.2, wH - 0.05], [a0 + 0.2, wH - 0.05]], pl1 = [[a0 + 1.6, -0.5], [a1 - 1.6, -0.5], [a1 - 1.6, 0.5], [a0 + 1.6, 0.5]]; V.solid(pl0, yC - 0.1, pl1, yC + 0.65 + 0.4 * load, age(liv.cargo, 'stone'), { mat: 'gravel', role: 'cargo' }); }
  else V.face([[a0, -wH, yC + 0.01], [a1, -wH, yC + 0.01], [a1, wH, yC + 0.01], [a0, wH, yC + 0.01]], age('#7a6a52', 'timber'), 'timber', 'hatch', null);
  // ---- the wheelhouse aft, the stack, the rail
  const yW0 = yDk(-8.8) - 0.03, yW1 = yW0 + 2.0;
  V.part('wheelhouse', -8.8, 0, yW0 + 1);
  _wmdVesHouse(V, { a0: -10.4, a1: -7.0, hb: 1.45, y0: yW0, y1: yW1, hex: age(liv.cabin), roof: age(liv.roof), round: [0.5, 0.2], over: 0.12, slab: 0.1, tag: 'w', arc: 3,
    win: { rows: [[yW0 + 0.9, yW1 - 0.3]], step: 0.85, glass: liv.glass, share: 0.25, frame: 0.8 } });
  V.part('stack', -8.0, 0.5, yW1 + 0.6);
  V.cyl(-8.0, 0.55, yW1, yW1 + 0.9, 0.16, 0.13, '#1c1e22', { mat: 'metal', role: 'stack' });
  V.part('bollards', 10, 0, yDk(10) + 0.2);
  for (const [a, l] of [[10.2, 0.9], [10.2, -0.9], [-4.5, 2.0], [-4.5, -2.0]]) V.cyl(a, l * (Hh.half(a) / hb), yDk(a), yDk(a) + 0.4, 0.1, 0.09, '#2a2c30', { mat: 'metal', role: 'bollard' });
  // tyres on the bow and sides
  if (h.fine) for (const sg of [1, -1]) { V.sidePart('tyres', sg, 0, sg * hb, 1.0); for (const a of [-6, -2, 2, 6]) V.disc([a, sg * Hh.half(a) * 1.04, yd(a) - 0.4], 0.22, '#17181b', 'fabric', 'tyre', 0.95); }
  return { height: (yW1 + 1.6) * V.ky };
}

worldModelDefine('barge', {
  name: 'Working barge', ids: ['boat.canal-barge'], sampleObj: 'boat.canal-barge', float: true, solidity: 'solid',
  bob: { heave: 0.012, roll: 0.003, pitch: 0.0012, period: 5.4 },
  dims(info) { const s = info && info.size; return { L: s && s.w > 10 && s.w < 40 ? s.w : 24, B: s && s.d > 2.5 && s.d < 8 ? s.d : 4.6, H: s && s.h > 2 ? s.h : 3.4 }; },
  liveries: () => _WMD_VES_BARGE,
  samples: [{ livery: 'black' }, { livery: 'green', age: 0.6 }, { livery: 'oxide' }, { livery: 'blue', size: 1.1 }],
  build: _wmdVesBuildBarge,
});

/* ============================================================
   A PASSENGER LAUNCH: a water taxi (a cabin forward, an open well aft) or a bumboat (an open boat under a striped canopy)
   ============================================================ */
const _WMD_VES_LAUNCH = Object.freeze([
  { name: 'yellow', hull: '#e8c030', top: '#25282c', antifoul: '#2a2a2e', house: '#f2efe6', roof: '#e8c030', canopy: ['#e8c030', '#25282c'], glass: '#33414f', seat: '#6a4a2a' },
  { name: 'white-blue', hull: '#f2f4f4', top: '#2a5a8a', antifoul: '#2a2a2e', house: '#f2f4f4', roof: '#2a5a8a', canopy: ['#2a5a8a', '#f2f4f4'], glass: '#33414f', seat: '#a07a4a' },
  { name: 'green', hull: '#2f6a4a', top: '#e8dcb0', antifoul: '#3a3a3a', house: '#efe9d4', roof: '#2f6a4a', canopy: ['#2f6a4a', '#efe9d4'], glass: '#33414f', seat: '#a07a4a' },
  { name: 'red', hull: '#b6382c', top: '#f2efe6', antifoul: '#2a2a2e', house: '#f2efe6', roof: '#b6382c', canopy: ['#b6382c', '#f2efe6'], glass: '#33414f', seat: '#8a6a44' },
  { name: 'navy', hull: '#22304c', top: '#e0b838', antifoul: '#3a3a3a', house: '#f1efe6', roof: '#22304c', canopy: ['#22304c', '#e0b838'], glass: '#33414f', seat: '#a07a4a' },
]);

/** A passenger launch, 8 to 12 m: a flared bow, a bulwark, a cabin with a sloping windscreen (water taxi) or a canopy on poles over
 *  benches (bumboat), an outboard or a stern light, fenders. */
function _wmdVesBuildLaunch(p, h) {
  const L = p.L0, V = _wmdVesCtx(h, p, L, L * 0.325, L * 0.31), liv = p.livery, hb = L * 0.325 / 2, k = L / 8;
  const age = (hex, kk) => h.aged(hex, kk || 'paint', 0.8);
  const canopy = p.style === 'canopy', bul = 0.32 * k;
  const yd = a => (0.78 + 0.32 * Math.pow(Math.max(0, (a - 0.2 * k) / (L / 2 - 0.2 * k)), 2.2)) * k;
  V.part('hull', 0, 0, 0.4 * k, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.74, bow: { len: 2.3 * k, p: 1.7, q: 1.1, rake: 0.25 * k }, stern: { len: 0.7 * k, p: 2, q: 1, tip: 0.78, rake: 0 }, yd, bulwark: bul, step: 1.6 * k,
    bands: [{ to: 0.28 * k, hex: age(liv.antifoul), role: 'antifoul' }, { to: y => y - 0.2 * k, hex: age(liv.hull), role: 'hull' }, { to: 'top', hex: age(liv.top), role: 'strake' }] });
  Hh.cap(age(liv.top), 0.08 * k, 'paint', 0.015);
  _wmdVesFoam(V, Hh, 0.2 * k, 0.3);
  V.part('deck', 0, 0, 0.5 * k, 1);
  Hh.deck(age('#8a8070', 'timber'), 'timber', 0.1);
  Hh.inner(age(liv.hull), 0.08);
  const yDk = a => yd(a) - bul;
  if (!canopy) {
    const a0 = -1.9 * k, a1 = 1.7 * k, y0 = yDk(0), y1 = y0 + 1.55 * k;
    V.part('cabin', (a0 + a1) / 2, 0, (y0 + y1) / 2);
    _wmdVesHouse(V, { a0, a1, hb: hb * 0.74, y0: y0 - 0.02, y1, hex: age(liv.house), roof: age(liv.roof), round: [0.2 * k, 0.5 * k], taper: 0.22 * k, over: 0.1 * k, slab: 0.08 * k, tag: 'c', arc: 3,
      win: { rows: [[y0 + 0.6 * k, y1 - 0.25 * k]], step: 0.95 * k, glass: liv.glass, share: 0.12, frame: 0.85, crew: 0.4 } });
    V.part('sign', (a0 + a1) / 2, 0, y1 + 0.2);
    V.box((a0 + a1) / 2 - 0.3 * k, (a0 + a1) / 2 + 0.3 * k, -0.17 * k, 0.17 * k, y1 + 0.12 * k, y1 + 0.3 * k, '#f2efe6', '#f2efe6', 'paint', 'sign');
    V.part('motor', -L / 2 - 0.1, 0, yDk(-L / 2) + 0.2);
    V.box(-L / 2 - 0.28 * k, -L / 2 - 0.02 * k, -0.14 * k, 0.14 * k, yDk(-L / 2) - 0.1 * k, yDk(-L / 2) + 0.55 * k, '#2a2c30', '#3a3d42', 'metal', 'outboard');
  } else {
    const aa0 = -2.8 * k, aa1 = 2.2 * k, y0 = yDk(0), yT = y0 + 1.85 * k;
    V.part('seats', 0, 0, y0 + 0.3, 2);
    for (const l of [-0.6 * k, 0.6 * k]) V.box(aa0 + 0.2 * k, aa1 - 0.2 * k, l - 0.17 * k, l + 0.17 * k, y0, y0 + 0.4 * k, age(liv.seat, 'timber'), age(h.shade(liv.seat, 1.1), 'timber'), 'timber', 'seat');
    V.part('canopy', (aa0 + aa1) / 2, 0, yT, 2.2);
    for (const [a, l] of [[aa0, -0.95 * k], [aa0, 0.95 * k], [aa1, -0.95 * k], [aa1, 0.95 * k], [0, -0.95 * k], [0, 0.95 * k]]) V.line([[a, l, y0], [a, l, yT]], 0.06 * k, age('#d9d6cc'), 'metal', 'pole');
    V.cloth([[aa0 - 0.2 * k, -1.15 * k, yT], [aa1 + 0.2 * k, -1.15 * k, yT], [aa1 + 0.2 * k, 1.15 * k, yT], [aa0 - 0.2 * k, 1.15 * k, yT]], 0.1 * k, liv.canopy[0], { stripe: liv.canopy, nu: 8, nv: 1, role: 'canopy', side: 1 });
  }
  V.part('lamp', L / 2 - 0.5 * k, 0, yd(L / 2 - 0.5 * k) + 0.5);
  V.lamp(L / 2 - 0.9 * k, 0, yd(L / 2 - 0.9 * k) + 0.25 * k, 0.07 * k, { col: '#fff2c8', kind: 'bow', theta: h.aboard });
  if (h.fine) for (const sg of [1, -1]) { V.sidePart('fend', sg, 0, sg * hb, 0.6 * k); for (const a of [-1.8 * k, 0.2 * k, 2.0 * k]) { const w = Hh.half(a); V.line([[a, sg * w, yd(a) - 0.02], [a, sg * w * 1.06, yd(a) - 0.34 * k]], 0.12 * k, '#1a1a1a', 'fabric', 'fender'); } }
  return { height: (canopy ? 2.6 : 2.4) * k * V.ky };
}

worldModelDefine('launch', {
  name: 'Passenger launch (water taxi, bumboat)', ids: ['boat.water-taxi', 'boat.bumboat'], sampleObj: 'boat.water-taxi', float: true, solidity: 'solid',
  bob: { heave: 0.03, roll: 0.01, pitch: 0.005, period: 2.9 },
  dims(info, ent) { const L = ent && ent.obj === 'boat.bumboat' ? 12 : 8; return { L, B: L * 0.325, H: L * 0.31 }; },
  liveries: () => _WMD_VES_LAUNCH,
  params(ent, o, p) { const bum = ent.obj === 'boat.bumboat', st = p.opts.style; return { L0: bum ? 12 : 8, style: st === 'canopy' || st === 'cabin' ? st : bum ? 'canopy' : 'cabin' }; },
  samples: [{ livery: 'yellow' }, { livery: 'white-blue', age: 0.5 }, { livery: 'green' }, { livery: 'red', size: 1.2 }],
  build: _wmdVesBuildLaunch,
});

/* ============================================================
   SMALL BOATS: a rowing boat (clinker, thwarts, oars) and a canoe or kayak with its paddler
   ============================================================ */
const _WMD_VES_ROWING = Object.freeze([
  { name: 'white', hull: '#f2efe6', inner: '#e8e0cc', top: '#a07a4a', stripe: '#2f5a8a', seat: '#b88a58' },
  { name: 'green', hull: '#2f6a4a', inner: '#e8e0cc', top: '#e8dcb0', stripe: '#e8dcb0', seat: '#b88a58' },
  { name: 'blue', hull: '#2f5a8a', inner: '#e8e0cc', top: '#f2efe6', stripe: '#f2efe6', seat: '#c8a070' },
  { name: 'varnish', hull: '#c8a070', inner: '#d8c090', top: '#8a6a44', stripe: '#8a2a22', seat: '#a07a4a' },
  { name: 'red', hull: '#a8322a', inner: '#e8e0cc', top: '#f2efe6', stripe: '#f2efe6', seat: '#b88a58' },
]);

/** A rowing boat, 3.7 m: a clinker hull with a pointed bow and a transom, floorboards, three thwarts, two oars in their rowlocks
 *  (out, or shipped inboard), a rower in some. Nominal 3.7 x 1.35 x 0.7 m. */
function _wmdVesBuildRowing(p, h) {
  const V = _wmdVesCtx(h, p, 3.7, 1.35, 0.75), liv = p.livery, L = 3.7, hb = 0.67;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.8);
  const out = h.u('oars') < 0.55, rower = h.u('rower') < 0.5;
  const yd = a => 0.34 + 0.2 * Math.pow(Math.max(0, (a - 0.1) / (L / 2 - 0.1)), 2.2) + 0.04 * Math.pow(Math.max(0, (-a - 0.4) / 1.4), 1.5);
  V.part('hull', 0, 0, 0.2, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.62, bow: { len: 1.5, p: 1.8, q: 1.1, rake: 0.1 }, stern: { len: 0.5, p: 2, q: 1, tip: 0.7, rake: 0 }, yd, draft: 0.12, bilge: 0.45, step: 0.8,
    bands: [{ to: 0, hex: age('#3b3f46'), role: 'antifoul' }, { to: 0.06, hex: age(liv.stripe), role: 'boot' }, { to: 'top', hex: age(liv.hull), role: 'hull' }] });
  if (h.fine) V.line(Hh.st.map(s => [s.a - s.ov * 0.5, s.hd * (0.62 + 0.38 * Math.pow(0.5, 0.7)) * 1.004, s.yd * 0.5]), 0.025, h.shade(age(liv.hull), 0.8), 'paint', 'strake');
  Hh.cap(age(liv.top, 'timber'), 0.05, 'timber', 0.012);
  _wmdVesFoam(V, Hh, 0.12, 0.25);
  V.part('inside', 0, 0, 0.1, 1);
  if (h.above(0.4 * V.ky)) {
    const R = Hh.st.filter(s => s.a > -L / 2 + 0.1 && s.a < L / 2 - 0.5), fl = R.map(s => [s.a, 0.58 * s.hd, 0.07]);
    V.face(fl.concat(fl.slice().reverse().map(q => [q[0], -q[1], q[2]])), age(liv.inner, 'timber'), 'timber', 'floor', null);
    for (let i = 0; i + 1 < R.length; i++) for (const sg of [1, -1]) {
      const s0 = R[i], s1 = R[i + 1];
      V.face([[s0.a, sg * 0.58 * s0.hd, 0.07], [s1.a, sg * 0.58 * s1.hd, 0.07], [s1.a, sg * (s1.hd - 0.025), s1.yd], [s0.a, sg * (s0.hd - 0.025), s0.yd]], age(liv.inner), 'paint', 'inner', [(s0.a + s1.a) / 2, sg * 1.6, 0.2]);
    }
    for (const a of [-0.78, 0.0, 0.7]) { const w = Hh.half(a) - 0.04; V.box(a - 0.14, a + 0.14, -w, w, yd(a) - 0.17, yd(a) - 0.13, age(liv.seat, 'timber'), age(h.shade(liv.seat, 1.1), 'timber'), 'timber', 'thwart'); }
  }
  // ---- the oars, at the rowlocks of the middle thwart
  V.part('oars', 0, 0, 0.5, 2);
  const aR = 0.0, yR = yd(aR) + 0.03, lR = Hh.half(aR) + 0.01;
  for (const sg of [1, -1]) {
    if (out) {
      const swing = (h.u('swing') - 0.5) * 0.5;
      V.line([[aR + 0.1, -sg * 0.16, yR + 0.28], [aR, sg * lR, yR], [aR + swing - 0.2, sg * 2.0, yR - 0.62]], 0.045, age('#c8a070', 'timber'), 'timber', 'oar');
      V.line([[aR + swing - 0.2, sg * 2.0, yR - 0.62], [aR + swing - 0.55, sg * 2.2, yR - 0.72]], 0.16, age('#c8a070', 'timber'), 'timber', 'blade');
    } else V.line([[aR + 0.2, -sg * 0.2, yR + 0.04], [aR - 1.55, sg * 0.42, yR + 0.1]], 0.04, age('#c8a070', 'timber'), 'timber', 'oar');
  }
  if (rower && out) {
    V.part('rower', 0.0, 0, 0.9, 2);
    // a rower sits on the thwart facing the stern, knees up, feet braced on the stretcher, hands on the oar looms
    _wmdLdgSeated(V, { a: 0.0, l: 0, y: yd(0) - 0.13, face: -1, out: 0, lean: 0, leanA: 0.1, top: ['#2a4a6a', '#7a2a24', '#d8d4cc', '#3a5a3a'][Math.floor(h.u('shirt') * 4)], trousers: '#2f3640',
      skin: ['#e6bf9a', '#c89a78', '#9a6a48'][Math.floor(h.u('skin') * 3)], hair: ['#2a2220', '#8a6a3e', '#c9b48a'][Math.floor(h.u('hair') * 3)], legs: 'bent', feet: [-0.72, 0, 0.1],
      hands: [[aR + 0.1, -0.16, yR + 0.28], [aR + 0.1, 0.16, yR + 0.28]] });
  }
  return { height: 0.75 * V.ky };
}

worldModelDefine('rowing', {
  name: 'Rowing boat', ids: ['boat.rowing-boat'], sampleObj: 'boat.rowing-boat', float: true, solidity: 'solid',
  bob: { heave: 0.025, roll: 0.012, pitch: 0.006, period: 2.4 },
  dims() { return { L: 3.7, B: 1.35, H: 0.75 }; },
  liveries: () => _WMD_VES_ROWING,
  samples: [{ livery: 'white' }, { livery: 'green', age: 0.5 }, { livery: 'blue' }, { livery: 'varnish', size: 1.2 }],
  build: _wmdVesBuildRowing,
});

/* ---------- a canoe or a kayak, with its paddler ---------- */
const _WMD_VES_PADDLE = Object.freeze([
  { name: 'red', hull: '#c0392b', deck: '#e8501e', trim: '#f2efe6', top: '#2a2c30', suit: '#2a4a8a', helmet: '#f2c030' },
  { name: 'yellow', hull: '#e8c030', deck: '#f2d860', trim: '#2a2c30', top: '#2a2c30', suit: '#c0392b', helmet: '#2a4a8a' },
  { name: 'blue', hull: '#2f5a8a', deck: '#3a7ab8', trim: '#f2efe6', top: '#f2efe6', suit: '#e8c030', helmet: '#c0392b' },
  { name: 'green', hull: '#2f6a4a', deck: '#4a8a5a', trim: '#f2efe6', top: '#f2efe6', suit: '#d8402e', helmet: '#f2efe6' },
  { name: 'orange', hull: '#e07a1e', deck: '#e8963a', trim: '#2a2c30', top: '#2a2c30', suit: '#2a4a8a', helmet: '#2a2c30' },
]);

/** A kayak (decked, a cockpit coaming, a double paddle) or an open canoe (thwarts, a single paddle), 4.3 m, with a paddler. */
function _wmdVesBuildPaddle(p, h) {
  const kayak = p.kind === 'kayak', L = kayak ? 4.3 : 4.8, B = kayak ? 0.62 : 0.86, V = _wmdVesCtx(h, p, L, B, kayak ? 1.0 : 1.1), liv = p.livery, hb = B / 2;
  const age = (hex, k) => h.aged(hex, k || 'paint', 0.8);
  const crew = p.opts.paddler != null ? !!p.opts.paddler : h.u('crew') < 0.8;
  const yd = a => (kayak ? 0.2 : 0.26) + 0.1 * Math.pow(Math.abs(a) / (L / 2), 2.4);
  V.part('hull', 0, 0, 0.1, 3);
  const Hh = _wmdVesHull(V, { L, hb, kW: 0.8, bow: { len: L * 0.4, p: 1.7, q: 1.0, rake: 0.05 }, stern: { len: L * 0.4, p: 1.7, q: 1.0, rake: 0.05 }, yd, draft: 0.1, bilge: 0.5, step: 0.9,
    bands: [{ to: 0, hex: age('#3b3f46'), role: 'antifoul' }, { to: 'top', hex: age(liv.hull), role: 'hull' }] });
  _wmdVesFoam(V, Hh, 0.1, 0.25);
  V.part('deck', 0, 0, 0.3, 1);
  if (kayak) {
    // the deck over the hull, a coaming at the cockpit, bungee lines
    if (h.above(0.28 * V.ky)) {
      const R = Hh.st.map(s => [s.a, Math.max(0, s.hd - 0.01), s.yd + 0.02 + 0.07 * (1 - Math.pow(Math.abs(s.a) / (L / 2), 2))]);
      V.face(R.concat(R.slice().reverse().map(q => [q[0], -q[1], q[2]])), age(liv.deck), 'paint', 'deck', null);
    }
    V.part('coaming', -0.1, 0, 0.35, 2);
    V.solid(_wmdVesEllipse(-0.1, 0, 0.42, 0.24, 10), 0.26, _wmdVesEllipse(-0.1, 0, 0.42, 0.24, 10), 0.4, age(liv.trim), { mat: 'paint', role: 'coaming', cap: '#1c1e22' });
  } else {
    if (h.above(0.3 * V.ky)) {
      const R = Hh.st.filter(s => s.a > -L / 2 + 0.2 && s.a < L / 2 - 0.2), fl = R.map(s => [s.a, 0.6 * s.hd, 0.06]);
      V.face(fl.concat(fl.slice().reverse().map(q => [q[0], -q[1], q[2]])), age('#c8b890', 'timber'), 'timber', 'floor', null);
      for (let i = 0; i + 1 < R.length; i++) for (const sg of [1, -1]) { const s0 = R[i], s1 = R[i + 1]; V.face([[s0.a, sg * 0.6 * s0.hd, 0.06], [s1.a, sg * 0.6 * s1.hd, 0.06], [s1.a, sg * (s1.hd - 0.02), s1.yd], [s0.a, sg * (s0.hd - 0.02), s0.yd]], age(liv.hull), 'paint', 'inner', [(s0.a + s1.a) / 2, sg * 1.2, 0.15]); }
    }
    V.part('thwarts', 0, 0, 0.3, 2);
    for (const a of [-0.9, 0.0, 1.0]) { const w = Hh.half(a) - 0.02; V.box(a - 0.06, a + 0.06, -w, w, yd(a) - 0.05, yd(a) - 0.01, age('#8a6a44', 'timber'), age('#a07a4a', 'timber'), 'timber', 'thwart'); }
  }
  Hh.cap(age(liv.trim), 0.04, 'paint', 0.01);
  // ---- the paddler, seated (a kayak) or kneeling (a canoe), and the paddle
  if (crew) {
    const aS = kayak ? -0.1 : -0.35, yS = kayak ? 0.36 : 0.32, suit = age(liv.suit, 'fabric'), sk = ['#e6bf9a', '#c89a78', '#9a6a48'][Math.floor(h.u('skin') * 3)];
    V.part('paddler', aS, 0, yS + 0.4, 2);
    V.line([[aS, 0, yS], [aS + 0.02, 0, yS + 0.46]], 0.3, suit, 'fabric', 'torso');
    V.disc([aS + 0.02, 0, yS + 0.62], 0.1, sk, 'skin', 'head', 1);
    V.disc([aS + 0.02, 0, yS + 0.67], 0.115, age(liv.helmet), 'paint', 'helmet', 0.6);
    const tilt = (h.u('stroke') - 0.5) * 0.5;
    if (kayak) {
      V.line([[aS + 0.3 + tilt, -1.05, yS + 0.55 - tilt * 0.4], [aS + 0.2, 0, yS + 0.42], [aS + 0.3 - tilt, 1.05, yS + 0.55 + tilt * 0.4]], 0.035, '#2a2c30', 'metal', 'paddle');
      for (const sg of [1, -1]) V.line([[aS + 0.3 - sg * tilt, sg * 1.0, yS + 0.55 + sg * tilt * 0.4], [aS + 0.3 - sg * tilt, sg * 1.3, yS + 0.55 + sg * tilt * 0.55]], 0.2, age(liv.deck), 'paint', 'blade');
      for (const sg of [1, -1]) V.line([[aS, sg * 0.15, yS + 0.38], [aS + 0.2, sg * 0.45, yS + 0.46]], 0.08, suit, 'fabric', 'arm');
    } else {
      V.line([[aS + 0.15, 0.3, yS + 0.5], [aS + 0.4, 0.62, yS + 0.1], [aS + 0.42, 0.96, yS - 0.5]], 0.04, '#8a6a44', 'timber', 'paddle');
      V.line([[aS + 0.42, 0.96, yS - 0.5], [aS + 0.45, 1.02, yS - 0.7]], 0.17, '#8a6a44', 'timber', 'blade');
      V.line([[aS, 0.1, yS + 0.38], [aS + 0.2, 0.3, yS + 0.5]], 0.08, suit, 'fabric', 'arm');
    }
  }
  return { height: (kayak ? 1.0 : 1.1) * V.ky };
}

worldModelDefine('paddle', {
  name: 'Kayak and canoe', ids: ['boat.kayak', 'boat.canoe'], sampleObj: 'boat.kayak', float: true, solidity: 'solid',
  bob: { heave: 0.02, roll: 0.02, pitch: 0.008, period: 2.1 },
  dims(info, ent) { const k = ent && ent.model && ent.model.opts && ent.model.opts.kind; const kayak = k ? k === 'kayak' : !(ent && /canoe/.test(ent.obj || '')); return kayak ? { L: 4.3, B: 0.62, H: 1.0 } : { L: 4.8, B: 0.86, H: 1.1 }; },
  liveries: () => _WMD_VES_PADDLE,
  params(ent, o, p) { const k = p.opts.kind; return { kind: k ? (k === 'canoe' ? 'canoe' : 'kayak') : (/canoe/.test(ent.obj || '') ? 'canoe' : 'kayak') }; },
  samples: [{ livery: 'red' }, { livery: 'yellow', age: 0.5 }, { livery: 'blue' }, { livery: 'green', size: 1.2 }],
  build: _wmdVesBuildPaddle,
});

/* ============================================================
   LIBRARY OBJECTS FOR THE CLASSES THAT HAD NO ID
   A scene names an object id; the validator wants a library descriptor with a real size. These ids are the model's classes: the
   world draws the parametric model; the art (borrowed from the nearest sprite) is only the fallback of a failed build and of the
   v2 renderer. weight 0: no kit or archetype fill ever picks them, a scene names them.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneObj !== 'function') return;   // the engine core is not in this build
  const ALIAS = [
    ['boat.yacht', 'boat.dinghy', { h: 14, l: 9.6, w: 3.1 }, 'a cruising yacht (bermudan sloop)'],
    ['boat.coble', 'boat.fishing-boat', { h: 3.6, l: 8.5, w: 2.5 }, 'a Whitby coble'],
    ['boat.lifeboat', 'boat.fishing-boat', { h: 6.5, l: 14, w: 4.4 }, 'an all-weather lifeboat'],
    ['boat.trip-boat', 'boat.ferry', { h: 9, l: 30, w: 7.4 }, 'a river trip boat'],
    ['boat.paddle-steamer', 'boat.river-ferry', { h: 14, l: 44, w: 11.4 }, 'a paddle steamer'],
    ['boat.canal-barge', 'boat.narrowboat', { h: 3.4, l: 24, w: 4.6 }, 'a working barge'],
    ['boat.widebeam', 'boat.narrowboat', { h: 2.3, l: 15, w: 3.6 }, 'a widebeam canal boat (the narrowboat model, 15 m x 3.6 m)'],
    ['boat.rowing-boat', 'boat.dinghy', { h: 0.75, l: 3.7, w: 1.35 }, 'a rowing boat'],
    ['boat.kayak', 'boat.dinghy', { h: 1.0, l: 4.3, w: 0.62 }, 'a kayak'],
    ['boat.canoe', 'boat.dinghy', { h: 1.1, l: 4.8, w: 0.86 }, 'a canoe'],
  ];
  for (const [id, from, real, what] of ALIAS) {
    if (sceneObj(id)) continue;
    const src = sceneObj(from);
    if (!src) continue;
    sceneObjDefine(Object.assign({}, src, { id, weight: 0, real, views: undefined, tags: ['uk', 'boat', 'kit:boats', 'kit:water', 'role:boat', 'model'], credit: 'world vessel model (79-world-4models-vessels.js): ' + what + '; the sprite is the dinghy or fishing-boat art, a fallback only' }));
  }
})();

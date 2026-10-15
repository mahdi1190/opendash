/* ============================================================
   SCENE ENGINE v2: GOTHIC RUINS for the procedural building generator (70-scene-gen-0building.js; docs/dev/WORLD_ENGINE.md 14.2;
   docs/dev/SCENE_LESSONS.md T). PURE: functions and consts only, nothing runs at load but the element registration. Private names: _scru.
   The STYLE (data and presets) is 70-scene-gen-style-gothic-ruin.js, which loads after this file.

   What a roofless stone ruin needs that a house never does, built ONCE for any abbey, priory, castle hall or burnt-out church:
     WALL RUNS     a run is a straight wall of real thickness: a list of COLUMNS (piers and bays) along it, each with its own broken top
                   height (a ruin's top edge is a jagged line, never a ruler's) and a stack of OPENINGS: lancets (pointed arches), round
                   arches, rectangular lights, or a GAP (a window whose head has gone, open to the sky). Each face of a run is drawn as the
                   wall minus its openings: the openings are REAL holes (the sky, or the wall behind, shows through them), not dark
                   rectangles, so a gaunt arcade reads against the sky at any time of day and in any weather.
     REVEALS       the thickness of the wall seen inside every opening (jambs, sill and the curve of the arch's soffit), lit by the real sun
                   by its own normal, near enough to read.
     BLOCKS        free-standing piers, turrets and stumps: prisms with a broken top (each corner its own height) or a pinnacle.
     ORDER         far to near, per run and block: through a window of the near wall the far wall's inner face shows, as in the real thing.
   Every solid is a few merged shapes (all the wall pieces of one face in three stone tones, then the reveals by light level), so a whole
   abbey stays inside the generator's shape budget; detail follows the size on screen (tiers: coursing and streaks only near).
   No lettering, no flags, no religious symbols: stone, openings and sky.

   The style hooks: `resolve` (_scruResolve: the height) and `build` (_scruBuild: the model), and the element kind `mesh` (a face as a set
   of planar pieces in three tones, with the reveals of its openings) registered through the generator's extension point _scbgElemKinds;
   70-scene-gen-4bridge.js builds its steel trusses from the same faces. A style names its presets in `style.ruin = { default, presets: { name: (K) =>
   ({ runs, blocks }) } }`; a building's `crown` picks one. K: { W, D (metres: the footprint's front and depth), H (the tallest wall),
   rnd (a seeded stream), sp }. Plan coordinates are (s, t): s along the front edge from its first corner, t inward from the front edge.
   ============================================================ */

const _scruClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _scruSmooth = (x) => { const q = _scruClamp(x, 0, 1); return q * q * (3 - 2 * q); };

/* ---------- openings: outlines in wall-local (s, z), counter-clockwise from the bottom left ---------- */
/**
 * The outline of one opening: { c, w, z0, h, kind: 'lancet' | 'round' | 'rect' | 'door' }. A lancet is a pointed arch (two arcs of radius
 * (hw^2 + r^2) / (2 hw) about the opposite springing, `rise` r up to 0.866 w: the equilateral arch); round: a semicircle; rect: a light.
 * steps: the points per arc. -> [[s, z], ...]
 */
function _scruOutline(o, steps) {
  const c = o.c, hw = o.w / 2, z0 = o.z0, z1 = o.z0 + o.h, n = Math.max(2, steps | 0 || 4);
  if (o.kind === 'rect') return [[c - hw, z0], [c + hw, z0], [c + hw, z1], [c - hw, z1]];
  if (o.kind === 'round') {
    const zs = z1 - hw, pts = [[c - hw, z0], [c + hw, z0], [c + hw, zs]];
    for (let k = 1; k < n * 2; k++) { const a = Math.PI * k / (n * 2); pts.push([c + hw * Math.cos(a), zs + hw * Math.sin(a)]); }
    pts.push([c - hw, zs]);
    return pts;
  }
  const rise = Math.min(o.rise || 0.866 * o.w, o.h * 0.62), zs = z1 - rise, R = (hw * hw + rise * rise) / (2 * hw);
  const cl = [c - hw + R, zs], cr = [c + hw - R, zs], th0 = Math.atan2(rise, hw - R);   // apex angle about the left arc's centre
  const pts = [[c - hw, z0], [c + hw, z0], [c + hw, zs]];
  // the right arc: about cr, from the springing (angle 0) up to the apex (angle pi - th0)
  for (let k = 1; k <= n; k++) { const a = (Math.PI - th0) * k / n; pts.push([cr[0] + R * Math.cos(a), cr[1] + R * Math.sin(a)]); }
  // the left arc: about cl, from the apex (angle th0) down to the springing (angle pi); the apex is already there
  for (let k = 1; k < n; k++) { const a = th0 + (Math.PI - th0) * k / n; pts.push([cl[0] + R * Math.cos(a), cl[1] + R * Math.sin(a)]); }
  pts.push([c - hw, zs]);
  return pts;
}
/**
 * A rectangle with one hole as ONE simple polygon (a zero-width bridge joins the two rings, so the fill needs no winding rule).
 * rect: [[s0, z0], [s1, z0], [s1, z1], [s0, z1]] counter-clockwise; hole: its outline counter-clockwise, first point bottom left.
 */
function _scruHolePoly(rect, hole) {
  const h = hole.slice(), back = [h[0]];
  for (let i = h.length - 1; i >= 1; i--) back.push(h[i]);
  back.push(h[0]);
  return [rect[0]].concat(back, [rect[0], rect[1], rect[2], rect[3]]);
}

/* ---------- columns: a pier or a bay -> polygons and openings ---------- */
/**
 * One column slice [s0, s1] from zb to its top (zt0 at s0, zt1 at s1) with a stack of tiers (the openings, any order). Pushes polygons
 * to out.polys ({ pts, solid, rect }) and the openings to out.holes ({ c, w, z0, h, kind, gap }).
 */
function _scruColumn(out, s0, s1, zb, zt0, zt1, tiers, steps) {
  const ts = (tiers || []).slice().sort((a, b) => a.z0 - b.z0), c = (s0 + s1) / 2;
  const tl = Math.min(zt0, zt1);
  if (!ts.length) { out.polys.push({ pts: [[s0, zb], [s1, zb], [s1, zt1], [s0, zt0]], solid: true, rect: [s0, zb, s1, tl] }); return; }
  let zA = zb;
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i], nxt = ts[i + 1], last = !nxt, zTop = t.z0 + t.h, w = Math.max(0.3, Math.min(t.w, (s1 - s0) - 0.5));
    const op = { c, w, z0: t.z0, h: t.h, kind: t.kind || 'lancet', gap: !!t.gap, rise: t.rise, ztop: (zt0 + zt1) / 2 };
    if (t.gap) {
      // a window whose head has gone: the wall on both sides runs up to the top, below the sill it is whole, above it is sky
      const l = c - w / 2, r = c + w / 2, topAt = s => zt0 + (zt1 - zt0) * (s - s0) / ((s1 - s0) || 1);
      out.polys.push({ pts: [[s0, zA], [l, zA], [l, topAt(l)], [s0, zt0]], solid: true, rect: [s0, zA, l, Math.min(zt0, topAt(l))] });
      out.polys.push({ pts: [[r, zA], [s1, zA], [s1, zt1], [r, topAt(r)]], solid: true, rect: [r, zA, s1, Math.min(zt1, topAt(r))] });
      if (t.z0 > zA + 0.05) out.polys.push({ pts: [[l, zA], [r, zA], [r, t.z0], [l, t.z0]], solid: true, rect: [l, zA, r, t.z0] });
      out.holes.push(op);
      break;
    }
    const zB = last ? null : (zTop + nxt.z0) / 2;
    const rect = last ? [[s0, zA], [s1, zA], [s1, zt1], [s0, zt0]] : [[s0, zA], [s1, zA], [s1, zB], [s0, zB]];
    const hole = _scruOutline(op, steps);
    out.polys.push({ pts: _scruHolePoly(rect, hole), solid: false, rect: null, band: [s0, zA, s1, last ? tl : zB], hole: [c - w / 2, t.z0, c + w / 2, zTop] });
    out.holes.push(op);
    zA = zB;
  }
}
/**
 * The columns of an arcaded wall: piers (solid) and bays (openings) alternating, a pier at both ends. o: { len, pier, pitch, lights,
 * top: (u, i) => metres, tiers: (top, u, i) => [tier], rnd }. -> [{ w, top, tiers, n }]
 */
function _scruBays(o) {
  const n = Math.max(1, Math.round((o.len - o.pier) / o.pitch)), bw = (o.len - o.pier * (n + 1)) / n, cols = [], r = o.rnd;
  const tops = [];
  for (let i = 0; i < n; i++) tops.push(o.top(n > 1 ? i / (n - 1) : 0.5, i));
  for (let i = 0; i <= n; i++) {
    const a = tops[Math.max(0, i - 1)], b = tops[Math.min(n - 1, i)];
    cols.push({ w: o.pier, top: Math.max(1, Math.min(a, b) - (0.3 + r() * 1.8)) });
    if (i < n) cols.push({ w: bw, top: tops[i], tiers: o.tiers(tops[i], n > 1 ? i / (n - 1) : 0.5, i), n: o.lights || 1 });
  }
  return cols;
}
/**
 * The tiers that fit under a wall's top: templates [{ z0, h, w, kind }] from the bottom; one that nearly fits becomes a GAP (the head of
 * the window gone, open to the sky); nothing above that.
 */
function _scruFitTiers(top, templates, rnd, gapAt) {
  const out = [];
  for (const t of templates) {
    if (t.z0 + t.h + 0.7 <= top) { out.push(Object.assign({}, t)); continue; }
    if (t.z0 + 2.2 < top && (gapAt == null || rnd() < gapAt)) out.push(Object.assign({}, t, { gap: true }));
    break;
  }
  return out;
}

/* ---------- runs and blocks -> faces ---------- */
const _scruRevPoly = (pl, a, b, o) => [_scbgOn(pl, a[0], a[1], o), _scbgOn(pl, b[0], b[1], o), _scbgOn(pl, b[0], b[1], -o), _scbgOn(pl, a[0], a[1], -o)];
/** The reveal quads (the wall's thickness inside each opening) of a run, in 3D with their normals: [{ p, n }]. */
function _scruReveals(pl, holes, th, steps) {
  const out = [], h = th / 2;
  for (const op of holes) {
    if (op.gap) {
      const l = op.c - op.w / 2, r = op.c + op.w / 2, ztop = op.ztop || op.z0 + op.h;
      out.push({ p: _scruRevPoly(pl, [l, op.z0], [l, ztop], h), n: pl.U.slice() }, { p: _scruRevPoly(pl, [r, ztop], [r, op.z0], h), n: pl.U.map(v => -v) });
      out.push({ p: _scruRevPoly(pl, [l, op.z0], [r, op.z0], h).reverse(), n: [0, 1, 0] });
      continue;
    }
    const ol = _scruOutline(op, steps);
    for (let i = 0; i < ol.length; i++) {
      const a = ol[i], b = ol[(i + 1) % ol.length], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      if (L < 1e-4) continue;
      // the left normal of a counter-clockwise outline points into the opening
      const nx = -dz / L, nz = dx / L, n = _scbgNorm([pl.U[0] * nx, nz, pl.U[2] * nx]);
      out.push({ p: _scruRevPoly(pl, a, b, h), n });
    }
  }
  return out;
}
const _scruMk = (rnd) => { const q = rnd(); return q < 0.62 ? 0 : q < 0.82 ? 1 : 2; };
/** One face of a wall (side +1: the right of A -> B; -1: the other), as a generator face with a single `ruin` element. */
function _scruFace(A, B, th, side, polys, reveals, col, sp, z0, z1, rnd) {
  const q = side > 0 ? _scbgWallPlane(A, B) : _scbgWallPlane(B, A), L = q.len, plS = Object.assign({}, q, { O: _scbgOn(q, 0, 0, th / 2) });
  const flip = side < 0, fl = s => flip ? L - s : s, rr = r => r ? (flip ? [L - r[2], r[1], L - r[0], r[3]] : r) : null;
  const m = [plS.O[0] + plS.U[0] * L / 2, 0, plS.O[2] + plS.U[2] * L / 2];
  const ps = polys.map(p => ({ pts: p.pts.map(([s, z]) => [fl(s), z]), solid: p.solid, tone: p.tone, rect: rr(p.rect), band: rr(p.band), hole: rr(p.hole) }));
  const el = { k: 'mesh', polys: ps, reveals, hm: 4, s0: 0, s1: L, z0, z1, seed: (rnd() * 1e6) | 0 };
  const tiny = [m, [m[0] + 0.001, m[1], m[2]], [m[0], m[1] + 0.001, m[2]]];
  return { poly: tiny, n: q.N.slice(), part: 'wall', role: 'ruin', edge: 0, col, plane: plS, elems: [], dark: 0, layout: () => ({ elems: [el], blocks: [] }) };
}
/** The faces of a wall run (see the header): { faces, c: [x, d] (its middle, for the draw order) }. */
function _scruRun(spec, P, sp, rnd, steps, col) {
  const A = P(spec.a[0], spec.a[1]), B = P(spec.b[0], spec.b[1]), pl = _scbgWallPlane(A, B), L = pl.len;
  if (L < 0.8) return null;
  const th = spec.th || 1.6, z0 = spec.z0 || 0, out = { polys: [], holes: [] }, tot = spec.cols.reduce((a, c) => a + c.w, 0) || 1, k = L / tot;
  let s = 0, zmax = z0;
  for (const cc of spec.cols) {
    const w = cc.w * k, nl = Math.max(1, cc.n | 0 || 1), top = Array.isArray(cc.top) ? cc.top : [cc.top, cc.top], f = x => top[0] + (top[1] - top[0]) * (x - s) / (w || 1);
    for (let j = 0; j < nl; j++) {
      const a = s + w * j / nl, b = s + w * (j + 1) / nl;
      const tiers = cc.tiers ? cc.tiers.map(t => Object.assign({}, t)) : null;
      _scruColumn(out, a, b, z0, f(a), f(b), tiers, steps);
      zmax = Math.max(zmax, f(a), f(b));
    }
    s += w;
  }
  for (const p of out.polys) p.tone = _scruMk(rnd);
  const reveals = _scruReveals(pl, out.holes, th, steps), faces = [];
  // the end caps of the run (its thickness seen from the side): two quads, drawn with the reveals
  const topOf = (c, end) => Array.isArray(c.top) ? c.top[end] : c.top, c0 = spec.cols[0], c1 = spec.cols[spec.cols.length - 1];
  const capL = { p: [_scbgOn(pl, 0, z0, th / 2), _scbgOn(pl, 0, z0, -th / 2), _scbgOn(pl, 0, topOf(c0, 0), -th / 2), _scbgOn(pl, 0, topOf(c0, 0), th / 2)], n: pl.U.map(v => -v) };
  const capR = { p: [_scbgOn(pl, L, z0, -th / 2), _scbgOn(pl, L, z0, th / 2), _scbgOn(pl, L, topOf(c1, 1), th / 2), _scbgOn(pl, L, topOf(c1, 1), -th / 2)], n: pl.U.slice() };
  const rv = reveals.concat([capL, capR]);
  faces.push(_scruFace(A, B, th, +1, out.polys, rv, col, sp, z0, zmax, rnd), _scruFace(A, B, th, -1, out.polys, rv, col, sp, z0, zmax, rnd));
  return { faces, c: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] };
}
/**
 * The faces of a free-standing prism (a pier, a turret, a stump): spec { c: [s, t], w, d, z0, h, cap: 'broken' | 'pinnacle' | 'flat',
 * tiers (openings in every side: a tower stump with lancets), th (the wall thickness seen inside them) }.
 */
function _scruBlock(spec, P, sp, rnd, col, steps) {
  const hw = spec.w / 2, hd = (spec.d || spec.w) / 2, z0 = spec.z0 || 0, H = spec.h, th = spec.th || 1.2;
  const ptsL = [[spec.c[0] - hw, spec.c[1] - hd], [spec.c[0] + hw, spec.c[1] - hd], [spec.c[0] + hw, spec.c[1] + hd], [spec.c[0] - hw, spec.c[1] + hd]];
  const W = ptsL.map(p => P(p[0], p[1]));
  const tops = ptsL.map(() => spec.cap === 'broken' ? H - rnd() * Math.min(3.4, H * 0.28) : H);
  const faces = [], c = P(spec.c[0], spec.c[1]);
  for (let i = 0; i < 4; i++) {
    const a = W[i], b = W[(i + 1) % 4], pl = _scbgWallPlane(a, b), L = pl.len, ta = tops[i], tb = tops[(i + 1) % 4];
    let polys = [], rv = [];
    if (spec.tiers && spec.tiers.length && L > 1.8 && spec.cap !== 'pinnacle') {
      const out = { polys: [], holes: [] }, ts = _scruFitTiers(Math.min(ta, tb), spec.tiers, rnd, spec.gapAt == null ? 0.6 : spec.gapAt);
      _scruColumn(out, 0, L, z0, ta, tb, ts, steps);
      polys = out.polys;
      if (out.holes.length) rv = _scruReveals(Object.assign({}, pl, { O: _scbgOn(pl, 0, 0, -th / 2) }), out.holes, th, steps);
    } else {
      const pts = [[0, z0], [L, z0], [L, tb]];
      if (spec.cap === 'pinnacle') pts.push([L / 2, Math.max(ta, tb) + (spec.pin || Math.min(L * 0.9, 3.4))]);
      pts.push([0, ta]);
      polys = [{ pts, solid: true, rect: [0, z0, L, Math.min(ta, tb)] }];
    }
    for (const q of polys) q.tone = _scruMk(rnd);
    faces.push(_scruFace(a, b, 0, +1, polys, rv, col, sp, z0, Math.max(ta, tb), rnd));
  }
  return { faces, c };
}

/* ---------- the element `mesh`: a wall face's pieces, its reveals and its coursing ---------- */
_scbgElemKinds.mesh = function (e, face, ctx, T) {
  const { view, sink, season } = ctx, pl = face.plane, shade = _scbgFaceShade(face, ctx);
  const base = _scbgSeasonal(_scbgDark(face.col, shade), season), tones = [base, _scbgLight(base, 0.1), _scbgDark(base, 0.14)], groups = [[], [], []];
  for (const p of e.polys) { const m = _scbgMap(pl, view, p.pts, 0.003); if (m) groups[p.tone].push(_scbgPath(m)); }
  for (let i = 0; i < 3; i++) if (groups[i].length) sink.add(1, { f: tones[i], d: groups[i].join(''), op: 1, part: 'body' });
  // reveals: the wall's thickness inside the openings, by light level (a quantised shade of each one's own normal)
  if (T >= 1 && e.reveals && e.reveals.length) {
    const buckets = new Map();
    for (const r of e.reveals) {
      if (!view.sees(r.n, r.p[0])) continue;
      const cl = _scbgClipNear(r.p, view.near); if (!cl) continue;
      const q = Math.round(_scbgFaceShade({ n: r.n, part: 'wall', dark: 0 }, ctx) * 12), key = q + '|' + r.n.map(v => Math.round(v * 4)).join(',');
      let b = buckets.get(key); if (!b) { b = { q, n: r.n, d: [] }; buckets.set(key, b); }
      b.d.push(_scbgPath(cl.map(view.P)));
    }
    for (const b of buckets.values()) sink.add(2, { f: _scbgSeasonal(_scbgDark(face.col, b.q / 12 + 0.2), season), d: b.d.join(''), op: 1, part: 'body', n: b.n.map(v => Math.round(v * 100) / 100) });
  }
  if (T >= 1 && e.s1 > 1) {
    // the foot of the wall is damp and dark (a band), the base of every wall in the same line
    const m = _scbgMap(pl, view, [[e.s0, e.z0], [e.s1, e.z0], [e.s1, e.z0 + 0.9], [e.s0, e.z0 + 0.9]], 0.007);
    if (m) sink.add(3, { f: _scbgDark(face.col, 0.5), d: _scbgPath(m), op: 0.2, part: 'body', detail: true });
  }
  if (T >= 2) {
    // a dark weathering streak under each opening's sill, and coursing on the solid pieces and the margins of the bands
    const streak = [], lines = [];
    for (const p of e.polys) {
      if (p.hole && T >= 2) {
        const hw = (p.hole[2] - p.hole[0]) / 2, c = (p.hole[0] + p.hole[2]) / 2, z = p.hole[1];
        const m = _scbgMap(pl, view, [[c - hw * 0.5, z - 3.2], [c + hw * 0.5, z - 3.2], [c + hw * 0.6, z], [c - hw * 0.6, z]], 0.006);
        if (m) streak.push(_scbgPath(m));
      }
      if (T < 3) continue;
      const rs = p.rect ? [p.rect] : p.band && p.hole ? [[p.band[0], p.band[1], p.hole[0], p.band[3]], [p.hole[2], p.band[1], p.band[2], p.band[3]], [p.band[0], p.hole[3], p.band[2], p.band[3]]] : [];
      for (const r of rs) {
        const h = r[3] - r[1]; if (h < 0.5 || r[2] - r[0] < 0.2) continue;
        const ph = ((r[0] * 12.9898 + r[1] * 78.233) % 1 + 1) % 1;
        for (let z = r[1] + 0.45 + ph * 0.2, n = 0; z < r[3] - 0.1 && n < 40; z += 0.46 + 0.1 * Math.sin(z * 3.1), n++) { const m = _scbgMap(pl, view, [[r[0], z], [r[2], z], [r[2], z + 0.045], [r[0], z + 0.045]], 0.005); if (m) lines.push(_scbgPath(m)); }
      }
    }
    if (streak.length) sink.add(3, { f: _scbgDark(face.col, 0.55), d: streak.join(''), op: 0.16, part: 'body', detail: true });
    if (lines.length) sink.add(3, { f: _scbgDark(face.col, 0.4), d: lines.join(''), op: 0.3, part: 'body', detail: true });
  }
};

/* ---------- the style's hooks ---------- */
/** The seeded choices: the height of the tallest wall (a building's `h`, else the style's storey height). */
function _scruResolve(sp, b) {
  const H = Number.isFinite(b && b.h) && b.h > 4 ? b.h : sp.zs[sp.zs.length - 1];
  sp.hs = [H]; sp.zs = [0, H]; sp.storeys = 1;
  sp.ruinH = H;
}
/**
 * The footprint with the LONG edge that faces the eye most first (a plan's s axis runs along it): the world picks a front by its street,
 * which for a free-standing ruin may be an end; the plan wants the long south side to the eye. Quads only.
 */
function _scruLongFront(foot, view) {
  if (foot.length !== 4) return foot;
  const L = foot.map((p, i) => Math.hypot(foot[(i + 1) % 4][0] - p[0], foot[(i + 1) % 4][1] - p[1])), Lm = Math.max(...L);
  let best = 0, bs = -Infinity;
  for (let i = 0; i < 4; i++) {
    if (L[i] < Lm * 0.8) continue;
    const a = foot[i], c = foot[(i + 1) % 4], l = L[i] || 1, nx = (c[1] - a[1]) / l, nd = -(c[0] - a[0]) / l, mx = (a[0] + c[0]) / 2, md = (a[1] + c[1]) / 2;
    const seen = view && !view.ortho ? (nx * -mx + nd * -md) / (Math.hypot(mx, md) || 1) : -nd;
    if (seen > bs) { bs = seen; best = i; }
  }
  return best ? foot.slice(best).concat(foot.slice(0, best)) : foot;
}
/** The style's build hook: the plan of the chosen preset (b.crown or the style's default) laid on the footprint. -> model */
function _scruBuild(b, sp, foot, modelFn, opt, view) {
  const st = sp.style, cfg = st.ruin || {}, presets = cfg.presets || {};
  const name = typeof b.crown === 'string' && presets[b.crown] ? b.crown : (cfg.default || Object.keys(presets)[0]);
  if (foot.length !== 4 || typeof presets[name] !== 'function') return modelFn(b, sp, foot);
  foot = _scruLongFront(foot, view);
  sp.season = (opt && opt.season) || 'summer';
  const a = foot[0], c = foot[1], W = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, u = [(c[0] - a[0]) / W, (c[1] - a[1]) / W], v = [-u[1], u[0]];
  const D = Math.max(2, (foot[3][0] - a[0]) * v[0] + (foot[3][1] - a[1]) * v[1]);
  const P = (s, t) => [a[0] + u[0] * s + v[0] * t, a[1] + u[1] * s + v[1] * t];
  const rnd = sceneRnd(sceneHash('ruin|' + sp.seed + '|' + name + '|' + W.toFixed(1) + '|' + D.toFixed(1)));
  const H = sp.ruinH || sp.zs[sp.zs.length - 1], cap = opt && opt.tierCap != null ? opt.tierCap : 3, steps = cap >= 3 ? 6 : cap >= 1 ? 4 : 3;
  const plan = presets[name]({ W, D, H, rnd, sp, name }) || {};
  const col = sp.wall, groups = [];
  for (const r of plan.runs || []) { const g = _scruRun(r, P, sp, rnd, steps, r.col || col); if (g) groups.push(g); }
  for (const bl of plan.blocks || []) { const g = _scruBlock(bl, P, sp, rnd, bl.col || col, steps); if (g) groups.push(g); }
  // far to near (the elevation looks along +d: the larger d is farther)
  const dist = g => view && !view.ortho ? Math.hypot(g.c[0], g.c[1]) : g.c[1];
  groups.sort((p, q) => dist(q) - dist(p));
  const faces = []; for (const g of groups) faces.push(...g.faces);
  const Hm = plan.height || H;
  return { faces, blocks: [], E: Hm, E0: Hm, H: Hm, W, Dp: D, quad: true, Q: (s, t, z) => { const p = P(s * W, t * D); return [p[0], z, p[1]]; }, roofZ: () => Hm, zs: sp.zs, roof: 'ruin' };
}
const _SCRU_HOOKS = Object.freeze({ resolve: _scruResolve, build: _scruBuild });

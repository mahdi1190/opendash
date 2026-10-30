/* ============================================================
   PETS, more species: the four-legged ones (2.23, agent 'pets'). PURE, like
   97-pets-0kitspecies.js and on the same rig (_ptQuad): each brings its own
   proportions, head, ears, tail and markings, so a badger reads as a badger
   and a fawn as a fawn from the outline alone (the collection shows outlines).
   Others are drawn in 97-pets-0kitspecies3.js. Every species is registered in
   _PT_ART; its table row (coats, marks, how it is earned) is in 97-pets-0kit.js.
   ============================================================ */

/* ---------- shared pieces ---------- */
/** The face most of them share: eyes, blush, a muzzle patch, a nose, a mouth. o {s, dy, slit, muz: [rx, ry, colour], my, ny, nose, nw, nh, blush, whisk, w}. */
function _ptFace2(c, o) {
  o = o || {};
  const { hx: x, hy: y, hr: r } = c.g, X = c.X, front = [];
  const eyesAt = _ptEyeAt(x, y, r, { s: o.s || 0.2, dy: o.dy == null ? -0.04 : o.dy });
  const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X, { slit: !!o.slit });
  const nx = x + r * 0.09, ny = y + r * (o.ny == null ? 0.38 : o.ny);
  if (o.muz) front.push(_pF(_pE(nx, y + r * (o.my == null ? 0.5 : o.my), r * o.muz[0], r * o.muz[1]), o.muz[2]));
  if (o.blush !== 0) front.push(..._ptBlush(eyesAt[0] - r * 0.1, eyesAt[1] + r * 0.1, y + r * 0.32, r * 0.15, o.blush || 0.28));
  if (o.nose !== null) front.push(_pF(_pE(nx, ny, r * (o.nw || 0.13), r * (o.nh || 0.09)), o.nose || '#2b2326'), _pF(_pE(nx - r * 0.04, ny - r * 0.03, r * 0.04, r * 0.025), '#ffffff', 0.55));
  front.push(..._ptMouth(nx, ny + r * 0.17, r * 0.15, c.mood, { w: o.w !== false }));
  if (o.whisk) front.push(..._ptWhiskers(nx, ny + r * 0.06, r, o.whisk, 0.6));
  return { eyes, front, eyesAt };
}
const _ptAnch = (x, y, r, t) => ({ hc: [x, y, r], top: [x + r * 0.02, y - r * (t || 0.84), r * 1.2, 3], ear: [x - r * 0.62, y - r * 0.82, r * 0.24] });
/** Pick the path of a pose. */
const _ptByPose = (c, sit, sleep, walk) => (c.pose === 'sit' ? sit : c.pose === 'sleep' ? sleep : walk);
/** Round ears on top of the head. */
function _ptEars2(x, y, r, s, t, inner, at) {
  const out = [];
  for (const side of [-1, 1]) {
    const ex = x + side * r * (at || 0.68), ey = y - r * 0.76;
    out.push(_pF(_pC(ex, ey, r * s), t[side < 0 ? 1 : 0]));
    if (inner) out.push(_pF(_pC(ex + side * r * 0.02, ey + r * 0.03, r * s * 0.58), inner, 0.9));
  }
  return out;
}
/** A leaf-shaped ear held out to the side (a fawn, a goat, a lamb). */
function _ptEarLeaf(x, y, r, side, len, w, t, inner, tilt) {
  const ax = x + side * r * 0.8, ay = y - r * 0.42, a = (tilt == null ? 12 : tilt) * (side < 0 ? -1 : 1), ex = ax + side * r * len, m = _ptRot(a, ax, ay);
  const out = [_pF(_pP`M${ax} ${ay - r * w * 0.55}Q${ax + side * r * len * 0.6} ${ay - r * w} ${ex} ${ay}Q${ax + side * r * len * 0.6} ${ay + r * w} ${ax} ${ay + r * w * 0.55}z`, t[side < 0 ? 1 : 0], 1, m)];
  if (inner) out.push(_pF(_pP`M${ax + side * r * 0.08} ${ay - r * w * 0.25}Q${ax + side * r * len * 0.55} ${ay - r * w * 0.5} ${ex - side * r * 0.14} ${ay}Q${ax + side * r * len * 0.55} ${ay + r * w * 0.5} ${ax + side * r * 0.08} ${ay + r * w * 0.25}z`, inner, 0.85, m));
  return out;
}
/** Soft wool: puffs round an ellipse. */
function _ptWool(cx, cy, rx, ry, t, n, rr) {
  const out = [];
  n = n || 10; rr = rr || Math.min(rx, ry) * 0.42;
  out.push(_pF(_pE(cx, cy, rx, ry), t[0]));
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.3, px = cx + Math.cos(a) * rx * 0.92, py = cy + Math.sin(a) * ry * 0.92; out.push(_pF(_pC(px, py, rr * (i % 2 ? 1 : 0.86)), t[0])); }
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.6; if (Math.sin(a) > 0.2) continue; const px = cx + Math.cos(a) * rx * 0.62, py = cy + Math.sin(a) * ry * 0.62; out.push(_pF(_pC(px, py, rr * 0.5), t[2], 0.5)); }
  out.push(_pF(_pE(cx + rx * 0.1, cy + ry * 0.55, rx * 0.8, ry * 0.42), t[1], 0.28));
  return out;
}
/** The body region of a pose as [cx, cy, rx, ry]: where markings go. */
const _ptTrunk = (c) => (c.pose === 'sit' ? [c.g.torso[0] - 3, c.g.torso[1], c.g.torso[2] + 4, c.g.torso[3]] : c.g.body);
/** Spots on the trunk at unit positions. */
const _ptSpots = (c, pts, r, col, op) => { const [cx, cy, rx, ry] = _ptTrunk(c); return pts.map(([u, v]) => _pF(_pC(cx + u * rx, cy + v * ry, r), col, op == null ? 0.9 : op)); };
/** A wing folded on the back, feathered. */
function _ptFeatherWing(c, t, s) {
  s = s || 1;
  const [wx, wy] = _ptWingAt(c), out = [];
  const main = _pP`M${wx + 4 * s} ${wy + 2 * s}Q${wx - 6 * s} ${wy - 14 * s} ${wx - 22 * s} ${wy - 15 * s}Q${wx - 19 * s} ${wy - 9 * s} ${wx - 23 * s} ${wy - 7 * s}Q${wx - 17 * s} ${wy - 3 * s} ${wx - 20 * s} ${wy + 1 * s}Q${wx - 13 * s} ${wy + 1 * s} ${wx - 14 * s} ${wy + 6 * s}Q${wx - 6 * s} ${wy + 8 * s} ${wx + 4 * s} ${wy + 2 * s}z`;
  out.push(_pF(main, t[0]));
  out.push(_pL(_pP`M${wx} ${wy}Q${wx - 9 * s} ${wy - 8 * s} ${wx - 18 * s} ${wy - 9 * s}M${wx} ${wy + 2 * s}Q${wx - 8 * s} ${wy - 2 * s} ${wx - 15 * s} ${wy - 2 * s}`, t[1], 1, 0.55));
  out.push(_pL(_pP`M${wx + 2 * s} ${wy + 1 * s}Q${wx - 7 * s} ${wy - 12 * s} ${wx - 20 * s} ${wy - 14 * s}`, t[2], 1.2, 0.7));
  return out;
}

/* ---------- the squirrel ---------- */
function _ptSquirrel(pet, pose, mood, X) {
  const fur = X.a, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 14, bl: 0.82, bh: 0.9, leg: 0.68, sit: 0.92, legW: 4.8, ch: 0.94, belly: X.b[0],
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 6} ${y - 2}Q${x - 13} ${y - 2} ${x - 12} ${y - 20}Q${x - 11} ${y - 36} ${x + 2} ${y - 40}Q${x + 9} ${y - 42} ${x + 6} ${y - 32}`,
        _pP`M${x + 4} ${y - 3}Q${x + 3} ${y - 22} ${x + 22} ${y - 23}Q${x + 38} ${y - 23} ${x + 44} ${y - 12}`,
        _pP`M${x + 4} ${y}Q${x - 12} ${y - 2} ${x - 12} ${y - 17}Q${x - 11} ${y - 31} ${x + 3} ${y - 32}Q${x + 10} ${y - 32} ${x + 8} ${y - 25}`);
      return [_pL(d, fur[0], 13), _pL(d, X.c[0], 6, 0.5), _pL(d, fur[2], 2.4, 0.4)];
    },
    marks(c) {
      if (c.pose !== 'sit' || m === 'plain') return {};
      const ax = c.g.torso[0] + 8, ay = c.g.torso[1] + 2;   // holding an acorn
      return { paw: [_pF(_pE(ax, ay + 1, 3.6, 4.2), '#b07a3e'), _pF(_pE(ax, ay - 2, 4.2, 2.2), '#6f4a26'), _pL(_pP`M${ax} ${ay - 4}l0.6 -1.8`, '#6f4a26', 0.9), _pF(_pE(ax - 1.2, ay + 0.4, 0.9, 1.6), '#ffffff', 0.3)] };
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, 1.42, fur, _ptMix(_PTK_PINK, fur[0], 0.3), { in: 0.3, out: 0.86, tipX: 0.72 }));
      if (m === 'tufts') for (const side of [-1, 1]) back.push(_pF(_pP`M${x + side * r * 0.62} ${y - r * 1.3}L${x + side * r * 0.56} ${y - r * 1.82}L${x + side * r * 0.82} ${y - r * 1.72}L${x + side * r * 0.86} ${y - r * 1.92}L${x + side * r * 0.98} ${y - r * 1.25}z`, X.c[0]));
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.08, h: 0.92, jaw: 1 }));
      head.push(_pF(_pE(x - r * 0.56, y + r * 0.42, r * 0.44, r * 0.36), X.b[0]), _pF(_pE(x + r * 0.72, y + r * 0.42, r * 0.44, r * 0.36), X.b[0]));
      const F = _ptFace2(c, { s: 0.22, dy: -0.1, muz: [0.36, 0.28, X.b[0]], my: 0.46, ny: 0.36, nose: '#3a2a26', nw: 0.1, nh: 0.07 });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r) };
    },
  });
}

/* ---------- the mouse ---------- */
function _ptMouse(pet, pose, mood, X) {
  const fur = X.a, pink = _ptMix(_PTK_PINK, '#ffffff', 0.15), m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 15.5, bl: 0.8, bh: 0.86, leg: 0.42, sit: 0.68, legW: 3.8, ch: 0.92, pawCol: pink, belly: X.b[0],
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 4} ${y}Q${x - 8} ${y + 5} ${x - 15} ${y - 1}Q${x - 21} ${y - 7} ${x - 16} ${y - 13}`,
        _pP`M${x + 3} ${y}Q${x - 4} ${y + 9} ${x + 12} ${y + 9}Q${x + 28} ${y + 10} ${x + 42} ${y + 7}`, _pP`M${x + 4} ${y}Q${x - 8} ${y + 6} ${x - 16} ${y}Q${x - 23} ${y - 6} ${x - 19} ${y - 13}`);
      return [_pL(d, pink, 2.2)];
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) { const ex = x + side * r * 0.78, ey = y - r * 0.82; back.push(_pF(_pC(ex, ey, r * 0.62), fur[side < 0 ? 1 : 0]), _pF(_pC(ex + side * r * 0.02, ey + r * 0.05, r * 0.42), _ptMix(pink, fur[0], 0.12), 0.95)); }
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.04, h: 0.9, jaw: 0.84 }));
      if (m === 'patch') head.push(_pF(_pE(x + r * 0.46, y - r * 0.26, r * 0.42, r * 0.44), X.c[0], 0.95));
      if (m === 'blaze') head.push(_pF(_pE(x + r * 0.08, y - r * 0.32, r * 0.17, r * 0.56), X.b[0]));
      const F = _ptFace2(c, { s: 0.22, dy: -0.1, ny: 0.42, nose: '#ef8fa0', nw: 0.1, nh: 0.08, muz: [0.3, 0.24, X.b[0]], my: 0.56, whisk: _ptMix(fur[3], '#ffffff', 0.2) });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r, 0.82) };
    },
  });
}

/* ---------- the badger ---------- */
function _ptBadger(pet, pose, mood, X) {
  const fur = X.a, dark = _ptTone(X.c[0]), white = X.b, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 14.5, bl: 1.24, bh: 1.12, leg: 0.54, sit: 0.92, legW: 7, ch: 1.06, legT: dark, belly: dark[0],
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 3} ${y - 1}Q${x - 5} ${y} ${x - 8} ${y - 3}`, _pP`M${x + 2} ${y}Q${x - 3} ${y + 3} ${x + 1} ${y + 6}`, _pP`M${x + 3} ${y}Q${x - 5} ${y} ${x - 9} ${y + 2}`);
      return [_pL(d, fur[1], 6.4), _pL(d, fur[2], 2, 0.5)];
    },
    marks(c) { if (m !== 'grizzled') return {}; const [cx, cy, rx, ry] = _ptTrunk(c); const out = []; for (let i = 0; i < 9; i++) out.push(_pL(_pP`M${cx - rx * 0.7 + i * rx * 0.17} ${cy - ry * (0.75 - (i % 2) * 0.3)}l1.2 3`, fur[2], 0.9, 0.85)); return { body: out }; },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = _ptEars2(x, y, r, 0.27, dark, white[0], 0.78), head = [];
      head.push(_pF(_pP`M${x - r * 1.04} ${y - r * 0.12}Q${x - r} ${y - r * 0.98} ${x} ${y - r * 0.98}Q${x + r} ${y - r * 0.98} ${x + r * 1.04} ${y - r * 0.12}Q${x + r * 0.98} ${y + r * 0.6} ${x + r * 0.08} ${y + r * 1.02}Q${x - r * 0.84} ${y + r * 0.6} ${x - r * 1.04} ${y - r * 0.12}z`, white[0]));
      // the two stripes, from the ears over the eyes to the nose
      for (const dx of [-0.46, 0.62]) head.push(_pF(_pP`M${x + r * (dx - 0.26)} ${y - r * 0.92}Q${x + r * (dx + 0.28)} ${y - r * 0.92} ${x + r * (dx + 0.24)} ${y - r * 0.6}Q${x + r * dx * 0.5 + r * 0.26} ${y + r * 0.2} ${x + r * dx * 0.3 + r * 0.15} ${y + r * 0.42}Q${x + r * dx * 0.5 - r * 0.02} ${y + r * 0.2} ${x + r * (dx - 0.26)} ${y - r * 0.92}z`, dark[0]));
      head.push(_pF(_pE(x + r * 0.42, y + r * 0.42, r * 0.5, r * 0.34), white[1], 0.25));
      const F = _ptFace2(c, { s: 0.17, dy: -0.08, ny: 0.56, nose: '#231c1e', nw: 0.14, nh: 0.1, blush: 0.2 });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r) };
    },
  });
}

/* ---------- the otter ---------- */
function _ptOtter(pet, pose, mood, X) {
  const fur = X.a, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 13.5, bl: 1.34, bh: 0.84, leg: 0.42, sit: 1.08, legW: 5.2, ch: 0.84, belly: X.b[0],
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 4} ${y - 1}Q${x - 8} ${y + 2} ${x - 15} ${y}Q${x - 22} ${y - 2} ${x - 24} ${y - 6}`, _pP`M${x + 3} ${y}Q${x - 3} ${y + 8} ${x + 14} ${y + 9}Q${x + 30} ${y + 10} ${x + 42} ${y + 7}`, _pP`M${x + 4} ${y}Q${x - 8} ${y + 3} ${x - 15} ${y + 7}Q${x - 21} ${y + 10} ${x - 25} ${y + 10}`);
      return [_pL(d, fur[0], 7), { f: null, s: fur[0], w: 9, d, op: 1, cap: 'round', dash: '10 60' }, _pL(d, fur[2], 1.6, 0.35)];
    },
    marks(c) {
      if (c.pose !== 'sit' || m !== 'shell') return {};
      const ax = c.g.torso[0] + 8, ay = c.g.torso[1] + 3;
      return { paw: [_pF(_pP`M${ax - 4} ${ay + 2}Q${ax} ${ay - 6} ${ax + 4} ${ay + 2}Q${ax} ${ay + 4} ${ax - 4} ${ay + 2}z`, '#f1b6a8'), _pL(_pP`M${ax} ${ay + 2}L${ax} ${ay - 3}M${ax - 2} ${ay + 2}L${ax - 1} ${ay - 2}M${ax + 2} ${ay + 2}L${ax + 1} ${ay - 2}`, '#c9786a', 0.6, 0.8)] };
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = _ptEars2(x, y, r, 0.2, fur, _ptMix(fur[3], '#c9a68a', 0.5), 0.84), head = [];
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.18, h: 0.86, jaw: 1 }));
      head.push(_pF(_pE(x + r * 0.09, y + r * 0.42, r * 0.92, r * 0.5), X.b[0]));
      if (m === 'pale') head.push(_pF(_pE(x, y - r * 0.28, r * 0.72, r * 0.34), X.b[0], 0.55));
      const F = _ptFace2(c, { s: 0.18, dy: -0.12, ny: 0.3, nose: '#2b2326', nw: 0.15, nh: 0.1, blush: 0.22, whisk: _ptMix(fur[3], '#ffffff', 0.45) });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r, 0.8) };
    },
  });
}

/* ---------- the raccoon ---------- */
function _ptRaccoon(pet, pose, mood, X) {
  const fur = X.a, dark = _ptTone(X.c[0]), pale = X.b, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 15, bl: 1.04, bh: 1.08, leg: 0.72, sit: 0.94, legW: 5.6, legT: dark, belly: _ptMix(fur[0], pale[0], 0.55),
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 4} ${y - 1}Q${x - 11} ${y} ${x - 13} ${y - 12}Q${x - 14} ${y - 22} ${x - 7} ${y - 26}`, _pP`M${x + 3} ${y - 1}Q${x - 6} ${y + 8} ${x + 12} ${y + 9}Q${x + 28} ${y + 9} ${x + 40} ${y + 6}`, _pP`M${x + 4} ${y}Q${x - 8} ${y} ${x - 15} ${y - 7}Q${x - 19} ${y - 14} ${x - 18} ${y - 19}`);
      return [_pL(d, fur[0], 10), { f: null, s: dark[0], w: 10.2, d, op: 1, cap: 'butt', dash: '3.6 4.2' }, _pL(d, fur[3], 2.2, 0.15)];
    },
    marks(c) {
      if (m !== 'bandit') return {};
      if (c.pose === 'sleep') return {};
      const ax = c.g.hx + 10, ay = c.pose === 'sit' ? c.g.torso[1] : c.g.body[1];
      return { body: [_pF(_pE(ax - 12, ay + 3, 5, 6), '#fbf6ee', 0.9), _pL(_pP`M${ax - 15} ${ay - 2}L${ax - 9} ${ay - 2}`, '#a23a3a', 1.2)] };
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, 1.26, fur, pale[0], { in: 0.26, out: 0.96, tipX: 0.84 }));
      head.push(_pF(_pP`M${x - r * 1.16} ${y}Q${x - r * 1.08} ${y - r * 0.96} ${x} ${y - r * 0.96}Q${x + r * 1.08} ${y - r * 0.96} ${x + r * 1.16} ${y}L${x + r * 1.28} ${y + r * 0.4}Q${x + r * 0.6} ${y + r * 0.72} ${x + r * 0.1} ${y + r * 1.0}Q${x - r * 0.5} ${y + r * 0.72} ${x - r * 1.24} ${y + r * 0.4}z`, fur[0]));
      head.push(_pF(_pE(x + r * 0.1, y + r * 0.56, r * 0.6, r * 0.42), pale[0]));
      head.push(_pF(_pE(x - r * 0.34, y - r * 0.42, r * 0.34, r * 0.13), pale[0], 0.95), _pF(_pE(x + r * 0.5, y - r * 0.42, r * 0.34, r * 0.13), pale[0], 0.95));
      // the mask
      head.push(_pF(_pP`M${x - r * 1.04} ${y + r * 0.16}Q${x - r * 0.7} ${y - r * 0.32} ${x - r * 0.1} ${y - r * 0.2}Q${x + r * 0.09} ${y - r * 0.08} ${x + r * 0.28} ${y - r * 0.2}Q${x + r * 0.88} ${y - r * 0.32} ${x + r * 1.1} ${y + r * 0.16}Q${x + r * 0.76} ${y + r * 0.3} ${x + r * 0.28} ${y + r * 0.16}Q${x + r * 0.09} ${y + r * 0.08} ${x - r * 0.1} ${y + r * 0.16}Q${x - r * 0.6} ${y + r * 0.3} ${x - r * 1.04} ${y + r * 0.16}z`, dark[0]));
      const white = c.mood.eyes === 'closed' || c.mood.eyes === 'happy';
      const F = _ptFace2(c, { s: 0.17, dy: -0.02, ny: 0.48, nose: '#231c1e', nw: 0.12, nh: 0.08, blush: 0.2 });
      if (white) for (const s of F.eyes) if (s.s) s.s = '#fbf6ee';   // closed eyes show on the mask
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r) };
    },
  });
}

/* ---------- the fawn ---------- */
function _ptFawn(pet, pose, mood, X) {
  const fur = X.a, m = pet.marks, hoof = _ptTone('#4a3628');
  return _ptQuad(pet, pose, mood, X, {
    hr: 13.5, bl: 0.98, bh: 0.82, leg: 1.34, sit: 1.0, legW: 3.9, ch: 0.92, pawCol: hoof[0], neck: 3, belly: X.b[0],
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 5} ${y - 4}q-5 -1 -6 -5`, _pP`M${x + 2} ${y}q-3 2 -1 5`, _pP`M${x + 3} ${y - 1}q-5 -2 -5 -7`);
      return [_pL(d, fur[0], 4.8), _pL(d, X.b[0], 2.6)];
    },
    marks(c) {
      if (m === 'plain') return {};
      return { body: _ptSpots(c, [[-0.52, -0.42], [-0.2, -0.62], [0.12, -0.46], [0.42, -0.6], [-0.38, -0.08], [-0.02, -0.14], [0.3, -0.16], [-0.68, -0.05]], 1.45, '#fff8ea', 0.95) };
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      if (m === 'stag') for (const side of [-1, 1]) back.push(_pL(_pP`M${x + side * r * 0.3} ${y - r * 0.8}Q${x + side * r * 0.5} ${y - r * 1.5} ${x + side * r * 0.3} ${y - r * 2}M${x + side * r * 0.42} ${y - r * 1.34}L${x + side * r * 0.86} ${y - r * 1.72}M${x + side * r * 0.42} ${y - r * 1.7}L${x + side * r * 0.72} ${y - r * 2.02}`, '#a9835a', r * 0.12));
      for (const side of [-1, 1]) back.push(..._ptEarLeaf(x, y, r, side, 0.95, 0.42, fur, _ptMix(_PTK_PINK, X.b[0], 0.4), -26));
      head.push(..._ptHeadShape(x, y, r, fur, { w: 0.98, h: 0.98, jaw: 0.82 }));
      head.push(_pF(_pE(x + r * 0.09, y + r * 0.56, r * 0.48, r * 0.4), X.b[0]));
      const F = _ptFace2(c, { s: 0.25, dy: -0.08, ny: 0.5, nose: '#2b2326', nw: 0.12, nh: 0.08 });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r, 0.9) };
    },
  });
}

/* ---------- the lamb ---------- */
function _ptLamb(pet, pose, mood, X) {
  const wool = X.a, skin = _ptTone(X.c[0]), m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 13, bl: 1.0, bh: 1.05, leg: 0.84, sit: 0.92, legW: 4, ch: 1, legT: skin, pawCol: _ptMix(skin[0], '#000000', 0.2), neck: 1,
    tail(c) { const [x, y] = c.g.tailRoot; const px = c.pose === 'sit' ? x + 1 : x - 1, py = c.pose === 'sit' ? y - 5 : y; return [_pF(_pC(px, py, 4.8), wool[0]), _pF(_pC(px - 1, py - 1.4, 2.2), wool[2], 0.7)]; },
    marks(c) {
      const out = { body: [] }, g = c.g;
      if (c.pose === 'walk') out.body.push(..._ptWool(g.body[0], g.body[1] - 1, g.body[2] + 1, g.body[3] + 2, wool, 11, 5.4));
      else if (c.pose === 'sleep') out.body.push(..._ptWool(g.body[0], g.body[1], g.body[2], g.body[3] + 1, wool, 11, 5.2));
      else out.body.push(..._ptWool(g.torso[0] - 4, g.torso[1] - 1, g.torso[2] + 3, g.torso[3] + 1, wool, 10, 5), ..._ptWool(g.haunch[0], g.haunch[1] - 1, g.haunch[2] * 0.8, g.haunch[3] * 0.8, wool, 8, 4.6));
      if (m === 'patch') { const [cx, cy, rx, ry] = _ptTrunk(c); out.body.push(_pF(_pE(cx - rx * 0.3, cy - ry * 0.3, rx * 0.34, ry * 0.42), X.b[0], 0.95)); }
      if (m === 'bell' && c.pose !== 'sleep') out.body.push();
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) back.push(..._ptEarLeaf(x, y, r, side, 0.72, 0.34, skin, _ptMix(_PTK_PINK, skin[0], 0.35), 16));
      head.push(_pF(_pP`M${x - r * 0.86} ${y - r * 0.1}Q${x - r * 0.78} ${y - r * 0.9} ${x} ${y - r * 0.9}Q${x + r * 0.78} ${y - r * 0.9} ${x + r * 0.86} ${y - r * 0.1}Q${x + r * 0.8} ${y + r * 0.8} ${x + r * 0.05} ${y + r * 1.0}Q${x - r * 0.72} ${y + r * 0.8} ${x - r * 0.86} ${y - r * 0.1}z`, skin[0]), _pF(_pE(x + r * 0.36, y + r * 0.3, r * 0.42, r * 0.5), skin[1], 0.3));
      // the woolly cap
      for (const [u, v, s] of [[-0.62, -0.68, 0.42], [-0.22, -0.92, 0.46], [0.24, -0.94, 0.46], [0.66, -0.7, 0.4], [0, -0.62, 0.42]]) head.push(_pF(_pC(x + r * u, y + r * v, r * s), wool[0]));
      head.push(_pF(_pC(x - r * 0.26, y - r * 1.02, r * 0.18), wool[2], 0.6));
      head.push(_pF(_pE(x + r * 0.09, y + r * 0.56, r * 0.4, r * 0.34), _ptMix(skin[0], '#ffffff', 0.16)));
      const dark = _ptLum(skin[0]) < 0.5;
      const F = _ptFace2(c, { s: 0.2, dy: -0.06, ny: 0.5, nose: dark ? '#efb0b8' : '#6a4a4a', nw: 0.11, nh: 0.07, blush: 0.32 });
      if (dark) for (const s of F.eyes) { if (s.s && c.mood.eyes !== 'open') s.s = '#fbf6ee'; }
      if (dark) for (const s of F.front) if (s.s) s.s = '#fbf6ee';
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r, 1.2) };
    },
  });
}

/* ---------- the piglet ---------- */
function _ptPiglet(pet, pose, mood, X) {
  const fur = X.a, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 15, bl: 1.1, bh: 1.08, leg: 0.56, sit: 0.84, legW: 5.4, pawCol: _ptMix(fur[0], '#3a2a2a', 0.42), belly: X.b[0],
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = c.pose === 'sit' ? _pP`M${x + 3} ${y - 3}q-6 -1 -6 -6q1 -4 4 -2q2 2 -1 4` : _pP`M${x + 3} ${y - 1}q-7 -1 -7 -6q1 -4 4.5 -2q2 2.4 -1.4 4.2`;
      return [_pL(d, fur[0], 2.2)];
    },
    marks(c) {
      const out = { body: [] }, [cx, cy, rx, ry] = _ptTrunk(c);
      if (m === 'spots') out.body.push(..._ptSpots(c, [[-0.55, -0.45], [-0.05, -0.6], [0.42, -0.35], [-0.3, 0.1]], 3.2, X.c[0], 0.85));
      if (m === 'belt') out.body.push(_pF(_pP`M${cx - rx * 0.25} ${cy - ry * 0.98}Q${cx + rx * 0.05} ${cy - ry * 1.02} ${cx + rx * 0.28} ${cy - ry * 0.92}Q${cx + rx * 0.36} ${cy} ${cx + rx * 0.22} ${cy + ry * 0.92}Q${cx - rx * 0.08} ${cy + ry} ${cx - rx * 0.32} ${cy + ry * 0.92}Q${cx - rx * 0.42} ${cy} ${cx - rx * 0.25} ${cy - ry * 0.98}z`, X.c[0], 0.95));
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) back.push(_pF(_pP`M${x + side * r * 0.26} ${y - r * 0.82}Q${x + side * r * 1.1} ${y - r * 1.34} ${x + side * r * 1.22} ${y - r * 0.62}Q${x + side * r * 0.96} ${y - r * 0.44} ${x + side * r * 0.62} ${y - r * 0.5}z`, fur[side < 0 ? 1 : 0]));
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.1, h: 0.94, jaw: 1 }));
      // the snout
      const sx = x + r * 0.1, sy = y + r * 0.42, sn = _ptMix(fur[0], '#e8707a', 0.32);
      head.push(_pF(_pE(sx, sy, r * 0.5, r * 0.36), sn), _pF(_pE(sx, sy - r * 0.08, r * 0.42, r * 0.22), _ptMix(sn, '#ffffff', 0.25), 0.7), _pF(_pE(sx - r * 0.16, sy, r * 0.08, r * 0.12), '#7a3a48'), _pF(_pE(sx + r * 0.16, sy, r * 0.08, r * 0.12), '#7a3a48'));
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.18, dy: -0.18 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X);
      const front = [..._ptBlush(eyesAt[0] - r * 0.22, eyesAt[1] + r * 0.2, y + r * 0.12, r * 0.17, 0.4), ..._ptMouth(sx, sy + r * 0.44, r * 0.18, c.mood)];
      return { back, head, eyes, front, eyesAt, ..._ptAnch(x, y, r) };
    },
  });
}

/* ---------- the goat ---------- */
function _ptGoat(pet, pose, mood, X) {
  const fur = X.a, hoof = _ptTone('#4a3a30'), m = pet.marks, horn = '#d9c8a6';
  return _ptQuad(pet, pose, mood, X, {
    hr: 13.5, bl: 1.02, bh: 0.96, leg: 1.02, sit: 1.0, legW: 4.4, pawCol: hoof[0], neck: 2, belly: X.b[0],
    tail(c) { const [x, y] = c.g.tailRoot; const d = c.pose === 'sit' ? _pP`M${x + 5} ${y - 4}q-5 -2 -4 -8` : c.pose === 'sleep' ? _pP`M${x + 2} ${y}q-3 2 -1 5` : _pP`M${x + 3} ${y - 1}q-4 -3 -3 -9`; return [_pL(d, fur[0], 4)]; },
    marks(c) {
      if (m !== 'saddle') return {};
      const [cx, cy, rx, ry] = _ptTrunk(c);
      return { body: [_pF(_pP`M${cx - rx * 0.7} ${cy - ry * 0.55}Q${cx} ${cy - ry * 1.25} ${cx + rx * 0.6} ${cy - ry * 0.6}Q${cx} ${cy + ry * 0.1} ${cx - rx * 0.7} ${cy - ry * 0.55}z`, X.c[0], 0.95)] };
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) back.push(_pL(_pP`M${x + side * r * 0.3} ${y - r * 0.78}Q${x + side * r * 0.42} ${y - r * 1.5} ${x + side * r * 1.08} ${y - r * 1.5}`, side < 0 ? _ptMix(horn, '#000000', 0.15) : horn, r * 0.2));
      for (const side of [-1, 1]) back.push(..._ptEarLeaf(x, y, r, side, 0.88, 0.3, fur, _ptMix(_PTK_PINK, fur[0], 0.4), 22));
      head.push(..._ptHeadShape(x, y, r, fur, { w: 0.94, h: 1.0, jaw: 0.74 }));
      if (m === 'blaze' || m === 'saddle') head.push(_pF(_pE(x + r * 0.09, y - r * 0.28, r * 0.2, r * 0.6), X.b[0]));
      head.push(_pF(_pE(x + r * 0.09, y + r * 0.6, r * 0.42, r * 0.36), X.b[0]));
      head.push(_pF(_pP`M${x - r * 0.08} ${y + r * 0.92}Q${x + r * 0.08} ${y + r * 1.72} ${x + r * 0.14} ${y + r * 1.78}Q${x + r * 0.28} ${y + r * 1.5} ${x + r * 0.32} ${y + r * 0.92}z`, X.c[0]));
      const F = _ptFace2(c, { s: 0.2, dy: -0.1, ny: 0.48, nose: '#6a4a4a', nw: 0.1, nh: 0.07 });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r, 0.92) };
    },
  });
}

/* ---------- the pony and the pegasus ---------- */
function _ptPonyK(pet, X, extra) {
  const fur = X.a, m = pet.marks, mc = X.c, hoof = _ptTone(_ptMix(X.c[0], '#3a2a24', 0.5));
  const mane = [mc[0], mc[2], mc[1], mc[0]];
  return Object.assign({
    hr: 14.5, bl: 1.1, bh: 1.02, leg: 1.1, sit: 1.0, legW: 5.4, pawCol: m === 'socks' ? '#fbf8f2' : hoof[0], neck: 3, hx: 1,
    tail(c) {
      const [x, y] = c.g.tailRoot, out = [];
      mane.forEach((col, i) => {
        const o = (i - 1.5) * 2;
        const d = c.pose === 'sit' ? _pP`M${x + 4} ${y - 2 + o * 0.3}Q${x - 11} ${y - 3 + o} ${x - 13} ${y + 3 + o * 0.5}` : c.pose === 'sleep' ? _pP`M${x + 3} ${y + o * 0.3}Q${x - 6} ${y + 8 + o * 0.5} ${x + 10} ${y + 9 + o * 0.3}` : _pP`M${x + 4} ${y + o * 0.3}Q${x - 9} ${y + o} ${x - 13} ${y + 15 + o * 0.6}`;
        out.push(_pL(d, col, 3.4));
      });
      return out;
    },
    marks(c) {
      const g = c.g, out = { body: [] };
      if (c.pose === 'walk') { const [nx, ny] = g.neck; mane.forEach((col, i) => out.body.push(_pL(_pP`M${nx - 4 + i * 0.7} ${ny - 8 + i * 2}q${-4.5} ${3} ${-3.5} ${7.5}`, col, 3))); }
      if (c.pose === 'sit') { const [tx, ty] = g.torso; mane.forEach((col, i) => out.body.push(_pL(_pP`M${tx - 2 + i * 0.7} ${ty - 12 + i * 2}q${-5} ${3} ${-4} ${8.5}`, col, 3))); }
      if (m === 'dapple') out.body.push(..._ptSpots(c, [[-0.6, -0.4], [-0.25, -0.5], [0.1, -0.3], [-0.45, 0.05], [-0.05, 0.1], [0.35, -0.55]], 2.2, X.b[0], 0.75));
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, 1.32, fur, _ptMix(_PTK_PINK, fur[0], 0.3), { in: 0.3, out: 0.84, tipX: 0.78 }));
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.0, h: 1.0, jaw: 0.86 }));
      if (m === 'blaze') head.push(_pF(_pP`M${x + r * 0.02} ${y - r * 0.78}Q${x + r * 0.2} ${y - r * 0.1} ${x + r * 0.26} ${y + r * 0.4}L${x - r * 0.08} ${y + r * 0.4}Q${x - r * 0.02} ${y - r * 0.1} ${x + r * 0.02} ${y - r * 0.78}z`, '#fbf8f2'));
      if (m === 'star') head.push(_pF(_ptStar(x + r * 0.09, y - r * 0.48, r * 0.24, r * 0.1, 4), '#fbf8f2'));
      head.push(_pF(_pE(x + r * 0.12, y + r * 0.58, r * 0.56, r * 0.38), _ptMix(fur[0], X.b[0], 0.7)), _pF(_pE(x - r * 0.05, y + r * 0.54, r * 0.06, r * 0.05), fur[3], 0.6), _pF(_pE(x + r * 0.29, y + r * 0.54, r * 0.06, r * 0.05), fur[3], 0.6));
      // the forelock
      mane.forEach((col, i) => head.push(_pF(_pP`M${x - r * 0.46 + i * r * 0.16} ${y - r * 0.92}Q${x - r * 0.62 + i * r * 0.16} ${y - r * 0.34} ${x - r * 0.88 + i * r * 0.19} ${y - r * 0.12}Q${x - r * 0.3 + i * r * 0.14} ${y - r * 0.42} ${x - r * 0.2 + i * r * 0.16} ${y - r * 0.94}z`, col)));
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.2, dy: -0.06 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X);
      const front = [..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.1, y + r * 0.3, r * 0.16, 0.3), ..._ptMouth(x + r * 0.12, y + r * 0.74, r * 0.16, c.mood)];
      return { back, head, eyes, front, eyesAt, hc: [x, y, r], top: [x - r * 0.1, y - r * 0.86, r * 1.15, -4], ear: [x + r * 0.62, y - r * 0.82, r * 0.24] };
    },
  }, extra || {});
}
function _ptPony(pet, pose, mood, X) { return _ptQuad(pet, pose, mood, X, _ptPonyK(pet, X)); }
function _ptPegasus(pet, pose, mood, X) {
  const K = _ptPonyK(pet, X), base = K.marks, wing = _ptTone(_ptMix(X.a[0], '#ffffff', 0.4));
  return _ptQuad(pet, pose, mood, X, Object.assign(K, { wingAt: _ptWingAt, marks(c) {
    const out = Object.assign({ wingB: [], wingN: [] }, base(c));
    if (pet.marks === 'stars') out.body = (out.body || []).concat(_ptSpots(c, [[-0.5, -0.1], [0, 0.3], [0.4, -0.2]], 0.9, '#fff4c0', 1));
    out.wingB.push(..._ptFeatherWing(c, [wing[1], wing[3], wing[1]], 1.08));
    out.wingN.push(..._ptFeatherWing(c, wing, 1));
    return out;
  } }));
}

/* ---------- the capybara ---------- */
function _ptCapybara(pet, pose, mood, X) {
  const fur = X.a, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 15, bl: 1.22, bh: 1.16, leg: 0.52, sit: 0.84, legW: 6, ch: 1.08, belly: null,
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = _ptEars2(x, y, r, 0.18, fur, fur[3], 0.72), head = [];
      head.push(_pF(_pP`M${x - r * 0.98} ${y - r * 0.2}Q${x - r * 0.9} ${y - r * 0.94} ${x - r * 0.02} ${y - r * 0.94}Q${x + r * 0.9} ${y - r * 0.94} ${x + r * 1.0} ${y - r * 0.2}Q${x + r * 1.14} ${y + r * 0.92} ${x + r * 0.1} ${y + r * 0.98}Q${x - r * 1.02} ${y + r * 0.92} ${x - r * 0.98} ${y - r * 0.2}z`, fur[0]));
      head.push(_pF(_pE(x + r * 0.44, y + r * 0.2, r * 0.5, r * 0.62), fur[1], 0.26), _pF(_pE(x - r * 0.36, y - r * 0.54, r * 0.42, r * 0.2), fur[2], 0.36));
      head.push(_pF(_pE(x + r * 0.09, y + r * 0.58, r * 0.72, r * 0.38), _ptMix(fur[0], X.b[0], 0.5)));
      // calm eyes, half closed: nothing bothers a capybara
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.15, dy: -0.18 });
      const md = c.mood.eyes === 'open' ? Object.assign({}, c.mood) : c.mood;
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X);
      if (c.mood.eyes === 'open' || !c.mood.eyes) for (const ex of [eyesAt[0], eyesAt[1]]) eyes.push(_pL(_pP`M${ex - r * 0.19} ${eyesAt[2] - r * 0.1}Q${ex} ${eyesAt[2] - r * 0.3} ${ex + r * 0.19} ${eyesAt[2] - r * 0.1}`, fur[3], r * 0.06, 0.6));
      const nx = x + r * 0.09, ny = y + r * 0.42, front = [];
      front.push(_pF(_pE(nx - r * 0.2, ny, r * 0.07, r * 0.05), fur[3]), _pF(_pE(nx + r * 0.2, ny, r * 0.07, r * 0.05), fur[3]), ..._ptMouth(nx, ny + r * 0.24, r * 0.18, c.mood, { w: true }), ..._ptBlush(eyesAt[0] - r * 0.2, eyesAt[1] + r * 0.2, y + r * 0.2, r * 0.14, 0.2));
      if (m === 'yuzu') front.push(_pF(_pC(x - r * 0.05, y - r * 1.12, r * 0.34), '#f4a93a'), _pF(_pE(x - r * 0.14, y - r * 1.22, r * 0.1, r * 0.06), '#ffffff', 0.5), _pF(_pE(x + r * 0.14, y - r * 1.42, r * 0.2, r * 0.09), '#5fae4a', 1, _ptRot(-24, x + r * 0.14, y - r * 1.42)));
      if (m === 'bird') { const bx = x - r * 0.1, by = y - r * 1.0; front.push(_pF(_pE(bx, by - r * 0.14, r * 0.26, r * 0.2), '#7cb2ea'), _pF(_pC(bx + r * 0.2, by - r * 0.32, r * 0.13), '#7cb2ea'), _pF(_pC(bx + r * 0.24, by - r * 0.34, r * 0.03), '#2a2124'), _pF(_pP`M${bx + r * 0.32} ${by - r * 0.32}l${r * 0.1} ${r * 0.02}l${-r * 0.1} ${r * 0.04}z`, '#f2b33d')); }
      return { back, head, eyes, front, eyesAt, ..._ptAnch(x, y, r, 0.88) };
    },
  });
}

/* ---------- the bear and the panda ---------- */
function _ptBearHead(c, o) {
  const { hx: x, hy: y, hr: r } = c.g, back = _ptEars2(x, y, r, 0.34, o.earT, o.inner, 0.74), head = [];
  head.push(..._ptHeadShape(x, y, r, o.fur, { w: 1.12, h: 0.96, jaw: 1 }));
  if (o.patch) for (const ex of [-0.34, 0.48]) head.push(_pF(_pE(x + r * ex, y - r * 0.02, r * 0.3, r * 0.36), o.patch, 1, _ptRot(ex < 0 ? 18 : -18, x + r * ex, y)));
  const F = _ptFace2(c, { s: o.patch ? 0.14 : 0.18, dy: -0.04, muz: [0.46, 0.34, o.muz], my: 0.48, ny: 0.34, nose: '#231c1e', nw: 0.15, nh: 0.1, blush: o.patch ? 0.2 : 0.26 });
  // a panda's eyes sit in dark patches: a glint of white, and a closed eye shows pale
  if (o.patch) { for (const s of F.eyes) if (s.s) s.s = '#fbf6ee'; }
  return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r, 0.86) };
}
function _ptBear(pet, pose, mood, X) {
  const fur = X.a, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 16.5, bl: 1.06, bh: 1.2, leg: 0.68, sit: 0.94, legW: 7, ch: 1.12,
    belly: m === 'moon' ? null : X.b[0],
    tail(c) { const [x, y] = c.g.tailRoot; return [_pF(_pC(x + 2, c.pose === 'sit' ? y - 3 : y, 4), fur[1])]; },
    marks(c) {
      if (m !== 'moon' || c.pose === 'sleep') return {};
      const bx = c.pose === 'sit' ? c.g.torso[0] + 4 : c.g.chest[0] + 1, by = c.pose === 'sit' ? c.g.torso[1] - 4 : c.g.chest[1] + 2;
      return { body: [_pF(_pP`M${bx - 6} ${by - 2}Q${bx} ${by + 7} ${bx + 6} ${by - 2}Q${bx} ${by + 3} ${bx - 6} ${by - 2}z`, '#fbf4e0')] };
    },
    head(c) { return _ptBearHead(c, { fur, earT: fur, inner: _ptMix(fur[3], X.b[0], 0.5), muz: X.b[0] }); },
  });
}
function _ptPanda(pet, pose, mood, X) {
  const fur = X.a, dark = _ptTone(X.c[0]);
  return _ptQuad(pet, pose, mood, X, {
    hr: 16.5, bl: 1.04, bh: 1.22, leg: 0.66, sit: 0.92, legW: 7.2, ch: 1.14, legT: dark,
    tail(c) { const [x, y] = c.g.tailRoot; return [_pF(_pC(x + 2, c.pose === 'sit' ? y - 3 : y, 4), fur[1])]; },
    marks(c) {
      const out = { body: [] }, g = c.g;
      // the dark shoulders
      if (c.pose === 'walk') { const [cx, cy, rx, ry] = g.body; out.body.push(_pF(_pP`M${cx + rx * 0.08} ${cy - ry * 1.02}Q${cx + rx * 0.5} ${cy - ry * 1.15} ${cx + rx * 0.72} ${cy - ry * 0.7}Q${cx + rx * 0.82} ${cy + ry * 0.3} ${cx + rx * 0.58} ${cy + ry * 0.92}L${cx + rx * 0.3} ${cy + ry * 0.92}Q${cx + rx * 0.3} ${cy} ${cx + rx * 0.08} ${cy - ry * 1.02}z`, dark[0])); }
      else if (c.pose === 'sit') { const [tx, ty, , ry] = g.torso; out.body.push(_pF(_pE(tx + 1, ty - ry * 0.62, 12, 7), dark[0], 1, _ptRot(10, tx, ty - ry * 0.62))); }
      else { const [cx, cy, rx, ry] = g.body; out.body.push(_pF(_pE(cx + rx * 0.42, cy - ry * 0.3, rx * 0.26, ry * 0.7), dark[0])); }
      if (pet.marks === 'bamboo' && c.pose === 'sit') { const ax = g.torso[0] + 9, ay = g.torso[1] + 1; out.paw = [_pL(_pP`M${ax} ${ay + 9}L${ax + 4} ${ay - 12}`, '#6cb35a', 2.6), _pL(_pP`M${ax + 1.6} ${ay - 1}L${ax + 3.4} ${ay - 0.6}`, '#3f7a34', 1), _pF(_pE(ax + 8, ay - 9, 4.4, 1.8), '#7cc06a', 1, _ptRot(-30, ax + 8, ay - 9))]; }
      return out;
    },
    head(c) { return _ptBearHead(c, { fur, earT: dark, inner: dark[1], muz: _ptMix(fur[0], '#ffffff', 0.5), patch: dark[0] }); },
  });
}

/* ---------- the koala ---------- */
function _ptKoala(pet, pose, mood, X) {
  const fur = X.a, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 17.5, bl: 0.9, bh: 1.12, leg: 0.58, sit: 0.8, legW: 5.8, ch: 1.04, belly: X.b[0],
    marks(c) {
      if (m !== 'leaf' || c.pose !== 'sit') return {};
      const ax = c.g.torso[0] + 8, ay = c.g.torso[1] + 4;
      return { paw: [_pL(_pP`M${ax} ${ay}Q${ax + 4} ${ay - 6} ${ax + 3} ${ay - 12}`, '#7a6a4a', 1.2), _pF(_pE(ax + 7, ay - 6, 5, 1.8), '#7fb08a', 1, _ptRot(-34, ax + 7, ay - 6)), _pF(_pE(ax + 1, ay - 8, 5, 1.8), '#6a9f7a', 1, _ptRot(30, ax + 1, ay - 8)), _pF(_pE(ax + 6, ay - 12, 5, 1.8), '#8cc09a', 1, _ptRot(-20, ax + 6, ay - 12))] };
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) {
        const ex = x + side * r * 0.98, ey = y - r * 0.6, t = side < 0 ? fur[1] : fur[0];
        back.push(_pF(_pC(ex, ey, r * 0.6), t));
        for (const [a, s] of [[-2.4, 0.26], [-1.6, 0.28], [-0.8, 0.26], [0, 0.24], [2.2, 0.22]]) back.push(_pF(_pC(ex + side * Math.cos(a) * r * 0.54, ey + Math.sin(a) * r * 0.54, r * s), t));
        back.push(_pF(_pC(ex + side * r * 0.02, ey + r * 0.04, r * 0.36), X.b[0], 0.95));
      }
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.06, h: 0.94, jaw: 1 }));
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.15, dy: -0.06 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X);
      const nx = x + r * 0.09, front = [];
      // the big nose
      front.push(_pF(_pP`M${nx - r * 0.2} ${y + r * 0.06}Q${nx} ${y - r * 0.08} ${nx + r * 0.2} ${y + r * 0.06}Q${nx + r * 0.25} ${y + r * 0.42} ${nx} ${y + r * 0.56}Q${nx - r * 0.25} ${y + r * 0.42} ${nx - r * 0.2} ${y + r * 0.06}z`, '#3a3238'), _pF(_pE(nx - r * 0.07, y + r * 0.1, r * 0.06, r * 0.04), '#ffffff', 0.45));
      front.push(..._ptMouth(nx, y + r * 0.7, r * 0.15, c.mood), ..._ptBlush(eyesAt[0] - r * 0.14, eyesAt[1] + r * 0.14, y + r * 0.42, r * 0.15, 0.26));
      return { back, head, eyes, front, eyesAt, ..._ptAnch(x, y, r, 0.86) };
    },
  });
}

/* ---------- the wolf ---------- */
function _ptWolf(pet, pose, mood, X) {
  const fur = X.a, pale = X.b, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 14.5, bl: 1.12, bh: 0.98, leg: 1.12, sit: 1.14, legW: 5.2, neck: 1, belly: pale[0], pawCol: pale[0],
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 4} ${y - 1}Q${x - 12} ${y + 2} ${x - 17} ${y - 4}Q${x - 19} ${y - 7} ${x - 19} ${y - 10}`, _pP`M${x + 3} ${y}Q${x - 6} ${y + 8} ${x + 12} ${y + 9}Q${x + 28} ${y + 10} ${x + 40} ${y + 6}`, _pP`M${x + 4} ${y}Q${x - 8} ${y + 2} ${x - 14} ${y + 8}Q${x - 18} ${y + 12} ${x - 20} ${y + 12}`);
      return [_pL(d, fur[0], 9.5), _pL(d, X.c[0], 4, 0.55), _pL(d, fur[2], 2, 0.3)];
    },
    marks(c) {
      const out = { body: [] }, g = c.g;
      if (c.pose !== 'sleep') {   // the ruff
        const nx = c.pose === 'sit' ? g.torso[0] + 3 : g.chest[0] - 1, ny = c.pose === 'sit' ? g.torso[1] - g.torso[3] * 0.62 : g.chest[1] - g.chest[3] * 0.62;
        out.body.push(_pF(_pP`M${nx - 11} ${ny - 3}L${nx - 13} ${ny + 6}L${nx - 7} ${ny + 3}L${nx - 8} ${ny + 11}L${nx - 2} ${ny + 6}L${nx} ${ny + 14}L${nx + 4} ${ny + 7}L${nx + 8} ${ny + 11}L${nx + 9} ${ny + 2}L${nx + 12} ${ny - 3}z`, fur[0]));
      }
      if (m === 'saddle') { const [cx, cy, rx, ry] = _ptTrunk(c); out.body.push(_pF(_pP`M${cx - rx * 0.8} ${cy - ry * 0.45}Q${cx} ${cy - ry * 1.25} ${cx + rx * 0.5} ${cy - ry * 0.7}Q${cx} ${cy + ry * 0.05} ${cx - rx * 0.8} ${cy - ry * 0.45}z`, X.c[0], 0.9)); }
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, 1.58, fur, _ptMix(pale[0], fur[3], 0.3), { in: 0.2, out: 0.9, tipX: 0.78, back: X.c[0] }));
      head.push(_pF(_pP`M${x - r * 1.1} ${y - r * 0.05}Q${x - r} ${y - r * 0.98} ${x} ${y - r * 0.98}Q${x + r} ${y - r * 0.98} ${x + r * 1.1} ${y - r * 0.05}L${x + r * 1.34} ${y + r * 0.34}L${x + r * 1.04} ${y + r * 0.42}L${x + r * 1.08} ${y + r * 0.7}Q${x + r * 0.55} ${y + r * 0.9} ${x + r * 0.09} ${y + r * 1.1}Q${x - r * 0.46} ${y + r * 0.9} ${x - r * 0.92} ${y + r * 0.7}L${x - r * 0.96} ${y + r * 0.42}L${x - r * 1.28} ${y + r * 0.34}z`, fur[0]));
      if (m === 'mask' || m === 'plain') head.push(_pF(_pP`M${x + r * 0.09} ${y - r * 0.5}Q${x + r * 0.34} ${y - r * 0.08} ${x + r * 1.02} ${y + r * 0.16}Q${x + r * 0.9} ${y + r * 0.82} ${x + r * 0.09} ${y + r * 1.06}Q${x - r * 0.72} ${y + r * 0.82} ${x - r * 0.84} ${y + r * 0.16}Q${x - r * 0.16} ${y - r * 0.08} ${x + r * 0.09} ${y - r * 0.5}z`, pale[0]));
      head.push(_pF(_pE(x + r * 0.09, y + r * 0.52, r * 0.42, r * 0.34), pale[0]), _pF(_pE(x - r * 0.4, y - r * 0.56, r * 0.4, r * 0.18), fur[2], 0.4));
      const F = _ptFace2(c, { s: 0.18, dy: -0.04, ny: 0.5, nose: '#231c1e', nw: 0.15, nh: 0.1, blush: 0.16 });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r) };
    },
  });
}

/* ---------- the lion and the tiger ---------- */
function _ptLion(pet, pose, mood, X) {
  const fur = X.a, mane = _ptTone(X.c[0]), m = pet.marks, full = m === 'mane' || m === 'dark';
  const mn = m === 'dark' ? _ptTone(_ptMix(X.c[0], '#2a1a14', 0.55)) : mane;
  return _ptQuad(pet, pose, mood, X, {
    hr: 15, bl: 1.04, bh: 1.02, leg: 0.88, sit: 1.0, legW: 6, belly: X.b[0], tailFront: true,
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 2} ${y - 1}Q${x - 6} ${y + 4} ${x + 5} ${y + 5}Q${x + 22} ${y + 6} ${x + 30} ${y + 1}`, _pP`M${x + 2} ${y - 2}Q${x - 4} ${y + 8} ${x + 12} ${y + 9}Q${x + 30} ${y + 10} ${x + 40} ${y + 6}`, _pP`M${x + 3} ${y + 1}Q${x - 8} ${y - 2} ${x - 9} ${y - 12}Q${x - 9} ${y - 20} ${x - 3} ${y - 22}`);
      const tip = _ptByPose(c, [x + 30, y + 1], [x + 40, y + 6], [x - 3, y - 22]);
      return [_pL(d, fur[0], 3.6), _pF(_pE(tip[0], tip[1], 4.2, 3.8), mn[0]), _pF(_pC(tip[0] - 1, tip[1] - 1, 1.6), mn[2], 0.5)];
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = _ptEars2(x, y, r, 0.27, fur, _ptMix(_PTK_PINK, fur[0], 0.35), full ? 0.82 : 0.74), head = [];
      if (full) {   // a ring of mane behind the face
        const n = 12, R = r * 1.34;
        let d = '';
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, a2 = (i + 0.5) / n * Math.PI * 2; d += (i ? 'L' : 'M') + _ptR(x + Math.cos(a) * R) + ' ' + _ptR(y + r * 0.08 + Math.sin(a) * R) + 'L' + _ptR(x + Math.cos(a2) * R * 1.16) + ' ' + _ptR(y + r * 0.08 + Math.sin(a2) * R * 1.16); }
        head.push(_pF(d + 'z', mn[0]), _pF(_pC(x, y + r * 0.08, R * 0.98), mn[0]), _pF(_pC(x + r * 0.3, y + r * 0.4, R * 0.78), mn[1], 0.32));
      } else if (m === 'tuft') head.push(_pF(_pP`M${x - r * 0.26} ${y - r * 0.84}Q${x - r * 0.32} ${y - r * 1.42} ${x + r * 0.2} ${y - r * 1.34}Q${x - r * 0.02} ${y - r * 1.22} ${x + r * 0.32} ${y - r * 1.06}Q${x + r * 0.18} ${y - r * 0.96} ${x + r * 0.26} ${y - r * 0.8}z`, mn[0]));
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.06, h: 0.94, jaw: 0.96 }));
      head.push(_pF(_pE(x + r * 0.09, y + r * 0.5, r * 0.5, r * 0.34), X.b[0]));
      const F = _ptFace2(c, { s: 0.2, dy: -0.06, ny: 0.36, nose: '#b0604a', nw: 0.14, nh: 0.1, whisk: _ptMix(fur[3], '#ffffff', 0.3) });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r) };
    },
  });
}
function _ptTiger(pet, pose, mood, X) {
  const fur = X.a, st = X.c[0], pale = X.b;
  return _ptQuad(pet, pose, mood, X, {
    hr: 15.5, bl: 1.06, bh: 1.04, leg: 0.86, sit: 1.0, legW: 6.2, belly: pale[0], tailFront: true,
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 2} ${y - 1}Q${x - 6} ${y + 4} ${x + 5} ${y + 5}Q${x + 22} ${y + 6} ${x + 31} ${y + 1}`, _pP`M${x + 2} ${y - 2}Q${x - 4} ${y + 8} ${x + 12} ${y + 9}Q${x + 30} ${y + 10} ${x + 40} ${y + 6}`, _pP`M${x + 3} ${y + 1}Q${x - 8} ${y - 2} ${x - 9} ${y - 12}Q${x - 9} ${y - 20} ${x - 3} ${y - 23}`);
      return [_pL(d, fur[0], 5), { f: null, s: st, w: 5.1, d, op: 1, cap: 'butt', dash: '2.4 3.8' }];
    },
    marks(c) {
      const out = { body: [] }, [cx, cy, rx, ry] = _ptTrunk(c);
      const n = pet.marks === 'bold' ? 6 : 5;
      for (let i = 0; i < n; i++) {
        const u = -0.72 + i * (1.42 / (n - 1)), sx = cx + u * rx, top = cy - ry * Math.sqrt(Math.max(0.1, 1 - u * u * 0.72)) * 0.98;
        out.body.push(_pF(_pP`M${sx - 2} ${top}Q${sx + 1.6} ${top + ry * 0.4} ${sx - 0.2} ${top + ry * 0.92}Q${sx - 2.4} ${top + ry * 0.45} ${sx - 2} ${top}z`, st));
      }
      if (c.pose === 'sit') { const [hx, hy, hrx] = c.g.haunch; for (const k of [0, 1]) out.body.push(_pF(_pP`M${hx - hrx * 0.6 + k * 5} ${hy - 6 + k * 5}q6 -3 10 2q-5 0 -10 -2z`, st)); }
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = _ptEars2(x, y, r, 0.27, _ptTone(st), pale[0], 0.74), head = [];
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.1, h: 0.94, fluff: true }));
      head.push(_pF(_pE(x + r * 0.09, y + r * 0.52, r * 0.56, r * 0.38), pale[0]), _pF(_pE(x - r * 0.42, y - r * 0.28, r * 0.22, r * 0.12), pale[0], 0.9), _pF(_pE(x + r * 0.58, y - r * 0.28, r * 0.22, r * 0.12), pale[0], 0.9));
      // the stripes of the face
      head.push(_pF(_pP`M${x - r * 0.18} ${y - r * 0.92}L${x + r * 0.02} ${y - r * 0.92}L${x - r * 0.04} ${y - r * 0.5}z`, st), _pF(_pP`M${x + r * 0.16} ${y - r * 0.92}L${x + r * 0.36} ${y - r * 0.92}L${x + r * 0.22} ${y - r * 0.5}z`, st));
      for (const side of [-1, 1]) for (const dy of [0.02, 0.32]) head.push(_pF(_pP`M${x + side * r * 1.08} ${y + r * dy - r * 0.08}L${x + side * r * 0.64} ${y + r * dy}L${x + side * r * 1.06} ${y + r * dy + r * 0.1}z`, st));
      const F = _ptFace2(c, { s: 0.2, dy: -0.06, slit: false, ny: 0.36, nose: '#c0605a', nw: 0.13, nh: 0.09, whisk: '#fbf6ee' });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r) };
    },
  });
}

/* ---------- the alpaca ---------- */
function _ptAlpaca(pet, pose, mood, X) {
  const wool = X.a, m = pet.marks, sleep = pose === 'sleep';
  return _ptQuad(pet, pose, mood, X, {
    hr: 12.5, bl: 0.98, bh: 1.05, leg: 1.0, sit: 0.92, legW: 4.8, ch: 1, neck: sleep ? 0 : 14, hx: sleep ? 0 : pose === 'sit' ? -2 : 2, neckShape: false, pawCol: _ptMix(wool[0], '#3a2a24', 0.5),
    tail(c) { const [x, y] = c.g.tailRoot; return [_pF(_pC(c.pose === 'sit' ? x + 2 : x - 1, c.pose === 'sit' ? y - 5 : y, 4.2), wool[0])]; },
    marks(c) {
      const out = { body: [] }, g = c.g;
      if (c.pose === 'walk') out.body.push(..._ptWool(g.body[0], g.body[1] - 1, g.body[2], g.body[3] + 1.5, wool, 10, 4.8));
      else if (c.pose === 'sleep') out.body.push(..._ptWool(g.body[0], g.body[1], g.body[2], g.body[3], wool, 10, 4.6));
      else out.body.push(..._ptWool(g.torso[0] - 4, g.torso[1], g.torso[2] + 3, g.torso[3], wool, 10, 4.6), ..._ptWool(g.haunch[0], g.haunch[1] - 1, g.haunch[2] * 0.8, g.haunch[3] * 0.8, wool, 8, 4.2));
      if (c.pose !== 'sleep') {   // the long woolly neck
        const bx = c.pose === 'sit' ? g.torso[0] + 1 : g.chest[0], by = c.pose === 'sit' ? g.torso[1] - g.torso[3] * 0.5 : g.chest[1] - 2;
        const n = _pP`M${bx} ${by}Q${(bx + g.hx) / 2 + 1} ${(by + g.hy) / 2} ${g.hx - 1} ${g.hy + 7}`;
        out.body.push(_pL(n, wool[0], 11), _pL(n, wool[1], 3, 0.18));
      }
      if (m === 'scarf' && c.pose !== 'sleep') { const nx = g.hx - 1, ny = g.hy + 13; out.body.push(_pF(_pE(nx, ny, 7.5, 3), '#d9534a'), _pF(_pP`M${nx - 5} ${ny + 1}l-1 8l5 -1l1 -6z`, '#c0433c')); }
      if (m === 'patch') { const [cx, cy, rx, ry] = _ptTrunk(c); out.body.push(_pF(_pE(cx - rx * 0.2, cy - ry * 0.2, rx * 0.4, ry * 0.5), X.c[0], 0.9)); }
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) { const ex = x + side * r * 0.56, ey = y - r * 1.2, a = side * 10; back.push(_pF(_pE(ex, ey, r * 0.24, r * 0.62), wool[side < 0 ? 1 : 0], 1, _ptRot(a, ex, ey)), _pF(_pE(ex, ey + r * 0.06, r * 0.11, r * 0.42), _ptMix(_PTK_PINK, wool[0], 0.4), 0.8, _ptRot(a, ex, ey))); }
      head.push(..._ptHeadShape(x, y, r, wool, { w: 0.96, h: 0.96, jaw: 0.86 }));
      for (const [u, v, s] of [[-0.56, -0.74, 0.34], [-0.2, -1.0, 0.4], [0.22, -1.02, 0.4], [0.6, -0.76, 0.34], [0, -0.74, 0.36]]) head.push(_pF(_pC(x + r * u, y + r * v, r * s), wool[0]));
      head.push(_pF(_pC(x - r * 0.2, y - r * 1.08, r * 0.16), wool[2], 0.7));
      head.push(_pF(_pE(x + r * 0.09, y + r * 0.56, r * 0.44, r * 0.36), X.b[0]));
      const F = _ptFace2(c, { s: 0.24, dy: -0.06, ny: 0.46, nose: '#5a3a3a', nw: 0.1, nh: 0.06 });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r, 1.16) };
    },
  });
}

/* ---------- the griffin ---------- */
function _ptGriffin(pet, pose, mood, X) {
  const fur = X.a, fea = X.b, gold = _ptTone('#eab84a'), wing = _ptTone(X.c[0]), m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 14.5, bl: 1.08, bh: 1.02, leg: 0.94, sit: 1.04, legW: 5.8, belly: fea[0], wingAt: _ptWingAt, pawCol: gold[0],
    tail(c) {
      const [x, y] = c.g.tailRoot;
      const d = _ptByPose(c, _pP`M${x + 4} ${y - 1}Q${x - 10} ${y + 2} ${x - 12} ${y - 10}Q${x - 13} ${y - 18} ${x - 8} ${y - 22}`, _pP`M${x + 2} ${y - 2}Q${x - 4} ${y + 8} ${x + 12} ${y + 9}Q${x + 30} ${y + 10} ${x + 40} ${y + 6}`, _pP`M${x + 3} ${y + 1}Q${x - 10} ${y - 2} ${x - 12} ${y - 11}Q${x - 13} ${y - 18} ${x - 8} ${y - 21}`);
      const tip = _ptByPose(c, [x - 8, y - 22], [x + 40, y + 6], [x - 8, y - 21]);
      return [_pL(d, fur[0], 3.6), _pF(_pE(tip[0], tip[1], 4.4, 4), wing[0]), _pF(_pC(tip[0] - 1, tip[1] - 1, 1.6), wing[2], 0.6)];
    },
    marks(c) {
      const out = { wingB: _ptFeatherWing(c, [wing[1], wing[3], wing[1]], 1.3), wingN: _ptFeatherWing(c, wing, 1.2), body: [] };
      // the chest feathers
      if (c.pose !== 'sleep') { const bx = c.pose === 'sit' ? c.g.torso[0] + 3 : c.g.chest[0], by = c.pose === 'sit' ? c.g.torso[1] - c.g.torso[3] * 0.56 : c.g.chest[1] - c.g.chest[3] * 0.56; out.body.push(_pF(_pP`M${bx - 9} ${by - 2}L${bx - 8} ${by + 7}L${bx - 4} ${by + 4}L${bx - 2} ${by + 11}L${bx + 2} ${by + 5}L${bx + 6} ${by + 8}L${bx + 9} ${by - 2}z`, fea[0])); }
      if (m === 'gold') out.wingN.push(_pL(_pP`M${_ptWingAt(c)[0] - 4} ${_ptWingAt(c)[1] - 8}l-14 -6`, '#f6d77a', 1.4));
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [];
      for (const side of [-1, 1]) back.push(_pF(_pP`M${x + side * r * 0.42} ${y - r * 0.76}Q${x + side * r * 0.86} ${y - r * 1.34} ${x + side * r * 1.08} ${y - r * 1.46}Q${x + side * r * 1.0} ${y - r * 0.96} ${x + side * r * 0.88} ${y - r * 0.48}z`, fea[side < 0 ? 1 : 0]));
      head.push(..._ptHeadShape(x, y, r, fea, { w: 1.02, h: 0.98, fluff: true }));
      head.push(_pF(_pE(x - r * 0.72, y + r * 0.5, r * 0.3, r * 0.42), wing[0], 0.5), _pF(_pP`M${x - r * 0.2} ${y - r * 0.96}L${x} ${y - r * 1.34}L${x + r * 0.2} ${y - r * 0.96}z`, fea[0]));
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.21, dy: -0.12 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X);
      // the hooked beak
      const bx = x + r * 0.09, by = y + r * 0.12, front = [];
      front.push(_pF(_pP`M${bx - r * 0.32} ${by}Q${bx + r * 0.2} ${by - r * 0.14} ${bx + r * 0.44} ${by + r * 0.22}Q${bx + r * 0.52} ${by + r * 0.58} ${bx + r * 0.22} ${by + r * 0.8}Q${bx + r * 0.22} ${by + r * 0.5} ${bx - r * 0.02} ${by + r * 0.48}Q${bx - r * 0.34} ${by + r * 0.4} ${bx - r * 0.32} ${by}z`, gold[0]), _pF(_pE(bx - r * 0.02, by + r * 0.56, r * 0.2, r * 0.1), gold[1]), _pF(_pE(bx - r * 0.04, by + r * 0.08, r * 0.1, r * 0.05), '#ffffff', 0.55), ..._ptBlush(eyesAt[0] - r * 0.14, eyesAt[1] + r * 0.16, y + r * 0.22, r * 0.13, 0.24));
      return { back, head, eyes, front, eyesAt, ..._ptAnch(x, y, r, 0.9) };
    },
  });
}

/* ---------- the kitsune: a fox with a fan of tails; the jackalope: a rabbit with antlers ---------- */
function _ptKitsune(pet, pose, mood, X) {
  const A = _ptFox(Object.assign({}, pet, { marks: pet.marks === 'bigears' ? 'bigears' : 'plain' }), pose, mood, X);
  const fur = X.a, tip = X.b[0], flame = X.c[0], m = pet.marks;
  const r0 = A.piv.tail, x = r0[0], y = r0[1], tails = [];
  const n = m === 'nine' ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5, sl = pose === 'sleep';
    const a = sl ? -2.3 + t * 1.5 : pose === 'sit' ? -1.9 + t * 1.8 : -2.05 + t * 1.5, L = sl ? 25 : 27, cx = x + Math.cos(a) * L * 0.55 + Math.sin(a) * 5, cy = y + Math.sin(a) * L * 0.55 - Math.cos(a) * 5, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
    const d = _pP`M${x + 2} ${y}Q${cx} ${cy} ${ex} ${ey}`;
    tails.push(_pL(d, i % 2 ? fur[1] : fur[0], 7.4), _pL(d, fur[2], 1.6, 0.3), _pF(_pC(ex, ey, 4.2), tip), _pF(_pP`M${ex - 2.6} ${ey + 0.4}Q${ex} ${ey - 3} ${ex + 2.6} ${ey + 0.4}Q${ex} ${ey + 2.4} ${ex - 2.6} ${ey + 0.4}z`, flame, 0.75));
  }
  A.parts.tail = tails;
  if (A.order.indexOf('tail') > A.order.indexOf('body')) { A.order = A.order.filter(q => q !== 'tail'); A.order.unshift('tail'); }
  // the mark on the forehead, and the sleeve-red cheeks
  const hc = A.acc.hc, fx0 = hc[0] + hc[2] * 0.09, fy0 = hc[1] - hc[2] * 0.62, hr = hc[2];
  A.parts.head.push(_pF(_pP`M${fx0} ${fy0 - hr * 0.2}Q${fx0 + hr * 0.14} ${fy0} ${fx0} ${fy0 + hr * 0.2}Q${fx0 - hr * 0.14} ${fy0} ${fx0} ${fy0 - hr * 0.2}z`, flame));
  for (const ex of [A.acc.eyes[0], A.acc.eyes[1]]) A.parts.head.push(_pL(_pP`M${ex - hr * 0.26} ${A.acc.eyes[2] + hr * 0.28}l${hr * 0.22} ${-hr * 0.04}`, flame, hr * 0.07, 0.85));
  if (m === 'wisp') A.parts.fx.push(_pF(_pP`M${x - 16} ${y - 30}q5 -6 3 -11q5 4 3 11q-2 3 -6 0z`, '#7fd6f8', 0.9), _pF(_pC(x - 14, y - 31, 1.6), '#ffffff', 0.9));
  return A;
}
function _ptJackalope(pet, pose, mood, X) {
  const A = _ptRabbit(Object.assign({}, pet, { breed: 'up' }), pose, mood, X);
  const [x, y, r] = A.acc.hc, ant = _ptTone(X.c[0]);
  const horns = [];
  if (pose !== 'sleep') for (const side of [-1, 1]) horns.push(_pL(_pP`M${x + side * r * 0.1} ${y - r * 0.84}Q${x + side * r * 0.52} ${y - r * 1.5} ${x + side * r * 0.86} ${y - r * 2.02}M${x + side * r * 0.42} ${y - r * 1.34}L${x + side * r * 0.98} ${y - r * 1.36}M${x + side * r * 0.62} ${y - r * 1.66}L${x + side * r * 0.42} ${y - r * 2.0}`, side < 0 ? ant[1] : ant[0], r * 0.12));
  else for (const side of [-1, 1]) horns.push(_pL(_pP`M${x + side * r * 0.3} ${y - r * 0.8}Q${x + side * r * 0.42} ${y - r * 1.3} ${x + side * r * 0.8} ${y - r * 1.46}`, side < 0 ? ant[1] : ant[0], r * 0.12));
  A.parts.ears.push(...horns);
  A.top = Math.min(A.top, y - r * 2.3);
  return A;
}

/* ---------- THE KITS: a pet made from its table row alone ----------
   A row with art: {kit: 'quad' | 'bird', ...} needs no drawing code: the kit reads the numbers and picks its pieces by name from
   these registries. A new kind of ear, tail or marking is one more entry here, and every species can use it. Recipe: docs/dev/GARDEN.md. */
const PET_KIT_EARS = {
  round: (c, a) => _ptEars2(c.g.hx, c.g.hy, c.g.hr, a.earSize || 0.28, c.fur, _ptMix(_PTK_PINK, c.fur[0], 0.3)),
  tri: (c, a) => [-1, 1].flatMap(s => _ptEarTri(c.g.hx, c.g.hy, c.g.hr, s, a.earSize || 1.4, c.fur, _ptMix(_PTK_PINK, c.fur[0], 0.3), { in: 0.24, out: 0.88, tipX: 0.8 })),
  leaf: (c, a) => [-1, 1].flatMap(s => _ptEarLeaf(c.g.hx, c.g.hy, c.g.hr, s, a.earSize || 0.85, 0.36, c.fur, _ptMix(_PTK_PINK, c.fur[0], 0.35), 8)),
  flop: (c, a) => [-1, 1].flatMap(s => _ptEarFlop(c.g.hx, c.g.hy, c.g.hr, s, a.earSize || 0.95, c.fur)),
};
const PET_KIT_TAILS = {
  bushy: (c, a) => { const [x, y] = c.g.tailRoot, q = a.tailSize || 1, d = _ptByPose(c, _pP`M${x + 4} ${y - 1}Q${x - 10 * q} ${y} ${x - 12 * q} ${y - 10 * q}Q${x - 13 * q} ${y - 20 * q} ${x - 6 * q} ${y - 23 * q}`, _pP`M${x + 3} ${y - 1}Q${x - 6} ${y + 8} ${x + 12} ${y + 9}Q${x + 28} ${y + 9} ${x + 40} ${y + 6}`, _pP`M${x + 4} ${y}Q${x - 8 * q} ${y} ${x - 14 * q} ${y - 7 * q}Q${x - 18 * q} ${y - 13 * q} ${x - 17 * q} ${y - 18 * q}`); return [_pL(d, c.fur[0], 9 * q), _pL(d, c.fur[2], 2.4 * q, 0.35)]; },
  thin: (c) => { const [x, y] = c.g.tailRoot, d = _ptByPose(c, _pP`M${x + 3} ${y - 1}Q${x - 8} ${y + 3} ${x - 14} ${y - 3}`, _pP`M${x + 2} ${y}Q${x - 4} ${y + 8} ${x + 10} ${y + 9}`, _pP`M${x + 3} ${y}Q${x - 7} ${y + 1} ${x - 12} ${y - 7}`); return [_pL(d, c.fur[0], 3.6)]; },
  stub: (c) => { const [x, y] = c.g.tailRoot; return [_pF(_pC(x + 1, c.pose === 'sit' ? y - 3 : y, 4), c.fur[1])]; },
};
const PET_KIT_PATTERNS = {
  spots: (c) => ({ body: _ptSpots(c, [[-0.5, -0.4], [-0.1, -0.6], [0.35, -0.35], [-0.3, 0.1], [0.15, 0.2]], 2, c.X.c[0], 0.85) }),
  saddle: (c) => { const [cx, cy, rx, ry] = _ptTrunk(c); return { body: [_pF(_pP`M${cx - rx * 0.7} ${cy - ry * 0.55}Q${cx} ${cy - ry * 1.25} ${cx + rx * 0.6} ${cy - ry * 0.6}Q${cx} ${cy + ry * 0.1} ${cx - rx * 0.7} ${cy - ry * 0.55}z`, c.X.c[0], 0.95)] }; },
  socks: () => ({}),   // the kit paints the feet (below)
  mask: () => ({}),    // the kit paints the face (below)
};
function _ptKitQuad(pet, pose, mood, X, a) {
  const pat = (a.patterns || {})[pet.marks] || '', socks = pat === 'socks';
  return _ptQuad(pet, pose, mood, X, {
    hr: a.hr, bl: a.bl, bh: a.bh, leg: a.leg, sit: a.sit, legW: a.legW, ch: a.ch, neck: a.neck, belly: a.belly ? X.b[0] : null, pawCol: socks ? X.c[0] : null,
    tail: (c) => (PET_KIT_TAILS[a.tail] || PET_KIT_TAILS.thin)(c, a),
    marks: (c) => (PET_KIT_PATTERNS[pat] ? PET_KIT_PATTERNS[pat](c, a) : {}),
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = (PET_KIT_EARS[a.ear] || PET_KIT_EARS.tri)(c, a), head = [..._ptHeadShape(x, y, r, c.fur, { w: 1.08, h: 0.94, jaw: 0.96 })];
      if (pat === 'mask') head.push(_pF(_pE(x + r * 0.09, y - r * 0.02, r * 0.92, r * 0.3), X.c[0], 0.88));
      const F = _ptFace2(c, { s: a.es || 0.2, dy: -0.04, muz: a.muzzle ? [a.muzzle[0], a.muzzle[1], X.b[0]] : null, nose: a.nose, whisk: a.whisk ? _ptMix(c.fur[3], '#ffffff', 0.3) : null });
      return { back, head, eyes: F.eyes, front: F.front, eyesAt: F.eyesAt, ..._ptAnch(x, y, r) };
    },
  });
}
const PET_KIT_BIRD_TAILS = {
  cocked: (c) => { const d = _pP`M${c.cx - c.rx * 0.7} ${c.cy + 3}Q${c.cx - c.rx * 1.2} ${c.cy - 3} ${c.cx - c.rx * 1.22} ${c.cy - 16}`; return [_pL(d, c.a[1], 5), _pL(d, c.a[0], 2)]; },
  fan: (c) => [_pF(_pP`M${c.cx - c.rx * 0.72} ${c.cy - 5}L${c.cx - c.rx * 1.34} ${c.cy - 12}L${c.cx - c.rx * 1.06} ${c.cy + 2}z`, c.a[0])],
};
function _ptKitBird(pet, pose, mood, X, a) {
  return _ptUpBird(pet, pose, mood, X, Object.assign({}, a, { tail: PET_KIT_BIRD_TAILS[a.tail] || PET_KIT_BIRD_TAILS.fan, belly: a.belly ? (c) => [_pF(_pE(c.cx + c.rx * 0.28, c.cy + c.ry * 0.28, c.rx * 0.6, c.ry * 0.58), X.b[0], 0.95)] : null }));
}
const PET_KITS = { quad: _ptKitQuad, bird: _ptKitBird };
/** The drawing of a species: its own hand-drawn function, or the kit its row names. */
function _ptArtFor(sp) {
  if (_PT_ART[sp.id]) return _PT_ART[sp.id];
  const a = sp.art, kit = a && PET_KITS[a.kit];
  return kit ? (pet, pose, mood, X) => kit(pet, pose, mood, X, a) : _PT_ART.cat;
}

Object.assign(_PT_ART, { squirrel: _ptSquirrel, mouse: _ptMouse, badger: _ptBadger, otter: _ptOtter, raccoon: _ptRaccoon, fawn: _ptFawn, lamb: _ptLamb, piglet: _ptPiglet, goat: _ptGoat,
  pony: _ptPony, pegasus: _ptPegasus, capybara: _ptCapybara, bear: _ptBear, panda: _ptPanda, koala: _ptKoala, wolf: _ptWolf, lion: _ptLion, tiger: _ptTiger, alpaca: _ptAlpaca,
  griffin: _ptGriffin, kitsune: _ptKitsune, jackalope: _ptJackalope });

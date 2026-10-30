/* ============================================================
   PETS, the species (2.18, agent 'pets'). PURE: each species drawn by hand
   (the helpers, faces, ears and accessories are 97-pets-0kitdraw.js). Every
   pet faces right with its head turned a little towards you, feet on the
   ground line y = 90 of a 100 x 100 box, in three poses: 'sit' (the card),
   'walk' (the garden, the scenes; legs on hip pivots), 'sleep' (curled up).

   The four-legged ones share one rig (_ptQuad: where the body, legs, head and
   tail go for a pose and a set of proportions); what makes each one itself is
   drawn per species: heads, ears, muzzles, tails, coats and markings. The
   others (birds, the tortoise, the axolotl, the frog, the hamster, the guinea
   pig, the hedgehog, the robot) have drawings of their own.
   ============================================================ */

/* ---------- the four-legged rig ---------- */
/**
 * Geometry for a pose. k: {hr head radius, bl body length, bh body height, leg leg length, sit torso height,
 * ch haunch size, neck lift, hx head x shift, legW leg width}. Returns the ellipses and lines the species draw on.
 */
function _ptQuadGeo(pose, k) {
  const G = 90, hr = k.hr || 15, bl = k.bl || 1, bh = k.bh || 1, leg = k.leg || 1, lw = k.legW || 6;
  if (pose === 'walk') {
    const ry = 10 * bh, rx = 19 * bl, legL = 18 * leg;
    const cx = 46 - (bl - 1) * 5 - (k.dx || 0), cy = G - legL - ry * 0.4;
    const hip = cy + ry * 0.2, fx = cx + rx * 0.64, bx = cx - rx * 0.6;
    const hx = cx + rx * 0.84 + (k.hx || 0), hy = cy - ry * 0.7 - hr * 0.5 - (k.neck || 0);
    return { pose, G, lw, hr, hx, hy, body: [cx, cy, rx, ry], chest: [cx + rx * 0.6, cy - ry * 0.12, ry * 0.86, ry * 1.04], haunch: [bx + rx * 0.06, cy - ry * 0.04, ry * 0.92 * (k.ch || 1), ry * 1.02 * (k.ch || 1)],
      neck: [(fx + hx) / 2 + 1, (cy - ry * 0.4 + hy + hr * 0.5) / 2, Math.max(4, ry * 0.62), Math.max(5, (cy - hy) * 0.42), 24],
      legsN: [[bx, hip, bx - 0.6, G], [fx, hip, fx + 0.4, G]], legsF: [[bx + 4, hip - 1, bx + 4.6, G - 0.6], [fx + 4, hip - 1, fx + 4.8, G - 0.6]],
      tailRoot: [cx - rx * 0.92, cy - ry * 0.25], hipPiv: [cx, hip], collar: { x: hx - hr * 0.08, y: hy + hr * 0.82, w: hr * 1.05, rot: -8 } };
  }
  if (pose === 'sleep') {
    const ry = 11 * bh, rx = 22 * Math.min(1.25, bl);
    const cx = 44, cy = G - ry;
    const hr2 = hr * 0.96, hx = cx + rx * 0.72 + (k.hx || 0) * 0.5, hy = G - hr2 * 0.92;
    return { pose, G, lw, hr: hr2, hx, hy, body: [cx, cy, rx, ry], haunch: [cx - rx * 0.42, cy - ry * 0.05, ry * 1.05 * (k.ch || 1), ry * 1.0], chest: null, neck: null,
      paws: [[hx + hr2 * 0.1, G - 2.2], [hx + hr2 * 0.75, G - 2.4]], tailRoot: [cx - rx * 0.9, cy + ry * 0.2], hipPiv: [cx, cy], collar: { x: hx - hr2 * 0.55, y: hy + hr2 * 0.55, w: hr2 * 0.9, rot: 60 } };
  }
  // sit
  const sitH = 30 * (k.sit || 1), hn = 12.5 * (k.ch || 1) * bh;
  const tcx = 50 + (k.dx || 0), tcy = G - sitH * 0.52, trx = 10.5 * bh, try_ = sitH * 0.5;
  const hx = tcx + 5 + (k.hx || 0), hy = G - sitH - hr * 0.52 - (k.neck || 0);
  return { pose, G, lw, hr, hx, hy, torso: [tcx, tcy, trx, try_, 12], haunch: [tcx - 7 - (bl - 1) * 4, G - hn * 0.95, hn * 1.12, hn],
    legsN: [[tcx + 4.4, G - sitH * 0.58, tcx + 5.2, G]], legsF: [[tcx + 9.6, G - sitH * 0.56, tcx + 10.4, G - 0.5]],
    foot: [tcx - 2 - (bl - 1) * 3, G - 2.3, 6.4 * (k.ch || 1), 2.5], tailRoot: [tcx - 7 - hn * 1.0 - (bl - 1) * 4, G - 3.5], hipPiv: [tcx, G - sitH * 0.5],
    collar: { x: hx - hr * 0.02, y: hy + hr * 0.84, w: hr * 1.08, rot: 0 } };
}
/**
 * Draw a four-legged pet from its geometry and the species' drawers.
 * k: proportions plus head(ctx) -> {back, head, eyes, front, top, eyesAt, ear}, tail(ctx) -> shapes, marks(ctx) -> body shapes,
 * pawCol, legCol, tailFront (in front of the legs when sitting), fluff (a fluffier outline).
 */
function _ptQuad(pet, pose, mood, X, k) {
  const g = _ptQuadGeo(pose, k), fur = k.fur || X.a, legT = k.legT || fur, pawCol = k.pawCol || null;
  const ctx = { pet, pose, mood, X, g, k, fur };
  const parts = { legsF: [], tail: [], body: [], legsN: [], paw: [], neck: [], head: [], eyes: [], fx: [] };
  const lw = g.lw;
  const farT = [_ptMix(legT[0], legT[1], 0.75), legT[3], _ptMix(legT[2], legT[1], 0.5), legT[3]];
  if (pose === 'walk') {
    for (const [x0, y0, x1, y1] of g.legsF) parts.legsF.push(..._ptLeg(x0, y0, x1, y1, lw * 0.92, farT, pawCol ? _ptMix(pawCol, '#000000', 0.12) : null, k.sock ? _ptMix(k.sock, '#000000', 0.15) : null));
    const [cx, cy, rx, ry] = g.body;
    parts.body.push(_pF(_pE(g.haunch[0], g.haunch[1], g.haunch[2], g.haunch[3]), fur[0]));
    parts.body.push(..._ptBlob(cx, cy, rx, ry, fur));
    parts.body.push(_pL(_pP`M${g.haunch[0] + g.haunch[2] * 0.35} ${g.haunch[1] - g.haunch[3] * 0.62}Q${g.haunch[0] + g.haunch[2] * 0.85} ${g.haunch[1]} ${g.haunch[0] + g.haunch[2] * 0.45} ${g.haunch[1] + g.haunch[3] * 0.75}`, fur[1], 1.1, 0.35));
    parts.body.push(_pF(_pE(g.chest[0], g.chest[1], g.chest[2], g.chest[3]), fur[0]), _pF(_pE(g.chest[0] + g.chest[2] * 0.15, g.chest[1] + g.chest[3] * 0.4, g.chest[2] * 0.75, g.chest[3] * 0.5), fur[1], 0.22));
    if (k.neckShape !== false) parts.body.push(_pF(_pE(g.neck[0], g.neck[1], g.neck[2], g.neck[3]), fur[0], 1, _ptRot(g.neck[4], g.neck[0], g.neck[1])));
    if (k.belly) parts.body.push(_pF(_pE(cx + rx * 0.12, cy + ry * 0.64, rx * 0.62, ry * 0.26), k.belly, 0.9));
    parts.body.push(_pL(_pP`M${cx - rx * 0.7} ${cy - ry * 0.78}Q${cx} ${cy - ry * 1.12} ${cx + rx * 0.6} ${cy - ry * 0.86}`, fur[2], 1.4, 0.45));
    const [nx, nf] = [g.legsN[0], g.legsN[1]];
    parts.legsN.push(..._ptLeg(nx[0], nx[1], nx[2], nx[3], lw, legT, pawCol, k.sock));
    parts.paw.push(..._ptLeg(nf[0], nf[1], nf[2], nf[3], lw, legT, pawCol, k.sock));
  } else if (pose === 'sleep') {
    const [cx, cy, rx, ry] = g.body;
    parts.body.push(..._ptBlob(cx, cy, rx, ry, fur));
    parts.body.push(..._ptBlob(g.haunch[0], g.haunch[1], g.haunch[2], g.haunch[3], fur, 0, { shadeOp: 0.3 }));
    parts.body.push(_pL(_pP`M${g.haunch[0] + g.haunch[2] * 0.55} ${g.haunch[1] - g.haunch[3] * 0.5}Q${g.haunch[0] + g.haunch[2] * 0.95} ${g.haunch[1]} ${g.haunch[0] + g.haunch[2] * 0.7} ${g.haunch[1] + g.haunch[3] * 0.7}`, fur[1], 1.1, 0.45));
    for (const [px, py] of g.paws) parts.paw.push(_pF(_pE(px, py, lw * 0.85, lw * 0.45), pawCol || fur[0]), _pF(_pE(px + 0.6, py + 0.5, lw * 0.6, lw * 0.2), fur[1], 0.35));
  } else {
    // sit: the far front leg, the haunch, the torso, the near hind foot, the near front leg
    for (const [x0, y0, x1, y1] of g.legsF) parts.legsF.push(..._ptLeg(x0, y0, x1, y1, lw * 0.95, farT, pawCol ? _ptMix(pawCol, '#000000', 0.1) : null, k.sock ? _ptMix(k.sock, '#000000', 0.15) : null));
    const [tx, ty, trx, try_, tr] = g.torso;
    parts.body.push(..._ptBlob(tx, ty, trx, try_, fur, tr));
    parts.body.push(..._ptBlob(g.haunch[0], g.haunch[1], g.haunch[2], g.haunch[3], fur, -8, { shadeOp: 0.34 }));
    parts.body.push(_pL(_pP`M${g.haunch[0] + g.haunch[2] * 0.2} ${g.haunch[1] - g.haunch[3] * 0.92}Q${g.haunch[0] + g.haunch[2] * 0.95} ${g.haunch[1] - g.haunch[3] * 0.6} ${g.haunch[0] + g.haunch[2] * 0.9} ${g.haunch[1] + g.haunch[3] * 0.5}`, fur[1], 1.2, 0.4));
    if (k.belly) parts.body.push(_pF(_pE(tx + 3.6, ty + 1, trx * 0.52, try_ * 0.62), k.belly, 0.95, _ptRot(tr, tx + 3.6, ty + 1)));
    const [fx, fy, frx, fry] = g.foot;
    parts.body.push(_pF(_pE(fx, fy, frx, fry), pawCol || fur[0]), _pF(_pE(fx + 0.6, fy + 0.8, frx * 0.8, fry * 0.45), fur[1], 0.35));
    const n = g.legsN[0];
    parts.paw.push(..._ptLeg(n[0], n[1], n[2], n[3], lw, legT, pawCol, k.sock));
  }
  if (k.marks) { const m = k.marks(ctx) || {}; for (const key of Object.keys(m)) if (parts[key]) parts[key].push(...m[key]); }
  const tail = k.tail ? k.tail(ctx) : [];
  parts.tail.push(...tail);
  const H = k.head(ctx);
  parts.head.push(...(H.back || []), ...(H.head || []));
  parts.eyes.push(...(H.eyes || []));
  parts.head.push(...(H.front || []));
  const order = pose === 'sit' && k.tailFront ? ['legsF', 'body', 'legsN', 'paw', 'tail', 'neck', 'head', 'eyes', 'fx'] : ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'];
  const tr0 = k.tailPiv ? k.tailPiv(ctx) : g.tailRoot;
  return {
    parts, order,
    piv: { tail: tr0, head: [g.hx - g.hr * 0.1, g.hy + g.hr * 0.85], eyes: H.eyesPiv || [g.hx, g.hy], paw: pose === 'sit' ? [g.legsN[0][0], g.legsN[0][1]] : pose === 'walk' ? [g.legsN[1][0], g.legsN[1][1]] : [g.hx, g.G],
      legsN: pose === 'walk' ? [g.legsN[0][0], g.legsN[0][1]] : g.hipPiv, legsF: g.hipPiv, body: [50, 90] },
    acc: { neck: H.neck === false ? null : Object.assign({}, g.collar, H.neck || {}), top: H.top, eyes: H.eyesAt, ear: H.ear, hc: H.hc },
    top: Math.min(g.hy - g.hr * 1.4, 20), legsAt: pose === 'walk' ? g.legsN.concat(g.legsF) : null,
  };
}

/* ---------- shared head pieces for the four-legged ones ---------- */
/** A rounded head: a little wider at the cheeks. */
function _ptHeadShape(x, y, r, t, o) {
  o = o || {};
  const w = r * (o.w || 1.08), h = r * (o.h || 0.94);
  const out = [_pF(_pP`M${x - w} ${y + h * 0.05}Q${x - w * 1.02} ${y - h * 1.02} ${x} ${y - h}Q${x + w * 1.02} ${y - h * 1.02} ${x + w} ${y + h * 0.05}Q${x + w * (o.jaw || 0.92)} ${y + h * 0.98} ${x} ${y + h}Q${x - w * (o.jaw || 0.92)} ${y + h * 0.98} ${x - w} ${y + h * 0.05}z`, t[0])];
  if (o.fluff) for (const side of [-1, 1]) out.push(_pF(_pP`M${x + side * w * 0.86} ${y + h * 0.1}L${x + side * w * 1.16} ${y + h * 0.32}L${x + side * w * 0.92} ${y + h * 0.42}L${x + side * w * 1.1} ${y + h * 0.62}L${x + side * w * 0.7} ${y + h * 0.66}z`, t[0]));
  // the shade: a crescent on the side away from the light, and a soft one under the chin
  out.push(_pF(_pP`M${x + w * 0.5} ${y - h * 0.8}Q${x + w * 1.08} ${y - h * 0.1} ${x + w * 0.42} ${y + h * 0.95}Q${x + w * 0.86} ${y + h * 0.2} ${x + w * 0.5} ${y - h * 0.8}z`, t[1], 0.32));
  out.push(_pF(_pP`M${x - w * 0.55} ${y + h * 0.7}Q${x} ${y + h * 1.08} ${x + w * 0.55} ${y + h * 0.7}Q${x} ${y + h * 0.9} ${x - w * 0.55} ${y + h * 0.7}z`, t[1], 0.22));
  out.push(_pF(_pE(x - w * 0.38, y - h * 0.52, w * 0.38, h * 0.2), t[2], 0.34));
  return out;
}
/** Eye positions for a head of radius r at (x, y): [x1, x2, y, size]. */
const _ptEyeAt = (x, y, r, k) => [x - r * 0.4 + r * 0.06, x + r * 0.42 + r * 0.06, y + r * (k && k.dy != null ? k.dy : 0.02), r * (k && k.s || 0.19)];

/* ---------- the cat ---------- */
function _ptCat(pet, pose, mood, X) {
  const fluffy = pet.breed === 'fluffy', fold = pet.breed === 'fold', m = pet.marks;
  const white = _ptTone('#fbf8f2');
  const tux = m === 'tuxedo', points = m === 'points' || pet.coat === 'siamese', calico = m === 'patches' || pet.coat === 'calico';
  const pawCol = tux || m === 'socks' ? white[0] : points ? X.c[0] : null;
  const fur = X.a;
  return _ptQuad(pet, pose, mood, X, {
    hr: 16, bl: 1, bh: fluffy ? 1.12 : 1, leg: 0.95, sit: 1.02, ch: fluffy ? 1.1 : 1, legW: fluffy ? 6.6 : 5.8, pawCol, tailFront: true,
    belly: tux ? white[0] : (fluffy || pet.coat !== 'black' ? X.b[0] : null),
    tail(c) {
      const g = c.g, tc = points ? X.c : fur, w = fluffy ? 7.5 : 5.4;
      let d;
      if (c.pose === 'sit') { const [x, y] = g.tailRoot; d = _pP`M${x + 2} ${y - 1}Q${x - 6} ${y + 4} ${x + 4} ${y + 5}Q${x + 22} ${y + 6} ${x + 30} ${y + 2.5}Q${x + 34} ${y + 1} ${x + 33} ${y - 2}`; }
      else if (c.pose === 'sleep') { const [x, y] = g.tailRoot; d = _pP`M${x + 2} ${y - 2}Q${x - 4} ${y + 8} ${x + 12} ${y + 9}Q${x + 30} ${y + 10} ${x + 40} ${y + 7}`; }
      else { const [x, y] = g.tailRoot; d = _pP`M${x + 3} ${y + 1}Q${x - 6} ${y - 2} ${x - 7} ${y - 12}Q${x - 8} ${y - 22} ${x - 2} ${y - 25}`; }
      const out = [_pL(d, tc[0], w)];
      out.push(_pL(d, tc[2], w * 0.28, 0.35));
      if (m === 'tabby' && !points) out.push({ f: null, s: X.c[0], w: w * 1.02, d, op: 0.75, cap: 'butt', dash: '2.2 3.2' });
      if (calico) out.push({ f: null, s: X.c[0], w: w * 1.02, d, op: 1, cap: 'butt', dash: '0 9 7 30' });
      return out;
    },
    marks(c) {
      const g = c.g, out = { body: [], head: [] };
      if (m === 'tabby' && !points) {
        if (c.pose === 'walk') { const [cx, cy, rx, ry] = g.body; for (let i = 0; i < 4; i++) out.body.push(_pL(_pP`M${cx - rx * 0.55 + i * rx * 0.36} ${cy - ry * 0.95}q${2} ${ry * 0.45} ${0.5} ${ry * 0.95}`, X.c[0], 2.2, 0.7)); }
        else if (c.pose === 'sit') { const [tx, ty, , ry] = g.torso; for (let i = 0; i < 3; i++) out.body.push(_pL(_pP`M${tx - 9} ${ty - ry * 0.3 + i * 6}q${5} ${1.5} ${8} ${-1}`, X.c[0], 2, 0.65)); const [hx, hy, hrx] = g.haunch; out.body.push(_pL(_pP`M${hx - hrx * 0.6} ${hy - 4}q${6} ${-3} ${10} ${2}M${hx - hrx * 0.4} ${hy + 3}q${6} ${-2} ${9} ${2.5}`, X.c[0], 2, 0.6)); }
        else { const [cx, cy, rx, ry] = g.body; for (let i = 0; i < 4; i++) out.body.push(_pL(_pP`M${cx - rx * 0.6 + i * rx * 0.3} ${cy - ry * 0.95}q${1.6} ${ry * 0.4} ${0.4} ${ry * 0.8}`, X.c[0], 2.2, 0.65)); }
      }
      if (calico) {
        if (c.pose === 'walk') { const [cx, cy, rx, ry] = g.body; out.body.push(_pF(_pE(cx - rx * 0.35, cy - ry * 0.35, rx * 0.32, ry * 0.5), X.b[0]), _pF(_pE(cx + rx * 0.25, cy - ry * 0.5, rx * 0.22, ry * 0.38), X.c[0])); }
        else if (c.pose === 'sit') { const [hx, hy, hrx, hry] = g.haunch; out.body.push(_pF(_pE(hx - hrx * 0.2, hy - hry * 0.3, hrx * 0.55, hry * 0.5), X.b[0], 1, _ptRot(-20, hx, hy)), _pF(_pE(g.torso[0] - 4, g.torso[1] - 8, 4.5, 6), X.c[0])); }
        else { const [cx, cy, rx, ry] = g.body; out.body.push(_pF(_pE(cx - rx * 0.3, cy - ry * 0.45, rx * 0.3, ry * 0.42), X.b[0]), _pF(_pE(cx + rx * 0.2, cy - ry * 0.55, rx * 0.2, ry * 0.32), X.c[0])); }
      }
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, t = fur;
      const back = [], head = [], front = [];
      const inner = points ? X.c[1] : _ptMix(_PTK_PINK, t[0], 0.25);
      if (fold) for (const side of [-1, 1]) back.push(_pF(_pP`M${x + side * r * 0.3} ${y - r * 0.82}Q${x + side * r * 0.95} ${y - r * 1.05} ${x + side * r * 0.92} ${y - r * 0.5}Q${x + side * r * 0.62} ${y - r * 0.62} ${x + side * r * 0.3} ${y - r * 0.82}z`, points ? X.c[0] : t[side < 0 ? 1 : 0]));
      else for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, 1.38, points ? X.c : t, inner, { in: 0.2, out: 0.88, tipX: 0.82 }));
      head.push(..._ptHeadShape(x, y, r, t, { fluff: fluffy, w: 1.1 }));
      if (m === 'tabby' && !points) head.push(_pL(_pP`M${x - r * 0.18} ${y - r * 0.88}L${x - r * 0.12} ${y - r * 0.55}M${x + r * 0.04} ${y - r * 0.92}L${x + r * 0.04} ${y - r * 0.56}M${x + r * 0.26} ${y - r * 0.88}L${x + r * 0.2} ${y - r * 0.55}`, X.c[0], r * 0.09, 0.7),
        _pL(_pP`M${x - r * 1.05} ${y + r * 0.12}L${x - r * 0.72} ${y + r * 0.16}M${x + r * 1.1} ${y + r * 0.12}L${x + r * 0.8} ${y + r * 0.16}`, X.c[0], r * 0.08, 0.6));
      if (points) head.push(_pF(_pE(x + r * 0.06, y + r * 0.38, r * 0.62, r * 0.5), X.c[0], 0.85), _pF(_pE(x + r * 0.06, y + r * 0.1, r * 0.4, r * 0.32), X.c[0], 0.4));
      if (calico) head.push(_pF(_pP`M${x - r * 1.05} ${y}Q${x - r * 1.05} ${y - r * 0.95} ${x - r * 0.2} ${y - r * 0.95}Q${x - r * 0.2} ${y - r * 0.2} ${x - r * 0.5} ${y + r * 0.05}z`, X.b[0]), _pF(_pE(x + r * 0.62, y - r * 0.58, r * 0.32, r * 0.24), X.c[0]));
      if (tux) head.push(_pF(_pP`M${x - r * 0.42} ${y + r * 0.22}Q${x + r * 0.06} ${y - r * 0.32} ${x + r * 0.54} ${y + r * 0.22}Q${x + r * 0.6} ${y + r * 0.86} ${x + r * 0.06} ${y + r * 0.92}Q${x - r * 0.48} ${y + r * 0.86} ${x - r * 0.42} ${y + r * 0.22}z`, white[0]));
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.2 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X, { slit: true });
      const nx = x + r * 0.07, ny = y + r * 0.34;
      front.push(..._ptBlush(eyesAt[0] - r * 0.08, eyesAt[1] + r * 0.06, y + r * 0.42, r * 0.17, 0.28));
      front.push(_pF(_pP`M${nx - r * 0.11} ${ny - r * 0.05}L${nx + r * 0.11} ${ny - r * 0.05}Q${nx} ${ny + r * 0.12} ${nx - r * 0.11} ${ny - r * 0.05}z`, points ? '#5a3a3a' : X.nose || '#e48a9a'));
      front.push(..._ptMouth(nx, ny + r * 0.16, r * 0.14, c.mood, { w: true }));
      front.push(..._ptWhiskers(nx, ny + r * 0.06, r, _ptLum(t[0]) < 0.35 ? '#f2eee8' : _ptMix(t[3], '#ffffff', 0.15), 0.7));
      return { back, head, eyes, front, eyesAt, hc: [x, y, r], top: [x + r * 0.05, y - r * 0.82, r * 1.25, 4], ear: [x - r * 0.62, y - r * 0.86, r * 0.26] };
    },
  });
}

/* ---------- the dog (eight breeds) ---------- */
const _PT_DOG = {
  lab: { hr: 15, bl: 1.05, bh: 1.05, leg: 1.05, sit: 1.08, ear: 'flop', earLen: 0.95, muzzle: 0.5, tail: 'otter' },
  corgi: { hr: 15.5, bl: 1.22, bh: 1.02, leg: 0.52, sit: 0.86, ear: 'big', muzzle: 0.44, tail: 'fluff', bib: true },
  dachshund: { hr: 14, bl: 1.42, bh: 0.86, leg: 0.48, sit: 0.94, ear: 'long', earLen: 1.25, muzzle: 0.56, tail: 'whip', ch: 0.86 },
  pug: { hr: 16, bl: 0.95, bh: 1.1, leg: 0.8, sit: 0.88, ear: 'fold', muzzle: 0.3, tail: 'curl', mask: true },
  husky: { hr: 15.5, bl: 1.08, bh: 1.05, leg: 1.12, sit: 1.1, ear: 'up', muzzle: 0.48, tail: 'plume', huskyMask: true },
  poodle: { hr: 13.5, bl: 0.98, bh: 0.95, leg: 1.18, sit: 1.08, ear: 'puff', muzzle: 0.4, tail: 'pom', curly: true },
  shiba: { hr: 15, bl: 1.02, bh: 1.0, leg: 1, sit: 1.0, ear: 'up', muzzle: 0.44, tail: 'shiba', urajiro: true },
  beagle: { hr: 15, bl: 1.05, bh: 1.0, leg: 0.92, sit: 0.98, ear: 'flop', earLen: 1.1, muzzle: 0.48, tail: 'flag', blaze: true },
};
function _ptDog(pet, pose, mood, X) {
  const B = _PT_DOG[pet.breed] || _PT_DOG.lab, m = pet.marks, fur = X.a, white = _ptTone('#fbf8f2');
  const beagleTri = pet.breed === 'beagle' && m === 'plain';
  const pawCol = m === 'socks' || B.bib && m !== 'plain' ? white[0] : (pet.breed === 'corgi' || pet.breed === 'husky' || beagleTri || pet.breed === 'shiba') ? X.b[0] : null;
  const spots = m === 'spots', saddle = m === 'saddle' || beagleTri;
  return _ptQuad(pet, pose, mood, X, {
    hr: B.hr, bl: B.bl, bh: B.bh, leg: B.leg, sit: B.sit, ch: B.ch || 1, legW: pet.breed === 'poodle' ? 5 : 6.2, pawCol, neck: pet.breed === 'dachshund' ? -2 : 0,
    belly: m === 'bib' || B.bib || pet.breed === 'husky' || pet.breed === 'shiba' || beagleTri ? X.b[0] : null,
    tail(c) {
      const [x, y] = c.g.tailRoot, out = [], tc = fur;
      const sit = c.pose === 'sit', sl = c.pose === 'sleep';
      switch (B.tail) {
        case 'fluff': out.push(_pF(_pE(x + 2, y - (sit ? 0 : 1), 5, 4.2), tc[0]), _pF(_pE(x + 1.4, y - 1.6, 3, 2), tc[2], 0.6)); break;
        case 'curl': out.push(_pL(sit ? _pP`M${x + 3} ${y - 3}q${-6} ${-2} ${-5} ${-8}q${2} ${-4} ${5} ${-1}` : _pP`M${x + 3} ${y}q${-5} ${-4} ${-2} ${-8}q${4} ${-3} ${5} ${2}`, tc[0], 4.6)); break;
        case 'plume': { const d = sit ? _pP`M${x + 3} ${y - 2}Q${x - 10} ${y - 4} ${x - 9} ${y - 14}Q${x - 6} ${y - 20} ${x} ${y - 16}` : sl ? _pP`M${x + 2} ${y}Q${x - 6} ${y + 8} ${x + 10} ${y + 9}Q${x + 24} ${y + 9} ${x + 34} ${y + 7}` : _pP`M${x + 3} ${y + 1}Q${x - 9} ${y - 2} ${x - 7} ${y - 13}Q${x - 3} ${y - 20} ${x + 5} ${y - 15}`; out.push(_pL(d, tc[0], 8), _pL(d, X.b[0], 3.6, 0.85)); break; }
        case 'shiba': { const d = sit ? _pP`M${x + 3} ${y - 4}Q${x - 6} ${y - 6} ${x - 4} ${y - 14}Q${x + 1} ${y - 19} ${x + 5} ${y - 12}` : _pP`M${x + 3} ${y}Q${x - 5} ${y - 4} ${x - 2} ${y - 12}Q${x + 4} ${y - 17} ${x + 8} ${y - 9}`; out.push(_pL(d, tc[0], 6.5), _pL(d, X.b[0], 2.4, 0.9)); break; }
        case 'pom': { const tip = sit ? [x - 7, y - 12] : [x - 6, y - 14]; out.push(_pL(_pP`M${x + 2} ${y}L${tip[0] + 1} ${tip[1] + 2}`, tc[0], 2.4), _pF(_pC(tip[0], tip[1], 5), tc[0]), _pF(_pC(tip[0] - 1.4, tip[1] - 1.6, 2.4), tc[2], 0.6)); break; }
        case 'flag': { const d = sit ? _pP`M${x + 3} ${y - 2}Q${x - 4} ${y - 6} ${x - 4} ${y - 16}` : _pP`M${x + 3} ${y}Q${x - 3} ${y - 6} ${x - 2} ${y - 17}`; out.push(_pL(d, tc[0], 4.2), _pL(sit ? _pP`M${x - 4} ${y - 13}L${x - 4} ${y - 16.5}` : _pP`M${x - 2.4} ${y - 14}L${x - 2} ${y - 17.5}`, white[0], 4.4)); break; }
        case 'whip': out.push(_pL(sit ? _pP`M${x + 3} ${y - 1}Q${x - 8} ${y + 1} ${x - 14} ${y - 3}` : sl ? _pP`M${x + 2} ${y}Q${x - 4} ${y + 6} ${x + 8} ${y + 8}` : _pP`M${x + 3} ${y}Q${x - 6} ${y - 3} ${x - 12} ${y - 8}`, tc[0], 3.2)); break;
        default: out.push(_pL(sit ? _pP`M${x + 3} ${y - 1}Q${x - 8} ${y + 2} ${x - 14} ${y - 1}` : sl ? _pP`M${x + 2} ${y}Q${x - 4} ${y + 8} ${x + 10} ${y + 9}` : _pP`M${x + 3} ${y}Q${x - 7} ${y + 1} ${x - 12} ${y - 7}`, tc[0], 5));
      }
      return out;
    },
    marks(c) {
      const g = c.g, out = { body: [] };
      if (B.curly) {
        const blobs = c.pose === 'walk' ? [[g.body[0] - g.body[2] * 0.5, g.body[1] - g.body[3] * 0.6], [g.body[0], g.body[1] - g.body[3] * 0.8], [g.body[0] + g.body[2] * 0.5, g.body[1] - g.body[3] * 0.6], [g.chest[0] + 2, g.chest[1]]]
          : c.pose === 'sit' ? [[g.torso[0] - 3, g.torso[1] - 8], [g.torso[0] + 2, g.torso[1] + 2], [g.haunch[0], g.haunch[1] - 4], [g.haunch[0] - 5, g.haunch[1] + 3]] : [[g.body[0] - 10, g.body[1] - 6], [g.body[0] + 2, g.body[1] - 8], [g.body[0] + 12, g.body[1] - 5]];
        for (const [bx, by] of blobs) out.body.push(_pF(_pC(bx, by, 4.2), fur[2], 0.45), _pL(_pP`M${bx - 2} ${by + 0.5}q${2} ${-2.4} ${4} ${0}`, fur[1], 0.8, 0.5));
      }
      if (spots) {
        const r0 = c.pose === 'walk' ? g.body : c.pose === 'sit' ? [g.torso[0] - 4, g.torso[1], 9, 14] : g.body;
        const pts = [[-0.5, -0.3], [-0.1, -0.6], [0.3, -0.2], [0.55, -0.55], [-0.3, 0.25], [0.15, 0.35], [-0.7, 0.1]];
        for (const [u, v] of pts) out.body.push(_pF(_pC(r0[0] + u * r0[2], r0[1] + v * r0[3], 1.6), X.c[0] === fur[0] ? '#2a2526' : X.c[0], 0.9));
      }
      if (saddle) {
        if (c.pose === 'walk') out.body.push(_pF(_pP`M${g.body[0] - g.body[2] * 0.75} ${g.body[1] - g.body[3] * 0.5}Q${g.body[0]} ${g.body[1] - g.body[3] * 1.3} ${g.body[0] + g.body[2] * 0.45} ${g.body[1] - g.body[3] * 0.7}Q${g.body[0]} ${g.body[1] + g.body[3] * 0.2} ${g.body[0] - g.body[2] * 0.75} ${g.body[1] - g.body[3] * 0.5}z`, beagleTri ? '#2f2a28' : X.c[0], 0.92));
        else if (c.pose === 'sit') out.body.push(_pF(_pE(g.haunch[0] - 1, g.haunch[1] - 5, g.haunch[2] * 0.62, g.haunch[3] * 0.55), beagleTri ? '#2f2a28' : X.c[0], 0.92, _ptRot(-25, g.haunch[0], g.haunch[1])));
        else out.body.push(_pF(_pE(g.body[0] - 4, g.body[1] - 5, g.body[2] * 0.55, g.body[3] * 0.55), beagleTri ? '#2f2a28' : X.c[0], 0.92));
      }
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, t = fur, back = [], head = [], front = [];
      const earT = beagleTri ? _ptTone('#7a4a28') : pet.breed === 'pug' ? _ptTone('#2f2a2a') : t;
      switch (B.ear) {
        case 'flop': case 'long': for (const side of [-1, 1]) back.push(..._ptEarFlop(x, y, r, side, B.earLen || 1, earT, { w: 0.42, at: 0.72 })); break;
        case 'big': for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, 1.62, t, _ptMix(_PTK_PINK, t[0], 0.35), { in: 0.12, out: 0.8, tipX: 0.92 })); break;
        case 'up': for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, 1.42, pet.breed === 'husky' && m !== 'plain' ? X.c : t, pet.breed === 'shiba' ? X.b[0] : _ptMix(_PTK_PINK, t[0], 0.4), { in: 0.18, out: 0.86, tipX: 0.8 })); break;
        case 'fold': for (const side of [-1, 1]) back.push(_pF(_pP`M${x + side * r * 0.42} ${y - r * 0.82}Q${x + side * r * 1.18} ${y - r * 0.92} ${x + side * r * 1.0} ${y - r * 0.3}Q${x + side * r * 0.86} ${y - r * 0.56} ${x + side * r * 0.42} ${y - r * 0.82}z`, earT[0])); break;
        case 'puff': for (const side of [-1, 1]) back.push(_pF(_pE(x + side * r * 0.92, y + r * 0.15, r * 0.42, r * 0.6), t[side < 0 ? 1 : 0]), _pF(_pC(x + side * r * 0.95, y - r * 0.05, r * 0.25), t[2], 0.45)); break;
        default: break;
      }
      head.push(..._ptHeadShape(x, y, r, t, { w: pet.breed === 'pug' ? 1.1 : 1.02, h: 0.96, jaw: 0.9 }));
      if (B.curly) for (let i = 0; i < 5; i++) { const a = Math.PI * (1.1 + i * 0.2); head.push(_pF(_pC(x + Math.cos(a) * r * 0.62, y - r * 0.55 + Math.sin(a) * r * 0.42, r * 0.36), t[0]), _pF(_pC(x + Math.cos(a) * r * 0.62 - 1, y - r * 0.6 + Math.sin(a) * r * 0.42, r * 0.16), t[2], 0.45)); }
      if (B.huskyMask || (m === 'mask' && !B.mask)) head.push(_pF(_pP`M${x - r * 0.95} ${y + r * 0.1}Q${x - r * 0.55} ${y - r * 0.32} ${x - r * 0.12} ${y - r * 0.2}L${x + r * 0.06} ${y - r * 0.72}L${x + r * 0.24} ${y - r * 0.2}Q${x + r * 0.7} ${y - r * 0.32} ${x + r * 1.0} ${y + r * 0.1}Q${x + r * 0.7} ${y + r * 1.0} ${x + r * 0.05} ${y + r * 0.98}Q${x - r * 0.65} ${y + r * 1.0} ${x - r * 0.95} ${y + r * 0.1}z`, B.huskyMask ? white[0] : X.b[0]));
      if (B.urajiro || B.bib) head.push(_pF(_pE(x - r * 0.52, y + r * 0.35, r * 0.36, r * 0.32), X.b[0]), _pF(_pE(x + r * 0.62, y + r * 0.35, r * 0.36, r * 0.32), X.b[0]));
      if (B.blaze || m === 'bib' || (pet.breed === 'corgi')) head.push(_pF(_pP`M${x + r * 0.02} ${y - r * 0.82}Q${x + r * 0.16} ${y - r * 0.3} ${x + r * 0.2} ${y + r * 0.2}L${x - r * 0.04} ${y + r * 0.2}Q${x - r * 0.04} ${y - r * 0.3} ${x + r * 0.02} ${y - r * 0.82}z`, white[0], 0.95));
      // the muzzle
      const mz = B.muzzle, mx = x + r * 0.08, my = y + r * 0.46;
      if (B.mask) head.push(_pF(_pP`M${mx - r * 0.46} ${my - r * 0.12}Q${mx - r * 0.48} ${my - r * 0.42} ${mx} ${my - r * 0.42}Q${mx + r * 0.48} ${my - r * 0.42} ${mx + r * 0.46} ${my - r * 0.12}Q${mx + r * 0.44} ${my + r * 0.3} ${mx} ${my + r * 0.3}Q${mx - r * 0.44} ${my + r * 0.3} ${mx - r * 0.46} ${my - r * 0.12}z`, '#3b3232'), _pF(_pE(mx - r * 0.18, my - r * 0.2, r * 0.14, r * 0.07), '#5a4c4a', 0.6), _pL(_pP`M${x - r * 0.28} ${y - r * 0.56}q${r * 0.3} ${-r * 0.14} ${r * 0.62} ${0}M${x - r * 0.16} ${y - r * 0.4}q${r * 0.2} ${-r * 0.08} ${r * 0.4} ${0}`, t[1], r * 0.06, 0.55));
      else head.push(_pF(_pE(mx, my, r * mz * 1.08, r * mz * 0.78), X.b[0]), _pF(_pE(mx + r * 0.12, my + r * 0.12, r * mz * 0.8, r * mz * 0.42), X.b[1], 0.3));
      const eyesAt = _ptEyeAt(x, y, r, { s: pet.breed === 'pug' ? 0.23 : 0.19, dy: -0.04 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X);
      if (pet.breed === 'husky' && !X.eye) { /* the auto eye is blue: petAutoEye */ }
      front.push(..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.12, y + r * 0.36, r * 0.15, 0.22));
      const nx = mx, ny = my - r * mz * 0.42;
      front.push(_pF(_pP`M${nx - r * 0.18} ${ny - r * 0.06}Q${nx} ${ny - r * 0.16} ${nx + r * 0.18} ${ny - r * 0.06}Q${nx + r * 0.16} ${ny + r * 0.12} ${nx} ${ny + r * 0.16}Q${nx - r * 0.16} ${ny + r * 0.12} ${nx - r * 0.18} ${ny - r * 0.06}z`, '#2b2326'), _pF(_pE(nx - r * 0.06, ny - r * 0.06, r * 0.06, r * 0.035), '#ffffff', 0.6));
      const mo = c.mood.mouth || 'smile';
      front.push(_pL(_pP`M${nx} ${ny + r * 0.16}L${nx} ${ny + r * 0.28}`, '#4a2a2e', r * 0.05, 0.8));
      if (mo === 'open') front.push(_pF(_pP`M${nx - r * 0.24} ${ny + r * 0.26}Q${nx} ${ny + r * 0.7} ${nx + r * 0.24} ${ny + r * 0.26}Q${nx} ${ny + r * 0.36} ${nx - r * 0.24} ${ny + r * 0.26}z`, '#5a2430'), _pF(_pE(nx + r * 0.02, ny + r * 0.5, r * 0.13, r * 0.14), '#f07a8c'));
      else front.push(..._ptMouth(nx, ny + r * 0.3, r * 0.2, c.mood, { w: true }));
      return { back, head, eyes, front, eyesAt, hc: [x, y, r], top: [x + r * 0.02, y - r * 0.84, r * 1.22, 3], ear: B.ear === 'flop' || B.ear === 'long' ? [x - r * 0.72, y - r * 0.62, r * 0.25] : [x - r * 0.6, y - r * 0.85, r * 0.25] };
    },
  });
}

/* ---------- the fox ---------- */
function _ptFox(pet, pose, mood, X) {
  const fur = X.a, m = pet.marks, big = m === 'bigears' || pet.coat === 'desert', white = X.b;
  const socks = m === 'socks' || (m === 'plain' && pet.coat === 'red');
  return _ptQuad(pet, pose, mood, X, {
    hr: 14.5, bl: 1.08, bh: 0.95, leg: 1.05, sit: 1.06, legW: 5.4, sock: socks ? X.c[0] : null,
    belly: white[0],
    tail(c) {
      const [x, y] = c.g.tailRoot, sit = c.pose === 'sit', sl = c.pose === 'sleep';
      const d = sit ? _pP`M${x + 4} ${y - 2}Q${x - 10} ${y - 2} ${x - 12} ${y - 12}Q${x - 13} ${y - 22} ${x - 4} ${y - 24}` : sl ? _pP`M${x + 3} ${y - 1}Q${x - 6} ${y + 8} ${x + 12} ${y + 9}Q${x + 28} ${y + 9} ${x + 40} ${y + 6}` : _pP`M${x + 4} ${y}Q${x - 8} ${y - 1} ${x - 14} ${y - 8}Q${x - 18} ${y - 14} ${x - 16} ${y - 18}`;
      const tip = sit ? [x - 4, y - 24] : sl ? [x + 40, y + 6] : [x - 16, y - 18];
      const out = [_pL(d, fur[0], 10), _pL(d, fur[2], 3, 0.35), _pF(_pC(tip[0], tip[1], 5.2), white[0])];
      if (m === 'frost') out.push(_pL(d, '#ffffff', 10, 0.18));
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [], front = [];
      for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, big ? 1.95 : 1.52, fur, white[0], { in: 0.16, out: big ? 1.0 : 0.86, tipX: big ? 1.05 : 0.85, back: X.c[0] }));
      head.push(_pF(_pP`M${x - r * 1.12} ${y - r * 0.05}Q${x - r * 1.06} ${y - r * 0.98} ${x} ${y - r * 0.98}Q${x + r * 1.06} ${y - r * 0.98} ${x + r * 1.12} ${y - r * 0.05}L${x + r * 1.28} ${y + r * 0.42}Q${x + r * 0.6} ${y + r * 0.6} ${x + r * 0.1} ${y + r * 1.02}Q${x - r * 0.5} ${y + r * 0.6} ${x - r * 1.22} ${y + r * 0.42}z`, fur[0]));
      head.push(_pF(_pE(x + r * 0.4, y + r * 0.4, r * 0.62, r * 0.4), fur[1], 0.3), _pF(_pE(x - r * 0.38, y - r * 0.5, r * 0.42, r * 0.22), fur[2], 0.5));
      head.push(_pF(_pP`M${x - r * 1.2} ${y + r * 0.42}Q${x - r * 0.6} ${y + r * 0.1} ${x - r * 0.14} ${y + r * 0.28}Q${x + r * 0.1} ${y + r * 0.18} ${x + r * 0.32} ${y + r * 0.28}Q${x + r * 0.8} ${y + r * 0.1} ${x + r * 1.26} ${y + r * 0.42}Q${x + r * 0.6} ${y + r * 0.6} ${x + r * 0.1} ${y + r * 1.02}Q${x - r * 0.5} ${y + r * 0.6} ${x - r * 1.2} ${y + r * 0.42}z`, white[0]));
      if (m === 'frost') head.push(_pF(_pE(x, y - r * 0.6, r * 0.6, r * 0.3), '#ffffff', 0.25));
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.19, dy: -0.06 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X, { slit: false });
      front.push(..._ptBlush(eyesAt[0] - r * 0.1, eyesAt[1] + r * 0.1, y + r * 0.36, r * 0.15, 0.25));
      const nx = x + r * 0.1, ny = y + r * 0.55;
      front.push(_pF(_pE(nx, ny, r * 0.14, r * 0.1), '#2b2326'), _pF(_pE(nx - r * 0.04, ny - r * 0.04, r * 0.05, r * 0.03), '#ffffff', 0.55));
      front.push(..._ptMouth(nx, ny + r * 0.2, r * 0.17, c.mood, { w: true }));
      return { back, head, eyes, front, eyesAt, hc: [x, y, r], top: [x + r * 0.02, y - r * 0.85, r * 1.2, 3], ear: [x - r * 0.62, y - r * 0.84, r * 0.24] };
    },
  });
}

/* ---------- the red panda ---------- */
function _ptRedPanda(pet, pose, mood, X) {
  const fur = X.a, dark = _ptTone(X.c[0]), white = X.b, m = pet.marks;
  return _ptQuad(pet, pose, mood, X, {
    hr: 15.5, bl: 1.02, bh: 1.05, leg: 0.88, sit: 1.0, legW: 6.2, legT: dark, pawCol: dark[1], belly: _ptMix(dark[0], fur[0], 0.3),
    tail(c) {
      const [x, y] = c.g.tailRoot, sit = c.pose === 'sit', sl = c.pose === 'sleep';
      const d = sit ? _pP`M${x + 4} ${y - 1}Q${x - 10} ${y} ${x - 12} ${y - 10}Q${x - 13} ${y - 20} ${x - 6} ${y - 23}` : sl ? _pP`M${x + 3} ${y - 1}Q${x - 6} ${y + 8} ${x + 12} ${y + 9}Q${x + 28} ${y + 9} ${x + 40} ${y + 6}` : _pP`M${x + 4} ${y}Q${x - 8} ${y} ${x - 14} ${y - 7}Q${x - 18} ${y - 13} ${x - 17} ${y - 18}`;
      return [_pL(d, fur[0], 9.5), { f: null, s: _ptMix(fur[0], '#f8d8b0', 0.55), w: 9.6, d, op: 1, cap: 'butt', dash: '3.4 3.6' }, _pL(d, fur[3], 2.4, 0.18)];
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [], front = [];
      for (const side of [-1, 1]) back.push(_pF(_pP`M${x + side * r * 0.3} ${y - r * 0.8}Q${x + side * r * 0.95} ${y - r * 1.38} ${x + side * r * 1.0} ${y - r * 0.48}Q${x + side * r * 0.7} ${y - r * 0.55} ${x + side * r * 0.3} ${y - r * 0.8}z`, white[0]),
        _pF(_pP`M${x + side * r * 0.42} ${y - r * 0.78}Q${x + side * r * 0.88} ${y - r * 1.12} ${x + side * r * 0.9} ${y - r * 0.56}Q${x + side * r * 0.68} ${y - r * 0.62} ${x + side * r * 0.42} ${y - r * 0.78}z`, dark[0]));
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.12, h: 0.92, fluff: true }));
      head.push(_pF(_pE(x - r * 0.42, y - r * 0.28, r * 0.24, r * 0.14), white[0], 0.95), _pF(_pE(x + r * 0.54, y - r * 0.28, r * 0.24, r * 0.14), white[0], 0.95));
      head.push(_pF(_pP`M${x - r * 0.58} ${y + r * 0.28}Q${x + r * 0.06} ${y + r * 0.02} ${x + r * 0.72} ${y + r * 0.28}Q${x + r * 0.72} ${y + r * 0.86} ${x + r * 0.06} ${y + r * 0.9}Q${x - r * 0.58} ${y + r * 0.86} ${x - r * 0.58} ${y + r * 0.28}z`, white[0]));
      if (m === 'tears' || m === 'plain') for (const xx of [x - r * 0.48, x + r * 0.6]) head.push(_pL(_pP`M${xx} ${y + r * 0.16}Q${xx + (xx < x ? -r * 0.06 : r * 0.06)} ${y + r * 0.42} ${xx + (xx < x ? r * 0.02 : -r * 0.02)} ${y + r * 0.66}`, _ptMix(fur[3], fur[0], 0.25), r * (m === 'tears' ? 0.11 : 0.08), m === 'tears' ? 0.85 : 0.5));
      if (m === 'bright') head.push(_pF(_pE(x + r * 0.06, y - r * 0.05, r * 0.4, r * 0.28), white[0], 0.5));
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.18, dy: 0.04 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X);
      const nx = x + r * 0.08, ny = y + r * 0.42;
      front.push(_pF(_pE(nx, ny, r * 0.15, r * 0.1), '#2b2326'), ..._ptMouth(nx, ny + r * 0.18, r * 0.16, c.mood, { w: true }));
      return { back, head, eyes, front, eyesAt, hc: [x, y, r], top: [x + r * 0.02, y - r * 0.8, r * 1.2, 3], ear: [x - r * 0.68, y - r * 0.76, r * 0.24] };
    },
  });
}

/* ---------- the dragon (rare) ---------- */
function _ptDragon(pet, pose, mood, X) {
  const fur = X.a, belly = X.b, m = pet.marks, wing = _ptTone(_ptMix(X.a[0], X.c[0], 0.5));
  const geo = _ptQuad(pet, pose, mood, X, {
    hr: 15.5, bl: 1.05, bh: 1.06, leg: 0.82, sit: 0.98, legW: 6.6, belly: belly[0],
    tail(c) {
      const [x, y] = c.g.tailRoot, sit = c.pose === 'sit', sl = c.pose === 'sleep';
      const d = sit ? _pP`M${x + 4} ${y - 1}Q${x - 8} ${y + 3} ${x - 13} ${y - 4}Q${x - 16} ${y - 10} ${x - 12} ${y - 14}` : sl ? _pP`M${x + 3} ${y - 1}Q${x - 6} ${y + 8} ${x + 12} ${y + 9}Q${x + 26} ${y + 9} ${x + 36} ${y + 7}` : _pP`M${x + 4} ${y}Q${x - 8} ${y + 2} ${x - 15} ${y - 6}Q${x - 18} ${y - 11} ${x - 15} ${y - 15}`;
      const tip = sit ? [x - 12, y - 14] : sl ? [x + 36, y + 7] : [x - 15, y - 15];
      const ang = sit ? -70 : sl ? 0 : -60;
      return [_pL(d, fur[0], 6.4), _pL(d, fur[2], 1.8, 0.4), _pF(_pP`M${tip[0]} ${tip[1] - 5}L${tip[0] + 4} ${tip[1] + 1}L${tip[0]} ${tip[1] + 4}L${tip[0] - 4} ${tip[1] + 1}z`, X.c[0], 1, _ptRot(ang + 70, tip[0], tip[1]))];
    },
    marks(c) {
      const g = c.g, out = { body: [], legsF: [] };
      // the wings: folded on the back, a little membrane fan
      const wx = c.pose === 'sit' ? g.torso[0] - 4 : g.body[0] - 2, wy = c.pose === 'sit' ? g.torso[1] - 10 : g.body[1] - g.body[3] * 0.9;
      const wingD = (s) => _pP`M${wx} ${wy}Q${wx - 6 * s} ${wy - 14 * s} ${wx - 16 * s} ${wy - 16 * s}Q${wx - 13 * s} ${wy - 9 * s} ${wx - 17 * s} ${wy - 6 * s}Q${wx - 11 * s} ${wy - 3 * s} ${wx - 13 * s} ${wy + 1 * s}Q${wx - 6 * s} ${wy + 2} ${wx} ${wy}z`;
      out.legsF.push(_pF(wingD(1.05), wing[1]));
      out.body.push(_pF(wingD(0.95), wing[0]), _pL(_pP`M${wx} ${wy}L${wx - 15} ${wy - 15}M${wx} ${wy}L${wx - 15} ${wy - 6}`, wing[3], 0.8, 0.5));
      // spikes along the back
      if (c.pose === 'walk') { const [cx, cy, rx, ry] = g.body; for (let i = 0; i < 4; i++) { const sx = cx - rx * 0.7 + i * rx * 0.42, sy = cy - ry * 0.98 + Math.abs(i - 1.5) * 0.9; out.body.push(_pF(_pP`M${sx - 2.4} ${sy + 1}L${sx} ${sy - 3.6}L${sx + 2.4} ${sy + 1}z`, X.c[0])); } }
      if (m === 'spots') { const r0 = c.pose === 'sit' ? [g.haunch[0], g.haunch[1], g.haunch[2], g.haunch[3]] : g.body; for (const [u, v] of [[-0.4, -0.3], [0.1, -0.5], [0.45, -0.2], [-0.1, 0.1]]) out.body.push(_pF(_pC(r0[0] + u * r0[2], r0[1] + v * r0[3], 1.5), X.c[0], 0.8)); }
      if (m === 'stripes') { const r0 = c.pose === 'sit' ? [g.haunch[0], g.haunch[1], g.haunch[2], g.haunch[3]] : g.body; for (const u of [-0.4, 0, 0.4]) out.body.push(_pL(_pP`M${r0[0] + u * r0[2]} ${r0[1] - r0[3] * 0.9}q1.5 ${r0[3] * 0.4} 0 ${r0[3] * 0.8}`, X.c[0], 1.8, 0.7)); }
      if (c.pose !== 'sleep') { const bx = c.pose === 'sit' ? g.torso[0] + 3.6 : g.chest[0], by = c.pose === 'sit' ? g.torso[1] : g.chest[1]; for (let i = -1; i <= 1; i++) out.body.push(_pL(_pP`M${bx - 3} ${by + i * 4}q3 1.2 6 0`, belly[1], 0.8, 0.6)); }
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [], front = [];
      for (const side of [-1, 1]) back.push(_pF(_pP`M${x + side * r * 0.35} ${y - r * 0.75}Q${x + side * r * 0.65} ${y - r * 1.25} ${x + side * r * 0.95} ${y - r * 1.4}Q${x + side * r * 0.82} ${y - r * 1.0} ${x + side * r * 0.62} ${y - r * 0.62}z`, '#f6eccf'));
      for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, 1.0, fur, null, { in: 0.6, out: 1.08, inY: 0.62, outY: 0.15, tipX: 1.2 }));
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.08, h: 0.95 }));
      head.push(_pF(_pE(x + r * 0.12, y + r * 0.5, r * 0.62, r * 0.38), belly[0]), _pF(_pE(x + r * 0.02, y + r * 0.42, r * 0.06, r * 0.04), fur[3], 0.8), _pF(_pE(x + r * 0.3, y + r * 0.42, r * 0.06, r * 0.04), fur[3], 0.8));
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.21, dy: -0.06 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X, { slit: true });
      front.push(..._ptBlush(eyesAt[0] - r * 0.1, eyesAt[1] + r * 0.1, y + r * 0.3, r * 0.15, 0.3));
      front.push(..._ptMouth(x + r * 0.14, y + r * 0.66, r * 0.2, c.mood));
      if (c.mood.extra === 'sparkle' || c.mood.mouth === 'open') front.push(_pF(_pC(x + r * 1.35, y + r * 0.5, r * 0.18), '#e8e4ec', 0.75), _pF(_pC(x + r * 1.62, y + r * 0.34, r * 0.13), '#e8e4ec', 0.6), _pF(_pC(x + r * 1.82, y + r * 0.2, r * 0.09), '#e8e4ec', 0.45));
      return { back, head, eyes, front, eyesAt, hc: [x, y, r], top: [x + r * 0.02, y - r * 0.86, r * 1.2, 3], ear: [x - r * 0.6, y - r * 0.82, r * 0.24] };
    },
  });
  return geo;
}

/* ---------- the unicorn (rare) ---------- */
const _PT_MANES = { rainbow: ['#f27a8a', '#f6b25a', '#f4dd6a', '#7fd1ae', '#7cb2ea', '#b39ce6'], pastel: ['#f6c6d6', '#f9dfb8', '#d6f0c8', '#c8e2f8', '#e2d4f8'], gold: ['#f4d67a', '#e8b84a', '#f8e6a8'], silver: ['#e8eaf0', '#c4c8d4', '#f8f9fc'] };
function _ptUnicorn(pet, pose, mood, X) {
  const fur = X.a, mane = _PT_MANES[pet.marks] || _PT_MANES.rainbow, hoof = _ptTone(_ptMix(X.c[0], '#8a7a9a', 0.4));
  return _ptQuad(pet, pose, mood, X, {
    hr: 15, bl: 1.08, bh: 1.0, leg: 1.25, sit: 1.0, legW: 5.4, pawCol: hoof[0], neck: 3, hx: 1,
    tail(c) {
      const [x, y] = c.g.tailRoot, sit = c.pose === 'sit', sl = c.pose === 'sleep', out = [];
      mane.forEach((col, i) => {
        const o = (i - mane.length / 2) * 1.6;
        const d = sit ? _pP`M${x + 4} ${y - 2 + o * 0.3}Q${x - 10} ${y - 2 + o} ${x - 12} ${y + 4 + o * 0.4}` : sl ? _pP`M${x + 3} ${y + o * 0.3}Q${x - 6} ${y + 8 + o * 0.5} ${x + 10} ${y + 9 + o * 0.3}` : _pP`M${x + 4} ${y + o * 0.3}Q${x - 8} ${y + o} ${x - 12} ${y + 12 + o * 0.6}`;
        out.push(_pL(d, col, 3.2));
      });
      return out;
    },
    marks(c) {
      const g = c.g, out = { body: [] };
      if (c.pose === 'walk') { const [nx, ny] = g.neck; mane.forEach((col, i) => out.body.push(_pL(_pP`M${nx - 4 + i * 0.6} ${ny - 7 + i * 1.6}q${-4} ${3} ${-3} ${7}`, col, 2.6))); }
      if (c.pose === 'sit') { const [tx, ty] = g.torso; mane.forEach((col, i) => out.body.push(_pL(_pP`M${tx - 2 + i * 0.6} ${ty - 12 + i * 1.6}q${-5} ${3} ${-4} ${8}`, col, 2.6))); }
      return out;
    },
    head(c) {
      const { hx: x, hy: y, hr: r } = c.g, back = [], head = [], front = [];
      for (const side of [-1, 1]) back.push(..._ptEarTri(x, y, r, side, 1.32, fur, _ptMix(_PTK_PINK, fur[0], 0.3), { in: 0.3, out: 0.84, tipX: 0.78 }));
      head.push(..._ptHeadShape(x, y, r, fur, { w: 1.02, h: 0.98 }));
      head.push(_pF(_pE(x + r * 0.12, y + r * 0.56, r * 0.56, r * 0.38), _ptMix(fur[0], '#f6c6d6', 0.35)), _pF(_pE(x - r * 0.04, y + r * 0.52, r * 0.06, r * 0.05), fur[3], 0.6), _pF(_pE(x + r * 0.3, y + r * 0.52, r * 0.06, r * 0.05), fur[3], 0.6));
      // the forelock and the horn
      mane.forEach((col, i) => head.push(_pF(_pP`M${x - r * 0.5 + i * r * 0.14} ${y - r * 0.9}Q${x - r * 0.62 + i * r * 0.14} ${y - r * 0.32} ${x - r * 0.88 + i * r * 0.16} ${y - r * 0.1}Q${x - r * 0.3 + i * r * 0.12} ${y - r * 0.42} ${x - r * 0.22 + i * r * 0.14} ${y - r * 0.92}z`, col)));
      head.push(_pF(_pP`M${x + r * 0.02} ${y - r * 0.82}L${x + r * 0.2} ${y - r * 1.95}L${x + r * 0.4} ${y - r * 0.8}z`, '#f6d77a'), _pL(_pP`M${x + r * 0.08} ${y - r * 1.05}L${x + r * 0.34} ${y - r * 1.2}M${x + r * 0.12} ${y - r * 1.38}L${x + r * 0.3} ${y - r * 1.5}`, '#d9a93a', r * 0.06, 0.9));
      const eyesAt = _ptEyeAt(x, y, r, { s: 0.2, dy: -0.06 });
      const eyes = _ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], c.mood, X);
      for (const ex of [eyesAt[0], eyesAt[1]]) eyes.push(_pL(_pP`M${ex - r * 0.18} ${eyesAt[2] - r * 0.2}l${-r * 0.08} ${-r * 0.08}M${ex + r * 0.02} ${eyesAt[2] - r * 0.25}l${0} ${-r * 0.1}`, _PTK_INK, r * 0.05, c.mood.eyes === 'closed' || c.mood.eyes === 'happy' ? 0 : 0.8));
      front.push(..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.1, y + r * 0.3, r * 0.16, 0.35));
      front.push(..._ptMouth(x + r * 0.12, y + r * 0.74, r * 0.16, c.mood));
      return { back, head, eyes, front, eyesAt, hc: [x, y, r], top: [x - r * 0.28, y - r * 0.82, r * 1.15, -6], ear: [x + r * 0.62, y - r * 0.82, r * 0.24] };
    },
  });
}

/* ---------- the rabbit ---------- */
function _ptRabbit(pet, pose, mood, X) {
  const fur = X.a, m = pet.marks, lop = pet.breed === 'lop', white = _ptTone('#fbf8f2');
  const parts = { legsF: [], tail: [], body: [], legsN: [], paw: [], neck: [], head: [], eyes: [], fx: [] };
  let hx, hy, r = 15.5, piv = {};
  if (pose === 'walk') {
    // mid-hop: long body, hind feet out behind, front paws reaching
    parts.legsF.push(_pF(_pE(64, 86.5, 3.4, 2.4), fur[1]), _pF(_pE(30, 88.5, 9, 2.6), fur[1]));
    parts.tail.push(_pF(_pC(22, 66, 5.4), white[0]), _pF(_pC(21, 64.6, 2.6), '#ffffff', 0.8));
    parts.body.push(..._ptBlob(42, 72, 18, 12.5, fur, -8), ..._ptBlob(31, 74, 10.5, 11, fur, 0, { light: false }));
    parts.legsN.push(_pF(_pE(34, 88.6, 10, 2.8), m === 'dutch' ? white[0] : fur[0]), _pF(_pE(36, 88.8, 7, 1.4), fur[1], 0.35));
    parts.paw.push(_pL(_pP`M58 78L61 88`, fur[0], 5), _pF(_pE(62, 88, 3.6, 2.3), m === 'dutch' ? white[0] : fur[0]));
    hx = 61; hy = 57; piv = { legsN: [34, 80], legsF: [34, 80], paw: [58, 78], tail: [24, 68] };
  } else if (pose === 'sleep') {
    parts.tail.push(_pF(_pC(24, 80, 5), white[0]));
    parts.body.push(..._ptBlob(46, 79, 23, 11.5, fur), ..._ptBlob(34, 79, 11, 10.5, fur, 0, { light: false, shadeOp: 0.25 }));
    parts.paw.push(_pF(_pE(62, 88.6, 5.4, 2.2), fur[0]));
    hx = 63; hy = 76; r = 14; piv = { tail: [26, 80], paw: [62, 88] };
  } else {
    // sitting up: a round loaf, the big hind foot in front, little front paws
    parts.tail.push(_pF(_pC(27, 82, 5.2), white[0]), _pF(_pC(26, 80.8, 2.6), '#ffffff', 0.8));
    parts.body.push(..._ptBlob(44, 76, 17, 14.5, fur), ..._ptBlob(53, 70, 10, 13, fur, 10, { light: false, shadeOp: 0.25 }));
    if (m !== 'plain' || pet.coat !== 'white') parts.body.push(_pF(_pE(55, 72, 6, 9), m === 'dutch' ? white[0] : X.b[0], 0.95, _ptRot(10, 55, 72)));
    parts.body.push(_pF(_pE(44, 88.5, 10, 2.8), m === 'dutch' ? white[0] : fur[0]), _pF(_pE(46, 89, 7.5, 1.3), fur[1], 0.35));
    parts.paw.push(_pL(_pP`M56 76L58 87`, fur[0], 4.6), _pF(_pE(59, 87.8, 3.2, 2.1), m === 'dutch' ? white[0] : fur[0]));
    parts.legsF.push(_pL(_pP`M61 75L63 87`, fur[1], 4.4), _pF(_pE(64, 87.6, 3, 2), fur[1]));
    hx = 56; hy = 48; piv = { tail: [29, 82], paw: [56, 76], legsN: [44, 80], legsF: [44, 80] };
  }
  if (m === 'spots') for (const [sx, sy] of pose === 'sit' ? [[38, 70], [44, 64], [34, 78], [47, 80]] : pose === 'walk' ? [[38, 66], [46, 64], [30, 72], [42, 76]] : [[40, 74], [50, 72], [32, 78]]) parts.body.push(_pF(_pC(sx, sy, 2), X.c[0], 0.85));
  const x = hx, y = hy, back = [];
  // the ears: upright (a little apart) or lop (down the sides)
  const earT = fur, inner = _ptMix(_PTK_PINK, fur[0], 0.2);
  // lop ears: long, from the crown, hanging well below the jaw with rounded ends (a dog's sit at the side of the head)
  if (lop) for (const side of [-1, 1]) {
    const ax = x + side * r * 0.42, ay = y - r * 0.82, ex = x + side * r * 1.18, ey = y + r * 0.95;
    back.push(_pF(_pP`M${ax - side * r * 0.2} ${ay}Q${x + side * r * 1.25} ${ay - r * 0.3} ${ex + side * r * 0.2} ${ey - r * 0.2}Q${ex + side * r * 0.12} ${ey + r * 0.32} ${ex - side * r * 0.22} ${ey + r * 0.2}Q${x + side * r * 0.82} ${y} ${ax - side * r * 0.2} ${ay}z`, earT[side < 0 ? 1 : 0]),
      _pF(_pP`M${ax} ${ay + r * 0.12}Q${x + side * r * 1.0} ${y - r * 0.3} ${ex} ${ey - r * 0.05}Q${x + side * r * 0.92} ${y} ${ax} ${ay + r * 0.12}z`, inner, 0.55));
  }
  else if (pose === 'sleep') for (const side of [-1, 1]) back.push(_pF(_pE(x - r * 0.6 - (side + 1) * 4, y - r * 0.5, r * 1.0, r * 0.32), earT[side < 0 ? 1 : 0], 1, _ptRot(-12, x - r * 0.6, y - r * 0.5)));
  else for (const side of [-1, 1]) {
    const ex = x + side * r * 0.32 - (pose === 'walk' ? 3 : 0), ey = y - r * 1.55, rot = side * 9 - (pose === 'walk' ? 18 : 0);
    back.push(_pF(_pE(ex, ey, r * 0.32, r * 0.95), earT[side < 0 ? 1 : 0], 1, _ptRot(rot, ex, ey)), _pF(_pE(ex, ey + r * 0.08, r * 0.16, r * 0.7), inner, 0.85, _ptRot(rot, ex, ey)));
  }
  const head = _ptHeadShape(x, y, r, fur, { w: 1.08, h: 0.92, jaw: 0.96 });
  if (m === 'dutch' || m === 'blaze') head.push(_pF(_pP`M${x - r * 0.04} ${y - r * 0.9}Q${x + r * 0.2} ${y - r * 0.2} ${x + r * 0.36} ${y + r * 0.2}Q${x + r * 0.5} ${y + r * 0.92} ${x + r * 0.06} ${y + r * 0.92}Q${x - r * 0.4} ${y + r * 0.92} ${x - r * 0.24} ${y + r * 0.2}Q${x - r * 0.16} ${y - r * 0.2} ${x - r * 0.04} ${y - r * 0.9}z`, white[0]));
  if (m === 'dutch') head.push(_pF(_pP`M${x - r * 1.08} ${y + r * 0.05}Q${x - r * 0.6} ${y + r * 0.25} ${x - r * 0.4} ${y + r * 0.9}L${x - r * 0.8} ${y + r * 0.6}z`, X.c[0] === fur[0] ? fur[1] : X.c[0], 0.0));
  head.push(_pF(_pE(x + r * 0.1, y + r * 0.46, r * 0.44, r * 0.3), X.b[0], 0.75));
  const eyesAt = _ptEyeAt(x, y, r, { s: 0.2, dy: -0.04 });
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], pose === 'sleep' ? Object.assign({}, mood, { eyes: 'closed' }) : mood, X));
  const nx = x + r * 0.1, ny = y + r * 0.36, front = [];
  front.push(..._ptBlush(eyesAt[0] - r * 0.1, eyesAt[1] + r * 0.1, y + r * 0.34, r * 0.17, 0.32));
  front.push(_pF(_pP`M${nx - r * 0.09} ${ny - r * 0.04}L${nx + r * 0.09} ${ny - r * 0.04}L${nx} ${ny + r * 0.07}z`, X.nose || '#ef8fa0'), _pL(_pP`M${nx} ${ny + r * 0.06}L${nx} ${ny + r * 0.16}M${nx} ${ny + r * 0.16}q${-r * 0.1} ${r * 0.08} ${-r * 0.16} ${0}M${nx} ${ny + r * 0.16}q${r * 0.1} ${r * 0.08} ${r * 0.16} ${0}`, '#6a3a40', r * 0.05, 0.85));
  if (mood.mouth === 'open') front.push(_pF(_pE(nx, ny + r * 0.3, r * 0.08, r * 0.07), '#6a2a34'));
  parts.head.push(...back, ...head, ...front);
  return { parts, order: ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'], piv: Object.assign({ head: [x, y + r * 0.8], eyes: [x, eyesAt[2]], body: [44, 90] }, piv),
    acc: { hc: [x, y, r], neck: { x: x - r * 0.02, y: y + r * 0.84, w: r * 1.0, rot: pose === 'sleep' ? 60 : 0 }, top: lop ? [x, y - r * 0.82, r * 1.2, 3] : [x, y - r * 0.82, r * 1.0, 3], eyes: eyesAt, ear: [x - r * 0.15, y - r * 0.95, r * 0.24] }, top: y - r * 2.6 };
}

/* ---------- small round ones: the hamster, the guinea pig, the hedgehog ---------- */
function _ptSmall(pet, pose, mood, X) {
  const sp = pet.species, fur = X.a, m = pet.marks, white = _ptTone('#fbf8f2');
  const parts = { legsF: [], tail: [], body: [], legsN: [], paw: [], neck: [], head: [], eyes: [], fx: [] };
  const sleep = pose === 'sleep', walk = pose === 'walk';
  let x, y, r, eyesAt, top, neck;
  if (sp === 'hedgehog') {
    // a dome of spines, a soft face peeking out at the front
    const spine = _ptTone(X.a[0]), tips = X.c[0], face = X.b;
    const cx = 44, cy = sleep ? 80 : walk ? 75 : 74, rx = sleep ? 25 : 24, ry = sleep ? 13 : walk ? 15 : 17;
    if (!sleep) for (const [fx0, side] of [[30, 1], [54, 1]]) parts.legsF.push(_pF(_pE(fx0 + 4, 88.6, 3.2, 2), face[1]));
    let d = `M${_ptR(cx - rx)} ${_ptR(cy + ry * 0.55)}`;
    const n = 15;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (1 + i / n), rr = i % 2 ? 1 : 1.16;
      d += `L${_ptR(cx + Math.cos(a) * rx * rr)} ${_ptR(cy + Math.sin(a) * ry * rr)}`;
    }
    d += `L${_ptR(cx + rx)} ${_ptR(cy + ry * 0.55)}Q${_ptR(cx)} ${_ptR(cy + ry * 0.95)} ${_ptR(cx - rx)} ${_ptR(cy + ry * 0.55)}z`;
    parts.body.push(_pF(d, spine[0]), _pF(_pE(cx + 2, cy + ry * 0.3, rx * 0.8, ry * 0.5), spine[1], 0.45));
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (1.08 + (i % 13) / 13 * 0.86), k = i < 13 ? 0.82 : 0.55, sx = cx + Math.cos(a) * rx * k, sy = cy + Math.sin(a) * ry * k;
      parts.body.push(_pL(_pP`M${sx} ${sy}l${Math.cos(a) * 3.4} ${Math.sin(a) * 3.4}`, i % 3 ? spine[3] : tips, 1, m === 'tips' ? 0.95 : 0.6));
    }
    if (m === 'tips' || pet.coat !== 'dark') for (let i = 0; i < 9; i++) { const a = Math.PI * (1.12 + i / 9 * 0.78); parts.body.push(_pF(_pC(cx + Math.cos(a) * rx * 1.04, cy + Math.sin(a) * ry * 1.04, 1.1), tips, 0.9)); }
    r = sleep ? 11 : 12;
    x = cx + rx * 0.72; y = sleep ? 81 : cy + ry * 0.18;
    const head = [_pF(_pP`M${x - r * 0.9} ${y - r * 0.6}Q${x - r * 0.2} ${y - r * 1.05} ${x + r * 0.55} ${y - r * 0.45}Q${x + r * 1.5} ${y + r * 0.05} ${x + r * 1.62} ${y + r * 0.32}Q${x + r * 1.2} ${y + r * 0.75} ${x + r * 0.2} ${y + r * 0.88}Q${x - r * 0.8} ${y + r * 0.8} ${x - r * 0.9} ${y - r * 0.6}z`, face[0]), _pF(_pE(x + r * 0.3, y + r * 0.45, r * 0.8, r * 0.35), face[1], 0.3)];
    head.push(..._ptEarRound(x - r * 0.25, y + r * 0.1, r, -1, 0.26, face, _ptMix(_PTK_PINK, face[0], 0.3)), ..._ptEarRound(x + r * 0.05, y + r * 0.15, r, 1, 0.24, face, _ptMix(_PTK_PINK, face[0], 0.3)));
    if (m === 'mask') head.push(_pF(_pE(x + r * 0.45, y - r * 0.05, r * 0.75, r * 0.32), '#4a3a32', 0.5));
    eyesAt = [x + r * 0.2, x + r * 0.78, y - r * 0.08, r * 0.17];
    parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], sleep ? Object.assign({}, mood, { eyes: 'closed' }) : mood, X));
    head.push(_pF(_pC(x + r * 1.62, y + r * 0.3, r * 0.18), X.nose || '#2a2124'), ..._ptBlush(x + r * 0.15, x + r * 0.95, y + r * 0.3, r * 0.15, 0.4), ..._ptMouth(x + r * 1.2, y + r * 0.58, r * 0.16, mood));
    parts.head.push(...head);
    if (!sleep) parts.paw.push(_pF(_pE(x + r * 0.6, 88.8, 3, 1.8), face[1]));
    top = [cx - 2, cy - ry * 1.05, 24, -6]; neck = { x: x - r * 0.35, y: y + r * 0.62, w: r * 1.1, rot: -30 };
    return { parts, order: ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'], piv: { head: [x - r * 0.5, y + r * 0.5], eyes: [x + r * 0.5, eyesAt[2]], body: [44, 90], paw: [x, 88], legsN: [44, 80], legsF: [44, 80], tail: [cx - rx, cy] },
      acc: { hc: [x, y, r], neck, top, eyes: eyesAt, ear: [x - r * 0.4, y - r * 0.55, r * 0.26] }, top: cy - ry * 1.2 };
  }
  // the hamster and the guinea pig: a soft loaf with a face
  const gp = sp === 'guinea';
  const cx = gp ? 44 : 47, cy = sleep ? 79 : gp ? 76 : (walk ? 77 : 70), rx = gp ? 25 : sleep ? 20 : walk ? 20 : 16, ry = gp ? 13.5 : sleep ? 11 : walk ? 12.5 : 19;
  if (!sleep) {
    const fc = gp ? _ptMix(fur[1], '#e8c0b0', 0.4) : _ptMix(_PTK_PINK, '#ffffff', 0.25);
    for (const fx0 of gp ? [cx - rx * 0.55, cx + rx * 0.5] : walk ? [cx - rx * 0.5, cx + rx * 0.45] : [cx - 8, cx + 6]) parts.legsF.push(_pF(_pE(fx0 + 3, 88.8, 3, 1.8), fc));
  }
  parts.body.push(..._ptBlob(cx, cy, rx, ry, fur));
  if (gp && (m === 'patches' || m === 'swirls')) parts.body.push(_pF(_pE(cx - rx * 0.4, cy - ry * 0.2, rx * 0.4, ry * 0.75), X.b[0]), _pF(_pE(cx + rx * 0.1, cy - ry * 0.4, rx * 0.25, ry * 0.5), X.c[0], 0.95));
  if (gp && m === 'swirls') for (const [sx, sy] of [[cx - rx * 0.5, cy - ry * 0.4], [cx, cy - ry * 0.6], [cx + rx * 0.4, cy - ry * 0.3]]) parts.body.push(_pL(_pP`M${sx - 2.5} ${sy}q${2.5} ${-3.4} ${5} ${0}q${-2.5} ${2.4} ${-2.5} ${-0.5}`, fur[3], 0.9, 0.55));
  if (!gp && m === 'banded') parts.body.push(_pF(_pE(cx - rx * 0.1, cy, rx * 0.35, ry * 0.97), '#fbf8f2', 0.95));
  if (!gp && m === 'panda') parts.body.push(_pF(_pE(cx - rx * 0.45, cy - ry * 0.1, rx * 0.5, ry * 0.85), '#2f2b2d', 0.95));
  parts.body.push(_pF(_pE(cx + rx * 0.25, cy + ry * 0.45, rx * 0.55, ry * 0.36), X.b[0], gp ? 0.7 : 0.95));
  if (!gp && !sleep && !walk) parts.paw.push(_pF(_pE(cx + 7, cy + 2, 2.6, 2), _ptMix(_PTK_PINK, '#ffffff', 0.25)), _pF(_pE(cx + 11, cy + 2.5, 2.4, 1.9), _ptMix(_PTK_PINK, '#ffffff', 0.35)));
  r = gp ? 13 : 13.5;
  x = gp ? cx + rx * 0.62 : (sleep || walk ? cx + rx * 0.55 : cx + 2); y = gp ? cy - ry * 0.12 : sleep ? 79 : walk ? cy - ry * 0.25 : cy - ry * 0.55;
  const back = [];
  if (gp) { back.push(_pF(_pE(x - r * 0.25, y + r * 0.05, r * 1.0, r * 0.92), fur[1], 0.55)); for (const side of [-1, 1]) back.push(_pF(_pP`M${x + side * r * 0.35} ${y - r * 0.72}Q${x + side * r * 0.9} ${y - r * 1.12} ${x + side * r * 1.08} ${y - r * 0.62}Q${x + side * r * 0.8} ${y - r * 0.42} ${x + side * r * 0.35} ${y - r * 0.72}z`, side < 0 ? fur[1] : _ptMix(fur[0], _PTK_PINK, 0.35))); }
  else for (const side of [-1, 1]) back.push(..._ptEarRound(x, y, r, side, 0.28, fur, _ptMix(_PTK_PINK, fur[0], 0.25)));
  const head = _ptHeadShape(x, y, r, fur, { w: gp ? 1.05 : 1.12, h: 0.9, jaw: 1 });
  if (gp && m === 'crest') head.push(_pF(_pE(x - r * 0.1, y - r * 0.72, r * 0.32, r * 0.2), '#fbf8f2'), _pL(_pP`M${x - r * 0.3} ${y - r * 0.72}q${r * 0.2} ${-r * 0.2} ${r * 0.4} ${0}`, '#e8e0d4', 0.8, 0.9));
  if (gp && m !== 'plain') head.push(_pF(_pE(x + r * 0.5, y - r * 0.15, r * 0.4, r * 0.55), X.b[0], 0.9));
  if (!gp) head.push(_pF(_pE(x - r * 0.62, y + r * 0.42, r * 0.42, r * 0.34), X.b[0]), _pF(_pE(x + r * 0.78, y + r * 0.42, r * 0.42, r * 0.34), X.b[0]));
  head.push(_pF(_pE(x + r * 0.1, y + r * 0.5, r * 0.4, r * 0.3), X.b[0], 0.9));
  eyesAt = _ptEyeAt(x, y, r, { s: gp ? 0.19 : 0.2, dy: -0.06 });
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], sleep ? Object.assign({}, mood, { eyes: 'closed' }) : mood, X));
  const nx = x + r * 0.1, ny = y + r * 0.34;
  head.push(..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.12, y + r * 0.36, r * 0.18, 0.4));
  head.push(_pF(_pE(nx, ny, r * 0.1, r * 0.07), X.nose || '#e88a9a'), ..._ptMouth(nx, ny + r * 0.15, r * 0.13, mood, { w: true }));
  head.push(..._ptWhiskers(nx, ny + r * 0.05, r * 0.9, _ptMix(fur[3], '#ffffff', 0.3), 0.5));
  if (!gp && (mood.extra === 'hearts' || mood.mouth === 'open')) head.push(_pF(_pE(x - r * 0.62, y + r * 0.45, r * 0.5, r * 0.4), X.b[0]), _pF(_pE(x + r * 0.78, y + r * 0.45, r * 0.5, r * 0.4), X.b[0]));
  parts.head.push(...back, ...head);
  return { parts, order: ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'], piv: { head: [x, y + r * 0.8], eyes: [x, eyesAt[2]], body: [cx, 90], paw: [cx + 8, cy + 2], legsN: [cx, 84], legsF: [cx, 84], tail: [cx - rx, cy] },
    acc: { hc: [x, y, r], neck: { x: x - r * 0.04, y: y + r * 0.82, w: r * 1.1, rot: gp || walk || sleep ? -20 : 0 }, top: [x + r * 0.02, y - r * 0.78, r * 1.15, 3], eyes: eyesAt, ear: [x - r * 0.6, y - r * 0.72, r * 0.24] }, top: y - r * 1.4 };
}

/* ---------- birds: the owl, the parrot, the duck, the phoenix ---------- */
function _ptBird(pet, pose, mood, X) {
  const sp = pet.species, m = pet.marks, sleep = pose === 'sleep', walk = pose === 'walk';
  const parts = { legsF: [], tail: [], body: [], legsN: [], paw: [], neck: [], head: [], eyes: [], fx: [] };
  const feet = sp === 'duck' ? (X.nose || '#f08a3c') : sp === 'phoenix' ? '#e8a42c' : '#c8a07a';
  const md = sleep ? Object.assign({}, mood, { eyes: 'closed' }) : mood;
  let x, y, r, eyesAt, top, neck, ear, piv;
  if (sp === 'owl') {
    const a = X.a, b = X.b, cx = 50, cy = sleep ? 72 : 66, rx = 19, ry = sleep ? 19 : 22;
    if (!sleep) parts.legsF.push(..._ptOwlFoot(44, 88.6, feet), ..._ptOwlFoot(55, 88.8, feet));
    parts.body.push(..._ptBlob(cx, cy, rx, ry, a));
    parts.body.push(_pF(_pE(cx + 3, cy + 6, rx * 0.62, ry * 0.62), b[0]));
    if (m === 'spots' || pet.coat === 'snowy' || pet.coat === 'barn') for (const [u, v] of [[-0.2, 0.05], [0.2, 0.15], [0, 0.4], [0.35, 0.45], [-0.25, 0.5]]) parts.body.push(_pF(_pE(cx + 3 + u * rx, cy + 6 + v * ry, 1.1, 1.4), X.c[0], pet.coat === 'snowy' ? 0.8 : 0.5));
    if (m === 'bars' || pet.coat === 'eagle' || pet.coat === 'tawny') for (let i = 0; i < 4; i++) parts.body.push(_pL(_pP`M${cx - 4} ${cy + 2 + i * 4.6}q${7} ${2} ${14} ${0}`, X.c[0], 0.9, 0.5));
    // the wings at the sides (the near one can wave)
    parts.legsN.push(_pF(_pP`M${cx - rx * 0.92} ${cy - ry * 0.3}Q${cx - rx * 1.25} ${cy + ry * 0.4} ${cx - rx * 0.62} ${cy + ry * 0.92}Q${cx - rx * 0.62} ${cy + ry * 0.1} ${cx - rx * 0.92} ${cy - ry * 0.3}z`, a[1]));
    parts.paw.push(_pF(_pP`M${cx + rx * 0.82} ${cy - ry * 0.3}Q${cx + rx * 1.18} ${cy + ry * 0.4} ${cx + rx * 0.66} ${cy + ry * 0.86}Q${cx + rx * 0.62} ${cy + ry * 0.1} ${cx + rx * 0.82} ${cy - ry * 0.3}z`, _ptMix(a[0], a[1], 0.4)), _pL(_pP`M${cx + rx * 0.85} ${cy}q${2} ${6} ${-1} ${11}`, a[3], 0.8, 0.5));
    r = 17; x = cx + 1; y = cy - ry * 0.62 + (sleep ? 3 : 0);
    const head = [];
    if (m === 'tufts' || pet.coat === 'eagle') for (const side of [-1, 1]) head.push(_pF(_pP`M${x + side * r * 0.45} ${y - r * 0.62}L${x + side * r * 0.9} ${y - r * 1.32}L${x + side * r * 0.86} ${y - r * 0.5}z`, a[side < 0 ? 1 : 0]));
    head.push(..._ptHeadShape(x, y, r, a, { w: 1.12, h: 0.9 }));
    // the facial disc
    head.push(_pF(_pP`M${x} ${y - r * 0.55}Q${x - r * 0.25} ${y - r * 0.88} ${x - r * 0.62} ${y - r * 0.7}Q${x - r * 1.0} ${y - r * 0.4} ${x - r * 0.9} ${y + r * 0.12}Q${x - r * 0.62} ${y + r * 0.7} ${x} ${y + r * 0.82}Q${x + r * 0.62} ${y + r * 0.7} ${x + r * 0.9} ${y + r * 0.12}Q${x + r * 1.0} ${y - r * 0.4} ${x + r * 0.62} ${y - r * 0.7}Q${x + r * 0.25} ${y - r * 0.88} ${x} ${y - r * 0.55}z`, pet.coat === 'barn' ? '#fdfaf3' : b[0]));
    eyesAt = [x - r * 0.42, x + r * 0.42, y - r * 0.02, r * 0.26];
    for (const ex of [eyesAt[0], eyesAt[1]]) head.push(_pF(_pC(ex, eyesAt[2], r * 0.33), _ptMix(b[0], a[1], 0.35), 0.5));
    parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
    head.push(_pF(_pP`M${x - r * 0.12} ${y + r * 0.2}L${x + r * 0.12} ${y + r * 0.2}L${x} ${y + r * 0.5}z`, '#e2a43a'), ..._ptBlush(eyesAt[0], eyesAt[1], y + r * 0.42, r * 0.15, 0.3));
    parts.head.push(...head);
    top = [x, y - r * 0.8, r * 1.25, 3]; neck = { x, y: y + r * 0.85, w: r * 1.1, rot: 0 }; ear = [x - r * 0.75, y - r * 0.55, r * 0.24];
    piv = { head: [x, y + r * 0.8], eyes: [x, eyesAt[2]], paw: [cx + rx * 0.82, cy - ry * 0.3], legsN: [cx - rx * 0.9, cy - ry * 0.3], legsF: [50, 88], tail: [cx, cy + ry], body: [50, 90] };
  } else if (sp === 'duck') {
    const a = X.a, b = X.b, cx = 44, cy = sleep ? 79 : 74, rx = 21, ry = sleep ? 11.5 : 12.5;
    if (!sleep) { parts.legsF.push(..._ptWebFoot(48, 89, feet, 0.9)); parts.legsN.push(..._ptWebFoot(41, 89.4, feet, 1)); }
    parts.tail.push(_pF(_pP`M${cx - rx * 0.8} ${cy - ry * 0.3}L${cx - rx * 1.22} ${cy - ry * 1.15}Q${cx - rx * 1.0} ${cy - ry * 0.2} ${cx - rx * 0.7} ${cy + ry * 0.3}z`, a[1]));
    if (pet.coat === 'mallard') parts.tail.push(_pL(_pP`M${cx - rx * 1.0} ${cy - ry * 0.7}q${-2} ${-3} ${1} ${-4}`, '#2a2a2a', 1.2));
    parts.body.push(..._ptBlob(cx, cy, rx, ry, a));
    parts.paw.push(_pF(_pP`M${cx - rx * 0.62} ${cy - ry * 0.55}Q${cx} ${cy - ry * 0.95} ${cx + rx * 0.45} ${cy - ry * 0.2}Q${cx} ${cy + ry * 0.55} ${cx - rx * 0.62} ${cy - ry * 0.55}z`, pet.coat === 'mallard' ? '#8a7a68' : a[1], 0.9), _pL(_pP`M${cx - rx * 0.4} ${cy - ry * 0.3}q${8} ${1} ${14} ${5}`, a[3], 0.8, 0.4));
    if (pet.coat === 'mallard') parts.paw.push(_pF(_pE(cx - rx * 0.2, cy - ry * 0.15, 3, 1.6), '#3a5ab0', 0.9));
    r = 13.5; x = cx + rx * 0.72; y = sleep ? cy - ry * 0.4 : cy - ry - r * 0.55;
    if (!sleep) parts.body.push(_pF(_pE(x - 2, cy - ry * 0.6, 6.5, 9), pet.coat === 'mallard' ? '#2f7048' : a[0], 1, _ptRot(12, x - 2, cy - ry * 0.6)));
    const head = [];
    head.push(..._ptHeadShape(x, y, r, pet.coat === 'mallard' ? _ptTone('#2f7048') : pet.coat === 'cayuga' ? _ptTone('#2f4a40') : a, { w: 1.02, h: 0.98 }));
    if (m === 'tuft') head.push(_pF(_pP`M${x - r * 0.2} ${y - r * 0.92}Q${x - r * 0.1} ${y - r * 1.5} ${x + r * 0.25} ${y - r * 1.35}Q${x} ${y - r * 1.15} ${x + r * 0.15} ${y - r * 0.92}z`, a[0]));
    if (m === 'ring' || pet.coat === 'mallard') parts.neck.push(_pL(_pP`M${x - r * 0.75} ${y + r * 0.82}Q${x} ${y + r * 1.12} ${x + r * 0.65} ${y + r * 0.82}`, '#fbf8f2', 1.6));
    eyesAt = _ptEyeAt(x, y, r, { s: 0.19, dy: -0.12 });
    parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
    const bill = X.nose || '#f08a3c';
    head.push(_pF(_pP`M${x - r * 0.42} ${y + r * 0.22}Q${x + r * 0.05} ${y + r * 0.02} ${x + r * 0.62} ${y + r * 0.2}Q${x + r * 0.78} ${y + r * 0.45} ${x + r * 0.5} ${y + r * 0.62}Q${x + r * 0.05} ${y + r * 0.72} ${x - r * 0.42} ${y + r * 0.52}Q${x - r * 0.55} ${y + r * 0.36} ${x - r * 0.42} ${y + r * 0.22}z`, bill));
    head.push(_pL(_pP`M${x - r * 0.38} ${y + r * 0.42}Q${x + r * 0.1} ${y + r * 0.5} ${x + r * 0.6} ${y + r * 0.4}`, _ptMix(bill, '#000000', 0.3), r * 0.05, 0.6), _pF(_pE(x - r * 0.05, y + r * 0.28, r * 0.05, r * 0.03), _ptMix(bill, '#000000', 0.4), 0.7), ..._ptBlush(eyesAt[0] - r * 0.15, eyesAt[1] + r * 0.12, y + r * 0.22, r * 0.14, 0.3));
    if (mood.mouth === 'open') head.push(_pF(_pE(x + r * 0.1, y + r * 0.56, r * 0.3, r * 0.1), '#c0503a', 0.7));
    parts.head.push(...head);
    top = [x, y - r * 0.85, r * 1.15, 3]; neck = { x: x - r * 0.06, y: y + r * 0.86, w: r * 1.0, rot: 0 }; ear = [x - r * 0.62, y - r * 0.72, r * 0.24];
    piv = { head: [x - r * 0.2, y + r * 0.9], eyes: [x, eyesAt[2]], paw: [cx - rx * 0.6, cy - ry * 0.5], legsN: [44, 82], legsF: [48, 82], tail: [cx - rx * 0.8, cy], body: [44, 90] };
  } else {
    // the parrot and the phoenix: perched upright, a long tail, a hooked beak
    const ph = sp === 'phoenix', a = X.a, b = X.b, c3 = X.c;
    const cx = 50, cy = sleep ? 70 : 64, rx = 14, ry = sleep ? 17 : 19;
    if (!sleep) parts.legsF.push(..._ptPerchFoot(46, 88.5, feet), ..._ptPerchFoot(54, 88.8, feet));
    // the tail feathers: long, down and behind
    const tl = ph ? (m === 'plume' ? 1.35 : 1.1) : 1;
    const tails = ph ? [[a[0], -8], [b[0], 0], [c3[0], 8], [a[1], 14]] : sp === 'parrot' && pet.coat === 'macaw' ? [[a[0], -6], [c3[0], 4], [b[0], 12]] : [[a[1], -6], [c3[0] === '#2a3a1a' ? a[0] : c3[0], 4], [a[0], 12]];
    tails.forEach(([col, dx]) => parts.tail.push(_pF(_pP`M${cx - 6} ${cy + ry * 0.4}Q${cx - 14 + dx * 0.3} ${cy + ry * 0.9 + 6 * tl} ${cx - 20 + dx * 0.4} ${cy + ry + 14 * tl}Q${cx - 12 + dx * 0.4} ${cy + ry + 8 * tl} ${cx - 2} ${cy + ry * 0.55}z`, col, 0.95)));
    if (ph) for (const k of [0, 1, 2]) parts.tail.push(_pF(_pP`M${cx - 18 - k * 4} ${cy + ry + 10 * tl + k * 2}q${-3} ${-5} ${-1} ${-10}q${1} ${5} ${4} ${6}z`, k % 2 ? b[0] : X.c[0], 0.9));
    // sparks: a few embers drifting up around it
    if (ph && m === 'sparks') for (const [sx, sy, sr] of [[cx - 22, cy - 6, 3.6], [cx + 18, cy - 14, 2.8], [cx - 14, cy - 22, 2.4], [cx + 22, cy + 6, 3], [cx - 26, cy + 10, 2.2]]) parts.fx.push(_pF(_ptStar(sx, sy, sr, sr * 0.36, 4), '#f6c03a'), _pF(_pC(sx, sy, sr * 0.3), '#fff6d0', 0.9));
    parts.body.push(..._ptBlob(cx, cy, rx, ry, a, -8));
    parts.body.push(_pF(_pE(cx + 3, cy + 4, rx * 0.6, ry * 0.68), b[0], ph ? 0.85 : 0.95, _ptRot(-8, cx + 3, cy + 4)));
    if (sp === 'parrot' && (pet.coat === 'budgie' || pet.coat === 'blue')) for (let i = 0; i < 4; i++) parts.body.push(_pL(_pP`M${cx - 8} ${cy - 12 + i * 3.2}q${3} ${-1.4} ${6} ${0}`, '#2a2a2a', 0.9, 0.6));
    // the wing on the near side (waves for the high five)
    parts.paw.push(_pF(_pP`M${cx - rx * 0.7} ${cy - ry * 0.45}Q${cx - rx * 1.25} ${cy + ry * 0.3} ${cx - rx * 0.95} ${cy + ry * 1.05}Q${cx - rx * 0.2} ${cy + ry * 0.55} ${cx - rx * 0.05} ${cy - ry * 0.25}Q${cx - rx * 0.35} ${cy - ry * 0.55} ${cx - rx * 0.7} ${cy - ry * 0.45}z`, sp === 'parrot' && pet.coat === 'macaw' ? b[0] : a[1]));
    if (sp === 'parrot' && pet.coat === 'macaw') parts.paw.push(_pF(_pP`M${cx - rx * 1.0} ${cy + ry * 0.4}Q${cx - rx * 0.95} ${cy + ry * 1.0} ${cx - rx * 0.95} ${cy + ry * 1.05}Q${cx - rx * 0.5} ${cy + ry * 0.75} ${cx - rx * 0.4} ${cy + ry * 0.45}z`, c3[0]));
    if (ph) for (let i = 0; i < 3; i++) parts.paw.push(_pF(_pP`M${cx - rx * (1.05 + i * 0.05)} ${cy + ry * (0.5 + i * 0.22)}q${-3} ${1} ${-5} ${4}q${3} ${-1} ${6} ${-1}z`, i % 2 ? b[0] : X.c[0], 0.9));
    parts.paw.push(_pL(_pP`M${cx - rx * 0.6} ${cy - ry * 0.1}q${-2} ${8} ${-3} ${16}`, a[3], 0.8, 0.4));
    r = 14; x = cx + 3; y = cy - ry * 0.85 + (sleep ? 3 : 0);
    const headT = sp === 'parrot' && (pet.coat === 'budgie' || pet.coat === 'cockatiel') ? b : sp === 'parrot' && pet.coat === 'blue' ? _ptTone('#f4f6f8') : sp === 'parrot' && pet.coat === 'lovebird' ? _ptTone('#f4a27c') : sp === 'parrot' && pet.coat === 'conure' ? _ptTone('#f9d548') : a;
    const head = [];
    if (ph || m === 'crest' || pet.coat === 'cockatiel') {
      const cc = ph ? [X.c[0], b[0], a[0]] : [headT[0], headT[1], headT[0]];
      cc.forEach((col, i) => head.push(_pF(_pP`M${x - r * 0.1 + i * r * 0.2} ${y - r * 0.78}Q${x - r * 0.5 + i * r * 0.25} ${y - r * (1.7 - i * 0.12)} ${x - r * (0.9 - i * 0.2)} ${y - r * (1.9 - i * 0.2)}Q${x - r * 0.05 + i * r * 0.2} ${y - r * 1.4} ${x + r * 0.2 + i * r * 0.2} ${y - r * 0.78}z`, col)));
    }
    head.push(..._ptHeadShape(x, y, r, headT, { w: 1.02, h: 0.98 }));
    if (sp === 'parrot' && pet.coat === 'macaw') head.push(_pF(_pE(x - r * 0.42, y + r * 0.08, r * 0.38, r * 0.42), '#f8f2ea'));
    if (sp === 'parrot' && (pet.coat === 'cockatiel' || m === 'cheeks')) head.push(_pF(_pC(x + r * 0.62, y + r * 0.38, r * 0.24), pet.coat === 'cockatiel' ? X.c[0] : '#f08a9a', 0.9));
    if (sp === 'parrot' && (pet.coat === 'budgie' || pet.coat === 'blue')) head.push(_pF(_pC(x - r * 0.12, y + r * 0.82, r * 0.08), '#2a2a2a', 0.8), _pF(_pC(x + r * 0.32, y + r * 0.82, r * 0.08), '#2a2a2a', 0.8), _pF(_pE(x + r * 0.62, y + r * 0.62, r * 0.12, r * 0.18), '#5a6ad0', 0.85));
    eyesAt = _ptEyeAt(x, y, r, { s: 0.19, dy: -0.1 });
    if (sp === 'parrot') for (const ex of [eyesAt[0], eyesAt[1]]) head.push(_pF(_pC(ex, eyesAt[2], r * 0.27), '#fbf8f2', 0.9));
    parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], md, X));
    const bkT = _ptTone(ph ? '#f2b33d' : X.nose || '#e8c87a'), bx = x + r * 0.1, byy = y + r * 0.26;
    if (sp === 'parrot' && (pet.coat === 'budgie' || pet.coat === 'blue')) head.push(_pF(_pE(bx + r * 0.02, byy - r * 0.04, r * 0.2, r * 0.09), pet.coat === 'blue' ? '#c8a07a' : '#5a6ad0'));
    head.push(_pF(_pP`M${bx - r * 0.18} ${byy}Q${bx + r * 0.12} ${byy - r * 0.08} ${bx + r * 0.26} ${byy + r * 0.14}Q${bx + r * 0.3} ${byy + r * 0.36} ${bx + r * 0.12} ${byy + r * 0.48}Q${bx + r * 0.14} ${byy + r * 0.3} ${bx - r * 0.02} ${byy + r * 0.28}Q${bx - r * 0.2} ${byy + r * 0.22} ${bx - r * 0.18} ${byy}z`, bkT[0]), _pF(_pE(bx + r * 0.02, byy + r * 0.3, r * 0.12, r * 0.07), sp === 'parrot' && pet.coat === 'macaw' ? '#2a2526' : bkT[1]), _pF(_pE(bx - r * 0.04, byy + r * 0.06, r * 0.06, r * 0.035), '#ffffff', 0.5));
    head.push(..._ptBlush(eyesAt[0] - r * 0.14, eyesAt[1] + r * 0.16, y + r * 0.28, r * 0.13, 0.3));
    parts.head.push(...head);
    top = [x, y - r * 0.85, r * 1.15, 3]; neck = { x, y: y + r * 0.86, w: r * 1.0, rot: 0 }; ear = [x - r * 0.62, y - r * 0.7, r * 0.24];
    piv = { head: [x, y + r * 0.85], eyes: [x, eyesAt[2]], paw: [cx - rx * 0.4, cy - ry * 0.4], legsN: [50, 84], legsF: [50, 84], tail: [cx - 6, cy + ry * 0.4], body: [50, 90] };
  }
  return { parts, order: ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'], piv, acc: { hc: [x, y, r], neck, top, eyes: eyesAt, ear }, top: Math.min(y - r * 1.6, 30), bird: true };
}
const _ptOwlFoot = (x, y, col) => [0, 1, 2].map(i => _pL(_pP`M${x} ${y - 3}L${x - 2 + i * 2} ${y}`, col, 1.6));
const _ptPerchFoot = (x, y, col) => [_pL(_pP`M${x} ${y - 5}L${x} ${y - 1}`, col, 1.6), _pL(_pP`M${x - 2.4} ${y}L${x + 2.4} ${y}`, col, 1.6)];
const _ptWebFoot = (x, y, col, s) => [_pL(_pP`M${x} ${y - 6 * s}L${x} ${y - 1.5}`, _ptMix(col, '#000000', 0.15), 1.5), _pF(_pP`M${x - 1.5} ${y - 1.6}L${x + 5 * s} ${y - 1.2}L${x + 4.6 * s} ${y + 0.6}Q${x + 2} ${y + 0.2} ${x - 1.5} ${y + 0.6}z`, col)];

/* ---------- the tortoise ---------- */
function _ptTortoise(pet, pose, mood, X) {
  const shell = X.a, skin = X.b, pat = X.c, m = pet.marks, sleep = pose === 'sleep', walk = pose === 'walk';
  const parts = { legsF: [], tail: [], body: [], legsN: [], paw: [], neck: [], head: [], eyes: [], fx: [] };
  const cx = 44, cy = 76, rx = 23, ry = sleep ? 13 : 15;
  if (!sleep) { parts.legsF.push(_pL(_pP`M${cx - 10} ${cy + 6}L${cx - 9} ${88}`, skin[1], 6), _pL(_pP`M${cx + 14} ${cy + 6}L${cx + 15} ${88}`, skin[1], 6)); }
  parts.tail.push(_pF(_pP`M${cx - rx + 2} ${cy + 6}L${cx - rx - 5} ${cy + 9}L${cx - rx + 3} ${cy + 10}z`, skin[0]));
  parts.body.push(_pF(_pP`M${cx - rx} ${cy + ry * 0.55}Q${cx - rx * 1.05} ${cy - ry * 1.1} ${cx} ${cy - ry * 1.15}Q${cx + rx * 1.05} ${cy - ry * 1.1} ${cx + rx} ${cy + ry * 0.55}z`, shell[0]));
  parts.body.push(_pF(_pE(cx + 4, cy + ry * 0.2, rx * 0.8, ry * 0.42), shell[1], 0.4), _pF(_pE(cx - 8, cy - ry * 0.65, rx * 0.36, ry * 0.2), shell[2], 0.5));
  // the scutes
  const sc = pet.coat === 'star' ? pat[0] : shell[3];
  for (const [u, v, s] of [[-0.42, -0.25, 0.3], [0, -0.48, 0.3], [0.42, -0.25, 0.3], [-0.2, 0.18, 0.26], [0.22, 0.18, 0.26]]) {
    const px = cx + u * rx, py = cy + v * ry * 1.2, rr = s * rx * 0.62;
    const hex = [0, 1, 2, 3, 4, 5].map(i => [px + Math.cos(i * Math.PI / 3) * rr, py + Math.sin(i * Math.PI / 3) * rr * 0.62]);
    parts.body.push(_pL(_pPoly(hex), sc, 1.1, pet.coat === 'star' ? 0.9 : 0.5));
    if (pet.coat === 'star') for (let i = 0; i < 6; i++) parts.body.push(_pL(_pP`M${px} ${py}l${Math.cos(i * Math.PI / 3) * rr * 0.8} ${Math.sin(i * Math.PI / 3) * rr * 0.5}`, pat[0], 0.8, 0.8));
    if (m === 'spots' || pet.coat === 'leopard') parts.body.push(_pF(_pC(px, py, 1.4), pat[0], 0.85));
    if (m === 'rings') parts.body.push(_pL(_pE(px, py, rr * 0.55, rr * 0.36), shell[2], 0.8, 0.8));
  }
  parts.body.push(_pF(_pP`M${cx - rx - 1} ${cy + ry * 0.45}Q${cx} ${cy + ry * 0.95} ${cx + rx + 1} ${cy + ry * 0.45}L${cx + rx} ${cy + ry * 0.75}Q${cx} ${cy + ry * 1.2} ${cx - rx} ${cy + ry * 0.75}z`, _ptMix(skin[0], shell[0], 0.4)));
  if (!sleep) { parts.legsN.push(_pL(_pP`M${cx - 14} ${cy + 8}L${cx - 15} ${88.6}`, skin[0], 6.4), _pF(_pE(cx - 14.4, 88.6, 4, 1.6), skin[0])); parts.paw.push(_pL(_pP`M${cx + 10} ${cy + 8}L${cx + 11} ${88.6}`, skin[0], 6.4), _pF(_pE(cx + 11.6, 88.6, 4, 1.6), skin[0])); }
  const r = 11.5, x = cx + rx + (sleep ? 3 : 7), y = sleep ? 83 : walk ? cy - 4 : cy - 6;
  if (!sleep) parts.neck.push(_pF(_pE(x - 7, y + 6, 6, 5.2), skin[0], 1, _ptRot(-30, x - 7, y + 6)));
  const head = _ptHeadShape(x, y, r, skin, { w: 1.08, h: 0.92 });
  const eyesAt = _ptEyeAt(x, y, r, { s: 0.22, dy: -0.08 });
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], sleep ? Object.assign({}, mood, { eyes: 'closed' }) : mood, X));
  head.push(..._ptBlush(eyesAt[0] - r * 0.12, eyesAt[1] + r * 0.12, y + r * 0.35, r * 0.18, 0.35), ..._ptMouth(x + r * 0.08, y + r * 0.45, r * 0.3, mood));
  head.push(_pF(_pC(x - r * 0.0, y + r * 0.22, r * 0.04), skin[3], 0.6), _pF(_pC(x + r * 0.18, y + r * 0.22, r * 0.04), skin[3], 0.6));
  parts.head.push(...head);
  return { parts, order: ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'], piv: { head: [x - r * 0.6, y + r * 0.6], eyes: [x, eyesAt[2]], paw: [cx + 10, cy + 8], legsN: [cx, cy + 8], legsF: [cx, cy + 8], tail: [cx - rx, cy + 8], body: [cx, 90] },
    acc: { hc: [x, y, r], neck: { x: x - r * 0.3, y: y + r * 0.82, w: r * 1.0, rot: -20 }, top: [x, y - r * 0.82, r * 1.05, 4], eyes: eyesAt, ear: [x - r * 0.62, y - r * 0.7, r * 0.26] }, top: cy - ry * 1.3 };
}

/* ---------- the axolotl ---------- */
function _ptAxolotl(pet, pose, mood, X) {
  const a = X.a, b = X.b, g = X.c, m = pet.marks, sleep = pose === 'sleep';
  const parts = { legsF: [], tail: [], body: [], legsN: [], paw: [], neck: [], head: [], eyes: [], fx: [] };
  const cx = 42, cy = sleep ? 82 : 79, by = cy;
  parts.legsF.push(_pL(_pP`M${cx - 10} ${by + 3}L${cx - 12} ${88.5}`, a[1], 3.2), _pL(_pP`M${cx + 12} ${by + 3}L${cx + 13} ${88.5}`, a[1], 3.2));
  // the tail with its fin
  parts.tail.push(_pF(_pP`M${cx - 12} ${by - 6}Q${cx - 30} ${by - 14} ${cx - 38} ${by - 4}Q${cx - 30} ${by + 2} ${cx - 12} ${by + 6}z`, b[0], 0.9), _pF(_pP`M${cx - 10} ${by - 4}Q${cx - 26} ${by - 8} ${cx - 34} ${by - 3}Q${cx - 26} ${by + 1} ${cx - 10} ${by + 5}z`, a[0]));
  parts.body.push(..._ptBlob(cx, by, 15, 8, a));
  if (m === 'speckled' || m === 'freckles') for (const [u, v] of [[-8, -3], [-2, -5], [4, -3], [-6, 2], [6, 1], [-22, -3], [-16, 0]]) parts.body.push(_pF(_pC(cx + u, by + v, m === 'freckles' ? 0.9 : 1.3), m === 'freckles' ? '#c0606a' : _ptMix(a[0], '#3a2a2a', 0.5), 0.7));
  parts.legsN.push(_pL(_pP`M${cx - 6} ${by + 4}L${cx - 8} ${88.8}`, a[0], 3.4), _pF(_pE(cx - 8.5, 88.8, 2.4, 1.2), a[0]));
  parts.paw.push(_pL(_pP`M${cx + 9} ${by + 4}L${cx + 10} ${88.8}`, a[0], 3.4), _pF(_pE(cx + 10.5, 88.8, 2.4, 1.2), a[0]));
  const r = 15, x = cx + 22, y = sleep ? 78 : 70;
  const head = [];
  // the gills: three feathery fronds each side
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const ang = (side < 0 ? 200 : -20) + (i - 1) * 32 * (side < 0 ? -1 : 1), a0 = ang * Math.PI / 180;
    const bx0 = x + side * r * 0.86, by0 = y - r * 0.18 + (i - 1) * r * 0.32, ex = bx0 + Math.cos(a0) * r * 0.8, ey = by0 + Math.sin(a0) * r * 0.8;
    head.push(_pL(_pP`M${bx0} ${by0}L${ex} ${ey}`, g[side < 0 ? 1 : 0], 2.4));
    for (let k = 1; k <= 3; k++) { const fx = bx0 + (ex - bx0) * k / 3.4, fy = by0 + (ey - by0) * k / 3.4; head.push(_pF(_pE(fx, fy, 1.6, 1.1), g[side < 0 ? 1 : 0], 0.9)); }
  }
  head.push(..._ptHeadShape(x, y, r, a, { w: 1.12, h: 0.78, jaw: 1 }));
  const eyesAt = [x - r * 0.48, x + r * 0.56, y - r * 0.12, r * 0.15];
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], sleep ? Object.assign({}, mood, { eyes: 'closed' }) : mood, X));
  head.push(..._ptBlush(eyesAt[0] - r * 0.05, eyesAt[1] + r * 0.05, y + r * 0.22, r * 0.17, 0.4));
  const mo = mood.mouth === 'open' ? [_pF(_pP`M${x - r * 0.4} ${y + r * 0.22}Q${x + r * 0.05} ${y + r * 0.68} ${x + r * 0.5} ${y + r * 0.22}Q${x + r * 0.05} ${y + r * 0.34} ${x - r * 0.4} ${y + r * 0.22}z`, '#8a3a4a')] : [_pL(_pP`M${x - r * 0.38} ${y + r * 0.22}Q${x + r * 0.06} ${y + r * 0.5} ${x + r * 0.5} ${y + r * 0.22}`, _ptMix(a[3], '#5a2a3a', 0.5), r * 0.06)];
  head.push(...mo);
  parts.head.push(...head);
  return { parts, order: ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'], piv: { head: [x - r * 0.4, y + r * 0.6], eyes: [x, eyesAt[2]], paw: [cx + 9, by + 4], legsN: [cx, by + 4], legsF: [cx, by + 4], tail: [cx - 12, by], body: [cx, 90] },
    acc: { hc: [x, y, r], neck: { x: x - r * 0.4, y: y + r * 0.72, w: r * 0.9, rot: -15 }, top: [x, y - r * 0.68, r * 1.15, 3], eyes: eyesAt, ear: [x + r * 0.55, y - r * 0.6, r * 0.24] }, top: y - r * 1.4 };
}

/* ---------- the frog ---------- */
function _ptFrog(pet, pose, mood, X) {
  const a = X.a, b = X.b, m = pet.marks, sleep = pose === 'sleep', walk = pose === 'walk';
  const parts = { legsF: [], tail: [], body: [], legsN: [], paw: [], neck: [], head: [], eyes: [], fx: [] };
  const toes = pet.coat === 'tree' ? X.c[0] : a[1];
  const cx = 48, cy = sleep ? 80 : walk ? 76 : 74;
  // the big folded back leg, the body, the front legs
  if (walk) { parts.legsF.push(_pL(_pP`M${cx - 10} ${cy + 2}L${cx - 22} ${cy + 8}L${cx - 30} ${88}`, a[1], 5.4), _pF(_pE(cx - 31, 88.6, 4.4, 1.6), toes)); }
  parts.body.push(..._ptBlob(cx, cy, 16, sleep ? 10 : 12.5, a));
  parts.body.push(_pF(_pE(cx + 4, cy + 4, 10, 7), b[0], 0.9));
  if (m === 'spots' || pet.coat === 'blue' || pet.coat === 'yellow') for (const [u, v] of [[-8, -6], [-1, -9], [6, -6], [-10, 1]]) parts.body.push(_pF(_pE(cx + u, cy + v, 2, 1.7), X.c[0], 0.85));
  if (m === 'stripe') parts.body.push(_pL(_pP`M${cx - 14} ${cy - 4}Q${cx - 4} ${cy - 13} ${cx + 8} ${cy - 10}`, b[0], 2.4, 0.9));
  if (pet.coat === 'toad') for (const [u, v] of [[-9, -4], [-3, -7], [3, -6], [-6, 1], [7, -2]]) parts.body.push(_pF(_pC(cx + u, cy + v, 1.1), a[1], 0.8));
  if (!walk) parts.legsN.push(_pF(_pE(cx - 8, cy + (sleep ? 4 : 7), 9, sleep ? 5 : 7), a[0]), _pF(_pE(cx - 7, cy + (sleep ? 5 : 8), 6, 3.6), a[1], 0.35), _pF(_pE(cx - 2, 88.6, 6, 1.7), toes));
  else parts.legsN.push(_pL(_pP`M${cx - 8} ${cy + 4}L${cx - 18} ${cy + 10}L${cx - 24} ${88.4}`, a[0], 5.6), _pF(_pE(cx - 25, 88.8, 4.6, 1.6), toes));
  if (!sleep) parts.paw.push(_pL(_pP`M${cx + 9} ${cy + 3}L${cx + 11} ${88}`, a[0], 3.8), _pF(_pE(cx + 12.4, 88.6, 3.6, 1.4), toes));
  if (!sleep) parts.legsF.push(_pL(_pP`M${cx + 14} ${cy + 2}L${cx + 16} ${87.6}`, a[1], 3.4), _pF(_pE(cx + 17.4, 88.2, 3.2, 1.3), _ptMix(toes, '#000000', 0.15)));
  const r = 14, x = cx + 8, y = sleep ? cy - 7 : cy - 13;
  const head = [];
  // the eye bumps on top
  for (const [ex, side] of [[x - r * 0.48, -1], [x + r * 0.5, 1]]) head.push(_pF(_pC(ex, y - r * 0.55, r * 0.42), a[side < 0 ? 1 : 0]));
  head.push(_pF(_pE(x, y, r * 1.18, r * 0.72), a[0]), _pF(_pE(x + r * 0.3, y + r * 0.35, r * 0.85, r * 0.32), a[1], 0.3), _pF(_pE(x - r * 0.4, y - r * 0.3, r * 0.5, r * 0.18), a[2], 0.4));
  const eyesAt = [x - r * 0.48, x + r * 0.5, y - r * 0.55, r * 0.27];
  for (const ex of [eyesAt[0], eyesAt[1]]) head.push(_pF(_pC(ex, eyesAt[2], r * 0.34), '#fbf8f2'));
  parts.eyes.push(..._ptEyes(eyesAt[0], eyesAt[1], eyesAt[2], eyesAt[3], sleep ? Object.assign({}, mood, { eyes: 'closed' }) : mood, X));
  head.push(..._ptBlush(x - r * 0.75, x + r * 0.8, y + r * 0.08, r * 0.2, 0.45));
  head.push(mood.mouth === 'open' ? _pF(_pP`M${x - r * 0.62} ${y + r * 0.12}Q${x} ${y + r * 0.72} ${x + r * 0.66} ${y + r * 0.12}Q${x} ${y + r * 0.28} ${x - r * 0.62} ${y + r * 0.12}z`, '#8a3a4a') : _pL(_pP`M${x - r * 0.62} ${y + r * 0.12}Q${x} ${y + r * 0.52} ${x + r * 0.66} ${y + r * 0.12}`, _ptMix(a[3], '#2a1a1a', 0.4), r * 0.07));
  head.push(_pF(_pC(x - r * 0.08, y - r * 0.08, r * 0.04), a[3], 0.7), _pF(_pC(x + r * 0.16, y - r * 0.08, r * 0.04), a[3], 0.7));
  parts.head.push(...head);
  return { parts, order: ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'], piv: { head: [x, y + r * 0.7], eyes: [x, eyesAt[2]], paw: [cx + 9, cy + 3], legsN: [cx - 8, cy + 4], legsF: [cx - 8, cy + 4], tail: [cx, cy], body: [cx, 90] },
    acc: { hc: [x, y, r], neck: { x, y: y + r * 0.7, w: r * 1.3, rot: 0 }, top: [x + r * 0.02, y - r * 0.82, r * 1.0, 2], eyes: eyesAt, ear: [x - r * 0.95, y - r * 0.6, r * 0.24] }, top: y - r * 1.2 };
}

/* ---------- the robot (rare) ---------- */
function _ptRobot(pet, pose, mood, X) {
  const a = X.a, b = X.b, c3 = X.c, m = pet.marks, sleep = pose === 'sleep';
  const parts = { legsF: [], tail: [], body: [], legsN: [], paw: [], neck: [], head: [], eyes: [], fx: [] };
  const cx = 48, cy = 74;
  // one big wheel and a tread, a box body, an arm each side, a screen face, an antenna
  parts.legsF.push(_pF(_pE(cx + 8, 85.4, 5, 4.6), _ptMix(c3[0], '#000000', 0.2)));
  parts.legsN.push(_pF(_pC(cx - 3, 84.6, 5.4), '#3a3d44'), _pF(_pC(cx - 3, 84.6, 2.6), '#9aa2ae'), _pL(_pP`M${cx - 3} ${80}L${cx - 3} ${89.2}M${cx - 7.6} ${84.6}L${cx + 1.6} ${84.6}`, '#5a5e68', 0.8, 0.8));
  parts.body.push(_pF(_pP`M${cx - 12} ${cy - 8}Q${cx - 12} ${cy - 12} ${cx - 8} ${cy - 12}L${cx + 10} ${cy - 12}Q${cx + 14} ${cy - 12} ${cx + 14} ${cy - 8}L${cx + 13} ${cy + 6}Q${cx + 13} ${cy + 9} ${cx + 10} ${cy + 9}L${cx - 9} ${cy + 9}Q${cx - 12} ${cy + 9} ${cx - 12} ${cy + 6}z`, a[0]));
  parts.body.push(_pF(_pP`M${cx + 6} ${cy - 12}L${cx + 10} ${cy - 12}Q${cx + 14} ${cy - 12} ${cx + 14} ${cy - 8}L${cx + 13} ${cy + 6}Q${cx + 13} ${cy + 9} ${cx + 10} ${cy + 9}L${cx + 6} ${cy + 9}z`, a[1], 0.5));
  parts.body.push(_pF(_pC(cx + 1, cy - 2, 4), b[0]), _pL(_pP`M${cx + 1} ${cy - 2}L${cx + 3} ${cy - 4.4}`, c3[0], 1.1), _pF(_pC(cx - 7, cy + 4, 1.2), '#f0473e'), _pF(_pC(cx - 3.6, cy + 4, 1.2), '#f4cf4a'), _pF(_pC(cx - 0.2, cy + 4, 1.2), '#3fae6a'));
  if (m === 'stripe') parts.body.push(_pF(_pP`M${cx - 4} ${cy - 12}L${cx} ${cy - 12}L${cx - 2} ${cy + 9}L${cx - 6} ${cy + 9}z`, c3[0], 0.8));
  if (m === 'bolts') for (const [u, v] of [[-10, -10], [12, -10], [-10, 7], [11, 7]]) parts.body.push(_pF(_pC(cx + u, cy + v, 0.9), '#5a5e68'));
  parts.legsN.push(_pL(_pP`M${cx - 12} ${cy - 4}Q${cx - 18} ${cy} ${cx - 16} ${cy + 5}`, '#7a808c', 1.8), _pF(_pC(cx - 16, cy + 6, 2), b[0]));
  parts.paw.push(_pL(_pP`M${cx + 14} ${cy - 4}Q${cx + 20} ${cy} ${cx + 18} ${cy + 5}`, '#7a808c', 1.8), _pF(_pC(cx + 18, cy + 6, 2), b[0]));
  const x = cx + 2, y = cy - 26, w = 34, h = 25;
  const head = [];
  head.push(_pL(_pP`M${x} ${y - h / 2}L${x - 1} ${y - h / 2 - 7}`, '#7a808c', 1.4), _pF(_pC(x - 1, y - h / 2 - 8.5, 2.6), sleep ? '#a8a0a0' : '#f0473e'), _pF(_pC(x - 1.8, y - h / 2 - 9.3, 0.9), '#ffffff', 0.8));
  head.push(_pF(_pE(x - w / 2 - 1.5, y, 2.6, 4.2), b[1]), _pF(_pE(x + w / 2 + 1.5, y, 2.6, 4.2), b[0]));
  head.push(_pF(_pP`M${x - w / 2} ${y - h / 2 + 5}Q${x - w / 2} ${y - h / 2} ${x - w / 2 + 5} ${y - h / 2}L${x + w / 2 - 5} ${y - h / 2}Q${x + w / 2} ${y - h / 2} ${x + w / 2} ${y - h / 2 + 5}L${x + w / 2} ${y + h / 2 - 5}Q${x + w / 2} ${y + h / 2} ${x + w / 2 - 5} ${y + h / 2}L${x - w / 2 + 5} ${y + h / 2}Q${x - w / 2} ${y + h / 2} ${x - w / 2} ${y + h / 2 - 5}z`, a[0]));
  head.push(_pF(_pP`M${x - w / 2 + 3} ${y - h / 2 + 2}L${x + w / 2 - 6} ${y - h / 2 + 2}`, a[2], 0.0), _pL(_pP`M${x - w / 2 + 4} ${y - h / 2 + 2.4}L${x + 4} ${y - h / 2 + 2.4}`, a[2], 1.2, 0.6));
  // the screen
  const sw = w - 8, sh = h - 9, scr = '#1e2a32';
  head.push(_pF(_pP`M${x - sw / 2 + 3} ${y - sh / 2 + 1}L${x + sw / 2 - 3} ${y - sh / 2 + 1}Q${x + sw / 2} ${y - sh / 2 + 1} ${x + sw / 2} ${y - sh / 2 + 4}L${x + sw / 2} ${y + sh / 2 - 2}Q${x + sw / 2} ${y + sh / 2 + 1} ${x + sw / 2 - 3} ${y + sh / 2 + 1}L${x - sw / 2 + 3} ${y + sh / 2 + 1}Q${x - sw / 2} ${y + sh / 2 + 1} ${x - sw / 2} ${y + sh / 2 - 2}L${x - sw / 2} ${y - sh / 2 + 4}Q${x - sw / 2} ${y - sh / 2 + 1} ${x - sw / 2 + 3} ${y - sh / 2 + 1}z`, scr));
  const glow = X.eye && X.eye !== petAutoEye({ species: 'robot' }) ? X.eye : '#7ff0f0';
  const eyesAt = [x - 6, x + 6, y + 0.5, 3];
  const k = sleep ? 'closed' : mood.eyes || 'open';
  if (k === 'open' || k === 'sparkle' || k === 'wink') {
    parts.eyes.push(_pF(_pE(eyesAt[0], eyesAt[2], 2.2, 3), glow), k === 'wink' ? _pL(_pP`M${eyesAt[1] - 2.4} ${eyesAt[2] + 0.6}Q${eyesAt[1]} ${eyesAt[2] - 2.6} ${eyesAt[1] + 2.4} ${eyesAt[2] + 0.6}`, glow, 1.3) : _pF(_pE(eyesAt[1], eyesAt[2], 2.2, 3), glow));
    if (k === 'sparkle') parts.eyes.push(_pF(_ptStar(eyesAt[0], eyesAt[2], 2.4, 0.9, 4), '#ffffff', 0.9), _pF(_ptStar(eyesAt[1], eyesAt[2], 2.4, 0.9, 4), '#ffffff', 0.9));
  } else for (const ex of [eyesAt[0], eyesAt[1]]) parts.eyes.push(k === 'happy' ? _pL(_pP`M${ex - 2.4} ${eyesAt[2] + 0.8}Q${ex} ${eyesAt[2] - 2.8} ${ex + 2.4} ${eyesAt[2] + 0.8}`, glow, 1.3) : _pL(_pP`M${ex - 2.4} ${eyesAt[2]}L${ex + 2.4} ${eyesAt[2]}`, glow, 1.3));
  head.push(_pF(_pE(x - 9, y + 4.6, 2.2, 1.1), '#f08fb3', 0.55), _pF(_pE(x + 9, y + 4.6, 2.2, 1.1), '#f08fb3', 0.55));
  if (mood.mouth === 'open') head.push(_pF(_pP`M${x - 2.6} ${y + 4.6}Q${x} ${y + 8.4} ${x + 2.6} ${y + 4.6}z`, glow));
  else head.push(_pL(_pP`M${x - 2.4} ${y + 5}Q${x} ${y + 7} ${x + 2.4} ${y + 5}`, glow, 0.9));
  parts.head.push(...head);
  return { parts, order: ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'], piv: { head: [x, y + h / 2], eyes: [x, eyesAt[2]], paw: [cx + 14, cy - 4], legsN: [cx - 3, 84.6], legsF: [cx + 8, 85], tail: [cx, cy], body: [cx, 90] },
    acc: { hc: [x, y, (w + h) / 4], neck: { x: x - 1, y: y + h / 2 + 1.6, w: 18, rot: 0 }, top: [x, y - h / 2 + 1, w * 0.7, 0], eyes: [eyesAt[0], eyesAt[1], eyesAt[2], 2.6], ear: [x - w / 2 + 2, y - h / 2 + 2, 4] }, top: y - h / 2 - 12, robot: true };
}

/* ---------- the registry ---------- */
const _PT_ART = { cat: _ptCat, dog: _ptDog, fox: _ptFox, redpanda: _ptRedPanda, dragon: _ptDragon, unicorn: _ptUnicorn, rabbit: _ptRabbit,
  hamster: _ptSmall, guinea: _ptSmall, hedgehog: _ptSmall, owl: _ptBird, duck: _ptBird, parrot: _ptBird, phoenix: _ptBird,
  tortoise: _ptTortoise, axolotl: _ptAxolotl, frog: _ptFrog, robot: _ptRobot };

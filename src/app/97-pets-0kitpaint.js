/* ============================================================
   PETS, the Painted village (Nov 2026). The owner: the figures must reach the opening scenes' bar (70-scene-lib-animals-cat.js,
   the scene kit's dog and duck). In the garden's Painted village style (and nowhere else: a pet card keeps its own drawing):
     - every four-legged pet stands in the scene kit's proportions: a smaller head, a longer body, longer, finer legs (_ptPaintK); its
       breed, coat, marks and accessories are drawn exactly as before, on that frame
     - its coat carries a painted texture: short strokes along the lie of the fur, lit along the back, in shade under the belly and on
       the far side (_ptPaintFur), the way the scene kit's animals are brushed
     - the duck is redrawn side on, the way the scene kit's ducks are: a long boat of a body, the tail cocked, a folded wing of layered
       feathers, the neck and a flat bill in profile, webbed feet (_ptDuckPainted); its five coats and three marks keep their colours
   Parts, pivots and poses keep the rig's names, so every walk cycle, wag, twitch and trick plays on the new drawing.
   _PT_PAINT.on is set only while the garden sprite is drawn (petSvgGroup). PURE: functions only.
   ============================================================ */
function _ptPaintK(k) {
  return Object.assign({}, k, { hr: (k.hr || 15) * 0.8, bl: (k.bl || 1) * 1.12, leg: (k.leg || 1) * 1.16, legW: (k.legW || 6) * 0.84, bh: (k.bh || 1) * 0.94 });
}
/** Painted fur: n short strokes inside an ellipse, leaning along a (radians from up), seeded so the same pet always looks the same. */
function _ptPaintStrokes(seed, cx, cy, rx, ry, n, len, a, col, w, op) {
  const r = GART.rng('ptf|' + seed), f = GART.f1;
  let d = '';
  for (let i = 0; i < n; i++) {
    const t = r() * Math.PI * 2, q = Math.sqrt(r()), x = cx + Math.cos(t) * rx * q, y = cy + Math.sin(t) * ry * q, g = a + (r() - 0.5) * 0.6, L = len * (0.6 + r() * 0.6);
    d += `M${f(x)} ${f(y)}l${f(Math.sin(g) * L)} ${f(-Math.cos(g) * L)}`;
  }
  return d ? { f: null, s: col, w, d, op, cap: 'round', detail: true } : null;
}
function _ptPaintFur(parts, g, fur, pose, seed) {
  const add = (key, s) => { if (s && parts[key]) parts[key].push(s); };
  const lit = _ptMix(fur[2], '#fff6e0', 0.2), sh = fur[1];
  if (pose === 'walk') {
    const [cx, cy, rx, ry] = g.body;
    add('body', _ptPaintStrokes(seed + 'b1', cx - rx * 0.1, cy - ry * 0.45, rx * 0.8, ry * 0.42, 26, 2.6, 1.95, lit, 0.7, 0.42));
    add('body', _ptPaintStrokes(seed + 'b2', cx + rx * 0.05, cy + ry * 0.45, rx * 0.78, ry * 0.36, 20, 2.4, 2.6, sh, 0.7, 0.4));
    add('body', _ptPaintStrokes(seed + 'b3', g.haunch[0], g.haunch[1], g.haunch[2] * 0.7, g.haunch[3] * 0.7, 10, 2.4, 2.9, sh, 0.65, 0.3));
  } else if (pose === 'sleep') {
    const [cx, cy, rx, ry] = g.body;
    add('body', _ptPaintStrokes(seed + 's1', cx, cy - ry * 0.4, rx * 0.8, ry * 0.42, 24, 2.6, 1.9, lit, 0.7, 0.4));
    add('body', _ptPaintStrokes(seed + 's2', cx, cy + ry * 0.4, rx * 0.8, ry * 0.3, 14, 2.2, 1.7, sh, 0.65, 0.35));
  } else {
    const [tx, ty, trx, try_] = g.torso;
    add('body', _ptPaintStrokes(seed + 't1', tx - trx * 0.2, ty - try_ * 0.2, trx * 0.6, try_ * 0.7, 16, 2.4, 3.0, lit, 0.65, 0.38));
    add('body', _ptPaintStrokes(seed + 't2', tx + trx * 0.35, ty + try_ * 0.3, trx * 0.5, try_ * 0.5, 10, 2.2, 3.1, sh, 0.65, 0.35));
    add('body', _ptPaintStrokes(seed + 'h1', g.haunch[0] - g.haunch[2] * 0.15, g.haunch[1] - g.haunch[3] * 0.25, g.haunch[2] * 0.7, g.haunch[3] * 0.55, 16, 2.6, 2.4, lit, 0.7, 0.36));
    add('body', _ptPaintStrokes(seed + 'h2', g.haunch[0] + g.haunch[2] * 0.25, g.haunch[1] + g.haunch[3] * 0.35, g.haunch[2] * 0.6, g.haunch[3] * 0.4, 10, 2.2, 2.6, sh, 0.65, 0.34));
  }
  // the crown and the back of the head, never the face
  add('head', _ptPaintStrokes(seed + 'hd', g.hx - g.hr * 0.25, g.hy - g.hr * 0.6, g.hr * 0.6, g.hr * 0.26, 12, 1.6, -0.3, lit, 0.55, 0.38));
  // a soft contact of shade where the body meets the legs, and under the chin
  if (pose !== 'sleep') add('head', { f: sh, d: _pE(g.hx - g.hr * 0.05, g.hy + g.hr * 0.9, g.hr * 0.6, g.hr * 0.18), op: 0.22 });
}

/* ---------- the duck, side on ---------- */
function _ptDuckPainted(pet, pose, mood, X) {
  const sleep = pose === 'sleep', walk = pose === 'walk', m = pet.marks, coat = pet.coat;
  const parts = { legsF: [], tail: [], body: [], legsN: [], paw: [], neck: [], head: [], eyes: [], fx: [] };
  const A = X.a, B = X.b, C = X.c, bill = X.nose || '#f08a3c', bt = _ptTone(bill);
  const mall = coat === 'mallard', cay = coat === 'cayuga';
  const headT = mall ? _ptTone('#2f7048') : cay ? _ptTone('#2f4a40') : A;
  const chest = mall ? _ptTone('#7a4a32') : A;
  const cy = sleep ? 80 : 74, G = 90;
  // feet: webbed, orange, the far one a step behind
  if (!sleep) {
    const foot = (x, t, cls) => [_pL(_pP`M${x} ${cy + 9}L${x - 0.6} ${G - 1.6}`, t[1], 1.8), _pF(_pP`M${x - 3.6} ${G}Q${x - 1} ${G - 3} ${x + 1} ${G - 2}L${x + 5.4} ${G - 0.4}Q${x + 1} ${G + 0.4} ${x - 3.6} ${G}z`, t[0]), _pL(_pP`M${x} ${G - 1.4}l3 1.2M${x} ${G - 1.2}l1.6 1.4`, t[1], 0.5, 0.7)];
    parts.legsF.push(...foot(48, _ptTone(_ptMix(bill, '#2c3424', 0.25))));
    parts.legsN.push(...foot(42, bt));
  }
  // the tail, cocked up behind
  parts.tail.push(_pF(_pP`M28 ${cy - 4}L15 ${cy - 13}Q18 ${cy - 5} 22 ${cy + 1}z`, A[1]), _pF(_pP`M28 ${cy - 3.4}L17 ${cy - 11}Q20 ${cy - 5} 23.4 ${cy}z`, A[0]), _pL(_pP`M26 ${cy - 4}L18.6 ${cy - 9.6}`, A[2], 0.6, 0.6));
  if (mall) parts.tail.push(_pL(_pP`M17 ${cy - 12}q-2 -3 1 -4`, '#2a2a2a', 1.2));
  // the body: a long boat, shade under the keel and toward the far side, the lit back, painted feathers
  const bodyD = _pP`M24 ${cy}C24 ${cy - 8} 34 ${cy - 11} 48 ${cy - 10}C60 ${cy - 9.4} 68 ${cy - 6} 68.4 ${cy}C68.6 ${cy + 7} 58 ${cy + 12} 44 ${cy + 12}C32 ${cy + 12} 24 ${cy + 7} 24 ${cy}z`;
  const bodyL = _pP`M25.6 ${cy - 0.6}C25.6 ${cy - 7.6} 35 ${cy - 10} 48 ${cy - 9}C58.6 ${cy - 8.4} 66 ${cy - 5.4} 66.6 ${cy - 0.4}C64 ${cy + 4} 56 ${cy + 7} 44 ${cy + 7.4}C34 ${cy + 7.4} 26.6 ${cy + 4.6} 25.6 ${cy - 0.6}z`;
  parts.body.push(_pF(bodyD, A[1]), _pF(bodyL, A[0]), _pF(_pP`M30 ${cy - 6}C38 ${cy - 10} 50 ${cy - 10} 58 ${cy - 7}C48 ${cy - 8} 38 ${cy - 7.4} 30 ${cy - 6}z`, A[2], 0.6));
  if (!sleep) parts.body.push(_pF(_pP`M56 ${cy - 8}C62 ${cy - 8} 68 ${cy - 4} 68.4 ${cy + 1}C66 ${cy + 6} 60 ${cy + 7} 56 ${cy + 5}z`, chest[0], mall ? 1 : 0.0001));
  const fs = _ptPaintStrokes(pet.coat + 'df', 44, cy + 1, 18, 6, 26, 2.2, 1.7, _ptMix(A[2], '#ffffff', 0.25), 0.6, 0.4); if (fs) parts.body.push(fs);
  const fs2 = _ptPaintStrokes(pet.coat + 'dk', 46, cy + 7, 16, 3, 14, 2, 1.6, A[1], 0.6, 0.45); if (fs2) parts.body.push(fs2);
  // the folded wing: layered feather ends, the speculum on a mallard
  const wing = mall ? _ptTone('#8a7a68') : A;
  parts.paw.push(_pF(_pP`M30 ${cy - 4}C38 ${cy - 9} 52 ${cy - 8.6} 59 ${cy - 3}C54 ${cy + 3} 42 ${cy + 4.6} 32 ${cy + 1.6}z`, wing[1]),
    _pF(_pP`M31 ${cy - 4}C39 ${cy - 8} 51 ${cy - 7.6} 57 ${cy - 3}C52 ${cy + 1.6} 42 ${cy + 3} 33 ${cy + 0.6}z`, wing[0]),
    _pL(_pP`M33 ${cy}l-5 1.4M37 ${cy + 1}l-5 1.8M41 ${cy + 1.6}l-5 2M45 ${cy + 1.6}l-5 2.2M49 ${cy + 1}l-5 2`, wing[3], 0.7, 0.55),
    _pL(_pP`M34 ${cy - 4.6}C42 ${cy - 7.4} 50 ${cy - 7} 55 ${cy - 4}`, wing[2], 0.7, 0.6));
  if (mall) parts.paw.push(_pF(_pP`M36 ${cy - 1}L46 ${cy - 1.6}L45 ${cy + 0.6}L36 ${cy + 1}z`, '#3a5ab0', 0.95), _pL(_pP`M36 ${cy - 1.2}L46 ${cy - 1.8}`, '#fbf8f2', 0.5, 0.9));
  // neck and head in profile (sleeping: the head laid back along the body, the bill tucked)
  let x, y, r = 7.4;
  if (sleep) {
    x = 56; y = cy - 9;
    parts.head.push(_pF(_pE(x, y, r * 1.1, r * 0.86), headT[1]), _pF(_pE(x - 0.6, y - 0.6, r, r * 0.76), headT[0]), _pF(_pE(x - 2.4, y - 3, r * 0.5, r * 0.22), headT[2], 0.55));
    parts.head.push(_pF(_pP`M${x - 6} ${y + 2}C${x - 10} ${y + 1} ${x - 13} ${y + 2.4} ${x - 13.6} ${y + 4}C${x - 10} ${y + 5} ${x - 7} ${y + 4.6} ${x - 5} ${y + 3.6}z`, bt[1]));
  } else {
    x = 66; y = cy - 23;
    const neckD = _pP`M56 ${cy - 6}C55 ${cy - 14} 58 ${cy - 20} 61 ${y + 4}L${x + 5} ${y + 5}C${x + 4} ${cy - 15} ${x + 3} ${cy - 10} ${x + 3} ${cy - 4}z`;
    parts.neck.push(_pF(neckD, headT[1]), _pF(_pP`M57.4 ${cy - 6.4}C56.6 ${cy - 14} 59 ${cy - 19.4} 61.6 ${y + 4.4}L${x + 3.6} ${y + 5.4}C${x + 2.6} ${cy - 15} ${x + 1.8} ${cy - 10} ${x + 1.6} ${cy - 5}z`, headT[0]));
    if (m === 'ring' || mall) parts.neck.push(_pL(_pP`M58.6 ${cy - 14}Q63 ${cy - 12.4} ${x + 3.6} ${cy - 14.4}`, '#fbf8f2', 1.5, 0.95));
    parts.head.push(_pF(_pE(x, y, r * 1.06, r * 0.92), headT[1]), _pF(_pE(x - 0.6, y - 0.6, r * 0.96, r * 0.82), headT[0]), _pF(_pE(x - 2.6, y - 3.4, r * 0.5, r * 0.24), headT[2], 0.6));
    if (m === 'tuft') parts.head.push(_pF(_pP`M${x - 3} ${y - r * 0.7}Q${x - 5} ${y - r * 1.6} ${x} ${y - r * 1.5}Q${x - 1} ${y - r * 1.1} ${x + 1} ${y - r * 0.8}z`, headT[0]));
    // the bill, flat and long, a nail at its tip, the line of the mouth
    parts.head.push(_pF(_pP`M${x + 5.6} ${y - 1.4}C${x + 10} ${y - 1.8} ${x + 14.6} ${y - 0.4} ${x + 15.6} ${y + 1.8}C${x + 12.6} ${y + 3.6} ${x + 9} ${y + 3.6} ${x + 5.2} ${y + 3}z`, bt[1]),
      _pF(_pP`M${x + 5.8} ${y - 1}C${x + 10} ${y - 1.4} ${x + 14} ${y - 0.2} ${x + 15} ${y + 1.4}C${x + 12} ${y + 1.6} ${x + 9} ${y + 1.4} ${x + 5.6} ${y + 1.2}z`, bt[0]),
      _pF(_pE(x + 14.6, y + 1.2, 0.9, 0.7), bt[3], 0.6), _pL(_pP`M${x + 6} ${y + 1.8}Q${x + 10} ${y + 2.4} ${x + 15} ${y + 1.8}`, bt[3], 0.4, 0.6), _pF(_pE(x + 8.6, y - 0.2, 0.6, 0.35), bt[3], 0.7));
    if (mood.mouth === 'open') parts.head.push(_pF(_pP`M${x + 6} ${y + 2.4}Q${x + 10} ${y + 5} ${x + 14} ${y + 2.6}z`, '#c0503a', 0.8));
  }
  // one eye, side on: open, happy, closed or a wink, the way the kit's eyes read
  const ek = sleep ? 'closed' : (mood.eyes === 'wink' ? 'happy' : mood.eyes || 'open');
  const eyesAt = [x + 2.2, x + 2.2, y - 1.6, 1.3];
  parts.eyes.push(..._ptEye(eyesAt[0], eyesAt[2], ek === 'open' || ek === 'sparkle' ? 1.25 : 1.7, ek === 'sparkle' ? 'sparkle' : ek, null));
  if (ek === 'open') parts.eyes.push(_pF(_pC(eyesAt[0] - 0.4, eyesAt[2] - 0.5, 0.4), '#ffffff', 0.9));
  const top = sleep ? [x, y - r * 0.8, r * 1.1, 3] : [x, y - r * 0.82, r * 1.15, 4];
  return _ptPaintScale({
    parts, order: ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'fx'],
    piv: { head: sleep ? [x - 4, y + 4] : [x - 2, y + 6], eyes: [x, eyesAt[2]], paw: [32, cy - 2], legsN: [42, cy + 8], legsF: [48, cy + 8], tail: [27, cy - 2], body: [46, 90] },
    acc: { hc: [x, y, r], neck: { x: x - 0.5, y: y + r * 0.95, w: r * 1.05, rot: -8 }, top, eyes: eyesAt, ear: [x - r * 0.62, y - r * 0.6, r * 0.24] },
    top: sleep ? y - r * 1.4 : y - r * 1.5, bird: true,
  }, 0.8, 46, 90, 30);
}
/** The whole drawing scaled about (cx, cy): every shape, pivot and accessory anchor (a smaller duck, the size the old one stood). */
function _ptPaintScale(A, k, cx, cy, topMin) {
  const m = [k, 0, 0, k, cx * (1 - k), cy * (1 - k)], P = (p) => (p ? [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k].concat(p.slice(2).map((v, i) => (i === 0 ? v * k : v))) : p);
  for (const key of Object.keys(A.parts)) for (const sh of A.parts[key]) { if (!sh.m) sh.m = m; if (sh.w) sh.w *= 1; }
  for (const key of Object.keys(A.piv)) A.piv[key] = P(A.piv[key]);
  const ac = A.acc; ac.hc = P(ac.hc); ac.top = P(ac.top); ac.ear = P(ac.ear); ac.eyes = ac.eyes && [cx + (ac.eyes[0] - cx) * k, cx + (ac.eyes[1] - cx) * k, cy + (ac.eyes[2] - cy) * k, ac.eyes[3] * k];
  if (ac.neck) ac.neck = Object.assign({}, ac.neck, { x: cx + (ac.neck.x - cx) * k, y: cy + (ac.neck.y - cy) * k, w: ac.neck.w * k });
  A.top = Math.min(cy + (A.top - cy) * k, topMin == null ? 100 : topMin);
  return A;
}
/** The Painted village's own drawing of a species, or null (the rig's drawing, in painted proportions). */
function _ptPaintedArt(sp) { return sp && sp.id === 'duck' ? _ptDuckPainted : (typeof _ppArtFor === 'function' ? _ppArtFor(sp) : null); }   // every other species: 97-pets-0kitpaint2.js

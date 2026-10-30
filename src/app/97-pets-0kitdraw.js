/* ============================================================
   PETS, the drawing (2.18, agent 'pets'). PURE: functions only, nothing drawn
   at load, no DOM, no state. Every pet is drawn by hand here in the avatar
   kit's flat style (97-profile-0kit.js): flat fills in four tones per colour
   (base, shade, light, deep), light from the top left, soft shading shapes, a
   big friendly head turned a little towards you. The same drawing is the card
   portrait, the Home widget, the garden sprite and the scene sprite.

   ONE DRAWING, FOUR USES. petArt(pet, pose, mood) returns named parts of
   shapes ({f, d, op} fills and {s, w, d, op, cap} strokes, paints are '#rrggbb'
   from the kit's tables only) in a 100 x 100 box, the feet on the ground line
   y = 90, facing right. Parts: legsF (far legs), tail, body, legsN (near legs),
   paw (the near front leg, for waves and high fives), neck (collar, bandana),
   head (with its accessories), eyes (blinks), fx (zzz, sparkles). Pivots for
   each moving part (tail, head, paw, legs, eyes) let the page animate with CSS
   (no SMIL) and the scene engine pose them (97-pets-3scene.js).

     petArt(pet, pose, mood)        {parts, order, piv, top, h, w}; pose 'sit' | 'walk' | 'sleep'
                                    mood {eyes: open|happy|closed|sparkle|wink, mouth: smile|open|calm, extra: zzz|sparkle|hearts|''}
     petSvg(pet, o)                 the pet as an <svg> string. o {size, pose, mood, uid, motion (class hooks for the CSS idle
                                    animations), cls, shadow (default true), crop: 'head' (the head close-up), bg}
     petSvgGroup(pet, o)            the same drawing as a <g> string with its feet at (0, 0): o {h (height in the caller's
                                    units), pose, mood, face (1 right, -1 left), motion, shadow}
     petTreatSvg(kind, size)        a treat (fish, bone, carrot, seed, leaf, berry, strawberry, pellet, bamboo, pea, millet,
                                    chilli, sunberry, apple, battery, cookie) as an <svg> string
     petAutoEye(pet)                the species' own eye colour for 'auto'
     petItemShapes(item, a, species) / petItemMatrix(slot, a, fit)   a custom accessory's shapes on the pet's anchors (2.22)

   A pet drawn with custom accessories is a pet object with `items`: {itemHead: design, itemFace: design, itemNeck: design}
   (the page resolves the ids in the look to designs: 97-pets-1core.js petWithItems). Without `items` the ids draw nothing.
   ============================================================ */
const _PTK_INK = '#2a2124', _PTK_PINK = '#f29aab', _PTK_BLUSH = '#f4808f';
const _ptR = (v) => { const r = Math.round(v * 10) / 10; return r === 0 ? 0 : r; };
function _ptHx(c) { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function _ptMix(a, b, t) { const A = _ptHx(a), B = _ptHx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
/** A colour as four tones: [base, shade, light, deep]. */
function _ptTone(c) { c = /^#[0-9a-f]{6}$/i.test(String(c)) ? c : '#999999'; return [c, _ptMix(c, '#1a1420', 0.24), _ptMix(c, '#ffffff', 0.32), _ptMix(c, '#1a1420', 0.48)]; }
function _ptLum(c) { const [r, g, b] = _ptHx(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
const _pE = (cx, cy, rx, ry) => `M${_ptR(cx - rx)} ${_ptR(cy)}a${_ptR(rx)} ${_ptR(ry)} 0 1 0 ${_ptR(2 * rx)} 0a${_ptR(rx)} ${_ptR(ry)} 0 1 0 ${_ptR(-2 * rx)} 0z`;
const _pC = (cx, cy, r) => _pE(cx, cy, r, r);
/** A path from points [[x, y], ...] (M L ... Z). */
const _pPoly = (pts, close) => 'M' + pts.map(p => _ptR(p[0]) + ' ' + _ptR(p[1])).join('L') + (close === false ? '' : 'z');
/** Number formatting inside hand-written paths: _pP`M${x} ${y}` rounds every number. */
function _pP(strs, ...vals) { let s = ''; strs.forEach((t, i) => { s += t; if (i < vals.length) s += typeof vals[i] === 'number' ? _ptR(vals[i]) : vals[i]; }); return s; }
const _pF = (d, f, op, m) => ({ f, d, op: op == null ? 1 : op, m: m || null });
const _pL = (d, s, w, op, m) => ({ f: null, s, w, d, op: op == null ? 1 : op, cap: 'round', m: m || null });
/** The matrix of a rotation by deg about (cx, cy). */
function _ptRot(deg, cx, cy) { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy].map(_ptR); }
/** A star path (n points). */
function _ptStar(x, y, R, r, n) { const pts = []; n = n || 5; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R; pts.push([x + q * Math.cos(a), y + q * Math.sin(a)]); } return _pPoly(pts); }
/** A heart path centred at (x, y), size s. */
const _pHeart = (x, y, s) => _pP`M${x} ${y + s * 0.9}C${x - s * 1.6} ${y - s * 0.1} ${x - s * 0.9} ${y - s * 1.3} ${x} ${y - s * 0.45}C${x + s * 0.9} ${y - s * 1.3} ${x + s * 1.6} ${y - s * 0.1} ${x} ${y + s * 0.9}z`;
/** A soft round blob: base, a shade below right, a light above left (the flat style's modelling). */
function _ptBlob(cx, cy, rx, ry, t, rot, o) {
  o = o || {};
  const m = rot ? _ptRot(rot, cx, cy) : null;
  const out = [_pF(_pE(cx, cy, rx, ry), t[0], 1, m)];
  if (o.shade !== false) out.push(_pF(_pE(cx + rx * 0.1, cy + ry * 0.36, rx * 0.86, ry * 0.6), t[1], o.shadeOp || 0.34, m));
  if (o.light !== false) out.push(_pF(_pE(cx - rx * 0.3, cy - ry * 0.48, rx * 0.4, ry * 0.22), t[2], o.lightOp || 0.34, m));
  return out;
}
/** A leg: a rounded stroke from (x, y0) to (x2, y1) with a paw. */
function _ptLeg(x, y0, x2, y1, w, t, paw, sock) {
  const out = [_pL(_pP`M${x} ${y0}L${x2} ${y1 - w * 0.3}`, t[0], w)];
  // a sock: the lower half of the leg in another colour (a fox's dark stockings)
  if (sock) out.push(_pL(_pP`M${x + (x2 - x) * 0.5} ${y0 + (y1 - y0) * 0.5}L${x2} ${y1 - w * 0.3}`, sock, w));
  if (paw !== false) out.push(_pF(_pE(x2 + w * 0.22, y1 - w * 0.3, w * 0.62, w * 0.42), paw || sock || t[0]));
  out.push(_pL(_pP`M${x - w * 0.18} ${y0 + 2}L${x2 - w * 0.18} ${y1 - w * 0.9}`, t[2], w * 0.22, 0.35));
  return out;
}

/* ---------- palette: every colour from the kit's tables ---------- */
const _PT_AUTO_EYE = { cat: '#9fb83a', fox: '#d99a2c', owl: '#f2a23b', frog: '#e8b83a', dragon: '#f0c040', phoenix: '#f6d35e', robot: '#7ff0f0' };
function petAutoEye(pet) {
  const sp = pet && pet.species, co = pet && pet.coat;
  if (sp === 'cat' && co === 'siamese') return '#4a8ad6';
  if (sp === 'dog' && pet.breed === 'husky') return '#4a8ad6';
  if (sp === 'owl' && co === 'barn') return '';
  if (sp === 'frog' && co === 'tree') return '#e0473e';
  if (sp === 'axolotl' && co === 'white') return '#e86a8a';
  return _PT_AUTO_EYE[sp] || '';
}
/**
 * The coat as the drawing reads it: {id, a (main), b (second: belly, muzzle), c (third: pattern), n (nose or bill)}. A custom
 * main colour (petHexOf) gets a belly 55% towards white and a pattern 40% towards the ink; coatB / coatC override either one,
 * on a named coat too. The nose or bill colour stays the species' own.
 */
function _ptCoatOf(sp, pet) {
  const hit = sp.coats.find(c => c.id === pet.coat) || null;
  const a = petHexOf(pet.coat), b = petHexOf(pet.coatB), c = petHexOf(pet.coatC);
  if (hit && !b && !c) return hit;
  const base = hit || sp.coats[0], main = a || base.a;
  return { id: hit ? hit.id : String(pet.coat), label: 'Custom', a: main, b: b || (a ? _ptMix(a, '#ffffff', 0.55) : base.b), c: c || (a ? _ptMix(a, '#1a1420', 0.4) : base.c), n: base.n };
}
function _ptPal(pet) {
  const sp = petSpecies(pet.species) || PET_SPECIES[0];
  const coat = _ptCoatOf(sp, pet);
  const accHex = (k) => petHexOf(pet[k]) || (PET_ACC_COLS[pet[k]] || PET_ACC_COLS.red).hex;
  const eyeHex = petHexOf(pet.eyes), ey = PET_EYES[pet.eyes] || PET_EYES.auto;
  const eye = eyeHex || (pet.eyes && pet.eyes !== 'auto' ? ey.hex : petAutoEye(pet)), eye2 = pet.eyes === 'odd' ? ey.hex2 : eye;
  return { sp, coat, a: _ptTone(coat.a), b: _ptTone(coat.b), c: _ptTone(coat.c), nose: coat.n || '', eye, eye2,
    rainbow: (k) => pet[k] === 'rainbow', acc: { collar: _ptTone(accHex('collarCol')), bandana: _ptTone(accHex('bandanaCol')), bow: _ptTone(accHex('bowCol')), hat: _ptTone(accHex('hatCol')), glasses: accHex('glassesCol') } };
}

/* ---------- faces ---------- */
/** One eye: open (glossy, or an iris with a pupil), happy (^), closed (a sleepy curve), sparkle (a star in it), slit (a cat's pupil). */
function _ptEye(x, y, r, kind, col, o) {
  o = o || {};
  const ink = o.ink || _PTK_INK;
  if (kind === 'happy') return [_pL(_pP`M${x - r} ${y + r * 0.35}Q${x} ${y - r * 1.15} ${x + r} ${y + r * 0.35}`, ink, Math.max(0.9, r * 0.5))];
  if (kind === 'closed') return [_pL(_pP`M${x - r} ${y - r * 0.05}Q${x} ${y + r * 0.95} ${x + r} ${y - r * 0.05}`, ink, Math.max(0.9, r * 0.46))];
  const out = [];
  const rx = r * (o.wide || 0.92), ry = r * 1.08;
  if (col) {
    out.push(_pF(_pE(x, y, rx, ry), col));
    out.push(_pF(_pE(x, y + r * 0.2, rx, ry * 0.55), _ptMix(col, '#000000', 0.25), 0.35));
    out.push(_pF(o.slit ? _pE(x + r * 0.04, y + r * 0.04, r * 0.26, ry * 0.86) : _pE(x + r * 0.04, y + r * 0.08, rx * 0.55, ry * 0.6), ink));
    out.push(_pL(_pE(x, y, rx, ry), _ptMix(col, '#000000', 0.45), Math.max(0.5, r * 0.14), 0.7));
  } else {
    out.push(_pF(_pE(x, y, rx, ry), ink));
  }
  if (kind === 'sparkle') out.push(_pF(_ptStar(x - r * 0.22, y - r * 0.28, r * 0.58, r * 0.22, 4), '#ffffff', 0.95));
  else out.push(_pF(_pC(x - r * 0.3, y - r * 0.38, r * 0.36), '#ffffff', 0.95));
  out.push(_pF(_pC(x + r * 0.34, y + r * 0.4, r * 0.15), '#ffffff', 0.8));
  return out;
}
/** Both eyes of a head facing a little right: the far eye a touch smaller. */
function _ptEyes(x1, x2, y, r, mood, X, o) {
  o = o || {};
  const k = mood.eyes || 'open';
  const left = k === 'wink' ? 'open' : k, right = k === 'wink' ? 'happy' : k;
  return _ptEye(x1, y, r * 0.94, left, X.eye, o).concat(_ptEye(x2, y, r, right, X.eye2, o));
}
const _ptBlush = (x1, x2, y, r, op) => [_pF(_pE(x1, y, r, r * 0.55), _PTK_BLUSH, op || 0.3), _pF(_pE(x2, y, r, r * 0.55), _PTK_BLUSH, op || 0.3)];
/** A small mouth: smile (a soft 'w'), open (a happy open mouth), calm. */
function _ptMouth(x, y, s, mood, o) {
  o = o || {};
  const ink = o.ink || _ptMix(_PTK_INK, '#5a2a2e', 0.5), m = mood.mouth || 'smile';
  if (m === 'open') return [_pF(_pP`M${x - s} ${y - s * 0.2}Q${x} ${y + s * 1.7} ${x + s} ${y - s * 0.2}Q${x} ${y + s * 0.2} ${x - s} ${y - s * 0.2}z`, '#6a2a34'), _pF(_pE(x, y + s * 0.62, s * 0.5, s * 0.32), '#f07a8c')];
  if (m === 'calm') return [_pL(_pP`M${x - s * 0.5} ${y}Q${x} ${y + s * 0.3} ${x + s * 0.5} ${y}`, ink, Math.max(0.7, s * 0.28))];
  if (o.w) return [_pL(_pP`M${x - s} ${y - s * 0.1}Q${x - s * 0.5} ${y + s * 0.7} ${x} ${y}Q${x + s * 0.5} ${y + s * 0.7} ${x + s} ${y - s * 0.1}`, ink, Math.max(0.7, s * 0.3))];
  return [_pL(_pP`M${x - s * 0.8} ${y - s * 0.1}Q${x} ${y + s * 0.8} ${x + s * 0.8} ${y - s * 0.1}`, ink, Math.max(0.7, s * 0.3))];
}
/** Whiskers either side of a muzzle. */
function _ptWhiskers(x, y, r, col, op) {
  const s = [];
  for (const k of [-1, 1]) for (const [dy, dd] of [[-0.06, -0.1], [0.06, 0.06]]) s.push(_pL(_pP`M${x + k * r * 0.42} ${y + r * dy}Q${x + k * r * 0.8} ${y + r * (dy + dd * 0.5)} ${x + k * r * 1.12} ${y + r * (dy + dd)}`, col, Math.max(0.5, r * 0.035), op || 0.65));
  return s;
}

/* ---------- ears ---------- */
function _ptEarTri(x, y, r, side, h, t, inner, o) {
  o = o || {};
  // side -1: the left (far) ear, +1: the right (near) ear; the base on the head's crown, the tip up and out
  const bx0 = x + side * r * (o.in || 0.22), bx1 = x + side * r * (o.out || 0.86), by0 = y - r * (o.inY || 0.86), by1 = y - r * (o.outY || 0.36);
  const tx = x + side * r * (o.tipX || 0.78), ty = y - r * (h || 1.32);
  const d = _pP`M${bx0} ${by0}Q${tx - side * r * 0.12} ${ty + r * 0.05} ${tx} ${ty}Q${tx + side * r * 0.12} ${ty + r * 0.18} ${bx1} ${by1}z`;
  const out = [_pF(d, t[side < 0 ? 1 : 0])];
  if (inner) {
    const ix0 = bx0 + (bx1 - bx0) * 0.22, iy0 = by0 + (by1 - by0) * 0.22, ix1 = bx0 + (bx1 - bx0) * 0.74, iy1 = by0 + (by1 - by0) * 0.74;
    const itx = tx + (x - tx) * 0.12, ity = ty + r * 0.22;
    out.push(_pF(_pP`M${ix0} ${iy0}Q${itx} ${ity} ${itx} ${ity}Q${itx + side * r * 0.04} ${ity + r * 0.1} ${ix1} ${iy1}z`, inner, 0.9));
  }
  if (o.back) out.push(_pF(_pP`M${tx} ${ty}Q${tx + side * r * 0.05} ${ty + r * 0.3} ${bx1} ${by1}L${tx + (bx1 - tx) * 0.5} ${ty + (by1 - ty) * 0.35}z`, o.back, 0.9));
  return out;
}
/** A floppy ear hanging down the side of the head. */
function _ptEarFlop(x, y, r, side, len, t, o) {
  o = o || {};
  const ax = x + side * r * (o.at || 0.72), ay = y - r * (o.atY || 0.62), w = r * (o.w || 0.42);
  const bx = ax + side * r * (o.out || 0.18), by = ay + r * len;
  const d = _pP`M${ax - side * w * 0.55} ${ay}Q${ax + side * w * 1.3} ${ay - r * 0.1} ${bx + side * w * 0.55} ${by - w * 0.6}Q${bx + side * w * 0.2} ${by + w * 0.35} ${bx - side * w * 0.45} ${by - w * 0.1}Q${ax - side * w * 0.2} ${ay + r * len * 0.55} ${ax - side * w * 0.55} ${ay}z`;
  return [_pF(d, o.col || t[side < 0 ? 1 : 0])].concat(
    o.shine === false ? [] : [_pL(_pP`M${ax + side * w * 0.2} ${ay + r * 0.12}Q${bx + side * w * 0.3} ${ay + r * len * 0.45} ${bx + side * w * 0.2} ${by - w * 0.6}`, (o.col ? _ptTone(o.col) : t)[2], Math.max(0.6, w * 0.22), 0.35)]);
}
const _ptEarRound = (x, y, r, side, s, t, inner) => [_pF(_pC(x + side * r * 0.62, y - r * 0.78, r * s), t[side < 0 ? 1 : 0]), _pF(_pC(x + side * r * 0.62, y - r * 0.76, r * s * 0.58), inner || _PTK_PINK, 0.8)];

/* ---------- accessories (on the anchors each species gives: neck, crown, eyes, ear) ---------- */
function _ptCollar(pet, X, nk) {
  if (!nk || pet.collar === 'none') return [];
  const t = X.acc.collar, out = [];
  const { x, y, w, rot } = nk, m = rot ? _ptRot(rot, x, y) : null;
  if (pet.collar === 'pearls') {
    for (let i = -3; i <= 3; i++) { const px = x + i * w * 0.15, py = y + Math.abs(i) * -0.25 + 0.4 * (3 - Math.abs(i)) / 3 * 2.2; out.push(_pF(_pC(px, py, Math.max(1.1, w * 0.075)), '#fbf6ee', 1, m), _pF(_pC(px - 0.3, py - 0.4, Math.max(0.4, w * 0.03)), '#ffffff', 0.9, m)); }
    return out;
  }
  out.push(_pF(_pP`M${x - w * 0.5} ${y - 1.4}Q${x} ${y + 2.6} ${x + w * 0.5} ${y - 1.4}L${x + w * 0.5} ${y + 1.4}Q${x} ${y + 5.2} ${x - w * 0.5} ${y + 1.4}z`, t[0], 1, m));
  out.push(_pL(_pP`M${x - w * 0.45} ${y - 0.6}Q${x} ${y + 3.2} ${x + w * 0.45} ${y - 0.6}`, t[2], 0.7, 0.6));
  if (pet.collar === 'bell') out.push(_pF(_pC(x + 0.5, y + 5.4, 2.3), '#f2c94c', 1, m), _pF(_pC(x - 0.2, y + 4.8, 0.8), '#fff4c0', 0.9, m), _pL(_pP`M${x - 0.7} ${y + 6.4}L${x + 1.7} ${y + 6.4}`, '#a6781e', 0.6, 0.8));
  if (pet.collar === 'tag') out.push(_pF(_pHeart(x + 0.5, y + 5.6, 2.1), '#f2c94c', 1, m), _pF(_pC(x - 0.2, y + 5.1, 0.6), '#fff4c0', 0.9, m));
  return out;
}
function _ptBandana(pet, X, nk) {
  if (!nk || pet.bandana === 'none') return [];
  const t = X.acc.bandana, { x, y, w } = nk, m = nk.rot ? _ptRot(nk.rot, x, y) : null;
  const tri = _pP`M${x - w * 0.52} ${y - 1}Q${x} ${y + 2.4} ${x + w * 0.52} ${y - 1}L${x + w * 0.1} ${y + w * 0.62}Q${x - w * 0.02} ${y + w * 0.7} ${x - w * 0.1} ${y + w * 0.58}z`;
  const out = [_pF(tri, t[0], 1, m), _pF(_pP`M${x + w * 0.1} ${y + 1}L${x + w * 0.1} ${y + w * 0.62}L${x + w * 0.42} ${y + 0.4}z`, t[1], 0.5, m)];
  if (pet.bandana === 'dots') for (const [dx, dy] of [[-0.25, 0.12], [0.05, 0.2], [0.28, 0.05], [-0.02, 0.42], [-0.18, 0.3]]) out.push(_pF(_pC(x + w * dx, y + w * dy, Math.max(0.7, w * 0.05)), '#ffffff', 0.9, m));
  if (pet.bandana === 'stripes') for (const k of [0.16, 0.34]) out.push(_pL(_pP`M${x - w * (0.46 - k)} ${y + w * k * 0.6}L${x + w * (0.46 - k)} ${y + w * k * 0.6}`, '#ffffff', Math.max(0.6, w * 0.05), 0.85, m));
  out.push(_pF(_pE(x + w * 0.5, y - 0.8, 1.6, 1.3), t[1], 1, m));
  return out;
}
function _ptGlasses(pet, X, ey) {
  if (!ey || pet.glasses === 'none') return [];
  const [x1, x2, y, r] = ey, col = X.acc.glasses, out = [];
  const R = r * 1.55, bw = Math.max(0.7, r * 0.28);
  if (pet.glasses === 'monocle') return [_pL(_pC(x2, y, R), col, bw), _pF(_pC(x2, y, R), '#ffffff', 0.12), _pL(_pP`M${x2 + R * 0.7} ${y + R * 0.7}Q${x2 + R * 1.4} ${y + R * 2.2} ${x2 + R * 0.6} ${y + R * 3.2}`, col, bw * 0.5, 0.8)];
  if (pet.glasses === 'heart') {
    for (const x of [x1, x2]) out.push(_pF(_pHeart(x, y + R * 0.05, R * 0.95), '#e0475e', 0.88), _pF(_pC(x - R * 0.35, y - R * 0.3, R * 0.2), '#ffffff', 0.5));
    out.push(_pL(_pP`M${x1 + R * 0.7} ${y - R * 0.2}Q${(x1 + x2) / 2} ${y - R * 0.55} ${x2 - R * 0.7} ${y - R * 0.2}`, '#a3203a', bw * 0.8));
    return out;
  }
  const sun = pet.glasses === 'sun';
  for (const x of [x1, x2]) {
    out.push(_pF(sun ? _pP`M${x - R} ${y - R * 0.55}L${x + R} ${y - R * 0.55}Q${x + R * 0.95} ${y + R * 0.95} ${x} ${y + R * 0.9}Q${x - R * 0.95} ${y + R * 0.95} ${x - R} ${y - R * 0.55}z` : _pC(x, y, R), sun ? '#25252c' : '#ffffff', sun ? 0.92 : 0.14));
    if (!sun) out.push(_pL(_pC(x, y, R), col, bw));
    else out.push(_pL(_pP`M${x - R} ${y - R * 0.55}L${x + R} ${y - R * 0.55}`, col, bw), _pF(_pP`M${x - R * 0.7} ${y - R * 0.3}L${x - R * 0.2} ${y - R * 0.3}L${x - R * 0.55} ${y + R * 0.2}z`, '#ffffff', 0.35));
  }
  out.push(_pL(_pP`M${x1 + R * 0.92} ${y - R * 0.25}Q${(x1 + x2) / 2} ${y - R * 0.6} ${x2 - R * 0.92} ${y - R * 0.25}`, col, bw * 0.8));
  return out;
}
function _ptBow(pet, X, ear) {
  if (!ear || pet.bow === 'none') return [];
  const [x, y, s0] = ear, s = s0 * (pet.bow === 'big' ? 1.45 : 1), t = X.acc.bow;
  if (pet.bow === 'flower' || pet.bow === 'daisy') {
    const pc = pet.bow === 'daisy' ? '#ffffff' : t[0], out = [];
    for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 0.3; out.push(_pF(_pC(x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62, s * 0.5), pc)); }
    if (pet.bow === 'daisy') for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 0.3; out.push(_pF(_pC(x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62, s * 0.5), '#ffffff')); out.push(_pL(_pC(x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62, s * 0.5), '#e8e2d6', 0.4, 0.8)); }
    return out.concat([_pF(_pC(x, y, s * 0.42), '#f6c544'), _pF(_pC(x - s * 0.12, y - s * 0.12, s * 0.15), '#fff4c0', 0.8)]);
  }
  return [
    _pF(_pP`M${x} ${y}Q${x - s * 1.1} ${y - s * 1.1} ${x - s * 1.3} ${y - s * 0.1}Q${x - s * 1.2} ${y + s * 0.9} ${x} ${y}z`, t[0]),
    _pF(_pP`M${x} ${y}Q${x + s * 1.1} ${y - s * 1.1} ${x + s * 1.3} ${y - s * 0.1}Q${x + s * 1.2} ${y + s * 0.9} ${x} ${y}z`, t[0]),
    _pF(_pP`M${x - s * 0.2} ${y}Q${x - s * 0.8} ${y - s * 0.55} ${x - s * 1.05} ${y - s * 0.12}`, t[1], 0.0),
    _pL(_pP`M${x - s * 0.35} ${y + s * 0.05}L${x - s * 1.05} ${y - s * 0.15}`, t[1], Math.max(0.5, s * 0.16), 0.55),
    _pL(_pP`M${x + s * 0.35} ${y + s * 0.05}L${x + s * 1.05} ${y - s * 0.15}`, t[1], Math.max(0.5, s * 0.16), 0.55),
    _pF(_pE(x, y, s * 0.38, s * 0.42), t[1]),
    _pF(_pP`M${x - s * 0.2} ${y + s * 0.3}L${x - s * 0.6} ${y + s * 1.2}L${x - s * 0.1} ${y + s * 1.0}z`, t[0]),
    _pF(_pP`M${x + s * 0.2} ${y + s * 0.3}L${x + s * 0.55} ${y + s * 1.25}L${x + s * 0.05} ${y + s * 1.0}z`, t[0]),
  ];
}
function _ptHat(pet, X, top) {
  if (!top || pet.hat === 'none') return [];
  const [x, y, w0, tilt] = top, w = w0, t = X.acc.hat, m = tilt ? _ptRot(tilt, x, y) : null, out = [];
  const add = (sh) => { for (const s of sh) { s.m = m; out.push(s); } return out; };
  switch (pet.hat) {
    case 'beanie': return add([_pF(_pP`M${x - w * 0.5} ${y + w * 0.08}Q${x - w * 0.52} ${y - w * 0.62} ${x} ${y - w * 0.66}Q${x + w * 0.52} ${y - w * 0.62} ${x + w * 0.5} ${y + w * 0.08}z`, t[0]),
      _pF(_pP`M${x + w * 0.12} ${y - w * 0.62}Q${x + w * 0.5} ${y - w * 0.5} ${x + w * 0.5} ${y + w * 0.08}L${x + w * 0.28} ${y + w * 0.08}Q${x + w * 0.32} ${y - w * 0.35} ${x + w * 0.12} ${y - w * 0.62}z`, t[1], 0.5),
      _pF(_pP`M${x - w * 0.56} ${y - w * 0.08}Q${x} ${y - w * 0.18} ${x + w * 0.56} ${y - w * 0.08}L${x + w * 0.57} ${y + w * 0.14}Q${x} ${y + w * 0.04} ${x - w * 0.57} ${y + w * 0.14}z`, t[1]),
      _pF(_pC(x, y - w * 0.72, w * 0.16), _ptMix(t[0], '#ffffff', 0.6)), _pF(_pC(x - w * 0.05, y - w * 0.77, w * 0.06), '#ffffff', 0.7)]);
    case 'anglerhat': return add([_pF(_pE(x, y + w * 0.02, w * 0.62, w * 0.14), t[1]), _pF(_pP`M${x - w * 0.36} ${y}Q${x - w * 0.38} ${y - w * 0.55} ${x} ${y - w * 0.58}Q${x + w * 0.38} ${y - w * 0.55} ${x + w * 0.36} ${y}z`, t[0]),
      _pF(_pP`M${x - w * 0.37} ${y - w * 0.16}Q${x} ${y - w * 0.1} ${x + w * 0.37} ${y - w * 0.16}L${x + w * 0.37} ${y - w * 0.04}Q${x} ${y + w * 0.02} ${x - w * 0.37} ${y - w * 0.04}z`, t[3]),
      _pF(_pP`M${x + w * 0.04} ${y - w * 0.1}q${w * 0.1} ${-w * 0.1} ${w * 0.2} 0q${-w * 0.1} ${w * 0.1} ${-w * 0.2} 0z`, '#f2b13a'), _pL(_pP`M${x - w * 0.2} ${y - w * 0.12}L${x - w * 0.12} ${y - w * 0.3}`, '#e8503a', Math.max(0.7, w * 0.06))]);
    case 'explorer': return add([_pF(_pE(x, y + w * 0.02, w * 0.62, w * 0.13), t[0]), _pF(_pP`M${x - w * 0.4} ${y}Q${x - w * 0.42} ${y - w * 0.55} ${x} ${y - w * 0.6}Q${x + w * 0.42} ${y - w * 0.55} ${x + w * 0.4} ${y}z`, t[0]),
      _pF(_pP`M${x - w * 0.41} ${y - w * 0.14}Q${x} ${y - w * 0.06} ${x + w * 0.41} ${y - w * 0.14}L${x + w * 0.4} ${y - w * 0.02}Q${x} ${y + w * 0.06} ${x - w * 0.4} ${y - w * 0.02}z`, t[3]), _pF(_pC(x, y - w * 0.58, w * 0.06), t[1])]);
    case 'party': return add([_pF(_pP`M${x - w * 0.3} ${y + w * 0.04}L${x + w * 0.04} ${y - w * 0.95}L${x + w * 0.34} ${y + w * 0.04}Q${x} ${y + w * 0.14} ${x - w * 0.3} ${y + w * 0.04}z`, t[0]),
      _pL(_pP`M${x - w * 0.16} ${y - w * 0.32}L${x + w * 0.22} ${y - w * 0.48}M${x - w * 0.24} ${y - w * 0.08}L${x + w * 0.3} ${y - w * 0.22}`, '#ffffff', Math.max(0.6, w * 0.07), 0.7),
      _pF(_pC(x + w * 0.04, y - w * 0.98, w * 0.11), '#f6d35e'), _pF(_pC(x - w * 0.14, y - w * 0.66, w * 0.035), '#ffffff', 0.9), _pF(_pC(x + w * 0.16, y - w * 0.15, w * 0.035), '#ffffff', 0.9)]);
    case 'tophat': return add([_pF(_pE(x, y + w * 0.02, w * 0.58, w * 0.13), _ptMix(t[3], '#000000', 0.2)), _pF(_pP`M${x - w * 0.34} ${y}L${x - w * 0.3} ${y - w * 0.78}Q${x} ${y - w * 0.86} ${x + w * 0.3} ${y - w * 0.78}L${x + w * 0.34} ${y}Q${x} ${y + w * 0.08} ${x - w * 0.34} ${y}z`, _ptMix(t[3], '#000000', 0.25)),
      _pF(_pP`M${x - w * 0.33} ${y - w * 0.2}Q${x} ${y - w * 0.12} ${x + w * 0.33} ${y - w * 0.2}L${x + w * 0.34} ${y - w * 0.04}Q${x} ${y + w * 0.04} ${x - w * 0.34} ${y - w * 0.04}z`, t[0]),
      _pL(_pP`M${x - w * 0.2} ${y - w * 0.7}L${x - w * 0.21} ${y - w * 0.28}`, '#ffffff', Math.max(0.5, w * 0.05), 0.25)]);
    case 'wizard': return add([_pF(_pE(x, y, w * 0.62, w * 0.14), t[1]), _pF(_pP`M${x - w * 0.36} ${y - w * 0.02}Q${x - w * 0.05} ${y - w * 0.5} ${x + w * 0.05} ${y - w * 1.05}Q${x + w * 0.18} ${y - w * 1.25} ${x + w * 0.42} ${y - w * 1.05}Q${x + w * 0.16} ${y - w * 0.92} ${x + w * 0.2} ${y - w * 0.5}Q${x + w * 0.26} ${y - w * 0.2} ${x + w * 0.38} ${y - w * 0.02}Q${x} ${y + w * 0.06} ${x - w * 0.36} ${y - w * 0.02}z`, t[0]),
      _pF(_ptStar(x - w * 0.06, y - w * 0.36, w * 0.13, w * 0.055), '#f6d77a'), _pF(_ptStar(x + w * 0.12, y - w * 0.7, w * 0.09, w * 0.04), '#f6d77a'), _pF(_pC(x + w * 0.42, y - w * 1.05, w * 0.07), '#f6d77a')]);
    case 'crown': return add([_pF(_pP`M${x - w * 0.42} ${y + w * 0.02}L${x - w * 0.46} ${y - w * 0.5}L${x - w * 0.22} ${y - w * 0.26}L${x} ${y - w * 0.6}L${x + w * 0.22} ${y - w * 0.26}L${x + w * 0.46} ${y - w * 0.5}L${x + w * 0.42} ${y + w * 0.02}Q${x} ${y + w * 0.1} ${x - w * 0.42} ${y + w * 0.02}z`, '#eab84a'),
      _pF(_pP`M${x - w * 0.42} ${y - w * 0.1}Q${x} ${y - w * 0.02} ${x + w * 0.42} ${y - w * 0.1}L${x + w * 0.42} ${y + w * 0.02}Q${x} ${y + w * 0.1} ${x - w * 0.42} ${y + w * 0.02}z`, '#cf9c2e'),
      _pF(_pC(x, y - w * 0.04, w * 0.06), '#e0475e'), _pF(_pC(x - w * 0.24, y - w * 0.05, w * 0.045), '#3b82f6'), _pF(_pC(x + w * 0.24, y - w * 0.05, w * 0.045), '#22a06b'),
      _pF(_pC(x - w * 0.46, y - w * 0.52, w * 0.05), '#f8e08a'), _pF(_pC(x, y - w * 0.62, w * 0.06), '#f8e08a'), _pF(_pC(x + w * 0.46, y - w * 0.52, w * 0.05), '#f8e08a')]);
    case 'witch': return add([_pF(_pE(x, y, w * 0.68, w * 0.14), '#2a2433'), _pF(_pP`M${x - w * 0.36} ${y - w * 0.02}Q${x - w * 0.18} ${y - w * 0.5} ${x + w * 0.02} ${y - w * 0.8}Q${x + w * 0.2} ${y - w * 1.08} ${x + w * 0.56} ${y - w * 1.02}Q${x + w * 0.3} ${y - w * 0.9} ${x + w * 0.26} ${y - w * 0.62}Q${x + w * 0.26} ${y - w * 0.3} ${x + w * 0.38} ${y - w * 0.02}Q${x} ${y + w * 0.06} ${x - w * 0.36} ${y - w * 0.02}z`, '#352d42'),
      _pF(_pP`M${x - w * 0.33} ${y - w * 0.14}Q${x} ${y - w * 0.06} ${x + w * 0.35} ${y - w * 0.14}L${x + w * 0.37} ${y - w * 0.02}Q${x} ${y + w * 0.06} ${x - w * 0.35} ${y - w * 0.02}z`, t[0]), _pL(_pE(x + w * 0.04, y - w * 0.08, w * 0.08, w * 0.06), '#f6d35e', Math.max(0.5, w * 0.04))]);
    case 'santa': return add([_pF(_pP`M${x - w * 0.46} ${y}Q${x - w * 0.4} ${y - w * 0.7} ${x + w * 0.1} ${y - w * 0.72}Q${x + w * 0.5} ${y - w * 0.66} ${x + w * 0.7} ${y - w * 0.18}L${x + w * 0.46} ${y}z`, '#d63a3a'),
      _pF(_pP`M${x - w * 0.52} ${y - w * 0.12}Q${x} ${y - w * 0.22} ${x + w * 0.52} ${y - w * 0.12}L${x + w * 0.53} ${y + w * 0.1}Q${x} ${y + w * 0.02} ${x - w * 0.53} ${y + w * 0.1}z`, '#f7f5f0'), _pF(_pC(x + w * 0.72, y - w * 0.16, w * 0.14), '#f7f5f0')]);
    case 'pumpkin': return add([_pF(_pE(x - w * 0.18, y - w * 0.22, w * 0.24, w * 0.26), '#e0782c'), _pF(_pE(x + w * 0.18, y - w * 0.22, w * 0.24, w * 0.26), '#e0782c'), _pF(_pE(x, y - w * 0.24, w * 0.24, w * 0.28), '#f08a3c'),
      _pL(_pP`M${x - w * 0.1} ${y - w * 0.42}Q${x - w * 0.14} ${y - w * 0.22} ${x - w * 0.1} ${y - w * 0.02}M${x + w * 0.1} ${y - w * 0.42}Q${x + w * 0.14} ${y - w * 0.22} ${x + w * 0.1} ${y - w * 0.02}`, '#c0601e', Math.max(0.5, w * 0.03), 0.8),
      _pL(_pP`M${x} ${y - w * 0.5}Q${x + w * 0.02} ${y - w * 0.66} ${x + w * 0.12} ${y - w * 0.7}`, '#5f7a3a', Math.max(0.7, w * 0.07)), _pF(_pE(x + w * 0.2, y - w * 0.62, w * 0.12, w * 0.06), '#7aa04a', 1, _ptRot(-20, x + w * 0.2, y - w * 0.62))]);
    case 'flowers': {
      const cols = ['#f6a5c0', '#fff4f8', '#f6d35e', '#c9a7f0', '#f6a5c0'];
      for (let i = 0; i < 5; i++) {
        const fx = x - w * 0.42 + i * w * 0.21, fy = y - w * 0.04 - Math.sin(i / 4 * Math.PI) * w * 0.1;
        out.push(_pF(_pE(fx + w * 0.07, fy + w * 0.06, w * 0.07, w * 0.03), '#5f9a52', 1, m));
        for (let q = 0; q < 5; q++) { const a = q * 1.2566 + i; out.push(_pF(_pC(fx + Math.cos(a) * w * 0.06, fy + Math.sin(a) * w * 0.06, w * 0.06), cols[i], 1, m)); }
        out.push(_pF(_pC(fx, fy, w * 0.035), '#f2b33d', 1, m));
      }
      return out;
    }
    default: return out;
  }
}
/* ---------- custom accessories (2.22): a design's shapes, placed on the head circle or the neck ---------- */
const _ptAffMul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const _ptAffRot = (deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; };
/**
 * The matrix that carries a design's frame onto the pet. head / face: the head circle (a.hc = [x, y, r]: the design's circle of
 * radius 50 becomes the pet's head, tilted like the head); neck: the collar line (a.neck = {x, y, w, rot}, 100 = its width).
 * fit {dx, dy, s, rot} is the person's nudge, in the design's own units. null when the species has no such anchor.
 */
function petItemMatrix(slot, a, fit) {
  fit = fit || { dx: 0, dy: 0, s: 1, rot: 0 };
  let ox, oy, k, tilt = 0;
  if (slot === 'neck') { const n = a && a.neck; if (!n) return null; ox = n.x; oy = n.y; k = n.w / 100; tilt = n.rot || 0; }
  else { const h = a && a.hc; if (!h) return null; ox = h[0]; oy = h[1]; k = h[2] / 50; tilt = (a.top && a.top[3]) || 0; }
  let M = [1, 0, 0, 1, ox, oy];
  M = _ptAffMul(M, _ptAffRot(tilt));
  M = _ptAffMul(M, [1, 0, 0, 1, fit.dx * k, fit.dy * k]);
  M = _ptAffMul(M, _ptAffRot(fit.rot));
  return _ptAffMul(M, [fit.s * k, 0, 0, fit.s * k, 0, 0]);
}
/** A canonical path (absolute M L C Q Z) carried through a matrix, to the drawing's own one-decimal numbers. The transform is baked into the numbers, so nothing downstream (the page's svg, the scene sprites) needs to know it. */
function _ptXformPath(p, M) {
  const segs = petItemPathSegs(p);
  if (!segs) return '';
  return segs.map(s => {
    let o = s[0];
    for (let k = 1; k < s.length; k += 2) o += (k > 1 ? ' ' : '') + _ptR(M[0] * s[k] + M[2] * s[k + 1] + M[4]) + ' ' + _ptR(M[1] * s[k] + M[3] * s[k + 1] + M[5]);
    return o;
  }).join('');
}
/** One worn design as drawing shapes {f, s, w, d, op, cap} (colours from its own slots, toned like every colour of the kit). */
function petItemShapes(item, a, species) {
  if (!item) return [];
  const M = petItemMatrix(item.slot, a, petItemFitOf(item, species));
  if (!M) return [];
  const tones = item.cols.map(_ptTone), k = Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2]));
  const col = (ref) => (ref === 'w' ? '#ffffff' : ref === 'i' ? _PTK_INK : (tones[Number(ref[1]) - 1] || tones[0])[ref.length > 2 ? 'sld'.indexOf(ref[2]) + 1 : 0]);
  const out = [];
  for (const s of item.shapes) {
    const d = _ptXformPath(s.p, M);
    if (d) out.push({ f: s.f ? col(s.f) : null, s: s.s ? col(s.s) : null, w: _ptR((s.w || 0) * k), d, op: s.o == null ? 1 : s.o, cap: 'round', m: null });
  }
  return out;
}
/** The designs a pet wears right now: {itemHead, itemFace, itemNeck} -> clean designs, from pet0.items {field: design} (the page resolves ids to designs). Only a design whose id is the one worn counts. */
function _ptWornItems(pet, src) {
  const items = src && src.items && typeof src.items === 'object' ? src.items : null;
  if (!items) return null;
  let out = null;
  for (const f of _PT_ITEM_FIELDS) {
    const it = pet[f] && items[f] ? petItemTrusted(items[f]) : null;
    if (it && it.id === pet[f]) (out = out || {})[f] = it;
  }
  return out;
}
function _ptItemAcc(pet, worn, a) {
  const out = { neck: [], head: [] };
  if (!worn) return out;
  for (const [field, list] of [['itemNeck', out.neck], ['itemHead', out.head], ['itemFace', out.head]]) if (worn[field]) list.push(...petItemShapes(worn[field], a, pet.species));
  return out;
}
/** The accessories on a pet: {neck, head} shapes. a: anchors {neck: {x, y, w, rot}, top: [x, y, w, tilt], eyes: [x1, x2, y, r], ear: [x, y, s], hc: [x, y, r] (the head circle)}. worn: the custom designs (see _ptWornItems). */
function _ptAccs(pet, X, a, worn) {
  const rb = (sh, key) => (X.rainbow(key) ? _ptRainbow(sh) : sh);
  const it = _ptItemAcc(pet, worn, a);
  return { neck: rb(_ptCollar(pet, X, a.neck), 'collarCol').concat(rb(_ptBandana(pet, X, a.neck), 'bandanaCol'), it.neck), head: rb(_ptBow(pet, X, a.ear), 'bowCol').concat(rb(_ptHat(pet, X, a.top), 'hatCol')).concat(_ptGlasses(pet, X, a.eyes), it.head) };
}
/** Rainbow accessories: the base-coloured shapes take the rainbow in turn. */
function _ptRainbow(list) {
  const rb = ['#e0473e', '#f08a3c', '#f4cf4a', '#3fa463', '#3b74d6', '#7a4ccc'];
  let i = 0;
  return list.map(s => (s.f === '#e0473e' ? Object.assign({}, s, { f: rb[i++ % rb.length] }) : s));
}

/* ---------- the drawing, assembled ---------- */
const PET_POSES = Object.freeze(['sit', 'walk', 'sleep']);
/** The pet's parts for a pose and a mood, with its accessories and the mood's extras. */
function petArt(pet0, pose, mood) {
  const pet = petNormalize(pet0);
  pose = PET_POSES.includes(pose) ? pose : 'sit';
  mood = Object.assign({}, mood && typeof mood === 'object' ? mood : {});
  if (pose === 'sleep') { mood.eyes = 'closed'; mood.mouth = 'calm'; }
  const X = _ptPal(pet);
  const fn = (typeof _PT_ART !== 'undefined' && _PT_ART[pet.species]) || null;
  if (!fn) return null;
  const A = fn(pet, pose, mood, X);
  const acc = _ptAccs(pet, X, A.acc || {}, _ptWornItems(pet, pet0));
  if (pose !== 'sleep') A.parts.neck.push(...acc.neck);   // curled up, the chin hides the collar
  A.parts.acc = acc.head;
  if (!A.order.includes('acc')) A.order.splice(A.order.indexOf('eyes') + 1, 0, 'acc');
  // the mood's extras, by the head
  const e = A.acc && A.acc.eyes ? A.acc.eyes : [50, 60, 40, 3], hx = e[1] + 9, hy = Math.max(10, (A.top || 30) + 10);
  if (mood.extra === 'zzz' || pose === 'sleep') A.parts.fx.push(_pL(_pP`M${hx} ${hy}L${hx + 5} ${hy}L${hx} ${hy + 5}L${hx + 5} ${hy + 5}`, '#7a86b8', 1.4, 0.9), _pL(_pP`M${hx + 7} ${hy - 7}L${hx + 10.4} ${hy - 7}L${hx + 7} ${hy - 3.6}L${hx + 10.4} ${hy - 3.6}`, '#7a86b8', 1.1, 0.7));
  if (mood.extra === 'sparkle') A.parts.fx.push(_pF(_ptStar(hx + 2, hy, 4.2, 1.5, 4), '#f6d35e'), _pF(_ptStar(e[0] - 12, hy + 6, 2.8, 1, 4), '#f6d35e', 0.85), _pF(_ptStar(hx + 8, hy + 12, 2, 0.7, 4), '#ffffff', 0.9));
  if (mood.extra === 'hearts') A.parts.fx.push(_pF(_pHeart(hx + 2, hy, 3.2), '#f2607a'), _pF(_pHeart(hx + 9, hy - 7, 2.2), '#f58aa0', 0.85));
  A.pet = pet; A.pose = pose; A.mood = mood;
  return A;
}
/** One shape as SVG (every value a table colour, a number or path data written here). */
function _ptShapeSvg(s, small) {
  if (!s || !s.d || s.op === 0 || (small && s.detail)) return '';
  let a = `<path d="${s.d}" fill="${s.f && s.f !== 'none' ? s.f : 'none'}"`;
  if (s.s) a += ` stroke="${s.s}" stroke-width="${_ptR(s.w || 1)}" stroke-linecap="${s.cap === 'butt' ? 'butt' : 'round'}" stroke-linejoin="round"`;
  if (s.dash && /^[0-9. ]+$/.test(s.dash)) a += ` stroke-dasharray="${s.dash}"`;
  if (s.op != null && s.op !== 1) a += ` opacity="${Math.round(s.op * 100) / 100}"`;
  if (Array.isArray(s.m)) a += ` transform="matrix(${s.m.map(_ptR).join(' ')})"`;
  return a + '/>';
}
/** A part wrapped so CSS can turn it about its pivot: translate(p) > g.pt-<name> > translate(-p). */
function _ptPivot(name, inner, p) {
  if (!inner) return '';
  if (!p) return `<g class="pt-${name}">${inner}</g>`;
  return `<g transform="translate(${_ptR(p[0])} ${_ptR(p[1])})"><g class="pt-${name}"><g transform="translate(${_ptR(-p[0])} ${_ptR(-p[1])})">${inner}</g></g></g>`;
}
/** The parts as nested groups (the head, its eyes and accessories turn together). */
function _ptGroupsSvg(A, small) {
  const sh = (name) => (A.parts[name] || []).map(s => _ptShapeSvg(s, small)).join('');
  let body = '', headIn = '';
  for (const name of A.order) {
    if (name === 'head') headIn += sh('head');
    else if (name === 'eyes') headIn += _ptPivot('eyes', sh('eyes'), A.piv.eyes);
    else if (name === 'acc') headIn += sh('acc');
    else if (name === 'fx') continue;
    else if (name === 'body' || name === 'neck') body += `<g class="pt-${name}">${sh(name)}</g>`;
    else body += _ptPivot(name, sh(name), A.piv[name]);
  }
  body += _ptPivot('head', headIn, A.piv.head);
  return _ptPivot('bodyg', body, A.piv.body || [50, 90]) + `<g class="pt-fx">${sh('fx')}</g>`;
}
/**
 * The pet as an <svg> string. o: {size (px, default 64), pose, mood, cls, motion (adds pt-live: the CSS idle animations),
 * shadow (a soft ground shadow, default on), crop: 'head' | 'none' (default: trimmed to the drawing's height)}.
 */
function petSvg(pet, o) {
  o = o || {};
  const A = petArt(pet, o.pose, o.mood);
  const size = Math.max(12, Math.min(512, Math.round(Number(o.size) || 64)));
  if (!A) return `<svg class="pt-svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"></svg>`;
  const small = size < 36;
  let vb = '0 0 100 100';
  if (o.crop === 'head' && A.acc && A.acc.eyes) { const e = A.acc.eyes, cx = (e[0] + e[1]) / 2, cy = e[2] + 2; vb = `${_ptR(cx - 27)} ${_ptR(cy - 30)} 54 54`; }
  else if (o.crop !== 'none') { const t = Math.max(0, Math.min(30, (A.top || 10) - 4)); if (t > 6) vb = `${_ptR(t / 2)} ${_ptR(t)} ${_ptR(100 - t)} ${_ptR(100 - t)}`; }
  const cls = 'pt-svg pt-sp-' + A.pet.species + ' pt-pose-' + A.pose + (o.motion ? ' pt-live' : '') + (o.cls ? ' ' + String(o.cls).replace(/[^a-z0-9 _-]/gi, '') : '');
  const sw = A.bird ? 14 : A.pet.species === 'dog' && (A.pet.breed === 'dachshund' || A.pet.breed === 'corgi') ? 30 : 24;
  const shadow = o.shadow === false ? '' : `<ellipse cx="${A.pose === 'walk' ? 48 : 50}" cy="90.4" rx="${sw}" ry="2.6" fill="#1a1420" opacity="0.13"/>`;
  return `<svg class="${cls}" viewBox="${vb}" width="${size}" height="${size}" aria-hidden="true" focusable="false">${shadow}${_ptGroupsSvg(A, small)}</svg>`;
}
/**
 * The same drawing as a <g> string with its feet at (0, 0) in the caller's units: o {h (the pet's height there, default 24),
 * pose, mood, face (1 right, -1 left), shadow, cls}. For the garden (petGardenSprite) and other SVG scenes of the page.
 */
function petSvgGroup(pet, o) {
  o = o || {};
  const A = petArt(pet, o.pose || 'walk', o.mood);
  if (!A) return '';
  const top = Math.max(0, Math.min(60, A.top || 20)), k = (Number(o.h) || 24) / (90 - top), f = o.face === -1 ? -1 : 1;
  const shadow = o.shadow === false ? '' : `<ellipse cx="0" cy="0.4" rx="${_ptR(22 * k)}" ry="${_ptR(2.4 * k)}" fill="#1a1420" opacity="0.14"/>`;
  return `<g class="pt-g pt-sp-${A.pet.species} pt-pose-${A.pose}${o.cls ? ' ' + String(o.cls).replace(/[^a-z0-9 _-]/gi, '') : ''}">${shadow}<g transform="scale(${Math.round(f * k * 1000) / 1000} ${Math.round(k * 1000) / 1000}) translate(-50 -90)">${_ptGroupsSvg(A, (Number(o.h) || 24) < 30)}</g></g>`;
}

/* ---------- treats ---------- */
const _PT_TREATS = {
  fish: () => [_pF('M3 12Q8 6 15 9L20 6L19 12L20 18L15 15Q8 18 3 12z', '#f2a65a'), _pF(_pC(7, 11, 1.1), '#2a2124'), _pL('M11 9Q12.5 12 11 15', '#d9823a', 0.9)],
  bone: () => [_pF('M6 9.5a2.6 2.6 0 1 1 3-3.2L15 6.3a2.6 2.6 0 1 1 3 3.2a2.6 2.6 0 1 1-3 3.2L9 12.7a2.6 2.6 0 1 1-3-3.2z', '#f3e3c4', 1, _ptRot(-20, 12, 9.5)), _pL('M8 9.6L16 9.6', '#d9c49a', 0.9, 0.7, _ptRot(-20, 12, 9.5))],
  carrot: () => [_pF('M6 18L15 7Q18 6 18 9L8 20Q5 21 6 18z', '#f08a3c'), _pL('M10 14l1.6 1.4M12.4 11.2l1.6 1.4', '#c8641e', 0.8), _pF('M16 7Q15 3 17 2Q18 5 17.4 6.6Q20 4 22 5Q19.6 7 18 8z', '#5fae4a')],
  seed: () => [_pF(_pE(12, 12, 4.4, 7.4), '#4a3a32', 1, _ptRot(25, 12, 12)), _pL('M10.4 7.4Q12.8 12 11.6 17', '#f2ead8', 1.2, 0.9, _ptRot(25, 12, 12)), _pF(_pE(9.6, 10.4, 1, 2.6), '#7a6a5a', 0.6, _ptRot(25, 12, 12))],
  leaf: () => [_pF('M4 19Q4 6 19 4Q19 18 4 19z', '#6cbf4a'), _pL('M5 18Q11 12 17 6', '#4a9a32', 1)],
  berry: () => [_pF(_pC(9, 13, 4.6), '#5a4ad0'), _pF(_pC(15, 14, 4.2), '#4a3ab8'), _pF(_pC(12, 9, 4.2), '#6a5ae0'), _pF(_pC(10.6, 7.6, 1.2), '#ffffff', 0.6), _pL('M12 5L13 2.4', '#5f9a52', 1.2)],
  strawberry: () => [_pF('M5 9Q12 6 19 9Q18 18 12 21Q6 18 5 9z', '#e8433e'), _pF('M6 8.6L9 6L12 7.6L15 6L18 8.6Q12 10 6 8.6z', '#5fae4a'), ...[[9, 12], [13, 12], [11, 15.4], [15, 15], [8, 15.6], [12, 18.4]].map(([x, y]) => _pF(_pE(x, y, 0.5, 0.8), '#f6d35e'))],
  pellet: () => [_pF(_pC(8, 13, 3.4), '#c58a4e'), _pF(_pC(15, 11, 3.6), '#b57a40'), _pF(_pC(12, 17, 3.2), '#d29a5a'), _pF(_pC(7, 12, 1), '#ffffff', 0.4)],
  bamboo: () => [_pF('M10 3h4v18h-4z', '#7cc06a'), _pL('M10 9h4M10 15h4', '#4a8a3a', 1.2), _pF('M14 8Q19 5 21 7Q18 9 14 9z', '#5fae4a'), _pF('M10 13Q5 11 3 13Q6 15 10 14z', '#5fae4a')],
  pea: () => [_pF('M3 14Q12 5 21 11Q14 19 3 14z', '#7cc06a'), _pF(_pC(8.4, 12.4, 2.2), '#a6d86a'), _pF(_pC(12.6, 11.4, 2.3), '#a6d86a'), _pF(_pC(16.6, 11.6, 2.1), '#a6d86a')],
  millet: () => [_pL('M12 21L12 4', '#c8a04a', 1.2), ...[5, 8, 11, 14, 17].flatMap(y => [_pF(_pE(10, y, 2.2, 1.6), '#e8c76a'), _pF(_pE(14, y + 1, 2.2, 1.6), '#dcb85a')])],
  chilli: () => [_pF('M17 6Q19 12 12 18Q7 21 4 19Q11 16 13 7z', '#e0473e'), _pF('M13 7Q15 3 18 4L17 6Q15 5 15 8z', '#5fae4a'), _pL('M12 9Q11 14 7 17', '#ff8a7a', 0.9, 0.6)],
  sunberry: () => [_pF(_pC(12, 13, 6.4), '#f6b93b'), _pF(_pC(12, 13, 4.4), '#fbd56a'), _pF(_ptStar(12, 13, 2.6, 1, 5), '#fff4c0'), _pL('M12 6.6L13 3', '#5f9a52', 1.2)],
  apple: () => [_pF('M12 7Q6 4 4 10Q4 18 10 20Q12 19.4 14 20Q20 18 20 10Q18 4 12 7z', '#e8433e'), _pL('M12 7L13 3', '#7a5a3a', 1.2), _pF('M13 5Q16 2 19 4Q16 6 13 5z', '#5fae4a'), _pF(_pE(8, 10, 1.4, 2.4), '#ffffff', 0.4)],
  battery: () => [_pF('M6 6h12v14h-12z', '#3a3d44'), _pF('M10 4h4v2h-4z', '#9aa2ae'), _pF('M7.5 12h9v6.5h-9z', '#6cd06a'), _pF('M12.6 7.4L10 12.4h2.4L11.4 16.4L14.4 11h-2.4z', '#f6d35e')],
  cookie: () => [_pF(_pC(12, 12, 8.4), '#d9a35a'), _pF(_pC(12, 12, 6.8), '#e3b06a'), ...[[9, 9], [14, 8.4], [15.4, 13], [10, 14.6], [12.4, 11.4]].map(([x, y]) => _pF(_pC(x, y, 1.1), '#6a4228'))],
};
function petTreatSvg(kind, size) {
  const f = _PT_TREATS[kind] || _PT_TREATS.cookie, s = Math.max(10, Math.min(96, Math.round(Number(size) || 24)));
  return `<svg class="pt-treat" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" focusable="false">${f().map(x => _ptShapeSvg(x)).join('')}</svg>`;
}

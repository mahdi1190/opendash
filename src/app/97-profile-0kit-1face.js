/* ============================================================
   PROFILE, the avatar kit: THE FACE (2.18, agent 'wardrobe'). PURE, like 97-profile-0kit.js
   (read its header): function declarations and literal tables only, nothing drawn at load. This file
   sorts before the kit's main file, so it uses the kit's drawing helpers (_pfP, _pfS, _pfC, _pfE,
   _pfBoth, _pfBothS, _pfStar, _pfSpark, _pfN, _pfMix, _PF_INK, _PF_MOUTH, _PF_MOUSTACHE) only inside
   functions, which run after everything is loaded.

   The face sits in the kit's 100 x 100 box: the head egg x 30.6-69.4, y 22-66.2, the eyes at (42, 46) and
   (58, 46), the brows near y 39.6, the nose line at x 50, the mouth near y 58, the ears' lobes near y 52.
     _pfEyeMore(cx, kind, side, eyeHex, small)   almond, closed (content), glance, focused, sparkle
     _pfBrowsMore(kind, col)                     bushy, thin, curious (one raised), slit
     _pfMouthMore(kind, mc) / _pfMouthLips(kind, lip)   small, beam, laugh, teeth, gap, cat, kiss, whistle; any mouth in a lip colour
     _pfFacialBaseMore / _pfFacialTopMore        pencil, chevron, soul patch, anchor, chinstrap, sideburns, long and braided beards
     _pfCheeks(kind, sk, small)                  every Cheeks option (the 2.17 ones drawn exactly as before)
     _pfBeauty, _pfPaint, _pfLiner, _pfEarrings, _pfNose, _pfPiercing   the Details and Jewellery tabs
   ============================================================ */
const _PF_EYES_MORE = new Set(['almond', 'closed', 'glance', 'focused', 'sparkle']);
const _PF_BROWS_MORE = new Set(['bushy', 'thin', 'curious', 'slit']);
const _PF_MOUTHS_MORE = new Set(['small', 'beam', 'laugh', 'teeth', 'gap', 'cat', 'kiss', 'whistle']);
const _PF_FACIAL_MORE = new Set(['pencil', 'chevron', 'soul', 'anchor', 'chin', 'chops', 'long', 'braided']);
/** Lip colours: [the lip, its darker line]. */
const _PF_LIPS = Object.freeze({ gloss: ['#d98a86', '#a85a5a'], nude: ['#c08a76', '#8e5a4a'], rose: ['#d0607a', '#9a3a52'], coral: ['#ef7a5a', '#b84a32'],
  red: ['#c8202e', '#86121c'], berry: ['#8a2a4a', '#5a1430'], plum: ['#6a2a5a', '#42143a'], black: ['#2a2226', '#0e0a0c'] });

/* ---------- eyes ---------- */
function _pfEyeMore(cx, kind, side, eyeHex, small) {
  const y = 46, o = side < 0 ? -1 : 1, X = (v) => _pfN(cx + v), Y = (v) => _pfN(y + v);
  const inner = -3.8 * o, outer = 4.2 * o;   // the eye's inner corner (towards the nose) and outer corner, as offsets
  switch (kind) {
    case 'almond': {
      const d = `M${X(inner)} ${Y(0.5)} Q${X(-0.4 * o)} ${Y(-3.4)} ${X(outer)} ${Y(-1.1)} Q${X(0.8 * o)} ${Y(2.9)} ${X(inner)} ${Y(0.5)} Z`;
      return _pfP(d, '#ffffff') + _pfC(cx + 0.2 * o, y - 0.2, 1.9, eyeHex) + _pfC(cx + 0.2 * o, y - 0.2, 0.9, _PF_INK) + _pfC(cx + 0.9, y - 0.9, 0.55, '#ffffff')
        + _pfS(`M${X(inner)} ${Y(0.4)} Q${X(-0.4 * o)} ${Y(-3.5)} ${X(outer + 0.5 * o)} ${Y(-1.5)}`, _PF_INK, small ? 1.6 : 1.25);
    }
    case 'closed':
      return _pfS(`M${X(-3.4)} ${Y(-0.6)} Q${X(0)} ${Y(2.4)} ${X(3.4)} ${Y(-0.6)}`, _PF_INK, 1.6)
        + (small ? '' : _pfS(`M${X(outer - 0.8 * o)} ${Y(-0.5)} L${X(outer + 0.5 * o)} ${Y(-1.6)}`, _PF_INK, 0.9));
    case 'glance':
      return _pfE(cx, y, 4, 3.5, '#ffffff') + _pfC(cx + 1.6, y + 0.2, 2.1, eyeHex) + _pfC(cx + 1.8, y + 0.2, 1, _PF_INK) + _pfC(cx + 2.4, y - 0.6, 0.6, '#ffffff')
        + (small ? '' : _pfS(`M${X(-4)} ${Y(-0.6)} Q${X(0)} ${Y(-4.4)} ${X(4)} ${Y(-0.6)}`, _PF_INK, 0.9, 0.7));
    case 'focused':
      return _pfP(`M${X(-2.5)} ${Y(-0.7)} A2.5 2.5 0 0 0 ${X(2.5)} ${Y(-0.7)} Z`, _PF_INK) + (small ? '' : _pfC(cx + 0.8, y + 0.4, 0.6, '#ffffff', 0.85))
        + _pfS(`M${X(-3.7)} ${Y(-0.6)} Q${X(0)} ${Y(-1.5)} ${X(3.7)} ${Y(-0.9)}`, _PF_INK, 1.6);
    case 'sparkle': {
      const deep = _pfMix(eyeHex, _PF_INK, 0.55);
      let s = _pfE(cx, y, 3.1, 3.7, deep) + _pfE(cx, y + 1.3, 2.3, 1.7, eyeHex, 0.9) + _pfC(cx + 1, y - 1.4, 1.25, '#ffffff') + _pfC(cx - 1.1, y + 1.5, 0.6, '#ffffff', 0.9);
      if (!small) s += _pfS(`M${X(-3.4)} ${Y(-2)} Q${X(0)} ${Y(-4.8)} ${X(3.4)} ${Y(-2)}`, _PF_INK, 1) + _pfS(`M${X(outer - 1 * o)} ${Y(-2.6)} L${X(outer + 0.4 * o)} ${Y(-3.6)}`, _PF_INK, 0.8);
      return s;
    }
    default: return _pfC(cx, y, 2.5, _PF_INK);
  }
}

/* ---------- brows ---------- */
function _pfBrowsMore(kind, col) {
  switch (kind) {
    case 'bushy': return _pfBoth('M37.6 41.4 Q41.4 36.6 46.6 39 L46.4 41.2 Q41.8 39.4 38.2 42.8 Z', col)
      + _pfBothS('M39.4 40.6 L40.4 38.8 M42 40 L42.8 38.2 M44.2 39.8 L44.8 38.4', _pfMix(col, '#000000', 0.25), 0.5, 0.6);
    case 'thin': return _pfBothS('M38.6 40 Q42 37.6 45.4 39.2', col, 0.85);
    case 'curious': return _pfS('M38.4 40.2 Q42 38 45.6 39.8', col, 1.5) + _pfS('M54.4 38.2 Q58 33.6 61.8 36.8', col, 1.6);
    case 'slit': return _pfS('M38.4 40.2 Q42 38 45.6 39.8', col, 1.6) + _pfS('M54.4 39.8 Q55.6 38.7 56.9 38.4', col, 1.6) + _pfS('M58.3 38.2 Q60 38.1 61.6 39.6', col, 1.6);
    default: return '';
  }
}

/* ---------- mouths ---------- */
function _pfMouthMore(kind, mc) {
  switch (kind) {
    case 'small': return _pfS('M47.2 58 Q50 60.4 52.8 58', mc, 1.5);
    case 'beam': return _pfS('M43 56.6 Q50 63.6 57 56.6', mc, 1.8) + _pfBothS('M41.9 55.5 Q42.4 56.6 43.5 56.9', mc, 0.9, 0.7);
    case 'laugh': return _pfP('M43.4 56 Q50 54.8 56.6 56 Q55.8 66 50 66 Q44.2 66 43.4 56 Z', mc)
      + _pfP('M44.6 56.5 Q50 55.6 55.4 56.5 L55 58.4 Q50 59.1 45 58.4 Z', '#ffffff') + _pfE(50, 63.4, 3.6, 1.9, '#e67a8a');
    case 'teeth': return _pfP('M44 56.4 Q50 57.4 56 56.4 Q55 62.6 50 62.8 Q45 62.6 44 56.4 Z', '#ffffff')
      + _pfS('M44.8 59.3 Q50 60.4 55.2 59.3', '#d6ccc8', 0.5) + _pfS('M47.4 57.2 L47.6 61.6 M50 57.5 L50 62.5 M52.6 57.2 L52.4 61.6', '#d6ccc8', 0.5)
      + `<path d="M44 56.4 Q50 57.4 56 56.4 Q55 62.6 50 62.8 Q45 62.6 44 56.4 Z" fill="none" stroke="${mc}" stroke-width="1.2" stroke-linejoin="round"/>`;
    case 'gap': return _pfP('M44 56.8 Q50 64.6 56 56.8 Q50 58.2 44 56.8 Z', mc) + _pfBoth('M47.5 57.5 L49.6 57.9 L49.6 60.3 Q48.6 60.8 47.7 60 Z', '#ffffff');
    case 'cat': return _pfS('M45.4 57.2 Q47.6 60 50 57.6 Q52.4 60 54.6 57.2', mc, 1.5);
    case 'kiss': return _pfE(50, 58.2, 1.8, 1.25, '#c8485e') + _pfE(50, 60.2, 2.1, 1.35, '#d85a70') + _pfS('M48.6 59.2 L51.4 59.2', '#8a2a3e', 0.6, 0.8)
      + _pfP('M61.6 57.4 C59.4 55.6 59.6 53.4 61.6 54.6 C63.6 53.4 63.8 55.6 61.6 57.4 Z', '#e0475e', 0.9);
    case 'whistle': return _pfE(51.6, 58.8, 1.5, 1.8, mc) + _pfE(51.6, 59.2, 0.8, 0.9, '#7a3a40')
      + _pfS('M60.6 50.6 L60.6 55.6', '#2a2124', 0.7, 0.8) + _pfE(59.6, 55.8, 1.2, 0.9, '#2a2124', 0.8, -20) + _pfS('M60.6 50.6 Q62.4 51.4 62.6 53', '#2a2124', 0.7, 0.8);
    default: return '';
  }
}
/** Any mouth in a lip colour: line mouths become lips of that colour, open ones get a coloured rim; gloss adds a shine. */
function _pfMouthLips(kind, lip) {
  const L = _PF_LIPS[lip] || _PF_LIPS.rose;
  if (kind === 'smile' || kind === 'small') {
    const w = kind === 'small' ? 0.55 : 1;
    const X = (v) => _pfN(50 + (v - 50) * w);
    let s = _pfP(`M${X(44.4)} 57.1 Q${X(47.2)} 55.7 50 56.6 Q${X(52.8)} 55.7 ${X(55.6)} 57.1 Q50 63.4 ${X(44.4)} 57.1 Z`, L[0])
      + _pfS(`M${X(44.8)} 57.5 Q50 59.9 ${X(55.2)} 57.5`, L[1], 0.9);
    if (lip === 'gloss') s += _pfE(51.6, 60.3, 1.5 * w, 0.55, '#ffffff', 0.7);
    return s;
  }
  let m = _PF_MOUTHS_MORE.has(kind) ? _pfMouthMore(kind, _PF_MOUTH) : _pfMouth(kind, '');
  m = m.replace(/stroke="#5a2a2e" stroke-width="([\d.]+)"/g, (x, w) => `stroke="${L[0]}" stroke-width="${_pfN(Number(w) + 0.9)}"`)
    .replace(/fill="#5a2a2e"/g, `fill="${L[1]}" stroke="${L[0]}" stroke-width="1.1" stroke-linejoin="round"`);
  if (lip === 'gloss') m += _pfE(52.6, 60.6, 1, 0.45, '#ffffff', 0.6);
  return m;
}

/* ---------- facial hair ---------- */
function _pfFacialBaseMore(kind, hc) {
  switch (kind) {
    case 'soul': return _pfP('M48.6 61.7 Q50 61.1 51.4 61.7 L50.9 63.9 Q50 64.5 49.1 63.9 Z', hc[0]);
    case 'anchor': return _pfP('M44.8 61.2 Q50 60.1 55.2 61.2 Q55.4 67 50 70.6 Q44.6 67 44.8 61.2 Z', hc[0]) + _pfBothS('M44.9 61.4 Q42.2 60.8 41.4 57.6', hc[0], 1.5)
      + _pfS('M48 66 Q50 68.6 52 66', hc[1], 0.7, 0.6);
    case 'chin': return _pfS('M31.4 46 C32 60 40.6 66.8 50 66.8 C59.4 66.8 68 60 68.6 46', hc[0], 2.6) + _pfP('M47 64.4 Q50 63.6 53 64.4 L52.4 66.8 Q50 67.8 47.6 66.8 Z', hc[0]);
    case 'chops': return _pfBoth('M31 41.6 L34.6 42.4 Q34.8 51.4 38.8 57.8 Q35.4 59.6 33 55.4 Q30.8 50.6 31 41.6 Z', hc[0])
      + _pfBothS('M33 46 Q33.4 52 35.6 56', hc[1], 0.6, 0.5);
    case 'long': return _pfP('M30.6 44 C30 63 35.6 75 41.4 81.4 Q45.6 86.6 50 89.6 Q54.4 86.6 58.6 81.4 C64.4 75 70 63 69.4 44 L66.6 45.4 C65.8 53.6 60 59.6 50 60 C40 59.6 34.2 53.6 33.4 45.4 Z', hc[0])
      + _pfS('M41 66 Q42.6 74 46 81 M50 67 L50 86 M59 66 Q57.4 74 54 81', hc[1], 0.9, 0.6) + _pfS('M37.6 60 Q39.4 68 43 74', hc[2], 0.9, 0.45);
    case 'braided': {
      let s = _pfP('M30.6 44 C30.2 62 39 73.6 50 73.6 C61 73.6 69.8 62 69.4 44 L66.6 45.4 C65.8 53.6 60 59.6 50 60 C40 59.6 34.2 53.6 33.4 45.4 Z', hc[0]);
      for (let i = 0; i < 4; i++) { const y = 73.6 + i * 3.6; s += _pfE(50, y, 2.5 - i * 0.2, 2.1, hc[i % 2 ? 1 : 0]) + _pfS(`M${_pfN(47.8 + i * 0.2)} ${_pfN(y - 0.6)} Q50 ${_pfN(y + 1.2)} ${_pfN(52.2 - i * 0.2)} ${_pfN(y - 0.6)}`, hc[1], 0.6, 0.7); }
      return s + `<rect x="47.6" y="87" width="4.8" height="3" rx="1.2" fill="#d9b04a"/>` + _pfS('M48.2 88.4 L51.8 88.4', '#9a7a26', 0.5);
    }
    default: return '';
  }
}
function _pfFacialTopMore(kind, hc) {
  switch (kind) {
    case 'pencil': return _pfS('M44.8 55.8 Q47.4 54.5 50 55.3 Q52.6 54.5 55.2 55.8', hc[0], 0.95);
    case 'chevron': return _pfP('M42.8 57.4 Q43 52.4 50 53.5 Q57 52.4 57.2 57.4 Q53.8 55.8 50 56.4 Q46.2 55.8 42.8 57.4 Z', hc[0])
      + _pfS('M45 55.6 L45.6 54.2 M47.4 55.2 L47.8 53.8 M52.6 55.2 L52.2 53.8 M55 55.6 L54.4 54.2', hc[1], 0.5, 0.6);
    case 'anchor': case 'long': case 'braided': return _pfP(_PF_MOUSTACHE, hc[0]);
    default: return '';
  }
}

/* ---------- cheeks, beauty marks ---------- */
function _pfHeartD(x, y, r) {
  return `M${_pfN(x)} ${_pfN(y + r * 0.9)} C${_pfN(x - r * 1.5)} ${_pfN(y - r * 0.1)} ${_pfN(x - r * 0.9)} ${_pfN(y - r * 1.25)} ${_pfN(x)} ${_pfN(y - r * 0.45)} C${_pfN(x + r * 0.9)} ${_pfN(y - r * 1.25)} ${_pfN(x + r * 1.5)} ${_pfN(y - r * 0.1)} ${_pfN(x)} ${_pfN(y + r * 0.9)} Z`;
}
function _pfCheeks(kind, sk, small) {
  const blush = (op, k) => _pfE(38.6, 55.2, 4 * k, 2.3 * k, '#f08080', op) + _pfE(61.4, 55.2, 4 * k, 2.3 * k, '#f08080', op);
  const freck = (pts, r) => pts.map(([x, y]) => _pfC(x, y, r || 0.65, sk[3], 0.45) + _pfC(100 - x, y, r || 0.65, sk[3], 0.45)).join('');
  const F4 = [[38.2, 51.4], [40.6, 52.8], [42.8, 51.2], [39.8, 54.4]];
  switch (kind) {
    case 'blush': return blush(0.32, 1);
    case 'freckles': return small ? '' : freck(F4);
    case 'both': return blush(0.32, 1) + (small ? '' : freck(F4));
    case 'rosy': return _pfC(38.4, 55.4, 4.6, '#f0607a', 0.3) + _pfC(61.6, 55.4, 4.6, '#f0607a', 0.3) + (small ? '' : _pfC(37.2, 54, 1, '#ffffff', 0.35) + _pfC(60.4, 54, 1, '#ffffff', 0.35));
    case 'sunkissed': return _pfE(50, 52.2, 15.5, 3.2, '#f0806a', 0.2) + blush(0.16, 1)
      + (small ? '' : freck([[44.8, 51.6], [46.6, 50.6], [43, 52.8], [41, 51]], 0.55));
    case 'lots': return small ? blush(0.14, 1) : freck([[38.2, 51.4], [40.6, 52.8], [42.8, 51.2], [39.8, 54.4], [36.4, 53.2], [41.8, 55.4], [44.4, 53.4], [37.4, 49.8],
      [43.8, 49.6], [46.2, 51.8], [35.6, 50.8], [39.2, 56.4]], 0.6);
    case 'dimples': return blush(0.18, 0.9) + (small ? '' : _pfBothS('M42.4 59.4 Q42.6 60.8 43.6 61.2', sk[3], 0.9, 0.55));
    case 'hearts': return _pfP(_pfHeartD(38.8, 55, 2.6), '#f06a8a', 0.55) + _pfP(_pfHeartD(61.2, 55, 2.6), '#f06a8a', 0.55);
    default: return '';
  }
}
function _pfBeauty(kind, small) {
  if (small || kind === 'none') return '';
  const at = { cheek: [61.8, 53.2], lip: [54.6, 55.4], eye: [37.4, 50.4], chin: [52.4, 63.6] }[kind];
  return at ? _pfC(at[0], at[1], 0.75, '#3a2420', 0.85) : '';
}

/* ---------- face paint ---------- */
function _pfPaint(kind, sk, small) {
  if (kind === 'none') return '';
  const det = (s) => (small ? '' : s);
  switch (kind) {
    case 'whiskers': return _pfP('M48.2 51.1 L51.8 51.1 Q51.2 53 50 53.5 Q48.8 53 48.2 51.1 Z', '#3a2a2e')
      + det(_pfBothS('M40.4 53.4 L32.6 51.8 M40.6 55 L32.2 55.2 M40.6 56.6 L33 58.4', '#3a2a2e', 0.7, 0.8));
    case 'heart': return _pfP(_pfHeartD(61.6, 54.4, 3), '#e8475e', 0.92) + det(_pfC(60.4, 53.4, 0.6, '#ffffff', 0.6));
    case 'star': { const d = _pfStar(61.8, 54.2, 3.4, 1.45, 5); return _pfP(d, '#f6c945') + det(`<path d="${d}" fill="none" stroke="#c8902a" stroke-width="0.5"/>`); }
    case 'rainbow': return [['#e5534b', 3.6], ['#f4d35e', 2.7], ['#4caf6a', 1.8], ['#3b82f6', 0.9]].map(([c, r]) => _pfS(`M${_pfN(61.6 - r)} 56.8 A${r} ${r} 0 0 1 ${_pfN(61.6 + r)} 56.8`, c, 0.85)).join('')
      + det(_pfC(57.6, 56.9, 0.9, '#ffffff') + _pfC(58.6, 57.1, 0.7, '#ffffff') + _pfC(65.6, 56.9, 0.9, '#ffffff') + _pfC(64.6, 57.1, 0.7, '#ffffff'));
    case 'stripes': return _pfBoth('M37.4 50.6 L44.6 50.4 L44.4 52 L37.6 52.2 Z', '#2f3d5c', 0.88) + det(_pfBoth('M38 53.1 L44 52.9 L43.9 53.7 L38.1 53.9 Z', '#e0475e', 0.85));
    case 'glitter': return [[37.6, 51], [41.4, 49.6], [39.6, 53.6], [62.4, 51], [58.6, 49.6], [60.4, 53.6]].map(([x, y], i) => _pfP(_pfSpark(x, y, i % 3 === 2 ? 1 : 1.5), i % 2 ? '#ffffff' : '#f6d35e', 0.95)).join('');
    case 'bolt': return _pfP('M60.8 35.8 L55.2 46.8 L58.8 46.8 L55.6 57 L63.6 43.4 L59.6 43.4 L63 35.8 Z', '#e8475e', 0.92)
      + det(_pfP('M61.2 37.2 L57 45.8 L59.8 45.8 L58 51.6 L61.8 44.4 L58.8 44.4 Z', '#3b82f6', 0.55));
    case 'butterfly': {
      const up = 'M48.6 44.6 Q41 29 31.2 33.4 Q29.6 42.4 37.6 47 Q43.6 48.4 48.6 44.6 Z', low = 'M48.8 47.2 Q42.4 49.4 39.6 56 Q44 58.8 47.4 53.6 Q49 50.6 48.8 47.2 Z';
      const wing = (d, f, e) => `<path d="${d}" fill="${f}" fill-opacity="0.62" stroke="${e}" stroke-width="0.6"/>` + `<path d="${_pfMirror(d)}" fill="${f}" fill-opacity="0.62" stroke="${e}" stroke-width="0.6"/>`;
      return wing(up, '#a26be0', '#6a3ab0') + wing(low, '#f08fb3', '#c0507a')
        + det(_pfC(35.6, 38.4, 0.9, '#ffffff', 0.85) + _pfC(64.4, 38.4, 0.9, '#ffffff', 0.85) + _pfC(39, 35.6, 0.55, '#ffffff', 0.85) + _pfC(61, 35.6, 0.55, '#ffffff', 0.85)
          + _pfC(43.2, 53.4, 0.6, '#ffffff', 0.85) + _pfC(56.8, 53.4, 0.6, '#ffffff', 0.85) + _pfBothS('M49.2 38 Q47.6 33.4 45 32.4', '#5a3a7a', 0.6, 0.8));
    }
    case 'tiger': return _pfBoth('M30.8 43.6 L37.6 45.4 L31.2 47.2 Z', '#e07a2a', 0.85) + _pfBoth('M31.6 52 L37 52.6 L32.4 54.4 Z', '#e07a2a', 0.85)
      + _pfBoth('M45.6 24.6 L48.4 31.4 L44.6 30.2 Z', '#e07a2a', 0.8) + det(_pfBoth('M30.8 43.9 L35.4 45.4 L31 46.6 Z', '#2a2124', 0.35));
    case 'flowers': {
      let s = '';
      for (const [x, y, c, r] of [[64.6, 35.4, '#f6a5c0', 1.5], [67.4, 39.6, '#fff4f8', 1.3], [62.8, 40.4, '#c9a7f0', 1.2]]) {
        for (let q = 0; q < 5; q++) { const an = q * 1.2566 + x; s += _pfC(x + r * 1.05 * Math.cos(an), y + r * 1.05 * Math.sin(an), r * 0.78, c); }
        s += _pfC(x, y, r * 0.55, '#f2b33d');
      }
      return det(_pfE(66.6, 37, 1.8, 0.8, '#5f9a52', 1, 40)) + s;
    }
    case 'skull': return _pfC(42, 46, 5.2, '#3a2a4a', 0.32) + _pfC(58, 46, 5.2, '#3a2a4a', 0.32) + _pfP(_pfHeartD(50, 52.4, 1.7).replace(/^M/, 'M'), '#3a2a4a', 0.75)
      + det(_pfS('M44.4 61.4 L55.6 61.4 M46 60.2 L46 62.6 M48.6 60.2 L48.6 62.6 M51.4 60.2 L51.4 62.6 M54 60.2 L54 62.6', '#3a2a4a', 0.6, 0.7)
        + [[42, 39.4, '#f08a3c'], [37.2, 42, '#3fb4c8'], [37, 50, '#f06a8a'], [58, 39.4, '#f08a3c'], [62.8, 42, '#3fb4c8'], [63, 50, '#f06a8a']].map(([x, y, c]) => _pfC(x, y, 0.8, c)).join('')
        + [0, 1, 2, 3, 4].map(q => _pfC(50 + 1.5 * Math.cos(q * 1.2566 - 1.57), 29.6 + 1.5 * Math.sin(q * 1.2566 - 1.57), 1.1, '#f06a8a')).join('') + _pfC(50, 29.6, 0.7, '#f6d35e'));
    case 'pumpkin': return _pfE(61.6, 55, 3.3, 2.7, '#f08a3c') + _pfE(61.6, 55, 1.3, 2.6, '#e07a2a') + _pfS('M61.6 52.4 Q61.8 51 62.8 50.6', '#4f7a3a', 0.9)
      + det(_pfS('M59 55.4 Q59.6 53.6 60.6 53', '#ffd08a', 0.5, 0.7));
    case 'snowflake': {
      let s = '';
      for (let i = 0; i < 3; i++) { const an = i * Math.PI / 3; s += _pfS(`M${_pfN(61.6 - 3.2 * Math.cos(an))} ${_pfN(54.4 - 3.2 * Math.sin(an))} L${_pfN(61.6 + 3.2 * Math.cos(an))} ${_pfN(54.4 + 3.2 * Math.sin(an))}`, '#ffffff', 0.8); }
      return _pfC(61.6, 54.4, 3.9, '#8ecae6', 0.35) + s + _pfC(61.6, 54.4, 0.8, '#ffffff');
    }
    default: return '';
  }
}

/* ---------- liner and lashes (under: a shadow before the eyes; over: lines after them) ---------- */
function _pfLiner(kind, over, small) {
  if (!kind || kind === 'none') return '';
  const each = (fn) => fn(42, -1) + fn(58, 1);
  if (!over) {
    if (kind === 'smoky') return each((cx) => _pfE(cx, 44.8, 5.2, 3.2, '#5a4a6a', 0.34));
    if (kind === 'glitter') return each((cx) => _pfE(cx, 44.4, 5, 2.9, '#e2b34a', 0.38));
    if (kind === 'graphic') return each((cx) => _pfE(cx, 44.2, 4.8, 2.6, '#3fb4c8', 0.22));
    return '';
  }
  const lid = (cx, o, w, c) => _pfS(`M${_pfN(cx - 3.6 * o)} 44.6 Q${_pfN(cx)} 41.4 ${_pfN(cx + 3.8 * o)} 44.2`, c || _PF_INK, w);
  switch (kind) {
    case 'winged': return each((cx, o) => lid(cx, o, 1.3) + _pfS(`M${_pfN(cx + 3.4 * o)} 44 L${_pfN(cx + 6 * o)} 42.1`, _PF_INK, 1.2));
    case 'lashes': return each((cx, o) => lid(cx, o, 0.9) + _pfS(`M${_pfN(cx + 2.2 * o)} 43 L${_pfN(cx + 3.6 * o)} 40.9 M${_pfN(cx + 3.3 * o)} 43.7 L${_pfN(cx + 5.2 * o)} 42.2 M${_pfN(cx + 0.9 * o)} 42.6 L${_pfN(cx + 1.6 * o)} 40.4`, _PF_INK, 0.85));
    case 'smoky': return each((cx, o) => lid(cx, o, 0.9));
    case 'dots': return each((cx, o) => lid(cx, o, 0.8) + (small ? '' : _pfC(cx + 4.2 * o, 47.6, 0.5, _PF_INK) + _pfC(cx + 5.2 * o, 45.8, 0.45, _PF_INK) + _pfC(cx + 3 * o, 49.2, 0.4, _PF_INK)));
    case 'glitter': return each((cx, o) => lid(cx, o, 0.8) + (small ? '' : _pfP(_pfSpark(cx + 2.4 * o, 41.2, 1.2), '#f6d35e') + _pfC(cx - 1.2 * o, 41.6, 0.4, '#ffffff', 0.9) + _pfC(cx + 4.6 * o, 43, 0.35, '#ffffff', 0.9)));
    case 'graphic': return each((cx, o) => lid(cx, o, 1.4, '#2a9ab8') + _pfS(`M${_pfN(cx + 3.4 * o)} 44 L${_pfN(cx + 6.4 * o)} 41.2`, '#2a9ab8', 1.3)
      + (small ? '' : _pfS(`M${_pfN(cx - 1 * o)} 41 Q${_pfN(cx + 2 * o)} 39.6 ${_pfN(cx + 5.8 * o)} 39.4`, '#f06a9a', 0.9)));
    default: return '';
  }
}

/* ---------- jewellery on the face and ears ---------- */
function _pfEarrings(kind, mt, small) {
  if (!kind || kind === 'none') return '';
  const each = (fn) => fn(31.4, -1) + fn(68.6, 1);
  const ly = 51.8, ring = (x, y, r, w) => `<circle cx="${_pfN(x)}" cy="${_pfN(y)}" r="${_pfN(r)}" fill="none" stroke="${mt[0]}" stroke-width="${_pfN(w)}"/>`;
  const shine = (x, y) => (small ? '' : _pfC(x - 0.35, y - 0.35, 0.35, '#ffffff', 0.8));
  switch (kind) {
    case 'studs': return each((x) => _pfC(x, ly, 1, mt[0]) + shine(x, ly));
    case 'hoops': return each((x) => ring(x, ly + 2, 2.2, 0.9) + (small ? '' : _pfS(`M${_pfN(x - 1.6)} ${_pfN(ly + 1)} Q${_pfN(x - 2)} ${_pfN(ly + 2.6)} ${_pfN(x - 1)} ${_pfN(ly + 3.8)}`, mt[2], 0.4, 0.8)));
    case 'bighoops': return each((x) => ring(x, ly + 3.8, 3.9, 1.05) + (small ? '' : _pfS(`M${_pfN(x - 3)} ${_pfN(ly + 2)} Q${_pfN(x - 3.6)} ${_pfN(ly + 4.4)} ${_pfN(x - 2)} ${_pfN(ly + 6.6)}`, mt[2], 0.45, 0.8)));
    case 'pearls': return each((x) => _pfC(x, ly + 0.6, 1.45, '#f3eee3') + _pfC(x + 0.3, ly + 0.9, 1.1, '#dcd4c4', 0.6) + shine(x, ly + 0.6));
    case 'drops': return each((x) => _pfC(x, ly, 0.7, mt[0]) + _pfS(`M${_pfN(x)} ${_pfN(ly)} L${_pfN(x)} ${_pfN(ly + 2.2)}`, mt[0], 0.45)
      + _pfP(`M${_pfN(x)} ${_pfN(ly + 2)} Q${_pfN(x + 1.6)} ${_pfN(ly + 4.4)} ${_pfN(x)} ${_pfN(ly + 5.6)} Q${_pfN(x - 1.6)} ${_pfN(ly + 4.4)} ${_pfN(x)} ${_pfN(ly + 2)} Z`, '#4fb3d9') + shine(x - 0.2, ly + 4.2));
    case 'stars': return each((x) => _pfC(x, ly, 0.5, mt[0]) + _pfP(_pfStar(x, ly + 2.4, 2.1, 0.9, 5), mt[0]) + shine(x, ly + 2));
    case 'moons': return each((x, o) => _pfC(x, ly, 0.5, mt[0])
      + _pfP(`M${_pfN(x)} ${_pfN(ly + 0.4)} C${_pfN(x - 3 * o)} ${_pfN(ly + 0.8)} ${_pfN(x - 3 * o)} ${_pfN(ly + 4.4)} ${_pfN(x)} ${_pfN(ly + 4.8)} C${_pfN(x - 1.4 * o)} ${_pfN(ly + 3.8)} ${_pfN(x - 1.4 * o)} ${_pfN(ly + 1.4)} ${_pfN(x)} ${_pfN(ly + 0.4)} Z`, mt[0]));
    case 'cuff': return each((x, o) => _pfS(`M${_pfN(x + 2.4 * o)} 42.4 Q${_pfN(x + 4.2 * o)} 43.4 ${_pfN(x + 3.6 * o)} 45`, mt[0], 0.9) + _pfS(`M${_pfN(x + 2.8 * o)} 45.2 Q${_pfN(x + 4.4 * o)} 46.2 ${_pfN(x + 3.8 * o)} 47.6`, mt[0], 0.75)
      + _pfC(x, ly, 0.8, mt[0]));
    case 'feathers': return each((x) => _pfC(x, ly, 0.6, mt[0]) + _pfC(x, ly + 1.6, 0.6, '#e0475e')
      + _pfP(`M${_pfN(x)} ${_pfN(ly + 2.2)} Q${_pfN(x + 1.7)} ${_pfN(ly + 5.4)} ${_pfN(x + 0.2)} ${_pfN(ly + 9)} Q${_pfN(x - 1.5)} ${_pfN(ly + 5.4)} ${_pfN(x)} ${_pfN(ly + 2.2)} Z`, '#3fa0a0')
      + (small ? '' : _pfS(`M${_pfN(x)} ${_pfN(ly + 2.6)} L${_pfN(x + 0.2)} ${_pfN(ly + 8.6)}`, '#1f6a6a', 0.35) + _pfS(`M${_pfN(x - 1)} ${_pfN(ly + 4.4)} L${_pfN(x + 0.1)} ${_pfN(ly + 5.2)} L${_pfN(x + 1.1)} ${_pfN(ly + 4.4)}`, '#7fd0c8', 0.35)));
    case 'cherries': return each((x) => _pfS(`M${_pfN(x)} ${_pfN(ly)} Q${_pfN(x - 0.2)} ${_pfN(ly + 2)} ${_pfN(x - 1)} ${_pfN(ly + 3.6)} M${_pfN(x)} ${_pfN(ly)} Q${_pfN(x + 0.4)} ${_pfN(ly + 2.2)} ${_pfN(x + 1)} ${_pfN(ly + 4)}`, '#4f7a3a', 0.45)
      + _pfE(x + 0.6, ly + 0.2, 1, 0.5, '#5f9a52', 1, -20) + _pfC(x - 1, ly + 4.3, 1.25, '#d63a3a') + _pfC(x + 1, ly + 4.7, 1.25, '#c22a30') + shine(x - 0.7, ly + 4));
    default: return '';
  }
}
function _pfNose(kind, mt, small) {
  switch (kind) {
    case 'stud': return _pfC(52.6, 52.5, 0.62, mt[0]) + (small ? '' : _pfC(52.4, 52.3, 0.22, '#ffffff', 0.8));
    case 'hoop': return _pfS('M52.3 52.6 Q54 53.4 53.2 55.2', mt[0], 0.62);
    case 'septum': return _pfS('M48.8 54.3 Q50 56.8 51.2 54.3', mt[0], 0.7) + _pfC(48.8, 54.3, 0.45, mt[0]) + _pfC(51.2, 54.3, 0.45, mt[0]);
    default: return '';
  }
}
function _pfPiercing(kind, mt, small) {
  const brow = () => _pfS('M60.4 37.1 L61.4 40.5', mt[0], 0.45) + _pfC(60.4, 37.1, 0.55, mt[0]) + _pfC(61.4, 40.5, 0.55, mt[0]);
  const lip = () => _pfS('M53.4 59.8 Q54.6 61.2 53.6 62.4', mt[0], 0.6);
  switch (kind) {
    case 'brow': return brow();
    case 'lip': return lip();
    case 'browlip': return brow() + lip();
    case 'ear': return _pfS('M66.4 42.2 L70.6 44.6', mt[0], 0.55) + _pfC(66.4, 42.2, 0.6, mt[0]) + _pfC(70.6, 44.6, 0.6, mt[0]) + (small ? '' : _pfC(31.4, 51.8, 0.7, mt[0]));
    default: return '';
  }
}

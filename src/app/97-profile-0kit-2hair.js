/* ============================================================
   PROFILE, the avatar kit: HAIR (2.18, agent 'wardrobe'). PURE, like 97-profile-0kit.js (read its
   header): functions and literal tables only; the kit's drawing helpers are used inside functions.
   Every style has up to three layers, as in the kit: the BACK (behind the neck and shoulders), the
   STRANDS (over the shoulders, after the clothes) and the FRONT (over the forehead).
     _PF_HAIR_MORE                      the 2.18 styles
     _PF_HAIR_LONG                      styles whose hair reaches the shoulders (an ombre starts lower on them)
     _pfHairBackMore / _pfHairStrandsMore / _pfHairFrontMore(st, hc, small)
     _pfDye(kind, layer, style, inner, id)   a dye: the same layer drawn again in the dye colour, clipped
                                        (highlights: thin streaks; ombre: the lengths; tips: the top; streak:
                                        one bold band; split: the right half; peekaboo: the under layer only)
   ============================================================ */
const _PF_HAIR_MORE = new Set(['curtains', 'pixie', 'undercut', 'quiff', 'slick', 'mullet', 'shag', 'sweep', 'halfup', 'pigtails', 'topknot',
  'puffs', 'locs', 'boxbraids', 'cornrows', 'hightop']);
const _PF_HAIR_LONG = new Set(['long', 'wavy', 'braids', 'bob', 'pony', 'sweep', 'halfup', 'locs', 'boxbraids', 'shag', 'mullet', 'pigtails', 'curtains']);
const _PF_SWEPT_D = 'M30.4 44 C29 26 38.6 17.4 50 17.4 C61.4 17.4 71 26 69.6 44 C69 38 67.6 33 63.6 30 C58.6 27.6 54 27 50 27 C46 27 41.4 27.6 36.4 30 C32.4 33 31 38 30.4 44 Z';
const _PF_LONG_BACK_D = 'M28.4 44 C26 24 37 15.6 50 15.6 C63 15.6 74 24 71.6 44 L73 80 L27 80 Z';

/** A cloud of curls (afro puffs). */
function _pfPuff(x, y, r, hc, small) {
  let s = _pfC(x, y, r, hc[1]);
  for (let k = 0; k < 9; k++) { const an = k * Math.PI * 2 / 9; s += _pfC(x + r * 0.9 * Math.cos(an), y + r * 0.9 * Math.sin(an), r * 0.42, hc[k % 3 ? 0 : 1]); }
  s += _pfC(x, y - r * 0.1, r * 0.7, hc[0]);
  if (!small) s += _pfS(`M${_pfN(x - r * 0.5)} ${_pfN(y - r * 0.3)} Q${_pfN(x - r * 0.2)} ${_pfN(y - r * 0.7)} ${_pfN(x + r * 0.2)} ${_pfN(y - r * 0.55)}`, hc[2], 0.9, 0.55)
    + _pfS(`M${_pfN(x + r * 0.1)} ${_pfN(y + r * 0.2)} Q${_pfN(x + r * 0.4)} ${_pfN(y - r * 0.1)} ${_pfN(x + r * 0.6)} ${_pfN(y + r * 0.15)}`, hc[2], 0.8, 0.45);
  return s;
}
/** A loc or a braid: a rope from a to b (rounded), with its texture. */
function _pfRope(x0, y0, x1, y1, bend, w, hc, braid) {
  const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2;
  let s = _pfS(`M${_pfN(x0)} ${_pfN(y0)} Q${_pfN(mx)} ${_pfN(my)} ${_pfN(x1)} ${_pfN(y1)}`, hc[0], w);
  const n = Math.max(3, Math.round((y1 - y0) / (braid ? 2.4 : 3.6)));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1;
    s += braid ? _pfS(`M${_pfN(x - w * 0.45)} ${_pfN(y - 0.6)} L${_pfN(x)} ${_pfN(y + 0.4)} L${_pfN(x + w * 0.45)} ${_pfN(y - 0.6)}`, hc[1], 0.45, 0.8)
      : _pfS(`M${_pfN(x - w * 0.42)} ${_pfN(y)} L${_pfN(x + w * 0.42)} ${_pfN(y + 0.3)}`, hc[1], 0.5, 0.65);
  }
  return s;
}

function _pfHairBackMore(st, hc) {
  switch (st) {
    case 'curtains': return _pfP('M28.4 46 C27 26 37.4 16.4 50 16.4 C62.6 16.4 73 26 71.6 46 L72 57 Q67 59.4 64.4 55 L35.6 55 Q33 59.4 28 57 Z', hc[1]);
    case 'mullet': return _pfP('M30.4 46 C28.4 27 38 17 50 17 C62 17 71.6 27 69.6 46 L70.6 60 Q69 70 62 74.6 L38 74.6 Q31 70 29.4 60 Z', hc[1]);
    case 'shag': return _pfP('M28 46 C26.4 26 37 15.8 50 15.8 C63 15.8 73.6 26 72 46 L73.6 66 L70 63 L68.6 69 L65 64 L35 64 L31.4 69 L30 63 L26.4 66 Z', hc[1]);
    case 'sweep': case 'halfup': return _pfP(_PF_LONG_BACK_D, hc[1]) + (st === 'halfup' ? _pfC(50, 14.6, 5.6, hc[0]) + _pfS('M45.6 18 Q50 20.2 54.4 18', hc[3], 1.6) + _pfS('M46.4 12.4 Q50 9.6 53.6 12.4', hc[2], 0.9, 0.55) : '');
    case 'locs': return _pfP('M28 44 C26 24 37 15.4 50 15.4 C63 15.4 74 24 72 44 L74 84 L26 84 Z', hc[1]);
    case 'boxbraids': return _pfP('M28 44 C26 24 37 15.4 50 15.4 C63 15.4 74 24 72 44 L74 92 L26 92 Z', hc[1]);
    case 'topknot': return _pfC(50, 12.4, 6.6, hc[0]) + _pfS('M45 10.6 Q50 6.2 55 10.6', hc[2], 1, 0.55) + _pfS('M44.6 15.4 Q50 12.6 55.4 15.4', hc[1], 0.8, 0.6)
      + _pfS('M45.2 18.2 Q50 20.4 54.8 18.2', hc[3], 1.8);
    case 'puffs': return _pfPuff(29.6, 22.4, 8.6, hc) + _pfPuff(70.4, 22.4, 8.6, hc);
    default: return '';
  }
}
function _pfHairStrandsMore(st, hc) {
  switch (st) {
    case 'mullet': return _pfBoth('M31 50 Q30.2 60 27.2 67.6 Q31 69.4 34.6 64.2 Q34 58 34.4 51 Z', hc[0]) + _pfBothS('M31.4 56 Q30.6 61 29.2 65', hc[1], 0.6, 0.5);
    case 'sweep': return _pfP('M61.6 42 C66 54 70.4 66 71.6 84.6 Q66.4 88.8 61.6 84.6 C63.4 72 62.6 60 59.6 49 Z', hc[0])
      + _pfS('M64.6 52 Q67.6 64 67.8 80', hc[1], 0.8, 0.4) + _pfP('M30.4 44 C29 58 28.5 70 26 84 Q31 88 37 84.5 C35.5 72 35 60 35.6 50 Z', hc[0]);
    case 'halfup': return _pfHairStrands('long', hc);
    case 'pigtails': return _pfBoth('M30.2 48 C25.4 51 22.6 59 24 69.6 Q26.4 75.6 31 71.4 Q28.6 62.6 32 52.6 Z', hc[0])
      + _pfBothS('M27 56 Q25.6 62 26.6 68', hc[1], 0.7, 0.5) + _pfC(30, 50.4, 2, '#e0475e') + _pfC(70, 50.4, 2, '#e0475e');
    case 'locs': {
      let s = '';
      for (const [x0, x1, y1, b] of [[31, 28.4, 86, -1], [33.4, 32.2, 88, 0.6], [35.6, 36.4, 84, 1.2], [29.2, 25.6, 80, -1.6]]) {
        s += _pfRope(x0, 44, x1, y1, b, 3.1, hc) + _pfRope(100 - x0, 44, 100 - x1, y1, -b, 3.1, hc);
      }
      return s;
    }
    case 'boxbraids': {
      let s = '';
      for (const [x0, x1, y1, b] of [[30.4, 26.6, 92, -1], [32.4, 29.6, 94, -0.4], [34.4, 32.8, 93, 0.4], [36.2, 35.8, 90, 1], [28.6, 24.2, 88, -1.4]]) {
        s += _pfRope(x0, 44, x1, y1, b, 1.9, hc, true) + _pfRope(100 - x0, 44, 100 - x1, y1, -b, 1.9, hc, true);
      }
      return s + `<rect x="31.4" y="70" width="2.6" height="2.2" rx="0.6" fill="#d9b04a"/><rect x="66.6" y="76" width="2.6" height="2.2" rx="0.6" fill="#d9b04a"/>`;
    }
    default: return '';
  }
}
function _pfHairFrontMore(st, hc, small) {
  const hi = (d, w, op) => (small ? '' : _pfS(d, hc[2], w || 1.3, op || 0.55));
  const lo = (d, w, op) => (small ? '' : _pfS(d, hc[3], w || 0.8, op || 0.55));
  switch (st) {
    case 'curtains': return _pfP('M29.6 47 C27.6 26 38 16.6 50 16.6 C62 16.6 72.4 26 70.4 47 C69.6 41 68 36.4 64.6 33.4 C59.6 31.4 54 33.6 50.8 38.4 L50 36.4 L49.2 38.4 C46 33.6 40.4 31.4 35.4 33.4 C32 36.4 30.4 41 29.6 47 Z', hc[0])
      + lo('M50 18.4 L50 35.6', 0.7, 0.5) + hi('M36.4 30.8 Q43 29.6 47.6 34.4') + hi(_pfMirror('M36.4 30.8 Q43 29.6 47.6 34.4')) + hi('M38 22.8 Q44 19.4 49 19.6', 1.1, 0.4);
    case 'pixie': return _pfP('M30.6 44.4 C29.2 27 38.6 18.4 50 18.4 C61.4 18.4 70.8 27 69.4 44 C69 39.6 67.8 36 65.6 33 C60.4 37.4 52.6 39.4 45.4 40.4 C39.8 41.2 34.6 42.4 30.6 44.4 Z', hc[0])
      + hi('M62.4 33.8 Q54 38.2 44 39.4', 1.1, 0.5) + lo('M64.6 34.6 Q57 39.4 47 41', 0.7, 0.5) + hi('M40 23.6 Q46 20 53 20.4')
      + (small ? '' : _pfS('M48.6 18.8 L50.4 16.2 L51.6 18.8 M56 19.8 L58.4 17.6 L58.8 20.4', hc[0], 1.1));
    case 'undercut': return _pfP(_PF_CAP, hc[0], 0.5) + _pfP('M33.6 35.4 C32.6 22 40.4 14.4 50.6 14.4 C61 14.4 67.8 22 66.6 35.4 C63.6 30.6 58 28 50 28.4 C43 28.6 37.2 31 33.6 35.4 Z', hc[0])
      + _pfP('M56.6 27.6 C63.4 26.6 67.6 31 67.2 38 C65.4 33.8 61.8 31 56.6 30.4 Z', hc[0]) + hi('M40 21.4 Q48 15.8 58 17.4') + hi('M42 26 Q50 21.6 60 23.2', 1, 0.4)
      + lo('M34.2 35.2 Q36 33 38.4 31.6', 0.7, 0.4);
    case 'quiff': return _pfP('M31 42 C30 30 33.4 24.4 37.6 22 C39.6 13.6 49 8.6 58 10.4 C66 12 70.4 19.6 69.6 29 C70.4 34 70 38.4 69 42 C67.6 36.4 65 32.4 60 30.8 C53 31.8 45 31.8 39.6 30.8 C35 32.2 32.6 36 31 42 Z', hc[0])
      + hi('M41 20 Q48 12.6 57.4 13', 1.5) + hi('M45 24.4 Q52 17 62 17.4', 1.1, 0.4) + lo('M38.6 28.6 Q46 22 56 21.4', 0.8, 0.45);
    case 'slick': return _pfP(_PF_SWEPT_D, hc[0]) + (small ? '' : _pfS('M39.6 28.4 Q41.4 22.6 45.6 19.4 M46 27.2 Q47.6 21.4 50.6 18.6 M52.8 27.2 Q54.8 21.6 58.4 19.6 M58.8 28.6 Q62 23.8 65 22.6', hc[1], 0.7, 0.6)
      + _pfS('M42.6 27.6 Q44.4 22 48 19 M55.8 27.6 Q58.2 22.6 61.6 21', hc[2], 0.7, 0.5));
    case 'mullet': return _pfP('M30 43 C27.4 25 38 15.8 50 15.8 C62.6 15.8 72.6 25 70 43 C68.8 38 67 34.4 63.6 31.6 L61.6 34.8 L59.6 31.4 L56.6 34.6 L54.4 31.2 L51.4 34.4 L49.4 31 L46.4 34.4 L44.4 31.2 L41.4 34.6 L39.6 31.4 L37.4 34.6 L35.4 32 C32.6 35 31 38.6 30 43 Z', hc[0]) + hi('M38 21.6 Q45 18 52 18.6', 1.5);
    case 'shag': return _pfP('M29.6 47 C27.6 26 38 16 50 16 C62 16 72.4 26 70.4 47 L68.6 42 L67 45 L65.6 38 L63 40.4 L61.4 35 L58 38.4 L56 34.4 L53 37.8 L50 34 L47 37.8 L44 34.4 L42 38.4 L38.6 35 L37 40.4 L34.4 38 L33 45 L31.4 42 Z', hc[0])
      + hi('M37.4 23.6 Q44 19.4 51 19.6') + lo('M44 34.4 L45 30 M56 34.4 L55 30 M38.6 35 L40 31.4', 0.7, 0.5);
    case 'sweep': return _pfP('M30.4 46 C28.5 27 36 18 41 17.2 C56 15 71.5 24 69.6 46 C69 40 67 35 63 32 C56 35.4 46.6 35.6 40.4 30.6 C36 34 32.4 39 30.4 46 Z', hc[0])
      + lo('M41 17.6 Q40 23 40.6 30', 0.8, 0.5) + hi('M44 20.4 Q56 18 64 24.4', 1.4) + hi('M44.6 27.4 Q54 30.4 62 29', 1.1, 0.4);
    case 'halfup': return _pfP(_PF_PARTED, hc[0]) + hi('M37 25 Q42 21.4 47 20.6') + hi(_pfMirror('M37 25 Q42 21.4 47 20.6'));
    case 'pigtails': return _pfP(_PF_PARTED, hc[0]) + hi('M37 25 Q42 21.4 47 20.6', 1.2) + hi(_pfMirror('M37 25 Q42 21.4 47 20.6'), 1.2);
    case 'topknot': return _pfP(_PF_SLEEK, hc[0]) + (small ? '' : _pfS('M38 24 Q50 19 62 24', hc[2], 0.9, 0.5) + _pfS('M36 28.6 Q50 23 64 28.6', hc[1], 0.8, 0.45));
    case 'puffs': return _pfP('M30.6 44 C29 26.4 38.4 18.4 50 18.4 C61.6 18.4 71 26.4 69.4 44 C68 35.6 61 29.6 50.8 29.4 L50 31.2 L49.2 29.4 C39 29.6 32 35.6 30.6 44 Z', hc[0])
      + lo('M50 19.4 L50 29.4', 0.7, 0.55) + _pfS('M30.6 23.2 Q33 26.6 36.6 26.8', hc[3], 1.6) + _pfS(_pfMirror('M30.6 23.2 Q33 26.6 36.6 26.8'), hc[3], 1.6)
      + (small ? '' : _pfS('M36 31.6 Q38.6 28 43.4 26.2 M64 31.6 Q61.4 28 56.6 26.2', hc[2], 0.8, 0.45));
    case 'locs': {
      let s = _pfP(_PF_PARTED, hc[1]);
      for (const [x0, y0, x1, y1, b] of [[49, 21, 33.6, 40, -3], [47, 24, 37.4, 38.6, -1.4], [51, 21, 66.4, 40, 3], [53, 24, 62.6, 38.6, 1.4], [44, 20, 31, 44, -2.6], [56, 20, 69, 44, 2.6]]) s += _pfRope(x0, y0, x1, y1, b, 3, hc);
      return s;
    }
    case 'boxbraids': return _pfP(_PF_PARTED, hc[0]) + (small ? '' : _pfS('M40 22.6 L43 28.6 M45.4 20.4 L46.8 27 M54.6 20.4 L53.2 27 M60 22.6 L57 28.6 M35.4 27 L39.6 31.4 M64.6 27 L60.4 31.4', hc[3], 0.6, 0.6)
      + _pfS('M37 25 Q42 21.4 47 20.6', hc[2], 1, 0.45));
    case 'cornrows': {
      let s = _pfP('M30.8 45 C29 27 38.4 18.6 50 18.6 C61.6 18.6 71 27 69.2 45 C68 38 64.6 32.4 58.8 30 C53 28.6 47 28.6 41.2 30 C35.4 32.4 32 38 30.8 45 Z', hc[0]);
      if (small) return s;
      for (const [x0, y0, x1, y1] of [[34, 37, 40, 20.6], [39.6, 31, 44.6, 19], [45.4, 29.4, 48.6, 18.6], [50, 29, 50, 18.4], [54.6, 29.4, 51.4, 18.6], [60.4, 31, 55.4, 19], [66, 37, 60, 20.6]]) {
        s += _pfS(`M${x0} ${y0} Q${_pfN((x0 + x1) / 2 + (x0 - 50) * 0.08)} ${_pfN((y0 + y1) / 2)} ${x1} ${y1}`, hc[3], 0.7, 0.8);
        for (let t = 0.2; t < 0.95; t += 0.2) { const x = x0 + (x1 - x0) * t + 1.6, y = y0 + (y1 - y0) * t; s += _pfS(`M${_pfN(x - 1)} ${_pfN(y + 0.4)} L${_pfN(x)} ${_pfN(y - 0.4)} L${_pfN(x + 1)} ${_pfN(y + 0.4)}`, hc[2], 0.4, 0.55); }
      }
      return s;
    }
    case 'hightop': return _pfP(_PF_CAP, hc[0], 0.55) + _pfP('M33.4 37 L33.8 13.6 Q34 9.6 38.2 9.6 L61.8 9.6 Q66 9.6 66.2 13.6 L66.6 37 C63.6 32.4 57.6 30.4 50 30.4 C42.4 30.4 36.4 32.4 33.4 37 Z', hc[0])
      + (small ? '' : _pfP('M34.4 13.4 Q35 10.6 38.4 10.6 L61.6 10.6 Q65 10.6 65.6 13.4 Q50 15.4 34.4 13.4 Z', hc[2], 0.45) + _pfS('M37 18 L37.2 32 M63 18 L62.8 32', hc[1], 0.8, 0.45)
        + _pfS('M41 13.4 L41 16 M46 14 L46 16.6 M51 14.2 L51 16.8 M56 14 L56 16.6 M61 13.6 L61 16.2', hc[3], 0.5, 0.45));
    default: return '';
  }
}

/* ---------- dyes ---------- */
/**
 * A dye: the layer drawn again over itself. draw(tones) draws the layer in a set of four tones; hc is the natural
 * colour, hc2 the dye. Ombre blends the two down the length (a gradient per tone); the others are the dye colour,
 * clipped: highlights (fine streaks that follow the parting), tips (the ends of long hair, the top of short hair),
 * a streak (one bold band), split (the right half), peekaboo (the under layer: the back and the strands of long
 * hair, the sides of short hair).
 */
function _pfDye(kind, layer, style, draw, id, hc, hc2) {
  const long = _PF_HAIR_LONG.has(style);
  if (kind === 'ombre') {
    const y0 = long ? 34 : 22, y1 = long ? 78 : 44;
    let defs = '';
    const tones = [0, 1, 2, 3].map(i => {
      defs += `<linearGradient id="${id}g${i}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}"><stop offset="0" stop-color="${hc[i]}"/><stop offset="0.35" stop-color="${hc[i]}"/><stop offset="1" stop-color="${hc2[i]}"/></linearGradient>`;
      return `url(#${id}g${i})`;
    });
    const inner = draw(tones);
    return inner ? `<defs>${defs}</defs>` + inner : '';
  }
  let clip;
  switch (kind) {
    case 'highlights': clip = [[31.4, 1.2, 14], [34.6, 1.7, 12], [37.8, 1.1, 10], [41.4, 1.6, 8], [44.6, 1.1, 5], [53.6, 1.2, -5], [56.4, 1.6, -8], [60, 1.1, -10], [63.2, 1.7, -12], [66.8, 1.2, -14]]
      .map(([x, w, r]) => `<rect x="${x}" y="-5" width="${w}" height="110" transform="rotate(${r} 50 20)"/>`).join(''); break;
    case 'tips': { const t = ['bob', 'shag', 'curtains', 'mullet'].includes(style) ? -12 : 0;
      clip = long ? `<path d="M-5 ${70 + t} L8 ${68 + t} L14 ${71 + t} L20 ${67.6 + t} L27 ${70.6 + t} L33 ${67.4 + t} L40 ${70.4 + t} L46 ${67.6 + t} L54 ${70.6 + t} L60 ${67.4 + t} L67 ${70.6 + t} L73 ${67.6 + t} L80 ${70.4 + t} L86 ${67.8 + t} L92 ${70.6 + t} L105 ${68 + t} L105 110 L-5 110 Z"/>`
      : '<path d="M-5 -5 L105 -5 L105 22 L96 25 L90 21 L84 25.6 L78 21.4 L72 25 L66 21 L60 25.4 L54 21.2 L48 25.6 L42 21 L36 25.4 L30 21.4 L24 25 L18 21.6 L10 25 L-5 22 Z"/>'; break; }
    case 'streak': clip = '<path d="M36.6 -5 L43.6 -5 L46.4 110 L39.4 110 Z"/>'; break;
    case 'split': clip = '<rect x="50" y="-10" width="60" height="130"/>'; break;
    case 'peekaboo':
      if (long) return layer === 'front' ? '' : draw(hc2);
      clip = '<path d="M-5 36 Q25 34 50 37 Q75 34 105 36 L105 110 L-5 110 Z"/>'; break;
    default: return '';
  }
  const inner = draw(hc2);
  return inner ? `<clipPath id="${id}">${clip}</clipPath><g clip-path="url(#${id})">${inner}</g>` : '';
}

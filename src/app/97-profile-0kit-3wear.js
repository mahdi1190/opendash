/* ============================================================
   PROFILE, the avatar kit: CLOTHES ON THE BUST (2.18, agent 'wardrobe'). PURE, like 97-profile-0kit.js
   (read its header): functions and literal tables only; the kit's drawing helpers are used inside
   functions. The bust's body is PF_BODY_D (shoulders at y 75.6, the neck x 43.5-56.5); a garment draws
   its base, then x.pat(silhouette) (the fabric pattern, clipped to it), then its shading and details, so
   collars, plackets and inner layers sit on top of the pattern.
     _PF_TOPS_MORE, _pfTopMore(kind, tc, t2, small, x)   x {sk, pat, id}
     _pfTopBackMore(kind, tc)
     _pfPattern(kind, pc, base, id, silD, small)          stripes, pinstripe, gingham, tartan, polka, floral, stars,
                                                          hearts, zigzag, colour block, two-tone, tie-dye, camo,
                                                          leopard, tropical, bats, snowflakes
     _pfOuterBack(kind, oc, t2) / _pfOuter(kind, oc, t2, mt, small)   outerwear, open over the top
     _pfDress(kind, dc, t2, sk, small, x)                 dresses and the jumpsuit (the pinafore goes over the top)
     _pfBib(bc, mt, small)                                the dungarees' bib and straps
     _pfNecklace(kind, mt, small, x) / _pfTie(kind, tc, small) / _pfPin(kind, small, onOuter) / _pfBagStraps(kind, bc, mt, small)
   ============================================================ */
const _PF_TOPS_MORE = new Set(['vneck', 'henley', 'polo', 'tank', 'bardot', 'sweat', 'turtle', 'rugby', 'jersey', 'kurta', 'kimono', 'ruffle', 'sailor']);
const _PF_SHOULDER_LIGHT = 'M12 100 C12 88 21 80.5 33 77.6 C26 82 22 90 22 100 Z', _PF_SHOULDER_SHADE = 'M88 100 C88 88 79 80.5 67 77.6 C74 82 78 90 78 100 Z';
const _PF_COLLAR_L = 'M36.6 75.2 L47.6 79.8 L45.8 84.2 L35.2 78.4 Z';

/** The base every standard top shares: the body, the pattern, the light and the shade, two seams. */
function _pfTopBase(tc, small, x, d) {
  d = d || 'M8 100 C8 86 19 78.5 35 75.6 Q50 80.5 65 75.6 C81 78.5 92 86 92 100 Z';
  return _pfP(d, tc[0]) + (x && x.pat ? x.pat(d) : '') + _pfP(_PF_SHOULDER_LIGHT, tc[2], 0.5) + _pfP(_PF_SHOULDER_SHADE, tc[1], 0.5)
    + (small ? '' : _pfS('M24 100 L26.4 86', tc[1], 1, 0.5) + _pfS('M76 100 L73.6 86', tc[1], 1, 0.5));
}
/** Bare shoulders (vest tops, off-shoulder, strappy dresses): the skin, its light and shade, collarbones. */
function _pfSkinChest(sk, small) {
  const c = _pfMix(sk[0], sk[1], 0.3);
  return _pfP('M8 100 C8 86 19 78.5 35 75.6 Q50 80.5 65 75.6 C81 78.5 92 86 92 100 Z', c) + _pfP(_PF_SHOULDER_LIGHT, sk[2], 0.35) + _pfP(_PF_SHOULDER_SHADE, sk[1], 0.4)
    + (small ? '' : _pfBothS('M38.4 80.6 Q42.6 79.4 46.6 80.8', sk[3], 0.7, 0.3));
}
function _pfClipG(id, d, inner) { return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`; }

/* ---------- tops ---------- */
/** What a 2.18 top puts behind the neck: nothing yet (hoods and fur are the 2.17 hoodie's and parka's). */
function _pfTopBackMore() { return ''; }
function _pfTopMore(kind, tc, t2, small, x) {
  x = x || {};
  const det = (s) => (small ? '' : s), sk = x.sk || pfTone('#e2b08c'), id = x.id || 'pft';
  const crew = (w, c) => _pfS('M36.5 76.2 Q50 82.2 63.5 76.2', c || tc[1], w);
  const body = 'M8 100 C8 86 19 78.5 35 75.6 Q50 80.5 65 75.6 C81 78.5 92 86 92 100 Z';
  switch (kind) {
    case 'vneck': return _pfTopBase(tc, small, x) + _pfP('M40.4 75.8 Q45.2 79.6 50 89 Q54.8 79.6 59.6 75.8 Q50 80.2 40.4 75.8 Z', _pfMix(sk[0], sk[1], 0.45))
      + _pfS('M39.8 75.6 Q45.2 80 50 89.6 Q54.8 80 60.2 75.6', tc[1], 1.8);
    case 'henley': return _pfTopBase(tc, small, x) + crew(2.6) + _pfP('M48.3 79.8 L51.7 79.8 L51.7 91 L48.3 91 Z', tc[2], 0.6) + _pfS('M48.3 79.8 L48.3 91 L51.7 91 L51.7 79.8', tc[1], 0.7)
      + _pfC(50, 82.6, 0.75, tc[3]) + _pfC(50, 85.6, 0.75, tc[3]) + _pfC(50, 88.6, 0.75, tc[3]);
    case 'polo': return _pfTopBase(tc, small, x) + _pfBoth('M37.2 75.4 L48.6 80.4 L45.2 86.4 L36 79 Z', t2[0]) + _pfBothS('M37.2 75.4 L48.6 80.4 L45.2 86.4', t2[3], 0.5, 0.6)
      + det(_pfBothS('M37.4 77.4 L46.4 81.6', tc[0], 0.7, 0.7)) + _pfP('M48.4 80.6 L51.6 80.6 L51.6 89.6 L48.4 89.6 Z', tc[2], 0.5) + _pfS('M48.4 80.6 L48.4 89.6 L51.6 89.6', tc[1], 0.6)
      + _pfC(50, 84, 0.7, t2[0]) + _pfC(50, 87.4, 0.7, t2[0]);
    case 'tank': {
      const d = 'M27.4 100 C27.6 91 30 85 34.6 81.4 L37.4 75.8 L40.8 75.8 Q43 81.2 50 81.8 Q57 81.2 59.2 75.8 L62.6 75.8 L65.4 81.4 C70 85 72.4 91 72.6 100 Z';
      return _pfSkinChest(sk, small) + _pfP(d, tc[0]) + (x.pat ? x.pat(d) : '') + _pfP('M27.4 100 C27.6 91 30 85 34.6 81.4 L36.2 79 C33 86 32.4 92 33 100 Z', tc[2], 0.45)
        + _pfP('M72.6 100 C72.4 91 70 85 65.4 81.4 L63.8 79 C67 86 67.6 92 67 100 Z', tc[1], 0.5) + _pfS('M40.8 76 Q43 81.4 50 82 Q57 81.4 59.2 76', tc[1], 1.1)
        + _pfBothS('M34.8 81.2 L37.6 75.8', tc[1], 0.9, 0.7);
    }
    case 'bardot': {
      const d = 'M8 100 C8 92 12 87.4 18.4 85.2 Q34 82.4 50 84.8 Q66 82.4 81.6 85.2 C88 87.4 92 92 92 100 Z';
      let s = _pfSkinChest(sk, small) + _pfP(d, tc[0]) + (x.pat ? x.pat(d) : '') + _pfP('M8 100 C8 92 12 87.4 18.4 85.2 Q20 92 21 100 Z', tc[2], 0.45) + _pfP('M92 100 C92 92 88 87.4 81.6 85.2 Q80 92 79 100 Z', tc[1], 0.5);
      if (!small) for (let i = 0; i < 12; i++) { const xx = 14 + i * 6.4, yy = 85.2 - Math.sin(i / 11 * Math.PI) * 0.9; s += _pfS(`M${_pfN(xx - 3.2)} ${_pfN(yy + 0.2)} Q${_pfN(xx)} ${_pfN(yy + 2.4)} ${_pfN(xx + 3.2)} ${_pfN(yy + 0.2)}`, tc[2], 0.8, 0.8); }
      return s + _pfS('M18.4 85.2 Q34 82.4 50 84.8 Q66 82.4 81.6 85.2', tc[1], 0.9, 0.8);
    }
    case 'sweat': return _pfTopBase(tc, small, x) + _pfP('M36.6 75.8 Q50 82.4 63.4 75.8 L64 78.4 Q50 85 36 78.4 Z', tc[1], 0.85) + det(_pfS('M37.4 77.2 Q50 83.4 62.6 77.2', tc[2], 0.5, 0.5))
      + _pfBothS('M38 78.6 L22.6 100', tc[1], 0.9, 0.5) + _pfS('M42.4 91.6 Q50 87.6 57.6 91.6', t2[0], 1.7) + det(_pfC(46, 94.6, 0.8, t2[0]) + _pfC(50, 95, 0.8, t2[0]) + _pfC(54, 94.6, 0.8, t2[0]));
    case 'turtle': return _pfTopBase(tc, small, x) + _pfP('M42.2 63.6 Q50 66.4 57.8 63.6 L59 78.4 Q50 82.2 41 78.4 Z', tc[0])
      + _pfP('M42 64.4 Q50 67.8 58 64.4 L58.4 69.8 Q50 73 41.6 69.8 Z', tc[2], 0.55) + _pfS('M41.6 69.8 Q50 73 58.4 69.8', tc[1], 0.9, 0.7)
      + det(_pfS('M45 72.6 L45 79.4 M48.4 73.4 L48.4 80.4 M51.6 73.4 L51.6 80.4 M55 72.6 L55 79.4', tc[1], 0.5, 0.45)) + _pfP('M56 64 Q58.6 70 59 78.4 L57.4 79 Q57.2 70 56 64 Z', tc[1], 0.45);
    case 'rugby': {
      let bands = '';
      for (let y = 83; y < 101; y += 8) bands += `<rect x="0" y="${y}" width="100" height="4" fill="${t2[0]}"/>`;
      return _pfP(body, tc[0]) + (x.pat ? x.pat(body) : _pfClipG(id + 'r', body, bands)) + _pfP(_PF_SHOULDER_LIGHT, tc[2], 0.35) + _pfP(_PF_SHOULDER_SHADE, '#000000', 0.12)
        + _pfP('M41 74.6 Q50 72.4 59 74.6 L59.6 76.6 Q50 74.4 40.4 76.6 Z', '#e8e2d4') + _pfBoth(_PF_COLLAR_L, '#f4f0e6') + _pfBothS('M36.6 75.2 L47.6 79.8 L45.8 84.2', '#bdb4a0', 0.5, 0.8)
        + _pfP('M48.4 80 L51.6 80 L51.6 88.6 L48.4 88.6 Z', '#f4f0e6') + _pfC(50, 83, 0.6, '#bdb4a0') + _pfC(50, 86, 0.6, '#bdb4a0');
    }
    case 'jersey': return _pfTopBase(tc, small, x) + _pfBoth('M19.4 80.6 L30.4 77 L33.4 79.2 L22.6 83.6 Z', t2[0]) + _pfBoth('M14 85.2 L22.6 83.6 L23.8 86 L15.6 88.6 Z', t2[0], 0.9)
      + _pfP('M40.4 75.8 Q45.2 79.4 50 86.6 Q54.8 79.4 59.6 75.8 Q50 80 40.4 75.8 Z', _pfMix(sk[0], sk[1], 0.45)) + _pfS('M39.6 75.6 Q45 79.8 50 87.4 Q55 79.8 60.4 75.6', t2[0], 2)
      + _pfC(61.4, 90, 3.1, t2[0]) + _pfP(_pfStar(61.4, 90.2, 2.1, 0.9, 5), tc[0]) + det(_pfS('M30 92 L30 100 M70 92 L70 100', tc[1], 0.6, 0.4));
    case 'kurta': return _pfTopBase(tc, small, x) + _pfP('M42.6 73.8 Q50 76.6 57.4 73.8 L57.8 77.8 Q50 80.6 42.2 77.8 Z', tc[1])
      + _pfS('M42.4 75.8 Q50 78.6 57.6 75.8', t2[0], 0.8) + _pfP('M47.4 78.6 L52.6 78.6 L52.6 100 L47.4 100 Z', tc[2], 0.35)
      + _pfS('M47.4 78.8 L47.4 100 M52.6 78.8 L52.6 100', t2[0], 0.9) + _pfC(50, 82, 0.7, t2[0]) + _pfC(50, 86, 0.7, t2[0]) + _pfC(50, 90, 0.7, t2[0])
      + det([0, 1, 2, 3, 4, 5].map(i => { const y = 79.6 + i * 3.4; return _pfP(`M45.6 ${_pfN(y)} L46.5 ${_pfN(y + 1.2)} L45.6 ${_pfN(y + 2.4)} L44.7 ${_pfN(y + 1.2)} Z`, t2[0]) + _pfP(`M54.4 ${_pfN(y)} L55.3 ${_pfN(y + 1.2)} L54.4 ${_pfN(y + 2.4)} L53.5 ${_pfN(y + 1.2)} Z`, t2[0]); }).join(''));
    case 'kimono': return _pfTopBase(tc, small, x) + _pfP('M41.6 75.8 Q46 81 48.8 91.4 Q52 81 58.4 75.8 Q50 80.4 41.6 75.8 Z', _pfMix(sk[0], sk[1], 0.45))
      + _pfP('M38.4 75.4 L43.4 75.6 L53.6 94 L50.2 96.8 Z', t2[0]) + _pfS('M43.4 75.6 L53.6 94', t2[3], 0.5, 0.5)
      + _pfP('M56.6 75.6 L61.6 75.4 L45.6 100 L39.6 100 Z', t2[0]) + _pfS('M56.6 75.6 L39.6 100', t2[3], 0.6, 0.6) + det(_pfS('M59.2 75.6 L42.6 100', t2[2], 0.6, 0.6));
    case 'ruffle': {
      let s = _pfTopBase(tc, small, x);
      for (let i = 0; i <= 9; i++) { const t = i / 9, xx = 37 + 26 * t, yy = 76.6 + Math.sin(t * Math.PI) * 5.2; s += _pfC(xx, yy + 1.2, 2.6, t2[0]) + (small ? '' : _pfS(`M${_pfN(xx - 2.2)} ${_pfN(yy + 2.2)} Q${_pfN(xx)} ${_pfN(yy + 4.4)} ${_pfN(xx + 2.2)} ${_pfN(yy + 2.2)}`, t2[3], 0.45, 0.45)); }
      for (let y = 85.6; y < 100; y += 3.4) s += _pfE(50, y, 3.4, 1.9, t2[0]) + (small ? '' : _pfS(`M46.8 ${_pfN(y + 0.8)} Q50 ${_pfN(y + 2.6)} 53.2 ${_pfN(y + 0.8)}`, t2[3], 0.45, 0.45));
      return s + _pfS('M37.6 77 Q50 83.8 62.4 77', t2[1], 0.6, 0.5);
    }
    case 'sailor': return _pfTopBase(tc, small, x) + _pfP('M33.4 76 L44 76.4 L50 90 L56 76.4 L66.6 76 L71.4 84 Q60 89.6 50 98.4 Q40 89.6 28.6 84 Z', t2[0])
      + _pfS('M31.2 82.6 Q40 87.6 50 95.6 Q60 87.6 68.8 82.6', '#f4f0e6', 0.9) + det(_pfS('M30.2 81 Q40 86 50 94 Q60 86 69.8 81', '#f4f0e6', 0.6, 0.8))
      + _pfP('M50 90.6 L45 88.4 L45.6 93 Z', '#d63a3a') + _pfP('M50 90.6 L55 88.4 L54.4 93 Z', '#d63a3a') + _pfP('M48.6 90.6 L47 99 L49.6 98 Z', '#c22a30') + _pfP('M51.4 90.6 L53 99 L50.4 98 Z', '#c22a30') + _pfC(50, 90.8, 1.2, '#b02428');
    default: return _pfTopBase(tc, small, x) + crew(2.4);
  }
}

/* ---------- fabric patterns ---------- */
function _pfPattern(kind, pc, base, id, silD, small) {
  if (!silD || !kind || kind === 'none') return '';
  const r = _pfRand(kind.length * 131 + kind.charCodeAt(0));
  const rect = (x, y, w, h, f, op) => `<rect x="${_pfN(x)}" y="${_pfN(y)}" width="${_pfN(w)}" height="${_pfN(h)}" fill="${f}"${_pfOp(op)}/>`;
  let g = '';
  switch (kind) {
    case 'stripes': for (let y = 78.4; y < 101; y += 4.4) g += rect(0, y, 100, 1.9, pc[0]); break;
    case 'pinstripe': for (let x = 1.8; x < 100; x += 3.6) g += rect(x, 70, 0.55, 31, pc[0], 0.85); break;
    case 'gingham': for (let x = 0; x < 100; x += 5) g += rect(x, 70, 2.5, 31, pc[0], 0.45); for (let y = 72; y < 101; y += 5) g += rect(0, y, 100, 2.5, pc[0], 0.45); break;
    case 'tartan':
      for (let x = 2; x < 100; x += 11) g += rect(x, 70, 4.4, 31, pc[0], 0.4);
      for (let y = 74; y < 101; y += 11) g += rect(0, y, 100, 4.4, pc[0], 0.4);
      for (let x = 8.6; x < 100; x += 11) g += rect(x, 70, 0.6, 31, base[3], 0.55);
      for (let y = 80.6; y < 101; y += 11) g += rect(0, y, 100, 0.6, base[3], 0.55);
      for (let x = 4; x < 100; x += 11) g += rect(x, 70, 0.4, 31, pc[2], 0.7);
      break;
    case 'polka': for (let j = 0, y = 76; y < 102; y += 5.6, j++) for (let x = (j % 2) * 2.8; x < 101; x += 5.6) g += _pfC(x, y, 1.25, pc[0]); break;
    case 'floral':
      for (let j = 0, y = 77; y < 104; y += 7.6, j++) for (let x = (j % 2) * 4 + 2; x < 102; x += 8) {
        const fx = x + (r() - 0.5) * 2.4, fy = y + (r() - 0.5) * 2;
        if (!small) g += _pfE(fx + 2, fy + 1.6, 1.4, 0.6, pc[3], 0.7, 30 + r() * 40);
        for (let q = 0; q < 5; q++) { const an = q * 1.2566 + j; g += _pfC(fx + 1.25 * Math.cos(an), fy + 1.25 * Math.sin(an), small ? 1.2 : 1.05, pc[0]); }
        g += _pfC(fx, fy, 0.65, q2(pc));
      }
      break;
    case 'stars': for (let j = 0, y = 78; y < 104; y += 8, j++) for (let x = (j % 2) * 4.5 + 2; x < 102; x += 9) g += _pfP(_pfStar(x + (r() - 0.5) * 2, y + (r() - 0.5) * 2, 1.9, 0.8, 5), pc[0]); break;
    case 'hearts': for (let j = 0, y = 78; y < 104; y += 7.4, j++) for (let x = (j % 2) * 4 + 2; x < 102; x += 8) g += _pfP(_pfHeartD(x, y, 1.4), pc[0]); break;
    case 'zigzag': for (let y = 77; y < 104; y += 5.2) { let d = `M-2 ${_pfN(y)}`; for (let x = -2, k = 0; x < 104; x += 3, k++) d += ` L${_pfN(x + 3)} ${_pfN(y + (k % 2 ? 0 : -2))}`; g += _pfS(d, pc[0], 1.1); } break;
    case 'block': g += _pfP('M-2 90.6 L102 86.4 L102 102 L-2 102 Z', pc[0]) + _pfS('M-2 90.6 L102 86.4', pc[2], 0.8, 0.8); break;
    case 'raglan': g += _pfBoth('M-2 68 L39 68 L39.4 76.8 L21.6 102 L-2 102 Z', pc[0]); break;
    case 'tiedye': {
      const cols = [pc[0], '#f06a9a', '#f6d35e', '#3fb4c8', '#8b5cf6', pc[2]];
      for (let i = 0, rr = 44; rr > 3; rr -= 4.2, i++) g += _pfC(50, 106, rr, cols[i % cols.length], 0.78);
      if (!small) for (let k = 0; k < 10; k++) { const an = -Math.PI + k * Math.PI / 9; g += _pfS(`M50 106 Q${_pfN(50 + 26 * Math.cos(an + 0.45))} ${_pfN(106 + 26 * Math.sin(an + 0.45))} ${_pfN(50 + 46 * Math.cos(an))} ${_pfN(106 + 46 * Math.sin(an))}`, base[0], 1.6, 0.4); }
      break;
    }
    case 'camo': {
      const cols = [pc[0], _pfMix(pc[0], base[0], 0.5), base[3], pc[1]];
      for (let i = 0; i < (small ? 16 : 44); i++) { const x = r() * 104 - 2, y = 70 + r() * 32; g += _pfP(`M${_pfN(x - 3.4)} ${_pfN(y)} Q${_pfN(x - 2)} ${_pfN(y - 2.6 - r() * 1.4)} ${_pfN(x + 0.6)} ${_pfN(y - 1.6)} Q${_pfN(x + 3.6)} ${_pfN(y - 2.4)} ${_pfN(x + 3.8)} ${_pfN(y + 0.2)} Q${_pfN(x + 2.4)} ${_pfN(y + 2.6 + r() * 1.2)} ${_pfN(x - 0.4)} ${_pfN(y + 1.6)} Q${_pfN(x - 3.6)} ${_pfN(y + 2)} ${_pfN(x - 3.4)} ${_pfN(y)} Z`, cols[i % 4], 0.92); }
      break;
    }
    case 'leopard':
      for (let j = 0, y = 77; y < 104; y += 6.4, j++) for (let x = (j % 2) * 3.4 + 1; x < 102; x += 6.8) {
        const fx = x + (r() - 0.5) * 2, fy = y + (r() - 0.5) * 1.6, rot = r() * 180;
        g += _pfE(fx, fy, 1.6, 1.2, pc[0], 1, rot) + (small ? '' : `<ellipse cx="${_pfN(fx)}" cy="${_pfN(fy)}" rx="2" ry="1.6" fill="none" stroke="#2a2124" stroke-width="0.7" stroke-dasharray="2.2 1.2" transform="rotate(${_pfN(rot)} ${_pfN(fx)} ${_pfN(fy)})"/>`);
      }
      break;
    case 'tropical':
      for (const [x, y, rot, k] of [[12, 86, -30, 1], [32, 97, 20, 0.9], [57, 83, -10, 1.1], [80, 95, 35, 1], [95, 79, -50, 0.9], [22, 75, 60, 0.8], [70, 103, 0, 1], [44, 106, 70, 0.9]]) {
        const leaf = `M0 -6.4 Q4.6 -2.6 0 6.4 Q-4.6 -2.6 0 -6.4 Z`;
        g += `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})"><path d="${leaf}" fill="${pc[0]}"/>` + (small ? '' : `<path d="M0 -6 L0 6 M0 -2 L2.6 -3.6 M0 1 L3 -0.2 M0 -2 L-2.6 -3.6 M0 1 L-3 -0.2" fill="none" stroke="${pc[3]}" stroke-width="0.45" opacity="0.8"/>`) + '</g>';
      }
      for (const [x, y] of [[46, 90], [86, 84], [21, 97]]) { for (let q = 0; q < 5; q++) { const an = q * 1.2566 + 0.3; g += _pfE(x + 1.5 * Math.cos(an), y + 1.5 * Math.sin(an), 1.6, 1.05, '#f0607a', 1, q * 72 + 17); } g += _pfC(x, y, 0.7, '#f6d35e'); }
      break;
    case 'bats':
      for (let j = 0, y = 79; y < 104; y += 8, j++) for (let x = (j % 2) * 5 + 3; x < 102; x += 10) {
        g += _pfP(`M${_pfN(x - 3)} ${_pfN(y)} Q${_pfN(x - 2)} ${_pfN(y - 1.6)} ${_pfN(x - 0.6)} ${_pfN(y - 0.6)} L${_pfN(x)} ${_pfN(y - 1.4)} L${_pfN(x + 0.6)} ${_pfN(y - 0.6)} Q${_pfN(x + 2)} ${_pfN(y - 1.6)} ${_pfN(x + 3)} ${_pfN(y)} Q${_pfN(x + 1.8)} ${_pfN(y - 0.2)} ${_pfN(x + 1.4)} ${_pfN(y + 0.8)} Q${_pfN(x + 0.6)} ${_pfN(y)} ${_pfN(x)} ${_pfN(y + 1)} Q${_pfN(x - 0.6)} ${_pfN(y)} ${_pfN(x - 1.4)} ${_pfN(y + 0.8)} Q${_pfN(x - 1.8)} ${_pfN(y - 0.2)} ${_pfN(x - 3)} ${_pfN(y)} Z`, pc[0]);
      }
      break;
    case 'snow':
      for (let j = 0, y = 78; y < 104; y += 8, j++) for (let x = (j % 2) * 4.5 + 2; x < 102; x += 9) {
        for (let i = 0; i < 3; i++) { const an = i * Math.PI / 3; g += _pfS(`M${_pfN(x - 1.8 * Math.cos(an))} ${_pfN(y - 1.8 * Math.sin(an))} L${_pfN(x + 1.8 * Math.cos(an))} ${_pfN(y + 1.8 * Math.sin(an))}`, pc[0], 0.5); }
      }
      break;
    default: return '';
  }
  return _pfClipG(id, silD, g);
  function q2(p) { return _pfMix(p[0], '#f6d35e', 0.7); }
}

/* ---------- outerwear ---------- */
const _PF_PANEL_L = 'M8 100 C8 86 18.6 78.4 33.4 75.4 L38.6 75.2 L42.4 83 L45 100 Z';
function _pfOuterBack(kind, oc, t2) {
  switch (kind) {
    case 'raincoat': return _pfP('M30 80 Q29.4 69 39 66 L61 66 Q70.6 69 70 80 Q50 74 30 80 Z', oc[1]) + _pfP('M35 78 Q36 70.6 42.4 68.6 L57.6 68.6 Q64 70.6 65 78 Q50 73.6 35 78 Z', oc[3], 0.45);
    case 'cape': return _pfP('M34.6 77 Q33 66 39.6 61.6 L60.4 61.6 Q67 66 65.4 77 Q50 72 34.6 77 Z', t2[0]);
    case 'puffer': return _pfP('M37.2 74 Q37.6 68.6 42 67.4 L58 67.4 Q62.4 68.6 62.8 74 Z', oc[1]);
    default: return '';
  }
}
function _pfOuter(kind, oc, t2, mt, small) {
  if (!kind || kind === 'none') return '';
  const det = (s) => (small ? '' : s);
  const panels = (c, d) => _pfBoth(d || _PF_PANEL_L, c[0]) + _pfP('M12 100 C12 88 21 80.5 31.4 77.4 C26 82 22 90 22 100 Z', c[2], 0.45) + _pfP(_PF_SHOULDER_SHADE.replace('67 77.6', '68.6 77.4'), c[1], 0.5);
  const dash = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${_pfN(w || 0.45)}" stroke-dasharray="1.1 0.9" stroke-linecap="round"/>`;
  const closed = 'M8 100 C8 86 18.6 78.4 33.4 75.4 L38.4 75.2 Q44 80 50 80.8 L50 100 Z';
  switch (kind) {
    case 'denim': return panels(oc) + _pfBoth('M34.2 74.6 L41.6 75 L46.2 85 L38.6 80.8 Z', oc[2]) + _pfBothS('M34.2 74.6 L41.6 75 L46.2 85 L38.6 80.8 Z', oc[3], 0.5, 0.6)
      + _pfBoth('M26.8 86.2 L36.6 85.2 L37 88.8 L32 90.6 L27.2 89.6 Z', oc[1])
      + _pfC(32, 89.4, 0.7, '#b87333') + _pfC(68, 89.4, 0.7, '#b87333') + _pfC(44.4, 91.4, 0.75, '#b87333') + _pfC(45.4, 97.4, 0.75, '#b87333')
      + det(dash('M42.8 83.4 L45.4 100', '#d9a441') + dash(_pfMirror('M42.8 83.4 L45.4 100'), '#d9a441') + dash('M27 85.4 L36.8 84.4', '#d9a441') + dash(_pfMirror('M27 85.4 L36.8 84.4'), '#d9a441')
        + dash('M14 100 C14 92 18 86 24 83', '#d9a441') + dash(_pfMirror('M14 100 C14 92 18 86 24 83'), '#d9a441'));
    case 'leather': return panels(oc) + _pfBoth('M33 75 L41.8 75.4 L44.8 86.4 L37.8 90.8 L31.2 82.6 Z', oc[2]) + _pfBothS('M33 75 L41.8 75.4 L44.8 86.4 L37.8 90.8 L31.2 82.6', oc[3], 0.6, 0.7)
      + _pfC(34.4, 84.6, 0.65, mt[0]) + _pfC(65.6, 84.6, 0.65, mt[0]) + _pfS('M57 90 L60 100', mt[0], 0.8) + _pfP('M56.4 89 L58.2 88.6 L58.6 91.8 L57 92 Z', mt[0])
      + det(_pfS('M14.6 97 Q17 88.6 24.4 84', '#ffffff', 1.3, 0.2) + _pfS('M85.4 97 Q83.6 90 79 86', '#ffffff', 0.9, 0.14) + _pfS('M20 93 L28 91.4', mt[0], 0.6, 0.8));
    case 'blazer': return _pfBoth('M8 100 C8 86 18.6 78.4 33.4 75.4 L38.6 75.2 L49.6 97 L50 100 Z', oc[0]) + _pfP(_PF_SHOULDER_LIGHT, oc[2], 0.4) + _pfP(_PF_SHOULDER_SHADE, oc[1], 0.45)
      + _pfBoth('M35 75.2 L41.6 75.4 L49.4 96.4 L46.4 96.8 L40.4 86.4 L36.4 84.6 L38.4 82 L33.8 78.8 Z', oc[2]) + _pfBothS('M41.6 75.4 L49.4 96.4 M40.4 86.4 L36.4 84.6 L38.4 82', oc[3], 0.55, 0.7)
      + _pfC(50, 98.4, 0.9, oc[3]) + _pfS('M58.4 90 L66.4 89.6', oc[3], 0.8, 0.8) + _pfP('M59.4 90 L60.8 86.6 L62.4 88.8 L63.8 86.4 L65.2 89.8 Z', t2[0])
      + det(_pfS('M20 97.6 L29.4 97', oc[3], 0.7, 0.6));
    case 'bomber': return panels(oc, closed) + _pfP('M38.4 75 Q50 79.4 61.6 75 L62.4 78.8 Q50 83.6 37.6 78.8 Z', t2[0])
      + det(_pfS('M39.4 76.4 Q50 80.6 60.6 76.4 M39.2 77.8 Q50 82.2 60.8 77.8', t2[3], 0.45, 0.6)) + _pfS('M50 82 L50 100', mt[0], 0.9) + _pfP('M50.4 84 L52 84 L51.8 87 L50.6 87 Z', mt[0])
      + det(_pfS('M16 96 Q18.6 88.6 25.4 84.6', '#ffffff', 1.1, 0.18) + _pfS('M24 92.4 L31.6 91', oc[3], 0.7, 0.6));
    case 'fleece': {
      let s = panels(oc, 'M8 100 C8 86 18.6 78.4 33.4 75.4 L38.4 75.2 Q42 79 47.6 86.6 L50 88.6 L50 100 Z') + _pfP('M39.4 73.2 Q50 76.2 60.6 73.2 L61.6 77.6 Q56 80.8 51.6 86.4 L50 88.4 L48.4 86.4 Q44 80.8 38.4 77.6 Z', oc[1], 0.9)
        + _pfS('M50 88.6 L50 100', mt[0], 0.8) + _pfP('M49.4 89.4 L51 89.4 L50.8 92.2 L49.6 92.2 Z', mt[0]);
      if (!small) { const r = _pfRand(5); for (let i = 0; i < 40; i++) s += _pfC(10 + r() * 80, 80 + r() * 20, 0.35, oc[2], 0.5); }
      return s;
    }
    case 'puffer': {
      let s = panels(oc, closed) + _pfP('M38.6 70.6 Q50 73.8 61.4 70.6 L62.6 79.4 Q50 84 37.4 79.4 Z', oc[0]) + _pfP('M38.6 70.6 Q50 73.8 61.4 70.6 L61.6 72.6 Q50 75.8 38.4 72.6 Z', oc[2], 0.6);
      for (const y of [86, 92.4, 98.6]) s += _pfS(`M9 ${_pfN(y + 2)} Q30 ${_pfN(y - 2.4)} 50 ${_pfN(y)} Q70 ${_pfN(y - 2.4)} 91 ${_pfN(y + 2)}`, oc[3], 0.8, 0.7) + det(_pfS(`M12 ${_pfN(y - 1.4)} Q30 ${_pfN(y - 5.2)} 48 ${_pfN(y - 3.2)}`, oc[2], 1.2, 0.45) + _pfS(`M52 ${_pfN(y - 3.2)} Q70 ${_pfN(y - 5.2)} 88 ${_pfN(y - 1.4)}`, oc[2], 1.2, 0.45));
      return s + _pfS('M50 72.6 L50 100', mt[0], 0.9) + _pfP('M50.4 74.6 L52 74.6 L51.8 77.6 L50.6 77.6 Z', mt[0]);
    }
    case 'gilet': {
      const d = 'M17.4 100 C17.4 90 21.6 83 32.4 77.4 L38.4 75.6 Q44 80 50 80.8 L50 100 Z';
      let s = _pfBoth(d, oc[0]) + _pfBothS('M17.4 100 C17.4 90 21.6 83 32.4 77.4', oc[3], 0.8, 0.6) + _pfP('M39 72.6 Q50 75.4 61 72.6 L62 78.6 Q50 83 38 78.6 Z', oc[1]);
      for (const y of [87, 94]) s += _pfS(`M18.6 ${_pfN(y + 1.6)} Q34 ${_pfN(y - 2)} 50 ${_pfN(y)} Q66 ${_pfN(y - 2)} 81.4 ${_pfN(y + 1.6)}`, oc[3], 0.7, 0.7);
      return s + _pfS('M50 80.6 L50 100', mt[0], 0.8);
    }
    case 'raincoat': return panels(oc) + _pfBoth('M35 75 L41.4 75.4 L44.6 83.6 L38.4 80.8 Z', oc[2]) + _pfC(43.6, 90, 0.85, mt[0]) + _pfC(44.6, 96.4, 0.85, mt[0])
      + det(_pfS('M15.6 97 Q18 88 26 83.4', '#ffffff', 1.6, 0.3) + _pfS('M82 92 Q80 87 76 85', '#ffffff', 1, 0.2)) + _pfC(56.4, 90, 0.85, mt[0]) + _pfC(55.4, 96.4, 0.85, mt[0]);
    case 'trench': return _pfBoth('M8 100 C8 86 18.6 78.4 33.4 75.4 L38.6 75.2 L47.4 92 L46.4 100 Z', oc[0]) + _pfP(_PF_SHOULDER_LIGHT, oc[2], 0.4) + _pfP(_PF_SHOULDER_SHADE, oc[1], 0.45)
      + _pfBoth('M34 75 L41.4 75.2 L47.6 89.6 L42.6 91 L37.2 84.4 L33.6 83.4 L35.6 80.4 L31.6 78.4 Z', oc[2]) + _pfBothS('M41.4 75.2 L47.6 89.6 M37.2 84.4 L33.6 83.4 L35.6 80.4', oc[3], 0.55, 0.7)
      + _pfP('M62 76.4 L78.4 80.4 L74.8 88.6 L60.6 84.6 Z', oc[2]) + _pfS('M62 76.4 L78.4 80.4 L74.8 88.6 L60.6 84.6', oc[3], 0.5, 0.6)
      + _pfBoth('M21.6 79.6 L31.2 76.6 L31.8 78.6 L22.2 81.8 Z', oc[1]) + [[42.4, 94], [57.6, 94], [42.6, 99.4], [57.4, 99.4]].map(([x, y]) => _pfC(x, y, 0.85, oc[3])).join('');
    case 'robe': {
      const band = 'M32.4 75 L40.6 74.6 Q43.6 86 52.6 100 L43.4 100 Q35.6 88 32.4 75 Z';
      let s = _pfBoth(closed, oc[0]) + _pfP(_PF_SHOULDER_LIGHT, oc[2], 0.4) + _pfP(_PF_SHOULDER_SHADE, oc[1], 0.4)
        + _pfP(_pfMirror(band), oc[2]) + _pfP(band, oc[2]) + _pfS('M40.6 74.6 Q43.6 86 52.6 100', oc[1], 0.8, 0.7);
      if (!small) { const r = _pfRand(9); for (let i = 0; i < 16; i++) { const t = i / 15; s += _pfC(32.2 + t * 11 - 0.6, 75 + t * 25, 1.1, oc[2]) + _pfC(67.8 - t * 8.6 + 0.6, 75 + t * 18, 1.1, oc[2]); }
        for (let i = 0; i < 30; i++) { const t = r(); s += _pfC(35 + t * 12 + r() * 4, 76 + t * 23, 0.35, oc[1], 0.4); } }
      return s;
    }
    case 'apron': return _pfBothS('M39.4 82.4 L42.8 71.4', oc[1], 1.4) + _pfP('M37.8 82 L62.2 82 L63.2 100 L36.8 100 Z', oc[0]) + _pfP('M37.8 82 L62.2 82 L62.4 84 L37.6 84 Z', oc[1], 0.5)
      + _pfS('M44 90.6 L56 90.6 L56 97.4 L44 97.4 Z', oc[3], 0.7, 0.75) + _pfS('M50 90.6 L50 97.4', oc[3], 0.6, 0.6) + det(_pfP(_pfHeartD(47, 93.6, 1.3), t2[0]));
    case 'hivis': {
      const hv = pfTone('#d8f03a'), d = 'M17.4 100 C17.4 90 21.6 83 32.4 77.4 L38.4 75.6 Q41 82 45.6 100 Z';
      return _pfBoth(d, hv[0]) + _pfP('M66 78 C76 82 82 90 82.6 100 L76 100 Q74 88 66 78 Z', hv[1], 0.4)
        + _pfBoth('M18 90 L42.6 90 L43 93 L17.8 93 Z', '#d6dbe0') + _pfBoth('M17.6 96.4 L44.2 96.4 L44.6 99.2 L17.6 99.2 Z', '#d6dbe0')
        + _pfBoth('M30.4 78.6 L34 77.4 L36.6 89.6 L32.8 89.8 Z', '#d6dbe0') + det(_pfBothS('M18 90 L42.6 90', '#ffffff', 0.4, 0.8));
    }
    case 'varsity': return panels(oc, closed) + _pfBoth('M8 100 C8 88 13 81.4 21.6 78.4 L24.8 86.4 Q19.8 92 18.8 100 Z', '#ece4d0')
      + _pfP('M38.4 75 Q50 79.4 61.6 75 L62.4 78.8 Q50 83.6 37.6 78.8 Z', oc[0]) + _pfS('M38.8 76.6 Q50 81 61.2 76.6', '#ece4d0', 0.7) + _pfS('M38.6 78.2 Q50 82.6 61.4 78.2', '#ece4d0', 0.5, 0.8)
      + [84, 89, 94, 99].map(y => _pfC(51.2, y, 0.65, mt[0])).join('') + _pfS('M50 82 L50 100', oc[3], 0.6, 0.6)
      + _pfP(_pfStar(62, 89.6, 3.6, 1.6, 5), '#ece4d0') + _pfP(_pfStar(62, 89.8, 2.4, 1, 5), oc[2]);
    case 'cape': return _pfP('M6 100 C6 86 16 76.6 34 74 Q50 77.2 66 74 C84 76.6 94 86 94 100 L60 100 Q56 86 50 83 Q44 86 40 100 Z', oc[0])
      + _pfP('M40 100 Q44 86 50 83 Q56 86 60 100 L57.4 100 Q54.4 88.6 50 86 Q45.6 88.6 42.6 100 Z', t2[0]) + _pfP(_PF_SHOULDER_LIGHT, oc[2], 0.35)
      + _pfS('M43.4 77.6 Q50 80.4 56.6 77.6', mt[0], 0.6) + _pfC(43.4, 77.4, 1.6, mt[0]) + _pfC(56.6, 77.4, 1.6, mt[0]) + det(_pfC(43, 77, 0.5, '#ffffff', 0.7) + _pfC(56.2, 77, 0.5, '#ffffff', 0.7));
    default: return '';
  }
}

/* ---------- dresses and the jumpsuit ---------- */
function _pfDress(kind, dc, t2, sk, small, x) {
  x = x || {};
  const det = (s) => (small ? '' : s), pat = (d) => (x.pat ? x.pat(d) : '');
  const body = 'M8 100 C8 86 19 78.5 35 75.6 Q50 80.5 65 75.6 C81 78.5 92 86 92 100 Z';
  const shade = (d) => _pfP(d, dc[1], 0.45);
  switch (kind) {
    case 'sundress': { const d = 'M24.6 100 C25 92 28.4 86.6 33.6 84 Q42 87.4 50 85.4 Q58 87.4 66.4 84 C71.6 86.6 75 92 75.4 100 Z';
      return _pfSkinChest(sk, small) + _pfP(d, dc[0]) + pat(d) + shade('M75.4 100 C75 92 71.6 86.6 66.4 84 Q70 92 70 100 Z') + _pfBothS('M35.6 84.6 L38.6 75.8', dc[1], 1.5)
        + _pfS('M33.6 84 Q42 87.4 50 85.4 Q58 87.4 66.4 84', dc[2], 0.8) + det(_pfP('M50 86.6 L47.6 85.4 L47.8 88 Z', t2[0]) + _pfP('M50 86.6 L52.4 85.4 L52.2 88 Z', t2[0]) + _pfC(50, 86.6, 0.6, t2[1])); }
    case 'slip': { const d = 'M26 100 C26.4 92 29.6 87 33.4 84.6 Q41 90 50 92.6 Q59 90 66.6 84.6 C70.4 87 73.6 92 74 100 Z';
      return _pfSkinChest(sk, small) + _pfP(d, dc[0]) + pat(d) + shade('M74 100 C73.6 92 70.4 87 66.6 84.6 Q68 92 68.6 100 Z') + _pfBothS('M34.2 84.8 L38.2 75.8', dc[1], 0.75)
        + _pfS('M33.4 84.6 Q41 90 50 92.6 Q59 90 66.6 84.6', dc[2], 0.7) + det(_pfS('M30 98 Q33 91 38 88.6', '#ffffff', 1.2, 0.25) + _pfS('M62 94 Q64.4 90.6 67 89', '#ffffff', 0.8, 0.2)); }
    case 'tea': return _pfP(body, dc[0]) + pat(body) + shade(_PF_SHOULDER_SHADE) + _pfE(15.6, 87, 9.6, 7.6, dc[0], 1, -24) + _pfE(84.4, 87, 9.6, 7.6, dc[0], 1, 24)
      + det(_pfS('M8.6 86 Q14 80.6 22 80', dc[2], 1.1, 0.6) + _pfS('M91.4 86 Q86 80.6 78 80', dc[1], 1.1, 0.5))
      + _pfP('M39.6 75.8 Q41.6 83.2 46.2 82.8 Q49 82.6 50 84.6 Q51 82.6 53.8 82.8 Q58.4 83.2 60.4 75.8 Q50 79.6 39.6 75.8 Z', _pfMix(sk[0], sk[1], 0.4))
      + _pfS('M39.6 75.8 Q41.6 83.2 46.2 82.8 Q49 82.6 50 84.6 Q51 82.6 53.8 82.8 Q58.4 83.2 60.4 75.8', dc[1], 0.9) + _pfC(50, 89, 0.7, t2[0]) + _pfC(50, 93, 0.7, t2[0]) + _pfC(50, 97, 0.7, t2[0]);
    case 'wrap': return _pfP(body, dc[0]) + pat(body) + _pfP(_PF_SHOULDER_LIGHT, dc[2], 0.4) + shade(_PF_SHOULDER_SHADE)
      + _pfP('M40.6 75.8 Q45.4 80 50 90 Q54.6 80 59.4 75.8 Q50 80.4 40.6 75.8 Z', _pfMix(sk[0], sk[1], 0.45)) + _pfS('M59.6 75.6 Q54 84 41 100', dc[3], 0.8, 0.7)
      + _pfS('M40.4 75.6 Q45.4 81 50.6 89.6', dc[3], 0.7, 0.6) + _pfE(61.6, 96.6, 2.6, 1.6, dc[1], 1, -20) + _pfE(65.8, 95.6, 2.4, 1.5, dc[1], 1, 20) + _pfC(63.6, 96.4, 1, dc[3])
      + det(_pfS('M62.6 97.4 L61 101 M64.6 97.4 L66.4 101', dc[1], 1.1));
    case 'shirtdress': return _pfP(body, dc[0]) + pat(body) + _pfP(_PF_SHOULDER_LIGHT, dc[2], 0.4) + shade(_PF_SHOULDER_SHADE) + _pfBoth('M37 75.4 L49.6 81.6 L44.5 88.5 L36 79 Z', dc[2])
      + _pfBothS('M37 75.4 L49.6 81.6 L44.5 88.5', dc[3], 0.6, 0.6) + _pfS('M50 81.6 L50 100', dc[3], 0.8, 0.6) + _pfC(50, 87, 0.9, dc[3]) + _pfC(50, 93.4, 0.9, dc[3]) + _pfC(50, 99, 0.9, dc[3])
      + _pfBoth('M27.4 88.4 L36.4 87.6 L36.6 90.6 L32 92 L27.6 91.2 Z', dc[1]);
    case 'knit': { let s = _pfP(body, dc[0]) + pat(body) + _pfP(_PF_SHOULDER_LIGHT, dc[2], 0.4) + shade(_PF_SHOULDER_SHADE)
        + _pfP('M42.2 63.6 Q50 66.4 57.8 63.6 L59 78.4 Q50 82.2 41 78.4 Z', dc[0]) + _pfP('M42 64.4 Q50 67.8 58 64.4 L58.4 69.8 Q50 73 41.6 69.8 Z', dc[2], 0.55) + _pfS('M41.6 69.8 Q50 73 58.4 69.8', dc[1], 0.9, 0.7);
      if (!small) for (const cx of [27, 39, 61, 73]) for (let y = 84; y < 100; y += 3.2) s += _pfS(`M${cx - 1.4} ${_pfN(y)} Q${cx} ${_pfN(y + 1.6)} ${cx + 1.4} ${_pfN(y)} M${cx - 1.4} ${_pfN(y + 1.6)} Q${cx} ${_pfN(y)} ${cx + 1.4} ${_pfN(y + 1.6)}`, dc[1], 0.55, 0.6);
      return s; }
    case 'pinafore': { const d = 'M37.6 84 L62.4 84 L63.4 100 L36.6 100 Z';
      return _pfBoth('M38.4 84.4 L35.8 75.8 L39.4 75.6 L41.4 84.4 Z', dc[0]) + _pfP(d, dc[0]) + pat(d) + _pfP('M58 84 L62.4 84 L63.4 100 L59 100 Z', dc[1], 0.45)
        + _pfC(39.8, 85.8, 0.9, '#d9b04a') + _pfC(60.2, 85.8, 0.9, '#d9b04a') + det(_pfS('M38.2 86 L61.8 86', dc[3], 0.4, 0.5) + _pfS('M45 91 L55 91 L55 96.4 Q50 97.4 45 96.4 Z', dc[3], 0.55, 0.6)); }
    case 'jumpsuit': return _pfP(body, dc[0]) + pat(body) + _pfP(_PF_SHOULDER_LIGHT, dc[2], 0.4) + shade(_PF_SHOULDER_SHADE) + _pfBoth('M37 75.4 L49 80.6 L45.4 86.4 L36 79 Z', dc[2])
      + _pfBothS('M37 75.4 L49 80.6 L45.4 86.4', dc[3], 0.55, 0.6) + _pfS('M50 80.6 L50 100', dc[3], 0.9) + _pfP('M50.4 82.6 L51.8 82.6 L51.6 85.4 L50.6 85.4 Z', '#c3c8d0')
      + _pfBoth('M27 87.6 L37 87 L37.2 94.4 L27.4 95 Z', dc[1], 0.6) + _pfBothS('M27.2 89 L37 88.4', dc[3], 0.6, 0.7);
    case 'gown': { const d = 'M14 100 C15 92 19 87 24 85.6 Q36 83.6 42 84.6 Q47 82.6 50 85.6 Q53 82.6 58 84.6 Q64 83.6 76 85.6 C81 87 85 92 86 100 Z';
      let s = _pfSkinChest(sk, small) + _pfP(d, dc[0]) + pat(d) + shade('M86 100 C85 92 81 87 76 85.6 Q79 92 79.6 100 Z') + _pfS('M24 85.6 Q36 83.6 42 84.6 Q47 82.6 50 85.6 Q53 82.6 58 84.6 Q64 83.6 76 85.6', dc[2], 0.9);
      if (!small) { const r = _pfRand(17); for (let i = 0; i < 44; i++) s += _pfC(18 + r() * 64, 87 + r() * 13, 0.38 + r() * 0.3, '#ffffff', 0.35 + r() * 0.4); s += _pfP(_pfSpark(31, 91, 1.6), '#ffffff', 0.9) + _pfP(_pfSpark(66, 94, 1.3), '#ffffff', 0.85); }
      return s; }
    default: return '';
  }
}
function _pfBib(bc, mt, small) {
  return _pfBoth('M39.2 85.4 L36.8 75.8 L40.4 75.6 L42.2 85.4 Z', bc[0]) + _pfBothS('M39.2 85.4 L36.8 75.8', bc[1], 0.5, 0.7) + _pfP('M38.4 85 L61.6 85 L62.4 100 L37.6 100 Z', bc[0])
    + _pfP('M57.6 85 L61.6 85 L62.4 100 L58.6 100 Z', bc[1], 0.45) + `<rect x="38.9" y="84.6" width="3.4" height="2.6" rx="0.6" fill="${mt[0]}"/><rect x="57.7" y="84.6" width="3.4" height="2.6" rx="0.6" fill="${mt[0]}"/>`
    + _pfS('M45 89.4 L55 89.4 L55 95.4 Q50 96.8 45 95.4 Z', bc[3], 0.55, 0.7)
    + (small ? '' : `<path d="M39.4 87.6 L40.2 100 M60.6 87.6 L59.8 100" fill="none" stroke="#d9a441" stroke-width="0.4" stroke-dasharray="1.1 0.9"/>`);
}

/* ---------- necklaces, ties, pins, bag straps ---------- */
function _pfNecklace(kind, mt, small, x) {
  if (!kind || kind === 'none') return '';
  x = x || {};
  const curve = (t, depth) => { const y0 = 72.4, y1 = 72.4 + depth; const xx = 43.6 + 12.8 * t; return [xx, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y1 + depth * 0.7) + t * t * y0]; };
  const chain = (depth, w) => _pfS(`M43.6 72.4 Q44.4 ${_pfN(72.4 + depth * 1.7)} 50 ${_pfN(72.4 + depth * 1.05)} Q55.6 ${_pfN(72.4 + depth * 1.7)} 56.4 72.4`, mt[0], w || 0.6);
  const beads = (depth, n, r, cols) => { let s = ''; for (let i = 1; i < n; i++) { const [xx, yy] = curve(i / n, depth); s += _pfC(xx, yy, r, cols[i % cols.length]) + (small ? '' : _pfC(xx - r * 0.3, yy - r * 0.3, r * 0.35, '#ffffff', 0.6)); } return s; };
  switch (kind) {
    case 'chain': return chain(11);
    case 'pendant': return chain(11.4) + _pfP(_pfHeartD(50, 85.6, 1.7), mt[0]) + (small ? '' : _pfC(49.4, 84.8, 0.4, '#ffffff', 0.7));
    case 'locket': return chain(11.2) + _pfE(50, 86.6, 1.7, 2.1, mt[0]) + (small ? '' : _pfE(50, 86.6, 1, 1.35, mt[1], 0.7) + _pfC(49.4, 85.8, 0.35, '#ffffff', 0.8));
    case 'pearls': return beads(9.6, 14, 0.9, ['#f3eee3', '#ece5d6']);
    case 'choker': return x.roll ? '' : _pfP('M43.5 69.4 Q50 72.2 56.5 69.4 L56.5 71.6 Q50 74.4 43.5 71.6 Z', '#2a2226') + _pfC(50, 74.2, 0.8, mt[0]);
    case 'beads': return beads(9.8, 13, 0.95, ['#e5534b', '#f4d35e', '#4caf6a', '#3b82f6', '#a26be0', '#f08a3c']);
    case 'layered': return chain(7.6, 0.5) + chain(15.4, 0.55) + _pfP(_pfStar(50, 89.6, 1.7, 0.7, 5), mt[0]) + _pfC(50, 80.4, 0.6, mt[0]);
    case 'shell': { let s = _pfS('M43.6 72.4 Q44.4 91 50 84.2 Q55.6 91 56.4 72.4', '#9a6a40', 0.5);
      for (const t of [0.22, 0.4, 0.6, 0.78]) { const [xx, yy] = curve(t, 9); s += _pfP(`M${_pfN(xx - 1.2)} ${_pfN(yy - 0.4)} Q${_pfN(xx)} ${_pfN(yy - 2)} ${_pfN(xx + 1.2)} ${_pfN(yy - 0.4)} L${_pfN(xx)} ${_pfN(yy + 1.2)} Z`, '#f6eedf') + (small ? '' : _pfS(`M${_pfN(xx)} ${_pfN(yy + 1)} L${_pfN(xx)} ${_pfN(yy - 1.4)}`, '#d8c4a4', 0.3)); }
      return s; }
    case 'medal': return _pfP('M44.2 71 L49 88 L51 88 L55.8 71 L53.4 71 L50 84 L46.6 71 Z', '#d63a3a') + _pfP('M46.2 71 L49.6 86 L50.4 86 L53.8 71 L52.2 71 L50 80.6 L47.8 71 Z', '#3b6cf6', 0.85)
      + _pfC(50, 91, 3.2, '#d4a72c') + _pfC(50, 91, 2.3, '#f6d77a') + _pfP(_pfStar(50, 91.2, 1.6, 0.7, 5), '#d4a72c');
    default: return '';
  }
}
function _pfTie(kind, tc, small) {
  switch (kind) {
    case 'tie': return _pfP('M48.2 79.2 L51.8 79.2 L51.2 82.8 L48.8 82.8 Z', tc[1]) + _pfP('M48.8 82.6 L51.2 82.6 L53.6 97.6 L50 101 L46.4 97.6 Z', tc[0])
      + _pfP('M50 82.6 L51.2 82.6 L53.6 97.6 L50 101 Z', tc[1], 0.4) + (small ? '' : _pfS('M47.4 89 L52.4 86 M46.8 94 L53.2 90.2 M47.6 98.6 L53.4 95', tc[2], 0.6, 0.7));
    case 'skinny': return _pfP('M48.8 79.2 L51.2 79.2 L50.8 82 L49.2 82 Z', tc[1]) + _pfP('M49.2 81.8 L50.8 81.8 L51.8 98.4 L50 100.6 L48.2 98.4 Z', tc[0]) + _pfP('M50 81.8 L50.8 81.8 L51.8 98.4 L50 100.6 Z', tc[1], 0.4);
    case 'bow': return _pfP('M44.6 77.8 L49.2 80.2 L44.6 82.8 Q43.6 80.3 44.6 77.8 Z', tc[0]) + _pfP('M55.4 77.8 L50.8 80.2 L55.4 82.8 Q56.4 80.3 55.4 77.8 Z', tc[0])
      + _pfP('M55.4 77.8 L50.8 80.2 L55.4 82.8 Q56.4 80.3 55.4 77.8 Z', tc[1], 0.4) + `<rect x="48.6" y="78.8" width="2.8" height="2.9" rx="0.8" fill="${tc[1]}"/>`;
    case 'lanyard': return _pfS('M43.8 72 L48.6 88.4 M56.2 72 L51.4 88.4', tc[0], 1) + _pfC(50, 88.8, 0.9, '#c3c8d0')
      + `<rect x="45.4" y="89.6" width="9.2" height="9.4" rx="0.9" fill="#fbfaf7"/><rect x="45.4" y="89.6" width="9.2" height="2.4" rx="0.9" fill="${tc[0]}"/>`
      + (small ? '' : `<rect x="46.6" y="93" width="2.8" height="3.4" rx="0.4" fill="#c8ccd2"/>` + _pfS('M50.6 93.6 L53.4 93.6 M50.6 95.2 L53 95.2 M46.6 97.6 L53.4 97.6', '#a8acb4', 0.45));
    default: return '';
  }
}
function _pfPin(kind, small, onOuter) {
  if (!kind || kind === 'none') return '';
  const art = _pfPinArt(kind, small);
  return art ? `<g transform="translate(61.8 88.6) scale(1.3) translate(-61.8 -88.6)">${art}</g>` : '';
}
function _pfPinArt(kind, small) {
  const x = 61.8, y = 88.6;
  const rim = (d, c) => `<path d="${d}" fill="${c}" stroke="#d9b04a" stroke-width="0.45"/>`;
  switch (kind) {
    case 'star': return rim(_pfStar(x, y, 2.9, 1.25, 5), '#f6c945');
    case 'heart': return rim(_pfHeartD(x, y, 2.1), '#e8475e') + (small ? '' : _pfC(x - 0.8, y - 0.8, 0.45, '#ffffff', 0.6));
    case 'rainbow': return [['#e5534b', 2.7], ['#f4d35e', 2], ['#4caf6a', 1.3], ['#3b82f6', 0.65]].map(([c, r]) => _pfS(`M${_pfN(x - r)} ${_pfN(y + 1)} A${r} ${r} 0 0 1 ${_pfN(x + r)} ${_pfN(y + 1)}`, c, 0.7)).join('');
    case 'flower': { let s = ''; for (let q = 0; q < 6; q++) { const an = q * Math.PI / 3; s += _pfE(x + 1.5 * Math.cos(an), y + 1.5 * Math.sin(an), 1.2, 0.75, '#ffffff', 1, q * 60); } return s + _pfC(x, y, 0.95, '#f2b33d'); }
    case 'leaf': return rim(`M${x - 2.4} ${y + 1.6} Q${x - 2} ${y - 2.4} ${x + 2.4} ${y - 1.8} Q${x + 1.8} ${y + 2.2} ${x - 2.4} ${y + 1.6} Z`, '#4caf6a') + _pfS(`M${x - 2.2} ${y + 1.4} L${x + 1.6} ${y - 1.2}`, '#2e7a46', 0.4);
    case 'planet': return _pfC(x, y, 1.9, '#f08a3c') + `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="0.9" fill="none" stroke="#f6d35e" stroke-width="0.6" transform="rotate(-20 ${x} ${y})"/>` + (small ? '' : _pfC(x - 0.6, y - 0.7, 0.4, '#ffffff', 0.5));
    case 'coffee': return rim(`M${x - 1.9} ${y - 1.2} L${x + 1.6} ${y - 1.2} L${x + 1.2} ${y + 2} L${x - 1.5} ${y + 2} Z`, '#ffffff') + _pfS(`M${x + 1.6} ${y - 0.4} Q${x + 2.8} ${y + 0.2} ${x + 1.4} ${y + 1}`, '#d9b04a', 0.45)
      + _pfE(x - 0.15, y - 1.1, 1.6, 0.35, '#6a4a2a') + (small ? '' : _pfS(`M${x - 0.6} ${y - 2.2} Q${x - 1.2} ${y - 3} ${x - 0.4} ${y - 3.8} M${x + 0.6} ${y - 2.2} Q${x} ${y - 3} ${x + 0.8} ${y - 3.8}`, '#ffffff', 0.4, 0.7));
    case 'smiley': return rim(`M${x - 2.2} ${y} A2.2 2.2 0 1 0 ${x + 2.2} ${y} A2.2 2.2 0 1 0 ${x - 2.2} ${y} Z`, '#f6d35e') + _pfC(x - 0.75, y - 0.5, 0.3, '#2a2124') + _pfC(x + 0.75, y - 0.5, 0.3, '#2a2124') + _pfS(`M${x - 1.1} ${y + 0.6} Q${x} ${y + 1.6} ${x + 1.1} ${y + 0.6}`, '#2a2124', 0.4);
    case 'bolt': return rim(`M${x + 0.6} ${y - 2.8} L${x - 1.8} ${y + 0.4} L${x - 0.2} ${y + 0.4} L${x - 0.8} ${y + 2.8} L${x + 1.8} ${y - 0.6} L${x + 0.2} ${y - 0.6} Z`, '#f6c945');
    case 'bee': return _pfE(x - 0.6, y - 1.8, 1.2, 0.8, '#ffffff', 0.9, -30) + _pfE(x + 0.8, y - 1.8, 1.2, 0.8, '#ffffff', 0.9, 30) + _pfE(x, y, 2.3, 1.6, '#f6c945')
      + _pfS(`M${x - 0.6} ${y - 1.5} L${x - 0.6} ${y + 1.5} M${x + 0.7} ${y - 1.5} L${x + 0.7} ${y + 1.5}`, '#2a2124', 0.6) + _pfC(x + 2.1, y - 0.2, 0.5, '#2a2124');
    case 'sun': { let s = ''; for (let i = 0; i < 7; i++) { const an = Math.PI + i * Math.PI / 6; s += _pfS(`M${_pfN(x + 2 * Math.cos(an))} ${_pfN(y + 1 + 2 * Math.sin(an))} L${_pfN(x + 3 * Math.cos(an))} ${_pfN(y + 1 + 3 * Math.sin(an))}`, '#f08a3c', 0.5); }
      return s + _pfP(`M${x - 1.7} ${y + 1} A1.7 1.7 0 0 1 ${x + 1.7} ${y + 1} Z`, '#f6c945') + _pfS(`M${x - 2.8} ${y + 1.1} L${x + 2.8} ${y + 1.1}`, '#e07a2a', 0.5); }
    case 'owl': return rim(`M${x - 2.2} ${y + 2.4} L${x - 2.2} ${y - 1.4} L${x - 1.4} ${y - 2.6} L${x - 0.6} ${y - 1.8} L${x + 0.6} ${y - 1.8} L${x + 1.4} ${y - 2.6} L${x + 2.2} ${y - 1.4} L${x + 2.2} ${y + 2.4} Z`, '#8a5a3a')
      + _pfC(x - 0.95, y - 0.5, 0.85, '#fbe9b5') + _pfC(x + 0.95, y - 0.5, 0.85, '#fbe9b5') + _pfC(x - 0.95, y - 0.5, 0.35, '#2a2124') + _pfC(x + 0.95, y - 0.5, 0.35, '#2a2124') + _pfP(`M${x - 0.4} ${y + 0.3} L${x + 0.4} ${y + 0.3} L${x} ${y + 1} Z`, '#f08a3c');
    case 'flame': return rim(`M${x} ${y + 2.6} C${x - 2.6} ${y + 2.6} ${x - 2.6} ${y - 0.4} ${x - 1} ${y - 2.6} C${x - 0.6} ${y - 1} ${x + 0.4} ${y - 0.6} ${x + 0.6} ${y - 1.8} C${x + 2.6} ${y - 0.2} ${x + 2.4} ${y + 2.6} ${x} ${y + 2.6} Z`, '#f08a3c')
      + _pfP(`M${x} ${y + 2.2} C${x - 1.2} ${y + 2.2} ${x - 1.2} ${y + 0.8} ${x - 0.4} ${y - 0.2} C${x} ${y + 0.6} ${x + 1.2} ${y + 0.8} ${x} ${y + 2.2} Z`, '#f6d35e');
    default: return '';
  }
}
function _pfBagStraps(kind, bc, mt, small) {
  if (!kind || kind === 'none') return '';
  const det = (s) => (small ? '' : s);
  switch (kind) {
    case 'crossbody': case 'satchel': case 'messenger': {
      const w = kind === 'messenger' ? 2.4 : kind === 'satchel' ? 1.3 : 1.7;
      let s = _pfP(`M${_pfN(36.4 - w)} 75.6 L${_pfN(36.4 + w)} 75.4 L${_pfN(74.6 + w)} 100 L${_pfN(74.6 - w)} 100 Z`, bc[1]) + det(_pfS(`M${_pfN(36.4 - w + 0.5)} 75.8 L${_pfN(74.6 - w + 0.5)} 100`, bc[2], 0.4, 0.6));
      if (kind === 'messenger') s += `<rect x="55" y="86.4" width="3.6" height="3" rx="0.5" fill="none" stroke="${mt[0]}" stroke-width="0.7" transform="rotate(33 56.8 87.9)"/>`;
      return s;
    }
    case 'shoulder': return _pfP('M29.8 77 L33.8 76.2 L30.6 100 L26.6 100 Z', bc[1]) + det(_pfS('M31.4 77 L28.4 100', bc[2], 0.4, 0.6));
    case 'tote': return _pfP('M28.6 77.6 L31.2 77 L27.2 100 L24.6 100 Z', bc[0]) + _pfP('M33.2 76.4 L35.8 76 L32.8 100 L30.2 100 Z', bc[0]) + det(_pfS('M29.8 77.4 L26 100 M34.4 76.4 L31.6 100', bc[3], 0.35, 0.5));
    case 'backpack': return _pfBoth('M35.4 75.6 L39.8 75.4 L37.8 100 L33.4 100 Z', bc[1]) + _pfBothS('M36.6 75.8 L34.8 100', bc[2], 0.4, 0.55)
      + _pfS('M36.6 91 L63.4 91', bc[3], 1.2) + `<rect x="48.4" y="89.8" width="3.2" height="2.4" rx="0.6" fill="${mt[0]}"/>` + det(`<rect x="34.4" y="84" width="3.2" height="1.6" rx="0.4" fill="${mt[0]}"/><rect x="62.4" y="84" width="3.2" height="1.6" rx="0.4" fill="${mt[0]}"/>`);
    case 'bumbag': return _pfP('M62.4 75.4 L65.4 76 L33 100 L29.6 100 Z', bc[1]) + `<g transform="rotate(-24 41 92)"><rect x="31" y="87.4" width="20" height="9.6" rx="4.6" fill="${bc[0]}"/>`
      + `<path d="M33.4 90.6 L48.6 90.6" stroke="${mt[0]}" stroke-width="0.7" fill="none"/><rect x="45.6" y="89.6" width="1.6" height="2.2" rx="0.4" fill="${mt[0]}"/>`
      + (small ? '' : `<path d="M33 95 Q41 97.6 49 95" stroke="${bc[3]}" stroke-width="0.5" fill="none" opacity="0.6"/>`) + '</g>';
    default: return '';
  }
}

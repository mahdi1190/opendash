/* ============================================================
   PROFILE, the avatar kit: ACCESSORIES (2.18, agent 'wardrobe'). PURE, like 97-profile-0kit.js (read
   its header): functions and literal tables only; the kit's drawing helpers are used inside functions.
     _PF_GLASSES_MORE, _pfGlassesMore(kind, gc)   narrow, wire rims, browline, oversized, aviators, half-moons,
                                                  aviator shades, round sunnies, mirrored, sport, 3D, star shades
     _PF_HATS_MORE, _pfHatMore(kind, t, small)    slouchy and bear beanies, backwards cap, bucket, beret, fedora,
                                                  cowboy, visor, headband, bandana, trapper, turban, halo, chef's
                                                  hat, top hat, little horns, antlers, bunny ears
     _pfHeadphonesMore(kind, pc)                  earbuds, a headset with a mic, ear muffs
     _pfScarfMore(kind, sc, s2, small)            chunky knit, tartan, silk, neckerchief, rainbow
   ============================================================ */
const _PF_GLASSES_MORE = new Set(['rect', 'wire', 'browline', 'oversized', 'aviator', 'half', 'aviatorsun', 'roundsun', 'mirror', 'sport', '3d', 'starsun']);
const _PF_HATS_MORE = new Set(['slouch', 'bearbeanie', 'backcap', 'bucket', 'beret', 'fedora', 'cowboy', 'visor', 'headband', 'bandana', 'trapper', 'turban',
  'halo', 'chef', 'tophat', 'horns', 'antlers', 'bunny', 'anglerhat', 'pith', 'flowercrown', 'strawhat', 'leafwreath', 'wildcirclet', 'beekeeper']);
const _PF_AVIATOR_D = 'M35.6 42.4 Q42 41 48 42.6 Q48.6 47.8 45 50.6 Q41 52.4 37.6 50 Q35 47.4 35.6 42.4 Z';

/* ---------- glasses ---------- */
function _pfGlassesMore(kind, gc) {
  const bridge = (w) => _pfS('M47.4 45.2 Q50 43.6 52.6 45.2', gc, w || 1.3), arms = (w) => _pfBothS('M36.4 45 L31.2 44', gc, w || 1.3);
  const lensPath = (d, fill, op, stroke, w) => `<path d="${d}" fill="${fill}" fill-opacity="${_pfN(op)}" stroke="${stroke}" stroke-width="${_pfN(w)}" stroke-linejoin="round"/>`;
  const both = (d, fill, op, stroke, w) => lensPath(d, fill, op, stroke, w) + lensPath(_pfMirror(d), fill, op, stroke, w);
  switch (kind) {
    case 'rect': return [36, 52.6].map(x => `<rect x="${x}" y="42.8" width="11.4" height="6.4" rx="1.4" fill="#ffffff" fill-opacity="0.16" stroke="${gc}" stroke-width="1.3"/>`).join('') + bridge() + arms();
    case 'wire': return [42, 58].map(x => `<circle cx="${x}" cy="46" r="4.6" fill="#ffffff" fill-opacity="0.12" stroke="${gc}" stroke-width="0.7"/>`).join('') + _pfS('M46.6 45.4 Q50 43.8 53.4 45.4', gc, 0.7) + _pfBothS('M37.4 45.2 L31.2 44', gc, 0.7);
    case 'browline': return both('M36.2 43.2 Q36.6 50.8 42 51 Q47.4 50.8 47.8 43.2 Z', '#ffffff', 0.12, '#c3c8d0', 0.7) + _pfBothS('M35.6 43.2 Q42 41.2 48.2 43.2', gc, 2.4) + bridge(1) + arms(1.2);
    case 'oversized': return [34.6, 51].map(x => `<rect x="${x}" y="40.2" width="14.4" height="12.4" rx="4.4" fill="#ffffff" fill-opacity="0.15" stroke="${gc}" stroke-width="1.6"/>`).join('') + bridge(1.4) + _pfBothS('M34.8 44.6 L31.2 44', gc, 1.4);
    case 'aviator': return both(_PF_AVIATOR_D, '#ffffff', 0.14, gc, 0.8) + _pfS('M47.8 43 Q50 42 52.2 43', gc, 0.8) + _pfS('M47.8 41.8 L52.2 41.8', gc, 0.7) + _pfBothS('M35.8 43 L31.2 44', gc, 0.8);
    case 'half': return both('M36.6 46.2 Q37.2 51.2 42 51.4 Q46.8 51.2 47.4 46.2 Z', '#ffffff', 0.14, gc, 1.1) + _pfS('M47.4 46.6 Q50 45.4 52.6 46.6', gc, 0.9) + _pfBothS('M36.6 46.4 L31.2 44.6', gc, 0.9);
    case 'aviatorsun': return both(_PF_AVIATOR_D, '#33333f', 0.9, gc, 0.8) + _pfBothS('M37.6 43.8 L41.6 43.2', '#ffffff', 0.9, 0.35) + _pfS('M47.8 43 Q50 42 52.2 43', gc, 0.8) + _pfS('M47.8 41.8 L52.2 41.8', gc, 0.7) + _pfBothS('M35.8 43 L31.2 44', gc, 0.8);
    case 'roundsun': return [42, 58].map(x => `<circle cx="${x}" cy="46" r="5.2" fill="#2e2622" fill-opacity="0.9" stroke="${gc}" stroke-width="1.2"/>`).join('') + _pfBothS('M39.6 43.4 Q41.4 42.4 43.4 42.8', '#ffffff', 0.9, 0.35) + bridge(1.1) + arms(1.1);
    case 'mirror': { const d = 'M35.2 42 Q41 40.6 47.6 42.2 Q48 49.4 42.4 51.4 Q36 51.6 35.2 46 Z';
      return both(d, '#6a8fd8', 0.95, gc, 1) + both('M35.4 42.6 Q41 41.2 47.4 42.8 Q47.6 45 47.2 46.2 Q41 44.6 35.4 46.4 Z', '#c8a0f0', 0.7, 'none', 0) + _pfBothS('M37.6 49 L41.6 44.8', '#ffffff', 0.9, 0.45) + bridge(1.1) + arms(1.1); }
    case 'sport': return `<path d="M33.4 42 Q50 39.6 66.6 42 Q66.8 47.8 62.6 50.6 Q56 51.6 51.4 48.4 Q50 47.6 48.6 48.4 Q44 51.6 37.4 50.6 Q33.2 47.8 33.4 42 Z" fill="#2a2a36" fill-opacity="0.92" stroke="${gc}" stroke-width="1"/>`
      + `<path d="M34 44.8 Q50 42.4 66 44.8 L66.2 46.6 Q50 44.2 33.8 46.6 Z" fill="#f08a3c" fill-opacity="0.45"/>` + _pfS('M33.4 42 Q50 39.6 66.6 42', gc, 1.8) + _pfBothS('M33.6 43 L30.6 44.4', gc, 1.2);
    case '3d': return `<rect x="35.4" y="42" width="12.8" height="8.6" rx="1.2" fill="#e5534b" fill-opacity="0.72" stroke="#f4f2ee" stroke-width="1.5"/><rect x="51.8" y="42" width="12.8" height="8.6" rx="1.2" fill="#3fb4c8" fill-opacity="0.72" stroke="#f4f2ee" stroke-width="1.5"/>`
      + _pfS('M48.2 45.2 L51.8 45.2', '#f4f2ee', 1.5) + _pfBothS('M35.4 45 L31.2 44', '#f4f2ee', 1.4);
    case 'starsun': { const d = _pfStar(42, 46.2, 6.6, 3.1, 5); return lensPath(d, '#f06a9a', 0.78, '#d4a72c', 1) + lensPath(_pfStar(58, 46.2, 6.6, 3.1, 5), '#f06a9a', 0.78, '#d4a72c', 1)
      + _pfS('M48.2 45 Q50 43.6 51.8 45', '#d4a72c', 1) + _pfBothS('M36 44.6 L31.2 44', '#d4a72c', 1) + _pfC(40.4, 44.4, 0.7, '#ffffff', 0.7) + _pfC(56.4, 44.4, 0.7, '#ffffff', 0.7); }
    default: return '';
  }
}

/* ---------- hats ---------- */
function _pfHatMore(kind, t, small) {
  const det = (s) => (small ? '' : s);
  const rib = (y0, y1) => { let s = ''; if (!small) for (let x = 32; x <= 68; x += 4) s += _pfS(`M${x} ${y0} L${x} ${y1}`, t[3], 0.7, 0.35); return s; };
  switch (kind) {
    case 'slouch': return _pfP('M28.8 41 C27.6 22 38 12.4 51 12.2 C62 12 73.6 17.4 77.8 24.6 Q80 30.6 73.4 33.8 Q72.6 38 71.2 41 Z', t[0])
      + _pfP('M58 13.6 C68 15.2 76 20 77.8 24.6 Q80 30.6 73.4 33.8 Q74 26 58 13.6 Z', t[1], 0.55) + det(_pfS('M48 16 Q60 15.4 70 22.6', t[2], 1, 0.4))
      + _pfP('M27.6 35.6 Q50 33 72.4 35.6 L72.6 42.6 Q50 45.4 27.4 42.6 Z', t[1]) + rib(35.2, 43.4);
    case 'bearbeanie': return _pfC(34.6, 16.4, 5.4, t[0]) + _pfC(65.4, 16.4, 5.4, t[0]) + _pfC(34.6, 16.4, 2.8, t[2]) + _pfC(65.4, 16.4, 2.8, t[2])
      + _pfP('M28.8 41 C27.6 22 38 12.6 50 12.6 C62 12.6 72.4 22 71.2 41 Z', t[0]) + _pfP('M60 14.6 C68 18 72 28 71.2 41 L66 41 C66.6 30 64.6 21 60 14.6 Z', t[1], 0.5)
      + _pfP('M27.6 35.6 Q50 33 72.4 35.6 L72.6 42.6 Q50 45.4 27.4 42.6 Z', t[1]) + rib(35.2, 43.4);
    case 'backcap': return _pfP('M30.2 38.6 C29.4 22 39 14.8 50 14.8 C61 14.8 70.6 22 69.8 38.6 Q50 35.4 30.2 38.6 Z', t[0]) + det(_pfS('M50 15 L50 30', t[1], 0.8))
      + _pfC(50, 15.4, 1.6, t[1]) + _pfP('M42.4 37.8 Q42.6 30.4 50 29.6 Q57.4 30.4 57.6 37.8 Q50 36.6 42.4 37.8 Z', t[3]) + _pfP('M42.8 35.4 L57.2 35.4 L57.4 37.2 L42.6 37.2 Z', t[1])
      + det(_pfC(45, 36.3, 0.45, t[2]) + _pfC(47.4, 36.3, 0.45, t[2]) + _pfC(52.6, 36.3, 0.45, t[2]) + _pfC(55, 36.3, 0.45, t[2]));
    case 'anglerhat': return _pfHatMore('bucket', t, small) + _pfP('M33.6 33.4 Q50 30.6 66.4 33.4 L66.4 36.2 Q50 33.6 33.6 36.2 Z', t[1]) + _pfP('M56 32.6 Q60 29.4 64 32.6 Q60 35.8 56 32.6 Z', '#f2b13a') + _pfP('M63.4 32.6 L65.8 30.8 L65.8 34.4 Z', '#e08a1a')
      + _pfC(57.6, 32, 0.55, '#14120e') + det(_pfS('M40 31.4 L43.4 24.6 M43.6 31 L46.6 24.4', '#e8503a', 1.3) + _pfC(43.4, 24.2, 0.9, '#fbfbf2') + _pfC(46.6, 24, 0.9, '#fbfbf2'));
    case 'pith': return _pfE(50, 38, 31, 5.4, t[0]) + _pfP('M30.4 37 C30 22 39 13.4 50 13.4 C61 13.4 70 22 69.6 37 Q50 32.6 30.4 37 Z', t[0]) + _pfP('M58 14.4 C66 17 70 26 69.6 37 L65 36 C65.4 27 63 19 58 14.4 Z', t[1], 0.5)
      + _pfP('M30.4 33.4 Q50 28.6 69.6 33.4 L69.8 37 Q50 32.4 30.2 37 Z', t[3]) + det(_pfC(50, 17.4, 1.3, t[1]) + _pfS('M37 21 Q50 15 63 21', t[2], 0.8, 0.45)) + _pfS('M20 39.6 Q50 43.6 80 39.6', t[1], 0.8, 0.5);
    // 2.23: made at the crafting bench (fixed colours: they are what they were made from)
    case 'flowercrown': case 'wildcirclet': case 'leafwreath': {
      let s = _pfS('M29 35.600 Q50 24.400 71 35.600', kind === 'leafwreath' ? '#4f8a3a' : '#5a8a48', 1.800);
      const cols = kind === 'flowercrown' ? ['#ffffff', '#ffffff'] : kind === 'wildcirclet' ? ['#f6d35e', '#f6a5c0', '#b39ce6'] : ['#6a9a4a', '#7fb25a', '#4f8a3a'];
      for (let i = 0; i < 7; i++) { const u = i / 6, x = 29.500 + 41 * u, y = 35.600 - Math.sin(u * Math.PI) * 8.400; if (kind === 'leafwreath') s += _pfE(x, y, 4, 2.200, cols[i % 3], 1, -30 + 60 * u); else { s += _pfC(x, y, 4.100, '#c8bc98', 0.55); for (let q = 0; q < 5; q++) { const a = q * 1.2566 + i * 0.5; s += _pfC(x + Math.cos(a) * 2.400, y + Math.sin(a) * 2.400, 1.800, cols[i % cols.length]); } s += _pfC(x, y, 1.300, '#f2b33d'); } }
      return s; }
    case 'strawhat': return _pfE(50, 34.400, 30, 6, '#e0c068') + _pfP('M31 34 C30 20 39 13.600 50 13.600 C61 13.600 70 20 69 34 Q50 39.600 31 34 Z', '#e8cc7a') + _pfP('M31 30 Q50 35.600 69 30 L69 34 Q50 39.600 31 34 Z', '#c8483a') + det(_pfS('M24 34 Q50 40 76 34 M36 22 Q50 16.400 64 22 M34 27 Q50 22 66 27', '#b89a50', 0.600, 0.7));
    case 'beekeeper': return _pfE(50, 33.600, 28, 5.400, '#f0e8d0') + _pfP('M33 33 C33 20 41 15 50 15 C59 15 67 20 67 33 Q50 37.600 33 33 Z', '#f6efdc') + det(_pfS('M25 34 L27 58 M75 34 L73 58 M27 58 Q50 64 73 58 M34 36 L35 61 M43 37 L43.400 62.400 M57 37 L56.600 62.400 M66 36 L65 61 M26 43 Q50 49 74 43 M26.500 50 Q50 56 73.500 50', '#6a6458', 0.450, 0.55));
    case 'bucket': return _pfP('M33.2 34 C33.2 19.4 41 14.4 50 14.4 C59 14.4 66.8 19.4 66.8 34 Z', t[0]) + _pfP('M58 15.6 C64 18 66.8 24 66.8 34 L62.6 34 C62.8 26 61.4 20 58 15.6 Z', t[1], 0.45)
      + _pfP('M24.4 41.6 Q26.6 33.4 33.2 32.8 L66.8 32.8 Q73.4 33.4 75.6 41.6 Q50 37.6 24.4 41.6 Z', t[0]) + _pfP('M24.4 41.6 Q50 37.6 75.6 41.6 L75.2 40 Q50 36 24.8 40 Z', t[1], 0.6)
      + det(_pfS('M27.6 39 Q50 35.2 72.4 39', t[3], 0.5, 0.5) + _pfS('M33.6 30.6 Q50 28.6 66.4 30.6', t[3], 0.5, 0.5) + _pfS('M34 26.6 Q50 24.6 66 26.6', t[3], 0.5, 0.4));
    case 'beret': return _pfP('M30.6 32.6 Q50 28.4 66.4 31.2 L66.8 33.8 Q50 30.6 30.2 35.2 Z', t[1]) + _pfE(45.6, 24.4, 21.4, 7.8, t[0], 1, -9)
      + _pfE(43.6, 22.4, 14, 3.4, t[2], 0.4, -9) + _pfS('M46 16.8 L46.4 14.2', t[3], 1.6);
    case 'fedora': return _pfP('M34.6 33.6 C34 22 38.6 14.2 44 14.4 Q50 17.8 56 14.4 C61.4 14.2 66 22 65.4 33.6 Z', t[0]) + _pfP('M56 14.4 C61.4 14.2 66 22 65.4 33.6 L61.6 33.6 C62 24 60 18 56 14.4 Z', t[1], 0.45)
      + _pfP('M34.6 29.6 Q50 31.4 65.4 29.6 L65.4 33.6 Q50 35.4 34.6 33.6 Z', t[3]) + _pfP('M20.6 36.4 Q30 31.4 50 33 Q70 31.4 79.4 36.4 Q72 39.8 50 37.4 Q28 39.8 20.6 36.4 Z', t[0])
      + _pfP('M20.6 36.4 Q28 39.8 50 37.4 Q72 39.8 79.4 36.4 L79 37.6 Q72 41 50 38.6 Q28 41 21 37.6 Z', t[1]) + det(_pfS('M40 18.6 Q44 20 48 18.4', t[2], 0.8, 0.5));
    case 'cowboy': return _pfP('M35.4 32 C34.8 20 39 13.4 43.6 14.2 Q50 18.6 56.4 14.2 C61 13.4 65.2 20 64.6 32 Z', t[0]) + _pfP('M56.4 14.2 C61 13.4 65.2 20 64.6 32 L60.8 32 C61.2 24 59.6 18 56.4 14.2 Z', t[1], 0.45)
      + _pfP('M35.2 27.6 Q50 29.6 64.8 27.6 L64.8 31 Q50 33 35.2 31 Z', t[3]) + _pfP('M13.6 28 Q18.6 36 30 35 Q50 38 70 35 Q81.4 36 86.4 28 Q84.6 39.8 70 41.6 Q50 43.8 30 41.6 Q15.4 39.8 13.6 28 Z', t[0])
      + _pfP('M15.6 33 Q20 39.6 30 40 Q50 42.4 70 40 Q80 39.6 84.4 33 Q82 40.8 70 41.6 Q50 43.8 30 41.6 Q18 40.8 15.6 33 Z', t[1], 0.6) + det(_pfC(64, 29.4, 0.8, '#d9b04a'));
    case 'visor': return _pfP('M29.6 33.4 Q50 28.2 70.4 33.4 L70.6 37.6 Q50 33 29.4 37.6 Z', t[0]) + _pfP('M35.4 36.2 Q50 33 64.6 36.2 Q60.6 43 50 43.2 Q39.4 43 35.4 36.2 Z', t[1], 0.95)
      + det(_pfS('M38 38.4 Q50 36.4 62 38.4', t[2], 0.6, 0.6));
    case 'headband': return _pfP('M29.4 33 Q50 25.4 70.6 33 L70.8 37.8 Q50 30.6 29.2 37.8 Z', t[0]) + det(_pfS('M30 34.6 Q50 27.4 70 34.6', t[2], 0.7, 0.5))
      + _pfE(36.4, 25.6, 3.6, 2.2, t[0], 1, -40) + _pfE(41.6, 24.4, 3.4, 2, t[0], 1, 30) + _pfC(39.2, 27.6, 1.8, t[1]);
    case 'bandana': { let s = _pfP('M29.6 40 C28.4 24 38 15.6 50 15.6 C62 15.6 71.6 24 70.4 40 Q50 34.6 29.6 40 Z', t[0]) + _pfP('M29.6 40 Q50 34.6 70.4 40 L70.2 37.4 Q50 32.2 29.8 37.4 Z', t[1])
        + _pfP('M70 38 L76.6 44.6 L73.4 46 Z', t[0]) + _pfP('M70 38.4 L74 47.4 L71 47 Z', t[1]);
      if (!small) for (const [x, y] of [[38, 26], [46, 21], [55, 22], [62, 27], [42, 32], [52, 30], [58, 33]]) s += _pfC(x, y, 0.9, '#ffffff', 0.85) + _pfC(x + 1.6, y + 1, 0.45, '#ffffff', 0.7);
      return s; }
    case 'trapper': return _pfBoth('M27.2 37.4 L35 38 Q35.8 50.4 32.6 56.6 Q28.4 57.6 26.4 52.4 Q25.4 44 27.2 37.4 Z', t[0]) + _pfBothS('M26.6 50.6 Q28.4 57.2 32.6 56.4', '#e8dcc4', 2)
      + _pfP('M28.8 38 C27.6 20 38 12.6 50 12.6 C62 12.6 72.4 20 71.2 38 Z', t[0]) + _pfP('M60 14.6 C68 18 72 28 71.2 38 L66 38 C66.6 30 64.6 21 60 14.6 Z', t[1], 0.5)
      + _pfP('M27.4 33 Q50 29.2 72.6 33 L72.8 40.2 Q50 36.6 27.2 40.2 Z', '#e8dcc4') + det(_pfS('M29 35.4 Q50 31.8 71 35.4 M28.8 38 Q50 34.4 71.2 38', '#cdbf9f', 0.6, 0.6));
    case 'turban': return _pfP('M29.4 40.6 C27.4 22 37.6 11.6 50 11.6 C62.4 11.6 72.6 22 70.6 40.6 Q60 34 50 34.8 Q40 34 29.4 40.6 Z', t[0])
      + _pfP('M50 34.8 Q40 34 29.4 40.6 C29 36 30 31 32.4 27 Q40 27 50 34.8 Z', t[1], 0.5) + _pfS('M30.6 36.6 Q40.6 25.4 50 34.4', t[3], 0.9, 0.55) + _pfS('M69.4 36.6 Q59.4 25.4 50 34.4', t[3], 0.9, 0.55)
      + det(_pfS('M32.4 28.6 Q44 17 58 19.6', t[2], 1, 0.45) + _pfS('M36 22.4 Q48 13.6 62 16.6', t[2], 0.9, 0.35) + _pfS('M67 30 Q60 22.6 52 21.2', t[3], 0.8, 0.4));
    case 'halo': return `<ellipse cx="50" cy="11" rx="14.4" ry="3.6" fill="none" stroke="#fff3c4" stroke-width="3.6" opacity="0.5"/><ellipse cx="50" cy="11" rx="14.4" ry="3.6" fill="none" stroke="#f2c94c" stroke-width="1.8"/>`
      + det(_pfP(_pfSpark(67, 7, 2), '#f6d35e') + _pfP(_pfSpark(33.6, 6.4, 1.4), '#f6d35e', 0.9));
    case 'chef': return _pfC(40, 17.6, 7.6, '#f6f4ef') + _pfC(60, 17.6, 7.6, '#f6f4ef') + _pfC(50, 12.6, 9, '#ffffff') + _pfC(44.6, 22, 7, '#f6f4ef') + _pfC(55.4, 22, 7, '#f6f4ef')
      + det(_pfS('M41 13.6 Q44 10.6 47 11.4 M55 19 Q58 16.6 61.6 17.6', '#d8d4cc', 0.8, 0.8)) + _pfP('M33.6 35.6 L66.4 35.6 L65.8 25.6 Q50 28 34.2 25.6 Z', '#f6f4ef')
      + _pfS('M34.2 25.6 Q50 28 65.8 25.6', '#d8d4cc', 0.8) + det(_pfS('M40 27.6 L40 34.8 M50 28 L50 35.4 M60 27.6 L60 34.8', '#e2ded6', 0.6));
    case 'tophat': return _pfP('M36.4 31.6 L37.6 5.6 Q50 4 62.4 5.6 L63.6 31.6 Z', '#25252c') + _pfP('M37.2 25 L62.8 25 L63.4 31 L36.6 31 Z', t[0])
      + _pfP('M27.4 32.2 Q50 28.4 72.6 32.2 Q74.4 36 68 35.6 Q50 33.4 32 35.6 Q25.6 36 27.4 32.2 Z', '#1a1a20') + det(_pfS('M41 8 L40.4 23', '#ffffff', 1.4, 0.14) + _pfS('M37.6 5.6 Q50 4 62.4 5.6', '#4a4a54', 0.8, 0.8));
    case 'horns': return _pfS('M30.6 36 Q50 22.6 69.4 36', '#2a2226', 1.2) + _pfP('M34.8 28.6 Q33.6 19.6 38.4 14.6 Q38.4 21.6 41.6 27.2 Z', '#d63a3a') + _pfP('M65.2 28.6 Q66.4 19.6 61.6 14.6 Q61.6 21.6 58.4 27.2 Z', '#d63a3a')
      + det(_pfS('M36 24.6 Q36.4 19.6 38 16.4', '#f08080', 0.7, 0.7) + _pfS('M64 24.6 Q63.6 19.6 62 16.4', '#f08080', 0.7, 0.7));
    case 'antlers': return _pfS('M30.6 36 Q50 22.6 69.4 36', '#6a4a2e', 1.3) + _pfBothS('M38 28.4 Q35.4 17 29.2 10.6 M35.4 19.6 L39.6 14.4 M32.4 14 L30.6 7.6', '#8a5a3a', 1.7)
      + _pfC(40.4, 28.2, 1.4, '#d63a3a') + _pfE(43.2, 28.8, 1.6, 0.8, '#3f8a4a', 1, 20) + _pfE(37.8, 29.8, 1.6, 0.8, '#3f8a4a', 1, -30) + det(_pfC(39.9, 27.7, 0.4, '#ffffff', 0.7));
    case 'bunny': return _pfS('M30.6 36 Q50 22.6 69.4 36', '#f6f4ef', 1.3) + _pfP('M38 28 Q32.6 7 37.4 2 Q42.8 6.4 42 27.6 Z', '#f6f4ef') + _pfP('M38.8 25.6 Q35.6 10 37.6 5.6 Q40.6 9.6 40.6 25.6 Z', '#f6a5c0')
      + `<g transform="rotate(16 60 27)">` + _pfP('M58 28 Q52.6 7 57.4 2 Q62.8 6.4 62 27.6 Z', '#f6f4ef') + _pfP('M58.8 25.6 Q55.6 10 57.6 5.6 Q60.6 9.6 60.6 25.6 Z', '#f6a5c0') + '</g>';
    default: return '';
  }
}

/* ---------- headphones ---------- */
function _pfHeadphonesMore(kind, pc) {
  switch (kind) {
    case 'buds': return _pfC(30.6, 47.4, 1.7, pc[0]) + _pfC(69.4, 47.4, 1.7, pc[0]) + _pfS('M30.4 48.6 L30.2 53', pc[0], 1.1) + _pfS('M69.6 48.6 L69.8 53', pc[0], 1.1)
      + _pfC(30.1, 46.8, 0.5, pc[2], 0.8) + _pfC(68.9, 46.8, 0.5, pc[2], 0.8);
    case 'gaming': return _pfS('M29.6 44 C27.4 14 72.6 14 70.4 44', pc[0], 4) + _pfS('M31 38 C30 18 70 18 69 38', pc[2], 0.9, 0.5)
      + `<rect x="24.4" y="38.4" width="9.2" height="15.4" rx="3.8" fill="${pc[0]}"/><rect x="66.4" y="38.4" width="9.2" height="15.4" rx="3.8" fill="${pc[0]}"/>`
      + _pfS('M26.4 41.6 L26.4 50.6', '#3fb4c8', 1.2, 0.85) + _pfS('M73.6 41.6 L73.6 50.6', '#3fb4c8', 1.2, 0.85)
      + _pfS('M70 51.4 Q69 58.6 58.6 59.4', pc[3], 1.1) + _pfE(57.6, 59.4, 1.6, 1.2, pc[0]);
    case 'muffs': {
      let s = _pfS('M30.6 44 C28.4 14 71.6 14 69.4 44', pc[3], 1.3);
      for (const cx of [29.4, 70.6]) { for (let k = 0; k < 16; k++) { const an = k * Math.PI / 8; s += _pfC(cx + 4.6 * Math.cos(an), 47 + 4.6 * Math.sin(an), 1.7, pc[k % 2 ? 0 : 1]); } s += _pfC(cx, 47, 5, pc[0]) + _pfC(cx - 1.4, 45.4, 2.2, pc[2], 0.55) + _pfC(cx + 1.6, 48.6, 1.2, pc[2], 0.35); }
      return s;
    }
    default: return '';
  }
}

/* ---------- scarves ---------- */
function _pfScarfMore(kind, sc, s2, small) {
  if (kind === 'gardenscarf') return _pfP('M35.400 73.600 Q50 81.400 64.600 73.600 L65.600 80.600 Q50 89.400 34.400 80.600 Z', '#4f8a5a') + _pfS('M35 80 Q50 88.400 65 80', '#3a6a44', 1.200, 0.7) + _pfP('M55.400 82.400 L58.600 99 L66 97.600 L62.200 80.600 Z', '#3f7a4a') + _pfE(60.800, 90, 2.600, 1.500, '#a6d870', 1, -30);
  if (kind === 'daisychain') { let s = _pfS('M35.400 75 Q50 86 64.600 75', '#5a8a48', 0.900); for (let i = 0; i < 9; i++) { const u = i / 8, x = 35.400 + 29.200 * u, y = 75 + Math.sin(u * Math.PI) * 7; s += _pfC(x, y, 2.700, '#c8bc98', 0.55); for (let q = 0; q < 5; q++) { const a = q * 1.2566; s += _pfC(x + Math.cos(a) * 1.500, y + Math.sin(a) * 1.500, 1.100, '#ffffff'); } s += _pfC(x, y, 0.800, '#f2b33d'); } return s; }
  const wrap = 'M35.4 73.6 Q50 81.4 64.6 73.6 L65.6 80.6 Q50 89.4 34.4 80.6 Z', end = 'M55.4 82.4 L58.6 99 L66 97.6 L62.2 80.6 Z';
  switch (kind) {
    case 'chunky': {
      let s = _pfP('M33.4 72 Q50 81.6 66.6 72 L68.6 82.8 Q50 93.4 31.4 82.8 Z', sc[0]) + _pfP('M54.6 84 L57.6 100 L68 98.6 L64 82 Z', sc[1]) + _pfS('M32.4 80.6 Q50 90.4 67.6 80.6', sc[1], 1.2, 0.6);
      if (!small) { for (let i = 0; i < 9; i++) { const x = 35 + i * 3.8; s += _pfS(`M${_pfN(x)} ${_pfN(74.6 + Math.sin(i / 8 * Math.PI) * 5)} L${_pfN(x - 0.4)} ${_pfN(81.6 + Math.sin(i / 8 * Math.PI) * 6.4)}`, sc[3], 0.7, 0.35); }
        for (let y = 86; y < 100; y += 3) s += _pfS(`M${_pfN(56 + (y - 86) * 0.2)} ${y} L${_pfN(65.4 + (y - 86) * 0.25)} ${_pfN(y - 1.2)}`, sc[3], 0.6, 0.35); }
      return s;
    }
    case 'tartan': return _pfP(wrap, sc[0]) + _pfP(end, sc[1]) + _pfS('M35 76.6 Q50 84.4 65 76.6', s2[0], 1.6) + _pfS('M34.8 79.2 Q50 87.4 65.2 79.2', sc[3], 0.5, 0.8)
      + (small ? '' : _pfS('M40.6 75.6 L40.2 83.4 M46.4 77.4 L46.2 85.6 M53.6 77.4 L53.8 85.6 M59.4 75.6 L59.8 83.4', s2[0], 0.7, 0.8))
      + _pfS('M56.2 87 L63.4 85.8', s2[0], 1.6) + _pfS('M57.4 93.4 L64.8 92.2', s2[0], 1.6) + (small ? '' : _pfS('M58.4 82.4 L61.4 98.6', s2[2], 0.5, 0.8));
    case 'silk': return _pfP('M40.6 72 Q50 77 59.4 72 L60 75.6 Q50 80.8 40 75.6 Z', sc[0]) + _pfP('M60.4 76.4 L67 84.2 L64.2 85.8 Z', sc[1]) + _pfP('M60.4 76.4 L62.6 87 L59.8 86.8 Z', sc[0])
      + _pfC(60.4, 76.2, 1.6, sc[1]) + (small ? '' : [[43, 74.6], [47, 76.2], [51, 76.6], [55, 75.6], [63.6, 82]].map(([x, y]) => _pfC(x, y, 0.5, s2[0])).join(''));
    case 'bandana': return _pfP('M40.6 74.4 Q50 78.4 59.4 74.4 L50 89 Z', sc[0]) + _pfP('M40.6 74.4 Q50 78.4 59.4 74.4 L59 72.6 Q50 76.4 41 72.6 Z', sc[1])
      + (small ? '' : [[45, 78.4], [50, 80], [55, 78.4], [48, 83.4], [52, 83.4], [50, 86.6]].map(([x, y]) => _pfC(x, y, 0.55, '#ffffff', 0.85)).join(''));
    case 'rainbow': {
      const cols = ['#e5534b', '#f08a3c', '#f4d35e', '#4caf6a', '#3b82f6', '#8b5cf6'];
      let s = _pfP(wrap, cols[0]);
      cols.forEach((c, i) => { s += _pfS(`M${_pfN(35.2 - i * 0.2)} ${_pfN(74.8 + i * 1.2)} Q50 ${_pfN(82.6 + i * 1.3)} ${_pfN(64.8 + i * 0.2)} ${_pfN(74.8 + i * 1.2)}`, c, 1.3); });
      s += _pfP(end, cols[4]);
      cols.forEach((c, i) => { s += _pfP(`M${_pfN(55.6 + i * 0.5)} ${_pfN(82.4 + i * 2.7)} L${_pfN(62.6 + i * 0.6)} ${_pfN(81.2 + i * 2.7)} L${_pfN(63.1 + i * 0.6)} ${_pfN(83.9 + i * 2.7)} L${_pfN(56.1 + i * 0.5)} ${_pfN(85.1 + i * 2.7)} Z`, c); });
      return s;
    }
    default: return '';
  }
}
